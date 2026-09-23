import type { CircleObject, MathObject, MeasurementObject, Point2D, PointObject } from '@/types/math';
import { commandCircleGeometry } from '@/math/commandBindings';
import { formatTurkishNumber } from '@/math/coordinates';
import { createId } from '@/state/ids';

/**
 * İKİ NOKTA ARASINDAKİ YAYI ÖLÇME — çember BÖLÜNMEDEN.
 *
 * Aynı çemberin üzerindeki iki nokta (ör. B ve D) arasındaki yayın uzunluğu ve derecesi, 'measurement' nesnesinin
 * 'arc' türüyle CANLI tutulur: noktalar ya da çember değişince değer kendiliğinden güncellenir.
 *
 * "Üzerinde" GEOMETRİK bir sınamadır: noktanın çembere nasıl bağlandığı (onObjectId, yarıçap noktası, üç noktalı
 * çemberin noktaları, kesişim/teğet noktaları, yay uçları) fark etmez; merkeze uzaklığı yarıçapa (göreli bir tolerans
 * içinde) eşitse nokta çemberin üzerindedir.
 *
 * Hangi yay: varsayılan KÜÇÜK yay; ara nokta verilirse ("BCD yayı") onu içeren yay; `major` ise büyük yay.
 * Tam 180°'de (yarım çember) ilk noktadan ikinciye saat yönünün tersine gidilir.
 *
 * Saf modüldür: WorkspaceContext'i içe aktarmaz (içe aktarma döngüsü olmasın); bağlam, tuval, araç çubuğu ve komutlar kullanır.
 */

export const TAU = 2 * Math.PI;
/** Açı eşitliği (uçların çakışması) için sayısal eşik. */
export const YAY_ACI_EPS = 1e-9;
/**
 * Yarım çember (180°) eşiği. Ekranda 0,1° duyarlılıkla yazıldığı için 4 ondalıklı noktalardan gelen gürültü
 * küçük/büyük seçimini, başlığı ve menü yazısını oynatmasın diye kaba tutulur.
 */
export const YAY_YARIM_EPS = 1e-4;
/** Yay ölçümünün varsayılan rengi (açık temada lime-600; tuvalde koyu temada lime-400 sınıfıyla çizilir). */
export const YAY_OLCUMU_RENGI = '#65a30d';
/** Sağ tık alt menüsünde listelenecek en çok yay (alt menü kaydırılmaz). */
export const YAY_MENU_SINIRI = 10;

export type ArcMeasurement = MeasurementObject & { kind: 'arc'; circleId: string };

export interface ArcSpec {
  circleId: string;
  /** [ilk, ikinci] */
  pointIds: readonly string[];
  /**
   * Yayın SAAT YÖNÜNÜN TERSİNE başladığı uç — yayın KİMLİĞİ. Ölçüm nesnelerinde her zaman yazılıdır:
   * bir uç karşı ucun ötesine sürüklense bile ölçülen yay taraf değiştirmez (derece 180°'yi aşıp büyümeye
   * devam eder). `throughPointId` ve `major` yalnızca yay İLK kez seçilirken (menü, komut) kullanılır.
   */
  startPointId?: string;
  throughPointId?: string;
  major?: boolean;
}

export interface ResolvedArc {
  center: Point2D;
  radius: number;
  /** Yay startId'den endId'ye saat yönünün TERSİNE (dünya koordinatlarında) gider. */
  startId: string;
  endId: string;
  startAngle: number;
  /** (0, 2π) */
  sweep: number;
  midAngle: number;
  /** r·θ */
  length: number;
  /** θ·180/π = yayın ölçüsü = merkez açı */
  degrees: number;
  /** 180°'den belirgin biçimde büyük */
  major: boolean;
  /** Yarım çember (YAY_YARIM_EPS içinde 180°) */
  half: boolean;
  /** Artık çemberin üzerinde OLMAYAN uç (ya da ara) noktalar. Değer izdüşümden hesaplanır; tuval uyarı gösterir. */
  offIds: string[];
}

