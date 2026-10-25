import React from 'react';
import type { Point2D, PointObject, ViewportTransform } from '@/types/math';
import type { ToolMode } from '@/types/workspace';
import { formatTurkishNumber, worldToScreen } from '@/math/coordinates';
import { calculateCircumcircle, calculateDistance, getArcGeometry } from '@/math/geometry';
import { birOndalik, elipsMerkezi, ikiNoktaliTemelAracMi, onizlemeUzunlugu, surukleCemberYaricapi, surukleParcaUzunlugu } from '../cizimNesneleri';
import { ilkokulUzunlukMetni } from '../ilkokulKipi';
import type { PergelDurumu } from '../pergel';

/*
 * TUVALİN CANLI ÖNİZLEMELERİ: araç kullanılırken imleci izleyen geçici çizimler (pergel, sürükleyerek oluşturma,
 * tıkla-tıkla araçları, ölçme, kutuyla seçim). Hepsi tıklamayı geçirir (pointer-events-none) ve ölçü yazılarını
 * kalıcı ölçülerle aynı rozetle yazar. Katmanlar gibi bunlar da ÇİZİM İŞLEVLERİDİR (tuvalCizimKaydi.test.ts).
 */

/** Ölçü görünümlü yazı rozeti (Canvas.metinOlcuEtiketi); `cerceve` verilirse kutu o renkte çizilir */
export type OlcuEtiketi = (metin: string, x: number, y: number, cerceve?: string) => React.ReactNode;

const PERGEL_RENGI = '#8b5cf6';

/** Pergel önizlemesi: açıklık çubuğu, kalemin ineceği başlangıç ya da taranan yay */
export function pergelOnizlemesi(pergel: PergelDurumu, viewport: ViewportTransform, etiket: OlcuEtiketi) {
  const m = worldToScreen(pergel.merkez, viewport);
  const r = (pergel.yaricap ?? pergel.tarama) * viewport.zoom;
  if (!(r > 0)) return null;
  /** Dünya açısının çemberdeki EKRAN noktası (ekranda y ters olduğu için −sin) */
  const cemberde = (aci: number) => ({ x: m.x + r * Math.cos(aci), y: m.y - r * Math.sin(aci) });

  if (pergel.yaricap === null) {
    // Açıklık YATAY bir çubukla gösterilir; ölçü imlecin iğneye gerçek uzaklığıdır, imleç nerede olursa olsun
    const uc = { x: m.x + r, y: m.y };
    return (
      <g className="pointer-events-none">
        <circle cx={m.x} cy={m.y} r={r} fill="none" stroke={PERGEL_RENGI} strokeWidth={1.2} strokeDasharray="3,4" opacity={0.5} />
        <line x1={m.x} y1={m.y} x2={uc.x} y2={uc.y} stroke={PERGEL_RENGI} strokeWidth={2.5} />
        <circle cx={m.x} cy={m.y} r={4} fill={PERGEL_RENGI} />
        <circle cx={uc.x} cy={uc.y} r={4} fill="#ffffff" stroke={PERGEL_RENGI} strokeWidth={2} />
        {etiket(`r = ${formatTurkishNumber(Number((r / viewport.zoom).toFixed(2)))} br`, (m.x + uc.x) / 2, m.y - 16)}
      </g>
    );
  }

  if (pergel.baslangic === null) {
    // İmleç çemberin üstünde olmak zorunda değil: hangi yöndeyse kalem çemberde oraya iner
    const kalem = cemberde(pergel.tarama);
    const derece = Math.round(((pergel.tarama * 180) / Math.PI) % 360);
    return (
      <g className="pointer-events-none">
        <circle cx={m.x} cy={m.y} r={r} fill="none" stroke={PERGEL_RENGI} strokeWidth={1.5} strokeDasharray="4,4" opacity={0.6} />
        <line x1={m.x} y1={m.y} x2={kalem.x} y2={kalem.y} stroke={PERGEL_RENGI} strokeWidth={2} />
        <circle cx={m.x} cy={m.y} r={4} fill={PERGEL_RENGI} />
        <circle cx={kalem.x} cy={kalem.y} r={7} fill={PERGEL_RENGI} fillOpacity={0.25} />
        <circle cx={kalem.x} cy={kalem.y} r={5} fill="#ffffff" stroke={PERGEL_RENGI} strokeWidth={2.5} />
        {etiket(`başlangıç ${derece}°`, kalem.x, kalem.y - 20)}
      </g>
    );
  }

  // Yay seçilen başlangıçtan iki yöne de taranabilir. Dünyada CCW = ekranda saat yönü (sweep 0), CW ise 1
  const bas = cemberde(pergel.baslangic);
  const bitis = cemberde(pergel.baslangic + pergel.tarama);
  const mutlak = Math.abs(pergel.tarama);
  const yay = `M ${bas.x} ${bas.y} A ${r} ${r} 0 ${mutlak > Math.PI ? 1 : 0} ${pergel.tarama >= 0 ? 0 : 1} ${bitis.x} ${bitis.y}`;
  const derece = Math.round((mutlak * 180) / Math.PI);
  return (
    <g className="pointer-events-none">
      <circle cx={m.x} cy={m.y} r={r} fill="none" stroke={PERGEL_RENGI} strokeWidth={1} strokeDasharray="3,5" opacity={0.3} />
      <path d={yay} fill="none" stroke={PERGEL_RENGI} strokeWidth={3} strokeLinecap="round" />
      <line x1={m.x} y1={m.y} x2={bas.x} y2={bas.y} stroke={PERGEL_RENGI} strokeWidth={1.2} strokeDasharray="2,3" opacity={0.6} />
      <line x1={m.x} y1={m.y} x2={bitis.x} y2={bitis.y} stroke={PERGEL_RENGI} strokeWidth={1.5} strokeDasharray="3,3" opacity={0.7} />
      <circle cx={m.x} cy={m.y} r={4} fill={PERGEL_RENGI} />
      <circle cx={bas.x} cy={bas.y} r={4} fill={PERGEL_RENGI} stroke="#ffffff" strokeWidth={1.5} />
      {etiket(`${derece}° ${pergel.tarama < 0 ? '↻' : '↺'} ${derece >= 353 ? '(tam tur)' : ''}`, m.x, m.y - 20)}
    </g>
  );
}

