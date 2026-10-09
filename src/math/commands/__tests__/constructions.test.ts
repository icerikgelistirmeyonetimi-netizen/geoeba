import { describe, expect, it } from 'vitest';
import type { CircleObject, LineObject, MathObject, PointObject, PolygonObject, RayObject, SegmentObject, SliderObject } from '@/types/math';
import { collectDependentIds } from '@/state/WorkspaceContext';
import { resolveCommandBindings } from '../../commandBindings';
import { handlers } from '../handlers/constructions';
import { rankHandlers } from '../engine';
import { COLORS, CommandScene } from '../scene';
import { parseClause } from '../text';
import { build, byLabel, byType, dist, expectFail, expectOk, point, runWith } from './helpers';

const ok = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectOk(handlers, text, scene, selection);
const bad = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectFail(handlers, text, scene, selection);

type Pts = Record<string, [number, number]>;
const withPoints = (spec: Pts, extra?: (s: CommandScene, p: Record<string, PointObject>) => void) => build(s => {
  const p: Record<string, PointObject> = {};
  for (const [label, [x, y]] of Object.entries(spec)) p[label] = s.addPoint({ x, y }, { label });
  extra?.(s, p);
});

const S = {
  tri: () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); }),
  tri345: () => withPoints({ A: [-1.5, -1], B: [1.5, -1], C: [1.5, 3] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); }),
  lines: () => withPoints({ A: [0, 3], B: [-2, 0], C: [4, 0], D: [1, 5] }, (s, p) => { s.addLine(p.B.id, p.C.id, { label: 'd' }); s.addSegment(p.A.id, p.B.id); }),
  seg: () => withPoints({ A: [0, 0], B: [6, 0] }, (s, p) => { s.addSegment(p.A.id, p.B.id); }),
  angle: () => withPoints({ A: [4, 0], B: [0, 0], C: [0, 4] }),
  points3: () => withPoints({ A: [0, 0], B: [6, 0], C: [0, 6] }),
  square: () => withPoints({ A: [0, 0], B: [4, 0], C: [4, 4], D: [0, 4] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id, p.D.id], { kind: 'square' }); }),
  circle: () => withPoints({ M: [0, 0], P: [4, 0], Q: [0, -5], T: [0, 2], B: [-3, 1], C: [3, 1] }, (s, p) => {
    s.addCircle({ centerId: p.M.id, radius: 2 }, { label: 'c1' });
    s.addLine(p.B.id, p.C.id);
  }),
  twoCircles: () => withPoints({ M: [0, 0], N: [3, 0] }, (s, p) => { s.addCircle({ centerId: p.M.id, radius: 2 }); s.addCircle({ centerId: p.N.id, radius: 2 }); }),
  cross: () => withPoints({ A: [0, 0], B: [4, 4], C: [0, 4], D: [4, 0] }, (s, p) => { s.addLine(p.A.id, p.B.id); s.addLine(p.C.id, p.D.id); }),
  tangentLine: () => withPoints({ K: [0, 3], A: [-2, 0], B: [4, 0] }),
  bound: () => ok('Üçgen uzunluklarını kaydırıcıya bağla', S.tri345()).objects,
  bisectors: () => ok('C köşesinin açıortayını çiz', ok("AB'nin orta dikmesini çiz", S.tri()).objects).objects,
  fg: () => build(s => { s.addFunction('x^2'); s.addFunction('x + 2', { label: 'g(x) = x + 2' }); }),
  parabola: () => build(s => { s.addFunction('x^2 - 4'); }),
};

const move = (objects: MathObject[], label: string, x: number, y: number) =>
  resolveCommandBindings(objects.map(o => o.type === 'point' && o.label === label ? { ...o, x, y } as MathObject : o));
const byId = <T extends MathObject>(objects: MathObject[], id: string) => objects.find(o => o.id === id) as T;
const dot = (u: { x: number; y: number }, v: { x: number; y: number }) => u.x * v.x + u.y * v.y;
const vec = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: b.x - a.x, y: b.y - a.y });
const cross = (u: { x: number; y: number }, v: { x: number; y: number }) => u.x * v.y - u.y * v.x;
const constructed = (objects: MathObject[], kind: string) => objects.filter((o): o is PointObject => o.type === 'point' && o.construction?.kind === kind);
const created = (before: MathObject[], after: MathObject[]) => after.filter(o => !before.some(b => b.id === o.id));
const angleAt = (v: { x: number; y: number }, p: { x: number; y: number }, q: { x: number; y: number }) => {
  const a = vec(v, p), b = vec(v, q);
  return Math.acos(dot(a, b) / Math.hypot(a.x, a.y) / Math.hypot(b.x, b.y));
};
const lineDistance = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(cross(vec(a, b), vec(a, p))) / dist(a, b);

// ------------------------------------------------------------------------------------------------ örneklerin tamamı

