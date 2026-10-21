import type { FunctionObject, MathObject, ObjectType, SliderObject } from '@/types/math';
import { evaluateNumericInput, extractVariableNames, validateMathExpression } from '@/math/parser';
import { functionDefinitionCycle, nextFunctionName as nextFreeFunctionName, undefinedFunctionCalls } from '@/math/functionNames';
import { type Clause, type LabelRef, type VerbKind, detectVerbs, fold, labelKey, parseClause } from '../../text';
import { type CommandScene, fail } from '../../scene';

// ---------------------------------------------------------------------------
// Sözcük kalıpları (katlanmış metin üzerinde)
// ---------------------------------------------------------------------------

export const SLIDER_NOUN = /\b(?:kaydirici|surgu|parametre)/;
export const FUNCTION_NOUN = /\b(?:fonksiyon|grafi[gk]|parabol|egri(?!\s*uydur))/;
export const TEXT_NOUN = /\b(?:yazi(?!m|l\b|lim)|metin|metn|not(?:u|unu|unun|lar\w*)?\b|baslig|baslik)/;
export const FRACTION_NOUN = /\bkes(?:ir|ri)/;
export const CHECKBOX_NOUN = /\b(?:onay|isaret|secim) kutu/;
export const BUTTON_NOUN = /\b(?:dugme|buton)/;
export const INPUT_NOUN = /\b(?:girdi|giris|deger) (?:kutu|alan)/;
export const WIDGET_NOUN = new RegExp(`${CHECKBOX_NOUN.source}|${BUTTON_NOUN.source}|${INPUT_NOUN.source}`);
export const ANIMATION_WORD = /\b(?:animasyon|canlandirma|hareket(?:lendir|i)?)/;

/** Kaydırıcı penceresinin (SliderDialog) ad listesi ve yasak adları. */
export const SLIDER_CANDIDATES = ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'y', 'z'];
export const SLIDER_RESERVED = new Set(['x', 'pi', 'e', 'ln']);
/** Ayrıştırıcının değişken adı kuralı (parser.ts VARIABLE_NAME_RE). */
export const VARIABLE_NAME_RE = /^[a-zçğıöşü][a-zçğıöşü0-9]?$/;
/** Fonksiyon penceresinin (FunctionDialog) ad sırası. */
export const FUNCTION_NAMES = ['f', 'g', 'h', 'p', 'q', 'r', 's', 'u', 'v', 'w'];
const PARSER_FUNCTIONS = new Set(['sin', 'cos', 'tan', 'cot', 'asin', 'acos', 'atan', 'sind', 'cosd', 'tand', 'cotd', 'sqrt', 'kok', 'cbrt', 'kupkok', 'root', 'abs', 'mutlak',
  'exp', 'ln', 'log', 'floor', 'ceil', 'round', 'min', 'max', 'pow']);

/** Sıfat-fiil ("gizleyen", "oynatan", "0 yapan") olarak geçen fiiller bir nesnenin görevini anlatır; emir değildir. */
const PARTICIPLE = /^[a-z]{2,}(?:yan|yen|an|en|acak|ecek)$/;

/** "mavi renkte çiz", "kırmızı renkli ekle": oluşturulan nesnenin biçimi; boyama emri değil. */
const COLOR_ADJECTIVE = /\b(?:renkte|renkli|renginde)\b/g;

/** Sıfat-fiiller dışındaki fiiller (yer tutuculu katlanmış metin üzerinde). */
export function finiteVerbsOf(text: string): Set<VerbKind> {
  const words = text.replace(/"\d+"/g, ' ').split(/\s+/).filter(w => w && !PARTICIPLE.test(w));
  const joined = words.join(' ');
  return detectVerbs(/\b(?:ciz|olustur|ekle|koy|tanimla)/.test(joined) ? joined.replace(COLOR_ADJECTIVE, ' ') : joined);
}

/** Sıfat-fiiller dışındaki fiiller ("onay kutusunu gizle" → hide; "ABC'yi gizleyen onay kutusu ekle" → yalnızca create). */
export function finiteVerbs(c: Clause): Set<VerbKind> {
  return finiteVerbsOf(c.text);
}

/** Başka ailelerin düzenleme fiilleri (sil, gizle, boya, taşı, adlandır, kopyala, seç, bağla…). */
export const FOREIGN_EDIT_VERBS: VerbKind[] = ['delete', 'hide', 'color', 'move', 'rename', 'copy', 'select', 'bind', 'rotate', 'reflect', 'translate', 'lock', 'unlock', 'undo', 'redo', 'zoom'];

export function hasForeignEditVerb(c: Clause, extra: VerbKind[] = []): boolean {
  const verbs = finiteVerbs(c);
  return [...FOREIGN_EDIT_VERBS, ...extra].some(v => verbs.has(v));
}

export const isStopword = (w: string) => /^(?:ve|ile|bir|bu|su|o|de|da|ki|mi|mu|lutfen|bana|simdi|hadi|yeni|tane|icin|olan|olsun|tum|butun|baska|ayni)$/.test(w);

// ---------------------------------------------------------------------------
// Tırnaklar
// ---------------------------------------------------------------------------

/**
 * text.ts'deki tırnak biçimleri ve ek olarak tek tırnak: ‘…’ ile boşlukla ayrılmış '…' ("A'nın" gibi kesme işaretleri tırnak sayılmaz).
 */
const QUOTE_RE = /"([^"]*)"|“([^”]*)”|«([^»]*)»|„([^“”]*)[“”]|‘([^’]*)’|(?<=^|\s)'([^'\s][^']*?)'(?=[\s.,;:!?]|$)/g;

/** Ham metindeki tırnak içleri (tanım/atama algılamasından etkilenmez). */
export function rawQuotes(raw: string): string[] {
  return [...raw.matchAll(QUOTE_RE)].map(m => m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6] ?? '');
}

