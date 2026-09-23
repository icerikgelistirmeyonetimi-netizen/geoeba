import type { Point2D, PointObject, PolygonObject } from '@/types/math';
import { aci, olcuMetni } from '@/math/matematikYazimi';
import type { Clause } from '../../text';
import { type CommandScene, fail, trNum } from '../../scene';
import type { CommandHandler } from '../../types';
import {
  ANGLE_NOUN, FOREIGN_EXCEPT_SHAPES, type Ref, STRICT_CREATE, type Scan, add, angleDegrees, assertNumbersUsed, creationCount, repeatCreate, creationColor, existingOf, expandRefs, foreignVerb, hasLengthBars,
  isFree, labelParts, materialize, placeGroup, pointsNote, polar, scan,
} from './shared';

const DEG = Math.PI / 180;
const POLYGON_NOUN = /\b(?:ucgen|kare|dikdortgen|cokgen|dortgen|paralelkenar|yamuk|deltoid|besgen|altigen)/;

/** Ölçüsü yazılmayan açı türleri ("geniş bir açı" da). */
const KINDS: [RegExp, number, string][] = [
  [/\bdik (?:bir )?aci/, 90, 'dik açı'],
  [/\bdar (?:bir )?aci/, 45, 'dar açı'],
  [/\bgenis (?:bir )?aci/, 120, 'geniş açı'],
  [/\bdogru aci/, 180, 'doğru açı'],
];

const VERTEX_AFTER = /^(?:kose|koseli|kosesi|kosesinde|kosesindeki|tepe|tepeli|tepesi|noktasinda|noktasindaki|kose noktasi|kose noktali)\b/;
const VERTEX_BEFORE = /\b(?:kosesi|tepe noktasi|kose noktasi|tepesi)$/;

function rotateAround(p: Point2D, center: Point2D, degrees: number): Point2D {
  const r = degrees * DEG, dx = p.x - center.x, dy = p.y - center.y;
  return { x: center.x + dx * Math.cos(r) - dy * Math.sin(r), y: center.y + dx * Math.sin(r) + dy * Math.cos(r) };
}

/** Var olan köşede iki kol noktası da boş kalacak şekilde ilk kolun yönü (radyan). */
function freeStart(scene: CommandScene, v: Point2D, arm: number, sweepRadians: number): number {
  for (const base of [0, 90, 180, 270, 45, 135, 225, 315]) {
    const a = base * DEG;
    if (isFree(scene, add(v, polar(arm, a))) && isFree(scene, add(v, polar(arm, a + sweepRadians)))) return a;
  }
  return 0;
}

