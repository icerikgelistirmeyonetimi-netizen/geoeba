import type {
  LineObject,
  MathObject,
  MeasurementObject,
  PointObject,
  RayObject,
  SegmentObject,
} from '@/types/math';

/**
 * PARÇALI UZUNLUK ÖLÇÜMÜ
 *
 * Doğru parçası / doğru / ışın üzerinde nokta varken (ya da parça o noktadan
 * bölündükten sonra) "baştan sona" ve "noktaya kadar" uzunluklarını ölçmek için
 * saf yardımcılar. Bir nokta çiftinin uzunluğunu ekranda TEK bir nesne taşır:
 * aynı uçlara sahip çizginin kendi `showLength` bayrağı ya da 'distance' ölçüm etiketi.
 */

const ESIK = 1e-3;

type Straight = SegmentObject | LineObject | RayObject;
export type LengthRole = 'whole' | 'piece' | 'toPoint' | 'fromPoint' | 'between';
export type LengthOption = { fromId: string; toId: string; role: LengthRole; viaId?: string };

const isPoint = (o: MathObject | undefined): o is PointObject => o?.type === 'point';
const isStraight = (o: MathObject | undefined): o is Straight =>
  o?.type === 'segment' || o?.type === 'line' || o?.type === 'ray';

export function straightEnds(o: Straight): [string, string] {
  if (o.type === 'segment') return [o.startPointId, o.endPointId];
  if (o.type === 'line') return [o.point1Id, o.point2Id];
  return [o.startPointId, o.throughPointId];
}

/** Sırası önemsiz iki kimlik çifti aynı mı? */
export function samePair(x: readonly string[], y: readonly string[]): boolean {
  return (
    x.length === 2 &&
    y.length === 2 &&
    ((x[0] === y[0] && x[1] === y[1]) || (x[0] === y[1] && x[1] === y[0]))
  );
}

const pointsOf = (scene: MathObject[]) =>
  new Map(scene.filter(isPoint).map((p) => [p.id, p] as const));

/**
 * Verilen parçayla UÇ UCA ve AYNI DOĞRU üzerinde duran parçalar zinciri.
 * "[AB]'yi E'den ikiye ayır" sonrası [AE] + [EB] tek bir [AB] gibi ele alınır.
 */
export function collinearSegmentChain(scene: MathObject[], segmentId: string): SegmentObject[] {
  const start = scene.find((o) => o.id === segmentId && o.type === 'segment') as SegmentObject | undefined;
  if (!start) return [];
  const pts = pointsOf(scene);
  const a = pts.get(start.startPointId);
  const b = pts.get(start.endPointId);
  if (!a || !b) return [start];
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const boy = Math.hypot(ux, uy);
  if (boy < 1e-9) return [start];
  const t = (p: PointObject) => ((p.x - a.x) * ux + (p.y - a.y) * uy) / (boy * boy);
  const uzaklik = (p: PointObject) => Math.abs((p.x - a.x) * uy - (p.y - a.y) * ux) / boy;

  const zincir: SegmentObject[] = [start];
  let [minId, maxId] = t(a) <= t(b) ? [a.id, b.id] : [b.id, a.id];
  let degisti = true;
  while (degisti) {
    degisti = false;
    for (const o of scene) {
      if (o.type !== 'segment' || o.visible === false || zincir.some((z) => z.id === o.id)) continue;
      for (const [uc, bitis] of [[minId, 'min'], [maxId, 'max']] as const) {
        const ucNokta = pts.get(uc);
        if (!ucNokta) continue;
        const digerId = o.startPointId === uc ? o.endPointId : o.endPointId === uc ? o.startPointId : null;
        const diger = digerId ? pts.get(digerId) : undefined;
        if (!diger || uzaklik(diger) > ESIK) continue;
        // Zinciri DIŞA doğru uzatmalı; geri dönen / üst üste binen parça zincir değildir
        if (bitis === 'min' ? t(diger) >= t(ucNokta) - 1e-9 : t(diger) <= t(ucNokta) + 1e-9) continue;
        zincir.push(o);
        if (bitis === 'min') minId = diger.id;
        else maxId = diger.id;
        degisti = true;
        break;
      }
    }
  }
  return zincir;
}

