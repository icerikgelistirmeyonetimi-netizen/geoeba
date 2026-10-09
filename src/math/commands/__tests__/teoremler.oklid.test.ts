import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject, PolygonObject } from '@/types/math';
import { resolveCommandBindings } from '@/math/commandBindings';
import { metniSeslendir } from '@/math/matematikYazimi';
import { handlers } from '../handlers/teoremler/oklid';
import { rankHandlers, runCommand } from '../engine';
import { CommandScene } from '../scene';
import { parseClause } from '../text';
import { build, byType, dist, expectFail, expectOk, point } from './helpers';

/**
 * Öklid üçgeni / bağıntıları ve Pisagor şekli / bağıntısı: örneklerin tamamı, ölçü çözümlemesi, geometri,
 * canlılık (köşe taşınınca ayak ve kare köşeleri inşalarını korur) ve yanıt yazımı (sembolsüz okunuş).
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
  /** A'da dik: |AB| = 4, |AC| = 3, |BC| = 5 */
  dik: () => withPoints({ A: [0, 0], B: [4, 0], C: [0, 3] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); }),
  /** C'de dik (dik köşe ilk köşe değil): |CA| = 8, |CB| = 6, |AB| = 10 */
  dikC: () => withPoints({ A: [0, 8], B: [6, 0], C: [0, 0] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); }),
  /** Geniş açılı */
  genis: () => withPoints({ A: [0, 0], B: [6, 0], C: [-1, 2] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); }),
  /** Dar açılı (eşkenara yakın) */
  dar: () => withPoints({ A: [0, 0], B: [4, 0], C: [2, 3.6] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); }),
  bos: () => [] as MathObject[],
};

const SEMBOL = /[|∠≈=°²³̂͡△⌢π]/u;
const seslendirmeTemiz = (mesaj: string) => {
  expect(mesaj).not.toMatch(/undefined|NaN/);
  const sesli = metniSeslendir(mesaj);
  expect(sesli, `sesli okunuş: ${sesli}`).not.toMatch(SEMBOL);
};

const move = (objects: MathObject[], label: string, x: number, y: number) =>
  resolveCommandBindings(objects.map(o => o.type === 'point' && o.label === label ? { ...o, x, y } as MathObject : o));
const constructed = (objects: MathObject[], kind: string) => objects.filter((o): o is PointObject => o.type === 'point' && o.construction?.kind === kind);
const triangles = (objects: MathObject[]) => byType(objects, 'polygon').filter(p => p.pointIds.length === 3);
const squares = (objects: MathObject[]) => byType(objects, 'polygon').filter(p => p.pointIds.length === 4);
const dot = (u: { x: number; y: number }, v: { x: number; y: number }) => u.x * v.x + u.y * v.y;
const vec = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: b.x - a.x, y: b.y - a.y });
const cross = (u: { x: number; y: number }, v: { x: number; y: number }) => u.x * v.y - u.y * v.x;

/** Çizilen Öklid şeklinin parçaları: dik köşe A, hipotenüs [BC], ayak H. */
function oklidParcalari(objects: MathObject[], names: [string, string, string] = ['A', 'B', 'C']) {
  const [A, B, C] = names.map(n => point(objects, n));
  const H = constructed(objects, 'foot').find(h => h.construction?.kind === 'foot' && h.construction.sourceId === A.id)!;
  expect(H, 'yükseklik ayağı').toBeDefined();
  return { A, B, C, H };
}

function expectOklidGeometry(objects: MathObject[], names: [string, string, string] = ['A', 'B', 'C']) {
  const { A, B, C, H } = oklidParcalari(objects, names);
  // dik açı A'da (koordinatlar 9 basamağa yuvarlanır; 1e-6 yeter)
  expect(dot(vec(A, B), vec(A, C))).toBeCloseTo(0, 6);
  // ayak BC üzerinde ve AH ⟂ BC
  expect(cross(vec(B, C), vec(B, H))).toBeCloseTo(0, 6);
  expect(dot(vec(A, H), vec(B, C))).toBeCloseTo(0, 6);
  // bağıntılar
  const a = dist(B, C), b = dist(A, C), c = dist(A, B), h = dist(A, H), p = dist(B, H), k = dist(H, C);
  expect(h * h).toBeCloseTo(p * k, 6);
  expect(c * c).toBeCloseTo(p * a, 6);
  expect(b * b).toBeCloseTo(k * a, 6);
  expect(b * c).toBeCloseTo(a * h, 6);
  // yükseklik parçası ve iki dik açı işareti
  const seg = byType(objects, 'segment').find(s => new Set([s.startPointId, s.endPointId]).has(A.id) && new Set([s.startPointId, s.endPointId]).has(H.id));
  expect(seg, 'yükseklik parçası').toBeDefined();
  return { A, B, C, H, a, b, c, h, p, k };
}

