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
  'Ç(M, r): alan = πr² ≈ 28,27 br².',
  'Ç(M, r): çevre = 2πr ≈ 18,85 br.',
  'Ç(M, r): r = 3 br.',
  'Ç(M, r): r = |MB| = 3 br.',
  'Ç(M, r): çap = 6 br.',
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

/** Sınanan bütün yanıt metinleri. */
export const CEVAP_ORNEKLERI: readonly string[] = [...OLCME_YANITLARI, ...CIZIM_YANITLARI, ...IPUCU_YANITLARI];
