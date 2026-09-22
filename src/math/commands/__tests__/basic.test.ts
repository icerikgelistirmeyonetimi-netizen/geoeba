import { describe, expect, it, vi } from 'vitest';
import type { AngleObject, LineObject, MathObject, PointObject, PolygonObject, RayObject, SegmentObject, ViewportTransform } from '@/types/math';

// Diğer aileler aynı anda geliştiriliyor: motorun tam kayıt listesini yüklemeden yalnızca bu ailenin işleyicileri sınanır.
vi.mock('../handlers', () => ({ HANDLERS: [], COMMAND_CATALOG: [] }));
import { resolveCommandBindings } from '@/math/commandBindings';
import { getVisibleWorldBounds } from '@/math/coordinates';
import { handlers } from '../handlers/basic';
import { rankHandlers } from '../engine';
import { parseClause, splitClauses } from '../text';
import { CommandScene } from '../scene';
import { build, byType, dist, expectFail, expectOk, point, runWith } from './helpers';

// ------------------------------------------------------------------------------------------------ sahneler

const pts = () => build(s => {
  s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  s.addPoint({ x: 4, y: 0 }, { label: 'B' });
  s.addPoint({ x: 2, y: 3 }, { label: 'C' });
  s.addPoint({ x: 6, y: 1 }, { label: 'D' });
});
const withSegment = () => build(s => { s.addSegment(s.findPoint('A')!.id, s.findPoint('B')!.id); }, pts());
const lineScene = () => build(s => {
  const a = s.addPoint({ x: 0, y: 0 }, { label: 'A' }), b = s.addPoint({ x: 4, y: 2 }, { label: 'B' });
  s.addLine(a.id, b.id);
});
const triangle = () => build(s => {
  const [a, b, c] = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 }].map((p, i) => s.addPoint(p, { label: 'ABC'[i] }));
  s.addPolygon([a.id, b.id, c.id], { kind: 'triangle' });
});
const circleScene = () => build(s => {
  const o = s.addPoint({ x: 10, y: 0 }, { label: 'O' });
  s.addCircle({ centerId: o.id, radius: 2 });
});
const move = (objects: MathObject[], label: string, to: { x: number; y: number }) =>
  resolveCommandBindings(objects.map(o => (o.type === 'point' && o.label === label ? { ...o, ...to } : o)));
const ok = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectOk(handlers, text, scene, selection);
const fails = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectFail(handlers, text, scene, selection);
const topHandler = (text: string, scene: MathObject[] = []) => {
  const s = new CommandScene(scene);
  return rankHandlers(parseClause(text, s.known()), s, handlers)[0]?.handler.id;
};
const slope = (l: { point1Id: string; point2Id: string }, objects: MathObject[]) => {
  const a = objects.find(o => o.id === l.point1Id) as PointObject, b = objects.find(o => o.id === l.point2Id) as PointObject;
  return (b.y - a.y) / (b.x - a.x);
};
const pointById = (objects: MathObject[], id: string) => objects.find(o => o.id === id) as PointObject;
const angleValue = (objects: MathObject[], angle: AngleObject) => {
  const p1 = pointById(objects, angle.point1Id), v = pointById(objects, angle.vertexPointId), p3 = pointById(objects, angle.point3Id);
  let d = Math.abs(Math.atan2(p1.y - v.y, p1.x - v.x) - Math.atan2(p3.y - v.y, p3.x - v.x)) * 180 / Math.PI;
  if (d > 180) d = 360 - d;
  return angle.reflex ? 360 - d : d;
};

// ------------------------------------------------------------------------------------------------ örnekler

const ellipseScene = () => build(s => { const c = s.addPoint({ x: 0, y: 0 }, { label: 'E' }); s.addEllipse(c.id, 4, 2); });

const EXAMPLE_SCENES: Record<string, () => MathObject[]> = {
  'AB doğru parçası üzerinde bir nokta al': withSegment,
  'çemberin üzerine bir nokta koy': circleScene,
  'D noktasını AB doğrusu üzerinde oluştur': lineScene,
  'AB üzerinde 3 nokta al': withSegment,
  'ABC üçgeninin üzerinde bir nokta al': triangle,
  'AB doğru parçası üzerinde K ve L noktalarını oluştur': withSegment,
  'C noktasını AB doğru parçası üzerine koy': withSegment,
  'elipsin üzerine bir nokta koy': ellipseScene,
  'A, B, C, D noktalarını sırayla birleştir': pts,
  'ABC üçgeninin B açısını çiz': triangle,
  'A = (1; 2)': pts,
};

