// Sahip: B1 (vg/ornekleyici.ts, vg/rastgele.ts)
import { describe, expect, it } from 'vitest';
import { agirlikliSec, mulberry32, rastgeleTohum, tamSayi } from '../rastgele';
import * as cekirdek from '../ornekleyici';
import {
  EN_COK_CEKILIS,
  aygitKategorileri,
  aygitOlasiliklari,
  aygitSayisalMi,
  aygitSorunu,
  aygitUyarisi,
  calismaBaslat,
  cark,
  carkAcilari,
  carkOranlari,
  cekilisler,
  degiskenAdlari,
  karistirici,
  sayiAraligi,
  satirDegerleri,
  tekCekilis,
  toplamEtkin,
  toplamKullanilabilir,
  topListesi,
  type Aygit,
  type OrnekleyiciAyari,
} from '../ornekleyici';
import { nesneDuzenegi, varsayilanDeneyPlani } from '../deney';
import type { DeneyNesnesi } from '../arastirma';

function ayarla(aygitlar: Aygit[], ek: Partial<OrnekleyiciAyari> = {}): OrnekleyiciAyari {
  return { aygitlar, toplamSutunu: false, cekilisSayisi: 10, hiz: 3, ...ek };
}

/** Veri topla nesnesinin düzeneği (deney.ts: nesneDuzenegi; eski ON_AYARLAR'ın yerine) */
function duzenek(nesne: DeneyNesnesi): OrnekleyiciAyari {
  return nesneDuzenegi({ ...varsayilanDeneyPlani(), nesne });
}

/** Eski madenî para ve sayı küpü düzenekleri (sonuç tablosu testleri için; her çağrıda yeni aygıt kimliği) */
const paraAyari = () => ayarla([karistirici('Sonuç', [['Yazı', 1], ['Tura', 1]])]);
const zarAyari = () => ayarla([sayiAraligi('Zar', 1, 6)]);
const ikiZarAyari = () => ayarla([sayiAraligi('Zar 1', 1, 6), sayiAraligi('Zar 2', 1, 6)], { toplamSutunu: true });

function goreliSiklik(degerler: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of degerler) m.set(d, (m.get(d) ?? 0) + 1);
  for (const [k, v] of m) m.set(k, v / degerler.length);
  return m;
}

describe('rastgele: tohumlu üreteç', () => {
  it('aynı tohum aynı diziyi verir, farklı tohum farklı', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const da = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(da);
    expect([c(), c(), c()]).not.toEqual(da);
  });

  it('değerler [0, 1) aralığında ve ortalaması ≈ 0,5', () => {
    const r = mulberry32(7);
    let t = 0;
    for (let i = 0; i < 10000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      t += v;
    }
    expect(Math.abs(t / 10000 - 0.5)).toBeLessThan(0.02);
  });

  it('tamSayi sınırları dahil eder, dışına çıkmaz', () => {
    const r = mulberry32(1);
    const gorulen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = tamSayi(r, 1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      gorulen.add(v);
    }
    expect(gorulen.size).toBe(6);
    expect(tamSayi(r, 5, 5)).toBe(5);
  });

  it('agirlikliSec ağırlığa orantılı; sıfır / geçersiz ağırlık seçilmez; toplam 0 → -1', () => {
    const r = mulberry32(9);
    const sayac = [0, 0, 0];
    for (let i = 0; i < 10000; i++) sayac[agirlikliSec(r, [1, 0, 3])]++;
    expect(sayac[1]).toBe(0);
    expect(Math.abs(sayac[2] / 10000 - 0.75)).toBeLessThan(0.02);
    expect(agirlikliSec(r, [0, -1, Number.NaN])).toBe(-1);
  });

  it('rastgeleTohum 32 bit tam sayı döner', () => {
    const t = rastgeleTohum();
    expect(Number.isInteger(t)).toBe(true);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThan(2 ** 32);
  });
});

