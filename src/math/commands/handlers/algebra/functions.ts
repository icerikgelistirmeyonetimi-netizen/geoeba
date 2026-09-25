import type { PointObject } from '@/types/math';
import { extractVariableNames } from '@/math/parser';
import { coefficientOfDetermination, fitPolynomial, noktalardanTamGeciyor, polynomialToExpression } from '@/math/regression';
import type { CommandHandler } from '../../types';
import { type Clause, type VerbKind, fold, parseClause } from '../../text';
import { type CommandScene, colorIn, fail, skip, trNum } from '../../scene';
import {
  FOREIGN_EDIT_VERBS, FUNCTION_NOUN, WIDGET_NOUN, defineFunction, finiteVerbsOf, functionName, hasForeignEditVerb, mentionsX, nextFunctionName,
  prepareExpression, rawWords,
} from './shared';

const HAS_QUOTE = /["“”«»„]/;
const PARSER_FUNCTION_NAMES = /^(?:sin|cos|tan|asin|acos|atan|sind|cosd|tand|sqrt|kok|cbrt|abs|exp|ln|log|min|max|pow|x|pi|e)$/i;

// ---------------------------------------------------------------------------
// f(x) = …, g(x) = …, y = …
// ---------------------------------------------------------------------------

function definitionParts(c: Clause, scene: CommandScene) {
  const d = c.definition;
  if (!d || HAS_QUOTE.test(c.raw) || (d.name !== 'y' && PARSER_FUNCTION_NAMES.test(d.name))) return null;
  const prepared = prepareExpression(d.body, scene);
  const tail = parseClause(prepared.trailing.join(' '), scene.known());
  return { name: d.name, prepared, tail };
}

export const defineHandler: CommandHandler = {
  id: 'algebra.function.define',
  examples: [
    'f(x) = 2x + 1',
    'f(x) = x^2',
    'g(x)=sin(x) grafiğini çiz',
    'y = x^2 - 4 parabolünü çiz',
    'h(x) = |x-2|',
    'y = a*x',
    'y = mx + n doğrusunu çiz',
    'f(x) = 0,5x² - 3 fonksiyonunu kırmızı çiz',
    'p(x) = sqrt(x) çizer misin',
  ],
  match(c, scene) {
    // "x = 2cos(θ); y = 2sin(θ)": θ parametresi y = f(x) tanımı olamaz; parametrik eğri (konikler) ailesinindir.
    if (c.definition && /θ/.test(c.definition.body)) return 0;
    const parts = definitionParts(c, scene);
    if (!parts) return 0;
    if (parts.prepared.trailing.length && hasForeignEditVerb(parts.tail)) return 0;
    // "x = 2, y = 3 olan K noktası": eşitlik başka bir nesnenin koşuludur ("… doğrusu/grafiği" ise fonksiyondur).
    if (parts.prepared.trailing.length && parts.tail.hasNoun('point', 'segment', 'ray', 'circle', 'ellipse', 'arc', 'sector', 'angle', 'triangle', 'square', 'rectangle', 'polygon', 'vector')) return 0;
    // "y = 2x + 1 doğrusunun eğimi kaç", "… denklemi nedir": soru ölçme ailesinindir; yeni fonksiyon çizilmez.
    if (parts.prepared.trailing.length && /\begim|\bdenklem\w* (?:nedir|ne|kac)\b/.test(parts.tail.text)) return 0;
    return 97;
  },
  run(c, scene) {
    const parts = definitionParts(c, scene) ?? skip();
    const display = parts.name === 'y' ? 'y' : `${parts.name}(x)`;
    if (!parts.prepared.ok) fail(`${display} = … ifadesi anlaşılamadı: ${parts.prepared.error} Örnek: “f(x) = 2x + 1”.`);
    const color = parts.prepared.trailing.length ? colorIn(parts.tail) : undefined;
    defineFunction(scene, { name: parts.name, expression: parts.prepared.expression, color });
  },
};

// ---------------------------------------------------------------------------
// "x kare fonksiyonunu çiz", "karekök x grafiği", "y eşittir 2x artı 1"
// ---------------------------------------------------------------------------

const isPlain = (w: string) => /^[\p{L}'’′]+$/u.test(w);
const LEADING_MATH = /^(?:x|iks|y|e|pi|sin|cos|tan|sqrt|abs|ln|log|exp|karekok|kupkok|kok|sinus|kosinus|cosinus|tanjant|mutlak|logaritma|sifir|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|yirmi|otuz|kirk|elli|yuz|yarim|eksi)$/;
/** "f fonksiyonu x kare olsun": addan sonra gelen yalın/belirtme hâlli fonksiyon sözcüğü. */
const NAMED_FUNCTION_NOUN = /^(?:fonksiyon|fonksiyonu|fonksiyonunu|fonksiyonum)$/;
const DEFINE_TAIL = /^(?:olsun|olarak|tanimla\w*|yap\w*|ciz\w*|degistir\w*|guncelle\w*|ayarla\w*|belirle\w*|lutfen|et|olur|olacak)$/;

/** "f fonksiyonu x kare olsun", "g fonksiyonunu sinüs x olarak tanımla" → ad ve gövde. */
function namedAfterNoun(tokens: string[], foldedTokens: string[], noun: number): { name: string; body: string } | null {
  if (noun < 1 || !NAMED_FUNCTION_NOUN.test(foldedTokens[noun])) return null;
  const m = tokens[noun - 1].match(/^([a-zA-Z])(?:\(\s*x\s*\))?$/);
  if (!m || /^[xy]$/i.test(m[1]) || PARSER_FUNCTION_NAMES.test(m[1])) return null;
  let end = tokens.length;
  while (end > noun + 1 && DEFINE_TAIL.test(foldedTokens[end - 1])) end--;
  const body = tokens.slice(noun + 1, end).join(' ');
  return body ? { name: m[1].toLowerCase(), body } : null;
}

function wordsFormula(c: Clause, scene: CommandScene): { name?: string; expression: string } | null {
  if (c.definition || c.assignment || HAS_QUOTE.test(c.raw)) return null;
  const tokens = c.raw.trim().replace(/[.!?]+$/, '').split(/\s+/).filter(Boolean);
  const foldedTokens = tokens.map(t => fold(t).replace(/['’′]/g, ''));
  let name: string | undefined;
  let body: string;
  /** Gövde adın ardından yazıldıysa sonda yalnızca tanım sözcükleri kalabilir ("f fonksiyonunu x ekseninde yansıt" bir tanım değildir). */
  let strict = false;
  const eq = foldedTokens.indexOf('esittir');
  if (eq >= 1) {
    const head = tokens.slice(0, eq).join(' ');
    const m = head.match(/(?:^|\s)([\p{L}])(?:\s*\(\s*x\s*\)|\s+x)?$/u);
    if (!m || /^x$/i.test(m[1])) return null;
    name = /^y$/i.test(m[1]) ? 'y' : m[1];
    body = tokens.slice(eq + 1).join(' ');
  } else {
    const noun = foldedTokens.findIndex(w => FUNCTION_NOUN.test(w));
    if (noun < 1) return null;
    let start = 0;
    const base = (t: string) => fold(t.replace(/['’′][\p{L}]*$/u, ''));
    while (start < noun && isPlain(tokens[start]) && !LEADING_MATH.test(base(tokens[start]))) start++;
    body = tokens.slice(start, noun).join(' ');
    if (!body.trim()) {
      const named = namedAfterNoun(tokens, foldedTokens, noun);
      if (!named) return null;
      name = named.name;
      body = named.body;
      strict = true;
    }
  }
  if (!body.trim()) return null;
  const prepared = prepareExpression(body, scene);
  if (!prepared.ok || !mentionsX(prepared.expression) || (strict && prepared.trailing.length)) return null;
  return { name, expression: prepared.expression };
}

export const wordsFunctionHandler: CommandHandler = {
  id: 'algebra.function.words',
  examples: [
    'x kare fonksiyonunu çiz',
    'x küp grafiğini çiz',
    'karekök x fonksiyonunu çizer misin',
    'sinüs x grafiği',
    'x kare eksi 4 parabolünü çiz',
    'y eşittir 2x artı 1',
  ],
  match(c, scene) {
    if (WIDGET_NOUN.test(c.text) || hasForeignEditVerb(c, ['scale'])) return 0;
    const formula = wordsFormula(c, scene);
    if (!formula) return 0;
    // Aynı ifadeli fonksiyon zaten varsa "… fonksiyonunu kalın yap" gibi cümleler düzenleme ailesinindir.
    const same = scene.ofType('function').some(f => f.expression.replace(/\s+/g, '') === formula.expression.replace(/\s+/g, ''));
    if (same && c.verbs.size && !/\b(?:ciz|olustur|ekle|tanimla)/.test(c.text)) return 0;
    // Açık "fonksiyon/grafik/parabol" sözcüğü ve x içeren geçerli ifade: "sinüs x grafiği" bir trigonometri ölçümü değildir.
    return FUNCTION_NOUN.test(c.text) ? 60 : 54;
  },
  run(c, scene) {
    const formula = wordsFormula(c, scene) ?? skip();
    defineFunction(scene, { name: formula.name, expression: formula.expression, color: colorIn(c) });
  },
};

// ---------------------------------------------------------------------------
// "fonksiyon çiz" (ifade yok) → Fonksiyon penceresi
// ---------------------------------------------------------------------------

export const functionDialogHandler: CommandHandler = {
  id: 'algebra.function.dialog',
  examples: ['fonksiyon çiz', 'yeni bir fonksiyon ekle', 'fonksiyon oluştur', 'bir grafik çiz', 'fonksiyon tanımla', 'fonksiyon eklemek istiyorum'],
  match(c, scene) {
    if (c.definition || c.assignment || !FUNCTION_NOUN.test(c.text) || WIDGET_NOUN.test(c.text)) return 0;
    if (!c.hasVerb('create') || hasForeignEditVerb(c, ['scale', 'measure', 'show', 'play', 'stop']) || c.labels.length || c.numbers.length || c.coords.length) return 0;
    if (wordsFormula(c, scene) || /\b(?:uydur|polinom|regresyon)/.test(c.text) || colorIn(c)) return 0;
    // "f fonksiyonunu …": adı yazılmış var olan bir fonksiyondan söz ediliyor.
    const words = rawWords(c.raw);
    const noun = words.findIndex(w => FUNCTION_NOUN.test(w.folded));
    if (noun > 0 && /^[\p{L}][\p{L}\p{N}]?$/u.test(words[noun - 1].raw.replace(/['’′][\p{L}]*$/u, ''))) return 0;
    return 10;
  },
  run(_c, scene) {
    scene.act({ kind: 'openDialog', dialog: 'function' });
    scene.say(`Fonksiyon penceresi açıldı. İfadeyi orada yazın ya da doğrudan “${nextFunctionName(scene)}(x) = 2x + 1” gibi yazabilirsiniz.`);
  },
};

// ---------------------------------------------------------------------------
// Polinom uydurma
// ---------------------------------------------------------------------------

/**
 * "A, B, C noktalarına 2. dereceden polinom uydur" cümlesi, sıra sayısındaki nokta yüzünden
 * "A, B, C noktalarına 2" + "dereceden polinom uydur" diye bölünür. İlk parça noktaları ve dereceyi
 * burada bırakır, ikinci parça kullanır.
 */
const pendingFit = new WeakMap<CommandScene, { pointIds: string[]; degree: number; message: string }>();

const ORDINALS: Record<string, number> = { birinci: 1, ikinci: 2, ucuncu: 3, dorduncu: 4, besinci: 5, altinci: 6, yedinci: 7, sekizinci: 8 };

function parseDegree(c: Clause): number | undefined {
  const t = c.text;
  let m = t.match(/(#\d+)\s*\.?\s*(?:inci|nci|uncu|ncu|\.)?\s*derece/) ?? t.match(/\bderece\w*\s*(?::|=)?\s*(#\d+)/);
  if (m) return c.num(m[1]);
  m = t.match(/\b(birinci|ikinci|ucuncu|dorduncu|besinci|altinci|yedinci|sekizinci)\s+derece/);
  if (m) return ORDINALS[m[1]];
  if (/\b(?:dogrusal|lineer)\b|\ben uygun dogru/.test(t)) return 1;
  if (/\b(?:kuadratik|karesel|parabol)/.test(t)) return 2;
  if (/\bkubik/.test(t)) return 3;
  return undefined;
}

function pointsOfLabels(c: Clause, scene: CommandScene): PointObject[] | null {
  const result: PointObject[] = [];
  for (const ref of c.labels) {
    const pts = scene.pointsFromLabel(ref.text);
    if (!pts) return null;
    for (const p of pts) if (!result.includes(p)) result.push(p);
  }
  return result;
}

const PREFIX_RE = /^(?:(?:\$\d+[a-z]*|,|ve|ile)\s*)+noktalar[a-z]*\s+(#\d+)$|^(?:secili|secilen|secilmis|tum|butun)\s+noktalar[a-z]*\s+(#\d+)$/;

export const polyfitPrefixHandler: CommandHandler = {
  id: 'algebra.polyfit.prefix',
  examples: [],
  match(c, scene) {
    if (c.verbs.size || c.definition || c.assignment) return 0;
    const m = c.text.match(PREFIX_RE);
    if (!m) return 0;
    const degree = c.num((m[1] ?? m[2])!);
    if (!Number.isInteger(degree) || degree < 0 || degree > 8) return 0;
    // Fiilsiz "A, B, C noktalarına 2" nokta oluşturma değildir; basic.point (40) ile eşitlikte kayıt sırası kaybettirir.
    return 44;
  },
  run(c, scene) {
    const m = c.text.match(PREFIX_RE) ?? skip();
    const degree = c.num((m[1] ?? m[2])!);
    const missing = c.labels.find(ref => !scene.pointsFromLabel(ref.text));
    if (missing) fail(`${missing.text} noktası bulunamadı.`);
    const points = c.labels.length ? pointsOfLabels(c, scene) ?? skip()
      : /\b(?:tum|butun)\b/.test(c.text) ? scene.points() : scene.selection.map(id => scene.get(id)).filter((o): o is PointObject => o?.type === 'point');
    const message = `${points.map(p => p.label).join(', ')} noktaları seçildi.`;
    pendingFit.set(scene, { pointIds: points.map(p => p.id), degree, message });
    scene.setFocus(points.map(p => p.id));
    scene.say(message);
  },
};

export const polyfitHandler: CommandHandler = {
  id: 'algebra.polyfit',
  examples: [
    'A, B, C noktalarına 2. dereceden polinom uydur',
    'A, B ve C noktalarına ikinci dereceden polinom uydur',
    'seçili noktalara doğrusal regresyon uygula',
    'tüm noktalara 3. derece polinom uydur',
    'ABCD noktalarından geçen kübik polinomu bul',
    'A, B, C, D noktalarına en uygun parabolü uydur',
    'seçili noktaları doğrusal fonksiyona dönüştür',
  ],
  match(c) {
    if (c.definition || c.assignment || WIDGET_NOUN.test(c.text)) return 0;
    // "noktaları doğrusal fonksiyona dönüştür", "A, B, C noktalarından doğrusal fonksiyon oluştur" da uydurmadır; noktalar
    // anılmadan "doğrusal fonksiyon çiz" ise f(x) = x demektir (sözcüklü fonksiyon ailesi).
    const noktalardanFonksiyon = /\bfonksiyon\w* donustur|\bdogrusal fonksiyon/.test(c.text) && (/\bnokta/.test(c.text) || c.labels.length >= 2);
    if (!noktalardanFonksiyon && !/\bpolinom|\bregresyon|\buydur|\ben uygun (?:dogru|egri|parabol)|\bgecen (?:parabol|polinom|kubik|egri)/.test(c.text)) return 0;
    if (hasForeignEditVerb(c)) return 0;
    // Uydurma bir hesaplamadır; "2. derece polinom" içindeki "derece" açı ölçümü (measure.angle 56) sanılmasın.
    return 58;
  },
  run(c, scene) {
    const pending = pendingFit.get(scene);
    pendingFit.delete(scene);
    let points: PointObject[];
    if (c.labels.length) {
      points = [];
      for (const ref of c.labels) {
        const pts = scene.pointsFromLabel(ref.text) ?? fail(`${ref.text} noktası bulunamadı.`);
        for (const p of pts) if (!points.includes(p)) points.push(p);
      }
    } else if (pending) {
      points = pending.pointIds.map(id => scene.point(id));
    } else if (/\b(?:tum|butun)\b/.test(c.text)) {
      points = scene.points();
    } else {
      const pick = (ids: string[]) => ids.map(id => scene.get(id)).filter((o): o is PointObject => o?.type === 'point');
      const sources = c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
      points = sources.map(pick).find(list => list.length >= 2) ?? [];
    }
    if (points.length < 2) fail('Polinom uydurulacak noktaları yazın (ör. “A, B, C noktalarına 2. dereceden polinom uydur”) ya da noktaları seçin.');

    const written = pending?.degree ?? parseDegree(c);
    const degree = written ?? Math.min(2, points.length - 1);
    if (!Number.isInteger(degree) || degree < 0 || degree > 8) fail('Polinomun derecesi 0 ile 8 arasında bir tam sayı olmalı.');
    if (points.length < degree + 1) fail(`${degree}. derece için en az ${degree + 1} nokta gerekir; ${points.length} nokta verildi.`);
    const coords = points.map(p => ({ x: p.x, y: p.y }));
    const coefficients = fitPolynomial(coords, degree)
      ?? fail('Bu noktalara polinom uydurulamadı. Aynı x değerinde birden çok nokta varsa derece düşürülmeli.');
    const expression = polynomialToExpression(coefficients);
    const r2 = coefficientOfDetermination(coords, coefficients);
    const name = nextFunctionName(scene);
    // Fonksiyon rengi (pembe seçim rengiyle karışıyordu); sonuç seçilir ki Delete noktaları değil eğriyi silsin.
    const { fn } = scene.addFunction(expression, { label: `${name}(x) = ${expression}`, color: colorIn(c) });
    scene.setFocus([fn.id]);

    if (pending) {
      const index = scene.messages.lastIndexOf(pending.message);
      if (index >= 0) scene.messages.splice(index, 1);
    }
    const names = points.map(p => p.label).join(', ');
    const ne = degree === 1 ? 'en uygun doğru (doğrusal regresyon)' : `${degree}. derece polinom`;
    // "Tam geçiyor" R²'ye göre değil artıklara göre: R² = 0,9994 olan doğru noktaların hepsinden geçmez.
    scene.say(`${names} noktalarına ${ne} uyduruldu: ${functionName(fn)} = ${expression} (R² = ${trNum(r2, 4)}${noktalardanTamGeciyor(coords, coefficients) ? ', noktalardan tam geçiyor' : ''}).`
      + (written === undefined ? ` Derece yazılmadığı için ${degree} alındı.` : ''));
  },
};

export const functionHandlers: CommandHandler[] = [defineHandler, wordsFunctionHandler, functionDialogHandler, polyfitHandler, polyfitPrefixHandler];

/** Testler için. */
export const _internal = { wordsFormula, parseDegree, rawWords };
