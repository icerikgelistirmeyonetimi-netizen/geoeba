import { describe, expect, it } from 'vitest';
import type { MathObject, Point2D, PointObject, PolygonObject, SliderObject, ViewportTransform } from '@/types/math';
import { resolveCommandBindings } from '../../commandBindings';
import { getVisibleWorldBounds } from '../../coordinates';
import { rankHandlers } from '../engine';
import { CommandScene } from '../scene';
import { parseClause } from '../text';
import { handlers } from '../handlers/polygons';
import { build, byType, dist, expectFail, expectOk, point, runWith } from './helpers';

const ok = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectOk(handlers, text, scene, selection);
const bad = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectFail(handlers, text, scene, selection);
const polygons = (objects: MathObject[]) => byType(objects, 'polygon');
const onlyPolygon = (objects: MathObject[]) => { const list = polygons(objects); expect(list).toHaveLength(1); return list[0]; };
const verts = (objects: MathObject[], poly: PolygonObject) => poly.pointIds.map(id => objects.find(o => o.id === id) as PointObject);
const sides = (pts: Point2D[]) => pts.map((p, i) => dist(p, pts[(i + 1) % pts.length]));
const area = (pts: Point2D[]) => pts.reduce((s, p, i) => s + p.x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * p.y, 0) / 2;
const angleAt = (prev: Point2D, at: Point2D, next: Point2D) => {
  const a = Math.atan2(prev.y - at.y, prev.x - at.x), b = Math.atan2(next.y - at.y, next.x - at.x);
  let d = Math.abs(a - b) * 180 / Math.PI;
  if (d > 180) d = 360 - d;
  return d;
};
const shapeOf = (text: string, scene: MathObject[] = [], selection: string[] = []) => {
  const r = ok(text, scene, selection);
  const before = new Set(scene.map(o => o.id));
  const poly = polygons(r.objects).filter(p => !before.has(p.id)).at(-1) ?? polygons(r.objects).at(-1)!;
  return { r, poly, pts: verts(r.objects, poly) };
};
const close = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 6);
const pointsScene = (spec: Record<string, [number, number]>) => build(s => { for (const [label, [x, y]] of Object.entries(spec)) s.addPoint({ x, y }, { label }); });

