import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import type { MathObject, Point2D, PointObject, PolygonObject } from '@/types/math';
import { triangleCoordinates } from '../../commandBindings';
import type { CommandHandler } from '../types';
import type { Clause } from '../text';
import { areaModel } from './areaModel';
import { type CommandScene, colorIn, fail, skip, tidy, trNum } from '../scene';
import { type Analysis, type ShapeKind, Reader, analyze, isTriangle, ngonWord } from './polygons/analyze';
import { type TriangleFlags, readTriangle, triangleFlags, triangleLocal, validateType } from './polygons/triangle';
import { type Realized, type ShapePlan, type VertexSpec, fromCoordinates, fromPoints, names as joinNames, realize, vertexNote } from './polygons/place';
import {
  type LocalShape, defaultQuad, namedPolygonLayout, readKite, readParallelogram, readRectangle, readRegular, readRhombus, readSquare, readTrapezoid,
  regularSides,
} from './polygons/quads';

export const family = { id: 'polygons', title: 'Çokgenler' };

// ---------------------------------------------------------------------------
// Ortak yardımcılar
// ---------------------------------------------------------------------------

interface Roles {
  /** Köşe adları ("ABC", "A, B, C", "AB kenarlı" → [A, B]) */
  names?: string[];
  /** Adlar yalnızca bir kenardan mı geldi ("AB kenarlı kare") */
  edge: boolean;
  vertices: VertexSpec[];
  origin?: Point2D;
  corner?: { index: number; at: Point2D };
  /** Seçili ya da atıfla gösterilen noktalar ("seçili noktalardan", "bu noktalardan", "onları birleştirerek") */
  selected: PointObject[];
  count: number;
}

function splitLabel(scene: CommandScene, text: string): string[] {
  const existing = scene.pointsFromLabel(text);
  if (existing) return existing.map(p => p.label);
  return scene.splitNewLabels(text) ?? fail(`“${text}” köşe adlarına ayrılamadı. Köşeleri “ABC” ya da “A, B, C” biçiminde yazın.`);
}

/**
 * Önceki cümlede oluşturulan (odak) ya da kullanıcının seçtiği noktalar.
 * onlyPoints: kaynaktaki bütün nesneler nokta olmalı (adsız "üçgen çiz" gibi örtük kullanım için); ilk dolu kaynak karar verir.
 */
function contextPoints(scene: CommandScene, preferSelection: boolean, onlyPoints: boolean): PointObject[] {
  const sources = preferSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
  for (const ids of sources) {
    const objects = ids.map(id => scene.get(id)).filter((o): o is MathObject => !!o);
    if (!objects.length) continue;
    const points = objects.filter((o): o is PointObject => o.type === 'point');
    if (onlyPoints) return points.length === objects.length ? points : [];
    if (points.length) return points;
  }
  return [];
}

const CORNERS: Record<string, number> = { 'sol alt': 0, 'sag alt': 1, 'sag ust': 2, 'sol ust': 3 };

