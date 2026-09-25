// Sahip: B1 (vg/canlandirma.ts: deney canlandırma planı, süreler, aşamalar, zar yüzleri)
import { describe, expect, it } from 'vitest';
import {
  ANINDA_ATIS_MALIYETI,
  ANINDA_KARE_BUTCESI,
  BUTUN_ATISLAR_SINIRI,
  GORUNUR_BUTCE,
  OTOMATIK_SURELER,
  ZAR_YUZ_ARALIGI,
  AZALTILMIS_HALKA,
  CARK_EN_AZ_SURE,
  CARK_GORUNUR_BUTCE,
  HIZ_ADLARI,
  HIZ_MENUSU,
  HIZ_SURELERI,
  TEK_ATIS_SURESI,
  TEK_CEVIRME_SURESI,
  YENI_NOKTA_HALKASI,
  YENI_SATIR_PARLAMASI,
  asamaOranlari,
  butceMetni,
  canlandirmaPlani,
  carkSonucDurusu,
  carkYedekSuresi,
  hizAdi,
  hizKilidiMetni,
  tahminiSure,
  tekAtisSuresi,
  zarYuzAdedi,
  zarYuzDizisi,
} from '../canlandirma';
import { mulberry32 } from '../rastgele';

describe('canlandırma: sabitler ve hız adları', () => {
  it('hız süreleri, adlar ve menü', () => {
    expect(HIZ_SURELERI).toEqual([1400, 700, 220, 0]);
    expect(HIZ_ADLARI).toEqual(['Yavaş', 'Orta', 'Hızlı', 'Anında']);
    expect(HIZ_MENUSU.map((h) => h.ad)).toEqual(['Otomatik (önerilen)', 'Yavaş', 'Orta', 'Hızlı', 'Anında']);
    expect(HIZ_MENUSU.map((h) => h.hiz)).toEqual(['oto', 0, 1, 2, 3]);
    expect([hizAdi('oto'), hizAdi(0), hizAdi(3)]).toEqual(['Otomatik', 'Yavaş', 'Anında']);
    expect([YENI_NOKTA_HALKASI, AZALTILMIS_HALKA, YENI_SATIR_PARLAMASI, ANINDA_KARE_BUTCESI, CARK_EN_AZ_SURE]).toEqual([700, 1000, 600, 24, 1000]);
    expect(OTOMATIK_SURELER).toEqual({ az: 700, orta: 400, cok: 220 });
    expect([BUTUN_ATISLAR_SINIRI, GORUNUR_BUTCE, ZAR_YUZ_ARALIGI]).toEqual([30, 10, 90]);
    expect(ANINDA_ATIS_MALIYETI * 2000).toBeLessThanOrEqual(1500);
  });
});

