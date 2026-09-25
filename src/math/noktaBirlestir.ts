/**
 * ÜST ÜSTE GELEN NOKTALARI BİRLEŞTİRME.
 *
 * Öğretmen bir noktayı sürükleyip başka bir noktanın üstüne bıraktığında ekranda iki ad yan yana
 * durur ("C" ile "A") ama sahnede hâlâ İKİ nokta vardır: biri sürüklenince çizim ikiye ayrılır.
 * Bu modül ikisini TEK noktaya indirir — biri kalır, diğeri kaldırılır ve sahnedeki HER başvuru
 * (şekil noktaları, çokgen köşeleri, açı kolları, ölçümler, onay kutusu/düğme hedefleri, kurulum
 * kaynakları, üzerinde durulan nesne) kalan noktaya yönlendirilir.
 *
 * Saf bir modüldür: React'e, duruma ve görünüme bağlı değildir. Hem sağ tık menüsü
 * (Canvas.tsx) hem de yazılı/sesli komut motoru aynı kuralı buradan alır.
 */
import type { MathObject, PointObject, SegmentObject } from '@/types/math';
import { GERI_AL_IPUCU, describeList } from '@/math/nesneAdlari';
import { constructionDependencies, resolveCommandBindings } from '@/math/commandBindings';

/** "Üst üste" sayılma sınırı: ekranda bu kadar piksele kadar yakın noktalar bir aradadır. */
export const BIRLESTIRME_PIKSELI = 12;

/** Ekran piksel sınırının dünya birimi karşılığı (zoom = piksel / birim). */
export function birlestirmeToleransi(zoom: number): number {
  return Number.isFinite(zoom) && zoom > 0 ? BIRLESTIRME_PIKSELI / zoom : 0.25;
}

const noktaMi = (o: MathObject | undefined): o is PointObject => o?.type === 'point';
const gorunur = (p: PointObject) => p.visible !== false;
const uzaklik = (a: PointObject, b: PointObject) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Bir nesnenin doğrudan başvurduğu kimlikler.
 *
 * WorkspaceContext.objectDependencies ile AYNI listeyi verir (testi bunu doğrular); burada ayrıca
 * tutulmasının nedeni bu modülün React'li duruma bağlanmadan (döngüsel içe aktarma olmadan)
 * çalışabilmesidir. Bozulan nesnelerin zincirleme kaldırılmasında kullanılır.
 */
export function bagimliliklar(o: MathObject): string[] {
  switch (o.type) {
    case 'segment': return [o.startPointId, o.endPointId];
    case 'line': return [o.point1Id, o.point2Id];
    case 'ray': return [o.startPointId, o.throughPointId];
    case 'circle':
      return o.throughPointIds && o.throughPointIds.length > 0
        ? [...o.throughPointIds, ...(o.radiusPointId ? [o.radiusPointId] : [])]
        : [o.centerPointId, ...(o.radiusPointId ? [o.radiusPointId] : [])];
    case 'ellipse': return [o.centerPointId, ...Object.values(o.sliderBindings ?? {})];
    case 'arc':
    case 'sector': return [o.centerPointId, o.startPointId, o.directionPointId];
    case 'angle': return [o.point1Id, o.vertexPointId, o.point3Id, ...(o.valueSliderId ? [o.valueSliderId] : [])];
    case 'polygon': return o.pointIds;
    case 'measurement':
      return o.kind === 'arc'
        ? [...o.pointIds, ...(o.throughPointId ? [o.throughPointId] : []), ...(o.circleId ? [o.circleId] : [])]
        : o.pointIds;
    case 'checkbox': return o.targetIds;
    case 'button': {
      const act = o.action;
      if (act.kind === 'toggle') return act.targetIds;
      if (act.kind === 'animate') return [...(act.sliderIds ?? []), ...(act.targetIds ?? [])];
      if (act.kind === 'setSlider') return [act.sliderId];
      if (act.kind === 'setValue') return [act.targetId];
      return [];
    }
    case 'input_box': return [o.targetId];
    case 'point': return [...(o.onObjectId ? [o.onObjectId] : []), ...kurulumKaynaklari(o)];
    default: return [];
  }
}

