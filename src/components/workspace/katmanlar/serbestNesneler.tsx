import React from 'react';
import type { FractionObject, ImageObject, MathObject, PenStrokeObject, Point2D, TextObject, ViewportTransform } from '@/types/math';
import { worldToScreen } from '@/math/coordinates';
import { metinDugumleri } from '@/math/matematikYazimi';
import { kutuOlcusu } from '@/math/yazimDuzeni';
import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import type { YaziBoyu } from './izgaraVeEksenler';

/*
 * TUVALİN SERBEST NESNE KATMANLARI: kalem çizgileri, kesir modelleri, notlar ve görseller. Noktalar katmanı gibi bunlar
 * da bileşen değil ÇİZİM İŞLEVLERİDİR; Canvas döndürülen öğeleri kendi ağacına yerleştirir (tuvalCizimKaydi.test.ts).
 */

/** Serbest nesne katmanlarının Canvas'tan aldığı durum ve işlevler */
export interface SerbestKatmanBaglami {
  viewport: ViewportTransform;
  seciliMi: (id: string) => boolean;
  secimRengi: string;
  /** Etkin araca göre nesne imleci (imlecSinifi(arac, 'nesne')) */
  imlec: string;
  olaylar: (nesne: MathObject) => object;
  /** Yakınlığa göre şekil ölçeği (çentik, ok, aralık boyları) ve yazı ölçeği */
  etiketOlcegi: number;
  yaziOlcegi: number;
  yaziBoyu: YaziBoyu;
  /** Ölçü görünümlü yazı rozeti (Canvas.metinOlcuEtiketi) */
  olcuEtiketi: (metin: string, x: number, y: number, cerceve?: string) => React.ReactNode;
  olculerGorunur: boolean;
  /** Yazıyı kendi çapası çevresinde yazı ölçeğine getiren dönüşüm (Canvas.etiketOlcekDonusumu) */
  etiketDonusumu: (x: number, y: number) => string;
  notuDuzenle: (not: TextObject) => void;
}

/** Ekran noktalarından kırık çizgi yolu: "M x y L x y …" */
function kirikYol(noktalar: readonly Point2D[], viewport: ViewportTransform): string {
  return noktalar
    .map((p, i) => {
      const e = worldToScreen(p, viewport);
      return `${i === 0 ? 'M' : 'L'} ${e.x} ${e.y}`;
    })
    .join(' ');
}

/* ------------------------------------------------------------------------------------------- kalem */

/** Kalem çizgileri: tek noktalı çizgi çizilmez; seçili çizgi seçim renginde görünür */
export function kalemKatmani(cizgiler: readonly PenStrokeObject[], b: SerbestKatmanBaglami) {
  return cizgiler.map((cizgi) => {
    if (cizgi.points.length < 2) return null;
    const renk = b.seciliMi(cizgi.id) ? b.secimRengi : cizgi.color || NESNE_RENGI.pembe;
    return (
      <g key={cizgi.id} className={`select-none ${b.imlec}`} {...b.olaylar(cizgi)}>
        <path
          d={kirikYol(cizgi.points, b.viewport)}
          fill="none"
          stroke={renk}
          strokeWidth={cizgi.thickness || 3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`hover:opacity-80 ${b.imlec}`}
        />
      </g>
    );
  });
}

/** Kalem henüz basılıyken çizilen çizginin önizlemesi (en az iki nokta) */
export function kalemOnizlemesi(noktalar: readonly Point2D[], viewport: ViewportTransform) {
  if (noktalar.length < 2) return null;
  return (
    <path
      d={kirikYol(noktalar, viewport)}
      fill="none"
      stroke="#e11d48"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none"
    />
  );
}

/* ------------------------------------------------------------------------------------------- kesir */

/** Kesir modelinin çizdiği parçalar, kapladığı alan ve (sayı doğrusunda) etiketin yeri */
interface KesirCizimi {
  sekiller: React.ReactNode[];
  genislik: number;
  yukseklik: number;
  ustEtiket: Point2D | null;
}

/** Model çiziminin ortak girdileri: merkez ve birim yarıçap ekranda; pay ≥ 0, payda ≥ 1 */
interface KesirGirdisi {
  merkez: Point2D;
  yaricap: number;
  pay: number;
  payda: number;
  butunSayisi: number;
  renk: string;
  cerceveRengi: string;
  cerceveKalinligi: number;
  olcek: number;
  yaziBoyu: YaziBoyu;
}

