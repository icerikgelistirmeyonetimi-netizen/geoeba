import { describe, expect, it } from 'vitest';
import type { CircleObject, MathObject, PointObject, SegmentObject } from '@/types/math';
import { resolveCommandBindings } from '@/math/commandBindings';
import { metniSeslendir } from '@/math/matematikYazimi';
import { handlers } from '../handlers/teoremler/tales';
import { rankHandlers, runCommand } from '../engine';
import { CommandScene } from '../scene';
import { parseClause } from '../text';
import { build, byType, dist, expectFail, expectOk, point } from './helpers';

/**
 * Tales teoremi şekilleri, Tales oranları, Tales çemberi ve orta taban: her örnek cümle hem yalnız bu modülle
 * hem tüm motorla çalışır; şekiller canlı kalır; mesajlar sembolsüz seslendirilir.
 */

const ok = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectOk(handlers, text, scene, selection);
const bad = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectFail(handlers, text, scene, selection);

type Pts = Record<string, [number, number]>;
const withPoints = (spec: Pts, extra?: (s: CommandScene, p: Record<string, PointObject>) => void) => build(s => {
  const p: Record<string, PointObject> = {};
  for (const [label, [x, y]] of Object.entries(spec)) p[label] = s.addPoint({ x, y }, { label });
  extra?.(s, p);
});

const S = {
  /** A(3;4) tepe, B(0;0), C(8;0): |AB| = 5, |BC| = 8, taban BC. */
  tri: () => withPoints({ A: [3, 4], B: [0, 0], C: [8, 0] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); }),
  /** ABCD yamuğu: AB (6) paralel DC (4), yükseklik 3 → orta taban 5. */
  yamuk: () => withPoints({ A: [0, 0], B: [6, 0], C: [5, 3], D: [1, 3] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id, p.D.id], { kind: 'polygon' }); }),
  /** Paralel kenarı olmayan dörtgen. */
  dortgen: () => withPoints({ A: [0, 0], B: [6, 0], C: [5, 3], D: [1, 4] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id, p.D.id], { kind: 'polygon' }); }),
  seg: () => withPoints({ A: [0, 0], B: [6, 0] }),
  empty: (): MathObject[] => [],
  tales: () => ok('Tales teoremi şekli çiz').objects,
  kelebek: () => ok('kelebek Tales şekli çiz').objects,
};

const move = (objects: MathObject[], label: string, x: number, y: number) =>
  resolveCommandBindings(objects.map(o => o.type === 'point' && o.label === label ? { ...o, x, y } as MathObject : o));
const byId = <T extends MathObject>(objects: MathObject[], id: string) => objects.find(o => o.id === id) as T;
const cross = (u: { x: number; y: number }, v: { x: number; y: number }) => u.x * v.y - u.y * v.x;
const vec = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: b.x - a.x, y: b.y - a.y });
const angleAt = (v: { x: number; y: number }, p: { x: number; y: number }, q: { x: number; y: number }) => {
  const a = vec(v, p), b = vec(v, q);
  return Math.acos((a.x * b.x + a.y * b.y) / Math.hypot(a.x, a.y) / Math.hypot(b.x, b.y)) * 180 / Math.PI;
};
/** p, a→b doğrusu üzerinde mi (uzaklık)? */
const lineDistance = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(cross(vec(a, b), vec(a, p))) / dist(a, b);
const segmentBetween = (objects: MathObject[], a: string, b: string) => byType(objects, 'segment').find(s => {
  const ids = [s.startPointId, s.endPointId];
  return ids.includes(point(objects, a).id) && ids.includes(point(objects, b).id);
});
const SEMBOL = /[|∠≈=°²³̂͡△⌢π]/u;
const checkMessage = (message: string) => {
  expect(message).not.toMatch(/undefined|NaN/);
  expect(metniSeslendir(message)).not.toMatch(SEMBOL);
};

// ------------------------------------------------------------------------------------------------ örneklerin tamamı

