/**
 * 2B nesne geçmişi ile 3B cisim geçmişi ayrı tutulur. Geri al / yinele, hangi görünümde
 * olunursa olsun ZAMANCA en son yapılan işi geri almalıdır: 3B'de taşınan bir 2B nesne
 * 3B'de geri alınabilmeli, 2B'de silinen bir küp 2B'de geri gelebilmelidir.
 *
 * Aynı kullanıcı eylemi her iki geçmişe de yazdıysa (ör. seçili nesne VE cisim birlikte
 * silindi) iki adımın zamanları birkaç milisaniye içindedir; o zaman ikisi birlikte
 * geri alınır/yinelenir. İki geçmiş de zamanı eylemin GÖNDERİLDİĞİ anda alır (2B: commit/record
 * eylemindeki `now`, 3B: sahne eylemindeki `now`); render ne kadar sürerse sürsün aynı olay
 * işleyicisindeki iki adımın farkı yalnız eşzamanlı kodun süresidir.
 */
export type GecmisTaraf = '2b' | '3b';

/** Aynı eylem sayılacak en büyük zaman farkı (ms). */
export const AYNI_EYLEM_MS = 25;

/**
 * Geri alınacak geçmiş(ler). Parametre: o geçmişte geri alınacak adımın yapıldığı zaman
 * (geri alınacak adım yoksa undefined).
 */
export function ortakGeriAlmaHedefi(ikiB: number | undefined, ucB: number | undefined): GecmisTaraf[] {
  if (ikiB === undefined && ucB === undefined) return [];
  if (ikiB === undefined) return ['3b'];
  if (ucB === undefined) return ['2b'];
  if (Math.abs(ikiB - ucB) <= AYNI_EYLEM_MS) return ['2b', '3b'];
  return ucB > ikiB ? ['3b'] : ['2b'];
}

/**
 * Yinelenecek geçmiş(ler). Parametre: o geçmişte yinelenecek adımın ilk yapıldığı zaman.
 * En ESKİ adım önce yinelenir (geri almanın tersi sırası).
 */
export function ortakYinelemeHedefi(ikiB: number | undefined, ucB: number | undefined): GecmisTaraf[] {
  if (ikiB === undefined && ucB === undefined) return [];
  if (ikiB === undefined) return ['3b'];
  if (ucB === undefined) return ['2b'];
  if (Math.abs(ikiB - ucB) <= AYNI_EYLEM_MS) return ['2b', '3b'];
  return ucB < ikiB ? ['3b'] : ['2b'];
}
