import { COMMAND_CATALOG, COMMAND_EXAMPLES, normalizeCommand } from './turkishCommands';
import { NOUNS, detectVerbs } from './commands/text';

export type CommandSuggestion = { text: string; kind: 'correction' | 'example' | 'history' | 'semantic' };

const extraExamples = ['Dik üçgen çiz', 'Eşkenar üçgen çiz', 'Çember çiz', 'Kare çiz',
  'AB doğru çiz', 'AB ışın çiz', 'Üçgenin çevresini yaz', 'Tümünü seç', 'Geri al', 'Yinele'];

/**
 * Geometri cümlelerinde sık geçen, yazım yanlışı sanılıp "düzeltilmemesi" gereken sözcükler (katlanmış kökler).
 * Bir sözcük bunlardan biriyle başlıyorsa (en çok 4 harf ekle) ya da bunlardan birinin yarım yazımıysa geçerli sayılır:
 * "alan" → "olan", "yay" → "yaz", "aracını" → "alanını" gibi yanlış düzeltmeler böylece önlenir.
 */
const COMMON_WORDS = [
  'olan', 'alan', 'yay', 'yaz', 'kac', 'nedir', 'ile', 'gore', 'icin', 'ara', 'arasi', 'arasin', 'merkez', 'kose', 'kenar', 'cap', 'yaricap',
  'dogru', 'nokta', 'aci', 'isin', 'kare', 'daire', 'dilim', 'elips', 'cember', 'ucgen', 'uzunluk', 'uzunlug', 'cevre', 'egim', 'esit', 'paralel',
  'dik', 'orta', 'yukseklik', 'yukseklig', 'taban', 'sag', 'sol', 'yukari', 'asagi', 'birim', 'derece', 'renk', 'rengi', 'kirmizi', 'mavi',
  'yesil', 'sari', 'mor', 'turuncu', 'siyah', 'gri', 'pembe', 'beyaz', 'lacivert', 'sil', 'gizle', 'goster', 'sec', 'tasi', 'kaydir', 'dondur',
  'yansit', 'otele', 'buyut', 'kucult', 'olc', 'hesapla', 'bul', 'ciz', 'olustur', 'ekle', 'koy', 'yap', 'olsun', 'arac', 'pergel', 'cetvel',
  'kalem', 'gonye', 'izgara', 'eksen', 'yakinlas', 'uzaklas', 'geri', 'yinele', 'tum', 'hepsi', 'fonksiyon', 'grafik', 'kaydirici', 'yazi',
  'kesir', 'dugme', 'metin', 'not', 'kutu', 'gorsel', 'resim', 'nasil', 'neler', 'yardim', 'lutfen', 'bana', 'bir', 'iki', 'uc', 'dort', 'bes',
  'alti', 'yedi', 'sekiz', 'dokuz', 'on', 'yarim', 'bucuk', 'kat', 'oran', 'parca', 'parcasi', 'vektor', 'kesisim', 'teget', 'cevrel', 'dikme',
  'aciortay', 'kenarortay', 'agirlik', 'yamuk', 'deltoid', 'besgen', 'altigen', 'sekizgen', 'cokgen', 'dortgen', 'dikdortgen', 'paralelkenar',
  'duzgun', 'eskenar', 'ikizkenar', 'cesitkenar', 'kosegen', 'simetri', 'yansima', 'donme', 'oteleme', 'homotet', 'koordinat', 'orijin', 'sade',
  'ayrintili', 'duzlem', 'kareli', 'bos', 'ekran', 'sigdir', 'ortala', 'gorunum', 'ayni', 'buyuk', 'kucuk', 'kalin', 'ince', 'dolgu', 'etiket',
  'ad', 'adi', 'isim', 'kopyala', 'yapistir', 'kilitle', 'serbest', 'oynat', 'durdur', 'baslat', 'deger', 'aralik', 'adim', 'uzeri', 'uzerin',
  'hareket', 'saat', 'yon', 'ters', 'etraf', 'olcu', 'toplam', 'kaplad', 'ayri', 'son', 'ilk', 'once', 'sonra', 've', 'veya', 'ya', 'da',
  // Teoremler ve klasik şekiller: adlar yazım yanlışı sanılıp başka sözcüğe çevrilmesin.
  'oklid', 'oklit', 'pisagor', 'pitagor', 'tales', 'thales', 'teorem', 'baginti', 'euler', 'oyler', 'feuerbach', 'kiris', 'kesen', 'kuvvet',
  'heron', 'stewart', 'ceva', 'menelaus', 'hipotenus', 'kelebek', 'dokuz', 'ortak', 'sinus', 'kosinus', 'formul', 'esitsizli', 'kural',
  'dogrula', 'uygula', 'acikla', 'kur', 'sekil', 'sekli', 'orant', 'temel', 'cap', 'capli', 'yarisi', 'goren',
];
const COMMON = new Set(COMMON_WORDS);