const EXAMPLE_SCENES: Record<string, () => MathObject[]> = {
  'Tales teoremi şekli çiz': S.empty,
  'Tales şekli çiz': S.empty,
  'Tales teoremi için şekil kur': S.empty,
  'kelebek Tales şekli çiz': S.empty,
  'üçgende Tales şekli çiz': S.tri,
  "ABC üçgeninde BC'ye paralel bir doğru çizerek Tales oranlarını göster": S.tri,
  'ABC üçgeninde 2:1 oranında Tales şekli kur': S.tri,
  'Tales oranlarını göster': S.tales,
  'Tales teoremini uygula': S.tales,
  'Tales teoremini doğrula': S.tales,
  'temel orantı teoremini göster': S.tales,
  'ABC üçgeninde Tales teoremini uygula': S.tales,
  'Tales bağıntılarını yaz': S.kelebek,
  'Tales çemberi çiz': S.empty,
  'AB çaplı Tales çemberi çiz': S.seg,
  'çapı gören çevre açının dik olduğunu göster': S.empty,
  'AB çapı üzerinde dik açı şekli çiz': S.seg,
  'Tales teoremi çember şekli': S.empty,
  'Tales çemberini üçgeniyle birlikte çiz': S.empty,
  'ABC üçgeninin orta tabanını çiz': S.tri,
  "BC'ye paralel orta tabanı çiz": S.tri,
  'BC kenarına ait orta tabanı çiz': S.tri,
  'üçgenin orta tabanlarını çiz': S.tri,
  'orta taban teoremini göster': S.tri,
  'ABCD yamuğunun orta tabanını çiz': S.yamuk,
  'yamukta orta tabanı çiz': S.yamuk,
};

describe('teoremler.tales: her örnek çalışır', () => {
  const examples = [...new Set(handlers.flatMap(h => h.examples))];
  it('her örneğin bir sahnesi var ve her işleyicinin en az 6 örneği var', () => {
    expect(examples.filter(e => !(e in EXAMPLE_SCENES))).toEqual([]);
    expect(handlers.every(h => h.examples.length >= 6)).toBe(true);
    expect(handlers.map(h => h.id)).toEqual(['teoremler.talesSekli', 'teoremler.talesOranlari', 'teoremler.talesCemberi', 'teoremler.ortaTaban']);
  });
  it.each(examples)('yalnız aile: %s', example => {
    const result = ok(example, EXAMPLE_SCENES[example]());
    expect(result.sceneChanged).toBe(true);
    expect(result.message.length).toBeGreaterThan(10);
    expect(result.selectedIds.length).toBeGreaterThan(0);
    checkMessage(result.message);
  });
  it.each(examples)('tüm motor: %s', example => {
    const objects = EXAMPLE_SCENES[example]();
    const s = new CommandScene(objects);
    const ranked = rankHandlers(parseClause(example, s.known()), s);
    expect(ranked[0]?.handler.id, `en yüksek puan bu aileden olmalı: ${ranked.slice(0, 3).map(r => `${r.handler.id}:${r.score}`).join(' ')}`).toMatch(/^teoremler\./);
    const result = runCommand(example, objects);
    if (!result.ok) throw new Error(`“${example}” tüm motorla başarısız: ${result.message}`);
    expect(result.sceneChanged).toBe(true);
    checkMessage(result.message);
  });
});

// ------------------------------------------------------------------------------------------------ Tales şekli

