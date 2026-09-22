import type { AngleObject, FunctionObject, MathObject, MeasurementObject, ObjectType, PointObject, PolygonObject } from '@/types/math';
import { calculateAngleDegrees, calculateLineEquation, calculatePolygonArea, calculatePolygonPerimeter, calculateSlope } from '../../../geometry';
import { compileMathExpression } from '../../../parser';
import { type CommandScene, fail, skip, trNum } from '../../scene';
import type { LabelRef } from '../../text';
import type { Ctx } from './angles';
import {
  P, SLOPE_ANGLE, areaOf, arcGeometry, br, br2, coord, corner, deg, distance, edgeIndex, fmt, nameOf, nounFilter, onlyPoint, perimeterOf, pick, setFlags, wantsMany,
} from './common';
import { resolveArc } from '@/math/arcMeasure';

const AREA_TYPES: ObjectType[] = ['polygon', 'circle', 'ellipse', 'sector'];
const LINEAR: ObjectType[] = ['segment', 'line', 'ray'];
const LENGTH_TYPES: ObjectType[] = ['segment', 'line', 'ray', 'arc', 'sector', 'polygon', 'circle', 'ellipse'];
const ARC_TYPES: ObjectType[] = ['arc', 'sector'];
const ALL_TYPES: ObjectType[] = ['polygon', 'circle', 'ellipse', 'arc', 'sector', 'segment', 'line', 'ray', 'angle', 'measurement'];

const capital = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
const pointNames = (pts: PointObject[]) => pts.map(p => p.label).join('');

/** Odak/seçimde (zamire göre sırayla) verilen türden nesne var mı? */
function hasContext(x: Ctx, types: ObjectType[]): boolean {
  return [...x.scene.focus, ...x.scene.selection].some(id => { const o = x.scene.get(id); return !!o && types.includes(o.type); });
}

// ---------------------------------------------------------------------------------------------------------------- alan / çevre

export function areaPerimeter(x: Ctx) {
  const { scene } = x;
  const wantArea = x.kinds.includes('area'), wantPerimeter = x.kinds.includes('perimeter');
  if (!wantArea && !wantPerimeter) return;
  const nf = nounFilter(x.text);
  if (nf && !nf.types.some(t => AREA_TYPES.includes(t))) {
    if (nf.types.includes('arc')) fail('Yayın alanı ve çevresi olmaz. “Yay uzunluğunu göster” yazın ya da daire dilimi kullanın.');
    fail(`${capital(nf.noun)} için alan ve çevre hesaplanmaz. Uzunluk için “AB'nin uzunluğunu ölç” yazın.`);
  }
  const types = nf ? nf.types.filter(t => AREA_TYPES.includes(t)) : AREA_TYPES;
  // Çokgeni çizilmemiş noktalar: "ABC'nin alanı kaç" → yalnızca yanıt
  if (x.labels.length === 1 && !scene.resolveLabel(x.labels[0], types).filter(o => o.type !== 'point').length) {
    const pts = scene.pointsFromLabel(x.labels[0].text);
    if (pts && pts.length >= 3 && new Set(pts).size === pts.length) {
      const parts = [
        ...(wantArea ? [`alan = ${br2(calculatePolygonArea(pts.map(P)))}`] : []),
        ...(wantPerimeter ? [`çevre = ${br(calculatePolygonPerimeter(pts.map(P)))}`] : []),
      ];
      x.focus.push(...pts.map(p => p.id));
      x.out.push(`${pointNames(pts)} (çizili çokgen yok): ${parts.join(', ')}. Tuvalde göstermek için önce “${pointNames(pts)} çokgenini çiz” yazın.`);
      return;
    }
  }
  const targets = pick(x.c, scene, { types, noun: nf?.noun ?? 'şekil', filter: nf?.filter, many: wantsMany(x.text, x.labels) });
  for (const o of targets) {
    const parts: string[] = [];
    const patch: Record<string, unknown> = {};
    if (wantArea) { parts.push(`alan = ${br2(areaOf(scene, o)!)}`); patch.showArea = true; x.answers.push(areaOf(scene, o)!); }
    if (wantPerimeter) { parts.push(`çevre = ${br(perimeterOf(scene, o)!)}`); patch.showPerimeter = true; x.answers.push(perimeterOf(scene, o)!); }
    setFlags(scene, o, patch);
    x.focus.push(o.id);
    x.out.push(`${nameOf(o)}: ${parts.join(', ')}.`);
  }
}

// ---------------------------------------------------------------------------------------------------------------- uzunluk / kenar / mesafe

function lineLength(x: Ctx, o: MathObject) {
  const [a, b] = x.scene.lineOf(o)!;
  setFlags(x.scene, o, { showLength: true });
  x.focus.push(o.id);
  x.answers.push(distance(a, b));
  const note = o.type === 'segment' ? '' : ` (${o.type === 'line' ? 'doğrunun' : 'ışının'} tanım noktaları arası)`;
  x.out.push(`|${a.label}${b.label}| = ${br(distance(a, b))}${note}.`);
}

function showEdges(x: Ctx, polygon: PolygonObject, indices: number[], title?: string) {
  const { scene } = x;
  const n = polygon.pointIds.length;
  const merged = [...new Set([...(polygon.edgeLabels ?? []), ...indices])].sort((a, b) => a - b);
  setFlags(scene, polygon, { edgeLabels: merged });
  x.focus.push(polygon.id);
  const parts = indices.map(i => {
    const a = scene.point(polygon.pointIds[i]), b = scene.point(polygon.pointIds[(i + 1) % n]);
    x.answers.push(distance(a, b));
    return `|${a.label}${b.label}| = ${br(distance(a, b))}`;
  });
  x.out.push(`${polygon.label} ${title ?? (indices.length === n && n > 1 ? 'kenarları' : 'kenarı')}: ${parts.join(', ')}.`);
}

type EdgeSelector = 'hypotenuse' | 'legs' | 'longest' | 'shortest';
const EDGE_TITLE: Record<EdgeSelector, string> = { hypotenuse: 'hipotenüsü', legs: 'dik kenarları', longest: 'en uzun kenarı', shortest: 'en kısa kenarı' };

function edgeSelector(text: string): EdgeSelector | null {
  if (/\bhipotenus/.test(text)) return 'hypotenuse';
  if (/\bdik kenar/.test(text)) return 'legs';
  if (/\ben (?:uzun|buyuk) kenar/.test(text)) return 'longest';
  if (/\ben (?:kisa|kucuk) kenar/.test(text)) return 'shortest';
  return null;
}

