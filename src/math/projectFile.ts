import type { MathObject, ViewportTransform } from '@/types/math';
import type { LayoutMode, StyleSettings } from '@/types/workspace';
import { DEFAULT_STYLE_SETTINGS, STYLE_SECENEKLERI } from '@/types/workspace';
import type { Camera3D, Solid3DObject } from '@/types/workspace3d';

export interface ProjectFile {
  version: '2.0';
  objects: MathObject[];
  solids: Solid3DObject[];
  viewport?: Partial<ViewportTransform>;
  styleSettings?: StyleSettings;
  camera3D?: Camera3D;
  layoutMode?: LayoutMode;
}

type Row = Record<string, any>;
function fail(message: string): never { throw new Error(`Dosya açılamadı: ${message}. Mevcut çalışma korundu.`); }
const row = (v: unknown): Row => v && typeof v === 'object' && !Array.isArray(v) ? v as Row : fail('geçersiz nesne');
const str = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
function numbers(o: Row, keys: string[], positive = false) {
  for (const k of keys) if (!finite(o[k]) || (positive && o[k] <= 0)) fail(`${o.label || o.id || 'nesne'} için ${k} geçersiz`);
}
function ids(o: Row, key: string, min = 1, max = Infinity): string[] {
  const value = o[key];
  if (!Array.isArray(value) || value.length < min || value.length > max || !value.every(str)) fail(`${key} eksik veya geçersiz`);
  return value;
}
function id(o: Row, key: string): string {
  if (!str(o[key])) fail(`${key} eksik`);
  return o[key];
}
function finiteTree(v: unknown, depth = 0): void {
  if (depth > 30) fail('nesne yapısı çok derin');
  if (typeof v === 'number' && !Number.isFinite(v)) fail('sonlu olmayan sayı');
  if (v && typeof v === 'object') for (const item of Object.values(v)) finiteTree(item, depth + 1);
}

