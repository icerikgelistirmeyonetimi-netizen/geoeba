import { describe, expect, it } from 'vitest';
import { homografi, homografiMatrisi, homografiUygula, type Kose } from '../homografi';

function sayilar(css: string): number[] {
  const ic = css.slice(css.indexOf('(') + 1, css.lastIndexOf(')'));
  return ic.split(',').map((p) => Number(p.trim()));
}

describe('homografi', () => {
  it('dikdörtgen → dikdörtgen: yalnız ölçek ve öteleme', () => {
    const koseler: Kose[] = [
      [100, 50],
      [580, 50],
      [580, 320],
      [100, 320],
    ];
    const css = homografi(1920, 1080, koseler);
    expect(css.startsWith('matrix3d(')).toBe(true);
    const m = sayilar(css);
    expect(m).toHaveLength(16);
    // sütun-öncelikli: [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1]
    expect(m[0]).toBeCloseTo(480 / 1920, 9);
    expect(m[5]).toBeCloseTo(270 / 1080, 9);
    expect(m[12]).toBeCloseTo(100, 9);
    expect(m[13]).toBeCloseTo(50, 9);
    // Perspektif terimleri sıfır
    expect(m[3]).toBe(0);
    expect(m[7]).toBe(0);
    for (const i of [1, 2, 4, 6, 8, 9, 11, 14]) expect(m[i]).toBe(0);
    expect(m[10]).toBe(1);
    expect(m[15]).toBe(1);
  });

  it('yamuk: köşeler geri hesaplanınca hata ≤ 1e-6', () => {
    const koseler: Kose[] = [
      [312.4, 180.9],
      [1120.7, 236.2],
      [1098.3, 655.1],
      [340.0, 720.6],
    ];
    const M = homografiMatrisi(1920, 1080, koseler);
    expect(M).not.toBeNull();
    const kaynak: Kose[] = [
      [0, 0],
      [1920, 0],
      [1920, 1080],
      [0, 1080],
    ];
    kaynak.forEach(([x, y], i) => {
      const [X, Y] = homografiUygula(M!, x, y);
      expect(Math.abs(X - koseler[i][0])).toBeLessThanOrEqual(1e-6);
      expect(Math.abs(Y - koseler[i][1])).toBeLessThanOrEqual(1e-6);
    });
    // Orta nokta dörtgenin içinde kalır (perspektif bölme çalışıyor)
    const [ox, oy] = homografiUygula(M!, 960, 540);
    expect(ox).toBeGreaterThan(340);
    expect(ox).toBeLessThan(1120);
    expect(oy).toBeGreaterThan(180);
    expect(oy).toBeLessThan(720);
  });

  it('CSS değeri ile matris tutarlı (matrix3d sütun sırası)', () => {
    const koseler: Kose[] = [
      [10, 20],
      [700, 60],
      [660, 500],
      [40, 460],
    ];
    const M = homografiMatrisi(1920, 1080, koseler)!;
    const m = sayilar(homografi(1920, 1080, koseler));
    // a d 0 g | b e 0 h | 0 0 1 0 | c f 0 1
    expect(m[0]).toBeCloseTo(M[0], 8);
    expect(m[1]).toBeCloseTo(M[3], 8);
    expect(m[3]).toBeCloseTo(M[6], 8);
    expect(m[4]).toBeCloseTo(M[1], 8);
    expect(m[5]).toBeCloseTo(M[4], 8);
    expect(m[7]).toBeCloseTo(M[7], 8);
    expect(m[12]).toBeCloseTo(M[2], 8);
    expect(m[13]).toBeCloseTo(M[5], 8);
    expect(m.some((v) => Number.isNaN(v))).toBe(false);
  });

  it('çok küçük izdüşüm katsayıları üstel gösterime düşmez (1e-7 ölçeği korunur)', () => {
    // Arka sıradan bakışta gerçek köşeler: h ≈ −9e−7; "−8.99e−7" metni "−8.99" olmamalı
    const koseler: Kose[] = [
      [658.2, 374.8],
      [942.4, 369.7],
      [942.5, 540.4],
      [658.1, 535.9],
    ];
    const css = homografi(1920, 1080, koseler);
    expect(css).not.toMatch(/e[-+]?\d/i);
    const M = homografiMatrisi(1920, 1080, koseler)!;
    const m = sayilar(css);
    expect(m[3]).toBeCloseTo(M[6], 10);
    expect(m[7]).toBeCloseTo(M[7], 10);
    // Dizeden geri kurulan matris köşeleri yerine oturtur (w > 0)
    const geri = [m[0], m[4], m[12], m[1], m[5], m[13], m[3], m[7], 1] as typeof M;
    const kaynak: Kose[] = [
      [0, 0],
      [1920, 0],
      [1920, 1080],
      [0, 1080],
    ];
    kaynak.forEach((p, i) => {
      const [X, Y] = homografiUygula(geri, p[0], p[1]);
      expect(X).toBeCloseTo(koseler[i][0], 2);
      expect(Y).toBeCloseTo(koseler[i][1], 2);
      expect(geri[6] * p[0] + geri[7] * p[1] + 1).toBeGreaterThan(0);
    });
  });

  it("dejenere köşeler → 'none'", () => {
    // Üç köşe aynı noktada
    expect(
      homografi(1920, 1080, [
        [0, 0],
        [0, 0],
        [0, 0],
        [5, 5],
      ])
    ).toBe('none');
    // Dört köşe bir doğru üstünde
    expect(
      homografi(1920, 1080, [
        [0, 0],
        [10, 10],
        [20, 20],
        [30, 30],
      ])
    ).toBe('none');
    // Geçersiz boyut ve sonsuz değer
    expect(
      homografi(0, 1080, [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ])
    ).toBe('none');
    expect(
      homografi(1920, 1080, [
        [0, 0],
        [Infinity, 0],
        [1, 1],
        [0, 1],
      ])
    ).toBe('none');
    expect(homografiMatrisi(1920, 1080, [[0, 0]])).toBeNull();
  });
});
