// Sahip: D2 (vg/CizgiGrafigi.tsx, vg/DaireGrafigi.tsx, vg/SacilimGrafigi.tsx, vg/IstatistikPaneli.tsx)
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CIZGI_COK_NOKTA, CizgiGrafigi, degisimEtiketi, yuzdeAnlamli } from '../CizgiGrafigi';
import { DAIRE_COK_DILIM, DaireGrafigi, daireAdimi, daireDegerAyarla, daireSurukle, dilimOranlari, dilimRenkleri } from '../DaireGrafigi';
import { IstatistikPaneli, istatistikOndaligi, karsilastirmaYorumu } from '../IstatistikPaneli';
import { SacilimGrafigi, sacilimBalonu } from '../SacilimGrafigi';
import { payliGuzelEksen, seriRengi } from '../grafik';
import { ozetHesapla } from '../istatistik';
import {
  adVeBirim,
  bantSatirlari,
  bantYuksekligi,
  birimli,
  istemcidenYerele,
  metinGenisligi,
  metniSigdir,
  pngdenCikarilirMi,
  pngKlonuTemizle,
} from '../grafikOrtak';
import { frekansTablosu, kategorikFrekanslar } from '../KategorikGrafikler';
import { KATEGORI_PALETI, caprazSayim, renkEslemesi } from '../kategorik';
import { sayiOku, sayiYaz, tabloOlustur, type VeriTablosu as Tablo } from '../veri';
import { sabitBoy, sabitCalisma, sabitGun, sabitMac, sabitSicaklik } from './sabit-tablolar';

const bos = () => undefined;