describe('every example command', () => {
  const all = handlers.flatMap(h => h.examples.map(example => [h.id, example] as const));
  it('has 6–20 unique examples per handler', () => {
    for (const h of handlers) {
      expect(h.examples.length).toBeGreaterThanOrEqual(6);
      expect(h.examples.length).toBeLessThanOrEqual(20);
    }
    expect(new Set(all.map(([, e]) => e)).size).toBe(all.length);
  });
  it.each(all)('%s: %s', (id, example) => {
    const scene = (EXAMPLE_SCENES[example] ?? (() => []))();
    expect(splitClauses(example)).toHaveLength(1);
    expect(topHandler(example, scene)).toBe(id);
    const result = ok(example, scene);
    expect(result.sceneChanged).toBe(true);
    expect(result.message.length).toBeGreaterThan(10);
    expect(result.selectedIds.length).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------------------------------------------------ noktalar

describe('points', () => {
  it('legacy: decimal-comma coordinates and duplicate names', () => {
    const r = ok('P (2,5; -3,2) noktası oluştur');
    const p = point(r.objects, 'P');
    expect(p.x).toBe(2.5);
    expect(p.y).toBe(-3.2);
    expect(p).toMatchObject({ color: '#2563eb', isIndependent: true, showLabel: true, visible: true });
    expect(r.message).toContain('P(2,5; -3,2)');
    expect(r.selectedIds).toEqual([p.id]);
    expect(fails('P (1; 2) noktası oluştur', r.objects)).toContain('zaten var');
    expect(point(ok('A (2; 0) noktası oluştur').objects, 'A')).toMatchObject({ x: 2, y: 0 });
  });

  it.each([
    'A(2,3)', 'A = (2; 3)', 'A=(2,3)', 'A noktası (2,3)', 'A noktasını (2, 3) koordinatında oluştur', 'koordinatları 2 ve 3 olan A noktası',
    'x koordinatı 2, y koordinatı 3 olan A noktası', 'A noktası (2;3) olsun', 'a noktası (2;3)', 'A (2 3) noktası', 'lütfen A(2; 3) noktasını oluşturur musun',
    'A(2,3) noktasını ekleyin', 'A(2;3) noktası çizer misin', 'koordinatları (2, 3) olan A noktası', 'A noktasını (2;3) konumuna koy',
  ])('creates A(2; 3) from “%s”', text => {
    const r = ok(text);
    expect(byType(r.objects, 'point')).toHaveLength(1);
    expect(point(r.objects, 'A')).toMatchObject({ x: 2, y: 3 });
  });

  it('creates unnamed points from bare coordinates', () => {
    expect(point(ok('(2,3) noktası').objects, 'A')).toMatchObject({ x: 2, y: 3 });
    const two = ok('(1,2), (3,4)');
    expect(byType(two.objects, 'point').map(p => [p.x, p.y])).toEqual([[1, 2], [3, 4]]);
    expect(point(ok('(-1,5; 0) noktasını oluştur').objects, 'A')).toMatchObject({ x: -1.5, y: 0 });
  });

  it.each([
    ['A(0,0), B(4,0) ve C(2,3) noktalarını oluştur', [['A', 0, 0], ['B', 4, 0], ['C', 2, 3]]],
    ['P(2,3) ve Q(4,5) noktaları', [['P', 2, 3], ['Q', 4, 5]]],
    ['A(1;1) B(2;2) C(3;3)', [['A', 1, 1], ['B', 2, 2], ['C', 3, 3]]],
    ['K, L ve M noktaları (1,1), (2,2) ve (3,3) olsun', [['K', 1, 1], ['L', 2, 2], ['M', 3, 3]]],
  ] as const)('several points: %s', (text, expected) => {
    const r = ok(text);
    expect(byType(r.objects, 'point').map(p => [p.label, p.x, p.y])).toEqual(expected);
    expect(r.selectedIds).toHaveLength(expected.length);
  });

  it('spreads several points without coordinates', () => {
    for (const text of ['K, L ve M noktalarını oluştur', 'KLM noktalarını oluştur']) {
      const r = ok(text);
      const list = byType(r.objects, 'point');
      expect(list.map(p => p.label)).toEqual(['K', 'L', 'M']);
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) expect(dist(list[i], list[j])).toBeGreaterThanOrEqual(1.5);
    }
    expect(byType(ok('3 nokta koy').objects, 'point').map(p => p.label)).toEqual(['A', 'B', 'C']);
    expect(byType(ok('iki nokta oluştur', pts()).objects, 'point')).toHaveLength(6);
    expect(byType(ok('üç tane nokta ekle').objects, 'point')).toHaveLength(3);
    expect(ok('nokta koy').message).toContain('Konum belirtilmediği');
  });

  it('origin, O and lowercase / subscript / prime names', () => {
    expect(point(ok('orijine O noktası koy').objects, 'O')).toMatchObject({ x: 0, y: 0 });
    expect(point(ok('orijinde bir nokta oluştur').objects, 'A')).toMatchObject({ x: 0, y: 0 });
    expect(point(ok('A noktasını orijinde oluştur').objects, 'A')).toMatchObject({ x: 0, y: 0 });
    expect(byType(ok('O noktası oluştur').objects, 'point')[0].label).toBe('O');
    expect(byType(ok('k noktası oluştur').objects, 'point')[0].label).toBe('K');
    expect(point(ok('A_1 (2;3) noktası').objects, 'A_1')).toMatchObject({ x: 2, y: 3 });
    expect(point(ok("A' noktası (1;1)").objects, "A'")).toMatchObject({ x: 1, y: 1 });
  });

  it('puts a random point inside the visible area', () => {
    const viewport: ViewportTransform = { zoom: 40, panX: 0, panY: 0, width: 800, height: 600, showGrid: true, showAxes: true, showCoordinates: true, snapToGrid: false, gridStep: 1 };
    const bounds = getVisibleWorldBounds(viewport);
    for (let i = 0; i < 5; i++) {
      const r = expectOk(handlers, 'rastgele bir nokta koy', pts(), [], { viewport });
      const p = byType(r.objects, 'point')[4];
      expect(Number.isInteger(p.x) && Number.isInteger(p.y)).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(p.x).toBeLessThanOrEqual(bounds.maxX);
      expect(p.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(p.y).toBeLessThanOrEqual(bounds.maxY);
    }
  });

  it('A = (x; y) defines or moves, and live constructions follow', () => {
    const scene = build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'M', construction: { kind: 'midpoint', pointIds: [s.findPoint('A')!.id, s.findPoint('B')!.id] } }); }, pts());
    const r = ok('A = (2; 2)', scene);
    expect(r.objects).toHaveLength(scene.length);
    expect(point(r.objects, 'A')).toMatchObject({ x: 2, y: 2 });
    expect(point(r.objects, 'M')).toMatchObject({ x: 3, y: 1 });
    expect(r.selectedIds).toEqual([point(r.objects, 'A').id]);
    expect(r.message).toContain('taşındı');
    expect(fails('M = (0; 0)', scene)).toContain('inşa');
    expect(point(ok('A noktası (5;5) olsun', pts()).objects, 'A')).toMatchObject({ x: 5, y: 5 });
    const locked = pts().map(o => (o.label === 'A' ? { ...o, locked: true } : o));
    expect(fails('A = (1;1)', locked)).toContain('kilitli');
  });

  it('moving an attached point keeps it on its host', () => {
    const scene = build(s => { s.addPoint({ x: 1, y: 0 }, { label: 'E', onObjectId: byType(s.objects, 'segment')[0].id }); }, withSegment());
    expect(point(ok('E = (3; 5)', scene).objects, 'E')).toMatchObject({ x: 3, y: 0 });
  });

  it('rejects unclear or invalid point requests', () => {
    expect(fails('A, B ve C noktaları (1,2) ve (3,4)')).toContain('Hangi koordinatın');
    expect(fails('A(200000; 0) noktası')).toContain('100000');
    expect(fails('30 nokta koy')).toContain('26');
    expect(fails('A noktası oluştur', pts())).toContain('A = ');
    expect(fails('A(1,1) ve A(2,2) noktalarını oluştur')).toContain('zaten var');
  });
});

