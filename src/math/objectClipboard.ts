import { MathObject, Point2D } from '@/types/math';
import { createId } from '@/state/ids';
import { generateNextPointLabel } from './geometry';
import { calledNames, functionLabel, functionNameOf, nextFunctionName } from './functionNames';

export type ObjectClipboard = { objects: MathObject[]; selectedIds: string[] };

function references(value: unknown, key = ''): string[] {
  // releasedRadiusPointId yalnızca "kilit çözülünce yarıçapı geri ver" hatırlatmasıdır, bağımlılık değildir:
  // izlenseydi çemberi (ya da dönüşüm görüntüsünü) kopyalamak başka noktaları da panoya taşırdı.
  // armOfAngleId de bağımlılık değildir: tek bir kolu kopyalamak açının tamamını panoya çekmemeli.
  // Yazının hizalama grubu yalnızca görünümü belirler; tek kenarı kopyalamak grubun tamamını çekmez.
  if (key === 'releasedRadiusPointId' || key === 'armOfAngleId' || key === 'labelAnchors' || key === 'bindingTarget') return [];
  if (key === 'sliderBindings' && value && typeof value === 'object') return Object.values(value).flatMap(v => references(v, 'sliderId'));
  if (typeof value === 'string') return /Ids?$/.test(key) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(v => references(v, key));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => references(v, k));
  return [];
}

export function copyObjects(scene: MathObject[], selectedIds: string[]): ObjectClipboard {
  const ids = new Set(selectedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const object of scene.filter(o => ids.has(o.id))) {
      const deps = references(object);
      if (object.type === 'function') for (const slider of scene) {
        const tokens: string[] = object.expression.match(/[a-zA-Z_][a-zA-Z_0-9]*/g) ?? [];
        if (slider.type === 'slider' && tokens.includes(slider.variableName)) deps.push(slider.id);
        if (slider.type === 'function' && calledNames(object.expression).includes(functionNameOf(slider) ?? '')) deps.push(slider.id);
      }
      for (const id of deps) if (!ids.has(id) && scene.some(o => o.id === id)) { ids.add(id); changed = true; }
    }
  }
  return structuredClone({ objects: scene.filter(o => ids.has(o.id)), selectedIds });
}

export function pasteObjects(clipboard: ObjectClipboard, scene: MathObject[], location: Point2D): ObjectClipboard {
  const pasted: MathObject[] = [];
  const idMap = new Map(clipboard.objects.map(o => [o.id, createId('paste')]));
  const names = scene.map(o => o.label);
  const variables = new Set(scene.flatMap(o => o.type === 'slider' ? [o.variableName] : []));
  const variableMap = new Map<string, string>();
  // Bütün adları ifadeleri çevirmeden ayır: sahne sırası bağımlılık sırası olmayabilir.
  const functionMap = new Map<string, string>();
  for (const object of clipboard.objects) if (object.type === 'slider') {
    let name = object.variableName, suffix = 2;
    while (variables.has(name)) name = object.variableName + suffix++;
    variables.add(name); variableMap.set(object.variableName, name);
  }
  const reserved = [...variables];
  for (const object of clipboard.objects) if (object.type === 'function') {
    const oldName = functionNameOf(object);
    if (!oldName) continue;
    const taken = scene.some(o => o.type === 'function' && functionNameOf(o) === oldName) || reserved.includes(oldName);
    const name = taken ? nextFunctionName(scene, reserved) : oldName;
    functionMap.set(oldName, name); reserved.push(name);
  }
  const positions = clipboard.objects.flatMap(o => 'x' in o && 'y' in o && typeof o.x === 'number' && typeof o.y === 'number' ? [{ x: o.x, y: o.y }] : o.type === 'pen' ? o.points : []);
  const center = positions.length ? { x: positions.reduce((sum, p) => sum + p.x, 0) / positions.length, y: positions.reduce((sum, p) => sum + p.y, 0) / positions.length } : location;
  const offset = { x: location.x - center.x, y: location.y - center.y };
  function remap(value: unknown, key = ''): unknown {
    if (key === 'sliderBindings' && value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([property, sliderId]) => [property, remap(sliderId, 'sliderId')]));
    if (typeof value === 'string') return key === 'id' || /Ids?$/.test(key) ? idMap.get(value) ?? value : value;
    if (Array.isArray(value)) return value.map(v => remap(v, key));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remap(v, k)]));
    return value;
  }
  const objects = clipboard.objects.map(source => {
    const object = remap(source) as MathObject;
    // Tek başına kopyalanan kaydırıcı eski sahnenin ölçü adını taşımamalı.
    if (object.type === 'slider' && source.type === 'slider' && source.bindingTarget && !idMap.has(source.bindingTarget.objectId)) delete object.bindingTarget;
    if (source.labelAnchors && object.labelAnchors) {
      const anchors = Object.fromEntries(Object.entries(object.labelAnchors).filter(([kind]) =>
        source.labelAnchors![kind].pointIds.every(id => idMap.has(id))));
      // Grubun tamamı panodaysa kimlikler remap ile yenilenmiştir. Kısmi kopya eski
      // sahnedeki noktalara bağlı kalmasın; mevcut labelOffsets yedek konumu korunur.
      if (Object.keys(anchors).length) object.labelAnchors = anchors;
      else delete object.labelAnchors;
    }
    // Yarıçapı bırakan nokta panoda yoksa hatırlatma yeni çemberde anlamsızdır
    if (object.type === 'circle' && source.type === 'circle' && source.releasedRadiusPointId && !idMap.has(source.releasedRadiusPointId)) delete object.releasedRadiusPointId;
    // Açısı panoda yoksa kopya parça artık o açının kolu değildir (eski açının silinmesi kopyayı götürmesin)
    if (object.type === 'segment' && source.type === 'segment' && source.armOfAngleId && !idMap.has(source.armOfAngleId)) delete object.armOfAngleId;
    let label = object.type === 'point' ? generateNextPointLabel(names) : object.label;
    while (names.includes(label)) label += '′';
    object.label = label; names.push(label); object.createdAt = Date.now();
    if ('x' in object && 'y' in object && typeof object.x === 'number' && typeof object.y === 'number') { object.x += offset.x; object.y += offset.y; }
    if (object.type === 'pen') object.points = object.points.map(p => ({ x: p.x + offset.x, y: p.y + offset.y }));
    if (object.type === 'slider') object.variableName = variableMap.get(object.variableName)!;
    if (object.type === 'function') {
      const oldName = functionNameOf(source as typeof object);
      object.expression = object.expression.replace(/(?<![\p{L}\p{N}_])(\p{L}[\p{L}\p{N}]?)\s*(?=\()/gu, (token, name: string) => functionMap.get(name.toLowerCase()) ?? token);
      object.expression = object.expression.replace(/[a-zA-Z_][a-zA-Z_0-9]*/g, token => variableMap.get(token) ?? token);
      if (oldName) object.label = functionLabel(functionMap.get(oldName)!, object.expression);
    }
    pasted.push(object);
    return object;
  });
  return { objects, selectedIds: clipboard.selectedIds.flatMap(id => idMap.has(id) ? [idMap.get(id)!] : []) };
}
