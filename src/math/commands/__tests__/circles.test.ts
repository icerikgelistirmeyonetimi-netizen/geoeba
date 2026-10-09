import { describe, expect, it } from 'vitest';
import type { ArcObject, CircleObject, EllipseObject, MathObject, Point2D, PointObject, SectorObject } from '@/types/math';
import { collectDependentIds } from '@/state/WorkspaceContext';
import { commandCircleGeometry, resolveCommandBindings } from '../../commandBindings';
import { handlers } from '../handlers/circles';
import { CommandScene } from '../scene';
import { parseClause } from '../text';
import { build, byType, dist, expectFail, expectOk, point } from './helpers';

const PERGEL = '#8b5cf6';

/** A(0,0), B(3,0), C(0,3) */
const S3 = () => build(s => {
  s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  s.addPoint({ x: 3, y: 0 }, { label: 'B' });
  s.addPoint({ x: 0, y: 3 }, { label: 'C' });
});
const ok = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectOk(handlers, text, scene, selection);
const bad = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectFail(handlers, text, scene, selection);
const onlyOne = <T extends MathObject['type']>(objects: MathObject[], type: T) => {
  const list = byType(objects, type);
  expect(list).toHaveLength(1);
  return list[0];
};
const pt = (objects: MathObject[], id: string) => objects.find(o => o.id === id) as PointObject;
const geometry = (objects: MathObject[], circle: CircleObject) => commandCircleGeometry(circle, id => pt(objects, id));
const move = (objects: MathObject[], label: string, x: number, y: number) =>
  resolveCommandBindings(objects.map(o => (o.type === 'point' && o.label === label ? ({ ...o, x, y } as MathObject) : o)));
const near = (a: Point2D, b: Point2D) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
};
const score = (text: string, objects: MathObject[] = S3()) => {
  const scene = new CommandScene(objects);
  const clause = parseClause(text, scene.known());
  return Math.max(...handlers.map(h => h.match(clause, scene)));
};
const pointCount = (objects: MathObject[]) => byType(objects, 'point').length;

describe('circles: every example works', () => {
  const examples = handlers.flatMap(h => h.examples.map(e => [h.id, e] as const));
  it('has 6–20 examples per handler', () => {
    for (const h of handlers) {
      expect(h.examples.length).toBeGreaterThanOrEqual(6);
      expect(h.examples.length).toBeLessThanOrEqual(20);
    }
    expect(examples.length).toBeGreaterThanOrEqual(30);
  });
  it.each(examples)('%s: %s', (_, example) => {
    const scene = S3();
    const r = ok(example, scene);
    expect(r.objects.length).toBeGreaterThan(scene.length);
    expect(r.sceneChanged).toBe(true);
    expect(r.selectedIds.length).toBeGreaterThan(0);
    expect(r.message.length).toBeGreaterThan(10);
  });
});

describe('circles: legacy behaviour', () => {
  it('“çember çiz” on an empty scene: center A at the origin, fixed radius 2', () => {
    const r = ok('çember çiz');
    const a = point(r.objects, 'A');
    expect([a.x, a.y]).toEqual([0, 0]);
    const c = onlyOne(r.objects, 'circle');
    expect(c).toMatchObject({ centerPointId: a.id, fixedRadius: 2, fillOpacity: 0, color: '#8b5cf6', label: 'A Çemberi (r = 2)' });
    expect(c.radiusPointId).toBeUndefined();
    expect(c.throughPointIds).toBeUndefined();
    expect(r.selectedIds).toEqual([c.id]);
    expect(r.message).toContain('Yarıçap yazılmadığı için 2 alındı');
  });
  it.each([
    ['yarıçapı 2 olan çember çiz', 2],
    ['yarıçapı 3 olan çember çiz', 3],
    ['Yarıçapı 4 olan çember çiz', 4],
    ['Çapı 8 olan çember çiz', 4],
  ])('%s → center A(0;0), r = %d', (text, radius) => {
    const r = ok(text);
    const a = point(r.objects, 'A');
    expect([a.x, a.y]).toEqual([0, 0]);
    expect(onlyOne(r.objects, 'circle').fixedRadius).toBe(radius);
  });
  it('reuses an existing named center', () => {
    const scene = S3();
    const r = ok('A noktası merkezli Yarıçapı 3 olan çember çiz', scene);
    expect(r.objects).toHaveLength(scene.length + 1);
    expect(onlyOne(r.objects, 'circle')).toMatchObject({ centerPointId: point(scene, 'A').id, fixedRadius: 3 });
    expect(r.message).toBe('Merkezi A, yarıçapı 3 olan çember çizildi.');
  });
  it('rejects a negative radius', () => {
    expect(bad('yarıçapı -2 olan çember çiz')).toContain('0’dan büyük');
  });
  it('places a point on the default circle for the tangent flow', () => {
    const r = ok('çember çiz');
    const g = geometry(r.objects, onlyOne(r.objects, 'circle'));
    expect(dist(g.center, { x: 2, y: 0 })).toBeCloseTo(g.radius, 9);
  });
});

describe('circles: radius phrasing', () => {
  it.each([
    ['yarıçapı 2,5 olan çember çiz', 2.5],
    ['yarıçapı iki buçuk olan çember çiz', 2.5],
    ['3 yarıçaplı çember çiz', 3],
    ['3 cm yarıçaplı bir çember çizer misin', 3],
    ['r = 4 olan çember çiz', 4],
    ['r=1,5 çember', 1.5],
    ['çapı 10 olan çember çiz', 5],
    ['8 çaplı çember oluştur', 4],
    ['5 birimlik çember çiz', 5],
    ["5 cm'lik bir çember çizin", 5],
    ['yarıçapı 3 birim olan bir çember istiyorum', 3],
    ['lütfen yarıçapı 6 olan bir çember çizebilir misin', 6],
    ['çevresi 6π olan çember çiz', 3],
    ['alanı 9π olan çember çiz', 3],
    ['çember çiz yarıçapı 7 olsun', 7],
    ['bir çember çiz', 2],
    ['yarıçapı bir olan çember', 1],
    ['yuvarlak çiz', 2],
    ['yarıçap uzunluğu 4 olan çember oluşturalım', 4],
    ['pergelle 3 birim açıklıkla çember çiz', 3],
    ['Kırmızı bir çember çiz', 2],
  ])('%s → r = %d', (text, radius) => {
    const r = ok(text);
    const c = onlyOne(r.objects, 'circle');
    expect(c.fixedRadius).toBeCloseTo(radius, 9);
    expect(pointCount(r.objects)).toBe(1);
  });
  it('mentions diameter, circumference and area conversions', () => {
    expect(ok('Çapı 8 olan çember çiz').message).toContain('çapı 8');
    expect(ok('çevresi 12 olan çember çiz').message).toContain('çevresi 12');
    expect(onlyOne(ok('çevresi 12 olan çember çiz').objects, 'circle').fixedRadius).toBeCloseTo(12 / (2 * Math.PI), 8);
  });
  it.each([
    ['yarıçapı 0 olan çember çiz', 'Yarıçap'],
    ['çapı -4 olan çember çiz', 'Çap'],
    ['yarıçapı 20000 olan çember çiz', '10000'],
    ['alanı -3 olan daire çiz', 'Alan'],
  ])('rejects %s', (text, fragment) => {
    expect(bad(text)).toContain(fragment);
  });
  it('refuses to guess what an unexplained number or label means', () => {
    expect(bad('çember çiz 5')).toContain('5 sayısını');
    expect(bad('A merkezli çember çiz B', S3())).toContain('B adını');
    expect(bad('birim çember çiz yarıçapı 3')).toContain('Birim çember');
  });
});

