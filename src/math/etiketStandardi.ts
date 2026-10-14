/**
 * Tuval etiketlerinin YAZI STANDARDI — 2B tuval (Canvas.tsx, MatematikEtiketi.tsx) ile 3B sahne (Canvas3D.tsx,
 * etiket3B.ts) aynı kaynaktan okur.
 *
 * Kullanıcı (14.10.2026): "atölye serbest çizimde 3b etiket yazı özellikleri 2b ile aynı değil aynı standartlar orada da
 * olmalı". 3B eskiden 128 × 64 px tuvale sabit 30/34 px `ui-monospace` yazıyor, Stil ayarlarını hiç okumuyordu.
 * Değerler 2B'nin çizdiği biçimden çıkarıldı (Canvas.tsx: fs(…) çağrıları, nokta adı, eksen rozeti, orijin rozeti,
 * eksen sayısı; MatematikEtiketi: ölçü yazısı ve halesi). 2B'de bir değer değişirse burası değişir, 3B kendiliğinden uyar.
 */
import type { StyleSettings } from '@/types/workspace';
import { yaziOlcegiOrandan } from './labelViewport';

/** Stil > Yazı Boyutları'nın grupları: nokta adları, ölçüm kutuları, eksen sayıları */
export type EtiketGrubu = 'label' | 'measure' | 'axis';
export type YaziBoyuAyarlari = Pick<StyleSettings, 'fontScale' | 'pointLabelScale' | 'measurementScale' | 'axisScale'>;

/**
 * Yazı boyu (px): temel değer × "Tüm yazılar" × grubun ayrıntılı çarpanı (2B'nin fs(…) işlevi bunu çağırır).
 */
export function etiketYaziBoyu(taban: number, grup: EtiketGrubu, s: YaziBoyuAyarlari): number {
  const carpan = grup === 'label' ? s.pointLabelScale : grup === 'axis' ? s.axisScale : s.measurementScale;
  return Number((taban * s.fontScale * carpan).toFixed(2));
}

/** Etiket türlerinin ölçek 1'deki (varsayılan ayar, %100 görünüm) yazı boyu ve grubu — 2B tuvalle aynı. */
export const ETIKET_TURLERI = {
  /** Nokta adı: fs(12, 'label') · yazı ölçeği, kalın, ön plan rengi, hafif gölge */
  noktaAdi: { taban: 12, grup: 'label', agirlik: 700 },
  /** Nokta adının yanındaki koordinat: fs(10, 'label') · yazı ölçeği, normal, soluk renk */
  noktaKoordinati: { taban: 10, grup: 'label', agirlik: 400 },
  /** Ölçü yazısı (uzunluk, alan, açı…): fs(11, 'measure') · yazı ölçeği, kalın, ön plan, zemin halesi */
  olcu: { taban: 11, grup: 'measure', agirlik: 700 },
  /** Eksen sayısı: fs(11, 'axis'), sabit boy, kalın, ön plan %80, zemin halesi */
  eksenSayisi: { taban: 11, grup: 'axis', agirlik: 700 },
  /** Eksen adı rozeti (+x, +y): fs(12, 'axis'), sabit boy, en kalın (font-black), beyaz yazı, eksen renginde rozet */
  eksenAdi: { taban: 12, grup: 'axis', agirlik: 900 },
  /** Orijin rozeti ((0; 0)): fs(11, 'axis'), sabit boy, eş aralıklı en kalın, gri yazı, beyaz rozet gri çerçeve */
  orijin: { taban: 11, grup: 'axis', agirlik: 900 },
} as const satisfies Record<string, { taban: number; grup: EtiketGrubu; agirlik: number }>;
export type EtiketTuru = keyof typeof ETIKET_TURLERI;

/** Türün bu ayarlardaki yazı boyu (yakınlık ölçeği uygulanmadan). */
export const turYaziBoyu = (tur: EtiketTuru, s: YaziBoyuAyarlari): number =>
  etiketYaziBoyu(ETIKET_TURLERI[tur].taban, ETIKET_TURLERI[tur].grup, s);

