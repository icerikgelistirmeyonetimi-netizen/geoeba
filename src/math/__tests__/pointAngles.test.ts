import { describe, expect, it } from 'vitest';
import { MathObject, PointObject } from '@/types/math';
import { angleNeighbourIds, pointAngleAction, providesAngleArm } from '../pointAngles';

const base = { showLabel: true, color: 'blue', visible: true, createdAt: 0 };
const point = (id: string, x: number, y: number): PointObject => ({ ...base, id, label: id, type: 'point', x, y, isIndependent: true });
const A = point('A', 0, 0), B = point('B', 4, 0), C = point('C', 0, 3), P = point('P', 2, 0), Q = point('Q', -3, 0);
const seg = (id: string, s: string, e: string): MathObject => ({ ...base, id, label: id, type: 'segment', startPointId: s, endPointId: e });
const circle = (id: string, center: string, radiusPointId?: string): MathObject =>
  ({ ...base, id, label: id, type: 'circle', centerPointId: center, ...(radiusPointId ? { radiusPointId } : { fixedRadius: 2 }) });
const triangle: MathObject = { ...base, id: 'poly', label: 'ABC', type: 'polygon', pointIds: ['A', 'B', 'C'] };

describe('pointAngleAction (sağ tık "Açısını ölç")', () => {
  it('düz çember merkezinde, yalnız noktada ve yarıçap noktasında sunulmaz', () => {
    expect(pointAngleAction('A', [A, circle('c', 'A')])).toBeNull();
    expect(pointAngleAction('A', [A, P, circle('c', 'A', 'P')])).toBeNull();
    expect(pointAngleAction('P', [A, P, circle('c', 'A', 'P')])).toBeNull();
    expect(pointAngleAction('Q', [A, Q])).toBeNull();
  });

  it('aynı zamanda çokgen köşesi olan çember merkezinde sunulur', () => {
    expect(pointAngleAction('A', [A, B, C, circle('c', 'A'), triangle])).toEqual({ kind: 'vertex', neighbourIds: ['C', 'B'] });
  });

  it('iki FARKLI komşu kenar gerekir', () => {
    expect(pointAngleAction('A', [A, B, seg('s1', 'A', 'B')])).toBeNull();
    expect(angleNeighbourIds('A', [A, B, seg('s1', 'A', 'B'), seg('s2', 'B', 'A')])).toEqual(['B']);
    expect(pointAngleAction('A', [A, seg('s0', 'A', 'A'), seg('s3', 'A', 'GONE')])).toBeNull();
    const mixed: MathObject[] = [A, B, C, seg('s1', 'A', 'B'),
      { ...base, id: 'r', label: 'r', type: 'ray', startPointId: 'A', throughPointId: 'C' }];
    expect(pointAngleAction('A', mixed)).toEqual({ kind: 'vertex', neighbourIds: ['B', 'C'] });
  });

  it('measureAngleAtPoint sırasını korur: önce parça/doğru/ışın, sonra çokgen komşuları', () => {
    const line: MathObject = { ...base, id: 'l', label: 'l', type: 'line', point1Id: 'Q', point2Id: 'A' };
    expect(angleNeighbourIds('A', [triangle, A, B, C, Q, line])).toEqual(['Q', 'C', 'B']);
  });

  it('yay / dilim merkezi merkez açı düğmesidir', () => {
    const arc: MathObject = { ...base, id: 'arc', label: 'arc', type: 'arc', centerPointId: 'A', startPointId: 'B', directionPointId: 'C' };
    expect(pointAngleAction('A', [A, B, C, arc])).toEqual({ kind: 'central', shape: arc, shapes: [arc] });
    // Bölünmüş çemberin merkezinde iki yay: ikisi birlikte açılıp kapanır
    const arc2 = { ...arc, id: 'arc2', startPointId: 'C', directionPointId: 'B' } as MathObject;
    const both = pointAngleAction('A', [A, B, C, arc, arc2]);
    expect(both?.kind === 'central' && both.shapes.map((s) => s.id)).toEqual(['arc', 'arc2']);
    const sector = { ...arc, id: 'sec', type: 'sector' } as MathObject;
    expect(pointAngleAction('A', [A, B, C, circle('c', 'A'), sector])?.kind).toBe('central');
    expect(pointAngleAction('B', [A, B, C, arc])).toBeNull();
  });
});

describe('providesAngleArm (silme zincirinde açının kolu)', () => {
  it('doğru parçası iki yönde de kolu çizer', () => {
    expect(providesAngleArm(seg('s', 'A', 'B'), 'A', 'B')).toBe(true);
    expect(providesAngleArm(seg('s', 'B', 'A'), 'A', 'B')).toBe(true);
    expect(providesAngleArm(seg('s', 'A', 'C'), 'A', 'B')).toBe(false);
  });

  it('doğru tanım noktalarıyla, ışın her iki yönde kolu çizer', () => {
    const line: MathObject = { ...base, id: 'l', label: 'l', type: 'line', point1Id: 'Q', point2Id: 'A' };
    expect(providesAngleArm(line, 'A', 'Q')).toBe(true);
    expect(providesAngleArm(line, 'A', 'B')).toBe(false);
    const ray: MathObject = { ...base, id: 'r', label: 'r', type: 'ray', startPointId: 'A', throughPointId: 'C' };
    expect(providesAngleArm(ray, 'A', 'C')).toBe(true);
    expect(providesAngleArm(ray, 'C', 'A')).toBe(true);
  });

  it('çokgende yalnızca KOMŞU köşeler (son->ilk kenar dâhil); köşegen kol değildir', () => {
    const kare: MathObject = { ...base, id: 'k', label: 'k', type: 'polygon', pointIds: ['A', 'B', 'C', 'D'] };
    expect(providesAngleArm(kare, 'A', 'B')).toBe(true);
    expect(providesAngleArm(kare, 'C', 'B')).toBe(true);
    expect(providesAngleArm(kare, 'A', 'D')).toBe(true);
    expect(providesAngleArm(kare, 'A', 'C')).toBe(false);
    expect(providesAngleArm(kare, 'B', 'D')).toBe(false);
  });

  it('köşe ile uç aynıysa ya da şekil kol çizmiyorsa false', () => {
    expect(providesAngleArm(seg('s0', 'A', 'A'), 'A', 'A')).toBe(false);
    expect(providesAngleArm(circle('c', 'A', 'B'), 'A', 'B')).toBe(false);
    expect(providesAngleArm(A, 'A', 'B')).toBe(false);
    const arc: MathObject = { ...base, id: 'arc', label: 'arc', type: 'arc', centerPointId: 'A', startPointId: 'B', directionPointId: 'C' };
    expect(providesAngleArm(arc, 'A', 'B')).toBe(false);
  });
});