describe('point on an object', () => {
  it('segment: attached, on the segment, selected', () => {
    const scene = withSegment();
    const r = ok('AB doğru parçası üzerinde bir nokta al', scene);
    const seg = byType(r.objects, 'segment')[0];
    const e = byType(r.objects, 'point').find(p => p.onObjectId)!;
    expect(e.onObjectId).toBe(seg.id);
    expect(e.y).toBeCloseTo(0, 9);
    expect(e.x).toBeGreaterThan(0);
    expect(e.x).toBeLessThan(4);
    expect(r.selectedIds).toEqual([e.id]);
    expect(r.message).toContain('[AB]');
    // taşıyıcı silinirse nokta da silinir
    const s = new CommandScene(r.objects);
    const removed = s.remove([seg.id]);
    expect(removed).toContain(e.id);
  });

  it.each([
    'AB doğru parçasının üzerine nokta koy', '[AB] üzerinde nokta oluştur', 'AB üzerinde bir nokta işaretle', 'doğru parçası üzerinde nokta al',
  ])('segment phrasing: %s', text => {
    const r = ok(text, withSegment());
    expect(byType(r.objects, 'point').filter(p => p.onObjectId)).toHaveLength(1);
  });

  it('circle, line, arc, ellipse and polygon hosts', () => {
    const circle = ok('çemberin üzerine bir nokta koy', circleScene());
    const p = byType(circle.objects, 'point').find(q => q.onObjectId)!;
    expect(dist(p, { x: 10, y: 0 })).toBeCloseTo(2, 6);

    const onLine = ok('D noktasını AB doğrusu üzerinde oluştur', lineScene());
    const d = point(onLine.objects, 'D');
    expect(d.onObjectId).toBe(byType(onLine.objects, 'line')[0].id);
    expect(d.y - d.x / 2).toBeCloseTo(0, 6);

    const arcScene = build(s => {
      const c = s.addPoint({ x: 0, y: 0 }, { label: 'M' }), a = s.addPoint({ x: 3, y: 0 }, { label: 'N' }), b = s.addPoint({ x: 0, y: 3 }, { label: 'K' });
      s.addArc(c.id, a.id, b.id);
    });
    const onArc = byType(ok('yayın üzerine nokta koy', arcScene).objects, 'point').find(q => q.onObjectId)!;
    expect(dist(onArc, { x: 0, y: 0 })).toBeCloseTo(3, 3);
    expect(onArc.x).toBeGreaterThan(0);
    expect(onArc.y).toBeGreaterThan(0);

    const ellipse = build(s => { const c = s.addPoint({ x: 0, y: 0 }, { label: 'E' }); s.addEllipse(c.id, 4, 2); });
    const onEllipse = byType(ok('elipsin üzerine bir nokta koy', ellipse).objects, 'point').find(q => q.onObjectId)!;
    expect((onEllipse.x / 4) ** 2 + (onEllipse.y / 2) ** 2).toBeCloseTo(1, 3);

    const edge = ok('ABC üçgeninin BC kenarı üzerinde bir nokta al', triangle());
    const q = byType(edge.objects, 'point').find(x => x.onObjectId)!;
    expect(q.onObjectId).toBe(byType(edge.objects, 'polygon')[0].id);
    expect(q.x / 4 + q.y / 3).toBeCloseTo(1, 4);
  });

  it('several points, names and nearest position', () => {
    const three = ok('AB üzerinde 3 nokta al', withSegment());
    expect(byType(three.objects, 'point').filter(p => p.onObjectId).map(p => p.x)).toEqual([1, 2, 3]);
    const named = ok('AB doğru parçası üzerinde K ve L noktalarını oluştur', withSegment());
    expect(['K', 'L'].map(l => point(named.objects, l).onObjectId)).toEqual([byType(named.objects, 'segment')[0].id, byType(named.objects, 'segment')[0].id]);
    const near = ok('AB doğru parçası üzerinde (3,2) noktasına en yakın nokta', withSegment());
    expect(byType(near.objects, 'point').find(p => p.onObjectId)).toMatchObject({ x: 3, y: 0 });
  });

  it('asks which host when ambiguous, uses the selection, reports missing hosts', () => {
    const twoCircles = build(s => { const p = s.addPoint({ x: -10, y: 0 }, { label: 'P' }); s.addCircle({ centerId: p.id, radius: 1 }); }, circleScene());
    expect(fails('çemberin üzerine nokta koy', twoCircles)).toContain('Birden fazla çember');
    const selected = byType(twoCircles, 'circle')[1].id;
    const r = ok('çemberin üzerine nokta koy', twoCircles, [selected]);
    expect(byType(r.objects, 'point').find(p => p.onObjectId)?.onObjectId).toBe(selected);
    expect(fails('çember üzerinde nokta al')).toContain('Önce bir çember');
    expect(fails('XY doğru parçası üzerinde nokta al', withSegment())).toContain('XY');
    expect(runWith(handlers, 'A noktasını AB doğru parçası üzerine bağla', withSegment()).ok).toBe(false);
  });

  it('puts an existing point onto an object (fallback for edit), refusing cycles', () => {
    const r = ok('C noktasını AB doğru parçası üzerine koy', withSegment());
    const c = point(r.objects, 'C');
    expect(c).toMatchObject({ x: 2, y: 0, onObjectId: byType(r.objects, 'segment')[0].id });
    expect(byType(r.objects, 'point')).toHaveLength(4);
    expect(r.selectedIds).toEqual([c.id]);
    expect(topHandler('C noktasını AB doğru parçası üzerine koy', withSegment())).toBe('basic.pointOnObject');
    expect(fails('A noktasını AB doğru parçası üzerine koy', withSegment())).toContain('oluşturan noktalardan');
    const helperLine = ok("C'den geçen yatay doğru", pts());
    expect(fails('C noktasını doğrunun üzerine koy', helperLine.objects)).toContain('oluşturan noktalardan');
    expect(fails('D noktasını AB doğru parçası üzerinde oluştur', withSegment())).toContain('zaten var');
  });
});

