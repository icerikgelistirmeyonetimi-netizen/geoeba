import type { ToolMode } from '@/types/workspace';

/**
 * YAZARAK ÇİZİM İŞLEM LİSTESİ
 *
 * Araç çubuğundaki HER aracın yazıyla nasıl yapıldığının tek listesi. Yeni bir araç eklendiğinde buraya da
 * eklenmelidir: `catalog.test.ts` araç çubuğundaki her aracın burada olduğunu ve her örneğin gerçekten
 * çalıştığını denetler.
 *
 * - tool:     araç çubuğundaki kimlik (toolDefinitions.tsx)
 * - family:   komutu işleyen modül (src/math/commands/handlers/<family>.ts)
 * - verbs:    anlaşılan eylemler (ekli biçimleri de tanınır: çiz → çizer misin, çizin, çizelim…)
 * - nouns:    araca karşılık gelen adlar ve eş anlamlıları
 * - params:   yazıyla verilebilen değerler
 * - setup:    örneklerden önce çalıştırılan hazırlık komutu (örnek var olan nesneye ihtiyaç duyuyorsa)
 * - examples: çalışan örnek komutlar
 */
export type CommandFamily = 'app' | 'basic' | 'circles' | 'polygons' | 'constructions' | 'transforms' | 'measure' | 'edit' | 'algebra';

export interface OperationEntry {
  tool: ToolMode | null;
  name: string;
  group: string;
  family: CommandFamily;
  verbs: string[];
  nouns: string[];
  params: string[];
  setup?: string;
  examples: string[];
}

