import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { YAZI_TIPI_KESIMLERI, yaziTipiKurallari } from '../yaziTipleri';

const FONT_DIZINI = path.join(process.cwd(), 'public', 'fonts');

describe('düzenlenmiş yazı tipleri (tek katlı a)', () => {
  it('uygulamanın kullandığı her kesim vardır: Manrope 500–800, Fraunces 500–600', () => {
    const anahtarlar = YAZI_TIPI_KESIMLERI.map((k) => `${k.aile} ${k.agirlik}`);
    expect(anahtarlar).toEqual([
      'Manrope 500', 'Manrope 600', 'Manrope 700', 'Manrope 800', 'Fraunces 500', 'Fraunces 600',
    ]);
  });

  it('woff2 dosyaları public/fonts altında lisans metinleriyle birlikte bulunur', () => {
    for (const k of YAZI_TIPI_KESIMLERI) {
      const dosya = path.join(FONT_DIZINI, k.dosya);
      expect(fs.existsSync(dosya), dosya).toBe(true);
      // woff2 imzası: 'wOF2'
      expect(fs.readFileSync(dosya).subarray(0, 4).toString('latin1')).toBe('wOF2');
    }
    expect(fs.existsSync(path.join(FONT_DIZINI, 'OFL-Manrope.txt'))).toBe(true);
    expect(fs.existsSync(path.join(FONT_DIZINI, 'OFL-Fraunces.txt'))).toBe(true);
  });

  it('@font-face kuralları aile adını, ağırlığı ve önekli yolu içerir', () => {
    const css = yaziTipiKurallari('/geoeba');
    expect(css.split('\n')).toHaveLength(YAZI_TIPI_KESIMLERI.length);
    expect(css).toContain("@font-face{font-family:'Manrope';font-style:normal;font-weight:700;font-display:swap;src:url('/geoeba/fonts/manrope-geoeba-700.woff2') format('woff2')}");
    expect(css).toContain("font-family:'Fraunces';font-style:normal;font-weight:600;");
    // Önek yokken yol kökten başlar
    expect(yaziTipiKurallari('')).toContain("url('/fonts/fraunces-geoeba-500.woff2')");
  });
});