describe('circles: center phrasing', () => {
  it.each([
    ['A merkezli, yarıçapı 4 olan çember oluştur', 'A', 4],
    ['merkezi A olan 4 birim yarıçaplı çember', 'A', 4],
    ["A'yı merkez alan 2 yarıçaplı çember çiz", 'A', 2],
    ['merkezi B noktası olan yarıçapı 1 olan çember', 'B', 1],
    ['B noktasını merkez kabul eden 2 yarıçaplı çember', 'B', 2],
    ['a merkezli yarıçapı 2 olan çember çiz', 'A', 2],
    ['c merkezli çember çiz', 'C', 2],
    ['orijin merkezli yarıçapı 2 olan çember', 'A', 2],
    ['merkezi orijinde olan 1 yarıçaplı çember', 'A', 1],
    ['(0;0) merkezli çember', 'A', 2],
    ['C (0; 3) merkezli 2 yarıçaplı çember', 'C', 2],
  ])('%s → existing %s', (text, label, radius) => {
    const scene = S3();
    const r = ok(text, scene);
    expect(pointCount(r.objects)).toBe(3);
    expect(onlyOne(r.objects, 'circle')).toMatchObject({ centerPointId: point(scene, label).id, fixedRadius: radius });
  });
  it.each([
    ['(1; 2) merkezli 3 yarıçaplı çember çiz', { x: 1, y: 2 }],
    ['merkezi (1;2) yarıçapı 3 olan çember', { x: 1, y: 2 }],
    ['merkez noktası (-2; 1,5) olan yarıçapı 1 olan çember çiz', { x: -2, y: 1.5 }],
  ])('%s → new center', (text, at) => {
    const scene = S3();
    const r = ok(text, scene);
    const circle = onlyOne(r.objects, 'circle');
    const center = pt(r.objects, circle.centerPointId);
    expect(center.label).toBe('D');
    near(center, at);
    expect(r.message).toContain('D (');
  });
  it('creates a named center at the given or free position', () => {
    const named = ok('A(5;5) merkezli 1 yarıçaplı çember');
    expect(point(named.objects, 'A')).toMatchObject({ x: 5, y: 5 });
    const k = ok('K merkezli yarıçapı 2 olan çember çiz');
    expect(point(k.objects, 'K')).toMatchObject({ x: 0, y: 0 });
    const beside = ok('K merkezli yarıçapı 2 olan çember çiz', S3());
    expect(point(beside.objects, 'K').x - 2).toBeGreaterThan(3);
    expect(bad('A(5;5) merkezli çember', S3())).toContain('zaten');
  });
  it('places a new center beside the existing drawing', () => {
    const r = ok('yarıçapı 2 olan çember çiz', S3());
    const center = pt(r.objects, onlyOne(r.objects, 'circle').centerPointId);
    expect(center.label).toBe('D');
    expect(center.x - 2).toBeGreaterThan(3);
  });
  it('understands “O merkezli” although “o” is a pronoun', () => {
    const scene = build(s => { s.addPoint({ x: 2, y: 2 }, { label: 'O' }); s.addPoint({ x: 5, y: 2 }, { label: 'A' }); });
    const o = point(scene, 'O');
    expect(onlyOne(ok('O merkezli yarıçapı 3 olan çember çiz', scene).objects, 'circle').centerPointId).toBe(o.id);
    expect(onlyOne(ok('merkezi O olan 2 yarıçaplı çember', scene).objects, 'circle').centerPointId).toBe(o.id);
    expect(onlyOne(ok('O merkezli çember çiz').objects, 'circle').fixedRadius).toBe(2);
    // Çekirdek artık büyük harfli “O”yu etiket olarak tanıyor: merkez A, çember O'dan geçer.
    const through = onlyOne(ok('O noktasından geçen A merkezli çember', scene).objects, 'circle');
    expect([through.centerPointId, through.radiusPointId]).toEqual([point(scene, 'A').id, o.id]);
  });
  it('uses the selected or previously mentioned point', () => {
    const scene = S3();
    const b = point(scene, 'B'), c = point(scene, 'C');
    expect(onlyOne(ok('onu merkez alan 3 yarıçaplı çember çiz', scene, [b.id]).objects, 'circle').centerPointId).toBe(b.id);
    expect(onlyOne(ok('seçili nokta merkezli çember çiz', scene, [c.id]).objects, 'circle').centerPointId).toBe(c.id);
    expect(bad('seçili noktayı merkez alan çember çiz', scene, [b.id, c.id])).toContain('Birden fazla');
    expect(bad('seçili noktayı merkez alan çember çiz', scene)).toContain('bulunamadı');
  });
});