describe('teoremler.talesSekli', () => {
  it('yeni şekil: üçgen, oran noktası, paralel, kesişim ve [DE]', () => {
    const r = ok('Tales teoremi şekli çiz');
    const [A, B, C, D, E] = ['A', 'B', 'C', 'D', 'E'].map(l => point(r.objects, l));
    expect(byType(r.objects, 'polygon')).toHaveLength(1);
    expect(D.construction).toMatchObject({ kind: 'midpoint' });
    expect(E.construction).toMatchObject({ kind: 'intersection', index: 0 });
    expect(dist(A, D)).toBeCloseTo(2.5, 9);
    expect(dist(D, E)).toBeCloseTo(4, 9);
    expect(lineDistance(E, A, C)).toBeCloseTo(0, 9);
    expect(cross(vec(D, E), vec(B, C))).toBeCloseTo(0, 9);
    expect(dist(A, D) / dist(D, B)).toBeCloseTo(dist(A, E) / dist(E, C), 9);
    expect(r.message).toBe('Tales teoremi şekli çizildi: ABC üçgeninde DE paralel BC. |AD| / |DB| = |AE| / |EC| = 1 (2,5 / 2,5 ≈ 3,2 / 3,2) ve |AD| / |AB| = |DE| / |BC| = 0,5 (2,5 / 5 = 4 / 8). A, B ya da C köşesini sürüklediğinizde oranlar birlikte değişir.');
    const de = segmentBetween(r.objects, 'D', 'E') as SegmentObject;
    expect(de.showLength).toBe(true);
    const hidden = byType(r.objects, 'line').filter(l => !l.visible);
    expect(hidden).toHaveLength(1);
  });

  it('canlı: A taşınınca D ve E oranları korur, E AC üzerinde kalır', () => {
    const r = ok('Tales teoremi şekli çiz');
    const moved = move(r.objects, 'A', 1, 6);
    const [A, B, C, D, E] = ['A', 'B', 'C', 'D', 'E'].map(l => point(moved, l));
    expect(D.construction?.kind).toBe('midpoint');
    expect(E.construction?.kind).toBe('intersection');
    expect(dist(A, D)).toBeCloseTo(dist(D, B), 9);
    expect(lineDistance(E, A, C)).toBeCloseTo(0, 9);
    expect(cross(vec(D, E), vec(B, C))).toBeCloseTo(0, 9);
    expect(dist(A, D) / dist(A, B)).toBeCloseTo(dist(D, E) / dist(B, C), 9);
  });

  it('var olan üçgende BC paraleli: 2:1 oranı', () => {
    const r = ok('ABC üçgeninde 2:1 oranında Tales şekli kur', S.tri());
    const [A, B, C, D, E] = ['A', 'B', 'C', 'D', 'E'].map(l => point(r.objects, l));
    expect(byType(r.objects, 'polygon')).toHaveLength(1);
    expect(D.construction).toMatchObject({ kind: 'ratio', t: 2 / 3 });
    expect(dist(A, D) / dist(D, B)).toBeCloseTo(2, 9);
    expect(dist(A, E) / dist(E, C)).toBeCloseTo(2, 9);
    expect(r.message).toContain('|AD| / |DB| = |AE| / |EC| = 2');
    checkMessage(r.message);
  });

  it('|AD| = 2 verilince oran noktası ona göre, adı D', () => {
    const r = ok("ABC üçgeninde |AD| = 2 olacak şekilde BC'ye paralel çizerek Tales oranlarını göster", S.tri());
    const [A, B, D] = ['A', 'B', 'D'].map(l => point(r.objects, l));
    expect(dist(A, D)).toBeCloseTo(2, 9);
    expect(D.construction).toMatchObject({ kind: 'ratio', t: 0.4 });
    expect(lineDistance(D, A, B)).toBeCloseTo(0, 9);
    expect(r.message).toContain('|AD| / |AB| = |DE| / |BC| = 0,4 (2 / 5 = 3,2 / 8)');
  });

  it("yazılan kenar: AB'ye paralel", () => {
    const r = ok("ABC üçgeninde AB'ye paralel Tales şekli kur", S.tri());
    const [A, B, D, E] = ['A', 'B', 'D', 'E'].map(l => point(r.objects, l));
    expect(cross(vec(D, E), vec(A, B))).toBeCloseTo(0, 9);
    expect(r.message).toContain('DE paralel AB');
  });

  it('kelebek düzeni: B ve D, A ve C nin O merkezli homotetisi; AC paralel BD', () => {
    const r = ok('kelebek Tales şekli çiz');
    const [O, A, B, C, D] = ['O', 'A', 'B', 'C', 'D'].map(l => point(r.objects, l));
    expect(B.construction).toMatchObject({ kind: 'dilate', sourceId: A.id, centerId: O.id, factor: -0.5 });
    expect(D.construction).toMatchObject({ kind: 'dilate', sourceId: C.id, centerId: O.id, factor: -0.5 });
    expect(cross(vec(A, C), vec(B, D))).toBeCloseTo(0, 9);
    expect(dist(O, A) / dist(O, B)).toBeCloseTo(2, 9);
    expect(r.message).toBe('Kelebek Tales şekli çizildi: AC paralel BD, doğrular O noktasında kesişiyor. |OA| / |OB| = |OC| / |OD| = |AC| / |BD| = 2 (5 / 2,5 = 5 / 2,5 = 6 / 3). A, C ya da O noktasını sürüklediğinizde B ve D birlikte gider; oranlar korunur.');
    const moved = move(r.objects, 'A', -5, 2);
    const [o, a, b, c, d] = ['O', 'A', 'B', 'C', 'D'].map(l => point(moved, l));
    expect(b.construction?.kind).toBe('dilate');
    expect(cross(vec(a, c), vec(b, d))).toBeCloseTo(0, 9);
    expect(dist(o, a) / dist(o, b)).toBeCloseTo(dist(a, c) / dist(b, d), 9);
  });

  it('kelebekte oran: 3:2', () => {
    const r = ok('3:2 oranında kelebek Tales şekli çiz');
    const [O, A, B] = ['O', 'A', 'B'].map(l => point(r.objects, l));
    expect(dist(O, A) / dist(O, B)).toBeCloseTo(1.5, 9);
  });

  it('yabancı fiiller ve çember sözcükleri bu işleyiciye düşmez', () => {
    const s = new CommandScene(S.tales());
    const top = (text: string) => rankHandlers(parseClause(text, s.known()), s, handlers)[0]?.handler.id;
    expect(top('Tales şeklini sil')).toBeUndefined();
    expect(top('Tales şeklini yansıt')).toBeUndefined();
    expect(top('Tales oranlarını göster')).toBe('teoremler.talesOranlari');
    expect(top('Tales çemberi çiz')).toBe('teoremler.talesCemberi');
  });
});

