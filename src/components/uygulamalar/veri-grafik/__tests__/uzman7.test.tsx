/**
 * Alan uzmanı 7. tur (geoeba (7).xlsx, atölye inceleme satır 111, Veri ve Grafik, 7. sınıf): "iki veri grubu
 * karşılaştırılırken sadece sütun ve çizgi grafiklerinde veri gruplarının ikisi de aynı grafik içinde gösterilmeli …
 * önce birinci grup, sonra ikinci grup şeklinde değil. Çizgi grafikleri altlı üstlü olmalı. Bütün sınıf seviyelerindeki
 * karşılaştırmalı verilerin olduğu bölümlere uygulanmalı."
 * - Çizgi: bütün gruplar tek eksen takımında, her grup kendi renginde bir çizgi, lejantla; ayrı panel yok.
 * - Sütun: bütün gruplar tek grafikte, her kategoride grupların sütunları yan yana (grup grup değil), lejantla.
 * - Nokta: değişmedi (5–8. sınıfta yan yana yığınlar, sınıfsız tabloda alt alta paneller).
 */
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import VeriGrafikUygulamasi, { DEPO_ANAHTARI } from '../index';
import { baslangicDurumu, ornegiYukle, type Durum } from '../durum';
import { cizgiGruplanir, grupPanelleri } from '../grafikKurallari';
import { grupCizgiTablosu, grupEtiketleriOrtak } from '../ikiliGruplar';
import { ornekBul, tabloOlustur, type VeriTablosu } from '../veri';

const bos = () => undefined;
vi.mock('../ortak', async (orijinal) => {
  const m = await orijinal<typeof import('../ortak')>();
  return {
    ...m,
    useBoyut: (...a: Parameters<typeof m.useBoyut>) => {
      const b = m.useBoyut(...a);
      return b.genislik === 0 && b.yukseklik === 0 ? { genislik: 1000, yukseklik: 600 } : b;
    },
  };
});

function cizDurum(d: Durum) {
  const g = globalThis as { window?: unknown };
  const eski = g.window;
  g.window = { localStorage: { getItem: (k: string) => (k === DEPO_ANAHTARI ? JSON.stringify(d) : null), setItem: bos, removeItem: bos } };
  try {
    return renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1280} />);
  } finally {
    if (eski === undefined) delete g.window;
    else g.window = eski;
  }
}
const ciz = (id: string, ek: Partial<Durum> = {}) => cizDurum({ ...ornegiYukle(baslangicDurumu(), id)!.durum, ipucu: 'kapali', ...ek });
/** Kullanıcının kendi tablosu (örneğe bağlı değil; varsayılan "Tüm araçlar" kademesinde sınıfsız kurallar) */
function kendiTablom(t: VeriTablosu, ek: Partial<Durum>) {
  return cizDurum({ ...baslangicDurumu(), tablo: t, ornekId: null, ornekTemiz: false, tabloAdi: null, ipucu: 'kapali', gorunumler: {}, ...ek });
}
const kimlik = (t: VeriTablosu, ad: string) => t.sutunlar.find((s) => s.ad === ad)!.id;

/** Çizgi grafiğindeki gruplu çizgiler: adı, rengi ve noktaların x konumları */
function cizgiler(h: string) {
  return Array.from(h.matchAll(/<path d="([^"]+)" fill="none" stroke="([^"]+)"[^>]*data-cizgi-grubu="([^"]*)"/g), (m) => ({
    ad: m[3],
    renk: m[2],
    x: Array.from(m[1].matchAll(/[ML] ([-\d.]+) /g), (k) => Number(k[1])),
  }));
}
const lejant = (h: string) => Array.from(h.matchAll(/data-cizgi-seri="([^"]*)"/g), (m) => m[1]);
const eksenAdi = (h: string, e: 'x' | 'y') => new RegExp(`data-eksen="${e}"[^>]*>([^<]*)<`).exec(h)?.[1];
/** Sütun grafiğindeki sütunların seri sırası (soldan sağa) */
const cubukSirasi = (h: string) => Array.from(h.matchAll(/data-cubuk="([^"]*)"/g), (m) => m[1]);
const sutunLejanti = (h: string) => Array.from(h.matchAll(/data-seri="([^"]*)"/g), (m) => m[1]);

