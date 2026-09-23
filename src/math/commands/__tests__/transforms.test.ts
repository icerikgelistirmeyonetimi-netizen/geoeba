import { describe, expect, it, vi } from 'vitest';
import type { AngleObject, ArcObject, CircleObject, EllipseObject, MathObject, PointObject, PolygonObject, SegmentObject } from '@/types/math';

// Bu dosya yalnızca dönüşüm işleyicilerini sınar; diğer ailelerin (paralel geliştirilen) modülleri yüklenmesin.
vi.mock('../handlers', () => ({ HANDLERS: [], COMMAND_CATALOG: [] }));
import { reflectAcross, resolveCommandBindings, rotateAround } from '@/math/commandBindings';
import { handlers } from '../handlers/transforms';
import { createImages, translateMap } from '../handlers/transforms/core';
import { rankHandlers } from '../engine';
import { COLORS, CommandScene } from '../scene';
import { parseClause } from '../text';
import { build, byLabel, byType, dist, expectFail, expectOk, point, runWith } from './helpers';

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

const close = (p: { x: number; y: number }, x: number, y: number) => {
  expect(p.x).toBeCloseTo(x, 6);
  expect(p.y).toBeCloseTo(y, 6);
};

type Ids = Record<string, string>;
/** A(1,1), B(4,1), C(2,3) üçgeni. */
function triangle(extra?: (s: CommandScene, ids: Ids) => void): MathObject[] {
  return build(s => {
    const A = s.addPoint({ x: 1, y: 1 }, { label: 'A' });
    const B = s.addPoint({ x: 4, y: 1 }, { label: 'B' });
    const C = s.addPoint({ x: 2, y: 3 }, { label: 'C' });
    const poly = s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
    extra?.(s, { A: A.id, B: B.id, C: C.id, poly: poly.id });
  });
}
const polyId = (objects: MathObject[], label = 'ABC') => byType(objects, 'polygon').find(p => p.label === label)!.id;

/** Nokta(lar)ı taşıyıp canlı inşaları yeniden çözer (sürüklemenin yaptığı gibi). */
function move(objects: MathObject[], moves: Record<string, { x: number; y: number }>): MathObject[] {
  return resolveCommandBindings(objects.map(o => o.type === 'point' && moves[o.label] ? { ...o, ...moves[o.label] } : o));
}

function sweepOf(objects: MathObject[], arc: ArcObject) {
  const c = point(objects, objects.find(o => o.id === arc.centerPointId)!.label);
  const s = objects.find(o => o.id === arc.startPointId) as PointObject;
  const d = objects.find(o => o.id === arc.directionPointId) as PointObject;
  let a = Math.atan2(d.y - c.y, d.x - c.x) - Math.atan2(s.y - c.y, s.x - c.x);
  while (a < 0) a += 2 * Math.PI;
  return { degrees: a * 180 / Math.PI, radius: dist(c, s), start: s, center: c };
}

/** Örnek komutların hepsinin çalıştığı zengin sahne. */
function rich(): MathObject[] {
  return build(s => {
    const A = s.addPoint({ x: 1, y: 1 }, { label: 'A' });
    const B = s.addPoint({ x: 4, y: 1 }, { label: 'B' });
    const C = s.addPoint({ x: 4, y: 4 }, { label: 'C' });
    const D = s.addPoint({ x: 1, y: 4 }, { label: 'D' });
    s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
    s.addPolygon([A.id, B.id, C.id, D.id], { kind: 'square' });
    s.addSegment(A.id, B.id);
    s.addPoint({ x: 0, y: 0 }, { label: 'O' });
    const E = s.addPoint({ x: -5, y: -2 }, { label: 'E' });
    const F = s.addPoint({ x: 5, y: -1 }, { label: 'F' });
    s.addLine(E.id, F.id, { label: 'd' });
    const G = s.addPoint({ x: 8, y: 8 }, { label: 'G' });
    s.addCircle({ centerId: G.id, radius: 2 });
    const H = s.addPoint({ x: -6, y: 6 }, { label: 'H' });
    s.addEllipse(H.id, 3, 1.5, { rotation: 20 });
  });
}

describe('dönüşüm görüntüsünde ölçüm etiketi çapaları', () => {
  it('çapayı görüntü noktalarına bağlar; hizalama, kayıklık ve kaynak korunur', () => {
    const source = triangle((s, ids) => s.update(ids.poly, {
      labelAnchors: { area: { pointIds: [ids.A, ids.B, ids.C], offset: { x: 3, y: -2 }, alignment: 'left' } },
      labelOffsets: { area: { x: 1, y: 2 } },
    }));
    const original = byType(source, 'polygon')[0];
    const result = expectOk(handlers, "ABC'yi (2, 3) vektörüyle ötele", source);
    const image = byLabel(result.objects, "A'B'C'") as PolygonObject;
    expect(image.labelAnchors?.area).toEqual({
      pointIds: ["A'", "B'", "C'"].map(label => point(result.objects, label).id),
      offset: { x: 3, y: -2 }, alignment: 'left',
    });
    expect(image.labelOffsets).toEqual(original.labelOffsets);
    expect(original.labelAnchors?.area.pointIds).toEqual(original.pointIds);
    expect(byLabel(result.objects, 'ABC')?.labelAnchors).toEqual(original.labelAnchors);
  });

  it.each([false, true])('ortak çapanın bütün hedefler tamamlanınca eşlenmesi hedef sırasından bağımsızdır (%s)', (ters) => {
    const source = triangle((s, ids) => {
      const ab = s.addSegment(ids.A, ids.B);
      s.addSegment(ids.B, ids.C);
      s.update(ab.id, {
        labelAnchors: { length: { pointIds: [ids.A, ids.B, ids.C], offset: { x: 2, y: 3 }, alignment: 'right' } },
      });
    });
    const scene = new CommandScene(source);
    const targets = byType(scene.objects, 'segment');
    const result = createImages(scene, ters ? [...targets].reverse() : targets, translateMap(scene, { v: { x: 1, y: 1 } }));
    const image = result.images.find(o => o.label === "[A'B']")!;
    expect(image.labelAnchors?.length.pointIds).toEqual(["A'", "B'", "C'"].map(label => point(scene.objects, label).id));
    expect(scene.get(image.id)?.labelAnchors).toEqual(image.labelAnchors);
    expect(result.created).toBe(5); // Üç ortak nokta, iki parça.
    expect(byType(scene.objects, 'point')).toHaveLength(6);
  });

  it('eşlenmeyen ortak çapa düşer; bağımsız çapa ve eski kayıklık kalır, fazladan nokta oluşmaz', () => {
    const source = triangle((s, ids) => {
      const ab = s.addSegment(ids.A, ids.B);
      s.update(ab.id, {
        labelAnchors: {
          length: { pointIds: [ids.A, ids.B, ids.C], offset: { x: 2, y: 3 }, alignment: 'left' },
          pointLabel: { pointIds: [ids.A, ids.B], offset: { x: 0, y: 1 }, alignment: 'center' },
        },
        labelOffsets: { length: { x: 4, y: -2 } },
      });
    });
    const scene = new CommandScene(source);
    const [image] = createImages(scene, byType(scene.objects, 'segment'), translateMap(scene, { v: { x: 1, y: 1 } })).images;
    expect(image.labelAnchors?.length).toBeUndefined();
    expect(image.labelAnchors?.pointLabel.pointIds).toEqual(["A'", "B'"].map(label => point(scene.objects, label).id));
    expect(image.labelOffsets).toEqual({ length: { x: 4, y: -2 } });
    expect(scene.objects.some(o => o.label === "C'")).toBe(false);
    expect(byType(scene.objects, 'point')).toHaveLength(5);
    expect(byType(source, 'segment')[0].labelAnchors?.length.pointIds).toContain(point(source, 'C').id);
  });

  it('hiçbir çapa tamamlanamıyorsa eski noktalara bağlı boş bir çapa bırakmaz', () => {
    const source = triangle((s, ids) => {
      const ab = s.addSegment(ids.A, ids.B);
      s.update(ab.id, {
        labelAnchors: { length: { pointIds: [ids.A, ids.C], offset: { x: 2, y: 3 }, alignment: 'left' } },
        labelOffsets: { length: { x: 4, y: -2 } },
      });
    });
    const scene = new CommandScene(source);
    const [image] = createImages(scene, byType(scene.objects, 'segment'), translateMap(scene, { v: { x: 1, y: 1 } })).images;
    expect(image.labelAnchors).toBeUndefined();
    expect(image.labelOffsets).toEqual({ length: { x: 4, y: -2 } });
  });

  it('yeniden kullanılan görüntünün sonradan düzenlenmiş çapası ezilmez', () => {
    const source = triangle((s, ids) => s.update(ids.poly, {
      labelAnchors: { area: { pointIds: [ids.A, ids.B, ids.C], offset: { x: 1, y: 1 }, alignment: 'left' } },
    }));
    const scene = new CommandScene(source);
    const targets = byType(scene.objects, 'polygon');
    const map = translateMap(scene, { v: { x: 1, y: 1 } });
    const [image] = createImages(scene, targets, map).images;
    const changed = { area: { pointIds: [point(scene.objects, "A'").id], offset: { x: 8, y: 9 }, alignment: 'right' as const } };
    scene.update(image.id, { labelAnchors: changed });
    const repeated = createImages(scene, targets, map);
    expect(repeated.created).toBe(0);
    expect(repeated.reused).toBe(1);
    expect(repeated.images[0].labelAnchors).toEqual(changed);
    expect(scene.get(image.id)?.labelAnchors).toEqual(changed);
  });
});

