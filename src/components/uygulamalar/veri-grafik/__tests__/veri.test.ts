import { describe, expect, it } from 'vitest';
import {
  ORNEK_VERILER,
  baslikSatiriMi,
  bosTablo,
  csvUret,
  gecerliDegerler,
  hataliHucreler,
  hucreYaz,
  izgaradanTablo,
  metinSutunlari,
  ornekKonulari,
  ORNEK_KONULARI,
  sutunTuruDegistir,
  ornekVeriOlustur,
  satirEkle,
  satirEtiketi,
  satirSil,
  sayiHucreYaz,
  sayiOku,
  sayiYaz,
  sayisalSutunlar,
  sonrakiHucre,
  sutunEkle,
  sutunIndeksi,
  sutunSil,
  tabloDogrula,
  tabloOlustur,
  tumunuTemizle,
  yapistir,
  yapistirmayiAyristir,
} from '../veri';
import { ozetHesapla } from '../istatistik';
import { caprazSayim, frekanslar, kategorikMi, renkEslemesi, sutunMetinleri } from '../kategorik';

describe('veri: sayı okuma / yazma', () => {
  it('sayiOku ondalık virgül, nokta, binlik ayırıcı ve boşlukları kabul eder', () => {
    expect(sayiOku('3,5')).toBe(3.5);
    expect(sayiOku('3.5')).toBe(3.5);
    expect(sayiOku(' 12 ')).toBe(12);
    expect(sayiOku('1.234,5')).toBe(1234.5);
    expect(sayiOku('1,234.5')).toBe(1234.5);
    expect(sayiOku('-2,25')).toBe(-2.25);
    expect(sayiOku('45%')).toBe(45);
    expect(sayiOku(7)).toBe(7);
  });

  it('sayiOku okunamayanı null verir', () => {
    expect(sayiOku('')).toBeNull();
    expect(sayiOku('abc')).toBeNull();
    expect(sayiOku('1,2,3')).toBeNull();
    expect(sayiOku('1.2.3')).toBeNull();
    expect(sayiOku(null)).toBeNull();
    expect(sayiOku(Number.NaN)).toBeNull();
  });

  it('sayiYaz ondalık virgül kullanır, -0 ve artıkları düzeltir', () => {
    expect(sayiYaz(3.5)).toBe('3,5');
    expect(sayiYaz(12)).toBe('12');
    expect(sayiYaz(-0)).toBe('0');
    expect(sayiYaz(0.1 + 0.2)).toBe('0,3');
    expect(sayiYaz(2.345, 1)).toBe('2,3');
  });
});

describe('veri: tablo işlemleri', () => {
  it('tabloOlustur ilk sütunu etiket, diğerlerini sayısal yapar', () => {
    const t = tabloOlustur(['Ad', 'Boy', 'Kilo'], [['Ali', 150, 45.5]]);
    expect(t.sutunlar.map((s) => s.tur)).toEqual(['etiket', 'sayi', 'sayi']);
    expect(t.satirlar[0].hucreler).toEqual(['Ali', '150', '45,5']);
    expect(sayisalSutunlar(t).map((s) => s.ad)).toEqual(['Boy', 'Kilo']);
  });

  it('satır ekle/sil ve sütun ekle/sil hücreleri hizalı tutar', () => {
    let t = tabloOlustur(['Ad', 'Değer'], [['a', 1]]);
    t = satirEkle(t);
    expect(t.satirlar).toHaveLength(2);
    expect(t.satirlar[1].hucreler).toEqual(['', '']);
    t = sutunEkle(t);
    expect(t.sutunlar).toHaveLength(3);
    expect(t.sutunlar[2].ad).toBe('Değişken 2');
    expect(t.satirlar.every((r) => r.hucreler.length === 3)).toBe(true);
    t = sutunSil(t, 1);
    expect(t.sutunlar.map((s) => s.ad)).toEqual(['Ad', 'Değişken 2']);
    expect(t.satirlar[0].hucreler).toEqual(['a', '']);
    expect(sutunSil(t, 0)).toBe(t); // etiket sütunu silinmez
    t = satirSil(t, 0);
    expect(t.satirlar).toHaveLength(1);
    expect(satirSil(t, 5)).toBe(t);
  });

  it('hucreYaz değişmeyen değerde aynı nesneyi döndürür; sayiHucreYaz Türkçe yazar', () => {
    const t = tabloOlustur(['Ad', 'Değer'], [['a', 1]]);
    expect(hucreYaz(t, 0, 1, '1')).toBe(t);
    const y = sayiHucreYaz(t, 0, 1, 2.5);
    expect(y.satirlar[0].hucreler[1]).toBe('2,5');
    expect(hucreYaz(t, 9, 1, 'x')).toBe(t);
  });

  it('gecerliDegerler hatalı hücreleri atlar, hataliHucreler onları listeler', () => {
    const t = tabloOlustur(['Ad', 'Değer'], [['a', 1], ['b', 'elma'], ['c', ''], ['d', '2,5']]);
    expect(gecerliDegerler(t, 1)).toEqual([
      { satir: 0, deger: 1 },
      { satir: 3, deger: 2.5 },
    ]);
    expect(hataliHucreler(t)).toEqual([{ satir: 1, sutun: 1 }]);
    expect(gecerliDegerler(t, 7)).toEqual([]);
  });

  it('satirEtiketi boş etiket için satır numarası verir; sutunIndeksi kimlikten bulur', () => {
    const t = tabloOlustur(['Ad', 'Değer'], [['Ayşe', 1], ['', 2]]);
    expect(satirEtiketi(t, 0)).toBe('Ayşe');
    expect(satirEtiketi(t, 1)).toBe('Satır 2');
    expect(sutunIndeksi(t, t.sutunlar[1].id)).toBe(1);
    expect(sutunIndeksi(t, 'yok')).toBe(-1);
    expect(sutunIndeksi(t, null)).toBe(-1);
  });

  it('tumunuTemizle satırları siler, sütunları korur', () => {
    const t = tumunuTemizle(ornekVeriOlustur('boy'));
    expect(t.satirlar).toHaveLength(0);
    expect(t.sutunlar).toHaveLength(2);
    expect(bosTablo().sutunlar).toHaveLength(2);
  });
});