/** Kurulumlu (türetilmiş) bir noktanın kaynak kimlikleri. */
export function kurulumKaynaklari(point: PointObject): string[] {
  return constructionDependencies(point);
}

// --------------------------------------------------------------------------- üst üste gelme

/**
 * `pointId` ile ÜST ÜSTE duran (tolerans kadar yakın) diğer GÖRÜNÜR noktalar; yakından uzağa.
 * Görünmez yardımcı noktalar "üst üste görünmez", bu yüzden hiç sayılmaz.
 */
export function ustUsteNoktalar(objects: readonly MathObject[], pointId: string, tolerans: number): PointObject[] {
  const hedef = objects.find(o => o.id === pointId);
  if (!noktaMi(hedef) || !gorunur(hedef)) return [];
  return objects
    .filter((o): o is PointObject => noktaMi(o) && o.id !== pointId && gorunur(o) && uzaklik(o, hedef) <= tolerans)
    .sort((a, b) => uzaklik(a, hedef) - uzaklik(b, hedef) || a.createdAt - b.createdAt);
}

/** İki nokta üst üste mi? */
export function ustUsteMi(objects: readonly MathObject[], idA: string, idB: string, tolerans: number): boolean {
  const a = objects.find(o => o.id === idA), b = objects.find(o => o.id === idB);
  return noktaMi(a) && noktaMi(b) && a.id !== b.id && uzaklik(a, b) <= tolerans;
}

/** Sahnedeki bütün üst üste gelen nokta çiftleri (her çift bir kez, sahnedeki sırayla). */
export function ustUsteCiftler(objects: readonly MathObject[], tolerans: number): [string, string][] {
  const noktalar = objects.filter((o): o is PointObject => noktaMi(o) && gorunur(o));
  const ciftler: [string, string][] = [];
  for (let i = 0; i < noktalar.length; i++) {
    for (let j = i + 1; j < noktalar.length; j++) {
      if (uzaklik(noktalar[i], noktalar[j]) <= tolerans) ciftler.push([noktalar[i].id, noktalar[j].id]);
    }
  }
  return ciftler;
}

// --------------------------------------------------------------------------- hangisi kalacak

/** `id`, `hedefId`e (dolaylı da olsa) dayanıyor mu? */
function dayaniyorMu(byId: Map<string, MathObject>, id: string, hedefId: string, gorulen = new Set<string>()): boolean {
  if (id === hedefId) return false;
  if (gorulen.has(id)) return false;
  gorulen.add(id);
  const o = byId.get(id);
  if (!o) return false;
  return bagimliliklar(o).some(dep => dep === hedefId || dayaniyorMu(byId, dep, hedefId, gorulen));
}

/** Noktayı kullanan (kendisi ve eş dışındaki) nesne sayısı. */
function kullananSayisi(objects: readonly MathObject[], id: string, esId: string): number {
  return objects.filter(o => o.id !== id && o.id !== esId && bagimliliklar(o).includes(id)).length;
}

export type BirlesmeSirasi = {
  /** Sahnede kalacak nokta */
  keepId: string;
  /** Kaldırılacak nokta */
  dropId: string;
  /** Kararın nedeni: bağımlılık yönü, kurulumlu olması, daha çok kullanılması ya da önce çizilmiş olması */
  reason: 'bagimlilik' | 'kurulumlu' | 'kullanim' | 'once';
};

/**
 * İki noktadan hangisinin KALACAĞINA karar verir.
 *
 * Sıra:
 *  1. Biri diğerine dayanıyorsa (ör. A'nın orta noktası M) DAYANAN kalamaz; yoksa kendi kendine
 *     gönderme yapan bir kurulum (döngü) doğar.
 *  2. Kurulumlu ya da bir nesnenin üzerinde duran nokta, serbest noktayı yener: konumunu tanımı belirler.
 *  3. Eşitlikte sahnenin daha çok dayandığı nokta kalır (daha az başvuru yönlendirilir).
 *  4. Yine eşitlikte önce çizilen kalır.
 */