describe('circles: through points', () => {
  it.each([
    "A merkezli ve B'den geçen çember çiz",
    'B noktasından geçen A merkezli çember',
    'merkezi A olan ve B noktasından geçen çember',
    "A merkezli, B'den geçen bir çember oluşturur musun",
  ])('%s → radius point', text => {
    const scene = S3();
    const r = ok(text, scene);
    const c = onlyOne(r.objects, 'circle');
    expect(c).toMatchObject({ centerPointId: point(scene, 'A').id, radiusPointId: point(scene, 'B').id, fillOpacity: 0.1, label: 'A Merkezli Çember' });
    // Ölçüler hazır gelmez: alan/çevre etiketleri ayrıca istenir (8 Ekim 2026)
    expect(c.showArea).toBeFalsy();
    expect(c.showPerimeter).toBeFalsy();
    expect(c.fixedRadius).toBeUndefined();
    expect(r.objects).toHaveLength(scene.length + 1);
    expect(r.message).toBe('Merkezi A olan ve B noktasından geçen çember çizildi.');
    expect(geometry(move(r.objects, 'B', 0, 5), c).radius).toBeCloseTo(5, 9);
  });
  it('creates the through point from coordinates', () => {
    const r = ok("(3;4)'ten geçen A merkezli çember", S3());
    const c = onlyOne(r.objects, 'circle');
    const through = pt(r.objects, c.radiusPointId!);
    expect(through).toMatchObject({ label: 'D', x: 3, y: 4 });
    expect(geometry(r.objects, c).radius).toBeCloseTo(5, 9);
  });
  it.each([
    ['A, B ve C noktalarından geçen çember çiz'],
    ['ABC noktalarından geçen çember'],
    ["A B ve C'den geçen çember"],
  ])('%s → live three-point circle', text => {
    const scene = S3();
    const r = ok(text, scene);
    const c = onlyOne(r.objects, 'circle');
    expect(c).toMatchObject({ centerPointId: '', throughPointIds: ['A', 'B', 'C'].map(l => point(scene, l).id), fillOpacity: 0, label: 'ABC Çemberi' });
    const g = geometry(r.objects, c);
    near(g.center, { x: 1.5, y: 1.5 });
    expect(g.radius).toBeCloseTo(1.5 * Math.SQRT2, 9);
    const moved = geometry(move(r.objects, 'C', 0, 4), c);
    near(moved.center, { x: 1.5, y: 2 });
  });
  it('creates three points from coordinates and reuses a matching one', () => {
    const r = ok('(0;0), (4;0) ve (0;4) noktalarından geçen çember', S3());
    expect(pointCount(r.objects)).toBe(5);
    const g = geometry(r.objects, onlyOne(r.objects, 'circle'));
    near(g.center, { x: 2, y: 2 });
    expect(g.radius).toBeCloseTo(2 * Math.SQRT2, 9);
  });
  it('uses the corners of a named triangle (disk style)', () => {
    const scene = build(s => {
      const ids = [s.addPoint({ x: 0, y: 0 }, { label: 'A' }), s.addPoint({ x: 4, y: 0 }, { label: 'B' }), s.addPoint({ x: 0, y: 2 }, { label: 'C' })].map(p => p.id);
      s.addPolygon(ids, { kind: 'triangle' });
    });
    const r = ok('ABC üçgeninin köşelerinden geçen daire çiz', scene);
    const c = onlyOne(r.objects, 'circle');
    expect(c).toMatchObject({ fillOpacity: 0.12, showArea: true, label: 'ABC Dairesi' });
    near(geometry(r.objects, c).center, { x: 2, y: 1 });
  });
  it.each([
    ["A ve B'den geçen çember çiz", 'sonsuz'],
    ['B noktasından geçen çember çiz', 'merkezini'],
    ["A merkezli ve D'den geçen çember çiz", 'D noktası bulunamadı'],
    ["A merkezli ve A'dan geçen çember çiz", 'farklı'],
    ["A merkezli, B'den geçen, yarıçapı 3 olan çember", 'yalnızca birini'],
    ["A merkezli, B ve C'den geçen çember", 'tek bir nokta'],
  ])('rejects %s', (text, fragment) => {
    expect(bad(text, S3())).toContain(fragment);
  });
  it('rejects collinear points', () => {
    const scene = build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A' }); s.addPoint({ x: 1, y: 1 }, { label: 'B' }); s.addPoint({ x: 2, y: 2 }, { label: 'C' }); });
    expect(bad('A, B ve C noktalarından geçen çember çiz', scene)).toContain('aynı doğru');
  });
});

describe('circles: diameter', () => {
  it.each([
    'AB çaplı çember çiz',
    'çapı [AB] olan çember',
    'A ve B noktalarını çap kabul eden çember',
    '[AB] doğru parçası çaplı çember çiz',
  ])('%s → live midpoint center', text => {
    const scene = S3();
    const r = ok(text, scene);
    const c = onlyOne(r.objects, 'circle');
    const m = pt(r.objects, c.centerPointId);
    expect(m.construction).toEqual({ kind: 'midpoint', pointIds: [point(scene, 'A').id, point(scene, 'B').id] });
    expect(m).toMatchObject({ label: 'D', x: 1.5, y: 0, color: '#7c3aed' });
    expect(c.radiusPointId).toBe(point(scene, 'A').id);
    expect(geometry(r.objects, c).radius).toBeCloseTo(1.5, 9);
    const moved = move(r.objects, 'B', 5, 0);
    near(pt(moved, m.id), { x: 2.5, y: 0 });
    expect(geometry(moved, c).radius).toBeCloseTo(2.5, 9);
    const removed = collectDependentIds(r.objects, [point(scene, 'A').id]);
    expect(removed.has(c.id)).toBe(true);
    expect(removed.has(m.id)).toBe(true);
  });
  it('reuses an existing live midpoint', () => {
    const scene = build(s => {
      const a = s.addPoint({ x: 0, y: 0 }, { label: 'A' }), b = s.addPoint({ x: 4, y: 0 }, { label: 'B' });
      s.addPoint({ x: 2, y: 0 }, { label: 'M', construction: { kind: 'midpoint', pointIds: [b.id, a.id] } });
    });
    const r = ok('AB çaplı daire çiz', scene);
    expect(pointCount(r.objects)).toBe(3);
    expect(onlyOne(r.objects, 'circle')).toMatchObject({ centerPointId: point(scene, 'M').id, fillOpacity: 0.12, label: 'M Merkezli Daire' });
    expect(r.message).toContain('Merkezi M');
  });
  it.each([
    ['AB çaplı, yarıçapı 3 olan çember', 'çaptan'],
    ['DE çaplı çember çiz', '“DE”'],
    ['[DE] çaplı çember çiz', 'bulunamadı'],
    ["[DE]'yi çap kabul eden çember", 'bulunamadı'],
    ['ABC çaplı çember çiz', 'iki nokta'],
  ])('rejects %s', (text, fragment) => {
    expect(bad(text, S3())).toContain(fragment);
  });
});