describe('örnekleyici: aygıt modelleri', () => {
  it('karıştırıcı top listesi adetlere göre açılır, adet 0 topsuzdur', () => {
    const k = karistirici('Renk', [['Kırmızı', 3], ['Mavi', 2], ['Yeşil', 0]]);
    expect(topListesi(k)).toEqual([0, 0, 0, 1, 1]);
    expect(aygitKategorileri(k)).toEqual(['Kırmızı', 'Mavi', 'Yeşil']);
    expect(aygitOlasiliklari(k).map((o) => o.olasilik)).toEqual([0.6, 0.4, 0]);
  });

  it('çark yüzdeleri normalize edilir ve uyarı verir', () => {
    const c = cark('Cevap', [['Evet', 30], ['Hayır', 60]]);
    const o = carkOranlari(c);
    expect(o.oranlar[0]).toBeCloseTo(1 / 3, 10);
    expect(o.oranlar[1]).toBeCloseTo(2 / 3, 10);
    expect(o.duzeltildi).toBe(true);
    expect(aygitUyarisi(c, 10)).toContain('%90');
    const aci = carkAcilari(c);
    expect(aci[0]).toEqual({ baslangic: 0, bitis: 120 });
    expect(aci[1].bitis).toBeCloseTo(360, 9);
    expect(aygitUyarisi(cark('X', [['A', 50], ['B', 50]]), 10)).toBeNull();
  });

  it('sayı aralığı kategorileri, sayısallık ve eşit olasılık', () => {
    const z = sayiAraligi('Zar', 1, 6);
    expect(aygitKategorileri(z)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(aygitSayisalMi(z)).toBe(true);
    expect(aygitOlasiliklari(z).every((o) => Math.abs(o.olasilik - 1 / 6) < 1e-12)).toBe(true);
    expect(aygitSayisalMi(karistirici('S', [['Yazı', 1], ['Tura', 1]]))).toBe(false);
    expect(aygitSayisalMi(karistirici('S', [['1', 1], ['2,5', 1]]))).toBe(true);
  });

  it('aygıt sorunları: boş kutu, sıfır toplam, çok geniş aralık', () => {
    expect(aygitSorunu(karistirici('A', [['A', 0]]))).toContain('top yok');
    expect(aygitSorunu(cark('A', [['A', 0], ['B', 0]]))).toContain('0');
    expect(aygitSorunu(sayiAraligi('A', 1, 5000))).toContain('en çok');
    expect(aygitSorunu(sayiAraligi('A', 6, 1))).toBeNull();
    expect(aygitSorunu(karistirici('A', [['', 2]]))).toContain('boş');
  });

  it('iadesizde çekiliş sayısı top sayısını aşarsa açıklayıcı uyarı', () => {
    const k = karistirici('Renk', [['Kırmızı', 3], ['Mavi', 2]], false);
    expect(aygitUyarisi(k, 5)).toBeNull();
    const u = aygitUyarisi(k, 8);
    expect(u).toContain('5 top');
    expect(u).toContain('durur');
  });

  it('değişken adları benzersiz ve boş ad doldurulur', () => {
    const ayar = ayarla([sayiAraligi('Zar', 1, 6), sayiAraligi('Zar', 1, 6), sayiAraligi(' ', 1, 6)]);
    expect(degiskenAdlari(ayar)).toEqual(['Zar', 'Zar 2', 'Sonuç 3']);
  });
});

describe('örnekleyici: çekilişler (10000 tohumlu çekilişte göreli sıklık ≈ kuramsal)', () => {
  it('karıştırıcı (3 kırmızı, 2 mavi, iadeli)', () => {
    const ayar = ayarla([karistirici('Renk', [['Kırmızı', 3], ['Mavi', 2]])]);
    const { cekilisler: c } = cekilisler(ayar, 10000, mulberry32(123));
    const f = goreliSiklik(c.map((x) => x.degerler[0]));
    expect(Math.abs((f.get('Kırmızı') ?? 0) - 0.6)).toBeLessThanOrEqual(0.02);
    expect(Math.abs((f.get('Mavi') ?? 0) - 0.4)).toBeLessThanOrEqual(0.02);
  });

  it('çark (normalize edilmiş 30 / 60 → 1/3, 2/3)', () => {
    const ayar = ayarla([cark('Cevap', [['Evet', 30], ['Hayır', 60]])]);
    const { cekilisler: c } = cekilisler(ayar, 10000, mulberry32(321));
    const f = goreliSiklik(c.map((x) => x.degerler[0]));
    expect(Math.abs((f.get('Evet') ?? 0) - 1 / 3)).toBeLessThanOrEqual(0.02);
    expect(Math.abs((f.get('Hayır') ?? 0) - 2 / 3)).toBeLessThanOrEqual(0.02);
    expect(c.every((x) => x.konumlar[0] > 0 && x.konumlar[0] < 1)).toBe(true);
  });

  it('sayı aralığı (zar 1..6)', () => {
    const ayar = ayarla([sayiAraligi('Zar', 1, 6)]);
    const { cekilisler: c } = cekilisler(ayar, 10000, mulberry32(5));
    const f = goreliSiklik(c.map((x) => x.degerler[0]));
    for (let v = 1; v <= 6; v++) expect(Math.abs((f.get(String(v)) ?? 0) - 1 / 6)).toBeLessThanOrEqual(0.02);
    expect(c.every((x) => x.secimler[0] === Number(x.degerler[0]) - 1)).toBe(true);
  });

  it('madenî para (nesneDuzenegi): Yazı / Tura ≈ 0,5', () => {
    const ayar = duzenek('para');
    const { cekilisler: c } = cekilisler(ayar, 10000, mulberry32(77));
    const f = goreliSiklik(c.map((x) => x.degerler[0]));
    expect(Math.abs((f.get('Tura') ?? 0) - 0.5)).toBeLessThanOrEqual(0.02);
  });

  it('iki sayı küpü toplamı (nesneDuzenegi): 7 → 6/36 ± 0,015, toplam 2..12', () => {
    const ayar = duzenek('iki-zar');
    const { cekilisler: c } = cekilisler(ayar, 10000, mulberry32(2024));
    const toplamlar = c.map((x) => x.toplam!);
    expect(Math.min(...toplamlar)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...toplamlar)).toBeLessThanOrEqual(12);
    const yedi = toplamlar.filter((t) => t === 7).length / toplamlar.length;
    expect(Math.abs(yedi - 6 / 36)).toBeLessThanOrEqual(0.015);
    const iki = toplamlar.filter((t) => t === 2).length / toplamlar.length;
    expect(Math.abs(iki - 1 / 36)).toBeLessThanOrEqual(0.01);
    expect(c.every((x) => x.toplam === Number(x.degerler[0]) + Number(x.degerler[1]))).toBe(true);
  });

  it('iadesiz: her top tam bir kez çıkar, kutu boşalınca durur', () => {
    const k = karistirici('Renk', [['Kırmızı', 3], ['Mavi', 2]], false);
    const ayar = ayarla([k]);
    for (let tohum = 1; tohum <= 20; tohum++) {
      const { cekilisler: c, durdu } = cekilisler(ayar, 8, mulberry32(tohum));
      expect(durdu).toBe(true);
      expect(c.length).toBe(5);
      expect([...c.map((x) => x.secimler[0])].sort()).toEqual([0, 1, 2, 3, 4]);
      expect(c.filter((x) => x.degerler[0] === 'Kırmızı').length).toBe(3);
    }
  });

  it('tekCekilis boş iadesiz kutuda null döner ve durum yeni çalıştırmada dolar', () => {
    const ayar = ayarla([karistirici('R', [['A', 1]], false)]);
    const d = calismaBaslat(ayar.aygitlar);
    const r = mulberry32(1);
    expect(tekCekilis(ayar, d, r)?.degerler).toEqual(['A']);
    expect(tekCekilis(ayar, d, r)).toBeNull();
    expect(tekCekilis(ayar, calismaBaslat(ayar.aygitlar), r)).not.toBeNull();
  });

  it('aynı tohum aynı sonuçları üretir', () => {
    const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const ayar = ayarla([karistirici('Doğum ayı', aylar.map((ay) => [ay, 1] as [string, number]))]);
    const a = cekilisler(ayar, 50, mulberry32(8)).cekilisler.map((c) => c.degerler[0]);
    const b = cekilisler(ayar, 50, mulberry32(8)).cekilisler.map((c) => c.degerler[0]);
    expect(a).toEqual(b);
  });

  it('satır değerleri toplam sütununu yalnız tüm aygıtlar sayısalsa ekler', () => {
    const sayisal = ayarla([sayiAraligi('Zar 1', 1, 6), sayiAraligi('Zar 2', 1, 6)], { toplamSutunu: true });
    const c = cekilisler(sayisal, 1, mulberry32(3)).cekilisler[0];
    expect(satirDegerleri(sayisal, c)).toHaveLength(3);
    const karisik = ayarla([sayiAraligi('Zar', 1, 6), karistirici('Renk', [['A', 1]])], { toplamSutunu: true });
    const c2 = cekilisler(karisik, 1, mulberry32(3)).cekilisler[0];
    expect(c2.toplam).toBeNull();
    expect(satirDegerleri(karisik, c2)).toHaveLength(2);
  });
});

