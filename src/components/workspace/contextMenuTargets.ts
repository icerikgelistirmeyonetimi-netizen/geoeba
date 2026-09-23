import type { MathObject, PointObject } from '@/types/math';

/** Noktanın geniş yakalama alanı, orada birleşen bir kenarın yakalama alanını aşabilir. */
function meetsPoint(
  object: MathObject,
  point: PointObject,
  byId: ReadonlyMap<string, MathObject>,
): boolean {
  if (object.id === point.onObjectId) return true;
  switch (object.type) {
    case 'segment':
      return object.startPointId === point.id || object.endPointId === point.id;
    case 'line':
      return object.point1Id === point.id || object.point2Id === point.id;
    case 'ray':
      return object.startPointId === point.id || object.throughPointId === point.id;
    case 'polygon':
      return object.pointIds.includes(point.id);
    case 'angle':
      return object.vertexPointId === point.id;
    case 'circle':
      // Merkez çemberin üzerinde değildir; yalnızca çevreyi tanımlayan noktalar eklenir.
      if (object.throughPointIds?.length) return object.throughPointIds.includes(point.id);
      return object.fixedRadius === undefined && object.radiusPointId === point.id;
    case 'arc':
    case 'sector': {
      if (object.startPointId === point.id) return true;
      if (object.type === 'sector' && object.centerPointId === point.id) return true;
      if (object.directionPointId !== point.id) return false;
      // Yön noktası aynı yarıçapta değilse yayın gerçek bitiş noktası değildir.
      const center = byId.get(object.centerPointId);
      const start = byId.get(object.startPointId);
      if (center?.type !== 'point' || start?.type !== 'point') return false;
      const radius = Math.hypot(start.x - center.x, start.y - center.y);
      const distance = Math.hypot(point.x - center.x, point.y - center.y);
      return radius > 0 && Math.abs(distance - radius) <= 1e-9 * Math.max(1, radius);
    }
    default:
      return false;
  }
}

/**
 * Sağ tık / uzun basma sekmeleri: tıklanan nesne başta, görünür isabetler kendi
 * sırasında. Nokta gövdesine basıldığında orada birleşen nesneler de eklenir;
 * taşınmış nokta adına basmak ise yalnızca imlecin altındaki nesneleri kullanır.
 */
export function contextMenuTargets(
  objects: readonly MathObject[],
  clicked: MathObject,
  hitIds: readonly string[],
  pointBody: boolean,
): MathObject[] {
  const byId = new Map(objects.map((object) => [object.id, object]));
  const result = [clicked];
  const seen = new Set([clicked.id]);
  const add = (object: MathObject | undefined) => {
    if (!object || object.visible === false || seen.has(object.id)) return;
    seen.add(object.id);
    result.push(object);
  };

  for (const id of hitIds) add(byId.get(id));
  if (pointBody && clicked.type === 'point') {
    // Çizim sırasının sonundaki nesneler üsttedir; eksik adaylar bu sırayla eklenir.
    for (let i = objects.length - 1; i >= 0; i--) {
      if (meetsPoint(objects[i], clicked, byId)) add(objects[i]);
    }
  }
  return result;
}
