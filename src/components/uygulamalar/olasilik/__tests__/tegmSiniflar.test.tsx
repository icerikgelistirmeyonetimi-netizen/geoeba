// TEGM Ortaokul Komisyonu inceleme raporu (20.10.2026): Olasılık Laboratuvarı sınıf seçilmeden açılmaz; öznel, deneysel
// ve teorik olasılık sınıf ayrımı olmadan birlikte verilmez (5. sınıf öznel, 6. deneysel, 7. teorik, 8. üçü birlikte);
// Galton tahtası ortaokulda yoktur (lisede sınıfla); iki sayı küpü (bileşik olay) ortaokulda yoktur; 6. sınıfta "deneme
// sayısı artınca" grafiği yoktur, deneyler sınırlı tekrarlıdır; deneysel olasılık programdaki ifadeyle açıklanır.
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Laboratuvar } from '../index';
import { SinifSecici } from '../SinifSecici';
import { SpektrumGorunumu } from '../SpektrumGorunumu';
import { bosDurum, durumuCoz, durumuSerilestir, sablonuGuncelle, sinifSec, sablonTuruSec, type LabDurumu } from '../durum';
import { varsayilanSablon } from '../olasilik';
import { ortaokulTeorikFormulu, tumleyenAdi } from '../OlayPaneli';
import { teorikOlasilik } from '../olasilik';
import {
  HAZIR_CARKLAR,
  OLASILIK_SINIFLARI,
  SINIF_AYARLARI,
  gorevMetni,
  hazirCarkBul,
  hazirCarkSablonu,
  kademeninSiniflari,
  olayAdi,
  sablonuSinifaUydur,
  sinifAyari,
  sinifCoz,
  topluYapilabilir,
  type OlasilikSinifi,
} from '../sinifAyarlari';
import { DURAK_ADLARI, SPEKTRUM_DURAKLARI, SPEKTRUM_KARTLARI, donut, durakSec, kontrolEt, yerlesti, BOS_SPEKTRUM_DURUMU } from '../spektrum';

const bos = () => undefined;