/**
 * Tırnak içlerini boşaltarak cümleyi yeniden çözümler. "y = 2x" gibi tırnak içi yazılar
 * tanım sanılmaz; renk, konum ve etiketler yalnızca tırnak dışından okunur.
 */
export function reparseWithoutQuotes(c: Clause, scene: CommandScene): { clause: Clause; quotes: string[] } {
  const quotes: string[] = [];
  const masked = c.raw.replace(QUOTE_RE, (_m, a, b, d, e, f, g) => { quotes.push(a ?? b ?? d ?? e ?? f ?? g ?? ''); return ` "${quotes.length - 1}" `; });
  return { clause: parseClause(masked, scene.known()), quotes };
}

// ---------------------------------------------------------------------------
// Sayılar
// ---------------------------------------------------------------------------

export const NUMBER_WORDS: Record<string, number> = {
  sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30, kirk: 40,
  elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90, yuz: 100,
};

/** Değer metni: "3", "2,5", "-1", "pi/2", "2*b" (kaydırıcı değerleriyle anlık hesap). */
export function evaluateValue(raw: string, scene: CommandScene): { ok: true; value: number } | { ok: false; error: string } {
  const text = raw.trim().replace(/[−–]/g, '-');
  if (/(?:^|[^a-zçğıöşü])x(?:[^a-zçğıöşü(]|$)/i.test(text)) return { ok: false, error: 'Değer x içeremez. Fonksiyon için “f(x) = …” yazın.' };
  const scope: Record<string, number> = {};
  for (const s of scene.sliders()) scope[s.variableName] = s.value;
  const result = evaluateNumericInput(text, scope);
  if (!result.ok) return result;
  if (!Number.isFinite(result.value) || Math.abs(result.value) > 1e6) return { ok: false, error: 'Değer −1000000 ile 1000000 arasında olmalı.' };
  return result;
}

// ---------------------------------------------------------------------------
// Kaydırıcılar
// ---------------------------------------------------------------------------

/** Değişken adıyla (tam, sonra büyük/küçük harf ve Türkçe harf duyarsız) ya da etiketle kaydırıcı. */
export function findSlider(scene: CommandScene, name: string): SliderObject | undefined {
  const sliders = scene.sliders();
  const exact = sliders.filter(s => s.variableName === name);
  if (exact.length) return exact[exact.length - 1];
  const key = labelKey(name);
  const loose = sliders.filter(s => labelKey(s.variableName) === key);
  if (loose.length === 1) return loose[0];
  if (loose.length > 1) fail(`${name} adına benzeyen birden fazla kaydırıcı var (${loose.map(s => s.variableName).join(', ')}). Adı tam yazın.`);
  const byLabel = sliders.filter(s => labelKey(s.label) === key);
  return byLabel.length === 1 ? byLabel[0] : undefined;
}

/** Konuşma tanımanın harf adları: "be kaydırıcısı" → b, "ce yi 3 yap" → c. */
export const SPOKEN_LETTERS: Record<string, string> = {
  be: 'b', ce: 'c', de: 'd', fe: 'f', ge: 'g', he: 'h', ke: 'k', ka: 'k', le: 'l', me: 'm', ne: 'n', pe: 'p', re: 'r', se: 's', te: 't', ze: 'z',
};

/** Adıyla, yoksa konuşmadaki harf adıyla ("be" → b) kaydırıcı. */
export function sliderByName(scene: CommandScene, name: string): SliderObject | undefined {
  const direct = findSlider(scene, name);
  if (direct) return direct;
  const letter = SPOKEN_LETTERS[fold(name)];
  return letter ? findSlider(scene, letter) : undefined;
}

const MERGED_SUFFIX = /^(?:yi|yu|nin|nun|in|un|i|u|ya|ye|a|e|da|de|dan|den)$/;
const DETACHED_WORD = /^(?:yi|yu|nin|nun|in|un|i|u|ya|ye|a|e|da|de|dan|den)$/;
/** Kaydırıcı adı + ek gibi görünen ama gündelik sözcük olanlar. */
const NOT_MERGED = new Set(['bu', 'su', 'ki', 'mi', 'mu', 'ne', 'de', 'da', 'ya', 'ye', 'yi', 'yu', 'te', 'ta', 'in', 'un', 'nin', 'nun', 'dan', 'den',
  've', 'ada', 'ade', 'bin', 'sin', 'min', 'pi', 'la', 'le', 'neyi', 'neye', 'seyi', 'bi', 'dun', 'sun', 'kaya']);

/** Kesme işaretsiz bitişik yazılmış ad + ek: "ayı", "anın", "beyi" (yalnızca var olan kaydırıcılar). */
function mergedSlider(scene: CommandScene, folded: string): SliderObject | undefined {
  if (folded.length < 2 || NOT_MERGED.has(folded) || folded in SPOKEN_LETTERS) return undefined;
  const sliders = [...scene.sliders()].sort((a, b) => b.variableName.length - a.variableName.length);
  for (const s of sliders) {
    const key = labelKey(s.variableName);
    if (folded.startsWith(key) && MERGED_SUFFIX.test(folded.slice(key.length))) return s;
  }
  for (const [spoken, letter] of Object.entries(SPOKEN_LETTERS)) {
    if (folded.startsWith(spoken) && MERGED_SUFFIX.test(folded.slice(spoken.length))) {
      const s = findSlider(scene, letter);
      if (s) return s;
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Konuşmadaki sayılar
// ---------------------------------------------------------------------------

const UNITS: Record<string, number> = { sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9 };
const TENS: Record<string, number> = { on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90 };
const DATIVE: Record<string, number> = { sifira: 0, bire: 1, ikiye: 2, uce: 3, dorde: 4, bese: 5, altiya: 6, yediye: 7, sekize: 8, dokuza: 9, yirmiye: 20,
  otuza: 30, kirka: 40, elliye: 50, altmisa: 60, yetmise: 70, seksene: 80, doksana: 90, yuze: 100 };
const ABLATIVE: Record<string, number> = { sifirdan: 0, birden: 1, ikiden: 2, ucten: 3, dortten: 4, besten: 5, altidan: 6, yediden: 7, sekizden: 8,
  dokuzdan: 9, ondan: 10, yirmiden: 20, otuzdan: 30, kirktan: 40, elliden: 50, yuzden: 100 };
/** "bir" bu sözcüklerden önce ya da sonra geliyorsa tanımlık değil, 1 sayısıdır. */
const ONE_BEFORE = /^(?:yap\w*|olsun|olarak|artir\w*|arttir\w*|azalt\w*|dusur\w*|eksilt\w*|yukselt\w*|ayarla\w*|esitle\w*|birim\w*|bolu|tam|bucuk|arasi\w*|araligi\w*|kadar|degerinde|degerli|getir\w*|cek\w*)$/;
const ONE_AFTER = /^(?:bolu|tam|esittir|esit|=|degeri|degerini|degerine|adimi|adimini|eksi|arti|ikide|ucte|dortte|beste|altida|yedide|sekizde|dokuzda|onda|yirmide|otuzda)$/;

/**
 * Konuşmada sık görülen, çözümleyicinin sayı saymadığı biçimleri rakama çevirir:
 * "beşe ayarla" → "5'e ayarla", "sıfırdan ona kadar" → "0'dan 10'a kadar", "bir azalt" → "1 azalt", "üçte bir" → "üçte 1",
 * "eksi beş" → "-5". Değişiklik yoksa metin aynen döner.
 */
export function rewriteSpokenNumbers(raw: string): string {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const folded = tokens.map(t => fold(t).replace(/['’′]/g, ''));
  const out: string[] = [];
  const outFolded: string[] = [];
  let changed = false;
  const numberish = (w: string) => /^-?\d/.test(w) || w in UNITS || w in TENS || w in DATIVE || w === 'ona' || /^basla/.test(w);
  const push = (value: string, f = fold(value)) => { out.push(value); outFolded.push(f); };
  for (let i = 0; i < tokens.length; i++) {
    const w = folded[i], prev = outFolded[outFolded.length - 1] ?? '', next = folded[i + 1] ?? '';
    const tensBefore = TENS[prev];
    // "eksi beşten beşe kadar" → "-5'den 5'e kadar"
    if (w === 'eksi' && (next in DATIVE || (next in ABLATIVE && (!/^(?:birden|ondan)$/.test(next) || numberish(folded[i + 2] ?? ''))))) {
      push(next in DATIVE ? `-${DATIVE[next]}'e` : `-${ABLATIVE[next]}'den`);
      i++;
      changed = true;
      continue;
    }
    let value: number | undefined, suffix = '';
    if (w in DATIVE || (w === 'ona' && /^(?:kadar|dek)$/.test(next))) { value = w === 'ona' ? 10 : DATIVE[w]; suffix = "'e"; }
    else if (w in ABLATIVE && (!/^(?:birden|ondan)$/.test(w) || numberish(next))) { value = ABLATIVE[w]; suffix = "'den"; }
    else if (w === 'bir' && (ONE_BEFORE.test(next) || ONE_AFTER.test(prev))) value = 1;
    if (value !== undefined) {
      if (tensBefore !== undefined && value > 0 && value < 10) { out.pop(); outFolded.pop(); value += tensBefore; }
      push(`${value}${suffix}`);
      changed = true;
      continue;
    }
    if (w === 'eksi' && (/^\d/.test(next) || next in UNITS || next in TENS)) {
      let n = /^\d/.test(next) ? Number(next.replace(',', '.')) : UNITS[next] ?? TENS[next];
      let j = i + 2;
      if (next in TENS && folded[j] in UNITS) { n += UNITS[folded[j]]; j++; }
      if (Number.isFinite(n)) {
        push(`-${/^\d/.test(next) ? tokens[i + 1] : n}`);
        i = j - 1;
        changed = true;
        continue;
      }
    }
    push(tokens[i], w);
  }
  return changed ? out.join(' ') : raw;
}

/** Konuşmadaki sayılar rakama çevrilmiş cümle (değişiklik yoksa aynı cümle). */
export function spokenNumberClause(c: Clause, scene: CommandScene): Clause {
  const raw = rewriteSpokenNumbers(c.raw);
  return raw === c.raw ? c : parseClause(raw, scene.known());
}

/** Katlanmış ham sözcükler (kesme ve noktalama atılmış), özgün yazımlarıyla. */
export function rawWords(raw: string): { raw: string; folded: string }[] {
  return raw.split(/\s+/).filter(Boolean).map(w => {
    const clean = w.replace(/^[("“«[]+|[)"”»\],.;:!?]+$/g, '');
    return { raw: clean, folded: fold(clean).replace(/['’′]/g, '') };
  }).filter(w => w.raw);
}

/** Ad olabilecek sözcüğün kesme ekinden arınmış hâli: "a'nın" → "a", "k1'i" → "k1". */
export const stripSuffix = (w: string) => w.replace(/['’′][a-zçğıöşüA-ZÇĞİÖŞÜ]*$/, '');

/**
 * Cümlede adı geçen kaydırıcılar: etiketler ("a'yı", "ab"), kaydırıcı sözcüğünden önceki adlar ("k parametresi"),
 * konuşma biçimleri ("ayı", "anın", "be yi", "be kaydırıcısı"). unknown: kaydırıcı gibi yazılmış ama sahnede olmayan adlar ("q'yu", "z'yi").
 */
export function slidersInClause(c: Clause, scene: CommandScene): { sliders: SliderObject[]; unknown: string[] } {
  const found: SliderObject[] = [];
  const unknown: string[] = [];
  const add = (s: SliderObject | undefined) => { if (s && !found.includes(s)) found.push(s); };
  const addUnknown = (name: string) => { if (!unknown.includes(name)) unknown.push(name); };
  for (const ref of c.labels) {
    if (ref.bracket) continue;
    const slider = findSlider(scene, ref.text);
    if (slider) add(slider);
    else if (ref.lowercase && /^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9]?$/.test(ref.text) && !scene.resolveLabel(ref).length && !scene.pointsFromLabel(ref.text)) {
      addUnknown(ref.text.toLocaleLowerCase('tr'));
    }
  }
  const words = rawWords(c.raw.replace(/"[^"]*"|“[^”]*”|«[^»]*»/g, ' '));
  words.forEach((w, i) => {
    if (i === 0 || !SLIDER_NOUN.test(w.folded)) return;
    for (let j = i - 1; j >= 0; j--) {
      const prev = words[j];
      if (/^(?:ve|ile)$/.test(prev.folded)) continue;
      const name = stripSuffix(prev.raw);
      const slider = /^[\p{L}][\p{L}\p{N}_]{0,11}$/u.test(name) ? sliderByName(scene, name) : undefined;
      if (!slider) break;
      add(slider);
    }
  });
  words.forEach((w, i) => {
    const apostrophe = w.raw.match(/^([\p{L}][\p{L}\p{N}]?)['’′]\p{L}+$/u);
    if (apostrophe) {
      const name = apostrophe[1];
      const slider = sliderByName(scene, name);
      if (slider) add(slider);
      else if (/^[a-zçğıöşü][a-zçğıöşü0-9]?$/.test(name) && name !== 'x' && !scene.resolveLabel(name).length && !scene.pointsFromLabel(name) && !findFunction(scene, name)) {
        addUnknown(name);
      }
      return;
    }
    if (w.folded in SPOKEN_LETTERS) {
      const next = words[i + 1]?.folded ?? '';
      if (DETACHED_WORD.test(next)) add(sliderByName(scene, w.folded));
      return;
    }
    add(mergedSlider(scene, w.folded));
  });
  return { sliders: found, unknown };
}

/** Seçim ya da önceki cümlede kalan kaydırıcılar; yoksa sahnedeki tek kaydırıcı. */
export function contextSliders(c: Clause, scene: CommandScene): SliderObject[] {
  const pick = (ids: string[]) => ids.map(id => scene.get(id)).filter((o): o is SliderObject => o?.type === 'slider');
  const sources = c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
  for (const ids of sources) { const list = pick(ids); if (list.length) return list; }
  const all = scene.sliders();
  return all.length === 1 ? all : [];
}

export function nextSliderName(scene: CommandScene, reserved: string[] = []): string {
  const used = new Set([...scene.sliders().map(s => s.variableName), ...reserved]);
  const name = SLIDER_CANDIDATES.find(n => !used.has(n));
  if (name) return name;
  for (const base of SLIDER_CANDIDATES) for (let i = 1; i <= 9; i++) if (!used.has(`${base}${i}`)) return `${base}${i}`;
  return fail('Boş kaydırıcı adı kalmadı. Adı kendiniz yazın (ör. “k1 kaydırıcısı oluştur”).');
}

/** Kaydırıcı adı denetimi (SliderDialog ile aynı kurallar). */
export function checkSliderName(name: string, scene: CommandScene): string {
  const lower = name.toLocaleLowerCase('tr');
  if (SLIDER_RESERVED.has(lower)) fail(`“${lower}” ${lower === 'x' ? 'fonksiyonların değişkenidir' : 'sabit ya da fonksiyon adıdır'}; kaydırıcı adı olarak kullanılamaz. Başka bir ad seçin (ör. a, k).`);
  if (!VARIABLE_NAME_RE.test(lower)) fail(`“${name}” kaydırıcı adı olamaz: ad harfle başlayan 1–2 karakter olmalı (ör. a, k, t1).`);
  if (scene.sliders().some(s => s.variableName === lower)) fail(`${lower} adlı kaydırıcı zaten var. Değerini değiştirmek için “${lower} = 3” yazın.`);
  return lower;
}

export interface RangeSpec { min?: number; max?: number; step?: number; value?: number; used: Set<number> }

/**
 * Kaydırıcı aralığı, adımı ve değeri:
 * "0 ile 10 arasında", "-5'ten 5'e kadar", "aralığı [0, 10]", "en küçük değeri 0", "en büyük 10",
 * "adımı 0,5" / "0,5 adımlı", "değeri 3" / "3 değerinde" / "başlangıç değeri 3", "= 3".
 */
export function parseRangeSpec(c: Clause): RangeSpec {
  const spec: RangeSpec = { used: new Set() };
  const t = c.text;
  const take = (ref: string) => { spec.used.add(Number(ref.slice(1))); return c.num(ref); };
  let m = t.match(/(#\d+)\s*(?:ile|ve|-|–|,|dan|den|tan|ten)\s*(#\d+)\s*(?:ya|ye|a|e)?\s*(?:arasi\w*|araliginda|araliktaki|arali\w*|kadar)/)
    ?? t.match(/(?:arali\w*|sinirlari\w*)\s*(?::|=)?\s*(?:\[\s*)?(#\d+)\s*(?:ile|ve|-|–|,|;|dan|den|tan|ten)\s*(#\d+)/);
  if (m) { spec.min = take(m[1]); spec.max = take(m[2]); }
  else {
    const coord = t.match(/(?:arali\w*|sinirlari\w*)\s*(?::|=)?\s*@(\d+)/);
    if (coord) { const p = c.coords[Number(coord[1])]; spec.min = p.x; spec.max = p.y; }
  }
  m = t.match(/(?:en kucuk|minimum\w*|min\b|alt sinir\w*|en az|en dusuk)\s*(?:deger\w*)?\s*(?::|=)?\s*(?:olarak\s+)?(#\d+)/);
  if (m) spec.min = take(m[1]);
  m = t.match(/(?:en buyuk|maksimum\w*|max\b|ust sinir\w*|en fazla|en cok|en yuksek)\s*(?:deger\w*)?\s*(?::|=)?\s*(?:olarak\s+)?(#\d+)/);
  if (m) spec.max = take(m[1]);
  m = t.match(/(?:adim\w*|artis\w*|artim\w*)\s*(?:miktari\w*|buyuklugu\w*)?\s*(?::|=)?\s*(?:olarak\s+)?(#\d+)/) ?? t.match(/(#\d+)\s*(?:birim\s+)?(?:adim|artis|artim)\w*/);
  if (m) spec.step = take(m[1]);
  m = t.match(/(?<!(?:kucuk|buyuk|az|fazla|cok|dusuk|yuksek|min|max|minimum|maksimum)\s)(?:baslangic\s+|ilk\s+|su\s*anki\s+)?deger\w*\s*(?::|=)?\s*(?:olarak\s+)?(#\d+)/)
    ?? t.match(/(#\d+)\s*(?:degerinde|degerli|degerini|degerine|deger\b)/)
    ?? t.match(/=\s*(#\d+)/)
    ?? t.match(/(#\d+)\s*(?:dan|den|tan|ten)?\s*baslayan/);
  if (m) spec.value = take(m[1]);
  return spec;
}

export const unusedNumbers = (c: Clause, spec: RangeSpec) => c.numbers.filter((_, i) => !spec.used.has(i));

// ---------------------------------------------------------------------------
// Fonksiyonlar
// ---------------------------------------------------------------------------

/** Fonksiyon adı: "f(x) = …" etiketinin eşittirden önceki kısmı ("f(x)", "y"). */
export const functionName = (fn: FunctionObject) => fn.label.split('=')[0].trim();

/** Sıradaki boş ad: f, g, h, p … (kaydırıcı adlarıyla da çakışmaz; hepsi doluysa f1, g1 …). */
export function nextFunctionName(scene: CommandScene): string {
  return nextFreeFunctionName(scene.objects);
}

/** "f", "f(x)", "g fonksiyonu", "y" → fonksiyon. */
export function findFunction(scene: CommandScene, name: string): FunctionObject | undefined {
  const key = name.replace(/\s+/g, '').replace(/\(x\)$/i, '');
  const all = scene.ofType('function');
  return all.find(f => functionName(f) === `${key}(x)` || functionName(f) === key)
    ?? all.find(f => labelKey(functionName(f)) === labelKey(`${key}(x)`) || labelKey(functionName(f)) === labelKey(key) || labelKey(f.label) === labelKey(name));
}

/** Cümlede adıyla anılan fonksiyonlar: "f(x)", "f fonksiyonu", "g grafiği". */
export function functionsInClause(c: Clause, scene: CommandScene): FunctionObject[] {
  const found: FunctionObject[] = [];
  const add = (f: FunctionObject | undefined) => { if (f && !found.includes(f)) found.push(f); };
  for (const m of c.raw.matchAll(/(?<![\p{L}\p{N}])([\p{L}][a-zA-Z0-9]{0,2})\s*\(\s*x\s*\)/gu)) add(findFunction(scene, m[1]));
  const words = rawWords(c.raw);
  words.forEach((w, i) => {
    if (i > 0 && FUNCTION_NOUN.test(w.folded)) add(findFunction(scene, stripSuffix(words[i - 1].raw)));
  });
  return found;
}

/** Matematik sözcükleri ve simgeler: sondaki Türkçe sözcükler atılırken bunlara dokunulmaz. */
const MATH_WORD = /^(?:x|iks|y|pi|e|sin|cos|tan|cot|sqrt|abs|ln|log|exp|kare|karesi|kup|kupu|karenin|karesinin|karesini|kupun|kupunun|kupunu|arti|eksi|carpi|bolu|uzeri|ussu|us|karekok|karekoku|kok|koku|kupkok|kupkoku|sinus|sinusu|kosinus|kosinusu|cosinus|tanjant|tanjanti|mutlak|deger|degeri|logaritma|logaritmasi|dogal|sifir|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|yirmi|otuz|kirk|elli|altmis|yetmis|seksen|doksan|yuz|bucuk|yarim|in|nin|un|nun)$/;

const isPlainWord = (token: string) => /^[\p{L}'’′]+$/u.test(token);
const foldWord = (token: string) => fold(stripSuffix(token)).replace(/['’′]/g, '');

/**
 * Tanım gövdesinin sonundaki Türkçe sözcükleri ("grafiğini çiz", "parabolünü", "kırmızı renkte") ayırır.
 * Matematik sözcükleri (kare, artı, sinüs…) gövdede kalır.
 */
export function splitTrailingWords(body: string): { expression: string; trailing: string[] } {
  const tokens = body.trim().split(/\s+/).filter(Boolean);
  const trailing: string[] = [];
  // İlk sözcük hep gövdede kalır: "f(x) = sinx" boşalmasın, ayrıştırıcının hatası gösterilsin.
  while (tokens.length > 1 || (tokens.length === 1 && /[.!?;:,]$/.test(tokens[0]))) {
    const last = tokens[tokens.length - 1];
    const cleaned = last.replace(/[.!?;:,]+$/, '');
    if (cleaned !== last) {
      if (cleaned) tokens[tokens.length - 1] = cleaned; else tokens.pop();
      continue;
    }
    // 1–2 harfli sözcükler ("n", "a1") değişkendir; yalnızca "mi", "ve" gibi ekler atılır.
    const short = foldWord(last).length <= 2 && !/^(?:mi|mu|ve|da|de|ki)$/.test(fold(last));
    if (isPlainWord(last) && !short && !MATH_WORD.test(foldWord(last)) && !PARSER_FUNCTIONS.has(fold(last))) { trailing.unshift(tokens.pop()!); continue; }
    break;
  }
  return { expression: tokens.join(' '), trailing };
}

/** "x kare artı 2x eksi 1", "karekök x", "sinüs x", "x'in karesi", "iki üzeri x" → ayrıştırıcı ifadesi. */
export function translateMathWords(text: string): string {
  const tokens = text.replace(/([()])/g, ' $1 ').trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  const prefix: string[] = [];
  /** Açık parantezler: grubun out içindeki başlangıcı ve parantezden önce bekleyen önekler ("karekök (x artı 1)"). */
  const groups: { start: number; prefix: string[] }[] = [];
  const push = (operand: string) => {
    let value = operand;
    while (prefix.length) value = `${prefix.pop()}(${value})`;
    out.push(value);
  };
  const POSTFIX: Record<string, string> = { karesi: '^2', kupu: '^3', kare: '^2', kup: '^3', karenin: '^2', karesinin: '^2', karesini: '^2', kupun: '^3', kupunun: '^3', kupunu: '^3' };
  const PREFIX: Record<string, string> = { karekok: 'sqrt', kok: 'sqrt', kupkok: 'cbrt', sinus: 'sin', sin: 'sin', kosinus: 'cos', cosinus: 'cos', cos: 'cos',
    tanjant: 'tan', tan: 'tan', mutlak: 'abs', abs: 'abs', logaritma: 'log', log: 'log', ln: 'ln', sqrt: 'sqrt', exp: 'exp' };
  const WRAP_PREVIOUS: Record<string, string> = { karekoku: 'sqrt', koku: 'sqrt', kupkoku: 'cbrt', sinusu: 'sin', kosinusu: 'cos', tanjanti: 'tan', logaritmasi: 'log' };
  const OPERATORS: Record<string, string> = { arti: '+', eksi: '-', carpi: '*', bolu: '/', uzeri: '^', ussu: '^', us: '^' };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '(') { groups.push({ start: out.length, prefix: prefix.splice(0) }); continue; }
    if (token === ')') {
      const group = groups.pop();
      if (!group) { out.push(')'); continue; }
      const inner = out.splice(group.start).join(' ');
      prefix.push(...group.prefix);
      push(`(${inner})`);
      continue;
    }
    if (!isPlainWord(token)) { push(token); continue; }
    const word = foldWord(token);
    // Konuşma: "iks kare" → x^2; "a x artı be" → a x + b (tek başına harf adları katsayıdır).
    if (word === 'iks') { push('x'); continue; }
    if (word in SPOKEN_LETTERS && word !== 'ne' && tokens.length > 1) { push(SPOKEN_LETTERS[word]); continue; }
    const nextWord = i + 1 < tokens.length ? foldWord(tokens[i + 1]) : '';
    if (word === 'mutlak' && nextWord === 'degeri' && out.length) { out[out.length - 1] = `abs(${out[out.length - 1]})`; i++; continue; }
    if (/^(?:in|nin|un|nun|deger|degeri|dogal)$/.test(word)) continue;
    if (word in NUMBER_WORDS || word === 'yarim') {
      let value = word === 'yarim' ? 0.5 : NUMBER_WORDS[word];
      while (i + 1 < tokens.length && isPlainWord(tokens[i + 1])) {
        const next = foldWord(tokens[i + 1]);
        if (next === 'bucuk') { value += 0.5; i++; break; }
        if (!(next in NUMBER_WORDS)) break;
        const n = NUMBER_WORDS[next];
        if (value >= 10 && value < 100 && value % 10 === 0 && n < 10) value += n;
        else if (n === 100 && value < 10) value = (value || 1) * 100;
        else break;
        i++;
      }
      push(String(value));
      continue;
    }
    if (word in POSTFIX && out.length) { out[out.length - 1] = `${out[out.length - 1]}${POSTFIX[word]}`; continue; }
    if (word in WRAP_PREVIOUS && out.length) { out[out.length - 1] = `${WRAP_PREVIOUS[word]}(${out[out.length - 1]})`; continue; }
    if (word in PREFIX) { prefix.push(PREFIX[word]); continue; }
    if (word in OPERATORS) { out.push(OPERATORS[word]); continue; }
    push(stripSuffix(token));
  }
  // Açıkta kalan "karekök" gibi sözcükler ve kapanmamış parantezler ifadeyi geçersiz kılsın (sessizce atılmasın).
  if (prefix.length) out.push(`${prefix.join('(')}(`);
  if (groups.length) out.push('(');
  return out.join(' ');
}

/** "ax", "mx" gibi iki harfli adlar ayrıştırıcıda tek değişkendir; kaydırıcı değilse "a*x" olarak yazılır ("y = mx + n"). */
export function splitCoefficientX(expression: string, scene: CommandScene): string {
  const sliders = new Set(scene.sliders().map(s => s.variableName));
  return expression.replace(/(?<![\p{L}_])(\p{L})([xX])(?![\p{L}\p{N}_(])/gu, (whole, letter: string, x: string) =>
    sliders.has(whole.toLowerCase()) || /[^a-zA-Zçğıöşü]/.test(letter) ? whole : `${letter}*${x}`);
}

/** Gövdeyi geçerli bir ifadeye çevirir: olduğu gibi, sondaki sözcükler atılarak, Türkçe matematik sözcükleri çevrilerek. */
export function prepareExpression(body: string, scene: CommandScene): { ok: true; expression: string; trailing: string[] } | { ok: false; error: string; trailing: string[] } {
  const { expression, trailing } = splitTrailingWords(body);
  const attempts: string[] = [];
  const add = (e: string) => { const v = e.trim(); if (v && !attempts.includes(v)) attempts.push(v); };
  add(expression);
  add(expression.replace(/['’′][a-zçğıöşü]+$/i, ''));
  add(translateMathWords(expression));
  // "x^2 bir grafik çiz": atılan sözcüklerden önceki "bir" tanımlık olabilir ("x kare artı bir" ise sayıdır; önce o denenir).
  const withoutArticle = expression.replace(/\s+bir$/i, '');
  if (trailing.length && withoutArticle !== expression) { add(withoutArticle); add(translateMathWords(withoutArticle)); }
  let firstError = '';
  for (const attempt of attempts) {
    const candidate = splitCoefficientX(attempt, scene);
    const check = validateMathExpression(candidate);
    if (check.ok) return { ok: true, expression: candidate, trailing };
    firstError ||= check.error;
  }
  return { ok: false, error: firstError || 'İfade boş olamaz.', trailing };
}

export const mentionsX = (expression: string) => /(?<![\p{L}])x(?![\p{L}])/iu.test(expression);

/**
 * Fonksiyonu çizer ya da aynı adlı fonksiyonu yeniden tanımlar. Eksik parametreler için kaydırıcı ekler
 * (Fonksiyon penceresiyle aynı: −5…5, adım 0,1, değer 1).
 */
export function defineFunction(scene: CommandScene, o: { name?: string; expression: string; color?: string }): FunctionObject {
  const name = o.name ?? nextFunctionName(scene);
  // "g(x) = f(x) + 1" çalışır; "f(x) = f(x) + 1" ya da tanımsız "h(x)" çağrısı açıklamayla reddedilir.
  const cycle = name === 'y' ? null : functionDefinitionCycle(scene.objects, name, o.expression);
  if (cycle) fail(`${name}(x) kendisine bağlı olamaz: ${cycle.map(n => `${n}(x)`).join(' → ')}. Tanımı başka bir ifadeyle yazın.`);
  const missing = undefinedFunctionCalls(scene.objects, o.expression, name);
  if (missing.length) fail(`${missing.map(n => `${n}(x)`).join(', ')} tanımlı değil. Önce ${missing[0]}(x) = … ile tanımlayın; çarpma istiyorsanız ${missing[0]}*(…) yazın.`);
  const label = name === 'y' ? `y = ${o.expression}` : `${name}(x) = ${o.expression}`;
  const existing = name === 'y' ? undefined : scene.ofType('function').find(f => functionName(f) === `${name}(x)`);
  let fn: FunctionObject;
  let created: SliderObject[];
  if (existing) {
    const known = new Set(scene.sliders().map(s => s.variableName));
    created = extractVariableNames(o.expression).filter(n => !known.has(n)).map(n => scene.addSlider(n, { min: -5, max: 5, step: 0.1, value: 1 }));
    fn = scene.update(existing.id, { expression: o.expression, label, visible: true, ...(o.color ? { color: o.color } : {}) }) as FunctionObject;
    scene.setFocus([fn.id, ...created.map(s => s.id)]);
    scene.say(existing.expression === o.expression ? `${name}(x) zaten ${o.expression} olarak tanımlı.` : `${name}(x) yeniden tanımlandı: ${label}.`);
  } else {
    const result = scene.addFunction(o.expression, { label, color: o.color });
    fn = result.fn;
    created = result.sliders;
    scene.say(`${label} çizildi.`);
  }
  if (created.length) {
    scene.say(`${created.map(s => s.variableName).join(', ')} için kaydırıcı eklendi (−5 ile 5 arası, adım 0,1, değer 1).`);
  }
  return fn;
}

// ---------------------------------------------------------------------------
// Etkileşimli araçların hedefleri
// ---------------------------------------------------------------------------

const TARGET_PRIORITY: ObjectType[] = ['polygon', 'circle', 'ellipse', 'sector', 'arc', 'segment', 'line', 'ray', 'function', 'slider', 'text', 'fraction',
  'image', 'angle', 'measurement', 'pen', 'checkbox', 'button', 'input_box', 'point'];

const TYPE_NOUNS: [RegExp, ObjectType[]][] = [
  [/^nokta/, ['point']],
  [/^(?:dogru parca|parca)/, ['segment']],
  [/^dogru/, ['line', 'segment']],
  [/^isin/, ['ray']],
  [/^(?:cember|daire(?!\s*dilim))/, ['circle']],
  [/^elips/, ['ellipse']],
  [/^yay/, ['arc']],
  [/^dilim/, ['sector']],
  [/^aci/, ['angle']],
  [/^(?:ucgen|kare|dikdortgen|cokgen|dortgen|besgen|altigen|paralelkenar|yamuk|deltoid)/, ['polygon']],
  [/^(?:fonksiyon|grafi)/, ['function']],
  [/^(?:kaydirici|surgu|parametre)/, ['slider']],
  [/^(?:yazi|metin|not)/, ['text']],
  [/^kes(?:ir|ri)/, ['fraction']],
];

const TYPE_NOUN_TR: Partial<Record<ObjectType, string>> = {
  point: 'nokta', segment: 'doğru parçası', line: 'doğru', ray: 'ışın', circle: 'çember', ellipse: 'elips', arc: 'yay', sector: 'daire dilimi',
  angle: 'açı', polygon: 'çokgen', function: 'fonksiyon', slider: 'kaydırıcı', text: 'yazı', fraction: 'kesir',
};

const PLURAL_TYPES: [RegExp, ObjectType[]][] = [
  [/\bnoktalar/, ['point']], [/\b(?:dogru parcalari|parcalar)/, ['segment']], [/\bdogrular/, ['line']], [/\bisinlar/, ['ray']],
  [/\bcemberler|\bdaireler/, ['circle']], [/\belipsler/, ['ellipse']], [/\byaylar/, ['arc']], [/\bacilar/, ['angle']],
  [/\b(?:ucgenler|cokgenler|kareler|dikdortgenler)/, ['polygon']], [/\bfonksiyonlar|\bgrafikler/, ['function']],
  [/\b(?:kaydiricilar|surguler|parametreler)/, ['slider']], [/\b(?:yazilar|metinler|notlar)/, ['text']], [/\bkesirler/, ['fraction']],
];

/** Etiketten hemen sonra gelen tür adı: "$0 cemberini" → circle. */
export function nounAfterLabel(c: Clause, index: number): ObjectType[] | undefined {
  const m = c.text.match(new RegExp(`\\$${index}[a-z]*\\s+([a-z]+(?:\\s+parca[a-z]*)?)`));
  if (!m) return undefined;
  return TYPE_NOUNS.find(([re]) => re.test(m[1]))?.[1];
}

/**
 * Etiket tek bir noktayı mı gösteriyor? Büyük harfle yazılmış "A" noktadır (aynı adlı a kaydırıcısı olsa bile);
 * küçük harfli "a" kaydırıcı varsa kaydırıcıdır; "A merkezli çember" gibi tür adı varsa şekil aranır.
 */
export function labelPoint(scene: CommandScene, ref: LabelRef, typed: ObjectType[] | undefined, list: MathObject[]): MathObject | undefined {
  if (typed && !typed.includes('point')) return undefined;
  const single = scene.pointsFromLabel(ref.text);
  if (single?.length !== 1) return undefined;
  const namedShape = list.some(o => o.type !== 'point' && o.type !== 'slider' && labelKey(o.label) === labelKey(ref.text));
  const sliderMeant = ref.lowercase && list.some(o => o.type === 'slider');
  return namedShape || sliderMeant ? undefined : single[0];
}

/**
 * Onay kutusu / düğme hedefleri: cümledeki adlar ("ABC", "c1 ve AB", "f fonksiyonu"), "tüm çemberler",
 * yoksa seçim ya da önceki cümlenin nesneleri.
 */
export function widgetTargets(c: Clause, scene: CommandScene, noun: string): MathObject[] {
  const found: MathObject[] = [];
  const add = (list: MathObject[]) => { for (const o of list) if (!found.includes(o)) found.push(o); };
  c.labels.forEach((ref: LabelRef, i) => {
    const typed = nounAfterLabel(c, i);
    let list = scene.resolveLabel(ref, typed);
    if (!list.length) {
      const fn = findFunction(scene, ref.text);
      if (fn) list = [fn];
    }
    if (!list.length) fail(`${ref.text} adlı nesne bulunamadı. ${noun} için var olan nesnelerin adlarını yazın.`);
    const point = labelPoint(scene, ref, typed, list);
    if (point) { add([point]); return; }
    const type = TARGET_PRIORITY.find(t => list.some(o => o.type === t));
    add(list.filter(o => o.type === type));
  });
  add(functionsInClause(c, scene));
  if (found.length) return found;
  if (/\b(?:tum|butun|hepsi|her)\b/.test(c.text) || PLURAL_TYPES.some(([re]) => re.test(c.text))) {
    const types = PLURAL_TYPES.filter(([re]) => re.test(c.text)).flatMap(([, t]) => t);
    if (types.length) {
      const all = scene.objects.filter(o => types.includes(o.type));
      if (!all.length) fail(`Sahnede ${noun} bağlanacak bu türde nesne yok.`);
      return all;
    }
  }
  // Adsız tekil tür adı: "üçgeni gizleyen düğme", "çember için onay kutusu" → seçimdeki ya da sahnedeki tek o türden nesne.
  const typed = c.text.split(' ').filter(w => /^[a-z]/.test(w) && !/^(?:acip|acik|acil|acan)/.test(w))
    .flatMap(w => TYPE_NOUNS.find(([re]) => re.test(w))?.[1] ?? []);
  if (typed.length) {
    const ofType = (o: MathObject | undefined): o is MathObject => !!o && typed.includes(o.type);
    const sources = c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
    for (const ids of sources) {
      const list = ids.map(id => scene.get(id)).filter(ofType);
      if (list.length) return list;
    }
    const all = scene.objects.filter(ofType);
    const typeNoun = TYPE_NOUN_TR[typed[0]] ?? 'nesne';
    if (all.length === 1) return all;
    if (!all.length) fail(`Sahnede ${typeNoun} yok. ${noun} için var olan bir nesnenin adını yazın ya da önce oluşturun.`);
    fail(`Birden fazla ${typeNoun} var (${describeTargets(all)}). ${noun} için hangisi olduğunu adıyla yazın ya da önce seçin.`);
  }
  const sources = c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
  for (const ids of sources) {
    const list = ids.map(id => scene.get(id)).filter((o): o is MathObject => !!o && !['checkbox', 'button', 'input_box'].includes(o.type));
    if (list.length) return list;
  }
  return [];
}

export function describeTargets(list: MathObject[]): string {
  const names = list.map(o => o.type === 'slider' ? o.variableName : o.type === 'function' ? functionName(o) : o.label);
  return names.length > 4 ? `${names.slice(0, 4).join(', ')} ve ${names.length - 4} nesne daha` : names.join(', ');
}
