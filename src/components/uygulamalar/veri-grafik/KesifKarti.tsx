'use client';

/**
 * Veri ve Grafik — örnek verinin Keşif şeridi ve Keşif kartı. Grafik sütununun ipucu yuvasında durur; ikinci tam
 * genişlik çubuk değildir.
 *
 * - `serit`: tek satır (en çok iki): araştırma sorusu + sekmeye duyarlı ipucu (`seritMetni`), [Keşfet ›] ve [×].
 *   İpucu boşsa (ör. Çizgi'de sıra notu görünürken) yalnız soru yazılır.
 * - `kart`: iki sıra, sade. Başlık: sınıf rozeti ve araştırma sorusu; sağda [i] (öğretmen kartı), [küçült], [×].
 *   Adım: ilerleme çizgisi; "1/4 Tahmin et" çipi ve adımın sorusu; aynı sırada [Cevabı göster], adımın eylem
 *   düğmesi, [‹] [Sonraki ›]. Cevap açılınca adımın altında altın kenarlı kutuda.
 * - Öğretmene dönük her şey tek [i] düğmesinin arkasında: kazanım kodları, verinin künyesi (kim, ne zaman, nasıl),
 *   öğretmen notu ve kaynak (bütün bağlantılarıyla, erişim tarihi). Bölüm kendi içinde kayar; devamı varsa kenar
 *   solar ve [Devamı] düğmesi çıkar (satır yarıdan kesik görünmez).
 *
 * Adım, cevap ve öğretmen bölümünün açıklığı bileşenin içindedir; görünüm (şerit / kart) değişince korunur. Örnek
 * değişince sıfırlanır (C ayrıca `key` verir). Başlık ve adım hiç kesilmez ve kaymaz; `yukseklikSiniri` yalnız
 * öğretmen bölümü açıkken kartın ne kadar büyüyebileceğini belirler. Ölçüler offsetHeight / scrollTop ile okunur
 * (getBoundingClientRect kullanılmaz).
 */
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DUGME, DUGME_BIRINCIL, useBoyut } from './ortak';
import { kaynakBaglantilari, kazanimMetni, kunyeMetni, onerilenSekme, rehberAdimlari, rozetMetni, seritMetni } from './rehber';
import type { GrafikTuru, OrnekVeri, Ozellik, RehberAdimi, RehberEylemi } from './veri';

export interface KesifKartiProps {
  ornek: OrnekVeri;
  /** Etkin grafik sekmesi: şeridin ipucu metni buna göre değişir */
  sekme: GrafikTuru;
  /** Uygulamadaki özellikler: özelliğe bağlı eylem ve metinler yalnız özellik varken kullanılır */
  ozellikler: ReadonlySet<Ozellik>;
  gorunum: 'serit' | 'kart';
  onGorunum: (g: 'serit' | 'kart') => void;
  onKapat: () => void;
  /** Adımın eylem düğmesine basıldı (özellik kümesine göre çözülmüş eylem) */
  onEylem: (eylem: RehberEylemi) => void;
  /**
   * Kartın olağan en büyük yüksekliği (px; grafik sütununun bir payı). Başlık ve adım bunu aşsa da kesilmez; öğretmen
   * bölümü açıkken kart en çok bunun OGRETMEN_CARPANI katına büyür, bölüm kalan yerde kayar.
   */
  yukseklikSiniri?: number;
  /** Başlangıç adımı (0 tabanlı); önizleme ve testler için */
  ilkAdim?: number;
  /** Öğretmen bölümü açık başlasın; önizleme ve testler için */
  ilkOgretmen?: boolean;
}

/** Bu genişliğin altında düğmeler yalnız simgeyle çizilir, öğretmen bölümünde başlıklar üstte durur */
const DAR_ESIK = 560;
/** Öğretmen bölümü açıkken kartın büyüyebileceği en çok yükseklik: sınırın bu katı */
const OGRETMEN_CARPANI = 1.6;
/** Öğretmen bölümünün en az yüksekliği (px): dar ve alçak pencerede de birkaç satır okunur */
const OGRETMEN_EN_AZ = 96;
/** Bölümün kaydırılabilir kenarında solma payı (px) */
const SOLMA = 28;