/** Hipotenüs, dik kenarlar, en uzun / en kısa kenar: kenar dizinleri. */
function selectEdges(x: Ctx, polygon: PolygonObject, selector: EdgeSelector): number[] {
  const { scene } = x;
  const n = polygon.pointIds.length;
  if (selector === 'hypotenuse' || selector === 'legs') {
    const word = selector === 'hypotenuse' ? 'Hipotenüs' : 'Dik kenarlar';
    if (n !== 3) fail(`${polygon.label} bir üçgen değil. ${word} yalnızca dik üçgende vardır.`);
    const right = polygon.pointIds.findIndex((_, i) => Math.abs(corner(scene, polygon, i).degrees - 90) <= 0.5);
    if (right < 0) fail(`${polygon.label} dik üçgen değil. ${word} yalnızca dik üçgende vardır; kenarlar için “${polygon.label} üçgeninin kenarlarını ölç” yazın.`);
    return selector === 'hypotenuse' ? [(right + 1) % 3] : [right, (right + 2) % 3].sort((a, b) => a - b);
  }
  const lens = polygon.pointIds.map((id, i) => distance(scene.point(id), scene.point(polygon.pointIds[(i + 1) % n])));
  const target = selector === 'longest' ? Math.max(...lens) : Math.min(...lens);
  return lens.map((l, i) => (Math.abs(l - target) < 1e-9 ? i : -1)).filter(i => i >= 0);
}

function pointDistance(x: Ctx, a: PointObject, b: PointObject) {
  const { scene } = x;
  if (a.id === b.id) fail('Mesafe için iki farklı nokta yazın: “A ile B arasındaki mesafe”.');
  const d = distance(a, b);
  x.answers.push(d);
  const segment = scene.shapesWithPoints([a.id, b.id], ['segment'])[0];
  if (segment) {
    setFlags(scene, segment, { showLength: true });
    x.focus.push(segment.id);
    x.out.push(`|${a.label}${b.label}| = ${br(d)}.`);
    return;
  }
  if (x.it.showOrMeasure) {
    // "Uzunluk Ölç (br)" aracıyla aynı ölçüm parçası
    const s = scene.addSegment(a.id, b.id, { label: `|${a.label}${b.label}|`, color: '#059669', thickness: 3, unit: 'br', showLength: true });
    x.focus.push(s.id);
    x.out.push(`|${a.label}${b.label}| = ${br(d)}. Ölçüm doğru parçası çizildi.`);
    return;
  }
  x.focus.push(a.id, b.id);
  x.out.push(`${a.label} ile ${b.label} arasındaki mesafe ${br(d)}.`);
}

function pointLineDistance(x: Ctx, p: PointObject, a: PointObject, b: PointObject, name: string, object?: MathObject) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  if (len < 1e-12) fail('Doğrunun iki noktası çakışık; uzaklık hesaplanamadı.');
  const d = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
  x.answers.push(d);
  x.focus.push(p.id, ...(object ? [object.id] : []));
  x.out.push(`${p.label} noktası ile ${name} arasındaki en kısa uzaklık ${br(d)}.`);
}

/** Aynı kenarı paylaşan çokgenlerden birini seçer; yoksa undefined. */
function edgeOwner(x: Ctx, a: PointObject, b: PointObject, context?: PolygonObject, filter?: (o: MathObject) => boolean): PolygonObject | undefined {
  const { scene } = x;
  let polygons = scene.ofType('polygon').filter(p => (!context || p.id === context.id) && (!filter || filter(p)) && edgeIndex(p, a.id, b.id) >= 0);
  if (polygons.length > 1) {
    const preferred = polygons.filter(p => scene.focus.includes(p.id) || scene.selection.includes(p.id));
    if (preferred.length !== 1) {
      fail(`${a.label}${b.label} kenarı birden fazla çokgende var (${polygons.map(p => p.label).join(', ')}). Hangisi olduğunu yazın: “${polygons[0].label} çokgeninin ${a.label}${b.label} kenarını ölç”.`);
    }
    polygons = preferred;
  }
  if (!polygons.length && context) fail(`${a.label}${b.label}, ${context.label} çokgeninin bir kenarı değil.`);
  return polygons[0];
}

function lengthOf(x: Ctx, o: MathObject, plural: boolean) {
  const { scene } = x;
  switch (o.type) {
    case 'segment': case 'line': case 'ray': return lineLength(x, o);
    case 'arc': case 'sector': return arcPart(x, o, 'arcLength');
    case 'circle': case 'ellipse': {
      setFlags(scene, o, { showPerimeter: true });
      x.focus.push(o.id);
      x.out.push(`${nameOf(o)}: çevre = ${br(perimeterOf(scene, o)!)}.`);
      return;
    }
    case 'polygon': {
      const n = o.pointIds.length;
      const lens = o.pointIds.map((id, i) => distance(scene.point(id), scene.point(o.pointIds[(i + 1) % n])));
      const equal = lens.every(l => Math.abs(l - lens[0]) < 1e-9);
      if (!plural && !equal) {
        const [a, b] = [scene.point(o.pointIds[0]), scene.point(o.pointIds[1])];
        fail(`Hangi kenar? Kenarın adını yazın: “${a.label}${b.label} kenarının uzunluğunu göster” ya da “${o.label} üçgeninin tüm kenarlarını ölç”.`);
      }
      return showEdges(x, o, o.pointIds.map((_, i) => i));
    }
    default: fail(`${nameOf(o)} için uzunluk ölçülmez.`);
  }
}