describe('circles: radius given by two points', () => {
  it('center is an endpoint → radius point', () => {
    const scene = S3();
    const r = ok('A merkezli AB yarıçaplı çember', scene);
    expect(onlyOne(r.objects, 'circle')).toMatchObject({ centerPointId: point(scene, 'A').id, radiusPointId: point(scene, 'B').id });
    const r2 = ok('yarıçapı AB olan çember çiz', scene);
    expect(onlyOne(r2.objects, 'circle')).toMatchObject({ centerPointId: point(scene, 'A').id, radiusPointId: point(scene, 'B').id });
  });
  it.each([
    ['C merkezli, yarıçapı |AB| olan çember çiz', undefined],
    ['pergel açıklığı AB olan C merkezli çember çiz', PERGEL],
  ])('%s → live translated radius point', (text, color) => {
    const scene = S3();
    const r = ok(text, scene);
    const c = onlyOne(r.objects, 'circle');
    expect(c.centerPointId).toBe(point(scene, 'C').id);
    const helper = pt(r.objects, c.radiusPointId!);
    expect(helper.construction).toEqual({ kind: 'translate', sourceId: point(scene, 'C').id, vectorPointIds: [point(scene, 'A').id, point(scene, 'B').id] });
    near(helper, { x: 3, y: 3 });
    if (color) expect(c.color).toBe(color);
    const moved = move(r.objects, 'B', 4, 0);
    expect(geometry(moved, c).radius).toBeCloseTo(4, 9);
    expect(r.message).toContain('|AB|');
  });
});

describe('circles: styles and several circles', () => {
  it('disk (daire) matches the Add Object dialog', () => {
    const r = ok('Yarıçapı 5 olan daire çiz');
    expect(onlyOne(r.objects, 'circle')).toMatchObject({ fixedRadius: 5, fillOpacity: 0.12, showArea: true, label: 'A Dairesi (r = 5)' });
    expect(r.message).toBe('Merkezi A (0; 0), yarıçapı 5 olan daire çizildi.');
    expect(onlyOne(ok("A merkezli ve B'den geçen daire", S3()).objects, 'circle')).toMatchObject({ fillOpacity: 0.12, label: 'A Merkezli Daire' });
  });
  it('colors from the sentence', () => {
    expect(onlyOne(ok('kırmızı çember çiz').objects, 'circle').color).toBe('#ef4444');
    expect(onlyOne(ok('mavi renkli daire çiz').objects, 'circle').color).toBe('#2563eb');
    expect(onlyOne(ok('yeşil bir elips çiz').objects, 'ellipse')).toMatchObject({ color: '#10b981', fillColor: '#10b981' });
  });
  it('compass phrasing matches the compass tool', () => {
    const r = ok('Pergelle A merkezli 3 birim açıklıkla çember çiz', S3());
    const c = onlyOne(r.objects, 'circle');
    expect(c).toMatchObject({ color: PERGEL, fillOpacity: 0, label: 'A Merkezli Çember', fixedRadius: 3 });
    expect(c.showArea).toBeUndefined();
    expect(r.message).toBe('Pergelle A merkezli çember çizildi (r = 3 br).');
  });
  it('unit circle', () => {
    const r = ok('birim çember çiz');
    const c = onlyOne(r.objects, 'circle');
    expect(c.fixedRadius).toBe(1);
    expect(pt(r.objects, c.centerPointId)).toMatchObject({ x: 0, y: 0 });
  });
  it('several separate circles', () => {
    const two = ok('iki çember çiz');
    const list = byType(two.objects, 'circle');
    expect(list).toHaveLength(2);
    expect(new Set(list.map(c => c.centerPointId)).size).toBe(2);
    expect(two.selectedIds).toHaveLength(2);
    expect(byType(ok('3 tane daire çiz').objects, 'circle').every(c => c.fillOpacity === 0.12)).toBe(true);
    const radii = byType(ok('yarıçapları 2 ve 3 olan çemberler çiz').objects, 'circle');
    expect(radii.map(c => c.fixedRadius)).toEqual([2, 3]);
    expect(new Set(radii.map(c => c.centerPointId)).size).toBe(2);
  });
  it('concentric circles', () => {
    const r = ok('Yarıçapları 1, 2 ve 3 olan eş merkezli çemberler çiz');
    const list = byType(r.objects, 'circle');
    expect(list.map(c => c.fixedRadius)).toEqual([1, 2, 3]);
    expect(new Set(list.map(c => c.centerPointId)).size).toBe(1);
    const scene = S3();
    const aroundA = byType(ok('A merkezli, yarıçapları 2 ve 4 olan çemberler çiz', scene).objects, 'circle');
    expect(aroundA.every(c => c.centerPointId === point(scene, 'A').id)).toBe(true);
    expect(bad('A merkezli 3 çember çiz', scene)).toContain('yarıçaplarını');
  });
  it('several clauses in one command', () => {
    const r = ok('yarıçapı 2 olan çember çiz ve yarıçapı 3 olan daire çiz');
    expect(byType(r.objects, 'circle').map(c => [c.fixedRadius, c.fillOpacity])).toEqual([[2, 0], [3, 0.12]]);
  });
});

