import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import VeriGrafikUygulamasi, { DEPO_ANAHTARI, UC_SUTUN_ESIGI, manifest, yerlesimModu } from '../index';
import { NoktaGrafigi } from '../NoktaGrafigi';
import { SutunGrafigi, payliEksen } from '../SutunGrafigi';
import { CizgiGrafigi, degisimEtiketi } from '../CizgiGrafigi';
import { DaireGrafigi } from '../DaireGrafigi';
import { IstatistikPaneli } from '../IstatistikPaneli';
import { KategorikIstatistik, KategorikSutunGrafigi, frekansTablosu, kategorikFrekanslar } from '../KategorikGrafikler';
import { VeriTablosu, sutunEnKucukGenisligi, tabloDogalGenisligi } from '../VeriTablosu';
import { SacilimGrafigi, payliGuzelEksen } from '../SacilimGrafigi';
import { ON_AYARLAR, sonucEkle } from '../ornekleyici';
import { caprazSayim, degiskenSutunlari, kategoriSayilari, renkEslemesi, renkGruplari, satirRengi } from '../kategorik';
import { ORNEK_VERILER, ornekVeriOlustur, sayiOku, sayiYaz, sayisalSutunlar, tabloOlustur, type VeriTablosu as Tablo } from '../veri';

const bos = () => undefined;

