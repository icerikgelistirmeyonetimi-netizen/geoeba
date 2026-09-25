import { describe, expect, it } from 'vitest';
import type { AngleObject, MathObject, PointObject, PolygonObject, SliderObject } from '@/types/math';
import { sliderDisplay } from '../sliderDisplay';
import { bindSliderProperty, rebindSliderProperty } from '../sliderBindings';
import { duzMetin } from '../matematikYazimi';

const base = (id: string) => ({ id, label: id, color: '#123456', visible: true, showLabel: true, createdAt: 0 });
const point = (id: string, x = 0, y = 0, extra: Partial<PointObject> = {}): PointObject => ({ ...base(id), type: 'point', x, y, isIndependent: true, ...extra });
const slider = (value = 10.5, extra: Partial<SliderObject> = {}): SliderObject => ({ ...base('s'), type: 'slider', variableName: 'a', min: -360, max: 360, step: 0.1, value, ...extra });
const length = (anchorId: string): PointObject['construction'] => ({ kind: 'sliderPoint', sliderId: 's', mode: 'length', anchorId, direction: { x: 1, y: 0 } });
const angle = (anchorId: string, referenceId: string): PointObject['construction'] => ({ kind: 'sliderPoint', sliderId: 's', mode: 'angle', anchorId, referenceId, radius: 3, orientation: 1 });
const A = point('A'), B = point('B', 3), C = point('C', 0, 4);
const polygon: PolygonObject = { ...base('poly'), type: 'polygon', pointIds: ['A', 'B', 'C'] };

