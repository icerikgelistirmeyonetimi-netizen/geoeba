import { describe, expect, it } from 'vitest';
import {
  aktifSablon,
  bosDurum,
  deneyselOran,
  durumuCoz,
  durumuSerilestir,
  GORUNEN_SABLON_TURLERI,
  ornekDurum,
  oznelAyarla,
  oznelKilidiDegistir,
  sablonTuruSec,
  sablonuDogrula,
  sonucuDogrula,
  sablonuGuncelle,
  sifirla,
  sonuclariEkle,
} from '../durum';

describe('durum geçişleri', () => {
  it('örnek durum madeni parada 24 denemeyle gelir, kilit açık', () => {
    const d = ornekDurum();
    expect(d.sablonTuru).toBe('para');
    expect(d.deneme).toBe(24);
    expect(d.son.length).toBe(20);
    expect(d.oznelKilitli).toBe(false);
    expect(d.yakinsama.length).toBe(24);
  });

  it('sonuç eklemek sayaçları, son listesini ve yakınsamayı günceller; öznel kilitlenir', () => {
    let d = bosDurum('zar');
    d = sonuclariEkle(d, [
      { tur: 'zar', zarlar: [6] },
      { tur: 'zar', zarlar: [2] },
      { tur: 'zar', zarlar: [6] },
    ]);
    expect(d.deneme).toBe(3);
    expect(d.gerceklesen).toBe(2);
    expect(deneyselOran(d)).toBeCloseTo(2 / 3);
    expect(d.sayimlar).toEqual({ z6: 2, z2: 1 });
    expect(d.son[0]).toEqual({ tur: 'zar', zarlar: [6] });
    expect(d.oznelKilitli).toBe(true);
  });

  it('son liste 20 ile sınırlı ve en yeni başta', () => {
    let d = bosDurum('para');
    const sonuclar = Array.from({ length: 30 }, (_, i) => ({ tur: 'para' as const, yuz: i % 2 ? ('tura' as const) : ('yazi' as const) }));
    d = sonuclariEkle(d, sonuclar);
    expect(d.son).toHaveLength(20);
    expect(d.son[0].tur === 'para' && d.son[0].yuz).toBe('tura');
  });

  it('sıfırla sayaçları temizler, şablonu ve özneli korur', () => {
    let d = oznelAyarla(ornekDurum(), 70);
    d = sifirla(d);
    expect(d.deneme).toBe(0);
    expect(d.son).toEqual([]);
    expect(d.oznel).toBe(70);
    expect(d.oznelKilitli).toBe(false);
  });

  it('sekme değişimi sonuçları sıfırlar; geri dönünce şablon ayarı korunur', () => {
    let d = ornekDurum();
    d = sablonuGuncelle(d, { tur: 'para', istenen: 'yazi' });
    d = sablonTuruSec(d, 'kart');
    expect(d.deneme).toBe(0);
    expect(aktifSablon(d).tur).toBe('kart');
    d = sablonTuruSec(d, 'para');
    expect(aktifSablon(d)).toEqual({ tur: 'para', istenen: 'yazi' });
  });

  it('öznel 0–100 arasına kırpılır, kilit değişir', () => {
    expect(oznelAyarla(bosDurum(), 130).oznel).toBe(100);
    expect(oznelAyarla(bosDurum(), -4).oznel).toBe(0);
    expect(oznelAyarla(bosDurum(), NaN).oznel).toBe(0);
    expect(oznelKilidiDegistir(bosDurum()).oznelKilitli).toBe(true);
  });

  it('iadesiz torbaya geçince deney durumu kalan bilyelerle kurulur', () => {
    const d = sablonuGuncelle(bosDurum(), { tur: 'torba', bilyeler: [{ ad: 'K', renk: '#c00', adet: 2 }], iadeli: false, istenenRenk: 'K' });
    expect(d.deneyDurumu.torbaKalan).toEqual([2]);
  });
});

