import React from 'react';
import type { Point2D, ViewportTransform } from '@/types/math';
import { isometricSide, worldToScreen } from '@/math/coordinates';
import type { EtiketGrubu } from '@/math/etiketStandardi';
import type { EksenSayilariSonucu } from '../eksenSayilari';

/*
 * TUVALİN ZEMİN KATMANLARI: ızgara (kareli, noktalı, izometrik), dört bölge rozetleri ve eksenler (oklar, ±x / ±y
 * rozetleri, sayılar, orijin). Bunlar bileşen değil ÇİZİM İŞLEVLERİDİR: Canvas döndürdükleri SVG öğelerini kendi ağacına
 * doğrudan yerleştirir (tuvalin çizim çıktısı kaydı, tuvalCizimKaydi.test.ts, öğe ağacını birebir karşılaştırır).
 */

/** Etiket yazı boyu (Canvas.fs): taban boyut ve etiket grubu → piksel */
export type YaziBoyu = (taban: number, grup?: EtiketGrubu) => number;

/** Kareli ızgaranın çizgi konumları (dünya birimi): dikey çizgilerin x'leri, yatay çizgilerin y'leri */
export interface IzgaraKonumlari {
  xKonumlari: number[];
  yKonumlari: number[];
}

/** Izgaranın görünen alanın ötesine taştığı adım sayısı: kaydırırken kenarda çizgisiz şerit kalmaz */
const TASMA_ADIMI = 16;
/** Ekranın dışına uzanan çizgi uçları (px): yakınlaştırma ve kaydırmada çizgilerin ucu görünmez */
const UZAK = 1000;
/** Eksen çizgisi, ok, çentik ve rozetlerin rengi */
const EKSEN_RENGI = '#737373';

/** [alt, üst] aralığını her iki yandan TASMA_ADIMI adım aşan, adımın tam katlarındaki konumlar (4 ondalık) */
function adimKatlari(alt: number, ust: number, adim: number): number[] {
  const ilk = Math.floor((alt - adim * TASMA_ADIMI) / adim);
  const son = Math.ceil((ust + adim * TASMA_ADIMI) / adim);
  const katlar: number[] = [];
  for (let k = ilk; k <= son; k++) katlar.push(Number((k * adim).toFixed(4)));
  return katlar;
}

/** Görünen dünya sınırlarına göre kareli ızgaranın konumları; ne ızgara ne eksen açıksa boştur (eksen sayıları da bunu kullanır) */
export function izgaraKonumlari(
  sinirlar: { minX: number; maxX: number; minY: number; maxY: number },
  adim: number,
  gerekli: boolean,
): IzgaraKonumlari {
  if (!gerekli) return { xKonumlari: [], yKonumlari: [] };
  return { xKonumlari: adimKatlari(sinirlar.minX, sinirlar.maxX, adim), yKonumlari: adimKatlari(sinirlar.minY, sinirlar.maxY, adim) };
}

/** Kareli ızgara çizgisinin görünümü: 5'in katları kalın, tam birimler orta, ara adımlar ince */
const IZGARA_CIZGISI = {
  bes: { sinif: 'stroke-ada-murekkep-2/45 dark:stroke-ada-fildisi/25', kalinlik: 1.4 },
  tam: { sinif: 'stroke-ada-murekkep-2/25 dark:stroke-ada-fildisi/15', kalinlik: 1.0 },
  ara: { sinif: 'stroke-ada-murekkep-2/14 dark:stroke-ada-fildisi/8', kalinlik: 0.7 },
} as const;
const cizgiGorunumu = (d: number) =>
  IZGARA_CIZGISI[Math.abs(d % 5) < 0.001 ? 'bes' : Math.abs(Math.round(d) - d) < 0.001 ? 'tam' : 'ara'];

