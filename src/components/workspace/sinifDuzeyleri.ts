/**
 * Sınıf düzeyi → araç paneli eşlemesi (menü çubuğundaki "Sınıf" menüsü).
 *
 * Öğretmen bir sınıf seçtiğinde sol araç paneli (ağaç liste, "Ara" sekmesi ve menü çubuğundaki
 * Araçlar menüsü) yalnızca o sınıfın matematik kazanımlarının gerektirdiği araçları gösterir.
 * Varsayılan "Tüm araçlar"dır: hiçbir şey gizlenmez.
 *
 * Yalnız PANEL süzülür. Yazılı / sesli komutlar ("Yazarak komut ver") ve klavye kısayolları her
 * sınıfta bütün araçlarla çalışmaya devam eder; bu modül yalnızca görünürlüğü söyler.
 *
 * Kaynaklar:
 *  - Türkiye Yüzyılı Maarif Modeli (TYMM, 2024) matematik öğretim programları, tymm.meb.gov.tr.
 *    Yorumlardaki kodlar programın resmî öğrenme çıktısı kodlarıdır (metinleri:
 *    scripts/veri/kazanim-metinleri.json). Projedeki müfredat verisi temaları farklı numaralar;
 *    kodları oraya göre değil programa göre okuyun.
 *  - 2026-2027 öğretim yılında TYMM 1, 2, 3, 5, 6, 7, 9, 10 ve 11. sınıflarda uygulanır; 4, 8 ve 12.
 *    sınıflar bir yıl daha 2018 programını (mufredat.meb.gov.tr) izler ve 2027-2028'de TYMM'ye
 *    geçer. Bu üç sınıfın listesi iki programın kazanımlarını BİRLİKTE karşılar.
 *
 * Kural: her sınıf, kazanımlarının gerektirdiği HER aracı kendisi listeler (5. sınıf da nokta ve
 * doğru parçası ister); "önceki sınıfların hepsi" gibi birikimli bir kural yoktur. Seç ve Taşı,
 * Sil ve Yazı Ekle kazanımdan bağımsızdır ve her sınıfta açık kalır (HER_SINIFTA_ACIK_ARACLAR).
 * El (kaydırma) aracı panelde değil tuval şeridindedir; geri al / yinele de panel aracı değildir.
 */
import type { ToolMode } from '@/types/workspace';

export const SINIF_NUMARALARI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type SinifNo = (typeof SINIF_NUMARALARI)[number];
/** 'tum': süzgeç yok, paneldeki bütün araçlar görünür. */
export type SinifDuzeyi = 'tum' | SinifNo;

export const VARSAYILAN_SINIF_DUZEYI: SinifDuzeyi = 'tum';

/** Seçim tarayıcıya özgü bir arayüz tercihidir: localStorage'da bu anahtarla saklanır (proje dosyasına girmez). */
export const SINIF_DUZEYI_ANAHTARI = 'geoeba_sinif_duzeyi_v1';

/** Kazanımdan bağımsız, her sınıfta açık kalan araçlar: seçip taşımak, silmek, soru / ad / açıklama yazmak. */
export const HER_SINIFTA_ACIK_ARACLAR: readonly ToolMode[] = ['select', 'delete', 'text'];

/** Görünür araç sayısı bu sınırı aşmıyorsa sınıf seçilince bütün gruplar açık gelir (1-3. sınıf: hepsi tek bakışta). */
export const ACIK_GRUP_SINIRI = 20;

export interface SinifTanimi {
  /** Menüde gösterilen kısa konu özeti */
  konular: string;
  /** Kazanımların gerektirdiği panel araçları (HER_SINIFTA_ACIK_ARACLAR ayrıca eklenir) */
  araclar: readonly ToolMode[];
}