/** Görünen metin: etiketler atılır */
function metin(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lab(sinif: OlasilikSinifi, d: LabDurumu = sinifSec(bosDurum(), sinif)): string {
  return renderToStaticMarkup(<Laboratuvar durum={d} setDurum={bos} ayar={sinifAyari(sinif)} kademe={SINIF_AYARLARI[sinif].kademe} onSinifDegistir={bos} />);
}

const kartlar = (html: string) => Array.from(html.matchAll(/data-olasilik-karti="([a-z]+)"/g), (m) => m[1]);
const topluDugmeleri = (html: string) => Array.from(html.matchAll(/data-toplu="(\d+)"/g), (m) => Number(m[1]));

describe('sınıf ayarları', () => {
  it('ortaokul 5–8, lise 9–10; kademe seçilmemişse hepsi', () => {
    expect(kademeninSiniflari('ortaokul')).toEqual([5, 6, 7, 8]);
    expect(kademeninSiniflari('lise')).toEqual([9, 10]);
    expect(kademeninSiniflari(null)).toEqual(OLASILIK_SINIFLARI);
    expect(sinifCoz(7)).toBe(7);
    expect(sinifCoz(4)).toBeNull();
    expect(sinifCoz('7')).toBeNull();
  });

  it('her sınıf kendi yaklaşımı: 5 öznel (spektrum), 6 deneysel, 7 teorik, 8 üçü; lise deneysel ve teorik', () => {
    const k = (s: OlasilikSinifi) => SINIF_AYARLARI[s].kartlar;
    expect(SINIF_AYARLARI[5].gorunum).toBe('spektrum');
    expect(k(6)).toEqual({ oznel: false, deneysel: true, teorik: false });
    expect(k(7)).toEqual({ oznel: false, deneysel: false, teorik: true });
    expect(k(8)).toEqual({ oznel: true, deneysel: true, teorik: true });
    for (const s of [9, 10] as const) expect(k(s)).toEqual({ oznel: false, deneysel: true, teorik: true });
  });

  it('Galton yalnız lisede (10. sınıf); iki sayı küpü yalnız lisede; 6. sınıfta deneme sayısı grafiği yok, deney en çok 30 tekrar', () => {
    for (const s of [5, 6, 7, 8, 9] as const) expect(SINIF_AYARLARI[s].sablonlar).not.toContain('galton');
    expect(SINIF_AYARLARI[10].sablonlar).toContain('galton');
    for (const s of [5, 6, 7, 8] as const) expect(SINIF_AYARLARI[s].ikiZar).toBe(false);
    for (const s of [9, 10] as const) expect(SINIF_AYARLARI[s].ikiZar).toBe(true);
    expect(SINIF_AYARLARI[6].yakinsama).toBe(false);
    expect(SINIF_AYARLARI[6].enCokDeneme).toBe(30);
    expect(Math.max(...SINIF_AYARLARI[6].topluSayilar)).toBeLessThanOrEqual(30);
    for (const s of [7, 8] as const) expect(SINIF_AYARLARI[s].yakinsama).toBe(true);
    expect(topluYapilabilir(SINIF_AYARLARI[6], 20, 10)).toBe(true);
    expect(topluYapilabilir(SINIF_AYARLARI[6], 21, 10)).toBe(false);
    expect(topluYapilabilir(SINIF_AYARLARI[8], 1e6, 10000)).toBe(true);
  });

  it('ortaokulda iki sayı küpü tek küpe döner, istenen değer 1–6 içine sığar; lisede dokunulmaz', () => {
    const iki = { tur: 'zar' as const, ikiZar: true, istenen: { tip: 'sayi' as const, deger: 9 } };
    expect(sablonuSinifaUydur(iki, SINIF_AYARLARI[7])).toEqual({ tur: 'zar', ikiZar: false, istenen: { tip: 'sayi', deger: 6 } });
    expect(sablonuSinifaUydur(iki, SINIF_AYARLARI[9])).toBe(iki);
  });

  it('görev cümlesi sınıfın yaklaşımıyla; 6. sınıf "20 ya da 30 kez", teorik ve "artınca" yok', () => {
    const para = varsayilanSablon('para');
    expect(gorevMetni(SINIF_AYARLARI[6], para)).toBe('Deneyi 20 ya da 30 kez tekrarla ve sonuçları gözle: tura gelme olasılığını deneyin sonuçlarına göre tahmin et.');
    expect(gorevMetni(SINIF_AYARLARI[6], para)).not.toMatch(/teorik|artınca|arttıkça/);
    expect(gorevMetni(SINIF_AYARLARI[7], para)).toMatch(/Örnek uzaydaki durumları.*tümleyeninin olasılığını/);
    expect(gorevMetni(SINIF_AYARLARI[8], para)).toMatch(/öznel olasılık.*hangi yaklaşım daha uygun/);
    expect(olayAdi(varsayilanSablon('torba'))).toBe('kırmızı bilye çekme');
    expect(olayAdi({ tur: 'zar', ikiZar: false, istenen: { tip: 'enAz', deger: 4 } })).toBe('4 ya da daha büyük bir sayı gelme');
  });

  it('8. sınıf gerçek yaşam durumları: soru "kaç tane çıkar?" diye sorulmaz; okuldaki görüş dağılımı incelenir', () => {
    const okul = HAZIR_CARKLAR.find((h) => h.id === 'okul-gorusleri')!;
    expect(okul.gorev).toMatch(/^Okuldaki görüş dağılımını inceleyelim/);
    for (const h of HAZIR_CARKLAR) expect(h.gorev).not.toMatch(/kaç\s+“?(evet|gol)/i);
    const s = hazirCarkSablonu(okul);
    expect(hazirCarkBul(s)?.id).toBe('okul-gorusleri');
    expect(teorikOlasilik(s).deger).toBeCloseTo(0.6, 10);
    expect(gorevMetni(SINIF_AYARLARI[8], s)).toBe(okul.gorev);
    expect(hazirCarkBul(varsayilanSablon('cark'))).toBeUndefined();
  });
});

describe('durum: sınıf', () => {
  it('yeni ve eski kayıt sınıfsız açılır (seçim ekranı); sınıf kaydedilir ve geri okunur', () => {
    expect(bosDurum().sinif).toBeNull();
    const eski = JSON.parse(durumuSerilestir(bosDurum()));
    delete eski.sinif;
    expect(durumuCoz(JSON.stringify(eski))!.sinif).toBeNull();
    const d = sinifSec(bosDurum(), 8);
    expect(durumuCoz(durumuSerilestir(d))!.sinif).toBe(8);
  });

  it('sınıf seçimi sonuçları sıfırlar ve şablonu sınıfa uydurur; ortaokul kaydındaki Galton ve iki küp düzelir', () => {
    let d = sablonuGuncelle(bosDurum('zar'), { tur: 'zar', ikiZar: true, istenen: { tip: 'sayi', deger: 7 } });
    d = sablonTuruSec(d, 'galton');
    const ham = JSON.parse(durumuSerilestir(d));
    ham.sinif = 7;
    const c = durumuCoz(JSON.stringify(ham))!;
    expect(c.sinif).toBe(7);
    expect(c.sablonTuru).toBe('para');
    expect(c.sablonlar.zar).toMatchObject({ ikiZar: false });
    expect(c.deneme).toBe(0);
    // Lisede (10) aynı kayıt değişmez
    ham.sinif = 10;
    const l = durumuCoz(JSON.stringify(ham))!;
    expect(l.sablonTuru).toBe('galton');
    expect(l.sablonlar.zar).toMatchObject({ ikiZar: true });
  });
});

describe('arayüz: sınıf seçimi ve sınıfların laboratuvarı', () => {
  it('seçim ekranı: her sınıfın başlığı ve kazanım kodları', () => {
    const html = renderToStaticMarkup(<SinifSecici siniflar={[5, 6, 7, 8]} onSec={bos} />);
    const m = metin(html);
    for (const s of [5, 6, 7, 8] as const) {
      expect(m).toContain(`${s}. sınıf`);
      expect(m).toContain(SINIF_AYARLARI[s].baslik);
      expect(m).toContain(SINIF_AYARLARI[s].kazanim.join(' · '));
    }
    expect(m).not.toMatch(/Lise|Galton/);
  });

  it('6. sınıf: yalnız deneysel kart (program ifadesi, göreli sıklık), 10/20/30 tekrar sayacıyla; teorik, öznel ve deneme sayısı grafiği yok', () => {
    const html = lab(6);
    const m = metin(html);
    expect(kartlar(html)).toEqual(['deneysel']);
    expect(m).toContain('Olayın meydana gelme sayısı / deneyin tekrar sayısı (göreli sıklık)');
    expect(m).not.toContain('Gerçekleşen / toplam deneme');
    expect(topluDugmeleri(html)).toEqual([10, 20, 30]);
    expect(m).toContain('Tekrar: 0 / 30');
    expect(m).not.toMatch(/Teorik|Öznel|Deneme sayısı arttıkça|yakınsama|Log ölçek|Büyük Sayılar|Galton/);
    expect(m).toContain('Sıklık tablosu');
    expect(m).toContain('Göreli sıklık');
    expect(html).toContain('data-sinif-rozeti="6"');
    expect(html).toContain('data-gorev');
  });

  it('6. sınıf: 30 tekrara ulaşınca deney düğmeleri kapanır', () => {
    let d = sinifSec(bosDurum(), 6);
    d = { ...d, deneme: 30, gerceklesen: 14 };
    const html = lab(6, d);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-bir-kez/);
    for (const n of [10, 20, 30]) expect(html).toMatch(new RegExp(`<button[^>]*disabled=""[^>]*data-toplu="${n}"`));
  });

  it('7. sınıf: teorik kart (örnek uzay, yaklaşık sembolü yok) ve tümleyen; göreli sıklık grafiği; öznel ve deneysel kart yok', () => {
    const html = lab(7);
    const m = metin(html);
    expect(kartlar(html)).toEqual(['teorik']);
    expect(m).toContain('İstenen durum / Örnek uzay = 1 / 2');
    expect(m).toContain('Tümleyeni (tura gelmeme): 1/2');
    expect(m).toContain('1/2 + 1/2 = 1');
    expect(m).toContain('Deneme sayısı arttıkça göreli sıklık');
    expect(m).not.toMatch(/≈|Log ölçek|Büyük Sayılar|Öznel|Deneysel olasılık/);
    expect(topluDugmeleri(html)).toEqual([10, 100, 1000]);
    expect(m).not.toContain('Tekrar:');
  });

  it('8. sınıf: üç kart, karşılaştırma ve deneme sayısı grafiği; log ölçek ve "Büyük Sayılar Kanunu" yok', () => {
    const html = lab(8);
    const m = metin(html);
    expect(kartlar(html)).toEqual(['oznel', 'teorik', 'deneysel']);
    expect(m).toContain('Öznel · Deneysel · Teorik');
    expect(m).toContain('Deneme sayısı arttıkça deneysel olasılık');
    expect(m).not.toMatch(/Log ölçek|Büyük Sayılar|Galton/);
  });

  it('8. sınıf çarkı: gerçek yaşam durumları seçilebilir; hazır durumda görev durumun cümlesi', () => {
    const cark = sablonTuruSec(sinifSec(bosDurum(), 8), 'cark');
    expect(metin(lab(8, cark))).toMatch(/Renkli çark.*Okuldaki görüşler.*Penaltı/);
    const okul = sablonuGuncelle(cark, hazirCarkSablonu(HAZIR_CARKLAR[0]));
    const m = metin(lab(8, okul));
    expect(m).toContain('Okuldaki görüş dağılımını inceleyelim');
    expect(m).toContain('İstenen sonuç');
  });

  it('ortaokulda sayı küpünde iki küp seçeneği yok; lisede var', () => {
    for (const s of [6, 7, 8] as const) expect(metin(lab(s, sablonTuruSec(sinifSec(bosDurum(), s), 'zar')))).not.toContain('İki sayı küpü');
    expect(metin(lab(9, sablonTuruSec(sinifSec(bosDurum(), 9), 'zar')))).toContain('İki sayı küpü (toplam)');
  });

  it('Galton sekmesi yalnız 10. sınıfta; lise grafiklerinde log ölçek ve Büyük Sayılar Kanunu durur', () => {
    for (const s of [6, 7, 8, 9] as const) expect(metin(lab(s))).not.toContain('Galton Tahtası');
    const on = metin(lab(10));
    expect(on).toContain('Galton Tahtası');
    expect(on).toContain('Log ölçek');
    expect(on).toContain('Büyük Sayılar Kanunu');
    expect(kartlar(lab(10))).toEqual(['teorik', 'deneysel']);
  });
});

