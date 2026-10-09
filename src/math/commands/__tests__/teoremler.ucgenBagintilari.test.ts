import { describe, expect, it } from 'vitest';
import type { LineObject, MathObject, PointObject } from '@/types/math';
import { metniSeslendir } from '@/math/matematikYazimi';
import { resolveCommandBindings } from '@/math/commandBindings';
import { handlers } from '../handlers/teoremler/ucgenBagintilari';
import { rankHandlers, runCommand } from '../engine';
import { CommandScene } from '../scene';
import { parseClause } from '../text';
import { build, byType, dist, expectFail, expectOk, point } from './helpers';

/**
 * Üçgen bağıntıları ailesi: açıortay, kenarortay, Stewart, Ceva, Menelaus, sinüs / kosinüs, Heron, üçgen eşitsizliği,
 * açı–kenar ilişkisi. Her örnek hem yalnız aile işleyicileriyle hem tüm motorla çalışır; bağıntılar sayılarla doğrulanır;
 * yardımcı noktalar canlıdır (köşe taşınınca kural korunur); mesajlar sembolsüz seslendirilir.
 */

const ok = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectOk(handlers, text, scene, selection);
const bad = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectFail(handlers, text, scene, selection);

type Pts = Record<string, [number, number]>;
const withPoints = (spec: Pts, extra?: (s: CommandScene, p: Record<string, PointObject>) => void) => build(s => {
  const p: Record<string, PointObject> = {};
  for (const [label, [x, y]] of Object.entries(spec)) p[label] = s.addPoint({ x, y }, { label });
  extra?.(s, p);
});
const tri = (s: CommandScene, p: Record<string, PointObject>) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); };

const S = {
  /** A'da dik: |AB| = 4, |AC| = 3, |BC| = 5 */
  dik: () => withPoints({ A: [0, 0], B: [4, 0], C: [0, 3] }, tri),
  /** Çeşitkenar: |AB| = 6, |AC| = √20, |BC| = √32 */
  genel: () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4] }, tri),
  ikizkenar: () => withPoints({ A: [0, 4], B: [-3, 0], C: [3, 0] }, tri),
  /** Çokgen yok, yalnız üç nokta */
  noktalar: () => withPoints({ A: [0, 0], B: [4, 0], C: [0, 3] }),
  icNokta: () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], P: [2.5, 1.5] }, tri),
  disNokta: () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], P: [10, 10] }, tri),
  kenarNoktasi: () => withPoints({ A: [0, 0], B: [4, 0], C: [0, 3], D: [2, 1.5] }, tri),
  kesen: () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], K: [1, -1], L: [3, 5] }, (s, p) => { tri(s, p); s.addLine(p.K.id, p.L.id, { label: 'd' }); }),
  /** D [AB] üzerinde, E [CA] üzerinde; DE doğrusu BC'yi uzantıda keser */
  kesenDE: () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], D: [2, 0], E: [1, 2] }, (s, p) => { tri(s, p); s.addLine(p.D.id, p.E.id); }),
  bos: (): MathObject[] => [],
};

const move = (objects: MathObject[], label: string, x: number, y: number) =>
  resolveCommandBindings(objects.map(o => o.type === 'point' && o.label === label ? { ...o, x, y } as MathObject : o));
const byId = <T extends MathObject>(objects: MathObject[], id: string) => objects.find(o => o.id === id) as T;
const lineDistance = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / dist(a, b);
const angleAt = (v: { x: number; y: number }, p: { x: number; y: number }, q: { x: number; y: number }) => {
  const a = { x: p.x - v.x, y: p.y - v.y }, b = { x: q.x - v.x, y: q.y - v.y };
  return Math.acos((a.x * b.x + a.y * b.y) / Math.hypot(a.x, a.y) / Math.hypot(b.x, b.y));
};
const constructed = (objects: MathObject[], kind: string) => objects.filter((o): o is PointObject => o.type === 'point' && o.construction?.kind === kind);
const SEMBOL = /[|∠≈=°²³̂͡△⌢π]/u;
const temiz = (message: string) => {
  expect(message).not.toContain('undefined');
  expect(message).not.toContain('NaN');
  expect(metniSeslendir(message)).not.toMatch(SEMBOL);
};

// ------------------------------------------------------------------------------------------------ örneklerin tamamı

