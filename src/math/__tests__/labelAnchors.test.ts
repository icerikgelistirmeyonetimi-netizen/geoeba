import { describe, expect, it } from 'vitest';
import type { MathObject, MeasurementLabelAnchor, PointObject } from '@/types/math';
import { anchoredLabelPosition, labelAnchorPointIds, shapeAnchorCenter } from '../labelAnchors';

const base = (id: string) => ({ id, label: id, showLabel: true, visible: true, createdAt: 0, color: '#000' });
const point = (id: string, x = 0, y = 0, extra: Partial<PointObject> = {}): PointObject =>
  ({ ...base(id), type: 'point', x, y, isIndependent: true, ...extra });
const segment = (id: string, a: string, b: string): MathObject =>
  ({ ...base(id), type: 'segment', startPointId: a, endPointId: b });
const triangle = (): MathObject[] => [
  point('A', 0, 0), point('B', 6, 0), point('C', 0, 6),
  segment('AB', 'A', 'B'), segment('BC', 'B', 'C'), segment('CA', 'C', 'A'),
];

describe('labelAnchorPointIds', () => {
  it('ayrı parçalarla çizilen üçgenin kenar ve açılarına aynı bütün şekli verir', () => {
    const objects: MathObject[] = [...triangle(),
      { ...base('angle'), type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' },
      { ...base('distance'), type: 'measurement', kind: 'distance', pointIds: ['A', 'C'] },
    ];
    for (const id of ['AB', 'BC', 'CA', 'angle', 'distance']) {
      expect(labelAnchorPointIds(objects, id)).toEqual(['A', 'B', 'C']);
    }
  });

  it('komşu üçgenler ortak bileşeni kullanır, uzaktaki üçgen buna katılmaz', () => {
    const objects: MathObject[] = [...triangle(), point('D', 6, 6), segment('BD', 'B', 'D'), segment('DC', 'D', 'C'),
      point('X', 20, 20), point('Y', 24, 20), point('Z', 24, 24),
      { ...base('far'), type: 'polygon', pointIds: ['X', 'Y', 'Z'] },
    ];
    expect(labelAnchorPointIds(objects, 'AB')).toEqual(['A', 'B', 'C', 'D']);
    expect(labelAnchorPointIds(objects, 'BD')).toEqual(['A', 'B', 'C', 'D']);
    expect(labelAnchorPointIds(objects, 'far')).toEqual(['X', 'Y', 'Z']);
  });

  it('çokgen ile ayrı açı etiketlerinin noktaları ve merkezi aynıdır', () => {
    const objects: MathObject[] = [point('A'), point('B'), point('C'),
      { ...base('triangle'), type: 'polygon', pointIds: ['C', 'A', 'B'] },
      { ...base('angle'), type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' },
    ];
    expect(labelAnchorPointIds(objects, 'triangle')).toEqual(labelAnchorPointIds(objects, 'angle'));
    expect(labelAnchorPointIds(objects, 'triangle')).toEqual(['A', 'B', 'C']);
  });

  it('etiketler iki bağımsız şekli bağlayan geometrik köprü oluşturmaz', () => {
    const objects: MathObject[] = [...triangle(), point('X'), point('Y'), segment('XY', 'X', 'Y'),
      { ...base('bridge-angle'), type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'X' },
      { ...base('bridge-distance'), type: 'measurement', kind: 'distance', pointIds: ['C', 'Y'] },
    ];
    expect(labelAnchorPointIds(objects, 'AB')).toEqual(['A', 'B', 'C']);
    expect(labelAnchorPointIds(objects, 'XY')).toEqual(['X', 'Y']);
    expect(labelAnchorPointIds(objects, 'bridge-angle')).toEqual(['A', 'B', 'C', 'X', 'Y']);
    expect(labelAnchorPointIds(objects, 'bridge-distance')).toEqual(['A', 'B', 'C', 'X', 'Y']);
  });

  it('yapım bağımlılıklarını izleyip yansıtılmış şekli kaynak şekle bağlamaz', () => {
    const objects: MathObject[] = [...triangle(),
      point('X', 10, 0, { construction: { kind: 'translate', sourceId: 'A', vector: { x: 10, y: 0 } } }),
      point('Y', 16, 0, { construction: { kind: 'translate', sourceId: 'B', vector: { x: 10, y: 0 } } }),
      point('Z', 10, 6, { construction: { kind: 'translate', sourceId: 'C', vector: { x: 10, y: 0 } } }),
      { ...base('copy'), type: 'polygon', pointIds: ['X', 'Y', 'Z'] },
    ];
    expect(labelAnchorPointIds(objects, 'AB')).toEqual(['A', 'B', 'C']);
    expect(labelAnchorPointIds(objects, 'copy')).toEqual(['X', 'Y', 'Z']);
  });

  it('yol üzerine kilitlenen noktayı taşıyıcısının şekline dahil eder', () => {
    const objects: MathObject[] = [...triangle(), point('P', 3, 0, { onObjectId: 'AB' }), point('Q', 3, -2), segment('PQ', 'P', 'Q')];
    expect(labelAnchorPointIds(objects, 'PQ')).toEqual(['A', 'B', 'C', 'P', 'Q']);
    expect(labelAnchorPointIds(objects, 'BC')).toEqual(['A', 'B', 'C', 'P', 'Q']);
  });

  it('yay ölçümüyle kaynak çemberi aynı şekle bağlar', () => {
    const objects: MathObject[] = [point('O'), point('R', 3, 0), point('P', 0, 3, { onObjectId: 'circle' }), point('Q', -3, 0),
      { ...base('circle'), type: 'circle', centerPointId: 'O', radiusPointId: 'R' },
      { ...base('arc-measure'), type: 'measurement', kind: 'arc', circleId: 'circle', pointIds: ['P', 'Q'] },
    ];
    expect(labelAnchorPointIds(objects, 'circle')).toEqual(['O', 'P', 'R']);
    expect(labelAnchorPointIds(objects, 'arc-measure')).toEqual(['O', 'P', 'R']);
  });

  it('üç noktalı çemberin kullanılmayan merkezini dahil etmez', () => {
    const objects: MathObject[] = [point('A'), point('B'), point('C'), point('unused'),
      { ...base('circle'), type: 'circle', centerPointId: 'unused', throughPointIds: ['A', 'B', 'C'] },
    ];
    expect(labelAnchorPointIds(objects, 'circle')).toEqual(['A', 'B', 'C']);
  });

  it('doğru, ışın, yay ve dilimin gerçek tanım noktalarını birleştirir', () => {
    const objects: MathObject[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(id => point(id));
    objects.push(
      { ...base('line'), type: 'line', point1Id: 'A', point2Id: 'B' },
      { ...base('ray'), type: 'ray', startPointId: 'B', throughPointId: 'C' },
      { ...base('arc'), type: 'arc', centerPointId: 'C', startPointId: 'D', directionPointId: 'E' },
      { ...base('sector'), type: 'sector', centerPointId: 'E', startPointId: 'F', directionPointId: 'G' },
    );
    expect(labelAnchorPointIds(objects, 'line')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(labelAnchorPointIds(objects, 'sector')).toEqual(labelAnchorPointIds(objects, 'arc'));
  });

  it('eksik nesne ve nokta referanslarını güvenle atlar', () => {
    const objects: MathObject[] = [point('A'), segment('broken', 'A', 'missing')];
    expect(labelAnchorPointIds(objects, 'missing')).toEqual([]);
    expect(labelAnchorPointIds(objects, 'broken')).toEqual(['A']);
  });
});

describe('shapeAnchorCenter', () => {
  it('nokta sırasından ve tekrarlanan kimliklerden bağımsız ortak merkez hesaplar', () => {
    expect(shapeAnchorCenter(triangle(), ['C', 'B', 'A', 'A'])).toEqual({ x: 2, y: 2 });
  });

  it('deformasyonda ortak merkezi, tüm şekil ötelenince aynı ötelemeyi üretir', () => {
    const objects = triangle();
    const ids = labelAnchorPointIds(objects, 'AB');
    const deformed = objects.map(o => o.id === 'C' && o.type === 'point' ? { ...o, x: 3, y: 9 } : o);
    expect(shapeAnchorCenter(deformed, ids)).toEqual({ x: 3, y: 3 });
    const translated = deformed.map(o => o.type === 'point' ? { ...o, x: o.x + 7, y: o.y - 4 } : o);
    expect(shapeAnchorCenter(translated, ids)).toEqual({ x: 10, y: -1 });
  });

  it('silinmiş, nokta olmayan ve sonlu olmayan değerleri atlar', () => {
    const objects: MathObject[] = [point('A', 4, 8), point('invalid', NaN, Infinity), segment('AB', 'A', 'missing')];
    expect(shapeAnchorCenter(objects, ['A', 'invalid', 'AB', 'missing'])).toEqual({ x: 4, y: 8 });
    expect(shapeAnchorCenter(objects, ['invalid', 'AB', 'missing'])).toBeNull();
    expect(shapeAnchorCenter(objects, [])).toBeNull();
  });
});

describe('anchoredLabelPosition', () => {
  it('kenar veya açı değişse de ayrılmış etiketlerin göreli sırasını korur', () => {
    const objects = triangle();
    const anchors: MeasurementLabelAnchor[] = [
      { pointIds: labelAnchorPointIds(objects, 'AB'), offset: { x: 8, y: 2 }, alignment: 'left' },
      { pointIds: labelAnchorPointIds(objects, 'BC'), offset: { x: 8, y: 0 }, alignment: 'left' },
    ];
    const before = anchors.map(anchor => anchoredLabelPosition(anchor, objects, 4)!);
    const deformed = objects.map(o => o.id === 'B' && o.type === 'point' ? { ...o, x: 9, y: 6 } : o);
    const after = anchors.map(anchor => anchoredLabelPosition(anchor, deformed, 4)!);
    expect(after.map((p, i) => ({ x: p.x - before[i].x, y: p.y - before[i].y }))).toEqual([
      { x: 1, y: 2 }, { x: 1, y: 2 },
    ]);
    expect(after[0].x).toBe(after[1].x);
    expect(after[0].y - after[1].y).toBe(2);
  });

  it('bütün şekil ötelenince etiketleri aynı vektörle taşır', () => {
    const objects = triangle();
    const anchor: MeasurementLabelAnchor = { pointIds: ['A', 'B', 'C'], offset: { x: 8, y: 3 }, alignment: 'center' };
    const before = anchoredLabelPosition(anchor, objects, 4)!;
    const translated = objects.map(o => o.type === 'point' ? { ...o, x: o.x - 5, y: o.y + 11 } : o);
    const after = anchoredLabelPosition(anchor, translated, 4)!;
    expect({ x: after.x - before.x, y: after.y - before.y }).toEqual({ x: -5, y: 11 });
  });

  it.each(['left', 'center', 'right'] as const)('%s hizalı değer uzadığında seçilen hizalama eksenini korur', alignment => {
    const anchor: MeasurementLabelAnchor = { pointIds: ['A', 'B', 'C'], offset: { x: 8, y: 3 }, alignment };
    const referenceX = 10;
    for (const width of [2, 4, 9]) {
      const result = anchoredLabelPosition(anchor, triangle(), width)!;
      const edgeX = result.x + (alignment === 'left' ? -width / 2 : alignment === 'right' ? width / 2 : 0);
      expect(edgeX).toBe(referenceX);
      expect(result.y).toBe(5);
    }
  });

  it('kaynak noktalar kalmadığında etiket için yanlış bir konum üretmez', () => {
    expect(anchoredLabelPosition({ pointIds: ['missing'], offset: { x: 8, y: 3 }, alignment: 'left' }, triangle(), 4)).toBeNull();
  });
});
