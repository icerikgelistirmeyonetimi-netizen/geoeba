import { describe, expect, it } from 'vitest';
import { MathObject, PointObject, PolygonObject } from '@/types/math';
import { planDeletion } from '../WorkspaceContext';

const nokta = (id: string, x: number, y: number): PointObject =>
  ({ id, type: 'point', label: id, x, y, visible: true, showLabel: true, isIndependent: true, color: '#2563eb', createdAt: 1 }) as PointObject;
const cokgen = (id: string, ids: string[], ek: Partial<PolygonObject> = {}): PolygonObject =>
  ({ id, type: 'polygon', label: id, pointIds: ids, visible: true, showLabel: true, color: '#10b981', createdAt: 2, ...ek }) as PolygonObject;

describe('Ölçmek için kurulan şekil silinince kullanıcının noktaları kalır', () => {
  const noktalar = [nokta('A', 0, 0), nokta('B', 4, 0), nokta('C', 2, 3)];

  it('"Alanı Bul" çokgeni (olcumSekli) silinince noktalar yerinde kalır', () => {
    const sahne: MathObject[] = [...noktalar, cokgen('alanOlcumu', ['A', 'B', 'C'], { olcumSekli: true, showArea: true })];
    const plan = planDeletion(sahne, ['alanOlcumu']);
    expect([...plan.removal]).toEqual(['alanOlcumu']);
    expect(plan.ownPointIds).toEqual([]);
  });

  it('"Çevre Hesapla" çokgeni de noktaları götürmez', () => {
    const sahne: MathObject[] = [...noktalar, cokgen('cevreOlcumu', ['A', 'B', 'C'], { olcumSekli: true, showPerimeter: true })];
    expect([...planDeletion(sahne, ['cevreOlcumu']).removal]).toEqual(['cevreOlcumu']);
  });

  it('sıradan çokgen silinince kendi noktaları da gider (kural değişmedi)', () => {
    const sahne: MathObject[] = [...noktalar, cokgen('ucgen', ['A', 'B', 'C'])];
    const plan = planDeletion(sahne, ['ucgen']);
    expect([...plan.removal].sort()).toEqual(['A', 'B', 'C', 'ucgen']);
    expect([...plan.ownPointIds].sort()).toEqual(['A', 'B', 'C']);
  });

  it('ölçüm çokgeninin noktasını başka bir şekil kullanıyorsa yine kalır', () => {
    const sahne: MathObject[] = [
      ...noktalar,
      cokgen('alanOlcumu', ['A', 'B', 'C'], { olcumSekli: true }),
      { id: 'sAB', type: 'segment', label: '[AB]', startPointId: 'A', endPointId: 'B', visible: true, showLabel: false, color: '#0284c7', createdAt: 3 } as MathObject,
    ];
    const plan = planDeletion(sahne, ['alanOlcumu']);
    expect([...plan.removal]).toEqual(['alanOlcumu']);
  });
});
