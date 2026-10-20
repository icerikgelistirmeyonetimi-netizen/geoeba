/**
 * Lise hazır verileri (kullanıcı isteği: "atölye veri tabloda lise içerikleri de yok, kazanımlara uygun hazır veri"):
 * Hazırlık ve 9–12. sınıf konuları, her biri lise istatistik kazanımlarına bağlı örneklerle. Lise kademesinde galeri
 * yalnız lise konularını gösterir (kademeler birikimli değil); Tüm araçlar'da hepsi; İlkokul ve Ortaokul değişmez.
 * Saçılım bütün düzeylerde kapalı kalır (uzman 6. tur); 11. sınıfın iki nicel değişkeni aynı birimde, yan yana sütunlarla.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import VeriGrafikUygulamasi, { DEPO_ANAHTARI } from '../index';
import { LISE_ACILIS_ORNEGI, acilisOrnegi, baslangicDurumu, kademeyeUyarla, ornegiYukle, type Durum } from '../durum';
import { sinifKurallari } from '../sinifKurallari';
import { rozetMetni, kazanimMetni } from '../rehber';
import { ozetHesapla } from '../istatistik';
import { OrnekGalerisi } from '../OrnekGalerisi';
import {
  ORNEK_VERILER,
  gecerliDegerler,
  kademeOrnekleri,
  liseSinifi,
  ornekBul,
  ornekKademede,
  ortaokulSinifi,
  sinifAdi,
  type OrnekVeri,
} from '../veri';
import type { KademeDuzeyi } from '@/components/workspace/kademeDuzeyleri';

const bos = () => undefined;
const kademe = vi.hoisted(() => ({ deger: 'tum' as KademeDuzeyi }));
vi.mock('@/hooks/useKademeDuzeyi', async (orijinal) => {
  const m = await orijinal<typeof import('@/hooks/useKademeDuzeyi')>();
  return {
    ...m,
    useKademeDuzeyi: () => [kademe.deger, bos] as const,
    useIlkokulKipi: () => kademe.deger === 'ilkokul',
    kademeDuzeyiniOku: () => kademe.deger,
  };
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

const LISE = ORNEK_VERILER.filter((o) => liseSinifi(o.sinif));
const sutun = (o: OrnekVeri, ad: string) => o.olustur().sutunlar.findIndex((s) => s.ad === ad);
const degerler = (id: string, ad: string) => {
  const o = ornekBul(id)!;
  return gecerliDegerler(o.olustur(), sutun(o, ad)).map((d) => d.deger);
};
/** Kategorik iki değişkenin çapraz sayımı: "a|b" → adet */
function capraz(id: string, a: string, b: string): Record<string, number> {
  const o = ornekBul(id)!;
  const t = o.olustur();
  const [i, j] = [sutun(o, a), sutun(o, b)];
  const m: Record<string, number> = {};
  for (const r of t.satirlar) m[`${r.hucreler[i]}|${r.hucreler[j]}`] = (m[`${r.hucreler[i]}|${r.hucreler[j]}`] ?? 0) + 1;
  return m;
}
function korelasyon(a: number[], b: number[]): number {
  const ma = a.reduce((t, x) => t + x, 0) / a.length;
  const mb = b.reduce((t, x) => t + x, 0) / b.length;
  const k = a.reduce((t, x, i) => t + (x - ma) * (b[i] - mb), 0);
  return k / Math.sqrt(a.reduce((t, x) => t + (x - ma) ** 2, 0) * b.reduce((t, x) => t + (x - mb) ** 2, 0));
}