export interface ArcPairOption {
  circleId: string;
  /** Adlarına göre sıralı (tr, sayısal) */
  pointIds: [string, string];
  title: string;
  degrees: number;
  length: number;
  /** Bu küçük yayın var olan ölçümü */
  existingId?: string;
  /** Var olan ölçüm görünür mü (visible ve showValue açık) */
  existingShown?: boolean;
}

export interface UiFilter {
  visibleOnly?: boolean;
}

// ------------------------------------------------------------------------------------------------ yardımcılar

const idMaps = new WeakMap<readonly MathObject[], Map<string, MathObject>>();
function byIdOf(objects: readonly MathObject[]): Map<string, MathObject> {
  let map = idMaps.get(objects);
  if (!map) {
    map = new Map(objects.map((o) => [o.id, o]));
    idMaps.set(objects, map);
  }
  return map;
}

function pointIn(objects: readonly MathObject[], id: string | undefined): PointObject | undefined {
  if (!id) return undefined;
  const o = byIdOf(objects).get(id);
  return o && o.type === 'point' ? o : undefined;
}

const norm = (a: number) => ((a % TAU) + TAU) % TAU;
const labelOrder = (a: PointObject, b: PointObject) => a.label.localeCompare(b.label, 'tr', { numeric: true });

export function isArcMeasurement(o: MathObject | null | undefined): o is ArcMeasurement {
  return !!o && o.type === 'measurement' && o.kind === 'arc' && typeof o.circleId === 'string';
}

/** Yay ölçümünün bağlı olduğu nesneler: iki uç, (varsa) ara nokta ve çember. */
export function arcMeasurementDependencies(m: MeasurementObject): string[] {
  return [...m.pointIds, ...(m.throughPointId ? [m.throughPointId] : []), ...(m.circleId ? [m.circleId] : [])];
}

/** Noktanın çemberin üzerinde sayılması için izin verilen |d − r| (yarıçapa göre binde bir; en az 2e-4). */
export const yayToleransi = (r: number) => Math.max(2e-4, 1e-3 * r);

/** Çemberin merkezi ve yarıçapı (merkez + yarıçap noktası, sabit yarıçap ya da üç nokta). Hesaplanamazsa null. */
export function circleGeometryOf(circle: CircleObject, objects: readonly MathObject[]): { center: Point2D; radius: number } | null {
  try {
    const g = commandCircleGeometry(circle, (id) => {
      const p = pointIn(objects, id);
      if (!p) throw new Error('nokta yok');
      return p;
    });
    if (!Number.isFinite(g.radius) || g.radius <= 1e-9 || !Number.isFinite(g.center.x) || !Number.isFinite(g.center.y)) return null;
    return { center: { x: g.center.x, y: g.center.y }, radius: g.radius };
  } catch {
    return null;
  }
}

/** Tanımı gereği çemberin üzerinde olan nokta: çembere bağlı, yarıçap noktası ya da üç noktalı çemberin noktası. */
export function isOnCircleStrong(p: PointObject, circle: CircleObject): boolean {
  return p.onObjectId === circle.id || circle.radiusPointId === p.id || !!circle.throughPointIds?.includes(p.id);
}

/** Nokta çemberin üzerinde mi (bağlantı türünden bağımsız, geometrik). Merkez hiçbir zaman üzerinde değildir. */
export function isPointOnCircle(
  p: PointObject,
  circle: CircleObject,
  objects: readonly MathObject[],
  geom: { center: Point2D; radius: number } | null = circleGeometryOf(circle, objects)
): boolean {
  if (!geom) return false;
  if (!circle.throughPointIds?.length && circle.centerPointId === p.id) return false;
  if (isOnCircleStrong(p, circle)) return true;
  return Math.abs(Math.hypot(p.x - geom.center.x, p.y - geom.center.y) - geom.radius) <= yayToleransi(geom.radius);
}

/** Noktanın üzerinde durduğu çemberler (sahne sırasıyla). */
export function circlesThroughPoint(pointId: string, objects: readonly MathObject[], opts?: UiFilter): CircleObject[] {
  const p = pointIn(objects, pointId);
  if (!p || (opts?.visibleOnly && p.visible === false)) return [];
  return objects.filter(
    (o): o is CircleObject => o.type === 'circle' && (!opts?.visibleOnly || o.visible !== false) && isPointOnCircle(p, o, objects)
  );
}