export const SINIF_DUZEYLERI: Readonly<Record<SinifNo, SinifTanimi>> = {
  // 1. SINIF (TYMM) — Nesnelerin Geometrisi (1)-(2), Sayılar ve Nicelikler.
  // MAT.1.1.6 şekil örüntüleri · MAT.1.1.8 standart olmayan birimle uzunluk · MAT.1.3.1 mesafe ve yön ·
  // MAT.1.3.2 eşlik (Seç ve Taşı ile üst üste koyma) · MAT.1.3.3-1.3.4 nesne ve yapılardaki şekiller ·
  // MAT.1.3.5 üçgen, kare, dikdörtgen ve çemberi sınıflandırıp adlandırma.
  1: {
    konular: 'Konum ve yön, eşlik; üçgen, kare, dikdörtgen ve çember; standart olmayan birimle uzunluk ölçme',
    araclar: [
      'point', // hedef, konum, köşe (MAT.1.3.1, MAT.1.3.5)
      'circle', // çember (MAT.1.3.5)
      'pen', // hedefe giden yol, şekil örüntüsü (MAT.1.3.1, MAT.1.1.6)
      'unit_measure', // standart olmayan birimle uzunluk (MAT.1.1.8)
      'polygon', // üçgen (MAT.1.3.5)
      'rectangle', // dikdörtgen (MAT.1.3.5)
      'square', // kare (MAT.1.3.5)
      'image', // günlük yaşamdaki nesne ve yapı fotoğrafları (MAT.1.3.3, MAT.1.3.4)
    ],
  },

  // 2. SINIF (TYMM) — Nesnelerin Geometrisi (1)-(2), Sayılar ve Nicelikler (2).
  // MAT.2.1.5 şekil örüntüleri · MAT.2.1.7 bütün, yarım, çeyrek · MAT.2.1.10-2.1.11 standart uzunluk ölçme ·
  // MAT.2.3.1 nesneleri cisimlere göre sınıflandırma · MAT.2.3.3 şekillerle model · MAT.2.3.4 yön, konum ve
  // büyüklük değişince biçim korunur · MAT.2.3.6 mesafe ve yön · MAT.2.3.7 simetrik şekilleri ayırt etme.
  2: {
    konular: 'Şekillerle model oluşturma, yön ve konum değişimi, simetrik şekiller; bütün, yarım, çeyrek; cm ile ölçme',
    araclar: [
      'point', // konum ve hedef (MAT.2.3.6)
      'circle', // çember ve daire (MAT.2.3.3)
      'pen', // yol ve örüntü çizimi (MAT.2.3.6, MAT.2.1.5)
      'measure_distance', // standart birimle uzunluk (MAT.2.1.10, MAT.2.1.11)
      'unit_measure', // standart olmayan birimle karşılaştırma (MAT.2.1.10)
      'ruler', // cetvelle ölçme (MAT.2.1.11)
      'polygon', // üçgen ve şekil modelleri (MAT.2.3.3)
      'rectangle', // (MAT.2.3.3)
      'square', // (MAT.2.3.3)
      'rotate', // yön değişince biçim korunur (MAT.2.3.4)
      'symmetry', // simetrik şekilleri ayırt etme (MAT.2.3.7)
      'fraction', // bütün, yarım, çeyrek (MAT.2.1.7)
      'image', // günlük yaşamdaki nesneler (MAT.2.3.1)
    ],
  },

  // 3. SINIF (TYMM) — Nesnelerin Geometrisi (1)-(2), Sayılar ve Nicelikler (2).
  // MAT.3.1.7 şekil örüntüleri · MAT.3.1.9-3.1.11 bütün-yarım-çeyrek, birim kesir, pay ve payda ·
  // MAT.3.1.15 uzunluk birimleri · MAT.3.3.1 cisimlerin özellikleri · MAT.3.3.2 kenar sayısına göre şekiller
  // (üçgen, dörtgen, beşgen, altıgen, sekizgen) · MAT.3.3.3 araçla şekil çizme · MAT.3.3.4 çevre uzunluğu ·
  // MAT.3.3.6-3.3.8 simetri doğruları, simetrik şekli tamamlama, kodlama.
  3: {
    konular: 'Kenar sayısına göre çokgenler, şekil çizme, çevre uzunluğu, simetri doğrusu; birim kesirler',
    araclar: [
      'point',
      'segment', // kenar, köşegen, simetri doğrusu (MAT.3.3.2, MAT.3.3.3, MAT.3.3.7)
      'circle', // (MAT.3.3.3)
      'pen', // kodlamayla tamamlama (MAT.3.3.8)
      'measure_distance', // (MAT.3.1.15, MAT.3.3.4)
      'unit_measure', // standart olmayan birimle çevre (MAT.3.3.4)
      'measure_perimeter', // çevre uzunluğu (MAT.3.3.4)
      'ruler', // cetvelle çizme ve ölçme (MAT.3.3.3)
      'polygon', // (MAT.3.3.2)
      'rectangle', // (MAT.3.3.3)
      'square', // (MAT.3.3.3)
      'regular_polygon', // beşgen, altıgen, sekizgen ve simetri doğruları (MAT.3.3.2, MAT.3.3.6)
      'reflect', // simetri doğrusuna göre tamamlama (MAT.3.3.7)
      'symmetry', // birden çok simetri doğrusu (MAT.3.3.6)
      'fraction', // (MAT.3.1.9-3.1.11)
      'image', // cisimlerin fotoğrafları (MAT.3.3.1)
    ],
  },

  // 4. SINIF (2026-2027'de 2018 programı, 2027-2028'den TYMM; ikisi birlikte).
  // TYMM: MAT.4.1.6-4.1.12 kesirler · MAT.4.3.2 üçgen çeşitleri, kare-dikdörtgen · MAT.4.3.3 çevre ölçme ·
  // MAT.4.3.4 birim karelerle alan · MAT.4.3.5 açı bir dönme miktarı · MAT.4.3.6 standart açı ölçme aracı ·
  // MAT.4.3.7 dik açıya göre dar ve geniş · MAT.4.3.8-4.3.9 doğruya göre simetri · MAT.4.3.10 kodlama.
  // 2018: M.4.2.2.1-4.2.2.2 simetri doğrusu ve simetrik çizim · M.4.2.3.2 açıyı oluşturan ışınlar ve köşe ·
  // M.4.2.3.4-4.2.3.5 açıölçerle ölçme ve verilen açıyı oluşturma · M.4.3.2 çevre · M.4.3.3 alan (birimkare).
  4: {
    konular: 'Üçgen çeşitleri, çevre ve alan (birim kare), açı ve açıölçer, dik açı, doğruya göre simetri; kesirler',
    araclar: [
      'point',
      'segment', // kenar ve simetri doğrusu (MAT.4.3.2, M.4.2.2.1)
      'ray', // açının kolları (M.4.2.3.2)
      'circle', // silindir açınımı (MAT.4.3.1)
      'pen', // kodlama stratejileri (MAT.4.3.10)
      'measure_distance', // üçgen çeşitleri, uzunluk birimleri (MAT.4.3.2, MAT.4.1.13)
      'unit_measure', // standart olmayan birim (MAT.4.3.4)
      'measure_angle', // açıölçer (MAT.4.3.6, M.4.2.3.4, M.4.2.3.5)
      'angle', // açı oluşturma (MAT.4.3.5, M.4.2.3.2)
      'measure_area', // alan tahminini ölçümle karşılaştırma (MAT.4.3.4, M.4.3.3.2)
      'measure_perimeter', // (MAT.4.3.3, M.4.3.2)
      'area_model', // birim karelerle alan (MAT.4.3.4, M.4.3.3.1)
      'ruler', // (MAT.4.3.3)
      'setsquare', // dik açı referansı (MAT.4.3.7)
      'polygon',
      'rectangle', // kare-dikdörtgen ilişkisi, açınım (MAT.4.3.1, MAT.4.3.2)
      'square',
      'regular_polygon', // eşkenar üçgen (MAT.4.3.2)
      'rotate', // açı bir dönme miktarıdır (MAT.4.3.5)
      'reflect', // simetriğini çizme (MAT.4.3.9, M.4.2.2.2)
      'symmetry', // simetri doğrusu (MAT.4.3.8, M.4.2.2.1)
      'fraction', // (MAT.4.1.6-4.1.12)
      'image', // nesnelerde simetri (MAT.4.3.8)
    ],
  },

  // 5. SINIF (TYMM) — Geometrik Şekiller, Geometrik Nicelikler, Sayılar ve Nicelikler (2).
  // MAT.5.1.3-5.1.4 kesirler · MAT.5.3.1-5.3.2 nokta, doğru, doğru parçası, ışın, açı, çember ve dikme
  // çizimleri (cetvel, pergel, gönye, açıölçer) · MAT.5.3.3 açı ölçme · MAT.5.3.4 iki-üç doğrunun
  // oluşturduğu açılar · MAT.5.3.5-5.3.6 çokgenler, köşegen, düzgün çokgen · MAT.5.3.7 kesişen iki çemberle
  // üçgen · MAT.5.4.1-5.4.4 dikdörtgenin çevresi ve alanı.
  5: {
    konular: 'Temel geometrik çizim ve inşalar, açı ölçme, çokgenler ve çember; dikdörtgenin çevresi ve alanı; kesirler',
    araclar: [
      'point', // (MAT.5.3.1)
      'segment', // (MAT.5.3.1, köşegen MAT.5.3.6)
      'line', // (MAT.5.3.1, MAT.5.3.4, MAT.5.3.5)
      'ray', // (MAT.5.3.1)
      'segment_length', // verilen uzunlukta kenar (MAT.5.3.7)
      'circle', // (MAT.5.3.1, MAT.5.3.7)
      'measure_distance', // (MAT.5.3.6, MAT.5.3.7)
      'unit_measure', // (MAT.5.4.2)
      'measure_angle', // açıölçer (MAT.5.3.3)
      'angle', // (MAT.5.3.1, MAT.5.3.4)
      'measure_area', // (MAT.5.4.2-5.4.4)
      'measure_perimeter', // (MAT.5.4.1, MAT.5.4.3)
      'area_model', // birim karelerle alan (MAT.5.4.2)
      'ruler', // (MAT.5.3.1)
      'setsquare', // gönye, dikme (MAT.5.3.1)
      'circle_radius', // yarıçapı verilen çember (MAT.5.3.7)
      'polygon', // (MAT.5.3.5, MAT.5.3.6)
      'rectangle', // (MAT.5.4.x)
      'square', // (MAT.5.4.x)
      'regular_polygon', // (MAT.5.3.6)
      'perpendicular', // dikme (MAT.5.3.1)
      'parallel', // paralel doğrular (MAT.5.3.4)
      'compass', // pergel (MAT.5.3.1, MAT.5.3.7)
      'intersect', // kesişen doğrular ve çemberler (MAT.5.3.4, MAT.5.3.5, MAT.5.3.7)
      'fraction', // (MAT.5.1.3, MAT.5.1.4)
    ],
  },

  // 6. SINIF (TYMM) — Geometrik Şekiller, Geometrik Nicelikler, Sayılar ve Nicelikler (2).
  // MAT.6.1.5-6.1.8 ondalık gösterim, kesir, yüzde · MAT.6.1.7 standart uzunluk birimleri ·
  // MAT.6.3.1-6.3.2 paralel doğrular ve kesenle oluşan açılar ve şekiller · MAT.6.3.3 birbirini ortalayan
  // köşegenler · MAT.6.3.4 üçgen ve dörtgenlerin açıları · MAT.6.4.1-6.4.3 alan birimleri, paralelkenar ve
  // üçgenin alanı · MAT.6.4.4-6.4.5 çember uzunluğu ve çap · MAT.6.4.6 merkez açı ve gördüğü yay.
  6: {
    konular: 'Paralel doğrular ve kesen, dörtgenler, paralelkenar ve üçgenin alanı; çember uzunluğu, merkez açı ve yay',
    araclar: [
      'point',
      'segment', // köşegen, çap (MAT.6.3.3, MAT.6.4.4)
      'line', // paralel doğrular ve kesen (MAT.6.3.1, MAT.6.3.2)
      'circle', // (MAT.6.4.4)
      'measure_distance', // (MAT.6.1.7, MAT.6.3.3)
      'unit_measure', // uzunluk ve alan birimleri (MAT.6.4.1)
      'measure_angle', // (MAT.6.3.1, MAT.6.3.4)
      'angle', // (MAT.6.3.1, MAT.6.4.6)
      'measure_area', // (MAT.6.4.1-6.4.3)
      'measure_perimeter', // çemberin uzunluğu (MAT.6.4.4, MAT.6.4.5)
      'measure_arc', // yay uzunluğu (MAT.6.4.6)
      'area_model', // paralelkenarı dikdörtgene dönüştürme (MAT.6.4.2)
      'ruler', // (MAT.6.1.7)
      'setsquare', // yükseklik (MAT.6.4.2)
      'circle_radius', // yarıçapı verilen çember (MAT.6.4.5)
      'arc', // merkez açının gördüğü yay (MAT.6.4.6)
      'polygon', // üçgen, yamuk, paralelkenar (MAT.6.3.2-6.3.4)
      'rectangle',
      'square',
      'midpoint', // birbirini ortalayan doğru parçaları (MAT.6.3.3)
      'perpendicular', // yükseklik (MAT.6.4.2)
      'parallel', // (MAT.6.3.1, MAT.6.3.2)
      'intersect', // (MAT.6.3.1, MAT.6.3.2)
      'fraction', // (MAT.6.1.5-6.1.8)
    ],
  },

  // 7. SINIF (TYMM) — Dönüşüm, Geometrik Şekiller, Geometrik Nicelikler (1)-(2).
  // MAT.7.3.1 yansıma · MAT.7.3.2 orta dikme ve açıortay inşası · MAT.7.4.2-7.4.6 dikdörtgenler prizması
  // (açınım, yüzey alanı) · MAT.7.4.7 dairenin alanı · MAT.7.4.8 merkez açı, yay ve daire dilimi ·
  // MAT.7.4.9-7.4.10 eşkenar dörtgen ve yamuğun alanı · MAT.7.5.1-7.5.2 kenarortay, açıortay, yükseklik.
  7: {
    konular: 'Yansıma, orta dikme ve açıortay inşası, kenarortay ve yükseklik; daire, daire dilimi, eşkenar dörtgen ve yamuk alanı',
    araclar: [
      'point',
      'segment',
      'line', // yansıma doğrusu (MAT.7.3.1)
      'ray', // açının kolları, açıortay (MAT.7.3.2)
      'circle', // (MAT.7.4.7)
      'measure_distance', // doğruya uzaklık (MAT.7.3.1)
      'measure_angle', // (MAT.7.3.2, MAT.7.4.8)
      'angle', // (MAT.7.4.8, MAT.7.5.1)
      'measure_area', // (MAT.7.4.2, MAT.7.4.7-7.4.10)
      'measure_perimeter', // çember uzunluğundan daireye (MAT.7.4.7)
      'measure_arc', // (MAT.7.4.8)
      'ruler', // inşa (MAT.7.3.2)
      'circle_radius', // (MAT.7.4.7)
      'arc', // (MAT.7.4.8)
      'sector', // daire dilimi (MAT.7.4.8, MAT.7.4.10)
      'polygon', // eşkenar dörtgen, yamuk, üçgen (MAT.7.4.9, MAT.7.5.1)
      'rectangle', // prizma açınımı (MAT.7.4.2)
      'square',
      'midpoint', // kenarortay (MAT.7.5.1, MAT.7.5.2)
      'perp_bisector', // orta dikme (MAT.7.3.2, MAT.7.5.2)
      'angle_bisector', // açıortay (MAT.7.3.2, MAT.7.5.1)
      'perpendicular', // yükseklik (MAT.7.5.1, MAT.7.4.9)
      'parallel', // yamuk (MAT.7.4.9)
      'compass', // pergelle inşa (MAT.7.3.2, MAT.7.5.2)
      'intersect', // (MAT.7.3.2)
      'reflect', // yansıma (MAT.7.3.1)
    ],
  },

  // 8. SINIF (2026-2027'de 2018 programı, 2027-2028'den TYMM; ikisi birlikte).
  // TYMM: MAT.8.2.1 dik koordinat sistemi · MAT.8.2.2-8.2.3 doğrusal fonksiyonlar ve eğim · MAT.8.3.1-8.3.6
  // üçgende açı-kenar, üçgen eşitsizliği, eşlik, benzerlik, Pisagor · MAT.8.4.1-8.4.3 prizma, piramit,
  // silindir, koni açınımları · MAT.8.5.1-8.5.3 öteleme ve yansıma.
  // 2018: M.8.2.2.2-8.2.2.6 koordinat, doğrusal denklem grafiği, eğim · M.8.2.3.2 eşitsizliği sayı doğrusunda
  // gösterme · M.8.3.1.1 kenarortay, açıortay, yükseklik inşası · M.8.3.1.4 elemanları verilen üçgeni çizme ·
  // M.8.3.2 öteleme ve yansıma · M.8.3.4 dik prizma, silindir, piramit ve koni açınımları.
  8: {
    konular: 'Koordinat sistemi, doğrusal fonksiyon ve eğim; üçgenler, Pisagor, eşlik ve benzerlik; öteleme ve yansıma; açınımlar',
    araclar: [
      'point', // sıralı ikililer (MAT.8.2.1, M.8.2.2.2)
      'segment',
      'line', // doğrusal ilişki (MAT.8.2.2)
      'ray', // eşitsizliğin sayı doğrusunda gösterimi (M.8.2.3.2)
      'segment_length', // kenarları verilen üçgen (MAT.8.3.2, M.8.3.1.4)
      'circle', // silindir ve koni açınımı (MAT.8.4.1)
      'measure_distance', // (MAT.8.3.1-8.3.2)
      'unit_measure', // koordinat düzleminde birim uzunluk (MAT.8.2.1)
      'measure_angle', // (MAT.8.3.1, M.8.3.1.4)
      'angle',
      'measure_area', // Pisagor, silindirin yüzey alanı (MAT.8.3.5, MAT.8.4.2)
      'measure_perimeter', // silindir açınımında çember uzunluğu (MAT.8.4.2)
      'measure_slope', // eğim (MAT.8.2.3, M.8.2.2.6)
      'setsquare', // dik üçgen (MAT.8.3.5)
      'circle_radius', // üçgen eşitsizliği inşası (MAT.8.3.2)
      'sector', // koninin yanal yüzü (MAT.8.4.1, M.8.3.4.6)
      'polygon',
      'rectangle', // prizma ve silindir açınımı (MAT.8.4.1)
      'square', // Pisagor bağıntısı (MAT.8.3.5)
      'function', // doğrusal fonksiyon grafiği (MAT.8.2.2, M.8.2.2.4)
      'slider', // y = ax + b parametreleri (MAT.8.2.3)
      'midpoint', // kenarortay (M.8.3.1.1)
      'perp_bisector', // kenarortay inşası için orta nokta (M.8.3.1.1)
      'angle_bisector', // açıortay (M.8.3.1.1)
      'perpendicular', // yükseklik (M.8.3.1.1)
      'parallel', // paralel doğrusal fonksiyonlar (MAT.8.2.3)
      'compass', // üçgen inşası (MAT.8.3.2, M.8.3.1.4)
      'intersect', // (MAT.8.2.3, MAT.8.3.2)
      'translate', // öteleme (MAT.8.5.1-8.5.3, M.8.3.2.1)
      'reflect', // yansıma (MAT.8.5.2-8.5.3, M.8.3.2.2)
    ],
  },

  // 9. SINIF (TYMM) — Nicelikler ve Değişimler, Geometrik Şekiller, Eşlik ve Benzerlik.
  // MAT.9.2.1-9.2.3 doğrusal ve mutlak değer fonksiyonları (g(x) = a·f(x ± r) ± k) · MAT.9.4.1 üçgende açı ve
  // kenar özellikleri · MAT.9.5.1 dönüşümler (öteleme, yansıma, dönme) · MAT.9.5.2-9.5.3 eşlik ve benzerlik
  // koşulları, benzer üçgen oluşturma · MAT.9.5.4 Tales, Öklid ve Pisagor teoremleri.
  9: {
    konular: 'Doğrusal ve mutlak değer fonksiyonları; üçgende açı-kenar, dönüşümler, eşlik ve benzerlik; Tales, Öklid, Pisagor',
    araclar: [
      'point',
      'segment',
      'line', // (MAT.9.2.1, MAT.9.4.1)
      'ray', // dış açı (MAT.9.4.1)
      'segment_length', // eşlik koşulları (MAT.9.5.2)
      'circle', // üçgen inşası (MAT.9.5.2)
      'measure_distance', // (MAT.9.4.1, MAT.9.5.2)
      'measure_angle', // (MAT.9.4.1, MAT.9.5.2)
      'angle',
      'measure_area', // Pisagor (MAT.9.5.4)
      'measure_slope', // doğrusal fonksiyonun eğimi (MAT.9.2.1)
      'setsquare', // dik üçgen (MAT.9.5.4)
      'circle_radius', // (MAT.9.5.2)
      'polygon',
      'square', // Pisagor (MAT.9.5.4)
      'function', // (MAT.9.2.1-9.2.3)
      'slider', // a, r, k parametreleri (MAT.9.2.1, MAT.9.2.2)
      'divide_ratio', // Tales, orantılı bölme (MAT.9.5.4)
      'perpendicular', // Öklid, hipotenüse ait yükseklik (MAT.9.5.4)
      'parallel', // Tales, açılar toplamı (MAT.9.4.1, MAT.9.5.4)
      'compass', // (MAT.9.5.2, MAT.9.5.3)
      'intersect', // (MAT.9.2.3)
      'rotate', // dönme (MAT.9.5.1)
      'translate', // öteleme (MAT.9.5.1)
      'reflect', // yansıma (MAT.9.5.1)
      'input_box', // parametre girişi (MAT.9.2.1, MAT.9.2.2)
    ],
  },

  // 10. SINIF (TYMM) — Nicelikler ve Değişimler, Geometrik Şekiller, Analitik İnceleme.
  // MAT.10.2.1-10.2.6 fonksiyon olma şartı; karesel, karekök ve rasyonel fonksiyonlar; ters fonksiyon ·
  // MAT.10.4.1 dik üçgende trigonometrik oranlar · MAT.10.4.2 üçgenin yardımcı elemanları · MAT.10.4.3 üçgenin
  // alanı · MAT.10.4.4 sinüs ve kosinüs teoremleri · MAT.10.5.1 iki nokta arası uzaklık, oranda bölen nokta ·
  // MAT.10.5.2 doğrunun analitik incelenmesi.
  10: {
    konular: 'Fonksiyonlar ve ters fonksiyon; dik üçgende trigonometri, yardımcı elemanlar, sinüs ve kosinüs teoremi; analitik doğru',
    araclar: [
      'point',
      'segment',
      'line', // dikey doğru testi, y = x (MAT.10.2.1, MAT.10.2.5)
      'circle', // iç teğet çember (MAT.10.4.2)
      'measure_distance', // (MAT.10.4.4)
      'unit_measure', // iki nokta arasındaki uzaklık (MAT.10.5.1)
      'measure_angle', // (MAT.10.4.1, MAT.10.4.4)
      'angle',
      'measure_area', // (MAT.10.4.3)
      'measure_slope', // (MAT.10.5.2)
      'trig_ratios', // (MAT.10.4.1)
      'setsquare', // dik üçgen (MAT.10.4.1)
      'circle_3points', // çevrel çember (MAT.10.4.2, MAT.10.4.4)
      'polygon',
      'function', // (MAT.10.2.1-10.2.6)
      'slider', // (MAT.10.2.2-10.2.4)
      'midpoint', // kenarortay, orta nokta (MAT.10.4.2, MAT.10.5.1)
      'divide_ratio', // oranda bölen nokta (MAT.10.5.1)
      'perp_bisector', // (MAT.10.4.2)
      'angle_bisector', // (MAT.10.4.2)
      'perpendicular', // yükseklik, dik doğrular (MAT.10.4.2, MAT.10.5.2)
      'parallel', // alan korunur, paralel doğrular (MAT.10.4.3, MAT.10.5.2)
      'intersect', // (MAT.10.4.2, MAT.10.5.2)
      'reflect', // ters fonksiyon: y = x doğrusuna göre simetri (MAT.10.2.5)
      'input_box', // (MAT.10.2.2-10.2.4)
    ],
  },

  // 11. SINIF (TYMM) — Nicelikler ve Değişimler (1)-(3), Geometrik Şekiller.
  // MAT.11.1.1-11.1.2 trigonometrik fonksiyonlar (birim çember, derece ve radyan) · MAT.11.1.3-11.1.6 üstel ve
  // logaritmik fonksiyonlar · MAT.11.1.7-11.1.8 bileşke ve dört işlem · MAT.11.2.1-11.2.5 dörtgenler ve
  // çokgenler (açı, kenar, köşegen, simetri, alan; içbükey ve dışbükey).
  11: {
    konular: 'Trigonometrik, üstel ve logaritmik fonksiyonlar; birim çember ve radyan; dörtgenler ve çokgenler',
    araclar: [
      'point',
      'segment', // köşegen (MAT.11.2.1-11.2.4)
      'line', // y = x (MAT.11.1.4)
      'circle', // birim çember (MAT.11.1.1)
      'measure_distance', // (MAT.11.2.4)
      'measure_angle', // (MAT.11.1.1, MAT.11.2.1)
      'angle', // yönlü açı (MAT.11.1.1)
      'measure_area', // (MAT.11.2.4, MAT.11.2.5)
      'measure_perimeter', // (MAT.11.2.5)
      'trig_ratios', // birim çemberde sin, cos, tan (MAT.11.1.1)
      'measure_arc', // radyan: yay uzunluğu / yarıçap (MAT.11.1.1)
      'circle_radius', // yarıçapı 1 olan birim çember (MAT.11.1.1)
      'arc', // (MAT.11.1.1)
      'polygon', // içbükey ve dışbükey çokgenler (MAT.11.2.3)
      'rectangle', // özel dörtgenler (MAT.11.2.2)
      'square',
      'regular_polygon', // (MAT.11.2.4)
      'function', // (MAT.11.1.1-11.1.8)
      'slider', // (MAT.11.1.1, MAT.11.1.3, MAT.11.1.5)
      'midpoint', // köşegenlerin orta noktası (MAT.11.2.2)
      'perpendicular', // yükseklik, dik köşegenler (MAT.11.2.1)
      'parallel', // paralelkenar, yamuk (MAT.11.2.2)
      'intersect', // köşegenlerin kesişimi (MAT.11.2.2)
      'reflect', // ters fonksiyon (MAT.11.1.4)
      'symmetry', // dörtgen ve çokgenlerin simetrileri (MAT.11.2.2, MAT.11.2.4)
      'input_box', // (MAT.11.1.x)
    ],
  },

  // 12. SINIF (2026-2027'de 2018 programı, 2027-2028'den TYMM; ikisi birlikte).
  // TYMM: MAT.12.1.1-12.1.5 diziler ve polinom fonksiyonlar · MAT.12.2.1-12.2.9 limit, süreklilik, türev
  // (değişim oranı, teğet) · MAT.12.3.1-12.3.3 çemberde kesen, kiriş, teğet, çap, yay; açı ve uzunluk
  // bağıntıları; dairenin alanı.
  // 2018: 12.1 üstel ve logaritmik fonksiyonlar · 12.3 trigonometri · 12.4.1 analitik düzlemde öteleme, dönme
  // ve simetri · 12.5 türev · 12.6.2 Riemann toplamı ve belirli integralle alan · 12.7.1 çemberin analitik
  // incelenmesi (merkez ve yarıçap, doğru ile çemberin kesişimi).
  12: {
    konular: 'Polinom, üstel ve logaritmik fonksiyonlar; limit, türev ve integral; çemberde kiriş, teğet ve yay; analitik düzlemde dönüşümler',
    araclar: [
      'point',
      'segment', // kiriş, çap (MAT.12.3.1)
      'line', // kesen, teğet doğru (MAT.12.2.5, MAT.12.3.1)
      'circle', // (MAT.12.3.1)
      'measure_distance', // (MAT.12.3.2)
      'unit_measure', // merkezin doğruya uzaklığı (12.7.1.2)
      'measure_angle', // merkez ve çevre açı (MAT.12.3.2)
      'angle',
      'measure_area', // dairenin alanı, Riemann toplamı (MAT.12.3.3, 12.6.2.1)
      'measure_slope', // kesen ve teğetin eğimi (MAT.12.2.5)
      'trig_ratios', // birim çemberde toplam-fark formülleri (12.3.1)
      'measure_arc', // (MAT.12.3.1)
      'circle_radius', // merkezi ve yarıçapı verilen çember (12.7.1.1)
      'circle_3points', // (MAT.12.3.1)
      'arc', // (MAT.12.3.1)
      'sector', // daire dilimi (MAT.12.3.3)
      'polygon', // çembere çizilen çokgenler (MAT.12.3.2)
      'rectangle', // Riemann toplamı dikdörtgenleri (12.6.2.1)
      'function', // (MAT.12.1.x, MAT.12.2.x)
      'slider', // (MAT.12.1.4, MAT.12.2.5)
      'midpoint', // kirişin orta noktası (MAT.12.3.2)
      'perp_bisector', // kirişin orta dikmesi merkezden geçer (MAT.12.3.2)
      'perpendicular', // teğet yarıçapa diktir (MAT.12.3.2)
      'intersect', // doğru ile çemberin kesişimi (12.7.1.2)
      'rotate', // dönme (12.4.1)
      'translate', // öteleme (12.4.1)
      'reflect', // noktaya, eksenlere, y = x doğrusuna göre simetri (12.4.1)
      'input_box', // (MAT.12.1.x)
    ],
  },
};