const aliases: Record<string, string> = {
  ciziver: 'çiz', cizer: 'çiz', cizebilir: 'çiz', cizin: 'çiz', cizelim: 'çiz',
  teyet: 'teğet',
};
/** "yap" yalnızca şekil adından hemen sonra "çiz" anlamındadır; "kırmızı yap", "5 yap" düzenleme komutudur. */
const SHAPE_BEFORE_YAP = /^(?:ucgen|kare|dikdortgen|cember|daire|elips|cokgen|nokta|dogru|isin|aci|yay|dilim|besgen|altigen|sekizgen|paralelkenar|yamuk|deltoid|kesir|kaydirici|yazi|dugme|sekil)/;
/** "yarıçapı bir", "1 birim" gibi durumlarda "bir" sayıdır, atılmaz. */
const NUMBER_CONTEXT_BEFORE = /^(?:yaricap|cap|kenar|uzunlug|boy|eni?$|taban|yukseklig|olcu|deger|kat|oran|alan|cevre|egim)/;
const NUMBER_CONTEXT_AFTER = /^(?:birim|br|cm|derece|bucuk|tam|kat|metre|santim)$/;
const ignored = new Set(['lutfen', 'bana', 'bir', 'misin', 'misiniz', 'mi']);
const NEGATIVE = /\b(cizme|cizmeyin|olusturma|yapma|baglama|silme|istemiyorum|degil|iptal|olmasin)\b/;
const MAX_SUGGESTIONS = 6;

const words = (text: string): string[] => normalizeCommand(text).match(/[a-z]+|\d+(?:[.,]\d+)?/g) ?? [];

// ---------------------------------------------------------------------------------------------- sözlük

type Candidate = { text: string; key: string; tokens: string[] };
type Lexicon = { examples: Candidate[]; vocabulary: Map<string, string>; core: Set<string> };
let cachedLexicon: Lexicon | null = null;
const optionCache = new WeakMap<string[], { candidates: Candidate[]; vocabulary: Map<string, string> }>();

const prepare = (text: string): Candidate => ({ text, key: normalizeCommand(text), tokens: words(text) });

/** Katlanmış sözcük → görünen yazım (küçük harf, Türkçe karakterli). Aynı sözcüğün büyük/küçük yazımları tek kayıttır. */
function addWords(target: Map<string, string>, sentences: string[]) {
  for (const sentence of sentences) {
    for (const token of sentence.match(/[\p{L}]+/gu) ?? []) {
      const key = normalizeCommand(token);
      if (key.length < 3 || target.has(key)) continue;
      // Tamamı büyük harfli kısa sözcükler (ABC, AB) etikettir, sözlüğe girmez.
      if (/^[A-ZÇĞİÖŞÜ]{1,4}$/.test(token)) continue;
      target.set(key, token.toLocaleLowerCase('tr'));
    }
  }
}

/**
 * Örnek komutlar ve sözlük ilk kullanımda kurulur. turkishCommands → motor → aileler zinciri bu modülden önce
 * yüklenmemişse (döngüsel içe aktarma) katalog henüz tanımsız olabilir; o durumda önbelleğe alınmaz.
 */
function lexicon(): Lexicon {
  if (cachedLexicon) return cachedLexicon;
  let catalog: string[] | null = null;
  try { catalog = Array.isArray(COMMAND_CATALOG) ? COMMAND_CATALOG.flatMap(group => group.examples) : null; } catch { catalog = null; }
  const coreList = [...(COMMAND_EXAMPLES ?? []), ...extraExamples];
  const texts = [...new Set([...coreList, ...(catalog ?? [])])];
  const vocabulary = new Map<string, string>();
  addWords(vocabulary, texts);
  const result: Lexicon = { examples: texts.map(prepare), vocabulary, core: new Set(coreList.map(normalizeCommand)) };
  if (catalog) cachedLexicon = result;
  return result;
}

