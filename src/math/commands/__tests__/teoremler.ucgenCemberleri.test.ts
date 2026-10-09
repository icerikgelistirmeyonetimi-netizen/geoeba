import { describe, expect, it } from 'vitest';
import type { CircleObject, MathObject, PointObject } from '@/types/math';
import { commandCircleGeometry, resolveCommandBindings } from '@/math/commandBindings';
import { metniSeslendir } from '@/math/matematikYazimi';
import { handlers } from '../handlers/teoremler/ucgenCemberleri';
import { distanceToLine } from '../handlers/constructions/build';
import { rankHandlers, runCommand } from '../engine';
import { CommandScene } from '../scene';
import { parseClause } from '../text';
import { build, byType, dist, expectFail, expectOk, point } from './helpers';

const ok = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectOk(handlers, text, scene, selection);
const bad = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectFail(handlers, text, scene, selection);

type Pts = Record<string, [number, number]>;
const withPoints = (spec: Pts, extra?: (s: CommandScene, p: Record<string, PointObject>) => void) => build(s => {
  const p: Record<string, PointObject> = {};
  for (const [label, [x, y]] of Object.entries(spec)) p[label] = s.addPoint({ x, y }, { label });
  extra?.(s, p);
});
const triangle = (spec: Pts) => withPoints(spec, (s, p) => { s.addPolygon(Object.values(p).map(x => x.id), { kind: 'triangle' }); });

const S = {
  tri: () => triangle({ A: [0, 0], B: [6, 0], C: [2, 4] }),
  dik: () => triangle({ A: [0, 0], B: [4, 0], C: [0, 3] }),
  eskenar: () => triangle({ A: [0, 0], B: [4, 0], C: [2, 2 * Math.sqrt(3)] }),
  def: () => triangle({ D: [1, 1], E: [7, 2], F: [3, 6] }),
  noktalar: () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4] }),
  bos: () => [] as MathObject[],
};

const move = (objects: MathObject[], label: string, x: number, y: number) =>
  resolveCommandBindings(objects.map(o => o.type === 'point' && o.label === label ? { ...o, x, y } as MathObject : o));
const created = (before: MathObject[], after: MathObject[]) => after.filter(o => !before.some(b => b.id === o.id));
const circleGeometry = (objects: MathObject[], circle: CircleObject) => commandCircleGeometry(circle, id => point(objects, (objects.find(o => o.id === id) as PointObject).label));
const SEMBOL = /[|∠≈=°²³̂͡△⌢π]/u;
const topHandler = (text: string, objects: MathObject[]) => {
  const s = new CommandScene(objects);
  return rankHandlers(parseClause(text, s.known()), s)[0]?.handler.id ?? '';
};
const messages: string[] = [];
const full = (text: string, objects: MathObject[]) => {
  const result = runCommand(text, objects);
  if (!result.ok) throw new Error(`“${text}” tüm motorla başarısız: ${result.message}`);
  messages.push(result.message);
  return result;
};

/** Dış teğet çember merkezi ve yarıçapı (köşe i'ye ait). */
function excircleOf(pts: PointObject[], i: number) {
  const A = pts[i], B = pts[(i + 1) % 3], C = pts[(i + 2) % 3];
  const a = dist(B, C), b = dist(C, A), c = dist(A, B), u = (a + b + c) / 2;
  const area = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
  return { center: { x: (-a * A.x + b * B.x + c * C.x) / (-a + b + c), y: (-a * A.y + b * B.y + c * C.y) / (-a + b + c) }, radius: area / (u - a), A, B, C };
}
const triPoints = (objects: MathObject[], labels = 'ABC') => labels.split('').map(l => point(objects, l));

// ------------------------------------------------------------------------------------------------ örneklerin tamamı

