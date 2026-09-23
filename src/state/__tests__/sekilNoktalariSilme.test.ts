import { describe, it, expect } from 'vitest';
import { collectDependentIds, collectDeletionIds, planDeletion, applyDeletionPlan } from '@/state/WorkspaceContext';
import type { MathObject } from '@/types/math';

/**
 * ŞEKLİN KENDİ NOKTALARI KURALI (kullanıcı: "bazen çokgenleri şekilleri sildiğimde noktaları kalıyor neden").
 * Bir ŞEKİL silinince, silme sonrasında başka hiçbir nesnenin kullanmadığı kendi tanım noktaları da gider.
 * Nokta silme, açı/ölçüm silme ve "Yalnızca şekli sil" bu kuralın dışındadır.
 */

const t = 1750000000000;
const nokta = (id: string, ek: Record<string, unknown> = {}): MathObject =>
  ({ id, type: 'point', label: id, showLabel: true, x: 0, y: 0, visible: true, isIndependent: true, createdAt: t, ...ek }) as MathObject;

const yap = (o: Record<string, unknown>): MathObject =>
  ({ showLabel: true, visible: true, createdAt: t, label: String(o.id), ...o }) as MathObject;

const sil = (objeler: MathObject[], ids: string[], secenek = {}) => [...planDeletion(objeler, ids, secenek).removal].sort();
const kendi = (objeler: MathObject[], ids: string[], secenek = {}) => planDeletion(objeler, ids, secenek).ownPointIds;

const ucgen = () => [
  nokta('A'), nokta('B'), nokta('C'),
  yap({ id: 'ucgen', type: 'polygon', pointIds: ['A', 'B', 'C'] }),
];

describe('Şeklin kendi noktaları: temel türler', () => {
  it('çokgen: köşeleri de gider', () => {
    expect(sil(ucgen(), ['ucgen'])).toEqual(['A', 'B', 'C', 'ucgen']);
    expect(kendi(ucgen(), ['ucgen'])).toEqual(['A', 'B', 'C']);
  });

  it('doğru parçası, doğru ve ışın: iki ucu da gider', () => {
    for (const nesne of [
      yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'B' }),
      yap({ id: 's', type: 'line', point1Id: 'A', point2Id: 'B' }),
      yap({ id: 's', type: 'ray', startPointId: 'A', throughPointId: 'B' }),
    ]) {
      const o = [nokta('A'), nokta('B'), nesne];
      expect(sil(o, ['s'])).toEqual(['A', 'B', 's']);
    }
  });

  it('elips: merkezi gider', () => {
    const o = [nokta('M'), yap({ id: 'e', type: 'ellipse', centerPointId: 'M', radiusX: 3, radiusY: 2 })];
    expect(sil(o, ['e'])).toEqual(['M', 'e']);
  });

  it('yay ve daire dilimi: merkez, başlangıç ve yön noktası gider', () => {
    for (const tur of ['arc', 'sector']) {
      const o = [nokta('M'), nokta('B'), nokta('C'), yap({ id: 'y', type: tur, centerPointId: 'M', startPointId: 'B', directionPointId: 'C' })];
      expect(sil(o, ['y'])).toEqual(['B', 'C', 'M', 'y']);
    }
  });

  it('sabit uzunluklu parça (öteleme ile kurulmuş uç) iki ucuyla birlikte gider', () => {
    const o = [
      nokta('A'),
      nokta('B', { isIndependent: false, construction: { kind: 'translate', sourceId: 'A', vector: { x: 3, y: 0 } } }),
      yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'B' }),
    ];
    expect(sil(o, ['s'])).toEqual(['A', 'B', 's']);
  });
});

