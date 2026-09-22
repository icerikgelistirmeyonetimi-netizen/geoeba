/**
 * GÖRÜNÜM KAYDIRMA BASIŞI — "El aracıyla nesnenin üstünden kaydıramıyorum" kuralı.
 *
 * Kullanıcı: "El aracıyla kaydırmaya bir noktanın ya da şeklin üstünden başlarsanız
 * görünüm kaymıyor." Sebebi: tuvaldeki her nesne katmanının kendi `onPointerDown`u
 * `stopPropagation()` çağırıp basışı yutuyordu; tuvalin kaydırma işleyicisi olayı
 * hiç görmüyordu. Üstelik imleç (imlecSiniflari.ts) her hedefte el gösterip
 * gerçekleşmeyen bir kaydırma sözü veriyordu.
 *
 * Çözüm TEK bir yerde toplanır: 2B tuvalin kök `<svg>` öğesindeki YAKALAMA
 * (capture) aşamasında basış önce buradan geçer. Kaydırma basışıysa olay hiçbir
 * alt işleyiciye ulaşmaz; görünüm kayar. Böylece yarın eklenecek yeni bir nesne
 * katmanı bu kuralı unutamaz — kendi işleyicisi zaten hiç çağrılmaz.
 *
 * Buradaki işlevler SAF'tır (DOM'a ya da React'e bağlı değil): birim testlerle
 * doğrulanır, `Canvas.tsx` yalnızca çağırır.
 */

/** Basıştan okunan en küçük bilgi (React.PointerEvent, MouseEvent ve düz nesne uyar). */
export interface KaydirmaBasisi {
  /** Fare düğmesi: 0 sol, 1 orta, 2 sağ. Dokunma ve kalemde 0'dır; verilmezse 0 sayılır. */
  button?: number;
  /** Alt tuşu basılı mı? Alt + sürükle her araçta görünümü kaydırır. */
  altKey?: boolean;
}

/** Görünümü kaydıran araç (El aracı). */
export const EL_ARACI = 'pan';

/**
 * El aracının DOKUNMADIĞI öğeler.
 *
 * Ölçme araçları (iletki, cetvel, gönye, alan modeli) tuvalin üstünde duran
 * fiziksel aletlerdir; kendi sürükleme tutamakları vardır (MeasurementInstruments.tsx).
 * Onlar yalnız kendi araçlarında görünür, yine de kural açıkça yazılır.
 */
export const KAYDIRMA_DISI_SECICI = '[data-olcme-araci], [data-olcme-menusu]';

/**
 * Bu basış GÖRÜNÜMÜ KAYDIRMAK içindir → tuvaldeki hiçbir nesne işleyicisi onu yutmamalı.
 *
 * - Orta tuş: her araçta kaydırır.
 * - Alt + sol tuş: her araçta kaydırır.
 * - El aracı: sol tuş, dokunma ve kalem kaydırır.
 * - Sağ tuş HİÇBİR zaman kaydırmaz: bağlam menüsü ona aittir (nesne menüsü açık kalır).
 */
export function gorunumKaydirmaBasisiMi(arac: string, e: KaydirmaBasisi = {}): boolean {
  const dugme = e.button ?? 0;
  if (dugme === 1) return true;
  if (dugme !== 0) return false;
  return e.altKey === true || arac === EL_ARACI;
}

/** Hedef, el aracının dokunmadığı bir öğenin (ölçme aleti) içinde mi? */
export function kaydirmaDisiHedefMi(hedef: Element | null | undefined): boolean {
  if (!hedef || typeof hedef.closest !== 'function') return false;
  return hedef.closest(KAYDIRMA_DISI_SECICI) !== null;
}

/**
 * Tuvaldeki bir işleyici (nokta, şekil, etiket, cisim, bileşen, döndürme kolu…)
 * bu basışı yutup kendi işini yapmalı mı?
 *
 * Nesne işleyicilerinin ilk satırı: `if (!nesneBasisiIslenmeli(activeTool, e)) return;`
 */
export function nesneBasisiIslenmeli(arac: string, e: KaydirmaBasisi = {}): boolean {
  return !gorunumKaydirmaBasisiMi(arac, e);
}
