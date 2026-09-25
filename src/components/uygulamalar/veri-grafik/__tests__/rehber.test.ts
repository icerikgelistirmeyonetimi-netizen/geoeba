// Sahip: A (vg/rehber.ts: örnek açılışı, Keşif şeridi metni, rehber adımları ve eylemleri, künye / rozet / kaynak)
import { describe, expect, it } from 'vitest';
import {
  acilisYamasi,
  eylemYamasi,
  kaynakBaglantilari,
  kaynakBaglantisi,
  kazanimMetni,
  kunyeMetni,
  onerilenSekme,
  rehberAdimlari,
  rozetMetni,
  seritMetni,
} from '../rehber';
import { ORNEK_VERILER, TUM_OZELLIKLER, gecerliDegerler, ornekBul, sutunSil, type OrnekVeri, type Ozellik, type VeriTablosu } from '../veri';
import { degiskenSutunlari } from '../kategorik';
import { OZELLIKLER, SEKMELER, sekmeKullanilabilir } from '../durum';
import { ozetHesapla } from '../istatistik';
import { cizgiSiraNotuGerekli } from '../grafikKurallari';
import { daireAdimi, daireDegerAyarla } from '../DaireGrafigi';

const HEPSI: ReadonlySet<Ozellik> = new Set(TUM_OZELLIKLER);
const HICBIRI: ReadonlySet<Ozellik> = new Set();
const ornek = (id: string): OrnekVeri => {
  const o = ornekBul(id);
  if (!o) throw new Error(`örnek yok: ${id}`);
  return o;
};
const kimlik = (t: VeriTablosu, ad: string) => t.sutunlar.find((s) => s.ad === ad)!.id;
const satirNo = (t: VeriTablosu, etiket: string) => t.satirlar.findIndex((r) => r.hucreler[0] === etiket);
const kapali = { secenekler: { ortalama: false, oms: false, etiketler: false }, sutunModu: false };

