import { describe, it, expect } from 'vitest';
import type { MathObject, MeasurementObject, SegmentObject } from '@/types/math';
import { collectDependentIds, objectDependencies } from '@/state/WorkspaceContext';
import { copyObjects, pasteObjects } from '@/math/objectClipboard';
import {
  arasindaEngelVar,
  collinearSegmentChain,
  distanceLabelLayouts,
  distanceLabelLevel,
  kenarEtiketiYani,
  olcuCizgisiGerekli,
  tasiyiciCizgiVar,
  isLengthShown,
  lengthOptionsAtPoint,
  orderedPointsOnStraight,
  straightLengthOptions,
  withLengthMeasurement,
} from '../partialLengths';

const t0 = 1750000000000;
const nokta = (id: string, x: number, y: number, extra: Record<string, unknown> = {}): MathObject =>
  ({ id, type: 'point', label: id, showLabel: true, x, y, visible: true, isIndependent: true, createdAt: t0, ...extra }) as MathObject;
const yap = (o: Record<string, unknown>): MathObject =>
  ({ showLabel: true, visible: true, createdAt: t0, label: String(o.id), color: '#000', ...o }) as MathObject;
const ciftler = (opts: { fromId: string; toId: string; role: string }[]) => opts.map((o) => `${o.role}:${o.fromId}${o.toId}`);

/** A(-3,0) — P(-1,0, [AB]'ye bağlı) — B(3,0) */
const parcaUzerindeNokta = () => [
  nokta('A', -3, 0),
  nokta('B', 3, 0),
  yap({ id: 'ab', type: 'segment', label: '[AB]', startPointId: 'A', endPointId: 'B', showLength: true }),
  nokta('P', -1, 0, { onObjectId: 'ab' }),
];

/** splitSegmentAtPoint çıktısı: [AB] silinir, [AP] + [PB] kalır, P'nin bağı çözülür */
const bolunmus = () => [
  nokta('A', -3, 0),
  nokta('B', 3, 0),
  nokta('P', -1, 0),
  yap({ id: 'ap', type: 'segment', label: '[AP]', startPointId: 'A', endPointId: 'P' }),
  yap({ id: 'pb', type: 'segment', label: '[PB]', startPointId: 'P', endPointId: 'B' }),
];

describe('Parça üzerindeki nokta: uzunluk seçenekleri', () => {
  it('noktasız parçada yalnızca baştan sona seçeneği vardır', () => {
    const o = [nokta('A', 0, 0), nokta('B', 4, 0), yap({ id: 'ab', type: 'segment', startPointId: 'A', endPointId: 'B' })];
    expect(ciftler(straightLengthOptions(o, 'ab').options)).toEqual(['whole:AB']);
  });

  it('parçaya sağ tık: [AB] baştan sona, [AP] P noktasına kadar, [PB] P noktasından sona', () => {
    expect(ciftler(straightLengthOptions(parcaUzerindeNokta(), 'ab').options)).toEqual([
      'whole:AB',
      'toPoint:AP',
      'fromPoint:PB',
    ]);
  });

  it('bağlı olmayan ama geometrik olarak üzerinde duran nokta da sayılır', () => {
    const o = parcaUzerindeNokta().map((x) => (x.id === 'P' ? nokta('P', -1, 0) : x));
    expect(orderedPointsOnStraight(o, 'ab').map((p) => p.id)).toEqual(['A', 'P', 'B']);
  });

  it('parça ters yönde çizilmişse baş, başlangıç noktasıdır', () => {
    const o = [nokta('A', 3, 0), nokta('B', -3, 0), yap({ id: 'ab', type: 'segment', startPointId: 'A', endPointId: 'B' }), nokta('P', 1, 0, { onObjectId: 'ab' })];
    expect(ciftler(straightLengthOptions(o, 'ab').options)).toEqual(['whole:AB', 'toPoint:AP', 'fromPoint:PB']);
  });

  it('noktanın kendi menüsü aynı ölçümleri verir', () => {
    const r = lengthOptionsAtPoint(parcaUzerindeNokta(), 'P');
    expect(r?.hostId).toBe('ab');
    expect(ciftler(r!.options)).toEqual(['whole:AB', 'toPoint:AP', 'fromPoint:PB']);
  });

  it('parçanın UCUNA sağ tıklanınca kısmi uzunluk sunulmaz', () => {
    expect(lengthOptionsAtPoint(parcaUzerindeNokta(), 'A')).toBeNull();
  });

  it('iki nokta varken her biri için ayrı madde üretilir; seçili nokta verilirse yalnızca o', () => {
    const o = [...parcaUzerindeNokta(), nokta('Q', 1, 0, { onObjectId: 'ab' })];
    expect(ciftler(straightLengthOptions(o, 'ab').options)).toEqual([
      'whole:AB', 'toPoint:AP', 'fromPoint:PB', 'toPoint:AQ', 'fromPoint:QB', 'between:PQ',
    ]);
    expect(ciftler(straightLengthOptions(o, 'ab', 'Q').options)).toEqual(['whole:AB', 'toPoint:AQ', 'fromPoint:QB', 'between:PQ']);
    expect(ciftler(lengthOptionsAtPoint(o, 'P')!.options)).toEqual(['whole:AB', 'toPoint:AP', 'fromPoint:PB', 'between:PQ']);
  });
});