// ------------------------------------------------------------------------------------------------ Tales oranları

describe('teoremler.talesOranlari', () => {
  it('kurulu şekilde oranları yazar, var olan D ve E noktalarını kullanır', () => {
    const scene = S.tales();
    const r = ok('Tales oranlarını göster', scene);
    expect(byType(r.objects, 'point')).toHaveLength(byType(scene, 'point').length);
    // [AD], [DB], [AE], [EC] uzunluklarıyla eklenir; [DE] zaten vardı.
    expect(byType(r.objects, 'segment')).toHaveLength(byType(scene, 'segment').length + 4);
    expect(r.message).toBe('Tales teoremi (ABC üçgeni): DE paralel BC. |AD| / |DB| = |AE| / |EC| = 1 (2,5 / 2,5 ≈ 3,2 / 3,2) ve |AD| / |AB| = |DE| / |BC| = 0,5 (2,5 / 5 = 4 / 8).');
  });

  it('elle çizilmiş paralelde kesişim noktalarını canlı oluşturur', () => {
    const scene = withPoints({ A: [3, 4], B: [0, 0], C: [8, 0], P: [0, 2], Q: [9, 2] }, (s, p) => {
      s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' });
      s.addLine(p.P.id, p.Q.id);
    });
    const r = ok('Tales teoremini uygula', scene);
    const created = byType(r.objects, 'point').filter(p => !scene.some(o => o.id === p.id));
    expect(created).toHaveLength(2);
    for (const p of created) expect(p.construction?.kind).toBe('intersection');
    const [A, B, C] = ['A', 'B', 'C'].map(l => point(r.objects, l));
    const D = created.find(p => lineDistance(p, A, B) < 1e-9)!, E = created.find(p => lineDistance(p, A, C) < 1e-9)!;
    expect(D).toBeDefined();
    expect(E).toBeDefined();
    expect(dist(A, D) / dist(D, B)).toBeCloseTo(dist(A, E) / dist(E, C), 9);
    const moved = move(r.objects, 'P', 0, 1);
    const d = byId<PointObject>(moved, D.id), e = byId<PointObject>(moved, E.id);
    const [p, q, a, b, c] = ['P', 'Q', 'A', 'B', 'C'].map(l => point(moved, l));
    expect(lineDistance(d, p, q)).toBeCloseTo(0, 9);
    expect(lineDistance(d, a, b)).toBeCloseTo(0, 9);
    expect(lineDistance(e, p, q)).toBeCloseTo(0, 9);
    expect(lineDistance(e, a, c)).toBeCloseTo(0, 9);
    expect(byType(r.objects, 'segment').filter(s => s.showLength)).toHaveLength(5);
    checkMessage(r.message);
  });

  it('paralel yoksa ipucuyla reddeder', () => {
    expect(bad('Tales oranlarını göster', S.tri())).toContain('Tales teoremi şekli çiz');
    expect(bad('Tales teoremini doğrula')).toContain('Tales teoremi şekli çiz');
  });

  it('kelebek şeklinde oranları yazar', () => {
    const r = ok('Tales bağıntılarını yaz', S.kelebek());
    expect(r.message).toBe('Kelebek Tales şekli: AC paralel BD. |OA| / |OB| = |OC| / |OD| = |AC| / |BD| = 2 (5 / 2,5 = 5 / 2,5 = 6 / 3).');
  });
});

