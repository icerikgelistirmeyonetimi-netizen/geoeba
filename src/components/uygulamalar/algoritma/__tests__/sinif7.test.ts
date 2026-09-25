import { describe, expect, it } from 'vitest';
import { SINIF7 } from '../sinif7';
import { calistir } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import { sozdeKod, type Program } from '../program';
import type { Gorev } from '../gorev';
import { uniteleriDenetle } from './uniteDenetimi';

const gorev = (id: string): Gorev => {
  for (const u of SINIF7) {
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
  's7-ifade-4': 'ham 3 olmalıydı; program bitince 4 oldu.',
  's7-denklem-3': '7. saksıya gelince depoda yetecek su kalmadı: 1 litre var, bir sulama 2 litre.',
  's7-prizma-3': 'Dron küpü yanlış yere koydu; burada küp olmayacaktı.',
  's7-yansima-3': 'Robot şekilde olmayan bir çizgi çizdi; aynadaki çizgiyle eşleşmiyor.',
  's7-yansima-4': 'Robot şekilde olmayan bir çizgi çizdi; aynadaki çizgiyle eşleşmiyor.',
};

describe('7. sınıf', () => {
  it('ortak denetim: dört ünite kurallara uyar', () => {
    expect(SINIF7.map((u) => u.id)).toEqual(['s7-ifade', 's7-denklem', 's7-prizma', 's7-yansima']);
    expect(SINIF7.map((u) => u.no)).toEqual([1, 2, 3, 4]);
    uniteleriDenetle(SINIF7);
    const ids = SINIF7.flatMap((u) => u.gorevler.map((g) => g.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of SINIF7) {
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
    const hatalar = SINIF7.flatMap((u) => u.gorevler.filter((g) => g.tur === 'hata').map((g) => g.id));
    expect(hatalar.sort()).toEqual(Object.keys(HATA_ILETILERI).sort());
    for (const [id, ileti] of Object.entries(HATA_ILETILERI)) expect(hazirIleti(gorev(id)), id).toBe(ileti);
  });

  it('yeni kurgular önceki çözümü nerede bozuyor', () => {
    expect(oncekiIleti('s7-denklem-1', gorev('s7-denklem-2'))).toBe('sulanan 6 olmalıydı; program bitince 7 oldu.');
    expect(oncekiIleti('s7-denklem-3', gorev('s7-denklem-4'))).toBe('2. saksının toprağı zaten nemliydi; su taştı.');
    expect(oncekiIleti('s7-prizma-1', gorev('s7-prizma-2'))).toBe('Yapıda 12 küp eksik (8 kulede).');
    expect(oncekiIleti('s7-prizma-3', gorev('s7-prizma-4'))).toBe('Bu kule 2 küp olmalı; fazladan küp kondu.');
    expect(oncekiIleti('s7-yansima-1', gorev('s7-yansima-2'))).toBe('Robot sahanın kenarına geldi; daha ileri gidemez.');
    // Hazır kodlu "Kodu yaz" görevleri de eksik başlar
    expect(hazirIleti(gorev('s7-prizma-1'))).toBe('Yapıda 6 küp eksik (3 kulede).');
    expect(hazirIleti(gorev('s7-yansima-1'))).toBe('Şeklin 5 çizgisi eksik kaldı.');
  });

  it('başarı cümleleri matematiği izden hesaplar', () => {
    const cumle = (id: string) => gorev(id).basari(cozumIzi(gorev(id)));
    expect(cumle('s7-ifade-1')).toBe('Oldu! 5 kuru saksı × 2 litre = 10 litre. 20 − 10 = 10 litre kaldı.');
    expect(cumle('s7-ifade-2')).toBe('Oldu! 5 olgun + 3 ham = 8 domates. Sepette 5 domates var.');
    expect(cumle('s7-denklem-1')).toBe('Oldu! 9 saksı sulandı: 2 × 9 = 18 litre. 2x ≤ 18 eşitsizliğini sağlayan en büyük sayı x = 9.');
    expect(cumle('s7-denklem-2')).toBe('Oldu! 6 saksı × 2 litre + 3 litre yedek = 15 litre: 2x + 3 = 15.');
    expect(cumle('s7-denklem-3')).toBe('Buldun! 2x ≤ 13 ise x ≤ 6,5; saksı sayısı tam sayı: x = 6. Depoda 1 litre kaldı.');
    expect(cumle('s7-denklem-4')).toBe('Oldu! 7 kuru saksı × 2 litre = 14 litre. Su 10. saksıda bitti; nemli saksılar su harcamadı.');
    expect(cumle('s7-prizma-1')).toBe('Oldu! 3 × 2 × 2 = 12 küp: prizmanın hacmi 12 birim küp.');
    expect(cumle('s7-prizma-4')).toBe('Oldu! Önden 4 × 2, yandan 3 × 2 görünen prizma: 4 × 3 × 2 = 24 küp.');
    expect(cumle('s7-prizma-5')).toBe('Oldu! hacim = 2 × 3 × 4 = 24; dron da 24 küp koydu. Formül ile sayım aynı sonucu verdi.');
    expect(cumle('s7-yansima-1')).toBe('Oldu! Başlangıç noktası aynaya 3 birim uzaktı; görüntüsü de öbür yanda 3 birim uzakta. Robot 6 birim çizmeden gitti, 5 çizgi çizdi.');
    expect(cumle('s7-yansima-4')).toBe('Buldun! Görüntüyü çizerken robot 2 kez sola, 1 kez sağa döndü; şekilde tam tersi vardı: 2 sağa, 1 sola.');
  });

  it('değişkenlerin son değerleri, tahmin ve soru cevapları', () => {
    expect(cozumIzi(gorev('s7-ifade-3')).son.degiskenler).toEqual({ olgun: 8, ham: 4 });
    expect(cozumIzi(gorev('s7-denklem-5')).son.degiskenler).toEqual({ sulanan: 8 });
    expect(cozumIzi(gorev('s7-prizma-5')).son.degiskenler).toEqual({ en: 2, boy: 3, yükseklik: 4, hacim: 24 });
    const t1 = gorev('s7-ifade-1');
    expect(t1.tahmin!.cevap(calistir(t1.baslangic as Program, t1.dunya, t1.hedef))).toBe(10);
    const t2 = gorev('s7-denklem-5');
    expect(t2.tahmin!.cevap(calistir(t2.baslangic as Program, t2.dunya, t2.hedef))).toBe(8);
    expect(gorev('s7-ifade-3').soru!.cevap(cozumIzi(gorev('s7-ifade-3')))).toBe(2);
    expect(gorev('s7-denklem-2').soru!.cevap(cozumIzi(gorev('s7-denklem-2')))).toBe(6);
    expect(gorev('s7-prizma-1').soru!.cevap(cozumIzi(gorev('s7-prizma-1')))).toBe(30);
    expect(gorev('s7-prizma-4').soru!.cevap(cozumIzi(gorev('s7-prizma-4')))).toBe(12);
  });

  it('okuma görevleri akış şeması ve sözde kodla açılır; sözde kodda hata görünür', () => {
    expect(gorev('s7-ifade-1').ilkGorunum).toBe('akis');
    expect(gorev('s7-ifade-4').ilkGorunum).toBe('sozde');
    expect(sozdeKod(gorev('s7-ifade-4').baslangic as Program)).toBe(
      [
        'BAŞLA',
        '    olgun ← 0',
        '    ham ← 0',
        '    ÇIKIŞA VARANA KADAR TEKRARLA',
        '        İLERİ GİT',
        '        EĞER domates kırmızı İSE',
        '            TOPLA',
        '            olgun ← olgun + 1',
        '        DEĞİLSE',
        '            ham ← ham + 1',
        '        EĞER SONU',
        '    TEKRAR SONU',
        'BİTİR',
      ].join('\n')
    );
    expect(sozdeKod(gorev('s7-denklem-5').baslangic as Program)).toBe(
      ['BAŞLA', '    sulanan ← 0', '    depo ≤ 5 OLANA KADAR TEKRARLA', '        İLERİ GİT', '        SULA', '        sulanan ← sulanan + 1', '    TEKRAR SONU', 'BİTİR'].join('\n')
    );
  });
});
