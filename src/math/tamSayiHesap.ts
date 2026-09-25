/**
 * TAM SAYI HESAPLARI — kullanıcı isteği (2026-09-25):
 *   "açı ve uzunluklar virgüllü değer almasın, hep tam sayı olsun"
 *   "hesaplamalarda tam sayıya göre olmalı ki hatalı sonuç almayalım — alan, çevre vs."
 *
 * Tuvaldeki uzunluk ve açılar tam sayıya yuvarlanarak yazılır. Türetilen ölçüler (çevre, alan) GÖRÜNEN tam
 * sayılardan hesaplanır ki öğrencinin kenarları toplayarak ya da çarparak bulduğu sonuç uygulamanınkiyle
 * çelişmesin. Tam sayılardan hesaplanan sonuç kesirli çıkabilir (dik üçgen: 3 × 5 / 2 = 7,5); bu kesin bir
 * sonuçtur ve öyle yazılır (kullanıcı: "sonuç virgüllü çıkabilir sorun değil").
 *
 * Kurallar
 * - Çokgenin çevresi: görünen kenar uzunluklarının toplamı.
 * - Dikdörtgenin (kare dahil) alanı: görünen iki komşu kenarın çarpımı.
 * - Dik üçgenin alanı: görünen dik kenarların çarpımının yarısı.
 * - Öteki çokgenler: gerçek alan tam sayıya yuvarlanır (görünen değerlerden alanı veren bir formül yok:
 *   yükseklik yazılmıyor).
 * - Daire alanı / çember çevresi: görünen (tam sayı) yarıçapla π kullanılarak.
 * - Bir çokgenin BÜTÜN iç açıları ölçülmüşse yuvarlama toplamı korur ((n − 2) · 180°): 59,6 + 59,6 + 60,8
 *   ayrı ayrı yuvarlanınca 60 + 60 + 61 = 181 olurdu.
 *
 * "Dik" kararı ekrandaki kare işaretiyle aynıdır: açı tam sayıya yuvarlanınca 90 ise diktir.
 */
import type { Point2D } from '@/types/math';

export interface TamSayiSonucu {
  /** Görünen tam sayılardan hesaplanan değer (kesirli olabilir) */
  deger: number;
  /** Şeklin GERÇEK değerinden farklı mı? (yazıda '≈') */
  yaklasik: boolean;
  /** Değer kesin bir tam sayı hesabının sonucu mu? (basamağı yuvarlanmaz: 7,5 kalır) */
  sabitBasamak: boolean;
}

const YUVARLAMA_ESIGI = 1e-9;

const kenarlar = (k: readonly Point2D[]): number[] =>
  k.map((p, i) => {
    const q = k[(i + 1) % k.length];
    return Math.hypot(q.x - p.x, q.y - p.y);
  });

/** Köşedeki iç açı (derece, 0–180): önceki ve sonraki köşeye giden kollar arasında. */
function koseAcisi(k: readonly Point2D[], i: number): number {
  const n = k.length;
  const p = k[i], a = k[(i - 1 + n) % n], b = k[(i + 1) % n];
  const ux = a.x - p.x, uy = a.y - p.y, vx = b.x - p.x, vy = b.y - p.y;
  const bu = Math.hypot(ux, uy), bv = Math.hypot(vx, vy);
  if (!(bu > 0) || !(bv > 0)) return 0;
  const c = Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (bu * bv)));
  return (Math.acos(c) * 180) / Math.PI;
}

const dikMi = (derece: number) => Math.round(derece) === 90;

/** Çokgenin çevresi: görünen (tam sayıya yuvarlanmış) kenarların toplamı. */
export function tamSayiCevre(k: readonly Point2D[]): TamSayiSonucu {
  const L = kenarlar(k);
  const R = L.map((l) => Math.round(l));
  const deger = R.reduce((t, x) => t + x, 0);
  const gercek = L.reduce((t, x) => t + x, 0);
  return { deger, yaklasik: Math.abs(deger - gercek) > YUVARLAMA_ESIGI, sabitBasamak: true };
}

/**
 * Çokgenin alanı: dikdörtgende ve dik üçgende görünen kenarlardan; öteki çokgenlerde gerçek alanın
 * tam sayıya yuvarlanmışı.
 */
export function tamSayiAlan(k: readonly Point2D[], gercekAlan: number): TamSayiSonucu {
  const n = k.length;
  const R = kenarlar(k).map((l) => Math.round(l));
  const sonuc = (deger: number, sabit: boolean): TamSayiSonucu =>
    ({ deger, yaklasik: Math.abs(deger - gercekAlan) > YUVARLAMA_ESIGI, sabitBasamak: sabit });
  if (n === 4 && [0, 1, 2, 3].every((i) => dikMi(koseAcisi(k, i)))) return sonuc(R[0] * R[1], true);
  if (n === 3) {
    const dik = [0, 1, 2].find((i) => dikMi(koseAcisi(k, i)));
    // Dik köşedeki kollar: (i−1 → i) ve (i → i+1) kenarları
    if (dik !== undefined) return sonuc((R[(dik + 2) % 3] * R[dik]) / 2, true);
  }
  return sonuc(Math.round(gercekAlan), true);
}

/** Daire alanı: görünen (tam sayı) yarıçapla πr². */
export function tamSayiDaireAlani(r: number): TamSayiSonucu {
  const rr = Math.round(r);
  const deger = Math.PI * rr * rr;
  return { deger, yaklasik: true, sabitBasamak: false };
}

/** Çember çevresi: görünen (tam sayı) yarıçapla 2πr. */
export function tamSayiCemberCevresi(r: number): TamSayiSonucu {
  const rr = Math.round(r);
  return { deger: 2 * Math.PI * rr, yaklasik: true, sabitBasamak: false };
}

/**
 * Toplamı korunan yuvarlama (en büyük kalan yöntemi): değerler tam sayıya yuvarlanır ve toplamları
 * `hedef` olur. Aşağı yuvarlanan değerlerin kalanı büyük olandan başlayarak birer yukarı alınır.
 * Toplam tutmuyorsa (değerler zaten `hedef`e eşit toplanmıyorsa) düz yuvarlamayla döner.
 */
export function toplamiKoruyarakYuvarla(degerler: readonly number[], hedef: number): number[] {
  const toplam = degerler.reduce((t, x) => t + x, 0);
  if (Math.abs(toplam - hedef) > 1e-6 || !Number.isInteger(Math.round(hedef))) return degerler.map((x) => Math.round(x));
  const taban = degerler.map((x) => Math.floor(x + 1e-9));
  let eksik = Math.round(hedef) - taban.reduce((t, x) => t + x, 0);
  const sira = degerler
    .map((x, i) => ({ i, kalan: x - taban[i] }))
    .sort((a, b) => b.kalan - a.kalan || a.i - b.i);
  for (const { i } of sira) {
    if (eksik <= 0) break;
    taban[i] += 1;
    eksik -= 1;
  }
  return taban;
}
