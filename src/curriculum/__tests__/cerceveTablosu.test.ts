import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { curriculumData } from '@/curriculum/curriculumData';
import type { Grade, Topic } from '@/types/curriculum';

/**
 * Müfredat verisi (konu = içerik çerçevesi) ile `scripts/veri/cerceve-kazanim-eslemesi.json` tablosunun tutarlılığı
 * ve alan uzmanlarının 2. tur (2026-10-06) platform istekleri: tema/çerçeve sırası, birleştirme/kaldırma, yeni
 * çerçeveler, bölünen modüllerin çerçeve → dosya eşlemesi.
 */
interface TabloSatiri {
  cerceve: string;
  kazanimlar: string[];
  dosyalar?: string[];
}
const tablo = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../../scripts/veri/cerceve-kazanim-eslemesi.json'), 'utf8'),
) as { cerceveler: Record<string, TabloSatiri>; kazanimlar: Record<string, { metin: string; tema: string }> };

const butunSiniflar: Grade[] = Object.values(curriculumData.levels).flatMap((l) => l.grades);
const sinif = (no: number) => butunSiniflar.find((g) => g.gradeNumber === no)!;
const butunKonular: Topic[] = butunSiniflar.flatMap((g) => g.themes.flatMap((t) => t.topics));
const temaAdlari = (no: number) =>
  [...sinif(no).themes].sort((a, b) => a.orderNumber - b.orderNumber).map((t) => t.themeName);
const konuAdlari = (no: number, temaId: string) => sinif(no).themes.find((t) => t.id === temaId)!.topics.map((k) => k.title);

describe('çerçeve tablosu ↔ müfredat', () => {
  it('her konunun tabloda satırı var, tabloda fazla satır yok, adlar aynı', () => {
    const kodlar = butunKonular.map((k) => k.code!);
    expect(new Set(kodlar).size).toBe(kodlar.length);
    expect(Object.keys(tablo.cerceveler).sort()).toEqual([...kodlar].sort());
    for (const k of butunKonular) expect(tablo.cerceveler[k.code!].cerceve, k.code).toBe(k.title);
  });

  it('konu kimlikleri tekil; tablodaki her kazanımın MEB metni var', () => {
    const idler = butunKonular.map((k) => k.id);
    expect(new Set(idler).size).toBe(idler.length);
    for (const s of Object.values(tablo.cerceveler)) {
      expect(s.kazanimlar.length).toBeGreaterThan(0);
      for (const kod of s.kazanimlar) expect(tablo.kazanimlar[kod], kod).toBeDefined();
    }
  });

  it('bir kazanım birden çok çerçevedeyse sayfalar `dosyalar` ile ayrılmıştır (bilinçli istisnalar hariç)', () => {
    // 7.4.10 (daire + eşkenar dörtgen/yamuk problemleri) ve 8.3.6 (açı-kenar, eşitsizlik, Pisagor problemleri)
    // birden çok çerçevenin konusunu kapsar; uzmanlar bölme istemedi.
    const istisna = new Set(['MAT.7.4.10', 'MAT.8.3.6']);
    const cerceveleri = new Map<string, string[]>();
    for (const [kod, s] of Object.entries(tablo.cerceveler)) {
      for (const k of s.kazanimlar) cerceveleri.set(k, [...(cerceveleri.get(k) ?? []), kod]);
    }
    for (const [kazanim, cerceveler] of cerceveleri) {
      if (cerceveler.length < 2 || istisna.has(kazanim)) continue;
      const dosyalar = cerceveler.map((c) => tablo.cerceveler[c].dosyalar);
      expect(dosyalar.every(Boolean), `${kazanim}: ${cerceveler.join(', ')}`).toBe(true);
      const hepsi = dosyalar.flat();
      expect(new Set(hepsi).size, kazanim).toBe(hepsi.length);
    }
  });
});

