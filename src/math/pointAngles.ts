import type { ArcObject, MathObject, SectorObject } from '@/types/math';

/**
 * Bir noktada AÇI KURAN komşu noktalar (tekrarsız, sırası korunur).
 *
 * Komşuluk yalnızca kenarlardan gelir:
 *  - noktayı uç/tanım noktası olarak kullanan doğru parçası, doğru ve ışın,
 *  - noktanın köşesi olduğu çokgenin iki komşu köşesi.
 * Çember/elips merkezi olmak ya da çemberin yarıçap noktası olmak kenar DEĞİLDİR;
 * bu yüzden düz bir çemberin merkezinde açı yoktur.
 *
 * Sıra measureAngleAtPoint'in eski davranışıyla aynıdır: önce parça/doğru/ışın komşuları
 * (nesne sırasıyla), sonra çokgen komşuları. Sahnede bulunmayan (sarkık) kimlikler sayılmaz.
 */
export function angleNeighbourIds(pointId: string, objects: readonly MathObject[]): string[] {
  const komsular: string[] = [];
  for (const o of objects) {
    let a: string | undefined;
    let b: string | undefined;
    if (o.type === 'segment') {
      a = o.startPointId;
      b = o.endPointId;
    } else if (o.type === 'line') {
      a = o.point1Id;
      b = o.point2Id;
    } else if (o.type === 'ray') {
      a = o.startPointId;
      b = o.throughPointId;
    }
    if (a === pointId && b) komsular.push(b);
    else if (b === pointId && a) komsular.push(a);
  }
  for (const o of objects) {
    if (o.type !== 'polygon') continue;
    const ids = o.pointIds;
    const i = ids.indexOf(pointId);
    if (i === -1) continue;
    komsular.push(ids[(i - 1 + ids.length) % ids.length]);
    komsular.push(ids[(i + 1) % ids.length]);
  }
  const noktalar = new Set(objects.filter((o) => o.type === 'point').map((o) => o.id));
  return [...new Set(komsular)].filter((id) => id !== pointId && noktalar.has(id));
}

/**
 * Şekil, köşesi `vertexId` olan bir açının `vertexId -> pointId` KOLUNU çiziyor mu?
 *
 * Kenar anlamı angleNeighbourIds ile aynıdır: iki ucu bu iki nokta olan doğru parçası,
 * tanım noktaları bu ikisi olan doğru, birinden başlayıp ötekinden geçen ışın (iki yön de)
 * ya da bu iki noktayı KOMŞU köşe olarak taşıyan çokgen (son köşeden ilke dönen kenar dâhil).
 * Çokgenin köşegeni kenar değildir. Silme zinciri bunu kullanır: kolu silinen açı,
 * kolu artık hiçbir şekil çizmiyorsa ekranda boşlukta asılı kalmasın diye birlikte gider.
 */
export function providesAngleArm(o: MathObject, vertexId: string, pointId: string): boolean {
  if (!vertexId || !pointId || vertexId === pointId) return false;
  const cift = (a?: string, b?: string) =>
    (a === vertexId && b === pointId) || (a === pointId && b === vertexId);
  if (o.type === 'segment') return cift(o.startPointId, o.endPointId);
  if (o.type === 'line') return cift(o.point1Id, o.point2Id);
  if (o.type === 'ray') return cift(o.startPointId, o.throughPointId);
  if (o.type === 'polygon') {
    const ids = o.pointIds;
    const n = ids.length;
    return n >= 2 && ids.some((id, i) => cift(id, ids[(i + 1) % n]));
  }
  return false;
}

export type PointAngleAction =
  /**
   * Nokta yay/dilim merkezi: "Açısını ölç" bu şekillerin merkez açılarını BİRLİKTE açıp kapatır
   * (ikiye bölünmüş çemberin merkezinde iki yay vardır; yalnız birini değiştirmek menüyle ekranı ayrıştırıyordu).
   */
  | { kind: 'central'; shape: ArcObject | SectorObject; shapes: (ArcObject | SectorObject)[] }
  /** Noktada en az iki farklı kenar buluşuyor: ilk iki komşu ile açı kurulur. */
  | { kind: 'vertex'; neighbourIds: [string, string] };

/**
 * Noktanın sağ tık menüsünde "Açısını ölç" sunulmalı mı, sunulursa ne yapmalı?
 * null → noktada ölçülecek açı yok (yalnız nokta, düz çember merkezi, yarıçap noktası…).
 * Menü ve measureAngleAtPoint AYNI kararı bu fonksiyondan alır.
 */
export function pointAngleAction(pointId: string, objects: readonly MathObject[]): PointAngleAction | null {
  const shapes = objects.filter(
    (o): o is ArcObject | SectorObject => (o.type === 'arc' || o.type === 'sector') && o.centerPointId === pointId
  );
  if (shapes.length > 0) return { kind: 'central', shape: shapes[0], shapes };
  const ids = angleNeighbourIds(pointId, objects);
  return ids.length >= 2 ? { kind: 'vertex', neighbourIds: [ids[0], ids[1]] } : null;
}
