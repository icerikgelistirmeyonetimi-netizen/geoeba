/**
 * 2B NESNELERİN 3B YÜKSEKLİĞİ (z)
 *
 * 2B çizimdeki noktalar isteğe bağlı bir `z` taşır (yoksa 0). 2B görünüm üstten bakıştır:
 * x ve y aynen çizilir, z yok sayılır. 3B görünümde noktaya dayalı her nesne (doğru parçası,
 * doğru, ışın, çokgen, çember, yay, dilim, elips, açı) noktalarının z'sinde çizilir.
 *
 * Kendi konumunu taşıyan nesneler (metin, görsel, kesir modeli, kalem çizgisi, sürgü, düğme…)
 * 3B'de z taşımanın DIŞINDADIR: `zTasinabilir` bunlar için false döner.
 *
 * BAĞIMLI NOKTALARIN z KURALI (bagimliZleriHesapla):
 *  - Orta nokta ve oran noktası: ebeveynlerin z'sinden doğrusal (A + t·(B − A)).
 *  - Ağırlık/çevrel/iç teğet/diklik merkezi: üç köşenin z ortalaması.
 *  - Dik ayak: xy'deki izdüşüm parametresiyle doğrunun iki noktası arasında doğrusal.
 *  - Paralel doğrultu noktası: geçtiği nokta + (B.z − A.z); dik doğrultu: geçtiği noktanın z'si.
 *  - Öteleme: kaynak + vektörün z farkı; merkeze göre yansıma: 2·M.z − P.z;
 *    merkezli homotete: M.z + k·(P.z − M.z) (sabit merkez z = 0 sayılır).
 *  - Düzlemsel kurulumlar (kesişim, teğet, açıortay, döndürme, eksene/doğruya yansıma,
 *    sürgülü üçgen köşesi): İLK kaynağın z'si (kesişimde ilk nesnenin taban z'si,
 *    teğette çember merkezinin z'si, açıortayda köşenin z'si).
 *  - Nesne ÜZERİNDEKİ nokta: doğru parçası/doğru/ışında iki uç arasında doğrusal;
 *    çokgende en yakın kenarda doğrusal; çember/yay/dilim/elipste merkezin z'si.
 */
import type { MathObject, Point2D, PointObject } from '@/types/math';

export interface Nokta3B {
  x: number;
  y: number;
  z: number;
}

/** Noktanın z'si; tanımsız ya da sonlu olmayan değer 0 sayılır. */
export function noktaZ(p: { z?: number } | null | undefined): number {
  const z = p?.z;
  return typeof z === 'number' && Number.isFinite(z) ? z : 0;
}

/** 3B'de z ekseninde taşınabilen (noktaya dayalı) nesne türleri. */
const Z_TASINABILIR = new Set<MathObject['type']>([
  'point',
  'segment',
  'line',
  'ray',
  'circle',
  'ellipse',
  'arc',
  'sector',
  'angle',
  'polygon',
]);

export function zTasinabilir(o: MathObject): boolean {
  return Z_TASINABILIR.has(o.type);
}

/** Nesneyi TANIMLAYAN noktalar (nesneyle birlikte taşınanlar); moveObjects ile aynı kural. */
export function tanimNoktalari(o: MathObject): string[] {
  switch (o.type) {
    case 'point':
      return [o.id];
    case 'polygon':
      return [...o.pointIds];
    case 'segment':
      return [o.startPointId, o.endPointId];
    case 'line':
      return [o.point1Id, o.point2Id];
    case 'ray':
      return [o.startPointId, o.throughPointId];
    case 'circle':
      return [
        o.centerPointId,
        ...(o.radiusPointId ? [o.radiusPointId] : []),
        ...(o.throughPointIds ?? []),
      ].filter(Boolean);
    case 'ellipse':
      return [o.centerPointId];
    case 'arc':
    case 'sector':
      return [o.centerPointId, o.startPointId, o.directionPointId];
    case 'angle':
      return [o.point1Id, o.vertexPointId, o.point3Id];
    default:
      return [];
  }
}

/**
 * Nesnenin taban (referans) z'si: çember/elips/yay/dilimde merkezin, açıda köşenin,
 * diğerlerinde ilk tanım noktasının z'si. Üç noktadan geçen çemberde üçünün ortalaması.
 */
export function tabanZ(o: MathObject, z: (id: string) => number): number {
  switch (o.type) {
    case 'point':
      return z(o.id);
    case 'circle':
      if (o.throughPointIds?.length) return o.throughPointIds.reduce((t, id) => t + z(id), 0) / o.throughPointIds.length;
      return z(o.centerPointId);
    case 'ellipse':
    case 'arc':
    case 'sector':
      return z(o.centerPointId);
    case 'angle':
      return z(o.vertexPointId);
    default: {
      const ilk = tanimNoktalari(o)[0];
      return ilk ? z(ilk) : 0;
    }
  }
}