/** Çemberin üzerindeki noktalar, açıya göre saat yönünün tersine sıralı ([0, 2π)). */
export function pointsOnCircle(circleId: string, objects: readonly MathObject[], opts?: UiFilter): PointObject[] {
  const circle = byIdOf(objects).get(circleId);
  if (!circle || circle.type !== 'circle') return [];
  const geom = circleGeometryOf(circle, objects);
  if (!geom) return [];
  const angle = (p: PointObject) => norm(Math.atan2(p.y - geom.center.y, p.x - geom.center.x));
  return objects
    .filter((o): o is PointObject => o.type === 'point' && (!opts?.visibleOnly || o.visible !== false) && isPointOnCircle(o, circle, objects, geom))
    .map((p) => ({ p, a: angle(p) }))
    .sort((x, y) => x.a - y.a || labelOrder(x.p, y.p))
    .map((x) => x.p);
}

/**
 * İki noktanın BİRLİKTE üzerinde durduğu çemberler, belirlenimci sırayla:
 * (a) iki noktadaki "tanımı gereği üzerinde" işaretlerinin sayısı (çok olan önce), (b) tercih edilen çember,
 * (c) sahnede sonra eklenen önce. Tolerans içindeki artıklar eşit sayılır (4 ondalıklı gürültü sırayı belirlemesin).
 */
export function commonCircles(aId: string, bId: string, objects: readonly MathObject[], opts?: UiFilter & { preferId?: string }): CircleObject[] {
  const a = pointIn(objects, aId), b = pointIn(objects, bId);
  if (!a || !b || aId === bId) return [];
  if (opts?.visibleOnly && (a.visible === false || b.visible === false)) return [];
  return objects
    .map((o, index) => ({ o, index }))
    .filter((x): x is { o: CircleObject; index: number } =>
      x.o.type === 'circle' && (!opts?.visibleOnly || x.o.visible !== false) && isPointOnCircle(a, x.o, objects) && isPointOnCircle(b, x.o, objects))
    .map((x) => ({ ...x, strong: Number(isOnCircleStrong(a, x.o)) + Number(isOnCircleStrong(b, x.o)) }))
    .sort((x, y) =>
      y.strong - x.strong
      || Number(y.o.id === opts?.preferId) - Number(x.o.id === opts?.preferId)
      || y.index - x.index)
    .map((x) => x.o);
}

// ------------------------------------------------------------------------------------------------ yay çözümü

