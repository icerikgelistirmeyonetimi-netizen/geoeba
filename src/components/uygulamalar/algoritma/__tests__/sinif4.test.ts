import { describe, expect, it } from 'vitest';
import { calistir } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import { blokSayisi, type Program } from '../program';
import { SINIF4 } from '../sinif4';
import type { Gorev } from '../gorev';
import { uniteleriDenetle } from './uniteDenetimi';

const gorevler = SINIF4.flatMap((u) => u.gorevler);
const gorev = (id: string): Gorev => {
  const g = gorevler.find((x) => x.id === id);
  if (!g) throw new Error(id);
  return g;
};
/** Hazır kodu çalıştırınca çocuğun okuduğu cümle */
const baslangicIletisi = (g: Gorev) => sonucIletisi(calistir(g.baslangic as Program, g.dunya, g.hedef).sonuc, g.dunya, g.bitkiAdi);
const cozumIzi = (g: Gorev) => calistir(g.cozum, g.dunya, g.hedef);
/** Önceki görevin çözümü bu görevin dünyasında */
const oncekiIletisi = (id: string) => {
  const i = gorevler.findIndex((g) => g.id === id);
  const g = gorevler[i];
  return sonucIletisi(calistir(gorevler[i - 1].cozum, g.dunya, g.hedef).sonuc, g.dunya, g.bitkiAdi);
};

