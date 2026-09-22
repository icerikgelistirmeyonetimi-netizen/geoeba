import { describe, expect, it } from 'vitest';
import { istenenMi, teorikOlasilik, varsayilanSablon, type Sablon } from '../olasilik';
import {
  YakinsamaBirikeci,
  agirlikliSec,
  deneyOzeti,
  frekansTablosu,
  mulberry32,
  rastgeleTohum,
  sayimlariBirlestir,
  seyrekle,
  tekDeneme,
  topluDeneme,
  yakinsamaSerisi,
  yeniDeneyDurumu,
} from '../simulasyon';

describe('üreteç', () => {
  it('aynı tohum aynı diziyi verir, farklı tohum farklı', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const da = Array.from({ length: 5 }, () => a.sonraki());
    const db = Array.from({ length: 5 }, () => b.sonraki());
    const dc = Array.from({ length: 5 }, () => c.sonraki());
    expect(da).toEqual(db);
    expect(da).not.toEqual(dc);
    for (const x of da) expect(x >= 0 && x < 1).toBe(true);
  });

  it('rastgeleTohum 32 bit tam sayı verir', () => {
    const t = rastgeleTohum();
    expect(Number.isInteger(t)).toBe(true);
    expect(t >= 0 && t <= 0xffffffff).toBe(true);
  });

  it('ağırlıklı seçim ağırlıkları izler; toplam 0 → -1', () => {
    const u = mulberry32(7);
    const sayim = [0, 0, 0];
    for (let i = 0; i < 6000; i++) sayim[agirlikliSec(u, [1, 2, 3])]++;
    expect(sayim[0] / 6000).toBeCloseTo(1 / 6, 1);
    expect(sayim[2] / 6000).toBeCloseTo(1 / 2, 1);
    expect(agirlikliSec(u, [0, 0])).toBe(-1);
  });
});

