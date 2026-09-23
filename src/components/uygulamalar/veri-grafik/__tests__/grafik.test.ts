import { describe, expect, it } from 'vitest';
import {
  adimOndalik,
  adimaYuvarla,
  aralikSecenekleri,
  dagitikKonum,
  daireDilimleri,
  degisim,
  dilimYenidenDagit,
  dilimYolu,
  dogrusalOlcek,
  enYuksekYigin,
  frekansSutunlari,
  gruplamaVar,
  isaretciAcisi,
  kutupNoktasi,
  noktaYaricapi,
  seriRengi,
  sinirSurukle,
  sinirdanDeger,
  surukleDegeri,
  varsayilanAralik,
  veriCozunurlugu,
  yiginla,
} from '../grafik';

const nokta = (degerler: number[]) => degerler.map((deger, satir) => ({ satir, deger }));

describe('grafik: yığma', () => {
  it('tam sayılar birebir yığılır; sıra satır sırasını korur', () => {
    const y = yiginla(nokta([18, 5, 32, 17, 13, 17, 18, 18]), 1);
    expect(y.map((k) => k.merkez)).toEqual([5, 13, 17, 18, 32]);
    const on8 = y.find((k) => k.merkez === 18)!;
    expect(on8.ogeler.map((o) => [o.satir, o.sira])).toEqual([
      [0, 0],
      [6, 1],
      [7, 2],
    ]);
    expect(enYuksekYigin(y)).toBe(3);
    expect(frekansSutunlari(y)).toEqual([
      { merkez: 5, frekans: 1 },
      { merkez: 13, frekans: 1 },
      { merkez: 17, frekans: 2 },
      { merkez: 18, frekans: 3 },
      { merkez: 32, frekans: 1 },
    ]);
  });

  it('ondalık değerler aralık genişliğine göre en yakın kata oturur', () => {
    const y = yiginla(nokta([4.5, 5.5, 8.5, 13, 4.4]), 5);
    expect(y.map((k) => [k.merkez, k.ogeler.length])).toEqual([
      [5, 3],
      [10, 1],
      [15, 1],
    ]);
    expect(y[0].baslangic).toBe(2.5);
    expect(y[0].bitis).toBe(7.5);
    expect(yiginla([], 1)).toEqual([]);
    expect(yiginla(nokta([1]), 0)[0].merkez).toBe(1); // geçersiz aralık → 1
  });

  it('veriCozunurlugu: bütün değerleri tam gösteren en büyük güzel adım', () => {
    expect(veriCozunurlugu([146, 149, 150])).toBe(1);
    expect(veriCozunurlugu([4.5, 5.5, 13])).toBe(0.5);
    expect(veriCozunurlugu([0, 25, 50, 75])).toBe(25);
    expect(veriCozunurlugu([0, 0])).toBe(1);
    expect(veriCozunurlugu([3.4667, 3.8])).toBeNull();
  });

  it('varsayilanAralik: değerler sayı doğrusuna sığıyorsa gruplama yok, sığmıyorsa çözünürlüğün katı güzel adım', () => {
    expect(varsayilanAralik([18, 5, 32, 17, 13])).toBe(1);
    // Sıcaklık örneği: 13 °C 14'e yuvarlanmaz, her nokta tam değerinde durur
    const sicaklik = [4.5, 5.5, 8.5, 13, 18, 23, 26.5, 26, 22, 16, 10.5, 6];
    expect(varsayilanAralik(sicaklik)).toBe(0.5);
    expect(gruplamaVar(sicaklik, varsayilanAralik(sicaklik))).toBe(false);
    // Yüzdeler 5'in katı: 21 konum, gruplama yok
    expect(varsayilanAralik([0, 5, 55, 100])).toBe(5);
    // Çok geniş açıklık gruplanır; grup genişliği çözünürlüğün katıdır
    const genis = [1, 2, 150, 77];
    expect(gruplamaVar(genis, varsayilanAralik(genis))).toBe(true);
    expect(varsayilanAralik(genis) % 1).toBe(0);
    expect(varsayilanAralik([3.4667, 3.8, 5.1333])).toBeGreaterThan(0);
    expect(varsayilanAralik([])).toBe(1);
    expect(varsayilanAralik([7, 7, 7])).toBe(1);
  });

  it('aralikSecenekleri: en küçüğü çözünürlük, en az iki seçenek, çözünürlüğün katları, artan sıra', () => {
    const boy = aralikSecenekleri([146, 149, 150, 164]);
    expect(boy[0]).toBe(1);
    expect(boy).toContain(2);
    expect(boy).not.toContain(0.5);
    expect(boy).not.toContain(2.5);
    const ciftler = aralikSecenekleri([146, 164]);
    expect(ciftler).toEqual([2, 4]);
    const s = aralikSecenekleri([4.5, 26.5]);
    expect(s[0]).toBe(0.5);
    expect([...s].sort((a, b) => a - b)).toEqual(s);
    expect(aralikSecenekleri([])).toEqual([1]);
  });

  it('yiginla: gruplamasız her nokta tam değerinde; gruplamada kenarlar aralığın katı ve nokta grubun ortasında', () => {
    expect(yiginla(nokta([4.5, 13, 23, 13]), 0.5).map((k) => [k.merkez, k.ogeler.length])).toEqual([
      [4.5, 1],
      [13, 2],
      [23, 1],
    ]);
    const grup = yiginla(nokta([12, 13, 13.9, 14, 23]), 2, true);
    expect(grup.map((k) => [k.baslangic, k.bitis, k.ogeler.length])).toEqual([
      [12, 14, 3],
      [14, 16, 1],
      [22, 24, 1],
    ]);
    expect(grup[0].merkez).toBe(13);
    // Kayan nokta: 0,3 / 0,1 = 2,999… yine de [0,3; 0,4) grubuna düşer
    expect(yiginla(nokta([0.3]), 0.1, true)[0].baslangic).toBe(0.3);
    expect(gruplamaVar([12, 13, 14], 2)).toBe(true);
    expect(gruplamaVar([12, 13, 14], 1)).toBe(false);
  });

  it('dagitikKonum kararlı, anahtara bağlı ve kenar payı içinde', () => {
    const a = dagitikKonum('r1-abcd');
    expect(dagitikKonum('r1-abcd')).toEqual(a);
    expect(dagitikKonum('r2-abcd')).not.toEqual(a);
    expect(a.x).toBeGreaterThanOrEqual(0.08);
    expect(a.x).toBeLessThanOrEqual(0.92);
    expect(a.y).toBeGreaterThanOrEqual(0.08);
    expect(a.y).toBeLessThanOrEqual(0.92);
  });

  it('noktaYaricapi sınırlar içinde kalır', () => {
    expect(noktaYaricapi(40, 200, 3)).toBe(11);
    expect(noktaYaricapi(8, 200, 3)).toBe(5); // en küçük yarıçap (komşu yığınlar hafifçe örtüşebilir)
    expect(noktaYaricapi(40, 60, 10)).toBe(5);
    expect(noktaYaricapi(40, 100, 5)).toBe(9.5);
    // Komşu yığınlar hafifçe örtüşebilir: 14 px'lik yığında yarıçap 7'den büyük (eskiden 6)
    expect(noktaYaricapi(14, 200, 3)).toBeCloseTo(8.68, 2);
  });
});