interface IcDurum {
  ornekId: string;
  adim: number;
  cevap: boolean;
  ogretmen: boolean;
  /** Eylem düğmesine basılmış adımlar */
  yapilan: number[];
}

function baslangic(ornek: OrnekVeri, ilkAdim: number | undefined, adimSayisi: number, ilkOgretmen = false): IcDurum {
  const adim = Math.max(0, Math.min(adimSayisi - 1, Math.round(ilkAdim ?? 0)));
  return { ornekId: ornek.id, adim, cevap: false, ogretmen: ilkOgretmen, yapilan: [] };
}

/** Sunucuda useEffect (uyarısız), tarayıcıda boyamadan önce çalışan useLayoutEffect */
const useIzomorfikYerlesimEtkisi = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Düğme olan eylem mi? `surukle` ve `yok` öğrencinin kendisinin yapacağını söyler (düğme değil) */
function dugmeMi(e: RehberEylemi): boolean {
  return e.tur !== 'surukle' && e.tur !== 'yok';
}

/** Kaydırılabilir öğretmen bölümünün solma maskesi: üstte (kaydırıldıysa) ve altta (devamı varsa) */
function solmaMaskesi(ust: boolean, alt: boolean): string | undefined {
  if (!ust && !alt) return undefined;
  const bas = ust ? `transparent 0, #000 ${SOLMA - 10}px` : '#000 0';
  const son = alt ? `#000 calc(100% - ${SOLMA}px), transparent 100%` : '#000 100%';
  return `linear-gradient(to bottom, ${bas}, ${son})`;
}

// ── Elle çizilmiş simgeler ───────────────────────────────────────────────────────────────────────────────────