describe('circles: equations', () => {
  it.each([
    ['(x-1)^2 + (y-2)^2 = 9', { x: 1, y: 2 }, 3],
    ['x^2 + y^2 = 16', { x: 0, y: 0 }, 4],
    ['x² + y² = 16', { x: 0, y: 0 }, 4],
    ['x²+y²=25 çemberini çiz', { x: 0, y: 0 }, 5],
    ['(x+3)² + (y−1)² = 4', { x: -3, y: 1 }, 2],
    ['x^2 + y^2 - 4x + 6y - 12 = 0', { x: 2, y: -3 }, 5],
    ['x^2 + y^2 = 2,25', { x: 0, y: 0 }, 1.5],
    ['2x^2 + 2y^2 = 8', { x: 0, y: 0 }, 2],
    ['x kare artı y kare eşittir 9', { x: 0, y: 0 }, 3],
    ['denklemi (x-2)^2 + y^2 = 1 olan çember çiz', { x: 2, y: 0 }, 1],
    ['16 = x^2 + (y+1)^2', { x: 0, y: -1 }, 4],
  ])('%s → circle', (text, center, radius) => {
    const r = ok(text);
    const c = onlyOne(r.objects, 'circle');
    expect(c.fixedRadius).toBeCloseTo(radius, 9);
    near(pt(r.objects, c.centerPointId), center);
    expect(r.message).toContain('denklemli çember');
  });
  it('pretty prints the equation in the message', () => {
    expect(ok('(x-1)^2 + (y-2)^2 = 9').message).toBe('(x − 1)² + (y − 2)² = 9 denklemli çember çizildi: merkezi A (1; 2), yarıçapı 3.');
    expect(ok('x^2+y^2-4x+6y-12=0').message).toContain('x² + y² − 4x + 6y − 12 = 0');
  });
  it('reuses a point already at the center and applies a color', () => {
    const scene = S3();
    const r = ok('(x-3)^2 + y^2 = 1 kırmızı çemberini çiz', scene);
    expect(onlyOne(r.objects, 'circle')).toMatchObject({ centerPointId: point(scene, 'B').id, color: '#ef4444' });
  });
  it.each([
    ['x^2/16 + y^2/9 = 1', { x: 0, y: 0 }, 4, 3],
    ['(x-1)^2/4 + (y+2)^2 = 1', { x: 1, y: -2 }, 2, 1],
    ['4x^2 + 9y^2 = 36 elipsini çiz', { x: 0, y: 0 }, 3, 2],
  ])('%s → ellipse', (text, center, rx, ry) => {
    const r = ok(text);
    const e = onlyOne(r.objects, 'ellipse');
    expect(e.radiusX).toBeCloseTo(rx, 9);
    expect(e.radiusY).toBeCloseTo(ry, 9);
    near(pt(r.objects, e.centerPointId), center);
  });
  it.each([
    ['x^2 - y^2 = 4', 'hiperbol'],
    ['x^2 + y^2 = -4', 'grafiği yok'],
    ['x^2 + y^2 = 0', 'tek bir nokta'],
    ['x^2 + y^2 + xy = 4', 'xy'],
    ['x^3 + y^2 = 1', 'ikinci dereceden'],
  ])('rejects %s', (text, fragment) => {
    expect(bad(text)).toContain(fragment);
  });
});

describe('circles: ellipse', () => {
  it('default ellipse matches the ellipse tool', () => {
    const r = ok('elips çiz');
    const e = onlyOne(r.objects, 'ellipse');
    const center = pt(r.objects, e.centerPointId);
    expect(center).toMatchObject({ label: 'A', x: 0, y: 0, color: '#0ea5e9' });
    expect(e).toMatchObject({ radiusX: 3, radiusY: 2, color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.12, showArea: true, showPerimeter: true, label: 'A Merkezli Elips' });
    expect(e.rotation).toBeUndefined();
    expect(r.message).toContain('Yarıçaplar yazılmadığı için 3 ve 2 alındı');
  });
  it.each([
    ['yarıçapları 4 ve 2 olan elips çiz', 4, 2],
    ['yatay yarıçapı 3, dikey yarıçapı 1 olan elips oluştur', 3, 1],
    ['dikey yarıçapı 1, yatay yarıçapı 3 olan elips', 3, 1],
    ['büyük ekseni 8, küçük ekseni 4 olan elips çiz', 4, 2],
    ['yarı büyük ekseni 5 ve yarı küçük ekseni 2 olan elips', 5, 2],
    ['genişliği 6, yüksekliği 4 olan elips çiz', 3, 2],
    ['6x4 elips çiz', 3, 2],
    ['eksen uzunlukları 10 ve 6 olan elips', 5, 3],
    ['yarıçapı 3 olan elips çiz', 3, 3],
    ['dikey elips çiz', 2, 3],
    ['yatay yarıçapı 5 olan elips', 5, 2],
    ['4 ve 2 yarıçaplı elips çiz', 4, 2],
    ['dikey yarıçapı 1,5, yatay yarıçapı iki buçuk olan bir elips çizer misin', 2.5, 1.5],
  ])('%s → %d × %d', (text, rx, ry) => {
    const e = onlyOne(ok(text).objects, 'ellipse');
    expect([e.radiusX, e.radiusY]).toEqual([rx, ry]);
  });
  it('center and rotation', () => {
    const scene = S3();
    expect(onlyOne(ok('A merkezli elips çiz', scene).objects, 'ellipse').centerPointId).toBe(point(scene, 'A').id);
    const r = ok('(2; 1) merkezli, yarıçapları 5 ve 3 olan elips çiz', scene);
    near(pt(r.objects, onlyOne(r.objects, 'ellipse').centerPointId), { x: 2, y: 1 });
    expect(onlyOne(ok('30 derece eğik elips çiz').objects, 'ellipse').rotation).toBe(30);
  });
  it.each([
    ['yarıçapları 4, 2 ve 1 olan elips çiz', 'iki yarıçapını'],
    ['yatay yarıçapı 0 olan elips çiz', '0’dan büyük'],
    ['büyük ekseni 2, küçük ekseni 4 olan elips', 'Büyük eksen'],
    ['elips çiz 7', '7 sayısını'],
    ['çevresi 10 olan elips çiz', '10 sayısını'],
  ])('rejects %s', (text, fragment) => {
    expect(bad(text)).toContain(fragment);
  });
});

