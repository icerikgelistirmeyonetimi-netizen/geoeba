import type { MathObject, ObjectType, Point2D, PointObject } from '@/types/math';
import { createId } from '@/state/ids';
import { functionNameOf } from '@/math/functionNames';
import { reflectAcross, rotateAround } from '../../../commandBindings';
import { COLORS, type CommandScene, fail, tidy, trNum } from '../../scene';
import { type Clause, type LabelRef, type VerbKind, STOPWORDS, fold, labelKey, parseClause } from '../../text';

/**
 * Dönüşümler (yansıma, döndürme, öteleme, homotete) için ortak çözümleme ve çizim yardımcıları.
 * Görüntüler CANLIDIR: her görüntü noktası kaynağına bir construction ile bağlanır.
 */

export type Construction = NonNullable<PointObject['construction']>;
export const TRANSFORMABLE: ObjectType[] = ['point', 'segment', 'line', 'ray', 'polygon', 'circle', 'ellipse', 'arc', 'sector', 'angle'];

export const dist = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);
/** Tam sayıya çok yakın değerleri yuvarlar; diğerlerini olduğu gibi bırakır (tidy 9 basamağa keser). */
export const soft = (n: number) => { const r = Math.round(n); return Math.abs(n - r) < 1e-9 ? r : n; };
export const fmt = (p: Point2D) => `(${trNum(p.x)}; ${trNum(p.y)})`;
const unique = <T,>(items: T[]) => [...new Set(items)];

// ---------------------------------------------------------------------------
// Cümleyi hazırlama: denklemli eksenler ve "O" etiketi
// ---------------------------------------------------------------------------

export type Equation = { kind: 'vertical'; x: number } | { kind: 'slope'; m: number; n: number };
export interface Prepared { c: Clause; t: string; equations: Equation[] }