/**
 * Düz bir nesnenin (parça zinciri / doğru / ışın) üzerindeki noktalar, baştan sona SIRALI.
 * Parçada "baş" başlangıç noktasıdır; ışında başlangıç, doğruda point1 → point2 yönü.
 */
export function orderedPointsOnStraight(scene: MathObject[], hostId: string): PointObject[] {
  const host = scene.find((o) => o.id === hostId);
  if (!isStraight(host)) return [];
  const pts = pointsOf(scene);
  const [aId, bId] = straightEnds(host);
  const a = pts.get(aId);
  const b = pts.get(bId);
  if (!a || !b) return [];
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const boy2 = ux * ux + uy * uy;
  if (boy2 < 1e-18) return [];
  const t = (p: PointObject) => ((p.x - a.x) * ux + (p.y - a.y) * uy) / boy2;

  const uyeler: Straight[] = host.type === 'segment' ? collinearSegmentChain(scene, host.id) : [host];
  const uyeKimlik = new Set(uyeler.map((u) => u.id));
  const secilen = new Map<string, PointObject>();
  for (const u of uyeler) for (const id of straightEnds(u)) {
    const p = pts.get(id);
    if (p) secilen.set(p.id, p);
  }
  for (const p of pts.values()) {
    if (secilen.has(p.id) || p.visible === false) continue;
    if (p.onObjectId && uyeKimlik.has(p.onObjectId)) { secilen.set(p.id, p); continue; }
    // Parçada, bağlı olmasa da GEOMETRİK olarak üzerinde duran nokta da sayılır
    // (Canvas'taki uzerindekiNoktalar ile aynı kural).
    if (host.type !== 'segment') continue;
    for (const u of uyeler as SegmentObject[]) {
      const s = pts.get(u.startPointId);
      const e = pts.get(u.endPointId);
      if (!s || !e) continue;
      const dx = e.x - s.x;
      const dy = e.y - s.y;
      const l2 = dx * dx + dy * dy;
      if (l2 < 1e-18) continue;
      const k = Math.max(0, Math.min(1, ((p.x - s.x) * dx + (p.y - s.y) * dy) / l2));
      if (Math.hypot(p.x - (s.x + k * dx), p.y - (s.y + k * dy)) < ESIK) { secilen.set(p.id, p); break; }
    }
  }
  const sirali = [...secilen.values()].sort((p, q) => t(p) - t(q));
  // Çakışık noktaları tekille (sıfır uzunluklu ölçüm sunulmasın)
  return sirali.filter((p, i) => i === 0 || Math.hypot(p.x - sirali[i - 1].x, p.y - sirali[i - 1].y) >= ESIK);
}

/**
 * Sağ tıklanan düz nesne için sunulacak uzunluk ölçümleri.
 * - whole: en baştaki noktadan en sondakine ("baştan sona")
 * - piece: bölünmüş zincirde tıklanan parçanın kendisi
 * - toPoint / fromPoint: aradaki her nokta için "noktaya kadar" / "noktadan sona kadar"
 * - between: iki ya da daha çok ara nokta varken ardışık ara noktaların arası
 * Aynı nokta çifti bir kez sunulur. `focusPointId` aradaysa yalnızca o nokta için madde üretilir;
 * değilse en fazla `maxPoints` ara nokta için madde üretilir (menü uzamasın diye).
 */