describe('Şeklin kendi noktaları: çember türleri', () => {
  const merkezli = () => [nokta('M'), nokta('R'), yap({ id: 'c', type: 'circle', centerPointId: 'M', radiusPointId: 'R' })];
  const sabit = () => [nokta('M'), yap({ id: 'c', type: 'circle', centerPointId: 'M', fixedRadius: 2 })];
  const ucNoktali = () => [nokta('A'), nokta('B'), nokta('C'),
    yap({ id: 'c', type: 'circle', centerPointId: '', throughPointIds: ['A', 'B', 'C'] })];

  it('merkez + yarıçap noktası: ikisi de gider (eskiden R kalıyordu)', () => {
    expect(sil(merkezli(), ['c'])).toEqual(['M', 'R', 'c']);
  });

  it('sabit yarıçaplı çember: merkezi gider', () => {
    expect(sil(sabit(), ['c'])).toEqual(['M', 'c']);
  });

  it('üç noktadan geçen çember: üç nokta da gider, boş merkez kimliği silme listesine girmez', () => {
    expect(sil(ucNoktali(), ['c'])).toEqual(['A', 'B', 'C', 'c']);
    expect(planDeletion(ucNoktali(), ['c']).removal.has('')).toBe(false);
  });

  it('“noktalar kalsın”: çember gider, kullanılmayan merkez bile kalır', () => {
    expect(sil(sabit(), ['c'], { keepPoints: true })).toEqual(['c']);
    expect(sil(merkezli(), ['c'], { keepPoints: true })).toEqual(['c']);
  });

  it('yarıçap NOKTASI silinince eski davranış sürer (merkez de gider, kendi noktası yok)', () => {
    const o = merkezli();
    expect(sil(o, ['R'])).toEqual([...collectDependentIds(o, ['R'])].sort());
    expect(kendi(o, ['R'])).toEqual([]);
  });
});

