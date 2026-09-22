import { describe, expect, it } from 'vitest';
import { agirlikliSec, mulberry32, rastgeleTohum, tamSayi } from '../rastgele';
import {
  EN_COK_CEKILIS,
  ON_AYARLAR,
  TEKRAR_SUTUNU,
  TOPLAM_KAYNAK,
  TOPLAM_SUTUNU,
  aygitDogrula,
  aygitKategorileri,
  aygitOlasiliklari,
  aygitSayisalMi,
  aygitSorunu,
  aygitTuruDegistir,
  aygitUyarisi,
  calismaBaslat,
  cark,
  carkAcilari,
  carkOranlari,
  cekilisBaslangici,
  cekilisler,
  degiskenAdlari,
  karistirici,
  olcuAdi,
  olcuHesapla,
  olcumAyariDuzelt,
  olcumlerEkle,
  olcumTablosuUyumlu,
  olcumTopla,
  ornekleyiciDogrula,
  silinecekOlcumSayisi,
  sayiAraligi,
  satirDegerleri,
  sonucEkle,
  sonucSutunlari,
  sonucTablosuUyumlu,
  tekCekilis,
  toplamKullanilabilir,
  topListesi,
  varsayilanOrnekleyici,
  type Aygit,
  type OrnekleyiciAyari,
} from '../ornekleyici';
import { frekanslar, kategoriRengi, kategoriler, kategorikMi, degiskenSutunlari, kutuYerlesimi, mod, sutunMetinleri } from '../kategorik';
import {
  baslangicDurumu,
  durumCoz,
  durumMetindenCoz,
  eksenDuzelt,
  etkinTablo,
  etkinTabloYaz,
  gorunenKumeler,
  kumeDegistir,
  RENKSIZ,
  ornekleyiciDegistir,
  sacilimEksenleri,
  sekmeKullanilabilir,
  varsayilanEksen,
  type Durum,
} from '../durum';
import { ORNEK_VERILER, ornekVeriOlustur, sutunEkle, sutunSil, tabloOlustur } from '../veri';

function ayarla(aygitlar: Aygit[], ek: Partial<OrnekleyiciAyari> = {}): OrnekleyiciAyari {
  return { aygitlar, toplamSutunu: false, cekilisSayisi: 10, hiz: 3, olcum: { kaynak: aygitlar[0].id, olcu: 'sayisi', hedef: '' }, ...ek };
}

function goreliSiklik(degerler: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of degerler) m.set(d, (m.get(d) ?? 0) + 1);
  for (const [k, v] of m) m.set(k, v / degerler.length);
  return m;
}

describe('rastgele: tohumlu üreteç', () => {
  it('aynı tohum aynı diziyi verir, farklı tohum farklı', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const da = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(da);
    expect([c(), c(), c()]).not.toEqual(da);
  });

  it('değerler [0, 1) aralığında ve ortalaması ≈ 0,5', () => {
    const r = mulberry32(7);
    let t = 0;
    for (let i = 0; i < 10000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      t += v;
    }
    expect(Math.abs(t / 10000 - 0.5)).toBeLessThan(0.02);
  });

  it('tamSayi sınırları dahil eder, dışına çıkmaz', () => {
    const r = mulberry32(1);
    const gorulen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = tamSayi(r, 1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      gorulen.add(v);
    }
    expect(gorulen.size).toBe(6);
    expect(tamSayi(r, 5, 5)).toBe(5);
  });

  it('agirlikliSec ağırlığa orantılı; sıfır / geçersiz ağırlık seçilmez; toplam 0 → -1', () => {
    const r = mulberry32(9);
    const sayac = [0, 0, 0];
    for (let i = 0; i < 10000; i++) sayac[agirlikliSec(r, [1, 0, 3])]++;
    expect(sayac[1]).toBe(0);
    expect(Math.abs(sayac[2] / 10000 - 0.75)).toBeLessThan(0.02);
    expect(agirlikliSec(r, [0, -1, Number.NaN])).toBe(-1);
  });

  it('rastgeleTohum 32 bit tam sayı döner', () => {
    const t = rastgeleTohum();
    expect(Number.isInteger(t)).toBe(true);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThan(2 ** 32);
  });
});