export function straightLengthOptions(
  scene: MathObject[],
  hostId: string,
  focusPointId?: string,
  maxPoints = 4
): { ordered: PointObject[]; options: LengthOption[] } {
  const host = scene.find((o) => o.id === hostId);
  const ordered = orderedPointsOnStraight(scene, hostId);
  if (!isStraight(host) || ordered.length < 2) return { ordered, options: [] };
  const ilk = ordered[0];
  const son = ordered[ordered.length - 1];
  const ham: LengthOption[] = [{ fromId: ilk.id, toId: son.id, role: 'whole' }];
  if (host.type === 'segment') {
    const [s, e] = straightEnds(host);
    const sira = new Map(ordered.map((p, i) => [p.id, i] as const));
    const [bas, bit] = (sira.get(s) ?? 0) <= (sira.get(e) ?? 0) ? [s, e] : [e, s];
    ham.push({ fromId: bas, toId: bit, role: 'piece' });
  }
  const ara = ordered.slice(1, -1);
  const odak = ara.find((p) => p.id === focusPointId);
  for (const p of odak ? [odak] : ara.slice(0, maxPoints)) {
    ham.push({ fromId: ilk.id, toId: p.id, role: 'toPoint', viaId: p.id });
    ham.push({ fromId: p.id, toId: son.id, role: 'fromPoint', viaId: p.id });
  }
  for (let i = 1; i + 2 < ordered.length; i++) {
    const [p, q] = [ordered[i], ordered[i + 1]];
    if (odak ? p.id === odak.id || q.id === odak.id : i + 1 <= maxPoints) {
      ham.push({ fromId: p.id, toId: q.id, role: 'between' });
    }
  }
  const options: LengthOption[] = [];
  for (const o of ham) {
    if (!options.some((x) => samePair([x.fromId, x.toId], [o.fromId, o.toId]))) options.push(o);
  }
  return { ordered, options };
}

/**
 * Bir NOKTAYA sağ tıklanınca: nokta bir düz nesnenin (ya da bölünmüş zincirin) ARASINDA
 * duruyorsa baştan sona + noktaya kadar + noktadan sona kadar ölçümleri.
 * Noktanın menüsünde "bu parça" anlamsız olduğundan parça seçeneği noktaya göre adlandırılır.
 */
export function lengthOptionsAtPoint(
  scene: MathObject[],
  pointId: string
): { hostId: string; options: LengthOption[] } | null {
  const p = scene.find((o) => o.id === pointId);
  if (!isPoint(p)) return null;
  const adaylar: string[] = [];
  if (p.onObjectId && isStraight(scene.find((o) => o.id === p.onObjectId))) adaylar.push(p.onObjectId);
  for (const o of scene) {
    if (o.type === 'segment' && o.visible !== false && (o.startPointId === pointId || o.endPointId === pointId)) adaylar.push(o.id);
  }
  for (const o of scene) if (o.type === 'segment' && o.visible !== false) adaylar.push(o.id);
  for (const hostId of adaylar) {
    const { ordered, options } = straightLengthOptions(scene, hostId, pointId);
    const i = ordered.findIndex((q) => q.id === pointId);
    if (i <= 0 || i >= ordered.length - 1) continue;
    return {
      hostId,
      options: options
        .filter((o) => o.role === 'whole' || o.fromId === pointId || o.toId === pointId)
        .map((o): LengthOption => {
          if (o.role !== 'piece') return o;
          // Parçanın öbür ucu zincirin başıysa "noktaya kadar", sonuysa "noktadan sona kadar"; ikisi de değilse
          // (iki kez bölünmüş zincirde) iki ara noktanın "arası"dır.
          const diger = o.fromId === pointId ? o.toId : o.fromId;
          if (diger === ordered[0].id) return { ...o, role: 'toPoint', viaId: pointId };
          if (diger === ordered[ordered.length - 1].id) return { ...o, role: 'fromPoint', viaId: pointId };
          return { fromId: o.fromId, toId: o.toId, role: 'between' };
        }),
    };
  }
  return null;
}