describe('Şeklin kendi noktaları: paylaşılan noktalar korunur', () => {
  const ikiUcgen = () => [
    ...ucgen(), nokta('D'),
    yap({ id: 'ucgen2', type: 'polygon', pointIds: ['B', 'C', 'D'] }),
  ];

  it('BC kenarını paylaşan iki üçgen: ABC silinince yalnızca A gider', () => {
    expect(sil(ikiUcgen(), ['ucgen'])).toEqual(['A', 'ucgen']);
    expect(kendi(ikiUcgen(), ['ucgen'])).toEqual(['A']);
  });

  it('başka bir parçanın kullandığı köşe kalır', () => {
    const o = [...ucgen(), nokta('X'), yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'X' })];
    expect(sil(o, ['ucgen'])).toEqual(['B', 'C', 'ucgen']);
  });

  it('dışarıdaki bir noktayı da kullanan açı köşeyi korur', () => {
    // Dörtgenin KÖŞEGENİ açının kolu değildir: dörtgen silinince açı (kural 3) gitmez, kullandığı A ve C kalır
    const o = [nokta('A'), nokta('B'), nokta('C'), nokta('E'), nokta('D'),
      yap({ id: 'dort', type: 'polygon', pointIds: ['A', 'B', 'C', 'E'] }),
      yap({ id: 'aci', type: 'angle', point1Id: 'C', vertexPointId: 'A', point3Id: 'D' })];
    expect(sil(o, ['dort'])).toEqual(['B', 'E', 'dort']);
  });

  it('yalnızca kendi açıları olan üçgende açılar (kural 2) ve üç köşe birden gider', () => {
    const o = [...ucgen(),
      yap({ id: 'a1', type: 'angle', point1Id: 'B', vertexPointId: 'A', point3Id: 'C' }),
      yap({ id: 'a2', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' })];
    expect(sil(o, ['ucgen'])).toEqual(['A', 'B', 'C', 'a1', 'a2', 'ucgen']);
  });

  it('dışarıdaki noktaya uzaklık ölçümü köşeyi korur, iki köşe arası eğim ölçümü korumaz', () => {
    const disa = [...ucgen(), nokta('P'), yap({ id: 'olc', type: 'measurement', kind: 'distance', pointIds: ['A', 'P'] })];
    expect(sil(disa, ['ucgen'])).toEqual(['B', 'C', 'ucgen']);
    const ice = [...ucgen(), yap({ id: 'olc', type: 'measurement', kind: 'slope', pointIds: ['A', 'B'] })];
    expect(sil(ice, ['ucgen'])).toEqual(['A', 'B', 'C', 'olc', 'ucgen']);
  });

  it('yay ölçümünün kullandığı köşe kalır', () => {
    const o = [...ucgen(), nokta('M'), yap({ id: 'k', type: 'circle', centerPointId: 'M', radiusPointId: 'A' }),
      yap({ id: 'yo', type: 'measurement', kind: 'arc', pointIds: ['A', 'B'], circleId: 'k' })];
    expect(sil(o, ['ucgen'])).toEqual(['C', 'ucgen']);
  });

  it('onay kutusu ya da düğme hedefi olan köşe kalır', () => {
    const kutu = [...ucgen(), yap({ id: 'ok', type: 'checkbox', targetIds: ['A'], x: 0, y: 0 })];
    expect(sil(kutu, ['ucgen'])).toEqual(['B', 'C', 'ucgen']);
    const dugme = [...ucgen(), yap({ id: 'd', type: 'button', action: { kind: 'toggle', targetIds: ['B'] }, x: 0, y: 0 })];
    expect(sil(dugme, ['ucgen'])).toEqual(['A', 'C', 'ucgen']);
  });

  it('kalan bir çemberin ÜZERİNDE duran köşe kalır', () => {
    const o = [...ucgen(), nokta('M'), yap({ id: 'c', type: 'circle', centerPointId: 'M', fixedRadius: 3 })]
      .map(o2 => (o2.id === 'A' ? ({ ...o2, onObjectId: 'c' } as MathObject) : o2));
    expect(sil(o, ['ucgen'])).toEqual(['B', 'C', 'ucgen']);
  });

  it('izi açık ya da canlandırılan köşe kalır (iz, geri almayla geri gelmez)', () => {
    const izli = ucgen().map(o => (o.id === 'A' ? ({ ...o, showTrace: true } as MathObject) : o));
    expect(sil(izli, ['ucgen'])).toEqual(['B', 'C', 'ucgen']);
    const canli = ucgen().map(o => (o.id === 'B' ? ({ ...o, animating: true } as MathObject) : o));
    expect(sil(canli, ['ucgen'])).toEqual(['A', 'C', 'ucgen']);
  });

  it('çokgenin KENARI üzerindeki nokta kural 1 ile gider ama "kendi noktası" sayılmaz', () => {
    const o = [...ucgen(), nokta('E', { onObjectId: 'ucgen' })];
    expect(sil(o, ['ucgen'])).toEqual(['A', 'B', 'C', 'E', 'ucgen']);
    expect(kendi(o, ['ucgen'])).toEqual(['A', 'B', 'C']);
  });
});

describe('Şeklin kendi noktaları: kurulumlu ve geçişli noktalar', () => {
  it('kaydırıcıya bağlı üçgen (triangleVertex): üç köşe gider, kaydırıcılar kalır', () => {
    const o = [
      nokta('A'),
      nokta('B', { isIndependent: false, construction: { kind: 'triangleVertex', anchorId: 'A', sliderIds: ['s1', 's2', 's3'], vertex: 1, rotation: 0, orientation: 1 } }),
      nokta('C', { isIndependent: false, construction: { kind: 'triangleVertex', anchorId: 'A', sliderIds: ['s1', 's2', 's3'], vertex: 2, rotation: 0, orientation: 1 } }),
      yap({ id: 's1', type: 'slider', variableName: 'a', value: 3, min: 0, max: 5, step: 1, x: 0, y: 0 }),
      yap({ id: 's2', type: 'slider', variableName: 'b', value: 4, min: 0, max: 5, step: 1, x: 0, y: 0 }),
      yap({ id: 's3', type: 'slider', variableName: 'c', value: 5, min: 0, max: 5, step: 1, x: 0, y: 0 }),
      yap({ id: 'ucgen', type: 'polygon', pointIds: ['A', 'B', 'C'] }),
    ];
    expect(sil(o, ['ucgen'])).toEqual(['A', 'B', 'C', 'ucgen']);
  });

  it('komut yayı: döndürmeyle kurulan yön noktası ve kaynakları gider', () => {
    const o = [
      nokta('A'), nokta('B'),
      nokta('C', { isIndependent: false, construction: { kind: 'rotate', sourceId: 'B', centerId: 'A', degrees: 90 } }),
      yap({ id: 'y', type: 'arc', centerPointId: 'A', startPointId: 'B', directionPointId: 'C' }),
    ];
    expect(sil(o, ['y'])).toEqual(['A', 'B', 'C', 'y']);
  });

  it('“AB çaplı çember”: orta nokta merkez, B ve geçişli olarak A da gider; A başka yerde kullanılıyorsa kalır', () => {
    const cap = () => [
      nokta('A'), nokta('B'),
      nokta('M', { isIndependent: false, construction: { kind: 'midpoint', pointIds: ['A', 'B'] } }),
      yap({ id: 'c', type: 'circle', centerPointId: 'M', radiusPointId: 'B' }),
    ];
    expect(sil(cap(), ['c'])).toEqual(['A', 'B', 'M', 'c']);
    const paylasimli = [...cap(), nokta('X'), yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'X' })];
    expect(sil(paylasimli, ['c'])).toEqual(['B', 'M', 'c']);
  });

  it('gizli açıortay yardımcısı: ışın silinince yardımcı gider, çokgenin kullandığı noktalar kalır', () => {
    const o = [
      nokta('P1'), nokta('V'), nokta('P3'), nokta('Q'),
      yap({ id: 'cok', type: 'polygon', pointIds: ['P1', 'V', 'P3'] }),
      nokta('H', { visible: false, isIndependent: false, construction: { kind: 'bisector', pointIds: ['P1', 'V', 'P3'] } }),
      yap({ id: 'isin', type: 'ray', startPointId: 'V', throughPointId: 'H' }),
    ];
    expect(sil(o, ['isin'])).toEqual(['H', 'isin']);
    // Çokgen yoksa açıortayın dayandığı noktaları da başka kimse kullanmıyordur: hepsi gider
    const serbest = o.filter(x => x.id !== 'cok');
    expect(sil(serbest, ['isin'])).toEqual(['H', 'P1', 'P3', 'V', 'isin']);
  });

  it('iki doğrunun paylaştığı gizli yardımcı, ikisi de silinince gider', () => {
    const o = [
      nokta('G1', { visible: false }), nokta('G2', { visible: false }),
      yap({ id: 'd1', type: 'line', point1Id: 'G1', point2Id: 'G2' }),
      yap({ id: 'd2', type: 'line', point1Id: 'G1', point2Id: 'G2' }),
    ];
    expect(sil(o, ['d1'])).toEqual(['d1']);
    expect(sil(o, ['d1', 'd2'])).toEqual(['G1', 'G2', 'd1', 'd2']);
  });

  it('kalan bir aday kendi kurulum kaynaklarını da korur (sabit nokta)', () => {
    const o = [
      nokta('A'), nokta('B'),
      nokta('M', { isIndependent: false, construction: { kind: 'midpoint', pointIds: ['A', 'B'] } }),
      yap({ id: 'c', type: 'circle', centerPointId: 'M', radiusPointId: 'B' }),
      nokta('X'),
      // M kalan bir parçada kullanılıyor: kaynakları A ve B de kalmalı
      yap({ id: 's', type: 'segment', startPointId: 'M', endPointId: 'X' }),
    ];
    expect(sil(o, ['c'])).toEqual(['c']);
  });

  it('DÖNÜŞÜMÜN merkezi, ekseni ve vektör uçları öğretmenin noktasıdır: görüntü silinince kalır', () => {
    const dondurme = [
      nokta('O'), nokta('A'),
      nokta('A2', { isIndependent: false, construction: { kind: 'rotate', sourceId: 'A', centerId: 'O', degrees: 90 } }),
      nokta('B2', { isIndependent: false, construction: { kind: 'rotate', sourceId: 'A', centerId: 'O', degrees: 120 } }),
      yap({ id: 'goruntu', type: 'segment', startPointId: 'A2', endPointId: 'B2' }),
    ];
    expect(sil(dondurme, ['goruntu'])).toEqual(['A2', 'B2', 'goruntu']);
    const buyutme = [
      nokta('O'), nokta('A'),
      nokta('A2', { isIndependent: false, construction: { kind: 'dilate', sourceId: 'A', centerId: 'O', factor: 2 } }),
      nokta('B2', { isIndependent: false, construction: { kind: 'dilate', sourceId: 'A', centerId: 'O', factor: 3 } }),
      yap({ id: 'goruntu', type: 'segment', startPointId: 'A2', endPointId: 'B2' }),
    ];
    expect(sil(buyutme, ['goruntu'])).toEqual(['A2', 'B2', 'goruntu']);
    const oteleme = [
      nokta('P'), nokta('Q'), nokta('M'),
      nokta('R', { isIndependent: false, construction: { kind: 'translate', sourceId: 'M', vectorPointIds: ['P', 'Q'] } }),
      yap({ id: 'c', type: 'circle', centerPointId: 'M', radiusPointId: 'R' }),
    ];
    expect(sil(oteleme, ['c'])).toEqual(['M', 'R', 'c']);
  });
});