const EXAMPLE_SCENES: Record<string, () => MathObject[]> = {
  'ABC üçgeninin dış teğet çemberini çiz': S.tri,
  'A köşesine ait dış teğet çemberi çiz': S.tri,
  'BC kenarına teğet dış teğet çember çiz': S.tri,
  'üçgenin üç dış teğet çemberini çiz': S.tri,
  'tüm dış teğet çemberleri çiz': S.tri,
  'dış teğet çemberin merkezini bul': S.tri,
  'C köşesinin dış teğet çemberi': S.tri,
  'ABC üçgeninin Euler doğrusunu çiz': S.tri,
  'Euler doğrusu': S.tri,
  'Euler doğrusunu çiz': S.tri,
  'Oyler doğrusu çiz': S.tri,
  'üçgenin Euler doğrusunu oluştur': S.tri,
  "DEF'in Euler doğrusunu çiz": S.def,
  'dokuz nokta çemberini çiz': S.tri,
  'ABC üçgeninin dokuz nokta çemberi': S.tri,
  'Euler çemberi çiz': S.tri,
  'Feuerbach çemberini çiz': S.tri,
  '9 nokta çemberini çiz': S.tri,
  'üçgenin dokuz nokta çemberini merkeziyle çiz': S.tri,
};

describe('üçgen çemberleri: örnekler', () => {
  it('her örneğin bir sahnesi var', () => {
    for (const h of handlers) {
      expect(h.examples.length).toBeGreaterThanOrEqual(6);
      for (const example of h.examples) expect(EXAMPLE_SCENES, `sahnesiz örnek: ${example}`).toHaveProperty(example);
    }
  });
  it.each(Object.entries(EXAMPLE_SCENES))('“%s” aile ve tüm motorla çalışır', (text, scene) => {
    const objects = scene();
    const own = ok(text, objects);
    expect(own.message).not.toMatch(/undefined|NaN/);
    full(text, objects);
    expect(topHandler(text, objects)).toMatch(/^teoremler\./);
  });
});

// ------------------------------------------------------------------------------------------------ dış teğet çember