describe('circles: arcs', () => {
  it('radius and angle on an empty scene: live direction point on the arc', () => {
    const r = ok('yarıçapı 3 olan 90 derecelik yay çiz');
    const arc = onlyOne(r.objects, 'arc');
    const [a, b, c] = ['A', 'B', 'C'].map(l => point(r.objects, l));
    expect(arc).toMatchObject({ centerPointId: a.id, startPointId: b.id, directionPointId: c.id, label: 'BC Yayı', color: '#0284c7', thickness: 3, showArcLength: true });
    near(a, { x: 0, y: 0 });
    near(b, { x: 3, y: 0 });
    near(c, { x: 0, y: 3 });
    expect(c.construction).toEqual({ kind: 'rotate', sourceId: b.id, centerId: a.id, degrees: 90 });
    expect(r.selectedIds).toEqual([arc.id]);
    near(pt(move(r.objects, 'B', 0, 2), c.id), { x: -2, y: 0 });
    const removed = collectDependentIds(r.objects, [b.id]);
    expect(removed.has(c.id) && removed.has(arc.id)).toBe(true);
  });
  it.each([
    "A merkezli B'den C'ye yay çiz",
    'B noktasından C noktasına A merkezli yay',
    'başlangıç noktası B, bitiş noktası C olan A merkezli yay',
    'B ile C arasındaki A merkezli yay',
    "A merkezli B'den C'ye kadar bir yay çizer misin",
  ])('%s → existing points', text => {
    const scene = S3();
    const r = ok(text, scene);
    expect(r.objects).toHaveLength(scene.length + 1);
    expect(onlyOne(r.objects, 'arc')).toMatchObject({ centerPointId: point(scene, 'A').id, startPointId: point(scene, 'B').id, directionPointId: point(scene, 'C').id });
    expect(r.message).toContain('90° yay çizildi: B noktasından C noktasına');
  });
  it('clockwise and minor-arc orderings (arcs are stored counter-clockwise)', () => {
    const scene = S3();
    const cw = ok("A merkezli, B'den C'ye saat yönünde yay çiz", scene);
    expect(onlyOne(cw.objects, 'arc')).toMatchObject({ startPointId: point(scene, 'C').id, directionPointId: point(scene, 'B').id });
    const s4 = build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A' }); s.addPoint({ x: 3, y: 0 }, { label: 'B' }); s.addPoint({ x: 0, y: -3 }, { label: 'D' }); });
    expect(onlyOne(ok('B ile D arasındaki A merkezli yay', s4).objects, 'arc')).toMatchObject({ startPointId: point(s4, 'D').id, directionPointId: point(s4, 'B').id });
    const turn = ok("A merkezli, B'den başlayan saat yönünde 90 derecelik yay çiz", scene);
    const arc = onlyOne(turn.objects, 'arc');
    const made = pt(turn.objects, arc.startPointId);
    near(made, { x: 0, y: -3 });
    expect(made.construction).toMatchObject({ kind: 'rotate', degrees: -90 });
    expect(arc.directionPointId).toBe(point(scene, 'B').id);
  });
  it.each([
    ["A merkezli, B'den başlayan 45° yay çiz", 45],
    ['A merkezli 120 derecelik yay çiz', 120],
    ['A merkezli, merkez açısı 150 olan yay', 150],
    ['A merkezli kırk beş derecelik yay', 45],
  ])('%s → starts at B and sweeps %d°', (text, degrees) => {
    const scene = S3();
    const r = ok(text, scene);
    const arc = onlyOne(r.objects, 'arc');
    expect(arc.startPointId).toBe(point(scene, 'B').id);
    const d = pt(r.objects, arc.directionPointId);
    near(d, { x: 3 * Math.cos(degrees * Math.PI / 180), y: 3 * Math.sin(degrees * Math.PI / 180) });
  });
  it('start angle, default angle and projected end point', () => {
    const r = ok('30 dereceden başlayan 60 derecelik yay');
    const arc = onlyOne(r.objects, 'arc');
    near(pt(r.objects, arc.startPointId), { x: 3 * Math.cos(Math.PI / 6), y: 1.5 });
    near(pt(r.objects, arc.directionPointId), { x: 0, y: 3 });
    const plain = ok('yay çiz');
    expect(plain.message).toContain('Açı yazılmadığı için 90° alındı');
    expect(plain.message).toContain('Yarıçap yazılmadığı için 3 alındı');
    const projected = ok("A merkezli B'den (0;5)'e yay çiz", S3());
    const end = pt(projected.objects, onlyOne(projected.objects, 'arc').directionPointId);
    expect(end.label).toBe('D');
    near(end, { x: 0, y: 3 });
    const far = build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A' }); s.addPoint({ x: 3, y: 0 }, { label: 'B' }); s.addPoint({ x: 0, y: 5 }, { label: 'C' }); });
    const kept = ok("A merkezli B'den C'ye yay çiz", far);
    expect(point(kept.objects, 'C')).toMatchObject({ x: 0, y: 5 });
  });
  it('three points: live circumcenter', () => {
    const scene = S3();
    const r = ok('A, B ve C noktalarından geçen yay çiz', scene);
    const arc = onlyOne(r.objects, 'arc');
    const center = pt(r.objects, arc.centerPointId);
    expect(center.construction).toMatchObject({ kind: 'triangleCenter', center: 'circumcenter' });
    near(center, { x: 1.5, y: 1.5 });
    expect([arc.startPointId, arc.directionPointId]).toEqual([point(scene, 'A').id, point(scene, 'C').id]);
    near(pt(move(r.objects, 'C', 0, 4), center.id), { x: 1.5, y: 2 });
  });
  it('semicircle arc and compass arc', () => {
    const half = ok('Yarım çember çiz');
    const arc = onlyOne(half.objects, 'arc');
    near(pt(half.objects, arc.directionPointId), { x: -3, y: 0 });
    expect(half.message).toContain('yarım çember (180°)');
    const compass = ok('Pergelle A merkezli 2 birim açıklıkla 60 derecelik yay çiz', S3());
    const carc = onlyOne(compass.objects, 'arc');
    expect(carc.color).toBe(PERGEL);
    expect(pt(compass.objects, carc.startPointId)).toMatchObject({ x: 2, y: 0, color: PERGEL });
  });
  it.each([
    ["B'den C'ye yay çiz", 'merkezi'],
    ["A merkezli B'den C'ye 60 derecelik yay çiz", '90'],
    ["A merkezli, B'den başlayan, yarıçapı 5 olan yay çiz", 'uzaklıkta'],
    ['360 derecelik yay çiz', '360°'],
    ['0 derecelik yay çiz', '0°'],
    ["A merkezli A'dan B'ye yay çiz", 'aynı konumda'],
    ['A merkezli 90 derecelik yay çiz 5', '5 sayısını'],
    ['A ve B noktalarından geçen yay çiz', 'üç nokta'],
  ])('rejects %s', (text, fragment) => {
    expect(bad(text, S3())).toContain(fragment);
  });
});

