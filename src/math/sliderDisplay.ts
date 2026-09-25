import type { MathObject, PointObject, SliderObject } from '@/types/math';
import {
  type Dugum, type Olcu, type YazimAyari, VARSAYILAN_YAZIM,
  aci, ad, duzMetin, kelime, kullanilabilirAd, merkezAci, olcuDugumleri, sembol, uzunluk, yaricap,
} from './matematikYazimi';
import { yayGeometrisi, yayMerkezAcisi } from './olcuYazimlari';

export interface SliderDisplay {
  nameNodes: Dugum[];
  nodes: Dugum[];
  name: string;
  text: string;
  unit: '°' | 'br' | 'cm' | '';
}

type Name = { nameNodes: Dugum[]; unit: SliderDisplay['unit']; suffix?: Dugum[] };

/** Görünen ad ölçünün adıdır; hesaplamalarda kullanılan variableName değiştirilmez. */
export function sliderDisplay(objects: readonly MathObject[], slider: SliderObject, ayar: YazimAyari = VARSAYILAN_YAZIM): SliderDisplay {
  const byId = new Map(objects.map(object => [object.id, object]));
  const point = (id: string | undefined): PointObject | null => {
    const object = id ? byId.get(id) : undefined;
    // Tuvalde adın gizlenmesi, kaydırıcının hangi ölçüyü yönettiğini gizlemez.
    return object?.type === 'point' ? { ...object, visible: true, showLabel: true } : null;
  };
  const full = { ...ayar, olcuYazimi: 'tam' as const };
  const fromMeasure = (measure: Olcu, fallback: string): Name => {
    // r = |OA| içindeki eşitlik adın parçasıdır; yalnız sağdaki değer ilişkisini ayır.
    const template = olcuDugumleri({ ...measure, deger: 0 }, full);
    let relation = -1;
    template.forEach((node, i) => { if (node.t === 'sembol' && /^\s*[=≈]\s*$/.test(node.s)) relation = i; });
    return {
      nameNodes: relation > 0 ? template.slice(0, relation) : [kelime(fallback)],
      unit: ['aci', 'merkezAci', 'yayOlcusu'].includes(measure.tur) ? '°' : measure.birim,
      suffix: relation >= 0 ? template.slice(relation + 1).filter(node => node.t === 'kelime' && node.soluk) : [],
    };
  };
  const named = (symbol: string, p: PointObject | null, fallback: string, unit: SliderDisplay['unit']): Name => {
    const label = kullanilabilirAd(p);
    return { nameNodes: label ? [sembol(`${symbol}(`), ad(label), sembol(')')] : [kelime(fallback)], unit };
  };
  const radius = (centerId: string, endpointId?: string): Name => {
    const center = point(centerId), endpoint = point(endpointId);
    return kullanilabilirAd(center) && kullanilabilirAd(endpoint)
      ? fromMeasure(yaricap(center, endpoint, slider.value), 'Yarıçap')
      : named('r', center, 'Yarıçap', 'br');
  };

  // Eski üçgen komutu üç değeri ortak bir kurala bağlar. Sıra AB, BC, CA'dır.
  const triangleSides: [string, string][] = [];
  for (const object of objects) {
    if (object.type !== 'point' || object.construction?.kind !== 'triangleVertex') continue;
    const rule = object.construction;
    const side = rule.sliderIds.indexOf(slider.id);
    if (side < 0) continue;
    const vertices = objects.filter((other): other is PointObject => other.type === 'point'
      && other.construction?.kind === 'triangleVertex' && other.construction.anchorId === rule.anchorId
      && other.construction.sliderIds.every((id, i) => id === rule.sliderIds[i]));
    const b = vertices.find(other => other.construction?.kind === 'triangleVertex' && other.construction.vertex === 1);
    const c = vertices.find(other => other.construction?.kind === 'triangleVertex' && other.construction.vertex === 2);
    if (side === 0 && b) triangleSides.push([rule.anchorId, b.id]);
    if (side === 1 && b && c) triangleSides.push([b.id, c.id]);
    if (side === 2 && c) triangleSides.push([c.id, rule.anchorId]);
  }
  const lengthMatches = (a: string, b: string, reversible = false): boolean => {
    const rule = point(b)?.construction;
    return !!(rule?.kind === 'sliderPoint' && rule.sliderId === slider.id && rule.mode === 'length' && rule.anchorId === a)
      || triangleSides.some(([first, second]) => (first === a && second === b) || (first === b && second === a))
      || (reversible && lengthMatches(b, a));
  };
  const angleMatches = (centerId: string, referenceId: string, movingId: string, reversible = false): boolean => {
    const rule = point(movingId)?.construction;
    return !!(rule?.kind === 'sliderPoint' && rule.mode === 'angle' && rule.sliderId === slider.id && rule.anchorId === centerId && rule.referenceId === referenceId)
      || !!(rule?.kind === 'rotate' && rule.sliderId === slider.id && rule.centerId === centerId && rule.sourceId === referenceId)
      || (reversible && angleMatches(centerId, movingId, referenceId));
  };
  const forTarget = (target: MathObject, key: string): Name | null => {
    switch (target.type) {
      case 'point': {
        const rule = target.construction;
        return rule?.kind === 'sliderPoint' && rule.sliderId === slider.id && (key === 'x' || key === 'y') && rule.mode === key
          ? named(key, point(target.id), `${key} koordinatı`, '') : null;
      }
      case 'segment':
      case 'line':
      case 'ray': {
        const a = target.type === 'line' ? target.point1Id : target.startPointId;
        const b = target.type === 'segment' ? target.endPointId : target.type === 'line' ? target.point2Id : target.throughPointId;
        if (key !== 'length' || !lengthMatches(a, b, true)) return null;
        const birim = target.type === 'segment' && (target.unit === 'cm' || (!target.unit && target.label.includes('cm'))) ? 'cm' : 'br';
        return fromMeasure(uzunluk(point(a), point(b), slider.value, { birim }), 'Uzunluk');
      }
      case 'polygon': {
        const match = /^(edge|angle):(\d+)$/.exec(key);
        if (!match || target.pointIds.length < 3) return null;
        const index = Number(match[2]), count = target.pointIds.length;
        if (!Number.isSafeInteger(index) || index >= count) return null;
        const vertex = target.pointIds[index], next = target.pointIds[(index + 1) % count];
        if (match[1] === 'edge') return lengthMatches(vertex, next, true)
          ? fromMeasure(uzunluk(point(vertex), point(next), slider.value), 'Uzunluk') : null;
        const previous = target.pointIds[(index + count - 1) % count];
        return angleMatches(vertex, previous, next, true)
          ? fromMeasure(aci(point(previous), point(vertex), point(next), slider.value), 'Açı') : null;
      }
      case 'angle': return key === 'angle' && angleMatches(target.vertexPointId, target.point1Id, target.point3Id, true)
        ? fromMeasure(aci(point(target.point1Id), point(target.vertexPointId), point(target.point3Id), slider.value), 'Açı') : null;
      case 'circle': return key === 'radius' && !target.throughPointIds?.length && target.fixedRadius === undefined && target.radiusPointId
        && lengthMatches(target.centerPointId, target.radiusPointId) ? radius(target.centerPointId, target.radiusPointId) : null;
      case 'arc':
      case 'sector': {
        if (key === 'radius') return lengthMatches(target.centerPointId, target.startPointId) ? radius(target.centerPointId, target.startPointId) : null;
        if (key !== 'centralAngle' || !angleMatches(target.centerPointId, target.startPointId, target.directionPointId)) return null;
        const geometry = yayGeometrisi(target, point);
        const namedObjects = objects.map(object => object.type === 'point' ? point(object.id)! : object);
        return fromMeasure(geometry ? yayMerkezAcisi(target, point, namedObjects, geometry, slider.value)
          : merkezAci(point(target.startPointId), point(target.centerPointId), point(target.directionPointId), slider.value), 'Merkez açısı');
      }
      case 'ellipse':
        if ((key !== 'radiusX' && key !== 'radiusY' && key !== 'rotation') || target.sliderBindings?.[key] !== slider.id) return null;
        return key === 'rotation' ? named('θ', point(target.centerPointId), 'Elips dönme açısı', '°')
          : named(key === 'radiusX' ? 'a' : 'b', point(target.centerPointId), key === 'radiusX' ? 'Yatay yarıçap' : 'Dikey yarıçap', 'br');
      default: return null;
    }
  };

  let selected: Name | null = null;
  const binding = slider.bindingTarget;
  const target = binding ? byId.get(binding.objectId) : undefined;
  if (binding && target) selected = forTarget(target, binding.propertyKey);
  // Üçgen komutunun üç kaydırıcısı doğrudan kenarları ölçer; aynı noktalarla
  // sonradan çizilmiş bir çember bu eski kaydırıcıya yarıçap adı vermesin.
  if (!selected && triangleSides.length) selected = fromMeasure(uzunluk(point(triangleSides[0][0]), point(triangleSides[0][1]), slider.value), 'Uzunluk');
  // Eski kayıtlarda açık açı sahibi ile yarıçap/yay gibi özel anlamları önce tut.
  if (!selected) for (const object of objects) {
    if (object.type === 'angle' && object.valueSliderId === slider.id) selected = forTarget(object, 'angle');
    if (selected) break;
  }
  if (!selected) for (const object of objects) {
    const keys = object.type === 'circle' ? ['radius'] : object.type === 'arc' || object.type === 'sector'
      ? ['centralAngle', 'radius'] : object.type === 'ellipse' ? ['radiusX', 'radiusY', 'rotation'] : [];
    for (const key of keys) { selected = forTarget(object, key); if (selected) break; }
    if (selected) break;
  }
  if (!selected) for (const object of objects) {
    const keys = object.type === 'segment' || object.type === 'line' || object.type === 'ray' ? ['length']
      : object.type === 'angle' ? ['angle'] : object.type === 'polygon'
        ? [...object.pointIds.map((_, i) => `edge:${i}`), ...object.pointIds.map((_, i) => `angle:${i}`)] : [];
    for (const key of keys) { selected = forTarget(object, key); if (selected) break; }
    if (selected) break;
  }
  if (!selected) for (const object of objects) {
    if (object.type !== 'point') continue;
    const rule = object.construction;
    if (rule?.kind === 'sliderPoint' && rule.sliderId === slider.id) {
      if (rule.mode === 'length') selected = fromMeasure(uzunluk(point(rule.anchorId), point(object.id), slider.value), 'Uzunluk');
      else if (rule.mode === 'angle') selected = fromMeasure(aci(point(rule.referenceId), point(rule.anchorId), point(object.id), slider.value), 'Açı');
      else selected = forTarget(object, rule.mode);
    } else if (rule?.kind === 'rotate' && rule.sliderId === slider.id) {
      selected = fromMeasure(aci(point(rule.sourceId), point(rule.centerId), point(object.id), slider.value), 'Dönme açısı');
    }
    if (selected) break;
  }
  const { nameNodes, unit, suffix = [] } = selected ?? { nameNodes: [sembol(slider.variableName)], unit: slider.sliderType === 'angle' ? '°' as const : '' as const };
  const nodes: Dugum[] = [...nameNodes, sembol(' = '), { t: 'sayi', s: String(slider.value).replace('.', ',') }, ...(unit ? [{ t: 'birim' as const, s: unit }] : []), ...suffix];
  return { nameNodes, nodes, name: duzMetin(nameNodes), text: duzMetin(nodes), unit };
}