/** Tam dosya önce doğrulanır; tek bir bozuk kayıt bile canlı belgeye kısmen uygulanmaz. */
export function validateProjectObjects(input: unknown): MathObject[] {
  if (!Array.isArray(input)) fail('nesne listesi bulunamadı');
  finiteTree(input);
  const objects: Row[] = input.map(value => {
    const o = { ...row(value) };
    id(o, 'id'); id(o, 'type');
    if (o.label !== undefined && typeof o.label !== 'string') fail('nesne adı geçersiz');
    o.label ??= o.id; o.color ??= '#2563eb'; o.visible ??= true; o.showLabel ??= true; o.createdAt ??= 0;
    if (typeof o.visible !== 'boolean' || typeof o.showLabel !== 'boolean' || !str(o.color)) fail('nesne görünümü geçersiz');
    numbers(o, ['createdAt']);
    for (const key of ['size', 'thickness', 'arcRadius', 'fontSize', 'length', 'width', 'height']) if (o[key] !== undefined) numbers(o, [key], true);
    for (const key of ['rotation', 'animSpeed', 'animProgress', 'fillOpacity']) if (o[key] !== undefined) numbers(o, [key]);
    if (o.fillOpacity !== undefined && (o.fillOpacity < 0 || o.fillOpacity > 1)) fail('dolgu saydamlığı geçersiz');
    for (const key of ['locked', 'selected', 'showTrace', 'animating', 'showLength', 'showEquation', 'showArea', 'showPerimeter', 'showRadius', 'showChordLength', 'showArcLength', 'showCentralAngle', 'showValue', 'reflex', 'major']) if (o[key] !== undefined && typeof o[key] !== 'boolean') fail(`${key} geçersiz`);
    if (o.fillColor !== undefined && !str(o.fillColor)) fail('dolgu rengi geçersiz');
    if (o.dependsOn !== undefined) ids(o, 'dependsOn', 0);
    if (o.onObjectId !== undefined) id(o, 'onObjectId');
    if (['point', 'text', 'image', 'checkbox', 'button', 'input_box', 'fraction'].includes(o.type)) numbers(o, ['x', 'y']);
    if (o.labelOffsets !== undefined) for (const v of Object.values(row(o.labelOffsets))) numbers(row(v), ['x', 'y']);
    if (o.labelAnchors !== undefined) {
      o.labelAnchors = Object.fromEntries(Object.entries(row(o.labelAnchors)).map(([kind, value]) => {
        const anchor = row(value);
        const pointIds = ids(anchor, 'pointIds');
        if (new Set(pointIds).size !== pointIds.length) fail('etiket çapasının noktaları yineleniyor');
        const offset = row(anchor.offset);
        numbers(offset, ['x', 'y']);
        if (!['left', 'center', 'right'].includes(anchor.alignment)) fail('etiket hizalaması geçersiz');
        return [kind, { pointIds: [...pointIds], offset: { x: offset.x, y: offset.y }, alignment: anchor.alignment }];
      }));
    }
    switch (o.type) {
      case 'point':
        o.isIndependent ??= true; if (typeof o.isIndependent !== 'boolean') fail('nokta bağımsızlığı geçersiz');
        // 3B yüksekliği isteğe bağlıdır (yoksa 0); verilmişse sonlu bir sayı olmalı.
        if (o.z !== undefined) numbers(o, ['z']);
        break;
      case 'segment': id(o, 'startPointId'); id(o, 'endPointId'); break;
      case 'line': id(o, 'point1Id'); id(o, 'point2Id'); break;
      case 'ray': id(o, 'startPointId'); id(o, 'throughPointId'); break;
      case 'circle':
        if (o.throughPointIds?.length) ids(o, 'throughPointIds', 3, 3);
        else { id(o, 'centerPointId'); if (o.radiusPointId) id(o, 'radiusPointId'); else numbers(o, ['fixedRadius'], true); }
        break;
      case 'ellipse': id(o, 'centerPointId'); numbers(o, ['radiusX', 'radiusY'], true); break;
      case 'arc': case 'sector': id(o, 'centerPointId'); id(o, 'startPointId'); id(o, 'directionPointId'); break;
      case 'angle': id(o, 'point1Id'); id(o, 'vertexPointId'); id(o, 'point3Id'); break;
      case 'polygon':
        ids(o, 'pointIds', 3);
        if (o.edgeLabels !== undefined && (!Array.isArray(o.edgeLabels) || !o.edgeLabels.every((i: unknown) => Number.isInteger(i) && Number(i) >= 0 && Number(i) < o.pointIds.length))) fail('kenar etiketleri geçersiz');
        break;
      case 'function':
        if (typeof o.expression !== 'string') fail('fonksiyon ifadesi eksik');
        if (o.domain !== undefined && (!Array.isArray(o.domain) || o.domain.length !== 2 || !o.domain.every(finite) || o.domain[0] > o.domain[1])) fail('fonksiyon aralığı geçersiz');
        break;
      case 'slider':
        id(o, 'variableName'); numbers(o, ['min', 'max', 'step', 'value']);
        if (!(o.max > o.min) || o.step <= 0 || o.value < o.min || o.value > o.max) fail('kaydırıcı sınırları geçersiz');
        if (o.x !== undefined || o.y !== undefined) numbers(o, ['x', 'y']);
        break;
      case 'fraction': numbers(o, ['numerator']); numbers(o, ['denominator', 'radius'], true); if (!['pie', 'bar'].includes(o.modelType)) fail('kesir modeli geçersiz'); break;
      case 'pen': if (!Array.isArray(o.points)) fail('kalem noktaları eksik'); for (const p of o.points) numbers(row(p), ['x', 'y']); numbers(o, ['thickness'], true); break;
      case 'text': if (typeof o.text !== 'string') fail('yazı içeriği eksik'); break;
      case 'image': id(o, 'src'); numbers(o, ['width', 'height'], true); break;
      case 'checkbox': ids(o, 'targetIds', 0); if (typeof o.checked !== 'boolean') fail('işaret kutusu değeri geçersiz'); break;
      case 'button': {
        const a = row(o.action);
        switch (a.kind) {
          case 'toggle': ids(a, 'targetIds', 0); break;
          case 'animate': if (a.sliderIds !== undefined) ids(a, 'sliderIds', 0); if (a.targetIds !== undefined) ids(a, 'targetIds', 0); break;
          case 'setSlider': id(a, 'sliderId'); numbers(a, ['value']); break;
          case 'setValue': id(a, 'targetId'); numbers(a, ['value']); break;
          case 'clearTraces': break;
          default: fail('düğme işlemi geçersiz');
        }
        break;
      }
      case 'input_box': id(o, 'targetId'); if (!['value', 'expression'].includes(o.field)) fail('girdi kutusu alanı geçersiz'); break;
      case 'measurement':
        if (!['distance', 'slope', 'trig', 'arc'].includes(o.kind)) fail('ölçüm türü geçersiz');
        ids(o, 'pointIds', o.kind === 'trig' ? 3 : 2, o.kind === 'trig' ? 3 : 2);
        // Yay ölçümü: çember + iki uç (+ isteğe bağlı ara nokta). Başvuruların türü aşağıdaki references() ile denetlenir.
        if (o.kind === 'arc') {
          id(o, 'circleId');
          if (o.pointIds[0] === o.pointIds[1]) fail('yay ölçümünün uçları aynı');
          if (o.throughPointId !== undefined) id(o, 'throughPointId');
          // Başlangıç ucu yayın kimliğidir: uçlardan biri olmalı (eski dosyalarda yoktur, ilk işlemde yazılır)
          if (o.startPointId !== undefined) { id(o, 'startPointId'); if (!o.pointIds.includes(o.startPointId)) fail('yay ölçümünün başlangıç ucu geçersiz'); }
        }
        break;
      default: fail(`tanınmayan nesne türü: ${o.type}`);
    }
    // Eşitlik çentikleri (elle): 0 = işaretsiz, 1–4 çizgi; parça, yay, dilim, yay ölçümü ve çokgen kenarlarında.
    // Artık var olmayan bir kenarın işareti kaydı reddettirmez, sessizce düşer (süs alanı çizimi açmayı engellemesin).
    if (o.equalityMark !== undefined && (!(['segment', 'arc', 'sector'].includes(o.type) || (o.type === 'measurement' && o.kind === 'arc'))
      || !Number.isInteger(o.equalityMark) || o.equalityMark < 0 || o.equalityMark > 4)) fail('eşitlik işareti geçersiz');
    if (o.edgeEqualityMarks !== undefined) {
      if (o.type !== 'polygon') fail('eşitlik işareti geçersiz');
      const kenarlar: Row = {};
      for (const [k, v] of Object.entries(row(o.edgeEqualityMarks))) {
        if (!/^\d+$/.test(k) || !Number.isInteger(v) || (v as number) < 0 || (v as number) > 4) fail('kenar eşitlik işaretleri geçersiz');
        if (Number(k) < o.pointIds.length) kenarlar[k] = v;
      }
      if (Object.keys(kenarlar).length) o.edgeEqualityMarks = kenarlar; else delete o.edgeEqualityMarks;
    }
    if (o.construction !== undefined) {
      const c = row(o.construction);
      switch (c.kind) {
        case 'foot': id(c, 'sourceId'); ids(c, 'linePointIds', 2, 2); break;
        case 'midpoint': ids(c, 'pointIds', 2, 2); break;
        case 'ratio': ids(c, 'pointIds', 2, 2); numbers(c, ['t']); break;
        case 'direction': id(c, 'throughId'); ids(c, 'linePointIds', 2, 2); if (!['parallel', 'perpendicular'].includes(c.mode)) fail('doğru inşası geçersiz'); break;
        case 'bisector': ids(c, 'pointIds', 3, 3); break;
        case 'intersection': ids(c, 'objectIds', 2, 2); numbers(c, ['index']); break;
        case 'tangent': id(c, 'circleId'); id(c, 'sourceId'); if (![1, -1].includes(c.branch)) fail('teğet dalı geçersiz'); break;
        case 'triangleVertex': id(c, 'anchorId'); ids(c, 'sliderIds', 3, 3); numbers(c, ['rotation']); if (![1, 2].includes(c.vertex) || ![1, -1].includes(c.orientation)) fail('üçgen inşası geçersiz'); break;
        case 'triangleCenter': ids(c, 'pointIds', 3, 3); if (!['centroid', 'circumcenter', 'incenter', 'orthocenter'].includes(c.center)) fail('üçgen merkezi geçersiz'); break;
        case 'reflect': id(c, 'sourceId'); if (c.axisPointIds) ids(c, 'axisPointIds', 2, 2); else if (!c.centerId && !['x', 'y', 'y=x', 'y=-x'].includes(c.axis)) fail('yansıma ekseni eksik'); break;
        case 'rotate': id(c, 'sourceId'); numbers(c, ['degrees']); if (!c.centerId) numbers(row(c.center), ['x', 'y']); break;
        case 'dilate': id(c, 'sourceId'); numbers(c, ['factor']); if (!c.centerId) numbers(row(c.center), ['x', 'y']); break;
        case 'translate': id(c, 'sourceId'); if (c.vectorPointIds) ids(c, 'vectorPointIds', 2, 2); else numbers(row(c.vector), ['x', 'y']); break;
        default: fail('nokta inşası geçersiz');
      }
    }
    return o;
  });
  const byId = new Map(objects.map(o => [o.id, o]));
  if (byId.size !== objects.length) fail('aynı kimliği kullanan birden çok nesne var');
  // Etiket çapası süs bilgisidir: eski gruptan bir nokta silinmişse çizim yine açılır.
  // Kısmi bir grubun merkezini kullanmak yazıyı sıçratır; o kayıtta eski kayıklığa dönülür.
  for (const o of objects) if (o.labelAnchors) {
    const anchors = Object.fromEntries(Object.entries(o.labelAnchors as Record<string, Row>)
      .filter(([, anchor]) => anchor.pointIds.every((pointId: string) => byId.get(pointId)?.type === 'point')));
    if (Object.keys(anchors).length) o.labelAnchors = anchors;
    else delete o.labelAnchors;
  }
  const dependencies = new Map<string, string[]>();
  function references(value: unknown, key = '', parent?: Row): string[] {
    // armOfAngleId yalnızca "bu parça şu açının kolu" hatırlatmasıdır: açı silinince parça kalabilir,
    // bu yüzden eksik hedefi kaydı reddettirmemeli (reddedilince kayıtlı çizim boş açılıyordu).
    if (key === 'id' || key === 'releasedRadiusPointId' || key === 'armOfAngleId' || key === 'labelAnchors') return [];
    if (key === 'centerPointId' && parent?.type === 'circle' && parent.throughPointIds?.length) return [];
    if (typeof value === 'string' && (/Ids?$/.test(key) || key === 'dependsOn')) {
      const target = byId.get(value);
      if (!target) fail(`bulunamayan nesne başvurusu: ${value}`);
      if (/PointIds?$/.test(key) || key === 'pointIds') if (target.type !== 'point') fail('nokta başvurusu başka bir nesneye gidiyor');
      if (['sourceId', 'anchorId', 'throughId', 'centerId'].includes(key) && target.type !== 'point') fail('inşa noktası geçersiz');
      if (/^sliderIds?$/.test(key) && target.type !== 'slider') fail('kaydırıcı başvurusu geçersiz');
      if (key === 'circleId' && target.type !== 'circle') fail('çember başvurusu geçersiz');
      return [value];
    }
    if (Array.isArray(value)) return value.flatMap(v => references(v, key));
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => references(v, k, value as Row));
    return [];
  }
  for (const o of objects) {
    references(o);
    // Etkileşim hedefleri döngü değildir; yalnız geometrik bağımlılıkları denetle.
    if (!['checkbox', 'button', 'input_box'].includes(o.type)) dependencies.set(o.id, references(o));
  }
  const done = new Set<string>(), active = new Set<string>();
  const visit = (key: string) => {
    if (active.has(key)) fail('geometrik bağımlılıklarda döngü var');
    if (done.has(key)) return;
    active.add(key); for (const dep of dependencies.get(key) ?? []) visit(dep); active.delete(key); done.add(key);
  };
  for (const key of dependencies.keys()) visit(key);
  return objects as MathObject[];
}