const EXAMPLE_SCENES: Record<string, [() => MathObject[], ((o: MathObject[]) => string[])?]> = {
  "A'dan BC'ye dik doğru çiz": [S.lines],
  'd doğrusuna A noktasından paralel çiz': [S.lines],
  "AB'ye C'den geçen paralel doğru çiz": [S.lines],
  'A noktasından geçen ve BC doğrusuna paralel doğru çiz': [S.lines],
  'AB doğrusuna B noktasında dik doğru çiz': [S.lines],
  "(1; 2) noktasından AB'ye paralel doğru çiz": [S.lines],
  'C noktasından [AB] doğru parçasına dik doğru çizer misin': [S.lines],
  'C noktasından dik indir': [S.tri345],
  "B'den AC'ye dikme indir": [S.tri],
  'C köşesinden yükseklik çiz': [S.tri],
  'üçgenin tüm yüksekliklerini çiz': [S.tri],
  'BC kenarına ait yüksekliği çiz': [S.tri],
  'A noktasının BC doğrusu üzerindeki izdüşümünü bul': [S.tri],
  "B'den tabana yükseklik çek": [S.tri],
  "AB'nin orta dikmesini çiz": [S.seg],
  '[AB] doğru parçasının orta dikmesi': [S.seg],
  'A ile B noktalarının orta dikmesini çiz': [S.seg],
  'üçgenin kenar orta dikmelerini çiz': [S.tri],
  'ABC açısının açıortayını çiz': [S.angle],
  'B köşesinin açıortayını çiz': [S.tri],
  'üçgenin açıortaylarını çiz': [S.tri],
  'ABC üçgeninin B köşesindeki açıortayı': [S.tri],
  "A'dan açıortay çiz": [S.tri],
  'ABC açısının dış açıortayını çiz': [S.angle],
  'ABC açısını ikiye bölen ışını çiz': [S.angle],
  "A'dan kenarortay çiz": [S.tri],
  'üçgenin kenarortaylarını çiz': [S.tri],
  'BC kenarına ait kenarortayı çiz': [S.tri],
  'ABC üçgeninde B köşesinden kenarortay çiz': [S.tri],
  'AB orta noktasını oluştur': [S.seg],
  "AB'nin orta noktasını bul": [S.seg],
  "[AB]'nin orta noktası M olsun": [S.seg],
  "A ile B'nin ortasını bul": [S.seg],
  'ABC üçgeninin kenar orta noktalarını oluştur': [S.tri],
  'üçgenin kenar orta noktalarını birleştir': [S.tri],
  'doğru parçasının orta noktasını işaretle': [S.seg],
  "AB'yi 2:1 oranında böl": [S.seg],
  "AB'yi 3 eşit parçaya böl": [S.seg],
  "[AB] doğru parçasını 2'ye 3 oranında bölen P noktasını bul": [S.seg],
  'AB doğru parçasını dıştan 3:1 oranında böl': [S.seg],
  'AB yi dört eşit parçaya ayır': [S.seg],
  'ağırlık merkezini bul': [S.tri],
  'ABC üçgeninin diklik merkezini oluştur': [S.tri],
  'çevrel çemberin merkezini bul': [S.tri],
  'iç teğet çemberin merkezini işaretle': [S.tri],
  'kenarortayların kesişim noktasını bul': [S.tri],
  'A, B ve C noktalarının ağırlık merkezi': [S.points3],
  'AB ve CD doğrularının kesişim noktasını bul': [S.cross],
  'c1 ile BC doğrusunun kesişimi': [S.circle],
  'iki çemberin kesişim noktalarını bul': [S.twoCircles],
  'çember ile doğrunun kesişim noktalarını işaretle': [S.circle],
  'M merkezli çember ile BC doğrusunu kesiştir': [S.circle],
  'seçili iki nesnenin kesişim noktalarını oluştur': [S.cross, o => byType(o, 'line').map(l => l.id)],
  'orta dikme ile açıortayın kesişim noktasını bul': [S.bisectors],
  'f ve g fonksiyonlarının kesişim noktalarını bul': [S.fg],
  'f nin x eksenini kestiği noktaları bul': [S.parabola],
  'karenin köşegenlerini çiz': [S.square],
  'ABCD dörtgeninin köşegenlerini çiz': [S.square],
  'köşegenlerin kesişim noktasını bul': [S.square],
  'P noktasından çembere teğet doğru çiz': [S.circle],
  "P'den çembere teğetleri çiz": [S.circle],
  'T noktasında çembere teğet çiz': [S.circle],
  'c1 çemberine Q noktasından teğet çiz': [S.circle],
  "ABC'nin çevrel çemberini çiz": [S.tri],
  'üçgenin çevrel çemberini merkeziyle birlikte çiz': [S.tri],
  'karenin çevrel çemberini çiz': [S.square],
  'iç teğet çemberini çiz': [S.tri],
  'ABC üçgeninin iç teğet çemberini çiz': [S.tri],
  'A merkezli BC doğrusuna teğet çember çiz': [S.lines],
  "merkezi K olan ve AB'ye teğet olan çemberi çiz": [S.tangentLine],
  'Üçgen uzunluklarını kaydırıcıya bağla': [S.tri345],
  'ABC Üçgen uzunluklarını kaydırıcıya bağla': [S.tri345],
  'üçgenin kenarlarını kaydırıcılara bağla': [S.tri345],
  'üçgenin kaydırıcı bağını kaldır': [S.bound],
  'ABC üçgeninin kaydırıcı bağlantısını çöz': [S.bound],
};