export function lengths(x: Ctx) {
  const { scene } = x;
  const distanceMode = x.kinds.includes('distance');
  const edgesMode = x.kinds.includes('edges');
  if (!distanceMode && !edgesMode && !x.kinds.includes('length')) return;
  const plural = /\b(?:uzunluklar|kenarlar|boylar)/.test(x.text) || x.it.all;
  const nf = nounFilter(x.text);
  const refs = x.labels;

  if (distanceMode) {
    if (!refs.length) {
      const pool = [...scene.focus, ...scene.selection].map(id => scene.get(id)).filter((o): o is PointObject => o?.type === 'point');
      const unique = [...new Map(pool.map(p => [p.id, p])).values()];
      if (unique.length === 2) return pointDistance(x, unique[0], unique[1]);
      fail('İki noktanın adını yazın: “A ile B arasındaki mesafe”.');
    }
    const singles: PointObject[] = [];
    const pairs: { a: PointObject; b: PointObject; name: string; object?: MathObject }[] = [];
    for (const ref of refs) {
      const single = onlyPoint(scene, ref);
      if (single) { singles.push(single); continue; }
      const linear = scene.resolveLabel(ref, LINEAR).filter(o => LINEAR.includes(o.type));
      if (linear.length) {
        const [a, b] = scene.lineOf(linear[0])!;
        pairs.push({ a, b, name: nameOf(linear[0]), object: linear[0] });
        continue;
      }
      const pts = scene.pointsFromLabel(ref.text);
      if (pts?.length === 2) { pairs.push({ a: pts[0], b: pts[1], name: `${pointNames(pts)} doğrusu` }); continue; }
      fail(`${ref.text} adlı nokta ya da doğru bulunamadı.`);
    }
    if (singles.length === 2 && !pairs.length) return pointDistance(x, singles[0], singles[1]);
    if (!singles.length && pairs.length === 1) return pointDistance(x, pairs[0].a, pairs[0].b);
    if (singles.length === 1 && pairs.length === 1) return pointLineDistance(x, singles[0], pairs[0].a, pairs[0].b, pairs[0].name, pairs[0].object);
    fail('Mesafe için iki nokta (“A ile B arasındaki mesafe”) ya da bir nokta ve bir doğru (“A noktasının BC doğrusuna uzaklığı”) yazın.');
  }

  // "hipotenüsün uzunluğu", "ABC'nin dik kenarları", "üçgenin en uzun kenarı"
  const selector = edgeSelector(x.text);
  if (selector) {
    const owners = refs.map(r => scene.resolveLabel(r, ['polygon']).find((o): o is PolygonObject => o.type === 'polygon'));
    if (owners.every(Boolean)) {
      const polygons = refs.length ? owners as PolygonObject[]
        : pick(x.c, scene, { types: ['polygon'], noun: nf?.noun ?? 'üçgen', filter: nf?.filter, many: wantsMany(x.text, refs) }) as PolygonObject[];
      for (const polygon of polygons) showEdges(x, polygon, selectEdges(x, polygon, selector), EDGE_TITLE[selector]);
      return;
    }
  }

  if (!refs.length) {
    const types = nf ? nf.types.filter(t => LENGTH_TYPES.includes(t)) : edgesMode ? ['polygon' as ObjectType] : LENGTH_TYPES;
    if (!types.length) fail(`${capital(nf!.noun)} için uzunluk ölçülmez.`);
    const targets = pick(x.c, scene, { types, noun: nf?.noun ?? (edgesMode ? 'çokgen' : 'şekil'), filter: nf?.filter, many: wantsMany(x.text, refs) });
    for (const o of targets) lengthOf(x, o, plural);
    return;
  }

  const polygonRefs = refs.map(r => scene.resolveLabel(r, ['polygon'])[0] as PolygonObject | undefined);
  const context = refs.length > 1 ? polygonRefs.find(Boolean) : undefined;
  const singles: PointObject[] = [];
  for (const ref of refs) {
    const pts = scene.pointsFromLabel(ref.text);
    const all = scene.resolveLabel(ref, LENGTH_TYPES).filter(o => o.type !== 'point');
    if (context && all.includes(context)) continue;
    const named = nf ? all.filter(o => nf.types.includes(o.type) && (!nf.filter || nf.filter(o))) : all;
    if (ref.bracket) {
      const seg = all.find(o => o.type === 'segment');
      if (seg) { lineLength(x, seg); continue; }
      if (pts?.length === 2) { pointDistance(x, pts[0], pts[1]); continue; }
      fail(`${ref.text} doğru parçası bulunamadı.`);
    }
    if (edgesMode && pts?.length === 2) {
      const owner = edgeOwner(x, pts[0], pts[1], context, nf?.filter);
      if (owner) { showEdges(x, owner, [edgeIndex(owner, pts[0].id, pts[1].id)]); continue; }
    }
    const linear = named.filter(o => LINEAR.includes(o.type));
    if (linear.length) {
      const byType = LINEAR.map(t => linear.filter(o => o.type === t)).find(list => list.length)!;
      if (byType.length > 1) fail(`${ref.text} adında birden fazla nesne var (${byType.map(nameOf).join(', ')}). Hangisi olduğunu belirtin.`);
      lineLength(x, byType[0]);
      continue;
    }
    if (named.length) {
      if (named.length > 1 && !plural) fail(`${ref.text} birden fazla şekli gösteriyor (${named.map(nameOf).join(', ')}). Şeklin adını da yazın (ör. “${ref.text} merkezli çemberin çevresi”).`);
      for (const o of named) lengthOf(x, o, plural || edgesMode && o.type === 'polygon' && /\bkenarlar/.test(x.text));
      continue;
    }
    if (pts?.length === 2) {
      const owner = edgeOwner(x, pts[0], pts[1], context, nf?.filter);
      if (owner) showEdges(x, owner, [edgeIndex(owner, pts[0].id, pts[1].id)]);
      else pointDistance(x, pts[0], pts[1]);
      continue;
    }
    if (pts?.length === 1) { singles.push(pts[0]); continue; }
    if (pts && pts.length > 2) fail(`${ref.text} adlı bir doğru parçası ya da çokgen yok. Çokgen için önce “${ref.text} çokgenini çiz” yazın.`);
    fail(`${ref.text} adlı nesne bulunamadı.`);
  }
  if (singles.length === 2) return pointDistance(x, singles[0], singles[1]);
  if (singles.length) fail(`${singles.map(p => p.label).join(', ')} bir nokta; uzunluk için iki nokta yazın: “${singles[0].label} ile B arasındaki mesafe”.`);
}

// ---------------------------------------------------------------------------------------------------------------- yarıçap / çap / kiriş / yay / merkez açı

type ArcKind = 'radius' | 'diameter' | 'chord' | 'arcLength' | 'centralAngle';

function arcPart(x: Ctx, o: MathObject, kind: ArcKind) {
  const { scene } = x;
  x.focus.push(o.id);
  if (o.type === 'circle') {
    const r = scene.circleOf(o)!.radius;
    x.out.push(kind === 'radius' ? `${nameOf(o)}: yarıçap = ${br(r)}.` : `${nameOf(o)}: çap = ${br(2 * r)}.`);
    return;
  }
  if (o.type === 'ellipse') {
    const f = kind === 'radius' ? 1 : 2, word = kind === 'radius' ? 'yarıçap' : 'eksen uzunluğu';
    x.out.push(`${nameOf(o)}: yatay ${word} = ${br(f * Math.abs(o.radiusX))}, dikey ${word} = ${br(f * Math.abs(o.radiusY))}.`);
    return;
  }
  const g = arcGeometry(scene, o);
  switch (kind) {
    case 'radius':
      setFlags(scene, o, { showRadius: true });
      x.out.push(`${nameOf(o)}: yarıçap = ${br(g.radius)}.`);
      return;
    case 'diameter':
      x.out.push(`${nameOf(o)}: çap = ${br(2 * g.radius)}.`);
      return;
    case 'chord': {
      setFlags(scene, o, { showChordLength: true });
      const word = Math.abs(g.sweep - Math.PI) < 1e-6 ? 'çap (kiriş)' : 'kiriş';
      x.out.push(`${nameOf(o)}: ${word} = ${br(2 * g.radius * Math.sin(g.sweep / 2))}.`);
      return;
    }
    case 'arcLength':
      setFlags(scene, o, { showArcLength: true });
      x.out.push(`${nameOf(o)}: yay uzunluğu = ${br(g.radius * g.sweep)}.`);
      return;
    case 'centralAngle':
      setFlags(scene, o, { showCentralAngle: true });
      x.out.push(`${nameOf(o)}: merkez açı = ${deg(g.sweep * 180 / Math.PI)}.`);
      return;
  }
}

