import { MANROPE } from '@/math/manropeTablosu';

/**
 * Yazı genişliği: DOM'a dokunmadan, Manrope ölçü tablosundan.
 *
 * Neden tablo (getComputedTextLength ya da canvas.measureText değil):
 *  - Saf ve eşzamanlı: çizimde (her sürükleme karesinde) ikinci bir render ya da düzen okuması gerekmez;
 *    getComputedTextLength ölçüm için önce çizmeyi, sonra layout effect ile yeniden çizmeyi ister.
 *  - Manrope Google Fonts'tan gelir; çevrimdışıyken ve dışa aktarılan görüntüde (data: SVG) yüklenemez,
 *    Segoe UI'ye düşer. Etiket <text textLength> ile bu genişliğe SABİTLENDİĞİ için süslerin (şapka, yay,
 *    mutlak değer çizgileri) yeri yazı tipinden bağımsızdır: ekran = PNG = PDF = SVG.
 *  - vitest (node) içinde de çalışır: kutu genişlikleri ve süs konumları birim testiyle denetlenir.
 */
type Agirlik = 600 | 700;

interface Tablo { w: Map<string, number>; k: Map<string, number> }
const TABLOLAR = new Map<Agirlik, Tablo>();

function tablo(agirlik: Agirlik): Tablo {
  const hazir = TABLOLAR.get(agirlik);
  if (hazir) return hazir;
  const kaynak = agirlik === 600 ? MANROPE.w600 : MANROPE.w700;
  const w = new Map<string, number>();
  [...kaynak.harfler].forEach((c, i) => w.set(c, kaynak.genislik[i]));
  const k = new Map<string, number>(Object.entries(kaynak.ciftler));
  const t = { w, k };
  TABLOLAR.set(agirlik, t);
  return t;
}

/** Birleşen işaretler (U+0300–U+036F) yer kaplamaz. */
const BIRLESEN = /[̀-ͯ]/;
/** Tabloda olmayan karakter: büyük harf genişliğinin ortalaması kadar say. */
const BILINMEYEN = 620;

/** 1000 birimlik em cinsinden genişlik. */
export function emGenisligi(metin: string, agirlik: Agirlik = 700): number {
  const { w, k } = tablo(agirlik);
  let toplam = 0;
  let onceki = '';
  for (const c of metin) {
    if (BIRLESEN.test(c)) continue;
    toplam += w.get(c) ?? BILINMEYEN;
    if (onceki) toplam += k.get(onceki + c) ?? 0;
    onceki = c;
  }
  return toplam;
}

/** Piksel cinsinden genişlik. */
export function metinGenisligi(metin: string, px: number, agirlik: Agirlik = 700): number {
  return (emGenisligi(metin, agirlik) * px) / 1000;
}
