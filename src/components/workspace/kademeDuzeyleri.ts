/**
 * Kademe → araç paneli eşlemesi (menü çubuğundaki "Kademe" menüsü).
 *
 * Öğretmen bir kademe seçtiğinde (ilkokul, ortaokul, lise) sol araç paneli (ağaç liste, "Ara" sekmesi ve
 * menü çubuğundaki Araçlar menüsü) yalnızca o kademenin matematik programının gerektirdiği araçları gösterir.
 * Varsayılan "Tüm araçlar"dır: hiçbir şey gizlenmez. Sınıf sınıf ayrım yapılmaz: 1-4, 5-8 ve 9-12. sınıflar
 * birer bütündür.
 *
 * Yalnız PANEL süzülür. Yazılı / sesli komutlar ("Yazarak komut ver") ve klavye kısayolları her kademede
 * bütün araçlarla çalışmaya devam eder; bu modül yalnızca görünürlüğü söyler.
 *
 * Kaynaklar:
 *  - İlkokul: "Dinamik Matematik Yazılımı İlkokul Raporu" (23.07.2026). Geometri ve Ölçüm Araçları ekranındaki
 *    menüler: Temel Araçlar (Seç ve Taşı, Nokta, Doğru Parçası, Doğru, Çokgen, Çember, Kalem), Düzenleme
 *    (Nesneleri Seç, Sil), Ölçme (Açıyı İncele, Uzunluğu Ölç, Alanı Bul, Cetvel, Gönye, Açıölçer), Çizgi
 *    (İki Noktayı Birleştir), Çember (Çember Çiz), Çokgen (Şekil Oluştur, Düzgün Çokgen), Dönüşüm (Şekli Döndür,
 *    Simetriğini Oluştur), Kesir (Kesirle Göster), Medya (Görsel Ekle, Yazı Ekle). Oluşturma (Construct)
 *    araçları "ilkokul seviyesinin üzerindedir, yazılımda kullanılmayacaktır". Raporun Grafik Araçları ekranı
 *    Temel Araçlar'da Seç ve Taşı, Nokta, Sürgü ve Kalem'i, Medya'da Yazı Ekle'yi ister; atölyede tek panel
 *    olduğu için Sürgü önce ilkokul listesine alınmıştı (aşağıdaki güncellemeyle çıktı). Raporun kapsamadığı yerlerde 1-4. sınıf kazanımları
 *    (TYMM 2024; 4. sınıf için 2018 programı da) ölçüt alınır.
 *    ALAN UZMANLARI GÜNCELLEMESİ (atölye inceleme, 2. tur; 2, 3 ve 4. sınıf uzmanları) raporun listesini şu
 *    noktalarda DEĞİŞTİRİR: Doğru Parçası, Doğru ve Işın ilkokulda yoktur (TYMM MAT.4.3.5: "ışın, doğru ve doğru
 *    parçası gibi temel geometrik kavramlara girilmeden"); şekil Çokgen ("Şekil Oluştur"), Kare, Dikdörtgen ve
 *    Düzgün Çokgenle kurulur, simetri doğrusunu Yansıt aracı kendisi çizer. Cebir ve Fonksiyon grubu (Sürgü)
 *    ilkokulda yoktur. "Alanı Bul" hesap gösterdiği için yoktur: ilkokulda (4. sınıf) alan birim karelerle
 *    kaplanarak bulunur ("Alanı Modelle"). Araçların ilkokuldaki görünüm kuralları (zemin, tam sayı ölçü, harfsiz
 *    köşe, açıölçerin yalnız tanıtılması, en çok sekizgen) ilkokulKipi.ts'tedir.
 *  - Ortaokul ve lise: 5-8 ve 9-12. sınıf matematik programlarının gerektirdiği araçların birleşimi
 *    (TYMM 2024, tymm.meb.gov.tr; 8 ve 12. sınıf 2026-2027'de 2018 programını izler, ikisi birlikte).
 *    Yorumlardaki kodlar programın resmî öğrenme çıktısı kodlarıdır (metinleri: scripts/veri/kazanim-metinleri.json).
 *
 * Kural: her kademe, programının gerektirdiği HER aracı kendisi listeler; "önceki kademelerin hepsi" gibi
 * birikimli bir kural yoktur (lisede kalem ya da alan modeli ızgarası yoktur). Seç ve Taşı, Sil ve Yazı Ekle
 * programdan bağımsızdır ve her kademede açık kalır (HER_KADEMEDE_ACIK_ARACLAR). El (kaydırma) aracı panelde değil
 * tuval şeridindedir; geri al / yinele de panel aracı değildir.
 *
 * Kapsam: yalnız 2B araç paneli ve menü çubuğundaki Araçlar menüsü süzülür. 3B Cisimler paneli (Toolbar3D,
 * AddObjectModal) ve raporun ızgara / arka plan seçenekleri bu modülün dışındadır.
 */
