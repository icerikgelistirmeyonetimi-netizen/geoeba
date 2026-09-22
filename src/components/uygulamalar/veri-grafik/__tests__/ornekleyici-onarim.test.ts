import { describe, expect, it } from 'vitest';
import {
  CEKILIS_SUTUNU,
  ON_AYARLAR,
  TEKRAR_SUTUNU,
  cekilisBaslangici,
  olcuAdi,
  olcumlerEkle,
  silinecekSonucSayisi,
  sonucEkle,
  sonucTablosuUyumlu,
  type OrnekleyiciAyari,
} from '../ornekleyici';
import { KATEGORI_PALETI, SIRA_SUTUNLARI, degiskenSutunlari, kategoriRengi, kutuYerlesimi } from '../kategorik';
import { topDizilimi } from '../grafik';
import { satirSil, sutunEkle } from '../veri';

const para = (): OrnekleyiciAyari => ON_AYARLAR.find((o) => o.id === 'para')!.olustur();

function parlaklik(hex: string): number {
  const d = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * d(r) + 0.7152 * d(g) + 0.0722 * d(b);
}
const karsitlik = (a: string, b: string) => {
  const x = parlaklik(a);
  const y = parlaklik(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe('onarım: deney sonuçları tablosu', () => {
  it('satır silinince Çekiliş numarası yinelenmez (en büyük numara + 1)', () => {
    const a = para();
    let t = sonucEkle(null, a, [['Yazı'], ['Tura'], ['Yazı'], ['Tura'], ['Yazı']]);
    t = satirSil(t, 1);
    expect(cekilisBaslangici(t, a)).toBe(5);
    t = sonucEkle(t, a, [['Tura']]);
    expect(t.satirlar.map((r) => r.hucreler[0])).toEqual(['1', '3', '4', '5', '6']);
  });

  it('"Çekiliş" ve "Tekrar" sütunları yinelense de değişken sayılmaz', () => {
    expect(SIRA_SUTUNLARI.has(CEKILIS_SUTUNU)).toBe(true);
    expect(SIRA_SUTUNLARI.has(TEKRAR_SUTUNU)).toBe(true);
    const a = para();
    const t = sonucEkle(null, a, [['Yazı'], ['Tura']]);
    const cift = { ...t, satirlar: [...t.satirlar, { ...t.satirlar[1], id: 'x' }] };
    expect(degiskenSutunlari(cift).map((s) => s.ad)).toEqual(['Sonuç']);
  });

  it('elle eklenen sütun uyumu bozmaz: satırlar korunur, yeni satırda boş kalır', () => {
    const a = para();
    let t = sonucEkle(null, a, [['Yazı'], ['Tura']]);
    t = sutunEkle(t, 'Not');
    expect(sonucTablosuUyumlu(t, a)).toBe(true);
    expect(silinecekSonucSayisi(t, a)).toBe(0);
    t = sonucEkle(t, a, [['Tura']]);
    expect(t.satirlar).toHaveLength(3);
    expect(t.sutunlar.map((s) => s.ad)).toEqual(['Çekiliş', 'Sonuç', 'Not']);
    expect(t.satirlar[2].hucreler).toEqual(['3', 'Tura', '']);
  });

  it('aygıt yapısı değişince silinecek satır sayısı bildirilir (arayüz önce sorar)', () => {
    const a = para();
    const t = sonucEkle(null, a, [['Yazı'], ['Tura'], ['Yazı']]);
    // etiketlerin hepsi sayı olunca sütun türü etiket → sayı olur: uyumsuz
    const sayili: OrnekleyiciAyari = {
      ...a,
      aygitlar: a.aygitlar.map((x) => (x.tur === 'karistirici' ? { ...x, ogeler: [{ etiket: '1', adet: 1 }, { etiket: '2', adet: 1 }] } : x)),
    };
    expect(silinecekSonucSayisi(t, sayili)).toBe(3);
    const ikili = { ...a, aygitlar: [...a.aygitlar, ON_AYARLAR[1].olustur().aygitlar[0]] };
    expect(silinecekSonucSayisi(t, ikili)).toBe(3);
    expect(silinecekSonucSayisi(null, ikili)).toBe(0);
    expect(silinecekSonucSayisi(t, a)).toBe(0);
  });

  it('sütun adı güncellenir, kimlik ve satırlar korunur', () => {
    const a = para();
    const t = sonucEkle(null, a, [['Yazı']]);
    const b = { ...a, aygitlar: a.aygitlar.map((x) => ({ ...x, degisken: 'Para' })) };
    const u = sonucEkle(t, b, [['Tura']]);
    expect(u.sutunlar[1].ad).toBe('Para');
    expect(u.sutunlar[1].id).toBe(t.sutunlar[1].id);
    expect(u.satirlar.map((r) => r.hucreler)).toEqual([['1', 'Yazı'], ['2', 'Tura']]);
  });
});

describe('onarım: ölçüm adları örneklem büyüklüğünü içerir', () => {
  it('farklı çekiliş sayıları ayrı sütuna yazılır', () => {
    // Aynı örnekleyicide (aynı aygıtlar) yalnız çekiliş sayısı değişir
    const temel = para();
    const a10 = { ...temel, cekilisSayisi: 10 };
    const a100 = { ...temel, cekilisSayisi: 100 };
    expect(olcuAdi(a10)).toBe('Tura sayısı (10 çekiliş)');
    expect(olcuAdi(a100)).toBe('Tura sayısı (100 çekiliş)');
    const x = olcumlerEkle(null, a10, olcuAdi(a10), [5, 4]);
    const y = olcumlerEkle(x.tablo, a100, olcuAdi(a100), [52]);
    expect(y.tablo.sutunlar).toHaveLength(3);
    expect(y.sutunId).not.toBe(x.sutunId);
    const z = olcumlerEkle(y.tablo, a10, olcuAdi(a10), [6]);
    expect(z.sutunId).toBe(x.sutunId);
  });

  it('oran ve sayısal ölçülerde de çekiliş sayısı yazılır', () => {
    const anket = ON_AYARLAR.find((o) => o.id === 'anket')!.olustur();
    expect(olcuAdi(anket)).toBe('Evet oranı (%) (20 çekiliş)');
    const zar = ON_AYARLAR.find((o) => o.id === 'zar')!.olustur();
    expect(olcuAdi(zar)).toBe('Ortalama (Zar, 30 çekiliş)');
  });
});

describe('onarım: top dizilimi (örnekleyici kutusu)', () => {
  it('1–60 topta hiçbir iki top üst üste binmez ve toplar alanın içinde kalır', () => {
    for (let n = 1; n <= 60; n++) {
      const d = topDizilimi(n, 144, 86, 20);
      expect(d.konumlar).toHaveLength(n);
      for (const p of d.konumlar) {
        expect(p.x - d.r).toBeGreaterThanOrEqual(-1e-9);
        expect(p.x + d.r).toBeLessThanOrEqual(144 + 1e-9);
        expect(p.y - d.r).toBeGreaterThanOrEqual(-1e-9);
        expect(p.y + d.r).toBeLessThanOrEqual(86 + 1e-9);
      }
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          const a = d.konumlar[i];
          const b = d.konumlar[j];
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(2 * d.r + 2);
        }
    }
  });

  it('zar (6 top) ve doğum ayı (12 top) toplarına 13 px etiket sığar', () => {
    expect(topDizilimi(6, 144, 86, 20).r).toBeGreaterThanOrEqual(17);
    expect(topDizilimi(12, 144, 86, 20).r).toBeGreaterThanOrEqual(12.5);
    expect(topDizilimi(2, 144, 86, 20).r).toBe(20);
    expect(topDizilimi(0, 144, 86).konumlar).toEqual([]);
  });
});

describe('onarım: ayrık kutu yerleşimi sığma bilgisi', () => {
  it('sığmayan durumda sigdi = false ve yükseklik alanı aşar; sığanda yükseklik ≤ alan', () => {
    const tasan = kutuYerlesimi(500, 30 * 0.94, 300, 6, 1.5);
    expect(tasan.sigdi).toBe(false);
    expect(tasan.yukseklik).toBeGreaterThan(300);
    const sigan = kutuYerlesimi(500, 120, 300);
    expect(sigan.sigdi).toBe(true);
    expect(sigan.yukseklik).toBeLessThanOrEqual(300);
  });
});

describe('onarım: kategori paleti', () => {
  it('12 ayrı renk; açık ve koyu kart zemininde en az 3:1 karşıtlık', () => {
    expect(new Set(KATEGORI_PALETI).size).toBe(12);
    for (const r of KATEGORI_PALETI) {
      expect(karsitlik(r, '#fffbf5')).toBeGreaterThanOrEqual(3);
      expect(karsitlik(r, '#16322e')).toBeGreaterThanOrEqual(3);
    }
    const aylar = Array.from({ length: 12 }, (_, i) => kategoriRengi(`Ay ${i}`, i));
    expect(new Set(aylar).size).toBe(12);
  });
});