describe('lise hazır verileri: konular, kazanımlar, kurallar', () => {
  it('12 lise örneği: hazırlıkta 2, 9. ve 11. sınıfta 3’er, 10. ve 12. sınıfta 2’şer; kazanımlar güncel lise istatistik kodları', () => {
    expect(LISE.map((o) => [o.id, o.sinif])).toEqual([
      ['kahvalti', 'H'], ['harclik', 'H'], ['uyku', 9], ['sarkac', 9], ['mekik', 9], ['okulyolu', 10], ['telefon', 10],
      ['kulac', 11], ['yazili', 11], ['ekranuyku', 11], ['isinma', 12], ['elektrik', 12],
    ]);
    const IZINLI = ['MAT.H.5.1', 'MAT.9.6.1', 'MAT.9.6.2', 'MAT.10.2.1', 'MAT.10.2.2', 'MAT.11.1.1', 'MAT.11.1.2', 'MAT.12.5.1'];
    // Güncel kodlar: içerik paketlerinin kazanım kodları (public/kazanim-icerikleri/liste.json; paket <title>'ı)
    const liste = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../../public/kazanim-icerikleri/liste.json'), 'utf8')) as {
      kazanimlar: Record<string, { kazanimKodu: string; kazanimMetni: string; icerikler?: { kazanimKodu: string; kazanimMetni: string }[] }>;
    };
    const guncel = new Map<string, string>();
    for (const k of Object.values(liste.kazanimlar)) {
      guncel.set(k.kazanimKodu, k.kazanimMetni);
      for (const i of k.icerikler ?? []) guncel.set(i.kazanimKodu, i.kazanimMetni);
    }
    for (const o of LISE) {
      expect(o.kazanim.length, o.id).toBeGreaterThan(0);
      for (const k of o.kazanim) {
        expect(IZINLI, `${o.id} ${k}`).toContain(k);
        // Güncel kod listesinde var ve bir istatistik kazanımı
        expect(guncel.get(k), `${o.id} ${k}`).toMatch(/veri|istatistik/i);
      }
    }
    // Eski kodlar (MAT.10.6.x, MAT.11.3.x) kullanılmaz
    expect(LISE.flatMap((o) => o.kazanim).filter((k) => /^MAT\.(10\.6|11\.3)\./.test(k))).toEqual([]);
  });

  it('lise kuralları: kök-yaprak yok, standart sapma var; histogram ve kutu 9+, koşullu göreli sıklık 10+, saçılım 11+', () => {
    for (const s of ['H', 9, 10, 11, 12] as const) {
      const k = sinifKurallari(s);
      expect(k.sinif).toBe(s);
      const iliski = s === 11 || s === 12;
      expect(k.sekmeler).toEqual(iliski ? ['nokta', 'sutun', 'cizgi', 'daire', 'sacilim', 'istatistik'] : ['nokta', 'sutun', 'cizgi', 'daire', 'istatistik']);
      expect(k.olculer.standartSapma).toBe(true);
      expect(k.tekGrafikteKarsilastir).toBe(true);
      expect(k.histogramVeKutu === true).toBe(s !== 'H');
      expect(k.kosulluGoreliSiklik === true).toBe(s === 10 || s === 11 || s === 12);
    }
    // Ortaokul ve sınıfsız kurallarda hiçbiri yok
    for (const s of [5, 6, 7, 8, null] as const) {
      const k = sinifKurallari(s);
      expect(k.sekmeler).not.toContain('sacilim');
      expect(k.histogramVeKutu ?? false).toBe(false);
      expect(k.kosulluGoreliSiklik ?? false).toBe(false);
    }
    for (const o of LISE) {
      const sekme = o.acilis?.sekme ?? o.onerilenGrafik!;
      expect(sinifKurallari(o.sinif).sekmeler, o.id).toContain(sekme);
      // 11. sınıf örnekleri saçılımla açılır
      if (o.sinif === 11) expect(sekme, o.id).toBe('sacilim');
    }
    expect(liseSinifi('H') && liseSinifi(12) && !liseSinifi(8) && ortaokulSinifi(8) && !ortaokulSinifi(9)).toBe(true);
  });

  it('rozet ve kazanım metni: "Hazırlık", "9. sınıf"; kodlar öğretmen bölümünde', () => {
    expect(rozetMetni(ornekBul('kahvalti')!)).toBe('Hazırlık');
    expect(rozetMetni(ornekBul('uyku')!)).toBe('9. sınıf');
    expect(rozetMetni(ornekBul('elektrik')!)).toBe('12. sınıf');
    expect(sinifAdi('H')).toBe('Hazırlık');
    expect(kazanimMetni(ornekBul('sarkac')!)).toBe('MAT.9.6.1 · 9.6.2');
    expect(kazanimMetni(ornekBul('harclik')!)).toBe('MAT.H.5.1');
  });

  it('kaynaklar: gerçek veri yalnız MGM (ısınma örneği, iki bağlantı); öteki lise örnekleri açıkça kurgusal', () => {
    for (const o of LISE) {
      if (o.id === 'isinma') {
        expect(o.kaynak.tur).toBe('gercek');
        expect([o.kaynak.url, o.kaynak.url2].every((u) => /^https:\/\/www\.mgm\.gov\.tr\//.test(u ?? ''))).toBe(true);
      } else {
        expect(o.kaynak.tur, o.id).toBe('kurgusal');
        expect(o.kaynak.ad, o.id).toMatch(/^Kurgusal/);
        expect(o.kaynak.url, o.id).toBeUndefined();
      }
    }
    // Isınma örneğinin Ankara değerleri uygulamadaki MGM örneğiyle aynı (sicaklik); iki şehrin ölçüm periyodu aynı (TEGM: farklı
    // zaman dilimleri karşılaştırmayı bozar)
    expect(degerler('isinma', 'Ankara (°C)')).toEqual(degerler('sicaklik', 'Sıcaklık (°C)'));
    expect(degerler('isinma', 'Trabzon (°C)')).toEqual([7.6, 7.3, 8.5, 11.8, 15.9, 20.3, 23.1, 23.5, 20.5, 16.7, 13.1, 9.6]);
    expect(ornekBul('isinma')!.hikaye.neZaman).toContain('aynı ölçüm periyodu: 1927–2025');
  });
});

describe('lise hazır verileri: rehber sayıları veriyle tutarlı', () => {
  it('hazırlık: kahvaltı 18 / 13 / 9 (iki sınıf 20’şer); harçlık ortalama 130, ortanca 85', () => {
    expect(capraz('kahvalti', 'Sınıf', 'Kahvaltı')).toEqual({
      'Hazırlık-A|Her gün': 8, 'Hazırlık-A|Haftada birkaç gün': 7, 'Hazırlık-A|Hiç': 5,
      'Hazırlık-B|Her gün': 10, 'Hazırlık-B|Haftada birkaç gün': 6, 'Hazırlık-B|Hiç': 4,
    });
    const h = ozetHesapla(degerler('harclik', 'Harcama (TL)'));
    expect([h.n, h.ortalama, h.medyan]).toEqual([20, 130, 85]);
    const iki = ozetHesapla(degerler('harclik', 'Harcama (TL)').filter((x) => x < 400));
    expect(iki.medyan).toBe(80);
    expect(iki.ortalama!).toBeCloseTo(83.33, 1);
  });

  it('9. sınıf: uyku ortalama ve ortanca 7, 8 saat ve üzeri 6 öğrenci; sarkaç 14,37 → 14,3; mekik 42 / 44, standart sapma ≈ 12 / 4,1', () => {
    const u = degerler('uyku', 'Uyku (saat)');
    const ou = ozetHesapla(u);
    expect([ou.n, ou.ortalama, ou.medyan]).toEqual([30, 7, 7]);
    expect(u.filter((x) => x >= 8)).toHaveLength(6);
    expect(u.filter((x) => x >= 6 && x <= 8)).toHaveLength(26);
    expect(ou.standartSapma!).toBeCloseTo(0.89, 2);
    const s = degerler('sarkac', 'Süre (s)');
    expect(ozetHesapla(s).ortalama!).toBeCloseTo(14.37, 6);
    expect(ozetHesapla(s).medyan).toBe(14.3);
    expect(ozetHesapla(s.filter((x) => x < 15)).ortalama!).toBeCloseTo(14.3, 6);
    expect(ornekBul('sarkac')!.olustur().satirlar[9].hucreler).toEqual(['10. ölçüm', '15,7']);
    const t = ornekBul('mekik')!.olustur();
    const grup = (g: string) => t.satirlar.filter((r) => r.hucreler[1] === g).map((r) => Number(r.hucreler[2]));
    const [a, b] = [ozetHesapla(grup('9-A')), ozetHesapla(grup('9-B'))];
    expect([a.ortalama, b.ortalama, a.aciklik, b.aciklik]).toEqual([42, 44, 42, 15]);
    expect(a.standartSapma!).toBeCloseTo(11.95, 2);
    expect(b.standartSapma!).toBeCloseTo(4.12, 2);
  });

  it('10. sınıf: okul yolu 11/16 yürüyor, uzakta 22/24 toplu taşıma ya da servis; telefon %50 ve %80', () => {
    expect(capraz('okulyolu', 'Uzaklık', 'Geliş biçimi')).toEqual({
      "2 km'ye kadar|Yürüyerek": 11, "2 km'ye kadar|Toplu taşımayla": 3, "2 km'ye kadar|Servisle": 2,
      "2 km'den fazla|Yürüyerek": 2, "2 km'den fazla|Toplu taşımayla": 12, "2 km'den fazla|Servisle": 10,
    });
    expect(capraz('telefon', 'Telefonun yeri', 'Ödev zamanında bitti')).toEqual({
      'Masada|Evet': 15, 'Masada|Hayır': 15, 'Başka odada|Evet': 16, 'Başka odada|Hayır': 4,
    });
  });

  it('11. sınıf: kulaç ile boy çok güçlü (≈ 0,98), yazılılar güçlü (≈ 0,92) ilişkili; tablolar ilk değişkene göre sıralı', () => {
    const boy = degerler('kulac', 'Boy (cm)');
    const kulac = degerler('kulac', 'Kulaç (cm)');
    expect(korelasyon(boy, kulac)).toBeGreaterThan(0.97);
    expect(Math.max(...boy.map((b, i) => Math.abs(kulac[i] - b)))).toBe(4);
    expect([...boy].sort((x, y) => x - y)).toEqual(boy);
    const y1 = degerler('yazili', '1. yazılı');
    const y2 = degerler('yazili', '2. yazılı');
    expect(korelasyon(y1, y2)).toBeGreaterThan(0.9);
    expect(korelasyon(y1, y2)).toBeLessThan(0.94);
    expect([...y1].sort((x, y) => x - y)).toEqual(y1);
    expect(y2.filter((x, i) => x > y1[i])).toHaveLength(14);
    expect(y1.map((x, i) => [x, y2[i]]).filter(([x]) => x < 50)).toEqual([[35, 45], [42, 40], [45, 55], [48, 52]]);
  });

  it('12. sınıf: ısıtma ayları Ankara 7, Trabzon 6 (15 °C’ye uzaklık toplamları 62,5 ve 32,1); panel yalnız yazın tüketimi geçer', () => {
    const fark = (v: number[]) => Math.round(v.filter((x) => x < 15).reduce((t, x) => t + 15 - x, 0) * 10) / 10;
    const ank = degerler('isinma', 'Ankara (°C)');
    const trb = degerler('isinma', 'Trabzon (°C)');
    expect([ank.filter((x) => x < 15).length, trb.filter((x) => x < 15).length]).toEqual([7, 6]);
    expect([fark(ank), fark(trb)]).toEqual([62.5, 32.1]);
    const t = ornekBul('elektrik')!.olustur();
    const tuk = degerler('elektrik', 'Tüketim (kWh)');
    const pan = degerler('elektrik', 'Panel üretimi (kWh)');
    expect(t.satirlar.filter((_, i) => pan[i] > tuk[i]).map((r) => r.hucreler[0])).toEqual(['Haziran', 'Temmuz', 'Ağustos']);
    expect(pan.reduce((a, b) => a + b, 0) / tuk.reduce((a, b) => a + b, 0)).toBeCloseTo(0.758, 3);
  });
});

describe('lise kademesi: galeri, açılış ve uygulama', () => {
  it('Lise galerisi yalnız lise konuları; Ortaokul ve İlkokul galerisinde lise örneği yok; Tüm araçlar hepsini gösterir', () => {
    expect(kademeOrnekleri('lise').map((o) => o.id)).toEqual(LISE.map((o) => o.id));
    for (const o of LISE) {
      expect(ornekKademede(o, 'lise'), o.id).toBe(true);
      expect(ornekKademede(o, 'tum'), o.id).toBe(true);
      expect(ornekKademede(o, 'ortaokul'), o.id).toBe(false);
      expect(ornekKademede(o, 'ilkokul'), o.id).toBe(false);
    }
    kademe.deger = 'lise';
    const html = renderToStaticMarkup(<OrnekGalerisi yukluOrnekId={null} onceki={null} onYukle={bos} onOncekiTabloyaDon={bos} genislik={860} />);
    expect(Array.from(html.matchAll(/data-ornek="([^"]+)"/g), (m) => m[1])).toEqual(LISE.map((o) => o.id));
    expect(html.match(/data-ornek-konusu="/g)).toHaveLength(5);
    for (const ad of ['Hazırlık', '9. sınıf', '10. sınıf', '11. sınıf', '12. sınıf']) expect(html).toContain(`>${ad}<`);
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('açılış: Lise kademesinde 9. sınıfın uyku tablosu; değiştirilmemiş lise örneği Ortaokul’da boy tablosuna döner', () => {
    expect(LISE_ACILIS_ORNEGI).toBe('uyku');
    expect(acilisOrnegi('lise')).toBe('uyku');
    expect(acilisOrnegi('ortaokul')).toBe('boy');
    expect(acilisOrnegi('tum')).toBe('boy');
    expect(baslangicDurumu('lise').ornekId).toBe('uyku');
    const isinma = ornegiYukle(baslangicDurumu(), 'isinma')!.durum;
    expect(kademeyeUyarla(isinma, 'lise')).toBe(isinma);
    expect(kademeyeUyarla(isinma, 'ortaokul').ornekId).toBe('boy');
    expect(kademeyeUyarla(isinma, 'tum')).toBe(isinma);
  });

  it('Lise kademesinde her lise örneği her sekmede temiz çizilir; saçılım sekmesi yalnız 11–12’de, Keşif kartında sınıf rozeti', () => {
    for (const o of LISE) {
      const yuklu = ornegiYukle(baslangicDurumu('lise'), o.id)!.durum;
      for (const sekme of ['nokta', 'sutun', 'cizgi', 'daire', 'sacilim', 'istatistik'] as const) {
        const html = uygulamaCiz({ ...yuklu, sekme }, 'lise');
        expect(html, `${o.id} ${sekme}`).not.toMatch(/NaN|undefined|Infinity/);
        expect(/role="tab"[^>]*>Saçılım</.test(html), `${o.id} ${sekme}`).toBe(o.sinif === 11 || o.sinif === 12);
        expect(html, `${o.id} ${sekme}`).not.toMatch(/role="tab"[^>]*>Kök-yaprak</);
      }
      const acilis = uygulamaCiz(yuklu, 'lise');
      expect(acilis, o.id).toContain(`data-kesif-karti="${o.id}"`);
      expect(acilis, o.id).toContain(`>${rozetMetni(o)}<`);
    }
  });

  it('11. sınıf saçılımla açılır (eksen adları, oklar, r); 12. sınıfın iki değişkeni Çizgi’de tek grafikte iki seri', () => {
    for (const [id, r] of [['kulac', '0,98'], ['yazili', '0,92'], ['ekranuyku', '−0,75']] as const) {
      const html = uygulamaCiz(ornegiYukle(baslangicDurumu('lise'), id)!.durum, 'lise');
      expect(html.match(/data-grafik="sacilim"/g), id).toHaveLength(1);
      expect(html, id).toContain('data-eksen-oku="dikey"');
      expect(html, id).toContain(`data-korelasyon="${r}"`);
      expect(html, id).toContain('data-lise-gorunum="bolgeler"');
    }
    // Farklı birimli iki değişken (dakika, saat) aynı saçılım grafiğinde
    const eu = uygulamaCiz(ornegiYukle(baslangicDurumu('lise'), 'ekranuyku')!.durum, 'lise');
    expect(eu).toMatch(/data-eksen="x"[^>]*>Ekran süresi \(dakika\)</);
    expect(eu).toMatch(/data-eksen="y"[^>]*>Uyku \(saat\)</);
    // Tüm araçlar'da da 11. sınıf örneği saçılımı açar; sınıfsız tabloda kapalı
    const tum = uygulamaCiz(ornegiYukle(baslangicDurumu(), 'kulac')!.durum, 'tum');
    expect(tum).toMatch(/role="tab"[^>]*>Saçılım</);
    const sinifsiz = uygulamaCiz({ ...ornegiYukle(baslangicDurumu(), 'kulac')!.durum, ornekId: null, tabloAdi: null, sekme: 'sacilim' }, 'tum');
    expect(sinifsiz).not.toMatch(/role="tab"[^>]*>Saçılım</);
    expect(sinifsiz).not.toContain('data-grafik="sacilim"');
    for (const id of ['isinma', 'elektrik']) {
      const html = uygulamaCiz(ornegiYukle(baslangicDurumu('lise'), id)!.durum, 'lise');
      expect(html.match(/data-grafik="cizgi"/g), id).toHaveLength(1);
      expect(html.match(/data-cizgi-seri=/g), id).toHaveLength(2);
    }
    // 9. sınıfın iki grubu (mekik) Nokta'da tek grafikte yan yana
    expect(uygulamaCiz(ornegiYukle(baslangicDurumu('lise'), 'mekik')!.durum, 'lise')).toContain('data-yan-yana-karsilastirma');
  });
});