describe('Veri ve Grafik uygulaması (sunucu tarafı akıllı çizim)', () => {
  // Özgün "sütun, çizgi ve daire …" testinin çizgi ve daire yarısı (sütun yarısı nokta-sutun.test.tsx'te)
  it('sütun, çizgi ve daire grafikleri hatalı hücreyle bile çökmeden çizilir: çizgi ve daire', () => {
    const tablo = tabloOlustur(['Ay', 'Sıcaklık', 'Nem'], [['Ocak', 4.5, 60], ['Şubat', 'hata', 55], ['Mart', 8.5, '']]);
    const ortak = { tablo, seciliSatir: 1, onSatirSec: bos, genislik: 640, yukseklik: 320, azaltilmisHareket: true };
    const cizgi = renderToStaticMarkup(<CizgiGrafigi {...ortak} onDegerDegis={bos} yuvarlamaAdimi={1} />);
    // Seçili satırda Sıcaklık boş; Nem 60 → 55 balonu (Δ yok)
    expect(cizgi).toContain('5 azalış (%8,3)');
    expect(cizgi).not.toContain('Δ');
    expect(cizgi).toContain('Nem');
    const daire = renderToStaticMarkup(<DaireGrafigi {...ortak} sutun={2} onDegerlerDegis={bos} />);
    expect(daire).toContain('°');
    expect(daire).toMatch(/%\d/); // yüzde biçimi her yerde '%13' (boşluksuz)
    expect(daire).not.toContain('% ');
  });

  it('istatistik paneli adımları gösterir', () => {
    const html = renderToStaticMarkup(
      <IstatistikPaneli tablo={sabitMac()} sutun={1} seciliSatir={null} onSatirSec={bos} adimlariGoster onAdimlariGoster={bos} />,
    );
    expect(html).toContain('Aritmetik ortalama');
    expect(html).toContain('Tepe değer');
    expect(html).toContain('bütün değerler eşit sıklıkta (her biri 1 kez)');
    expect(html).toContain('85');
    expect(html).toContain('6,4');
    // Fark (+ / −) ve ortalamaya uzaklık: mutlak değer çizgileri kenarlıklı span, yazıyla '|' yok
    expect(html).toContain('>+1<');
    expect(html).toContain('>−12<');
    expect(html).toContain('<span class="sr-only">mutlak değer </span>−12</span>');
    expect(html).not.toContain('|');
  });

  it('çizgi grafiği yalnız istenen sütunları çizer; daire grafiği negatif değeri açıkça reddeder', () => {
    const mac = sabitMac();
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

  it('saçılım grafiği: her satır bir (x; y) noktası, eksen adları ve eksik değer notu', () => {
    const mac = sabitMac();
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

  // Özgün "yardımcılar: değişim etiketi ve paylı eksen" testinin değişim etiketi yarısı (paylı eksen nokta-sutun.test.tsx'te)
  it('yardımcılar: değişim etiketi ve paylı eksen: değişim etiketi', () => {
    expect(degisimEtiketi(20, 25)).toBe('5 artış');
    expect(degisimEtiketi(20, 25, { yuzde: true })).toBe('5 artış (%25)');
    expect(degisimEtiketi(20, 15, { yuzde: true })).toBe('5 azalış (%25)');
    expect(degisimEtiketi(0, 3, { yuzde: true })).toBe('3 artış');
  });
});

describe('renk anahtarı: kategoriye göre renklendirme (bütün grafikler, istatistik, tablo)', () => {
  const t = sabitCalisma();
  const eslem = renkEslemesi(t, 1)!;
  const dolgular = (html: string, r: string) => new Set(Array.from(html.matchAll(new RegExp(`<circle r="${r}" fill="([^"]+)"`, 'g')), (e) => e[1]));

  it('saçılım: noktalar iki renkte, lejantta kategori ve sayı; renksizde tek renk ve lejant yok', () => {
    const ortak = { tablo: t, xSutun: 2, ySutun: 3, seciliSatir: null, onSatirSec: bos, genislik: 700, yukseklik: 380, azaltilmisHareket: true };
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

  it('çizgi grafiği: her kategori kendi renginde ayrı çizgi; ikinci seri kesikli; renksizde tek çizgi', () => {
    const ortak = { tablo: t, seciliSatir: null, onSatirSec: bos, onDegerDegis: bos, yuvarlamaAdimi: 1, genislik: 700, yukseklik: 360, azaltilmisHareket: true };
    const html = renderToStaticMarkup(<CizgiGrafigi {...ortak} sutunlar={[3]} renkEslemi={eslem} />);
    expect(html).toContain('data-renk-lejanti');
    const gruplar = Array.from(html.matchAll(/<path d="([^"]+)" fill="none" stroke="([^"]+)"[^>]*data-cizgi-grubu="([^"]*)"/g), (e) => ({ d: e[1], renk: e[2], ad: e[3] }));
    expect(gruplar.map((g) => g.ad)).toEqual(['A', 'B']);
    expect(gruplar.map((g) => g.renk)).toEqual([eslem.renkler.get('A'), eslem.renkler.get('B')]);
    // A'nın son noktası B'nin ilk noktasına bağlanmaz: her çizgi yalnız kendi 10 satırından geçer
    for (const g of gruplar) expect(g.d.match(/[ML]/g)).toHaveLength(10);
    const noktaRenkleri = Array.from(html.matchAll(/<circle cx="[^"]+" cy="[^"]+" r="5.5" fill="([^"]+)"/g), (e) => e[1]);
    expect(noktaRenkleri.filter((r) => r === eslem.renkler.get('A'))).toHaveLength(10);
    expect(noktaRenkleri.filter((r) => r === eslem.renkler.get('B'))).toHaveLength(10);

    const iki = renderToStaticMarkup(<CizgiGrafigi {...ortak} sutunlar={[2, 3]} renkEslemi={eslem} />);
    expect(iki.match(/data-cizgi-grubu=/g)).toHaveLength(4);
    expect(iki.match(/<path [^>]*stroke-dasharray="7 5"/g)).toHaveLength(2);
    expect(iki.match(/data-seri-ornegi/g)).toHaveLength(2);

    const tek = renderToStaticMarkup(<CizgiGrafigi {...ortak} sutunlar={[3]} />);
    expect(tek).not.toContain('data-renk-lejanti');
    expect(tek).not.toContain('data-cizgi-grubu');
    expect(tek.match(/<path d="M/g)).toHaveLength(1);
  });

  it('daire grafiği: dilimler satırın kategori renginde; lejantta kategorilerin toplamdaki payı', () => {
    const ortak = { tablo: t, sutun: 2, seciliSatir: null, onSatirSec: bos, onDegerlerDegis: bos, genislik: 800, yukseklik: 420, azaltilmisHareket: true };
    const html = renderToStaticMarkup(<DaireGrafigi {...ortak} renkEslemi={eslem} />);
    const dilimler = Array.from(html.matchAll(/<path d="[^"]+" fill="([^"]+)" fill-opacity/g), (e) => e[1]);
    expect(dilimler).toHaveLength(20);
    expect(new Set(dilimler)).toEqual(new Set([eslem.renkler.get('A'), eslem.renkler.get('B')]));
    const toplamlar: Record<string, number> = { A: 0, B: 0 };
    t.satirlar.forEach((r) => (toplamlar[r.hucreler[1]] += sayiOku(r.hucreler[2]) ?? 0));
    const toplam = toplamlar.A + toplamlar.B;
    expect(html).toContain('data-renk-lejanti');
    expect(html).toContain(`A %${sayiYaz((toplamlar.A / toplam) * 100, 1)}`);
    expect(html).toContain(`B %${sayiYaz((toplamlar.B / toplam) * 100, 1)}`);
    expect(renderToStaticMarkup(<DaireGrafigi {...ortak} />)).not.toContain('data-renk-lejanti');
  });

  it('istatistik: gruplara göre özet tablosu (her grup ve tümü); anahtar yoksa tablo yok', () => {
    const ortak = { tablo: t, sutun: 3, seciliSatir: null, onSatirSec: bos, adimlariGoster: true, onAdimlariGoster: bos };
    const html = renderToStaticMarkup(<IstatistikPaneli {...ortak} renkEslemi={eslem} />);
    expect(html).toContain('data-grup-istatistikleri');
    const ortalama = (k: string) => {
      const v = t.satirlar.filter((r) => r.hucreler[1] === k).map((r) => sayiOku(r.hucreler[3]) ?? 0);
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
});

describe('grafik düzeni: daire lejantı sığar, çizgi lejantı ada göre, tablo başlığında tür düğmesi', () => {
  it('daire: çok dilimde lejant satırları sıklaşır, sığmayanlar "… ve k dilim daha" olur', () => {
    const cok = tabloOlustur(['Ad', 'Değer'], Array.from({ length: 40 }, (_, i) => [`Satır ${i + 1}`, i + 1]));
    const ortak = { seciliSatir: null, onSatirSec: bos, onDegerlerDegis: bos, sutun: 1, azaltilmisHareket: true };
    const dar = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={cok} genislik={800} yukseklik={300} />);
    expect(dar).toContain('data-lejant-kirpildi');
    expect(dar).toMatch(/ve \d+ dilim daha/);
    const az = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={sabitGun()} genislik={800} yukseklik={400} />);
    expect(az).not.toContain('data-lejant-kirpildi');
    // 24 satırlı boy verisi 480 px yükseklikte kırpılmadan sığar (satır aralığı daralır)
    const boy = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={sabitBoy()} genislik={800} yukseklik={480} />);
    expect(boy).not.toContain('data-lejant-kirpildi');
    expect(boy).toContain('Kaan');
  });

  it('çizgi: tek seride lejant yerine dikey eksen adı; iki seride adlar sığdıkça kısalmaz, sığmazsa kısalır', () => {
    const t = tabloOlustur(['Ay', 'Aylık ortalama sıcaklık (derece)', 'Nem'], [['Ocak', 4, 70], ['Şubat', 6, 65]]);
    const ortak = { tablo: t, seciliSatir: null, onSatirSec: bos, onDegerDegis: bos, yuvarlamaAdimi: 1, genislik: 700, yukseklik: 320, azaltilmisHareket: true };
    const tek = renderToStaticMarkup(<CizgiGrafigi {...ortak} sutunlar={[1]} />);
    expect(tek).toContain('↑ Aylık ortalama sıcaklık (derece)');
    expect(tek).not.toContain('data-seri-ornegi');
    expect(tek).toContain('Ay →');
    const iki = renderToStaticMarkup(<CizgiGrafigi {...ortak} sutunlar={[1, 2]} />);
    expect(iki).toContain('>Aylık ortalama sıcaklık (derece)<');
    expect(iki).toContain('>Nem<');
    expect(iki.match(/data-seri-ornegi/g)).toHaveLength(2);
    expect(iki).not.toContain('↑');
    // Dar grafikte adlar eşit paya kısalır (boşluk bırakmadan "…")
    const dar = renderToStaticMarkup(<CizgiGrafigi {...ortak} sutunlar={[1, 2]} genislik={300} />);
    expect(dar).toMatch(/>Aylık[^<]*…</);
    expect(dar).not.toMatch(/ …</);
  });
});

describe('istatistik paneli: ders kitabı düzeni, adımlar ve karşılaştırma (M01, M02, M04, M14)', () => {
  const panel = (tablo: Tablo, sutun: number, ek: Partial<React.ComponentProps<typeof IstatistikPaneli>> = {}) =>
    renderToStaticMarkup(<IstatistikPaneli tablo={tablo} sutun={sutun} seciliSatir={null} onSatirSec={bos} adimlariGoster onAdimlariGoster={bos} {...ek} />);
  /** Görünen metin: etiketler atılır, varlıklar çözülür, bölük boşluğu korunur */
  const metin = (html: string) =>
    html
      .replace(/<!-- -->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/[ \t\n]+/g, ' ');
  const sayi = (s: string) => Number(s.replace(/ /g, '').replace(/[()]/g, '').replace('−', '-').replace(',', '.'));
  /** "Ad = a + b + … = S" satırındaki terimlerin toplamı S'yi tutar */
  const toplamiTutar = (html: string, ad: string) => {
    const m = metin(html).match(new RegExp(`${ad} = ([^=]+?) = ([−\\d\\u00a0,]+)`));
    expect(m, ad).not.toBeNull();
    const terimler = m![1].split(' + ').map(sayi);
    const toplam = Math.round(terimler.reduce((a, b) => a + b, 0) * 1e4) / 1e4;
    expect(toplam, ad).toBe(sayi(m![2]));
  };

  it('kartlar iki başlıkta; başlıkta veri sayısı; formüller sözle; açıklık tek kartta', () => {
    const html = panel(sabitMac(), 1, { adimlariGoster: false });
    expect(html).toContain('Merkezi eğilim ölçüleri');
    expect(html).toContain('Yayılım ölçüleri');
    expect(html).toContain('Veri sayısı: 5');
    expect(html).toContain('verilerin toplamı ÷ veri sayısı');
    expect(html).toContain('ortalamaya uzaklıkların toplamı ÷ veri sayısı');
    const aciklik = metin(html.slice(html.indexOf('data-istatistik-karti="aciklik"')));
    expect(aciklik).toContain('32 − 5 = 27');
    const ortanca = html.indexOf('data-istatistik-karti="ortanca"');
    const tepe = html.indexOf('data-istatistik-karti="tepe"');
    expect(html.indexOf('data-istatistik-karti="ortalama"')).toBeLessThan(ortanca);
    expect(ortanca).toBeLessThan(tepe);
    expect(tepe).toBeLessThan(html.indexOf('data-istatistik-karti="aciklik"'));
    expect(html.indexOf('data-istatistik-karti="aciklik"')).toBeLessThan(html.indexOf('data-istatistik-karti="oms"'));
  });

  it('çıktıda eski gösterimler yok: x̄, Σ, Δ, Medyan, Gözlem, birleşik üst çizgi, "n ="', () => {
    const t = sabitCalisma();
    const eslem = renkEslemesi(t, 1)!;
    for (const html of [panel(sabitMac(), 1), panel(sabitMac(), 1, { ikinciSutun: 2 }), panel(t, 2, { renkEslemi: eslem }), panel(sabitGun(), 1)]) {
      for (const yasak of ['x̄', 'Σ', 'Δ', 'Medyan', 'medyan', 'Gözlem', '̄', 'n =', 'OMS']) expect(html, yasak).not.toContain(yasak);
      expect(html).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('adımlarda gösterilen terimlerin toplamı gösterilen toplamı tutar (2 ve 2,55; sabitCalisma çalışma)', () => {
    const iki = panel(tabloOlustur(['Ad', 'Değer'], [['A', 2], ['B', 2.55]]), 1);
    toplamiTutar(iki, 'Verilerin toplamı');
    toplamiTutar(iki, 'Uzaklıkların toplamı');
    expect(metin(iki)).toContain('Aritmetik ortalama = 4,55 ÷ 2 = 2,275');
    expect(metin(iki)).not.toContain('4,55 ÷ 2 ≈');
    expect(metin(iki)).toContain('(kartta ≈ 2,28)');
    const calisma = panel(sabitCalisma(), 2);
    toplamiTutar(calisma, 'Verilerin toplamı');
    toplamiTutar(calisma, 'Uzaklıkların toplamı');
    expect(metin(calisma)).toContain('Ortalama mutlak sapma = 45,5 ÷ 20 = 2,275');
    expect(metin(calisma)).toContain('(kartta ≈ 2,28)');
    expect(metin(calisma)).toContain('20 veri var (çift): 10. ve 11. verinin ortalaması.');
    expect(calisma).toContain('data-fark-toplami="true">0<');
  });

  it('sonlu olmayan ortalamada ≈ ve yuvarlama notu; negatif sayılar parantezli ve gerçek eksiyle', () => {
    const t = tabloOlustur(['Gün', 'Sıcaklık'], [['1', -3], ['2', 2], ['3', 5]]);
    const html = metin(panel(t, 1));
    expect(html).toContain('Verilerin toplamı = (−3) + 2 + 5 = 4');
    expect(html).toContain('Aritmetik ortalama = 4 ÷ 3 ≈ 1,33');
    expect(html).toContain('farkları yuvarlanmış ortalamayla (≈ 1,33) hesapladık');
    expect(html).toContain('Açıklık = en büyük − en küçük = 5 − (−3) = 8');
    toplamiTutar(panel(t, 1), 'Uzaklıkların toplamı');
    expect(html).not.toContain('-3');
  });

  it('30 veriden çokta sıklık tablosu ve kısaltılmış toplam', () => {
    const v = Array.from({ length: 40 }, (_, i) => [30, 60, 90, 120, 120, 150, 180, 240][i % 8]);
    const html = panel(tabloOlustur(['Katılımcı', 'Süre'], v.map((x, i) => [`K${i + 1}`, x])), 1);
    expect(html).toContain('data-siklik-tablosu');
    expect(html).not.toContain('data-oms-tablosu');
    expect(metin(html)).toMatch(/Verilerin toplamı = 30 \+ 60 \+ 90 \+ … \(40 veri\) = 4950/);
    expect(metin(html)).toContain('40 veri var (çift): 20. ve 21. verinin ortalaması.');
    for (const b of ['Değer × sıklık', 'Ortalamaya uzaklık', 'Sıklık × uzaklık']) expect(html).toContain(b);
    // Sıklık tablosunda fark sütunu yok: denge iki yanın uzaklık toplamlarıyla anlatılır
    expect(metin(html)).toContain('Ortalamanın altındaki verilerin uzaklıkları toplamı 993,75, üstündekilerinki 993,75: iki yan dengede (farkların toplamı 0).');
    expect(metin(html)).not.toContain('Farkların toplamı 0:');
  });

  it('renk anahtarında "Gruplara göre" tablosu: adımlar kapalıyken kartların altında, açıkken adımların altında', () => {
    const t = sabitCalisma();
    const eslem = renkEslemesi(t, 1)!;
    const kapali = panel(t, 2, { renkEslemi: eslem, adimlariGoster: false });
    expect(kapali.indexOf('data-olcu-kartlari')).toBeLessThan(kapali.indexOf('data-grup-istatistikleri'));
    const acik = panel(t, 2, { renkEslemi: eslem });
    expect(acik.match(/data-grup-istatistikleri/g)).toHaveLength(1);
    expect(acik.indexOf('data-hesaplama-adimlari')).toBeGreaterThan(acik.indexOf('data-olcu-kartlari'));
    expect(acik.indexOf('data-grup-istatistikleri')).toBeGreaterThan(acik.lastIndexOf('data-hesap-adimi='));
  });

  it('tepe değer: eşit sıklıkta "yok", birden çoksa " ve " ile', () => {
    const esit = metin(panel(tabloOlustur(['A', 'B'], [['a', 1], ['b', 1], ['c', 2], ['d', 2]]), 1));
    expect(esit).toContain('tepe değer yok');
    const iki = metin(panel(tabloOlustur(['A', 'B'], [['a', 1], ['b', 1], ['c', 2], ['d', 2], ['e', 3]]), 1));
    expect(iki).toContain('tepe değer 1 ve 2');
  });

  it('ikinciSutun: iki sütunlu karşılaştırma tablosu, ortalama mutlak sapma çubukları ve yorum satırı', () => {
    const html = panel(sabitMac(), 1, { ikinciSutun: 2, adimlariGoster: false });
    expect(html).toContain('data-karsilastirma-tablosu');
    expect(html).not.toContain('data-olcu-kartlari');
    const baslik = html.slice(html.indexOf('<thead>'), html.indexOf('</thead>'));
    expect(metin(baslik).trim()).toBe('Ölçü Selma Yasemin');
    expect(html.match(/data-oms-cubugu/g)).toHaveLength(2);
    const oms = html.slice(html.indexOf('data-oms-satiri'), html.indexOf('</tr>', html.indexOf('data-oms-satiri')));
    expect(metin(oms)).toContain('6,4');
    expect(metin(oms)).toContain('1,2');
    expect(oms).toContain('width:100%');
    expect(oms).toContain(`width:${(1.2 / 6.4) * 100}%`);
    expect(metin(html)).toContain('Ortalamalar eşit (17); ortalama mutlak sapması küçük olan Yasemin: değerleri ortalamaya daha yakın (1,2 < 6,4).');
    // adımlar her iki değişken için ayrı başlıkla
    const adimli = panel(sabitMac(), 1, { ikinciSutun: 2 });
    expect(adimli).toContain('Selma: hesaplama adımları');
    expect(adimli).toContain('Yasemin: hesaplama adımları');
    expect(adimli.match(/data-hesaplama-adimlari/g)).toHaveLength(2);
    // geçersiz ikinci sütun (aynı sütun, etiket sütunu) tek değişken görünümüne döner
    expect(panel(sabitMac(), 1, { ikinciSutun: 1 })).toContain('data-olcu-kartlari');
    expect(panel(sabitMac(), 1, { ikinciSutun: 0 })).toContain('data-olcu-kartlari');
  });

  it('karşılaştırma yorumu: ortalaması büyük olanı ve sapmaları eşit durumu yazar (nötr dil, birim ayracı yok, ≈ başta bir kez)', () => {
    const a = { ad: 'A', ozet: ozetHesapla([10, 20]) };
    const b = { ad: 'B', ozet: ozetHesapla([14, 15]) };
    expect(karsilastirmaYorumu(a, b, 2)).toBe('Ortalaması büyük olan A (15 > 14,5); ortalama mutlak sapması küçük olan B: değerleri ortalamaya daha yakın (0,5 < 5).');
    // iklim: sıcaklıkta "istikrarlı" denmez; "(°C)" cümlede yazılmaz; yuvarlanan sayılarda "≈" bir kez, başta
    const izmir = { ad: 'İzmir (°C)', ozet: ozetHesapla([9.2, 9.9, 12.1, 15.9, 20.6, 25.3, 27.8, 27.5, 23.6, 19, 14.2, 10.6]) };
    const erzurum = { ad: 'Erzurum (°C)', ozet: ozetHesapla([-9.1, -7.6, -2.3, 5.4, 10.7, 14.9, 19.2, 19.6, 14.8, 8.2, 1.2, -5.7]) };
    const iklim = karsilastirmaYorumu(izmir, erzurum, 2)!;
    expect(iklim).not.toMatch(/istikrarlı|\(°C\)/);
    expect(iklim).toMatch(/^Ortalaması büyük olan İzmir \(≈ [\d,]+ > [\d,]+\); ortalama mutlak sapması küçük olan İzmir: değerleri ortalamaya daha yakın \(≈ [\d,]+ < [\d,]+\)\.$/);
    expect(iklim.match(/≈/g)).toHaveLength(2);
    expect(karsilastirmaYorumu(a, { ad: 'C', ozet: ozetHesapla([0, 10]) }, 2)).toContain('ortalama mutlak sapmalar da eşit (5)');
    expect(karsilastirmaYorumu(a, { ad: 'D', ozet: ozetHesapla([]) }, 2)).toBeNull();
  });
});

describe('PNG çıktısı ve işaretçi koordinatı (M16, M42)', () => {
  /** Sunucu çiziminden küçük bir ağaç (yalnız bu testler için: öğe adı, nitelikler, çocuklar) */
  class Oge {
    cocuklar: Oge[] = [];
    ebeveyn: Oge | null = null;
    constructor(
      public ad: string,
      public nitelikler: Record<string, string> = {},
    ) {}
    tumu(): Oge[] {
      return this.cocuklar.flatMap((c) => [c, ...c.tumu()]);
    }
    hasAttribute(a: string) {
      return a in this.nitelikler;
    }
    getAttribute(a: string) {
      return this.nitelikler[a] ?? null;
    }
    querySelector(s: string) {
      if (s !== 'text') throw new Error(`beklenmeyen seçici ${s}`);
      return this.tumu().find((o) => o.ad === 'text') ?? null;
    }
    querySelectorAll(s: string) {
      expect(s).toBe('[data-yalniz-ekran], [role="slider"]');
      return this.tumu().filter((o) => o.hasAttribute('data-yalniz-ekran') || o.getAttribute('role') === 'slider');
    }
    contains(o: unknown) {
      return this.tumu().includes(o as Oge);
    }
    remove() {
      if (!this.ebeveyn) return;
      this.ebeveyn.cocuklar = this.ebeveyn.cocuklar.filter((c) => c !== this);
      this.ebeveyn = null;
    }
  }
  const agac = (html: string): Oge => {
    const kok = new Oge('#kok');
    let simdiki = kok;
    for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
      if (m[1]) {
        simdiki = simdiki.ebeveyn ?? kok;
        continue;
      }
      const nitelikler: Record<string, string> = {};
      for (const n of m[3].matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) nitelikler[n[1]] = n[2] ?? '';
      const oge = new Oge(m[2], nitelikler);
      oge.ebeveyn = simdiki;
      simdiki.cocuklar.push(oge);
      if (!m[4]) simdiki = oge;
    }
    return kok;
  };

  it('klon temizliği: tutamaçlar ve data-yalniz-ekran çıkar; çizgi noktaları ve değer etiketli tutamaçlar kalır', () => {
    const ortak = { seciliSatir: null, onSatirSec: bos, genislik: 700, yukseklik: 380, azaltilmisHareket: true };
    const daire = agac(renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={sabitGun()} sutun={1} onDegerlerDegis={bos} />));
    const dilimSayisi = daire.tumu().filter((o) => o.ad === 'path').length;
    expect(daire.tumu().filter((o) => o.getAttribute('role') === 'slider').length).toBeGreaterThan(0);
    const silinen = pngKlonuTemizle(daire);
    expect(silinen).toBeGreaterThan(0);
    expect(daire.tumu().some((o) => o.getAttribute('role') === 'slider' || o.hasAttribute('data-yalniz-ekran'))).toBe(false);
    expect(daire.tumu().filter((o) => o.ad === 'path').length).toBe(dilimSayisi);

    const cizgi = agac(renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={sabitMac()} sutunlar={[1]} onDegerDegis={bos} yuvarlamaAdimi={1} />));
    const noktalar = () => cizgi.tumu().filter((o) => o.ad === 'circle' && o.getAttribute('r') === '5.5').length;
    expect(noktalar()).toBe(5);
    pngKlonuTemizle(cizgi);
    expect(noktalar()).toBe(5);

    // Elle kurulan ağaç: odak halkası (data-yalniz-ekran) değer etiketli tutamacın içinden de çıkar
    const kok = new Oge('svg');
    const tutamac = new Oge('g', { role: 'slider' });
    const etiket = new Oge('text');
    const halka = new Oge('circle', { 'data-yalniz-ekran': '' });
    for (const [e, c] of [[kok, tutamac], [tutamac, etiket], [tutamac, halka]] as const) {
      c.ebeveyn = e;
      e.cocuklar.push(c);
    }
    expect(pngKlonuTemizle(kok)).toBe(1);
    expect(kok.tumu().map((o) => o.ad)).toEqual(['g', 'text']);
    expect(pngdenCikarilirMi(new Oge('g', { role: 'slider' }))).toBe(true);
    expect(pngdenCikarilirMi(new Oge('g', { role: 'slider', 'data-png-kalir': '' }))).toBe(false);
    expect(pngdenCikarilirMi(new Oge('rect'))).toBe(false);
  });

  it('başlık bandı: 40 px, alt başlıkla 56 px; uzun başlık iki satıra bölünür ve kısalır', () => {
    expect(bantYuksekligi(1, false)).toBe(40);
    expect(bantYuksekligi(1, true)).toBe(56);
    expect(bantYuksekligi(2, true)).toBe(76);
    const olc = (m: string) => m.length * 8;
    expect(bantSatirlari('Sınıfımızda en çok sevilen meyve', olc, 400)).toEqual(['Sınıfımızda en çok sevilen meyve']);
    const iki = bantSatirlari('Sınıfımızda en çok sevilen meyve hangisi ve neden bu kadar çok seviliyor', olc, 200);
    expect(iki).toHaveLength(2);
    expect(iki.every((s) => olc(s) <= 200)).toBe(true);
    expect(iki[1].endsWith('…')).toBe(true);
    expect(bantSatirlari('  ', olc, 200)).toEqual([]);
  });

  it('svgKonumu ölçekli pencerede: (clientX − sol) × (yerleşim genişliği ÷ ekran genişliği); viewBox birimine çevirir', () => {
    // Pencere %50 ölçekte: 640 px'lik SVG ekranda 320 px
    const kutu = { left: 100, top: 50, width: 320, height: 160 };
    expect(istemcidenYerele(260, 130, kutu, { genislik: 640, yukseklik: 320 })).toEqual({ x: 320, y: 160 });
    // Ölçek yoksa doğrudan
    expect(istemcidenYerele(110, 60, { left: 100, top: 50, width: 640, height: 320 }, { genislik: 640, yukseklik: 320 })).toEqual({ x: 10, y: 10 });
    // viewBox yerleşimle aynıysa değişmez; küçültülmüş çizimde viewBox birimi (meet, ortalı)
    expect(istemcidenYerele(260, 130, kutu, { genislik: 640, yukseklik: 320 }, { x: 0, y: 0, width: 640, height: 320 })).toEqual({ x: 320, y: 160 });
    expect(istemcidenYerele(100 + 160, 50 + 80, kutu, { genislik: 640, yukseklik: 320 }, { x: 0, y: 0, width: 1280, height: 640 })).toEqual({ x: 640, y: 320 });
    const ortali = istemcidenYerele(100, 50, { left: 100, top: 50, width: 640, height: 400 }, { genislik: 640, yukseklik: 400 }, { x: 0, y: 0, width: 640, height: 320 });
    expect(ortali).toEqual({ x: 0, y: -40 });
    // Boyut okunamazsa (0) ölçek 1
    expect(istemcidenYerele(110, 60, { left: 100, top: 50, width: 0, height: 0 }, { genislik: 0, yukseklik: 0 })).toEqual({ x: 10, y: 10 });
  });
});

// ── D2-b: daire sürüklemesi, dilim renkleri ve etiketleri, çizgi değişim etiketi, saçılım balonu, yazı boyu ──────

/** HTML'deki görünür metin (etiketler atılır, varlıklar çözülür) */
const gorunen = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');
const degerleri = (t: Tablo, sutun: number) => t.satirlar.map((r) => sayiOku(r.hucreler[sutun]) ?? 0);
const toplami = (d: number[]) => Math.round(d.reduce((a, b) => a + b, 0) * 1e9) / 1e9;

describe('daire sürüklemesi: anlık görüntüden, adıma oturan değerler, toplam birebir (M06)', () => {
  it('gun (sabit): Uyku sınırı 135° → 200° → 90° → 135° yarım derecelik adımlarla; her adımda toplam 24, sonda değerler özgün', () => {
    const anlik = degerleri(sabitGun(), 1);
    expect(toplami(anlik)).toBe(24);
    const adim = daireAdimi(anlik, 1);
    expect(adim).toBe(0.5); // 2,5 ve 1,5 saatlik veri: 1 saatlik yuvarlama adımı verinin çözünürlüğüne iner
    let son = anlik;
    let olay = 0;
    const git = (a0: number, a1: number, d: number) => {
      for (let a = a0; d > 0 ? a <= a1 : a >= a1; a += d) {
        son = daireSurukle(anlik, 0, a, adim);
        olay++;
        expect(toplami(son)).toBe(24);
        for (const v of son) expect(Math.abs(v / 0.5 - Math.round(v / 0.5))).toBeLessThan(1e-9);
      }
    };
    git(135, 200, 0.5);
    expect(son[0]).toBe(13.5); // 200° → 13,33 saat → 13,5
    git(200, 90, -0.5);
    expect(son[0]).toBe(6);
    git(90, 135, 0.5);
    expect(olay).toBeGreaterThan(400);
    expect(son).toEqual(anlik);
  });

  it('tam saatli gün: adım 1, ötekiler orantılı küçülür ve en büyük kalanla 24 eder; tek dilimde değişmez', () => {
    const gun = [9, 1, 7, 1, 2, 2, 2];
    expect(daireAdimi(gun, 1)).toBe(1);
    const onBir = daireDegerAyarla(gun, 0, 11, 1);
    expect(onBir[0]).toBe(11);
    expect(toplami(onBir)).toBe(24);
    expect(onBir.every((v) => Number.isInteger(v))).toBe(true);
    // Klavye: +1 sonra −1 (anlık görüntüden) özgün değerleri verir
    expect(daireDegerAyarla(gun, 0, 10, 1)).not.toEqual(gun);
    expect(daireDegerAyarla(gun, 0, 9, 1)).toEqual(gun);
    // Sınırlar: 0 ile toplam arasında
    expect(daireDegerAyarla(gun, 0, 40, 1)).toEqual([24, 0, 0, 0, 0, 0, 0]);
    expect(daireDegerAyarla([24], 0, 5, 1)).toEqual([24]);
  });

  it("daireAdimi: harcama 100 000 TL → 1 000; ince veri çözünürlüğe iner; 0,01'in katı olmayan veride yuvarlama yok", () => {
    expect(daireAdimi([25000, 35000, 10000, 10000, 5000, 5000, 10000], 1)).toBe(1000);
    expect(daireAdimi([25000, 35000, 10500, 9500, 5000, 5000, 10000], 1)).toBe(500);
    expect(daireAdimi([3, 4.5, 2.5], 1)).toBe(0.5);
    expect(daireAdimi([3, 4.5, 2.5], 0.1)).toBe(0.1);
    expect(daireAdimi([1.2345, 2], 1)).toBeNull();
    expect(daireAdimi([0, 0], 1)).toBeNull();
    // Harcama: 1 000 TL adımla toplam korunur
    const harcama = [25000, 35000, 10000, 10000, 5000, 5000, 10000];
    const yeni = daireSurukle(harcama, 6, 70, 1000);
    expect(toplami(yeni)).toBe(100000);
    expect(yeni.every((v) => v % 1000 === 0)).toBe(true);
  });

  it('yüzdeler ve merkez açılar en büyük kalanla: toplam %100 ve 360°; lejant ve dilimler aynı değerleri yazar', () => {
    const o = dilimOranlari([1, 1, 1]);
    expect(o.yuzdeler).toEqual([33.4, 33.3, 33.3]);
    expect(o.acilar).toEqual([120, 120, 120]);
    const g = dilimOranlari(degerleri(sabitGun(), 1));
    expect(toplami(g.yuzdeler)).toBe(100);
    expect(toplami(g.acilar)).toBe(360);
    expect(g.acilar[0]).toBe(135);
    expect(dilimOranlari([0, 0]).yuzdeler).toEqual([0, 0]);
    const html = renderToStaticMarkup(
      <DaireGrafigi tablo={tabloOlustur(['A', 'B'], [['a', 1], ['b', 1], ['c', 1]])} sutun={1} seciliSatir={null} onSatirSec={bos} onDegerlerDegis={bos} genislik={800} yukseklik={420} azaltilmisHareket />,
    );
    expect(html).toContain('a: 1 (120°, %33,4)');
    expect(html).toContain('b: 1 (120°, %33,3)');
  });
});

describe('daire: renkler, etiketler, tutamaçlar, merkez açı ve hesap şeridi (M09, M32, M21)', () => {
  const ortak = { seciliSatir: null, onSatirSec: bos, onDegerlerDegis: bos, genislik: 846, yukseklik: 470, azaltilmisHareket: true };
  const dilimRenkleriHtml = (html: string) => Array.from(html.matchAll(/<path d="[^"]+" fill="([^"]+)" fill-opacity/g), (e) => e[1]);

  it('gun (sabit): 12 renkli paletten, Uyku ile Diğer farklı; komşular ve son–ilk farklı', () => {
    const renkler = dilimRenkleriHtml(renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={sabitGun()} sutun={1} />));
    expect(renkler).toHaveLength(6);
    expect(new Set(renkler).size).toBe(6);
    expect(renkler[0]).not.toBe(renkler[5]);
    for (const r of renkler) expect(KATEGORI_PALETI as readonly string[]).toContain(r);
    // 13 dilimde palet döner ama son dilim ilk dilimle aynı renkte olmaz
    const onUc = dilimRenkleri(Array.from({ length: 13 }, (_, i) => `K${i}`));
    expect(onUc[12]).not.toBe(onUc[0]);
    onUc.forEach((r, i) => i > 0 && expect(r).not.toBe(onUc[i - 1]));
    // Adı renk olan iki komşu (Kırmızı ve kırmızımsı ad) aynı rengi almaz
    const adli = dilimRenkleri(['Kırmızı', 'kırmızı kalem']);
    expect(adli[0]).not.toBe(adli[1]);
  });

  it('küçük dilimin etiketi dışarıda, kılavuz çizgili (ad: ° · %); büyüklerde içeride ad, açı ve yüzde', () => {
    const gun = tabloOlustur(['Etkinlik', 'Süre (saat)'], [['Uyku', 9], ['Yol', 1], ['Okul', 7], ['Yemek', 1], ['Ödev', 2], ['Oyun ve spor', 2], ['Diğer', 2]]);
    const html = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={gun} sutun={1} />);
    const metin = gorunen(html);
    expect(metin).toContain('Yol: 15° · %4,2');
    expect(metin).toContain('Yemek: 15° · %4,2');
    expect(html.match(/data-dilim-etiketi="dis"/g)).toHaveLength(2);
    expect(html.match(/<polyline /g)).toHaveLength(2);
    expect(metin).toMatch(/Uyku 135° %37,5/);
    expect(metin).toMatch(/Okul 105° %29,2/);
  });

  it('tutamaç yalnız seçili dilimde görünür (dokunma alanı her sınırda); merkez açı yayı ve hesap şeridi', () => {
    const t = sabitGun();
    const secimsiz = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={t} sutun={1} />);
    expect(secimsiz.match(/role="slider"/g)).toHaveLength(6);
    expect(secimsiz).not.toContain('data-tutamac');
    expect(secimsiz).not.toContain('data-merkez-acisi');
    expect(secimsiz).toContain('data-daire-ipucu');
    const secili = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={t} sutun={1} seciliSatir={0} />);
    expect(secili.match(/data-tutamac/g)).toHaveLength(1);
    expect(secili).toContain('data-merkez-acisi');
    expect(gorunen(secili)).toContain('Uyku: 9 ÷ 24 × 360° = 135° · %37,5');
    // Tam çıkmayan yüzde ≈ ile
    const yemek = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={t} sutun={1} seciliSatir={4} />);
    expect(gorunen(yemek)).toContain('Yemek: 1,5 ÷ 24 × 360° = 22,5° · ≈ %6,3');
    // Sıklık dilimleri (sürükleme kapalı): tutamaç yok
    const kapali = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={t} sutun={1} surukleKapali />);
    expect(kapali).not.toContain('role="slider"');
  });

  it('boş durumlar: veri yoksa "Grafik için veri yok"; hepsi 0 ise ortada "Daire için pozitif değerler gerekir"', () => {
    const bosTablo = tabloOlustur(['Ad', 'Değer'], [['a', ''], ['b', '']]);
    const b = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={bosTablo} sutun={1} />);
    expect(b).toContain('Grafik için veri yok');
    expect(b).not.toContain('pozitif değerler');
    const sifir = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={tabloOlustur(['Ad', 'Değer'], [['a', 0], ['b', 0]])} sutun={1} />);
    expect(sifir).toContain('Daire için pozitif değerler gerekir');
    expect(sifir).toMatch(/<text x="423"[^>]*data-daire-sifir/);
    expect(sifir).not.toContain('Grafik için veri yok');
  });

  it(`${DAIRE_COK_DILIM}'tan çok dilimde etiket ve tutamaç yok; dilimler tek sekme durağı (roving)`, () => {
    const cok = tabloOlustur(['Ad', 'Değer'], Array.from({ length: 60 }, (_, i) => [`S${i + 1}`, (i % 5) + 1]));
    const html = renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={cok} sutun={1} seciliSatir={3} />);
    expect(html).not.toContain('data-dilim-etiketi');
    expect(html).not.toContain('role="slider"');
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(59);
    expect(html).toMatch(/data-dilim-indeksi="3" tabindex="0"/);
    const kirk = tabloOlustur(['Ad', 'Değer'], Array.from({ length: 40 }, (_, i) => [`S${i + 1}`, (i % 5) + 1]));
    expect(renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={kirk} sutun={1} />)).toContain('role="slider"');
  });
});