/**
 * Bu nokta çiftinin uzunluğunu taşıyabilecek nesneler: aynı uçlu bütün görünür parça/doğru/ışınlar
 * (önce parçalar; "[AB] uzunluğu" parçaya aittir) ve varsa 'distance' ölçümü.
 */
export function lengthCarrier(
  scene: MathObject[],
  aId: string,
  bId: string
): { flagObjs: Straight[]; measurement?: MeasurementObject } {
  const flagObjs = scene
    .filter((o): o is Straight => isStraight(o) && o.visible !== false && samePair(straightEnds(o), [aId, bId]))
    .sort((x, y) => (x.type === 'segment' ? 0 : 1) - (y.type === 'segment' ? 0 : 1));
  const measurement = scene.find(
    (o) => o.type === 'measurement' && o.kind === 'distance' && samePair(o.pointIds, [aId, bId])
  ) as MeasurementObject | undefined;
  return { flagObjs, measurement };
}

export function isLengthShown(scene: MathObject[], aId: string, bId: string): boolean {
  const { flagObjs, measurement } = lengthCarrier(scene, aId, bId);
  return (
    flagObjs.some((o) => !!o.showLength) ||
    (!!measurement && measurement.showValue !== false && measurement.visible !== false)
  );
}

/**
 * Çiftin uzunluğunu gösterir/gizler. İKİNCİ bir etiket üretmez:
 * - aynı uçlu parça/doğru/ışın varsa onun `showLength` bayrağı kullanılır,
 * - yoksa var olan 'distance' ölçümü açılır, o da yoksa yenisi eklenir.
 * Gizlerken çifti gösteren HER etiket kapanır. Değişiklik yoksa AYNI dizi döner.
 */
export function withLengthMeasurement(
  scene: MathObject[],
  aId: string,
  bId: string,
  show: boolean,
  newId: string,
  now = Date.now()
): MathObject[] {
  if (aId === bId) return scene;
  const { flagObjs, measurement } = lengthCarrier(scene, aId, bId);
  const acikBayraklar = new Set(flagObjs.filter((o) => o.showLength).map((o) => o.id));
  const olcumAcik = !!measurement && measurement.showValue !== false && measurement.visible !== false;
  if (show) {
    if (acikBayraklar.size > 0 || olcumAcik) return scene;
    const bayrak = flagObjs[0];
    if (bayrak) return scene.map((o) => (o.id === bayrak.id ? ({ ...o, showLength: true } as MathObject) : o));
    if (measurement) {
      return scene.map((o) => (o.id === measurement.id ? ({ ...o, showValue: true, visible: true } as MathObject) : o));
    }
    const pts = pointsOf(scene);
    const a = pts.get(aId);
    const b = pts.get(bId);
    if (!a || !b) return scene;
    const etiket: MeasurementObject = {
      id: newId,
      type: 'measurement',
      kind: 'distance',
      label: `|${a.label}${b.label}|`,
      showLabel: true,
      pointIds: [aId, bId],
      showValue: true,
      color: '#0f766e',
      visible: true,
      createdAt: now,
    };
    return [...scene, etiket];
  }
  if (acikBayraklar.size === 0 && !olcumAcik) return scene;
  return scene.map((o) => {
    if (acikBayraklar.has(o.id)) return { ...o, showLength: false } as MathObject;
    if (olcumAcik && o.id === measurement!.id) return { ...o, showValue: false } as MathObject;
    return o;
  });
}

type DuzTur = 'parca' | 'dogru' | 'isin';
type DuzParca = { p: PointObject; q: PointObject; tur: DuzTur };