/** Kareli ızgara. Eksenler açıkken x = 0 ve y = 0 çizgileri eksen katmanında çizilir, burada atlanır. */
export function kareliIzgara(viewport: ViewportTransform, konumlar: IzgaraKonumlari) {
  const alt = Math.max(viewport.height, 2000) + UZAK;
  const sag = Math.max(viewport.width, 3000) + UZAK;
  const cizgi = (anahtar: string, d: number, x1: number, y1: number, x2: number, y2: number) => {
    const g = cizgiGorunumu(d);
    return <line key={anahtar} x1={x1} y1={y1} x2={x2} y2={y2} className={g.sinif} strokeWidth={g.kalinlik} />;
  };
  return (
    <g className="grid-lines select-none pointer-events-none" data-grid-style="kareli" opacity={viewport.gridOpacity ?? 1}>
      {konumlar.xKonumlari.map((x) => {
        if (x === 0 && viewport.showAxes) return null;
        const ekranX = worldToScreen({ x, y: 0 }, viewport).x;
        return cizgi(`gx-${x}`, x, ekranX, -UZAK, ekranX, alt);
      })}
      {konumlar.yKonumlari.map((y) => {
        if (y === 0 && viewport.showAxes) return null;
        const ekranY = worldToScreen({ x: 0, y }, viewport).y;
        return cizgi(`gy-${y}`, y, -UZAK, ekranY, sag, ekranY);
      })}
    </g>
  );
}

/**
 * Noktalı ızgara ("noktalı zemin"): kesişimlerde noktalar, tam birimlerde ve 5'in katlarında daha iri. Binlerce daire
 * yerine her nokta sıklığı için tek bir SVG deseni ve onu dolduran tam ekran dikdörtgen çizilir.
 */
export function noktaliIzgara(viewport: ViewportTransform, adim: number, orijin: Point2D) {
  const desenler = [
    { id: 'geoeba-noktali-izgara-adim', aralik: adim * viewport.zoom, r: 1.6, sinif: 'fill-ada-murekkep-2/45 dark:fill-ada-fildisi/30' },
    ...(adim < 1 ? [{ id: 'geoeba-noktali-izgara-birim', aralik: viewport.zoom, r: 2.1, sinif: 'fill-ada-murekkep-2/65 dark:fill-ada-fildisi/45' }] : []),
    { id: 'geoeba-noktali-izgara-ana', aralik: 5 * viewport.zoom, r: 2.8, sinif: 'fill-ada-murekkep-2/80 dark:fill-ada-fildisi/60' },
  ].filter((d) => d.aralik >= 6); // 6 px'ten sık noktalar zemini griye boğar
  return (
    <g className="grid-dots select-none pointer-events-none" data-grid-style="noktali" opacity={viewport.gridOpacity ?? 1}>
      <defs>
        {desenler.map((d) => (
          <pattern key={d.id} id={d.id} patternUnits="userSpaceOnUse" width={d.aralik} height={d.aralik} x={orijin.x - d.aralik / 2} y={orijin.y - d.aralik / 2}>
            <circle cx={d.aralik / 2} cy={d.aralik / 2} r={d.r} className={d.sinif} />
          </pattern>
        ))}
      </defs>
      {desenler.map((d) => (
        <rect key={d.id} x={0} y={0} width="100%" height="100%" fill={`url(#${d.id})`} />
      ))}
    </g>
  );
}

/**
 * İzometrik ızgara: dikey ve ±30° eğik üç çizgi ailesi (eşkenar üçgen örgü). Her aile orijinden geçen, döndürülmüş tek
 * bir desendir; aralık = üçgen kenarı × √3/2. Çizgiler 6 px'ten sıklaşırsa ızgara çizilmez.
 */
