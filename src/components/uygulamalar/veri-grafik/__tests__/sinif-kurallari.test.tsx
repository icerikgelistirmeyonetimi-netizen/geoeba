// Sınıf düzeyi kuralları (alan uzmanı incelemesi, 4. tur — geoeba (3).xlsx satır 109–112):
// - 5. sınıf: yalnız Nokta, Sütun, Daire (+ İstatistik'te sıklık tablosu); merkezi eğilim / yayılım ölçüsü yok; dairede ve
//   sütunlarda açı / yüzde yok; sıklık tablosunda göreli sıklık ve merkez açı yok; iki yönlü tablo varken tek yönlü yok;
//   karşılaştırmalı sütunlar yan yana.
// - 6. sınıf: Çizgi yerine Kök-yaprak, Saçılım yok; ortalama mutlak sapma ve standart sapma yok (İstatistik ve nokta
//   şeridi); "Aritmetik ortalama"; ortanca "10. ve 11. verilerin toplamının yarısı"; iki grup tek grafikte, ikili gruplar.
// - 7–8. sınıf: standart sapma yok; iki grup tek grafikte, ikili gruplar (Sütun ve Nokta).
// - Bütün sınıflar: sütun grafiğinin eksenlerinde ok; eksen / lejant adlarının yanında veri sayısı yok.
// - Sınıfsız tablo (kendi tablonuz): bugünkü davranış (alt alta paneller, bütün ölçüler, 6 sekme).
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import VeriGrafikUygulamasi, { DEPO_ANAHTARI } from '../index';
import { baslangicDurumu, durumKurallari, ornegiYukle, sekmeDuzelt, type Durum, type Sekme } from '../durum';
import { ORNEK_VERILER, ornekBul, sutunIndeksi } from '../veri';
import { SERBEST_KURALLAR, olcuDugmesiVar, sekmeSinifta, sinifKurallari, sinifSekmesi } from '../sinifKurallari';
import { karsilastirmaAdaylari } from '../grafikKurallari';
import { grupEslemesi, ikiSeriTablosu, sutunCiftleri } from '../ikiliGruplar';
import { KokYaprak, kokYaprakGosterimi } from '../KokYaprak';
import { SutunGrafigi } from '../SutunGrafigi';
import { DaireGrafigi } from '../DaireGrafigi';
import { IstatistikPaneli } from '../IstatistikPaneli';
import { NoktaGrafigi } from '../NoktaGrafigi';
import { renkEslemesi } from '../kategorik';
import { seriRengi } from '../grafik';

const bos = () => undefined;

/** Sunucu çiziminde ölçü yoktur: uygulamanın grafikleri çizmesi için ölçüsüz useBoyut sahte ölçü alır (butunluk.test gibi) */
const sahte = vi.hoisted(() => ({ boyut: null as { genislik: number; yukseklik: number } | null }));
vi.mock('../ortak', async (orijinal) => {
  const m = await orijinal<typeof import('../ortak')>();
  return {
    ...m,
    useBoyut: (...args: Parameters<typeof m.useBoyut>) => {
      const b = m.useBoyut(...args);
      return b.genislik === 0 && b.yukseklik === 0 && sahte.boyut ? sahte.boyut : b;
    },
  };
});

function uygulamaCiz(d: Durum): string {
  const kayit = JSON.stringify(d);
  const g = globalThis as { window?: unknown };
  const eski = g.window;
  g.window = { localStorage: { getItem: (k: string) => (k === DEPO_ANAHTARI ? kayit : null), setItem: bos, removeItem: bos } };
  sahte.boyut = { genislik: 1000, yukseklik: 500 };
  try {
    return renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1280} />);
  } finally {
    sahte.boyut = null;
    if (eski === undefined) delete g.window;
    else g.window = eski;
  }
}