/** Ölçülecek yayı çözer: başlangıç, tarama, uzunluk, derece. Çember/noktalar yoksa ya da uçlar çakışıksa null. */
export function resolveArc(spec: ArcSpec, objects: readonly MathObject[]): ResolvedArc | null {
  const circle = byIdOf(objects).get(spec.circleId);
  if (!circle || circle.type !== 'circle') return null;
  const geom = circleGeometryOf(circle, objects);
  if (!geom) return null;
  const [aId, bId] = spec.pointIds;
  const A = pointIn(objects, aId), B = pointIn(objects, bId);
  if (!A || !B || aId === bId) return null;
  const { center } = geom;
  const away = (p: PointObject) => Math.hypot(p.x - center.x, p.y - center.y) > 1e-12;
  if (!away(A) || !away(B)) return null;
  const ang = (p: PointObject) => norm(Math.atan2(p.y - center.y, p.x - center.x));
  const aAng = ang(A), bAng = ang(B);
  const s = norm(bAng - aAng);
  if (s < YAY_ACI_EPS || s > TAU - YAY_ACI_EPS) return null;

  // true: A'dan B'ye (tarama s) · false: B'den A'ya (tarama 2π − s)
  // Yazılı başlangıç ucu her şeyden önce gelir: yay, noktalar taşınırken (uç karşı ucun ötesine geçse bile)
  // taraf değiştirmez. Yoksa ara nokta, o da yoksa küçük/büyük kuralı karar verir.
  let fromA: boolean | null = spec.startPointId === aId ? true : spec.startPointId === bId ? false : null;
  const T = spec.throughPointId ? pointIn(objects, spec.throughPointId) : undefined;
  if (fromA === null && T && T.id !== aId && T.id !== bId && away(T)) {
    const t = norm(ang(T) - aAng);
    const e = 1e-7;
    if (t > e && t < s - e) fromA = true;
    else if (t > s + e && t < TAU - e) fromA = false;
    // aksi hâlde ara nokta bir uçta duruyor: yok sayılır, küçük/büyük kuralı uygulanır
  }
  if (fromA === null) {
    const minorFromA = Math.abs(s - Math.PI) <= YAY_YARIM_EPS ? true : s < Math.PI;
    fromA = spec.major ? !minorFromA : minorFromA;
  }
  const startAngle = fromA ? aAng : bAng;
  const sweep = fromA ? s : TAU - s;
  const offIds = [A, B, ...(T && spec.throughPointId ? [T] : [])]
    .filter((p) => !isPointOnCircle(p, circle, objects, geom))
    .map((p) => p.id);
  return {
    center: { ...center },
    radius: geom.radius,
    startId: fromA ? A.id : B.id,
    endId: fromA ? B.id : A.id,
    startAngle,
    sweep,
    midAngle: startAngle + sweep / 2,
    length: geom.radius * sweep,
    degrees: (sweep * 180) / Math.PI,
    major: sweep > Math.PI + YAY_YARIM_EPS,
    half: Math.abs(sweep - Math.PI) <= YAY_YARIM_EPS,
    offIds,
  };
}

/** Nokta çözülmüş yayın İÇİNDE mi (uçlar hariç)? */
function insideArc(r: ResolvedArc, p: PointObject): boolean {
  const u = norm(Math.atan2(p.y - r.center.y, p.x - r.center.x) - r.startAngle);
  return u > 1e-7 && u < r.sweep - 1e-7;
}

/** Çözülmüş yayın İÇİNDE duran, ortasına en yakın görünür çember noktası (uçlar ve merkez hariç). */
function interiorPoint(spec: ArcSpec, objects: readonly MathObject[], r: ResolvedArc): PointObject | undefined {
  const circle = byIdOf(objects).get(spec.circleId);
  if (!circle || circle.type !== 'circle') return undefined;
  const geom = { center: r.center, radius: r.radius };
  const e = 1e-6;
  let best: { p: PointObject; d: number } | undefined;
  for (const o of objects) {
    if (o.type !== 'point' || o.visible === false || spec.pointIds.includes(o.id)) continue;
    if (!isPointOnCircle(o, circle, objects, geom)) continue;
    const u = norm(Math.atan2(o.y - r.center.y, o.x - r.center.x) - r.startAngle);
    if (!(u > e && u < r.sweep - e)) continue;
    const d = Math.abs(u - r.sweep / 2);
    if (!best || d < best.d - 1e-12 || (Math.abs(d - best.d) <= 1e-12 && labelOrder(o, best.p) < 0)) best = { p: o, d };
  }
  return best?.p;
}

/**
 * Yayın adı (noktaların GÜNCEL adlarıyla): "BD yayı", ara noktayla "BCD yayı", büyük yayda üzerindeki bir noktayla
 * "BCD yayı" (yoksa "BD büyük yayı"), yarım çemberde üzerindeki bir noktayla "BCD yayı" (yoksa "BD yarım çemberi").
 */
export function arcTitle(spec: ArcSpec, objects: readonly MathObject[], resolved: ResolvedArc | null = resolveArc(spec, objects)): string {
  const A = pointIn(objects, spec.pointIds[0]), B = pointIn(objects, spec.pointIds[1]);
  if (!A || !B) return 'Yay ölçümü';
  const T = spec.throughPointId ? pointIn(objects, spec.throughPointId) : undefined;
  // Ara nokta yayın ÜZERİNDEN kalkmışsa (taşınmış ya da yay öbür tarafa çevrilmiş) adı artık anlatmaz
  if (T && (!resolved || insideArc(resolved, T))) return `${A.label}${T.label}${B.label} yayı`;
  if (resolved && (resolved.major || resolved.half)) {
    const P = interiorPoint(spec, objects, resolved);
    if (P) return `${A.label}${P.label}${B.label} yayı`;
    return resolved.half ? `${A.label}${B.label} yarım çemberi` : `${A.label}${B.label} büyük yayı`;
  }
  return `${A.label}${B.label} yayı`;
}

