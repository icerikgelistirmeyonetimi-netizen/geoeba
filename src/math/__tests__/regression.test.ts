import { describe, it, expect } from 'vitest';
import {
  fitPolynomial,
  coefficientOfDetermination,
  noktalardanTamGeciyor,
  polinomDegeri,
  polynomialToExpression,
} from '@/math/regression';
import { intersectLineEllipse, calculateDistance } from '@/math/geometry';

const yakin = (a: number, b: number, hane = 6) => expect(a).toBeCloseTo(b, hane);

describe('noktalardanTamGeciyor', () => {
  it('tam uyan eğride evet; R² 1’e çok yakın olsa da artık kalan regresyon doğrusunda hayır', () => {
    const parabol = [{ x: -3, y: 5 }, { x: -1, y: 1 }, { x: 1, y: 1 }, { x: 3, y: 5 }];
    expect(noktalardanTamGeciyor(parabol, fitPolynomial(parabol, 2)!)).toBe(true);
    const neredeyseDogru = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7.2 }];
    const dogru = fitPolynomial(neredeyseDogru, 1)!;
    expect(coefficientOfDetermination(neredeyseDogru, dogru)).toBeGreaterThan(0.999);
    expect(noktalardanTamGeciyor(neredeyseDogru, dogru)).toBe(false);
    const ikiNokta = [{ x: 1, y: 2 }, { x: 4, y: 11 }];
    expect(noktalardanTamGeciyor(ikiNokta, fitPolynomial(ikiNokta, 1)!)).toBe(true);
  });
});

describe('Polinom uydurma (uydurpolinom)', () => {
  it('doğru üzerindeki noktalara tam olarak o doğruyu uydurur', () => {
    // y = 2x + 1
    const noktalar = [0, 1, 2, 3, 4].map((x) => ({ x, y: 2 * x + 1 }));
    const c = fitPolynomial(noktalar, 1)!;
    yakin(c[0], 1);
    yakin(c[1], 2);
  });

  it('parabol üzerindeki noktalara tam olarak o parabolü uydurur', () => {
    // y = x² - 3x + 2
    const noktalar = [-2, -1, 0, 1, 2, 3].map((x) => ({ x, y: x * x - 3 * x + 2 }));
    const c = fitPolynomial(noktalar, 2)!;
    yakin(c[0], 2, 5);
    yakin(c[1], -3, 5);
    yakin(c[2], 1, 5);
  });

  it('tam uyumda R² = 1 olur', () => {
    const noktalar = [0, 1, 2, 3].map((x) => ({ x, y: 3 * x - 4 }));
    const c = fitPolynomial(noktalar, 1)!;
    yakin(coefficientOfDetermination(noktalar, c), 1);
  });

  it('gürültülü veride en küçük kareler dengeli bir doğru bulur', () => {
    // y = x çevresinde simetrik sapmalar: uydurulan doğru y = x olmalı
    const noktalar = [
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 2 },
      { x: 1, y: 0 },
      { x: 2, y: 3 },
      { x: 2, y: 1 },
    ];
    const c = fitPolynomial(noktalar, 1)!;
    yakin(c[0], 0, 6);
    yakin(c[1], 1, 6);
    expect(coefficientOfDetermination(noktalar, c)).toBeGreaterThan(0);
    expect(coefficientOfDetermination(noktalar, c)).toBeLessThan(1);
  });

  it('nokta sayısı katsayı sayısından azsa uydurma yapılmaz', () => {
    expect(fitPolynomial([{ x: 0, y: 0 }, { x: 1, y: 1 }], 2)).toBeNull();
  });

  it('bütün noktalar aynı x değerindeyse (dikey) uydurulamaz', () => {
    const noktalar = [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 5 },
    ];
    expect(fitPolynomial(noktalar, 1)).toBeNull();
  });

  it('sabit veriye 0. derece polinom ortalamayı verir', () => {
    const noktalar = [
      { x: 0, y: 4 },
      { x: 1, y: 6 },
      { x: 2, y: 5 },
    ];
    const c = fitPolynomial(noktalar, 0)!;
    yakin(c[0], 5);
  });

  it('Horner değerlendirmesi katsayılarla tutarlıdır', () => {
    // 1 + 2x + 3x²  →  x = 2 için 1 + 4 + 12 = 17
    yakin(polinomDegeri([1, 2, 3], 2), 17);
  });
});

describe('Katsayıları ifadeye çevirme', () => {
  it('okunabilir bir ifade üretir', () => {
    expect(polynomialToExpression([2, -3, 1])).toBe('1*x^2 - 3*x + 2');
  });

  it('sıfır katsayıları atar', () => {
    expect(polynomialToExpression([0, 0, 5])).toBe('5*x^2');
  });

  it('baştaki eksiyi doğru yazar', () => {
    expect(polynomialToExpression([1, -2])).toBe('-2*x + 1');
  });

  it('tamamen sıfır polinom "0" olur', () => {
    expect(polynomialToExpression([0, 0, 0])).toBe('0');
  });
});

describe('Doğru–elips kesişimi', () => {
  it('eksen boyunca geçen doğru elipsi iki uçtan keser', () => {
    // Merkez (0,0), a=3, b=2; yatay eksen doğrusu
    const k = intersectLineEllipse({ x: -9, y: 0 }, { x: 9, y: 0 }, { x: 0, y: 0 }, 3, 2);
    expect(k).toHaveLength(2);
    expect(k.map((p) => Number(p.x.toFixed(6))).sort((a, b) => a - b)).toEqual([-3, 3]);
  });

  it('bulunan noktalar elips denklemini sağlar', () => {
    const merkez = { x: 1, y: -2 };
    const a = 4;
    const b = 2;
    const k = intersectLineEllipse({ x: -8, y: -4 }, { x: 8, y: 3 }, merkez, a, b);
    expect(k.length).toBeGreaterThan(0);
    for (const p of k) {
      const deger = ((p.x - merkez.x) / a) ** 2 + ((p.y - merkez.y) / b) ** 2;
      yakin(deger, 1, 6);
    }
  });

  it('teğet doğruda tek nokta döner', () => {
    const k = intersectLineEllipse({ x: -9, y: 2 }, { x: 9, y: 2 }, { x: 0, y: 0 }, 3, 2);
    expect(k).toHaveLength(1);
    yakin(k[0].x, 0, 6);
    yakin(k[0].y, 2, 6);
  });

  it('elipsi ıskalayan doğruda kesişim yoktur', () => {
    expect(intersectLineEllipse({ x: -9, y: 5 }, { x: 9, y: 5 }, { x: 0, y: 0 }, 3, 2)).toHaveLength(0);
  });

  it('a = b iken çemberle aynı sonucu verir', () => {
    const k = intersectLineEllipse({ x: -9, y: 1 }, { x: 9, y: 1 }, { x: 0, y: 0 }, 5, 5);
    expect(k).toHaveLength(2);
    for (const p of k) yakin(calculateDistance(p, { x: 0, y: 0 }), 5, 6);
  });
});
