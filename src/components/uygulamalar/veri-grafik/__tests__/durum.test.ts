// Sahip: C (vg/durum.ts: kalıcılık, veri kümeleri, eksen, sekme kapıları, araştırma alanları ve Deney özeti)
import { describe, expect, it } from 'vitest';
import {
  KUMELER,
  OZELLIKLER,
  bagliOrnek,
  baslangicDurumu,
  durumCoz,
  ornegiYukle,
  ornekBaginiKopar,
  rehberEylemiUygula,
  tabloyuTemizle,
  yapiDegisti,
  durumMetindenCoz,
  eksenDuzelt,
  etkinTablo,
  etkinTabloYaz,
  kumeDegistir,
  kumeEtiketi,
  kumeTablosu,
  oncekiTabloyaDon,
  OZET_EN_AZ_SATIR,
  toplamaKumeleri,
  RENKSIZ,
  sacilimEksenleri,
  sayisalDegiskenSayisi,
  sekmeDuzelt,
  sekmeKullanilabilir,
  SEKMELER,
  tabloAdiBul,
  tabloBosMu,
  tabloDegistir,
  tabloDuzenle,
  varsayilanEksen,
  type Durum,
} from '../durum';
import { degiskenSutunlari } from '../kategorik';
import { arastirmaSutunKimligi, hazirSoruUygula, varsayilanArastirma, type Arastirma, type DeneyCalismasi } from '../arastirma';
import { OZET_SUTUNU, ozetTablosu, varsayilanDeneyPlani } from '../deney';
import { planiUygula } from '../toplamaDurumu';
import {
  TUM_OZELLIKLER,
  hucreYaz,
  izgaradanTablo,
  ornekBul,
  ornekVeriOlustur,
  satirEkle,
  satirSil,
  sutunAdiDegistir,
  sutunEkle,
  sutunIndeksi,
  sutunSil,
  sutunTuruDegistir,
  tabloOlustur,
  tumunuTemizle,
  type VeriTablosu,
} from '../veri';
import { sabitBoy, sabitCalisma, sabitMac, sabitSicaklik } from './sabit-tablolar';

describe('kalıcılık: eski şema, bozuk kayıt ve veri kümeleri', () => {
  it('eski şema: örnekleyicisiz kayıt açılır, Tablom ve görünüm korunur', () => {
    const tablo = tabloOlustur(['Öğrenci', 'Boy'], [['Ali', 150]]);
    const d = durumCoz({ surum: 1, tablo, sekme: 'sutun', degisken: tablo.sutunlar[1].id, aralik: 2, secenekler: { ortalama: true } });
    expect(d).not.toBeNull();
    expect(d!.etkinKume).toBe('tablom');
    expect(d!.tablo.satirlar[0].hucreler).toEqual(['Ali', '150']);
    expect(d!.degisken).toBe(tablo.sutunlar[1].id);
    expect(d!.secenekler).toEqual({ ortalama: true, oms: false, etiketler: false, ortanca: false });
    expect(d!.oncekiTablo).toBeNull();
    expect(d!.toplamaAcik).toBe(false);
  });

  it('bozuk kayıt → null; etkin küme kayıtta yoksa ya da eski örnekleyicininse Tablom; bozuk eski deney tablosu okunmaz', () => {
    expect(durumMetindenCoz('{bozuk')).toBeNull();
    expect(durumMetindenCoz(null)).toBeNull();
    expect(durumCoz({ tablo: 'x' })).toBeNull();
    const d = durumCoz({ tablo: tabloOlustur(['A', 'B'], []), etkinKume: 'deney', deneyTablosu: 5, ornekleyici: 'bozuk' });
    expect(d!.etkinKume).toBe('tablom');
    expect(d!.oncekiTablo).toBeNull();
    expect(durumCoz({ tablo: tabloOlustur(['A'], []), etkinKume: 'bilinmeyen' })!.etkinKume).toBe('tablom');
  });

  it('veri kümeleri yalnız Tablom ve Deney özeti; durumda ve kayıtta eski örnekleyicinin alanları yok', () => {
    expect(KUMELER.map((k) => [k.id, k.ad])).toEqual([
      ['tablom', 'Tablom'],
      ['ozet', 'Deney özeti'],
    ]);
    const d = baslangicDurumu();
    const kayit = JSON.stringify(d);
    for (const alan of ['deneyTablosu', 'olcumTablosu', 'ornekleyici', 'ornekleyiciAcik']) {
      expect(alan in d).toBe(false);
      expect(kayit).not.toContain(`"${alan}"`);
    }
    expect(toplamaKumeleri(d)).toEqual(['tablom']);
  });

  it('küme değiştirme görünümleri saklar ve geri getirir; tablo yazımı Tablom\'a gider, özet salt okunur', () => {
    let d: Durum = { ...baslangicDurumu(), degisken: 'boy' };
    d = kumeDegistir(d, 'ozet');
    expect(d.degisken).toBeNull();
    d = { ...d, degisken: 'oran' };
    d = kumeDegistir(d, 'tablom');
    expect(d.degisken).toBe('boy');
    expect(kumeDegistir(d, 'ozet').degisken).toBe('oran');
    const t = tabloOlustur(['A', 'X'], [['1', 2]]);
    expect(etkinTabloYaz(d, t).tablo).toBe(t);
    const ozette = kumeDegistir(d, 'ozet');
    expect(etkinTabloYaz(ozette, t)).toBe(ozette);
    // Araştırmasız özet satırsızdır
    expect(etkinTablo(ozette).satirlar).toEqual([]);
  });
});

describe('durum: eksen hep seçili (varsayılan değişken)', () => {
  it('varsayılan: tabloda ilk sayısal, yoksa ilk kategorik; değişken yoksa boş', () => {
    const sicaklik = sabitSicaklik();
    expect(varsayilanEksen(sicaklik, 'tablom')).toBe(sicaklik.sutunlar[1].id);
    const mac = sabitMac();
    expect(varsayilanEksen(mac, 'tablom')).toBe(mac.sutunlar[1].id);
    // Yalnız kategorik değişken: tekrar eden ilk sütun kategoriktir
    const renk = { ...tabloOlustur(['Renk'], [['Mavi'], ['Kırmızı'], ['Mavi']]) };
    expect(varsayilanEksen(renk, 'tablom')).toBe(renk.sutunlar[0].id);
    expect(varsayilanEksen(tabloOlustur(['Ad'], [['A'], ['B']]), 'tablom')).toBeNull();
  });

  it('eksenDuzelt: boş ya da silinmiş eksen varsayılana döner, geçerli eksen korunur', () => {
    const d = baslangicDurumu();
    expect(d.degisken).toBeNull();
    const e = eksenDuzelt(d);
    expect(e.degisken).toBe(d.tablo.sutunlar[1].id);
    expect(eksenDuzelt(e)).toBe(e);
    // Eksen ikinci sayısal sütundayken o sütun silinirse ilk sayısala döner; aralık ve sütun modu sıfırlanır,
    // eksenle aynı kalan karşılaştırma kalkar
    const t2 = sutunEkle(e.tablo, 'Kilo');
    const f: Durum = { ...e, tablo: t2, degisken: t2.sutunlar[2].id, ikinciDegisken: t2.sutunlar[1].id, aralik: 5, sutunModu: true };
    expect(eksenDuzelt(f)).toBe(f);
    const g = eksenDuzelt({ ...f, tablo: sutunSil(t2, 2) });
    expect(g.degisken).toBe(t2.sutunlar[1].id);
    expect(g.aralik).toBeNull();
    expect(g.sutunModu).toBe(false);
    expect(g.ikinciDegisken).toBeNull();
    // Değişkeni olmayan tabloda eksen boş kalır
    expect(eksenDuzelt({ ...e, tablo: tabloOlustur(['Ad'], [['A']]) }).degisken).toBeNull();
  });
});