/**
 * Yayın İÇİNDEKİ adlandırıcı nokta (yazım katmanı için): büyük yay ve yarım çember üç harfle yazılır
 * (|A͡C͡B|). arcTitle ile aynı kuralı kullanır, ad iki yerde ayrı ayrı türetilmesin.
 */
export const yayIcNoktasi = interiorPoint;

/** "10,79 br · 59,5°" (uzunluk 2, derece 1 ondalık) */
export function arcValueText(r: ResolvedArc): string {
  return `${formatTurkishNumber(r.length, 2)} br · ${formatTurkishNumber(r.degrees, 1)}°`;
}

/** Uç (ya da ara) nokta artık çemberin üzerinde değilse uyarı yazısı; değilse null. */
export function arcDetachedText(r: ResolvedArc, objects: readonly MathObject[]): string | null {
  if (!r.offIds.length) return null;
  const names = r.offIds.map((id) => pointIn(objects, id)?.label ?? '?');
  return names.length === 1
    ? `${names[0]} noktası artık çemberin üzerinde değil`
    : `${names.slice(0, -1).join(', ')} ve ${names[names.length - 1]} noktaları artık çemberin üzerinde değil`;
}

/** Rozetin başlığı: iki nokta birden çok çemberin üzerindeyse hangi çember olduğu da yazılır. */
export function arcBadgeTitle(m: ArcSpec, objects: readonly MathObject[], resolved: ResolvedArc | null = resolveArc(m, objects)): string {
  const title = arcTitle(m, objects, resolved);
  const [a, b] = m.pointIds;
  if (commonCircles(a, b, objects).length > 1) {
    const circle = byIdOf(objects).get(m.circleId);
    if (circle?.label) return `${title} (${circle.label})`;
  }
  return title;
}

/** Aynı yay mı: aynı çember, aynı (çözülmüş) başlangıç ve bitiş. Çözülemezse alanlar karşılaştırılır. */
export function sameArc(x: ArcSpec, y: ArcSpec, objects: readonly MathObject[]): boolean {
  if (x.circleId !== y.circleId) return false;
  const rx = resolveArc(x, objects), ry = resolveArc(y, objects);
  if (rx && ry) return rx.startId === ry.startId && rx.endId === ry.endId;
  const pair = (s: ArcSpec) => [...s.pointIds].sort().join('|');
  return pair(x) === pair(y) && (x.throughPointId ?? '') === (y.throughPointId ?? '') && !!x.major === !!y.major;
}

export function findArcMeasurement(spec: ArcSpec, objects: readonly MathObject[], exceptId?: string): ArcMeasurement | undefined {
  return objects.find(
    (o): o is ArcMeasurement => isArcMeasurement(o) && o.id !== exceptId && o.circleId === spec.circleId && sameArc(o, spec, objects)
  );
}

export function makeArcMeasurement(spec: ArcSpec, objects: readonly MathObject[], now: number = Date.now()): ArcMeasurement {
  // Hangi yayın ölçüldüğü OLUŞTURULURKEN sabitlenir (başlangıç ucu yazılır): noktalar taşınınca yay
  // karşı tarafa atlamaz, derece 180°'nin ötesine geçebilir.
  const r = resolveArc(spec, objects);
  return {
    id: createId('olc'),
    type: 'measurement',
    kind: 'arc',
    label: arcTitle(spec, objects, r),
    showLabel: true,
    pointIds: [spec.pointIds[0], spec.pointIds[1]],
    circleId: spec.circleId,
    ...(r ? { startPointId: r.startId } : spec.startPointId ? { startPointId: spec.startPointId } : {}),
    ...(spec.throughPointId ? { throughPointId: spec.throughPointId } : {}),
    ...(spec.major && !spec.throughPointId ? { major: true } : {}),
    showValue: true,
    color: YAY_OLCUMU_RENGI,
    visible: true,
    createdAt: now,
  };
}