export function birlesmeSirasi(objects: readonly MathObject[], idA: string, idB: string): BirlesmeSirasi | null {
  const a = objects.find(o => o.id === idA), b = objects.find(o => o.id === idB);
  if (!noktaMi(a) || !noktaMi(b) || a.id === b.id) return null;
  const byId = new Map(objects.map(o => [o.id, o]));
  const aDayanir = dayaniyorMu(byId, a.id, b.id);
  const bDayanir = dayaniyorMu(byId, b.id, a.id);
  if (aDayanir !== bDayanir) {
    return aDayanir ? { keepId: b.id, dropId: a.id, reason: 'bagimlilik' } : { keepId: a.id, dropId: b.id, reason: 'bagimlilik' };
  }
  const kurulu = (p: PointObject) => !!p.construction || !!p.onObjectId;
  if (kurulu(a) !== kurulu(b)) {
    return kurulu(a) ? { keepId: a.id, dropId: b.id, reason: 'kurulumlu' } : { keepId: b.id, dropId: a.id, reason: 'kurulumlu' };
  }
  const aKullanim = kullananSayisi(objects, a.id, b.id), bKullanim = kullananSayisi(objects, b.id, a.id);
  if (aKullanim !== bKullanim) {
    return aKullanim > bKullanim ? { keepId: a.id, dropId: b.id, reason: 'kullanim' } : { keepId: b.id, dropId: a.id, reason: 'kullanim' };
  }
  const aOnce = a.createdAt !== b.createdAt
    ? a.createdAt < b.createdAt
    : objects.findIndex(o => o.id === a.id) < objects.findIndex(o => o.id === b.id);
  return aOnce ? { keepId: a.id, dropId: b.id, reason: 'once' } : { keepId: b.id, dropId: a.id, reason: 'once' };
}

// --------------------------------------------------------------------------- başvuruları yönlendirme

const benzersiz = (ids: string[]) => [...new Set(ids)];

/**
 * Nesnedeki HER nokta başvurusunu `eski`den `yeni`ye çevirir.
 *
 * Tür tür yazılmıştır (körlemesine derin değiştirme değil): yeni bir nesne türü ya da yeni bir
 * kurulum eklendiğinde derleyici burada da eksik kalanı gösterir ve testler kanıtlar.
 */