describe('polygons: legacy behaviour', () => {
  it('"3 4 5 üçgeni olsun" on an empty scene creates A, B, C with AB=3, BC=4, CA=5 and edge labels', () => {
    const { r, poly, pts } = shapeOf('3 4 5 üçgeni olsun');
    expect(pts.map(p => p.label)).toEqual(['A', 'B', 'C']);
    close(dist(point(r.objects, 'A'), point(r.objects, 'B')), 3);
    close(dist(point(r.objects, 'B'), point(r.objects, 'C')), 4);
    close(dist(point(r.objects, 'C'), point(r.objects, 'A')), 5);
    expect(poly.edgeLabels).toEqual([0, 1, 2]);
    expect(poly.label).toBe('ABC');
    expect(r.selectedIds).toEqual([poly.id]);
  });

  it('"üçgen çiz" draws an equilateral triangle with side 4 styled like the triangle kind', () => {
    const { poly, pts } = shapeOf('üçgen çiz');
    sides(pts).forEach(s => close(s, 4));
    expect(poly).toMatchObject({ color: '#10b981', fillOpacity: 0.15, showArea: false, showPerimeter: false });
    expect(area(pts)).toBeGreaterThan(0);
  });

  it('"3 4 5 üçgeni olsun" after "üçgen çiz" modifies the existing triangle keeping A', () => {
    const first = ok('üçgen çiz');
    const second = ok('3 4 5 üçgeni olsun', first.objects);
    expect(second.objects).toHaveLength(first.objects.length);
    expect(point(second.objects, 'A')).toEqual(point(first.objects, 'A'));
    expect(point(second.objects, 'B').x).not.toBe(point(first.objects, 'B').x);
    const [a, b, c] = ['A', 'B', 'C'].map(n => point(second.objects, n));
    close(dist(a, b), 3); close(dist(b, c), 4); close(dist(c, a), 5);
    expect(onlyPolygon(second.objects).edgeLabels).toEqual([0, 1, 2]);
    expect(second.message).toContain('A köşesi yerinde kaldı');
  });

  it('keeps the direction and orientation of the modified triangle', () => {
    const scene = build(s => {
      const a = s.addPoint({ x: 1, y: 1 }, { label: 'A' }), b = s.addPoint({ x: 1, y: 5 }, { label: 'B' }), c = s.addPoint({ x: 4, y: 3 }, { label: 'C' });
      s.addPolygon([a.id, b.id, c.id], { kind: 'triangle' });
    });
    const r = ok('3 4 5 üçgeni olsun', scene);
    const [a, b, c] = ['A', 'B', 'C'].map(n => point(r.objects, n));
    close(b.x, 1); close(b.y, 4);
    close(dist(b, c), 4); close(dist(c, a), 5);
    expect(area([a, b, c])).toBeLessThan(0); // saat yönündeki üçgen saat yönünde kalır
  });

  it('modifies the selected triangle when there are two, and asks otherwise', () => {
    const first = ok('üçgen çiz');
    const second = ok('üçgen çiz', first.objects);
    expect(bad('3 4 5 üçgeni olsun', second.objects)).toContain('Birden fazla');
    const target = polygons(second.objects)[1];
    const r = ok('3 4 5 üçgeni olsun', second.objects, [target.id]);
    const [d, e, f] = verts(r.objects, onlyOf(r.objects, target.id));
    close(dist(d, e), 3); close(dist(e, f), 4); close(dist(f, d), 5);
    expect(r.selectedIds).toEqual([target.id]);
  });

  it('refuses to modify a triangle whose vertices are bound to sliders', () => {
    const scene = build(s => {
      const sliders = ['ab', 'bc', 'ca'].map((n, i) => s.addSlider(n, { min: 1, max: 10, value: [3, 4, 5][i] }));
      const a = s.addPoint({ x: 0, y: 0 }, { label: 'A' });
      const ids = sliders.map(x => x.id) as [string, string, string];
      const b = s.addPoint({ x: 3, y: 0 }, { label: 'B', construction: { kind: 'triangleVertex', anchorId: a.id, sliderIds: ids, vertex: 1, rotation: 0, orientation: 1 } });
      const c = s.addPoint({ x: 3, y: 4 }, { label: 'C', construction: { kind: 'triangleVertex', anchorId: a.id, sliderIds: ids, vertex: 2, rotation: 0, orientation: 1 } });
      s.addPolygon([a.id, b.id, c.id], { kind: 'triangle' });
    });
    expect(bad('5 5 5 üçgeni olsun', scene)).toContain('bağlı');
    const moved = resolveCommandBindings(scene.map(o => o.type === 'slider' && o.variableName === 'ab' ? { ...o, value: 4 } as SliderObject : o));
    close(dist(point(moved, 'A'), point(moved, 'B')), 4);
  });

  it.each(['1 2 3 üçgen çiz', '1 1 5 üçgen çiz', '3 3 3 dik üçgen çiz', '3 4 5 eşkenar üçgen çiz', '3 4 5 ikizkenar üçgen çiz', '1 2 9 üçgen çiz'])('rejects %s', text => {
    const message = bad(text);
    expect(message).toMatch(/üçgen/i);
  });

  it('accepts 7 8 9 and draws two separate triangles side by side', () => {
    const t = shapeOf('7 8 9 üçgen çiz');
    expect(sides(t.pts).map(x => +x.toFixed(9))).toEqual([7, 8, 9]);
    const first = ok('üçgen çiz');
    const second = ok('üçgen çiz', first.objects);
    const [p1, p2] = polygons(second.objects);
    expect(p1.pointIds.some(id => p2.pointIds.includes(id))).toBe(false);
    const box = (poly: PolygonObject) => { const xs = verts(second.objects, poly).map(p => p.x); return [Math.min(...xs), Math.max(...xs)]; };
    expect(box(p2)[0]).toBeGreaterThan(box(p1)[1]);
    expect(verts(second.objects, p2).map(p => p.label)).toEqual(['D', 'E', 'F']);
  });

  it.each([
    ['kare çiz', 4, 'square'],
    ['Kenar uzunluğu 4 olan kare çiz', 4, 'square'],
    ['3 5 dikdörtgen çiz', 4, 'rectangle'],
    ['6 kenarlı düzgün çokgen çiz', 6, 'regular'],
  ])('supports %s', (text, count, kind) => {
    const { poly, pts } = shapeOf(text);
    expect(pts).toHaveLength(count);
    const colors: Record<string, string> = { square: '#f43f5e', rectangle: '#f59e0b', regular: '#059669' };
    expect(poly.color).toBe(colors[kind]);
  });

  it('3 5 dikdörtgen: width 3, height 5, counter-clockwise from bottom-left', () => {
    const { pts } = shapeOf('3 5 dikdörtgen çiz');
    close(pts[1].x - pts[0].x, 3); close(pts[1].y - pts[0].y, 0);
    close(pts[2].y - pts[1].y, 5);
    expect(pts[0].color).toBe('#3b82f6');
  });

  it('"dik üçgen çiz" defaults to 3-4-5 with the right angle at B', () => {
    const { pts, r } = shapeOf('dik üçgen çiz');
    expect(sides(pts).map(x => +x.toFixed(9))).toEqual([3, 4, 5]);
    close(angleAt(pts[0], pts[1], pts[2]), 90);
    expect(r.message).toContain('3 ve 4');
  });
});

function onlyOf(objects: MathObject[], id: string) { return objects.find(o => o.id === id) as PolygonObject; }