export function circleParts(x: Ctx) {
  const { scene } = x;
  const kinds = x.kinds.filter((k): k is ArcKind => ['radius', 'diameter', 'chord', 'arcLength', 'centralAngle'].includes(k));
  for (const kind of kinds) {
    if (kind === 'chord' && x.labels.some(r => scene.pointsFromLabel(r.text)?.length === 2 && !scene.resolveLabel(r, ARC_TYPES).some(o => ARC_TYPES.includes(o.type)))) {
      lengths({ ...x, kinds: ['length'] });
      continue;
    }
    const arcOnly = kind === 'chord' || kind === 'arcLength' || kind === 'centralAngle';
    const nf = nounFilter(x.text);
    let types: ObjectType[] = arcOnly ? ARC_TYPES : ['circle', 'arc', 'sector', 'ellipse'];
    if (nf) {
      if (nf.types.includes('sector')) types = ['sector'];
      else if (nf.types.includes('arc')) types = arcOnly ? ARC_TYPES : ['arc'];
      else if (nf.types.includes('circle') && !arcOnly) types = ['circle'];
      else if (nf.types.includes('ellipse') && !arcOnly) types = ['ellipse'];
      else if (nf.types.includes('circle') && kind === 'arcLength') fail('Çemberin tamamının uzunluğu çevresidir: “çemberin çevresini ölç” yazın.');
      else if (nf.types.includes('circle') && kind === 'chord') fail('Çemberde kiriş için kirişin iki ucunu yazın: “AB kirişinin uzunluğu”.');
      else fail(`${capital(nf.noun)} için bu ölçü hesaplanmaz; yay, daire dilimi ya da çember seçin.`);
    }
    const noun = nf?.noun ?? (arcOnly ? 'yay ya da daire dilimi' : 'çember');
    for (const o of pick(x.c, scene, { types, noun, many: wantsMany(x.text, x.labels) })) arcPart(x, o, kind);
  }
}

// ---------------------------------------------------------------------------------------------------------------- denklem / eğim

function squareTerm(v: 'x' | 'y', c: number) {
  return Math.abs(c) < 1e-9 ? `${v}²` : `(${v} ${c > 0 ? '−' : '+'} ${trNum(Math.abs(c))})²`;
}

function equationOf(x: Ctx, o: MathObject) {
  const { scene } = x;
  x.focus.push(o.id);
  switch (o.type) {
    case 'line': case 'segment': case 'ray': {
      const [a, b] = scene.lineOf(o)!;
      if (distance(a, b) < 1e-9) fail(`${nameOf(o)} noktaları çakışık; denklem yazılamaz.`);
      const eq = calculateLineEquation(a, b).equationText;
      if (o.type === 'line') { setFlags(scene, o, { showEquation: true }); x.out.push(`${nameOf(o)}: ${eq}.`); }
      else x.out.push(`${nameOf(o)} üzerinden geçen doğru: ${eq}.`);
      return;
    }
    case 'circle': {
      const g = scene.circleOf(o)!;
      x.out.push(`${nameOf(o)}: ${squareTerm('x', g.center.x)} + ${squareTerm('y', g.center.y)} = ${trNum(g.radius * g.radius)}.`);
      return;
    }
    case 'ellipse': {
      if (o.rotation) fail('Döndürülmüş elipsin denklemini yazamıyorum; yalnızca eksenlere paralel elipsler için denklem verilir.');
      const c = scene.point(o.centerPointId);
      x.out.push(`${nameOf(o)}: ${squareTerm('x', c.x)}/${trNum(o.radiusX * o.radiusX)} + ${squareTerm('y', c.y)}/${trNum(o.radiusY * o.radiusY)} = 1.`);
      return;
    }
    case 'function':
      x.out.push(/=/.test(o.label) ? `Denklem: ${o.label}.` : `${nameOf(o)}: y = ${o.expression}.`);
      return;
    default:
      fail(`${nameOf(o)} için denklem yazılamaz.`);
  }
}

const EQ_ORDER: ObjectType[] = ['line', 'segment', 'ray', 'circle', 'ellipse', 'function'];

export function equations(x: Ctx) {
  if (!x.kinds.includes('equation')) return;
  const { scene } = x;
  if (x.formula) {
    const same = sameFunction(scene, x.formula.expression);
    if (same) x.focus.push(same.id);
    x.out.push(`Denklem: ${x.formula.name} = ${x.formula.expression}.`);
    return;
  }
  const nf = nounFilter(x.text);
  const types = nf ? EQ_ORDER.filter(t => nf.types.includes(t)) : EQ_ORDER;
  if (!types.length) fail(`${capital(nf!.noun)} için denklem yazılamaz; doğru, çember ya da elips seçin.`);
  if (!x.labels.length) {
    for (const o of pick(x.c, scene, { types, noun: nf?.noun ?? 'doğru', filter: nf?.filter, many: wantsMany(x.text, []) })) equationOf(x, o);
    return;
  }
  for (const ref of x.labels) {
    const named = scene.resolveLabel(ref, types).filter(o => types.includes(o.type));
    if (named.length) {
      const first = types.map(t => named.filter(o => o.type === t)).find(list => list.length)!;
      if (first.length > 1) fail(`${ref.text} birden fazla şekli gösteriyor (${first.map(nameOf).join(', ')}). Hangisi olduğunu yazın.`);
      equationOf(x, first[0]);
      continue;
    }
    const pts = scene.pointsFromLabel(ref.text);
    if (pts?.length === 2 && types.some(t => LINEAR.includes(t))) {
      if (distance(pts[0], pts[1]) < 1e-9) fail(`${ref.text} noktaları çakışık; denklem yazılamaz.`);
      x.focus.push(pts[0].id, pts[1].id);
      x.out.push(`${pts[0].label} ve ${pts[1].label} noktalarından geçen doğru: ${calculateLineEquation(pts[0], pts[1]).equationText}.`);
      continue;
    }
    fail(`${ref.text} adlı doğru, çember ya da elips bulunamadı.`);
  }
}