export function baglariYonlendir(o: MathObject, eski: string, yeni: string): MathObject {
  const r = (id: string) => (id === eski ? yeni : id);
  const rOpt = (id: string | undefined) => (id === undefined ? undefined : r(id));
  const rList = (ids: string[]) => ids.map(r);
  // Konum çapaları geometrik bağımlılık değildir; yine de kaldırılan noktanın
  // kimliğini taşımamalı ve birleşen nokta merkez hesabında iki kez sayılmamalı.
  if (o.labelAnchors && Object.values(o.labelAnchors).some(anchor => anchor.pointIds.includes(eski))) {
    o = { ...o, labelAnchors: Object.fromEntries(Object.entries(o.labelAnchors).map(([kind, anchor]) =>
      [kind, { ...anchor, pointIds: benzersiz(rList(anchor.pointIds)) }])) } as MathObject;
  }
  switch (o.type) {
    case 'slider': return o.bindingTarget?.objectId === eski
      ? { ...o, bindingTarget: { ...o.bindingTarget, objectId: yeni } } : o;
    case 'segment': return { ...o, startPointId: r(o.startPointId), endPointId: r(o.endPointId) };
    case 'line': return { ...o, point1Id: r(o.point1Id), point2Id: r(o.point2Id) };
    case 'ray': return { ...o, startPointId: r(o.startPointId), throughPointId: r(o.throughPointId) };
    case 'circle': {
      const cember = { ...o, centerPointId: r(o.centerPointId) };
      if (o.radiusPointId !== undefined) cember.radiusPointId = r(o.radiusPointId);
      if (o.releasedRadiusPointId !== undefined) cember.releasedRadiusPointId = r(o.releasedRadiusPointId);
      if (o.throughPointIds) cember.throughPointIds = rList(o.throughPointIds);
      // Kilitlenirken bırakılan yarıçap noktası merkezin kendisi olduysa kilit çözümünde yarıçap 0 olurdu
      if (cember.releasedRadiusPointId === cember.centerPointId) delete cember.releasedRadiusPointId;
      return cember;
    }
    case 'ellipse': return { ...o, centerPointId: r(o.centerPointId) };
    case 'arc':
    case 'sector': return { ...o, centerPointId: r(o.centerPointId), startPointId: r(o.startPointId), directionPointId: r(o.directionPointId) };
    case 'angle': return { ...o, point1Id: r(o.point1Id), vertexPointId: r(o.vertexPointId), point3Id: r(o.point3Id) };
    case 'polygon': return { ...o, pointIds: rList(o.pointIds) };
    case 'measurement': {
      const olcum = { ...o, pointIds: rList(o.pointIds) };
      if (o.circleId !== undefined) olcum.circleId = r(o.circleId);
      if (o.startPointId !== undefined) olcum.startPointId = r(o.startPointId);
      if (o.throughPointId !== undefined) olcum.throughPointId = r(o.throughPointId);
      // "BCD yayı"nın ara noktası uçlardan biriyle aynı olduysa artık bir şey anlatmaz
      if (olcum.throughPointId !== undefined && olcum.pointIds.includes(olcum.throughPointId)) delete olcum.throughPointId;
      if (olcum.startPointId !== undefined && !olcum.pointIds.includes(olcum.startPointId)) delete olcum.startPointId;
      return olcum;
    }
    case 'checkbox': return { ...o, targetIds: benzersiz(rList(o.targetIds)) };
    case 'button': {
      const act = o.action;
      if (act.kind === 'toggle') return { ...o, action: { ...act, targetIds: benzersiz(rList(act.targetIds)) } };
      if (act.kind === 'animate') {
        return { ...o, action: { ...act,
          ...(act.sliderIds ? { sliderIds: benzersiz(rList(act.sliderIds)) } : {}),
          ...(act.targetIds ? { targetIds: benzersiz(rList(act.targetIds)) } : {}) } };
      }
      if (act.kind === 'setSlider') return { ...o, action: { ...act, sliderId: r(act.sliderId) } };
      if (act.kind === 'setValue') return { ...o, action: { ...act, targetId: r(act.targetId) } };
      return o;
    }
    case 'input_box': return { ...o, targetId: r(o.targetId) };
    case 'point': {
      const nokta: PointObject = { ...o };
      if (o.onObjectId !== undefined) nokta.onObjectId = r(o.onObjectId);
      // Kendine dönen bağ bırakılmaz: kayıtlı çalışma "bağımlılıklarda döngü var" diye açılamaz olurdu
      if (o.dependsOn) nokta.dependsOn = benzersiz(rList(o.dependsOn)).filter(id => id !== o.id);
      if (o.construction) nokta.construction = kurulumuYonlendir(o.construction, r);
      return nokta;
    }
    default: return o;
  }
}

function kurulumuYonlendir(rule: NonNullable<PointObject['construction']>, r: (id: string) => string): NonNullable<PointObject['construction']> {
  switch (rule.kind) {
    case 'foot': return { ...rule, sourceId: r(rule.sourceId), linePointIds: [r(rule.linePointIds[0]), r(rule.linePointIds[1])] };
    case 'midpoint': return { ...rule, pointIds: [r(rule.pointIds[0]), r(rule.pointIds[1])] };
    case 'tangent': return { ...rule, circleId: r(rule.circleId), sourceId: r(rule.sourceId) };
    case 'triangleVertex': return { ...rule, anchorId: r(rule.anchorId) };
    case 'sliderPoint':
      if (rule.mode === 'angle') return { ...rule, anchorId: r(rule.anchorId), referenceId: r(rule.referenceId) };
      if (rule.mode === 'length') return { ...rule, anchorId: r(rule.anchorId) };
      return rule;
    case 'ratio': return { ...rule, pointIds: [r(rule.pointIds[0]), r(rule.pointIds[1])] };
    case 'direction': return { ...rule, throughId: r(rule.throughId), linePointIds: [r(rule.linePointIds[0]), r(rule.linePointIds[1])] };
    case 'bisector': return { ...rule, pointIds: [r(rule.pointIds[0]), r(rule.pointIds[1]), r(rule.pointIds[2])] };
    case 'intersection': return { ...rule, objectIds: [r(rule.objectIds[0]), r(rule.objectIds[1])] };
    case 'reflect': return { ...rule, sourceId: r(rule.sourceId),
      ...(rule.axisPointIds ? { axisPointIds: [r(rule.axisPointIds[0]), r(rule.axisPointIds[1])] as [string, string] } : {}),
      ...(rule.centerId ? { centerId: r(rule.centerId) } : {}) };
    case 'rotate': return { ...rule, sourceId: r(rule.sourceId), ...(rule.centerId ? { centerId: r(rule.centerId) } : {}) };
    case 'translate': return { ...rule, sourceId: r(rule.sourceId),
      ...(rule.vectorPointIds ? { vectorPointIds: [r(rule.vectorPointIds[0]), r(rule.vectorPointIds[1])] as [string, string] } : {}) };
    case 'dilate': return { ...rule, sourceId: r(rule.sourceId), ...(rule.centerId ? { centerId: r(rule.centerId) } : {}) };
    case 'triangleCenter': return { ...rule, pointIds: [r(rule.pointIds[0]), r(rule.pointIds[1]), r(rule.pointIds[2])] };
    default: return rule;
  }
}

