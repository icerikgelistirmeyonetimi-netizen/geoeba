import { describe, expect, it } from 'vitest';
import { SINIF8 } from '../sinif8';
import { SINIF7 } from '../sinif7';
import { calistir } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import { sozdeKod, type Program } from '../program';
import type { Gorev } from '../gorev';
import { uniteleriDenetle } from './uniteDenetimi';

const gorev = (id: string): Gorev => {
  for (const u of SINIF8) {
    const g = u.gorevler.find((x) => x.id === id);
    if (g) return g;
  }
  throw new Error(`Görev yok: ${id}`);
};
/** Hazır kodun çocuğa gösterdiği ileti */
const hazirIleti = (g: Gorev) => sonucIletisi(calistir(g.baslangic as Program, g.dunya, g.hedef).sonuc, g.dunya, g.bitkiAdi);
/** Bir önceki görevin çözümü bu görevin dünyasında (yeni kurgu) */
const oncekiIleti = (onceki: string, g: Gorev) => sonucIletisi(calistir(gorev(onceki).cozum, g.dunya, g.hedef).sonuc, g.dunya, g.bitkiAdi);
const cozumIzi = (g: Gorev) => calistir(g.cozum, g.dunya, g.hedef);

/** Her "Hatayı bul" görevinde çocuğun okuyacağı cümle */
const HATA_ILETILERI: Record<string, string> = {
  's8-koordinat-4': 'Robot yanlış noktayı işaretledi: (2, 3).',
  's8-dogrusal-4': 'Robot yanlış noktayı işaretledi: (1, 4).',
  's8-oteleme-3': 'Şeklin 6 çizgisi eksik kaldı.',
  's8-oteleme-4': 'Robot şekilde olmayan bir çizgi çizdi; aynadaki çizgiyle eşleşmiyor.',
  's8-us-3': 'Bu kule 2 küp olmalı; fazladan küp kondu.',
};

