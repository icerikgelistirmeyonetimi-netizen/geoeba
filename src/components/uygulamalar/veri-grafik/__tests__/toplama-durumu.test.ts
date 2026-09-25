// Sahip: B1 (vg/toplamaDurumu.ts: plan uygulama, panel açma / kapama, toplanan veriyi yazma, Deney özeti)
import { describe, expect, it } from 'vitest';
import {
  acilisGorunumu,
  arastirmaYaz,
  ozeteGec,
  planUyarisi,
  planaDevamMi,
  planiUygula,
  toplamaAc,
  toplamaGorunumBilgisi,
  toplamaKapat,
  toplamaVerisiYaz,
  type ToplamaVerisi,
} from '../toplamaDurumu';
import {
  ESKI_DENEY_ADI,
  RENKSIZ,
  baslangicDurumu,
  durumCoz,
  durumMetindenCoz,
  eksenDuzelt,
  etkinTablo,
  etkinTabloYaz,
  kumeDegistir,
  oncekiTabloyaDon,
  sekmeDuzelt,
  type Durum,
} from '../durum';
import {
  anketSatiri,
  arastirmaBagli,
  arastirmaTurleriniOnar,
  hazirSoruUygula,
  olcumSatirlari,
  varsayilanArastirma,
  varsayilanGrup,
  type Arastirma,
} from '../arastirma';
import { OZET_SUTUNU, ozetTablosu } from '../deney';
import { degiskenSutunlari } from '../kategorik';
import { tabloOlustur, type VeriTablosu } from '../veri';

// ── Yardımcılar ─────────────────────────────────────────────────────────────

/** Kullanıcının kendi tablosu (iki sayısal değişken), kendi görünümüyle */
function kullaniciDurumu(degisiklik: Partial<Durum> = {}): Durum {
  const tablo = tabloOlustur(['Ad', 'Boy (cm)', 'Kütle (kg)'], [['Ali', 150, 42], ['Ayşe', 148, 40], ['Can', 155, 47]]);
  return {
    ...baslangicDurumu(),
    tablo,
    tabloAdi: null,
    ornekId: null,
    ornekTemiz: false,
    ipucu: 'kapali',
    sekme: 'sacilim',
    degisken: tablo.sutunlar[1].id,
    yDegisken: tablo.sutunlar[2].id,
    secenekler: { ortalama: true, oms: true, etiketler: false, ortanca: false },
    toplamaAcik: true,
    ...degisiklik,
  };
}

/** Görünüm alanları (derin eşitlik karşılaştırması için) */
function gorunum(d: Durum) {
  const { tablo, degisken, ikinciDegisken, aralik, sekme, secenekler, sutunModu, yDegisken, renkDegisken } = d;
  return { tablo, degisken, ikinciDegisken, aralik, sekme, secenekler, sutunModu, yDegisken, renkDegisken: renkDegisken ?? null };
}

function hazir(id: string): Arastirma {
  return hazirSoruUygula(id)!;
}

let sayac = 0;
const satir = (hucreler: string[], calisma?: number) => ({ kimlik: `t${++sayac}`, hucreler, ...(calisma === undefined ? {} : { calisma }) });

// ── Plan uygulama ───────────────────────────────────────────────────────────

