// Düzgün çokgen köşeleri: Düzgün Çokgen penceresi ve yazılı/sesli komutlar aynı düzeni kullanır.

import type { Point2D } from '@/types/math';

/**
 * Merkezi `center`, çevrel çember yarıçapı `radius` olan düzgün n-genin köşeleri, ders kitabı düzeninde: şekil
 * yatay bir tabana oturur, ilk köşe (A) sol alttadır ve köşeler saat yönünün tersine dizilir (eşkenar üçgende
 * A sol alt, B sağ alt, C tepe; kare kenarları eksenlere paralel durur).
 *
 * Dünya koordinatında y yukarıdır; i. köşenin açısı −π/2 − π/n + 2πi/n. Açı, alt noktadan ölçülen φ = kπ/n
 * (k = 2i − 1, (−n, n] aralığına indirgenmiş) olarak hesaplanır; böylece dikey eksene göre simetrik köşelerin
 * y değerleri bit bit eşit çıkar ve taban, sonradan 2 basamağa yuvarlansa bile tam yatay kalır.
 */
export function regularPolygonVertices(sides: number, radius: number, center: Point2D = { x: 0, y: 0 }): Point2D[] {
  return Array.from({ length: sides }, (_, i) => {
    const k = 2 * i - 1 > sides ? 2 * i - 1 - 2 * sides : 2 * i - 1;
    const phi = (k * Math.PI) / sides;
    return { x: center.x + radius * Math.sin(phi), y: center.y - radius * Math.cos(phi) };
  });
}