/** Sürükleyerek oluşturmada kesikli çizginin ortak görünüşü */
const kesikli = (renk: string, dolguSaydamligi: number) => ({
  fill: renk,
  fillOpacity: dolguSaydamligi,
  stroke: renk,
  strokeWidth: 2,
  strokeDasharray: '4,4',
});

/**
 * Sürükleyerek şekil oluşturma önizlemesi. Önizleme, oluşturma koduyla AYNI dünya matematiğinden türetilir: aynı
 * yuvarlama (0,1) ve aynı çapa (dünyada sol alt köşe). Aksi hâlde ekranda y ekseni ters olduğundan kare/dikdörtgen
 * önizlemesi imlecin altında görünür ama şekil yukarıda oluşurdu.
 */
export function surukleOnizlemesi(
  arac: ToolMode,
  bas: Point2D,
  simdi: Point2D,
  viewport: ViewportTransform,
  etiket: OlcuEtiketi,
  tamSayiOlcu: boolean,
) {
  const s1 = worldToScreen(bas, viewport);
  const s2 = worldToScreen(simdi, viewport);
  const dx = Math.abs(simdi.x - bas.x);
  const dy = Math.abs(simdi.y - bas.y);
  const solAlt = { x: Math.min(bas.x, simdi.x), y: Math.min(bas.y, simdi.y) };
  /** Sol alt köşesi çapada duran g × y dünya dikdörtgeninin ekran kutusu (üst kenar y + h) */
  const ekranKutusu = (g: number, y: number) => {
    const solUst = worldToScreen({ x: solAlt.x, y: solAlt.y + y }, viewport);
    const sagAlt = worldToScreen({ x: solAlt.x + g, y: solAlt.y }, viewport);
    return { x: solUst.x, y: solUst.y, w: sagAlt.x - solUst.x, h: sagAlt.y - solUst.y };
  };
  /** Dikdörtgen ve kare önizlemesi: kutu ve ortasında "g x y br" */
  const kutuOnizlemesi = (g: number, y: number, renk: string) => {
    const k = ekranKutusu(g, y);
    return (
      <g className="pointer-events-none">
        <rect x={k.x} y={k.y} width={k.w} height={k.h} {...kesikli(renk, 0.15)} className="animate-pulse" />
        {etiket(`${formatTurkishNumber(g)} x ${formatTurkishNumber(y)} br`, k.x + k.w / 2, k.y + k.h / 2)}
      </g>
    );
  };

  switch (arac) {
    case 'ellipse': {
      // Oluşacak elipsle aynı merkez (elipsMerkezi) ve yarıçaplar
      const a = birOndalik(dx / 2);
      const b = birOndalik(dy / 2);
      const m = worldToScreen(elipsMerkezi(solAlt.x, solAlt.y, dx, dy), viewport);
      return (
        <g className="pointer-events-none">
          <ellipse cx={m.x} cy={m.y} rx={a * viewport.zoom} ry={b * viewport.zoom} {...kesikli('#0ea5e9', 0.12)} className="animate-pulse" />
          {etiket(`a=${formatTurkishNumber(a)} b=${formatTurkishNumber(b)} br`, m.x, m.y)}
        </g>
      );
    }
    case 'square': {
      const kenar = birOndalik(Math.max(dx, dy));
      return kutuOnizlemesi(kenar, kenar, '#f43f5e');
    }
    case 'rectangle':
      return kutuOnizlemesi(birOndalik(dx), birOndalik(dy), '#f59e0b');
    case 'circle': {
      // Yarıçap oluşan çemberinki gibi yuvarlanır (tam sayı ölçüde tam birime)
      const yaricap = surukleCemberYaricapi(Math.hypot(dx, dy), tamSayiOlcu);
      return (
        <g className="pointer-events-none">
          <circle cx={s1.x} cy={s1.y} r={yaricap * viewport.zoom} {...kesikli('#8b5cf6', 0.12)} />
          <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="2,2" />
          {etiket(`r = ${formatTurkishNumber(yaricap)} br`, s1.x, s1.y)}
        </g>
      );
    }
    case 'segment':
      return (
        <g className="pointer-events-none">
          <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#0284c7" strokeWidth={2.5} strokeDasharray="4,4" />
          {etiket(`${formatTurkishNumber(surukleParcaUzunlugu(Math.hypot(dx, dy), viewport.snapToGrid, tamSayiOlcu))} br`, (s1.x + s2.x) / 2, (s1.y + s2.y) / 2)}
        </g>
      );
    default:
      return null;
  }
}