// ---------------------------------------------------------------------------
// Örnekler
// ---------------------------------------------------------------------------

describe('örnek komutlar', () => {
  const all = handlers.flatMap(h => h.examples.map(example => [h.id, example] as const));
  it('her işleyicide 6–20 örnek var', () => {
    for (const h of handlers) {
      expect(h.examples.length).toBeGreaterThanOrEqual(6);
      expect(h.examples.length).toBeLessThanOrEqual(20);
    }
  });
  it.each(all)('%s: %s', (id, example) => {
    const scene = rich();
    const selection = /seçili/.test(example) ? [polyId(scene)] : [];
    const state = new CommandScene(scene, selection);
    const ranked = rankHandlers(parseClause(example, state.known()), state, handlers);
    expect(ranked[0]?.handler.id).toBe(id);
    const result = expectOk(handlers, example, scene, selection);
    expect(result.sceneChanged).toBe(true);
    expect(result.selectedIds.length).toBeGreaterThan(0);
    expect(result.message).not.toMatch(/undefined|NaN/);
  });
});

// ---------------------------------------------------------------------------
// Yansıma
// ---------------------------------------------------------------------------

describe('yansıma', () => {
  it('x eksenine göre canlı görüntü üretir (etiket, renk, inşa)', () => {
    const scene = triangle();
    const r = expectOk(handlers, 'ABC üçgenini x eksenine göre yansıt', scene);
    close(point(r.objects, "A'"), 1, -1);
    close(point(r.objects, "B'"), 4, -1);
    close(point(r.objects, "C'"), 2, -3);
    const image = byLabel(r.objects, "A'B'C'") as PolygonObject;
    expect(image.type).toBe('polygon');
    expect(image.color).toBe(COLORS.image);
    expect(image.fillColor).toBe(COLORS.image);
    expect(image.pointIds).toEqual(["A'", "B'", "C'"].map(l => point(r.objects, l).id));
    const bImage = point(r.objects, "B'");
    expect(bImage.construction).toEqual({ kind: 'reflect', sourceId: point(r.objects, 'B').id, axis: 'x' });
    expect(bImage.isIndependent).toBe(false);
    expect(bImage.color).toBe(COLORS.image);
    expect(r.selectedIds).toEqual([image.id]);
    expect(r.message).toContain("A'B'C'");
    expect(r.message).toContain('x eksenine');
    // canlı: kaynak taşınınca görüntü izler
    const moved = move(r.objects, { B: { x: 5, y: 2 } });
    close(point(moved, "B'"), 5, -2);
  });

  it.each([
    'ABC üçgenini x eksenine göre yansıt',
    "ABC'nin x eksenine göre simetriğini al",
    "abc'yi x ekseninde yansıt",
    'ABC üçgeninin X eksenine göre yansımasını çiz',
    "ABC'yi Ox eksenine göre yansıtır mısın",
    "lütfen ABC'yi apsis eksenine göre yansıt",
    "x eksenine göre ABC'nin simetriğini oluştur",
    "ABC'yi y = 0 doğrusuna göre yansıt",
    'ABC nin x eksenine göre simetriğini çizebilir misin?',
  ])('x ekseni: %s', text => {
    const r = expectOk(handlers, text, triangle());
    close(point(r.objects, "B'"), 4, -1);
    close(point(r.objects, "C'"), 2, -3);
  });

  it.each([
    'ABC üçgenini y eksenine göre yansıt',
    "ABC'nin ordinat eksenine göre simetriği",
    "ABC'yi x = 0 doğrusuna göre yansıt",
    "ABC'yi Oy eksenine göre yansıt",
  ])('y ekseni: %s', text => {
    const r = expectOk(handlers, text, triangle());
    close(point(r.objects, "B'"), -4, 1);
    expect(point(r.objects, "B'").construction).toMatchObject({ kind: 'reflect', axis: 'y' });
  });

  it.each([
    ["ABC'yi y = x doğrusuna göre yansıt", 'y=x', 1, 4],
    ["ABC'yi y=x'e göre yansıt", 'y=x', 1, 4],
    ["ABC'nin birinci açıortaya göre simetriğini çiz", 'y=x', 1, 4],
    ["y = -x doğrusuna göre ABC'yi yansıt", 'y=-x', -1, -4],
    ["ABC'yi ikinci açıortay doğrusuna göre yansıt", 'y=-x', -1, -4],
  ])('açıortay doğruları: %s', (text, axis, x, y) => {
    const r = expectOk(handlers, text as string, triangle());
    close(point(r.objects, "B'"), x as number, y as number);
    expect(point(r.objects, "B'").construction).toMatchObject({ axis });
  });

  it('iki noktadan geçen doğruya göre yansıtır ve eksen değişince görüntü güncellenir', () => {
    const scene = triangle(s => { s.addPoint({ x: 0, y: 0 }, { label: 'D' }); s.addPoint({ x: 1, y: 1 }, { label: 'E' }); });
    const r = expectOk(handlers, "ABC'yi DE doğrusuna göre yansıt", scene);
    close(point(r.objects, "B'"), 1, 4);
    expect(point(r.objects, "B'").construction).toEqual({ kind: 'reflect', sourceId: point(r.objects, 'B').id, axisPointIds: [point(r.objects, 'D').id, point(r.objects, 'E').id] });
    const moved = move(r.objects, { E: { x: 1, y: 0 } });
    close(point(moved, "B'"), 4, -1);
    close(point(moved, "C'"), 2, -3);
  });

  it.each([
    "ABC'nin d'ye göre simetriği",
    "ABC'yi d doğrusuna göre yansıt",
  ])('adlandırılmış doğru: %s', text => {
    const scene = triangle(s => {
      const P = s.addPoint({ x: 0, y: 1 }, { label: 'P' });
      const Q = s.addPoint({ x: 1, y: 3 }, { label: 'Q' });
      s.addLine(P.id, Q.id, { label: 'd' });
    });
    const r = expectOk(handlers, text, scene);
    const expected = reflectAcross({ x: 4, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 3 });
    close(point(r.objects, "B'"), expected.x, expected.y);
    expect(r.message).toContain('d doğrusuna');
  });

  it('bir kenara göre yansıtır (ABC’nin AB kenarına göre)', () => {
    const r = expectOk(handlers, "ABC üçgeninin AB kenarına göre yansımasını çiz", triangle());
    close(point(r.objects, "C'"), 2, -1);
    close(point(r.objects, "A'"), 1, 1);
  });

  it('noktaya göre yansıma: O noktası canlı merkezdir', () => {
    const scene = triangle(s => { s.addPoint({ x: 1, y: 0 }, { label: 'O' }); });
    const r = expectOk(handlers, "ABC'nin O noktasına göre simetriğini çiz", scene);
    close(point(r.objects, "B'"), -2, -1);
    expect(point(r.objects, "B'").construction).toEqual({ kind: 'reflect', sourceId: point(r.objects, 'B').id, centerId: point(r.objects, 'O').id });
    const moved = move(r.objects, { O: { x: 0, y: 0 } });
    close(point(moved, "B'"), -4, -1);
  });

  it('O noktası yoksa orijin kullanılır ve söylenir', () => {
    const r = expectOk(handlers, "ABC'nin O noktasına göre simetriğini çiz", triangle());
    close(point(r.objects, "B'"), -4, -1);
    expect(r.message).toContain('orijin');
  });

  it.each([
    ["ABC'yi orijine göre yansıt", -4, -1],
    ["ABC'nin başlangıç noktasına göre simetriği", -4, -1],
    ["ABC'yi (2, 3) noktasına göre yansıt", 0, 5],
    ["ABC'nin (2;3)'e göre simetriğini al", 0, 5],
  ])('sabit merkeze göre: %s', (text, x, y) => {
    const r = expectOk(handlers, text as string, triangle());
    close(point(r.objects, "B'"), x as number, y as number);
    expect(point(r.objects, "B'").construction).toMatchObject({ kind: 'dilate', factor: -1 });
  });

  it("A'nın B'ye göre simetriği ve soru biçimi koordinatı söyler", () => {
    const r1 = expectOk(handlers, "A'nın B'ye göre simetriği", triangle());
    close(point(r1.objects, "A'"), 7, 1);
    const r2 = expectOk(handlers, "A'nın x eksenine göre simetriği nedir?", triangle());
    expect(r2.message).toContain("A'(1; -1)");
    expect(r2.selectedIds).toEqual([point(r2.objects, "A'").id]);
  });

  it('x = 3 doğrusunu eksen olarak çizer; varsa yeniden kullanır', () => {
    const r = expectOk(handlers, "ABC'yi x = 3 doğrusuna göre yansıt", triangle());
    close(point(r.objects, "A'"), 5, 1);
    close(point(r.objects, "B'"), 2, 1);
    const axis = byLabel(r.objects, 'x = 3 Doğrusu');
    expect(axis?.type).toBe('line');
    expect(byType(r.objects, 'point').filter(p => !p.visible)).toHaveLength(2);
    expect(r.message).toContain('x = 3 doğrusu çizildi');
    expect(r.selectedIds).toEqual([polyId(r.objects, "A'B'C'")]);
    // Aynı sahnede başka bir şekli aynı doğruya göre yansıtmak yeni doğru çizmez
    const r2 = expectOk(handlers, "A'B'C' üçgenini x = 3 doğrusuna göre yansıt", r.objects);
    expect(byType(r2.objects, 'line')).toHaveLength(1);
    close(point(r2.objects, "A''"), 1, 1);
  });

  it('y = 2x + 1 doğrusuna göre yansıtır', () => {
    const r = expectOk(handlers, "ABC'yi y = 2x + 1 doğrusuna göre yansıt", triangle());
    const expected = reflectAcross({ x: 4, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 3 });
    close(point(r.objects, "B'"), expected.x, expected.y);
    expect(byLabel(r.objects, 'y = 2x + 1 Doğrusu')?.type).toBe('line');
  });

  it('doğru parçası, doğru ve ışın görüntüleri', () => {
    const scene = build(s => {
      const A = s.addPoint({ x: 1, y: 2 }, { label: 'A' }), B = s.addPoint({ x: 3, y: 5 }, { label: 'B' });
      const K = s.addPoint({ x: -1, y: 1 }, { label: 'K' }), L = s.addPoint({ x: 2, y: 2 }, { label: 'L' });
      const M = s.addPoint({ x: 5, y: -1 }, { label: 'M' }), N = s.addPoint({ x: 6, y: 1 }, { label: 'N' });
      s.addSegment(A.id, B.id);
      s.addLine(K.id, L.id);
      s.addRay(M.id, N.id);
    });
    const seg = expectOk(handlers, "[AB]'yi orijine göre yansıt", scene);
    const segImage = byLabel(seg.objects, "[A'B']") as SegmentObject;
    expect(segImage.type).toBe('segment');
    close(point(seg.objects, "B'"), -3, -5);
    expect(segImage.showLength).toBe(true);
    const line = expectOk(handlers, 'KL doğrusunu y eksenine göre yansıt', scene);
    expect(byLabel(line.objects, "K'L' Doğrusu")?.type).toBe('line');
    const ray = expectOk(handlers, 'MN ışınını x eksenine göre yansıt', scene);
    expect(byLabel(ray.objects, "M'N' Işını")?.type).toBe('ray');
  });

  it('çember türleri: sabit yarıçaplı, noktalı ve üç noktadan geçen', () => {
    const scene = build(s => {
      const G = s.addPoint({ x: 8, y: 8 }, { label: 'G' });
      s.addCircle({ centerId: G.id, radius: 2 });
      const P = s.addPoint({ x: 0, y: 5 }, { label: 'P' }), Q = s.addPoint({ x: 2, y: 5 }, { label: 'Q' });
      s.addCircle({ centerId: P.id, radiusPointId: Q.id });
      const K = s.addPoint({ x: -3, y: 0 }, { label: 'K' }), L = s.addPoint({ x: -1, y: 0 }, { label: 'L' }), M = s.addPoint({ x: -2, y: 1 }, { label: 'M' });
      s.addCircle({ throughIds: [K.id, L.id, M.id] });
    });
    const fixed = expectOk(handlers, 'G çemberini x eksenine göre yansıt', scene);
    const fixedImage = byType(fixed.objects, 'circle').find(c => c.label === "G' Çemberi (r = 2)") as CircleObject;
    expect(fixedImage.fixedRadius).toBe(2);
    close(point(fixed.objects, "G'"), 8, -8);
    const withPoint = expectOk(handlers, 'P merkezli çemberi y eksenine göre yansıt', scene);
    const pc = byLabel(withPoint.objects, "P' Merkezli Çember") as CircleObject;
    expect(pc.radiusPointId).toBe(point(withPoint.objects, "Q'").id);
    const three = expectOk(handlers, 'KLM çemberini x eksenine göre yansıt', scene);
    const tc = byLabel(three.objects, "K'L'M' Çemberi") as CircleObject;
    expect(tc.throughPointIds).toEqual(["K'", "L'", "M'"].map(l => point(three.objects, l).id));
    expect(tc.centerPointId).toBe('');
  });

  it('elipsin dönme açısı yansımada aynalanır', () => {
    const scene = build(s => { const H = s.addPoint({ x: -6, y: 6 }, { label: 'H' }); s.addEllipse(H.id, 3, 1.5, { rotation: 30 }); });
    const rx = expectOk(handlers, 'elipsi x eksenine göre yansıt', scene);
    const ex = byType(rx.objects, 'ellipse').find(e => e.label === "H' Merkezli Elips") as EllipseObject;
    expect(ex.rotation).toBeCloseTo(330, 6);
    expect(ex.fillColor).toBe(COLORS.image);
    const ry = expectOk(handlers, 'elipsi y = x doğrusuna göre yansıt', scene);
    expect((byLabel(ry.objects, "H' Merkezli Elips") as EllipseObject).rotation).toBeCloseTo(60, 6);
  });

  it('yayın yönü korunur (başlangıç ile bitiş yer değiştirir)', () => {
    const scene = build(s => {
      const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' }), S = s.addPoint({ x: 2, y: 0 }, { label: 'S' }), T = s.addPoint({ x: 0, y: 2 }, { label: 'T' });
      s.addArc(M.id, S.id, T.id);
    });
    const r = expectOk(handlers, 'ST yayını x eksenine göre yansıt', scene);
    const image = byType(r.objects, 'arc').find(a => a.startPointId !== scene.find(o => o.label === 'S')!.id)!;
    const sw = sweepOf(r.objects, image);
    expect(sw.degrees).toBeCloseTo(90, 6);
    expect(sw.radius).toBeCloseTo(2, 6);
    close(sw.start, 0, -2);
  });

  it('bitiş noktası çember dışında olan yayda gizli yardımcı nokta yarıçapı korur', () => {
    const scene = build(s => {
      const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' }), S = s.addPoint({ x: 2, y: 0 }, { label: 'S' }), T = s.addPoint({ x: 0, y: 5 }, { label: 'T' });
      s.addSector(M.id, S.id, T.id);
    });
    const r = expectOk(handlers, 'daire dilimini x eksenine göre yansıt', scene);
    const image = byType(r.objects, 'sector')[1];
    const sw = sweepOf(r.objects, image as unknown as ArcObject);
    expect(sw.degrees).toBeCloseTo(90, 6);
    expect(sw.radius).toBeCloseTo(2, 6);
    expect((r.objects.find(o => o.id === image.startPointId) as PointObject).visible).toBe(false);
  });

  it('açı nesnesi yansıtılır', () => {
    const scene = triangle((s, ids) => { s.addAngle(ids.B, ids.A, ids.C); });
    const r = expectOk(handlers, 'BAC açısını x eksenine göre yansıt', scene);
    const image = byLabel(r.objects, "∠B'A'C'") as AngleObject;
    expect(image.type).toBe('angle');
    expect(image.vertexPointId).toBe(point(r.objects, "A'").id);
    expect(byType(r.objects, 'polygon')).toHaveLength(1);
  });

  it("dolu etiketlerde üs sayısı artar (A' varsa A'')", () => {
    const scene = triangle(s => { s.addPoint({ x: 9, y: 9 }, { label: "A'" }); });
    const r = expectOk(handlers, "ABC'yi x eksenine göre yansıt", scene);
    close(point(r.objects, "A''"), 1, -1);
    expect(byLabel(r.objects, "A''B'C'")?.type).toBe('polygon');
  });

  it('aynı komut tekrarlanınca görüntü çoğaltılmaz', () => {
    const r1 = expectOk(handlers, "ABC'yi x eksenine göre yansıt", triangle());
    const r2 = expectOk(handlers, "ABC'yi x eksenine göre yansıt", r1.objects);
    expect(r2.objects).toHaveLength(r1.objects.length);
    expect(r2.message).toContain('zaten vardı');
    expect(r2.selectedIds).toEqual([polyId(r1.objects, "A'B'C'")]);
  });

  it('seçimi, zamiri ve önceki cümlenin görüntüsünü hedef alır', () => {
    const scene = triangle();
    const sel = expectOk(handlers, 'seçili şekli y eksenine göre yansıt', scene, [polyId(scene)]);
    close(point(sel.objects, "B'"), -4, 1);
    const pron = expectOk(handlers, 'onu y eksenine göre yansıt', scene, [polyId(scene)]);
    close(point(pron.objects, "B'"), -4, 1);
    const chain = expectOk(handlers, "ABC'yi x eksenine göre yansıt ve y eksenine göre yansıt", scene);
    close(point(chain.objects, "A''"), -1, -1);
    expect(byLabel(chain.objects, "A''B''C''")?.type).toBe('polygon');
  });

  it('tek şekil varsa adı yazılmadan da yansıtır; "tüm noktalar" noktaları yansıtır', () => {
    const r = expectOk(handlers, 'x eksenine göre yansıt', triangle());
    close(point(r.objects, "C'"), 2, -3);
    const pts = expectOk(handlers, 'tüm noktaları y eksenine göre yansıt', triangle());
    expect(byType(pts.objects, 'point')).toHaveLength(6);
    expect(byType(pts.objects, 'polygon')).toHaveLength(1);
    const everything = expectOk(handlers, 'her şeyi y eksenine göre yansıt', triangle());
    expect(byType(everything.objects, 'polygon')).toHaveLength(2);
  });

  it('koordinatla verilen noktayı oluşturup yansıtır', () => {
    const r = expectOk(handlers, '(2, 3) noktasının orijine göre simetriğini bul', []);
    close(point(r.objects, 'A'), 2, 3);
    close(point(r.objects, "A'"), -2, -3);
    const p = expectOk(handlers, 'P(2, 3) noktasını x eksenine göre yansıt', []);
    close(point(p.objects, "P'"), 2, -3);
  });

  it('yerinde yansıtma kopya oluşturmaz; renk seçilebilir', () => {
    const r = expectOk(handlers, "ABC'yi yerinde x eksenine göre yansıt", triangle());
    expect(r.objects).toHaveLength(4);
    close(point(r.objects, 'C'), 2, -3);
    const red = expectOk(handlers, "ABC'yi x eksenine göre kırmızı renkte yansıt", triangle());
    expect(byLabel(red.objects, "A'B'C'")?.color).toBe('#ef4444');
  });

  it('kaynak silinince görüntü de silinir (bağımlılık zinciri)', () => {
    const r = expectOk(handlers, "ABC'yi x eksenine göre yansıt", triangle());
    const s = new CommandScene(r.objects);
    s.remove([point(r.objects, 'A').id]);
    expect(s.objects.some(o => o.label === "A'")).toBe(false);
    expect(byLabel(s.objects, "A'B'C'")).toBeUndefined();
    expect(s.objects.some(o => o.label === "B'")).toBe(true);
  });

  it.each([
    ["ABC'yi yansıt", 'eksenini'],
    ["XYZ'yi x eksenine göre yansıt", 'bulunamadı'],
    ["ABC'yi KL doğrusuna göre yansıt", 'KL doğrusu bulunamadı'],
    ["ABC'yi G çemberine göre yansıt", 'doğruya ya da noktaya'],
  ])('hata: %s', (text, fragment) => {
    const scene = triangle(s => { const G = s.addPoint({ x: 8, y: 8 }, { label: 'G' }); s.addCircle({ centerId: G.id, radius: 2 }); });
    expect(expectFail(handlers, text, scene)).toContain(fragment);
  });

  it('hata: birden fazla şekil varken ad yazılmazsa sorar', () => {
    const scene = triangle(s => {
      const P = s.addPoint({ x: 6, y: 6 }, { label: 'P' }), Q = s.addPoint({ x: 7, y: 6 }, { label: 'Q' }), R = s.addPoint({ x: 6, y: 8 }, { label: 'R' });
      s.addPolygon([P.id, Q.id, R.id]);
    });
    expect(expectFail(handlers, 'x eksenine göre yansıt', scene)).toMatch(/adıyla/);
  });

  it('hata: inşaya bağlı noktalar yerinde yansıtılamaz', () => {
    const r = expectOk(handlers, "ABC'yi x eksenine göre yansıt", triangle());
    expect(expectFail(handlers, "A'B'C' üçgenini yerinde y eksenine göre yansıt", r.objects)).toContain('yerinde');
  });
});