export function izometrikIzgara(viewport: ViewportTransform, adim: number, orijin: Point2D) {
  const kenar = isometricSide(viewport, adim) * viewport.zoom; // yakalamayla aynı kural
  const aralik = (kenar * Math.sqrt(3)) / 2;
  if (aralik < 6) return null;
  const desenKimligi = (aci: number) => `geoeba-izometrik-${aci < 0 ? 'eksi' : ''}${Math.abs(aci)}`;
  const aileler = [90, 30, -30];
  const sinif = 'stroke-ada-murekkep-2/30 dark:stroke-ada-fildisi/20';
  return (
    <g className="grid-isometric select-none pointer-events-none" data-grid-style="izometrik" opacity={viewport.gridOpacity ?? 1}>
      <defs>
        {aileler.map((aci) => (
          <pattern key={aci} id={desenKimligi(aci)} patternUnits="userSpaceOnUse" width={64} height={aralik} patternTransform={`translate(${orijin.x} ${orijin.y}) rotate(${-aci})`}>
            <line x1={0} y1={0} x2={64} y2={0} strokeWidth={1.1} className={sinif} />
            <line x1={0} y1={aralik} x2={64} y2={aralik} strokeWidth={1.1} className={sinif} />
          </pattern>
        ))}
      </defs>
      {aileler.map((aci) => (
        <rect key={aci} x={0} y={0} width="100%" height="100%" fill={`url(#${desenKimligi(aci)})`} />
      ))}
    </g>
  );
}

/** Dört bölge rozetinin adı, renkleri ve orijine göre yanı (MEB analitik düzlem) */
const BOLGELER = [
  { ad: 'I. Bölge (+, +)', renk: '#10b981', yaziRengi: '#047857', sagda: true, ustte: true },
  { ad: 'II. Bölge (-, +)', renk: '#f59e0b', yaziRengi: '#b45309', sagda: false, ustte: true },
  { ad: 'III. Bölge (-, -)', renk: '#8b5cf6', yaziRengi: '#6d28d9', sagda: false, ustte: false },
  { ad: 'IV. Bölge (+, -)', renk: '#0284c7', yaziRengi: '#0369a1', sagda: true, ustte: false },
] as const;

/**
 * Dört bölge rozetleri: her rozet kendi bölgesinin ortasına yakın, orijinden en az 30 px ve ekran kenarından en az
 * 30 px içeride durur (100 × 26 px).
 */
