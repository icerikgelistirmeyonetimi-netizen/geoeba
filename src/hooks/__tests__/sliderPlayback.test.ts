import { describe, it, expect } from 'vitest';
import { advanceSliders } from '../useSliderPlayback';

type S = { id: string; min: number; max: number; value: number };

/** dt saniye boyunca, adim adim ilerleterek son değeri ve yön geçmişini döndürür. */
function simule(slider: S, dirs: Record<string, 1 | -1>, kareSayisi: number, dt = 0.05, tur = 8) {
  const seri: number[] = [];
  let cur = { ...slider };
  for (let i = 0; i < kareSayisi; i++) {
    const next = advanceSliders([cur], dirs, dt, tur);
    cur = { ...cur, value: next[cur.id] };
    seri.push(cur.value);
  }
  return { son: cur.value, seri };
}

describe('kaydırıcı oynatma (salınım)', () => {
  it('ileri yönde sabit hızla ilerler: bir tur = aralık / TUR_SANIYE', () => {
    const dirs: Record<string, 1 | -1> = {};
    const s: S = { id: 'a', min: 0, max: 8, value: 0 };
    // 8 birimlik aralık, 8 saniyelik tur -> saniyede 1 birim
    const { son } = simule(s, dirs, 20, 0.05, 8); // 1 saniye
    expect(son).toBeCloseTo(1, 6);
  });

  it('üst uca gelince BAŞA ZIPLAMAZ, yön değiştirip geri döner', () => {
    const dirs: Record<string, 1 | -1> = {};
    const s: S = { id: 'a', min: -5, max: 5, value: 4.9 };
    const { seri } = simule(s, dirs, 40, 0.05, 8);

    const enBuyuk = Math.max(...seri);
    expect(enBuyuk).toBeLessThanOrEqual(5);
    // Uca değdikten sonra yön ters çevrilmiş olmalı
    expect(dirs.a).toBe(-1);
    // Değer maksimuma ulaşıp sonra AZALMALI; başa (min) ışınlanmamalı
    const tepe = seri.indexOf(enBuyuk);
    expect(seri[tepe + 1]).toBeLessThan(enBuyuk);
    expect(Math.min(...seri)).toBeGreaterThan(0); // -5'e zıplamadı
  });

  it('alt uca gelince yön yeniden ileriye döner', () => {
    const dirs: Record<string, 1 | -1> = { a: -1 };
    const s: S = { id: 'a', min: -5, max: 5, value: -4.9 };
    const { seri } = simule(s, dirs, 40, 0.05, 8);
    expect(Math.min(...seri)).toBeGreaterThanOrEqual(-5);
    expect(dirs.a).toBe(1);
    expect(Math.max(...seri)).toBeLessThan(0); // 5'e zıplamadı
  });

  it('değer hiçbir zaman [min, max] aralığının dışına çıkmaz', () => {
    const dirs: Record<string, 1 | -1> = {};
    const s: S = { id: 'a', min: -2, max: 3, value: 0 };
    const { seri } = simule(s, dirs, 500, 0.05, 8);
    for (const v of seri) {
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThanOrEqual(3);
    }
  });

  it('yön kaydırıcı BAŞINA tutulur: farklı konumdaki iki kaydırıcı birbirini beklemez', () => {
    const dirs: Record<string, 1 | -1> = {};
    // a ucuna çok yakın, b ortada
    let a: S = { id: 'a', min: 0, max: 10, value: 9.9 };
    let b: S = { id: 'b', min: 0, max: 10, value: 5 };
    for (let i = 0; i < 10; i++) {
      const next = advanceSliders([a, b], dirs, 0.05, 8);
      a = { ...a, value: next.a };
      b = { ...b, value: next.b };
    }
    // a uca değip geri dönmüş, b hâlâ ileri gidiyor olmalı
    expect(dirs.a).toBe(-1);
    expect(dirs.b ?? 1).toBe(1);
    expect(b.value).toBeGreaterThan(5);
  });

  it('min === max olan dejenere kaydırıcı atlanır (sonsuz döngü / NaN üretmez)', () => {
    const dirs: Record<string, 1 | -1> = {};
    const next = advanceSliders([{ id: 'a', min: 2, max: 2, value: 2 }], dirs, 0.05, 8);
    expect(next.a).toBeUndefined();
    expect(Object.keys(next)).toHaveLength(0);
  });

  it('büyük kare aralığı verilse bile değer aralık dışına taşmaz (sekme geri geldiğinde)', () => {
    const dirs: Record<string, 1 | -1> = {};
    // 30 saniyelik bir boşluk hook tarafından 50 ms'ye kırpılır; burada kırpılmamış hâli test edilir
    const next = advanceSliders([{ id: 'a', min: -5, max: 5, value: 0 }], dirs, 30, 8);
    expect(next.a).toBeLessThanOrEqual(5);
    expect(next.a).toBeGreaterThanOrEqual(-5);
  });
});

describe('adıma göre canlandırma (akıcı konum, adıma oturan değer)', () => {
  it('değerler hep adımın katı; sürekli konum her karede ilerler, takılmaz', () => {
    const s = { id: 'a', min: 0, max: 10, value: 0, step: 1 };
    const dirs: Record<string, 1 | -1> = {};
    const konumlar: Record<string, number> = {};
    let cur = { ...s };
    const goruler = new Set<number>();
    let oncekiKonum = 0;
    for (let i = 0; i < 40; i++) {
      const next = advanceSliders([cur], dirs, 0.05, 8, konumlar);
      expect(Number.isInteger(next.a)).toBe(true);
      expect(konumlar.a).toBeGreaterThan(oncekiKonum);
      oncekiKonum = konumlar.a;
      goruler.add(next.a);
      cur = { ...cur, value: next.a };
    }
    // 40 kare × 0,05 sn = 2 sn → 10 birimlik aralığın dörtte biri: 0, 1, 2 ve 3 görülür
    expect([...goruler].sort((x, y) => x - y)).toEqual([0, 1, 2, 3]);
  });

  it('elle değiştirilen değer sürekli konumu sıfırlar; adımsız kaydırıcı eskisi gibi sürekli', () => {
    const konumlar: Record<string, number> = { a: 2.4 };
    const next = advanceSliders([{ id: 'a', min: 0, max: 10, value: 7, step: 1 }], {}, 0.05, 8, konumlar);
    expect(next.a).toBe(7);
    expect(konumlar.a).toBeCloseTo(7.0625, 9);
    const surekli = advanceSliders([{ id: 'b', min: 0, max: 10, value: 1 }], {}, 0.05, 8, {});
    expect(surekli.b).toBeCloseTo(1.0625, 9);
  });
});