// ------------------------------------------------------------------------------------------------ doğru parçaları

describe('segments', () => {
  it('legacy: AB doğru parçası çiz uses existing points with the tool literal', () => {
    const r = ok('AB doğru parçası çiz', pts());
    const [seg] = byType(r.objects, 'segment');
    expect(seg).toMatchObject({ label: '[AB]', startPointId: point(r.objects, 'A').id, endPointId: point(r.objects, 'B').id, color: '#0284c7', showLength: true, thickness: 2.5, showLabel: true });
    expect(r.selectedIds).toEqual([seg.id]);
    expect(r.objects).toHaveLength(5);
  });

  it.each([
    'AB doğru parçası çiz', '[AB] çiz', "A ile B'yi birleştir", 'A ve B noktalarını birleştir', "A'dan B'ye doğru parçası", "A'dan B'ye doğru çiz",
    'A ile B arasına doğru parçası çiz', 'A ile B noktaları arasına bir çizgi çek', 'ab doğru parçası çiz', 'AB doğru parçasını çizebilir misin lütfen',
    'AB doğru parçası istiyorum', 'AB doğru parçası olsun', 'A ve B yi birleştiren doğru parçası', "A'yı B'ye bağla", "B'den A'ya doğru parçası çiz",
    'AB parçasını oluşturalım', 'A ile B arasındaki doğru parçasını çizin',
  ])('joins A and B: %s', text => {
    const r = ok(text, pts());
    const segs = byType(r.objects, 'segment');
    expect(segs).toHaveLength(1);
    expect(new Set([segs[0].startPointId, segs[0].endPointId])).toEqual(new Set([point(r.objects, 'A').id, point(r.objects, 'B').id]));
    expect(byType(r.objects, 'point')).toHaveLength(4);
  });

  it('creates missing endpoints beside the drawing', () => {
    const empty = ok('AB doğru parçası çiz');
    expect(dist(point(empty.objects, 'A'), point(empty.objects, 'B'))).toBe(4);
    expect(point(empty.objects, 'A').y).toBe(point(empty.objects, 'B').y);
    expect(empty.message).toContain('noktaları da oluşturuldu');
    const oneMissing = ok('AE doğru parçası çiz', pts());
    const e = point(oneMissing.objects, 'E');
    expect(dist(e, point(oneMissing.objects, 'A'))).toBeCloseTo(4, 9);
    expect(dist(e, point(oneMissing.objects, 'B'))).toBeGreaterThan(0.75);
    const plain = ok('doğru parçası çiz', pts());
    expect(byType(plain.objects, 'segment')).toHaveLength(1);
    expect(plain.message).toContain('4 birim');
  });

  it('coordinates create or reuse points', () => {
    const r = ok('(0,0) ile (4,3) arasında doğru parçası çiz');
    const [seg] = byType(r.objects, 'segment');
    expect(dist(pointById(r.objects, seg.startPointId), pointById(r.objects, seg.endPointId))).toBe(5);
    const reuse = ok('(0,0) ile (4,3) arasında doğru parçası çiz', pts());
    expect(byType(reuse.objects, 'segment')[0].startPointId).toBe(point(reuse.objects, 'A').id);
    const namedCoords = ok('A(1,1) ile B(5,4) noktalarını birleştir');
    expect([point(namedCoords.objects, 'A'), point(namedCoords.objects, 'B')].map(p => [p.x, p.y])).toEqual([[1, 1], [5, 4]]);
  });

  it.each([
    ["A'dan başlayan 5 birimlik doğru parçası", 5, 0, 'br'],
    ['A noktasından başlayan, 6 br uzunluğunda doğru parçası çiz', 6, 0, 'br'],
    ["A'dan başlayan 3,5 birimlik doğru parçası", 3.5, 0, 'br'],
    ["A'dan başlayan iki buçuk birimlik doğru parçası çiz", 2.5, 0, 'br'],
    ["A'dan yukarı doğru 3 birimlik doğru parçası çiz", 0, 3, 'br'],
    ["A'dan sola 2 birimlik doğru parçası çiz", -2, 0, 'br'],
    ["A'dan başlayan 4 cm uzunluğunda doğru parçası", 4, 0, 'cm'],
    ["A'dan başlayan 30 derece eğimli 4 birimlik doğru parçası", 4 * Math.cos(Math.PI / 6), 2, 'br'],
  ] as const)('given length: %s', (text, x, y, unit) => {
    const r = ok(text, pts());
    const [seg] = byType(r.objects, 'segment');
    const end = pointById(r.objects, seg.endPointId);
    expect(seg.startPointId).toBe(point(r.objects, 'A').id);
    expect(end.x).toBeCloseTo(x, 6);
    expect(end.y).toBeCloseTo(y, 6);
    expect(seg.unit).toBe(unit);
    expect(end.color).toBe('#0284c7');
    expect(r.message).toContain(unit);
  });

  it('given length towards a point and with new names', () => {
    const toward = ok("A'dan C'ye doğru 2 birimlik doğru parçası çiz", pts());
    const end = pointById(toward.objects, byType(toward.objects, 'segment')[0].endPointId);
    expect(end.label).toBe('E');
    expect(dist(end, { x: 0, y: 0 })).toBeCloseTo(2, 6);
    expect(end.y / end.x).toBeCloseTo(1.5, 6);
    const fresh = ok('uzunluğu 7 birim olan PQ doğru parçası');
    expect(dist(point(fresh.objects, 'P'), point(fresh.objects, 'Q'))).toBe(7);
    const fromEmpty = ok('5 cm uzunluğunda doğru parçası çiz');
    expect(byType(fromEmpty.objects, 'segment')[0].unit).toBe('cm');
    expect(byType(fromEmpty.objects, 'point')).toHaveLength(2);
  });

  it('several segments and polylines', () => {
    const pair = ok('AB ve CD doğru parçalarını çiz', pts());
    expect(byType(pair.objects, 'segment').map(s => s.label)).toEqual(['[AB]', '[CD]']);
    expect(pair.selectedIds).toHaveLength(2);
    const chain = ok('A, B, C, D noktalarını sırayla birleştir', pts());
    expect(byType(chain.objects, 'segment').map(s => s.label)).toEqual(['[AB]', '[BC]', '[CD]']);
    const closed = ok('A, B ve C noktalarını kapalı olarak birleştir', pts());
    expect(byType(closed.objects, 'segment').map(s => s.label)).toEqual(['[AB]', '[BC]', '[CA]']);
    const joined = ok('A B C D noktalarını birleştir', pts());
    expect(byType(joined.objects, 'segment')).toHaveLength(3);
    expect(fails('A, B, K noktalarını sırayla birleştir', pts())).toContain('K noktası bulunamadı');
  });

  it('does not duplicate an existing segment', () => {
    const scene = withSegment();
    const r = ok('AB doğru parçası çiz', scene);
    expect(r.sceneChanged).toBe(false);
    expect(r.selectedIds).toEqual([byType(scene, 'segment')[0].id]);
    expect(r.message).toContain('zaten var');
  });

  it('creation colour words', () => {
    const r = ok('kırmızı AB doğru parçası çiz', pts());
    expect(byType(r.objects, 'segment')[0].color).toBe('#ef4444');
  });

  it('rejects impossible segments', () => {
    expect(fails('ABC doğru parçası çiz')).toContain('iki noktayla');
    expect(fails('sıfır birimlik doğru parçası çiz')).toContain('sıfırdan büyük');
    expect(fails("A'dan B'ye 5 birimlik doğru parçası çiz", pts())).toContain('uzunluğunu 5 yap');
    expect(fails('AA doğru parçası çiz', pts())).toContain('iki farklı nokta');
  });
});

