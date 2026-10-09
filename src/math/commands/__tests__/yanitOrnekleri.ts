/**
 * KOMUT YANITLARININ YAZIM ÖRNEKLERİ — paylaşılan sınama verisi (test değil, fikstür).
 *
 * Buradaki her dize motorun GERÇEKTEN ürettiği bir yanıt ya da ipucu metnidir (measure / basic / edit
 * aileleri ve tuval araçlarının ipuçları). seslendirme.test.ts her biri için şunu güvence altına alır:
 *  - metniSeslendir(...) hiçbir sembol içermez (ekran okuyucu "dikey çizgi", "m sol parantez" demez),
 *  - duzMetin(metniCozumle(...)) === özgün dize (pano ve panel gösterimi metni bozmaz),
 *  - latex(metniCozumle(...)) geçerli LaTeX'tir ("LaTeX kopyala" düğmesi).
 *
 * Yeni bir yanıt biçimi eklendiğinde örneği BURAYA eklenir; yazım kuralları src/math/matematikYazimi.ts.
 */

/** Ölçme ailesi: alan, çevre, uzunluk, açı, çember/yay parçaları, eğim, koordinat. */
export const OLCME_YANITLARI = [
  'A(ABC) = 6 br².',
  'A(ABC) = 6 br². Ç(ABC) = 12 br.',
  'A(ABC) ≈ 6,93 br².',
  'A(ABCD) = 4 br².',
  'ABC: A(ABC) = 6 br², Ç(ABC) = 12 br, |AB| = 4 br, |BC| = 5 br, |CA| = 3 br.',
  'ABC (çizili çokgen yok): A(ABC) = 6 br². Tuvalde göstermek için önce “ABC çokgenini çiz” yazın.',
  'ABC kenarları: |AB| = 4 br, |BC| = 5 br, |CA| = 3 br.',
  'ABC hipotenüsü: |BC| = 5 br.',
  'ABCD köşegenleri: |AC| ≈ 2,83 br, |BD| ≈ 2,83 br.',
  '|AB| = 4 br.',
  '|AB| = 5 br. Ölçüm doğru parçası çizildi.',
  '|AB| = 5 br (doğrunun tanım noktaları arası).',
  'A noktası ile BC doğrusu arasındaki en kısa uzaklık 2,4 br.',
  'm(∠CAB) = 90°. Tuvalde göstermek için “… açısını ölç” yazın.',
  'm(∠BCA) ≈ 53,13°.',
  'm(∠ABC) = 90°. Açı tuvale eklendi.',
  'ABC açıları: m(∠CAB) = 90°, m(∠ABC) ≈ 36,87°, m(∠BCA) ≈ 53,13° (toplam 180°); açılar tuvale eklendi.',
  'ABC en büyük açısı: m(∠CAB) = 90°.',
  'E noktasındaki açılar: m(∠FEI) = 90°, m(∠IEG) = 135°, m(∠GEF) = 135°.',
  'm(∠ABC) = 300° (dış açı).',
  'm(∠ABC) ≈ 36,87° (dik üçgen): sin = 0,6, cos = 0,8, tan = 0,75. Oranlar tuvale eklendi.',
  'sin 30° = 0,5.',
  'tan 90° = tanımsız.',
  'M Merkezli Çember: alan = πr² ≈ 28,27 br².',
  'M Merkezli Çember: çevre = 2πr ≈ 18,85 br.',
  'M Merkezli Çember: r = 3 br.',
  'M Merkezli Çember: r = |MB| = 3 br.',
  'M Merkezli Çember: çap = 6 br.',
  'E Merkezli Elips: alan = πab ≈ 18,85 br².',
  'SD Yayı: |S͡D| ≈ 3,14 br.',
  'SD Yayı: m(S͡D) = 90°.',
  'SD Yayı: kiriş |SD| ≈ 2,83 br.',
  'SD Yayı: çap |SD| = 2r = 4 br.',
  'SD Yayı: r = |MS| = 2 br.',
  'SD Yayı: kiriş |SD| ≈ 2,83 br, |S͡D| ≈ 3,14 br, r = |MS| = 2 br, m(S͡D) = 90°.',
  'A(SMD dilimi) ≈ 3,14 br².',
  'Ç(SMD dilimi) ≈ 7,14 br.',
  'BD yayı: |B͡D| ≈ 4,71 br, m(B͡D) = 90°.',
  'BCD yayı: |B͡C͡D| ≈ 14,14 br, m(B͡C͡D) = 270°.',
  'BD yarım çemberi: |B͡D| ≈ 9,42 br, m(B͡D) = 180° (yarım çember).',
  'AB eğimi = 2.',
  'AB eğimi ≈ 1,3333.',
  'AB eğimi tanımsız (dikey doğru).',
  'AB eğimi = 2. Eğim açısı (x ekseniyle) ≈ 63,43°.',
  'y = 2x + 1: eğim = 2.',
  'f(x) = 3x - 2: eğim = 3.',
  'AB Doğrusu: y = 2x + 1.',
  'c1: (x − 1)² + (y + 2)² = 9.',
  'A(0; 0), B(4; 0).',
  'A(2,5; -3): apsis (x) = 2,5.',
  'ABC: alan, çevre gizlendi.',
] as const;