describe('polygons: triangle specifications', () => {
  it.each([
    ['kenarları 3, 4 ve 5 olan üçgen', [3, 4, 5]],
    ['3,4,5 üçgeni', [3, 4, 5]],
    ['Kenar uzunlukları 5, 12 ve 13 olan dik üçgen çizebilir misin', [5, 12, 13]],
    ['kenarları 6, 8 ve 10 birim olan dik üçgen', [6, 8, 10]],
    ['üç kenarı 3 4 5 olan üçgen çizer misin', [3, 4, 5]],
    ['kenarı 6 olan eşkenar üçgen', [6, 6, 6]],
    ['bir kenarı 4 cm olan eşkenar üçgen oluşturalım', [4, 4, 4]],
    ['kenar uzunluğu 2,5 br olan eşkenar üçgen çiz', [2.5, 2.5, 2.5]],
    ['kenarı iki buçuk olan eşkenar üçgen', [2.5, 2.5, 2.5]],
    ['tabanı 6 yan kenarları 5 olan ikizkenar üçgen', [6, 5, 5]],
    ['5 5 6 ikizkenar üçgen çiz', [6, 5, 5]],
    ['dik kenarları 3 ve 4 olan dik üçgen', [3, 4, 5]],
    ['dik kenarları 5 ve 12 olan bir dik üçgen istiyorum', [5, 12, 13]],
    ['hipotenüsü 10 bir dik kenarı 6 olan dik üçgen', [6, 8, 10]],
    ['3 4 dik üçgen çiz', [3, 4, 5]],
    ['tabanı 6 yüksekliği 4 olan üçgen', [6, 5, 5]],
    ['yüksekliği 4 tabanı 6 olan üçgen', [6, 5, 5]],
    ['çeşitkenar üçgen', [6, 5, 4]],
    ['|AB|=3 |BC|=4 |AC|=5 olan üçgen', [3, 4, 5]],
    ['lütfen bir üçgen çizin', [4, 4, 4]],
    ['ÜÇGEN ÇİZ', [4, 4, 4]],
  ])('%s', (text, expected) => {
    const { pts } = shapeOf(text);
    sides(pts).forEach((s, i) => close(s, expected[i]));
    expect(area(pts)).toBeGreaterThan(0);
  });

  it('SAS: two sides and the included angle', () => {
    const { pts } = shapeOf('İki kenarı 5 ve 7, arasındaki açı 60 derece olan üçgen çiz');
    close(dist(pts[0], pts[1]), 5); close(dist(pts[2], pts[0]), 7);
    close(angleAt(pts[1], pts[0], pts[2]), 60);
    close(dist(pts[1], pts[2]), Math.sqrt(39));
    const other = shapeOf('iki kenarı 4 ve 6 olan ve bu kenarlar arasındaki açısı 120 derece olan üçgen');
    close(angleAt(other.pts[1], other.pts[0], other.pts[2]), 120);
  });

  it('angles only: 30-60-90 with longest side 5 and says the default', () => {
    for (const text of ['açıları 30, 60 ve 90 derece olan üçgen', 'Açıları 30°, 60° ve 90° olan üçgen çiz', '30-60-90 üçgeni']) {
      const { pts, r } = shapeOf(text);
      close(angleAt(pts[2], pts[0], pts[1]), 30);
      close(angleAt(pts[0], pts[1], pts[2]), 60);
      close(angleAt(pts[1], pts[2], pts[0]), 90);
      close(Math.max(...sides(pts)), 5);
      expect(r.message).toContain('En uzun kenar 5');
    }
    const two = shapeOf('açıları 50 ve 60 derece olan üçgen');
    close(angleAt(two.pts[1], two.pts[2], two.pts[0]), 70);
  });

  it('isosceles variants: apex angle, base angles, isosceles right', () => {
    const apex = shapeOf('tepe açısı 40 derece olan ikizkenar üçgen');
    close(angleAt(apex.pts[0], apex.pts[2], apex.pts[1]), 40);
    close(dist(apex.pts[1], apex.pts[2]), dist(apex.pts[2], apex.pts[0]));
    expect(apex.r.message).toContain('Taban 4');
    const baseAngles = shapeOf('tabanı 6, taban açıları 50 derece olan ikizkenar üçgen');
    close(dist(baseAngles.pts[0], baseAngles.pts[1]), 6);
    close(angleAt(baseAngles.pts[2], baseAngles.pts[0], baseAngles.pts[1]), 50);
    const rightIso = shapeOf('hipotenüsü 5 olan ikizkenar dik üçgen');
    close(dist(rightIso.pts[2], rightIso.pts[0]), 5);
    close(dist(rightIso.pts[0], rightIso.pts[1]), dist(rightIso.pts[1], rightIso.pts[2]));
    const asa = shapeOf('tabanı 5 taban açıları 50 ve 60 derece olan üçgen');
    close(angleAt(asa.pts[1], asa.pts[0], asa.pts[2]), 50);
    close(angleAt(asa.pts[0], asa.pts[1], asa.pts[2]), 60);
  });

  it('obtuse, acute and right-with-angle defaults', () => {
    const obtuse = shapeOf('Geniş açılı üçgen çiz');
    expect(Math.max(...[0, 1, 2].map(i => angleAt(obtuse.pts[(i + 2) % 3], obtuse.pts[i], obtuse.pts[(i + 1) % 3])))).toBeGreaterThan(90);
    const acute = shapeOf('dar açılı üçgen');
    expect(Math.max(...[0, 1, 2].map(i => angleAt(acute.pts[(i + 2) % 3], acute.pts[i], acute.pts[(i + 1) % 3])))).toBeLessThan(90);
    const right30 = shapeOf('bir açısı 30 derece olan dik üçgen');
    close(angleAt(right30.pts[1], right30.pts[0], right30.pts[2]), 30);
    close(angleAt(right30.pts[0], right30.pts[1], right30.pts[2]), 90);
    bad('kenarları 3, 4 ve 5 olan geniş açılı üçgen');
    bad('kenarları 2, 2 ve 3,9 olan dar açılı üçgen');
    bad('kenarları 5, 5 ve 6 olan çeşitkenar üçgen');
  });

  it('coordinates: named and unnamed vertices, reuse of existing points', () => {
    const named = shapeOf('A(0,0) B(4,0) C(1,3) üçgeni');
    expect(named.pts.map(p => [p.label, p.x, p.y])).toEqual([['A', 0, 0], ['B', 4, 0], ['C', 1, 3]]);
    expect(named.poly.edgeLabels).toBeUndefined();
    const unnamed = shapeOf('köşeleri (0,0), (4,0), (1,3) olan üçgen');
    expect(unnamed.pts.map(p => p.label)).toEqual(['A', 'B', 'C']);
    const scene = pointsScene({ A: [0, 0] });
    const reuse = shapeOf('A(0;0) B(4;0) C(1;3) üçgenini çiz', scene);
    expect(reuse.pts[0].id).toBe(point(scene, 'A').id);
    expect(bad('A(1;1) B(4;0) C(1;3) üçgenini çiz', scene)).toContain('A noktası zaten');
    expect(bad('köşeleri (0;0), (1;1), (2;2) olan üçgen')).toContain('aynı doğru');
    expect(bad('köşeleri (0;0), (1;1) olan üçgen')).toContain('üç köşe');
  });

  it('labels: named vertices, reuse and sensible completion', () => {
    const def = shapeOf('DEF üçgeni oluştur');
    expect(def.pts.map(p => p.label)).toEqual(['D', 'E', 'F']);
    const lower = shapeOf("A_1B_1C_1 üçgenini çiz");
    expect(lower.pts.map(p => p.label)).toEqual(['A_1', 'B_1', 'C_1']);

    const all = pointsScene({ A: [0, 0], B: [5, 0], C: [1, 4] });
    const connect = shapeOf('ABC üçgenini çiz', all);
    expect(connect.r.objects.filter(o => o.type === 'point')).toHaveLength(3);
    expect(connect.pts.map(p => p.id)).toEqual(['A', 'B', 'C'].map(n => point(all, n).id));
    const lowercase = shapeOf('abc üçgenini çiz', all);
    expect(lowercase.pts.map(p => p.label)).toEqual(['A', 'B', 'C']);

    const two = pointsScene({ A: [1, 1], B: [4, 1] });
    const completed = shapeOf('ABC üçgenini çiz', two);
    const c = point(completed.r.objects, 'C');
    close(c.x, 2.5); close(c.y, 1 + 3 * Math.sqrt(3) / 2);
    expect(completed.r.message).toContain('C eklendi');

    const withSize = shapeOf('kenarları 3, 4 ve 5 olan ABC üçgeni', pointsScene({ A: [2, 2] }));
    close(point(withSize.r.objects, 'B').x, 5); close(point(withSize.r.objects, 'B').y, 2);
    const exact = shapeOf('kenarları 3, 4 ve 5 olan ABC üçgeni', two);
    close(dist(point(exact.r.objects, 'C'), point(exact.r.objects, 'B')), 4);
    expect(bad('kenarları 3, 4 ve 5 olan ABC üçgeni', pointsScene({ A: [0, 0], B: [5, 0] }))).toContain('uzunluğu');
    expect(bad('ABCD üçgeni çiz')).toContain('üç köşesi');

    const existing = ok('ABC üçgenini çiz', connect.r.objects);
    expect(polygons(existing.objects)).toHaveLength(1);
    expect(existing.message).toContain('zaten var');
    expect(existing.selectedIds).toEqual([connect.poly.id]);
  });

  it('selected points make a triangle; genitive and named modifications', () => {
    const scene = pointsScene({ P: [0, 0], Q: [3, 0], R: [0, 3] });
    const ids = ['P', 'Q', 'R'].map(n => point(scene, n).id);
    const fromSelection = shapeOf('seçili noktalardan üçgen oluştur', scene, ids);
    expect(fromSelection.pts.map(p => p.label)).toEqual(['P', 'Q', 'R']);
    expect(bad('seçili noktalardan üçgen oluştur', scene, ids.slice(0, 2))).toContain('üç nokta');

    const tri = ok('A(0;0) B(4;0) C(1;3) üçgeni');
    const named = ok('ABC üçgeninin kenarları 5, 6 ve 7 olsun', tri.objects);
    const [a, b, c] = ['A', 'B', 'C'].map(n => point(named.objects, n));
    close(dist(a, b), 5); close(dist(b, c), 6); close(dist(c, a), 7);
    const genitive = ok('üçgenin kenarları 6, 8 ve 10 olsun', tri.objects);
    close(dist(point(genitive.objects, 'C'), point(genitive.objects, 'A')), 10);
    expect(bad('üçgenin kenarları 3, 4 ve 5 olsun')).toContain('üçgen bulunamadı');
  });

  it('live constructions: polygons reference constructed vertices and follow them; deleting a vertex cascades', () => {
    const scene = build(s => {
      const d = s.addPoint({ x: 0, y: 4 }, { label: 'D' }), e = s.addPoint({ x: 4, y: 4 }, { label: 'E' });
      s.addPoint({ x: 0, y: 0 }, { label: 'A' });
      s.addPoint({ x: 4, y: 0 }, { label: 'B' });
      s.addPoint({ x: 0, y: 0 }, { label: 'C', construction: { kind: 'midpoint', pointIds: [d.id, e.id] } });
    });
    const { r, poly } = shapeOf('ABC üçgenini çiz', scene);
    const moved = resolveCommandBindings(r.objects.map(o => o.type === 'point' && o.label === 'E' ? { ...o, x: 8, y: 8 } as PointObject : o));
    const c = point(moved, 'C');
    close(c.x, 4); close(c.y, 6);
    close(area(verts(moved, poly)), 12);
    const s = new CommandScene(r.objects);
    const removed = s.remove([point(r.objects, 'D').id]);
    expect(removed).toContain(poly.id);
    expect(new CommandScene(r.objects).remove([point(r.objects, 'A').id])).toContain(poly.id);
  });

  it('fails clearly for incomplete or invalid triangle data', () => {
    expect(bad('kenarları 5 ve 7 olan üçgen')).toContain('üç kenar');
    expect(bad('açıları 100, 50 ve 30 derece olan dik üçgen')).toMatch(/dik üçgen/);
    expect(bad('açıları 100, 60 ve 40 derece olan üçgen')).toContain('180');
    expect(bad('açıları 100 ve 90 derece olan üçgen')).toContain('180');
    expect(bad('hipotenüsü 3 bir dik kenarı 5 olan dik üçgen')).toContain('Hipotenüs');
    expect(bad('kenarı -2 olan eşkenar üçgen')).toContain('0’dan büyük');
    expect(bad('5 dik üçgen çiz')).toContain('dik kenar');
  });

  it('applies a colour and supports several at once', () => {
    const red = shapeOf('kırmızı üçgen çiz');
    expect(red.poly.color).toBe('#ef4444');
    expect(red.poly.fillColor).toBe('#ef4444');
    const many = ok('3 tane üçgen çiz');
    expect(polygons(many.objects)).toHaveLength(3);
    expect(bad('2 tane ABC üçgeni çiz')).toContain('tek seferde');
  });
});