describe('grafik: ölçek ve sürükleme', () => {
  it('dogrusalOlcek ileri/geri birbirinin tersi', () => {
    const o = dogrusalOlcek(0, 10, 300, 0);
    expect(o.ileri(0)).toBe(300);
    expect(o.ileri(10)).toBe(0);
    expect(o.ileri(5)).toBe(150);
    expect(o.geri(150)).toBe(5);
    expect(dogrusalOlcek(3, 3, 0, 100).ileri(3)).toBe(0);
  });

  it('adimaYuvarla 1 / 0,5 / 0,1 adımlarına yuvarlar; adimOndalik basamak verir', () => {
    expect(adimaYuvarla(12.34, 1)).toBe(12);
    expect(adimaYuvarla(12.34, 0.5)).toBe(12.5);
    expect(adimaYuvarla(12.34, 0.1)).toBe(12.3);
    expect(adimaYuvarla(0.7, 0.2)).toBe(0.8);
    expect(adimaYuvarla(5.5, 0)).toBe(5.5);
    expect(adimOndalik(1)).toBe(0);
    expect(adimOndalik(0.5)).toBe(1);
    expect(adimOndalik(0.1)).toBe(1);
    expect(adimOndalik(0.25)).toBe(2);
  });

  it('surukleDegeri pikselden değere, sınırlı ve yuvarlanmış', () => {
    const o = dogrusalOlcek(0, 20, 200, 0);
    expect(surukleDegeri(100, o, 1, 0, 20)).toBe(10);
    expect(surukleDegeri(-50, o, 1, 0, 20)).toBe(20);
    expect(surukleDegeri(250, o, 1, 0, 20)).toBe(0);
    expect(surukleDegeri(87, o, 0.5, 0, 20)).toBe(11.5);
  });

  it('degisim Δ ve % verir; sıfırdan değişimde yüzde null', () => {
    expect(degisim(20, 25)).toEqual({ fark: 5, yuzde: 25 });
    expect(degisim(20, 15)).toEqual({ fark: -5, yuzde: -25 });
    expect(degisim(0, 3)).toEqual({ fark: 3, yuzde: null });
    expect(degisim(-4, -2)).toEqual({ fark: 2, yuzde: 50 });
  });

  it('seriRengi paletin dışına taşmaz', () => {
    expect(seriRengi(0)).toBe('#216a78');
    expect(seriRengi(1)).toBe('#d9805f');
    expect(seriRengi(5)).toBe('#216a78');
  });
});