/** p'nin AB doğrusu üzerindeki xy izdüşüm parametresi (A = 0, B = 1). */
function izdusumParametresi(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) return 0;
  return ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
}

const dogrusal = (za: number, zb: number, t: number) => za + (zb - za) * t;

/**
 * Kurulumlu ve nesne üzerindeki noktaların z'sini kaynaklarından yeniden hesaplar.
 * Hiçbir nokta sıfırdan farklı z taşımıyorsa diziyi OLDUĞU GİBİ döndürür (değişiklik yok);
 * değişen nokta yoksa da aynı dizi döner (React eşitlik denetimleri bozulmaz).
 */
export function bagimliZleriHesapla(objects: MathObject[]): MathObject[] {
  if (!objects.some((o) => o.type === 'point' && noktaZ(o) !== 0)) return objects;
  const byId = new Map(objects.map((o) => [o.id, o]));
  const cozulen = new Map<string, number>();
  const ziyarette = new Set<string>();

  const nokta = (id: string): PointObject | undefined => {
    const o = byId.get(id);
    return o && o.type === 'point' ? o : undefined;
  };

  const z = (id: string): number => {
    const hazir = cozulen.get(id);
    if (hazir !== undefined) return hazir;
    const p = nokta(id);
    if (!p) return 0;
    if (ziyarette.has(id)) return noktaZ(p); // Döngü: son bilinen değerde kal
    ziyarette.add(id);
    let sonuc = noktaZ(p);
    const r = p.construction;
    if (r) {
      switch (r.kind) {
        case 'midpoint':
          sonuc = (z(r.pointIds[0]) + z(r.pointIds[1])) / 2;
          break;
        case 'ratio':
          sonuc = dogrusal(z(r.pointIds[0]), z(r.pointIds[1]), r.t);
          break;
        case 'triangleCenter':
          sonuc = r.pointIds.reduce((t, pid) => t + z(pid), 0) / 3;
          break;
        case 'foot': {
          const a = nokta(r.linePointIds[0]);
          const b = nokta(r.linePointIds[1]);
          sonuc = a && b ? dogrusal(z(a.id), z(b.id), izdusumParametresi(p, a, b)) : z(r.sourceId);
          break;
        }
        case 'direction':
          sonuc = r.mode === 'parallel'
            ? z(r.throughId) + z(r.linePointIds[1]) - z(r.linePointIds[0])
            : z(r.throughId);
          break;
        case 'translate':
          sonuc = z(r.sourceId) + (r.vectorPointIds ? z(r.vectorPointIds[1]) - z(r.vectorPointIds[0]) : 0);
          break;
        case 'reflect':
          sonuc = r.centerId ? 2 * z(r.centerId) - z(r.sourceId) : z(r.sourceId);
          break;
        case 'dilate': {
          const mz = r.centerId ? z(r.centerId) : 0;
          sonuc = mz + (z(r.sourceId) - mz) * r.factor;
          break;
        }
        case 'rotate':
          sonuc = z(r.sourceId);
          break;
        case 'bisector':
          sonuc = z(r.pointIds[1]);
          break;
        case 'triangleVertex':
          sonuc = z(r.anchorId);
          break;
        case 'tangent': {
          const c = byId.get(r.circleId);
          sonuc = c ? tabanZ(c, z) : z(r.sourceId);
          break;
        }
        case 'intersection': {
          const ilk = byId.get(r.objectIds[0]);
          sonuc = ilk ? tabanZ(ilk, z) : noktaZ(p);
          break;
        }
      }
    } else if (p.onObjectId) {
      const host = byId.get(p.onObjectId);
      if (host) sonuc = uzerindekiNoktaZ(p, host, nokta, z);
    }
    if (!Number.isFinite(sonuc)) sonuc = noktaZ(p);
    ziyarette.delete(id);
    cozulen.set(id, sonuc);
    return sonuc;
  };

  let degisti = false;
  const sonuc = objects.map((o) => {
    if (o.type !== 'point') return o;
    const yeni = z(o.id);
    if (Math.abs(yeni - noktaZ(o)) < 1e-10) return o;
    degisti = true;
    return { ...o, z: Number(yeni.toFixed(10)) };
  });
  return degisti ? sonuc : objects;
}

