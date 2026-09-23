import { describe, expect, it } from 'vitest';
import { copyObjects, pasteObjects } from '../objectClipboard';
import { executeTurkishCommand } from '../turkishCommands';
import { objectDependencies } from '@/state/WorkspaceContext';
import type { MathObject, PointObject, PolygonObject, SegmentObject } from '@/types/math';
import { parseProjectFile } from '../projectFile';
import { resolveCommandBindings } from '../commandBindings';

describe('object clipboard', () => {
  it('copies ellipse property sliders and remaps the values inside the property map', () => {
    const original = parseProjectFile({ objects: [
      { id: 'O', type: 'point', x: 2, y: 1 },
      { id: 'rx', type: 'slider', variableName: 'a', min: 1, max: 10, step: 1, value: 5 },
      { id: 'turn', type: 'slider', variableName: 'b', min: -180, max: 180, step: 1, value: 30 },
      { id: 'ellipse', type: 'ellipse', centerPointId: 'O', radiusX: 5, radiusY: 2, rotation: 30, sliderBindings: { radiusX: 'rx', rotation: 'turn' } },
    ] }).objects;
    const snapshot = JSON.stringify(original);
    const clipboard = copyObjects(original, ['ellipse']);
    expect(clipboard.objects).toHaveLength(4);
    const pasted = pasteObjects(clipboard, original, { x: 12, y: 8 });
    const ellipse = pasted.objects.find(o => o.type === 'ellipse');
    if (ellipse?.type !== 'ellipse') throw Error('fixture');
    const radiusId = ellipse.sliderBindings!.radiusX!, rotationId = ellipse.sliderBindings!.rotation!;
    expect(radiusId).not.toBe('rx');
    expect(rotationId).not.toBe('turn');
    expect(pasted.objects.find(o => o.id === radiusId)).toMatchObject({ type: 'slider', variableName: 'a2' });
    expect(pasted.objects.find(o => o.id === rotationId)).toMatchObject({ type: 'slider', variableName: 'b2' });
    expect(objectDependencies(ellipse)).toEqual([ellipse.centerPointId, radiusId, rotationId]);
    expect(parseProjectFile({ objects: pasted.objects }).objects).toEqual(pasted.objects);
    const combined = resolveCommandBindings([...original, ...pasted.objects].map(o =>
      o.id === radiusId && o.type === 'slider' ? { ...o, value: 8 } : o));
    expect(combined.find(o => o.id === ellipse.id)).toMatchObject({ radiusX: 8, radiusY: 2, rotation: 30 });
    expect(combined.find(o => o.id === 'ellipse')).toMatchObject({ radiusX: 5 });
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it('remaps an angle owner and its point construction to the same copied slider', () => {
    const original = parseProjectFile({ objects: [
      { id: 'A', type: 'point', x: 0, y: 0 },
      { id: 'R', type: 'point', x: 4, y: 0 },
      { id: 'B', type: 'point', x: 3, y: 0, construction: { kind: 'sliderPoint', sliderId: 's', mode: 'angle', anchorId: 'A', referenceId: 'R', radius: 3, orientation: -1 } },
      { id: 's', type: 'slider', variableName: 'a', min: 0, max: 360, step: 1, value: 0 },
      { id: 'angle', type: 'angle', point1Id: 'R', vertexPointId: 'A', point3Id: 'B', valueSliderId: 's' },
    ] }).objects;
    const pasted = pasteObjects(copyObjects(original, ['angle']), original, { x: 12, y: 8 });
    expect(pasted.objects).toHaveLength(5);
    const angle = pasted.objects.find(o => o.type === 'angle')!;
    const slider = pasted.objects.find(o => o.type === 'slider')!;
    expect(angle).toMatchObject({ valueSliderId: slider.id });
    if (angle.type !== 'angle') throw Error('fixture');
    expect(pasted.objects.find(o => o.id === angle.point3Id)).toMatchObject({ construction: { sliderId: slider.id } });
    expect(parseProjectFile({ objects: pasted.objects }).objects).toEqual(pasted.objects);
  });

  it.each([
    { kind: 'sliderPoint', sliderId: 's', mode: 'x' },
    { kind: 'sliderPoint', sliderId: 's', mode: 'y' },
    { kind: 'sliderPoint', sliderId: 's', mode: 'length', anchorId: 'A', direction: { x: 0.6, y: 0.8 } },
    { kind: 'sliderPoint', sliderId: 's', mode: 'angle', anchorId: 'A', referenceId: 'R', radius: 3, orientation: -1 },
  ])('copies and remaps every dependency of a slider-driven point: %j', construction => {
    const original = parseProjectFile({ objects: [
      { id: 'A', type: 'point', x: 0, y: 0 },
      { id: 'R', type: 'point', x: 4, y: 0 },
      { id: 'B', type: 'point', x: 3, y: 4, construction },
      { id: 's', type: 'slider', variableName: 'a', min: -10, max: 180, step: 1, value: 5 },
    ] }).objects;
    const snapshot = JSON.stringify(original);
    const clipboard = copyObjects(original, ['B']);
    const expectedIds = construction.mode === 'angle' ? ['A', 'R', 'B', 's']
      : construction.mode === 'length' ? ['A', 'B', 's'] : ['B', 's'];
    expect(clipboard.objects.map(o => o.id)).toEqual(expectedIds);
    const pasted = pasteObjects(clipboard, original, { x: 12, y: 8 });
    const target = pasted.objects.find((o): o is PointObject => o.id === pasted.selectedIds[0] && o.type === 'point')!;
    const slider = pasted.objects.find(o => o.type === 'slider')!;
    expect(slider).toMatchObject({ type: 'slider', variableName: 'a2' });
    expect(target.construction).toMatchObject({ kind: 'sliderPoint', sliderId: slider.id, mode: construction.mode });
    const dependencies = objectDependencies(target);
    expect(dependencies.length).toBe(expectedIds.length - 1);
    for (const id of dependencies) {
      expect(original.some(o => o.id === id)).toBe(false);
      expect(pasted.objects.some(o => o.id === id)).toBe(true);
    }
    if ('direction' in construction) expect(target.construction).toMatchObject({ direction: construction.direction });
    if ('radius' in construction) expect(target.construction).toMatchObject({ radius: construction.radius, orientation: -1 });
    expect(parseProjectFile({ objects: pasted.objects }).objects).toEqual(pasted.objects);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it('copies a polygon with its points and creates independent identities', () => {
    const original = executeTurkishCommand('3 4 5 üçgen çiz', []);
    if (!original.ok) throw Error('fixture');
    const snapshot = JSON.stringify(original.objects);
    const clipboard = copyObjects(original.objects, original.selectedIds);
    expect(clipboard.objects).toHaveLength(4);
    const pasted = pasteObjects(clipboard, original.objects, { x: 10, y: 8 });
    expect(pasted.objects).toHaveLength(4);
    expect(pasted.selectedIds).toHaveLength(1);
    for (const object of pasted.objects) {
      expect(original.objects.some(o => o.id === object.id || o.label === object.label)).toBe(false);
      for (const dependency of objectDependencies(object)) expect(pasted.objects.some(o => o.id === dependency)).toBe(true);
    }
    expect(JSON.stringify(original.objects)).toBe(snapshot);
    expect(pasteObjects(clipboard, [...original.objects, ...pasted.objects], { x: 20, y: 8 }).objects.every(o => !pasted.objects.some(p => p.id === o.id))).toBe(true);
  });
  it('preserves bound triangles with new slider variables and references', () => {
    const initial = executeTurkishCommand('3 4 5 üçgen çiz', []);
    if (!initial.ok) throw Error('fixture');
    const bound = executeTurkishCommand('Üçgen uzunluklarını kaydırıcıya bağla', initial.objects);
    if (!bound.ok) throw Error('fixture');
    const pasted = pasteObjects(copyObjects(bound.objects, bound.selectedIds), bound.objects, { x: 10, y: 10 });
    expect(pasted.objects.filter(o => o.type === 'slider')).toHaveLength(3);
    for (const object of pasted.objects) for (const dependency of objectDependencies(object)) expect(pasted.objects.some(o => o.id === dependency)).toBe(true);
    const names = [...bound.objects, ...pasted.objects].flatMap(o => o.type === 'slider' ? [o.variableName] : []);
    expect(new Set(names).size).toBe(names.length);
  });
  it('snapshots copied content even when source objects change', () => {
    const initial = executeTurkishCommand('Üçgen çiz', []);
    if (!initial.ok) throw Error('fixture');
    const clipboard = copyObjects(initial.objects, initial.selectedIds);
    const label = clipboard.objects[0].label;
    initial.objects[0].label = 'changed';
    expect(clipboard.objects[0].label).toBe(label);
  });
});

describe('measurement label anchors in the clipboard', () => {
  function triangle() {
    const result = executeTurkishCommand('3 4 5 üçgen çiz', []);
    if (!result.ok) throw Error('fixture');
    const polygon = result.objects.find((o): o is PolygonObject => o.type === 'polygon')!;
    const points = result.objects.filter((o): o is PointObject => o.type === 'point');
    const anchored = {
      ...polygon,
      labelAnchors: { edge0: { pointIds: [...polygon.pointIds], offset: { x: 7, y: 2 }, alignment: 'left' as const } },
      labelOffsets: { edge0: { x: 4, y: 1 } },
    };
    return { polygon: anchored, points, objects: [...points, anchored] as MathObject[] };
  }

  it('remaps complete groups and preserves the shared-centre offset on paste', () => {
    const { objects, polygon } = triangle();
    const snapshot = JSON.stringify(objects);
    const clipboard = copyObjects(objects, [polygon.id]);
    const pasted = pasteObjects(clipboard, objects, { x: 20, y: 10 });
    const next = pasted.objects.find((o): o is PolygonObject => o.type === 'polygon')!;
    expect(next.labelAnchors?.edge0).toEqual({ pointIds: next.pointIds, offset: { x: 7, y: 2 }, alignment: 'left' });
    expect(next.labelAnchors?.edge0.pointIds.some(id => polygon.pointIds.includes(id))).toBe(false);
    expect(next.labelOffsets).toEqual(polygon.labelOffsets);
    expect(parseProjectFile({ objects: pasted.objects }).objects).toEqual(pasted.objects);
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it('does not copy distant anchor points and drops only incomplete groups', () => {
    const { points } = triangle();
    const [a, b, c] = points;
    const segment: SegmentObject = {
      id: 'edge', label: 'edge', type: 'segment', startPointId: a.id, endPointId: b.id,
      color: '#000', visible: true, showLabel: true, createdAt: 0,
      labelOffsets: { length: { x: 4, y: 1 } },
      labelAnchors: {
        length: { pointIds: [a.id, b.id, c.id], offset: { x: 7, y: 2 }, alignment: 'left' },
        local: { pointIds: [a.id, b.id], offset: { x: 3, y: 1 }, alignment: 'center' },
      },
    };
    const objects: MathObject[] = [...points, segment];
    const snapshot = JSON.stringify(objects);
    const clipboard = copyObjects(objects, [segment.id]);
    expect(clipboard.objects.map(o => o.id)).toEqual([a.id, b.id, segment.id]);
    const pasted = pasteObjects(clipboard, objects, { x: 10, y: 10 });
    const next = pasted.objects.find((o): o is SegmentObject => o.type === 'segment')!;
    expect(next.labelAnchors).toEqual({ local: { pointIds: [next.startPointId, next.endPointId], offset: { x: 3, y: 1 }, alignment: 'center' } });
    expect(next.labelOffsets).toEqual(segment.labelOffsets);
    expect(JSON.stringify(pasted.objects)).not.toContain(c.id);
    expect(parseProjectFile({ objects: pasted.objects }).objects).toEqual(pasted.objects);
    expect(JSON.stringify(objects)).toBe(snapshot);
    expect(clipboard.objects.find(o => o.id === segment.id)?.labelAnchors?.length.pointIds).toContain(c.id);
  });

  it('removes the empty anchor map when only an incomplete group was copied', () => {
    const { objects, polygon } = triangle();
    const source = { ...polygon, labelAnchors: { edge0: { ...polygon.labelAnchors.edge0, pointIds: [...polygon.pointIds, 'not-copied'] } } };
    const clipboard = copyObjects(objects.map(o => o.id === polygon.id ? source : o), [polygon.id]);
    const pasted = pasteObjects(clipboard, objects, { x: 15, y: 15 });
    expect(pasted.objects.find(o => o.type === 'polygon')).not.toHaveProperty('labelAnchors');
  });
});