describe('kalıcılık', () => {
  it('serileştirip çözmek durumu korur', () => {
    const d = sonuclariEkle(ornekDurum(), [{ tur: 'para', yuz: 'tura' }]);
    const geri = durumuCoz(durumuSerilestir(d));
    expect(geri).toEqual(d);
  });

  it('bozuk kayıt null, eksik alanlar varsayılan', () => {
    expect(durumuCoz('{')).toBeNull();
    expect(durumuCoz(null)).toBeNull();
    const d = durumuCoz('{"sablonTuru":"zar","deneme":5,"gerceklesen":9,"oznel":"x"}');
    expect(d?.sablonTuru).toBe('zar');
    expect(d?.gerceklesen).toBe(5);
    expect(d?.oznel).toBe(50);
    expect(d?.sablonlar.para.tur).toBe('para');
  });
});

describe('bozuk kayıt doğrulama (durumuCoz)', () => {
  it('gövdesiz çark şablonu varsayılana düşer, teorik olasılık hesaplanabilir', async () => {
    const { teorikOlasilik } = await import('../olasilik');
    const d = durumuCoz('{"sablonTuru":"cark","sablonlar":{"cark":{"tur":"cark"}}}');
    expect(d).not.toBeNull();
    expect(aktifSablon(d!).tur).toBe('cark');
    expect(aktifSablon(d!)).toEqual(bosDurum().sablonlar.cark);
    expect(() => teorikOlasilik(aktifSablon(d!))).not.toThrow();
  });

  it('aktif şablon bozuksa sayaçlar da sıfırlanır (başka şablonun sayımı kalmaz)', () => {
    const d = durumuCoz('{"sablonTuru":"cark","sablonlar":{"cark":{"tur":"cark"}},"deneme":5,"gerceklesen":2,"sayimlar":{"c0":2},"son":[{"tur":"cark","dilim":0}]}');
    expect(d!.deneme).toBe(0);
    expect(d!.gerceklesen).toBe(0);
    expect(d!.sayimlar).toEqual({});
    expect(d!.son).toEqual([]);
    // Bozuk olan başka bir şablonsa aktif sayaçlar korunur
    const e = durumuCoz('{"sablonTuru":"para","sablonlar":{"para":{"tur":"para","istenen":"tura"},"cark":{"tur":"cark"}},"deneme":5,"gerceklesen":2}');
    expect(e!.deneme).toBe(5);
  });

  it('istenen alanı olmayan zar ve bilyesiz torba reddedilir', () => {
    const d = durumuCoz('{"sablonTuru":"zar","sablonlar":{"zar":{"tur":"zar","ikiZar":true},"torba":{"tur":"torba","bilyeler":"x","iadeli":false,"istenenRenk":"K"}}}');
    expect(d!.sablonlar.zar).toEqual(bosDurum().sablonlar.zar);
    expect(d!.sablonlar.torba).toEqual(bosDurum().sablonlar.torba);
  });

  it('geçerli şablonlar aynen korunur', () => {
    const kaynak = sablonuGuncelle(bosDurum(), {
      tur: 'cark',
      dilimler: [
        { ad: 'A', renk: '#111', genislik: 3 },
        { ad: 'B', renk: '#222', genislik: 1 },
      ],
      istenenRenk: 'B',
    });
    const d = durumuCoz(durumuSerilestir(kaynak));
    expect(d!.sablonlar.cark).toEqual(kaynak.sablonlar.cark);
    expect(d!.sablonlar.kart).toEqual(kaynak.sablonlar.kart);
  });

  it('son listesindeki gövdesiz ya da başka türden sonuçlar süzülür', () => {
    const d = durumuCoz('{"sablonTuru":"zar","son":[{"tur":"zar"},{"tur":"zar","zarlar":[3]},{"tur":"para","yuz":"tura"},{"tur":"kart","kart":{"tur":"kupa"}},{"tur":"cark","dilim":"x"}]}');
    expect(d!.son).toEqual([{ tur: 'zar', zarlar: [3] }]);
  });

  it('sablonuDogrula / sonucuDogrula alan bazında çalışır', () => {
    expect(sablonuDogrula({ tur: 'para', istenen: 'yazi' }, 'para')).toEqual({ tur: 'para', istenen: 'yazi' });
    expect(sablonuDogrula({ tur: 'para', istenen: 'kenar' }, 'para')).toBeNull();
    expect(sablonuDogrula({ tur: 'zar', istenen: { tip: 'sayi' } }, 'zar')).toBeNull();
    expect(sablonuDogrula({ tur: 'zar', istenen: { tip: 'cift' } }, 'zar')).toEqual({ tur: 'zar', ikiZar: false, istenen: { tip: 'cift' } });
    expect(sablonuDogrula({ tur: 'kart', istenen: { tip: 'tur', deger: 'yildiz' } }, 'kart')).toBeNull();
    expect(sablonuDogrula({ tur: 'kart', istenen: { tip: 'deger', deger: 'A' } }, 'kart')).toEqual({ tur: 'kart', istenen: { tip: 'deger', deger: 'A' } });
    expect(sablonuDogrula({ tur: 'cark', dilimler: [{ ad: 'A', renk: '#1', genislik: 1 }], istenenRenk: 'A' }, 'cark')).toBeNull();
    expect(sonucuDogrula({ tur: 'kart', kart: { tur: 'kupa', deger: 'Q' } })).toEqual({ tur: 'kart', kart: { tur: 'kupa', deger: 'Q' } });
    expect(sonucuDogrula({ tur: 'torba' })).toBeNull();
    expect(sonucuDogrula({ tur: 'bilinmeyen' })).toBeNull();
  });

  it('iadesiz torba kalanı yalnız aktif torba şablonuyla uyumluysa korunur', () => {
    const kaynak = sablonuGuncelle(bosDurum(), { tur: 'torba', bilyeler: [{ ad: 'K', renk: '#c00', adet: 2 }], iadeli: false, istenenRenk: 'K' });
    expect(durumuCoz(durumuSerilestir({ ...kaynak, deneyDurumu: { torbaKalan: [1] } }))!.deneyDurumu.torbaKalan).toEqual([1]);
    expect(durumuCoz(durumuSerilestir({ ...kaynak, deneyDurumu: { torbaKalan: [1, 2] } }))!.deneyDurumu.torbaKalan).toEqual([2]);
    expect(durumuCoz('{"sablonTuru":"para","deneyDurumu":{"torbaKalan":[1]}}')!.deneyDurumu).toEqual({});
  });
});