const CIZGI = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Simge({ children, className = 'h-4 w-4' }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** "i" simgesi (Veri topla panelindeki öğretmen kartı düğmesiyle aynı çizim) */
function BilgiSimgesi({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={`shrink-0 ${className ?? 'h-4 w-4'}`} aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="7.6" {...CIZGI} />
      <path d="M10 9.1v4.8" {...CIZGI} strokeWidth={2} />
      <circle cx="10" cy="6.4" r="1.1" fill="currentColor" />
    </svg>
  );
}

function KapatSimgesi() {
  return (
    <Simge className="h-3.5 w-3.5">
      <path d="M4 4l8 8M12 4l-8 8" {...CIZGI} strokeWidth={1.8} />
    </Simge>
  );
}

function OkSimgesi({ yon, className = 'h-4 w-4' }: { yon: 'sag' | 'sol' | 'yukari' | 'asagi'; className?: string }) {
  const d =
    yon === 'sag' ? 'M6 3.5 10.5 8 6 12.5' : yon === 'sol' ? 'M10 3.5 5.5 8l4.5 4.5' : yon === 'yukari' ? 'M3.5 10 8 5.5l4.5 4.5' : 'M3.5 6 8 10.5 12.5 6';
  return (
    <Simge className={className}>
      <path d={d} {...CIZGI} strokeWidth={1.9} />
    </Simge>
  );
}

function DisBaglantiSimgesi() {
  return (
    <Simge className="ml-0.5 inline h-3 w-3 -translate-y-px">
      <path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5M11.5 9.5v4h-9v-9h4" {...CIZGI} strokeWidth={1.6} />
    </Simge>
  );
}

function OnaySimgesi({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <Simge className={className}>
      <path d="M3.2 8.6 6.4 11.6 12.8 4.6" {...CIZGI} strokeWidth={2} />
    </Simge>
  );
}

function ElSimgesi() {
  return (
    <Simge>
      <path
        d="M6.2 8.4V3.3a1.1 1.1 0 0 1 2.2 0v4.3M8.4 7.2V6.1a1.1 1.1 0 0 1 2.2 0v1.5M10.6 7.4a1.1 1.1 0 0 1 2.2 0v2.4c0 2.5-1.6 4.2-4 4.2h-.6c-1.4 0-2.4-.6-3.2-1.7L3.2 9.6a1.1 1.1 0 0 1 1.8-1.3l1.2 1.5"
        {...CIZGI}
        strokeWidth={1.4}
      />
    </Simge>
  );
}

/** Adım türünün simgesi: ampul (tahmin), büyüteç (bak), cetvel (ölç), konuşma balonu (yorumla) */
function AdimSimgesi({ tur }: { tur: RehberAdimi['tur'] }) {
  switch (tur) {
    case 'tahmin':
      return (
        <Simge>
          <path d="M8 1.9a4.3 4.3 0 0 0-2.6 7.7c.5.4.8 1 .8 1.6v.3h3.6v-.3c0-.6.3-1.2.8-1.6A4.3 4.3 0 0 0 8 1.9zM6.4 14h3.2" {...CIZGI} strokeWidth={1.5} />
        </Simge>
      );
    case 'bak':
      return (
        <Simge>
          <circle cx="7" cy="7" r="4.3" {...CIZGI} strokeWidth={1.5} />
          <path d="M10.3 10.3 14 14" {...CIZGI} strokeWidth={1.8} />
        </Simge>
      );
    case 'olc':
      return (
        <Simge>
          <path d="M1.8 10.6 10.6 1.8l3.6 3.6-8.8 8.8z" {...CIZGI} strokeWidth={1.4} />
          <path d="M5 7.4 6.3 8.7M7 5.4l1.3 1.3M9 3.4l1.3 1.3" {...CIZGI} strokeWidth={1.3} />
        </Simge>
      );
    default:
      return (
        <Simge>
          <path d="M2.4 3.2h11.2v7.3H8.2l-3.3 2.6v-2.6H2.4z" {...CIZGI} strokeWidth={1.5} />
        </Simge>
      );
  }
}

/** Eylem düğmesinin simgesi: sekme (ok), satır (hedef), hücre (kalem), satır ekle (artı), seçenek ve aralık (sürgü) */
function EylemSimgesi({ eylem }: { eylem: RehberEylemi }) {
  switch (eylem.tur) {
    case 'sekme':
      return (
        <Simge>
          <path d="M2.5 8h10M9 4.5 12.5 8 9 11.5" {...CIZGI} strokeWidth={1.8} />
        </Simge>
      );
    case 'satirVurgula':
      return (
        <Simge>
          <circle cx="8" cy="8" r="5.2" {...CIZGI} strokeWidth={1.5} />
          <circle cx="8" cy="8" r="1.7" fill="currentColor" />
        </Simge>
      );
    case 'hucre':
      return (
        <Simge>
          <path d="M2.8 13.2l.6-2.8 7.4-7.4 2.2 2.2-7.4 7.4zM9.6 4.2l2.2 2.2" {...CIZGI} strokeWidth={1.5} />
        </Simge>
      );
    case 'satirEkle':
      return (
        <Simge>
          <path d="M8 3v10M3 8h10" {...CIZGI} strokeWidth={1.9} />
        </Simge>
      );
    default:
      return (
        <Simge>
          <path d="M2.5 5h11M2.5 11h11" {...CIZGI} strokeWidth={1.5} />
          <circle cx="6" cy="5" r="1.8" fill="currentColor" />
          <circle cx="10.5" cy="11" r="1.8" fill="currentColor" />
        </Simge>
      );
  }
}

// ── Parçalar ─────────────────────────────────────────────────────────────────────────────────────────────────

const HAYALET_DUGME =
  'grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Yalnız simgeli adım düğmesi (44 × 44; DUGME ile aynı çerçeve) */
const SIMGE_ADIM_DUGMESI =
  'grid h-11 w-11 shrink-0 place-items-center rounded-[calc(var(--radius)-6px)] border border-border bg-card text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors disabled:pointer-events-none disabled:opacity-50';

const BAGLANTI =
  'font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-[#9fe0d9]';

/** Öğretmen bölümündeki satır başlığı (Veri topla öğretmen kartıyla aynı yazı biçimi) */
const BOLUM_BASLIGI = 'text-[12px] font-extrabold leading-[18px] tracking-[0.05em] text-muted-foreground';

function KapatDugmesi({ onKapat }: { onKapat: () => void }) {
  return (
    <button type="button" aria-label="İpucunu kapat" title="İpucunu kapat (tablonun üstündeki bilgi düğmesiyle yeniden açılır)" className={HAYALET_DUGME} onClick={onKapat}>
      <KapatSimgesi />
    </button>
  );
}

/** Öğretmen bölümünün içeriği: kazanım, verinin künyesi, not, kaynak (bağlantılar ve erişim tarihi) */
function OgretmenIcerigi({ ornek, dar, devamiYeri }: { ornek: OrnekVeri; dar: boolean; devamiYeri: boolean }) {
  const k = ornek.kaynak;
  const baglantilar = kaynakBaglantilari(ornek);
  const satirlar: { baslik: string; icerik: React.ReactNode; veri: string }[] = [
    { baslik: 'KAZANIM', icerik: kazanimMetni(ornek), veri: 'kazanim' },
    { baslik: 'VERİ', icerik: <span data-kunye>{kunyeMetni(ornek)}</span>, veri: 'kunye' },
  ];
  if (ornek.ogretmenNotu) satirlar.push({ baslik: 'NOT', icerik: ornek.ogretmenNotu, veri: 'not' });
  satirlar.push({
    baslik: 'KAYNAK',
    veri: 'kaynak',
    icerik: (
      <span data-kaynak={k.tur}>
        {k.tur === 'gercek' && <span className="font-semibold">Gerçek veri: </span>}
        {k.ad}.{k.not ? ` ${k.not}` : ''}
        {baglantilar.map((b, i) => (
          <React.Fragment key={b.url}>
            {i === 0 ? ' ' : ' · '}
            <a href={b.url} target="_blank" rel="noreferrer" className={BAGLANTI} title={b.url} data-kaynak-baglantisi>
              {b.ad}
              <DisBaglantiSimgesi />
            </a>
          </React.Fragment>
        ))}
        {baglantilar.length > 0 ? '.' : ''}
        {k.erisim ? ` Erişim: ${k.erisim}.` : ''}
      </span>
    ),
  });
  return (
    <dl
      className={`grid gap-y-1.5 py-2 pl-2.5 text-[12.5px] leading-[18px] text-foreground ${devamiYeri ? 'pr-14' : 'pr-2.5'} ${
        dar ? 'grid-cols-1' : 'grid-cols-[auto_minmax(0,1fr)] gap-x-3'
      }`}
    >
      {satirlar.map((s) => (
        <React.Fragment key={s.veri}>
          <dt className={`${BOLUM_BASLIGI} ${dar ? '' : 'pt-px'}`}>{s.baslik}</dt>
          <dd className={dar ? 'mb-1' : ''} data-ogretmen-satiri={s.veri}>
            {s.icerik}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

// ── Bileşen ──────────────────────────────────────────────────────────────────────────────────────────────────

export function KesifKarti({ ornek, sekme, ozellikler, gorunum, onGorunum, onKapat, onEylem, yukseklikSiniri, ilkAdim, ilkOgretmen }: KesifKartiProps) {
  const adimlar = useMemo(() => rehberAdimlari(ornek, ozellikler), [ornek, ozellikler]);
  const [ic, setIc] = useState<IcDurum>(() => baslangic(ornek, ilkAdim, adimlar.length, ilkOgretmen));
  // Örnek değişince baştan (C key ile de sıfırlar; bu, key verilmese de yanlış örneğin adımında kalmayı önler)
  let d = ic;
  if (ic.ornekId !== ornek.id) {
    d = baslangic(ornek, undefined, adimlar.length);
    setIc(d);
  }
  const adimNo = Math.max(0, Math.min(adimlar.length - 1, d.adim));
  const adim = adimlar[adimNo];

  const kokRef = useRef<HTMLDivElement>(null);
  const baslikRef = useRef<HTMLDivElement>(null);
  const adimRef = useRef<HTMLDivElement>(null);
  const ogretmenRef = useRef<HTMLDivElement>(null);
  const { genislik } = useBoyut(kokRef);
  const dar = genislik > 0 && genislik < DAR_ESIK;
  const kimlik = useId();
  const cevapId = `${kimlik}-cevap`;
  const ogretmenId = `${kimlik}-ogretmen`;

  /** Öğretmen bölümünün en büyük yüksekliği (ölçülür): sınırın katından başlık ve adım çıkınca kalan */
  const [ogretmenEnBuyuk, setOgretmenEnBuyuk] = useState<number | null>(null);
  /**
   * Öğretmen bölümünün kaydırma durumu: üstte kaydırılmış, altta devamı var, içerik hiç sığmıyor (sığmıyorsa sağda
   * Devamı düğmesinin yeri boş bırakılır; yazı düğmenin altında kalmaz)
   */
  const [solma, setSolma] = useState({ ust: false, alt: false, tasma: false });

  const ogretmenAcik = gorunum === 'kart' && d.ogretmen;

  // Başlık ve adım her çizimde ölçülür (iki offsetHeight okuması; değer aynıysa yeniden çizim olmaz)
  useIzomorfikYerlesimEtkisi(() => {
    const b = baslikRef.current;
    const a = adimRef.current;
    if (!ogretmenAcik || !yukseklikSiniri || !b || !a) {
      setOgretmenEnBuyuk(null);
      return;
    }
    // 8: bölümün alt boşluğu (pb-2)
    const kalan = Math.round(yukseklikSiniri * OGRETMEN_CARPANI) - b.offsetHeight - a.offsetHeight - 8;
    setOgretmenEnBuyuk(Math.max(OGRETMEN_EN_AZ, kalan));
  });

  const solmaOlc = () => {
    const r = ogretmenRef.current;
    if (!r) return;
    const ust = r.scrollTop > 2;
    const alt = r.scrollTop + r.clientHeight < r.scrollHeight - 2;
    const tasma = r.scrollHeight > r.clientHeight + 2;
    setSolma((o) => (o.ust === ust && o.alt === alt && o.tasma === tasma ? o : { ust, alt, tasma }));
  };
  useEffect(() => {
    if (ogretmenAcik) solmaOlc();
    else setSolma((o) => (o.ust || o.alt || o.tasma ? { ust: false, alt: false, tasma: false } : o));
  }, [ogretmenAcik, ogretmenEnBuyuk, genislik]);

  const guncelle = (y: Partial<IcDurum>) => setIc((o) => ({ ...(o.ornekId === ornek.id ? o : d), ...y }));
  const adimaGit = (i: number) => guncelle({ adim: Math.max(0, Math.min(adimlar.length - 1, i)), cevap: false });

  const soru = ornek.hikaye.arastirmaSorusu;

  if (gorunum === 'serit') {
    const metin = seritMetni(ornek, sekme, ozellikler);
    // Darda iki satıra ikisi sığmaz: önerilen sekme dışında yalnız o sekmenin ipucu (ipucu boşsa soru)
    const soruyuGoster = !dar || sekme === onerilenSekme(ornek) || metin === '';
    return (
      <div
        ref={kokRef}
        role="note"
        aria-label="Keşif"
        className="flex shrink-0 items-center gap-2 border-b border-border bg-accent/60 py-0.5 pl-3 pr-1 text-[13px] leading-5 text-foreground"
        data-ornek-ipucu="serit"
      >
        <BilgiSimgesi className="h-4 w-4 text-primary dark:text-[#9fe0d9]" />
        <p className="line-clamp-2 min-w-0 flex-1 py-1" data-serit-metni>
          {soruyuGoster && <strong className="font-bold">{metin ? `${soru} ` : soru}</strong>}
          {metin}
        </p>
        <button
          type="button"
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-full border border-border bg-card pl-3.5 pr-2.5 text-[13px] font-bold text-primary shadow-[0_1px_2px_rgba(6,40,45,.08)] hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-[#9fe0d9]"
          aria-expanded={false}
          title={`Rehberli keşfi aç: ${adimlar.length} adım`}
          onClick={() => onGorunum('kart')}
          data-kesfet
        >
          Keşfet
          {adimNo > 0 && <span className="text-[12px] font-semibold tabular-nums opacity-80">{`${adimNo + 1}/${adimlar.length}`}</span>}
          <OkSimgesi yon="sag" className="h-3.5 w-3.5" />
        </button>
        <KapatDugmesi onKapat={onKapat} />
      </div>
    );
  }

  const programda = ornek.kazanim.length > 0;
  const eylem = adim?.eylem ?? null;
  const eylemYapildi = !!eylem && (d.yapilan.includes(adimNo) || (eylem.tur === 'sekme' && eylem.sekme === sekme));
  const son = adimNo >= adimlar.length - 1;
  const maske = solmaMaskesi(solma.ust, solma.alt);

  return (
    <div
      ref={kokRef}
      role="region"
      aria-label={`Keşif: ${ornek.ad}`}
      className="flex shrink-0 flex-col border-b border-border bg-accent/60 text-foreground"
      data-ornek-ipucu="kart"
      data-kesif-karti={ornek.id}
    >
      {/* Başlık: sınıf rozeti + araştırma sorusu; sağda öğretmen kartı [i], küçült, kapat */}
      <div ref={baslikRef} className="flex shrink-0 items-start gap-0.5 pl-3 pr-1">
        {/* Tek satırda düğmelerle aynı hizada (44 px); iki satıra inince yalnız 4 px boşlukla (kart alçak kalsın) */}
        <div className="flex min-h-11 min-w-0 flex-1 items-center py-1">
          <div className="min-w-0 leading-5">
            <span
              className={`mr-2 inline-flex h-6 items-center whitespace-nowrap rounded-full px-2 align-[2px] text-[12px] font-bold leading-none ${
                programda
                  ? 'bg-ada-deniz/[0.12] text-ada-deniz-koyu dark:bg-ada-vurgu/[0.22] dark:text-[#9fe0d9]'
                  : 'bg-ada-lavanta/[0.2] text-[#454d8c] dark:bg-ada-lavanta/[0.3] dark:text-[#d3d7f5]'
              }`}
              title={programda ? undefined : 'Programda yok: zenginleştirme'}
              data-rozet
            >
              {rozetMetni(ornek)}
            </span>
            {ornek.kaynak.tur === 'gercek' && (
              <span
                className="mr-2 inline-flex h-6 items-center whitespace-nowrap rounded-full border border-ada-altin/60 px-2 align-[2px] text-[12px] font-bold leading-none text-[#7a5418] dark:text-[#f0cf8f]"
                data-gercek-veri
              >
                Gerçek veri
              </span>
            )}
            <h3 className="inline text-[14px] font-bold">{soru}</h3>
          </div>
        </div>
        <button
          type="button"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            d.ogretmen ? 'bg-primary text-primary-foreground dark:bg-[hsl(175_58%_30%)] dark:text-white' : 'text-primary hover:bg-background dark:text-[#9fe0d9]'
          }`}
          aria-label="Öğretmen kartı"
          aria-expanded={d.ogretmen}
          aria-controls={d.ogretmen ? ogretmenId : undefined}
          title="Öğretmen kartı: kazanım, verinin künyesi, not ve kaynak"
          onClick={() => guncelle({ ogretmen: !d.ogretmen })}
          data-ogretmen-dugmesi
        >
          <BilgiSimgesi className="h-[22px] w-[22px]" />
        </button>
        <button
          type="button"
          aria-label="Keşif kartını küçült"
          title="Keşif kartını küçült"
          aria-expanded
          className={HAYALET_DUGME}
          onClick={() => onGorunum('serit')}
          data-kucult
        >
          <OkSimgesi yon="yukari" />
        </button>
        <KapatDugmesi onKapat={onKapat} />
      </div>

      {/* Adım: ilerleme çizgisi; çip + soru ve aynı sırada düğmeler; açıksa cevap */}
      {adim && (
        <div ref={adimRef} className="shrink-0 px-3 pb-1.5" data-rehber-adimi={adimNo + 1} data-adim-turu={adim.tur}>
          {/* Ayraç aynı zamanda ilerleme çubuğu: dolu kısım geçilen adımlar */}
          <div className="h-[3px] overflow-hidden rounded-full bg-border" aria-hidden="true" data-ilerleme>
            <div className="h-full rounded-full bg-primary dark:bg-[#9fe0d9]" style={{ width: `${((adimNo + 1) / adimlar.length) * 100}%` }} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="min-w-[min(100%,16rem)] flex-1 py-1 text-[13.5px] font-medium leading-5" data-adim-sorusu>
              <span
                className="mr-1.5 inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 pl-1.5 pr-2 align-[1px] text-[12px] font-bold leading-none text-primary dark:bg-[#9fe0d9]/[0.14] dark:text-[#9fe0d9]"
                data-adim-basligi
              >
                <AdimSimgesi tur={adim.tur} />
                {`${adimNo + 1}/${adimlar.length} ${adim.baslik}`}
              </span>
              {adim.soru}
            </p>
            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5" data-adim-dugmeleri>
              <button
                type="button"
                className={DUGME}
                aria-expanded={d.cevap}
                aria-controls={d.cevap ? cevapId : undefined}
                onClick={() => guncelle({ cevap: !d.cevap })}
                data-cevap-dugmesi
              >
                {d.cevap ? 'Cevabı gizle' : 'Cevabı göster'}
              </button>
              {eylem && dugmeMi(eylem) && (
                <button
                  type="button"
                  className={DUGME_BIRINCIL}
                  onClick={() => {
                    onEylem(eylem);
                    if (!d.yapilan.includes(adimNo)) guncelle({ yapilan: [...d.yapilan, adimNo] });
                  }}
                  data-rehber-eylemi={eylem.tur}
                >
                  <EylemSimgesi eylem={eylem} />
                  {eylem.etiket}
                  {eylemYapildi && (
                    <>
                      <OnaySimgesi className="h-3.5 w-3.5" />
                      <span className="sr-only"> (yapıldı)</span>
                    </>
                  )}
                </button>
              )}
              {eylem && !dugmeMi(eylem) && (
                <span className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[13px] font-semibold text-muted-foreground" data-rehber-eylemi={eylem.tur}>
                  <ElSimgesi />
                  {eylem.etiket}
                </span>
              )}
              <button
                type="button"
                className={SIMGE_ADIM_DUGMESI}
                disabled={adimNo === 0}
                aria-label="Önceki adım"
                title="Önceki adım"
                onClick={() => adimaGit(adimNo - 1)}
                data-onceki-adim
              >
                <OkSimgesi yon="sol" />
              </button>
              <button
                type="button"
                className={dar ? SIMGE_ADIM_DUGMESI : DUGME}
                disabled={son}
                aria-label={dar ? 'Sonraki adım' : undefined}
                title="Sonraki adım"
                onClick={() => adimaGit(adimNo + 1)}
                data-sonraki-adim
              >
                {!dar && 'Sonraki'}
                <OkSimgesi yon="sag" className={dar ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
              </button>
            </div>
          </div>
          {d.cevap && (
            <div
              id={cevapId}
              className="mt-1 rounded-[calc(var(--radius)-6px)] border border-l-[3px] border-border border-l-ada-altin bg-card px-2.5 py-1.5 text-[13px] leading-5"
              data-cevap
            >
              {adim.cevap}
            </div>
          )}
        </div>
      )}

      {/* Öğretmen kartı: kendi içinde kayar; devamı varsa alt kenar solar ve Devamı düğmesi çıkar */}
      {d.ogretmen && (
        <div className="relative shrink-0 px-3 pb-2">
          <div className="overflow-hidden rounded-[calc(var(--radius)-6px)] border border-border bg-card">
            <div
              ref={ogretmenRef}
              id={ogretmenId}
              role="region"
              aria-label="Öğretmen kartı"
              tabIndex={0}
              className="overflow-y-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              style={{ maxHeight: ogretmenEnBuyuk ?? undefined, maskImage: maske, WebkitMaskImage: maske }}
              onScroll={solmaOlc}
              data-ogretmen-notu
            >
              <OgretmenIcerigi ornek={ornek} dar={dar} devamiYeri={solma.tasma} />
            </div>
          </div>
          {solma.alt && (
            <button
              type="button"
              className="absolute bottom-3 right-4 grid h-11 w-11 place-items-center rounded-full border border-border bg-popover text-foreground shadow-[0_2px_6px_rgba(6,40,45,.16)] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Öğretmen kartının devamı"
              title="Devamı"
              onClick={() => {
                const r = ogretmenRef.current;
                if (!r) return;
                const azalt = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
                r.scrollBy({ top: Math.max(40, r.clientHeight - SOLMA - 18), behavior: azalt ? 'auto' : 'smooth' });
              }}
              data-ogretmen-devami
            >
              <OkSimgesi yon="asagi" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