// ---------------------------------------------------------------------------
// Döndürme
// ---------------------------------------------------------------------------

describe('döndürme', () => {
  it('A etrafında 90° canlı döndürür', () => {
    const r = expectOk(handlers, 'ABC üçgenini A etrafında 90 derece döndür', triangle());
    close(point(r.objects, "B'"), 1, 4);
    close(point(r.objects, "C'"), -1, 2);
    close(point(r.objects, "A'"), 1, 1);
    expect(point(r.objects, "B'").construction).toEqual({ kind: 'rotate', sourceId: point(r.objects, 'B').id, centerId: point(r.objects, 'A').id, degrees: 90 });
    expect(r.message).toContain('saat yönünün tersine 90°');
    const moved = move(r.objects, { A: { x: 0, y: 1 } });
    close(point(moved, "B'"), 0, 5);
    close(point(moved, "A'"), 0, 1);
  });

  it.each([
    "ABC'yi A noktası etrafında 90° döndür",
    'ABC üçgenini A merkez alarak doksan derece döndürür müsün',
    "ABC'yi A'ya göre 90 derece döndür",
    "A etrafında ABC'yi saat yönünün tersine 90 derece döndür",
    "ABC'yi A çevresinde çeyrek tur döndür",
    "ABC'yi A etrafında -270 derece döndür",
    "ABC'yi A etrafında saat yönünde 270 derece döndür",
    "ABC'yi A etrafında π/2 radyan döndür",
    "ABC'yi A etrafında 90 derece çevir",
    "ABC'nin A etrafında 90 derece döndürülmüş görüntüsünü çiz",
    "ABC'yi merkezi A olan 90 derecelik dönme ile döndür",
  ])('90° varyantları: %s', text => {
    const r = expectOk(handlers, text, triangle());
    close(point(r.objects, "B'"), 1, 4);
    close(point(r.objects, "C'"), -1, 2);
  });

  it.each([
    ["ABC'yi A etrafında saat yönünde 90 derece döndür", 1, -2],
    ["ABC'yi A etrafında eksi 90 derece döndür", 1, -2],
    ["ABC'yi A etrafında 90 derece sağa döndür", 1, -2],
    ["ABC'yi A etrafında yarım tur döndür", -2, 1],
  ])('yön ve tur: %s', (text, x, y) => {
    const r = expectOk(handlers, text as string, triangle());
    close(point(r.objects, "B'"), x as number, y as number);
  });

  it('orijin ve koordinat merkezleri sabittir', () => {
    const r = expectOk(handlers, "ABC'yi orijin etrafında 180° döndür", triangle());
    close(point(r.objects, "B'"), -4, -1);
    expect(point(r.objects, "B'").construction).toMatchObject({ kind: 'rotate', center: { x: 0, y: 0 }, degrees: 180 });
    const c = expectOk(handlers, "ABC'yi (2, 1) noktası etrafında 60 derece döndür", triangle());
    const expected = rotateAround({ x: 2, y: 3 }, { x: 2, y: 1 }, 60);
    close(point(c.objects, "C'"), expected.x, expected.y);
  });

  it('merkez ve açı yazılmazsa varsayılanları kullanır ve söyler', () => {
    const r = expectOk(handlers, "ABC'yi döndür", triangle());
    const g = { x: 7 / 3, y: 5 / 3 };
    const expected = rotateAround({ x: 4, y: 1 }, g, 90);
    close(point(r.objects, "B'"), expected.x, expected.y);
    expect(r.message).toContain('Dönme merkezi yazılmadığı');
    expect(r.message).toContain('Açı yazılmadığı için 90°');
  });

  it('seçili doğru parçası orta noktası etrafında saat yönünde döner', () => {
    const scene = build(s => { const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' }), B = s.addPoint({ x: 2, y: 0 }, { label: 'B' }); s.addSegment(A.id, B.id); });
    const seg = byType(scene, 'segment')[0];
    const r = expectOk(handlers, 'seçili parçayı saat yönünde 90° döndür', scene, [seg.id]);
    close(point(r.objects, "A'"), 1, 1);
    close(point(r.objects, "B'"), 1, -1);
    expect(point(r.objects, "A'").construction).toMatchObject({ degrees: -90, center: { x: 1, y: 0 } });
  });

  it('elips döndürülünce dönme açısı eklenir; çember kendi merkezine bağlı kalır', () => {
    const scene = build(s => {
      const H = s.addPoint({ x: -6, y: 6 }, { label: 'H' }); s.addEllipse(H.id, 3, 1.5, { rotation: 30 });
      const G = s.addPoint({ x: 8, y: 8 }, { label: 'G' }); const P = s.addPoint({ x: 10, y: 8 }, { label: 'P' });
      s.addCircle({ centerId: G.id, radiusPointId: P.id });
    });
    const e = expectOk(handlers, 'elipsi merkezi etrafında 45 derece döndür', scene);
    const image = byLabel(e.objects, "H' Merkezli Elips") as EllipseObject;
    expect(image.rotation).toBeCloseTo(75, 6);
    expect(image.radiusX).toBe(3);
    close(point(e.objects, "H'"), -6, 6);
    const c = expectOk(handlers, 'çemberi kendi merkezi etrafında 90 derece döndür', scene);
    close(point(c.objects, "P'"), 8, 10);
    expect(point(c.objects, "P'").construction).toMatchObject({ centerId: point(c.objects, 'G').id });
  });

  it('yerinde döndürme noktaları taşır, yeni nesne eklemez', () => {
    const r = expectOk(handlers, "ABC'yi A etrafında yerinde 90 derece döndür", triangle());
    expect(r.objects).toHaveLength(4);
    close(point(r.objects, 'B'), 1, 4);
    close(point(r.objects, 'C'), -1, 2);
    expect(r.selectedIds).toEqual([polyId(r.objects)]);
    const self = expectOk(handlers, "ABC'yi kendisini orijin etrafında 180 derece döndür", triangle());
    close(point(self.objects, 'A'), -1, -1);
    const pointMove = expectOk(handlers, 'A noktasını B etrafında yerinde 90 derece döndür', triangle());
    close(point(pointMove.objects, 'A'), 4, -2);
    expect(pointMove.message).toContain('yeni konum');
  });

  it("O merkezli ve 'dönme merkezi C olmak üzere' yazımları", () => {
    const scene = triangle(s => { s.addPoint({ x: 0, y: 0 }, { label: 'O' }); });
    const r = expectOk(handlers, 'A noktasını O merkezli 90 derece döndür', scene);
    close(point(r.objects, "A'"), -1, 1);
    expect(point(r.objects, "A'").construction).toMatchObject({ centerId: point(r.objects, 'O').id });
    const c = expectOk(handlers, "ABC'yi dönme merkezi C olmak üzere 180 derece döndür", scene);
    close(point(c.objects, "A'"), 3, 5);
  });

  it.each([
    ["A noktasını 90 derece döndür", 'merkezini'],
    ["ABC'yi 30 45 döndür", 'tek bir sayıyla'],
    ["ABC'yi A etrafında 0 derece döndür", '0’dan farklı'],
    ["XYZ'yi A etrafında 90 derece döndür", 'bulunamadı'],
    ["ABC'yi K etrafında 90 derece döndür", 'K noktası bulunamadı'],
  ])('hata: %s', (text, fragment) => {
    expect(expectFail(handlers, text, triangle())).toContain(fragment);
  });

  it('hata: inşaya bağlı noktalar yerinde döndürülemez', () => {
    const r = expectOk(handlers, "ABC'yi A etrafında 90 derece döndür", triangle());
    expect(expectFail(handlers, "A'B'C' üçgenini yerinde 90 derece döndür", r.objects)).toContain('başka nesnelere bağlı');
  });
});

// ---------------------------------------------------------------------------
// Öteleme
// ---------------------------------------------------------------------------

describe('öteleme', () => {
  it('sabit vektörle ötelenmiş canlı görüntü', () => {
    const r = expectOk(handlers, "ABC'yi (3, 2) vektörüyle ötele", triangle());
    close(point(r.objects, "A'"), 4, 3);
    close(point(r.objects, "C'"), 5, 5);
    expect(point(r.objects, "A'").construction).toEqual({ kind: 'translate', sourceId: point(r.objects, 'A').id, vector: { x: 3, y: 2 } });
    const moved = move(r.objects, { C: { x: 0, y: 0 } });
    close(point(moved, "C'"), 3, 2);
  });

  it.each([
    "ABC'yi (3;2) kadar ötele",
    'ABC üçgenini u = (3, 2) vektörü ile ötele',
    "ABC'yi 3 birim sağa 2 birim yukarı ötele",
    "ABC'yi 3 birim sağa ve 2 birim yukarı ötele",
    "ABC'yi sağa 3 birim, yukarı 2 birim ötele",
    "ABC'yi x yönünde 3, y yönünde 2 birim ötele",
    "ABC'yi üç br sağa iki br yukarıya öteler misin",
    "ABC'nin (3, 2) ötelemesini çiz",
  ])('(3, 2) varyantları: %s', text => {
    const r = expectOk(handlers, text, triangle());
    close(point(r.objects, "A'"), 4, 3);
    close(point(r.objects, "B'"), 7, 3);
  });

  it('AB vektörü canlıdır', () => {
    const r = expectOk(handlers, 'ABC üçgenini AB vektörü kadar ötele', triangle());
    close(point(r.objects, "C'"), 5, 3);
    expect(point(r.objects, "C'").construction).toEqual({ kind: 'translate', sourceId: point(r.objects, 'C').id, vectorPointIds: [point(r.objects, 'A').id, point(r.objects, 'B').id] });
    const moved = move(r.objects, { B: { x: 4, y: 2 } });
    close(point(moved, "C'"), 5, 4);
    expect(r.message).toContain('AB vektörü kadar');
  });

  it("A'dan C'ye ve adlandırılmış vektörle öteler", () => {
    const r = expectOk(handlers, "ABC'yi A'dan C'ye ötele", triangle());
    close(point(r.objects, "B'"), 5, 3);
    const named = expectOk(handlers, "ABC'yi A noktasından C noktasına ötele", triangle());
    close(point(named.objects, "B'"), 5, 3);
  });

  it.each([
    ['A noktasını 4 birim sola ötele', -3, 1],
    ['A noktasını 2 birim aşağı ötele', 1, -1],
    ['A noktasını bir birim yukarı ötele', 1, 2],
    ['A noktasını sola doğru 2 birim ötele', -1, 1],
  ])('yönler: %s', (text, x, y) => {
    const r = expectOk(handlers, text as string, triangle());
    close(point(r.objects, "A'"), x as number, y as number);
    expect(r.selectedIds).toEqual([point(r.objects, "A'").id]);
  });

  it('noktayı hedef konuma öteler; şekilde hata verir', () => {
    const r = expectOk(handlers, "A'yı (5, 5) noktasına ötele", triangle());
    close(point(r.objects, "A'"), 5, 5);
    expect(point(r.objects, "A'").construction).toMatchObject({ vector: { x: 4, y: 4 } });
    expect(expectFail(handlers, "ABC'yi (5, 5) noktasına ötele", triangle())).toContain('tek bir nokta');
  });

  it('yerinde öteleme ve çember görüntüsü', () => {
    const r = expectOk(handlers, "ABC'yi kendisini 2 birim aşağı ötele", triangle());
    expect(r.objects).toHaveLength(4);
    close(point(r.objects, 'A'), 1, -1);
    const scene = build(s => { const G = s.addPoint({ x: 8, y: 8 }, { label: 'G' }); s.addCircle({ centerId: G.id, radius: 2 }); });
    const c = expectOk(handlers, 'çemberi (-2; 1) kadar ötele', scene);
    close(point(c.objects, "G'"), 6, 9);
    expect((byLabel(c.objects, "G' Çemberi (r = 2)") as CircleObject).fixedRadius).toBe(2);
  });

  it('üç noktadan geçen çember ötelenir', () => {
    const scene = triangle((s, ids) => { s.addCircle({ throughIds: [ids.A, ids.B, ids.C] }); });
    const r = expectOk(handlers, 'ABC çemberini (1, 1) vektörüyle ötele', scene);
    const image = byLabel(r.objects, "A'B'C' Çemberi") as CircleObject;
    expect(image.throughPointIds).toHaveLength(3);
    expect(byType(r.objects, 'polygon')).toHaveLength(1);
  });

  it.each([
    ["ABC'yi ötele", 'vektörünü'],
    ["ABC'yi (0, 0) vektörüyle ötele", 'sıfır'],
    ["ABC'yi AA vektörü kadar ötele", 'vektör'],
    ["ABC'yi KL vektörü kadar ötele", 'KL vektörü bulunamadı'],
  ])('hata: %s', (text, fragment) => {
    expect(expectFail(handlers, text, triangle())).toContain(fragment);
  });
});

// ---------------------------------------------------------------------------
// Homotete
// ---------------------------------------------------------------------------

describe('homotete', () => {
  it('A merkezli 2 kat canlı büyütür', () => {
    const r = expectOk(handlers, "ABC'yi A merkezli 2 kat büyüt", triangle());
    close(point(r.objects, "B'"), 7, 1);
    close(point(r.objects, "C'"), 3, 5);
    expect(point(r.objects, "B'").construction).toEqual({ kind: 'dilate', sourceId: point(r.objects, 'B').id, centerId: point(r.objects, 'A').id, factor: 2 });
    expect(r.message).toContain('büyütüldü');
    const moved = move(r.objects, { A: { x: 0, y: 1 } });
    close(point(moved, "B'"), 8, 1);
  });

  it.each([
    "A noktasına göre ABC'yi iki katına büyüt",
    "merkezi A olan k = 2 homotetisi ile ABC'yi büyüt",
    "ABC'nin A merkezli 2 oranında homotetiğini çiz",
    "ABC'yi A merkezli benzerlik oranı 2 olacak şekilde büyüt",
    "ABC'yi A merkezli %200 oranında büyüt",
    "ABC'yi A merkezli ölçek çarpanı 2 ile ölçekle",
  ])('k = 2 varyantları: %s', text => {
    const r = expectOk(handlers, text, triangle());
    close(point(r.objects, "B'"), 7, 1);
  });

  it.each([
    ["ABC'yi A merkezli 3 kat küçült", 1 / 3],
    ["ABC'yi A merkezli %50 oranında küçült", 0.5],
    ["ABC'yi A merkezli 3'te 1 oranında küçült", 1 / 3],
    ["ABC'yi A merkezli yarıya küçült", 0.5],
    ["ABC'yi A merkezli 0,5 kat büyüt", 0.5],
    ["ABC'yi A merkezli 1/4 oranında küçült", 0.25],
    ["ABC'yi A merkezli küçült", 0.5],
  ])('küçültme oranları: %s', (text, k) => {
    const r = expectOk(handlers, text as string, triangle());
    close(point(r.objects, "B'"), 1 + 3 * (k as number), 1);
    expect(point(r.objects, "B'").construction).toMatchObject({ factor: expect.closeTo(k as number, 9) });
  });

  it('1/3 oranı tam değerle saklanır ve kesir olarak yazılır; iletiler okunaklıdır', () => {
    const r = expectOk(handlers, "ABC'yi orijin merkezli 3 kat küçült", triangle());
    expect(point(r.objects, "B'").construction).toMatchObject({ factor: 1 / 3 });
    expect(r.message).toContain('k = 1/3');
    const scene = build(s => {
      const G = s.addPoint({ x: 8, y: 8 }, { label: 'G' }); s.addCircle({ centerId: G.id, radius: 2 });
      const H = s.addPoint({ x: -6, y: 6 }, { label: 'H' }); s.addEllipse(H.id, 3, 1.5);
    });
    const c = expectOk(handlers, 'çemberi (-2; 1) kadar ötele', scene);
    expect(c.message).toBe("G Çemberi (r = 2), (-2; 1) vektörüyle ötelendi: G' Çemberi (r = 2).");
    const e = expectOk(handlers, 'elipsi merkezi etrafında 30 derece döndür', scene);
    expect(e.message).toBe("H Merkezli Elips H noktası etrafında saat yönünün tersine 30° döndürüldü: H' Merkezli Elips.");
  });

  it('O noktası varsa ona, yoksa orijine göre küçültür', () => {
    const withO = triangle(s => { s.addPoint({ x: 1, y: 3 }, { label: 'O' }); });
    const r = expectOk(handlers, "ABC'yi O merkezli 1/2 oranında küçült", withO);
    close(point(r.objects, "B'"), 2.5, 2);
    expect(r.message).toContain('k = 1/2');
    const origin = expectOk(handlers, "ABC'yi O merkezli 1/2 oranında küçült", triangle());
    close(point(origin.objects, "B'"), 2, 0.5);
    expect(origin.message).toContain('orijin');
  });

  it('negatif oran ve koordinat merkezi', () => {
    const r = expectOk(handlers, "ABC'ye (1, 1) merkezli k = -2 homotetisi uygula", triangle());
    close(point(r.objects, "B'"), -5, 1);
    close(point(r.objects, "C'"), -1, -3);
    expect(point(r.objects, "B'").construction).toMatchObject({ center: { x: 1, y: 1 }, factor: -2 });
    expect(r.message).toContain('k = -2');
  });

  it('çember ve elips ölçüleri |k| ile çarpılır', () => {
    const scene = build(s => {
      const G = s.addPoint({ x: 8, y: 8 }, { label: 'G' }); s.addCircle({ centerId: G.id, radius: 2 });
      const H = s.addPoint({ x: -6, y: 6 }, { label: 'H' }); s.addEllipse(H.id, 3, 1.5);
    });
    const c = expectOk(handlers, 'çemberi merkezine göre 3 kat büyüt', scene);
    expect((byLabel(c.objects, "G' Çemberi (r = 6)") as CircleObject).fixedRadius).toBe(6);
    close(point(c.objects, "G'"), 8, 8);
    const e = expectOk(handlers, 'elipsi orijin merkezli k = -2 homotetisi ile dönüştür', scene);
    const image = byLabel(e.objects, "H' Merkezli Elips") as EllipseObject;
    expect([image.radiusX, image.radiusY]).toEqual([6, 3]);
    close(point(e.objects, "H'"), 12, -12);
  });

  it('merkez ve oran varsayılanları söylenir', () => {
    const r = expectOk(handlers, "ABC'yi büyüt", triangle());
    const g = { x: 7 / 3, y: 5 / 3 };
    close(point(r.objects, "B'"), g.x + (4 - g.x) * 2, g.y + (1 - g.y) * 2);
    expect(r.message).toContain('k = 2 kullanıldı');
    expect(r.message).toContain('Merkez yazılmadığı');
    const k3 = expectOk(handlers, 'ABC üçgenine k = 3 homotetisi uygula', triangle());
    expect(point(k3.objects, "B'").construction).toMatchObject({ factor: 3, center: { x: expect.closeTo(7 / 3, 12), y: expect.closeTo(5 / 3, 12) } });
  });

  it('yerinde büyütme', () => {
    const r = expectOk(handlers, "ABC'yi A merkezli yerinde 2 kat büyüt", triangle());
    expect(r.objects).toHaveLength(4);
    close(point(r.objects, 'B'), 7, 1);
    const scene = build(s => { const G = s.addPoint({ x: 1, y: 1 }, { label: 'G' }); s.addCircle({ centerId: G.id, radius: 2 }); });
    const c = expectOk(handlers, 'çemberi yerinde 2 kat büyüt', scene);
    expect(byType(c.objects, 'circle')[0].fixedRadius).toBe(4);
  });

  it.each([
    ["ABC'ye A merkezli k = 0 homotetisi uygula", '0 olamaz'],
    ["ABC'ye A merkezli homotete uygula", 'oranını'],
    ["ABC'yi A merkezli 1 kat büyüt", 'değişmez'],
    ['A noktasını 2 kat büyüt', 'merkezini'],
    ["ABC'yi A merkezli 2 kat 3 kat büyüt", 'tek bir sayıyla'],
  ])('hata: %s', (text, fragment) => {
    expect(expectFail(handlers, text, triangle())).toContain(fragment);
  });
});

// ---------------------------------------------------------------------------
// Sahiplik: başka ailelerin cümleleri
// ---------------------------------------------------------------------------

describe('başka ailelerin cümlelerine karışmaz', () => {
  it.each([
    'x eksenini gizle',
    "A noktasını (3,4)'e taşı",
    "ABC'yi 2 birim sağa kaydır",
    'yazıları büyüt',
    'noktaları küçült',
    "ABC'nin alanını hesapla",
    "A'B'C' yansımasını sil",
    'yansımayı kırmızıya boya',
    'kesri ondalık sayıya çevir',
    'karenin dönme simetrisi var mı',
    "ABC'nin simetri eksenlerini göster",
    'öteleme vektörünü sil',
    'görünümü 90 derece döndür',
    'ekranı büyüt',
    'çemberin yarıçapını 2 kat büyüt',
    'tuvali temizle',
    'üçgen çiz',
    "AB'nin orta noktasını bul",
    "A'nın koordinatları nedir",
    'yakınlaştır',
  ])('%s', text => {
    const scene = triangle();
    const state = new CommandScene(scene);
    expect(rankHandlers(parseClause(text, state.known()), state, handlers)).toEqual([]);
  });

  it('puanlar dönüşüm bandında (75–84)', () => {
    const scene = triangle();
    for (const text of ["ABC'yi x eksenine göre yansıt", "ABC'yi A etrafında 90 derece döndür", "ABC'yi (1,1) vektörüyle ötele", "ABC'yi A merkezli 2 kat büyüt", "ABC'yi büyüt", "ABC'nin simetriği"]) {
      const state = new CommandScene(scene);
      const [top] = rankHandlers(parseClause(text, state.known()), state, handlers);
      expect(top.score).toBeGreaterThanOrEqual(75);
      expect(top.score).toBeLessThanOrEqual(84);
    }
  });
});

describe('ek ifadeler', () => {
  it.each([
    ['ABC üçgeninin x eksenine göre simetriğini alır mısın', "B'", 4, -1],
    ["ABC'yi x eksenine göre yansıtalım", "B'", 4, -1],
    ["ABC'nin y eksenine göre yansımasını oluşturun", "B'", -4, 1],
    ["ABC'yi y ekseni boyunca yansıt", "B'", -4, 1],
    ["ABC'yi x=3'e göre yansıt", "B'", 2, 1],
    ['A noktasının orijine göre simetriği kaçtır?', "A'", -1, -1],
    ["ABC'yi A'nın etrafında 90 derece döndür", "B'", 1, 4],
    ["ABC'yi A etrafında 90 derece döndürebilir misin?", "B'", 1, 4],
    ["ABC'nin A etrafında 90° dönme altındaki görüntüsünü çiz", "B'", 1, 4],
    ["ABC'yi A merkezli 2 kat büyütür müsün", "B'", 7, 1],
    ["ABC'yi (2, -1) ötele", "B'", 6, 0],
    ["A'yı B noktasına ötele", "A'", 4, 1],
    ["ABC'yi A merkezli iki buçuk kat büyüt", "B'", 8.5, 1],
  ])('%s', (text, label, x, y) => {
    const r = expectOk(handlers, text as string, triangle());
    close(point(r.objects, label as string), x as number, y as number);
  });

  it("A'yı B noktasına ötele canlı vektör kullanır; şekil için hata verir", () => {
    const r = expectOk(handlers, "A'yı B noktasına ötele", triangle());
    expect(point(r.objects, "A'").construction).toEqual({ kind: 'translate', sourceId: point(r.objects, 'A').id, vectorPointIds: [point(r.objects, 'A').id, point(r.objects, 'B').id] });
    close(point(move(r.objects, { B: { x: 5, y: 5 } }), "A'"), 5, 5);
    expect(expectFail(handlers, "ABC'yi B noktasına ötele", triangle())).toContain('tek bir nokta');
  });

  it("adlandırılmış doğru d → d', alt indisli nokta A_1 → A_1'", () => {
    const scene = build(s => {
      s.addPoint({ x: 2, y: 3 }, { label: 'A_1' });
      const P = s.addPoint({ x: 0, y: 0 }, { label: 'P' }), Q = s.addPoint({ x: 1, y: 2 }, { label: 'Q' });
      s.addLine(P.id, Q.id, { label: 'd' });
    });
    const line = expectOk(handlers, 'd doğrusunu x eksenine göre yansıt', scene);
    const image = byLabel(line.objects, "d'");
    expect(image?.type).toBe('line');
    close(point(line.objects, "Q'"), 1, -2);
    const indexed = expectOk(handlers, 'A_1 noktasını y eksenine göre yansıt', scene);
    close(point(indexed.objects, "A_1'"), -2, 3);
    const seg = expectOk(handlers, "[PQ]'yu P etrafında 90 derece döndür", build(s => {
      const P = s.addPoint({ x: 0, y: 0 }, { label: 'P' }), Q = s.addPoint({ x: 1, y: 2 }, { label: 'Q' });
      s.addSegment(P.id, Q.id);
    }));
    close(point(seg.objects, "Q'"), -2, 1);
    expect(byLabel(seg.objects, "[P'Q']")?.type).toBe('segment');
  });
});

describe('tarama düzeltmeleri (yalıtılmış)', () => {
  it('fazladan üs konunca nedeni söylenir; aynı görüntü tekrarında söylenmez', () => {
    const first = expectOk(handlers, "ABC'yi x eksenine göre yansıt", triangle());
    const second = expectOk(handlers, 'ABC yi y eksenine göre yansıt', first.objects);
    close(point(second.objects, "A''"), -1, 1);
    expect(second.message).toContain("A', B' ve C' adları önceki bir görüntüde zaten kullanıldığı için yeni noktalara A'', B'' ve C'' adları verildi.");
    const again = expectOk(handlers, "ABC'yi x eksenine göre yansıt", first.objects);
    expect(again.message).not.toContain('kullanıldığı için');
    const manual = triangle(s => { s.addPoint({ x: 9, y: 9 }, { label: "A'" }); });
    expect(expectOk(handlers, 'A noktasını y eksenine göre yansıt', manual).message).toContain("A' adı sahnede zaten kullanıldığı için yeni noktaya A'' adı verildi.");
  });

  it('dönüşümle oluşturulan görüntüye istenen ad verilir', () => {
    const r = expectOk(handlers, "ABC'yi x eksenine göre yansıtarak DEF üçgenini oluştur", triangle());
    close(point(r.objects, 'E'), 4, -1);
    expect(byLabel(r.objects, 'DEF')?.type).toBe('polygon');
    expect(r.message).not.toContain('kullanıldığı için');
    const rot = expectOk(handlers, 'ABC yi A etrafında 90 derece döndürerek KLM üçgenini oluştur', triangle());
    close(point(rot.objects, 'L'), 1, 4);
    const dil = expectOk(handlers, 'ABC yi A merkezli 2 kat büyüterek KLM üçgenini çiz', triangle());
    close(point(dil.objects, 'L'), 7, 1);
    const tr = expectOk(handlers, 'ABC yi (3, 2) vektörüyle öteleyerek KLM üçgenini elde et', triangle());
    close(point(tr.objects, 'K'), 4, 3);
  });

  it.each([
    ['ABC yi A etrafında pi bölü 2 radyan döndür', "B'", 1, 4],
    ['ABC yi vektör (3, 2) ile ötele', "A'", 4, 3],
    ['ABC yi A noktası B noktasına gelecek şekilde ötele', "C'", 5, 3],
    ['ABC yi A merkezli dörtte bir oranında küçült', "B'", 1.75, 1],
    ['ABC nin A merkezli 2 katını çiz', "B'", 7, 1],
    ['ABC üçgenini A merkezli iki katına çıkar', "B'", 7, 1],
    ['A noktasını o etrafında 90 derece döndür', "A'", -1, 1],
  ])('%s', (text, label, x, y) => {
    const r = expectOk(handlers, text as string, triangle());
    close(point(r.objects, label as string), x as number, y as number);
  });

  it('"eksi (3, 2)" işaretini tahmin etmez', () => {
    expect(expectFail(handlers, 'ABC yi eksi (3, 2) vektörüyle ötele', triangle())).toContain('İşareti koordinatın içine yazın');
  });
});

describe('çoklu işlem', () => {
  it('yansıt, sonra döndür, sonra ötele: her adım bir öncekinin görüntüsünü kullanır', () => {
    const r = expectOk(handlers, "ABC'yi x eksenine göre yansıt, sonra orijin etrafında 90 derece döndür ve 1 birim sağa ötele", triangle());
    // A(1,1) → A'(1,-1) → A''(1,1) → A'''(2,1)
    close(point(r.objects, "A'''"), 2, 1);
    expect(byLabel(r.objects, "A'''B'''C'''")?.type).toBe('polygon');
    const moved = move(r.objects, { A: { x: 0, y: 2 } });
    // (0,2) → (0,-2) → (2,0) → (3,0)
    close(point(moved, "A'''"), 3, 0);
  });

  it('hatalı ikinci işlem hiçbir değişikliği uygulamaz', () => {
    const result = runWith(handlers, "ABC'yi x eksenine göre yansıt ve XYZ'yi döndür", triangle());
    expect(result.ok).toBe(false);
  });
});