/** Parçanın dolu/boş görünüşü (çubuk ve pasta aynı) */
const parcaBoyasi = (dolu: boolean, renk: string) => ({ fill: dolu ? renk : '#ffffff', fillOpacity: dolu ? 0.45 : 0.8, stroke: renk, strokeWidth: 1.5 });

/**
 * Sayı doğrusu (alan uzmanı, 21.10.2026): 0'dan başlar, her bütün payda kadar eşit parçaya bölünür; 0 ile kesir arası
 * renkli, kesir noktayla işaretli; tam sayılar çentiğin altında yazılı; sağ uçta ok. Etiket noktanın üstündedir.
 */
function sayiDogrusu(k: KesirGirdisi): KesirCizimi {
  const birim = k.yaricap * 2;
  const genislik = k.butunSayisi * birim + Math.max(14 * k.olcek, birim * 0.18);
  const yukseklik = Math.max(30 * k.olcek, 34);
  const sol = k.merkez.x - genislik / 2;
  const y = k.merkez.y;
  const kisaCentik = 7 * k.olcek;
  const uzunCentik = 12 * k.olcek;
  const uc = sol + genislik;
  const kesirX = sol + (k.pay / k.payda) * birim;
  const sekiller: React.ReactNode[] = [
    // Saydam tutma alanı: ince doğruya dokunmak kolay olsun
    <rect key="tutamak" x={sol - 6} y={y - yukseklik / 2} width={genislik + 12} height={yukseklik} fill="transparent" />,
    <line key="dogru" x1={sol} y1={y} x2={uc} y2={y} stroke={k.cerceveRengi} strokeWidth={k.cerceveKalinligi} />,
    <polyline
      key="ok"
      points={`${uc - 9 * k.olcek},${y - 5 * k.olcek} ${uc},${y} ${uc - 9 * k.olcek},${y + 5 * k.olcek}`}
      fill="none"
      stroke={k.cerceveRengi}
      strokeWidth={2}
    />,
  ];
  if (k.pay > 0) {
    sekiller.push(<line key="kesir-parca" x1={sol} y1={y} x2={kesirX} y2={y} stroke={k.renk} strokeWidth={7 * k.olcek} strokeOpacity={0.45} strokeLinecap="round" />);
  }
  for (let i = 0; i <= k.butunSayisi * k.payda; i++) {
    const x = sol + (i / k.payda) * birim;
    const tamSayi = i % k.payda === 0;
    const boy = tamSayi ? uzunCentik : kisaCentik;
    sekiller.push(<line key={`centik-${i}`} x1={x} y1={y - boy} x2={x} y2={y + boy} stroke={k.renk} strokeWidth={tamSayi ? 2 : 1.4} />);
    if (!tamSayi) continue;
    sekiller.push(
      <text key={`sayi-${i}`} x={x} y={y + uzunCentik + 15 * k.olcek} fontSize={k.yaziBoyu(13, 'measure')} fontWeight={700} textAnchor="middle" fill="hsl(var(--foreground))">
        {i / k.payda}
      </text>,
    );
  }
  sekiller.push(<circle key="kesir-noktasi" cx={kesirX} cy={y} r={5.5 * k.olcek} fill={k.renk} stroke="#ffffff" strokeWidth={1.5} />);
  return { sekiller, genislik, yukseklik, ustEtiket: { x: kesirX, y: y - uzunCentik - 16 * k.olcek } };
}

/** Çubuk modeli: her bütün payda kadar eşit dikdörtgene bölünmüş bir çubuk; çubuklar alt alta */
function cubukModeli(k: KesirGirdisi): KesirCizimi {
  const genislik = k.yaricap * 2;
  const boy = Math.max(18 * k.olcek, k.yaricap * 0.6);
  const aralik = Math.max(6 * k.olcek, k.yaricap * 0.15);
  const yukseklik = k.butunSayisi * boy + (k.butunSayisi - 1) * aralik;
  const sol = k.merkez.x - genislik / 2;
  const ust = k.merkez.y - yukseklik / 2;
  const parcaGenisligi = genislik / k.payda;
  const sekiller: React.ReactNode[] = [];
  for (let b = 0; b < k.butunSayisi; b++) {
    const y = ust + b * (boy + aralik);
    for (let i = 0; i < k.payda; i++) {
      sekiller.push(<rect key={`bar-${b}-${i}`} x={sol + (i * genislik) / k.payda} y={y} width={parcaGenisligi} height={boy} {...parcaBoyasi(b * k.payda + i < k.pay, k.renk)} />);
    }
    sekiller.push(<rect key={`bar-outline-${b}`} x={sol} y={y} width={genislik} height={boy} fill="none" stroke={k.cerceveRengi} strokeWidth={k.cerceveKalinligi} />);
  }
  return { sekiller, genislik, yukseklik, ustEtiket: null };
}