describe('constructions: every example runs', () => {
  const examples = [...new Set(handlers.flatMap(h => h.examples))];
  it('covers every example with a scene', () => {
    expect(examples.filter(e => !(e in EXAMPLE_SCENES))).toEqual([]);
    expect(handlers.every(h => h.examples.length >= 2 && h.examples.length <= 20)).toBe(true);
  });
  it.each(examples)('%s', example => {
    const [scene, selection] = EXAMPLE_SCENES[example];
    const objects = scene();
    const result = ok(example, objects, selection?.(objects) ?? []);
    expect(result.sceneChanged).toBe(true);
    expect(result.message.length).toBeGreaterThan(10);
    expect(result.selectedIds.length).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------------------------------------------ eski davranış

describe('legacy behaviour', () => {
  it('drops a live perpendicular from C on a 3-4-5 triangle', () => {
    const scene = S.tri345();
    const r = ok('C noktasından dik indir', scene);
    const h = constructed(r.objects, 'foot')[0];
    expect(h.construction).toMatchObject({ kind: 'foot', sourceId: point(r.objects, 'C').id });
    expect(h.y).toBeCloseTo(point(r.objects, 'A').y, 9);
    const seg = byType(r.objects, 'segment')[0];
    expect([seg.startPointId, seg.endPointId]).toEqual([point(r.objects, 'C').id, h.id]);
    const moved = move(r.objects, 'C', 4, 3);
    expect(byId<PointObject>(moved, h.id).x).toBeCloseTo(4, 9);
    expect(ok('B noktasından dik indir', scene).objects.some(o => o.type === 'point' && o.construction?.kind === 'foot')).toBe(true);
  });

  it('binds triangle sides to sliders and recomputes dependent constructions', () => {
    const altitude = ok('C noktasından dik indir', S.tri345());
    const r = ok('üçgen uzunluklarını kaydırıcıya bağla', altitude.objects);
    const sliders = byType(r.objects, 'slider');
    expect(sliders.map(s => s.variableName)).toEqual(['ab', 'bc', 'ca']);
    expect(sliders.map(s => s.value)).toEqual([3, 4, 5]);
    for (const s of sliders) expect([s.min, s.max, s.step]).toEqual([0.1, Math.max(10, 3 * s.value), 0.1]);
    expect(sliders[2].max).toBe(15);
    expect(point(r.objects, 'B').construction).toMatchObject({ kind: 'triangleVertex', vertex: 1, anchorId: point(r.objects, 'A').id });
    expect(point(r.objects, 'C').construction).toMatchObject({ kind: 'triangleVertex', vertex: 2 });
    expect(point(r.objects, 'B').isIndependent).toBe(false);
    const polygon = byType(r.objects, 'polygon')[0];
    expect(polygon.edgeLabels).toEqual([0, 1, 2]);
    expect(point(r.objects, 'C').x).toBeCloseTo(1.5, 9);
    expect(point(r.objects, 'C').y).toBeCloseTo(3, 9);
    const next = resolveCommandBindings(r.objects.map(o => o.id === sliders[0].id ? { ...o, value: 4 } as MathObject : o));
    expect(dist(point(next, 'A'), point(next, 'B'))).toBeCloseTo(4, 9);
    expect(dist(point(next, 'B'), point(next, 'C'))).toBeCloseTo(4, 9);
    expect(dist(point(next, 'C'), point(next, 'A'))).toBeCloseTo(5, 9);
    const foot = constructed(next, 'foot')[0];
    expect(lineDistance(foot, point(next, 'A'), point(next, 'B'))).toBeCloseTo(0, 9);
    expect(() => resolveCommandBindings(r.objects.map(o => o.id === sliders[0].id ? { ...o, value: 20 } as MathObject : o))).toThrow('üçgen');
    expect(collectDependentIds(r.objects, [sliders[0].id]).has(polygon.id)).toBe(true);
    const reloaded = resolveCommandBindings(JSON.parse(JSON.stringify(next)));
    expect(point(reloaded, 'C')).toEqual(point(next, 'C'));
  });

  it('unbinds sliders without moving the vertices', () => {
    const bound = S.bound();
    const shifted = resolveCommandBindings(bound.map(o => o.type === 'slider' && o.variableName === 'ab' ? { ...o, value: 4 } as MathObject : o));
    const r = ok('üçgenin kaydırıcı bağını kaldır', shifted);
    expect(point(r.objects, 'B').construction).toBeUndefined();
    expect(point(r.objects, 'C').construction).toBeUndefined();
    expect(point(r.objects, 'B').isIndependent).toBe(true);
    expect(point(r.objects, 'B').x).toBe(point(shifted, 'B').x);
    expect(point(r.objects, 'C').y).toBe(point(shifted, 'C').y);
    expect(byType(r.objects, 'slider')).toHaveLength(3);
    expect(bad('üçgenin kaydırıcı bağını kaldır', S.tri345())).toContain('bağlı');
    expect(bad('Üçgen uzunluklarını kaydırıcıya bağla', bound)).toContain('zaten');
  });

  it('requires a tangent source and builds two orthogonal tangents from outside', () => {
    const circle = withPoints({ A: [0, 0] }, (s, p) => { s.addCircle({ centerId: p.A.id, radius: 2 }); });
    expect(bad('çembere teyet doğru çiz', circle)).toContain('hangi noktadan');
    const outside = build(s => { s.addPoint({ x: 4, y: 0 }, { label: 'P' }); }, circle);
    const r = ok('P noktasından çembere teğet doğru çiz', outside);
    const p = point(r.objects, 'P'), center = point(r.objects, 'A');
    const contacts = constructed(r.objects, 'tangent');
    expect(contacts).toHaveLength(2);
    expect(byType(r.objects, 'line')).toHaveLength(2);
    for (const q of contacts) {
      expect(dist(center, q)).toBeCloseTo(2, 9);
      expect(dot(vec(q, p), vec(center, q))).toBeCloseTo(0, 9);
    }
    expect(r.selectedIds.sort()).toEqual(byType(r.objects, 'line').map(l => l.id).sort());
    const moved = move(r.objects, 'P', 0, 5);
    for (const q of constructed(moved, 'tangent')) {
      expect(dist(point(moved, 'A'), q)).toBeCloseTo(2, 9);
      expect(dot(vec(q, point(moved, 'P')), vec(point(moved, 'A'), q))).toBeCloseTo(0, 9);
    }
  });

  it('draws one tangent on the circle and rejects interior points', () => {
    const scene = withPoints({ A: [0, 0], P: [2, 0] }, (s, p) => { s.addCircle({ centerId: p.A.id, radius: 2 }); });
    const r = ok('P noktasından çembere teğet çiz', scene);
    expect(byType(r.objects, 'line')).toHaveLength(1);
    const q = constructed(r.objects, 'tangent')[0];
    expect(q.construction).toMatchObject({ direction: true, branch: 1 });
    expect(dot(vec(point(r.objects, 'P'), q), vec(point(r.objects, 'A'), point(r.objects, 'P')))).toBeCloseTo(0, 9);
    expect(bad('A noktasından çembere teğet çiz', scene)).toContain('içinde');
  });

  it('resolves tangents to a circle defined by three points', () => {
    const scene = withPoints({ A: [2, 0], B: [0, 2], C: [-2, 0], P: [4, 0] });
    scene.push({ id: 'circle', type: 'circle', label: 'c1', visible: true, showLabel: true, color: '#2563eb', createdAt: 1, centerPointId: 'unused', throughPointIds: ['A', 'B', 'C'].map(n => point(scene, n).id) } as CircleObject);
    const r = ok('P noktasından çembere teğet çiz', scene);
    const contacts = constructed(r.objects, 'tangent');
    expect(contacts).toHaveLength(2);
    for (const q of contacts) expect(Math.hypot(q.x, q.y)).toBeCloseTo(2, 9);
  });

  it('creates a live midpoint', () => {
    const scene = withPoints({ A: [0, 0], B: [4, 2] });
    const r = ok('AB orta noktasını oluştur', scene);
    const m = constructed(r.objects, 'midpoint')[0];
    expect([m.x, m.y]).toEqual([2, 1]);
    expect(m.isIndependent).toBe(false);
    expect(m.color).toBe(COLORS.construction);
    const moved = move(r.objects, 'B', 8, -4);
    expect([byId<PointObject>(moved, m.id).x, byId<PointObject>(moved, m.id).y]).toEqual([4, -2]);
    expect(collectDependentIds(r.objects, [point(r.objects, 'B').id]).has(m.id)).toBe(true);
  });
});

// ------------------------------------------------------------------------------------------------ paralel / dik

describe('parallel and perpendicular lines', () => {
  it.each([
    ["A'dan BC'ye dik doğru çiz", 'perpendicular', 'A', ['B', 'C']],
    ['A noktasından BC doğrusuna dik doğru çiz', 'perpendicular', 'A', ['B', 'C']],
    ['BC doğrusuna A noktasından dik doğru oluşturalım', 'perpendicular', 'A', ['B', 'C']],
    ['d doğrusuna A noktasından paralel çiz', 'parallel', 'A', ['B', 'C']],
    ["AB'ye C'den geçen paralel doğru çiz", 'parallel', 'C', ['A', 'B']],
    ['A noktasından geçen ve BC doğrusuna paralel doğru çiz', 'parallel', 'A', ['B', 'C']],
    ["lütfen D'den [AB]'ye paralel bir doğru çizer misin", 'parallel', 'D', ['A', 'B']],
    ['AB doğrusuna B noktasında dik doğru çiz', 'perpendicular', 'B', ['A', 'B']],
    ['A noktasından B C doğrusuna dik çiz', 'perpendicular', 'A', ['B', 'C']],
  ] as const)('%s', (text, mode, through, [l1, l2]) => {
    const scene = S.lines();
    const r = ok(text, scene);
    const line = created(scene, r.objects).find((o): o is LineObject => o.type === 'line')!;
    const helper = byId<PointObject>(r.objects, line.point2Id);
    expect(line.point1Id).toBe(point(r.objects, through).id);
    expect(helper.construction).toMatchObject({ kind: 'direction', mode });
    expect(line.color).toBe(COLORS.parallel);
    expect(line.label).toContain(mode === 'parallel' ? 'Paralel doğru' : 'Dik doğru');
    const check = (objects: MathObject[]) => {
      const u = vec(point(objects, through), byId<PointObject>(objects, helper.id));
      const v = vec(point(objects, l1), point(objects, l2));
      expect(mode === 'parallel' ? cross(u, v) : dot(u, v)).toBeCloseTo(0, 9);
    };
    check(r.objects);
    check(move(r.objects, l2, 7, 3));
    check(move(r.objects, through, -3, -4));
    expect(r.selectedIds).toEqual([line.id]);
  });

  it('creates the through point from coordinates and reuses an identical line', () => {
    const r = ok("(1; 2) noktasından AB'ye paralel doğru çiz", S.lines());
    const e = point(r.objects, 'E');
    expect([e.x, e.y]).toEqual([1, 2]);
    const again = ok("(1; 2) noktasından AB'ye paralel doğru çiz", r.objects);
    expect(again.objects).toHaveLength(r.objects.length);
    expect(again.message).toContain('zaten');
  });

  it('uses a selected point and applies a colour in the sentence', () => {
    const scene = S.lines();
    const r = ok("AB'ye dik doğru çiz", scene, [point(scene, 'D').id]);
    expect(byType(created(scene, r.objects), 'line')[0].point1Id).toBe(point(scene, 'D').id);
    const red = ok("A'dan BC'ye kırmızı renkte paralel doğru çiz", withPoints({ A: [0, 3], B: [-2, 0], C: [4, 0] }));
    expect(byType(red.objects, 'line')[0].color).toBe('#ef4444');
  });

  it.each([
    ["AB'ye dik doğru çiz", 'hangi noktadan'],
    ["A'dan AB'ye paralel doğru çiz", 'üzerinde'],
    ["Z'den AB'ye paralel doğru çiz", 'bulunamadı'],
  ])('fails: %s', (text, fragment) => {
    expect(bad(text, S.lines())).toContain(fragment);
  });
});

// ------------------------------------------------------------------------------------------------ dikme / yükseklik

describe('perpendicular feet and altitudes', () => {
  it.each([
    ["B'den AC'ye dikme indir", 'B', ['A', 'C']],
    ['C köşesinden yükseklik çiz', 'C', ['A', 'B']],
    ["C'den AB'ye dikme çiz", 'C', ['A', 'B']],
    ['BC kenarına ait yüksekliği çiz', 'A', ['B', 'C']],
    ["B'den tabana yükseklik çek", 'B', ['C', 'A']],
    ['abc üçgeninde a köşesinden yükseklik çizebilir misin', 'A', ['B', 'C']],
  ] as const)('%s', (text, from, [l1, l2]) => {
    const scene = S.tri();
    const r = ok(text, scene);
    const foot = constructed(r.objects, 'foot')[0];
    expect(foot.construction).toMatchObject({ sourceId: point(r.objects, from).id });
    const check = (objects: MathObject[]) => {
      const h = byId<PointObject>(objects, foot.id), p = point(objects, from);
      expect(dot(vec(h, p), vec(point(objects, l1), point(objects, l2)))).toBeCloseTo(0, 9);
      expect(lineDistance(h, point(objects, l1), point(objects, l2))).toBeCloseTo(0, 9);
    };
    check(r.objects);
    check(move(r.objects, from, 1, 7));
    const seg = byType(created(scene, r.objects), 'segment')[0];
    expect([seg.startPointId, seg.endPointId]).toEqual([point(r.objects, from).id, foot.id]);
    expect(r.message).toContain('ayak');
  });

  it('draws all three altitudes, which meet at the orthocenter', () => {
    const r = ok('üçgenin tüm yüksekliklerini çiz', S.tri());
    expect(constructed(r.objects, 'foot')).toHaveLength(3);
    expect(byType(r.objects, 'segment')).toHaveLength(3);
    const h = ok('diklik merkezini bul', r.objects);
    const orthocenter = point(h.objects, 'H');
    for (const seg of byType(h.objects, 'segment')) {
      expect(lineDistance(orthocenter, byId<PointObject>(h.objects, seg.startPointId), byId<PointObject>(h.objects, seg.endPointId))).toBeCloseTo(0, 9);
    }
  });

  it('projects without a segment and reports a foot on the extension', () => {
    const scene = S.tri();
    const r = ok('A noktasının BC doğrusu üzerindeki izdüşümünü bul', scene);
    expect(byType(r.objects, 'segment')).toHaveLength(0);
    expect(r.selectedIds).toEqual([constructed(r.objects, 'foot')[0].id]);
    const obtuse = withPoints({ A: [0, 0], B: [4, 0], C: [6, 3] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id]); });
    expect(ok('C köşesinden yükseklik çiz', obtuse).message).toContain('uzantısında');
  });

  it.each([
    ['yükseklik çiz', 'hangi köşeden'],
    ['C noktasından dik indir', 'üçgen yok'],
    ["A'dan AB'ye dikme indir", 'üzerinde'],
  ])('fails: %s', (text, fragment) => {
    const scene = text.startsWith('C noktası') ? S.angle() : S.tri();
    expect(bad(text, scene)).toContain(fragment);
  });
});

// ------------------------------------------------------------------------------------------------ orta dikme, açıortay, kenarortay

describe('perpendicular bisectors, angle bisectors and medians', () => {
  it('builds a live perpendicular bisector like the tool', () => {
    const r = ok("AB'nin orta dikmesini çiz", S.seg());
    const line = byType(r.objects, 'line')[0];
    expect(line.label).toBe('[AB] Orta Dikmesi');
    expect(line.color).toBe(COLORS.perpBisector);
    const check = (objects: MathObject[]) => {
      const p1 = byId<PointObject>(objects, line.point1Id), p2 = byId<PointObject>(objects, line.point2Id);
      for (const q of [p1, p2]) expect(dist(q, point(objects, 'A'))).toBeCloseTo(dist(q, point(objects, 'B')), 9);
    };
    check(r.objects);
    check(move(r.objects, 'A', -2, 5));
  });

  it('draws the three perpendicular bisectors of a triangle through the circumcenter', () => {
    const r = ok('üçgenin kenar orta dikmelerini çiz', S.tri());
    const lines = byType(r.objects, 'line');
    expect(lines).toHaveLength(3);
    const o = ok('orta dikmelerin kesişim noktasını bul', r.objects);
    const center = point(o.objects, 'O');
    for (const l of lines) expect(lineDistance(center, byId<PointObject>(o.objects, l.point1Id), byId<PointObject>(o.objects, l.point2Id))).toBeCloseTo(0, 9);
  });

  it.each([
    ['ABC açısının açıortayını çiz', S.angle, ['A', 'B', 'C']],
    ['∠ABC açısının açıortayı', S.angle, ['A', 'B', 'C']],
    ['B köşesinin açıortayını çiz', S.tri, ['A', 'B', 'C']],
    ['ABC üçgeninin B köşesindeki açıortayı', S.tri, ['A', 'B', 'C']],
    ["A'dan açıortay çiz", S.tri, ['C', 'A', 'B']],
  ] as const)('%s', (text, scene, [p1, v, p3]) => {
    const r = ok(text, scene());
    const rays = byType(r.objects, 'ray');
    expect(rays).toHaveLength(1);
    expect(rays[0].startPointId).toBe(point(r.objects, v).id);
    expect(rays[0].color).toBe(COLORS.bisector);
    const check = (objects: MathObject[]) => {
      const helper = byId<PointObject>(objects, rays[0].throughPointId);
      expect(angleAt(point(objects, v), point(objects, p1), helper)).toBeCloseTo(angleAt(point(objects, v), helper, point(objects, p3)), 9);
    };
    check(r.objects);
    check(move(r.objects, p1, 5, 9));
  });

  it('draws all bisectors, exterior bisectors and rejects straight angles', () => {
    expect(byType(ok('üçgenin açıortaylarını çiz', S.tri()).objects, 'ray')).toHaveLength(3);
    const ext = ok('ABC açısının dış açıortayını çiz', S.angle());
    const line = byType(ext.objects, 'line')[0];
    const u = vec(point(ext.objects, 'B'), byId<PointObject>(ext.objects, line.point2Id));
    expect(dot(u, { x: 1, y: 1 })).toBeCloseTo(0, 9);
    expect(line.label).toBe('ABC Dış Açıortayı');
    expect(bad('ABC açısının açıortayını çiz', withPoints({ A: [-1, 0], B: [0, 0], C: [1, 0] }))).toContain('Açıortay');
    expect(bad('açıortay çiz', S.seg())).toContain('açının');
  });

  it.each([
    ["A'dan kenarortay çiz", ['A'], S.tri],
    ['BC kenarına ait kenarortayı çiz', ['A'], S.tri],
    ['ABC üçgeninde B köşesinden kenarortay çiz', ['B'], S.tri],
    ['üçgenin kenarortaylarını çiz', ['A', 'B', 'C'], S.tri],
  ] as const)('%s', (text, vertices, scene) => {
    const r = ok(text, scene());
    const segments = byType(r.objects, 'segment');
    expect(segments.map(s => byId<PointObject>(r.objects, s.startPointId).label)).toEqual(vertices);
    for (const s of segments) {
      const mid = byId<PointObject>(r.objects, s.endPointId);
      expect(mid.construction?.kind).toBe('midpoint');
      const ids = mid.construction?.kind === 'midpoint' ? mid.construction.pointIds : [];
      expect(ids).not.toContain(s.startPointId);
    }
  });

  it('fails when the median vertex is missing', () => {
    expect(bad('kenarortay çiz', S.tri())).toContain('hangi köşeden');
  });
});

// ------------------------------------------------------------------------------------------------ orta nokta, oran

describe('midpoints and division', () => {
  it.each([
    ["AB'nin orta noktasını bul"], ["[AB]'nin orta noktasını bul"], ["A ile B'nin ortasını bul"], ['abnin orta noktası'],
    ['A ve B noktalarının orta noktasını oluştur'], ['doğru parçasının orta noktasını işaretle'],
  ])('%s', text => {
    const r = ok(text, S.seg());
    const m = constructed(r.objects, 'midpoint');
    expect(m).toHaveLength(1);
    expect([m[0].x, m[0].y]).toEqual([3, 0]);
    expect(r.selectedIds).toEqual([m[0].id]);
  });

  it('names, reuses and connects midpoints', () => {
    const named = ok("[AB]'nin orta noktası M olsun", S.seg());
    expect(point(named.objects, 'M').construction?.kind).toBe('midpoint');
    const again = ok("AB'nin orta noktasını bul", named.objects);
    expect(again.objects).toHaveLength(named.objects.length);
    expect(again.message).toContain('zaten');
    const sides = ok('ABC üçgeninin kenar orta noktalarını oluştur', S.tri());
    expect(constructed(sides.objects, 'midpoint').map(p => [p.label, p.x, p.y])).toEqual([['D', 3, 0], ['E', 4, 2], ['F', 1, 2]]);
    const joined = ok('üçgenin kenar orta noktalarını birleştir', S.tri());
    const inner = byType(joined.objects, 'polygon').find(p => p.label === 'DEF')!;
    expect(inner.pointIds).toHaveLength(3);
    const moved = move(joined.objects, 'C', 2, 10);
    expect(point(moved, 'F').y).toBeCloseTo(5, 9);
    expect(bad('orta noktasını bul', [])).toContain('orta noktasını');
    expect(bad("AB'nin orta noktası A olsun", S.seg())).toBeTruthy();
  });

  it.each([
    ["AB'yi 2:1 oranında böl", [4]],
    ["AB'yi 3 eşit parçaya böl", [2, 4]],
    ['AB yi dört eşit parçaya ayır', [1.5, 3, 4.5]],
    ["[AB] doğru parçasını 2'ye 3 oranında bölen P noktasını bul", [2.4]],
    ['AB doğru parçasını 1/2 oranında böl', [2]],
    ['AB doğru parçasını dıştan 3:1 oranında böl', [9]],
    ["BA'yı 2:1 oranında böl", [2]],
  ])('%s', (text, xs) => {
    const r = ok(text, S.seg());
    const pts = constructed(r.objects, 'ratio');
    expect(pts.map(p => p.x)).toEqual(xs.map(x => expect.closeTo(x, 9)));
    const moved = move(r.objects, 'B', 0, 6);
    expect(constructed(moved, 'ratio').map(p => p.y)).toEqual(xs.map(x => expect.closeTo(x, 9)));
    if (text.includes('P noktasını')) expect(pts[0].label).toBe('P');
  });

  it.each([
    ["AB'yi 0:0 oranında böl", 'sıfır'],
    ["AB'yi 1 eşit parçaya böl", '2 ile 100'],
    ["AB'yi dıştan 2:2 oranında böl", 'eşit olamaz'],
    ["AB'yi oranında böl", 'm:n'],
  ])('fails: %s', (text, fragment) => {
    expect(bad(text, S.seg())).toContain(fragment);
  });
});

// ------------------------------------------------------------------------------------------------ merkezler ve çemberler

describe('triangle centers and circles', () => {
  it.each([
    ['ağırlık merkezini bul', 'G', 'centroid'],
    ['ABC üçgeninin diklik merkezini oluştur', 'H', 'orthocenter'],
    ['çevrel çemberin merkezini bul', 'O', 'circumcenter'],
    ['iç teğet çemberin merkezini işaretle', 'I', 'incenter'],
    ['kenarortayların kesişim noktasını bul', 'G', 'centroid'],
    ['yüksekliklerin kesişim noktası nedir', 'H', 'orthocenter'],
    ['açıortayların kesiştiği noktayı bul', 'I', 'incenter'],
  ] as const)('%s', (text, label, center) => {
    const r = ok(text, S.tri());
    const p = point(r.objects, label);
    expect(p.construction).toMatchObject({ kind: 'triangleCenter', center });
    const verify = (objects: MathObject[]) => {
      const [a, b, c] = ['A', 'B', 'C'].map(n => point(objects, n)), q = byId<PointObject>(objects, p.id);
      if (center === 'centroid') expect([q.x, q.y]).toEqual([expect.closeTo((a.x + b.x + c.x) / 3, 9), expect.closeTo((a.y + b.y + c.y) / 3, 9)]);
      if (center === 'circumcenter') { expect(dist(q, a)).toBeCloseTo(dist(q, b), 9); expect(dist(q, a)).toBeCloseTo(dist(q, c), 9); }
      if (center === 'orthocenter') expect(dot(vec(q, a), vec(b, c))).toBeCloseTo(0, 9);
      if (center === 'incenter') { expect(lineDistance(q, a, b)).toBeCloseTo(lineDistance(q, b, c), 9); expect(lineDistance(q, a, b)).toBeCloseTo(lineDistance(q, c, a), 9); }
    };
    verify(r.objects);
    verify(move(r.objects, 'C', -1, 5));
    expect(r.message).toContain(label);
  });

  it('uses three named points, reuses centers and handles several in one sentence', () => {
    const r = ok('A, B ve C noktalarının ağırlık merkezi', S.points3());
    expect([point(r.objects, 'G').x, point(r.objects, 'G').y]).toEqual([2, 2]);
    expect(ok('ağırlık merkezini bul', S.tri().concat()).objects.filter(o => o.type === 'point')).toHaveLength(4);
    const both = ok('ağırlık ve diklik merkezlerini bul', S.tri());
    expect(constructed(both.objects, 'triangleCenter').map(p => p.label).sort()).toEqual(['G', 'H']);
    const twice = ok('ağırlık merkezini bul', both.objects);
    expect(twice.objects).toHaveLength(both.objects.length);
    expect(bad('diklik merkezini bul', withPoints({ A: [0, 0], B: [1, 1], C: [2, 2] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id]); }))).toContain('aynı doğru');
    const two = build(s => { const p = ['D', 'E', 'F'].map((l, i) => s.addPoint({ x: 10 + i, y: i * i }, { label: l })); s.addPolygon(p.map(x => x.id)); }, S.tri());
    expect(bad('ağırlık merkezini bul', two)).toContain('Birden fazla');
  });

  it('draws a live circumcircle, optionally with its center', () => {
    const r = ok("ABC'nin çevrel çemberini çiz", S.tri());
    const circle = byType(r.objects, 'circle')[0];
    expect(circle.throughPointIds).toEqual(['A', 'B', 'C'].map(n => point(r.objects, n).id));
    expect(circle.label).toBe('ABC Çevrel Çemberi');
    const withCenter = ok('üçgenin çevrel çemberini merkeziyle birlikte çiz', S.tri());
    expect(point(withCenter.objects, 'O').construction).toMatchObject({ center: 'circumcenter' });
    const square = ok('karenin çevrel çemberini çiz', S.square());
    expect(byType(square.objects, 'circle')).toHaveLength(1);
    const kite = withPoints({ A: [0, 0], B: [4, 0], C: [5, 5], D: [0, 4] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id, p.D.id]); });
    expect(bad('dörtgenin çevrel çemberini çiz', kite)).toContain('aynı çember');
  });

  it('draws a live incircle tangent to all sides', () => {
    const r = ok('iç teğet çemberini çiz', S.tri());
    const circle = byType(r.objects, 'circle')[0];
    expect(circle.label).toBe('ABC İç Teğet Çemberi');
    const check = (objects: MathObject[]) => {
      const center = byId<PointObject>(objects, circle.centerPointId), radius = dist(center, byId<PointObject>(objects, circle.radiusPointId!));
      const [a, b, c] = ['A', 'B', 'C'].map(n => point(objects, n));
      for (const [p, q] of [[a, b], [b, c], [c, a]]) expect(lineDistance(center, p, q)).toBeCloseTo(radius, 9);
    };
    check(r.objects);
    check(move(r.objects, 'C', 5, 8));
    const hidden = byId<PointObject>(r.objects, circle.radiusPointId!);
    expect(hidden.visible).toBe(false);
    expect(ok('ABC üçgeninin iç teğet çemberini çiz', r.objects).objects).toHaveLength(r.objects.length);
  });

  it('draws a circle tangent to a line', () => {
    const r = ok('A merkezli BC doğrusuna teğet çember çiz', S.lines());
    const circle = byType(r.objects, 'circle')[0];
    expect(circle.centerPointId).toBe(point(r.objects, 'A').id);
    expect(r.message).toContain('r = 3');
    const moved = move(r.objects, 'A', 0, 5);
    expect(dist(point(moved, 'A'), byId<PointObject>(moved, circle.radiusPointId!))).toBeCloseTo(5, 9);
    expect(bad('A merkezli teğet çember çiz', S.lines())).toBeTruthy();
  });
});

