// Koordinat Dönüşümleri ve Izgara Hesaplama Modülü

import { Point2D, ScreenPoint, ViewportTransform } from '@/types/math';

/**
 * Matematiksel dünya koordinatını (x, y) SVG ekran pikseline (px, py) dönüştürür.
 * Matematik koordinatında +Y yukarıdır, ekran koordinatında ise +Y aşağı doğrudur.
 */
export function worldToScreen(
  point: Point2D,
  transform: ViewportTransform
): ScreenPoint {
  const centerX = transform.width / 2 + transform.panX;
  const centerY = transform.height / 2 + transform.panY;

  return {
    x: centerX + point.x * transform.zoom,
    y: centerY - point.y * transform.zoom, // Y ekseni ters çevrilir
  };
}

/**
 * SVG ekran pikselini (px, py) matematiksel dünya koordinatına (x, y) dönüştürür.
 */
export function screenToWorld(
  screenPoint: ScreenPoint,
  transform: ViewportTransform
): Point2D {
  const centerX = transform.width / 2 + transform.panX;
  const centerY = transform.height / 2 + transform.panY;

  return {
    x: (screenPoint.x - centerX) / transform.zoom,
    y: -(screenPoint.y - centerY) / transform.zoom,
  };
}

/**
 * Koordinatı en yakın ızgara adımına yapıştırır (Snap to Grid).
 */
export function snapToGridPoint(point: Point2D, step: number = 0.5): Point2D {
  return {
    x: Math.round(point.x / step) * step,
    y: Math.round(point.y / step) * step,
  };
}

/**
 * Ekranın kapsadığı matematiksel dünya sınırlarını hesaplar.
 */
export function getVisibleWorldBounds(transform: ViewportTransform) {
  const topLeft = screenToWorld({ x: 0, y: 0 }, transform);
  const bottomRight = screenToWorld(
    { x: transform.width, y: transform.height },
    transform
  );

  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    maxX: Math.max(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxY: Math.max(topLeft.y, bottomRight.y),
  };
}

/**
 * Mevcut zoom düzeyine göre uygun ızgara adım aralığını (step) belirler.
 */
export function getAdaptiveGridStep(zoom: number): { step: number; subStep: number } {
  // zoom: 1 birim kaç piksel
  if (zoom >= 80) {
    return { step: 0.5, subStep: 0.1 };
  } else if (zoom >= 26) {
    return { step: 1, subStep: 0.5 };
  } else if (zoom >= 13) {
    return { step: 2, subStep: 1 };
  } else if (zoom >= 6) {
    return { step: 5, subStep: 1 };
  } else if (zoom >= 3) {
    return { step: 10, subStep: 2 };
  } else {
    return { step: 20, subStep: 5 };
  }
}

/**
 * Görünümde gerçekten çizilen (uyarlanabilir) ızgara adımını döndürür.
 * Izgaraya yapıştırma bu adımı kullanmalıdır.
 */
export function getSnapStep(transform: ViewportTransform): number {
  return visibleGridStep(transform).step;
}

/** Sabit ızgara aralığında çizgiler arası en az bu kadar piksel kalır (daha sıksa aralık 2'nin katlarıyla seyreltilir) */
export const MIN_GRID_PX = 6;

/**
 * Tuvalde gerçekten çizilen ızgara adımı. Ayarlarda aralık "Otomatik" ise yakınlaştırmaya göre seçilir
 * (0,5 · 1 · 2 · 5 · 10 · 20); kullanıcı sabit bir aralık verdiyse (gridStepAuto === false) o aralık kullanılır,
 * yalnız çok uzaklaştırınca çizgiler birbirine yapışmasın diye 2'nin katlarıyla seyreltilir.
 */
export function visibleGridStep(
  transform: Pick<ViewportTransform, 'zoom' | 'gridStep' | 'gridStepAuto'>
): { step: number; subStep: number } {
  if (transform.gridStepAuto === false && transform.gridStep > 0 && Number.isFinite(transform.gridStep)) {
    let step = transform.gridStep;
    while (step * transform.zoom < MIN_GRID_PX) step *= 2;
    return { step, subStep: step / 2 };
  }
  return getAdaptiveGridStep(transform.zoom);
}

/** İzometrik ızgaranın üçgen kenarı: otomatikte en az 1 birim, sabit aralıkta tam o aralık */
export function isometricSide(transform: Pick<ViewportTransform, 'gridStepAuto'>, step: number): number {
  return transform.gridStepAuto === false ? step : Math.max(1, step);
}

