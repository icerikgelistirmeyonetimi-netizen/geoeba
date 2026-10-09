import { describe, expect, it } from 'vitest';
import type { AngleObject, LineObject, MathObject, PointObject } from '@/types/math';
import { resolveCommandBindings } from '@/math/commandBindings';
import { metniSeslendir } from '@/math/matematikYazimi';
import { handlers } from '../handlers/teoremler/cemberTeoremleri';
import { distanceToLine } from '../handlers/constructions/build';
import { rankHandlers, runCommand } from '../engine';
import { CommandScene } from '../scene';
import { parseClause } from '../text';
import { build, byType, dist, expectFail, expectOk, point } from './helpers';

/**
 * Çember teoremleri ailesi: kiriş / çap, kesen teoremleri, kuvvet, çevre açı, teğet-kiriş açısı, ortak teğetler.
 * Her örnek cümle hem yalnız aile işleyicileriyle hem tüm motorla çalışır; tüm motorda en yüksek puan bu ailenindir.
 */

const ok = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectOk(handlers, text, scene, selection);
const bad = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectFail(handlers, text, scene, selection);
const SEMBOL = /[|∠≈=°²³̂͡△⌢π]/u;

/** M(0;0) merkezli, A(2;0) noktasından geçen c1 çemberi; B(0;2) çember üzerinde. */
const temel = () => build(s => {
  const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
  const A = s.addPoint({ x: 2, y: 0 }, { label: 'A' });
  s.addPoint({ x: 0, y: 2 }, { label: 'B' });
  s.addCircle({ centerId: M.id, radiusPointId: A.id }, { label: 'c1' });
});
const disNokta = () => build(s => { s.addPoint({ x: 6, y: 0 }, { label: 'P' }); }, temel());
const icNokta = () => build(s => { s.addPoint({ x: 1, y: 0.5 }, { label: 'P' }); }, temel());
/** Yalnız A çember üzerinde (çap ucu B simetriyle üretilsin). */
const tekNokta = () => build(s => {
  const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
  const A = s.addPoint({ x: 2, y: 0 }, { label: 'A' });
  s.addCircle({ centerId: M.id, radiusPointId: A.id }, { label: 'c1' });
});
/** A, B, C çember üzerinde (ACB çevre açısı). */
const ucNokta = () => build(s => {
  const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
  s.addCircle({ centerId: M.id, radius: 2 }, { label: 'c1' });
  s.addPoint({ x: 2, y: 0 }, { label: 'A' });
  s.addPoint({ x: 0, y: 2 }, { label: 'B' });
  s.addPoint({ x: -2, y: 0 }, { label: 'C' });
});
const ikiCember = () => build(s => {
  const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
  s.addCircle({ centerId: M.id, radius: 2 }, { label: 'c1' });
  const N = s.addPoint({ x: 7, y: 0 }, { label: 'N' });
  s.addCircle({ centerId: N.id, radius: 1 }, { label: 'c2' });
});
const kesisen = () => build(s => {
  const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
  s.addCircle({ centerId: M.id, radius: 2 }, { label: 'c1' });
  const N = s.addPoint({ x: 3, y: 0 }, { label: 'N' });
  s.addCircle({ centerId: N.id, radius: 2 }, { label: 'c2' });
});
const icIce = () => build(s => {
  const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
  s.addCircle({ centerId: M.id, radius: 4 }, { label: 'c1' });
  const N = s.addPoint({ x: 1, y: 0 }, { label: 'N' });
  s.addCircle({ centerId: N.id, radius: 1 }, { label: 'c2' });
});
/** Üç noktadan geçen çember (merkez noktası yok). */
const ucNoktadan = () => build(s => {
  const A = s.addPoint({ x: 2, y: 0 }, { label: 'A' });
  const B = s.addPoint({ x: 0, y: 2 }, { label: 'B' });
  const C = s.addPoint({ x: -2, y: 0 }, { label: 'C' });
  s.addCircle({ throughIds: [A.id, B.id, C.id] });
});

