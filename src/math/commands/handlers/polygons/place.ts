import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import type { Point2D, PointObject, PolygonObject } from '@/types/math';
import { type CommandScene, fail, trNum } from '../../scene';
import { signedArea } from './analyze';

export type PolyKind = 'polygon' | 'triangle' | 'square' | 'rectangle' | 'regular';

/** Araçlardaki köşe renkleri */
export const VERTEX_COLORS = { square: NESNE_RENGI.mavi, rectangle: NESNE_RENGI.mavi, regular: NESNE_RENGI.zumrut } as const;

export interface ShapePlan {
  /** İletilerde kullanılan Türkçe ad ("üçgen", "kare") */
  noun: string;
  /** Saat yönünün tersine sıralı yerel köşeler */
  local: Point2D[];
  /** İstenen köşe adları (eksikler otomatik verilir) */
  names?: (string | undefined)[];
  kind: PolyKind;
  pointColor?: string;
  label?: string;
  color?: string;
  /** Ölçüler varsayılan mı? (var olan noktalara uydurmak için ölçeklenebilir) */
  scalable: boolean;
  edgeLabels?: number[];
  /** Yerel (0,0) bu konuma gelir (merkez verildiğinde) */
  origin?: Point2D;
  /** index. köşe bu konuma gelir */
  vertexAt?: { index: number; at: Point2D };
  /** Otomatik yerleşimde ilk köşe 0,5'lik ızgaraya otursun */
  snap?: boolean;
  /** Otomatik yerleşimde yerel (0,0) boş alanın merkezine gelsin (düzgün çokgen) */
  originCentered?: boolean;
}

export interface Realized {
  polygon: PolygonObject;
  points: PointObject[];
  created: PointObject[];
  reused: PointObject[];
  /** Var olan noktalara uydurmak için uygulanan ölçek */
  scale: number;
  /** Aynı köşelerle çokgen zaten vardı */
  existed: boolean;
  /** Verilen sırayla kenarlar kesiştiği için köşeler yeniden sıralandı */
  reordered?: { from: string; to: string };
}

const sub = (a: Point2D, b: Point2D) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point2D, b: Point2D) => ({ x: a.x + b.x, y: a.y + b.y });
const len = (v: Point2D) => Math.hypot(v.x, v.y);
const rotate = (v: Point2D, angle: number) => ({ x: v.x * Math.cos(angle) - v.y * Math.sin(angle), y: v.x * Math.sin(angle) + v.y * Math.cos(angle) });

export function bounds(points: Point2D[]) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

// ---------------------------------------------------------------------------
// Basit (kenarları kesişmeyen) çokgen denetimi
// ---------------------------------------------------------------------------

const EPS = 1e-9;
function orient(p: Point2D, q: Point2D, r: Point2D): number {
  const v = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return Math.abs(v) < EPS ? 0 : Math.sign(v);
}
const within = (p: Point2D, q: Point2D, r: Point2D) =>
  Math.min(p.x, q.x) - EPS <= r.x && r.x <= Math.max(p.x, q.x) + EPS && Math.min(p.y, q.y) - EPS <= r.y && r.y <= Math.max(p.y, q.y) + EPS;
function segmentsMeet(a: Point2D, b: Point2D, c: Point2D, d: Point2D): boolean {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  return (o1 === 0 && within(a, b, c)) || (o2 === 0 && within(a, b, d)) || (o3 === 0 && within(c, d, a)) || (o4 === 0 && within(c, d, b));
}

/** Komşu olmayan iki kenar kesişiyor ya da birbirine değiyor mu? */
export function selfIntersects(points: Point2D[]): boolean {
  const n = points.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segmentsMeet(points[i], points[i + 1], points[j], points[(j + 1) % n])) return true;
  }
  return false;
}