const EXAMPLE_SCENES: Record<string, () => MathObject[]> = {
  'açıortay teoremini göster': S.dik,
  'A açıortayı için açıortay teoremini uygula': S.dik,
  'iç açıortay teoremini uygula': S.dik,
  'ABC üçgeninde açıortay teoremini doğrula': S.dik,
  'açıortay uzunluğunu hesapla': S.dik,
  'dış açıortay teoremini uygula': S.genel,
  'B köşesi için açıortay teoremini yaz': S.dik,
  'kenarortay teoremini göster': S.dik,
  'A kenarortayı için kenarortay teoremi': S.dik,
  'kenarortay uzunluğunu hesapla': S.dik,
  'ABC üçgeninde kenarortay bağıntısını yaz': S.dik,
  'B köşesi için kenarortay teoremini uygula': S.dik,
  'BC kenarına ait kenarortay teoremini doğrula': S.dik,
  'Stewart teoremini göster': S.dik,
  'AD için Stewart teoremini uygula': S.kenarNoktasi,
  'ABC üçgeninde Stewart teoremini doğrula': S.dik,
  'BD = 2 olacak şekilde Stewart teoremini göster': S.dik,
  "BC'yi 1:2 oranında bölen D noktası için Stewart teoremini göster": S.dik,
  'Stewart bağıntısını yaz': S.dik,
  'Ceva teoremini göster': S.dik,
  'P noktası için Ceva teoremini uygula': S.icNokta,
  'ABC üçgeninde Ceva teoremi': S.icNokta,
  "Ceva'yı doğrula": S.icNokta,
  'Ceva bağıntısını yaz': S.dik,
  'G noktası için Ceva teoremini uygula': () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], G: [2, 1] }, tri),
  'Menelaus teoremini göster': S.genel,
  'd doğrusu için Menelaus teoremini uygula': S.kesen,
  'ABC üçgeninde Menelaus teoremini doğrula': S.kesen,
  'Menelaus bağıntısını yaz': S.genel,
  'Menelaus teoremini açıkla': S.genel,
  'DE doğrusu için Menelaus teoremi': S.kesenDE,
  'sinüs teoremini göster': S.dik,
  'sinüs teoremini uygula': S.genel,
  'sinüs teoremini yaz': S.dik,
  'ABC üçgeninde sinüs teoremi': S.dik,
  'sinüs kuralını doğrula': S.dik,
  'çevrel çemberle birlikte sinüs teoremini göster': S.dik,
  'kosinüs teoremini göster': S.dik,
  'A açısı için kosinüs teoremini uygula': S.genel,
  "kosinüs teoremiyle BC'yi hesapla": S.dik,
  'ABC üçgeninde kosinüs teoremini yaz': S.dik,
  'B köşesi için kosinüs teoremini doğrula': S.dik,
  'kosinüs kuralını göster': S.genel,
  'Heron formülüyle alanı hesapla': S.dik,
  'Heron formülünü göster': S.genel,
  'Heron formülünü uygula': S.dik,
  "Heron ile ABC'nin alanı": S.dik,
  'ABC üçgeninin alanını Heron formülüyle bul': S.dik,
  'Heron bağıntısını yaz': S.dik,
  'üçgen eşitsizliğini doğrula': S.dik,
  'üçgen eşitsizliğini yaz': S.genel,
  'ABC üçgeninde üçgen eşitsizliği': S.dik,
  'kenarları 2, 3 ve 7 olan üçgen çizilebilir mi': S.bos,
  '3, 4, 8 üçgen olur mu': S.bos,
  '2 3 7 üçgen oluşturur mu': S.bos,
  'kenarları 5, 6 ve 7 olan bir üçgen var mıdır': S.bos,
  'açı kenar ilişkisini göster': S.dik,
  'büyük açı karşısında büyük kenar': S.dik,
  'ABC üçgeninde açı-kenar bağıntısını yaz': S.genel,
  'açı kenar ilişkisini doğrula': S.dik,
  'açıları ve karşı kenarları sırala': S.genel,
  'büyük açının karşısında büyük kenar olduğunu doğrula': S.dik,
};

describe('üçgen bağıntıları: her örnek çalışır', () => {
  const examples = [...new Set(handlers.flatMap(h => h.examples))];
  it('her örneğin bir sahnesi var ve her işleyicide en az 6 örnek var', () => {
    expect(examples.filter(e => !(e in EXAMPLE_SCENES))).toEqual([]);
    expect(handlers.every(h => h.examples.length >= 6)).toBe(true);
    expect(handlers.map(h => h.id)).toEqual([
      'teoremler.aciortayTeoremi', 'teoremler.kenarortayTeoremi', 'teoremler.stewart', 'teoremler.ceva', 'teoremler.menelaus',
      'teoremler.sinusTeoremi', 'teoremler.kosinusTeoremi', 'teoremler.heron', 'teoremler.ucgenEsitsizligi', 'teoremler.aciKenar',
    ]);
  });
  it.each(examples)('yalnız aile: %s', example => {
    const result = ok(example, EXAMPLE_SCENES[example]());
    expect(result.message.length).toBeGreaterThan(20);
    temiz(result.message);
  });
  it.each(examples)('tüm motor: %s', example => {
    const objects = EXAMPLE_SCENES[example]();
    const s = new CommandScene(objects);
    const ranked = rankHandlers(parseClause(example, s.known()), s);
    expect(ranked[0]?.handler.id, `${example} → ${ranked.slice(0, 2).map(r => `${r.handler.id}:${r.score}`).join(', ')}`).toMatch(/^teoremler\./);
    const result = runCommand(example, objects);
    if (!result.ok) throw new Error(`“${example}” motorla başarısız: ${result.message}`);
    temiz(result.message);
  });
});

