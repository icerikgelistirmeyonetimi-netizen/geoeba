// Sahip: B1 (vg/ornekleyici.ts: deney sonuçları tablosu, top dizilimi)
import { describe, expect, it } from 'vitest';
import { SIRA_SUTUNLARI, degiskenSutunlari } from '../kategorik';
import { topDizilimi } from '../grafik';
import type { VeriTablosu } from '../veri';

describe('onarım: eski kayıtların sıra sütunları', () => {
  it('"Çekiliş" ve "Tekrar" sütunları yinelense de değişken sayılmaz', () => {
    expect(SIRA_SUTUNLARI.has('vg-cekilis')).toBe(true);
    expect(SIRA_SUTUNLARI.has('vg-tekrar')).toBe(true);
    const t: VeriTablosu = {
      sutunlar: [
        { id: 'vg-cekilis', ad: 'Çekiliş', tur: 'etiket' },
        { id: 'vg-ay1', ad: 'Sonuç', tur: 'etiket' },
      ],
      satirlar: [
        { id: 'a', hucreler: ['1', 'Yazı'] },
        { id: 'b', hucreler: ['2', 'Tura'] },
        { id: 'x', hucreler: ['2', 'Tura'] },
      ],
    };
    expect(degiskenSutunlari(t).map((s) => s.ad)).toEqual(['Sonuç']);
  });
});

describe('onarım: top dizilimi (örnekleyici kutusu)', () => {
  it('1–60 topta hiçbir iki top üst üste binmez ve toplar alanın içinde kalır', () => {
    for (let n = 1; n <= 60; n++) {
      const d = topDizilimi(n, 144, 86, 20);
      expect(d.konumlar).toHaveLength(n);
      for (const p of d.konumlar) {
        expect(p.x - d.r).toBeGreaterThanOrEqual(-1e-9);
        expect(p.x + d.r).toBeLessThanOrEqual(144 + 1e-9);
        expect(p.y - d.r).toBeGreaterThanOrEqual(-1e-9);
        expect(p.y + d.r).toBeLessThanOrEqual(86 + 1e-9);
      }
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const a = d.konumlar[i];
          const b = d.konumlar[j];
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(2 * d.r + 2);
        }
    }
  });

  it('zar (6 top) ve doğum ayı (12 top) toplarına 13 px etiket sığar', () => {
    expect(topDizilimi(6, 144, 86, 20).r).toBeGreaterThanOrEqual(17);
    expect(topDizilimi(12, 144, 86, 20).r).toBeGreaterThanOrEqual(12.5);
    expect(topDizilimi(2, 144, 86, 20).r).toBe(20);
    expect(topDizilimi(0, 144, 86).konumlar).toEqual([]);
  });
});
