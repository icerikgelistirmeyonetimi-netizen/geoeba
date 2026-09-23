import { describe, it, expect } from 'vitest';
import type { CircleObject, MathObject, MeasurementObject, PointObject } from '@/types/math';
import { resolveCommandBindings } from '@/math/commandBindings';
import {
  addArcMeasurement,
  arcBadgeTitle,
  arcDetachedText,
  arcFlipLabel,
  arcMeasurementDependencies,
  arcNearMissHint,
  arcOptionsForCircle,
  arcOptionsForPair,
  arcOptionsForPoint,
  arcTitle,
  arcUnresolvedText,
  arcValueText,
  circleGeometryOf,
  circlesThroughPoint,
  commonCircles,
  dropDanglingArcMeasurements,
  findArcMeasurement,
  flipArcMeasurement,
  isArcMeasurement,
  isPointOnCircle,
  makeArcMeasurement,
  pointsOnCircle,
  resolveArc,
  type ArcMeasurement,
} from '../arcMeasure';

const t0 = 1750000000000;
const nokta = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): PointObject =>
  ({ id, type: 'point', label: id, showLabel: true, x, y, visible: true, isIndependent: true, createdAt: t0, color: '#2563eb', ...extra }) as PointObject;
const cember = (o: Record<string, unknown>): CircleObject =>
  ({ type: 'circle', showLabel: true, visible: true, createdAt: t0, color: '#8b5cf6', label: String(o.id), centerPointId: '', ...o }) as CircleObject;
const byId = <T extends MathObject>(objects: MathObject[], id: string) => objects.find((o) => o.id === id) as T;
const deg = (r: { degrees: number } | null) => Number(r!.degrees.toFixed(1));
const len = (r: { length: number } | null) => Number(r!.length.toFixed(2));

/** Kullanıcının sahnesi: pembe çember A merkezli, B yarıçap noktası (120°), C (0°) ve D (60,5°) çembere bağlı; mor çember C merkezli, A'dan geçer, F bağlı. */
const kullaniciSahnesi = (): MathObject[] => [
  nokta('A', -5.1961524227, -3),
  nokta('B', -10.3923048454, 6),
  cember({ id: 'pembe', label: 'A Merkezli Çember', centerPointId: 'A', radiusPointId: 'B', color: '#ec4899', showArea: true, showPerimeter: true }),
  nokta('C', 5.196152422709948, -3, { onObjectId: 'pembe' }),
  cember({ id: 'mor', label: 'C Merkezli Çember', centerPointId: 'C', radiusPointId: 'A' }),
  nokta('D', -0.07870815707331058, 6.04498558252779, { onObjectId: 'pembe' }),
  nokta('F', 10.392301211351217, 6.00000209812381, { onObjectId: 'mor' }),
  nokta('G', 0, 0),
];

/** M(0,0) merkez, B(3,0) yarıçap noktası, C(0,3) ve D(-3,0) serbest ama çemberin üzerinde. */
const capSahnesi = (): MathObject[] => [
  nokta('M', 0, 0),
  nokta('B', 3, 0),
  cember({ id: 'c', label: 'M Merkezli Çember', centerPointId: 'M', radiusPointId: 'B' }),
  nokta('C', 0, 3),
  nokta('D', -3, 0),
];

