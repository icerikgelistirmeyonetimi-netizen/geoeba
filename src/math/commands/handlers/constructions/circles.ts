import type { CircleObject, MathObject, PointObject } from '@/types/math';
import type { CommandHandler } from '../../types';
import { calculateCircumcircle } from '../../../geometry';
import { COLORS, fail, trNum } from '../../scene';
import { type Ref, coord, requireKnownRefs, isPointRef, joinTr, lineFromRef, named, newPointNames, pointFromRef, refPoints, refsOf } from './refs';
import { INNER_TANGENT, MEASURE_NOUN, MEETING, MEETING_AS_SOURCE, applyClauseColor, focusedPoint, foreignVerb, polygonOf, triangleOf } from './common';
import { distanceToLine, ensureFoot } from './build';
import { ensureCenter } from './points';

const sameSet = (x: string[], y: string[]) => x.length === y.length && x.every(id => y.includes(id));

// ---------------------------------------------------------------------------------------------- noktadan teğet

const TANGENT = /\bte[gy]et/;
/** "teğet çember", "teğet olan bir çember", "teğet olan A merkezli çember" */
const TANGENT_CIRCLE = /\bte[gy]et (?:olan |bir |(?:\$\d+|[a-z]+) merkezli )*(?:cember|daire)(?!\s*(?:e|ye|ne|sine)\b)/;
const INCIRCLE = new RegExp(`(?:${INNER_TANGENT.source}) (?:olan |bir )*(?:cember|daire)`);
const INCENTER = new RegExp(`(?:${INNER_TANGENT.source}) (?:cember(?:in)? |dairenin )?merkez(?:i|ini|inin)?\\b`);

export const tangent: CommandHandler = {
  id: 'constructions.tangent',
  examples: [
    'P noktasından çembere teğet doğru çiz',
    "P'den çembere teğetleri çiz",
    'T noktasında çembere teğet çiz',
    'c1 çemberine Q noktasından teğet çiz',
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN) || !c.has(TANGENT)) return 0;
    if (c.has(INNER_TANGENT) || c.has(TANGENT_CIRCLE)) return 0;
    // "teğet ile c1'in kesişimi": kesişim işi
    if (c.has(MEETING) && !c.has(MEETING_AS_SOURCE)) return 0;
    return 72;
  },
  run(c, scene) {
    if (c.has(/\bortak te[gy]et/)) fail('İki çemberin ortak teğeti henüz desteklenmiyor. Bir noktadan teğet için “P noktasından çembere teğet çiz” yazın.');
    const refs = refsOf(c);
    requireKnownRefs(scene, refs);
    const circleOfRef = (r: Ref) => r.label ? scene.resolveLabel(r.label, ['circle', 'arc', 'sector']).filter(o => r.role !== 'from' && r.role !== 'at' || r.noun === 'circle') : [];
    const pointRefs = refs.filter(r => isPointRef(scene, r) && r.role !== 'li' && !(r.noun === 'circle'));
    const sourceRefs = pointRefs.filter(r => r.role === 'from' || r.role === 'at' || r.through);
    const circleRefs = refs.filter(r => !sourceRefs.includes(r) && (r.role === 'li' || r.role === 'to' || r.noun === 'circle' || !isPointRef(scene, r)) && circleOfRef(r).length);

    let circle: MathObject;
    if (circleRefs.length) {
      const found = [...new Set(circleRefs.flatMap(circleOfRef))];
      if (found.length > 1) fail(`Birden fazla çember eşleşti (${joinTr(found.map(o => o.label))}). Hangisi olduğunu belirtin.`);
      circle = found[0];
    } else {
      const circles = scene.ofType('circle');
      if (!circles.length) fail(scene.ofType('arc', 'sector').length ? 'Teğet şimdilik yalnızca çemberlere çizilebilir.' : 'Önce bir çember oluşturun.');
      circle = scene.target(c, { types: ['circle'], noun: 'çember', labels: [] });
    }
    if (circle.type !== 'circle') fail('Teğet şimdilik yalnızca çemberlere çizilebilir (yay ve daire dilimine değil).');

    let sources: PointObject[] = (sourceRefs.length ? sourceRefs : pointRefs.filter(r => !circleRefs.includes(r)).slice(0, 1)).map(r => pointFromRef(scene, r).point);
    if (!sources.length) {
      const focused = focusedPoint(scene);
      if (!focused) fail('Teğetin hangi noktadan çizileceğini yazın (ör. “P noktasından çembere teğet doğru çiz”).');
      sources = [focused];
    }
    const { center, radius } = scene.circleOf(circle)!;
    const focus: string[] = [];
    for (const p of sources) {
      const d2 = (p.x - center.x) ** 2 + (p.y - center.y) ** 2;
      if (d2 < radius * radius - 1e-8) fail(`${p.label} noktası çemberin içinde; içerideki bir noktadan teğet çizilemez. Çemberin dışında ya da üzerinde bir nokta yazın.`);
      const onCircle = Math.abs(d2 - radius * radius) <= 1e-7;
      const branches: (1 | -1)[] = onCircle ? [1] : [-1, 1];
      const contacts: PointObject[] = [];
      for (const branch of branches) {
        let q = scene.points().find(x => x.construction?.kind === 'tangent' && x.construction.circleId === circle.id
          && x.construction.sourceId === p.id && x.construction.branch === branch && !!x.construction.direction === onCircle);
        const existingLine = q && scene.ofType('line').find(l => sameSet([l.point1Id, l.point2Id], [p.id, q!.id]));
        if (q && existingLine) { focus.push(existingLine.id); contacts.push(q); continue; }
        q ??= scene.addPoint(p, { color: COLORS.construction, construction: { kind: 'tangent', circleId: circle.id, sourceId: p.id, branch, ...(onCircle ? { direction: true } : {}) } });
        const line = scene.addLine(p.id, q.id, { label: `Teğet: ${p.label}${q.label}`, color: COLORS.construction, showEquation: false, reuse: false });
        focus.push(line.id);
        contacts.push(q);
      }
      scene.say(onCircle
        ? `${p.label} noktası çemberin üzerinde; bu noktada çembere teğet doğru çizildi.`
        : `${p.label} noktasından çembere 2 teğet çizildi; değme noktaları ${joinTr(contacts.map(named))}.`);
    }
    applyClauseColor(c, scene);
    scene.setFocus(focus);
  },
};