/** Bütün noktalar aynı doğru üzerinde mi? */
export function allCollinear(points: Point2D[]): boolean {
  const a = points[0];
  const b = points.find(p => len(sub(p, a)) > EPS);
  if (!b) return true;
  const scale = Math.max(1, ...points.map(p => len(sub(p, a))));
  return points.every(p => Math.abs((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) < 1e-9 * scale * scale);
}

/**
 * Verilen sırayla kenarlar kesişiyorsa kesişmeyen bir sıra (dizin listesi) döndürür: köşeler ağırlık merkezi etrafında
 * açıya göre dizilir, ilk köşe başta kalır. Sıra zaten uygunsa ya da düzeltilemiyorsa undefined.
 */
export function untangle(points: Point2D[]): number[] | undefined {
  const n = points.length;
  if (n < 4 || allCollinear(points) || !selfIntersects(points)) return undefined;
  const cx = points.reduce((s, p) => s + p.x, 0) / n, cy = points.reduce((s, p) => s + p.y, 0) / n;
  const order = points.map((p, i) => ({ i, a: Math.atan2(p.y - cy, p.x - cx), d: Math.hypot(p.x - cx, p.y - cy) }))
    .sort((u, v) => u.a - v.a || u.d - v.d).map(x => x.i);
  const k = order.indexOf(0);
  const rotated = [...order.slice(k), ...order.slice(0, k)];
  const world = rotated.map(i => points[i]);
  return selfIntersects(world) || Math.abs(signedArea(world)) < EPS ? undefined : rotated;
}

function checkShape(world: Point2D[], noun: string) {
  for (let i = 0; i < world.length; i++) for (let j = i + 1; j < world.length; j++) {
    if (len(sub(world[i], world[j])) < EPS) fail(`İki köşe aynı konumda; ${noun} oluşturulamaz.`);
  }
  if (allCollinear(world)) fail(`Köşeler aynı doğru üzerinde; ${noun} oluşmaz.`);
  if (selfIntersects(world)) fail(`Köşeler bu sırayla birleştirilince kenarlar kesişiyor ve kesişmeyen bir sıra bulunamadı; ${noun} oluşmaz. Köşeleri şeklin çevresi boyunca sırayla yazın.`);
  if (Math.abs(signedArea(world)) < EPS) fail(`Bu köşelerle alanı olmayan bir ${noun} oluşur; köşelerin yerini değiştirin.`);
}

function autoLabels(scene: CommandScene, count: number, reserved: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) result.push(scene.nextPointLabel([...reserved, ...result]));
  return result;
}

function finish(scene: CommandScene, plan: Pick<ShapePlan, 'kind' | 'label' | 'color' | 'edgeLabels'>, points: PointObject[], created: PointObject[], reused: PointObject[], scale: number, order?: number[]): Realized {
  let reordered: Realized['reordered'];
  if (order) {
    const from = names(points);
    points = order.map(i => points[i]);
    reordered = { from, to: names(points) };
  }
  const before = scene.shapesWithPoints(points.map(p => p.id), ['polygon'])[0] as PolygonObject | undefined;
  const polygon = before ?? scene.addPolygon(points.map(p => p.id), {
    kind: plan.kind, label: plan.label, ...(plan.color ? { color: plan.color, fillColor: plan.color } : {}), ...(plan.edgeLabels ? { edgeLabels: plan.edgeLabels } : {}),
  });
  return { polygon, points, created, reused, scale, existed: !!before, ...(reordered ? { reordered } : {}) };
}

/**
 * Yerel koordinatlarla tanımlı şekli sahneye yerleştirir.
 * Adı verilen köşeler sahnede varsa şekil onlara oturtulur (iki nokta varsa döndürülür; ölçüler varsayılansa ölçeklenir).
 */