// ------------------------------------------------------------------------------------------------ açıortay

describe('açıortay teoremi', () => {
  it('açıortay ayağı canlı kesişimdir ve bağıntı sayılarla doğrudur', () => {
    const r = ok('açıortay teoremini göster', S.dik());
    expect(r.message).toContain('Açıortay teoremi (A köşesi): |AB| / |AC| = |BD| / |DC| (4 / 3 = 2,86 / 2,14 = 1,33)');
    expect(r.message).toContain('|AD|² = |AB| × |AC| − |BD| × |DC|');
    const A = point(r.objects, 'A'), B = point(r.objects, 'B'), C = point(r.objects, 'C'), D = point(r.objects, 'D');
    expect(D.construction?.kind).toBe('intersection');
    expect(lineDistance(D, B, C)).toBeCloseTo(0, 9);
    expect(dist(B, D) / dist(D, C)).toBeCloseTo(dist(A, B) / dist(A, C), 9);
    expect(dist(A, D) ** 2).toBeCloseTo(dist(A, B) * dist(A, C) - dist(B, D) * dist(D, C), 9);
    // gizli kenar doğrusu görünmez ama kesişim çalışır
    const gizli = byType(r.objects, 'line').find(l => !l.visible)!;
    expect(gizli).toBeDefined();
    expect(byType(r.objects, 'segment').some(sg => sg.startPointId === A.id && sg.endPointId === D.id)).toBe(true);
    // canlılık: A taşınınca D hâlâ BC üzerinde ve açıortay üzerinde
    const moved = move(r.objects, 'A', 1, 5);
    const A2 = point(moved, 'A'), D2 = byId<PointObject>(moved, D.id);
    expect(D2.construction?.kind).toBe('intersection');
    expect(lineDistance(D2, point(moved, 'B'), point(moved, 'C'))).toBeCloseTo(0, 9);
    expect(angleAt(A2, point(moved, 'B'), D2)).toBeCloseTo(angleAt(A2, D2, point(moved, 'C')), 9);
    expect(r.selectedIds.length).toBeGreaterThan(0);
  });

  it('köşe seçimi: B köşesi, ABC üçgeninde doğrulama ve yalnız noktalardan üçgen', () => {
    const r = ok('B köşesi için açıortay teoremini yaz', S.dik());
    expect(r.message).toContain('Açıortay teoremi (B köşesi): |BC| / |BA| = |CD| / |DA|');
    const D = point(r.objects, 'D');
    expect(lineDistance(D, point(r.objects, 'C'), point(r.objects, 'A'))).toBeCloseTo(0, 9);
    expect(ok('ABC üçgeninde açıortay teoremini doğrula', S.noktalar()).message).toContain('A köşesi');
    const again = ok('açıortay teoremini göster', r.objects);
    expect(again.message).toContain('A köşesi');
  });

  it('dış açıortay: BC doğrusunu uzantıda keser, ikizkenarda açıklamayla reddeder', () => {
    const r = ok('dış açıortay teoremini uygula', S.genel());
    expect(r.message).toContain("Dış açıortay teoremi (A köşesi): |AB| / |AC| = |BD'| / |CD'|");
    expect(r.message).toContain('uzantısındadır');
    const A = point(r.objects, 'A'), B = point(r.objects, 'B'), C = point(r.objects, 'C'), D = point(r.objects, "D'");
    expect(lineDistance(D, B, C)).toBeCloseTo(0, 9);
    expect(dist(B, D) / dist(C, D)).toBeCloseTo(dist(A, B) / dist(A, C), 9);
    const ic = constructed(r.objects, 'bisector')[0];
    const u = { x: ic.x - A.x, y: ic.y - A.y }, v = { x: D.x - A.x, y: D.y - A.y };
    expect(u.x * v.x + u.y * v.y).toBeCloseTo(0, 9);
    const moved = move(r.objects, 'C', 3, 5);
    const D2 = byId<PointObject>(moved, D.id);
    expect(lineDistance(D2, point(moved, 'B'), point(moved, 'C'))).toBeCloseTo(0, 9);
    expect(dist(point(moved, 'B'), D2) / dist(point(moved, 'C'), D2)).toBeCloseTo(dist(point(moved, 'A'), point(moved, 'B')) / dist(point(moved, 'A'), point(moved, 'C')), 9);
    expect(bad('dış açıortay teoremini uygula', S.ikizkenar())).toContain('paralel');
  });

  it('teorem sözcüğü olmadan "açıortayını çiz" bu ailenin değildir; üçgen yoksa açıklar', () => {
    expect(bad('B köşesinin açıortayını çiz', S.dik())).toBeTruthy();
    expect(handlers.find(h => h.id === 'teoremler.aciortayTeoremi')!.match(parseClause('B köşesinin açıortayını çiz'), new CommandScene(S.dik()))).toBe(0);
    expect(bad('açıortay teoremini göster', [])).toContain('üçgen');
    expect(bad('açıortay teoremini sil', S.dik())).toBeTruthy();
  });
});