describe('durum: saçılım grafiği ve veri türüne göre sekmeler', () => {
  it('çizgi en az bir, saçılım en az iki sayısal değişken ister', () => {
    expect(sekmeKullanilabilir('nokta', 0)).toBe(true);
    expect(sekmeKullanilabilir('cizgi', 0)).toBe(false);
    expect(sekmeKullanilabilir('cizgi', 1)).toBe(true);
    expect(sekmeKullanilabilir('sacilim', 1)).toBe(false);
    expect(sekmeKullanilabilir('sacilim', 2)).toBe(true);
  });

  it('saçılım eksenleri: x seçili değişken (kategorikse ilk sayısal), y ayrı seçim ya da sıradaki sayısal', () => {
    const mac = sabitMac();
    const [, selma, yasemin] = mac.sutunlar.map((s) => s.id);
    expect(sacilimEksenleri({ degisken: selma, yDegisken: null }, mac)).toEqual({ x: selma, y: yasemin, renk: null });
    expect(sacilimEksenleri({ degisken: yasemin, yDegisken: null }, mac)).toEqual({ x: yasemin, y: selma, renk: null });
    // y, x ile aynıysa sıradaki sayısal değişkene düşer
    expect(sacilimEksenleri({ degisken: selma, yDegisken: selma }, mac)).toEqual({ x: selma, y: yasemin, renk: null });
    // Tek sayısal değişkende saçılım yok
    expect(sacilimEksenleri({ degisken: null, yDegisken: null }, sabitBoy())).toBeNull();
    // Kaydedilmiş sekme ve dikey eksen okunur; geçersiz dikey eksen eksenDuzelt ile kalkar
    const d = durumCoz({ surum: 1, tablo: mac, sekme: 'sacilim', degisken: selma, yDegisken: yasemin })!;
    expect(d.sekme).toBe('sacilim');
    expect(d.yDegisken).toBe(yasemin);
    expect(eksenDuzelt({ ...d, yDegisken: 'yok' }).yDegisken).toBeNull();
    expect(eksenDuzelt({ ...d, yDegisken: mac.sutunlar[0].id }).yDegisken).toBeNull();
  });
});

describe('saçılım: kategorik değişkene göre renk', () => {
  it('varsayılan ilk kategorik değişken; "renksiz" seçilebilir; geçersiz seçim otomatiğe döner', () => {
    const t = sabitCalisma();
    const [, sinif, calisma, puan] = t.sutunlar.map((s) => s.id);
    // Örneğin önerilen grafiği (calisma → saçılım) beklentisi ornekler.test.tsx'e taşındı
    expect(sacilimEksenleri({ degisken: null, yDegisken: null }, t)).toEqual({ x: calisma, y: puan, renk: sinif });
    expect(sacilimEksenleri({ degisken: null, yDegisken: null, renkDegisken: RENKSIZ }, t)!.renk).toBeNull();
    expect(sacilimEksenleri({ degisken: null, yDegisken: null, renkDegisken: 'yok-boyle-sutun' }, t)!.renk).toBe(sinif);
    const d: Durum = { ...eksenDuzelt({ ...baslangicDurumu(), tablo: t }), renkDegisken: 'yok-boyle-sutun' };
    expect(eksenDuzelt(d).renkDegisken).toBeNull();
    expect(eksenDuzelt({ ...d, renkDegisken: RENKSIZ }).renkDegisken).toBe(RENKSIZ);
    expect(eksenDuzelt({ ...d, renkDegisken: puan }).renkDegisken).toBeNull();
    // Eski kayıttaki sacilimRenk alanı renk anahtarı olarak okunur
    const eski = durumCoz({ surum: 1, tablo: t, sacilimRenk: RENKSIZ })!;
    expect(eski.renkDegisken).toBe(RENKSIZ);
  });
});

describe('sekmeDuzelt: seçili sekme hep çizilebilir (M29)', () => {
  const mac = sabitMac(); // Maç | Selma | Yasemin: iki sayısal değişken
  const boy = sabitBoy(); // Öğrenci | Boy (cm): bir sayısal değişken
  const renk = tabloOlustur(['Renk'], [['Mavi'], ['Kırmızı'], ['Mavi']]); // sayısal değişken yok

  it('Saçılım + 1 sayısal → Nokta; Çizgi + 0 sayısal → Nokta; 2 sayısalda değişmez (aynı nesne)', () => {
    const d = baslangicDurumu();
    expect(sekmeDuzelt({ ...d, tablo: boy, sekme: 'sacilim' }).sekme).toBe('nokta');
    expect(sekmeDuzelt({ ...d, tablo: renk, sekme: 'cizgi' }).sekme).toBe('nokta');
    expect(sekmeDuzelt({ ...d, tablo: boy, sekme: 'cizgi' }).sekme).toBe('cizgi');
    const iki: Durum = { ...d, tablo: mac, sekme: 'sacilim' };
    expect(sekmeDuzelt(iki)).toBe(iki);
    // Kapısı olmayan sekmeler her tabloda kalır
    for (const s of ['nokta', 'sutun', 'daire', 'istatistik'] as const) expect(sekmeDuzelt({ ...d, tablo: renk, sekme: s }).sekme).toBe(s);
  });

  it('sayım araç çubuğundaki kapıyla aynı: sayısal değişken sütunları (kategorik ve ad sütunları sayılmaz)', () => {
    for (const t of [mac, boy, renk, sabitCalisma(), sabitSicaklik()]) {
      const sayi = degiskenSutunlari(t).filter((s) => s.tur === 'sayi').length;
      expect(sayisalDegiskenSayisi(t)).toBe(sayi);
      for (const s of SEKMELER) {
        const d = sekmeDuzelt({ ...baslangicDurumu(), tablo: t, sekme: s.id });
        // Düzeltilmiş sekme araç çubuğunda her zaman etkindir
        expect(sekmeKullanilabilir(d.sekme, sayi)).toBe(true);
      }
    }
    expect(sayisalDegiskenSayisi(mac)).toBe(2);
    expect(sayisalDegiskenSayisi(boy)).toBe(1);
    expect(sayisalDegiskenSayisi(renk)).toBe(0);
  });

  it('sütun silinince (Saçılım için ikinci sayısal kalmayınca) Nokta', () => {
    const d = eksenDuzelt({ ...baslangicDurumu(), tablo: mac, sekme: 'sacilim' });
    const silindi = sekmeDuzelt(eksenDuzelt({ ...d, tablo: sutunSil(mac, 2) }));
    expect(silindi.sekme).toBe('nokta');
  });
});

