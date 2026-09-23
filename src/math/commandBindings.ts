import { CircleObject, MathObject, Point2D, PointObject } from '@/types/math';
import { angleBisectorPoint, calculateCircumcircle, intersectCircles, intersectLineCircle, intersectLineEllipse, intersectLines } from './geometry';

export function commandCircleGeometry(circle: CircleObject, point: (id: string) => PointObject): { center: Point2D; radius: number } {
  if (circle.throughPointIds?.length === 3) {
    const [a, b, c] = circle.throughPointIds.map(point);
    const geometry = calculateCircumcircle(a, b, c);
    if (!geometry) throw new Error('Doğrusal üç noktadan çember oluşturulamaz.');
    return geometry;
  }
  const center = point(circle.centerPointId);
  return { center, radius: circle.fixedRadius ?? (circle.radiusPointId ? Math.hypot(point(circle.radiusPointId).x - center.x, point(circle.radiusPointId).y - center.y) : 0) };
}

export function triangleCoordinates(ab: number, bc: number, ca: number): Point2D {
  if (![ab, bc, ca].every(n => Number.isFinite(n) && n > 0 && n <= 10000) ||
      ab + bc <= ca + 1e-8 || ab + ca <= bc + 1e-8 || bc + ca <= ab + 1e-8) {
    throw new Error('Bu kenarlar üçgen oluşturmuyor. Her kenar diğer ikisinin toplamından küçük olmalı; değerler 0–10000 aralığında olmalı.');
  }
  const x = (ab * ab + ca * ca - bc * bc) / (2 * ab);
  return { x, y: Math.sqrt(Math.max(0, ca * ca - x * x)) };
}

export function constructionDependencies(point: PointObject): string[] {
  const rule = point.construction;
  if (!rule) return [];
  switch (rule.kind) {
    case 'foot': return [rule.sourceId, ...rule.linePointIds];
    case 'midpoint': return rule.pointIds;
    case 'tangent': return [rule.circleId, rule.sourceId];
    case 'triangleVertex': return [rule.anchorId, ...rule.sliderIds];
    case 'sliderPoint': return [rule.sliderId, ...('anchorId' in rule ? [rule.anchorId] : []), ...('referenceId' in rule ? [rule.referenceId] : [])];
    case 'ratio': return rule.pointIds;
    case 'direction': return [rule.throughId, ...rule.linePointIds];
    case 'bisector': return rule.pointIds;
    case 'intersection': return rule.objectIds;
    case 'reflect': return [rule.sourceId, ...(rule.axisPointIds ?? []), ...(rule.centerId ? [rule.centerId] : [])];
    case 'rotate': return [rule.sourceId, ...(rule.centerId ? [rule.centerId] : []), ...(rule.sliderId ? [rule.sliderId] : [])];
    case 'translate': return [rule.sourceId, ...(rule.vectorPointIds ?? [])];
    case 'dilate': return [rule.sourceId, ...(rule.centerId ? [rule.centerId] : [])];
    case 'triangleCenter': return rule.pointIds;
    default: return [];
  }
}

/** Kesişim hesabı için sade biçim. Doğru parçası ve ışın, araçtaki gibi sonsuz doğru sayılır. */
type IntersectionShape =
  | { kind: 'line'; a: Point2D; b: Point2D }
  | { kind: 'circle'; center: Point2D; radius: number }
  | { kind: 'ellipse'; center: Point2D; radiusX: number; radiusY: number };

export function intersectionShape(object: MathObject, point: (id: string) => PointObject): IntersectionShape | null {
  switch (object.type) {
    case 'segment': return { kind: 'line', a: point(object.startPointId), b: point(object.endPointId) };
    case 'line': return { kind: 'line', a: point(object.point1Id), b: point(object.point2Id) };
    case 'ray': return { kind: 'line', a: point(object.startPointId), b: point(object.throughPointId) };
    case 'circle': return { kind: 'circle', ...commandCircleGeometry(object, point) };
    case 'arc':
    case 'sector': {
      const center = point(object.centerPointId), start = point(object.startPointId);
      return { kind: 'circle', center, radius: Math.hypot(start.x - center.x, start.y - center.y) };
    }
    case 'ellipse': return { kind: 'ellipse', center: point(object.centerPointId), radiusX: object.radiusX, radiusY: object.radiusY };
    default: return null;
  }
}