export type AddArcResult =
  | { objects: MathObject[]; measurement: ArcMeasurement; created: boolean; revealed: boolean }
  | { error: string };

/** Denetler ve ekler. Aynı yay zaten ölçülmüşse yenisini eklemez (gizliyse yeniden gösterir). */
export function addArcMeasurement(objects: MathObject[], spec: ArcSpec): AddArcResult {
  const circle = byIdOf(objects).get(spec.circleId);
  if (!circle || circle.type !== 'circle') return { error: 'Çember bulunamadı.' };
  const [aId, bId] = spec.pointIds;
  const A = pointIn(objects, aId), B = pointIn(objects, bId);
  if (!A || !B || aId === bId) return { error: 'Yay için iki FARKLI nokta gerekir.' };
  const geom = circleGeometryOf(circle, objects);
  for (const p of [A, B]) if (!isPointOnCircle(p, circle, objects, geom)) return { error: `${p.label} noktası ${circle.label || 'çember'} üzerinde değil.` };
  if (!resolveArc(spec, objects)) return { error: 'Noktalar çakışık; aralarında yay yok.' };
  const existing = findArcMeasurement(spec, objects);
  if (existing) {
    if (existing.visible !== false && existing.showValue !== false) return { objects, measurement: existing, created: false, revealed: false };
    const shown = { ...existing, showValue: true, visible: true } as ArcMeasurement;
    return { objects: objects.map((o) => (o.id === existing.id ? shown : o)), measurement: shown, created: false, revealed: true };
  }
  const measurement = makeArcMeasurement(spec, objects);
  return { objects: [...objects, measurement], measurement, created: true, revealed: false };
}

/** Diğer yaya geçiş için menü yazısı: "Büyük yayı ölç" / "Küçük yayı ölç" / yarım çemberde "Diğer yarım çemberi ölç". */
export function arcFlipLabel(r: ResolvedArc): string {
  return r.half ? 'Diğer yarım çemberi ölç' : r.major ? 'Küçük yayı ölç' : 'Büyük yayı ölç';
}

/**
 * Ölçümü AYNI iki nokta arasındaki DİĞER yaya çevirir (tümleyen). Kimlik, renk ve oluşturma zamanı korunur;
 * ara nokta kaldırılır, sürüklenmiş rozet kayıklığı sıfırlanır (öbür yayda çemberin içine düşmesin).
 * Tam 180°'de de çalışır: sonuç her zaman şimdiki yayın ters yönüdür.
 */
export function flipArcMeasurement(m: ArcMeasurement, objects: readonly MathObject[]): { object: ArcMeasurement; title: string } | { error: string } {
  const current = resolveArc(m, objects);
  if (!current) return { error: 'Yay çözülemedi.' };
  const [a, b] = m.pointIds;
  // Tümleyen yay: başlangıç ucu şimdiki BİTİŞ ucudur. Böylece tam 180°'de de (ve uçlar taşındıktan sonra da)
  // çevirme hep öbür tarafı verir; iki kez çevirince başa dönülür.
  const target: ArcSpec = { circleId: m.circleId, pointIds: [a, b], startPointId: current.endId };
  const resolved = resolveArc(target, objects);
  if (!resolved) return { error: 'Yay çözülemedi.' };
  const title = arcTitle(target, objects, resolved);
  if (findArcMeasurement(target, objects, m.id)) return { error: `${title} zaten ölçülmüş.` };
  const { throughPointId: _through, major: _major, labelOffsets, labelAnchors, ...rest } = m;
  void _through; void _major;
  let offsets: Record<string, Point2D> | undefined;
  if (labelOffsets) {
    const { measure: _measure, ...others } = labelOffsets;
    void _measure;
    offsets = Object.keys(others).length ? others : undefined;
  }
  let anchors: ArcMeasurement['labelAnchors'];
  if (labelAnchors) {
    const { measure: _measure, ...others } = labelAnchors;
    void _measure;
    anchors = Object.keys(others).length ? others : undefined;
  }
  const object: ArcMeasurement = {
    ...rest,
    pointIds: [target.pointIds[0], target.pointIds[1]],
    startPointId: current.endId,
    label: title,
    ...(offsets ? { labelOffsets: offsets } : {}),
    ...(anchors ? { labelAnchors: anchors } : {}),
  };
  return { object, title };
}