describe('arcMeasure: çemberin üzerinde mi', () => {
  it('bağlı nokta (biraz kaymış olsa da), yarıçap noktası ve serbest ama tam üzerindeki nokta kabul edilir', () => {
    const s = kullaniciSahnesi();
    const pembe = byId<CircleObject>(s, 'pembe');
    const kaymisD = { ...byId<PointObject>(s, 'D'), x: byId<PointObject>(s, 'D').x + 1e-2 };
    expect(isPointOnCircle(kaymisD, pembe, s)).toBe(true);
    expect(isPointOnCircle(byId(s, 'B'), pembe, s)).toBe(true);
    expect(isPointOnCircle(byId(s, 'C'), pembe, s)).toBe(true);
  });

  it('merkez hiçbir zaman üzerinde değildir; kullanıcının D noktası mor çembere 0,078 uzak: reddedilir', () => {
    const s = kullaniciSahnesi();
    expect(isPointOnCircle(byId(s, 'A'), byId(s, 'pembe'), s)).toBe(false);
    expect(isPointOnCircle(byId(s, 'D'), byId(s, 'mor'), s)).toBe(false);
    expect(isPointOnCircle(byId(s, 'A'), byId(s, 'mor'), s)).toBe(true);
    expect(isPointOnCircle(byId(s, 'F'), byId(s, 'mor'), s)).toBe(true);
    expect(circlesThroughPoint('D', s).map((c) => c.id)).toEqual(['pembe']);
    expect(circlesThroughPoint('A', s).map((c) => c.id)).toEqual(['mor']);
  });

  it('üç noktadan geçen çember: merkez yeniden hesaplanınca da üç nokta üzerindedir', () => {
    const s: MathObject[] = [nokta('P', 1, 0), nokta('Q', 0, 1), nokta('R', -1, 0), cember({ id: 'u', throughPointIds: ['P', 'Q', 'R'] })];
    const tasinmis = s.map((o) => (o.id === 'Q' ? { ...o, y: 2 } : o));
    for (const sahne of [s, tasinmis]) {
      const u = byId<CircleObject>(sahne, 'u');
      expect(circleGeometryOf(u, sahne)).not.toBeNull();
      for (const id of ['P', 'Q', 'R']) expect(isPointOnCircle(byId(sahne, id), u, sahne)).toBe(true);
    }
  });

  it('komutla kurulan kesişim noktası (construction) ve 4 ondalıklı statik kesişim noktası kabul edilir', () => {
    const s = resolveCommandBindings([
      nokta('O', 0, 0), nokta('R1', 3, 0), cember({ id: 'k1', centerPointId: 'O', radiusPointId: 'R1' }),
      nokta('O2', 4, 0), nokta('R2', 7, 0), cember({ id: 'k2', centerPointId: 'O2', radiusPointId: 'R2' }),
      nokta('K', 0, 0, { isIndependent: false, construction: { kind: 'intersection', objectIds: ['k1', 'k2'], index: 0 } }),
    ]);
    const K = byId<PointObject>(s, 'K');
    expect(Math.abs(K.x - 2)).toBeLessThan(1e-9);
    expect(isPointOnCircle(K, byId(s, 'k1'), s)).toBe(true);
    expect(isPointOnCircle(K, byId(s, 'k2'), s)).toBe(true);
    const statik = nokta('S', 2, Number(Math.sqrt(5).toFixed(4)), { isIndependent: false });
    expect(isPointOnCircle(statik, byId(s, 'k1'), [...s, statik])).toBe(true);
  });

  it('sabit yarıçaplı çemberde serbest nokta', () => {
    const s: MathObject[] = [nokta('O', 1, 1), cember({ id: 'f', centerPointId: 'O', fixedRadius: 2 }), nokta('P', 1, 3), nokta('Q', 1, 3.1)];
    expect(isPointOnCircle(byId(s, 'P'), byId(s, 'f'), s)).toBe(true);
    expect(isPointOnCircle(byId(s, 'Q'), byId(s, 'f'), s)).toBe(false);
  });

  it('eksik nokta ya da doğrusal üç nokta: false döner, hata fırlatmaz', () => {
    const s: MathObject[] = [nokta('P', 0, 0), nokta('Q', 1, 1), nokta('R', 2, 2), cember({ id: 'd', throughPointIds: ['P', 'Q', 'R'] }), cember({ id: 'e', centerPointId: 'YOK', radiusPointId: 'P' })];
    expect(circleGeometryOf(byId(s, 'd'), s)).toBeNull();
    expect(isPointOnCircle(byId(s, 'P'), byId(s, 'd'), s)).toBe(false);
    expect(isPointOnCircle(byId(s, 'P'), byId(s, 'e'), s)).toBe(false);
    expect(() => commonCircles('P', 'Q', s)).not.toThrow();
  });
});