function uzerindekiNoktaZ(
  p: PointObject,
  host: MathObject,
  nokta: (id: string) => PointObject | undefined,
  z: (id: string) => number
): number {
  const ikiUc = (aId: string, bId: string) => {
    const a = nokta(aId);
    const b = nokta(bId);
    if (!a || !b) return tabanZ(host, z);
    let t = izdusumParametresi(p, a, b);
    if (host.type === 'segment') t = Math.max(0, Math.min(1, t));
    if (host.type === 'ray') t = Math.max(0, t);
    return dogrusal(z(aId), z(bId), t);
  };
  switch (host.type) {
    case 'segment':
      return ikiUc(host.startPointId, host.endPointId);
    case 'line':
      return ikiUc(host.point1Id, host.point2Id);
    case 'ray':
      return ikiUc(host.startPointId, host.throughPointId);
    case 'polygon': {
      let enIyi = { d: Infinity, z: tabanZ(host, z) };
      const n = host.pointIds.length;
      for (let i = 0; i < n; i++) {
        const a = nokta(host.pointIds[i]);
        const b = nokta(host.pointIds[(i + 1) % n]);
        if (!a || !b) continue;
        const t = Math.max(0, Math.min(1, izdusumParametresi(p, a, b)));
        const d = Math.hypot(a.x + (b.x - a.x) * t - p.x, a.y + (b.y - a.y) * t - p.y);
        if (d < enIyi.d) enIyi = { d, z: dogrusal(z(a.id), z(b.id), t) };
      }
      return enIyi.z;
    }
    default:
      return tabanZ(host, z);
  }
}

/**
 * Verilen nesneleri (tanım noktalarıyla birlikte) z ekseninde dz kadar öteler.
 *  - Kilitli nesneler ve z taşımanın dışındaki türler atlanır; aynı nokta bir kez kayar.
 *  - Tanım noktalarından biri kilitli ("Konumu Kilitle") olan nesne BÜTÜNÜYLE yerinde kalır
 *    (kilitli köşe yükselmez, şekil de yarım yamalak eğilmez).
 *  - Kurulumlu ve nesne üzerindeki noktalar doğrudan kaydırılmaz: z'leri kaynaklarından gelir
 *    (`bagimliZleriHesapla`). Kaydırılacak serbest nokta kalmazsa dizi OLDUĞU GİBİ döner; böylece
 *    örn. orta noktanın z okuyla sürüklenmesi geçmişe boş bir adım yazmaz.
 *  - Sonuç 10 basamağa yuvarlanır (yalnız kayan nokta artıkları); Esc sürükleme öncesi anlık
 *    görüntüyü geri yüklediği için bu yuvarlama geri dönüşü bozmaz.
 */
export function nesneleriZdeOtele(objects: MathObject[], objectIds: string[], dz: number): MathObject[] {
  if (!Number.isFinite(dz) || dz === 0 || objectIds.length === 0) return objects;
  const idSet = new Set(objectIds);
  const byId = new Map(objects.map((o) => [o.id, o]));
  const kayacak = new Set<string>();
  for (const o of objects) {
    if (!idSet.has(o.id) || o.locked || !zTasinabilir(o)) continue;
    const tanim = tanimNoktalari(o);
    if (tanim.some((pid) => byId.get(pid)?.locked)) continue;
    for (const pid of tanim) {
      const p = byId.get(pid);
      if (!p || p.type !== 'point' || p.construction || p.onObjectId) continue;
      kayacak.add(pid);
    }
  }
  if (kayacak.size === 0) return objects;
  const sonuc = objects.map((o) => {
    if (o.type !== 'point' || !kayacak.has(o.id)) return o;
    // 10 basamak: 0,1'lik adımların kayan nokta artıkları (0,30000000000000004) temizlenir
    return { ...o, z: Number((noktaZ(o) + dz).toFixed(10)) };
  });
  return bagimliZleriHesapla(sonuc);
}

/**
 * Seçili nesnelerin 3B'deki merkezi (taşıma gizmosunun konumu): tanım noktalarının
 * ortalaması. Tanım noktası olmayan konumlu nesnelerde (metin, görsel…) kendi x, y'si ve z = 0.
 */
export function nesnelerin3BMerkezi(objects: MathObject[], objectIds: string[]): Nokta3B | null {
  const byId = new Map(objects.map((o) => [o.id, o]));
  const noktalar = new Map<string, Nokta3B>();
  const ekKonumlar: Nokta3B[] = [];
  for (const id of objectIds) {
    const o = byId.get(id);
    if (!o) continue;
    const tanim = tanimNoktalari(o);
    if (tanim.length > 0) {
      for (const pid of tanim) {
        const p = byId.get(pid);
        if (p && p.type === 'point') noktalar.set(pid, { x: p.x, y: p.y, z: noktaZ(p) });
      }
    } else if ('x' in o && 'y' in o && typeof o.x === 'number' && typeof o.y === 'number') {
      ekKonumlar.push({ x: o.x, y: o.y, z: 0 });
    }
  }
  const hepsi = [...noktalar.values(), ...ekKonumlar];
  if (hepsi.length === 0) return null;
  const t = hepsi.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y, z: a.z + p.z }), { x: 0, y: 0, z: 0 });
  return { x: t.x / hepsi.length, y: t.y / hepsi.length, z: t.z / hepsi.length };
}

/** Kimliğe göre noktanın 3B konumu (çizim için). */
export function nokta3B(p: PointObject): Nokta3B {
  return { x: p.x, y: p.y, z: noktaZ(p) };
}