describe('circles: sectors', () => {
  it('60° sector matches the sector tool', () => {
    const r = ok('60 derecelik daire dilimi çiz');
    const sector = onlyOne(r.objects, 'sector');
    expect(sector).toMatchObject({ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.4, showArea: true, label: 'A Daire Dilimi' });
    near(pt(r.objects, sector.startPointId), { x: 3, y: 0 });
    near(pt(r.objects, sector.directionPointId), { x: 1.5, y: 3 * Math.sin(Math.PI / 3) });
  });
  it.each([
    ['Yarım daire çiz', 180],
    ['Çeyrek daire çiz', 90],
    ['üç çeyrek daire çiz', 270],
    ['merkez açısı 45 olan daire dilimi', 45],
    ['Yarıçapı 4 olan 135° daire dilimi çiz', 135],
    ['3 yarıçaplı yarım daire', 180],
    ['yarıçapı 2 olan çeyrek daire oluştur', 90],
    ['kırmızı 30 derecelik dilim çiz', 30],
  ])('%s → %d°', (text, degrees) => {
    const r = ok(text);
    const sector = onlyOne(r.objects, 'sector') as SectorObject;
    const c = pt(r.objects, sector.centerPointId), s = pt(r.objects, sector.startPointId), d = pt(r.objects, sector.directionPointId);
    const sweep = ((Math.atan2(d.y - c.y, d.x - c.x) - Math.atan2(s.y - c.y, s.x - c.x)) * 180 / Math.PI + 360) % 360;
    expect(sweep).toBeCloseTo(degrees, 6);
  });
  it('radius of sectors and color', () => {
    const r = ok('yarıçapı 2 olan çeyrek daire oluştur');
    const sector = onlyOne(r.objects, 'sector');
    expect(dist(pt(r.objects, sector.centerPointId), pt(r.objects, sector.startPointId))).toBeCloseTo(2, 9);
    expect(onlyOne(ok('kırmızı 30 derecelik dilim çiz').objects, 'sector')).toMatchObject({ color: '#ef4444', fillColor: '#ef4444' });
  });
  it('existing points and a diameter', () => {
    const scene = S3();
    const r = ok("A merkezli B'den C'ye daire dilimi oluştur", scene);
    expect(onlyOne(r.objects, 'sector')).toMatchObject({ centerPointId: point(scene, 'A').id, startPointId: point(scene, 'B').id, directionPointId: point(scene, 'C').id });
    const half = ok('AB çaplı yarım daire çiz', scene);
    const sector = onlyOne(half.objects, 'sector');
    const m = pt(half.objects, sector.centerPointId);
    expect(m.construction).toMatchObject({ kind: 'midpoint' });
    near(m, { x: 1.5, y: 0 });
    expect([sector.startPointId, sector.directionPointId]).toEqual([point(scene, 'A').id, point(scene, 'B').id]);
    expect(half.message).toContain('[AB] çaplı yarım daire (180°)');
  });
  it.each([
    ['90 derecelik yarım daire çiz', '180°'],
    ['AB çaplı 90 derecelik daire dilimi', '180°'],
  ])('rejects %s', (text, fragment) => {
    expect(bad(text, S3())).toContain(fragment);
  });
});

describe('circles: ownership', () => {
  it.each([
    'çemberin alanını ölç',
    'çembere teğet çiz',
    'P noktasından çembere teğet doğru çiz',
    'çemberi sil',
    'çemberi kırmızı yap',
    "ABC'nin çevrel çemberi",
    'ABC üçgeninin çevrel çemberini çiz',
    'iç teğet çember çiz',
    'çemberin yarıçapını 4 yap',
    'A merkezli çemberin yarıçapını 5 yap',
    'elipsin alanını hesapla',
    'elipsin yarıçaplarını 4 ve 2 yap',
    'yayın uzunluğunu göster',
    'daire diliminin alanı kaç',
    'x² + y² = 16 çemberinin alanı kaç',
    'f(x) = x^2 + 1',
    'y = 2x + 1',
    'x = 3',
    'y^2 = 4x',
    'A noktası oluştur',
    'kare çiz',
    'çember üzerinde nokta oluştur',
    'çember aracını seç',
    'yarıçapı 3 olan düzgün altıgen çiz',
    'çemberin merkezini bul',
    'tüm çemberleri sil',
    'çemberi 2 birim sağa kaydır',
    'çemberi gizle',
    'çember çizme',
    'AB doğrusu ile çemberin kesişim noktalarını bul',
    'ABC üçgenini çevreleyen çember',
    'elipsi 30 derece döndür',
    'çemberin rengini mavi yap',
    'dairesel bölge',
  ])('%s → 0', text => {
    expect(score(text)).toBe(0);
  });
  it.each([
    ['yarıçapı 3 olan çember', 50],
    ['elips', 50],
    ['yarım daire', 50],
    ["A merkezli B'den C'ye yay", 50],
    ['x² + y² = 9', 96],
    ['A merkezli çemberi çiz', 50],
  ])('%s → %d', (text, expected) => {
    expect(score(text)).toBe(expected);
  });
});

describe('circles: types stay tool compatible', () => {
  it('never sets both fixedRadius and radiusPointId', () => {
    const texts = ['çember çiz', "A merkezli ve B'den geçen çember", 'AB çaplı çember', 'A, B ve C noktalarından geçen çember', 'C merkezli, yarıçapı |AB| olan çember çiz', 'x^2 + y^2 = 4'];
    for (const text of texts) {
      for (const c of byType(ok(text, S3()).objects, 'circle') as CircleObject[]) {
        expect(c.fixedRadius !== undefined && c.radiusPointId !== undefined).toBe(false);
        expect(c.id.startsWith('circ')).toBe(true);
      }
    }
    expect((onlyOne(ok('elips çiz').objects, 'ellipse') as EllipseObject).id.startsWith('elp')).toBe(true);
    expect((onlyOne(ok('yay çiz').objects, 'arc') as ArcObject).id.startsWith('arc')).toBe(true);
    expect((onlyOne(ok('daire dilimi çiz').objects, 'sector') as SectorObject).id.startsWith('sect')).toBe(true);
  });
});