// ------------------------------------------------------------------------------------------------ kenarortay

describe('kenarortay teoremi', () => {
  it('orta nokta canlıdır; bağıntı ve hipotenüs notu doğrudur', () => {
    const r = ok('kenarortay teoremini göster', S.dik());
    expect(r.message).toContain('2 × |AD|² = |AB|² + |AC|² − |BC|² / 2 (2 × 6,25 = 16 + 9 − 25 / 2; 12,5 = 12,5)');
    expect(r.message).toContain('Dik üçgende hipotenüse ait kenarortay hipotenüsün yarısıdır: |AD| = |BC| / 2 = 2,5 br.');
    const D = point(r.objects, 'D');
    expect(D.construction).toMatchObject({ kind: 'midpoint' });
    expect([D.x, D.y]).toEqual([2, 1.5]);
    const moved = move(r.objects, 'C', 2, 6);
    expect(byId<PointObject>(moved, D.id)).toMatchObject({ x: 3, y: 3 });
  });
  it('B köşesi seçilince hipotenüs notu yoktur ve kenar seçimi karşı köşeyi verir', () => {
    const r = ok('B köşesi için kenarortay teoremini uygula', S.dik());
    expect(r.message).toContain('Kenarortay teoremi (B köşesi');
    expect(r.message).not.toContain('hipotenüs');
    const A = point(r.objects, 'A'), B = point(r.objects, 'B'), C = point(r.objects, 'C'), D = point(r.objects, 'D');
    expect(2 * dist(B, D) ** 2).toBeCloseTo(dist(B, A) ** 2 + dist(B, C) ** 2 - dist(A, C) ** 2 / 2, 9);
    expect(ok('BC kenarına ait kenarortay teoremini doğrula', S.dik()).message).toContain('(A köşesi');
  });
});

// ------------------------------------------------------------------------------------------------ Stewart

describe('Stewart teoremi', () => {
  const stewartHolds = (objects: MathObject[], d: string) => {
    const A = point(objects, 'A'), B = point(objects, 'B'), C = point(objects, 'C'), D = point(objects, d);
    const a = dist(B, C), b = dist(A, C), c = dist(A, B), m = dist(B, D), n = dist(D, C), ad = dist(A, D);
    expect(b * b * m + c * c * n).toBeCloseTo(a * (ad * ad + m * n), 6);
    expect(lineDistance(D, B, C)).toBeCloseTo(0, 9);
  };
  it('varsayılan nokta 1:2 oran noktasıdır ve not düşülür', () => {
    const r = ok('Stewart teoremini göster', S.dik());
    expect(r.message).toContain('Stewart teoremi (AD doğru parçası, D noktası [BC] üzerinde): |AC|² × |BD| + |AB|² × |DC| = |BC| × (|AD|² + |BD| × |DC|)');
    expect(r.message).toContain('1:2 oranında bölen nokta alındı');
    expect(point(r.objects, 'D').construction).toMatchObject({ kind: 'ratio', t: 1 / 3 });
    stewartHolds(r.objects, 'D');
    stewartHolds(move(r.objects, 'A', -1, 2), 'D');
  });
  it('|BD| = 2, oran ve var olan nokta', () => {
    const r = ok('BD = 2 olacak şekilde Stewart teoremini göster', S.dik());
    expect(r.message).toContain('(AD doğru parçası');
    expect(dist(point(r.objects, 'B'), point(r.objects, 'D'))).toBeCloseTo(2, 9);
    stewartHolds(r.objects, 'D');
    const oran = ok("BC'yi 1:2 oranında bölen D noktası için Stewart teoremini göster", S.dik());
    expect(point(oran.objects, 'D').construction).toMatchObject({ kind: 'ratio', t: 1 / 3 });
    expect(oran.message).not.toContain('alındı');
    const mevcut = ok('AD için Stewart teoremini uygula', S.kenarNoktasi());
    expect(constructed(mevcut.objects, 'ratio')).toHaveLength(0);
    expect(mevcut.message).toContain('62,5 = 62,5');
    stewartHolds(mevcut.objects, 'D');
    expect(bad('BD = 9 olacak şekilde Stewart teoremini göster', S.dik())).toContain('0 ile 5 arasında');
    expect(bad('AP için Stewart teoremini uygula', S.disNokta())).toContain('üzerinde değil');
  });
});

// ------------------------------------------------------------------------------------------------ Ceva

