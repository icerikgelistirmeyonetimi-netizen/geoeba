import { describe, expect, it } from 'vitest';
import { AngleObject, MathObject, PointObject, SliderObject } from '@/types/math';
import { resolveCommandBindings } from '../commandBindings';
import { calculateAngleDegrees } from '../geometry';

describe('angle slider binding and animation', () => {
  it.each(['first', 'third'] as const)('updates only the tagged angle when its %s arm is slider driven', arm => {
    const base = (id: string) => ({ id, label: id, color: '#000', visible: true, showLabel: true, createdAt: 0 });
    const point = (id: string, x: number, y: number): PointObject => ({ ...base(id), type: 'point', x, y, isIndependent: true });
    const vertex = point('V', 0, 0), first = point('A', 3, 0), third = point('B', 0, 2), other = point('C', -2, 0);
    const moving = arm === 'first' ? first : third;
    const reference = arm === 'first' ? third : first;
    moving.construction = { kind: 'sliderPoint', sliderId: 's', mode: 'angle', anchorId: 'V', referenceId: reference.id, radius: 2, orientation: 1 };
    const slider: SliderObject = { ...base('s'), type: 'slider', variableName: 'a', min: 0, max: 360, step: 1, value: 270 };
    const selected: AngleObject = { ...base('selected'), type: 'angle', vertexPointId: 'V', point1Id: 'A', point3Id: 'B', valueSliderId: 's', reflex: false };
    const unrelated: AngleObject = { ...selected, id: 'unrelated', point1Id: arm === 'first' ? 'A' : 'C', point3Id: arm === 'first' ? 'C' : 'B' };
    const untagged: AngleObject = { ...selected, id: 'untagged', valueSliderId: undefined };
    const scene: MathObject[] = [selected, unrelated, untagged, vertex, first, third, other, slider];
    const exterior = resolveCommandBindings(scene);
    expect(exterior.find(o => o.id === 'selected')).toMatchObject({ reflex: true });
    expect(exterior.find(o => o.id === 'unrelated')).toBe(unrelated);
    expect(exterior.find(o => o.id === 'untagged')).toBe(untagged);
    const interior = resolveCommandBindings(exterior.map(o => o.id === 's' ? { ...o, value: 45 } as SliderObject : o));
    expect(interior.find(o => o.id === 'selected')).toMatchObject({ reflex: false });
  });

  it('dynamically rotates point3 and updates angle measurement when slider value changes', () => {
    // V at (0, 0), P1 at (4, 0) -> initial arm along positive X axis
    const V: PointObject = {
      id: 'pt-v',
      type: 'point',
      label: 'V',
      x: 0,
      y: 0,
      createdAt: 1,
      isIndependent: true,
      showLabel: true,
      color: '#000',
      visible: true,
    };
    const P1: PointObject = {
      id: 'pt-p1',
      type: 'point',
      label: 'A',
      x: 4,
      y: 0,
      createdAt: 2,
      isIndependent: true,
      showLabel: true,
      color: '#000',
      visible: true,
    };
    const slider: SliderObject = {
      id: 'slider-alpha',
      type: 'slider',
      variableName: 'α',
      label: 'α',
      min: 0,
      max: 360,
      step: 1,
      value: 60,
      sliderType: 'angle',
      x: -5,
      y: 5,
      createdAt: 3,
      showLabel: true,
      color: '#000',
      visible: true,
    };
    // P3 rotating around V starting from P1 by slider degrees
    const P3: PointObject = {
      id: 'pt-p3',
      type: 'point',
      label: "A'",
      x: 0,
      y: 0,
      construction: {
        kind: 'rotate',
        sourceId: P1.id,
        centerId: V.id,
        sliderId: slider.id,
        sliderVariableName: 'α',
        degrees: 60,
      },
      createdAt: 4,
      isIndependent: false,
      showLabel: true,
      color: '#000',
      visible: true,
    };
    const angle: AngleObject = {
      id: 'ang-1',
      type: 'angle',
      label: 'α',
      point1Id: P1.id,
      vertexPointId: V.id,
      point3Id: P3.id,
      createdAt: 5,
      showLabel: true,
      color: '#000',
      visible: true,
    };

    const scene: MathObject[] = [V, P1, slider, P3, angle];

    // Initial resolution with slider value = 60°
    const resolved60 = resolveCommandBindings(scene);
    const p3Resolved60 = resolved60.find((o) => o.id === P3.id) as PointObject;
    expect(p3Resolved60.x).toBeCloseTo(4 * Math.cos((60 * Math.PI) / 180), 3);
    expect(p3Resolved60.y).toBeCloseTo(4 * Math.sin((60 * Math.PI) / 180), 3);

    const deg60 = calculateAngleDegrees(P1, V, p3Resolved60);
    expect(deg60).toBeCloseTo(60, 1);

    // Update slider value to 90° (Right angle)
    const scene90 = scene.map((o) => (o.id === slider.id ? { ...o, value: 90 } : o));
    const resolved90 = resolveCommandBindings(scene90);
    const p3Resolved90 = resolved90.find((o) => o.id === P3.id) as PointObject;
    expect(p3Resolved90.x).toBeCloseTo(0, 3);
    expect(p3Resolved90.y).toBeCloseTo(4, 3);

    const deg90 = calculateAngleDegrees(P1, V, p3Resolved90);
    expect(deg90).toBeCloseTo(90, 1);

    // Update slider value to 180° (Straight angle)
    const scene180 = scene.map((o) => (o.id === slider.id ? { ...o, value: 180 } : o));
    const resolved180 = resolveCommandBindings(scene180);
    const p3Resolved180 = resolved180.find((o) => o.id === P3.id) as PointObject;
    expect(p3Resolved180.x).toBeCloseTo(-4, 3);
    expect(p3Resolved180.y).toBeCloseTo(0, 3);

    const deg180 = calculateAngleDegrees(P1, V, p3Resolved180);
    expect(deg180).toBeCloseTo(180, 1);
  });
});