describe('örnekleyici: aygıt modelleri', () => {
  it('karıştırıcı top listesi adetlere göre açılır, adet 0 topsuzdur', () => {
    const k = karistirici('Renk', [['Kırmızı', 3], ['Mavi', 2], ['Yeşil', 0]]);
    expect(topListesi(k)).toEqual([0, 0, 0, 1, 1]);
    expect(aygitKategorileri(k)).toEqual(['Kırmızı', 'Mavi', 'Yeşil']);
    expect(aygitOlasiliklari(k).map((o) => o.olasilik)).toEqual([0.6, 0.4, 0]);
  });

  it('çark yüzdeleri normalize edilir ve uyarı verir', () => {
    const c = cark('Cevap', [['Evet', 30], ['Hayır', 60]]);
    const o = carkOranlari(c);
    expect(o.oranlar[0]).toBeCloseTo(1 / 3, 10);
    expect(o.oranlar[1]).toBeCloseTo(2 / 3, 10);
    expect(o.duzeltildi).toBe(true);
    expect(aygitUyarisi(c, 10)).toContain('%90');
    const aci = carkAcilari(c);
    expect(aci[0]).toEqual({ baslangic: 0, bitis: 120 });
    expect(aci[1].bitis).toBeCloseTo(360, 9);
    expect(aygitUyarisi(cark('X', [['A', 50], ['B', 50]]), 10)).toBeNull();
  });

  it('sayı aralığı kategorileri, sayısallık ve eşit olasılık', () => {
    const z = sayiAraligi('Zar', 1, 6);
    expect(aygitKategorileri(z)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(aygitSayisalMi(z)).toBe(true);
    expect(aygitOlasiliklari(z).every((o) => Math.abs(o.olasilik - 1 / 6) < 1e-12)).toBe(true);
    expect(aygitSayisalMi(karistirici('S', [['Yazı', 1], ['Tura', 1]]))).toBe(false);
    expect(aygitSayisalMi(karistirici('S', [['1', 1], ['2,5', 1]]))).toBe(true);
  });

  it('aygıt sorunları: boş kutu, sıfır toplam, çok geniş aralık', () => {
    expect(aygitSorunu(karistirici('A', [['A', 0]]))).toContain('top yok');
    expect(aygitSorunu(cark('A', [['A', 0], ['B', 0]]))).toContain('0');
    expect(aygitSorunu(sayiAraligi('A', 1, 5000))).toContain('en çok');
    expect(aygitSorunu(sayiAraligi('A', 6, 1))).toBeNull();
    expect(aygitSorunu(karistirici('A', [['', 2]]))).toContain('boş');
  });

  it('iadesizde çekiliş sayısı top sayısını aşarsa açıklayıcı uyarı', () => {
    const k = karistirici('Renk', [['Kırmızı', 3], ['Mavi', 2]], false);
    expect(aygitUyarisi(k, 5)).toBeNull();
    const u = aygitUyarisi(k, 8);
    expect(u).toContain('5 top');
    expect(u).toContain('durur');
  });

  it('tür değiştirme kimliği ve adı korur, içeriği taşır', () => {
    const k = karistirici('Renk', [['Kırmızı', 3], ['Mavi', 1]]);
    const c = aygitTuruDegistir(k, 'cark');
    expect(c.id).toBe(k.id);
    expect(c.degisken).toBe('Renk');
    expect(c.tur === 'cark' && c.dilimler.map((d) => d.yuzde)).toEqual([75, 25]);
    const a = aygitTuruDegistir(karistirici('Zar', [['2', 1], ['5', 1]]), 'aralik');
    expect(a.tur === 'aralik' && [a.min, a.max]).toEqual([2, 5]);
  });

  it('değişken adları benzersiz ve boş ad doldurulur', () => {
    const ayar = ayarla([sayiAraligi('Zar', 1, 6), sayiAraligi('Zar', 1, 6), sayiAraligi(' ', 1, 6)]);
    expect(degiskenAdlari(ayar)).toEqual(['Zar', 'Zar 2', 'Sonuç 3']);
  });
});

describe('örnekleyici: çekilişler (10000 tohumlu çekilişte göreli sıklık ≈ kuramsal)', () => {
  it('karıştırıcı (3 kırmızı, 2 mavi, iadeli)', () => {
    const ayar = ayarla([karistirici('Renk', [['Kırmızı', 3], ['Mavi', 2]])]);
    const { cekilisler: c } = cekilisler(ayar, 10000, mulberry32(123));
    const f = goreliSiklik(c.map((x) => x.degerler[0]));
    expect(Math.abs((f.get('Kırmızı') ?? 0) - 0.6)).toBeLessThanOrEqual(0.02);
    expect(Math.abs((f.get('Mavi') ?? 0) - 0.4)).toBeLessThanOrEqual(0.02);
  });

  it('çark (normalize edilmiş 30 / 60 → 1/3, 2/3)', () => {
    const ayar = ayarla([cark('Cevap', [['Evet', 30], ['Hayır', 60]])]);
    const { cekilisler: c } = cekilisler(ayar, 10000, mulberry32(321));
    const f = goreliSiklik(c.map((x) => x.degerler[0]));
    expect(Math.abs((f.get('Evet') ?? 0) - 1 / 3)).toBeLessThanOrEqual(0.02);
    expect(Math.abs((f.get('Hayır') ?? 0) - 2 / 3)).toBeLessThanOrEqual(0.02);
    expect(c.every((x) => x.konumlar[0] > 0 && x.konumlar[0] < 1)).toBe(true);
  });

  it('sayı aralığı (zar 1..6)', () => {
    const ayar = ayarla([sayiAraligi('Zar', 1, 6)]);
    const { cekilisler: c } = cekilisler(ayar, 10000, mulberry32(5));
    const f = goreliSiklik(c.map((x) => x.degerler[0]));
    for (let v = 1; v <= 6; v++) expect(Math.abs((f.get(String(v)) ?? 0) - 1 / 6)).toBeLessThanOrEqual(0.02);
    expect(c.every((x) => x.secimler[0] === Number(x.degerler[0]) - 1)).toBe(true);
  });

  it('madeni para ön ayarı: Yazı / Tura ≈ 0,5', () => {
    const ayar = ON_AYARLAR.find((o) => o.id === 'para')!.olustur();
    const { cekilisler: c } = cekilisler(ayar, 10000, mulberry32(77));
    const f = goreliSiklik(c.map((x) => x.degerler[0]));
    expect(Math.abs((f.get('Tura') ?? 0) - 0.5)).toBeLessThanOrEqual(0.02);
  });

  it('iki zar toplamı: 7 → 6/36 ± 0,015, toplam 2..12', () => {
    const ayar = ON_AYARLAR.find((o) => o.id === 'iki-zar')!.olustur();
    const { cekilisler: c } = cekilisler(ayar, 10000, mulberry32(2024));
    const toplamlar = c.map((x) => x.toplam!);
    expect(Math.min(...toplamlar)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...toplamlar)).toBeLessThanOrEqual(12);
    const yedi = toplamlar.filter((t) => t === 7).length / toplamlar.length;
    expect(Math.abs(yedi - 6 / 36)).toBeLessThanOrEqual(0.015);
    const iki = toplamlar.filter((t) => t === 2).length / toplamlar.length;
    expect(Math.abs(iki - 1 / 36)).toBeLessThanOrEqual(0.01);
    expect(c.every((x) => x.toplam === Number(x.degerler[0]) + Number(x.degerler[1]))).toBe(true);
  });

  it('iadesiz: her top tam bir kez çıkar, kutu boşalınca durur', () => {
    const k = karistirici('Renk', [['Kırmızı', 3], ['Mavi', 2]], false);
    const ayar = ayarla([k]);
    for (let tohum = 1; tohum <= 20; tohum++) {
      const { cekilisler: c, durdu } = cekilisler(ayar, 8, mulberry32(tohum));
      expect(durdu).toBe(true);
      expect(c.length).toBe(5);
      expect([...c.map((x) => x.secimler[0])].sort()).toEqual([0, 1, 2, 3, 4]);
      expect(c.filter((x) => x.degerler[0] === 'Kırmızı').length).toBe(3);
    }
  });

  it('tekCekilis boş iadesiz kutuda null döner ve durum yeni çalıştırmada dolar', () => {
    const ayar = ayarla([karistirici('R', [['A', 1]], false)]);
    const d = calismaBaslat(ayar.aygitlar);
    const r = mulberry32(1);
    expect(tekCekilis(ayar, d, r)?.degerler).toEqual(['A']);
    expect(tekCekilis(ayar, d, r)).toBeNull();
    expect(tekCekilis(ayar, calismaBaslat(ayar.aygitlar), r)).not.toBeNull();
  });

  it('aynı tohum aynı sonuçları üretir', () => {
    const ayar = ON_AYARLAR.find((o) => o.id === 'dogum-ayi')!.olustur();
    const a = cekilisler(ayar, 50, mulberry32(8)).cekilisler.map((c) => c.degerler[0]);
    const b = cekilisler(ayar, 50, mulberry32(8)).cekilisler.map((c) => c.degerler[0]);
    expect(a).toEqual(b);
  });

  it('satır değerleri toplam sütununu yalnız tüm aygıtlar sayısalsa ekler', () => {
    const sayisal = ayarla([sayiAraligi('Zar 1', 1, 6), sayiAraligi('Zar 2', 1, 6)], { toplamSutunu: true });
    const c = cekilisler(sayisal, 1, mulberry32(3)).cekilisler[0];
    expect(satirDegerleri(sayisal, c)).toHaveLength(3);
    const karisik = ayarla([sayiAraligi('Zar', 1, 6), karistirici('Renk', [['A', 1]])], { toplamSutunu: true });
    const c2 = cekilisler(karisik, 1, mulberry32(3)).cekilisler[0];
    expect(c2.toplam).toBeNull();
    expect(satirDegerleri(karisik, c2)).toHaveLength(2);
  });
});