function readRoles(r: Reader, scene: CommandScene, c: Clause, a: Analysis): Roles {
  const roles: Roles = { vertices: [], selected: [], count: 1, edge: false };
  const coord = (ref: string) => c.coords[Number(ref.slice(1))];
  let m: RegExpMatchArray | null;
  if ((m = r.take(/ #(\d+) (?:tane|adet)\b/))) {
    const count = c.numbers[Number(m[1])];
    if (!Number.isInteger(count) || count < 1 || count > 10) fail('Tek seferde 1 ile 10 arasında şekil çizebilirim.');
    roles.count = count;
  }
  if ((m = r.take(/\bmerkez\w* (@\d+)|(@\d+) (?:noktasi )?merkezli/))) roles.origin = coord(m[1] ?? m[2]);
  else if ((m = r.take(/\$(\d+)(?!\d)[a-z]* (?:noktasi )?merkezli|\bmerkez\w* (?:noktasi )?\$(\d+)(?!\d)[a-z]*/))) {
    const label = c.labels[Number(m[1] ?? m[2])];
    const p = scene.findPoint(label.text) ?? fail(`${label.text} noktası bulunamadı. Merkezi koordinatla da yazabilirsiniz: “merkezi (2; 3) olan kare”.`);
    roles.origin = { x: p.x, y: p.y };
  }
  if ((m = r.take(/\b(?:(sol|sag) (alt|ust) )?kosesi (@\d+)|(@\d+) (?:noktasindan|konumundan) basla\w*|\bbaslangic\w* (?:noktasi )?(@\d+)/))) {
    const at = coord(m[3] ?? m[4] ?? m[5]);
    roles.corner = { index: m[1] ? CORNERS[`${m[1]} ${m[2]}`] : 0, at };
  }
  r.s = r.s.replace(/(?:\$(\d+)(?!\d)[a-z]* )?@(\d+)/g, (_, labelIndex: string | undefined, coordIndex: string) => {
    let name: string | undefined;
    if (labelIndex !== undefined) {
      const parts = splitLabel(scene, c.labels[Number(labelIndex)].text);
      if (parts.length !== 1) fail(`Her koordinatın önüne tek bir köşe adı yazın (ör. “A(0;0) B(4;0) C(1;3) üçgeni”).`);
      name = parts[0];
    }
    roles.vertices.push({ at: c.coords[Number(coordIndex)], name });
    return ' _ ';
  });
  if ((m = r.take(/\$(\d+)(?!\d)[a-z]* (?:kenar\w*(?: uzerine)?|uzerine|tabanli)\b(?! #)/))) {
    const parts = splitLabel(scene, c.labels[Number(m[1])].text);
    if (parts.length !== 2) fail('Kenarı iki köşe adıyla yazın (ör. “AB kenarlı kare çiz”).');
    roles.names = parts;
    roles.edge = true;
  }
  const main: string[] = [];
  r.s = r.s.replace(/\$(\d+)(?!\d)[a-z]*(?![a-z])(?! (?:#|acisi|kosesi|kosesindeki|kenari #|kenarinin))/g, (_, index: string) => {
    main.push(...splitLabel(scene, c.labels[Number(index)].text));
    return ' _ ';
  });
  if (main.length) {
    if (roles.names) fail('Köşe adlarını tek bir biçimde yazın: “ABCD karesi” ya da “AB kenarlı kare”.');
    roles.names = main;
  }
  if (c.refersToSelection || /\bsectig/.test(r.s)) {
    roles.selected = contextPoints(scene, true, false);
    if (!roles.selected.length) fail('Seçili nokta yok. Önce köşe olacak noktaları seçin ya da adlarını yazın (ör. “ABC üçgenini çiz”).');
  } else if (a.pointRef && !roles.names && !roles.vertices.length) {
    roles.selected = contextPoints(scene, false, false);
    if (!roles.selected.length) {
      fail('Hangi noktaları kastettiğinizi bulamadım: seçili ya da az önce oluşturulmuş nokta yok. Noktaları seçin ya da adlarını yazın (ör. “A, B ve C noktalarından üçgen çiz”).');
    }
  }
  if (roles.selected.length && (m = r.take(/#(\d+) (?=nokta)/))) {
    // "bu üç noktayı": sayı bir ölçü değil, gösterilen noktaların sayısıdır.
    const expected = c.numbers[Number(m[1])];
    if (expected !== roles.selected.length) fail(`${trNum(expected)} nokta yazdınız ama ${roles.selected.length} nokta seçili ya da az önce oluşturuldu (${roles.selected.map(p => p.label).join(', ')}).`);
  }
  return roles;
}

/**
 * Adı, koordinatı, ölçüsü verilmemiş şekil ("üçgen çiz", "dörtgen çiz") için az önce oluşturulan ya da seçili noktalar:
 * bunlar yalnızca noktalardan oluşuyor ve sayısı uyuyorsa şekil bu noktalardan kurulur.
 */
function implicitPoints(scene: CommandScene, roles: Roles, r: Reader, accept: (count: number) => boolean): PointObject[] | undefined {
  if (roles.names || roles.vertices.length || roles.selected.length || roles.count !== 1 || roles.origin || roles.corner || /#\d+/.test(r.s)) return undefined;
  const points = contextPoints(scene, false, true);
  return points.length && accept(points.length) ? points : undefined;
}

function compound(noun: string): string {
  if (/kare$/.test(noun)) return `${noun}si`;
  if (/yamuk$/.test(noun)) return noun.replace(/k$/, 'ğu');
  if (/paralelkenar$/.test(noun)) return `${noun}ı`;
  return `${noun}i`;
}

const dist = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);
type Named = Point2D & { label: string };
const edgeText = (points: Named[]) => points.map((p, i) => `|${p.label}${points[(i + 1) % points.length].label}| = ${trNum(dist(p, points[(i + 1) % points.length]))}`).join(', ');
const coordText = (points: PointObject[]) => points.map(p => `${p.label}(${trNum(p.x)}; ${trNum(p.y)})`).join(', ');
const notesText = (notes: string[]) => notes.length ? ` ${notes.join(' ')}` : '';

function announce(scene: CommandScene, result: Realized, noun: string, detail: string, notes: string[] = []) {
  const label = result.polygon.label;
  if (result.existed) {
    scene.setFocus([result.polygon.id]);
    scene.say(`${label} ${compound(noun)} zaten var.`);
    return;
  }
  scene.say(`${label} ${compound(noun)} çizildi${detail ? ` (${detail})` : ''}.${notesText(notes)}${vertexNote(result)}`);
}

function planFrom(shape: LocalShape, roles: Roles, color: string | undefined, extra: Partial<ShapePlan> = {}): ShapePlan {
  let local = shape.local;
  if (roles.origin && !shape.originCentered) {
    const cx = local.reduce((s, p) => s + p.x, 0) / local.length, cy = local.reduce((s, p) => s + p.y, 0) / local.length;
    local = local.map(p => ({ x: p.x - cx, y: p.y - cy }));
  }
  if (roles.corner && roles.corner.index >= local.length) fail('Bu köşe bu şekilde yok.');
  return {
    noun: shape.noun, local, names: roles.names, kind: shape.kind, pointColor: shape.pointColor, label: shape.label, color, scalable: !shape.explicit,
    origin: roles.origin, vertexAt: roles.corner, snap: shape.snap, originCentered: shape.originCentered, ...extra,
  };
}

function createMany(scene: CommandScene, roles: Roles, build: () => ShapePlan, afterEach: (result: Realized) => void) {
  if (roles.count > 1 && (roles.names || roles.vertices.length || roles.origin || roles.corner)) fail('Adı ya da konumu verilen şekilden tek seferde bir tane çizebilirim.');
  for (let i = 0; i < roles.count; i++) afterEach(realize(scene, build()));
}

function score(c: Clause, scene: CommandScene, kinds: ShapeKind[], accept: (a: Analysis) => boolean = () => true): number {
  const a = analyze(c, scene);
  if (!a || !kinds.includes(a.shape) || !accept(a)) return 0;
  return a.strongCreate || a.olsun || a.modifyForm || a.hasParams ? 50 : 47;
}

function start(c: Clause, scene: CommandScene, kinds: ShapeKind[]): { a: Analysis; r: Reader; roles: Roles } {
  const a = analyze(c, scene);
  if (!a || !kinds.includes(a.shape)) skip();
  const r = new Reader(c, a.t);
  return { a, r, roles: readRoles(r, scene, c, a) };
}

function noNumbers(r: Reader, message: string) {
  if (/#\d+/.test(r.s)) fail(message);
}

/** Noktaları sırayla birleştiren genel çokgen (kenarlar kesişirse sıra düzeltilir). */
function joinPoints(scene: CommandScene, points: PointObject[], noun: string, color: string | undefined, notes: string[] = []) {
  const result = fromPoints(scene, points, { noun, kind: 'polygon', color });
  announce(scene, result, noun, `${result.points.length} köşe`, notes);
}

// ---------------------------------------------------------------------------
// Üçgen
// ---------------------------------------------------------------------------

function triangleTarget(scene: CommandScene, c: Clause, roles: Roles): PolygonObject | undefined {
  if (roles.names) {
    if (roles.names.length !== 3) return undefined;
    const pts = roles.names.map(n => scene.findPoint(n));
    if (pts.some(p => !p)) return undefined;
    return scene.shapesWithPoints(pts.map(p => p!.id), ['polygon'])[0] as PolygonObject | undefined;
  }
  if (!scene.objects.some(isTriangle)) return undefined;
  return scene.targets(c, { types: ['polygon'], noun: 'üçgen', filter: isTriangle, useLabels: false })[0] as PolygonObject;
}

function freeVertices(polygon: PolygonObject, points: PointObject[]) {
  const bound = points.filter(p => p.construction);
  if (bound.length) {
    fail(`${polygon.label} üçgeninin ${bound.map(p => p.label).join(', ')} köşesi kaydırıcıya ya da başka bir inşaya bağlı. Önce bağı kaldırın (ör. “üçgenin kaydırıcı bağını kaldır”) ya da kaydırıcıların değerini değiştirin.`);
  }
}

function modifyTriangle(scene: CommandScene, r: Reader, polygon: PolygonObject) {
  const [A, B, C] = scene.vertices(polygon);
  freeVertices(polygon, [A, B, C]);
  const result = readTriangle(r, text => splitLabel(scene, text), [A.label, B.label, C.label]);
  if (!result.explicit) fail('Üçgenin yeni ölçülerini yazın. Örneğin: “üçgenin kenarları 3, 4 ve 5 olsun”.');
  const angle = Math.atan2(B.y - A.y, B.x - A.x);
  const orientation = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x) < 0 ? -1 : 1;
  const local = triangleCoordinates(result.ab, result.bc, result.ca);
  const place = (p: Point2D) => ({ x: tidy(A.x + p.x * Math.cos(angle) - p.y * Math.sin(angle)), y: tidy(A.y + p.x * Math.sin(angle) + p.y * Math.cos(angle)) });
  scene.update(B.id, place({ x: result.ab, y: 0 }));
  scene.update(C.id, place({ x: local.x, y: local.y * orientation }));
  scene.update(polygon.id, { edgeLabels: [0, 1, 2] });
  scene.setFocus([polygon.id]);
  scene.say(`${polygon.label} üçgeninin kenarları değiştirildi: |${A.label}${B.label}| = ${trNum(result.ab)}, |${B.label}${C.label}| = ${trNum(result.bc)}, |${C.label}${A.label}| = ${trNum(result.ca)}; ${A.label} köşesi yerinde kaldı.${notesText(result.notes)}`);
}

const hasType = (f: TriangleFlags) => f.equilateral || f.isosceles || f.right || f.scalene || f.obtuse || f.acute;

/** Noktalar istenen üçgen türünü sağlamıyor mu? */
function breaksType(points: Point2D[], flags: TriangleFlags): boolean {
  const [A, B, C] = points;
  try { validateType(dist(A, B), dist(B, C), dist(C, A), flags); return false; } catch { return true; }
}

interface Retype { equilateral: boolean; isosceles: boolean; right: boolean }

/** "ABC üçgeni eşkenar olsun", "üçgen dik olsun", "üçgenin kenarları eşit olsun": ölçüsüz tür değiştirme isteği mi? */
function retypeRequest(scene: CommandScene, c: Clause, a: Analysis, r: Reader, roles: Roles, flags: TriangleFlags): { target: PolygonObject; want: Retype } | undefined {
  const want: Retype = {
    equilateral: flags.equilateral || /\bkenar(?:lari|larinin)? (?:birbirine )?esit\b/.test(r.s),
    isosceles: flags.isosceles,
    right: flags.right || /\bucgen\w* (?:bir )?(?:ikizkenar )?dik\b(?! kenar)/.test(r.s),
  };
  if (!(want.equilateral || want.isosceles || want.right)) return undefined;
  if (/#\d+/.test(r.s) || a.strongCreate || !a.weakOnly) return undefined;
  if (roles.vertices.length || roles.selected.length || roles.count !== 1 || roles.origin || roles.corner || roles.edge) return undefined;
  if (roles.names) {
    const target = roles.names.length === 3 ? triangleTarget(scene, c, roles) : undefined;
    return target ? { target, want } : undefined;
  }
  // Adsız: sıfat şekil adından sonra gelmeli ("üçgen eşkenar olsun"); "eşkenar üçgen olsun" yeni şekil isteğidir.
  const afterNoun = a.modifyForm || /\bucgen\w* (?:bir )?(?:eskenar|ikizkenar|dik|esit)\b/.test(r.s);
  if (!afterNoun || !scene.objects.some(isTriangle)) return undefined;
  const target = triangleTarget(scene, c, roles);
  return target ? { target, want } : undefined;
}

/** A ve B yerinde kalır; C, istenen türü sağlayacak biçimde (aynı tarafta) taşınır. */
function retypeTriangle(scene: CommandScene, polygon: PolygonObject, want: Retype) {
  const [A, B, C] = scene.vertices(polygon);
  const noun = want.equilateral ? 'eşkenar üçgen' : want.right && want.isosceles ? 'ikizkenar dik üçgen' : want.right ? 'dik üçgen' : 'ikizkenar üçgen';
  const flags: TriangleFlags = { equilateral: want.equilateral, isosceles: want.isosceles && !want.equilateral, right: want.right && !want.equilateral, scalene: false, obtuse: false, acute: false };
  scene.setFocus([polygon.id]);
  if (!breaksType([A, B, C], flags)) {
    scene.say(`${polygon.label} üçgeni zaten ${noun}.`);
    return;
  }
  freeVertices(polygon, [C]);
  const ab = dist(A, B);
  const u = { x: (B.x - A.x) / ab, y: (B.y - A.y) / ab }, n = { x: -u.y, y: u.x };
  const cross = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
  const side = cross < 0 ? -1 : 1;
  const height = Math.abs(cross) / ab;
  const along = ((C.x - A.x) * u.x + (C.y - A.y) * u.y) / ab;
  const at = (t: number, h: number) => ({ x: tidy(A.x + u.x * ab * t + n.x * side * h), y: tidy(A.y + u.y * ab * t + n.y * side * h) });
  const angleAt = (p: Point2D, q: Point2D, s: Point2D) => {
    const v1 = { x: p.x - q.x, y: p.y - q.y }, v2 = { x: s.x - q.x, y: s.y - q.y };
    return Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y))))) * 180 / Math.PI;
  };
  let target: Point2D;
  let detail = '';
  if (want.equilateral) target = at(0.5, ab * Math.sqrt(3) / 2);
  else if (want.right && want.isosceles) { target = at(0.5, ab / 2); detail = `${C.label} açısı 90°`; }
  else if (want.right) {
    const angles = { A: angleAt(C, A, B), B: angleAt(A, B, C), C: angleAt(A, C, B) };
    const nearest = (['A', 'B', 'C'] as const).reduce((best, k) => Math.abs(angles[k] - 90) < Math.abs(angles[best] - 90) ? k : best, 'B' as 'A' | 'B' | 'C');
    if (nearest === 'A') target = at(0, height);
    else if (nearest === 'B') target = at(1, height);
    else { const t = Math.min(0.85, Math.max(0.15, along)); target = at(t, ab * Math.sqrt(t * (1 - t))); }
    detail = `${{ A, B, C }[nearest].label} açısı 90°`;
  } else { target = at(0.5, height); detail = `|${C.label}${A.label}| = |${C.label}${B.label}|`; }
  scene.update(C.id, target);
  const moved = { ...C, ...target };
  scene.say(`${polygon.label} üçgeni ${noun} yapıldı: ${edgeText([A, B, moved])}${detail ? `; ${detail}` : ''}. ${A.label} ve ${B.label} yerinde kaldı, ${C.label} taşındı.`);
}

const triangle: CommandHandler = {
  id: 'polygons.triangle',
  examples: [
    'Üçgen çiz',
    '3 4 5 üçgeni olsun',
    'Kenarları 3, 4 ve 5 olan üçgen çiz',
    'Kenarı 6 olan eşkenar üçgen çiz',
    'Tabanı 6, yan kenarları 5 olan ikizkenar üçgen çiz',
    'Dik kenarları 3 ve 4 olan dik üçgen çiz',
    'Hipotenüsü 10, bir dik kenarı 6 olan dik üçgen çiz',
    'İki kenarı 5 ve 7, arasındaki açı 60 derece olan üçgen çiz',
    'Açıları 30, 60 ve 90 derece olan üçgen çiz',
    'Tabanı 6 yüksekliği 4 olan üçgen çiz',
    'Köşeleri (0; 0), (4; 0), (1; 3) olan üçgen çiz',
    'ABC üçgenini çiz',
    'Geniş açılı üçgen çiz',
    'ABC üçgeninin kenarları 5, 6 ve 7 olsun',
    'ABC üçgeni eşkenar olsun',
  ],
  match: (c, scene) => score(c, scene, ['triangle']),
  run(c, scene) {
    const { a, r, roles } = start(c, scene, ['triangle']);
    const color = colorIn(c);
    const flags = triangleFlags(r.s);

    const retype = retypeRequest(scene, c, a, r, roles, flags);
    if (retype) return retypeTriangle(scene, retype.target, retype.want);

    const hasNumbers = /#\d+/.test(r.s);
    const wantsModify = a.modifyForm || (a.olsun && a.weakOnly && hasNumbers && !roles.vertices.length && !roles.selected.length && roles.count === 1 && !roles.origin && !roles.corner);
    if (wantsModify) {
      const target = triangleTarget(scene, c, roles);
      if (target) return modifyTriangle(scene, r, target);
      if (a.modifyForm) fail('Değiştirilecek üçgen bulunamadı. Önce bir üçgen çizin ya da adını yazın (ör. “ABC üçgeninin kenarları 3, 4 ve 5 olsun”).');
    }

    if (roles.vertices.length) {
      if (roles.vertices.length !== 3) fail('Üçgen için üç köşe koordinatı yazın. Örneğin: “köşeleri (0; 0), (4; 0), (1; 3) olan üçgen çiz”.');
      noNumbers(r, 'Koordinatlar üçgeni zaten belirler; ayrıca ölçü yazmayın.');
      const given = roles.names ?? [];
      let next = 0;
      const vertices = roles.vertices.map(v => v.name ? v : { ...v, name: given[next++] });
      const result = fromCoordinates(scene, vertices, { noun: 'üçgen', kind: 'triangle', color });
      return announce(scene, result, 'üçgen', coordText(result.points));
    }
    const implicit = hasType(flags) ? undefined : implicitPoints(scene, roles, r, count => count === 3);
    const chosen = roles.selected.length ? roles.selected : implicit;
    if (chosen) {
      if (chosen.length !== 3) fail(`Üçgen için üç nokta gerekir; ${chosen.length} nokta ${roles.selected.length ? 'seçili ya da gösterilen' : 'var'} (${joinNames(chosen)}). Üç nokta seçin ya da adlarını yazın (ör. “ABC üçgenini çiz”).`);
      noNumbers(r, 'Seçili noktalar üçgeni zaten belirler; ayrıca ölçü yazmayın.');
      const result = fromPoints(scene, chosen, { noun: 'üçgen', kind: 'triangle', color });
      if (hasType(flags) && breaksType(result.points, flags)) {
        fail(`${joinNames(result.points)} noktaları ${readTriangleNoun(flags)} oluşturmuyor (${edgeText(result.points)}).`);
      }
      return announce(scene, result, 'üçgen', edgeText(result.points));
    }
    if (roles.names && roles.names.length > 3) fail(`Üçgenin üç köşesi olur; ${roles.names.join('')} yerine “ABC üçgeni” gibi yazın.`);
    if (roles.names && roles.names.length < 3 && !roles.edge) fail('Üçgenin üç köşe adını yazın (ör. “DEF üçgeni oluştur”).');

    const spec = readTriangle(r, text => splitLabel(scene, text), roles.names?.length === 3 ? roles.names : undefined);
    const vertexNames = roles.names ?? spec.names;
    const allExisting = vertexNames?.length === 3 && vertexNames.every(n => scene.findPoint(n));
    const shape: LocalShape = { local: triangleLocal(spec.ab, spec.bc, spec.ca), notes: spec.notes, explicit: spec.explicit, summary: '', kind: 'triangle', noun: spec.noun, snap: true };
    createMany(scene, roles, () => planFrom(shape, { ...roles, names: vertexNames }, color, (allExisting && !spec.explicit) || scene.options.showMeasurementsOnCreate === false ? {} : { edgeLabels: [0, 1, 2] }), result => {
      const label = result.polygon.label;
      if (result.reused.length === 3 && hasType(spec.flags) && breaksType(result.points, spec.flags)) {
        const adjective = spec.noun.replace(/ üçgen$/, '');
        const hint = ` Değiştirmek için “${label} üçgeni ${adjective} olsun” yazabilirsiniz.`;
        if (result.existed) {
          scene.setFocus([result.polygon.id]);
          scene.say(`${label} üçgeni zaten var; ancak ${spec.noun} değil (${edgeText(result.points)}).${hint}`);
        } else {
          scene.say(`${label} üçgeni çizildi; ancak ${joinNames(result.points)} noktaları ${spec.noun} oluşturmuyor (${edgeText(result.points)}).${hint}`);
        }
        return;
      }
      const notes = result.scale !== 1 && Math.abs(result.scale - 1) > 1e-9 ? [] : spec.notes;
      announce(scene, result, spec.noun, edgeText(result.points), result.reused.length === 3 ? [] : notes);
    });
  },
};

function readTriangleNoun(flags: TriangleFlags): string {
  if (flags.equilateral) return 'eşkenar üçgen';
  if (flags.right && flags.isosceles) return 'ikizkenar dik üçgen';
  if (flags.right) return 'dik üçgen';
  if (flags.isosceles) return 'ikizkenar üçgen';
  if (flags.scalene) return 'çeşitkenar üçgen';
  if (flags.obtuse) return 'geniş açılı üçgen';
  return 'dar açılı üçgen';
}

// ---------------------------------------------------------------------------
// Kare, dikdörtgen
// ---------------------------------------------------------------------------

const square: CommandHandler = {
  id: 'polygons.square',
  examples: [
    'Kare çiz',
    'Kenar uzunluğu 4 olan kare çiz',
    'Kenarı 5 cm olan kare çiz',
    'Alanı 16 olan kare çiz',
    'Köşegeni 6 olan kare çiz',
    'AB kenarlı kare çiz',
    'ABCD karesini çiz',
    'Merkezi (2; 3) olan kare çiz',
  ],
  match: (c, scene) => score(c, scene, ['square']),
  run(c, scene) {
    const { r, roles } = start(c, scene, ['square']);
    const color = colorIn(c);
    if (roles.vertices.length) return quadFromCoordinates(scene, roles, r, 'kare', 'square', color);
    const shape = readSquare(r);
    if (roles.names && roles.names.length !== 4 && !roles.edge) fail('Karenin dört köşe adını yazın (ör. “ABCD karesi”) ya da bir kenarını verin (ör. “AB kenarlı kare”).');
    createMany(scene, roles, () => planFrom(shape, roles, color), result => {
      const [p0, p1, p2, p3] = result.points;
      if (result.reused.length === 4 && !isSquare([p0, p1, p2, p3])) {
        scene.update(result.polygon.id, { color: NESNE_RENGI.zumrut, fillColor: NESNE_RENGI.zumrut });
        scene.say(`${result.polygon.label} dörtgeni çizildi; ancak ${result.polygon.label} köşeleri tam bir kare oluşturmuyor.${vertexNote(result)}`);
        return;
      }
      announce(scene, result, 'kare', `kenar ${trNum(dist(p0, p1))} br`, shape.notes);
    });
  },
};

function isSquare(p: Point2D[]): boolean {
  const s = [0, 1, 2, 3].map(i => dist(p[i], p[(i + 1) % 4]));
  return s.every(x => Math.abs(x - s[0]) < 1e-6) && Math.abs(dist(p[0], p[2]) - dist(p[1], p[3])) < 1e-6;
}

function quadFromCoordinates(scene: CommandScene, roles: Roles, r: Reader, noun: string, kind: 'square' | 'rectangle' | 'polygon', color: string | undefined) {
  if (roles.vertices.length !== 4) fail(`${noun[0].toLocaleUpperCase('tr') + noun.slice(1)} için dört köşe koordinatı yazın ya da ölçü verin (ör. “kenarı 4 olan ${noun}”).`);
  noNumbers(r, 'Koordinatlar şekli zaten belirler; ayrıca ölçü yazmayın.');
  const given = roles.names ?? [];
  let next = 0;
  const vertices = roles.vertices.map(v => v.name ? v : { ...v, name: given[next++] });
  const result = fromCoordinates(scene, vertices, { noun, kind, color, ...(kind !== 'polygon' ? { pointColor: NESNE_RENGI.mavi } : {}) });
  announce(scene, result, noun, coordText(result.points));
}

const rectangle: CommandHandler = {
  id: 'polygons.rectangle',
  examples: [
    'Dikdörtgen çiz',
    '3 5 dikdörtgen çiz',
    '3x4 dikdörtgen çiz',
    'Eni 3 boyu 5 olan dikdörtgen çiz',
    'Genişliği 6 yüksekliği 2 olan dikdörtgen çiz',
    'Alanı 12, bir kenarı 3 olan dikdörtgen çiz',
    'Uzun kenarı 8, kısa kenarı 3 olan dikdörtgen çiz',
  ],
  match: (c, scene) => score(c, scene, ['rectangle']),
  run(c, scene) {
    const { r, roles } = start(c, scene, ['rectangle']);
    const color = colorIn(c);
    if (roles.vertices.length) return quadFromCoordinates(scene, roles, r, 'dikdörtgen', 'rectangle', color);
    const shape = readRectangle(r);
    if (roles.names && roles.names.length !== 4 && !roles.edge) fail('Dikdörtgenin dört köşe adını yazın (ör. “ABCD dikdörtgeni”) ya da bir kenarını verin (ör. “AB kenarlı dikdörtgen”).');
    createMany(scene, roles, () => planFrom(shape, roles, color), result => {
      const [p0, p1, p2] = result.points;
      announce(scene, result, 'dikdörtgen', `${trNum(dist(p0, p1))} × ${trNum(dist(p1, p2))} br`, shape.notes);
    });
  },
};

// ---------------------------------------------------------------------------
// Düzgün çokgen
// ---------------------------------------------------------------------------

const NGON_NOUNS: Record<number, string> = { 3: 'üçgen', 4: 'dörtgen', 5: 'beşgen', 6: 'altıgen', 7: 'yedigen', 8: 'sekizgen', 9: 'dokuzgen', 10: 'ongen', 11: 'onbirgen', 12: 'onikigen' };
const ngonNoun = (n: number) => NGON_NOUNS[n] ?? `${n}-gen`;

function isRegularPoints(p: Point2D[]): boolean {
  const n = p.length;
  const sides = p.map((q, i) => dist(q, p[(i + 1) % n]));
  const chords = p.map((q, i) => dist(q, p[(i + 2) % n]));
  const same = (xs: number[]) => xs.every(x => Math.abs(x - xs[0]) < 1e-6 * Math.max(1, xs[0]));
  return same(sides) && same(chords);
}

/** "köşeleri (…) olan beşgen", "bu noktaları birleştirerek altıgen çiz", "ABCDE beşgeni" (noktalar sahnede): verilen köşelerle çokgen. */
function ngonFromInputs(scene: CommandScene, roles: Roles, r: Reader, points: PointObject[] | undefined, color: string | undefined, regularWord: boolean) {
  const count = points?.length ?? roles.vertices.length;
  const n = regularSides(r);
  if (n !== undefined && n !== count) fail(`${ngonNoun(n)[0].toLocaleUpperCase('tr')}${ngonNoun(n).slice(1)} için ${n} köşe gerekir; ${count} köşe verildi.`);
  if (count < 3) fail('Çokgen için en az üç köşe gerekir.');
  const noun = ngonNoun(count);
  let result: Realized;
  if (points) {
    result = fromPoints(scene, points, { noun, kind: 'polygon', color });
  } else {
    noNumbers(r, 'Koordinatlar çokgeni zaten belirler; ayrıca ölçü yazmayın.');
    const given = roles.names ?? [];
    let next = 0;
    result = fromCoordinates(scene, roles.vertices.map(v => v.name ? v : { ...v, name: given[next++] }), { noun, kind: 'polygon', color });
  }
  const notes = regularWord && !isRegularPoints(result.points) ? [`Köşeler düzgün ${noun} oluşturmuyor; verilen köşelerle çizildi.`] : [];
  announce(scene, result, noun, points ? `${count} köşe` : coordText(result.points), notes);
}

const regular: CommandHandler = {
  id: 'polygons.regular',
  examples: [
    '6 kenarlı düzgün çokgen çiz',
    'Düzgün altıgen çiz',
    'Düzgün beşgen çiz',
    'Kenar uzunluğu 2 olan düzgün sekizgen çiz',
    'Yarıçapı 3 olan düzgün 7-gen çiz',
    '12 kenarlı düzgün çokgen çiz',
    '5 köşeli çokgen çiz',
    'AB kenarlı düzgün altıgen çiz',
  ],
  match: (c, scene) => score(c, scene, ['regular']),
  run(c, scene) {
    const { a, r, roles } = start(c, scene, ['regular']);
    const color = colorIn(c);
    const regularWord = /\bduzgun\b/.test(a.t);
    if (roles.selected.length) return ngonFromInputs(scene, roles, r, roles.selected, color, regularWord);
    if (roles.vertices.length) {
      if (regularWord && !ngonWord(a.t)) fail('Düzgün çokgen için kenar sayısı ve kenar ya da yarıçap yazın (ör. “kenarı 2 olan düzgün sekizgen”). Köşeleri verilen çokgen için “… köşeli çokgen” yazın.');
      return ngonFromInputs(scene, roles, r, undefined, color, regularWord);
    }
    const word = ngonWord(a.t);
    if (roles.names && !roles.edge && roles.names.length === word) {
      const found = roles.names.map(name => scene.findPoint(name));
      if (found.every(Boolean)) return ngonFromInputs(scene, roles, r, found as PointObject[], color, regularWord);
    }
    const implicit = !regularWord && word ? implicitPoints(scene, roles, r, count => count === word) : undefined;
    if (implicit) return ngonFromInputs(scene, roles, r, implicit, color, false);
    const shape = readRegular(r, roles.edge ? undefined : roles.names?.length);
    const n = shape.local.length;
    if (roles.names && !roles.edge && roles.names.length !== n) fail(`${shape.label} için ${n} köşe adı yazın; ${roles.names.join('')} ${roles.names.length} köşe veriyor.`);
    const notes = [...shape.notes];
    if (!regularWord) notes.push('Düzgün çokgen olarak çizildi.');
    createMany(scene, roles, () => planFrom(shape, roles, color), result => {
      const pts = result.points;
      const side = dist(pts[0], pts[1]);
      const radius = side / (2 * Math.sin(Math.PI / n));
      if (result.existed) return announce(scene, result, 'çokgen', '');
      scene.say(`${shape.label} çizildi: ${joinNames(pts)}, kenar ${trNum(side)} br, yarıçap ${trNum(radius)} br.${notesText(notes)}${vertexNote(result)}`);
    });
  },
};

// ---------------------------------------------------------------------------
// Dörtgenler: paralelkenar, eşkenar dörtgen, yamuk, deltoid, genel dörtgen
// ---------------------------------------------------------------------------

const QUAD_KINDS: ShapeKind[] = ['parallelogram', 'rhombus', 'trapezoid', 'kite', 'quad'];
const hasVertexInput = (c: Clause, a: Analysis) => c.coords.length > 0 || c.refersToSelection || a.pointRef || c.labels.some(l => !l.lowercase || l.text.length > 1);

const quadrilateral: CommandHandler = {
  id: 'polygons.quadrilateral',
  examples: [
    'Paralelkenar çiz',
    'Kenarları 5 ve 3, açısı 60 derece olan paralelkenar çiz',
    'Kenarı 4, açısı 60 derece olan eşkenar dörtgen çiz',
    'Köşegenleri 6 ve 8 olan eşkenar dörtgen çiz',
    'Tabanları 6 ve 4, yüksekliği 3 olan yamuk çiz',
    'İkizkenar yamuk çiz',
    'Dik yamuk çiz',
    'Köşegenleri 6 ve 4 olan deltoid çiz',
    'Dörtgen çiz',
  ],
  match: (c, scene) => score(c, scene, QUAD_KINDS, a => a.shape !== 'quad' || !hasVertexInput(c, a)),
  run(c, scene) {
    const { a, r, roles } = start(c, scene, QUAD_KINDS);
    const color = colorIn(c);
    if (roles.vertices.length) return quadFromCoordinates(scene, roles, r, 'dörtgen', 'polygon', color);
    if (a.shape === 'quad') {
      if (roles.names?.length || roles.selected.length) skip();
      const implicit = implicitPoints(scene, roles, r, count => count === 4);
      if (implicit) return joinPoints(scene, implicit, 'dörtgen', color);
    }
    const shape = a.shape === 'parallelogram' ? readParallelogram(r)
      : a.shape === 'rhombus' ? readRhombus(r)
        : a.shape === 'trapezoid' ? readTrapezoid(r)
          : a.shape === 'kite' ? readKite(r)
            : defaultQuad(r);
    if (roles.names && roles.names.length !== 4 && !roles.edge) fail(`${compound(shape.noun)} için dört köşe adı yazın (ör. “ABCD ${compound(shape.noun)}”).`);
    createMany(scene, roles, () => planFrom(shape, roles, color), result => announce(scene, result, shape.noun, shape.explicit || !result.reused.length ? shape.summary : '', shape.notes));
  },
};

// ---------------------------------------------------------------------------
// Köşeleri verilen genel çokgen
// ---------------------------------------------------------------------------

const general: CommandHandler = {
  id: 'polygons.general',
  examples: [
    'ABCDE çokgenini çiz',
    '(0; 0), (4; 0), (4; 3), (0; 3) köşeli çokgen çiz',
    'A(0; 0), B(5; 0), C(4; 3), D(1; 3) dörtgenini çiz',
    'A, B, C ve D noktalarından dörtgen oluştur',
    'Seçili noktalardan çokgen oluştur',
  ],
  match(c, scene) {
    const a = analyze(c, scene);
    if (!a) return 0;
    if (a.shape === 'polygon') return a.hasParams || a.pointRef ? 42 : 38;
    if (a.shape === 'quad' && hasVertexInput(c, a)) return 42;
    return 0;
  },
  run(c, scene) {
    const { a, r, roles } = start(c, scene, ['polygon', 'quad']);
    const color = colorIn(c);
    const quad = a.shape === 'quad';
    const noun = quad ? 'dörtgen' : 'çokgen';
    const need = (count: number) => {
      if (count < 3) fail(`Çokgen için en az üç köşe gerekir; ${count} köşe verildi.`);
      if (quad && count !== 4) fail(`Dörtgenin dört köşesi olur; ${count} köşe verildi.`);
      if (count > 60) fail('Çokgen en fazla 60 köşeli olabilir.');
    };
    if (roles.vertices.length) {
      need(roles.vertices.length);
      noNumbers(r, 'Koordinatlar çokgeni zaten belirler; ayrıca ölçü yazmayın.');
      const given = roles.names ?? [];
      let next = 0;
      const vertices = roles.vertices.map(v => v.name ? v : { ...v, name: given[next++] });
      const result = fromCoordinates(scene, vertices, { noun, kind: 'polygon', color });
      return announce(scene, result, noun, coordText(result.points));
    }
    if (roles.selected.length) {
      need(roles.selected.length);
      return joinPoints(scene, roles.selected, noun, color);
    }
    if (roles.names) {
      need(roles.names.length);
      noNumbers(r, `Köşe adlarıyla birlikte ölçü yazmayın. Düzgün çokgen için “kenarı 2 olan düzgün beşgen” yazın.`);
      const found = roles.names.map(n => scene.findPoint(n));
      if (found.every(Boolean)) return joinPoints(scene, found as PointObject[], noun, color);
      if (found.some(Boolean)) {
        const missing = roles.names.filter((_, i) => !found[i]);
        fail(`${missing.join(', ')} ${missing.length > 1 ? 'noktaları' : 'noktası'} yok. Önce bu noktaları oluşturun ya da köşeleri koordinatlarıyla yazın (ör. “A(0; 0), B(4; 0), C(2; 3) köşeli çokgen”).`);
      }
      const shape = quad ? defaultQuad(r) : namedPolygonLayout(roles.names.length);
      const result = realize(scene, planFrom(shape, roles, color));
      return announce(scene, result, noun, `${result.points.length} köşe`, shape.notes);
    }
    if (quad) skip();
    const implicit = implicitPoints(scene, roles, r, count => count >= 3 && count <= 60);
    if (implicit) return joinPoints(scene, implicit, noun, color);
    noNumbers(r, 'Kaç köşeli olduğunu yazın: “5 köşeli çokgen çiz” düzgün çokgen çizer; köşeleri vermek için “(0; 0), (4; 0), (2; 3) köşeli çokgen çiz” yazın.');
    scene.act({ kind: 'selectTool', tool: 'polygon' });
    scene.say('Çokgen aracı seçildi: köşelere sırayla tıklayın ve ilk noktaya tıklayarak kapatın. Yazarak çizmek için “(0; 0), (4; 0), (2; 3) köşeli çokgen çiz” ya da “5 kenarlı düzgün çokgen çiz” yazabilirsiniz.');
  },
};

export const handlers: CommandHandler[] = [triangle, square, rectangle, regular, quadrilateral, areaModel, general];
