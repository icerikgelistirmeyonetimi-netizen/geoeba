import type { MathObject, Point2D, PointObject } from '@/types/math';

/** Kutuyla seçimin dünya kutusu (x0 ≤ x1, y0 ≤ y1) */
export interface SecimKutusuSinirlari {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * Kutuyla seçimde nesne kutuya düşüyor mu. Şekiller tanım noktalarından yakalanır: noktalardan biri (parçada orta
 * nokta, çokgende köşelerin ortalaması da) kutudaysa nesne seçilir. Çember ve elips merkezinden, açı köşesinden, yay ve
 * daire dilimi üç tanım noktasından birinden; not, kesir ve görsel konumundan; kalem çizgisi herhangi bir noktasından
 * yakalanır. Diğer türler (fonksiyon, sürgü…) kutuyla seçilmez.
 */
export function kutuyaDuserMi(nesne: MathObject, noktalar: ReadonlyMap<string, PointObject>, k: SecimKutusuSinirlari): boolean {
  const icinde = (p: Point2D | undefined) => !!p && p.x >= k.x0 && p.x <= k.x1 && p.y >= k.y0 && p.y <= k.y1;
  const nokta = (id: string) => noktalar.get(id);
  switch (nesne.type) {
    case 'point':
    case 'text':
    case 'fraction':
    case 'image':
      return icinde(nesne);
    case 'circle':
    case 'ellipse':
      return icinde(nokta(nesne.centerPointId));
    case 'angle':
      return icinde(nokta(nesne.vertexPointId));
    case 'arc':
    case 'sector':
      return [nesne.centerPointId, nesne.startPointId, nesne.directionPointId].some((id) => icinde(nokta(id)));
    case 'line':
      return icinde(nokta(nesne.point1Id)) || icinde(nokta(nesne.point2Id));
    case 'ray':
      return icinde(nokta(nesne.startPointId)) || icinde(nokta(nesne.throughPointId));
    case 'segment': {
      const a = nokta(nesne.startPointId);
      const b = nokta(nesne.endPointId);
      return !!a && !!b && (icinde(a) || icinde(b) || icinde({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }));
    }
    case 'polygon': {
      const koseler = nesne.pointIds.map(nokta).filter((p): p is PointObject => !!p);
      if (koseler.length === 0) return false;
      if (koseler.some(icinde)) return true;
      return icinde({
        x: koseler.reduce((t, p) => t + p.x, 0) / koseler.length,
        y: koseler.reduce((t, p) => t + p.y, 0) / koseler.length,
      });
    }
    case 'pen':
      return nesne.points.some(icinde);
    default:
      return false;
  }
}