describe('arcMeasure: sıralama', () => {
  it('pointsOnCircle açıya göre saat yönünün tersine; circlesThroughPoint visibleOnly gizli çember/noktayı atlar', () => {
    const s = kullaniciSahnesi();
    expect(pointsOnCircle('pembe', s).map((p) => p.id)).toEqual(['C', 'D', 'B']);
    const gizli = s.map((o) => (o.id === 'pembe' ? { ...o, visible: false } : o));
    expect(circlesThroughPoint('B', gizli, { visibleOnly: true })).toEqual([]);
    expect(circlesThroughPoint('B', gizli).map((c) => c.id)).toEqual(['pembe']);
    const gizliNokta = s.map((o) => (o.id === 'D' ? { ...o, visible: false } : o));
    expect(pointsOnCircle('pembe', gizliNokta, { visibleOnly: true }).map((p) => p.id)).toEqual(['C', 'B']);
  });

  it('commonCircles: tanımı gereği üzerinde olan önce, sonra tercih edilen, sonra en son eklenen', () => {
    // İki çember iki noktada kesişir; P ve Q her ikisinin de üzerinde (P, k1'e bağlı).
    const s: MathObject[] = [
      nokta('O1', 0, 0), cember({ id: 'k1', centerPointId: 'O1', fixedRadius: 5 }),
      nokta('O2', 6, 0), cember({ id: 'k2', centerPointId: 'O2', fixedRadius: 5 }),
      nokta('P', 3, 4, { onObjectId: 'k1' }), nokta('Q', 3, -4),
    ];
    expect(commonCircles('P', 'Q', s).map((c) => c.id)).toEqual(['k1', 'k2']);
    const serbest = s.map((o) => (o.id === 'P' ? { ...o, onObjectId: undefined } : o));
    expect(commonCircles('P', 'Q', serbest).map((c) => c.id)).toEqual(['k2', 'k1']);
    expect(commonCircles('P', 'Q', serbest, { preferId: 'k1' }).map((c) => c.id)).toEqual(['k1', 'k2']);
    expect(arcOptionsForPair('P', 'Q', serbest).map((o) => o.circleId)).toEqual(['k2', 'k1']);
    expect(arcBadgeTitle({ circleId: 'k1', pointIds: ['P', 'Q'] }, serbest)).toBe('PQ yayı (k1)');
  });
});