const circleOf = (objects: MathObject[]) => byType(objects, 'circle')[0];
const onCircle = (p: { x: number; y: number }, center = { x: 0, y: 0 }, r = 2) => expect(dist(p, center)).toBeCloseTo(r, 6);
const move = (objects: MathObject[], label: string, x: number, y: number) => resolveCommandBindings(objects.map(o => o.type === 'point' && o.label === label ? { ...o, x, y } : o));
const linePoints = (objects: MathObject[], line: LineObject): [PointObject, PointObject] => [objects.find(o => o.id === line.point1Id) as PointObject, objects.find(o => o.id === line.point2Id) as PointObject];
const angleValue = (objects: MathObject[], a: AngleObject) => {
  const [p, v, q] = [a.point1Id, a.vertexPointId, a.point3Id].map(id => objects.find(o => o.id === id) as PointObject);
  const u = { x: p.x - v.x, y: p.y - v.y }, w = { x: q.x - v.x, y: q.y - v.y };
  const deg = Math.acos(Math.max(-1, Math.min(1, (u.x * w.x + u.y * w.y) / (Math.hypot(u.x, u.y) * Math.hypot(w.x, w.y))))) * 180 / Math.PI;
  return a.reflex ? 360 - deg : deg;
};

// ---------------------------------------------------------------------------------------------- örnekler

const SAHNE: Record<string, () => MathObject[]> = {
  'AB çapını çiz': tekNokta,
  'kiriş teoremini göster': icNokta,
  'kirişler teoremini göster': icNokta,
  'ABC çevre açısını çiz': ucNokta,
  'iki çemberin ortak teğetlerini çiz': ikiCember,
  "c1 ve c2'nin dış ortak teğetlerini çiz": ikiCember,
  'iç ortak teğetleri çiz': ikiCember,
  'dış ortak teğetleri çiz': ikiCember,
  'çemberlerin ortak teğetlerini çiz': ikiCember,
  'c1 ile c2 çemberlerinin iç ortak teğetlerini çiz': ikiCember,
};
const sahnesi = (id: string, text: string) => SAHNE[text]?.() ?? (id === 'teoremler.kesen' || id === 'teoremler.kuvvet' ? disNokta() : temel());

describe('örnekler', () => {
  const cases = handlers.flatMap(h => h.examples.map(text => [h.id, text] as const));
  it('her işleyicide en az altı örnek var', () => {
    for (const h of handlers) expect(h.examples.length, h.id).toBeGreaterThanOrEqual(6);
  });
  it.each(cases)('%s: “%s” aile ve tüm motorla çalışır', (id, text) => {
    const scene = sahnesi(id, text);
    const aile = ok(text, scene);
    expect(aile.message.length).toBeGreaterThan(10);
    const motor = runCommand(text, scene);
    if (!motor.ok) throw new Error(`tüm motorda başarısız: ${motor.message}`);
    const s = new CommandScene(scene);
    const [top] = rankHandlers(parseClause(text, s.known()), s);
    expect(top.handler.id, text).toBe(id);
    for (const r of [aile, motor]) {
      expect(r.message).not.toMatch(/undefined|NaN/);
      expect(metniSeslendir(r.message)).not.toMatch(SEMBOL);
    }
  });
});

// ---------------------------------------------------------------------------------------------- kiriş ve çap

