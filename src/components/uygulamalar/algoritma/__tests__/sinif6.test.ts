import { describe, expect, it } from 'vitest';
import { calistir } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import { izgara } from '../dunya';
import { bloklar, karsilastirmaMi, programKur, type Program } from '../program';
import type { Gorev } from '../gorev';
import { SINIF6 } from '../sinif6';
import { uniteleriDenetle } from './uniteDenetimi';

const gorev = (id: string): Gorev => {
  for (const u of SINIF6) {
    const g = u.gorevler.find((x) => x.id === id);
    if (g) return g;
  }
  throw new Error(`görev yok: ${id}`);
};
/** Hazır (hatalı) kodu çalıştırınca çocuğun okuyacağı cümle */
const hazirIleti = (id: string) => {
  const g = gorev(id);
  return sonucIletisi(calistir(g.baslangic as Program, g.dunya, g.hedef).sonuc, g.dunya, g.bitkiAdi);
};
/** Önceki görevin çözümü bu görevin dünyasında */
const oncekiIleti = (id: string) => {
  for (const u of SINIF6) {
    const i = u.gorevler.findIndex((x) => x.id === id);
    if (i > 0) {
      const g = u.gorevler[i];
      return sonucIletisi(calistir(u.gorevler[i - 1].cozum, g.dunya, g.hedef).sonuc, g.dunya, g.bitkiAdi);
    }
  }
  throw new Error(id);
};
const cozumIzi = (id: string) => {
  const g = gorev(id);
  return calistir(g.cozum, g.dunya, g.hedef);
};
const basari = (id: string) => gorev(id).basari(cozumIzi(id));

