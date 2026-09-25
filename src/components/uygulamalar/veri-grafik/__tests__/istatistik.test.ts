// Sahip: D2 (vg/istatistik.ts)
import { describe, expect, it } from 'vitest';
import { sabitCalisma } from './sabit-tablolar';
import { gecerliDegerler } from '../veri';
import {
  aciklik,
  adimGosterimi,
  enBuyuk,
  enKucuk,
  guzelAdim,
  guzelEksen,
  hesaplamaAdimlari,
  kartGosterimi,
  listeMetni,
  medyan,
  ortalama,
  ortalamaMutlakSapma,
  ortanca,
  ozetHesapla,
  sayiMetni,
  tamToplam,
  temizle,
  tepeDeger,
  terimMetni,
  yuvarla,
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
    expect(tepeDeger([4, 1, 1, 4, 7, 7, 7])).toEqual({ degerler: [7], sayi: 3 });
    expect(tepeDeger([4, 1, 1, 4, 5])).toEqual({ degerler: [1, 4], sayi: 2 });
    expect(tepeDeger([1, 2, 3])).toEqual({ degerler: [], sayi: 1 });
    expect(tepeDeger([])).toEqual({ degerler: [], sayi: 0 });
    const oz = ozetHesapla([3, 5, 2, 4, 3, 6, 3, 1]);
    expect(oz.tepe).toEqual([3]);
    expect(oz.tepeSayisi).toBe(3);
  });
});

describe('istatistik: tepe değer kuralı (M05)', () => {
  it('farklı değer ≥ 2 ve bütün sıklıklar eşitse tepe değer yok; tek değerde kendisi', () => {
    expect(tepeDeger([1, 1, 2, 2, 3, 3]).degerler).toEqual([]);
    expect(tepeDeger([1, 1, 2, 2, 3, 3]).sayi).toBe(2);
    expect(tepeDeger([1, 2, 2, 3]).degerler).toEqual([2]);
    expect(tepeDeger([5, 5, 5])).toEqual({ degerler: [5], sayi: 3 });
    expect(tepeDeger([7]).degerler).toEqual([7]);
    expect(ozetHesapla([1, 1, 2, 2]).tepe).toEqual([]);
    expect(ortanca).toBe(medyan);
  });
});

describe('istatistik: gösterim yardımcıları', () => {
  it('yuvarla yarımları sıfırdan uzağa, kayan nokta artığını temizleyerek yuvarlar', () => {
    expect(yuvarla(2.275, 2)).toBe(2.28);
    expect(yuvarla(1.005, 2)).toBe(1.01);
    expect(yuvarla(-2.5, 0)).toBe(-3);
    expect(yuvarla(-0.001, 2)).toBe(0);
    expect(Object.is(yuvarla(-0.001, 2), -0)).toBe(false);
  });

  it('adım gösterimi: ≤ 4 ondalıkta tam, değilse ≈; kart gösterimi verilen basamakta', () => {
    expect(adimGosterimi(5.775, 2)).toEqual({ deger: 5.775, yaklasik: false, ondalik: 3 });
    expect(adimGosterimi(359 / 24, 2)).toEqual({ deger: 14.96, yaklasik: true, ondalik: 2 });
    expect(adimGosterimi(0.1 + 0.2, 2)).toEqual({ deger: 0.3, yaklasik: false, ondalik: 1 });
    expect(kartGosterimi(2.275, 2)).toEqual({ deger: 2.28, yaklasik: true, ondalik: 2 });
    expect(kartGosterimi(17, 2)).toEqual({ deger: 17, yaklasik: false, ondalik: 0 });
    expect(tamToplam([0.1, 0.2, 0.275])).toBe(0.575);
  });

  it('sayı metni: virgül, gerçek eksi, bölük boşluğu; terimde negatif parantezli; listede " ve "', () => {
    expect(sayiMetni(-3.5)).toBe('−3,5');
    expect(sayiMetni(2.5)).toBe('2,5');
    expect(sayiMetni(100000)).toBe('100\u00a0000');
    expect(sayiMetni(14285.714285, 2)).toBe('14\u00a0285,71');
    expect(sayiMetni(1000)).toBe('1000');
    expect(sayiMetni(Number.NaN)).toBe('');
    expect(terimMetni(-3)).toBe('(−3)');
    expect(terimMetni(3)).toBe('3');
    expect(listeMetni(['2', '2,55'])).toBe('2 ve 2,55');
    expect(listeMetni(['1', '4', '7'])).toBe('1; 4 ve 7');
    expect(listeMetni(['6'])).toBe('6');
  });
});