export const TOOLBAR_OPERATIONS: OperationEntry[] = [
  // Temel Çizim Araçları
  { tool: 'point', name: 'Nokta', group: 'Temel Çizim Araçları', family: 'basic', verbs: ['oluştur', 'koy', 'ekle', 'çiz', 'işaretle'], nouns: ['nokta', 'orijin'],
    params: ['ad', 'koordinat (x; y)', 'bir nesnenin üzerinde'],
    examples: ['A(2; 3) noktası oluştur', 'P (2,5; -3,2) noktası oluştur', 'A(0,0), B(4,0) ve C(2,3) noktalarını oluştur', 'orijine O noktası koy'] },
  { tool: 'segment', name: 'Doğru Parçası', group: 'Temel Çizim Araçları', family: 'basic', verbs: ['çiz', 'birleştir', 'oluştur'], nouns: ['doğru parçası', 'parça', 'kenar', '[AB]'],
    params: ['iki nokta', 'iki koordinat'],
    examples: ['AB doğru parçası çiz', 'A ile B noktalarını birleştir', '(0,0) ile (4,3) arasında doğru parçası çiz'] },
  { tool: 'line', name: 'Doğru', group: 'Temel Çizim Araçları', family: 'basic', verbs: ['çiz', 'oluştur', 'geçir'], nouns: ['doğru', 'yatay doğru', 'dikey doğru'],
    params: ['iki nokta', 'geçtiği nokta ve eğim', 'x = sabit'],
    examples: ['AB doğrusunu çiz', 'eğimi 2 olan ve A noktasından geçen doğru çiz', 'x = 3 doğrusunu çiz'] },
  { tool: 'ray', name: 'Işın', group: 'Temel Çizim Araçları', family: 'basic', verbs: ['çiz', 'oluştur'], nouns: ['ışın'],
    params: ['başlangıç noktası', 'geçtiği nokta'],
    examples: ['AB ışınını çiz', 'A noktasından başlayıp B noktasından geçen ışın çiz'] },
  { tool: 'segment_length', name: 'Ölçülü Parça', group: 'Temel Çizim Araçları', family: 'basic', verbs: ['çiz', 'oluştur'], nouns: ['doğru parçası', 'uzunluk'],
    params: ['başlangıç noktası', 'uzunluk'], setup: 'A(0; 0) noktası oluştur',
    examples: ['A noktasından başlayan 5 birimlik doğru parçası çiz', 'uzunluğu 7 olan doğru parçası çiz'] },
  { tool: 'circle', name: 'Çember', group: 'Temel Çizim Araçları', family: 'circles', verbs: ['çiz', 'oluştur'], nouns: ['çember', 'daire'],
    params: ['merkez', 'yarıçap', 'çap', 'geçtiği nokta', 'denklem'], setup: 'A(0; 0) ve B(3; 0) noktalarını oluştur',
    examples: ['yarıçapı 3 olan çember çiz', 'A merkezli ve B noktasından geçen çember çiz', 'çapı 8 olan çember çiz', '(x-1)^2 + (y-2)^2 = 9 çemberini çiz'] },
  { tool: 'pen', name: 'Kalem', group: 'Temel Çizim Araçları', family: 'app', verbs: ['aç', 'seç', 'çiz'], nouns: ['kalem', 'serbest çizim'], params: [],
    examples: ['kalem aracını aç', 'serbest çizim yap'] },

  // Düzenleme Araçları
  { tool: 'select', name: 'Seç ve Taşı', group: 'Düzenleme Araçları', family: 'edit', verbs: ['seç', 'taşı', 'kaydır'], nouns: ['nesne', 'şekil', 'nokta'],
    params: ['nesne adı', 'hedef koordinat', 'öteleme miktarı'], setup: 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['ABC üçgenini seç', 'tüm noktaları seç', 'A noktasını (1; 1) konumuna taşı', 'ABC üçgenini 2 birim sağa kaydır'] },
  { tool: 'delete', name: 'Sil', group: 'Düzenleme Araçları', family: 'edit', verbs: ['sil', 'kaldır', 'temizle'], nouns: ['nesne', 'şekil'],
    params: ['nesne adı', 'nesne türü', 'seçili', 'son çizilen'], setup: 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur, ABC üçgenini çiz, yarıçapı 1 olan çember çiz',
    examples: ['ABC üçgenini sil', 'tüm çemberleri sil', 'C noktasını sil'] },

  // Ölçme Araçları
  { tool: 'measure_distance', name: 'Uzunluk Ölç (cm)', group: 'Ölçme Araçları', family: 'measure', verbs: ['ölç', 'hesapla', 'göster', 'bul'], nouns: ['uzunluk', 'mesafe', 'uzaklık'],
    params: ['iki nokta', 'doğru parçası'], setup: 'A(0; 0) ve B(3; 4) noktalarını oluştur, AB doğru parçası çiz',
    examples: ['AB uzunluğunu ölç', 'A ile B arasındaki mesafe kaç?', '[AB] parçasının uzunluğunu göster'] },
  { tool: 'unit_measure', name: 'Birimle Ölç (br)', group: 'Ölçme Araçları', family: 'measure', verbs: ['ölç'], nouns: ['birim', 'uzunluk'],
    params: ['iki nokta'], setup: 'A(0; 0) ve B(3; 4) noktalarını oluştur',
    examples: ['A ile B arasını birimle ölç'] },
  { tool: 'measure_angle', name: 'Açıölçer', group: 'Ölçme Araçları', family: 'measure', verbs: ['ölç', 'hesapla', 'göster'], nouns: ['açı', 'derece'],
    params: ['üç nokta', 'köşe'], setup: 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['ABC açısını ölç', 'A noktasının açısını yaz', 'üçgenin tüm açılarını göster'] },
  { tool: 'angle', name: 'Açı Oluştur', group: 'Ölçme Araçları', family: 'basic', verbs: ['çiz', 'oluştur'], nouns: ['açı'],
    params: ['üç nokta', 'derece'], setup: 'A(4; 0), B(0; 0) ve C(0; 4) noktalarını oluştur',
    examples: ['ABC açısını çiz', '60 derecelik açı çiz'] },
  { tool: 'measure_area', name: 'Alanı Bul', group: 'Ölçme Araçları', family: 'measure', verbs: ['ölç', 'hesapla', 'bul', 'göster', 'yaz'], nouns: ['alan', 'yüzölçümü'],
    params: ['şekil'], setup: 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['ABC üçgeninin alanını hesapla', 'üçgenin alanı kaç?'] },
  { tool: 'measure_perimeter', name: 'Çevre Hesapla', group: 'Ölçme Araçları', family: 'measure', verbs: ['ölç', 'hesapla', 'bul', 'göster'], nouns: ['çevre', 'çevre uzunluğu'],
    params: ['şekil'], setup: 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['ABC üçgeninin çevresini hesapla', 'üçgenin çevresini göster'] },
  { tool: 'measure_slope', name: 'Eğim Ölç', group: 'Ölçme Araçları', family: 'measure', verbs: ['ölç', 'hesapla', 'göster'], nouns: ['eğim'],
    params: ['iki nokta'], setup: 'A(0; 0) ve B(2; 4) noktalarını oluştur',
    examples: ['AB eğimini ölç', 'A ile B arasındaki doğrunun eğimi kaç?'] },
  { tool: 'trig_ratios', name: 'Trig. Oranlar', group: 'Ölçme Araçları', family: 'measure', verbs: ['göster', 'hesapla', 'bul'], nouns: ['sinüs', 'kosinüs', 'tanjant', 'trigonometrik oran'],
    params: ['üç nokta (kol, köşe, kol)'], setup: 'A(4; 0), B(0; 0) ve C(0; 3) noktalarını oluştur',
    examples: ['ABC açısının trigonometrik oranlarını göster', 'B açısının sin cos tan değerlerini hesapla'] },
  { tool: 'measure_arc', name: 'Yay Ölç', group: 'Ölçme Araçları', family: 'measure', verbs: ['ölç', 'hesapla', 'bul'], nouns: ['yay', 'yay uzunluğu', 'yayın ölçüsü', 'büyük yay'],
    params: ['aynı çemberin üzerindeki iki nokta', 'yayın geçtiği üçüncü nokta (BCD)', 'büyük / küçük yay'], setup: 'A(0; 0), B(3; 0), C(0; 3) ve D(-3; 0) noktalarını oluştur, A merkezli B noktasından geçen çember çiz',
    examples: ['BC yayını ölç', 'BCD yayını ölç', 'BC büyük yayını ölç', 'BC yayının uzunluğu'] },
  { tool: 'area_model', name: 'Alanı Modelle', group: 'Ölçme Araçları', family: 'polygons', verbs: ['oluştur', 'çiz', 'modelle'], nouns: ['alan modeli', 'birim kare'],
    params: ['sütun', 'satır'],
    examples: ['4 x 3 alan modeli oluştur', '5 sütun 2 satırlık alan modeli çiz'] },
  { tool: 'ruler', name: 'Cetvel', group: 'Ölçme Araçları', family: 'app', verbs: ['aç', 'getir', 'seç'], nouns: ['cetvel'], params: [],
    examples: ['cetveli aç', 'cetvel aracını seç'] },
  { tool: 'setsquare', name: 'Gönye', group: 'Ölçme Araçları', family: 'app', verbs: ['aç', 'getir', 'seç'], nouns: ['gönye'], params: [],
    examples: ['gönyeyi aç'] },

  // Çember Araçları
  { tool: 'circle_radius', name: 'Yarıçapla Çember', group: 'Çember Araçları', family: 'circles', verbs: ['çiz', 'oluştur'], nouns: ['çember', 'yarıçap'],
    params: ['merkez', 'yarıçap'], setup: 'A(1; 1) noktası oluştur',
    examples: ['A merkezli yarıçapı 2 olan çember çiz', '(1,2) merkezli 3 yarıçaplı çember çiz'] },
  { tool: 'circle_3points', name: '3 Noktalı Çember', group: 'Çember Araçları', family: 'circles', verbs: ['çiz', 'oluştur', 'geçir'], nouns: ['çember'],
    params: ['üç nokta'], setup: 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur',
    examples: ['A, B ve C noktalarından geçen çember çiz', 'ABC üçgeninin çevrel çemberini çiz'] },
  { tool: 'arc', name: 'Yay', group: 'Çember Araçları', family: 'circles', verbs: ['çiz', 'oluştur'], nouns: ['yay'],
    params: ['merkez', 'başlangıç', 'bitiş', 'yarıçap', 'derece'], setup: 'M(0; 0), B(3; 0) ve C(0; 3) noktalarını oluştur',
    examples: ['M merkezli B noktasından C noktasına yay çiz', 'yarıçapı 3 olan 90 derecelik yay çiz'] },
  { tool: 'sector', name: 'Daire Dilimi', group: 'Çember Araçları', family: 'circles', verbs: ['çiz', 'oluştur'], nouns: ['daire dilimi', 'dilim', 'yarım daire', 'çeyrek daire'],
    params: ['merkez', 'yarıçap', 'derece'],
    examples: ['60 derecelik daire dilimi çiz', 'yarıçapı 4 olan yarım daire çiz'] },
  { tool: 'ellipse', name: 'Elips', group: 'Çember Araçları', family: 'circles', verbs: ['çiz', 'oluştur'], nouns: ['elips'],
    params: ['merkez', 'yatay yarıçap', 'dikey yarıçap'],
    examples: ['yarıçapları 4 ve 2 olan elips çiz', 'elips çiz'] },

  // Çokgen Araçları
  { tool: 'polygon', name: 'Çokgen', group: 'Çokgen Araçları', family: 'polygons', verbs: ['çiz', 'oluştur'], nouns: ['çokgen', 'üçgen', 'dörtgen', 'paralelkenar', 'yamuk', 'eşkenar dörtgen', 'deltoid'],
    params: ['köşeler', 'kenar uzunlukları', 'açılar', 'yükseklik'],
    examples: ['kenarları 3, 4 ve 5 olan üçgen çiz', 'kenarı 6 olan eşkenar üçgen çiz', '(0,0), (4,0), (4,3) ve (0,3) köşeli çokgen çiz', 'tabanları 6 ve 4, yüksekliği 3 olan yamuk çiz'] },
  { tool: 'rectangle', name: 'Dikdörtgen', group: 'Çokgen Araçları', family: 'polygons', verbs: ['çiz', 'oluştur'], nouns: ['dikdörtgen'],
    params: ['en', 'boy', 'alan'],
    examples: ['eni 3 boyu 5 olan dikdörtgen çiz', '3x4 dikdörtgen çiz'] },
  { tool: 'square', name: 'Kare', group: 'Çokgen Araçları', family: 'polygons', verbs: ['çiz', 'oluştur'], nouns: ['kare'],
    params: ['kenar', 'alan', 'köşegen'],
    examples: ['kenar uzunluğu 4 olan kare çiz', 'alanı 16 olan kare çiz'] },
  { tool: 'regular_polygon', name: 'Düzgün Çokgen', group: 'Çokgen Araçları', family: 'polygons', verbs: ['çiz', 'oluştur'], nouns: ['düzgün çokgen', 'beşgen', 'altıgen', 'sekizgen'],
    params: ['kenar sayısı', 'kenar uzunluğu', 'yarıçap'],
    examples: ['6 kenarlı düzgün çokgen çiz', 'düzgün beşgen çiz', 'kenar uzunluğu 2 olan düzgün sekizgen çiz'] },

  // Cebir & Fonksiyon
  { tool: 'function', name: 'Fonksiyon', group: 'Cebir & Fonksiyon', family: 'algebra', verbs: ['çiz', 'oluştur', 'göster'], nouns: ['fonksiyon', 'grafik', 'parabol'],
    params: ['ifade', 'sözle ifade (x kare, karekök x…)'],
    examples: ['f(x) = x^2', 'x kare fonksiyonu çiz', 'g(x) = sin(x) grafiğini çiz', 'y = 2x + 1 doğrusunu çiz'] },
  { tool: 'slider', name: 'Sürgü', group: 'Cebir & Fonksiyon', family: 'algebra', verbs: ['oluştur', 'ekle', 'yap', 'ayarla', 'oynat'], nouns: ['kaydırıcı', 'sürgü', 'parametre'],
    params: ['ad', 'en küçük', 'en büyük', 'adım', 'değer'],
    examples: ['a kaydırıcısı oluştur', '0 ile 10 arasında adımı 0,5 olan b kaydırıcısı ekle', 'k = 3'] },

  // İnşa Araçları
  { tool: 'midpoint', name: 'Orta Nokta', group: 'İnşa Araçları', family: 'constructions', verbs: ['bul', 'oluştur', 'işaretle'], nouns: ['orta nokta', 'orta'],
    params: ['iki nokta', 'doğru parçası'], setup: 'A(0; 0) ve B(4; 2) noktalarını oluştur',
    examples: ['AB orta noktasını oluştur', 'A ile B noktalarının ortasını bul'] },
  { tool: 'divide_ratio', name: 'Oranda Böl', group: 'İnşa Araçları', family: 'constructions', verbs: ['böl'], nouns: ['oran', 'eşit parça'],
    params: ['iki nokta', 'm:n oranı', 'parça sayısı'], setup: 'A(0; 0) ve B(6; 0) noktalarını oluştur',
    examples: ['AB doğru parçasını 2:1 oranında böl', 'AB doğru parçasını 3 eşit parçaya böl'] },
  { tool: 'perp_bisector', name: 'Orta Dikme', group: 'İnşa Araçları', family: 'constructions', verbs: ['çiz', 'oluştur'], nouns: ['orta dikme'],
    params: ['iki nokta'], setup: 'A(0; 0) ve B(4; 2) noktalarını oluştur',
    examples: ['AB doğru parçasının orta dikmesini çiz'] },
  { tool: 'angle_bisector', name: 'Açıortay', group: 'İnşa Araçları', family: 'constructions', verbs: ['çiz', 'oluştur'], nouns: ['açıortay'],
    params: ['üç nokta', 'köşe'], setup: 'A(4; 0), B(0; 0) ve C(0; 4) noktalarını oluştur',
    examples: ['ABC açısının açıortayını çiz'] },
  { tool: 'perpendicular', name: 'Dik Doğru', group: 'İnşa Araçları', family: 'constructions', verbs: ['çiz', 'indir', 'oluştur'], nouns: ['dik doğru', 'dikme', 'yükseklik'],
    params: ['geçtiği nokta', 'doğrultu'], setup: 'A(0; 3), B(-2; 0) ve C(4; 0) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['A noktasından BC doğrusuna dik doğru çiz', 'A noktasından dik indir'] },
  { tool: 'parallel', name: 'Paralel Doğru', group: 'İnşa Araçları', family: 'constructions', verbs: ['çiz', 'oluştur'], nouns: ['paralel doğru', 'paralel'],
    params: ['geçtiği nokta', 'doğrultu'], setup: 'A(0; 3), B(-2; 0) ve C(4; 0) noktalarını oluştur',
    examples: ['A noktasından geçen ve BC doğrusuna paralel doğru çiz'] },
  { tool: 'compass', name: 'Pergel', group: 'İnşa Araçları', family: 'circles', verbs: ['çiz', 'aç'], nouns: ['pergel'],
    params: ['merkez', 'açıklık'], setup: 'A(0; 0) noktası oluştur',
    examples: ['pergelle A merkezli 3 birim açıklıkla çember çiz', 'pergel aracını seç'] },
  { tool: 'intersect', name: 'Kesiştir', group: 'İnşa Araçları', family: 'constructions', verbs: ['bul', 'kesiştir', 'işaretle'], nouns: ['kesişim', 'kesişim noktası'],
    params: ['iki nesne'], setup: 'A(0; 0), B(4; 4), C(0; 4) ve D(4; 0) noktalarını oluştur, AB doğrusunu çiz, CD doğrusunu çiz',
    examples: ['AB ve CD doğrularının kesişim noktasını bul'] },

  // Dönüşüm Araçları
  { tool: 'rotate', name: 'Şekli Döndür', group: 'Dönüşüm Araçları', family: 'transforms', verbs: ['döndür', 'çevir'], nouns: ['dönme', 'döndürme'],
    params: ['şekil', 'merkez', 'derece', 'yön'], setup: 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['ABC üçgenini A noktası etrafında 90 derece döndür', 'ABC üçgenini saat yönünde 45 derece döndür'] },
  { tool: 'translate', name: 'Öteleme', group: 'Dönüşüm Araçları', family: 'transforms', verbs: ['ötele'], nouns: ['öteleme', 'vektör'],
    params: ['şekil', 'vektör'], setup: 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['ABC üçgenini (3; 2) vektörüyle ötele', 'ABC üçgenini 3 birim sağa ötele'] },
  { tool: 'reflect', name: 'Yansıt', group: 'Dönüşüm Araçları', family: 'transforms', verbs: ['yansıt', 'simetriğini al'], nouns: ['yansıma', 'simetri'],
    params: ['şekil', 'eksen', 'nokta'], setup: 'A(1; 1), B(4; 1) ve C(1; 3) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['ABC üçgenini x eksenine göre yansıt', 'ABC üçgeninin y = x doğrusuna göre simetriğini al'] },
  { tool: 'symmetry', name: 'Simetri Keşfet', group: 'Dönüşüm Araçları', family: 'transforms', verbs: ['yansıt', 'simetriğini al'], nouns: ['simetri'],
    params: ['şekil', 'eksen'], setup: 'A(1; 1), B(4; 1) ve C(1; 3) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['ABC üçgeninin y eksenine göre simetriğini çiz'] },

  // Etkileşim Araçları
  { tool: 'checkbox', name: 'İşaret Kutusu', group: 'Etkileşim Araçları', family: 'algebra', verbs: ['ekle', 'oluştur'], nouns: ['onay kutusu', 'işaret kutusu'],
    params: ['gösterilecek nesneler'], setup: 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['ABC üçgenini gösterip gizleyen onay kutusu ekle'] },
  { tool: 'button', name: 'Düğme', group: 'Etkileşim Araçları', family: 'algebra', verbs: ['ekle', 'oluştur'], nouns: ['düğme', 'buton'],
    params: ['görev: göster/gizle, oynat, değer ata'], setup: 'a kaydırıcısı oluştur',
    examples: ['a kaydırıcısını oynatan düğme ekle', 'a kaydırıcısını 0 yapan düğme ekle'] },
  { tool: 'input_box', name: 'Girdi Kutusu', group: 'Etkileşim Araçları', family: 'algebra', verbs: ['ekle', 'oluştur'], nouns: ['girdi kutusu', 'giriş kutusu'],
    params: ['kaydırıcı ya da fonksiyon'], setup: 'a kaydırıcısı oluştur',
    examples: ['a için girdi kutusu ekle'] },

  // Kesir & Medya
  { tool: 'fraction', name: 'Kesir Göster', group: 'Kesir & Medya', family: 'algebra', verbs: ['göster', 'oluştur', 'çiz'], nouns: ['kesir', 'kesir modeli', 'şerit model'],
    params: ['pay/payda', 'model türü'],
    examples: ['3/4 kesir modeli oluştur', 'üç bölü dört kesrini göster', '2/5 kesrini şerit modeliyle göster'] },
  { tool: 'image', name: 'Görsel Ekle', group: 'Kesir & Medya', family: 'algebra', verbs: ['ekle', 'yükle'], nouns: ['görsel', 'resim', 'fotoğraf'], params: [],
    examples: ['resim ekle'] },
  { tool: 'text', name: 'Yazı Ekle', group: 'Kesir & Medya', family: 'algebra', verbs: ['yaz', 'ekle'], nouns: ['yazı', 'metin', 'not'],
    params: ['tırnak içinde yazı', 'konum', 'boyut', 'renk'],
    examples: ['"Merhaba" yazısı ekle', '(2,3) noktasına "tepe" yaz'] },
];

/** Araç çubuğunda ayrı düğmesi olmayan ama yazıyla yapılabilen işlemler. */
export const EXTRA_OPERATIONS: OperationEntry[] = [
  { tool: null, name: 'Renk / dolgu / kalınlık', group: 'Düzenleme', family: 'edit', verbs: ['boya', 'yap', 'doldur', 'kaldır'], nouns: ['renk', 'dolgu', 'kalınlık'],
    params: ['renk adı', 'saydamlık'], setup: 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['ABC üçgenini kırmızı yap', 'ABC üçgeninin dolgusunu kaldır'] },
  { tool: null, name: 'Gizle / göster / adlandır', group: 'Düzenleme', family: 'edit', verbs: ['gizle', 'göster', 'adlandır'], nouns: ['ad', 'etiket'],
    params: ['nesne', 'yeni ad'], setup: 'A(0; 0) ve B(4; 0) noktalarını oluştur',
    examples: ['A noktasını gizle', 'B noktasının adını P yap'] },
  { tool: null, name: 'Boyut değiştir', group: 'Düzenleme', family: 'edit', verbs: ['yap', 'ayarla', 'değiştir'], nouns: ['uzunluk', 'yarıçap', 'açı'],
    params: ['yeni değer'], setup: 'A(0; 0) ve B(4; 0) noktalarını oluştur, AB doğru parçası çiz',
    examples: ['AB uzunluğunu 5 yap'] },
  { tool: null, name: 'Kopyala', group: 'Düzenleme', family: 'edit', verbs: ['kopyala', 'çoğalt'], nouns: ['kopya'],
    params: ['nesne'], setup: 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['ABC üçgenini kopyala'] },
  { tool: null, name: 'Üçgen inşaları', group: 'İnşa', family: 'constructions', verbs: ['çiz', 'bul', 'oluştur'], nouns: ['yükseklik', 'kenarortay', 'ağırlık merkezi', 'iç teğet çember', 'teğet'],
    params: ['üçgen', 'köşe'], setup: 'A(0; 0), B(6; 0) ve C(2; 4) noktalarını oluştur, ABC üçgenini çiz',
    examples: ['C köşesinden yükseklik çiz', 'ABC üçgeninin ağırlık merkezini bul', 'ABC üçgeninin iç teğet çemberini çiz'] },
  { tool: null, name: 'Fonksiyon değeri ve fonksiyonları birleştirme', group: 'Cebir & Fonksiyon', family: 'algebra', verbs: ['hesapla', 'bul', 'kaç', 'nedir'], nouns: ['fonksiyon değeri', 'f(5)', 'bileşke'],
    params: ['fonksiyon adı (f, g, h …)', 'x değeri'], setup: 'f(x) = x^2 + 1',
    examples: ['f(5) kaç', "f'nin 3'teki değeri nedir", 'g(x) = f(x) - 2', 'a = f(2)', '(2, f(2)) noktasını çiz', 'x = 1 iken f kaç'] },
  { tool: null, name: 'Denklem, eşitsizlik ve parametrik şekiller', group: 'Cebir & Fonksiyon', family: 'circles', verbs: ['çiz', 'tara', 'göster'], nouns: ['çember denklemi', 'eşitsizlik', 'bölge', 'parametrik eğri'],
    params: ['(x−a)² + (y−b)² = r²', 'genel denklem', '≤ / < bölge', 'x = a + r·cos(t), y = b + r·sin(t)'],
    examples: ['x^2 + y^2 - 2x + 4y - 4 = 0', 'x^2 + y^2 <= 9', 'x^2/9 + y^2/4 <= 1', 'y >= 2x + 1', 'x = 3cos(t), y = 3sin(t)'] },
  { tool: null, name: 'Geri al / yinele / temizle', group: 'Uygulama', family: 'app', verbs: ['geri al', 'yinele', 'temizle'], nouns: ['işlem', 'tuval'], params: ['adım sayısı'],
    examples: ['geri al', 'yinele', 'tuvali temizle'] },
  { tool: null, name: 'Görünüm', group: 'Uygulama', family: 'app', verbs: ['göster', 'gizle', 'yakınlaştır', 'uzaklaştır', 'sığdır'], nouns: ['ızgara', 'eksenler', 'koordinatlar', 'görünüm'],
    params: ['kat'], examples: ['ızgarayı gizle', 'yakınlaştır', 'çizimi ekrana sığdır'] },
];

export const ALL_OPERATIONS: OperationEntry[] = [...TOOLBAR_OPERATIONS, ...EXTRA_OPERATIONS];

/** Anlaşılan eylemler (fiiller) ve ne yaptıkları. Ekli biçimler de tanınır (çiz, çizer misin, çizin, çizelim, çizebilir misin…). */
export const VERB_LEXICON: { verb: string; forms: string[]; meaning: string }[] = [
  { verb: 'çiz', forms: ['çiz', 'çizer misin', 'çizin', 'çizelim', 'çizip'], meaning: 'Yeni şekil oluşturur.' },
  { verb: 'oluştur', forms: ['oluştur', 'oluşturun', 'oluşturalım'], meaning: 'Yeni nesne oluşturur.' },
  { verb: 'ekle / koy / kur / çek / indir', forms: ['ekle', 'koy', 'kur', 'çek', 'indir'], meaning: 'Nesne ya da inşa ekler.' },
  { verb: 'birleştir', forms: ['birleştir'], meaning: 'Noktaları doğru parçasıyla birleştirir.' },
  { verb: 'böl', forms: ['böl'], meaning: 'Doğru parçasını oranda ya da eşit parçalara böler.' },
  { verb: 'bul / kesiştir', forms: ['bul', 'kesiştir'], meaning: 'Orta nokta, kesişim, merkez gibi noktaları bulur; ölçüleri hesaplar.' },
  { verb: 'sil / kaldır', forms: ['sil', 'kaldır'], meaning: 'Nesneyi ona bağlı nesnelerle birlikte siler.' },
  { verb: 'ölç / hesapla / kaç / nedir', forms: ['ölç', 'hesapla', 'kaç', 'nedir', 'ne kadar'], meaning: 'Ölçüyü gösterir ve sonucu yazar.' },
  { verb: 'göster / gizle', forms: ['göster', 'gizle'], meaning: 'Ölçüleri, adları, nesneleri ya da görünümü açar/kapatır.' },
  { verb: 'yaz', forms: ['yaz'], meaning: 'Ölçüyü gösterir ya da tırnak içindeki yazıyı ekler.' },
  { verb: 'taşı / kaydır', forms: ['taşı', 'kaydır'], meaning: 'Nesneyi yerinde taşır.' },
  { verb: 'döndür / yansıt / ötele / büyüt / küçült', forms: ['döndür', 'yansıt', 'simetriğini al', 'ötele', 'büyüt', 'küçült'], meaning: 'Dönüşüm uygular (görüntü canlı bağlı oluşur).' },
  { verb: 'boya / yap / ayarla / değiştir', forms: ['kırmızı yap', 'boya', 'ayarla', 'değiştir', 'olsun'], meaning: 'Rengi, boyutu, değeri değiştirir.' },
  { verb: 'adlandır', forms: ['adlandır', 'adını … yap'], meaning: 'Nesneyi yeniden adlandırır.' },
  { verb: 'seç / kopyala', forms: ['seç', 'kopyala', 'çoğalt'], meaning: 'Seçer ya da kopyasını oluşturur.' },
  { verb: 'kilitle / bağla', forms: ['kilitle', 'sabitle', 'bağla'], meaning: 'Noktayı nesneye kilitler; kenarları kaydırıcıya bağlar.' },
  { verb: 'oynat / durdur', forms: ['oynat', 'başlat', 'durdur'], meaning: 'Kaydırıcı canlandırmasını başlatır/durdurur.' },
  { verb: 'geri al / yinele', forms: ['geri al', 'yinele', 'ileri al'], meaning: 'Geçmişte geri/ileri gider.' },
  { verb: 'yakınlaştır / uzaklaştır / sığdır', forms: ['yakınlaştır', 'uzaklaştır', 'sığdır', 'ortala'], meaning: 'Görünümü ayarlar.' },
];
