import { describe, expect, it } from 'vitest';
import type { Point2D } from '@/types/math';
import { regularPolygonVertices } from '../regularPolygon';

const close = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 9);
const signedArea = (pts: Point2D[]) => pts.reduce((s, p, i) => s + p.x * pts[(i + 1) % pts.length].y - pts[(i + 1) % pts.length].x * p.y, 0) / 2;

describe('regularPolygonVertices: ders kitabı düzeni (yatay taban, A sol alt, saat yönünün tersine)', () => {
  it('eşkenar üçgen: A sol alt, B sağ alt, C tepe', () => {
    const [a, b, c] = regularPolygonVertices(3, 2);
    close(a.x, -Math.sqrt(3)); close(a.y, -1);
    close(b.x, Math.sqrt(3)); close(b.y, -1);
    close(c.x, 0); close(c.y, 2);
  });

  it('kare kenarları eksenlere paralel: A sol alt, B sağ alt, C sağ üst, D sol üst', () => {
    const h = 3 / Math.SQRT2;
    const got = regularPolygonVertices(4, 3, { x: 1, y: -2 });
    [[1 - h, -2 - h], [1 + h, -2 - h], [1 + h, -2 + h], [1 - h, -2 + h]].forEach(([x, y], i) => {
      close(got[i].x, x); close(got[i].y, y);
    });
  });

  it.each(Array.from({ length: 28 }, (_, i) => i + 3))('%i-gen', (n) => {
    const centre = { x: 0.5, y: -1.5 }, R = 2.5;
    const pts = regularPolygonVertices(n, R, centre);
    expect(pts).toHaveLength(n);
    pts.forEach((p, i) => {
      const ang = -Math.PI / 2 - Math.PI / n + (i * 2 * Math.PI) / n;
      close(p.x, centre.x + R * Math.cos(ang)); close(p.y, centre.y + R * Math.sin(ang));
      close(Math.hypot(pts[(i + 1) % n].x - p.x, pts[(i + 1) % n].y - p.y), 2 * R * Math.sin(Math.PI / n));
      expect(pts[(1 - i + n) % n].y).toBe(p.y); // dikey eksene göre simetrik köşe aynı yükseklikte
    });
    expect(pts[0].x).toBeLessThan(pts[1].x);
    expect(Math.min(...pts.map((p) => p.y))).toBe(pts[0].y);
    expect(signedArea(pts)).toBeGreaterThan(0);
  });

  it('pencerenin 2 basamaklı yuvarlamasından sonra da taban yatay kalır', () => {
    // Açıyı doğrudan −π/2 − π/n + 2πi/n ile hesaplamak yarıçap 0,51 ve merkez (−2; −2) üçgende
    // −2,2550000000000003 ile −2,255 verip tabanı 0,01 eğiyordu.
    const r2 = (v: number) => Number(v.toFixed(2));
    const egik: string[] = [];
    for (let n = 3; n <= 30; n++) {
      for (let r = 50; r <= 1000; r++) {
        for (const c of [{ x: 0, y: 0 }, { x: -2, y: -2 }, { x: 1.5, y: 0.5 }]) {
          const [a, b] = regularPolygonVertices(n, r / 100, c);
          if (r2(a.y) !== r2(b.y)) egik.push(`${n}-gen, r = ${r / 100}, merkez (${c.x}; ${c.y})`);
        }
      }
    }
    expect(egik).toEqual([]);
  });
});
