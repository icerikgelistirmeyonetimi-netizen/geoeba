import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Cetele, ceteleDuzeni, ceteleGenisligi } from '../toplama/Cetele';
import { HazirSoruKarti, rozetParcalari } from '../toplama/HazirSoruKarti';
import {
  IkiZarKutucuklari,
  SecenekKutucuklari,
  kutucukEtiketi,
  kutucukIzgarasi,
  nesneYerlesimi,
  kutucukYuksekligi,
} from '../toplama/SecenekKutucuklari';
import { GrupDuzenleyici, GrupSecici, yeniGrupAdi } from '../toplama/GrupSecici';
import { SayiTusTakimi, tusUygula } from '../toplama/SayiTusTakimi';
import { CanliSayac, CETELE_SINIRI, ceteleYeri, enSikMetni, izgaraSutunu, sayacBicimi, veIleBirlestir } from '../toplama/CanliSayac';
import { DeneyOzeti } from '../toplama/DeneyOzeti';
import { SahneKarti, nesneBoyu } from '../toplama/sahneler/SahneKarti';
import { ParaSahnesi } from '../toplama/sahneler/ParaSahnesi';
import { DilimResmi } from '../toplama/nesneler';
import { ZarSahnesi, araYuzler } from '../toplama/sahneler/ZarSahnesi';
import {
  CarkSahnesi,
  carkDilimAcilari,
  carkEtiketDuzeni,
  carkYaziBoyu,
  ibreDurmaAcisi,
  ibreYolu,
  sonrakiIbreAcisi,
} from '../toplama/sahneler/CarkSahnesi';
import {
  CikanlarTepsisi,
  TorbaSahnesi,
  cikanIndeksleri,
  firfirYolu,
  TOP_R_EN_COK,
  torbaDizilimi,
  torbadaKalanMetni,
} from '../toplama/sahneler/TorbaSahnesi';
import * as Simgeler from '../toplama/simgeler';
import { HAZIR_SIMGE_ADLARI, HazirSoruSimgesi, NesneSimgesi, VeriToplaSimgesi, YontemSimgesi } from '../toplama/simgeler';
import { koyulastir, oranMetni, svgYaziBoyu, yuzdeMetni } from '../toplama/bicim';
import { VeriToplaPaneli, type VeriToplaPaneliProps } from '../toplama/VeriToplaPaneli';
import { OgretmenKarti, type OgretmenBolumu } from '../toplama/OgretmenKarti';
import { PlanAdimi } from '../toplama/PlanAdimi';
import { DeneyToplama } from '../toplama/DeneyToplama';
import { OlcumGirisi, olcumTusBoyu } from '../toplama/OlcumGirisi';
import { DuzenleAdimi } from '../toplama/DuzenleAdimi';
import { YorumAdimi } from '../toplama/YorumAdimi';
import { CarkDuzenleyici, TorbaDuzenleyici, esitYuzdeler, yeniDilimAdi, yeniRenkAdi } from '../toplama/NesneDuzenleyici';
import {
  BOS_GORUNUM,
  DeneyMotoru,
  anindaParcasi,
  carkDilimleri,
  seriAdimlari,
  seriKullanilabilir,
  tamamlandiDuyurusu,
  type MotorAyari,
  type MotorGorunumu,
  type Zamanlayici,
} from '../toplama/deneyMotoru';
import type { DeneyCalistirici } from '../toplama/useDeneyCalistirici';
import * as Y from '../toplama/panelYardimcilari';
import { rozetBasligi } from '../toplama/panelYardimcilari';
import { planiUygula, toplamaVerisiYaz, type ToplamaVerisi } from '../toplamaDurumu';
import { baslangicDurumu, type Durum } from '../durum';
import { HAZIR_SORULAR, anketSatiri, arastirmaBagli, hazirSoruUygula, olcumSatirlari, varsayilanArastirma, type Arastirma } from '../arastirma';
import { mulberry32 } from '../rastgele';

const bos = () => undefined;
const EMOJI = /\p{Extended_Pictographic}/u;
const html = (el: React.ReactElement) => renderToStaticMarkup(el);

/** Çıktı kuralları: emoji yok, saydam kart sınıfı yok, NaN / undefined / Infinity yok */
function temiz(m: string) {
  expect(m).not.toMatch(EMOJI);
  expect(m).not.toContain('bg-card/');
  expect(m).not.toMatch(/NaN|undefined|Infinity/);
}

/** SVG ve HTML'deki bütün sabit yazı boyları ≥ 12 px */
function yaziBoylari(m: string): number[] {
  return Array.from(m.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)).map((x) => Number(x[1]));
}

const YAZI_TURA = [
  { etiket: 'Yazı', renk: '#2f8394' },
  { etiket: 'Tura', renk: '#c8684a' },
] as const;

describe('Veri topla · yardımcılar', () => {
  it('yüzde metni yarımları yukarı yuvarlar, virgül kullanır', () => {
    expect(yuzdeMetni(7, 24, 0)).toBe('%29');
    expect(yuzdeMetni(7, 24, 1)).toBe('%29,2');
    expect(yuzdeMetni(1, 8, 1)).toBe('%12,5');
    expect(yuzdeMetni(1, 6, 1)).toBe('%16,7');
    // 0/0'ın yüzdesi yoktur: boş (sayaç ve kutucuk "0 · %0" yazmaz)
    expect(yuzdeMetni(3, 0)).toBe('');
    expect(yuzdeMetni(0, 0, 1)).toBe('');
    // Grafikle aynı kural: en çok 1 ondalık; 3, 2, 1, 1, 1 cevabın yüzdeleri toplamı %100 (%38 + %25 + 3 × %13 = %102 değil)
    const sayilar = [3, 2, 1, 1, 1];
    const metinler = sayilar.map((n) => yuzdeMetni(n, 8, 1));
    expect(metinler).toEqual(['%37,5', '%25', '%12,5', '%12,5', '%12,5']);
    expect(metinler.reduce((t, m) => t + Number(m.slice(1).replace(',', '.')), 0)).toBeCloseTo(100, 9);
    expect(oranMetni(0.5, 1)).toBe('%50');
  });

  it('renk koyulaştırma hex döndürür, hex olmayanı değiştirmez', () => {
    expect(koyulastir('#ffffff', 1)).toBe('#15302d');
    expect(koyulastir('#2f8394', 0)).toBe('#2f8394');
    expect(koyulastir('hsl(var(--primary))')).toBe('hsl(var(--primary))');
  });

  it('SVG yazısı ekranda en az 12,5 px kalır', () => {
    expect(svgYaziBoyu(13, 160)).toBeCloseTo(15.625);
    expect(svgYaziBoyu(30, 300)).toBe(30);
    expect((svgYaziBoyu(13, 88) * 88) / 200).toBeGreaterThanOrEqual(12.5);
  });
});

describe('Cetele', () => {
  it('7 → 1 demet + 2 çizgi', () => {
    expect(ceteleDuzeni(7)).toMatchObject({ demet: 1, tek: 2, cizilen: 7, not: null });
    const m = html(<Cetele sayi={7} renk="#2f8394" />);
    expect(m.match(/data-demet=""/g)?.length).toBe(1);
    expect(m.match(/data-tek=""/g)?.length).toBe(2);
    expect(m.match(/data-capraz=""/g)?.length).toBe(1);
    temiz(m);
  });

  it('63 → iki satır dolu ve "60+" notu', () => {
    expect(ceteleDuzeni(63)).toMatchObject({ cizilen: 60, demet: 12, tek: 0, satir: 2, not: '60+' });
    const m = html(<Cetele sayi={63} />);
    expect(m).toContain('60+');
    expect(m.match(/data-demet=""/g)?.length).toBe(12);
  });

  it('30\'dan sonra ikinci satıra geçer; tek satırlıkta 30+', () => {
    expect(ceteleDuzeni(31).satir).toBe(2);
    expect(ceteleDuzeni(30).satir).toBe(1);
    expect(ceteleDuzeni(45, 1).not).toBe('30+');
  });

  it('doğal genişlik demet sayısıyla büyür; çizim genişliği aynı', () => {
    expect(ceteleGenisligi(0)).toBe(0);
    expect(ceteleGenisligi(5, 14, 1)).toBeLessThan(ceteleGenisligi(10, 14, 1));
    expect(ceteleGenisligi(30, 14, 1)).toBeGreaterThan(100);
    const m = html(<Cetele sayi={12} yukseklik={14} enCokSatir={1} />);
    expect(m).toContain(`width="${ceteleGenisligi(12, 14, 1)}"`);
  });

  it('0 ve bozuk sayı çizim üretmez', () => {
    expect(html(<Cetele sayi={0} />)).not.toContain('<svg');
    expect(ceteleDuzeni(Number.NaN).cizilen).toBe(0);
  });
});

describe('Kazanım rozeti başlığı', () => {
  it('rozet başlığı kazanım konusunu verir', () => {
    expect(rozetBasligi('MAT.5.5.1')).toBe('5. sınıf · İstatistiksel araştırma süreci');
    expect(rozetBasligi('MAT.7.7.1 · 8.7.1')).toBe('7. sınıf · Veriden olasılığa; 8. sınıf · Veriden olasılığa');
    expect(rozetBasligi('6. sınıf')).toBe('');
  });
});

