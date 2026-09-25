// Sahip: D1 (vg/NoktaGrafigi.tsx, vg/SutunGrafigi.tsx, vg/KategorikGrafikler.tsx, vg/RenkLejanti.tsx)
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NoktaGrafigi, eksenIsaretleri, yiginYuksekligi, type NoktaGrafigiProps } from '../NoktaGrafigi';
import { SutunGrafigi, payliEksen } from '../SutunGrafigi';
import { KategorikIstatistik, KategorikSutunGrafigi, yuzdeVeAcilar } from '../KategorikGrafikler';
import { caprazSayim, kategoriSayilari, renkEslemesi, renkGruplari, satirRengi } from '../kategorik';
import { pencereyiGuncelle, seriRengi } from '../grafik';
import { tabloOlustur, type VeriTablosu as Tablo } from '../veri';
import { sabitBoy, sabitCalisma, sabitMac, sabitSicaklik } from './sabit-tablolar';

const bos = () => undefined;

describe('Veri ve Grafik uygulaması (sunucu tarafı akıllı çizim)', () => {
  it('nokta grafiği: atanmamışken dağınık, atanınca eksen işaretleri ve ortalama etiketi', () => {
    const tablo = sabitMac();
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
    // Terim sözlüğü (M01, M02): "x-üst-çizgi = …" yerine "Ortalama = …", "OMS = …" yerine "Ort. mutlak sapma = …"
    expect(atanmis).toContain('Ortalama = 17');
    expect(atanmis).toContain('Ort. mutlak sapma = 6,4');
    expect(atanmis).not.toContain('x\u0304');
    expect(atanmis).not.toContain('OMS =');
    expect(atanmis).not.toContain('\u0304');
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

  // Özgün "sütun, çizgi ve daire …" testinin sütun yarısı (çizgi ve daire yarısı grafikler.test.tsx'te)
  it('sütun, çizgi ve daire grafikleri hatalı hücreyle bile çökmeden çizilir: sütun', () => {
    const tablo = tabloOlustur(['Ay', 'Sıcaklık', 'Nem'], [['Ocak', 4.5, 60], ['Şubat', 'hata', 55], ['Mart', 8.5, '']]);
    const ortak = { tablo, seciliSatir: 1, onSatirSec: bos, genislik: 640, yukseklik: 320, azaltilmisHareket: true };
    const sutun = renderToStaticMarkup(<SutunGrafigi {...ortak} sutun={1} onDegerDegis={bos} yuvarlamaAdimi={0.5} />);
    expect(sutun).toContain('role="slider"');
    expect(sutun).toContain('8,5');
  });

  it('nokta grafiği: gruplama yokken tam değer, gruplamada kuşaklar ve "grup genişliği" notu', () => {
    const sicaklik = sabitSicaklik();
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

  // Özgün "yardımcılar: değişim etiketi ve paylı eksen" testinin paylı eksen yarısı (değişim etiketi grafikler.test.tsx'te)
  it('yardımcılar: değişim etiketi ve paylı eksen: paylı eksen', () => {
    const e = payliEksen(0, 35, 6);
    expect(e.max).toBeGreaterThan(35);
    expect(e.min).toBe(0);
  });
});

describe('renk anahtarı: kategoriye göre renklendirme (bütün grafikler, istatistik, tablo)', () => {
  const t = sabitCalisma();
  const eslem = renkEslemesi(t, 1)!;

  it('eşleme: satır → kategori → renk; boş kategori gri', () => {
    expect(eslem.ad).toBe('Sınıf');
    expect(eslem.kategoriler).toEqual(['A', 'B']);
    expect(satirRengi(eslem, 0)).toBe(eslem.renkler.get('A'));
    expect(satirRengi(eslem, 19)).toBe(eslem.renkler.get('B'));
    expect(satirRengi(null, 0)).toBeUndefined();
    expect(kategoriSayilari(eslem)).toEqual(new Map([['A', 10], ['B', 10]]));
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
    const html = renderToStaticMarkup(<NoktaGrafigi {...ortak} sutun={3} renkEslemi={eslem} />);
    expect(html).toContain('data-renk-lejanti');
    expect(html).toContain('A (10)');
    const renkler = new Set(Array.from(html.matchAll(/<circle r="[\d.]+" fill="(#[0-9a-f]{6})"/gi), (e) => e[1].toLowerCase()));
    expect(renkler.has(eslem.renkler.get('A')!.toLowerCase())).toBe(true);
    expect(renkler.has(eslem.renkler.get('B')!.toLowerCase())).toBe(true);
    const kendisi = renderToStaticMarkup(<NoktaGrafigi {...ortak} sutun={1} renkEslemi={eslem} />);
    expect(kendisi).not.toContain('data-renk-lejanti');
  });

  it('sütun grafiği: her sütun satırının kategori renginde, lejant başlık satırında', () => {
    const html = renderToStaticMarkup(
      <SutunGrafigi tablo={t} sutun={3} seciliSatir={null} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={1} genislik={900} yukseklik={360} azaltilmisHareket renkEslemi={eslem} />,
    );
    expect(html).toContain('data-renk-lejanti');
    const renkler = new Set(Array.from(html.matchAll(/<rect x="0" y="0" width="[\d.]+" height="1" fill="([^"]+)"/g), (e) => e[1]));
    expect(renkler).toEqual(new Set([eslem.renkler.get('A'), eslem.renkler.get('B')]));
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
      // Başlık "‹Anahtar›'na göre sıklık tablosu"; "İki yönlü tablo" yalnız title'da
      expect(html).toContain("Sonuç&#x27;a göre sıklık tablosu");
      expect(html).toMatch(/title="İki yönlü tablo: Renk × Sonuç"/);
      expect(html).not.toMatch(/>\s*İki yönlü tablo/);
    });
  });
});

// ── D1 kabul ölçütleri: nokta → sütun oranları, kategorik sayılar, tam sayı eksenleri, ortanca, uzaklık şeridi … ──

/** NoktaGrafigi için ortak özellikler (sunucu çiziminde geçişler kapalı) */
const noktaOzellikleri = (tablo: Tablo, sutun: number, ek: Partial<NoktaGrafigiProps> = {}): NoktaGrafigiProps => ({
  tablo,
  sutun,
  seciliSatir: null,
  onSatirSec: bos,
  onDegiskenBirak: bos,
  aralik: 1,
  secenekler: { ortalama: false, oms: false, etiketler: false },
  sutunModu: false,
  genislik: 800,
  yukseklik: 420,
  azaltilmisHareket: true,
  surukleniyor: false,
  ...ek,
});
const noktaCiz = (tablo: Tablo, sutun: number, ek: Partial<NoktaGrafigiProps> = {}) => renderToStaticMarkup(<NoktaGrafigi {...noktaOzellikleri(tablo, sutun, ek)} />);

/** Sıklıkları verilen kategorik tablo: ör. { A: 7, B: 6 } → 13 satır (satır adı + kategori) */
function kategorikTablo(sikliklar: Record<string, number>): Tablo {
  const satirlar: (string | number)[][] = [];
  for (const [k, n] of Object.entries(sikliklar)) for (let i = 0; i < n; i++) satirlar.push([`${satirlar.length + 1}. kişi`, k]);
  return tabloOlustur(['Kişi', 'Meyve'], satirlar, ['etiket', 'etiket']);
}

/** `data-siklik-sutunu` gruplarının yükseklikleri (sıralı) */
const yukseklikler = (html: string) => Array.from(html.matchAll(/data-siklik-sutunu="[^"]*"(?: data-sayi="\d+")? data-yukseklik="([\d.]+)"/g), (m) => Number(m[1]));
/** SVG'deki bütün <text> içerikleri */
const yazilar = (html: string) => Array.from(html.matchAll(/<text[^>]*>([^<]*)<\/text>/g), (m) => m[1]);

describe('D1: nokta, sütun ve kategorik grafikler (kabul ölçütleri)', () => {
  it('kategorik nokta → sütun: yükseklik sıklıkla doğru orantılı (7 · 6 · 5 · 4), sıklık ekseni ve "Sıklık" adı', () => {
    const t = kategorikTablo({ Elma: 7, Muz: 6, Çilek: 5, Kivi: 4 });
    const sira = ['Elma', 'Muz', 'Çilek', 'Kivi'];
    const html = noktaCiz(t, 1, { sutunModu: true, kategoriSirasi: sira });
    const h = yukseklikler(html);
    expect(h).toHaveLength(4);
    for (let i = 1; i < h.length; i++) expect(h[i]).toBeLessThan(h[i - 1]);
    const birim = h[0] / 7;
    [7, 6, 5, 4].forEach((s, i) => expect(Math.abs(h[i] - s * birim)).toBeLessThanOrEqual(1));
    expect(html).toContain('data-siklik-ekseni');
    expect(html).toContain('data-eksen-adi="dikey"');
    expect(html).toMatch(/data-eksen-adi="dikey"[^>]*>Sıklık</);
    // Kategorik sütun grafiği de aynı oranlarda
    const kh = yukseklikler(renderToStaticMarkup(<KategorikSutunGrafigi tablo={t} sutun={1} sira={sira} genislik={800} yukseklik={420} azaltilmisHareket />));
    [7, 6, 5, 4].forEach((s, i) => expect(Math.abs(kh[i] - s * (kh[0] / 7))).toBeLessThanOrEqual(1));
    // Nokta kipinde sütunlar görünmez (yükseklik 0); noktalar kutuda tek sütunda yığılır
    const noktali = noktaCiz(t, 1, { kategoriSirasi: sira });
    expect(yukseklikler(noktali)).toEqual([0, 0, 0, 0]);
    const elmaX = new Set(Array.from(noktali.matchAll(/aria-label="\d+\. kişi: Elma"[^>]*transform:translate\(([\d.]+)px/g), (m) => m[1]));
    expect(elmaX.size).toBe(1);
  });

  it('renk anahtarı: kategorik sütun kipinde sütunlar anahtar kategorilerine göre yığılır', () => {
    const t = sabitCalisma();
    const eslem = renkEslemesi(t, 1)!;
    const html = noktaCiz(t, 2, { sutunModu: true, renkEslemi: eslem });
    expect(html).toContain('data-yigin-parcasi="A"');
    expect(html).toContain('data-yigin-parcasi="B"');
    expect(html).toContain('data-renk-lejanti');
  });

  it('kategorik "Sayılar": yığın tepesinde "12 · %60"; kutu 64 px\'ten darsa yalnız "12"', () => {
    const t = kategorikTablo({ Evet: 12, Hayır: 8 });
    const genis = noktaCiz(t, 1, { secenekler: { ortalama: false, oms: false, etiketler: true } });
    expect(genis).toContain('data-siklik-etiketi="12 · %60"');
    expect(genis).toContain('data-siklik-etiketi="8 · %40"');
    // Kapalıyken etiket görünmez
    expect(noktaCiz(t, 1)).not.toContain('data-siklik-etiketi="12');
    // 5 kategori × 300 px: kutu 52 px → yalnız sıklık
    const dar = noktaCiz(kategorikTablo({ A: 12, B: 3, C: 2, D: 2, E: 1 }), 1, { genislik: 300, secenekler: { ortalama: false, oms: false, etiketler: true } });
    expect(dar).toContain('data-siklik-etiketi="12"');
    expect(dar).not.toMatch(/data-siklik-etiketi="[^"]*%/);
    // Yüzdeler en büyük kalan yöntemiyle: toplam %100
    const ucte = noktaCiz(kategorikTablo({ A: 1, B: 1, C: 1 }), 1, { secenekler: { ortalama: false, oms: false, etiketler: true } });
    const yuzdeler = Array.from(ucte.matchAll(/data-siklik-etiketi="1 · %([\d,]+)"/g), (m) => Number(m[1].replace(',', '.')));
    expect(yuzdeler).toHaveLength(3);
    expect(yuzdeler.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
  });

  it('tam sayılı veride yarım çentik yok: nokta, kategorik sütun, sütun', () => {
    const yarimVar = (html: string) => yazilar(html).some((y) => /^-?\d+,5$/.test(y));
    const kucuk = tabloOlustur(['Ad', 'Kardeş'], [['A', 1], ['B', 2], ['C', 2], ['D', 3]]);
    const nokta = noktaCiz(kucuk, 1, { genislik: 1200 });
    expect(nokta).toContain('data-eksen-isareti');
    expect(yarimVar(nokta)).toBe(false);
    // Sütun kipindeki sıklık ekseni de tam sayı
    expect(yarimVar(noktaCiz(kucuk, 1, { sutunModu: true, yukseklik: 700 }))).toBe(false);
    const kat = renderToStaticMarkup(<KategorikSutunGrafigi tablo={kategorikTablo({ A: 1, B: 2, C: 3 })} sutun={1} genislik={800} yukseklik={700} azaltilmisHareket />);
    expect(yarimVar(kat)).toBe(false);
    const sutun = renderToStaticMarkup(
      <SutunGrafigi tablo={kucuk} sutun={1} seciliSatir={null} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={1} genislik={800} yukseklik={700} azaltilmisHareket />,
    );
    expect(yarimVar(sutun)).toBe(false);
    expect(payliEksen(1, 3, 12, true).adim).toBeGreaterThanOrEqual(1);
    // Ondalıklı veride yarım çentik kalabilir
    expect(payliEksen(0.5, 3.5, 12, false).adim).toBeLessThan(1);
  });

  it('ortanca: lavanta kesikli çizgi ve eksenin altında "Ortanca = 12"; ortalama etiketi üstte, çakışmaz', () => {
    const t = tabloOlustur(['Öğrenci', 'Süre (dakika)'], [['A', 5], ['B', 8], ['C', 10], ['D', 12], ['E', 15], ['F', 20], ['G', 60]]);
    const html = noktaCiz(t, 1, { secenekler: { ortalama: true, oms: false, etiketler: false, ortanca: true } });
    expect(html).toContain('data-ortanca-cizgisi');
    expect(html).toContain('Ortanca = 12');
    expect(html).toContain('Ortalama ≈ 18,57');
    expect(html).toMatch(/data-ortanca-cizgisi="true"[^>]*stroke="#7f88c4"[^>]*stroke-dasharray/);
    const ortalamaY = Number(/data-ortalama-etiketi="true"><rect x="[\d.]+" y="([\d.]+)"/.exec(html)![1]);
    const ortancaY = Number(/data-ortanca-etiketi="true"><rect x="[\d.]+" y="([\d.]+)"/.exec(html)![1]);
    const eksenY = Number(/<line x1="20" x2="780" y1="([\d.]+)"/.exec(html)![1]);
    expect(ortancaY).toBeGreaterThan(eksenY);
    expect(ortancaY - (ortalamaY + 20)).toBeGreaterThanOrEqual(8);
    // Kapalıyken (ya da kategorik değişkende) çizilmez
    expect(noktaCiz(t, 1, { secenekler: { ortalama: true, oms: false, etiketler: false } })).not.toContain('Ortanca');
    expect(noktaCiz(kategorikTablo({ A: 2, B: 1 }), 1, { secenekler: { ortalama: true, oms: false, etiketler: false, ortanca: true } })).not.toContain('Ortanca');
  });

  it('ortalama mutlak sapma: bant kenarlarında değerler, ayraçta "Ort. mutlak sapma"; nokta başı sapma çizgisi yok', () => {
    const html = noktaCiz(sabitMac(), 1, { secenekler: { ortalama: true, oms: true, etiketler: false } });
    expect(html).toContain('data-oms-bandi');
    expect(html).toContain('data-oms-ayraci');
    expect(html).toContain('>10,6<');
    expect(html).toContain('>23,4<');
    expect(html).toContain('Ort. mutlak sapma = 6,4');
    expect(html).not.toContain('sapma-0');
    // Bant altın: nokta renginden (birincil) ayrı
    expect(html).toMatch(/data-oms-bandi="true"><rect[^>]*fill="#b9884a"/);
  });

  it('uzaklık şeridi (sabitMac Selma): 5 çubuk, solda ve sağda toplam 16; seçili noktanın çubuğu ve "18 ile 17 arası: 1"', () => {
    const t = sabitMac();
    const sec = { ortalama: true, oms: true, etiketler: false };
    const html = noktaCiz(t, 1, { secenekler: sec, seciliSatir: 0 });
    expect(html).toContain('data-uzaklik-seridi');
    expect(html.match(/data-uzaklik-cubugu=/g)).toHaveLength(5);
    expect(html.match(/data-uzaklik-cubugu="sol"/g)).toHaveLength(2);
    expect(html).toContain('Solda toplam 16');
    expect(html).toContain('Sağda toplam 16');
    expect(html).toContain('18 ile 17 arası: 1');
    expect(html).toMatch(/data-yalniz-ekran="true" data-uzaklik-secili/);
    // Çubuklar değere göre sıralı: 5, 13, 17, 18, 32 → genişlikler |değer − 17| ile orantılı
    const genislikler = Array.from(html.matchAll(/data-uzaklik-cubugu="(?:sol|sag)" x="[-\d.]+" y="[\d.]+" width="([\d.]+)"/g), (m) => Number(m[1]));
    const birim = genislikler[0] / 12;
    [12, 4, 0, 1, 15].forEach((u, i) => expect(Math.abs(genislikler[i] - Math.max(1.5, u * birim))).toBeLessThan(0.5));
    // Sütun kipinde ve OMS kapalıyken şerit yok; 40'tan çok veride yok
    expect(noktaCiz(t, 1, { secenekler: sec, sutunModu: true })).not.toContain('data-uzaklik-seridi');
    expect(noktaCiz(t, 1, { secenekler: { ...sec, oms: false } })).not.toContain('data-uzaklik-seridi');
    const cok = tabloOlustur(['No', 'Değer'], Array.from({ length: 41 }, (_, i) => [String(i + 1), i % 7]));
    expect(noktaCiz(cok, 1, { secenekler: sec, yukseklik: 600 })).not.toContain('data-uzaklik-seridi');
    // Gruplu kipte şerit gerçek değerlerden çizilir: toplamlar değişmez
    const gruplu = noktaCiz(t, 1, { secenekler: sec, aralik: 10 });
    expect(gruplu).toContain('data-gruplar');
    expect(gruplu).toContain('Solda toplam 16');
  });

  it('satirlar alt kümesi ve ikinci seri rengi; panel başlığı varken eksen adı yinelenmez', () => {
    const t = sabitCalisma();
    const html = noktaCiz(t, 2, { satirlar: [0, 2, 4], seciliSatir: 2, seriIndeksi: 1, baslik: '8-A' });
    const satirlar = Array.from(html.matchAll(/data-satir="(\d+)"/g), (m) => Number(m[1]));
    expect(satirlar).toEqual([0, 2, 4]);
    // seciliSatir tablonun geneline göre indekstir
    expect(html).toMatch(/data-satir="2"[^>]*aria-pressed="true"/);
    expect(html).toContain(`fill="${seriRengi(1)}"`);
    expect(html).toContain('data-panel-basligi');
    expect(html).not.toContain('data-eksen-adi="yatay"');
    // Ortalama etiketi panel üst kenarından en az 8 px aşağıda
    const ust = noktaCiz(t, 2, { baslik: '8-A', secenekler: { ortalama: true, oms: true, etiketler: false } });
    expect(Number(/data-ortalama-etiketi="true"><rect x="[\d.]+" y="([\d.]+)"/.exec(ust)![1])).toBeGreaterThanOrEqual(8);
  });

  it('vurguSatir: yeni noktanın çevresinde mercan halka (azaltılmış harekette durağan)', () => {
    const t = sabitBoy();
    const hareketli = noktaCiz(t, 1, { vurguSatir: 5, azaltilmisHareket: false });
    expect(hareketli.match(/data-vurgu-halkasi/g)).toHaveLength(1);
    expect(hareketli).toMatch(/data-satir="5"[\s\S]*?data-vurgu-halkasi="true"[^>]*stroke="#d9805f" stroke-width="2.5"/);
    expect(hareketli).toContain('vg-halka 700ms');
    const durgun = noktaCiz(t, 1, { vurguSatir: 5 });
    expect(durgun).toContain('data-vurgu-halkasi');
    expect(durgun).not.toContain('vg-halka 700ms');
    expect(noktaCiz(t, 1)).not.toContain('data-vurgu-halkasi');
  });

  it('bosIpucu: veri yokken eksen çizilir ve ortada ipucu yazar; eksenAlani tek panelde de geçerli', () => {
    const bosT: Tablo = { sutunlar: [{ id: 'ar1-abcd-deger', ad: 'Boy (cm)', tur: 'sayi' }], satirlar: [] };
    const html = noktaCiz(bosT, 0, { bosIpucu: 'İlk ölçümle noktalar burada belirir.', eksenAlani: { min: 130, max: 175 } });
    expect(html).toContain('data-bos-ipucu');
    expect(html).toContain('İlk ölçümle noktalar burada belirir.');
    const isaretler = Array.from(html.matchAll(/data-eksen-isareti="true">([^<]+)</g), (m) => Number(m[1]));
    expect(Math.min(...isaretler)).toBeLessThanOrEqual(130);
    expect(Math.max(...isaretler)).toBeGreaterThanOrEqual(175);
    // Veri eksenAlani dışına taşarsa eksen genişler
    const tek = tabloOlustur(['Ad', 'Boy (cm)'], [['A', 190]]);
    const genis = Array.from(noktaCiz(tek, 1, { eksenAlani: { min: 130, max: 175 } }).matchAll(/data-eksen-isareti="true">([^<]+)</g), (m) => Number(m[1]));
    expect(Math.min(...genis)).toBeLessThanOrEqual(130);
    expect(Math.max(...genis)).toBeGreaterThanOrEqual(190);
    // Kategorik sütun grafiği: bosIpucu ve yEnAz (üst sınır en az bu kadar)
    const kat: Tablo = { sutunlar: [{ id: 'ar1-abcd-cevap', ad: 'Meyve', tur: 'etiket' }], satirlar: [] };
    const katHtml = renderToStaticMarkup(
      <KategorikSutunGrafigi tablo={kat} sutun={0} sira={['Elma', 'Muz']} genislik={800} yukseklik={420} azaltilmisHareket bosIpucu="İlk cevapla sütunlar burada belirir." yEnAz={10} />,
    );
    expect(katHtml).toContain('İlk cevapla sütunlar burada belirir.');
    expect(katHtml).toContain('Meyve · sıklık (0 veri)');
    expect(yazilar(katHtml)).toContain('10');
  });

  it('ölçüm penceresi: uçları adıma oturan eksenAlani tam o uçlarda biter; az veride noktalar okunur (r ≥ 9), çakışmaz', () => {
    const isaretler = (html: string) => Array.from(html.matchAll(/data-eksen-isareti="true">([^<]+)</g), (m) => Number(m[1]));
    const yaricap = (html: string) => Number(/<circle r="22" fill="transparent"><\/circle><circle r="([\d.]+)"/.exec(html)![1]);
    const xler = (html: string) =>
      [...new Set(Array.from(html.matchAll(/transform:translate\(([\d.]+)px, [\d.]+px\);transition:none;opacity:1/g), (m) => Number(m[1])))].sort((a, b) => a - b);
    // Nabız: 12 ölçüm (79 ile 80 komşu), 1366'daki grafik sütunu genişliği; toplama penceresi 60–100
    const nabiz = [80, 76, 91, 84, 68, 88, 79, 95, 74, 82, 84, 72];
    const t = tabloOlustur(['Kişi', 'Nabız (atım/dk)'], nabiz.map((v, i) => [`${i + 1}. kişi`, v]));
    const html = noktaCiz(t, 1, { genislik: 956, yukseklik: 480, eksenAlani: { min: 60, max: 100 } });
    expect(Math.min(...isaretler(html))).toBe(60);
    expect(Math.max(...isaretler(html))).toBe(100);
    // Etiketler güzel adımda (60, 70 … ya da 60, 65 …); 64, 68 gibi etiket yok
    expect(isaretler(html).every((v) => v % 5 === 0)).toBe(true);
    const r = yaricap(html);
    expect(r).toBeGreaterThanOrEqual(9);
    const x = xler(html);
    expect(x).toHaveLength(11);
    for (let i = 1; i < x.length; i++) expect(x[i] - x[i - 1]).toBeGreaterThanOrEqual(2 * r);
    // Beklenen aralığın tamamı (60–120) eksen olsaydı noktalar küçük kalırdı
    expect(yaricap(noktaCiz(t, 1, { genislik: 956, yukseklik: 480, eksenAlani: { min: 60, max: 120 } }))).toBeLessThan(9);
    // Boş eksen beklenen aralıkta biter (55–125 değil); sayı küpü 1–6, iki küp 2–12: fazladan 0 / 7 işareti yok
    const bosT: Tablo = { sutunlar: [{ id: 'ar1-abcd-deger', ad: 'Nabız (atım/dk)', tur: 'sayi' }], satirlar: [] };
    const bosHtml = noktaCiz(bosT, 0, { bosIpucu: 'İlk ölçümle noktalar burada belirir.', eksenAlani: { min: 60, max: 120 } });
    expect([Math.min(...isaretler(bosHtml)), Math.max(...isaretler(bosHtml))]).toEqual([60, 120]);
    const zar = tabloOlustur(['Atış', 'Sayı küpü'], [['1', 3], ['2', 5], ['3', 5]]);
    expect(isaretler(noktaCiz(zar, 1, { eksenAlani: { min: 1, max: 6 } }))).toEqual([1, 2, 3, 4, 5, 6]);
    const iki = tabloOlustur(['Atış', 'Toplam'], [['1', 7], ['2', 9]]);
    expect(isaretler(noktaCiz(iki, 1, { eksenAlani: { min: 2, max: 12 } }))).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // Uçlar adıma oturmuyorsa (karşılaştırmanın ortak ekseni 5–32) payli güzel eksen sürer
    const mac = isaretler(noktaCiz(sabitMac(), 1, { eksenAlani: { min: 5, max: 32 } }));
    expect(Math.min(...mac)).toBeLessThanOrEqual(5);
    expect(Math.max(...mac)).toBeGreaterThanOrEqual(30);
    expect(mac.every((v) => v % 5 === 0)).toBe(true);
  });

  it("eksen işaretleri: sığmayınca her k'ıncı değil; gruplamasızda güzel adıma seyreltilir, gruplu eksende güzel katlar yazılır", () => {
    const yazilan = (isaretler: number[], sigan: number, seyrek: boolean) => {
      const e = eksenIsaretleri(isaretler, sigan, seyrek);
      return e.isaretler.filter((_, i) => e.etiketli(i));
    };
    const ikiser = Array.from({ length: 21 }, (_, i) => 60 + 2 * i);
    // Hepsi sığıyorsa aynen
    expect(yazilan(ikiser, 30, true)).toEqual(ikiser);
    // Gruplamasız: 5'lik işaretler, hepsi yazılı
    expect(eksenIsaretleri(ikiser, 16, true).isaretler).toEqual([60, 65, 70, 75, 80, 85, 90, 95, 100]);
    expect(yazilan(ikiser, 16, true)).toEqual([60, 65, 70, 75, 80, 85, 90, 95, 100]);
    // Gruplu (grup kenarları yerinde): yalnız güzel katlar yazılır
    expect(eksenIsaretleri(ikiser, 16, false).isaretler).toEqual(ikiser);
    expect(yazilan(ikiser, 16, false)).toEqual([60, 70, 80, 90, 100]);
    const beser = Array.from({ length: 15 }, (_, i) => 55 + 5 * i);
    expect(yazilan(beser, 10, true)).toEqual([60, 70, 80, 90, 100, 110, 120]);
    expect(yazilan([0, 0.5, 1, 1.5, 2, 2.5, 3], 4, true)).toEqual([0, 1, 2, 3]);
    // Güzel katı olmayan gruplu dizide eski kural (her k'ıncı)
    expect(yazilan([1.5, 4.5, 7.5, 10.5, 13.5], 3, false)).toEqual([1.5, 7.5, 13.5]);
  });

  it('ortakYigin: alt alta panellerde yığın ölçeği ortak, noktalar aynı büyüklükte (sayısal ve kategorik)', () => {
    const r = (html: string) => Number(/<circle r="22" fill="transparent"><\/circle><circle r="([\d.]+)"/.exec(html)![1]);
    // İki grup: A'da en yüksek yığın 6, B'de 2 (alçak panel: yarıçapı dikey alan sınırlar)
    const t = tabloOlustur(
      ['Ad', 'Grup', 'Puan'],
      [
        ...Array.from({ length: 6 }, (_, i) => [`a${i}`, 'A', 70] as (string | number)[]),
        ['a6', 'A', 80],
        ['b0', 'B', 60],
        ['b1', 'B', 60],
        ['b2', 'B', 90],
      ],
      [undefined, 'etiket'],
    );
    const a = [0, 1, 2, 3, 4, 5, 6];
    const b = [7, 8, 9];
    expect([yiginYuksekligi(t, 2, 1, a), yiginYuksekligi(t, 2, 1, b), yiginYuksekligi(t, 2, 1)]).toEqual([6, 2, 6]);
    expect(yiginYuksekligi(t, 1, 1)).toBe(7);
    expect(yiginYuksekligi(t, 1, 1, b)).toBe(3);
    expect(yiginYuksekligi(t, 9, 1)).toBe(0);
    const ortak = Math.max(yiginYuksekligi(t, 2, 1, a), yiginYuksekligi(t, 2, 1, b));
    const panel = (satirlar: number[], ek: Partial<NoktaGrafigiProps> = {}) => noktaCiz(t, 2, { satirlar, yukseklik: 150, ...ek });
    expect(r(panel(a))).toBeLessThan(r(panel(b)));
    expect(r(panel(a, { ortakYigin: ortak }))).toBe(r(panel(b, { ortakYigin: ortak })));
    // Sütun modunda sıklık ekseni de ortak: iki sütunun yükseklik birimi aynı
    const birim = (html: string) => {
      const [y] = yukseklikler(html);
      return y;
    };
    const sa = panel(a, { ortakYigin: ortak, sutunModu: true });
    const sb = panel(b, { ortakYigin: ortak, sutunModu: true });
    expect(birim(sa) / 6).toBeCloseTo(birim(sb) / 2, 2);
    // Kategorik: en kalabalık kategori A'da 7, B'de 3
    const ka = noktaCiz(t, 1, { satirlar: a, yukseklik: 150, ortakYigin: 7 });
    const kb = noktaCiz(t, 1, { satirlar: b, yukseklik: 150, ortakYigin: 7 });
    expect(r(ka)).toBe(r(kb));
  });

  it('grup paneli: seriIndeksi 0 anahtarın 0. rengi, renk verilirse o; başlık veri sayısını yazıyorsa sağ altta yinelenmez', () => {
    const t = sabitCalisma();
    // seriIndeksi verilmezse birincil renk; 0 verilirse anahtarın (SERI_RENKLERI) 0. rengi
    expect(noktaCiz(t, 2)).toContain('fill="hsl(var(--primary))"');
    const sifir = noktaCiz(t, 2, { seriIndeksi: 0, baslik: '8-A (5 veri)' });
    expect(sifir).toContain(`fill="${seriRengi(0)}"`);
    expect(sifir).not.toContain('fill="hsl(var(--primary))"');
    expect(noktaCiz(t, 2, { seriIndeksi: 1, renk: '#bd5c8f' })).toContain('fill="#bd5c8f"');
    // Kategorik panel: "5-A (12 veri)" başlığında sağ alttaki "12 veri" yazılmaz; sayısız başlıkta yazılır
    const kat = kategorikTablo({ Elma: 7, Muz: 5 });
    const sayili = noktaCiz(kat, 1, { baslik: '5-A (12 veri)' });
    expect(yazilar(sayili)).toContain('5-A (12 veri)');
    expect(yazilar(sayili)).not.toContain('12 veri');
    expect(yazilar(noktaCiz(kat, 1, { baslik: 'Meyve' }))).toContain('12 veri');
    expect(yazilar(noktaCiz(kat, 1))).toContain('Meyve · 12 veri');
  });

  it('viewBox gerçek boyuttur (küçültme yok); yazılar 13 px', () => {
    for (const [g, y] of [
      [150, 100],
      [846, 480],
    ]) {
      const html = noktaCiz(sabitMac(), 1, { genislik: g, yukseklik: y, secenekler: { ortalama: true, oms: true, etiketler: true, ortanca: true } });
      expect(html).toContain(`width="${g}" height="${y}" viewBox="0 0 ${g} ${y}"`);
      const boylar = Array.from(html.matchAll(/font-size="([\d.]+)"/g), (m) => Number(m[1]));
      expect(Math.min(...boylar)).toBeGreaterThanOrEqual(12);
    }
    const kat = renderToStaticMarkup(<KategorikSutunGrafigi tablo={kategorikTablo({ A: 2 })} sutun={1} genislik={180} yukseklik={120} azaltilmisHareket />);
    expect(kat).toContain('viewBox="0 0 180 120"');
    const sutun = renderToStaticMarkup(<SutunGrafigi tablo={sabitMac()} sutun={1} seciliSatir={null} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={1} genislik={180} yukseklik={120} azaltilmisHareket />);
    expect(sutun).toContain('viewBox="0 0 180 120"');
  });

  it('nokta yarıçapı en çok 18; komşu yığınlar çakışmaz; dokunma dairesi en az 22 px', () => {
    const t = sabitBoy();
    const html = noktaCiz(t, 1, { genislik: 846, yukseklik: 480 });
    const r = Number(/<circle r="22" fill="transparent"><\/circle><circle r="([\d.]+)"/.exec(html)![1]);
    expect(r).toBeLessThanOrEqual(18);
    const xler = [...new Set(Array.from(html.matchAll(/transform:translate\(([\d.]+)px, [\d.]+px\);transition:none;opacity:1/g), (m) => Number(m[1])))].sort((a, b) => a - b);
    expect(xler.length).toBeGreaterThanOrEqual(10);
    for (let i = 1; i < xler.length; i++) expect(xler[i] - xler[i - 1]).toBeGreaterThanOrEqual(2 * r);
    // Az noktada üst sınır 18
    const iki = noktaCiz(tabloOlustur(['Ad', 'Puan'], [['A', 1], ['B', 9]]), 1);
    expect(iki).toContain('<circle r="18" fill="hsl(var(--primary))"');
  });

  it('Etiketler: yığında değer yalnız en üstteki noktada; gruplamada noktanın sağında ya da yığın başına sayı', () => {
    const t = tabloOlustur(['Ad', 'Kitap'], [['A', 1], ['B', 1], ['C', 1], ['D', 2], ['E', 3], ['F', 3]]);
    const html = noktaCiz(t, 1, { secenekler: { ortalama: false, oms: false, etiketler: true } });
    expect(html.match(/data-deger-etiketi/g)).toHaveLength(3);
    // Gruplu: boy 5'lik gruplarda değerler noktaların sağında
    const boy = sabitBoy();
    const sagda = noktaCiz(boy, 1, { aralik: 5, genislik: 846, secenekler: { ortalama: false, oms: false, etiketler: true } });
    expect(sagda.match(/data-deger-etiketi/g)).toHaveLength(24);
    expect(sagda).toMatch(/<text x="[\d.]+" y="4.5"[^>]*text-anchor="start" data-deger-etiketi/);
    // Sığmıyorsa yığın başına sayı
    const dar = noktaCiz(boy, 1, { aralik: 2, genislik: 500, secenekler: { ortalama: false, oms: false, etiketler: true } });
    expect(dar).not.toContain('data-deger-etiketi');
    expect(dar).toContain('data-yigin-sayisi');
  });

  it('eksen: değerler ≥ 0 iken 0\'ın solunda boş kuşak yok; negatif işaret yazılmaz', () => {
    const html = noktaCiz(sabitMac(), 1, { eksenAlani: { min: 0, max: 35 } });
    const sifir = /<text x="([\d.]+)" y="[\d.]+" font-size="13" text-anchor="middle" fill="[^"]+" data-eksen-isareti="true">0</.exec(html);
    expect(sifir).not.toBeNull();
    expect(Number(sifir![1])).toBeLessThan(60);
    expect(yazilar(html).some((y) => y.startsWith('-') || y.startsWith('−'))).toBe(false);
  });

  it('klavye odağı: nokta ve sütun tutamağında 3 px vurgu halkası; sütunda tek Tab durağı; dar çubukta etiket ve tutamak yok', () => {
    const nokta = noktaCiz(sabitMac(), 1);
    expect(nokta).toMatch(/class="vg-odak" data-yalniz-ekran="true" r="[\d.]+" fill="none" stroke="hsl\(var\(--ring\)\)" stroke-width="3"/);
    expect(nokta.match(/tabindex="0"/g)).toHaveLength(1);
    const sutun = renderToStaticMarkup(
      <SutunGrafigi tablo={sabitMac()} sutun={1} seciliSatir={null} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={1} genislik={800} yukseklik={400} azaltilmisHareket />,
    );
    expect(sutun).toMatch(/class="vg-odak" data-yalniz-ekran="true"[^>]*stroke="hsl\(var\(--ring\)\)" stroke-width="3"/);
    expect(sutun.match(/role="slider" tabindex="0"/g)).toHaveLength(1);
    expect(sutun.match(/role="slider" tabindex="-1"/g)).toHaveLength(4);
    // 60 satır × 600 px: çubuklar 14 px'ten dar → değer etiketi ve görünür tutamak yok, kaydırıcılar kalır
    const cok = tabloOlustur(['No', 'Değer'], Array.from({ length: 60 }, (_, i) => [String(i + 1), (i % 9) + 1]));
    const dar = renderToStaticMarkup(<SutunGrafigi tablo={cok} sutun={1} seciliSatir={null} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={1} genislik={600} yukseklik={400} azaltilmisHareket />);
    expect(dar.match(/role="slider"/g)).toHaveLength(60);
    expect(dar).not.toMatch(/<rect data-yalniz-ekran="true" x="[\d.]+" y="[\d.-]+" width="[\d.]+" height="6"/);
    expect(dar).not.toContain('pointer-events="none" style="paint-order:stroke');
  });

  it('kategorik istatistik: Tepe değer, göreli sıklık ve merkez açı; eşit sıklıkta tepe değer yok; deney notu yalnız deney verisinde', () => {
    const t = kategorikTablo({ Elma: 7, Muz: 6, Çilek: 5, Kivi: 4, Nar: 2 });
    const html = renderToStaticMarkup(<KategorikIstatistik tablo={t} sutun={1} sira={['Elma', 'Muz', 'Çilek', 'Kivi', 'Nar']} />);
    expect(html).toContain('Tepe değer');
    expect(html).toContain('Veri sayısı: 24');
    expect(html).toContain('7/24 ≈ 0,29 (%29,2)');
    expect(html).toContain('105°');
    expect(html).toContain('Sıklık tablosu');
    expect(html).toContain('Göreli sıklık');
    expect(html).toContain('Merkez açı');
    expect(html).toContain('Yüzde = sıklık ÷ toplam × 100. Tüm yüzdelerin toplamı %100.');
    expect(html).not.toContain('teorik');
    expect(html).not.toMatch(/Frekans|frekans|Mod\b|kuramsal/);
    expect(html.match(/data-tepe-satiri/g)).toHaveLength(1);
    const deney = renderToStaticMarkup(<KategorikIstatistik tablo={t} sutun={1} deneyVerisi />);
    expect(deney).toContain('teorik olasılığa');
    // Bütün kategoriler eşit sayıda: tepe değer yok, satır vurgusu yok
    const esit = renderToStaticMarkup(<KategorikIstatistik tablo={kategorikTablo({ Yazı: 3, Tura: 3 })} sutun={1} />);
    expect(esit).toContain('bütün değerler eşit sayıda: tepe değer yok');
    expect(esit).not.toContain('data-tepe-satiri');
    // Yuvarlanan yüzdeler ve açılar toplamı %100 ve 360°
    const { yuzdeler, acilar } = yuzdeVeAcilar([1, 1, 1]);
    expect(yuzdeler.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
    expect(acilar.reduce((a, b) => a + b, 0)).toBe(360);
    expect(yuzdeVeAcilar([7, 6, 5, 4, 2]).acilar).toEqual([105, 90, 75, 60, 30]);
  });

  it('kategorik sütun grafiği: başlık "Meyve · sıklık (24 veri)", sıklık ve yüzde etiketi', () => {
    const t = kategorikTablo({ Elma: 7, Muz: 6, Çilek: 5, Kivi: 4, Nar: 2 });
    const html = renderToStaticMarkup(<KategorikSutunGrafigi tablo={t} sutun={1} genislik={800} yukseklik={420} azaltilmisHareket />);
    expect(html).toContain('Meyve · sıklık (24 veri)');
    expect(html).toContain('%29,2');
    expect(html).not.toMatch(/frekans|n = /);
  });
});

// ── Onarım D (inceleme bulguları): sayı biçimi, eksi sütun yazısı, eksen penceresi, ölçülerden bağımsız yarıçap,
//    tek sütunda yığılma, kategorik sıralı yığın, panel rengi, açık / koyu adlı renkler, uç eksen etiketi ─────────

const NB = ' ';
/** Noktaların (çizim sırasıyla) yarıçapı, x ve y'si */
const noktalar = (html: string) =>
  Array.from(
    html.matchAll(/data-satir="(\d+)"[^>]*aria-label="([^"]*)"[^>]*style="transform:translate\(([\d.-]+)px, ([\d.-]+)px\)[^"]*"><circle r="22" fill="transparent"><\/circle><circle r="([\d.]+)" fill="([^"]+)" stroke="([^"]+)"/g),
    (m) => ({ satir: Number(m[1]), etiket: m[2], x: Number(m[3]), y: Number(m[4]), r: Number(m[5]), fill: m[6], stroke: m[7] }),
  );

describe('onarım D: grafik bulguları', () => {
  const harcama = () =>
    tabloOlustur(
      ['Kalem', 'Tutar (TL)'],
      [['Kira', 25000], ['Mutfak', 35000], ['Faturalar', 10000], ['Ulaşım', 10000], ['Okul', 5000], ['Giyim', 5000], ['Birikim', 10000]],
    );
  const iklim = () =>
    tabloOlustur(
      ['Ay', 'Erzurum (°C)'],
      [['Ocak', -9.1], ['Şubat', -7.6], ['Mart', -2.3], ['Nisan', 5.4], ['Mayıs', 10.7], ['Haziran', 14.9], ['Temmuz', 19.2], ['Ağustos', 19.6], ['Eylül', 14.8], ['Ekim', 8.2], ['Kasım', 1.2], ['Aralık', -5.7]],
    );

  it('sayı biçimi: Nokta ve Sütun da İstatistik gibi yazar (bölük boşluğu "35 000", gerçek eksi "−9,1"); yuvarlanan ölçü "≈"', () => {
    const nokta = noktaCiz(harcama(), 1, { genislik: 846, secenekler: { ortalama: true, oms: true, etiketler: false, ortanca: true } });
    expect(nokta).toContain(`>35${NB}000<`);
    expect(nokta).toContain(`Ortalama ≈ 14${NB}285,71`);
    expect(nokta).toContain('Ort. mutlak sapma ≈ 8979,59');
    expect(nokta).toContain(`Ortanca = 10${NB}000`);
    expect(nokta).not.toMatch(/>\d{5,}</);
    // Tam yazılabilen ölçü "=" ile (terim sözlüğü: "Ortalama = 17")
    expect(noktaCiz(sabitMac(), 1, { secenekler: { ortalama: true, oms: true, etiketler: false } })).toContain('Ortalama = 17');
    const sutun = renderToStaticMarkup(
      <SutunGrafigi tablo={harcama()} sutun={1} seciliSatir={null} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={1} genislik={846} yukseklik={438} azaltilmisHareket />,
    );
    expect(sutun).toContain(`>35${NB}000<`);
    const eksi = renderToStaticMarkup(
      <SutunGrafigi tablo={iklim()} sutun={1} seciliSatir={null} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={0.1} genislik={846} yukseklik={438} azaltilmisHareket />,
    );
    expect(eksi).toContain('>−9,1<');
    expect(eksi).not.toMatch(/>-\d/);
  });

  it('eksi sütun: değer yazısı kategori adının üstüne binmez (iklim −9,1 / Ocak); alçak grafikte sütunun içine ya da sıfırın üstüne geçer', () => {
    for (const yukseklik of [438, 300, 220, 160]) {
      const html = renderToStaticMarkup(
        <SutunGrafigi tablo={iklim()} sutun={1} seciliSatir={null} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={0.1} genislik={846} yukseklik={yukseklik} azaltilmisHareket />,
      );
      const kategoriY = Number(/<text x="[\d.]+" y="([\d.]+)"[^>]*>Ocak<\/text>/.exec(html)![1]);
      const yazi = /<text x="[\d.]+" y="([\d.-]+)"[^>]*data-deger-yazisi="(\w+)">−9,1<\/text>/.exec(html)!;
      const yaziY = Number(yazi[1]);
      // yazının alt kenarı (taban çizgisi + 3) kategori adının üst kenarından (taban çizgisi − 10) yukarıda
      if (yazi[2] === 'alt') expect(yaziY + 3, `${yukseklik}`).toBeLessThanOrEqual(kategoriY - 10);
      else expect(yaziY, `${yukseklik}`).toBeLessThan(kategoriY - 20);
    }
    // Eksen altta da pay bırakır: −9,1 için −10'da bitmez
    expect(payliEksen(-9.1, 19.6, 8).min).toBeLessThan(-10);
    expect(payliEksen(0, 35, 6).min).toBe(0);
  });

  it('eksen penceresi aynı değişkende yalnız genişler; değişken / grup genişliği değişince ya da veri üçte birin altına inince yeniden sığar', () => {
    const ilk = pencereyiGuncelle(null, 's1|1|t', 2, 60);
    expect(ilk).toEqual({ anahtar: 's1|1|t', min: 2, max: 60 });
    // Feyza 60 → 20: veri 2–28, pencere 2–60 kalır (ortalama çizgisi eksenle değil değeriyle kayar)
    expect(pencereyiGuncelle(ilk, 's1|1|t', 2, 28)).toEqual({ anahtar: 's1|1|t', min: 2, max: 60 });
    // Veri dışarı taşarsa genişler
    expect(pencereyiGuncelle(ilk, 's1|1|t', 0, 75)).toEqual({ anahtar: 's1|1|t', min: 0, max: 75 });
    // Başka değişken ya da grup genişliği: yeniden sığar
    expect(pencereyiGuncelle(ilk, 's2|1|t', 5, 9)).toEqual({ anahtar: 's2|1|t', min: 5, max: 9 });
    expect(pencereyiGuncelle(ilk, 's1|5|g', 0, 25)).toEqual({ anahtar: 's1|5|g', min: 0, max: 25 });
    // Yanlış yazılan 600 düzeltildi: veri pencerenin üçte birinden dar → yeniden sığar
    const genis = pencereyiGuncelle(ilk, 's1|1|t', 2, 600);
    expect(pencereyiGuncelle(genis, 's1|1|t', 2, 60)).toEqual({ anahtar: 's1|1|t', min: 2, max: 60 });
  });

  it('ölçü düğmeleri noktaları küçültmez ve kaydırmaz (Ortalama, Ortanca); uzaklık şeridi yalnız boş yere sığarsa, eksenle birlikte', () => {
    const kardes = tabloOlustur(
      ['Öğrenci', 'Kardeş sayısı'],
      [3, 1, 2, 0, 1, 2, 1, 4, 2, 2, 1, 2, 3, 1, 2, 0, 1, 2, 3, 1].map((v, i) => [`Ö${i + 1}`, v]),
    );
    for (const yukseklik of [280, 420]) {
      const sec = (ortalama: boolean, oms: boolean, ortanca: boolean) =>
        noktalar(noktaCiz(kardes, 1, { genislik: 846, yukseklik, secenekler: { ortalama, oms, etiketler: false, ortanca } }));
      const yok = sec(false, false, false);
      const ort = sec(true, false, false);
      const ortanca = sec(true, false, true);
      const hepsi = sec(true, true, true);
      expect(yok).toHaveLength(20);
      expect(new Set(yok.map((n) => n.r)).size).toBe(1);
      for (const d of [ort, ortanca, hepsi]) expect(d.map((n) => n.r)).toEqual(yok.map((n) => n.r));
      expect(ort.map((n) => [n.x, n.y])).toEqual(yok.map((n) => [n.x, n.y]));
      expect(ortanca.map((n) => [n.x, n.y])).toEqual(yok.map((n) => [n.x, n.y]));
      // OMS: noktalar aynı x'te; şerit çizildiyse hepsi aynı miktar yukarı (eksenle tek parça)
      const kayma = new Set(hepsi.map((n, i) => +(yok[i].y - n.y).toFixed(3)));
      expect(kayma.size).toBe(1);
      expect(hepsi.map((n) => n.x)).toEqual(yok.map((n) => n.x));
    }
    // Yarıçap 280 px'te en az 9 (eskiden OMS açılınca 6'ya iniyordu)
    expect(noktalar(noktaCiz(kardes, 1, { genislik: 846, yukseklik: 280 }))[0].r).toBeGreaterThanOrEqual(9);
  });

  it('gruplamasız alçak panelde (Keşif kartı açık, ölçüler açık) aynı değerdeki noktalar yan yana dağılmaz, tek sütunda yığılır', () => {
    const puanlar = [75, 40, 90, 80, 55, 100, 65, 80, 85, 70, 90, 60, 55, 80, 50];
    const t = tabloOlustur(['Öğrenci', 'Puan'], puanlar.map((v, i) => [`7A-${i + 1}`, v]));
    const html = noktaCiz(t, 1, {
      genislik: 846,
      yukseklik: 140,
      aralik: 5,
      baslik: '7-A (15 veri)',
      seriIndeksi: 0,
      ortakYigin: 4,
      eksenAlani: { min: 40, max: 100 },
      secenekler: { ortalama: true, oms: true, etiketler: false },
    });
    const n = noktalar(html);
    expect(n).toHaveLength(15);
    const isaret = new Map(Array.from(html.matchAll(/<text x="([\d.]+)"[^>]*data-eksen-isareti="true">([^<]+)</g), (m) => [Number(m[2]), Number(m[1])]));
    // Her nokta kendi değerinin işaretinin tam üstünde (79 ya da 81'deymiş gibi okunmaz)
    for (const nokta of n) expect(Math.abs(nokta.x - isaret.get(puanlar[nokta.satir])!), nokta.etiket).toBeLessThan(0.01);
    // Çok yüksek yığında (600 ölçüm) yan yana sıralar sürer
    const yogun = tabloOlustur(['No', 'Sayı'], Array.from({ length: 600 }, (_, i) => [String(i + 1), i % 3]));
    const yogunX = Array.from(noktaCiz(yogun, 1, { yukseklik: 300 }).matchAll(/aria-label="\d+: 0"[^>]*transform:translate\(([\d.]+)px/g), (m) => m[1]);
    expect(new Set(yogunX).size).toBeGreaterThan(1);
  });

  it("kategorik kutuda 40 cevap ince bir iplik olmaz: bütün kutularda aynı k'lık sıralar, noktalar okunur (r ≥ 8)", () => {
    const t = kategorikTablo({ Muz: 40, Elma: 5, Kiraz: 3, Nar: 2 });
    const n = noktalar(noktaCiz(t, 1, { genislik: 760, yukseklik: 420, kategoriSirasi: ['Muz', 'Elma', 'Kiraz', 'Nar'] }));
    expect(n).toHaveLength(50);
    expect(n[0].r).toBeGreaterThanOrEqual(8);
    /** Kutudaki bir sıradaki en çok nokta (k); eksik son sıra ortalanır */
    const siraBasi = (k: string) => {
      const sayac = new Map<number, number>();
      for (const x of n.filter((x) => x.etiket.endsWith(`: ${k}`))) sayac.set(x.y, (sayac.get(x.y) ?? 0) + 1);
      return Math.max(...sayac.values());
    };
    const k = siraBasi('Muz');
    expect(k).toBeGreaterThan(1);
    expect(k).toBeLessThan(8);
    expect(siraBasi('Elma')).toBe(Math.min(k, 5));
    expect(siraBasi('Nar')).toBe(Math.min(k, 2));
    // Az veride tek sütun sürer (M07)
    const az = noktalar(noktaCiz(kategorikTablo({ Elma: 7, Muz: 6 }), 1));
    expect(new Set(az.filter((x) => x.etiket.endsWith(': Elma')).map((x) => x.x)).size).toBe(1);
  });

  it('karşılaştırma / grup panelinde kategorik noktalar panel rengini alır (5-A teal, 5-B mercan); tek grafikte kategori renkleri', () => {
    const t = kategorikTablo({ Plastik: 6, 'Yemek artığı': 3, Cam: 1 });
    expect(new Set(noktalar(noktaCiz(t, 1, { seriIndeksi: 1, baslik: '5-B (10 veri)' })).map((x) => x.fill))).toEqual(new Set([seriRengi(1)]));
    expect(new Set(noktalar(noktaCiz(t, 1, { renk: '#2f8394', baslik: '5-A (10 veri)' })).map((x) => x.fill))).toEqual(new Set(['#2f8394']));
    expect(new Set(noktalar(noktaCiz(t, 1)).map((x) => x.fill)).size).toBe(3);
  });

  it('"Beyaz" ve "Siyah" noktalar, sütunlar ve lejant noktaları metin renginde kenarla çizilir', () => {
    const t = kategorikTablo({ Beyaz: 3, Siyah: 2, Mavi: 2 });
    const n = noktalar(noktaCiz(t, 1));
    const kenar = (k: string) => n.find((x) => x.etiket.endsWith(`: ${k}`))!.stroke;
    expect(kenar('Beyaz')).toBe('hsl(var(--foreground))');
    expect(kenar('Siyah')).toBe('hsl(var(--foreground))');
    expect(kenar('Mavi')).toBe('hsl(var(--card))');
    const sutun = renderToStaticMarkup(<KategorikSutunGrafigi tablo={t} sutun={1} genislik={600} yukseklik={320} azaltilmisHareket />);
    expect(sutun).toMatch(/fill="#efe5d0" fill-opacity="0.9" stroke="hsl\(var\(--foreground\)\)"/);
  });

  it('uçtaki eksen etiketi grafiğin kenarından taşmaz ("40 000" gruplu harcama)', () => {
    const W = 846;
    const html = noktaCiz(harcama(), 1, { genislik: W, aralik: 10000 });
    expect(html).toContain('data-gruplar');
    for (const m of html.matchAll(/<text x="([\d.]+)"[^>]*data-eksen-isareti="true">([^<]+)</g)) {
      const yari = (m[2].length * 7.4) / 2;
      expect(Number(m[1]) + yari, m[2]).toBeLessThanOrEqual(W);
      expect(Number(m[1]) - yari, m[2]).toBeGreaterThanOrEqual(0);
    }
  });

  it("alt alta panellerde ortak eksen: iki panelin işaretleri aynı x'te (mac Selma / Yasemin)", () => {
    const t = sabitMac();
    const isaretler = (html: string) => Array.from(html.matchAll(/<text x="([\d.]+)"[^>]*data-eksen-isareti="true">([^<]+)</g), (m) => `${m[2]}@${m[1]}`);
    const ortak = { genislik: 846, yukseklik: 197, eksenAlani: { min: 5, max: 32 }, ortakYigin: 2 };
    const selma = isaretler(noktaCiz(t, 1, { ...ortak, baslik: 'Selma' }));
    expect(selma.length).toBeGreaterThan(3);
    expect(isaretler(noktaCiz(t, 2, { ...ortak, baslik: 'Yasemin', seriIndeksi: 1 }))).toEqual(selma);
  });

  it('kategorik sütun grafiğinde sıklık ve yüzde tek satırda "9 · %45" (nokta grafiğiyle aynı düzen)', () => {
    const t = kategorikTablo({ Elif: 9, Kaan: 6, Zeynep: 3, Mert: 2 });
    const html = renderToStaticMarkup(<KategorikSutunGrafigi tablo={t} sutun={1} genislik={846} yukseklik={438} azaltilmisHareket />);
    expect(html).toContain('data-siklik-yazisi="9 · %45"');
    expect(html).toContain('data-siklik-yazisi="2 · %10"');
  });
});