describe('rehber: açılış yaması', () => {
  it('her örnekte eksen tablodaki bir değişken, sekme veri türü kapısından geçer (özellikli ve özelliksiz)', () => {
    for (const o of ORNEK_VERILER) {
      const t = o.olustur();
      const degiskenler = degiskenSutunlari(t);
      const sayisal = degiskenler.filter((s) => s.tur === 'sayi').length;
      for (const oz of [HEPSI, HICBIRI]) {
        const y = acilisYamasi(o, t, oz);
        expect(degiskenler.map((s) => s.id), o.id).toContain(y.degisken);
        expect(sekmeKullanilabilir(y.sekme, sayisal), `${o.id} ${y.sekme}`).toBe(true);
        expect(y.sekme, o.id).toBe(onerilenSekme(o));
        expect(y.yDegisken).toBeNull();
        if (o.varsayilanDegisken) expect(y.degisken, o.id).toBe(kimlik(t, o.varsayilanDegisken));
        // Açılışta ölçüler kapalı: öğrenci önce tahmin eder
        expect(y.secenekler, o.id).toEqual({ ortalama: false, oms: false, etiketler: false, ortanca: false });
        if (y.ikinciDegisken !== null) expect(y.ikinciDegisken, o.id).not.toBe(y.degisken);
        if (y.renkDegisken !== null) expect(t.sutunlar.find((s) => s.id === y.renkDegisken)?.tur, o.id).toBe('etiket');
      }
    }
  });

  it('veri türü kapısı durum.ts ile aynı: saçılım 2, çizgi 1 sayısal değişken ister; geçmeyen sekme noktaya düşer', () => {
    for (const s of SEKMELER) {
      for (const n of [0, 1, 2]) {
        const o: OrnekVeri = { ...ornek('cikolata'), onerilenGrafik: s.id, acilis: { sekme: s.id } };
        let t = o.olustur();
        while (degiskenSutunlari(t).filter((x) => x.tur === 'sayi').length > n) t = sutunSil(t, t.sutunlar.length - 1);
        expect(acilisYamasi(o, t, HEPSI).sekme, `${s.id} ${n}`).toBe(sekmeKullanilabilir(s.id, n) ? s.id : 'nokta');
      }
    }
  });

  it('ilk üç örnek: baskan, kitap, boy', () => {
    const baskan = ornek('baskan');
    const tb = baskan.olustur();
    const yb = acilisYamasi(baskan, tb, HEPSI);
    expect(yb).toMatchObject({ sekme: 'nokta', degisken: kimlik(tb, 'Aday'), ikinciDegisken: null, renkDegisken: null, sutunModu: false, aralik: null, daireModu: 'siklik' });
    expect(yb.kategoriSiralari).toEqual({ [kimlik(tb, 'Aday')]: ['Elif', 'Kaan', 'Zeynep', 'Mert'] });
    expect(acilisYamasi(baskan, tb, HICBIRI).kategoriSiralari).toEqual({});

    const kitap = ornek('kitap');
    const tk = kitap.olustur();
    expect(acilisYamasi(kitap, tk, HEPSI)).toMatchObject({ sekme: 'nokta', degisken: kimlik(tk, 'Kitap sayısı'), daireModu: 'siklik' });
    // Değerlerin sıklığı dairesi gelene kadar her satır bir dilim
    expect(acilisYamasi(kitap, tk, HICBIRI).daireModu).toBe('satir');

    const boy = ornek('boy');
    const ty = boy.olustur();
    expect(acilisYamasi(boy, ty, HEPSI)).toMatchObject({ sekme: 'nokta', degisken: kimlik(ty, 'Boy (cm)'), ikinciDegisken: null, daireModu: 'uygunDegil' });
    expect(acilisYamasi(boy, ty, HICBIRI).daireModu).toBe('satir');
  });

  it('ekran: açılış gruplaması 5 (acilisAralik varken); mac: karşılaştırma Yasemin', () => {
    const ekran = ornek('ekran');
    expect(acilisYamasi(ekran, ekran.olustur(), HEPSI).aralik).toBe(5);
    expect(acilisYamasi(ekran, ekran.olustur(), new Set<Ozellik>(['acilisAralik'])).aralik).toBe(5);
    expect(acilisYamasi(ekran, ekran.olustur(), HICBIRI).aralik).toBeNull();
    const mac = ornek('mac');
    const tm = mac.olustur();
    expect(acilisYamasi(mac, tm, HICBIRI)).toMatchObject({ degisken: kimlik(tm, 'Selma'), ikinciDegisken: kimlik(tm, 'Yasemin') });
  });

  it('sinav: grupla varken ikinci değişken Sınıf (alt alta paneller); yokken null ve renk anahtarı Sınıf', () => {
    const sinav = ornek('sinav');
    const t = sinav.olustur();
    const sinif = kimlik(t, 'Sınıf');
    const gruplu = acilisYamasi(sinav, t, new Set<Ozellik>(['grupla']));
    expect(gruplu.ikinciDegisken).toBe(sinif);
    expect(gruplu.degisken).toBe(kimlik(t, 'Puan'));
    const grupsuz = acilisYamasi(sinav, t, HICBIRI);
    expect(grupsuz.ikinciDegisken).toBeNull();
    expect(grupsuz.renkDegisken).toBe(sinif);
  });

  it('yüzde eşlemesi ve kategori sırası sütun kimliğine çevrilir; eksen sütunu silinmişse ilk sayısal değişkene düşer', () => {
    const cikolata = ornek('cikolata');
    const tc = cikolata.olustur();
    expect(acilisYamasi(cikolata, tc, HEPSI).yuzdeDegisim).toEqual({ [kimlik(tc, 'Sıcaklık (°C)')]: false, [kimlik(tc, 'Satış (bardak)')]: true });
    expect(acilisYamasi(cikolata, tc, HICBIRI).yuzdeDegisim).toEqual({});
    const atik = ornek('atik');
    const ta = atik.olustur();
    expect(Object.keys(acilisYamasi(atik, ta, HEPSI).kategoriSiralari)).toEqual([kimlik(ta, 'En çok çıkan atık')]);
    // Kullanıcı tabloyu değiştirdiyse (ör. Sıcaklık sütunu silindi) eksen kalan değişkene gelir, sekme kapıdan geçer
    const eksik = sutunSil(tc, 1);
    const y = acilisYamasi(cikolata, eksik, HEPSI);
    expect(y.degisken).toBe(kimlik(eksik, 'Satış (bardak)'));
    expect(y.sekme).toBe('nokta');
    expect(y.yuzdeDegisim).toEqual({ [kimlik(eksik, 'Satış (bardak)')]: true });
  });
});