describe('canlandırma: plan (canlandirmaPlani)', () => {
  it('Otomatik: 20 atış × 400 ms; 8 atış × 700 ms; 100 atışta ilk 10 × 220 ms, kalanı anında', () => {
    expect(canlandirmaPlani(20, 'oto', false, 'para')).toEqual({ gorunur: 20, sure: 400, aninda: 0, kilitli: false });
    expect(canlandirmaPlani(8, 'oto', false, 'para')).toEqual({ gorunur: 8, sure: 700, aninda: 0, kilitli: false });
    expect(canlandirmaPlani(10, 'oto', false, 'zar')).toMatchObject({ gorunur: 10, sure: 700 });
    expect(canlandirmaPlani(30, 'oto', false, 'zar')).toMatchObject({ gorunur: 30, sure: 400 });
    expect(canlandirmaPlani(31, 'oto', false, 'zar')).toEqual({ gorunur: 10, sure: 220, aninda: 21, kilitli: false });
    expect(canlandirmaPlani(100, 'oto', false, 'para')).toEqual({ gorunur: 10, sure: 220, aninda: 90, kilitli: false });
  });

  it('seçilen hız: 30 atışa kadar hepsi, sonra ilk 10 atış; 500 ve üstü anında ve kilitli', () => {
    expect(canlandirmaPlani(100, 1, false, 'para')).toEqual({ gorunur: 10, sure: 700, aninda: 90, kilitli: false });
    expect(canlandirmaPlani(20, 0, false, 'para')).toEqual({ gorunur: 20, sure: 1400, aninda: 0, kilitli: false });
    expect(canlandirmaPlani(20, 2, false, 'torba')).toMatchObject({ gorunur: 20, sure: 220 });
    expect(canlandirmaPlani(600, 0, false, 'para')).toEqual({ gorunur: 0, sure: 0, aninda: 600, kilitli: true });
    expect(canlandirmaPlani(500, 'oto', false, 'para')).toEqual({ gorunur: 0, sure: 0, aninda: 500, kilitli: true });
    expect(canlandirmaPlani(20, 3, false, 'para')).toEqual({ gorunur: 0, sure: 0, aninda: 20, kilitli: false });
  });

  it('azaltılmış harekette her şey anında; çarkta görünür çevirme en az 1000 ms', () => {
    expect(canlandirmaPlani(20, 'oto', true, 'para')).toEqual({ gorunur: 0, sure: 0, aninda: 20, kilitli: true });
    expect(canlandirmaPlani(5, 0, true, 'cark')).toMatchObject({ gorunur: 0, aninda: 5 });
    for (const hiz of ['oto', 0, 1, 2] as const) {
      for (const n of [1, 8, 20, 30, 100]) {
        const p = canlandirmaPlani(n, hiz, false, 'cark');
        expect(p.gorunur).toBeGreaterThan(0);
        expect(p.sure).toBeGreaterThanOrEqual(1000);
      }
    }
    expect(canlandirmaPlani(8, 0, false, 'cark').sure).toBe(1400);
    expect(canlandirmaPlani(0, 'oto', false, 'para')).toEqual({ gorunur: 0, sure: 0, aninda: 0, kilitli: false });
    expect(canlandirmaPlani(NaN, 'oto', false, 'para').aninda).toBe(0);
  });

  it('çark (Otomatik ve Hızlı): 30 çevirmeye kadar ilk 6, daha çoğunda ilk 2 çevirme görünür, kalanı anında', () => {
    expect(CARK_GORUNUR_BUTCE).toEqual({ az: 6, cok: 2 });
    expect(canlandirmaPlani(4, 'oto', false, 'cark')).toEqual({ gorunur: 4, sure: 1000, aninda: 0, kilitli: false });
    expect(canlandirmaPlani(6, 'oto', false, 'cark')).toEqual({ gorunur: 6, sure: 1000, aninda: 0, kilitli: false });
    expect(canlandirmaPlani(10, 'oto', false, 'cark')).toEqual({ gorunur: 6, sure: 1000, aninda: 4, kilitli: false });
    expect(canlandirmaPlani(20, 'oto', false, 'cark')).toEqual({ gorunur: 6, sure: 1000, aninda: 14, kilitli: false });
    expect(canlandirmaPlani(30, 'oto', false, 'cark')).toMatchObject({ gorunur: 6, aninda: 24 });
    expect(canlandirmaPlani(100, 'oto', false, 'cark')).toEqual({ gorunur: 2, sure: 1000, aninda: 98, kilitli: false });
    // Hızlı çarkta Orta'dan kısa sürer (çevirme süresi ikisinde de 1000 ms)
    expect(canlandirmaPlani(20, 2, false, 'cark')).toMatchObject({ gorunur: 6, sure: 1000 });
    expect(canlandirmaPlani(20, 1, false, 'cark')).toMatchObject({ gorunur: 20, sure: 1000 });
    expect(canlandirmaPlani(20, 0, false, 'cark')).toMatchObject({ gorunur: 20, sure: 1400 });
    expect(canlandirmaPlani(100, 1, false, 'cark')).toMatchObject({ gorunur: 10, aninda: 90 });
    // Öteki nesneler değişmez
    expect(canlandirmaPlani(20, 'oto', false, 'torba')).toMatchObject({ gorunur: 20, sure: 400 });
    expect(canlandirmaPlani(20, 2, false, 'para')).toMatchObject({ gorunur: 20, sure: 220 });
  });

  it('tahmini süreler: 20 Otomatik ≈ 8 s; 30 ≈ 12 s; 100 Otomatik ≤ 3,5 s; 2000 ≤ 1,5 s', () => {
    expect(tahminiSure(canlandirmaPlani(20, 'oto', false, 'para'))).toBe(8000);
    expect(tahminiSure(canlandirmaPlani(30, 'oto', false, 'para'))).toBe(12000);
    expect(tahminiSure(canlandirmaPlani(100, 'oto', false, 'para'))).toBeLessThanOrEqual(3500);
    expect(tahminiSure(canlandirmaPlani(2000, 'oto', false, 'para'))).toBeLessThanOrEqual(1500);
  });

  it("çarkta sonuç duruşu dahil: 20 çevirme ≤ 10 s, 100 çevirme ≤ 4 s; Hızlı Orta'dan kısa", () => {
    expect([carkSonucDurusu(1000), carkSonucDurusu(1400), carkSonucDurusu(400), carkSonucDurusu(0)]).toEqual([300, 300, 160, 60]);
    const sure = (n: number, hiz: 'oto' | 0 | 1 | 2) => tahminiSure(canlandirmaPlani(n, hiz, false, 'cark'), 'cark');
    expect(sure(20, 'oto')).toBeLessThanOrEqual(10000);
    expect(sure(10, 'oto')).toBeLessThanOrEqual(10000);
    expect(sure(30, 'oto')).toBeLessThanOrEqual(10000);
    expect(sure(100, 'oto')).toBeLessThanOrEqual(4000);
    expect(sure(20, 2)).toBeLessThan(sure(20, 1));
    // Duruş yalnız çarkta eklenir
    expect(tahminiSure(canlandirmaPlani(20, 'oto', false, 'para'), 'para')).toBe(8000);
  });
});