describe('dış teğet çember', () => {
  it('A köşesine ait çemberin merkezi üç doğruya eşit uzaklıkta ve yarıçap Alan / (u − a)', () => {
    const before = S.tri();
    const after = ok('ABC üçgeninin dış teğet çemberini çiz', before).objects;
    const pts = triPoints(after);
    const { center, radius, A, B, C } = excircleOf(pts, 0);
    const circles = byType(created(before, after), 'circle');
    expect(circles).toHaveLength(1);
    expect(circles[0].label).toBe('ABC Dış Teğet Çemberi (A)');
    const I = point(after, 'I');
    expect(I.construction?.kind).toBe('intersection');
    expect(I.x).toBeCloseTo(center.x, 6);
    expect(I.y).toBeCloseTo(center.y, 6);
    for (const [p, q] of [[B, C], [A, B], [A, C]]) expect(distanceToLine(I, p, q)).toBeCloseTo(radius, 6);
    expect(circleGeometry(after, circles[0]).radius).toBeCloseTo(radius, 6);
    // Yardımcı ışınlar gizli, sahnede görünür ışın yok
    expect(byType(after, 'ray').every(r => !r.visible)).toBe(true);
  });

  it('köşe taşınınca çember teğet kalır (canlı)', () => {
    const after = ok('A köşesine ait dış teğet çemberi çiz', S.tri()).objects;
    const moved = move(after, 'A', -1, 2);
    const pts = triPoints(moved);
    const { radius, A, B, C } = excircleOf(pts, 0);
    const I = point(moved, 'I');
    expect(I.construction?.kind).toBe('intersection');
    for (const [p, q] of [[B, C], [A, B], [A, C]]) expect(distanceToLine(I, p, q)).toBeCloseTo(radius, 6);
    const circle = byType(moved, 'circle')[0];
    expect(circleGeometry(moved, circle).radius).toBeCloseTo(radius, 6);
    expect(dist(circleGeometry(moved, circle).center, I)).toBeCloseTo(0, 9);
  });

  it('kenar adı karşı köşeyi, köşe adı kendi çemberini seçer', () => {
    const bc = ok('BC kenarına teğet dış teğet çember çiz', S.tri()).objects;
    expect(byType(bc, 'circle')[0].label).toContain('(A)');
    const cc = ok('C köşesinin dış teğet çemberi', S.tri()).objects;
    expect(byType(cc, 'circle')[0].label).toContain('(C)');
    const pts = triPoints(cc);
    const { radius, A, B, C } = excircleOf(pts, 2);
    const I = point(cc, 'I');
    for (const [p, q] of [[A, B], [B, C], [C, A]]) expect(distanceToLine(I, p, q)).toBeCloseTo(radius, 6);
    // Çokgen yok, yalnız A, B, C noktaları: üçgen adıyla yazılır
    expect(byType(ok('ABC üçgeninin B köşesine ait dış teğet çemberi çiz', S.noktalar()).objects, 'circle')[0].label).toContain('(B)');
  });

  it('üç dış teğet çember ve yalnız merkez', () => {
    const before = S.tri();
    const all = ok('üçgenin üç dış teğet çemberini çiz', before).objects;
    const circles = byType(created(before, all), 'circle');
    expect(circles).toHaveLength(3);
    const pts = triPoints(all);
    circles.forEach((circle, i) => {
      const g = circleGeometry(all, circle);
      const expected = excircleOf(pts, i);
      expect(dist(g.center, expected.center)).toBeCloseTo(0, 6);
      expect(g.radius).toBeCloseTo(expected.radius, 6);
    });
    expect(byType(ok('tüm dış teğet çemberleri çiz', before).objects, 'circle')).toHaveLength(3);
    const only = ok('dış teğet çemberin merkezini bul', before);
    expect(byType(only.objects, 'circle')).toHaveLength(0);
    expect(dist(point(only.objects, 'I'), excircleOf(triPoints(only.objects), 0).center)).toBeCloseTo(0, 6);
    expect(only.message).toContain('merkezi bulundu');
  });

  it('aynı çember ikinci kez istenince kopya oluşmaz', () => {
    const once = ok('ABC üçgeninin dış teğet çemberini çiz', S.tri()).objects;
    const twice = ok('A köşesine ait dış teğet çemberi çiz', once);
    expect(created(once, twice.objects)).toHaveLength(0);
    expect(twice.message).toContain('zaten var');
  });

  it('artık inşa ailesi değil teoremler ailesi çizer (tüm motor)', () => {
    const result = full('üçgenin dış teğet çemberini çiz', S.tri());
    expect(byType(result.objects, 'circle')).toHaveLength(1);
    expect(topHandler('üçgenin dış teğet çemberini çiz', S.tri())).toBe('teoremler.disTegetCember');
    expect(topHandler('iki çemberin ortak dış teğetlerini çiz', S.tri())).not.toBe('teoremler.disTegetCember');
  });

  it('üçgen yoksa ve yabancı fiillerde açıklamayla reddeder', () => {
    expect(bad('dış teğet çemberini çiz', S.bos())).toContain('üçgen');
    expect(bad('D köşesine ait dış teğet çemberi çiz', S.tri())).toContain('D adlı köşe yok');
    // "merkezi K olan": merkez adı
    expect(point(ok('merkezi K olan A köşesine ait dış teğet çemberi çiz', S.tri()).objects, 'K').construction?.kind).toBe('intersection');
    for (const text of ['dış teğet çemberi sil', 'dış teğet çemberi gizle', 'dış teğet çemberi kırmızı yap', 'Euler doğrusunu sil', 'dokuz nokta çemberini yansıt']) {
      const s = new CommandScene(S.tri());
      expect(rankHandlers(parseClause(text, s.known()), s, handlers), text).toHaveLength(0);
    }
  });
});

// ------------------------------------------------------------------------------------------------ Euler doğrusu

describe('Euler doğrusu', () => {
  it('O, G, H aynı doğru üzerinde ve |OG| : |GH| = 1 : 2', () => {
    const before = S.tri();
    const result = ok('ABC üçgeninin Euler doğrusunu çiz', before);
    const after = result.objects;
    const O = point(after, 'O'), G = point(after, 'G'), H = point(after, 'H');
    expect(O.construction).toMatchObject({ kind: 'triangleCenter', center: 'circumcenter' });
    expect(G.construction).toMatchObject({ kind: 'triangleCenter', center: 'centroid' });
    expect(H.construction).toMatchObject({ kind: 'triangleCenter', center: 'orthocenter' });
    expect(distanceToLine(G, O, H)).toBeCloseTo(0, 9);
    expect(dist(G, H)).toBeCloseTo(2 * dist(O, G), 9);
    const lines = byType(created(before, after), 'line');
    expect(lines).toHaveLength(1);
    expect(lines[0].label).toBe('ABC Euler Doğrusu');
    expect(result.message).toContain('|OG| : |GH| = 1 : 2');
    const moved = move(after, 'C', 5, 5);
    const [O2, G2, H2] = ['O', 'G', 'H'].map(l => point(moved, l));
    expect(distanceToLine(G2, O2, H2)).toBeCloseTo(0, 9);
    expect(dist(G2, H2)).toBeCloseTo(2 * dist(O2, G2), 9);
  });

  it('eşkenar üçgende tanımsız, dik üçgende not verir', () => {
    expect(bad('Euler doğrusu', S.eskenar())).toContain('çakışır');
    const dik = ok('Euler doğrusunu çiz', S.dik());
    expect(dik.message).toContain('Dik üçgende');
    expect(dist(point(dik.objects, 'H'), point(dik.objects, 'A'))).toBeCloseTo(0, 9);
    expect(dist(point(dik.objects, 'O'), { x: 2, y: 1.5 })).toBeCloseTo(0, 9);
  });
});