describe('tablo güvenliği: tabloDegistir, oncekiTabloyaDon, tabloDuzenle (M23)', () => {
  /** Kullanıcının kendi (örnekle bağı olmayan) dolu tablosu */
  const kullanici = (): Durum =>
    eksenDuzelt({
      ...baslangicDurumu(),
      tablo: sabitMac(),
      tabloAdi: null,
      ornekId: null,
      ornekTemiz: false,
      sekme: 'cizgi',
      secenekler: { ortalama: true, oms: false, etiketler: false },
    });

  it('açılış durumu değiştirilmemiş açılış örneğidir; önceki tablo yok', () => {
    const d = baslangicDurumu();
    expect(d.ornekId).toBe('boy');
    expect(d.ornekTemiz).toBe(true);
    expect(d.tabloAdi).toBeTruthy();
    expect(d.oncekiTablo).toBeNull();
  });

  it('dolu kullanıcı tablosu görünümüyle önceki tabloya gider; yeni tablo Tablom olur', () => {
    const d = kullanici();
    const yeniTablo = sabitBoy();
    const { durum, onceki } = tabloDegistir(d, { tablo: yeniTablo, ad: 'Sınıfın boy uzunlukları', ornekId: 'boy', gorunum: { sekme: 'nokta' } });
    expect(onceki).toBe(d);
    expect(durum.tablo).toBe(yeniTablo);
    expect(durum.tabloAdi).toBe('Sınıfın boy uzunlukları');
    expect(durum.ornekId).toBe('boy');
    expect(durum.ornekTemiz).toBe(true);
    expect(durum.sekme).toBe('nokta');
    // Verilmeyen eksen alanları boş (eksenDuzelt yeni tabloya göre atar), seçenekler olduğu gibi
    expect(durum.degisken).toBeNull();
    expect(durum.secenekler).toEqual(d.secenekler);
    expect(durum.oncekiTablo?.tablo).toBe(d.tablo);
    expect(durum.oncekiTablo?.ad).toBe('Selma');
    expect(durum.oncekiTablo?.gorunum).toMatchObject({ degisken: d.degisken, sekme: 'cizgi', secenekler: { ortalama: true } });
    expect(durum.oncekiTablo?.ornekId).toBeNull();
  });

  it('değiştirilmemiş örnek, boş tablo ve aynı içerik saklanmaz (önceki tablo olduğu gibi kalır)', () => {
    const eski = kullanici();
    const bir = tabloDegistir(eski, { tablo: sabitBoy(), ad: 'Boy', ornekId: 'boy' }).durum;
    const saklanan = bir.oncekiTablo;
    expect(saklanan).not.toBeNull();
    // Şimdiki tablo temiz örnek: ikinci örnek yüklemesi önceki tabloyu (kullanıcının tablosu) ezmez
    const iki = tabloDegistir(bir, { tablo: sabitSicaklik(), ad: 'Sıcaklık', ornekId: 'sicaklik' }).durum;
    expect(iki.oncekiTablo).toBe(saklanan);
    // Boş tablo saklanmaz
    const bos: Durum = { ...eski, tablo: tumunuTemizle(eski.tablo), oncekiTablo: null };
    expect(tabloBosMu(bos.tablo)).toBe(true);
    expect(tabloDegistir(bos, { tablo: sabitBoy(), ad: 'Boy' }).durum.oncekiTablo).toBeNull();
    // Hücreleri boş satırlar da boş sayılır
    expect(tabloBosMu(tabloOlustur(['A', 'B'], [['', ''], [' ', '']]))).toBe(true);
    // İçerikçe aynı tablo (kimlikler farklı) saklanmaz
    expect(tabloDegistir({ ...eski, oncekiTablo: null }, { tablo: sabitMac(), ad: 'Maç' }).durum.oncekiTablo).toBeNull();
  });

  it('düzenlenmiş örnek (tabloDuzenle) korunmaya değer: saklanır', () => {
    const d = baslangicDurumu();
    const duzenli = tabloDuzenle(d, hucreYaz(d.tablo, 0, 1, '999'));
    expect(duzenli.ornekTemiz).toBe(false);
    expect(duzenli.ornekId).toBe('boy');
    const y = tabloDegistir(duzenli, { tablo: sabitMac(), ad: 'Maç', ornekId: 'mac' }).durum;
    expect(y.oncekiTablo?.tablo).toBe(duzenli.tablo);
    expect(y.oncekiTablo?.ornekId).toBe('boy');
    expect(y.oncekiTablo?.ornekTemiz).toBe(false);
  });

  it('tabloDuzenle: yalnız Tablom değişince örnek bağı "temiz" olmaktan çıkar; aynı tabloda ve özette durum aynı kalır', () => {
    const d = baslangicDurumu();
    expect(tabloDuzenle(d, d.tablo).ornekTemiz).toBe(true);
    const ozette = kumeDegistir(d, 'ozet');
    const t = tabloOlustur(['Deney', 'Oran'], [['1. deney (1)', '100']]);
    expect(tabloDuzenle(ozette, t)).toBe(ozette);
    expect(tabloDuzenle(d, hucreYaz(d.tablo, 0, 1, '151')).ornekTemiz).toBe(false);
  });

  it('oncekiTabloyaDon: yer değiştirir; iki kez uygulanınca başa döner', () => {
    const eski = kullanici();
    const a = tabloDegistir(eski, { tablo: sabitBoy(), ad: 'Sınıfın boy uzunlukları', ornekId: 'boy', gorunum: { sekme: 'nokta' } }).durum;
    const b = oncekiTabloyaDon(a);
    expect(b.tablo).toBe(eski.tablo);
    expect(b.sekme).toBe('cizgi');
    expect(b.degisken).toBe(eski.degisken);
    expect(b.secenekler).toEqual(eski.secenekler);
    expect(b.ornekId).toBeNull();
    expect(b.oncekiTablo?.tablo).toBe(a.tablo);
    expect(b.oncekiTablo?.ornekId).toBe('boy');
    const c = oncekiTabloyaDon(b);
    expect(c.tablo).toBe(a.tablo);
    expect(c).toEqual(a);
    // Önceki tablo yoksa durum değişmez
    const yok = baslangicDurumu();
    expect(oncekiTabloyaDon(yok)).toBe(yok);
  });

  it('oncekiTabloyaDon: şimdiki tablo boşsa saklanmaz', () => {
    const a = tabloDegistir(kullanici(), { tablo: tumunuTemizle(sabitBoy()), ad: 'Boş' }).durum;
    const b = oncekiTabloyaDon(a);
    expect(b.tablo.satirlar.length).toBeGreaterThan(0);
    expect(b.oncekiTablo).toBeNull();
  });

  it('tablo adı: örnek adı; kendi tablonuzda ilk değişkenin adı', () => {
    expect(tabloAdiBul({ tablo: sabitBoy(), tabloAdi: 'Sınıfın boy uzunlukları' })).toBe('Sınıfın boy uzunlukları');
    expect(tabloAdiBul({ tablo: sabitBoy(), tabloAdi: null })).toBe('Boy (cm)');
    expect(tabloAdiBul({ tablo: tabloOlustur(['Ad'], [['A']]), tabloAdi: null })).toBe('Ad');
  });
});

describe('durumCoz: tablo güvenliği alanları', () => {
  it('JSON gidiş-dönüşü: önceki tablo, tablo adı ve örnek bağı korunur', () => {
    const eski = eksenDuzelt({ ...baslangicDurumu(), tablo: sabitMac(), tabloAdi: null, ornekId: null, ornekTemiz: false });
    const d = tabloDegistir(eski, { tablo: ornekVeriOlustur('boy'), ad: 'Sınıfın boy uzunlukları', ornekId: 'boy' }).durum;
    const geri = durumMetindenCoz(JSON.stringify(d))!;
    expect(geri.tabloAdi).toBe('Sınıfın boy uzunlukları');
    expect(geri.ornekId).toBe('boy');
    expect(geri.ornekTemiz).toBe(true);
    expect(geri.oncekiTablo).toEqual(d.oncekiTablo);
    expect(oncekiTabloyaDon(geri).tablo).toEqual(eski.tablo);
  });

  it('eski kayıt (alanlar yok): Tablom kullanıcının tablosu sayılır; bozuk önceki tablo → null', () => {
    const tablo = tabloOlustur(['Öğrenci', 'Boy'], [['Ali', 150]]);
    const d = durumCoz({ surum: 1, tablo })!;
    expect(d.oncekiTablo).toBeNull();
    expect(d.tabloAdi).toBeNull();
    expect(d.ornekId).toBeNull();
    expect(d.ornekTemiz).toBe(false);
    expect(durumCoz({ surum: 1, tablo, oncekiTablo: { tablo: 'bozuk', ad: 'x' } })!.oncekiTablo).toBeNull();
    expect(durumCoz({ surum: 1, tablo, oncekiTablo: 5 })!.oncekiTablo).toBeNull();
    // Görünümü bozuk önceki tablo yine açılır; ad yoksa "Önceki tablo"; uzun ad kırpılır
    const o = durumCoz({ surum: 1, tablo, oncekiTablo: { tablo, gorunum: { sekme: 'yok', secenekler: 'x' } }, tabloAdi: `  ${'a'.repeat(200)}  ` })!;
    expect(o.oncekiTablo?.ad).toBe('Önceki tablo');
    expect(o.oncekiTablo?.gorunum.sekme).toBeUndefined();
    expect(o.oncekiTablo?.gorunum.degisken).toBeNull();
    expect(o.tabloAdi).toHaveLength(80);
  });
});

// ── C-1 madde 15: araştırma alanları, Deney özeti kümesi, bütün görünümle küme değişimi ──

/**
 * Madenî para deneyi araştırması ve Tablom'u: iki simülasyon çalışması (4 ve 2 atış), [Para, Deney] sütunları.
 * Özet: 1. deney 4 atışta 3 tura (%75), 2. deney 2 atışta 1 tura (%50); teorik %50.
 */