describe('Ceva teoremi', () => {
  it('iç nokta için üç ayak canlıdır ve çarpım 1 olur', () => {
    const r = ok('P noktası için Ceva teoremini uygula', S.icNokta());
    expect(r.message).toContain('Ceva teoremi (P noktası): (|AF| / |FB|) × (|BD| / |DC|) × (|CE| / |EA|) = 1 (');
    expect(r.message).toContain('= 1).');
    const check = (objects: MathObject[]) => {
      const A = point(objects, 'A'), B = point(objects, 'B'), C = point(objects, 'C'), P = point(objects, 'P');
      const D = point(objects, 'D'), E = point(objects, 'E'), F = point(objects, 'F');
      expect(lineDistance(D, B, C)).toBeCloseTo(0, 9);
      expect(lineDistance(D, A, P)).toBeCloseTo(0, 9);
      expect(lineDistance(E, C, A)).toBeCloseTo(0, 9);
      expect(lineDistance(E, B, P)).toBeCloseTo(0, 9);
      expect(lineDistance(F, A, B)).toBeCloseTo(0, 9);
      expect(lineDistance(F, C, P)).toBeCloseTo(0, 9);
      expect((dist(A, F) / dist(F, B)) * (dist(B, D) / dist(D, C)) * (dist(C, E) / dist(E, A))).toBeCloseTo(1, 6);
    };
    check(r.objects);
    for (const d of ['D', 'E', 'F']) expect(point(r.objects, d).construction?.kind).toBe('intersection');
    expect(byType(r.objects, 'segment')).toHaveLength(3);
    check(move(r.objects, 'P', 2, 2));
    check(move(r.objects, 'C', 1, 5));
  });
  it('nokta verilmezse ağırlık merkezi alınır; dışarıdaki nokta reddedilir', () => {
    const r = ok('Ceva teoremini göster', S.dik());
    expect(r.message).toContain('ağırlık merkezi G(');
    expect(r.message).toContain('(1 × 1 × 1 = 1)');
    expect(point(r.objects, 'G').construction).toMatchObject({ kind: 'triangleCenter', center: 'centroid' });
    expect(ok('ABC üçgeninde Ceva teoremi', S.icNokta()).message).toContain('(P noktası)');
    expect(bad('P noktası için Ceva teoremini uygula', S.disNokta())).toContain('içinde değil');
  });
});

// ------------------------------------------------------------------------------------------------ Menelaus

describe('Menelaus teoremi', () => {
  const menelausHolds = (objects: MathObject[]) => {
    const A = point(objects, 'A'), B = point(objects, 'B'), C = point(objects, 'C');
    const D = point(objects, 'D'), E = point(objects, 'E'), F = point(objects, 'F');
    expect(lineDistance(F, A, B)).toBeCloseTo(0, 9);
    expect(lineDistance(D, B, C)).toBeCloseTo(0, 9);
    expect(lineDistance(E, C, A)).toBeCloseTo(0, 9);
    expect(lineDistance(D, F, E)).toBeCloseTo(0, 9);
    expect((dist(A, F) / dist(F, B)) * (dist(B, D) / dist(D, C)) * (dist(C, E) / dist(E, A))).toBeCloseTo(1, 6);
  };
  it('adı verilen doğru için üç kesişim canlıdır; uzantıdaki nokta belirtilir', () => {
    const r = ok('d doğrusu için Menelaus teoremini uygula', S.kesen());
    expect(r.message).toContain('Menelaus teoremi (d): (|AF| / |FB|) × (|BD| / |DC|) × (|CE| / |EA|) = 1 (');
    expect(r.message).toContain('F [AB] üzerinde, D [BC] üzerinde, E [CA] uzantısında.');
    menelausHolds(r.objects);
    for (const d of ['D', 'E', 'F']) expect(point(r.objects, d).construction?.kind).toBe('intersection');
    menelausHolds(move(r.objects, 'L', 5, 5));
    menelausHolds(move(r.objects, 'A', 0, 1));
    expect(ok('Menelaus teoremini göster', S.kesen()).message).toContain('(d)');
  });
  it('doğru yoksa varsayılan kesen kurulur ve not düşülür', () => {
    const r = ok('Menelaus teoremini göster', S.genel());
    expect(r.message).toContain('(0,5 × 4 × 0,5 = 1)');
    expect(r.message).toContain('D [BC] uzantısında');
    expect(r.message).toContain('Kesen doğru için');
    expect(point(r.objects, 'F').construction).toMatchObject({ kind: 'ratio', t: 1 / 3 });
    expect(point(r.objects, 'E').construction).toMatchObject({ kind: 'ratio', t: 2 / 3 });
    menelausHolds(r.objects);
    menelausHolds(move(r.objects, 'B', 7, 1));
    const kesen = byType(r.objects, 'line').find((l): l is LineObject => l.visible)!;
    expect(r.selectedIds).toContain(kesen.id);
  });
  it('kenar üzerindeki tanım noktaları yeniden kullanılır', () => {
    const r = ok('DE doğrusu için Menelaus teoremi', S.kesenDE());
    expect(r.message).toContain('(|AD| / |DB|) × (|BF| / |FC|) × (|CE| / |EA|) = 1');
    expect(r.message).toContain('F [BC] uzantısında');
    expect(constructed(r.objects, 'intersection')).toHaveLength(1);
    expect(r.objects.filter(o => o.type === 'point')).toHaveLength(6);
  });
  it('köşeden geçen doğru reddedilir', () => {
    const scene = withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], K: [1, 2] }, (s, p) => { tri(s, p); s.addLine(p.A.id, p.K.id, { label: 'd' }); });
    expect(bad('d doğrusu için Menelaus teoremini uygula', scene)).toContain('köşesinden geçiyor');
  });
});

