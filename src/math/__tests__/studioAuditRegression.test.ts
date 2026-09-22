import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject } from '@/types/math';
import { copyObjects, pasteObjects } from '../objectClipboard';
import { pointLockCandidates } from '../pointLock';
import { bagliNoktalariOturt } from '@/state/WorkspaceContext';
const p = (id: string, x: number, y: number): PointObject => ({ id, type: 'point', label: id, x, y, showLabel: true, visible: true, color: 'blue', createdAt: 0, isIndependent: true });
describe('studio audit geometry and clipboard regressions', () => {
  it('keeps a dragged locked point on the finite arc', () => {
    const O = p('O', 0, 0), A = p('A', 3, 0), B = p('B', 0, 3);
    const arc: MathObject = { ...O, id: 'arc', type: 'arc', centerPointId: O.id, startPointId: A.id, directionPointId: B.id };
    const P = { ...p('P', 2, 2), onObjectId: 'arc' };
    const before: MathObject[] = [O, A, B, arc, P];
    const after = bagliNoktalariOturt([O, A, B, arc, { ...P, x: -3, y: 0 }], before).at(-1) as PointObject;
    expect(after.x).toBeCloseTo(0); expect(after.y).toBeCloseTo(3);
  });
  it('locks to a rotated ellipse and follows its rotation and center', () => {
    const O = p('O', 0, 0);
    const ellipse: MathObject = { ...O, id: 'e', type: 'ellipse', centerPointId: 'O', radiusX: 3, radiusY: 1, rotation: 90 };
    expect(pointLockCandidates(p('P', 0, 3), [O, ellipse], 44)[0]?.host.id).toBe('e');
    const P = { ...p('P', 3, 0), onObjectId: 'e' };
    const before: MathObject[] = [O, { ...ellipse, rotation: 0 }, P];
    const after = bagliNoktalariOturt([{ ...O, x: 2 }, ellipse, P], before).at(-1) as PointObject;
    expect(after.x).toBeCloseTo(2); expect(after.y).toBeCloseTo(3);
  });
  it('copies called functions and remaps calls regardless of source order', () => {
    const f: MathObject = { ...p('f', 0, 0), type: 'function', expression: 'x^2', label: 'f(x) = x^2' };
    const g: MathObject = { ...f, id: 'g', expression: 'f(x)+1', label: 'g(x) = f(x)+1' };
    const source = [g, f];
    const clipboard = copyObjects(source, ['g']);
    expect(clipboard.objects).toHaveLength(2);
    const pasted = pasteObjects(clipboard, source, { x: 0, y: 0 }).objects;
    const copiedF = pasted.find(o => o.type === 'function' && o.expression === 'x^2')!;
    const copiedG = pasted.find(o => o.type === 'function' && o.expression !== 'x^2')!;
    expect(copiedG).toMatchObject({ expression: `${copiedF.label.split('(')[0]}(x)+1` });
    expect(copiedG).not.toMatchObject({ expression: 'f(x)+1' });
  });
});
