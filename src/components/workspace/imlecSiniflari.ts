/**
 * 2B tuvalde imlecin TEK kuralı.
 *
 * Kullanıcı "çizim yaparken imleç neden el oluyor?" dedi: nesne katmanları araçtan bağımsız
 * `cursor-pointer` / `cursor-grab` taşıyordu; nokta, doğru parçası ya da şekil üstünden geçerken
 * artı imleci ele dönüşüyordu. Artık tuval öğelerinin imleci yalnız buradan gelir:
 *
 * - Çizim / inşa / ölçme / dönüşüm araçları (seç, el ve sil DIŞINDAKİ her araç): her yerde artı (+).
 * - Sil: her yerde artı; aracın kendisini imlecin yanındaki rozet (ToolCursor) anlatır, el hiç çıkmaz.
 * - Seç ve Taşı: boş tuvalde olağan ok; sürüklenebilir nokta ve nesnelerde açık el, basılıyken kapalı el;
 *   ölçüm etiketlerinde taşıma okları.
 * - El aracı: her yerde açık el (nesnelerin üstünde de), kaydırırken kapalı el.
 *
 * Gerçek arayüz denetimleri (düğme, sürgü tutamağı, işaret kutusu, döndürme kolu, menüler)
 * kendi imleçlerini korur; onlar bu yardımcıdan geçmez.
 *
 * Tailwind sınıfları taranabilsin diye tam yazılır (birleştirilerek üretilmez).
 */
import type { ToolMode } from '@/types/workspace';

/** İmlecin üstünde durduğu tuval öğesinin türü. */
export type ImlecHedefi =
  /** Boş tuval (ızgara, eksenler, iz çizgileri) */
  | 'bos'
  /** Nokta ve onun görünmez geniş yakalayıcısı */
  | 'nokta'
  /** Doğru, şekil, yay, açı, fonksiyon, kalem izi, metin, görsel, kesir modeli */
  | 'nesne'
  /** Taşınabilir ölçüm / ad etiketi */
  | 'etiket'
  /** Katı cismin 2B izdüşümü */
  | 'cisim';

/** CSS `cursor` değeri (satır içi stil için). */
export type ImlecDegeri = 'crosshair' | 'default' | 'grab' | 'grabbing' | 'move';

export interface ImlecSecenekleri {
  /** El aracıyla görünüm şu an kaydırılıyor mu (boş tuval kapalı el gösterir). */
  kaydiriliyor?: boolean;
}

type Arac = ToolMode | string;

/** Seç, El ve Sil dışındaki her araç bir çizim / inşa / ölçme / dönüşüm aracıdır. */
export function cizimAraciMi(arac: Arac): boolean {
  return arac !== 'select' && arac !== 'pan' && arac !== 'delete';
}

/** Hedefteki imlecin CSS değeri (ör. ölçüm etiketinin satır içi `style.cursor`u). */
export function imlecDegeri(arac: Arac, hedef: ImlecHedefi, secenek: ImlecSecenekleri = {}): ImlecDegeri {
  if (arac === 'pan') return secenek.kaydiriliyor ? 'grabbing' : 'grab';
  if (arac === 'select') {
    if (hedef === 'bos') return 'default';
    if (hedef === 'etiket') return 'move';
    return 'grab';
  }
  // Sil ve bütün çizim araçları
  return 'crosshair';
}

/** Hedefin Tailwind imleç sınıfı (basılıyken kapalı el dahil). */
export function imlecSinifi(arac: Arac, hedef: ImlecHedefi, secenek: ImlecSecenekleri = {}): string {
  if (arac === 'pan') {
    if (secenek.kaydiriliyor) return 'cursor-grabbing';
    return hedef === 'bos' ? 'cursor-grab' : 'cursor-grab active:cursor-grabbing';
  }
  if (arac === 'select') {
    if (hedef === 'bos') return 'cursor-default';
    if (hedef === 'etiket') return 'cursor-move';
    return 'cursor-grab active:cursor-grabbing';
  }
  return 'cursor-crosshair';
}