describe('rehber: Keşif şeridi metni', () => {
  it('önerilen sekmede açıklama, öteki sekmelerde sekme ipucu; boş ipucu boş metin; ipucu yoksa önerilen grafiğin adı', () => {
    const baskan = ornek('baskan');
    expect(seritMetni(baskan, 'nokta', HEPSI)).toBe(baskan.aciklama);
    expect(seritMetni(baskan, 'sutun', HEPSI)).toBe(baskan.sekmeIpucu!.sutun);
    expect(seritMetni(baskan, 'daire', HICBIRI)).toBe(baskan.sekmeIpucu!.daire);
    // Önerilen sekmenin talimatı başka sekmede yinelenmez
    expect(seritMetni(baskan, 'cizgi', HEPSI)).toBe('Bu veri için önerilen grafik: Nokta.');
    expect(seritMetni({ ...ornek('gun'), sekmeIpucu: {} }, 'cizgi', HEPSI)).toBe('Bu veri için önerilen grafik: Daire.');
    expect(seritMetni(ornek('gun'), 'cizgi', HEPSI)).toBe('');
    const boy = ornek('boy');
    expect(seritMetni(boy, 'istatistik', HICBIRI)).toContain('5 cm');
  });

  it('16 örneğin etkin her sekmesinde sekmeye uygun metin: açıklama yinelenmez; Çizgi sıra notu görünürken şerit ikinci talimat vermez', () => {
    for (const o of ORNEK_VERILER) {
      const t = o.olustur();
      const sayisal = degiskenSutunlari(t).filter((s) => s.tur === 'sayi').length;
      const onerilen = onerilenSekme(o);
      const aciklamalar = [o.aciklama, o.aciklamaOzellikli?.metin].filter(Boolean);
      for (const s of SEKMELER) {
        if (s.id === onerilen || !sekmeKullanilabilir(s.id, sayisal)) continue;
        // Her etkin sekmeye ipucu yazılmış (boş metin de bir karardır)
        expect(o.sekmeIpucu?.[s.id], `${o.id} ${s.id}`).toBeDefined();
        const metin = seritMetni(o, s.id, OZELLIKLER);
        expect(aciklamalar, `${o.id} ${s.id}`).not.toContain(metin);
        if (s.id === 'cizgi' && cizgiSiraNotuGerekli(t)) expect(metin, `${o.id} çizgi (sıra notu var)`).toBe('');
        else expect(metin.length, `${o.id} ${s.id}`).toBeGreaterThan(20);
      }
    }
  });

  it('cikolata Çizgi: var olan araca göre (değişken sekmesi); Karşılaştır seçimi istenmez', () => {
    const c = ornek('cikolata');
    const metin = seritMetni(c, 'cizgi', OZELLIKLER);
    expect(metin).toContain('Satış (bardak) sekmesine');
    expect(metin).not.toMatch(/Karşılaştır/);
    expect(c.ogretmenNotu).not.toMatch(/Karşılaştır:/);
  });

  it('özellikli metin yalnız özelliği varken; yoksa bugünkü metne geri düşer', () => {
    const kitap = ornek('kitap');
    expect(seritMetni(kitap, 'sutun', new Set<Ozellik>(['dengele']))).toBe(kitap.sekmeIpucuOzellikli!.sutun!.metin);
    expect(seritMetni(kitap, 'sutun', HICBIRI)).toBe(kitap.sekmeIpucu!.sutun);
    expect(seritMetni(kitap, 'daire', new Set<Ozellik>(['daireSiklik']))).toBe(kitap.sekmeIpucuOzellikli!.daire!.metin);
    expect(seritMetni(kitap, 'daire', HICBIRI)).toBe(kitap.sekmeIpucu!.daire);
    const ulasim = ornek('ulasim');
    expect(seritMetni(ulasim, 'nokta', new Set<Ozellik>(['ortanca']))).toBe(ulasim.aciklamaOzellikli!.metin);
    expect(seritMetni(ulasim, 'nokta', HICBIRI)).toBe(ulasim.aciklama);
    const sinav = ornek('sinav');
    expect(seritMetni(sinav, 'nokta', new Set<Ozellik>(['grupla']))).toBe(sinav.aciklamaOzellikli!.metin);
    expect(seritMetni(sinav, 'nokta', new Set<Ozellik>(['ortanca']))).toBe(sinav.aciklama);
  });
});

