import type { Point2D, ViewportTransform } from '@/types/math';
import { screenToWorld, worldToScreen } from '@/math/coordinates';

/** Etiket yerleşiminin ve yakınlık eşiklerinin hesaplandığı sabit piksel/birim ölçeği. */
export const LABEL_LAYOUT_ZOOM = 44;

/** Yerleşim hesabını yakınlaştırma, kaydırma ve tuval boyutlarından bağımsızlaştırır. */
export function labelLayoutViewport(vp: ViewportTransform): ViewportTransform {
  return { ...vp, width: 0, height: 0, panX: 0, panY: 0, zoom: LABEL_LAYOUT_ZOOM };
}

/** Yalnız yerleşim aralıklarını gerçek ekran ölçeğine taşır; yazı ve kutu boyutları sabittir. */
export function labelZoomScale(vp: ViewportTransform): number {
  return vp.zoom / LABEL_LAYOUT_ZOOM;
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