export function realize(scene: CommandScene, plan: ShapePlan): Realized {
  const n = plan.local.length;
  const names = plan.names ?? [];
  if (names.length > n) fail(`${plan.noun} için ${n} köşe adı yazın; ${names.length} ad verildi.`);
  const cleanNames = names.filter((x): x is string => !!x);
  if (new Set(cleanNames.map(x => x.toLocaleUpperCase('tr'))).size !== cleanNames.length) fail(`Köşe adları birbirinden farklı olmalı (${cleanNames.join(', ')}).`);
  const existing = plan.local.map((_, i) => names[i] ? scene.findPoint(names[i]!) : undefined);
  const known = existing.map((p, i) => p ? i : -1).filter(i => i >= 0);
  let world: Point2D[];
  let scale = 1;
  let order: number[] | undefined;

  if (known.length === n && plan.scalable) {
    world = existing.map(p => ({ x: p!.x, y: p!.y }));
    order = untangle(world);
  } else if (known.length >= 2) {
    const [i, j] = known;
    const pi = existing[i]!, pj = existing[j]!;
    const v = sub(plan.local[j], plan.local[i]), w = sub(pj, pi);
    if (len(w) < 1e-9) fail(`${pi.label} ve ${pj.label} aynı konumda; ${plan.noun} çizilemez.`);
    scale = len(w) / len(v);
    if (!plan.scalable && Math.abs(scale - 1) > 1e-6) {
      fail(`${pi.label}${pj.label} uzunluğu ${trNum(len(w))}, ama istenen ${plan.noun} için ${trNum(len(v))} olmalı. Ölçüyü noktalara uygun yazın ya da yeni köşe adları kullanın.`);
    }
    const angle = Math.atan2(w.y, w.x) - Math.atan2(v.y, v.x);
    world = plan.local.map(p => add(pi, rotate({ x: (p.x - plan.local[i].x) * scale, y: (p.y - plan.local[i].y) * scale }, angle)));
    for (const k of known.slice(2)) {
      if (len(sub(world[k], existing[k]!)) > 1e-6) {
        fail(`${existing[k]!.label} noktası bu ${plan.noun} ile uyuşmuyor. Köşeleri ${known.map(x => existing[x]!.label).join(', ')} olan bir ${plan.noun} için noktaların yerini değiştirin ya da farklı adlar kullanın.`);
      }
    }
  } else if (known.length === 1) {
    const i = known[0];
    world = plan.local.map(p => add(existing[i]!, sub(p, plan.local[i])));
  } else if (plan.vertexAt) {
    const { index, at } = plan.vertexAt;
    world = plan.local.map(p => add(at, sub(p, plan.local[index])));
  } else if (plan.origin) {
    world = plan.local.map(p => add(plan.origin!, p));
  } else {
    const b = bounds(plan.local);
    const spot = scene.placeShape(b.maxX - b.minX, b.maxY - b.minY);
    if (plan.originCentered) {
      world = plan.local.map(p => add(spot, p));
    } else {
      const shift = { x: spot.x - (b.minX + b.maxX) / 2, y: spot.y - (b.minY + b.maxY) / 2 };
      world = plan.local.map(p => add(p, shift));
      if (plan.snap) {
        const first = world[0];
        const fix = { x: Math.round(first.x * 2) / 2 - first.x, y: Math.round(first.y * 2) / 2 - first.y };
        world = world.map(p => add(p, fix));
      }
    }
  }

  checkShape(order ? order.map(i => world[i]) : world, plan.noun);
  const missing = existing.filter(p => !p).length;
  const autos = autoLabels(scene, missing, cleanNames);
  const points: PointObject[] = [], created: PointObject[] = [], reused: PointObject[] = [];
  let auto = 0;
  plan.local.forEach((_, i) => {
    if (existing[i]) { points.push(existing[i]!); reused.push(existing[i]!); return; }
    const p = scene.addPoint(world[i], { label: names[i] ?? autos[auto++], ...(plan.pointColor ? { color: plan.pointColor } : {}) });
    points.push(p);
    created.push(p);
  });
  return finish(scene, plan, points, created, reused, scale, order);
}