describe('4. sınıf: ortak kurallar', () => {
  it('ortak denetim: bütün üniteler kurallara uyar', () => uniteleriDenetle(SINIF4));

  it('dört ünite; blok görünümü, Mucit adası', () => {
    expect(SINIF4.map((u) => [u.id, u.no, u.kalip])).toEqual([
      ['s4-aci', 1, 'dondur'],
      ['s4-sekil', 2, 'sekil'],
      ['s4-icice', 3, 'ic-ice'],
      ['s4-simetri', 4, 'ayna-uzaklik'],
    ]);
    for (const u of SINIF4) {
      expect(u.sinif).toBe(4);
      expect(u.kademe).toBe('Mucit adası');
      expect(u.gorunum).toBe('blok');
      expect(u.sesliYonerge).toBe(false);
      expect(u.gorevler.length, u.id).toBeGreaterThanOrEqual(4);
      expect(u.gorevler.length, u.id).toBeLessThanOrEqual(6);
      expect(u.ogretmenNotu.yanilgilar.length, u.id).toBeGreaterThanOrEqual(2);
      expect(u.ogretmenNotu.sorular.length, u.id).toBeGreaterThanOrEqual(3);
      for (const g of u.gorevler) {
        expect(g.id.startsWith(`${u.id}-`), g.id).toBe(true);
        expect(g.ipuclari.length, g.id).toBeGreaterThanOrEqual(1);
        expect(g.ipuclari.length, g.id).toBeLessThanOrEqual(3);
        if (g.dunya.harita && !g.dunya.insaat) expect(g.dunya.adimIzi, g.id).toBe(false);
      }
    }
    const ids = gorevler.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('metinlerde emoji yok', () => {
    const metin = JSON.stringify(SINIF4) + gorevler.map((g) => g.basari(cozumIzi(g))).join(' ');
    expect(/\p{Extended_Pictographic}/u.test(metin)).toBe(false);
  });

  it('simetri karoları: hedef gizli, ayna çizili, boya dünyası', () => {
    const u = SINIF4.find((x) => x.id === 's4-simetri')!;
    for (const g of u.gorevler) {
      expect(g.dunya.hedefGizli, g.id).toBe(true);
      expect(g.dunya.boyaTuru, g.id).toBe('boya');
      expect(g.dunya.eksen, g.id).toBeTruthy();
    }
  });
});

describe('4. sınıf: hatayı bul iletileri (çocuğun okuduğu cümle)', () => {
  const beklenen: Record<string, string> = {
    's4-aci-3': 'Robot şekilde olmayan bir çizgi çizdi.',
    's4-aci-6': 'Şeklin 2 çizgisi eksik kaldı.',
    's4-sekil-3': 'Şeklin 3 çizgisi eksik kaldı.',
    's4-sekil-5': 'Robot şekilde olmayan bir çizgi çizdi.',
    's4-icice-4': 'Dron küpü yanlış yere koydu; burada küp olmayacaktı.',
    's4-icice-6': 'Şeklin 9 çizgisi eksik kaldı.',
    's4-simetri-3': 'Robot boyanmayacak bir kareyi boyadı; aynadaki kareyle eşleşmiyor.',
    's4-simetri-5': 'Robot boyanmayacak bir kareyi boyadı; aynadaki kareyle eşleşmiyor.',
  };

  it('her hatayı bul görevi listede', () => {
    expect(gorevler.filter((g) => g.tur === 'hata').map((g) => g.id)).toEqual(Object.keys(beklenen));
  });

  for (const [id, cumle] of Object.entries(beklenen)) {
    it(id, () => expect(baslangicIletisi(gorev(id))).toBe(cumle));
  }
});

describe('4. sınıf: hazır kodlar, blok sınırı ve önceki kodlar', () => {
  it('üç sağa dönüş doğru çizer ama blok sınırını aşar; tek sola dönüş sığar', () => {
    const g = gorev('s4-aci-4');
    expect(baslangicIletisi(g)).toBe('Program bu dünyada doğru çalıştı.');
    expect(blokSayisi(g.baslangic as Program)).toBe(7);
    expect(blokSayisi(g.cozum)).toBeLessThanOrEqual(g.enCokBlok!);
  });

  it('blok sınırı tekrarsız kodu dışarıda bırakır', () => {
    for (const id of ['s4-sekil-1', 's4-sekil-4', 's4-icice-1', 's4-icice-5']) {
      const g = gorev(id);
      expect(g.enCokBlok, id).toBeDefined();
      expect(blokSayisi(g.cozum), id).toBeLessThanOrEqual(g.enCokBlok!);
    }
  });

  it('önceki çözümler yeni kurguda bozulur', () => {
    expect(oncekiIletisi('s4-aci-2')).toBe('Robot şekilde olmayan bir çizgi çizdi.');
    expect(oncekiIletisi('s4-sekil-2')).toBe('Robot şekilde olmayan bir çizgi çizdi.');
    expect(oncekiIletisi('s4-icice-2')).toBe('Bu kule 2 küp olmalı; fazladan küp kondu.');
    expect(oncekiIletisi('s4-simetri-2')).toBe('1 kare boyanmadı.');
  });
});

describe('4. sınıf: tahminler, sorular ve başarı cümleleri', () => {
  it('tahmin et: tam tur 360°, çevre 8 birim, iç döngü 3 × 4 = 12 kez', () => {
    const tahmin = (id: string) => {
      const g = gorev(id);
      expect(g.baslangic, id).toBe(g.cozum);
      return g.tahmin?.cevap(calistir(g.baslangic as Program, g.dunya, g.hedef));
    };
    expect(tahmin('s4-aci-5')).toBe(360);
    expect(tahmin('s4-sekil-6')).toBe(8);
    expect(tahmin('s4-icice-3')).toBe(12);
  });

  it('sorular: derece, çevre, küp, çizgi örüntüsü, simetri doğrusu', () => {
    const cevap = (id: string) => {
      const g = gorev(id);
      return g.soru?.cevap(cozumIzi(g));
    };
    expect(cevap('s4-aci-1')).toBe(90);
    expect(cevap('s4-aci-2')).toBe(180);
    expect(cevap('s4-aci-4')).toBe(270);
    expect(cevap('s4-sekil-1')).toBe(12);
    expect(cevap('s4-sekil-2')).toBe(16);
    expect(cevap('s4-sekil-4')).toBe(12);
    expect(cevap('s4-icice-1')).toBe(9);
    expect(cevap('s4-icice-5')).toBe(13);
    expect(cevap('s4-simetri-4')).toBe(2);
  });

  it('başarı cümleleri matematiği izden hesaplar', () => {
    const cumle = (id: string) => gorev(id).basari(cozumIzi(gorev(id)));
    expect(cumle('s4-aci-1')).toBe('Oldu! Robot köşede döndü: 1 × 90° = 90°. Köşedeki açı bir dik açı.');
    expect(cumle('s4-aci-5')).toBe('Doğru! 4 × 90° = 360°: robot bir tam tur döndü ve yine başladığı yöne bakıyor.');
    expect(cumle('s4-sekil-1')).toBe('Oldu! 4 kenar × 3 birim = 12 birim: karenin çevresi 12 birim.');
    expect(cumle('s4-sekil-6')).toBe('Doğru! Bir turda 3 + 1 = 4 birim, 2 turda 2 × 4 = 8 birim: çevre 8 birim.');
    expect(cumle('s4-icice-3')).toBe('Doğru! Dış döngü 3 tur × iç döngü 4 kez = 12 küp.');
    expect(cumle('s4-icice-5')).toBe('Oldu! İç döngü 3 × 4 = 12 kez çalıştı. Ortak kenarlar iki kez çizildiği için sahada 10 çizgi var.');
    expect(cumle('s4-simetri-5')).toBe('Buldun! Üstteki karolar çizgiye 2 sıra uzak; simetrikleri de 2 sıra uzakta. 2 karo boyandı.');
  });
});