function paraDeneyi(teorikGoster = true): { arastirma: Arastirma; tablo: VeriTablosu } {
  const a = varsayilanArastirma();
  const s0 = arastirmaSutunKimligi(a.kimlik, 's0');
  const deney = arastirmaSutunKimligi(a.kimlik, 'deney');
  const calismalar: DeneyCalismasi[] = [
    { no: 1, etiket: '1. deney (4)', n: 4, sayilar: {}, tabloda: true, gercek: false },
    { no: 2, etiket: '2. deney (2)', n: 2, sayilar: {}, tabloda: true, gercek: false },
  ];
  const arastirma: Arastirma = {
    ...a,
    soru: 'Para atınca tura gelme olasılığı nedir?',
    yontem: 'deney',
    adim: 'topla',
    deney: { ...varsayilanDeneyPlani(), nesne: 'para', teorikGoster, calismalar },
    sutunlar: { s0, deney },
  };
  const satirlar = [
    ['Tura', '1. deney (4)'],
    ['Yazı', '1. deney (4)'],
    ['Tura', '1. deney (4)'],
    ['Tura', '1. deney (4)'],
    ['Yazı', '2. deney (2)'],
    ['Tura', '2. deney (2)'],
  ];
  const tablo: VeriTablosu = {
    sutunlar: [
      { id: s0, ad: 'Para', tur: 'etiket' },
      { id: deney, ad: 'Deney', tur: 'etiket' },
    ],
    satirlar: satirlar.map((hucreler, i) => ({ id: `r${i}`, hucreler })),
  };
  return { arastirma, tablo };
}

/** Deney araştırmasına bağlı, Tablom'da duran durum (kullanıcının kendi verisi; örnekle bağı yok) */
function deneyDurumu(teorikGoster = true): Durum {
  const { arastirma, tablo } = paraDeneyi(teorikGoster);
  return eksenDuzelt({ ...baslangicDurumu(), tablo, arastirma, toplamaAcik: true, tabloAdi: null, ornekId: null, ornekTemiz: false, ipucu: 'kapali' });
}

/** "Özeti Çizgi grafiğinde göster" görünümü (VT §7) */
const OZET_GORUNUMU = { degisken: OZET_SUTUNU.oran, ikinciDegisken: OZET_SUTUNU.teorik, sekme: 'cizgi' as const, renkDegisken: RENKSIZ };

describe('durum: araştırma alanları (C-1 madde 15)', () => {
  it('başlangıç durumunda yeni alanlar dolu; Deney özeti kümelerde', () => {
    const d = baslangicDurumu();
    expect(d.arastirma).toBeNull();
    expect(d.toplamaAcik).toBe(false);
    expect(d.ipucu).toBe('serit');
    expect(d.daireModu).toBeNull();
    expect(d.secenekler).toEqual({ ortalama: false, oms: false, etiketler: false, ortanca: false });
    expect(KUMELER.find((k) => k.id === 'ozet')?.ad).toBe('Deney özeti');
  });

  it('JSON gidiş-dönüşü: araştırma, panel, ipucu, daire modu ve ortanca korunur', () => {
    const d: Durum = { ...deneyDurumu(), ipucu: 'kart', daireModu: 'siklik', secenekler: { ortalama: true, oms: false, etiketler: false, ortanca: true } };
    const geri = durumMetindenCoz(JSON.stringify(d))!;
    expect(geri.arastirma).toEqual(d.arastirma);
    expect(geri.toplamaAcik).toBe(true);
    expect(geri.ipucu).toBe('kart');
    expect(geri.daireModu).toBe('siklik');
    expect(geri.secenekler.ortanca).toBe(true);
    expect(geri.tablo).toEqual(d.tablo);
  });

  it('bozuk araştırma → null; onarılabilir araştırma onarılır; bozuk JSON → null (hata atmaz)', () => {
    const tablo = sabitBoy();
    for (const bozuk of [5, 'araştırma', null, true]) expect(durumCoz({ surum: 1, tablo, arastirma: bozuk })!.arastirma).toBeNull();
    const onarilan = durumCoz({ surum: 1, tablo, arastirma: { soru: 'a'.repeat(500), yontem: 'bilinmeyen', adim: 'topla' } })!.arastirma!;
    expect(onarilan.soru).toHaveLength(140);
    expect(onarilan.yontem).toBeNull();
    expect(onarilan.adim).toBe('soru');
    expect(durumMetindenCoz('{"surum":1,"tablo":')).toBeNull();
    expect(() => durumCoz({ surum: 1, tablo, arastirma: { deney: 'x', anket: [], sutunlar: 7 } })).not.toThrow();
  });

  it('eksik ya da geçersiz yeni alanlar varsayılana döner; eski panelin açık bilgisi okunur', () => {
    const tablo = sabitBoy();
    const eski = durumCoz({ surum: 1, tablo })!;
    expect(eski.arastirma).toBeNull();
    expect(eski.toplamaAcik).toBe(false);
    expect(eski.daireModu).toBeNull();
    // İpucu kayıtta yoksa: kendi tablonuzda kapalı, örneğe bağlı tabloda şerit
    expect(eski.ipucu).toBe('kapali');
    expect(durumCoz({ surum: 1, tablo, ornekId: 'boy' })!.ipucu).toBe('serit');
    expect(durumCoz({ surum: 1, tablo, ornekId: 'boy', ipucu: 'acik' })!.ipucu).toBe('serit');
    expect(durumCoz({ surum: 1, tablo, ipucu: 'kart' })!.ipucu).toBe('kart');
    // Daire modu yalnız kullanıcı seçimidir: 'uygunDegil' örnekten gelir, saklanmaz
    expect(durumCoz({ surum: 1, tablo, daireModu: 'uygunDegil' })!.daireModu).toBeNull();
    expect(durumCoz({ surum: 1, tablo, daireModu: 'satir' })!.daireModu).toBe('satir');
    // Göç: eski örnekleyici açık kaydedildiyse Veri topla paneli açık gelir (eski sürüm toplamaAcik'i false yazıyordu)
    expect(durumCoz({ surum: 1, tablo, ornekleyiciAcik: true })!.toplamaAcik).toBe(true);
    expect(durumCoz({ surum: 1, tablo, ornekleyiciAcik: true, toplamaAcik: false })!.toplamaAcik).toBe(true);
    expect(durumCoz({ surum: 1, tablo, ornekleyiciAcik: false, toplamaAcik: true })!.toplamaAcik).toBe(true);
    expect(durumCoz({ surum: 1, tablo, ornekleyiciAcik: false, toplamaAcik: false })!.toplamaAcik).toBe(false);
    expect(durumCoz({ surum: 1, tablo, toplamaAcik: 'evet' })!.toplamaAcik).toBe(false);
  });
});

describe("Deney özeti kümesi ('ozet'): türetilmiş ve salt okunur", () => {
  it('etkinTablo = ozetTablosu(Tablom, araştırma); aynı girdide aynı nesne', () => {
    const d = kumeDegistir(deneyDurumu(), 'ozet');
    const ozet = etkinTablo(d);
    expect(ozet).toEqual(ozetTablosu(d.tablo, d.arastirma));
    expect(ozet.satirlar.map((r) => r.hucreler)).toEqual([
      ['1. deney (4)', '4', '3', '75', '50'],
      ['2. deney (2)', '2', '1', '50', '50'],
    ]);
    expect(etkinTablo(d)).toBe(ozet);
    expect(kumeTablosu(d, 'ozet')).toBe(ozet);
    // Tablom (atışlar) etkin kümede değilken de özetin kaynağıdır
    expect(kumeTablosu(d, 'tablom')).toBe(d.tablo);
    // Tablom'da elle silinen atış özete yansır
    const silindi: Durum = { ...d, tablo: satirSil(d.tablo, 0) };
    expect(etkinTablo(silindi).satirlar[0].hucreler.slice(0, 4)).toEqual(['1. deney (4)', '3', '2', '66,7']);
    // Araştırma yoksa özet satırsızdır
    expect(kumeTablosu({ ...d, arastirma: null }, 'ozet')!.satirlar).toEqual([]);
  });

  it('etkinTabloYaz ve tabloDuzenle özette durumu değiştirmez', () => {
    const d = kumeDegistir(deneyDurumu(), 'ozet');
    const baska = tabloOlustur(['A'], [['1']]);
    expect(etkinTabloYaz(d, baska)).toBe(d);
    expect(tabloDuzenle(d, baska)).toBe(d);
    expect(tabloDuzenle(d, tumunuTemizle(etkinTablo(d)))).toBe(d);
  });

  it('varsayılan eksen göreli sıklık; teorik olasılık gösterilmiyorsa karşılaştırma kalkar', () => {
    const d = deneyDurumu();
    expect(varsayilanEksen(ozetTablosu(d.tablo, d.arastirma), 'ozet')).toBe(OZET_SUTUNU.oran);
    // Araştırmasız (satırsız) özette de sütunlar kurulur, eksen göreli sıklıktadır
    expect(varsayilanEksen(ozetTablosu(d.tablo, null), 'ozet')).toBe(OZET_SUTUNU.oran);
    expect(eksenDuzelt(kumeDegistir(d, 'ozet')).degisken).toBe(OZET_SUTUNU.oran);
    const teorikli = eksenDuzelt(kumeDegistir(d, 'ozet', OZET_GORUNUMU));
    expect(teorikli.ikinciDegisken).toBe(OZET_SUTUNU.teorik);
    expect(teorikli.renkDegisken).toBe(RENKSIZ);
    const teoriksiz = eksenDuzelt(kumeDegistir(deneyDurumu(false), 'ozet', OZET_GORUNUMU));
    expect(teoriksiz.degisken).toBe(OZET_SUTUNU.oran);
    expect(teoriksiz.ikinciDegisken).toBeNull();
  });

  it('sekme kapısı özetin tablosuna bakar: Çizgi ve Saçılım çizilebilir', () => {
    const d = kumeDegistir(deneyDurumu(), 'ozet');
    expect(sayisalDegiskenSayisi(etkinTablo(d))).toBeGreaterThanOrEqual(3);
    for (const s of ['cizgi', 'sacilim'] as const) {
      const e = { ...d, sekme: s };
      expect(sekmeDuzelt(e)).toBe(e);
    }
    // Atışlar tablosunda (yalnız kategorik) Çizgi çizilemez
    expect(sekmeDuzelt({ ...deneyDurumu(), sekme: 'cizgi' }).sekme).toBe('nokta');
  });
});