export interface VertexSpec { at: Point2D; name?: string }

/** Koordinatları verilen köşelerden çokgen: aynı ad ve konumdaki noktalar yeniden kullanılır. */
export function fromCoordinates(scene: CommandScene, vertices: VertexSpec[], plan: Pick<ShapePlan, 'noun' | 'kind' | 'label' | 'color' | 'pointColor' | 'edgeLabels'>): Realized {
  const order = untangle(vertices.map(v => v.at));
  checkShape((order ?? vertices.map((_, i) => i)).map(i => vertices[i].at), plan.noun);
  const reserved = vertices.map(v => v.name).filter((x): x is string => !!x);
  if (new Set(reserved.map(x => x.toLocaleUpperCase('tr'))).size !== reserved.length) fail(`Köşe adları birbirinden farklı olmalı (${reserved.join(', ')}).`);
  const points: PointObject[] = [], created: PointObject[] = [], reused: PointObject[] = [];
  const used: string[] = [];
  for (const v of vertices) {
    if (v.name) {
      const same = scene.findPoint(v.name);
      if (same) {
        if (Math.hypot(same.x - v.at.x, same.y - v.at.y) > 1e-9) {
          fail(`${same.label} noktası zaten (${trNum(same.x)}; ${trNum(same.y)}) konumunda. Başka bir ad kullanın ya da önce ${same.label} noktasını taşıyın.`);
        }
        points.push(same); reused.push(same); continue;
      }
      const p = scene.addPoint(v.at, { label: v.name, ...(plan.pointColor ? { color: plan.pointColor } : {}) });
      points.push(p); created.push(p); continue;
    }
    const there = scene.points().find(p => Math.hypot(p.x - v.at.x, p.y - v.at.y) < 1e-9 && !points.includes(p));
    if (there) { points.push(there); reused.push(there); continue; }
    const label = scene.nextPointLabel([...reserved, ...used]);
    used.push(label);
    const p = scene.addPoint(v.at, { label, ...(plan.pointColor ? { color: plan.pointColor } : {}) });
    points.push(p); created.push(p);
  }
  return finish(scene, plan, points, created, reused, 1, order);
}

/** Sahnedeki noktaları sırayla birleştirir (kenarlar kesişirse kesişmeyen sıraya dizer). */
export function fromPoints(scene: CommandScene, points: PointObject[], plan: Pick<ShapePlan, 'noun' | 'kind' | 'label' | 'color' | 'edgeLabels'>): Realized {
  if (new Set(points.map(p => p.id)).size !== points.length) fail(`${plan.noun} için farklı noktalar gerekir.`);
  if (points.length >= 3 && allCollinear(points)) {
    fail(`${points.map(p => p.label).join(', ')} noktaları aynı doğru üzerinde; bu noktalardan ${plan.noun} oluşmaz. Noktalardan birini taşıyın ya da başka noktalar seçin.`);
  }
  const order = untangle(points);
  checkShape((order ?? points.map((_, i) => i)).map(i => ({ x: points[i].x, y: points[i].y })), plan.noun);
  return finish(scene, plan, points, [], [...points], 1, order);
}

export const names = (points: PointObject[]) => points.map(p => p.label).join('');

/** Oluşturma iletisinin ek bilgisi: yeniden sıralama ve "A ve B noktaları kullanıldı; C eklendi" */
export function vertexNote(result: Realized): string {
  const order = result.reordered
    ? ` Köşeler ${result.reordered.from} sırasıyla birleştirilince kenarlar kesişiyordu; kenarları kesişmeyen ${result.reordered.to} sırasıyla birleştirildi.`
    : '';
  if (!result.reused.length || !result.created.length) return order;
  return `${order} ${result.reused.map(p => p.label).join(', ')} ${result.reused.length > 1 ? 'noktaları' : 'noktası'} kullanıldı; ${result.created.map(p => p.label).join(', ')} eklendi.`;
}