describe('örnekleyici: değişken adları ve türleri', () => {
  it('aygıt değişkenleri (+ Toplam), türleri aygıta göre', () => {
    const ayar = ikiZarAyari();
    expect(degiskenAdlari(ayar)).toEqual(['Zar 1', 'Zar 2']);
    expect(toplamEtkin(ayar)).toBe(true);
    expect(ayar.aygitlar.map(aygitSayisalMi)).toEqual([true, true]);
    expect(paraAyari().aygitlar.map(aygitSayisalMi)).toEqual([false]);
  });
});

describe('çekiliş çekirdeği: B-son temizliği', () => {
  it('bir çalıştırmada en çok 2000 çekiliş (Veri topla: en çok 2000 atış)', () => {
    expect(EN_COK_CEKILIS).toBe(2000);
  });

  it("ölçüm toplama, eski ön ayarlar, kalıcılık doğrulaması ve hız sabitleri kaldırıldı (hızlar canlandirma.ts'te)", () => {
    const disa = Object.keys(cekirdek);
    for (const ad of ['ON_AYARLAR', 'varsayilanOrnekleyici', 'ornekleyiciDogrula', 'aygitDogrula', 'olcumlerEkle', 'olcuHesapla', 'olcumTopla', 'TEKRAR_SUTUNU', 'TOPLAM_KAYNAK', 'EN_COK_DENEY_SATIRI', 'HIZ_SURELERI', 'HIZ_ADLARI'])
      expect(disa).not.toContain(ad);
    // Eski "Deney sonuçları" tablosu ve aygıt düzenleyicisi (deney kümesi modeli) de kalktı: satırları toplamaDurumu yazar
    for (const ad of ['sonucSutunlari', 'sonucTablosuUyumlu', 'silinecekSonucSayisi', 'cekilisBaslangici', 'sonucEkle', 'CEKILIS_SUTUNU', 'TOPLAM_SUTUNU', 'aygitSutunKimligi', 'yeniAygit', 'aygitTuruDegistir', 'EN_COK_AYGIT'])
      expect(disa).not.toContain(ad);
    // Düzenekte ölçüm ayarı yok
    for (const nesne of ['para', 'zar', 'iki-zar', 'cark', 'torba'] as const) expect(Object.keys(duzenek(nesne)).sort()).toEqual(['aygitlar', 'cekilisSayisi', 'hiz', 'toplamSutunu']);
  });
});

describe('örnekleyici: toplam sütunu', () => {
  it('yalnız en az iki sayısal aygıtta sunulur', () => {
    const tekZar = ayarla([sayiAraligi('Zar', 1, 6)], { toplamSutunu: true });
    expect(toplamKullanilabilir(tekZar)).toBe(false);
    expect(toplamEtkin(tekZar)).toBe(false);
    expect(degiskenAdlari(tekZar)).toEqual(['Zar']);
    const ikiZar = ayarla([sayiAraligi('Zar 1', 1, 6), sayiAraligi('Zar 2', 1, 6)], { toplamSutunu: true });
    expect(toplamKullanilabilir(ikiZar)).toBe(true);
    expect(toplamEtkin(ikiZar)).toBe(true);
    expect(degiskenAdlari(ikiZar)).toEqual(['Zar 1', 'Zar 2']);
  });
});