// ------------------------------------------------------------------------------------------------ Tales çemberi

describe('teoremler.talesCemberi', () => {
  it('yeni çember: M orta nokta, C çember üzerinde, açı 90°', () => {
    const r = ok('Tales çemberi çiz');
    const [A, B, M, C] = ['A', 'B', 'M', 'C'].map(l => point(r.objects, l));
    expect(M.construction).toMatchObject({ kind: 'midpoint' });
    const circle = byType(r.objects, 'circle')[0] as CircleObject;
    expect(circle.centerPointId).toBe(M.id);
    expect(circle.radiusPointId).toBe(A.id);
    expect(C.onObjectId).toBe(circle.id);
    expect(dist(M, C)).toBeCloseTo(dist(M, A), 9);
    expect(angleAt(C, A, B)).toBeCloseTo(90, 6);
    const angle = byType(r.objects, 'angle')[0];
    expect([angle.point1Id, angle.vertexPointId, angle.point3Id]).toEqual([A.id, C.id, B.id]);
    expect(r.message).toBe('Tales çemberi: [AB] çap, C çember üzerinde; m(∠ACB) = 90°. C noktasını çember üzerinde sürükleseniz de açı 90° kalır.');
    // C çember üzerinde başka bir yere taşınır: açı 90° kalır, onObjectId korunur.
    const rad = dist(M, A), t = 200 * Math.PI / 180;
    const moved = move(r.objects, 'C', M.x + rad * Math.cos(t), M.y + rad * Math.sin(t));
    const c2 = point(moved, 'C');
    expect(c2.onObjectId).toBe(circle.id);
    expect(angleAt(c2, point(moved, 'A'), point(moved, 'B'))).toBeCloseTo(90, 6);
    // A sürüklenince M ve çember birlikte değişir.
    const moved2 = move(r.objects, 'A', -5, 1);
    expect(point(moved2, 'M').x).toBeCloseTo((point(moved2, 'A').x + point(moved2, 'B').x) / 2, 9);
  });

  it('sahnedeki A ve B çap uçları olur; üçgen istenince eklenir', () => {
    const r = ok('AB çaplı Tales çemberini üçgeniyle birlikte çiz', S.seg());
    const [A, B, M, C] = ['A', 'B', 'M', 'C'].map(l => point(r.objects, l));
    expect(M.x).toBeCloseTo(3, 9);
    expect(dist(M, C)).toBeCloseTo(3, 9);
    expect(angleAt(C, A, B)).toBeCloseTo(90, 6);
    expect(byType(r.objects, 'polygon')).toHaveLength(1);
    expect(segmentBetween(r.objects, 'A', 'B')).toBeDefined();
  });

  it('"PQ çaplı" yeni adlar verir', () => {
    const r = ok('PQ çaplı Tales çemberi çiz');
    expect(point(r.objects, 'P')).toBeDefined();
    expect(point(r.objects, 'Q')).toBeDefined();
  });
});