const TIKLA_RENGI = '#8b5cf6';

/**
 * Tıkla-tıkla araçlarının önizlemesi: ilk nokta(lar) konduktan sonra imleç gezdirilirken sonuç kesikli görünür, son
 * tıklama "kör" yapılmaz. `bekleyen` konmuş noktalardır; biri bulunamazsa önizleme çizilmez.
 */
export function tiklaOnizlemesi(
  arac: ToolMode,
  bekleyen: readonly (PointObject | undefined)[],
  imlec: Point2D,
  viewport: ViewportTransform,
  etiket: OlcuEtiketi,
  secenek: { ilkokul: boolean; tamSayiOlcu: boolean },
) {
  if (bekleyen.some((n) => !n)) return null;
  const noktalar = bekleyen as readonly PointObject[];
  const ekran = (p: Point2D) => worldToScreen(p, viewport);

  // Üç noktadan geçen çember. İmleç iki noktanın doğrusuna yaklaşınca yarıçap patlar: devasa çember yerine önizleme
  // gizlenir (üçüncü nokta oraya konursa zaten hata verilir)
  if (arac === 'circle_3points' && noktalar.length === 2) {
    const cc = calculateCircumcircle(noktalar[0], noktalar[1], imlec);
    if (!cc || cc.radius * viewport.zoom > Math.max(viewport.width, viewport.height) * 4) return null;
    const m = ekran(cc.center);
    return (
      <g className="pointer-events-none">
        <circle cx={m.x} cy={m.y} r={cc.radius * viewport.zoom} fill={TIKLA_RENGI} fillOpacity={0.08} stroke={TIKLA_RENGI} strokeWidth={2} strokeDasharray="5,4" />
        <circle cx={m.x} cy={m.y} r={3.5} fill={TIKLA_RENGI} />
      </g>
    );
  }

  // Yay ve daire dilimi: bitiş noktası yayın ÜZERİNE oturur, hedef konumu şimdiden gösterilir
  if ((arac === 'arc' || arac === 'sector') && noktalar.length === 2) {
    const geo = getArcGeometry(noktalar[0], noktalar[1], imlec);
    if (!geo) return null;
    const dilim = arac === 'sector';
    const renk = dilim ? '#10b981' : '#0284c7';
    const m = ekran(noktalar[0]);
    const r = geo.radius * viewport.zoom;
    const yaydaki = (a: number) => ({ x: m.x + r * Math.cos(a), y: m.y - r * Math.sin(a) });
    const p0 = yaydaki(geo.startAngle);
    const p1 = yaydaki(geo.endAngle);
    const yay = 'A ' + r + ' ' + r + ' 0 ' + (geo.sweep > Math.PI ? 1 : 0) + ' 0 ' + p1.x + ' ' + p1.y;
    return (
      <g className="pointer-events-none">
        <path
          d={dilim ? 'M ' + m.x + ' ' + m.y + ' L ' + p0.x + ' ' + p0.y + ' ' + yay + ' Z' : 'M ' + p0.x + ' ' + p0.y + ' ' + yay}
          fill={dilim ? '#10b981' : 'none'}
          fillOpacity={dilim ? 0.18 : 0}
          stroke={renk}
          strokeWidth={2}
          strokeDasharray="5,4"
          strokeLinecap="round"
        />
        <line x1={m.x} y1={m.y} x2={p0.x} y2={p0.y} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="3,3" />
        <line x1={m.x} y1={m.y} x2={p1.x} y2={p1.y} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="3,3" />
        <circle cx={p1.x} cy={p1.y} r={5} fill="#ffffff" stroke={renk} strokeWidth={2} />
        {etiket(`${formatTurkishNumber(Math.round((geo.sweep * 180) / Math.PI))}°`, m.x, m.y - 20)}
      </g>
    );
  }

  // Açı: köşeden imlece kol ve köşede küçük yay (ekran açıları; fark (−π, π] aralığına indirilir)
  if (arac === 'angle' && noktalar.length === 2) {
    const [kol, kose] = noktalar;
    const k = ekran(kose);
    const a1 = Math.atan2(-(kol.y - kose.y), kol.x - kose.x);
    let fark = Math.atan2(-(imlec.y - kose.y), imlec.x - kose.x) - a1;
    while (fark <= -Math.PI) fark += 2 * Math.PI;
    while (fark > Math.PI) fark -= 2 * Math.PI;
    const R = 22;
    const b0 = { x: k.x + R * Math.cos(a1), y: k.y + R * Math.sin(a1) };
    const b1 = { x: k.x + R * Math.cos(a1 + fark), y: k.y + R * Math.sin(a1 + fark) };
    const i = ekran(imlec);
    return (
      <g className="pointer-events-none">
        <line x1={k.x} y1={k.y} x2={i.x} y2={i.y} stroke={TIKLA_RENGI} strokeWidth={1.5} strokeDasharray="4,4" />
        <path d={'M ' + b0.x + ' ' + b0.y + ' A ' + R + ' ' + R + ' 0 0 ' + (fark > 0 ? 1 : 0) + ' ' + b1.x + ' ' + b1.y} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="4,3" />
        {etiket(`${formatTurkishNumber(Math.round(Math.abs((fark * 180) / Math.PI)))}°`, k.x + 48, k.y - 22)}
      </g>
    );
  }

  // Doğru parçası / doğru / ışın / çember: tıkla-tıkla kipinde lastik bant
  if (ikiNoktaliTemelAracMi(arac) && noktalar.length === 1) {
    const s1 = ekran(noktalar[0]);
    const s2 = ekran(imlec);
    const uzunluk = calculateDistance(noktalar[0], imlec);
    const yazi = onizlemeUzunlugu(uzunluk, { ilkokul: secenek.ilkokul, tamSayi: secenek.tamSayiOlcu });
    if (arac === 'circle') {
      return (
        <g className="pointer-events-none">
          <circle cx={s1.x} cy={s1.y} r={uzunluk * viewport.zoom} fill={TIKLA_RENGI} fillOpacity={0.08} stroke={TIKLA_RENGI} strokeWidth={2} strokeDasharray="5,4" />
          <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={TIKLA_RENGI} strokeWidth={1.4} strokeDasharray="3,3" />
          {etiket(`r = ${yazi}`, s1.x, s1.y - 1)}
        </g>
      );
    }
    return (
      <g className="pointer-events-none">
        <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={TIKLA_RENGI} strokeWidth={2} strokeDasharray="5,4" />
        {etiket(yazi, (s1.x + s2.x) / 2, (s1.y + s2.y) / 2 - 14)}
      </g>
    );
  }

  // Çokgen: konan köşeler, imlece uzanan kenar ve (iki köşeden sonra) ilk köşeye kapanış ipucu
  if (arac === 'polygon' && noktalar.length >= 1) {
    const koseler = noktalar.map(ekran);
    const i = ekran(imlec);
    const son = koseler[koseler.length - 1];
    const kapanabilir = koseler.length >= 2;
    return (
      <g className="pointer-events-none">
        {kapanabilir && <path d={koseler.map((k, n) => (n === 0 ? 'M ' : 'L ') + k.x + ' ' + k.y).join(' ')} fill="none" stroke="#10b981" strokeWidth={2} strokeDasharray="5,4" />}
        <line x1={son.x} y1={son.y} x2={i.x} y2={i.y} stroke="#10b981" strokeWidth={2} strokeDasharray="4,4" />
        {kapanabilir && <line x1={i.x} y1={i.y} x2={koseler[0].x} y2={koseler[0].y} stroke="#10b981" strokeWidth={1.2} strokeDasharray="2,4" strokeOpacity={0.6} />}
      </g>
    );
  }

  return null;
}