describe('toplama durumu: plan uygulama (planiUygula)', () => {
  it('anket: boş plan tablosu, eksen cevapta, Nokta, Sayılar açık; eski tablo görünümüyle önceki tabloya', () => {
    const d0 = kullaniciDurumu();
    const { durum, onceki, tost } = planiUygula(d0, hazir('meyve'));
    const a = durum.arastirma!;
    expect(onceki).toBe(d0);
    expect(tost).toBe('Yeni tablo açıldı: Meyve. Önceki tablo saklandı.');
    expect(durum.tablo.sutunlar.map((s) => [s.ad, s.tur])).toEqual([['Meyve', 'etiket']]);
    expect(durum.tablo.satirlar).toEqual([]);
    expect(a.sutunlar).toEqual({ cevap: durum.tablo.sutunlar[0].id });
    expect(a.adim).toBe('topla');
    expect(durum).toMatchObject({ sekme: 'nokta', degisken: a.sutunlar!.cevap, ikinciDegisken: null, yDegisken: null, aralik: null, sutunModu: false, renkDegisken: null });
    expect(durum.secenekler).toEqual({ ortalama: false, oms: false, etiketler: true, ortanca: false });
    expect(durum).toMatchObject({ etkinKume: 'tablom', ornekId: null, ornekTemiz: false, tabloAdi: 'Meyve', toplamaAcik: true });
    expect(durum.oncekiTablo!.tablo).toBe(d0.tablo);
    expect(durum.oncekiTablo!.gorunum).toMatchObject({ sekme: 'sacilim', degisken: d0.degisken, yDegisken: d0.yDegisken, secenekler: d0.secenekler });
    expect(arastirmaBagli(durum.tablo, a)).toBe(true);
    // korunan karar 3: ilk dokunuştan önce eksen atanmış ve değişken sayılıyor
    expect(degiskenSutunlari(etkinTablo(durum)).map((s) => s.id)).toEqual([a.sutunlar!.cevap]);
  });

  it('soru yazılmadan başlanırsa soru plandan kurulur; ölçümde ne ölçüldüğü yazılmadan başlanamaz', () => {
    const d0 = kullaniciDurumu();
    const bos = { ...hazir('nabiz'), hazirId: null, soru: '  ' };
    expect(planiUygula(d0, bos).durum.arastirma!.soru).toBe('Nabız kaç atım/dk?');
    const adsiz = { ...bos, olcum: { ...bos.olcum, degiskenAdi: '' } };
    const r = planiUygula(d0, adsiz);
    expect(r.durum).toBe(d0);
    expect(r.tost).toBe('Neyi ölçtüğünüzü yazın (ör. Boy).');
    // Yazılmış soru değişmez
    expect(planiUygula(d0, hazir('nabiz')).durum.arastirma!.soru).toBe('Bir dakikada nabzımız kaç kez atıyor?');
  });

  it('Saçılım seçiliyken plan uygulanınca grafik Nokta olur (VT §16-3)', () => {
    const d0 = kullaniciDurumu({ sekme: 'sacilim' });
    for (const id of ['meyve', 'nabiz', 'para', 'iki-zar']) expect(planiUygula(d0, hazir(id)).durum.sekme).toBe('nokta');
  });

  it('eski tablo boşken önceki tablo değişmez; ikinci hazır soru önceki tablonun üstüne yazılmaz', () => {
    const d0 = kullaniciDurumu();
    const bir = planiUygula(d0, hazir('meyve')).durum;
    const iki = planiUygula(bir, hazir('mevsim'));
    expect(iki.tost).toBe('Yeni tablo açıldı: Mevsim.');
    expect(iki.durum.oncekiTablo).toBe(bir.oncekiTablo);
    expect(iki.durum.oncekiTablo!.tablo).toBe(d0.tablo);
    expect(iki.durum.tablo.sutunlar[0].ad).toBe('Mevsim');
    const bos = kullaniciDurumu({ tablo: { sutunlar: d0.tablo.sutunlar, satirlar: [] }, oncekiTablo: null });
    const r = planiUygula(bos, hazir('meyve'));
    expect(r.durum.oncekiTablo).toBeNull();
    expect(r.tost).toBe('Yeni tablo açıldı: Meyve.');
  });

  it('değiştirilmemiş örnek: önceki tablo boşken saklanır, doluysa üstüne yazılmaz', () => {
    const ornek = baslangicDurumu();
    expect(ornek.ornekTemiz && ornek.ornekId).toBeTruthy();
    const r = planiUygula(ornek, hazir('meyve'));
    expect(r.tost).toBe('Yeni tablo açıldı: Meyve. Önceki tablo saklandı.');
    expect(r.durum.oncekiTablo).toMatchObject({ tablo: ornek.tablo, ornekId: ornek.ornekId, ornekTemiz: true });
    const kullanici = kullaniciDurumu();
    const saklanan = { tablo: kullanici.tablo, ad: 'Boy (cm)', gorunum: { degisken: null, ikinciDegisken: null, aralik: null } };
    const r2 = planiUygula({ ...ornek, oncekiTablo: saklanan }, hazir('meyve'));
    expect(r2.durum.oncekiTablo).toBe(saklanan);
    expect(r2.tost).toBe('Yeni tablo açıldı: Meyve.');
  });

  it('deney kategorik: renk anahtarı açıkça sonuç sütunu; sayı küpü ve iki küp renksiz, eksen alanlı', () => {
    const para = planiUygula(kullaniciDurumu(), hazir('para')).durum;
    const s0 = para.arastirma!.sutunlar!.s0!;
    expect(para).toMatchObject({ degisken: s0, renkDegisken: s0, sekme: 'nokta' });
    expect(para.secenekler.etiketler).toBe(true);
    expect(para.arastirma!.deney.calismalar).toEqual([]);
    const zar = planiUygula(kullaniciDurumu(), hazir('zar')).durum;
    expect(zar).toMatchObject({ degisken: zar.arastirma!.sutunlar!.s0, renkDegisken: null });
    expect(zar.secenekler.etiketler).toBe(false);
    expect(toplamaGorunumBilgisi(zar).eksenAlani).toEqual({ min: 1, max: 6 });
    const iki = planiUygula(kullaniciDurumu(), hazir('iki-zar')).durum;
    expect(iki.degisken).toBe(iki.arastirma!.sutunlar!.toplam);
    expect(toplamaGorunumBilgisi(iki).eksenAlani).toEqual({ min: 2, max: 12 });
  });

  it('ölçüm ve sayısal anket: seçenekler kapalı; grup varsa renk anahtarı grup', () => {
    const nabiz = planiUygula(kullaniciDurumu(), hazir('nabiz')).durum;
    expect(nabiz.degisken).toBe(nabiz.arastirma!.sutunlar!.deger);
    expect(nabiz.secenekler).toEqual({ ortalama: false, oms: false, etiketler: false, ortanca: false });
    expect(nabiz.tabloAdi).toBe('Nabız (atım/dk)');
    const kardes = planiUygula(kullaniciDurumu(), hazir('kardes')).durum;
    expect(kardes.secenekler.etiketler).toBe(false);
    const m = hazir('meyve');
    const gruplu = planiUygula(kullaniciDurumu(), { ...m, anket: { ...m.anket, grup: varsayilanGrup() } }).durum;
    expect(gruplu.renkDegisken).toBe(gruplu.arastirma!.sutunlar!.grup);
    expect(acilisGorunumu(varsayilanArastirma())).toEqual({ sekme: 'nokta', ikinciDegisken: null, aralik: null, yDegisken: null, sutunModu: false });
  });

  it('Seri kartı Düzenle adımında açılır; plan sorunu varsa durum değişmez', () => {
    expect(planiUygula(kullaniciDurumu(), hazir('seri')).durum.arastirma!.adim).toBe('duzenle');
    const d0 = kullaniciDurumu();
    const r = planiUygula(d0, varsayilanArastirma());
    expect(r.durum).toBe(d0);
    expect(r.tost).toBe('Önce veriyi nasıl toplayacağınızı seçin.');
  });

  it('bağı kopmuş, daha önce uygulanmış plan yeniden başlar: yeni kimlik, çalışmalar ve sonuç boşalır', () => {
    let d = planiUygula(kullaniciDurumu(), hazir('para')).durum;
    d = toplamaVerisiYaz(d, { calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 20 }, ekle: [satir(['Tura']), satir(['Yazı'])] });
    d = { ...d, arastirma: { ...d.arastirma!, sonuc: 'Yarı yarıya.' } };
    const eski = d.arastirma!;
    const donus = oncekiTabloyaDon(d);
    expect(arastirmaBagli(donus.tablo, donus.arastirma)).toBe(false);
    const r = planiUygula(donus, eski);
    const a = r.durum.arastirma!;
    expect(a.kimlik).not.toBe(eski.kimlik);
    expect(a.deney.calismalar).toEqual([]);
    expect(a.sonuc).toBe('');
    expect(a.soru).toBe(eski.soru);
    expect(r.durum.tablo.satirlar).toEqual([]);
  });

  it('bağlı araştırmaya devam: tablo korunur, yeni grup sütunu cevabın yanına eklenir, ad değişikliği yansır', () => {
    let d = planiUygula(kullaniciDurumu(), hazir('meyve')).durum;
    const a = d.arastirma!;
    d = toplamaVerisiYaz(d, { ekle: [satir(anketSatiri(a, 'Elma')), satir(anketSatiri(a, 'Muz'))] });
    expect(planaDevamMi(d, d.arastirma!)).toBe(true);
    const ayni = planiUygula(d, { ...d.arastirma!, adim: 'plan' });
    expect(ayni.tost).toBe('');
    expect(ayni.durum.tablo).toBe(d.tablo);
    expect(ayni.durum.arastirma!.adim).toBe('topla');
    const yeni = { ...d.arastirma!, anket: { ...d.arastirma!.anket, degiskenAdi: 'Meyveler', grup: varsayilanGrup() } };
    const r = planiUygula(d, yeni);
    expect(r.tost).toBe('Tabloya Sınıf sütunu eklendi.');
    expect(r.durum.tablo.sutunlar.map((s) => s.ad)).toEqual(['Meyveler', 'Sınıf']);
    expect(r.durum.tablo.satirlar.map((s) => s.hucreler)).toEqual([['Elma', ''], ['Muz', '']]);
    expect(r.durum.arastirma!.kimlik).toBe(a.kimlik);
    expect(r.durum.arastirma!.sutunlar!.grup).toBe(`${a.kimlik}-grup`);
    expect(arastirmaBagli(r.durum.tablo, r.durum.arastirma)).toBe(true);
    // ölçümde "Adları da yaz" sütunu en başa gelir
    let o = planiUygula(kullaniciDurumu(), hazir('nabiz')).durum;
    o = toplamaVerisiYaz(o, { ekle: olcumSatirlari(o.arastirma!, [84]).map((h) => satir(h)) });
    const adli = planiUygula(o, { ...o.arastirma!, olcum: { ...o.arastirma!.olcum, adYaz: true } });
    expect(adli.durum.tablo.sutunlar.map((s) => s.ad)).toEqual(['Öğrenci', 'Nabız (atım/dk)']);
    expect(adli.durum.tablo.satirlar[0].hucreler).toEqual(['', '84']);
  });

  it('nesne değişince devam edilmez, yeni tablo açılır', () => {
    let d = planiUygula(kullaniciDurumu(), hazir('para')).durum;
    d = toplamaVerisiYaz(d, { calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 20 }, ekle: [satir(['Tura'])] });
    const zar = { ...d.arastirma!, deney: { ...d.arastirma!.deney, nesne: 'zar' as const } };
    expect(planaDevamMi(d, zar)).toBe(false);
    const r = planiUygula(d, zar);
    expect(r.durum.tablo.sutunlar.map((s) => s.ad)).toEqual(['Sayı küpü']);
    expect(r.durum.oncekiTablo!.tablo).toBe(d.tablo);
    expect(r.tost).toBe('Yeni tablo açıldı: Sayı küpü. Önceki tablo saklandı.');
  });

  it('planUyarisi: dolu tablo saklanır; saklanmayacak örnek; boş tablo ve devamda yok', () => {
    const d0 = kullaniciDurumu();
    expect(planUyarisi(d0, hazir('meyve'))).toBe('Başlayınca yeni tablo açılır. Şimdiki tablo (Boy (cm), 3 satır) saklanır: Örnek veri ▸ Önceki tabloya dön.');
    const ornek = { ...baslangicDurumu(), oncekiTablo: { tablo: d0.tablo, ad: 'Boy (cm)', gorunum: { degisken: null, ikinciDegisken: null, aralik: null } } };
    expect(planUyarisi(ornek, hazir('meyve'))).toMatch(/^Başlayınca yeni tablo açılır\. Şimdiki örnek \(.+\) Örnek veri menüsünden yeniden açılabilir\.$/);
    const bos = planiUygula(d0, hazir('meyve')).durum;
    expect(planUyarisi(bos, hazir('mevsim'))).toBeNull();
    const dolu = toplamaVerisiYaz(bos, { ekle: [satir(['Elma'])] });
    expect(planUyarisi(dolu, dolu.arastirma!)).toBeNull();
  });
});