// ------------------------------------------------------------------------------------------------ doğrular

describe('lines', () => {
  it('legacy: AB doğru çiz', () => {
    const r = ok('AB doğru çiz', pts());
    const [l] = byType(r.objects, 'line');
    expect(l).toMatchObject({ label: 'AB Doğrusu', point1Id: point(r.objects, 'A').id, point2Id: point(r.objects, 'B').id, showEquation: true, color: '#0284c7', thickness: 2 });
    expect(r.message).toContain('y = 0');
  });

  it.each([
    'AB doğrusunu çiz', "A ve B'den geçen doğru", 'A ve B noktalarından geçen doğru', "A ile B'yi birleştiren doğru", 'ab doğrusu', 'AB doğrusunu çizer misin',
    'A noktası ile B noktasından geçen doğruyu çiz',
  ])('line through A and B: %s', text => {
    const r = ok(text, pts());
    const lines = byType(r.objects, 'line');
    expect(lines).toHaveLength(1);
    expect(new Set([lines[0].point1Id, lines[0].point2Id])).toEqual(new Set([point(r.objects, 'A').id, point(r.objects, 'B').id]));
  });

  it.each([
    ["A'dan geçen yatay doğru", 'h'], ['A noktasından geçen yatay bir doğru çiz', 'h'], ["A'dan geçen x eksenine paralel doğru", 'h'],
    ["A'dan geçen y eksenine dik doğru", 'h'], ['A noktasından geçen dikey doğru çiz', 'v'], ["A'dan geçen düşey doğru", 'v'],
    ["A'dan geçen y eksenine paralel doğru", 'v'], ['x eksenine dik ve A dan geçen doğru', 'v'],
  ] as const)('%s stays %s after moving A', (text, kind) => {
    const r = ok(text, pts());
    const [l] = byType(r.objects, 'line');
    const helper = pointById(r.objects, l.point2Id);
    expect(l.point1Id).toBe(point(r.objects, 'A').id);
    expect(helper.construction).toMatchObject({ kind: 'translate', sourceId: point(r.objects, 'A').id });
    const moved = move(r.objects, 'A', { x: 1.5, y: -2 });
    const h = pointById(moved, helper.id);
    if (kind === 'h') { expect(h.y).toBeCloseTo(-2, 9); expect(h.x).not.toBeCloseTo(1.5, 3); }
    else { expect(h.x).toBeCloseTo(1.5, 9); expect(h.y).not.toBeCloseTo(-2, 3); }
  });

  it.each([
    ["eğimi 2 olan ve A'dan geçen doğru", 2, [0, 0]],
    ['(1,2) noktasından geçen, eğimi -1/2 olan doğru', -0.5, [1, 2]],
    ['orijinden geçen eğimi 3 olan doğru', 3, [0, 0]],
    ['eğimi 45 derece olan doğru', 1, [0, 0]],
    ['eğimi 0,5 olan C noktasından geçen doğru', 0.5, [2, 3]],
    ["C'den geçen 4 eğimli doğru", 4, [2, 3]],
    ['eğimi -3 olan doğru çiz', -3, [0, 0]],
  ] as const)('slope: %s', (text, m, through) => {
    const r = ok(text, pts());
    const [l] = byType(r.objects, 'line');
    expect(slope(l, r.objects)).toBeCloseTo(m, 9);
    expect([pointById(r.objects, l.point1Id).x, pointById(r.objects, l.point1Id).y]).toEqual(through);
    const moved = move(r.objects, pointById(r.objects, l.point1Id).label, { x: -3, y: 7 });
    expect(slope(l, moved)).toBeCloseTo(m, 9);
  });

  it('vertical slope and x = k', () => {
    const vertical = ok("eğimi 90 derece olan ve A'dan geçen doğru", pts());
    const [l] = byType(vertical.objects, 'line');
    expect(pointById(vertical.objects, l.point2Id).x).toBeCloseTo(0, 12);
    const r = ok('x = 3 doğrusu');
    const [xl] = byType(r.objects, 'line');
    expect(xl.label).toBe('x = 3');
    expect([pointById(r.objects, xl.point1Id), pointById(r.objects, xl.point2Id)].map(p => [p.x, p.y])).toEqual([[3, 0], [3, 2]]);
    const moved = move(r.objects, pointById(r.objects, xl.point1Id).label, { x: 5, y: 1 });
    expect(pointById(moved, xl.point2Id)).toMatchObject({ x: 5, y: 3 });
    const negative = ok('x=-2,5');
    expect(pointById(negative.objects, byType(negative.objects, 'line')[0].point1Id).x).toBe(-2.5);
    expect(topHandler('x = 3 doğrusunu çiz')).toBe('basic.verticalLine');
  });

  it('cascade: deleting the through point removes helper and line', () => {
    const r = ok("A'dan geçen yatay doğru", pts());
    const s = new CommandScene(r.objects);
    const removed = s.remove([point(r.objects, 'A').id]);
    expect(removed).toEqual(expect.arrayContaining([byType(r.objects, 'line')[0].id, byType(r.objects, 'line')[0].point2Id]));
  });

  it('defaults for one or no point', () => {
    const one = ok("A'dan geçen doğru çiz", pts());
    const [l] = byType(one.objects, 'line');
    expect(pointById(one.objects, l.point2Id).construction).toBeUndefined();
    expect(one.message).toContain('Yön belirtilmediği');
    const none = ok('bir doğru çiz');
    expect(byType(none.objects, 'point')).toHaveLength(2);
    expect(byType(ok('AB ve CD doğrularını çiz', pts()).objects, 'line')).toHaveLength(2);
  });

  it('rejects impossible lines', () => {
    expect(fails("A ve B'den geçen yatay doğru", pts())).toContain('yalnızca geçtiği noktayı');
    expect(fails('ABC doğrusunu çiz', pts())).toContain('iki noktayla');
    expect(fails('eğimi 1/0 olan doğru')).toContain('paydası');
  });
});