describe('Bölünmüş parça: bütün zincir de ölçülebilir', () => {
  it('[AP] + [PB] aynı doğruda uç uca olduğu için tek zincirdir', () => {
    expect(collinearSegmentChain(bolunmus(), 'ap').map((s) => s.id).sort()).toEqual(['ap', 'pb']);
  });

  it('parçaya sağ tık: bütün [AB], bu parça [AP] ve [PB]', () => {
    expect(ciftler(straightLengthOptions(bolunmus(), 'ap').options)).toEqual(['whole:AB', 'piece:AP', 'fromPoint:PB']);
    expect(ciftler(straightLengthOptions(bolunmus(), 'pb').options)).toEqual(['whole:AB', 'piece:PB', 'toPoint:AP']);
  });

  it('bölme noktasına sağ tık da zinciri görür; parça noktaya göre adlandırılır', () => {
    const r = lengthOptionsAtPoint(bolunmus(), 'P');
    expect(ciftler(r!.options)).toEqual(['whole:AB', 'toPoint:AP', 'fromPoint:PB']);
    expect(r!.options.every((o) => o.role === 'whole' || o.viaId === 'P')).toBe(true);
  });

  it('iki kez bölünmüş zincirde ara noktanın menüsünde iki ara noktanın parçası "arası" olarak adlandırılır', () => {
    const o = [nokta('A', -3, 0), nokta('B', 3, 0), nokta('P', -1, 0), nokta('Q', 1, 0),
      yap({ id: 'ap', type: 'segment', startPointId: 'A', endPointId: 'P' }),
      yap({ id: 'pq', type: 'segment', startPointId: 'P', endPointId: 'Q' }),
      yap({ id: 'qb', type: 'segment', startPointId: 'Q', endPointId: 'B' })];
    expect(ciftler(lengthOptionsAtPoint(o, 'Q')!.options)).toEqual(['whole:AB', 'between:PQ', 'toPoint:AQ', 'fromPoint:QB']);
    expect(ciftler(lengthOptionsAtPoint(o, 'P')!.options)).toEqual(['whole:AB', 'toPoint:AP', 'fromPoint:PB', 'between:PQ']);
  });

  it('aynı doğruda OLMAYAN komşu parça zincire katılmaz', () => {
    const o = [...bolunmus(), nokta('C', 3, 2), yap({ id: 'bc', type: 'segment', startPointId: 'B', endPointId: 'C' })];
    expect(collinearSegmentChain(o, 'ap').map((s) => s.id).sort()).toEqual(['ap', 'pb']);
  });

  it('geri dönen (üst üste binen) parça zincir sayılmaz', () => {
    const o = [nokta('A', 0, 0), nokta('B', 4, 0), nokta('C', 2, 0),
      yap({ id: 'ab', type: 'segment', startPointId: 'A', endPointId: 'B' }),
      yap({ id: 'bc', type: 'segment', startPointId: 'B', endPointId: 'C' })];
    expect(collinearSegmentChain(o, 'ab').map((s) => s.id)).toEqual(['ab']);
  });
});