describe('toplama durumu: araştırmayı yazma (arastirmaYaz)', () => {
  it('aynı kimlikte sütunlar ve çalışmalar korunur; başka kimlik yerine geçer', () => {
    let d = planiUygula(kullaniciDurumu(), hazir('para')).durum;
    const bayat = d.arastirma!;
    d = toplamaVerisiYaz(d, { calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 20 }, ekle: [satir(['Tura'])] });
    const y = arastirmaYaz(d, { ...bayat, tahmin: '10' });
    expect(y.arastirma!.tahmin).toBe('10');
    expect(y.arastirma!.deney.calismalar).toBe(d.arastirma!.deney.calismalar);
    expect(y.arastirma!.sutunlar).toBe(d.arastirma!.sutunlar);
    const yeni = varsayilanArastirma();
    expect(arastirmaYaz(d, yeni).arastirma).toBe(yeni);
    expect(arastirmaYaz(d, d.arastirma!)).toBe(d);
    expect(arastirmaYaz(d, yeni).tablo).toBe(d.tablo);
  });
});

describe('toplama durumu: paneli açma ve kapatma', () => {
  it('toplamaAc: yalnız toplamaAcik; tablo, küme ve görünüm değişmez; açıksa aynı durum', () => {
    const d0 = kullaniciDurumu({ toplamaAcik: false });
    const a = toplamaAc(d0);
    expect(a.toplamaAcik).toBe(true);
    expect(a.tablo).toBe(d0.tablo);
    expect(a.etkinKume).toBe(d0.etkinKume);
    expect(gorunum(a)).toEqual(gorunum(d0));
    expect(toplamaAc(a)).toBe(a);
  });

  it('veri toplanmadan kapatınca önceki tablo ve görünüm aynen geri gelir (derin eşitlik)', () => {
    const d0 = kullaniciDurumu();
    const plan = planiUygula(d0, hazir('meyve')).durum;
    const { durum, tost } = toplamaKapat(plan);
    expect(tost).toBe('Veri toplanmadı; önceki tablo geri geldi.');
    expect(gorunum(durum)).toEqual(gorunum(d0));
    expect(durum.toplamaAcik).toBe(false);
    expect(durum.oncekiTablo).toBeNull();
    expect(arastirmaBagli(durum.tablo, durum.arastirma)).toBe(false);
    expect(durum.arastirma!.soru).toBe(plan.arastirma!.soru);
  });

  it('değiştirilmemiş örnekten başlayıp veri toplanmadan kapatınca örnek geri gelir', () => {
    const ornek = baslangicDurumu();
    const { durum } = toplamaKapat(planiUygula(ornek, hazir('para')).durum);
    expect(durum.tablo).toBe(ornek.tablo);
    expect([durum.ornekId, durum.ornekTemiz]).toEqual([ornek.ornekId, true]);
    expect(durum.ipucu).toBe(ornek.ipucu);
  });

  it('değiştirilmemiş örnek, önceki tablo doluyken: veri toplanmadan kapatınca örnek ve görünümü gelir, önceki tablo değişmez (K3)', () => {
    const saklanan = { tablo: kullaniciDurumu().tablo, ad: 'Boy (cm)', gorunum: { degisken: null, ikinciDegisken: null, aralik: null } };
    const ornek0 = baslangicDurumu();
    const ornek: Durum = { ...ornek0, oncekiTablo: saklanan, sekme: 'sutun', degisken: ornek0.tablo.sutunlar[1].id, secenekler: { ortalama: true, oms: false, etiketler: true, ortanca: false } };
    const plan = planiUygula(ornek, hazir('meyve')).durum;
    expect(plan.oncekiTablo).toBe(saklanan);
    expect(plan.toplamaOncesi).toMatchObject({ tablo: ornek.tablo, ornekId: ornek.ornekId, ornekTemiz: true });
    // zincirleme hazır soru (şimdiki plan tablosu boş): görüntü taşınır
    const plan2 = planiUygula(plan, hazir('para')).durum;
    expect(plan2.toplamaOncesi).toBe(plan.toplamaOncesi);
    const k = toplamaKapat(plan2);
    expect(k.tost).toBe('Veri toplanmadı; önceki tablo geri geldi.');
    expect(gorunum(k.durum)).toEqual(gorunum(ornek));
    expect([k.durum.ornekId, k.durum.ornekTemiz, k.durum.tabloAdi]).toEqual([ornek.ornekId, true, ornek.tabloAdi]);
    expect(k.durum.oncekiTablo).toBe(saklanan);
    expect(k.durum.toplamaOncesi).toBeNull();
    // kayıttan okunur
    expect(durumCoz(JSON.parse(JSON.stringify(plan)))!.toplamaOncesi).toMatchObject({ tablo: ornek.tablo, ornekId: ornek.ornekId });
    // veri toplanınca kapatma tabloyu bırakır ve görüntüyü siler; başka tablo değişikliği de siler
    const dolu = toplamaKapat(toplamaVerisiYaz(plan, { ekle: [satir(['Elma'])] }));
    expect(dolu.tost).toBeNull();
    expect(dolu.durum.toplamaOncesi).toBeNull();
    expect(oncekiTabloyaDon(plan).toplamaOncesi).toBeNull();
    // önceki tablo boşken örnek önceki tabloya yazılır; ayrı görüntü tutulmaz
    expect(planiUygula(ornek0, hazir('meyve')).durum.toplamaOncesi).toBeNull();
  });

  it('göç (VT §9.4, durumCoz): eski panelin açık kaydı açık Veri topla paneli, Tablom aynen, eski deney önceki tablo olur', () => {
    // C-5'ten önceki sürümün (eski örnekleyici) yazdığı biçim: ölçüm kümesi açık, eski panel açık, toplamaAcik false
    const eski = {
      surum: 1,
      tablo: { sutunlar: [{ id: 's1', ad: 'Öğrenci', tur: 'etiket' }, { id: 's2', ad: 'Boy (cm)', tur: 'sayi' }], satirlar: [{ id: 'a', hucreler: ['7C-01', '152'] }, { id: 'b', hucreler: ['7C-02', '145'] }] },
      sekme: 'nokta',
      degisken: 'vg-olcu-1',
      etkinKume: 'olcum',
      gorunumler: { tablom: { degisken: 's2', ikinciDegisken: null, aralik: null, sekme: 'nokta' } },
      deneyTablosu: { sutunlar: [{ id: 'vg-cekilis', ad: 'Çekiliş', tur: 'etiket' }, { id: 'vg-a1', ad: 'Sonuç', tur: 'etiket' }], satirlar: [{ id: 'r1', hucreler: ['1', 'Tura'] }, { id: 'r2', hucreler: ['2', 'Yazı'] }] },
      olcumTablosu: { sutunlar: [{ id: 'vg-tekrar', ad: 'Tekrar', tur: 'etiket' }, { id: 'vg-olcu-1', ad: 'Tura sayısı', tur: 'sayi' }], satirlar: [{ id: 'm1', hucreler: ['1', '9'] }] },
      ornekleyiciAcik: true,
      toplamaAcik: false,
      oncekiTablo: null,
    };
    const g = durumCoz(eski)!;
    // Tablom aynen; Ölçümler kümesi yerine Tablom ve onun saklı görünümü
    expect(g.tablo.sutunlar.map((s) => [s.id, s.ad, s.tur])).toEqual([['s1', 'Öğrenci', 'etiket'], ['s2', 'Boy (cm)', 'sayi']]);
    expect(g.tablo.satirlar).toEqual(eski.tablo.satirlar);
    expect(g.etkinKume).toBe('tablom');
    expect(g.degisken).toBe('s2');
    expect(g.toplamaAcik).toBe(true);
    expect(g.oncekiTablo?.ad).toBe(ESKI_DENEY_ADI);
    expect(g.oncekiTablo?.tablo).toEqual({ sutunlar: [{ id: 'vg-a1', ad: 'Sonuç', tur: 'etiket' }], satirlar: [{ id: 'r1', hucreler: ['Tura'] }, { id: 'r2', hucreler: ['Yazı'] }] });
    // Eski alanlar durumda yok; eski kümelerin görünümleri düşer
    for (const alan of ['deneyTablosu', 'olcumTablosu', 'ornekleyici', 'ornekleyiciAcik']) expect(alan in g).toBe(false);
    expect(Object.keys(g.gorunumler)).toEqual(['tablom']);
    // Bir kez taşınır: kapatılan panel yenilemede yeniden açılmaz; önceki tablo (eski deney) kalır
    const yeniden = durumCoz(JSON.parse(JSON.stringify(toplamaKapat(g).durum)))!;
    expect(yeniden.toplamaAcik).toBe(false);
    expect(yeniden.oncekiTablo?.tablo).toEqual(g.oncekiTablo?.tablo);
    // "Önceki tabloya dön" eski deney sonuçlarını getirir; Tablom önceki tablo olur
    const don = oncekiTabloyaDon(g);
    expect([don.tabloAdi, don.tablo.satirlar.length, don.oncekiTablo?.tablo.satirlar.length]).toEqual([ESKI_DENEY_ADI, 2, 2]);
    // Önceki tablo doluysa üstüne yazılmaz
    const saklanan = { tablo: kullaniciDurumu().tablo, ad: 'Boy (cm)', gorunum: { degisken: null, ikinciDegisken: null, aralik: null } };
    expect(durumCoz({ ...eski, oncekiTablo: saklanan })!.oncekiTablo?.ad).toBe('Boy (cm)');
    // Boş eski deney tablosu önceki tablo olmaz
    expect(durumCoz({ ...eski, deneyTablosu: { ...eski.deneyTablosu, satirlar: [] } })!.oncekiTablo).toBeNull();
  });

  it('göç (VT §14): "Deney sonuçları" açık, sekme Saçılım, eski panel açık → Tablom ve görünümü, Nokta, açık panel', () => {
    const tablo = tabloOlustur(['Öğrenci', 'Boy (cm)'], [['Ali', 150], ['Ayşe', 148], ['Can', 155]]);
    const eski = {
      surum: 1,
      tablo,
      sekme: 'sacilim',
      degisken: 'vg-ay-1',
      yDegisken: 'vg-toplam',
      etkinKume: 'deney',
      gorunumler: { tablom: { degisken: tablo.sutunlar[1].id, ikinciDegisken: null, aralik: null } },
      deneyTablosu: {
        sutunlar: [
          { id: 'vg-cekilis', ad: 'Çekiliş', tur: 'etiket' },
          { id: 'vg-ay-1', ad: 'Zar 1', tur: 'sayi' },
          { id: 'vg-ay-2', ad: 'Zar 2', tur: 'sayi' },
          { id: 'vg-toplam', ad: 'Toplam', tur: 'sayi' },
        ],
        satirlar: [{ id: 'z1', hucreler: ['1', '3', '4', '7'] }],
      },
      ornekleyici: { aygitlar: [], toplamSutunu: true, cekilisSayisi: 100, hiz: 1, olcum: { kaynak: 'toplam', olcu: 'sayisi', hedef: '7' } },
      ornekleyiciAcik: true,
    };
    const d = sekmeDuzelt(eksenDuzelt(durumCoz(eski)!));
    expect(d.tablo.satirlar).toEqual(tablo.satirlar);
    expect([d.etkinKume, d.degisken, d.toplamaAcik]).toEqual(['tablom', tablo.sutunlar[1].id, true]);
    // Tablom'da tek sayısal değişken: Saçılım çizilemez, Nokta'ya döner; saçılımın eski dikey ekseni kalkar
    expect(d.sekme).toBe('nokta');
    expect(d.yDegisken).toBeNull();
    expect(d.oncekiTablo?.tablo.sutunlar.map((s) => s.ad)).toEqual(['Zar 1', 'Zar 2', 'Toplam']);
    // Bozuk araştırma → null; bozuk JSON → null (varsayılan kullanılır)
    expect(durumCoz({ ...eski, arastirma: 'bozuk' })!.arastirma).toBeNull();
    expect(durumMetindenCoz('{"surum":1,"tablo":')).toBeNull();
  });

  it('veri varken tablo kalır; Deney özeti açıksa Tablom a dönülür', () => {
    let d = planiUygula(kullaniciDurumu(), hazir('meyve')).durum;
    d = toplamaVerisiYaz(d, { ekle: [satir(['Elma'])] });
    const k = toplamaKapat(d);
    expect(k.tost).toBeNull();
    expect(k.durum.tablo).toBe(d.tablo);
    expect(toplamaGorunumBilgisi(k.durum).soruSeridi).not.toBeNull();
    let p = planiUygula(kullaniciDurumu(), hazir('para')).durum;
    p = toplamaVerisiYaz(p, { calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 500 }, ekle: [satir(['Tura']), satir(['Yazı'])] });
    p = ozeteGec(p);
    expect(p.etkinKume).toBe('ozet');
    const pk = toplamaKapat(p);
    expect(pk.durum.etkinKume).toBe('tablom');
    expect(pk.durum.sekme).toBe('nokta');
    // tabloya yazılmayan (500+) çalışma da veridir: önceki tabloya dönülmez
    expect(pk.tost).toBeNull();
    expect(pk.durum.tablo).toBe(p.tablo);
  });

  it('önceki tablo yokken boş plan tablosu kalır; bağ yokken kapatma yalnız paneli kapatır', () => {
    const bos = kullaniciDurumu({ tablo: { sutunlar: [], satirlar: [] }, oncekiTablo: null });
    const plan = planiUygula(bos, hazir('meyve')).durum;
    const k = toplamaKapat(plan);
    expect(k.tost).toBeNull();
    expect(k.durum.tablo).toBe(plan.tablo);
    const d0 = kullaniciDurumu();
    const k2 = toplamaKapat(d0);
    expect(k2.durum.tablo).toBe(d0.tablo);
    expect(k2.durum.toplamaAcik).toBe(false);
    expect(toplamaKapat(k2.durum).durum).toBe(k2.durum);
  });
});