describe('örnekleyici: sonuç tablosu', () => {
  it('sütunlar: Çekiliş + aygıt değişkenleri (+ Toplam), türleri aygıta göre', () => {
    const ayar = ON_AYARLAR.find((o) => o.id === 'iki-zar')!.olustur();
    const s = sonucSutunlari(ayar);
    expect(s.map((x) => x.ad)).toEqual(['Çekiliş', 'Zar 1', 'Zar 2', 'Toplam']);
    expect(s.map((x) => x.tur)).toEqual(['etiket', 'sayi', 'sayi', 'sayi']);
    const para = ON_AYARLAR[0].olustur();
    expect(sonucSutunlari(para).map((x) => x.tur)).toEqual(['etiket', 'etiket']);
  });

  it('uyumlu tabloya eklenir (numara sürer), aygıt değişince yeni tablo kurulur', () => {
    const ayar = ON_AYARLAR[0].olustur();
    const t1 = sonucEkle(null, ayar, [['Yazı'], ['Tura']]);
    expect(t1.satirlar.map((r) => r.hucreler)).toEqual([['1', 'Yazı'], ['2', 'Tura']]);
    expect(sonucTablosuUyumlu(t1, ayar)).toBe(true);
    expect(cekilisBaslangici(t1, ayar)).toBe(2);
    const t2 = sonucEkle(t1, ayar, [['Tura']]);
    expect(t2.satirlar.map((r) => r.hucreler[0])).toEqual(['1', '2', '3']);
    const zar = ON_AYARLAR[1].olustur();
    expect(sonucTablosuUyumlu(t2, zar)).toBe(false);
    expect(cekilisBaslangici(t2, zar)).toBe(0);
    const t3 = sonucEkle(t2, zar, [['4']]);
    expect(t3.satirlar).toHaveLength(1);
    expect(t3.sutunlar[1].ad).toBe('Zar');
  });
});