// ---------------------------------------------------------------------------------------------- çevrel çember

export const circumcircle: CommandHandler = {
  id: 'constructions.circumcircle',
  examples: [
    "ABC'nin çevrel çemberini çiz",
    'üçgenin çevrel çemberini merkeziyle birlikte çiz',
    'karenin çevrel çemberini çiz',
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN) || !c.has(/\bcevrel (?:cember|daire)/)) return 0;
    if (c.has(/\bcevrel (?:cember(?:in)? |dairenin )?merkez(?:i|ini|inin)?\b/)) return 0;
    return 72;
  },
  run(c, scene) {
    const refs = refsOf(c);
    const tri = triangleOf(c, scene, refs);
    let ids: string[];
    let name: string;
    if (tri) ({ ids, name } = tri);
    else {
      const polygon = polygonOf(c, scene, refs, { noun: 'üçgen ya da çokgen' });
      ids = polygon.pointIds;
      name = polygon.label;
    }
    const pts = ids.map(id => scene.point(id));
    const geometry = calculateCircumcircle(pts[0], pts[1], pts[2]);
    if (!geometry) fail('Köşeler aynı doğru üzerinde; çevrel çember çizilemez.');
    if (pts.slice(3).some(p => Math.abs(Math.hypot(p.x - geometry.center.x, p.y - geometry.center.y) - geometry.radius) > 1e-6)) {
      fail(`${name} çokgeninin köşeleri aynı çember üzerinde değil; çevrel çemberi yok.`);
    }
    const through = ids.slice(0, 3) as [string, string, string];
    const existing = scene.ofType('circle').find(o => o.throughPointIds?.length === 3 && sameSet(o.throughPointIds, through));
    const circle = existing ?? scene.addCircle({ throughIds: through }, { label: `${name} Çevrel Çemberi` });
    scene.say(`${name} ${existing ? 'çevrel çemberi zaten var' : 'çevrel çemberi çizildi'} (merkez ${coord(geometry.center)}, r = ${trNum(geometry.radius)}).`);
    const focus = [circle.id];
    if (c.has(/\bmerkez/) && ids.length === 3) {
      const names = newPointNames(scene, refs);
      const { point } = ensureCenter(scene, through, 'circumcenter', names[0]);
      focus.push(point.id);
      scene.say(`Merkez: ${named(point)}.`);
    }
    applyClauseColor(c, scene);
    scene.setFocus(focus);
  },
};