describe('teoremler.kiris', () => {
  it('var olan iki çember noktasından kiriş çizer', () => {
    const r = ok('AB kirişini çiz', temel());
    const seg = byType(r.objects, 'segment');
    expect(seg).toHaveLength(1);
    expect(seg[0].showLength).toBe(true);
    expect(r.message).toContain('|AB| ≈ 2,83 br');
    expect(r.message).toContain('2r = 4 br');
    expect(r.selectedIds).toEqual([seg[0].id]);
  });
  it('yeni kiriş noktalarını çembere bağlı ekler', () => {
    const r = ok('çembere bir kiriş çiz', temel());
    const yeni = byType(r.objects, 'point').filter(p => p.onObjectId);
    expect(yeni).toHaveLength(2);
    for (const p of yeni) { expect(p.onObjectId).toBe(circleOf(r.objects).id); onCircle(p); }
    expect(byType(r.objects, 'segment')).toHaveLength(1);
  });
  it('istenen adlarla yeni kiriş kurar ve adlı çemberi bulur', () => {
    const r = ok('c1 çemberine DE kirişini çiz', temel());
    onCircle(point(r.objects, 'D'));
    onCircle(point(r.objects, 'E'));
    expect(point(r.objects, 'D').onObjectId).toBe(circleOf(r.objects).id);
  });
  it('çember üzerinde olmayan noktayı reddeder', () => {
    expect(bad('AP kirişini çiz', disNokta())).toContain('P noktası çemberin üzerinde değil');
    expect(bad('AM kirişini çiz', temel())).toContain('merkezi');
    expect(bad('AB kirişini çiz', [])).toContain('Önce bir çember çizin');
  });
  it('çapın diğer ucunu merkeze göre simetriyle (canlı) kurar', () => {
    const r = ok('AB çapını çiz', tekNokta());
    const B = point(r.objects, 'B');
    expect(B.construction).toEqual({ kind: 'reflect', sourceId: point(r.objects, 'A').id, centerId: point(r.objects, 'M').id });
    expect(B.x).toBeCloseTo(-2, 9);
    expect(B.y).toBeCloseTo(0, 9);
    expect(r.message).toContain('|AB| = 4 br');
    const moved = move(r.objects, 'A', 0, 2);
    expect(point(moved, 'B').x).toBeCloseTo(0, 9);
    expect(point(moved, 'B').y).toBeCloseTo(-2, 9);
  });
  it('çapı adsız da çizer ve çap olmayan çifti reddeder', () => {
    const r = ok('çemberin çapını çiz', tekNokta());
    const seg = byType(r.objects, 'segment');
    expect(seg).toHaveLength(1);
    expect(dist(point(r.objects, 'A'), point(r.objects, 'B'))).toBeCloseTo(4, 9);
    expect(bad('AB çapını çiz', temel())).toContain('bir çap değil');
  });
  it('kirişin orta dikmesi merkezden geçer', () => {
    const r = ok('AB kirişinin orta dikmesini çiz', temel());
    const line = byType(r.objects, 'line').find(l => /Orta Dikmesi/.test(l.label))!;
    const [p, q] = linePoints(r.objects, line);
    expect(distanceToLine(point(r.objects, 'M'), p, q)).toBeCloseTo(0, 9);
    expect(r.message).toContain('Orta dikme merkezden geçer');
    expect(r.message).toContain('|MC| ≈ 1,41 br');
  });
  it('merkezden kirişe indirilen dikmenin ayağı kirişi ortalar (canlı)', () => {
    const r = ok('merkezden AB kirişine dikme indir', temel());
    const H = point(r.objects, 'H');
    expect(H.construction?.kind).toBe('foot');
    expect(dist(H, point(r.objects, 'A'))).toBeCloseTo(dist(H, point(r.objects, 'B')), 9);
    expect(r.message).toContain('kirişi ortalar');
    const moved = move(r.objects, 'B', -2, 0);
    const H2 = point(moved, 'H');
    expect(H2.x).toBeCloseTo(0, 9);
    expect(H2.y).toBeCloseTo(0, 9);
  });
  it('"AB kirişine dikme indir" merkezden iner; "P den … dikme indir" P den iner', () => {
    const r = ok('AB kirişine dikme indir', temel());
    const H = point(r.objects, 'H');
    expect(H.construction).toMatchObject({ kind: 'foot', sourceId: point(r.objects, 'M').id });
    expect(r.message).toContain('kirişi ortalar');
    const r2 = ok("P'den AB kirişine dikme indir", disNokta());
    const H2 = point(r2.objects, 'H');
    expect(H2.construction).toMatchObject({ kind: 'foot', sourceId: point(r2.objects, 'P').id });
    expect(r2.message).toContain('P noktasından [AB] kirişine');
    expect(metniSeslendir(r2.message)).not.toMatch(SEMBOL);
  });
  it('adsız kiriş isteği her zaman yeni kiriş kurar; "A dan geçen kiriş" A yı uç alır; birden çok kiriş', () => {
    const kirisli = build(s => { s.addSegment(s.findPoint('A')!.id, s.findPoint('B')!.id); }, temel());
    for (const text of ['çembere yeni bir kiriş çiz', 'çembere bir kiriş daha çiz', 'kiriş çiz']) {
      const r = ok(text, kirisli);
      expect(byType(r.objects, 'segment'), text).toHaveLength(2);
      expect(r.message, text).toContain('çizildi');
    }
    const r = ok("A'dan geçen kirişi çiz", temel());
    const seg = byType(r.objects, 'segment')[0];
    expect([seg.startPointId, seg.endPointId]).toContain(point(r.objects, 'A').id);
    expect(r.message).toMatch(/^A\w kirişi çizildi/);
    expect(bad("M'den geçen kirişi çiz", temel())).toContain('merkezi');
    const coklu = ok('AB ve CD kirişlerini çiz', temel());
    expect(byType(coklu.objects, 'segment')).toHaveLength(2);
    expect(coklu.message).toContain('AB ve CD kirişleri çizildi');
    onCircle(point(coklu.objects, 'C'));
    onCircle(point(coklu.objects, 'D'));
    const uc = ok('çembere üç kiriş çiz', temel());
    expect(byType(uc.objects, 'segment')).toHaveLength(3);
    expect(byType(uc.objects, 'point').filter(p => p.onObjectId)).toHaveLength(6);
    expect(bad('çembere on kiriş çiz', temel())).toContain('en fazla altı');
    for (const m of [r, coklu, uc]) expect(metniSeslendir(m.message)).not.toMatch(SEMBOL);
  });
  it('kirişsiz sahnede önce kiriş kurup dikme indirir; adı istenen ayak', () => {
    const r = ok('merkezden kirişe dikme indir, ayağına K de', tekNokta());
    expect(point(r.objects, 'K').construction?.kind).toBe('foot');
    expect(byType(r.objects, 'segment').length).toBe(2);
  });
  it('üç noktadan geçen çemberde merkezi canlı çevrel merkez olarak kurar', () => {
    const r = ok('merkezden AB kirişine dikme indir', ucNoktadan());
    const M = point(r.objects, 'M');
    expect(M.construction?.kind).toBe('triangleCenter');
    expect(M.x).toBeCloseTo(0, 9);
    expect(M.y).toBeCloseTo(0, 9);
  });
});