function findSlope(scene: CommandScene, a: string, b: string): MeasurementObject | undefined {
  return scene.objects.find((m): m is MeasurementObject => m.type === 'measurement' && m.kind === 'slope' && m.pointIds.length === 2
    && ((m.pointIds[0] === a && m.pointIds[1] === b) || (m.pointIds[0] === b && m.pointIds[1] === a)));
}

type SlopeSource =
  | { kind: 'points'; a: PointObject; b: PointObject; line?: MathObject }
  | { kind: 'function'; name: string; expression: string; object?: FunctionObject };

const FUNCTION_WORD = /\bfonksiyon|\bgrafi[gk]/;
const compact = (s: string) => s.replace(/\s+/g, '');

function sameFunction(scene: CommandScene, expression: string): FunctionObject | undefined {
  return scene.ofType('function').find(f => compact(f.expression) === compact(expression));
}

/** Odak/seçimdeki ya da sahnedeki tek fonksiyon. required değilse bulunamazsa null. */
function functionSource(x: Ctx, required: boolean): SlopeSource | null {
  const { scene } = x;
  const source = (f: FunctionObject): SlopeSource => ({ kind: 'function', name: f.label, expression: f.expression, object: f });
  const pools = x.c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
  for (const ids of pools) {
    const fns = [...new Set(ids)].map(id => scene.get(id)).filter((o): o is FunctionObject => o?.type === 'function');
    if (fns.length === 1) return source(fns[0]);
    if (fns.length > 1) fail(`Birden fazla fonksiyon seçili (${fns.map(f => f.label).join(', ')}). Eğimini istediğiniz fonksiyonu seçin.`);
  }
  const all = scene.ofType('function');
  if (all.length === 1) return source(all[0]);
  if (all.length > 1) fail(`Birden fazla fonksiyon var (${all.map(f => f.label).join(', ')}). Fonksiyonu seçin ya da denklemini yazın: “y = 2x + 1 doğrusunun eğimi kaç”.`);
  if (required) fail('Önce bir fonksiyon oluşturun (ör. “y = 2x + 1”).');
  return null;
}

function slopeSource(x: Ctx): SlopeSource {
  const { scene } = x;
  const nf = nounFilter(x.text);
  const types: ObjectType[] = nf ? LINEAR.filter(t => nf.types.includes(t)) : [...LINEAR, 'measurement'];
  if (!types.length) fail(`${capital(nf!.noun)} için eğim ölçülmez; doğru ya da iki nokta yazın.`);
  const lineThrough = (a: PointObject, b: PointObject) => {
    const found = scene.shapesWithPoints([a.id, b.id], LINEAR);
    return LINEAR.map(t => found.find(o => o.type === t)).find(Boolean);
  };
  const points = (a: PointObject, b: PointObject, line?: MathObject): SlopeSource => ({ kind: 'points', a, b, line: line ?? lineThrough(a, b) });
  const fromObject = (o: MathObject): SlopeSource => {
    if (o.type === 'measurement') return points(scene.point(o.pointIds[0]), scene.point(o.pointIds[1]));
    const [a, b] = scene.lineOf(o)!;
    return points(a, b, o);
  };
  const isSlope = (o: MathObject) => o.type !== 'measurement' || o.kind === 'slope';
  const refs = x.labels;
  if (!refs.length) {
    // "fonksiyonun eğimi kaç", "eğimini göster" (y = 2x + 1 seçili ya da sahnede doğru yok)
    if (FUNCTION_WORD.test(x.text)) return functionSource(x, true)!;
    const usable = (o: MathObject) => types.includes(o.type) && isSlope(o);
    const inContext = (test: (o: MathObject) => boolean) => [...scene.focus, ...scene.selection].some(id => { const o = scene.get(id); return !!o && test(o); });
    if (!inContext(usable) && (inContext(o => o.type === 'function') || !scene.objects.some(usable))) {
      const fn = functionSource(x, false);
      if (fn) return fn;
    }
    return fromObject(pick(x.c, scene, { types, noun: nf?.noun ?? 'doğru', filter: isSlope })[0]);
  }
  const singles = refs.map(r => onlyPoint(scene, r));
  if (refs.length === 2 && singles.every(Boolean)) return points(singles[0]!, singles[1]!);
  if (refs.length === 1) {
    const pts = scene.pointsFromLabel(refs[0].text);
    if (pts?.length === 2) return points(pts[0], pts[1]);
    const named = scene.resolveLabel(refs[0], types).filter(o => types.includes(o.type) && isSlope(o));
    if (named.length === 1) return fromObject(named[0]);
    if (named.length > 1) fail(`${refs[0].text} birden fazla doğruyu gösteriyor. Hangisi olduğunu yazın.`);
  }
  fail(`Eğim için doğrunun adını ya da iki noktayı yazın: “AB'nin eğimini ölç”.`);
}

/** y = mx + n biçimindeki ifadenin katsayıları (kaydırıcı değerleriyle); doğrusal değilse null. */
function linearCoefficients(scene: CommandScene, expression: string): { m: number; n: number } | null {
  const f = compileMathExpression(expression);
  if (!f) return null;
  const scope = Object.fromEntries(scene.sliders().map(s => [s.variableName, s.value]));
  const xs = [-2.5, -1, 0, 1, 3.5];
  const ys = xs.map(v => f(v, scope));
  if (ys.some(y => !Number.isFinite(y))) return null;
  const n = ys[2], m = ys[3] - ys[2];
  return xs.every((v, i) => Math.abs(ys[i] - (m * v + n)) <= 1e-7 * Math.max(1, Math.abs(ys[i]))) ? { m, n } : null;
}

function functionSlope(x: Ctx, src: Extract<SlopeSource, { kind: 'function' }>) {
  const coef = linearCoefficients(x.scene, src.expression);
  if (!coef) fail(`${src.name} doğrusal bir fonksiyon değil; eğimi her noktada değişir. Tek bir eğim yalnızca y = mx + n biçimindeki doğrular için vardır.`);
  if (src.object) x.focus.push(src.object.id);
  const withAngle = SLOPE_ANGLE.test(x.text);
  const angle = ((Math.atan(coef.m) * 180 / Math.PI) + 180) % 180;
  x.answers.push(withAngle ? angle : coef.m);
  x.out.push(`${src.name}: eğim = ${fmt(coef.m, 4)}${withAngle ? `, eğim açısı (x ekseniyle) = ${deg(angle)}` : ''}.`);
}

