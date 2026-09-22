import { describe, it, expect } from 'vitest';
import { collectDependentIds, objectDependencies } from '@/state/WorkspaceContext';
import type { MathObject } from '@/types/math';

const t = 1750000000000;
const nokta = (id: string): MathObject =>
  ({ id, type: 'point', label: id, showLabel: true, x: 0, y: 0, visible: true, createdAt: t }) as MathObject;

const yap = (o: Record<string, unknown>): MathObject =>
  ({ showLabel: true, visible: true, createdAt: t, label: String(o.id), ...o }) as MathObject;

const sil = (objeler: MathObject[], ids: string[]) => [...collectDependentIds(objeler, ids)].sort();

/**
 * Bir nesne silindiğinde ona dayanan HER ŞEY silinmelidir; aksi hâlde var olmayan
 * bir noktaya işaret eden nesneler belgede kalır ve ekranda görünmeden listeyi kirletir.
 */
describe('Bağımlı nesnelerin birlikte silinmesi', () => {
  it('çember silinince kullanılmayan merkezi de siler', () => {
    const o = [nokta('M'), nokta('R'), yap({ id: 'c', type: 'circle', centerPointId: 'M', radiusPointId: 'R' })];
    expect(sil(o, ['c'])).toEqual(['M', 'c']);
  });

  it('başka çizimin kullandığı ortak merkezi korur', () => {
    const o = [nokta('M'), nokta('R'), yap({ id: 'c', type: 'circle', centerPointId: 'M', fixedRadius: 2 }),
      yap({ id: 's', type: 'segment', startPointId: 'M', endPointId: 'R' })];
    expect(sil(o, ['c'])).toEqual(['c']);
  });

  it('aynı merkezli tüm çemberler silinince merkezi temizler', () => {
    const o = [nokta('M'), yap({ id: 'c1', type: 'circle', centerPointId: 'M', fixedRadius: 2 }),
      yap({ id: 'c2', type: 'circle', centerPointId: 'M', fixedRadius: 3 })];
    expect(sil(o, ['c1'])).toEqual(['c1']);
    expect(sil(o, ['c1', 'c2'])).toEqual(['M', 'c1', 'c2']);
  });
  it('nokta silinince onu kullanan doğru parçası da silinir', () => {
    const o = [nokta('A'), nokta('B'), yap({ id: 's1', type: 'segment', startPointId: 'A', endPointId: 'B' })];
    expect(sil(o, ['A'])).toEqual(['A', 's1']);
  });

  it('zincirleme bağımlılık geçişli olarak temizlenir', () => {
    const o = [
      nokta('A'),
      nokta('B'),
      yap({ id: 's1', type: 'segment', startPointId: 'A', endPointId: 'B' }),
      // Doğru parçasının uçlarını kullanan bir açı
      nokta('C'),
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
    ];
    expect(sil(o, ['A'])).toEqual(['A', 'ang', 's1']);
  });

  it('ELİPS de bağımlılığa dâhildir (eskiden atlanıyordu)', () => {
    const o = [nokta('M'), yap({ id: 'e1', type: 'ellipse', centerPointId: 'M', radiusX: 2, radiusY: 1 })];
    expect(sil(o, ['M'])).toEqual(['M', 'e1']);
  });

  it('ÖLÇÜM ETİKETİ de bağımlılığa dâhildir', () => {
    const o = [
      nokta('A'),
      nokta('B'),
      yap({ id: 'm1', type: 'measurement', kind: 'slope', pointIds: ['A', 'B'] }),
    ];
    expect(sil(o, ['B'])).toEqual(['B', 'm1']);
  });

  it('işaret kutusu, düğme ve girdi kutusu bağlı nesneyle birlikte gider', () => {
    const o = [
      nokta('A'),
      yap({ id: 'chk', type: 'checkbox', x: 0, y: 0, targetIds: ['A'], checked: true }),
      yap({ id: 'btn', type: 'button', x: 0, y: 0, action: { kind: 'toggle', targetIds: ['A'] } }),
      yap({ id: 'sld', type: 'slider', variableName: 'a', min: 0, max: 5, step: 0.1, value: 1 }),
      yap({ id: 'inp', type: 'input_box', x: 0, y: 0, targetId: 'sld', field: 'value' }),
    ];
    expect(sil(o, ['A'])).toEqual(['A', 'btn', 'chk']);
    expect(sil(o, ['sld'])).toEqual(['inp', 'sld']);
  });
});