describe('Doğru ve ışın', () => {
  it('doğru üzerindeki bağlı nokta için kısmi uzunluklar', () => {
    const o = [nokta('C', -3, 3), nokta('D', 3, 3), yap({ id: 'cd', type: 'line', point1Id: 'C', point2Id: 'D' }), nokta('F', 0, 3, { onObjectId: 'cd' })];
    expect(ciftler(straightLengthOptions(o, 'cd').options)).toEqual(['whole:CD', 'toPoint:CF', 'fromPoint:FD']);
  });
});

describe('Ölç / gizle: tek etiket, yineleme yok', () => {
  it('kendi uçlarıyla aynı çift, parçanın showLength bayrağını kullanır', () => {
    const o = parcaUzerindeNokta().map((x) => (x.id === 'ab' ? ({ ...x, showLength: false } as MathObject) : x));
    const acik = withLengthMeasurement(o, 'A', 'B', true, 'olc-1');
    expect(acik.find((x) => x.id === 'ab')).toMatchObject({ showLength: true });
    expect(acik.some((x) => x.type === 'measurement')).toBe(false);
    expect(isLengthShown(acik, 'B', 'A')).toBe(true);
    const kapali = withLengthMeasurement(acik, 'B', 'A', false, 'olc-2');
    expect(kapali.find((x) => x.id === 'ab')).toMatchObject({ showLength: false });
  });

  it('aynı uçlu doğru önce gelse bile parçanın bayrağı tercih edilir', () => {
    const o = [
      nokta('A', 0, 0), nokta('B', 4, 0),
      yap({ id: 'l', type: 'line', point1Id: 'A', point2Id: 'B' }),
      yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'B' }),
    ];
    const r = withLengthMeasurement(o, 'A', 'B', true, 'x');
    expect(r.find((x) => x.id === 's')).toMatchObject({ showLength: true });
    expect((r.find((x) => x.id === 'l') as { showLength?: boolean }).showLength).toBeUndefined();
  });

  it('aynı uçlu doğrunun uzunluğu zaten görünüyorsa ölçülmüş sayılır; gizle hepsini kapatır', () => {
    const o = [
      nokta('A', 0, 0), nokta('B', 4, 0),
      yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'B' }),
      yap({ id: 'l', type: 'line', point1Id: 'A', point2Id: 'B', showLength: true }),
    ];
    expect(isLengthShown(o, 'A', 'B')).toBe(true);
    expect(withLengthMeasurement(o, 'A', 'B', true, 'x')).toBe(o);
    const kapali = withLengthMeasurement(o, 'A', 'B', false, 'x');
    expect(kapali.filter((x) => (x as { showLength?: boolean }).showLength)).toEqual([]);
  });

  it('[AP] için CANLI distance ölçümü eklenir; ikinci istek yeni nesne üretmez', () => {
    const o = parcaUzerindeNokta();
    const bir = withLengthMeasurement(o, 'A', 'P', true, 'olc-1');
    expect(bir.filter((x) => x.type === 'measurement')).toEqual([
      expect.objectContaining({ id: 'olc-1', kind: 'distance', pointIds: ['A', 'P'], label: '|AP|', showValue: true }),
    ]);
    expect(withLengthMeasurement(bir, 'P', 'A', true, 'olc-2')).toBe(bir);
    const gizli = withLengthMeasurement(bir, 'A', 'P', false, 'olc-3');
    expect(isLengthShown(gizli, 'A', 'P')).toBe(false);
    const tekrar = withLengthMeasurement(gizli, 'A', 'P', true, 'olc-4');
    expect(tekrar.filter((x) => x.type === 'measurement').map((x) => x.id)).toEqual(['olc-1']);
    expect(isLengthShown(tekrar, 'A', 'P')).toBe(true);
  });

  it('bölmeden sonra [AP] parçası doğarsa, açık |AP| ölçümü "ölçülmüş" sayılır ve ikinci etiket açılmaz', () => {
    const once = withLengthMeasurement(parcaUzerindeNokta(), 'A', 'P', true, 'olc-1');
    const sonra = [...bolunmus(), once.find((x) => x.id === 'olc-1')!];
    expect(isLengthShown(sonra, 'A', 'P')).toBe(true);
    expect(withLengthMeasurement(sonra, 'A', 'P', true, 'olc-2')).toBe(sonra);
    const gizli = withLengthMeasurement(sonra, 'A', 'P', false, 'x');
    expect(isLengthShown(gizli, 'A', 'P')).toBe(false);
  });
});