import type { LevelId } from '@/types/curriculum';
import type { ToolMode } from '@/types/workspace';

/** Kademe kimlikleri müfredat verisindeki kademelerle (LevelId) aynıdır. */
export type KademeId = LevelId;
export const KADEME_KIMLIKLERI: readonly KademeId[] = ['ilkokul', 'ortaokul', 'lise'];
/** 'tum': süzgeç yok, paneldeki bütün araçlar görünür. */
export type KademeDuzeyi = 'tum' | KademeId;

export const VARSAYILAN_KADEME_DUZEYI: KademeDuzeyi = 'tum';

/** Seçim tarayıcıya özgü bir arayüz tercihidir: localStorage'da bu anahtarla saklanır (proje dosyasına girmez). */
export const KADEME_DUZEYI_ANAHTARI = 'geoeba_kademe_duzeyi_v1';
/** Önceki sürümün sınıf sınıf sakladığı tercih ('5' gibi); ilk okumada sınıfın kademesine taşınır (useKademeDuzeyi). */
export const ESKI_SINIF_DUZEYI_ANAHTARI = 'geoeba_sinif_duzeyi_v1';

/** Programdan bağımsız, her kademede açık kalan araçlar: seçip taşımak, silmek, soru / ad / açıklama yazmak. */
export const HER_KADEMEDE_ACIK_ARACLAR: readonly ToolMode[] = ['select', 'delete', 'text'];

/** Görünür araç sayısı bu sınırı aşmıyorsa kademe seçilince bütün gruplar açık gelir (ilkokul: hepsi tek bakışta). */
export const ACIK_GRUP_SINIRI = 30;

export interface KademeTanimi {
  /** Menüde gösterilen ad */
  ad: string;
  /** Kapsanan sınıflar, menüde adın yanında */
  siniflar: string;
  /** Menüde gösterilen kısa konu özeti */
  konular: string;
  /** Programın gerektirdiği panel araçları (HER_KADEMEDE_ACIK_ARACLAR ayrıca eklenir) */
  araclar: readonly ToolMode[];
}