/** İki biçimin kesişim noktaları, kararlı sırayla. Desteklenmeyen çiftte null döner. */
export function intersectShapes(first: IntersectionShape, second: IntersectionShape): Point2D[] | null {
  if (first.kind === 'line' && second.kind === 'line') {
    const p = intersectLines(first.a, first.b, second.a, second.b);
    return p ? [p] : [];
  }
  if (first.kind === 'line' && second.kind === 'circle') return intersectLineCircle(first.a, first.b, second.center, second.radius);
  if (first.kind === 'circle' && second.kind === 'line') return intersectLineCircle(second.a, second.b, first.center, first.radius);
  if (first.kind === 'circle' && second.kind === 'circle') return intersectCircles(first.center, first.radius, second.center, second.radius);
  if (first.kind === 'line' && second.kind === 'ellipse') return intersectLineEllipse(first.a, first.b, second.center, second.radiusX, second.radiusY);
  if (first.kind === 'ellipse' && second.kind === 'line') return intersectLineEllipse(second.a, second.b, first.center, first.radiusX, first.radiusY);
  return null;
}

export function triangleCenterPoint(a: Point2D, b: Point2D, c: Point2D, center: 'centroid' | 'circumcenter' | 'incenter' | 'orthocenter'): Point2D {
  if (center === 'centroid') return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
  const circle = calculateCircumcircle(a, b, c);
  if (!circle) throw new Error('Köşeler aynı doğru üzerinde; üçgen merkezi tanımsız.');
  if (center === 'circumcenter') return circle.center;
  if (center === 'orthocenter') return { x: a.x + b.x + c.x - 2 * circle.center.x, y: a.y + b.y + c.y - 2 * circle.center.y };
  const la = Math.hypot(b.x - c.x, b.y - c.y), lb = Math.hypot(a.x - c.x, a.y - c.y), lc = Math.hypot(a.x - b.x, a.y - b.y);
  const sum = la + lb + lc;
  return { x: (la * a.x + lb * b.x + lc * c.x) / sum, y: (la * a.y + lb * b.y + lc * c.y) / sum };
}

export function reflectAcross(p: Point2D, a: Point2D, b: Point2D): Point2D {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  if (len2 < 1e-12) throw new Error('Yansıma ekseninin iki noktası farklı olmalı.');
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  const foot = { x: a.x + t * dx, y: a.y + t * dy };
  return { x: 2 * foot.x - p.x, y: 2 * foot.y - p.y };
}

