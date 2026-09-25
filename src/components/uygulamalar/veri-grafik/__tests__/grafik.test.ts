// Sahip: D1 (vg/grafik.ts)
import { describe, expect, it } from 'vitest';
import {
  SERI_RENKLERI,
  adimOndalik,
  adimaYuvarla,
  aralikSecenekleri,
  dagitikKonum,
  daireDilimleri,
  degisim,
  dilimYenidenDagit,
  dilimYolu,
  dogrusalOlcek,
  enBuyukKalanlaYuvarla,
  enYuksekYigin,
  frekansSutunlari,
  gosterimOndaligi,
  gruplamaVar,
  isaretciAcisi,
  kutupNoktasi,
  noktaYaricapi,
  payliGuzelEksen,
  seriRengi,
  siklikEkseni,
  sinirSurukle,
  sinirdanDeger,
  surukleDegeri,
  tamSayiliMi,
  varsayilanAralik,
  veriCozunurlugu,
  yaziBoyu,
  yiginla,
} from '../grafik';
import { guzelEksen, temizle, type Eksen } from '../istatistik';
import { sayiYaz } from '../veri';

const nokta = (degerler: number[]) => degerler.map((deger, satir) => ({ satir, deger }));

/** WCAG bağıl parlaklık ve karşıtlık oranı */
function parlaklik(hex: string): number {
  const d = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * d(parseInt(hex.slice(1, 3), 16)) + 0.7152 * d(parseInt(hex.slice(3, 5), 16)) + 0.0722 * d(parseInt(hex.slice(5, 7), 16));
}
const karsitlik = (a: string, b: string) => {
  const x = parlaklik(a);
  const y = parlaklik(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** Kart zemini: açık tema hsl(43 100% 98%), koyu tema hsl(173 39% 14%) */
const ACIK_KART = '#fffbf5';
const KOYU_KART = '#16322e';

/** SacilimGrafigi.tsx'teki ilk tanım (D2 onu grafik.ts'tekine çevirince silinecek; burada karşılaştırma için) */
function eskiPayliGuzelEksen(degerler: number[], hedef: number): Eksen {
  const min = Math.min(...degerler);
  const max = Math.max(...degerler);
  const pay = (max - min || Math.abs(max) || 1) * 0.06;
  const e = guzelEksen(min - pay, max + pay, hedef);
  if (e.adim >= 1 || !degerler.every((d) => Number.isInteger(d))) return e;
  const alt = Math.floor(min - pay);
  const ust = Math.ceil(max + pay);
  return { min: alt, max: ust, adim: 1, isaretler: Array.from({ length: ust - alt + 1 }, (_, i) => alt + i) };
}

/** Kararlı sözde rastgele (mulberry32) */
function rastgele(tohum: number): () => number {
  let t = tohum >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const katMi = (deger: number, adim: number) => Math.abs(deger / adim - Math.round(deger / adim)) < 1e-6;

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
    expect(seriRengi(0)).toBe(SERI_RENKLERI[0]);
    expect(seriRengi(1)).toBe(SERI_RENKLERI[1]);
    expect(seriRengi(5)).toBe(SERI_RENKLERI[0]);
    expect(seriRengi(-1)).toBe(SERI_RENKLERI[SERI_RENKLERI.length - 1]);
  });

  it('seri renkleri açık ve koyu kart zemininde en az 3:1 karşıtlık verir (M17)', () => {
    expect(new Set(SERI_RENKLERI).size).toBe(SERI_RENKLERI.length);
    for (const r of SERI_RENKLERI) {
      expect(karsitlik(r, ACIK_KART), `${r} açık`).toBeGreaterThanOrEqual(3);
      expect(karsitlik(r, KOYU_KART), `${r} koyu`).toBeGreaterThanOrEqual(3);
      // Orta ton: bağıl parlaklık 0,16–0,28 bandında
      expect(parlaklik(r)).toBeGreaterThanOrEqual(0.16);
      expect(parlaklik(r)).toBeLessThanOrEqual(0.28);
    }
    // İkinci seri (karşılaştırmanın ikinci paneli) mercan tonudur
    expect(seriRengi(1)).toBe('#c8684a');
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

// ── grafik.ts: eksen ve gösterim yardımcıları ───────────────────────────────

describe('grafik: tamSayiliMi', () => {
  it('bütün sonlu değerler tam sayı mı', () => {
    expect(tamSayiliMi([1, 2, 3])).toBe(true);
    expect(tamSayiliMi([-4, 0, 12])).toBe(true);
    expect(tamSayiliMi([1, 2.5])).toBe(false);
    expect(tamSayiliMi([0.125])).toBe(false);
    // Kayan nokta artığı tam sayı sayılır
    expect(tamSayiliMi([(0.1 + 0.2) * 10, 15.000000000000002])).toBe(true);
    // Sonlu olmayanlar yok sayılır; boş dizi true
    expect(tamSayiliMi([1, Number.NaN, Infinity])).toBe(true);
    expect(tamSayiliMi([])).toBe(true);
  });
});

describe('grafik: payliGuzelEksen', () => {
  it("SacilimGrafigi'ndeki ilk tanımla aynı sonucu verir", () => {
    const veriler: [number[], number][] = [
      [[15, 18, 16, 17, 19], 6],
      [[4.5, 5.5, 6.25], 6],
      [[1, 2, 3, 4, 5, 6], 12],
      [[5, 5, 5], 6],
      [[0, 1000], 6],
      [[-3, 7, 2], 5],
      [[0.001, 0.002, 0.0015], 6],
      [[148, 152, 161, 170, 155], 8],
      [[12.5, 13, 14.5], 4],
      [[0], 6],
      [[7], 3],
    ];
    for (const [d, h] of veriler) expect(payliGuzelEksen(d, h), JSON.stringify(d)).toEqual(eskiPayliGuzelEksen(d, h));
  });

  it('tam sayılı veride işaret adımı en az 1 ve işaretler tam sayı', () => {
    for (const [d, h] of [
      [[15, 18, 16, 17, 19], 6],
      [[1, 2, 3, 4, 5, 6], 12],
      [[2, 3], 10],
      [[5, 5, 5], 8],
      [[0, 1, 1, 2, 7], 20],
    ] as [number[], number][]) {
      const e = payliGuzelEksen(d, h);
      expect(e.adim).toBeGreaterThanOrEqual(1);
      expect(e.isaretler.every((v) => Number.isInteger(v))).toBe(true);
      expect(e.min).toBeLessThan(Math.min(...d));
      expect(e.max).toBeGreaterThan(Math.max(...d));
    }
    // Ondalıklı veride güzel adım kalır
    expect(payliGuzelEksen([4.5, 5.5, 6.25], 6).adim).toBeLessThan(1);
  });

  it('sonlu olmayan değerler yok sayılır; değer yoksa [0, 1] ekseni', () => {
    expect(payliGuzelEksen([15, Number.NaN, 18, Infinity, 16, 17, 19], 6)).toEqual(payliGuzelEksen([15, 18, 16, 17, 19], 6));
    expect(payliGuzelEksen([], 6)).toEqual({ min: 0, max: 1, adim: 1, isaretler: [0, 1] });
    expect(payliGuzelEksen([Number.NaN], 6)).toEqual({ min: 0, max: 1, adim: 1, isaretler: [0, 1] });
  });
});

describe('grafik: gosterimOndaligi', () => {
  it('tam sayılı ve 2 ondalıklı veride bugünkü 2', () => {
    expect(gosterimOndaligi([])).toBe(2);
    expect(gosterimOndaligi([1, 2, 3])).toBe(2);
    expect(gosterimOndaligi([0.5, 1.25, 17])).toBe(2);
    expect(gosterimOndaligi([0, Number.NaN])).toBe(2);
    // Sonlu olmayan ondalık (ortalama) iki anlamlı basamaktan fazlasını istemez
    expect(gosterimOndaligi([14.958333333333334])).toBe(2);
    expect(gosterimOndaligi([1 / 3])).toBe(2);
    expect(gosterimOndaligi([(0.1 + 0.2) * 1])).toBe(2);
  });

  it('küçük ve ince değerler silinmez (M22)', () => {
    expect(gosterimOndaligi([0.125, 0.25, 0.375])).toBe(3);
    expect(gosterimOndaligi([0.375])).toBe(3);
    expect(gosterimOndaligi([0.001, 0.002, 0.0015, 0.003])).toBe(4);
    expect(gosterimOndaligi([0.001875])).toBe(4);
    expect(gosterimOndaligi([-0.125])).toBe(3);
    // Üst sınır
    expect(gosterimOndaligi([0.00001])).toBe(4);
    expect(gosterimOndaligi([0.00001], 2, 6)).toBe(5);
    expect(gosterimOndaligi([0.0000123], 2, 8)).toBe(7);
    // Tam yazılamayan küçük değer: iki anlamlı basamak (0,0000123456… → 6)
    expect(gosterimOndaligi([0.0000123456789], 2, 8)).toBe(6);
  });

  it('alt sınır ayarlanabilir', () => {
    expect(gosterimOndaligi([3, 4], 0)).toBe(0);
    expect(gosterimOndaligi([2.5, 3], 0)).toBe(1);
    expect(gosterimOndaligi([0.25], 0, 1)).toBe(1);
    // Ters verilen sınırlar: üst, alttan küçük olamaz
    expect(gosterimOndaligi([0.125], 3, 1)).toBe(3);
  });

  it('sayiYaz ile: 0,125 → "0,125"; 0,001 → "0,001"; 14,958… → "14,96"', () => {
    const yaz = (d: number, degerler = [d]) => sayiYaz(d, gosterimOndaligi(degerler));
    expect(yaz(0.125)).toBe('0,125');
    expect(yaz(0.375)).toBe('0,375');
    expect(yaz(0.001)).toBe('0,001');
    expect(yaz(0.0015)).toBe('0,0015');
    expect(yaz(14.958333333333334, [15, 14, 16])).toBe('14,96');
    expect(yaz(0.001875, [0.001, 0.002, 0.0015, 0.003])).toBe('0,0019');
  });
});

describe('grafik: enBuyukKalanlaYuvarla', () => {
  const toplami = (d: number[]) => temizle(d.reduce((t, x) => t + x, 0));

  it('toplamı korur: [33,3; 33,3; 33,4], adım 0,5 → toplam 100', () => {
    const s = enBuyukKalanlaYuvarla([33.3, 33.3, 33.4], 0.5);
    expect(s).toEqual([33.5, 33, 33.5]);
    expect(toplami(s)).toBe(100);
    expect(toplami(enBuyukKalanlaYuvarla([33.3, 33.3, 33.4], 0.5, 100))).toBe(100);
  });

  it('yüzdeler %100, merkez açıları 360° verir', () => {
    // Üç eşit pay: 33,3… × 3 → 34 + 33 + 33
    expect(enBuyukKalanlaYuvarla([100 / 3, 100 / 3, 100 / 3], 1, 100)).toEqual([34, 33, 33]);
    // Sıklıklardan doğrudan: 7 · 6 · 5 · 4 → yüzde (0,1 adım)
    const yuzde = enBuyukKalanlaYuvarla([7, 6, 5, 4], 0.1, 100);
    expect(yuzde).toEqual([31.8, 27.3, 22.7, 18.2]);
    expect(toplami(yuzde)).toBe(100);
    // Açılar (1° adım)
    const aci = enBuyukKalanlaYuvarla([7, 6, 5, 4], 1, 360);
    expect(toplami(aci)).toBe(360);
    expect(aci).toEqual([115, 98, 82, 65]);
    // Bir değer tek başına: hepsi ona
    expect(enBuyukKalanlaYuvarla([0, 5, 0], 0.1, 100)).toEqual([0, 100, 0]);
  });

  it('adımın katı ve toplamı tutan değerler aynen döner (daire gidiş-dönüşü)', () => {
    expect(enBuyukKalanlaYuvarla([9, 7, 8], 1, 24)).toEqual([9, 7, 8]);
    expect(enBuyukKalanlaYuvarla([0.1, 0.2, 0.7], 0.1)).toEqual([0.1, 0.2, 0.7]);
    expect(enBuyukKalanlaYuvarla([12.5, 7.5, 4], 0.5, 24)).toEqual([12.5, 7.5, 4]);
    // Kayan nokta artığı temizlenir, toplam kaymaz
    expect(enBuyukKalanlaYuvarla([8.9999999999, 7.0000000001, 8.00000000002], 1, 24)).toEqual([9, 7, 8]);
    expect(enBuyukKalanlaYuvarla([0.1 + 0.2, 0.7], 0.1, 1)).toEqual([0.3, 0.7]);
  });

  it('uç durumlar', () => {
    expect(enBuyukKalanlaYuvarla([], 1)).toEqual([]);
    expect(enBuyukKalanlaYuvarla([1.23, 4.56], 0)).toEqual([1.23, 4.56]);
    expect(enBuyukKalanlaYuvarla([1.23, 4.56], Number.NaN)).toEqual([1.23, 4.56]);
    expect(enBuyukKalanlaYuvarla([0, 0, 0], 1, 100)).toEqual([0, 0, 0]);
    expect(enBuyukKalanlaYuvarla([Number.NaN, 2.6, 1.4], 1)).toEqual([0, 3, 1]);
    // Negatif değerle: ölçekleme yok, toplam korunur
    const n = enBuyukKalanlaYuvarla([-1.5, 3.5], 1);
    expect(toplami(n)).toBe(2);
    expect(n.every((x) => Number.isInteger(x))).toBe(true);
  });

  it('rastgele verilerde: toplam hedefe eşit, her değer adımın katı ve bir adımdan az sapar', () => {
    const rnd = rastgele(20260924);
    for (let deneme = 0; deneme < 300; deneme++) {
      const n = 1 + Math.floor(rnd() * 12);
      const adim = [1, 0.5, 0.1, 0.25, 5][deneme % 5];
      const toplam = [100, 360, 24, 1000, 7.5][Math.floor(deneme / 5) % 5];
      const degerler = Array.from({ length: n }, () => rnd() * 50);
      const ham = degerler.reduce((t, d) => t + d, 0);
      const sonuc = enBuyukKalanlaYuvarla(degerler, adim, toplam);
      const hedef = temizle(Math.round(toplam / adim) * adim);
      expect(sonuc).toHaveLength(n);
      expect(Math.abs(toplami(sonuc) - hedef)).toBeLessThan(1e-9);
      sonuc.forEach((x, i) => {
        expect(katMi(x, adim)).toBe(true);
        expect(Math.abs(x - (degerler[i] * toplam) / ham)).toBeLessThan(adim + 1e-9);
        expect(x).toBeGreaterThanOrEqual(0);
      });
    }
  });
});

describe('grafik: yaziBoyu', () => {
  it('800 px ve altında 13; her 200 px 1 px büyür; en çok 16', () => {
    expect(yaziBoyu(240)).toBe(13);
    expect(yaziBoyu(800)).toBe(13);
    expect(yaziBoyu(1000)).toBe(14);
    expect(yaziBoyu(1200)).toBe(15);
    expect(yaziBoyu(1366)).toBe(15.8);
    expect(yaziBoyu(1400)).toBe(16);
    expect(yaziBoyu(2560)).toBe(16);
    expect(yaziBoyu(Number.NaN)).toBe(13);
    for (let w = 0; w <= 3000; w += 37) {
      expect(yaziBoyu(w)).toBeGreaterThanOrEqual(13);
      expect(yaziBoyu(w)).toBeLessThanOrEqual(16);
    }
  });
});

describe('grafik: siklikEkseni', () => {
  it('0 ile başlar, işaretler tam sayı, üst sınır en az en çok sıklık ve enAz', () => {
    for (const [enCok, hedef] of [
      [1, 5],
      [2, 8],
      [3, 5],
      [7, 6],
      [9, 4],
      [24, 6],
      [1000, 6],
    ] as [number, number][]) {
      const e = siklikEkseni(enCok, hedef);
      expect(e.min).toBe(0);
      expect(e.isaretler[0]).toBe(0);
      expect(e.max).toBeGreaterThanOrEqual(enCok);
      expect(e.adim).toBeGreaterThanOrEqual(1);
      expect(e.isaretler.every((v) => Number.isInteger(v))).toBe(true);
      // Yarım çentik yok: 1,5 / 2,5 yazılmaz
      expect(e.isaretler.some((v) => v % 1 !== 0)).toBe(false);
    }
    // Veri yokken [0, 1]
    expect(siklikEkseni(0, 5)).toEqual({ min: 0, max: 1, adim: 1, isaretler: [0, 1] });
    // enAz: toplama sürerken üst sınır yalnız büyür
    expect(siklikEkseni(3, 5, 12).max).toBeGreaterThanOrEqual(12);
    expect(siklikEkseni(20, 5, 12).max).toBeGreaterThanOrEqual(20);
    expect(siklikEkseni(Number.NaN, 5).max).toBe(1);
  });
});