describe('kumeDegistir: bütün görünüm saklanır ve geri gelir (GorunumTam)', () => {
  /** Atışlar tablosunda öğretmenin kurduğu görünüm */
  const tablomda = (): Durum => {
    const d = deneyDurumu();
    return { ...d, sekme: 'sutun', secenekler: { ortalama: false, oms: false, etiketler: true, ortanca: false }, sutunModu: true, aralik: 2, renkDegisken: d.tablo.sutunlar[0].id };
  };

  it("Özeti Çizgi'de göster → Atışlar'a dön → yeniden özet: iki görünüm de aynen gelir", () => {
    const d = tablomda();
    const ozet = kumeDegistir(d, 'ozet', OZET_GORUNUMU);
    expect(ozet.etkinKume).toBe('ozet');
    expect(ozet).toMatchObject({ sekme: 'cizgi', degisken: OZET_SUTUNU.oran, ikinciDegisken: OZET_SUTUNU.teorik, renkDegisken: RENKSIZ, aralik: null, sutunModu: false });
    // Seçenekler saklı görünüm yoksa olduğu gibi kalır
    expect(ozet.secenekler).toBe(d.secenekler);
    const geri = kumeDegistir(ozet, 'tablom');
    expect(geri.etkinKume).toBe('tablom');
    expect(geri).toMatchObject({ sekme: 'sutun', degisken: d.degisken, ikinciDegisken: d.ikinciDegisken, aralik: 2, sutunModu: true, renkDegisken: d.renkDegisken, yDegisken: d.yDegisken });
    expect(geri.secenekler).toEqual(d.secenekler);
    const tekrar = kumeDegistir({ ...geri, secenekler: { ...geri.secenekler, ortalama: true } }, 'ozet');
    expect(tekrar).toMatchObject({ sekme: 'cizgi', degisken: OZET_SUTUNU.oran, ikinciDegisken: OZET_SUTUNU.teorik, renkDegisken: RENKSIZ });
    // Özetin saklı seçenekleri geri gelir (Tablom'da sonradan açılan ortalama özete taşınmaz)
    expect(tekrar.secenekler.ortalama).toBe(false);
  });

  it('saklı görünümü olmayan kümede eksen boş ve sütun modu kapalı; aynı kümede yalnız verilen alanlar değişir', () => {
    const d = tablomda();
    const ozet = kumeDegistir(d, 'ozet');
    expect(ozet).toMatchObject({ degisken: null, ikinciDegisken: null, aralik: null, sutunModu: false, sekme: 'sutun', renkDegisken: d.renkDegisken });
    const ayni = kumeDegistir(d, 'tablom', { aralik: 5 });
    expect(ayni).toMatchObject({ etkinKume: 'tablom', aralik: 5, degisken: d.degisken, sutunModu: true, sekme: 'sutun' });
  });

  it('JSON gidiş-dönüşü: özet etkinken Tablom görünümü saklı kalır', () => {
    const ozet = kumeDegistir(tablomda(), 'ozet', OZET_GORUNUMU);
    const geri = durumMetindenCoz(JSON.stringify(ozet))!;
    expect(geri.etkinKume).toBe('ozet');
    expect(geri).toMatchObject({ sekme: 'cizgi', degisken: OZET_SUTUNU.oran, ikinciDegisken: OZET_SUTUNU.teorik, renkDegisken: RENKSIZ });
    expect(etkinTablo(geri).satirlar).toHaveLength(2);
    expect(kumeDegistir(geri, 'tablom')).toMatchObject({ sekme: 'sutun', aralik: 2, sutunModu: true });
  });

  it('durumCoz: Deney özeti yalnız deney araştırmasıyla açılır; değilse Tablom ve onun saklı görünümü', () => {
    const tablo = sabitBoy();
    const boyId = tablo.sutunlar[1].id;
    const kayit = {
      surum: 1,
      tablo,
      etkinKume: 'ozet',
      sekme: 'cizgi',
      degisken: OZET_SUTUNU.oran,
      gorunumler: { tablom: { degisken: boyId, ikinciDegisken: null, aralik: 2, sekme: 'sutun', sutunModu: true } },
    };
    for (const arastirma of [undefined, null, { ...varsayilanArastirma(), yontem: 'anket' }]) {
      const d = durumCoz({ ...kayit, arastirma })!;
      expect(d.etkinKume).toBe('tablom');
      expect(d).toMatchObject({ degisken: boyId, aralik: 2, sekme: 'sutun', sutunModu: true });
    }
    const deneyli = durumCoz({ ...kayit, arastirma: paraDeneyi().arastirma })!;
    expect(deneyli.etkinKume).toBe('ozet');
    expect(deneyli.degisken).toBe(OZET_SUTUNU.oran);
    expect(deneyli.gorunumler.tablom).toMatchObject({ degisken: boyId, sekme: 'sutun', sutunModu: true });
    // Eski kayıttaki saklı görünüm yalnız eksen atamasıdır: sekme olduğu gibi kalır
    const eski = durumCoz({ surum: 1, tablo, etkinKume: 'deney', sekme: 'istatistik', gorunumler: { tablom: { degisken: boyId } } })!;
    expect(eski).toMatchObject({ etkinKume: 'tablom', sekme: 'istatistik', degisken: boyId });
  });

  it("tabloDegistir özetteyken Tablom'a geçer; önceki tablonun görünümü Tablom'unkidir", () => {
    const d = tablomda();
    const ozet = kumeDegistir(d, 'ozet', OZET_GORUNUMU);
    const y = tabloDegistir(ozet, { tablo: sabitBoy(), ad: 'Boy', ornekId: 'boy' }).durum;
    expect(y.etkinKume).toBe('tablom');
    expect(y.gorunumler.ozet).toMatchObject({ sekme: 'cizgi', degisken: OZET_SUTUNU.oran });
    expect(y.oncekiTablo?.tablo).toBe(d.tablo);
    expect(y.oncekiTablo?.gorunum).toMatchObject({ sekme: 'sutun', aralik: 2, sutunModu: true, degisken: d.degisken });
    // Önceki tabloya dönünce atışlar Tablom görünümüyle gelir
    expect(oncekiTabloyaDon(y)).toMatchObject({ tablo: d.tablo, sekme: 'sutun', aralik: 2, sutunModu: true });
  });
});

// ── C-2: örneklerin bağlanması (ornegiYukle, bağın kopması, rehber eylemleri, özellik kümesi) ──

/** Kullanıcının kendi (örnekle bağı olmayan) dolu tablosu; ölçüler açık, sütun modunda */
const kendiTablom = (): Durum => ({
  ...eksenDuzelt({ ...baslangicDurumu(), tablo: sabitMac(), tabloAdi: null, ornekId: null, ornekTemiz: false, ipucu: 'kapali' }),
  sekme: 'cizgi',
  secenekler: { ortalama: true, oms: true, etiketler: true, ortanca: false },
  sutunModu: true,
  aralik: 3,
  daireModu: 'siklik',
});