describe('toplama durumu: toplanan veriyi yazma (toplamaVerisiYaz)', () => {
  it('anket: satır veri rolleri sırasıyla yazılır; sil kimlikle siler; bağ yoksa yazılmaz', () => {
    const m = hazir('meyve');
    let d = planiUygula(kullaniciDurumu(), { ...m, anket: { ...m.anket, grup: varsayilanGrup() } }).durum;
    const a = d.arastirma!;
    d = toplamaVerisiYaz(d, { ekle: [{ kimlik: 'r1', hucreler: anketSatiri(a, 'Elma') }, { kimlik: 'r2', hucreler: anketSatiri(a, 'Muz', 1) }] });
    expect(d.tablo.satirlar).toEqual([
      { id: 'r1', hucreler: ['Elma', '6-A'] },
      { id: 'r2', hucreler: ['Muz', '6-B'] },
    ]);
    // kullanıcının eklediği sütun boş kalır
    const ekli = { ...d, tablo: { sutunlar: [...d.tablo.sutunlar, { id: 'not', ad: 'Not', tur: 'etiket' as const }], satirlar: d.tablo.satirlar.map((r) => ({ ...r, hucreler: [...r.hucreler, 'x'] })) } };
    const e = toplamaVerisiYaz(ekli, { ekle: [{ kimlik: 'r3', hucreler: ['Çilek', '6-A'] }] });
    expect(e.tablo.satirlar[2]).toEqual({ id: 'r3', hucreler: ['Çilek', '6-A', ''] });
    const s = toplamaVerisiYaz(d, { sil: ['r1'] });
    expect(s.tablo.satirlar.map((r) => r.id)).toEqual(['r2']);
    expect(toplamaVerisiYaz(d, { sil: ['yok'] })).toBe(d);
    expect(toplamaVerisiYaz(d, {})).toBe(d);
    const bagsiz = { ...d, arastirma: { ...a, sutunlar: { cevap: 'ar1-x-cevap' } } };
    expect(toplamaVerisiYaz(bagsiz, { ekle: [satir(['Elma'])] }).tablo).toBe(bagsiz.tablo);
    expect(toplamaVerisiYaz({ ...d, arastirma: null }, { ekle: [satir(['Elma'])] }).tablo.satirlar).toHaveLength(2);
  });

  it('ölçüm: ad ve grup sütunlarıyla; anket 2000 satırda durur', () => {
    const n = hazir('nabiz');
    let d = planiUygula(kullaniciDurumu(), { ...n, olcum: { ...n.olcum, adYaz: true } }).durum;
    d = toplamaVerisiYaz(d, { ekle: olcumSatirlari(d.arastirma!, [84.4, 90], 'Ali').map((h) => satir(h)) });
    expect(d.tablo.satirlar.map((r) => r.hucreler)).toEqual([['Ali', '84'], ['Ali', '90']]);
    let m = planiUygula(kullaniciDurumu(), hazir('meyve')).durum;
    m = { ...m, tablo: { ...m.tablo, satirlar: Array.from({ length: 1999 }, (_, i) => ({ id: `e${i}`, hucreler: ['Elma'] })) } };
    const dolu = toplamaVerisiYaz(m, { ekle: [satir(['Muz']), satir(['Çilek'])] });
    expect(dolu.tablo.satirlar).toHaveLength(2000);
    expect(dolu.tablo.satirlar[1999].hucreler).toEqual(['Muz']);
  });

  it('deney: çalışma başlat + satırlar; ikinci çalışmada Deney sütunu; bitir etiketi düzeltir; sil satırları götürür', () => {
    let d = planiUygula(kullaniciDurumu(), hazir('para')).durum;
    d = toplamaVerisiYaz(d, { calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 20 }, ekle: [satir(['Tura']), satir(['Yazı']), satir(['Tura'])] });
    expect(d.tablo.sutunlar).toHaveLength(1);
    expect(d.arastirma!.deney.calismalar).toEqual([{ no: 1, etiket: '1. deney (20)', n: 3, sayilar: { Tura: 2, Yazı: 1 }, tabloda: true, gercek: false }]);
    // satırlar çalışmasız gelir: son çalışmaya yazılır; bitirilince "1. deney (4)"
    d = toplamaVerisiYaz(d, { ekle: [satir(['Yazı'])], calismaBitir: 1 });
    expect(d.arastirma!.deney.calismalar[0].etiket).toBe('1. deney (4)');
    d = toplamaVerisiYaz(d, { calismaBaslat: { no: 2, kayit: 'simulasyon', hedef: 20 }, ekle: [satir(['Tura']), satir(['Tura'])] });
    expect(d.tablo.sutunlar.map((s) => s.ad)).toEqual(['Para', 'Deney']);
    expect(d.tablo.satirlar.map((r) => r.hucreler[1])).toEqual(['1. deney (4)', '1. deney (4)', '1. deney (4)', '1. deney (4)', '2. deney (20)', '2. deney (20)']);
    d = toplamaVerisiYaz(d, { calismaBitir: 2 });
    expect(d.tablo.satirlar.slice(4).map((r) => r.hucreler[1])).toEqual(['2. deney (2)', '2. deney (2)']);
    expect(ozetTablosu(d.tablo, d.arastirma).satirlar.map((r) => r.hucreler.slice(0, 3))).toEqual([
      ['1. deney (4)', '4', '2'],
      ['2. deney (2)', '2', '2'],
    ]);
    const s = toplamaVerisiYaz(d, { calismaSil: 2 });
    expect(s.tablo.satirlar).toHaveLength(4);
    expect(s.arastirma!.deney.calismalar.map((c) => c.no)).toEqual([1]);
  });

  it('deney: bayat araştırma kopyası çalışmaları silmez; gerçek atışlar kendiliğinden kurulur ve geri alınır', () => {
    let d = planiUygula(kullaniciDurumu(), hazir('para')).durum;
    const bayat = d.arastirma!;
    d = toplamaVerisiYaz(d, { calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 20 }, ekle: [satir(['Tura'])] });
    d = toplamaVerisiYaz(d, { arastirma: { ...bayat, tahmin: '12' }, calismaBaslat: { no: 2, kayit: 'simulasyon', hedef: 20 }, ekle: [satir(['Yazı'])] });
    expect(d.arastirma!.tahmin).toBe('12');
    expect(d.arastirma!.deney.calismalar.map((c) => c.no)).toEqual([1, 2]);
    expect(d.arastirma!.sutunlar!.deney).toBeDefined();
    const g = toplamaVerisiYaz(d, { ekle: [{ kimlik: 'g1', hucreler: ['Tura'], calisma: 0 }, { kimlik: 'g2', hucreler: ['Tura'], calisma: 0 }] });
    const gercek = g.arastirma!.deney.calismalar.find((c) => c.gercek)!;
    expect(gercek).toMatchObject({ etiket: 'Gerçek atışlar', n: 2 });
    expect(g.tablo.satirlar.slice(-2).map((r) => r.hucreler)).toEqual([['Tura', 'Gerçek atışlar'], ['Tura', 'Gerçek atışlar']]);
    // "Son atışı geri al": satır silinir, gerçek atışların sayısı tablodan yeniden hesaplanır
    const geri = toplamaVerisiYaz(g, { sil: ['g2'] });
    expect(geri.arastirma!.deney.calismalar.find((c) => c.gercek)).toMatchObject({ n: 1, sayilar: { Tura: 1 } });
    // Elle kaydet kipinde çalışmasız satırlar gerçek atışlara gider
    const elle = { ...g, arastirma: { ...g.arastirma!, deney: { ...g.arastirma!.deney, kayit: 'gercek' as const } } };
    expect(toplamaVerisiYaz(elle, { ekle: [satir(['Yazı'])] }).tablo.satirlar.at(-1)!.hucreler).toEqual(['Yazı', 'Gerçek atışlar']);
  });

  it('deney: 500 atışlık çalışma tabloya yazılmaz, özete yazılır', () => {
    let d = planiUygula(kullaniciDurumu(), hazir('para')).durum;
    const satirlar = Array.from({ length: 500 }, (_, i) => satir([i < 260 ? 'Tura' : 'Yazı']));
    d = toplamaVerisiYaz(d, { calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 500 }, ekle: satirlar, calismaBitir: 1 });
    expect(d.tablo.satirlar).toEqual([]);
    expect(ozetTablosu(d.tablo, d.arastirma).satirlar[0].hucreler).toEqual(['1. deney (500)', '500', '260', '52', '50']);
  });

  it('iki küp: üç sonuç sütunu doldurulur', () => {
    let d = planiUygula(kullaniciDurumu(), hazir('iki-zar')).durum;
    d = toplamaVerisiYaz(d, { calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 100 }, ekle: [satir(['3', '4', '7'])] });
    expect(d.tablo.satirlar[0].hucreler).toEqual(['3', '4', '7']);
    expect(d.arastirma!.deney.calismalar[0].sayilar).toEqual({ '7': 1 });
  });
});