export function validateProjectSolids(input: unknown): Solid3DObject[] {
  if (!Array.isArray(input)) fail('3B cisim listesi geçersiz');
  finiteTree(input);
  const solids = input.map(value => {
    const o = row(value); id(o, 'id'); id(o, 'name');
    if (!['cube', 'sphere', 'cylinder', 'prism', 'triangular_prism', 'cone', 'pyramid'].includes(o.type)) fail('3B cisim türü geçersiz');
    numbers(row(o.position), ['x', 'y', 'z']); numbers(row(o.rotation), ['x', 'y', 'z']); numbers(row(o.dimensions), ['width', 'height', 'depth'], true);
    if (o.dimensions.radius !== undefined) numbers(o.dimensions, ['radius'], true);
    numbers(o, ['opacity', 'unfoldProgress']);
    for (const key of ['showWireframe', 'showVertices', 'showFaces']) if (typeof o[key] !== 'boolean') fail('3B görünüm seçeneği geçersiz');
    if (o.opacity < 0 || o.opacity > 1 || o.unfoldProgress < 0 || o.unfoldProgress > 1 || !str(o.color)) fail('3B görünüm geçersiz');
    return o as Solid3DObject;
  });
  if (new Set(solids.map(o => o.id)).size !== solids.length) fail('3B kimlikleri benzersiz değil');
  return solids;
}

