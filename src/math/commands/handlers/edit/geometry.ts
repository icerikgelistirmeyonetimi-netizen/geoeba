import type { FunctionObject, MathObject, Point2D, PointObject } from '@/types/math';
import { type HostShape, projectOntoHost } from '@/math/geometry';
import { commandCircleGeometry } from '@/math/commandBindings';
import { validateMathExpression } from '@/math/parser';
import { type CommandScene, fail, tidy, trNum } from '../../scene';
import { describe } from './targets';

export const fmtPoint = (p: Point2D) => `(${trNum(p.x)}; ${trNum(p.y)})`;

/** Fonksiyon grafiğini d kadar kaydırır: x → (x − dx), ifade + dy. Düzenleme (taşıma) ve dönüşüm (öteleme) aileleri birlikte kullanır. */
export function shiftFunction(s: CommandScene, fn: FunctionObject, d: Point2D) {
  const num = (n: number) => String(tidy(Math.abs(n)));
  let expression = fn.expression;
  if (Math.abs(d.x) > 1e-12) expression = expression.replace(/(?<![A-Za-z_çğıöşüÇĞİÖŞÜ])x(?![A-Za-z_0-9(])/g, `(x ${d.x > 0 ? '-' : '+'} ${num(d.x)})`);
  if (Math.abs(d.y) > 1e-12) expression = `(${expression}) ${d.y > 0 ? '+' : '-'} ${num(d.y)}`;
  const check = validateMathExpression(expression);
  if (!check.ok) fail(`Fonksiyon kaydırılamadı: ${check.error}`);
  const label = fn.label.endsWith(fn.expression) ? fn.label.slice(0, fn.label.length - fn.expression.length) + expression : fn.label;
  s.update(fn.id, { expression, label });
}

const CONSTRUCTION_NAMES: Record<NonNullable<PointObject['construction']>['kind'], string> = {
  foot: 'dikme ayağı', midpoint: 'orta nokta', tangent: 'teğet noktası', triangleVertex: 'kaydırıcılara bağlı üçgen köşesi', ratio: 'oranda bölme noktası',
  direction: 'paralel/dik doğrunun noktası', bisector: 'açıortay noktası', intersection: 'kesişim noktası', reflect: 'yansıma görüntüsü', rotate: 'döndürme görüntüsü',
  sliderPoint: 'kaydırıcıya bağlı nokta', translate: 'öteleme görüntüsü', dilate: 'homotete görüntüsü', triangleCenter: 'üçgen merkezi',
};
export function constructionName(p: PointObject): string {
  return p.construction ? CONSTRUCTION_NAMES[p.construction.kind] ?? 'bağlı nokta' : 'bağımsız nokta';
}

type Lookup = (id: string) => MathObject | undefined;
function pointBy(get: Lookup, id: string): PointObject | undefined {
  const o = get(id);
  return o?.type === 'point' ? o : undefined;
}

/** Nesnenin üzerine nokta iz düşürmek için sade biçim (WorkspaceContext.hostBicimi ile aynı). */
export function hostShapeOf(o: MathObject, get: Lookup): HostShape | null {
  if (o.type === 'segment' || o.type === 'line' || o.type === 'ray') {
    const a = pointBy(get, o.type === 'line' ? o.point1Id : o.startPointId);
    const b = pointBy(get, o.type === 'line' ? o.point2Id : o.type === 'segment' ? o.endPointId : o.throughPointId);
    return a && b ? { kind: o.type, a, b } : null;
  }
  if (o.type === 'circle') {
    try {
      const g = commandCircleGeometry(o, id => pointBy(get, id) ?? (() => { throw new Error('Eksik çember noktası'); })());
      return g.radius > 0 ? { kind: 'circle', ...g } : null;
    } catch { return null; }
  }
  if (o.type === 'ellipse') {
    const c = pointBy(get, o.centerPointId);
    return c ? { kind: 'ellipse', center: c, radiusX: o.radiusX, radiusY: o.radiusY } : null;
  }
  if (o.type === 'arc' || o.type === 'sector') {
    const c = pointBy(get, o.centerPointId), s = pointBy(get, o.startPointId);
    if (!c || !s) return null;
    const r = Math.hypot(s.x - c.x, s.y - c.y);
    return r > 0 ? { kind: 'circle', center: c, radius: r } : null;
  }
  if (o.type === 'polygon') {
    const v = o.pointIds.map(id => pointBy(get, id)).filter((p): p is PointObject => !!p);
    return v.length >= 3 ? { kind: 'polygon', vertices: v } : null;
  }
  return null;
}

/**
 * Taşıyıcısı değişen (ya da kendisi taşınan) "nesne üzerindeki" noktaları taşıyıcının üzerine geri oturtur.
 * Çemberde nokta önce merkezle birlikte kaydırılır, sonra iz düşürülür (araçtaki sürüklemeyle aynı).
 */
export function reproject(scene: CommandScene, before: Map<string, MathObject>) {
  for (let round = 0; round < 6; round++) {
    let moved = false;
    for (const obj of scene.objects) {
      if (obj.type !== 'point' || !obj.onObjectId || obj.construction) continue;
      const host = scene.get(obj.onObjectId);
      if (!host) continue;
      const selfChanged = before.get(obj.id) !== obj;
      const hostChanged = [host.id, ...scene.definingPointIds(host)].some(id => scene.get(id) !== before.get(id));
      if (!selfChanged && !hostChanged) continue;
      const shape = hostShapeOf(host, id => scene.get(id));
      if (!shape) continue;
      let position: Point2D = obj;
      const old = before.get(obj.id);
      if (shape.kind === 'circle' && !selfChanged && old?.type === 'point') {
        const oldHost = before.get(host.id);
        const oldShape = oldHost && hostShapeOf(oldHost, id => before.get(id));
        if (oldShape?.kind === 'circle') position = { x: obj.x + shape.center.x - oldShape.center.x, y: obj.y + shape.center.y - oldShape.center.y };
      }
      const projected = projectOntoHost(position, shape);
      if (!projected || !Number.isFinite(projected.x) || !Number.isFinite(projected.y)) continue;
      if (Math.hypot(projected.x - obj.x, projected.y - obj.y) < 1e-9) continue;
      scene.update(obj.id, { x: tidy(projected.x), y: tidy(projected.y) });
      moved = true;
    }
    if (!moved) break;
  }
}

export type TransformKind = 'rigid' | 'similar' | 'affine';

/**
 * Noktalara bir dönüşüm uygular; üzerindeki noktalar taşıyıcıyla birlikte gider, diğer bağlı noktalar iz düşürülür,
 * canlı inşalar yeniden çözülür. Sonunda her nokta istenen konumda mı diye denetlenir; inşaya ya da kilide takılan
 * nokta varsa komut açıklamayla reddedilir. `lenient` içindeki kilitli noktalar taşıyıcıları üzerinde en yakın yere yerleşebilir.
 * Yerleşen (iz düşürülen) açık hedef noktaları döndürür.
 */
export function transformPoints(
  scene: CommandScene,
  ids: string[],
  map: (p: Point2D) => Point2D,
  o: { kind: TransformKind; cannot: string; lenient?: Set<string>; before?: Map<string, MathObject> },
): PointObject[] {
  const before = o.before ?? new Map(scene.objects.map(x => [x.id, x]));
  const moving = new Set(ids.filter(id => scene.get(id)?.type === 'point'));
  const carries = (host: MathObject) => {
    if (['segment', 'line', 'ray', 'polygon'].includes(host.type)) return true;
    if (host.type === 'circle' && !host.fixedRadius) return o.kind !== 'affine';
    if (host.type === 'arc' || host.type === 'sector') return o.kind !== 'affine';
    return o.kind === 'rigid';
  };
  for (let round = 0; round < 12; round++) {
    const hosts = new Set(scene.objects.filter(h => h.type !== 'point' && carries(h)
      && scene.definingPointIds(h).length > 0 && scene.definingPointIds(h).every(id => moving.has(id))).map(h => h.id));
    let added = false;
    for (const p of scene.points()) {
      if (p.onObjectId && !moving.has(p.id) && hosts.has(p.onObjectId) && !o.lenient?.has(p.id)) { moving.add(p.id); added = true; }
    }
    if (!added) break;
  }
  const intended = new Map<string, Point2D>();
  for (const id of moving) {
    const p = scene.point(id);
    const next = map({ x: p.x, y: p.y });
    if (!Number.isFinite(next.x) || !Number.isFinite(next.y)) fail('Yeni konum hesaplanamadı.');
    if (Math.max(Math.abs(next.x), Math.abs(next.y)) > 100000) fail('Koordinatlar −100000 ile 100000 arasında olmalı.');
    intended.set(id, next);
  }
  for (const [id, position] of intended) {
    if (scene.point(id).construction) continue;
    scene.update(id, { x: tidy(position.x), y: tidy(position.y) });
  }
  scene.resolve();
  reproject(scene, before);
  scene.resolve();
  const adjusted: PointObject[] = [];
  for (const [id, position] of intended) {
    const p = scene.point(id);
    if (Math.hypot(p.x - position.x, p.y - position.y) <= 1e-6) continue;
    if (p.construction) fail(`${p.label} noktası bir ${constructionName(p)} olduğu için ${o.cannot}. Bağlı olduğu noktaları değiştirin.`);
    if (p.onObjectId) {
      if (o.lenient?.has(id)) { adjusted.push(p); continue; }
      const host = scene.get(p.onObjectId);
      fail(`${p.label} noktası ${host ? describe(host) : 'bir nesne'} üzerine kilitli olduğu için ${o.cannot}. Önce “${p.label} noktasının kilidini aç” yazın.`);
    }
    fail(`${p.label} noktası istenen konuma getirilemedi.`);
  }
  return adjusted;
}

/** Nesnenin etiketinde sırayla geçen nokta kimlikleri (ör. çokgen köşeleri, [AB], ∠ABC, "A Merkezli Çember"). */
export function labelSequence(o: MathObject): string[] {
  switch (o.type) {
    case 'polygon': return o.pointIds;
    // "BCD yayı": ara nokta etikette ortadadır
    case 'measurement': return o.kind === 'arc' && o.throughPointId ? [o.pointIds[0], o.throughPointId, o.pointIds[1]] : o.pointIds;
    case 'segment': return [o.startPointId, o.endPointId];
    case 'line': return [o.point1Id, o.point2Id];
    case 'ray': return [o.startPointId, o.throughPointId];
    case 'angle': return [o.point1Id, o.vertexPointId, o.point3Id];
    case 'circle': return o.throughPointIds?.length ? o.throughPointIds : [o.centerPointId];
    case 'ellipse': case 'sector': return [o.centerPointId];
    case 'arc': return [o.startPointId, o.directionPointId];
    default: return [];
  }
}

/** Kendiliğinden verilmiş etiketlerde nokta adlarını değiştirir: "ABC" → "PBC", "[AB]" → "[PB]", "A Merkezli Çember" → "P Merkezli Çember". */
export function replaceCanonical(label: string, oldSeq: string, newSeq: string): string | null {
  if (!oldSeq || oldSeq === newSeq) return null;
  if (label === oldSeq) return newSeq;
  for (const [open, close] of [['[', ']'], ['|', '|']]) if (label === `${open}${oldSeq}${close}`) return `${open}${newSeq}${close}`;
  if (label === `∠${oldSeq}`) return `∠${newSeq}`;
  if (label.startsWith(`${oldSeq} `)) return `${newSeq}${label.slice(oldSeq.length)}`;
  return null;
}

export function centroid(points: Point2D[]): Point2D {
  if (!points.length) return { x: 0, y: 0 };
  return { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length };
}

/** Taşıma için nesnenin başvuru noktası ve adı: nokta, merkez ya da köşelerin ağırlık merkezi. */
export function referencePoint(scene: CommandScene, o: MathObject): { at: Point2D; kind: 'point' | 'center' | 'centroid' | 'position' } | null {
  switch (o.type) {
    case 'point': return { at: { x: o.x, y: o.y }, kind: 'point' };
    case 'circle': case 'arc': case 'sector': { const g = scene.circleOf(o); return g ? { at: g.center, kind: 'center' } : null; }
    case 'ellipse': return { at: scene.pos(o.centerPointId), kind: 'center' };
    case 'text': case 'fraction': case 'image': case 'checkbox': case 'button': case 'input_box': return { at: { x: o.x, y: o.y }, kind: 'position' };
    case 'slider': return o.x !== undefined && o.y !== undefined ? { at: { x: o.x, y: o.y }, kind: 'position' } : null;
    case 'pen': return { at: centroid(o.points), kind: 'centroid' };
    case 'function': return null;
    default: return { at: centroid(scene.definingPointIds(o).map(id => scene.pos(id))), kind: 'centroid' };
  }
}
