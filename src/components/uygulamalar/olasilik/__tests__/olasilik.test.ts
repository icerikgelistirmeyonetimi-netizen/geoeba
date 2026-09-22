import { describe, expect, it } from 'vitest';
import {
  ebob,
  frekansAnahtari,
  frekansSatirlari,
  istenenAdi,
  istenenMi,
  kesirSadelestir,
  ornekUzay,
  sablonGecerli,
  sablonUyarilari,
  sonucAnahtari,
  sonucEtiketi,
  teorikOlasilik,
  varsayilanSablon,
  yuzdeMetni,
  type Sablon,
} from '../olasilik';

describe('kesir', () => {
  it('ebob ve sadeleştirme', () => {
    expect(ebob(12, 18)).toBe(6);
    expect(kesirSadelestir(2, 6)).toEqual({ pay: 1, payda: 3 });
    expect(kesirSadelestir(13, 52)).toEqual({ pay: 1, payda: 4 });
    expect(kesirSadelestir(0, 6)).toEqual({ pay: 0, payda: 1 });
  });

  it('hatalı payda çökertmez', () => {
    expect(kesirSadelestir(3, 0)).toEqual({ pay: 0, payda: 1 });
    expect(kesirSadelestir(NaN, 4)).toEqual({ pay: 0, payda: 1 });
  });

  it('yüzde metni Türkçe ondalık virgül kullanır', () => {
    expect(yuzdeMetni(1 / 3)).toBe('%33,3');
    expect(yuzdeMetni(0.5)).toBe('%50,0');
    expect(yuzdeMetni(NaN)).toBe('—');
  });
});

describe('örnek uzay', () => {
  it('para 2, zar 6, iki zar 36, kart 52 durum', () => {
    expect(ornekUzay(varsayilanSablon('para')).toplam).toBe(2);
    expect(ornekUzay(varsayilanSablon('zar')).toplam).toBe(6);
    expect(ornekUzay({ tur: 'zar', ikiZar: true, istenen: { tip: 'sayi', deger: 7 } }).toplam).toBe(36);
    expect(ornekUzay(varsayilanSablon('kart')).durumlar).toHaveLength(52);
  });

  it('çark dilim genişlikleri ve torba adetleri ağırlık olur', () => {
    const cark: Sablon = {
      tur: 'cark',
      dilimler: [
        { ad: 'Kırmızı', renk: '#c00', genislik: 3 },
        { ad: 'Mavi', renk: '#00c', genislik: 1 },
      ],
      istenenRenk: 'Kırmızı',
    };
    expect(ornekUzay(cark).toplam).toBe(4);
    const torba = varsayilanSablon('torba');
    expect(ornekUzay(torba).toplam).toBe(10);
  });

  it('sıfır genişlikli dilim ve sıfır adetli bilye örnek uzaya girmez', () => {
    const cark: Sablon = {
      tur: 'cark',
      dilimler: [
        { ad: 'A', renk: '#000', genislik: 0 },
        { ad: 'B', renk: '#111', genislik: 2 },
      ],
      istenenRenk: 'A',
    };
    expect(ornekUzay(cark).durumlar).toHaveLength(1);
    expect(sablonGecerli({ tur: 'torba', bilyeler: [{ ad: 'A', renk: '#000', adet: 0 }], iadeli: true, istenenRenk: 'A' })).toBe(false);
  });
});