describe('circles: sweep regressions (isolated handlers)', () => {
  const slider = (name: string) => build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A' }); s.addSlider(name, { value: 2 }); });
  it('a slider or a bare letter is never read as a radius', () => {
    const message = bad('A merkezli yarıçapı b olan çember çiz', slider('b'));
    expect(message).toContain('b kaydırıcısına bağlanamaz');
    expect(message).toContain('“A merkezli yarıçapı 2 olan çember çiz”');
    expect(message).not.toContain('bulunamadı');
    expect(bad('yarıçapı r olan çember çiz', slider('r'))).toContain('r kaydırıcısına bağlanamaz');
    expect(bad('A merkezli yarıçapı b olan yay çiz', slider('b'))).toContain('Yayın yarıçapı');
    expect(bad('yatay yarıçapı b olan elips çiz', slider('b'))).toContain('Elipsin yarıçapı');
    expect(bad('yarıçapı k olan çember çiz')).toContain('“k” bir sayı değil');
    // İki noktalı ad hâlâ yarıçaptır.
    expect(onlyOne(ok('C merkezli, yarıçapı |AB| olan çember çiz', S3()).objects, 'circle').radiusPointId).toBeDefined();
  });
  it('unit circle accepts an explicit radius of 1', () => {
    expect(onlyOne(ok('yarıçapı 1 olan birim çember çiz').objects, 'circle').fixedRadius).toBe(1);
    expect(bad('yarıçapı 2 olan birim çember çiz')).toContain('Birim çember');
  });
  it('“O(x;y) merkezli” names the center O', () => {
    const r = ok('O(0;0) merkezli yarıçapı 3 olan çember çiz');
    expect(pt(r.objects, onlyOne(r.objects, 'circle').centerPointId)).toMatchObject({ label: 'O', x: 0, y: 0 });
  });
  it('center without “merkezli”: “A noktasına”, “A’nın etrafında”', () => {
    const scene = S3();
    const a = point(scene, 'A').id;
    expect(onlyOne(ok('A noktasına yarıçapı 3 olan çember çiz', scene).objects, 'circle').centerPointId).toBe(a);
    expect(onlyOne(ok('Anın etrafında yarıçapı 3 olan çember çiz', scene).objects, 'circle').centerPointId).toBe(a);
    const placed = ok('(1;1) noktasına yarıçapı 2 olan bir çember koy');
    near(pt(placed.objects, onlyOne(placed.objects, 'circle').centerPointId), { x: 1, y: 1 });
    // Geçiş cümlesinde "noktasına" merkez sayılmaz.
    expect(bad("B'den geçen ve C noktasına uzanan çember", scene)).toBeTruthy();
  });
  it('several listed centers', () => {
    const scene = S3();
    const r = ok('A ve B merkezli yarıçapı 2 olan çemberler çiz', scene);
    expect(byType(r.objects, 'circle').map(c => [c.centerPointId, c.fixedRadius])).toEqual([[point(scene, 'A').id, 2], [point(scene, 'B').id, 2]]);
    expect(r.message).toBe('Merkezleri A ve B, yarıçapı 2 olan 2 çember çizildi.');
  });
  it('“üç noktadan geçen” uses exactly three selected points', () => {
    const scene = S3();
    const ids = ['A', 'B', 'C'].map(l => point(scene, l).id);
    expect(onlyOne(ok('üç noktadan geçen çember çiz', scene, ids).objects, 'circle').throughPointIds).toEqual(ids);
    expect(bad('üç noktadan geçen çember çiz', scene, ids.slice(0, 2))).toContain('seçili');
  });
  it('compass placement anchors the next clause', () => {
    const scene = S3();
    const r = ok('Pergeli B noktasına koy ve 3 birim açıklıkla çember çiz', scene);
    expect(onlyOne(r.objects, 'circle')).toMatchObject({ centerPointId: point(scene, 'B').id, fixedRadius: 3, color: PERGEL });
    expect(r.objects).toHaveLength(scene.length + 1);
    expect(score('pergeli A noktasına koy')).toBe(50);
    expect(score('pergeli aç')).toBe(0);
  });
  it('spoken equations', () => {
    expect(onlyOne(ok('iks kare artı ye kare eşittir dokuz').objects, 'circle').fixedRadius).toBe(3);
    expect(onlyOne(ok("x'in karesi artı y'nin karesi eşittir 4").objects, 'circle').fixedRadius).toBe(2);
    expect(onlyOne(ok('x kare bölü dört artı y kare bölü dokuz eşittir bir').objects, 'ellipse')).toMatchObject({ radiusX: 2, radiusY: 3 });
    expect(onlyOne(ok('x eksi iki nin karesi artı y kare eşittir dokuz').objects, 'circle').fixedRadius).toBe(3);
  });
  it.each([
    ["8'e 4'lük elips çiz", 4, 2],
    ['yatay yarı ekseni 4 düşey yarı ekseni 1 olan elips', 4, 1],
    ['x ekseni boyunca yarıçapı 4, y ekseni boyunca yarıçapı 2 olan elips', 4, 2],
    ['yarıçapı 5 ve 3 olan elips çiz', 5, 3],
  ])('ellipse phrasing %s → %d × %d', (text, rx, ry) => {
    expect(onlyOne(ok(text).objects, 'ellipse')).toMatchObject({ radiusX: rx, radiusY: ry });
  });
  it.each([
    ['odak noktaları A ve B olan elips', 'Odak'],
    ['yarıçapı 3 olan çeyrek elips çiz', 'çeyrek elips'],
  ])('rejects %s', (text, fragment) => {
    expect(bad(text, S3())).toContain(fragment);
  });
  it('arcs: “C noktasında biten”, “AB üzerine yarım daire”, two-point radius', () => {
    const scene = S3();
    const [a, b, c] = ['A', 'B', 'C'].map(l => point(scene, l).id);
    expect(onlyOne(ok('B noktasından başlayıp C noktasında biten A merkezli yay', scene).objects, 'arc')).toMatchObject({ centerPointId: a, startPointId: b, directionPointId: c });
    const half = ok('AB üzerine yarım daire çiz', scene);
    const sector = onlyOne(half.objects, 'sector');
    expect(pt(half.objects, sector.centerPointId).construction).toMatchObject({ kind: 'midpoint' });
    expect([sector.startPointId, sector.directionPointId]).toEqual([a, b]);
    const arc = onlyOne(ok('A merkezli AB yarıçaplı 60 derecelik yay', scene).objects, 'arc');
    expect([arc.centerPointId, arc.startPointId]).toEqual([a, b]);
    const moved = ok('C merkezli AB yarıçaplı 90 derecelik yay', scene);
    const start = pt(moved.objects, onlyOne(moved.objects, 'arc').startPointId);
    expect(start.construction).toEqual({ kind: 'translate', sourceId: c, vectorPointIds: [a, b] });
    near(start, { x: 3, y: 3 });
    expect(bad("A merkezli, B'den başlayan, AB yarıçaplı yay", scene)).toContain('bir kez');
  });
  it('mild typos of shape names', () => {
    expect(onlyOne(ok('yarıçapı 3 olan çembr çiz').objects, 'circle').fixedRadius).toBe(3);
    expect(score('elipis çiz', [])).toBe(50);
  });
});
