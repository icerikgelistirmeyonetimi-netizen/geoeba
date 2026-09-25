// Sahip: B1 (vg/deney.ts: nesne düzeneği, teorik olasılık, çalışmalar, sayım, Deney özeti, arayüz metinleri)
import { describe, expect, it } from 'vitest';
import {
  ATIS_CIPLERI,
  DENEY_NESNELERI,
  EN_COK_ATIS,
  EN_COK_TABLO_SATIRI,
  NESNE_ADLARI,
  OZET_SUTUNU,
  SERI,
  TABLOYA_YAZMA_SINIRI,
  ayniSonuc,
  calismaSatirlari,
  calismaSayilari,
  deneyEtiketi,
  etkinIzlenen,
  fiil,
  gercekEtiketi,
  izlenenAdi,
  izlenenRolu,
  izlenenTeorik,
  izlenenVarsayilani,
  kesirMetni,
  nesneAygitlari,
  nesneDuzenegi,
  ozetSutunlari,
  ozetTablosu,
  siraliCalismalar,
  sonucAnahtari,
  sonucDegerleri,
  sonucRolleri,
  sonucSayisi,
  sonucSayisalMi,
  sonucSutunAdi,
  teorikGosterilir,
  teorikOlasiliklar,
  varsayilanDeneyPlani,
  atisSecenekleri,
  tekDeneyAtisi,
  atisSiniriMetni,
  calismaSilindiMetni,
  calismalariTablodanGuncelle,
  deneyCalismasiBaslat,
  deneyCalismasiBitir,
  deneyCalismasiSil,
  deneyDurumMetni,
  deneyEtiketiDuzelt,
  deneySatirlariEkle,
  deneySikliklari,
  durdurulduMetni,
  enCokAtis,
  eylemMetni,
  fiilBulunma,
  fiilCogul,
  fiilIle,
  kacAtisBasligi,
  kalanMetni,
  sahneEtiketi,
  seriBittiMetni,
  sonAtisBasligi,
  sonrakiDeneyNo,
  tabloDoluMetni,
  tabloyaYazilirMi,
  tamamlandiMetni,
  teorikMetni,
  toplamAtis,
  torbaBosaldiMetni,
  torbaMetni,
  torbadaKalan,
  torbadakiTopSayisi,
} from '../deney';
import {
  arastirmaSutunKimligi,
  varsayilanArastirma,
  type Arastirma,
  type DeneyCalismasi,
  type DeneyNesnesi,
  type DeneyPlani,
} from '../arastirma';
import { ayarSorunu, aygitSorunu, cekilisler, degiskenAdlari, satirDegerleri, toplamEtkin } from '../ornekleyici';
import { mulberry32 } from '../rastgele';
import { degiskenSutunlari } from '../kategorik';
import { satirSil, sutunAdiDegistir, type VeriTablosu } from '../veri';

// ── Yardımcılar ─────────────────────────────────────────────────────────────

function plan(nesne: DeneyNesnesi, degisiklik: Partial<DeneyPlani> = {}): DeneyPlani {
  return { ...varsayilanDeneyPlani(), nesne, ...degisiklik };
}

function calisma(etiket: string, n: number, degisiklik: Partial<DeneyCalismasi> = {}): DeneyCalismasi {
  return { no: 1, etiket, n, sayilar: {}, tabloda: true, gercek: false, ...degisiklik };
}

/** Plan uygulanmış deney araştırması; `deneySutunu` false ise Deney sütunu henüz eklenmemiştir */
function arastirma(d: DeneyPlani, deneySutunu = true): Arastirma {
  const a = varsayilanArastirma();
  const sutunlar: Arastirma['sutunlar'] = {};
  for (const rol of d.nesne === 'iki-zar' ? (['s0', 's1', 'toplam'] as const) : (['s0'] as const)) sutunlar[rol] = arastirmaSutunKimligi(a.kimlik, rol);
  if (deneySutunu) sutunlar.deney = arastirmaSutunKimligi(a.kimlik, 'deney');
  return { ...a, yontem: 'deney', adim: 'topla', deney: d, sutunlar };
}

/** Araştırmanın tablosu: her satır [sonuç(lar)…, (deney etiketi)] */
function tablo(a: Arastirma, satirlar: string[][]): VeriTablosu {
  const d = a.deney;
  const sutunlar = sonucRolleri(d.nesne).map((rol) => ({
    id: a.sutunlar![rol]!,
    ad: sonucSutunAdi(d, rol),
    tur: d.nesne === 'zar' || d.nesne === 'iki-zar' ? ('sayi' as const) : ('etiket' as const),
  }));
  if (a.sutunlar?.deney) sutunlar.push({ id: a.sutunlar.deney, ad: 'Deney', tur: 'etiket' });
  return { sutunlar, satirlar: satirlar.map((hucreler, i) => ({ id: `r${i}`, hucreler })) };
}

/** n satır: ilk `tura` tanesi Tura, kalanı Yazı */
function paraSatirlari(etiket: string | null, n: number, tura: number): string[][] {
  return Array.from({ length: n }, (_, i) => (etiket === null ? [i < tura ? 'Tura' : 'Yazı'] : [i < tura ? 'Tura' : 'Yazı', etiket]));
}

const sutunIdleri = (t: VeriTablosu) => t.sutunlar.map((s) => s.id);

// ── Sabitler ve nesneler ────────────────────────────────────────────────────

describe('deney: sabitler, fiiller ve etiketler', () => {
  it('beş nesne Plan sırasıyla; adlar ders kitabı dilinde', () => {
    expect(DENEY_NESNELERI).toEqual(['para', 'zar', 'iki-zar', 'cark', 'torba']);
    expect(DENEY_NESNELERI.map((n) => NESNE_ADLARI[n])).toEqual(['Madenî para', 'Sayı küpü', 'İki sayı küpü', 'Çark', 'Torba']);
    for (const ad of Object.values(NESNE_ADLARI)) expect(ad).not.toMatch(/\bzar\b|karıştırıcı|aygıt/i);
  });

  it('sınırlar ve seri', () => {
    expect(EN_COK_TABLO_SATIRI).toBe(2000);
    expect(EN_COK_ATIS).toBe(2000);
    expect(TABLOYA_YAZMA_SINIRI).toBe(500);
    expect(SERI).toEqual([20, 50, 100, 200, 500, 1000, 2000]);
    // Tek deneyin çipleri tabloya yazılır (< 500); 500, 1000, 2000 yalnız seride
    expect(ATIS_CIPLERI).toEqual([10, 20, 30, 50, 100, 200]);
    expect(ATIS_CIPLERI.every((n) => n < TABLOYA_YAZMA_SINIRI)).toBe(true);
    expect(tekDeneyAtisi(20)).toBe(20);
    expect(tekDeneyAtisi(499)).toBe(499);
    expect(tekDeneyAtisi(500)).toBe(200);
    expect(tekDeneyAtisi(2000)).toBe(200);
  });

  it('fiil ve etiketler', () => {
    expect(DENEY_NESNELERI.map(fiil)).toEqual(['atış', 'atış', 'atış', 'çevirme', 'çekiş']);
    expect(gercekEtiketi('para')).toBe('Gerçek atışlar');
    expect(gercekEtiketi('cark')).toBe('Gerçek çevirmeler');
    expect(gercekEtiketi('torba')).toBe('Gerçek çekişler');
    expect(deneyEtiketi(3, 20)).toBe('3. deney (20)');
  });

  it('sonuç sütunlarının rolleri ve adları', () => {
    expect(sonucRolleri('para')).toEqual(['s0']);
    expect(sonucRolleri('iki-zar')).toEqual(['s0', 's1', 'toplam']);
    expect(izlenenRolu('iki-zar')).toBe('toplam');
    expect(izlenenRolu('torba')).toBe('s0');
    expect(sonucSutunAdi(plan('para'), 's0')).toBe('Para');
    expect(sonucSutunAdi(plan('zar'), 's0')).toBe('Sayı küpü');
    expect(['s0', 's1', 'toplam'].map((r) => sonucSutunAdi(plan('iki-zar'), r as 's0'))).toEqual(['1. küp', '2. küp', 'Toplam']);
    expect(sonucSutunAdi(plan('torba'), 's0')).toBe('Renk');
    expect(sonucSutunAdi(plan('cark', { cark: { degiskenAdi: 'Penaltı', dilimler: [] } }), 's0')).toBe('Penaltı');
    expect(sonucSutunAdi(plan('cark', { cark: { degiskenAdi: '  ', dilimler: [] } }), 's0')).toBe('Çark');
    expect(DENEY_NESNELERI.map(sonucSayisalMi)).toEqual([false, true, true, false, false]);
  });
});