describe('toplama durumu: Deney özeti (ozeteGec)', () => {
  function seriDurumu(teorikGoster = true): Durum {
    const p = hazir('para');
    let d = planiUygula(kullaniciDurumu(), { ...p, deney: { ...p.deney, teorikGoster } }).durum;
    const veri: ToplamaVerisi[] = [
      { calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 4 }, ekle: [satir(['Tura']), satir(['Yazı']), satir(['Tura']), satir(['Tura'])], calismaBitir: 1 },
      { calismaBaslat: { no: 2, kayit: 'simulasyon', hedef: 2 }, ekle: [satir(['Yazı']), satir(['Tura'])], calismaBitir: 2 },
    ];
    for (const v of veri) d = toplamaVerisiYaz(d, v);
    return d;
  }

  it('küme özet, sekme Çizgi, eksen göreli sıklık, ikinci değişken teorik (kesikli), renksiz', () => {
    const d = seriDurumu();
    const o = ozeteGec(d);
    expect(o).toMatchObject({ etkinKume: 'ozet', sekme: 'cizgi', degisken: OZET_SUTUNU.oran, ikinciDegisken: OZET_SUTUNU.teorik, renkDegisken: RENKSIZ });
    expect(etkinTablo(o).satirlar.map((r) => r.hucreler)).toEqual([
      ['1. deney (4)', '4', '3', '75', '50'],
      ['2. deney (2)', '2', '1', '50', '50'],
    ]);
    expect(etkinTabloYaz(o, { sutunlar: [], satirlar: [] })).toBe(o);
    // Atışlar'a dönüş Tablom'un görünümünü geri getirir
    const geri = kumeDegistir(o, 'tablom');
    expect(geri).toMatchObject({ etkinKume: 'tablom', sekme: 'nokta', degisken: d.degisken, renkDegisken: d.renkDegisken });
  });

  it('teorik gösterilmiyorsa ikinci değişken yok; deney araştırması yoksa durum değişmez', () => {
    expect(ozeteGec(seriDurumu(false)).ikinciDegisken).toBeNull();
    const anket = planiUygula(kullaniciDurumu(), hazir('meyve')).durum;
    expect(ozeteGec(anket)).toBe(anket);
  });
});

