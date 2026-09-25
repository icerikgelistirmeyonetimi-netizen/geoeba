// Sahip: B1 (vg/arastirma.ts: türler, doğrulama, hazır sorular, plan, sayım, Düzenle ve Yorumla yardımcıları)
import { describe, expect, it } from 'vitest';
import {
  ARASTIRMA_ADIMLARI,
  ARASTIRMA_ROLLERI,
  EN_COK_CALISMA,
  EN_AZ_DILIM,
  EN_AZ_GRUP,
  EN_AZ_SECENEK,
  EN_COK_DILIM,
  EN_COK_GRUP,
  EN_COK_RENK,
  EN_COK_SECENEK,
  EN_COK_TORBA_TOPU,
  HAZIR_SORULAR,
  HIZ_SECIMLERI,
  OLCME_DUYARLIKLARI,
  METIN_SINIRI,
  TOPLAMA_YONTEMLERI,
  YONTEM_BILGISI,
  adimNotu,
  anketSatiri,
  anketSayisalMi,
  anketSecenekleri,
  arastirmaBagli,
  arastirmaDogrula,
  arastirmaEksenAlani,
  arastirmaKategoriSiralari,
  arastirmaKimligiUret,
  arastirmaSutunKimligi,
  arastirmaSutunRolu,
  arastirmaSutunu,
  arastirmaTabloAdi,
  arastirmaTurleriniOnar,
  beklenenUyarisi,
  bosGrafikIpucu,
  bosTabloIletisi,
  csvAdi,
  grafikOnerileri,
  grupSecenekleri,
  hazirSoruBul,
  hazirSoruUygula,
  hizliListeAyristir,
  listeOnizlemeMetni,
  olcumDegeri,
  olcumDuzenBilgisi,
  olcumEksenPenceresi,
  olcumHucresi,
  olcumMetni,
  olcumSatirlari,
  planGrubu,
  planSorunu,
  planSutunAdi,
  planSutunTuru,
  planSutunlari,
  planTablosu,
  secenekDisiYazimlar,
  secenekEkle,
  secenekSayilari,
  secenekYenidenAdlandir,
  soruSeridiBilgisi,
  tablodakiAtis,
  tumceIciAdi,
  planSorusu,
  tartismaSorulari,
  toplamaYEnAz,
  toplananMetni,
  toplananSayisi,
  ucDegerler,
  varsayilanArastirma,
  yuvarlamaNotu,
  varsayilanGrup,
  veriRolleri,
  yazimBirlestir,
  yorumCumleleri,
  type Arastirma,
  type SutunRolu,
} from '../arastirma';
import { ARASTIRMA_ROLLERI as KATEGORIK_ROLLERI, arastirmaSutunRolu as kategorikRolu, degiskenSutunlari } from '../kategorik';
import { EN_COK_ATIS, etkinIzlenen, nesneDuzenegi, tekDeneyAtisi, varsayilanDeneyPlani } from '../deney';
import { aygitSorunu } from '../ornekleyici';
import { sutunAdiDegistir, sutunSil, tabloDogrula, type VeriTablosu } from '../veri';
import { HAZIR_SIMGE_ADLARI } from '../toplama/simgeler';

/** Plan uygulanmış, veri toplanmış bir deney araştırması (bütün alanlar dolu) */
function doluArastirma(): Arastirma {
  const a = varsayilanArastirma();
  return {
    ...a,
    hazirId: 'para',
    soru: 'Madenî parayı 20 kez atarsak kaç kez tura gelir?',
    kimden: '6-A sınıfı',
    yontem: 'deney',
    adim: 'duzenle',
    tahmin: '10',
    sonuc: 'Tura yaklaşık yarı yarıya geldi.',
    anket: { degiskenAdi: 'Meyve', secenekler: ['Elma', 'Muz', 'Çilek'], grup: { ad: 'Sınıf', secenekler: ['6-A', '6-B'], etkin: 1 } },
    olcum: { degiskenAdi: 'Nabız', birim: 'atım/dk', duyarlik: 0.5, adYaz: true, hedefSayi: 24, beklenen: [60, 120], grup: null },
    deney: {
      ...varsayilanDeneyPlani(),
      nesne: 'cark',
      kayit: 'gercek',
      atisSayisi: 50,
      hiz: 2,
      izlenen: 'Evet',
      teorikGoster: false,
      cark: { degiskenAdi: 'Cevap', dilimler: [{ etiket: 'Evet', yuzde: 60 }, { etiket: 'Hayır', yuzde: 40 }] },
      calismalar: [
        { no: 0, etiket: 'Gerçek çevirmeler', n: 12, sayilar: { Evet: 7, Hayır: 5 }, tabloda: true, gercek: true },
        { no: 1, etiket: '1. deney (500)', n: 500, sayilar: { Evet: 297, Hayır: 203 }, tabloda: false, gercek: false },
      ],
    },
    sutunlar: { s0: arastirmaSutunKimligi(a.kimlik, 's0'), deney: arastirmaSutunKimligi(a.kimlik, 'deney') },
  };
}

describe('araştırma: türler ve varsayılanlar', () => {
  it('varsayılan araştırma: Soru adımı, yöntem yok, plan uygulanmamış', () => {
    const a = varsayilanArastirma();
    expect(a.surum).toBe(1);
    expect(a.kimlik).toMatch(/^ar\d+-[a-z0-9]+$/);
    expect(a.adim).toBe('soru');
    expect(a.yontem).toBeNull();
    expect(a.sutunlar).toBeNull();
    expect(a.hazirId).toBeNull();
    expect([a.soru, a.kimden, a.tahmin, a.sonuc]).toEqual(['', '', '', '']);
    expect(a.anket).toEqual({ degiskenAdi: '', secenekler: ['', ''], grup: null });
    expect(a.olcum).toEqual({ degiskenAdi: '', birim: '', duyarlik: 1, adYaz: false, hedefSayi: null, beklenen: null, grup: null });
    expect(a.deney.nesne).toBe('para');
    expect(a.deney.kayit).toBe('simulasyon');
    expect(a.deney.atisSayisi).toBe(20);
    expect(a.deney.hiz).toBe('oto');
    expect(a.deney.izlenen).toBeNull();
    expect(a.deney.teorikGoster).toBe(true);
    expect(a.deney.torba).toEqual({ toplar: [{ etiket: 'Kırmızı', adet: 3 }, { etiket: 'Mavi', adet: 2 }], geriAt: true });
    expect(a.deney.cark.degiskenAdi).toBe('Çark');
    expect(a.deney.calismalar).toEqual([]);
  });

  it('her varsayılan yeni bir kimlik ve ayrı nesneler alır', () => {
    const a = varsayilanArastirma();
    const b = varsayilanArastirma();
    expect(a.kimlik).not.toBe(b.kimlik);
    a.anket.secenekler.push('Elma');
    a.deney.torba.toplar[0].adet = 9;
    expect(b.anket.secenekler).toEqual(['', '']);
    expect(b.deney.torba.toplar[0].adet).toBe(3);
  });

  it('kimlik sütun kimliği kalıbına uyar: her rol geri okunur', () => {
    for (let i = 0; i < 50; i++) {
      const k = arastirmaKimligiUret();
      for (const rol of ARASTIRMA_ROLLERI) expect(arastirmaSutunRolu(arastirmaSutunKimligi(k, rol))).toBe(rol);
    }
  });

  it('SutunRolu ve rol işlevi kategorik.ts ile aynıdır (yeniden dışa aktarım)', () => {
    expect(ARASTIRMA_ROLLERI).toBe(KATEGORIK_ROLLERI);
    expect(arastirmaSutunRolu).toBe(kategorikRolu);
    const rol: SutunRolu = 'cevap';
    expect(arastirmaSutunRolu(`ar7-x3k2-${rol}`)).toBe('cevap');
    expect(arastirmaSutunRolu('s1-abcd')).toBeNull();
  });

  it('boş anket ve deney tablosunda plan sütunları değişken sayılır (kategorikMi rol kuralı)', () => {
    const a = varsayilanArastirma();
    const anket: VeriTablosu = { sutunlar: [{ id: arastirmaSutunKimligi(a.kimlik, 'cevap'), ad: 'Meyve', tur: 'etiket' }], satirlar: [] };
    expect(degiskenSutunlari(anket).map((s) => s.ad)).toEqual(['Meyve']);
    const olcum: VeriTablosu = {
      sutunlar: [
        { id: arastirmaSutunKimligi(a.kimlik, 'ad'), ad: 'Öğrenci', tur: 'etiket' },
        { id: arastirmaSutunKimligi(a.kimlik, 'deger'), ad: 'Nabız (atım/dk)', tur: 'sayi' },
      ],
      satirlar: [{ id: 'r1', hucreler: ['Ali', '84'] }, { id: 'r2', hucreler: ['Ali', '90'] }],
    };
    expect(degiskenSutunlari(olcum).map((s) => s.ad)).toEqual(['Nabız (atım/dk)']);
  });

  it('sabit listeler ve varsayılan grup', () => {
    expect(TOPLAMA_YONTEMLERI).toEqual(['anket', 'olcum', 'deney']);
    expect(ARASTIRMA_ADIMLARI).toEqual(['soru', 'plan', 'topla', 'duzenle', 'yorum']);
    expect(METIN_SINIRI).toEqual({ soru: 140, kimden: 40, tahmin: 40, sonuc: 400, ad: 24 });
    expect(varsayilanGrup()).toEqual({ ad: 'Sınıf', secenekler: ['6-A', '6-B'], etkin: 0 });
    expect(OLCME_DUYARLIKLARI).toEqual([1, 0.5, 0.1]);
    expect(HIZ_SECIMLERI).toEqual(['oto', 0, 1, 2, 3]);
    expect([EN_AZ_SECENEK, EN_COK_SECENEK, EN_AZ_GRUP, EN_COK_GRUP]).toEqual([2, 12, 2, 6]);
    expect([EN_COK_RENK, EN_COK_TORBA_TOPU, EN_AZ_DILIM, EN_COK_DILIM]).toEqual([6, 60, 2, 12]);
  });
});