describe('rehber: adımlar', () => {
  it('her örnekte 4 adım; tahmin adımında düğme yok; çözülmüş eylem özelliğe bağlı değil ya da özelliği var', () => {
    for (const o of ORNEK_VERILER) {
      for (const oz of [HEPSI, HICBIRI]) {
        const adimlar = rehberAdimlari(o, oz);
        expect(adimlar.map((a) => a.baslik), o.id).toEqual(['Tahmin et', 'Grafikte bul', 'Aç ve ölç', 'Yorumla']);
        expect(adimlar[0].eylem, o.id).toBeNull();
        for (const a of adimlar) {
          expect(a).not.toHaveProperty('yedekEylem');
          if (a.eylem?.gerektirir) expect(oz.has(a.eylem.gerektirir), o.id).toBe(true);
        }
      }
    }
  });

  it('yedek eylem seçimi: sinav 3. adım grupla yokken "Gruplara göre tabloyu aç"; kitap 3. adım ortanca yokken düğmesiz', () => {
    const sinav = ornek('sinav');
    expect(rehberAdimlari(sinav, HICBIRI)[2].eylem).toEqual({ tur: 'sekme', sekme: 'istatistik', etiket: 'Gruplara göre tabloyu aç' });
    expect(rehberAdimlari(sinav, new Set<Ozellik>(['grupla']))[2].eylem).toMatchObject({ tur: 'secenek', ac: ['ortalama', 'oms'] });
    const kitap = ornek('kitap');
    expect(rehberAdimlari(kitap, HICBIRI)[2].eylem).toBeNull();
    expect(rehberAdimlari(kitap, new Set<Ozellik>(['ortanca']))[2].eylem).toMatchObject({ tur: 'secenek', ac: ['ortanca', 'ortalama'] });
    // boy: 3. adım özelliğe bağlı değil
    expect(rehberAdimlari(ornek('boy'), HICBIRI)[2].eylem).toMatchObject({ tur: 'secenek', ac: ['ortalama', 'oms'], etiket: 'Ortalama ve sapmayı aç' });
    // baskan: sayılar, sütunlara dönüştür, daireye geç
    expect(rehberAdimlari(ornek('baskan'), HICBIRI).map((a) => a.eylem?.tur ?? null)).toEqual([null, 'secenek', 'secenek', 'sekme']);
  });
});