// ------------------------------------------------------------------------------------------------ örneklerin tamamı

const EXAMPLE_SCENES: Record<string, () => MathObject[]> = {
  'Öklid üçgeni çiz': S.bos,
  'Öklid şekli çiz': S.bos,
  'Öklid teoremi için şekil kur': S.bos,
  'dik kenarları 6 ve 8 olan Öklid üçgeni çiz': S.bos,
  'hipotenüsü 10 olan Öklid üçgeni çiz': S.bos,
  'p = 4 ve k = 9 olan Öklid üçgeni çiz': S.bos,
  "yüksekliği 6 ve p'si 4 olan Öklid üçgeni": S.bos,
  'DEF Öklid üçgeni çiz': S.bos,
  'Öklit üçgeni çizer misin': S.bos,
  'ABC üçgeninde Öklid şeklini kur': S.dik,
  'Öklid bağıntılarını göster': S.dik,
  'Öklid bağıntılarını yaz': S.dikC,
  'ABC üçgeninde Öklid teoremini uygula': S.dik,
  'Öklid bağıntısı nedir': S.dik,
  'Öklid teoremini doğrula': S.dik,
  'Öklid bağıntılarını açıkla': S.dikC,
  'Pisagor şekli çiz': S.bos,
  'Pisagor teoremi şekli': S.bos,
  'Pisagor üçgeni çiz': S.bos,
  'dik kenarları 5 ve 12 olan Pisagor şekli çiz': S.bos,
  'kenarları üzerine kareler çizilmiş dik üçgen çiz': S.bos,
  'ABC üçgeninde Pisagor şeklini kur': S.dik,
  'Pisagor bağıntısını göster': S.dik,
  'Pisagor teoremini uygula': S.genis,
  'ABC üçgeninde Pisagor bağıntısını yaz': S.dik,
  'Pisagor teoremine göre hipotenüs kaç': S.dikC,
  "Pisagor'a göre ABC dik mi": S.dik,
  'Pisagor bağıntısını doğrula': S.dar,
};

describe('teoremler.oklid: her örnek çalışır', () => {
  const examples = [...new Set(handlers.flatMap(h => h.examples))];
  it('her örneğin sahnesi var; işleyici başına 6–20 örnek', () => {
    expect(examples.filter(e => !(e in EXAMPLE_SCENES))).toEqual([]);
    for (const h of handlers) {
      expect(h.examples.length, h.id).toBeGreaterThanOrEqual(6);
      expect(h.examples.length, h.id).toBeLessThanOrEqual(20);
      expect(h.id.startsWith('teoremler.')).toBe(true);
    }
  });
  it.each(examples)('yalnız aile: %s', example => {
    const result = ok(example, EXAMPLE_SCENES[example]());
    expect(result.message.length).toBeGreaterThan(10);
    expect(result.selectedIds.length).toBeGreaterThan(0);
    seslendirmeTemiz(result.message);
  });
  it.each(examples)('tüm motor (en yüksek puan bu ailede): %s', example => {
    const objects = EXAMPLE_SCENES[example]();
    const s = new CommandScene(objects);
    const ranked = rankHandlers(parseClause(example, s.known()), s);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].handler.id, `${example}: ${ranked.slice(0, 3).map(r => `${r.handler.id}=${r.score}`).join(', ')}`).toMatch(/^teoremler\./);
    const result = runCommand(example, objects);
    if (!result.ok) throw new Error(`“${example}” motorda başarısız: ${result.message}`);
    seslendirmeTemiz(result.message);
  });
});

// ------------------------------------------------------------------------------------------------ Öklid üçgeni