describe('deney: nesne düzeneği (nesneDuzenegi)', () => {
  it('beş nesne için geçerli düzenek', () => {
    for (const nesne of DENEY_NESNELERI) {
      const ayar = nesneDuzenegi(plan(nesne));
      expect(ayarSorunu(ayar)).toBeNull();
      for (const aygit of ayar.aygitlar) expect(aygitSorunu(aygit)).toBeNull();
    }
  });

  it('para Yazı / Tura; iki küpte toplam sütunu', () => {
    const para = nesneDuzenegi(plan('para')).aygitlar[0];
    expect(para.tur === 'karistirici' && para.ogeler.map((o) => o.etiket)).toEqual(['Yazı', 'Tura']);
    const iki = nesneDuzenegi(plan('iki-zar'));
    expect(iki.toplamSutunu).toBe(true);
    expect(toplamEtkin(iki)).toBe(true);
    expect(degiskenAdlari(iki)).toEqual(['1. küp', '2. küp']);
    const [c] = cekilisler(iki, 1, mulberry32(3)).cekilisler;
    const [a, b, t] = satirDegerleri(iki, c);
    expect(Number(t)).toBe(Number(a) + Number(b));
  });

  it('kararlı aygıt kimlikleri (iki çağrıda aynı)', () => {
    const kimlikler = (nesne: DeneyNesnesi) => nesneDuzenegi(plan(nesne)).aygitlar.map((x) => x.id);
    expect(DENEY_NESNELERI.map(kimlikler)).toEqual([['para'], ['zar'], ['zar-1', 'zar-2'], ['cark'], ['torba']]);
    expect(DENEY_NESNELERI.map(kimlikler)).toEqual(DENEY_NESNELERI.map(kimlikler));
  });

  it('çark ve torba plandan kurulur; plan nesnesi paylaşılmaz', () => {
    const p = plan('torba', { torba: { toplar: [{ etiket: 'Kırmızı', adet: 3 }, { etiket: 'Mavi', adet: 2 }], geriAt: false }, atisSayisi: 5, hiz: 3 });
    const ayar = nesneDuzenegi(p);
    const torba = ayar.aygitlar[0];
    expect(torba.tur === 'karistirici' && torba.iadeli).toBe(false);
    expect(ayar.cekilisSayisi).toBe(5);
    expect(ayar.hiz).toBe(3);
    if (torba.tur === 'karistirici') torba.ogeler[0].adet = 60;
    expect(p.torba.toplar[0].adet).toBe(3);
    const cark = nesneDuzenegi(plan('cark', { cark: { degiskenAdi: 'Cevap', dilimler: [{ etiket: 'Evet', yuzde: 60 }, { etiket: 'Hayır', yuzde: 40 }] } }));
    expect(cark.aygitlar[0].degisken).toBe('Cevap');
    expect(cark.hiz).toBe(1);
    expect(nesneAygitlari(plan('zar'))[0]).toEqual({ id: 'zar', tur: 'aralik', degisken: 'Sayı küpü', min: 1, max: 6 });
  });

  it('tohumlu 10 000 atışta göreli sıklıklar teoriğe yakın', () => {
    const rnd = mulberry32(2026);
    const para = cekilisler(nesneDuzenegi(plan('para')), 10000, rnd).cekilisler;
    expect(Math.abs(para.filter((c) => c.degerler[0] === 'Tura').length / 10000 - 0.5)).toBeLessThan(0.02);
    const iki = nesneDuzenegi(plan('iki-zar'));
    const toplamlar = cekilisler(iki, 10000, rnd).cekilisler.map((c) => c.toplam);
    expect(Math.abs(toplamlar.filter((t) => t === 7).length / 10000 - 6 / 36)).toBeLessThan(0.02);
  });
});

