/**
 * KILAVUZ (IZGARA) NOKTALARI — iki koordinatı da tam sayı olan noktalar. İki ucu da kılavuzda olan bir parçanın
 * uzunluk karesi tam sayıdır (|AB|² = Δx² + Δy²); bu yüzden uzunluk kesin olarak kareköklü yazılabilir (√13, 2√2)
 * ve iki uzunluk kareleriyle tam karşılaştırılabilir (kullanıcı, 2026-10-30: "kareköklü gösterim ortaokulda ve
 * lisede olsun"; eşitlik çentikleri yuvarlanmış değerle değil gerçek değerle).
 */
import type { Point2D } from '@/types/math';

/** Bundan büyük karelerde kareköklü biçim aranmaz (okunmaz; kayan noktada tam kalmayabilir). */
export const KOK_EN_BUYUK_KARE = 1e8;

/** Kılavuz noktası: iki koordinatı da tam sayı (karesi kayan noktada tam kalacak büyüklükte). */
export const kilavuzNoktasiMi = (p: Point2D) =>
  Number.isInteger(p.x) && Number.isInteger(p.y) && Math.abs(p.x) < 1e7 && Math.abs(p.y) < 1e7;

/** İki ucu da kılavuz noktasında olan parçanın uzunluk karesi (Δx² + Δy², tam sayı); değilse undefined. */
export function kilavuzKaresi(a: Point2D, b: Point2D): number | undefined {
  if (!kilavuzNoktasiMi(a) || !kilavuzNoktasiMi(b)) return undefined;
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Kareköklü biçim: √kare = katsayi · √radikand (radikand kare çarpansız; tam karede radikand 1). */
export interface KokluDeger {
  katsayi: number;
  radikand: number;
}

/** √n'yi sadeleştirir: √8 = 2√2, √13 = √13, √16 = 4 (radikand 1). n pozitif tam sayı olmalı. */
export function kokluBicim(n: number): KokluDeger {
  let katsayi = 1;
  let radikand = n;
  for (let i = 2; i * i <= radikand; i++) {
    const kare = i * i;
    while (radikand % kare === 0) {
      radikand /= kare;
      katsayi *= i;
    }
  }
  return { katsayi, radikand };
}
