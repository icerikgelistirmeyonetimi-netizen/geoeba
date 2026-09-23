import { describe, expect, it } from 'vitest';
import type { AngleObject, ArcObject, CircleObject, LineObject, MathObject, MeasurementObject, PointObject, PolygonObject, SectorObject, SegmentObject } from '@/types/math';
import { resolveCommandBindings } from '../../commandBindings';
import { collectDependentIds } from '@/state/WorkspaceContext';
import { rankHandlers, runCommand } from '../engine';
import { CommandScene } from '../scene';
import { parseClause } from '../text';
import { handlers } from '../handlers/measure';
import { build, byLabel, byType, expectFail, expectOk, point, runWith } from './helpers';

// ---------------------------------------------------------------------------------------------------------------- sahneler

/** A(0,0), B(4,0), C(0,3): |AB| = 4, |BC| = 5, |CA| = 3, alan 6, çevre 12, ∠A = 90°. */
const triangle = (extra?: (s: CommandScene, ids: Record<string, string>) => void) => build(s => {
  const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  const B = s.addPoint({ x: 4, y: 0 }, { label: 'B' });
  const C = s.addPoint({ x: 0, y: 3 }, { label: 'C' });
  s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
  extra?.(s, { A: A.id, B: B.id, C: C.id });
});
const twoTriangles = () => build(s => {
  const [A, B, C, D, E, F] = ([[0, 0], [4, 0], [0, 3], [10, 0], [13, 0], [10, 4]] as const).map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABCDEF'[i] }));
  s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
  s.addPolygon([D.id, E.id, F.id], { kind: 'triangle' });
});
const circle = (label = 'c1') => build(s => {
  const O = s.addPoint({ x: 1, y: -2 }, { label: 'M' });
  s.addCircle({ centerId: O.id, radius: 3 }, { label });
});
const arc = (type: 'arc' | 'sector' = 'arc') => build(s => {
  const O = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
  const S = s.addPoint({ x: 2, y: 0 }, { label: 'S' });
  const D = s.addPoint({ x: 0, y: 2 }, { label: 'D' });
  if (type === 'arc') s.addArc(O.id, S.id, D.id); else s.addSector(O.id, S.id, D.id);
});
const lineAB = () => build(s => {
  const A = s.addPoint({ x: 0, y: 1 }, { label: 'A' });
  const B = s.addPoint({ x: 2, y: 5 }, { label: 'B' });
  s.addLine(A.id, B.id, { showEquation: false });
});
const segmentAB = () => build(s => {
  const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  const B = s.addPoint({ x: 3, y: 4 }, { label: 'B' });
  s.addSegment(A.id, B.id, { showLength: false });
});
const pointsOnly = () => build(s => {
  s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  s.addPoint({ x: 4, y: 0 }, { label: 'B' });
  s.addPoint({ x: 4, y: 3 }, { label: 'C' });
});
const ellipse = () => build(s => { const E = s.addPoint({ x: 0, y: 0 }, { label: 'E' }); s.addEllipse(E.id, 3, 2); });

const poly = (objects: MathObject[], label = 'ABC') => byLabel(objects, label) as PolygonObject;
const angleAt = (objects: MathObject[], vertex: string) => byType(objects, 'angle').filter(a => a.vertexPointId === point(objects, vertex).id);
const unchanged = (objects: MathObject[], text: string, selection: string[] = []) => {
  const r = expectOk(handlers, text, objects, selection);
  expect(r.sceneChanged).toBe(false);
  return r;
};

// ---------------------------------------------------------------------------------------------------------------- eski davranış

describe('legacy measure behaviour', () => {
  it('asks which triangle when two exist and uses the selection', () => {
    const scene = twoTriangles();
    expect(expectFail(handlers, 'üçgenin alanını yaz', scene)).toMatch(/Birden fazla üçgen/);
    const first = poly(scene);
    const r = expectOk(handlers, 'üçgenin alanını yaz', scene, [first.id]);
    expect(poly(r.objects).showArea).toBe(true);
    expect((byLabel(r.objects, 'DEF') as PolygonObject).showArea).toBe(false);
    expect(r.selectedIds).toEqual([first.id]);
    expect(r.message).toContain('6 br²');
  });

  it('shows one polygon-corner angle even when asked twice', () => {
    const a = expectOk(handlers, 'A noktasının açısını yaz', triangle());
    const b = expectOk(handlers, 'A noktasının açısını yaz', a.objects);
    const angles = byType(b.objects, 'angle');
    expect(angles).toHaveLength(1);
    const angle = angles[0];
    expect([angle.point1Id, angle.vertexPointId, angle.point3Id]).toEqual(['C', 'A', 'B'].map(l => point(b.objects, l).id));
    expect(angle.reflex).toBeFalsy();
    expect(angle.showValue).toBe(true);
    expect(a.message).toContain('m(∠CAB) = 90°');
    expect(a.selectedIds).toEqual([angle.id]);
    expect(byType(a.objects, 'segment')).toHaveLength(0);
  });

  it('computes reflex corners from polygon orientation', () => {
    const scene = build(s => {
      const pts = ([[0, 0], [4, 0], [4, 4], [2, 1], [0, 4]] as const).map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABCDE'[i] }));
      s.addPolygon(pts.map(p => p.id));
    });
    const r = expectOk(handlers, 'D açısını ölç', scene);
    const [angle] = angleAt(r.objects, 'D');
    expect(angle.reflex).toBe(true);
    const inner = Math.acos(((2) * (-2) + (3) * (3)) / (Math.hypot(2, 3) ** 2)) * 180 / Math.PI;
    expect(r.message).toContain(`${(360 - inner).toFixed(2).replace('.', ',')}°`);
    const convex = expectOk(handlers, 'B açısını ölç', scene);
    expect(angleAt(convex.objects, 'B')[0].reflex).toBeFalsy();
    // Saat yönündeki çokgende de aynı sonuç
    const clockwise = build(s => {
      const pts = ([[0, 4], [2, 1], [4, 4], [4, 0], [0, 0]] as const).map(([x, y], i) => s.addPoint({ x, y }, { label: 'EDCBA'[i] }));
      s.addPolygon(pts.map(p => p.id));
    });
    expect(angleAt(expectOk(handlers, 'D açısını ölç', clockwise).objects, 'D')[0].reflex).toBe(true);
  });

  it('sets polygon and circle flags like the tools', () => {
    const per = expectOk(handlers, 'ABC çevresini ölç', triangle());
    expect(poly(per.objects).showPerimeter).toBe(true);
    expect(poly(per.objects).showArea).toBe(false);
    expect(per.message).toContain('Ç(ABC) = 12 br');
    const edges = expectOk(handlers, 'Üçgenin tüm kenarlarını ölç', triangle());
    expect(poly(edges.objects).edgeLabels).toEqual([0, 1, 2]);
    expect(edges.message).toContain('|AB| = 4 br, |BC| = 5 br, |CA| = 3 br');
    const area = expectOk(handlers, 'Üçgenin alanını yaz', triangle());
    expect(poly(area.objects).showArea).toBe(true);
    const c = expectOk(handlers, 'çemberin çevresini ölç', circle());
    expect(byType(c.objects, 'circle')[0].showPerimeter).toBe(true);
    expect(c.message).toContain('≈ 18,85 br');
  });
});