describe('istatistik: hesaplama adımlarının gösterimi (M04)', () => {
  const metinToplami = (terimler: string[]) => tamToplam(terimler.map((t) => Number(t.replace('−', '-').replace(',', '.'))));

  it('2 ve 2,55: sonlu ondalık ortalama tam yazılır (≈ yok); uzaklıklar gösterilen toplamı tutar', () => {
    const a = hesaplamaAdimlari([2, 2.55], 2)!;
    expect(a.ortalamaGosterim).toEqual({ deger: 2.275, yaklasik: false, ondalik: 3 });
    expect(a.satirlar.map((s) => s.fark)).toEqual([-0.275, 0.275]);
    expect(a.satirlar.every((s) => !s.yaklasik)).toBe(true);
    expect(a.farkToplami).toBe(0);
    expect(a.uzaklikToplami).toBe(0.55);
    expect(metinToplami(a.satirlar.map((s) => sayiMetni(s.uzaklik, s.ondalik)))).toBe(a.uzaklikToplami);
    expect(a.omsGosterim).toEqual({ deger: 0.275, yaklasik: false, ondalik: 3 });
    // Selma: ortalamanın solunda 5 ve 13 (12 + 4), sağında 18 ve 32 (1 + 15); 17'nin uzaklığı 0
    const selma = hesaplamaAdimlari(SELMA, 2)!;
    expect([selma.solUzaklikToplami, selma.sagUzaklikToplami]).toEqual([16, 16]);
  });

  it('sabitCalisma çalışma sütunu: toplam 115, ortalama 5,75, uzaklıklar 45,5, ortalama mutlak sapma 2,275 (kartta ≈ 2,28)', () => {
    const t = sabitCalisma();
    const v = gecerliDegerler(t, 2).map((n) => n.deger);
    const a = hesaplamaAdimlari(v, 2)!;
    expect(a.toplamGosterim.deger).toBe(115);
    expect(a.ortalamaGosterim).toEqual({ deger: 5.75, yaklasik: false, ondalik: 2 });
    expect(metinToplami(a.satirlar.map((s) => sayiMetni(s.deger, 4)))).toBe(a.toplamGosterim.deger);
    expect(metinToplami(a.satirlar.map((s) => sayiMetni(s.uzaklik, s.ondalik)))).toBe(a.uzaklikToplami);
    expect(metinToplami(a.satirlar.map((s) => sayiMetni(s.fark, s.ondalik)))).toBe(0);
    expect(a.uzaklikToplami).toBe(45.5);
    expect(a.omsGosterim).toEqual({ deger: 2.275, yaklasik: false, ondalik: 3 });
    expect(kartGosterimi(ozetHesapla(v).oms!, 2)).toEqual({ deger: 2.28, yaklasik: true, ondalik: 2 });
    // sıklık tablosu da aynı toplamları verir
    expect(tamToplam(a.sikliklar.map((s) => s.carpim))).toBe(115);
    expect(tamToplam(a.sikliklar.map((s) => s.uzaklikCarpim))).toBe(45.5);
    expect(a.siklikBicimi).toBe(false);
    expect(a.ortancaKonumlari).toEqual([10, 11]);
  });

  it('sonlu olmayan ortalama ≈ ile yuvarlanır; farklar yuvarlanmış ortalamayla hesaplanır ve toplamı tutar', () => {
    const v = [12, 15, 14, 18, 16, 13, 17, 14, 16, 15, 14, 16, 15, 17, 13, 15, 16, 14, 15, 16, 14, 15, 16, 12];
    const a = hesaplamaAdimlari(v, 2)!;
    expect(a.ortalamaGosterim.yaklasik).toBe(true);
    expect(a.ortalamaGosterim.deger).toBe(yuvarla(a.ortalama, 2));
    for (const s of a.satirlar) expect(s.fark).toBe(yuvarla(s.deger - a.ortalamaGosterim.deger, 2));
    expect(metinToplami(a.satirlar.map((s) => sayiMetni(s.uzaklik, s.ondalik)))).toBe(a.uzaklikToplami);
    expect(a.farkToplami).toBe(tamToplam(a.satirlar.map((s) => s.fark)));
  });

  it('30 veriden çokta sıklık biçimi; ortanca konumları, tepe değer, açıklık', () => {
    const v = Array.from({ length: 40 }, (_, i) => [30, 60, 90, 120, 120, 150, 180, 240][i % 8]);
    const a = hesaplamaAdimlari(v, 2)!;
    expect(a.siklikBicimi).toBe(true);
    expect(a.ortancaKonumlari).toEqual([20, 21]);
    expect(a.tepe.degerler).toEqual([120]);
    expect(a.aciklikGosterim.deger).toBe(210);
    expect(tamToplam(a.sikliklar.map((s) => s.siklik))).toBe(40);
    expect(tamToplam(a.sikliklar.map((s) => s.uzaklikCarpim))).toBe(a.uzaklikToplami);
    // ortalamanın iki yanındaki uzaklıklar dengede (ortalama 123,75)
    expect(a.solUzaklikToplami).toBe(993.75);
    expect(a.sagUzaklikToplami).toBe(993.75);
    expect(tamToplam([a.solUzaklikToplami, a.sagUzaklikToplami])).toBe(a.uzaklikToplami);
    const tek = hesaplamaAdimlari([3, 1, 2], 2)!;
    expect(tek.ortancaKonumlari).toEqual([2]);
    expect(tek.siklikBicimi).toBe(false);
  });
});