describe('çizgi: değişim etiketi, eksen adları, balonlar, değerler, kesikli ikinci seri (M15, M21)', () => {
  it('degisimEtiketi biçimleri: birimli, yüzdeli, "değişim yok"; Δ ve işaret yok', () => {
    expect(degisimEtiketi(2, 5, { yuzde: true, birim: 'cm' })).toBe('3 cm artış (%150)');
    expect(degisimEtiketi(13.2, 7.4, { birim: '°C' })).toBe('5,8 °C azalış');
    expect(degisimEtiketi(18, 22, { yuzde: true })).toBe('4 artış (%22,2)');
    expect(degisimEtiketi(4, 4, { yuzde: true, birim: 'cm' })).toBe('değişim yok');
    expect(degisimEtiketi(45, 52, { birim: '%' })).toBe('%7 artış');
    expect(degisimEtiketi(0.1, 0.3)).toBe('0,2 artış');
    for (const m of [degisimEtiketi(5, 2, { yuzde: true }), degisimEtiketi(-3, 4)]) expect(m).not.toMatch(/Δ|\+|−/);
  });

  it('yuzdeAnlamli: °C / °F / sıcaklık adlı ya da ≤ 0 değerli sütunda yüzde yok; yüzde birimli sütunda yok', () => {
    expect(yuzdeAnlamli('Boy (cm)', [2, 5, 9])).toBe(true);
    expect(yuzdeAnlamli('Sıcaklık (°C)', [4, 6])).toBe(false);
    expect(yuzdeAnlamli('Hava (°F)', [40, 60])).toBe(false);
    expect(yuzdeAnlamli('Günlük sıcaklık', [4, 6])).toBe(false);
    expect(yuzdeAnlamli('Nüfus', [0, 6])).toBe(false);
    expect(yuzdeAnlamli('Kâr', [-2, 6])).toBe(false);
    expect(yuzdeAnlamli('Tura: göreli sıklık (%)', [40, 60])).toBe(false);
  });

  const fide = tabloOlustur(['Hafta', 'Boy (cm)'], [['1. hafta', 2], ['2. hafta', 5], ['3. hafta', 9], ['4. hafta', 14]]);
  const ortak = { onSatirSec: bos, onDegerDegis: bos, yuvarlamaAdimi: 1, genislik: 846, yukseklik: 440, azaltilmisHareket: true };

  it('fide gibi tek seri: "↑ Boy (cm)" ve "Hafta →"; seçili 2. haftada "3 cm artış (%150)" ve "4 cm artış (%80)"; sıcaklıkta yüzde yok', () => {
    const html = renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={fide} sutunlar={[1]} seciliSatir={1} />);
    const m = gorunen(html).replace(/ /g, ' ');
    expect(m).toContain('↑ Boy (cm)');
    expect(m).toContain('Hafta →');
    expect(html).not.toContain('data-seri-ornegi');
    expect(m).toContain('3 cm artış (%150)');
    expect(m).toContain('4 cm artış (%80)');
    expect(html.match(/data-degisim-balonu/g)).toHaveLength(2);
    // yuzdeGoster verilince o karar geçerli
    const yuzdesiz = gorunen(renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={fide} sutunlar={[1]} seciliSatir={1} yuzdeGoster={[false]} />));
    expect(yuzdesiz.replace(/ /g, ' ')).toContain('3 cm artış ');
    expect(yuzdesiz).not.toContain('(%150)');
    const sicak = gorunen(renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={sabitSicaklik()} sutunlar={[1]} seciliSatir={9} />)).replace(/ /g, ' ');
    expect(sicak).toContain('6 °C azalış');
    expect(sicak).toContain('5,5 °C azalış');
    expect(sicak).not.toMatch(/azalış \(%/);
  });

  it('balonlar birbirine ve noktalara binmez', () => {
    const kutular = (html: string) =>
      Array.from(html.matchAll(/data-degisim-balonu[\s\S]*?<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g), (e) => e.slice(1).map(Number));
    for (const [t, secili, sutunlar] of [
      [fide, 1, [1]],
      [fide, 2, [1]],
      [sabitMac(), 2, [1, 2]],
      [sabitSicaklik(), 6, [1]],
    ] as const) {
      const html = renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={t} sutunlar={[...sutunlar]} seciliSatir={secili} degerleriGoster />);
      const k = kutular(html);
      expect(k.length).toBeGreaterThan(1);
      const noktalar = Array.from(html.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="(?:5\.5|7|8)"/g), (e) => [Number(e[1]), Number(e[2])]);
      for (let i = 0; i < k.length; i++) {
        const [x, y, g, h] = k[i];
        for (let j = i + 1; j < k.length; j++) {
          const [x2, y2, g2, h2] = k[j];
          const ortusme = Math.max(0, Math.min(x + g, x2 + g2) - Math.max(x, x2)) * Math.max(0, Math.min(y + h, y2 + h2) - Math.max(y, y2));
          expect(ortusme, `balon ${i} ve ${j}`).toBe(0);
        }
        for (const [px, py] of noktalar) expect(px > x - 4 && px < x + g + 4 && py > y - 4 && py < y + h + 4, `nokta ${px},${py}`).toBe(false);
      }
    }
  });

  it('degerleriGoster: her noktada değer; 40 satırdan çokta yalnız seçili noktanın değeri, tek sekme durağı', () => {
    const html = renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={fide} sutunlar={[1]} seciliSatir={null} degerleriGoster />);
    expect(html.match(/data-deger-etiketi/g)).toHaveLength(4);
    const cok = tabloOlustur(['Gün', 'Değer'], Array.from({ length: CIZGI_COK_NOKTA + 10 }, (_, i) => [`${i + 1}`, (i * 7) % 13]));
    const c = renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={cok} sutunlar={[1]} seciliSatir={5} degerleriGoster />);
    expect(c.match(/data-deger-etiketi/g)).toHaveLength(1);
    expect(c.match(/role="slider"/g)).toHaveLength(1);
    expect(c).toContain('aria-valuetext="6: Değer 9"');
    expect(c).not.toContain('data-png-kalir');
  });

  it('ikinciKesikli: ikinci seri kesikli ve içi boş noktalı (renk anahtarı olmadan da); lejant örneği de kesikli', () => {
    const t = tabloOlustur(['Deney', 'Göreli sıklık (%)', 'Teorik olasılık (%)'], [['1', 60, 50], ['2', 45, 50], ['3', 52, 50]]);
    const html = renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={t} sutunlar={[1, 2]} seciliSatir={null} ikinciKesikli />);
    expect(html.match(/<path [^>]*stroke-dasharray="7 5"/g)).toHaveLength(1);
    expect(html.match(/<line [^>]*stroke-dasharray="7 5"/g)).toHaveLength(1);
    const ikinciNoktalar = Array.from(html.matchAll(/r="5.5" fill="([^"]+)" stroke="([^"]+)"/g)).slice(3);
    expect(ikinciNoktalar).toHaveLength(3);
    for (const e of ikinciNoktalar) expect(e[1]).toBe('hsl(var(--card))');
    const duz = renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={t} sutunlar={[1, 2]} seciliSatir={null} />);
    expect(duz).not.toContain('stroke-dasharray="7 5"');
  });

  it('uzun satır etiketi iki satıra kırılır; sığmazsa eğik yazılır', () => {
    const t = tabloOlustur(['Ölçüm', 'Boy (cm)'], [['Birinci hafta', 2], ['İkinci hafta', 5], ['Üçüncü hafta', 9], ['Dördüncü hafta', 14], ['Beşinci hafta', 18], ['Altıncı hafta', 21], ['Yedinci hafta', 23], ['Sekizinci hafta', 24]]);
    const html = renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={t} sutunlar={[1]} seciliSatir={null} genislik={700} />);
    expect(html).toMatch(/<tspan[^>]*>Birinci<\/tspan><tspan[^>]*>hafta<\/tspan>/);
    expect(html).not.toContain('rotate(-35');
    // Boşluksuz uzun etiketler kırılamaz: eğik yazılır, sol kenardan taşan kısalır
    const tarihli = tabloOlustur(['Tarih', 'Boy (cm)'], Array.from({ length: 12 }, (_, i) => [`Ölçüm-2025-${String(i + 1).padStart(2, '0')}-15`, 2 + i]));
    const egik = renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={tarihli} sutunlar={[1]} seciliSatir={null} genislik={700} />);
    expect(egik).toContain('rotate(-35');
    expect(egik).not.toContain('<tspan');
  });
});