// ------------------------------------------------------------------------------------------------ kesişim, teğet, köşegen

describe('intersections, tangents and diagonals', () => {
  it('intersects named lines live and creates missing lines', () => {
    const r = ok('AB ve CD doğrularının kesişim noktasını bul', S.cross());
    const e = point(r.objects, 'E');
    expect([e.x, e.y]).toEqual([2, 2]);
    expect(e.color).toBe(COLORS.intersection);
    expect(e.construction).toMatchObject({ kind: 'intersection', index: 0 });
    const moved = move(r.objects, 'B', 4, 0);
    expect(point(moved, 'E').y).toBeCloseTo(0, 9);
    const bare = ok('AB ve CD doğrularının kesişim noktasını bul', withPoints({ A: [0, 0], B: [4, 4], C: [0, 4], D: [4, 0] }));
    expect(byType(bare.objects, 'line')).toHaveLength(2);
    expect(collectDependentIds(r.objects, [byType(r.objects, 'line')[0].id]).has(e.id)).toBe(true);
  });

  it.each([
    ['c1 ile BC doğrusunun kesişimi', S.circle, 2],
    ['çember ile doğrunun kesişim noktalarını işaretle', S.circle, 2],
    ['M merkezli çember ile BC doğrusunu kesiştir', S.circle, 2],
    ['iki çemberin kesişim noktalarını bul', S.twoCircles, 2],
    ['çemberlerin kesişim noktaları nedir?', S.twoCircles, 2],
  ] as const)('%s', (text, scene, count) => {
    const r = ok(text, scene());
    const pts = constructed(r.objects, 'intersection');
    expect(pts).toHaveLength(count);
    const circles = byType(r.objects, 'circle');
    for (const p of pts) for (const c of circles.filter(c => p.construction?.kind === 'intersection' && p.construction.objectIds.includes(c.id))) {
      expect(dist(p, byId<PointObject>(r.objects, c.centerPointId))).toBeCloseTo(c.fixedRadius!, 9);
    }
    expect(r.selectedIds.sort()).toEqual(pts.map(p => p.id).sort());
  });

  it('uses selection and reports failures', () => {
    const cross = S.cross();
    expect(constructed(ok('seçili iki nesnenin kesişim noktalarını oluştur', cross, byType(cross, 'line').map(l => l.id)).objects, 'intersection')).toHaveLength(1);
    const parallel = withPoints({ A: [0, 0], B: [4, 0], C: [0, 2], D: [4, 2] }, (s, p) => { s.addLine(p.A.id, p.B.id); s.addLine(p.C.id, p.D.id); });
    expect(bad('AB ve CD doğrularının kesişim noktasını bul', parallel)).toContain('kesişmiyor');
    const far = withPoints({ M: [0, 0], N: [9, 0] }, (s, p) => { s.addCircle({ centerId: p.M.id, radius: 2 }); s.addCircle({ centerId: p.N.id, radius: 2 }); });
    expect(bad('iki çemberin kesişim noktalarını bul', far)).toContain('kesişmiyor');
    const three = build(s => { s.addCircle({ centerId: s.addPoint({ x: 1, y: 1 }, { label: 'K' }).id, radius: 1 }); }, S.twoCircles());
    expect(bad('iki çemberin kesişim noktalarını bul', three)).toContain('Birden fazla');
    const ellipse = withPoints({ M: [0, 0], N: [1, 0] }, (s, p) => { s.addCircle({ centerId: p.M.id, radius: 2 }); s.addEllipse(p.N.id, 2, 1); });
    expect(bad('çember ile elipsin kesişimini bul', ellipse)).toContain('desteklenir');
    expect(bad('kesişim noktasını bul', S.tri())).toContain('Hangi iki');
  });

  it('draws tangents from different phrasings', () => {
    const scene = S.circle();
    const r1 = ok("P'den çembere teğetleri çiz", scene);
    expect(constructed(r1.objects, 'tangent')).toHaveLength(2);
    const r2 = ok('T noktasında çembere teğet çiz', scene);
    const line = byType(created(scene, r2.objects), 'line')[0];
    expect(byId<PointObject>(r2.objects, line.point2Id).y).toBeCloseTo(2, 9);
    const r3 = ok('c1 çemberine Q noktasından teğet çiz', scene);
    for (const q of constructed(r3.objects, 'tangent')) expect(dist(q, point(scene, 'M'))).toBeCloseTo(2, 9);
    expect(ok("P'den çembere teğetleri çiz", r1.objects).objects).toHaveLength(r1.objects.length);
    expect(bad('iki çemberin ortak teğetini çiz', S.twoCircles())).toContain('ortak teğet');
  });

  it('draws diagonals and their intersection', () => {
    const r = ok('karenin köşegenlerini çiz', S.square());
    expect(byType(r.objects, 'segment').map(s => s.label).sort()).toEqual(['[AC]', '[BD]']);
    const o = ok('köşegenlerin kesişim noktasını bul', S.square());
    const e = constructed(o.objects, 'intersection')[0];
    expect([e.x, e.y]).toEqual([2, 2]);
    expect(bad('karenin köşegenlerini çiz', S.tri())).toBeTruthy();
  });
});