describe('8. sınıf', () => {
  it('ortak denetim: dört ünite kurallara uyar', () => {
    expect(SINIF8.map((u) => u.id)).toEqual(['s8-koordinat', 's8-dogrusal', 's8-oteleme', 's8-us']);
    expect(SINIF8.map((u) => u.no)).toEqual([1, 2, 3, 4]);
    uniteleriDenetle(SINIF8);
    const ids = SINIF8.flatMap((u) => u.gorevler.map((g) => g.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of SINIF8) {
      expect(u.gorevler.length, u.id).toBeGreaterThanOrEqual(4);
      expect(u.gorevler.length, u.id).toBeLessThanOrEqual(6);
      expect(u.kademe).toBe('Araştırma adası');
      expect(u.sesliYonerge).toBe(false);
      expect(u.ogretmenNotu.yanilgilar.length, u.id).toBeGreaterThanOrEqual(2);
      expect(u.ogretmenNotu.sorular.length, u.id).toBeGreaterThanOrEqual(3);
      for (const g of u.gorevler) {
        expect(g.ipuclari.length, g.id).toBeGreaterThanOrEqual(1);
        expect(g.ipuclari.length, g.id).toBeLessThanOrEqual(3);
      }
    }
  });

  it('her "Hatayı bul" görevinin iletisi sabit', () => {
    const hatalar = SINIF8.flatMap((u) => u.gorevler.filter((g) => g.tur === 'hata').map((g) => g.id));
    expect(hatalar.sort()).toEqual(Object.keys(HATA_ILETILERI).sort());
    for (const [id, ileti] of Object.entries(HATA_ILETILERI)) expect(hazirIleti(gorev(id)), id).toBe(ileti);
  });

  it('yeni kurgular önceki çözümü nerede bozuyor', () => {
    expect(oncekiIleti('s8-koordinat-1', gorev('s8-koordinat-2'))).toBe('Robot yanlış noktayı işaretledi: (3, 2).');
    expect(hazirIleti(gorev('s8-koordinat-3'))).toBe('apsis değişkenine hiç değer verilmedi; 3 olmalıydı. ordinat değişkenine hiç değer verilmedi; 4 olmalıydı.');
    expect(oncekiIleti('s8-dogrusal-1', gorev('s8-dogrusal-2'))).toBe('Robot yanlış noktayı işaretledi: (1, 1).');
    expect(oncekiIleti('s8-dogrusal-2', gorev('s8-dogrusal-3'))).toBe('Robot yanlış noktayı işaretledi: (0, 0).');
    expect(oncekiIleti('s8-dogrusal-4', gorev('s8-dogrusal-5'))).toBe('Robot yanlış noktayı işaretledi: (0, 2).');
    expect(oncekiIleti('s8-oteleme-1', gorev('s8-oteleme-2'))).toBe('Robot şekilde olmayan bir çizgi çizdi.');
    expect(oncekiIleti('s8-oteleme-4', gorev('s8-oteleme-5'))).toBe('Robot şekilde olmayan bir çizgi çizdi; aynadaki çizgiyle eşleşmiyor.');
    expect(oncekiIleti('s8-us-1', gorev('s8-us-2'))).toBe('Bu kule 2 küp olmalı; fazladan küp kondu.');
  });

  it('başarı cümleleri matematiği izden hesaplar', () => {
    const cumle = (id: string) => gorev(id).basari(cozumIzi(gorev(id)));
    expect(cumle('s8-koordinat-1')).toBe('Oldu! Robot x ekseni boyunca 3 birim, y ekseni boyunca 2 birim gitti: (3, 2) noktası.');
    expect(cumle('s8-koordinat-4')).toBe('Buldun! (a, b) = (3, 2): önce a birim x ekseni boyunca, sonra b birim y ekseni boyunca.');
    expect(cumle('s8-koordinat-5')).toBe('Oldu! Aynı kod bu kez (5, 4) noktasına gitti: a = 5, b = 4. Kod her (a, b) için çalışır.');
    expect(cumle('s8-dogrusal-1')).toBe('Oldu! 6 nokta: x 1 artınca y 1 artıyor. y = x doğrusunun eğimi 1.');
    expect(cumle('s8-dogrusal-3')).toBe('Oldu! Eğim yine 2, ama doğru y eksenini (0, 1) noktasında kesiyor. y = 2x ile y = 2x + 1 paralel.');
    expect(cumle('s8-dogrusal-4')).toBe('Buldun! y = x + 2 doğrusunda eğim 1: her adımda 1 birim yukarı. 2 yalnız başlangıç yüksekliği: (0, 2).');
    expect(cumle('s8-dogrusal-5')).toBe('Oldu! x 1 artınca y 2 azalıyor: eğim −2. Doğru x eksenini (3, 0) noktasında kesiyor.');
    expect(cumle('s8-dogrusal-6')).toBe('Oldu! Kural y = 3x + 1: x = 10 iken y = 3 × 10 + 1 = 31.');
    expect(cumle('s8-oteleme-1')).toBe('Oldu! ŞEKİL (1, 1) ve (5, 1) noktalarında çağrıldı: her nokta 4 birim sağa ötelendi, (x, y) → (x + 4, y).');
    expect(cumle('s8-oteleme-2')).toBe('Oldu! ŞEKİL (1, 1) ve (4, 3) noktalarında çağrıldı: her nokta 3 birim sağa, 2 birim yukarı ötelendi, (x, y) → (x + 3, y + 2).');
    expect(cumle('s8-oteleme-4')).toBe('Buldun! AYNA’da her dönüş tersine döndü. Direğin dibi (2, 1), görüntüsü (6, 1): dikey aynada (x, y) → (8 − x, y).');
    expect(cumle('s8-oteleme-5')).toBe('Oldu! Direğin dibi (2, 4), görüntüsü (2, 3): yatay aynada (x, y) → (x, 7 − y). Bayrak aşağı doğru çizildi.');
    expect(cumle('s8-us-1')).toBe('Oldu! Kuleler 1, 2, 4, 8 küp: 2⁰, 2¹, 2², 2³. Toplam 15 küp: bir sonraki kuleden 1 eksik, 2⁴ − 1.');
    expect(cumle('s8-us-2')).toBe('Oldu! Kuleler 8, 4, 2, 1 küp: 2³, 2², 2¹, 2⁰. Döngü bitince kat = 0,5 = 2⁻¹.');
    expect(cumle('s8-us-4')).toBe('Oldu! kat 1’den başladı ve 10 kez 2 ile çarpıldı: 2¹⁰ = 1024. Kulelerde 4, sonra 6 kez: 2⁴ · 2⁶ = 2¹⁰.');
  });

  it('değişkenlerin son değerleri, tahmin ve soru cevapları', () => {
    expect(cozumIzi(gorev('s8-koordinat-3')).son.degiskenler).toEqual({ apsis: 3, ordinat: 4 });
    expect(cozumIzi(gorev('s8-us-1')).son.degiskenler).toEqual({ kat: 16 });
    expect(cozumIzi(gorev('s8-us-2')).son.degiskenler).toEqual({ kat: 0.5 });
    expect(cozumIzi(gorev('s8-us-4')).son.degiskenler).toEqual({ kat: 1024 });
    const tahmin = (id: string) => {
      const g = gorev(id);
      return g.tahmin!.cevap(calistir(g.baslangic as Program, g.dunya, g.hedef));
    };
    expect(tahmin('s8-dogrusal-6')).toBe(31);
    expect(tahmin('s8-us-4')).toBe(1024);
    const soru = (id: string) => gorev(id).soru!.cevap(cozumIzi(gorev(id)));
    expect(soru('s8-koordinat-1')).toBe(2);
    expect(soru('s8-koordinat-2')).toBe(3);
    expect(soru('s8-koordinat-3')).toBe(7);
    expect(soru('s8-dogrusal-2')).toBe(14);
    expect(soru('s8-dogrusal-3')).toBe(1);
    expect(soru('s8-dogrusal-5')).toBe(3);
    expect(soru('s8-oteleme-1')).toBe(7);
    expect(soru('s8-oteleme-2')).toBe(3);
    expect(soru('s8-oteleme-5')).toBe(1);
    expect(soru('s8-us-1')).toBe(16);
    expect(soru('s8-us-2')).toBe(1);
  });

  it('sözde kodla açılan tahmin görevinin kodu', () => {
    expect(gorev('s8-us-4').ilkGorunum).toBe('sozde');
    expect(sozdeKod(gorev('s8-us-4').baslangic as Program)).toBe(
      [
        'BAŞLA',
        '    kat ← 1',
        '    4 KEZ TEKRARLA',
        '        İLERİ GİT',
        '        kat KEZ TEKRARLA',
        '            KÜP KOY',
        '        TEKRAR SONU',
        '        kat ← kat × 2',
        '    TEKRAR SONU',
        '    6 KEZ TEKRARLA',
        '        kat ← kat × 2',
        '    TEKRAR SONU',
        'BİTİR',
      ].join('\n')
    );
  });

  it('7–8. sınıf: soru ve tahmin cevapları giriş kutusuna yazılabilir (0 ya da pozitif tam sayı, en çok 5 hane)', () => {
    for (const u of [...SINIF7, ...SINIF8]) {
      for (const g of u.gorevler) {
        const iz = calistir(g.tur === 'tahmin' ? (g.baslangic as Program) : g.cozum, g.dunya, g.hedef);
        for (const s of [g.soru, g.tahmin]) {
          if (!s) continue;
          const c = s.cevap(iz);
          expect(Number.isInteger(c) && c >= 0 && c <= 99999, `${g.id}: ${c}`).toBe(true);
        }
      }
    }
  });
});