// --------------------------------------------------------------------------- bozulanları toparlama

/** Çokgenden ARDIŞIK yinelenen köşeleri düşürür; kenar etiketleri ve çentikleri yeni dizinlere taşınır. */
function cokgeniTopla(pointIds: string[]): { pointIds: string[]; kenarEslemesi: Map<number, number> } {
  const kalan: number[] = [];
  const temsil = new Array<number>(pointIds.length);
  for (let i = 0; i < pointIds.length; i++) {
    const sonKalan = kalan.length ? kalan[kalan.length - 1] : -1;
    if (sonKalan >= 0 && pointIds[sonKalan] === pointIds[i]) { temsil[i] = sonKalan; continue; }
    kalan.push(i);
    temsil[i] = i;
  }
  while (kalan.length > 1 && pointIds[kalan[kalan.length - 1]] === pointIds[kalan[0]]) {
    const dusen = kalan.pop()!;
    for (let i = 0; i < temsil.length; i++) if (temsil[i] === dusen) temsil[i] = kalan[0];
  }
  const yeniDizin = new Map(kalan.map((eski, k) => [eski, k]));
  const kenarEslemesi = new Map<number, number>();
  for (let i = 0; i < pointIds.length; i++) {
    if (pointIds[i] === pointIds[(i + 1) % pointIds.length]) continue;
    const k = yeniDizin.get(temsil[i]);
    if (k !== undefined && !kenarEslemesi.has(i)) kenarEslemesi.set(i, k);
  }
  return { pointIds: kalan.map(i => pointIds[i]), kenarEslemesi };
}

/**
 * Birleşmeden sonra KURULUMU anlamını yitiren nokta mı?
 *
 * Kaynakları çakışınca bir kurulum ya HİÇ çözülemez (ör. yansıma ekseninin iki noktası aynı olur:
 * `resolveCommandBindings` hata verir, bu da bütün adımı sessizce reddettirirdi) ya da nokta sonsuza
 * dek kaynağının üstüne yapışır (ör. "A ile A'nın orta noktası" ya da merkezi kendisi olan büyütme).
 * İkisi de çizilemez sayılır: nokta kaldırılır, ona dayanan her şey zincirleme gider ve ipucunda adı söylenir.
 */
function kurulumCokmusMu(p: PointObject, byId?: ReadonlyMap<string, MathObject>): boolean {
  const rule = p.construction;
  if (!rule) return false;
  const yinelenen = (ids: readonly string[]) => new Set(ids).size !== ids.length;
  switch (rule.kind) {
    case 'midpoint':
    case 'ratio':
    case 'bisector':
    case 'triangleCenter':
      return yinelenen(rule.pointIds);
    case 'foot':
    case 'direction':
      return rule.linePointIds[0] === rule.linePointIds[1];
    case 'translate':
      return !!rule.vectorPointIds && rule.vectorPointIds[0] === rule.vectorPointIds[1];
    case 'reflect':
      return (!!rule.axisPointIds && rule.axisPointIds[0] === rule.axisPointIds[1])
        || (!!rule.centerId && rule.centerId === rule.sourceId);
    case 'rotate':
    case 'dilate':
      return !!rule.centerId && rule.centerId === rule.sourceId;
    case 'sliderPoint':
      return rule.mode === 'angle' && rule.anchorId === rule.referenceId;
    case 'tangent': {
      // Teğetin çıkış noktası çemberin MERKEZİ olduysa teğet çizilemez (merkez çemberin içindedir)
      const cember = byId?.get(rule.circleId);
      return !!cember && cember.type === 'circle' && !cember.throughPointIds?.length && cember.centerPointId === rule.sourceId;
    }
    default:
      return false;
  }
}