export function slopes(x: Ctx) {
  if (!x.kinds.includes('slope')) return;
  const { scene } = x;
  const src: SlopeSource = x.formula
    ? { kind: 'function', name: `${x.formula.name} = ${x.formula.expression}`, expression: x.formula.expression, object: sameFunction(scene, x.formula.expression) }
    : slopeSource(x);
  if (src.kind === 'function') return functionSlope(x, src);
  const { a, b } = src;
  if (a.id === b.id) fail('Eğim için iki farklı nokta gerekir.');
  const m = calculateSlope(a, b);
  const existing = findSlope(scene, a.id, b.id);
  let object: MeasurementObject | undefined = existing;
  if (existing) setFlags(scene, existing, { showValue: true, visible: true });
  else if (!x.it.question) object = scene.addMeasurement('slope', [a.id, b.id]);
  // Doğru (parça/ışın) varsa odakta o kalır: "AB doğrusunun eğimini hesapla ve kırmızı yap" doğruyu boyar, eğim etiketini değil.
  x.focus.push(...(src.line ? [src.line.id] : object ? [object.id] : [a.id, b.id]));
  const text = m === null ? `${a.label}${b.label} eğimi tanımsız (dikey doğru).` : `${a.label}${b.label} eğimi = ${fmt(m, 4)}.`;
  // "eğim açısı", "x ekseniyle yaptığı açı": 0° ≤ α < 180°
  const withAngle = SLOPE_ANGLE.test(x.text);
  const angle = m === null ? 90 : ((Math.atan(m) * 180 / Math.PI) + 180) % 180;
  if (withAngle) x.answers.push(angle);
  else if (m !== null) x.answers.push(m);
  x.out.push(`${text}${withAngle ? ` Eğim açısı (x ekseniyle) = ${deg(angle)}.` : ''}${object && !existing ? ' Eğim tuvale eklendi.' : ''}`);
}

// ---------------------------------------------------------------------------------------------------------------- koordinat

function centerOf(x: Ctx, o: MathObject) {
  const { scene } = x;
  const c = o.type === 'circle' ? scene.circleOf(o)!.center
    : o.type === 'ellipse' || o.type === 'arc' || o.type === 'sector' ? P(scene.point(o.centerPointId)) : fail(`${nameOf(o)} için merkez yok.`);
  x.focus.push(o.id);
  x.out.push(`${nameOf(o)} merkezi: ${coord(c)}.`);
}

export function coordinates(x: Ctx) {
  if (!x.kinds.includes('coordinates')) return;
  const { scene } = x;
  const wantsCenter = /\bmerkez/.test(x.text);
  const CENTER_TYPES: ObjectType[] = ['circle', 'ellipse', 'arc', 'sector'];
  let pts: PointObject[] = [];
  if (x.labels.length) {
    for (const ref of x.labels) {
      if (wantsCenter) {
        const shapes = scene.resolveLabel(ref, CENTER_TYPES).filter(o => CENTER_TYPES.includes(o.type));
        if (shapes.length === 1) { centerOf(x, shapes[0]); continue; }
      }
      const found = scene.pointsFromLabel(ref.text);
      if (!found) fail(`${ref.text} adlı nokta bulunamadı.`);
      pts.push(...found);
    }
  } else if (wantsCenter) {
    const nf = nounFilter(x.text);
    const types = nf ? CENTER_TYPES.filter(t => nf.types.includes(t)) : CENTER_TYPES;
    if (!types.length) fail('Merkez koordinatı için çember, elips, yay ya da daire dilimi yazın.');
    for (const o of pick(x.c, scene, { types, noun: nf?.noun ?? 'çember', many: wantsMany(x.text, []) })) centerOf(x, o);
  } else {
    const pools = x.c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
    for (const ids of pools) {
      const found = ids.map(id => scene.get(id)).filter((o): o is PointObject => o?.type === 'point');
      if (found.length) { pts = found; break; }
    }
    if (!pts.length) fail('Hangi noktanın koordinatları? Adıyla yazın: “A noktasının koordinatları nedir”.');
  }
  if (!pts.length) return;
  const unique = [...new Map(pts.map(p => [p.id, p])).values()];
  if (/\bgoster|\bgorunur/.test(x.text)) for (const p of unique) if (!p.showLabel || !p.visible) setFlags(scene, p, { showLabel: true, visible: true });
  x.focus.push(...unique.map(p => p.id));
  // "B'nin apsisi", "C noktasının y koordinatı": yalnızca istenen bileşen
  const wantsX = /\ba[bp]sis|\bx koordinat/.test(x.text), wantsY = /\bordinat|\by koordinat/.test(x.text);
  if (wantsX !== wantsY) {
    for (const p of unique) x.answers.push(wantsX ? p.x : p.y);
    x.out.push(`${unique.map(p => `${p.label}${coord(p)}: ${wantsX ? 'apsis (x)' : 'ordinat (y)'} = ${trNum(wantsX ? p.x : p.y)}`).join(', ')}.`);
    return;
  }
  x.out.push(`${unique.map(p => `${p.label}${coord(p)}`).join(', ')}.`);
}

// ---------------------------------------------------------------------------------------------------------------- köşegen

/** Köşegen uzunluğu: çizili parça varsa uzunluğu gösterilir; yoksa ölç/göster ölçüm parçası çizer, soru yalnızca yanıtlar. */
function diagonalLength(x: Ctx, a: PointObject, b: PointObject): string {
  const { scene } = x;
  const d = distance(a, b);
  x.answers.push(d);
  const segment = scene.shapesWithPoints([a.id, b.id], ['segment'])[0];
  if (segment) { setFlags(scene, segment, { showLength: true }); x.focus.push(segment.id); }
  else if (x.it.showOrMeasure) {
    const s = scene.addSegment(a.id, b.id, { label: `|${a.label}${b.label}|`, color: '#059669', thickness: 3, unit: 'br', showLength: true });
    x.focus.push(s.id);
  }
  return `|${a.label}${b.label}| = ${br(d)}`;
}