/** Menüde sınıfların gruplanışı */
export const KADEMELER: readonly { ad: string; siniflar: readonly SinifNo[] }[] = [
  { ad: 'İlkokul', siniflar: [1, 2, 3, 4] },
  { ad: 'Ortaokul', siniflar: [5, 6, 7, 8] },
  { ad: 'Lise', siniflar: [9, 10, 11, 12] },
];

/** "Tüm araçlar" ya da "5. sınıf" */
export function sinifEtiketi(duzey: SinifDuzeyi): string {
  return duzey === 'tum' ? 'Tüm araçlar' : `${duzey}. sınıf`;
}

/** Saklanan (ya da bilinmeyen) değeri geçerli bir düzeye çevirir; tanınmayan her şey varsayılana düşer. */
export function sinifDuzeyiniCoz(ham: unknown): SinifDuzeyi {
  if (ham === 'tum') return 'tum';
  let sayi = Number.NaN;
  if (typeof ham === 'number') sayi = ham;
  else if (typeof ham === 'string' && /^\s*\d{1,2}\s*$/.test(ham)) sayi = Number(ham);
  return (SINIF_NUMARALARI as readonly number[]).includes(sayi) ? (sayi as SinifNo) : VARSAYILAN_SINIF_DUZEYI;
}

const gorunenKumeleri = new Map<SinifNo, ReadonlySet<string>>();