/** Panelden gelen ek örnekler (araç komutları) her tuşta aynı dizi olduğundan bir kez hazırlanır. */
function optionExamples(examples: string[] | undefined) {
  if (!examples?.length) return { candidates: [], vocabulary: new Map<string, string>() };
  let cached = optionCache.get(examples);
  if (!cached) {
    const vocabulary = new Map<string, string>();
    addWords(vocabulary, examples);
    cached = { candidates: examples.map(prepare), vocabulary };
    optionCache.set(examples, cached);
  }
  return cached;
}

/** Yardım paneli ve testler için: aramada kullanılan tüm örnek komutlar. */
export function searchableExamples(): string[] {
  return lexicon().examples.map(c => c.text);
}

// Bitişik harf değişimini de sayan Damerau–Levenshtein uzaklığı.
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
  }
  return rows[a.length][b.length];
}

/** Sözcük zaten geçerli mi? (sözlükte, sık sözcüklerde, bunların çekimli hâli ya da yarım yazımı, bilinen fiil/ad kökü) */
function isKnownWord(word: string, vocabularies: Map<string, string>[], extra: Set<string>): boolean {
  const known = (w: string) => COMMON.has(w) || extra.has(w) || vocabularies.some(v => v.has(w));
  if (known(word)) return true;
  for (let cut = word.length - 1; cut >= Math.max(3, word.length - 4); cut--) if (known(word.slice(0, cut))) return true;
  if (word.length >= 3) {
    for (const vocabulary of vocabularies) for (const w of vocabulary.keys()) if (w.length > word.length && w.startsWith(word)) return true;
    for (const w of COMMON) if (w.length > word.length && w.startsWith(word)) return true;
  }
  return detectVerbs(word).size > 0 || Object.values(NOUNS).some(re => re.test(word));
}

