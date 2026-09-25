import { describe, expect, it } from 'vitest';
import type { AngleObject, EllipseObject, FunctionObject, MathObject, PointObject, SliderObject } from '@/types/math';
import { applyDeletionPlan, planDeletion } from '@/state/WorkspaceContext';
import { resolveCommandBindings } from '../commandBindings';
import { detachSliderBindings } from '../sliderBindings';
import { compileMathExpression, getUserFunctions } from '../parser';
import { withUserFunctions } from '../functionNames';
import { parseProjectFile } from '../projectFile';

const base = (id: string) => ({ id, label: id, showLabel: true, color: '#123456', visible: true, createdAt: 0 });
const point = (id: string, x: number, y: number, extra: Partial<PointObject> = {}): PointObject => ({ ...base(id), type: 'point', x, y, isIndependent: true, ...extra });
const slider = (id: string, variableName: string, value: number): SliderObject => ({ ...base(id), type: 'slider', variableName, min: -1000, max: 1000, step: 0.1, value });
const getPoint = (objects: MathObject[], id: string) => objects.find(o => o.id === id) as PointObject;
const remove = (objects: MathObject[], ids: string[]) => {
  const prepared = detachSliderBindings(objects, ids);
  return applyDeletionPlan(prepared, planDeletion(prepared, ids));
};
const expectPosition = (actual: PointObject, expected: PointObject) => {
  expect(actual.x).toBeCloseTo(expected.x, 10);
  expect(actual.y).toBeCloseTo(expected.y, 10);
};