// ------------------------------------------------------------------------------------------------ söyleyiş çeşitliliği

describe('phrasing variety', () => {
  const rich = () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], D: [8, 5], P: [12, 0], M: [9, 0] }, (s, p) => {
    s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' });
    s.addCircle({ centerId: p.M.id, radius: 2 }, { label: 'c1' });
    s.addLine(p.P.id, p.D.id, { label: 'd' });
    s.addLine(p.A.id, p.D.id, { label: 'e' });
  });

  it.each([
    ['B açısının açıortayını çiz', 'ray', 1],
    ['A köşesindeki açının açıortayı', 'ray', 1],
    ["ABC'de B açısının iç açıortayı", 'ray', 1],
    ["AB doğrusuna dik olan ve C'den geçen doğruyu çiz", 'line', 1],
    ["A'dan geçen BC'ye paralel çizer misin", 'line', 1],
    ['D noktasından d doğrusuna dik doğru', 'line', 1],
    ['e doğrusuna B noktasından paralel doğru çiz', 'line', 1],
    ['yükseklikleri çiz', 'segment', 3],
    ["ABC üçgeninde A'dan BC'ye yükseklik", 'segment', 1],
    ["C'den inen yüksekliği çiz", 'segment', 1],
    ['C noktasından AB doğrusuna bir dikme çizer misiniz', 'segment', 1],
    ['ABC üçgeninin kenar orta dikmeleri', 'line', 3],
    ["AB ve BC'nin orta noktalarını birleştir", 'segment', 1],
    ['iç teğet çember çizer misin', 'circle', 1],
    ["P noktasından c1'e teğet çiz", 'line', 2],
    ["P'den teğetleri çiz", 'line', 2],
  ] as const)('%s', (text, type, count) => {
    const scene = rich();
    const r = ok(text, scene);
    expect(created(scene, r.objects).filter(o => o.type === type)).toHaveLength(count);
  });

  it('keeps point D and line d apart and explains unsupported intersections', () => {
    const scene = rich();
    const r = ok('D noktasından d doğrusuna dik doğru', scene);
    const line = byType(created(scene, r.objects), 'line')[0];
    expect(line.point1Id).toBe(point(scene, 'D').id);
    expect(bad('f ve g fonksiyonlarının kesişimi', scene)).toContain('Fonksiyon');
    expect(bad('A merkezli çember ile d nin kesişimi', scene)).toContain('A merkezli');
    // Eksenle kesişim artık sabit noktalarla yapılıyor (eksenler nesne olmadığı için canlı değil).
    const axis = ok('çemberin x ekseniyle kesişimi', scene);
    expect(created(scene, axis.objects).filter(o => o.type === 'point').map(p => [(p as PointObject).x, (p as PointObject).y])).toEqual([[7, 0], [11, 0]]);
    expect(axis.message).toContain('eksen');
    const colored = ok("AC'nin orta dikmesini kırmızı çiz", scene);
    expect(byType(created(scene, colored.objects), 'line')[0].color).toBe('#ef4444');
  });
});