// ------------------------------------------------------------------------------------------------ sinüs / kosinüs

describe('sinüs ve kosinüs teoremi', () => {
  it('sinüs: oranlar 2r ile eşittir; çember istenince çevrel çember çizilir', () => {
    const r = ok('sinüs teoremini göster', S.dik());
    expect(r.message).toBe('Sinüs teoremi (ABC): |BC| / sin A = |CA| / sin B = |AB| / sin C = 2r: 5 / sin 90° = 3 / sin 36,87° = 4 / sin 53,13° = 5 (r = 2,5 br, çevrel çemberin yarıçapı).');
    expect(byType(r.objects, 'angle')).toHaveLength(3);
    expect(byType(r.objects, 'circle')).toHaveLength(0);
    const cember = ok('çevrel çemberle birlikte sinüs teoremini göster', S.dik());
    expect(byType(cember.objects, 'circle')).toHaveLength(1);
    expect(cember.selectedIds).toContain(byType(cember.objects, 'circle')[0].id);
    const genel = ok('sinüs teoremini uygula', S.genel());
    const [a, b, c] = [dist(point(genel.objects, 'B'), point(genel.objects, 'C')), dist(point(genel.objects, 'C'), point(genel.objects, 'A')), dist(point(genel.objects, 'A'), point(genel.objects, 'B'))];
    const A = angleAt(point(genel.objects, 'A'), point(genel.objects, 'B'), point(genel.objects, 'C'));
    const B = angleAt(point(genel.objects, 'B'), point(genel.objects, 'A'), point(genel.objects, 'C'));
    const C = angleAt(point(genel.objects, 'C'), point(genel.objects, 'A'), point(genel.objects, 'B'));
    expect(a / Math.sin(A)).toBeCloseTo(b / Math.sin(B), 9);
    expect(b / Math.sin(B)).toBeCloseTo(c / Math.sin(C), 9);
  });
  it('kosinüs: seçilen açı ve karşı kenar', () => {
    const r = ok('kosinüs teoremini göster', S.dik());
    expect(r.message).toBe('Kosinüs teoremi (A açısı, m(∠BAC) = 90°): |BC|² = |AB|² + |AC|² − 2 × |AB| × |AC| × cos A; cos A = 0 olduğundan 25 = 16 + 9 − 2 × 4 × 3 × 0 = 25; |BC| = 5 br.');
    expect(byType(r.objects, 'angle')).toHaveLength(1);
    const b = ok('B köşesi için kosinüs teoremini doğrula', S.dik());
    expect(b.message).toContain('Kosinüs teoremi (B açısı, m(∠CBA) = 36,87°): |CA|² = |BC|² + |BA|²');
    expect(b.message).toContain('|CA| = 3 br.');
    expect(ok("kosinüs teoremiyle BC'yi hesapla", S.dik()).message).toContain('(A açısı');
    const genel = ok('A açısı için kosinüs teoremini uygula', S.genel());
    expect(genel.message).toContain('cos A ≈ 0,45');
  });
});

// ------------------------------------------------------------------------------------------------ Heron / eşitsizlik / açı-kenar

describe('Heron formülü', () => {
  it('alanı sayılarla yazar ve çokgenin alanını gösterir', () => {
    const r = ok('Heron formülüyle alanı hesapla', S.dik());
    expect(r.message).toBe('Heron formülü (ABC): u = (|AB| + |BC| + |CA|) / 2 = (4 + 5 + 3) / 2 = 6; A(ABC) = karekök(u × (u − |AB|) × (u − |BC|) × (u − |CA|)) = karekök(6 × 2 × 1 × 3) = karekök(36) = 6 br².');
    expect(byType(r.objects, 'polygon')[0].showArea).toBe(true);
    expect(r.selectedIds).toEqual([byType(r.objects, 'polygon')[0].id]);
    const genel = ok('Heron formülünü göster', S.genel());
    expect(genel.message).toContain('karekök(144) = 12 br².');
    expect(ok("Heron ile ABC'nin alanı", S.noktalar()).message).toContain('= 6 br²');
  });
});