describe('toplama durumu: grafik ve tablo bilgileri (toplamaGorunumBilgisi)', () => {
  it('bağ yokken boş', () => {
    const b = toplamaGorunumBilgisi(kullaniciDurumu());
    expect(b).toEqual({ bagli: false, eksenAlani: null, yEnAz: undefined, bosIpucu: undefined, bosIleti: undefined, kategoriSiralari: new Map(), soruSeridi: null, deneyVerisi: false });
  });

  it('anket: yEnAz panel açıkken ve eksen cevaptayken; boş iletiler, kategori sırası, soru şeridi', () => {
    const d = planiUygula(kullaniciDurumu(), { ...hazir('meyve'), kimden: '6-A sınıfı' }).durum;
    const b = toplamaGorunumBilgisi(d);
    expect(b.bagli).toBe(true);
    expect(b.yEnAz).toBe(5);
    expect(b.bosIpucu).toBe('İlk cevapla noktalar burada belirir.');
    expect(b.bosIleti).toBe('Henüz cevap yok. Soldaki kutucuklara dokunun; her cevap buraya bir satır olarak yazılır.');
    expect(b.kategoriSiralari.get(d.arastirma!.sutunlar!.cevap!)).toEqual(['Elma', 'Muz', 'Çilek', 'Portakal', 'Karpuz']);
    expect(b.soruSeridi).toEqual({ soru: 'Sınıfımızda en çok sevilen meyve hangisi?', altBilgi: '6-A sınıfı · henüz veri yok' });
    expect(b.deneyVerisi).toBe(false);
    expect(b.eksenAlani).toBeNull();
    expect(toplamaGorunumBilgisi({ ...d, toplamaAcik: false }).yEnAz).toBeUndefined();
    expect(toplamaGorunumBilgisi({ ...d, sekme: 'sutun' }).bosIpucu).toBe('İlk cevapla sütunlar burada belirir.');
  });

  it('ölçüm eksen alanı; deney verisi; özet kümesinde yalnız deney bilgisi', () => {
    const n = planiUygula(kullaniciDurumu(), hazir('nabiz')).durum;
    expect(toplamaGorunumBilgisi(n).eksenAlani).toEqual({ min: 60, max: 120 });
    expect(toplamaGorunumBilgisi(n).yEnAz).toBeUndefined();
    const p = planiUygula(kullaniciDurumu(), hazir('para')).durum;
    const b = toplamaGorunumBilgisi(p);
    expect(b.deneyVerisi).toBe(true);
    expect(b.yEnAz).toBe(14);
    const o = toplamaGorunumBilgisi(ozeteGec(p));
    expect(o).toMatchObject({ bagli: true, eksenAlani: null, yEnAz: undefined, bosIpucu: undefined, bosIleti: undefined, deneyVerisi: true });
    expect(o.kategoriSiralari.size).toBe(0);
  });

  it('kalıcılık: plan uygulanmış durum JSON gidiş-dönüşünde bağlı kalır', () => {
    let d = planiUygula(kullaniciDurumu(), hazir('para')).durum;
    d = toplamaVerisiYaz(d, { calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 20 }, ekle: [satir(['Tura']), satir(['Yazı'])] });
    const geri = durumCoz(JSON.parse(JSON.stringify(d)))!;
    expect(geri.arastirma).toEqual(d.arastirma);
    expect(toplamaGorunumBilgisi(geri).bagli).toBe(true);
    expect(geri.tablo).toEqual(d.tablo);
  });

  it('kalıcılık: sayısal ilk sütun (ölçüm) kayıttan sayısal döner (durumCoz arastirmaTurleriniOnar uygular)', () => {
    let d = planiUygula(kullaniciDurumu(), hazir('nabiz')).durum;
    d = toplamaVerisiYaz(d, { ekle: olcumSatirlari(d.arastirma!, [72, 84, 90]).map((h) => satir(h)) });
    const geri = durumCoz(JSON.parse(JSON.stringify(d)))!;
    expect(geri.tablo.sutunlar[0].tur).toBe('sayi');
    expect(geri.tablo).toEqual(d.tablo);
    expect(degiskenSutunlari(geri.tablo).map((s) => s.id)).toEqual([d.arastirma!.sutunlar!.deger]);
    // Onarım idempotenttir: ikinci kez uygulamak tabloyu değiştirmez
    expect(arastirmaTurleriniOnar(geri.tablo, geri.arastirma)).toEqual(d.tablo);
  });
});