/** Görünür doğrusal nesnelerin parçaları: doğru parçası, doğru, ışın ve çokgen kenarları. */
function gorunurDuzParcalar(scene: MathObject[], pts: Map<string, PointObject>): DuzParca[] {
  const liste: DuzParca[] = [];
  for (const o of scene) {
    if (o.visible === false) continue;
    if (isStraight(o)) {
      const [i, j] = straightEnds(o);
      const p = pts.get(i);
      const q = pts.get(j);
      if (p && q) liste.push({ p, q, tur: o.type === 'segment' ? 'parca' : o.type === 'line' ? 'dogru' : 'isin' });
    } else if (o.type === 'polygon') {
      const koseler = o.pointIds.map((id) => pts.get(id));
      if (koseler.length < 2 || koseler.some((k) => !k)) continue;
      for (let i = 0; i < koseler.length; i++) {
        liste.push({ p: koseler[i]!, q: koseler[(i + 1) % koseler.length]!, tur: 'parca' });
      }
    }
  }
  return liste;
}

/**
 * [ab] AÇIK aralığının içinde bir engel var mı: ab doğrusu üzerinde, uçlardan ESIK kadar içeride duran
 * görünür bir nokta ya da ab'yi iç noktada kesen (ya da ona iç noktada değen) görünür bir doğrusal nesne.
 * ab ile aynı doğrultudaki nesneler (ölçümün üzerinde durduğu parça, bölünmüş zincirin parçaları) kesmez;
 * a ya da b'den çıkan nesneler de ab'ye yalnız uçta değdiği için sayılmaz.
 */
function aralikEngelli(a: PointObject, b: PointObject, pts: Map<string, PointObject>, parcalar: DuzParca[]): boolean {
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const boy = Math.hypot(ux, uy);
  if (boy < 2 * ESIK) return false;
  const ex = ux / boy;
  const ey = uy / boy;
  const icinde = (s: number) => s > ESIK && s < boy - ESIK;
  for (const p of pts.values()) {
    if (p.id === a.id || p.id === b.id || p.visible === false) continue;
    const rx = p.x - a.x;
    const ry = p.y - a.y;
    if (Math.abs(rx * ey - ry * ex) <= ESIK && icinde(rx * ex + ry * ey)) return true;
  }
  for (const { p, q, tur } of parcalar) {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const dBoy = Math.hypot(dx, dy);
    if (dBoy < 1e-12) continue;
    // a + s·e = p + t·d; payda = e × d. Paralel (aynı doğrudaki dahil) nesne ölçüleni kesmez.
    const payda = ex * dy - ey * dx;
    if (Math.abs(payda) <= 1e-7 * dBoy) continue;
    const wx = p.x - a.x;
    const wy = p.y - a.y;
    const s = (wx * dy - wy * dx) / payda;
    const t = (wx * ey - wy * ex) / payda;
    const pay = ESIK / dBoy;
    if (tur !== 'dogru' && t < -pay) continue;
    if (tur === 'parca' && t > 1 + pay) continue;
    if (icinde(s)) return true;
  }
  return false;
}

/**
 * [ab] boyunca uzanan görünür bir TAŞIYICI çizgi var mı: ab ile aynı doğrultudaki görünür doğru parçaları
 * (bölünmüş zincirin parçaları birlikte), doğrular, ışınlar ve çokgen kenarları [a, b]'yi baştan sona örtüyor mu?
 * Örtmüyorsa (iki serbest nokta, gizli taşıyıcı, çizgiden çekilmiş nokta) ölçülen aralık ekranda hiçbir çizgiyle
 * belli değildir; yalın etiket boşlukta ya da başka bir çizginin yanında durup onun uzunluğu sanılırdı.
 */