describe('Silme, kopyalama, yerleşim', () => {
  it('nokta silinince ona dayanan |AP| ölçümü de silinir', () => {
    const o = withLengthMeasurement(parcaUzerindeNokta(), 'A', 'P', true, 'olc-1');
    expect([...collectDependentIds(o, ['P'])].sort()).toEqual(['P', 'olc-1']);
  });

  it('parça silinince üzerindeki P ve |AP| gider', () => {
    const o = withLengthMeasurement(parcaUzerindeNokta(), 'A', 'P', true, 'olc-1');
    expect([...collectDependentIds(o, ['ab'])].sort()).toEqual(['P', 'ab', 'olc-1']);
  });

  it('bölünmüş zincirde bir parçayı silmek bütün |AB| ölçümünü silmez', () => {
    const o = withLengthMeasurement(bolunmus(), 'A', 'B', true, 'olc-ab');
    expect([...collectDependentIds(o, ['pb'])].sort()).toEqual(['pb']);
  });

  it('kopyala/yapıştır ölçümün nokta kimliklerini yeniden eşler', () => {
    const o = withLengthMeasurement(parcaUzerindeNokta(), 'A', 'P', true, 'olc-1');
    const pano = copyObjects(o, ['olc-1']);
    const yapistirilan = pasteObjects(pano, o, { x: 10, y: 10 });
    const m = yapistirilan.objects.find((x) => x.type === 'measurement') as MeasurementObject;
    expect(m.kind).toBe('distance');
    for (const d of objectDependencies(m)) expect(yapistirilan.objects.some((x) => x.id === d)).toBe(true);
  });

  it('kapsayan |AB| etiketi, içindeki |AP| etiketinin bir kat dışında durur', () => {
    let o: MathObject[] = bolunmus();
    o = withLengthMeasurement(o, 'A', 'B', true, 'm-ab');
    o = [...o, yap({ id: 'm-ap', type: 'measurement', kind: 'distance', pointIds: ['A', 'P'], showValue: true })];
    expect(distanceLabelLevel(o, 'm-ap')).toBe(0);
    expect(distanceLabelLevel(o, 'm-ab')).toBe(1);
    expect((o.find((x) => x.id === 'ap') as SegmentObject).showLength).toBeUndefined();
  });

  it('kısmen örtüşen etiketler (biri ötekini kapsamasa da) farklı katlara konur', () => {
    const o: MathObject[] = [
      nokta('A', -3, 0), nokta('P', -1, 0), nokta('Q', 1, 0), nokta('B', 3, 0),
      yap({ id: 'm-ap', type: 'measurement', kind: 'distance', pointIds: ['A', 'P'], showValue: true }),
      yap({ id: 'm-aq', type: 'measurement', kind: 'distance', pointIds: ['A', 'Q'], showValue: true }),
      yap({ id: 'm-pb', type: 'measurement', kind: 'distance', pointIds: ['P', 'B'], showValue: true }),
    ];
    const kat = (id: string) => distanceLabelLevel(o, id);
    expect(kat('m-ap')).toBe(0);
    expect(kat('m-aq')).not.toBe(kat('m-ap'));
    expect(kat('m-pb')).not.toBe(kat('m-aq'));
  });

  it('eğik parçada eşit uzunluklu örtüşen etiketler de aynı kata düşmez', () => {
    const [ax, ay, bx, by] = [1.7946, 1.7312, -3.273, 3.8317];
    const [px, py] = [ax + (bx - ax) / 3, ay + (by - ay) / 3];
    const [qx, qy] = [ax + ((bx - ax) * 2) / 3, ay + ((by - ay) * 2) / 3];
    const o: MathObject[] = [
      nokta('A', ax, ay), nokta('B', bx, by), nokta('P', px, py), nokta('Q', qx, qy),
      yap({ id: 'm-aq', type: 'measurement', kind: 'distance', pointIds: ['A', 'Q'], showValue: true }),
      yap({ id: 'm-pb', type: 'measurement', kind: 'distance', pointIds: ['P', 'B'], showValue: true }),
    ];
    expect(distanceLabelLevel(o, 'm-aq')).not.toBe(distanceLabelLevel(o, 'm-pb'));
  });
});