/** Oluşturma ve düzenleme aileleri: açı çizme, uzunluk/açı değiştirme, pergel. */
export const CIZIM_YANITLARI = [
  'm(∠ABC) = 90° açısı çizildi.',
  'm(∠ABC) = 60° açısı çizildi. A ve C noktaları oluşturuldu.',
  'ABC üçgeninin 3 açısı çizildi: m(∠CAB) = 90°, m(∠ABC) ≈ 36,9°, m(∠BCA) ≈ 53,1°.',
  '∠ABC zaten vardı; ölçüsü gösteriliyor (90°).',
  'm(∠ABC) = 30° yapıldı; C noktası (1,4; 1,5) konumuna taşındı.',
  '|AB| = 10 br yapıldı; B noktası (6; 8) konumuna taşındı.',
  'Pergelle A merkezli çember çizildi (r = 3 br).',
  '[AB] doğru parçası çizildi.',
  '△ABC üçgeni çizildi.',
] as const;

/** Tuval araçlarının ipuçları ve geçmiş adımları (WorkspaceContext, Canvas). */
export const IPUCU_YANITLARI = [
  'Açı ölçümü: m(∠ABC) = 60°',
  'Açı ölçümü: şimdi köşe (tepe) noktasına tıklayın',
  'Uzunluk ölçümü: |AB| = 5 cm',
  'Birim ölçümü: |AB| = 5 br',
  '|AB| = 5 cm ölçüldü',
  'A(ABC) = 12 br² hesaplandı',
  'Ç(ABC) = 24 br hesaplandı',
  'Çember tamamlandı: r = 3 br',
  '∠ABC açısı silindi. Geri almak için Geri Al’ı (Ctrl+Z) kullanın.',
] as const;