function aralikTasiniyor(a: PointObject, b: PointObject, parcalar: DuzParca[]): boolean {
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const boy = Math.hypot(ux, uy);
  if (boy < 1e-9) return true;
  const ex = ux / boy;
  const ey = uy / boy;
  const hat = (p: PointObject) => Math.abs((p.x - a.x) * ey - (p.y - a.y) * ex);
  const t = (p: PointObject) => (p.x - a.x) * ex + (p.y - a.y) * ey;
  const araliklar: [number, number][] = [];
  for (const { p, q, tur } of parcalar) {
    if (hat(p) > ESIK || hat(q) > ESIK) continue;
    const tp = t(p);
    const tq = t(q);
    if (Math.abs(tq - tp) < 1e-12) continue;
    if (tur === 'dogru') return true;
    if (tur === 'isin') araliklar.push(tq > tp ? [tp, Infinity] : [-Infinity, tp]);
    else araliklar.push([Math.min(tp, tq), Math.max(tp, tq)]);
  }
  araliklar.sort((x, y) => x[0] - y[0]);
  // Soldan sağa örtülen uç: bir boşluk kalırsa (sıralı olduğu için sonrakiler de onu kapatamaz) taşınmıyor
  let ortulen = 0;
  for (const [lo, hi] of araliklar) {
    if (lo > ortulen + ESIK) break;
    ortulen = Math.max(ortulen, hi);
    if (ortulen >= boy - ESIK) return true;
  }
  return false;
}

/**
 * [ab] görünür bir çizginin üzerinde mi (bkz. aralikTasiniyor)? Taşıyıcısı olmayan ölçümün kesikli ölçü
 * çizgisi, ölçülen aralığı gösteren tek çizgidir.
 */
export function tasiyiciCizgiVar(scene: MathObject[], measurementId: string): boolean {
  const m = scene.find((o) => o.id === measurementId);
  if (!m || m.type !== 'measurement' || m.kind !== 'distance') return false;
  const pts = pointsOf(scene);
  const a = pts.get(m.pointIds[0]);
  const b = pts.get(m.pointIds[1]);
  if (!a || !b) return false;
  return aralikTasiniyor(a, b, gorunurDuzParcalar(scene, pts));
}

/**
 * KESİKLİ ÖLÇÜ ÇİZGİSİ GEREKLİ Mİ? (kullanıcı isteği, 2026-09-25: "araya doğru girmeyince kesikli çizgiye
 * gerek yok"). 'distance' ölçümünün iki ucu arasında başka bir görünür nokta ya da onu kesen görünür bir
 * doğrusal nesne varsa kesikli çizgi hangi aralığın ölçüldüğünü gösterir; yoksa etiket, parça uzunluğu gibi
 * çizginin yanında yalın durur. Bu işlev yalnız ENGELE bakar; taşıyıcı çizgi için bkz. olcuCizgisiGerekli.
 */
export function arasindaEngelVar(scene: MathObject[], measurementId: string): boolean {
  const m = scene.find((o) => o.id === measurementId);
  if (!m || m.type !== 'measurement' || m.kind !== 'distance') return false;
  const pts = pointsOf(scene);
  const a = pts.get(m.pointIds[0]);
  const b = pts.get(m.pointIds[1]);
  if (!a || !b) return false;
  return aralikEngelli(a, b, pts, gorunurDuzParcalar(scene, pts));
}

/** Kesikli ölçü çizgisi kuralı: arada engel var YA DA ölçülen aralığı taşıyan görünür bir çizgi yok. */
function olcuCizgisiKarari(a: PointObject, b: PointObject, pts: Map<string, PointObject>, parcalar: DuzParca[]): boolean {
  return aralikEngelli(a, b, pts, parcalar) || !aralikTasiniyor(a, b, parcalar);
}

/**
 * 'distance' ölçümü kesikli ölçü çizgisiyle mi çizilir? Arada görünür bir nokta ya da kesen çizgi varsa
 * (arasindaEngelVar) ya da [ab]'yi taşıyan görünür bir çizgi yoksa (tasiyiciCizgiVar) evet; ikisi de değilse
 * ölçü, çizili bir doğrunun üzerindeki boş aralıktır ve etiket çizginin yanında yalın durur.
 */
