import type { MathObject, ObjectType, PointObject } from '@/types/math';
import { objectDependencies } from '@/state/WorkspaceContext';
import { describe, describeList, joinTr } from '@/math/nesneAdlari';
import { type Clause, type LabelRef, STOPWORDS, fold, labelKey } from '../../text';
import { type CommandScene, fail } from '../../scene';
import { type NounSpec, type NounWord, QUANTIFIER, HIDDEN_WORDS, clauseNouns, labelNoun, labelRole, labelWordIndex } from './words';

const unique = <T,>(items: T[]) => [...new Set(items)];

/** Fonksiyon etiketindeki ad: "f(x) = x^2" → "f", "y = 2x" → "y". */
export function functionName(label: string): string | undefined {
  return label.match(/^\s*([A-Za-zÇĞİÖŞÜçğıöşü][\w']*)\s*(?:\(\s*x\s*\))?\s*=/)?.[1];
}

/**
 * Bir nesnenin bağlı olduğu kimlikler: WorkspaceContext.objectDependencies'in KENDİSİ (elle tutulan bir kopya değil),
 * böylece yeni bir bağımlılık (ör. yay ölçümü) komut yolunda da hemen geçerli olur.
 */
export function depsOf(o: MathObject): string[] {
  return objectDependencies(o);
}

/** Mesajlardaki Türkçe adlar tek yerde (src/math/nesneAdlari.ts): ekrandan silme ipucu da aynı adları kullanır. */
export { describe, describeList, joinTr };

export const cleanLabel = (text: string) => text.trim().replace(/[’′]/g, "'");

const TYPE_PRIORITY: ObjectType[] = ['point', 'segment', 'polygon', 'line', 'ray', 'circle', 'arc', 'sector', 'ellipse', 'angle', 'function', 'slider',
  'text', 'fraction', 'measurement', 'checkbox', 'button', 'input_box', 'image', 'pen'];

export function matchesSpec(o: MathObject, spec: NounSpec | undefined, scene: CommandScene): boolean {
  return !spec || (spec.types.includes(o.type) && (!spec.filter || spec.filter(o, scene)));
}

/** Etikete uyan nesneler: adla, kaydırıcı değişkeniyle, fonksiyon adıyla ya da nokta dizisiyle ("ABC" → üçgen). */
export function candidatesFor(scene: CommandScene, ref: LabelRef, spec?: NounSpec): MathObject[] {
  const types = spec?.types;
  const found = new Set<MathObject>();
  for (const o of scene.resolveLabel(ref, types)) found.add(o);
  if (!ref.bracket) {
    const pts = scene.pointsFromLabel(ref.text);
    if (pts) {
      if (pts.length === 1 && (!types || types.includes('point'))) found.add(pts[0]);
      const shapeTypes = types?.filter(t => t !== 'point');
      if (!types || (shapeTypes && shapeTypes.length)) for (const o of scene.shapesWithPoints(pts.map(p => p.id), shapeTypes)) found.add(o);
    }
    const key = labelKey(ref.text);
    for (const fn of scene.ofType('function')) {
      const name = functionName(fn.label);
      if (name && labelKey(name) === key) found.add(fn);
    }
  }
  return [...found].filter(o => (!types || types.includes(o.type)) && matchesSpec(o, spec, scene));
}

const norm = (s: string) => s.replace(/[\s[\]|∠]/g, '').replace(/[’′]/g, "'");
function namesOf(o: MathObject): string[] {
  if (o.type === 'slider') return [o.label, o.variableName];
  if (o.type === 'function') return [o.label, functionName(o.label) ?? ''];
  return [o.label];
}

/** Aynı etikete uyan birden çok nesneden birini seçer: tam yazım > büyük/küçük harf duyarsız > tercih edilen tür > tür önceliği. */
export function pick(ref: LabelRef, list: MathObject[], prefer?: ObjectType[]): MathObject {
  if (list.length === 1) return list[0];
  const typed = norm(ref.lowercase ? ref.text.toLocaleLowerCase('tr') : cleanLabel(ref.text));
  const exact = list.filter(o => namesOf(o).some(n => n && norm(n) === typed));
  const loose = list.filter(o => namesOf(o).some(n => n && labelKey(norm(n)) === labelKey(typed)));
  let pool = exact.length ? exact : loose.length ? loose : list;
  if (pool.length > 1 && prefer?.length) {
    const preferred = pool.filter(o => prefer.includes(o.type));
    if (preferred.length) pool = preferred;
  }
  if (pool.length > 1) {
    for (const t of TYPE_PRIORITY) {
      const group = pool.filter(o => o.type === t);
      if (group.length) { pool = group; break; }
    }
  }
  if (pool.length > 1) {
    fail(`“${cleanLabel(ref.text)}” birden fazla nesneyle eşleşti (${pool.map(o => o.label).join(', ')}). Türünü de yazın ya da nesneyi seçip komutu yeniden yazın.`);
  }
  return pool[0];
}

export interface TargetOptions {
  /** Kullanılacak etiket dizinleri (varsayılan: hepsi) */
  labels?: number[];
  many?: boolean;
  prefer?: ObjectType[];
  /** Hata mesajındaki örnek komut */
  example: string;
  /** Adsız tekil adda ("çemberi") sahnedeki tek nesneyi kabul et */
  nouns?: NounWord[];
  /** Nesneye özel ek süzgeç (ör. gösterilecek gizli nesneler) */
  filter?: (o: MathObject) => boolean;
  /** "son çizilen" gibi ifadeler yoksa ve hiçbir hedef bulunamazsa sahnede bu türden tek nesne varsa onu al */
  soleFallback?: boolean;
}

const LAST_WORDS = /\bson (?:cizilen|olusturulan|eklenen|sekil|nesne|ciz(?:dig|dik)|olustur(?:dug|duk)|ekle(?:dig|dik)|yap(?:tig|tik)|koy(?:dug|duk))\w*|\bsonuncu\w*|\ben son\b/;

/** Son oluşturulan nesne ve yalnızca ona ait, hemen önce eklenmiş noktalar (ör. üçgenle birlikte gelen A, B, C). */
export function lastGroup(scene: CommandScene): MathObject[] {
  const objs = scene.objects;
  if (!objs.length) fail('Sahnede henüz nesne yok.');
  const last = objs[objs.length - 1];
  const group: MathObject[] = [last];
  if (last.type === 'point') return group;
  const deps = new Set(depsOf(last));
  const tokens = last.type === 'function' ? new Set(last.expression.match(/[A-Za-z_]\w*/g) ?? []) : new Set<string>();
  for (let i = objs.length - 2; i >= 0; i--) {
    const o = objs[i];
    const usedElsewhere = objs.some(x => x !== last && x.id !== o.id && depsOf(x).includes(o.id));
    if (o.type === 'point' && deps.has(o.id) && !usedElsewhere) { group.push(o); continue; }
    if (o.type === 'slider' && tokens.has(o.variableName) && !usedElsewhere) { group.push(o); continue; }
    break;
  }
  return group.reverse();
}

export function examplesOfNames(list: MathObject[], max = 4): string {
  const names = list.map(o => o.label).slice(0, max).join(', ');
  return list.length > max ? `${names}…` : names;
}

/**
 * Cümlenin hedeflediği nesneler.
 * Sıra: cümledeki adlar → "seçili" → "son çizilen" → çoğul/"tüm" adlar ("tüm çemberler") → önceki cümlenin nesnesi ve seçim → tek aday.
 */
export function findTargets(c: Clause, scene: CommandScene, o: TargetOptions): MathObject[] {
  const nouns = o.nouns ?? clauseNouns(c);
  const labelIdx = o.labels ?? c.labels.map((_, i) => i);
  const extra = (obj: MathObject) => !o.filter || o.filter(obj);
  const distinctKeys = unique(nouns.map(n => n.spec.key));
  const sharedSpec = distinctKeys.length === 1 ? nouns[0].spec : undefined;
  const checkMany = (list: MathObject[]) => {
    if (!o.many && list.length > 1) fail(`Birden fazla nesne var (${examplesOfNames(list)}). Tek bir nesnenin adını yazın; örneğin “${o.example}”.`);
    return list;
  };

  let entries: { ref: LabelRef; index?: number }[] = labelIdx.map(i => ({ ref: c.labels[i], index: i }));
  if (!entries.length) entries = stopwordLabels(c, scene).map(ref => ({ ref }));
  // "ABC'nin A köşesini …", "ABC'nin AB kenarını …": sahip olan şekil değil, parçası hedeftir.
  const parts = entries.filter(e => e.index !== undefined && /^(?:kose|kenar)/.test(c.words[labelWordIndex(c, e.index) + 1] ?? ''));
  if (parts.length && entries.length > parts.length) entries = entries.filter(e => parts.includes(e) || e.index === undefined || labelRole(c, e.index) !== 'gen');

  if (entries.length) {
    const result: MathObject[] = [];
    for (const { ref, index } of entries) {
      const own = index === undefined ? null : labelNoun(c, index);
      const s = own?.spec ?? sharedSpec;
      let list = candidatesFor(scene, ref, s);
      if (!list.length && s && !own) list = candidatesFor(scene, ref);
      if (!list.length) {
        const any = candidatesFor(scene, ref);
        if (s && any.length) fail(`${cleanLabel(ref.text)} bir ${s.noun} değil (${describe(any[0])}).`);
        fail(`${cleanLabel(ref.text)} adlı ${s?.noun ?? 'nesne'} bulunamadı.`);
      }
      const filtered = list.filter(extra);
      result.push(pick(ref, filtered.length ? filtered : list, o.prefer));
    }
    return checkMany(unique(result));
  }

  const specOk = (obj: MathObject) => extra(obj) && (!nouns.length || nouns.some(n => matchesSpec(obj, n.spec, scene)));
  if (c.refersToSelection) {
    const list = scene.selection.map(id => scene.get(id)).filter((x): x is MathObject => !!x).filter(specOk);
    if (!list.length) fail(nouns.length ? `Seçili ${nouns[0].spec.noun} yok. Önce seçin ya da adını yazın.` : 'Seçili nesne yok. Önce nesneleri seçin ya da adlarını yazın.');
    return checkMany(list);
  }
  if (LAST_WORDS.test(c.text)) {
    if (nouns.length && nouns[0].spec.key !== 'object' && nouns[0].spec.key !== 'shape') {
      const typed = scene.objects.filter(specOk);
      if (!typed.length) fail(`Sahnede ${nouns[0].spec.noun} yok.`);
      return [typed[typed.length - 1]];
    }
    return checkMany(lastGroup(scene).filter(extra).length ? lastGroup(scene).filter(extra) : lastGroup(scene));
  }
  const plural = nouns.filter(n => n.plural);
  if (plural.length || (QUANTIFIER.test(c.text) && nouns.length)) {
    const specs = plural.length ? plural : nouns;
    const list = scene.objects.filter(obj => extra(obj) && specs.some(n => matchesSpec(obj, n.spec, scene)));
    if (!list.length) fail(HIDDEN_WORDS.test(c.text) ? `Gizli ${specs[0].spec.noun} yok.` : `Sahnede ${specs[0].spec.noun} yok.`);
    return list;
  }
  for (const ids of [scene.focus, scene.selection]) {
    const list = ids.map(id => scene.get(id)).filter((x): x is MathObject => !!x).filter(specOk);
    if (list.length) return checkMany(list);
  }
  if (nouns.length || o.soleFallback) {
    const all = scene.objects.filter(obj => specOk(obj) && (!o.prefer || o.prefer.includes(obj.type)));
    if (all.length === 1) return all;
    const noun = nouns[0]?.spec.noun ?? 'nesne';
    if (!all.length) fail(`Sahnede ${noun} yok.`);
    fail(`Birden fazla ${noun} var (${examplesOfNames(all)}). Hangisi olduğunu adıyla yazın (ör. “${o.example}”) ya da önce seçin.`);
  }
  fail(`Hangi nesne? Adını yazın (ör. “${o.example}”) ya da önce nesneyi seçin.`);
}

/** Etiketsiz ve seçimsiz bir cümlenin hedefi olabilecek bir şey var mı (match() için hafif denetim). */
export function hasTargetHint(c: Clause, scene: CommandScene, nouns: NounWord[] = clauseNouns(c)): boolean {
  return c.labels.length > 0 || nouns.length > 0 || c.refersToSelection || c.refersToLast || LAST_WORDS.test(c.text)
    || scene.focus.length > 0 || scene.selection.length > 0;
}

export function pointsOf(scene: CommandScene, list: MathObject[]): PointObject[] {
  const ids = unique(list.flatMap(o => o.type === 'point' ? [o.id] : scene.definingPointIds(o)));
  return ids.map(id => scene.get(id)).filter((p): p is PointObject => p?.type === 'point');
}

/**
 * Çözümleyicinin sözcük sanıp etiket saymadığı büyük harfli nokta adları ("O noktası", "DE yi"): yalnızca sahnede
 * böyle adlı noktalar varsa ve cümlede başka etiket yoksa kullanılır.
 */
export function stopwordLabels(c: Clause, scene: CommandScene): LabelRef[] {
  const out: LabelRef[] = [];
  const raw = c.raw.replace(/"[^"]*"|“[^”]*”/g, ' ');
  for (const m of raw.matchAll(/(?<![\p{L}\p{N}_'’])([A-ZÇĞİÖŞÜ]{1,3})(?:['’]([a-zçğıöşü]+))?(?![\p{L}\p{N}_])/gu)) {
    if (!STOPWORDS.has(fold(m[1]))) continue;
    if (!scene.pointsFromLabel(m[1])?.every(p => p.label.length <= m[1].length)) continue;
    out.push({ text: m[1], suffix: fold(m[2] ?? '') });
  }
  return out;
}

const VERTEX_WORDS = /\bkose(?:ler)?(?:i|ini|si|sini|leri|lerini)?\b|\bnoktalar(?:i|ini)\b/;
/** "ABC'nin köşelerini/noktalarını …": şekil yerine köşe noktaları hedeflenir. */
export function expandVertices(c: Clause, scene: CommandScene, targets: MathObject[]): MathObject[] {
  if (!VERTEX_WORDS.test(c.text) || targets.every(t => t.type === 'point')) return targets;
  const vertices = pointsOf(scene, targets.filter(t => t.type !== 'point'));
  return vertices.length ? unique([...targets.filter(t => t.type === 'point'), ...vertices]) : targets;
}

export { labelWordIndex };