describe('polygons: squares and rectangles', () => {
  it.each([
    ['Kare çiz', 4],
    ['kenarı 5 cm olan kare', 5],
    ['Kenarı 5 cm olan kare çiz', 5],
    ['bir kenarı 5 olan kare', 5],
    ['alanı 16 olan kare', 4],
    ['Alanı 16 olan kare çiz', 4],
    ['çevresi 20 olan kare', 5],
    ['köşegeni 6 olan kare', 6 / Math.SQRT2],
    ['Köşegeni 6 olan kare çiz', 6 / Math.SQRT2],
    ['3 kare çiz', 3],
    ['kenarı iki buçuk olan kare', 2.5],
  ])('%s', (text, side) => {
    const { pts, poly } = shapeOf(text);
    sides(pts).forEach(s => close(s, side));
    close(dist(pts[0], pts[2]), side * Math.SQRT2);
    expect(area(pts)).toBeGreaterThan(0);
    expect(poly).toMatchObject({ color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 0.18, showArea: true, showPerimeter: true });
  });

  it('AB kenarlı kare is built counter-clockwise on existing A and B', () => {
    const scene = pointsScene({ A: [0, 0], B: [3, 1] });
    for (const text of ['AB kenarlı kare çiz', 'AB kenarı üzerine kare çiz', '[AB] üzerine kare çiz']) {
      const { r, pts } = shapeOf(text, scene);
      expect(pts[0].id).toBe(point(scene, 'A').id);
      close(pts[2].x, 2); close(pts[2].y, 4);
      close(pts[3].x, -1); close(pts[3].y, 3);
      expect(r.objects.filter(o => o.type === 'point')).toHaveLength(4);
    }
    expect(bad('kenarı 5 olan AB kenarlı kare', scene)).toContain('uzunluğu');
  });

  it('ABCD karesi: new names, existing square, and a non-square warning', () => {
    const fresh = shapeOf('ABCD karesini çiz');
    expect(fresh.pts.map(p => p.label)).toEqual(['A', 'B', 'C', 'D']);
    const existing = pointsScene({ A: [0, 0], B: [2, 0], C: [2, 2], D: [0, 2] });
    expect(shapeOf('ABCD karesi', existing).poly.color).toBe('#f43f5e');
    const skew = pointsScene({ A: [0, 0], B: [3, 0], C: [2, 2], D: [0, 2] });
    const warn = shapeOf('ABCD karesini çiz', skew);
    expect(warn.r.message).toContain('tam bir kare oluşturmuyor');
    expect(bad('ABC karesini çiz')).toContain('dört köşe');
  });

  it('places squares by centre, corner or an existing centre point', () => {
    const centre = shapeOf('Merkezi (2; 3) olan kare çiz');
    close(centre.pts[0].x, 0); close(centre.pts[0].y, 1); close(centre.pts[2].x, 4); close(centre.pts[2].y, 5);
    const corner = shapeOf('sol alt köşesi (1;1) olan kenarı 2 olan kare');
    expect([corner.pts[0].x, corner.pts[0].y, corner.pts[2].x, corner.pts[2].y]).toEqual([1, 1, 3, 3]);
    const scene = pointsScene({ M: [5, 5] });
    const around = shapeOf('M merkezli kare çiz', scene);
    close((around.pts[0].x + around.pts[2].x) / 2, 5);
    expect(around.pts.map(p => p.label)).toEqual(['A', 'B', 'C', 'D']);
    expect(bad('K merkezli kare çiz')).toContain('K noktası bulunamadı');
  });

  it('squares from coordinates and errors', () => {
    const coords = shapeOf('köşeleri (0;0), (2;0), (2;2), (0;2) olan kare');
    expect(coords.pts.map(p => [p.x, p.y])).toEqual([[0, 0], [2, 0], [2, 2], [0, 2]]);
    expect(bad('kenarı 0 olan kare')).toContain('0’dan büyük');
    expect(bad('3 5 kare çiz')).toContain('dikdörtgen');
  });

  it.each([
    ['Dikdörtgen çiz', 6, 4],
    ['3x4 dikdörtgen', 3, 4],
    ['3 x 4 dikdörtgen çiz', 3, 4],
    ["4'e 6 dikdörtgen", 4, 6],
    ['eni 3 boyu 5 olan dikdörtgen', 3, 5],
    ['Genişliği 6 yüksekliği 2 olan dikdörtgen çiz', 6, 2],
    ['uzunluğu 8 genişliği 3 olan dikdörtgen', 8, 3],
    ['Uzun kenarı 8, kısa kenarı 3 olan dikdörtgen çiz', 8, 3],
    ['kenarları 4 ve 6 olan dikdörtgen', 4, 6],
    ['Alanı 12, bir kenarı 3 olan dikdörtgen çiz', 3, 4],
    ['alanı 20 çevresi 18 olan dikdörtgen', 5, 4],
    ['çevresi 14 bir kenarı 3 olan dikdörtgen', 3, 4],
    ['köşegeni 5 bir kenarı 3 olan dikdörtgen', 3, 4],
    ['kenarları 3 ve 5 olan dikdörtgen çizer misin', 3, 5],
    ['dikdörtgen istiyorum', 6, 4],
  ])('%s', (text, w, h) => {
    const { pts, poly } = shapeOf(text);
    close(dist(pts[0], pts[1]), w); close(dist(pts[1], pts[2]), h);
    close(pts[1].y, pts[0].y);
    expect(poly.color).toBe('#f59e0b');
    expect(area(pts)).toBeGreaterThan(0);
  });

  it('rectangle defaults are announced and bad data fails', () => {
    expect(ok('eni 3 olan dikdörtgen').message).toContain('Boy 4');
    expect(bad('alanı 10 çevresi 4 olan dikdörtgen')).toContain('alan ve çevre');
    expect(bad('köşegeni 2 bir kenarı 3 olan dikdörtgen')).toContain('Köşegen');
    expect(bad('3 4 5 dikdörtgen')).toContain('en ve boy');
  });
});