// ---------------------------------------------------------------------------------------------- iç teğet çember

export const incircle: CommandHandler = {
  id: 'constructions.incircle',
  examples: [
    'iç teğet çemberini çiz',
    'ABC üçgeninin iç teğet çemberini çiz',
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN)) return 0;
    // "üçgenin dış teğet çemberi" teoremler ailesinde (teoremler.disTegetCember) çizilir.
    if (!c.has(INCIRCLE) || c.has(INCENTER)) return 0;
    return 73;
  },
  run(c, scene) {
    const refs = refsOf(c);
    const tri = triangleOf(c, scene, refs, { required: true })!;
    const names = newPointNames(scene, refs);
    const center = ensureCenter(scene, tri.ids, 'incenter', names[0]).point;
    const existing = scene.ofType('circle').find(o => o.centerPointId === center.id && o.radiusPointId && scene.get(o.radiusPointId)?.type === 'point'
      && (scene.point(o.radiusPointId).construction?.kind === 'foot'));
    let circle: CircleObject;
    if (existing) circle = existing;
    else {
      const foot = ensureFoot(scene, center.id, [tri.ids[0], tri.ids[1]], { hidden: true }).object;
      circle = scene.addCircle({ centerId: center.id, radiusPointId: foot.id }, { label: `${tri.name} İç Teğet Çemberi`, fillOpacity: 0, showArea: false, showPerimeter: false });
    }
    const { radius } = scene.circleOf(circle)!;
    scene.say(`${tri.name} üçgeninin iç teğet çemberi ${existing ? 'zaten var' : 'çizildi'} (merkez ${named(center)}, r = ${trNum(radius)}).`);
    applyClauseColor(c, scene);
    scene.setFocus([circle.id]);
  },
};

// ---------------------------------------------------------------------------------------------- doğruya teğet çember

export const tangentCircle: CommandHandler = {
  id: 'constructions.tangentCircle',
  examples: [
    'A merkezli BC doğrusuna teğet çember çiz',
    "merkezi K olan ve AB'ye teğet olan çemberi çiz",
  ],
  match(c) {
    if (foreignVerb(c) || c.has(MEASURE_NOUN) || !c.has(TANGENT_CIRCLE) || c.has(INNER_TANGENT)) return 0;
    return c.labels.length >= 2 ? 72 : 0;
  },
  run(c, scene) {
    const refs = refsOf(c);
    const centerRef = refs.find(r => r.role === 'li' && isPointRef(scene, r))
      ?? refs.find(r => r.label && isPointRef(scene, r) && /^merkez/.test(c.words[r.pos - 1] ?? ''));
    if (!centerRef) fail('Çemberin merkezini yazın (ör. “A merkezli BC doğrusuna teğet çember çiz”).');
    const lineRef = refs.filter(r => r !== centerRef && !isPointRef(scene, r)).map(r => lineFromRef(scene, r)).find(Boolean);
    if (!lineRef) {
      if (refs.some(r => r.label && scene.resolveLabel(r.label, ['circle']).length)) fail('Çembere teğet çember henüz desteklenmiyor; doğruya teğet çember çizebilirim.');
      fail('Çemberin hangi doğruya teğet olacağını yazın (ör. “A merkezli BC doğrusuna teğet çember çiz”).');
    }
    const center = pointFromRef(scene, centerRef).point;
    if (refPoints(scene, centerRef)?.length !== 1 && centerRef.kind !== 'coord') fail('Merkez tek bir nokta olmalı.');
    if (distanceToLine(center, lineRef.a, lineRef.b) < 1e-9) fail(`${center.label} noktası ${lineRef.name} doğrusu üzerinde; yarıçap sıfır olur.`);
    const foot = ensureFoot(scene, center.id, [lineRef.a.id, lineRef.b.id], { hidden: true }).object;
    const circle = scene.addCircle({ centerId: center.id, radiusPointId: foot.id }, { label: `${center.label} Merkezli Teğet Çember`, fillOpacity: 0, showArea: false, showPerimeter: false });
    scene.say(`${center.label} merkezli, ${lineRef.name} doğrusuna teğet çember çizildi (r = ${trNum(Math.hypot(center.x - foot.x, center.y - foot.y))}).`);
    applyClauseColor(c, scene);
    scene.setFocus([circle.id]);
  },
};