/**
 * Kullanıcı bir ŞEKLİ sildiğinde o şekle ait ölçüm ve açı etiketleri de gitmelidir.
 */
describe('Şekle ait etiketlerin silinmesi', () => {
  const ucgen = () => [
    nokta('A'),
    nokta('B'),
    nokta('C'),
    yap({ id: 'poly', type: 'polygon', pointIds: ['A', 'B', 'C'] }),
  ];

  it('üçgen silinince köşelerindeki açı etiketi de silinir', () => {
    const o = [...ucgen(), yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' })];
    expect(sil(o, ['poly'])).toEqual(['ang', 'poly']);
  });

  it('üçgen silinince trig ölçüm etiketi de silinir', () => {
    const o = [
      ...ucgen(),
      yap({ id: 'trig', type: 'measurement', kind: 'trig', pointIds: ['A', 'B', 'C'] }),
    ];
    expect(sil(o, ['poly'])).toEqual(['poly', 'trig']);
  });

  it('köşe noktaları KORUNUR: bağımsız nesnelerdir', () => {
    const o = [...ucgen(), yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' })];
    const kalan = sil(o, ['poly']);
    expect(kalan).not.toContain('A');
    expect(kalan).not.toContain('B');
    expect(kalan).not.toContain('C');
  });

  it('şeklin DIŞINDAKİ bir noktayı da kullanan etiket korunur', () => {
    const o = [
      ...ucgen(),
      nokta('D'),
      // ∠ADB: köşe D üçgenin köşesi değil, kolları (D-A, D-B) da üçgenin kenarı değil;
      // bu yüzden üçgene ait sayılmaz
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'D', point3Id: 'B' }),
    ];
    expect(sil(o, ['poly'])).toEqual(['poly']);
  });

  it('açının KOLU OLMAYAN bir doğru parçası silinince açı korunur', () => {
    const o = [
      nokta('A'),
      nokta('B'),
      nokta('C'),
      // A-C, B köşeli ∠ABC'nin kolu değil (kollar B-A ve B-C)
      yap({ id: 's1', type: 'segment', startPointId: 'A', endPointId: 'C' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
    ];
    expect(sil(o, ['s1'])).toEqual(['s1']);
  });

  it('yay silinince yayın merkez açısı etiketi de gider', () => {
    const o = [
      nokta('M'),
      nokta('S'),
      nokta('E'),
      yap({ id: 'arc', type: 'arc', centerPointId: 'M', startPointId: 'S', directionPointId: 'E' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'S', vertexPointId: 'M', point3Id: 'E' }),
    ];
    expect(sil(o, ['arc'])).toEqual(['ang', 'arc']);
  });
});

/**
 * "Açı silindiğinde açı çizgisi kalıyor": açının bir KOLU silinince yay ve rozet, kolu
 * olmayan köşede boşlukta asılı kalıyordu. Kolu artık hiçbir şekil çizmiyorsa açı da gider.
 */
describe('Kolu silinen açı da gider', () => {
  const kollu = () => [
    nokta('A'),
    nokta('B'),
    nokta('C'),
    yap({ id: 'sBA', type: 'segment', startPointId: 'B', endPointId: 'A' }),
    yap({ id: 'sBC', type: 'segment', startPointId: 'B', endPointId: 'C' }),
    yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
  ];

  it('tek kol (doğru parçası) silinince ölçülmüş açı da silinir', () => {
    expect(sil(kollu(), ['sBA'])).toEqual(['ang', 'sBA']);
    expect(sil(kollu(), ['sBC'])).toEqual(['ang', 'sBC']);
  });

  it('iki kol birden silinince açı da silinir, noktalar korunur', () => {
    expect(sil(kollu(), ['sBA', 'sBC'])).toEqual(['ang', 'sBA', 'sBC']);
  });

  it('parçanın uç sırası önemli değildir (A->B de B->A kolunu çizer)', () => {
    const o = kollu().map((x) => (x.id === 'sBA' ? { ...x, startPointId: 'A', endPointId: 'B' } as MathObject : x));
    expect(sil(o, ['sBA'])).toEqual(['ang', 'sBA']);
  });

  it('silinen kolu BAŞKA bir şekil hâlâ çiziyorsa açı korunur', () => {
    const o = [...kollu(), yap({ id: 'poly', type: 'polygon', pointIds: ['A', 'B', 'C'] })];
    expect(sil(o, ['sBA'])).toEqual(['sBA']);
    // Aynı kolu çizen ikinci bir doğru parçası da yeter
    const o2 = [...kollu(), yap({ id: 'sAB2', type: 'segment', startPointId: 'A', endPointId: 'B' })];
    expect(sil(o2, ['sBA'])).toEqual(['sBA']);
    // İkisi birlikte silinirse kol kalmaz, açı gider
    expect(sil(o2, ['sBA', 'sAB2'])).toEqual(['ang', 'sAB2', 'sBA']);
  });

  it('kolu çizen DOĞRU silinince açı da silinir', () => {
    const o = [
      nokta('A'),
      nokta('B'),
      nokta('C'),
      yap({ id: 'd1', type: 'line', point1Id: 'A', point2Id: 'B' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
    ];
    expect(sil(o, ['d1'])).toEqual(['ang', 'd1']);
  });

  it('kolu çizen IŞIN (ters yönde de) silinince açı da silinir', () => {
    const o = [
      nokta('A'),
      nokta('B'),
      nokta('C'),
      // A'dan başlayıp B'den geçen ışın, B köşeli açının B-A kolunu da çizer
      yap({ id: 'r1', type: 'ray', startPointId: 'A', throughPointId: 'B' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
    ];
    expect(sil(o, ['r1'])).toEqual(['ang', 'r1']);
  });

  it('kolu hiç çizilmemiş serbest üç noktalı açı ilgisiz şekil silinince korunur', () => {
    const o = [
      nokta('A'),
      nokta('B'),
      nokta('C'),
      nokta('D'),
      yap({ id: 'sCD', type: 'segment', startPointId: 'C', endPointId: 'D' }),
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
    ];
    expect(sil(o, ['sCD'])).toEqual(['sCD']);
  });

  it('üçgen silinince, kolu üçgenin kenarı olan dış noktalı açı da gider', () => {
    const o = [
      nokta('A'),
      nokta('B'),
      nokta('C'),
      nokta('D'),
      yap({ id: 'poly', type: 'polygon', pointIds: ['A', 'B', 'C'] }),
      // ∠ABD: B-A kolu üçgenin AB kenarıdır; B-D kolu hiçbir şekil tarafından çizilmez
      yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'D' }),
    ];
    expect(sil(o, ['poly'])).toEqual(['ang', 'poly']);
  });

  it('köşe noktası silinince açı eskisi gibi silinir (kollarıyla birlikte)', () => {
    expect(sil(kollu(), ['B'])).toEqual(['B', 'ang', 'sBA', 'sBC']);
  });

  it('kol ucu nokta silinince açı ve o kol gider, öteki kol kalır', () => {
    expect(sil(kollu(), ['A'])).toEqual(['A', 'ang', 'sBA']);
  });

  it('açının kendisi silinince kolları ve noktaları korunur', () => {
    expect(sil(kollu(), ['ang'])).toEqual(['ang']);
  });

  it('yay silinince merkez açı etiketi eskisi gibi gider, yay kol sayılmaz', () => {
    const o = [
      nokta('M'),
      nokta('S'),
      nokta('E'),
      nokta('F'),
      yap({ id: 'arc', type: 'arc', centerPointId: 'M', startPointId: 'S', directionPointId: 'E' }),
      // Yayın kendisi M-S kolunu çizmez; F kullanan açı yayla gitmez
      yap({ id: 'ang', type: 'angle', point1Id: 'S', vertexPointId: 'M', point3Id: 'F' }),
    ];
    expect(sil(o, ['arc'])).toEqual(['arc']);
  });
});

/**
 * "Açı silindiğinde açı çizgisi kalıyor" (ikinci okuma): Açı aracı ve "ABC açısını çiz" komutu açıyı iki turuncu
 * kol parçasıyla AYNI adımda çizer. Açının kendisi silinince bu kollar da gitmeli, yoksa ekranda açının iki çizgisi kalır.
 */
describe('Açıyla birlikte çizilen kollar', () => {
  const aracla = () => [
    nokta('A'),
    nokta('B'),
    nokta('C'),
    yap({ id: 'sBA', type: 'segment', startPointId: 'B', endPointId: 'A', armOfAngleId: 'ang' }),
    yap({ id: 'sBC', type: 'segment', startPointId: 'B', endPointId: 'C', armOfAngleId: 'ang' }),
    yap({ id: 'ang', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
  ];

  it('açının kendisi silinince onunla çizilen iki kol da silinir, noktalar kalır', () => {
    expect(sil(aracla(), ['ang'])).toEqual(['ang', 'sBA', 'sBC']);
  });

  it('kullanıcının kendi çizdiği (sahipsiz) kol korunur, yalnızca açıyla çizilen gider', () => {
    const o = aracla().map((x) => (x.id === 'sBA' ? ({ ...x, armOfAngleId: undefined } as MathObject) : x));
    expect(sil(o, ['ang'])).toEqual(['ang', 'sBC']);
  });

  it('başka bir açıyla çizilmiş kol bu açı silinince gitmez', () => {
    const o = aracla().map((x) => (x.id === 'sBA' ? ({ ...x, armOfAngleId: 'baska' } as MathObject) : x));
    expect(sil(o, ['ang'])).toEqual(['ang', 'sBC']);
  });

  it('artık açının kolu olmayan parça (kopya ya da ucu değişmiş) silinmez', () => {
    const o = [...aracla(), nokta('D'), yap({ id: 'kopya', type: 'segment', startPointId: 'D', endPointId: 'A', armOfAngleId: 'ang' })];
    expect(sil(o, ['ang'])).toEqual(['ang', 'sBA', 'sBC']);
  });

  it('kolun ÜZERİNDE duran nokta varsa o kol korunur', () => {
    const o = [...aracla(), yap({ id: 'P', type: 'point', x: 1, y: 0, onObjectId: 'sBA' })];
    expect(sil(o, ['ang'])).toEqual(['ang', 'sBC']);
  });

  it('kalan başka bir açının kolunu tek başına çiziyorsa kol korunur', () => {
    const o = [
      ...aracla(),
      nokta('D'),
      yap({ id: 'sBD', type: 'segment', startPointId: 'B', endPointId: 'D' }),
      // ∠ABD'nin B-A kolunu yalnızca sBA çiziyor
      yap({ id: 'ang2', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'D' }),
    ];
    expect(sil(o, ['ang'])).toEqual(['ang', 'sBC']);
    // Aynı kolu kalan başka bir parça da çiziyorsa sBA gidebilir
    const o2 = [...o, yap({ id: 'sAB2', type: 'segment', startPointId: 'A', endPointId: 'B' })];
    expect(sil(o2, ['ang'])).toEqual(['ang', 'sBA', 'sBC']);
  });

  it('iki açı birlikte silinince ikisinin kolları da gider', () => {
    const o = [
      ...aracla(),
      nokta('D'),
      yap({ id: 'sBD', type: 'segment', startPointId: 'B', endPointId: 'D', armOfAngleId: 'ang2' }),
      yap({ id: 'sBC2', type: 'segment', startPointId: 'B', endPointId: 'C', armOfAngleId: 'ang2' }),
      yap({ id: 'ang2', type: 'angle', point1Id: 'C', vertexPointId: 'B', point3Id: 'D' }),
    ];
    expect(sil(o, ['ang', 'ang2'])).toEqual(['ang', 'ang2', 'sBA', 'sBC', 'sBC2', 'sBD']);
    // Yalnızca ∠ABC silinince ∠CBD kendi kollarıyla (sBC2, sBD) yerinde kalır
    expect(sil(o, ['ang'])).toEqual(['ang', 'sBA', 'sBC']);
  });

  it('bir KOL silinince açı gider ama öteki kol yerinde kalır (yalnızca silinen çizgi gider)', () => {
    expect(sil(aracla(), ['sBA'])).toEqual(['ang', 'sBA']);
  });

  it('köşe silinince açı ve iki kol eskisi gibi gider', () => {
    expect(sil(aracla(), ['B'])).toEqual(['B', 'ang', 'sBA', 'sBC']);
  });

  it('kol ucu nokta silinince açı ve o kol gider, öteki kol kalır', () => {
    expect(sil(aracla(), ['A'])).toEqual(['A', 'ang', 'sBA']);
  });
});

describe('Bağımlılık listesi', () => {
  it('her nesne türü için doğru kimlikleri döndürür', () => {
    expect(objectDependencies(yap({ id: 'c', type: 'circle', centerPointId: 'M', radiusPointId: 'R' }))).toEqual([
      'M',
      'R',
    ]);
    expect(
      objectDependencies(yap({ id: 'c3', type: 'circle', centerPointId: '', throughPointIds: ['A', 'B', 'C'] }))
    ).toEqual(['A', 'B', 'C']);
    expect(objectDependencies(nokta('A'))).toEqual([]);
  });
});

/**
 * "Nesne üzerinde nokta" bağlıdır: barındıran şekil silinince nokta da gitmeli,
 * yoksa çember silindiğinde üzerindeki C ve D havada asılı kalırdı.
 */
describe('Nesne üzerindeki bağlı noktalar', () => {
  const cemberliBelge = () => [
    nokta('M'),
    nokta('R'),
    yap({ id: 'c1', type: 'circle', centerPointId: 'M', radiusPointId: 'R' }),
    yap({ id: 'C', type: 'point', x: 2, y: 0, onObjectId: 'c1' }),
    yap({ id: 'D', type: 'point', x: 0, y: 2, onObjectId: 'c1' }),
  ];

  it('çembere bağlı nokta, çemberin bağımlısı sayılır', () => {
    const C = cemberliBelge().find((o) => o.id === 'C')!;
    expect(objectDependencies(C)).toEqual(['c1']);
  });

  it('çember silinince ÜZERİNDEKİ noktalar da silinir', () => {
    expect(sil(cemberliBelge(), ['c1'])).toEqual(['C', 'D', 'M', 'c1']);
  });

  it('merkez silinince çember ve üzerindeki noktalar zincirleme gider', () => {
    expect(sil(cemberliBelge(), ['M'])).toEqual(['C', 'D', 'M', 'c1']);
  });

  it('üzerindeki noktayı silmek çemberi silmez', () => {
    expect(sil(cemberliBelge(), ['C'])).toEqual(['C']);
  });

  it('bağı olmayan nokta hiçbir şeye bağlı değildir', () => {
    expect(objectDependencies(nokta('A'))).toEqual([]);
  });
});

/** İki nokta arasındaki yay ölçümü (çember bölünmeden): uçlara, ara noktaya VE çembere bağlıdır. */
describe('Yay ölçümü (measurement kind arc)', () => {
  const sahne = () => [
    nokta('M'), nokta('B'), nokta('C'), nokta('D'),
    yap({ id: 'k', type: 'circle', centerPointId: 'M', radiusPointId: 'B' }),
    yap({ id: 'bd', type: 'segment', startPointId: 'B', endPointId: 'D' }),
    yap({ id: 'y', type: 'measurement', kind: 'arc', pointIds: ['B', 'D'], circleId: 'k' }),
    yap({ id: 'y3', type: 'measurement', kind: 'arc', pointIds: ['B', 'D'], throughPointId: 'C', circleId: 'k' }),
  ];

  it('bağımlılıkları: uçlar, ara nokta ve çember', () => {
    const o = sahne();
    expect(objectDependencies(o[6])).toEqual(['B', 'D', 'k']);
    expect(objectDependencies(o[7])).toEqual(['B', 'D', 'C', 'k']);
  });

  it('uç, ara nokta, çember ya da çemberin merkezi silinince ölçüm de silinir', () => {
    const o = sahne();
    expect(sil(o, ['D'])).toEqual(expect.arrayContaining(['y', 'y3']));
    expect(sil(o, ['C'])).toContain('y3');
    expect(sil(o, ['C'])).not.toContain('y');
    expect(sil(o, ['k'])).toEqual(expect.arrayContaining(['y', 'y3']));
    expect(sil(o, ['M'])).toEqual(expect.arrayContaining(['k', 'y', 'y3']));
  });

  it('aynı iki noktayı kullanan [BD] parçası silinince yay ölçümü KALIR (çember nokta değildir)', () => {
    expect(sil(sahne(), ['bd'])).toEqual(['bd']);
  });

  it('eğim / oran / uzunluk ölçümlerinin bağımlılıkları değişmez', () => {
    expect(objectDependencies(yap({ id: 's', type: 'measurement', kind: 'slope', pointIds: ['A', 'B'] }))).toEqual(['A', 'B']);
    expect(objectDependencies(yap({ id: 't', type: 'measurement', kind: 'trig', pointIds: ['A', 'B', 'C'] }))).toEqual(['A', 'B', 'C']);
    expect(objectDependencies(yap({ id: 'd', type: 'measurement', kind: 'distance', pointIds: ['A', 'P'] }))).toEqual(['A', 'P']);
  });
});