// ---------------------------------------------------------------------------------------------------------------- alan / çevre

describe('area and perimeter', () => {
  it.each([
    "ABC'nin alanı kaç?", 'abc üçgeninin alanını hesapla', "ABC'nin alanını bul", 'ABC üçgeninin alanı nedir', 'üçgenin alanı ne kadar?',
    'şeklin alanını göster', 'lütfen üçgenin alanını hesaplar mısın', "ABC'nin alanını söyler misin", 'Üçgenin alanını hesapla lütfen', 'alanını göster',
  ])('%s → showArea and answer', text => {
    const scene = triangle();
    const r = expectOk(handlers, text, scene);
    expect(poly(r.objects).showArea).toBe(true);
    expect(r.message).toContain('A(ABC) = 6 br²');
    expect(r.selectedIds).toEqual([poly(scene).id]);
  });

  it('does not touch history when the flag is already on but still answers', () => {
    const once = expectOk(handlers, "ABC'nin alanı kaç?", triangle());
    const twice = expectOk(handlers, "ABC'nin alanı kaç?", once.objects);
    expect(twice.sceneChanged).toBe(false);
    expect(twice.message).toContain('6 br²');
  });

  it('handles circles, ellipses, sectors and several clauses', () => {
    const c = expectOk(handlers, 'çemberin alanını hesapla', circle());
    expect(byType(c.objects, 'circle')[0].showArea).toBe(true);
    expect(c.message).toContain('≈ 28,27 br²');
    const byName = expectOk(handlers, "c1'in alanı nedir", circle());
    expect(byName.message).toContain('Ç(M, r): alan = πr² ≈ 28,27 br²');
    const centre = expectOk(handlers, "M merkezli çemberin çevresi ne kadar", circle());
    expect(centre.message).toContain('≈ 18,85 br');
    const e = expectOk(handlers, 'Elipsin alanını göster', ellipse());
    expect(byType(e.objects, 'ellipse')[0].showArea).toBe(true);
    expect(e.message).toContain(`≈ ${(Math.PI * 6).toFixed(2).replace('.', ',')} br²`);
    const s = expectOk(handlers, 'Daire diliminin alanı nedir', arc('sector'));
    expect(byType(s.objects, 'sector')[0].showArea).toBe(true);
    expect(s.message).toContain('≈ 3,14 br²');
    const sp = expectOk(handlers, 'daire diliminin çevresini hesapla', arc('sector'));
    expect(sp.message).toContain(`≈ ${(Math.PI + 4).toFixed(2).replace('.', ',')} br`);
    const both = expectOk(handlers, 'ABC üçgeninin alanını ve çevresini hesapla', triangle());
    expect(poly(both.objects)).toMatchObject({ showArea: true, showPerimeter: true });
    expect(both.message).toContain('Ç(ABC) = 12 br');
    const perimeter = expectOk(handlers, 'Şeklin etrafının toplamı ne kadar', triangle());
    expect(poly(perimeter.objects).showPerimeter).toBe(true);
  });

  it('answers for bare points without a polygon', () => {
    const r = unchanged(pointsOnly(), "ABC'nin alanı kaç?");
    expect(r.message).toContain('A(ABC) = 6 br²');
    expect(r.message).toContain('çizili çokgen yok');
  });

  it('applies to every shape when asked in plural', () => {
    const r = expectOk(handlers, 'üçgenlerin alanlarını göster', twoTriangles());
    expect(byType(r.objects, 'polygon').every(p => p.showArea)).toBe(true);
    expect(r.selectedIds).toHaveLength(2);
  });

  it('fails clearly', () => {
    expect(expectFail(handlers, "XYZ'nin alanı kaç", triangle())).toMatch(/XYZ/);
    expect(expectFail(handlers, 'yayın alanını hesapla', arc())).toMatch(/Yayın alanı/);
    expect(expectFail(handlers, 'çemberin alanını hesapla', triangle())).toMatch(/çember/);
    expect(expectFail(handlers, 'alanını hesapla', [])).toMatch(/Önce bir şekil/);
  });
});

// ---------------------------------------------------------------------------------------------------------------- uzunluk / mesafe