describe('teoremler.oklidUcgeni', () => {
  it('varsayılan ölçülerle (3-4-5) Öklid üçgeni kurar', () => {
    const r = ok('Öklid üçgeni çiz');
    const g = expectOklidGeometry(r.objects);
    expect(g.c).toBeCloseTo(3, 9);
    expect(g.b).toBeCloseTo(4, 9);
    expect(g.a).toBeCloseTo(5, 9);
    expect(g.h).toBeCloseTo(2.4, 9);
    expect(g.p).toBeCloseTo(1.8, 9);
    expect(g.k).toBeCloseTo(3.2, 9);
    // hipotenüs yatay altta, A üstte
    expect(g.B.y).toBeCloseTo(g.C.y, 9);
    expect(g.A.y).toBeGreaterThan(g.B.y);
    expect(g.H.label).toBe('H');
    expect(triangles(r.objects)).toHaveLength(1);
    expect(byType(r.objects, 'angle')).toHaveLength(2);
    expect(r.message).toContain('ABC Öklid üçgeni çizildi');
    expect(r.message).toContain('|BC| = 5 br');
    expect(r.message).toContain('|AH| = 2,4 br');
    expect(r.message).toContain('|AH|² = |BH| × |HC| (5,76 = 1,8 × 3,2)');
    expect(r.message).toContain('|AB|² = |BH| × |BC| (9 = 1,8 × 5)');
    expect(r.message).toContain('|AC|² = |HC| × |BC| (16 = 3,2 × 5)');
    expect(r.selectedIds).toContain(triangles(r.objects)[0].id);
  });

  it.each<[string, Partial<Record<'a' | 'b' | 'c' | 'p' | 'k' | 'h', number>>]>([
    ['dik kenarları 6 ve 8 olan Öklid üçgeni çiz', { c: 6, b: 8, a: 10, h: 4.8 }],
    ['hipotenüsü 10 olan Öklid üçgeni çiz', { a: 10, c: 6, b: 8 }],
    ['hipotenüsü 13 ve bir dik kenarı 5 olan Öklid üçgeni çiz', { a: 13, c: 5, b: 12 }],
    ['p = 4 ve k = 9 olan Öklid üçgeni çiz', { p: 4, k: 9, a: 13, h: 6 }],
    ["yüksekliği 6 ve p'si 4 olan Öklid üçgeni", { h: 6, p: 4, k: 9 }],
    ["p'si 4 ve k'si 9 olan Öklid üçgeni çiz", { p: 4, k: 9 }],
    ['h = 6 ve k = 9 olan Öklid üçgeni çiz', { h: 6, k: 9, p: 4 }],
    ['hipotenüsü 10 ve p = 3,6 olan Öklid üçgeni çiz', { a: 10, p: 3.6, k: 6.4, h: 4.8 }],
    ['hipotenüsü 10 ve yüksekliği 4,8 olan Öklid üçgeni çiz', { a: 10, h: 4.8, p: 3.6 }],
    ['6 8 Öklid üçgeni', { c: 6, b: 8, a: 10 }],
    ['3 4 5 Öklid üçgeni çiz', { c: 3, b: 4, a: 5 }],
    ['yüksekliği 12 olan Öklid üçgeni çiz', { h: 12, p: 9, k: 16 }],
  ])('ölçü: %s', (text, beklenen) => {
    const r = ok(text);
    const g = expectOklidGeometry(r.objects);
    for (const [key, value] of Object.entries(beklenen)) expect(g[key as keyof typeof beklenen], key).toBeCloseTo(value!, 6);
    seslendirmeTemiz(r.message);
  });

  it('hipotenüs tek başına verilince 3:4 oranını not eder', () => {
    expect(ok('hipotenüsü 10 olan Öklid üçgeni çiz').message).toContain('3:4');
  });

  it('köşe adları istenirse ilk ad dik köşedir', () => {
    const r = ok('DEF Öklid üçgeni çiz');
    const g = expectOklidGeometry(r.objects, ['D', 'E', 'F']);
    expect(g.H.label).toBe('H');
    expect(r.message).toContain('DEF Öklid üçgeni çizildi');
    expect(r.message).toContain('m(∠EDF) = 90°');
  });

  it('ayak adı istenebilir', () => {
    const r = ok('ayağı K olan Öklid üçgeni çiz');
    expect(oklidParcalari(r.objects).H.label).toBe('K');
    expectOklidGeometry(r.objects);
  });

  it('sahnede başka şekil varken yeni şekli boş alana kurar, var olan üçgeni kullanmaz', () => {
    const before = S.dik();
    const r = ok('Öklid üçgeni çiz', before);
    expect(triangles(r.objects)).toHaveLength(2);
    const yeni = triangles(r.objects).find(t => !before.some(o => o.id === t.id))!;
    const names = yeni.pointIds.map(id => (r.objects.find(o => o.id === id) as PointObject).label);
    expect(names).toEqual(['D', 'E', 'F']);
    expectOklidGeometry(r.objects, ['D', 'E', 'F']);
  });

  it('var olan dik üçgende yalnız yükseklik ekler (dik köşe ilk köşe olmasa da)', () => {
    const r = ok('ABC üçgeninde Öklid şeklini kur', S.dikC());
    expect(triangles(r.objects)).toHaveLength(1);
    const g = expectOklidGeometry(r.objects, ['C', 'A', 'B']);
    expect(g.a).toBeCloseTo(10, 9);
    expect(g.h).toBeCloseTo(4.8, 9);
    expect(r.message).toContain('ABC üçgeninde Öklid şekli kuruldu');
    expect(r.message).toContain('m(∠ACB) = 90°');
    seslendirmeTemiz(r.message);
  });

  it('var olan üçgen dik değilse açıklamayla reddeder', () => {
    const m = bad('ABC üçgeninde Öklid şeklini kur', S.genis());
    expect(m).toContain('dik açı yok');
    expect(m).toContain('Öklid üçgeni çiz');
    expect(m).toMatch(/m\(∠/);
    seslendirmeTemiz(m);
  });

  it('var olan üçgene ölçü verilince reddeder', () => {
    expect(bad('ABC üçgeninde dik kenarları 6 ve 8 olan Öklid şeklini kur', S.dik())).toContain('zaten çizili');
  });

  it.each([
    ['dik kenarları 0 ve 8 olan Öklid üçgeni çiz', /sıfırdan büyük/],
    ['dik kenarları -6 ve 8 olan Öklid üçgeni çiz', /sıfırdan büyük/],
    ['hipotenüsü 5 ve bir dik kenarı 7 olan Öklid üçgeni çiz', /uzun olmalı/],
    ['dik kenarları 6 ve 8, hipotenüsü 11 olan Öklid üçgeni çiz', /tutarsız/],
    ['hipotenüsü 10 ve yüksekliği 6 olan Öklid üçgeni çiz', /yarısını geçemez/],
    ['p = 4 olan Öklid üçgeni çiz', /tek başına yetmez/],
    ['dik kenarı 6 olan Öklid üçgeni çiz', /Tek dik kenar yetmez/],
    ['1 2 3 4 Öklid üçgeni çiz', /hangi kenara/],
  ])('reddeder: %s', (text, re) => {
    const m = bad(text);
    expect(m).toMatch(re);
    expect(m).toContain('Öklid üçgeni çiz');
    seslendirmeTemiz(m);
  });

  it('canlıdır: köşe taşınınca ayak hipotenüs üzerinde ve dik kalır', () => {
    const r = ok('Öklid üçgeni çiz');
    const { A, B, C, H } = oklidParcalari(r.objects);
    const moved = move(r.objects, B.label, B.x - 2, B.y - 1);
    const H2 = moved.find(o => o.id === H.id) as PointObject, B2 = moved.find(o => o.id === B.id) as PointObject;
    const A2 = moved.find(o => o.id === A.id) as PointObject, C2 = moved.find(o => o.id === C.id) as PointObject;
    expect(H2.construction).toEqual({ kind: 'foot', sourceId: A.id, linePointIds: [B.id, C.id] });
    expect(cross(vec(B2, C2), vec(B2, H2))).toBeCloseTo(0, 9);
    expect(dot(vec(A2, H2), vec(B2, C2))).toBeCloseTo(0, 9);
    expect(dist(H2, H)).toBeGreaterThan(1e-6);
  });

  it('renk uygulanır', () => {
    const r = ok('kırmızı Öklid üçgeni çiz');
    expect(triangles(r.objects)[0].color).toBe('#ef4444');
  });
});

// ------------------------------------------------------------------------------------------------ Öklid bağıntıları

describe('teoremler.oklidBagintilari', () => {
  it('dik üçgende yükseklik kurar ve bağıntıları sayılarla yazar', () => {
    const r = ok('Öklid bağıntılarını göster', S.dik());
    const g = expectOklidGeometry(r.objects, ['A', 'B', 'C']);
    expect(g.a).toBeCloseTo(5, 9);
    expect(r.message).toContain('ABC üçgeninde Öklid bağıntıları');
    expect(r.message).toContain('|AH|² = |BH| × |HC| (5,76 = 3,2 × 1,8)');
    expect(r.message).toContain('|AB| × |AC| = |BC| × |AH| (12 = 12)');
    expect(r.sceneChanged).toBe(true);
    seslendirmeTemiz(r.message);
  });

  it('yükseklik zaten varsa yeniden kullanır', () => {
    const first = ok('Öklid üçgeni çiz');
    const r = ok('Öklid bağıntılarını göster', first.objects);
    expect(constructed(r.objects, 'foot')).toHaveLength(1);
    expect(byType(r.objects, 'segment')).toHaveLength(byType(first.objects, 'segment').length);
  });

  it('dik olmayan üçgende açılarıyla reddeder', () => {
    const m = bad('Öklid teoremini doğrula', S.genis());
    expect(m).toContain('Öklid bağıntıları dik üçgende geçerlidir');
    expect(m).toContain('ABC üçgeninde dik açı yok');
    expect(m).toContain('“Öklid üçgeni çiz”');
    seslendirmeTemiz(m);
  });

  it('sahnede üçgen yoksa ipucu verir', () => {
    const m = bad('Öklid bağıntılarını göster');
    expect(m).toContain('“Öklid üçgeni çiz”');
    expect(m).toContain('h² = p × k');
    seslendirmeTemiz(m);
  });

  it('adla gösterilen üçgeni kullanır', () => {
    const scene = withPoints({ A: [0, 0], B: [4, 0], C: [0, 3], K: [10, 0], L: [16, 0], M: [11, 2] }, (s, p) => {
      s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' });
      s.addPolygon([p.K.id, p.L.id, p.M.id], { kind: 'triangle' });
    });
    expect(ok('ABC üçgeninde Öklid teoremini uygula', scene).message).toContain('ABC üçgeninde');
    expect(bad('KLM üçgeninde Öklid teoremini uygula', scene)).toContain('KLM üçgeninde dik açı yok');
    expect(bad('Öklid bağıntılarını göster', scene)).toContain('Birden fazla');
  });
});

// ------------------------------------------------------------------------------------------------ Pisagor şekli

function expectPisagorGeometry(objects: MathObject[], names: [string, string, string] = ['A', 'B', 'C']) {
  const [A, B, C] = names.map(n => point(objects, n));
  expect(dot(vec(A, B), vec(A, C))).toBeCloseTo(0, 9);
  const kareler = squares(objects);
  expect(kareler).toHaveLength(3);
  const sides: [PointObject, PointObject, PointObject][] = [[A, B, C], [B, C, A], [C, A, B]];
  for (const [P, Q, R] of sides) {
    const kare = kareler.find(k => k.pointIds[0] === P.id && k.pointIds[1] === Q.id)!;
    expect(kare, `${P.label}${Q.label} karesi`).toBeDefined();
    expect(kare.label).toBe(`${P.label}${Q.label} Karesi`);
    expect(kare.showArea).toBe(true);
    const corners = kare.pointIds.map(id => objects.find(o => o.id === id) as PointObject);
    // dört kenar eşit, köşeler dik
    const side = dist(P, Q);
    for (let i = 0; i < 4; i++) {
      expect(dist(corners[i], corners[(i + 1) % 4])).toBeCloseTo(side, 9);
      expect(dot(vec(corners[i], corners[(i + 1) % 4]), vec(corners[i], corners[(i + 3) % 4]))).toBeCloseTo(0, 9);
    }
    // dışa doğru: uzak köşeler R'nin ters tarafında
    const sideSign = Math.sign(cross(vec(P, Q), vec(P, R)));
    for (const far of corners.slice(2)) {
      expect(Math.sign(cross(vec(P, Q), vec(P, far)))).toBe(-sideSign);
      expect(far.showLabel).toBe(false);
      expect(far.construction?.kind).toBe('rotate');
    }
  }
  return { A, B, C, kareler };
}

describe('teoremler.pisagorSekli', () => {
  it('3-4-5 dik üçgen ve kenarlarına dışa doğru canlı kareler kurar', () => {
    const r = ok('Pisagor şekli çiz');
    const { A, B, C } = expectPisagorGeometry(r.objects);
    expect(dist(A, B)).toBeCloseTo(3, 9);
    expect(dist(A, C)).toBeCloseTo(4, 9);
    expect(dist(B, C)).toBeCloseTo(5, 9);
    expect(r.message).toContain('ABC dik üçgeni ve kenarları üzerine kareler çizildi.');
    expect(r.message).toContain('|AB|² + |AC|² = |BC|²: 9 + 16 = 25 (karelerin alanları 9, 16 ve 25 br²)');
    expect(r.selectedIds).toHaveLength(4);
    seslendirmeTemiz(r.message);
  });

  it('ölçülü: dik kenarları 5 ve 12', () => {
    const r = ok('dik kenarları 5 ve 12 olan Pisagor şekli çiz');
    const { B, C } = expectPisagorGeometry(r.objects);
    expect(dist(B, C)).toBeCloseTo(13, 9);
    expect(r.message).toContain('25 + 144 = 169');
  });

  it('var olan dik üçgenin kenarlarına kareler çizer', () => {
    const r = ok('ABC üçgeninde Pisagor şeklini kur', S.dikC());
    expect(triangles(r.objects)).toHaveLength(1);
    expectPisagorGeometry(r.objects, ['C', 'A', 'B']);
    expect(r.message).toContain('ABC dik üçgeninin kenarları üzerine kareler çizildi');
    expect(r.message).toContain('|CA|² + |CB|² = |AB|²: 64 + 36 = 100');
    seslendirmeTemiz(r.message);
  });

  it('dik olmayan üçgende reddeder', () => {
    const m = bad('ABC üçgeninde Pisagor şeklini kur', S.genis());
    expect(m).toContain('Pisagor şekli dik üçgende kurulur');
    seslendirmeTemiz(m);
  });

  it('canlıdır: köşe taşınınca kareler kare kalır', () => {
    const r = ok('Pisagor şekli çiz');
    const B = point(r.objects, 'B');
    const moved = move(r.objects, 'B', B.x + 1, B.y + 2);
    const names: [string, string, string] = ['A', 'B', 'C'];
    const [A2, B2, C2] = names.map(n => point(moved, n));
    for (const kare of squares(moved)) {
      const corners = kare.pointIds.map(id => moved.find(o => o.id === id) as PointObject);
      const side = dist(corners[0], corners[1]);
      for (let i = 0; i < 4; i++) {
        expect(dist(corners[i], corners[(i + 1) % 4])).toBeCloseTo(side, 9);
        expect(dot(vec(corners[i], corners[(i + 1) % 4]), vec(corners[i], corners[(i + 3) % 4]))).toBeCloseTo(0, 9);
      }
      expect(corners.slice(2).every(p => p.construction?.kind === 'rotate')).toBe(true);
    }
    expect(dist(A2, B2)).toBeCloseTo(Math.hypot(4, 2), 9);
    expect(C2).toBeDefined();
  });
});

// ------------------------------------------------------------------------------------------------ Pisagor bağıntısı

describe('teoremler.pisagorBagintisi', () => {
  it('dik üçgende bağıntıyı yazar, sahneyi değiştirmez', () => {
    const scene = S.dik();
    const r = ok('Pisagor bağıntısını göster', scene);
    expect(r.sceneChanged).toBe(false);
    expect(r.message).toContain('ABC üçgeninde Pisagor bağıntısı sağlanır: |AB|² + |AC|² = 16 + 9 = 25, |BC|² = 25; üçgen diktir (m(∠BAC) = 90°). Hipotenüs |BC| = 5 br.');
    expect(r.selectedIds).toEqual([triangles(scene)[0].id]);
    seslendirmeTemiz(r.message);
  });

  it('dik köşe ilk köşe değilse de doğru kenarları seçer', () => {
    const r = ok('Pisagor teoremine göre hipotenüs kaç', S.dikC());
    expect(r.message).toContain('|CA|² + |CB|² = 64 + 36 = 100, |AB|² = 100');
    expect(r.message).toContain('Hipotenüs |AB| = 10 br');
  });

  it('geniş açılı üçgende eşitsizliği açıklar', () => {
    const r = ok('Pisagor teoremini uygula', S.genis());
    expect(r.sceneChanged).toBe(false);
    expect(r.message).toContain('eşit değil');
    expect(r.message).toContain('geniş açılıdır');
    expect(r.message).toContain('|AB|² + |AC|² = 36 + 5 = 41, |BC|² = 53');
    seslendirmeTemiz(r.message);
  });

  it('dar açılı üçgende eşitsizliği açıklar', () => {
    const r = ok('Pisagor bağıntısını doğrula', S.dar());
    expect(r.message).toContain('dar açılıdır');
    seslendirmeTemiz(r.message);
  });

  it('"dik mi" sorusuna evet / hayır ile başlar', () => {
    expect(ok("Pisagor'a göre ABC dik mi", S.dik()).message).toMatch(/^Evet, /);
    expect(ok("Pisagor'a göre ABC dik mi", S.genis()).message).toMatch(/^Hayır, /);
  });

  it('sahnede üçgen yoksa ipucu verir', () => {
    const m = bad('Pisagor bağıntısını göster');
    expect(m).toContain('“Pisagor şekli çiz”');
    seslendirmeTemiz(m);
  });
});

// ------------------------------------------------------------------------------------------------ yabancı fiiller

describe('teoremler.oklid: başka ailelerin cümleleri', () => {
  it.each([
    'Öklid üçgenini sil',
    'Öklid üçgenini yansıt',
    'Öklid üçgenini kırmızı yap',
    'Pisagor şeklini gizle',
    'Öklid üçgenini x eksenine göre yansıt',
    'Pisagor şeklini 2 birim sağa taşı',
    'Öklid üçgeninin alanını hesapla',
  ])('eşleşmez: %s', text => {
    const s = new CommandScene(S.dik());
    const c = parseClause(text, s.known());
    for (const h of handlers) expect(h.match(c, s), h.id).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------------ motor yanıtları

describe('teoremler.oklid: motor mesajları sembolsüz okunur', () => {
  const kur = (text: string, scene: MathObject[]) => {
    const r = runCommand(text, scene);
    if (!r.ok) throw new Error(`“${text}” başarısız: ${r.message}`);
    return r;
  };
  it('zincir: Öklid üçgeni çiz → bağıntıları göster → Pisagor bağıntısını yaz', () => {
    const a = kur('Öklid üçgeni çiz', []);
    const b = kur('Öklid bağıntılarını göster', a.objects);
    const c = kur('Pisagor bağıntısını yaz', b.objects);
    for (const r of [a, b, c]) seslendirmeTemiz(r.message);
    expect(c.sceneChanged).toBe(false);
    expect(c.message).toContain('üçgen diktir');
  });
  it('çok işlemli cümle', () => {
    const r = kur('dik kenarları 6 ve 8 olan Öklid üçgeni çiz ve Pisagor bağıntısını göster', []);
    expect(r.message).toContain('Öklid üçgeni çizildi');
    expect(r.message).toContain('36 + 64 = 100');
    seslendirmeTemiz(r.message);
  });
  it('tümüyle büyük harfle yazılsa da çalışır', () => {
    const r = kur('ÖKLİD ÜÇGENİ ÇİZ', []);
    expect(r.message).toContain('Öklid üçgeni çizildi');
  });
  it('yardım paneli listesinde (COMMAND_CATALOG) teoremler ailesi var', async () => {
    const { COMMAND_CATALOG } = await import('../handlers');
    const family = COMMAND_CATALOG.find(g => g.id === 'teoremler');
    expect(family?.examples).toContain('Öklid üçgeni çiz');
    for (const h of handlers) for (const e of h.examples) expect(family?.examples).toContain(e);
  });
  it('kareler kare rengindedir ve alanları gösterir', () => {
    const r = ok('Pisagor şekli çiz');
    const kare: PolygonObject = squares(r.objects)[0];
    expect(kare.color).toBe('#f43f5e');
    expect(kare.showArea).toBe(true);
    expect(kare.showPerimeter).toBe(false);
  });
});

// ------------------------------------------------------------------------------------------------ doğrulama turunda bulunan hatalar

const topHandler = (text: string, objects: MathObject[]) => {
  const s = new CommandScene(objects);
  const ranked = rankHandlers(parseClause(text, s.known()), s);
  return ranked[0]?.handler.id ?? '';
};

describe('teoremler.oklid: aile çakışmaları (doğrulama)', () => {
  it.each([
    ['Öklid üçgeninin alanı kaç', 'measure.area'],
    ['Öklid üçgeninin çevresi kaç', 'measure.area'],
    ['Pisagor şeklinin alanı kaç', 'measure.area'],
  ])('ölçüm sorusu bu ailenin değil: %s', (text, beklenen) => {
    const objects = S.dik();
    const s = new CommandScene(objects);
    const c = parseClause(text, s.known());
    for (const h of handlers) expect(h.match(c, s), h.id).toBe(0);
    expect(topHandler(text, objects)).toBe(beklenen);
  });

  it.each([
    'dik kenar uzunlukları 6 ve 8 olan Öklid üçgeni',
    'hipotenüs uzunluğu 10 olan Öklid üçgeni çiz',
    '|AB| uzunluğu 6 ve |AC| uzunluğu 8 olan Öklid üçgeni çiz',
  ])('ölçü parametresindeki "uzunluk" sözcüğü şekil isteğini bozmaz: %s', text => {
    expect(topHandler(text, [])).toBe('teoremler.oklidUcgeni');
    const g = expectOklidGeometry(ok(text).objects);
    expect(g.a).toBeCloseTo(10, 6);
  });

  it('soru işareti çizim isteğini bağıntı isteğine çevirmez', () => {
    expect(topHandler('öklid üçgeni çizer misin?', [])).toBe('teoremler.oklidUcgeni');
    expect(topHandler('Öklid üçgeninde BH kaç', S.dik())).toBe('teoremler.oklidBagintilari');
  });
});

describe('teoremler.oklid: ölçü okuma (doğrulama)', () => {
  it.each<[string, Partial<Record<'a' | 'b' | 'c' | 'p' | 'k' | 'h', number>>]>([
    ['iki dik kenarı 6 ve 8 olan Öklid üçgeni çiz', { c: 6, b: 8, a: 10 }],
    ['üç kenarı 3, 4 ve 5 olan Öklid üçgeni çiz', { c: 3, b: 4, a: 5 }],
    ['dik kenarları 6 cm ve 8 cm olan Öklid üçgeni çiz', { c: 6, b: 8 }],
    ['dik kenarları 6 br ve 8 br olan Öklid üçgeni çiz', { c: 6, b: 8 }],
    ['yükseklik 6 olan Öklid üçgeni', { h: 6, p: 4.5, k: 8 }],
    ['1 tane Öklid üçgeni çiz', { c: 3, b: 4 }],
    ['BH = 4 ve HC = 9 olan Öklid üçgeni çiz', { p: 4, k: 9, h: 6, a: 13 }],
    ['|BH| = 4 ve |HC| = 9 olan Öklid üçgeni çiz', { p: 4, k: 9, h: 6 }],
    ['|HB| = 4 ve |CH| = 9 olan Öklid üçgeni çiz', { p: 4, k: 9 }],
    ['|AB| = 6 ve |AC| = 8 olan Öklid üçgeni çiz', { c: 6, b: 8, a: 10 }],
    ['|BC| = 10 ve |AB| = 6 olan Öklid üçgeni çiz', { a: 10, c: 6, b: 8 }],
    ['|AH| = 6 ve |BH| = 4 olan Öklid üçgeni çiz', { h: 6, p: 4, k: 9 }],
    ['hipotenüsü 10 yüksekliği 5 olan Öklid üçgeni çiz', { a: 10, h: 5, p: 5, k: 5 }],
  ])('ölçü: %s', (text, beklenen) => {
    const r = ok(text);
    const g = expectOklidGeometry(r.objects);
    for (const [key, value] of Object.entries(beklenen)) expect(g[key as keyof typeof beklenen], key).toBeCloseTo(value!, 6);
    seslendirmeTemiz(r.message);
  });

  it('etiketli ölçüler istenen köşe ve ayak adlarına göre çözülür', () => {
    const r = ok('|EK| = 4 ve |KF| = 9 olan DEF Öklid üçgeni çiz ayağı K olsun');
    const g = expectOklidGeometry(r.objects, ['D', 'E', 'F']);
    expect(g.H.label).toBe('K');
    expect(g.p).toBeCloseTo(4, 6);
    expect(g.k).toBeCloseTo(9, 6);
    expect(r.message).toContain('|DK| = 6 br');
  });

  it('Pisagor şekli de etiketli ölçü alır', () => {
    const r = ok('|AB| = 5 ve |AC| = 12 olan Pisagor şekli çiz');
    const { B, C } = expectPisagorGeometry(r.objects);
    expect(dist(B, C)).toBeCloseTo(13, 9);
  });

  it('p ile k eşitken "küçük kök" notu düşülmez', () => {
    expect(ok('hipotenüsü 10 ve yüksekliği 5 olan Öklid üçgeni çiz').message).not.toContain('küçük kök');
    expect(ok('hipotenüsü 10 ve yüksekliği 4,8 olan Öklid üçgeni çiz').message).toContain('küçük kök');
  });

  it.each([
    ['|XY| = 4 olan Öklid üçgeni çiz', /XY ölçüsünü tanıyamadım/],
    ['AB = 6 ve AB = 7 olan Öklid üçgeni çiz', /iki kez farklı/],
    ['2 tane Öklid üçgeni çiz', /Tek seferde bir/],
    ['dik kenarları 0,001 ve 0,002 olan Öklid üçgeni çiz', /en az 0,01/],
  ])('reddeder: %s', (text, re) => {
    const m = bad(text);
    expect(m).toMatch(re);
    seslendirmeTemiz(m);
  });

  it('istenen ayak adı doluysa sıradaki ad verilir ve ana mesajdan sonra not düşülür', () => {
    const r = ok('ayağı H olan Öklid üçgeni çiz', withPoints({ H: [20, 20] }));
    const g = expectOklidGeometry(r.objects);
    expect(g.H.label).not.toBe('H');
    expect(r.message).toMatch(/^ABC Öklid üçgeni çizildi/);
    expect(r.message).toContain(`H adı kullanımda olduğu için ayağa ${g.H.label} dendi.`);
    seslendirmeTemiz(r.message);
  });
});

describe('teoremler.oklid: dejenere üçgen (doğrulama)', () => {
  const cakisik = () => withPoints({ A: [0, 0], B: [0, 0], C: [4, 0] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); });
  const dogrusal = () => withPoints({ A: [0, 0], B: [2, 0], C: [4, 0] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); });
  it.each([
    ['ABC üçgeninde Öklid şeklini kur', cakisik],
    ['Öklid bağıntılarını göster', cakisik],
    ['Pisagor bağıntısını göster', cakisik],
    ['Pisagor bağıntısını göster', dogrusal],
    ['ABC üçgeninde Pisagor şeklini kur', dogrusal],
    ["Pisagor'a göre ABC dik mi", cakisik],
  ])('NaN üretmeden reddeder: %s', (text, scene) => {
    const m = bad(text, scene());
    expect(m).toContain('dejenere');
    expect(m).not.toMatch(/NaN|undefined/);
    seslendirmeTemiz(m);
  });
  it('Pisagor ret mesajı Pisagor örneği verir', () => {
    expect(bad('Pisagor bağıntısını göster', cakisik())).toContain('“Pisagor şekli çiz”');
  });
});

describe('teoremler.oklid: üç yalın noktayla gösterilen üçgen (doğrulama)', () => {
  it('Öklid şekli kurulurken çokgen de çizilir', () => {
    const r = ok('ABC üçgeninde Öklid şeklini kur', withPoints({ A: [0, 0], B: [4, 0], C: [0, 3] }));
    expect(triangles(r.objects)).toHaveLength(1);
    expectOklidGeometry(r.objects);
    expect(r.selectedIds).toContain(triangles(r.objects)[0].id);
  });
});