// ---------------------------------------------------------------------------------------------- kesen

describe('teoremler.kesen', () => {
  it('P den kesen: bağlı nokta + canlı ikinci kesişim; çarpım kuvvete eşit', () => {
    const r = ok('P noktasından çembere kesen çiz', disNokta());
    const lines = byType(r.objects, 'line');
    expect(lines).toHaveLength(1);
    const P = point(r.objects, 'P');
    const uclar = byType(r.objects, 'point').filter(p => p.onObjectId || p.construction?.kind === 'reflect');
    expect(uclar).toHaveLength(2);
    for (const u of uclar) { onCircle(u); expect(distanceToLine(u, ...linePoints(r.objects, lines[0]))).toBeCloseTo(0, 9); }
    expect(dist(P, uclar[0]) * dist(P, uclar[1])).toBeCloseTo(32, 6);
    expect(r.message).toContain('kuvveti');
    // İkinci uç: A'nın, merkezin doğruya izdüşümüne (gizli ayak) göre simetriği
    const bagli = uclar.find(u => u.onObjectId)!, kesisim = uclar.find(u => u.construction?.kind === 'reflect')!;
    const ayak = r.objects.find(o => o.id === (kesisim.construction as { centerId: string }).centerId) as PointObject;
    expect(ayak.construction).toMatchObject({ kind: 'foot', sourceId: point(r.objects, 'M').id, linePointIds: [P.id, bagli.id] });
    expect(ayak.visible).toBe(false);
    expect(kesisim.construction).toMatchObject({ kind: 'reflect', sourceId: bagli.id });
    // Canlılık: P çemberin çevresinde nereye taşınırsa taşınsın ikinci uç çember ve doğru üzerinde, A'dan ayrı kalır
    for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const moved = move(r.objects, 'P', 6 * Math.cos(deg * Math.PI / 180), 6 * Math.sin(deg * Math.PI / 180));
      const k2 = moved.find(o => o.id === kesisim.id) as PointObject;
      const a2 = moved.find(o => o.id === bagli.id) as PointObject;
      onCircle(k2);
      expect(distanceToLine(k2, point(moved, 'P'), a2)).toBeCloseTo(0, 9);
      expect(dist(k2, a2)).toBeGreaterThan(0.1);
      expect(dist(point(moved, 'P'), k2) * dist(point(moved, 'P'), a2)).toBeCloseTo(32, 6);
    }
  });
  it('kesen teoremi, kullanıcının çizdiği ve çemberi iki sahne noktasında kesen doğruyu da kesen sayar', () => {
    // P(6;0)–A(2;0) doğrusu çemberi A ve Q(−2;0) noktalarında keser: var olan kesen; yalnız bir kesen daha kurulur.
    const scene = build(s => {
      s.addPoint({ x: -2, y: 0 }, { label: 'Q' });
      s.addLine(s.findPoint('P')!.id, s.findPoint('A')!.id);
    }, disNokta());
    const r = ok('kesenler teoremini göster', scene);
    expect(byType(r.objects, 'line')).toHaveLength(2);
    expect(r.message).toContain('|PA| × |PQ|');
    expect(r.message).toContain('4 × 8 = 32');
  });
  it('iki kesen çizer; yeni P yoksa dışarıda oluşturur', () => {
    const r = ok("P'den iki kesen çiz", disNokta());
    expect(byType(r.objects, 'line')).toHaveLength(2);
    const r2 = ok('Q noktasından çembere iki kesen çiz', temel());
    const Q = point(r2.objects, 'Q');
    expect(dist(Q, { x: 0, y: 0 })).toBeGreaterThan(2);
    expect(byType(r2.objects, 'line')).toHaveLength(2);
  });
  it('kesenler teoremi: iki çarpım eşit', () => {
    const r = ok('kesen teoremini göster', disNokta());
    const P = point(r.objects, 'P');
    const lines = byType(r.objects, 'line');
    expect(lines).toHaveLength(2);
    const carpimlar = lines.map(l => {
      const uclar = byType(r.objects, 'point').filter(p => dist(p, { x: 0, y: 0 }) < 2 + 1e-6 && dist(p, { x: 0, y: 0 }) > 2 - 1e-6 && distanceToLine(p, ...linePoints(r.objects, l)) < 1e-9);
      expect(uclar).toHaveLength(2);
      return dist(P, uclar[0]) * dist(P, uclar[1]);
    });
    expect(carpimlar[0]).toBeCloseTo(carpimlar[1], 6);
    expect(carpimlar[0]).toBeCloseTo(32, 6);
    expect(r.message).toContain('Kesenler teoremi: |P');
    expect(r.message).toContain('= 32');
  });
  it('kirişler teoremi: iç noktadan iki kiriş', () => {
    const r = ok('kirişler teoremini göster', icNokta());
    const P = point(r.objects, 'P');
    expect(byType(r.objects, 'line')).toHaveLength(2);
    expect(byType(r.objects, 'segment')).toHaveLength(4);
    expect(r.message).toContain('Kirişler teoremi');
    expect(r.message).toContain(`${(4 - 1.25).toLocaleString('tr')}`);
    expect(dist(P, { x: 0, y: 0 })).toBeLessThan(2);
  });
  it('teğet-kesen teoremi: |PT|² = |PA| × |PB|', () => {
    const r = ok('teğet-kesen teoremini göster', disNokta());
    const P = point(r.objects, 'P');
    const T = byType(r.objects, 'point').find(p => p.construction?.kind === 'tangent')!;
    expect(T).toBeDefined();
    onCircle(T);
    expect(dist(P, T) ** 2).toBeCloseTo(32, 6);
    expect(r.message).toContain('Teğet-kesen teoremi');
    expect(r.message).toContain('|PT|² = |P');
  });
  it('yanlış konumdaki noktayı açıklamayla reddeder', () => {
    expect(bad('P noktasından çembere kesen çiz', icNokta())).toContain('çemberin içinde');
    expect(bad('P noktası için kiriş teoremini göster', disNokta())).toContain('çemberin dışında');
    expect(bad('A noktasından çembere kesen çiz', temel())).toContain('çemberin üzerinde');
    expect(bad('kesen teoremini göster', [])).toContain('Önce bir çember çizin');
  });
});