describe('rehber: eylem yaması', () => {
  it('secenek: istenen ölçüleri açar (kapatmaz), ötekileri korur, nokta grafiğine geçer; sütunlara dönüştür', () => {
    const boy = ornek('boy');
    const y = eylemYamasi(boy.rehber[2].eylem!, boy.olustur(), { secenekler: { ortalama: false, oms: false, etiketler: true }, sutunModu: false });
    expect(y).toEqual({ sekme: 'nokta', secenekler: { ortalama: true, oms: true, etiketler: true, ortanca: false } });
    const baskan = ornek('baskan');
    expect(eylemYamasi(baskan.rehber[2].eylem!, baskan.olustur(), kapali)).toMatchObject({ sekme: 'nokta', sutunModu: true });
    expect(eylemYamasi(baskan.rehber[1].eylem!, baskan.olustur(), kapali).secenekler).toMatchObject({ etiketler: true, ortalama: false });
    expect(eylemYamasi(baskan.rehber[3].eylem!, baskan.olustur(), kapali)).toEqual({ sekme: 'daire' });
    expect(eylemYamasi({ tur: 'surukle', etiket: 'Uyku sınırını sürükle' }, baskan.olustur(), kapali)).toEqual({});
    expect(eylemYamasi({ tur: 'yok', etiket: 'Noktalara dokun' }, baskan.olustur(), kapali)).toEqual({});
  });

  it('hucre: ulasim Feyza 60 → 20; tablo yeni nesne, satır aydınlanır, bildirim geri alınabilir; ikinci kez değişmez', () => {
    const ulasim = ornek('ulasim');
    const t = ulasim.olustur();
    const eylem = ulasim.rehber[3].eylem!;
    expect(eylem).toMatchObject({ tur: 'hucre', satir: 'Feyza', deger: 20 });
    const feyza = satirNo(t, 'Feyza');
    expect(t.satirlar[feyza].hucreler[1]).toBe('60');
    const y = eylemYamasi(eylem, t, kapali);
    expect(y.tablo).toBeDefined();
    expect(y.tablo!.satirlar[feyza].hucreler[1]).toBe('20');
    expect(t.satirlar[feyza].hucreler[1]).toBe('60');
    expect(y.vurguSatir).toBe(feyza);
    expect(y.tost).toContain('60 → 20');
    // Ortalama 16'dan (240 − 40) ÷ 15'e iner, ortanca 12'de kalır
    const oz = ozetHesapla(gecerliDegerler(y.tablo!, 1).map((d) => d.deger));
    expect(oz.ortalama).toBeCloseTo(200 / 15, 10);
    expect(oz.medyan).toBe(12);
    const ikinci = eylemYamasi(eylem, y.tablo!, kapali);
    expect(ikinci.tablo).toBeUndefined();
    expect(ikinci.tost).toContain('zaten');
  });

  it('satirEkle: kardes yeni öğrenci (1 kardeş) sona eklenir ve aydınlanır', () => {
    const kardes = ornek('kardes');
    const t = kardes.olustur();
    const eylem = kardes.rehber[3].eylem!;
    expect(eylem.tur).toBe('satirEkle');
    const y = eylemYamasi(eylem, t, kapali);
    expect(y.tablo!.satirlar).toHaveLength(t.satirlar.length + 1);
    expect(y.tablo!.satirlar.at(-1)!.hucreler).toEqual(['Yeni öğrenci', '1']);
    expect(y.tablo!.satirlar.at(-1)!.id).not.toBe(t.satirlar.at(-1)!.id);
    expect(y.vurguSatir).toBe(t.satirlar.length);
    expect(y.tost).toContain('Yeni öğrenci');
  });

  it('satirVurgula doğru satır indeksini verir; bulunamazsa null ve bildirim', () => {
    for (const [id, etiket] of [['ulasim', 'Feyza'], ['calisma', '8B-03'], ['cikolata', '5 Ocak'], ['gun', 'Uyku'], ['harcama', 'Kira']] as const) {
      const o = ornek(id);
      const t = o.olustur();
      const e = o.rehber.map((a) => a.eylem).find((x) => x?.tur === 'satirVurgula')!;
      expect(e, id).toMatchObject({ satir: etiket });
      const y = eylemYamasi(e, t, kapali);
      expect(y.vurguSatir, id).toBe(satirNo(t, etiket));
      expect(y.vurguSatir, id).toBeGreaterThanOrEqual(0);
      expect(y.tablo, id).toBeUndefined();
    }
    const yok = eylemYamasi({ tur: 'satirVurgula', satir: 'Olmayan', etiket: 'Göster' }, ornek('boy').olustur(), kapali);
    expect(yok.vurguSatir).toBeNull();
    expect(yok.tost).toContain('Olmayan');
  });

  it('sürükleme cevapları uygulamanın daire sürüklemesiyle aynı (toplam korunur, adıma yuvarlanır): gun ve harcama', () => {
    // gun: uyku 9 → 11 saat (ilk ayar: sürüklerken 1 saate yuvarla); yalnız okul ve diğer küçülür
    const gun = ornek('gun');
    const g = gecerliDegerler(gun.olustur(), 1).map((x) => x.deger);
    const gYeni = daireDegerAyarla(g, 0, 11, daireAdimi(g, 1));
    expect(gYeni).toEqual([11, 1, 6, 1, 2, 2, 1]);
    expect(gYeni.reduce((a, b) => a + b, 0)).toBe(24);
    const gCevap = gun.rehber[3].cevap;
    expect(gCevap).toContain("Okul 7'den 6 saate, diğer 2'den 1 saate");
    expect(gCevap).not.toMatch(/bütün dilimler|ondalıklı|6,1/);
    expect(gun.ogretmenNotu).toContain('okul 6, diğer 1 saat');
    // harcama: birikim 10 000 → 20 000 TL (1 000 TL'lik adım); okul ve kırtasiye yerinde kalır
    const harcama = ornek('harcama');
    const h = gecerliDegerler(harcama.olustur(), 1).map((x) => x.deger);
    const adim = daireAdimi(h, 1);
    expect(adim).toBe(1000);
    const hYeni = daireDegerAyarla(h, 6, 20000, adim);
    expect(hYeni).toEqual([22000, 31000, 9000, 9000, 5000, 4000, 20000]);
    const hCevap = harcama.rehber[3].cevap;
    expect(hCevap).toContain('kira 22 000, mutfak 31 000 TL');
    expect(hCevap).toContain('yaklaşık orantılı');
    expect(hCevap).not.toMatch(/bütün kalemler/);
    expect(harcama.ogretmenNotu).toContain('giyim 4 000 TL olur; okul ve kırtasiye 5 000 TL');
  });

  it('aralik: ekran "Gruplamayı kaldır" nokta grafiğinde grup genişliğini 5 yapar', () => {
    const ekran = ornek('ekran');
    const e = ekran.rehber[1].eylem!;
    expect(e).toMatchObject({ tur: 'aralik', aralik: 5 });
    expect(eylemYamasi(e, ekran.olustur(), kapali)).toEqual({ sekme: 'nokta', aralik: 5 });
  });
});

