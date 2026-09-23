import { describe, expect, it } from 'vitest';
import { copyObjects, pasteObjects } from '../objectClipboard';
import { executeTurkishCommand } from '../turkishCommands';
import { objectDependencies } from '@/state/WorkspaceContext';
import type { MathObject, PointObject, PolygonObject, SegmentObject } from '@/types/math';
import { parseProjectFile } from '../projectFile';

describe('object clipboard', () => {
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
