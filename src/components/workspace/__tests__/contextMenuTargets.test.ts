import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject, SegmentObject } from '@/types/math';
import { contextMenuTargets } from '../contextMenuTargets';

const base = { showLabel: true, color: 'blue', visible: true, createdAt: 0 };
const point = (id: string, x: number, y: number): PointObject =>
  ({ ...base, id, label: id, type: 'point', x, y, isIndependent: true });
const segment = (id: string, startPointId: string, endPointId: string): SegmentObject =>
  ({ ...base, id, label: id, type: 'segment', startPointId, endPointId });
const ids = (objects: MathObject[]) => objects.map((object) => object.id);

describe('sağ tık menüsündeki nesne sekmeleri', () => {
  const A = point('A', -10, 0), B = point('B', 0, -10), C = point('C', 0, 10), D = point('D', 0, 0);
  const AD = segment('AD', 'A', 'D'), DB = segment('DB', 'D', 'B'), DC = segment('DC', 'D', 'C');
  const angle: MathObject = { ...base, id: 'ADC', label: 'ADC', type: 'angle', point1Id: 'A', vertexPointId: 'D', point3Id: 'C' };
  const scene = [A, B, C, D, AD, DB, DC, angle];

  it('noktanın alt yarısına basınca üstteki kenarı ve köşedeki açıyı da gösterir', () => {
    // Noktanın 18 px yakalayıcısına isabet eden imleç, DC kenarının ucunu kaçırabilir.
    expect(ids(contextMenuTargets(scene, D, ['D', 'DB', 'AD'], true)))
      .toEqual(['D', 'DB', 'AD', 'ADC', 'DC']);
  });

  it('altı nesneden sonra sekmeleri kesmez', () => {
    const many = Array.from({ length: 9 }, (_, i) => segment(`s${i}`, 'A', 'B'));
    expect(ids(contextMenuTargets([D, ...many], D, many.map((object) => object.id), false)))
      .toEqual(['D', ...many.map((object) => object.id)]);
  });

  it('gizli, bulunamayan ve yinelenen isabetleri ayıklar; tıklananı başta tutar', () => {
    const hidden = { ...DC, visible: false };
    expect(ids(contextMenuTargets([D, AD, DB, hidden], D, ['DB', 'D', 'DB', 'DC', 'yok', 'AD'], true)))
      .toEqual(['D', 'DB', 'AD']);
  });

  it('taşınmış nokta adına basınca uzaktaki kenarları ve açıları eklemez', () => {
    expect(ids(contextMenuTargets(scene, D, ['D', 'AD'], false))).toEqual(['D', 'AD']);
  });

  it('nokta dışındaki nesnelerde yalnızca isabet edilen nesneleri korur', () => {
    expect(ids(contextMenuTargets(scene, AD, ['D', 'AD', 'DB'], true))).toEqual(['AD', 'D', 'DB']);
  });

  it('doğru, ışın ve çokgeni ekler; uzaktaki açı köşesini ve ölçüm etiketini eklemez', () => {
    const objects: MathObject[] = [
      ...scene,
      { ...base, id: 'line', label: 'line', type: 'line', point1Id: 'D', point2Id: 'C' },
      { ...base, id: 'ray', label: 'ray', type: 'ray', startPointId: 'A', throughPointId: 'D' },
      { ...base, id: 'poly', label: 'poly', type: 'polygon', pointIds: ['A', 'D', 'C'] },
      { ...angle, id: 'remote-angle', point1Id: 'D', vertexPointId: 'A' },
      { ...base, id: 'measurement', label: 'measurement', type: 'measurement', kind: 'distance', pointIds: ['D', 'A'] },
    ];
    expect(ids(contextMenuTargets(objects, D, ['D'], true)))
      .toEqual(['D', 'poly', 'ray', 'line', 'ADC', 'DC', 'DB', 'AD']);
  });

  it('çemberin çevresindeki tanım noktasını ekler, merkezini eklemez', () => {
    const circle: MathObject = { ...base, id: 'circle', label: 'circle', type: 'circle', centerPointId: 'D', radiusPointId: 'C' };
    const through: MathObject = { ...circle, id: 'through', throughPointIds: ['A', 'B', 'C'] };
    const objects = [A, B, C, D, circle, through];
    expect(ids(contextMenuTargets(objects, D, [], true))).toEqual(['D']);
    expect(ids(contextMenuTargets(objects, C, [], true))).toEqual(['C', 'through', 'circle']);
  });

  it('yayın gerçek uçlarını ve dilim merkezini ekler, uzaktaki yön noktasını eklemez', () => {
    const E = point('E', 20, 0);
    const arc: MathObject = { ...base, id: 'arc', label: 'arc', type: 'arc', centerPointId: 'D', startPointId: 'C', directionPointId: 'A' };
    const farArc: MathObject = { ...arc, id: 'farArc', directionPointId: 'E' };
    const sector: MathObject = { ...arc, id: 'sector', type: 'sector' };
    const objects = [A, C, D, E, arc, farArc, sector];
    expect(ids(contextMenuTargets(objects, C, [], true))).toEqual(['C', 'sector', 'farArc', 'arc']);
    expect(ids(contextMenuTargets(objects, A, [], true))).toEqual(['A', 'sector', 'arc']);
    expect(ids(contextMenuTargets(objects, D, [], true))).toEqual(['D', 'sector']);
    expect(ids(contextMenuTargets(objects, E, [], true))).toEqual(['E']);
  });

  it('nesne üzerinde tanımlanan ara noktanın taşıyıcısını ekler', () => {
    const P = { ...point('P', -5, 0), onObjectId: 'AD' };
    expect(ids(contextMenuTargets([...scene, P], P, [], true))).toEqual(['P', 'AD']);
  });
});