export const KADEME_DUZEYLERI: Readonly<Record<KademeId, KademeTanimi>> = {
  // İLKOKUL (1-4. sınıf) — İlkokul raporundaki araç menüleri + Nesnelerin Geometrisi, Sayılar ve Nicelikler
  // kazanımları. Raporun gereksinim listesi: kare, dikdörtgen, üçgen, çember ve daire çizme; renk ve kalınlık;
  // dinamik köşeler; kenar uzunluğu ölçme (ondalıksız); simetri doğrusuna göre simetrik; kesirler.
  ilkokul: {
    ad: 'İlkokul',
    siniflar: '1-4. sınıf',
    konular:
      'Nokta, çember ve çokgenler; cetvel ve gönye, açıölçeri tanıma; uzunluk ölçme, çevre, birim karelerle alan; döndürme ve simetri; kesir modeli, görsel ve yazı',
    araclar: [
      'point', // Nokta — Temel Araçlar (rapor); konum, hedef, köşe (MAT.1.3.1, MAT.1.3.5)
      // Doğru Parçası, Doğru, Işın: YOK (alan uzmanları, TYMM MAT.4.3.5; dosya başındaki not)
      'circle', // Çember — Temel Araçlar; Çember Araçları "Çember Çiz" (rapor); çember ve daire (MAT.1.3.5, MAT.2.3.3)
      'pen', // Kalem — Temel Araçlara eklenir (rapor); hedefe giden yol, şekil örüntüsü, kodlama (MAT.1.3.1, MAT.1.1.6, MAT.3.3.8)
      'measure_distance', // "Uzunluğu Ölç" — Ölçme Araçları (rapor); kenar uzunlukları (MAT.2.1.10-2.1.11, MAT.4.3.2)
      'unit_measure', // standart olmayan birimle uzunluk ve alan (MAT.1.1.8, MAT.2.1.10, MAT.3.3.4, MAT.4.3.4); rapor: uzunluk ondalıksız
      'measure_angle', // Açıölçer — yalnız TANITIM: ilkokulda derece okunmaz (TYMM: "Geometri setinden açı ölçer tanıtılır. Açı ölçer ile açı ölçme uygulamalarına girilmez.")
      'angle', // açı oluşturma, derece yazısız (MAT.4.3.5: açı bir dönme miktarı)
      // "Alanı Bul": YOK — hesap gösterir; ilkokulda alan birim karelerle kaplanarak bulunur (alan uzmanı, 4. sınıf)
      'measure_perimeter', // çevre uzunluğu (MAT.3.3.4, MAT.4.3.3 — raporun gereksinim listesi)
      'area_model', // birim karelerle alan (MAT.4.3.4, M.4.3.3.1)
      'ruler', // Cetvel — Ölçme Araçları (rapor); MAT.2.1.11, MAT.3.3.3
      'setsquare', // Gönye — Ölçme Araçları (rapor); dik açı (MAT.4.3.7)
      'polygon', // Çokgen / "Şekil Oluştur" — Temel ve Çokgen Araçları (rapor); üçgen ve şekil modelleri (MAT.1.3.5, MAT.2.3.3)
      'rectangle', // dikdörtgen çizme (raporun gereksinim listesi; MAT.1.3.5, MAT.4.3.2)
      'square', // kare çizme (raporun gereksinim listesi; MAT.1.3.5, MAT.4.3.2)
      'regular_polygon', // "Düzgün Çokgen" — Çokgen Araçları (rapor); beşgen, altıgen, sekizgen (MAT.3.3.2)
      // Sürgü ("Cebir ve Fonksiyon" grubu): YOK (alan uzmanı, 3. sınıf: "Cebir ve Fonksiyon aracı ilkokul için uygun değildir")
      'rotate', // "Şekli Döndür" — Dönüşüm Araçları (rapor); yön değişince biçim korunur (MAT.2.3.4, MAT.4.3.5)
      'reflect', // "Simetriğini Oluştur" — Dönüşüm Araçları (rapor); simetri doğrusuna göre tamamlama (MAT.3.3.7, MAT.4.3.9)
      'symmetry', // simetri doğruları (MAT.2.3.7, MAT.3.3.6, MAT.4.3.8)
      'fraction', // "Kesirle Göster" — Kesir Araçları (rapor); MAT.2.1.7, MAT.3.1.9-3.1.11, MAT.4.1.6-4.1.12
      'image', // "Görsel Ekle" — Medya Araçları (rapor); günlük yaşamdaki nesne ve yapı fotoğrafları (MAT.1.3.3, MAT.1.3.4)
    ],
  },

  // ORTAOKUL (5-8. sınıf) — Geometrik Şekiller, Geometrik Nicelikler, Dönüşüm, Sayılar ve Nicelikler.
  // MAT.5.3.1-5.3.7 temel çizim ve inşalar (cetvel, pergel, gönye, açıölçer), çokgen ve çember · MAT.5.4 ve
  // MAT.6.4 çevre ve alan, çember uzunluğu, merkez açı ve yay · MAT.6.3.1-6.3.4 paralel doğrular ve kesen,
  // köşegenler · MAT.7.3.1-7.3.2 yansıma, orta dikme ve açıortay · MAT.7.4-7.5 daire dilimi, yamuk, kenarortay ·
  // MAT.8.2.1-8.2.3 koordinat sistemi, doğrusal fonksiyon ve eğim · MAT.8.3 üçgenler, Pisagor · MAT.8.5 öteleme
  // ve yansıma · 2018 programı 8. sınıf: M.8.2.2, M.8.3.1, M.8.3.2, M.8.3.4.
  ortaokul: {
    ad: 'Ortaokul',
    siniflar: '5-8. sınıf',
    konular:
      'Temel çizim ve inşalar (dikme, paralel, pergel, kesişim), açı ölçme, çokgen ve çember; çevre ve alan; yansıma ve öteleme; doğrusal fonksiyon ve eğim; kesirler',
    araclar: [
      'point', // (MAT.5.3.1, MAT.8.2.1)
      'segment', // köşegen, çap (MAT.5.3.6, MAT.6.4.4)
      'line', // (MAT.5.3.1, MAT.6.3.1, MAT.8.2.2)
      'ray', // (MAT.5.3.1, MAT.7.3.2, M.8.2.3.2)
      'segment_length', // verilen uzunlukta kenar (MAT.5.3.7, MAT.8.3.2)
      'circle', // (MAT.5.3.1, MAT.6.4.4, MAT.7.4.7)
      'measure_distance', // (MAT.5.3.6, MAT.6.1.7, MAT.7.3.1)
      'unit_measure', // (MAT.5.4.2, MAT.6.4.1, MAT.8.2.1)
      'measure_angle', // açıölçer (MAT.5.3.3, MAT.6.3.4, MAT.7.3.2)
      'angle', // (MAT.5.3.1, MAT.6.4.6, MAT.7.4.8)
      'measure_area', // (MAT.5.4.2-5.4.4, MAT.6.4.1-6.4.3, MAT.7.4.7-7.4.10, MAT.8.3.5)
      'measure_perimeter', // (MAT.5.4.1, MAT.6.4.4, MAT.7.4.7, MAT.8.4.2)
      'measure_slope', // eğim (MAT.8.2.3, M.8.2.2.6)
      'measure_arc', // yay uzunluğu (MAT.6.4.6, MAT.7.4.8)
      'area_model', // birim karelerle alan, paralelkenarı dikdörtgene dönüştürme (MAT.5.4.2, MAT.6.4.2)
      'ruler', // (MAT.5.3.1, MAT.6.1.7, MAT.7.3.2)
      'setsquare', // gönye, dikme, yükseklik, dik üçgen (MAT.5.3.1, MAT.6.4.2, MAT.8.3.5)
      'circle_radius', // yarıçapı verilen çember (MAT.5.3.7, MAT.6.4.5, MAT.7.4.7, MAT.8.3.2)
      'arc', // merkez açının gördüğü yay (MAT.6.4.6, MAT.7.4.8)
      'sector', // daire dilimi, koninin yanal yüzü (MAT.7.4.8, MAT.8.4.1)
      'polygon', // (MAT.5.3.5, MAT.6.3.2, MAT.7.4.9)
      'rectangle', // (MAT.5.4.x, MAT.7.4.2, MAT.8.4.1)
      'square', // (MAT.5.4.x, MAT.8.3.5)
      'regular_polygon', // (MAT.5.3.6)
      'function', // doğrusal fonksiyon grafiği (MAT.8.2.2, M.8.2.2.4)
      'slider', // y = ax + b parametreleri (MAT.8.2.3)
      'midpoint', // birbirini ortalayan doğru parçaları, kenarortay (MAT.6.3.3, MAT.7.5.1, M.8.3.1.1)
      'perp_bisector', // orta dikme (MAT.7.3.2, MAT.7.5.2, M.8.3.1.1)
      'angle_bisector', // açıortay (MAT.7.3.2, MAT.7.5.1, M.8.3.1.1)
      'perpendicular', // dikme, yükseklik (MAT.5.3.1, MAT.6.4.2, MAT.7.5.1)
      'parallel', // paralel doğrular (MAT.5.3.4, MAT.6.3.1, MAT.7.4.9, MAT.8.2.3)
      'compass', // pergel (MAT.5.3.1, MAT.7.3.2, MAT.8.3.2)
      'intersect', // kesişen doğrular ve çemberler (MAT.5.3.4, MAT.6.3.1, MAT.7.3.2, MAT.8.2.3)
      'translate', // öteleme (MAT.8.5.1-8.5.3, M.8.3.2.1)
      'reflect', // yansıma (MAT.7.3.1, MAT.8.5.2-8.5.3, M.8.3.2.2)
      'fraction', // (MAT.5.1.3-5.1.4, MAT.6.1.5-6.1.8)
    ],
  },

  // LİSE (9-12. sınıf) — Nicelikler ve Değişimler, Geometrik Şekiller, Eşlik ve Benzerlik, Analitik İnceleme.
  // MAT.9.2 doğrusal ve mutlak değer fonksiyonları · MAT.9.4-9.5 üçgen, dönüşümler, eşlik ve benzerlik, Tales,
  // Öklid, Pisagor · MAT.10.2 fonksiyonlar ve ters fonksiyon · MAT.10.4 trigonometri, yardımcı elemanlar, sinüs ve
  // kosinüs teoremi · MAT.10.5 analitik doğru · MAT.11.1 trigonometrik, üstel ve logaritmik fonksiyonlar, birim
  // çember · MAT.11.2 dörtgenler ve çokgenler · MAT.12.1-12.3 diziler, limit ve türev, çemberde kiriş, teğet, yay ·
  // 2018 programı 12. sınıf: 12.4.1 analitik düzlemde dönüşümler, 12.6.2 Riemann toplamı, 12.7.1 çemberin
  // analitik incelenmesi.
  lise: {
    ad: 'Lise',
    siniflar: '9-12. sınıf',
    konular:
      'Fonksiyon grafikleri ve sürgüler; üçgen, trigonometri ve analitik inceleme; çemberde yay, kiriş ve teğet; dönüşümler, eşlik ve benzerlik; giriş kutusu',
    araclar: [
      'point',
      'segment', // kiriş, çap, köşegen (MAT.11.2.1, MAT.12.3.1)
      'line', // kesen, teğet, y = x (MAT.9.2.1, MAT.10.2.5, MAT.12.2.5)
      'ray', // dış açı (MAT.9.4.1)
      'segment_length', // eşlik koşulları (MAT.9.5.2)
      'circle', // birim çember, iç teğet çember (MAT.10.4.2, MAT.11.1.1, MAT.12.3.1)
      'measure_distance', // (MAT.9.4.1, MAT.10.4.4, MAT.11.2.4, MAT.12.3.2)
      'unit_measure', // iki nokta arasındaki uzaklık, merkezin doğruya uzaklığı (MAT.10.5.1, 12.7.1.2)
      'measure_angle', // (MAT.9.4.1, MAT.10.4.1, MAT.11.1.1, MAT.12.3.2)
      'angle', // yönlü açı (MAT.11.1.1)
      'measure_area', // Pisagor, üçgenin alanı, dairenin alanı, Riemann toplamı (MAT.9.5.4, MAT.10.4.3, MAT.12.3.3)
      'measure_perimeter', // (MAT.11.2.5)
      'measure_slope', // eğim (MAT.9.2.1, MAT.10.5.2, MAT.12.2.5)
      'trig_ratios', // dik üçgende ve birim çemberde trigonometrik oranlar (MAT.10.4.1, MAT.11.1.1, 12.3.1)
      'measure_arc', // radyan, yay (MAT.11.1.1, MAT.12.3.1)
      'setsquare', // dik üçgen (MAT.9.5.4, MAT.10.4.1)
      'circle_radius', // birim çember, merkezi ve yarıçapı verilen çember (MAT.9.5.2, MAT.11.1.1, 12.7.1.1)
      'circle_3points', // çevrel çember (MAT.10.4.2, MAT.12.3.1)
      'arc', // (MAT.11.1.1, MAT.12.3.1)
      'sector', // daire dilimi (MAT.12.3.3)
      'polygon', // (MAT.9.4.1, MAT.11.2.3, MAT.12.3.2)
      'rectangle', // özel dörtgenler, Riemann dikdörtgenleri (MAT.11.2.2, 12.6.2.1)
      'square', // Pisagor (MAT.9.5.4)
      'regular_polygon', // (MAT.11.2.4)
      'function', // (MAT.9.2, MAT.10.2, MAT.11.1, MAT.12.1-12.2)
      'slider', // parametreler (MAT.9.2.1, MAT.10.2.2, MAT.11.1.3, MAT.12.1.4)
      'midpoint', // (MAT.10.4.2, MAT.10.5.1, MAT.11.2.2, MAT.12.3.2)
      'divide_ratio', // Tales, oranda bölen nokta (MAT.9.5.4, MAT.10.5.1)
      'perp_bisector', // (MAT.10.4.2, MAT.12.3.2)
      'angle_bisector', // (MAT.10.4.2)
      'perpendicular', // yükseklik, teğet yarıçapa diktir (MAT.9.5.4, MAT.10.4.2, MAT.12.3.2)
      'parallel', // Tales, paralel doğrular (MAT.9.5.4, MAT.10.5.2, MAT.11.2.2)
      'compass', // (MAT.9.5.2, MAT.9.5.3)
      'intersect', // (MAT.9.2.3, MAT.10.5.2, MAT.11.2.2, 12.7.1.2)
      'rotate', // dönme (MAT.9.5.1, 12.4.1)
      'translate', // öteleme (MAT.9.5.1, 12.4.1)
      'reflect', // yansıma, ters fonksiyon (MAT.9.5.1, MAT.10.2.5, MAT.11.1.4, 12.4.1)
      'symmetry', // dörtgen ve çokgenlerin simetrileri (MAT.11.2.2, MAT.11.2.4)
      'input_box', // parametre girişi (MAT.9.2, MAT.10.2, MAT.11.1, MAT.12.1)
    ],
  },
};