describe('teorik olasılık', () => {
  it('para tura 1/2', () => {
    const p = teorikOlasilik(varsayilanSablon('para'));
    expect(p.kesir).toEqual({ pay: 1, payda: 2 });
    expect(p.formul).toBe('İstenen / Tüm durumlar = 1 / 2 ≈ %50,0');
  });

  it('zar çift sayı 3/6 = 1/2, ≥ 4 → 1/2, tek sayı 1/2', () => {
    expect(teorikOlasilik({ tur: 'zar', ikiZar: false, istenen: { tip: 'cift' } }).formul).toBe('İstenen / Tüm durumlar = 3 / 6 = 1/2 ≈ %50,0');
    expect(teorikOlasilik({ tur: 'zar', ikiZar: false, istenen: { tip: 'enAz', deger: 4 } }).kesir).toEqual({ pay: 1, payda: 2 });
    expect(teorikOlasilik({ tur: 'zar', ikiZar: false, istenen: { tip: 'tek' } }).deger).toBeCloseTo(0.5);
    expect(teorikOlasilik({ tur: 'zar', ikiZar: false, istenen: { tip: 'enFazla', deger: 2 } }).kesir).toEqual({ pay: 1, payda: 3 });
  });

  it('iki zar toplamı 7 → 6/36 = 1/6', () => {
    const p = teorikOlasilik({ tur: 'zar', ikiZar: true, istenen: { tip: 'sayi', deger: 7 } });
    expect(p.istenen).toBe(6);
    expect(p.tum).toBe(36);
    expect(p.kesir).toEqual({ pay: 1, payda: 6 });
  });

  it('eşit olmayan çark dilimleri teorik olasılığı değiştirir', () => {
    const esit: Sablon = {
      tur: 'cark',
      dilimler: [
        { ad: 'Kırmızı', renk: '#c00', genislik: 1 },
        { ad: 'Mavi', renk: '#00c', genislik: 1 },
      ],
      istenenRenk: 'Kırmızı',
    };
    expect(teorikOlasilik(esit).deger).toBeCloseTo(0.5);
    const genis: Sablon = { ...esit, dilimler: [{ ...esit.dilimler[0], genislik: 3 }, esit.dilimler[1]] };
    expect(teorikOlasilik(genis).kesir).toEqual({ pay: 3, payda: 4 });
  });

  it('aynı renkten birden çok dilim toplanır', () => {
    const cark: Sablon = {
      tur: 'cark',
      dilimler: [
        { ad: 'Kırmızı', renk: '#c00', genislik: 1 },
        { ad: 'Mavi', renk: '#00c', genislik: 1 },
        { ad: 'Kırmızı', renk: '#c00', genislik: 2 },
      ],
      istenenRenk: 'Kırmızı',
    };
    expect(teorikOlasilik(cark).kesir).toEqual({ pay: 3, payda: 4 });
  });

  it('torba 3 kırmızı / 10 → 3/10', () => {
    const p = teorikOlasilik(varsayilanSablon('torba'));
    expect(p.kesir).toEqual({ pay: 3, payda: 10 });
    expect(p.formul).toBe('İstenen / Tüm durumlar = 3 / 10 ≈ %30,0');
  });

  it('kart: kupa 13/52 = 1/4, as 4/52 = 1/13, kırmızı 26/52 = 1/2', () => {
    expect(teorikOlasilik({ tur: 'kart', istenen: { tip: 'tur', deger: 'kupa' } }).kesir).toEqual({ pay: 1, payda: 4 });
    expect(teorikOlasilik({ tur: 'kart', istenen: { tip: 'deger', deger: 'A' } }).kesir).toEqual({ pay: 1, payda: 13 });
    expect(teorikOlasilik({ tur: 'kart', istenen: { tip: 'renk', deger: 'kirmizi' } }).kesir).toEqual({ pay: 1, payda: 2 });
  });

  it('boş örnek uzayda olasılık 0, formül çökmez', () => {
    const p = teorikOlasilik({ tur: 'torba', bilyeler: [], iadeli: true, istenenRenk: 'A' });
    expect(p.deger).toBe(0);
    expect(p.kesir).toEqual({ pay: 0, payda: 1 });
  });
});