describe('veri: yapıştırma', () => {
  it('sekme ayrılmış Excel verisini ızgaraya ayırır (CRLF, son boş satır atılır)', () => {
    expect(yapistirmayiAyristir('Ad\tBoy\r\nAli\t150\r\nAyşe\t152\r\n')).toEqual([
      ['Ad', 'Boy'],
      ['Ali', '150'],
      ['Ayşe', '152'],
    ]);
  });

  it('noktalı virgül ve virgül ayırıcıyı tanır; tek ondalık virgülü bölmez', () => {
    expect(yapistirmayiAyristir('a;1,5\nb;2')).toEqual([
      ['a', '1,5'],
      ['b', '2'],
    ]);
    expect(yapistirmayiAyristir('Ali,150\nAyşe,152')).toEqual([
      ['Ali', '150'],
      ['Ayşe', '152'],
    ]);
    expect(yapistirmayiAyristir('3,5\n4,2')).toEqual([['3,5'], ['4,2']]);
    expect(yapistirmayiAyristir('a,1,2\nb,3,4')).toEqual([
      ['a', '1', '2'],
      ['b', '3', '4'],
    ]);
    expect(yapistirmayiAyristir('1.5,2.5')).toEqual([['1.5', '2.5']]);
    expect(yapistirmayiAyristir('')).toEqual([]);
  });

  it('yapistir gerekirse satır/sütun ekleyerek konumdan itibaren yazar', () => {
    const t = tabloOlustur(['Ad', 'Değer'], [['a', 1]]);
    const y = yapistir(t, 0, 1, [
      ['5', '6'],
      ['7', '8'],
    ]);
    expect(y.sutunlar).toHaveLength(3);
    expect(y.satirlar).toHaveLength(2);
    expect(y.satirlar[0].hucreler).toEqual(['a', '5', '6']);
    expect(y.satirlar[1].hucreler).toEqual(['', '7', '8']);
  });

  it('baslikSatiriMi ve izgaradanTablo başlığı algılar', () => {
    const izgara = [
      ['Öğrenci', 'Boy'],
      ['Ali', '150'],
    ];
    expect(baslikSatiriMi(izgara)).toBe(true);
    expect(baslikSatiriMi([['Ali', '150'], ['Ayşe', '152']])).toBe(false);
    const t = izgaradanTablo(izgara);
    expect(t.sutunlar.map((s) => s.ad)).toEqual(['Öğrenci', 'Boy']);
    expect(t.satirlar).toHaveLength(1);
    const basliksiz = izgaradanTablo([['Ali', '150'], ['Ayşe']]);
    expect(basliksiz.sutunlar.map((s) => s.ad)).toEqual(['Etiket', 'Değişken 1']);
    expect(basliksiz.satirlar[1].hucreler).toEqual(['Ayşe', '']);
  });
});

