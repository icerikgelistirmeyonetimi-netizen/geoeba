// İlkokul kademesi «olay kartları» kipi (alan uzmanı, 4. tur — geoeba (3).xlsx satır 183, Umut IŞIK; TYMM MAT.4.4.1):
// olay önce "imkânsız / olabilir / kesin" diye sınıflandırılır, sonra torba ya da çark deneyiyle sınanır;
// sayı, kesir, yüzde ve sayı küpü yok, dönüt nitel.
import { describe, expect, it } from 'vitest';
import {
  BOS_KART_DURUMU,
  COK_KEZ,
  DONUT_ICIN_EN_AZ_DENEME,
  OLAY_KARTLARI,
  OLAY_SINIFI_ADLARI,
  OLAY_SINIFI_IPUCLARI,
  OLAY_SINIFLARI,
  SON_SERIT_BOYU,
  deneyAcikMi,
  donut,
  gozlem,
  gozlemMetni,
  olaySinifi,
  siradakiKart,
  sonuclariIsle,
  tahminEt,
  yonlendirme,
  type KartDurumu,
  type OlayKarti,
  type OlaySinifi,
} from '../olayKartlari';
import { istenenMi, varsayilanSablon, type Sonuc } from '../olasilik';
import { mulberry32, tekDeneme, topluDeneme } from '../simulasyon';

/** Görünen metinde rakam, yüzde, kesir çizgisi ya da "zar" yok */
const SAYISIZ = /[0-9%⁄½¼¾]|\/|\bzar/i;

function kart(id: string): OlayKarti {
  const k = OLAY_KARTLARI.find((x) => x.id === id);
  if (!k) throw new Error(id);
  return k;
}

/** Kartta `n` deneme yap (tohumlu üreteç) */
function dene(k: OlayKarti, d: KartDurumu, n: number, tohum = 3): KartDurumu {
  return sonuclariIsle(d, k.sablon, topluDeneme(k.sablon, n, mulberry32(tohum)));
}

describe('olay kartları: içerik', () => {
  it('en az altı kart; her sınıftan en az iki; yalnız torba ve çark', () => {
    expect(OLAY_KARTLARI.length).toBeGreaterThanOrEqual(6);
    const sayim: Record<OlaySinifi, number> = { imkansiz: 0, olabilir: 0, kesin: 0 };
    for (const k of OLAY_KARTLARI) sayim[olaySinifi(k.sablon)] += 1;
    for (const s of OLAY_SINIFLARI) expect(sayim[s]).toBeGreaterThanOrEqual(2);
    for (const k of OLAY_KARTLARI) expect(['torba', 'cark']).toContain(k.sablon.tur);
    expect(new Set(OLAY_KARTLARI.map((k) => k.id)).size).toBe(OLAY_KARTLARI.length);
  });

  it('uzmanın örneği: yalnız mavi bilye olan torbadan kırmızı çekmek imkânsız (ilk kart)', () => {
    const k = OLAY_KARTLARI[0];
    expect(k.olay).toBe('Yalnız mavi bilye olan torbadan kırmızı bilye çekmek');
    expect(k.sablon.tur).toBe('torba');
    if (k.sablon.tur === 'torba') {
      expect(k.sablon.bilyeler.map((b) => b.ad)).toEqual(['Mavi']);
      expect(k.sablon.istenenRenk).toBe('Kırmızı');
    }
    expect(olaySinifi(k.sablon)).toBe('imkansiz');
  });

  it('her sınıfın hem torba hem çark kartı var; ardışık iki kart aynı sınıfta değil', () => {
    for (const s of OLAY_SINIFLARI) {
      const turler = OLAY_KARTLARI.filter((k) => olaySinifi(k.sablon) === s).map((k) => k.sablon.tur);
      expect(turler).toContain('torba');
      expect(turler).toContain('cark');
    }
    for (let i = 1; i < OLAY_KARTLARI.length; i++) expect(olaySinifi(OLAY_KARTLARI[i].sablon)).not.toBe(olaySinifi(OLAY_KARTLARI[i - 1].sablon));
  });

  it('kart metinlerinde, sınıf adlarında ve ipuçlarında sayı, kesir, yüzde, zar yok', () => {
    for (const k of OLAY_KARTLARI) {
      expect(k.olay).not.toMatch(SAYISIZ);
      expect(k.gerekce).not.toMatch(SAYISIZ);
    }
    for (const s of OLAY_SINIFLARI) {
      expect(OLAY_SINIFI_ADLARI[s]).not.toMatch(SAYISIZ);
      expect(OLAY_SINIFI_IPUCLARI[s]).not.toMatch(SAYISIZ);
    }
    expect(OLAY_SINIFLARI.map((s) => OLAY_SINIFI_ADLARI[s])).toEqual(['İmkânsız', 'Olabilir', 'Kesin']);
  });

  it('olay sınıfı örnek uzaydan: yok → imkânsız, hepsi → kesin, bir kısmı → olabilir', () => {
    expect(olaySinifi(kart('mavi-torbadan-kirmizi').sablon)).toBe('imkansiz');
    expect(olaySinifi(kart('sari-yesil-carkta-kirmizi').sablon)).toBe('imkansiz');
    expect(olaySinifi(kart('kirmizi-torbadan-kirmizi').sablon)).toBe('kesin');
    expect(olaySinifi(kart('yesil-carkta-yesil').sablon)).toBe('kesin');
    expect(olaySinifi(kart('karisik-torbadan-mavi').sablon)).toBe('olabilir');
    expect(olaySinifi(kart('kirmizi-sari-carkta-kirmizi').sablon)).toBe('olabilir');
    // Laboratuvarın varsayılan şablonları da sınıflanır (genel işlev)
    expect(olaySinifi(varsayilanSablon('torba'))).toBe('olabilir');
  });

  it('deney sınıfla uyumlu: imkânsızda istenen hiç çıkmaz, kesinde hep çıkar, olabilirde ikisi de çıkar', () => {
    for (const k of OLAY_KARTLARI) {
      const u = mulberry32(11);
      const sonuclar: Sonuc[] = [];
      for (let i = 0; i < 300; i++) {
        const s = tekDeneme(k.sablon, u);
        if (s) sonuclar.push(s);
      }
      const istenen = sonuclar.filter((s) => istenenMi(k.sablon, s)).length;
      const sinif = olaySinifi(k.sablon);
      if (sinif === 'imkansiz') expect(istenen).toBe(0);
      else if (sinif === 'kesin') expect(istenen).toBe(300);
      else {
        expect(istenen).toBeGreaterThan(0);
        expect(istenen).toBeLessThan(300);
      }
    }
  });
});