export function diagonals(x: Ctx) {
  if (!x.kinds.includes('diagonal')) return;
  const { scene } = x;
  const nf = nounFilter(x.text);
  if (nf && !nf.types.includes('polygon')) fail(`${capital(nf.noun)} için köşegen yoktur; köşegen dörtgen ve çokgenlerde ölçülür.`);
  const polygons: PolygonObject[] = [];
  const named: PointObject[][] = [];
  for (const ref of x.labels) {
    const own = scene.resolveLabel(ref, ['polygon']).filter((o): o is PolygonObject => o.type === 'polygon');
    if (own.length) { polygons.push(...own); continue; }
    const pts = scene.pointsFromLabel(ref.text);
    if (pts?.length === 2) { named.push(pts); continue; }
    fail(`${ref.text} adlı çokgen ya da köşegen bulunamadı.`);
  }
  if (!polygons.length && named.length) {
    const owners = scene.ofType('polygon').filter(p => (!nf?.filter || nf.filter(p))
      && named.every(([a, b]) => p.pointIds.includes(a.id) && p.pointIds.includes(b.id) && edgeIndex(p, a.id, b.id) < 0));
    if (owners.length !== 1) {
      const parts = named.map(([a, b]) => diagonalLength(x, a, b));
      if (!x.focus.length) x.focus.push(...named.flat().map(p => p.id));
      x.out.push(`${parts.join(', ')}.`);
      return;
    }
    polygons.push(owners[0]);
  }
  if (!polygons.length) polygons.push(...pick(x.c, scene, { types: ['polygon'], noun: nf?.noun ?? 'çokgen', filter: nf?.filter, many: wantsMany(x.text, []) }) as PolygonObject[]);
  for (const polygon of polygons) {
    const n = polygon.pointIds.length;
    if (n < 4) fail(`${polygon.label} bir üçgen; üçgenin köşegeni yoktur. Köşegen dörtgen ve çokgenlerde ölçülür.`);
    const before = x.focus.length;
    const parts: string[] = [];
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const a = scene.point(polygon.pointIds[i]), b = scene.point(polygon.pointIds[j]);
      if (named.length && !named.some(([p, q]) => new Set([p.id, q.id, a.id, b.id]).size === 2)) continue;
      parts.push(diagonalLength(x, a, b));
    }
    if (!parts.length) fail(`${named.map(pointNames).join(', ')}, ${polygon.label} çokgeninin köşegeni değil.`);
    if (x.focus.length === before) x.focus.push(polygon.id);
    x.out.push(`${polygon.label} köşegen${parts.length > 1 ? 'leri' : 'i'}: ${parts.join(', ')}.`);
  }
}

// ---------------------------------------------------------------------------------------------------------------- tüm ölçüler

export function allMeasures(x: Ctx) {
  const { scene } = x;
  const nf = nounFilter(x.text);
  const targets = pick(x.c, scene, { types: nf?.types ?? ALL_TYPES, noun: nf?.noun ?? 'şekil', filter: nf?.filter, many: wantsMany(x.text, x.labels) });
  for (const o of targets) {
    const parts: string[] = [];
    x.focus.push(o.id);
    switch (o.type) {
      case 'polygon': {
        const n = o.pointIds.length;
        setFlags(scene, o, { showArea: true, showPerimeter: true, edgeLabels: o.pointIds.map((_, i) => i) });
        parts.push(`alan = ${br2(areaOf(scene, o)!)}`, `çevre = ${br(perimeterOf(scene, o)!)}`);
        o.pointIds.forEach((id, i) => { const a = scene.point(id), b = scene.point(o.pointIds[(i + 1) % n]); parts.push(`|${a.label}${b.label}| = ${br(distance(a, b))}`); });
        break;
      }
      case 'circle': case 'ellipse':
        setFlags(scene, o, { showArea: true, showPerimeter: true });
        parts.push(`alan = ${br2(areaOf(scene, o)!)}`, `çevre = ${br(perimeterOf(scene, o)!)}`);
        if (o.type === 'circle') parts.push(`yarıçap = ${br(scene.circleOf(o)!.radius)}`);
        break;
      case 'sector': case 'arc': {
        const g = arcGeometry(scene, o);
        if (o.type === 'sector') {
          setFlags(scene, o, { showArea: true, showPerimeter: true, showArcLength: true, showRadius: true, showCentralAngle: true });
          parts.push(`alan = ${br2(areaOf(scene, o)!)}`, `çevre = ${br(perimeterOf(scene, o)!)}`);
        } else {
          setFlags(scene, o, { showArcLength: true, showRadius: true, showChordLength: true, showCentralAngle: true });
          parts.push(`kiriş = ${br(2 * g.radius * Math.sin(g.sweep / 2))}`);
        }
        parts.push(`yay uzunluğu = ${br(g.radius * g.sweep)}`, `yarıçap = ${br(g.radius)}`, `merkez açı = ${deg(g.sweep * 180 / Math.PI)}`);
        break;
      }
      case 'segment': case 'ray': case 'line': {
        const [a, b] = scene.lineOf(o)!;
        setFlags(scene, o, o.type === 'line' ? { showLength: true, showEquation: true } : { showLength: true });
        parts.push(`|${a.label}${b.label}| = ${br(distance(a, b))}`);
        if (o.type === 'line' && distance(a, b) > 1e-9) parts.push(calculateLineEquation(a, b).equationText);
        break;
      }
      case 'angle': {
        const a = o as AngleObject;
        setFlags(scene, o, { showValue: true });
        const inner = calculateAngleDegrees(scene.point(a.point1Id), scene.point(a.vertexPointId), scene.point(a.point3Id));
        parts.push(`değer = ${deg(a.reflex ? 360 - inner : inner)}`);
        break;
      }
      case 'measurement': {
        setFlags(scene, o, { showValue: true });
        const yay = o.kind === 'arc' && o.circleId ? resolveArc({ circleId: o.circleId, pointIds: o.pointIds, throughPointId: o.throughPointId, major: o.major }, scene.objects) : null;
        if (yay) parts.push(`uzunluk = ${br(yay.length)}`, `ölçü = ${deg(yay.degrees)}`);
        else parts.push('değer gösterildi');
        break;
      }
      default:
        fail(`${nameOf(o)} için ölçü yok.`);
    }
    x.out.push(`${nameOf(o)}: ${parts.join(', ')}.`);
  }
}

// ---------------------------------------------------------------------------------------------------------------- gizleme

const HIDE_WORD: Record<string, string> = {
  area: 'alan', perimeter: 'çevre', length: 'uzunluk', edges: 'kenar uzunlukları', diagonal: 'köşegen uzunlukları', arcLength: 'yay uzunluğu', radius: 'yarıçap', chord: 'kiriş uzunluğu',
  centralAngle: 'merkez açı', equation: 'denklem', slope: 'eğim', trig: 'trigonometrik oranlar', angle: 'açı değeri', all: 'ölçüler',
};

/** Şeklin noktalarını kullanan açı ve ölçüm etiketleri (şekille birlikte gizlenir). */
function attachedLabels(scene: CommandScene, o: MathObject): MathObject[] {
  const ids = new Set(scene.definingPointIds(o));
  if (!ids.size) return [];
  // Yay ölçümü çembere aittir; aynı iki noktayı kullanan çokgenle birlikte gizlenmez.
  return scene.objects.filter(a => a.id !== o.id && (a.type === 'angle' || (a.type === 'measurement' && a.kind !== 'arc')) && scene.definingPointIds(a).every(id => ids.has(id)));
}