describe('6. sınıf', () => {
  it('ortak denetim: bütün görevler kurallara uyar', () => uniteleriDenetle(SINIF6));

  it('dört ünite; Mühendis adası, blok görünümü, sesli yönerge kapalı; kimlikler tek', () => {
    expect(SINIF6.map((u) => u.id)).toEqual(['s6-formul', 's6-katlar', 's6-terim', 's6-enbuyuk']);
    expect(SINIF6.map((u) => u.no)).toEqual([1, 2, 3, 4]);
    expect(SINIF6.map((u) => u.kalip)).toEqual(['formul', 'katlari', 'genel-terim', 'en-buyuk']);
    for (const u of SINIF6) {
      expect(u.sinif).toBe(6);
      expect(u.kademe).toBe('Mühendis adası');
      expect(u.gorunum).toBe('blok');
      expect(u.sesliYonerge).toBe(false);
      expect(u.gorevler.length, u.id).toBeGreaterThanOrEqual(4);
      expect(u.gorevler.length, u.id).toBeLessThanOrEqual(6);
      expect(u.gorevler.filter((g) => g.zorlu).length, u.id).toBeLessThanOrEqual(1);
      expect(u.ogretmenNotu.yanilgilar.length, u.id).toBeGreaterThanOrEqual(2);
      expect(u.ogretmenNotu.sorular.length, u.id).toBeGreaterThanOrEqual(3);
      for (const g of u.gorevler) {
        expect(g.ipuclari.length, g.id).toBeGreaterThanOrEqual(1);
        expect(g.ipuclari.length, g.id).toBeLessThanOrEqual(3);
        if (g.tur === 'tahmin') expect(g.baslangic, g.id).toBe(g.cozum);
      }
    }
    const ids = SINIF6.flatMap((u) => u.gorevler.map((g) => g.id));
    expect(ids.every((id) => id.startsWith('s6-'))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ekrana sığar: ızgara ≤ 9 × 6, sıra ≤ 12 bitki, kule ≤ 6', () => {
    for (const u of SINIF6) {
      for (const g of u.gorevler) {
        const z = izgara(g.dunya);
        if (z.tur === 'sera') expect(g.dunya.bitkiler.length, g.id).toBeLessThanOrEqual(12);
        else {
          expect(z.en, g.id).toBeLessThanOrEqual(9);
          expect(z.boy, g.id).toBeLessThanOrEqual(6);
        }
        expect(Math.max(0, ...z.yapiHedef), g.id).toBeLessThanOrEqual(6);
      }
    }
  });

  it('her programda kimlikler tek; farklı programlar kimlik paylaşmaz', () => {
    const programlar = new Set<Program>();
    for (const u of SINIF6) for (const g of u.gorevler) for (const p of [g.cozum, g.baslangic]) if (Array.isArray(p)) programlar.add(p);
    const hepsi: string[] = [];
    for (const p of programlar) hepsi.push(...[...bloklar(p)].map((b) => b.id));
    expect(new Set(hepsi).size).toBe(hepsi.length);
  });

  it('emoji yok', () => {
    expect(JSON.stringify(SINIF6)).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('katlar ünitesinde "yaprak sarıysa" yok: robot yalnız sayarak bulur', () => {
    const u = SINIF6.find((x) => x.id === 's6-katlar')!;
    for (const g of u.gorevler) {
      expect(g.aracKutusu.some((s) => (s.tur === 'eger' || s.tur === 'tekrarlaKadar') && s.kosul === 'yaprakSari'), g.id).toBe(false);
      for (const b of bloklar(g.cozum)) if (b.tur === 'eger') expect(karsilastirmaMi(b.kosul), g.id).toBe(true);
    }
    // Sarı yapraklar tam olarak k'nın katlarında
    const sarilar = (id: string) => gorev(id).dunya.bitkiler.flatMap((b, i) => (b.yaprak === 'sari' ? [i + 1] : []));
    expect(sarilar('s6-kat-1')).toEqual([3, 6, 9]);
    expect(sarilar('s6-kat-2')).toEqual([4, 8, 12]);
    expect(sarilar('s6-kat-3')).toEqual([6, 12]);
  });

  it('formül ünitesinde n dünyadan gelir; aynı kod farklı n’lerde çalışır', () => {
    expect(gorev('s6-formul-1').dunya.degiskenler).toEqual({ n: 5 });
    expect(gorev('s6-formul-2').dunya.degiskenler).toEqual({ n: 8 });
    const nKez = gorev('s6-formul-1').cozum;
    for (const n of [1, 3, 7, 10]) {
      const d = { id: `n${n}`, ad: `n = ${n}`, bitkiler: Array.from({ length: n }, () => ({ tur: 'saksi' as const, toprak: 'kuru' as const })), degiskenler: { n } };
      expect(calistir(nKez, d, gorev('s6-formul-1').hedef).sonuc.basarili, `n = ${n}`).toBe(true);
    }
    // Sayıyla yazılmış kod n değişince bozulur
    const besKez = programKur([['kez', 5, ['ileri', 'sula']], 'ileri'], 't-');
    expect(calistir(besKez, gorev('s6-formul-1').dunya, gorev('s6-formul-1').hedef).sonuc.basarili).toBe(true);
    expect(sonucIletisi(calistir(besKez, gorev('s6-formul-2').dunya, gorev('s6-formul-2').hedef).sonuc, gorev('s6-formul-2').dunya, 'saksı')).toBe(
      'Robot çıkışa varamadı; 7. ve 8. saksıya hiç uğramadı. 6. saksı susuz kaldı.'
    );
  });

  it('hatayı bul: çocuğun okuyacağı ileti (her hata görevi)', () => {
    const iletiler: Record<string, string> = {
      's6-formul-3': 'Robot çıkışta suladı; orada saksı yok, su boşa aktı.',
      's6-kat-4': '1. saksıdaki fidenin yaprakları sağlamdı; gübre gereksizdi.',
      's6-terim-3': 'Tekrar sayısı −1 olamaz; 0 ile 60 arasında bir tam sayı olmalı.',
      's6-en-3': 'enBüyük 190 olmalıydı; program bitince 1000 oldu.',
      's6-en-4': 'enBüyük 230 olmalıydı; program bitince 80 oldu.',
    };
    const hataGorevleri = SINIF6.flatMap((u) => u.gorevler.filter((g) => g.tur === 'hata').map((g) => g.id));
    expect(Object.keys(iletiler).sort()).toEqual([...hataGorevleri].sort());
    for (const [id, ileti] of Object.entries(iletiler)) expect(hazirIleti(id), id).toBe(ileti);
  });

  it('başlangıç iskeletleri ve yeni kurgular ne söyler', () => {
    expect(hazirIleti('s6-kat-1')).toBe('Sararmış yapraklı 3., 6. ve 9. saksı gübresiz kaldı.');
    expect(oncekiIleti('s6-formul-4')).toBe('1. saksının toprağı zaten nemliydi; su taştı.');
    expect(oncekiIleti('s6-kat-2')).toBe('3. saksıdaki fidenin yaprakları sağlamdı; gübre gereksizdi.');
    expect(oncekiIleti('s6-kat-3')).toBe('4. saksıdaki fidenin yaprakları sağlamdı; gübre gereksizdi.');
    expect(oncekiIleti('s6-kat-5')).toBe('1., 2., 4., 5., 7. ve 8. saksı susuz kaldı.');
    expect(oncekiIleti('s6-terim-2')).toBe('Yapıda 3 küp eksik (3 kulede).');
    expect(oncekiIleti('s6-terim-5')).toBe('toplam değişkenine hiç değer verilmedi; 9 olmalıydı.');
    expect(oncekiIleti('s6-en-6')).toBe('enKüçük değişkenine hiç değer verilmedi; 90 olmalıydı.');
    // Genelleme: önceki kod değişmeden çalışır
    expect(oncekiIleti('s6-formul-2')).toBe('Program bu dünyada doğru çalıştı.');
    expect(oncekiIleti('s6-en-2')).toBe('Program bu dünyada doğru çalıştı.');
  });

  it('çözümlerin son değişken değerleri', () => {
    const beklenen: Record<string, Record<string, number>> = {
      's6-formul-1': { n: 5 },
      's6-formul-4': { n: 4 },
      's6-kat-1': { sıra: 9 },
      's6-kat-2': { sıra: 12 },
      's6-kat-3': { sıra: 12 },
      's6-kat-4': { sıra: 11 },
      's6-kat-5': { sıra: 9 },
      's6-terim-1': { i: 4 },
      's6-terim-2': { i: 4 },
      's6-terim-3': { i: 4 },
      's6-terim-4': { i: 3 },
      's6-terim-5': { i: 4, toplam: 9 },
      's6-en-1': { enBüyük: 180 },
      's6-en-2': { enBüyük: 210 },
      's6-en-3': { enBüyük: 190 },
      's6-en-4': { enBüyük: 230 },
      's6-en-5': { enBüyük: 190 },
      's6-en-6': { enKüçük: 90 },
    };
    for (const [id, d] of Object.entries(beklenen)) expect(cozumIzi(id).son.degiskenler, id).toEqual(d);
  });

  it('başarı cümleleri matematiği izden gösterir', () => {
    expect(basari('s6-formul-1')).toBe('Oldu! n = 5: robot n = 5 saksıyı suladı ve n + 1 = 6 adım attı.');
    expect(basari('s6-formul-2')).toBe('Oldu! Kodun n’yi okuyor: n = 8 saksı, n + 1 = 9 adım, 2 × n = 16 litre su.');
    expect(basari('s6-kat-1')).toBe('Oldu! Gübre alan saksılar: 3, 6 ve 9. Hepsi 3’ün katı: 3 × 1, 3 × 2, 3 × 3.');
    expect(basari('s6-kat-3')).toBe('Oldu! Gübre alan saksılar: 6 ve 12. Hepsi 6’nın katı: 6 × 1, 6 × 2. Bunlar 2’nin ve 3’ün ortak katlarıdır.');
    expect(basari('s6-terim-1')).toBe('Oldu! i = 1, 2 ve 3 için 2 × i − 1 = 1, 3 ve 5 küp. Genel terim: 2 × i − 1.');
    expect(basari('s6-terim-5')).toBe('Oldu! toplam = 1 + 3 + 5 = 9 = 3 × 3.');
    expect(basari('s6-en-1')).toBe('Oldu! Robot 6 domatesi tarttı. enBüyük: 0 → 120 → 150 → 180. En ağır domates 180 gram.');
    expect(basari('s6-en-2')).toBe('Oldu! enBüyük: 0 → 210. İlk domatesten sonra hiç değişmedi, çünkü ondan ağırı yok.');
    expect(basari('s6-en-4')).toBe('Buldun! "kütle > enBüyük" daha ağırını arar: 150 → 200 → 230.');
  });

  it('tahmin ve soru cevapları', () => {
    const tahmin = (id: string) => gorev(id).tahmin!.cevap(calistir(gorev(id).baslangic as Program, gorev(id).dunya, gorev(id).hedef));
    const soru = (id: string) => gorev(id).soru!.cevap(cozumIzi(id));
    expect(tahmin('s6-formul-5')).toBe(11);
    expect(tahmin('s6-terim-4')).toBe(9);
    expect(tahmin('s6-en-5')).toBe(4);
    expect(soru('s6-formul-2')).toBe(40);
    expect(soru('s6-formul-4')).toBe(9);
    expect(soru('s6-formul-5')).toBe(21);
    expect(soru('s6-kat-2')).toBe(3);
    expect(soru('s6-kat-3')).toBe(6);
    expect(soru('s6-terim-1')).toBe(39);
    expect(soru('s6-terim-2')).toBe(30);
    expect(soru('s6-terim-4')).toBe(39);
    expect(soru('s6-terim-5')).toBe(16);
    expect(soru('s6-en-2')).toBe(120);
    // Soru ve tahmin girişleri yalnız doğal sayı kabul eder
    for (const u of SINIF6) {
      for (const g of u.gorevler) {
        const iz = Array.isArray(g.baslangic) && g.tur === 'tahmin' ? calistir(g.baslangic, g.dunya, g.hedef) : cozumIzi(g.id);
        for (const s of [g.soru, g.tahmin]) if (s) expect(Number.isInteger(s.cevap(iz)) && s.cevap(iz) >= 0, g.id).toBe(true);
      }
    }
  });
});