describe('kaydırıcıyı silerken çizimi koruma', () => {
  it('görsel ölçü hedefi şekli silerken kaydırıcıyı silmez; bağı çözünce yalnız eski adı temizler', () => {
    const s = { ...slider('s', 'a', 5), bindingTarget: { objectId: 'seg', propertyKey: 'length' } };
    const A = point('A', 0, 0);
    const B = point('B', 5, 0, { isIndependent: false, construction: { kind: 'sliderPoint', sliderId: 's', mode: 'length', anchorId: 'A', direction: { x: 1, y: 0 } } });
    const objects: MathObject[] = [A, B, s, { ...base('seg'), type: 'segment', startPointId: 'A', endPointId: 'B' }];
    expect(planDeletion(objects, ['seg']).removal.has('s')).toBe(false);
    const prepared = detachSliderBindings(objects, ['s']);
    expect(prepared.find(o => o.id === 's')).toMatchObject({ variableName: 'a', value: 5 });
    expect(prepared.find(o => o.id === 's')).not.toHaveProperty('bindingTarget');
    expect(s.bindingTarget).toEqual({ objectId: 'seg', propertyKey: 'length' });
  });

  it('canlı koordinat, uzunluk ve açı noktalarını son değerlere çözüp dondurur; şekiller kalırken denetim bileşeni silinir', () => {
    const s = slider('s', 'a', 60);
    const A = point('A', 1, 2), C = point('C', 5, 2);
    const B = point('B', 99, 99, { isIndependent: false, dependsOn: ['s'], construction: { kind: 'sliderPoint', sliderId: 's', mode: 'length', anchorId: 'A', direction: { x: 0.6, y: 0.8 } } });
    const D = point('D', 99, 99, { isIndependent: false, construction: { kind: 'sliderPoint', sliderId: 's', mode: 'angle', anchorId: 'A', referenceId: 'C', radius: 2, orientation: 1 } });
    const X = point('X', 0, 7, { isIndependent: false, construction: { kind: 'sliderPoint', sliderId: 's', mode: 'x' } });
    const Y = point('Y', -3, 0, { isIndependent: false, construction: { kind: 'sliderPoint', sliderId: 's', mode: 'y' } });
    const M = point('M', 0, 0, { isIndependent: false, construction: { kind: 'midpoint', pointIds: ['A', 'B'] } });
    const angle: AngleObject = { ...base('angle'), type: 'angle', point1Id: 'C', vertexPointId: 'A', point3Id: 'D', valueSliderId: 's' };
    const objects: MathObject[] = [A, B, C, D, X, Y, M, s, angle,
      { ...base('poly'), type: 'polygon', pointIds: ['A', 'B', 'C'], showArea: true },
      { ...base('seg'), type: 'segment', startPointId: 'A', endPointId: 'B' },
      { ...base('control'), type: 'button', x: 0, y: 0, action: { kind: 'setSlider', sliderId: 's', value: 90 } },
    ];
    const snapshot = JSON.stringify(objects), expected = resolveCommandBindings(objects);
    const prepared = detachSliderBindings(objects, ['s']);
    expect(prepared.find(o => o.id === 's')).toBe(s);
    for (const id of ['B', 'D', 'X', 'Y']) {
      expectPosition(getPoint(prepared, id), getPoint(expected, id));
      expect(getPoint(prepared, id).construction).toBeUndefined();
      expect(getPoint(prepared, id).isIndependent).toBe(true);
    }
    expect(getPoint(prepared, 'B').dependsOn).toBeUndefined();
    expect(getPoint(prepared, 'M').construction).toEqual(M.construction);
    expect((prepared.find(o => o.id === 'angle') as AngleObject).valueSliderId).toBeUndefined();
    const plan = planDeletion(prepared, ['s']);
    expect([...plan.removal].sort()).toEqual(['control', 's']);
    const remaining = applyDeletionPlan(prepared, plan);
    expect(remaining.map(o => o.id)).toEqual(objects.filter(o => o.id !== 's' && o.id !== 'control').map(o => o.id));
    expect(() => parseProjectFile({ objects: remaining })).not.toThrow();
    expect(() => resolveCommandBindings(remaining)).not.toThrow();
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it('üçgenin bir kaydırıcısı silinince kurulu köşeleri dondurur, diğer ilişkileri ve kaydırıcıları korur', () => {
    const A = point('A', 1, 2);
    const lengths = [slider('sa', 'a', 4), slider('sb', 'b', 4), slider('sc', 'c', 5)];
    const rule = { kind: 'triangleVertex' as const, anchorId: 'A', sliderIds: ['sa', 'sb', 'sc'] as [string, string, string], rotation: 0.25, orientation: -1 as const };
    const B = point('B', 0, 0, { isIndependent: false, construction: { ...rule, vertex: 1 } });
    const C = point('C', 0, 0, { isIndependent: false, construction: { ...rule, vertex: 2 } });
    const M = point('M', 0, 0, { isIndependent: false, construction: { kind: 'midpoint', pointIds: ['B', 'C'] } });
    const X = point('X', 0, 2, { isIndependent: false, construction: { kind: 'sliderPoint', mode: 'x', sliderId: 'sb' } });
    const objects: MathObject[] = [A, B, C, M, X, ...lengths, { ...base('triangle'), type: 'polygon', pointIds: ['A', 'B', 'C'] }];
    const expected = resolveCommandBindings(objects), remaining = remove(objects, ['sa']);
    expect(remaining.some(o => o.id === 'triangle')).toBe(true);
    expect(remaining.filter(o => o.type === 'slider').map(o => o.id)).toEqual(['sb', 'sc']);
    for (const id of ['B', 'C']) {
      expectPosition(getPoint(remaining, id), getPoint(expected, id));
      expect(getPoint(remaining, id).construction).toBeUndefined();
    }
    expect(getPoint(remaining, 'M').construction).toEqual(M.construction);
    const updated = resolveCommandBindings(remaining.map(o => o.id === 'sb' ? { ...o, value: 8 } as SliderObject : o));
    for (const id of ['B', 'C', 'M']) expectPosition(getPoint(updated, id), getPoint(expected, id));
    expect(getPoint(updated, 'X').x).toBe(8);
    expect(() => parseProjectFile({ objects: remaining })).not.toThrow();
  });

  it('döndürme açısını sabitlerken kaynak ve merkez bağımlılığını sürdürür', () => {
    const M = point('M', 0, 0), S = point('S', 2, 0);
    const D = point('D', 0, 0, { isIndependent: false, construction: { kind: 'rotate', sourceId: 'S', centerId: 'M', degrees: 45, sliderId: 's', sliderVariableName: 'a' } });
    const objects: MathObject[] = [M, S, D, slider('s', 'a', 270), { ...base('arc'), type: 'arc', centerPointId: 'M', startPointId: 'S', directionPointId: 'D' }];
    const remaining = remove(objects, ['s']);
    expect(getPoint(remaining, 'D').construction).toEqual({ kind: 'rotate', sourceId: 'S', centerId: 'M', degrees: 270 });
    expect(getPoint(remaining, 'D').isIndependent).toBe(false);
    expect(getPoint(remaining, 'D').y).toBeCloseTo(-2);
    const moved = resolveCommandBindings(remaining.map(o => o.id === 'S' ? { ...S, x: 5 } : o));
    expect(getPoint(moved, 'D').y).toBeCloseTo(-5);
    expect(moved.some(o => o.id === 'arc')).toBe(true);
    expect(() => parseProjectFile({ objects: remaining })).not.toThrow();
  });

  it('elipsin silinen bağı son sayısal değerde kalırken diğer yarıçap bağı canlı kalır', () => {
    const ellipse: EllipseObject = { ...base('ellipse'), type: 'ellipse', centerPointId: 'A', radiusX: 1, radiusY: 1, rotation: 0, sliderBindings: { radiusX: 's1', radiusY: 's2', rotation: 's1' } };
    const objects = [point('A', 0, 0), slider('s1', 'a', 6), slider('s2', 'b', 3), ellipse];
    const remaining = remove(objects, ['s1']);
    expect(remaining.find(o => o.id === 'ellipse')).toMatchObject({ radiusX: 6, radiusY: 3, rotation: 6, sliderBindings: { radiusY: 's2' } });
    const updated = resolveCommandBindings(remaining.map(o => o.id === 's2' ? { ...o, value: 8 } as SliderObject : o));
    expect(updated.find(o => o.id === 'ellipse')).toMatchObject({ radiusX: 6, radiusY: 8, rotation: 6 });
    const final = remove(updated, ['s2']);
    expect((final.find(o => o.id === 'ellipse') as EllipseObject).sliderBindings).toBeUndefined();
    expect(() => parseProjectFile({ objects: final })).not.toThrow();
  });

  it('birden çok silinen değişkeni token olarak dondurur; benzer adlar, üsler ve bilimsel sayılar korunur', () => {
    const expression = 'A^2 + 2a + aa*x + a2 + a(x+1) + sin(a) + 1e3 + e3 + z';
    const fn: FunctionObject = { ...base('f'), type: 'function', expression, label: `f(x) = ${expression}` };
    const objects: MathObject[] = [slider('s', 'a', -2.5), slider('e', 'e3', 8), slider('z', 'z', 1e-7), slider('keep1', 'aa', 4), slider('keep2', 'a2', 3), fn];
    const snapshot = JSON.stringify(objects), previousFunctions = getUserFunctions();
    const values = [-2, 0, 3].map(x => withUserFunctions(objects, () => compileMathExpression(expression)!(x, { a: -2.5, e3: 8, z: 1e-7, aa: 4, a2: 3 })));
    const remaining = remove(objects, ['s', 'e', 'z']);
    const fixed = remaining.find(o => o.id === 'f') as FunctionObject;
    expect(fixed.expression).toContain('(-2.5)^2');
    expect(fixed.expression).toContain('2(-2.5)');
    expect(fixed.expression).toContain('aa*x + a2');
    expect(fixed.expression).toContain('1e3 + (8) + (1e-7)');
    expect(fixed.label).toBe(`f(x) = ${fixed.expression}`);
    for (const [i, x] of [-2, 0, 3].entries()) {
      const result = withUserFunctions(remaining, () => compileMathExpression(fixed.expression)!(x, { aa: 4, a2: 3 }));
      expect(result).toBeCloseTo(values[i], 10);
    }
    expect(JSON.stringify(objects)).toBe(snapshot);
    expect(getUserFunctions()).toEqual(previousFunctions);
  });

  it('kullanıcı fonksiyonu çağrılarını ve özel etiketleri korur', () => {
    const f: FunctionObject = { ...base('f'), type: 'function', label: 'f(x) = a*x', expression: 'a*x' };
    const g: FunctionObject = { ...base('g'), type: 'function', label: 'g(x) = f(x) + a', expression: 'f(x) + a' };
    const custom: FunctionObject = { ...base('curve'), type: 'function', label: 'Özel eğri', expression: 'a*x^2' };
    const objects = [slider('s', 'a', 3), f, g, custom];
    const remaining = remove(objects, ['s']);
    expect((remaining.find(o => o.id === 'g') as FunctionObject).expression).toBe('f(x) + (3)');
    expect((remaining.find(o => o.id === 'curve') as FunctionObject).label).toBe('Özel eğri');
    expect(withUserFunctions(remaining, () => compileMathExpression('g(x)')!(2))).toBe(9);
  });

  it('yalnız istenen gerçek kaydırıcıları çözer; diğer geometri silmelerinin kapsamını genişletmez', () => {
    const A = point('A', 0, 0), s = slider('s', 'a', 2);
    const B = point('B', 2, 0, { isIndependent: false, construction: { kind: 'sliderPoint', mode: 'x', sliderId: 's' } });
    const objects: MathObject[] = [A, s, B, { ...base('segment'), type: 'segment', startPointId: 'A', endPointId: 'B' }];
    expect(detachSliderBindings(objects, ['A', 'missing'])).toBe(objects);
    const remaining = remove(objects, ['s', 'segment']);
    expect(remaining.some(o => o.id === 'segment')).toBe(false);
    expect(remaining.some(o => o.id === 's')).toBe(false);
  });

  it('kalan dependsOn ve diğer bağları korur; geçersiz canlı değerlerde girdiyi değiştirmez', () => {
    const A = point('A', 0, 0), s = slider('s', 'a', 2);
    const B = point('B', 2, 0, { isIndependent: false, dependsOn: ['s', 'A'] });
    const prepared = detachSliderBindings([A, B, s], ['s']);
    expect(getPoint(prepared, 'B')).toMatchObject({ dependsOn: ['A'], isIndependent: false });
    const invalid = [A, slider('s', 'a', 0), point('D', 2, 0, { isIndependent: false, construction: { kind: 'sliderPoint', mode: 'length', sliderId: 's', anchorId: 'A', direction: { x: 1, y: 0 } } })];
    const snapshot = JSON.stringify(invalid);
    expect(() => detachSliderBindings(invalid, ['s'])).toThrow('sıfırdan büyük');
    expect(JSON.stringify(invalid)).toBe(snapshot);
  });
});