// ------------------------------------------------------------------------------------------------ ışınlar

describe('rays', () => {
  it('legacy: AB ışın çiz', () => {
    const r = ok('AB ışın çiz', pts());
    const [ray] = byType(r.objects, 'ray');
    expect(ray).toMatchObject({ label: 'AB Işını', startPointId: point(r.objects, 'A').id, throughPointId: point(r.objects, 'B').id, color: '#0284c7', thickness: 2 });
  });

  it.each([
    'AB ışınını çiz', "A noktasından başlayıp B'den geçen ışın", "A'dan başlayan ve B'den geçen ışın çiz", 'başlangıç noktası A olan ve B den geçen ışın',
    "B'den geçen ve A'dan başlayan ışın", "A'dan B'ye doğru ışın", 'ucu A olan ve B noktasından geçen ışın',
  ])('starts at A through B: %s', text => {
    const r = ok(text, pts());
    const [ray] = byType(r.objects, 'ray') as RayObject[];
    expect(ray.startPointId).toBe(point(r.objects, 'A').id);
    expect(ray.throughPointId).toBe(point(r.objects, 'B').id);
  });

  it("B'den başlayıp A'dan geçen ışın starts at B", () => {
    const [ray] = byType(ok("B'den başlayıp A'dan geçen ışın", pts()).objects, 'ray');
    expect(pointById(pts(), ray.startPointId)?.label ?? '').toBe('');
    const r = ok("B'den başlayıp A'dan geçen ışın", pts());
    expect(pointById(r.objects, byType(r.objects, 'ray')[0].startPointId).label).toBe('B');
  });

  it.each([
    ["B'den çıkan 30 derecelik ışın", 'B', 30],
    ["A'dan yukarı doğru ışın çiz", 'A', 90],
    ["A'dan saat yönünde 45 derecelik ışın çiz", 'A', -45],
    ["x ekseniyle 60 derece açı yapan ve A'dan başlayan ışın", 'A', 60],
    ["C'den sola doğru ışın", 'C', 180],
  ] as const)('direction: %s', (text, start, degrees) => {
    const r = ok(text, pts());
    const [ray] = byType(r.objects, 'ray');
    const s = pointById(r.objects, ray.startPointId), t = pointById(r.objects, ray.throughPointId);
    expect(s.label).toBe(start);
    expect(Math.atan2(t.y - s.y, t.x - s.x) * 180 / Math.PI).toBeCloseTo(degrees, 9);
    const moved = move(r.objects, start, { x: 9, y: 9 });
    const t2 = pointById(moved, ray.throughPointId);
    expect(Math.atan2(t2.y - 9, t2.x - 9) * 180 / Math.PI).toBeCloseTo(degrees, 9);
  });

  it('default direction and failures', () => {
    const r = ok('A noktasından başlayan ışın', pts());
    expect(pointById(r.objects, byType(r.objects, 'ray')[0].throughPointId).construction).toBeUndefined();
    expect(r.message).toContain('Yön belirtilmediği');
    expect(byType(ok('ışın çiz').objects, 'point')).toHaveLength(2);
    expect(fails('ABC ışını çiz', pts())).toContain('başlangıç noktası');
  });
});

// ------------------------------------------------------------------------------------------------ açılar

