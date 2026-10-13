// FONKSİYON GRAFİĞİNİN ÜZERİNDEKİ AD/DENKLEM ETİKETİ (alan uzmanı, atölye 4. tur, satır 157:
// "Grafiklerin üzerinde ad/denklem etiketi yok" → "grafik üzerine 'f(x) = 2x + 1' etiketi ekle").
//
// Etiket grafiğin görünen bir noktasının yanına konur: eğri boyunca aday yerler (sağa yakın olan önce) denenir; yazı kutusu ekrandan
// taşmaz, tuvalin sabit düğmelerine (tuvalEngelleri), önceki etiketlere ve herhangi bir grafik çizgisine değmez.
// Yükselen eğride sol üste, alçalan eğride sağ üste yazılır (kutu eğrinin üst yanında); orası doluysa alt yana.

import type { EksenSayilariSonucu } from './eksenSayilari';

export interface Kutu { x: number; y: number; w: number; h: number }
export interface EkranNoktasi { x: number; y: number }
export interface FonksiyonEtiketYeri { x: number; y: number; anchor: 'start' | 'end'; kutu: Kutu }

/** Etiketin tercih edilen yatay konumu (tuval genişliğinin oranı): sağa yakın; adaylar buna yakınlığa göre denenir. */
export const TERCIH_ORANI = 0.8;
/** Eğri boyunca her kaçıncı örnek aday olsun (örnekler ~2 px aralıklı: ~24 px'te bir aday). */
const ADAY_ADIMI = 12;

const KENAR = 6; // ekran kenarından en az
const ARALIK = 8; // grafikten uzaklık

const kesisir = (a: Kutu, b: Kutu) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const icinde = (p: EkranNoktasi, k: Kutu) => p.x >= k.x && p.x <= k.x + k.w && p.y >= k.y && p.y <= k.y + k.h;

/** Eğrinin görünür aday noktaları ve yerel eğimleri (ekran dy/dx), tercih edilen konuma yakınlığa göre sıralı. */
function adayNoktalar(parcalar: readonly EkranNoktasi[][], genislik: number, yukseklik: number) {
  const adaylar: { p: EkranNoktasi; egim: number }[] = [];
  for (const parca of parcalar) {
    for (let i = 0; i < parca.length; i += ADAY_ADIMI) {
      const p = parca[i];
      if (p.y < KENAR + 4 || p.y > yukseklik - KENAR - 4 || p.x < 0 || p.x > genislik) continue;
      const a = parca[Math.max(0, i - 2)];
      const b = parca[Math.min(parca.length - 1, i + 2)];
      const egim = b.x - a.x !== 0 ? (b.y - a.y) / (b.x - a.x) : 0;
      adaylar.push({ p, egim });
    }
  }
  const hedef = genislik * TERCIH_ORANI;
  return adaylar.sort((m, n) => Math.abs(m.p.x - hedef) - Math.abs(n.p.x - hedef));
}

/**
 * Etiketin yeri. `parcalar`: bu grafiğin ekran noktaları (süreksizlikte ayrı parçalar); `cizgiler`: bütün grafiklerin
 * ekran noktaları (etiket hiçbir çizginin üstüne binmesin); `engeller`: düğmeler ve önceki etiketler.
 * Grafik görünür alanda değilse null.
 */
export function fonksiyonEtiketYeri(
  parcalar: readonly EkranNoktasi[][],
  boyut: { genislik: number; yukseklik: number },
  yazi: { w: number; h: number },
  engeller: readonly Kutu[],
  cizgiler: readonly EkranNoktasi[] = [],
): FonksiyonEtiketYeri | null {
  const { genislik, yukseklik } = boyut;
  let yedek: FonksiyonEtiketYeri | null = null;
  for (const { p, egim } of adayNoktalar(parcalar, genislik, yukseklik)) {
    const dikey = Math.min(ARALIK + Math.abs(egim) * 2, 22);
    // Önce eğrinin üst yanı (yükselen eğride sol üst, alçalan eğride sağ üst), sonra alt yanı (sağ alt / sol alt):
    // çukur eğrinin (parabol) üst yanı kolların arasıdır, orası doluysa yazı kolun dışına iner.
    for (const ust of [true, false]) {
      const sagda = ust ? egim >= 0 : egim < 0;
      const anchor: 'start' | 'end' = sagda ? 'start' : 'end';
      const tabanY = ust ? p.y - dikey : p.y + dikey + yazi.h;
      const x = sagda ? p.x + ARALIK : p.x - ARALIK;
      const kutu: Kutu = { x: sagda ? x : x - yazi.w, y: tabanY - yazi.h, w: yazi.w, h: yazi.h + 3 };
      if (kutu.x < KENAR || kutu.y < KENAR || kutu.x + kutu.w > genislik - KENAR || kutu.y + kutu.h > yukseklik - KENAR) continue;
      const yer = { x, y: tabanY, anchor, kutu };
      if (engeller.some((e) => kesisir(kutu, e))) continue;
      const pay: Kutu = { x: kutu.x - 2, y: kutu.y - 2, w: kutu.w + 4, h: kutu.h + 4 };
      if (cizgiler.some((c) => icinde(c, pay))) {
        yedek ??= yer;
        continue;
      }
      return yer;
    }
  }
  return yedek;
}

/**
 * Etiketin değmeyeceği sabit kutular (denetim, 4. tur: sağ kenardaki "+x" rozeti "h(x) = 1/x" etiketinin üstüne
 * biniyordu): verilen kutu kümeleri (tuvalin düğmeleri, nesnelerin kutuları) + eksen çizgisi ve sayıları (eksen ekran
 * dışındayken sayılar kenara yapışır: o satır / sütun) + görünen +x / +y / -y rozetleri ve (0; 0) rozeti.
 */
export function fonksiyonEtiketiEngelleri(
  boyut: { genislik: number; yukseklik: number },
  eksen: Pick<EksenSayilariSonucu, 'x' | 'y' | 'rozetler' | 'orijinRozeti'> | null,
  ...kumeler: readonly (readonly Kutu[])[]
): Kutu[] {
  const { genislik: W, yukseklik: H } = boyut;
  const engeller: Kutu[] = kumeler.flatMap((k) => [...k]);
  if (!eksen) return engeller;
  const { x: ex, y: ey, rozetler, orijinRozeti } = eksen;
  engeller.push(
    ex.sayiYonu === 'alt' ? { x: 0, y: ex.cizgiY - 5, w: W, h: 24 } : { x: 0, y: ex.cizgiY - 19, w: W, h: 24 },
    ey.sayiYonu === 'sol' ? { x: ey.cizgiX - 30, y: 0, w: 35, h: H } : { x: ey.cizgiX - 5, y: 0, w: 35, h: H },
  );
  for (const r of [rozetler.artiX, rozetler.artiY, rozetler.eksiY]) {
    if (r.gorunur) engeller.push({ x: r.x - 3, y: r.y - 3, w: r.w + 6, h: r.h + 6 });
  }
  if (orijinRozeti) engeller.push(orijinRozeti);
  return engeller;
}