/** Uzunluk Ölç (cm/kademe birimi) mavi, Birimle Ölç (br) yeşil: çizgi ve rozet çerçevesi */
const OLCME_RENKLERI = {
  measure_distance: { cizgi: '#0284c7', cerceve: '#38bdf8' },
  unit_measure: { cizgi: '#059669', cerceve: '#34d399' },
} as const;

/** Canlı ölçme önizlemesi yalnız bu iki araçta ve ilk nokta konmuşken çizilir */
export const canliOlcmeAraciMi = (arac: ToolMode): arac is keyof typeof OLCME_RENKLERI => arac in OLCME_RENKLERI;

/**
 * Uzunluk Ölç / Birimle Ölç canlı önizlemesi: ilk noktada kesikli halka, imlece uzanan kesikli çizgi, imleçte uç
 * noktası ve ortada uzunluk. İlkokulda uzunluk ilkokul yazımıyla (kesirli / yaklaşık) yazılır.
 */
export function olcmeOnizlemesi(
  arac: keyof typeof OLCME_RENKLERI,
  ilkNokta: Point2D,
  imlec: Point2D,
  viewport: ViewportTransform,
  etiket: OlcuEtiketi,
  secenek: { ilkokul: boolean; birim: 'cm' | 'br' },
) {
  const { cizgi, cerceve } = OLCME_RENKLERI[arac];
  const a = worldToScreen(ilkNokta, viewport);
  const b = worldToScreen(imlec, viewport);
  const uzunluk = calculateDistance(ilkNokta, imlec);
  const yazi = secenek.ilkokul ? ilkokulUzunlukMetni(uzunluk, secenek.birim) : `${formatTurkishNumber(uzunluk)} ${secenek.birim}`;
  return (
    <g className="pointer-events-none measurement-live-preview">
      <circle cx={a.x} cy={a.y} r={16} fill="none" stroke={cizgi} strokeWidth={2.5} strokeDasharray="3,3" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={cizgi} strokeWidth={2.5} strokeDasharray="5,4" />
      <circle cx={b.x} cy={b.y} r={4} fill={cizgi} stroke="#ffffff" strokeWidth={1.5} />
      {etiket(yazi, (a.x + b.x) / 2, (a.y + b.y) / 2 - 14, cerceve)}
    </g>
  );
}