/** Örneği yükler; yüklenemezse test düşer */
function yukle(d: Durum, id: string): Durum {
  const y = ornegiYukle(d, id);
  expect(y).not.toBeNull();
  return eksenDuzelt(y!.durum);
}

const sutunKimligi = (t: VeriTablosu, ad: string) => t.sutunlar.find((s) => s.ad === ad)!.id;

describe('özellik kümesi (OZELLIKLER)', () => {
  it("C-2 ve C-3'te bağlananlar içinde; ertelenen dengele hiç yok; hepsi bilinen özellik", () => {
    for (const o of ['acilisAralik', 'kategoriSirasi', 'yuzdeDegisim', 'terimler'] as const) expect(OZELLIKLER.has(o)).toBe(true);
    // C-3: Ortanca düğmesi, gruplara ayırma, daire sıklığı / bilgi kutusu, daire yuvarlaması
    for (const o of ['ortanca', 'grupla', 'daireSiklik', 'daireYuvarlama'] as const) expect(OZELLIKLER.has(o)).toBe(true);
    expect(OZELLIKLER.has('dengele')).toBe(false);
    for (const o of OZELLIKLER) expect(TUM_OZELLIKLER).toContain(o);
    // Sonunda dengele dışında hepsi
    expect([...OZELLIKLER].sort()).toEqual(TUM_OZELLIKLER.filter((o) => o !== 'dengele').sort());
  });

  it("grupla: sinav açılışında karşılaştırma Sınıf'a göre gruplar; yedek eylem yerine Ortalama ve sapma eylemi", () => {
    const sinav = yukle(kendiTablom(), 'sinav');
    expect(sinav.ikinciDegisken).toBe(sutunKimligi(sinav.tablo, 'Sınıf'));
    expect(sinav.degisken).toBe(sutunKimligi(sinav.tablo, 'Puan'));
    const { durum } = rehberEylemiUygula(sinav, ornekBul('sinav')!.rehber[2].eylem!);
    expect(durum.secenekler).toMatchObject({ ortalama: true, oms: true });
    expect(durum.sekme).toBe('nokta');
  });

  it('ortanca: rehber eylemi Ortanca seçeneğini açar (ulasim 3. adım)', () => {
    const ulasim = yukle(kendiTablom(), 'ulasim');
    const eylem = ornekBul('ulasim')!.rehber.find((a) => a.eylem?.tur === 'secenek' && a.eylem.ac.includes('ortanca'))!.eylem!;
    expect(rehberEylemiUygula(ulasim, eylem).durum.secenekler).toMatchObject({ ortalama: true, ortanca: true });
  });
});

describe("Çizgi 'Değerleri göster' (degerleriGoster)", () => {
  it('varsayılan kapalı; kalıcı; bozuk değer kapalı', () => {
    expect(baslangicDurumu().degerleriGoster).toBe(false);
    const d: Durum = { ...baslangicDurumu(), degerleriGoster: true };
    expect(durumMetindenCoz(JSON.stringify(d))!.degerleriGoster).toBe(true);
    expect(durumCoz({ surum: 1, tablo: sabitBoy(), degerleriGoster: 'evet' })!.degerleriGoster).toBe(false);
    // Örnek yükleme tercihi değiştirmez
    expect(yukle(d, 'fide').degerleriGoster).toBe(true);
  });
});

describe('ornegiYukle: tabloDegistir + açılış görünümü + bağ + Keşif kartı', () => {
  it('kullanıcı tablosu saklanır; örnek bağlı, değiştirilmemiş, adıyla; Keşif kartı açık; ölçüler kapalı', () => {
    const eski = kendiTablom();
    const { durum, onceki } = ornegiYukle(eski, 'baskan')!;
    expect(onceki).toBe(eski);
    expect(durum.ornekId).toBe('baskan');
    expect(durum.ornekTemiz).toBe(true);
    expect(durum.tabloAdi).toBe(ornekBul('baskan')!.ad);
    expect(durum.ipucu).toBe('kart');
    expect(durum.daireModu).toBeNull();
    expect(durum.etkinKume).toBe('tablom');
    // Önceki örneğin (kullanıcının) seçenekleri, sütun modu ve grup genişliği taşınmaz
    expect(durum.secenekler).toEqual({ ortalama: false, oms: false, etiketler: false, ortanca: false });
    expect(durum.sutunModu).toBe(false);
    expect(durum.aralik).toBeNull();
    // Eksen örneğin değişkeninde (noktalar dağınık başlamaz), sekme örneğin önerdiği
    expect(durum.sekme).toBe('nokta');
    expect(durum.degisken).toBe(sutunKimligi(durum.tablo, 'Aday'));
    expect(bagliOrnek(durum)?.id).toBe('baskan');
    // Kullanıcının tablosu görünümüyle "Önceki tabloya dön" için saklandı
    expect(durum.oncekiTablo?.tablo).toBe(eski.tablo);
    expect(durum.oncekiTablo?.gorunum).toMatchObject({ sekme: 'cizgi', sutunModu: true, aralik: 3 });
    expect(oncekiTabloyaDon(durum).tablo).toBe(eski.tablo);
  });

  it('açılış ayarları: önerilen sekme, renk anahtarı, karşılaştırma ve açılış grup genişliği (acilisAralik)', () => {
    const atik = yukle(kendiTablom(), 'atik');
    expect(atik.sekme).toBe('sutun');
    expect(atik.renkDegisken).toBe(sutunKimligi(atik.tablo, 'Sınıf'));
    const mac = yukle(kendiTablom(), 'mac');
    expect(mac.degisken).not.toBeNull();
    expect(mac.ikinciDegisken).toBe(sutunKimligi(mac.tablo, 'Yasemin'));
    const ekran = yukle(kendiTablom(), 'ekran');
    expect(ekran.aralik).toBe(5);
    const sicaklik = yukle(kendiTablom(), 'sicaklik');
    expect(sicaklik.sekme).toBe('cizgi');
    // Her örnekte eksen bir değişkene atanmış ve sekme veri türüne uygun
    for (const o of ['baskan', 'atik', 'gun', 'harcama', 'kitap', 'kardes', 'ulasim', 'mac', 'sinav', 'boy', 'fide', 'sicaklik', 'iklim', 'ekran', 'calisma', 'cikolata']) {
      const d = yukle(kendiTablom(), o);
      expect(d.degisken, o).not.toBeNull();
      expect(sekmeDuzelt(d), o).toBe(d);
    }
  });

  it('değiştirilmemiş örnekten ikinci örnek: önceki tablo ezilmez; bilinmeyen örnek → null', () => {
    const bir = yukle(kendiTablom(), 'boy');
    const saklanan = bir.oncekiTablo;
    const iki = yukle(bir, 'kitap');
    expect(iki.oncekiTablo).toBe(saklanan);
    expect(ornegiYukle(bir, 'meyve')).toBeNull();
  });
});