describe('saçılım balonu, yazı boyu, gösterim ondalığı ve koyu tema renkleri (M19, M22, M17)', () => {
  it('saçılım balonu: "Ad · X: 7 saat · Y: 78"; sığmazsa iki, sonra üç satır', () => {
    const x = { sutunAdi: 'Haftalık çalışma (saat)', deger: 7, ondalik: 2 };
    const y = { sutunAdi: 'Matematik puanı', deger: 78, ondalik: 2 };
    const tekSatir = 'Gizem · Haftalık çalışma: 7 saat · Matematik puanı: 78';
    expect(sacilimBalonu('Gizem', x, y)).toEqual([tekSatir]);
    expect(sacilimBalonu('Gizem', x, y, (s) => s.length < 50)).toEqual(['Gizem', 'Haftalık çalışma: 7 saat · Matematik puanı: 78']);
    expect(sacilimBalonu('Gizem', x, y, (s) => s.length < 30)).toEqual(['Gizem', 'Haftalık çalışma: 7 saat', 'Matematik puanı: 78']);
    const t = sabitCalisma();
    const html = renderToStaticMarkup(<SacilimGrafigi tablo={t} xSutun={2} ySutun={3} seciliSatir={6} onSatirSec={bos} genislik={846} yukseklik={420} azaltilmisHareket />);
    expect(gorunen(html)).toContain(tekSatir.replace(/ /g, ' '));
    expect(html).toContain('data-sacilim-balonu');
    expect(adVeBirim('Sıcaklık (°C)')).toEqual({ ad: 'Sıcaklık', birim: '°C' });
    expect(adVeBirim('Matematik puanı')).toEqual({ ad: 'Matematik puanı', birim: null });
    expect(birimli('45', '%')).toBe('%45');
    expect(birimli('5,8', '°C')).toBe('5,8 °C');
    expect(metniSigdir('Oyun ve spor', 13, metinGenisligi('Oyun ve', 13))).toMatch(/…$/);
  });

  it("yazı boyu grafiğin genişliğiyle büyür: 800 px'te 13, 1400 px'te 16 (çizgi, daire, saçılım); hiçbir yazı 12 px'ten küçük değil", () => {
    const boyutlar = (html: string) => new Set(Array.from(html.matchAll(/font-size="([\d.]+)"/g), (e) => Number(e[1])));
    const ciz = (W: number) => [
      renderToStaticMarkup(<CizgiGrafigi tablo={sabitMac()} sutunlar={[1]} seciliSatir={1} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={1} genislik={W} yukseklik={420} azaltilmisHareket />),
      renderToStaticMarkup(<DaireGrafigi tablo={sabitGun()} sutun={1} seciliSatir={0} onSatirSec={bos} onDegerlerDegis={bos} genislik={W} yukseklik={420} azaltilmisHareket />),
      renderToStaticMarkup(<SacilimGrafigi tablo={sabitMac()} xSutun={1} ySutun={2} seciliSatir={1} onSatirSec={bos} genislik={W} yukseklik={420} azaltilmisHareket />),
    ];
    for (const html of ciz(800)) expect(boyutlar(html).has(13)).toBe(true);
    for (const html of ciz(1400)) expect(boyutlar(html).has(16)).toBe(true);
    for (const html of [...ciz(800), ...ciz(1400), ...ciz(300)]) for (const b of boyutlar(html)) expect(b).toBeGreaterThanOrEqual(12);
  });

  it("gösterim ondalığı: 0,001'lik veri 0 görünmez; 0,125'lik veride ortalama 0,375 tam", () => {
    expect(istatistikOndaligi([1, 2, 3])).toBe(2);
    expect(istatistikOndaligi([2, 2.55])).toBe(2);
    expect(istatistikOndaligi([0.001, 0.004])).toBe(4);
    const kucuk = tabloOlustur(['Numune', 'Kütle (g)'], [['A', 0.001], ['B', 0.004], ['C', 0.002], ['D', 0.003], ['E', 0.002]]);
    const ist = gorunen(renderToStaticMarkup(<IstatistikPaneli tablo={kucuk} sutun={1} seciliSatir={null} onSatirSec={bos} adimlariGoster={false} onAdimlariGoster={bos} />));
    expect(ist).toContain('0,0024');
    expect(ist).toMatch(/0,004 − 0,001 = 0,003/);
    const sekizde = tabloOlustur(['A', 'B'], [['a', 0.125], ['b', 0.25], ['c', 0.375], ['d', 0.5], ['e', 0.625]]);
    const s8 = renderToStaticMarkup(<IstatistikPaneli tablo={sekizde} sutun={1} seciliSatir={null} onSatirSec={bos} adimlariGoster={false} onAdimlariGoster={bos} />);
    const ortalamaKarti = gorunen(s8.slice(s8.indexOf('data-istatistik-karti="ortalama"'), s8.indexOf('data-istatistik-karti="ortanca"')));
    expect(ortalamaKarti).toContain('0,375');
    expect(ortalamaKarti).not.toContain('≈');
    const cizgi = renderToStaticMarkup(<CizgiGrafigi tablo={kucuk} sutunlar={[1]} seciliSatir={1} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={0.1} genislik={846} yukseklik={420} azaltilmisHareket />);
    expect(cizgi).toContain('Kütle (g), B: 0,004');
    expect(gorunen(cizgi).replace(/ /g, ' ')).toContain('0,003 g artış (%300)');
    const daire = renderToStaticMarkup(<DaireGrafigi tablo={kucuk} sutun={1} seciliSatir={null} onSatirSec={bos} onDegerlerDegis={bos} genislik={846} yukseklik={420} azaltilmisHareket />);
    expect(daire).toContain('A: 0,001 (');
    expect(daire).toContain('toplam 0,012');
  });

  it('çizgi ve dilim renkleri açık (fildişi) ve koyu (mürekkep) kart zemininde en az 3:1', () => {
    const hslRgb = (h: number, s: number, l: number) => {
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      };
      return [f(0), f(8), f(4)];
    };
    const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const parlaklik = ([r, g, b]: number[]) => {
      const c = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
    };
    const karsitlik = (a: number[], b: number[]) => {
      const [p, q] = [parlaklik(a), parlaklik(b)].sort((x, y) => y - x);
      return (p + 0.05) / (q + 0.05);
    };
    // globals.css: açık --card 43 100% 98%, koyu --card 173 39% 14%
    const acikKart = hslRgb(43, 1, 0.98);
    const koyuKart = hslRgb(173, 0.39, 0.14);
    const renkler = new Set([...dilimRenkleri(Array.from({ length: 12 }, (_, i) => `K${i}`)), ...[0, 1, 2, 3, 4].map(seriRengi)]);
    expect(renkler.size).toBe(12);
    for (const r of renkler) {
      expect(karsitlik(hexRgb(r), acikKart), `${r} açık`).toBeGreaterThanOrEqual(3);
      expect(karsitlik(hexRgb(r), koyuKart), `${r} koyu`).toBeGreaterThanOrEqual(3);
    }
  });

  it('çizgi, daire ve saçılım çıktısında Δ, x̄, Σ, "Medyan", "Gözlem", U+0304, NaN yok', () => {
    const t = sabitCalisma();
    const eslem = renkEslemesi(t, 1)!;
    const ciktilar = [
      renderToStaticMarkup(<CizgiGrafigi tablo={t} sutunlar={[2, 3]} seciliSatir={4} onSatirSec={bos} onDegerDegis={bos} yuvarlamaAdimi={1} genislik={846} yukseklik={420} azaltilmisHareket renkEslemi={eslem} degerleriGoster />),
      renderToStaticMarkup(<DaireGrafigi tablo={sabitGun()} sutun={1} seciliSatir={2} onSatirSec={bos} onDegerlerDegis={bos} genislik={846} yukseklik={420} azaltilmisHareket />),
      renderToStaticMarkup(<SacilimGrafigi tablo={t} xSutun={2} ySutun={3} seciliSatir={3} onSatirSec={bos} genislik={846} yukseklik={420} azaltilmisHareket renkEslemi={eslem} />),
    ];
    for (const html of ciktilar) {
      for (const yasak of ['Δ', 'x̄', 'Σ', 'Medyan', 'Gözlem', '̄']) expect(html, yasak).not.toContain(yasak);
      expect(html).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});