/**
 * Yakınlaşınca büyüyen / uzaklaşınca alt sınırda kalan türler. Eksen sayıları ve rozetleri 2B'de olduğu gibi ekranda
 * sabit boydadır (yalnız "Eksen sayıları" çarpanı ve "Tüm yazılar" etkiler).
 */
export const yakinlikOlceklenir = (tur: EtiketTuru): boolean => ETIKET_TURLERI[tur].grup !== 'axis';

/**
 * Yazı aileleri. globals.css'te `* { font-family: 'Manrope', … !important }` bütün SVG <text>'lerine Manrope verir
 * (g.axes'in font-mono'sunu da ezer); yalnız kendisi `.font-mono` sınıflı yazı Roboto Mono'dur (orijin rozeti).
 * Tuval (canvas 2D) yazısı CSS'i görmediği için aile adı burada açıkça yazılır.
 */
export const ETIKET_YAZI_AILESI = ['Manrope', "'Instrument Sans'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'Roboto', 'sans-serif'].join(', ');
export const ETIKET_ES_ARALIKLI_AILE = "'Roboto Mono', monospace";

/** Eksen çizgisinin, sayı rozetinin ve orijin rozetinin 2B grisi (Canvas.tsx #737373) */
export const EKSEN_GRISI = '#737373';
/** Eksen sayısının opaklığı (fill-foreground/80) */
export const EKSEN_SAYISI_OPAKLIGI = 0.8;

/** Kutusuz ölçü yazısının halesi (MatematikEtiketi: stroke-width = px · 0,32, paint-order stroke) */
export const olcuHaleKalinligi = (px: number): number => px * 0.32;
/** Eksen sayısının halesi (Canvas.tsx eksenSayiHalesi: fs(3, 'axis'), 2,5 – 6 px) */
export const eksenSayisiHaleKalinligi = (s: YaziBoyuAyarlari): number =>
  Math.min(6, Math.max(2.5, etiketYaziBoyu(3, 'axis', s)));

/** Nokta adının gölgesi: Tailwind `drop-shadow` (0 1px 2px / %10, 0 1px 1px / %6) */
export const NOKTA_ADI_GOLGESI: readonly { y: number; bulaniklik: number; renk: string }[] = [
  { y: 1, bulaniklik: 2, renk: 'rgba(0, 0, 0, 0.1)' },
  { y: 1, bulaniklik: 1, renk: 'rgba(0, 0, 0, 0.06)' },
];

/** Eksen adı rozeti (Canvas.tsx: rect 36 × 20, rx 6; yazı tabanı 14) */
export const EKSEN_ROZETI = { genislik: 36, yukseklik: 20, rx: 6, taban: 14 } as const;
/** Orijin rozeti (Canvas.tsx: rect 48 × 20, rx 6, çerçeve 1,5; noktanın 8 px sağ altında) */
export const ORIJIN_ROZETI = { genislik: 48, yukseklik: 20, rx: 6, taban: 14, cizgi: 1.5, kayma: 8 } as const;

/** 3B kameranın "Ölçek %100" yakınlığı (Canvas3D alt bilgisi: zoom / 55; cisimYerlesimi.VARSAYILAN_KAMERA_3B) */
export const KAMERA_3B_OLCEK_100 = 55;

/**
 * 3B'nin yazı ölçeği — 2B'deki "yakınlaşınca büyür (en çok %5), uzaklaşınca küçülür ama `altSinir`ın altına inmez"
 * kuralının karşılığı. 2B oranı zoom / 44 (2B %100), 3B oranı kamera zoom / 55 (3B %100): iki görünüm de %100'de
 * yazıyı normal boyda gösterir. Kameranın bakış uzaklığı bu zoom'dan türer (uzaklık = (yükseklik / 2) / (zoom · tan(fov / 2))),
 * yani ölçek kamera uzaklığıyla ters orantılıdır; yazı ekranda bu ölçekle sabit piksel boyda çizilir.
 */
export function yaziOlcegi3B(kameraZoom: number, altSinir: number): number {
  return yaziOlcegiOrandan(kameraZoom / KAMERA_3B_OLCEK_100, altSinir);
}
