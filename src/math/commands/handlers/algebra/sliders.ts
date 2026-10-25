import type { ObjectType, SliderObject } from '@/types/math';
import type { CommandHandler } from '../../types';
import { type Clause, type VerbKind, fold } from '../../text';
import { CommandError, type CommandScene, NAMED_COLORS, colorIn, fail, skip, tidy, trNum } from '../../scene';
import {
  ANIMATION_WORD, FOREIGN_EDIT_VERBS, FUNCTION_NOUN, NUMBER_WORDS, SLIDER_NOUN, SLIDER_RESERVED, SPOKEN_LETTERS, VARIABLE_NAME_RE, WIDGET_NOUN,
  checkSliderName, contextSliders, evaluateValue, findSlider, finiteVerbsOf, hasForeignEditVerb, isStopword, nextSliderName, parseRangeSpec,
  rawQuotes, rawWords, slidersInClause, spokenNumberClause, stripSuffix, translateMathWords, unusedNumbers,
} from './shared';

const HAS_QUOTE = /["“”«»„]/;
const SHAPE_TYPES: ObjectType[] = ['segment', 'line', 'ray', 'circle', 'polygon', 'angle', 'arc', 'sector', 'ellipse', 'measurement'];

/** Kaydırıcıyı günceller ve canlı inşaları hemen dener (ör. üçgen eşitsizliği bozulursa açıklamalı hata). */
function commitSlider(scene: CommandScene, slider: SliderObject, patch: Partial<Pick<SliderObject, 'min' | 'max' | 'step' | 'value' | 'visible'>>) {
  scene.update(slider.id, patch);
  try {
    scene.resolve();
  } catch (error) {
    if (error instanceof CommandError) fail(`${slider.variableName}${patch.value !== undefined ? ` = ${trNum(patch.value)}` : ''} uygulanamadı: ${error.message}`);
    throw error;
  }
}

const plural = (names: string[], one: string, many: string) => `${names.join(', ')} ${names.length > 1 ? many : one}`;

// ---------------------------------------------------------------------------
// a = 2, ab = 4
// ---------------------------------------------------------------------------

const ASSIGN_TAIL = /^(?:olsun|yap|ayarla|olarak|lutfen|et|ata|degistir|esitle|al|say|olur|tamam|evet|simdi)$/;
/** Sözle yazılmış değer sözcükleri: "a = dört buçuk", "a = eksi iki", "a = bir bölü iki", "a = yarım". */
const VALUE_WORD = /^(?:sifir|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|yirmi|otuz|kirk|elli|altmis|yetmis|seksen|doksan|yuz|bucuk|yarim|eksi|arti|bolu|carpi|kere|pi)$/;
/** Konuşma tanımanın harf adları, yalnızca atamanın sol tarafında: "be = 2" → b, "em = 2" → m. */
const ASSIGN_LETTERS: Record<string, string> = { ...SPOKEN_LETTERS, em: 'm', en: 'n', el: 'l', ef: 'f', es: 's', er: 'r', ha: 'h', ku: 'q', vi: 'v' };

function stripAssignTail(value: string): string {
  const tokens = value.trim().split(/\s+/);
  while (tokens.length > 1 && /^[\p{L}]+$/u.test(tokens[tokens.length - 1]) && ASSIGN_TAIL.test(fold(tokens[tokens.length - 1]))) tokens.pop();
  return tokens.join(' ');
}

function assignmentParts(c: Clause) {
  let a = c.assignment;
  if (!a && !c.definition) {
    // Çözümleyici değerde uzun sözcük görünce atama saymaz ("a = dört buçuk", "k = 2 olsun lütfen"); sayı sözcükleriyse atamadır.
    const m = c.raw.match(/^\s*([a-zA-ZçğıöşüÇĞİÖŞÜ][a-zA-Z0-9çğıöşü_]{0,11})\s*=\s*([^=()";]+?)\s*$/);
    const value = m ? stripAssignTail(m[2]) : '';
    if (m && value && value.split(/\s+/).every(w => /^[-+*/^.,\d]+$/.test(w) || VALUE_WORD.test(fold(w)))) a = { name: m[1], valueRaw: value };
  }
  if (!a) return null;
  return { name: a.name, valueText: stripAssignTail(a.valueRaw) };
}

/** Değer; olmazsa sayı sözcükleri çevrilerek ("iki buçuk" → 2.5, "eksi üç" → -3). */
function assignedValue(valueText: string, scene: CommandScene) {
  const direct = evaluateValue(valueText, scene);
  if (direct.ok) return direct;
  const translated = translateMathWords(valueText);
  const retry = translated !== valueText ? evaluateValue(translated, scene) : direct;
  return retry.ok ? retry : direct;
}

/** Atanacak kaydırıcının adı: var olan (büyük/küçük harf duyarsız), yoksa konuşmadaki harf adı ("be" → b). */
function assignTarget(scene: CommandScene, name: string): { name: string; slider?: SliderObject } {
  const slider = findSlider(scene, name);
  if (slider) return { name: slider.variableName, slider };
  const letter = name === name.toLocaleLowerCase('tr') ? ASSIGN_LETTERS[fold(name)] : undefined;
  return letter ? { name: letter, slider: findSlider(scene, letter) } : { name };
}

/** "A = 3" ve A bir nokta/şekil: nokta sayıya eşitlenemez. */
const namesShape = (scene: CommandScene, name: string) => name !== name.toLocaleLowerCase('tr') && !!(scene.resolveLabel(name).length || scene.pointsFromLabel(name));

export const assignHandler: CommandHandler = {
  id: 'algebra.slider.assign',
  examples: ['ab = 4', 'a = 2', 'k = 3,5', 'b = -1 olsun', 't = pi/2', 'm = 0,5', 'n = 2*a', 'c = -3'],
  match(c, scene) {
    const parts = assignmentParts(c);
    if (!parts || HAS_QUOTE.test(c.raw)) return 0;
    const lower = parts.name.toLocaleLowerCase('tr');
    if (lower === 'x' || lower === 'y') return 0;
    const valueWords = fold(parts.valueText);
    if (SLIDER_NOUN.test(valueWords) || WIDGET_NOUN.test(valueWords) || FUNCTION_NOUN.test(valueWords)) return 0;
    const target = assignTarget(scene, parts.name);
    if (target.slider) return 97;
    const upper = parts.name !== lower;
    // "AB = 5": AB bir doğru parçasıysa (ve ab kaydırıcısı yoksa) uzunluk düzenlemesidir; "A = 5" bir noktadır.
    if (namesShape(scene, parts.name)) return 0;
    const targetLower = target.name.toLocaleLowerCase('tr');
    if (!upper && target.name.length >= 2 && scene.resolveLabel(target.name, SHAPE_TYPES).length) return 0;
    if (!VARIABLE_NAME_RE.test(targetLower) || SLIDER_RESERVED.has(targetLower)) return upper ? 0 : 60;
    return 97;
  },
  run(c, scene) {
    const parts = assignmentParts(c) ?? skip();
    const target = assignTarget(scene, parts.name);
    const existing = target.slider;
    const name = existing ? existing.variableName : checkSliderName(target.name, scene);
    const evaluated = assignedValue(parts.valueText, scene);
    if (!evaluated.ok) fail(`${name} = ${parts.valueText} anlaşılamadı: ${evaluated.error} Örnek: “${name} = 2,5”.`);
    const value = tidy(evaluated.value);
    if (existing) {
      const min = Math.min(existing.min, value), max = Math.max(existing.max, value);
      commitSlider(scene, existing, { value, min, max });
      scene.setFocus([existing.id]);
      scene.say(min !== existing.min || max !== existing.max
        ? `${name} = ${trNum(value)} (kaydırıcı aralığı ${trNum(min)} – ${trNum(max)} olarak genişletildi).`
        : `${name} = ${trNum(value)}.`);
      return;
    }
    const span = Math.max(5, Math.ceil(Math.abs(value) * 2) || 5);
    // Tam sayı değerde adım 1 (varsayılan ayarlar ondalıksız); ondalık değer atandıysa 0,1: değere sürükleyerek dönülebilsin
    const step = Number.isInteger(value) ? 1 : 0.1;
    scene.addSlider(name, { min: -span, max: span, step, value });
    scene.say(`${name} kaydırıcısı oluşturuldu ve ${trNum(value)} değeri atandı (aralık ${trNum(-span)} ile ${trNum(span)}, adım ${trNum(step)}).`);
  },
};

// ---------------------------------------------------------------------------
// Kaydırıcı oluşturma
// ---------------------------------------------------------------------------

const FILLER = /^(?:yeni|bir|baska|olan|bu|su|o|ikinci|ucuncu|ilk|son|tane|adet|farkli|basit|hareketli|lutfen|ve|ile|icin|kadar|bana|hadi|simdi|tum|ornek|deneme|guzel|kucuk|buyuk|uzun|kisa|yatay|dikey|sayisal|adli|isimli|adinda|isminde|sadece|bos)$/;
const PARAM_WORD = /^(?:adim|deger|arali|arasi|kadar|baslayan|olan|uzunlug|min|max|maks|en$|alt|ust|sinir|artis|artim|baslangic)/;

function creationNames(c: Clause): { names: string[]; invalid?: string } {
  const names: string[] = [];
  const push = (n: string) => { const v = n.trim(); if (v && !names.includes(v)) names.push(v); };
  for (const q of rawQuotes(c.raw)) push(q);
  if (c.assignment) push(c.assignment.name);
  let invalid: string | undefined;
  const raw = c.raw.replace(/"[^"]*"|“[^”]*”|«[^»]*»/g, ' § ');
  const explicit = raw.match(/(?<![\p{L}])(?:ad[ıi]|ismi)\s+([\p{L}][\p{L}\p{N}_]*)/iu) ?? raw.match(/(?<![\p{L}])([\p{L}][\p{L}\p{N}_]*)\s+(?:adl[ıi]|isimli|adında|adinda|isminde)(?![\p{L}])/iu);
  if (explicit && !/^(?:olan|bir)$/i.test(explicit[1])) push(explicit[1]);
  const words = rawWords(raw);
  const noun = words.findIndex(w => SLIDER_NOUN.test(w.folded));
  if (noun >= 0) {
    const before: string[] = [];
    for (let j = noun - 1; j >= 0; j--) {
      const w = words[j];
      if (/^(?:ve|ile)$/.test(w.folded)) continue;
      const token = stripSuffix(w.raw);
      const folded = fold(token);
      if (/^[\p{L}][\p{L}\p{N}]?$/u.test(token) && !isStopword(folded) && !(folded in NUMBER_WORDS)) { before.unshift(token); continue; }
      if (j === noun - 1 && !before.length && /^[\p{L}]{3,}$/u.test(token) && !FILLER.test(folded) && !PARAM_WORD.test(folded)
        && !(folded in NAMED_COLORS) && !(folded in NUMBER_WORDS) && !names.length) invalid = token;
      break;
    }
    before.forEach(push);
    const after = words[noun + 1];
    if (after && /^[\p{L}][\p{L}\p{N}]?$/u.test(stripSuffix(after.raw)) && !isStopword(fold(stripSuffix(after.raw))) && !(fold(after.raw) in NUMBER_WORDS)) {
      push(stripSuffix(after.raw));
    }
  }
  return { names, invalid };
}

export const sliderCreateHandler: CommandHandler = {
  id: 'algebra.slider.create',
  examples: [
    'a kaydırıcısı oluştur',
    '0 ile 10 arasında adımı 0,5 olan b kaydırıcısı',
    'değeri 3 olan k parametresi',
    'en küçük değeri -2, en büyük değeri 8 olan m sürgüsü ekle',
    'a, b ve c kaydırıcılarını oluştur',
    'kaydırıcı ekle',
    '2 tane kaydırıcı ekle',
  ],
  match(c) {
    if (c.definition || !SLIDER_NOUN.test(c.text) || WIDGET_NOUN.test(c.text) || FUNCTION_NOUN.test(c.text)) return 0;
    if (c.assignment && !SLIDER_NOUN.test(fold(c.assignment.valueRaw))) return 0;
    // "adı k olan kaydırıcı ekle": ad bildirimi yeniden adlandırma emri değildir.
    const verbs = finiteVerbsOf(c.text.replace(/\b(?:adi|ismi)\s+(?=\S+\s+olan\b)/g, ' '));
    if (([...FOREIGN_EDIT_VERBS, 'play', 'stop', 'measure', 'show', 'scale', 'question'] as VerbKind[]).some(v => verbs.has(v))) return 0;
    if (/\bbagl|\bbag(?:ini|i)\b/.test(c.text)) return 0;
    if (!c.hasVerb('create') && c.verbs.size > 0) return 0;
    // "kaydırıcıyı 4 yap", "a kaydırıcısının aralığını … yap": belirli (var olan) kaydırıcı; oluşturma değil.
    if (DEFINITE_SLIDER.test(c.text) && !CREATE_WORD.test(c.text)) return 0;
    return 50;
  },
  run(original, scene) {
    const { names: written, invalid } = creationNames(original);
    if (invalid) fail(`“${invalid}” kaydırıcı adı olamaz: ad harfle başlayan 1–2 karakter olmalı (ör. a, k, t1).`);
    // Konuşmadaki "sıfırdan ona kadar", "beşe kadar" gibi sayılar
    const c = spokenNumberClause(original, scene);
    const spec = parseRangeSpec(c);
    const countRef = c.text.match(/(#\d+)\s+(?:tane\s+|adet\s+)?(?:kaydirici|surgu|parametre)/);
    let count = 1;
    if (countRef && !written.length) {
      const n = c.num(countRef[1]);
      if (Number.isInteger(n) && n >= 1 && n <= 10) { count = n; spec.used.add(Number(countRef[1].slice(1))); }
    }
    const unused = unusedNumbers(c, spec);
    let { min, max, step, value } = spec;
    if (value === undefined && unused.length === 1) value = unused[0];
    else if (unused.length === 2 && min === undefined && max === undefined) { min = Math.min(...unused); max = Math.max(...unused); }
    else if (unused.length) fail('Sayıların ne anlama geldiğini yazın; örneğin “0 ile 10 arasında, adımı 0,5, değeri 3 olan a kaydırıcısı oluştur”.');

    const defaults: string[] = [];
    if (min === undefined && max === undefined) { min = -5; max = 5; defaults.push('aralık'); }
    else if (min === undefined) { min = max! > -5 ? -5 : max! - 10; defaults.push('en küçük değer'); }
    else if (max === undefined) { max = min < 5 ? 5 : min + 10; defaults.push('en büyük değer'); }
    if (!(min! < max!)) fail(`En küçük değer (${trNum(min!)}) en büyük değerden (${trNum(max!)}) küçük olmalı.`);
    if (step === undefined) {
      const span = max! - min!;
      // Varsayılan adım ondalıksız (kullanıcı, 25.10.2026); yalnız dar aralıkta (2 birimden az) eskisi gibi 0,01
      step = span >= 2 ? 1 : 0.01;
      defaults.push('adım');
    }
    if (!(step > 0)) fail('Kaydırıcı adımı 0’dan büyük olmalı.');
    if (step > max! - min!) fail(`Adım (${trNum(step)}) aralıktan (${trNum(min!)} – ${trNum(max!)}) büyük olamaz.`);
    let note = '';
    if (value === undefined) { value = Math.min(max!, Math.max(min!, 1)); defaults.push('değer'); }
    else if (value < min! || value > max!) {
      const clamped = Math.min(max!, Math.max(min!, value));
      note = ` ${trNum(value)} aralığın dışında olduğu için değer ${trNum(clamped)} yapıldı.`;
      value = clamped;
    }

    const names = written.length ? written.map(n => checkSliderName(n, scene)) : [];
    if (new Set(names).size !== names.length) fail('Aynı adı iki kez yazdınız; her kaydırıcıya farklı bir ad verin.');
    if (!names.length) for (let i = 0; i < count; i++) names.push(nextSliderName(scene, names));
    for (const name of names) scene.addSlider(name, { min, max, step, value });
    scene.say(`${plural(names, 'kaydırıcısı', 'kaydırıcıları')} oluşturuldu: ${trNum(min!)} ile ${trNum(max!)} arası, adım ${trNum(step, 4)}, değer ${trNum(value)}`
      + `${defaults.length ? ` (${defaults.join(', ')} varsayılan)` : ''}.${note}`);
  },
};

// ---------------------------------------------------------------------------
// a'yı 3 yap, a'nın aralığını -10 ile 10 yap, a'yı 2 artır
// ---------------------------------------------------------------------------

const SET_WORD = /\b(?:yap(?!an|ar\b)|yapar mi|ayarla|esitle|getir|olsun|degistir|guncelle|ata\b|cek\b|artir|arttir|azalt|dusur|yukselt|cogalt|eksilt)/;
const CREATE_WORD = /\b(?:olustur|ekle|ciz|tanimla|koy|yeni)/;
/** Belirtme/ilgi ekli kaydırıcı sözcüğü: "kaydırıcıyı", "a kaydırıcısının", "parametreleri". */
const DEFINITE_SLIDER = /\b(?:kaydirici|surgu|parametre)[a-z]*(?:yi|yu|ni|nu|nin|nun|lari|leri)\b/;

const focusSliders = (scene: CommandScene) => scene.focus.map(id => scene.get(id)).filter((o): o is SliderObject => o?.type === 'slider');

/** Kaydırıcı sözcüğünden hemen önce yazılmış 1–2 karakterlik ad ("k parametresi" → "k"). */
function nameBeforeSliderNoun(c: Clause): string | undefined {
  const words = rawWords(c.raw);
  const noun = words.findIndex(w => SLIDER_NOUN.test(w.folded));
  if (noun <= 0) return undefined;
  const token = stripSuffix(words[noun - 1].raw);
  return /^[\p{L}][\p{L}\p{N}]?$/u.test(token) && !isStopword(fold(token)) && !(fold(token) in NUMBER_WORDS) ? token.toLocaleLowerCase('tr') : undefined;
}

export const sliderEditHandler: CommandHandler = {
  id: 'algebra.slider.edit',
  examples: [
    "a'yı 3 yap",
    "a'nın değerini 2,5 olarak ayarla",
    'a kaydırıcısının aralığını -10 ile 10 yap',
    "b'nin adımını 0,1 yap",
    "a'nın en büyük değerini 20 yap",
    "k'yı 2 artır",
    'kaydırıcıyı 4 yap',
  ],
  match(original, scene) {
    if (original.definition || original.assignment || HAS_QUOTE.test(original.raw)) return 0;
    // "beşe ayarla", "bir azalt": konuşmadaki sayılar
    const c = spokenNumberClause(original, scene);
    if (WIDGET_NOUN.test(c.text) || FUNCTION_NOUN.test(c.text)) return 0;
    if (hasForeignEditVerb(c, ['play', 'stop', 'show', 'scale']) || colorIn(c)) return 0;
    if (!SET_WORD.test(c.text) || (!c.numbers.length && !c.coords.length)) return 0;
    const { sliders, unknown } = slidersInClause(c, scene);
    if (sliders.length) return 90;
    const creating = CREATE_WORD.test(c.text);
    if (creating || c.labels.length > (unknown.length ? unknown.length : 0)) return 0;
    if (!unknown.length) {
      if (SLIDER_NOUN.test(c.text)) {
        // "k parametresi 3 olsun" (k yok) → oluşturma; "kaydırıcıyı 4 yap", "a kaydırıcısının aralığını … yap" → düzenleme.
        const written = nameBeforeSliderNoun(c);
        if (DEFINITE_SLIDER.test(c.text)) return 88;
        return !written && contextSliders(c, scene).length ? 88 : 0;
      }
      if (/\b(?:deger|arali|adim|en kucuk|en buyuk)/.test(c.text) && focusSliders(scene).length) return 86;
      return 0;
    }
    return /^\$\d/.test(c.text) && !SLIDER_NOUN.test(c.text) ? 20 : 0;
  },
  run(original, scene) {
    const c = spokenNumberClause(original, scene);
    const named = slidersInClause(c, scene);
    const missing = named.unknown[0] ?? (named.sliders.length ? undefined : nameBeforeSliderNoun(c));
    if (!named.sliders.length && missing) {
      const hint = /\b(?:arali|adim|en kucuk|en buyuk|min|max)/.test(c.text) ? `${missing} kaydırıcısı oluştur` : `${missing} = ${c.numbers.length ? trNum(c.numbers[0]) : 1}`;
      fail(`${missing} adlı kaydırıcı bulunamadı. Oluşturmak için “${hint}” yazın.`);
    }
    let targets = named.sliders;
    if (!targets.length) targets = focusSliders(scene).length && !SLIDER_NOUN.test(c.text) ? focusSliders(scene) : contextSliders(c, scene);
    if (!targets.length) fail(scene.sliders().length ? 'Hangi kaydırıcı? Adını yazın (ör. “a’yı 3 yap”) ya da önce seçin.' : 'Önce bir kaydırıcı oluşturun (ör. “a = 1”).');

    const spec = parseRangeSpec(c);
    const t = c.text;
    const inc = t.match(/(#\d+)\s*(?:birim\s+)?(?:artir|arttir|yukselt|cogalt)/);
    const dec = t.match(/(#\d+)\s*(?:birim\s+)?(?:azalt|dusur|eksilt)/);
    for (const m of [inc, dec]) if (m) spec.used.add(Number(m[1].slice(1)));
    const unused = unusedNumbers(c, spec);
    if (spec.value === undefined && !inc && !dec && unused.length === 1 && spec.min === undefined && spec.max === undefined && spec.step === undefined) spec.value = unused[0];
    else if (unused.length) fail('Hangi sayının ne olduğunu yazın; örneğin “a’yı 3 yap”, “a’nın aralığını 0 ile 10 yap”, “a’nın adımını 0,5 yap”.');
    const valueGiven = spec.value !== undefined || !!inc || !!dec;
    const rangeGiven = spec.min !== undefined || spec.max !== undefined;
    if (!valueGiven && !rangeGiven && spec.step === undefined) fail('Kaydırıcıda neyi değiştireceğinizi yazın (değer, aralık ya da adım).');

    const messages: string[] = [];
    for (const slider of targets) {
      const s = scene.get(slider.id) as SliderObject;
      let min = spec.min ?? s.min, max = spec.max ?? s.max;
      const step = spec.step ?? s.step;
      let value = tidy(inc ? s.value + c.num(inc[1]) : dec ? s.value - c.num(dec[1]) : spec.value ?? s.value);
      if (!(min < max)) fail(`${s.variableName} için en küçük değer (${trNum(min)}) en büyük değerden (${trNum(max)}) küçük olmalı.`);
      if (!(step > 0)) fail('Kaydırıcı adımı 0’dan büyük olmalı.');
      let note = '';
      if (value < min || value > max) {
        if (valueGiven && !rangeGiven) {
          min = Math.min(min, value); max = Math.max(max, value);
          note = ` (kaydırıcı aralığı ${trNum(min)} – ${trNum(max)} olarak genişletildi)`;
        } else {
          const clamped = Math.min(max, Math.max(min, value));
          note = valueGiven ? ` (${trNum(value)} aralığın dışında olduğu için ${trNum(clamped)} yapıldı)` : ` (değer aralığa sığdırıldı: ${trNum(clamped)})`;
          value = clamped;
        }
      }
      commitSlider(scene, s, { min, max, step, value });
      const parts: string[] = [];
      if (valueGiven) parts.push(`${s.variableName} = ${trNum(value)}`);
      if (rangeGiven) parts.push(`aralık ${trNum(min)} ile ${trNum(max)}`);
      if (spec.step !== undefined) parts.push(`adım ${trNum(step, 4)}`);
      messages.push(valueGiven && parts.length === 1 ? `${parts[0]}${note}.` : `${s.variableName} kaydırıcısı güncellendi: ${parts.join(', ')}${note}.`);
    }
    scene.setFocus(targets.map(s => s.id));
    messages.forEach(m => scene.say(m));
  },
};

// ---------------------------------------------------------------------------
// a kaç? a'nın değeri nedir?
// ---------------------------------------------------------------------------

export const sliderQueryHandler: CommandHandler = {
  id: 'algebra.slider.query',
  examples: ['a kaç?', "a'nın değeri nedir", 'k parametresinin değerini söyle', 'b kaç', 'a kaydırıcısının değeri ne', 'k nedir'],
  match(c, scene) {
    if (c.definition || c.assignment || c.numbers.length || WIDGET_NOUN.test(c.text) || FUNCTION_NOUN.test(c.text)) return 0;
    const asks = c.hasVerb('question') || /\bdeger\w*\s+(?:ne\b|nedir|kac|goster|yaz|soyle|oku|bul)/.test(c.text);
    if (!asks || hasForeignEditVerb(c, ['play', 'stop'])) return 0;
    const lowercaseRef = c.labels.some(l => l.lowercase) || SLIDER_NOUN.test(c.text) || /\bdeger/.test(c.text);
    if (!lowercaseRef) return 0;
    const { sliders } = slidersInClause(c, scene);
    if (sliders.length) return 58;
    return SLIDER_NOUN.test(c.text) && !c.labels.length && contextSliders(c, scene).length ? 58 : 0;
  },
  run(c, scene) {
    const found = slidersInClause(c, scene).sliders;
    const sliders = found.length ? found : contextSliders(c, scene);
    if (!sliders.length) skip();
    scene.setFocus(sliders.map(s => s.id));
    scene.say(sliders.map(s => `${s.variableName} = ${trNum(s.value, 4)} (aralık ${trNum(s.min)} ile ${trNum(s.max)}, adım ${trNum(s.step, 4)}).`).join(' '));
  },
};

// ---------------------------------------------------------------------------
// Oynat / durdur
// ---------------------------------------------------------------------------

/** "oynatmayı durdur": -ma/-me adları eylemin konusudur, ayrı bir oynat emri değil. */
const PLAYBACK_NOUN = /^(?:oynat|baslat|canlandir|durdur)m[ae](?:yi|yu|ya|ye|nin|sini)?$/;
/** "kaydırıcıları hareket ettir", "hareketlendir" → oynat. */
const MOVE_PLAY = /\bhareket (?:ettir|et\b)|\bhareketlendir|\bharekete gecir/;

function playbackVerbs(c: Clause): Set<VerbKind> {
  const verbs = finiteVerbsOf(c.words.filter(w => !PLAYBACK_NOUN.test(w)).join(' '));
  const result = new Set<VerbKind>();
  if (verbs.has('play') || (MOVE_PLAY.test(c.text) && (SLIDER_NOUN.test(c.text) || !c.labels.length))) result.add('play');
  if (verbs.has('stop')) result.add('stop');
  return result;
}

export const playbackHandler: CommandHandler = {
  id: 'algebra.slider.playback',
  examples: ["a'yı oynat", 'animasyonu başlat', 'animasyonu durdur', 'tüm kaydırıcıları oynat', 'kaydırıcıları durdur', 'oynat', 'kaydırıcıları canlandır', 'a ve b kaydırıcılarını oynat'],
  match(c, scene) {
    if (/^(?:degerata|setvalue)\s*(?:\[|\()/i.test(fold(c.raw))) return 0;
    const verbs = playbackVerbs(c);
    if (!verbs.has('play') && !verbs.has('stop')) return 0;
    if (c.definition || c.assignment || WIDGET_NOUN.test(c.text) || HAS_QUOTE.test(c.raw)) return 0;
    if (hasForeignEditVerb(c)) return 0;
    const { sliders, unknown } = slidersInClause(c, scene);
    if (/\bnokta/.test(c.text) || (c.labels.some(l => !l.lowercase) && !sliders.length)) return 0;
    const context = SLIDER_NOUN.test(c.text) || ANIMATION_WORD.test(c.text) || sliders.length > 0;
    const bare = c.words.every(w => !/[\p{L}\p{N}#$@"]/u.test(w) || isStopword(w) || /^(?:oynat|baslat|durdur|canlandir|tekrar|yeniden|devam|et|ettir|hepsini|hareket)\w*$/.test(w));
    if (context || bare) return 88;
    return unknown.length && c.labels.length === unknown.length ? 30 : 0;
  },
  run(c, scene) {
    const verbs = playbackVerbs(c);
    const mode = verbs.has('play') && verbs.has('stop') ? 'toggle' : verbs.has('stop') ? 'stop' : 'play';
    const { sliders: named, unknown } = slidersInClause(c, scene);
    if (!named.length && unknown.length) fail(`${unknown[0]} adlı kaydırıcı bulunamadı. Önce oluşturun (ör. “${unknown[0]} = 1”).`);
    const all = scene.sliders();
    if (mode !== 'stop' && !all.length) fail('Oynatılacak kaydırıcı yok. Önce bir kaydırıcı oluşturun (ör. “a = 1”).');
    const shown: string[] = [];
    for (const s of named) if (!s.visible) { scene.update(s.id, { visible: true }); shown.push(s.variableName); }
    const visible = scene.sliders().filter(s => s.visible);
    if (mode !== 'stop' && !visible.length) fail('Görünür kaydırıcı yok. Oynatmak istediğiniz kaydırıcının adını yazın (ör. “a’yı oynat”) ya da önce gösterin.');
    scene.act({ kind: 'playback', mode });
    scene.setFocus((named.length ? named : visible).map(s => s.id));
    if (mode === 'stop') { scene.say('Kaydırıcı animasyonu durduruldu.'); return; }
    const verb = mode === 'toggle' ? 'açılıp kapatıldı' : 'başlatıldı';
    const others = visible.filter(s => !named.includes(s)).map(s => s.variableName);
    const namedText = named.map(s => s.variableName);
    scene.say(named.length
      ? `${plural(namedText, 'kaydırıcısı', 'kaydırıcıları')} için animasyon ${verb}${shown.length ? ` (${shown.join(', ')} görünür yapıldı)` : ''}.${others.length ? ` Görünür diğer kaydırıcılar (${others.join(', ')}) da birlikte hareket eder.` : ''}`
      : `Kaydırıcı animasyonu ${verb}: ${visible.map(s => s.variableName).join(', ')}.`);
  },
};

export const sliderHandlers: CommandHandler[] = [assignHandler, sliderEditHandler, sliderQueryHandler, playbackHandler, sliderCreateHandler];
