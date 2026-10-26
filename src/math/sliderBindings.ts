import type { MathObject, PointObject, PolygonObject, SliderObject } from '@/types/math';
import { constructionDependencies, resolveCommandBindings } from './commandBindings';
import { DUZGUN_COKGEN_EN_AZ_KENAR, DUZGUN_COKGEN_EN_COK_KENAR, donusYonu, duzgunMu } from './duzgunCokgen';
import { extractVariableNames } from './parser';
import { withUserFunctions } from './functionNames';

export interface SliderBindingTarget {
  id: string;
  label: string;
  /** Tür: şekiller ayar penceresinde, doğrular ve açılar nesnenin sağ tık menüsünde bağlanır */
  tur: 'dogru' | 'aci' | 'sekil';
  properties: { key: string; label: string; disabled?: boolean }[];
}

type SliderRule = Extract<NonNullable<PointObject['construction']>, { kind: 'sliderPoint' }>;
type BindingPlan = { point: PointObject; rule: SliderRule; create?: boolean; angleMeasurementIds?: string[] };
const EPS = 1e-9;
const free = (p: PointObject | undefined): p is PointObject => !!p && !p.locked && !p.construction && !p.onObjectId && !p.dependsOn?.length && p.isIndependent !== false;
const ellipseProperties = ['radiusX', 'radiusY', 'rotation'] as const;
type EllipseProperty = typeof ellipseProperties[number];
const isEllipseProperty = (key: string): key is EllipseProperty => ellipseProperties.some(property => property === key);
const availableEllipseProperty = (o: MathObject, key: string) => o.type === 'ellipse' && !o.locked && o.visible !== false
  && isEllipseProperty(key) && !o.sliderBindings?.[key];

/**
 * Kenar sayısı bağlanabilir mi (math/duzgunCokgen.ts): çokgen görünür ve kilitsiz, başka bir kaydırıcıya bağlı değil,
 * köşeleri bu sırayla DÜZGÜN çokgen ve ilk iki köşe dışındaki köşeler serbest (onlar kaydırıcıyla yeniden kurulur).
 */