/** Birleşmeden sonra ARTIK ÇİZİLEMEYEN nesne mi? (iki ucu aynı parça, üç noktası kalmayan yay, köşesi koluna eşit açı, kaynakları çöken kurulum…) */
export function bozukMu(o: MathObject, byId?: ReadonlyMap<string, MathObject>): boolean {
  switch (o.type) {
    case 'segment': return o.startPointId === o.endPointId;
    case 'line': return o.point1Id === o.point2Id;
    case 'ray': return o.startPointId === o.throughPointId;
    case 'circle':
      if (o.throughPointIds && o.throughPointIds.length > 0) return new Set(o.throughPointIds).size !== o.throughPointIds.length;
      return !!o.radiusPointId && o.radiusPointId === o.centerPointId;
    case 'arc':
    case 'sector': return new Set([o.centerPointId, o.startPointId, o.directionPointId]).size !== 3;
    case 'angle': return new Set([o.point1Id, o.vertexPointId, o.point3Id]).size !== 3;
    case 'polygon': return cokgeniTopla(o.pointIds).pointIds.length < 3;
    case 'measurement': return new Set(o.pointIds).size !== o.pointIds.length;
    case 'point': return kurulumCokmusMu(o, byId);
    default: return false;
  }
}

/** Kaldırılan bir açının kolu olarak işaretli kalan parçadan bu bağı düşürür (sarkık `armOfAngleId` kalmasın). */
function kolBaginiCoz(o: MathObject, kaldirilan: ReadonlySet<string>): MathObject {
  if (o.type !== 'segment' || !o.armOfAngleId || !kaldirilan.has(o.armOfAngleId)) return o;
  const { armOfAngleId: _kol, ...parca } = o as SegmentObject;
  return parca as MathObject;
}

/** Çizilebilir kalan ama artık AYNI köşeden iki kez geçen çokgenler (ardışık olmayan yineleme). */
function sikisanCokgenler(objects: readonly MathObject[]): MathObject[] {
  return objects.filter(o => o.type === 'polygon' && new Set(o.pointIds).size !== o.pointIds.length);
}

/** Aynı şeyi ölçen ikinci etiketin kimliği (ilki kalır). */
function yinelenenOlcumler(objects: readonly MathObject[]): Set<string> {
  const gorulen = new Set<string>(), yineleyen = new Set<string>();
  for (const o of objects) {
    if (o.type !== 'measurement') continue;
    const siralanir = o.kind === 'distance' || o.kind === 'arc';
    const noktalar = siralanir ? [...o.pointIds].sort() : o.pointIds;
    const anahtar = `${o.kind}|${noktalar.join(',')}|${o.circleId ?? ''}`;
    if (gorulen.has(anahtar)) yineleyen.add(o.id);
    else gorulen.add(anahtar);
  }
  return yineleyen;
}

/** Kaldırılan kimliklere (geçişli olarak) dayanan her şeyi de toplar. */
function zinciriTopla(objects: readonly MathObject[], ids: Iterable<string>): Set<string> {
  const kaldirilan = new Set(ids);
  let degisti = true;
  while (degisti) {
    degisti = false;
    for (const o of objects) {
      if (kaldirilan.has(o.id)) continue;
      if (bagimliliklar(o).some(d => kaldirilan.has(d))) { kaldirilan.add(o.id); degisti = true; }
    }
  }
  return kaldirilan;
}

// --------------------------------------------------------------------------- birleştirme