describe('angles', () => {
  it('ABC açısını çiz: angle tool literal with arms, no duplicates', () => {
    const r = ok('ABC açısını çiz', pts());
    const [angle] = byType(r.objects, 'angle');
    expect(angle).toMatchObject({ label: '∠ABC', vertexPointId: point(r.objects, 'B').id, color: '#f59e0b', showValue: true });
    const arms = byType(r.objects, 'segment');
    expect(arms.map(a => a.label)).toEqual(['[BA]', '[BC]']);
    expect(arms.every(a => a.showLabel === false && a.thickness === 2 && a.color === '#f59e0b')).toBe(true);
    expect(r.selectedIds).toEqual([angle.id]);
    // Kolu silinen açı boşlukta asılı kalmaz (silme zinciri: kolu artık hiçbir şekil çizmiyor)
    expect(new CommandScene(r.objects).remove([arms[0].id])).toContain(angle.id);
    // Kollar açıyla birlikte çizildi: açının KENDİSİ silinince turuncu kolları da gider, noktalar kalır
    expect(arms.every(a => a.armOfAngleId === angle.id)).toBe(true);
    expect(new CommandScene(r.objects).remove([angle.id]).sort()).toEqual([angle.id, ...arms.map(a => a.id)].sort());
    const again = ok('ABC açısını çiz', r.objects);
    expect(byType(again.objects, 'angle')).toHaveLength(1);
    expect(byType(again.objects, 'segment')).toHaveLength(2);
    expect(again.message).toContain('zaten');
    const existingArm = ok('ABC açısını oluştur', withSegment());
    expect(byType(existingArm.objects, 'segment')).toHaveLength(2);
    // Var olan [AB] kullanıcınındır: açı silinince yalnızca açıyla çizilen [BC] gider
    const ownArms = byType(existingArm.objects, 'segment').filter(s => s.armOfAngleId);
    const [exAngle] = byType(existingArm.objects, 'angle');
    expect(ownArms.map(s => s.label)).toEqual(['[BC]']);
    expect(new CommandScene(existingArm.objects).remove([exAngle.id]).sort()).toEqual([exAngle.id, ownArms[0].id].sort());
    expect(byType(ok('abc açısını çiz', pts()).objects, 'angle')).toHaveLength(1);
  });

  it.each([
    ['60 derecelik açı çiz', 60], ['45 derecelik açı çiz', 45], ['kırk beş derecelik açı oluştur', 45], ['45° açı çiz', 45],
    ['ölçüsü 45 derece olan açı', 45], ['45 derece açı çizer misin', 45], ['bana 45 derecelik bir açı lazım', 45], ['dik açı çiz', 90],
    ['geniş açı çiz', 120], ['dar açı çiz', 45], ['120° açı çiz', 120], ['270 derecelik açı çiz', 270], ['açı çiz', 60], ['179,5 derecelik açı', 179.5],
  ] as const)('%s → %s°', (text, degrees) => {
    const r = ok(text);
    const [angle] = byType(r.objects, 'angle');
    expect(angleValue(r.objects, angle)).toBeCloseTo(degrees, 6);
    expect(byType(r.objects, 'point')).toHaveLength(3);
    expect(dist(pointById(r.objects, angle.vertexPointId), pointById(r.objects, angle.point1Id))).toBeCloseTo(4, 9);
    expect(angle.reflex ?? false).toBe(degrees > 180);
    expect(pointById(r.objects, angle.vertexPointId).label).toBe('B');
  });

  it('derecelik açı silinince açıyla çizilen kolları da gider, noktalar kalır', () => {
    const r = ok('60 derecelik açı çiz');
    const [angle] = byType(r.objects, 'angle');
    const arms = byType(r.objects, 'segment');
    expect(arms).toHaveLength(2);
    expect(arms.every(a => a.armOfAngleId === angle.id)).toBe(true);
    expect(new CommandScene(r.objects).remove([angle.id]).sort()).toEqual([angle.id, ...arms.map(a => a.id)].sort());
  });

  it('clockwise, arm length and colour', () => {
    const cw = ok('saat yönünde 60 derecelik açı');
    const [angle] = byType(cw.objects, 'angle');
    expect(pointById(cw.objects, angle.point3Id).y).toBeLessThan(pointById(cw.objects, angle.vertexPointId).y);
    const long = ok('kolları 6 birim olan 50 derecelik açı çiz');
    const [a2] = byType(long.objects, 'angle');
    expect(dist(pointById(long.objects, a2.vertexPointId), pointById(long.objects, a2.point3Id))).toBeCloseTo(6, 9);
    expect(byType(ok('mavi 30 derecelik açı çiz').objects, 'angle')[0].color).toBe('#2563eb');
  });

  it.each([
    ['A köşeli 45 derecelik açı', 'A', 45],
    ['B köşeli, 45 derecelik açı çiz', 'B', 45],
    ['A köşesinde 30° lik açı oluştur', 'A', 30],
    ['köşesi K olan 50 derecelik açı', 'K', 50],
    ['(2,1) köşeli dik açı çiz', 'E', 90],
    ['D noktasında 100 derecelik açı çiz', 'D', 100],
  ] as const)('vertex given: %s', (text, vertex, degrees) => {
    const r = ok(text, pts());
    const [angle] = byType(r.objects, 'angle');
    const v = pointById(r.objects, angle.vertexPointId);
    expect(v.label).toBe(vertex);
    expect(angleValue(r.objects, angle)).toBeCloseTo(degrees, 6);
    // yeni kollar var olan noktaların üzerine düşmez
    for (const id of [angle.point1Id, angle.point3Id]) for (const p of byType(pts(), 'point')) expect(dist(pointById(r.objects, id), p)).toBeGreaterThan(0.5);
  });

  it('three-letter names with some points missing', () => {
    const r = ok('EAF açısını 90 derece çiz', pts());
    const [angle] = byType(r.objects, 'angle');
    expect(angle.label).toBe('∠EAF');
    expect(angleValue(r.objects, angle)).toBeCloseTo(90, 6);
    const rotated = ok('BCE açısını 30 derece olarak çiz', pts());
    const [a2] = byType(rotated.objects, 'angle');
    expect(angleValue(rotated.objects, a2)).toBeCloseTo(30, 6);
    expect(dist(point(rotated.objects, 'E'), point(rotated.objects, 'C'))).toBeCloseTo(dist(point(rotated.objects, 'B'), point(rotated.objects, 'C')), 6);
    const fresh = ok('40 derecelik PQR açısı çiz');
    const olsun = ok('PQR açısı 40 derecelik olsun');
    expect(angleValue(olsun.objects, byType(olsun.objects, 'angle')[0])).toBeCloseTo(40, 6);
    expect(angleValue(fresh.objects, byType(fresh.objects, 'angle')[0])).toBeCloseTo(40, 6);
    expect(fails('AKC açısını çiz', pts())).toContain('K köşesi bulunamadı');
    expect(fails('ABC açısını 50 derece olarak çiz', pts())).toContain('açısını 50 derece yap');
  });

  it('angle at a polygon corner or between two segments', () => {
    const r = ok('ABC üçgeninin B açısını çiz', triangle());
    const [angle] = byType(r.objects, 'angle');
    expect(angle.vertexPointId).toBe(point(r.objects, 'B').id);
    expect(byType(r.objects, 'segment')).toHaveLength(0);
    expect(angleValue(r.objects, angle)).toBeCloseTo(Math.atan2(3, 4) * 180 / Math.PI, 9);
    expect(byType(ok('B noktasındaki açıyı çiz', triangle()).objects, 'angle')).toHaveLength(1);

    const concave = build(s => {
      const ids = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 2, y: 1 }].map((p, i) => s.addPoint(p, { label: 'KLMN'[i] }).id);
      s.addPolygon(ids);
    });
    const reflex = ok('N açısını çiz', concave);
    const [ra] = byType(reflex.objects, 'angle');
    expect(ra.reflex).toBe(true);
    expect(angleValue(reflex.objects, ra)).toBeGreaterThan(180);

    const vee = build(s => { s.addSegment(s.findPoint('A')!.id, s.findPoint('B')!.id); s.addSegment(s.findPoint('A')!.id, s.findPoint('C')!.id); }, pts());
    const between = ok('A köşesindeki açıyı çiz', vee);
    expect(byType(between.objects, 'angle')[0].vertexPointId).toBe(point(between.objects, 'A').id);
    expect(fails('D açısını çiz', pts())).toContain('kollarını belirleyemedim');
  });

  it('rejects invalid sizes', () => {
    expect(fails('400 derecelik açı çiz')).toContain('360');
    expect(fails('0 derecelik açı çiz')).toContain('360');
  });
});

