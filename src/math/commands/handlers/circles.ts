import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import type { PointObject } from '@/types/math';
import { rotateAround, triangleCenterPoint } from '../../commandBindings';
import type { CommandHandler } from '../types';
import { type Clause, fold } from '../text';
import { COLORS, type CommandScene, colorIn, fail, skip, trNum } from '../scene';
import { analyzeConic, extractEquation, prettyEquation, type ConicResult } from './circles/equation';
import {
  type CenterSpec, type CircleClause, type Group, type NumRef, type RadiusSpec, type ShapeInfo, Used, after, assertNumericMeasures, at, centerList,
  classify, findCenter, findDiameter, findEnds, findPlacement, findRadiusGroup, findThrough, groupPoint, groupPoints, implicitThrough,
  isExcludedByVerbs, numMatch, numberList, pointAt, prepareClause, radiusNumber, refGroups, resolveCenter, sameSpot, take,
} from './circles/parse';

export const family = { id: 'circles', title: 'Çember, elips ve yaylar' };

/** Pergel aracının renkleri (Canvas pergeliTamamla). */
const PERGEL = NESNE_RENGI.mor;
/** Eski davranış: yarıçap yazılmayan çember r = 2. */
const DEFAULT_CIRCLE_RADIUS = 2;
const DEFAULT_ARC_RADIUS = 3;
const DEFAULT_SWEEP = 90;
const DEFAULT_ELLIPSE = { rx: 3, ry: 2 };