/** Menüdeki sıra */
export const KADEMELER: readonly (KademeTanimi & { id: KademeId })[] = KADEME_KIMLIKLERI.map((id) => ({
  id,
  ...KADEME_DUZEYLERI[id],
}));

/** "Tüm araçlar" ya da "İlkokul" */
export function kademeEtiketi(duzey: KademeDuzeyi): string {
  return duzey === 'tum' ? 'Tüm araçlar' : KADEME_DUZEYLERI[duzey].ad;
}

/** Sınıf numarasının kademesi: 1-4 ilkokul, 5-8 ortaokul, 9-12 lise; başka sayılar null. */
export function sinifinKademesi(sinif: number): KademeId | null {
  if (!Number.isInteger(sinif)) return null;
  if (sinif >= 1 && sinif <= 4) return 'ilkokul';
  if (sinif >= 5 && sinif <= 8) return 'ortaokul';
  if (sinif >= 9 && sinif <= 12) return 'lise';
  return null;
}

/**
 * Saklanan (ya da bilinmeyen) değeri geçerli bir düzeye çevirir; tanınmayan her şey varsayılana düşer.
 * Önceki sürümün sınıf numaraları ('5', 7) da sınıfın kademesine çevrilir.
 */
export function kademeDuzeyiniCoz(ham: unknown): KademeDuzeyi {
  if (typeof ham === 'string') {
    const metin = ham.trim().toLocaleLowerCase('tr');
    if (metin === 'tum') return 'tum';
    if ((KADEME_KIMLIKLERI as readonly string[]).includes(metin)) return metin as KademeId;
    if (/^\d{1,2}$/.test(metin)) return sinifinKademesi(Number(metin)) ?? VARSAYILAN_KADEME_DUZEYI;
    return VARSAYILAN_KADEME_DUZEYI;
  }
  if (typeof ham === 'number') return sinifinKademesi(ham) ?? VARSAYILAN_KADEME_DUZEYI;
  return VARSAYILAN_KADEME_DUZEYI;
}