describe('istenenMi ve etiketler', () => {
  it('şablon ve sonuç türü uyuşmazsa false', () => {
    expect(istenenMi(varsayilanSablon('para'), { tur: 'zar', zarlar: [6] })).toBe(false);
  });

  it('zar koşulları toplam üzerinden çalışır', () => {
    const s: Sablon = { tur: 'zar', ikiZar: true, istenen: { tip: 'enAz', deger: 10 } };
    expect(istenenMi(s, { tur: 'zar', zarlar: [5, 5] })).toBe(true);
    expect(istenenMi(s, { tur: 'zar', zarlar: [4, 5] })).toBe(false);
  });

  it('kart koşulları', () => {
    expect(istenenMi({ tur: 'kart', istenen: { tip: 'renk', deger: 'siyah' } }, { tur: 'kart', kart: { tur: 'maca', deger: '7' } })).toBe(true);
    expect(istenenMi({ tur: 'kart', istenen: { tip: 'deger', deger: 'K' } }, { tur: 'kart', kart: { tur: 'karo', deger: 'Q' } })).toBe(false);
  });

  it('istenen adı ve sonuç etiketi Türkçe', () => {
    expect(istenenAdi(varsayilanSablon('para'))).toBe('Tura');
    expect(istenenAdi({ tur: 'zar', ikiZar: false, istenen: { tip: 'enAz', deger: 4 } })).toBe('≥ 4');
    expect(istenenAdi({ tur: 'kart', istenen: { tip: 'deger', deger: 'A' } })).toBe('As');
    expect(istenenAdi({ tur: 'kart', istenen: { tip: 'tur', deger: 'kupa' } })).toBe('Kupa ♥');
    const cark = varsayilanSablon('cark');
    expect(sonucEtiketi(cark, { tur: 'cark', dilim: 1 })).toBe('Mavi');
    expect(sonucEtiketi(cark, { tur: 'zar', zarlar: [2, 5] })).toBe('2 + 5 = 7');
    expect(sonucEtiketi(cark, { tur: 'kart', kart: { tur: 'sinek', deger: '10' } })).toBe('10♣');
  });

  it('frekans satırları ve anahtarları örtüşür', () => {
    const ikiZar: Sablon = { tur: 'zar', ikiZar: true, istenen: { tip: 'sayi', deger: 7 } };
    const satirlar = frekansSatirlari(ikiZar);
    expect(satirlar).toHaveLength(11);
    expect(satirlar.find((s) => s.etiket === '7')?.istenen).toBe(true);
    expect(frekansAnahtari(ikiZar, { tur: 'zar', zarlar: [3, 4] })).toBe('t7');
    expect(sonucAnahtari(ikiZar, { tur: 'zar', zarlar: [3, 4] })).toBe('t7');
    const kart = varsayilanSablon('kart');
    expect(frekansSatirlari(kart).map((s) => s.anahtar)).toContain('kt:kupa');
    expect(frekansAnahtari(kart, { tur: 'kart', kart: { tur: 'kupa', deger: '2' } })).toBe('kt:kupa');
  });

  it('kartta değer koşulunda frekans tablosu değere göre gruplanır (13 satır, As işaretli)', () => {
    const as: Sablon = { tur: 'kart', istenen: { tip: 'deger', deger: 'A' } };
    const satirlar = frekansSatirlari(as);
    expect(satirlar).toHaveLength(13);
    expect(satirlar[0]).toMatchObject({ anahtar: 'kd:A', etiket: 'As', istenen: true });
    expect(frekansAnahtari(as, { tur: 'kart', kart: { tur: 'maca', deger: 'K' } })).toBe('kd:K');
  });
});

describe('uyarılar', () => {
  it('istenen renk çarkta yoksa uyarı', () => {
    const cark = { ...varsayilanSablon('cark'), istenenRenk: 'Yok' } as Sablon;
    expect(sablonUyarilari(cark).some((u) => u.mesaj.includes('İstenen renk'))).toBe(true);
  });

  it('olanaksız zar koşulu uyarı verir', () => {
    expect(sablonUyarilari({ tur: 'zar', ikiZar: false, istenen: { tip: 'enAz', deger: 7 } })).toHaveLength(1);
    expect(sablonUyarilari(varsayilanSablon('zar'))).toHaveLength(0);
  });

  it('boş torba uyarı verir', () => {
    expect(sablonUyarilari({ tur: 'torba', bilyeler: [], iadeli: true, istenenRenk: 'A' })[0].mesaj).toContain('boş');
  });
});