describe('slider display', () => {
  it('infers old endpoint bindings, forces full notation and uses the slider value', () => {
    const s = slider(), boundB = { ...B, construction: length('A') };
    const objects = [A, boundB, s];
    const snapshot = JSON.stringify(objects);
    const display = sliderDisplay(objects, s, { olcuYazimi: 'kisa', aciYazimi: 'sapka' });
    expect(display).toMatchObject({ name: '|AB|', text: '|AB| = 10,5 br', unit: 'br' });
    expect(display.nameNodes).toEqual([{ t: 'mutlak', ic: [{ t: 'ad', s: 'A' }, { t: 'ad', s: 'B' }] }]);
    expect(duzMetin(display.nodes)).toBe(display.text);
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it('retains all current value digits instead of rounding the slider to a geometric measurement', () => {
    const s = slider(10.56789123456789);
    expect(sliderDisplay([A, { ...B, construction: length('A') }, s], s).text).toBe('|AB| = 10,56789123456789 br');
  });

  it('reads renamed point identities even when the point or label is hidden', () => {
    const s = slider();
    const scene = [{ ...A, label: 'P_1', showLabel: false }, { ...B, label: "Q'", visible: false, construction: length('A') }, s];
    expect(sliderDisplay(scene, s).name).toBe("|P_1Q'|");
  });

  it.each(['sapka', 'isaret'] as const)('infers angle bindings on a numeric slider and honors %s notation', aciYazimi => {
    const s = slider(60, { sliderType: 'number' });
    const display = sliderDisplay([A, B, { ...C, construction: angle('A', 'B') }, s], s, { olcuYazimi: 'kisa', aciYazimi });
    expect(display).toMatchObject({ name: 'm(∠BAC)', text: 'm(∠BAC) = 60°', unit: '°' });
    expect(display.nameNodes.some(node => node.t === 'sus' && node.tur === 'sapka')).toBe(aciYazimi === 'sapka');
  });

  it('honors the selected angle with reversed arms even at zero degrees', () => {
    const s = slider(0, { bindingTarget: { objectId: 'angle', propertyKey: 'angle' } });
    const target: AngleObject = { ...base('angle'), type: 'angle', point1Id: 'B', vertexPointId: 'A', point3Id: 'C' };
    expect(sliderDisplay([A, { ...B, construction: angle('A', 'C') }, C, target, s], s).text).toBe('m(∠BAC) = 0°');
  });

  it('uses the newly selected polygon property after rebinding without changing the parameter name', () => {
    const s = slider(5);
    const bound = bindSliderProperty([A, B, C, polygon, s], 's', 'poly', 'edge:0', () => 'unused');
    const first = bound.find((o): o is SliderObject => o.type === 'slider')!;
    expect(sliderDisplay(bound, first).name).toBe('|AB|');
    const rebound = rebindSliderProperty(bound, 's', 'poly', 'angle:0', { min: 0, max: 180, step: 1, value: 60 }, () => 'unused');
    const next = rebound.find((o): o is SliderObject => o.type === 'slider')!;
    expect(next.variableName).toBe('a');
    expect(sliderDisplay(rebound, next)).toMatchObject({ name: 'm(∠CAB)', text: 'm(∠CAB) = 60°', unit: '°' });
  });

  it.each([
    { objectId: 'missing', propertyKey: 'edge:0' },
    { objectId: 'poly', propertyKey: 'edge:1' },
    { objectId: 'poly', propertyKey: 'angle:0' },
  ])('ignores stale metadata that no longer describes the actual binding: %j', bindingTarget => {
    const s = slider(5, { bindingTarget });
    expect(sliderDisplay([A, { ...B, construction: length('A') }, C, polygon, s], s).text).toBe('|AB| = 5 br');
  });

  it('distinguishes an explicitly selected centimetre segment from a circle sharing its points', () => {
    const s = slider(4, { bindingTarget: { objectId: 'segment', propertyKey: 'length' } });
    const O = point('O'), end = point('R', 4, 0, { construction: length('O') });
    const scene: MathObject[] = [O, end, s,
      { ...base('circle'), type: 'circle', centerPointId: 'O', radiusPointId: 'R' },
      { ...base('segment'), type: 'segment', startPointId: 'O', endPointId: 'R', unit: 'cm' }];
    expect(sliderDisplay(scene, s)).toMatchObject({ text: '|OR| = 4 cm', unit: 'cm' });
    const radiusSlider = { ...s, bindingTarget: { objectId: 'circle', propertyKey: 'radius' } };
    expect(sliderDisplay(scene, radiusSlider)).toMatchObject({ name: 'r = |OR|', text: 'r = |OR| = 4 br', unit: 'br' });
  });

  it('uses the named center when a fixed-radius circle has an anonymous helper endpoint', () => {
    const s = slider(4);
    const O = point('O', 0, 0, { showLabel: false });
    const scene: MathObject[] = [O, point('helper', 4, 0, { label: '', visible: false, construction: length('O') }), s,
      { ...base('circle'), type: 'circle', centerPointId: 'O', radiusPointId: 'helper' }];
    expect(sliderDisplay(scene, s)).toMatchObject({ name: 'r(O)', text: 'r(O) = 4 br', unit: 'br' });
  });

  it.each(['arc', 'sector'] as const)('shows %s central-angle binding in degrees, never as arc length', type => {
    const s = slider(90, { sliderType: 'number', bindingTarget: { objectId: 'shape', propertyKey: 'centralAngle' } });
    const O = point('O'), start = point('P', 3), end = point('Q', 0, 3, { construction: angle('O', 'P') });
    const shape: MathObject = { ...base('shape'), type, centerPointId: 'O', startPointId: 'P', directionPointId: 'Q' };
    const display = sliderDisplay([O, start, end, s, shape], s);
    expect(display.unit).toBe('°');
    expect(display.text).toBe(type === 'arc' ? 'm(P͡Q) = 90°' : 'm(∠POQ) = 90°');
    expect(display.nameNodes.some(node => node.t === 'mutlak')).toBe(false);
  });

  it('uses a central angle name when the arc direction point is outside its circumference', () => {
    const s = slider(90);
    const shape: MathObject = { ...base('arc'), type: 'arc', centerPointId: 'O', startPointId: 'P', directionPointId: 'Q' };
    expect(sliderDisplay([point('O'), point('P', 3), point('Q', 0, 5, { construction: angle('O', 'P') }), shape, s], s).text).toBe('m(∠POQ) = 90°');
  });

  it('infers legacy rotate sliders and arc radius sliders with the correct units', () => {
    const s = slider(90);
    const O = point('O'), P = point('P', 3), Q = point('Q', 0, 3, { construction: { kind: 'rotate', sliderId: 's', sourceId: 'P', centerId: 'O', degrees: 90 } });
    const arc: MathObject = { ...base('arc'), type: 'arc', centerPointId: 'O', startPointId: 'P', directionPointId: 'Q' };
    expect(sliderDisplay([O, P, Q, arc, s], s).text).toBe('m(P͡Q) = 90°');
    expect(sliderDisplay([O, P, Q, s], s).text).toBe('m(∠POQ) = 90°');
    const radiusSlider = slider(3);
    expect(sliderDisplay([O, { ...P, construction: length('O') }, { ...Q, construction: undefined }, arc, radiusSlider], radiusSlider).text).toBe('r = |OP| = 3 br');
  });

  it.each([
    ['radiusX', 'a(O)', 'br'], ['radiusY', 'b(O)', 'br'], ['rotation', 'θ(O)', '°'],
  ] as const)('identifies ellipse %s bindings independently', (property, name, unit) => {
    const s = slider(5);
    const ellipse: MathObject = { ...base('ellipse'), type: 'ellipse', centerPointId: 'O', radiusX: 3, radiusY: 2, rotation: 0, sliderBindings: { [property]: 's' } };
    expect(sliderDisplay([point('O'), ellipse, s], s)).toMatchObject({ name, unit, text: `${name} = 5${unit === '°' ? '°' : ' br'}` });
  });

  it.each([0, 1, 2])('infers legacy three-slider triangle side %s', side => {
    const ids: [string, string, string] = ['s', 't', 'u'];
    const s = slider([3, 5, 4][side], { id: ids[side] });
    const rule = { kind: 'triangleVertex' as const, anchorId: 'A', sliderIds: ids, rotation: 0, orientation: 1 as const };
    const scene = [A, { ...B, construction: { ...rule, vertex: 1 as const } }, { ...C, construction: { ...rule, vertex: 2 as const } }, s];
    expect(sliderDisplay(scene, s).text).toBe(['|AB| = 3 br', '|BC| = 5 br', '|CA| = 4 br'][side]);
  });

  it('keeps the known legacy triangle side name when another shape reuses its points', () => {
    const s = slider(3);
    const rule = { kind: 'triangleVertex' as const, anchorId: 'A', sliderIds: ['s', 't', 'u'] as [string, string, string], rotation: 0, orientation: 1 as const };
    const scene: MathObject[] = [A, { ...B, construction: { ...rule, vertex: 1 } }, { ...C, construction: { ...rule, vertex: 2 } }, s,
      { ...base('circle'), type: 'circle', centerPointId: 'A', radiusPointId: 'B' }];
    expect(sliderDisplay(scene, s).text).toBe('|AB| = 3 br');
  });

  it.each(['x', 'y'] as const)('identifies a point %s coordinate without adding a length unit', mode => {
    const s = slider(2.5);
    const p = { ...A, construction: { kind: 'sliderPoint' as const, mode, sliderId: 's' } };
    expect(sliderDisplay([p, s], s)).toMatchObject({ text: `${mode}(A) = 2,5`, unit: '' });
  });

  it('preserves the internal variable display for free and function-only sliders', () => {
    const s = slider(2.25, { label: '|AB|' });
    const fn: MathObject = { ...base('function'), type: 'function', expression: 'a*x' };
    expect(sliderDisplay([s], s)).toMatchObject({ name: 'a', text: 'a = 2,25', unit: '' });
    expect(sliderDisplay([s, fn], s).text).toBe('a = 2,25');
    const angular = slider(45, { variableName: 'α', sliderType: 'angle' });
    expect(sliderDisplay([angular], angular).text).toBe('α = 45°');
  });
});