describe('Veri ve Grafik uygulaması (sunucu tarafı akıllı çizim)', () => {
  it('manifest sözleşmeye uyar', () => {
    expect(manifest.id).toBe('veri-grafik');
    expect(manifest.ad).toBe('Veri ve Grafik');
    expect(manifest.kisaAd).toBe('Veri ve Grafik');
    expect(manifest.renk).toBe('#216a78');
    expect(React.isValidElement(manifest.simge)).toBe(true);
    expect(DEPO_ANAHTARI).toBe('geoeba_veri-grafik_v1');
  });

  it('yerleşim: örnekleyici açıkken geniş pencerede üç sütun, dar pencerede kayan şerit', () => {
    expect(yerlesimModu(1366, true)).toBe('uc-sutun');
    expect(yerlesimModu(UC_SUTUN_ESIGI, true)).toBe('uc-sutun');
    expect(yerlesimModu(UC_SUTUN_ESIGI - 1, true)).toBe('dikey-kaydir');
    expect(yerlesimModu(900, true)).toBe('dikey-kaydir');
    expect(yerlesimModu(900, false)).toBe('iki-sutun');
    expect(yerlesimModu(719, false)).toBe('dikey');
  });

  it('uygulama kökü sekmeler ve tabloyla çizilir', () => {
    const html = renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1000} />);
    expect(html).toContain('data-uygulama="veri-grafik"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Örnek veri');
    expect(html).toContain('Boy (cm)');
    expect(html).toContain('Ayşe');
    // Sade kabuk: tek "İndir" menüsü, "Temizle" tablonun altında, deney verisi yokken küme seçici yok,
    // değişken grafiğin üstündeki sekmelerle seçilir (ayrıca "Eksen" açılır listesi yok)
    expect(html).toContain('İndir');
    expect(html).toContain('Temizle');
    expect(html).not.toContain('aria-label="Veri kümesi"');
    // Değişken seçimi grafiğin üstündeki sekmelerde (üst şeritte çip yok)
    expect(html).toContain('aria-label="Grafikteki değişken"');
    expect(html).not.toContain('aria-label="Grafikte gösterilen değişken"');
    expect(html).not.toContain('aria-label="Eksene atanacak değişken"');
    expect(html).toContain('aria-label="Grafik seçenekleri"');
    // Eksen açılışta seçili gelir: "Boy (cm)" sekmesi seçili
    expect(html).toMatch(/aria-selected="true" aria-controls="vg-grafik-alani"[^>]*title="Boy \(cm\) \(sayısal\)"/);
    // Veri türüne göre: tek sayısal değişkenli tabloda saçılım sekmesi pasif ve nedeni ipucunda
    expect(html).toMatch(/aria-disabled="true"[^>]*title="Saçılım grafiği iki sayısal değişken/);
    expect(html).toContain('>Saçılım<');
    // Tabloda "+ Satır" düğmesi yok; altta yazmaya hazır boş satır var
    expect(html).toContain('data-bos-satir');
    expect(html).toContain('aria-label="Yeni satır, Boy (cm)"');
    expect(html).not.toMatch(/<\/span> Satır<\/button>/);
  });

  it('tablo: boş tabloda da yazmaya hazır yeni satır çizilir ve sayılara girmez', () => {
    const bosTablo = tabloOlustur(['Öğrenci', 'Boy (cm)'], []);
    const html = renderToStaticMarkup(<VeriTablosu tablo={bosTablo} seciliSatir={null} onSatirSec={bos} onTablo={bos} onTemizle={bos} />);
    expect(html).toContain('Tablo boş: alttaki satıra yazın');
    expect(html).toContain('data-hucre="0-0"');
    expect(html).toContain('placeholder="Yeni satır…"');
    expect(html).toContain('0 satır · 1 değişken');
  });

  it('nokta grafiği: atanmamışken dağınık, atanınca eksen işaretleri ve ortalama etiketi', () => {
    const tablo = ornekVeriOlustur('mac');
    const ortak = {
      tablo,
      seciliSatir: 0,
      onSatirSec: bos,
      onDegiskenBirak: bos,
      aralik: 1,
      sutunModu: false,
      genislik: 600,
      yukseklik: 300,
      azaltilmisHareket: true,
      surukleniyor: false,
    };
    const dagitik = renderToStaticMarkup(
      <NoktaGrafigi {...ortak} sutun={-1} secenekler={{ ortalama: false, oms: false, etiketler: false }} />,
    );
    expect(dagitik).toContain('Tabloda değişken yok');
    const atanmis = renderToStaticMarkup(
      <NoktaGrafigi {...ortak} sutun={1} secenekler={{ ortalama: true, oms: true, etiketler: true }} />,
    );
    expect(atanmis).toContain('x̄ = 17');
    expect(atanmis).toContain('OMS = 6,4');
    expect(atanmis).toContain('aria-label="1. maç: 18"');
    const sutunlu = renderToStaticMarkup(
      <NoktaGrafigi {...ortak} sutun={1} sutunModu secenekler={{ ortalama: false, oms: false, etiketler: false }} />,
    );
    expect(sutunlu).toContain('scaleY(');
  });

  it('nokta grafiği: değeri olmayan satırlar hayalet nokta yerine köşe notu; yoğun yığında yığın başına sayı', () => {
    const ortak = {
      seciliSatir: null,
      onSatirSec: bos,
      onDegiskenBirak: bos,
      aralik: 1,
      sutunModu: false,
      genislik: 600,
      yukseklik: 300,
      azaltilmisHareket: true,
      surukleniyor: false,
    };
    // 2 satırın 2. sütunda değeri yok: nokta çizilmez, "2 satırda değer yok" notu düşer
    const eksikli = tabloOlustur(['Ad', 'Puan'], [['A', 3], ['B', ''], ['C', 4], ['D', '']]);
    const html = renderToStaticMarkup(<NoktaGrafigi {...ortak} tablo={eksikli} sutun={1} secenekler={{ ortalama: false, oms: false, etiketler: true }} />);
    expect(html).toContain('2 satırda değer yok');
    expect(html).not.toContain('aria-label="B"');
    expect(html).toContain('aria-label="A: 3"');
    // Değişken atanmamışken bütün satırlar dağınık durur, not yok
    const dagitik = renderToStaticMarkup(<NoktaGrafigi {...ortak} tablo={eksikli} sutun={-1} secenekler={{ ortalama: false, oms: false, etiketler: false }} />);
    expect(dagitik).toContain('aria-label="B"');
    expect(dagitik).not.toContain('satırda değer yok');
    // 600 ölçüm üç değere yığılır: küçücük noktalara tek tek etiket değil, yığın başına sayı yazılır; sapma çizgileri çizilmez
    const yogun = tabloOlustur(['Tekrar', 'Sayı'], Array.from({ length: 600 }, (_, i) => [String(i + 1), i % 3]));
    const yogunHtml = renderToStaticMarkup(<NoktaGrafigi {...ortak} tablo={yogun} sutun={1} secenekler={{ ortalama: true, oms: true, etiketler: true }} />);
    expect(yogunHtml.match(/data-yigin-sayisi/g)).toHaveLength(3);
    expect(yogunHtml).toContain('>200<');
    expect(yogunHtml).not.toContain('sapma-0');
  });

  it('sütun, çizgi ve daire grafikleri hatalı hücreyle bile çökmeden çizilir', () => {
    const tablo = tabloOlustur(['Ay', 'Sıcaklık', 'Nem'], [['Ocak', 4.5, 60], ['Şubat', 'hata', 55], ['Mart', 8.5, '']]);
    const ortak = { tablo, seciliSatir: 1, onSatirSec: bos, genislik: 640, yukseklik: 320, azaltilmisHareket: true };
    const sutun = renderToStaticMarkup(<SutunGrafigi {...ortak} sutun={1} onDegerDegis={bos} yuvarlamaAdimi={0.5} />);
    expect(sutun).toContain('role="slider"');
    expect(sutun).toContain('8,5');
    const cizgi = renderToStaticMarkup(<CizgiGrafigi {...ortak} onDegerDegis={bos} yuvarlamaAdimi={1} />);
    expect(cizgi).toContain('Δ');
    expect(cizgi).toContain('Nem');
    const daire = renderToStaticMarkup(<DaireGrafigi {...ortak} sutun={2} onDegerlerDegis={bos} />);
    expect(daire).toContain('°');
    expect(daire).toMatch(/%\d/); // yüzde biçimi her yerde '%13' (boşluksuz)
    expect(daire).not.toContain('% ');
  });

  it('istatistik paneli adımları gösterir', () => {
    const html = renderToStaticMarkup(
      <IstatistikPaneli tablo={ornekVeriOlustur('mac')} sutun={1} seciliSatir={null} onSatirSec={bos} adimlariGoster onAdimlariGoster={bos} />,
    );
    expect(html).toContain('Aritmetik ortalama');
    expect(html).toContain('85');
    expect(html).toContain('6,4');
    expect(html).toContain('|18 − 17| = 1');
  });

  it('bütün örnek verilerde her grafik NaN / undefined / Infinity yazmadan çizilir', () => {
    const ortak = { seciliSatir: null, onSatirSec: bos, genislik: 640, yukseklik: 360, azaltilmisHareket: true };
    for (const o of ORNEK_VERILER) {
      const tablo = ornekVeriOlustur(o.id);
      const sayisal = sayisalSutunlar(tablo);
      const degiskenler = degiskenSutunlari(tablo);
      const ciktilar: string[] = [];
      for (const s of degiskenler) {
        const sutun = tablo.sutunlar.findIndex((x) => x.id === s.id);
        ciktilar.push(
          renderToStaticMarkup(
            <NoktaGrafigi {...ortak} tablo={tablo} sutun={sutun} onDegiskenBirak={bos} aralik={1} sutunModu={false} surukleniyor={false} secenekler={{ ortalama: true, oms: true, etiketler: true }} />,
          ),
          renderToStaticMarkup(
            <NoktaGrafigi {...ortak} tablo={tablo} sutun={sutun} onDegiskenBirak={bos} aralik={1} sutunModu surukleniyor={false} secenekler={{ ortalama: false, oms: false, etiketler: false }} />,
          ),
        );
        if (s.tur === 'sayi') {
          ciktilar.push(
            renderToStaticMarkup(<SutunGrafigi {...ortak} tablo={tablo} sutun={sutun} onDegerDegis={bos} yuvarlamaAdimi={1} />),
            renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={tablo} sutun={sutun} onDegerlerDegis={bos} />),
            renderToStaticMarkup(<IstatistikPaneli tablo={tablo} sutun={sutun} seciliSatir={null} onSatirSec={bos} adimlariGoster onAdimlariGoster={bos} />),
          );
        } else {
          ciktilar.push(renderToStaticMarkup(<KategorikSutunGrafigi tablo={tablo} sutun={sutun} genislik={640} yukseklik={360} azaltilmisHareket />));
        }
      }
      if (sayisal.length > 0) ciktilar.push(renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={tablo} onDegerDegis={bos} yuvarlamaAdimi={1} />));
      for (const html of ciktilar) {
        expect(html, o.id).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('nokta grafiği: gruplama yokken tam değer, gruplamada kuşaklar ve "grup genişliği" notu', () => {
    const sicaklik = ornekVeriOlustur('sicaklik');
    const ortak = {
      tablo: sicaklik,
      sutun: 1,
      seciliSatir: null,
      onSatirSec: bos,
      onDegiskenBirak: bos,
      sutunModu: false,
      genislik: 700,
      yukseklik: 320,
      azaltilmisHareket: true,
      surukleniyor: false,
      secenekler: { ortalama: false, oms: false, etiketler: false },
    };
    const tam = renderToStaticMarkup(<NoktaGrafigi {...ortak} aralik={0.5} />);
    expect(tam).not.toContain('data-gruplar');
    expect(tam).not.toContain('grup genişliği');
    const gruplu = renderToStaticMarkup(<NoktaGrafigi {...ortak} aralik={2} />);
    expect(gruplu).toContain('data-gruplar');
    expect(gruplu).toContain('grup genişliği 2');
  });

  it('çizgi grafiği yalnız istenen sütunları çizer; daire grafiği negatif değeri açıkça reddeder', () => {
    const mac = ornekVeriOlustur('mac');
    const ortak = { tablo: mac, seciliSatir: null, onSatirSec: bos, genislik: 640, yukseklik: 320, azaltilmisHareket: true };
    const tek = renderToStaticMarkup(<CizgiGrafigi {...ortak} sutunlar={[1]} onDegerDegis={bos} yuvarlamaAdimi={1} />);
    expect(tek).toContain('Selma');
    expect(tek).not.toContain('Yasemin');
    const iki = renderToStaticMarkup(<CizgiGrafigi {...ortak} sutunlar={[1, 2]} onDegerDegis={bos} yuvarlamaAdimi={1} />);
    expect(iki).toContain('Yasemin');
    const eksi = tabloOlustur(['Ay', 'Sıcaklık'], [['Ocak', -3], ['Şubat', 2], ['Mart', 7]]);
    const daire = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={eksi} sutun={1} onDegerlerDegis={bos} />);
    expect(daire).toContain('negatif değer gösteremez');
    expect(daire).toMatch(/Ocak: [-−]3/);
    expect(daire).not.toContain('<path');
  });

  it('deney tablosu: satır numarasının aynısı olan "Çekiliş" sütunu gösterilmez (veride kalır)', () => {
    const para = ON_AYARLAR[0].olustur();
    const deney = sonucEkle(null, para, [['Yazı'], ['Tura']]);
    expect(deney.sutunlar[0].ad).toBe('Çekiliş');
    const html = renderToStaticMarkup(<VeriTablosu tablo={deney} seciliSatir={null} onSatirSec={bos} onTablo={bos} />);
    expect(html).not.toContain('Sütun adı: Çekiliş');
    expect(html).toContain('Sütun adı: Sonuç');
    expect(html).toContain('placeholder="Yeni satır…"');
    expect(html).toContain('2 satır · 1 değişken');
  });

  it('saçılım grafiği: her satır bir (x; y) noktası, eksen adları ve eksik değer notu', () => {
    const mac = ornekVeriOlustur('mac');
    const ortak = { seciliSatir: null, onSatirSec: bos, genislik: 640, yukseklik: 360, azaltilmisHareket: true };
    const html = renderToStaticMarkup(<SacilimGrafigi {...ortak} tablo={mac} xSutun={1} ySutun={2} />);
    expect(html).toContain('data-grafik="sacilim"');
    expect(html).toContain('↑ Yasemin');
    expect(html).toContain('Selma →');
    expect(html.match(/role="button"/g)).toHaveLength(5);
    expect(html).toContain('aria-label="1. maç: Selma 18, Yasemin 17"');
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
    const eksik = tabloOlustur(['Ad', 'Boy', 'Kilo'], [['A', 150, 40], ['B', 160, ''], ['C', 155, 48]]);
    const html2 = renderToStaticMarkup(<SacilimGrafigi {...ortak} tablo={eksik} xSutun={1} ySutun={2} />);
    expect(html2.match(/role="button"/g)).toHaveLength(2);
    expect(html2).toContain('1 satırda değer eksik');
    // Tam sayı verisinde eksen adımı en az 1 (15, 16 … ara değer yok); ondalık veride güzel adım kalır
    const tam = payliGuzelEksen([15, 18, 16, 17, 19], 6);
    expect(tam.adim).toBe(1);
    expect(tam.isaretler.every((v) => Number.isInteger(v))).toBe(true);
    expect(payliGuzelEksen([4.5, 5.5, 6.25], 6).adim).toBeLessThan(1);
  });

  it('kategorik örnek veri: tek sütunlu tabloda değişken sayısı doğru', () => {
    const meyve = ornekVeriOlustur('meyve');
    const html = renderToStaticMarkup(<VeriTablosu tablo={meyve} seciliSatir={null} onSatirSec={bos} onTablo={bos} />);
    expect(html).toContain('24 satır · 1 değişken');
    const gun = ornekVeriOlustur('gun');
    const toplam = gun.satirlar.reduce((t, r) => t + Number(r.hucreler[1].replace(',', '.')), 0);
    expect(toplam).toBe(24);
  });

  it('yardımcılar: değişim etiketi ve paylı eksen', () => {
    expect(degisimEtiketi(20, 25)).toBe('Δ +5 (+25 %)');
    expect(degisimEtiketi(20, 15)).toBe('Δ −5 (−25 %)');
    expect(degisimEtiketi(0, 3)).toBe('Δ +3');
    const e = payliEksen(0, 35, 6);
    expect(e.max).toBeGreaterThan(35);
    expect(e.min).toBe(0);
  });
});