// ---------------------------------------------------------------------------------------------- kuvvet

describe('teoremler.kuvvet', () => {
  it('dış nokta: pozitif kuvvet', () => {
    const scene = disNokta();
    const r = ok('P noktasının çembere göre kuvvetini hesapla', scene);
    expect(r.message).toContain('P çemberin dışında');
    expect(r.message).toContain('|PM|² − r² = 36 − 4 = 32');
    expect(r.sceneChanged).toBe(false);
    expect(r.selectedIds).toEqual([point(scene, 'P').id]);
  });
  it('iç nokta: negatif kuvvet; üzerindeki nokta: sıfır', () => {
    expect(ok("P'nin c1 çemberine göre kuvveti nedir", icNokta()).message).toContain('1,25 − 4 = −2,75');
    expect(ok('A noktasının kuvvetini bul', temel()).message).toContain('A çemberin üzerinde');
    expect(ok('A noktasının kuvvetini bul', temel()).message).toContain('= 4 − 4 = 0');
  });
  it('teorem istenince örnek kesen de kurar', () => {
    const r = ok('kuvvet teoremini göster', disNokta());
    expect(byType(r.objects, 'line')).toHaveLength(1);
    expect(r.message).toContain('Örnek');
  });
  it('hangi nokta olduğu belirsizse sorar', () => {
    const scene = build(s => { s.addPoint({ x: 7, y: 0 }, { label: 'Q' }); }, disNokta());
    expect(bad('noktanın çembere göre kuvvetini hesapla', scene)).toContain('Birden fazla');
  });
});

// ---------------------------------------------------------------------------------------------- çevre açı

