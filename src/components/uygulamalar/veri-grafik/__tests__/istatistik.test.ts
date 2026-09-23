import { describe, expect, it } from 'vitest';
import {
  aciklik,
  enBuyuk,
  enKucuk,
  guzelAdim,
  guzelEksen,
  hesaplamaAdimlari,
  medyan,
  ortalama,
  ortalamaMutlakSapma,
  ozetHesapla,
  temizle,
  tepeDeger,
} from '../istatistik';

const SELMA = [18, 5, 32, 17, 13];
const YASEMIN = [17, 15, 19, 16, 18];

describe('istatistik: merkezi eğilim', () => {
  it('ortalama: belgedeki maç sayıları (Selma 17, Yasemin 17)', () => {
    expect(ortalama(SELMA)).toBe(17);
    expect(ortalama(YASEMIN)).toBe(17);
    expect(ortalama([])).toBeNull();
  });

  it('medyan: tek ve çift eleman', () => {
    expect(medyan(SELMA)).toBe(17);
    expect(medyan([4, 1, 3, 2])).toBe(2.5);
    expect(medyan([7])).toBe(7);
    expect(medyan([])).toBeNull();
  });

  it('ortalama mutlak sapma: Selma 6,4; Yasemin 1,2', () => {
    expect(ortalamaMutlakSapma(SELMA)).toBeCloseTo(6.4, 10);
    expect(ortalamaMutlakSapma(YASEMIN)).toBeCloseTo(1.2, 10);
    expect(ortalamaMutlakSapma([])).toBeNull();
  });

  it('en küçük / en büyük / açıklık', () => {
    expect(enKucuk(SELMA)).toBe(5);
    expect(enBuyuk(SELMA)).toBe(32);
    expect(aciklik(SELMA)).toBe(27);
    expect(aciklik([])).toBeNull();
  });

  it('ozetHesapla tüm alanları doldurur', () => {
    const o = ozetHesapla(YASEMIN);
    expect(o).toEqual({ n: 5, ortalama: 17, medyan: 17, tepe: [], tepeSayisi: 1, oms: 1.2, enKucuk: 15, enBuyuk: 19, aciklik: 4 });
  });

  it('hesaplamaAdimlari: toplam/n, |x−x̄| listesi, sıralı dizi ve medyan indeksleri', () => {
    const a = hesaplamaAdimlari(SELMA);
    expect(a).not.toBeNull();
    expect(a!.toplam).toBe(85);
    expect(a!.n).toBe(5);
    expect(a!.ortalama).toBe(17);
    expect(a!.sapmalar.map((s) => s.sapma)).toEqual([1, 12, 15, 0, 4]);
    expect(a!.sapmaToplami).toBe(32);
    expect(a!.oms).toBeCloseTo(6.4, 10);
    expect(a!.siraliDegerler).toEqual([5, 13, 17, 18, 32]);
    expect(a!.ortaIndeksler).toEqual([2]);
    expect(hesaplamaAdimlari([1, 2, 3, 4])!.ortaIndeksler).toEqual([1, 2]);
    expect(hesaplamaAdimlari([])).toBeNull();
  });
});

describe('istatistik: güzel eksen', () => {
  it('temizle kayan nokta artıklarını siler', () => {
    expect(temizle(0.1 + 0.2)).toBe(0.3);
    expect(temizle(-0)).toBe(0);
  });

  it('guzelAdim 1-2-5 dizisinden seçer', () => {
    expect(guzelAdim(10, 5)).toBe(2);
    expect(guzelAdim(100, 5)).toBe(20);
    expect(guzelAdim(3, 6)).toBe(0.5);
    expect(guzelAdim(0.27, 6)).toBe(0.05);
    expect(guzelAdim(0)).toBe(1);
    expect(guzelAdim(Number.NaN)).toBe(1);
  });

  it('guzelEksen aralığı adımlara oturtur ve işaretleri üretir', () => {
    const e = guzelEksen(0, 32, 6);
    expect(e.adim).toBe(5);
    expect(e.min).toBe(0);
    expect(e.max).toBe(35);
    expect(e.isaretler).toEqual([0, 5, 10, 15, 20, 25, 30, 35]);
  });

  it('guzelEksen ondalık verilerde artıksız işaretler verir', () => {
    const e = guzelEksen(4.5, 26.5, 6);
    expect(e.isaretler.every((v) => v.toString().length <= 5)).toBe(true);
    expect(e.min).toBeLessThanOrEqual(4.5);
    expect(e.max).toBeGreaterThanOrEqual(26.5);
  });

  it('guzelEksen min === max ve ters sıra durumlarını genişletir', () => {
    const sabit = guzelEksen(10, 10);
    expect(sabit.min).toBeLessThan(10);
    expect(sabit.max).toBeGreaterThan(10);
    const sifir = guzelEksen(0, 0);
    expect(sifir.min).toBeLessThan(0);
    const ters = guzelEksen(20, 5);
    expect(ters.min).toBeLessThanOrEqual(5);
    expect(ters.max).toBeGreaterThanOrEqual(20);
  });
});

describe('istatistik: tepe değer', () => {
  it('en sık görülen değer(ler); tekrar yoksa boş; özet içinde', () => {
    expect(tepeDeger([1, 2, 2, 3, 3, 3])).toEqual({ degerler: [3], sayi: 3 });
    expect(tepeDeger([4, 1, 1, 4])).toEqual({ degerler: [1, 4], sayi: 2 });
    expect(tepeDeger([1, 2, 3])).toEqual({ degerler: [], sayi: 1 });
    expect(tepeDeger([])).toEqual({ degerler: [], sayi: 0 });
    const oz = ozetHesapla([3, 5, 2, 4, 3, 6, 3, 1]);
    expect(oz.tepe).toEqual([3]);
    expect(oz.tepeSayisi).toBe(3);
  });
});