// ------------------------------------------------------------------------------------------------ ayrım ve çok cümle

describe('ownership', () => {
  const scene = build(s => {
    const o = s.addPoint({ x: 10, y: 0 }, { label: 'P' });
    s.addCircle({ centerId: o.id, radius: 2 });
    s.addPolygon([s.findPoint('A')!.id, s.findPoint('B')!.id, s.findPoint('C')!.id], { kind: 'triangle' });
    s.addSegment(s.findPoint('A')!.id, s.findPoint('B')!.id);
  }, pts());

  it.each([
    'bir ejderha çiz', 'AB orta noktasını oluştur', 'B noktasından dik indir', 'P noktasından çembere teğet doğru çiz', 'ABC üçgeninin alanını hesapla',
    'A noktasının açısını yaz', 'ABC açısını 60 derece yap', "AB'nin uzunluğunu 5 yap", 'A noktasını sil', 'AB doğrusunu kırmızı yap', "A'yı (3;4)'e taşı",
    'nokta aracını seç', 'yarıçapı 3 olan çember çiz', 'kare çiz', 'f(x) = x^2', 'a = 2', 'AB = 5', "BC'ye A'dan paralel doğru çiz", 'x eksenini göster',
    "ABC'yi x eksenine göre yansıt", '3 4 5 üçgeni olsun', 'AB ile CD doğrularının kesişim noktasını bul', "ABC'yi AB vektörü kadar ötele",
    'A noktasının koordinatlarını yaz', 'AB doğrusunun eğimini göster', 'AB doğrusunun denklemini yaz', 'ABC açısını ölç', 'AB doğru parçasının uzunluğunu ölç',
    '[AB] uzunluğu kaç', 'AB doğru parçasını 2 birim uzat', 'ABC üçgeninin açılarını göster', 'açıortay çiz', 'y = 2x + 1 doğrusunu çiz', 'geri al',
    'A noktasını AB doğru parçası üzerine bağla', 'ABC açısını dış açı yap', 'AB doğru parçası 5 birim olsun', '|AB| kaç', 'tüm noktaları seç',
    'üçgen uzunluklarını kaydırıcıya bağla', 'C noktasından AB ye yükseklik çiz', 'A merkezli 3 yarıçaplı çember',
  ])('no basic handler for: %s', text => {
    const s = new CommandScene(scene);
    expect(rankHandlers(parseClause(text, s.known()), s, handlers).map(r => r.handler.id)).toEqual([]);
  });

  it('vectors are explained, not guessed', () => {
    expect(fails('AB vektörü çiz', pts())).toContain('vektör nesnesi yok');
    expect(runWith(handlers, 'bir ejderha çiz').ok).toBe(false);
  });

  it('multi-clause commands share the evolving scene', () => {
    const r = ok('A(0,0), B(4,0) ve C(2,3) noktalarını oluştur sonra ABC açısını çiz');
    expect(byType(r.objects, 'angle')).toHaveLength(1);
    expect(r.selectedIds).toEqual([byType(r.objects, 'angle')[0].id]);
    const two = ok('AB doğru parçası çiz ve CD doğrusunu çiz', pts());
    expect(byType(two.objects, 'segment')).toHaveLength(1);
    expect(byType(two.objects, 'line')).toHaveLength(1);
    expect(two.selectedIds).toEqual([byType(two.objects, 'line')[0].id]);
    const failing = runWith(handlers, 'AB doğru parçası çiz ve AA doğrusunu çiz', pts());
    expect(failing.ok).toBe(false);
    expect(failing.ok ? '' : failing.message).toContain('2. işlem');
  });

  it('never mutates the input scene and keeps ids unique', () => {
    const scene0 = pts();
    const snapshot = JSON.stringify(scene0);
    for (const text of ['AB doğru parçası çiz', 'A = (9;9)', "A'dan geçen yatay doğru", '60 derecelik açı çiz', 'AB üzerinde 2 nokta al']) {
      runWith(handlers, text, scene0);
    }
    expect(JSON.stringify(scene0)).toBe(snapshot);
    const lines = byType(ok('AB ve CD doğrularını çiz', pts()).objects, 'line') as LineObject[];
    expect(new Set(lines.map(l => l.id)).size).toBe(2);
    const segs = byType(ok('A, B, C, D noktalarını sırayla birleştir', pts()).objects, 'segment') as SegmentObject[];
    expect(segs.every(s => s.id.startsWith('seg-'))).toBe(true);
    const poly = byType(triangle(), 'polygon') as PolygonObject[];
    expect(poly).toHaveLength(1);
  });
});