/**
 * Uçları çakıştığı (ya da bir uç merkeze geldiği) için çizilecek yay kalmadığında rozette yazan açıklama.
 * Ölçüm sessizce kaybolmasın diye tuval bunu değer satırında gösterir.
 */
export function arcUnresolvedText(spec: ArcSpec, objects: readonly MathObject[]): string {
  const A = pointIn(objects, spec.pointIds[0]), B = pointIn(objects, spec.pointIds[1]);
  if (!A || !B) return 'Yayın noktaları bulunamadı';
  const circle = byIdOf(objects).get(spec.circleId);
  const geom = circle && circle.type === 'circle' ? circleGeometryOf(circle, objects) : null;
  if (!geom) return 'Çember çizilemiyor; yay ölçülemez';
  const merkezde = [A, B].filter((p) => Math.hypot(p.x - geom.center.x, p.y - geom.center.y) <= 1e-12);
  if (merkezde.length) return `${merkezde.map((p) => p.label).join(' ve ')} çemberin merkezinde; yay yok`;
  return `${A.label} ve ${B.label} çakıştı; aralarında yay yok`;
}

/**
 * Çemberi ya da noktası kalmamış yay ölçümlerini ayıklar (ör. çember iki yaya bölününce) ve başlangıç ucu yazılı
 * olmayan ESKİ kayıtlara o anki yayın başlangıcını yazar (yay bundan sonra taraf değiştirmez). Kayıtlı çizim yeniden
 * açılırken sarkan başvuru bütün sahneyi düşürmesin diye her işlemde çalışır; değişiklik yoksa AYNI diziyi döndürür.
 */
export function dropDanglingArcMeasurements<T extends readonly MathObject[]>(objects: T): T {
  let any = false;
  for (const o of objects) if (o.type === 'measurement' && o.kind === 'arc') { any = true; break; }
  if (!any) return objects;
  const byId = byIdOf(objects);
  const isPoint = (id: string | undefined) => !!id && byId.get(id)?.type === 'point';
  const dangling = (m: MeasurementObject) =>
    !m.circleId || byId.get(m.circleId)?.type !== 'circle' || m.pointIds.length !== 2 || !m.pointIds.every(isPoint)
    || (m.throughPointId !== undefined && !isPoint(m.throughPointId));
  const kept = objects.filter((o) => !(o.type === 'measurement' && o.kind === 'arc' && dangling(o)));
  let degisti = kept.length !== objects.length;
  const son = kept.map((o) => {
    if (!isArcMeasurement(o) || o.startPointId) return o;
    const r = resolveArc(o, kept);
    if (!r) return o;
    degisti = true;
    return { ...o, startPointId: r.startId };
  });
  return (degisti ? son : objects) as unknown as T;
}

// ------------------------------------------------------------------------------------------------ menü seçenekleri

function pairOption(circle: CircleObject, p: PointObject, q: PointObject, objects: readonly MathObject[]): ArcPairOption | null {
  const [x, y] = [p, q].sort(labelOrder);
  const spec: ArcSpec = { circleId: circle.id, pointIds: [x.id, y.id] };
  const r = resolveArc(spec, objects);
  if (!r) return null;
  const existing = findArcMeasurement(spec, objects);
  return {
    circleId: circle.id,
    pointIds: [x.id, y.id],
    title: arcTitle(spec, objects, r),
    degrees: r.degrees,
    length: r.length,
    ...(existing ? { existingId: existing.id, existingShown: existing.visible !== false && existing.showValue !== false } : {}),
  };
}