describe('Kesikli ölçü çizgisi yalnız arada engel varken', () => {
  const olcum = (id: string, a: string, b: string, extra: Record<string, unknown> = {}) =>
    yap({ id, type: 'measurement', kind: 'distance', pointIds: [a, b], showValue: true, ...extra });
  /** Ekran görüntüsündeki sahne: [AC] üzerinde D ve E; |AE| = 11, |DE| = 6, |EC| = 4 */
  const acUzerindeDE = (): MathObject[] => [
    nokta('A', 0, 0), nokta('C', 15, 0),
    yap({ id: 'ac', type: 'segment', label: '[AC]', startPointId: 'A', endPointId: 'C' }),
    nokta('D', 5, 0, { onObjectId: 'ac' }), nokta('E', 11, 0, { onObjectId: 'ac' }),
    olcum('m-ae', 'A', 'E'), olcum('m-de', 'D', 'E'), olcum('m-ec', 'E', 'C'),
  ];

  it('[AC] üzerinde D, E: yalnız |AE| kesikli (arada D var), |DE| ve |EC| yalın', () => {
    const o = acUzerindeDE();
    expect(arasindaEngelVar(o, 'm-ae')).toBe(true);
    expect(arasindaEngelVar(o, 'm-de')).toBe(false);
    expect(arasindaEngelVar(o, 'm-ec')).toBe(false);
    const y = distanceLabelLayouts(o);
    expect(y.get('m-de')).toEqual({ kesikli: false, kat: 0 });
    expect(y.get('m-ec')).toEqual({ kesikli: false, kat: 0 });
    // |AE| yakın bantta duran |DE| ile örtüşür: kesikli çizgi bandın dışından (1. kat) başlar
    expect(y.get('m-ae')).toEqual({ kesikli: true, kat: 1 });
  });

  it('eğik parçada da aynı sonuç', () => {
    const [ax, ay, cx, cy] = [1.7946, 1.7312, -3.273, 3.8317];
    const ara = (k: number): [number, number] => [ax + (cx - ax) * k, ay + (cy - ay) * k];
    const o: MathObject[] = [
      nokta('A', ax, ay), nokta('C', cx, cy),
      yap({ id: 'ac', type: 'segment', label: '[AC]', startPointId: 'A', endPointId: 'C' }),
      nokta('D', ...ara(1 / 3), { onObjectId: 'ac' }), nokta('E', ...ara(11 / 15), { onObjectId: 'ac' }),
      olcum('m-ae', 'A', 'E'), olcum('m-de', 'D', 'E'), olcum('m-ec', 'E', 'C'),
    ];
    expect(arasindaEngelVar(o, 'm-ae')).toBe(true);
    expect(arasindaEngelVar(o, 'm-de')).toBe(false);
    expect(arasindaEngelVar(o, 'm-ec')).toBe(false);
  });

  it('yalnız ölçülen iki nokta varken engel yoktur; üzerinde durduğu parça ve bölünmüş zincir kesmez', () => {
    expect(arasindaEngelVar([...parcaUzerindeNokta(), olcum('m', 'A', 'P')], 'm')).toBe(false);
    expect(arasindaEngelVar([...bolunmus(), olcum('m', 'A', 'P')], 'm')).toBe(false);
    // Bölünmüş zincirin tamamı: P arada
    expect(arasindaEngelVar([...bolunmus(), olcum('m', 'A', 'B')], 'm')).toBe(true);
  });

  it('gizli nokta, doğrunun dışındaki nokta ve uzantıdaki nokta engel değildir', () => {
    const taban = [nokta('A', 0, 0), nokta('B', 10, 0), olcum('m', 'A', 'B')];
    expect(arasindaEngelVar([...taban, nokta('G', 4, 0, { visible: false })], 'm')).toBe(false);
    expect(arasindaEngelVar([...taban, nokta('Y', 4, 0.05)], 'm')).toBe(false);
    expect(arasindaEngelVar([...taban, nokta('U', 12, 0)], 'm')).toBe(false);
    expect(arasindaEngelVar([...taban, nokta('K', 4, 0.0004)], 'm')).toBe(true);
  });

  it('aralığı iç noktada kesen doğru parçası, doğru, ışın ve çokgen kenarı engeldir', () => {
    const taban = [nokta('A', 0, 0), nokta('B', 10, 0), olcum('m', 'A', 'B'), nokta('P', 5, -2), nokta('Q', 5, 3)];
    const ile = (...eklenen: MathObject[]) => arasindaEngelVar([...taban, ...eklenen], 'm');
    expect(ile(yap({ id: 's', type: 'segment', startPointId: 'P', endPointId: 'Q' }))).toBe(true);
    expect(ile(yap({ id: 'd', type: 'line', point1Id: 'P', point2Id: 'Q' }))).toBe(true);
    expect(ile(yap({ id: 'r', type: 'ray', startPointId: 'P', throughPointId: 'Q' }))).toBe(true);
    expect(ile(yap({ id: 'r2', type: 'ray', startPointId: 'Q', throughPointId: 'P' }))).toBe(true);
    // Aralıktan uzağa bakan ışın ve aralığa ulaşmayan parça kesmez
    expect(ile(nokta('R', 5, 5), yap({ id: 'r3', type: 'ray', startPointId: 'Q', throughPointId: 'R' }))).toBe(false);
    expect(ile(nokta('R', 5, 5), yap({ id: 's2', type: 'segment', startPointId: 'Q', endPointId: 'R' }))).toBe(false);
    // Çokgen kenarı keser
    expect(ile(nokta('R', 8, 3), yap({ id: 'poly', type: 'polygon', pointIds: ['P', 'R', 'Q'] }))).toBe(true);
    // Gizli kesen parça sayılmaz
    expect(ile(yap({ id: 's', type: 'segment', startPointId: 'P', endPointId: 'Q', visible: false }))).toBe(false);
  });

  it('uçlardan çıkan çizgiler ve kenarı ölçülen çokgen engel değildir', () => {
    const taban = [nokta('A', 0, 0), nokta('B', 10, 0), nokta('X', 3, 6), olcum('m', 'A', 'B')];
    const ile = (...eklenen: MathObject[]) => arasindaEngelVar([...taban, ...eklenen], 'm');
    expect(ile(yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'X' }))).toBe(false);
    expect(ile(yap({ id: 'd', type: 'line', point1Id: 'X', point2Id: 'B' }))).toBe(false);
    expect(ile(yap({ id: 'r', type: 'ray', startPointId: 'X', throughPointId: 'A' }))).toBe(false);
    expect(ile(yap({ id: 'poly', type: 'polygon', pointIds: ['A', 'B', 'X'] }))).toBe(false);
    // Aynı doğrultudaki (üst üste binen) doğru da kesmez
    expect(ile(nokta('Z', 20, 0), yap({ id: 'd2', type: 'line', point1Id: 'A', point2Id: 'Z' }))).toBe(false);
  });

  it('ucu aralığın içinde duran (T biçimli) parça, ucu gizli olsa da engeldir', () => {
    const o = [
      nokta('A', 0, 0), nokta('B', 10, 0), olcum('m', 'A', 'B'),
      nokta('T', 4, 0, { visible: false }), nokta('U', 4, 5),
      yap({ id: 's', type: 'segment', startPointId: 'T', endPointId: 'U' }),
    ];
    expect(arasindaEngelVar(o, 'm')).toBe(true);
  });

  it('yalın etiketle örtüşmeyen kesikli çizgi en yakın katta (0) kalır', () => {
    const o: MathObject[] = [
      nokta('A', 0, 0), nokta('P', 4, 0), nokta('B', 10, 0),
      yap({ id: 'ab', type: 'segment', label: '[AB]', startPointId: 'A', endPointId: 'B' }),
      olcum('m-ab', 'A', 'B'),
    ];
    expect(distanceLabelLayouts(o).get('m-ab')).toEqual({ kesikli: true, kat: 0 });
    // Aynı doğrudaki |PB| yalın etiketi yakın bandı tutar: |AB| bir kat dışarı çıkar
    const o2 = [...o, olcum('m-pb', 'P', 'B')];
    expect(distanceLabelLayouts(o2).get('m-pb')).toEqual({ kesikli: false, kat: 0 });
    expect(distanceLabelLayouts(o2).get('m-ab')).toEqual({ kesikli: true, kat: 1 });
    expect(distanceLabelLevel(o2, 'm-ab')).toBe(1);
  });

  it('başka doğrudaki yalın etiket kat hesabını etkilemez; gizli ölçüm yer tutmaz', () => {
    const o: MathObject[] = [
      nokta('A', 0, 0), nokta('P', 4, 0), nokta('B', 10, 0), nokta('K', 0, 5),
      yap({ id: 'ak', type: 'segment', label: '[AK]', startPointId: 'A', endPointId: 'K' }),
      olcum('m-ab', 'A', 'B'), olcum('m-ak', 'A', 'K'), olcum('m-pb', 'P', 'B', { showValue: false }),
    ];
    const y = distanceLabelLayouts(o);
    expect(y.get('m-ab')).toEqual({ kesikli: true, kat: 0 });
    expect(y.get('m-ak')).toEqual({ kesikli: false, kat: 0 });
    expect(y.has('m-pb')).toBe(false);
  });
});