describe('veri: CSV, gezinti, örnekler, doğrulama', () => {
  it('csvUret noktalı virgülle ayırır ve gerektiğinde tırnaklar', () => {
    const t = tabloOlustur(['Ad', 'Değer'], [['Ali; "A"', 1.5]]);
    expect(csvUret(t)).toBe('Ad;Değer\r\n"Ali; ""A""";1,5');
  });

  it('sonrakiHucre Enter/Tab/Shift+Tab gezintisi', () => {
    expect(sonrakiHucre({ satir: 0, sutun: 1 }, 'enter', 3, 2)).toEqual({ satir: 1, sutun: 1 });
    expect(sonrakiHucre({ satir: 2, sutun: 1 }, 'enter', 3, 2)).toBeNull();
    expect(sonrakiHucre({ satir: 0, sutun: 1 }, 'tab', 3, 2)).toEqual({ satir: 1, sutun: 0 });
    expect(sonrakiHucre({ satir: 0, sutun: 0 }, 'tab', 3, 2)).toEqual({ satir: 0, sutun: 1 });
    expect(sonrakiHucre({ satir: 1, sutun: 0 }, 'shift-tab', 3, 2)).toEqual({ satir: 0, sutun: 1 });
    expect(sonrakiHucre({ satir: 0, sutun: 0 }, 'shift-tab', 3, 2)).toBeNull();
    expect(sonrakiHucre({ satir: 1, sutun: 0 }, 'yukari', 3, 2)).toEqual({ satir: 0, sutun: 0 });
  });

  it('örnek veriler: en az 3 tane, maç verisi belgedeki sayılarla', () => {
    expect(ORNEK_VERILER.length).toBeGreaterThanOrEqual(3);
    const mac = ornekVeriOlustur('mac');
    expect(mac.sutunlar.map((s) => s.ad)).toEqual(['Maç', 'Selma', 'Yasemin']);
    expect(gecerliDegerler(mac, 1).map((d) => d.deger)).toEqual([18, 5, 32, 17, 13]);
    expect(gecerliDegerler(mac, 2).map((d) => d.deger)).toEqual([17, 15, 19, 16, 18]);
    expect(ornekVeriOlustur('sicaklik').satirlar).toHaveLength(12);
    expect(ornekVeriOlustur('boy').sutunlar[1].ad).toBe('Boy (cm)');
    expect(ornekVeriOlustur('olmayan').sutunlar[0].ad).toBe(ORNEK_VERILER[0].olustur().sutunlar[0].ad);
  });

  it('tabloDogrula bozuk veriyi reddeder, eksik hücreleri tamamlar', () => {
    expect(tabloDogrula(null)).toBeNull();
    expect(tabloDogrula({ sutunlar: [], satirlar: [] })).toBeNull();
    expect(tabloDogrula({ sutunlar: [{ id: 's1', ad: 'A', tur: 'etiket' }], satirlar: [{ id: 'r1' }] })).toBeNull();
    const t = tabloDogrula({
      sutunlar: [
        { id: 's1', ad: 'A', tur: 'sayi' },
        { id: 's2', ad: 'B', tur: 'sayi' },
      ],
      satirlar: [{ id: 'r1', hucreler: ['x'] }, { id: 'r2', hucreler: ['y', 3.5] }],
    });
    expect(t).not.toBeNull();
    expect(t!.sutunlar[0].tur).toBe('etiket');
    expect(t!.satirlar[0].hucreler).toEqual(['x', '']);
    expect(t!.satirlar[1].hucreler).toEqual(['y', '3,5']);
  });
});

