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
    expect(ornekVeriOlustur('olmayan').sutunlar[0].ad).toBe('Öğrenci');
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