describe('Taşıyıcı çizgisi olmayan aralıkta kesikli ölçü çizgisi kalır', () => {
  const olcum = (id: string, a: string, b: string, extra: Record<string, unknown> = {}) =>
    yap({ id, type: 'measurement', kind: 'distance', pointIds: [a, b], showValue: true, ...extra });
  const parca = (id: string, a: string, b: string, extra: Record<string, unknown> = {}) =>
    yap({ id, type: 'segment', label: id, startPointId: a, endPointId: b, ...extra });

  it('kullanıcının sahnesi değişmez: [AC] üzerinde |DE| ve |EC| yalın, |AE| kesikli', () => {
    const o: MathObject[] = [
      nokta('A', 0, 0), nokta('C', 15, 0), parca('ac', 'A', 'C'),
      nokta('D', 5, 0, { onObjectId: 'ac' }), nokta('E', 11, 0, { onObjectId: 'ac' }),
      olcum('m-ae', 'A', 'E'), olcum('m-de', 'D', 'E'), olcum('m-ec', 'E', 'C'),
    ];
    for (const id of ['m-ae', 'm-de', 'm-ec']) expect(tasiyiciCizgiVar(o, id)).toBe(true);
    expect(olcuCizgisiGerekli(o, 'm-ae')).toBe(true);
    expect(olcuCizgisiGerekli(o, 'm-de')).toBe(false);
    expect(olcuCizgisiGerekli(o, 'm-ec')).toBe(false);
  });

  it('iki serbest nokta arasında (çizgi yok) ölçü kesikli çizgiyle gösterilir', () => {
    const o = [nokta('K', 0, 0), nokta('L', 14, 0), olcum('m', 'K', 'L')];
    expect(arasindaEngelVar(o, 'm')).toBe(false);
    expect(tasiyiciCizgiVar(o, 'm')).toBe(false);
    expect(olcuCizgisiGerekli(o, 'm')).toBe(true);
    expect(distanceLabelLayouts(o).get('m')).toEqual({ kesikli: true, kat: 0 });
  });

  it('gizli taşıyıcı sayılmaz: [AC] gizliyken |DE| ve |EC| kesikli', () => {
    const o: MathObject[] = [
      nokta('A', 0, 0), nokta('C', 15, 0), parca('ac', 'A', 'C', { visible: false }),
      nokta('D', 5, 0, { onObjectId: 'ac' }), nokta('E', 11, 0, { onObjectId: 'ac' }),
      olcum('m-de', 'D', 'E'), olcum('m-ec', 'E', 'C'),
    ];
    expect(olcuCizgisiGerekli(o, 'm-de')).toBe(true);
    expect(olcuCizgisiGerekli(o, 'm-ec')).toBe(true);
  });

  it('çizgiden çekilen nokta: |FH| artık [FG] üzerinde değil, kesikli', () => {
    const taban = [nokta('F', 0, 0), nokta('G', 12, 0), parca('fg', 'F', 'G'), olcum('m', 'F', 'H')];
    expect(olcuCizgisiGerekli([...taban, nokta('H', 7, 0)], 'm')).toBe(false);
    expect(olcuCizgisiGerekli([...taban, nokta('H', 7, 1.5)], 'm')).toBe(true);
    // Parçanın uzantısındaki nokta da taşınmaz: [FG] H'ye kadar uzanmıyor
    expect(olcuCizgisiGerekli([...taban, nokta('H', 14, 0)], 'm')).toBe(true);
  });

  it('bölünmüş zincirin parçaları birlikte taşır; aradaki boşluk taşımaz', () => {
    const o: MathObject[] = [
      nokta('A', 0, 0), nokta('P', 4, 0), nokta('B', 10, 0),
      parca('ap', 'A', 'P'), parca('pb', 'P', 'B'),
      olcum('m-ab', 'A', 'B'), olcum('m-ap', 'A', 'P'),
    ];
    expect(tasiyiciCizgiVar(o, 'm-ab')).toBe(true);
    expect(tasiyiciCizgiVar(o, 'm-ap')).toBe(true);
    // [PB] yoksa [AB] boyunca 4..10 boş kalır
    expect(tasiyiciCizgiVar(o.filter((x) => x.id !== 'pb'), 'm-ab')).toBe(false);
  });

  it('doğru, ışın ve çokgen kenarı da taşıyıcıdır; ışının öbür yanı taşınmaz', () => {
    const taban = [nokta('A', 0, 0), nokta('B', 10, 0), nokta('C', 4, 0), olcum('m', 'A', 'C')];
    const ile = (...eklenen: MathObject[]) => tasiyiciCizgiVar([...taban, ...eklenen], 'm');
    expect(ile(yap({ id: 'd', type: 'line', point1Id: 'A', point2Id: 'B' }))).toBe(true);
    expect(ile(yap({ id: 'r', type: 'ray', startPointId: 'A', throughPointId: 'B' }))).toBe(true);
    expect(ile(yap({ id: 'r2', type: 'ray', startPointId: 'C', throughPointId: 'B' }))).toBe(false);
    expect(ile(nokta('X', 5, 5), yap({ id: 'poly', type: 'polygon', pointIds: ['A', 'B', 'X'] }))).toBe(true);
    expect(ile(nokta('X', 5, 5), yap({ id: 'poly', type: 'polygon', pointIds: ['A', 'X', 'B'] }))).toBe(true);
    // Dik doğrultudaki parça taşımaz
    expect(ile(nokta('Y', 0, 5), parca('ay', 'A', 'Y'))).toBe(false);
  });
});

