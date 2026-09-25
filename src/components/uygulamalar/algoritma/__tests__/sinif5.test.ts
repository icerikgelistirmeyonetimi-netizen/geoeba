import { describe, expect, it } from 'vitest';
import { calistir } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import { izgara } from '../dunya';
import { bloklar, blokSayisi, programKur, type Program } from '../program';
import type { Gorev } from '../gorev';
import { SINIF5 } from '../sinif5';
import { uniteleriDenetle } from './uniteDenetimi';

const gorev = (id: string): Gorev => {
  for (const u of SINIF5) {
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
  for (const u of SINIF5) {
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

describe('5. sınıf', () => {
  it('ortak denetim: bütün görevler kurallara uyar', () => uniteleriDenetle(SINIF5));

  it('dört ünite; Mühendis adası, blok görünümü, sesli yönerge kapalı; kimlikler tek', () => {
    expect(SINIF5.map((u) => u.id)).toEqual(['s5-sayac', 's5-toplam', 's5-tarla', 's5-kural']);
    expect(SINIF5.map((u) => u.no)).toEqual([1, 2, 3, 4]);
    expect(SINIF5.map((u) => u.kalip)).toEqual(['sayac', 'toplayici', 'yilan', 'kural']);
    for (const u of SINIF5) {
      expect(u.sinif).toBe(5);
      expect(u.kademe).toBe('Mühendis adası');
      expect(u.gorunum).toBe('blok');
      expect(u.sesliYonerge).toBe(false);
      expect(u.gorevler.length, u.id).toBeGreaterThanOrEqual(4);
      expect(u.gorevler.length, u.id).toBeLessThanOrEqual(6);
      expect(u.gorevler.filter((g) => g.zorlu).length, u.id).toBeLessThanOrEqual(1);
      expect(u.ogretmenNotu.yanilgilar.length, u.id).toBeGreaterThanOrEqual(2);
      expect(u.ogretmenNotu.sorular.length, u.id).toBeGreaterThanOrEqual(3);
      for (const g of u.gorevler) {
        expect(g.id.startsWith(`${u.id}-`), g.id).toBe(true);
        expect(g.ipuclari.length, g.id).toBeGreaterThanOrEqual(1);
        expect(g.ipuclari.length, g.id).toBeLessThanOrEqual(3);
        if (g.tur === 'tahmin') expect(g.baslangic, g.id).toBe(g.cozum);
      }
    }
    const ids = SINIF5.flatMap((u) => u.gorevler.map((g) => g.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ekrana sığar: ızgara ≤ 9 × 6, sıra ≤ 12 bitki, kule ≤ 6; bahçede adım izi kapalı', () => {
    for (const u of SINIF5) {
      for (const g of u.gorevler) {
        const z = izgara(g.dunya);
        if (z.tur === 'sera') expect(g.dunya.bitkiler.length, g.id).toBeLessThanOrEqual(12);
        else {
          expect(z.en, g.id).toBeLessThanOrEqual(9);
          expect(z.boy, g.id).toBeLessThanOrEqual(6);
        }
        expect(Math.max(0, ...z.yapiHedef), g.id).toBeLessThanOrEqual(6);
        if (z.tur === 'bahce') expect(g.dunya.adimIzi, g.id).toBe(false);
      }
    }
  });

  it('her programda kimlikler tek; farklı programlar kimlik paylaşmaz', () => {
    const programlar = new Set<Program>();
    for (const u of SINIF5) for (const g of u.gorevler) for (const p of [g.cozum, g.baslangic]) if (Array.isArray(p)) programlar.add(p);
    const hepsi: string[] = [];
    for (const p of programlar) hepsi.push(...[...bloklar(p)].map((b) => b.id));
    expect(new Set(hepsi).size).toBe(hepsi.length);
  });

  it('emoji yok', () => {
    const metin = JSON.stringify(SINIF5);
    expect(metin).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('hatayı bul: çocuğun okuyacağı ileti (her hata görevi)', () => {
    const iletiler: Record<string, string> = {
      's5-sayac-3': 'sayaç 5 olmalıydı; program bitince 1 oldu.',
      's5-sayac-4': 'sayaç 3 olmalıydı; program bitince 6 oldu.',
      's5-toplam-3': 'toplam 530 olmalıydı; program bitince 120 oldu.',
      's5-toplam-4': 'toplam değişkeninin henüz bir değeri yok. Önce ona bir değer ver.',
      's5-tarla-3': 'Robot tarlanın dışına tohum ekti.',
      's5-tarla-4': 'Robot tarlanın çitine çarptı.',
      's5-kural-4': 'Bu kule 1 küp olmalı; fazladan küp kondu.',
    };
    const hataGorevleri = SINIF5.flatMap((u) => u.gorevler.filter((g) => g.tur === 'hata').map((g) => g.id));
    expect(Object.keys(iletiler).sort()).toEqual([...hataGorevleri].sort());
    for (const [id, ileti] of Object.entries(iletiler)) expect(hazirIleti(id), id).toBe(ileti);
  });

  it('başlangıç iskeletleri ve yeni kurgular ne söyler', () => {
    expect(hazirIleti('s5-sayac-1')).toBe('sayaç değişkenine hiç değer verilmedi; 4 olmalıydı.');
    expect(hazirIleti('s5-toplam-1')).toBe('toplam değişkenine hiç değer verilmedi; 500 olmalıydı.');
    expect(oncekiIleti('s5-tarla-2')).toBe('Tarlada 10 kare boş kaldı.');
    expect(oncekiIleti('s5-kural-2')).toBe('Dron inşaat alanının kenarına geldi; daha ileri gidemez.');
    expect(oncekiIleti('s5-kural-3')).toBe('Bu kule 3 küp olmalı; fazladan küp kondu.');
    // Genelleme: önceki kod değişmeden çalışır
    expect(oncekiIleti('s5-sayac-2')).toBe('Program bu dünyada doğru çalıştı.');
    expect(oncekiIleti('s5-toplam-2')).toBe('Program bu dünyada doğru çalıştı.');
  });

  it('dört sıralık tarla: blokları kopyalamak iş görür ama blok sınırını aşar', () => {
    const g = gorev('s5-tarla-2');
    const birSira = ['ek', 'ileri', 'ek', 'ileri', 'ek', 'ileri', 'ek', 'ileri', 'ek'] as const;
    const kopya = programKur([...birSira, 'sagaDon', 'ileri', 'sagaDon', ...birSira, 'solaDon', 'ileri', 'solaDon', ...birSira, 'sagaDon', 'ileri', 'sagaDon', ...birSira], 't-');
    expect(calistir(kopya, g.dunya, g.hedef).sonuc.basarili).toBe(true);
    expect(blokSayisi(kopya)).toBeGreaterThan(g.enCokBlok!);
    expect(blokSayisi(g.cozum)).toBe(15);
  });

  it('çözümlerin son değişken değerleri', () => {
    const beklenen: Record<string, Record<string, number>> = {
      's5-sayac-1': { sayaç: 4 },
      's5-sayac-2': { sayaç: 6 },
      's5-sayac-3': { sayaç: 5 },
      's5-sayac-4': { sayaç: 3 },
      's5-sayac-5': { sayaç: 6 },
      's5-toplam-1': { toplam: 500 },
      's5-toplam-2': { toplam: 2000 },
      's5-toplam-3': { toplam: 530 },
      's5-toplam-4': { toplam: 500 },
      's5-toplam-5': { toplam: 1000 },
      's5-kural-1': { kat: 5 },
      's5-kural-2': { kat: 8 },
      's5-kural-3': { kat: 0 },
      's5-kural-4': { kat: 5 },
      's5-kural-5': { kat: 7 },
    };
    for (const [id, d] of Object.entries(beklenen)) expect(cozumIzi(id).son.degiskenler, id).toEqual(d);
  });

  it('başarı cümleleri matematiği izden gösterir', () => {
    expect(basari('s5-sayac-1')).toBe('Oldu! Robot 6 domatese baktı. sayaç = 4: sırada 4 olgun domates var.');
    expect(basari('s5-toplam-1')).toBe('Oldu! Sepetteki domatesler: 120 + 150 + 130 + 100 = 500 gram.');
    expect(basari('s5-toplam-2')).toBe('Oldu! 10 domatesten 7 tanesi toplandı: 250 + 300 + 350 + 200 + 400 + 250 + 250 = 2000 gram.');
    expect(basari('s5-tarla-1')).toBe('Oldu! Robot 10 kareye tohum ekti: 5 × 2 = 10.');
    expect(basari('s5-tarla-2')).toBe('Oldu! İki sıralık parça 2 kez tekrarlandı: 5 × 4 = 20 kare ekildi.');
    expect(basari('s5-tarla-4')).toBe('Buldun! 6 kare için 5 adım yeter. 6 × 4 = 24 kare ekildi.');
    expect(basari('s5-kural-1')).toBe('Oldu! Kuleler 1, 2, 3 ve 4 küp: her kule bir öncekinden 1 fazla. Toplam 10 küp.');
    expect(basari('s5-kural-3')).toBe('Oldu! Kuleler 5, 4, 3, 2 ve 1 küp: her kule bir öncekinden 1 eksik. Toplam 15 küp.');
  });

  it('tahmin ve soru cevapları', () => {
    const tahmin = (id: string) => gorev(id).tahmin!.cevap(calistir(gorev(id).baslangic as Program, gorev(id).dunya, gorev(id).hedef));
    const soru = (id: string) => gorev(id).soru!.cevap(cozumIzi(id));
    expect(tahmin('s5-sayac-5')).toBe(6);
    expect(tahmin('s5-toplam-5')).toBe(1000);
    expect(tahmin('s5-tarla-5')).toBe(28);
    expect(tahmin('s5-kural-5')).toBe(18);
    expect(soru('s5-sayac-1')).toBe(2);
    expect(soru('s5-toplam-2')).toBe(2);
    expect(soru('s5-tarla-1')).toBe(10);
    expect(soru('s5-tarla-2')).toBe(25);
    expect(soru('s5-tarla-5')).toBe(22);
    expect(soru('s5-kural-2')).toBe(12);
    expect(soru('s5-kural-5')).toBe(7);
    // Soru ve tahmin girişleri yalnız doğal sayı kabul eder
    for (const u of SINIF5) {
      for (const g of u.gorevler) {
        const iz = Array.isArray(g.baslangic) && g.tur === 'tahmin' ? calistir(g.baslangic, g.dunya, g.hedef) : cozumIzi(g.id);
        for (const s of [g.soru, g.tahmin]) if (s) expect(Number.isInteger(s.cevap(iz)) && s.cevap(iz) >= 0, g.id).toBe(true);
      }
    }
  });
});
