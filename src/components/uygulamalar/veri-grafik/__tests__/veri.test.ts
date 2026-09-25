// Sahip: A (vg/veri.ts: sayı okuma / yazma, tablo işlemleri, yapıştırma, CSV, örnek veriler)
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
  ornekBul,
  TUM_OZELLIKLER,
  type OrnekVeri,
  type RehberEylemi,
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

  it('sayiYaz yarımları sıfırdan uzağa yuvarlar (kayan nokta artığına rağmen)', () => {
    expect(sayiYaz(2.275)).toBe('2,28');
    expect(sayiYaz(1.005)).toBe('1,01');
    expect(sayiYaz(14.35, 1)).toBe('14,4');
    expect(sayiYaz(-2.275)).toBe('-2,28');
    expect(sayiYaz(0.1 + 0.2)).toBe('0,3');
    expect(sayiYaz(2.5, 0)).toBe('3');
    expect(sayiYaz(-2.5, 0)).toBe('-3');
    expect(sayiYaz(-0.001)).toBe('0');
    expect(sayiYaz(1234.5678, 3)).toBe('1234,568');
    expect(sayiYaz(25000, 6)).toBe('25000');
    expect(sayiYaz(-9.1, 6)).toBe('-9,1');
    expect(sayiYaz(0.000001, 6)).toBe('0,000001');
    expect(sayiYaz(Number.NaN)).toBe('');
    // Ortalama gibi hesaplanan değerler: 16,35 bilgisayarda 16,349999… çıkar
    expect(sayiYaz((16.3 + 16.4) / 2, 1)).toBe('16,4');
  });

  it('sayiOku baştaki yüzde işaretini ve Unicode eksiyi (−) okur', () => {
    expect(sayiOku('−3,5')).toBe(-3.5);
    expect(sayiOku('%50')).toBe(50);
    expect(sayiOku('% 12,5')).toBe(12.5);
    expect(sayiOku('%−5')).toBe(-5);
    expect(sayiOku('−1.234,5')).toBe(-1234.5);
    expect(sayiOku('%')).toBeNull();
    expect(sayiOku('%5%')).toBeNull();
    // Sayı → metin → sayı gidiş-dönüşü
    for (const x of [0, 2.28, -9.1, 1234.5, 0.000001]) expect(sayiOku(sayiYaz(x, 6))).toBe(x);
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

  it('CSV tırnakları çözülür: tırnak içindeki ayırıcı ve satır sonu bölmez, "" tek tırnak olur', () => {
    expect(yapistirmayiAyristir('"Kaya, Ali";155')).toEqual([['Kaya, Ali', '155']]);
    expect(yapistirmayiAyristir('Ad,Boy\n"Kaya, Ali",155\nEce,150')).toEqual([
      ['Ad', 'Boy'],
      ['Kaya, Ali', '155'],
      ['Ece', '150'],
    ]);
    // Excel'den çok satırlı hücre (sekmeli): satır sonu hücrede boşluk olur
    expect(yapistirmayiAyristir('Ad\tNot\r\n"çok\r\nsatırlı"\t5\r\n')).toEqual([
      ['Ad', 'Not'],
      ['çok satırlı', '5'],
    ]);
    expect(yapistirmayiAyristir('"Ali ""Kara""";3')).toEqual([['Ali "Kara"', '3']]);
    // Tırnaklı ondalık sayı tek sütunda bölünmez
    expect(yapistirmayiAyristir('"3,5"\n"4,2"')).toEqual([['3,5'], ['4,2']]);
    // Alan ortasındaki tırnak ve kapanmayan tırnak düz metindir
    expect(yapistirmayiAyristir('5" boy;3')).toEqual([['5" boy', '3']]);
    expect(yapistirmayiAyristir('"açık;5')).toEqual([['"açık', '5']]);
    // Aradaki boş satır kalır, sondaki boş satırlar atılır
    expect(yapistirmayiAyristir('a\n\nb\n  \n')).toEqual([['a'], [''], ['b']]);
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

  it('tabloDogrula: ilk sütun bir araştırma sütunuysa kayıttaki türü korunur (ölçüm değeri, sayı küpü)', () => {
    const tablo = (ilk: { id: string; tur: string }) =>
      tabloDogrula({
        sutunlar: [
          { id: ilk.id, ad: 'İlk', tur: ilk.tur },
          { id: 's2', ad: 'B', tur: 'sayi' },
        ],
        satirlar: [{ id: 'r1', hucreler: ['84', '1'] }],
      })!;
    // Araştırma sütunu (`ar<n>-<kimlik>-<rol>`): sayı kalır, etiket kalır
    expect(tablo({ id: 'ar3-x7k2-deger', tur: 'sayi' }).sutunlar[0].tur).toBe('sayi');
    expect(tablo({ id: 'ar3-x7k2-s0', tur: 'sayi' }).sutunlar[0].tur).toBe('sayi');
    expect(tablo({ id: 'ar3-x7k2-cevap', tur: 'etiket' }).sutunlar[0].tur).toBe('etiket');
    // Bilinmeyen tür sayı sayılır (öteki sütunlardaki kuralla aynı)
    expect(tablo({ id: 'ar3-x7k2-deger', tur: 'bozuk' }).sutunlar[0].tur).toBe('sayi');
    // Rolsüz ilk sütun (elle ya da örnekten) her zaman etiket; rol sözlükte yoksa da
    expect(tablo({ id: 's1-ab12', tur: 'sayi' }).sutunlar[0].tur).toBe('etiket');
    expect(tablo({ id: 'ar3-x7k2-bilinmeyen', tur: 'sayi' }).sutunlar[0].tur).toBe('etiket');
    // Sayısal ilk sütunun değerleri ve öteki sütunlar olduğu gibi
    const t = tablo({ id: 'ar3-x7k2-deger', tur: 'sayi' });
    expect(t.satirlar[0].hucreler).toEqual(['84', '1']);
    expect(t.sutunlar[1].tur).toBe('sayi');
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

  it('boy: 24 öğrenci; ortalama 153, ortanca 152, tepe değer 152 (3 kez), OMS 5, açıklık 30', () => {
    const v = degerler('boy', 1);
    const oz = ozetHesapla(v);
    expect(v).toHaveLength(24);
    expect(oz.ortalama).toBe(153);
    expect(oz.medyan).toBe(152);
    expect(tepe(v)).toEqual([152]);
    expect(v.filter((x) => x === 152)).toHaveLength(3);
    expect(oz.oms).toBeCloseTo(5, 10);
    expect(oz.aciklik).toBe(30);
    expect([oz.enKucuk, oz.enBuyuk]).toEqual([140, 170]);
    // Rehberin 3. adımı: 24 öğrenciden 16'sı 148 ile 158 cm arasındaki bantta (ortalama ± ortalama mutlak sapma)
    expect(v.filter((x) => x >= 148 && x <= 158)).toHaveLength(16);
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

  it('gun / baskan / atik: gün 24 saat; 20 oyda açılar tam derece; atik iki yönlü tabloda 12 + 12', () => {
    expect(degerler('gun', 1).reduce((t, x) => t + x, 0)).toBe(24);
    const baskan = frekanslar(sutunMetinleri(ornekVeriOlustur('baskan'), 1).map((m) => m.deger));
    expect(baskan.reduce((t, x) => t + x.sayi, 0)).toBe(20);
    for (const x of baskan) expect(((x.sayi / 20) * 360) % 1, x.kategori).toBe(0);
    const atik = ornekVeriOlustur('atik');
    expect(atik.sutunlar.map((s) => [s.ad, s.tur])).toEqual([['Öğrenci', 'etiket'], ['Sınıf', 'etiket'], ['En çok çıkan atık', 'etiket']]);
    const sinif = renkEslemesi(atik, 1)!;
    expect(sinif.kategoriler).toEqual(['5-A', '5-B']);
    // Sırasız çağrı: kategoriler alfabetik
    const capraz = caprazSayim(atik, 2, sinif);
    expect(capraz.map((c) => c.kategori)).toEqual(['Cam', 'Kâğıt ve karton', 'Metal', 'Plastik', 'Yemek artığı']);
    expect(capraz.map((c) => c.sayilar)).toEqual([[1, 2], [1, 4], [1, 0], [6, 1], [3, 5]]);
    // kategoriSirasi ile: tasarım sırası
    const sira = ORNEK_VERILER.find((o) => o.id === 'atik')!.kategoriSirasi!['En çok çıkan atık'];
    expect(sira).toEqual(['Yemek artığı', 'Plastik', 'Kâğıt ve karton', 'Cam', 'Metal']);
    const sirali = caprazSayim(atik, 2, sinif, sira);
    expect(sirali.map((c) => c.sayilar)).toEqual([[3, 5], [6, 1], [1, 4], [1, 2], [1, 0]]);
    expect(capraz.reduce((t, c) => t + c.toplam, 0)).toBe(24);
    for (const c of capraz) expect(((c.toplam / 24) * 360) % 15, c.kategori).toBe(0);
    expect(capraz.every((c) => c.bos === 0)).toBe(true);
  });

  it('fide: haftalık artışlar 3, 4, 5, 4, 3, 2, 1; sicaklik en sıcak ay Ağustos', () => {
    const boy = degerler('fide', 1);
    expect(boy.slice(1).map((x, i) => x - boy[i])).toEqual([3, 4, 5, 4, 3, 2, 1]);
    const s = ornekVeriOlustur('sicaklik');
    const enSicak = gecerliDegerler(s, 1).reduce((a, b) => (b.deger > a.deger ? b : a));
    expect(satirEtiketi(s, enSicak.satir)).toBe('Ağustos');
  });

  it('calisma: Sınıf ikinci sütunda kategorik, orta güçte pozitif ilişki; cikolata: güçlü negatif ilişki', () => {
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
    // Kusursuz doğru değil: r ≈ 0,70 (istisna nokta 8B-03) ve r ≈ −0,90
    const rc = r(degerler('calisma', 2), degerler('calisma', 3));
    expect(rc).toBeGreaterThan(0.6);
    expect(rc).toBeLessThan(0.8);
    expect(r(degerler('cikolata', 1), degerler('cikolata', 2))).toBeLessThan(-0.85);
  });
});

describe('örnek veriler: 16 örnek, sınıf düzeyi, hikâye, kaynak ve rehber', () => {
  const degerler = (id: string, sutun: number, grup?: string) => {
    const t = ornekVeriOlustur(id);
    return gecerliDegerler(t, sutun)
      .filter((d) => grup === undefined || t.satirlar[d.satir].hucreler[1] === grup)
      .map((d) => d.deger);
  };
  const sutunAdi = (o: OrnekVeri, ad: string) => o.olustur().sutunlar.find((s) => s.ad === ad);
  const eylemler = (o: OrnekVeri): RehberEylemi[] =>
    o.rehber.flatMap((a) => [a.eylem, a.yedekEylem].filter((e): e is RehberEylemi => !!e));

  it('16 örnek, 5 konu (5-8. sınıf ve zenginleştirme), her konuda en az bir örnek; eski kimlikler yok', () => {
    expect(ORNEK_VERILER).toHaveLength(16);
    expect(ORNEK_KONULARI.map((k) => k.id)).toEqual(['sinif5', 'sinif6', 'sinif7', 'sinif8', 'zenginlestirme']);
    expect(ORNEK_KONULARI.map((k) => k.kisaAd)).toEqual(['5. sınıf', '6. sınıf', '7. sınıf', '8. sınıf', 'Zenginleştirme']);
    expect(ornekKonulari().map((k) => k.ornekler.length)).toEqual([4, 4, 4, 2, 2]);
    expect(ORNEK_VERILER.map((o) => o.id)).toEqual([
      'baskan', 'atik', 'gun', 'harcama', 'kitap', 'kardes', 'ulasim', 'mac',
      'sinav', 'boy', 'fide', 'sicaklik', 'iklim', 'ekran', 'calisma', 'cikolata',
    ]);
    for (const eski of ['meyve', 'ders', 'sinif']) {
      expect(ornekBul(eski), eski).toBeUndefined();
      // Bilinmeyen kimlik ilk örneğe düşer (bugünkü davranış)
      expect(ornekVeriOlustur(eski).sutunlar.map((s) => s.ad), eski).toEqual(['Oy pusulası', 'Aday']);
    }
    expect(ornekBul(null)).toBeUndefined();
    expect(ornekBul('boy')!.ad).toBe('7-C öğrencilerinin boy uzunlukları');
    // İlk açılış verisi boy
    expect(ORNEK_VERILER.filter((o) => o.varsayilanAcilis).map((o) => o.id)).toEqual(['boy']);
  });

  it('her örnekte hikâye, kaynak, kazanım ve 4 adımlı rehber tutarlı', () => {
    const SIRA = ['tahmin', 'bak', 'olc', 'yorumla'];
    for (const o of ORNEK_VERILER) {
      const t = o.olustur();
      expect(o.aciklama.length, o.id).toBeLessThanOrEqual(120);
      if (o.aciklamaOzellikli) expect(o.aciklamaOzellikli.metin.length, o.id).toBeLessThanOrEqual(120);
      expect(o.hikaye.n, o.id).toBe(t.satirlar.length);
      for (const alan of [o.hikaye.arastirmaSorusu, o.hikaye.kim, o.hikaye.neZaman, o.hikaye.nasil, o.hikaye.cumle]) {
        expect(alan.length, o.id).toBeGreaterThan(5);
      }
      expect(o.hikaye.arastirmaSorusu.endsWith('?'), o.id).toBe(true);
      if (o.kaynak.tur === 'gercek') expect(o.kaynak.url, o.id).toMatch(/^https:\/\//);
      // Kazanım: MAT.<sınıf>.… ; zenginleştirmede boş
      if (o.konu === 'zenginlestirme') expect(o.kazanim, o.id).toEqual([]);
      else {
        expect(o.kazanim.length, o.id).toBeGreaterThan(0);
        for (const k of o.kazanim) expect(k, o.id).toMatch(new RegExp(`^MAT\\.${o.sinif}\\.\\d+\\.\\d+$`));
        expect(o.konu, o.id).toBe(`sinif${o.sinif}`);
      }
      expect(o.rehber.map((a) => a.tur), o.id).toEqual(SIRA);
      for (const a of o.rehber) {
        expect(a.baslik.length * a.soru.length * a.cevap.length, o.id).toBeGreaterThan(0);
        if (a.eylem?.gerektirir) expect(TUM_OZELLIKLER, o.id).toContain(a.eylem.gerektirir);
        if (a.yedekEylem) expect(a.yedekEylem.gerektirir, o.id).toBeUndefined();
      }
      // Tahmin adımında düğme yok: öğrenci ölçüye bakmadan tahmin eder
      expect(o.rehber[0].eylem, o.id).toBeNull();
      // Açılışta ölçüler kapalı
      for (const v of Object.values(o.acilis?.secenekler ?? {})) expect(v, o.id).toBe(false);
      // Önerilen sekme için sekme ipucu yazılmaz (şerit orada aciklama'yı gösterir)
      const onerilen = o.acilis?.sekme ?? o.onerilenGrafik;
      expect(onerilen, o.id).toBeDefined();
      expect(o.sekmeIpucu?.[onerilen!], o.id).toBeUndefined();
      for (const m of Object.values(o.sekmeIpucuOzellikli ?? {})) expect(TUM_OZELLIKLER, o.id).toContain(m!.gerektirir);
    }
  });

  it('örneklerin sütun adlarına bağlı alanları tabloda karşılık bulur', () => {
    for (const o of ORNEK_VERILER) {
      const t = o.olustur();
      const etiketler = t.satirlar.map((r) => r.hucreler[0]);
      if (o.grupla) expect(sutunAdi(o, o.grupla)?.tur, o.id).toBe('etiket');
      for (const [ad, sira] of Object.entries(o.kategoriSirasi ?? {})) {
        const i = t.sutunlar.findIndex((s) => s.ad === ad);
        expect(t.sutunlar[i]?.tur, `${o.id} ${ad}`).toBe('etiket');
        expect([...sira].sort(), `${o.id} ${ad}`).toEqual([...new Set(t.satirlar.map((r) => r.hucreler[i]))].sort());
      }
      for (const ad of Object.keys(o.yuzdeDegisim ?? {})) expect(sutunAdi(o, ad)?.tur, `${o.id} ${ad}`).toBe('sayi');
      for (const e of eylemler(o)) {
        if (e.tur === 'hucre') {
          expect(etiketler, o.id).toContain(e.satir);
          expect(sutunAdi(o, e.sutun)?.tur, o.id).toBe('sayi');
        }
        if (e.tur === 'satirVurgula') expect(etiketler, o.id).toContain(e.satir);
        if (e.tur === 'satirEkle') expect(e.hucreler, o.id).toHaveLength(t.sutunlar.length);
      }
      // Hassas ölçümlerde adlar yerine kod
      if (o.hassas) for (const e of etiketler) expect(e, o.id).toMatch(/^[0-9A-Z]+-?\d+$/);
    }
  });

  it('istatistik iddiaları: sinav, mac, gun, iklim (öteki örnekler yukarıda)', () => {
    // sinav: 7-A ve 7-B'nin ortalaması 70, ortalama mutlak sapma 16 ve 6, açıklık 60 ve 25
    const a = ozetHesapla(degerler('sinav', 2, '7-A'));
    const b = ozetHesapla(degerler('sinav', 2, '7-B'));
    expect([a.n, b.n]).toEqual([15, 15]);
    expect([a.ortalama, b.ortalama]).toEqual([70, 70]);
    expect(a.oms).toBeCloseTo(16, 10);
    expect(b.oms).toBeCloseTo(6, 10);
    expect([a.aciklik, b.aciklik]).toEqual([60, 25]);
    // mac: aynı ortalama 17, açıklık 27 ve 4
    expect([ozetHesapla(degerler('mac', 1)).aciklik, ozetHesapla(degerler('mac', 2)).aciklik]).toEqual([27, 4]);
    // gun: toplam 24 saat, her dilim 15°'nin katı (tam saat)
    const gun = degerler('gun', 1);
    expect(gun.reduce((t, x) => t + x, 0)).toBe(24);
    for (const x of gun) expect(Number.isInteger(((x / 24) * 360) / 15), String(x)).toBe(true);
    // iklim: Erzurum'da 4 ay sıfırın altında
    expect(degerler('iklim', 1).filter((x) => x < 0)).toHaveLength(4);
    // kitap: ortalama 2,7 verilerden biri değil
    expect(degerler('kitap', 1)).not.toContain(2.7);
  });

  it('öğrenciye dönük metinlerde program dışı terim, simge ve emoji yok', () => {
    const YASAK = [
      /medyan/i, /frekans/i, /\bmod\b/i, /kuramsal/i, /\bzar\b/i, /x̄/, /Σ/, /Δ/, /\bOMS\b/, /uç değer/i, /iki yönlü/i,
      /\p{Extended_Pictographic}/u,
    ];
    for (const o of ORNEK_VERILER) {
      const metinler = [
        o.ad,
        o.aciklama,
        o.aciklamaOzellikli?.metin,
        ...Object.values(o.hikaye).filter((x): x is string => typeof x === 'string'),
        ...o.rehber.flatMap((a) => [a.baslik, a.soru, a.cevap, a.eylem?.etiket, a.yedekEylem?.etiket]),
        ...Object.values(o.sekmeIpucu ?? {}),
        ...Object.values(o.sekmeIpucuOzellikli ?? {}).map((m) => m?.metin),
      ].filter((x): x is string => typeof x === 'string');
      for (const m of metinler) for (const y of YASAK) expect(m, `${o.id}: ${y}`).not.toMatch(y);
      // Öğretmen notunda da doğrulanmamış "ders kitabındaki örnek" iddiası yok
      expect(`${o.ogretmenNotu ?? ''} ${o.kaynak.not ?? ''}`, o.id).not.toMatch(/ders kitabındaki örnek/i);
      // Akıllı tahta dokunmatik: fare dili yok ("üzerine gel", "fareyle")
      for (const m of metinler) expect(m, o.id).not.toMatch(/üzerine gel|fareyle|imleç/i);
    }
  });

  it('öğretmen notları ve kaynaklar yalnız sınıfta işe yarayan bilgi: geliştirme durumu ve kod alan adları yok', () => {
    const GELISTIRME = [
      /gelene kadar/i, /henüz yok/i, /uygulanana kadar/i, /düzeltilmesi gerekir/i, /adımı gerekir/i, /[Uu]ygulama bugün/,
      /yazılmalı/i, /\bkipi\b/i, /\bHTML\b/, /acilis\./, /"grupla"/,
      /\b(yuzdeDegisim|daireSiklik|daireYuvarlama|acilisAralik|kategoriSirasi|sekmeIpucu|varsayilanAcilis)\b/,
    ];
    const AYLAR = 'Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık';
    for (const o of ORNEK_VERILER) {
      const metinler = [o.ogretmenNotu, o.kaynak.ad, o.kaynak.not, o.kaynak.erisim, o.kaynak.urlAd, o.kaynak.url2Ad].filter(
        (x): x is string => typeof x === 'string',
      );
      for (const m of metinler) for (const y of GELISTIRME) expect(m, `${o.id}: ${y}`).not.toMatch(y);
      // Erişim tarihi okunur biçimde: "24 Eylül 2026"
      if (o.kaynak.erisim) expect(o.kaynak.erisim, o.id).toMatch(new RegExp(`^\\d{1,2} (${AYLAR}) \\d{4}$`));
      // İki bağlantılı kaynakta ikisinin de kısa adı var (kartta "MGM: Erzurum · İzmir" gibi)
      if (o.kaynak.url2) expect([o.kaynak.urlAd, o.kaynak.url2Ad].every((a) => !!a && a.length > 1), o.id).toBe(true);
    }
  });

  it('rehber metinleri öğretici: tahmin adımının cevabı gerçek bir cevap; açıklama (şerit) sonucu baştan söylemez', () => {
    for (const o of ORNEK_VERILER) {
      expect(o.rehber[0].cevap, o.id).not.toMatch(/Tahmin serbest|Tahminini not et|cevap verecek|karşılaştıracağız/);
      expect(o.rehber[0].cevap.length, o.id).toBeGreaterThan(30);
    }
    // Açılış şeridi yönlendirir ya da sorar; "Grafikte bul" ve "Aç ve ölç" adımlarının cevabı orada yazmaz
    const SONUC: [string, RegExp][] = [
      ['harcama', /çeyrek|orantılı küçülür/],
      ['kitap', /2,7/],
      ['kardes', /iki tepe değer var/],
      ['ulasim', /Feyza|60|çeker|etkilemez/],
      ['mac', /17|aynı/],
      ['sinav', /70/],
      ['boy', /140|170/],
      ['fide', /hızlanıyor|yavaşlıyor/],
      ['iklim', /dört ay|4 ay/],
      ['calisma', /genellikle artıyor/],
      ['cikolata', /azalıyor|negatif/],
    ];
    for (const [id, desen] of SONUC) {
      const o = ornekBul(id)!;
      for (const m of [o.aciklama, o.aciklamaOzellikli?.metin].filter((x): x is string => !!x)) expect(m, id).not.toMatch(desen);
    }
  });
});