describe('örnek bağının kopması (E11)', () => {
  const bagli = () => yukle(kendiTablom(), 'baskan');

  it('yapı: sütun sayısı, kimliği ya da türü; ad ve sıra yapı değildir', () => {
    const t = ornekVeriOlustur('boy');
    expect(yapiDegisti(t, t)).toBe(false);
    expect(yapiDegisti(t, hucreYaz(t, 0, 1, '1'))).toBe(false);
    expect(yapiDegisti(t, satirEkle(t))).toBe(false);
    expect(yapiDegisti(t, sutunAdiDegistir(t, 1, 'Uzunluk'))).toBe(false);
    expect(yapiDegisti(t, { ...t, sutunlar: [...t.sutunlar].reverse() })).toBe(false);
    expect(yapiDegisti(t, sutunEkle(t))).toBe(true);
    expect(yapiDegisti(t, sutunSil(t, 1))).toBe(true);
    expect(yapiDegisti(t, sutunTuruDegistir(t, 1, 'etiket'))).toBe(true);
    expect(yapiDegisti(t, ornekVeriOlustur('boy'))).toBe(true);
  });

  it('hücre ve satır düzenlemesi bağı korur, örnek artık "değiştirilmemiş" değildir', () => {
    const d = bagli();
    for (const yeni of [hucreYaz(d.tablo, 0, 1, 'Mert'), satirEkle(d.tablo), satirSil(d.tablo, 0), sutunAdiDegistir(d.tablo, 1, 'Başkan adayı')]) {
      const y = tabloDuzenle(d, yeni);
      expect(y.ornekId).toBe('baskan');
      expect(y.ipucu).toBe('kart');
      expect(y.ornekTemiz).toBe(false);
    }
  });

  it('sütun eklenir, silinir, türü değişir ya da yapıştırma tabloyu yeniden kurar → bağ kopar, Keşif kartı kapanır, ad kalır', () => {
    const d = bagli();
    const yapistirilan = izgaradanTablo([
      ['Aday', 'Oy'],
      ['Elif', '9'],
      ['Kaan', '6'],
    ]);
    for (const yeni of [sutunEkle(d.tablo), sutunSil(d.tablo, 1), sutunTuruDegistir(d.tablo, 1, 'sayi'), yapistirilan]) {
      const y = tabloDuzenle(d, yeni);
      expect(y.tablo).toBe(yeni);
      expect(y.ornekId).toBeNull();
      expect(y.ipucu).toBe('kapali');
      expect(y.ornekTemiz).toBe(false);
      expect(y.tabloAdi).toBe(d.tabloAdi);
      expect(bagliOrnek(y)).toBeUndefined();
    }
    // Bağı olmayan durumda koparmak durumu değiştirmez
    const kendi = kendiTablom();
    expect(ornekBaginiKopar(kendi)).toBe(kendi);
  });

  it('Temizle: satırlar silinir, sütunlar ve eksen kalır; grup genişliği ve sütun modu sıfırlanır; bağ kopar', () => {
    const d: Durum = { ...bagli(), aralik: 2, sutunModu: true };
    const y = tabloyuTemizle(d);
    expect(y.tablo.satirlar).toEqual([]);
    expect(y.tablo.sutunlar).toEqual(d.tablo.sutunlar);
    expect(y.degisken).toBe(d.degisken);
    expect(y).toMatchObject({ aralik: null, sutunModu: false, ornekId: null, ipucu: 'kapali', ornekTemiz: false });
    // Deney özetinde (salt okunur) hiçbir şey değişmez: Tablom'un bağı da kalır
    const ozet = kumeDegistir(deneyDurumu(), 'ozet');
    expect(tabloyuTemizle(ozet)).toBe(ozet);
    const bagliOzet = kumeDegistir(bagli(), 'ozet');
    expect(tabloyuTemizle(bagliOzet).ornekId).toBe('baskan');
  });
});

describe('rehber eylemleri durum üzerinde (rehberEylemiUygula)', () => {
  it("hucre: ulasim Feyza 60 → 20; tablo değişir, bağ ve 'değiştirilmemiş' korunur; satır aydınlanır, bildirim geri alınabilir", () => {
    const d = yukle(kendiTablom(), 'ulasim');
    const eylem = ornekBul('ulasim')!.rehber[3].eylem!;
    const { durum, yama } = rehberEylemiUygula(d, eylem);
    expect(yama.tablo).toBeDefined();
    expect(durum.tablo).toBe(yama.tablo);
    expect(durum.ornekId).toBe('ulasim');
    expect(durum.ornekTemiz).toBe(true);
    expect(durum.ipucu).toBe('kart');
    expect(yama.tost).toMatch(/Feyza/);
    const feyza = durum.tablo.satirlar.findIndex((r) => r.hucreler[0] === 'Feyza');
    expect(yama.vurguSatir).toBe(feyza);
    expect(durum.tablo.satirlar[feyza].hucreler[sutunIndeksi(durum.tablo, sutunKimligi(durum.tablo, 'Süre (dakika)'))]).toBe('20');
  });

  it('satirEkle: kardes yeni öğrenci sona eklenir; bağ korunur', () => {
    const d = yukle(kendiTablom(), 'kardes');
    const { durum, yama } = rehberEylemiUygula(d, ornekBul('kardes')!.rehber[3].eylem!);
    expect(durum.tablo.satirlar).toHaveLength(d.tablo.satirlar.length + 1);
    expect(yama.vurguSatir).toBe(d.tablo.satirlar.length);
    expect(durum.ornekId).toBe('kardes');
    expect(durum.ornekTemiz).toBe(true);
  });

  it('görünüm eylemleri: seçenek (Nokta + ölçüler), sekme, grup genişliği; satır vurgusu durumu değiştirmez', () => {
    const boy = yukle(kendiTablom(), 'boy');
    const secenek = rehberEylemiUygula({ ...boy, sekme: 'istatistik' }, ornekBul('boy')!.rehber[2].eylem!).durum;
    expect(secenek.sekme).toBe('nokta');
    expect(secenek.secenekler).toMatchObject({ ortalama: true, oms: true, etiketler: false });
    expect(secenek.tablo).toBe(boy.tablo);
    const baskan = yukle(kendiTablom(), 'baskan');
    expect(rehberEylemiUygula(baskan, ornekBul('baskan')!.rehber[2].eylem!).durum.sutunModu).toBe(true);
    expect(rehberEylemiUygula(baskan, ornekBul('baskan')!.rehber[3].eylem!).durum.sekme).toBe('daire');
    const ekran = yukle(kendiTablom(), 'ekran');
    expect(rehberEylemiUygula({ ...ekran, aralik: null }, ornekBul('ekran')!.rehber[1].eylem!).durum.aralik).toBe(5);
    const ulasim = yukle(kendiTablom(), 'ulasim');
    const vurgu = rehberEylemiUygula(ulasim, { tur: 'satirVurgula', satir: 'Feyza', etiket: 'Göster' });
    expect(vurgu.durum).toBe(ulasim);
    expect(vurgu.yama.vurguSatir).toBe(ulasim.tablo.satirlar.findIndex((r) => r.hucreler[0] === 'Feyza'));
    const yok = rehberEylemiUygula(ulasim, { tur: 'satirVurgula', satir: 'Olmayan', etiket: 'Göster' });
    expect(yok.durum).toBe(ulasim);
    expect(yok.yama.tost).toBeTruthy();
  });
});

describe('durumCoz: örnek bağının doğrulanması', () => {
  it('güncel örnek bağlı kalır; güncellenmiş (eski verili) temiz örnek ve bilinmeyen örnek bağsız açılır', () => {
    const guncel = durumCoz({ surum: 1, tablo: ornekVeriOlustur('boy'), ornekId: 'boy', ornekTemiz: true, ipucu: 'kart' })!;
    expect(guncel).toMatchObject({ ornekId: 'boy', ornekTemiz: true, ipucu: 'kart' });
    // Örneğin eski verisi (P0 öncesi boy tablosu): rehberin cevapları tutmaz, tablo kullanıcıda kalır
    const eskiVeri = sabitBoy();
    const eski = durumCoz({ surum: 1, tablo: eskiVeri, ornekId: 'boy', ornekTemiz: true })!;
    expect(eski.ornekId).toBeNull();
    expect(eski.ornekTemiz).toBe(false);
    expect(eski.ipucu).toBe('kapali');
    expect(eski.tablo.satirlar.map((r) => r.hucreler)).toEqual(eskiVeri.satirlar.map((r) => r.hucreler));
    // Düzenlenmiş örnek bağlı kalır; kaldırılmış örneğin kimliği düşer
    expect(durumCoz({ surum: 1, tablo: eskiVeri, ornekId: 'boy', ornekTemiz: false })!.ornekId).toBe('boy');
    expect(durumCoz({ surum: 1, tablo: eskiVeri, ornekId: 'meyve' })!.ornekId).toBeNull();
  });
});

// ── C-4: veri toplamanın bağlanması (küme seçici, tablo bandı, önceki tablonun araştırması, kayıt onarımı) ──