describe('deneme', () => {
  it('her şablon geçerli sonuç türü üretir', () => {
    const u = mulberry32(1);
    for (const tur of ['para', 'zar', 'cark', 'torba', 'kart'] as const) {
      const s = tekDeneme(varsayilanSablon(tur), u);
      expect(s?.tur).toBe(tur);
    }
  });

  it('iki zar iki değer verir, tek zar bir değer', () => {
    const u = mulberry32(3);
    expect(tekDeneme({ tur: 'zar', ikiZar: true, istenen: { tip: 'cift' } }, u)).toMatchObject({ zarlar: expect.any(Array) });
    const s = tekDeneme({ tur: 'zar', ikiZar: true, istenen: { tip: 'cift' } }, u);
    expect(s && s.tur === 'zar' ? s.zarlar.length : 0).toBe(2);
    const t = tekDeneme(varsayilanSablon('zar'), u);
    expect(t && t.tur === 'zar' ? t.zarlar.length : 0).toBe(1);
  });

  it('boş örnek uzayda null ve boş toplu sonuç', () => {
    const bos: Sablon = { tur: 'torba', bilyeler: [], iadeli: true, istenenRenk: 'A' };
    expect(tekDeneme(bos, mulberry32(1))).toBeNull();
    expect(topluDeneme(bos, 10, mulberry32(1))).toEqual([]);
  });

  it('iadesiz torba: tam bir turda her renk tam adedi kadar çıkar, sonra torba yenilenir', () => {
    const s: Sablon = {
      tur: 'torba',
      bilyeler: [
        { ad: 'K', renk: '#c00', adet: 3 },
        { ad: 'M', renk: '#00c', adet: 2 },
      ],
      iadeli: false,
      istenenRenk: 'K',
    };
    const durum = yeniDeneyDurumu(s);
    expect(durum.torbaKalan).toEqual([3, 2]);
    const ilkTur = topluDeneme(s, 5, mulberry32(9), durum);
    const k = ilkTur.filter((x) => x.tur === 'torba' && x.renk === 'K').length;
    expect(k).toBe(3);
    expect(durum.torbaKalan).toEqual([0, 0]);
    const sonraki = tekDeneme(s, mulberry32(10), durum);
    expect(sonraki).not.toBeNull();
    expect(durum.torbaKalan!.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('büyük sayılar: 20000 zar atışında 6 oranı 1/6 civarı', () => {
    const s = varsayilanSablon('zar');
    const sonuclar = topluDeneme(s, 20000, mulberry32(2024));
    const oz = deneyOzeti(s, sonuclar);
    expect(oz.toplam).toBe(20000);
    expect(Math.abs(oz.oran - teorikOlasilik(s).deger)).toBeLessThan(0.02);
  });

  it('eşit olmayan çark deneysel olasılığı teorik ağırlığı izler', () => {
    const s: Sablon = {
      tur: 'cark',
      dilimler: [
        { ad: 'A', renk: '#000', genislik: 3 },
        { ad: 'B', renk: '#111', genislik: 1 },
      ],
      istenenRenk: 'A',
    };
    const oz = deneyOzeti(s, topluDeneme(s, 8000, mulberry32(5)));
    expect(Math.abs(oz.oran - 0.75)).toBeLessThan(0.03);
  });
});

describe('frekans', () => {
  it('sayımlar satırlara dağılır, kesir ve oran hesaplanır', () => {
    const s = varsayilanSablon('para');
    const sonuclar = topluDeneme(s, 10, mulberry32(11));
    const sayimlar = sayimlariBirlestir(s, sonuclar);
    const tablo = frekansTablosu(s, sayimlar, 10);
    expect(tablo).toHaveLength(2);
    expect(tablo[0].sayi + tablo[1].sayi).toBe(10);
    expect(tablo[0].oran + tablo[1].oran).toBeCloseTo(1);
    expect(tablo[0].kesir.payda).toBeLessThanOrEqual(10);
  });

  it('boş tabloda oran 0 ve kesir 0/1', () => {
    const tablo = frekansTablosu(varsayilanSablon('zar'), {}, 0);
    expect(tablo.every((r) => r.oran === 0 && r.kesir.pay === 0)).toBe(true);
  });
});

describe('yakınsama', () => {
  it('ilk 100 deneme her adımda kaydedilir', () => {
    const b = new YakinsamaBirikeci();
    for (let i = 0; i < 50; i++) b.ekle(i % 2 === 0);
    const seri = b.seri();
    expect(seri).toHaveLength(50);
    expect(seri[49]).toEqual({ n: 50, basari: 25, p: 0.5 });
  });

  it('100 000 deneme ≤ 400 nokta ve son nokta günceldir', () => {
    const b = new YakinsamaBirikeci();
    const u = mulberry32(77);
    for (let i = 0; i < 100000; i++) b.ekle(u.sonraki() < 0.3);
    const seri = b.seri();
    expect(seri.length).toBeLessThanOrEqual(400);
    expect(seri.length).toBeGreaterThan(150);
    expect(seri[seri.length - 1].n).toBe(100000);
    expect(Math.abs(seri[seri.length - 1].p - 0.3)).toBeLessThan(0.01);
    expect(b.deneme).toBe(100000);
  });

  it('bir milyon denemede de sınır aşılmaz (seyrekleme)', () => {
    const b = new YakinsamaBirikeci();
    for (let i = 0; i < 1_000_000; i++) b.ekle(i % 3 === 0);
    const seri = b.seri();
    expect(seri.length).toBeLessThanOrEqual(400);
    expect(seri[0].n).toBe(1);
    expect(seri[seri.length - 1].n).toBe(1_000_000);
  });

  it('kaldığı yerden sürdürülebilir', () => {
    const b = new YakinsamaBirikeci();
    for (let i = 0; i < 300; i++) b.ekle(true);
    const b2 = new YakinsamaBirikeci({ n: b.deneme, basari: b.gerceklesen, noktalar: b.hamNoktalar() });
    b2.ekle(false);
    expect(b2.deneme).toBe(301);
    expect(b2.oran).toBeCloseTo(300 / 301);
    expect(b2.seri()[b2.seri().length - 1].n).toBe(301);
  });

  it('seyrekle ilk ve son öğeyi korur', () => {
    const liste = Array.from({ length: 1000 }, (_, i) => i);
    const s = seyrekle(liste, 100);
    expect(s).toHaveLength(100);
    expect(s[0]).toBe(0);
    expect(s[99]).toBe(999);
    expect(seyrekle([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });

  it('yakinsamaSerisi boolean diziden seri üretir ve teorik değere yaklaşır', () => {
    const s = varsayilanSablon('para');
    const u = mulberry32(99);
    const basarilar = topluDeneme(s, 5000, u).map((x) => istenenMi(s, x));
    const seri = yakinsamaSerisi(basarilar);
    expect(seri.length).toBeLessThanOrEqual(400);
    expect(Math.abs(seri[seri.length - 1].p - 0.5)).toBeLessThan(0.03);
  });
});