const gorunenKumeleri = new Map<KademeId, ReadonlySet<string>>();

/** Kademede panelde görünen araç kimlikleri; 'tum' için null (süzgeç yok). */
export function gorunenAraclar(duzey: KademeDuzeyi): ReadonlySet<string> | null {
  if (duzey === 'tum') return null;
  let kume = gorunenKumeleri.get(duzey);
  if (!kume) {
    kume = new Set<string>([...HER_KADEMEDE_ACIK_ARACLAR, ...KADEME_DUZEYLERI[duzey].araclar]);
    gorunenKumeleri.set(duzey, kume);
  }
  return kume;
}

/** Araç bu kademede panelde görünür mü? */
export function aracGorunurMu(duzey: KademeDuzeyi, arac: string): boolean {
  const kume = gorunenAraclar(duzey);
  return kume === null || kume.has(arac);
}

/** Araç listesini kademeye göre süzer (sıra korunur). */
export function araclariSuz<T extends { id: string }>(araclar: readonly T[], duzey: KademeDuzeyi): T[] {
  const kume = gorunenAraclar(duzey);
  return kume === null ? [...araclar] : araclar.filter((a) => kume.has(a.id));
}

/**
 * Araç gruplarını kademeye göre süzer: her grupta yalnız görünen araçlar kalır, boşalan grup düşer.
 * Grup sayaçları (panelde grup adının yanındaki sayı) bu süzülmüş listeden sayılır.
 */