describe('grafik: daire', () => {
  it('daireDilimleri açıları ve yüzdeleri oransal dağıtır (toplam 360°)', () => {
    const d = daireDilimleri(nokta([1, 3]));
    expect(d[0].aci).toBe(90);
    expect(d[0].yuzde).toBe(25);
    expect(d[1].baslangicAci).toBe(90);
    expect(d[1].bitisAci).toBe(360);
    expect(d[1].yuzde).toBe(75);
    const negatif = daireDilimleri(nokta([2, -1, 2]));
    expect(negatif[1].aci).toBe(0);
    expect(negatif[0].aci + negatif[2].aci).toBeCloseTo(360, 10);
    expect(daireDilimleri(nokta([0, 0]))[0].yuzde).toBe(0);
  });

  it('kutupNoktasi ve isaretciAcisi birbirinin tersi (0° tepe, saat yönü)', () => {
    const tepe = kutupNoktasi(100, 100, 50, 0);
    expect(tepe.x).toBeCloseTo(100);
    expect(tepe.y).toBeCloseTo(50);
    const sag = kutupNoktasi(100, 100, 50, 90);
    expect(sag.x).toBeCloseTo(150);
    expect(sag.y).toBeCloseTo(100);
    expect(isaretciAcisi(100, 100, 150, 100)).toBeCloseTo(90);
    expect(isaretciAcisi(100, 100, 100, 150)).toBeCloseTo(180);
    expect(isaretciAcisi(100, 100, 50, 100)).toBeCloseTo(270);
    expect(isaretciAcisi(100, 100, 100, 20)).toBeCloseTo(0);
  });

  it('dilimYolu küçük/büyük yay ve tam daire üretir', () => {
    expect(dilimYolu(0, 0, 10, 0, 90)).toContain('A 10 10 0 0 1');
    expect(dilimYolu(0, 0, 10, 0, 270)).toContain('A 10 10 0 1 1');
    expect(dilimYolu(0, 0, 10, 0, 360).match(/A /g)).toHaveLength(2);
    expect(dilimYolu(0, 0, 10, 45, 45)).toBe('');
  });

  it('sinirdanDeger sınır açısından yeni değer hesaplar', () => {
    const [d0] = daireDilimleri(nokta([1, 3]));
    expect(sinirdanDeger(d0, 180, 4)).toBe(2);
    expect(sinirdanDeger(d0, 45, 4)).toBe(0.5);
    expect(sinirdanDeger(d0, 355, 4)).toBe(0); // başlangıcın hemen gerisi → 0
    const [, d1] = daireDilimleri(nokta([1, 3]));
    expect(sinirdanDeger(d1, 270, 4)).toBe(2);
  });

  it('dilimYenidenDagit toplamı sabit tutup diğerlerini orantılı ölçekler', () => {
    const y = dilimYenidenDagit([10, 20, 30], 0, 40);
    expect(y[0]).toBe(40);
    expect(y[1] + y[2]).toBeCloseTo(20, 10);
    expect(y[1] / y[2]).toBeCloseTo(20 / 30, 10);
    expect(y.reduce((t, v) => t + v, 0)).toBeCloseTo(60, 10);
    // sınırlama: toplamı aşan ya da negatif istek
    expect(dilimYenidenDagit([10, 20], 0, 99)[0]).toBe(30);
    expect(dilimYenidenDagit([10, 20], 1, -5)).toEqual([30, 0]);
    // diğerleri 0 iken kalan eşit dağıtılır
    expect(dilimYenidenDagit([12, 0, 0], 0, 6)).toEqual([6, 3, 3]);
    expect(dilimYenidenDagit([0, 0], 0, 5)).toEqual([0, 0]);
    expect(dilimYenidenDagit([1, 2], 5, 1)).toEqual([1, 2]);
  });

  it('sinirSurukle: sınır işaretçide biter, toplam sabit kalır', () => {
    expect(sinirSurukle([1, 3], 0, 180)).toEqual([2, 2]);
    expect(sinirSurukle([10, 20, 30], 1, 180)).toEqual([10, 20, 30]);
    expect(sinirSurukle([10, 20, 30], 1, 270)).toEqual([5, 40, 15]);
    // son dilim: açı geriye ölçülür, diğerleri tam işaretçide biter
    const son = sinirSurukle([10, 20, 30], 2, 270);
    expect(son).toEqual([15, 30, 15]);
    expect(son.reduce((t, v) => t + v, 0)).toBe(60);
    // sonraki dilimler 0 ise sınır tepede sabittir: açı geriye ölçülür
    expect(sinirSurukle([10, 20, 0], 1, 90)).toEqual([7.5, 22.5, 0]);
    expect(sinirSurukle([0, 0], 0, 90)).toEqual([0, 0]);
    expect(sinirSurukle([1, 2], 4, 90)).toEqual([1, 2]);
  });
});