describe('C-4: yeni panelin kümeleri, tablo bandı ve önceki tablonun araştırması', () => {
  it('küme seçici: bağlı deneyde özet en az 2 satırken "Atışlar" + "Deney özeti"; anket, ölçüm ve bağsız tabloda yalnız Tablom', () => {
    const d = deneyDurumu();
    expect(OZET_EN_AZ_SATIR).toBe(2);
    expect(toplamaKumeleri(d)).toEqual(['tablom', 'ozet']);
    expect(kumeEtiketi(d, 'tablom')).toBe('Atışlar');
    expect(kumeEtiketi(d, 'ozet')).toBe('Deney özeti');
    // Tek çalışma: özet tek satır → seçici yok (korunan karar 5)
    const tek: Durum = { ...d, arastirma: { ...d.arastirma!, deney: { ...d.arastirma!.deney, calismalar: d.arastirma!.deney.calismalar.slice(0, 1) } } };
    expect(toplamaKumeleri(tek)).toEqual(['tablom']);
    // Özet açıkken Tablom'a dönülebilsin diye iki küme kalır
    expect(toplamaKumeleri(kumeDegistir(tek, 'ozet'))).toEqual(['tablom', 'ozet']);
    // Çarkta çevirmeler, torbada çekişler
    const cark: Durum = { ...d, arastirma: { ...d.arastirma!, deney: { ...d.arastirma!.deney, nesne: 'cark' } } };
    expect(kumeEtiketi(cark, 'tablom')).toBe('Çevirmeler');
    expect(kumeEtiketi({ ...d, arastirma: { ...d.arastirma!, deney: { ...d.arastirma!.deney, nesne: 'torba' } } }, 'tablom')).toBe('Çekişler');
    // Bağ yok (örnek tablosu) ya da araştırma yok: "Tablom"
    const bagsiz = { ...d, tablo: sabitBoy() };
    expect(toplamaKumeleri(bagsiz)).toEqual(['tablom']);
    expect(kumeEtiketi(bagsiz, 'tablom')).toBe('Tablom');
    expect(toplamaKumeleri(baslangicDurumu())).toEqual(['tablom']);
    expect(kumeEtiketi(baslangicDurumu(), 'tablom')).toBe('Tablom');
  });

  it('tablo bandı: varsayılan kapalı, kalıcı; eski kayıtta kapalı', () => {
    expect(baslangicDurumu().tabloBandiAcik).toBe(false);
    const acik: Durum = { ...baslangicDurumu(), tabloBandiAcik: true };
    expect(durumMetindenCoz(JSON.stringify(acik))!.tabloBandiAcik).toBe(true);
    expect(durumCoz({ surum: 1, tablo: sabitBoy() })!.tabloBandiAcik).toBe(false);
    expect(durumCoz({ surum: 1, tablo: sabitBoy(), tabloBandiAcik: 'evet' })!.tabloBandiAcik).toBe(false);
  });

  it('kayıt: araştırma tablosunun sayısal ilk sütunu (ölçüm) yenilemeden sonra sayısal kalır; önceki tablo da onarılır', () => {
    const a = varsayilanArastirma();
    const deger = arastirmaSutunKimligi(a.kimlik, 'deger');
    const olcum: Arastirma = { ...a, soru: 'Nabzımız', yontem: 'olcum', sutunlar: { deger } };
    const tablo: VeriTablosu = { sutunlar: [{ id: deger, ad: 'Nabız (atım/dk)', tur: 'sayi' }], satirlar: [{ id: 'r1', hucreler: ['72'] }, { id: 'r2', hucreler: ['84'] }] };
    const d: Durum = eksenDuzelt({ ...baslangicDurumu(), tablo, arastirma: olcum, tabloAdi: null, ornekId: null, ornekTemiz: false });
    const geri = durumMetindenCoz(JSON.stringify(d))!;
    expect(geri.tablo.sutunlar[0].tur).toBe('sayi');
    expect(degiskenSutunlari(geri.tablo).map((s) => s.id)).toEqual([deger]);
    // Önceki tablo olarak saklanmış ölçüm tablosu (araştırması artık bağlı değil) rolünden onarılır
    const sonra = tabloDegistir(d, { tablo: ornekVeriOlustur('boy'), ad: 'Boy', ornekId: 'boy' }).durum;
    const geri2 = durumMetindenCoz(JSON.stringify({ ...sonra, arastirma: null }))!;
    expect(geri2.oncekiTablo!.tablo.sutunlar[0].tur).toBe('sayi');
  });

  it('önceki tablo bağlı araştırmasıyla saklanır ve onunla geri gelir; bağsız tabloda şimdiki plan kalır', () => {
    const d = deneyDurumu();
    const a = d.arastirma!;
    // Başka bir tablo (örnek) yüklenir: plan silinmez ama bağ kopar; önceki tablo araştırmasıyla saklanır
    const ornek = ornegiYukle(d, 'boy')!.durum;
    expect(ornek.oncekiTablo!.arastirma).toBe(a);
    expect(ornek.arastirma).toBe(a);
    // Araya başka bir plan girmiş olsa da önceki tabloya dönünce onun araştırması gelir
    const baska: Durum = { ...ornek, arastirma: { ...varsayilanArastirma(), soru: 'Başka soru' } };
    const geri = oncekiTabloyaDon(baska);
    expect(geri.tablo).toBe(d.tablo);
    expect(geri.arastirma).toBe(a);
    expect(toplamaKumeleri(geri)).toEqual(['tablom', 'ozet']);
    // Örnek tablosu bağsız saklanır (araştırması null); ona dönünce şimdiki plan kalır
    expect(geri.oncekiTablo!.arastirma).toBeNull();
    expect(oncekiTabloyaDon(geri).arastirma).toBe(a);
    // JSON gidiş-dönüşü: saklanan araştırma korunur; eski kayıtta (alan yok) null
    const kayit = durumMetindenCoz(JSON.stringify(ornek))!;
    expect(kayit.oncekiTablo!.arastirma).toEqual(a);
    expect(durumCoz({ surum: 1, tablo: sabitBoy(), oncekiTablo: { tablo: sabitMac(), ad: 'Maç' } })!.oncekiTablo!.arastirma).toBeNull();
  });

  it('örnek bağı olmayan tabloda bağı koparmak ipucunu (soru şeridi) kapatmaz; Temizle araştırma tablosunda şeridi korur', () => {
    const d: Durum = { ...deneyDurumu(), ipucu: 'serit' };
    expect(ornekBaginiKopar(d)).toBe(d);
    const temiz = tabloyuTemizle(d);
    expect(temiz.tablo.satirlar).toEqual([]);
    expect(temiz.ipucu).toBe('serit');
    // Örneğe bağlı tabloda eskisi gibi: bağ kopar, Keşif kartı kapanır
    const ornek = ornegiYukle(baslangicDurumu(), 'boy')!.durum;
    expect(ornekBaginiKopar(ornek)).toMatchObject({ ornekId: null, ipucu: 'kapali' });
  });
});

describe('daire modu tablonun görünümüdür: yeni tabloya taşınmaz, tablo geri gelince onunla gelir (M08)', () => {
  it('örnekte seçilen "Her satır bir dilim" yeni araştırmaya, yeni tabloya ve Temizle sonrasına taşınmaz; önceki tabloyla geri gelir', () => {
    const yuklu = ornegiYukle(baslangicDurumu(), 'boy')!.durum;
    // Değiştirilmiş örnek (önceki tablo olarak saklanır), Daire'de "Her satır bir dilim" seçili
    const secili: Durum = { ...yuklu, sekme: 'daire', daireModu: 'satir', ornekTemiz: false };
    const plan = planiUygula(secili, hazirSoruUygula('meyve')!);
    expect(plan.durum.daireModu).toBeNull();
    expect(plan.durum.oncekiTablo?.gorunum.daireModu).toBe('satir');
    // Önceki tabloya dönünce seçim de geri gelir
    expect(oncekiTabloyaDon(plan.durum).daireModu).toBe('satir');
    // Kayıt gidiş-dönüşünde saklı seçim korunur
    expect(durumMetindenCoz(JSON.stringify(plan.durum))?.oncekiTablo?.gorunum.daireModu).toBe('satir');
    // Başka yollar: yeni tablo, Temizle
    expect(tabloDegistir(secili, { tablo: sabitMac(), ad: 'Maç' }).durum.daireModu).toBeNull();
    expect(tabloyuTemizle(secili).daireModu).toBeNull();
    // Küme değişiminde her kümenin kendi seçimi (Deney özetine taşınmaz, dönünce geri gelir)
    const ozette = kumeDegistir(secili, 'ozet');
    expect(ozette.daireModu).toBeNull();
    expect(kumeDegistir(ozette, 'tablom').daireModu).toBe('satir');
  });
});
