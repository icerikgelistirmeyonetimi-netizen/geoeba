import { MathObject, PointObject, Point2D } from '@/types/math';
import { objectDependencies, hostBicimi } from '@/state/WorkspaceContext';
import { projectOntoHost } from './geometry';
type LockCandidate = { host: MathObject; position: Point2D; distance: number; fixedRadius?: number };

/** Nokta aracının bağlayabildiği ve bagliNoktalariOturt'un üzerinde tutabildiği taşıyıcı türleri. */
const KILITLENEBILIR_TURLER: string[] = ['line', 'segment', 'ray', 'circle', 'ellipse', 'arc', 'sector', 'polygon'];

/**
 * Nokta GERÇEKTEN kilitli mi? Gri çizim, "Kilit çöz" ve "Kilitle" maddeleri bu TEK yargıdan türer.
 * Taşıyıcısı artık sahnede olmayan (ör. bölmeden kalan) bir bağ kilit sayılmaz: noktayı hiçbir şey tutmuyor.
 */
export function isPointLocked(point: PointObject, scene: readonly MathObject[]): boolean {
  if (point.locked) return true;
  return !!point.onObjectId && scene.some(o => o.id === point.onObjectId);
}

export function pointLockCandidates(point: PointObject, scene: MathObject[], zoom: number) {
  if (isPointLocked(point, scene) || point.construction || !point.isIndependent) return [];
  const byId = new Map(scene.map(o => [o.id, o]));
  const dependsOnPoint = (id: string, seen = new Set<string>()): boolean => {
    if (id === point.id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    const object = byId.get(id);
    return !!object && objectDependencies(object).some(dep => dependsOnPoint(dep, seen));
  };
  return scene.flatMap<LockCandidate>(host => {
    const releaseRadius = host.type === 'circle' && host.radiusPointId === point.id && !host.throughPointIds?.length && !dependsOnPoint(host.centerPointId);
    if (!host.visible || !KILITLENEBILIR_TURLER.includes(host.type) || (!releaseRadius && dependsOnPoint(host.id))) return [];
    // Kilitten sonra bagliNoktalariOturt'un kullanacağı biçimin AYNISI: menü ile gerçek davranış ayrışmaz.
    // (Nokta aracı yay/dilim/çokgen/elipse de bağlı nokta koyar; kilidi çözülen böyle bir nokta geri kilitlenebilmeli.)
    const shape = hostBicimi(host, scene);
    if (!shape) return [];
    if ((shape.kind === 'line' || shape.kind === 'segment' || shape.kind === 'ray') && Math.hypot(shape.b.x - shape.a.x, shape.b.y - shape.a.y) < 1e-9) return [];
    const position = projectOntoHost(point, shape);
    if (!position) return [];
    // Menü ve sürükleme aynı yay sınırlarını ve elips dönüşünü kullanır.
    const distance = Math.hypot(point.x - position.x, point.y - position.y) * zoom;
    if (distance > 10) return [];
    return [{ host, position, distance, ...(releaseRadius && shape.kind === 'circle' ? { fixedRadius: shape.radius } : {}) }];
  }).sort((a, b) => a.distance - b.distance);
}