describe('arcMeasure: resolveArc', () => {
  it('kullanıcı sahnesi: küçük BD yayı 59,5° · 10,79 br (D den başlar); büyük 300,5° · 54,5 br; C ara noktası büyük yayı seçer', () => {
    const s = kullaniciSahnesi();
    const kucuk = resolveArc({ circleId: 'pembe', pointIds: ['B', 'D'] }, s)!;
    expect(kucuk.startId).toBe('D');
    expect(kucuk.endId).toBe('B');
    expect(deg(kucuk)).toBe(59.5);
    expect(len(kucuk)).toBe(10.79);
    expect(kucuk.major).toBe(false);
    expect(kucuk.offIds).toEqual([]);
    const buyuk = resolveArc({ circleId: 'pembe', pointIds: ['B', 'D'], major: true }, s)!;
    expect([deg(buyuk), Number(buyuk.length.toFixed(1))]).toEqual([300.5, 54.5]);
    expect(buyuk.startId).toBe('B');
    expect(buyuk.major).toBe(true);
    const ara = resolveArc({ circleId: 'pembe', pointIds: ['B', 'D'], throughPointId: 'C' }, s)!;
    expect(deg(ara)).toBe(300.5);
    expect(Math.abs(ara.length - kucuk.radius * ara.sweep)).toBeLessThan(1e-12);
    expect(Math.abs(ara.degrees - (ara.sweep * 180) / Math.PI)).toBeLessThan(1e-12);
  });

  it('ara nokta bir uçtaysa yok sayılır; çakışık uçlar null', () => {
    const s = [...capSahnesi(), nokta('E', 3, 0)];
    expect(deg(resolveArc({ circleId: 'c', pointIds: ['C', 'D'], throughPointId: 'D' }, s))).toBe(90);
    expect(resolveArc({ circleId: 'c', pointIds: ['B', 'E'] }, s)).toBeNull();
    expect(resolveArc({ circleId: 'c', pointIds: ['B', 'B'] }, s)).toBeNull();
    expect(resolveArc({ circleId: 'yok', pointIds: ['B', 'C'] }, s)).toBeNull();
  });

  it('tam 180°: ilk noktadan ikinciye saat yönünün tersine; büyük yay tümleyendir', () => {
    const s = capSahnesi();
    const bd = resolveArc({ circleId: 'c', pointIds: ['B', 'D'] }, s)!;
    expect([bd.startId, bd.half, bd.major]).toEqual(['B', true, false]);
    expect(bd.midAngle).toBeCloseTo(Math.PI / 2, 12);
    const db = resolveArc({ circleId: 'c', pointIds: ['D', 'B'] }, s)!;
    expect(db.startId).toBe('D');
    expect(db.midAngle).toBeCloseTo((3 * Math.PI) / 2, 12);
    const bdBuyuk = resolveArc({ circleId: 'c', pointIds: ['B', 'D'], major: true }, s)!;
    expect([bdBuyuk.startId, bdBuyuk.endId]).toEqual(['D', 'B']);
    expect(deg(bdBuyuk)).toBe(180);
  });

  it('çemberden ayrılan uç: offIds ve uyarı yazısı', () => {
    const s = capSahnesi().map((o) => (o.id === 'D' ? { ...o, x: -2 } : o));
    const r = resolveArc({ circleId: 'c', pointIds: ['B', 'D'] }, s)!;
    expect(r.offIds).toEqual(['D']);
    expect(arcDetachedText(r, s)).toBe('D noktası artık çemberin üzerinde değil');
    // Çember büyütülünce (yarıçap noktası taşınınca) statik noktalar da ayrılır
    const buyumus = capSahnesi().map((o) => (o.id === 'B' ? { ...o, x: 4 } : o));
    const r2 = resolveArc({ circleId: 'c', pointIds: ['C', 'D'] }, buyumus)!;
    expect(arcDetachedText(r2, buyumus)).toBe('C ve D noktaları artık çemberin üzerinde değil');
    expect(arcDetachedText(resolveArc({ circleId: 'c', pointIds: ['B', 'C'] }, capSahnesi())!, capSahnesi())).toBeNull();
  });
});