/** Öneriler kullanıcı seçmeden çalıştırılmaz; sayılar, nokta adları ve formüller korunur. */
export function searchCommands(raw: string, options: { examples?: string[]; history?: string[]; labels?: string[] } = {}): CommandSuggestion[] {
  const normalized = normalizeCommand(raw);
  if (normalized.length < 2 || normalized.length > 500 || /[=\n]/.test(raw) || NEGATIVE.test(normalized)) return [];
  const base = lexicon();
  const extra = optionExamples(options.examples);
  const vocabularies = [base.vocabulary, extra.vocabulary];
  const protectedWords = new Set((options.labels ?? []).map(normalizeCommand));
  const historyWords = new Map<string, string>();
  addWords(historyWords, options.history ?? []);
  const extraKnown = new Set(historyWords.keys());

  const letterWords = (raw.match(/[\p{L}]+/gu) ?? []).map(normalizeCommand);
  let index = -1;
  let previousKept = '';
  let changed = false;
  const corrected = raw.replace(/[\p{L}]+/gu, (token: string, offset: number) => {
    index++;
    const word = letterWords[index];
    const next = letterWords[index + 1] ?? '';
    const keep = () => { previousKept = word; return token; };
    // Etiketler, kısa sözcükler ve kesme işaretinden sonraki ekler olduğu gibi kalır.
    if (protectedWords.has(word) || word.length < 3 || /['’′]/.test(raw[offset - 1] ?? '') || /^[A-ZÇĞİÖŞÜ]{1,4}$/.test(token)) return keep();
    if (ignored.has(word)) {
      const isNumber = word === 'bir' && (NUMBER_CONTEXT_BEFORE.test(previousKept) || NUMBER_CONTEXT_AFTER.test(next));
      if (!isNumber) { changed = true; return ''; }
      return keep();
    }
    if (aliases[word]) { changed = true; previousKept = normalizeCommand(aliases[word]); return aliases[word]; }
    if (word === 'yap' && SHAPE_BEFORE_YAP.test(previousKept)) { changed = true; previousKept = 'ciz'; return 'çiz'; }
    if (word.length < 4 || isKnownWord(word, vocabularies, extraKnown)) return keep();
    // Güçlü kanıt: 4–7 harfte tek, 8+ harfte en çok iki harf farkı; iki farkta ilk harf aynı olmalı; en yakın aday tek olmalı.
    const limit = word.length >= 8 ? 2 : 1;
    const near = new Map<string, { display: string; d: number }>();
    for (const vocabulary of vocabularies) for (const [key, display] of vocabulary) {
      if (near.has(key) || Math.abs(key.length - word.length) > limit) continue;
      const d = distance(word, key);
      if (d <= limit && (d < 2 || key[0] === word[0])) near.set(key, { display, d });
    }
    const sorted = [...near.entries()].sort((a, b) => a[1].d - b[1].d);
    if (sorted.length && (sorted.length === 1 || sorted[0][1].d < sorted[1][1].d)) {
      changed = true;
      previousKept = sorted[0][0];
      const display = sorted[0][1].display;
      return /^[A-ZÇĞİÖŞÜ]/.test(token) ? display.charAt(0).toLocaleUpperCase('tr') + display.slice(1) : display;
    }
    return keep();
  }).replace(/\s+/g, ' ').trim();

  const query = words(corrected).filter(w => !ignored.has(w));
  if (!query.length) return [];
  const correctedKey = normalizeCommand(corrected);
  const candidates = [
    ...(options.history ?? []).map(text => ({ ...prepare(text), kind: 'history' as const })),
    ...base.examples.map(c => ({ ...c, kind: 'example' as const })),
    ...extra.candidates.map(c => ({ ...c, kind: 'example' as const })),
  ];
  const seen = new Set<string>();
  const ranked = candidates.flatMap((candidate, order) => {
    if (seen.has(candidate.key)) return [];
    seen.add(candidate.key);
    const { tokens } = candidate;
    // Başka sayısal değerleri sessizce önermeyin.
    if (query.some(q => /^\d/.test(q) && !tokens.includes(q))) return [];
    let matched = 0;
    const matchedTokens: string[] = [];
    const score = query.reduce((sum, q) => {
      const fuzzy = q.length >= 8 ? 2 : 1;
      let best = 0, bestToken = '';
      for (const t of tokens) {
        const s = q === t ? 6 : t.startsWith(q) ? 4
          : q.length >= 4 && t.length >= 4 && Math.abs(q.length - t.length) <= fuzzy && distance(q, t) <= fuzzy ? 2 : 0;
        if (s > best) { best = s; bestToken = t; }
      }
      if (best) { matched++; matchedTokens.push(bestToken); }
      return sum + best;
    }, 0);
    if (matched < Math.ceil(query.length * 0.65)) return [];
    // Özenle seçilmiş temel örnekler ve geçmiş, geniş katalogdaki benzerlerinin önünde kalır.
    const bonus = candidate.kind === 'history' || base.core.has(candidate.key) ? 0.75 : 0;
    const startsWith = candidate.key.startsWith(normalized) || candidate.key.startsWith(correctedKey);
    return [{ text: candidate.text, kind: candidate.kind, order, group: matchedTokens.join(' '),
      score: score / query.length - tokens.length * 0.03 + (startsWith ? 2 : 0) + bonus }];
  }).sort((a, b) => b.score - a.score || a.order - b.order);

  const suggestions: CommandSuggestion[] = changed && correctedKey !== normalized ? [{ text: corrected, kind: 'correction' }] : [];
  const has = (text: string) => suggestions.some(s => normalizeCommand(s.text) === normalizeCommand(text));
  // Çeşitlilik: önce her eşleşen sözcük biçiminden ("kaydır", "kaydırıcı", "kaydırıcıya"…) en iyi öneri, sonra kalanlar.
  const groups = new Set<string>();
  for (const item of ranked) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    if (item.kind !== 'history' && groups.has(item.group)) continue;
    groups.add(item.group);
    if (!has(item.text)) suggestions.push({ text: item.text, kind: item.kind });
  }
  for (const item of ranked) {
    if (suggestions.length >= MAX_SUGGESTIONS) break;
    if (!has(item.text)) suggestions.push({ text: item.text, kind: item.kind });
  }
  return suggestions;
}