describe('örnekleyici: ölçüler ve ölçüm toplama', () => {
  const d = ['Tura', 'Yazı', 'Tura', 'Tura', ''];
  it('kategorik sayısı ve oranı elle hesaplananla aynı', () => {
    expect(olcuHesapla('sayisi', d, 'Tura')).toBe(3);
    expect(olcuHesapla('orani', d, 'Tura')).toBe(75);
    expect(olcuHesapla('sayisi', [], 'Tura')).toBe(0);
    expect(olcuHesapla('orani', [], 'Tura')).toBeNull();
  });

  it('sayısal ölçüler: ortalama, toplam, medyan, en büyük, en küçük, açıklık', () => {
    const z = ['3', '5', '1', '6', '5'];
    expect(olcuHesapla('ortalama', z)).toBe(4);
    expect(olcuHesapla('toplam', z)).toBe(20);
    expect(olcuHesapla('medyan', z)).toBe(5);
    expect(olcuHesapla('enBuyuk', z)).toBe(6);
    expect(olcuHesapla('enKucuk', z)).toBe(1);
    expect(olcuHesapla('aciklik', z)).toBe(5);
    expect(olcuHesapla('ortalama', ['2,5', '3,5'])).toBe(3);
    expect(olcuHesapla('sayisi', ['7', '7,0', '8'], '7')).toBe(2);
    expect(olcuHesapla('ortalama', ['a'])).toBeNull();
  });

  it('ölçüm ayarı düzeltilir: kategorikte sayısal ölçü → sayısı, hedef kategorilerden', () => {
    const para = ON_AYARLAR[0].olustur();
    const o = olcumAyariDuzelt(para, { kaynak: 'yok', olcu: 'ortalama', hedef: 'Mavi' });
    expect(o.kaynak).toBe(para.aygitlar[0].id);
    expect(o.olcu).toBe('sayisi');
    expect(['Yazı', 'Tura']).toContain(o.hedef);
    expect(olcuAdi(para)).toBe('Tura sayısı (10 çekiliş)');
    const ikiZar = ON_AYARLAR.find((x) => x.id === 'iki-zar')!.olustur();
    expect(olcuAdi(ikiZar, { kaynak: TOPLAM_KAYNAK, olcu: 'ortalama', hedef: '' })).toBe('Ortalama (Toplam, 100 çekiliş)');
  });

  it('10 atışta Tura sayısı × 2000: ortalama ≈ 5, 0..10 içinde, 5 en sık', () => {
    const para = { ...ON_AYARLAR[0].olustur(), cekilisSayisi: 10 };
    const o = olcumTopla(para, 2000, mulberry32(99)) as number[];
    expect(o.every((x) => Number.isInteger(x) && x >= 0 && x <= 10)).toBe(true);
    const ort = o.reduce((a, b) => a + b, 0) / o.length;
    expect(Math.abs(ort - 5)).toBeLessThan(0.15);
    const bes = o.filter((x) => x === 5).length / o.length;
    expect(Math.abs(bes - 252 / 1024)).toBeLessThan(0.03);
  });

  it('ölçümler tabloda birikir; farklı ölçü yeni sütun açar', () => {
    const para = ON_AYARLAR[0].olustur();
    const a = olcumlerEkle(null, para, 'Tura sayısı', [4, 6]);
    expect(a.tablo.sutunlar.map((s) => s.ad)).toEqual(['Tekrar', 'Tura sayısı']);
    const b = olcumlerEkle(a.tablo, para, 'Tura sayısı', [5]);
    expect(b.sutunId).toBe(a.sutunId);
    expect(b.tablo.satirlar.map((r) => r.hucreler)).toEqual([['1', '4'], ['2', '6'], ['3', '5']]);
    const c = olcumlerEkle(b.tablo, para, 'Tura oranı (%)', [50, null]);
    expect(c.tablo.sutunlar).toHaveLength(3);
    expect(c.sutunId).not.toBe(a.sutunId);
    expect(c.tablo.satirlar[3].hucreler).toEqual(['4', '', '50']);
    expect(c.tablo.satirlar[0].hucreler).toEqual(['1', '4', '']);
    expect(c.tablo.satirlar[4].hucreler).toEqual(['5', '', '']);
  });

  it('ölçümler örnekleyicinin aygıtlarına bağlıdır: ön ayar değişince eski sütunlar yeni tabloya taşınmaz', () => {
    const para = ON_AYARLAR[0].olustur();
    const anket = ON_AYARLAR.find((x) => x.id === 'anket')!.olustur();
    const a = olcumlerEkle(null, anket, olcuAdi(anket), [60, 55]);
    expect(olcumTablosuUyumlu(a.tablo, anket)).toBe(true);
    expect(silinecekOlcumSayisi(a.tablo, anket)).toBe(0);
    // Aynı aygıtlarda etiket / çekiliş sayısı değişse de ölçümler korunur (kimlikler aynı)
    const anket2 = { ...anket, cekilisSayisi: 50, aygitlar: [{ ...anket.aygitlar[0], degisken: 'Yanıt' }] };
    expect(olcumTablosuUyumlu(a.tablo, anket2)).toBe(true);
    // Başka ön ayar: uyumsuz, bir sonraki toplamada satırlar silinir ve yeni tablo kurulur
    expect(olcumTablosuUyumlu(a.tablo, para)).toBe(false);
    expect(silinecekOlcumSayisi(a.tablo, para)).toBe(2);
    const b = olcumlerEkle(a.tablo, para, olcuAdi(para), [5]);
    expect(b.tablo.sutunlar.map((s) => s.ad)).toEqual(['Tekrar', 'Tura sayısı (10 çekiliş)']);
    expect(b.tablo.satirlar.map((r) => r.hucreler)).toEqual([['1', '5']]);
    // Eski kayıt (imzasız "vg-olcu-N" sütunları) da uyumsuz sayılır
    const eski = { sutunlar: [{ id: TEKRAR_SUTUNU, ad: 'Tekrar', tur: 'etiket' as const }, { id: 'vg-olcu-1', ad: 'Evet oranı (%)', tur: 'sayi' as const }], satirlar: [{ id: 'r1', hucreler: ['1', '60'] }] };
    expect(olcumTablosuUyumlu(eski, anket)).toBe(false);
    expect(silinecekOlcumSayisi(eski, anket)).toBe(1);
    // Elle eklenen sütun uyumu bozmaz; boşaltılmış tabloya toplayınca eski ölçü sütunları da gider
    const notlu = { ...a.tablo, sutunlar: [...a.tablo.sutunlar, { id: 'c9', ad: 'Not', tur: 'etiket' as const }] };
    expect(olcumTablosuUyumlu(notlu, anket)).toBe(true);
    const bos = { ...a.tablo, satirlar: [] };
    const c = olcumlerEkle(bos, anket, 'Evet sayısı (20 çekiliş)', [12]);
    expect(c.tablo.sutunlar.map((s) => s.ad)).toEqual(['Tekrar', 'Evet sayısı (20 çekiliş)']);
  });

  it('iadesiz torbada ölçü kısmi çalıştırmada hesaplanır (3 çekilişte kırmızı sayısı 1..3)', () => {
    const torba = ON_AYARLAR.find((x) => x.id === 'torba')!.olustur();
    const o = olcumTopla(torba, 500, mulberry32(4)) as number[];
    expect(o.every((x) => x >= 1 && x <= 3)).toBe(true);
  });
});

