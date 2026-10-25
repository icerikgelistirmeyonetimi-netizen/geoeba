import type { Point2D } from '@/types/math';

/* Tuval katmanlarının ekran uzayındaki ortak geometri yardımcıları (etiket yönleri, ağırlık merkezi). */

/** Ekran noktalarının ağırlık merkezi (köşelerin ortalaması) */
export function agirlikMerkezi(noktalar: readonly Point2D[]): Point2D {
  return {
    x: noktalar.reduce((t, k) => t + k.x, 0) / noktalar.length,
    y: noktalar.reduce((t, k) => t + k.y, 0) / noktalar.length,
  };
}

/**
 * a→b ekran doğrultusunun ekranda YUKARI bakan birim normali (tam dikeyde sağa bakan). Doğrusal nesnelerin uzunluk
 * yazısı bunun tersine (alta, dikeyde sola) konur; üst yan, üzerindeki noktalar arası uzunluk ('distance')
 * etiketlerine kalır. Çizim yönünden bağımsızdır: sağdan sola ya da dikey çizilmiş çizgide iki etiket üst üste binmez.
 */
export function yukariNormal(a: Point2D, b: Point2D): Point2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const boy = Math.hypot(dx, dy) || 1;
  const x = -dy / boy;
  const y = dx / boy;
  return y > 1e-9 || (Math.abs(y) <= 1e-9 && x < 0) ? { x: -x, y: -y } : { x, y };
}

/**
 * a→b kenarının, `orta` noktasından `merkez`den UZAKLAŞAN yöndeki birim normali: çokgen kenarının yazısı bu yönde
 * şeklin dışına konur.
 */
export function distaKalanNormal(a: Point2D, b: Point2D, orta: Point2D, merkez: Point2D): Point2D {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const boy = Math.hypot(dx, dy) || 1;
  const x = -dy / boy;
  const y = dx / boy;
  return (orta.x - merkez.x) * x + (orta.y - merkez.y) * y < 0 ? { x: -x, y: -y } : { x, y };
}