const yukle = (id: string, ek: Partial<Durum> = {}): Durum => ({ ...ornegiYukle(baslangicDurumu(), id)!.durum, ipucu: 'kapali', ...ek });
const grafikSekmeleri = (html: string) => {
  const liste = html.slice(html.indexOf('aria-label="Grafik türü"'), html.indexOf('data-arac-dugmeleri'));
  return Array.from(liste.matchAll(/role="tab"[^>]*>([^<]+)</g), (m) => m[1]);
};
const seritDugmeleri = (html: string) => {
  const s = html.indexOf('data-secenek-seridi');
  if (s < 0) return [];
  const serit = html.slice(s);
  return Array.from(serit.matchAll(/<button[^>]*aria-pressed="(?:true|false)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span><\/button>/g), (m) => m[1]);
};
const svgYazilari = (html: string) => Array.from(html.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g), (m) => m[1].replace(/<[^>]+>/g, '')).join(' | ');
const metin = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

// ── Kurallar (saf) ──────────────────────────────────────────────────────────────────────────────────────────

describe('sınıf kuralları: sekmeler ve ölçüler', () => {
  it('5., 6., 7. ve 8. sınıfın sekmeleri; sınıfsız tabloda 5 sekme', () => {
    expect(sinifKurallari(5).sekmeler).toEqual(['nokta', 'sutun', 'daire', 'istatistik']);
    expect(sinifKurallari(6).sekmeler).toEqual(['nokta', 'sutun', 'kokYaprak', 'daire', 'istatistik']);
    for (const s of [7, 8] as const) expect(sinifKurallari(s).sekmeler).toEqual(['nokta', 'sutun', 'cizgi', 'daire', 'istatistik']);
    expect(sinifKurallari(null)).toBe(SERBEST_KURALLAR);
    expect(SERBEST_KURALLAR.sekmeler).toEqual(['nokta', 'sutun', 'cizgi', 'daire', 'istatistik']);
    expect(sekmeSinifta('kokYaprak', SERBEST_KURALLAR)).toBe(false);
    expect(sinifSekmesi('cizgi', sinifKurallari(6))).toBe('nokta');
    expect(sinifSekmesi('sacilim', sinifKurallari(5))).toBe('nokta');
    expect(sinifSekmesi('daire', sinifKurallari(5))).toBe('daire');
  });

  it('ölçüler: 5. sınıfta hiçbiri; 6. sınıfta ortalama mutlak sapma ve standart sapma yok; 7–8. sınıfta standart sapma yok', () => {
    expect(sinifKurallari(5).olculer).toEqual({ merkezi: false, aciklik: false, oms: false, standartSapma: false });
    expect(sinifKurallari(6).olculer).toEqual({ merkezi: true, aciklik: true, oms: false, standartSapma: false });
    for (const s of [7, 8] as const) expect(sinifKurallari(s).olculer).toEqual({ merkezi: true, aciklik: true, oms: true, standartSapma: false });
    expect(SERBEST_KURALLAR.olculer).toEqual({ merkezi: true, aciklik: true, oms: true, standartSapma: true });
    expect(olcuDugmesiVar('ortalama', sinifKurallari(5))).toBe(false);
    expect(olcuDugmesiVar('oms', sinifKurallari(6))).toBe(false);
    expect(olcuDugmesiVar('standartSapma', sinifKurallari(8))).toBe(false);
    expect(sinifKurallari(5).yuzdeVeAci).toBe(false);
    expect(sinifKurallari(5).tekYonluTabloIleBirlikte).toBe(false);
    for (const s of [5, 6, 7, 8] as const) expect(sinifKurallari(s).tekGrafikteKarsilastir).toBe(true);
    expect(SERBEST_KURALLAR.tekGrafikteKarsilastir).toBe(false);
  });

  it('durumun kuralları bağlı örneğin sınıfından; bağ yoksa ya da Deney özeti açıkken sınıfsız', () => {
    for (const o of ORNEK_VERILER) expect(durumKurallari({ ornekId: o.id, etkinKume: 'tablom' }).sinif, o.id).toBe(o.sinif);
    expect(durumKurallari({ ornekId: null, etkinKume: 'tablom' })).toBe(SERBEST_KURALLAR);
    expect(durumKurallari({ ornekId: 'kitap', etkinKume: 'ozet' })).toBe(SERBEST_KURALLAR);
  });

  it('sekmeDuzelt: sınıfta görünmeyen sekme Nokta olur (6. sınıfta Çizgi / Saçılım, 5. sınıfta Çizgi, sınıfsızda Kök-yaprak)', () => {
    expect(sekmeDuzelt(yukle('kitap', { sekme: 'cizgi' })).sekme).toBe('nokta');
    expect(sekmeDuzelt(yukle('mac', { sekme: 'sacilim' })).sekme).toBe('nokta');
    expect(sekmeDuzelt(yukle('mac', { sekme: 'kokYaprak' })).sekme).toBe('kokYaprak');
    expect(sekmeDuzelt(yukle('gun', { sekme: 'cizgi' })).sekme).toBe('nokta');
    expect(sekmeDuzelt(yukle('iklim', { sekme: 'cizgi' })).sekme).toBe('cizgi');
    expect(sekmeDuzelt({ ...yukle('kitap'), ornekId: null, sekme: 'kokYaprak' }).sekme).toBe('nokta');
  });

  it('Karşılaştır (5–8. sınıf): Sütun ve Kök-yaprak sekmesinde de; gruplar "(yan yana)" / "(sırt sırta)"; sınıfsızda Nokta bugünkü gibi', () => {
    const sinav = ornekBul('sinav')!.olustur();
    const puan = sinav.sutunlar[2].id;
    // Uzman 7. tur: Sütun'da karşılaştırma sınıfsız tabloda da tek grafikte, yan yana
    expect(karsilastirmaAdaylari(sinav, puan, 'sutun').map((a) => [a.etiket, a.neden])).toEqual([['Sınıf (yan yana)', null]]);
    expect(karsilastirmaAdaylari(sinav, puan, 'nokta').map((a) => a.etiket)).toEqual(['Sınıf (gruplara ayır)']);
    expect(karsilastirmaAdaylari(sinav, puan, 'sutun', true).map((a) => [a.etiket, a.neden])).toEqual([['Sınıf (yan yana)', null]]);
    expect(karsilastirmaAdaylari(sinav, puan, 'nokta', true).map((a) => a.etiket)).toEqual(['Sınıf (yan yana)']);
    expect(karsilastirmaAdaylari(sinav, puan, 'kokYaprak', true).map((a) => a.etiket)).toEqual(['Sınıf (sırt sırta)']);
    const ekran = ornekBul('ekran')!.olustur();
    const k = karsilastirmaAdaylari(ekran, ekran.sutunlar[2].id, 'kokYaprak', true);
    expect(k[0].neden).toMatch(/en çok 2 grup/);
    const mac = ornekBul('mac')!.olustur();
    expect(karsilastirmaAdaylari(mac, mac.sutunlar[1].id, 'sutun', true).map((a) => a.ad)).toEqual(['Yasemin']);
    // Kategorik ana değişkende Sütun'un karşılaştırması renk anahtarıdır (seçim listesi yok)
    const atik = ornekBul('atik')!.olustur();
    expect(karsilastirmaAdaylari(atik, atik.sutunlar[2].id, 'sutun', true)).toEqual([]);
  });
});

// ── İkili gruplar (saf) ─────────────────────────────────────────────────────────────────────────────────────

describe('ikili gruplar: iki veri grubu tek grafikte (birinci grup, ikinci grup sırası değil)', () => {
  it('iki sayısal değişken: her satır bir ikili grup (1. maç: Selma 18, Yasemin 17)', () => {
    const mac = ornekBul('mac')!.olustur();
    const c = sutunCiftleri(mac, 1, { tur: 'sayi', sutun: 2 });
    expect(c.seriler).toEqual([
      { ad: 'Selma', renk: seriRengi(0) },
      { ad: 'Yasemin', renk: seriRengi(1) },
    ]);
    expect(c.gruplar.map((g) => g.etiket)).toEqual(['1. maç', '2. maç', '3. maç', '4. maç', '5. maç']);
    expect(c.gruplar.map((g) => g.cubuklar.map((x) => x?.deger))).toEqual([
      [18, 17],
      [5, 15],
      [32, 19],
      [17, 16],
      [13, 18],
    ]);
    expect(c.gruplar[0].cubuklar.map((x) => x?.sutun)).toEqual([1, 2]);
    expect(c.cubukEtiketli).toBe(false);
  });

  it('gruplu karşılaştırma: her grubun k. verisi k. ikili grupta (7A-01 ile 7B-01 …); renk anahtarı gruplayan sütunsa onun renkleri', () => {
    const sinav = ornekBul('sinav')!.olustur();
    const eslem = renkEslemesi(sinav, 1)!;
    const c = sutunCiftleri(sinav, 2, { tur: 'grup', sutun: 1 }, eslem);
    expect(c.seriler.map((s) => s.ad)).toEqual(['7-A', '7-B']);
    expect(c.seriler.map((s) => s.renk)).toEqual([eslem.renkler.get('7-A'), eslem.renkler.get('7-B')]);
    expect(c.gruplar).toHaveLength(15);
    expect(c.gruplar[0].cubuklar.map((x) => x?.etiket)).toEqual(['7A-01', '7B-01']);
    expect(c.gruplar[14].cubuklar.map((x) => x?.etiket)).toEqual(['7A-15', '7B-15']);
    expect(c.cubukEtiketli).toBe(true);
    // Sıra verilirse o sırada; eksik veri o çiftte boş kalır (çiftler hizalı)
    const ters = sutunCiftleri(sinav, 2, { tur: 'grup', sutun: 1, sira: ['7-B', '7-A'] });
    expect(ters.seriler.map((s) => s.ad)).toEqual(['7-B', '7-A']);
    const eksik = { ...sinav, satirlar: sinav.satirlar.slice(0, 16) };
    const e = sutunCiftleri(eksik, 2, { tur: 'grup', sutun: 1 });
    expect(e.gruplar).toHaveLength(15);
    expect(e.gruplar[1].cubuklar[1]).toBeNull();
  });

  it('nokta grafiği için uzun tablo: satırlar ikişer (Erzurum, Adana); değer sütunu ortak birimle; seri renkleri; satır karşılığı', () => {
    const iklim = ornekBul('iklim')!.olustur();
    const t = ikiSeriTablosu(iklim, 1, 2);
    expect(t.tablo.sutunlar.map((s) => [s.ad, s.tur])).toEqual([
      ['Ay', 'etiket'],
      ['Erzurum ve Adana (°C)', 'sayi'],
      ['Değişken', 'etiket'],
    ]);
    expect(t.tablo.satirlar).toHaveLength(24);
    expect(t.tablo.satirlar.slice(0, 2).map((r) => r.hucreler)).toEqual([
      ['Ocak · Erzurum', '-9,1', 'Erzurum'],
      ['Ocak · Adana', '9,6', 'Adana'],
    ]);
    expect(t.karsilik.slice(0, 6)).toEqual([0, 0, 1, 1, 2, 2]);
    expect(t.eslem.kategoriler).toEqual(['Erzurum', 'Adana']);
    expect(t.eslem.renkler.get('Adana')).toBe(seriRengi(1));
    const mac = ikiSeriTablosu(ornekBul('mac')!.olustur(), 1, 2);
    expect(mac.tablo.sutunlar[1].ad).toBe('Selma ve Yasemin');
    // Gruplu karşılaştırmanın eşlemesi: renk anahtarı gruplayan sütunsa kendisi
    const sinav = ornekBul('sinav')!.olustur();
    const anahtar = renkEslemesi(sinav, 1)!;
    expect(grupEslemesi(sinav, 1, undefined, anahtar)).toBe(anahtar);
    expect(grupEslemesi(sinav, 1, undefined, null)!.kategoriler).toEqual(['7-A', '7-B']);
  });
});

// ── Kök-yaprak (saf ve çizim) ───────────────────────────────────────────────────────────────────────────────

describe('kök-yaprak gösterimi (6. sınıf)', () => {
  const seri = (degerler: number[]) => degerler.map((deger, satir) => ({ satir, deger }));

  it('ulaşım süreleri: kökler 0–6 (boş kökler de), yapraklar küçükten büyüğe; anahtar sıfırdan büyük ilk kökten', () => {
    const g = kokYaprakGosterimi([seri([12, 15, 5, 60, 10, 20, 10, 25, 5, 10, 8, 15, 20, 10, 15])]);
    expect(g.birim).toBe(1);
    expect(g.satirlar.map((s) => s.kok)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(g.satirlar.map((s) => s.yapraklar[0].map((y) => y.yaprak).join(''))).toEqual(['558', '00002555', '005', '', '', '', '0']);
    expect(g.anahtar).toEqual({ kok: 1, yaprak: 0, deger: 10 });
    expect(g.negatif).toBe(false);
    expect(g.yuvarlandi).toBe(false);
  });

  it('sırt sırta iki seri aynı köklerde; ondalıklı ve geniş aralıkta yaprak birimi; negatifte kurulmaz', () => {
    const g = kokYaprakGosterimi([seri([18, 5, 32, 17, 13]), seri([17, 15, 19, 16, 18])]);
    expect(g.satirlar.map((s) => s.kok)).toEqual([0, 1, 2, 3]);
    expect(g.satirlar[1].yapraklar.map((l) => l.map((y) => y.yaprak))).toEqual([
      [3, 7, 8],
      [5, 6, 7, 8, 9],
    ]);
    const ondalik = kokYaprakGosterimi([seri([1.2, 1.5, 2.3])]);
    expect(ondalik.birim).toBe(0.1);
    expect(ondalik.satirlar.map((s) => s.kok)).toEqual([1, 2]);
    expect(ondalik.anahtar).toEqual({ kok: 1, yaprak: 2, deger: 1.2 });
    const genis = kokYaprakGosterimi([seri([140, 152.5, 170])]);
    expect(genis.birim).toBe(1);
    expect(genis.yuvarlandi).toBe(true);
    expect(genis.satirlar.map((s) => s.kok)).toEqual([14, 15, 16, 17]);
    expect(kokYaprakGosterimi([seri([25000, 35000, 5000])]).birim).toBe(1000);
    expect(kokYaprakGosterimi([seri([-3, 4])]).negatif).toBe(true);
    expect(kokYaprakGosterimi([[]]).satirlar).toEqual([]);
  });

  it('çizim: başlıklar (Kök | Yaprak), anahtar; sırt sırta serilerin adları ve renkleri; yaprağa dokununca satır seçilir (data-yaprak)', () => {
    const mac = ornekBul('mac')!.olustur();
    const tek = renderToStaticMarkup(<KokYaprak tablo={mac} sutun={1} seciliSatir={null} onSatirSec={bos} genislik={800} yukseklik={420} />);
    expect(tek).toContain('data-grafik="kok-yaprak"');
    expect(svgYazilari(tek)).toContain('Kök');
    expect(svgYazilari(tek)).toContain('Yaprak');
    expect(tek).toMatch(/data-kok-yaprak-anahtari[^>]*>Anahtar: 1 \| 3 = 13/);
    expect(tek.match(/data-yaprak=/g)).toHaveLength(5);
    const sirt = renderToStaticMarkup(
      <KokYaprak tablo={mac} sutun={1} seriler={[{ ad: 'Selma', sutun: 1 }, { ad: 'Yasemin', sutun: 2 }]} seciliSatir={2} onSatirSec={bos} genislik={800} yukseklik={420} />,
    );
    expect(sirt).toContain('data-seri-basligi="Selma"');
    expect(sirt).toContain('data-seri-basligi="Yasemin"');
    expect(sirt.match(/data-yaprak=/g)).toHaveLength(10);
    expect(sirt).toContain(`fill="${seriRengi(1)}"`);
    expect(sirt).toContain('data-yalniz-ekran');
    const negatif = renderToStaticMarkup(<KokYaprak tablo={ornekBul('iklim')!.olustur()} sutun={1} seciliSatir={null} onSatirSec={bos} genislik={800} yukseklik={420} />);
    expect(negatif).toContain('data-kok-yaprak-negatif');
  });
});

// ── Grafikler (çizim) ───────────────────────────────────────────────────────────────────────────────────────

describe('grafikler: eksen okları, yan yana sütun çiftleri, açısız daire, ölçü süzgeci', () => {
  it('sütun grafiği: eksenlerin ucunda ok; ikili gruplarda yan yana sütun çiftleri, seri lejantı, grup adları', () => {
    const mac = ornekBul('mac')!.olustur();
    const ortak = { tablo: mac, sutun: 1, seciliSatir: null, onSatirSec: bos, onDegerDegis: bos, yuvarlamaAdimi: 1, genislik: 800, yukseklik: 420, azaltilmisHareket: true };
    const tek = renderToStaticMarkup(<SutunGrafigi {...ortak} />);
    expect(tek).toContain('data-eksen-oku="dikey"');
    expect(tek).toContain('data-eksen-oku="yatay"');
    expect(tek).not.toContain('data-ikili');
    const cift = renderToStaticMarkup(<SutunGrafigi {...ortak} ikili={sutunCiftleri(mac, 1, { tur: 'sayi', sutun: 2 })} />);
    expect(cift).toContain('data-ikili');
    expect(cift).toContain('data-eksen-oku="dikey"');
    expect(cift.match(/data-cubuk="Selma"/g)).toHaveLength(5);
    expect(cift.match(/data-cubuk="Yasemin"/g)).toHaveLength(5);
    expect(cift.match(/data-grup-etiketi/g)).toHaveLength(5);
    expect(cift).toContain('data-seri="Selma"');
    // Her çiftte Selma solda, Yasemin hemen sağında (sütunlar arası 2 px); çiftler arası daha geniş
    const xler = Array.from(cift.matchAll(/data-cubuk="(\w+)"><g style="transform:translate\(([\d.]+)px/g), (m) => ({ seri: m[1], x: Number(m[2]) }));
    expect(xler.map((x) => x.seri)).toEqual(['Selma', 'Yasemin', 'Selma', 'Yasemin', 'Selma', 'Yasemin', 'Selma', 'Yasemin', 'Selma', 'Yasemin']);
    const ici = xler[1].x - xler[0].x;
    const arasi = xler[2].x - xler[1].x;
    expect(arasi).toBeGreaterThan(ici);
    // Sürükleme her sütunun kendi hücresini yazar
    expect(cift).toContain('data-tutamak="0:2"');
  });

  it('nokta grafiği (5. sınıf): ölçü yoksa ölçü satırlarına yer ayrılmaz, noktalar alçak panelde daha büyük; kategorik "Sayılar"da yüzde yok', () => {
    const gun = ornekBul('gun')!.olustur();
    const ortak = {
      tablo: gun,
      sutun: 1,
      seciliSatir: null,
      onSatirSec: bos,
      onDegiskenBirak: bos,
      aralik: 1,
      secenekler: { ortalama: false, oms: false, etiketler: false },
      sutunModu: false,
      genislik: 700,
      yukseklik: 150,
      azaltilmisHareket: true,
      surukleniyor: false,
    };
    const yaricap = (html: string) => Number(/<circle r="22" fill="transparent"><\/circle><circle r="([\d.]+)"/.exec(html)![1]);
    // Hiçbir yükseklikte küçülmez; ölçü satırlarının payı noktaları sıkıştırdığı yükseklikte büyür
    const farklar = [120, 140, 160, 180, 200, 220, 240, 260].map((yukseklik) => {
      const hepsi = yaricap(renderToStaticMarkup(<NoktaGrafigi {...ortak} yukseklik={yukseklik} />));
      const olcusuz = yaricap(renderToStaticMarkup(<NoktaGrafigi {...ortak} yukseklik={yukseklik} olcuKumesi={sinifKurallari(5).olculer} />));
      return olcusuz - hepsi;
    });
    expect(Math.min(...farklar)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...farklar)).toBeGreaterThan(0);
    const baskan = ornekBul('baskan')!.olustur();
    const kat = { ...ortak, tablo: baskan, yukseklik: 420, secenekler: { ortalama: false, oms: false, etiketler: true } };
    expect(renderToStaticMarkup(<NoktaGrafigi {...kat} />)).toContain('%45');
    expect(renderToStaticMarkup(<NoktaGrafigi {...kat} yuzdesiz />)).not.toContain('%');
  });

  it('nokta grafiği yan yana (denetim): dar pencerede de bir değerdeki grup yığını komşu değerin yığınına binmez', () => {
    // 7-A / 7-B puanları (5 puan arayla): 900 px pencerede grafik ~470 px; eskiden 75'in 7-B noktası 80'in 7-A noktasına biniyordu
    const sinav = ornekBul('sinav')!.olustur();
    const sinifSutunu = sinav.sutunlar.findIndex((s) => s.ad === 'Sınıf');
    const puan = sinav.sutunlar.findIndex((s) => s.ad === 'Puan');
    const eslem = grupEslemesi(sinav, sinifSutunu, undefined, null)!;
    for (const genislik of [470, 640, 900]) {
      const html = renderToStaticMarkup(
        <NoktaGrafigi
          tablo={sinav}
          sutun={puan}
          seciliSatir={null}
          onSatirSec={bos}
          onDegiskenBirak={bos}
          aralik={1}
          secenekler={{ ortalama: false, oms: false, etiketler: false }}
          sutunModu={false}
          genislik={genislik}
          yukseklik={300}
          azaltilmisHareket
          surukleniyor={false}
          renkEslemi={eslem}
          yanYana
          olcuKumesi={sinifKurallari(7).olculer}
        />,
      );
      const noktalar = Array.from(
        html.matchAll(/data-satir="(\d+)"[^>]*style="transform:translate\(([-\d.]+)px, ([-\d.]+)px\)[\s\S]*?<circle r="([\d.]+)" fill="(?!transparent)/g),
        (m) => ({ satir: Number(m[1]), x: Number(m[2]), y: Number(m[3]), r: Number(m[4]) }),
      );
      expect(noktalar.length, `${genislik}`).toBe(30);
      for (let i = 0; i < noktalar.length; i++)
        for (let j = i + 1; j < noktalar.length; j++) {
          const a = noktalar[i];
          const b = noktalar[j];
          const uzaklik = Math.hypot(a.x - b.x, a.y - b.y);
          expect(uzaklik, `${genislik} px: satır ${a.satir} ile ${b.satir}`).toBeGreaterThanOrEqual(a.r + b.r - 0.01);
        }
    }
  });

  it('daire (5. sınıf, oransiz): açı ve yüzde yazılmaz; lejantta ad ve değer, şeritte parça ve bütün', () => {
    const gun = ornekBul('gun')!.olustur();
    const ortak = { tablo: gun, sutun: 1, onSatirSec: bos, onDegerlerDegis: bos, genislik: 800, yukseklik: 420, azaltilmisHareket: true };
    const tam = renderToStaticMarkup(<DaireGrafigi {...ortak} seciliSatir={0} />);
    expect(svgYazilari(tam)).toMatch(/°|%/);
    const sade = renderToStaticMarkup(<DaireGrafigi {...ortak} seciliSatir={0} oransiz />);
    expect(svgYazilari(sade)).not.toMatch(/°|%/);
    expect(sade).not.toContain('data-merkez-acisi');
    expect(svgYazilari(sade)).toContain('Uyku: 9');
    expect(svgYazilari(sade)).toContain('Uyku: 9 · bütün 24');
    expect(sade).not.toMatch(/aria-[a-z]+="[^"]*[°%]/);
  });

  it('İstatistik paneli: 6. sınıfta ortalama mutlak sapma ve standart sapma yok (kart, adım, karşılaştırma); 5. sınıfta ölçü yok', () => {
    const mac = ornekBul('mac')!.olustur();
    const panel = (olculer: ReturnType<typeof sinifKurallari>['olculer'], ek: { ikinciSutun?: number; adimlariGoster?: boolean } = {}) =>
      renderToStaticMarkup(<IstatistikPaneli tablo={mac} sutun={1} seciliSatir={null} onSatirSec={bos} adimlariGoster={ek.adimlariGoster ?? true} onAdimlariGoster={bos} ikinciSutun={ek.ikinciSutun} olculer={olculer} />);
    const alti = panel(sinifKurallari(6).olculer);
    for (const v of ['ortalama', 'ortanca', 'tepe', 'aciklik']) expect(alti).toContain(`data-istatistik-karti="${v}"`);
    expect(alti).not.toContain('data-istatistik-karti="oms"');
    expect(alti).not.toContain('data-istatistik-karti="standartSapma"');
    expect(alti).toContain('data-hesap-adimi="aciklik"');
    expect(alti).not.toContain('data-hesap-adimi="oms"');
    expect(alti).not.toContain('data-hesap-adimi="standartSapma"');
    expect(metin(alti)).not.toMatch(/Ortalama mutlak sapma|Standart sapma/);
    const kars = panel(sinifKurallari(6).olculer, { ikinciSutun: 2, adimlariGoster: false });
    expect(kars).not.toContain('data-oms-satiri');
    expect(kars).not.toContain('data-standart-sapma-satiri');
    expect(metin(kars)).toContain('Aritmetik ortalamalar eşit (17); açıklığı küçük olan Yasemin: Değerleri daha dar bir aralıkta (4 < 27).');
    const yedi = panel(sinifKurallari(7).olculer);
    expect(yedi).toContain('data-istatistik-karti="oms"');
    expect(yedi).toContain('data-hesap-adimi="oms"');
    expect(yedi).not.toContain('data-istatistik-karti="standartSapma"');
    expect(yedi).not.toContain('data-hesap-adimi="standartSapma"');
    const bes = panel(sinifKurallari(5).olculer);
    expect(bes).toContain('data-olcusuz-ozet');
    expect(bes).not.toContain('Hesaplama adımlarını göster');
    expect(metin(bes)).not.toMatch(/Merkezi eğilim|Yayılım|Tepe değer|Ortanca|Açıklık/);
    expect(metin(bes)).toContain('Verilerin toplamı 85');
  });
});

// ── Uygulama (sunucu çizimi): uzman notlarının ekranda karşılığı ───────────────────────────────────────────────

describe('uygulama: sınıf düzeyine göre ekran (satır 109–112)', () => {
  it('[109] 5. sınıf: sekmeler Nokta, Sütun, Daire, İstatistik; şeritte ölçü düğmesi yok; İstatistik ölçüsüz', () => {
    const gun = yukle('gun');
    expect(grafikSekmeleri(uygulamaCiz(gun))).toEqual(['Nokta', 'Sütun', 'Daire', 'İstatistik']);
    const nokta = uygulamaCiz({ ...gun, sekme: 'nokta' });
    expect(seritDugmeleri(nokta)).toEqual(['Etiketler']);
    const ist = uygulamaCiz({ ...gun, sekme: 'istatistik', adimlariGoster: true });
    expect(ist).toContain('data-olcusuz-ozet');
    expect(metin(ist)).not.toMatch(/Merkezi eğilim|Yayılım ölçüleri|Standart sapma|Ortalama mutlak sapma|Tepe değer/);
    const daire = uygulamaCiz({ ...gun, sekme: 'daire' });
    const grafik = daire.slice(daire.indexOf('data-grafik="daire"'));
    expect(svgYazilari(grafik.slice(0, grafik.indexOf('</svg>')))).not.toMatch(/°|%/);
  });

  it('[109] 5. sınıf atık: karşılaştırmalı sütunlar yan yana, yüzde yok; İstatistik yalnız iki yönlü tablo, tepe değer / göreli sıklık / merkez açı yok', () => {
    const atik = yukle('atik');
    const sutun = uygulamaCiz({ ...atik, sekme: 'sutun' });
    expect(sutun).toContain('data-yan-sutun=');
    expect(sutun).not.toContain('data-yigin-parcasi');
    const svg = sutun.slice(sutun.indexOf('data-grafik="sutun"'));
    expect(svgYazilari(svg.slice(0, svg.indexOf('</svg>')))).not.toMatch(/%|\(\d+( veri)?\)/);
    const ist = uygulamaCiz({ ...atik, sekme: 'istatistik' });
    expect(ist).toContain('data-capraz-tablo');
    expect(ist).not.toContain('data-siklik-tablosu');
    expect(ist).not.toContain('data-tepe-deger');
    expect(metin(ist)).not.toMatch(/Göreli sıklık|Merkez açı|Tepe değer/);
  });

  it('[109] eski kayıtta sütun modu açık olsa da Nokta grafiği noktaları gösterir', () => {
    const atik = { ...yukle('atik'), sekme: 'nokta' as Sekme, sutunModu: true, ikinciDegisken: null };
    for (const durum of [atik, { ...atik, ornekId: null, tabloAdi: null }]) {
      const html = uygulamaCiz(durum);
      expect(html).toContain('data-grafik="nokta"');
      expect(html).not.toContain('Sütunlara dönüştür');
      expect(html).not.toMatch(/data-yukseklik="(?!0")/);
      expect(html).not.toContain('data-yan-parca-sayisi');
    }
  });

  it('[109] 5. sınıf başkan: tek sıklık tablosunda yalnız Sıklık sütunu; sütunların üstünde yüzde yok', () => {
    const baskan = yukle('baskan');
    const ist = uygulamaCiz({ ...baskan, sekme: 'istatistik' });
    expect(ist).toContain('data-siklik-tablosu');
    expect(metin(ist)).not.toMatch(/Göreli sıklık|Merkez açı|%/);
    const sutun = uygulamaCiz({ ...baskan, sekme: 'sutun' });
    expect(sutun).toContain('data-siklik-yazisi="9"');
    expect(sutun).not.toContain('%45');
  });

  it('[110] 6. sınıf: Çizgi yerine Kök-yaprak, Saçılım yok; şeritte "Aritmetik ortalama" ve Ortanca, ortalama mutlak sapma ve standart sapma yok', () => {
    const kitap = yukle('kitap');
    expect(grafikSekmeleri(uygulamaCiz(kitap))).toEqual(['Nokta', 'Sütun', 'Kök-yaprak', 'Daire', 'İstatistik']);
    expect(grafikSekmeleri(uygulamaCiz(yukle('mac')))).toEqual(['Nokta', 'Sütun', 'Kök-yaprak', 'Daire', 'İstatistik']);
    expect(seritDugmeleri(uygulamaCiz({ ...kitap, sekme: 'nokta' }))).toEqual(['Aritmetik ortalama', 'Ortanca', 'Etiketler']);
    const kok = uygulamaCiz({ ...kitap, sekme: 'kokYaprak' });
    expect(kok).toContain('data-grafik="kok-yaprak"');
    const ist = uygulamaCiz({ ...kitap, sekme: 'istatistik', adimlariGoster: true });
    expect(metin(ist)).not.toMatch(/Ortalama mutlak sapma|Standart sapma/);
    // Ortanca: 10. ve 11. verilerin toplamının yarısı (6-B kitap etkinliği)
    expect(metin(ist)).toContain('20 veri var (çift): Ortanca, 10. ve 11. verilerin toplamının yarısıdır.');
    expect(metin(ist)).toContain('Ortanca = (3 + 3) ÷ 2 = 3');
    // Kayıtta açık kalmış standart sapma 6. sınıfta çizilmez
    const kayitli = uygulamaCiz({ ...kitap, sekme: 'nokta', secenekler: { ortalama: true, oms: true, etiketler: false, ortanca: false, standartSapma: true } });
    expect(kayitli).toContain('data-ortalama-cizgisi');
    expect(kayitli).not.toContain('data-oms-bandi');
    expect(kayitli).not.toContain('data-standart-sapma-bandi');
  });

  it('[110] 6. sınıf basketbol: iki oyuncu aynı grafikte, ikili gruplar (Nokta yan yana, Sütun çiftleri, Kök-yaprak sırt sırta)', () => {
    const mac = yukle('mac');
    const nokta = uygulamaCiz({ ...mac, sekme: 'nokta' });
    expect(nokta).toContain('data-yan-yana-karsilastirma');
    expect(nokta).not.toContain('data-karsilastirma-panelleri');
    expect(nokta.match(/data-grafik="nokta"/g)).toHaveLength(1);
    const sutun = uygulamaCiz({ ...mac, sekme: 'sutun' });
    expect(sutun).toContain('data-ikili');
    expect(sutun.match(/data-cubuk="Selma"/g)).toHaveLength(5);
    expect(sutun).toContain('aria-label="Karşılaştırma için ikinci değişken"');
    const kok = uygulamaCiz({ ...mac, sekme: 'kokYaprak' });
    expect(kok).toContain('data-seri-basligi="Yasemin"');
  });

  it('[111] 7. sınıf sınav: iki sınıf tek nokta grafiğinde (yan yana yığınlar), sütunlar 7A-01 ile 7B-01 çiftleri; standart sapma yok', () => {
    const sinav = yukle('sinav');
    expect(grafikSekmeleri(uygulamaCiz(sinav))).toEqual(['Nokta', 'Sütun', 'Çizgi', 'Daire', 'İstatistik']);
    const nokta = uygulamaCiz({ ...sinav, sekme: 'nokta', secenekler: { ortalama: true, oms: true, etiketler: false, ortanca: false, standartSapma: true } });
    expect(nokta).toContain('data-yan-yana-karsilastirma');
    expect(nokta).not.toContain('data-grup-panelleri');
    expect(nokta).toContain('data-grup-olcu-satiri="7-A"');
    expect(nokta).toContain('data-grup-olcu-satiri="7-B"');
    expect(metin(nokta)).toContain('7-A: Aritmetik ortalama = 70 · Ort. mutlak sapma = 16');
    expect(metin(nokta)).toContain('7-B: Aritmetik ortalama = 70 · Ort. mutlak sapma = 6');
    expect(nokta).not.toContain('data-standart-sapma-bandi');
    expect(seritDugmeleri(nokta)).toEqual(['Aritmetik ortalama', 'Ortanca', 'Ortalama mutlak sapma', 'Etiketler']);
    const sutun = uygulamaCiz({ ...sinav, sekme: 'sutun' });
    expect(sutun).toContain('data-ikili');
    const etiketler = Array.from(sutun.matchAll(/data-tutamak-satir="(\d+)"/g), (m) => Number(m[1]));
    expect(etiketler.slice(0, 4)).toEqual([0, 15, 1, 16]);
    const ist = uygulamaCiz({ ...sinav, sekme: 'istatistik' });
    expect(ist).toContain('data-grup-istatistikleri');
    expect(metin(ist)).not.toContain('Standart sapma');
    expect(metin(ist)).toContain('Ort. mutlak sapma');
  });

  it('[112] 8. sınıf Erzurum ve Adana: sütunlar ay ay yan yana (Ocak: Erzurum, Adana); nokta tek grafikte; standart sapma yok', () => {
    const iklim = yukle('iklim');
    const sutun = uygulamaCiz({ ...iklim, sekme: 'sutun' });
    expect(sutun).toContain('data-ikili');
    expect(sutun.match(/data-grup-etiketi/g)).toHaveLength(12);
    expect(sutun.match(/data-cubuk="Adana \(°C\)"/g)).toHaveLength(12);
    const nokta = uygulamaCiz({ ...iklim, sekme: 'nokta' });
    expect(nokta).toContain('data-yan-yana-karsilastirma');
    expect(seritDugmeleri(nokta)).not.toContain('Standart sapma');
    expect(metin(uygulamaCiz({ ...iklim, sekme: 'istatistik' }))).not.toContain('Standart sapma');
  });

  it('bütün sınıflar: eksen ve lejant adlarının yanında parantez içinde veri sayısı yok; sütun eksenlerinde ok', () => {
    for (const [id, sekme] of [
      ['atik', 'sutun'],
      ['atik', 'nokta'],
      ['atik', 'daire'],
      ['sinav', 'nokta'],
      ['sinav', 'sutun'],
      ['sinav', 'cizgi'],
      ['ekran', 'nokta'],
      ['baskan', 'sutun'],
    ] as [string, Sekme][]) {
      const html = uygulamaCiz({ ...yukle(id), sekme });
      const alan = html.slice(html.indexOf('id="vg-grafik-alani"'));
      expect(svgYazilari(alan), `${id} ${sekme}`).not.toMatch(/\(\d+( veri)?\)|\d+ veri/);
      if (sekme === 'sutun') expect(alan, `${id} ${sekme}`).toContain('data-eksen-oku="yatay"');
    }
  });

  it('sınıfsız tablo (kendi tablonuz): bugünkü davranış — 5 sekme, alt alta paneller, bütün ölçü düğmeleri; sütunda iki seri yan yana (7. tur)', () => {
    const kendi = { ...yukle('mac'), ornekId: null, tabloAdi: null };
    expect(grafikSekmeleri(uygulamaCiz(kendi))).toEqual(['Nokta', 'Sütun', 'Çizgi', 'Daire', 'İstatistik']);
    const nokta = uygulamaCiz({ ...kendi, sekme: 'nokta' });
    expect(nokta).toContain('data-karsilastirma-panelleri');
    expect(nokta).not.toContain('data-yan-yana-karsilastirma');
    expect(seritDugmeleri(nokta)).toEqual(['Aritmetik ortalama', 'Ortanca', 'Ortalama mutlak sapma', 'Standart sapma', 'Etiketler']);
    // Uzman 7. tur: karşılaştırmalı veride sütun grafiği bütün düzeylerde (sınıfsız tablo dahil) tek grafikte, yan yana
    const sutun = uygulamaCiz({ ...kendi, sekme: 'sutun' });
    expect(sutun).toContain('data-ikili');
    expect(sutun.match(/data-grafik="sutun"/g)).toHaveLength(1);
    const ist = uygulamaCiz({ ...kendi, sekme: 'istatistik' });
    expect(ist).toContain('data-standart-sapma-satiri');
    // Sınıfsız örnek dışı tabloda istenmeyen sekme (kayıtta Kök-yaprak) Nokta'ya döner
    const kayit = { ...kendi, sekme: 'kokYaprak' as Sekme };
    expect(uygulamaCiz(kayit)).toMatch(/role="tab" aria-selected="true"[^>]*>Nokta</);
    expect(sutunIndeksi(kendi.tablo, kendi.degisken)).toBeGreaterThan(0);
  });
});
