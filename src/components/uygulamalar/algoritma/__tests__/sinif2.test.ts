import { describe, expect, it } from 'vitest';
import { calistir, izOzeti } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import { blokSayisi, bloklar, programKur, type KisaBlok, type Program } from '../program';
import { izgara } from '../dunya';
import { SINIF2 } from '../sinif2';
import type { Gorev } from '../gorev';
import { uniteleriDenetle } from './uniteDenetimi';

const gorevler = SINIF2.flatMap((u) => u.gorevler);
const gorevBul = (id: string): Gorev => {
  const g = gorevler.find((x) => x.id === id);
  if (!g) throw new Error(id);
  return g;
};
const iletisi = (p: Program, g: Gorev) => sonucIletisi(calistir(p, g.dunya, g.hedef).sonuc, g.dunya, g.bitkiAdi);
/** Çocuğun "Hatayı bul" görevinde hazır kodu çalıştırınca okuyacağı cümle */
const hataIletisi = (g: Gorev) => sonucIletisi(calistir(g.baslangic as Program, g.dunya, g.hedef).sonuc, g.dunya, g.bitkiAdi);
const cozumIzi = (g: Gorev) => calistir(g.cozum, g.dunya, g.hedef);
const basari = (g: Gorev) => g.basari(cozumIzi(g));
const onceki = (id: string) => {
  const i = gorevler.findIndex((x) => x.id === id);
  return gorevler[i - 1];
};