function armLength(c: Clause, s: Scan): number | undefined {
  const m = s.text.match(/\bkol\w* (?:uzunlugu )?(?:= |: )?(#\d+)/) ?? s.text.match(/(#\d+) (?:birim |br |cm )?kollu/);
  if (!m) return undefined;
  const value = c.num(m[1]);
  if (!(value > 0 && value <= 1000)) fail('Açının kol uzunluğu 0’dan büyük olmalı.');
  return value;
}

/** Çokgenin v köşesindeki iç açının kolları (içbükey köşede reflex). */
function polygonCorner(scene: CommandScene, polygon: PolygonObject, v: PointObject): { p1: PointObject; p3: PointObject; reflex: boolean } {
  const ids = polygon.pointIds, i = ids.indexOf(v.id), n = ids.length;
  const prev = scene.point(ids[(i - 1 + n) % n]), next = scene.point(ids[(i + 1) % n]);
  const pts = scene.vertices(polygon);
  const area = pts.reduce((sum, p, k) => sum + p.x * pts[(k + 1) % n].y - pts[(k + 1) % n].x * p.y, 0);
  const cross = (v.x - prev.x) * (next.y - v.y) - (v.y - prev.y) * (next.x - v.x);
  return { p1: prev, p3: next, reflex: area * cross < 0 };
}

/** Çokgen köşesinde ya da iki parçanın ortak ucunda duran açının kolları. */
function vertexNeighbours(scene: CommandScene, v: PointObject): { p1: PointObject; p3: PointObject; reflex: boolean } {
  const polygons = scene.ofType('polygon').filter(p => p.pointIds.includes(v.id));
  if (polygons.length > 1) fail(`${v.label} köşesi birden fazla çokgende. Açıyı üç harfle yazın (ör. “A${v.label}C açısını çiz”).`);
  if (polygons.length === 1) return polygonCorner(scene, polygons[0], v);
  const others = new Set<string>();
  for (const o of scene.ofType('segment', 'line', 'ray')) {
    const [a, b] = scene.lineOf(o)!;
    if (a.id === v.id) others.add(b.id);
    else if (b.id === v.id) others.add(a.id);
  }
  if (others.size === 2) {
    const [p1, p3] = [...others].map(id => scene.point(id));
    return { p1, p3, reflex: false };
  }
  return fail(`${v.label} köşesindeki açının kollarını belirleyemedim. Açıyı üç nokta adıyla yazın (ör. “A${v.label}C açısını çiz”) ya da ölçüsünü verin (“${v.label} köşeli 45 derecelik açı”).`);
}

function finish(scene: CommandScene, p1: PointObject, v: PointObject, p3: PointObject, o: { reflex?: boolean; arms?: boolean; note?: string; color?: string }) {
  const createdBefore = new Set(scene.clauseCreated);
  const angle = scene.addAngle(p1.id, v.id, p3.id, { withArms: o.arms ?? true, reflex: o.reflex, color: o.color });
  const inner = angleDegrees(scene.pos(p1.id), scene.pos(v.id), scene.pos(p3.id));
  const value = o.reflex ? 360 - inner : inner;
  scene.setFocus([angle.id]);
  const isNew = !createdBefore.has(angle.id) && scene.clauseCreated.includes(angle.id);
  const label = angle.type === 'angle' ? angle.label : `${angle.label} merkez açısı`;
  // Ölçü MEB yazımıyla: m(∠ABC) = 60° (yay/dilim merkez açısında şeklin adı kalır).
  const olcu = angle.type === 'angle'
    ? olcuMetni(aci(p1, v, p3, value, { basamak: 1, disAci: o.reflex }))
    : `${label} = ${trNum(value, 1)}°`;
  const head = isNew ? `${olcu} açısı çizildi.` : `${label} zaten vardı; ölçüsü gösteriliyor (${trNum(value, 1)}°).`;
  scene.say(`${head}${pointsNote(scene)}${o.note ? ` ${o.note}` : ''}`);
}

/** "ABC üçgeninin tüm açılarını çiz", "karenin iç açılarını oluştur" (yalnızca açık oluşturma fiiliyle). */
function allCorners(c: Clause, scene: CommandScene): boolean {
  const t = c.text;
  if (!/\bacilar/.test(t) || /\b(?:dis|merkez|yansima) aci/.test(t) || !STRICT_CREATE.test(t)) return false;
  return POLYGON_NOUN.test(t) || c.labels.some(l => scene.resolveLabel(l, ['polygon']).length > 0);
}

/** Çokgenin her köşesine iç açı (kol çizilmez; varsa yinelenmez). */
function drawAllCorners(c: Clause, scene: CommandScene) {
  const polygon = scene.target(c, { types: ['polygon'], noun: 'çokgen' }) as PolygonObject;
  const color = creationColor(c);
  const ids: string[] = [];
  const parts: string[] = [];
  for (const id of polygon.pointIds) {
    const v = scene.point(id);
    const { p1, p3, reflex } = polygonCorner(scene, polygon, v);
    const angle = scene.addAngle(p1.id, v.id, p3.id, { withArms: false, reflex: reflex || undefined, color });
    const inner = angleDegrees(p1, v, p3);
    ids.push(angle.id);
    parts.push(angle.type === 'angle'
      ? olcuMetni(aci(p1, v, p3, reflex ? 360 - inner : inner, { basamak: 1, disAci: reflex }))
      : `${angle.label} merkez açısı = ${trNum(reflex ? 360 - inner : inner, 1)}°`);
  }
  const n = polygon.pointIds.length;
  scene.setFocus(ids);
  scene.say(`${polygon.label} ${n === 3 ? 'üçgeninin' : n === 4 ? 'dörtgeninin' : 'çokgeninin'} ${n} açısı çizildi: ${parts.join(', ')}.`);
}

export const angleCreate: CommandHandler = {
  id: 'basic.angle',
  examples: [
    'ABC açısını çiz', '60 derecelik açı çiz', 'A köşeli 45 derecelik açı', 'dik açı çiz', 'ölçüsü 120° olan açı oluştur',
    'B köşesinde 30° lik açı oluştur', 'saat yönünde 75 derecelik açı çiz', 'kolları 6 birim olan 50 derecelik açı çiz', 'ABC üçgeninin B açısını çiz',
    '40 derecelik PQR açısı çiz',
  ],
  match(c, scene) {
    if (hasLengthBars(c) || c.definition) return 0;
    const s = scan(c, scene);
    const t = s.text;
    if (!ANGLE_NOUN.test(t) || /\baci yapan/.test(t)) return 0;
    if (FOREIGN_EXCEPT_SHAPES.test(t) || /\b(?:cember|daire|elips|yay|dilim|pergel|yaricap|vektor)/.test(t) || foreignVerb(c)) return 0;
    // "ABC üçgeninin (tüm) açılarını çiz": çokgenin her köşesine açı (göster/ölç biçimleri ölçüm ailesinindir)
    if (allCorners(c, scene)) return 46;
    if (/\bacilar/.test(t) || /\b(?:ic|dis|merkez|yansima) aci/.test(t)) return 0;
    const degrees = degreesIn2(c, s);
    const kind = KINDS.some(([re]) => re.test(t));
    const allExist = s.refs.some(r => r.kind === 'label' && scene.pointsFromLabel(r.label.text)?.length === 3);
    if (/\b(?:yap|ayarla|degistir|olsun)\w*/.test(t) && !/\b(?:olan|lik|luk|derecelik|olculu)\b/.test(t) && allExist) return 0;
    if (degrees !== undefined || kind) return 48;
    return c.hasVerb('create') ? 46 : 36;
  },
  run(c, scene) {
    if (allCorners(c, scene)) { drawAllCorners(c, scene); return; }
    const s = scan(c, scene);
    const t = s.text;
    assertNumbersUsed(c, s, '“60 derecelik açı çiz”');
    let degrees = degreesIn2(c, s);
    let kindName: string | undefined;
    if (degrees === undefined) {
      const kind = KINDS.find(([re]) => re.test(t));
      if (kind) { degrees = kind[1]; kindName = kind[2]; }
    }
    if (degrees !== undefined && (!Number.isFinite(degrees) || degrees <= 0 || degrees >= 360)) fail('Açı ölçüsü 0° ile 360° arasında olmalı (ör. “60 derecelik açı çiz”).');
    const sign = /\bsaat yonunde/.test(t) && !/\btersi/.test(t) ? -1 : 1;
    const arm = armLength(c, s) ?? 4;
    const color = creationColor(c);
    const reflex = degrees !== undefined && degrees > 180 ? true : undefined;
    const defaultNote = degrees === undefined ? 'Ölçü yazılmadığı için 60° alındı; kollardaki noktaları sürükleyerek değiştirebilirsiniz.' : undefined;
    const d = degrees ?? 60;

    const labelRefs = s.refs.filter((r): r is Extract<Ref, { kind: 'label' }> => r.kind === 'label');
    const vertexRef = s.refs.find(r => VERTEX_AFTER.test(s.words.slice(r.at + 1, r.at + 3).join(' '))
      || VERTEX_BEFORE.test(s.words.slice(Math.max(0, r.at - 2), r.at).join(' ')));
    const polygonNoun = /\b(?:ucgen|kare|dikdortgen|cokgen|dortgen|paralelkenar|yamuk|deltoid|besgen|altigen)/.test(t);

    // Üç harfle yazılmış açı: ABC, ∠ABC, "A, B ve C noktalarıyla"
    let names: string[] | undefined;
    const threeRef = labelRefs.find(r => r !== vertexRef && !r.coord && labelParts(scene, r.label.text, 3));
    if (threeRef && !(polygonNoun && labelRefs.length > 1)) names = labelParts(scene, threeRef.label.text, 3)!;
    else if (!vertexRef && !polygonNoun && labelRefs.length === 3 && labelRefs.every(r => !r.coord && labelParts(scene, r.label.text, 1))) {
      names = labelRefs.map(r => labelParts(scene, r.label.text, 1)![0]);
    }
    if (names) {
      const [n1, nv, n3] = names;
      const e1 = scene.findPoint(n1), ev = scene.findPoint(nv), e3 = scene.findPoint(n3);
      if (e1 && ev && e3) {
        if (degrees !== undefined) {
          const actual = angleDegrees(e1, ev, e3), wanted = d > 180 ? 360 - d : d;
          if (Math.abs(actual - wanted) > 1e-6) {
            fail(`${n1}, ${nv} ve ${n3} noktaları zaten var ve ${olcuMetni(aci(e1, ev, e3, actual, { basamak: 1 }))}. Ölçüyü değiştirmek için “${n1}${nv}${n3} açısını ${trNum(d)} derece yap” yazın.`);
          }
        }
        finish(scene, e1, ev, e3, { reflex, color });
        return;
      }
      if (!ev && (e1 || e3)) fail(`${nv} köşesi bulunamadı. Önce ${nv} noktasını oluşturun ya da açıyı var olan üç noktayla yazın.`);
      let p1: PointObject, v: PointObject, p3: PointObject;
      if (!ev) {
        const offsets = [polar(arm, 0), { x: 0, y: 0 }, polar(arm, sign * d * DEG)];
        const base = placeGroup(scene, offsets);
        p1 = scene.addPoint(add(base, offsets[0]), { label: n1 });
        v = scene.addPoint(base, { label: nv });
        p3 = scene.addPoint(add(base, offsets[2]), { label: n3 });
      } else {
        v = ev;
        if (e1) { p1 = e1; p3 = scene.addPoint(rotateAround(e1, v, sign * d), { label: n3 }); }
        else if (e3) { p3 = e3; p1 = scene.addPoint(rotateAround(e3, v, -sign * d), { label: n1 }); }
        else {
          const start = freeStart(scene, v, arm, sign * d * DEG);
          p1 = scene.addPoint(add(v, polar(arm, start)), { label: n1 });
          p3 = scene.addPoint(add(v, polar(arm, start + sign * d * DEG)), { label: n3 });
        }
      }
      finish(scene, p1, v, p3, { reflex, note: defaultNote, color });
      return;
    }

    // Köşesi verilmiş açı: "A köşeli 45 derecelik açı", "ABC üçgeninin B açısını çiz", "(2;1) köşeli dik açı"
    const single = vertexRef ?? (s.refs.length === 1 ? s.refs[0] : polygonNoun ? labelRefs.find(r => scene.pointsFromLabel(r.label.text)?.length === 1 && !!scene.findPoint(r.label.text)) : undefined);
    if (single) {
      const specs = expandRefs(scene, [single]);
      if (specs.length !== 1) fail('Açının köşesini tek bir nokta adıyla ya da üç harfle yazın (ör. “A köşeli 45 derecelik açı” veya “ABC açısını çiz”).');
      const existing = existingOf(scene, specs[0]);
      if (existing && degrees === undefined) {
        const { p1, p3, reflex: inner } = vertexNeighbours(scene, existing);
        finish(scene, p1, existing, p3, { reflex: inner || undefined, arms: false, color });
        return;
      }
      const fixedVertex = existing ?? specs[0].coord;
      const start = fixedVertex ? freeStart(scene, fixedVertex, arm, sign * d * DEG) : 0;
      const offsets = [polar(arm, start), polar(arm, start + sign * d * DEG)];
      const v = existing ?? materialize(scene, specs[0], () => placeGroup(scene, [{ x: 0, y: 0 }, ...offsets]));
      const p1 = scene.addPoint(add(v, offsets[0]));
      const p3 = scene.addPoint(add(v, offsets[1]));
      finish(scene, p1, v, p3, { reflex, note: defaultNote, color });
      return;
    }
    if (s.refs.length) fail('Açıyı üç nokta adıyla (“ABC açısını çiz”) ya da köşesi ve ölçüsüyle (“A köşeli 45 derecelik açı”) yazın.');

    // Yalnızca ölçü: yeni köşe ve kollar
    const offsets = [polar(arm, 0), { x: 0, y: 0 }, polar(arm, sign * d * DEG)];
    const draw = () => {
      const base = placeGroup(scene, offsets);
      const p1 = scene.addPoint(add(base, offsets[0]));
      const v = scene.addPoint(base);
      const p3 = scene.addPoint(add(base, offsets[2]));
      finish(scene, p1, v, p3, { reflex, color, note: defaultNote ?? (kindName ? `${kindName[0].toLocaleUpperCase('tr')}${kindName.slice(1)} için ${trNum(d)}° alındı.` : undefined) });
      return scene.focus[0];
    };
    // "iki açı çiz": birden çok adsız açı
    const count = creationCount(c, s, /aci/);
    if (count > 1) { repeatCreate(scene, count, degrees === undefined ? 'açı' : `${trNum(d)} derecelik açı`, draw); return; }
    draw();
  },
};

/** degreesIn + "40 derecelik olsun" gibi biçimler. */
function degreesIn2(c: Clause, s: Scan): number | undefined {
  const m = s.text.match(/(#\d+) derece/) ?? s.text.match(/\b(?:olcusu|olculu|buyuklugu|acisi) (?:= |: )?(#\d+)/) ?? s.text.match(/(#\d+) (?:lik|luk) aci/);
  return m ? c.num(m[1]) : undefined;
}