export function parseProjectFile(input: unknown): ProjectFile {
  const data = row(input);
  if (!['1.0', '2.0', 1, undefined].includes(data.version)) fail('proje sürümü desteklenmiyor');
  const objects = validateProjectObjects(data.objects);
  const solids = validateProjectSolids(data.solids ?? []);
  const out: ProjectFile = { version: '2.0', objects, solids };
  if (data.viewport !== undefined) {
    const v = row(data.viewport); finiteTree(v);
    const patch: Row = {};
    for (const key of ['zoom', 'panX', 'panY', 'width', 'height', 'gridStep']) if (v[key] !== undefined) { numbers(v, [key], !['panX', 'panY'].includes(key)); patch[key] = v[key]; }
    for (const key of ['showGrid', 'showAxes', 'showCoordinates', 'showMeasurements', 'showQuadrants', 'blackWhite', 'snapToGrid', 'gridStepAuto', 'showEqualityMarks']) if (v[key] !== undefined) { if (typeof v[key] !== 'boolean') fail('düzlem görünümü geçersiz'); patch[key] = v[key]; }
    if (v.backgroundColor !== undefined) { if (!str(v.backgroundColor)) fail('zemin rengi geçersiz'); patch.backgroundColor = v.backgroundColor; }
    if (v.gridOpacity !== undefined) { if (typeof v.gridOpacity !== 'number' || !(v.gridOpacity > 0 && v.gridOpacity <= 1)) fail('ızgara saydamlığı geçersiz'); patch.gridOpacity = v.gridOpacity; }
    for (const [key, allowed] of [['rightAngleStyle', ['arc_dot', 'square', 'arc_fill', 'l_shape']], ['pointSnapMode', ['automatic', 'snapToGrid', 'fixedToGrid', 'off']], ['gridStyle', ['kareli', 'noktali', 'izometrik']]] as const) if (v[key] !== undefined) { if (!(allowed as readonly string[]).includes(v[key])) fail('düzlem seçeneği geçersiz'); patch[key] = v[key]; }
    out.viewport = patch;
  }
  if (data.styleSettings !== undefined) {
    const s = row(data.styleSettings); numbers(s, ['strokeScale', 'fontScale', 'pointRadius', 'pointLabelScale', 'measurementScale', 'axisScale'], true);
    if (typeof s.hideLabelBoxes !== 'boolean' || typeof s.hideFills !== 'boolean') fail('stil ayarları geçersiz');
    for (const [k, allowed] of Object.entries(STYLE_SECENEKLERI)) if (s[k] !== undefined && !(allowed as readonly string[]).includes(s[k])) fail('stil ayarları geçersiz');
    // Bilinen alanlar tek tek doğrulanır: tanınmayan anahtarlar düşer, eksik olanlar varsayılandan tamamlanır
    // (1.0/2.0 dosyaları yeni ayarlar olmadan da açılır).
    const temiz = { ...DEFAULT_STYLE_SETTINGS };
    for (const k of Object.keys(DEFAULT_STYLE_SETTINGS) as (keyof StyleSettings)[]) {
      const v = s[k];
      const secenekler = STYLE_SECENEKLERI[k];
      if (secenekler) { if (typeof v === 'string' && secenekler.includes(v)) (temiz[k] as string) = v; }
      else if (typeof DEFAULT_STYLE_SETTINGS[k] === 'boolean') { if (typeof v === 'boolean') (temiz[k] as boolean) = v; }
      else if (finite(v)) (temiz[k] as number) = v;
    }
    out.styleSettings = temiz;
  }
  if (data.camera3D !== undefined) {
    const c = row(data.camera3D); numbers(c, ['rotX', 'rotY', 'panX', 'panY']); numbers(c, ['zoom', 'perspective'], true);
    for (const key of ['showGrid', 'showAxes', 'showCoordinates']) if (typeof c[key] !== 'boolean') fail('3B kamera geçersiz');
    out.camera3D = c as Camera3D;
  }
  if (data.layoutMode !== undefined) {
    if (!['default', 'algebra_2d', '2d_3d', 'three_col', 'algebra_3d', '2d_only', '3d_only'].includes(data.layoutMode)) fail('çalışma düzeni geçersiz');
    out.layoutMode = data.layoutMode;
  }
  return out;
}