describe('arcMeasure: başlık, değer ve nesne yardımcıları', () => {
  it('başlıklar', () => {
    const s = kullaniciSahnesi();
    expect(arcTitle({ circleId: 'pembe', pointIds: ['B', 'D'] }, s)).toBe('BD yayı');
    expect(arcTitle({ circleId: 'pembe', pointIds: ['B', 'D'], throughPointId: 'C' }, s)).toBe('BCD yayı');
    expect(arcTitle({ circleId: 'pembe', pointIds: ['B', 'D'], major: true }, s)).toBe('BCD yayı');
    const cSiz = s.filter((o) => o.id !== 'C');
    expect(arcTitle({ circleId: 'pembe', pointIds: ['B', 'D'], major: true }, cSiz)).toBe('BD büyük yayı');
    expect(arcTitle({ circleId: 'pembe', pointIds: ['B', 'YOK'] }, s)).toBe('Yay ölçümü');
    // yarım çember: üzerindeki noktayla, yoksa "yarım çemberi"
    expect(arcTitle({ circleId: 'c', pointIds: ['B', 'D'] }, capSahnesi())).toBe('BCD yayı');
    expect(arcTitle({ circleId: 'c', pointIds: ['D', 'B'] }, capSahnesi())).toBe('DB yarım çemberi');
  });

  it('değer yazısı', () => {
    const s = kullaniciSahnesi();
    expect(arcValueText(resolveArc({ circleId: 'pembe', pointIds: ['B', 'D'] }, s)!)).toBe('10,79 br · 59,5°');
    expect(arcValueText(resolveArc({ circleId: 'c', pointIds: ['B', 'C'] }, capSahnesi())!)).toBe('4,71 br · 90°');
  });

  it('addArcMeasurement: oluşturur; ters sırayla yinelenmez; gizli kopya yeniden gösterilir; çember dışı nokta hatası', () => {
    const s = kullaniciSahnesi();
    const r1 = addArcMeasurement(s, { circleId: 'pembe', pointIds: ['B', 'D'] });
    if ('error' in r1) throw new Error(r1.error);
    expect(r1.created).toBe(true);
    expect(r1.measurement).toMatchObject({ type: 'measurement', kind: 'arc', label: 'BD yayı', pointIds: ['B', 'D'], circleId: 'pembe', showValue: true, visible: true });
    expect(r1.measurement.major).toBeUndefined();
    expect(isArcMeasurement(r1.measurement)).toBe(true);
    const r2 = addArcMeasurement(r1.objects, { circleId: 'pembe', pointIds: ['D', 'B'] });
    if ('error' in r2) throw new Error(r2.error);
    expect([r2.created, r2.revealed, r2.objects === r1.objects]).toEqual([false, false, true]);
    const gizli = r1.objects.map((o) => (o.id === r1.measurement.id ? { ...o, showValue: false } : o));
    const r3 = addArcMeasurement(gizli, { circleId: 'pembe', pointIds: ['B', 'D'] });
    if ('error' in r3) throw new Error(r3.error);
    expect(r3.revealed).toBe(true);
    expect(byId<MeasurementObject>(r3.objects, r1.measurement.id).showValue).toBe(true);
    expect(r3.objects.length).toBe(gizli.length);
    const hata = addArcMeasurement(s, { circleId: 'mor', pointIds: ['A', 'D'] });
    expect(hata).toEqual({ error: 'D noktası C Merkezli Çember üzerinde değil.' });
    expect(addArcMeasurement(s, { circleId: 'pembe', pointIds: ['B', 'B'] })).toEqual({ error: 'Yay için iki FARKLI nokta gerekir.' });
    expect(addArcMeasurement(s, { circleId: 'yok', pointIds: ['B', 'D'] })).toEqual({ error: 'Çember bulunamadı.' });
  });

  it('flipArcMeasurement: diğer yaya geçer, kimlik/renk korunur, ara nokta kalkar, rozet kayıklığı sıfırlanır; çakışmada hata', () => {
    const s = kullaniciSahnesi();
    const m: ArcMeasurement = {
      ...makeArcMeasurement({ circleId: 'pembe', pointIds: ['B', 'D'], throughPointId: 'C' }, s),
      color: '#ff0000', labelOffsets: { measure: { x: 1, y: 1 }, pointLabel: { x: 2, y: 2 } },
      labelAnchors: {
        measure: { pointIds: ['B', 'C', 'D'], offset: { x: 3, y: 1 }, alignment: 'left' },
        pointLabel: { pointIds: ['B'], offset: { x: 2, y: 2 }, alignment: 'center' },
      },
    };
    expect(m.label).toBe('BCD yayı');
    const s2 = [...s, m];
    const f = flipArcMeasurement(m, s2);
    if ('error' in f) throw new Error(f.error);
    expect(f.title).toBe('BD yayı');
    expect(f.object).toMatchObject({ id: m.id, color: '#ff0000', createdAt: m.createdAt, label: 'BD yayı' });
    expect(f.object.throughPointId).toBeUndefined();
    expect(f.object.labelOffsets).toEqual({ pointLabel: { x: 2, y: 2 } });
    expect(f.object.labelAnchors).toEqual({ pointLabel: m.labelAnchors!.pointLabel });
    expect(m.labelAnchors?.measure.pointIds).toEqual(['B', 'C', 'D']);
    expect(deg(resolveArc(f.object, s2))).toBe(59.5);
    // Geri çevirince büyük yay (C'yi içeren)
    const s3 = s2.map((o) => (o.id === m.id ? f.object : o));
    const g = flipArcMeasurement(f.object, s3);
    if ('error' in g) throw new Error(g.error);
    // Taraf artık `major` bayrağıyla değil, YAZILI başlangıç ucuyla tutulur
    expect(g.object.major).toBeUndefined();
    expect(g.object.startPointId).toBe('B');
    expect(deg(resolveArc(g.object, s3))).toBe(300.5);
    expect(g.title).toBe('BCD yayı');
    // Çakışma: küçük yay ayrıca ölçülmüşse
    const kucuk = makeArcMeasurement({ circleId: 'pembe', pointIds: ['D', 'B'] }, s);
    expect(flipArcMeasurement(m, [...s2, kucuk])).toEqual({ error: 'BD yayı zaten ölçülmüş.' });
  });

  it('diğer yaya geçince yalnız ölçüm çapası olan nesnede labelAnchors bütünüyle kalkar', () => {
    const s = capSahnesi();
    const m: ArcMeasurement = {
      ...makeArcMeasurement({ circleId: 'c', pointIds: ['B', 'D'] }, s),
      labelAnchors: { measure: { pointIds: ['B', 'D'], offset: { x: 2, y: 3 }, alignment: 'right' } },
    };
    const flipped = flipArcMeasurement(m, [...s, m]);
    if ('error' in flipped) throw new Error(flipped.error);
    expect(flipped.object.labelAnchors).toBeUndefined();
    expect(flipped.object.labelOffsets).toBeUndefined();
    expect(m.labelAnchors?.measure.alignment).toBe('right');
  });

  it('flip tam 180°de de iki kez çevirince başa döner; menü yazısı "Diğer yarım çemberi ölç"', () => {
    const s = capSahnesi();
    const m = makeArcMeasurement({ circleId: 'c', pointIds: ['B', 'D'] }, s) as ArcMeasurement;
    const s1 = [...s, m];
    const r0 = resolveArc(m, s1)!;
    expect(arcFlipLabel(r0)).toBe('Diğer yarım çemberi ölç');
    const f1 = flipArcMeasurement(m, s1);
    if ('error' in f1) throw new Error(f1.error);
    const s2 = s1.map((o) => (o.id === m.id ? f1.object : o));
    const r1 = resolveArc(f1.object, s2)!;
    expect([r1.startId, r1.endId]).toEqual([r0.endId, r0.startId]);
    const f2 = flipArcMeasurement(f1.object, s2);
    if ('error' in f2) throw new Error(f2.error);
    const r2 = resolveArc(f2.object, s2.map((o) => (o.id === m.id ? f2.object : o)))!;
    expect([r2.startId, r2.endId]).toEqual([r0.startId, r0.endId]);
    expect(arcFlipLabel(resolveArc({ circleId: 'c', pointIds: ['B', 'C'] }, s)!)).toBe('Büyük yayı ölç');
    expect(arcFlipLabel(resolveArc({ circleId: 'c', pointIds: ['B', 'C'], major: true }, s)!)).toBe('Küçük yayı ölç');
  });

  it('dropDanglingArcMeasurements: çember ya da nokta yoksa ayıklar; ayıklanacak yoksa AYNI dizi', () => {
    const s = kullaniciSahnesi();
    expect(dropDanglingArcMeasurements(s)).toBe(s);
    const m = makeArcMeasurement({ circleId: 'pembe', pointIds: ['B', 'D'] }, s);
    const ok = [...s, m];
    expect(dropDanglingArcMeasurements(ok)).toBe(ok);
    expect(dropDanglingArcMeasurements(ok.filter((o) => o.id !== 'pembe')).some((o) => o.id === m.id)).toBe(false);
    expect(dropDanglingArcMeasurements(ok.filter((o) => o.id !== 'D')).some((o) => o.id === m.id)).toBe(false);
    const ara = { ...m, throughPointId: 'YOK' };
    expect(dropDanglingArcMeasurements([...s, ara]).some((o) => o.id === m.id)).toBe(false);
  });

  it('bağımlılıklar: iki uç, ara nokta ve çember', () => {
    const s = kullaniciSahnesi();
    expect(arcMeasurementDependencies(makeArcMeasurement({ circleId: 'pembe', pointIds: ['B', 'D'] }, s))).toEqual(['B', 'D', 'pembe']);
    expect(arcMeasurementDependencies(makeArcMeasurement({ circleId: 'pembe', pointIds: ['B', 'D'], throughPointId: 'C' }, s))).toEqual(['B', 'D', 'C', 'pembe']);
  });

  it('menü seçenekleri: noktadan (küçükten büyüğe), çemberden (önce komşular), çiftten; var olan ölçüm işaretlenir', () => {
    const s = kullaniciSahnesi();
    const b = arcOptionsForPoint('B', s);
    expect(b.map((g) => g.circle.id)).toEqual(['pembe']);
    expect(b[0].options.map((o) => `${o.title} ${o.degrees.toFixed(1)}`)).toEqual(['BD yayı 59.5', 'BC yayı 120.0']);
    expect(arcOptionsForPoint('A', s)[0].options.map((o) => o.title)).toEqual(['AF yayı']);
    expect(arcOptionsForCircle('pembe', s).map((o) => o.title)).toEqual(['CD yayı', 'BD yayı', 'BC yayı']);
    const m = makeArcMeasurement({ circleId: 'pembe', pointIds: ['D', 'B'] }, s);
    const s2 = [...s, m];
    expect(arcOptionsForPair('D', 'B', s2)).toEqual([expect.objectContaining({ circleId: 'pembe', pointIds: ['B', 'D'], title: 'BD yayı', existingId: m.id, existingShown: true })]);
    expect(findArcMeasurement({ circleId: 'pembe', pointIds: ['B', 'D'] }, s2)?.id).toBe(m.id);
    expect(arcOptionsForPair('B', 'F', s)).toEqual([]);
    expect(arcOptionsForPoint('G', s)).toEqual([]);
  });

  it('neredeyse üzerinde: kullanıcının D noktası için açıklama', () => {
    const s = kullaniciSahnesi();
    expect(arcNearMissHint('A', 'D', s)).toContain('D noktası “C Merkezli Çember” üzerinde görünüyor ama tam üzerinde değil (0,08 br uzakta)');
    expect(arcNearMissHint('B', 'G', s)).toBeNull();
  });
});