// ------------------------------------------------------------------------------------------------ dokuz nokta çemberi

describe('dokuz nokta çemberi', () => {
  const ninePoints = (before: MathObject[], after: MathObject[]) => created(before, after)
    .filter((o): o is PointObject => o.type === 'point' && (o.construction?.kind === 'midpoint' || o.construction?.kind === 'foot'));

  it('dokuz nokta çember üzerinde ve r = R / 2', () => {
    const before = S.tri();
    const result = ok('dokuz nokta çemberini çiz', before);
    const after = result.objects;
    const circle = byType(created(before, after), 'circle')[0];
    expect(circle.throughPointIds).toHaveLength(3);
    const nine = ninePoints(before, after);
    expect(nine).toHaveLength(9);
    const g = circleGeometry(after, circle);
    for (const p of nine) expect(dist(p, g.center)).toBeCloseTo(g.radius, 6);
    const [A, B, C] = triPoints(after);
    const R = dist(A, B) * dist(B, C) * dist(C, A) / (4 * Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2);
    expect(g.radius).toBeCloseTo(R / 2, 6);
    expect(result.message).toContain(`r = R / 2 = `);
    // Canlı: köşe taşınınca dokuz nokta yine çember üzerinde
    const moved = move(after, 'B', 7, 1);
    const g2 = circleGeometry(moved, byType(moved, 'circle')[0]);
    for (const p of nine) expect(dist(point(moved, p.label), g2.center)).toBeCloseTo(g2.radius, 6);
    expect(ninePoints(before, moved)).toHaveLength(9);
  });

  it('merkez N, OH parçasının orta noktası ve çemberin merkezi', () => {
    const after = ok('üçgenin dokuz nokta çemberini merkeziyle çiz', S.tri()).objects;
    const N = point(after, 'N'), O = point(after, 'O'), H = point(after, 'H');
    expect(O.construction).toMatchObject({ kind: 'triangleCenter', center: 'circumcenter' });
    expect(H.construction).toMatchObject({ kind: 'triangleCenter', center: 'orthocenter' });
    expect(N.construction).toMatchObject({ kind: 'midpoint', pointIds: expect.arrayContaining([O.id, H.id]) });
    expect(dist(N, { x: (O.x + H.x) / 2, y: (O.y + H.y) / 2 })).toBeCloseTo(0, 9);
    expect(dist(N, circleGeometry(after, byType(after, 'circle')[0]).center)).toBeCloseTo(0, 6);
  });

  it('"dokuz nokta koy" bu ailenin işi değil; "Euler çemberi" dokuz nokta çemberidir', () => {
    expect(topHandler('dokuz nokta koy', S.tri())).not.toMatch(/^teoremler\./);
    expect(topHandler('9 nokta koy', S.tri())).not.toMatch(/^teoremler\./);
    expect(topHandler('Euler çemberi çiz', S.tri())).toBe('teoremler.dokuzNoktaCemberi');
    expect(topHandler('Euler doğrusu', S.tri())).toBe('teoremler.eulerDogrusu');
  });
});

// ------------------------------------------------------------------------------------------------ doğrulayıcı gerilemeleri