/** x = 3, y = -x, y = 2x + 1, x = y … (yansıma ekseni olarak) */
const EQUATION = /(?<![\p{L}\p{N}_'’])([xyXY])\s*=\s*((?:[-−+]\s*)?(?:\d+(?:[.,]\d+)?\s*\*?\s*)?[xyXY]?)((?:\s*[-−+]\s*\d+(?:[.,]\d+)?)?)(?![\p{L}\p{N}_(^*/])/gu;
const REFLECT_HINT = /yansit|aynala|simetri|yansima|gore/;

function parseEquation(name: string, a: string, b: string): Equation | null {
  const rhs = `${a}${b}`.replace(/[\s*]/g, '').replace(/−/g, '-').replace(/,/g, '.').toLowerCase();
  if (!rhs || rhs.includes(name)) return null;
  const other = name === 'y' ? 'x' : 'y';
  const coef = (s: string) => (s === '' || s === '+' ? 1 : s === '-' ? -1 : Number(s));
  const linear = rhs.match(new RegExp(`^([+-]?\\d*(?:\\.\\d+)?)${other}([+-]\\d+(?:\\.\\d+)?)?$`));
  const constant = rhs.match(/^([+-]?\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)?$/);
  if (constant) {
    const value = Number(constant[1]) + Number(constant[2] ?? 0);
    if (!Number.isFinite(value)) return null;
    return name === 'y' ? { kind: 'slope', m: 0, n: value } : { kind: 'vertical', x: value };
  }
  if (!linear) return null;
  const k = coef(linear[1]), c = Number(linear[2] ?? 0);
  if (!Number.isFinite(k) || !Number.isFinite(c)) return null;
  if (name === 'y') return { kind: 'slope', m: k, n: c };
  // x = k·y + c
  if (Math.abs(k) < 1e-12) return { kind: 'vertical', x: c };
  return { kind: 'slope', m: 1 / k, n: -c / k };
}

export function equationText(eq: Equation): string {
  if (eq.kind === 'vertical') return `x = ${trNum(eq.x)}`;
  const m = tidy(eq.m), n = tidy(eq.n);
  const head = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? '-x' : `${trNum(m)}x`;
  if (!head) return `y = ${trNum(n)}`;
  return n === 0 ? `y = ${head}` : `y = ${head} ${n > 0 ? '+' : '-'} ${trNum(Math.abs(n))}`;
}

/** Konuşma yazımıyla denklem: "x eşittir üç", "y eşittir eksi x artı bir", "y = iki" → "x = 3", "y = - x + 1". */
const SPOKEN_WORDS: Record<string, number> = {
  sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50,
};
const SPOKEN_TERM = String.raw`(?:(?:eksi|artı|arti|iks|x|y|sıfır|sifir|bir|iki|üç|uc|dört|dort|beş|bes|altı|alti|yedi|sekiz|dokuz|on|yirmi|otuz|kırk|kirk|elli|buçuk|bucuk)(?![\p{L}\p{N}])|\d+(?:[.,]\d+)?|[-+−])`;
const SPOKEN_EQUATION = new RegExp(String.raw`(?<![\p{L}\p{N}_'’])([xXyY])\s*(=|eşittir|esittir|eşit|esit)\s*(${SPOKEN_TERM}(?:\s*${SPOKEN_TERM})*)`, 'giu');

function spokenEquation(whole: string, name: string, eq: string, rhs: string): string {
  const words = rhs.match(new RegExp(SPOKEN_TERM, 'giu')) ?? [];
  if (eq === '=' && !words.some(w => /\p{L}/u.test(w) && !/^[xy]$/i.test(w))) return whole;
  const out: string[] = [];
  let value: number | null = null;
  const flush = () => { if (value !== null) { out.push(String(value)); value = null; } };
  for (const word of words) {
    const w = fold(word);
    if (w in SPOKEN_WORDS) {
      const n = SPOKEN_WORDS[w];
      value = value !== null && value >= 10 && value % 10 === 0 && n < 10 ? value + n : (flush(), n);
    } else if (w === 'bucuk') {
      if (value === null) return whole;
      value += 0.5;
    } else {
      flush();
      out.push(w === 'eksi' ? '-' : w === 'arti' ? '+' : w === 'iks' ? 'x' : word.replace(',', '.'));
    }
  }
  flush();
  return `${name} = ${out.join(' ')}`;
}

const cache = new WeakMap<Clause, { scene: CommandScene; value: Prepared }>();

/**
 * Motorun çözümlemesi "y = x doğrusuna göre …" gibi cümleleri fonksiyon tanımı sanıp keser; büyük "O" harfini de
 * etiket saymaz. Bu yüzden ham metin küçük düzeltmelerle yeniden çözümlenir.
 */
export function prepare(clause: Clause, scene: CommandScene): Prepared {
  const hit = cache.get(clause);
  if (hit && hit.scene === scene) return hit.value;
  let raw = clause.raw;
  const equations: Equation[] = [];
  if (REFLECT_HINT.test(fold(raw))) {
    raw = raw.replace(SPOKEN_EQUATION, spokenEquation);
    raw = raw.replace(EQUATION,(whole: string, name: string, a: string, b: string) => {
      const eq = parseEquation(name.toLowerCase(), a, b);
      if (!eq) return whole;
      equations.push(eq);
      return ` qqdenklem${equations.length - 1}qq`;
    });
  }
  // "sola doğru 2 birim": çözümleyici "sola doğru"yu "SOLA doğrusu" gibi etiket sanmasın.
  raw = raw.replace(/(?<![\p{L}\p{N}_'’])(sağa|saga|sola|yukarı(?:ya)?|yukari(?:ya)?|aşağı(?:ya)?|asagi(?:ya)?)\s+doğru(?![\p{L}\p{N}_'’])/giu, '$1');
  // Büyük harfle yazılmış ve durak sözcüğüne benzeyen etiketler ("DE", "NE", "BU"): sahnedeki noktalara ayrışıyorsa etiket olarak korunur.
  if (/[a-zçğıöşü]/.test(raw)) {
    raw = raw.replace(/(?<![\p{L}\p{N}_'’])([A-ZÇĞİÖŞÜ]{2,3})(?![\p{L}\p{N}_'’])/gu, token => (STOPWORDS.has(fold(token)) && scene.pointsFromLabel(token) ? `${token}'da` : token));
  }
  // "O noktası", "O merkezli", "O etrafında": O etiketi (STOPWORDS'teki "o" zamiriyle karışmasın)
  raw = raw.replace(/(?<![\p{L}\p{N}_'’])O(?=\s+(?:nokta|merkez|etraf|çevre|cevre|göre|gore))/gu, "O'da");
  let hasO = false;
  try { hasO = !!scene.findPoint('O'); } catch { hasO = true; }
  if (hasO) raw = raw.replace(/(?<![\p{L}\p{N}_'’])o(?=\s+(?:nokta|merkez|etraf))/gu, "O'da");
  // Konuşmada küçük yazılan "o etrafında", "o merkezli", "o noktasına göre": O yoksa da O harfidir (anchorFromLabel orijini kullanır).
  // "o noktaya göre" (zamir) dokunulmaz: harf adında iyelik eki olur ("noktası/noktasına").
  else raw = raw.replace(/(?<![\p{L}\p{N}_'’])o(?=\s+(?:etraf|çevres|cevres|merkezli|noktas[ıi](?:n[ıi]n|na)?\s+(?:göre|gore|etraf|çevres|cevres)))/gu, "O'da");
  const c = raw === clause.raw ? clause : parseClause(raw, scene.known());
  const value: Prepared = { c, t: c.text, equations };
  cache.set(clause, { scene, value });
  return value;
}

const EDIT_VERBS: VerbKind[] = ['delete', 'hide', 'rename', 'select', 'copy', 'color', 'undo', 'redo', 'lock', 'unlock', 'move', 'play', 'stop'];
/** Cümle aslında bir düzenleme işlemi mi? (ör. "yansımayı sil", "görüntüyü kırmızı yap") */
export function isEditSentence(p: Prepared, imperative: RegExp, hasColor: boolean): boolean {
  if (imperative.test(p.t)) return false;
  return p.c.hasVerb(...EDIT_VERBS) || (hasColor && /\byap/.test(p.t));
}

// ---------------------------------------------------------------------------
// Metin parçalarını tüketme
// ---------------------------------------------------------------------------

export class Ctx {
  readonly c: Clause;
  readonly t: string;
  spans: [number, number][] = [];
  notes: string[] = [];
  constructor(readonly p: Prepared, readonly scene: CommandScene) {
    this.c = p.c;
    this.t = p.t;
  }
  /** Tüketilmiş parçaları boşlukla örtülmüş metin (konumlar korunur). */
  rest(): string {
    let s = this.t;
    for (const [a, b] of this.spans) s = s.slice(0, a) + ' '.repeat(b - a) + s.slice(b);
    return s;
  }
  find(re: RegExp): RegExpExecArray | null {
    return new RegExp(re.source, re.flags.replace('g', '')).exec(this.rest());
  }
  findAll(re: RegExp): RegExpExecArray[] {
    const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
    return [...this.rest().matchAll(new RegExp(re.source, flags))];
  }
  consume(m: RegExpExecArray | RegExpMatchArray) {
    const start = m.index ?? 0;
    this.spans.push([start, start + m[0].length]);
  }
  take(re: RegExp): RegExpExecArray | null {
    const m = this.find(re);
    if (m) this.consume(m);
    return m;
  }
  label(i: string | number): LabelRef { return this.c.labels[Number(i)]; }
  num(i: string | number): number { return this.c.numbers[Number(i)]; }
  coord(i: string | number): Point2D { const p = this.c.coords[Number(i)]; return { x: p.x, y: p.y }; }
}

// ---------------------------------------------------------------------------
// Merkez, eksen ve hedef çözümleme
// ---------------------------------------------------------------------------

/** Dönüşüm merkezi: canlı nokta (id) ya da sabit konum. phrase iletide kullanılır ("A noktası", "orijin"). */
export interface Anchor { id?: string; at: Point2D; phrase: string }

const pointAnchor = (p: PointObject): Anchor => ({ id: p.id, at: { x: p.x, y: p.y }, phrase: `${p.label} noktası` });
export const ORIGIN: Anchor = { at: { x: 0, y: 0 }, phrase: 'orijin' };

/** "A(2,3)" yazımı: nokta varsa konumu aynı olmalı, yoksa oluşturulur. */
export function ensureLabeledPoint(ctx: Ctx, ref: LabelRef, at: Point2D): PointObject {
  const existing = ctx.scene.findPoint(ref.text);
  if (existing) {
    if (dist(existing, at) > 1e-9) fail(`${existing.label} noktası zaten ${fmt(existing)} konumunda. Başka bir ad yazın ya da koordinatı kaldırın.`);
    return existing;
  }
  const parts = ctx.scene.splitNewLabels(ref.text);
  if (!parts || parts.length !== 1) fail(`“${ref.text}” tek bir nokta adı değil.`);
  return ctx.scene.addPoint(at, { label: parts[0] });
}

/** Etiketten merkez: nokta, şeklin merkezi ya da (O yoksa) orijin. */
export function anchorFromLabel(ctx: Ctx, ref: LabelRef): Anchor {
  const { scene } = ctx;
  const p = scene.findPoint(ref.text);
  if (p) return pointAnchor(p);
  if (labelKey(ref.text) === 'o') {
    ctx.notes.push('O adlı nokta olmadığı için orijin (0; 0) kullanıldı.');
    return ORIGIN;
  }
  const shapes = scene.resolveLabel(ref, ['circle', 'ellipse', 'arc', 'sector', 'polygon', 'segment', 'angle']);
  if (shapes.length === 1) return shapeCenter(scene, shapes[0]);
  if (shapes.length > 1) fail(`${ref.text} adıyla birden fazla şekil eşleşti. Merkezi bir nokta adıyla yazın.`);
  fail(`${ref.text} noktası bulunamadı.`);
}

/** Şeklin kendi merkezi: çember/elips/yay/dilim merkezi (canlı), açı köşesi; çokgen ve parçada köşelerin ortalaması (sabit). */
export function shapeCenter(scene: CommandScene, o: MathObject): Anchor {
  switch (o.type) {
    case 'point': return pointAnchor(o);
    case 'circle':
      if (!o.throughPointIds?.length) return pointAnchor(scene.point(o.centerPointId));
      break;
    case 'ellipse': case 'arc': case 'sector': return pointAnchor(scene.point(o.centerPointId));
    case 'angle': return pointAnchor(scene.point(o.vertexPointId));
    default: break;
  }
  if (o.type === 'circle') {
    const g = scene.circleOf(o)!;
    return { at: { x: soft(g.center.x), y: soft(g.center.y) }, phrase: `çemberin merkezi ${fmt(g.center)}` };
  }
  const ids = unique(scene.definingPointIds(o));
  const at = average(ids.map(id => scene.pos(id)));
  const phrase = o.type === 'segment' || o.type === 'line' || o.type === 'ray' ? `orta nokta ${fmt(at)}` : `ağırlık merkezi ${fmt(at)}`;
  return { at, phrase };
}

function average(points: Point2D[]): Point2D {
  const x = points.reduce((s, p) => s + p.x, 0) / points.length, y = points.reduce((s, p) => s + p.y, 0) / points.length;
  return { x: soft(x), y: soft(y) };
}

/** Merkez yazılmadığında: tek şeklin merkezi ya da tüm tanım noktalarının ortalaması. Tek nokta için null. */
export function defaultAnchor(scene: CommandScene, targets: MathObject[]): Anchor | null {
  if (targets.length === 1) return targets[0].type === 'point' ? null : shapeCenter(scene, targets[0]);
  const ids = unique(targets.flatMap(t => scene.definingPointIds(t)));
  const at = average(ids.map(id => scene.pos(id)));
  return { at, phrase: `ağırlık merkezi ${fmt(at)}` };
}

const REF = String.raw`(?:\$(\d+)\s*@(\d+)|\$(\d+)([a-z]*)|@(\d+))`;
function anchorFromRef(ctx: Ctx, m: RegExpExecArray): Anchor {
  if (m[1] !== undefined) return pointAnchor(ensureLabeledPoint(ctx, ctx.label(m[1]), ctx.coord(m[2])));
  if (m[3] !== undefined) return anchorFromLabel(ctx, ctx.label(m[3]));
  const at = ctx.coord(m[5]);
  return { at, phrase: `${fmt(at)} noktası` };
}

export type CenterResult = { anchor?: Anchor; own?: boolean };
const ORIGIN_WORD = String.raw`(?:\b(?:orijin(?!al)|orjin|origin)[a-z]*|\bbaslangic\s+nokta[a-z]*|\bkoordinat\s+baslangic[a-z]*)`;

/** Döndürme ve homotete merkezi. Bulunan ifadeler tüketilir. */
export function findCenter(ctx: Ctx): CenterResult {
  const POINT_NOUN = String.raw`(?:nokta|kose)[a-z]*`;
  const patterns = [
    new RegExp(String.raw`${REF}(?:\s+(?:nin|nun|in|un|e|a|ye|ya|i|u|yi|yu))?(?:\s+${POINT_NOUN})?\s+(?:etraf[a-z]*|cevre[a-z]*|merkez\s+al[a-z]*|merkezi\s+olarak|merkez\s+(?:olarak|olsun|kabul\s+[a-z]+|secilerek|olmak\s+uzere)|gore)`),
    new RegExp(String.raw`\b(?:donme\s+|homotet[a-z]*\s+)?merkez(?:i|leri)?\s+(?:olarak\s+)?${REF}(?:\s+${POINT_NOUN})?(?:\s+(?:olan|olsun|alinarak|secilerek|olmak\s+uzere))?`),
    new RegExp(String.raw`${REF}(?:\s+${POINT_NOUN})?\s+merkezli(?!\s+(?:cember|daire|elips|yay|dilim))`),
    // "A noktasından 2 kat büyüt", "A köşesinden 90 derece döndür"
    new RegExp(String.raw`${REF}\s+${POINT_NOUN}(?:ndan|nden)\b(?!\s+(?:gecen|baslayan|cikan))`),
  ];
  for (const re of patterns) {
    const m = ctx.take(re);
    if (m) return { anchor: anchorFromRef(ctx, m) };
  }
  if (ctx.take(new RegExp(String.raw`${ORIGIN_WORD}(?:\s+(?:etraf[a-z]*|cevre[a-z]*|merkezli|gore))?`))) return { anchor: ORIGIN };
  if (ctx.take(/\b(?:kendi\s+)?(?:agirlik\s+)?merkez(?:i|ine|leri)\s+(?:etraf[a-z]*|cevre[a-z]*|gore)|\bkendi\s+(?:etraf|cevre)[a-z]*|\bmerkezine\s+gore/)) return { own: true };
  return {};
}

// ---------------------------------------------------------------------------
// Hedef nesneler
// ---------------------------------------------------------------------------

export function nounType(words: string): ObjectType | undefined {
  if (/^(?:daire\s+dilim|dilim)/.test(words)) return 'sector';
  if (/^(?:dogru\s+parca|parca)/.test(words)) return 'segment';
  if (/^(?:ucgen|kare(?!li)|dikdortgen|cokgen|dortgen|besgen|altigen|yedigen|sekizgen|dokuzgen|ongen|paralelkenar|yamuk|deltoid|eskenar)/.test(words)) return 'polygon';
  if (/^dogru/.test(words)) return 'line';
  if (/^isin/.test(words)) return 'ray';
  if (/^(?:cember|daire)/.test(words)) return 'circle';
  if (/^elips/.test(words)) return 'ellipse';
  if (/^yay(?:i|in|ini|a|lar|lari)?\b/.test(words)) return 'arc';
  if (/^aci/.test(words)) return 'angle';
  if (/^(?:nokta|kose)/.test(words)) return 'point';
  return undefined;
}

const NOUN_TR: Record<string, string> = {
  point: 'nokta', segment: 'doğru parçası', line: 'doğru', ray: 'ışın', polygon: 'çokgen', circle: 'çember', ellipse: 'elips', arc: 'yay', sector: 'daire dilimi', angle: 'açı',
};

function nounAfterLabel(rest: string, index: number): ObjectType | undefined {
  const m = rest.match(new RegExp(String.raw`\$${index}(?!\d)[a-z]*(?:\s+(?:nin|nun|in|un|yi|yu|i|u))?(?:\s+merkezli)?\s+([a-z]+(?:\s+[a-z]+)?)`));
  return m ? nounType(m[1]) : undefined;
}

function firstNoun(rest: string): ObjectType | undefined {
  const words = rest.split(/\s+/).filter(w => /^[a-z]+$/.test(w));
  for (let i = 0; i < words.length; i++) {
    const found = nounType(words.slice(i, i + 3).join(' '));
    if (found) return found;
  }
  return undefined;
}

/** Aynı listedeki şekillerin köşesi olan noktalar ayrıca dönüştürülmez. */
function prune(scene: CommandScene, list: MathObject[]): MathObject[] {
  const shapePoints = new Set(list.filter(o => o.type !== 'point').flatMap(o => scene.definingPointIds(o)));
  return unique(list).filter(o => o.type !== 'point' || !shapePoints.has(o.id));
}

export interface TargetOptions {
  /** Eksen, merkez, vektör gibi rol nesneleri: seçimden/sahneden hedef olarak alınmaz. */
  exclude?: string[];
  /** "yansıtılacak", "döndürülecek" … */
  action: string;
  example: string;
}

export function findTargets(ctx: Ctx, o: TargetOptions): MathObject[] {
  const { scene } = ctx;
  const exclude = new Set(o.exclude ?? []);
  const rest = ctx.rest();
  const transformable = (obj: MathObject | undefined): obj is MathObject => !!obj && TRANSFORMABLE.includes(obj.type);
  const found: MathObject[] = [];

  const refs = [...rest.matchAll(/\$(\d+)(?!\d)/g)].map(m => ({ index: Number(m[1]), at: m.index ?? 0 }));
  for (const { index } of refs) {
    const ref = ctx.label(index);
    // Tür sözcüğü özgün metinden okunur: tüketilmiş parçalar ("90 derecelik açıyla") araya girip "açı" türü sanılmasın.
    const noun = nounAfterLabel(ctx.t, index);
    // Tür yazıldıysa önce o türde ara: "ABC çemberi" ABC üçgeniyle aynı adı taşısa da bulunmalı.
    let candidates = noun ? scene.resolveLabel(ref, [noun]).filter(transformable) : [];
    if (noun === 'line' && !candidates.length) candidates = scene.resolveLabel(ref, ['segment', 'ray']);
    if (!candidates.length) candidates = scene.resolveLabel(ref).filter(transformable);
    if (!candidates.length) {
      const coord = rest.match(new RegExp(String.raw`\$${index}(?!\d)\s*@(\d+)`));
      if (coord) { found.push(ensureLabeledPoint(ctx, ref, ctx.coord(coord[1]))); continue; }
      const named = scene.resolveLabel(ref);
      // "f yi x eksenine göre yansıt": fonksiyonun adı küçük harfle ve fonksiyona özgü açıklamayla anılır.
      const functionName = named.length && named.every(o => o.type === 'function') ? functionNameOf(named[0]) : undefined;
      if (functionName) fail(`${functionName} bir fonksiyon; yansıtma, döndürme ve homotete yalnızca şekillere uygulanır. Fonksiyonun grafiğini kaydırmak için “${functionName} fonksiyonunu 2 birim sağa ötele” yazın.`);
      if (named.length) fail(`${ref.text} dönüştürülebilen bir şekil değil. Nokta, doğru parçası, doğru, ışın, çokgen, çember, elips, yay, daire dilimi ya da açı seçin.`);
      fail(`${ref.text} adlı nesne bulunamadı.`);
    }
    if (noun) {
      const typed = candidates.filter(c => c.type === noun);
      if (typed.length) candidates = typed;
      else if (noun === 'line' && candidates.some(c => c.type === 'segment' || c.type === 'ray')) candidates = candidates.filter(c => c.type === 'segment' || c.type === 'ray');
      else fail(`${ref.text} adlı ${NOUN_TR[noun]} bulunamadı.`);
    } else if (candidates.length > 1) {
      if (candidates.some(c => c.type === 'polygon')) candidates = candidates.filter(c => c.type === 'polygon');
      else if (candidates.some(c => c.type === 'point')) candidates = candidates.filter(c => c.type === 'point');
    }
    if (candidates.length > 1) {
      fail(`${ref.text} adıyla birden fazla nesne eşleşti (${candidates.map(c => c.label).join(', ')}). Türünü de yazın (ör. “${ref.text} doğru parçasını …”).`);
    }
    found.push(candidates[0]);
  }
  if (found.length) return prune(scene, found);

  // Koordinatla verilen nokta: "(2, 3) noktasının …"
  const coordPoints = [...rest.matchAll(/@(\d+)(?!\d)\s+nokta[a-z]*/g)];
  if (coordPoints.length) {
    return coordPoints.map(m => {
      const at = ctx.coord(m[1]);
      return scene.points().find(p => dist(p, at) < 1e-9) ?? scene.addPoint(at);
    });
  }

  const noun = firstNoun(rest);
  const allowed = (obj: MathObject | undefined): obj is MathObject => transformable(obj) && !exclude.has(obj.id) && (!noun || obj.type === noun);

  if (/\b(?:tum|butun|hepsi|hepsini|tamami|tamamini|her\s+sey|her\s+seyi)\b/.test(rest)) {
    const all = scene.objects.filter(obj => allowed(obj) && obj.visible);
    const list = noun ? all : prune(scene, all);
    if (!list.length) fail(noun ? `Dönüştürülecek ${NOUN_TR[noun]} yok.` : 'Dönüştürülecek şekil yok.');
    return list;
  }

  const pools = ctx.c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
  for (const ids of pools) {
    const list = ids.map(id => scene.get(id)).filter(allowed);
    if (list.length) return prune(scene, list);
  }

  if (noun) {
    const all = scene.objects.filter(allowed);
    if (all.length === 1) return all;
    if (!all.length) fail(`Önce bir ${NOUN_TR[noun]} oluşturun.`);
    fail(`Birden fazla ${NOUN_TR[noun]} var. Hangisi olduğunu adıyla yazın (ör. ${o.example}) ya da önce seçin.`);
  }
  const shapes = scene.objects.filter(obj => allowed(obj) && obj.type !== 'point');
  if (shapes.length === 1) return shapes;
  const cap = o.action.charAt(0).toLocaleUpperCase('tr') + o.action.slice(1);
  if (!shapes.length) fail(`${cap} bir şekil bulunamadı. Önce bir şekil çizin ya da adını yazın (ör. ${o.example}).`);
  fail(`${cap} şekli adıyla yazın (ör. ${o.example}) ya da önce seçin.`);
}

// ---------------------------------------------------------------------------
// Görüntü oluşturma
// ---------------------------------------------------------------------------

/** Nokta dönüşümü: canlı kural, anlık konum ve şekil özelliklerine etkisi. */
export interface PointMap {
  rule(sourceId: string): Construction;
  apply(p: Point2D): Point2D;
  /** Doğruya göre yansıma yönü tersine çevirir (yay/dilim başlangıç–bitiş yer değiştirir). */
  reversing: boolean;
  /** Elipsin dönme açısına etkisi (derece). */
  rotation(r: number): number;
  /** Uzunluk çarpanı (|k|). */
  scale: number;
}

const norm360 = (deg: number) => tidy(((deg % 360) + 360) % 360);

export function reflectAxisMap(scene: CommandScene, axis: 'x' | 'y' | 'y=x' | 'y=-x'): PointMap {
  const theta = { x: 0, y: 90, 'y=x': 45, 'y=-x': -45 }[axis];
  return {
    rule: sourceId => ({ kind: 'reflect', sourceId, axis }),
    apply: p => axis === 'x' ? { x: p.x, y: -p.y } : axis === 'y' ? { x: -p.x, y: p.y } : axis === 'y=x' ? { x: p.y, y: p.x } : { x: -p.y, y: -p.x },
    reversing: true,
    rotation: r => norm360(2 * theta - r),
    scale: 1,
  };
}
export function reflectLineMap(scene: CommandScene, aId: string, bId: string): PointMap {
  const a = scene.pos(aId), b = scene.pos(bId);
  if (dist(a, b) < 1e-12) fail('Yansıma ekseninin iki noktası farklı konumda olmalı.');
  const theta = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  return {
    rule: sourceId => ({ kind: 'reflect', sourceId, axisPointIds: [aId, bId] }),
    apply: p => reflectAcross(p, scene.pos(aId), scene.pos(bId)),
    reversing: true,
    rotation: r => norm360(2 * theta - r),
    scale: 1,
  };
}
export function reflectPointMap(scene: CommandScene, anchor: Anchor): PointMap {
  const at = anchor.at;
  return {
    rule: sourceId => anchor.id ? { kind: 'reflect', sourceId, centerId: anchor.id } : { kind: 'dilate', sourceId, center: { x: at.x, y: at.y }, factor: -1 },
    apply: p => { const c = anchor.id ? scene.pos(anchor.id) : at; return { x: 2 * c.x - p.x, y: 2 * c.y - p.y }; },
    reversing: false,
    rotation: r => r,
    scale: 1,
  };
}
export function rotateMap(scene: CommandScene, anchor: Anchor, degrees: number): PointMap {
  const at = anchor.at;
  return {
    rule: sourceId => anchor.id ? { kind: 'rotate', sourceId, centerId: anchor.id, degrees } : { kind: 'rotate', sourceId, center: { x: at.x, y: at.y }, degrees },
    apply: p => rotateAround(p, anchor.id ? scene.pos(anchor.id) : at, degrees),
    reversing: false,
    rotation: r => norm360(r + degrees),
    scale: 1,
  };
}
export function translateMap(scene: CommandScene, vector: { ids: [string, string] } | { v: Point2D }): PointMap {
  const current = (): Point2D => {
    if ('v' in vector) return vector.v;
    const a = scene.pos(vector.ids[0]), b = scene.pos(vector.ids[1]);
    return { x: b.x - a.x, y: b.y - a.y };
  };
  return {
    rule: sourceId => 'ids' in vector ? { kind: 'translate', sourceId, vectorPointIds: [vector.ids[0], vector.ids[1]] } : { kind: 'translate', sourceId, vector: { x: vector.v.x, y: vector.v.y } },
    apply: p => { const v = current(); return { x: p.x + v.x, y: p.y + v.y }; },
    reversing: false,
    rotation: r => r,
    scale: 1,
  };
}
export function dilateMap(scene: CommandScene, anchor: Anchor, factor: number): PointMap {
  const at = anchor.at;
  return {
    rule: sourceId => anchor.id ? { kind: 'dilate', sourceId, centerId: anchor.id, factor } : { kind: 'dilate', sourceId, center: { x: at.x, y: at.y }, factor },
    apply: p => { const c = anchor.id ? scene.pos(anchor.id) : at; return { x: c.x + (p.x - c.x) * factor, y: c.y + (p.y - c.y) * factor }; },
    reversing: false,
    rotation: r => r,
    scale: Math.abs(factor),
  };
}

const PREFIX: Partial<Record<ObjectType, string>> = { segment: 'seg', line: 'line', ray: 'ray', polygon: 'poly', circle: 'circ', ellipse: 'elp', arc: 'arc', sector: 'sect', angle: 'ang' };
const SHORT_NAME = /^[\p{L}](?:_?\d+)?'*$/u;

function primePointLabel(scene: CommandScene, label: string): string {
  let next = `${label}'`;
  while (scene.points().some(p => labelKey(p.label) === labelKey(next))) next += "'";
  return next;
}
function primeObjectName(scene: CommandScene, name: string): string {
  let next = `${name}'`;
  while (scene.objects.some(o => o.type !== 'point' && labelKey(o.label) === labelKey(next))) next += "'";
  return next;
}

/** Aracın/üreticinin vereceği varsayılan ad. */
export function defaultLabel(scene: CommandScene, o: MathObject): string {
  const L = (id: string) => scene.point(id).label;
  switch (o.type) {
    case 'point': return o.label;
    case 'segment': return `[${L(o.startPointId)}${L(o.endPointId)}]`;
    case 'line': return `${L(o.point1Id)}${L(o.point2Id)} Doğrusu`;
    case 'ray': return `${L(o.startPointId)}${L(o.throughPointId)} Işını`;
    case 'polygon': return o.pointIds.map(L).join('');
    case 'circle':
      if (o.throughPointIds?.length) return `${o.throughPointIds.map(L).join('')} Çemberi`;
      if (o.fixedRadius !== undefined && !o.radiusPointId) return `${L(o.centerPointId)} Çemberi (r = ${trNum(o.fixedRadius)})`;
      return `${L(o.centerPointId)} Merkezli Çember`;
    case 'ellipse': return `${L(o.centerPointId)} Merkezli Elips`;
    case 'arc': return `${L(o.startPointId)}${L(o.directionPointId)} Yayı`;
    case 'sector': return `${L(o.centerPointId)} Daire Dilimi`;
    case 'angle': return `∠${L(o.point1Id)}${L(o.vertexPointId)}${L(o.point3Id)}`;
    default: return o.label;
  }
}

function imageLabel(scene: CommandScene, source: MathObject, image: MathObject): string {
  if (source.type === 'polygon') return defaultLabel(scene, image);
  const own = defaultLabel(scene, source);
  if (source.label !== own && SHORT_NAME.test(source.label)) return primeObjectName(scene, source.label);
  if (source.type === 'segment' && /^\|.*\|$/.test(source.label)) return defaultLabel(scene, image).replace(/^\[(.*)\]$/, '|$1|');
  return defaultLabel(scene, image);
}

function sameShape(scene: CommandScene, a: MathObject, b: MathObject): boolean {
  if (a.type !== b.type) return false;
  if (scene.definingPointIds(a).join() !== scene.definingPointIds(b).join()) return false;
  if (a.type === 'circle' && b.type === 'circle') return (a.fixedRadius ?? null) === (b.fixedRadius ?? null) && (a.throughPointIds?.length ?? 0) === (b.throughPointIds?.length ?? 0);
  if (a.type === 'ellipse' && b.type === 'ellipse') return a.radiusX === b.radiusX && a.radiusY === b.radiusY && (a.rotation ?? 0) === (b.rotation ?? 0);
  if (a.type === 'angle' && b.type === 'angle') return !!a.reflex === !!b.reflex;
  return true;
}

/** Tek üslü ad ("A'") dolu olduğu için daha çok üslü ad verilen görüntü: id, istenen ad, verilen ad, dolu adı taşıyan nesne görüntü mü? */
export interface PrimeSkip { id: string; wanted: string; used: string; takenByImage: boolean }
export interface ImageResult { images: MathObject[]; reused: number; created: number; primeSkips: PrimeSkip[] }

/**
 * Hedeflerin canlı görüntülerini oluşturur. Ortak noktalar bir kez dönüştürülür; aynı görüntü zaten varsa yeniden kullanılır.
 * Döndürülen dizi hedeflerle aynı sıradadır.
 */
export function createImages(scene: CommandScene, targets: MathObject[], map: PointMap, color: string = COLORS.image): ImageResult {
  const mapping = new Map<string, PointObject>();
  const imageAnchors = new Map<string, NonNullable<MathObject['labelAnchors']>>();
  const primeSkips: PrimeSkip[] = [];
  let reused = 0, created = 0;

  const imagePoint = (id: string, o: { visible?: boolean; showLabel?: boolean } = {}): PointObject => {
    const hit = mapping.get(id);
    if (hit) return hit;
    const source = scene.point(id);
    const rule = map.rule(id);
    const key = JSON.stringify(rule);
    const existing = scene.points().find(p => p.construction && JSON.stringify(p.construction) === key);
    let image: PointObject;
    if (existing) image = existing;
    else {
      const wanted = `${source.label}'`;
      const label = primePointLabel(scene, source.label);
      const holder = label !== wanted ? scene.points().find(p => labelKey(p.label) === labelKey(wanted)) : undefined;
      image = scene.addPoint(map.apply(source), {
        label, color, construction: rule,
        visible: o.visible ?? source.visible, showLabel: o.showLabel ?? source.showLabel,
      });
      if (holder && image.visible) primeSkips.push({ id: image.id, wanted, used: label, takenByImage: !!holder.construction });
      created++;
    }
    mapping.set(id, image);
    return image;
  };

  const images = targets.map((target): MathObject => {
    if (target.type === 'point') {
      const before = created;
      const image = imagePoint(target.id);
      if (created === before) reused++;
      return image;
    }
    const make = (patch: Record<string, unknown>): MathObject => {
      const { selected: _selected, locked: _locked, labelAnchors, ...base } = target as MathObject & { selected?: boolean; locked?: boolean };
      const draft = { ...base, id: createId(PREFIX[target.type] ?? 'obj'), createdAt: Date.now(), color, ...patch } as MathObject;
      if ('fillColor' in target || target.type === 'polygon' || target.type === 'sector' || target.type === 'ellipse') (draft as { fillColor?: string }).fillColor = color;
      draft.label = imageLabel(scene, target, draft);
      const existing = scene.objects.find(o => sameShape(scene, o, draft));
      if (existing) { reused++; return existing; }
      if (labelAnchors) imageAnchors.set(draft.id, labelAnchors);
      created++;
      return scene.add(draft);
    };
    const P = (id: string) => imagePoint(id).id;
    switch (target.type) {
      case 'segment': return make({ startPointId: P(target.startPointId), endPointId: P(target.endPointId) });
      case 'line': return make({ point1Id: P(target.point1Id), point2Id: P(target.point2Id) });
      case 'ray': return make({ startPointId: P(target.startPointId), throughPointId: P(target.throughPointId) });
      case 'polygon': return make({ pointIds: target.pointIds.map(P) });
      case 'angle': return make({ point1Id: P(target.point1Id), vertexPointId: P(target.vertexPointId), point3Id: P(target.point3Id) });
      case 'circle':
        if (target.throughPointIds?.length) {
          return make({ centerPointId: '', throughPointIds: target.throughPointIds.map(P), ...(target.radiusPointId ? { radiusPointId: P(target.radiusPointId) } : {}) });
        }
        return make({
          centerPointId: P(target.centerPointId),
          ...(target.radiusPointId ? { radiusPointId: P(target.radiusPointId) } : {}),
          ...(target.fixedRadius !== undefined ? { fixedRadius: soft(target.fixedRadius * map.scale) } : {}),
        });
      case 'ellipse': {
        const rotation = map.rotation(target.rotation ?? 0);
        return make({ centerPointId: P(target.centerPointId), radiusX: soft(target.radiusX * map.scale), radiusY: soft(target.radiusY * map.scale), rotation: rotation === 0 ? undefined : rotation });
      }
      case 'arc':
      case 'sector': {
        const center = P(target.centerPointId), start = P(target.startPointId), direction = P(target.directionPointId);
        if (!map.reversing) return make({ centerPointId: center, startPointId: start, directionPointId: direction });
        // Yansıma yönü çevirir: yay yine saat yönünün tersine çizildiği için başlangıç ile bitiş yer değiştirir.
        const c = scene.pos(target.centerPointId), s = scene.pos(target.startPointId), d = scene.pos(target.directionPointId);
        const rs = dist(c, s), rd = dist(c, d);
        if (rd < 1e-12) fail(`${target.label} yayının bitiş noktası merkezle çakışık; yansıtılamaz.`);
        if (Math.abs(rs - rd) < 1e-9) return make({ centerPointId: center, startPointId: direction, directionPointId: start });
        // Bitiş noktası çember üzerinde değilse, başlangıcı yarıçap kadar uzağa taşıyan gizli yardımcı nokta.
        const imageDirection = scene.point(direction);
        const helper = scene.addPoint(scene.pos(direction), {
          label: primePointLabel(scene, imageDirection.label), color, visible: false, showLabel: false,
          construction: { kind: 'dilate', sourceId: direction, centerId: center, factor: rs / rd },
        });
        return make({ centerPointId: center, startPointId: helper.id, directionPointId: start });
      }
      default:
        fail(`${target.label} dönüştürülemez.`);
    }
  });
  // Ortak etiket grubu, daha sonra dönüştürülen başka bir hedefin noktalarını da içerebilir.
  // Bütün hedeflerden sonra yalnız mevcut eşlemeleri kullan; etiket uğruna görüntü noktası üretme.
  for (const [id, anchors] of imageAnchors) {
    const remapped: NonNullable<MathObject['labelAnchors']> = {};
    for (const [kind, anchor] of Object.entries(anchors)) {
      if (!anchor.pointIds.length || anchor.pointIds.some(pointId => !mapping.has(pointId))) continue;
      remapped[kind] = {
        ...anchor,
        pointIds: anchor.pointIds.map(pointId => mapping.get(pointId)!.id),
        offset: { ...anchor.offset },
      };
    }
    // Tam eşlenemeyen çapanın yerine, kopyalanmış labelOffsets eski konumu korur.
    if (Object.keys(remapped).length) scene.update(id, { labelAnchors: remapped });
  }
  return { images: images.map(image => scene.get(image.id) ?? image), reused, created, primeSkips };
}

/** Şekli yerinde dönüştürür (kopya oluşturmaz). İnşaya bağlı noktalar taşınamaz. */
export function transformInPlace(scene: CommandScene, targets: MathObject[], map: PointMap, cannot: string) {
  const ids = unique(targets.flatMap(t => scene.definingPointIds(t)));
  for (const id of ids) {
    const p = scene.point(id);
    if (p.construction) fail(`${p.label} noktası başka nesnelere bağlı olduğu için şekil yerinde ${cannot}. “yerinde” sözcüğünü kaldırın; görüntüsü oluşturulur.`);
    if (p.onObjectId) fail(`${p.label} noktası bir nesnenin üzerine bağlı olduğu için şekil yerinde ${cannot}. “yerinde” sözcüğünü kaldırın; görüntüsü oluşturulur.`);
  }
  const next = new Map(ids.map(id => [id, map.apply(scene.pos(id))]));
  const patches: [string, Record<string, unknown>][] = [];
  for (const t of targets) {
    if (t.type === 'ellipse') {
      const rotation = map.rotation(t.rotation ?? 0);
      patches.push([t.id, { radiusX: soft(t.radiusX * map.scale), radiusY: soft(t.radiusY * map.scale), rotation: rotation === 0 ? undefined : rotation }]);
    }
    if (t.type === 'circle' && t.fixedRadius !== undefined && map.scale !== 1) patches.push([t.id, { fixedRadius: soft(t.fixedRadius * map.scale) }]);
    if ((t.type === 'arc' || t.type === 'sector') && map.reversing) {
      const c = next.get(t.centerPointId)!, s = next.get(t.startPointId)!, d = next.get(t.directionPointId)!;
      const rs = dist(c, s), rd = dist(c, d);
      if (rd < 1e-12) fail(`${t.label} yayının bitiş noktası merkezle çakışık; yansıtılamaz.`);
      if (Math.abs(rs - rd) > 1e-9) next.set(t.directionPointId, { x: c.x + (d.x - c.x) * rs / rd, y: c.y + (d.y - c.y) * rs / rd });
      patches.push([t.id, { startPointId: t.directionPointId, directionPointId: t.startPointId }]);
    }
  }
  for (const [id, pos] of next) {
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) fail('Dönüşüm geçerli koordinatlar üretemedi.');
    scene.update(id, { x: soft(pos.x), y: soft(pos.y) });
  }
  for (const [id, patch] of patches) scene.update(id, patch);
}

// ---------------------------------------------------------------------------
// İletiler
// ---------------------------------------------------------------------------

export function joinTr(list: string[]): string {
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} ve ${list[list.length - 1]}`;
}

export function describe(o: MathObject): string {
  if (o.type === 'point') return `${o.label}${fmt(o)} noktası`;
  if (o.type === 'polygon') {
    if (/\s/.test(o.label)) return o.label;
    const n = o.pointIds.length;
    return `${o.label} ${n === 3 ? 'üçgeni' : n === 4 ? 'dörtgeni' : 'çokgeni'}`;
  }
  if (/çember|elips|yay|dilim|doğru|ışın|∠|açı/i.test(o.label)) return o.label;
  const noun: Partial<Record<ObjectType, string>> = { segment: 'doğru parçası', line: 'doğrusu', ray: 'ışını', circle: 'çemberi', ellipse: 'elipsi', arc: 'yayı', sector: 'daire dilimi', angle: 'açısı' };
  return `${o.label} ${noun[o.type] ?? ''}`.trim();
}

export function describeAll(targets: MathObject[]): string { return joinTr(targets.map(describe)); }

/** Özne ile yüklemi birleştirir; "… (r = 2)" ardından "(3; 2) …" gelirse araya virgül koyar. */
export function sentence(subject: string, rest: string): string {
  return `${subject}${/\)$/.test(subject) && /^\(/.test(rest) ? ',' : ''} ${rest}`;
}

export function imageNames(images: MathObject[]): string {
  return joinTr(images.map(i => i.type === 'point' ? `${i.label}${fmt(i)}` : i.label));
}

export function reuseNote(result: ImageResult): string {
  if (!result.reused) return '';
  return result.created ? 'Görüntülerin bir kısmı zaten vardı; yenisi eklenmedi.' : 'Bu görüntü zaten vardı; yenisi eklenmedi.';
}

/**
 * Tek üslü adlar ("A'") önceki bir görüntüde ya da başka bir noktada kullanıldığı için fazladan üs konduysa nedenini söyler.
 * Görüntüye sonradan başka ad verildiyse (nameImage) söylenmez.
 */
export function primeNote(scene: CommandScene, result: ImageResult): string {
  const skips = result.primeSkips.filter(s => scene.get(s.id)?.label === s.used);
  if (!skips.length) return '';
  const wanted = joinTr(skips.map(s => s.wanted)), used = joinTr(skips.map(s => s.used));
  const many = skips.length > 1;
  const where = skips.every(s => s.takenByImage) ? 'önceki bir görüntüde' : 'sahnede';
  return `${wanted} ${many ? 'adları' : 'adı'} ${where} zaten kullanıldığı için yeni ${many ? 'noktalara' : 'noktaya'} ${used} ${many ? 'adları' : 'adı'} verildi.`;
}

// ---------------------------------------------------------------------------
// Görüntünün adı: "… yansıtarak A'B'C' üçgenini oluştur", "… yansıması olan DEF üçgenini çiz"
// ---------------------------------------------------------------------------

const IMAGE_NAME = /\$(\d+)(?!\d)[a-z]*(?:\s+(?:ucgen|dortgen|kare|dikdortgen|cokgen|besgen|altigen|nokta|dogru\s+parca|dogru|isin|cember|elips|yay|aci|sekil)[a-z]*)?\s+(?:olarak\s+)?(?:olustur|elde\s+et|ciz|adlandir|isimlendir)[a-z]*/;
const TRANSFORM_VERB = /\b(?:yansi|aynala|simetri|dondur|donme|donmus|otele|buyut|kucult|olcekle|homotet)/;

/**
 * Dönüşüm fiilinden SONRA gelen "X üçgenini oluştur/elde et/çiz" adı hedef değil, görüntünün adıdır.
 * Ad sahnede yoksa ya da cümlede başka bir hedef adı varsa tüketilir.
 */
export function takeImageName(ctx: Ctx): string | undefined {
  const m = ctx.find(IMAGE_NAME);
  const verb = ctx.find(TRANSFORM_VERB);
  if (!m || !verb || (m.index ?? 0) < (verb.index ?? 0)) return undefined;
  const ref = ctx.label(m[1]);
  const others = [...ctx.rest().matchAll(/\$(\d+)(?!\d)/g)].some(x => x[1] !== m[1]);
  const exists = ctx.scene.resolveLabel(ref).length > 0 || !!ctx.scene.pointsFromLabel(ref.text);
  if (exists && !others) return undefined;
  ctx.consume(m);
  return ref.text;
}

/** İstenen adı yeni görüntüye verir (ör. DEF); ad kullanımdaysa varsayılan adlar kalır ve söylenir. result.images tazelenir. */
export function nameImage(ctx: Ctx, result: ImageResult, name: string | undefined) {
  const { scene } = ctx;
  const image = result.images[0];
  if (name && result.images.length === 1) {
    const ids = image.type === 'point' ? [image.id] : image.type === 'polygon' ? image.pointIds : image.type === 'segment' ? [image.startPointId, image.endPointId] : null;
    const parts = scene.splitNewLabels(name);
    if (ids && parts && parts.length === ids.length && ids.some((id, i) => scene.point(id).label !== parts[i])) {
      const taken = new Set(parts.map(labelKey)).size !== parts.length
        || parts.some((part, i) => scene.points().some(q => q.id !== ids[i] && labelKey(q.label) === labelKey(part)));
      const fresh = ids.every(id => scene.clauseCreated.includes(id));
      if (taken || !fresh) {
        ctx.notes.push(`Görüntüye “${name}” adı verilemedi (bu adlar kullanımda); varsayılan adlar kullanıldı.`);
      } else {
        ids.forEach((id, i) => scene.update(id, { label: parts[i] }));
        if (image.type === 'polygon') scene.update(image.id, { label: parts.join('') });
        if (image.type === 'segment' && /^\[.*\]$/.test(image.label)) scene.update(image.id, { label: `[${parts.join('')}]` });
      }
    }
  }
  result.images = result.images.map(i => scene.get(i.id) ?? i);
}