export interface BirlestirmeSonucu {
  /** Yeni sahne (değişiklik yoksa AYNI dizi) */
  objects: MathObject[];
  changed: boolean;
  /** Sahnede kalan noktanın kimliği */
  keepId: string;
  /** Kaldırılan noktanın kimliği */
  dropId: string;
  keepLabel: string;
  dropLabel: string;
  /** Kalan noktaya yönlendirilen nesne sayısı */
  yonlendirilen: number;
  /** Bozulduğu için kaldırılan nesneler (birleşen nokta hariç) */
  kaldirilanlar: MathObject[];
  /** Çizilebilir kalan ama artık aynı köşeden iki kez geçen çokgenler (ipucunda uyarılır) */
  sikisanlar: MathObject[];
  /** Birleştirme yapılamadıysa nedeni */
  hata?: string;
}

const basarisiz = (objects: MathObject[], hata: string): BirlestirmeSonucu =>
  ({ objects, changed: false, keepId: '', dropId: '', keepLabel: '', dropLabel: '', yonlendirilen: 0, kaldirilanlar: [], sikisanlar: [], hata });

/**
 * İki noktayı TEK noktaya indirir. Kalan nokta YERİNDEN OYNAMAZ; kaldırılan noktanın bütün
 * başvuruları ona yönlendirilir, birleşmeyle çizilemez hâle gelen nesneler (ve onlara dayananlar)
 * kaldırılır. Sahne tek adımda değişir; çağıran tek `commit` ile geçmişe yazar.
 */
export function noktalariBirlestir(objects: MathObject[], idA: string, idB: string): BirlestirmeSonucu {
  const sira = birlesmeSirasi(objects, idA, idB);
  if (!sira) return basarisiz(objects, 'Birleştirmek için iki ayrı nokta gerekir.');
  const { keepId, dropId } = sira;
  const kalan = objects.find(o => o.id === keepId) as PointObject;
  const giden = objects.find(o => o.id === dropId) as PointObject;

  const yonlendirilen = objects.filter(o => o.id !== dropId && bagimliliklar(o).includes(dropId)).length;

  // 1) Gideni çıkar, her başvuruyu kalana çevir
  let sonuc = objects.filter(o => o.id !== dropId).map(o => baglariYonlendir(o, dropId, keepId));

  // 2) Çokgenlerdeki ardışık yinelenen köşeleri düşür (kenar etiketleri ve çentikleri taşınır)
  const yenidenIndekslenen = new Set<string>();
  sonuc = sonuc.map(o => {
    if (o.type !== 'polygon') return o;
    const { pointIds, kenarEslemesi } = cokgeniTopla(o.pointIds);
    if (pointIds.length === o.pointIds.length) return o;
    yenidenIndekslenen.add(o.id);
    const cokgen = { ...o, pointIds };
    if (o.edgeLabels) cokgen.edgeLabels = [...new Set(o.edgeLabels.map(i => kenarEslemesi.get(i)).filter((i): i is number => i !== undefined))];
    if (o.edgeEqualityMarks) {
      const yeni: Record<string, number> = {};
      for (const [anahtar, deger] of Object.entries(o.edgeEqualityMarks)) {
        const k = kenarEslemesi.get(Number(anahtar));
        if (k !== undefined) yeni[String(k)] = deger;
      }
      cokgen.edgeEqualityMarks = yeni;
    }
    return cokgen;
  });

  // 3) Bozulanlar (kaynakları çöken kurulumlu noktalar dâhil) + yinelenen ölçümler ve onlara dayanan her şey
  const yineleyen = yinelenenOlcumler(sonuc);
  const byId = new Map(sonuc.map(o => [o.id, o]));
  const bozuklar = sonuc.filter(o => bozukMu(o, byId) || yineleyen.has(o.id)).map(o => o.id);
  const kaldirilacak = zinciriTopla(sonuc, bozuklar);
  const kaldirilanlar = sonuc.filter(o => kaldirilacak.has(o.id));
  if (kaldirilacak.size) sonuc = sonuc.filter(o => !kaldirilacak.has(o.id)).map(o => kolBaginiCoz(o, kaldirilacak));
  // Değişen köşe indeksindeki eski ölçü adı başka bir kenarı gösteremez.
  // Hedef silindiyse de yalnız süs bilgisi düşer; kaydırıcı sahnede kalır.
  sonuc = sonuc.map(o => {
    if (o.type !== 'slider' || !o.bindingTarget
      || (!kaldirilacak.has(o.bindingTarget.objectId) && !yenidenIndekslenen.has(o.bindingTarget.objectId))) return o;
    const { bindingTarget: _bindingTarget, ...rest } = o;
    return rest;
  });

  // 4) Sahne gerçekten çözülebiliyor mu? Commit sırasında da `resolveCommandBindings` çalışır; orada
  //    patlayan bir kurulum kalsaydı adım sessizce reddedilir, kullanıcıya ise "birleştirildi" denirdi.
  try {
    resolveCommandBindings(sonuc);
  } catch (error) {
    return basarisiz(objects, error instanceof Error ? error.message : 'Bu iki nokta birleştirilemedi.');
  }

  return {
    objects: sonuc,
    changed: true,
    keepId,
    dropId,
    keepLabel: kalan.label || 'Nokta',
    dropLabel: giden.label || 'Nokta',
    yonlendirilen,
    kaldirilanlar,
    sikisanlar: sikisanCokgenler(sonuc),
  };
}