/** Teoremler ve klasik şekiller ailesi (handlers/teoremler): bağıntılar çarpma (×), bölme (/), kare (²) ve karekök(…) içerir. */
export const TEOREM_YANITLARI = [
  'ABC Öklid üçgeni çizildi: m(∠BAC) = 90°, hipotenüs |BC| = 5 br, yükseklik |AH| = 2,4 br, |BH| = 1,8 br, |HC| = 3,2 br. Öklid bağıntıları: |AH|² = |BH| × |HC| (5,76 = 1,8 × 3,2), |AB|² = |BH| × |BC| (9 = 1,8 × 5), |AC|² = |HC| × |BC| (16 = 3,2 × 5), |AB| × |AC| = |BC| × |AH| (12 = 12). Dik kenarlar 3 ve 4 birim alındı.',
  'ABC dik üçgeni ve kenarları üzerine kareler çizildi. Pisagor bağıntısı: |AB|² + |AC|² = |BC|²: 9 + 16 = 25 (karelerin alanları 9, 16 ve 25 br²). Dik kenarlar 3 ve 4 birim alındı.',
  'Evet, ABC üçgeninde Pisagor bağıntısı sağlanır: |AB|² + |AC|² = 16 + 9 = 25, |BC|² = 25; üçgen diktir (m(∠BAC) = 90°). Hipotenüs |BC| = 5 br.',
  'Tales teoremi şekli çizildi: ABC üçgeninde DE paralel BC. |AD| / |DB| = |AE| / |EC| = 1 (2,5 / 2,5 ≈ 3,2 / 3,2) ve |AD| / |AB| = |DE| / |BC| = 0,5 (2,5 / 5 = 4 / 8). D noktasını sürüklediğinizde oranlar birlikte değişir.',
  'Tales çemberi: [AB] çap, C çember üzerinde; m(∠ACB) = 90°. C noktasını çember üzerinde sürükleseniz de açı 90° kalır.',
  'DE orta tabanı çizildi: D, [CA] orta noktası; E, [CB] orta noktası. DE paralel AB ve |DE| = |AB| / 2 (3 = 6 / 2).',
  'Açıortay teoremi (A köşesi): |AB| / |AC| = |BD| / |DC| (6 / 4,47 = 3,24 / 2,42 = 1,34). Açıortay uzunluğu |AD|² = |AB| × |AC| − |BD| × |DC| (6 × 4,47 − 3,24 × 2,42 = 19; |AD| ≈ 4,36 br).',
  'Kenarortay teoremi (A köşesi, D noktası [BC] orta noktası): 2 × |AD|² = |AB|² + |AC|² − |BC|² / 2 (2 × 20 = 36 + 20 − 32 / 2; 40 = 40); |AD| ≈ 4,47 br.',
  'Sinüs teoremi (ABC): |BC| / sin A = |CA| / sin B = |AB| / sin C = 2r: 5,66 / sin 63,43° = 4,47 / sin 45° = 6 / sin 71,57° = 6,32 (r = 3,16 br, çevrel çemberin yarıçapı).',
  'Heron formülü (ABC): u = (|AB| + |BC| + |CA|) / 2 = (6 + 5,66 + 4,47) / 2 = 8,06; A(ABC) = karekök(u × (u − |AB|) × (u − |BC|) × (u − |CA|)) = karekök(8,06 × 2,06 × 2,41 × 3,59) = karekök(144) = 12 br².',
  'Hayır: kenarları 2, 3 ve 7 olan üçgen çizilemez. 2 + 3 = 5, en uzun kenar 7 bundan büyük; üçgen eşitsizliği bozulur (iki kenarın toplamı üçüncü kenardan büyük olmalı).',
  'ABC üçgeninin Euler doğrusu çizildi: O (çevrel çemberin merkezi), G (ağırlık merkezi) ve H (diklik merkezi) aynı doğru üzerinde; |OG| : |GH| = 1 : 2 (|OG| ≈ 0,47 br, |GH| ≈ 0,94 br).',
  'AB kirişi çizildi: |AB| ≈ 5,2 br. En uzun kiriş çaptır (2r = 6 br).',
  'P çemberin dışında; çembere göre kuvveti |PM|² − r² = 36 − 9 = 27. P\'den geçen her kesen için |PA| × |PB| = 27; teğet için |PT|² = 27.',
  'Çevre açı, aynı yayı gören merkez açının yarısıdır: m(∠ACB) = m(∠AMB) / 2 (70° = 140° / 2). C noktasını aynı yay üzerinde sürükleseniz de açı değişmez.',
] as const;

/** Sınanan bütün yanıt metinleri. */
export const CEVAP_ORNEKLERI: readonly string[] = [...OLCME_YANITLARI, ...CIZIM_YANITLARI, ...IPUCU_YANITLARI, ...TEOREM_YANITLARI];
