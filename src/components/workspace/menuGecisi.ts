/**
 * Üst menü çubuğunda başlıklar arası geçiş (WorkspaceMenuBar, Kademe menüsü dahil).
 *
 * Menü açıkken başka bir başlığın üzerine gelinince o menü açılır. Üzerine gelmeyle açılan menünün başlığına gelen İLK
 * tıklama menüyü KAPATMAZ: fareyle başlığa varınca menü zaten değişmiştir; dokunmatik tahtada da tek dokunuş önce
 * "üzerine gelme", hemen ardından "tıklama" üretir. Eskiden bu tıklama yeni açılan menüyü kapatıyordu: menü açıkken
 * başka başlığa tıklamak yalnız açık menüyü kapatıyor, ikinci tık gerekiyordu (alan uzmanı, atölye inceleme 4. tur).
 */

export interface MenuGecisDurumu<K extends string> {
  /** Açık menü (null: hiçbiri) */
  acik: K | null;
  /** Üzerine gelmeyle açılmış ve henüz tıklanmamış menü */
  uzerineGelinceAcilan: K | null;
}

/** Başlığın üzerine gelindi: menü açıksa ve başka bir başlıksa o menüye geçilir. */
export function basligaGelince<K extends string>(durum: MenuGecisDurumu<K>, menu: K): MenuGecisDurumu<K> {
  if (durum.acik === null || durum.acik === menu) return durum;
  return { acik: menu, uzerineGelinceAcilan: menu };
}

/** Başlığa tıklandı: üzerine gelmeyle yeni açılmış menü açık kalır; yoksa menü açılır / kapanır. */
export function basligaTiklayinca<K extends string>(durum: MenuGecisDurumu<K>, menu: K): MenuGecisDurumu<K> {
  if (durum.uzerineGelinceAcilan === menu) return { acik: menu, uzerineGelinceAcilan: null };
  return { acik: durum.acik === menu ? null : menu, uzerineGelinceAcilan: null };
}