describe('rehber: künye, rozet, kaynak', () => {
  it('künye: hikâyenin cümlesi; hassas örnekte kod notu (cümlede yoksa) bir kez', () => {
    const baskan = ornek('baskan');
    expect(kunyeMetni(baskan)).toBe(baskan.hikaye.cumle);
    const boy = ornek('boy');
    expect(kunyeMetni(boy)).toBe(boy.hikaye.cumle);
    expect(kunyeMetni(ornek('ekran'))).toMatch(/Adlar yerine kod kullanıldı\.$/);
    for (const o of ORNEK_VERILER.filter((x) => x.hassas)) expect(kunyeMetni(o).match(/adlar yerine kod/gi), o.id).toHaveLength(1);
  });

  it('rozet yalnız sınıf düzeyi (öğrenciye görünür); kazanım kodları " · " ile öğretmen bölümünde', () => {
    expect(rozetMetni(ornek('kitap'))).toBe('6. sınıf');
    expect(rozetMetni(ornek('baskan'))).toBe('5. sınıf');
    expect(rozetMetni(ornek('sicaklik'))).toBe('7. sınıf');
    expect(rozetMetni(ornek('calisma'))).toBe('Zenginleştirme');
    for (const o of ORNEK_VERILER) expect(rozetMetni(o), o.id).not.toMatch(/MAT\./);
    expect(kazanimMetni(ornek('kitap'))).toBe('MAT.6.5.1');
    expect(kazanimMetni(ornek('sicaklik'))).toBe('MAT.7.6.1 · 7.6.2');
    expect(kazanimMetni(ornek('iklim'))).toBe('MAT.8.6.1 · 8.6.2');
    expect(kazanimMetni(ornek('calisma'))).toBe('Programda yok (zenginleştirme)');
    for (const o of ORNEK_VERILER) expect(kazanimMetni(o), o.id).not.toContain(',');
  });

  it('kaynak bağlantısı: gerçek veride MGM, boy için WHO referansı; bağlantısız kurgusal veride null', () => {
    expect(kaynakBaglantisi(ornek('sicaklik'))!.url).toMatch(/^https:\/\/www\.mgm\.gov\.tr\//);
    expect(kaynakBaglantisi(ornek('boy'))!.url).toMatch(/^https:\/\/cdn\.who\.int\//);
    expect(kaynakBaglantisi(ornek('kitap'))).toBeNull();
    expect(kaynakBaglantisi(ornek('baskan'))).toBeNull();
    for (const o of ORNEK_VERILER.filter((x) => x.kaynak.tur === 'gercek')) expect(kaynakBaglantisi(o), o.id).not.toBeNull();
  });

  it('bütün bağlantılar kısa adlarıyla: iklim Erzurum · İzmir, boy erkek · kız; bağlantısız örnekte boş', () => {
    expect(kaynakBaglantilari(ornek('iklim')).map((b) => b.ad)).toEqual(['MGM: Erzurum', 'İzmir']);
    expect(kaynakBaglantilari(ornek('iklim'))[1].url).toMatch(/m=IZMIR$/);
    expect(kaynakBaglantilari(ornek('boy')).map((b) => b.ad)).toEqual(['WHO: erkek', 'kız']);
    expect(kaynakBaglantilari(ornek('boy'))[1].url).toMatch(/girls/);
    expect(kaynakBaglantilari(ornek('sicaklik')).map((b) => b.ad)).toEqual(['MGM: Ankara']);
    expect(kaynakBaglantilari(ornek('kitap'))).toEqual([]);
    // Kısa ad yoksa alan adı
    const o = { ...ornek('boy'), kaynak: { ...ornek('boy').kaynak, urlAd: undefined, url2Ad: undefined } };
    expect(kaynakBaglantilari(o).map((b) => b.ad)).toEqual(['who.int', 'who.int']);
  });
});
