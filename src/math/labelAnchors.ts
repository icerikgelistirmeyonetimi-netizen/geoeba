import type { MathObject, MeasurementLabelAnchor, Point2D } from '@/types/math';

/** Birbirine gerçekten çizgi/yüzey ile bağlı noktalar; yapım bağımlılıkları değildir. */
function shapePointIds(object: MathObject): string[] {
  switch (object.type) {
    case 'segment': return [object.startPointId, object.endPointId];
    case 'line': return [object.point1Id, object.point2Id];
    case 'ray': return [object.startPointId, object.throughPointId];
    case 'polygon': return object.pointIds;
    case 'circle':
      return object.throughPointIds?.length
        ? object.throughPointIds
        : [object.centerPointId, ...(object.radiusPointId ? [object.radiusPointId] : [])];
    case 'ellipse': return [object.centerPointId];
    case 'arc':
    case 'sector': return [object.centerPointId, object.startPointId, object.directionPointId];
    default: return [];
  }
}

/**
 * Ayrılmış ölçü etiketinin ait olduğu bütün şeklin nokta kümesi.
 * Açı ve ölçü nesneleri iki bağımsız şekli birbirine bağlamaz; yalnızca kendi
 * etiketleri için kaynak noktaların zaten bağlı olduğu bileşenleri toplarlar.
 */
export function labelAnchorPointIds(objects: readonly MathObject[], objectId: string): string[] {
  const byId = new Map(objects.map(object => [object.id, object]));
  const object = byId.get(objectId);
  if (!object) return [];

  const parents = new Map<string, string>();
  for (const item of objects) if (item.type === 'point') parents.set(item.id, item.id);
  const root = (id: string): string => {
    const parent = parents.get(id)!;
    if (parent === id) return id;
    const result = root(parent);
    parents.set(id, result);
    return result;
  };
  const connect = (ids: string[]) => {
    const existing = ids.filter(id => parents.has(id));
    if (!existing.length) return;
    const first = root(existing[0]);
    for (const id of existing.slice(1)) parents.set(root(id), first);
  };
  for (const item of objects) connect(shapePointIds(item));
  // Yol üzerindeki nokta taşıyıcının parçasıdır. Herhangi bir construction
  // zincirini izlemek ise bağımsız yansıtılmış/ötelenmiş şekilleri birleştirir.
  for (const item of objects) {
    if (item.type !== 'point' || !item.onObjectId) continue;
    const host = byId.get(item.onObjectId);
    const hostPoints = host ? shapePointIds(host) : [];
    if (hostPoints.length) connect([item.id, ...hostPoints]);
  }

  let seeds: string[];
  if (object.type === 'point') seeds = [object.id];
  else if (object.type === 'angle') seeds = [object.point1Id, object.vertexPointId, object.point3Id];
  else if (object.type === 'measurement') {
    const circle = object.kind === 'arc' && object.circleId ? byId.get(object.circleId) : undefined;
    seeds = circle?.type === 'circle' ? shapePointIds(circle) : object.pointIds;
  } else seeds = shapePointIds(object);

  const roots = new Set(seeds.filter(id => parents.has(id)).map(root));
  return [...parents.keys()].filter(id => roots.has(root(id))).sort();
}

/** Kayıtlı ortak çapanın hâlâ var olan noktalarının ağırlık merkezi. */
export function shapeAnchorCenter(objects: readonly MathObject[], pointIds: readonly string[]): Point2D | null {
  const ids = new Set(pointIds);
  let x = 0;
  let y = 0;
  let count = 0;
  for (const object of objects) {
    if (object.type !== 'point' || !ids.has(object.id) || !Number.isFinite(object.x) || !Number.isFinite(object.y)) continue;
    x += object.x;
    y += object.y;
    count++;
  }
  return count ? { x: x / count, y: y / count } : null;
}

/** Etiketin seçilen yatay kenarı sabit kalırken güncel metin merkezini bulur. */
export function anchoredLabelPosition(
  anchor: MeasurementLabelAnchor,
  objects: readonly MathObject[],
  widthWorld: number,
): Point2D | null {
  const center = shapeAnchorCenter(objects, anchor.pointIds);
  if (!center) return null;
  const halfWidth = Math.max(0, Number.isFinite(widthWorld) ? widthWorld : 0) / 2;
  const shiftX = anchor.alignment === 'left' ? halfWidth : anchor.alignment === 'right' ? -halfWidth : 0;
  return { x: center.x + anchor.offset.x + shiftX, y: center.y + anchor.offset.y };
}
