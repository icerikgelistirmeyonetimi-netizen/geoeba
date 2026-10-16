import { describe, expect, it } from 'vitest';
import { acilisBirimi } from '../acilisBirimi';

describe('acilisBirimi', () => {
  it('16:9 kapta genişliğin yüzde biri', () => {
    expect(acilisBirimi(1920, 1080)).toBeCloseTo(19.2, 6);
  });

  it('tahtadan dar kapta (4:3, 16:10, dikey telefon) kabı örten 16:9 kutunun genişliğinden: devirde içerik küçülmez', () => {
    // Örten kutu: yükseklik kap yüksekliği, genişlik 16/9 katı
    expect(acilisBirimi(1024, 768)).toBeCloseTo((768 * 16) / 9 / 100, 6);
    expect(acilisBirimi(1920, 1200)).toBeCloseTo((1200 * 16) / 9 / 100, 6);
    expect(acilisBirimi(390, 844)).toBeCloseTo((844 * 16) / 9 / 100, 6);
    // Eski formül (min(1cqw, 2cqh)) 4:3'te 10,24 veriyordu; örten kutununki daha büyük
    expect(acilisBirimi(1024, 768)).toBeGreaterThan(10.24);
  });

  it('tahtadan geniş ama 2:1\'den dar kapta genişliğin yüzde biri (örtme)', () => {
    expect(acilisBirimi(2100, 1080)).toBeCloseTo(21, 6);
  });

  it('çok basık kapta (2:1\'den geniş) yüksekliğin yüzde ikisiyle sınırlı', () => {
    expect(acilisBirimi(3840, 1080)).toBeCloseTo(21.6, 6);
  });

  it('sıfır ya da eksi kap boyutu bölme hatası vermez', () => {
    expect(acilisBirimi(0, 0)).toBeCloseTo(16 / 9 / 100, 9);
    expect(Number.isFinite(acilisBirimi(-5, 10))).toBe(true);
  });
});