/** Sınıfta panelde görünen araç kimlikleri; 'tum' için null (süzgeç yok). */
export function gorunenAraclar(duzey: SinifDuzeyi): ReadonlySet<string> | null {
  if (duzey === 'tum') return null;
  let kume = gorunenKumeleri.get(duzey);
  if (!kume) {
    kume = new Set<string>([...HER_SINIFTA_ACIK_ARACLAR, ...SINIF_DUZEYLERI[duzey].araclar]);
    gorunenKumeleri.set(duzey, kume);
  }
  return kume;
}

/** Araç bu sınıf düzeyinde panelde görünür mü? */
export function aracGorunurMu(duzey: SinifDuzeyi, arac: string): boolean {
  const kume = gorunenAraclar(duzey);
  return kume === null || kume.has(arac);
}

/** Araç listesini sınıfa göre süzer (sıra korunur). */
export function araclariSuz<T extends { id: string }>(araclar: readonly T[], duzey: SinifDuzeyi): T[] {
  const kume = gorunenAraclar(duzey);
  return kume === null ? [...araclar] : araclar.filter((a) => kume.has(a.id));
}

/**
 * Araç gruplarını sınıfa göre süzer: her grupta yalnız görünen araçlar kalır, boşalan grup düşer.
 * Grup sayaçları (panelde grup adının yanındaki sayı) bu süzülmüş listeden sayılır.
 */
