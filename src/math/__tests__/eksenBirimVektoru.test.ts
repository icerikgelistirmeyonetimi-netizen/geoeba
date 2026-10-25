import { describe, expect, it } from 'vitest';
import { eksenBirimVektoru, eksenMatrisi, type Eksen } from '../donusum3d';
import { eksenEtrafindaAci } from '@/components/workspace/canvas3dDonusum';

/* Yeniden düzenleme güvencesi: eksenBirimVektoru, eksenMatrisi ve eksenEtrafindaAci'nin içinde satır içi yazılan ifadeyle aynı. */

const eskiIfade = (eksen: Eksen) => ({ x: eksen === 'x' ? 1 : 0, y: eksen === 'y' ? 1 : 0, z: eksen === 'z' ? 1 : 0 });

describe('eksenBirimVektoru', () => {
  it.each(['x', 'y', 'z'] as const)('%s ekseni', (eksen) => {
    expect(eksenBirimVektoru(eksen)).toEqual(eskiIfade(eksen));
    expect(eksenMatrisi(eksen, 30)).toEqual(eksenMatrisi(eskiIfade(eksen), 30));
  });

  it('eksen çevresinde açı', () => {
    expect(eksenEtrafindaAci('z', { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(90);
    expect(eksenEtrafindaAci('x', { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 })).toBe(90);
    expect(eksenEtrafindaAci('y', { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 })).toBe(90);
  });
});