describe('doğrulayıcı gerilemeleri (düşman sınama)', () => {
  const withCircle = () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], K: [20, 20] }, (s, p) => {
    s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' });
    s.addCircle({ centerId: p.K.id, radius: 2 }, { label: 'c1' });
  });
  const two = () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], D: [10, 0], E: [16, 0], F: [12, 4] }, (s, p) => {
    s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' });
    s.addPolygon([p.D.id, p.E.id, p.F.id], { kind: 'triangle' });
  });

  it('"dış teğet çemberlerin merkezlerini bul" çember çizmez, üç merkezi bulur', () => {
    const before = S.tri();
    const result = ok('dış teğet çemberlerin merkezlerini bul', before);
    expect(byType(result.objects, 'circle')).toHaveLength(0);
    expect(result.message).toContain('merkezleri bulundu');
    const pts = triPoints(result.objects);
    const centres = created(before, result.objects).filter((o): o is PointObject => o.type === 'point' && o.construction?.kind === 'intersection');
    expect(centres).toHaveLength(3);
    centres.forEach((p, i) => expect(dist(p, excircleOf(pts, i).center)).toBeCloseTo(0, 6));
  });

  it('bir çembere teğet çember isteği bu ailenin işi değil; "iki dış teğet" belirsizliği reddedilir', () => {
    for (const text of ['c1 çemberine dış teğet çember çiz', 'c1 çemberine dış teğet olan bir çember çiz', 'dış teğet çemberine teğet doğru çiz']) {
      const s = new CommandScene(withCircle());
      expect(rankHandlers(parseClause(text, s.known()), s, handlers), text).toHaveLength(0);
    }
    expect(bad('iki dış teğet çemberini çiz', S.tri())).toContain('üç dış teğet çemberi');
    expect(byType(ok('üç dış teğet çemberini çiz', S.tri()).objects, 'circle')).toHaveLength(3);
  });

  it('çok dar üçgen açıklamayla reddedilir; büyük koordinatlar ve geniş açılı üçgen canlı kalır', () => {
    expect(bad('dış teğet çemberi çiz', triangle({ A: [0, 0], B: [10, 0], C: [5, 1e-7] }))).toContain('çok dar');
    const big = ok('dış teğet çemberi çiz', triangle({ A: [90000, 90000], B: [90006, 90000], C: [90002, 90004] }));
    expect(circleGeometry(big.objects, byType(big.objects, 'circle')[0]).radius).toBeCloseTo(excircleOf(triPoints(big.objects), 0).radius, 6);
    const all = ok('üçgenin üç dış teğet çemberini çiz', triangle({ A: [0, 0], B: [6, 0], C: [-3, 2] })).objects;
    const moved = move(all, 'C', 1, 5);
    const [A, B, C] = triPoints(moved);
    for (const circle of byType(moved, 'circle')) {
      const g = circleGeometry(moved, circle);
      for (const [p, q] of [[A, B], [B, C], [C, A]]) expect(distanceToLine(g.center, p, q)).toBeCloseTo(g.radius, 6);
    }
  });

  it('"Euler doğrusunu ve dokuz nokta çemberini çiz" iki işlemdir: doğru da çember de çizilir', () => {
    const result = full('ABC üçgeninin Euler doğrusunu ve dokuz nokta çemberini çiz', S.tri());
    expect(byType(result.objects, 'line').some(l => l.label === 'ABC Euler Doğrusu')).toBe(true);
    expect(byType(result.objects, 'circle').filter(x => x.label === 'ABC Dokuz Nokta Çemberi')).toHaveLength(1);
    expect(result.message).toContain('Euler doğrusu çizildi');
    expect(result.message).toContain('dokuz nokta çemberi çizildi');
    const ters = full('dokuz nokta çemberini ve Euler doğrusunu çiz', S.tri());
    expect(byType(ters.objects, 'line').some(l => l.label === 'ABC Euler Doğrusu')).toBe(true);
    expect(byType(ters.objects, 'circle').filter(x => x.label === 'ABC Dokuz Nokta Çemberi')).toHaveLength(1);
  });

  it('"dokuz noktadan geçen çember" dokuz nokta çemberi değildir', () => {
    expect(topHandler('dokuz noktadan geçen çember çiz', S.tri())).not.toMatch(/^teoremler\./);
    expect(topHandler('9 noktadan geçen çember çiz', S.tri())).not.toMatch(/^teoremler\./);
    expect(topHandler('dokuz noktalı çemberi çiz', S.tri())).toBe('teoremler.dokuzNoktaCemberi');
  });

  it('istenen merkez adı korunur; eşkenar üçgende merkez yine kurulur ve çakışma notlanır', () => {
    const named = ok('merkezi K olan dokuz nokta çemberini çiz', S.tri());
    const K = point(named.objects, 'K');
    expect(K.construction?.kind).toBe('midpoint');
    expect(dist(K, circleGeometry(named.objects, byType(named.objects, 'circle')[0]).center)).toBeCloseTo(0, 6);
    expect(named.message).toContain('Merkezi K(');
    const eq = ok('dokuz nokta çemberini merkeziyle çiz', S.eskenar());
    expect(byType(eq.objects, 'circle')).toHaveLength(1);
    expect(eq.message).toContain('çakışır');
    const N = point(eq.objects, 'N');
    expect(dist(N, point(eq.objects, 'O'))).toBeCloseTo(0, 9);
    // Köşe sürüklenince N ayrışır ve yine [OH] orta noktasıdır
    const moved = move(eq.objects, 'C', 1, 5);
    const [N2, O2, H2] = ['N', 'O', 'H'].map(l => point(moved, l));
    expect(dist(N2, { x: (O2.x + H2.x) / 2, y: (O2.y + H2.y) / 2 })).toBeCloseTo(0, 9);
    expect(dist(O2, H2)).toBeGreaterThan(0.1);
  });

  it('öğretmen yazımları: nezaket, küçük harf, ses tanıma, renk, seçim, birden fazla üçgen', () => {
    for (const text of ['ABC üçgeninin dış teğet çemberini çizer misin', 'lütfen A köşesine ait dış teğet çemberi çiz', 'abc üçgeninin dış teğet çemberini çiz', 'dış teget çember çiz', 'dışteğet çemberini çiz']) {
      expect(topHandler(text, S.tri()), text).toBe('teoremler.disTegetCember');
      expect(byType(full(text, S.tri()).objects, 'circle')).toHaveLength(1);
    }
    for (const text of ['Euler doğrusunu çizer misin', 'öyler doğrusu çiz', 'ABC nin Euler doğrusu', 'euler dogrusu']) expect(topHandler(text, S.tri()), text).toBe('teoremler.eulerDogrusu');
    for (const text of ['dokuz nokta çemberini çizer misin', 'Feuerbach çemberi', '9 nokta çemberi']) expect(topHandler(text, S.tri()), text).toBe('teoremler.dokuzNoktaCemberi');
    const red = full('kırmızı dış teğet çember çiz', S.tri());
    expect(byType(red.objects, 'circle')[0].color).not.toBe(byType(ok('dış teğet çember çiz', S.tri()).objects, 'circle')[0].color);
    // İki üçgen: belirsizlik reddedilir, seçimle ya da adla çözülür
    const twoObjs = two();
    expect(bad('dış teğet çemberini çiz', twoObjs)).toContain('Birden fazla üçgen');
    expect(bad('Euler doğrusunu çiz', twoObjs)).toContain('Birden fazla üçgen');
    expect(byType(ok('dış teğet çemberini çiz', twoObjs, [byType(twoObjs, 'polygon')[1].id]).objects, 'circle')[0].label).toContain('DEF');
    expect(byType(ok('ABC üçgeninin dokuz nokta çemberini çiz', twoObjs).objects, 'circle')[0].label).toBe('ABC Dokuz Nokta Çemberi');
    // Olumsuz ve düzenleme cümleleri bu aileye gelmez
    for (const text of ['dış teğet çember çizme', 'Euler doğrusu çizme', 'dokuz nokta çemberini çizme']) expect(runCommand(text, S.tri()).ok, text).toBe(false);
    expect(topHandler('dış teğet çemberi sil', S.tri())).toMatch(/^edit\./);
    expect(topHandler('Euler doğrusunu sil', S.tri())).toMatch(/^edit\./);
  });
});

// ------------------------------------------------------------------------------------------------ mesajlar

describe('mesajlar', () => {
  it('sembolsüz seslendirilir; undefined / NaN geçmez', () => {
    const texts = ['ABC üçgeninin dış teğet çemberini çiz', 'üçgenin üç dış teğet çemberini çiz', 'dış teğet çemberin merkezini bul', 'Euler doğrusunu çiz', 'dokuz nokta çemberini merkeziyle çiz'];
    const all = [...messages, ...texts.map(t => ok(t, S.tri()).message), ok('Euler doğrusunu çiz', S.dik()).message];
    expect(all.length).toBeGreaterThan(5);
    for (const m of all) {
      expect(m).not.toMatch(/undefined|NaN/);
      expect(m.trim().endsWith('.')).toBe(true);
      expect(metniSeslendir(m)).not.toMatch(SEMBOL);
    }
  });
});