export function rotateAround(p: Point2D, center: Point2D, degrees: number): Point2D {
  const r = degrees * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
  const dx = p.x - center.x, dy = p.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

/** Atomik: geçersiz bir ilişki varsa hiçbir koordinat/parametre güncellemesi uygulanmaz. */
export function resolveCommandBindings(objects: MathObject[]): MathObject[] {
  if (!objects.some(o => (o.type === 'point' && o.construction) || (o.type === 'ellipse' && o.sliderBindings))) return objects;
  const byId = new Map(objects.map(o => [o.id, o]));
  // Şekil parametreleri nokta inşalarından önce çözülür: elips kesişimleri aynı
  // işlemde yeni yarıçapları görür, sahnedeki nesne sırası sonucu değiştirmez.
  for (const object of objects) if (object.type === 'ellipse' && object.sliderBindings) {
    let ellipse = object;
    for (const [key, sliderId] of Object.entries(object.sliderBindings)) {
      if (!['radiusX', 'radiusY', 'rotation'].includes(key)) throw new Error('Elipsin kaydırıcı özelliği geçersiz.');
      const slider = byId.get(sliderId);
      if (!slider || slider.type !== 'slider') throw new Error('Elipsin bağlı olduğu kaydırıcı bulunamadı.');
      if (!Number.isFinite(slider.value)) throw new Error('Kaydırıcı değeri sonlu bir sayı olmalı.');
      if (key !== 'rotation' && !(slider.value > 0)) throw new Error('Elips yarıçapı için kaydırıcı değeri sıfırdan büyük olmalı.');
      const property = key as 'radiusX' | 'radiusY' | 'rotation';
      if (ellipse[property] !== slider.value) ellipse = { ...ellipse, [property]: slider.value };
    }
    byId.set(ellipse.id, ellipse);
  }
  const solved = new Map<string, PointObject>();
  const visiting = new Set<string>();
  const point = (id: string): PointObject => {
    if (solved.has(id)) return solved.get(id)!;
    const original = byId.get(id);
    if (!original || original.type !== 'point') throw new Error('İnşanın bağlı olduğu nokta bulunamadı.');
    if (!original.construction) return original;
    if (visiting.has(id)) throw new Error('Döngüsel geometrik bağımlılık kurulamaz.');
    visiting.add(id);
    const r = original.construction;
    let position: Point2D;
    switch (r.kind) {
      case 'sliderPoint': {
        const slider = byId.get(r.sliderId);
        if (!slider || slider.type !== 'slider') throw new Error('Noktanın bağlı olduğu kaydırıcı bulunamadı.');
        const value = slider.value;
        if (!Number.isFinite(value)) throw new Error('Kaydırıcı değeri sonlu bir sayı olmalı.');
        if (r.mode === 'x') position = { x: value, y: original.y };
        else if (r.mode === 'y') position = { x: original.x, y: value };
        else if (r.mode === 'length') {
          if (!(value > 0)) throw new Error('Uzunluk için kaydırıcı değeri sıfırdan büyük olmalı.');
          const anchor = point(r.anchorId);
          const length = Math.hypot(r.direction.x, r.direction.y);
          if (!(length > 1e-12) || !Number.isFinite(length)) throw new Error('Uzunluğun doğrultusu geçersiz.');
          position = { x: anchor.x + value * r.direction.x / length, y: anchor.y + value * r.direction.y / length };
        } else if (r.mode === 'angle') {
          const maximum = r.maximumDegrees ?? 360;
          if (!Number.isFinite(maximum) || maximum <= 0 || maximum > 360) throw new Error('Kaydırıcı açısının üst sınırı geçersiz.');
          if (value < 0 || value > maximum) throw new Error(`Açı için kaydırıcı değeri 0 ile ${maximum} derece arasında olmalı.`);
          if (!(r.radius > 0) || !Number.isFinite(r.radius) || ![1, -1].includes(r.orientation)) throw new Error('Açının kol uzunluğu veya yönü geçersiz.');
          const anchor = point(r.anchorId), reference = point(r.referenceId);
          if (Math.hypot(reference.x - anchor.x, reference.y - anchor.y) < 1e-12) throw new Error('Açının referans kolu köşeyle çakışamaz.');
          const theta = Math.atan2(reference.y - anchor.y, reference.x - anchor.x) + r.orientation * value * Math.PI / 180;
          position = { x: anchor.x + r.radius * Math.cos(theta), y: anchor.y + r.radius * Math.sin(theta) };
        } else throw new Error('Kaydırıcı ilişkisi geçersiz.');
        break;
      }
      case 'triangleVertex': {
        const lengths = r.sliderIds.map(sid => {
          const slider = byId.get(sid);
          if (!slider || slider.type !== 'slider') throw new Error('Üçgenin kaydırıcısı bulunamadı.');
          return slider.value;
        });
        const c = triangleCoordinates(lengths[0], lengths[1], lengths[2]);
        const local = r.vertex === 1 ? { x: lengths[0], y: 0 } : { x: c.x, y: c.y * r.orientation };
        const anchor = point(r.anchorId);
        position = { x: anchor.x + local.x * Math.cos(r.rotation) - local.y * Math.sin(r.rotation),
          y: anchor.y + local.x * Math.sin(r.rotation) + local.y * Math.cos(r.rotation) };
        break;
      }
      case 'midpoint': {
        const a = point(r.pointIds[0]), b = point(r.pointIds[1]);
        position = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        break;
      }
      case 'ratio': {
        const a = point(r.pointIds[0]), b = point(r.pointIds[1]);
        position = { x: a.x + (b.x - a.x) * r.t, y: a.y + (b.y - a.y) * r.t };
        break;
      }
      case 'foot': {
        const p = point(r.sourceId), a = point(r.linePointIds[0]), b = point(r.linePointIds[1]);
        const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
        if (len2 < 1e-12) throw new Error('Dik indirilecek kenarın iki noktası farklı olmalı.');
        const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
        position = { x: a.x + t * dx, y: a.y + t * dy };
        break;
      }
      case 'direction': {
        const through = point(r.throughId), a = point(r.linePointIds[0]), b = point(r.linePointIds[1]);
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx * dx + dy * dy < 1e-12) throw new Error('Doğrultuyu belirleyen iki nokta farklı olmalı.');
        position = r.mode === 'parallel' ? { x: through.x + dx, y: through.y + dy } : { x: through.x - dy, y: through.y + dx };
        break;
      }
      case 'bisector': {
        const found = angleBisectorPoint(point(r.pointIds[0]), point(r.pointIds[1]), point(r.pointIds[2]));
        if (!found) throw new Error('Açıortay kurulamadı: kollar çakışık ya da aynı doğru üzerinde ters yönlü.');
        position = found;
        break;
      }
      case 'intersection': {
        const shapes = r.objectIds.map(oid => {
          const object = byId.get(oid);
          if (!object) throw new Error('Kesişimi oluşturan nesne bulunamadı.');
          return intersectionShape(object, point);
        });
        const found = shapes[0] && shapes[1] ? intersectShapes(shapes[0], shapes[1]) : null;
        // Kesişim geçici olarak kaybolabilir (ör. çember sürüklenirken); nokta son konumunda bekler.
        position = found?.[r.index] ?? { x: original.x, y: original.y };
        break;
      }
      case 'reflect': {
        const p = point(r.sourceId);
        if (r.axisPointIds) position = reflectAcross(p, point(r.axisPointIds[0]), point(r.axisPointIds[1]));
        else if (r.centerId) { const c = point(r.centerId); position = { x: 2 * c.x - p.x, y: 2 * c.y - p.y }; }
        else if (r.axis === 'x') position = { x: p.x, y: -p.y };
        else if (r.axis === 'y') position = { x: -p.x, y: p.y };
        else if (r.axis === 'y=x') position = { x: p.y, y: p.x };
        else if (r.axis === 'y=-x') position = { x: -p.y, y: -p.x };
        else throw new Error('Yansıma ekseni tanımlı değil.');
        break;
      }
      case 'rotate': {
        const center = r.centerId ? point(r.centerId) : r.center ?? { x: 0, y: 0 };
        const slider = r.sliderId ? byId.get(r.sliderId) : undefined;
        const deg = slider && slider.type === 'slider' ? (slider as { value: number }).value : r.degrees;
        position = rotateAround(point(r.sourceId), center, deg);
        break;
      }
      case 'translate': {
        const p = point(r.sourceId);
        const vector = r.vectorPointIds
          ? { x: point(r.vectorPointIds[1]).x - point(r.vectorPointIds[0]).x, y: point(r.vectorPointIds[1]).y - point(r.vectorPointIds[0]).y }
          : r.vector ?? { x: 0, y: 0 };
        position = { x: p.x + vector.x, y: p.y + vector.y };
        break;
      }
      case 'dilate': {
        const p = point(r.sourceId), center = r.centerId ? point(r.centerId) : r.center ?? { x: 0, y: 0 };
        position = { x: center.x + (p.x - center.x) * r.factor, y: center.y + (p.y - center.y) * r.factor };
        break;
      }
      case 'triangleCenter': {
        const [a, b, c] = r.pointIds.map(point);
        position = triangleCenterPoint(a, b, c, r.center);
        break;
      }
      case 'tangent': {
        const circle = byId.get(r.circleId) as CircleObject | undefined;
        if (!circle || circle.type !== 'circle') throw new Error('Teğetin çemberi bulunamadı.');
        const { center: c, radius } = commandCircleGeometry(circle, point);
        const p = point(r.sourceId);
        const dx = p.x - c.x, dy = p.y - c.y, d2 = dx * dx + dy * dy;
        if (!(radius > 0) || d2 < radius * radius - 1e-8) throw new Error('Çemberin içindeki bir noktadan gerçek teğet çizilemez.');
        if (r.direction) {
          if (Math.abs(d2 - radius * radius) > 1e-6) throw new Error('Teğet noktası çember üzerinde kalmalı.');
          position = { x: p.x - dy, y: p.y + dx };
        } else {
          const factor = radius * radius / d2;
          const offset = radius * Math.sqrt(Math.max(0, d2 - radius * radius)) / d2 * r.branch;
          position = { x: c.x + factor * dx - offset * dy, y: c.y + factor * dy + offset * dx };
        }
        break;
      }
      default:
        throw new Error('Tanınmayan geometrik ilişki.');
    }
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new Error('İnşa geçerli koordinatlar üretemedi.');
    const result = Math.abs(position.x - original.x) < 1e-10 && Math.abs(position.y - original.y) < 1e-10
      ? original : { ...original, ...position };
    solved.set(id, result);
    visiting.delete(id);
    return result;
  };
  return objects.map(o => {
    if (o.type === 'point') return point(o.id);
    if (o.type === 'ellipse') return byId.get(o.id)!;
    if (o.type === 'angle') {
      for (const [movingId, referenceId] of [[o.point3Id, o.point1Id], [o.point1Id, o.point3Id]]) {
        const moving = byId.get(movingId);
        const rule = moving?.type === 'point' ? moving.construction : undefined;
        if (rule?.kind === 'sliderPoint' && rule.mode === 'angle' && o.valueSliderId === rule.sliderId && rule.anchorId === o.vertexPointId && rule.referenceId === referenceId) {
          const slider = byId.get(rule.sliderId);
          if (slider?.type === 'slider' && !!o.reflex !== (slider.value > 180)) return { ...o, reflex: slider.value > 180 };
        }
      }
    }
    return o;
  });
}