describe('lengths, edges and distances', () => {
  it.each(["AB'nin uzunluğu nedir", '[AB] uzunluğunu ölç', 'AB doğru parçasının uzunluğunu göster', '|AB| kaç', 'ab uzunluğu ne kadar?'])('%s → segment showLength', text => {
    const scene = segmentAB();
    const r = expectOk(handlers, text, scene);
    const seg = byType(r.objects, 'segment')[0];
    expect(seg.showLength).toBe(true);
    expect(r.message).toContain('|AB| = 5 br');
    expect(r.selectedIds).toEqual([seg.id]);
  });

  it('labels a polygon edge when no segment exists', () => {
    const r = expectOk(handlers, 'AB kenarının uzunluğunu göster', triangle());
    expect(poly(r.objects).edgeLabels).toEqual([0]);
    const again = expectOk(handlers, "CA'nın uzunluğu nedir", r.objects);
    expect(poly(again.objects).edgeLabels).toEqual([0, 2]);
    expect(again.message).toContain('|CA| = 3 br');
    const context = expectOk(handlers, 'ABC üçgeninin BC kenarını ölç', triangle());
    expect(poly(context.objects).edgeLabels).toEqual([1]);
    const plural = expectOk(handlers, 'üçgenin kenar uzunluklarını göster', triangle());
    expect(poly(plural.objects).edgeLabels).toEqual([0, 1, 2]);
  });

  it('answers point distances and creates a measuring segment only for ölç/göster', () => {
    const scene = triangle();
    const q = unchanged(scene, 'A ile B arasındaki mesafe');
    expect(q.message).toContain('4 br');
    unchanged(scene, 'A ve C arasındaki uzaklık ne kadar?');
    const shown = expectOk(handlers, 'B ile C arasındaki mesafeyi ölç', scene);
    const seg = byType(shown.objects, 'segment')[0];
    expect(seg).toMatchObject({ label: '|BC|', unit: 'br', color: '#059669', thickness: 3, showLength: true });
    expect(shown.message).toContain('|BC| = 5 br');
    expect(shown.selectedIds).toEqual([seg.id]);
    const again = expectOk(handlers, 'B ile C arasındaki mesafeyi göster', shown.objects);
    expect(byType(again.objects, 'segment')).toHaveLength(1);
  });

  it('computes point-to-line distance', () => {
    const r = unchanged(triangle(), 'A noktasının BC doğrusuna uzaklığı ne kadar');
    expect(r.message).toContain('2,4 br');
  });

  it('follows live constructions after a source point moves', () => {
    const scene = build(s => {
      const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' });
      const B = s.addPoint({ x: 4, y: 0 }, { label: 'B' });
      s.addPoint({ x: 0, y: 0 }, { label: 'M', construction: { kind: 'midpoint', pointIds: [A.id, B.id] } });
      s.addPoint({ x: 2, y: 3 }, { label: 'C' });
    });
    expect(unchanged(scene, 'M ile C arasındaki mesafe kaç').message).toContain('3 br');
    const moved = resolveCommandBindings(scene.map(o => o.type === 'point' && o.label === 'B' ? { ...o, x: 4, y: 6 } as MathObject : o));
    expect(point(moved, 'M')).toMatchObject({ x: 2, y: 3 });
    expect(unchanged(moved, 'M ile C arasındaki mesafe kaç').message).toContain('0 br');
    const slope = expectOk(handlers, "AM'nin eğimini ölç", moved);
    expect(slope.message).toContain('AM eğimi = 1,5');
    const measurement = byType(slope.objects, 'measurement')[0];
    const next = resolveCommandBindings(slope.objects.map(o => o.type === 'point' && o.label === 'B' ? { ...o, x: 8, y: 2 } as MathObject : o));
    expect(point(next, 'M')).toMatchObject({ x: 4, y: 1 });
    expect(next.find(o => o.id === measurement.id)).toBeTruthy();
    expect(expectOk(handlers, "AM'nin eğimi kaç", next).message).toContain('0,25');
  });

  it('fails clearly', () => {
    expect(expectFail(handlers, 'üçgenin kenarını ölç', triangle())).toMatch(/Hangi kenar/);
    expect(expectFail(handlers, 'A ile Z arasındaki mesafe', triangle())).toMatch(/Z/);
    expect(expectFail(handlers, 'mesafeyi ölç', triangle())).toMatch(/İki noktanın/);
    const shared = build(s => {
      const [A, B, C, D] = ([[0, 0], [4, 0], [0, 3], [4, 3]] as const).map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABCD'[i] }));
      s.addPolygon([A.id, B.id, C.id]);
      s.addPolygon([A.id, B.id, D.id]);
    });
    expect(expectFail(handlers, 'AB kenarının uzunluğunu göster', shared)).toMatch(/birden fazla çokgende/);
  });

  it('measures every edge of a regular shape asked in singular', () => {
    const square = build(s => {
      const pts = ([[0, 0], [2, 0], [2, 2], [0, 2]] as const).map(([x, y], i) => s.addPoint({ x, y }, { label: 'KLMN'[i] }));
      s.addPolygon(pts.map(p => p.id), { kind: 'square' });
    });
    const r = expectOk(handlers, 'karenin kenar uzunluğunu göster', square);
    expect((byLabel(r.objects, 'KLMN') as PolygonObject).edgeLabels).toEqual([0, 1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------------------------------------------- açılar

describe('angles', () => {
  it.each([
    ['B açısını ölç', 'B', '36,87°'],
    ['C köşesindeki açıyı göster', 'C', '53,13°'],
    ["ABC üçgeninin B açısını ölç", 'B', '36,87°'],
    ['A noktasının açısını ölçer misin', 'A', '90°'],
    ["b'nin açısını yaz", 'B', '36,87°'],
  ])('%s', (text, vertex, value) => {
    const r = expectOk(handlers, text, triangle());
    expect(angleAt(r.objects, vertex)).toHaveLength(1);
    expect(r.message).toContain(value);
  });

  it('creates an angle from three labels without arms and reuses it', () => {
    const r = expectOk(handlers, 'ABC açısını ölç', pointsOnly());
    const [angle] = byType(r.objects, 'angle');
    expect(angle).toMatchObject({ label: '∠ABC', color: '#f59e0b', showValue: true });
    expect(angle.vertexPointId).toBe(point(r.objects, 'B').id);
    expect(byType(r.objects, 'segment')).toHaveLength(0);
    expect(r.message).toContain('m(∠ABC) = 90°');
    const again = expectOk(handlers, 'CBA açısını göster', r.objects);
    expect(byType(again.objects, 'angle')).toHaveLength(1);
    const three = expectOk(handlers, 'A, B ve C noktalarının oluşturduğu açıyı ölç', pointsOnly());
    expect(byType(three.objects, 'angle')).toHaveLength(1);
  });

  it('shows all corners with their sum and cascades with the polygon', () => {
    const scene = triangle();
    const r = expectOk(handlers, 'Üçgenin tüm açılarını göster', scene);
    expect(byType(r.objects, 'angle')).toHaveLength(3);
    expect(r.message).toContain('toplam 180°');
    expect(r.selectedIds).toHaveLength(3);
    const removal = collectDependentIds(r.objects, [poly(r.objects).id]);
    for (const a of byType(r.objects, 'angle')) expect(removal.has(a.id)).toBe(true);
  });

  it('answers questions without creating angles', () => {
    const r = unchanged(triangle(), 'A köşesi kaç derecedir');
    expect(r.message).toContain('m(∠CAB) = 90°');
    const q = unchanged(pointsOnly(), 'ABC açısı kaç derece?');
    expect(q.message).toContain('90°');
    const existing = expectOk(handlers, 'B açısını ölç', triangle());
    const hidden = existing.objects.map(o => o.type === 'angle' ? { ...o, showValue: false } as MathObject : o);
    const shown = expectOk(handlers, 'B açısı kaç derece', hidden);
    expect(byType(shown.objects, 'angle')[0].showValue).toBe(true);
  });

  it('uses the central angle of arcs and sectors', () => {
    const r = expectOk(handlers, 'M açısını ölç', arc().map(o => o.type === 'arc' ? { ...o, showCentralAngle: false } as MathObject : o));
    expect(byType(r.objects, 'angle')).toHaveLength(0);
    expect(byType(r.objects, 'arc')[0].showCentralAngle).toBe(true);
    expect(r.message).toContain('m(S͡D) = 90°');
    const three = expectOk(handlers, 'SMD açısını ölç', arc());
    expect(byType(three.objects, 'angle')).toHaveLength(0);
  });

  it('uses segment arms when the vertex is not a polygon corner', () => {
    const scene = build(s => {
      const [A, B, C] = ([[0, 0], [2, 0], [2, 2]] as const).map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABC'[i] }));
      s.addSegment(B.id, A.id); s.addSegment(B.id, C.id);
    });
    const r = expectOk(handlers, 'B açısını ölç', scene);
    expect(angleAt(r.objects, 'B')).toHaveLength(1);
    expect(r.message).toContain('90°');
  });

  // E köşesinde üç kol (I yukarı, F sağda, G sol-aşağı): "E açısı" tek başına belirsizdir.
  const ucKollu = () => build(s => {
    const E = s.addPoint({ x: 0, y: 0 }, { label: 'E' });
    const I = s.addPoint({ x: 0, y: 3 }, { label: 'I' });
    const F = s.addPoint({ x: 4, y: 0 }, { label: 'F' });
    const G = s.addPoint({ x: -3, y: -3 }, { label: 'G' });
    s.addSegment(E.id, I.id); s.addSegment(E.id, F.id); s.addSegment(E.id, G.id);
  });

  it('asks which angle when a vertex has three or more arms', () => {
    const mesaj = expectFail(handlers, 'E açısını ölç', ucKollu());
    expect(mesaj).toMatch(/E noktasında üç açı var/);
    expect(mesaj).toContain('FEI');
    expect(mesaj).toContain('IEG');
    expect(mesaj).toContain('GEF');
    expect(mesaj).toMatch(/Hangisini ölçeyim/);
    // Üç harfle yazmak hâlâ çalışır ve TAM o açıyı ölçer
    const r = expectOk(handlers, 'IEF açısını ölç', ucKollu());
    expect(byType(r.objects, 'angle')).toHaveLength(1);
    expect(r.message).toContain('90°');
  });

  it('measures every angle at a vertex on request', () => {
    const r = expectOk(handlers, 'E noktasındaki açıları ölç', ucKollu());
    const acilar = angleAt(r.objects, 'E');
    expect(acilar).toHaveLength(3);
    expect(r.message).toContain('E noktasındaki açılar');
    expect(r.message).toContain('m(∠FEI) = 90°');
    expect(r.message).toContain('135°');
    // Soru biçimi sahneyi değiştirmez
    const soru = unchanged(ucKollu(), 'E noktasındaki açılar kaç derece');
    expect(soru.message).toContain('m(∠FEI) = 90°');
  });

  // A köşesinden BC'ye inen bir çevian (yükseklik/açıortay): köşede üç açı olur, "A açısı" yine belirsizdir.
  const cevianli = () => build(s => {
    const A = s.addPoint({ x: 0, y: 4 }, { label: 'A' });
    const B = s.addPoint({ x: 0, y: 0 }, { label: 'B' });
    const C = s.addPoint({ x: 6, y: 0 }, { label: 'C' });
    const H = s.addPoint({ x: 3, y: 0 }, { label: 'H' });
    s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
    s.addSegment(A.id, H.id);
  });

  it('asks at a polygon corner too when extra arms add angles', () => {
    const mesaj = expectFail(handlers, 'A açısını ölç', cevianli());
    expect(mesaj).toMatch(/A noktasında üç açı var/);
    expect(mesaj).toContain('BAH');
    expect(mesaj).toContain('HAC');
    expect(mesaj).toContain('CAB');
    // Çokgen adı yazılırsa köşe açısı eskisi gibi tek adımda ölçülür
    const r = expectOk(handlers, 'ABC üçgeninin A açısını ölç', cevianli());
    expect(angleAt(r.objects, 'A')).toHaveLength(1);
    // Üç harf de tek adımda ölçer
    const uc = expectOk(handlers, 'BAH açısını ölç', cevianli());
    expect(angleAt(uc.objects, 'A')).toHaveLength(1);
    // Fazladan kol yoksa (düz üçgen) soru sorulmaz
    expect(angleAt(expectOk(handlers, 'A açısını ölç', triangle()).objects, 'A')).toHaveLength(1);
  });

  it('fails clearly', () => {
    const shared = build(s => {
      const [A, B, C, D] = ([[0, 0], [4, 0], [0, 3], [4, 3]] as const).map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABCD'[i] }));
      s.addPolygon([A.id, B.id, C.id]);
      s.addPolygon([B.id, D.id, C.id]);
    });
    expect(expectFail(handlers, 'B açısını ölç', shared)).toMatch(/birden fazla çokgende/);
    expect(expectOk(handlers, 'B açısını ölç', shared, [byType(shared, 'polygon')[1].id]).objects.filter(o => o.type === 'angle')).toHaveLength(1);
    expect(expectFail(handlers, 'açıyı ölç', triangle())).toMatch(/Hangi açı/);
    expect(expectOk(handlers, 'B açısını ölç', pointsOnly()).message).toContain('m(∠ABC) = 90°');
    expect(expectFail(handlers, 'ABC üçgeninin D açısını ölç', twoTriangles())).toMatch(/köşesi değil/);
  });
});

// ---------------------------------------------------------------------------------------------------------------- çember parçaları

describe('circle, arc and sector parts', () => {
  it('answers radius and diameter', () => {
    expect(unchanged(circle(), "c1'in yarıçapı kaç").message).toContain('r = 3 br');
    expect(unchanged(circle(), 'Çemberin çapı nedir').message).toContain('çap = 6 br');
    expect(unchanged(ellipse(), 'elipsin yarıçapları ne kadar').message).toContain('yatay yarıçap = 3 br, dikey yarıçap = 2 br');
    // C, A, P noktaları varken "çapı" etiket sanılmamalı
    const tricky = build(s => {
      for (const [l, x] of [['C', 5], ['A', 6], ['P', 7]] as const) s.addPoint({ x, y: 5 }, { label: l });
      const O = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
      s.addCircle({ centerId: O.id, radius: 2 });
    }, []);
    expect(unchanged(tricky, 'çemberin çapı nedir').message).toContain('çap = 4 br');
  });

  it('sets arc and sector flags', () => {
    const len = expectOk(handlers, 'Yay uzunluğunu göster', arc().map(o => o.type === 'arc' ? { ...o, showArcLength: false } as MathObject : o));
    expect(byType(len.objects, 'arc')[0].showArcLength).toBe(true);
    expect(len.message).toContain('|S͡D| ≈ 3,14 br');
    const central = expectOk(handlers, 'Merkez açısını göster', arc().map(o => o.type === 'arc' ? { ...o, showCentralAngle: false } as MathObject : o));
    expect(byType(central.objects, 'arc')[0].showCentralAngle).toBe(true);
    expect(central.message).toContain('m(S͡D) = 90°');
    const chord = expectOk(handlers, 'Kirişin uzunluğu', arc());
    expect(byType(chord.objects, 'arc')[0].showChordLength).toBe(true);
    expect(chord.message).toContain('≈ 2,83 br');
    const radius = expectOk(handlers, 'Daire diliminin yarıçapını göster', arc('sector'));
    expect(byType(radius.objects, 'sector')[0].showRadius).toBe(true);
    const named = expectOk(handlers, 'SD yayının uzunluğunu hesapla', arc());
    expect(named.selectedIds).toEqual([byType(arc(), 'arc')[0].id].map(() => byType(named.objects, 'arc')[0].id));
    const byCentre = expectOk(handlers, 'M merkezli yayın kirişini ölç', arc());
    expect(byType(byCentre.objects, 'arc')[0].showChordLength).toBe(true);
  });

  it('measures a chord given by its endpoints as a length', () => {
    const scene = build(s => { const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' }); s.addCircle({ centerId: M.id, radius: 2 }); s.addPoint({ x: 2, y: 0 }, { label: 'S' }); s.addPoint({ x: 0, y: 2 }, { label: 'D' }); });
    const r = unchanged(scene, 'SD kirişinin uzunluğu nedir');
    expect(byType(expectOk(handlers, 'SD kirişinin uzunluğu nedir', arc()).objects, 'arc')[0].showChordLength).toBe(true);
    expect(r.message).toContain('≈ 2,83 br');
  });

  it('fails clearly', () => {
    expect(expectFail(handlers, 'çemberin yay uzunluğunu göster', circle())).toMatch(/çevresidir/);
    expect(expectFail(handlers, 'merkez açısını göster', circle())).toMatch(/yay ya da daire dilimi/);
    expect(expectFail(handlers, 'üçgenin yarıçapı kaç', triangle())).toMatch(/Üçgen/);
  });
});

// ---------------------------------------------------------------------------------------------------------------- denklem / eğim

describe('equations and slopes', () => {
  it('shows a line equation', () => {
    const r = expectOk(handlers, 'AB doğrusunun denklemini göster', lineAB());
    const line = byType(r.objects, 'line')[0] as LineObject;
    expect(line.showEquation).toBe(true);
    expect(r.message).toContain('y = 2x + 1');
    expect(r.selectedIds).toEqual([line.id]);
    expect(expectOk(handlers, 'AB doğrusunun denklemi nedir', lineAB()).message).toContain('y = 2x + 1');
    expect(unchanged(segmentAB(), "AB'nin denklemi nedir").message).toContain('y = 1,33x');
    expect(unchanged(pointsOnly(), 'BC doğrusunun denklemi nedir').message).toContain('x = 4');
  });

  it('writes circle and ellipse equations', () => {
    expect(unchanged(circle(), 'Çemberin denklemi nedir').message).toContain('(x − 1)² + (y + 2)² = 9');
    expect(unchanged(ellipse(), 'elipsin denklemini yaz').message).toContain('x²/9 + y²/4 = 1');
  });

  it('creates one slope measurement like the tool', () => {
    const r = expectOk(handlers, "AB'nin eğimini ölç", lineAB());
    const [m] = byType(r.objects, 'measurement');
    expect(m).toMatchObject({ kind: 'slope', label: 'AB eğimi', color: '#059669', showValue: true });
    expect(m.pointIds).toEqual(['A', 'B'].map(l => point(r.objects, l).id));
    expect(r.message).toContain('AB eğimi = 2');
    // Doğru varsa odakta doğru kalır ("… eğimini ölç ve kırmızı yap" doğruyu boyar); yalnızca noktalar varken ölçüm seçilir.
    expect(r.selectedIds).toEqual([byType(r.objects, 'line')[0].id]);
    const bare = expectOk(handlers, "AB'nin eğimini ölç", pointsOnly());
    expect(bare.selectedIds).toEqual([byType(bare.objects, 'measurement')[0].id]);
    expect(byType(expectOk(handlers, "BA'nın eğimini göster", r.objects).objects, 'measurement')).toHaveLength(1);
    const question = unchanged(lineAB(), 'AB doğrusunun eğimi kaç');
    expect(question.message).toContain('= 2');
    const vertical = expectOk(handlers, "BC'nin eğimini hesapla", pointsOnly());
    expect(vertical.message).toContain('tanımsız');
    const removal = collectDependentIds(r.objects, [point(r.objects, 'B').id]);
    expect(removal.has(m.id)).toBe(true);
  });

  it('fails clearly', () => {
    expect(expectFail(handlers, 'üçgenin denklemi nedir', triangle())).toMatch(/denklem/);
    expect(expectFail(handlers, 'eğimini ölç', [])).toMatch(/doğru/);
  });
});

// ---------------------------------------------------------------------------------------------------------------- trigonometri

describe('trigonometric ratios', () => {
  it('creates a trig measurement for a named angle', () => {
    const r = expectOk(handlers, 'ABC açısının trigonometrik oranları', triangle());
    const [m] = byType(r.objects, 'measurement') as MeasurementObject[];
    expect(m).toMatchObject({ kind: 'trig', color: '#7c3aed', label: 'ABC açısının oranları' });
    expect(m.pointIds).toEqual(['A', 'B', 'C'].map(l => point(r.objects, l).id));
    expect(r.message).toContain('sin = 0,6, cos = 0,8, tan = 0,75');
    expect(byType(expectOk(handlers, 'CBA açısının sin cos tan değerlerini göster', r.objects).objects, 'measurement')).toHaveLength(1);
  });

  it('reads polygon corners, selected angles and single functions', () => {
    const sin = expectOk(handlers, 'B açısının sinüsünü hesapla', triangle());
    expect(sin.message).toContain('sin = 0,6');
    expect(sin.message).not.toContain('cos');
    const withAngle = triangle((s, ids) => { s.addAngle(ids.A, ids.B, ids.C); });
    const r = expectOk(handlers, 'sin cos tan değerleri', withAngle);
    expect((byType(r.objects, 'measurement')[0] as MeasurementObject).pointIds[1]).toBe(point(r.objects, 'B').id);
    const q = unchanged(triangle(), "C açısının kosinüsü kaç");
    expect(q.message).toContain('cos = 0,6');
    const right = unchanged(triangle(), 'A açısının tanjantı nedir');
    expect(right.message).toContain('tan = tanımsız');
  });

  it('fails without an angle', () => {
    expect(expectFail(handlers, 'trigonometrik oranları göster', triangle())).toMatch(/Hangi açı/);
  });
});

// ---------------------------------------------------------------------------------------------------------------- koordinat

describe('coordinates', () => {
  it('answers and shows point coordinates', () => {
    expect(unchanged(triangle(), "A'nın koordinatları nedir").message).toBe('A(0; 0).');
    const p = build(s => { s.addPoint({ x: 2.5, y: -3 }, { label: 'P', showLabel: false }); });
    const r = expectOk(handlers, 'P noktasının koordinatlarını göster', p);
    expect(point(r.objects, 'P').showLabel).toBe(true);
    expect(r.message).toContain('P(2,5; -3)');
    expect(unchanged(triangle(), 'A nerede?').message).toContain('A(0; 0)');
    expect(unchanged(triangle(), 'B ve C noktalarının koordinatları').message).toBe('B(4; 0), C(0; 3).');
    const tri = triangle();
    expect(unchanged(tri, 'seçili noktanın koordinatları nedir', [point(tri, 'C').id]).message).toContain('C(0; 3)');
  });

  it('gives centres of round shapes', () => {
    expect(unchanged(circle(), 'Çemberin merkezinin koordinatları nedir').message).toContain('(1; -2)');
    const through = build(s => {
      const [A, B, C] = ([[1, 0], [-1, 0], [0, 1]] as const).map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABC'[i] }));
      s.addCircle({ throughIds: [A.id, B.id, C.id] });
    });
    expect(unchanged(through, 'çemberin merkezinin koordinatları').message).toContain('(0; 0)');
  });
});

// ---------------------------------------------------------------------------------------------------------------- tüm ölçüler / gizleme

describe('show and hide an object’s measurements', () => {
  it('shows every measurement of a named, selected or described object', () => {
    const r = expectOk(handlers, "ABC'nin ölçülerini göster", triangle());
    expect(poly(r.objects)).toMatchObject({ showArea: true, showPerimeter: true, edgeLabels: [0, 1, 2] });
    expect(r.message).toContain('A(ABC) = 6 br²');
    const a = expectOk(handlers, 'Yayın tüm ölçülerini göster', arc());
    expect(byType(a.objects, 'arc')[0] as ArcObject).toMatchObject({ showArcLength: true, showRadius: true, showChordLength: true, showCentralAngle: true });
    const scene = triangle();
    const s = expectOk(handlers, 'Seçili şeklin ölçülerini göster', scene, [poly(scene).id]);
    expect(poly(s.objects).showArea).toBe(true);
  });

  it('hides specific measurement flags', () => {
    const shown = expectOk(handlers, "ABC'nin ölçülerini göster", triangle((s, ids) => { s.addAngle(ids.C, ids.A, ids.B); }));
    const area = expectOk(handlers, "ABC'nin alanını gizle", shown.objects);
    expect(poly(area.objects)).toMatchObject({ showArea: false, showPerimeter: true });
    expect(area.selectedIds).toEqual([poly(shown.objects).id]);
    const all = expectOk(handlers, "ABC'nin ölçülerini gizle", shown.objects);
    expect(poly(all.objects)).toMatchObject({ showArea: false, showPerimeter: false, edgeLabels: [] });
    expect(byType(all.objects, 'angle')[0].showValue).toBe(false);
    const edges = expectOk(handlers, 'Kenar uzunluklarını gizle', shown.objects);
    expect(poly(edges.objects).edgeLabels).toEqual([]);
    const one = expectOk(handlers, 'AB kenarının uzunluğunu gizle', shown.objects);
    expect(poly(one.objects).edgeLabels).toEqual([1, 2]);
    const angle = expectOk(handlers, 'A açısının değerini gizle', shown.objects);
    expect(byType(angle.objects, 'angle')[0].showValue).toBe(false);
    const eq = expectOk(handlers, 'AB doğrusunun denklemini gizle', lineAB().map(o => o.type === 'line' ? { ...o, showEquation: true } as MathObject : o));
    expect(byType(eq.objects, 'line')[0].showEquation).toBe(false);
    const central = expectOk(handlers, 'Merkez açısını gizle', arc());
    expect(byType(central.objects, 'arc')[0].showCentralAngle).toBe(false);
    const seg = expectOk(handlers, "AB'nin uzunluğunu gizle", segmentAB().map(o => o.type === 'segment' ? { ...o, showLength: true } as MathObject : o));
    expect(byType(seg.objects, 'segment')[0].showLength).toBe(false);
    const slope = expectOk(handlers, "AB'nin eğimini ölç", lineAB());
    expect(byType(expectOk(handlers, 'AB eğimini gizle', slope.objects).objects, 'measurement')[0].showValue).toBe(false);
  });

  it('leaves untargeted global hiding to the app family', () => {
    expect(expectFail(handlers, 'ölçüleri gizle', triangle())).toMatch(/tüm ölçümleri gizle/);
  });
});

// ---------------------------------------------------------------------------------------------------------------- katalog

describe('catalog phrasings', () => {
  const bare = () => build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A' }); s.addPoint({ x: 3, y: 4 }, { label: 'B' }); });
  it('measures with units between bare points', () => {
    const scene = bare();
    const r = expectOk(handlers, 'A ile B arasını birimle ölç', scene);
    expect(byType(r.objects, 'segment')[0]).toMatchObject({ label: '|AB|', unit: 'br', showLength: true });
    expect(r.message).toContain('5 br');
    expect(unchanged(scene, 'A ile B arasındaki mesafe kaç?').message).toContain('5 br');
    expect(expectOk(handlers, '[AB] parçasının uzunluğunu göster', r.objects).message).toContain('|AB| = 5 br');
    expect(byType(expectOk(handlers, 'AB uzunluğunu ölç', scene).objects, 'segment')).toHaveLength(1);
  });
  it('uses the only other two points as angle arms and reads slopes between labels', () => {
    const scene = build(s => { s.addPoint({ x: 4, y: 0 }, { label: 'A' }); s.addPoint({ x: 0, y: 0 }, { label: 'B' }); s.addPoint({ x: 0, y: 3 }, { label: 'C' }); });
    const r = expectOk(handlers, 'B açısının sin cos tan değerlerini hesapla', scene);
    expect((byType(r.objects, 'measurement')[0] as MeasurementObject).pointIds).toEqual(['A', 'B', 'C'].map(l => point(r.objects, l).id));
    expect(r.message).toContain('m(∠ABC) = 90°');
    expect(expectOk(handlers, 'ABC açısının trigonometrik oranlarını göster', scene).message).toContain('sin = 1, cos = 0, tan = tanımsız');
    expect(expectOk(handlers, 'AB eğimini ölç', scene).message).toContain('AB eğimi = 0');
    const q = unchanged(scene, 'A ile B arasındaki doğrunun eğimi kaç?');
    expect(q.message).toBe('AB eğimi = 0.');
    expect(expectOk(handlers, 'ABC üçgeninin çevresini hesapla', triangle()).message).toContain('Ç(ABC) = 12 br');
    expect(expectOk(handlers, 'üçgenin çevresini göster', triangle()).message).toContain('Ç(ABC) = 12 br');
    expect(expectFail(handlers, 'B açısını ölç', build(s => { for (const [l, x] of [['A', 0], ['B', 1], ['C', 2], ['D', 3]] as const) s.addPoint({ x, y: x * x }, { label: l }); }))).toMatch(/kolları/);
  });
});

// ---------------------------------------------------------------------------------------------------------------- sahiplik

describe('ownership', () => {
  const scene = triangle();
  it.each([
    'alanı 16 olan kare çiz', "AB'nin uzunluğunu 5 yap", 'açısı 60 derece olan paralelkenar çiz', 'tüm ölçümleri gizle', 'tüm ölçümleri göster',
    'koordinatları göster', 'koordinat eksenlerini göster', 'ABC açısını çiz', 'AB doğru parçası çiz', 'ızgarayı göster', "ABC'yi gizle", 'açıları gizle',
    '3 cm uzunluğunda doğru parçası', 'yarıçapı 3 olan çember çiz', 'çemberin yarıçapını 4 yap', "ABC'yi 2 birim sağa kaydır", "AB'nin orta noktasını bul",
    'ABC açısını 60 derece yap', 'kenarları 3, 4 ve 5 olan üçgen çiz', "A'yı (3;4)'e taşı", 'alan nasıl hesaplanır', 'ABC açısı', 'A noktasını sil',
    'üçgenin alanını gösterme', 'yarıçapı 2 olan çember', 'uzunluğu 4 olan doğru parçası çiz', 'ABC üçgeninin alanını 12 yap', 'tüm açıları sil',
  ])('does not match: %s', text => {
    const state = new CommandScene(scene);
    expect(rankHandlers(parseClause(text, state.known()), state, handlers)).toEqual([]);
  });

  it('keeps scores inside the measurement band', () => {
    const state = new CommandScene(scene);
    for (const text of ["ABC'nin alanı kaç?", 'B açısını ölç', 'kirişin uzunluğu', "ABC'nin alanını gizle"]) {
      const [best] = rankHandlers(parseClause(text, state.known()), state, handlers);
      expect(best.score).toBeGreaterThanOrEqual(55);
      expect(best.score).toBeLessThanOrEqual(64);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------- iki nokta arasındaki yay

/** M(0,0) merkez, B(3,0) yarıçap noktası; C(0,3) ve D(0,-3) serbest ama çemberin üzerinde; E(5,5) dışarıda. */
const circlePoints = () => build(s => {
  const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
  const B = s.addPoint({ x: 3, y: 0 }, { label: 'B' });
  s.addCircle({ centerId: M.id, radiusPointId: B.id });
  s.addPoint({ x: 0, y: 3 }, { label: 'C' });
  s.addPoint({ x: 0, y: -3 }, { label: 'D' });
  s.addPoint({ x: 5, y: 5 }, { label: 'E' });
});
const arcMeasures = (objects: MathObject[]) => byType(objects, 'measurement').filter(m => m.kind === 'arc');
const measuredArc = () => expectOk(handlers, 'BD yayını ölç', circlePoints()).objects;

describe('arc between two points (circle is not split)', () => {
  it('BD yayını ölç: one live arc measurement on the circle, nothing else changes', () => {
    const scene = circlePoints();
    const r = expectOk(handlers, 'BD yayını ölç', scene);
    const [m] = arcMeasures(r.objects);
    expect(arcMeasures(r.objects)).toHaveLength(1);
    expect(m).toMatchObject({ kind: 'arc', circleId: byType(scene, 'circle')[0].id, pointIds: [point(scene, 'B').id, point(scene, 'D').id], label: 'BD yayı', showValue: true, visible: true });
    expect(byType(r.objects, 'segment')).toEqual([]);
    expect(byType(r.objects, 'circle')).toEqual(byType(scene, 'circle'));
    expect(r.message).toBe('BD yayı: |B͡D| ≈ 4,71 br, m(B͡D) = 90°.');
    expect(r.selectedIds).toEqual([m.id]);
  });

  it('BCD yayı (ara nokta), büyük yay, "B ile D arasındaki yay" ve küçük harfli yazım', () => {
    const through = expectOk(handlers, 'BCD yayını ölç', circlePoints());
    expect(arcMeasures(through.objects)[0]).toMatchObject({ throughPointId: point(through.objects, 'C').id, label: 'BCD yayı' });
    expect(through.message).toBe('BCD yayı: |B͡C͡D| ≈ 14,14 br, m(B͡C͡D) = 270°.');
    const major = expectOk(handlers, 'BD büyük yayını ölç', circlePoints());
    expect(arcMeasures(major.objects)[0]).toMatchObject({ major: true, label: 'BCD yayı' });
    expect(major.message).toBe('BCD yayı: |B͡C͡D| ≈ 14,14 br, m(B͡C͡D) = 270°.');
    expect(expectOk(handlers, 'B ile D arasındaki yayı ölç', circlePoints()).message).toBe('BD yayı: |B͡D| ≈ 4,71 br, m(B͡D) = 90°.');
    expect(expectOk(handlers, 'bd yayını ölç', circlePoints()).message).toBe('BD yayı: |B͡D| ≈ 4,71 br, m(B͡D) = 90°.');
    expect(expectOk(handlers, 'B D yayını ölç', circlePoints()).message).toBe('BD yayı: |B͡D| ≈ 4,71 br, m(B͡D) = 90°.');
  });

  it('"ölçüsü", "uzunluğu", "uzunluğunu bul" oluşturur; soru yalnızca yanıtlar; ikinci kez ölçmek kopya üretmez', () => {
    for (const text of ['BD yayının ölçüsü', 'BD yayının uzunluğu', 'BD yayının uzunluğunu bul']) {
      expect(arcMeasures(expectOk(handlers, text, circlePoints()).objects)).toHaveLength(1);
    }
    const q = unchanged(circlePoints(), 'BD yayı kaç derece');
    expect(q.message).toBe('BD yayı: |B͡D| ≈ 4,71 br, m(B͡D) = 90°.');
    const again = expectOk(handlers, 'BD yayını ölç', measuredArc());
    expect(again.sceneChanged).toBe(false);
    expect(arcMeasures(again.objects)).toHaveLength(1);
    expect(again.actions).toContainEqual({ kind: 'styleMode', mode: 'Ayrıntılı' });
    const hidden = measuredArc().map(o => o.type === 'measurement' ? { ...o, visible: false } as MathObject : o);
    expect(arcMeasures(expectOk(handlers, 'DB yayını ölç', hidden).objects)[0].visible).toBe(true);
  });

  it('ortak çember yoksa açık hata; ara nokta başka çemberdeyse açıklar', () => {
    expect(expectFail(handlers, 'BE yayını ölç', circlePoints())).toContain('B ile E aynı çemberin üzerinde değil');
    expect(expectFail(handlers, 'BED yayını ölç', circlePoints())).toContain('E noktası B ve D ile aynı çemberin üzerinde değil');
  });

  it('üç noktadan geçen çember ve iki çemberin iki kesişim noktası', () => {
    const three = build(s => {
      const [A, B, C] = ([[1, 0], [0, 1], [-1, 0]] as const).map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABC'[i] }));
      s.addCircle({ throughIds: [A.id, B.id, C.id] });
    });
    expect(expectOk(handlers, 'AB yayını ölç', three).message).toBe('AB yayı: |A͡B| ≈ 1,57 br, m(A͡B) = 90°.');
    const two = build(s => {
      const O1 = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
      const O2 = s.addPoint({ x: 6, y: 0 }, { label: 'N' });
      s.addCircle({ centerId: O1.id, radius: 5 }, { label: 'c1' });
      s.addCircle({ centerId: O2.id, radius: 5 }, { label: 'c2' });
      s.addPoint({ x: 3, y: 4 }, { label: 'P' });
      s.addPoint({ x: 3, y: -4 }, { label: 'Q' });
    });
    const r = expectOk(handlers, 'PQ yayını ölç', two);
    expect(r.message).toMatch(/^PQ yayı \(c[12] üzerinde\): \|P͡Q\| ≈ /);
  });

  it('gerçek yay nesneleri ve diğer ölçüler eskisi gibi kalır (tüm aileler)', () => {
    const withArc = measuredArc();
    const all = (text: string, scene: MathObject[]) => {
      const r = runCommand(text, scene);
      if (!r.ok) throw new Error(`${text}: ${r.message}`);
      return r;
    };
    expect(all("BD'yi ölç", withArc).message).toContain('|BD|');
    expect(all('SD kirişinin uzunluğu nedir', arc()).message).toContain('≈ 2,83 br');
    expect(byType(all('SD yayının uzunluğunu hesapla', arc()).objects, 'arc')[0].showArcLength).toBe(true);
    expect(byType(all('ABC açısını ölç', pointsOnly()).objects, 'angle')).toHaveLength(1);
    const state = new CommandScene(circlePoints());
    const top = (text: string) => rankHandlers(parseClause(text, state.known()), state)[0]?.handler.id;
    for (const text of ['BD yayını ölç', 'BD yayının uzunluğu', 'BD yayının uzunluğunu bul', 'BD yayının ölçüsü', 'BCD yayını ölç', 'BD büyük yayını ölç', 'B ile D arasındaki yayı ölç', 'BD yayı kaç derece']) {
      expect(top(text)).toBe('measure.arcBetween');
    }
    const arcScore = (text: string) => rankHandlers(parseClause(text, state.known()), state).find(x => x.handler.id.startsWith('measure.arc'))?.score ?? 0;
    for (const text of ['yay ölç aracını seç', 'BD yayını çiz', 'ST yayını x eksenine göre yansıt', 'BD kirişinin uzunluğu']) expect(arcScore(text)).toBe(0);
  });

  it('yay ölçümünü yazıyla siler, gizler, gösterir; "BD’yi sil" yalnızca parçayı siler', () => {
    const scene = measuredArc();
    const m = arcMeasures(scene)[0];
    const hidden = expectOk(handlers, 'BD yayı ölçümünü gizle', scene);
    expect(arcMeasures(hidden.objects)[0].visible).toBe(false);
    const shown = expectOk(handlers, 'BD yayını göster', hidden.objects);
    expect(arcMeasures(shown.objects)[0].visible).toBe(true);
    const removed = expectOk(handlers, 'BD yayını sil', scene);
    expect(arcMeasures(removed.objects)).toEqual([]);
    expect(removed.objects.length).toBe(scene.length - 1);
    expect(expectFail(handlers, 'BD yayını sil', circlePoints())).toContain('BD yayı ölçülmemiş');
    const withSegment = build(s => { s.addSegment(point(scene, 'B').id, point(scene, 'D').id); }, scene);
    const r = runCommand("BD'yi sil", withSegment);
    if (!r.ok) throw new Error(r.message);
    expect(byType(r.objects, 'segment')).toEqual([]);
    expect(arcMeasures(r.objects).map(x => x.id)).toEqual([m.id]);
    const state = new CommandScene(withSegment);
    expect(rankHandlers(parseClause('BD yayını sil', state.known()), state)[0].handler.id).toBe('measure.arcEdit');
  });
});

// ---------------------------------------------------------------------------------------------------------------- örnekler

describe('every example works', () => {
  const withAngleB = () => triangle((s, ids) => { s.addAngle(ids.A, ids.B, ids.C); });
  const cases: Record<string, () => { scene: MathObject[]; selection?: string[] }> = {
    "ABC'nin alanını gizle": () => ({ scene: triangle() }),
    "ABC'nin ölçülerini gizle": () => ({ scene: triangle() }),
    'AB doğrusunun denklemini gizle': () => ({ scene: lineAB() }),
    'Kenar uzunluklarını gizle': () => ({ scene: triangle() }),
    'B açısının değerini gizle': () => ({ scene: withAngleB() }),
    'Merkez açısını gizle': () => ({ scene: arc() }),
    'ABC açısının trigonometrik oranları': () => ({ scene: triangle() }),
    'sin cos tan değerleri': () => ({ scene: withAngleB() }),
    'B açısının sinüsünü hesapla': () => ({ scene: triangle() }),
    'ABC açısının sin cos tan değerlerini göster': () => ({ scene: triangle() }),
    "c1'in yarıçapı kaç": () => ({ scene: circle() }),
    'Yay uzunluğunu göster': () => ({ scene: arc() }),
    'Merkez açısını göster': () => ({ scene: arc() }),
    'Kirişin uzunluğu': () => ({ scene: arc() }),
    'Çemberin çapı nedir': () => ({ scene: circle() }),
    'Daire diliminin yarıçapını göster': () => ({ scene: arc('sector') }),
    'AB doğrusunun denklemini göster': () => ({ scene: lineAB() }),
    'AB doğrusunun denklemi nedir': () => ({ scene: lineAB() }),
    "AB'nin eğimini ölç": () => ({ scene: lineAB() }),
    'AB doğrusunun eğimi kaç': () => ({ scene: lineAB() }),
    'Çemberin denklemi nedir': () => ({ scene: circle() }),
    "A'nın koordinatları nedir": () => ({ scene: triangle() }),
    'P noktasının koordinatlarını göster': () => ({ scene: build(s => { s.addPoint({ x: 1, y: 2 }, { label: 'P' }); }) }),
    'Çemberin merkezinin koordinatları nedir': () => ({ scene: circle() }),
    'A nerede?': () => ({ scene: triangle() }),
    'Üçgenin alanını yaz': () => ({ scene: triangle() }),
    'ABC çevresini ölç': () => ({ scene: triangle() }),
    "ABC'nin alanı kaç?": () => ({ scene: triangle() }),
    'Çemberin çevresini ölç': () => ({ scene: circle() }),
    'Çemberin alanını hesapla': () => ({ scene: circle() }),
    'ABC üçgeninin alanını ve çevresini hesapla': () => ({ scene: triangle() }),
    'Elipsin alanını göster': () => ({ scene: ellipse() }),
    'Daire diliminin alanı nedir': () => ({ scene: arc('sector') }),
    'Şeklin etrafının toplamı ne kadar': () => ({ scene: triangle() }),
    'A noktasının açısını yaz': () => ({ scene: triangle() }),
    'B açısını ölç': () => ({ scene: triangle() }),
    'ABC açısını ölç': () => ({ scene: pointsOnly() }),
    'Üçgenin tüm açılarını göster': () => ({ scene: triangle() }),
    'A köşesi kaç derecedir': () => ({ scene: triangle() }),
    'ABC üçgeninin B açısını ölç': () => ({ scene: triangle() }),
    'Üçgenin tüm kenarlarını ölç': () => ({ scene: triangle() }),
    "AB'nin uzunluğu nedir": () => ({ scene: segmentAB() }),
    'A ile B arasındaki mesafe': () => ({ scene: triangle() }),
    'A ile B arasındaki mesafeyi ölç': () => ({ scene: pointsOnly() }),
    'AB kenarının uzunluğunu göster': () => ({ scene: triangle() }),
    '[AB] uzunluğunu ölç': () => ({ scene: segmentAB() }),
    'A noktasının BC doğrusuna uzaklığı ne kadar': () => ({ scene: triangle() }),
    "ABC'nin ölçülerini göster": () => ({ scene: triangle() }),
    'Yayın tüm ölçülerini göster': () => ({ scene: arc() }),
    'Seçili şeklin ölçülerini göster': () => { const scene = triangle(); return { scene, selection: [poly(scene).id] }; },
    'BD yayını ölç': () => ({ scene: circlePoints() }),
    'BD yayının uzunluğu': () => ({ scene: circlePoints() }),
    'BD yayının uzunluğunu bul': () => ({ scene: circlePoints() }),
    'BD yayının ölçüsü': () => ({ scene: circlePoints() }),
    'BCD yayını ölç': () => ({ scene: circlePoints() }),
    'BD büyük yayını ölç': () => ({ scene: circlePoints() }),
    'B ile D arasındaki yayı ölç': () => ({ scene: circlePoints() }),
    'BD yayı kaç derece': () => ({ scene: circlePoints() }),
    'BD yayını sil': () => { const scene = measuredArc(); return { scene, selection: [point(scene, 'B').id] }; },
    'BD yayı ölçümünü gizle': () => ({ scene: measuredArc() }),
    'BD yayını göster': () => ({ scene: circlePoints() }),
  };
  const examples = [...new Set(handlers.flatMap(h => h.examples))];
  it('has a scenario for each example', () => {
    expect(examples.filter(e => !cases[e])).toEqual([]);
    for (const h of handlers) expect(h.examples.length).toBeGreaterThanOrEqual(3);
  });
  it.each(examples)('%s', example => {
    const { scene, selection } = cases[example]();
    const r = expectOk(handlers, example, scene, selection);
    expect(r.message.length).toBeGreaterThan(3);
    expect(r.selectedIds.length).toBeGreaterThan(0);
  });
});

// Tür denetimi için kullanılmayan içe aktarımlar
void (null as unknown as AngleObject | CircleObject | SectorObject | SegmentObject | PointObject | typeof runWith);