describe('2. sınıf', () => {
  it('ortak denetim: dört ünite kurallara uyar', () => uniteleriDenetle(SINIF2));

  it('dört ünite sırayla; görev kimlikleri tek ve sN-kisa-k biçiminde', () => {
    expect(SINIF2.map((u) => [u.id, u.no, u.kalip])).toEqual([
      ['s2-tekrar', 1, 'n-kez'],
      ['s2-desen', 2, 'desenli-tekrar'],
      ['s2-yol', 3, 'en-kisa'],
      ['s2-kule', 4, 'katman'],
    ]);
    const ids = gorevler.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of SINIF2) {
      expect(u.gorevler.length, u.id).toBeGreaterThanOrEqual(4);
      expect(u.gorevler.length, u.id).toBeLessThanOrEqual(6);
      for (const g of u.gorevler) expect(g.id.startsWith(`${u.id}-`), g.id).toBe(true);
      expect(u.ogretmenNotu.yanilgilar.length, u.id).toBeGreaterThanOrEqual(2);
      expect(u.ogretmenNotu.sorular.length, u.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('ızgaralar 7 × 5 içinde; ipuçları 1–3; emoji yok', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const u of SINIF2) {
      expect(emoji.test(JSON.stringify(u)), u.id).toBe(false);
      for (const g of u.gorevler) {
        const z = izgara(g.dunya);
        expect(z.en, g.id).toBeLessThanOrEqual(7);
        expect(z.boy, g.id).toBeLessThanOrEqual(5);
        expect(g.ipuclari.length, g.id).toBeGreaterThanOrEqual(1);
        expect(g.ipuclari.length, g.id).toBeLessThanOrEqual(3);
      }
    }
  });

  it('her program kendi kimlik önekiyle kurulur (kimlikler görevler arasında da çakışmaz)', () => {
    const idler: string[] = [];
    for (const g of gorevler) {
      for (const p of [g.cozum, Array.isArray(g.baslangic) ? g.baslangic : []]) for (const b of bloklar(p)) idler.push(b.id);
    }
    expect(new Set(idler).size).toBe(idler.length);
  });

  it('"Hatayı bul" görevlerinde çocuğun okuyacağı iletiler', () => {
    const beklenen: Record<string, string> = {
      's2-tekrar-4': 'Robot bahçenin çitine çarptı.',
      's2-tekrar-5': '1., 2. ve 3. saksı susuz kaldı.',
      's2-desen-4': 'Robot bahçenin çitine çarptı.',
      's2-desen-5': 'Robot çalıya çarptı.',
      's2-yol-4': 'Robot çiçeğe 10 adımda vardı. Daha kısa bir yol var: 6 adım.',
      's2-kule-5': 'Yapıda 4 küp eksik (4 kulede).',
      's2-kule-6': 'Bu kule 4 küp olmalı; fazladan küp kondu.',
    };
    expect(gorevler.filter((g) => g.tur === 'hata').map((g) => g.id)).toEqual(Object.keys(beklenen));
    for (const [id, cumle] of Object.entries(beklenen)) {
      const g = gorevBul(id);
      expect(sonucIletisi(calistir(g.baslangic as Program, g.dunya, g.hedef).sonuc, g.dunya, g.bitkiAdi), id).toBe(cumle);
      expect(hataIletisi(g), id).toBe(cumle);
    }
    // 4. görevdeki hata tur sayısıdır: iki saksı sulanmış, robot 3. turda çite çarpmıştır
    const t4 = calistir(gorevBul('s2-tekrar-4').baslangic as Program, gorevBul('s2-tekrar-4').dunya, gorevBul('s2-tekrar-4').hedef);
    expect(izOzeti(t4).sulama).toBe(2);
    expect(t4.adimlar.filter((a) => a.tur === 'tur').length).toBe(3);
  });

  it('"Yeni kurgu" görevlerinde önceki çözümün iletisi (neden düzeltmek gerekiyor)', () => {
    const beklenen: Record<string, string> = {
      's2-tekrar-2': '1., 2., 3., 4., 5. ve 6. saksı susuz kaldı.',
      's2-tekrar-3': 'Robot boş yeri suladı; orada saksı yok.',
      's2-desen-2': 'Robot çiçeğe varamadı: çiçek 2 kare uzakta.',
      's2-desen-3': '1., 2., 3. ve 4. saksı susuz kaldı.',
      's2-yol-2': 'Robot çalıya çarptı.',
      's2-kule-2': 'Dron küpü yanlış yere koydu; burada küp olmayacaktı.',
      's2-kule-3': 'Bu kule 2 küp olmalı; fazladan küp kondu.',
      's2-kule-4': 'Bu kule 2 küp olmalı; fazladan küp kondu.',
    };
    expect(gorevler.filter((g) => g.baslangic === 'onceki').map((g) => g.id)).toEqual(Object.keys(beklenen));
    for (const [id, cumle] of Object.entries(beklenen)) expect(iletisi(onceki(id).cozum, gorevBul(id)), id).toBe(cumle);
  });

  it('en kısa yol: uzun yolu seçen çocuk kaç adım olduğunu ve kısa yolu okur', () => {
    const y1 = gorevBul('s2-yol-1');
    const altYol: KisaBlok[] = [['kez', 3, ['ileri']], 'solaDon', ['kez', 3, ['ileri']], 'solaDon', 'ileri'];
    expect(iletisi(programKur(altYol, 't-y1-'), y1)).toBe('Robot çiçeğe 7 adımda vardı. Daha kısa bir yol var: 5 adım.');
    const y3 = gorevBul('s2-yol-3');
    const kenar: KisaBlok[] = ['sagaDon', ['kez', 4, ['ileri']], 'solaDon', ['kez', 3, ['ileri']], 'solaDon', 'ileri'];
    expect(iletisi(programKur(kenar, 't-y3-'), y3)).toBe('Robot çiçeğe 8 adımda vardı. Daha kısa bir yol var: 6 adım.');
  });

  it('tekrarsız uzun kod işi yapar ama blok sınırını aşar (tekrarla kartı istenir)', () => {
    const t1 = gorevBul('s2-tekrar-1');
    const uzun = programKur(Array.from({ length: 6 }, (): KisaBlok => 'ileri'), 't-u1-');
    expect(calistir(uzun, t1.dunya, t1.hedef).sonuc.basarili).toBe(true);
    expect(blokSayisi(uzun)).toBeGreaterThan(t1.enCokBlok!);
    const k1 = gorevBul('s2-kule-1');
    const duvar = programKur(Array.from({ length: 4 }, (): KisaBlok[] => ['ileri', 'koy']).flat(), 't-u2-');
    expect(calistir(duvar, k1.dunya, k1.hedef).sonuc.basarili).toBe(true);
    expect(blokSayisi(duvar)).toBeGreaterThan(k1.enCokBlok!);
    // İlerlemeden koymak: dron ilk küpü başladığı boş kareye koyar
    expect(iletisi(programKur([['kez', 4, ['koy', 'ileri']]], 't-u3-'), k1)).toBe('Dron küpü yanlış yere koydu; burada küp olmayacaktı.');
  });

  it('başarı cümleleri matematiği izden hesaplar', () => {
    expect(basari(gorevBul('s2-tekrar-1'))).toBe('Oldu! Robot 6 adım attı: 6 kez ileri.');
    expect(basari(gorevBul('s2-tekrar-2'))).toBe('Oldu! 6 kez "ileri, sula": 6 saksı sulandı.');
    expect(basari(gorevBul('s2-tekrar-3'))).toBe('Oldu! Robot 2., 4. ve 6. adımda suladı. 3 kez 2 adım = 6 adım.');
    expect(basari(gorevBul('s2-tekrar-4'))).toBe('Buldun! Robot 3. ve 6. adımda suladı. 2 kez 3 adım = 6 adım.');
    expect(basari(gorevBul('s2-tekrar-5'))).toBe('Buldun! "sula" artık her turda çalışıyor: 4 saksı sulandı.');
    expect(basari(gorevBul('s2-desen-1'))).toBe('Oldu! 3 basamak, her basamakta 2 adım: 2 + 2 + 2 = 6 adım.');
    expect(basari(gorevBul('s2-desen-2'))).toBe('Oldu! 4 basamak, her basamakta 2 adım: 2 + 2 + 2 + 2 = 8 adım.');
    expect(basari(gorevBul('s2-desen-3'))).toBe('Oldu! 4 saksı sulandı. 4 basamak, her basamakta 2 adım: 2 + 2 + 2 + 2 = 8 adım.');
    expect(basari(gorevBul('s2-desen-4'))).toBe('Buldun! Yukarı çıkarken önce sola, sonra sağa. 3 basamak, her basamakta 2 adım: 2 + 2 + 2 = 6 adım.');
    expect(basari(gorevBul('s2-desen-5'))).toBe('Buldun! 3 basamak, her basamakta 3 adım: 3 + 3 + 3 = 9 adım.');
    expect(basari(gorevBul('s2-yol-1'))).toBe('Oldu! Robot çiçeğe 5 adımda vardı. Öbür yol 7 adım.');
    expect(basari(gorevBul('s2-yol-2'))).toBe('Oldu! Yeni yol 7 adım. Kapanan yol 5 adımdı: 7 − 5 = 2 adım fazla.');
    expect(basari(gorevBul('s2-yol-3'))).toBe('Oldu! 6 adım, 6 dönüş. Kenardaki yolda dönüş az ama 8 adım var.');
    expect(basari(gorevBul('s2-yol-4'))).toBe('Buldun! Robot artık çiçeğe 6 adımda varıyor.');
    expect(basari(gorevBul('s2-kule-1'))).toBe('Oldu! 4 kez 1 küp: 1 + 1 + 1 + 1 = 4 küp.');
    expect(basari(gorevBul('s2-kule-2'))).toBe('Oldu! Dron 3 kez küp koydu: kule 3 küp yüksekliğinde.');
    expect(basari(gorevBul('s2-kule-3'))).toBe('Oldu! 1 + 2 + 3 = 6 küp.');
    expect(basari(gorevBul('s2-kule-4'))).toBe('Oldu! 3 kez 2 küp: 2 + 2 + 2 = 6 küp.');
    expect(basari(gorevBul('s2-kule-5'))).toBe('Buldun! 4 kez 2 küp: 2 + 2 + 2 + 2 = 8 küp.');
    expect(basari(gorevBul('s2-kule-6'))).toBe('Buldun! 2 + 4 = 6 küp.');
  });

  it('başarıdan sonraki sorular: ritmik sayma, çarpma, çıkarma', () => {
    const cevap = (id: string) => {
      const g = gorevBul(id);
      return g.soru!.cevap(cozumIzi(g));
    };
    expect(cevap('s2-tekrar-3')).toBe(8);
    expect(cevap('s2-tekrar-4')).toBe(12);
    expect(cevap('s2-desen-2')).toBe(10);
    expect(cevap('s2-yol-1')).toBe(2);
    expect(cevap('s2-yol-4')).toBe(4);
    expect(cevap('s2-kule-4')).toBe(10);
  });
});