// ------------------------------------------------------------------------------------------------ çoklu cümle ve sahiplik

describe('multi-clause commands and family boundaries', () => {
  it('runs several constructions in one command', () => {
    const r = ok("ABC'nin ağırlık merkezini bul ve çevrel çemberini çiz", S.tri());
    expect(point(r.objects, 'G')).toBeTruthy();
    expect(byType(r.objects, 'circle')).toHaveLength(1);
    const chain = ok("AB'nin orta noktasını bul, sonra C'den AB'ye dikme indir", S.tri());
    expect(constructed(chain.objects, 'midpoint')).toHaveLength(1);
    expect(constructed(chain.objects, 'foot')).toHaveLength(1);
  });

  it('rolls back everything when a later clause fails', () => {
    const r = runWith(handlers, "AB'nin orta noktasını bul ve Z'den AB'ye paralel doğru çiz", S.tri());
    expect(r.ok).toBe(false);
  });

  it.each([
    'ABC üçgenini A etrafında 90 derece döndür',
    "AB'yi d doğrusuna göre yansıt",
    'AB uzunluğunu ölç',
    'AB doğrusu çiz',
    'üçgen çiz',
    'dik üçgen çiz',
    'paralelkenar çiz',
    "AB'nin orta noktasını sil",
    'tabanı 6 yüksekliği 4 olan üçgen çiz',
    'orta dikmeyi kırmızı yap',
    'x eksenine paralel doğru çiz',
    'A, B ve C noktalarından geçen çember çiz',
    'kaydırıcıları sil',
    "ABC'nin alanını hesapla",
    'açıortayı gizle',
    'a = 2',
    'dik koordinat sistemine geç',
    'kenarortay uzunluğunu hesapla',
  ])('does not claim: %s', text => {
    const scene = new CommandScene(S.lines());
    expect(rankHandlers(parseClause(text, scene.known()), scene, handlers)).toEqual([]);
  });

  it('scores inside the construction band except unbinding', () => {
    const scene = new CommandScene(S.bound());
    for (const [text, min, max] of [["A'dan BC'ye dik doğru çiz", 65, 74], ['iç teğet çemberini çiz', 65, 74], ['üçgenin kaydırıcı bağını kaldır', 85, 94]] as const) {
      const [top] = rankHandlers(parseClause(text, scene.known()), scene, handlers);
      expect(top.score).toBeGreaterThanOrEqual(min);
      expect(top.score).toBeLessThanOrEqual(max);
    }
  });

  it('never mutates the input and keeps object literals tool-compatible', () => {
    const scene = S.tri();
    const r = ok('üçgenin açıortaylarını çiz', scene);
    const ray = byType(r.objects, 'ray')[0] as RayObject;
    expect(ray).toMatchObject({ type: 'ray', showLabel: true, visible: true, thickness: 2 });
    const helper = byId<PointObject>(r.objects, ray.throughPointId);
    expect(helper).toMatchObject({ color: COLORS.bisector, isIndependent: false, visible: true });
    const poly = byType(r.objects, 'polygon')[0] as PolygonObject;
    expect(poly).toEqual(byType(scene, 'polygon')[0]);
    const seg = byType(ok('C köşesinden yükseklik çiz', scene).objects, 'segment')[0] as SegmentObject;
    expect(seg).toMatchObject({ color: COLORS.construction, showLength: true });
    const slider = byType(S.bound(), 'slider')[0] as SliderObject;
    expect(slider).toMatchObject({ label: 'AB', length: 4, x: -2.5, y: -3 });
    expect(byLabel(S.bound(), 'AB')?.type).toBe('slider');
  });
});