describe('Şeklin kendi noktaları: kapsam sınırları', () => {
  it('yarım kalmış çizimin tıklanmış noktası (protectedIds) kalır', () => {
    expect(sil(ucgen(), ['ucgen'], { protectedIds: ['A'] })).toEqual(['B', 'C', 'ucgen']);
  });

  it('AÇI silmek nokta silmez: kollar gider, noktalar kalır (açı silme düzeltmesi korunur)', () => {
    const o = [
      nokta('A'), nokta('B'), nokta('C'),
      yap({ id: 'sBA', type: 'segment', startPointId: 'B', endPointId: 'A', armOfAngleId: 'ang' }),
      yap({ id: 'sBC', type: 'segment', startPointId: 'B', endPointId: 'C', armOfAngleId: 'ang' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
    ];
    expect(sil(o, ['ang'])).toEqual(['ang', 'sBA', 'sBC']);
    expect(kendi(o, ['ang'])).toEqual([]);
  });

  it('bir KOL silinince açı gider, öteki kolun tuttuğu köşe kalır, boşta kalan uç gider', () => {
    const o = [
      nokta('A'), nokta('B'), nokta('C'),
      yap({ id: 'sBA', type: 'segment', startPointId: 'B', endPointId: 'A', armOfAngleId: 'ang' }),
      yap({ id: 'sBC', type: 'segment', startPointId: 'B', endPointId: 'C', armOfAngleId: 'ang' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
    ];
    expect(sil(o, ['sBA'])).toEqual(['A', 'ang', 'sBA']);
  });

  it('ÜÇGENLE birlikte ölçülmüş açının turuncu kolları da gider (yoksa noktalar ekranda kalıyordu)', () => {
    const o = [
      ...ucgen(),
      yap({ id: 'kolAB', type: 'segment', startPointId: 'A', endPointId: 'B', armOfAngleId: 'ang' }),
      yap({ id: 'kolAC', type: 'segment', startPointId: 'A', endPointId: 'C', armOfAngleId: 'ang' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'B', vertexPointId: 'A', point3Id: 'C' }),
    ];
    expect(sil(o, ['ucgen'])).toEqual(['A', 'B', 'C', 'ang', 'kolAB', 'kolAC', 'ucgen']);
  });

  it('kolun üzerinde kalan bir nokta varsa o kol ve tuttuğu noktalar korunur', () => {
    const o = [
      ...ucgen(),
      yap({ id: 'kolAB', type: 'segment', startPointId: 'A', endPointId: 'B', armOfAngleId: 'ang' }),
      yap({ id: 'kolAC', type: 'segment', startPointId: 'A', endPointId: 'C', armOfAngleId: 'ang' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'B', vertexPointId: 'A', point3Id: 'C' }),
      nokta('P', { onObjectId: 'kolAB' }),
    ];
    expect(sil(o, ['ucgen'])).toEqual(['C', 'ang', 'kolAC', 'ucgen']);
  });

  it('yalnızca ölçüm etiketi silmek hiç nokta silmez', () => {
    const o = [...ucgen(), yap({ id: 'olc', type: 'measurement', kind: 'slope', pointIds: ['A', 'B'] })];
    expect(sil(o, ['olc'])).toEqual(['olc']);
  });

  it('NOKTA silmek başka noktaları silmez (zincirlenen şekil tohum değildir)', () => {
    expect(sil(ucgen(), ['A'])).toEqual(['A', 'ucgen']);
    expect(kendi(ucgen(), ['A'])).toEqual([]);
  });

  it('çerçeveyle seçimde şekil de seçilidir: kutu nereye denk gelirse gelsin kendi noktaları gider', () => {
    // A noktasının çevresine çizilen kutu: isObjectInMarquee bir köşe kutuya girince ABC üçgenini ve AD parçasını da
    // seçer ("2 nesne seçildi"). Şekil açıkça seçimin içinde olduğu için kendi noktaları da gider: ekranda artakalan
    // B, C, D noktası kalmaz (kullanıcının "bazen noktaları kalıyor" dediği durum).
    const o = [...ucgen(), nokta('D'), yap({ id: 'ad', type: 'segment', startPointId: 'A', endPointId: 'D' })];
    expect(sil(o, ['A', 'ucgen', 'ad'])).toEqual(['A', 'B', 'C', 'D', 'ad', 'ucgen']);
    expect(kendi(o, ['A', 'ucgen', 'ad'])).toEqual(['B', 'C', 'D']);
    // Yalnızca NOKTA seçiliyken (çerçeve şekli almadıysa) eski davranış sürer: şekil gider, kardeş noktalar kalır
    expect(sil(o, ['A'])).toEqual(['A', 'ad', 'ucgen']);
  });

  it('ölçüm parçası (|AB| Uzunluk/Birim ölç) silinince ölçtüğü noktalar kalır', () => {
    const olcum = (ek: Record<string, unknown> = {}) =>
      yap({ id: 'olc', type: 'segment', label: '|AB|', unit: 'cm', showLength: true, startPointId: 'A', endPointId: 'B', ...ek });
    const o = [nokta('A'), nokta('B'), olcum()];
    expect(sil(o, ['olc'])).toEqual(['olc']);
    expect(kendi(o, ['olc'])).toEqual([]);
    expect(planDeletion(o, ['olc']).shapeIds).toEqual([]);
    // "3 br uzunluğunda AB doğru parçası" gerçek bir şekildir: |AB| etiketi yoktur, noktalarıyla birlikte gider
    const gercek = [nokta('A'), nokta('B'), yap({ id: 's', type: 'segment', label: 'AB', unit: 'br', showLength: true, startPointId: 'A', endPointId: 'B' })];
    expect(sil(gercek, ['s'])).toEqual(['A', 'B', 's']);
  });

  it('şekil yüzünden zincirde giden parçanın öbür ucu da gider (ortada nokta kalmaz)', () => {
    // Çember c; A noktası çemberin ÜZERİNDE; [AF] parçası A ile serbest F'yi birleştiriyor.
    // c silinince A (rule 1) ve [AF] (rule 1) gider; F de artık kimsenin kullanmadığı bir artık noktadır.
    const o = [
      nokta('O'), nokta('R'),
      yap({ id: 'c', type: 'circle', centerPointId: 'O', radiusPointId: 'R' }),
      nokta('A', { onObjectId: 'c' }), nokta('F'),
      yap({ id: 'af', type: 'segment', startPointId: 'A', endPointId: 'F' }),
    ];
    expect(sil(o, ['c'])).toEqual(['A', 'F', 'O', 'R', 'af', 'c']);
    expect(kendi(o, ['c'])).toEqual(['O', 'R', 'A', 'F']);
    // İpucu yalnızca istenen şekli anar, zincirdekileri değil
    expect(planDeletion(o, ['c']).shapeIds).toEqual(['c']);
  });

  it('açı silmek, kolları şekil olsa bile hiçbir noktayı silmez', () => {
    // Açı aracı: iki kol parçası + açı. Açıyı silmek kollarını götürür ama A, B, C yerinde kalır.
    const o = [
      nokta('A'), nokta('B'), nokta('C'),
      yap({ id: 'kolAB', type: 'segment', startPointId: 'A', endPointId: 'B', armOfAngleId: 'ang' }),
      yap({ id: 'kolAC', type: 'segment', startPointId: 'A', endPointId: 'C', armOfAngleId: 'ang' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'B', vertexPointId: 'A', point3Id: 'C' }),
    ];
    const kalanlar = applyDeletionPlan(o, planDeletion(o, ['ang'])).map(x => x.id);
    expect(kalanlar).toEqual(['A', 'B', 'C']);
    expect(kendi(o, ['ang'])).toEqual([]);
  });

  it('sahnede olmayan bir kimlikle silme dizisi değiştirmez (boş geçmiş adımı açılmaz)', () => {
    const o = ucgen();
    expect(applyDeletionPlan(o, planDeletion(o, ['yok-boyle-bir-id']))).toBe(o);
  });

  it('şeklin tamamı çerçevelenince zaten her şey gider', () => {
    expect(sil(ucgen(), ['A', 'B', 'C', 'ucgen'])).toEqual(['A', 'B', 'C', 'ucgen']);
  });

  it('“noktalar kalsın”: gizli noktalar dâhil hiçbir nokta gitmez', () => {
    const o = [nokta('A'), nokta('B', { visible: false }), yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'B' })];
    expect(sil(o, ['s'], { keepPoints: true })).toEqual(['s']);
    expect(planDeletion(o, ['s'], { keepPoints: true }).keptPointIds).toEqual(['A', 'B']);
  });

  it('“noktalar kalsın”: şeklin ÜZERİNDEKİ nokta da kalır, bağı çözülür', () => {
    const o = [...ucgen(), nokta('E', { onObjectId: 'ucgen' })];
    const plan = planDeletion(o, ['ucgen'], { keepPoints: true });
    expect([...plan.removal].sort()).toEqual(['ucgen']);
    expect(plan.unbindIds).toEqual(['E']);
    const sonra = applyDeletionPlan(o, plan);
    expect(sonra.map(x => x.id)).toEqual(['A', 'B', 'C', 'E']);
    expect((sonra.find(x => x.id === 'E') as { onObjectId?: string }).onObjectId).toBeUndefined();
  });

  it('“noktalar kalsın” çerçeveyle seçilmiş noktaları da korur', () => {
    const plan = planDeletion(ucgen(), ['A', 'B', 'C', 'ucgen'], { keepPoints: true });
    expect([...plan.removal].sort()).toEqual(['ucgen']);
    expect(plan.keptPointIds).toEqual(['A', 'B', 'C']);
  });

  it('collectDeletionIds, planDeletion.removal ile aynıdır', () => {
    expect([...collectDeletionIds(ucgen(), ['ucgen'])].sort()).toEqual(sil(ucgen(), ['ucgen']));
  });

  it('SAFTIR: aynı girdi aynı sonucu verir, girdi değişmez (StrictMode çift güncelleyici)', () => {
    const o = ucgen();
    const kopya = JSON.stringify(o);
    const bir = planDeletion(o, ['ucgen']);
    const iki = planDeletion(o, ['ucgen']);
    expect([...bir.removal].sort()).toEqual([...iki.removal].sort());
    expect(bir.ownPointIds).toEqual(iki.ownPointIds);
    expect(JSON.stringify(o)).toBe(kopya);
    expect(applyDeletionPlan(o, bir).map(x => x.id)).toEqual([]);
  });

  it('büyük sahnede (2000 nesne) hızlıdır', () => {
    const o: MathObject[] = [];
    for (let i = 0; i < 500; i++) {
      o.push(nokta(`p${i}a`), nokta(`p${i}b`), nokta(`p${i}c`));
      o.push(yap({ id: `poly${i}`, type: 'polygon', pointIds: [`p${i}a`, `p${i}b`, `p${i}c`] }));
    }
    const basla = Date.now();
    const plan = planDeletion(o, ['poly7']);
    expect([...plan.removal].sort()).toEqual(['p7a', 'p7b', 'p7c', 'poly7']);
    expect(Date.now() - basla).toBeLessThan(500);
  });
});