describe('veri: sütun türleri (kategorik sütunlar ilk sütun dışında da)', () => {
  it('tabloOlustur türleri uygular; sutunTuruDegistir ilk sütuna dokunmaz, hücreleri korur', () => {
    const t = tabloOlustur(['Öğrenci', 'Sınıf', 'Puan'], [['Ali', 'A', 70], ['Ece', 'B', 80]], [undefined, 'etiket']);
    expect(t.sutunlar.map((s) => s.tur)).toEqual(['etiket', 'etiket', 'sayi']);
    expect(kategorikMi(t, 1)).toBe(true);
    const sayisal = sutunTuruDegistir(t, 1, 'sayi');
    expect(sayisal.sutunlar[1].tur).toBe('sayi');
    expect(sayisal.satirlar[0].hucreler).toEqual(['Ali', 'A', '70']);
    expect(hataliHucreler(sayisal)).toEqual([{ satir: 0, sutun: 1 }, { satir: 1, sutun: 1 }]);
    expect(sutunTuruDegistir(t, 0, 'sayi')).toBe(t);
    expect(sutunTuruDegistir(t, 1, 'etiket')).toBe(t);
    expect(sutunTuruDegistir(t, 9, 'sayi')).toBe(t);
  });

  it('yapıştırma: dolu hücreleri sayı olmayan sütun kategorik açılır, sayı sütunu sayısal kalır', () => {
    expect(metinSutunlari([['Ali', 'A', '70'], ['Ece', 'B', '80']])).toEqual([undefined, 'etiket', undefined]);
    // Tek dolu hücre ya da karışık sütun sayısal kalır (yanlış yazılmış bir sayı sütunu kategoriğe dönmesin)
    expect(metinSutunlari([['Ali', 'A', '70'], ['Ece', '', '80']])).toEqual([undefined, undefined, undefined]);
    expect(metinSutunlari([['Ali', 'x', '70'], ['Ece', '5', '80']])).toEqual([undefined, undefined, undefined]);
    const t = izgaradanTablo([
      ['Öğrenci', 'Sınıf', 'Puan'],
      ['Ali', 'A', '70'],
      ['Ece', 'B', '80'],
    ]);
    expect(t.sutunlar.map((s) => s.tur)).toEqual(['etiket', 'etiket', 'sayi']);
    expect(hataliHucreler(t)).toEqual([]);
  });
});