describe('polygons: regular polygons', () => {
  const regularCheck = (pts: PointObject[], n: number, radius: number, centre: Point2D = { x: 0, y: 0 }) => {
    expect(pts).toHaveLength(n);
    pts.forEach(p => close(dist(p, centre), radius));
    const s = sides(pts);
    s.forEach(x => close(x, s[0]));
    // Ders kitabı düzeni: yatay tabana oturur, A sol alt köşede, köşeler saat yönünün tersine
    close(pts[0].x, centre.x - radius * Math.sin(Math.PI / n)); close(pts[0].y, centre.y - radius * Math.cos(Math.PI / n));
    expect(pts[1].y).toBe(pts[0].y);
    expect(pts[1].x).toBeGreaterThan(pts[0].x);
    expect(Math.min(...pts.map(p => p.y))).toBe(pts[0].y);
    expect(area(pts)).toBeGreaterThan(0);
  };

  it.each([
    ['6 kenarlı düzgün çokgen çiz', 6, 3],
    ['Düzgün altıgen çiz', 6, 3],
    ['düzgün altıgen', 6, 3],
    ['Düzgün beşgen çiz', 5, 3],
    ['Yarıçapı 3 olan düzgün 7-gen çiz', 7, 3],
    ['12 kenarlı düzgün çokgen çiz', 12, 3],
    ['on iki kenarlı düzgün çokgen', 12, 3],
    ['düzgün on iki gen çiz', 12, 3],
    ['onikigen çiz', 12, 3],
    ['yedigen çiz', 7, 3],
    ['5 köşeli çokgen çiz', 5, 3],
    ['on köşeli çokgen', 10, 3],
    ['yarıçapı 2,5 olan düzgün beşgen', 5, 2.5],
    ['çapı 8 olan düzgün sekizgen', 8, 4],
    ['düzgün dörtgen çiz', 4, 3],
    ['düzgün 9 gen', 9, 3],
  ])('%s', (text, n, radius) => {
    const { pts, poly } = shapeOf(text);
    regularCheck(pts, n, radius);
    expect(poly).toMatchObject({ color: '#059669', fillColor: '#10b981', fillOpacity: 0.2 });
    expect(pts[0].color).toBe('#10b981');
  });

  it('side, perimeter and area specifications', () => {
    const octagon = shapeOf('Kenar uzunluğu 2 olan düzgün sekizgen çiz');
    sides(octagon.pts).forEach(s => close(s, 2));
    expect(octagon.poly.label).toBe('Düzgün Sekizgen');
    const hexagon = shapeOf('kenarı 3 olan düzgün altıgen');
    sides(hexagon.pts).forEach(s => close(s, 3));
    expect(hexagon.poly.label).toBe('Düzgün Altıgen (Petek)');
    sides(shapeOf('çevresi 24 olan düzgün altıgen').pts).forEach(s => close(s, 4));
    close(area(shapeOf('alanı 24 olan düzgün altıgen').pts), 24);
    expect(shapeOf('20 kenarlı düzgün çokgen').poly.label).toBe('Düzgün 20-gen');
  });

  it('centre, names and fitting to an existing edge', () => {
    const centred = shapeOf('(2;3) merkezli düzgün altıgen');
    regularCheck(centred.pts, 6, 3, { x: 2, y: 3 });
    const named = shapeOf('ABCDEF altıgeni');
    expect(named.pts.map(p => p.label)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    const scene = pointsScene({ A: [0, 0], B: [2, 0] });
    const fitted = shapeOf('AB kenarlı düzgün altıgen çiz', scene);
    sides(fitted.pts).forEach(s => close(s, 2));
    expect(fitted.pts[0].id).toBe(point(scene, 'A').id);
    expect(area(fitted.pts)).toBeGreaterThan(0);
    expect(bad('ABCD altıgeni çiz')).toContain('6 köşe');
  });

  it('rejects invalid regular polygons', () => {
    expect(bad('düzgün 31-gen çiz')).toContain('3 ile 30');
    expect(bad('2 kenarlı düzgün çokgen çiz')).toContain('3 ile 30');
    expect(bad('düzgün çokgen çiz')).toContain('kaç kenarlı');
    expect(bad('düzgün altıgen 3')).toContain('Sayıların');
  });
});

describe('polygons: special quadrilaterals', () => {
  it('parallelograms', () => {
    const def = shapeOf('Paralelkenar çiz');
    close(dist(def.pts[0], def.pts[1]), 5); close(dist(def.pts[1], def.pts[2]), 3);
    close(angleAt(def.pts[3], def.pts[0], def.pts[1]), 60);
    const spec = shapeOf('Kenarları 5 ve 3, açısı 60 derece olan paralelkenar çiz');
    close(angleAt(spec.pts[3], spec.pts[0], spec.pts[1]), 60);
    close(spec.pts[2].x - spec.pts[3].x, 5); close(spec.pts[2].y, spec.pts[3].y);
    const other = shapeOf('kenarları 4 ve 6 olan paralelkenar');
    expect(other.r.message).toContain('Açı 60');
    const height = shapeOf('tabanı 6 yüksekliği 3 olan paralelkenar');
    close(height.pts[3].y - height.pts[0].y, 3);
    const obtuse = shapeOf('kenarları 4 ve 2, açısı 120 derece olan paralelkenar');
    close(angleAt(obtuse.pts[3], obtuse.pts[0], obtuse.pts[1]), 120);
    expect(def.poly).toMatchObject({ color: '#10b981', label: 'ABCD' });
  });

  it('rhombuses', () => {
    const a = shapeOf('Kenarı 4, açısı 60 derece olan eşkenar dörtgen çiz');
    sides(a.pts).forEach(s => close(s, 4));
    close(angleAt(a.pts[3], a.pts[0], a.pts[1]), 60);
    const d = shapeOf('Köşegenleri 6 ve 8 olan eşkenar dörtgen çiz');
    close(dist(d.pts[0], d.pts[2]), 6); close(dist(d.pts[1], d.pts[3]), 8);
    sides(d.pts).forEach(s => close(s, 5));
    expect(area(d.pts)).toBeGreaterThan(0);
    const sd = shapeOf('kenarı 5 köşegeni 6 olan eşkenar dörtgen');
    close(dist(sd.pts[1], sd.pts[3]), 8);
    sides(shapeOf('eşkenar dörtgen çiz').pts).forEach(s => close(s, 4));
    expect(bad('kenarı 2 köşegeni 5 olan eşkenar dörtgen')).toContain('Köşegen');
  });

  it('trapezoids', () => {
    const t = shapeOf('Tabanları 6 ve 4, yüksekliği 3 olan yamuk çiz');
    close(dist(t.pts[0], t.pts[1]), 6); close(dist(t.pts[2], t.pts[3]), 4);
    close(t.pts[3].y - t.pts[0].y, 3); close(t.pts[2].y, t.pts[3].y);
    const iso = shapeOf('İkizkenar yamuk çiz');
    close(dist(iso.pts[1], iso.pts[2]), dist(iso.pts[3], iso.pts[0]));
    const right = shapeOf('Dik yamuk çiz');
    close(angleAt(right.pts[3], right.pts[0], right.pts[1]), 90);
    const legs = shapeOf('tabanları 8 ve 2, yan kenarları 5 olan ikizkenar yamuk');
    close(legs.pts[3].y - legs.pts[0].y, 4);
    close(dist(legs.pts[1], legs.pts[2]), 5);
    const altUst = shapeOf('alt tabanı 7 üst tabanı 3 yüksekliği 2 olan yamuk');
    close(dist(altUst.pts[0], altUst.pts[1]), 7); close(dist(altUst.pts[2], altUst.pts[3]), 3);
    expect(bad('tabanları 4 ve 4 olan yamuk')).toContain('farklı');
    expect(t.r.message).toContain('yamuğu');
  });

  it('kites and a generic quadrilateral', () => {
    const k = shapeOf('Köşegenleri 6 ve 4 olan deltoid çiz');
    close(dist(k.pts[0], k.pts[2]), 6); close(dist(k.pts[1], k.pts[3]), 4);
    close(dist(k.pts[0], k.pts[1]), dist(k.pts[0], k.pts[3]));
    close(dist(k.pts[2], k.pts[1]), dist(k.pts[2], k.pts[3]));
    expect(area(k.pts)).toBeGreaterThan(0);
    const sidesKite = shapeOf('kısa kenarları 3 uzun kenarları 5 olan deltoid');
    close(dist(sidesKite.pts[0], sidesKite.pts[1]), 5); close(dist(sidesKite.pts[1], sidesKite.pts[2]), 3);
    expect(shapeOf('deltoid çiz').pts).toHaveLength(4);
    const quad = shapeOf('Dörtgen çiz');
    expect(quad.pts).toHaveLength(4);
    expect(area(quad.pts)).toBeGreaterThan(0);
    expect(bad('kısa kenarları 3 olan deltoid')).toContain('uzun kenar');
  });
});

describe('polygons: general polygons', () => {
  it('from coordinates, labels and selection', () => {
    const coords = shapeOf('(0; 0), (4; 0), (4; 3), (0; 3) köşeli çokgen çiz');
    expect(coords.pts.map(p => [p.label, p.x, p.y])).toEqual([['A', 0, 0], ['B', 4, 0], ['C', 4, 3], ['D', 0, 3]]);
    expect(coords.poly).toMatchObject({ label: 'ABCD', color: '#10b981', fillOpacity: 0.15, showArea: true, showPerimeter: true });
    const namedCoords = shapeOf('A(0; 0), B(5; 0), C(4; 3), D(1; 3) dörtgenini çiz');
    expect(namedCoords.pts.map(p => p.label)).toEqual(['A', 'B', 'C', 'D']);
    const mixed = shapeOf('köşeleri A(0;0), B(4;0), C(4;3) ve D(0;3) olan dörtgen');
    close(area(mixed.pts), 12);

    const five = pointsScene({ A: [0, 0], B: [4, 0], C: [5, 3], D: [2, 5], E: [-1, 3] });
    const named = shapeOf('ABCDE çokgenini çiz', five);
    expect(named.r.objects.filter(o => o.type === 'point')).toHaveLength(5);
    expect(named.pts.map(p => p.label)).toEqual(['A', 'B', 'C', 'D', 'E']);
    const listed = shapeOf('A, B, C ve D noktalarından dörtgen oluştur', five);
    expect(listed.pts.map(p => p.label)).toEqual(['A', 'B', 'C', 'D']);

    const ids = ['A', 'B', 'C', 'D'].map(n => point(five, n).id);
    const selected = shapeOf('Seçili noktalardan çokgen oluştur', five, ids);
    expect(selected.pts).toHaveLength(4);

    const fresh = shapeOf('ABCDE çokgenini çiz');
    expect(fresh.pts).toHaveLength(5);
    expect(fresh.r.message).toContain('düzgün çokgen düzeninde');
    expect(fresh.pts[1].y).toBe(fresh.pts[0].y); // A sol alt, B sağ alt: yatay taban
    expect(fresh.pts[1].x).toBeGreaterThan(fresh.pts[0].x);
    expect(area(fresh.pts)).toBeGreaterThan(0);
  });

  it('errors and the polygon tool fallback', () => {
    const partial = pointsScene({ A: [0, 0], B: [4, 0] });
    expect(bad('ABCD çokgenini çiz', partial)).toContain('C, D noktaları yok');
    expect(bad('(0;0), (1;1) köşeli çokgen')).toContain('en az üç');
    expect(bad('köşeleri (0;0), (1;0), (1;1) olan dörtgen')).toContain('dört köşe');
    const tool = ok('çokgen çiz');
    expect(tool.actions).toEqual([{ kind: 'selectTool', tool: 'polygon' }]);
    expect(tool.sceneChanged).toBe(false);
  });
});

describe('polygons: examples and ownership', () => {
  const special: Record<string, () => { scene: MathObject[]; selection?: string[] }> = {
    'ABC üçgeninin kenarları 5, 6 ve 7 olsun': () => ({ scene: ok('A(0;0) B(4;0) C(1;3) üçgeni').objects }),
    'Seçili noktalardan çokgen oluştur': () => {
      const scene = pointsScene({ P: [0, 0], Q: [3, 0], R: [2, 2] });
      return { scene, selection: scene.map(o => o.id) };
    },
  };
  const all = handlers.flatMap(h => h.examples.map(example => [h.id, example] as const));

  it('has 6–20 examples per handler', () => {
    for (const h of handlers) {
      expect(h.examples.length).toBeGreaterThanOrEqual(5);
      expect(h.examples.length).toBeLessThanOrEqual(20);
    }
  });

  it.each(all)('%s: “%s” succeeds and is ranked first by its own handler', (id, example) => {
    const { scene, selection } = special[example]?.() ?? { scene: [] };
    const result = ok(example, scene, selection ?? []);
    expect(result.message.length).toBeGreaterThan(5);
    const s = new CommandScene(scene, selection ?? []);
    const ranked = rankHandlers(parseClause(example, s.known()), s, handlers);
    expect(ranked[0].handler.id).toBe(id);
  });

  it.each([
    'ABC üçgeninin alanını hesapla', 'üçgeni sil', "ABC'nin çevrel çemberi", 'üçgenin yüksekliklerini çiz', 'kareyi döndür', 'alanı kaç',
    'üçgenin alanı kaç', 'karenin kenarını 5 yap', 'üçgeni kırmızı yap', 'ABC üçgeninin çevrel çemberini çiz', 'üçgenin kenar orta noktalarını oluştur',
    'ABC üçgeninin ağırlık merkezini bul', 'üçgeni x eksenine göre yansıt', 'kareyi 2 kat büyüt', 'ABC üçgenini A etrafında 90 derece döndür',
    'üçgen aracını seç', 'Düzgün çokgen aracını aç', 'x kare fonksiyonu çiz', 'üçgen uzunluklarını kaydırıcıya bağla', 'üçgenin kaydırıcı bağını kaldır',
    'tüm üçgenleri sil', 'üçgeni kopyala', 'ABC üçgeni üzerinde nokta oluştur', 'üçgenin içine çember çiz', 'ABCD karesinin köşegenlerini çiz',
    'kareli düzlem', 'üçgenin açılarını göster', 'ABC üçgenini 2 birim sağa kaydır', 'karenin alanını yaz', 'ABC üçgeninin adını XYZ yap',
    'C noktasından dik indir', 'üçgeni gizle', 'yarıçapı 3 olan çember çiz', 'ABCD karesinin alanı', 'üçgenin simetriğini çiz', 'tüm kareleri seç',
    'üçgenin çevresini göster', 'A noktasının açısını yaz', 'AB doğru parçası çiz', 'üçgeni (2,3) vektörü kadar ötele', 'karenin içini boya',
    'üçgen çizme', 'kare kök fonksiyonu', 'ABC üçgeninin iç teğet çemberi', 'üçgenin kenarlarını ölç', 'dikdörtgenin köşegen uzunluğunu hesapla',
  ])('does not claim “%s”', text => {
    const scene = ok('A(0;0) B(4;0) C(1;3) üçgeni').objects;
    const s = new CommandScene(scene);
    expect(rankHandlers(parseClause(text, s.known()), s, handlers)).toEqual([]);
    expect(runWith(handlers, text, scene).ok).toBe(false);
  });

  it('works inside multi-clause commands and keeps focus on the new shape', () => {
    const r = ok('üçgen çiz ve kare çiz');
    expect(polygons(r.objects)).toHaveLength(2);
    expect(r.selectedIds).toEqual([polygons(r.objects)[1].id]);
    const chain = ok('üçgen çiz sonra 3 4 5 üçgeni olsun');
    expect(polygons(chain.objects)).toHaveLength(1);
    const [a, b] = ['A', 'B'].map(n => point(chain.objects, n));
    close(dist(a, b), 3);
  });

  it('never mutates the input scene and respects the viewport for placement', () => {
    const scene = pointsScene({ A: [0, 0], B: [3, 1] });
    const snapshot = JSON.stringify(scene);
    ok('AB kenarlı kare çiz', scene);
    expect(JSON.stringify(scene)).toBe(snapshot);
    const viewport: ViewportTransform = { zoom: 44, panX: 0, panY: 0, width: 880, height: 660, showGrid: true, showAxes: true, showCoordinates: true, snapToGrid: false } as ViewportTransform;
    const bounds = getVisibleWorldBounds(viewport);
    let objects: MathObject[] = [];
    for (let i = 0; i < 3; i++) objects = expectOk(handlers, 'kare çiz', objects, [], { viewport }).objects;
    const pts = byType(objects, 'point');
    expect(pts).toHaveLength(12);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(bounds.minX); expect(p.x).toBeLessThanOrEqual(bounds.maxX);
      expect(p.y).toBeGreaterThanOrEqual(bounds.minY); expect(p.y).toBeLessThanOrEqual(bounds.maxY);
    }
  });
});