describe('teoremler.cevreAci', () => {
  it('adlı çevre açıyı çizer (ortadaki harf tepe)', () => {
    const r = ok('ACB çevre açısını çiz', ucNokta());
    const angle = byType(r.objects, 'angle')[0];
    expect(angle.vertexPointId).toBe(point(r.objects, 'C').id);
    expect(angleValue(r.objects, angle)).toBeCloseTo(45, 6);
    expect(r.message).toContain('m(∠ACB) = 45°');
    expect(r.message).toContain('90°');
    const r2 = ok('ABC çevre açısını çiz', ucNokta());
    expect(byType(r2.objects, 'angle')[0].vertexPointId).toBe(point(r2.objects, 'B').id);
    expect(r2.message).toContain('m(∠ABC) = 90°');
  });
  it('AB yayını gören çevre açının tepesi büyük yay üzerinde, çembere bağlı', () => {
    const r = ok('AB yayını gören çevre açıyı çiz', temel());
    const tepe = byType(r.objects, 'point').find(p => p.onObjectId)!;
    onCircle(tepe);
    const angle = byType(r.objects, 'angle')[0];
    expect(angleValue(r.objects, angle)).toBeCloseTo(45, 6);
  });
  it('çevre açı merkez açının yarısıdır (canlı)', () => {
    const r = ok('çevre açı teoremini göster', temel());
    const angles = byType(r.objects, 'angle');
    expect(angles).toHaveLength(2);
    const M = point(r.objects, 'M');
    const merkezAci = angles.find(a => a.vertexPointId === M.id)!, cevre = angles.find(a => a.vertexPointId !== M.id)!;
    expect(angleValue(r.objects, merkezAci)).toBeCloseTo(2 * angleValue(r.objects, cevre), 6);
    expect(r.message).toMatch(/m\(∠\wM\w\) \/ 2 \(\d+° = \d+° \/ 2\)/);
    // Tepeyi aynı yay üzerinde başka yere sürükle: yarısı kalır
    const tepe = r.objects.find(o => o.id === cevre.vertexPointId) as PointObject;
    const moved = move(r.objects, tepe.label, 2 * Math.cos(2), 2 * Math.sin(2));
    expect(angleValue(moved, merkezAci)).toBeCloseTo(2 * angleValue(moved, cevre), 6);
  });
  it('tepe küçük yaydaysa merkez açı geniş (reflex) alınır', () => {
    const scene = build(s => {
      const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
      s.addCircle({ centerId: M.id, radius: 2 }, { label: 'c1' });
      s.addPoint({ x: 2, y: 0 }, { label: 'A' });
      s.addPoint({ x: 0, y: 2 }, { label: 'B' });
      s.addPoint({ x: Math.SQRT2, y: Math.SQRT2 }, { label: 'C' });
    });
    const r = ok('ACB çevre açı merkez açı ilişkisini göster', scene);
    const merkezAci = byType(r.objects, 'angle').find(a => a.reflex)!;
    expect(merkezAci).toBeDefined();
    expect(angleValue(r.objects, merkezAci)).toBeCloseTo(270, 6);
    expect(r.message).toContain('135° = 270° / 2');
  });
  it('aynı yayı gören iki çevre açı eşittir', () => {
    const r = ok('aynı yayı gören çevre açılar eşittir', temel());
    const angles = byType(r.objects, 'angle');
    expect(angles).toHaveLength(2);
    expect(angleValue(r.objects, angles[0])).toBeCloseTo(angleValue(r.objects, angles[1]), 6);
    expect(r.message).toContain('eşittir');
    const r2 = ok('AB yayını gören iki çevre açı çiz', temel());
    expect(byType(r2.objects, 'angle')).toHaveLength(2);
  });
  it('çapı gören çevre açıyı (Tales) başka modüle bırakır', () => {
    const s = new CommandScene(temel());
    expect(rankHandlers(parseClause('çapı gören çevre açıyı çiz', s.known()), s, handlers)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------- teğet-kiriş açısı

describe('teoremler.tegetKirisAcisi', () => {
  it('teğet MA ya dik; açı merkez açının yarısı (canlı)', () => {
    const r = ok('A noktasındaki teğet ile AB kirişi arasındaki açıyı göster', temel());
    const M = point(r.objects, 'M'), A = point(r.objects, 'A'), B = point(r.objects, 'B');
    const teget = byType(r.objects, 'line').find(l => /Teğet/.test(l.label))!;
    const [p, q] = linePoints(r.objects, teget);
    expect((q.x - p.x) * (A.x - M.x) + (q.y - p.y) * (A.y - M.y)).toBeCloseTo(0, 9);
    expect(distanceToLine(A, p, q)).toBeCloseTo(0, 9);
    const angles = byType(r.objects, 'angle');
    const tegetKiris = angles.find(a => a.vertexPointId === A.id)!, merkez = angles.find(a => a.vertexPointId === M.id)!;
    expect(angleValue(r.objects, tegetKiris)).toBeCloseTo(45, 6);
    expect(angleValue(r.objects, merkez)).toBeCloseTo(90, 6);
    expect(r.message).toContain('(45° = 90° / 2)');
    const moved = move(r.objects, 'B', 2 * Math.cos(2.5), 2 * Math.sin(2.5));
    expect(angleValue(moved, tegetKiris)).toBeCloseTo(angleValue(moved, merkez) / 2, 6);
    void B;
  });
  it('adsız cümlede yeni kiriş kurar', () => {
    const r = ok('teğet-kiriş açısını çiz', tekNokta());
    expect(byType(r.objects, 'line').some(l => /Teğet/.test(l.label))).toBe(true);
    const angles = byType(r.objects, 'angle');
    expect(angles).toHaveLength(2);
    expect(angleValue(r.objects, angles[0])).toBeLessThanOrEqual(90 + 1e-9);
  });
  it('tepe çember üzerinde değilse reddeder', () => {
    expect(bad('P noktasındaki teğet ile PA kirişi arasındaki açıyı göster', disNokta())).toContain('çemberin üzerinde');
  });
});

// ---------------------------------------------------------------------------------------------- ortak teğetler

describe('teoremler.ortakTeget', () => {
  const tangentTo = (objects: MathObject[], line: LineObject, center: { x: number; y: number }, r: number) => {
    const [p, q] = linePoints(objects, line);
    expect(distanceToLine(center, p, q)).toBeCloseTo(r, 6);
  };
  it('ayrık çemberlerde iki dış, iki iç ortak teğet', () => {
    const r = ok('iki çemberin ortak teğetlerini çiz', ikiCember());
    const lines = byType(r.objects, 'line');
    expect(lines).toHaveLength(4);
    expect(lines.filter(l => /Dış/.test(l.label))).toHaveLength(2);
    expect(lines.filter(l => /İç/.test(l.label))).toHaveLength(2);
    for (const l of lines) { tangentTo(r.objects, l, { x: 0, y: 0 }, 2); tangentTo(r.objects, l, { x: 7, y: 0 }, 1); }
    const degme = byType(r.objects, 'point').filter(p => p.onObjectId);
    expect(degme).toHaveLength(8);
    expect(r.message).toContain('Çemberler ayrık');
  });
  it('yalnız dış ya da yalnız iç teğetler', () => {
    expect(byType(ok("c1 ve c2'nin dış ortak teğetlerini çiz", ikiCember()).objects, 'line')).toHaveLength(2);
    const ic = ok('c1 ile c2 çemberlerinin iç ortak teğetlerini çiz', ikiCember());
    expect(byType(ic.objects, 'line')).toHaveLength(2);
    expect(ic.message).toContain('iç ortak teğet');
  });
  it('dıştan teğet çemberler: iki dış, bir iç (değme noktasında tek doğru)', () => {
    const scene = build(s => {
      const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
      s.addCircle({ centerId: M.id, radius: 2 }, { label: 'c1' });
      const N = s.addPoint({ x: 3, y: 0 }, { label: 'N' });
      s.addCircle({ centerId: N.id, radius: 1 }, { label: 'c2' });
    });
    const r = ok('ortak teğetleri çiz', scene);
    const lines = byType(r.objects, 'line');
    expect(lines).toHaveLength(3);
    for (const l of lines) { tangentTo(r.objects, l, { x: 0, y: 0 }, 2); tangentTo(r.objects, l, { x: 3, y: 0 }, 1); }
    const ic = lines.find(l => /İç/.test(l.label))!;
    expect(distanceToLine({ x: 2, y: 0 }, ...linePoints(r.objects, ic))).toBeCloseTo(0, 9);
    expect(r.message).toContain('dıştan teğet');
    expect(r.message).toContain('değme noktası');
    expect(metniSeslendir(r.message)).not.toMatch(SEMBOL);
  });
  it('içten teğet çemberler (küçük çember önce yazılsa da) tek ortak teğet', () => {
    const scene = build(s => {
      const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
      s.addCircle({ centerId: M.id, radius: 1 }, { label: 'c1' });
      const N = s.addPoint({ x: 1, y: 0 }, { label: 'N' });
      s.addCircle({ centerId: N.id, radius: 2 }, { label: 'c2' });
    });
    for (const text of ["c1 ve c2'nin ortak teğetlerini çiz", "c2 ve c1'in ortak teğetlerini çiz"]) {
      const r = ok(text, scene);
      const lines = byType(r.objects, 'line');
      expect(lines, text).toHaveLength(1);
      const [p, q] = linePoints(r.objects, lines[0]);
      expect(distanceToLine({ x: -1, y: 0 }, p, q)).toBeCloseTo(0, 9);
      expect(Math.abs(q.x - p.x)).toBeCloseTo(0, 9);
      expect(r.message, text).toContain('içten teğet');
    }
  });
  it('kesişen çemberlerde iç teğet yok; iç içe çemberlerde hiç yok', () => {
    expect(byType(ok('dış ortak teğetleri çiz', kesisen()).objects, 'line')).toHaveLength(2);
    expect(bad('iç ortak teğetleri çiz', kesisen())).toContain('kesişiyor');
    expect(bad('ortak teğetleri çiz', icIce())).toContain('iç içe');
    expect(bad('ortak teğetleri çiz', temel())).toContain('iki çember');
  });
});

// ---------------------------------------------------------------------------------------------- çakışmalar

describe('başka ailelerin cümlelerini almaz', () => {
  it.each([
    ['kirişin uzunluğu kaç', temel],
    ['P den çembere teğet çiz', disNokta],
    ['AB kirişini sil', temel],
    ['çemberin üzerine nokta koy', temel],
    ['çapı 8 olan çember çiz', temel],
    ['AB çaplı çember çiz', temel],
    ["[AB]'yi çap olarak alan çember çiz", temel],
    ['AB yi çap kabul eden çember çiz', temel],
    ['çemberin çapını ölç', temel],
    ['kesen teoremini kırmızıya boya', disNokta],
    ['çevre açıyı gizle', temel],
    ["ABC üçgeninde A'dan BC'ye dik kesen doğru çiz", temel],
    ['üçgenin iki kenarını kesen bir doğru çiz', disNokta],
    ['d doğrusunu kesen doğru çiz', disNokta],
    ['x eksenini kesen noktayı bul', disNokta],
    ['kenarlarını kesen doğru çiz', disNokta],
    ['kuvvetli çizgiyle çember çiz', disNokta],
    ["2'nin 3. kuvvetini hesapla", disNokta],
  ])('%s', (text, scene) => {
    const s = new CommandScene(scene());
    expect(rankHandlers(parseClause(text, s.known()), s, handlers)).toEqual([]);
  });
  it('sıfat-fiil "kesen" çember anılınca kesendir; sayı ve sıfat eki keseni engellemez', () => {
    const s = new CommandScene(disNokta());
    for (const text of ['çemberi kesen doğru çiz', "P'den iki kesen çiz", 'ikinci kesen çiz', 'yeni bir kesen çiz', "P'den iki kesen doğru çiz"]) {
      expect(rankHandlers(parseClause(text, s.known()), s, handlers)[0]?.handler.id, text).toBe('teoremler.kesen');
    }
  });
  it('tüm motorda olumsuz ve düzenleme cümleleri bu aileye gelmez', () => {
    const r = runCommand('kiriş çizme', temel());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('Olumsuz');
    const s = new CommandScene(build(sc => { sc.addSegment(sc.findPoint('A')!.id, sc.findPoint('B')!.id); }, temel()));
    expect(rankHandlers(parseClause('AB kirişini sil', s.known()), s)[0].handler.id).toMatch(/^edit\./);
    expect(rankHandlers(parseClause("P'den çembere teğet çiz", s.known()), s)[0].handler.id).toBe('constructions.tangent');
    expect(rankHandlers(parseClause('AB kirişinin orta noktasını bul', s.known()), s)[0].handler.id).toBe('constructions.midpoint');
    expect(rankHandlers(parseClause('AB kirişinin uzunluğunu ölç', s.known()), s)[0].handler.id).toMatch(/^measure\./);
  });
  it('puanlar inşa bandının üstünde, düzenleme bandının altında', () => {
    const s = new CommandScene(disNokta());
    for (const text of ['AB kirişini çiz', 'kesen teoremini göster', 'P noktasının kuvvetini bul', 'çevre açı çiz', 'teğet-kiriş açısını çiz']) {
      const [top] = rankHandlers(parseClause(text, s.known()), s, handlers);
      expect(top.score).toBeGreaterThanOrEqual(75);
      expect(top.score).toBeLessThanOrEqual(84);
    }
  });
});