/** Pasta modeli: bütünler yan yana daireler; payda 1 ise her bütün tek parça */
function pastaModeli(k: KesirGirdisi): KesirCizimi {
  const r = k.yaricap;
  const aralik = Math.max(8 * k.olcek, r * 0.2);
  const genislik = k.butunSayisi * r * 2 + (k.butunSayisi - 1) * aralik;
  const ilkMerkezX = k.merkez.x - genislik / 2 + r;
  const cy = k.merkez.y;
  /** i. bölme çizgisinin çemberdeki ucu (en üstten saat yönünde) */
  const uc = (cx: number, i: number) => {
    const a = (i * 2 * Math.PI) / k.payda - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const sekiller: React.ReactNode[] = [];
  for (let b = 0; b < k.butunSayisi; b++) {
    const cx = ilkMerkezX + b * (r * 2 + aralik);
    if (k.payda <= 1) {
      sekiller.push(<circle key={`slice-full-${b}`} cx={cx} cy={cy} r={r} {...parcaBoyasi(b < k.pay, k.renk)} />);
    } else {
      for (let i = 0; i < k.payda; i++) {
        const p1 = uc(cx, i);
        const p2 = uc(cx, i + 1);
        sekiller.push(
          <path key={`slice-${b}-${i}`} d={`M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y} Z`} {...parcaBoyasi(b * k.payda + i < k.pay, k.renk)} />,
        );
      }
    }
    sekiller.push(<circle key={`outline-${b}`} cx={cx} cy={cy} r={r} fill="none" stroke={k.cerceveRengi} strokeWidth={k.cerceveKalinligi} />);
  }
  return { sekiller, genislik, yukseklik: r * 2, ustEtiket: null };
}

/**
 * Gösterilecek pay ve payda: pay tam sayıya yuvarlanır ve eksi olamaz; geçersiz payda (0, eksi ya da sayı değil) kesri
 * 0/1 gösterir.
 */
function kesirDegerleri(kesir: FractionObject): { pay: number; payda: number } {
  const payda = Number.isFinite(kesir.denominator) ? Math.round(kesir.denominator) : 0;
  if (payda <= 0) return { pay: 0, payda: 1 };
  return { pay: Number.isFinite(kesir.numerator) ? Math.max(0, Math.round(kesir.numerator)) : 0, payda };
}

/**
 * Kesir modelleri (pasta, çubuk, sayı doğrusu). Bileşik kesirde payı karşılayacak kadar bütün çizilir. Kesir yazısı
 * sayı doğrusunda hep noktanın üstündedir; diğer modellerde ölçüler görünürken modelin altına yazılır.
 */
export function kesirKatmani(kesirler: readonly FractionObject[], b: SerbestKatmanBaglami) {
  return kesirler.map((kesir) => {
    const merkez = worldToScreen({ x: kesir.x, y: kesir.y }, b.viewport);
    const secili = b.seciliMi(kesir.id);
    const renk = kesir.color || NESNE_RENGI.mor;
    const { pay, payda } = kesirDegerleri(kesir);
    const girdi: KesirGirdisi = {
      merkez,
      yaricap: kesir.radius * b.viewport.zoom,
      pay,
      payda,
      butunSayisi: Math.max(1, Math.ceil(pay / payda)),
      renk,
      cerceveRengi: secili ? b.secimRengi : renk,
      cerceveKalinligi: secili ? 3 : 2,
      olcek: b.etiketOlcegi,
      yaziBoyu: b.yaziBoyu,
    };
    const model = kesir.modelType === 'line' ? sayiDogrusu(girdi) : kesir.modelType === 'bar' ? cubukModeli(girdi) : pastaModeli(girdi);
    const yazi = `${pay}/${payda}`;
    let etiket: React.ReactNode = null;
    if (model.ustEtiket) {
      etiket = b.olcuEtiketi(yazi, model.ustEtiket.x, model.ustEtiket.y, renk);
    } else if (b.olculerGorunur) {
      // Rozetin üst kenarı modelin 8 birim altında
      const yaziYuksekligi = kutuOlcusu([metinDugumleri(yazi)], b.yaziBoyu(11, 'measure')).yukseklik;
      etiket = b.olcuEtiketi(yazi, merkez.x, merkez.y + model.yukseklik / 2 + 8 * b.etiketOlcegi + (yaziYuksekligi * b.yaziOlcegi) / 2, renk);
    }
    return (
      <g key={kesir.id} className={`select-none ${b.imlec}`} {...b.olaylar(kesir)}>
        {model.sekiller}
        {etiket}
      </g>
    );
  });
}

/* --------------------------------------------------------------------------------------------- not */

/** Not kartının iç boşlukları: yazı kartın sol alt köşesinden 10 birim içeride ve 6 birim yukarıda */
const NOT_SOL_BOSLUK = 10;
const NOT_ALT_BOSLUK = 6;

/**
 * Metin notları: kart, yazı ve üzerine gelince görünen kalem düğmesi. Nota çift tıklamak ya da kaleme tıklamak not
 * penceresini düzenleme için açar. Kart, yazı ölçeğiyle birlikte kendi çapası çevresinde küçülür.
 */
export function notKatmani(notlar: readonly TextObject[], b: SerbestKatmanBaglami) {
  return notlar.map((not) => {
    const e = worldToScreen({ x: not.x, y: not.y }, b.viewport);
    const secili = b.seciliMi(not.id);
    const boy = not.fontSize || 14;
    const genislik = Math.max(70, not.text.length * (boy * 0.62) + 28);
    const yukseklik = boy + 16;
    const kartUstu = e.y - yukseklik + NOT_ALT_BOSLUK;
    const duzenle = (olay: React.SyntheticEvent) => {
      olay.stopPropagation();
      b.notuDuzenle(not);
    };
    return (
      <g
        key={not.id}
        data-canvas-label=""
        transform={b.etiketDonusumu(e.x, e.y)}
        className={`select-none group/txt ${b.imlec}`}
        {...b.olaylar(not)}
        onDoubleClick={duzenle}
      >
        <rect
          x={e.x - NOT_SOL_BOSLUK}
          y={kartUstu}
          width={genislik}
          height={yukseklik}
          rx={8}
          fill={secili ? '#e4f3f0' : '#ffffff'}
          stroke={secili ? b.secimRengi : '#cbd5e1'}
          strokeWidth={secili ? 2 : 1.2}
          className="shadow-sm transition-colors group-hover/txt:stroke-primary dark:fill-card dark:stroke-border"
        />
        <text x={e.x} y={e.y} fill={not.color || '#1e293b'} fontSize={boy} className="font-bold font-sans dark:fill-foreground">
          {not.text}
        </text>
        <g
          transform={`translate(${e.x + genislik - 24}, ${e.y - yukseklik + 10})`}
          className="opacity-0 group-hover/txt:opacity-100 transition-opacity"
          onClick={duzenle}
        >
          <circle cx="6" cy="6" r="8" fill="#fbf7ee" stroke="#216a78" strokeWidth="1" />
          <path d="M2.6 9.4 3 7.2 7.6 2.6 9.4 4.4 4.8 9 2.6 9.4ZM6.8 3.4 8.6 5.2" fill="none" stroke="#216a78" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      </g>
    );
  });
}

/* ------------------------------------------------------------------------------------------ görsel */

/** Görseller: dünya boyutunda, oranı korunarak ortalanır; seçili görselin çevresinde kesikli çerçeve */
export function gorselKatmani(gorseller: readonly ImageObject[], b: SerbestKatmanBaglami) {
  return gorseller.map((gorsel) => {
    const e = worldToScreen({ x: gorsel.x, y: gorsel.y }, b.viewport);
    const g = gorsel.width * b.viewport.zoom;
    const y = gorsel.height * b.viewport.zoom;
    const sol = e.x - g / 2;
    const ust = e.y - y / 2;
    return (
      <g key={gorsel.id} className={`select-none ${b.imlec}`} {...b.olaylar(gorsel)}>
        <image href={gorsel.src} x={sol} y={ust} width={g} height={y} preserveAspectRatio="xMidYMid meet" />
        {b.seciliMi(gorsel.id) && (
          <rect
            x={sol - 3}
            y={ust - 3}
            width={g + 6}
            height={y + 6}
            rx={4}
            fill="none"
            stroke={b.secimRengi}
            strokeWidth={2.5}
            strokeDasharray="6,3"
            className="pointer-events-none"
          />
        )}
      </g>
    );
  });
}