describe('araştırma: kalıcılık doğrulaması (arastirmaDogrula)', () => {
  it('nesne olmayan kayıt null döner, hata atmaz', () => {
    for (const ham of [null, undefined, 0, 42, NaN, 'araştırma', true, [], [varsayilanArastirma()], () => 1]) {
      expect(() => arastirmaDogrula(ham)).not.toThrow();
      expect(arastirmaDogrula(ham)).toBeNull();
    }
  });

  it('geçerli araştırma değişmeden geçer (varsayılan ve dolu)', () => {
    const v = varsayilanArastirma();
    expect(arastirmaDogrula(v)).toEqual(v);
    const d = doluArastirma();
    expect(arastirmaDogrula(d)).toEqual(d);
  });

  it('JSON gidiş-dönüşü: kaydedilen araştırma aynen geri okunur', () => {
    const d = doluArastirma();
    expect(arastirmaDogrula(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });

  it('boş nesne ve eksik alanlar varsayılana döner', () => {
    const a = arastirmaDogrula({})!;
    const v = varsayilanArastirma();
    expect(a).toEqual({ ...v, kimlik: a.kimlik });
    expect(a.kimlik).toMatch(/^ar\d+-[a-z0-9]+$/);
    const b = arastirmaDogrula({ kimlik: 'ar3-abcd', soru: 'Kaç kardeşimiz var?', yontem: 'anket' })!;
    expect(b.kimlik).toBe('ar3-abcd');
    expect(b.soru).toBe('Kaç kardeşimiz var?');
    expect(b.yontem).toBe('anket');
    expect(b.anket).toEqual(v.anket);
    expect(b.deney).toEqual(v.deney);
  });

  it('20 seçenek 12\'ye, 500 karakterlik soru 140\'a kırpılır', () => {
    const secenekler = Array.from({ length: 20 }, (_, i) => `Seçenek ${i + 1}`);
    const a = arastirmaDogrula({ soru: 'a'.repeat(500), anket: { degiskenAdi: 'Meyve', secenekler } })!;
    expect(a.soru).toHaveLength(140);
    expect(a.anket.secenekler).toHaveLength(EN_COK_SECENEK);
    expect(a.anket.secenekler[11]).toBe('Seçenek 12');
  });

  it('metinler sınırlarına kırpılır; vekil çiftleri bölünmez', () => {
    const a = arastirmaDogrula({
      kimden: 'k'.repeat(90),
      tahmin: 't'.repeat(90),
      sonuc: 's'.repeat(900),
      anket: { degiskenAdi: 'D'.repeat(60), secenekler: ['x'.repeat(60), 'Muz'] },
    })!;
    expect(a.kimden).toHaveLength(40);
    expect(a.tahmin).toHaveLength(40);
    expect(a.sonuc).toHaveLength(400);
    expect(a.anket.degiskenAdi).toHaveLength(24);
    expect(a.anket.secenekler[0]).toHaveLength(24);
    const cift = arastirmaDogrula({ soru: '\u{1F600}'.repeat(200) })!.soru;
    expect(Array.from(cift)).toHaveLength(140);
    expect(cift.endsWith('\u{1F600}')).toBe(true);
  });

  it('bilinmeyen yöntem null, bilinmeyen nesne para, bilinmeyen adım soru olur', () => {
    const a = arastirmaDogrula({ yontem: 'gozlem', adim: 'ucuncu', deney: { nesne: 'kutu' } })!;
    expect(a.yontem).toBeNull();
    expect(a.adim).toBe('soru');
    expect(a.deney.nesne).toBe('para');
    const b = arastirmaDogrula({ yontem: 'deney', deney: { nesne: 'iki-zar' } })!;
    expect(b.deney.nesne).toBe('iki-zar');
  });

  it('adım yöntemle ve plan durumuyla tutarlı olur', () => {
    const k = 'ar5-q1w2';
    expect(arastirmaDogrula({ kimlik: k, adim: 'topla' })!.adim).toBe('soru');
    expect(arastirmaDogrula({ kimlik: k, yontem: 'anket', adim: 'plan' })!.adim).toBe('plan');
    expect(arastirmaDogrula({ kimlik: k, yontem: 'anket', adim: 'yorum' })!.adim).toBe('plan');
    expect(arastirmaDogrula({ kimlik: k, yontem: 'anket', adim: 'yorum', sutunlar: { cevap: `${k}-cevap` } })!.adim).toBe('yorum');
  });

  it('sayısal alanlar: tam sayı, aralık ve geçerli değer', () => {
    const a = arastirmaDogrula({
      olcum: { duyarlik: 0.25, hedefSayi: 24.4, beklenen: [120, 60], adYaz: 'evet' },
      deney: { atisSayisi: 99999, hiz: 7, kayit: 'hayal', teorikGoster: 0 },
    })!;
    expect(a.olcum.duyarlik).toBe(1);
    expect(a.olcum.hedefSayi).toBe(24);
    expect(a.olcum.beklenen).toEqual([60, 120]);
    expect(a.olcum.adYaz).toBe(false);
    // Tabloya yazılmayacak kadar büyük tek deney (eski kayıt: 2000) en büyük çipe iner: grafik ve tablo boş kalmaz
    expect(a.deney.atisSayisi).toBe(tekDeneyAtisi(EN_COK_ATIS));
    expect(a.deney.atisSayisi).toBe(200);
    expect(a.deney.hiz).toBe('oto');
    expect(a.deney.kayit).toBe('simulasyon');
    expect(a.deney.teorikGoster).toBe(true);
    const b = arastirmaDogrula({ olcum: { duyarlik: 0.1, hedefSayi: 0, beklenen: [5, 5] }, deney: { atisSayisi: -3, hiz: 3 } })!;
    expect(b.olcum.duyarlik).toBe(0.1);
    expect(b.olcum.hedefSayi).toBeNull();
    expect(b.olcum.beklenen).toBeNull();
    expect(b.deney.atisSayisi).toBe(1);
    expect(b.deney.hiz).toBe(3);
    const c = arastirmaDogrula({ olcum: { beklenen: [Infinity, 3] }, deney: { atisSayisi: NaN } })!;
    expect(c.olcum.beklenen).toBeNull();
    expect(c.deney.atisSayisi).toBe(20);
  });

  it('grup: 2–6 seçenek, etkin indeks aralıkta; tek seçenekli grup kalkar', () => {
    const a = arastirmaDogrula({ anket: { secenekler: ['Evet', 'Hayır'], grup: { ad: 'Şube', secenekler: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], etkin: 12 } } })!;
    expect(a.anket.grup).toEqual({ ad: 'Şube', secenekler: ['A', 'B', 'C', 'D', 'E', 'F'], etkin: 5 });
    expect(arastirmaDogrula({ anket: { grup: { secenekler: ['6-A'] } } })!.anket.grup).toBeNull();
    expect(arastirmaDogrula({ olcum: { grup: 'Sınıf' } })!.olcum.grup).toBeNull();
    expect(arastirmaDogrula({ olcum: { grup: { secenekler: ['6-A', '6-B'] } } })!.olcum.grup).toEqual({ ad: 'Sınıf', secenekler: ['6-A', '6-B'], etkin: 0 });
  });

  it('seçenek listesi: metin olmayanlar atlanır, sayılar metne döner, en az iki satır kalır', () => {
    const a = arastirmaDogrula({ anket: { secenekler: [0, 1, null, { x: 1 }, 2] } })!;
    expect(a.anket.secenekler).toEqual(['0', '1', '2']);
    expect(arastirmaDogrula({ anket: { secenekler: ['Elma'] } })!.anket.secenekler).toEqual(['Elma', '']);
    expect(arastirmaDogrula({ anket: { secenekler: 'Elma' } })!.anket.secenekler).toEqual(['', '']);
  });

  it('torba en çok 6 renk ve 60 top; çark en çok 12 dilim, yüzde 0–100', () => {
    const toplar = Array.from({ length: 9 }, (_, i) => ({ etiket: `Renk ${i}`, adet: 25 }));
    const a = arastirmaDogrula({ deney: { nesne: 'torba', torba: { toplar, geriAt: false } } })!;
    expect(a.deney.torba.toplar).toHaveLength(6);
    expect(a.deney.torba.toplar.map((t) => t.adet)).toEqual([25, 25, 10, 0, 0, 0]);
    expect(a.deney.torba.geriAt).toBe(false);
    const dilimler = Array.from({ length: 15 }, (_, i) => ({ etiket: `D${i}`, yuzde: i === 0 ? 150 : i === 1 ? -5 : 'x' }));
    const b = arastirmaDogrula({ deney: { cark: { degiskenAdi: 'Penaltı', dilimler } } })!;
    expect(b.deney.cark.degiskenAdi).toBe('Penaltı');
    expect(b.deney.cark.dilimler).toHaveLength(12);
    expect(b.deney.cark.dilimler.slice(0, 3).map((d) => d.yuzde)).toEqual([100, 0, 0]);
    // tek dilimli çark ve boş torba varsayılana döner
    const c = arastirmaDogrula({ deney: { cark: { dilimler: [{ etiket: 'A', yuzde: 100 }] }, torba: { toplar: [] } } })!;
    expect(c.deney.cark.dilimler).toEqual(varsayilanDeneyPlani().cark.dilimler);
    expect(c.deney.torba.toplar).toEqual(varsayilanDeneyPlani().torba.toplar);
  });

  it('deney çalışmaları: bozuk öğeler atlanır, alanlar onarılır, en çok 200 çalışma', () => {
    const a = arastirmaDogrula({
      deney: {
        nesne: 'torba',
        calismalar: [
          null,
          'x',
          { gercek: true, no: 4, n: 6, sayilar: { Kırmızı: 4, Mavi: '2', Yeşil: 'çok', __proto__x: 1 } },
          { no: 2, n: 800, sayilar: [] },
          { no: 3.6, n: -4, etiket: 'Uzun'.repeat(20), tabloda: true },
        ],
      },
    })!;
    const [gercek, buyuk, bozuk] = a.deney.calismalar;
    expect(a.deney.calismalar).toHaveLength(3);
    expect(gercek).toEqual({ no: 0, etiket: 'Gerçek çekişler', n: 6, sayilar: { Kırmızı: 4, Mavi: 2, __proto__x: 1 }, tabloda: true, gercek: true });
    expect(buyuk).toEqual({ no: 2, etiket: '2. deney (800)', n: 800, sayilar: {}, tabloda: false, gercek: false });
    expect(bozuk.no).toBe(4);
    expect(bozuk.n).toBe(0);
    expect(bozuk.etiket).toHaveLength(40);
    expect(bozuk.tabloda).toBe(true);
    const cok = Array.from({ length: 250 }, (_, i) => ({ no: i + 1, etiket: `${i + 1}. deney (20)`, n: 20, sayilar: { Tura: 10, Yazı: 10 }, tabloda: true, gercek: false }));
    expect(arastirmaDogrula({ deney: { calismalar: cok } })!.deney.calismalar).toHaveLength(EN_COK_CALISMA);
  });

  it('sutunlar: yalnız rolüyle eşleşen kimlikler kalır; hiçbiri kalmazsa null', () => {
    const k = 'ar9-zz00';
    const a = arastirmaDogrula({
      kimlik: k,
      yontem: 'anket',
      sutunlar: { cevap: `${k}-cevap`, grup: `${k}-cevap`, ad: 42, deger: 'Boy', bilinmeyen: `${k}-deney` },
    })!;
    expect(a.sutunlar).toEqual({ cevap: `${k}-cevap` });
    expect(arastirmaDogrula({ sutunlar: { cevap: 'Meyve' } })!.sutunlar).toBeNull();
    expect(arastirmaDogrula({ sutunlar: [] })!.sutunlar).toBeNull();
  });

  it('geçersiz kimlik yenilenir; boş hazırId null olur', () => {
    const a = arastirmaDogrula({ kimlik: 'AR-1', hazirId: '' })!;
    expect(a.kimlik).not.toBe('AR-1');
    expect(a.kimlik).toMatch(/^ar\d+-[a-z0-9]+$/);
    expect(a.hazirId).toBeNull();
  });

  it('bozuk girdiler: hata atmaz, sonuç yeniden doğrulanınca değişmez', () => {
    const bozuklar: unknown[] = [
      {},
      { surum: 7, anket: null, olcum: 5, deney: 'para' },
      { anket: { secenekler: [[], {}, NaN] }, olcum: { beklenen: 'x' }, deney: { torba: 'x', cark: [] } },
      { deney: { calismalar: [{ sayilar: { a: Infinity, b: -3 } }], izlenen: 7 } },
      { adim: 'duzenle', yontem: 'olcum', sutunlar: { deger: 'ar1-x-deger' } },
      JSON.parse('{"deney":{"calismalar":[{"sayilar":{"__proto__":5,"Tura":3}}]}}'),
    ];
    for (const ham of bozuklar) {
      expect(() => arastirmaDogrula(ham)).not.toThrow();
      const a = arastirmaDogrula(ham)!;
      expect(a).not.toBeNull();
      expect(arastirmaDogrula(a)).toEqual(a);
      expect(arastirmaDogrula(JSON.parse(JSON.stringify(a)))).toEqual(a);
    }
    const proto = arastirmaDogrula(bozuklar[5])!;
    expect(Object.getPrototypeOf(proto.deney.calismalar[0].sayilar)).toBe(Object.prototype);
    expect(proto.deney.calismalar[0].sayilar).toEqual({ Tura: 3 });
    expect(arastirmaDogrula(bozuklar[3])!.deney.izlenen).toBe('7');
    expect(arastirmaDogrula(bozuklar[3])!.deney.calismalar[0].sayilar).toEqual({ b: 0 });
  });
});

// ── B1-b: plan, satırlar, sayım, Düzenle, Yorumla, görünüm ────────────────────

/** Planı uygulanmış kabul edilen araştırma: sütun kimlikleri plan sütunlarından */
function uygulanmis(a: Arastirma): Arastirma {
  const sutunlar: Arastirma['sutunlar'] = {};
  for (const s of planSutunlari(a)) sutunlar[arastirmaSutunRolu(s.id)!] = s.id;
  return { ...a, sutunlar, adim: 'topla' };
}

/** Plan tablosu + satırlar (satırlar veri rolleri sırasıyla, yani plan sütunlarının sırasıyla) */
function planVerisi(a: Arastirma, satirlar: string[][]): VeriTablosu {
  const t = planTablosu(a);
  return { ...t, satirlar: satirlar.map((hucreler, i) => ({ id: `r${i}`, hucreler })) };
}

/** n satır: önce her seçenekten verilen sayıda */
function tekrarla(sayilar: [string, number][], grup?: string): string[][] {
  const satirlar: string[][] = [];
  for (const [s, n] of sayilar) for (let i = 0; i < n; i++) satirlar.push(grup === undefined ? [s] : [s, grup]);
  return satirlar;
}

const BOYLAR = [145, 148, 150, 151, 152, 152, 153, 155, 157, 159];

/** Öğrenciye görünen metinlerde bulunmaması gereken eski terimler (terim sözlüğü §6) ve emoji */
const ESKI_TERIMLER = /Medyan|medyan|\bMod\b|[Ff]rekans|[Kk]uramsal|[Uu]ç değer|Örnekleyici|[Çç]ekiliş|İadeli|İadesiz|Deneyle topla|n = \d|Aygıt|Karıştırıcı|Sayı aralığı|\bZar\b|Madeni para|x̄|OMS/;
const EMOJI = /\p{Extended_Pictographic}/u;

function metinDenetle(metinler: readonly string[]) {
  for (const m of metinler) {
    expect(m, m).not.toMatch(ESKI_TERIMLER);
    expect(m, m).not.toMatch(EMOJI);
    expect(m, m).not.toMatch(/\d'/);
  }
}

describe('araştırma: hazır sorular (HAZIR_SORULAR)', () => {
  it('18 soru: 7 anket, 4 ölçüm, 7 deney; kimlikler benzersiz', () => {
    expect(HAZIR_SORULAR).toHaveLength(18);
    expect(new Set(HAZIR_SORULAR.map((h) => h.id)).size).toBe(18);
    const say = (y: string) => HAZIR_SORULAR.filter((h) => h.yontem === y).length;
    expect([say('anket'), say('olcum'), say('deney')]).toEqual([7, 4, 7]);
    expect(hazirSoruBul('oylama')!.acilis).toBe('plan');
    expect(hazirSoruBul('seri')!.acilis).toBe('duzenle');
    expect(hazirSoruBul('yok')).toBeUndefined();
    expect(hazirSoruBul(null)).toBeUndefined();
  });

  it('her kart geçerli bir araştırma kurar: doğrulamadan değişmeden geçer, plan sorunsuz', () => {
    for (const h of HAZIR_SORULAR) {
      const a = hazirSoruUygula(h.id)!;
      expect(a.hazirId).toBe(h.id);
      expect(a.soru).toBe(h.soru);
      expect(a.yontem).toBe(h.yontem);
      expect(a.adim).toBe('plan');
      expect(a.sutunlar).toBeNull();
      expect(arastirmaDogrula(a)).toEqual(a);
      expect(planSorunu(a)).toBeNull();
      expect(h.soru.length).toBeLessThanOrEqual(METIN_SINIRI.soru);
    }
    expect(hazirSoruUygula('yok')).toBeNull();
  });

  it('her deney kartının düzeneğinde aygıt sorunu yok; sayılan sonuç nesnede var', () => {
    for (const h of HAZIR_SORULAR.filter((x) => x.yontem === 'deney')) {
      const a = hazirSoruUygula(h.id)!;
      for (const aygit of nesneDuzenegi(a.deney).aygitlar) expect(aygitSorunu(aygit)).toBeNull();
      expect(etkinIzlenen(a.deney)).toBe(h.deney!.izlenen);
    }
  });

  it('kart içerikleri: plan varsayılanları VT §12.5', () => {
    expect(hazirSoruUygula('meyve')!.anket.secenekler).toEqual(['Elma', 'Muz', 'Çilek', 'Portakal', 'Karpuz']);
    expect(hazirSoruUygula('dogum-ayi')!.anket.secenekler).toHaveLength(12);
    expect(hazirSoruUygula('nabiz')!.olcum).toMatchObject({ degiskenAdi: 'Nabız', birim: 'atım/dk', duyarlik: 1, beklenen: [60, 120] });
    expect(hazirSoruUygula('uyku')!.olcum.duyarlik).toBe(0.5);
    const torba = hazirSoruUygula('torba')!.deney;
    expect(torba.torba).toEqual({ toplar: [{ etiket: 'Kırmızı', adet: 3 }, { etiket: 'Mavi', adet: 2 }], geriAt: true });
    const penalti = hazirSoruUygula('penalti')!.deney;
    expect([penalti.nesne, penalti.atisSayisi, penalti.cark.degiskenAdi]).toEqual(['cark', 10, 'Penaltı']);
    expect(hazirSoruUygula('iki-zar')!.deney).toMatchObject({ nesne: 'iki-zar', atisSayisi: 100, izlenen: '7' });
    // kartlar paylaşılan dizileri değiştirmez
    const a = hazirSoruUygula('meyve')!;
    a.anket.secenekler.push('Kivi');
    expect(hazirSoruUygula('meyve')!.anket.secenekler).toHaveLength(5);
  });

  it('simgeler arayüzdeki 40 px simge adlarından; metinlerde emoji ve eski terim yok', () => {
    for (const h of HAZIR_SORULAR) expect(HAZIR_SIMGE_ADLARI as readonly string[]).toContain(h.simge);
    metinDenetle(HAZIR_SORULAR.flatMap((h) => [h.ad, h.soru, h.rozet, ...(h.anket?.secenekler ?? [])]));
    expect(HAZIR_SORULAR.map((h) => h.rozet)).toContain('8. sınıf · MAT.7.7.1 · 8.7.1');
    expect(YONTEM_BILGISI).toEqual({ anket: { ad: 'Anket', altSatir: 'Sor ve say' }, olcum: { ad: 'Ölçüm', altSatir: 'Ölç ve yaz' }, deney: { ad: 'Deney', altSatir: 'At ve kaydet' } });
  });
});

describe('araştırma: plan tablosu ve satırlar', () => {
  it('planTablosu: anket kategorik → [cevap: etiket]; 0…5 → sayı; grup → [cevap, grup]', () => {
    const meyve = hazirSoruUygula('meyve')!;
    expect(planTablosu(meyve).sutunlar.map((s) => [s.ad, s.tur])).toEqual([['Meyve', 'etiket']]);
    expect(planTablosu(meyve).satirlar).toEqual([]);
    expect(planTablosu(hazirSoruUygula('kardes')!).sutunlar.map((s) => [s.ad, s.tur])).toEqual([['Kardeş sayısı', 'sayi']]);
    const gruplu = { ...meyve, anket: { ...meyve.anket, grup: varsayilanGrup() } };
    expect(planTablosu(gruplu).sutunlar.map((s) => [s.ad, s.tur])).toEqual([['Meyve', 'etiket'], ['Sınıf', 'etiket']]);
    expect(veriRolleri(gruplu)).toEqual(['cevap', 'grup']);
    expect(anketSayisalMi(meyve)).toBe(false);
    expect(anketSayisalMi(hazirSoruUygula('kitap')!)).toBe(true);
    expect(anketSecenekleri({ ...meyve, anket: { ...meyve.anket, secenekler: [' Elma ', '', 'Elma', 'Muz'] } })).toEqual(['Elma', 'Muz']);
  });

  it('planTablosu: ölçüm + adYaz → [ad: etiket, deger: sayı]; para → [s0]; iki küp → [s0, s1, toplam]', () => {
    const nabiz = hazirSoruUygula('nabiz')!;
    const adli = { ...nabiz, olcum: { ...nabiz.olcum, adYaz: true } };
    expect(planTablosu(adli).sutunlar.map((s) => [s.ad, s.tur])).toEqual([['Öğrenci', 'etiket'], ['Nabız (atım/dk)', 'sayi']]);
    expect(planTablosu(hazirSoruUygula('para')!).sutunlar.map((s) => [s.ad, s.tur])).toEqual([['Para', 'etiket']]);
    expect(planTablosu(hazirSoruUygula('zar')!).sutunlar.map((s) => [s.ad, s.tur])).toEqual([['Sayı küpü', 'sayi']]);
    const iki = planTablosu(hazirSoruUygula('iki-zar')!);
    expect(iki.sutunlar.map((s) => [s.ad, s.tur])).toEqual([['1. küp', 'sayi'], ['2. küp', 'sayi'], ['Toplam', 'sayi']]);
    expect(planTablosu(hazirSoruUygula('penalti')!).sutunlar[0].ad).toBe('Penaltı');
    expect(planTablosu(varsayilanArastirma()).sutunlar).toEqual([]);
  });

  it('plan sütun kimlikleri araştırma kimliğiyle kurulur ve rolüne döner', () => {
    for (const id of ['meyve', 'nabiz', 'para', 'iki-zar']) {
      const a = hazirSoruUygula(id)!;
      for (const s of planTablosu(a).sutunlar) {
        expect(s.id.startsWith(`${a.kimlik}-`)).toBe(true);
        expect(veriRolleri(a)).toContain(arastirmaSutunRolu(s.id));
      }
    }
    const a = hazirSoruUygula('meyve')!;
    expect(planSutunAdi({ ...a, anket: { ...a.anket, degiskenAdi: '  ' } }, 'cevap')).toBe('Cevap');
    expect(planSutunAdi({ ...a, olcum: { ...a.olcum, degiskenAdi: 'Boy', birim: '' } }, 'deger')).toBe('Boy');
    expect(planSutunTuru(a, 'grup')).toBe('etiket');
    expect(planSutunTuru(hazirSoruUygula('zar')!, 's0')).toBe('sayi');
    expect(planGrubu(a)).toBeNull();
    expect(grupSecenekleri({ ad: 'Sınıf', secenekler: ['6-A', ' ', '6-A', '6-B'], etkin: 0 })).toEqual(['6-A', '6-B']);
  });

  it('tablo adı: ana değişken ya da nesne', () => {
    expect(arastirmaTabloAdi(hazirSoruUygula('meyve')!)).toBe('Meyve');
    expect(arastirmaTabloAdi(hazirSoruUygula('nabiz')!)).toBe('Nabız (atım/dk)');
    expect(arastirmaTabloAdi(hazirSoruUygula('para')!)).toBe('Madenî para');
    expect(arastirmaTabloAdi(hazirSoruUygula('iki-zar')!)).toBe('İki sayı küpü');
    expect(arastirmaTabloAdi(hazirSoruUygula('anket-orneklem')!)).toBe('Cevap');
    expect(arastirmaTabloAdi(hazirSoruUygula('torba')!)).toBe('Torba');
    expect(arastirmaTabloAdi(varsayilanArastirma())).toBe('Tablom');
  });

  it('anketSatiri: seçili grupla [Elma, 6-A]', () => {
    const a = hazirSoruUygula('meyve')!;
    expect(anketSatiri(a, ' Elma ')).toEqual(['Elma']);
    const gruplu = { ...a, anket: { ...a.anket, grup: varsayilanGrup() } };
    expect(anketSatiri(gruplu, 'Elma')).toEqual(['Elma', '6-A']);
    expect(anketSatiri(gruplu, 'Elma', 1)).toEqual(['Elma', '6-B']);
    expect(anketSatiri({ ...gruplu, anket: { ...gruplu.anket, grup: { ...varsayilanGrup(), etkin: 1 } } }, 'Muz')).toEqual(['Muz', '6-B']);
  });

  it('olcumSatirlari: duyarlığa yuvarlanır ve sayiYaz biçimiyle yazılır', () => {
    const a = hazirSoruUygula('nabiz')!;
    const d = (duyarlik: 1 | 0.5 | 0.1) => ({ ...a, olcum: { ...a.olcum, duyarlik } });
    expect(olcumSatirlari(d(1), [149.6])).toEqual([['150']]);
    expect(olcumSatirlari(d(0.5), [7.3, 7.25, 7.2])).toEqual([['7,5'], ['7,5'], ['7']]);
    expect(olcumSatirlari(d(0.1), [36.66, 0.15])).toEqual([['36,7'], ['0,2']]);
    expect(olcumSatirlari(d(1), [NaN, 84])).toEqual([['84']]);
    expect(olcumDegeri(-7.25, 0.5)).toBe(-7.5);
    expect(olcumDegeri(-0.2, 1)).toBe(0);
    expect(olcumHucresi(152.04, 0.1)).toBe('152');
    const tam = { ...a, olcum: { ...a.olcum, adYaz: true, grup: { ad: 'Sınıf', secenekler: ['6-A', '6-B'], etkin: 1 } } };
    expect(olcumSatirlari(tam, [84], ' Ali ')).toEqual([['Ali', '84', '6-B']]);
    expect(veriRolleri(tam)).toEqual(['ad', 'deger', 'grup']);
    expect(olcumMetni(a, 84)).toBe('84 atım/dk');
    expect(olcumMetni({ ...a, olcum: { ...a.olcum, birim: '' } }, 7.5)).toBe('7,5');
  });

  it('hizliListeAyristir: virgül ondalık, boşluk / satır sonu / noktalı virgül ayırıcı', () => {
    const d = (m: string) => hizliListeAyristir(m).degerler;
    expect(d('1,5 2,5')).toEqual([1.5, 2.5]);
    expect(d('152, 148')).toEqual([152, 148]);
    expect(d('152;148')).toEqual([152, 148]);
    expect(d('152,148')).toEqual([152.148]);
    expect(d('72\n80')).toEqual([72, 80]);
    expect(d('−3,5 4')).toEqual([-3.5, 4]);
    expect(d('')).toEqual([]);
    const h = hizliListeAyristir('15a 16');
    expect(h.degerler).toEqual([16]);
    expect(h.hatalar).toEqual(['15a']);
    expect(h.parcalar).toEqual([{ metin: '15a', deger: null }, { metin: '16', deger: 16 }]);
  });

  it('listeOnizlemeMetni: eklenecek değerler ve okunamayan parçalar', () => {
    expect(listeOnizlemeMetni(hizliListeAyristir('72 80 76 91'))).toBe('4 değer eklenecek: 72 · 80 · 76 · 91');
    expect(listeOnizlemeMetni(hizliListeAyristir('15a 16 17 18'))).toBe('“15a” sayı değil; yalnız 3 değer eklenecek.');
    expect(listeOnizlemeMetni(hizliListeAyristir('a b'))).toBe('“a” ve “b” sayı değil; eklenecek değer yok.');
    expect(listeOnizlemeMetni(hizliListeAyristir('  '))).toBe('');
    // Yuvarlama sessiz değil: yuvarlanan ilk değer söylenir; virgülden sonra iki ve daha çok basamak iki değer de olabilir
    expect(listeOnizlemeMetni(hizliListeAyristir('84,4'), hazirSoruUygula('nabiz')!)).toBe('1 değer eklenecek: 84. “84,4” 84 olarak eklenecek (ölçme duyarlığı 1).');
    expect(listeOnizlemeMetni(hizliListeAyristir('152,148 150'), hazirSoruUygula('boy')!)).toBe(
      '2 değer eklenecek: 152 · 150. “152,148” 152 olarak eklenecek (ölçme duyarlığı 1). İki ayrı değerse araya boşluk koyun.',
    );
    expect(listeOnizlemeMetni(hizliListeAyristir('7,5 8'), hazirSoruUygula('uyku')!)).toBe('2 değer eklenecek: 7,5 · 8');
    expect(yuvarlamaNotu(7.3, 0.5)).toBe('7,3 yuvarlandı: 7,5 (ölçme duyarlığı 0,5)');
    expect(yuvarlamaNotu(7.5, 0.5)).toBeNull();
    expect(yuvarlamaNotu(84, 1)).toBeNull();
    expect(listeOnizlemeMetni({ degerler: Array.from({ length: 14 }, (_, i) => i), hatalar: [] })).toMatch(/^14 değer eklenecek: 0 · 1 .* · 11 …$/);
  });

  it('beklenenUyarisi: aralığın çok dışındaki değer', () => {
    const a = hazirSoruUygula('nabiz')!;
    expect(beklenenUyarisi(a, 84)).toBeNull();
    expect(beklenenUyarisi(a, 124)).toBeNull();
    expect(beklenenUyarisi(a, 130)).toBe('Bu değer beklenen aralığın dışında (60–120): doğru mu?');
    expect(beklenenUyarisi(a, 50)).not.toBeNull();
    expect(beklenenUyarisi({ ...a, olcum: { ...a.olcum, beklenen: null } }, 500)).toBeNull();
  });

  it('planSorunu: yöntem, seçenekler, gruplar, torba ve çark', () => {
    expect(planSorunu(varsayilanArastirma())).toBe('Önce veriyi nasıl toplayacağınızı seçin.');
    const bos = { ...varsayilanArastirma(), yontem: 'anket' as const };
    expect(planSorunu(bos)).toBe('En az iki seçenek yazın.');
    const a = hazirSoruUygula('meyve')!;
    expect(planSorunu({ ...a, anket: { ...a.anket, secenekler: ['Elma', 'elma', 'Muz'] } })).toBe('“elma” seçeneği iki kez yazılmış.');
    expect(planSorunu({ ...a, anket: { ...a.anket, grup: { ad: 'Sınıf', secenekler: ['6-A', ''], etkin: 0 } } })).toBe('En az iki grup yazın.');
    expect(planSorunu({ ...a, anket: { ...a.anket, grup: { ad: 'Sınıf', secenekler: ['6-A', '6-a'], etkin: 0 } } })).toBe('“6-a” grubu iki kez yazılmış.');
    const t = hazirSoruUygula('torba')!;
    expect(planSorunu({ ...t, deney: { ...t.deney, torba: { toplar: [{ etiket: 'Kırmızı', adet: 0 }], geriAt: true } } })).toBe('Torbada hiç top yok.');
    expect(planSorunu({ ...t, deney: { ...t.deney, torba: { toplar: [{ etiket: '', adet: 2 }], geriAt: true } } })).toBe('Rengi yazılmamış toplar var.');
    expect(planSorunu({ ...t, deney: { ...t.deney, torba: { toplar: [{ etiket: 'K', adet: 40 }, { etiket: 'M', adet: 40 }], geriAt: true } } })).toBe('Torbada en çok 60 top olabilir.');
    const c = hazirSoruUygula('penalti')!;
    expect(planSorunu({ ...c, deney: { ...c.deney, cark: { degiskenAdi: 'P', dilimler: [{ etiket: 'Gol', yuzde: 100 }] } } })).toBe('Çarkta en az iki dilim olmalı.');
    expect(planSorunu({ ...c, deney: { ...c.deney, cark: { degiskenAdi: 'P', dilimler: [{ etiket: 'A', yuzde: 0 }, { etiket: 'B', yuzde: 0 }] } } })).toBe('Dilim yüzdelerinin toplamı 0 olamaz.');
    expect(planSorunu({ ...c, deney: { ...c.deney, cark: { degiskenAdi: 'P', dilimler: [{ etiket: 'A', yuzde: 50 }, { etiket: '', yuzde: 50 }] } } })).toBe('Adı yazılmamış dilimler var.');
    // Kendi ölçümümüz: ne ölçüldüğü yazılmadan başlanamaz ("Ölçüm: Değer", birimsiz 0–11 ekseni çıkmaz)
    const olcum = { ...varsayilanArastirma(), yontem: 'olcum' as const };
    expect(planSorunu(olcum)).toBe('Neyi ölçtüğünüzü yazın (ör. Boy).');
    expect(planSorunu({ ...olcum, olcum: { ...olcum.olcum, degiskenAdi: 'Boy' } })).toBeNull();
  });

  it('planSorusu: soru yazılmadan başlanan planın sorusu; tümce içinde küçük harf', () => {
    const olcum = { ...varsayilanArastirma(), yontem: 'olcum' as const };
    expect(planSorusu({ ...olcum, olcum: { ...olcum.olcum, degiskenAdi: 'Boy', birim: 'cm' } })).toBe('Boy kaç cm?');
    expect(planSorusu({ ...olcum, olcum: { ...olcum.olcum, degiskenAdi: 'Ayakkabı numarası' } })).toBe('Ayakkabı numarası kaç?');
    expect(planSorusu({ ...hazirSoruUygula('meyve')!, soru: '' })).toBe('En çok hangi meyve seçiliyor?');
    expect(planSorusu({ ...hazirSoruUygula('kardes')!, soru: '' })).toBe('Kardeş sayısı kaç?');
    expect(planSorusu({ ...varsayilanArastirma(), yontem: 'deney' })).toBe('Madenî parayı 20 kez atınca kaç kez tura gelir?');
    expect(planSorusu(hazirSoruUygula('torba')!)).toBe('Torbadan 20 top çekince kaç kırmızı top çıkar?');
    expect(planSorusu(hazirSoruUygula('iki-zar')!)).toBe('İki sayı küpünü 100 kez atınca toplam kaç kez 7 olur?');
    expect(planSorusu(varsayilanArastirma())).toBe('');
    expect(tumceIciAdi('Tura')).toBe('tura');
    expect(tumceIciAdi('Kırmızı')).toBe('kırmızı');
    expect(tumceIciAdi('Ali')).toBe('Ali');
    expect(tumceIciAdi('7')).toBe('7');
  });

  it('tablodakiAtis ve soru şeridi: 500 ve üstü atış yalnız özetteyse ikisi birden söylenir', () => {
    const p = uygulanmis(hazirSoruUygula('seri')!);
    const a: Arastirma = {
      ...p,
      deney: {
        ...p.deney,
        calismalar: [
          { no: 1, etiket: '1. deney (20)', n: 20, sayilar: { Tura: 11, Yazı: 9 }, tabloda: true, gercek: false },
          { no: 2, etiket: '2. deney (500)', n: 500, sayilar: { Tura: 251, Yazı: 249 }, tabloda: false, gercek: false },
        ],
      },
    };
    const t = planVerisi(a, tekrarla([['Tura', 11], ['Yazı', 9]]));
    expect(tablodakiAtis(t, a)).toBe(20);
    expect(toplananMetni(t, a)).toBe('520 atış');
    expect(soruSeridiBilgisi(t, a)?.altBilgi).toBe('520 atış · 20 tabloda');
    const hepsi: Arastirma = { ...a, deney: { ...a.deney, calismalar: [a.deney.calismalar[0]] } };
    expect(tablodakiAtis(t, hepsi)).toBeNull();
    expect(soruSeridiBilgisi(t, hepsi)?.altBilgi).toBe('20 atış');
  });
});

describe('araştırma: bağ, sayım ve yazım birleştirme', () => {
  it('arastirmaBagli: sütun silinince false, ad ya da tür değişince true', () => {
    const a = uygulanmis(hazirSoruUygula('nabiz')!);
    const t = planVerisi(a, [['84']]);
    expect(arastirmaBagli(t, a)).toBe(true);
    expect(arastirmaBagli(sutunAdiDegistir(t, 0, 'Nabzım'), a)).toBe(true);
    expect(arastirmaBagli({ ...t, sutunlar: t.sutunlar.map((s) => ({ ...s, tur: 'etiket' as const })) }, a)).toBe(true);
    expect(arastirmaBagli({ sutunlar: [], satirlar: [] }, a)).toBe(false);
    expect(arastirmaBagli(t, null)).toBe(false);
    expect(arastirmaBagli(t, { ...a, sutunlar: null })).toBe(false);
    const gruplu = uygulanmis({ ...a, olcum: { ...a.olcum, grup: varsayilanGrup() } });
    const gt = planVerisi(gruplu, [['84', '6-A']]);
    expect(arastirmaBagli(gt, gruplu)).toBe(true);
    expect(arastirmaBagli(sutunSil(gt, 1), gruplu)).toBe(false);
    expect(arastirmaSutunu(gt, gruplu, 'grup')).toBe(1);
    expect(arastirmaSutunu(gt, gruplu, 'ad')).toBe(-1);
  });

  it('arastirmaTurleriniOnar: eski kayıtta etikete dönmüş sayısal ilk sütun onarılır', () => {
    /** Eski `tabloDogrula` ilk sütunu her zaman etikete çevirirdi; o kayıtlar hâlâ bu biçimde okunabilir */
    const eskiKayit = (t: VeriTablosu): VeriTablosu => ({ ...t, sutunlar: t.sutunlar.map((s, i) => (i === 0 ? { ...s, tur: 'etiket' } : s)) });
    for (const id of ['nabiz', 'zar', 'iki-zar', 'kardes']) {
      const a = uygulanmis(hazirSoruUygula(id)!);
      const t = planVerisi(a, [a.yontem === 'olcum' ? ['84'] : a.deney.nesne === 'iki-zar' ? ['1', '6', '7'] : ['3']]);
      expect(t.sutunlar[0].tur).toBe('sayi');
      // Bugünkü tabloDogrula araştırma sütununun türünü korur; onarım bir şey değiştirmez
      const okunan = tabloDogrula(JSON.parse(JSON.stringify(t)))!;
      expect(okunan).toEqual(t);
      expect(arastirmaTurleriniOnar(okunan, a)).toBe(okunan);
      const eski = eskiKayit(okunan);
      expect(arastirmaTurleriniOnar(eski, a)).toEqual(t);
      // araştırma olmadan rolünden: değer ve toplam sayı, s0 / cevap dolu hücreler sayıysa sayı
      expect(arastirmaTurleriniOnar(eski, null).sutunlar[0].tur).toBe('sayi');
    }
    const para = uygulanmis(hazirSoruUygula('para')!);
    const pt = planVerisi(para, [['Tura']]);
    expect(arastirmaTurleriniOnar(pt, para)).toBe(pt);
    expect(arastirmaTurleriniOnar(pt, null)).toBe(pt);
    const zar = uygulanmis(hazirSoruUygula('zar')!);
    const bosZar = tabloDogrula(JSON.parse(JSON.stringify(planTablosu(zar))))!;
    expect(bosZar.sutunlar[0].tur).toBe('sayi');
    const eskiBosZar = eskiKayit(bosZar);
    expect(arastirmaTurleriniOnar(eskiBosZar, zar).sutunlar[0].tur).toBe('sayi');
    expect(arastirmaTurleriniOnar(eskiBosZar, null).sutunlar[0].tur).toBe('etiket');
    const kullanici: VeriTablosu = { sutunlar: [{ id: 's1-ab', ad: 'Ad', tur: 'etiket' }], satirlar: [{ id: 'r', hucreler: ['12'] }] };
    expect(arastirmaTurleriniOnar(kullanici, null)).toBe(kullanici);
  });

  it('secenekSayilari: seçenek sırası, grup kırılımı, boş ve seçenek dışı hücreler', () => {
    const m = hazirSoruUygula('meyve')!;
    const a = uygulanmis({ ...m, anket: { ...m.anket, grup: varsayilanGrup() } });
    const t = planVerisi(a, [
      ['Elma', '6-A'],
      ['Elma', '6-B'],
      ['Muz', '6-A'],
      ['', '6-A'],
      ['elma', '6-B'],
      [' Elma ', ''],
    ]);
    const s = secenekSayilari(t, a);
    expect(s.satirlar.map((x) => [x.secenek, x.sayi, x.gruplar])).toEqual([
      ['Elma', 3, [1, 1]],
      ['Muz', 1, [1, 0]],
      ['Çilek', 0, [0, 0]],
      ['Portakal', 0, [0, 0]],
      ['Karpuz', 0, [0, 0]],
    ]);
    expect([s.toplam, s.bos, s.disarida, s.grupsuz]).toEqual([5, 1, 1, 1]);
    expect(s.gruplar).toEqual(['6-A', '6-B']);
    const sayisal = uygulanmis(hazirSoruUygula('kardes')!);
    expect(secenekSayilari(planVerisi(sayisal, [['2'], ['2,0'], ['0']]), sayisal).satirlar.slice(0, 3).map((x) => x.sayi)).toEqual([1, 0, 2]);
  });

  it('secenekDisiYazimlar: " elma " → Elma önerisi; "Kivi" → öneri yok; harf farkı da yakalanır', () => {
    const a = uygulanmis(hazirSoruUygula('meyve')!);
    const t = planVerisi(a, [['Elma'], [' elma '], ['Kivi'], ['cilek'], ['elma'], ['PORTAKAL']]);
    expect(secenekDisiYazimlar(t, a)).toEqual([
      { deger: 'elma', satirlar: [1, 4], oneri: 'Elma' },
      { deger: 'Kivi', satirlar: [2], oneri: null },
      { deger: 'cilek', satirlar: [3], oneri: 'Çilek' },
      { deger: 'PORTAKAL', satirlar: [5], oneri: 'Portakal' },
    ]);
    expect(secenekDisiYazimlar(t, a, 'grup')).toEqual([]);
  });

  it('yazimBirlestir ve secenekYenidenAdlandir: yalnız hedef sütunun hücreleri değişir', () => {
    const m = hazirSoruUygula('meyve')!;
    const a = uygulanmis({ ...m, tahmin: 'Elma', anket: { ...m.anket, grup: { ad: 'Takım', secenekler: ['Elma', 'Armut'], etkin: 0 } } });
    const t = planVerisi(a, [['elma', 'Elma'], ['Elma', 'elma'], [' elma ', 'Armut']]);
    const b = yazimBirlestir(t, a.sutunlar!.cevap!, 'elma', 'Elma');
    expect(b.degisen).toBe(2);
    expect(b.tablo.satirlar.map((r) => r.hucreler)).toEqual([['Elma', 'Elma'], ['Elma', 'elma'], ['Elma', 'Armut']]);
    expect(yazimBirlestir(t, 'yok', 'elma', 'Elma')).toEqual({ tablo: t, degisen: 0 });
    const r = secenekYenidenAdlandir(b.tablo, a, 'Elma', 'Yeşil elma');
    expect(r.degisen).toBe(3);
    expect(r.tablo.satirlar.map((x) => x.hucreler[0])).toEqual(['Yeşil elma', 'Yeşil elma', 'Yeşil elma']);
    expect(r.tablo.satirlar.map((x) => x.hucreler[1])).toEqual(['Elma', 'elma', 'Armut']);
    expect(r.arastirma.anket.secenekler[0]).toBe('Yeşil elma');
    expect(r.arastirma.tahmin).toBe('Yeşil elma');
    expect(r.arastirma.anket.grup!.secenekler).toEqual(['Elma', 'Armut']);
    const g = secenekYenidenAdlandir(t, a, 'Armut', 'Ayva', 'grup');
    expect(g.arastirma.anket.grup!.secenekler).toEqual(['Elma', 'Ayva']);
    expect(g.tablo.satirlar[2].hucreler).toEqual([' elma ', 'Ayva']);
    expect(secenekYenidenAdlandir(t, a, 'Elma', ' ').degisen).toBe(0);
  });

  it('secenekEkle: boş satıra ya da sona; sınırda ve varsa değişmez', () => {
    const a = hazirSoruUygula('meyve')!;
    expect(secenekEkle(a, ' Kivi ').anket.secenekler).toEqual(['Elma', 'Muz', 'Çilek', 'Portakal', 'Karpuz', 'Kivi']);
    expect(secenekEkle(a, 'Elma')).toBe(a);
    expect(secenekEkle({ ...a, anket: { ...a.anket, secenekler: ['Elma', '', 'Muz'] } }, 'Kivi').anket.secenekler).toEqual(['Elma', 'Kivi', 'Muz']);
    expect(secenekEkle(hazirSoruUygula('dogum-ayi')!, 'On üçüncü ay').anket.secenekler).toHaveLength(12);
    const gruplu = { ...a, anket: { ...a.anket, grup: varsayilanGrup() } };
    expect(secenekEkle(gruplu, '6-C', 'grup').anket.grup!.secenekler).toEqual(['6-A', '6-B', '6-C']);
    expect(secenekEkle(a, '6-C', 'grup')).toBe(a);
  });
});

describe('araştırma: ölçüm düzeni ve uzak değerler', () => {
  it('ucDegerler: boy verisi + 124 → [124]; n < 5 → []; çeyrekler arası açıklık 0', () => {
    expect(ucDegerler([...BOYLAR, 124])).toEqual([124]);
    expect(ucDegerler(BOYLAR)).toEqual([]);
    expect(ucDegerler([150, 151, 152, 400])).toEqual([]);
    expect(ucDegerler([5, 5, 5, 5, 5, 5, 20])).toEqual([20]);
    expect(ucDegerler([4, 5, 5, 5, 5, 5, 6])).toEqual([]);
    expect(ucDegerler([NaN, 1, 2, 3])).toEqual([]);
  });

  it('olcumDuzenBilgisi: sıralı değerler, en küçük / en büyük, boş hücreler ve uzak değer satırı', () => {
    const a = uygulanmis(hazirSoruUygula('boy')!);
    const satirlar = [...BOYLAR.map((b) => [String(b)]), [''], ['abc'], ['124']];
    const d = olcumDuzenBilgisi(planVerisi(a, satirlar), a);
    expect(d.degerler).toEqual([124, ...BOYLAR]);
    expect([d.enKucuk, d.enBuyuk, d.aciklik]).toEqual([124, 159, 35]);
    expect(d.bosSatirlar).toEqual([10, 11]);
    expect(d.uzaklar).toEqual([{ satir: 12, deger: 124 }]);
    const bos = olcumDuzenBilgisi(planVerisi(a, []), a);
    expect([bos.enKucuk, bos.enBuyuk, bos.aciklik]).toEqual([null, null, null]);
  });
});

describe('araştırma: grafik görünümü (kategori sırası, eksen alanı, yEnAz, soru şeridi, boş iletiler)', () => {
  it('arastirmaKategoriSiralari: anket seçenek sırası, grup, deney sonuç ve çalışma sırası', () => {
    const m = hazirSoruUygula('meyve')!;
    const a = uygulanmis({ ...m, anket: { ...m.anket, grup: varsayilanGrup() } });
    const s = arastirmaKategoriSiralari(a);
    expect(s.get(a.sutunlar!.cevap!)).toEqual(['Elma', 'Muz', 'Çilek', 'Portakal', 'Karpuz']);
    expect(s.get(a.sutunlar!.grup!)).toEqual(['6-A', '6-B']);
    const t = uygulanmis(hazirSoruUygula('torba')!);
    const deneyli: Arastirma = {
      ...t,
      sutunlar: { ...t.sutunlar, deney: arastirmaSutunKimligi(t.kimlik, 'deney') },
      deney: {
        ...t.deney,
        calismalar: [
          { no: 10, etiket: '10. deney (5)', n: 5, sayilar: {}, tabloda: true, gercek: false },
          { no: 0, etiket: 'Gerçek çekişler', n: 3, sayilar: {}, tabloda: true, gercek: true },
          { no: 2, etiket: '2. deney (20)', n: 20, sayilar: {}, tabloda: true, gercek: false },
        ],
      },
    };
    const ds = arastirmaKategoriSiralari(deneyli);
    expect(ds.get(deneyli.sutunlar!.s0!)).toEqual(['Kırmızı', 'Mavi']);
    expect(ds.get(deneyli.sutunlar!.deney!)).toEqual(['Gerçek çekişler', '2. deney (20)', '10. deney (5)']);
    const para = uygulanmis(hazirSoruUygula('para')!);
    expect(arastirmaKategoriSiralari(para).get(para.sutunlar!.s0!)).toEqual(['Yazı', 'Tura']);
    const iki = uygulanmis(hazirSoruUygula('iki-zar')!);
    expect(arastirmaKategoriSiralari(iki).get(iki.sutunlar!.toplam!)).toHaveLength(11);
    expect(arastirmaKategoriSiralari(null).size).toBe(0);
    expect(arastirmaKategoriSiralari(hazirSoruUygula('meyve')).size).toBe(0);
  });

  it('arastirmaEksenAlani: sayısal anket, ölçüm, sayı küpleri; kategorik ve bağsız sütunda null', () => {
    const kardes = uygulanmis(hazirSoruUygula('kardes')!);
    expect(arastirmaEksenAlani(planTablosu(kardes), kardes, kardes.sutunlar!.cevap!)).toEqual({ min: 0, max: 5 });
    const boy = uygulanmis(hazirSoruUygula('boy')!);
    expect(arastirmaEksenAlani(planTablosu(boy), boy, boy.sutunlar!.deger!)).toEqual({ min: 130, max: 175 });
    const zar = uygulanmis(hazirSoruUygula('zar')!);
    expect(arastirmaEksenAlani(planTablosu(zar), zar, zar.sutunlar!.s0!)).toEqual({ min: 1, max: 6 });
    const iki = uygulanmis(hazirSoruUygula('iki-zar')!);
    expect(arastirmaEksenAlani(planTablosu(iki), iki, iki.sutunlar!.toplam!)).toEqual({ min: 2, max: 12 });
    expect(arastirmaEksenAlani(planTablosu(iki), iki, iki.sutunlar!.s1!)).toEqual({ min: 1, max: 6 });
    const meyve = uygulanmis(hazirSoruUygula('meyve')!);
    expect(arastirmaEksenAlani(planTablosu(meyve), meyve, meyve.sutunlar!.cevap!)).toBeNull();
    expect(arastirmaEksenAlani({ sutunlar: [], satirlar: [] }, boy, boy.sutunlar!.deger!)).toBeNull();
    expect(arastirmaEksenAlani(planTablosu(boy), boy, null)).toBeNull();
    const etiketli = { ...planTablosu(kardes), sutunlar: planTablosu(kardes).sutunlar.map((s) => ({ ...s, tur: 'etiket' as const })) };
    expect(arastirmaEksenAlani(etiketli, kardes, kardes.sutunlar!.cevap!)).toBeNull();
  });

  it('olcumEksenPenceresi: beklenen ∪ görülen; aralığın içindeki değerler ekseni oynatmaz, yalnız genişler', () => {
    // Nabız 60–120 (adım 10): ilk değerlerde eksen daralmaz, işaret adımı değişmez
    expect(olcumEksenPenceresi([60, 120], [])).toEqual({ min: 60, max: 120 });
    expect(olcumEksenPenceresi([60, 120], [80])).toEqual({ min: 60, max: 120 });
    expect(olcumEksenPenceresi([60, 120], [84])).toEqual({ min: 60, max: 120 });
    expect(olcumEksenPenceresi([60, 120], [84, 76])).toEqual({ min: 60, max: 120 });
    const nabiz = [84, 72, 110, 65, 91, 68, 88, 79, 95, 74, 82, 84, 130];
    // Pencere yalnız genişler: hiçbir yeni değer ekseni daraltmaz
    let onceki = olcumEksenPenceresi([60, 120], []);
    for (let i = 1; i <= nabiz.length; i++) {
      const p = olcumEksenPenceresi([60, 120], nabiz.slice(0, i));
      expect(p.min).toBeLessThanOrEqual(onceki.min);
      expect(p.max).toBeGreaterThanOrEqual(onceki.max);
      if (i < nabiz.length) expect(p).toEqual({ min: 60, max: 120 });
      onceki = p;
    }
    // Beklenen aralığın dışındaki değer pencereyi o yöne, adıma oturan uca kadar genişletir
    expect(olcumEksenPenceresi([60, 120], nabiz)).toEqual({ min: 60, max: 130 });
    expect(olcumEksenPenceresi([60, 120], [72, 131])).toEqual({ min: 60, max: 140 });
    expect(olcumEksenPenceresi([60, 120], [52, 90])).toEqual({ min: 50, max: 120 });
    // Boy 130–175, Uyku 6–11 (yarım saatler), Geliş 0–60: içerideki veri ekseni değiştirmez
    expect(olcumEksenPenceresi([130, 175], [138, 151, 162])).toEqual({ min: 130, max: 175 });
    expect(olcumEksenPenceresi([130, 175], [178])).toEqual({ min: 130, max: 180 });
    expect(olcumEksenPenceresi([6, 11], [7.5, 7.5])).toEqual({ min: 6, max: 11 });
    expect(olcumEksenPenceresi([6, 11], [7.5, 11.5])).toEqual({ min: 6, max: 12 });
    expect(olcumEksenPenceresi([0, 60], [5, 12, 25])).toEqual({ min: 0, max: 60 });
    // Ters verilen ya da tek noktalı beklenen aralık bozulmaz
    expect(olcumEksenPenceresi([120, 60], [])).toEqual({ min: 60, max: 120 });
    expect(olcumEksenPenceresi([5, 5], [7])).toEqual({ min: 5, max: 5 });
  });

  it('arastirmaEksenAlani (ölçüm): tablodaki değerlerden pencere; boş, hatalı ve boş hücreler sayılmaz', () => {
    const nabiz = uygulanmis(hazirSoruUygula('nabiz')!);
    const id = nabiz.sutunlar!.deger!;
    expect(arastirmaEksenAlani(planTablosu(nabiz), nabiz, id)).toEqual({ min: 60, max: 120 });
    const t = planVerisi(nabiz, [['68'], ['95'], [''], ['abc'], ['84']]);
    expect(arastirmaEksenAlani(t, nabiz, id)).toEqual({ min: 60, max: 120 });
    expect(arastirmaEksenAlani(planVerisi(nabiz, [['68'], ['131']]), nabiz, id)).toEqual({ min: 60, max: 140 });
    // Panel kapanınca (Bitti) eksen veriye oturur: toplama ekseni verilmez; veri yokken beklenen aralık kalır
    expect(arastirmaEksenAlani(t, nabiz, id, false)).toBeNull();
    expect(arastirmaEksenAlani(planTablosu(nabiz), nabiz, id, false)).toEqual({ min: 60, max: 120 });
  });

  it('toplamaYEnAz: kategorik ankette 5; deneyde bir çalışma boyunca sabit, yalnız büyür', () => {
    const meyve = uygulanmis(hazirSoruUygula('meyve')!);
    expect(toplamaYEnAz(planTablosu(meyve), meyve)).toBe(5);
    const kardes = uygulanmis(hazirSoruUygula('kardes')!);
    expect(toplamaYEnAz(planTablosu(kardes), kardes)).toBeUndefined();
    expect(toplamaYEnAz(planTablosu(meyve), null)).toBeUndefined();
    const zar = uygulanmis(hazirSoruUygula('zar')!);
    expect(toplamaYEnAz(planTablosu(zar), zar)).toBeUndefined();
    const para = uygulanmis(hazirSoruUygula('para')!);
    // hiç atış yok: 20 atış × 1/2 × 1,25 = 12,5 → 14
    expect(toplamaYEnAz(planTablosu(para), para)).toBe(14);
    const c1 = { no: 1, etiket: '1. deney (20)', n: 5, sayilar: {}, tabloda: true, gercek: false };
    const bes = { ...para, deney: { ...para.deney, calismalar: [c1] } };
    expect(toplamaYEnAz(planVerisi(bes, tekrarla([['Tura', 5]])), bes)).toBe(14);
    const yirmi = { ...para, deney: { ...para.deney, calismalar: [{ ...c1, n: 20 }] } };
    expect(toplamaYEnAz(planVerisi(yirmi, tekrarla([['Tura', 20]])), yirmi)).toBe(14);
    // ikinci deney başlayınca çerçeve bir kez büyür: 40 × 1/2 × 1,25 = 25
    const ikinci = { ...para, deney: { ...para.deney, calismalar: [{ ...c1, n: 20 }, { ...c1, no: 2, etiket: '2. deney (20)', n: 0 }] } };
    expect(toplamaYEnAz(planVerisi(ikinci, tekrarla([['Tura', 20]])), ikinci)).toBe(25);
    // 500 ve üstü tabloya yazılmaz: hesaba girmez
    const buyuk = { ...para, deney: { ...para.deney, atisSayisi: 500 } };
    expect(toplamaYEnAz(planTablosu(buyuk), buyuk)).toBeUndefined();
    const torba = uygulanmis(hazirSoruUygula('torba')!);
    expect(toplamaYEnAz(planTablosu(torba), torba)).toBe(16);
  });

  it('soruSeridiBilgisi: soru ve "6-A sınıfı · 24 veri"; deneyde atış; bağ ya da soru yoksa null', () => {
    const a = uygulanmis({ ...hazirSoruUygula('meyve')!, kimden: '6-A sınıfı' });
    const t = planVerisi(a, tekrarla([['Elma', 24]]));
    expect(soruSeridiBilgisi(t, a)).toEqual({ soru: 'Sınıfımızda en çok sevilen meyve hangisi?', altBilgi: '6-A sınıfı · 24 veri' });
    expect(soruSeridiBilgisi(planTablosu(a), { ...a, kimden: '' })).toEqual({ soru: a.soru, altBilgi: 'Henüz veri yok' });
    expect(soruSeridiBilgisi(t, { ...a, soru: '  ' })).toBeNull();
    expect(soruSeridiBilgisi({ sutunlar: [], satirlar: [] }, a)).toBeNull();
    const para = uygulanmis(hazirSoruUygula('para')!);
    expect(soruSeridiBilgisi(planVerisi(para, tekrarla([['Tura', 7], ['Yazı', 5]])), para)!.altBilgi).toBe('12 atış');
    const cark = uygulanmis(hazirSoruUygula('penalti')!);
    expect(soruSeridiBilgisi(planVerisi(cark, tekrarla([['Gol', 3]])), cark)!.altBilgi).toBe('3 çevirme');
  });

  it('toplanan sayısı ve metni: cevap, ölçüm, atış', () => {
    const a = uygulanmis(hazirSoruUygula('meyve')!);
    expect(toplananMetni(planVerisi(a, [['Elma'], [''], ['Muz']]), a)).toBe('2 cevap');
    const n = uygulanmis(hazirSoruUygula('nabiz')!);
    expect(toplananMetni(planVerisi(n, [['84'], ['x'], ['90']]), n)).toBe('2 ölçüm');
    expect(toplananSayisi(planTablosu(n), n)).toBe(0);
    const t = uygulanmis(hazirSoruUygula('torba')!);
    expect(toplananMetni(planVerisi(t, tekrarla([['Kırmızı', 4]])), t)).toBe('4 çekiş');
  });

  it('boş grafik ipucu ve boş tablo iletisi', () => {
    expect(bosGrafikIpucu(hazirSoruUygula('meyve')!)).toBe('İlk cevapla noktalar burada belirir.');
    expect(bosGrafikIpucu(hazirSoruUygula('nabiz')!)).toBe('İlk ölçümle noktalar burada belirir.');
    expect(bosGrafikIpucu(hazirSoruUygula('para')!)).toBe('İlk atışla noktalar burada belirir.');
    expect(bosGrafikIpucu(hazirSoruUygula('penalti')!, 'sutun')).toBe('İlk çevirmeyle sütunlar burada belirir.');
    expect(bosGrafikIpucu(hazirSoruUygula('torba')!, 'daire')).toBe('İlk çekişle dilimler burada belirir.');
    expect(bosTabloIletisi(hazirSoruUygula('meyve')!)).toBe('Henüz cevap yok. Soldaki kutucuklara dokunun; her cevap buraya bir satır olarak yazılır.');
    expect(bosTabloIletisi(hazirSoruUygula('nabiz')!)).toBe('Henüz ölçüm yok. Değeri yazıp “Ekle”ye basın.');
    expect(bosTabloIletisi(hazirSoruUygula('para')!)).toBe('Henüz atış yok. Paraya dokunun ya da “20 kez at”a basın.');
    expect(bosTabloIletisi(hazirSoruUygula('zar')!)).toBe('Henüz atış yok. Sayı küpüne dokunun ya da “30 kez at”a basın.');
    expect(bosTabloIletisi(hazirSoruUygula('penalti')!)).toBe('Henüz çevirme yok. Çarka dokunun ya da “10 kez çevir”e basın.');
    expect(bosTabloIletisi(hazirSoruUygula('torba')!)).toBe('Henüz çekiş yok. Torbaya dokunun ya da “20 top çek”e basın.');
    const elle = hazirSoruUygula('para')!;
    expect(bosTabloIletisi({ ...elle, deney: { ...elle.deney, kayit: 'gercek' } })).toBe('Henüz atış yok. Soldaki kutucuklara dokunun; her atış buraya bir satır olarak yazılır.');
  });
});

describe('araştırma: adım notları, grafik önerileri, tartışma soruları', () => {
  it('adimNotu: notlar ve kazanım rozetleri (VT §12.3)', () => {
    const anket = hazirSoruUygula('meyve')!;
    const olcum = hazirSoruUygula('nabiz')!;
    const deney = hazirSoruUygula('para')!;
    expect(adimNotu(varsayilanArastirma())).toEqual({ metin: 'Merak ettiğimiz durumu veriyle cevaplanabilecek bir soruya dönüştürürüz.', rozet: 'MAT.5.5.1' });
    // Hazır soruda rozet sorunun kendi kodudur; kendi sorumuzda yöntemin varsayılanları
    expect(adimNotu(anket).rozet).toBe('MAT.5.5.1');
    expect(adimNotu(olcum).rozet).toBe('MAT.7.6.1');
    expect(adimNotu(deney).rozet).toBe('MAT.6.6.1');
    const kendi = (a: Arastirma): Arastirma => ({ ...a, hazirId: null });
    expect(adimNotu(kendi(anket)).rozet).toBe('MAT.5.5.1 · 8.6.1');
    expect(adimNotu(kendi(olcum)).rozet).toBe('MAT.7.6.1 · 8.6.1');
    expect(adimNotu(kendi(olcum), 'duzenle').rozet).toBe('MAT.8.6.1 · 7.6.1');
    expect(adimNotu(kendi(olcum), 'yorum').rozet).toBe('MAT.7.6.1');
    expect(adimNotu(kendi(deney), 'yorum').rozet).toBe('MAT.6.6.1');
    expect(adimNotu(hazirSoruUygula('kardes')!, 'yorum').rozet).toBe('MAT.6.5.1');
    expect(adimNotu(hazirSoruUygula('anket-orneklem')!, 'topla').rozet).toBe('MAT.8.6.1');
    expect(adimNotu(hazirSoruUygula('anket-orneklem')!, 'duzenle').rozet).toBe('MAT.7.7.1 · 8.7.1');
    expect(adimNotu(hazirSoruUygula('iki-zar')!, 'topla').rozet).toBe('Zenginleştirme');
    // Plan başka bir araştırmaya dönüşünce (çark yerine para) hazır sorunun rozeti kullanılmaz
    const orneklem = hazirSoruUygula('anket-orneklem')!;
    expect(adimNotu({ ...orneklem, deney: { ...orneklem.deney, nesne: 'para' } }, 'topla').rozet).toBe('MAT.6.6.1');
    expect(adimNotu(anket, 'topla').metin).toBe('Her dokunuş bir cevaptır: tabloya bir satır, grafiğe bir nokta ekler.');
    expect(adimNotu(deney, 'topla').metin).toBe('Her atış tabloya bir satır, grafiğe bir nokta ekler.');
    expect(adimNotu({ ...deney, deney: { ...deney.deney, kayit: 'gercek' } }, 'topla').metin).toBe('Sınıfta atın; her dokunuş tabloya bir satır ekler.');
    expect(adimNotu(deney, 'duzenle')).toEqual({ metin: 'Göreli sıklığı teorik olasılıkla karşılaştırırız.', rozet: 'MAT.7.7.1 · 8.7.1' });
    expect(adimNotu(olcum, 'duzenle').rozet).toBe('MAT.7.6.1');
    expect(adimNotu(olcum, 'duzenle').metin).toContain('ötekilerden çok uzak değerlere');
    expect(adimNotu(anket, 'yorum').rozet).toBe('MAT.5.5.1');
    const hepsi = (['soru', 'plan', 'topla', 'duzenle', 'yorum'] as const).flatMap((adim) =>
      ['meyve', 'nabiz', 'para', 'penalti', 'torba'].map((id) => adimNotu(hazirSoruUygula(id)!, adim).metin),
    );
    metinDenetle(hepsi);
  });

  it('grafikOnerileri: kategorik → Çizgi soluk ve gerekçeli; sayısal → Daire soluk; özet → Çizgi uygun', () => {
    const anket = grafikOnerileri(hazirSoruUygula('meyve')!);
    expect(anket.map((o) => [o.sekme, o.uygun])).toEqual([['sutun', true], ['daire', true], ['nokta', true], ['cizgi', false]]);
    expect(anket[3].gerekce).toBe('Zamana göre sıralı bir ölçüm yok.');
    const olcum = grafikOnerileri(hazirSoruUygula('boy')!);
    expect(olcum.find((o) => o.sekme === 'daire')).toEqual({ sekme: 'daire', uygun: false, gerekce: 'Parça-bütün ilişkisi yok.' });
    expect(olcum[0]).toEqual({ sekme: 'nokta', uygun: true, gerekce: 'Dağılımı, yığılmayı ve ötekilerden çok uzak değerleri görmek için' });
    expect(grafikOnerileri(hazirSoruUygula('kardes')!).find((o) => o.sekme === 'cizgi')!.gerekce).toBe('Cevaplar zamana göre sıralı değil.');
    const ozetli = grafikOnerileri(hazirSoruUygula('para')!, { ozetSatiri: 7 });
    expect(ozetli[0]).toEqual({ sekme: 'cizgi', uygun: true, ozet: true, gerekce: 'Atış sayısı arttıkça göreli sıklığın nasıl değiştiğini görmek için' });
    const ozetsiz = grafikOnerileri(hazirSoruUygula('para')!, { ozetSatiri: 1 });
    expect(ozetsiz.find((o) => o.sekme === 'cizgi')).toEqual({ sekme: 'cizgi', uygun: false, gerekce: 'En az iki deney gerekir: Deney özeti Çizgi grafiğinde çizilir.' });
    expect(ozetsiz.find((o) => o.sekme === 'nokta')!.gerekce).toBe('Her atışı tek tek görmek için');
    const zar = grafikOnerileri(hazirSoruUygula('zar')!);
    expect(zar.map((o) => [o.sekme, o.uygun])).toEqual([['nokta', true], ['istatistik', true], ['cizgi', false], ['daire', false]]);
    // özetli kategorik deneyde de en az bir soluk (gerekçeli) grafik kalır
    expect(ozetli.at(-1)).toEqual({ sekme: 'sacilim', uygun: false, gerekce: 'İki sayısal değişken gerekir; bu veride yok.' });
    // her listede önce uygunlar, sonra soluklar; en az bir soluk
    for (const [id, ozetSatiri] of [['meyve', 0], ['boy', 0], ['para', 3], ['para', 0], ['torba', 3], ['iki-zar', 3]] as const) {
      const l = grafikOnerileri(hazirSoruUygula(id)!, { ozetSatiri });
      const ilkSoluk = l.findIndex((o) => !o.uygun);
      expect(ilkSoluk === -1 || l.slice(ilkSoluk).every((o) => !o.uygun)).toBe(true);
      expect(l.some((o) => !o.uygun)).toBe(true);
      metinDenetle(l.map((o) => o.gerekce));
    }
  });

  it('tartismaSorulari: yönteme ve veriye göre üç soru; hazır sorunun kendi soruları; tümce içinde küçük harf', () => {
    expect(tartismaSorulari(hazirSoruUygula('meyve')!)).toEqual(['Sorumuza cevap verebildik mi? Neden?', 'Başka bir sınıfa sorsaydık sonuç aynı olur muydu?', 'Soruyu ya da seçenekleri değiştirmek gerekir mi?']);
    expect(tartismaSorulari(hazirSoruUygula('kardes')!)[0]).toBe('Aritmetik ortalama, ortanca ve tepe değer aynı mı çıktı? Hangisi sınıfımızı en iyi anlatır?');
    // Ölçüm: ötekilerden çok uzak değer yoksa o soru sorulmaz (ortalama mutlak sapma sorulur)
    const boy = uygulanmis(hazirSoruUygula('boy')!);
    expect(tartismaSorulari(boy)[2]).toBe('Değerler ortalamadan ortalama ne kadar uzakta (ortalama mutlak sapma)? Bu bize ne söylüyor?');
    expect(tartismaSorulari(boy, planVerisi(boy, BOYLAR.map((b) => [String(b)])))[2]).not.toMatch(/uzak değer/);
    expect(tartismaSorulari(boy, planVerisi(boy, [...BOYLAR, 124].map((b) => [String(b)])))[2]).toBe('Ötekilerden çok uzak değer ortalamayı nasıl etkiledi? Ya ortancayı?');
    // Deney: tek deneyde "20 yerine 200"; gerçek atış yoksa teorik beklenti; izlenen tümce içinde küçük harfle
    expect(tartismaSorulari(hazirSoruUygula('para')!)).toEqual([
      'Atış sayısı 20 yerine 200 olsaydı göreli sıklık nasıl değişirdi?',
      'Deneyi yeniden yapsak yine aynı sayıda tura gelir mi? Neden?',
      'Teorik olasılığa göre 20 atışta kaç kez tura beklerdik? Sonucumuz buna ne kadar yakın?',
    ]);
    expect(tartismaSorulari(hazirSoruUygula('torba')!)[1]).toBe('Deneyi yeniden yapsak yine aynı sayıda kırmızı çıkar mı? Neden?');
    const p = uygulanmis(hazirSoruUygula('para')!);
    const iki: Arastirma = {
      ...p,
      deney: {
        ...p.deney,
        calismalar: [
          { no: 0, etiket: 'Gerçek atışlar', n: 4, sayilar: { Tura: 2, Yazı: 2 }, tabloda: false, gercek: true },
          { no: 1, etiket: '1. deney (20)', n: 20, sayilar: { Tura: 9, Yazı: 11 }, tabloda: false, gercek: false },
          { no: 2, etiket: '2. deney (50)', n: 50, sayilar: { Tura: 26, Yazı: 24 }, tabloda: false, gercek: false },
        ],
      },
    };
    expect(tartismaSorulari(iki, planTablosu(iki))).toEqual([
      'Atış sayısını artırınca göreli sıklık nasıl değişti?',
      'Deneyi yeniden yapsak yine aynı sayıda tura gelir mi? Neden?',
      'Gerçek atışlarla bilgisayarın sonuçları neden farklı olabilir?',
    ]);
    // Hazır sorunun kendi soruları: okul anketi (örneklem), penaltı, sayı küpleri
    const orneklem = tartismaSorulari(hazirSoruUygula('anket-orneklem')!);
    expect(orneklem[1]).toBe('Okulda “evet” diyenler %60 ise 20 kişide kaç “evet” beklerdik? Sonuçlarımız buna ne kadar yakın?');
    expect(orneklem.join(' ')).not.toMatch(/Gerçek|çevirme/);
    expect(tartismaSorulari(hazirSoruUygula('penalti')!)[0]).toBe('Oyuncunun gol oranı %70 ise 10 penaltıda kaç gol beklerdik? Tam o sayı mı çıktı?');
    expect(tartismaSorulari(hazirSoruUygula('iki-zar')!)[0]).toMatch(/kaç farklı yolla/);
    expect(tartismaSorulari(hazirSoruUygula('zar')!)[2]).toBe('Teorik olasılığa göre 30 atışta her sayının kaç kez gelmesini beklerdik?');
    metinDenetle(HAZIR_SORULAR.flatMap((h) => tartismaSorulari(hazirSoruUygula(h.id)!)));
    for (const h of HAZIR_SORULAR) expect(tartismaSorulari(hazirSoruUygula(h.id)!), h.id).toHaveLength(3);
  });
});

describe('araştırma: yorum cümleleri (yorumCumleleri)', () => {
  it('anket: kişi sayısı, en çok / en az seçilen, tahmin yanlış ve doğru', () => {
    const a = uygulanmis({ ...hazirSoruUygula('meyve')!, kimden: '6-A sınıfı', tahmin: 'Muz' });
    const t = planVerisi(a, tekrarla([['Elma', 7], ['Muz', 5], ['Çilek', 6], ['Portakal', 4], ['Karpuz', 2]]));
    expect(yorumCumleleri(t, a)).toEqual([
      '24 kişiye sorduk (6-A sınıfı).',
      'En çok seçilen: Elma, 7 kişi (%29,2).',
      'En az seçilen: Karpuz, 2 kişi (%8,3).',
      'Tahminimiz Muz idi; veriler Elma diyor.',
    ]);
    expect(yorumCumleleri(t, { ...a, tahmin: 'elma' }).at(-1)).toBe('Tahminimiz doğru çıktı: Elma.');
    expect(yorumCumleleri(planTablosu(a), a)).toEqual([]);
  });

  it('anket: eşitlik ve hiç seçilmeyenler; gruplara göre en çok', () => {
    const m = hazirSoruUygula('meyve')!;
    const a = uygulanmis({ ...m, anket: { ...m.anket, grup: varsayilanGrup() } });
    const t = planVerisi(a, [...tekrarla([['Elma', 4], ['Çilek', 2]], '6-A'), ...tekrarla([['Çilek', 4], ['Elma', 2], ['Muz', 3]], '6-B')]);
    expect(yorumCumleleri(t, a)).toEqual([
      '15 kişiye sorduk.',
      'En çok seçilenler: Elma ve Çilek (her biri 6 kişi).',
      'Hiç seçilmeyen: Portakal ve Karpuz.',
      '6-A: en çok Elma · 6-B: en çok Çilek.',
    ]);
  });

  it('anket (sayısal): aritmetik ortalama, ortanca ve tepe değer', () => {
    const a = uygulanmis(hazirSoruUygula('kardes')!);
    const t = planVerisi(a, [['0'], ['1'], ['1'], ['2'], ['2'], ['2'], ['3']]);
    expect(yorumCumleleri(t, a)).toEqual([
      '7 kişiye sorduk.',
      'En çok verilen cevap: 2, 3 kişi (%42,9).',
      'Hiç verilmeyen cevap: 4 ve 5.',
      'Aritmetik ortalama 1,6; ortanca 2; tepe değer 2.',
    ]);
  });

  it('ölçüm: en küçük / en büyük, ortalama ve ortanca, ortalama mutlak sapma, uzak değer, tahmin', () => {
    const a = uygulanmis({ ...hazirSoruUygula('boy')!, tahmin: '150' });
    const t = planVerisi(a, BOYLAR.map((b) => [String(b)]));
    expect(yorumCumleleri(t, a)).toEqual([
      '10 ölçüm yaptık. En küçük 145 cm, en büyük 159 cm; açıklık 14 cm.',
      'Aritmetik ortalama 152,2 cm; ortanca 152 cm.',
      'Ortalama mutlak sapma 3 cm: değerler ortalamadan ortalama 3 cm uzakta.',
      'Tahminimiz 150 cm idi; ortalamadan 2,2 cm uzak.',
    ]);
    const uzak = planVerisi(a, [...BOYLAR.map((b) => [String(b)]), ['124']]);
    expect(yorumCumleleri(uzak, a)).toContain('124 cm ötekilerden çok uzak: ortalamayı etkiliyor, ortancayı daha az etkiliyor.');
    expect(yorumCumleleri(planVerisi(a, [['152']]), { ...a, tahmin: '152' })).toEqual(['1 ölçüm yaptık: 152 cm.', 'Tahminimiz 152 cm idi; ortalamayla aynı çıktı.']);
    const gruplu = uygulanmis({ ...a, tahmin: '', olcum: { ...a.olcum, grup: varsayilanGrup() } });
    const gt = planVerisi(gruplu, [['150', '6-A'], ['152', '6-A'], ['156', '6-B']]);
    expect(yorumCumleleri(gt, gruplu)).toContain('Gruplara göre aritmetik ortalama: 6-A 151 cm · 6-B 156 cm.');
  });

  it('deney: bütün atışlar ve teorik olasılık, çoklu çalışma, gerçek ve bilgisayar, tahmin', () => {
    const p = uygulanmis(hazirSoruUygula('para')!);
    const deneyId = arastirmaSutunKimligi(p.kimlik, 'deney');
    const a: Arastirma = {
      ...p,
      tahmin: '10',
      sutunlar: { ...p.sutunlar, deney: deneyId },
      deney: {
        ...p.deney,
        calismalar: [
          { no: 1, etiket: '1. deney (20)', n: 20, sayilar: {}, tabloda: true, gercek: false },
          { no: 2, etiket: '2. deney (200)', n: 200, sayilar: {}, tabloda: true, gercek: false },
          { no: 3, etiket: '3. deney (2000)', n: 2000, sayilar: { Tura: 1004, Yazı: 996 }, tabloda: false, gercek: false },
        ],
      },
    };
    const satirlar = [...tekrarla([['Tura', 11], ['Yazı', 9]], '1. deney (20)'), ...tekrarla([['Tura', 97], ['Yazı', 103]], '2. deney (200)')];
    const t: VeriTablosu = { sutunlar: [...planTablosu(a).sutunlar, { id: deneyId, ad: 'Deney', tur: 'etiket' }], satirlar: satirlar.map((h, i) => ({ id: `r${i}`, hucreler: h })) };
    expect(yorumCumleleri(t, a)).toEqual([
      '2220 atış yaptık: tura 1112 kez geldi, göreli sıklık %50,1. Teorik olasılık %50.',
      'Göreli sıklık: 20 atışta %55 · 200 atışta %48,5 · 2000 atışta %50,2.',
      'Tahminimiz 10 kez tura idi; 20 atışta 11 kez geldi.',
    ]);
    const gercekli: Arastirma = { ...a, tahmin: '', deney: { ...a.deney, calismalar: [{ no: 0, etiket: 'Gerçek atışlar', n: 11, sayilar: {}, tabloda: true, gercek: true }, ...a.deney.calismalar] } };
    const gt: VeriTablosu = { ...t, satirlar: [...t.satirlar, ...tekrarla([['Tura', 6], ['Yazı', 5]], 'Gerçek atışlar').map((h, i) => ({ id: `g${i}`, hucreler: h }))] };
    expect(yorumCumleleri(gt, gercekli)).toContain('Gerçek atışlarda %54,5, bilgisayarda %50,1.');
    // aynı atış sayısıyla yinelenen deneyler etiketleriyle yazılır
    const yinelenen: Arastirma = {
      ...a,
      tahmin: '',
      deney: {
        ...a.deney,
        calismalar: [
          { no: 1, etiket: '1. deney (20)', n: 20, sayilar: { Tura: 9, Yazı: 11 }, tabloda: false, gercek: false },
          { no: 2, etiket: '2. deney (20)', n: 20, sayilar: { Tura: 11, Yazı: 9 }, tabloda: false, gercek: false },
        ],
      },
    };
    expect(yorumCumleleri(planTablosu(yinelenen), yinelenen)[1]).toBe('Göreli sıklık: 1. deney (20): %45 · 2. deney (20): %55.');
  });

  it('deney: sayı küpü, iki küp ve torba cümleleri; teorik kapalıyken teorik yok', () => {
    const z = uygulanmis(hazirSoruUygula('zar')!);
    const zt = planVerisi(z, [['6'], ['6'], ['1'], ['2'], ['3'], ['6']]);
    // Sayı küpü sorusu "her sayı kaç kez gelir?": en sık gelen ve her sayının sıklığı yazılır
    expect(yorumCumleleri(zt, z)).toEqual([
      '6 atış yaptık: 6 sayısı 3 kez geldi, göreli sıklık %50. Teorik olasılık %16,7.',
      'En sık gelen sayı: 6 (3 kez).',
      'Her sayı: 1 (1 kez) · 2 (1 kez) · 3 (1 kez) · 4 (0 kez) · 5 (0 kez) · 6 (3 kez). Teorik olarak her sayı 1 kez beklenir (%16,7).',
    ]);
    // İki küp "en sık hangi toplam?": eşitlikte hepsi, teorik en olası toplam
    const i = uygulanmis(hazirSoruUygula('iki-zar')!);
    const it2 = planVerisi(i, [['1', '6', '7'], ['2', '2', '4'], ['3', '1', '4'], ['4', '3', '7']]);
    expect(yorumCumleleri(it2, i)).toEqual([
      '4 atış yaptık: toplam 7, 2 kez geldi, göreli sıklık %50. Teorik olasılık %16,7.',
      'En sık çıkan toplamlar: 4 ve 7 (her biri 2 kez); teorik olarak en olası toplam 7 (%16,7).',
    ]);
    const t = uygulanmis(hazirSoruUygula('torba')!);
    const kapali = { ...t, deney: { ...t.deney, teorikGoster: false } };
    expect(yorumCumleleri(planVerisi(kapali, tekrarla([['Kırmızı', 3], ['Mavi', 1]])), kapali)).toEqual(['4 çekiş yaptık: kırmızı 3 kez çıktı, göreli sıklık %75.']);
  });

  it('deney (simülasyon): okul anketi ve penaltı kendi bağlamıyla anlatılır; aynı büyüklükte örneklemlerin sayıları', () => {
    const o = uygulanmis({ ...hazirSoruUygula('anket-orneklem')!, tahmin: '12' });
    const ot = planVerisi(o, tekrarla([['Evet', 10], ['Hayır', 10]]));
    expect(yorumCumleleri(ot, o)).toEqual(['20 kişiye sorduk (simülasyon): 10 kişi “evet” dedi (%50); okulda “evet” diyenler %60.']);
    const seri: Arastirma = {
      ...o,
      deney: {
        ...o.deney,
        calismalar: [11, 13, 10].map((e, k) => ({ no: k + 1, etiket: `${k + 1}. deney (20)`, n: 20, sayilar: { Evet: e, Hayır: 20 - e }, tabloda: false, gercek: false })),
      },
    };
    const c = yorumCumleleri(planTablosu(seri), seri);
    expect(c[0]).toBe('Her deneyde 20 kişiye sorduk (simülasyon, 3 deney): toplam 34 kişi “evet” dedi (%56,7); okulda “evet” diyenler %60.');
    expect(c).toContain('Deneylerde “evet” sayısı: 11 · 13 · 10 (en az 10, en çok 13).');
    expect(c.join(' ')).not.toMatch(/çevirme/);
    const p = uygulanmis({ ...hazirSoruUygula('penalti')!, tahmin: '7' });
    expect(yorumCumleleri(planVerisi(p, tekrarla([['Gol', 9], ['Kaçtı', 1]])), p)).toEqual([
      '10 penaltı attık (simülasyon): 9 gol (%90); oyuncunun gol oranı %70.',
    ]);
  });

  it('hiçbir cümlede rakamdan sonra kesme işaretiyle ek, eski terim ya da emoji yok', () => {
    const cumleler: string[] = [];
    const meyve = uygulanmis({ ...hazirSoruUygula('meyve')!, kimden: '6-A', tahmin: 'Kivi' });
    cumleler.push(...yorumCumleleri(planVerisi(meyve, tekrarla([['Elma', 3], ['Muz', 3], ['Kivi', 1]])), meyve));
    const boy = uygulanmis({ ...hazirSoruUygula('boy')!, tahmin: '160' });
    cumleler.push(...yorumCumleleri(planVerisi(boy, [...BOYLAR, 124].map((b) => [String(b)])), boy));
    const cark = uygulanmis({ ...hazirSoruUygula('penalti')!, tahmin: '7' });
    cumleler.push(...yorumCumleleri(planVerisi(cark, tekrarla([['Gol', 7], ['Kaçtı', 3]])), cark));
    expect(cumleler.length).toBeGreaterThan(8);
    metinDenetle(cumleler);
  });
});

describe('araştırma: CSV adı', () => {
  it('sorudan, en çok 48 karakter, sözcük ortasından kesilmez', () => {
    expect(csvAdi(hazirSoruUygula('meyve')!)).toBe('veri-grafik-sinifimizda-en-cok-sevilen-meyve.csv');
    expect(csvAdi({ ...hazirSoruUygula('meyve')!, soru: '' })).toBe('veri-grafik-meyve.csv');
    expect(csvAdi({ ...varsayilanArastirma(), soru: '???' })).toBe('veri-grafik-tablom.csv');
    const uzun = csvAdi({ ...varsayilanArastirma(), soru: 'a'.repeat(80) });
    expect(uzun.length).toBeLessThanOrEqual(52);
    expect(uzun.endsWith('.csv')).toBe(true);
    for (const h of HAZIR_SORULAR) expect(csvAdi(hazirSoruUygula(h.id)!)).toMatch(/^veri-grafik-[a-z0-9-]{1,36}\.csv$/);
  });
});
