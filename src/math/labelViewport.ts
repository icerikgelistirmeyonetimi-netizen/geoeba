import type { Point2D, ViewportTransform } from '@/types/math';
import { screenToWorld, worldToScreen } from '@/math/coordinates';

/** Etiket yerleşiminin ve yakınlık eşiklerinin hesaplandığı sabit piksel/birim ölçeği. */
export const LABEL_LAYOUT_ZOOM = 44;

/** Yerleşim hesabını yakınlaştırma, kaydırma ve tuval boyutlarından bağımsızlaştırır. */
export function labelLayoutViewport(vp: ViewportTransform): ViewportTransform {
  return { ...vp, width: 0, height: 0, panX: 0, panY: 0, zoom: LABEL_LAYOUT_ZOOM };
}

/** Yerleşim aralıklarını gerçek ekran ölçeğine taşır; yazı boyutundan bağımsızdır. */
export function labelZoomScale(vp: ViewportTransform): number {
  return vp.zoom / LABEL_LAYOUT_ZOOM;
}

/**
 * Yazılar uzaklaşırken şekille küçülür; normal boyun en fazla %5 üzerine çıkar.
 * `altSinir` (0–1, StyleSettings.yaziAltSiniri): uzaklaşınca yazı bu orandan daha küçük olmaz — şekle göre
 * büyük kalır ve okunur (kullanıcı isteği, 9 Ekim 2026: "zoom out yapıldığında nokta adları okunamıyor").
 * 0 = eski davranış (sınırsız küçülür). Yazı/yerleşim oranı (labelFontScale / labelZoomScale) 1'i aşınca
 * yerleşim uzayındaki kutu boyları bu oranla çarpılır (olcuYazimlari.olcumKartKutulari, Canvas.yaziOrani).
 */
export function labelFontScale(vp: ViewportTransform, altSinir = 0): number {
  const sinir = Number.isFinite(altSinir) ? Math.min(1, Math.max(0, altSinir)) : 0;
  return Math.min(1.05, Math.max(sinir, labelZoomScale(vp)));
}

/** Sabit yerleşim pikseli (x = dünya x · 44, y = −dünya y · 44) → gerçek ekran pikseli. */
export function projectLabelPoint(p: Point2D, vp: ViewportTransform): Point2D {
  return worldToScreen({ x: p.x / LABEL_LAYOUT_ZOOM, y: -p.y / LABEL_LAYOUT_ZOOM }, vp);
}

/** Gerçek ekran pikseli → sabit etiket yerleşimi pikseli. */
export function unprojectLabelPoint(p: Point2D, vp: ViewportTransform): Point2D {
  const world = screenToWorld(p, vp);
  return { x: world.x * LABEL_LAYOUT_ZOOM, y: -world.y * LABEL_LAYOUT_ZOOM };
}
