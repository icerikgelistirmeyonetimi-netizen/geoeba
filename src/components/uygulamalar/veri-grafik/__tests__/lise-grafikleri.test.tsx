/**
 * Lise araçları (kullanıcı kararı, 20.10: "Saçılımı yalnız lise (11. sınıf ve sonrası) için aç, 10. sınıfa koşullu göreli
 * sıklık ekle, 9. sınıfta histogram ve kutu grafiğini denetle, kazanım kodlarını güncelle"):
 * - 9–12: histogram (Sütun), kutu grafiği (Nokta), çeyrekler açıklığı (İstatistik) — MAT.9.6.1 süreç bileşeni.
 * - 10–12: koşullu göreli sıklıklar (iki yönlü tablonun yüzdeli hâli, grup içinde yüzdeli sütunlar) — MAT.10.2.1.
 * - 11–12: saçılım grafiği, ortalama çizgileriyle bölgelere göre sayım, korelasyon katsayısı — MAT.11.1.1.
 * Ortaokul ve sınıfsız tablolarda hiçbiri görünmez.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import VeriGrafikUygulamasi, { DEPO_ANAHTARI } from '../index';
import { baslangicDurumu, ornegiYukle, type Durum } from '../durum';
import { ceyrekler, histogramSiniflari, korelasyon } from '../istatistik';
import { Histogram, KutuGrafigi, besSayi } from '../LiseGrafikleri';
import { KategorikIstatistik, KategorikSutunGrafigi, grupToplamlari } from '../KategorikGrafikler';
import { SacilimGrafigi, bolgeSayilari } from '../SacilimGrafigi';
import { IstatistikPaneli } from '../IstatistikPaneli';
import { renkEslemesi } from '../kategorik';
import { gecerliDegerler, ornekBul, type VeriTablosu } from '../veri';
import type { KademeDuzeyi } from '@/components/workspace/kademeDuzeyleri';

const bos = () => undefined;
const kademe = vi.hoisted(() => ({ deger: 'tum' as KademeDuzeyi }));
vi.mock('@/hooks/useKademeDuzeyi', async (orijinal) => {
  const m = await orijinal<typeof import('@/hooks/useKademeDuzeyi')>();
  return { ...m, useKademeDuzeyi: () => [kademe.deger, bos] as const, useIlkokulKipi: () => kademe.deger === 'ilkokul', kademeDuzeyiniOku: () => kademe.deger };
});
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
afterEach(() => {
  kademe.deger = 'tum';
});

function uygulamaCiz(d: Durum, k: KademeDuzeyi): string {
  const kayit = JSON.stringify(d);
  const g = globalThis as { window?: unknown };
  const eski = g.window;
  g.window = { localStorage: { getItem: (x: string) => (x === DEPO_ANAHTARI ? kayit : null), setItem: bos, removeItem: bos } };
  sahte.boyut = { genislik: 1000, yukseklik: 500 };
  kademe.deger = k;
  try {
    return renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1280} />);
  } finally {
    sahte.boyut = null;
    if (eski === undefined) delete g.window;
    else g.window = eski;
  }
}
const yukle = (id: string, ek: Partial<Durum> = {}, k: KademeDuzeyi = 'lise') => ({ ...ornegiYukle(baslangicDurumu(k), id)!.durum, ipucu: 'kapali' as const, ...ek });
const sutunBul = (t: VeriTablosu, ad: string) => t.sutunlar.findIndex((s) => s.ad === ad);
const MEKIK_A = [28, 52, 35, 64, 40, 33, 47, 22, 55, 38, 44, 30, 58, 36, 48];
const MEKIK_B = [42, 46, 39, 48, 44, 41, 50, 43, 37, 45, 47, 40, 52, 44, 42];

describe('lise ölçüleri (saf)', () => {
  it('çeyrekler: alt ve üst yarının ortancası (tek veri sayısında ortanca iki yarıya da girmez); çeyrekler açıklığı', () => {
    expect(ceyrekler(MEKIK_A)).toEqual({ q1: 33, q3: 52, aciklik: 19 });
    expect(ceyrekler(MEKIK_B)).toEqual({ q1: 41, q3: 47, aciklik: 6 });
    expect(ceyrekler([1, 2, 3, 4])).toEqual({ q1: 1.5, q3: 3.5, aciklik: 2 });
    expect(ceyrekler([5])).toBeNull();
    expect(besSayi(MEKIK_A)).toEqual({ enKucuk: 22, q1: 33, ortanca: 40, q3: 52, enBuyuk: 64 });
  });

  it('korelasyon: tam doğrusal 1 ve −1, sabit değişkende null; örneklerde 0,98 / 0,92 / −0,75', () => {
    expect(korelasyon([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
    expect(korelasyon([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 10);
    expect(korelasyon([1, 2, 3], [5, 5, 5])).toBeNull();
    const r = (id: string, a: string, b: string) => {
      const t = ornekBul(id)!.olustur();
      return korelasyon(gecerliDegerler(t, sutunBul(t, a)).map((d) => d.deger), gecerliDegerler(t, sutunBul(t, b)).map((d) => d.deger))!;
    };
    expect(r('kulac', 'Boy (cm)', 'Kulaç (cm)')).toBeCloseTo(0.975, 3);
    expect(r('yazili', '1. yazılı', '2. yazılı')).toBeCloseTo(0.92, 2);
    expect(r('ekranuyku', 'Ekran süresi (dakika)', 'Uyku (saat)')).toBeCloseTo(-0.753, 3);
  });

  it('histogram sınıfları eşit genişlikte, bitişik; her veri bir sınıfta, en büyük değer son sınıfta', () => {
    const t = ornekBul('uyku')!.olustur();
    const u = gecerliDegerler(t, 1).map((d) => d.deger);
    const h = histogramSiniflari(u);
    expect(h.siniflar.reduce((s, x) => s + x.sayi, 0)).toBe(30);
    for (let i = 1; i < h.siniflar.length; i++) expect(h.siniflar[i].alt).toBe(h.siniflar[i - 1].ust);
    expect(new Set(h.siniflar.map((x) => Math.round((x.ust - x.alt) * 1e6)))).toEqual(new Set([Math.round(h.genislik * 1e6)]));
    expect(h.siniflar[0].alt).toBeLessThanOrEqual(5);
    expect(h.siniflar[h.siniflar.length - 1].ust).toBeGreaterThanOrEqual(9);
    expect(histogramSiniflari(MEKIK_A, 6, 10).siniflar.map((x) => [x.alt, x.sayi])).toEqual([[20, 2], [30, 5], [40, 4], [50, 3], [60, 1]]);
  });

  it('bölgelere göre sayım (ortalama çizgileri): kulaç 9 / 10 / 1 çizgide; ekran-uyku azalan bölgelerde 18', () => {
    const noktalar = (id: string, a: string, b: string) => {
      const t = ornekBul(id)!.olustur();
      return t.satirlar.map((r) => ({ x: Number(r.hucreler[sutunBul(t, a)].replace(',', '.')), y: Number(r.hucreler[sutunBul(t, b)].replace(',', '.')) }));
    };
    expect(bolgeSayilari(noktalar('kulac', 'Boy (cm)', 'Kulaç (cm)'))).toMatchObject({ sagUst: 9, solUst: 0, solAlt: 10, sagAlt: 0, cizgide: 1 });
    expect(bolgeSayilari(noktalar('yazili', '1. yazılı', '2. yazılı'))).toMatchObject({ sagUst: 10, solUst: 2, solAlt: 10, sagAlt: 2, cizgide: 0 });
    expect(bolgeSayilari(noktalar('ekranuyku', 'Ekran süresi (dakika)', 'Uyku (saat)'))).toMatchObject({ sagUst: 5, solUst: 10, solAlt: 1, sagAlt: 8 });
  });
});

describe('lise grafikleri (SSR)', () => {
  const ortak = { genislik: 900, yukseklik: 420 };
  it('histogram: bitişik sütunlar, eksen adları ve oklar; iki grup her sınıfta yan yana (tek grafik)', () => {
    const tek = renderToStaticMarkup(<Histogram gruplar={[{ ad: 'Tur sayısı', renk: '#2f8394', degerler: MEKIK_A }]} degiskenAdi="Tur sayısı" sinifGenisligi={10} {...ortak} />);
    expect(tek).toContain('data-grafik="histogram"');
    expect(tek.match(/data-histogram-sutunu=/g)).toHaveLength(5);
    expect(tek).toContain('data-eksen-oku="dikey"');
    expect(tek).toContain('data-eksen-oku="yatay"');
    expect(tek).toMatch(/data-eksen-adi="yatay"[^>]*>Tur sayısı</);
    expect(tek).toMatch(/data-eksen-adi="dikey"[^>]*>Sıklık</);
    const iki = renderToStaticMarkup(
      <Histogram gruplar={[{ ad: '9-A', renk: '#2f8394', degerler: MEKIK_A }, { ad: '9-B', renk: '#c8684a', degerler: MEKIK_B }]} degiskenAdi="Tur sayısı" sinifGenisligi={10} {...ortak} />,
    );
    expect(iki.match(/data-grafik="/g)).toHaveLength(1);
    expect(iki.match(/data-histogram-sutunu="9-A"/g)).toHaveLength(5);
    expect(iki.match(/data-histogram-sutunu="9-B"/g)).toHaveLength(5);
    expect(Array.from(iki.matchAll(/data-histogram-sutunu="9-B" data-sayi="(\d+)"/g), (m) => Number(m[1]))).toEqual([0, 2, 11, 2, 0]);
    expect(iki).toContain('data-seri="9-A"');
    expect(iki).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('kutu grafiği: beş sayı; iki grup ortak eksende tek grafikte', () => {
    const html = renderToStaticMarkup(
      <KutuGrafigi gruplar={[{ ad: '9-A', renk: '#2f8394', degerler: MEKIK_A }, { ad: '9-B', renk: '#c8684a', degerler: MEKIK_B }]} degiskenAdi="Tur sayısı" {...ortak} />,
    );
    expect(html.match(/data-grafik="kutu"/g)).toHaveLength(1);
    expect(html).toContain('data-bes-sayi="22;33;40;52;64"');
    expect(html).toContain('data-bes-sayi="37;41;44;47;52"');
    expect(html).toContain('data-eksen-oku="yatay"');
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('koşullu göreli sıklık: yüzdeli sütunlar (her grup %100) ve iki yönlü tablonun yüzdeli hâli (sütun ya da satır toplamı)', () => {
    const o = ornekBul('okulyolu')!;
    const t = o.olustur();
    const g = sutunBul(t, 'Geliş biçimi');
    const u = sutunBul(t, 'Uzaklık');
    const eslem = renkEslemesi(t, u, o.kategoriSirasi!.Uzaklık);
    const sira = o.kategoriSirasi!['Geliş biçimi'];
    const sayi = renderToStaticMarkup(<KategorikSutunGrafigi tablo={t} sutun={g} sira={sira} renkEslemi={eslem} azaltilmisHareket {...ortak} />);
    expect(sayi).not.toContain('data-kosullu-yuzde');
    const yuzde = renderToStaticMarkup(<KategorikSutunGrafigi tablo={t} sutun={g} sira={sira} renkEslemi={eslem} azaltilmisHareket kosulluYuzde {...ortak} />);
    expect(yuzde).toContain('data-kosullu-yuzde');
    expect(yuzde).toContain('data-yan-sutun="2 km&#x27;ye kadar" data-sayi="11" data-yuzde="68,8"');
    expect(yuzde).toContain('data-yan-sutun="2 km&#x27;den fazla" data-sayi="2" data-yuzde="8,3"');
    expect(yuzde).toMatch(/data-eksen-adi="dikey"[^>]*>Yüzde</);
    expect(grupToplamlari([{ sayilar: [11, 2], bos: 0 }, { sayilar: [3, 12], bos: 0 }, { sayilar: [2, 10], bos: 0 }])).toEqual({ sayilar: [16, 24], bos: 0 });

    const tablo = renderToStaticMarkup(<KategorikIstatistik tablo={t} sutun={g} sira={sira} renkEslemi={eslem} kosullu />);
    expect(tablo).toContain('data-kosullu-tablo="sutun"');
    expect(tablo).toMatch(/data-kosullu-hucre="Yürüyerek\|2 km&#x27;ye kadar">%68,8</);
    expect(tablo).toMatch(/data-kosullu-hucre="Toplu taşımayla\|2 km&#x27;den fazla">%50</);
    const satir = renderToStaticMarkup(<KategorikIstatistik tablo={t} sutun={g} sira={sira} renkEslemi={eslem} kosullu kosulluPayda="satir" />);
    expect(satir).toMatch(/data-kosullu-hucre="Yürüyerek\|2 km&#x27;ye kadar">%84,6</);
    // Kural yokken (ortaokul) yüzdeli tablo yok
    expect(renderToStaticMarkup(<KategorikIstatistik tablo={t} sutun={g} sira={sira} renkEslemi={eslem} />)).not.toContain('data-kosullu-tablo');
  });

  it('saçılım: eksen okları; ortalama çizgileri ve dört bölgenin sayıları', () => {
    const t = ornekBul('kulac')!.olustur();
    const props = { tablo: t, xSutun: 1, ySutun: 2, seciliSatir: null, onSatirSec: bos, azaltilmisHareket: true, ...ortak };
    const kapali = renderToStaticMarkup(<SacilimGrafigi {...props} />);
    expect(kapali).toContain('data-eksen-oku="dikey"');
    expect(kapali).not.toContain('data-sacilim-bolgeleri');
    const acik = renderToStaticMarkup(<SacilimGrafigi {...props} bolgeler />);
    expect(acik).toContain('data-ortalama-cizgisi="x"');
    expect(acik).toMatch(/data-bolge-sayisi="sagUst"[^>]*>9 nokta</);
    expect(acik).toMatch(/data-bolge-sayisi="solAlt"[^>]*>10 nokta</);
  });

  it('İstatistik: çeyrekler açıklığı yalnız istenince (lise 9–12)', () => {
    const t = ornekBul('uyku')!.olustur();
    const p = { tablo: t, sutun: 1, seciliSatir: null, onSatirSec: bos, adimlariGoster: false, onAdimlariGoster: bos };
    expect(renderToStaticMarkup(<IstatistikPaneli {...p} />)).not.toContain('data-istatistik-karti="ceyreklerAcikligi"');
    const html = renderToStaticMarkup(<IstatistikPaneli {...p} ceyrekler />);
    expect(html).toContain('data-istatistik-karti="ceyreklerAcikligi"');
    expect(html).toContain('Çeyrekler açıklığı');
  });
});

describe('lise araçları uygulamada: yalnız sınıf kuralı izin verince', () => {
  it('9. sınıf: Sütun’da Histogram, Nokta’da Kutu grafiği düğmesi, İstatistik’te çeyrekler açıklığı; koşullu yüzde ve saçılım yok', () => {
    expect(uygulamaCiz(yukle('uyku', { sekme: 'sutun' }), 'lise')).toContain('data-lise-gorunum="histogram"');
    expect(uygulamaCiz(yukle('uyku', { sekme: 'nokta' }), 'lise')).toContain('data-lise-gorunum="kutu"');
    expect(uygulamaCiz(yukle('uyku', { sekme: 'istatistik' }), 'lise')).toContain('data-istatistik-karti="ceyreklerAcikligi"');
    expect(uygulamaCiz(yukle('uyku', { sekme: 'nokta' }), 'lise')).not.toMatch(/role="tab"[^>]*>Saçılım</);
  });

  it('10. sınıf: kategorik Sütun’da "Grup içinde yüzde", İstatistik’te koşullu göreli sıklıklar ve göreli sıklık sütunu', () => {
    expect(uygulamaCiz(yukle('okulyolu', { sekme: 'sutun' }), 'lise')).toContain('data-lise-gorunum="kosullu"');
    // Gruplar ayrı gösterilirken her grubun sıklık tablosu; koşullu tablo birleşik gösterimde
    expect(uygulamaCiz(yukle('okulyolu', { sekme: 'istatistik', grupBirlesik: false }), 'lise')).toContain('data-ayri-gruplar="istatistik"');
    const ist = uygulamaCiz(yukle('okulyolu', { sekme: 'istatistik', grupBirlesik: true }), 'lise');
    expect(ist).toContain('data-kosullu-tablo="sutun"');
    expect(ist).toContain('Göreli sıklık');
    // Hazırlık ve 9. sınıfta koşullu tablo yok
    expect(uygulamaCiz(yukle('kahvalti', { sekme: 'istatistik' }), 'lise')).not.toContain('data-kosullu-tablo');
  });

  it('ortaokul değişmez: histogram, kutu, koşullu yüzde ve çeyrekler açıklığı yok', () => {
    const boy = (sekme: Durum['sekme']) => uygulamaCiz(yukle('boy', { sekme }, 'ortaokul'), 'ortaokul');
    expect(boy('sutun')).not.toContain('data-lise-gorunum');
    expect(boy('nokta')).not.toContain('data-lise-gorunum');
    expect(boy('istatistik')).not.toContain('ceyreklerAcikligi');
    const atik = (sekme: Durum['sekme']) => uygulamaCiz(yukle('atik', { sekme }, 'ortaokul'), 'ortaokul');
    expect(atik('sutun')).not.toContain('data-lise-gorunum');
    expect(atik('istatistik')).not.toContain('data-kosullu-tablo');
  });
});
