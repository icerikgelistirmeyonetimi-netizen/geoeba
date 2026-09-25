import { describe, expect, it } from 'vitest';
import { calistir } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import type { Program } from '../program';
import { SINIF3 } from '../sinif3';
import type { Gorev } from '../gorev';
import { uniteleriDenetle } from './uniteDenetimi';

const gorevler = SINIF3.flatMap((u) => u.gorevler);
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

describe('3. sınıf: ortak kurallar', () => {
  it('ortak denetim: bütün üniteler kurallara uyar', () => uniteleriDenetle(SINIF3));

  it('üç yeni ünite (Bak ve karar ver 4. ünite olarak ayrıca gelir); blok görünümü, Mucit adası', () => {
    expect(SINIF3.map((u) => [u.id, u.no, u.kalip])).toEqual([
      ['s3-izle', 1, 'izle'],
      ['s3-simetri', 2, 'ayna'],
      ['s3-kadar', 3, 'bitene-kadar'],
    ]);
    for (const u of SINIF3) {
      expect(u.sinif).toBe(3);
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
        if (g.dunya.harita) expect(g.dunya.adimIzi, g.id).toBe(false);
      }
    }
    const ids = gorevler.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('metinlerde emoji yok', () => {
    const metin = JSON.stringify(SINIF3) + gorevler.map((g) => g.basari(cozumIzi(g))).join(' ');
    expect(/\p{Extended_Pictographic}/u.test(metin)).toBe(false);
  });

  it('bitene kadar ünitesinde karar bloğu yok', () => {
    const u = SINIF3.find((x) => x.id === 's3-kadar')!;
    for (const g of u.gorevler) expect(g.aracKutusu.some((a) => a.tur === 'eger'), g.id).toBe(false);
  });

  it('simetri sahaları: ayna çizili, öbür yarı gizli, hedef çizimi tamamlamak', () => {
    const u = SINIF3.find((x) => x.id === 's3-simetri')!;
    for (const g of u.gorevler) {
      expect(g.dunya.eksen, g.id).toBeTruthy();
      expect(g.dunya.hedefGizli, g.id).toBe(true);
      expect(g.hedef).toEqual({ cizimiTamamla: true, cikistaBitir: false });
    }
  });
});

describe('3. sınıf: hatayı bul iletileri (çocuğun okuduğu cümle)', () => {
  const beklenen: Record<string, string> = {
    's3-izle-5': 'Robot çıkışta suladı; orada saksı yok, su boşa aktı.',
    's3-izle-6': '5. saksıya gelince depoda su kalmadı.',
    's3-simetri-4': 'Robot şekilde olmayan bir çizgi çizdi; aynadaki çizgiyle eşleşmiyor.',
    's3-kadar-4': 'Robot çıkışta suladı; orada saksı yok, su boşa aktı.',
    's3-kadar-6': 'Robot 20 turdur yerinden kıpırdamadı. Döngü hiç bitmeyecek gibi görünüyor.',
  };

  it('her hatayı bul görevi listede', () => {
    expect(gorevler.filter((g) => g.tur === 'hata').map((g) => g.id)).toEqual(Object.keys(beklenen));
  });

  for (const [id, cumle] of Object.entries(beklenen)) {
    it(id, () => expect(baslangicIletisi(gorev(id))).toBe(cumle));
  }
});

describe('3. sınıf: hazır kodlar ve önceki kodlar', () => {
  it('yönergeyi izle: 12 litrelik depo 6 saksıya yeter; önceki kod 8 saksılık serada bozulur', () => {
    expect(oncekiIletisi('s3-izle-4')).toBe('Robot çıkışa varamadı; 8. saksıya hiç uğramadı. 7. saksı susuz kaldı.');
  });

  it('simetri: sol yarının kodu aynı yarının üstünden geçer; önceki kod öbür yanda sapar', () => {
    expect(baslangicIletisi(gorev('s3-simetri-1'))).toBe('Şeklin 3 çizgisi eksik kaldı.');
    expect(oncekiIletisi('s3-simetri-2')).toBe('Robot şekilde olmayan bir çizgi çizdi; aynadaki çizgiyle eşleşmiyor.');
  });

  it('bitene kadar: "kez" kodu uzun sırada eksik kalır; sulamasız yürüyüş kuru saksıları bırakır', () => {
    expect(baslangicIletisi(gorev('s3-kadar-1'))).toBe('Robot çıkışa varamadı; 5., 6. ve 7. saksıya hiç uğramadı.');
    expect(oncekiIletisi('s3-kadar-3')).toBe('1., 2., 3. ve 4. saksı susuz kaldı.');
    expect(oncekiIletisi('s3-kadar-2')).toBe('Program bu dünyada doğru çalıştı.');
    expect(oncekiIletisi('s3-kadar-5')).toBe('Program bu dünyada doğru çalıştı.');
  });
});

describe('3. sınıf: tahminler, sorular ve başarı cümleleri', () => {
  it('tahmin et: 4 × 2 = 8 litre harcanır; 20 − 6 = 14 litre kalır', () => {
    const t1 = gorev('s3-izle-1');
    const t2 = gorev('s3-izle-2');
    expect(t1.baslangic).toBe(t1.cozum);
    expect(t1.tahmin?.cevap(calistir(t1.baslangic as Program, t1.dunya, t1.hedef))).toBe(8);
    expect(t2.tahmin?.cevap(calistir(t2.baslangic as Program, t2.dunya, t2.hedef))).toBe(14);
    expect(t1.basari(cozumIzi(t1))).toBe('Doğru! 4 saksı × 2 litre = 8 litre su harcandı.');
    expect(t2.basari(cozumIzi(t2))).toBe('Doğru! 3 × 2 = 6 litre harcandı; 20 − 6 = 14 litre kaldı.');
  });

  it('sorular: depo bölmesi, döngünün tur sayısı, simetri doğrusu sayısı', () => {
    const cevap = (id: string) => {
      const g = gorev(id);
      return g.soru?.cevap(cozumIzi(g));
    };
    expect(cevap('s3-izle-3')).toBe(10);
    expect(cevap('s3-kadar-2')).toBe(3);
    expect(cevap('s3-kadar-5')).toBe(15);
    expect(cevap('s3-simetri-5')).toBe(2);
  });

  it('başarı cümleleri matematiği izden hesaplar', () => {
    const cumle = (id: string) => gorev(id).basari(cozumIzi(gorev(id)));
    expect(cumle('s3-izle-3')).toBe('Oldu! 6 saksı × 2 litre = 12 litre. Depo tam yetti: 12 ÷ 2 = 6.');
    expect(cumle('s3-izle-6')).toBe('Buldun! 4 × 2 = 8 litre: depodaki 8 litrenin hepsi kuru saksılara gitti.');
    expect(cumle('s3-simetri-3')).toBe('Oldu! Evin iki yarısı eş: her yarıda 7 çizgi, bütün evde 7 + 7 = 14 çizgi.');
    expect(cumle('s3-kadar-4')).toBe('Buldun! 7 saksı için 8 adım: adım sayısı saksı sayısından 1 fazla. Çıkış sulanmadı.');
    expect(cumle('s3-kadar-5')).toBe('Oldu! Kod saymadan 10 saksıyı suladı: 10 × 2 = 20 litre, depo tam yetti.');
  });
});