describe('üçgen eşitsizliği', () => {
  it('sahnede: her kenar için fark ve toplam yazılır', () => {
    const r = ok('üçgen eşitsizliğini doğrula', S.dik());
    expect(r.message).toBe('Üçgen eşitsizliği (ABC): her kenar, diğer iki kenarın farkından büyük ve toplamından küçüktür. |BC| = 5 br: 4 − 3 = 1 ile 4 + 3 = 7 arasında; |CA| = 3 br: 5 − 4 = 1 ile 5 + 4 = 9 arasında; |AB| = 4 br: 5 − 3 = 2 ile 5 + 3 = 8 arasında.');
  });
  it.each([
    ['kenarları 2, 3 ve 7 olan üçgen çizilebilir mi', 'Hayır: kenarları 2, 3 ve 7 olan üçgen çizilemez. 2 + 3 = 5, en uzun kenar 7 bundan büyük; üçgen eşitsizliği bozulur (iki kenarın toplamı üçüncü kenardan büyük olmalı).'],
    ['3, 4, 8 üçgen olur mu', 'Hayır: kenarları 3, 4 ve 8 olan üçgen çizilemez. 3 + 4 = 7, en uzun kenar 8 bundan büyük; üçgen eşitsizliği bozulur (iki kenarın toplamı üçüncü kenardan büyük olmalı).'],
    ['kenarları 5, 6 ve 7 olan bir üçgen var mıdır', 'Evet: kenarları 5, 6 ve 7 olan üçgen çizilebilir. İki kısa kenarın toplamı 5 + 6 = 11, en uzun kenar 7 bundan küçük; üçgen eşitsizliği sağlanır.'],
    ['1, 2, 3 üçgen oluşturur mu', 'Hayır: kenarları 1, 2 ve 3 olan üçgen çizilemez. 1 + 2 = 3 olduğundan üç nokta aynı doğru üzerinde kalır; iki kenarın toplamı üçüncü kenardan büyük olmalı.'],
  ])('sahnesiz soru: %s', (text, expected) => {
    const r = ok(text, S.dik());
    expect(r.message).toBe(expected);
    expect(r.sceneChanged).toBe(false);
    expect(r.objects).toHaveLength(S.dik().length);
    const full = runCommand(text, []);
    expect(full.ok && full.message).toBe(expected);
  });
  it('"çiz" fiiliyle soru olmadan karışmaz', () => {
    const h = handlers.find(x => x.id === 'teoremler.ucgenEsitsizligi')!;
    expect(h.match(parseClause('kenarları 3, 4 ve 5 olan üçgen çiz'), new CommandScene([]))).toBe(0);
    expect(bad('0, 4, 5 üçgen olur mu')).toContain('pozitif');
  });
});

describe('açı-kenar ilişkisi', () => {
  it('açıları ve karşı kenarları aynı sırada yazar', () => {
    const r = ok('açı kenar ilişkisini göster', S.dik());
    expect(r.message).toBe('Açı-kenar ilişkisi (ABC): açılar büyükten küçüğe m(∠BAC) = 90°, m(∠ACB) = 53,13°, m(∠CBA) = 36,87°; karşılarındaki kenarlar da aynı sırada: |BC| = 5 br, |AB| = 4 br, |CA| = 3 br. Büyük açının karşısında büyük kenar, küçük açının karşısında küçük kenar bulunur.');
    expect(byType(r.objects, 'angle')).toHaveLength(3);
    expect(ok('büyük açı karşısında büyük kenar', S.ikizkenar()).message).toContain('eşit açıların karşısındaki kenarlar da eşittir');
  });
});

// ------------------------------------------------------------------------------------------------ doğrulayıcı bulguları (regresyon)

