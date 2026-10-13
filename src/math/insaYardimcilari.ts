/**
 * İnşa ve dönüşüm araçlarının küçük, saf yardımcıları (alan uzmanı, atölye inceleme 4. tur, ortaokul).
 *
 * - Aynı yerde ikinci nokta açılmasın: Orta Nokta ile Orta Dikme aynı orta noktayı iki kez üretiyor, harfler
 *   (D ve F) üst üste yazılıyordu. Yeni nokta kurulmadan önce o konumda nokta var mı diye bakılır.
 * - Dik / Paralel Doğru önce bir doğru ya da doğru parçası seçebilsin: seçilen çizginin iki tanım noktası
 *   doğrultuyu verir, böylece çizginin üstüne tıklamak yeni nokta (I) üretmez.
 * - Her dönüşümün görüntüsü kendi adını alsın: yansımada A', ikinci dönüşümde A'' (Nesneler listesinde iki ayrı
 *   A' görünüyordu).
 * - Kare kenar uzunluğuyla kurulsun: tıklanan köşeden sağa ve yukarı.
 */
import type { MathObject, Point2D, PointObject } from '@/types/math';

/** İki noktanın "aynı yer" sayıldığı en büyük uzaklık (dünya birimi). Kayan nokta artığını yutar. */
export const AYNI_KONUM_ESIGI = 1e-6;

/** Verilen konumda duran (görünür ya da gizli) nokta; yoksa undefined. İlk bulunan döner. */
export function ayniKonumdakiNokta(
  nesneler: readonly MathObject[],
  x: number,
  y: number,
  esik: number = AYNI_KONUM_ESIGI,
): PointObject | undefined {
  return nesneler.find(
    (o): o is PointObject => o.type === 'point' && Math.abs((o as PointObject).x - x) <= esik && Math.abs((o as PointObject).y - y) <= esik,
  );
}

/** Doğrultu veren çizgi: doğru parçası, doğru ve ışın için iki tanım noktasının kimliği; diğer türlerde null. */
export function dogrultuNoktalari(o: MathObject): [string, string] | null {
  if (o.type === 'segment') return [o.startPointId, o.endPointId];
  if (o.type === 'line') return [o.point1Id, o.point2Id];
  if (o.type === 'ray') return [o.startPointId, o.throughPointId];
  return null;
}

/**
 * Dönüşüm görüntüsünün nokta adı: kaynak adına bir üs (') eklenir; o ad kullanılıyorsa üs sayısı artar
 * (A → A', yine A → A'' …). `mevcut` sahnedeki ve bu adımda üretilmiş adlardır.
 */
export function goruntuNoktaAdi(kaynak: string, mevcut: Iterable<string>): string {
  // Adsız nokta (ilkokulda köşeler harf taşımaz): ayırt edilecek ad yok, eski biçim kalır
  if (!kaynak) return "'";
  const kullanilan = new Set(mevcut);
  let ad = `${kaynak}'`;
  while (kullanilan.has(ad)) ad += "'";
  return ad;
}

/** Görüntü noktalarının adları: aynı adımda üretilen adlar birbirini de görür (A'B'C' içinde çakışma olmaz). */
export function goruntuNoktaAdlari(kaynaklar: readonly string[], mevcut: Iterable<string>): string[] {
  const kullanilan = new Set(mevcut);
  return kaynaklar.map((k) => {
    const ad = goruntuNoktaAdi(k, kullanilan);
    kullanilan.add(ad);
    return ad;
  });
}

/** Dönüşüm türünün Nesneler listesinde ve şekil adında yazılan adı. */
export type DonusumTuru = 'yansima' | 'oteleme';
export const DONUSUM_ADLARI: Record<DonusumTuru, string> = { yansima: 'yansıma', oteleme: 'öteleme' };

/** Nesnenin kayıtlı dönüşüm türü (bilinmeyen değer yok sayılır). */
export function donusumTuru(o: MathObject): DonusumTuru | null {
  const d: unknown = o.donusum;
  return d === 'yansima' || d === 'oteleme' ? d : null;
}

/** Kenar uzunluğu verilen karenin köşeleri: tıklanan köşe sol alt, saat yönünün tersine (A, B, C, D). */
export function kareKoseleri(kose: Point2D, kenar: number): [Point2D, Point2D, Point2D, Point2D] {
  return [
    { x: kose.x, y: kose.y },
    { x: kose.x + kenar, y: kose.y },
    { x: kose.x + kenar, y: kose.y + kenar },
    { x: kose.x, y: kose.y + kenar },
  ];
}

/**
 * Kesiştir aracı parça, ışın ve yayı UZANTISIYLA kesiştirir (dar açılı olmayan üçgende yükseklik ayağı kenarın
 * uzantısındadır; bu davranış korunur). Bildirim yanlış söylemesin diye noktanın şeklin KENDİSİNDE mi yoksa
 * uzantısında mı olduğuna bakılır (denetim, 4. tur: "[EF] doğru parçası ile AB doğrusunun kesişim noktası H(10; 5)"
 * deniyordu, H parçanın dışındaydı).
 *
 * Doğrusal şekil: a → b doğrultusunda p'nin parametresi; parça [0, 1], ışın [0, ∞), doğru her yer.
 */
export function cizgininUzerindeMi(tur: 'parca' | 'isin' | 'dogru', a: Point2D, b: Point2D, p: Point2D, tol = 1e-6): boolean {
  if (tur === 'dogru') return true;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const boy2 = dx * dx + dy * dy;
  if (boy2 === 0) return true;
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / boy2;
  return tur === 'isin' ? t >= -tol : t >= -tol && t <= 1 + tol;
}

/** Yay / dilim: p'nin merkezden açısı başlangıçtan saat yönünün tersine `tarama` içinde mi (getArcGeometry). */
export function yayinUzerindeMi(merkez: Point2D, baslangicAcisi: number, tarama: number, p: Point2D, tol = 1e-6): boolean {
  let fark = Math.atan2(p.y - merkez.y, p.x - merkez.x) - baslangicAcisi;
  while (fark < -tol) fark += 2 * Math.PI;
  while (fark >= 2 * Math.PI - tol) fark -= 2 * Math.PI;
  return fark <= tarama + tol || fark >= 2 * Math.PI - tol;
}