describe('Hazır soru kartı ve simgeler', () => {
  it('kart data-hazir-soru, sınıf ve işaret taşır (kazanım kodu yalnız title içinde)', () => {
    const m = html(
      <HazirSoruKarti
        id="anket-orneklem"
        ad="Okul anketi tahmini"
        soru="Okulun %60'ı “evet” diyorsa 20 kişiye sorduğumuzda kaç “evet” çıkar?"
        rozet="8. sınıf · MAT.8.6.1 · Simülasyon"
        simge="cark"
        onSec={bos}
      />,
    );
    expect(m).toContain('data-hazir-soru="anket-orneklem"');
    // kartta yalnız sınıf; kazanım kodu öğretmen kartında ve title'da (§0)
    expect(m).toContain('>8. sınıf<');
    expect(m).toMatch(/title="[^"]*8\. sınıf · MAT\.8\.6\.1 · Simülasyon"/);
    expect(m.replace(/title="[^"]*"/g, '')).not.toContain('MAT.');
    expect(m).toContain('>Simülasyon<');
    temiz(m);
    expect(rozetParcalari('8. sınıf · Zenginleştirme')).toEqual({ ana: '8. sınıf', isaretler: ['Zenginleştirme'] });
  });

  it('18 hazır soru simgesi ve bütün arayüz simgeleri çizilir, aria-hidden', () => {
    expect(HAZIR_SIMGE_ADLARI.length).toBe(18);
    for (const ad of HAZIR_SIMGE_ADLARI) {
      const m = html(<HazirSoruSimgesi ad={ad} />);
      expect(m).toContain('aria-hidden="true"');
      expect(m).toMatch(/<(path|circle|rect|ellipse)/);
      temiz(m);
    }
    const bilesenler = Object.entries(Simgeler).filter(([ad, v]) => /Simgesi$/.test(ad) && typeof v === 'function' && ad !== 'HazirSoruSimgesi' && ad !== 'YontemSimgesi' && ad !== 'NesneSimgesi');
    expect(bilesenler.length).toBeGreaterThanOrEqual(25);
    for (const [, Bilesen] of bilesenler) {
      const m = html(React.createElement(Bilesen as React.ComponentType<{ className?: string }>));
      expect(m).toContain('aria-hidden="true"');
      temiz(m);
    }
    expect(html(<VeriToplaSimgesi />)).toContain('viewBox="0 0 20 20"');
    expect(html(<YontemSimgesi yontem="olcum" />)).toContain('<svg');
    expect(html(<NesneSimgesi nesne="torba" />)).toContain('<svg');
  });
});

describe('SecenekKutucuklari', () => {
  const meyve = [
    { etiket: 'Elma', sayi: 7, renk: '#2f8394' },
    { etiket: 'Muz', sayi: 4, renk: '#c8684a' },
    { etiket: 'Çilek', sayi: 6, renk: '#7f88c4' },
    { etiket: 'Portakal', sayi: 5, renk: '#a8782f' },
    { etiket: 'Karpuz', sayi: 2, renk: '#2a9d94' },
  ];

  it('kutucuk aria-label\'ı, sayı, yüzde ve çetele', () => {
    const m = html(<SecenekKutucuklari kutucuklar={meyve} onSec={bos} onSecenekEkle={bos} />);
    expect(m).toContain('aria-label="Elma: 7 cevap. Bir cevap ekle"');
    expect(m).toContain('data-secenek="Portakal"');
    expect(m).toContain('%29');
    expect(m).toContain('Seçenek ekle');
    expect(m.match(/data-cetele=/g)?.length).toBe(5);
    temiz(m);
    expect(kutucukEtiketi({ etiket: 'Tura', sayi: 3, renk: '#c8684a' }, 'atış')).toBe('Tura: 3 atış. Bir atış ekle');
  });

  it('12 seçenekte "Seçenek ekle" kaybolur; ızgara kuralları', () => {
    const aylar = Array.from({ length: 12 }, (_, i) => ({ etiket: `Ay ${i + 1}`, sayi: i, renk: '#2f8394' }));
    const m = html(<SecenekKutucuklari kutucuklar={aylar} onSec={bos} onSecenekEkle={bos} />);
    expect(m).not.toContain('Seçenek ekle');
    expect(kutucukIzgarasi(6)).toEqual({ sutun: 2, satir: 3 });
    expect(kutucukIzgarasi(7)).toEqual({ sutun: 3, satir: 3 });
    expect(kutucukIzgarasi(13)).toEqual({ sutun: 3, satir: 5 });
    // Elle kaydet: para ve ≤ 3 renk tek sütun (geniş kutucuk, nesne solda); 4–6 renk 2, zar 3 sütun
    expect(kutucukIzgarasi(2, 'para')).toEqual({ sutun: 1, satir: 2 });
    expect(kutucukIzgarasi(6, 'zar')).toEqual({ sutun: 3, satir: 2 });
    expect(kutucukIzgarasi(6, 'zar', { genislik: 396, yukseklik: 700 })).toEqual({ sutun: 2, satir: 3 });
    expect(kutucukIzgarasi(3, 'renk')).toEqual({ sutun: 1, satir: 3 });
    expect(kutucukIzgarasi(5, 'renk')).toEqual({ sutun: 2, satir: 3 });
  });

  it('kutucuk yüksekliği kalan alana göre 64–160 (700+ alanda 240: büyük ekranda boş alan kalmaz)', () => {
    expect(kutucukYuksekligi(445, 3)).toBe(143);
    expect(kutucukYuksekligi(200, 5)).toBe(64);
    expect(kutucukYuksekligi(600, 2)).toBe(160);
    expect(kutucukYuksekligi(759, 3)).toBe(240);
    expect(kutucukYuksekligi(1000, 2)).toBe(240);
    // deney nesneleri alanı doldurur (en çok 360)
    expect(kutucukYuksekligi(395, 2, true)).toBe(194);
    expect(kutucukYuksekligi(1000, 2, true)).toBe(360);
    expect(nesneYerlesimi('para', 385, 194)).toBe('genis');
    expect(nesneYerlesimi('zar', 123, 194)).toBe('uzun');
    expect(nesneYerlesimi('zar', 90, 100)).toBe('sikisik');
    expect(nesneYerlesimi('metin', 385, 194)).toBe('sikisik');
  });

  it('para, zar ve renk biçimleri; iki küp seçici', () => {
    const para = html(
      <SecenekKutucuklari
        kutucuklar={YAZI_TURA.map((y, i) => ({ ...y, sayi: i + 3 }))}
        bicim="para"
        birim="atış"
        onSec={bos}
      />,
    );
    expect(para).toContain('aria-label="Tura: 4 atış. Bir atış ekle"');
    expect(para).not.toContain('Seçenek ekle');
    temiz(para);
    const zar = html(
      <SecenekKutucuklari kutucuklar={[1, 2, 3, 4, 5, 6].map((d) => ({ etiket: String(d), sayi: d, renk: '#2f8394' }))} bicim="zar" birim="atış" onSec={bos} />,
    );
    expect(zar.match(/viewBox="0 0 100 100"/g)?.length).toBe(6);
    temiz(zar);
    const iki = html(<IkiZarKutucuklari secim={[3, null]} onSec={bos} />);
    expect(iki.match(/role="radio"/g)?.length).toBe(12);
    expect(iki).toContain('aria-label="1. küp: 3"');
    expect(iki).toContain('İki küpü de seçince satır eklenir.');
    temiz(iki);
  });
});

describe('Gruplar ve tuş takımı', () => {
  it('GrupSecici segmenti ve GrupDuzenleyici', () => {
    const grup = { ad: 'Sınıf', secenekler: ['6-A', '6-B'], etkin: 1 };
    const m = html(<GrupSecici grup={grup} onSec={bos} sayilar={[4, 3]} />);
    expect(m).toContain('CEVAP VEREN:');
    expect(m.match(/role="radio"/g)?.length).toBe(2);
    expect(m).toMatch(/aria-checked="true"[^>]*data-grup="6-B"/);
    temiz(m);
    const d = html(<GrupDuzenleyici grup={grup} onGrup={bos} />);
    expect(d).toContain('Cevapları gruba ayır (ör. 6-A / 6-B)');
    expect(d).toContain('GRUP ADI');
    temiz(d);
    expect(yeniGrupAdi(['6-A', '6-B'])).toBe('6-C');
    expect(yeniGrupAdi(['Sabah', 'Öğle'])).toBe('3. grup');
  });

  it('tuş takımı 14 tuş, data-tus ve tusUygula', () => {
    const m = html(<SayiTusTakimi onTus={bos} onEkle={bos} ekleEtkin={false} />);
    expect(m.match(/data-tus="/g)?.length).toBe(14);
    for (const t of ['0', '7', 'sil', 'eksi', 'virgul', 'ekle']) expect(m).toContain(`data-tus="${t}"`);
    expect(m).toContain('Ekle');
    temiz(m);
    expect(tusUygula('8', '4')).toBe('84');
    expect(tusUygula('0', '7')).toBe('7');
    expect(tusUygula('', 'virgul')).toBe('0,');
    expect(tusUygula('1,5', 'virgul')).toBe('1,5');
    expect(tusUygula('12', 'sil')).toBe('1');
    expect(tusUygula('3', 'eksi')).toBe('-3');
    expect(tusUygula('-3', 'eksi')).toBe('3');
  });
});

describe('Sayaç ve deney özeti', () => {
  it('para sayacı: satırlar, oran çubuğu ve teorik çentik', () => {
    const m = html(
      <CanliSayac
        sonuclar={[
          { ...YAZI_TURA[0], sayi: 8, teorik: 0.5 },
          { ...YAZI_TURA[1], sayi: 12, teorik: 0.5 },
        ]}
      />,
    );
    expect(m).toContain('data-sayac="satir"');
    expect(m).toContain('%60');
    // SSR varsayılan genişliği (200 px) 30 işaretlik çeteleye de satır çubuğuna da yetmez: yalnız sayı ve yüzde
    expect(m).not.toContain('data-sayac-cubugu=""');
    expect(m).not.toContain('data-cetele=');
    expect(m).toContain('data-oran-cubugu=""');
    expect(ceteleYeri(440)).toBeGreaterThanOrEqual(ceteleGenisligi(CETELE_SINIRI, 14, 1));
    expect(ceteleYeri(200)).toBeLessThan(ceteleGenisligi(CETELE_SINIRI, 14, 1));
    expect(m).toContain('teorik %50');
    expect(m.match(/data-teorik-centik=/g)?.length).toBe(1);
    temiz(m);
    // Hiç atış yokken yüzde yazılmaz ("0 · %0" değil)
    const bos = html(
      <CanliSayac
        sonuclar={[
          { ...YAZI_TURA[0], sayi: 0, teorik: 0.5 },
          { ...YAZI_TURA[1], sayi: 0, teorik: 0.5 },
        ]}
      />,
    );
    expect(bos).not.toContain('%0');
    expect(bos).not.toContain('·');
    const bosZar = html(<CanliSayac sonuclar={[1, 2, 3, 4, 5, 6].map((d) => ({ etiket: String(d), sayi: 0, renk: '#2f8394', teorik: 1 / 6 }))} zarYuzu />);
    expect(bosZar).not.toContain('%0');
  });

  it('geri atmadan çekişte çentik yerine "Torbada kalan"', () => {
    const m = html(
      <CanliSayac
        sonuclar={[
          { etiket: 'Kırmızı', sayi: 1, renk: '#c75454', teorik: 0.6 },
          { etiket: 'Mavi', sayi: 1, renk: '#3f7fcb', teorik: 0.4 },
        ]}
        kalanMetni="Torbada kalan: 2 kırmızı, 1 mavi"
      />,
    );
    expect(m).not.toContain('data-teorik-centik');
    expect(m).toContain('Torbada kalan: 2 kırmızı, 1 mavi');
  });

  it('sayı küpü ızgarası ve iki küp dağılımı', () => {
    expect(sayacBicimi(2)).toBe('satir');
    expect(sayacBicimi(6)).toBe('izgara');
    expect(sayacBicimi(11)).toBe('dagilim');
    // sayı küpü ızgarası: sahne kartının dar sağ sütununda 2 × 3 (hücreler sıkışıp üst üste binmez), genişte 3 × 2
    expect(izgaraSutunu(190)).toBe(2);
    expect(izgaraSutunu(312)).toBe(3);
    const zar = html(<CanliSayac sonuclar={[1, 2, 3, 4, 5, 6].map((d) => ({ etiket: String(d), sayi: d, renk: '#2f8394', teorik: 1 / 6 }))} zarYuzu />);
    expect(zar).toContain('data-sayac="izgara"');
    expect(zar).toContain('teorik %16,7');
    temiz(zar);
    const toplamlar = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((t) => ({ etiket: String(t), sayi: 6 - Math.abs(7 - t), renk: '#2f8394', teorik: (6 - Math.abs(7 - t)) / 36 }));
    const d = html(<CanliSayac sonuclar={toplamlar} enSikAdi="en sık toplam" teorikMetni="teorik 6/36 = %16,7" />);
    expect(d).toContain('data-sayac="dagilim"');
    expect(d).toContain('>en sık toplam: 7 (%16,7)<');
    expect(d).toContain('>teorik 6/36 = %16,7<');
    expect(d).toContain('data-sayac-toplami="36"');
    expect(d).toContain('>2<');
    expect(d).toContain('>12<');
    temiz(d);
    const bosD = html(<CanliSayac sonuclar={toplamlar.map((t) => ({ ...t, sayi: 0 }))} enSikAdi="en sık toplam" />);
    expect(bosD).toContain('Henüz atış yok');
    temiz(bosD);
    // Eşitlikte bütün en sık toplamlar söylenir (ilk eşit değer değil)
    const esit = toplamlar.map((t) => ({ ...t, sayi: t.etiket === '6' || t.etiket === '7' ? 19 : 5 }));
    const e = html(<CanliSayac sonuclar={esit} toplam={100} enSikAdi="en sık toplam" />);
    expect(e).toContain('>en sık toplamlar: 6 ve 7 (her biri %19)<');
    expect(e).toContain('data-sayac-lider="6 7"');
    expect(enSikMetni(esit, 100, 'en sık', 'en sık', 'atış')).toBe('en sık: 6 ve 7 (her biri %19)');
    expect(veIleBirlestir(['5', '6', '7'])).toBe('5, 6 ve 7');
    // Sayı küpü ızgarasında zar yüzleri 20 px; teorik düz metin, öznesiyle
    const zarOzne = html(
      <CanliSayac sonuclar={[1, 2, 3, 4, 5, 6].map((d) => ({ etiket: String(d), sayi: d, renk: '#2f8394', teorik: 1 / 6 }))} zarYuzu teorikOzne="her yüz" />,
    );
    expect(zarOzne).toContain('her yüz için teorik %16,7');
    expect(zarOzne).toContain('width="20"');
  });

  it('deney özeti satırları, Tümü ve göreli sıklık', () => {
    const m = html(
      <DeneyOzeti
        satirlar={[
          { etiket: 'Gerçek atışlar', n: 22, sayi: 12 },
          { etiket: '1. deney (20)', n: 20, sayi: 11 },
          { etiket: '3. deney (500)', n: 500, sayi: 246, tabloda: false },
        ]}
        sayilanAd="Tura"
        renk="#c8684a"
        teorik={0.5}
      />,
    );
    expect(m.match(/data-ozet-satiri=/g)?.length).toBe(4);
    expect(m).toContain('data-ozet-satiri="Tümü"');
    expect(m).toContain('%54,5');
    expect(m).toContain('%49,2');
    expect(m).toContain('>542<');
    expect(m).toContain('data-yalniz-ozet=""');
    temiz(m);
  });
});

describe('Sahneler', () => {
  it('sahne kartı: yalnız nesne düğme, son atış yuvası ve durum', () => {
    const m = html(
      <SahneKarti
        sahne="para"
        nesne={(b) => <ParaSahnesi boyut={b} yuzler={YAZI_TURA} sonuc="Tura" />}
        nesneEtiketi="Parayı bir kez at"
        yuva={{ baslik: 'Son atış (12.)', sonuc: 'Tura', renk: '#c8684a' }}
        durum="2. deney · 27 / 50"
      />,
    );
    expect(m).toContain('aria-label="Parayı bir kez at"');
    expect(m).toContain('data-sahne="para"');
    expect(m).toContain('Son atış (12.)');
    expect(m.match(/<button/g)?.length).toBe(1);
    temiz(m);
    expect(nesneBoyu(366, 176, 'yatay')).toBe(168);
    expect(nesneBoyu(416, 700, 'dikey')).toBe(300);
    expect(nesneBoyu(200, 50, 'yatay')).toBe(72);
  });

  it('para: altın boş yüz, sonuç yüzü, yazı ≥ 12,5 px', () => {
    const bosPara = html(<ParaSahnesi boyut={160} yuzler={YAZI_TURA} sonuc={null} />);
    expect(bosPara).toContain('data-para-yuzu=""');
    expect(bosPara).toContain('>?<');
    const tura = html(<ParaSahnesi boyut={88} yuzler={YAZI_TURA} sonuc="Tura" />);
    expect(tura).toContain('data-para-yuzu="Tura"');
    expect(tura).toContain('>TURA<');
    const boy = Number(/font-size="([\d.]+)"/.exec(tura)?.[1]);
    expect((boy * 88) / 200).toBeGreaterThanOrEqual(12.5);
    temiz(tura);
  });

  it('çark: dilim açıları, dik etiketler, kısa ibre ve sonuç çerçevesi', () => {
    const d = [
      { etiket: 'Evet', renk: '#2f8394', oran: 60 },
      { etiket: 'Hayır', renk: '#c8684a', oran: 40 },
    ];
    expect(carkDilimAcilari(d)).toEqual([
      { baslangic: 0, bitis: 216 },
      { baslangic: 216, bitis: 360 },
    ]);
    const m = html(<CarkSahnesi boyut={160} dilimler={d} ibreAcisi={765} sure={0} secilen={0} />);
    expect(m).toContain('>Evet<');
    expect(m).toContain('>Hayır<');
    expect(m).toContain('data-sonuc-dilimi="Evet"');
    expect(m).toContain('rotate(765deg)');
    temiz(m);
    // Dar dilim: tepedeki dışarıda, yandaki yazılmaz; disk küçülür
    const dar = carkEtiketDuzeni(
      [
        { etiket: 'A', oran: 5 },
        { etiket: 'B', oran: 40 },
        { etiket: 'C', oran: 50 },
        { etiket: 'D', oran: 5 },
      ],
      15,
    );
    expect(dar.r).toBe(64);
    expect(dar.yerler[0].tur).toBe('dis');
    expect(dar.yerler[1].tur).toBe('ic');
    expect(ibreYolu(86)).not.toMatch(/NaN/);
  });

  it('ibre dilimin içinde, etiketten uzakta durur; her çevirmede en az 2 tur', () => {
    const d = [
      { etiket: 'Evet', oran: 60 },
      { etiket: 'Hayır', oran: 40 },
    ];
    // İbre ucu (0,46 r) etiket kutusunun (0,64 r'de, yazı genişliği × 0,42 em) dışında kalır
    const ucEtiketteMi = (aci: number, boyut: number, i: number) => {
      const yazi = carkYaziBoyu(boyut);
      const { r } = carkEtiketDuzeni(d, yazi);
      const acilar = carkDilimAcilari(d);
      const rad = (x: number) => (x * Math.PI) / 180;
      const uc = { x: 100 + r * 0.46 * Math.sin(rad(aci)), y: 100 - r * 0.46 * Math.cos(rad(aci)) };
      const orta = (acilar[i].baslangic + acilar[i].bitis) / 2;
      const e = { x: 100 + r * 0.64 * Math.sin(rad(orta)), y: 100 - r * 0.64 * Math.cos(rad(orta)) };
      const g = (d[i].etiket.length * yazi * 0.62) / 2 + 4;
      const h = yazi * 0.42 + 4;
      return Math.abs(uc.x - e.x) <= g && Math.abs(uc.y - e.y) <= h;
    };
    for (let k = 0; k < 20; k++) {
      const rnd = k / 20;
      const evet = ibreDurmaAcisi(d, 0, rnd, 160);
      expect(evet).toBeGreaterThan(0);
      expect(evet).toBeLessThan(216);
      expect(ucEtiketteMi(evet, 160, 0)).toBe(false);
      const hayir = ibreDurmaAcisi(d, 1, rnd, 300);
      expect(hayir).toBeGreaterThan(216);
      expect(hayir).toBeLessThan(360);
      expect(ucEtiketteMi(hayir, 300, 1)).toBe(false);
    }
    // Kısıt yokken (etiketin tam üstü) seçilebilecek açı gerçekten engellidir
    expect(ucEtiketteMi(108, 160, 0)).toBe(true);
    // Çok dar dilim: yine dilimin içinde
    const dar = ibreDurmaAcisi([{ etiket: 'A', oran: 3 }, { etiket: 'B', oran: 97 }], 0, 0.5, 160);
    expect(dar).toBeGreaterThan(0);
    expect(dar).toBeLessThan(360 * 0.03);
    expect(sonrakiIbreAcisi(0, 150)).toBe(870);
    expect(sonrakiIbreAcisi(870, 30)).toBe(870 - 150 + 360 * 2 + 30 + 360);
    expect(sonrakiIbreAcisi(870, 200) - 870).toBeGreaterThanOrEqual(720);
    expect(sonrakiIbreAcisi(870, 200) % 360).toBe(200);
  });

  it('zar: tek ve iki küp, ara yüzler, toplam balonu', () => {
    const tek = html(<ZarSahnesi boyut={160} kupSayisi={1} degerler={[6]} />);
    expect(tek).toContain('data-zar-yuzleri="6"');
    temiz(tek);
    const iki = html(<ZarSahnesi boyut={160} kupSayisi={2} degerler={[3, 4]} />);
    expect(iki).toContain('data-toplam-balonu="7"');
    expect(iki).toContain('= 7');
    const dizi = araYuzler(5, 0, 12, 4);
    expect(dizi.length).toBe(12);
    dizi.forEach((y, i) => {
      expect(y).toBeGreaterThanOrEqual(1);
      expect(y).toBeLessThanOrEqual(6);
      if (i > 0) expect(y).not.toBe(dizi[i - 1]);
    });
    expect(dizi[dizi.length - 1]).not.toBe(4);
  });

  it('torba: yazısız toplar, çıkan izleri, kalan metni ve tepsi', () => {
    const toplar = [
      { etiket: 'Kırmızı', renk: '#c75454', adet: 3 },
      { etiket: 'Mavi', renk: '#3f7fcb', adet: 2 },
    ];
    const d = torbaDizilimi(toplar);
    expect(d.toplar.length).toBe(5);
    expect(d.r).toBeLessThanOrEqual(TOP_R_EN_COK);
    expect(TOP_R_EN_COK).toBe(11);
    expect(firfirYolu(100, 48, 38, 9)).not.toMatch(/NaN/);
    expect(torbaDizilimi([{ etiket: 'K', renk: '#c75454', adet: 60 }]).r).toBeGreaterThanOrEqual(5);
    expect(cikanIndeksleri(d.toplar, ['Mavi', 'Kırmızı']).size).toBe(2);
    expect(torbadaKalanMetni(toplar, ['Kırmızı'])).toBe('Torbada kalan: 2 kırmızı, 2 mavi');
    expect(torbadaKalanMetni(toplar, ['Kırmızı', 'Kırmızı', 'Kırmızı', 'Mavi', 'Mavi'])).toBe('Torba boşaldı');
    const m = html(<TorbaSahnesi boyut={160} toplar={toplar} cekilenler={['Mavi']} geriAt={false} />);
    expect(m.match(/data-top=/g)?.length).toBe(5);
    expect(m.match(/data-cikti=""/g)?.length).toBe(1);
    expect(m).toContain('data-torba-kalan="4"');
    expect(m).not.toContain('>Kırmızı<');
    temiz(m);
    const t = html(<CikanlarTepsisi cikanlar={Array.from({ length: 10 }, (_, i) => ({ etiket: i % 2 ? 'Mavi' : 'Kırmızı', renk: i % 2 ? '#3f7fcb' : '#c75454' }))} />);
    expect(t).toContain('Çıkanlar');
    expect(t).toContain('+2');
    temiz(t);
  });

  it('bütün bileşenlerde sabit yazı boyu ≥ 12 px', () => {
    const hepsi = [
      html(<HazirSoruKarti id="meyve" ad="En sevilen meyve" soru="Sınıfımızda en çok sevilen meyve hangisi?" rozet="5. sınıf · MAT.5.5.1" simge="elma" onSec={bos} />),
      html(<SecenekKutucuklari kutucuklar={[{ etiket: 'Elma', sayi: 3, renk: '#2f8394' }]} onSec={bos} onSecenekEkle={bos} />),
      html(<CanliSayac sonuclar={[{ etiket: 'Yazı', sayi: 1, renk: '#2f8394', teorik: 0.5 }]} />),
      html(<DeneyOzeti satirlar={[{ etiket: '1. deney (20)', n: 20, sayi: 9 }]} sayilanAd="Tura" renk="#c8684a" teorik={0.5} />),
      html(<GrupSecici grup={{ ad: 'Sınıf', secenekler: ['6-A', '6-B'], etkin: 0 }} onSec={bos} />),
    ].join('');
    const boylar = yaziBoylari(hepsi);
    expect(boylar.length).toBeGreaterThan(5);
    for (const b of boylar) expect(b).toBeGreaterThanOrEqual(12);
  });
});

// ── Panel (B2-arayüz): yardımcılar, çalıştırma motoru, görünümler ────────────

/** Hazır sorunun planını başlangıç durumuna uygular (C'nin onPlaniUygula'sı gibi) */
function uygula(id: string, degistir?: (a: Arastirma) => Arastirma): Durum {
  let a = hazirSoruUygula(id) as Arastirma;
  if (degistir) a = degistir(a);
  return planiUygula(baslangicDurumu(), a).durum;
}

function yaz(d: Durum, v: ToplamaVerisi): Durum {
  return toplamaVerisiYaz(d, v);
}

function anketDurumu(cevaplar: string[]): Durum {
  let d = uygula('meyve');
  for (const c of cevaplar) d = yaz(d, { ekle: [{ kimlik: `r-${Math.random().toString(36).slice(2)}`, hucreler: anketSatiri(d.arastirma as Arastirma, c) }] });
  return d;
}

function panelProps(d: Durum, ek: Partial<VeriToplaPaneliProps> = {}): VeriToplaPaneliProps {
  return {
    arastirma: d.arastirma,
    tablo: d.tablo,
    bagli: arastirmaBagli(d.tablo, d.arastirma),
    azaltilmisHareket: false,
    onArastirma: bos,
    onPlaniUygula: bos,
    onVeri: bos,
    onTabloIslemi: bos,
    onSekme: bos,
    onOzeteGec: bos,
    onSatirGoster: bos,
    onYeniSatir: bos,
    onAkis: bos,
    onBildirim: bos,
    onKapat: bos,
    ...ek,
  };
}

function sahteCalistirici(g: Partial<MotorGorunumu> = {}): DeneyCalistirici {
  return {
    gorunum: { ...BOS_GORUNUM, ...g },
    calisiyor: !!g.calisiyor,
    kos: bos,
    seri: bos,
    tekAtis: bos,
    durdur: bos,
    donmeBitti: bos,
    sahneBoyuRef: { current: 160 },
  };
}

/** Sahte saat: zamanlayıcılar ve kareler (16 ms) sırayla işlenir */
function sahteSaat() {
  let t = 0;
  let sira = 0;
  const isler = new Map<number, { zaman: number; fn: () => void }>();
  const siradaki = (sinir: number) => {
    let en: [number, { zaman: number; fn: () => void }] | null = null;
    for (const e of isler) if (e[1].zaman <= sinir && (!en || e[1].zaman < en[1].zaman || (e[1].zaman === en[1].zaman && e[0] < en[0]))) en = e;
    return en;
  };
  const saat: Zamanlayici & { ilerle(ms: number): void; bitir(): void; t(): number } = {
    zaman: (fn, ms) => {
      isler.set(++sira, { zaman: t + ms, fn });
      return sira;
    },
    iptal: (i) => void isler.delete(i),
    kare: (fn) => {
      isler.set(++sira, { zaman: t + 16, fn });
      return sira;
    },
    kareIptal: (i) => void isler.delete(i),
    simdi: () => t,
    ilerle(ms) {
      const son = t + ms;
      for (let e = siradaki(son); e; e = siradaki(son)) {
        isler.delete(e[0]);
        t = e[1].zaman;
        e[1].fn();
      }
      t = son;
    },
    bitir() {
      for (let k = 0, e = siradaki(Infinity); e && k < 200000; k++, e = siradaki(Infinity)) {
        isler.delete(e[0]);
        t = e[1].zaman;
        e[1].fn();
      }
    },
    t: () => t,
  };
  return saat;
}

function motorKur(d0: Durum, ayar: Partial<MotorAyari> = {}) {
  let d = d0;
  let g: MotorGorunumu = BOS_GORUNUM;
  const olay = { bildirim: [] as string[], duyuru: [] as string[], ozet: 0, akis: [] as boolean[], yeni: [] as (string | null)[], veri: [] as ToplamaVerisi[] };
  const saat = sahteSaat();
  const motor = new DeneyMotoru(
    saat,
    {
      veri: (v) => {
        olay.veri.push(v);
        d = toplamaVerisiYaz(d, v);
      },
      yeniSatir: (k) => olay.yeni.push(k),
      akis: (x) => olay.akis.push(x),
      bildirim: (m) => olay.bildirim.push(m),
      duyuru: (m) => olay.duyuru.push(m),
      ozeteGec: () => {
        olay.ozet += 1;
      },
      gorunum: (x) => {
        g = x;
      },
    },
    () => ({ hiz: (d.arastirma as Arastirma).deney.hiz, azaltilmis: false, tabloSatiri: d.tablo.satirlar.length, boyut: 160, ...ayar }),
    () => mulberry32(42),
  );
  return { motor, saat, olay, d: () => d, a: () => d.arastirma as Arastirma, g: () => g };
}

describe('Panel yardımcıları', () => {
  it('görünüm: başlangıç, form ve Topla; kayıtlı taslak ve devam', () => {
    const d = anketDurumu(['Elma']);
    const a = d.arastirma as Arastirma;
    expect(Y.panelGorunumu(null, false, false)).toBe('baslangic');
    expect(Y.panelGorunumu(a, true, false)).toBe('topla');
    expect(Y.panelGorunumu({ ...a, adim: 'duzenle' }, true, false)).toBe('topla');
    expect(Y.panelGorunumu({ ...a, adim: 'soru' }, true, false)).toBe('baslangic');
    expect(Y.panelGorunumu(a, false, false)).toBe('baslangic');
    expect(Y.panelGorunumu(a, true, true)).toBe('form');
    const oylama = hazirSoruUygula('oylama') as Arastirma;
    expect(Y.kayitliTaslak(oylama, false)).toBe(oylama);
    expect(Y.kayitliTaslak(a, true)).toBeNull();
    expect(Y.taslakDevamMi({ ...a, adim: 'plan' }, a, true)).toBe(true);
    expect(Y.taslakDevamMi({ ...a, yontem: 'olcum' }, a, true)).toBe(false);
    expect(Y.gorevMetni(a)).toBe('Sınıfımızda en çok sevilen meyve hangisi?');
    // Soru yazılmamışsa plandan kurulan soru ("Anket: Meyve" gibi bir etiket değil)
    expect(Y.gorevMetni({ ...a, soru: ' ' })).toBe('En çok hangi meyve seçiliyor?');
  });

  it('anket kutucukları: plan sırası, grafik renkleri, grup metni', () => {
    const d = anketDurumu(['Elma', 'Muz', 'Elma']);
    const k = Y.anketKutucuklari(d.tablo, d.arastirma as Arastirma);
    expect(k.map((x) => [x.etiket, x.sayi])).toEqual([
      ['Elma', 2],
      ['Muz', 1],
      ['Çilek', 0],
      ['Portakal', 0],
      ['Karpuz', 0],
    ]);
    expect(k[0].renk).toBe('#2f8394');
    expect(k[1].renk).toBe('#c8684a');
    expect(k[0].grupMetni).toBeNull();
    let g = uygula('meyve', (a) => ({ ...a, anket: { ...a.anket, grup: { ad: 'Sınıf', secenekler: ['6-A', '6-B'], etkin: 1 } } }));
    g = yaz(g, { ekle: [{ kimlik: 'x1', hucreler: anketSatiri(g.arastirma as Arastirma, 'Elma') }] });
    expect(Y.anketKutucuklari(g.tablo, g.arastirma as Arastirma)[0].grupMetni).toBe('6-A 0 · 6-B 1');
    const kardes = uygula('kardes');
    expect(Y.anketKutucuklari(kardes.tablo, kardes.arastirma as Arastirma).every((x) => x.renk === Y.SAYISAL_RENK)).toBe(true);
  });

  it('etiket renkleri sonuç renkleriyle aynı; boş etiket gri', () => {
    expect(Y.etiketRenkleri(['Evet', '', 'Hayır', 'Evet'])).toEqual(['#2f8394', Y.BOS_ETIKET_RENGI, '#c8684a', '#2f8394']);
    const para = uygula('para').arastirma as Arastirma;
    expect(Y.sonucRenkleri(para.deney).get('Tura')).toBe('#c8684a');
    expect(Y.sonucRenkleri({ ...para.deney, nesne: 'zar' }).get('6')).toBe(Y.SAYISAL_RENK);
    const torba = uygula('torba').arastirma as Arastirma;
    expect(Y.sonucRenkleri(torba.deney).get('Kırmızı')).toBe('#c75454');
  });

  it('deney: elle kutucukları, sayaç çalışması, son atış ve sonuç metni', () => {
    let d = uygula('para');
    const a0 = d.arastirma as Arastirma;
    expect(Y.sayacCalismasi(a0, null)).toBe(-1);
    expect(Y.sayacSonuclari(d.tablo, a0, -1).sonuclar.map((s) => s.sayi)).toEqual([0, 0]);
    d = yaz(d, { calismaBaslat: { no: 0, kayit: 'gercek', hedef: 1 }, ekle: [{ kimlik: 'g1', hucreler: ['Tura'], calisma: 0 }] });
    d = yaz(d, { ekle: [{ kimlik: 'g2', hucreler: ['Tura'], calisma: 0 }] });
    const a = d.arastirma as Arastirma;
    expect(Y.deneyKutucuklari(d.tablo, a).map((k) => k.sayi)).toEqual([0, 2]);
    expect(Y.kutucukBicimi(a.deney)).toBe('para');
    expect(Y.deneyKutucuklari(d.tablo, a).map((k) => k.oran)).toEqual([0.5, 0.5]);
    // çark kutucuğu dilim resmiyle: dilimin büyüklüğü teorik olasılık (Gol %70)
    const pen = uygula('penalti');
    const pa = pen.arastirma as Arastirma;
    expect(Y.kutucukBicimi(pa.deney)).toBe('dilim');
    expect(Y.deneyKutucuklari(pen.tablo, pa).map((k) => [k.etiket, k.oran])).toEqual([['Gol', 0.7], ['Kaçtı', 0.3]]);
    const dilim = html(<DilimResmi renk="#2f8394" oran={0.7} boyut={120} />);
    expect(dilim).toMatch(/<path d="M 20 20 L 20 2\.8 A 17\.2 17\.2 0 1 1 /);
    expect(html(<DilimResmi renk="#2f8394" oran={1} boyut={40} />)).not.toContain('<path');
    expect(Y.sonAtisBilgisi(d.tablo, a, 0)).toEqual({ degerler: ['Tura'], sira: 2 });
    const iki = (hazirSoruUygula('iki-zar') as Arastirma).deney;
    expect(Y.sonucMetni(iki, ['2', '5', '7'])).toBe('2 + 5 = 7');
    expect(Y.izlenenDegeri(iki, ['2', '5', '7'])).toBe('7');
    expect(Y.sonDeneyEtiketi(a)).toBeNull();
  });

  it('geri al: başlık, yığın yedeği ve geçerlilik', () => {
    const d = anketDurumu(['Elma', 'Muz']);
    const a = d.arastirma as Arastirma;
    expect(Y.geriAlBasligi(a)).toBe('Son cevabı geri al');
    expect(Y.geriAlBasligi({ ...a, yontem: 'olcum' })).toBe('Son ölçümü geri al');
    expect(Y.geriAlBasligi({ ...a, yontem: 'deney' })).toBe('Son deneyi geri al');
    expect(Y.geriAlBasligi({ ...a, yontem: 'deney', deney: { ...a.deney, nesne: 'cark', kayit: 'gercek' } })).toBe('Son çevirmeyi geri al');
    const k = Y.yedekGeriAl(d.tablo, a);
    expect(k).toEqual({ tur: 'satirlar', kimlikler: [d.tablo.satirlar[1].id] });
    expect(Y.geriAlGecerli(k as Y.GeriAlKaydi, d.tablo, a)).toBe(true);
    expect(Y.geriAlGecerli({ tur: 'satirlar', kimlikler: ['yok'] }, d.tablo, a)).toBe(false);
    const bos = uygula('meyve');
    expect(Y.yedekGeriAl(bos.tablo, bos.arastirma as Arastirma)).toBeNull();
    const { motor, saat, d: dd, a: aa } = motorKur(uygula('para'));
    motor.kos(aa(), 20);
    saat.bitir();
    expect(Y.yedekGeriAl(dd().tablo, aa())).toEqual({ tur: 'calisma', no: 1 });
  });

  it('öğretmen kartı metinleri: kazanımlar, tahmin, notlar', () => {
    const para = uygula('para').arastirma as Arastirma;
    const k = Y.kazanimSatirlari(para);
    expect(k.map((x) => x.rozet)).toContain('MAT.7.7.1 · 8.7.1');
    expect(k.find((x) => x.rozet === 'MAT.7.7.1 · 8.7.1')?.yer).toBe('Deney özeti ve seri');
    expect(k.find((x) => x.rozet === 'MAT.6.6.1')?.konu).toBe('6. sınıf · Veriden olasılığa');
    expect(k.find((x) => x.rozet === 'MAT.6.6.1')?.yer).toBe('Planlama · Veri toplama · Yorumlama');
    // Her kod tek satırda (MAT.5.5.1 iki kez yazılmaz); hazır sorunun kendi kodu
    const satirlar = (id: string) => Y.kazanimSatirlari(uygula(id).arastirma as Arastirma);
    for (const h of HAZIR_SORULAR) {
      const kodlar = satirlar(h.id).flatMap((s) => (s.rozet.match(/\d\.\d\.\d/g) ?? []) as string[]);
      expect(new Set(kodlar).size, h.id).toBe(kodlar.length);
    }
    expect(satirlar('meyve')).toEqual([{ rozet: 'MAT.5.5.1', yer: 'Planlama · Veri toplama · Veriyi düzenleme · Yorumlama', konu: '5. sınıf · İstatistiksel araştırma süreci' }]);
    expect(satirlar('kardes')).toEqual([{ rozet: 'MAT.6.5.1', yer: 'Planlama · Veri toplama · Veriyi düzenleme · Yorumlama', konu: '6. sınıf · İstatistiksel araştırma süreci' }]);
    expect(satirlar('boy').map((s) => s.rozet)).toEqual(['MAT.7.6.1']);
    expect(satirlar('anket-orneklem').map((s) => [s.rozet, s.yer])).toEqual([
      ['MAT.8.6.1', 'Planlama · Veri toplama · Yorumlama'],
      ['MAT.7.7.1 · 8.7.1', 'Deney özeti ve seri'],
    ]);
    expect(satirlar('seri')).toEqual([{ rozet: 'MAT.7.7.1 · 8.7.1', yer: 'Planlama · Veri toplama · Deney özeti ve seri · Yorumlama', konu: '7. sınıf · Veriden olasılığa; 8. sınıf · Veriden olasılığa' }]);
    expect(satirlar('iki-zar')[0]).toEqual({ rozet: 'Zenginleştirme', yer: 'Planlama · Veri toplama · Yorumlama', konu: '8. sınıf · Programın dışında (zenginleştirme)' });
    // Kendi sorumuz: yöntemin varsayılanları, her kod bir kez
    const kendi = Y.kazanimSatirlari({ ...(uygula('meyve').arastirma as Arastirma), hazirId: null });
    expect(kendi.map((s) => [s.rozet, s.yer])).toEqual([
      ['MAT.5.5.1', 'Planlama · Veri toplama · Veriyi düzenleme · Yorumlama'],
      ['MAT.8.6.1', 'Planlama'],
    ]);
    expect(Y.tahminAlani(para)).toEqual({ tur: 'sayi', on: '20 atışta', son: 'kez tura', yerTutucu: '?' });
    // Simülasyon: bağlamıyla ("20 kişide [ ] “evet”"); notlar okul anketini anlatır, gerçek nesne istemez
    const orneklem = uygula('anket-orneklem').arastirma as Arastirma;
    expect(Y.tahminAlani(orneklem)).toEqual({ tur: 'sayi', on: '20 kişide', son: '“evet”', yerTutucu: '?' });
    expect(Y.etkinlikNotu(orneklem)).toMatch(/örneklem/);
    expect(Y.etkinlikNotu(orneklem)).not.toMatch(/teorik olasılığa/);
    expect(Y.ogretmenNotu(orneklem)).not.toMatch(/gerçek nesne/);
    expect(Y.tahminAlani(uygula('penalti').arastirma as Arastirma)).toEqual({ tur: 'sayi', on: '10 penaltıda', son: 'gol', yerTutucu: '?' });
    const meyve = uygula('meyve').arastirma as Arastirma;
    expect(Y.tahminAlani(meyve)).toEqual({ tur: 'secenek', secenekler: ['Elma', 'Muz', 'Çilek', 'Portakal', 'Karpuz'] });
    const nabiz = uygula('nabiz').arastirma as Arastirma;
    expect(Y.tahminAlani(nabiz)).toMatchObject({ tur: 'sayi', on: 'Ortalama yaklaşık', son: 'atım/dk' });
    for (const a of [para, meyve, nabiz]) {
      expect(Y.etkinlikNotu(a)).not.toMatch(EMOJI);
      expect(Y.ogretmenNotu(a).length).toBeGreaterThan(40);
      expect(`${Y.etkinlikNotu(a)} ${Y.ogretmenNotu(a)}`).not.toMatch(/Medyan|frekans|uç değer|Örnekleyici|çekiliş|\d'/);
    }
    expect(Y.onizlemeSutunlari(meyve)).toEqual(['Meyve']);
    expect(Y.onizlemeSutunlari({ ...nabiz, olcum: { ...nabiz.olcum, adYaz: true } })).toEqual(['Öğrenci', 'Nabız (atım/dk)']);
    expect(Y.onizlemeSutunlari(uygula('iki-zar').arastirma as Arastirma)).toEqual(['1. küp', '2. küp', 'Toplam']);
    expect(Y.yedekPlanUyarisi(baslangicDurumu().tablo, false)).toMatch(/^Başlayınca yeni tablo açılır\. Şimdiki tablo \(\d+ satır\) saklanır/);
    expect(Y.yedekPlanUyarisi(baslangicDurumu().tablo, true)).toBeNull();
  });

  it('kısayollar yalnız uygun hedefte', () => {
    const e = (key: string, ctrlKey = false) => ({ key, ctrlKey, metaKey: false, altKey: false });
    const h = (dugme = false, yazi = false) => ({ etiket: 'DIV', yazi, dugme });
    expect(Y.kisayol(e('z', true), h(), 'anket', 'simulasyon', false)).toEqual({ tur: 'geriAl' });
    expect(Y.kisayol(e('z', true), h(), 'anket', 'simulasyon', true)).toBeNull();
    expect(Y.kisayol(e('3'), h(), 'anket', 'simulasyon', false)).toEqual({ tur: 'secenek', indeks: 2 });
    expect(Y.kisayol(e('3'), h(false, true), 'anket', 'simulasyon', false)).toBeNull();
    expect(Y.kisayol(e(','), h(true), 'olcum', 'simulasyon', false)).toEqual({ tur: 'tus', tus: ',' });
    expect(Y.kisayol(e('Enter'), h(), 'olcum', 'simulasyon', false)).toEqual({ tur: 'ekle' });
    expect(Y.kisayol(e('Enter'), h(true), 'olcum', 'simulasyon', false)).toBeNull();
    expect(Y.kisayol(e(' '), h(), 'deney', 'simulasyon', false)).toEqual({ tur: 'tekAtis' });
    expect(Y.kisayol(e(' '), h(true), 'deney', 'simulasyon', false)).toBeNull();
    expect(Y.kisayol(e('Enter'), h(), 'deney', 'simulasyon', false)).toEqual({ tur: 'kos' });
    expect(Y.kisayol(e('Escape'), h(true), 'deney', 'simulasyon', true)).toEqual({ tur: 'durdur' });
    expect(Y.kisayol(e(' '), h(), 'deney', 'gercek', false)).toBeNull();
  });

  it('düzenleyici yardımcıları ve tuş boyu', () => {
    expect(esitYuzdeler(3)).toEqual([34, 33, 33]);
    expect(esitYuzdeler(7).reduce((t, x) => t + x, 0)).toBe(100);
    expect(yeniRenkAdi(['Kırmızı', 'mavi'])).toBe('Yeşil');
    expect(yeniDilimAdi(['1. dilim', '3. dilim'])).toBe('4. dilim');
    expect(olcumTusBoyu(461, 200)).toBe(61);
    expect(olcumTusBoyu(300, 200)).toBe(44);
    expect(olcumTusBoyu(900, 200)).toBe(108);
    expect(olcumTusBoyu(700, 200)).toBe(96);
    expect(olcumTusBoyu(600, 200)).toBe(72);
  });
});

describe('Deney çalıştırma motoru', () => {
  it('20 atış (Otomatik): 20 canlandırmalı atış × 400 ms, satırlar ve tost', () => {
    const { motor, saat, olay, d, a, g } = motorKur(uygula('para'));
    expect(motor.kos(a(), 20)).toBe(true);
    expect(olay.veri[0]).toEqual({ calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 20 } });
    expect(g().calisiyor).toBe(true);
    expect(motor.kos(a(), 20)).toBe(false);
    saat.bitir();
    expect(d().tablo.satirlar.length).toBe(20);
    expect(a().deney.calismalar).toMatchObject([{ no: 1, etiket: '1. deney (20)', n: 20, tabloda: true }]);
    expect(saat.t()).toBeGreaterThanOrEqual(7600);
    expect(saat.t()).toBeLessThanOrEqual(10000);
    expect(olay.yeni.filter((k) => k !== null).length).toBe(20);
    expect(olay.akis).not.toContain(true);
    expect(olay.bildirim).toHaveLength(1);
    expect(olay.bildirim[0]).toMatch(/^20 atış tamamlandı: Tura \d+ \(%\d+(,\d)?\)\.$/);
    expect(olay.duyuru[olay.duyuru.length - 1]).toMatch(/^20 atış tamamlandı: Tura \d+, yüzde \d+(,\d)?$/);
    expect(olay.duyuru.some((m) => /^Atış \d+: (Yazı|Tura)$/.test(m))).toBe(false);
    expect(g()).toMatchObject({ calisiyor: false, anahtar: 20, son: { sira: 20, no: 1 } });
  });

  it('100 atış: ilk 10 atış canlandırılır, kalanı anında (≤ 4 s); akış açılıp kapanır', () => {
    const { motor, saat, olay, d, a, g } = motorKur(uygula('para', (x) => ({ ...x, deney: { ...x.deney, atisSayisi: 100 } })));
    motor.kos(a(), 100);
    expect(g().butce).toBe('İlk 10 atış görünür, kalanı hızlı');
    saat.bitir();
    expect(saat.t()).toBeLessThanOrEqual(4000);
    expect(d().tablo.satirlar.length).toBe(100);
    expect(olay.yeni.filter((k) => k !== null).length).toBe(10);
    expect(olay.akis).toEqual([true, false]);
    expect(a().deney.calismalar[0].n).toBe(100);
  });

  it('2000 atış anında (≤ 1,5 s): tabloya yazılmaz, yalnız özete', () => {
    const { motor, saat, d, a, olay } = motorKur(uygula('para'));
    const once = d().tablo.satirlar.length;
    motor.kos(a(), 2000);
    saat.bitir();
    expect(saat.t()).toBeLessThanOrEqual(1500);
    expect(d().tablo.satirlar.length).toBe(once);
    expect(a().deney.calismalar[0]).toMatchObject({ n: 2000, tabloda: false });
    expect(olay.bildirim[0]).toMatch(/^2000 atış tamamlandı/);
  });

  it('Durdur: deney o ana kadarki atışlarla kaydedilir', () => {
    const { motor, saat, olay, d, a } = motorKur(uygula('para'));
    motor.kos(a(), 20);
    saat.ilerle(2100);
    motor.durdur();
    saat.bitir();
    expect(d().tablo.satirlar.length).toBe(5);
    expect(a().deney.calismalar[0]).toMatchObject({ etiket: '1. deney (5)', n: 5 });
    expect(olay.bildirim).toEqual(['Durduruldu: 5 atış. Deney “1. deney (5)” olarak kaydedildi.']);
  });

  it('Seri: 7 deney (370 satır tabloda), özet Çizgi grafiğinde, ≤ 4 s', () => {
    const { motor, saat, olay, d, a } = motorKur(uygula('seri'));
    expect(motor.seri(a())).toBe(true);
    saat.bitir();
    expect(saat.t()).toBeLessThanOrEqual(4000);
    expect(a().deney.calismalar.map((c) => c.etiket)).toEqual(['1. deney (20)', '2. deney (50)', '3. deney (100)', '4. deney (200)', '5. deney (500)', '6. deney (1000)', '7. deney (2000)']);
    expect(d().tablo.satirlar.length).toBe(370);
    expect(olay.ozet).toBe(1);
    expect(olay.bildirim).toEqual(['Seri tamamlandı: 7 deney özete yazıldı.']);
    expect(olay.akis[0]).toBe(true);
    expect(olay.akis[olay.akis.length - 1]).toBe(false);
  });

  it('çark: satır ibre durunca (transitionend) yazılır; yedek zaman aşımı', () => {
    const { motor, saat, d, a, g } = motorKur(uygula('anket-orneklem'));
    motor.kos(a(), 20);
    expect(g().ibreAcisi).toBeGreaterThanOrEqual(720);
    expect(g().carkSecilen).toBeNull();
    expect(d().tablo.satirlar.length).toBe(0);
    motor.donmeBitti();
    expect(d().tablo.satirlar.length).toBe(1);
    expect(g().carkSecilen).not.toBeNull();
    saat.bitir();
    expect(d().tablo.satirlar.length).toBe(20);
    expect(carkDilimleri(a().deney)).toEqual([
      { etiket: 'Evet', oran: 60 },
      { etiket: 'Hayır', oran: 40 },
    ]);
  });

  it('torba geri atmadan: çıkanlar birikir, torba boşalınca durur; seri kapalı', () => {
    const { motor, saat, d, a, g, olay } = motorKur(
      uygula('torba', (x) => ({ ...x, deney: { ...x.deney, atisSayisi: 5, torba: { ...x.deney.torba, geriAt: false } } })),
    );
    expect(seriKullanilabilir(a().deney)).toBe(false);
    expect(seriAdimlari(a().deney)).toEqual([]);
    expect(motor.seri(a())).toBe(false);
    motor.kos(a(), 5);
    saat.bitir();
    expect(g().cekilenler).toHaveLength(5);
    expect([...g().cekilenler].sort()).toEqual(['Kırmızı', 'Kırmızı', 'Kırmızı', 'Mavi', 'Mavi']);
    expect(d().tablo.satirlar.length).toBe(5);
    for (let i = 0; i < 6; i++) {
      motor.tekAtis(a());
      saat.bitir();
    }
    expect(olay.bildirim[olay.bildirim.length - 1]).toBe('Torba boşaldı: bu deneyde 5 top çekilebildi.');
  });

  it('dokunuşla tek atışlar bir çalışmada birikir; sonraki deneyde Deney sütunu eklenir', () => {
    const { motor, saat, d, a } = motorKur(uygula('para'));
    for (let i = 0; i < 3; i++) {
      motor.tekAtis(a());
      saat.bitir();
    }
    expect(a().deney.calismalar).toMatchObject([{ no: 1, etiket: '1. deney (3)', n: 3 }]);
    motor.kos(a(), 20);
    saat.bitir();
    const t = d().tablo;
    expect(t.sutunlar.map((s) => s.ad)).toEqual(['Para', 'Deney']);
    expect(t.satirlar.slice(0, 3).every((r) => r.hucreler[1] === '1. deney (3)')).toBe(true);
    expect(t.satirlar.slice(3).every((r) => r.hucreler[1] === '2. deney (20)')).toBe(true);
  });

  it('sökülünce çalışma kapanır, akış kapanır', () => {
    const { motor, saat, olay, a } = motorKur(uygula('para', (x) => ({ ...x, deney: { ...x.deney, atisSayisi: 100 } })));
    motor.kos(a(), 100);
    saat.ilerle(3000);
    motor.sok();
    expect(olay.veri[olay.veri.length - 1]).toEqual({ calismaBitir: 1 });
    expect(olay.akis[olay.akis.length - 1] ?? false).toBe(false);
    expect(motor.calisiyor).toBe(false);
  });

  it('anında kısım birkaç büyük parçada yazılır; tabloya yazılmayan deney tek çağrıyla', () => {
    expect(anindaParcasi(90, false)).toBe(15);
    expect(anindaParcasi(200, true)).toBe(40);
    expect(anindaParcasi(10, true)).toBe(8);
    const { motor, saat, olay, a } = motorKur(uygula('para'));
    motor.kos(a(), 1000);
    saat.bitir();
    expect(olay.veri.filter((v) => v.ekle).length).toBe(1);
    expect(olay.veri.find((v) => v.ekle)?.ekle).toHaveLength(1000);
  });

  it('tamamlandı duyurusu', () => {
    const para = (hazirSoruUygula('para') as Arastirma).deney;
    expect(tamamlandiDuyurusu(para, 20, 11)).toBe('20 atış tamamlandı: Tura 11, yüzde 55');
    const iki = (hazirSoruUygula('iki-zar') as Arastirma).deney;
    expect(tamamlandiDuyurusu(iki, 100, 17)).toBe('100 atış tamamlandı: toplam 7 17, yüzde 17');
  });
});

describe('Veri topla paneli (SSR)', () => {
  it('başlangıç: 18 hazır soru, üç grup, "Kendi sorunu yaz"; adım yolu yok', () => {
    const m = html(<VeriToplaPaneli {...panelProps(baslangicDurumu())} />);
    expect(m).toContain('data-veri-topla-paneli=""');
    expect(m).toContain('data-gorunum="baslangic"');
    expect(m).toContain('Ne araştıralım?');
    expect(m.match(/data-hazir-soru=/g)?.length).toBe(HAZIR_SORULAR.length);
    expect(m.match(/data-hazir-grubu=/g)?.length).toBe(3);
    expect(m).toContain('Kendi sorunu yaz');
    expect(m).toContain('aria-label="Veri toplama panelini kapat"');
    expect(m).not.toContain('Araştırma adımları');
    expect(m).not.toContain('data-son-arastirma');
    temiz(m);
  });

  it('başlangıç: bağlı araştırma "Toplamaya dön", bağsız eski araştırma "Bu planla yeniden başla"', () => {
    const d = anketDurumu(['Elma', 'Muz']);
    const a = d.arastirma as Arastirma;
    const m = html(<VeriToplaPaneli {...panelProps({ ...d, arastirma: { ...a, adim: 'soru' } })} />);
    expect(m).toContain('data-son-arastirma="bagli"');
    expect(m).toContain('Toplamaya dön');
    expect(m).toContain('2 cevap');
    expect(m).toContain('aria-pressed="true"');
    // Değiştirilmemiş hazır plan: ayrı "Son araştırma" kartı yinelenmez, hazır kart "Son" işaretli
    const b = html(<VeriToplaPaneli {...panelProps({ ...baslangicDurumu(), arastirma: a })} />);
    expect(b).not.toContain('data-son-arastirma=');
    expect(b).toMatch(/data-hazir-soru="meyve" data-son=""/);
    expect(b).toContain('>Son</span>');
    // Plan değiştirildiyse (seçenekler) ayrı kart ve "Bu planla yeniden başla"
    const degisik = { ...a, anket: { ...a.anket, secenekler: ['Elma', 'Muz', 'Kivi'] } };
    const c = html(<VeriToplaPaneli {...panelProps({ ...baslangicDurumu(), arastirma: degisik })} />);
    expect(c).toContain('data-son-arastirma="bagsiz"');
    expect(c).toContain('Bu planla yeniden başla');
    expect(c).not.toContain('data-son=""');
  });

  it('Topla · anket: görev metni, ‹ ve [i], kutucuklar, alt çubuk; rozet ve adım yolu yok', () => {
    const d = anketDurumu(['Elma', 'Muz', 'Elma']);
    const m = html(<VeriToplaPaneli {...panelProps(d)} />);
    expect(m).toContain('data-gorunum="topla"');
    expect(m).toContain('data-yontem="anket"');
    expect(m).toContain('data-gorev-metni=""');
    expect(m).toContain('Sınıfımızda en çok sevilen meyve hangisi?');
    expect(m).toContain('aria-label="Başlangıca dön: Ne araştıralım?"');
    expect(m).toContain('aria-label="Öğretmen kartı"');
    expect(m).toContain('aria-expanded="false"');
    expect(m.match(/data-secenek="/g)?.length).toBe(5);
    expect(m).toContain('data-secenek-ekle=""');
    expect(m).toContain('aria-label="Elma: 2 cevap. Bir cevap ekle"');
    expect(m).toContain('3 cevap');
    expect(m).toContain('aria-label="Son cevabı geri al"');
    expect(m).toContain('data-bitti=""');
    expect(m).not.toContain('data-ogretmen-karti');
    expect(m).not.toContain('MAT.');
    expect(m).not.toContain('Araştırma adımları');
    expect(m).not.toContain('data-soru-seridi');
    expect(m).toContain('role="status"');
    temiz(m);
  });

  it('Topla · ölçüm: değer girdisi, 14 tuş, birim, ilerleme', () => {
    const d = uygula('nabiz', (a) => ({ ...a, olcum: { ...a.olcum, hedefSayi: 24 } }));
    const d2 = yaz(d, { ekle: olcumSatirlari(d.arastirma as Arastirma, [84, 72]).map((h, i) => ({ kimlik: `o${i}`, hucreler: h })) });
    const m = html(<VeriToplaPaneli {...panelProps(d2)} />);
    expect(m).toContain('data-yontem="olcum"');
    expect(m).toContain('data-olcum-girdisi=""');
    expect(m).toContain('inputMode="decimal"');
    expect(m.match(/data-tus="/g)?.length).toBe(14);
    expect(m).toContain('atım/dk');
    expect(m).toContain('2 / 24 kişi ölçüldü');
    expect(m).toContain('2 ölçüm');
    expect(m).toContain('Listeden ekle');
    temiz(m);
  });

  it('Topla · deney: her nesne Bilgisayar atsın ve Elle kaydet ile hatasız çizilir', () => {
    for (const id of ['para', 'zar', 'iki-zar', 'anket-orneklem', 'torba']) {
      const d = uygula(id);
      const m = html(<VeriToplaPaneli {...panelProps(d)} />);
      expect(m).toContain('data-yontem="deney"');
      expect(m).toContain('data-sahne=');
      expect(m).toContain('data-sayac=');
      expect(m).toContain('data-atis-sayisi=');
      expect(m).toContain('data-seri=""');
      expect(m).toMatch(/\d+ (kez at|kez çevir|top çek)/);
      temiz(m);
      const a = d.arastirma as Arastirma;
      const e = html(<VeriToplaPaneli {...panelProps({ ...d, arastirma: { ...a, deney: { ...a.deney, kayit: 'gercek' } } })} />);
      expect(e).toContain('data-kayit-kipi="gercek"');
      expect(e).toContain(id === 'iki-zar' ? 'data-kutucuklar="iki-zar"' : 'data-kutucuklar=');
      expect(e).not.toContain('data-sahne=');
      temiz(e);
    }
  });

  it('deney: geri atmadan torbada çipler 1…N, gerekçeli; seri düğmesi yok', () => {
    const d = uygula('torba', (x) => ({ ...x, deney: { ...x.deney, atisSayisi: 5, torba: { ...x.deney.torba, geriAt: false } } }));
    const m = html(
      <DeneyToplama
        arastirma={d.arastirma as Arastirma}
        tablo={d.tablo}
        calistirici={sahteCalistirici()}
        azaltilmisHareket={false}
        alanGenisligi={386}
        alanYuksekligi={461}
        onArastirma={bos}
        onElle={bos}
      />,
    );
    expect(m.match(/data-atis-cipi=/g)?.length).toBe(5);
    expect(m).toContain('title="Torbada 5 top var: geri atmadan en çok 5 çekiş yapılabilir."');
    expect(m).not.toContain('data-seri=""');
    expect(m).toContain('Çıkanlar');
    expect(m).toContain('Torbada kalan: 3 kırmızı, 2 mavi');
  });

  it('deney: çalışırken Durdur ve ilerleme; eski kayıttaki 500 atış tek deneyde 200 olur (tablo boş kalmaz)', () => {
    const d = uygula('para');
    const a = d.arastirma as Arastirma;
    const m = html(
      <DeneyToplama
        arastirma={a}
        tablo={d.tablo}
        calistirici={sahteCalistirici({ calisiyor: true, tur: 'kosu', no: 2, hedef: 50, yapilan: 27, butce: 'İlk 10 atış görünür, kalanı hızlı' })}
        azaltilmisHareket={false}
        alanGenisligi={386}
        alanYuksekligi={461}
        onArastirma={bos}
        onElle={bos}
      />,
    );
    expect(m).toContain('Durdur · 27 / 50');
    expect(m).toContain('İlk 10 atış görünür, kalanı hızlı');
    const k = html(
      <DeneyToplama
        arastirma={{ ...a, deney: { ...a.deney, atisSayisi: 500 } }}
        tablo={d.tablo}
        calistirici={sahteCalistirici()}
        azaltilmisHareket={false}
        alanGenisligi={386}
        alanYuksekligi={461}
        onArastirma={bos}
        onElle={bos}
      />,
    );
    expect(k).not.toContain('yalnız Deney özetine yazılır');
    expect(k).toContain('200 kez at');
    expect(k).toContain('data-atis-sayisi="200"');
    expect(k.match(/data-atis-cipi=/g)?.length).toBe(6);
    expect(k).not.toContain('data-atis-cipi="500"');
    expect(k).not.toContain('data-atis-cipi="2000"');
  });

  it('form: her yöntem ve nesne çizilir; sorunlu planda düğme pasif ve gerekçeli', () => {
    const taslaklar: Arastirma[] = [
      { ...varsayilanArastirma(), adim: 'plan', yontem: 'anket' },
      { ...varsayilanArastirma(), adim: 'plan', yontem: 'olcum' },
      ...(['para', 'zar', 'iki-zar', 'cark', 'torba'] as const).map((n) => {
        const a = varsayilanArastirma();
        return { ...a, adim: 'plan' as const, yontem: 'deney' as const, deney: { ...a.deney, nesne: n } };
      }),
    ];
    for (const t of taslaklar) {
      const m = html(<PlanAdimi taslak={t} onTaslak={bos} onGeri={bos} onUygula={bos} devam={false} uyari={null} tablo={baslangicDurumu().tablo} bagliArastirma={null} genislik={410} />);
      expect(m).toContain('data-adim="plan"');
      expect(m).toContain('ARAŞTIRMA SORUMUZ');
      expect(m).toContain('data-plan-onizleme=""');
      temiz(m);
    }
    const anket = html(<PlanAdimi taslak={taslaklar[0]} onTaslak={bos} onGeri={bos} onUygula={bos} devam={false} uyari="Başlayınca yeni tablo açılır." tablo={baslangicDurumu().tablo} bagliArastirma={null} genislik={320} />);
    expect(anket).toContain('En az iki seçenek yazın.');
    expect(anket).toMatch(/disabled=""[^>]*data-toplamaya-basla/);
    expect(anket).toContain('placeholder="Ör. Meyve"');
    expect(anket).toContain('placeholder="1. seçenek"');
    expect(anket).toContain('Başlayınca yeni tablo açılır.');
    const cark = html(<PlanAdimi taslak={taslaklar[5]} onTaslak={bos} onGeri={bos} onUygula={bos} devam={false} uyari={null} tablo={baslangicDurumu().tablo} bagliArastirma={null} genislik={410} />);
    expect(cark).toContain('data-nesne-duzenleyici="cark"');
    expect(cark).toContain('Toplamaya başla');
    const devam = html(<PlanAdimi taslak={{ ...(anketDurumu(['Elma']).arastirma as Arastirma), adim: 'plan' }} onTaslak={bos} onGeri={bos} onUygula={bos} devam uyari={null} tablo={anketDurumu(['Elma']).tablo} bagliArastirma={anketDurumu(['Elma']).arastirma} genislik={410} />);
    expect(devam).toContain('Toplamaya devam et');
    expect(devam).toContain('Planı değiştir');
  });

  it('nesne düzenleyici: torba özeti ve çark toplam uyarısı', () => {
    const t = html(<TorbaDuzenleyici torba={{ toplar: [{ etiket: 'Kırmızı', adet: 3 }, { etiket: 'Mavi', adet: 2 }], geriAt: true }} onTorba={bos} />);
    expect(t).toContain('Torbada 5 top: 3 kırmızı, 2 mavi');
    expect(t).toContain('Çekilen topu torbaya geri at');
    temiz(t);
    const c = html(<CarkDuzenleyici cark={{ degiskenAdi: 'Cevap', dilimler: [{ etiket: 'Evet', yuzde: 60 }, { etiket: 'Hayır', yuzde: 30 }] }} onCark={bos} />);
    expect(c).toContain('Toplam %90: yüzdeler orantılı olarak düzeltilir.');
    expect(c).toContain('Eşit böl');
    temiz(c);
  });

  it('öğretmen kartı: Etkinlik (deneyde MAT.7.7.1 · 8.7.1), Düzenle, Yorumla; cümleler kapalı', () => {
    const d = uygula('para');
    const kart = (bolum: OgretmenBolumu, dd: Durum = d) =>
      html(
        <OgretmenKarti
          arastirma={dd.arastirma as Arastirma}
          tablo={dd.tablo}
          bolum={bolum}
          onBolum={bos}
          onKapat={bos}
          onArastirma={bos}
          onTabloIslemi={bos}
          onSatirGoster={bos}
          onSekme={bos}
          onOzeteGec={bos}
          onPlaniDegistir={bos}
          onYeniArastirma={bos}
        />,
      );
    const e = kart('etkinlik');
    expect(e).toContain('data-ogretmen-karti=""');
    expect(e).toContain('MAT.7.7.1 · 8.7.1');
    expect(e).toContain('ÖNCE TAHMİN EDİN');
    expect(e).toContain('ÖĞRETMEN NOTU');
    expect(e.match(/role="tab"/g)?.length).toBe(3);
    expect(e).toContain('Planı değiştir');
    expect(e).toContain('Yeni araştırma');
    temiz(e);
    const z = kart('duzenle');
    expect(z).toContain('data-siklik-tablosu=""');
    expect(z).toContain('ATIŞ SAYISI ARTINCA NE OLUR?');
    expect(z).toContain('data-deney-ozeti=""');
    temiz(z);
    const y = kart('yorum', anketDurumu(['Elma', 'Muz', 'Elma']));
    expect(y).toContain('Cümleleri göster');
    expect(y).not.toContain('data-yorum-cumleleri');
    expect(y).not.toContain('En çok seçilen');
    expect(y).toContain('data-uygun="false"');
    expect(y).toContain('TARTIŞALIM');
    expect(y).toContain('SONUCUMUZ');
    temiz(y);
  });

  it('düzenle: seçenek dışı yazım birleştirme ve ötekilerden çok uzak değer', () => {
    let d = anketDurumu(['Elma']);
    d = yaz(d, { ekle: [{ kimlik: 'z1', hucreler: ['elma'] }] });
    const m = html(<DuzenleAdimi arastirma={d.arastirma as Arastirma} tablo={d.tablo} onArastirma={bos} onTabloIslemi={bos} onSatirGoster={bos} onOzeteGec={bos} />);
    expect(m).toContain('Tabloda seçenek dışı yazım: “elma” (1 satır).');
    expect(m).toContain('Elma ile birleştir');
    temiz(m);
    const n = uygula('boy');
    const n2 = yaz(n, { ekle: olcumSatirlari(n.arastirma as Arastirma, [150, 152, 148, 151, 149, 153, 250]).map((h, i) => ({ kimlik: `b${i}`, hucreler: h })) });
    const o = html(<DuzenleAdimi arastirma={n2.arastirma as Arastirma} tablo={n2.tablo} onArastirma={bos} onTabloIslemi={bos} onSatirGoster={bos} onOzeteGec={bos} />);
    expect(o).toContain('SIRALI DEĞERLER');
    expect(o).toContain('250 cm ötekilerden çok uzak');
    expect(o).toContain('Açıklık 102 cm');
    temiz(o);
  });

  it('yorumla: öneriler sekmeyi vurgular; özet önerisi en az iki deneyde', () => {
    const d = anketDurumu(['Elma']);
    const m = html(<YorumAdimi arastirma={d.arastirma as Arastirma} tablo={d.tablo} sekme="sutun" onSekme={bos} onOzeteGec={bos} onArastirma={bos} />);
    expect(m).toMatch(/aria-pressed="true"[^>]*data-grafik-onerisi="sutun"/);
    const { motor, saat, d: dd, a } = motorKur(uygula('para'));
    motor.kos(a(), 20);
    saat.bitir();
    motor.kos(a(), 20);
    saat.bitir();
    const o = html(<YorumAdimi arastirma={a()} tablo={dd().tablo} onSekme={bos} onOzeteGec={bos} onArastirma={bos} />);
    expect(o).toContain('Çizgi grafiği · Deney özeti');
  });

  it('ölçüm girişi: alçak alanda kompakt (ileti "Eklendi" satırında); birim kutunun içinde; liste kipinde tek değer kutusu yok', () => {
    const d = uygula('nabiz');
    const normal = html(<OlcumGirisi arastirma={d.arastirma as Arastirma} tablo={d.tablo} onEkle={bos} onGrupSec={bos} alanYuksekligi={461} />);
    expect(normal.match(/data-olcum-iletisi=""/g)?.length).toBe(1);
    expect(normal).toContain('data-olcum-degeri=""');
    expect(normal).toMatch(/data-olcum-degeri=""[^]*atım\/dk<\/span><\/div>/);
    const kompakt = html(<OlcumGirisi arastirma={d.arastirma as Arastirma} tablo={d.tablo} onEkle={bos} onGrupSec={bos} alanYuksekligi={323} />);
    // Kompakt: ileti ayrı satırda değil, "Eklendi" satırında (data-eklendi ile aynı öğe)
    expect(kompakt).toMatch(/data-eklendi="" data-olcum-iletisi=""/);
    expect(kompakt).toContain('h-12');
    expect(kompakt).toContain('Listeden ekle');
  });

  it('deney · Elle kaydet: "GERÇEK ATIŞLAR · N" başlığı; bilgisayar atışları ayrıca söylenir; seçim çipleri select değil', () => {
    const d = uygula('para');
    const pa = d.arastirma as Arastirma;
    const elle: Arastirma = {
      ...pa,
      deney: { ...pa.deney, kayit: 'gercek', calismalar: [{ no: 1, etiket: '1. deney (20)', n: 20, sayilar: { Tura: 9, Yazı: 11 }, tabloda: false, gercek: false }] },
    };
    const m = html(
      <DeneyToplama
        arastirma={elle}
        tablo={d.tablo}
        calistirici={sahteCalistirici()}
        azaltilmisHareket={false}
        alanGenisligi={386}
        alanYuksekligi={461}
        onArastirma={bos}
        onElle={bos}
      />,
    );
    expect(m).toContain('data-gercek-basligi=""');
    expect(m).toMatch(/GERÇEK ATIŞLAR · <span[^>]*>0<\/span>/);
    expect(m).toMatch(/bilgisayar: (<!-- -->)?20</);
    // İki küp, alçak alan (1147 × 598): tuşlar 48 px'in altına inmez, ipucu satırı düşer
    const iki = uygula('iki-zar', (a) => ({ ...a, deney: { ...a.deney, kayit: 'gercek' } }));
    const k = html(
      <DeneyToplama
        arastirma={iki.arastirma as Arastirma}
        tablo={iki.tablo}
        calistirici={sahteCalistirici()}
        azaltilmisHareket={false}
        alanGenisligi={320}
        alanYuksekligi={371}
        onArastirma={bos}
        onElle={bos}
      />,
    );
    expect(k).not.toContain('İki küpü de seçince satır eklenir.</p>');
    expect(k).toContain('min-h-[72px]');
    for (const h of [...k.matchAll(/height:(\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]))) expect(h).toBeGreaterThanOrEqual(44);
    expect(m + k).not.toContain('<select');
  });

  it('ölçüm girişi: gruplu ve adlı; yazı boyları ≥ 12 px', () => {
    const d = uygula('boy', (a) => ({ ...a, olcum: { ...a.olcum, adYaz: true, grup: { ad: 'Sınıf', secenekler: ['7-A', '7-B'], etkin: 0 } } }));
    const m = html(<OlcumGirisi arastirma={d.arastirma as Arastirma} tablo={d.tablo} onEkle={bos} onGrupSec={bos} alanYuksekligi={461} />);
    expect(m).toContain('Ad (isteğe bağlı)');
    expect(m).toContain('ÖLÇÜLEN');
    expect(m).toContain('data-grup="7-A"');
    const hepsi = [
      m,
      html(<VeriToplaPaneli {...panelProps(anketDurumu(['Elma']))} />),
      html(<VeriToplaPaneli {...panelProps(uygula('iki-zar'))} />),
      html(<VeriToplaPaneli {...panelProps(baslangicDurumu())} />),
    ].join('');
    for (const b of yaziBoylari(hepsi)) expect(b).toBeGreaterThanOrEqual(12);
  });
});