describe('örnek veriler: konulara göre, açıklamalı ve öğretici sayılarla', () => {
  const degerler = (id: string, sutun: number) => gecerliDegerler(ornekVeriOlustur(id), sutun).map((d) => d.deger);
  const tepe = (v: number[]) => {
    const f = frekanslar(v.map(String));
    const enCok = Math.max(...f.map((x) => x.sayi));
    return f.filter((x) => x.sayi === enCok).map((x) => Number(x.kategori));
  };

  it('her konuda örnek var, her örneğin açıklaması ve önerilen grafiği var, kimlikler tekil', () => {
    const konular = ornekKonulari();
    expect(konular.map((k) => k.id)).toEqual(ORNEK_KONULARI.map((k) => k.id));
    for (const k of konular) expect(k.ornekler.length, k.id).toBeGreaterThan(0);
    expect(konular.reduce((t, k) => t + k.ornekler.length, 0)).toBe(ORNEK_VERILER.length);
    expect(new Set(ORNEK_VERILER.map((o) => o.id)).size).toBe(ORNEK_VERILER.length);
    for (const o of ORNEK_VERILER) {
      expect(o.aciklama.length, o.id).toBeGreaterThan(20);
      expect(o.onerilenGrafik, o.id).toBeDefined();
      const t = o.olustur();
      if (o.varsayilanDegisken) expect(t.sutunlar.some((s) => s.ad === o.varsayilanDegisken), o.id).toBe(true);
      if (o.karsilastir) expect(t.sutunlar.some((s) => s.ad === o.karsilastir), o.id).toBe(true);
      if (o.renkDegisken) expect(t.sutunlar.some((s) => s.ad === o.renkDegisken && s.tur === 'etiket'), o.id).toBe(true);
      expect(hataliHucreler(t), o.id).toEqual([]);
    }
  });

  it('kitap: 20 öğrenci; tepe değer 3, medyan 3, ortalama 2,7 (toplam 54)', () => {
    const v = degerler('kitap', 1);
    const oz = ozetHesapla(v);
    expect(v).toHaveLength(20);
    expect(oz.ortalama).toBeCloseTo(2.7, 10);
    expect(oz.medyan).toBe(3);
    expect(tepe(v)).toEqual([3]);
    expect(oz.enKucuk).toBe(0);
    expect(oz.enBuyuk).toBe(6);
  });

  it('boy: 24 öğrenci, çan biçimli; ortalama = medyan = tepe değer = 152, OMS 2,5, açıklık 14', () => {
    const v = degerler('boy', 1);
    const oz = ozetHesapla(v);
    expect(v).toHaveLength(24);
    expect(oz.ortalama).toBe(152);
    expect(oz.medyan).toBe(152);
    expect(tepe(v)).toEqual([152]);
    expect(oz.oms).toBeCloseTo(2.5, 10);
    expect(oz.aciklik).toBe(14);
    // Simetri: 152'nin k altındaki ve k üstündeki öğrenci sayıları eşit
    for (const k of [1, 2, 3, 4, 6, 7]) expect(v.filter((x) => x === 152 - k).length, String(k)).toBe(v.filter((x) => x === 152 + k).length);
  });

  it('ulasim: sağa çarpık, uç değer 60; ortalama 16 > medyan 12 > tepe değer 10; uç değer çıkınca ortalama 12,86', () => {
    const v = degerler('ulasim', 1);
    const oz = ozetHesapla(v);
    expect(v).toHaveLength(15);
    expect(oz.ortalama).toBe(16);
    expect(oz.medyan).toBe(12);
    expect(tepe(v)).toEqual([10]);
    expect(oz.enBuyuk).toBe(60);
    const ucsuz = ozetHesapla(v.filter((x) => x !== 60));
    expect(ucsuz.ortalama).toBeCloseTo(12.857, 2);
    expect(ucsuz.medyan).toBe(11);
  });

  it('mac: aynı ortalama 17, OMS 6,4 ve 1,2; yüklenince Yasemin karşılaştırma panelinde', () => {
    const selma = ozetHesapla(degerler('mac', 1));
    const yasemin = ozetHesapla(degerler('mac', 2));
    expect(selma.ortalama).toBe(17);
    expect(yasemin.ortalama).toBe(17);
    expect(selma.oms).toBeCloseTo(6.4, 10);
    expect(yasemin.oms).toBeCloseTo(1.2, 10);
    expect(ORNEK_VERILER.find((o) => o.id === 'mac')!.karsilastir).toBe('Yasemin');
  });

  it('gun / meyve / ders: bütün 24 parça, her dilim 15° katı; ders iki yönlü tabloda 12 + 12', () => {
    expect(degerler('gun', 1).reduce((t, x) => t + x, 0)).toBe(24);
    const meyve = frekanslar(sutunMetinleri(ornekVeriOlustur('meyve'), 0).map((m) => m.deger));
    expect(meyve.reduce((t, x) => t + x.sayi, 0)).toBe(24);
    for (const x of meyve) expect(((x.sayi / 24) * 360) % 15, x.kategori).toBe(0);
    const ders = ornekVeriOlustur('ders');
    expect(ders.sutunlar.map((s) => [s.ad, s.tur])).toEqual([['Öğrenci', 'etiket'], ['Sınıf', 'etiket'], ['En sevdiği ders', 'etiket']]);
    const sinif = renkEslemesi(ders, 1)!;
    expect(sinif.kategoriler).toEqual(['5-A', '5-B']);
    const capraz = caprazSayim(ders, 2, sinif);
    expect(capraz.map((c) => c.kategori)).toEqual(['Beden Eğitimi', 'Fen Bilimleri', 'Matematik', 'Sosyal Bilgiler', 'Türkçe']);
    expect(capraz.map((c) => c.sayilar)).toEqual([[3, 4], [3, 2], [4, 2], [1, 1], [1, 3]]);
    expect(capraz.reduce((t, c) => t + c.toplam, 0)).toBe(24);
    for (const c of capraz) expect(((c.toplam / 24) * 360) % 15, c.kategori).toBe(0);
    expect(capraz.every((c) => c.bos === 0)).toBe(true);
  });

  it('fide: haftalık artışlar 3, 4, 5, 4, 3, 2, 1; sicaklik tepe Temmuz', () => {
    const boy = degerler('fide', 1);
    expect(boy.slice(1).map((x, i) => x - boy[i])).toEqual([3, 4, 5, 4, 3, 2, 1]);
    const s = ornekVeriOlustur('sicaklik');
    const enSicak = gecerliDegerler(s, 1).reduce((a, b) => (b.deger > a.deger ? b : a));
    expect(satirEtiketi(s, enSicak.satir)).toBe('Temmuz');
  });

  it('calisma: Sınıf ikinci sütunda kategorik, pozitif ilişki; cikolata: negatif ilişki; sinif: pozitif', () => {
    const r = (a: number[], b: number[]) => {
      const ort = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
      const [ma, mb] = [ort(a), ort(b)];
      const kov = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0);
      return kov / Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
    };
    const c = ornekVeriOlustur('calisma');
    expect(c.sutunlar.map((s) => s.tur)).toEqual(['etiket', 'etiket', 'sayi', 'sayi']);
    expect(kategorikMi(c, 0)).toBe(false);
    expect(new Set(c.satirlar.map((x) => x.hucreler[0])).size).toBe(20);
    expect(r(degerler('calisma', 2), degerler('calisma', 3))).toBeGreaterThan(0.9);
    expect(r(degerler('cikolata', 1), degerler('cikolata', 2))).toBeLessThan(-0.9);
    expect(r(degerler('sinif', 1), degerler('sinif', 2))).toBeGreaterThan(0.9);
  });
});