/** Noktanın üzerinde durduğu her görünür çember ve o çemberdeki diğer görünür noktalarla küçük yaylar (küçükten büyüğe). */
export function arcOptionsForPoint(pointId: string, objects: readonly MathObject[]): { circle: CircleObject; options: ArcPairOption[] }[] {
  const p = pointIn(objects, pointId);
  if (!p) return [];
  return circlesThroughPoint(pointId, objects, { visibleOnly: true }).map((circle) => ({
    circle,
    options: pointsOnCircle(circle.id, objects, { visibleOnly: true })
      .filter((q) => q.id !== pointId)
      .map((q) => pairOption(circle, p, q, objects))
      .filter((o): o is ArcPairOption => !!o)
      .sort((x, y) => x.degrees - y.degrees),
  }));
}

/**
 * Çemberin üzerindeki görünür noktaların küçük yayları: önce KOMŞU noktalar arasındakiler (açı sırasıyla),
 * sonra kalan çiftler küçükten büyüğe. Menü sınırında öğretmenin gösterdiği doğal yaylar görünür kalır.
 */
export function arcOptionsForCircle(circleId: string, objects: readonly MathObject[]): ArcPairOption[] {
  const circle = byIdOf(objects).get(circleId);
  if (!circle || circle.type !== 'circle') return [];
  const pts = pointsOnCircle(circleId, objects, { visibleOnly: true });
  const k = pts.length;
  if (k < 2) return [];
  const seen = new Set<string>();
  const neighbours: ArcPairOption[] = [];
  const others: ArcPairOption[] = [];
  const push = (list: ArcPairOption[], i: number, j: number) => {
    const key = [pts[i].id, pts[j].id].sort().join('|');
    if (i === j || seen.has(key)) return;
    seen.add(key);
    const o = pairOption(circle, pts[i], pts[j], objects);
    if (o) list.push(o);
  };
  for (let i = 0; i < k; i++) push(neighbours, i, (i + 1) % k);
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) push(others, i, j);
  others.sort((x, y) => x.degrees - y.degrees);
  return [...neighbours, ...others];
}

/** İki noktanın birlikte durduğu her görünür çember için küçük yay (sıralama commonCircles ile aynı). */
export function arcOptionsForPair(aId: string, bId: string, objects: readonly MathObject[], preferId?: string): ArcPairOption[] {
  const a = pointIn(objects, aId), b = pointIn(objects, bId);
  if (!a || !b) return [];
  return commonCircles(aId, bId, objects, { visibleOnly: true, preferId })
    .map((circle) => pairOption(circle, a, b, objects))
    .filter((o): o is ArcPairOption => !!o);
}

/**
 * İki nokta ortak bir çemberde değilken "neredeyse üzerinde" durumu için açıklama (ör. D, C merkezli çembere 0,08 br uzak).
 * Yakın bir çember yoksa null.
 */
export function arcNearMissHint(aId: string, bId: string, objects: readonly MathObject[]): string | null {
  const a = pointIn(objects, aId), b = pointIn(objects, bId);
  if (!a || !b) return null;
  let best: { off: number; ratio: number; who: PointObject; circle: CircleObject } | undefined;
  for (const [on, other] of [[a, b], [b, a]] as const) {
    for (const circle of circlesThroughPoint(on.id, objects)) {
      const g = circleGeometryOf(circle, objects);
      if (!g || (!circle.throughPointIds?.length && circle.centerPointId === other.id)) continue;
      const off = Math.abs(Math.hypot(other.x - g.center.x, other.y - g.center.y) - g.radius);
      const ratio = off / g.radius;
      if (ratio <= 0.03 && (!best || ratio < best.ratio)) best = { off, ratio, who: other, circle };
    }
  }
  if (!best) return null;
  const off = formatTurkishNumber(best.off, best.off < 0.01 ? 4 : 2);
  return `${best.who.label} noktası “${best.circle.label || 'çember'}” üzerinde görünüyor ama tam üzerinde değil (${off} br uzakta). Kesiştir aracıyla iki çemberin kesişim noktasını oluşturun ya da noktayı çembere bağlayın.`;
}