describe('örnekleyici: kalıcılık doğrulaması', () => {
  it('bozuk girdi → varsayılan (madeni para), atmaz', () => {
    for (const ham of [null, 5, 'x', [], { aygitlar: 'bozuk' }, { aygitlar: [null, 3, { tur: 'uzayli' }] }]) {
      const a = ornekleyiciDogrula(ham);
      expect(a.aygitlar).toHaveLength(1);
      expect(aygitKategorileri(a.aygitlar[0])).toEqual(['Yazı', 'Tura']);
    }
  });

  it('geçersiz yüzde / adet 0 olur, sayısal metin okunur; çekiliş sayısı ve hız sınırlanır', () => {
    const a = ornekleyiciDogrula({
      aygitlar: [
        { id: 'c1', tur: 'cark', degisken: 'Cevap', dilimler: [{ etiket: 'A', yuzde: 'abc' }, { etiket: 'B', yuzde: -5 }, { etiket: 'C', yuzde: '30' }] },
        { id: 'k1', tur: 'karistirici', degisken: 'Renk', ogeler: [{ etiket: 'X', adet: Number.NaN }, { etiket: 'Y', adet: 2.7 }], iadeli: false },
      ],
      cekilisSayisi: 9999,
      hiz: 7,
    });
    const c = a.aygitlar[0];
    expect(c.tur === 'cark' && c.dilimler.map((x) => x.yuzde)).toEqual([0, 0, 30]);
    const k = a.aygitlar[1];
    expect(k.tur === 'karistirici' && k.ogeler.map((x) => x.adet)).toEqual([0, 2]);
    expect(k.tur === 'karistirici' && k.iadeli).toBe(false);
    expect(a.cekilisSayisi).toBe(EN_COK_CEKILIS);
    expect(a.hiz).toBe(1);
  });

  it('aygıt doğrulama: eksik alan → null; en çok 3 aygıt; yinelenen kimlik yenilenir', () => {
    expect(aygitDogrula({ tur: 'aralik', min: 1 })).toBeNull();
    expect(aygitDogrula({ tur: 'karistirici', ogeler: [] })).toBeNull();
    const z = { id: 'z', tur: 'aralik', degisken: 'Zar', min: 1, max: 6 };
    const a = ornekleyiciDogrula({ aygitlar: [z, z, z, z] });
    expect(a.aygitlar).toHaveLength(3);
    expect(new Set(a.aygitlar.map((x) => x.id)).size).toBe(3);
  });

  it('eski şema: örnekleyicisiz kayıt açılır, Tablom ve görünüm korunur', () => {
    const tablo = tabloOlustur(['Öğrenci', 'Boy'], [['Ali', 150]]);
    const d = durumCoz({ surum: 1, tablo, sekme: 'sutun', degisken: tablo.sutunlar[1].id, aralik: 2, secenekler: { ortalama: true } });
    expect(d).not.toBeNull();
    expect(d!.etkinKume).toBe('tablom');
    expect(d!.tablo.satirlar[0].hucreler).toEqual(['Ali', '150']);
    expect(d!.degisken).toBe(tablo.sutunlar[1].id);
    expect(d!.secenekler).toEqual({ ortalama: true, oms: false, etiketler: false });
    expect(d!.deneyTablosu).toBeNull();
    expect(d!.ornekleyici.aygitlar).toHaveLength(1);
  });

  it('bozuk kayıt → null; etkin küme kayıtta yoksa Tablom', () => {
    expect(durumMetindenCoz('{bozuk')).toBeNull();
    expect(durumMetindenCoz(null)).toBeNull();
    expect(durumCoz({ tablo: 'x' })).toBeNull();
    const d = durumCoz({ tablo: tabloOlustur(['A', 'B'], []), etkinKume: 'deney', deneyTablosu: 5, ornekleyici: 'bozuk' });
    expect(d!.etkinKume).toBe('tablom');
    expect(d!.ornekleyici.aygitlar).toHaveLength(1);
  });

  it('JSON gidiş-dönüşü: kümeler, görünümler ve örnekleyici korunur', () => {
    let d = baslangicDurumu();
    const ayar = ON_AYARLAR.find((x) => x.id === 'iki-zar')!.olustur();
    d = { ...d, ornekleyici: ayar, deneyTablosu: sonucEkle(null, ayar, [['1', '2', '3']]) };
    d = kumeDegistir(d, 'deney', { degisken: 'vg-toplam' });
    const geri = durumMetindenCoz(JSON.stringify(d))!;
    expect(geri.etkinKume).toBe('deney');
    expect(geri.degisken).toBe('vg-toplam');
    expect(etkinTablo(geri).sutunlar.map((s) => s.ad)).toEqual(['Çekiliş', 'Zar 1', 'Zar 2', 'Toplam']);
    expect(geri.ornekleyici.toplamSutunu).toBe(true);
    expect(geri.ornekleyici.aygitlar.map((a) => a.id)).toEqual(ayar.aygitlar.map((a) => a.id));
  });

  it('küme değiştirme görünümleri saklar ve geri getirir; tablo yazımı etkin kümeye gider', () => {
    let d: Durum = { ...baslangicDurumu(), degisken: 'boy' };
    d = kumeDegistir(d, 'olcum');
    expect(d.degisken).toBeNull();
    d = { ...d, degisken: 'olcu' };
    d = kumeDegistir(d, 'tablom');
    expect(d.degisken).toBe('boy');
    expect(kumeDegistir(d, 'olcum').degisken).toBe('olcu');
    const t = tabloOlustur(['Tekrar', 'X'], [['1', 2]]);
    const e = etkinTabloYaz(kumeDegistir(d, 'olcum'), t);
    expect(e.olcumTablosu).toBe(t);
    expect(e.tablo).toBe(d.tablo);
    expect(etkinTablo(kumeDegistir(baslangicDurumu(), 'deney')).satirlar).toEqual([]);
  });

  it('varsayılan örnekleyici geçerli ve 20 çekilişlik', () => {
    const v = varsayilanOrnekleyici();
    expect(v.cekilisSayisi).toBe(20);
    expect(v.olcum.hedef).toBe('Tura');
    expect(ON_AYARLAR.map((o) => o.id)).toEqual(['para', 'zar', 'iki-zar', 'torba', 'dogum-ayi', 'anket']);
    for (const o of ON_AYARLAR) expect(o.olustur().aygitlar.every((a) => aygitSorunu(a) === null)).toBe(true);
  });
});

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
    expect(mod(['A', 'B'], ['B', 'A'])).toEqual(['B', 'A']);
    expect(mod([])).toEqual([]);
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