export function gruplariSuz<G extends { tools: readonly { id: string }[] }>(gruplar: readonly G[], duzey: KademeDuzeyi): G[] {
  if (duzey === 'tum') return [...gruplar];
  return gruplar
    .map((grup) => ({ ...grup, tools: araclariSuz(grup.tools, duzey) }))
    .filter((grup) => grup.tools.length > 0);
}

/** Süzülmüş gruplardaki toplam araç sayısı */
export function gorunenAracSayisi(gruplar: readonly { tools: readonly { id: string }[] }[], duzey: KademeDuzeyi): number {
  return gruplariSuz(gruplar, duzey).reduce((toplam, grup) => toplam + grup.tools.length, 0);
}

/**
 * Kademe seçildiğinde grupların başlangıç açıklığı: az araçlı kademede (ACIK_GRUP_SINIRI) hepsi açık,
 * diğerlerinde ve "Tüm araçlar"da grupların kendi varsayılanı.
 */
export function grupAcikliklari(
  gruplar: readonly { id: string; defaultExpanded?: boolean; tools: readonly { id: string }[] }[],
  duzey: KademeDuzeyi,
): Record<string, boolean> {
  const hepsiAcik = duzey !== 'tum' && gorunenAracSayisi(gruplar, duzey) <= ACIK_GRUP_SINIRI;
  return Object.fromEntries(gruplar.map((g) => [g.id, hepsiAcik ? true : (g.defaultExpanded ?? true)]));
}
