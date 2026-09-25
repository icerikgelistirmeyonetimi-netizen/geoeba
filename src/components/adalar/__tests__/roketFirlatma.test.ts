import { describe, expect, it } from 'vitest';
import { FIRLATMA, kapakAcisi, roketDurumu } from '../roketFirlatma';

const ADIM = 1 / 60;
const YUKSELIS = 1.165; // public/adalar/data/ana-sayfa.json → arac:roket.rise

describe('kapakAcisi (ortaokul piramidi)', () => {
  it('başta ve sonda kapalı, arada tam açık bekler', () => {
    expect(kapakAcisi(0)).toBe(0);
    expect(kapakAcisi(-1)).toBe(0);
    expect(kapakAcisi(FIRLATMA.acilma[1])).toBeCloseTo(FIRLATMA.kapakAcisi, 9);
    expect(kapakAcisi((FIRLATMA.acilma[1] + FIRLATMA.kapanma[0]) / 2)).toBe(FIRLATMA.kapakAcisi);
    expect(kapakAcisi(FIRLATMA.kapanma[1])).toBe(0);
    expect(kapakAcisi(FIRLATMA.sure + 10)).toBe(0); // sürekli döngü yok
  });

  it('sürekli: 1/60 s adımda sıçrama yok, en büyük açı 45°', () => {
    let onceki = 0;
    for (let s = 0; s <= FIRLATMA.sure + 0.2; s += ADIM) {
      const a = kapakAcisi(s);
      expect(Math.abs(a - onceki)).toBeLessThan(0.05);
      expect(a).toBeLessThanOrEqual(FIRLATMA.kapakAcisi + 1e-12);
      onceki = a;
    }
    expect(FIRLATMA.kapakAcisi).toBeCloseTo((45 * Math.PI) / 180, 12);
  });
});

describe('roketDurumu', () => {
  it('yükselmeden önce ve dizi bitince zeminin altında gizli durur', () => {
    for (const s of [0, FIRLATMA.yukselme[0], FIRLATMA.sure, FIRLATMA.sure + 5]) {
      const d = roketDurumu(s, YUKSELIS);
      expect(d.yukseklik, `s=${s}`).toBe(0);
      expect(d.olcek).toBe(1);
      expect(d.alev).toBe(0);
      expect(d.duman).toBe(0);
    }
  });

  it('yükselir, zeminde ateşlenir, ivmelenerek uzaklaşır ve küçülüp kaybolur', () => {
    expect(roketDurumu(FIRLATMA.yukselme[1], YUKSELIS).yukseklik).toBeCloseTo(YUKSELIS, 9);
    expect(roketDurumu(FIRLATMA.atesleme - 0.01, YUKSELIS).alev).toBe(0);
    const ates = roketDurumu(FIRLATMA.atesleme + 0.2, YUKSELIS);
    expect(ates.alev).toBe(1);
    expect(ates.titreme).toBeGreaterThan(0);
    expect(ates.duman).toBeGreaterThan(0);
    expect(ates.yukseklik).toBeCloseTo(YUKSELIS, 9);
    expect(roketDurumu(FIRLATMA.kalkis + 1.5, YUKSELIS).yukseklik).toBeGreaterThan(10);
    expect(roketDurumu(FIRLATMA.kaybolma[1] + 0.01, YUKSELIS).olcek).toBe(0);
  });

  it('konum sürekli; kalkıştan sonra yükseklik hep artar', () => {
    let onceki = roketDurumu(0, YUKSELIS).yukseklik;
    for (let s = 0; s < FIRLATMA.kaybolma[1]; s += ADIM) {
      const y = roketDurumu(s, YUKSELIS).yukseklik;
      // Kalkışta hız en çok ivme × 1.55 s ≈ 19 m/s: kare başına 0.35 m'den az
      expect(Math.abs(y - onceki), `s=${s.toFixed(3)}`).toBeLessThan(0.35);
      if (s > FIRLATMA.kalkis) expect(y).toBeGreaterThan(onceki);
      onceki = y;
    }
  });

  it('roket yalnız kapak açıkken geçer: kapak yükseliş bitmeden açılır, roket kaybolmadan kapanmaz', () => {
    expect(FIRLATMA.acilma[1]).toBeLessThanOrEqual(FIRLATMA.yukselme[1]);
    expect(FIRLATMA.yukselme[0]).toBeGreaterThan(FIRLATMA.acilma[0]);
    expect(FIRLATMA.kapanma[0]).toBeGreaterThanOrEqual(FIRLATMA.kaybolma[1]);
    for (let s = FIRLATMA.yukselme[1]; s < FIRLATMA.kaybolma[1]; s += ADIM) {
      expect(kapakAcisi(s), `s=${s.toFixed(3)}`).toBe(FIRLATMA.kapakAcisi);
    }
  });
});