describe('canlandırma: tek atış, aşamalar ve zar yüzleri', () => {
  it('tek atış süresi: 900 ms, çarkta 1400 ms, azaltılmış harekette 0', () => {
    expect(tekAtisSuresi('para', false)).toBe(TEK_ATIS_SURESI);
    expect(tekAtisSuresi('cark', false)).toBe(TEK_CEVIRME_SURESI);
    expect([TEK_ATIS_SURESI, TEK_CEVIRME_SURESI]).toEqual([900, 1400]);
    expect(tekAtisSuresi('zar', true)).toBe(0);
  });

  it('aşama oranları: para 0,8; zar 0,7; torba 0,85; çark transitionend', () => {
    expect(asamaOranlari('para')).toEqual({ sonuc: 0.55, satir: 0.8 });
    expect(asamaOranlari('zar')).toEqual({ sonuc: 0.7, satir: 0.7 });
    expect(asamaOranlari('iki-zar').satir).toBe(0.7);
    expect(asamaOranlari('torba')).toEqual({ sonuc: 0.45, satir: 0.85 });
    expect(asamaOranlari('cark')).toEqual({ sonuc: null, satir: null });
    expect(carkYedekSuresi(1000)).toBe(1700);
    expect(carkYedekSuresi(1400)).toBe(2020);
  });

  it('zar yüzleri: 90 ms aralık, art arda aynı yüz yok, son ara yüz sonuçtan farklı, tohumla kararlı', () => {
    expect(zarYuzAdedi(900)).toBe(7);
    expect(zarYuzAdedi(0)).toBe(0);
    const yuzler = zarYuzDizisi(mulberry32(1), 40, 4);
    expect(yuzler).toHaveLength(40);
    for (let i = 0; i < yuzler.length; i++) {
      expect(yuzler[i]).toBeGreaterThanOrEqual(1);
      expect(yuzler[i]).toBeLessThanOrEqual(6);
      if (i > 0) expect(yuzler[i]).not.toBe(yuzler[i - 1]);
    }
    expect(yuzler[39]).not.toBe(4);
    expect(zarYuzDizisi(mulberry32(1), 40, 4)).toEqual(yuzler);
    expect(zarYuzDizisi(mulberry32(1), 0)).toEqual([]);
  });
});

describe('canlandırma: notlar', () => {
  it('bütçe notu ve hız kilidi', () => {
    expect(butceMetni(canlandirmaPlani(100, 'oto', false, 'para'), 'para')).toBe('İlk 10 atış görünür, kalanı hızlı');
    expect(butceMetni(canlandirmaPlani(100, 'oto', false, 'cark'), 'cark')).toBe('İlk 2 çevirme görünür, kalanı hızlı');
    expect(butceMetni(canlandirmaPlani(20, 'oto', false, 'cark'), 'cark')).toBe('İlk 6 çevirme görünür, kalanı hızlı');
    expect(butceMetni(canlandirmaPlani(100, 1, false, 'cark'), 'cark')).toBe('İlk 10 çevirme görünür, kalanı hızlı');
    expect(butceMetni(canlandirmaPlani(20, 'oto', false, 'para'), 'para')).toBeNull();
    expect(butceMetni(canlandirmaPlani(600, 'oto', false, 'para'), 'para')).toBeNull();
    expect(hizKilidiMetni(500, false, 'para')).toBe('500 ve üstü atış anında yapılır ve yalnız Deney özetine yazılır.');
    expect(hizKilidiMetni(1000, false, 'torba')).toBe('500 ve üstü çekiş anında yapılır ve yalnız Deney özetine yazılır.');
    expect(hizKilidiMetni(20, true, 'para')).toBe('Sistemde hareket azaltıldığı için sonuçlar anında yazılır.');
    expect(hizKilidiMetni(20, false, 'para')).toBeNull();
  });
});