// ------------------------------------------------------------------------------------------------ orta taban

describe('teoremler.ortaTaban', () => {
  it('üçgende varsayılan taban BC: D ve E orta noktalar, |DE| = |BC| / 2', () => {
    const r = ok('ABC üçgeninin orta tabanını çiz', S.tri());
    const [A, B, C, D, E] = ['A', 'B', 'C', 'D', 'E'].map(l => point(r.objects, l));
    expect(D.construction).toMatchObject({ kind: 'midpoint', pointIds: [A.id, B.id] });
    expect(E.construction).toMatchObject({ kind: 'midpoint', pointIds: [A.id, C.id] });
    expect(dist(D, E)).toBeCloseTo(4, 9);
    expect(cross(vec(D, E), vec(B, C))).toBeCloseTo(0, 9);
    expect(r.message).toBe('DE orta tabanı çizildi: D, [AB] orta noktası; E, [AC] orta noktası. DE paralel BC ve |DE| = |BC| / 2 (4 = 8 / 2).');
    const moved = move(r.objects, 'C', 10, 2);
    const [d, e, b, c] = ['D', 'E', 'B', 'C'].map(l => point(moved, l));
    expect(d.construction?.kind).toBe('midpoint');
    expect(cross(vec(d, e), vec(b, c))).toBeCloseTo(0, 9);
    expect(dist(d, e)).toBeCloseTo(dist(b, c) / 2, 9);
  });

  it("yazılan kenar: AB'ye paralel orta taban", () => {
    const r = ok("AB'ye paralel orta tabanı çiz", S.tri());
    const [A, B, D, E] = ['A', 'B', 'D', 'E'].map(l => point(r.objects, l));
    expect(cross(vec(D, E), vec(A, B))).toBeCloseTo(0, 9);
    expect(dist(D, E)).toBeCloseTo(2.5, 9);
    expect(r.message).toContain('DE paralel AB');
  });

  it('üç orta taban: üç kenar orta noktası ve üç parça', () => {
    const r = ok('üçgenin orta tabanlarını çiz', S.tri());
    expect(byType(r.objects, 'point').filter(p => p.construction?.kind === 'midpoint')).toHaveLength(3);
    expect(byType(r.objects, 'segment')).toHaveLength(3);
    expect(r.message).toMatch(/^ABC üçgeninin orta tabanları çizildi: .* ve .*\.$/);
    checkMessage(r.message);
  });

  it('yamukta yan kenar orta noktaları, |EF| = (|AB| + |DC|) / 2', () => {
    const r = ok('ABCD yamuğunun orta tabanını çiz', S.yamuk());
    const [A, B, C, D, E, F] = ['A', 'B', 'C', 'D', 'E', 'F'].map(l => point(r.objects, l));
    expect(E.construction).toMatchObject({ kind: 'midpoint', pointIds: [B.id, C.id] });
    expect(F.construction).toMatchObject({ kind: 'midpoint', pointIds: [D.id, A.id] });
    expect(dist(E, F)).toBeCloseTo(5, 9);
    expect(cross(vec(E, F), vec(A, B))).toBeCloseTo(0, 9);
    expect(r.message).toBe('EF orta tabanı çizildi: E, [BC] orta noktası; F, [DA] orta noktası. EF paralel AB ve |EF| = (|AB| + |DC|) / 2 (5 = (6 + 4) / 2).');
  });

  it('yamuk olmayan dörtgeni ve yamuksuz sahneyi reddeder', () => {
    expect(bad('ABCD yamuğunun orta tabanını çiz', S.dortgen())).toContain('paralel kenarı yok');
    expect(bad('yamukta orta tabanı çiz')).toContain('tabanları 6 ve 4, yüksekliği 3 olan yamuk');
    expect(bad('orta taban teoremini göster')).toContain('üçgen');
  });

  it('silme isteği bu aileye düşmez', () => {
    const s = new CommandScene(S.tri());
    expect(rankHandlers(parseClause('orta tabanı sil', s.known()), s, handlers)).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------ doğrulayıcı regresyonları

describe('teoremler.tales: doğrulayıcı regresyonları', () => {
  /** İki üçgen: ABC ve KLM. */
  const twoTri = () => withPoints({ A: [3, 4], B: [0, 0], C: [8, 0], K: [12, 0], L: [16, 0], M: [14, 5] }, (s, p) => {
    s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' });
    s.addPolygon([p.K.id, p.L.id, p.M.id], { kind: 'triangle' });
  });
  /** Köşeleri aynı doğru üzerinde (dejenere) üçgen. */
  const flat = () => withPoints({ A: [0, 0], B: [2, 0], C: [5, 0] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); });
  const topAll = (text: string, objects: MathObject[]) => {
    const s = new CommandScene(objects);
    return rankHandlers(parseClause(text, s.known()), s)[0]?.handler.id;
  };

  it.each(['Tales teoremini kurar mısın', 'Tales teoremini yapar mısın', 'Tales şeklini kurun', 'Tales teoremi için bir şekil kuralım'])('kurma fiili çekimleri: %s', text => {
    expect(topAll(text, [])).toBe('teoremler.talesSekli');
    const r = ok(text);
    checkMessage(r.message);
  });

  it('dejenere üçgeni reddeder', () => {
    expect(bad('ABC üçgeninde Tales şekli kur', flat())).toContain('aynı doğru üzerinde');
  });

  it('E konumunda rastgele duran serbest nokta E olarak alınmaz (canlılık korunur)', () => {
    const scene = withPoints({ A: [3, 4], B: [0, 0], C: [8, 0], P: [5.5, 2] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); });
    const r = ok('ABC üçgeninde Tales şekli kur', scene);
    const E = point(r.objects, 'E');
    expect(E.construction?.kind).toBe('intersection');
    const moved = move(r.objects, 'A', 1, 6);
    const [a, c, e] = ['A', 'C', 'E'].map(l => point(moved, l));
    expect(lineDistance(e, a, c)).toBeCloseTo(0, 9);
    expect(point(moved, 'P').construction).toBeUndefined();
  });

  it('yazılan kenar birden fazla üçgen arasından kendi üçgenini seçer', () => {
    const r = ok("KL'ye paralel orta tabanı çiz", twoTri());
    expect(r.message).toContain('paralel KL');
    const r2 = ok("KL'ye paralel Tales şekli kur", twoTri());
    expect(r2.message).toContain('paralel KL');
    expect(bad('orta tabanı çiz', twoTri())).toContain('Birden fazla');
    expect(bad('Tales oranlarını göster', r2.objects)).toContain('Birden fazla');
    expect(ok('KLM üçgeninde Tales oranlarını göster', r2.objects).message).toContain('KLM');
  });

  it('|BD| = 2: kenar yazılmasa da tepe B olur', () => {
    const r = ok('ABC üçgeninde |BD| = 2 olacak şekilde Tales şekli kur', S.tri());
    const [B, D] = ['B', 'D'].map(l => point(r.objects, l));
    expect(dist(B, D)).toBeCloseTo(2, 9);
    expect(r.message).toContain('|BD| /');
    checkMessage(r.message);
  });

  it('ölçüm cümleleri ölçüm ailesine kalır, "dikme" inşa ailesine', () => {
    const circleScene = ok('Tales çemberi çiz').objects;
    const s = new CommandScene(circleScene);
    const own = (text: string) => rankHandlers(parseClause(text, s.known()), s, handlers)[0]?.handler.id;
    expect(own('Tales çemberinin alanını göster')).toBeUndefined();
    expect(topAll('Tales çemberinin alanını göster', circleScene)).toBe('measure.area');
    expect(own('AB çapı üzerinde dikme çiz')).toBeUndefined();
    expect(own('çapı gören çevre açının dik olduğunu göster')).toBe('teoremler.talesCemberi');
  });

  it('seçili üçgen kullanılır', () => {
    const objects = twoTri();
    const poly = byType(objects, 'polygon')[1];
    const r = ok('üçgende Tales şekli kur', objects, [poly.id]);
    expect(r.message).toContain('paralel KL');
  });
});