export function bolgeRozetleri(viewport: ViewportTransform, orijin: Point2D, yaziBoyu: YaziBoyu) {
  const { width: w, height: h } = viewport;
  const solX = (sagda: boolean) =>
    sagda ? Math.max(orijin.x + 30, Math.min(w - 130, (w + orijin.x) / 2 - 50)) : Math.min(orijin.x - 130, Math.max(30, orijin.x / 2 - 50));
  const ustY = (ustte: boolean) =>
    ustte ? Math.min(orijin.y - 45, Math.max(30, orijin.y / 2 - 12)) : Math.max(orijin.y + 30, Math.min(h - 45, (h + orijin.y) / 2 - 12));
  return (
    <g data-canvas-label="" className="quadrant-badges select-none pointer-events-none font-black text-xs">
      {BOLGELER.map((b) => (
        <g key={b.ad} transform={`translate(${solX(b.sagda)}, ${ustY(b.ustte)})`}>
          <rect width="100" height="26" rx="8" fill={b.renk} fillOpacity="0.18" stroke={b.renk} strokeWidth="1.5" className="shadow-sm backdrop-blur-sm" />
          <text x="50" y="17" textAnchor="middle" fill={b.yaziRengi} fontSize={yaziBoyu(12, 'axis')} className="font-bold font-sans">
            {b.ad}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Eksen sayısının zemin renginde halesi (Canvas.eksenSayiHalesi) */
export interface SayiHalesi {
  stroke: string;
  strokeWidth: number;
  strokeLinejoin: 'round';
  paintOrder: string;
}

/**
 * Eksenler: x ve y eksen çizgileri (her iki uçta ok), ±x / ±y rozetleri, çentikler ve sayılar (yerleşim
 * eksenSayilari.ts'ten gelir) ve orijin rozeti "(0; 0)". Ekran dışına çok uzaklaşan eksen çizilmez.
 */
export function eksenler(viewport: ViewportTransform, orijin: Point2D, yerlesim: EksenSayilariSonucu | null, yaziBoyu: YaziBoyu, sayiHalesi: SayiHalesi) {
  const { width: w, height: h } = viewport;
  const alt = Math.max(h, 2000) + UZAK;
  const sag = Math.max(w, 3000) + UZAK;
  const rozet = (yer: { x: number; y: number; gorunur: boolean } | undefined, metin: string) =>
    yer?.gorunur && (
      <g data-canvas-label="" transform={`translate(${yer.x}, ${yer.y})`}>
        <rect width="36" height="20" rx="6" fill={EKSEN_RENGI} className="shadow-sm" />
        <text x="18" y="14" textAnchor="middle" fill="#ffffff" fontSize={yaziBoyu(12, 'axis')} className="font-black font-sans">{metin}</text>
      </g>
    );
  const xEkseniCizilir = orijin.y >= -UZAK && orijin.y <= alt;
  const yEkseniCizilir = orijin.x >= -UZAK && orijin.x <= sag;
  const orijinGorunur = orijin.x >= -30 && orijin.x <= w + 30 && orijin.y >= -30 && orijin.y <= h + 30;
  return (
    <g fontSize={yaziBoyu(11, 'axis')} className="axes text-muted-foreground font-mono pointer-events-none">
      {xEkseniCizilir && (
        <>
          <line x1={-UZAK} y1={orijin.y} x2={sag} y2={orijin.y} stroke={EKSEN_RENGI} strokeWidth={2.5} />
          <polygon points={`${w - 12},${orijin.y - 6} ${w - 2},${orijin.y} ${w - 12},${orijin.y + 6}`} fill={EKSEN_RENGI} />
          <polygon points={`12,${orijin.y - 6} 2,${orijin.y} 12,${orijin.y + 6}`} fill={EKSEN_RENGI} />
          {rozet(yerlesim?.rozetler.eksiX, '-x')}
          {rozet(yerlesim?.rozetler.artiX, '+x')}
        </>
      )}
      {yEkseniCizilir && (
        <>
          <line x1={orijin.x} y1={-UZAK} x2={orijin.x} y2={alt} stroke={EKSEN_RENGI} strokeWidth={2.5} />
          <polygon points={`${orijin.x - 6},12 ${orijin.x},2 ${orijin.x + 6},12`} fill={EKSEN_RENGI} />
          <polygon points={`${orijin.x - 6},${h - 12} ${orijin.x},${h - 2} ${orijin.x + 6},${h - 12}`} fill={EKSEN_RENGI} />
          {rozet(yerlesim?.rozetler.artiY, '+y')}
          {rozet(yerlesim?.rozetler.eksiY, '-y')}
        </>
      )}
      {yerlesim && (['x', 'y'] as const).map((eksen) =>
        yerlesim[eksen].ogeler.map((o) => (
          <g key={`t${eksen}-${o.deger}`}>
            {o.centikGorunur && <line x1={o.centik.x1} y1={o.centik.y1} x2={o.centik.x2} y2={o.centik.y2} stroke={EKSEN_RENGI} strokeWidth={1.5} />}
            {o.sayi.gorunur && (
              <text data-eksen={eksen} x={o.sayi.x} y={o.sayi.y} textAnchor={o.sayi.hiza} {...sayiHalesi} fontSize={yaziBoyu(11, 'axis')} className="fill-foreground/80 select-none font-bold">
                {o.sayi.metin}
              </text>
            )}
          </g>
        ))
      )}
      {orijinGorunur && (
        <g transform={`translate(${orijin.x}, ${orijin.y})`}>
          <circle cx="0" cy="0" r="14" fill={EKSEN_RENGI} fillOpacity="0.15" stroke={EKSEN_RENGI} strokeWidth="1.5" strokeDasharray="3,2" />
          <circle cx="0" cy="0" r="4" fill={EKSEN_RENGI} stroke="#ffffff" strokeWidth="1.5" />
          <g data-canvas-label="" transform="translate(8, 8)">
            <rect width="48" height="20" rx="6" fill="#ffffff" stroke={EKSEN_RENGI} strokeWidth="1.5" className="shadow-sm" />
            <text x="24" y="14" textAnchor="middle" fill={EKSEN_RENGI} fontSize={yaziBoyu(11, 'axis')} className="font-mono font-black">
              (0; 0)
            </text>
          </g>
        </g>
      )}
    </g>
  );
}