// ------------------------------------------------------------------------------------------------ söyleyiş taraması düzeltmeleri

describe('phrase sweep regressions (family only)', () => {
  const at = (objects: MathObject[]) => objects.filter((o): o is PointObject => o.type === 'point').map(p => [p.x, p.y]);

  it('takes the midpoint of two focused or selected points and names unknown labels', () => {
    const scene = withPoints({ A: [0, 0], B: [4, 2] });
    const ids = byType(scene, 'point').map(p => p.id);
    expect(at(constructed(ok('orta noktasını bul', scene, ids).objects, 'midpoint'))).toEqual([[2, 1]]);
    expect(constructed(ok('seçili noktaların orta noktasını bul', scene, ids).objects, 'midpoint')).toHaveLength(1);
    expect(bad("KL'nin orta noktasını bul", scene)).toContain('KL adlı');
  });

  it('divides by a digit with a dative suffix and finds all four centers', () => {
    expect(constructed(ok("AB'yi 3'e böl", S.seg()).objects, 'ratio').map(p => p.x)).toEqual([2, 4]);
    expect(constructed(ok('üçgenin dört özel merkezini bul', S.tri()).objects, 'triangleCenter')).toHaveLength(4);
  });

  it('intersects lines referred to by construction nouns', () => {
    const scene = S.bisectors();
    const r = ok('orta dikme ile açıortayın kesişim noktasını bul', scene);
    const meet = constructed(created(scene, r.objects), 'intersection');
    expect(meet).toHaveLength(1);
    expect(meet[0].x).toBeCloseTo(3, 9);
    const cevians = ok("B'den AC'ye yükseklik çiz", ok("A'dan kenarortay çiz", S.tri()).objects).objects;
    const mixed = constructed(created(cevians, ok('kenarortay ile yüksekliğin kesişimini bul', cevians).objects), 'intersection');
    expect(at(mixed)).toEqual([[3, 1.5]]);
    expect(bad('kenarortayla yüksekliğin kesişimini bul', S.tri())).toContain('Önce kenarortay');
    const medians = ok('üçgenin kenarortaylarını çiz', S.tri()).objects;
    expect(ok('A dan çizilen kenarortay ile BC nin kesişim noktası', medians).message).toContain('D(4; 2) (zaten vardı)');
    const tangent = ok('T noktasında çembere teğet çiz', S.circle()).objects;
    const again = ok('teğet ile c1 in kesişim noktasını bul', tangent);
    expect(created(tangent, again.objects).filter(o => o.type === 'point')).toHaveLength(0);
  });

  it('intersects a fresh perpendicular with its base line and answers yes/no questions', () => {
    const r = ok("A'dan BC'ye dik doğru çiz ve kesişim noktasını bul", S.lines());
    expect(at(constructed(r.objects, 'intersection'))).toEqual([[0, 0]]);
    const parallel = withPoints({ A: [0, 0], B: [4, 0], C: [0, 2], D: [4, 2] }, (s, p) => { s.addLine(p.A.id, p.B.id); s.addLine(p.C.id, p.D.id); });
    const answer = ok('AB ile CD kesişiyor mu', parallel);
    expect(answer.sceneChanged).toBe(false);
    expect(answer.message).toContain('kesişmiyor');
  });

  it('draws parallels and perpendiculars to linear functions through hidden helper points', () => {
    const scene = build(s => { s.addPoint({ x: 1, y: 5 }, { label: 'A' }); s.addFunction('2x + 1'); });
    const r = ok('A noktasından f ye dik çiz', scene);
    const line = byType(created(scene, r.objects), 'line')[0];
    const [p1, p2] = [byId<PointObject>(r.objects, line.point1Id), byId<PointObject>(r.objects, line.point2Id)];
    expect(dot(vec(p1, p2), { x: 1, y: 2 })).toBeCloseTo(0, 9);
    expect(created(scene, r.objects).filter(o => o.type === 'point' && !o.visible)).toHaveLength(2);
    expect(r.message).toContain('güncellenmez');
    const inline = ok('A noktasından y = 2x + 1 doğrusuna paralel çiz', withPoints({ A: [0, 3] }));
    expect(byType(inline.objects, 'line')).toHaveLength(2);
    const curve = build(s => { s.addPoint({ x: 1, y: 5 }, { label: 'A' }); s.addFunction('x^2 - 4'); });
    expect(bad('A dan f nin grafiğine dik doğru çiz', curve)).toContain('doğrusal');
    const lonely = build(s => { s.addFunction('2x + 1'); });
    expect(bad('bu doğruya dik çiz', lonely, byType(lonely, 'function').map(f => f.id))).toContain('hangi noktadan');
  });

  it('finds function intersections, roots and axis crossings as static points', () => {
    const fg = ok('f ve g fonksiyonlarının kesişim noktalarını bul', S.fg());
    expect(at(fg.objects)).toEqual([[-1, 1], [2, 4]]);
    expect(fg.objects.some(o => o.type === 'point' && o.construction)).toBe(false);
    expect(at(ok('f nin köklerini bul', S.parabola()).objects)).toEqual([[-2, 0], [2, 0]]);
    expect(at(ok('f nin y eksenini kestiği noktayı bul', S.parabola()).objects)).toEqual([[0, -4]]);
    expect(at(ok('f nin x eksenini kestiği noktaları bul', build(s => { s.addFunction('x^2'); })).objects)).toEqual([[0, 0]]);
    expect(bad('f ve g nin kesişimi', build(s => { s.addFunction('x^2 + 1'); s.addFunction('x - 5', { label: 'g(x) = x - 5' }); }))).toContain('kesişmiyor');
    expect(bad('f ile h nin kesişim noktalarını bul', S.fg())).toContain('h adlı fonksiyon');
    // Sayının kökü fonksiyon kökü değildir: bu aile üstlenmez.
    expect(runWith(handlers, '9 un kökünü bul', S.parabola())).toMatchObject({ ok: false, unrecognized: true });
  });

  it('names the foot, uses the intersection point as a source and continues from the previous line', () => {
    expect(point(ok('C den dikme indir ve ayağına H de', S.tri()).objects, 'H')).toMatchObject({ x: 2, y: 0 });
    const crossing = ok('AB ve CD doğrularının kesişim noktasını bul', build(s => {
      s.addLine(s.addPoint({ x: 0, y: -2 }, { label: 'F' }).id, s.addPoint({ x: 4, y: -2 }, { label: 'G' }).id, { label: 'd' });
    }, S.cross())).objects;
    expect(at(constructed(ok('kesişim noktasından d ye dikme indir', crossing).objects, 'foot'))).toEqual([[2, -2]]);
    const both = ok('D noktasından BC ye paralel ve AB ye dik doğrular çiz', S.lines());
    expect(byType(created(S.lines(), both.objects), 'line').length).toBeGreaterThanOrEqual(2);
  });

  it('refuses slider binding without a triangle clearly (the excircle is now drawn by the teoremler family)', () => {
    expect(bad('kaydırıcıya bağla', S.seg())).toContain('üçgen');
  });
});