const joinTr = (items: string[]) => items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`;
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
const degreesOf = (center: PointObject, p: PointObject) => Math.atan2(p.y - center.y, p.x - center.x) * 180 / Math.PI;
const ccw = (from: number, to: number) => ((to - from) % 360 + 360) % 360;

function mark(used: Used, taken: Set<Group>, groups: (Group | undefined)[]) {
  for (const g of groups) if (g) { taken.add(g); used.group(g); }
}

function centerGroup(spec: CenterSpec | undefined): Group | undefined {
  return spec && 'group' in spec ? spec.group : undefined;
}

/** Çapın canlı orta noktası; aynı iki noktanın orta noktası zaten varsa o kullanılır. */
function midpointOf(scene: CommandScene, a: PointObject, b: PointObject): { point: PointObject; created: boolean } {
  const existing = scene.points().find(p => p.construction?.kind === 'midpoint'
    && p.construction.pointIds.includes(a.id) && p.construction.pointIds.includes(b.id));
  if (existing) return { point: existing, created: false };
  const point = scene.addPoint({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, { construction: { kind: 'midpoint', pointIds: [a.id, b.id] }, color: COLORS.construction });
  return { point, created: true };
}

function assertNotCollinear(points: PointObject[]) {
  if (new Set(points.map(p => p.id)).size !== 3) fail('Üç FARKLI nokta yazın (ör. “A, B ve C noktalarından geçen çember çiz”).');
  const [a, b, c] = points;
  if (Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) < 1e-9) fail('Üç nokta aynı doğru üzerinde; çember çizilemez.');
}

/**
 * Pergel ucu: "pergeli A noktasına koy" cümlesi aynı komuttaki sonraki çember/yay cümlelerinin merkezi olur
 * ("pergeli A noktasına koyup 3 birim açıklıkla çember çiz" iki işleme ayrılır).
 */
const compassAnchor = new WeakMap<CommandScene, string>();
/** Pergel sözcükleri: ayrı söylenmiş komutlarda tek seçili nokta pergelin ucu sayılır. */
const COMPASS_WORDS = /\b(?:pergel|acarak|acip|acilarak|aciklik)/;

function compassCenter(c: Clause, scene: CommandScene): CenterSpec | undefined {
  const anchor = compassAnchor.get(scene);
  if (anchor && scene.get(anchor)) return { point: anchor };
  if (!COMPASS_WORDS.test(c.text)) return undefined;
  const selected = scene.selection.map(id => scene.get(id)).filter((o): o is PointObject => o?.type === 'point');
  return selected.length === 1 && scene.selection.length === 1 ? { point: selected[0].id } : undefined;
}

function checkPositive(value: number, what: string, written?: number) {
  if (!Number.isFinite(value) || value <= 0) fail(`${what} 0’dan büyük olmalı${written !== undefined ? ` (yazılan: ${trNum(written)})` : ''}.`);
  if (value > 10000) fail(`${what} en fazla 10000 olabilir.`);
}

// ---------------------------------------------------------------------------
// Denklem

function conicOf(c: Clause): ConicResult | null {
  if (c.definition) return null;
  const source = extractEquation(c.raw);
  const typed = source ? analyzeConic(source) : null;
  if (typed) return typed;
  // Konuşma: "x kare artı y kare eşittir dokuz", "x eksi bir in karesi …"
  const spoken = extractEquation(c.raw, true);
  return spoken && spoken !== source ? analyzeConic(spoken) : null;
}

const equation: CommandHandler = {
  id: 'circles.equation',
  examples: [
    '(x-1)^2 + (y-2)^2 = 9',
    'x² + y² = 16 çemberini çiz',
    'x^2 + y^2 - 4x + 6y - 12 = 0',
    'x^2/16 + y^2/9 = 1 elipsini çiz',
    '(x+3)² + (y−1)² = 4',
    'x kare artı y kare eşittir 9',
  ],
  match(c) {
    if (isExcludedByVerbs(c)) return 0;
    if (/\b(?:cember|daire|elips)(?:in|inin|e|ye|ine|de|den|inde|inden|le|yle)\b/.test(c.text)) return 0;
    return conicOf(c) ? 96 : 0;
  },
  run(c, scene) {
    const conic = conicOf(c);
    if (!conic) skip();
    if (conic.kind === 'error') fail(conic.message);
    const color = colorIn(c);
    const shown = prettyEquation(conic.source);
    if (conic.kind === 'circle') {
      const { point } = pointAt(scene, conic.center);
      scene.addCircle({ centerId: point.id, radius: conic.radius }, { color });
      scene.say(`${shown} denklemli çember çizildi: merkezi ${point.label} ${at(point)}, yarıçapı ${trNum(conic.radius)}.`);
      return;
    }
    const { point } = pointAt(scene, conic.center, COLORS.ellipse);
    scene.addEllipse(point.id, conic.radiusX, conic.radiusY, { color });
    scene.say(`${shown} denklemli elips çizildi: merkezi ${point.label} ${at(point)}, yatay yarıçapı ${trNum(conic.radiusX)}, dikey yarıçapı ${trNum(conic.radiusY)}.`);
  },
};

// ---------------------------------------------------------------------------
// Çember ve daire

function addFixed(scene: CommandScene, center: PointObject, r: number, o: { disk: boolean; pergel: boolean; color?: string }) {
  if (o.pergel) return scene.addCircle({ centerId: center.id, radius: r }, { color: o.color ?? PERGEL, fillOpacity: 0, label: `${center.label} Merkezli Çember` });
  if (o.disk) return scene.addCircle({ centerId: center.id, radius: r }, { color: o.color, fillOpacity: 0.12, showArea: scene.options.showMeasurementsOnCreate !== false, label: `${center.label} Dairesi (r = ${trNum(r)})` });
  return scene.addCircle({ centerId: center.id, radius: r }, { color: o.color });
}

function addThroughPoint(scene: CommandScene, center: PointObject, radiusPoint: PointObject, o: { disk: boolean; color?: string }) {
  return scene.addCircle({ centerId: center.id, radiusPointId: radiusPoint.id }, o.disk
    ? { color: o.color, fillOpacity: 0.12, label: `${center.label} Merkezli Daire` }
    : { color: o.color });
}

const RADIUS_WORD = { yaricap: 'Yarıçap', cap: 'Çap', aciklik: 'Pergel açıklığı', cevre: 'Çevre', alan: 'Alan', birim: 'Yarıçap' } as const;

function runCircle(c: Clause, scene: CommandScene) {
  const info = classify(c);
  if (!info || (info.kind !== 'circle' && info.kind !== 'disk')) skip();
  const disk = info.kind === 'disk';
  const noun = disk ? 'daire' : 'çember';
  const example = disk ? 'yarıçapı 3 olan daire çiz' : 'A merkezli, yarıçapı 3 olan çember çiz';
  assertNumericMeasures(c, scene, disk ? 'dairenin' : 'çemberin', example);
  const used = new Used(c);
  const pergel = /\bpergel/.test(c.text);
  const color = colorIn(c) ?? (pergel ? PERGEL : undefined);
  const pointColor = pergel ? PERGEL : undefined;

  const groups = refGroups(c);
  const taken = new Set<Group>();
  const centerSpec = findCenter(c, groups) ?? placementCenter(c, groups, taken) ?? compassCenter(c, scene);
  used.center(centerSpec);
  mark(used, taken, [centerGroup(centerSpec)]);
  const centers = centerList(c, groups, centerSpec);
  mark(used, taken, centers);
  const diameter = findDiameter(c, groups, taken);
  mark(used, taken, diameter);
  const radiusGroup = findRadiusGroup(c, groups, taken);
  mark(used, taken, [radiusGroup]);
  const through = findThrough(c, groups, taken);
  mark(used, taken, through);
  const selectedThrough = implicitThrough(c, scene, used, through, noun);
  const radii = numberList(c, used, 'yaricap');
  const radius = radii ? undefined : radiusNumber(c, used, { circumference: true });
  const countRef = take(used, numMatch(c, used, /#(\d+)\s+(?:tane\s+|adet\s+)?(?:cember|daire|yuvarla|disk)/));
  used.assertAllUsed(example);
  const concentric = /\bes merkezli\b/.test(c.text);
  const hasThrough = through.length > 0 || selectedThrough.length > 0;

  // "A ve B merkezli, yarıçapı 2 olan çemberler"
  if (centers.length > 1) {
    runSeveralCenters(c, scene, { centers, radius, radii, count: countRef?.value, disk, pergel, color, pointColor, noun, other: diameter.length > 0 || hasThrough || !!radiusGroup });
    return;
  }

  // Çap uçları → merkez canlı orta nokta, yarıçap noktası ilk uç
  if (diameter.length) {
    if (centerSpec || radius || radii || hasThrough || radiusGroup) fail('Çapı verilen çemberin merkezi ve yarıçapı çaptan bulunur; ayrıca merkez, yarıçap ya da geçtiği nokta yazmayın.');
    const pts = diameter.length === 2
      ? diameter.map(g => groupPoint(scene, c, g, { role: 'Çapın ucu' }).point)
      : groupPoints(scene, c, diameter[0]);
    if (pts.length !== 2) fail(`Çap için iki nokta gerekir (ör. “AB çaplı ${noun} çiz”).`);
    const [a, b] = pts;
    if (a.id === b.id || sameSpot(a, b)) fail('Çapın iki ucu farklı konumda olmalı.');
    const mid = midpointOf(scene, a, b);
    addThroughPoint(scene, mid.point, a, { disk, color });
    scene.say(`Çapı [${a.label}${b.label}] olan ${noun} çizildi. ${mid.created
      ? `Merkez olarak [${a.label}${b.label}] doğru parçasının orta noktası ${mid.point.label} oluşturuldu; uçlar taşınınca ${noun} de güncellenir.`
      : `Merkezi ${mid.point.label}.`}`);
    return;
  }

  // Geçtiği noktalar
  if (hasThrough) {
    const pts = through.length ? [...new Map(through.flatMap(g => groupPoints(scene, c, g, pointColor)).map(p => [p.id, p])).values()] : selectedThrough;
    if (radius || radii || radiusGroup) fail(`${capitalize(noun)} hem bir noktadan geçip hem de ayrıca yarıçapla verilemez; yalnızca birini yazın (ör. “${example}”).`);
    if (centerSpec) {
      if (pts.length !== 1) fail('Merkezi belli çember için geçtiği tek bir nokta yazın (ör. “A merkezli, B’den geçen çember çiz”).');
      const center = resolveCenter(scene, c, centerSpec, undefined, pointColor).point;
      if (center.id === pts[0].id || sameSpot(center, pts[0])) fail('Merkez ile çemberin geçtiği nokta farklı olmalı.');
      addThroughPoint(scene, center, pts[0], { disk, color });
      scene.say(`Merkezi ${center.label} olan ve ${pts[0].label} noktasından geçen ${noun} çizildi.`);
      return;
    }
    if (pts.length === 3) {
      assertNotCollinear(pts);
      const labels = pts.map(p => p.label);
      scene.addCircle({ throughIds: [pts[0].id, pts[1].id, pts[2].id] }, disk
        ? { color, fillOpacity: 0.12, showArea: scene.options.showMeasurementsOnCreate !== false, label: `${labels.join('')} Dairesi` }
        : { color });
      scene.say(`${joinTr(labels)} noktalarından geçen ${noun} çizildi.`);
      return;
    }
    if (pts.length === 2) fail(`İki noktadan sonsuz sayıda çember geçer. Merkezi de yazın (ör. “${pts[0].label} merkezli, ${pts[1].label} noktasından geçen çember”) ya da üçüncü bir nokta ekleyin (ör. “A, B ve C noktalarından geçen çember”).`);
    if (pts.length === 1) fail(`Çemberin merkezini de yazın (ör. “A merkezli, ${pts[0].label} noktasından geçen çember çiz”).`);
    fail('Bir çember üç noktayla belirlenir; en fazla üç nokta yazın.');
  }

  // Yarıçap iki noktanın uzaklığı: canlı yarıçap noktası
  if (radiusGroup) {
    if (radius || radii) fail(`Yarıçapı bir kez yazın (ör. “${example}”).`);
    const seg = groupPoints(scene, c, radiusGroup);
    if (seg.length !== 2) fail('Yarıçap için iki noktalı bir ad yazın (ör. “A merkezli, AB yarıçaplı çember çiz”).');
    const [p, q] = seg;
    const length = Math.hypot(q.x - p.x, q.y - p.y);
    if (p.id === q.id || length < 1e-9) fail('Yarıçapı veren iki nokta farklı konumda olmalı.');
    const resolved = centerSpec ? resolveCenter(scene, c, centerSpec, () => scene.placeShape(2 * length, 2 * length), pointColor) : { point: p, created: false };
    const center = resolved.point;
    let radiusPoint: PointObject;
    let helper = '';
    if (center.id === p.id) radiusPoint = q;
    else if (center.id === q.id) radiusPoint = p;
    else {
      radiusPoint = scene.addPoint({ x: center.x + q.x - p.x, y: center.y + q.y - p.y }, {
        construction: { kind: 'translate', sourceId: center.id, vectorPointIds: [p.id, q.id] }, color: pointColor,
      });
      helper = ` Yarıçap |${p.label}${q.label}| ile eşit kalsın diye çember üzerinde ${radiusPoint.label} noktası oluşturuldu.`;
    }
    addThroughPoint(scene, center, radiusPoint, { disk, color });
    scene.say(`${pergel ? 'Pergelle ' : ''}${pergel ? noun : capitalize(noun)} çizildi: merkezi ${center.label}${resolved.created ? ` ${at(center)}` : ''}, yarıçapı |${p.label}${q.label}| = ${trNum(length)}.${helper}`);
    return;
  }

  // Sayıyla verilen yarıçap(lar)
  const values = radii ? radii.map(r => r.value) : [radius?.value ?? (info.unit ? 1 : DEFAULT_CIRCLE_RADIUS)];
  if (radius) checkPositive(radius.value, RADIUS_WORD[radius.from], radius.written);
  radii?.forEach(r => checkPositive(r.value, 'Yarıçap', r.value));
  if (info.unit && radius && Math.abs(radius.value - 1) > 1e-9) fail('Birim çemberin yarıçapı 1’dir. Başka yarıçap için “yarıçapı 3 olan çember çiz” yazın.');
  // "yarıçapları 2 ve 4 olan iki çember": sayı yarıçap sayısıyla aynıysa yalnızca doğrulamadır.
  const count = radii && countRef?.value === radii.length ? 1 : countRef?.value ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > 12) fail(`Tek seferde 1–12 ${noun} çizebilirim (ör. “3 tane ${noun} çiz”).`);
  if (count > 1 && radii) fail(`${trNum(count)} ${noun} için ${radii.length} yarıçap yazıldı; sayılar eşit olmalı (ör. “yarıçapları 1, 2 ve 3 olan üç ${noun} çiz”).`);
  if (count > 1 && centerSpec) fail(`Aynı merkezli birden fazla ${noun} için yarıçaplarını yazın (ör. “A merkezli, yarıçapları 1, 2 ve 3 olan ${noun}ler çiz”).`);

  if (count > 1 && concentric) fail(`Eş merkezli ${noun}ler için yarıçaplarını yazın (ör. “yarıçapları 1, 2 ve 3 olan eş merkezli çemberler çiz”).`);

  const maxR = Math.max(...values);
  const spec: CenterSpec | undefined = centerSpec ?? (info.unit ? { origin: true } : undefined);
  const separate = !spec && !concentric && (values.length > 1 || count > 1);
  const shared = separate ? undefined : resolveCenter(scene, c, spec, () => scene.placeShape(2 * maxR, 2 * maxR), pointColor);

  if (values.length === 1 && count === 1) {
    const r = values[0];
    const { point: center, created } = shared!;
    addFixed(scene, center, r, { disk, pergel, color });
    const where = `${center.label}${created ? ` ${at(center)}` : ''}`;
    if (pergel) {
      scene.say(`Pergelle ${where} merkezli çember çizildi (r = ${trNum(r)} br).`);
      return;
    }
    if (info.unit) {
      scene.say(`Birim ${noun} çizildi: merkezi ${where}, yarıçapı 1.`);
      return;
    }
    const note = !radius ? ` Yarıçap yazılmadığı için ${trNum(r)} alındı.`
      : radius.from === 'cap' ? ` (çapı ${trNum(radius.written)})`
        : radius.from === 'cevre' ? ` (çevresi ${trNum(radius.written)})`
          : radius.from === 'alan' ? ` (alanı ${trNum(radius.written)})` : '';
    const sentence = `Merkezi ${where}, yarıçapı ${trNum(r)} olan ${noun} çizildi.`;
    scene.say(note.startsWith(' (') ? sentence.replace(/\.$/, `${note}.`) : sentence + note);
    return;
  }

  const made: string[] = [];
  if (shared) {
    for (const r of values) addFixed(scene, shared.point, r, { disk, pergel, color });
    scene.say(`Merkezi ${shared.point.label}${shared.created ? ` ${at(shared.point)}` : ''}, yarıçapları ${joinTr(values.map(v => trNum(v)))} olan eş merkezli ${values.length} ${noun} çizildi.`);
    return;
  }
  const list = radii ? values : Array.from({ length: count }, () => values[0]);
  for (const r of list) {
    const center = scene.addPoint(scene.placeShape(2 * r, 2 * r), { color: pointColor });
    addFixed(scene, center, r, { disk, pergel, color });
    made.push(center.label);
  }
  const sameRadius = new Set(list).size === 1;
  scene.say(`${list.length} ${noun} çizildi: merkezleri ${joinTr(made)}, ${sameRadius ? `yarıçapı ${trNum(list[0])}` : `yarıçapları ${joinTr(list.map(v => trNum(v)))}`}.${!radius && !radii ? ` Yarıçap yazılmadığı için ${trNum(list[0])} alındı.` : ''}`);
}

function placementCenter(c: Clause, groups: Group[], taken: Set<Group>): CenterSpec | undefined {
  const g = findPlacement(c, groups, taken);
  return g ? { group: g } : undefined;
}

function runSeveralCenters(c: Clause, scene: CommandScene, o: {
  centers: Group[]; radius?: RadiusSpec; radii?: NumRef[]; count?: number; disk: boolean; pergel: boolean; color?: string; pointColor?: string; noun: string; other: boolean;
}) {
  const n = o.centers.length;
  if (o.other) fail(`Birden fazla merkez için yalnızca yarıçap yazın (ör. “A ve B merkezli, yarıçapı 2 olan ${o.noun}ler çiz”).`);
  if (o.count !== undefined && o.count !== n) fail(`${trNum(o.count)} ${o.noun} yazıldı ama ${n} merkez verildi; sayılar eşit olmalı.`);
  const list = o.radii ? o.radii.map(r => r.value) : o.centers.map(() => o.radius?.value ?? DEFAULT_CIRCLE_RADIUS);
  if (list.length !== n) fail(`${n} merkez için ${list.length} yarıçap yazıldı; sayılar eşit olmalı (ör. “A ve B merkezli, yarıçapları 2 ve 3 olan ${o.noun}ler çiz”).`);
  if (o.radius) checkPositive(o.radius.value, RADIUS_WORD[o.radius.from], o.radius.written);
  o.radii?.forEach(r => checkPositive(r.value, 'Yarıçap', r.value));
  const points = o.centers.map((g, k) => groupPoint(scene, c, g, { role: 'Merkez', color: o.pointColor, create: () => scene.placeShape(2 * list[k], 2 * list[k]) }).point);
  if (new Set(points.map(p => p.id)).size !== n) fail(`Merkezler farklı noktalar olmalı.`);
  points.forEach((p, k) => addFixed(scene, p, list[k], { disk: o.disk, pergel: o.pergel, color: o.color }));
  const same = new Set(list).size === 1;
  scene.say(`Merkezleri ${joinTr(points.map(p => p.label))}, ${same ? `yarıçapı ${trNum(list[0])}` : `yarıçapları ${joinTr(list.map(v => trNum(v)))}`} olan ${n} ${o.noun} çizildi.${!o.radius && !o.radii ? ` Yarıçap yazılmadığı için ${trNum(DEFAULT_CIRCLE_RADIUS)} alındı.` : ''}`);
}

const circle: CommandHandler = {
  id: 'circles.circle',
  examples: [
    'Çember çiz',
    'Yarıçapı 3 olan çember çiz',
    'A merkezli, yarıçapı 4 olan çember oluştur',
    '(1; 2) merkezli 3 yarıçaplı çember çiz',
    'Çapı 8 olan çember çiz',
    "A merkezli ve B'den geçen çember çiz",
    'AB çaplı çember çiz',
    'A, B ve C noktalarından geçen çember çiz',
    'Yarıçapı 5 olan daire çiz',
    'Kırmızı bir çember çiz',
    'Pergelle A merkezli 3 birim açıklıkla çember çiz',
    'Merkezi orijin olan 5 birim yarıçaplı çember çiz',
    'Çevresi 6π olan çember çiz',
    'Yarıçapları 1, 2 ve 3 olan eş merkezli çemberler çiz',
    'Birim çember çiz',
  ],
  match(c, scene) {
    const info = classify(prepareClause(c, scene));
    return info && (info.kind === 'circle' || info.kind === 'disk') ? 50 : 0;
  },
  run: (c, scene) => runCircle(prepareClause(c, scene), scene),
};

// ---------------------------------------------------------------------------
// Elips

function ellipseRadii(c: Clause, used: Used): { rx?: number; ry?: number; how: string } {
  const pick = (re: RegExp) => take(used, numMatch(c, used, re));
  const tail = '[a-z]*(?:\\s+uzunlugu)?\\s*(?:=|:)?\\s*#(\\d+)';
  let rx: number | undefined, ry: number | undefined;
  const set = (axis: 'x' | 'y', ref: NumRef | undefined, factor: number) => {
    if (!ref) return;
    if (axis === 'x') rx ??= ref.value * factor; else ry ??= ref.value * factor;
  };
  // "yatay yarıçapı 3", "yatay yarı ekseni 3", "x ekseni boyunca yarıçapı 3", "düşey yarıçapı 1"
  const along = (axis: string) => `${axis}\\s+ekseni?\\s+(?:boyunca|yonunde(?:ki)?|uzerinde(?:ki)?)`;
  set('x', pick(new RegExp(`\\b(?:yatay|${along('x')})\\s+(?:yaricap|yari\\s+eksen)${tail}`)), 1);
  set('y', pick(new RegExp(`\\b(?:dikey|dusey|${along('y')})\\s+(?:yaricap|yari\\s+eksen)${tail}`)), 1);
  set('x', pick(new RegExp(`\\byatay\\s+eksen${tail}`)), 0.5);
  set('y', pick(new RegExp(`\\b(?:dikey|dusey)\\s+eksen${tail}`)), 0.5);
  const semiMajor = pick(new RegExp(`\\byari\\s+buyuk\\s+eksen${tail}`));
  const semiMinor = pick(new RegExp(`\\byari\\s+kucuk\\s+eksen${tail}`));
  const major = pick(new RegExp(`\\bbuyuk\\s+eksen${tail}`));
  const minor = pick(new RegExp(`\\bkucuk\\s+eksen${tail}`));
  const big = semiMajor?.value ?? (major ? major.value / 2 : undefined);
  const small = semiMinor?.value ?? (minor ? minor.value / 2 : undefined);
  if (big !== undefined && small !== undefined && big < small) fail('Büyük eksen küçük eksenden kısa olamaz.');
  if (big !== undefined) rx ??= big;
  if (small !== undefined) ry ??= small;
  set('x', pick(new RegExp(`\\b(?:genislig|eni\\b)${tail}`)), 0.5);
  set('y', pick(new RegExp(`\\b(?:yukseklig|boyu\\b)${tail}`)), 0.5);
  if (rx !== undefined || ry !== undefined) return { rx, ry, how: 'axes' };

  // "yarı eksenleri 4 ve 2", "yarı eksen uzunlukları 5 ve 3": yarıçapların kendisi
  const semi = numberList(c, used, 'yari ?eksen(?: uzunluk)?');
  if (semi) {
    if (semi.length !== 2) fail('Elipsin iki yarı eksenini yazın (ör. “yarı eksenleri 4 ve 2 olan elips çiz”).');
    return { rx: semi[0].value, ry: semi[1].value, how: 'list' };
  }
  const list = numberList(c, used, 'yaricap');
  if (list) {
    if (list.length !== 2) fail('Elipsin iki yarıçapını yazın (ör. “yarıçapları 4 ve 2 olan elips çiz”).');
    return { rx: list[0].value, ry: list[1].value, how: 'list' };
  }
  // "yarıçapı 5 ve 3 olan elips"
  const pair = c.text.match(/\byaricapi\s*(?:=|:)?\s*#(\d+)\s*(?:,|ve|ile)\s*#(\d+)/);
  if (pair && !used.nums.has(Number(pair[1])) && !used.nums.has(Number(pair[2]))) {
    used.num(Number(pair[1])); used.num(Number(pair[2]));
    return { rx: c.numbers[Number(pair[1])], ry: c.numbers[Number(pair[2])], how: 'list' };
  }
  const axes = numberList(c, used, 'eksen uzunluk');
  if (axes) {
    if (axes.length !== 2) fail('Elipsin iki eksen uzunluğunu yazın (ör. “eksen uzunlukları 8 ve 4 olan elips çiz”).');
    return { rx: axes[0].value / 2, ry: axes[1].value / 2, how: 'axes' };
  }
  // "6x4 elips", "8'e 4'lük elips", "6 çarpı 4 elips"
  const box = c.text.match(/#(\d+)\s+(?:x|carpi|\*|y?[ae])\s+#(\d+)/);
  if (box && !used.nums.has(Number(box[1])) && !used.nums.has(Number(box[2]))) {
    used.num(Number(box[1])); used.num(Number(box[2]));
    return { rx: c.numbers[Number(box[1])] / 2, ry: c.numbers[Number(box[2])] / 2, how: 'box' };
  }
  const single = radiusNumber(c, used);
  if (single) {
    if (single.from === 'cap' || single.from === 'yaricap' || single.from === 'birim') return { rx: single.value, ry: single.value, how: 'single' };
    fail('Elipsin yatay ve dikey yarıçaplarını yazın (ör. “yatay yarıçapı 3, dikey yarıçapı 1 olan elips çiz”).');
  }
  return { how: 'default' };
}

function runEllipse(c: Clause, scene: CommandScene) {
  const info = classify(c);
  if (info?.kind !== 'ellipse') skip();
  const raw = fold(c.raw);
  if (/\bodak/.test(c.text)) fail('Odak noktalarıyla elips çizme desteklenmiyor. Elipsi merkezi ve yarıçaplarıyla yazın (ör. “A merkezli, yarıçapları 4 ve 2 olan elips çiz”).');
  if (/\b(?:yarim|ceyrek)\s+elips/.test(raw)) fail('Yarım ya da çeyrek elips çizilemez; tam elips için “elips çiz”, çember parçası için “yarım daire çiz” ya da “çeyrek daire çiz” yazın.');
  assertNumericMeasures(c, scene, 'elipsin', 'yatay yarıçapı 3, dikey yarıçapı 2 olan elips çiz');
  const used = new Used(c);
  const groups = refGroups(c);
  const centerSpec = findCenter(c, groups) ?? placementCenter(c, groups, new Set());
  used.center(centerSpec);
  const color = colorIn(c);
  const radii = ellipseRadii(c, used);
  const rotation = take(used, numMatch(c, used, /#(\d+)\s*derece(?:lik)?\s+(?:egik|egimli|yatik|donuk|dondurulmus|dondurulen|donmus)/)) ?? take(used, numMatch(c, used, after('egim')));
  used.assertAllUsed('A merkezli, yarıçapları 4 ve 2 olan elips çiz');
  const vertical = /\bdikey elips/.test(c.text);
  const notes: string[] = [];
  const none = radii.rx === undefined && radii.ry === undefined;
  const rx = radii.rx ?? (vertical && none ? DEFAULT_ELLIPSE.ry : DEFAULT_ELLIPSE.rx);
  const ry = radii.ry ?? (vertical && none ? DEFAULT_ELLIPSE.rx : DEFAULT_ELLIPSE.ry);
  if (none) notes.push(`Yarıçaplar yazılmadığı için ${trNum(rx)} ve ${trNum(ry)} alındı.`);
  else if (radii.rx === undefined) notes.push(`Yatay yarıçap yazılmadığı için ${trNum(rx)} alındı.`);
  else if (radii.ry === undefined) notes.push(`Dikey yarıçap yazılmadığı için ${trNum(ry)} alındı.`);
  if (radii.how === 'single') notes.push('Tek yarıçap yazıldığı için iki yarıçap eşit alındı.');
  if (radii.how === 'box') notes.push(`Genişlik ${trNum(rx * 2)}, yükseklik ${trNum(ry * 2)} olarak alındı.`);
  checkPositive(rx, 'Elipsin yatay yarıçapı');
  checkPositive(ry, 'Elipsin dikey yarıçapı');
  const { point: center, created } = resolveCenter(scene, c, centerSpec, () => scene.placeShape(2 * rx!, 2 * ry!), COLORS.ellipse);
  scene.addEllipse(center.id, rx, ry, { color, rotation: rotation?.value });
  scene.say(`Merkezi ${center.label}${created ? ` ${at(center)}` : ''}, yatay yarıçapı ${trNum(rx)}, dikey yarıçapı ${trNum(ry)} olan elips çizildi${rotation ? ` (${trNum(rotation.value)}° eğik)` : ''}.${notes.length ? ` ${notes.join(' ')}` : ''}`);
}

const ellipse: CommandHandler = {
  id: 'circles.ellipse',
  examples: [
    'Elips çiz',
    'Yarıçapları 4 ve 2 olan elips çiz',
    'Yatay yarıçapı 3, dikey yarıçapı 1 olan elips oluştur',
    'A merkezli elips çiz',
    '(2; 1) merkezli, yarıçapları 5 ve 3 olan elips çiz',
    'Büyük ekseni 8, küçük ekseni 4 olan elips çiz',
    '30 derece eğik elips çiz',
  ],
  match(c, scene) { return classify(prepareClause(c, scene))?.kind === 'ellipse' ? 50 : 0; },
  run: (c, scene) => runEllipse(prepareClause(c, scene), scene),
};

// ---------------------------------------------------------------------------
// Yay ve daire dilimi

function arcAngles(c: Clause, used: Used): { sweep?: NumRef; start?: NumRef } {
  let start = take(used, numMatch(c, used, /\bbaslangic\s+acisi\s*(?:=|:)?\s*#(\d+)/));
  let sweep: NumRef | undefined;
  for (const m of c.text.matchAll(/#(\d+)\s*(derece[a-z]*)(?:\s+(\S+))?/g)) {
    const idx = Number(m[1]);
    if (used.nums.has(idx)) continue;
    if (m[2] === 'dereceden' && /^basla/.test(m[3] ?? '')) { if (!start) start = take(used, { idx, value: c.numbers[idx] }); }
    else if (!sweep) sweep = take(used, { idx, value: c.numbers[idx] });
  }
  sweep ??= take(used, numMatch(c, used, /\b(?:merkez\s+)?aci(?:si)?\s*(?:olcusu\s*)?(?:=|:)?\s*#(\d+)/));
  return { sweep, start };
}

function runArcLike(c: Clause, scene: CommandScene) {
  const info: ShapeInfo | null = classify(c);
  if (!info || (info.kind !== 'arc' && info.kind !== 'sector')) skip();
  const sector = info.kind === 'sector';
  const noun = info.sweepWord ?? (sector ? 'daire dilimi' : 'yay');
  assertNumericMeasures(c, scene, sector ? 'daire diliminin' : 'yayın', sector ? 'A merkezli, yarıçapı 3 olan 60 derecelik daire dilimi çiz' : 'A merkezli, yarıçapı 3 olan 90 derecelik yay çiz');
  const used = new Used(c);
  used.num(info.sweepNum);
  const pergel = /\bpergel/.test(c.text);
  const color = colorIn(c) ?? (pergel ? PERGEL : undefined);
  const pointColor = pergel ? PERGEL : undefined;
  const add = (centerId: string, startId: string, directionId: string) => sector
    ? scene.addSector(centerId, startId, directionId, { color })
    : scene.addArc(centerId, startId, directionId, { color });

  const groups = refGroups(c);
  const taken = new Set<Group>();
  const centerSpec = findCenter(c, groups) ?? compassCenter(c, scene);
  used.center(centerSpec);
  mark(used, taken, [centerGroup(centerSpec)]);
  const diameter = findDiameter(c, groups, taken, { onto: info.sweep === 180 });
  mark(used, taken, diameter);
  const ends = findEnds(c, groups, taken);
  mark(used, taken, [ends.start, ends.end]);
  // "A merkezli AB yarıçaplı 60 derecelik yay": başlangıç noktası yarıçapın öbür ucu
  const radiusGroup = findRadiusGroup(c, groups, taken);
  mark(used, taken, [radiusGroup]);
  const through = findThrough(c, groups, taken);
  mark(used, taken, through);
  const selectedThrough = implicitThrough(c, scene, used, through, sector ? 'daire dilimi' : 'yay');
  const radius = radiusNumber(c, used);
  const angles = arcAngles(c, used);
  const clockwise = /\bsaat(?:in)? yonunde\b/.test(c.text) && !/\bters/.test(c.text);
  used.assertAllUsed(sector ? 'A merkezli, yarıçapı 3 olan 60 derecelik daire dilimi çiz' : 'A merkezli, yarıçapı 3 olan 90 derecelik yay çiz');

  let sweep = info.sweep;
  if (angles.sweep) {
    if (sweep !== undefined && Math.abs(angles.sweep.value - sweep) > 1e-9) fail(`${capitalize(noun)} ${sweep}° olur; ayrıca ${trNum(angles.sweep.value)}° yazılamaz.`);
    sweep = angles.sweep.value;
  }
  if (sweep !== undefined && !(sweep > 0 && sweep < 360)) fail('Merkez açı 0° ile 360° arasında olmalı. Tam daire için “çember çiz” yazın.');
  if (radius) checkPositive(radius.value, radius.from === 'cap' ? 'Çap' : 'Yarıçap', radius.written);
  const shape = sector ? 'daire dilimi' : 'yay';

  // Çap üzerine yarım daire / yarım çember
  if (diameter.length) {
    if (centerSpec || radius || ends.start || ends.end || through.length) fail(`Çapı verilen ${shape} için merkez ve yarıçap çaptan bulunur; ayrıca yazmayın.`);
    if (sweep !== undefined && Math.abs(sweep - 180) > 1e-9) fail(`Çap üzerine çizilen ${shape} 180° olur (ör. “AB çaplı yarım daire çiz”).`);
    const pts = diameter.length === 2 ? diameter.map(g => groupPoint(scene, c, g, { role: 'Çapın ucu' }).point) : groupPoints(scene, c, diameter[0]);
    if (pts.length !== 2) fail(`Çap için iki nokta gerekir (ör. “AB çaplı yarım daire çiz”).`);
    const [a, b] = clockwise ? [pts[1], pts[0]] : pts;
    if (a.id === b.id || sameSpot(a, b)) fail('Çapın iki ucu farklı konumda olmalı.');
    const mid = midpointOf(scene, a, b);
    add(mid.point.id, a.id, b.id);
    scene.say(`[${pts[0].label}${pts[1].label}] çaplı ${noun === shape ? `180° ${shape}` : `${noun} (180°)`} çizildi: ${a.label} noktasından ${b.label} noktasına, saat yönünün tersine. ${mid.created ? `Merkez olarak orta nokta ${mid.point.label} oluşturuldu.` : `Merkezi ${mid.point.label}.`}`);
    return;
  }

  // Üç noktadan geçen yay: merkez canlı çevrel merkez
  if ((through.length || selectedThrough.length) && !centerSpec) {
    const pts = through.length ? [...new Map(through.flatMap(g => groupPoints(scene, c, g, pointColor)).map(p => [p.id, p])).values()] : selectedThrough;
    if (pts.length !== 3) fail(`${capitalize(shape)} için merkezi de yazın (ör. “A merkezli, B’den başlayan 90 derecelik ${shape} çiz”) ya da üç nokta verin (ör. “A, B ve C noktalarından geçen yay çiz”).`);
    if (sweep !== undefined || radius || ends.start || ends.end) fail(`Üç noktadan geçen ${shape} açısı ve yarıçapı noktalardan bulunur; ayrıca yazmayın.`);
    assertNotCollinear(pts);
    const [p1, p2, p3] = pts;
    const position = triangleCenterPoint(p1, p2, p3, 'circumcenter');
    const center = scene.addPoint(position, { construction: { kind: 'triangleCenter', pointIds: [p1.id, p2.id, p3.id], center: 'circumcenter' }, color: COLORS.construction });
    const a1 = degreesOf(center, p1);
    const [s, d] = ccw(a1, degreesOf(center, p2)) < ccw(a1, degreesOf(center, p3)) ? [p1, p3] : [p3, p1];
    add(center.id, s.id, d.id);
    scene.say(`${joinTr(pts.map(p => p.label))} noktalarından geçen ${shape} çizildi: ${s.label} noktasından ${d.label} noktasına, saat yönünün tersine. Merkez olarak çevrel merkez ${center.label} oluşturuldu.`);
    return;
  }

  if (!centerSpec && (ends.start || ends.end)) fail(`${capitalize(shape)} için merkezi de yazın (ör. “A merkezli B’den C’ye ${shape} çiz”).`);
  if (through.length > 1) fail(`Merkezi belli ${shape} için başlangıç olarak tek bir nokta yazın (ör. “A merkezli, B’den başlayan ${shape} çiz”).`);
  if (through.length && ends.start) fail(`Başlangıç noktasını bir kez yazın (ör. “A merkezli B’den C’ye ${shape} çiz”).`);
  const startGroup = ends.start ?? through[0];
  const endGroup = ends.end;
  if (angles.start && startGroup) fail('Başlangıç açısı yalnızca başlangıç noktası yazılmadığında kullanılır.');
  if (endGroup && !startGroup) fail(`Başlangıç noktasını da yazın (ör. “A merkezli B’den C’ye ${shape} çiz”).`);
  if (radiusGroup && (startGroup || radius || angles.start)) fail(`${capitalize(shape)} için yarıçapı bir kez yazın: ya iki noktalı ad (ör. “A merkezli AB yarıçaplı ${shape}”) ya da başlangıç noktası veya sayı.`);
  const radiusSeg = radiusGroup ? groupPoints(scene, c, radiusGroup, pointColor) : undefined;
  if (radiusSeg && (radiusSeg.length !== 2 || radiusSeg[0].id === radiusSeg[1].id)) fail(`Yarıçap için iki noktalı bir ad yazın (ör. “A merkezli AB yarıçaplı ${shape} çiz”).`);

  const notes: string[] = [];
  const R0 = radius?.value;
  const center = radiusSeg && !centerSpec ? { point: radiusSeg[0], created: false } : resolveCenter(scene, c, centerSpec, startGroup ? undefined : () => {
    const r = R0 ?? (radiusSeg ? Math.hypot(radiusSeg[1].x - radiusSeg[0].x, radiusSeg[1].y - radiusSeg[0].y) : DEFAULT_ARC_RADIUS);
    return scene.placeShape(2 * r, 2 * r);
  }, pointColor);

  let startPt: PointObject;
  let R: number;
  if (radiusSeg) {
    const [p, q] = radiusSeg;
    if (center.point.id === p.id) startPt = q;
    else if (center.point.id === q.id) startPt = p;
    else {
      startPt = scene.addPoint({ x: center.point.x + q.x - p.x, y: center.point.y + q.y - p.y }, {
        construction: { kind: 'translate', sourceId: center.point.id, vectorPointIds: [p.id, q.id] }, color: pointColor,
      });
      notes.push(`Yarıçap |${p.label}${q.label}| ile eşit kalsın diye ${startPt.label} noktası oluşturuldu.`);
    }
    R = Math.hypot(startPt.x - center.point.x, startPt.y - center.point.y);
    if (R < 1e-9) fail('Yarıçapı veren iki nokta farklı konumda olmalı.');
  } else if (startGroup) {
    startPt = groupPoint(scene, c, startGroup, { role: 'Başlangıç noktası', color: pointColor }).point;
    R = Math.hypot(startPt.x - center.point.x, startPt.y - center.point.y);
    if (startPt.id === center.point.id || R < 1e-9) fail('Başlangıç noktası merkezle aynı konumda olamaz.');
    if (R0 !== undefined && Math.abs(R - R0) > 1e-6) fail(`${startPt.label} noktası merkeze ${trNum(R)} birim uzaklıkta; yarıçap ${trNum(R0)} olamaz. Yarıçapı yazmayın ya da başka bir başlangıç noktası seçin.`);
  } else {
    R = R0 ?? DEFAULT_ARC_RADIUS;
    if (R0 === undefined) notes.push(`Yarıçap yazılmadığı için ${DEFAULT_ARC_RADIUS} alındı.`);
    const a0 = (angles.start?.value ?? 0) * Math.PI / 180;
    startPt = pointAt(scene, { x: center.point.x + R * Math.cos(a0), y: center.point.y + R * Math.sin(a0) }, pointColor).point;
  }

  let s: PointObject, d: PointObject, degrees: number;
  if (endGroup) {
    const endResult = groupPoint(scene, c, endGroup, { role: 'Bitiş noktası', color: pointColor });
    let endPt = endResult.point;
    if (endPt.id === center.point.id || endPt.id === startPt.id) fail('Yayın merkezi, başlangıcı ve bitişi farklı noktalar olmalı.');
    const dist = Math.hypot(endPt.x - center.point.x, endPt.y - center.point.y);
    if (dist < 1e-9) fail('Bitiş noktası merkezle aynı konumda olamaz.');
    if (endResult.created && Math.abs(dist - R) > 1e-9) {
      // Araçtaki gibi yeni oluşturulan bitiş noktası yayın üzerine alınır.
      const k = R / dist;
      endPt = scene.update(endPt.id, { x: center.point.x + (endPt.x - center.point.x) * k, y: center.point.y + (endPt.y - center.point.y) * k }) as PointObject;
      notes.push(`${endPt.label} noktası yayın üzerine alındı.`);
    }
    [s, d] = clockwise ? [endPt, startPt] : [startPt, endPt];
    degrees = ccw(degreesOf(center.point, s), degreesOf(center.point, d));
    if (ends.between && degrees > 180) { [s, d] = [d, s]; degrees = 360 - degrees; }
    if (degrees < 1e-9) fail('Başlangıç ve bitiş noktaları merkezden aynı yönde; yay çizilemez.');
    if (sweep !== undefined && Math.abs(degrees - sweep) > 0.5) fail(`${s.label} ve ${d.label} noktaları merkezde ${trNum(degrees, 1)}° açı yapıyor; ${trNum(sweep)}° yazılamaz.`);
  } else {
    degrees = sweep ?? DEFAULT_SWEEP;
    if (sweep === undefined) notes.push(`Açı yazılmadığı için ${DEFAULT_SWEEP}° alındı.`);
    const signed = clockwise ? -degrees : degrees;
    const made = scene.addPoint(rotateAround(startPt, center.point, signed), {
      construction: { kind: 'rotate', sourceId: startPt.id, centerId: center.point.id, degrees: signed }, color: pointColor,
    });
    [s, d] = clockwise ? [made, startPt] : [startPt, made];
  }
  add(center.point.id, s.id, d.id);
  const what = info.sweepWord ? `${noun} (${trNum(degrees)}°)` : `${trNum(degrees, 1)}° ${noun}`;
  scene.say(`${pergel ? 'Pergelle m' : 'M'}erkezi ${center.point.label}${center.created ? ` ${at(center.point)}` : ''}, yarıçapı ${trNum(R)} olan ${what} çizildi: ${s.label} noktasından ${d.label} noktasına, saat yönünün tersine.${notes.length ? ` ${notes.join(' ')}` : ''}`);
}

const arc: CommandHandler = {
  id: 'circles.arc',
  examples: [
    'Yarıçapı 3 olan 90 derecelik yay çiz',
    "A merkezli B'den C'ye yay çiz",
    'A merkezli 120 derecelik yay çiz',
    "A merkezli, B'den başlayan 45° yay çiz",
    'Yarım çember çiz',
    'A, B ve C noktalarından geçen yay çiz',
    'Pergelle A merkezli 2 birim açıklıkla 60 derecelik yay çiz',
  ],
  match(c, scene) { return classify(prepareClause(c, scene))?.kind === 'arc' ? 50 : 0; },
  run: (c, scene) => runArcLike(prepareClause(c, scene), scene),
};

const sector: CommandHandler = {
  id: 'circles.sector',
  examples: [
    '60 derecelik daire dilimi çiz',
    'Yarım daire çiz',
    'Çeyrek daire çiz',
    "A merkezli B'den C'ye daire dilimi oluştur",
    'Yarıçapı 4 olan 135° daire dilimi çiz',
    'AB çaplı yarım daire çiz',
  ],
  match(c, scene) { return classify(prepareClause(c, scene))?.kind === 'sector' ? 50 : 0; },
  run: (c, scene) => runArcLike(prepareClause(c, scene), scene),
};

// ---------------------------------------------------------------------------
// Pergelin ucunu koymak

function compassPlacement(c: CircleClause): { spec: CenterSpec; used: Used } | null {
  if (!/\bpergel/.test(c.text) || c.negated || classify(c)) return null;
  if (c.hasVerb('delete', 'hide', 'move', 'rotate', 'reflect', 'translate', 'scale', 'copy', 'undo', 'redo', 'select', 'color', 'rename')) return null;
  const spec = findCenter(c, refGroups(c));
  if (!spec || !('group' in spec)) return null;
  const used = new Used(c);
  used.center(spec);
  return { spec, used };
}

const compass: CommandHandler = {
  id: 'circles.compass',
  examples: [
    'Pergeli A noktasına koy ve 3 birim açıklıkla çember çiz',
    "Pergelin ucunu B'ye koy, yarıçapı 2 olan çember çiz",
    'Pergeli C noktasına yerleştir ve 60 derecelik yay çiz',
    'Pergeli A noktasına koy ve yarıçapı 1 olan daire çiz',
    'Pergeli B noktasına koy ve çember çiz',
    'Pergelin ucunu A noktasına yerleştir ve 90 derecelik yay çiz',
  ],
  match(c, scene) { return compassPlacement(prepareClause(c, scene)) ? 50 : 0; },
  run(c, scene) {
    const p = prepareClause(c, scene);
    const parts = compassPlacement(p) ?? skip();
    parts.used.assertAllUsed('Pergeli A noktasına koy ve 3 birim açıklıkla çember çiz');
    const { point } = resolveCenter(scene, p, parts.spec, undefined, PERGEL);
    compassAnchor.set(scene, point.id);
    scene.setFocus([point.id]);
    scene.say(`Pergelin ucu ${point.label} noktasına kondu. Şimdi açıklığı yazın (ör. “3 birim açıklıkla çember çiz”).`);
  },
};

export const handlers: CommandHandler[] = [equation, circle, ellipse, arc, sector, compass];
