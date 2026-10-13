import type { FunctionObject, MathObject } from '@/types/math';
import { fonksiyonAdiYazimi, fonksiyonEtiketiYazimi, ifadeYazimi } from '@/math/fonksiyonYazimi';

/**
 * NESNELER LİSTESİ VE BAĞLAMLAR KARTI: nesnenin görünen adı ve türü (alan uzmanı, atölye 4. tur).
 *   [161] uzun adlar simgelerin altına taşmasın (Toolbar: üç noktayla kısaltma) ve aynı adı taşıyan nesneler
 *         ayırt edilsin: listede ikinci, üçüncü … aynı ad "(2)", "(3)" ekiyle gösterilir (nesnenin adı değişmez).
 *   [162] tür etiketi Türkçe ("function" değil "fonksiyon").
 */

export const NESNE_TURU_ADLARI: Readonly<Record<MathObject['type'], string>> = {
  point: 'nokta',
  segment: 'doğru parçası',
  line: 'doğru',
  ray: 'ışın',
  circle: 'çember',
  ellipse: 'elips',
  arc: 'yay',
  sector: 'daire dilimi',
  angle: 'açı',
  polygon: 'çokgen',
  function: 'fonksiyon',
  slider: 'sürgü',
  fraction: 'kesir modeli',
  pen: 'serbest çizim',
  text: 'yazı',
  image: 'görsel',
  checkbox: 'işaret kutusu',
  button: 'düğme',
  input_box: 'girdi kutusu',
  measurement: 'ölçüm',
};

/** Türkçe tür adı (küçük harf): üç köşeli çokgen "üçgen", dört köşeli "dörtgen". */
export function nesneTuruAdi(obj: Pick<MathObject, 'type'> & { pointIds?: readonly string[] }): string {
  if (obj.type === 'polygon' && obj.pointIds) {
    if (obj.pointIds.length === 3) return 'üçgen';
    if (obj.pointIds.length === 4) return 'dörtgen';
  }
  return NESNE_TURU_ADLARI[obj.type] ?? 'nesne';
}

const buyukHarfle = (s: string) => (s ? s.charAt(0).toLocaleUpperCase('tr') + s.slice(1) : s);

/** Listede ve Bağlamlar kartında görünen ad: fonksiyonda okunur denklem, etiketi olmayan nesnede Türkçe tür adı. */
export function nesneGorunenAdi(obj: MathObject): string {
  if (obj.type === 'function') return fonksiyonEtiketiYazimi(obj as FunctionObject);
  return obj.label || buyukHarfle(nesneTuruAdi(obj as MathObject & { pointIds?: string[] }));
}

/**
 * Aynı görünen adı taşıyan nesnelere ayırt edici ek: ilki olduğu gibi, sonrakiler "(2)", "(3)" … (sıra listedeki
 * sırayla aynı). Yalnız görünümdür; nesnenin etiketi ve komutlarda kullanılan adı değişmez.
 */
export function ayirtEdiciAdlar(objects: readonly MathObject[], adi: (o: MathObject) => string = nesneGorunenAdi): Map<string, string> {
  const sayac = new Map<string, number>();
  const sonuc = new Map<string, string>();
  for (const o of objects) {
    const ad = adi(o);
    const n = (sayac.get(ad) ?? 0) + 1;
    sayac.set(ad, n);
    sonuc.set(o.id, n === 1 ? ad : `${ad} (${n})`);
  }
  return sonuc;
}

/**
 * Fonksiyon satırının listedeki yazımı: adlı fonksiyon "f(x)" + "= 2x + 1" (iki nokta yok, okunuşu f(x) = 2x + 1);
 * "y = …" etiketli "y" + "= …"; özel adlı ("Parabol") ad + ":" + "y = x² − 4".
 */
export function fonksiyonSatiri(fn: FunctionObject): { ad: string; ozet: string; ayirac: boolean } {
  const ifade = ifadeYazimi(fn.expression);
  const adli = fonksiyonAdiYazimi(fn);
  if (adli) return { ad: adli, ozet: `= ${ifade}`, ayirac: false };
  const etiket = (fn.label ?? '').trim();
  if (!etiket || /^\s*y\s*=/i.test(etiket)) return { ad: 'y', ozet: `= ${ifade}`, ayirac: false };
  return { ad: etiket, ozet: `y = ${ifade}`, ayirac: true };
}