describe('olay kartları: önce karar, sonra deney', () => {
  it('sınıflandırma yokken deney kapalı ve sonuçlar sayılmaz', () => {
    const k = OLAY_KARTLARI[0];
    expect(deneyAcikMi(BOS_KART_DURUMU)).toBe(false);
    expect(dene(k, BOS_KART_DURUMU, 5)).toBe(BOS_KART_DURUMU);
    expect(yonlendirme(k, BOS_KART_DURUMU)).toBe('Önce karar ver: Bu olay imkânsız mı, olabilir mi, kesin mi?');
  });

  it('karar deneyden önce değiştirilebilir; deney başlayınca kilitlenir', () => {
    const k = OLAY_KARTLARI[0];
    let d = tahminEt(BOS_KART_DURUMU, 'kesin');
    d = tahminEt(d, 'olabilir');
    expect(d.tahmin).toBe('olabilir');
    expect(deneyAcikMi(d)).toBe(true);
    expect(yonlendirme(k, d)).toBe('Şimdi bilye çek, kararını deneyle sına.');
    d = dene(k, d, 1);
    expect(d.deneme).toBe(1);
    expect(tahminEt(d, 'imkansiz')).toBe(d);
    expect(yonlendirme(k, d)).toBe('Birkaç kez daha bilye çek; sonra ne gördüğüne bak.');
    expect(yonlendirme(kart('yesil-carkta-yesil'), tahminEt(BOS_KART_DURUMU, 'kesin'))).toBe('Şimdi çarkı çevir, kararını deneyle sına.');
  });

  it('şerit en çok son yirmi sonucu tutar; sayaçlar bütün denemeleri sayar', () => {
    const k = kart('karisik-torbadan-mavi');
    const d = dene(k, tahminEt(BOS_KART_DURUMU, 'olabilir'), 35);
    expect(d.deneme).toBe(35);
    expect(d.son).toHaveLength(SON_SERIT_BOYU);
    expect(d.istenen).toBeGreaterThan(0);
    expect(d.istenen).toBeLessThan(35);
  });
});