/**
 * Sahnedeki ÜST ÜSTE gelen bütün çiftleri sırayla birleştirir (zincirler tek noktaya iner).
 * Birleştirilemeyen bir çift bütün işi durdurmaz: o çift ATLANIR, kalan yığınlar yine toplanır.
 */
export function ustUsteleriBirlestir(objects: MathObject[], tolerans: number): { objects: MathObject[]; birlesme: number; kaldirilan: number; atlanan: number } {
  let sonuc = objects, birlesme = 0, kaldirilan = 0;
  const atlananlar = new Set<string>();
  for (let tur = 0; tur < 200; tur++) {
    const cift = ustUsteCiftler(sonuc, tolerans).find(([a, b]) => !atlananlar.has(`${a}|${b}`));
    if (!cift) break;
    const adim = noktalariBirlestir(sonuc, cift[0], cift[1]);
    if (!adim.changed) { atlananlar.add(`${cift[0]}|${cift[1]}`); continue; }
    sonuc = adim.objects;
    birlesme++;
    kaldirilan += adim.kaldirilanlar.length;
  }
  return { objects: sonuc, birlesme, kaldirilan, atlanan: atlananlar.size };
}

// --------------------------------------------------------------------------- mesajlar

/**
 * Menüde görünecek madde yazısı: "C ve A noktalarını birleştir".
 *
 * İki ad SİMETRİKTİR: hangisinin kalacağını `birlesmeSirasi` ayrıca karara bağlar, bu yüzden buradaki
 * sıra yalnızca okunuşu belirler (menüde sağ tıklanan noktanın adı önce yazılır).
 */
export function birlestirmeMaddesi(adA: string, adB: string): string {
  return `${adA} ve ${adB} noktalarını birleştir`;
}

/**
 * Birleştirmeden sonra ipucu çubuğunda gösterilecek cümle: HANGİ adın kaldığını, kaç başvurunun
 * taşındığını ve bozulduğu için kaldırılan nesneleri söyler.
 */
export function birlestirmeIpucu(sonuc: BirlestirmeSonucu, secenek: { geriAlNotu?: boolean } = {}): string {
  if (!sonuc.changed) return sonuc.hata ?? 'Noktalar birleştirilemedi.';
  const parcalar = [`${sonuc.dropLabel} noktası ${sonuc.keepLabel} ile birleştirildi.`];
  if (sonuc.yonlendirilen > 0) {
    parcalar.push(`${sonuc.dropLabel} noktasına bağlı ${sonuc.yonlendirilen} nesne artık ${sonuc.keepLabel} noktasını kullanıyor.`);
  }
  if (sonuc.kaldirilanlar.length > 0) {
    parcalar.push(`Çizilemez duruma gelen ${sonuc.kaldirilanlar.length} nesne kaldırıldı: ${describeList(sonuc.kaldirilanlar)}.`);
  }
  if (sonuc.sikisanlar.length > 0) {
    parcalar.push(`${describeList(sonuc.sikisanlar)} artık aynı köşeden iki kez geçiyor.`);
  }
  if (secenek.geriAlNotu !== false) parcalar.push(GERI_AL_IPUCU);
  return parcalar.join(' ');
}