/**
 * İzometrik ızgaranın (eşkenar üçgen örgü; dikey ve ±30° çizgiler) en yakın düğüm noktası.
 * Örgü tabanı: a = (s·√3/2, s/2), b = (0, s); s = üçgen kenarı (dünya birimi). Tuvalde çizilen
 * izometrik desenle aynı örgüdür (çizgiler orijinden geçer).
 */
export function nearestIsometricPoint(point: Point2D, side: number): Point2D {
  const h = (side * Math.sqrt(3)) / 2;
  const m0 = Math.round(point.x / h);
  let best: Point2D = { x: m0 * h, y: 0 };
  let bestD = Infinity;
  for (let m = m0 - 1; m <= m0 + 1; m++) {
    const x = m * h;
    const n = Math.round((point.y - (m * side) / 2) / side);
    for (let k = n - 1; k <= n + 1; k++) {
      const y = (m * side) / 2 + k * side;
      const d = Math.hypot(point.x - x, point.y - y);
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return { x: Number(best.x.toFixed(10)), y: Number(best.y.toFixed(10)) };
}

/** Görünen ızgara biçimine göre en yakın ızgara noktası: kareli/noktalı → kare örgü, izometrik → üçgen örgü. */
export function nearestGridPoint(
  point: Point2D,
  transform: Pick<ViewportTransform, 'gridStyle' | 'gridStepAuto'>,
  step: number
): Point2D {
  return transform.gridStyle === 'izometrik'
    ? nearestIsometricPoint(point, isometricSide(transform, step))
    : snapToGridPoint(point, step);
}

/** "Otomatik" yakalamada noktanın ızgara noktasına çekildiği en büyük uzaklık (piksel) */
export const AUTO_SNAP_PX = 12;

/**
 * Nokta yakalama kuralı (Ayarlar > Nokta Yakalama Modu ve sağ tık "Izgaraya Sıçra" ile aynı alanlar):
 * - Kapalı (snapToGrid false ya da pointSnapMode 'off'): nokta olduğu gibi kalır.
 * - Izgaraya Sıçra / Izgaraya Sabitli: her zaman en yakın ızgara noktasına oturur.
 * - Otomatik: ızgara görünürken, en yakın ızgara noktasına AUTO_SNAP_PX pikselden yakınsa oturur.
 * Izgara noktası görünen biçime göredir (kareli, noktalı, izometrik).
 */
export function snapPointToGrid(
  point: Point2D,
  transform: Pick<ViewportTransform, 'snapToGrid' | 'pointSnapMode' | 'showGrid' | 'gridStyle' | 'zoom'> &
    Partial<Pick<ViewportTransform, 'gridStepAuto'>>,
  step: number
): Point2D {
  if (!transform.snapToGrid) return point;
  const mode = transform.pointSnapMode ?? 'snapToGrid';
  if (mode === 'off') return point;
  const q = nearestGridPoint(point, transform, step);
  if (mode === 'automatic') {
    if (!transform.showGrid) return point;
    return Math.hypot(point.x - q.x, point.y - q.y) * transform.zoom <= AUTO_SNAP_PX ? q : point;
  }
  return q;
}

/**
 * Izgaraya yapıştırma açıksa noktayı çizilen ızgaraya (biçimi ve adımıyla) yapıştırır, değilse olduğu gibi döndürür.
 */
export function snapToVisibleGrid(point: Point2D, transform: ViewportTransform): Point2D {
  return snapPointToGrid(point, transform, getSnapStep(transform));
}

/**
 * Sayıyı Türkçe matematik standardında formatlar (Örn: 5,2 veya 12)
 */
export function formatTurkishNumber(val: number, maxDecimals: number = 2): string {
  if (Number.isInteger(val)) {
    return val.toString();
  }
  const rounded = Number(val.toFixed(maxDecimals));
  return rounded.toString().replace('.', ',');
}

/**
 * Koordinat gösterimi üretir: (x, y) -> "(2,5; -3)"
 */
export function formatCoordinate(point: Point2D, maxDecimals: number = 2): string {
  const xStr = formatTurkishNumber(point.x, maxDecimals);
  const yStr = formatTurkishNumber(point.y, maxDecimals);
  return `(${xStr}; ${yStr})`;
}