describe('durum: örnekleyici açık / kapalı ve görünen kümeler', () => {
  it('kapalıyken yalnız Tablom; açılınca deney tablosu hazır ve etkin, ölçüm toplanınca Ölçümler de görünür', () => {
    const d = baslangicDurumu();
    expect(gorunenKumeler(d)).toEqual(['tablom']);
    const acik = ornekleyiciDegistir(d, true);
    expect(acik.ornekleyiciAcik).toBe(true);
    expect(acik.etkinKume).toBe('deney');
    expect(acik.deneyTablosu?.satirlar).toEqual([]);
    expect(acik.deneyTablosu?.sutunlar.map((s) => s.ad)).toEqual(['Çekiliş', 'Sonuç']);
    expect(gorunenKumeler(acik)).toEqual(['deney']);
    const olcumlu: Durum = { ...acik, olcumTablosu: { sutunlar: [{ id: 'vg-tekrar', ad: 'Tekrar', tur: 'etiket' }], satirlar: [] } };
    expect(gorunenKumeler(olcumlu)).toEqual(['deney', 'olcum']);
    // Kapanınca kendi tablonuza dönülür; deney verisi silinmez, eksen ataması saklanır
    const deneyGorunumu = { ...olcumlu, degisken: 'vg-x', etkinKume: 'deney' as const };
    const kapali = ornekleyiciDegistir(deneyGorunumu, false);
    expect(kapali.ornekleyiciAcik).toBe(false);
    expect(kapali.etkinKume).toBe('tablom');
    expect(kapali.deneyTablosu).toBe(olcumlu.deneyTablosu);
    expect(kapali.gorunumler.deney?.degisken).toBe('vg-x');
    expect(gorunenKumeler(kapali)).toEqual(['tablom']);
    // Yeniden açılınca deney görünümü geri gelir
    expect(ornekleyiciDegistir(kapali, true).degisken).toBe('vg-x');
  });
});

