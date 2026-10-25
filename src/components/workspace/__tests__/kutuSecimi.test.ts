import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject } from '@/types/math';
import { kutuyaDuserMi } from '../kutuSecimi';

const nk = (id: string, x: number, y: number) => ({ id, type: 'point', x, y }) as unknown as PointObject;
const noktalar = new Map(
  [nk('I', 1, 1), nk('D1', 10, 10), nk('D2', -10, 10), nk('D3', 10, -10), nk('D4', -10, -10), nk('O', 0, 3)].map((p) => [p.id, p]),
);
// Köken (0; 0) kutunun dışında: köşegenlerin orta noktası ve kare köşelerinin ortalaması kökendir
const kutu = { x0: 0.5, x1: 2, y0: 0.5, y1: 2 };
const n = (alanlar: Record<string, unknown>) => alanlar as unknown as MathObject;
const duser = (alanlar: Record<string, unknown>) => kutuyaDuserMi(n(alanlar), noktalar, kutu);

describe('kutuyaDuserMi', () => {
  it('nokta, not, kesir, görsel konumundan; sınır dahil', () => {
    expect(duser({ type: 'point', x: 2, y: 0.5 })).toBe(true);
    expect(duser({ type: 'point', x: 2.01, y: 0.5 })).toBe(false);
    for (const type of ['text', 'fraction', 'image']) {
      expect(duser({ type, x: 1, y: 1 })).toBe(true);
      expect(duser({ type, x: 5, y: 1 })).toBe(false);
    }
  });

  it('çember ve elips merkezinden, açı köşesinden', () => {
    expect(duser({ type: 'circle', centerPointId: 'I' })).toBe(true);
    expect(duser({ type: 'ellipse', centerPointId: 'D1' })).toBe(false);
    expect(duser({ type: 'angle', vertexPointId: 'I', point1Id: 'D1', point3Id: 'D2' })).toBe(true);
    expect(duser({ type: 'angle', vertexPointId: 'D1', point1Id: 'I', point3Id: 'I' })).toBe(false);
  });

  it('yay ve dilim üç tanım noktasından birinden; doğru ve ışın iki noktasından', () => {
    expect(duser({ type: 'arc', centerPointId: 'D1', startPointId: 'D2', directionPointId: 'I' })).toBe(true);
    expect(duser({ type: 'sector', centerPointId: 'D1', startPointId: 'D2', directionPointId: 'D3' })).toBe(false);
    expect(duser({ type: 'line', point1Id: 'D1', point2Id: 'I' })).toBe(true);
    expect(duser({ type: 'ray', startPointId: 'D1', throughPointId: 'D2' })).toBe(false);
  });

  it('parça uçlarından ya da orta noktasından; ucu eksikse düşmez', () => {
    expect(duser({ type: 'segment', startPointId: 'D2', endPointId: 'I' })).toBe(true);
    expect(duser({ type: 'segment', startPointId: 'D4', endPointId: 'D1' })).toBe(false);
    expect(duser({ type: 'segment', startPointId: 'D2', endPointId: 'D3' })).toBe(false);
    // Orta nokta (0; 0) kutunun köşesinde
    expect(kutuyaDuserMi(n({ type: 'segment', startPointId: 'D4', endPointId: 'D1' }), noktalar, { x0: -1, x1: 1, y0: -1, y1: 1 })).toBe(true);
    expect(duser({ type: 'segment', startPointId: 'I', endPointId: 'yok' })).toBe(false);
  });

  it('çokgen köşelerinden biri ya da köşelerin ortalaması; köşesi bulunamayan çokgen düşmez', () => {
    expect(duser({ type: 'polygon', pointIds: ['D1', 'D2', 'I'] })).toBe(true);
    expect(duser({ type: 'polygon', pointIds: ['D1', 'D2', 'D3', 'D4'] })).toBe(false);
    expect(kutuyaDuserMi(n({ type: 'polygon', pointIds: ['D1', 'D2', 'D3', 'D4'] }), noktalar, { x0: -1, x1: 1, y0: -1, y1: 1 })).toBe(true);
    expect(duser({ type: 'polygon', pointIds: ['yok'] })).toBe(false);
  });

  it('kalem çizgisi herhangi bir noktasından; diğer türler hiç', () => {
    expect(duser({ type: 'pen', points: [{ x: 9, y: 9 }, { x: 1.5, y: 0.5 }] })).toBe(true);
    expect(duser({ type: 'pen', points: [{ x: 9, y: 9 }] })).toBe(false);
    expect(duser({ type: 'function', expression: 'x' })).toBe(false);
    expect(duser({ type: 'slider', x: 1, y: 1 })).toBe(false);
  });
});