describe('doğrulayıcı bulguları', () => {
  /** Geniş açılı: A'da 135° */
  const genis = () => withPoints({ A: [0, 0], B: [4, 0], C: [-2, 2] }, tri);
  /** Köşeler aynı doğru üzerinde */
  const dogrusal = () => withPoints({ A: [0, 0], B: [2, 0], C: [4, 0] }, tri);

  it('Ceva: kesişimde rastlantıyla duran serbest nokta yeniden kullanılmaz; ayak canlı kalır', () => {
    // D serbest ve tam [BC] orta noktasında; ağırlık merkezinden inen AG ayağı da oraya düşer.
    const r = ok('Ceva teoremini göster', withPoints({ A: [0, 0], B: [4, 0], C: [0, 3], D: [2, 1.5] }, tri));
    expect(point(r.objects, 'D').construction).toBeUndefined();
    const ayaklar = constructed(r.objects, 'intersection');
    expect(ayaklar).toHaveLength(3);
    const ayak = ayaklar.find(p => Math.abs(p.x - 2) < 1e-9 && Math.abs(p.y - 1.5) < 1e-9)!;
    expect(ayak).toBeDefined();
    expect(ayak.id).not.toBe(point(r.objects, 'D').id);
    const moved = move(r.objects, 'C', 1, 5);
    const ayak2 = byId<PointObject>(moved, ayak.id);
    expect(lineDistance(ayak2, point(moved, 'B'), point(moved, 'C'))).toBeCloseTo(0, 9);
    expect(lineDistance(ayak2, point(moved, 'A'), point(moved, 'G'))).toBeCloseTo(0, 9);
  });

  it('Ceva: adı geçen nokta sahnede yoksa ayaklara o ad verilmez, açıklamayla reddedilir', () => {
    expect(bad('P noktası için Ceva teoremini uygula', S.dik())).toContain('P adlı nokta yok');
  });

  it('kosinüs: geniş açıda eksi kosinüs ayraç içinde ve eksi işaretiyle yazılır', () => {
    const r = ok('kosinüs teoremini göster', genis());
    expect(r.message).toContain('cos A ≈ −0,71 olduğundan');
    expect(r.message).toContain('× (−0,71) = 40');
    expect(r.message).not.toContain('× -');
    temiz(r.message);
    expect(metniSeslendir(r.message)).toContain('(eksi sıfır virgül yetmiş bir)');
  });

  it('dış açıortay: komşu kenarlar neredeyse eşitken koordinat sınırı yerine neden söylenir; yardımcı nokta görünen ad tüketmez', () => {
    expect(bad('dış açıortay teoremini uygula', withPoints({ A: [0, 4], B: [-3, 0], C: [3.0000001, 0] }, tri))).toContain('neredeyse paralel');
    const r = ok('dış açıortay teoremini uygula', S.genel());
    expect(byType(r.objects, 'point').filter(p => p.label === 'D')).toHaveLength(0);
    const yon = constructed(r.objects, 'direction')[0];
    expect(yon.showLabel).toBe(false);
    expect(point(r.objects, "D'").construction?.kind).toBe('intersection');
  });

  it.each([
    ['3, 4 ve 5 kenarlı bir üçgen çizilebilir mi', 'Evet'],
    ['2, 3 ve 7 kenarlı bir üçgen çizilebilir mi', 'Hayır'],
    ['kenarları 3 4 5 olan bir üçgen olur mu', 'Evet'],
  ])('"bir üçgen" tanımlığı kenar sayısı sanılmaz: %s', (text, beklenen) => {
    const r = ok(text, S.bos());
    expect(r.message.startsWith(beklenen)).toBe(true);
    expect(r.sceneChanged).toBe(false);
    const s = new CommandScene([]);
    expect(rankHandlers(parseClause(text, s.known()), s)[0]?.handler.id).toBe('teoremler.ucgenEsitsizligi');
  });

  it('dejenere üçgende eşitsizlik ve açı–kenar ilişkisi yanlış bağıntı yazmak yerine reddeder', () => {
    expect(bad('üçgen eşitsizliğini doğrula', dogrusal())).toContain('aynı doğru üzerinde');
    expect(bad('açı kenar ilişkisini doğrula', dogrusal())).toContain('aynı doğru üzerinde');
  });

  it('Menelaus: kenara paralel adlı doğru "doğrusu" ekiyle reddedilir', () => {
    const scene = withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], M: [-1, 2], N: [7, 2] }, (s, p) => { tri(s, p); s.addLine(p.M.id, p.N.id, { label: 'e' }); });
    expect(bad('e doğrusu için Menelaus teoremini uygula', scene)).toContain('e doğrusu AB kenar doğrusuna paralel');
  });

  it('aynı komut ikinci kez nesne çoğaltmaz', () => {
    const once = ok('açıortay teoremini göster', S.dik());
    expect(ok('açıortay teoremini göster', once.objects).objects).toHaveLength(once.objects.length);
    const ceva = ok('Ceva teoremini göster', S.dik());
    expect(ok('Ceva teoremini göster', ceva.objects).objects).toHaveLength(ceva.objects.length);
    const menelaus = ok('Menelaus teoremini göster', S.genel());
    expect(ok('Menelaus teoremini göster', menelaus.objects).objects).toHaveLength(menelaus.objects.length);
  });

  it('iki üçgen varken belirsizlik açıklanır; adla ya da seçimle çözülür', () => {
    const iki = withPoints({ A: [0, 0], B: [4, 0], C: [0, 3], K: [10, 10], L: [14, 10], M: [10, 13] }, (s, p) => { tri(s, p); s.addPolygon([p.K.id, p.L.id, p.M.id], { kind: 'triangle' }); });
    expect(bad('sinüs teoremini göster', iki)).toContain('Birden fazla üçgen');
    expect(ok('KLM üçgeninde sinüs teoremini göster', iki).message).toContain('Sinüs teoremi (KLM)');
    expect(ok('sinüs teoremini göster', iki, [byType(iki, 'polygon')[1].id]).message).toContain('Sinüs teoremi (KLM)');
  });
});