export function hideMeasures(x: Ctx) {
  const { scene } = x;
  const nf = nounFilter(x.text);
  const many = wantsMany(x.text, x.labels);
  const targets = (types: ObjectType[], noun: string, filter?: (o: MathObject) => boolean, labels?: LabelRef[]) => {
    const allowed = nf ? types.filter(t => nf.types.includes(t)) : types;
    if (!allowed.length) fail(`${capital(nf!.noun)} için bu ölçü yok.`);
    return pick(x.c, scene, { types: allowed, noun: nf?.noun ?? noun, filter: o => (!nf?.filter || nf.filter(o)) && (!filter || filter(o)), many, labels });
  };
  const hide = (o: MathObject, patch: Record<string, unknown>) => { setFlags(scene, o, patch); x.focus.push(o.id); };
  const done: string[] = [];

  for (const kind of x.kinds) {
    const before = x.focus.length;
    switch (kind) {
      case 'area': for (const o of targets(AREA_TYPES, 'şekil')) hide(o, { showArea: false }); break;
      case 'perimeter': for (const o of targets(AREA_TYPES, 'şekil')) hide(o, { showPerimeter: false }); break;
      case 'edges': case 'length': {
        const pair = x.labels.length === 1 ? scene.pointsFromLabel(x.labels[0].text) : null;
        const segment = pair?.length === 2 ? scene.shapesWithPoints([pair[0].id, pair[1].id], LINEAR)[0] : undefined;
        if (pair?.length === 2 && !(segment && kind === 'length')) {
          const owner = edgeOwner(x, pair[0], pair[1], undefined, nf?.filter);
          if (owner) { hide(owner, { edgeLabels: (owner.edgeLabels ?? []).filter(i => i !== edgeIndex(owner, pair[0].id, pair[1].id)) }); break; }
        }
        const types: ObjectType[] = kind === 'edges' ? ['polygon'] : [...LINEAR, 'polygon', 'arc', 'sector'];
        for (const o of targets(types, kind === 'edges' ? 'çokgen' : 'şekil')) {
          if (o.type === 'polygon') hide(o, { edgeLabels: [] });
          else if (o.type === 'arc' || o.type === 'sector') hide(o, { showArcLength: false });
          else hide(o, { showLength: false });
        }
        break;
      }
      case 'diagonal':
        for (const p of targets(['polygon'], 'çokgen') as PolygonObject[]) {
          const diagonal = scene.ofType('segment').filter(s => p.pointIds.includes(s.startPointId) && p.pointIds.includes(s.endPointId) && edgeIndex(p, s.startPointId, s.endPointId) < 0);
          for (const s of diagonal) hide(s, { showLength: false });
        }
        break;
      case 'arcLength': for (const o of targets(ARC_TYPES, 'yay')) hide(o, { showArcLength: false }); break;
      case 'radius': for (const o of targets(ARC_TYPES, 'yay')) hide(o, { showRadius: false }); break;
      case 'chord': for (const o of targets(ARC_TYPES, 'yay')) hide(o, { showChordLength: false }); break;
      case 'centralAngle': for (const o of targets(ARC_TYPES, 'yay')) hide(o, { showCentralAngle: false }); break;
      case 'equation': for (const o of targets(['line'], 'doğru')) hide(o, { showEquation: false }); break;
      case 'slope': case 'trig': {
        const measurement = kind === 'slope' ? 'slope' : 'trig';
        for (const o of pick(x.c, scene, { types: ['measurement'], noun: kind === 'slope' ? 'eğim ölçümü' : 'trigonometrik oran ölçümü', filter: m => m.type === 'measurement' && m.kind === measurement, many: many || !x.labels.length && scene.objects.filter(m => m.type === 'measurement' && m.kind === measurement).length > 0 && !hasContext(x, ['measurement']) })) hide(o, { showValue: false });
        break;
      }
      case 'angle': {
        const found: AngleObject[] = [];
        for (const ref of x.labels) {
          const direct = scene.resolveLabel(ref, ['angle']).filter((o): o is AngleObject => o.type === 'angle');
          const vertex = onlyPoint(scene, ref);
          const polygon = scene.resolveLabel(ref, ['polygon'])[0] as PolygonObject | undefined;
          const list = direct.length ? direct
            : vertex ? scene.ofType('angle').filter(a => a.vertexPointId === vertex.id)
            : polygon ? scene.ofType('angle').filter(a => polygon.pointIds.includes(a.vertexPointId) && polygon.pointIds.includes(a.point1Id) && polygon.pointIds.includes(a.point3Id)) : [];
          if (!list.length) fail(`${ref.text} için gösterilen bir açı bulunamadı.`);
          found.push(...list);
        }
        const list = x.labels.length ? found : targets(['angle'], 'açı') as AngleObject[];
        for (const a of new Set(list)) hide(a, { showValue: false });
        break;
      }
      case 'all': {
        const direct = x.labels.length || nf || x.c.refersToSelection || x.c.refersToLast || hasContext(x, ALL_TYPES) || /\bolculerini|\bolcusunu|\bolcumlerini/.test(x.text);
        if (!direct) skip(`Hangi nesnenin ölçülerini gizleyeyim? Adıyla yazın: “ABC'nin ölçülerini gizle”. Hepsi için “tüm ölçümleri gizle” yazın.`);
        for (const o of targets(ALL_TYPES, 'şekil')) {
          const off: Record<string, unknown> = {
            polygon: { showArea: false, showPerimeter: false, edgeLabels: [] },
            circle: { showArea: false, showPerimeter: false }, ellipse: { showArea: false, showPerimeter: false },
            sector: { showArea: false, showPerimeter: false, showArcLength: false, showRadius: false, showChordLength: false, showCentralAngle: false },
            arc: { showArcLength: false, showRadius: false, showChordLength: false, showCentralAngle: false },
            segment: { showLength: false }, ray: { showLength: false }, line: { showLength: false, showEquation: false },
            angle: { showValue: false }, measurement: { showValue: false },
          }[o.type as string] ?? {};
          hide(o, off as Record<string, unknown>);
          for (const label of attachedLabels(scene, o)) setFlags(scene, label, { showValue: false });
        }
        break;
      }
      default: break;
    }
    if (x.focus.length > before) done.push(HIDE_WORD[kind] ?? kind);
  }
  if (!done.length) fail(`Gizlenecek ölçüyü belirtin: “ABC'nin alanını gizle”.`);
  const names = [...new Set(x.focus.map(id => scene.get(id)).filter((o): o is MathObject => !!o).map(nameOf))];
  x.out.push(`${names.join(', ')}: ${done.join(', ')} gizlendi.`);
}