describe('deney: sonuçlar, izlenen sonuç ve teorik olasılık', () => {
  it('olası sonuçlar ve varsayılan sayılan sonuç: Tura / 6 / 7 / ilk dilim / ilk renk', () => {
    expect(sonucDegerleri(plan('para'))).toEqual(['Yazı', 'Tura']);
    expect(sonucDegerleri(plan('zar'))).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(sonucDegerleri(plan('iki-zar'))).toEqual(['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
    expect(sonucDegerleri(plan('cark'))).toEqual(['Kırmızı', 'Mavi', 'Sarı']);
    expect(sonucDegerleri(plan('torba', { torba: { toplar: [{ etiket: ' Mor ', adet: 1 }, { etiket: '', adet: 2 }, { etiket: 'Mor', adet: 2 }, { etiket: 'Gri', adet: 0 }], geriAt: true } }))).toEqual(['Mor', 'Gri']);
    expect(DENEY_NESNELERI.map((n) => izlenenVarsayilani(plan(n)))).toEqual(['Tura', '6', '7', 'Kırmızı', 'Kırmızı']);
  });

  it('geçerli sayılan sonuç: plandaki değer, yoksa varsayılan', () => {
    expect(etkinIzlenen(plan('para', { izlenen: 'Yazı' }))).toBe('Yazı');
    expect(etkinIzlenen(plan('torba', { izlenen: 'Mavi' }))).toBe('Mavi');
    expect(etkinIzlenen(plan('torba', { izlenen: 'Yeşil' }))).toBe('Kırmızı');
    expect(etkinIzlenen(plan('iki-zar', { izlenen: ' 7,0 ' }))).toBe('7');
    expect(etkinIzlenen(plan('zar', { izlenen: '9' }))).toBe('6');
    expect(etkinIzlenen(plan('cark', { cark: { degiskenAdi: 'Çark', dilimler: [] } }))).toBe('');
    expect(ayniSonuc('7', '7,0')).toBe(true);
    expect(ayniSonuc('Tura', 'tura')).toBe(false);
  });

  it('sayılan sonucun adı: kategorikte sonuç, sayı küplerinde sütun adıyla', () => {
    expect(izlenenAdi(plan('para'))).toBe('Tura');
    expect(izlenenAdi(plan('zar'))).toBe('Sayı küpü 6');
    expect(izlenenAdi(plan('iki-zar'))).toBe('Toplam 7');
    expect(izlenenAdi(plan('zar'), 'Küp')).toBe('Küp 6');
    expect(izlenenAdi(plan('torba', { izlenen: 'Mavi' }))).toBe('Mavi');
  });

  it('kesir metinleri: para 1/2, küp 1/6, iki küpte 7 → 6/36, torba 3/5', () => {
    const bul = (d: DeneyPlani, deger: string) => teorikOlasiliklar(d).find((t) => t.deger === deger)!;
    expect(kesirMetni(bul(plan('para'), 'Tura'))).toBe('1/2 = %50');
    expect(kesirMetni(bul(plan('zar'), '6'))).toBe('1/6 = %16,7');
    expect(kesirMetni(bul(plan('iki-zar'), '7'))).toBe('6/36 = %16,7');
    expect(kesirMetni(bul(plan('iki-zar'), '2'))).toBe('1/36 = %2,8');
    expect(kesirMetni(bul(plan('iki-zar'), '12'))).toBe('1/36 = %2,8');
    expect(kesirMetni(bul(plan('torba'), 'Kırmızı'))).toBe('3/5 = %60');
    expect(kesirMetni(bul(plan('torba'), 'Mavi'))).toBe('2/5 = %40');
    expect(kesirMetni(izlenenTeorik(plan('torba', { izlenen: 'Mavi' })))).toBe('2/5 = %40');
  });

  it('çark: tam sayı yüzdelerde sade kesir, ondalıkta yalnız yüzde, toplam 100 değilse ölçeklenir', () => {
    const cark = (dilimler: [string, number][]) => plan('cark', { cark: { degiskenAdi: 'Cevap', dilimler: dilimler.map(([etiket, yuzde]) => ({ etiket, yuzde })) } });
    expect(teorikOlasiliklar(cark([['Evet', 60], ['Hayır', 40]])).map(kesirMetni)).toEqual(['3/5 = %60', '2/5 = %40']);
    expect(teorikOlasiliklar(cark([['Gol', 70], ['Kaçtı', 30]])).map(kesirMetni)).toEqual(['7/10 = %70', '3/10 = %30']);
    expect(teorikOlasiliklar(plan('cark')).map(kesirMetni)).toEqual(['1/2 = %50', '1/4 = %25', '1/4 = %25']);
    expect(teorikOlasiliklar(cark([['A', 33.3], ['B', 33.3], ['C', 33.4]])).map(kesirMetni)).toEqual(['%33,3', '%33,3', '%33,4']);
    expect(teorikOlasiliklar(cark([['Evet', 50], ['Hayır', 40]])).map(kesirMetni)).toEqual(['5/9 = %55,6', '4/9 = %44,4']);
    expect(teorikOlasiliklar(cark([['A', 25], ['B', 50], ['A', 25]])).map(kesirMetni)).toEqual(['1/2 = %50', '1/2 = %50']);
  });

  it('olasılıkların toplamı 1; boş torbada kesir yok', () => {
    for (const nesne of DENEY_NESNELERI) {
      const t = teorikOlasiliklar(plan(nesne)).reduce((s, x) => s + x.olasilik, 0);
      expect(t).toBeCloseTo(1, 12);
    }
    const bos = teorikOlasiliklar(plan('torba', { torba: { toplar: [{ etiket: 'Kırmızı', adet: 0 }], geriAt: true } }));
    expect(bos).toEqual([{ deger: 'Kırmızı', olasilik: 0, pay: null, payda: null }]);
    expect(kesirMetni(bos[0])).toBe('%0');
  });

  it('teorik olasılık yalnız açıkken ve çekiş geri atılıyorsa gösterilir', () => {
    expect(teorikGosterilir(plan('para'))).toBe(true);
    expect(teorikGosterilir(plan('para', { teorikGoster: false }))).toBe(false);
    expect(teorikGosterilir(plan('torba'))).toBe(true);
    expect(teorikGosterilir(plan('torba', { torba: { toplar: [{ etiket: 'Kırmızı', adet: 3 }], geriAt: false } }))).toBe(false);
  });
});

describe('deney: çalışmaların sayımı (calismaSayilari)', () => {
  it('sonuç anahtarı: sayısal sütunda sayı yazımı, etikette kırpılmış metin; boş ve hatalı sayılmaz', () => {
    expect(sonucAnahtari(' Tura ', false)).toBe('Tura');
    expect(sonucAnahtari('7', true)).toBe('7');
    expect(sonucAnahtari('7,0', true)).toBe('7');
    expect(sonucAnahtari('yedi', true)).toBeNull();
    expect(sonucAnahtari('  ', false)).toBeNull();
    expect(sonucSayisi({ '7': 3, '8': 2 }, '7,0')).toBe(3);
    expect(sonucSayisi({}, 'Tura')).toBe(0);
  });

  it('tablodan hesaplanır: Deney sütunundaki etiketle', () => {
    const gercek = calisma('Gerçek atışlar', 4, { no: 0, gercek: true });
    const bir = calisma('1. deney (20)', 20, { no: 1 });
    const a = arastirma(plan('para', { calismalar: [gercek, bir] }));
    const t = tablo(a, [...paraSatirlari('Gerçek atışlar', 4, 3), ...paraSatirlari('1. deney (20)', 20, 11)]);
    expect(calismaSayilari(t, a, gercek)).toEqual({ n: 4, sayilar: { Tura: 3, Yazı: 1 }, kaynak: 'tablo' });
    expect(calismaSayilari(t, a, bir)).toEqual({ n: 20, sayilar: { Tura: 11, Yazı: 9 }, kaynak: 'tablo' });
    expect(calismaSatirlari(t, a, gercek)).toEqual([0, 1, 2, 3]);
  });

  it('elle silinen ve boşaltılan satır sayıya yansır', () => {
    const bir = calisma('1. deney (20)', 20, { sayilar: { Tura: 11, Yazı: 9 } });
    const a = arastirma(plan('para', { calismalar: [bir] }));
    let t = tablo(a, paraSatirlari('1. deney (20)', 20, 11));
    t = satirSil(t, 0);
    t = { ...t, satirlar: t.satirlar.map((r, i) => (i === 0 ? { ...r, hucreler: ['', r.hucreler[1]] } : r)) };
    expect(calismaSayilari(t, a, bir)).toEqual({ n: 18, sayilar: { Tura: 9, Yazı: 9 }, kaynak: 'tablo' });
  });

  it('tabloya yazılmamış çalışmada saklı sayılar kullanılır', () => {
    const buyuk = calisma('2. deney (500)', 500, { no: 2, tabloda: false, sayilar: { Tura: 243, Yazı: 257 } });
    const a = arastirma(plan('para', { calismalar: [calisma('1. deney (20)', 20), buyuk] }));
    const t = tablo(a, paraSatirlari('1. deney (20)', 20, 10));
    expect(calismaSayilari(t, a, buyuk)).toEqual({ n: 500, sayilar: { Tura: 243, Yazı: 257 }, kaynak: 'kayit' });
    expect(calismaSatirlari(t, a, buyuk)).toBeNull();
  });

  it('Deney sütunu yokken tek çalışma bütün satırları sayar; birden çok çalışmada saklı sayılar', () => {
    const bir = calisma('1. deney (20)', 20, { sayilar: { Tura: 1, Yazı: 19 } });
    const a = arastirma(plan('para', { calismalar: [bir] }), false);
    const t = tablo(a, paraSatirlari(null, 20, 12));
    expect(calismaSayilari(t, a, bir)).toEqual({ n: 20, sayilar: { Tura: 12, Yazı: 8 }, kaynak: 'tablo' });
    const iki = calisma('2. deney (20)', 20, { no: 2, sayilar: { Tura: 5, Yazı: 15 } });
    const b = arastirma(plan('para', { calismalar: [bir, iki] }), false);
    expect(calismaSayilari(t, b, iki)).toEqual({ n: 20, sayilar: { Tura: 5, Yazı: 15 }, kaynak: 'kayit' });
  });

  it('iki küpte Toplam sütunu sayılır', () => {
    const bir = calisma('1. deney (4)', 4);
    const a = arastirma(plan('iki-zar', { calismalar: [bir] }), false);
    const t = tablo(a, [['1', '6', '7'], ['3', '4', '7'], ['2', '2', '4'], ['6', '6', '12']]);
    expect(calismaSayilari(t, a, bir).sayilar).toEqual({ '7': 2, '4': 1, '12': 1 });
  });

  it('sıralama: önce gerçek atışlar, sonra numara sırasıyla', () => {
    const c = [calisma('3. deney (50)', 50, { no: 3 }), calisma('Gerçek atışlar', 7, { no: 0, gercek: true }), calisma('1. deney (20)', 20, { no: 1 })];
    expect(siraliCalismalar(c).map((x) => x.etiket)).toEqual(['Gerçek atışlar', '1. deney (20)', '3. deney (50)']);
    expect(c[0].no).toBe(3);
  });
});

describe('deney: Deney özeti (ozetTablosu)', () => {
  it('sütun kimlikleri, adları ve türleri', () => {
    const a = arastirma(plan('para'));
    const t = ozetTablosu(tablo(a, []), a);
    expect(sutunIdleri(t)).toEqual(['oz-deney', 'oz-n', 'oz-sayi', 'oz-oran', 'oz-teorik']);
    expect(Object.values(OZET_SUTUNU)).toEqual(sutunIdleri(t));
    expect(t.sutunlar.map((s) => s.ad)).toEqual(['Deney', 'Atış sayısı', 'Tura: sayı', 'Tura: göreli sıklık (%)', 'Teorik olasılık (%)']);
    expect(t.sutunlar.map((s) => s.tur)).toEqual(['etiket', 'sayi', 'sayi', 'sayi', 'sayi']);
    expect(t.satirlar).toEqual([]);
  });

  it('teorik göster kapalıyken ve geri atmadan çekişte oz-teorik yok', () => {
    const kapali = arastirma(plan('para', { teorikGoster: false }));
    expect(sutunIdleri(ozetTablosu(tablo(kapali, []), kapali))).not.toContain('oz-teorik');
    const torba = arastirma(plan('torba', { torba: { toplar: [{ etiket: 'Kırmızı', adet: 3 }, { etiket: 'Mavi', adet: 2 }], geriAt: false } }));
    const t = ozetTablosu(tablo(torba, []), torba);
    expect(sutunIdleri(t)).toEqual(['oz-deney', 'oz-n', 'oz-sayi', 'oz-oran']);
    expect(t.sutunlar[1].ad).toBe('Çekiş sayısı');
    expect(t.sutunlar[3].ad).toBe('Kırmızı: göreli sıklık (%)');
  });

  it('satırlar: gerçek önce, sonra numara sırasıyla; yüzdeler 1 ondalık', () => {
    const calismalar = [
      calisma('3. deney (2000)', 2000, { no: 3, tabloda: false, sayilar: { Tura: 1004, Yazı: 996 } }),
      calisma('1. deney (20)', 20, { no: 1 }),
      calisma('Gerçek atışlar', 3, { no: 0, gercek: true }),
      calisma('2. deney (200)', 200, { no: 2 }),
    ];
    const a = arastirma(plan('para', { calismalar }));
    const t = tablo(a, [...paraSatirlari('Gerçek atışlar', 3, 1), ...paraSatirlari('1. deney (20)', 20, 11), ...paraSatirlari('2. deney (200)', 200, 97)]);
    const oz = ozetTablosu(t, a);
    expect(oz.satirlar.map((r) => r.hucreler)).toEqual([
      ['Gerçek atışlar', '3', '1', '33,3', '50'],
      ['1. deney (20)', '20', '11', '55', '50'],
      ['2. deney (200)', '200', '97', '48,5', '50'],
      ['3. deney (2000)', '2000', '1004', '50,2', '50'],
    ]);
    expect(oz.satirlar.map((r) => r.id)).toEqual(['oz-g', 'oz-1', 'oz-2', 'oz-3']);
    for (const r of oz.satirlar) for (const h of r.hucreler.slice(3)) expect(h).toMatch(/^\d+(,\d)?$/);
  });

  it('tablodaki elle silme özete yansır; atışı kalmayan çalışma satır üretmez', () => {
    const bir = calisma('1. deney (3)', 3);
    const iki = calisma('2. deney (2)', 2, { no: 2 });
    const a = arastirma(plan('para', { calismalar: [bir, iki] }));
    let t = tablo(a, [...paraSatirlari('1. deney (3)', 3, 3), ...paraSatirlari('2. deney (2)', 2, 0)]);
    expect(ozetTablosu(t, a).satirlar.map((r) => r.hucreler.slice(0, 4))).toEqual([
      ['1. deney (3)', '3', '3', '100'],
      ['2. deney (2)', '2', '0', '0'],
    ]);
    t = satirSil(satirSil(t, 4), 3);
    t = satirSil(t, 0);
    expect(ozetTablosu(t, a).satirlar.map((r) => r.hucreler.slice(0, 4))).toEqual([['1. deney (3)', '2', '2', '100']]);
  });

  it('izlenen sonuç değişince özet yeniden hesaplanır', () => {
    const bir = calisma('1. deney (20)', 20);
    const a = arastirma(plan('para', { calismalar: [bir] }));
    const t = tablo(a, paraSatirlari('1. deney (20)', 20, 11));
    const yazi: Arastirma = { ...a, deney: { ...a.deney, izlenen: 'Yazı' } };
    const oz = ozetTablosu(t, yazi);
    expect(oz.sutunlar[2].ad).toBe('Yazı: sayı');
    expect(oz.satirlar[0].hucreler).toEqual(['1. deney (20)', '20', '9', '45', '50']);
  });

  it('sayı küplerinde sütun adı sayılan sonuçla; tablodaki güncel ad kullanılır', () => {
    const bir = calisma('1. deney (4)', 4);
    const iki = arastirma(plan('iki-zar', { calismalar: [bir] }), false);
    const t = tablo(iki, [['1', '6', '7'], ['3', '4', '7'], ['2', '2', '4'], ['6', '6', '12']]);
    const oz = ozetTablosu(t, iki);
    expect(oz.sutunlar[2].ad).toBe('Toplam 7: sayı');
    expect(oz.satirlar[0].hucreler).toEqual(['1. deney (4)', '4', '2', '50', '16,7']);
    const zar = arastirma(plan('zar', { calismalar: [bir] }), false);
    const zt = sutunAdiDegistir(tablo(zar, [['6'], ['6'], ['1'], ['2']]), 0, 'Küp');
    expect(ozetSutunlari(zt, zar)[3].ad).toBe('Küp 6: göreli sıklık (%)');
    expect(ozetTablosu(zt, zar).satirlar[0].hucreler).toEqual(['1. deney (4)', '4', '2', '50', '16,7']);
  });

  it('araştırma yoksa ya da yöntem deney değilse satır yok, sütunlar kurulur', () => {
    const bos: VeriTablosu = { sutunlar: [], satirlar: [] };
    const t = ozetTablosu(bos, null);
    expect(sutunIdleri(t)).toEqual(['oz-deney', 'oz-n', 'oz-sayi', 'oz-oran', 'oz-teorik']);
    expect(t.satirlar).toEqual([]);
    const a = arastirma(plan('para', { calismalar: [calisma('1. deney (20)', 20, { tabloda: false, sayilar: { Tura: 10, Yazı: 10 } })] }));
    expect(ozetTablosu(bos, a).satirlar).toHaveLength(1);
    expect(ozetTablosu(bos, { ...a, yontem: 'anket' }).satirlar).toEqual([]);
  });

  it('özet tablosunda Deney sütunu değişken sayılmaz; sayılar değişkendir', () => {
    const a = arastirma(plan('para', { calismalar: [calisma('1. deney (20)', 20, { tabloda: false, sayilar: { Tura: 9 } }), calisma('2. deney (50)', 50, { no: 2, tabloda: false, sayilar: { Tura: 26 } })] }));
    const oz = ozetTablosu({ sutunlar: [], satirlar: [] }, a);
    expect(degiskenSutunlari(oz).map((s) => s.id)).toEqual(['oz-n', 'oz-sayi', 'oz-oran', 'oz-teorik']);
    expect(oz.satirlar.map((r) => r.hucreler[3])).toEqual(['45', '52']);
  });

  it('aynı numaralı çalışmalarda satır kimlikleri tekil kalır', () => {
    const a = arastirma(plan('para', { calismalar: [calisma('1. deney (20)', 20, { tabloda: false, sayilar: { Tura: 9 } }), calisma('1. deney (20) ', 20, { tabloda: false, sayilar: { Tura: 12 } })] }));
    const ids = ozetTablosu({ sutunlar: [], satirlar: [] }, a).satirlar.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── B1-b: çalışmaların yaşamı, atış seçenekleri, metinler ─────────────────────

/** Deney sütunu henüz olmayan, plan uygulanmış boş tablo */
function bosDeney(d: DeneyPlani): { a: Arastirma; t: VeriTablosu } {
  const a = arastirma(d, false);
  return { a, t: tablo(a, []) };
}

describe('deney: çalışma başlatma ve etiketler', () => {
  it('sonrakiDeneyNo ve tabloyaYazilirMi', () => {
    expect(sonrakiDeneyNo([])).toBe(1);
    expect(sonrakiDeneyNo([calisma('Gerçek atışlar', 3, { no: 0, gercek: true }), calisma('1. deney (20)', 20), calisma('3. deney (20)', 20, { no: 3 })])).toBe(4);
    expect(tabloyaYazilirMi(499, 0)).toBe(true);
    expect(tabloyaYazilirMi(500, 0)).toBe(false);
    expect(tabloyaYazilirMi(20, 1980)).toBe(true);
    expect(tabloyaYazilirMi(20, 1990)).toBe(false);
  });

  it('deneyEtiketi ve deneyEtiketiDuzelt: "3. deney (20)" durdurulunca "3. deney (14)"', () => {
    const c = calisma('3. deney (20)', 14, { no: 3 });
    expect(deneyEtiketiDuzelt(c).etiket).toBe('3. deney (14)');
    const tam = calisma('3. deney (20)', 20, { no: 3 });
    expect(deneyEtiketiDuzelt(tam)).toBe(tam);
    const g = calisma('Gerçek atışlar', 5, { no: 0, gercek: true });
    expect(deneyEtiketiDuzelt(g)).toBe(g);
  });

  it('deneyCalismasiBaslat: simülasyon numarası, 500 atışta tabloya yazılmaz, gerçek atışlar tektir', () => {
    const { a } = bosDeney(plan('para'));
    const r1 = deneyCalismasiBaslat(a, 'simulasyon', 20, 0)!;
    expect(r1.no).toBe(1);
    expect(r1.arastirma.deney.calismalar).toEqual([{ no: 1, etiket: '1. deney (20)', n: 0, sayilar: {}, tabloda: true, gercek: false }]);
    const r2 = deneyCalismasiBaslat(r1.arastirma, 'simulasyon', 500, 20)!;
    expect(r2.no).toBe(2);
    expect(r2.arastirma.deney.calismalar[1]).toMatchObject({ etiket: '2. deney (500)', tabloda: false });
    expect(deneyCalismasiBaslat(r1.arastirma, 'simulasyon', 20, 1990)!.arastirma.deney.calismalar[1].tabloda).toBe(false);
    const g = deneyCalismasiBaslat(r1.arastirma, 'gercek', 20, 0)!;
    expect(g.no).toBe(0);
    expect(g.arastirma.deney.calismalar[1]).toEqual({ no: 0, etiket: 'Gerçek atışlar', n: 0, sayilar: {}, tabloda: true, gercek: true });
    expect(deneyCalismasiBaslat(g.arastirma, 'gercek', 20, 0)!.arastirma).toBe(g.arastirma);
    expect(deneyCalismasiBaslat(a, 'simulasyon', 20, 0, 5)!.no).toBe(5);
    expect(deneyCalismasiBaslat(r1.arastirma, 'simulasyon', 20, 0, 1)!.arastirma).toBe(r1.arastirma);
    const dolu = { ...a, deney: { ...a.deney, calismalar: Array.from({ length: 200 }, (_, i) => calisma(`${i + 1}. deney (20)`, 20, { no: i + 1 })) } };
    expect(deneyCalismasiBaslat(dolu, 'simulasyon', 20, 0)).toBeNull();
  });
});

describe('deney: satır ekleme (deneySatirlariEkle)', () => {
  it('ilk çalışmada Deney sütunu yok; sayılar güncellenir', () => {
    const { a, t } = bosDeney(plan('para'));
    const { arastirma: a1 } = deneyCalismasiBaslat(a, 'simulasyon', 20, 0)!;
    const r = deneySatirlariEkle(t, a1, 1, [['Tura'], ['Yazı'], ['Tura']], ['k1', 'k2', 'k3']);
    expect(r.tablo.sutunlar.map((s) => s.ad)).toEqual(['Para']);
    expect(r.tablo.satirlar).toEqual([
      { id: 'k1', hucreler: ['Tura'] },
      { id: 'k2', hucreler: ['Yazı'] },
      { id: 'k3', hucreler: ['Tura'] },
    ]);
    expect(r.kimlikler).toEqual(['k1', 'k2', 'k3']);
    expect(r.tasan).toBe(0);
    expect(r.arastirma.deney.calismalar[0]).toMatchObject({ n: 3, sayilar: { Tura: 2, Yazı: 1 } });
    expect(r.arastirma.sutunlar!.deney).toBeUndefined();
    // girdiler değişmez
    expect(t.satirlar).toEqual([]);
    expect(a1.deney.calismalar[0].n).toBe(0);
  });

  it('ikinci çalışmada Deney sütunu eklenir ve eski satırlar kendi etiketini alır', () => {
    const { a, t } = bosDeney(plan('para'));
    let x = deneyCalismasiBaslat(a, 'simulasyon', 20, 0)!.arastirma;
    let r = deneySatirlariEkle(t, x, 1, [['Tura'], ['Yazı']]);
    x = deneyCalismasiBaslat(r.arastirma, 'simulasyon', 20, r.tablo.satirlar.length)!.arastirma;
    r = deneySatirlariEkle(r.tablo, x, 2, [['Yazı']]);
    expect(r.tablo.sutunlar.map((s) => [s.ad, s.tur])).toEqual([['Para', 'etiket'], ['Deney', 'etiket']]);
    expect(r.tablo.satirlar.map((s) => s.hucreler)).toEqual([
      ['Tura', '1. deney (20)'],
      ['Yazı', '1. deney (20)'],
      ['Yazı', '2. deney (20)'],
    ]);
    expect(r.arastirma.sutunlar!.deney).toBe(arastirmaSutunKimligi(a.kimlik, 'deney'));
    expect(r.tablo.sutunlar[1].id).toBe(r.arastirma.sutunlar!.deney);
    expect(calismaSayilari(r.tablo, r.arastirma, r.arastirma.deney.calismalar[0])).toMatchObject({ n: 2, kaynak: 'tablo' });
    expect(degiskenSutunlari(r.tablo).map((s) => s.ad)).toEqual(['Para', 'Deney']);
  });

  it('gerçek + simülasyon: gerçek atışlar "Gerçek atışlar" etiketini alır; bilinmeyen çalışma kurulur', () => {
    const { a, t } = bosDeney(plan('torba'));
    let r = deneySatirlariEkle(t, a, 0, [['Kırmızı'], ['Mavi']]);
    expect(r.arastirma.deney.calismalar).toEqual([{ no: 0, etiket: 'Gerçek çekişler', n: 2, sayilar: { Kırmızı: 1, Mavi: 1 }, tabloda: true, gercek: true }]);
    r = deneySatirlariEkle(r.tablo, r.arastirma, 1, [['Kırmızı']]);
    expect(r.arastirma.deney.calismalar[1]).toMatchObject({ no: 1, etiket: '1. deney (1)', n: 1 });
    expect(r.tablo.satirlar.map((s) => s.hucreler[1])).toEqual(['Gerçek çekişler', 'Gerçek çekişler', '1. deney (1)']);
    // gerçek atışlara dönülünce etiketiyle yazılır
    r = deneySatirlariEkle(r.tablo, r.arastirma, 0, [['Mavi']]);
    expect(r.tablo.satirlar[3].hucreler).toEqual(['Mavi', 'Gerçek çekişler']);
    expect(ozetTablosu(r.tablo, r.arastirma).satirlar.map((s) => s.hucreler.slice(0, 3))).toEqual([
      ['Gerçek çekişler', '3', '1'],
      ['1. deney (1)', '1', '1'],
    ]);
  });

  it('iki küpte üç sonuç sütunu yazılır, Toplam sayılır; kullanıcının ek sütunu boş kalır', () => {
    const { a, t } = bosDeney(plan('iki-zar'));
    const ek: VeriTablosu = { sutunlar: [...t.sutunlar, { id: 'not', ad: 'Not', tur: 'etiket' }], satirlar: [] };
    const r = deneySatirlariEkle(ek, a, 1, [['1', '6', '7'], ['3', '4', '7'], ['2', '2', '4']]);
    expect(r.tablo.satirlar.map((s) => s.hucreler)).toEqual([
      ['1', '6', '7', ''],
      ['3', '4', '7', ''],
      ['2', '2', '4', ''],
    ]);
    expect(r.arastirma.deney.calismalar[0].sayilar).toEqual({ '7': 2, '4': 1 });
  });

  it('500 atışlık çalışma tabloya yazılmaz, yalnız kaydı güncellenir', () => {
    const { a, t } = bosDeney(plan('para'));
    const x = deneyCalismasiBaslat(a, 'simulasyon', 500, 0)!.arastirma;
    const satirlar = Array.from({ length: 500 }, (_, i) => [i % 2 === 0 ? 'Tura' : 'Yazı']);
    const r = deneySatirlariEkle(t, x, 1, satirlar);
    expect(r.tablo).toBe(t);
    expect(r.kimlikler).toEqual([]);
    expect(r.arastirma.deney.calismalar[0]).toMatchObject({ n: 500, sayilar: { Tura: 250, Yazı: 250 }, tabloda: false });
    expect(ozetTablosu(t, r.arastirma).satirlar[0].hucreler).toEqual(['1. deney (500)', '500', '250', '50', '50']);
  });

  it('2000 satır sınırı: taşan satırlar yazılmaz, çalışma tablodan çıkar', () => {
    const { a, t } = bosDeney(plan('para'));
    const dolu: VeriTablosu = { ...t, satirlar: Array.from({ length: EN_COK_TABLO_SATIRI - 2 }, (_, i) => ({ id: `e${i}`, hucreler: ['Tura'] })) };
    const x = deneyCalismasiBaslat(a, 'gercek', 20, 0)!.arastirma;
    const r = deneySatirlariEkle(dolu, x, 0, [['Tura'], ['Yazı'], ['Tura'], ['Tura'], ['Yazı']]);
    expect(r.tablo.satirlar).toHaveLength(EN_COK_TABLO_SATIRI);
    expect(r.tasan).toBe(3);
    expect(r.arastirma.deney.calismalar[0]).toMatchObject({ n: 5, tabloda: false, sayilar: { Tura: 3, Yazı: 2 } });
  });

  it('plan uygulanmamış araştırmada satır yazılmaz', () => {
    const a = { ...varsayilanArastirma(), yontem: 'deney' as const };
    const t: VeriTablosu = { sutunlar: [], satirlar: [] };
    const r = deneySatirlariEkle(t, a, 1, [['Tura']]);
    expect(r.tablo).toBe(t);
    expect(r.arastirma.deney.calismalar[0].n).toBe(1);
  });
});

describe('deney: çalışmayı bitirme, silme ve sayıları eşitleme', () => {
  function ikiCalisma() {
    const { a, t } = bosDeney(plan('para'));
    let x = deneyCalismasiBaslat(a, 'simulasyon', 20, 0)!.arastirma;
    let r = deneySatirlariEkle(t, x, 1, [['Tura'], ['Yazı'], ['Tura']]);
    x = deneyCalismasiBaslat(r.arastirma, 'simulasyon', 20, 3)!.arastirma;
    r = deneySatirlariEkle(r.tablo, x, 2, [['Yazı'], ['Yazı']]);
    return r;
  }

  it('deneyCalismasiBitir: durdurulan deney gerçek sayısıyla yeniden etiketlenir, hücreler de değişir', () => {
    const r = ikiCalisma();
    const b = deneyCalismasiBitir(r.tablo, r.arastirma, 2);
    expect(b.calisma!.etiket).toBe('2. deney (2)');
    expect(b.tablo.satirlar.map((s) => s.hucreler[1])).toEqual(['1. deney (20)', '1. deney (20)', '1. deney (20)', '2. deney (2)', '2. deney (2)']);
    expect(ozetTablosu(b.tablo, b.arastirma).satirlar.map((s) => s.hucreler.slice(0, 2))).toEqual([
      ['1. deney (20)', '3'],
      ['2. deney (2)', '2'],
    ]);
    // gerçek ve bilinmeyen numara değişmez; atışsız deney silinir
    expect(deneyCalismasiBitir(r.tablo, r.arastirma, 9).arastirma).toBe(r.arastirma);
    const bos = deneyCalismasiBaslat(r.arastirma, 'simulasyon', 20, 5)!.arastirma;
    const s = deneyCalismasiBitir(r.tablo, bos, 3);
    expect(s.calisma).toBeNull();
    expect(s.arastirma.deney.calismalar).toHaveLength(2);
    const g = deneySatirlariEkle(r.tablo, r.arastirma, 0, [['Tura']]);
    expect(deneyCalismasiBitir(g.tablo, g.arastirma, 0).arastirma).toBe(g.arastirma);
  });

  it('deneyCalismasiSil: çalışmanın bütün satırları ve kaydı silinir', () => {
    const r = ikiCalisma();
    const s = deneyCalismasiSil(r.tablo, r.arastirma, 2);
    expect(s.silinen).toBe(2);
    expect(s.tablo.satirlar.map((x) => x.hucreler)).toEqual([
      ['Tura', '1. deney (20)'],
      ['Yazı', '1. deney (20)'],
      ['Tura', '1. deney (20)'],
    ]);
    expect(s.arastirma.deney.calismalar.map((c) => c.no)).toEqual([1]);
    expect(deneyCalismasiSil(r.tablo, r.arastirma, 7).tablo).toBe(r.tablo);
    // Deney sütunu yokken tek çalışma bütün satırlarını götürür
    const { a, t } = bosDeney(plan('para'));
    const tek = deneySatirlariEkle(t, deneyCalismasiBaslat(a, 'simulasyon', 20, 0)!.arastirma, 1, [['Tura'], ['Yazı']]);
    expect(deneyCalismasiSil(tek.tablo, tek.arastirma, 1).tablo.satirlar).toEqual([]);
  });

  it('calismalariTablodanGuncelle: silinen satır saklı sayılara yansır', () => {
    const r = ikiCalisma();
    expect(calismalariTablodanGuncelle(r.tablo, r.arastirma)).toBe(r.arastirma);
    const kalan = satirSil(r.tablo, 0);
    const g = calismalariTablodanGuncelle(kalan, r.arastirma);
    expect(g.deney.calismalar[0]).toMatchObject({ n: 2, sayilar: { Yazı: 1, Tura: 1 } });
    expect(g.deney.calismalar[1]).toBe(r.arastirma.deney.calismalar[1]);
  });
});

describe('deney: sıklıklar ve toplam atış', () => {
  it('deneySikliklari: tümü, tek çalışma, nesne dışı yazım; teorik yalnız gösterilirken', () => {
    const bir = calisma('1. deney (20)', 20);
    const buyuk = calisma('2. deney (500)', 500, { no: 2, tabloda: false, sayilar: { Tura: 243, Yazı: 257 } });
    const a = arastirma(plan('para', { calismalar: [bir, buyuk] }));
    const t = tablo(a, [...paraSatirlari('1. deney (20)', 19, 11), ['tura', '1. deney (20)']]);
    const hepsi = deneySikliklari(t, a, 'tumu');
    expect(hepsi.n).toBe(520);
    expect(hepsi.satirlar).toEqual([
      { deger: 'Yazı', sayi: 265, oran: 265 / 520, teorik: 0.5 },
      { deger: 'Tura', sayi: 254, oran: 254 / 520, teorik: 0.5 },
      { deger: 'tura', sayi: 1, oran: 1 / 520, teorik: null },
    ]);
    expect(deneySikliklari(t, a, 1).n).toBe(20);
    expect(deneySikliklari(t, a, 2).satirlar[1].sayi).toBe(243);
    expect(deneySikliklari(t, a, 0).n).toBe(0);
    const kapali = { ...a, deney: { ...a.deney, teorikGoster: false } };
    expect(deneySikliklari(t, kapali, 1).satirlar.every((s) => s.teorik === null)).toBe(true);
    expect(toplamAtis(t, a)).toBe(520);
  });

  it('çalışma yokken tablodaki satırlar sayılır; sayı küpünde bütün yüzler sırayla', () => {
    const a = arastirma(plan('zar'), false);
    const t = tablo(a, [['6'], ['6'], ['1'], ['']]);
    const s = deneySikliklari(t, a, 'tumu');
    expect(s.n).toBe(3);
    expect(s.satirlar.map((x) => [x.deger, x.sayi])).toEqual([['1', 1], ['2', 0], ['3', 0], ['4', 0], ['5', 0], ['6', 2]]);
    expect(toplamAtis(t, a)).toBe(3);
  });
});

describe('deney: atış seçenekleri ve torba', () => {
  it('atisSecenekleri: normalde 6 çip; geri atmadan 5 top → 1…5; 20 top → 1, 2, 3, 5, 10, 20', () => {
    expect(atisSecenekleri(plan('para'))).toEqual([10, 20, 30, 50, 100, 200]);
    // hazır soruların atış sayıları (10 penaltı, 30 sayı küpü, 100 iki küp) çiptir; çipte olmayan sayı en yakın çipin yerine geçer
    for (const n of [10, 20, 30, 100]) expect(atisSecenekleri(plan('cark', { atisSayisi: n }))).toContain(n);
    expect(atisSecenekleri(plan('para', { atisSayisi: 15 }))).toEqual([10, 15, 30, 50, 100, 200]);
    expect(atisSecenekleri(plan('para', { atisSayisi: 300 }))).toEqual([10, 20, 30, 50, 100, 300]);
    // Tabloya yazılmayacak sayı (≥ 500) çip olmaz
    expect(atisSecenekleri(plan('para', { atisSayisi: 1000 }))).toEqual([10, 20, 30, 50, 100, 200]);
    const torba = (adetler: number[], geriAt = false) => plan('torba', { torba: { toplar: adetler.map((adet, i) => ({ etiket: `R${i}`, adet })), geriAt } });
    expect(atisSecenekleri(torba([3, 2]))).toEqual([1, 2, 3, 4, 5]);
    expect(atisSecenekleri(torba([12, 8]))).toEqual([1, 2, 3, 5, 10, 20]);
    expect(atisSecenekleri(torba([5, 4]))).toEqual([1, 2, 3, 5, 9]);
    expect(atisSecenekleri(torba([3, 2], true))).toHaveLength(6);
    expect(atisSecenekleri(torba([0]))).toEqual([]);
    expect(enCokAtis(torba([3, 2]))).toBe(5);
    expect(enCokAtis(plan('zar'))).toBe(EN_COK_ATIS);
    expect(atisSiniriMetni(torba([3, 2]))).toBe('Torbada 5 top var: geri atmadan en çok 5 çekiş yapılabilir.');
    expect(atisSiniriMetni(plan('para'))).toBeNull();
    expect(torbadakiTopSayisi(plan('torba', { torba: { toplar: [{ etiket: 'Kırmızı', adet: 3 }, { etiket: '', adet: 4 }, { etiket: 'Mavi', adet: 2.7 }], geriAt: true } }))).toBe(5);
  });

  it('torba metinleri ve torbada kalan toplar', () => {
    const p = plan('torba', { torba: { toplar: [{ etiket: 'Kırmızı', adet: 3 }, { etiket: 'Mavi', adet: 2 }], geriAt: false } });
    expect(torbaMetni(p.torba.toplar)).toBe('Torbada 5 top: 3 kırmızı, 2 mavi');
    expect(torbaMetni([])).toBe('Torbada top yok');
    const kalan = torbadaKalan(p, ['Kırmızı', 'Mavi', 'Yeşil']);
    expect(kalan).toEqual([{ etiket: 'Kırmızı', adet: 2 }, { etiket: 'Mavi', adet: 1 }]);
    expect(kalanMetni(kalan)).toBe('Torbada kalan: 2 kırmızı, 1 mavi');
    expect(kalanMetni(torbadaKalan(p, ['Kırmızı', 'Kırmızı', 'Kırmızı', 'Kırmızı', 'Mavi', 'Mavi']))).toBe('Torbada top kalmadı');
  });

  it('teorikMetni: Plan ve Topla metinleri', () => {
    expect(teorikMetni(plan('para'))).toBe('Teorik olasılık: Tura 1/2 = %50');
    expect(teorikMetni(plan('zar'))).toBe('Teorik olasılık: 6 gelmesi 1/6 = %16,7');
    expect(teorikMetni(plan('zar'), 'her')).toBe('Teorik olasılık: her yüz 1/6 = %16,7');
    expect(teorikMetni(plan('para'), 'her')).toBe('Teorik olasılık: her yüz 1/2 = %50');
    expect(teorikMetni(plan('iki-zar'))).toBe('Teorik olasılık: toplamın 7 olması 6/36 = %16,7');
    expect(teorikMetni(plan('torba'))).toBe('Teorik olasılık: Kırmızı 3/5 = %60');
    expect(teorikMetni(plan('torba', { torba: { toplar: [{ etiket: 'Kırmızı', adet: 3 }, { etiket: 'Mavi', adet: 2 }], geriAt: false } }))).toBe(
      'İlk çekişte kırmızı 3/5 = %60; sonraki çekişlerde değişir.',
    );
    expect(teorikMetni(plan('cark', { cark: { degiskenAdi: 'Cevap', dilimler: [{ etiket: 'Evet', yuzde: 60 }, { etiket: 'Hayır', yuzde: 40 }] }, izlenen: 'Evet' }))).toBe('Teorik olasılık: Evet 3/5 = %60');
  });
});

describe('deney: arayüz metinleri', () => {
  it('fiile göre ekler, düğme ve başlıklar', () => {
    expect((['atış', 'çevirme', 'çekiş'] as const).map(fiilBulunma)).toEqual(['atışta', 'çevirmede', 'çekişte']);
    expect((['atış', 'çevirme', 'çekiş'] as const).map(fiilCogul)).toEqual(['atışlar', 'çevirmeler', 'çekişler']);
    expect((['atış', 'çevirme', 'çekiş'] as const).map(fiilIle)).toEqual(['atışla', 'çevirmeyle', 'çekişle']);
    expect([eylemMetni('para', 20), eylemMetni('cark', 20), eylemMetni('torba', 20), eylemMetni('iki-zar', 100)]).toEqual(['20 kez at', '20 kez çevir', '20 top çek', '100 kez at']);
    expect(DENEY_NESNELERI.map(sahneEtiketi)).toEqual(['Parayı bir kez at', 'Sayı küpünü bir kez at', 'Sayı küplerini bir kez at', 'Çarkı bir kez çevir', 'Torbadan bir top çek']);
    expect(DENEY_NESNELERI.map(kacAtisBasligi)).toEqual(['KAÇ ATIŞ?', 'KAÇ ATIŞ?', 'KAÇ ATIŞ?', 'KAÇ ÇEVİRME?', 'KAÇ ÇEKİŞ?']);
    expect([sonAtisBasligi('para', 12), sonAtisBasligi('cark', 3), sonAtisBasligi('torba', 1)]).toEqual(['Son atış (12.)', 'Son çevirme (3.)', 'Son çekiş (1.)']);
    expect(deneyDurumMetni({ no: 2, gercek: false, etiket: '2. deney (50)' }, 27, 50)).toBe('2. deney · 27 / 50');
    expect(deneyDurumMetni({ no: 0, gercek: true, etiket: 'Gerçek atışlar' }, 27, 20)).toBe('Gerçek atışlar · 27');
  });

  it('tost metinleri', () => {
    expect(tabloDoluMetni('para')).toBe('Tablo dolu (2000 satır): yeni atışlar yalnız Deney özetine yazılır.');
    expect(tabloDoluMetni('torba')).toBe('Tablo dolu (2000 satır): yeni çekişler yalnız Deney özetine yazılır.');
    expect(tamamlandiMetni(plan('para'), 20, 11)).toBe('20 atış tamamlandı: Tura 11 (%55).');
    expect(tamamlandiMetni(plan('zar'), 30, 5)).toBe('30 atış tamamlandı: 6 sayısı 5 kez geldi (%16,7).');
    expect(tamamlandiMetni(plan('iki-zar'), 100, 17)).toBe('100 atış tamamlandı: toplam 7, 17 kez geldi (%17).');
    expect(tamamlandiMetni(plan('cark', { izlenen: 'Mavi' }), 20, 6)).toBe('20 çevirme tamamlandı: Mavi 6 (%30).');
    expect(durdurulduMetni('para', { n: 14, etiket: '2. deney (14)' })).toBe('Durduruldu: 14 atış. Deney “2. deney (14)” olarak kaydedildi.');
    expect(torbaBosaldiMetni(5)).toBe('Torba boşaldı: bu deneyde 5 top çekilebildi.');
    expect(calismaSilindiMetni('para', { no: 2, n: 50, etiket: '2. deney (50)', gercek: false })).toBe('2. deney silindi (50 atış).');
    expect(calismaSilindiMetni('para', { no: 0, n: 27, etiket: 'Gerçek atışlar', gercek: true })).toBe('Gerçek atışlar silindi (27 atış).');
    expect(seriBittiMetni(7)).toBe('Seri tamamlandı: 7 deney özete yazıldı.');
  });

  it('metinlerde eski terim, emoji ve rakamdan sonra kesme işareti yok', () => {
    const metinler = [
      ...DENEY_NESNELERI.flatMap((n) => [eylemMetni(n, 20), sahneEtiketi(n), kacAtisBasligi(n), sonAtisBasligi(n, 3), tabloDoluMetni(n), teorikMetni(plan(n)), gercekEtiketi(n)]),
      tamamlandiMetni(plan('para'), 20, 11),
      durdurulduMetni('cark', { n: 4, etiket: '3. deney (4)' }),
      torbaBosaldiMetni(5),
      seriBittiMetni(7),
      torbaMetni(plan('torba').torba.toplar),
      atisSiniriMetni(plan('torba', { torba: { toplar: [{ etiket: 'Kırmızı', adet: 3 }], geriAt: false } }))!,
    ];
    for (const m of metinler) {
      expect(m).not.toMatch(/[Çç]ekiliş|Aygıt|Karıştırıcı|İadeli|İadesiz|[Kk]uramsal|\bZar\b|n = \d/);
      expect(m).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(m).not.toMatch(/\d'/);
    }
  });
});
