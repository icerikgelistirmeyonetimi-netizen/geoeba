import { describe, expect, it } from 'vitest';
import { etiketAcisi, etiketDondurme } from '../olcuEtiketi';

describe('etiketAcisi — ölçü etiketi çizgiye paralel', () => {
  it('yatay çizgide yön ne olursa olsun 0°', () => {
    expect(etiketAcisi(10, 0)).toBe(0);
    expect(etiketAcisi(-10, 0)).toBe(0);
  });

  it('eğik çizgide çizginin açısını verir; sağdan sola çizilmişse 180° katlanır', () => {
    expect(etiketAcisi(10, 10)).toBeCloseTo(45);
    expect(etiketAcisi(10, -10)).toBeCloseTo(-45);
    expect(etiketAcisi(-10, 10)).toBeCloseTo(-45); // 135° → -45°
    expect(etiketAcisi(-10, -10)).toBeCloseTo(45); // -135° → 45°
  });

  it('tam dikey çizgide yazı aşağıdan yukarıya okunur (-90°), nokta sırasından bağımsız', () => {
    expect(etiketAcisi(0, 10)).toBe(-90);
    expect(etiketAcisi(0, -10)).toBe(-90);
  });

  it('yazı asla baş aşağı değildir: her yön için açı [-90, 90) aralığında', () => {
    for (let i = 0; i < 360; i += 7) {
      const t = (i * Math.PI) / 180;
      const aci = etiketAcisi(Math.cos(t), Math.sin(t));
      expect(aci).toBeGreaterThanOrEqual(-90);
      expect(aci).toBeLessThan(90);
      // Çizginin kendi doğrultusuyla paralel: fark 0 ya da 180°
      const fark = Math.abs((((aci - i) % 180) + 180) % 180);
      expect(Math.min(fark, 180 - fark)).toBeLessThan(1e-9);
    }
  });

  it('sıfır ya da geçersiz vektörde 0°', () => {
    expect(etiketAcisi(0, 0)).toBe(0);
    expect(etiketAcisi(Number.NaN, 1)).toBe(0);
  });

  it('etiketDondurme etiketi merkezi çevresinde döndürür, yatayda boş kalır', () => {
    expect(etiketDondurme(10, 0, 100, 50)).toBe('');
    expect(etiketDondurme(10, 10, 100, 50)).toBe('rotate(45 100 50)');
    expect(etiketDondurme(0, 10, 12.5, 7)).toBe('rotate(-90 12.5 7)');
  });
});
