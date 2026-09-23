import { describe, expect, it } from 'vitest';
import type { EllipseObject, MathObject, PointObject, SliderObject } from '@/types/math';
import { resolveCommandBindings } from '../commandBindings';
import { collectDependentIds, objectDependencies } from '@/state/WorkspaceContext';

const base = (id: string) => ({ id, label: id, color: '#000', visible: true, showLabel: true, createdAt: 0 });
const point = (id: string, x = 0, y = 0): PointObject => ({ ...base(id), type: 'point', x, y, isIndependent: true });
const slider = (id: string, value: number): SliderObject => ({ ...base(id), type: 'slider', variableName: id, value, min: -360, max: 360, step: 1 });
const ellipse = (sliderBindings: EllipseObject['sliderBindings'] = { radiusX: 'rx' }): EllipseObject => ({ ...base('ellipse'), type: 'ellipse', centerPointId: 'O', radiusX: 2, radiusY: 1, rotation: 0, sliderBindings });
const getEllipse = (objects: MathObject[]) => objects.find((o): o is EllipseObject => o.type === 'ellipse')!;

describe('ellipse slider properties', () => {
  it('updates all bound properties without any point construction, leaving the source untouched', () => {
    const shape = ellipse({ radiusX: 'rx', radiusY: 'ry', rotation: 'turn' });
    const scene = [shape, point('O'), slider('rx', 5), slider('ry', 3), slider('turn', -45)];
    const snapshot = JSON.stringify(scene);
    const resolved = resolveCommandBindings(scene);
    expect(getEllipse(resolved)).toMatchObject({ radiusX: 5, radiusY: 3, rotation: -45, sliderBindings: shape.sliderBindings });
    expect(resolved[1]).toBe(scene[1]);
    expect(JSON.stringify(scene)).toBe(snapshot);
    const updated = resolveCommandBindings(resolved.map(o => o.id === 'rx' ? { ...o, value: 7 } as SliderObject : o));
    expect(getEllipse(updated)).toMatchObject({ radiusX: 7, radiusY: 3, rotation: -45 });
    expect(getEllipse(resolveCommandBindings(updated))).toBe(getEllipse(updated));
  });

  it('supports one slider controlling both radii and preserves unbound properties', () => {
    const shape = { ...ellipse({ radiusX: 'rx', radiusY: 'rx' }), rotation: 25 };
    expect(getEllipse(resolveCommandBindings([shape, point('O'), slider('rx', 4)]))).toMatchObject({ radiusX: 4, radiusY: 4, rotation: 25 });
  });

  it.each([false, true])('dependent intersections use the current radius regardless of scene order (reverse=%s)', reverse => {
    const intersection: PointObject = { ...point('I'), construction: { kind: 'intersection', objectIds: ['ellipse', 'line'], index: 0 } };
    const scene: MathObject[] = [intersection, ellipse(), point('O', 1, 2), point('A', -10, 2), point('B', 10, 2),
      { ...base('line'), type: 'line', point1Id: 'A', point2Id: 'B' }, slider('rx', 5)];
    const resolved = resolveCommandBindings(reverse ? [...scene].reverse() : scene);
    const result = resolved.find(o => o.id === 'I') as PointObject;
    expect(Math.abs(result.x - 1)).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(2);
    const changed = resolveCommandBindings(resolved.map(o => o.id === 'rx' ? { ...o, value: 7 } as SliderObject : o));
    expect(Math.abs((changed.find(o => o.id === 'I') as PointObject).x - 1)).toBeCloseTo(7);
  });

  it.each([
    ['radiusX', 0], ['radiusY', -1], ['radiusX', Infinity], ['rotation', NaN],
  ] as const)('rejects invalid %s values atomically (%s)', (property, value) => {
    const scene = [point('O'), ellipse({ [property]: 'rx' }), slider('rx', value)];
    const snapshot = JSON.stringify(scene);
    expect(() => resolveCommandBindings(scene)).toThrow();
    expect(JSON.stringify(scene)).toBe(snapshot);
  });

  it('rejects missing or non-slider binding targets', () => {
    expect(() => resolveCommandBindings([point('O'), ellipse()])).toThrow('kaydırıcı');
    expect(() => resolveCommandBindings([point('O'), point('rx'), ellipse()])).toThrow('kaydırıcı');
  });

  it('rejects a cycle through its constructed center without committing radius changes', () => {
    const center: PointObject = { ...point('O'), construction: { kind: 'intersection', objectIds: ['ellipse', 'line'], index: 0 } };
    const scene: MathObject[] = [center, ellipse(), slider('rx', 5), point('A', -10, 0), point('B', 10, 0),
      { ...base('line'), type: 'line', point1Id: 'A', point2Id: 'B' }];
    const snapshot = JSON.stringify(scene);
    expect(() => resolveCommandBindings(scene)).toThrow('Döngüsel');
    expect(JSON.stringify(scene)).toBe(snapshot);
  });

  it('tracks slider dependencies for deletion of the ellipse and its dependent construction', () => {
    const shape = ellipse({ radiusX: 'rx', rotation: 'turn' });
    const intersection: PointObject = { ...point('I'), construction: { kind: 'intersection', objectIds: ['ellipse', 'line'], index: 0 } };
    const scene: MathObject[] = [point('O'), point('A', -10), point('B', 10), shape, slider('rx', 5), slider('turn', 0), intersection,
      { ...base('line'), type: 'line', point1Id: 'A', point2Id: 'B' }];
    expect(objectDependencies(shape)).toEqual(['O', 'rx', 'turn']);
    const removed = collectDependentIds(scene, ['rx']);
    expect(removed.has('ellipse')).toBe(true);
    expect(removed.has('I')).toBe(true);
    expect(removed.has('line')).toBe(false);
  });
});