/** Kutuyla seçimde sürüklenen dikdörtgen (dünya köşeleri) */
export interface SecimKutusu {
  startWorld: Point2D;
  currentWorld: Point2D;
}

/** Seçim sayısı rozeti ancak kutu her iki yönde de bu kadar pikselden büyükse sığar */
const ROZET_ICIN_EN_AZ = 40;

/**
 * Kutuyla seçim: yarı saydam kesikli dikdörtgen. Kutu yeterince büyük ve içinde seçilen nesne varsa üst kenarının
 * ortasında (tuvalin üstüne taşmadan) "n nesne seçildi" rozeti görünür.
 */
export function secimKutusu(kutu: SecimKutusu, viewport: ViewportTransform, seciliSayisi: number) {
  const a = worldToScreen(kutu.startWorld, viewport);
  const b = worldToScreen(kutu.currentWorld, viewport);
  const sol = Math.min(a.x, b.x);
  const ust = Math.min(a.y, b.y);
  const genislik = Math.abs(a.x - b.x);
  const yukseklik = Math.abs(a.y - b.y);
  const rozet = seciliSayisi > 0 && genislik > ROZET_ICIN_EN_AZ && yukseklik > ROZET_ICIN_EN_AZ;
  return (
    <g className="pointer-events-none marquee-selection-box">
      <rect x={sol} y={ust} width={genislik} height={yukseklik} fill="#2a9d94" fillOpacity={0.1} stroke="#216a78" strokeWidth={1.5} strokeDasharray="5,4" rx={4} />
      {rozet && (
        <g data-canvas-label="" transform={`translate(${sol + genislik / 2}, ${Math.max(16, ust - 14)})`}>
          <rect x="-48" y="-11" width="96" height="22" rx="11" fill="#15302d" fillOpacity="0.92" />
          <text x="0" y="4" textAnchor="middle" fill="#fbf7ee" className="font-semibold text-[11px] font-sans">
            {seciliSayisi} nesne seçildi
          </text>
        </g>
      )}
    </g>
  );
}