/**
 * YAYIN KİMLİĞİ: ölçülen yay, uç noktalar taşınırken taraf değiştirmemeli. Uç, karşı ucun "öteki yanına"
 * geçtiğinde küçük yay büyük yaya dönüşür; ölçüm yine AYNI yayı gösterir ve derece 180°'yi aşıp büyür.
 */
describe('arcMeasure: yay taşınırken taraf değiştirmez', () => {
  /** O(0,0) merkezli, R(6,0) yarıçap noktalı çember; P ve Q çembere bağlı, açıları verilir. */
  const donenSahne = (pAci: number, qAci: number): MathObject[] => {
    const r = 6;
    const uc = (id: string, a: number) =>
      nokta(id, r * Math.cos((a * Math.PI) / 180), r * Math.sin((a * Math.PI) / 180), { onObjectId: 'k' });
    return [
      nokta('O', 0, 0),
      nokta('R', r, 0),
      cember({ id: 'k', label: 'O Merkezli Çember', centerPointId: 'O', radiusPointId: 'R' }),
      uc('P', pAci),
      uc('Q', qAci),
    ];
  };
  /** Q'yu verilen açıya taşır (sahneyi kopyalayarak). */
  const qTasi = (s: MathObject[], aci: number): MathObject[] =>
    s.map((o) => (o.id === 'Q' ? { ...o, x: 6 * Math.cos((aci * Math.PI) / 180), y: 6 * Math.sin((aci * Math.PI) / 180) } : o));

  it('küçük yay ölçülen uç 180°yi geçince aynı tarafta kalır, derece 180°nin üstüne çıkar', () => {
    const s = donenSahne(10, 165);
    const m = makeArcMeasurement({ circleId: 'k', pointIds: ['P', 'Q'] }, s);
    const s1 = [...s, m];
    const r0 = resolveArc(m, s1)!;
    expect([r0.startId, r0.endId, deg(r0)]).toEqual(['P', 'Q', 155]);
    expect(m.startPointId).toBe('P');
    // Q, P'nin tam karşısının ötesine sürüklenir: eski kural burada yayı KARŞI tarafa atlatıyordu
    const s2 = qTasi(s1, 198.43);
    const r1 = resolveArc(m, s2)!;
    expect([r1.startId, r1.endId]).toEqual(['P', 'Q']);
    expect(deg(r1)).toBe(188.4);
    expect(r1.major).toBe(true);
    // Ortası da aynı tarafta kalır (vurgu karşı yarıya sıçramaz)
    expect(Math.abs(r1.midAngle - r0.midAngle)).toBeLessThan(Math.PI / 4);
    // Geri taşınınca yine küçük yay
    expect(deg(resolveArc(m, qTasi(s2, 165))!)).toBe(155);
  });

  it('menüden seçilen BÜYÜK yay da taşındıktan sonra büyük tarafta kalır', () => {
    const s = donenSahne(10, 150);
    const m = makeArcMeasurement({ circleId: 'k', pointIds: ['P', 'Q'], major: true }, s);
    const s1 = [...s, m];
    const r0 = resolveArc(m, s1)!;
    expect([r0.startId, r0.endId, deg(r0)]).toEqual(['Q', 'P', 220]);
    const r1 = resolveArc(m, qTasi(s1, 190))!;
    expect([r1.startId, r1.endId]).toEqual(['Q', 'P']);
    expect(deg(r1)).toBe(180);
    const r2 = resolveArc(m, qTasi(s1, 200))!;
    expect([r2.startId, r2.endId, deg(r2)]).toEqual(['Q', 'P', 170]);
  });

  it('eski kayıtlarda (başlangıç ucu yazılı değilken) ilk işlemde yazılır; yazılıysa dizi aynı kalır', () => {
    const s = donenSahne(10, 165);
    const eski = { ...makeArcMeasurement({ circleId: 'k', pointIds: ['P', 'Q'] }, s), startPointId: undefined } as ArcMeasurement;
    const once = [...s, eski];
    const sonra = dropDanglingArcMeasurements(once);
    expect(sonra).not.toBe(once);
    expect((sonra.find((o) => o.id === eski.id) as ArcMeasurement).startPointId).toBe('P');
    expect(dropDanglingArcMeasurements(sonra)).toBe(sonra);
  });

  it('ara nokta yayın üzerinden kalkarsa başlık ona göre değişir', () => {
    const s = kullaniciSahnesi();
    const m = makeArcMeasurement({ circleId: 'pembe', pointIds: ['B', 'D'], throughPointId: 'C' }, s);
    expect(arcTitle(m, [...s, m])).toBe('BCD yayı');
    // C çemberin öbür yayına taşınırsa (küçük yayın içine girmez) ad "BCD" kalmaz
    const cevrilmis = { ...m, startPointId: 'D' } as ArcMeasurement;
    expect(arcTitle(cevrilmis, [...s, cevrilmis])).toBe('BD yayı');
  });

  it('uçlar çakışınca ölçüm yok olmaz: rozet açıklaması üretilir', () => {
    const s = donenSahne(10, 165);
    const m = makeArcMeasurement({ circleId: 'k', pointIds: ['P', 'Q'] }, s);
    const cakisik = qTasi([...s, m], 10);
    expect(resolveArc(m, cakisik)).toBeNull();
    expect(arcUnresolvedText(m, cakisik)).toBe('P ve Q çakıştı; aralarında yay yok');
    const merkezde = cakisik.map((o) => (o.id === 'Q' ? { ...o, x: 0, y: 0 } : o));
    expect(arcUnresolvedText(m, merkezde)).toBe('Q çemberin merkezinde; yay yok');
  });
});