describe('alan uzmanları 2. tur: platform istekleri', () => {
  it('1. sınıf temaları MEB sırasında', () => {
    expect(temaAdlari(1)).toEqual([
      'SAYILAR VE NİCELİKLER (1)',
      'SAYILAR VE NİCELİKLER (2)',
      'SAYILAR VE NİCELİKLER (3)',
      'İŞLEMLERDEN CEBİRSEL DÜŞÜNMEYE',
      'NESNELERİN GEOMETRİSİ (1)',
      'NESNELERİN GEOMETRİSİ (2)',
      'VERİYE DAYALI ARAŞTIRMA',
    ]);
  });

  it('3. sınıf «İşlemlerden Cebirsel Düşünmeye» çerçeveleri öğrenme çıktısı sırasında', () => {
    const ilkKazanim = sinif(3)
      .themes.find((t) => t.id === 'theme-3-3')!
      .topics.map((k) => tablo.cerceveler[k.code!].kazanimlar[0]);
    const no = (kod: string) => Number(kod.split('.').at(-1));
    for (let i = 1; i < ilkKazanim.length; i++) expect(no(ilkKazanim[i])).toBeGreaterThanOrEqual(no(ilkKazanim[i - 1]));
  });

  it('bölünen modüllerde her çerçeve kendi dosyasını gösterir', () => {
    const beklenen: Record<string, string> = {
      'MAT.1.2.1': 'MAT.1.1.1-a.html',
      'MAT.1.2.2': 'MAT.1.1.1-v2-a.html',
      'MAT.2.3.5': 'MAT.2.2.4-a.html',
      'MAT.2.3.6': 'MAT.2.2.4-v2-a.html',
      'MAT.3.2.7': 'MAT.3.1.15-a.html',
      'MAT.3.2.8': 'MAT.3.1.15-v2-a.html',
      'MAT.3.3.3': 'MAT.3.2.5-a.html',
      'MAT.3.3.6': 'MAT.3.2.5-v2-a.html',
      'MAT.4.1.3': 'MAT.4.1.3-a.html',
      'MAT.4.1.4': 'MAT.4.1.3-v2-a.html',
      'MAT.4.2.8': 'MAT.4.1.13-a.html',
      'MAT.4.2.9': 'MAT.4.1.13-v2-a.html',
      'MAT.4.3.2': 'MAT.4.2.2-a.html',
      'MAT.4.3.3': 'MAT.4.2.2-v2-a.html',
      'MAT.4.3.6': 'MAT.4.2.5-a.html',
      'MAT.4.3.7': 'MAT.4.2.5-v2-a.html',
    };
    for (const [kod, dosya] of Object.entries(beklenen)) expect(tablo.cerceveler[kod].dosyalar, kod).toEqual([dosya]);
    expect(tablo.cerceveler['MAT.4.3.8'].kazanimlar).toEqual(['MAT.4.2.6', 'MAT.4.2.7']);
  });

  it('kaldırılan çerçeveler yok', () => {
    for (const kod of ['MAT.2.3.3', 'MAT.5.2.2', 'MAT.5.6.2', 'MAT.10.5.2', 'MAT.10.5.3', 'MAT.10.6.2', 'MAT.10.7.1', 'MAT.12.2.2', 'MAT.12.7.1', 'MAT.12.8.2']) {
      expect(tablo.cerceveler[kod], kod).toBeUndefined();
      expect(butunKonular.some((k) => k.code === kod), kod).toBe(false);
    }
  });

  it('6. sınıf: her öğrenme çıktısı kendi başlığında', () => {
    expect(tablo.cerceveler['MAT.6.1.1'].kazanimlar).toEqual(['MAT.6.1.1']);
    expect(tablo.cerceveler['MAT.6.1.4'].kazanimlar).toEqual(['MAT.6.1.4']);
    expect(tablo.cerceveler['MAT.6.5.2'].kazanimlar).toEqual(['MAT.6.3.2']);
    expect(tablo.cerceveler['MAT.6.5.3'].kazanimlar).toEqual(['MAT.6.3.3']);
    expect(tablo.cerceveler['MAT.6.5.4'].kazanimlar).toEqual(['MAT.6.3.4']);
  });

  it('7. sınıf «Daire ve Daire Diliminin Alanı» «Eşkenar Dörtgen ve Yamuk»tan önce', () => {
    expect(konuAdlari(7, 'theme-7-9')).toEqual(['Daire ve Daire Diliminin Alanı', 'Eşkenar Dörtgen ve Yamuk']);
  });

  it('10-12. sınıf çerçeveleri TYMM (MEB 19.09) içerik çerçevesi adlarıyla', () => {
    expect(konuAdlari(10, 'theme-10-5')).toEqual(['Sayma Stratejileri', 'Cebirsel ve Fonksiyonel İşlemlerin Algoritmik Yapısı']);
    expect(tablo.cerceveler['MAT.10.5.4'].kazanimlar).toEqual(['MAT.10.5.2']);
    expect(konuAdlari(10, 'theme-10-6')).toEqual([
      'Dik Koordinat Sisteminde Noktanın Analitik İncelenmesi',
      'Dik Koordinat Sisteminde Doğrunun Analitik İncelenmesi',
    ]);
    expect(konuAdlari(10, 'theme-10-7')).toEqual(['Koşullu Olasılık', 'Bayes Teoremi']);
    expect(konuAdlari(11, 'theme-11-1')).toEqual([
      'İki Nicel Değişkenli Veriler',
      'Başkaları Tarafından Oluşturulan İki Nicel Değişkenli Verileri İnceleme',
    ]);
    expect(konuAdlari(11, 'theme-11-2')).toEqual([
      'Dörtgenlerin Özellikleri',
      'Özel Dörtgenler Arasındaki İlişkiler',
      'Çokgenlerin Sınıflandırılması',
      'Dışbükey Çokgenlerin Özellikleri',
      'Çokgenlerle İlgili Problemler',
    ]);
    expect(konuAdlari(11, 'theme-11-4')).toEqual([
      'Üstel Fonksiyonlar ve Nitel Özellikleri',
      'Üstel Fonksiyonların Ters Fonksiyonları',
      'Logaritmik Fonksiyonlar ve Nitel Özellikleri',
      'Üstel ve Logaritmik Fonksiyonlarla İfade Edilebilen Denklem ve Eşitsizlikler İçeren Problemler',
    ]);
    expect(konuAdlari(11, 'theme-11-5')).toEqual(['Bileşke Fonksiyon', 'Fonksiyonlarda Dört İşlem']);
    expect(temaAdlari(12).slice(0, 2)).toEqual(['NİCELİKLER VE DEĞİŞİMLER (1)', 'NİCELİKLER VE DEĞİŞİMLER (2)']);
    const ilkTema = [...sinif(12).themes].sort((a, b) => a.orderNumber - b.orderNumber)[0];
    expect(ilkTema.topics.map((k) => k.title)).toEqual(['Aritmetik ve Geometrik Diziler', 'Gerçek Sayı Dizileri']);
    expect(konuAdlari(12, 'theme-12-5')).toEqual([
      'Grafik Temsili Verilen Fonksiyonların Limiti',
      'Cebirsel Temsili Verilen Fonksiyonların Limiti',
      'Fonksiyonların Limitinde Belirsizlik Durumları',
      'Fonksiyonların Sürekliliği',
    ]);
    expect(konuAdlari(12, 'theme-12-7')).toEqual(['Türevin Geometrik Yorumu', 'Türev Uygulamaları']);
    expect(konuAdlari(12, 'theme-12-8')).toEqual(['Toplumsal ve Bilimsel Durumlara İlişkin Hazır Veriler']);
  });

  it('11-12. sınıf konularında öğrenme çıktısı metni dolu ve tablodaki kazanımlarla aynı', () => {
    for (const no of [11, 12]) {
      for (const t of sinif(no).themes) {
        for (const k of t.topics) {
          const kodlar = tablo.cerceveler[k.code!].kazanimlar;
          expect(k.learningOutcomes, k.code).toEqual(kodlar.map((kod) => `${kod}. ${tablo.kazanimlar[kod].metin}`));
        }
      }
    }
  });
});