export function gruplariSuz<G extends { tools: readonly { id: string }[] }>(gruplar: readonly G[], duzey: SinifDuzeyi): G[] {
  if (duzey === 'tum') return [...gruplar];
  return gruplar
    .map((grup) => ({ ...grup, tools: araclariSuz(grup.tools, duzey) }))
    .filter((grup) => grup.tools.length > 0);
}

/** Süzülmüş gruplardaki toplam araç sayısı */
export function gorunenAracSayisi(gruplar: readonly { tools: readonly { id: string }[] }[], duzey: SinifDuzeyi): number {
  return gruplariSuz(gruplar, duzey).reduce((toplam, grup) => toplam + grup.tools.length, 0);
}

/**
 * Sınıf seçildiğinde grupların başlangıç açıklığı: az araçlı sınıflarda (ACIK_GRUP_SINIRI) hepsi açık,
 * diğerlerinde ve "Tüm araçlar"da grupların kendi varsayılanı.
 */
export function grupAcikliklari(
  gruplar: readonly { id: string; defaultExpanded?: boolean; tools: readonly { id: string }[] }[],
  duzey: SinifDuzeyi
): Record<string, boolean> {
  const hepsiAcik = duzey !== 'tum' && gorunenAracSayisi(gruplar, duzey) <= ACIK_GRUP_SINIRI;
  return Object.fromEntries(gruplar.map((grup) => [grup.id, hepsiAcik || (grup.defaultExpanded ?? true)]));
}