describe('gizli şablonlar', () => {
  it('kart destesi sekmelerde görünmez; kartla kaydedilmiş oturum sayaçları sıfırlanarak paraya döner', () => {
    expect(GORUNEN_SABLON_TURLERI).not.toContain('kart');
    const kartli = sablonTuruSec(bosDurum(), 'kart');
    const yuklenen = durumuCoz(durumuSerilestir({ ...kartli, deneme: 7, gerceklesen: 2 }))!;
    expect(yuklenen.sablonTuru).toBe('para');
    expect(yuklenen.deneme).toBe(0);
    expect(yuklenen.gerceklesen).toBe(0);
  });
});

describe('kayıttaki sayımların tutarlılığı (durumuCoz)', () => {
  const galtonKaydi = (ek: Record<string, unknown>) =>
    JSON.stringify({ sablonTuru: 'galton', sablonlar: { galton: { tur: 'galton', satir: 6, istenen: { tip: 'orta' } } }, ...ek });

  it('tutarlı Galton sayımları korunur', () => {
    const d = durumuCoz(galtonKaydi({ deneme: 5, gerceklesen: 2, sayimlar: { 'g:3': 2, 'g:1': 3 } }));
    expect(d!.deneme).toBe(5);
    expect(d!.sayimlar).toEqual({ 'g:3': 2, 'g:1': 3 });
  });

  it('toplamı deneme sayısını tutmayan sayımlar sayaçları sıfırlar (tablo %10000 göstermez)', () => {
    const d = durumuCoz(galtonKaydi({ deneme: 5, gerceklesen: 2, sayimlar: { 'g:0': 500 }, son: [{ tur: 'galton', yol: [0, 0, 0, 0, 0, 0], kutu: 0 }] }));
    expect(d!.deneme).toBe(0);
    expect(d!.gerceklesen).toBe(0);
    expect(d!.sayimlar).toEqual({});
    expect(d!.son).toEqual([]);
  });

  it('kutu aralığı dışındaki, negatif ya da tam sayı olmayan sayımlar reddedilir', () => {
    for (const sayimlar of [{ 'g:7': 5 }, { 'g:2': -5 }, { 'g:2': 2.5 }, { tura: 5 }]) {
      const d = durumuCoz(galtonKaydi({ deneme: 5, gerceklesen: 0, sayimlar }));
      expect(d!.deneme).toBe(0);
      expect(d!.sayimlar).toEqual({});
    }
  });
});
