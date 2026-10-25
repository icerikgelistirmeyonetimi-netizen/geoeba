import type { LineObject, PointObject, RayObject, SegmentObject, ViewportTransform } from '@/types/math';
import { worldToScreen } from '@/math/coordinates';

/** Tuvalde düz bir çizgiyle çizilen nesneler */
export type DogrusalNesne = SegmentObject | LineObject | RayObject;

export const dogrusalMi = (n: { type: string }): n is DogrusalNesne => n.type === 'segment' || n.type === 'line' || n.type === 'ray';

/** Nesneyi tanımlayan iki noktanın kimlikleri (parça: uçlar; doğru: iki nokta; ışın: başlangıç ve geçtiği nokta) */
export function tanimNoktalari(n: DogrusalNesne): [string, string] {
  if (n.type === 'segment') return [n.startPointId, n.endPointId];
  if (n.type === 'line') return [n.point1Id, n.point2Id];
  return [n.startPointId, n.throughPointId];
}

/**
 * Tanım noktaları (dünya) ve çizilecek çizginin ekran uçları. Parça olduğu gibi çizilir; doğru iki yana, ışın
 * başlangıcından ileri, ekranın iki katı uzunluk kadar uzatılır (ekranın her yerinden taşar). Bir nokta yoksa ya da
 * doğru/ışının iki noktası çakışıksa (yön yok) çizilmez.
 */
export function dogrusalUclar(n: DogrusalNesne, noktalar: ReadonlyMap<string, PointObject>, viewport: ViewportTransform) {
  const [id1, id2] = tanimNoktalari(n);
  const p1 = noktalar.get(id1);
  const p2 = noktalar.get(id2);
  if (!p1 || !p2) return null;
  if (n.type === 'segment') return { p1, p2, s1: worldToScreen(p1, viewport), s2: worldToScreen(p2, viewport) };
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const boy = Math.hypot(dx, dy);
  if (boy === 0) return null;
  const uzanti = Math.max(viewport.width, viewport.height) * 2 / viewport.zoom;
  const ileri = { x: (dx / boy) * uzanti, y: (dy / boy) * uzanti };
  const bas = n.type === 'line' ? { x: p1.x - ileri.x, y: p1.y - ileri.y } : p1;
  const son = n.type === 'line' ? { x: p2.x + ileri.x, y: p2.y + ileri.y } : { x: p1.x + ileri.x, y: p1.y + ileri.y };
  return { p1, p2, s1: worldToScreen(bas, viewport), s2: worldToScreen(son, viewport) };
}