export function olcuCizgisiGerekli(scene: MathObject[], measurementId: string): boolean {
  const m = scene.find((o) => o.id === measurementId);
  if (!m || m.type !== 'measurement' || m.kind !== 'distance') return false;
  const pts = pointsOf(scene);
  const a = pts.get(m.pointIds[0]);
  const b = pts.get(m.pointIds[1]);
  if (!a || !b) return false;
  return olcuCizgisiKarari(a, b, pts, gorunurDuzParcalar(scene, pts));
}

export interface DistanceLabelLayout {
  /** Kesikli ölçü çizgisi (uç çentikleriyle) çizilir mi (olcuCizgisiGerekli)? false: etiket çizginin yanında yalın durur. */
  kesikli: boolean;
  /** Kesikli ölçü çizgisinin katı (0 = çizgiye en yakın). Yalın etiketlerde her zaman 0 (yakın bant). */
  kat: number;
}

/**
 * Görünür bütün 'distance' ölçümlerinin yerleşimi. Aynı doğru üzerindeki etiketler üst üste binmesin:
 * - yalın etiketler (arada engel yok, aralık çizili) çizginin hemen yanındaki YAKIN BANTTA durur; aralıkları birbirinin
 *   içine giremez (girse öbürü engelli olurdu), bu yüzden hepsi 0. kattır,
 * - kesikli ölçü çizgileri, aralıkları ÖRTÜŞEN ölçümlerin (yalın etiketler 0. katı tutar) kullanmadığı en
 *   alçak katı alır: kısa ölçüm önce yerleşir, sıra uzunluk ve kimlikle belirlenir. Yakın bantta yalın bir
 *   etiketle örtüşen kesikli çizgi böylece bandın dışından başlar.
 */
export function distanceLabelLayouts(scene: MathObject[]): Map<string, DistanceLabelLayout> {
  const pts = pointsOf(scene);
  const parcalar = gorunurDuzParcalar(scene, pts);
  const sonuc = new Map<string, DistanceLabelLayout>();
  const olcumler = scene.filter(
    (o): o is MeasurementObject =>
      o.type === 'measurement' && o.kind === 'distance' && o.showValue !== false && o.visible !== false
  );
  const kesikli = new Map<string, boolean>();
  for (const m of olcumler) {
    const a = pts.get(m.pointIds[0]);
    const b = pts.get(m.pointIds[1]);
    kesikli.set(m.id, !!a && !!b && olcuCizgisiKarari(a, b, pts, parcalar));
  }
  for (const m of olcumler) {
    if (sonuc.has(m.id)) continue;
    const a = pts.get(m.pointIds[0]);
    const b = pts.get(m.pointIds[1]);
    const ux = a && b ? b.x - a.x : 0;
    const uy = a && b ? b.y - a.y : 0;
    const boy = Math.hypot(ux, uy);
    if (!a || !b || boy < 1e-9) {
      sonuc.set(m.id, { kesikli: kesikli.get(m.id) ?? false, kat: 0 });
      continue;
    }
    const t = (p: PointObject) => ((p.x - a.x) * ux + (p.y - a.y) * uy) / boy;
    const hat = (p: PointObject) => Math.abs((p.x - a.x) * uy - (p.y - a.y) * ux) / boy;
    const araliklar = olcumler.flatMap((d) => {
      if (sonuc.has(d.id)) return [];
      const p = pts.get(d.pointIds[0]);
      const q = pts.get(d.pointIds[1]);
      if (!p || !q || hat(p) > ESIK || hat(q) > ESIK) return [];
      return [{ id: d.id, lo: Math.min(t(p), t(q)), hi: Math.max(t(p), t(q)), kesikli: kesikli.get(d.id) ?? false }];
    });
    // Eşit uzunluklar ölçüldükleri yöne göre kayan noktada 1e-15 kadar farklı çıkabilir: toleransla karşılaştır
    araliklar.sort((x, y) => {
      const fark = x.hi - x.lo - (y.hi - y.lo);
      return Math.abs(fark) > 1e-9 ? fark : x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
    });
    const katlar = new Map<string, number>();
    for (const x of araliklar) if (!x.kesikli) katlar.set(x.id, 0);
    for (const x of araliklar) {
      if (!x.kesikli) continue;
      const dolu = new Set(
        araliklar
          .filter((y) => katlar.has(y.id) && x.lo < y.hi - 1e-9 && y.lo < x.hi - 1e-9)
          .map((y) => katlar.get(y.id)!)
      );
      let kat = 0;
      while (dolu.has(kat)) kat++;
      katlar.set(x.id, kat);
    }
    for (const x of araliklar) sonuc.set(x.id, { kesikli: x.kesikli, kat: katlar.get(x.id) ?? 0 });
    if (!sonuc.has(m.id)) sonuc.set(m.id, { kesikli: kesikli.get(m.id) ?? false, kat: 0 });
  }
  return sonuc;
}