/** Sütunlar kategori kategori yan yana mı: k. sütun k mod n. serinin (son eksik kategoriler dışında) */
function yanYanaMi(sira: string[], seriler: string[]) {
  const tam = Math.floor(sira.length / seriler.length) * seriler.length;
  return sira.slice(0, tam).every((s, i) => s === seriler[i % seriler.length]);
}

describe('Uzman 7. tur: karşılaştırmalı veride çizgi ve sütun tek grafikte', () => {
  it.each([
    ['sinav', ['7-A', '7-B'], 15, 'Puan', 'Öğrenci sırası'],
    ['ekran', ['8-A', '8-B', '8-C', '8-D'], 10, 'Süre (dakika)', 'Katılımcı sırası'],
  ] as const)('%s: çizgi grafiği tek; her grup ayrı renkte bir çizgi, ortak eksen, lejant; panel yok', (id, gruplar, n, yAdi, xAdi) => {
    const h = ciz(id, { sekme: 'cizgi' });
    expect(h.match(/data-grafik="cizgi"/g)).toHaveLength(1);
    expect(h).not.toContain('<section');
    expect(h).toContain(`data-cizgi-karsilastirma="${gruplar.length}"`);
    const c = cizgiler(h);
    expect(c.map((x) => x.ad)).toEqual(gruplar);
    expect(new Set(c.map((x) => x.renk)).size).toBe(gruplar.length);
    // Altlı üstlü: her grubun k. verisi aynı yatay yerde (önce 7-A, sonra 7-B değil)
    for (const x of c) {
      expect(x.x).toHaveLength(n);
      expect(x.x).toEqual(c[0].x);
    }
    expect(lejant(h)).toEqual(gruplar);
    // Önceki uzman istekleri: eksen adları ve ok uçları
    expect(eksenAdi(h, 'y')).toBe(yAdi);
    expect(eksenAdi(h, 'x')).toBe(xAdi);
    expect(h).toContain('data-eksen-oku="dikey"');
    expect(h).toContain('data-eksen-oku="yatay"');
    expect(h).toContain('>1.</tspan>');
  });

  it('iklim (8. sınıf, iki sayısal değişken): çizgide tek grafikte iki seri ve lejant', () => {
    const h = ciz('iklim', { sekme: 'cizgi' });
    expect(h.match(/data-grafik="cizgi"/g)).toHaveLength(1);
    expect(lejant(h)).toEqual(['Erzurum (°C)', 'İzmir (°C)']);
    expect(h).toContain('data-eksen-oku="dikey"');
  });

  it.each([
    ['mac', ['Selma', 'Yasemin'], 10],
    ['sinav', ['7-A', '7-B'], 30],
    ['iklim', ['Erzurum (°C)', 'İzmir (°C)'], 24],
    ['ekran', ['8-A', '8-B', '8-C', '8-D'], 40],
  ] as const)('%s: sütun grafiği tek; grupların sütunları kategori kategori yan yana, lejantla', (id, seriler, n) => {
    const h = ciz(id, { sekme: 'sutun' });
    expect(h.match(/data-grafik="sutun"/g)).toHaveLength(1);
    expect(h).toContain('data-ikili');
    expect(sutunLejanti(h)).toEqual(seriler);
    const sira = cubukSirasi(h);
    expect(sira).toHaveLength(n);
    expect(yanYanaMi(sira, [...seriler])).toBe(true);
    expect(h).toContain('data-eksen-oku="yatay"');
  });

  it('nokta grafiği değişmedi: 5–8. sınıfta gruplar tek grafikte yan yana yığınlar', () => {
    for (const id of ['sinav', 'ekran', 'mac']) {
      const h = ciz(id, { sekme: 'nokta' });
      expect(h.match(/data-grafik="nokta"/g), id).toHaveLength(1);
      expect(h, id).toContain('data-yan-yana-karsilastirma');
    }
  });

  it('kullanıcının kendi tablosu (sınıfsız), iki sayısal değişken: sütunda yan yana, çizgide tek grafikte iki seri', () => {
    const t = tabloOlustur(
      ['Ay', 'Ankara (°C)', 'Antalya (°C)'],
      [['Ocak', 0, 10], ['Şubat', 2, 11], ['Mart', 6, 13], ['Nisan', 11, 16]],
      ['etiket', 'sayi', 'sayi'],
    );
    const ek = { degisken: kimlik(t, 'Ankara (°C)'), ikinciDegisken: kimlik(t, 'Antalya (°C)') };
    const s = kendiTablom(t, { ...ek, sekme: 'sutun' });
    expect(s.match(/data-grafik="sutun"/g)).toHaveLength(1);
    expect(s).toContain('data-karsilastirma-turu="sayi"');
    expect(sutunLejanti(s)).toEqual(['Ankara (°C)', 'Antalya (°C)']);
    expect(cubukSirasi(s)).toEqual(['Ankara (°C)', 'Antalya (°C)', 'Ankara (°C)', 'Antalya (°C)', 'Ankara (°C)', 'Antalya (°C)', 'Ankara (°C)', 'Antalya (°C)']);
    const c = kendiTablom(t, { ...ek, sekme: 'cizgi' });
    expect(c.match(/data-grafik="cizgi"/g)).toHaveLength(1);
    expect(lejant(c)).toEqual(['Ankara (°C)', 'Antalya (°C)']);
  });

  it('kullanıcının kendi tablosu, gruplu uzun tablo: çizgide gruplar altlı üstlü, sütunda yan yana; noktada alt alta paneller sürer', () => {
    const t = tabloOlustur(
      ['Hafta', 'Sınıf', 'Kitap sayısı'],
      [1, 2, 3, 4].flatMap((h) => [[`${h}. hafta`, '5-A', h + 2], [`${h}. hafta`, '5-B', 7 - h]]),
      ['etiket', 'etiket', 'sayi'],
    );
    const sinif = kimlik(t, 'Sınıf');
    const ek = { degisken: kimlik(t, 'Kitap sayısı'), renkDegisken: sinif };
    const c = kendiTablom(t, { ...ek, sekme: 'cizgi' });
    expect(c.match(/data-grafik="cizgi"/g)).toHaveLength(1);
    const k = cizgiler(c);
    expect(k.map((x) => x.ad)).toEqual(['5-A', '5-B']);
    expect(k[1].x).toEqual(k[0].x);
    expect(k[0].x).toHaveLength(4);
    // Ortak satır adları yatay eksende kalır ("1. hafta"), eksenin adı ilk sütunun adı
    expect(c).toContain('1. hafta');
    expect(eksenAdi(c, 'x')).toBe('Hafta');
    const s = kendiTablom(t, { ...ek, ikinciDegisken: sinif, sekme: 'sutun' });
    expect(s).toContain('Sınıf (yan yana)');
    expect(sutunLejanti(s)).toEqual(['5-A', '5-B']);
    expect(yanYanaMi(cubukSirasi(s), ['5-A', '5-B'])).toBe(true);
    const n = kendiTablom(t, { ...ek, ikinciDegisken: sinif, sekme: 'nokta' });
    expect(n.match(/data-grafik="nokta"/g)).toHaveLength(2);
  });

  it('tek zaman dizisinin renklenmesi (ayları mevsime göre) gruplanmaz: çizgi satır sırasıyla kalır', () => {
    const t = tabloOlustur(
      ['Ay', 'Mevsim', 'Sıcaklık (°C)'],
      [['Ocak', 'Kış', 0], ['Şubat', 'Kış', 2], ['Mart', 'İlkbahar', 6], ['Nisan', 'İlkbahar', 11], ['Mayıs', 'İlkbahar', 16]],
      ['etiket', 'etiket', 'sayi'],
    );
    const h = kendiTablom(t, { degisken: kimlik(t, 'Sıcaklık (°C)'), renkDegisken: kimlik(t, 'Mevsim'), sekme: 'cizgi' });
    expect(h.match(/data-grafik="cizgi"/g)).toHaveLength(1);
    expect(h).not.toContain('data-cizgi-karsilastirma');
    const k = cizgiler(h);
    expect(k.map((x) => x.ad).sort()).toEqual(['Kış', 'İlkbahar'].sort());
    // İlkbahar Kış'ın ardından gelir (aynı yerde değil)
    const x = (ad: string) => k.find((c) => c.ad === ad)!.x;
    expect(Math.min(...x('İlkbahar'))).toBeGreaterThan(Math.max(...x('Kış')));
  });

  it('grupCizgiTablosu: her grubun k. satırı aynı sırada; seri renkleri grupların renkleri; seçim ve sürükleme asıl satıra döner', () => {
    const sinav = ornekBul('sinav')!.olustur();
    const puan = sinav.sutunlar.findIndex((s) => s.ad === 'Puan');
    const sinifSutun = sinav.sutunlar.findIndex((s) => s.ad === 'Sınıf');
    const g = grupPanelleri(sinav, puan, sinifSutun);
    expect(cizgiGruplanir(sinav, g)).toBe(true);
    expect(grupEtiketleriOrtak(sinav, g)).toBe(false);
    const t = grupCizgiTablosu(sinav, [puan], g, sinifSutun, null);
    expect(t.tablo.satirlar).toHaveLength(15);
    expect(t.tablo.sutunlar.map((s) => s.ad)).toEqual(['Öğrenci sırası', '7-A', '7-B']);
    expect(t.tablo.satirlar[0].hucreler[0]).toBe('1.');
    expect(t.eksenAdi).toBe('Puan');
    expect(new Set(t.renkler).size).toBe(2);
    expect(t.kesikli).toEqual([false, false]);
    // 1. sıradaki iki nokta: 7-A'nın ve 7-B'nin ilk öğrencisi
    const [a, b] = t.karsilik[0];
    expect(sinav.satirlar[a].hucreler[sinifSutun]).toBe('7-A');
    expect(sinav.satirlar[b].hucreler[sinifSutun]).toBe('7-B');
    expect(t.tablo.satirlar[0].hucreler[1]).toBe(sinav.satirlar[a].hucreler[puan]);
    expect(t.tablo.satirlar[0].hucreler[2]).toBe(sinav.satirlar[b].hucreler[puan]);
    expect(t.asilSutunlar).toEqual([puan, puan]);
  });

  it('grupCizgiTablosu: eksik veri boş kalır (çizgiler hizalı); iki değişkende ikinci değişkenin serileri kesikli', () => {
    const t = tabloOlustur(
      ['Ad', 'Grup', 'Boy (cm)', 'Kol (cm)'],
      [['a', 'X', 140, 60], ['b', 'Y', 150, 62], ['c', 'X', 145, 61]],
      ['etiket', 'etiket', 'sayi', 'sayi'],
    );
    const g = grupPanelleri(t, 2, 1);
    const c = grupCizgiTablosu(t, [2, 3], g, 1, null);
    expect(c.tablo.sutunlar.map((s) => s.ad)).toEqual(['Ad sırası', 'X · Boy', 'Y · Boy', 'X · Kol', 'Y · Kol']);
    expect(c.kesikli).toEqual([false, false, true, true]);
    expect(c.tablo.satirlar.map((r) => r.hucreler)).toEqual([
      ['1.', '140', '150', '60', '62'],
      ['2.', '145', '', '61', ''],
    ]);
    expect(c.karsilik[1]).toEqual([2, -1, 2, -1]);
    expect(c.eksenAdi).toBe('Boy (cm) ve Kol (cm)');
  });
});