describe('olay kartları: nitel dönüt', () => {
  it('az denemede dönüt yok; "çok kez" düğmesi tek basışta dönüte yeter', () => {
    const k = OLAY_KARTLARI[0];
    const d = dene(k, tahminEt(BOS_KART_DURUMU, 'imkansiz'), DONUT_ICIN_EN_AZ_DENEME - 1);
    expect(donut(k, d)).toBeNull();
    expect(COK_KEZ).toBeGreaterThanOrEqual(DONUT_ICIN_EN_AZ_DENEME);
    expect(donut(k, dene(k, tahminEt(BOS_KART_DURUMU, 'imkansiz'), COK_KEZ))).not.toBeNull();
  });

  it('uzman örneği: "imkânsız" diyen öğrenci doğru; "olabilir" diyen düzeltilir; gözlem "hiç"', () => {
    const k = OLAY_KARTLARI[0];
    const dogru = donut(k, dene(k, tahminEt(BOS_KART_DURUMU, 'imkansiz'), COK_KEZ));
    expect(dogru).toMatchObject({
      dogru: true,
      sinif: 'imkansiz',
      gozlem: 'Hiç kırmızı bilye çekilmedi.',
      karar: 'Kararın doğru: Bu olay imkânsız.',
      gerekce: 'Torbada hiç kırmızı bilye yok. Bu torbadan kırmızı bilye çekilemez.',
    });
    expect(dogru?.ek).toBeUndefined();
    const yanlis = donut(k, dene(k, tahminEt(BOS_KART_DURUMU, 'olabilir'), COK_KEZ));
    expect(yanlis).toMatchObject({ dogru: false, sinif: 'imkansiz', karar: 'Sen «Olabilir» dedin. Bu olay imkânsız.' });
  });

  it('kesin çark: gözlem "her seferinde"; olabilir torba: "bazen"', () => {
    const c = kart('yesil-carkta-yesil');
    expect(donut(c, dene(c, tahminEt(BOS_KART_DURUMU, 'kesin'), COK_KEZ))).toMatchObject({ dogru: true, gozlem: 'Ok her seferinde yeşil dilimde durdu.', karar: 'Kararın doğru: Bu olay kesin.' });
    const t = kart('karisik-torbadan-mavi');
    const d = dene(t, tahminEt(BOS_KART_DURUMU, 'kesin'), 30);
    expect(gozlem(d)).toBe('bazen');
    expect(donut(t, d)).toMatchObject({ dogru: false, sinif: 'olabilir', gozlem: 'Bazen mavi bilye çekildi, bazen başka renk.', karar: 'Sen «Kesin» dedin. Bu olay olabilir.' });
  });

  it('olabilir olayda örneklem tek yanlı kalırsa denemeyi sürdürme önerisi gelir', () => {
    const k = kart('kirmizi-sari-carkta-kirmizi');
    // Ok hep sarıda durmuş gibi (elle kurulmuş tek yanlı örneklem)
    const sari: Sonuc[] = Array.from({ length: 6 }, () => ({ tur: 'cark', dilim: 1 }));
    const d = sonuclariIsle(tahminEt(BOS_KART_DURUMU, 'imkansiz'), k.sablon, sari);
    expect(gozlem(d)).toBe('hic');
    const dn = donut(k, d);
    expect(dn).toMatchObject({ dogru: false, sinif: 'olabilir', gozlem: 'Ok hiç kırmızı dilimde durmadı.' });
    expect(dn?.ek).toBe('Çevirmeye devam et; ok başka renkte de durabilir.');
  });

  it('bütün kart × karar × gözlem bileşimlerinde dönüt ve yönlendirme metinleri sayısız', () => {
    for (const k of OLAY_KARTLARI) {
      for (const g of ['hic', 'bazen', 'hep'] as const) expect(gozlemMetni(k.sablon, g)).not.toMatch(SAYISIZ);
      for (const t of OLAY_SINIFLARI) {
        const d = dene(k, tahminEt(BOS_KART_DURUMU, t), 30);
        const dn = donut(k, d);
        expect(dn).not.toBeNull();
        expect(dn?.dogru).toBe(t === olaySinifi(k.sablon));
        for (const metin of [dn?.gozlem, dn?.karar, dn?.gerekce, dn?.ek ?? '', yonlendirme(k, d), yonlendirme(k, tahminEt(BOS_KART_DURUMU, t))]) expect(metin).not.toMatch(SAYISIZ);
      }
    }
  });
});

describe('olay kartları: dönütten sonraki kart (denetim)', () => {
  const hic = OLAY_KARTLARI.map(() => false);
  it('sırayla giderken sonraki bitmemiş kart; son kartta baştaki bitmemiş kart', () => {
    expect(siradakiKart(0, [true, false, false, false, false, false])).toBe(1);
    expect(siradakiKart(2, [true, false, true, false, false, false])).toBe(3);
    expect(siradakiKart(5, [true, false, true, true, true, true])).toBe(1);
    expect(siradakiKart(0, hic)).toBe(1);
  });

  it('sonraki kart bitmişse atlanır (bitmiş karta geri gönderilmez)', () => {
    expect(siradakiKart(1, [false, true, true, true, false, false])).toBe(4);
  });

  it('kartlar sırasız bitirilse de (2–6, sonra 1) bitiş iletisi son bitirilen kartta çıkar', () => {
    const hepsi = OLAY_KARTLARI.map(() => true);
    for (let i = 0; i < OLAY_KARTLARI.length; i++) expect(siradakiKart(i, hepsi)).toBeNull();
    // Aktif kartın kendisi gidilecek kart sayılmaz: ondan başka bitmemiş yoksa bitiş
    expect(siradakiKart(0, [false, true, true, true, true, true])).toBeNull();
  });
});