describe('5. sınıf: olasılık spektrumu (öznel olasılık)', () => {
  it('on kart, her duraktan ikisi; ardışık iki kart aynı durakta değil; tek nesneli olaylar (iki küp yok)', () => {
    expect(SPEKTRUM_KARTLARI).toHaveLength(10);
    for (const d of SPEKTRUM_DURAKLARI) expect(SPEKTRUM_KARTLARI.filter((k) => k.dogru === d)).toHaveLength(2);
    for (let i = 1; i < SPEKTRUM_KARTLARI.length; i++) expect(SPEKTRUM_KARTLARI[i].dogru).not.toBe(SPEKTRUM_KARTLARI[i - 1].dogru);
    for (const k of SPEKTRUM_KARTLARI) expect(k.olay).not.toMatch(/iki sayı küpü|toplam/i);
  });

  it('seçim, kontrol ve dönüt: yanlışta doğru cevap verilmez, yön ipucu verilir; doğru yerleşen kart kilitlenir', () => {
    const kart = SPEKTRUM_KARTLARI.find((k) => k.id === 'zar-alti')!;
    let d = kontrolEt(durakSec(kart, BOS_SPEKTRUM_DURUMU, 'imkansiz'));
    const yanlis = donut(kart, d)!;
    expect(yanlis.dogru).toBe(false);
    expect(yanlis.karar).toBe('Bu olay imkânsız değil.');
    expect(yanlis.aciklama).toContain('kesine');
    expect(yanlis.aciklama).not.toContain(DURAK_ADLARI.az.toLocaleLowerCase('tr-TR'));
    expect(yerlesti(kart, d)).toBe(false);
    d = kontrolEt(durakSec(kart, d, 'az'));
    expect(donut(kart, d)!.karar).toBe('Doğru: Bu olay az olasılıklı.');
    expect(yerlesti(kart, d)).toBe(true);
    expect(durakSec(kart, d, 'kesin')).toBe(d);
  });

  it('görünüm: beş durak (0, 1/2, 1), olay kartı ve sınıf düğmesi; deney, sayaç, yüzde, teorik ve deneysel yok', () => {
    const html = renderToStaticMarkup(<SpektrumGorunumu onSinifDegistir={bos} />);
    expect(html).toContain('data-olasilik-kip="spektrum"');
    expect(html.match(/data-durak="/g)).toHaveLength(5);
    expect(html).toContain('data-sinif-rozeti="5"');
    const m = metin(html);
    for (const d of SPEKTRUM_DURAKLARI) expect(m).toContain(DURAK_ADLARI[d]);
    expect(m).toContain(SPEKTRUM_KARTLARI[0].olay);
    expect(m).not.toMatch(/%|deneysel|teorik|sıklık|Dene\b|çevir|deney/i);
  });
});

describe('tümleyen ve ortaokul formülü', () => {
  it('tümleyenin adı olumsuz eylemle; formülde yaklaşık sembolü yok', () => {
    expect(tumleyenAdi(varsayilanSablon('cark'))).toBe('okun kırmızı dilimde durmama');
    expect(tumleyenAdi(varsayilanSablon('torba'))).toBe('kırmızı bilye çekmeme');
    expect(ortaokulTeorikFormulu(teorikOlasilik(varsayilanSablon('torba')))).toBe('İstenen durum / Örnek uzay = 3 / 10');
    expect(ortaokulTeorikFormulu(teorikOlasilik(varsayilanSablon('zar')))).toBe('İstenen durum / Örnek uzay = 1 / 6');
  });
});