describe('tablo sütun başlığı genişliği', () => {
  it('adı sığacak kadar geniş (sayısal sütunda sil düğmesi dahil), 88–260 px arasında', () => {
    expect(sutunEnKucukGenisligi('Ay', false)).toBe(88);
    const uzun = sutunEnKucukGenisligi('A sınıfı ortalaması', true);
    expect(uzun).toBeGreaterThan(19 * 7);
    expect(uzun).toBeLessThanOrEqual(260);
    expect(sutunEnKucukGenisligi('x'.repeat(80), true)).toBe(260);
    // Tablonun doğal genişliği: # + sütunlar + satır sil + kaydırma çubuğu; Çekiliş gibi gizli sütunlar sayılmaz
    const t = ornekVeriOlustur('calisma');
    const beklenen = 44 + t.sutunlar.reduce((s, c) => s + sutunEnKucukGenisligi(c.ad, c.tur === 'sayi'), 0) + 44 + 14;
    expect(tabloDogalGenisligi(t)).toBe(beklenen);
  });
});

describe('renk anahtarı: kategoriye göre renklendirme (bütün grafikler, istatistik, tablo)', () => {
  const t = ornekVeriOlustur('calisma');
  const eslem = renkEslemesi(t, 0)!;
  const dolgular = (html: string, r: string) => new Set(Array.from(html.matchAll(new RegExp(`<circle r="${r}" fill="([^"]+)"`, 'g')), (e) => e[1]));

  it('eşleme: satır → kategori → renk; boş kategori gri', () => {
    expect(eslem.ad).toBe('Sınıf');
    expect(eslem.kategoriler).toEqual(['A', 'B']);
    expect(satirRengi(eslem, 0)).toBe(eslem.renkler.get('A'));
    expect(satirRengi(eslem, 19)).toBe(eslem.renkler.get('B'));
    expect(satirRengi(null, 0)).toBeUndefined();
    expect(kategoriSayilari(eslem)).toEqual(new Map([['A', 10], ['B', 10]]));
  });

  it('saçılım: noktalar iki renkte, lejantta kategori ve sayı; renksizde tek renk ve lejant yok', () => {
    const ortak = { tablo: t, xSutun: 1, ySutun: 2, seciliSatir: null, onSatirSec: bos, genislik: 700, yukseklik: 380, azaltilmisHareket: true };
    const html = renderToStaticMarkup(<SacilimGrafigi {...ortak} renkEslemi={eslem} />);
    expect(html).toContain('data-renk-lejanti');
    expect(html).toContain('Sınıf:');
    expect(html).toContain('A (10)');
    expect(html).toContain('B (10)');
    expect(dolgular(html, '7').size).toBe(2);
    const tek = renderToStaticMarkup(<SacilimGrafigi {...ortak} />);
    expect(tek).not.toContain('data-renk-lejanti');
    expect(dolgular(tek, '7').size).toBe(1);
  });

  it('nokta grafiği: sayısal değişkenin noktaları sınıfa göre renklenir; renk anahtarı eksendeki değişkense lejant yok', () => {
    const ortak = {
      tablo: t,
      seciliSatir: null,
      onSatirSec: bos,
      onDegiskenBirak: bos,
      aralik: 1,
      sutunModu: false,
      genislik: 700,
      yukseklik: 360,
      azaltilmisHareket: true,
      surukleniyor: false,
      secenekler: { ortalama: false, oms: false, etiketler: false },
    };
    const html = renderToStaticMarkup(<NoktaGrafigi {...ortak} sutun={2} renkEslemi={eslem} />);
    expect(html).toContain('data-renk-lejanti');
    expect(html).toContain('A (10)');
    const renkler = new Set(Array.from(html.matchAll(/<circle r="[\d.]+" fill="(#[0-9a-f]{6})"/gi), (e) => e[1].toLowerCase()));
    expect(renkler.has(eslem.renkler.get('A')!.toLowerCase())).toBe(true);
    expect(renkler.has(eslem.renkler.get('B')!.toLowerCase())).toBe(true);
    const kendisi = renderToStaticMarkup(<NoktaGrafigi {...ortak} sutun={0} renkEslemi={eslem} />);
    expect(kendisi).not.toContain('data-renk-lejanti');
  });

  it('sütun grafiği: her sütun satırının kategori renginde, lejant başlık satırında', () => {
    const html = renderToStaticMarkup(
      <SutunGrafigi tablo={t} sutun={2} seciliSatir={null} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={1} genislik={900} yukseklik={360} azaltilmisHareket renkEslemi={eslem} />,
    );
    expect(html).toContain('data-renk-lejanti');
    const renkler = new Set(Array.from(html.matchAll(/<rect x="0" y="0" width="[\d.]+" height="1" fill="([^"]+)"/g), (e) => e[1]));
    expect(renkler).toEqual(new Set([eslem.renkler.get('A'), eslem.renkler.get('B')]));
  });

  it('tablo: satır numarasının solunda kategori renginde şerit', () => {
    const html = renderToStaticMarkup(
      <VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} satirRengi={(i) => satirRengi(eslem, i)} />,
    );
    expect(html).toContain(`box-shadow:inset 5px 0 0 ${eslem.renkler.get('A')}`);
    expect(html).toContain(`box-shadow:inset 5px 0 0 ${eslem.renkler.get('B')}`);
  });

  it('çizgi grafiği: her kategori kendi renginde ayrı çizgi; ikinci seri kesikli; renksizde tek çizgi', () => {
    const ortak = { tablo: t, seciliSatir: null, onSatirSec: bos, onDegerDegis: bos, yuvarlamaAdimi: 1, genislik: 700, yukseklik: 360, azaltilmisHareket: true };
    const html = renderToStaticMarkup(<CizgiGrafigi {...ortak} sutunlar={[2]} renkEslemi={eslem} />);
    expect(html).toContain('data-renk-lejanti');
    const gruplar = Array.from(html.matchAll(/<path d="([^"]+)" fill="none" stroke="([^"]+)"[^>]*data-cizgi-grubu="([^"]*)"/g), (e) => ({ d: e[1], renk: e[2], ad: e[3] }));
    expect(gruplar.map((g) => g.ad)).toEqual(['A', 'B']);
    expect(gruplar.map((g) => g.renk)).toEqual([eslem.renkler.get('A'), eslem.renkler.get('B')]);
    // A'nın son noktası B'nin ilk noktasına bağlanmaz: her çizgi yalnız kendi 10 satırından geçer
    for (const g of gruplar) expect(g.d.match(/[ML]/g)).toHaveLength(10);
    const noktaRenkleri = Array.from(html.matchAll(/<circle cx="[^"]+" cy="[^"]+" r="5.5" fill="([^"]+)"/g), (e) => e[1]);
    expect(noktaRenkleri.filter((r) => r === eslem.renkler.get('A'))).toHaveLength(10);
    expect(noktaRenkleri.filter((r) => r === eslem.renkler.get('B'))).toHaveLength(10);

    const iki = renderToStaticMarkup(<CizgiGrafigi {...ortak} sutunlar={[1, 2]} renkEslemi={eslem} />);
    expect(iki.match(/data-cizgi-grubu=/g)).toHaveLength(4);
    expect(iki.match(/<path [^>]*stroke-dasharray="7 5"/g)).toHaveLength(2);
    expect(iki.match(/data-seri-ornegi/g)).toHaveLength(2);

    const tek = renderToStaticMarkup(<CizgiGrafigi {...ortak} sutunlar={[2]} />);
    expect(tek).not.toContain('data-renk-lejanti');
    expect(tek).not.toContain('data-cizgi-grubu');
    expect(tek.match(/<path d="M/g)).toHaveLength(1);
  });

  it('daire grafiği: dilimler satırın kategori renginde; lejantta kategorilerin toplamdaki payı', () => {
    const ortak = { tablo: t, sutun: 1, seciliSatir: null, onSatirSec: bos, onDegerlerDegis: bos, genislik: 800, yukseklik: 420, azaltilmisHareket: true };
    const html = renderToStaticMarkup(<DaireGrafigi {...ortak} renkEslemi={eslem} />);
    const dilimler = Array.from(html.matchAll(/<path d="[^"]+" fill="([^"]+)" fill-opacity/g), (e) => e[1]);
    expect(dilimler).toHaveLength(20);
    expect(new Set(dilimler)).toEqual(new Set([eslem.renkler.get('A'), eslem.renkler.get('B')]));
    const toplamlar: Record<string, number> = { A: 0, B: 0 };
    t.satirlar.forEach((r) => (toplamlar[r.hucreler[0]] += sayiOku(r.hucreler[1]) ?? 0));
    const toplam = toplamlar.A + toplamlar.B;
    expect(html).toContain('data-renk-lejanti');
    expect(html).toContain(`A %${sayiYaz((toplamlar.A / toplam) * 100, 1)}`);
    expect(html).toContain(`B %${sayiYaz((toplamlar.B / toplam) * 100, 1)}`);
    expect(renderToStaticMarkup(<DaireGrafigi {...ortak} />)).not.toContain('data-renk-lejanti');
  });

  it('istatistik: gruplara göre özet tablosu (her grup ve tümü); anahtar yoksa tablo yok', () => {
    const ortak = { tablo: t, sutun: 2, seciliSatir: null, onSatirSec: bos, adimlariGoster: true, onAdimlariGoster: bos };
    const html = renderToStaticMarkup(<IstatistikPaneli {...ortak} renkEslemi={eslem} />);
    expect(html).toContain('data-grup-istatistikleri');
    const ortalama = (k: string) => {
      const v = t.satirlar.filter((r) => r.hucreler[0] === k).map((r) => sayiOku(r.hucreler[2]) ?? 0);
      return v.reduce((a, b) => a + b, 0) / v.length;
    };
    for (const k of ['A', 'B']) {
      const bas = html.indexOf(`data-grup="${k}"`);
      expect(bas).toBeGreaterThan(-1);
      expect(html.slice(bas, html.indexOf('</tr>', bas))).toContain(`>${sayiYaz(ortalama(k))}<`);
    }
    expect(html).toContain('Tümü');
    // hesaplama adımlarında her gözlemin yanında grubunun rengi
    expect(html).toContain(`fill="${eslem.renkler.get('B')}"`);
    expect(renderToStaticMarkup(<IstatistikPaneli {...ortak} />)).not.toContain('data-grup-istatistikleri');
  });

  describe('iki kategorik değişken: yığılmış sütun, iki yönlü tablo, daire halkası', () => {
    const tk: Tablo = {
      sutunlar: [
        { id: 'renk', ad: 'Renk', tur: 'etiket' },
        { id: 'sonuc', ad: 'Sonuç', tur: 'etiket' },
      ],
      satirlar: [
        ['Kırmızı', 'Yazı'],
        ['Kırmızı', 'Tura'],
        ['Kırmızı', 'Yazı'],
        ['Mavi', 'Tura'],
        ['Mavi', 'Tura'],
        ['Mavi', ''],
      ].map((hucreler, i) => ({ id: `s${i}`, hucreler })),
    };
    const sonuc = renkEslemesi(tk, 1)!;

    it('çapraz sayım ve renk grupları (anahtarı boş satırlar ayrı)', () => {
      expect(sonuc.kategoriler).toEqual(['Tura', 'Yazı']);
      expect(caprazSayim(tk, 0, sonuc)).toEqual([
        { kategori: 'Kırmızı', toplam: 3, sayilar: [1, 2], bos: 0 },
        { kategori: 'Mavi', toplam: 3, sayilar: [2, 0], bos: 1 },
      ]);
      expect(renkGruplari(sonuc, [0, 1, 2, 3, 4, 5]).map((g) => [g.kategori, g.satirlar])).toEqual([
        ['Tura', [1, 3, 4]],
        ['Yazı', [0, 2]],
        [null, [5]],
      ]);
    });

    it('sütun: anahtar başka değişkense her sütun anahtar kategorilerine göre yığılır', () => {
      const ortak = { tablo: tk, sutun: 0, genislik: 600, yukseklik: 320, azaltilmisHareket: true };
      const html = renderToStaticMarkup(<KategorikSutunGrafigi {...ortak} renkEslemi={sonuc} />);
      expect(html.match(/data-yigin-parcasi=/g)).toHaveLength(4);
      expect(html).toContain('data-yigin-parcasi="(boş)"');
      expect(html).toContain('data-renk-lejanti');
      expect(renderToStaticMarkup(<KategorikSutunGrafigi {...ortak} renkEslemi={renkEslemesi(tk, 0)} />)).not.toContain('data-yigin-parcasi');
    });

    it('istatistik: iki yönlü tablo', () => {
      const html = renderToStaticMarkup(<KategorikIstatistik tablo={tk} sutun={0} renkEslemi={sonuc} />);
      expect(html).toContain('data-capraz-tablo');
      expect(html).toContain('İki yönlü tablo');
      expect(html).toContain('(boş)');
      expect(renderToStaticMarkup(<KategorikIstatistik tablo={tk} sutun={0} />)).not.toContain('data-capraz-tablo');
    });

    it('daire: dış halka her dilimi anahtar kategorilerine böler', () => {
      const f = kategorikFrekanslar(tk, 0);
      const capraz = caprazSayim(tk, 0, sonuc);
      const halka = { eslem: sonuc, sayilar: new Map(f.map((x, i) => [i, [...capraz[i].sayilar, capraz[i].bos]] as [number, number[]])) };
      const html = renderToStaticMarkup(
        <DaireGrafigi tablo={frekansTablosu(f, 'Renk')} sutun={1} seciliSatir={null} onSatirSec={bos} onDegerlerDegis={bos} genislik={700} yukseklik={400} azaltilmisHareket surukleKapali halka={halka} />,
      );
      expect(html).toContain('data-halka');
      expect(html.match(/data-halka-parcasi/g)).toHaveLength(4);
      expect(html).toContain('Tura (3)');
      expect(html).toContain('Yazı (2)');
    });
  });

  it('uygulama: grafiğin üstünde "Grafik ayarları" düğmesi', () => {
    const html = renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1000} />);
    expect(html).toContain('data-grafik-ayarlari-dugmesi');
    expect(html).toContain('Grafik ayarları');
  });
});
