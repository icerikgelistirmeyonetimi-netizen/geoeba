// İlkokul kademesi (alan uzmanı incelemesi, 4. tur — geoeba (3).xlsx satır 181, Umut IŞIK): Çizim Stüdyosu'nun Kademe
// menüsünde İlkokul seçiliyken Veri ve Grafik
// - 7-C boy tablosuyla değil 1. sınıf örneğiyle açılır; galeride yalnız 1–4. sınıf örnekleri (her sınıfa bir hazır veri);
// - aritmetik ortalama, ortanca, ortalama mutlak sapma, standart sapma, yüzde, açı; Daire, Çizgi, Saçılım yok;
// - programın temsilleri: 1. sınıf nesne grafiği, 2. sınıf şekil grafiği, 3. sınıf nokta grafiği, 4. sınıf nokta ve
//   sütun grafiği; hepsinde çetele ve sıklık tablosu;
// - Veri topla yolu (5–8. sınıf hazır soruları) gösterilmez; kendi tablosu ilkokulun ortak kurallarıyla çalışır.
// Ortaokul, lise ve Tüm araçlar'da açılış, sekmeler ve ölçüler değişmez.
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import VeriGrafikUygulamasi, { DEPO_ANAHTARI } from '../index';
import {
  ACILIS_ORNEGI,
  ILKOKUL_ACILIS_ORNEGI,
  baslangicDurumu,
  bosTabloAc,
  durumKurallari,
  kademeyeUyarla,
  ornegiYukle,
  sekmeDuzelt,
  tabloDuzenle,
  type Durum,
} from '../durum';
import { ORNEK_VERILER, hucreYaz, ilkokulSinifi, kademeOrnekleri, ornekBul, ornekKademede, sutunIndeksi } from '../veri';
import { ILKOKUL_KURALLARI, SERBEST_KURALLAR, sekmeAdi, sinifKurallari } from '../sinifKurallari';
import { KategorikIstatistik } from '../KategorikGrafikler';
import { NoktaGrafigi } from '../NoktaGrafigi';
import { OrnekGalerisi } from '../OrnekGalerisi';
import { BaslangicModali, baslangicSecenekleri, type BaslangicModaliProps } from '../BaslangicModali';
import { nesneBul } from '../nesneSimgeleri';
import { renkEslemesi } from '../kategorik';
import type { KademeDuzeyi } from '@/components/workspace/kademeDuzeyleri';

const bos = () => undefined;

/** Kademe menüsünün seçimi: sunucu çiziminde useSyncExternalStore hep varsayılanı verir; testte kanca sahtedir */
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
afterEach(() => {
  kademe.deger = 'tum';
});

/** Sunucu çiziminde ölçü yoktur: uygulamanın grafikleri çizmesi için ölçüsüz useBoyut sahte ölçü alır */
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

