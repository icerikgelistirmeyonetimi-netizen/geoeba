// Sahip: D1 (vg/kategorik.ts)
import { describe, expect, it } from 'vitest';
import {
  ARASTIRMA_ROLLERI,
  KATEGORI_PALETI,
  SIRA_SUTUNLARI,
  TEPE_DEGER_YOK,
  arastirmaSutunRolu,
  degiskenSutunlari,
  frekanslar,
  kategoriRengi,
  kategoriler,
  kategorikMi,
  kenarGerekir,
  kutuYerlesimi,
  mod,
  sutunMetinleri,
  yonelmeEkli,
  type ArastirmaSutunRolu,
} from '../kategorik';
import { kimlikUret, tabloOlustur, type Sutun, type SutunTuru, type VeriTablosu } from '../veri';

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

/** CIE76 renk farkı (sRGB → CIELAB, D65) */
function lab(hex: string): [number, number, number] {
  const d = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = [1, 3, 5].map((i) => d(parseInt(hex.slice(i, i + 2), 16)));
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const deltaE = (a: string, b: string) => {
  const p = lab(a);
  const q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

// ── Araştırma sütun rolleri için yardımcılar ────────────────────────────────
const AR = 'ar7-x3k2';

function tablo(sutunlar: [string, SutunTuru][], satirlar: string[][] = []): VeriTablosu {
  return {
    sutunlar: sutunlar.map(([id, tur]): Sutun => ({ id, ad: id, tur })),
    satirlar: satirlar.map((hucreler, i) => ({ id: `r${i}`, hucreler })),
  };
}

const kimlikler = (t: VeriTablosu) => degiskenSutunlari(t).map((s) => s.id);

describe('kategorik yardımcılar', () => {
  it('kategoriler: verilen sıra önce, sonra alfabetik (sayılar sayısal)', () => {
    expect(kategoriler(['Tura', 'Yazı', 'Tura'], ['Yazı', 'Tura'])).toEqual(['Yazı', 'Tura']);
    expect(kategoriler(['Mavi', 'Çilek', 'Armut'])).toEqual(['Armut', 'Çilek', 'Mavi']);
    expect(kategoriler(['10', '9', '2'])).toEqual(['2', '9', '10']);
    expect(kategoriler(['B'], ['A', 'B'])).toEqual(['A', 'B']);
  });

  it('frekans ve göreli sıklık; boşlar sayılmaz', () => {
    const f = frekanslar(['Tura', 'Yazı', 'Tura', ' ', 'Tura'], ['Yazı', 'Tura']);
    expect(f).toEqual([
      { kategori: 'Yazı', sayi: 1, oran: 0.25 },
      { kategori: 'Tura', sayi: 3, oran: 0.75 },
    ]);
    expect(frekanslar([])).toEqual([]);
  });

  it('mod: en sık kategori(ler), veri yoksa boş', () => {
    expect(mod(['A', 'B', 'B'])).toEqual(['B']);
    // Birden çok tepe değer: verilen sırayla
    expect(mod(['A', 'B', 'B', 'A', 'C'], ['B', 'A', 'C'])).toEqual(['B', 'A']);
    expect(mod([])).toEqual([]);
  });

  it('tepe değer: bütün kategoriler eşit sayıdaysa yok (M05)', () => {
    expect(mod(['A', 'B'], ['B', 'A'])).toEqual([]);
    expect(mod(['Elma', 'Muz', 'Elma', 'Muz'])).toEqual([]);
    expect(mod(['Yazı', 'Tura', 'Yazı', 'Tura', 'Yazı', 'Tura'])).toEqual([]);
    // Tek kategori: tepe değer odur
    expect(mod(['A', 'A', 'A'])).toEqual(['A']);
    expect(mod(['A'])).toEqual(['A']);
    // Verilen sıradaki görülmemiş kategori (sıklık 0) eşitliği bozar: 3 · 3 · 0 → ilk ikisi
    expect(mod(['Elma', 'Muz', 'Elma', 'Muz', 'Elma', 'Muz'], ['Elma', 'Muz', 'Çilek'])).toEqual(['Elma', 'Muz']);
    expect(TEPE_DEGER_YOK).toBe('bütün değerler eşit sayıda: tepe değer yok');
  });

  it('yönelme eki: ünlü uyumu, kaynaştırma ve birim ayracı', () => {
    expect(yonelmeEkli('Sınıf')).toBe("Sınıf'a");
    expect(yonelmeEkli('Meyve')).toBe("Meyve'ye");
    expect(yonelmeEkli('Renk')).toBe("Renk'e");
    expect(yonelmeEkli('Sonuç')).toBe("Sonuç'a");
    expect(yonelmeEkli('Aday')).toBe("Aday'a");
    expect(yonelmeEkli('Cinsiyet')).toBe("Cinsiyet'e");
    expect(yonelmeEkli('Göz rengi')).toBe("Göz rengi'ne");
    expect(yonelmeEkli('Oy pusulası')).toBe("Oy pusulası'na");
    expect(yonelmeEkli('Boy (cm)')).toBe("Boy'a");
    expect(yonelmeEkli('2. küp')).toBe("2. küp'e");
    expect(yonelmeEkli('Deney 2')).toBe("Deney 2'ye");
    expect(yonelmeEkli('Grup 6')).toBe("Grup 6'ya");
    expect(yonelmeEkli('Yıl 1990')).toBe("Yıl 1990'a");
    expect(yonelmeEkli('Sınav 100')).toBe("Sınav 100'e");
    expect(yonelmeEkli('7-A')).toBe("7-A'ya");
  });

  it('kategorik sütunlar: etiket türü; ilk sütun yalnız tekrar eden değer varsa', () => {
    const t = tabloOlustur(['Çekiliş', 'Sonuç'], [['1', 'Yazı'], ['2', 'Tura']]);
    t.sutunlar[1].tur = 'etiket';
    expect(kategorikMi(t, 0)).toBe(false);
    expect(kategorikMi(t, 1)).toBe(true);
    expect(degiskenSutunlari(t).map((s) => s.ad)).toEqual(['Sonuç']);
    const u = tabloOlustur(['Renk', 'Adet'], [['Mavi', 1], ['Mavi', 2], ['Sarı', 3]]);
    expect(kategorikMi(u, 0)).toBe(true);
    expect(degiskenSutunlari(u).map((s) => s.ad)).toEqual(['Renk', 'Adet']);
    expect(sutunMetinleri(u, 0).map((m) => m.deger)).toEqual(['Mavi', 'Mavi', 'Sarı']);
  });

  it('kategori rengi: renk adları yakın ada tonu, diğerleri paletten kararlı', () => {
    expect(kategoriRengi('Kırmızı', 5)).toBe('#c75454');
    expect(kategoriRengi('mavi', 0)).toBe('#3f7fcb');
    expect(kategoriRengi('Yazı', 0)).toBe(kategoriRengi('Başka', 0));
    expect(kategoriRengi('Tura', 1)).not.toBe(kategoriRengi('Yazı', 0));
  });

  it('kutu yerleşimi en kalabalık kutuyu dikey alana sığdırır', () => {
    const az = kutuYerlesimi(3, 200, 300);
    expect(az.r).toBe(22);
    const cok = kutuYerlesimi(500, 120, 300);
    expect(Math.ceil(500 / cok.sutunSayisi) * cok.birim).toBeLessThanOrEqual(300);
    expect(cok.r).toBeGreaterThanOrEqual(1.5);
    expect(kutuYerlesimi(0, 100, 100).sutunSayisi).toBeGreaterThanOrEqual(1);
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

  it('komşu palet renkleri arasında ΔE ≥ 20; beşinci renk birinciden (deniz) uzak (M18)', () => {
    for (let i = 0; i < KATEGORI_PALETI.length; i++) {
      const a = KATEGORI_PALETI[i];
      const b = KATEGORI_PALETI[(i + 1) % KATEGORI_PALETI.length];
      expect(deltaE(a, b), `${a} ~ ${b}`).toBeGreaterThanOrEqual(20);
    }
    // Eski turkuaz (#2a9d94) denizle yalnız ΔE 20 ayrışıyordu
    expect(deltaE(KATEGORI_PALETI[4], KATEGORI_PALETI[0])).toBeGreaterThanOrEqual(35);
    // İlk dört renk ve adlı renkler değişmedi
    expect(KATEGORI_PALETI.slice(0, 4)).toEqual(['#2f8394', '#c8684a', '#7f88c4', '#a8782f']);
    expect(kategoriRengi('Kırmızı', 4)).toBe('#c75454');
    expect(kategoriRengi('Yazı', 4)).toBe(KATEGORI_PALETI[4]);
  });
});

// ── kategorik.ts: araştırma sütun rolleri ───────────────────────────────────

describe('kategorik: arastirmaSutunRolu', () => {
  it('sekiz rol, sözleşmedeki sırayla', () => {
    expect([...ARASTIRMA_ROLLERI]).toEqual(['cevap', 'grup', 'ad', 'deger', 's0', 's1', 'toplam', 'deney']);
  });

  it('`${arastirma.kimlik}-${rol}` kimliğinden rolü okur', () => {
    for (const rol of ARASTIRMA_ROLLERI) expect(arastirmaSutunRolu(`${AR}-${rol}`)).toBe(rol);
    // Panelin ürettiği biçim: kimlikUret('ar') → "ar12-ab3c"
    const kimlik = kimlikUret('ar');
    expect(arastirmaSutunRolu(`${kimlik}-cevap`)).toBe('cevap');
    expect(arastirmaSutunRolu(`${kimlik}-toplam`)).toBe('toplam');
    const rol: ArastirmaSutunRolu | null = arastirmaSutunRolu('ar1-z-s1');
    expect(rol).toBe('s1');
  });

  it('veri toplama sütunu olmayan kimliklerde null', () => {
    for (const id of [
      's12-abcd', // elle eklenen / örnek veri sütunu
      'vg-cekilis', // eski örnekleyici sıra sütunu
      'ay3-abcd-cevap', // aygıt kimliği
      `${AR}-bilinmeyen`,
      `${AR}-cevap-2`,
      'ar-x3k2-cevap', // sayısız önek
      'ar7-X3K2-cevap', // büyük harf
      'xar7-x3k2-cevap',
      'ar7-x3k2-',
      '',
    ]) {
      expect(arastirmaSutunRolu(id), id).toBeNull();
    }
  });
});

describe('kategorik: kategorikMi rol kuralı', () => {
  it('boş anket tablosunda cevap sütunu değişkendir (eksen boş tabloda da atanır)', () => {
    const anket = tablo([[`${AR}-cevap`, 'etiket']]);
    expect(kategorikMi(anket, 0)).toBe(true);
    expect(kimlikler(anket)).toEqual([`${AR}-cevap`]);
    // İlk iki cevap farklıyken de değişkendir
    const iki = tablo([[`${AR}-cevap`, 'etiket']], [['Elma'], ['Muz']]);
    expect(kategorikMi(iki, 0)).toBe(true);
    // Grup sütunuyla
    const gruplu = tablo([[`${AR}-cevap`, 'etiket'], [`${AR}-grup`, 'etiket']]);
    expect(kimlikler(gruplu)).toEqual([`${AR}-cevap`, `${AR}-grup`]);
  });

  it("rol 'ad' değişken sayılmaz (adlar yinelense de, hangi sütunda olursa olsun)", () => {
    const olcum = tablo(
      [
        [`${AR}-ad`, 'etiket'],
        [`${AR}-deger`, 'sayi'],
        [`${AR}-grup`, 'etiket'],
      ],
      [
        ['Ali', '72', '6-A'],
        ['Ali', '75', '6-A'],
        ['Ece', '80', '6-B'],
      ],
    );
    expect(kategorikMi(olcum, 0)).toBe(false);
    expect(kimlikler(olcum)).toEqual([`${AR}-deger`, `${AR}-grup`]);
    const sonda = tablo([[`${AR}-deger`, 'sayi'], [`${AR}-ad`, 'etiket']], [['1', 'Ali'], ['2', 'Ali']]);
    expect(kategorikMi(sonda, 1)).toBe(false);
    expect(kimlikler(sonda)).toEqual([`${AR}-deger`]);
  });

  it('deney tabloları: s0 / s1 / deney boşken de değişken; sayısal roller sayısal değişken', () => {
    const para = tablo([[`${AR}-s0`, 'etiket'], [`${AR}-deney`, 'etiket']]);
    expect(kimlikler(para)).toEqual([`${AR}-s0`, `${AR}-deney`]);
    const tekDeger = tablo([[`${AR}-s0`, 'etiket']], [['Tura']]);
    expect(kategorikMi(tekDeger, 0)).toBe(true);
    const ikiKup = tablo([
      [`${AR}-s0`, 'sayi'],
      [`${AR}-s1`, 'sayi'],
      [`${AR}-toplam`, 'sayi'],
      [`${AR}-deney`, 'etiket'],
    ]);
    expect(kimlikler(ikiKup)).toEqual([`${AR}-s0`, `${AR}-s1`, `${AR}-toplam`, `${AR}-deney`]);
    // Sayısal sütun kategorik değildir (rol ne olursa olsun)
    expect(kategorikMi(ikiKup, 0)).toBe(false);
    // Sayısal anket (kardeş sayısı): sayısal değişken olarak sayılır
    const kardes = tablo([[`${AR}-cevap`, 'sayi']]);
    expect(kategorikMi(kardes, 0)).toBe(false);
    expect(kimlikler(kardes)).toEqual([`${AR}-cevap`]);
  });

  it('rolsüz sütunlarda bugünkü kural aynen sürer', () => {
    const bos = tablo([['s1-abcd', 'etiket']]);
    expect(kategorikMi(bos, 0)).toBe(false);
    expect(kimlikler(bos)).toEqual([]);
    const farkli = tablo([['s1-abcd', 'etiket']], [['Ayşe'], ['Can']]);
    expect(kategorikMi(farkli, 0)).toBe(false);
    const yinelenen = tablo([['s1-abcd', 'etiket']], [['Elma'], ['Muz'], ['Elma']]);
    expect(kategorikMi(yinelenen, 0)).toBe(true);
    const tek = tablo([['s1-abcd', 'etiket']], [['Elma']]);
    expect(kategorikMi(tek, 0)).toBe(false);
    // İlk sütun dışındaki etiket sütunu hep kategorik
    const ikinci = tablo([['s1-abcd', 'etiket'], ['s2-abcd', 'etiket']]);
    expect(kategorikMi(ikinci, 1)).toBe(true);
    // Sayısal sütun kategorik değil; sütun yoksa false
    const sayi = tablo([['s1-abcd', 'sayi']], [['3']]);
    expect(kategorikMi(sayi, 0)).toBe(false);
    expect(kategorikMi(sayi, 5)).toBe(false);
  });

  it('sıra sütunları hiçbir zaman değişken değil; rol listesinde olmayan rol bugünkü kurala düşer', () => {
    for (const id of SIRA_SUTUNLARI) {
      const t = tablo([['s1-abcd', 'etiket'], [id, 'etiket']], [['A', '1'], ['A', '2']]);
      expect(kategorikMi(t, 1)).toBe(false);
    }
    // 'deger' / 'toplam' etikete çevrilmişse: ilk sütunda bugünkü kural, sonrakilerde kategorik
    const ilk = tablo([[`${AR}-deger`, 'etiket']], [['kısa'], ['uzun']]);
    expect(kategorikMi(ilk, 0)).toBe(false);
    const sonraki = tablo([['s1-abcd', 'etiket'], [`${AR}-toplam`, 'etiket']]);
    expect(kategorikMi(sonraki, 1)).toBe(true);
  });
});

describe('onarım D: kart zemininde kaybolan adlı renkler', () => {
  it('"Beyaz" ve "Siyah" kenar alır; paletin 12 rengi ve CSS değişkenleri almaz', () => {
    expect(kenarGerekir(kategoriRengi('Beyaz', 0))).toBe(true);
    expect(kenarGerekir(kategoriRengi('siyah', 3))).toBe(true);
    for (const renk of KATEGORI_PALETI) expect(kenarGerekir(renk), renk).toBe(false);
    for (const ad of ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Mor', 'Turuncu', 'Pembe', 'Gri', 'Kahverengi']) expect(kenarGerekir(kategoriRengi(ad, 0)), ad).toBe(false);
    expect(kenarGerekir('hsl(var(--primary))')).toBe(false);
  });
});