function kenarSayisiBaglanabilir(objects: readonly MathObject[], target: MathObject): target is PolygonObject {
  if (target.type !== 'polygon' || target.locked || target.visible === false || target.regularSides) return false;
  const n = target.pointIds.length;
  if (n < DUZGUN_COKGEN_EN_AZ_KENAR || n > DUZGUN_COKGEN_EN_COK_KENAR || new Set(target.pointIds).size !== n) return false;
  const byId = new Map(objects.map(o => [o.id, o]));
  const koseler = target.pointIds.map(id => byId.get(id));
  if (koseler.some(p => p?.type !== 'point' || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false;
  const noktalar = koseler as PointObject[];
  return duzgunMu(noktalar) && noktalar.slice(2).every(p => free(p));
}

/** Açıyla çizilmiş yayın mevcut döndürmesini koruyarak sabit açıyı kaydırıcıya açar. */
function fixedArcRotation(objects: readonly MathObject[], target: MathObject) {
  if ((target.type !== 'arc' && target.type !== 'sector') || target.locked || target.visible === false) return null;
  if (new Set([target.centerPointId, target.startPointId, target.directionPointId]).size !== 3) return null;
  const moving = objects.find(o => o.id === target.directionPointId);
  if (moving?.type !== 'point' || moving.locked || moving.onObjectId || moving.dependsOn?.length) return null;
  const rule = moving.construction;
  if (rule?.kind !== 'rotate' || rule.sliderId || rule.sliderVariableName || !Number.isFinite(rule.degrees)
    || rule.sourceId !== target.startPointId || rule.centerId !== target.centerPointId) return null;
  const center = objects.find(o => o.id === target.centerPointId), start = objects.find(o => o.id === target.startPointId);
  if (center?.type !== 'point' || start?.type !== 'point'
    || ![center.x, center.y, start.x, start.y].every(Number.isFinite)
    || Math.hypot(start.x - center.x, start.y - center.y) <= EPS) return null;
  return { point: moving, rule };
}

function sources(object: MathObject): string[] {
  switch (object.type) {
    case 'point': return [...constructionDependencies(object), ...(object.onObjectId ? [object.onObjectId] : []), ...(object.dependsOn ?? [])];
    case 'segment': return [object.startPointId, object.endPointId];
    case 'line': return [object.point1Id, object.point2Id];
    case 'ray': return [object.startPointId, object.throughPointId];
    case 'circle': return object.throughPointIds?.length ? object.throughPointIds : [object.centerPointId, ...(object.radiusPointId ? [object.radiusPointId] : [])];
    case 'arc':
    case 'sector': return [object.centerPointId, object.startPointId, object.directionPointId];
    case 'ellipse': return [object.centerPointId, ...Object.values(object.sliderBindings ?? {}).filter((id): id is string => !!id)];
    case 'polygon': return object.pointIds;
    case 'angle': return [object.point1Id, object.vertexPointId, object.point3Id];
    default: return [];
  }
}

function planFor(objects: readonly MathObject[], target: MathObject, key: string, sliderId: string): BindingPlan | null {
  if (target.locked || target.visible === false) return null;
  const byId = new Map(objects.map(o => [o.id, o]));
  const point = (id: string): PointObject | undefined => {
    const found = byId.get(id);
    return found?.type === 'point' && Number.isFinite(found.x) && Number.isFinite(found.y) ? found : undefined;
  };
  const reaches = (from: string, to: string, seen = new Set<string>()): boolean => {
    if (from === to) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    const object = byId.get(from);
    return !!object && sources(object).some(id => reaches(id, to, seen));
  };
  const lengthPlan = (anchorId: string, endpointId: string, reversible = false): BindingPlan | null => {
    const anchor = point(anchorId), endpoint = point(endpointId);
    if (!anchor || !endpoint) return null;
    if ((!free(endpoint) || reaches(anchorId, endpointId)) && reversible) return lengthPlan(endpointId, anchorId);
    if (!free(endpoint) || reaches(anchorId, endpointId)) return null;
    const length = Math.hypot(endpoint.x - anchor.x, endpoint.y - anchor.y);
    if (!(length > EPS)) return null;
    return { point: endpoint, rule: { kind: 'sliderPoint', sliderId, mode: 'length', anchorId, direction: { x: (endpoint.x - anchor.x) / length, y: (endpoint.y - anchor.y) / length } } };
  };
  const anglePlan = (anchorId: string, referenceId: string, movingId: string, orientation: 1 | -1): BindingPlan | null => {
    const anchor = point(anchorId), reference = point(referenceId), moving = point(movingId);
    if (!anchor || !reference || !free(moving) || reaches(anchor.id, moving.id) || reaches(reference.id, moving.id)) return null;
    const radius = Math.hypot(moving.x - anchor.x, moving.y - anchor.y);
    if (!(radius > EPS) || Math.hypot(reference.x - anchor.x, reference.y - anchor.y) < EPS) return null;
    return { point: moving, rule: { kind: 'sliderPoint', sliderId, mode: 'angle', anchorId, referenceId, radius, orientation } };
  };
  switch (target.type) {
    case 'point':
      return free(target) && point(target.id) && (key === 'x' || key === 'y')
        ? { point: target, rule: { kind: 'sliderPoint', sliderId, mode: key } } : null;
    case 'segment': return key === 'length' ? lengthPlan(target.startPointId, target.endPointId, true) : null;
    case 'line': return key === 'length' ? lengthPlan(target.point1Id, target.point2Id, true) : null;
    case 'ray': return key === 'length' ? lengthPlan(target.startPointId, target.throughPointId, true) : null;
    case 'polygon': {
      const match = /^(edge|angle):(\d+)$/.exec(key);
      if (!match || target.pointIds.length < 3 || new Set(target.pointIds).size !== target.pointIds.length) return null;
      const index = Number(match[2]);
      if (!Number.isSafeInteger(index) || index >= target.pointIds.length) return null;
      const vertices = target.pointIds.map(point);
      if (vertices.some(p => !p)) return null;
      const points = vertices as PointObject[];
      const count = points.length;
      const vertex = points[index], previous = points[(index + count - 1) % count], next = points[(index + 1) % count];
      if (match[1] === 'edge') return lengthPlan(vertex.id, next.id, true);
      // İlk köşeye göre hesaplamak büyük dünya koordinatlarındaki çıkarma hatasını azaltır.
      const origin = points[0];
      const twiceArea = points.reduce((sum, p, i) => {
        const q = points[(i + 1) % count];
        return sum + (p.x - origin.x) * (q.y - origin.y) - (q.x - origin.x) * (p.y - origin.y);
      }, 0);
      if (!Number.isFinite(twiceArea) || twiceArea === 0) return null;
      const winding = twiceArea > 0 ? 1 : -1;
      const orientation = -winding as 1 | -1;
      const plan = anglePlan(vertex.id, previous.id, next.id, orientation)
        ?? anglePlan(vertex.id, next.id, previous.id, winding);
      if (!plan) return null;
      if (count === 3 && plan.rule.mode === 'angle') plan.rule = { ...plan.rule, maximumDegrees: 180 };
      const cross = (previous.x - vertex.x) * (next.y - vertex.y) - (previous.y - vertex.y) * (next.x - vertex.x);
      const interiorReflex = winding * cross > 0;
      plan.angleMeasurementIds = objects.flatMap(o => o.type === 'angle' && !o.locked && o.vertexPointId === vertex.id
        && ((o.point1Id === previous.id && o.point3Id === next.id) || (o.point1Id === next.id && o.point3Id === previous.id))
        && !!o.reflex === interiorReflex && (!o.valueSliderId || o.valueSliderId === sliderId) ? [o.id] : []);
      return plan;
    }
    case 'angle': {
      if (key !== 'angle') return null;
      const anchor = point(target.vertexPointId), reference = point(target.point1Id), moving = point(target.point3Id);
      if (!anchor || !reference || !moving) return null;
      const cross = (reference.x - anchor.x) * (moving.y - anchor.y) - (reference.y - anchor.y) * (moving.x - anchor.x);
      const orientation = ((cross < 0 ? -1 : 1) * (target.reflex ? -1 : 1)) as 1 | -1;
      return anglePlan(anchor.id, reference.id, moving.id, orientation);
    }
    case 'circle': {
      if (key !== 'radius' || target.throughPointIds?.length) return null;
      const center = point(target.centerPointId);
      if (!center || reaches(center.id, target.id)) return null;
      if (target.fixedRadius === undefined) return target.radiusPointId ? lengthPlan(center.id, target.radiusPointId) : null;
      if (!(target.fixedRadius > 0) || !Number.isFinite(target.fixedRadius)) return null;
      const created: PointObject = { id: '', type: 'point', label: '', x: center.x + target.fixedRadius, y: center.y, color: target.color, visible: false, showLabel: false, isIndependent: false, createdAt: target.createdAt };
      return { point: created, create: true, rule: { kind: 'sliderPoint', sliderId, mode: 'length', anchorId: center.id, direction: { x: 1, y: 0 } } };
    }
    case 'arc':
    case 'sector':
      if (key === 'radius') return lengthPlan(target.centerPointId, target.startPointId);
      // Yay modeli başlangıçtan yön noktasına saat yönünün tersine taranır; 360° ile 0° aynı yöndür.
      return key === 'centralAngle' ? anglePlan(target.centerPointId, target.startPointId, target.directionPointId, 1) : null;
    default: return null;
  }
}

function hasSharedTriangleBinding(objects: readonly MathObject[], sliderId: string): boolean {
  return objects.some(o => o.type === 'point' && o.construction?.kind === 'triangleVertex'
    && o.construction.sliderIds.includes(sliderId) && o.construction.sliderIds.some(id => id !== sliderId));
}

/** Konuma bakmaz: 0°/180° köşelerde de mevcut ilişkinin aynısını tanır. */
function ownsBinding(objects: readonly MathObject[], sliderId: string, target: MathObject, key: string): boolean {
  if (target.locked || target.visible === false) return false;
  const point = (id: string) => {
    const found = objects.find(o => o.id === id);
    return found?.type === 'point' && !found.locked && !found.onObjectId
      && !found.dependsOn?.some(dependency => dependency !== sliderId) ? found : undefined;
  };
  const length = (anchorId: string, movingId: string, reversible = false): boolean => {
    const rule = point(movingId)?.construction;
    return !!(rule?.kind === 'sliderPoint' && rule.mode === 'length' && rule.sliderId === sliderId && rule.anchorId === anchorId)
      || (reversible && length(movingId, anchorId));
  };
  const angle = (anchorId: string, referenceId: string, movingId: string, reversible = false): boolean => {
    const rule = point(movingId)?.construction;
    return !!(rule?.kind === 'sliderPoint' && rule.mode === 'angle' && rule.sliderId === sliderId && rule.anchorId === anchorId && rule.referenceId === referenceId)
      || (reversible && angle(anchorId, movingId, referenceId));
  };
  switch (target.type) {
    case 'point': {
      const rule = point(target.id)?.construction;
      return rule?.kind === 'sliderPoint' && rule.sliderId === sliderId && (key === 'x' || key === 'y') && rule.mode === key;
    }
    case 'segment': return key === 'length' && length(target.startPointId, target.endPointId, true);
    case 'line': return key === 'length' && length(target.point1Id, target.point2Id, true);
    case 'ray': return key === 'length' && length(target.startPointId, target.throughPointId, true);
    case 'polygon': {
      if (key === 'sides') return target.regularSides?.sliderId === sliderId;
      const match = /^(edge|angle):(\d+)$/.exec(key);
      if (!match || target.pointIds.length < 3) return false;
      const index = Number(match[2]), count = target.pointIds.length;
      if (!Number.isSafeInteger(index) || index >= count) return false;
      const vertex = target.pointIds[index], next = target.pointIds[(index + 1) % count];
      return match[1] === 'edge' ? length(vertex, next, true)
        : angle(vertex, target.pointIds[(index + count - 1) % count], next, true);
    }
    case 'circle': return key === 'radius' && !target.throughPointIds?.length && target.fixedRadius === undefined
      && !!target.radiusPointId && length(target.centerPointId, target.radiusPointId);
    case 'arc':
    case 'sector': {
      if (key === 'radius') return length(target.centerPointId, target.startPointId);
      if (key !== 'centralAngle') return false;
      const rule = point(target.directionPointId)?.construction;
      return angle(target.centerPointId, target.startPointId, target.directionPointId)
        || !!(rule?.kind === 'rotate' && rule.sliderId === sliderId && rule.centerId === target.centerPointId && rule.sourceId === target.startPointId);
    }
    case 'angle': return key === 'angle' && angle(target.vertexPointId, target.point1Id, target.point3Id, true);
    case 'ellipse': return isEllipseProperty(key) && target.sliderBindings?.[key] === sliderId;
    default: return false;
  }
}

/**
 * Kaydırıcının bağlanabileceği nesneler ve özellikleri: şekiller (ayar penceresinin listesi) ile doğru parçası, doğru,
 * ışın ve açı (nesnenin sağ tık menüsü). Düzenlenen kaydırıcının kendi bağı yeniden seçilebilir.
 */
export function sliderBindingTargets(objects: readonly MathObject[], editedSliderId?: string): SliderBindingTarget[] {
  const ownedId = objects.some(o => o.id === editedSliderId && o.type === 'slider') ? editedSliderId : undefined;
  const shared = !!ownedId && hasSharedTriangleBinding(objects, ownedId);
  const availableObjects = ownedId && !shared ? detachSliderGeometry(objects, new Set([ownedId])) : objects;
  const availableById = new Map(availableObjects.map(o => [o.id, o]));
  const pointName = (id: string) => objects.find(o => o.id === id)?.label || id;
  return objects.flatMap(object => {
    if (object.visible === false) return [];
    let properties: SliderBindingTarget['properties'];
    let defaultLabel: string;
    let tur: SliderBindingTarget['tur'] = 'sekil';
    let label = object.label;
    if (object.type === 'segment' || object.type === 'line' || object.type === 'ray') {
      tur = 'dogru';
      defaultLabel = object.type === 'segment' ? 'Doğru parçası' : object.type === 'line' ? 'Doğru' : 'Işın';
      label = object.label ? `${object.label} ${object.type === 'segment' ? 'doğru parçası' : object.type === 'line' ? 'doğrusu' : 'ışını'}` : '';
      properties = [{ key: 'length', label: 'Uzunluk' }];
    } else if (object.type === 'angle') {
      tur = 'aci';
      defaultLabel = 'Açı';
      label = object.label ? `${object.label} açısı` : '';
      properties = [{ key: 'angle', label: 'Açı ölçüsü (°)' }];
    } else if (object.type === 'polygon') {
      const count = object.pointIds.length;
      defaultLabel = 'Çokgen';
      properties = [
        ...object.pointIds.map((id, i) => ({ key: `edge:${i}`, label: `${pointName(id)}${pointName(object.pointIds[(i + 1) % count])} kenar uzunluğu` })),
        ...object.pointIds.map((id, i) => ({ key: `angle:${i}`, label: `${pointName(id)} köşe açısı (∠${pointName(object.pointIds[(i + count - 1) % count])}${pointName(id)}${pointName(object.pointIds[(i + 1) % count])})` })),
        // Kenar sayısı yalnız düzgün çokgende (öteki çokgenlerde "düzenlenemiyor" görünür)
        { key: 'sides', label: 'Kenar sayısı' },
      ];
    } else if (object.type === 'circle') {
      defaultLabel = 'Çember';
      properties = [{ key: 'radius', label: 'Yarıçap' }];
    } else if (object.type === 'arc' || object.type === 'sector') {
      defaultLabel = object.type === 'arc' ? 'Yay' : 'Daire dilimi';
      properties = [{ key: 'radius', label: 'Yarıçap' }, { key: 'centralAngle', label: 'Merkez açısı (°)' }];
    } else if (object.type === 'ellipse') {
      defaultLabel = 'Elips';
      properties = [{ key: 'radiusX', label: 'Yatay yarıçap' }, { key: 'radiusY', label: 'Dikey yarıçap' }, { key: 'rotation', label: 'Dönme açısı (°)' }];
    } else return [];
    properties = properties.map(property => {
      const availableObject = availableById.get(object.id)!;
      const available = !!ownedId && ownsBinding(objects, ownedId, object, property.key)
        || (!shared && (availableObject.type === 'ellipse' ? availableEllipseProperty(availableObject, property.key)
          : planFor(availableObjects, availableObject, property.key, '') !== null
            || (property.key === 'centralAngle' && fixedArcRotation(availableObjects, availableObject) !== null)
            || (property.key === 'sides' && kenarSayisiBaglanabilir(availableObjects, availableObject))));
      return available ? property : { ...property, disabled: true };
    });
    return [{ id: object.id, label: label || defaultLabel, tur, properties }];
  // Şekiller önde (eski sıra korunur), ardından doğrular ve açılar
  }).sort((a, b) => HEDEF_SIRASI.indexOf(a.tur) - HEDEF_SIRASI.indexOf(b.tur));
}
const HEDEF_SIRASI: SliderBindingTarget['tur'][] = ['sekil', 'dogru', 'aci'];

/**
 * Kaydırıcının şu anki şekil bağı: ayarlar penceresi açılınca bağlı olduğu şekil ve özellik seçili gelir. Önce kayıtlı
 * hedefe (bindingTarget) bakılır; kayıt yoksa (eski çizim) ya da artık geçerli değilse listedeki şekillerin özellikleri
 * taranır. Listede olmayan bir bağ (ör. nokta koordinatı, fonksiyon değişkeni) ya da bağ yoksa null döner.
 */
export function sliderCurrentBinding(objects: readonly MathObject[], sliderId: string): { targetId: string; propertyKey: string } | null {
  const slider = objects.find(o => o.id === sliderId);
  if (slider?.type !== 'slider') return null;
  const sahip = (objectId: string, key: string) => {
    const target = objects.find(o => o.id === objectId);
    return !!target && ownsBinding(objects, sliderId, target, key);
  };
  const kayitli = slider.bindingTarget;
  if (kayitli && sahip(kayitli.objectId, kayitli.propertyKey)) return { targetId: kayitli.objectId, propertyKey: kayitli.propertyKey };
  for (const target of sliderBindingTargets(objects, sliderId)) {
    const property = target.properties.find(p => sahip(target.id, p.key));
    if (property) return { targetId: target.id, propertyKey: property.key };
  }
  return null;
}

export function sliderIsBound(objects: readonly MathObject[], sliderId: string): boolean {
  const slider = objects.find(o => o.id === sliderId);
  if (slider?.type !== 'slider') return false;
  // 3B cismin özelliğine bağ kaydırıcının kendisinde tutulur
  if (slider.cisimBagi && !slider.cisimBagi.askida) return true;
  return objects.some(o => (o.type === 'point' && constructionDependencies(o).includes(sliderId)) ||
    (o.type === 'ellipse' && Object.values(o.sliderBindings ?? {}).includes(sliderId)) ||
    (o.type === 'function' && extractVariableNames(o.expression).includes(slider.variableName)));
}

/** Çağıran, dondurulacak koordinatları eski kaydırıcı değerleriyle önceden çözer. */
function detachSliderGeometry(objects: readonly MathObject[], removed: ReadonlySet<string>): MathObject[] {
  const values = new Map(objects.flatMap(o => o.type === 'slider' ? [[o.id, o.value] as const] : []));
  return objects.map(o => {
    if (o.type === 'slider' && removed.has(o.id) && (o.bindingTarget || o.cisimBagi)) {
      // Cisim bağı da çözülür: cisim son değerinde kalır
      const { bindingTarget: _bindingTarget, cisimBagi: _cisim, cisimBagOncekiDeger: _onceki, ...rest } = o;
      return rest;
    }
    if (o.type === 'point') {
      let next = o;
      if (o.dependsOn?.some(id => removed.has(id))) {
        const { dependsOn, ...rest } = o;
        const remaining = dependsOn.filter(id => !removed.has(id));
        next = remaining.length ? { ...rest, dependsOn: remaining } : rest;
      }
      const rule = next.construction;
      if ((rule?.kind === 'sliderPoint' && removed.has(rule.sliderId))
        || (rule?.kind === 'regularVertex' && removed.has(rule.sliderId))
        || (rule?.kind === 'triangleVertex' && rule.sliderIds.some(id => removed.has(id)))) {
        const { construction: _construction, preBindingPosition: _onceki, ...rest } = next;
        return { ...rest, isIndependent: !rest.onObjectId && !rest.dependsOn?.length };
      }
      if (rule?.kind === 'rotate' && rule.sliderId && removed.has(rule.sliderId)) {
        const { sliderId, sliderVariableName: _sliderVariableName, ...fixed } = rule;
        const { preBindingDegrees: _onceki, ...rest } = next;
        return { ...rest, construction: { ...fixed, degrees: values.get(sliderId)! } };
      }
      if (next !== o && !rule && !next.onObjectId && !next.dependsOn?.length) return { ...next, isIndependent: true };
      return next;
    }
    if (o.type === 'ellipse' && Object.values(o.sliderBindings ?? {}).some(id => removed.has(id))) {
      const { sliderBindings, preBindingValues, ...rest } = o;
      const remaining = Object.fromEntries(Object.entries(sliderBindings!).filter(([, id]) => !removed.has(id)));
      const kalanOnceki = Object.fromEntries(Object.entries(preBindingValues ?? {}).filter(([key]) => key in remaining));
      return {
        ...rest,
        ...(Object.keys(remaining).length ? { sliderBindings: remaining } : {}),
        ...(Object.keys(kalanOnceki).length ? { preBindingValues: kalanOnceki } : {}),
      };
    }
    if (o.type === 'angle' && o.valueSliderId && removed.has(o.valueSliderId)) {
      const { valueSliderId: _valueSliderId, ...rest } = o;
      return rest;
    }
    // Kenar sayısı bağı çözülünce çokgen o anki köşeleriyle sıradan (serbest köşeli) bir çokgen olur
    if (o.type === 'polygon' && o.regularSides && removed.has(o.regularSides.sliderId)) {
      const { regularSides: _bag, preBindingSides: _onceki, ...rest } = o;
      return rest;
    }
    return o;
  });
}

function rememberBinding(objects: MathObject[], sliderId: string, objectId: string, propertyKey: string): MathObject[] {
  return objects.map(o => {
    if (o.id !== sliderId || o.type !== 'slider') return o;
    // Bağ kurulunca geçici kapatılmış bağ kaydı düşer (ayarlar penceresinden yeniden bağlama da bağı açar)
    const { suspendedBinding: _askida, ...rest } = o;
    return { ...rest, bindingTarget: { objectId, propertyKey } };
  });
}

/**
 * Bağı GEÇİCİ olarak kapatır (sürgünün zincir simgesi; kullanıcı, 25.10.2026): şeklin noktaları serbest kalır ve
 * sürüklenebilir, kaydırıcı hangi şeklin hangi özelliğine bağlı olduğunu `suspendedBinding` ile hatırlar.
 */
export function sliderBaginiAskiyaAl(objects: MathObject[], sliderId: string): MathObject[] {
  // 3B cisim bağı: kaydırıcıda askıya alınır; cisim bağdan önceki değerine 3B sahnesinde döner (cisimBaglari.ts)
  const cisimli = objects.find((o): o is SliderObject => o.id === sliderId && o.type === 'slider' && !!o.cisimBagi && !o.cisimBagi.askida);
  if (cisimli?.cisimBagi) {
    const { cisimId, ozellik } = cisimli.cisimBagi;
    return objects.map(o => (o.id === sliderId ? { ...cisimli, cisimBagi: { ...cisimli.cisimBagi!, askida: true }, suspendedBinding: { objectId: cisimId, propertyKey: `cisim:${ozellik}` } } : o));
  }
  const bag = sliderCurrentBinding(objects, sliderId);
  if (!bag) throw new Error('Kaydırıcı bir şeklin kenarına, açısına ya da yarıçapına bağlı değil.');
  if (hasSharedTriangleBinding(objects, sliderId)) throw new Error('Bu kaydırıcı üçgenin diğer kaydırıcılarıyla ortak bağlı; bağı tek başına kapatılamaz.');
  // Kenar sayısı bağında çokgen bağlanmadan önceki kenar sayısıyla kurulur (kaydırıcının değeri geçici olarak o sayı
  // yapılıp çözülür; bağ çözüldükten sonra kaydırıcı kendi değerine döner)
  const kaydirici = objects.find((o): o is SliderObject => o.id === sliderId && o.type === 'slider')!;
  const kenarCokgeni = objects.find((o): o is PolygonObject => o.type === 'polygon' && o.regularSides?.sliderId === sliderId);
  const kaynak = kenarCokgeni?.preBindingSides
    ? objects.map(o => (o.id === sliderId ? { ...kaydirici, value: kenarCokgeni.preBindingSides! } : o))
    : objects;
  const resolved = resolveCommandBindings(kaynak);
  // Bağ kalkınca şekil bağlanmadan önceki hâline döner (kullanıcı, 25.10.2026: "bağ kaldırıldığında varsayılan konumuna
  // dönse"). Kayıtlar korunur: bağ yeniden açılıp kapatılınca yine aynı hâle dönülür.
  const geriDonus = new Map<string, (o: MathObject) => MathObject>();
  for (const o of resolved) {
    if (o.type === 'point' && o.preBindingPosition && o.construction?.kind === 'sliderPoint' && o.construction.sliderId === sliderId) {
      const onceki = o.preBindingPosition;
      geriDonus.set(o.id, (p) => ({ ...p, x: onceki.x, y: onceki.y, preBindingPosition: onceki } as MathObject));
    }
    if (o.type === 'point' && o.preBindingDegrees !== undefined && o.construction?.kind === 'rotate' && o.construction.sliderId === sliderId) {
      const derece = o.preBindingDegrees;
      geriDonus.set(o.id, (p) => (p.type === 'point' && p.construction?.kind === 'rotate'
        ? { ...p, construction: { ...p.construction, degrees: derece }, preBindingDegrees: derece } : p));
    }
    if (o.type === 'ellipse' && o.preBindingValues) {
      const anahtarlar = Object.entries(o.sliderBindings ?? {}).filter(([, id]) => id === sliderId).map(([key]) => key as keyof NonNullable<typeof o.preBindingValues>);
      const degerler = Object.fromEntries(anahtarlar.flatMap(key => o.preBindingValues![key] !== undefined ? [[key, o.preBindingValues![key]]] : []));
      if (Object.keys(degerler).length) {
        geriDonus.set(o.id, (e) => ({ ...e, ...degerler, preBindingValues: { ...(e.type === 'ellipse' ? e.preBindingValues : {}), ...degerler } } as MathObject));
      }
    }
  }
  const cozulmus = detachSliderGeometry(resolved, new Set([sliderId])).map(o => geriDonus.get(o.id)?.(o) ?? o);
  return resolveCommandBindings(cozulmus).map(o => o.id === sliderId && o.type === 'slider'
    ? { ...o, value: kaydirici.value, suspendedBinding: { objectId: bag.targetId, propertyKey: bag.propertyKey } } : o);
}

/** Geçici olarak kapatılan bağı yeniden kurar: şekil kaydırıcının o anki değerine döner. Kurulamazsa hata verir, sahne aynı kalır. */
export function sliderBaginiSurdur(objects: MathObject[], sliderId: string, createPointId: () => string): MathObject[] {
  const slider = objects.find(o => o.id === sliderId);
  if (slider?.type === 'slider' && slider.cisimBagi?.askida) {
    // 3B cisim bağı yeniden açılır: cisim kaydırıcının değerini alır
    const { askida: _askida, ...bag } = slider.cisimBagi;
    const { suspendedBinding: _kapali, ...kalan } = slider;
    return objects.map(o => (o.id === sliderId ? { ...kalan, cisimBagi: bag } : o));
  }
  if (slider?.type !== 'slider' || !slider.suspendedBinding) throw new Error('Kaydırıcının kapatılmış bir bağı yok.');
  const { objectId, propertyKey } = slider.suspendedBinding;
  if (!objects.some(o => o.id === objectId)) throw new Error('Kaydırıcının bağlı olduğu şekil artık yok. Ayarlardan yeni bir şekle bağlayın.');
  return bindSliderProperty(resolveCommandBindings(objects), sliderId, objectId, propertyKey, createPointId);
}

/** Silme planından önce canlı değerleri sabitler; kaydırıcıların kendilerini plandan önce kaldırmaz. */
export function detachSliderBindings(objects: MathObject[], sliderIds: readonly string[]): MathObject[] {
  const requested = new Set(sliderIds);
  const sliders = objects.filter((o): o is SliderObject => o.type === 'slider' && requested.has(o.id));
  if (!sliders.length) return objects;
  if (sliders.some(o => !Number.isFinite(o.value))) throw new Error('Kaydırıcı silinemedi: mevcut değer sonlu bir sayı olmalı.');
  const variables = new Map(sliders.map(o => [o.variableName.toLowerCase(), o.value]));
  const resolved = resolveCommandBindings(objects);
  const prepared = detachSliderGeometry(resolved, new Set(sliders.map(o => o.id)));
  return withUserFunctions(resolved, () => prepared.map(o => {
    if (o.type === 'function') {
      const names = new Set(extractVariableNames(o.expression));
      // Sayı tokenları önce eşleşir: "1e3" içindeki e3 ile e3 değişkeni karışmaz.
      const expression = o.expression.replace(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[\p{L}_][\p{L}\p{N}_]*/gu, token => {
        const name = token.toLowerCase();
        return names.has(name) && variables.has(name) ? `(${variables.get(name)})` : token;
      });
      if (expression !== o.expression) {
        const label = o.label.endsWith(o.expression) ? o.label.slice(0, o.label.length - o.expression.length) + expression : o.label;
        return { ...o, expression, label };
      }
    }
    return o;
  }));
}

/** Eski geometriyi eski değerlerle çözer; yeni ayarları ve bağı tek atomik sonuçta uygular. */
export function rebindSliderProperty(
  objects: MathObject[], sliderId: string, targetId: string, propertyKey: string,
  settings: Pick<SliderObject, 'min' | 'max' | 'step' | 'value'> & Partial<Pick<SliderObject, 'x' | 'y'>>,
  createPointId: () => string,
): MathObject[] {
  const resolved = resolveCommandBindings(objects);
  if (!resolved.some(o => o.id === sliderId && o.type === 'slider')) throw new Error('Bağlanacak kaydırıcı bulunamadı.');
  const error = validateSliderSettings(settings.min, settings.max, settings.step, settings.value);
  if (error) throw new Error(error);
  if ((settings.x !== undefined && !Number.isFinite(settings.x)) || (settings.y !== undefined && !Number.isFinite(settings.y))) throw new Error('Kaydırıcı konumu sonlu sayılar olmalı.');
  const applySettings = (scene: MathObject[]) => scene.map(o => o.id === sliderId && o.type === 'slider' ? { ...o, ...settings } : o);
  if (!targetId) return resolveCommandBindings(applySettings(resolved));
  const target = resolved.find(o => o.id === targetId);
  if (!target) throw new Error('Bağlanacak nesne bulunamadı.');
  if (ownsBinding(resolved, sliderId, target, propertyKey)) {
    return rememberBinding(resolveCommandBindings(applySettings(resolved)), sliderId, targetId, propertyKey);
  }
  if (hasSharedTriangleBinding(resolved, sliderId)) throw new Error('Bu kaydırıcı üçgenin diğer kaydırıcılarıyla ortak bağlı; farklı bir özelliğe bağlanamaz.');
  const prepared = detachSliderGeometry(resolved, new Set([sliderId]));
  return bindSliderProperty(applySettings(prepared), sliderId, targetId, propertyKey, createPointId);
}

/** Girdi sahnesini değiştirmez; çözümleme başarısızsa kısmi bağ kurulmaz. */
export function bindSliderProperty(objects: readonly MathObject[], sliderId: string, targetId: string, propertyKey: string, createPointId: () => string): MathObject[] {
  const slider = objects.find(o => o.id === sliderId);
  if (slider?.type !== 'slider') throw new Error('Bağlanacak kaydırıcı bulunamadı.');
  const error = validateSliderSettings(slider.min, slider.max, slider.step, slider.value);
  if (error) throw new Error(error);
  const target = objects.find(o => o.id === targetId);
  if (!target) throw new Error('Bağlanacak nesne bulunamadı.');
  if (propertyKey === 'sides') {
    if (!kenarSayisiBaglanabilir(objects, target)) {
      throw new Error('Kenar sayısı yalnızca düzgün çokgene bağlanabilir; çokgen kilitli olmamalı ve ilk iki köşe dışındaki köşeler serbest olmalı.');
    }
    if (slider.min < DUZGUN_COKGEN_EN_AZ_KENAR || slider.max > DUZGUN_COKGEN_EN_COK_KENAR || !Number.isInteger(slider.step)) {
      throw new Error(`Kenar sayısı için kaydırıcı ${DUZGUN_COKGEN_EN_AZ_KENAR} ile ${DUZGUN_COKGEN_EN_COK_KENAR} arasında olmalı ve adımı tam sayı olmalı.`);
    }
    // İlk iki köşe serbest kalır; ötekiler bu iki köşeden ve kaydırıcıdan kurulur, köşe sayısı kaydırıcıya eşlenir
    const byId = new Map(objects.map(o => [o.id, o]));
    const orientation = donusYonu(target.pointIds.map(id => byId.get(id) as PointObject));
    const [firstId, secondId] = target.pointIds;
    const next = objects.map(o => {
      if (o.id === target.id) return { ...target, regularSides: { sliderId, orientation }, preBindingSides: target.preBindingSides ?? target.pointIds.length };
      const index = target.pointIds.indexOf(o.id);
      return index >= 2 && o.type === 'point'
        ? { ...o, isIndependent: false, construction: { kind: 'regularVertex' as const, firstId, secondId, sliderId, index, orientation } }
        : o;
    });
    return rememberBinding(resolveCommandBindings(next), sliderId, targetId, propertyKey);
  }
  if (target.type === 'ellipse') {
    if (!isEllipseProperty(propertyKey) || !availableEllipseProperty(target, propertyKey)) throw new Error('Elipsin bu özelliği kilitli, başka bir kaydırıcıya bağlı veya geçersiz.');
    if (propertyKey !== 'rotation' && !(slider.value > 0)) throw new Error('Yarıçap için kaydırıcının mevcut değeri sıfırdan büyük olmalı.');
    const preBindingValues = { [propertyKey]: target[propertyKey], ...target.preBindingValues };
    return rememberBinding(resolveCommandBindings(objects.map(o => o.id === target.id ? { ...target, preBindingValues, sliderBindings: { ...target.sliderBindings, [propertyKey]: sliderId } } : o)), sliderId, targetId, propertyKey);
  }
  const rotation = propertyKey === 'centralAngle' ? fixedArcRotation(objects, target) : null;
  if (rotation) {
    if (slider.value < 0 || slider.value > 360) throw new Error('Açı için kaydırıcının mevcut değeri 0 ile 360 derece arasında olmalı.');
    const bound: PointObject = { ...rotation.point, isIndependent: false, preBindingDegrees: rotation.point.preBindingDegrees ?? rotation.rule.degrees,
      construction: { ...rotation.rule, sliderId, sliderVariableName: slider.variableName } };
    return rememberBinding(resolveCommandBindings(objects.map(o => o.id === bound.id ? bound : o)), sliderId, targetId, propertyKey);
  }
  const plan = planFor(objects, target, propertyKey, sliderId);
  if (!plan) throw new Error('Bu özellik bağlanamıyor: gerekli nokta kilitli, başka bir nesneye bağlı, geometri geçersiz veya bağımlılık döngüsel.');
  if (plan.rule.mode === 'length' && !(slider.value > 0)) throw new Error('Uzunluk için kaydırıcının mevcut değeri sıfırdan büyük olmalı.');
  if (plan.rule.mode === 'angle' && (slider.value < 0 || slider.value > (plan.rule.maximumDegrees ?? 360))) {
    throw new Error(`Açı için kaydırıcının mevcut değeri 0 ile ${plan.rule.maximumDegrees ?? 360} derece arasında olmalı.`);
  }
  const id = plan.create ? createPointId() : plan.point.id;
  if (!id || (plan.create && objects.some(o => o.id === id))) throw new Error('Yeni yarıçap noktası için benzersiz bir kimlik gerekli.');
  // Bağdan önceki konum (yeni yaratılan gizli yarıçap noktasında yok): bağ geçici kapatılınca nokta buraya döner
  const preBindingPosition = plan.create ? undefined : plan.point.preBindingPosition ?? { x: plan.point.x, y: plan.point.y };
  const bound: PointObject = { ...plan.point, id, isIndependent: false, construction: plan.rule, ...(preBindingPosition ? { preBindingPosition } : {}) };
  let next = objects.map(o => o.id === bound.id ? bound : o);
  if (target.type === 'angle') next = next.map(o => o.id === target.id ? { ...target, valueSliderId: sliderId } : o);
  if (plan.angleMeasurementIds?.length) next = next.map(o => o.type === 'angle' && plan.angleMeasurementIds!.includes(o.id) ? { ...o, valueSliderId: sliderId } : o);
  if (plan.create) {
    next = next.map(o => {
      if (o.id !== target.id || o.type !== 'circle') return o;
      const { fixedRadius: _fixedRadius, releasedRadiusPointId: _releasedRadiusPointId, ...rest } = o;
      return { ...rest, radiusPointId: bound.id };
    });
    next.push(bound);
  }
  return rememberBinding(resolveCommandBindings(next), sliderId, targetId, propertyKey);
}

export function validateSliderSettings(min: number, max: number, step: number, value: number): string | null {
  if (![min, max, step, value].every(Number.isFinite)) return 'Kaydırıcı değerleri sonlu sayılar olmalı.';
  if (min >= max || !Number.isFinite(max - min)) return 'En küçük değer en büyük değerden küçük olmalı.';
  if (!(step > 0)) return 'Adım sıfırdan büyük olmalı.';
  if (value < min || value > max) return 'Mevcut değer en küçük ve en büyük değer arasında olmalı.';
  return null;
}

/** Adım ızgarasının başlangıcı sıfır değil, kaydırıcının en küçük değeridir. */
export function snapSliderValue(value: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(value)) throw new Error('Kaydırıcı değeri sonlu bir sayı olmalı.');
  const error = validateSliderSettings(min, max, step, Math.min(max, Math.max(min, value)));
  if (error) throw new Error(error);
  if (value <= min) return min;
  if (value >= max) return max;
  const clamped = Math.min(max, Math.max(min, value));
  // Ondalık minimum çıkarılırken yarım adımın hemen altına düşen IEEE-754 hatasını dengeler.
  const tolerance = Math.min(1e-9, Number.EPSILON * (Math.abs(clamped) + Math.abs(min)) / step * 2);
  const steps = Math.round((clamped - min) / step + tolerance);
  const snapped = Number.isFinite(steps) ? min + steps * step : clamped;
  return Math.min(max, Math.max(min, Number(snapped.toPrecision(15))));
}