/** Uygulama kökü: `d` kayıtta (yoksa kayıtsız ilk açılış), `k` kademesinde */
function uygulamaCiz(d: Durum | null, k: KademeDuzeyi): string {
  const kayit = d ? JSON.stringify(d) : null;
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

const yukle = (id: string, ek: Partial<Durum> = {}): Durum => ({ ...ornegiYukle(baslangicDurumu(), id)!.durum, ipucu: 'kapali', ...ek });
const grafikSekmeleri = (html: string) => {
  const liste = html.slice(html.indexOf('aria-label="Grafik türü"'), html.indexOf('data-arac-dugmeleri'));
  return Array.from(liste.matchAll(/role="tab"[^>]*>([^<]+)</g), (m) => m[1]);
};
const seritDugmeleri = (html: string) => {
  const s = html.indexOf('data-secenek-seridi');
  if (s < 0) return [];
  return Array.from(html.slice(s).matchAll(/<button[^>]*aria-pressed="(?:true|false)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span><\/button>/g), (m) => m[1]);
};
const tabloAdi = (html: string) => html.match(/data-tablo-adi[^>]*>([^<]*)</)?.[1]?.replace(/&#x27;/g, "'");
const metin = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

/** Öğrenciye görünen ölçü ve oran sözcükleri (ilkokulda hiçbiri olmamalı) */
const ORTAOKUL_OLCULERI = /Aritmetik ortalama|Ortanca|Ortalama mutlak sapma|Standart sapma|Açıklık|Göreli sıklık|Merkez açı|%\d|\d°/;

// ── Kurallar (saf) ──────────────────────────────────────────────────────────────────────────────────────────

describe('[181] ilkokul kuralları (saf)', () => {
  it('1–4. sınıf: sekmeler, adları, nokta biçimi, çetele; ölçü, yüzde ve açı yok', () => {
    expect(sinifKurallari(1).sekmeler).toEqual(['nokta', 'istatistik']);
    expect(sinifKurallari(2).sekmeler).toEqual(['nokta', 'istatistik']);
    expect(sinifKurallari(3).sekmeler).toEqual(['nokta', 'istatistik']);
    expect(sinifKurallari(4).sekmeler).toEqual(['nokta', 'sutun', 'istatistik']);
    expect([1, 2, 3, 4].map((s) => sinifKurallari(s as 1 | 2 | 3 | 4).noktaSekli)).toEqual(['nesne', 'sekil', 'nokta', 'nokta']);
    expect([1, 2, 3, 4].map((s) => sekmeAdi('nokta', 'Nokta', sinifKurallari(s as 1 | 2 | 3 | 4)))).toEqual([
      'Nesne grafiği',
      'Şekil grafiği',
      'Nokta grafiği',
      'Nokta grafiği',
    ]);
    expect(sekmeAdi('sutun', 'Sütun', sinifKurallari(4))).toBe('Sütun grafiği');
    for (const s of [1, 2, 3, 4] as const) {
      const k = sinifKurallari(s);
      expect(sekmeAdi('istatistik', 'İstatistik', k), String(s)).toBe('Sıklık tablosu');
      expect(k.olculer, String(s)).toEqual({ merkezi: false, aciklik: false, oms: false, standartSapma: false });
      expect(k.yuzdeVeAci, String(s)).toBe(false);
      expect(k.cetele, String(s)).toBe(true);
      expect(k.tekGrafikteKarsilastir, String(s)).toBe(true);
      expect(k.sutunaDonustur, String(s)).toBe(s === 4);
      for (const yok of ['daire', 'cizgi', 'sacilim', 'kokYaprak'] as const) expect(k.sekmeler, `${s} ${yok}`).not.toContain(yok);
    }
  });

  it('İlkokul kademesinde 1–4. sınıf örneğine bağlı olmayan tablo ilkokulun ortak kurallarını alır; öteki kademelerde değişmez', () => {
    expect(sinifKurallari(null, true)).toBe(ILKOKUL_KURALLARI);
    for (const s of [5, 6, 7, 8] as const) expect(sinifKurallari(s, true), String(s)).toBe(ILKOKUL_KURALLARI);
    expect(ILKOKUL_KURALLARI.sekmeler).toEqual(['nokta', 'sutun', 'istatistik']);
    expect(ILKOKUL_KURALLARI.olculer.merkezi || ILKOKUL_KURALLARI.olculer.oms || ILKOKUL_KURALLARI.olculer.standartSapma).toBe(false);
    expect(sinifKurallari(2, true).sinif).toBe(2);
    // İlkokul dışında: 5–8. sınıf ve sınıfsız tablo bugünkü gibi; ortaokul temsilleri
    expect(sinifKurallari(null)).toBe(SERBEST_KURALLAR);
    expect(SERBEST_KURALLAR.noktaSekli).toBe('nokta');
    expect(SERBEST_KURALLAR.cetele).toBe(false);
    expect(SERBEST_KURALLAR.sekmeAdlari).toEqual({});
    for (const s of [5, 6, 7, 8] as const) {
      expect(sinifKurallari(s).noktaSekli, String(s)).toBe('nokta');
      expect(sinifKurallari(s).cetele, String(s)).toBe(false);
      expect(sinifKurallari(s).sutunaDonustur, String(s)).toBe(true);
      expect(sinifKurallari(s).sekmeAdlari, String(s)).toEqual({});
    }
    expect(durumKurallari({ ornekId: 'boy', etkinKume: 'tablom' }, true)).toBe(ILKOKUL_KURALLARI);
    expect(durumKurallari({ ornekId: 'boy', etkinKume: 'tablom' }).sinif).toBe(7);
    expect(durumKurallari({ ornekId: null, etkinKume: 'tablom' }, true)).toBe(ILKOKUL_KURALLARI);
    expect(durumKurallari({ ornekId: 'oyun', etkinKume: 'tablom' }, true).sinif).toBe(2);
  });

  it('sekmeDuzelt (ilkokul): ilkokulda olmayan sekme Nokta olur; ilkokul dışında bugünkü gibi', () => {
    const boy = yukle('boy', { sekme: 'cizgi' });
    expect(sekmeDuzelt(boy, true).sekme).toBe('nokta');
    expect(sekmeDuzelt(boy).sekme).toBe('cizgi');
    expect(sekmeDuzelt(yukle('oyuncak', { sekme: 'sutun' }), true).sekme).toBe('nokta');
    expect(sekmeDuzelt(yukle('gezi', { sekme: 'sutun' }), true).sekme).toBe('sutun');
    expect(sekmeDuzelt(yukle('gezi', { sekme: 'daire' })).sekme).toBe('nokta');
  });

  it('her ilkokul sınıfına bir hazır veri: kategorik, en çok iki veri grubu, kazanım kodu sınıfın', () => {
    const ilkokul = kademeOrnekleri('ilkokul');
    expect(ilkokul.map((o) => [o.id, o.sinif, o.kazanim])).toEqual([
      ['oyuncak', 1, ['MAT.1.4.1']],
      ['oyun', 2, ['MAT.2.4.1']],
      ['gelis', 3, ['MAT.3.4.1']],
      ['gezi', 4, ['MAT.4.4.2']],
    ]);
    for (const o of ilkokul) {
      const t = o.olustur();
      const eksen = t.sutunlar[sutunIndeksi(t, t.sutunlar.find((s) => s.ad === o.varsayilanDegisken)!.id)];
      expect(eksen.tur, o.id).toBe('etiket');
      if (o.renkDegisken) {
        const i = t.sutunlar.findIndex((s) => s.ad === o.renkDegisken);
        expect(new Set(t.satirlar.map((r) => r.hucreler[i])).size, o.id).toBeLessThanOrEqual(2);
      }
      // Tek veri grubu 1. ve 3. sınıfta (programda: temel / tek veri grubu)
      if (o.sinif === 1 || o.sinif === 3) expect(o.renkDegisken, o.id).toBeUndefined();
    }
    expect(ORNEK_VERILER.filter((o) => ilkokulSinifi(o.sinif)).map((o) => o.id)).toEqual(['oyuncak', 'oyun', 'gelis', 'gezi']);
    // Galeri kademeye göre: ilkokulda 1–4, ortaokulda 16 örnek (bugünkü), Tüm araçlar'da hepsi
    expect(kademeOrnekleri('ortaokul')).toHaveLength(16);
    expect(kademeOrnekleri('lise')).toHaveLength(16);
    expect(kademeOrnekleri('tum')).toHaveLength(20);
    expect(ornekKademede(ornekBul('boy')!, 'ilkokul')).toBe(false);
    expect(ornekKademede(ornekBul('oyuncak')!, 'ortaokul')).toBe(false);
    expect(ornekKademede(ornekBul('oyuncak')!, 'tum')).toBe(true);
  });

  it('rehber sayıları veriyle tutarlı (oyuncak, oyun, gelis, gezi)', () => {
    const say = (id: string, sutun: string, grup?: [string, string]) => {
      const t = ornekBul(id)!.olustur();
      const i = t.sutunlar.findIndex((s) => s.ad === sutun);
      const gi = grup ? t.sutunlar.findIndex((s) => s.ad === grup[0]) : -1;
      const m = new Map<string, number>();
      for (const r of t.satirlar) if (!grup || r.hucreler[gi] === grup[1]) m.set(r.hucreler[i], (m.get(r.hucreler[i]) ?? 0) + 1);
      return Object.fromEntries(m);
    };
    expect(say('oyuncak', 'Oyuncak')).toEqual({ Top: 6, Ayıcık: 4, Uçurtma: 3, Araba: 2 });
    expect(say('oyun', 'Oyun', ['Sınıf', '2-A'])).toEqual({ Saklambaç: 5, Seksek: 3, 'İp atlama': 1, Körebe: 1 });
    expect(say('oyun', 'Oyun', ['Sınıf', '2-B'])).toEqual({ 'İp atlama': 5, Saklambaç: 2, Seksek: 2, Körebe: 1 });
    expect(say('gelis', 'Geliş biçimi')).toEqual({ Yürüyerek: 8, Servisle: 5, Arabayla: 3, Bisikletle: 2 });
    expect(say('gezi', 'Gezi yeri', ['Sınıf', '4-A'])).toEqual({ 'Hayvanat bahçesi': 5, 'Bilim merkezi': 3, Müze: 2, Orman: 2 });
    expect(say('gezi', 'Gezi yeri', ['Sınıf', '4-B'])).toEqual({ 'Bilim merkezi': 6, Müze: 3, 'Hayvanat bahçesi': 2, Orman: 1 });
    // Nesne grafiğinin bütün kategorilerinin resmi var
    for (const k of ornekBul('oyuncak')!.kategoriSirasi!.Oyuncak) expect(nesneBul(k), k).not.toBeNull();
  });
});

// ── Açılış ve kademe değişimi (saf) ─────────────────────────────────────────────────────────────────────────

describe('[181] açılış ve kademe değişimi', () => {
  it('ilk açılış: İlkokul\'da 1. sınıf örneği; öteki kademelerde bugünkü 7-C boy tablosu', () => {
    expect(ILKOKUL_ACILIS_ORNEGI).toBe('oyuncak');
    const ilk = baslangicDurumu('ilkokul');
    expect(ilk.ornekId).toBe('oyuncak');
    expect(ilk.ornekTemiz).toBe(true);
    expect(ilk.oncekiTablo).toBeNull();
    expect(ilk.ipucu).toBe('serit');
    expect(baslangicDurumu().ornekId).toBe(ACILIS_ORNEGI);
    const orta = baslangicDurumu('ortaokul');
    expect(orta).toEqual({ ...baslangicDurumu(), tablo: orta.tablo });
  });

  it('kademeyeUyarla: değiştirilmemiş örnek kademenin açılış örneğine döner; kendi tablo, değiştirilmiş örnek ve Tüm araçlar değişmez', () => {
    const boy = baslangicDurumu();
    expect(kademeyeUyarla(boy, 'ilkokul').ornekId).toBe('oyuncak');
    expect(kademeyeUyarla(boy, 'ilkokul').oncekiTablo).toBeNull();
    expect(kademeyeUyarla(boy, 'ortaokul')).toBe(boy);
    expect(kademeyeUyarla(boy, 'tum')).toBe(boy);
    const oyun = yukle('oyun');
    expect(kademeyeUyarla(oyun, 'ilkokul')).toBe(oyun);
    expect(kademeyeUyarla(oyun, 'ortaokul').ornekId).toBe('boy');
    expect(kademeyeUyarla(oyun, 'lise').ornekId).toBe('boy');
    expect(kademeyeUyarla(oyun, 'tum')).toBe(oyun);
    // Değiştirilmiş örnek ve kendi tablo korunur
    const t = boy.tablo;
    const degisik = tabloDuzenle(boy, hucreYaz(t, 0, 1, '150'));
    expect(degisik.ornekTemiz).toBe(false);
    expect(kademeyeUyarla(degisik, 'ilkokul')).toBe(degisik);
    const kendi = bosTabloAc(boy).durum;
    expect(kademeyeUyarla(kendi, 'ilkokul')).toBe(kendi);
    // Veri topla paneli açıkken dokunulmaz
    const panel = { ...boy, toplamaAcik: true };
    expect(kademeyeUyarla(panel, 'ilkokul')).toBe(panel);
  });
});

// ── Uygulama kökü (sunucu çizimi) ───────────────────────────────────────────────────────────────────────────

describe('[181] uygulama kökü: İlkokul kademesi', () => {
  it('kayıtsız ilk açılış: 1. sınıf nesne grafiği; sekmeler "Nesne grafiği", "Sıklık tablosu"; ölçü düğmesi yok; Veri topla yok', () => {
    const html = uygulamaCiz(null, 'ilkokul');
    expect(tabloAdi(html)).toBe("1-A'nın en sevdiği oyuncak");
    expect(grafikSekmeleri(html)).toEqual(['Nesne grafiği', 'Sıklık tablosu']);
    expect(seritDugmeleri(html)).toEqual(['Sayılar']);
    expect(html).not.toContain('data-veri-topla-dugmesi');
    // Her veri bir resim (15 öğrenci); anahtar yazısı
    expect(html.match(/data-nesne="/g)).toHaveLength(15);
    expect(html).toContain('Her resim 1 öğrenciyi gösterir.');
    expect(metin(html)).not.toMatch(ORTAOKUL_OLCULERI);
    expect(metin(html)).not.toContain('7-C');
  });

  it('kayıttaki değiştirilmemiş 7-C boy örneği İlkokul\'da 1. sınıf örneğine döner; ortaokulda olduğu gibi açılır', () => {
    const boy = baslangicDurumu();
    expect(tabloAdi(uygulamaCiz(boy, 'ilkokul'))).toBe("1-A'nın en sevdiği oyuncak");
    const orta = uygulamaCiz(boy, 'ortaokul');
    expect(tabloAdi(orta)).toBe('7-C öğrencilerinin boy uzunlukları');
    expect(grafikSekmeleri(orta)).toEqual(['Nokta', 'Sütun', 'Çizgi', 'Daire', 'Saçılım', 'İstatistik']);
    expect(seritDugmeleri(orta)).toEqual(['Aritmetik ortalama', 'Ortanca', 'Ortalama mutlak sapma', 'Etiketler', 'Sütunlara dönüştür']);
    expect(orta).toContain('data-veri-topla-dugmesi');
    // Tüm araçlar: bugünkü açılış
    expect(tabloAdi(uygulamaCiz(null, 'tum'))).toBe('7-C öğrencilerinin boy uzunlukları');
  });

  it('İlkokul\'da kendi tablosu (değiştirilmiş boy): ilkokulun ortak kuralları — Nokta grafiği, Sütun grafiği, Sıklık tablosu; ölçü yok', () => {
    const boy = baslangicDurumu();
    const degisik = { ...tabloDuzenle(boy, hucreYaz(boy.tablo, 0, 1, '150')), ipucu: 'kapali' as const };
    for (const sekme of ['nokta', 'istatistik', 'cizgi'] as const) {
      const html = uygulamaCiz({ ...degisik, sekme, secenekler: { ortalama: true, oms: true, etiketler: false, ortanca: true, standartSapma: true } }, 'ilkokul');
      expect(grafikSekmeleri(html), sekme).toEqual(['Nokta grafiği', 'Sütun grafiği', 'Sıklık tablosu']);
      expect(metin(html), sekme).not.toMatch(/Aritmetik ortalama|Ortanca|Ortalama mutlak sapma|Standart sapma/);
    }
    expect(seritDugmeleri(uygulamaCiz({ ...degisik, sekme: 'nokta' }, 'ilkokul'))).toEqual(['Etiketler', 'Sütunlara dönüştür']);
    // Sayısal değişkende Sıklık tablosu: değerlerin çetelesi ve sıklığı (ölçü kartı, "Verilerin toplamı" yok)
    const ist = uygulamaCiz({ ...degisik, sekme: 'istatistik' }, 'ilkokul');
    expect(ist).toContain('Çetele ve sıklık tablosu');
    expect(ist).toContain('sayısal değişken');
    expect(ist).toContain('data-cetele-hucresi');
    expect(ist).not.toContain('data-olcusuz-ozet');
    // Ortaokulda aynı tablo bugünkü İstatistik paneliyle
    const orta = uygulamaCiz({ ...degisik, sekme: 'istatistik' }, 'ortaokul');
    expect(orta).not.toContain('data-cetele-hucresi');
    expect(metin(orta)).toMatch(/Aritmetik ortalama/);
  });

  it('denetim: İlkokul\'da değiştirilmiş 7-C örneğinin Keşif şeridi / kartı ve "i" düğmesi yok (rehberi ortalama, sapma ister); ortaokulda var', () => {
    const boy = baslangicDurumu();
    const degisik = tabloDuzenle(boy, hucreYaz(boy.tablo, 0, 1, '150'));
    for (const ipucu of ['serit', 'kart'] as const) {
      for (const sekme of ['nokta', 'sutun', 'istatistik'] as const) {
        const html = uygulamaCiz({ ...degisik, ipucu, sekme }, 'ilkokul');
        expect(tabloAdi(html), `${ipucu}/${sekme}`).toBe('7-C öğrencilerinin boy uzunlukları');
        expect(html, `${ipucu}/${sekme}`).not.toContain('data-ornek-ipucu');
        expect(html, `${ipucu}/${sekme}`).not.toContain('data-ipucu-dugmesi');
        expect(metin(html), `${ipucu}/${sekme}`).not.toMatch(/ortalama|ortanca|sapma|açıklık/i);
      }
      // Ortaokul: bugünkü gibi Keşif ve "i" düğmesi
      const orta = uygulamaCiz({ ...degisik, ipucu, sekme: 'nokta' }, 'ortaokul');
      expect(orta, ipucu).toContain(`data-ornek-ipucu="${ipucu}"`);
      expect(orta, ipucu).toContain('data-ipucu-dugmesi');
    }
    // İlkokul örneğinin Keşif'i İlkokul'da (değiştirilmiş olsa da) yerinde
    const oyuncak = yukle('oyuncak', { ipucu: 'serit' });
    const html = uygulamaCiz(tabloDuzenle(oyuncak, hucreYaz(oyuncak.tablo, 0, 1, 'Araba')), 'ilkokul');
    expect(html).toContain('data-ornek-ipucu="serit"');
    expect(html).toContain('data-ipucu-dugmesi');
  });

  it('2. sınıf: şekil grafiği (her veri bir kare), iki sınıf yan yana, anahtar; sıklık tablosunda çetele', () => {
    const d = yukle('oyun');
    const html = uygulamaCiz(d, 'ilkokul');
    expect(grafikSekmeleri(html)).toEqual(['Şekil grafiği', 'Sıklık tablosu']);
    expect(html.match(/data-sekil="kare"/g)).toHaveLength(20);
    expect(html).toContain('data-yan-yana-karsilastirma');
    expect(html).toContain('Her kare 1 öğrenciyi gösterir.');
    expect(seritDugmeleri(html)).toEqual(['Sayılar']);
    const ist = uygulamaCiz({ ...d, sekme: 'istatistik' }, 'ilkokul');
    expect(ist).toContain('data-capraz-tablo');
    // 4 oyun × 2 sınıf hücresinde çetele
    expect(ist.match(/data-cetele-hucresi/g)).toHaveLength(8);
    expect(metin(ist)).not.toMatch(ORTAOKUL_OLCULERI);
    expect(metin(ist)).not.toContain('Tepe değer');
  });

  it('3. sınıf: nokta grafiği; 4. sınıf: sütun grafiği (yan yana, yüzdesiz) ve "Sütunlara dönüştür"; 1. sınıf sıklık tablosu çeteleli', () => {
    const gelis = uygulamaCiz(yukle('gelis'), 'ilkokul');
    expect(grafikSekmeleri(gelis)).toEqual(['Nokta grafiği', 'Sıklık tablosu']);
    expect(gelis).not.toContain('data-sekil="kare"');
    expect(gelis).not.toContain('data-nesne=');
    const gezi = uygulamaCiz(yukle('gezi'), 'ilkokul');
    expect(grafikSekmeleri(gezi)).toEqual(['Nokta grafiği', 'Sütun grafiği', 'Sıklık tablosu']);
    expect(metin(gezi)).not.toMatch(ORTAOKUL_OLCULERI);
    expect(seritDugmeleri(uygulamaCiz(yukle('gezi', { sekme: 'nokta' }), 'ilkokul'))).toEqual(['Sayılar', 'Sütunlara dönüştür']);
    const ist = uygulamaCiz(yukle('oyuncak', { sekme: 'istatistik' }), 'ilkokul');
    expect(ist).toContain('Çetele ve sıklık tablosu');
    expect(ist.match(/data-cetele-hucresi/g)).toHaveLength(4);
    expect(ist).not.toContain('Sıklık çubuğu');
    expect(metin(ist)).not.toMatch(ORTAOKUL_OLCULERI);
  });

  it('kayıtta açık kalmış sütun modu 1. sınıfta çizilmez (sütun grafiği yok)', () => {
    const html = uygulamaCiz(yukle('oyuncak', { sutunModu: true }), 'ilkokul');
    expect(html).not.toContain(', sütunlar"');
    expect(html.match(/data-nesne="/g)).toHaveLength(15);
  });
});

// ── Galeri ve başlangıç penceresi ───────────────────────────────────────────────────────────────────────────

describe('[181] galeri ve başlangıç penceresi kademeye göre', () => {
  const galeri = (k: KademeDuzeyi) => {
    kademe.deger = k;
    return renderToStaticMarkup(<OrnekGalerisi yukluOrnekId={null} onceki={null} onYukle={bos} onOncekiTabloyaDon={bos} genislik={860} />);
  };

  it('İlkokul: 4 örnek (1–4. sınıf); ortaokul ve lise: bugünkü 16 örnek; Tüm araçlar: 20', () => {
    const ilk = galeri('ilkokul');
    expect(Array.from(ilk.matchAll(/data-ornek="([^"]+)"/g), (m) => m[1])).toEqual(['oyuncak', 'oyun', 'gelis', 'gezi']);
    expect(metin(ilk)).toContain('1. sınıf · Nesne grafiği, çetele ve sıklık tablosu');
    expect(metin(ilk)).not.toContain('7-C');
    for (const k of ['ortaokul', 'lise'] as const) {
      const html = galeri(k);
      expect(html.match(/data-ornek="/g), k).toHaveLength(16);
      expect(html, k).not.toContain('data-ornek="oyuncak"');
    }
    expect(galeri('tum').match(/data-ornek="/g)).toHaveLength(20);
  });

  it('İlkokul\'da başlangıç penceresinde iki yol (Örnek veri · 4 hazır tablo, Boş tablo); Veri topla adımı istenirse seçim adımı', () => {
    expect(baslangicSecenekleri('ilkokul').map((s) => s.id)).toEqual(['hazir', 'bos']);
    expect(baslangicSecenekleri('ilkokul')[0].not).toBe('4 hazır tablo');
    expect(baslangicSecenekleri('ortaokul').map((s) => [s.id, s.not])).toEqual([
      ['hazir', '16 hazır tablo'],
      ['topla', '18 hazır soru · kendi sorunuz'],
      ['bos', 'Etiket · Değer'],
    ]);
    const d = baslangicDurumu('ilkokul');
    const props: BaslangicModaliProps = {
      baslangic: 'topla',
      onKapat: bos,
      genislik: 1366,
      simdiki: { ad: "1-A'nın en sevdiği oyuncak", satirSayisi: d.tablo.satirlar.length },
      yukluOrnekId: d.ornekId,
      onceki: null,
      onOrnekYukle: bos,
      onOncekiTabloyaDon: bos,
      arastirma: null,
      bagli: false,
      tablo: d.tablo,
      onPlaniUygula: bos,
      onDevam: bos,
      planUyarisi: () => null,
      onBosTablo: bos,
    };
    kademe.deger = 'ilkokul';
    const html = renderToStaticMarkup(<BaslangicModali {...props} />);
    expect(html).toContain('data-baslangic-modali="secim"');
    expect(Array.from(html.matchAll(/data-baslangic-secenek="([^"]+)"/g), (m) => m[1])).toEqual(['hazir', 'bos']);
    expect(html).toContain('grid-cols-2');
    kademe.deger = 'ortaokul';
    expect(renderToStaticMarkup(<BaslangicModali {...props} />)).toContain('data-baslangic-modali="topla"');
  });
});

// ── Bileşenler ──────────────────────────────────────────────────────────────────────────────────────────────

describe('[181] nesne / şekil grafiği ve çetele (bileşen)', () => {
  const oyuncak = ornekBul('oyuncak')!.olustur();
  const ciz = (sekil: 'nokta' | 'sekil' | 'nesne', tablo = oyuncak, sutun = 1) =>
    renderToStaticMarkup(
      <NoktaGrafigi
        tablo={tablo}
        sutun={sutun}
        seciliSatir={null}
        onSatirSec={bos}
        onDegiskenBirak={bos}
        aralik={1}
        secenekler={{ ortalama: false, oms: false, etiketler: false }}
        sutunModu={false}
        genislik={800}
        yukseklik={400}
        azaltilmisHareket
        surukleniyor={false}
        sekil={sekil}
        sekilAnahtari="Her resim 1 öğrenciyi gösterir."
      />,
    );

  it('nesne: her veri kategorisinin resmi; şekil: kare; nokta: daire ve anahtar yazısı yok', () => {
    const nesne = ciz('nesne');
    expect(Array.from(nesne.matchAll(/data-nesne="([^"]+)"/g), (m) => m[1]).sort()).toEqual(
      [...Array(6).fill('top'), ...Array(4).fill('ayicik'), ...Array(3).fill('ucurtma'), ...Array(2).fill('araba')].sort(),
    );
    expect(nesne).toContain('data-sekil-anahtari');
    expect(ciz('sekil').match(/data-sekil="kare"/g)).toHaveLength(15);
    const nokta = ciz('nokta');
    expect(nokta).not.toContain('data-sekil=');
    expect(nokta).not.toContain('data-nesne=');
    expect(nokta).not.toContain('data-sekil-anahtari');
  });

  it('sayısal değişkende şekil / nesne istense de nokta (daire)', () => {
    const boy = ornekBul('boy')!.olustur();
    const html = ciz('nesne', boy, 1);
    expect(html).not.toContain('data-nesne=');
    expect(html).not.toContain('data-sekil=');
  });

  it('çetele: tek yönlü tabloda çubuk yerine Çetele sütunu; iki yönlüde hücrelerde; kapalıyken bugünkü tablo', () => {
    const t = ornekBul('gelis')!.olustur();
    const acik = renderToStaticMarkup(<KategorikIstatistik tablo={t} sutun={1} tepeDeger={false} oranlar={false} cetele />);
    expect(acik).toContain('Çetele ve sıklık tablosu');
    expect(acik.match(/data-cetele-hucresi/g)).toHaveLength(4);
    expect(acik).not.toContain('Sıklık çubuğu');
    const kapali = renderToStaticMarkup(<KategorikIstatistik tablo={t} sutun={1} tepeDeger={false} oranlar={false} />);
    expect(kapali).not.toContain('data-cetele-hucresi');
    expect(kapali).toContain('Sıklık çubuğu');
    const gezi = ornekBul('gezi')!.olustur();
    const eslem = renkEslemesi(gezi, 1)!;
    const iki = renderToStaticMarkup(<KategorikIstatistik tablo={gezi} sutun={2} renkEslemi={eslem} tepeDeger={false} oranlar={false} tekYonluIleBirlikte={false} cetele />);
    expect(iki).toContain('data-capraz-tablo');
    expect(iki).not.toContain('data-siklik-tablosu');
    expect(iki.match(/data-cetele-hucresi/g)).toHaveLength(8);
  });
});