describe('kenarEtiketiYani: uzunluğu gösterilen çokgen kenarındaki ölçüm', () => {
  const olcum = (id: string, a: string, b: string) =>
    yap({ id, type: 'measurement', kind: 'distance', pointIds: [a, b], showValue: true });
  const ucgen = (edgeLabels?: number[]): MathObject[] => [
    nokta('A', -8, 4), nokta('B', 0, 4), nokta('C', -4, -1), nokta('D', -1.5, 4),
    yap({ id: 'u', type: 'polygon', pointIds: ['A', 'B', 'C'], ...(edgeLabels ? { edgeLabels } : {}) }),
    olcum('m-ad', 'A', 'D'), olcum('m-db', 'D', 'B'), olcum('m-ac', 'A', 'C'),
  ];

  it('üst kenarın etiketi çokgenin dışında, yukarıda: yan (0, 1)', () => {
    const o = ucgen([0, 1, 2]);
    for (const id of ['m-ad', 'm-db']) {
      const yan = kenarEtiketiYani(o, id)!;
      expect(yan.x).toBeCloseTo(0, 9);
      expect(yan.y).toBeCloseTo(1, 9);
    }
    // Eğik kenar AC (2. kenar: C → A): dışa bakan normal sola ve aşağı
    const yan = kenarEtiketiYani(o, 'm-ac')!;
    expect(yan.x).toBeLessThan(0);
  });

  it('kenarın uzunluğu gösterilmiyorsa, çokgen gizliyse ya da ölçüm kenarda değilse null', () => {
    expect(kenarEtiketiYani(ucgen(), 'm-ad')).toBeNull();
    expect(kenarEtiketiYani(ucgen([1, 2]), 'm-ad')).toBeNull();
    const gizli = ucgen([0]).map((x) => (x.id === 'u' ? { ...x, visible: false } : x)) as MathObject[];
    expect(kenarEtiketiYani(gizli, 'm-ad')).toBeNull();
    const disarida = [...ucgen([0]), nokta('K', 3, 4), nokta('L', 6, 4), olcum('m-kl', 'K', 'L')];
    expect(kenarEtiketiYani(disarida, 'm-kl')).toBeNull();
  });
});