/**
 * [ab] UZUNLUĞU GÖSTERİLEN bir çokgen kenarının üzerinde mi? Öyleyse o kenarın uzunluk etiketinin durduğu yan:
 * çokgenin DIŞINA bakan birim normal (dünya koordinatı; köşelerin ortalamasından uzaklaşan yön, Canvas'taki kenar
 * etiketiyle aynı kural). Yoksa null. Canvas yalın mesafe etiketini bu yanın tersine koyar, kesikli ölçü çizgisini
 * de kenar etiketinin dışından başlatır: üst kenardaki '7 br' ile kenarın '8 br'si yan yana tek yazı gibi okunuyordu.
 */
export function kenarEtiketiYani(scene: MathObject[], measurementId: string): { x: number; y: number } | null {
  const m = scene.find((o) => o.id === measurementId);
  if (!m || m.type !== 'measurement' || m.kind !== 'distance') return null;
  const pts = pointsOf(scene);
  const a = pts.get(m.pointIds[0]);
  const b = pts.get(m.pointIds[1]);
  if (!a || !b) return null;
  for (const o of scene) {
    if (o.type !== 'polygon' || o.visible === false || !o.edgeLabels?.length) continue;
    const koseler = o.pointIds.map((id) => pts.get(id));
    if (koseler.length < 3 || koseler.some((k) => !k)) continue;
    const n = koseler.length;
    const mx = koseler.reduce((t, k) => t + k!.x, 0) / n;
    const my = koseler.reduce((t, k) => t + k!.y, 0) / n;
    for (const i of o.edgeLabels) {
      if (!Number.isInteger(i) || i < 0 || i >= n) continue;
      const p = koseler[i]!;
      const q = koseler[(i + 1) % n]!;
      const boy = Math.hypot(q.x - p.x, q.y - p.y);
      if (boy < 1e-9) continue;
      const ex = (q.x - p.x) / boy;
      const ey = (q.y - p.y) / boy;
      const hat = (r: PointObject) => Math.abs((r.x - p.x) * ey - (r.y - p.y) * ex);
      if (hat(a) > ESIK || hat(b) > ESIK) continue;
      const ta = (a.x - p.x) * ex + (a.y - p.y) * ey;
      const tb = (b.x - p.x) * ex + (b.y - p.y) * ey;
      // Aralıklar örtüşmeli (yalnız uçta değmek yetmez): etiket kenarın ortasında, ölçü aralığı orada olmayabilir
      if (Math.min(Math.max(ta, tb), boy) - Math.max(Math.min(ta, tb), 0) <= ESIK) continue;
      let nx = -ey;
      let ny = ex;
      if (((p.x + q.x) / 2 - mx) * nx + ((p.y + q.y) / 2 - my) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }
      return { x: nx, y: ny };
    }
  }
  return null;
}

/** Tek ölçümün kesikli ölçü çizgisi katı (bkz. distanceLabelLayouts). */
export function distanceLabelLevel(scene: MathObject[], measurementId: string): number {
  return distanceLabelLayouts(scene).get(measurementId)?.kat ?? 0;
}
