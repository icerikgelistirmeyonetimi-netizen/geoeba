import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import { surguKapsami } from '@/math/surguKapsami';
import { pergelIlerlet, type PergelDurumu } from '../pergel';

const pergel = (ek: Partial<PergelDurumu> = {}): PergelDurumu => ({ merkez: { x: 1, y: 1 }, yaricap: null, baslangic: null, tarama: 0, sonHamAci: 0, ...ek });

describe('pergelIlerlet', () => {
  it('açıklık: imlecin iğneye gerçek uzaklığı (yalnız yatay değil)', () => {
    expect(pergelIlerlet(pergel(), { x: 4, y: 5 }).tarama).toBe(5);
  });

  it('başlangıç: imlecin açısı [0, 2π) aralığında', () => {
    expect(pergelIlerlet(pergel({ yaricap: 2 }), { x: 1, y: 3 }).tarama).toBeCloseTo(Math.PI / 2, 12);
    expect(pergelIlerlet(pergel({ yaricap: 2 }), { x: 1, y: -1 }).tarama).toBeCloseTo((3 * Math.PI) / 2, 12);
  });

  it('tarama: imlecin gittiği yöne göre işaretli birikir, 359° → 1° geçişi sıçramaz, ±2π ile sınırlı', () => {
    const p = pergel({ yaricap: 2, baslangic: 0, tarama: 0, sonHamAci: 0 });
    const ileri = pergelIlerlet(p, { x: 1, y: 3 });
    expect(ileri.tarama).toBeCloseTo(Math.PI / 2, 12);
    expect(ileri.sonHamAci).toBeCloseTo(Math.PI / 2, 12);
    // 0'dan saat yönünde (−) geri gidiş: açı 2π − ε olur ama fark küçük negatif sayılır
    const geri = pergelIlerlet(p, { x: 3, y: 0.9 });
    expect(geri.tarama).toBeLessThan(0);
    expect(geri.tarama).toBeGreaterThan(-0.1);
    const dolu = pergelIlerlet(pergel({ yaricap: 2, baslangic: 0, tarama: 2 * Math.PI - 0.01, sonHamAci: 2 * Math.PI - 0.01 }), { x: 3, y: 1.2 });
    expect(dolu.tarama).toBe(2 * Math.PI);
  });
});

describe('surguKapsami', () => {
  it('sürgülerin değişken adı → değer; diğer nesneler katılmaz; aynı adda sonraki geçerli', () => {
    const n = (ek: Record<string, unknown>) => ek as unknown as MathObject;
    expect(surguKapsami([n({ type: 'slider', variableName: 'a', value: 2 }), n({ type: 'point', x: 1 }), n({ type: 'slider', variableName: 'b', value: -1 }), n({ type: 'slider', variableName: 'a', value: 5 })])).toEqual({ a: 5, b: -1 });
    expect(surguKapsami([])).toEqual({});
  });
});
