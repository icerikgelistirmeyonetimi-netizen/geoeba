import type { Point2D } from '@/types/math';

/**
 * Pergelin durumu. Gerçek pergel gibi çalışır ve ara nokta üretmez: 1. tıklama iğneyi saplar; imleç açıklığı belirler,
 * 2. tıklama sabitler; imleç yayın başlangıcını seçer, 3. tıklama sabitler; imleç merkez çevresinde döndükçe yay
 * taranır, 4. tıklama çizimi bitirir (tam tura ulaşılırsa çember kaydedilir).
 */
export interface PergelDurumu {
  merkez: Point2D;
  /** null iken AÇIKLIK (yarıçap) belirleniyor */
  yaricap: number | null;
  /** null iken yayın BAŞLANGIÇ açısı belirleniyor (radyan, dünya yönü: 0 = sağ, CCW +) */
  baslangic: number | null;
  /**
   * Aşamaya göre: yarıçap, başlangıç açısı ya da TARAMA. Tarama İŞARETLİDİR: pozitif saat yönünün tersi, negatif saat
   * yönü; böylece yay istenen yöne çizilir.
   */
  tarama: number;
  /** Tarama sırasında imlecin bir önceki ham açısı (sürekli toplama için) */
  sonHamAci: number;
}

/**
 * İmleç hareketinin pergele etkisi. Açıklık aşamasında imlecin iğneye GERÇEK uzaklığı ölçülür (yalnız yatay bileşen
 * alınınca fareyi yukarı-aşağı oynatmak hiçbir şey yapmıyordu; ekranda açıklık yine yatay çubuk görünür). Başlangıç
 * aşamasında kalemin çemberdeki açısı [0, 2π) izlenir. Tarama aşamasında açı imlecin GİTTİĞİ yöne göre işaretli birikir
 * (en kısa dönüş: 359° → 1° geçişi sıçramaz) ve ±2π ile sınırlıdır; yay iki yöne de çizilebilir.
 */
export function pergelIlerlet(p: PergelDurumu, imlec: Point2D): PergelDurumu {
  if (p.yaricap === null) return { ...p, tarama: Math.hypot(imlec.x - p.merkez.x, imlec.y - p.merkez.y) };
  const ham = Math.atan2(imlec.y - p.merkez.y, imlec.x - p.merkez.x);
  const aci = ham < 0 ? ham + 2 * Math.PI : ham;
  if (p.baslangic === null) return { ...p, tarama: aci };
  let fark = aci - p.sonHamAci;
  while (fark <= -Math.PI) fark += 2 * Math.PI;
  while (fark > Math.PI) fark -= 2 * Math.PI;
  return { ...p, tarama: Math.max(-2 * Math.PI, Math.min(2 * Math.PI, p.tarama + fark)), sonHamAci: aci };
}