describe('durum: eksen hep seçili (varsayılan değişken)', () => {
  it('varsayılan: tabloda ilk sayısal, yoksa ilk kategorik; deneyde Toplam, yoksa ilk aygıt; ölçümde en son ölçü', () => {
    const sicaklik = ornekVeriOlustur('sicaklik');
    expect(varsayilanEksen(sicaklik, 'tablom')).toBe(sicaklik.sutunlar[1].id);
    const mac = ornekVeriOlustur('mac');
    expect(varsayilanEksen(mac, 'tablom')).toBe(mac.sutunlar[1].id);
    // Yalnız kategorik değişken: tekrar eden ilk sütun kategoriktir
    const renk = { ...tabloOlustur(['Renk'], [['Mavi'], ['Kırmızı'], ['Mavi']]) };
    expect(varsayilanEksen(renk, 'tablom')).toBe(renk.sutunlar[0].id);
    expect(varsayilanEksen(tabloOlustur(['Ad'], [['A'], ['B']]), 'tablom')).toBeNull();
    const ikiZar = ON_AYARLAR.find((o) => o.id === 'iki-zar')!.olustur();
    expect(varsayilanEksen({ sutunlar: sonucSutunlari(ikiZar), satirlar: [] }, 'deney')).toBe(TOPLAM_SUTUNU);
    const para = ON_AYARLAR[0].olustur();
    const paraSutunlari = sonucSutunlari(para);
    expect(varsayilanEksen({ sutunlar: paraSutunlari, satirlar: [] }, 'deney')).toBe(paraSutunlari[1].id);
    const a = olcumlerEkle(null, para, 'Tura sayısı (10 çekiliş)', [5]);
    const b = olcumlerEkle(a.tablo, para, 'Tura oranı (%) (10 çekiliş)', [50]);
    expect(varsayilanEksen(b.tablo, 'olcum')).toBe(b.sutunId);
  });

  it('eksenDuzelt: boş ya da silinmiş eksen varsayılana döner, geçerli eksen korunur', () => {
    const d = baslangicDurumu();
    expect(d.degisken).toBeNull();
    const e = eksenDuzelt(d);
    expect(e.degisken).toBe(d.tablo.sutunlar[1].id);
    expect(eksenDuzelt(e)).toBe(e);
    // Eksen ikinci sayısal sütundayken o sütun silinirse ilk sayısala döner; aralık ve sütun modu sıfırlanır,
    // eksenle aynı kalan karşılaştırma kalkar
    const t2 = sutunEkle(e.tablo, 'Kilo');
    const f: Durum = { ...e, tablo: t2, degisken: t2.sutunlar[2].id, ikinciDegisken: t2.sutunlar[1].id, aralik: 5, sutunModu: true };
    expect(eksenDuzelt(f)).toBe(f);
    const g = eksenDuzelt({ ...f, tablo: sutunSil(t2, 2) });
    expect(g.degisken).toBe(t2.sutunlar[1].id);
    expect(g.aralik).toBeNull();
    expect(g.sutunModu).toBe(false);
    expect(g.ikinciDegisken).toBeNull();
    // Değişkeni olmayan tabloda eksen boş kalır
    expect(eksenDuzelt({ ...e, tablo: tabloOlustur(['Ad'], [['A']]) }).degisken).toBeNull();
    // Örnekleyici açılınca deney kümesinin ekseni ilk aygıt değişkenine yerleşir (henüz çekiliş yokken de)
    const acik = eksenDuzelt(ornekleyiciDegistir(e, true));
    expect(acik.degisken).toBe(acik.deneyTablosu!.sutunlar[1].id);
  });
});

describe('örnekleyici: toplam sütunu', () => {
  it('yalnız en az iki sayısal aygıtta sunulur', () => {
    const tekZar = ayarla([sayiAraligi('Zar', 1, 6)], { toplamSutunu: true });
    expect(toplamKullanilabilir(tekZar)).toBe(false);
    expect(sonucSutunlari(tekZar).map((s) => s.ad)).toEqual(['Çekiliş', 'Zar']);
    const ikiZar = ayarla([sayiAraligi('Zar 1', 1, 6), sayiAraligi('Zar 2', 1, 6)], { toplamSutunu: true });
    expect(toplamKullanilabilir(ikiZar)).toBe(true);
    expect(sonucSutunlari(ikiZar).map((s) => s.ad)).toEqual(['Çekiliş', 'Zar 1', 'Zar 2', 'Toplam']);
  });
});

describe('durum: saçılım grafiği ve veri türüne göre sekmeler', () => {
  it('çizgi en az bir, saçılım en az iki sayısal değişken ister', () => {
    expect(sekmeKullanilabilir('nokta', 0)).toBe(true);
    expect(sekmeKullanilabilir('cizgi', 0)).toBe(false);
    expect(sekmeKullanilabilir('cizgi', 1)).toBe(true);
    expect(sekmeKullanilabilir('sacilim', 1)).toBe(false);
    expect(sekmeKullanilabilir('sacilim', 2)).toBe(true);
  });

  it('saçılım eksenleri: x seçili değişken (kategorikse ilk sayısal), y ayrı seçim ya da sıradaki sayısal', () => {
    const mac = ornekVeriOlustur('mac');
    const [, selma, yasemin] = mac.sutunlar.map((s) => s.id);
    expect(sacilimEksenleri({ degisken: selma, yDegisken: null }, mac)).toEqual({ x: selma, y: yasemin, renk: null });
    expect(sacilimEksenleri({ degisken: yasemin, yDegisken: null }, mac)).toEqual({ x: yasemin, y: selma, renk: null });
    // y, x ile aynıysa sıradaki sayısal değişkene düşer
    expect(sacilimEksenleri({ degisken: selma, yDegisken: selma }, mac)).toEqual({ x: selma, y: yasemin, renk: null });
    // Tek sayısal değişkende saçılım yok
    expect(sacilimEksenleri({ degisken: null, yDegisken: null }, ornekVeriOlustur('boy'))).toBeNull();
    // Kaydedilmiş sekme ve dikey eksen okunur; geçersiz dikey eksen eksenDuzelt ile kalkar
    const d = durumCoz({ surum: 1, tablo: mac, sekme: 'sacilim', degisken: selma, yDegisken: yasemin })!;
    expect(d.sekme).toBe('sacilim');
    expect(d.yDegisken).toBe(yasemin);
    expect(eksenDuzelt({ ...d, yDegisken: 'yok' }).yDegisken).toBeNull();
    expect(eksenDuzelt({ ...d, yDegisken: mac.sutunlar[0].id }).yDegisken).toBeNull();
  });
});

describe('örnek veri: A ve B sınıfı matematik sınav ortalamaları (saçılım)', () => {
  it('ünite sınavına göre eşleşmiş iki sayısal değişken; saçılımda açılır; iki sınıf birlikte artıp azalır', () => {
    const ornek = ORNEK_VERILER.find((o) => o.id === 'sinif')!;
    expect(ornek.onerilenGrafik).toBe('sacilim');
    expect(ORNEK_VERILER.find((o) => o.id === 'gun')!.onerilenGrafik).toBe('daire');
    const t = ornekVeriOlustur('sinif');
    expect(t.sutunlar.map((s) => s.ad)).toEqual(['Ünite sınavı', 'A sınıfı ortalaması', 'B sınıfı ortalaması']);
    expect(t.satirlar).toHaveLength(10);
    const eksen = sacilimEksenleri({ degisken: null, yDegisken: null }, t)!;
    expect(eksen).toEqual({ x: t.sutunlar[1].id, y: t.sutunlar[2].id, renk: null });
    // Pearson korelasyonu: belirgin pozitif ilişki
    const a = t.satirlar.map((r) => Number(r.hucreler[1]));
    const b = t.satirlar.map((r) => Number(r.hucreler[2]));
    const ort = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
    const [ma, mb] = [ort(a), ort(b)];
    const kov = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0);
    const r = kov / Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
    expect(r).toBeGreaterThan(0.8);
    expect(ma).toBeCloseTo(69.9, 5);
    expect(mb).toBeCloseTo(66.4, 5);
  });
});

describe('saçılım: kategorik değişkene göre renk', () => {
  it('varsayılan ilk kategorik değişken; "renksiz" seçilebilir; geçersiz seçim otomatiğe döner', () => {
    const t = ornekVeriOlustur('calisma');
    const [sinif, calisma, puan] = t.sutunlar.map((s) => s.id);
    expect(ORNEK_VERILER.find((o) => o.id === 'calisma')!.onerilenGrafik).toBe('sacilim');
    expect(sacilimEksenleri({ degisken: null, yDegisken: null }, t)).toEqual({ x: calisma, y: puan, renk: sinif });
    expect(sacilimEksenleri({ degisken: null, yDegisken: null, renkDegisken: RENKSIZ }, t)!.renk).toBeNull();
    expect(sacilimEksenleri({ degisken: null, yDegisken: null, renkDegisken: 'yok-boyle-sutun' }, t)!.renk).toBe(sinif);
    const d: Durum = { ...eksenDuzelt({ ...baslangicDurumu(), tablo: t }), renkDegisken: 'yok-boyle-sutun' };
    expect(eksenDuzelt(d).renkDegisken).toBeNull();
    expect(eksenDuzelt({ ...d, renkDegisken: RENKSIZ }).renkDegisken).toBe(RENKSIZ);
    expect(eksenDuzelt({ ...d, renkDegisken: puan }).renkDegisken).toBeNull();
    // Eski kayıttaki sacilimRenk alanı renk anahtarı olarak okunur
    const eski = durumCoz({ surum: 1, tablo: t, sacilimRenk: RENKSIZ })!;
    expect(eski.renkDegisken).toBe(RENKSIZ);
  });
});
