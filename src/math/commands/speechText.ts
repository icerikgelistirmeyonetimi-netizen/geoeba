/**
 * Konuşma tanımadan gelen metni komut motorunun beklediği yazıma yaklaştırır.
 *
 * Tarayıcının ses tanıması harfleri, sayıları ve ekleri farklı biçimlerde yazabilir:
 *   "ee şey a be ce üçgeninin alanını hesapla"   → "ABC üçgeninin alanını hesapla"
 *   "a dan be ye doğru parçası çiz"               → "A'dan B'ye doğru parçası çiz"
 *   "a be cenin alanı kaç"                         → "ABC'nin alanı kaç"
 *   "a iki üç noktasını oluştur"                   → "A(2; 3) noktasını oluştur"
 *   "yarıçapı on iki virgül beş olan çember çiz"   → "yarıçapı 12,5 olan çember çiz"
 *   "kenarları üç virgül dört ve beş olan üçgen"   → "kenarları 3, 4 ve 5 olan üçgen"
 *   "ge x eşittir sinüs x", "a eşittir üç"         → "g(x) = sinüs x", "a = 3"
 *   "a be doğru parçasını ikiye bir oranında böl"  → "AB doğru parçasını 2:1 oranında böl"
 * Belirsiz sözcüklere ("ve", "ne", "o noktayı", "üçgeni de sil") dokunulmaz.
 */

const LETTER_NAMES: Record<string, string> = {
  a: 'A', be: 'B', ce: 'C', de: 'D', e: 'E', fe: 'F', ge: 'G', he: 'H', ha: 'H', ı: 'I', i: 'I', je: 'J', ke: 'K', ka: 'K', le: 'L', me: 'M',
  ne: 'N', o: 'O', pe: 'P', ku: 'Q', re: 'R', se: 'S', te: 'T', u: 'U', vi: 'V', ye: 'Y', ze: 'Z', iks: 'X', dabılyu: 'W',
  // Tanıyıcı harfi Latin harfiyle yazabilir: "a b c noktaları"
  b: 'B', c: 'C', d: 'D', f: 'F', g: 'G', h: 'H', j: 'J', k: 'K', l: 'L', m: 'M', n: 'N', p: 'P', r: 'R', s: 'S', t: 'T', v: 'V', y: 'Y', z: 'Z',
};
/** Tek başına anlamı olan, dizinin İLK harfi olamayan adlar ("de": bağlaç, "ne": soru, "o": zamir, "e": ünlem) — "o noktası" gibi iyelikli bağlam hariç. */
const NOT_FIRST = new Set(['de', 'ne', 'o', 'e', 'ye', 'u', 'y']);
const NOUN_AFTER = /^(?:nokta|köşe|kose|merkez|doğru|dogru|ışın|isin|üçgen|ucgen|kare|dikdörtgen|dikdortgen|çokgen|cokgen|dörtgen|dortgen|paralelkenar|yamuk|yamuğ|yamug|deltoid|kenar|parça|parca|yay|açı|aci|uzunluğ|uzunlug|orta|arası|arasi|arasındaki|vektör|vektor|çember|cember|(?:yarı|yari)?(?:çap|cap)(?!raz)|elips|daire|beşgen|besgen|altıgen|altigen|eğim|egim|mesafe|uzaklı|alan|çevre|cevre|kiriş|kiris|olarak|doğrultu|kesen|öklid|oklid|öklit|oklit|tales|pisagor)/i;
const POSSESSIVE_POINT = /^(?:noktası|noktasını|noktasının|noktasından|noktasına|noktasında|köşesi|köşesini|köşesinden|merkezli|açısı|açısını|açısının)/i;
const SUFFIX_WORDS = new Set(['nin', 'nın', 'nun', 'nün', 'in', 'ın', 'un', 'ün', 'yi', 'yı', 'yu', 'yü', 'ye', 'ya', 'den', 'dan', 'ten', 'tan',
  'de', 'da', 'te', 'ta', 'le', 'la', 'yle', 'yla', 'deki', 'daki', 'nde', 'nda', 'nden', 'ndan']);
const FILLERS = /^(?:e{2,}|ı{2,}|a{3,}|hı+m+|hm+|mm+|şey|yani|evet|peki|tamam|hadi|haydi|şimdi|lütfen|işte|bakalım)$/i;
const UNITS: Record<string, number> = { sıfır: 0, bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9 };
const TENS: Record<string, number> = { on: 10, yirmi: 20, otuz: 30, kırk: 40, elli: 50, altmış: 60, yetmiş: 70, seksen: 80, doksan: 90 };
const DATIVE_NUMBERS: Record<string, number> = { bire: 1, ikiye: 2, üçe: 3, dörde: 4, beşe: 5, altıya: 6, yediye: 7, sekize: 8, dokuza: 9, ona: 10 };
const MATH_WORDS = /^(?:x|iks|kare|küp|artı|eksi|çarpı|bölü|kere|üzeri|karekök|parantez|\(|\)|=)$/i;
/** Fonksiyon adlarının okunuşları: "ef x eşittir …", "ge parantez beş kaç", "ha x eşittir …". */
const FUNCTION_NAMES: Record<string, string> = { f: 'f', fe: 'f', ef: 'f', g: 'g', ge: 'g', h: 'h', ha: 'h', he: 'h' };
/** Fonksiyon değerini soran sözcükler: "f parantez iki virgül beş kaç" (virgüllü argüman ancak soruyla fonksiyon çağrısıdır). */
const VALUE_QUESTION = /^(?:kaç|kaçtır|nedir|değer|hesapla|bul)/i;
/** Köşe sayısı belli çokgenler: "de e fe üçgeni" gibi dizilerde ilk harf "de" de olabilir. */
const POLYGON_VERTICES: [RegExp, number][] = [
  [/^(?:üçgen|ucgen)/i, 3],
  [/^(?:dörtgen|dortgen|kare|dikdörtgen|dikdortgen|paralelkenar|yamuk|yamuğ|yamug|deltoid)/i, 4],
  [/^(?:beşgen|besgen)/i, 5],
  [/^(?:altıgen|altigen)/i, 6],
];

const lc = (s: string | undefined) => (s ?? '').toLocaleLowerCase('tr');
const trNumber = (n: number) => String(n).replace('.', ',');

/** tokens[i]'den başlayan sayıyı okur: "on iki", "yirmi beş", "iki buçuk", "12", "-3", "eksi iki". */
function readNumber(tokens: string[], i: number): { value: number; end: number } | null {
  let j = i, negative = false;
  if (lc(tokens[j]) === 'eksi' && j + 1 < tokens.length && (UNITS[lc(tokens[j + 1])] !== undefined || TENS[lc(tokens[j + 1])] !== undefined || /^\d/.test(tokens[j + 1]))) { negative = true; j++; }
  const token = tokens[j];
  if (token && /^-?\d+(?:[.,]\d+)?$/.test(token)) {
    const value = Number(token.replace(',', '.'));
    return { value: negative ? -value : value, end: j + 1 };
  }
  let value = 0, used = false;
  if (UNITS[lc(tokens[j])] !== undefined && lc(tokens[j + 1]) === 'yüz') { value += UNITS[lc(tokens[j])] * 100; j += 2; used = true; }
  else if (lc(tokens[j]) === 'yüz') { value += 100; j++; used = true; }
  if (TENS[lc(tokens[j])] !== undefined) { value += TENS[lc(tokens[j])]; j++; used = true; }
  if (UNITS[lc(tokens[j])] !== undefined) { value += UNITS[lc(tokens[j])]; j++; used = true; }
  if (!used) return null;
  if (lc(tokens[j]) === 'buçuk') { value += 0.5; j++; }
  return { value: negative ? -value : value, end: j };
}

/** tokens[i]'den başlayan ondalık sayı: "sıfır virgül beş" → "0,5", "iki virgül sıfır beş" → "2,05". Liste ("üç virgül dört ve beş") ondalık değildir. */
function readDecimal(tokens: string[], i: number, separator: RegExp = /^virgül$/): { text: string; end: number } | null {
  const first = readNumber(tokens, i);
  if (!first || !Number.isInteger(first.value) || !separator.test(lc(tokens[first.end]))) return null;
  let k = first.end + 1, zeros = '';
  while (lc(tokens[k]) === 'sıfır' && readNumber(tokens, k + 1)) { zeros += '0'; k++; }
  const after = readNumber(tokens, k);
  if (!after || after.value < 0 || !Number.isInteger(after.value)) return null;
  if (lc(tokens[after.end]) === 'virgül' || (lc(tokens[after.end]) === 've' && readNumber(tokens, after.end + 1))) return null;
  const digits = after.end - k === 1 && /^\d+$/.test(tokens[k]) ? tokens[k] : String(after.value);
  const sign = first.value < 0 || Object.is(first.value, -0) ? '-' : '';
  return { text: `${sign}${Math.abs(first.value)},${zeros}${digits}`, end: after.end };
}

function letterOf(token: string | undefined): string | undefined {
  if (!token) return undefined;
  if (/^[A-ZÇĞİÖŞÜ]$/.test(token)) return token === 'İ' ? 'I' : token;
  return LETTER_NAMES[lc(token)];
}

/** "cenin" → ["ce", "nin"], "beyi" → ["be", "yi"]; harf adı + ek bitişik yazılmışsa. */
function splitMergedSuffix(token: string): [string, string] | null {
  const low = lc(token);
  for (const name of Object.keys(LETTER_NAMES).filter(n => n.length >= 2).sort((a, b) => b.length - a.length)) {
    if (low.startsWith(name) && SUFFIX_WORDS.has(low.slice(name.length))) return [name, low.slice(name.length)];
  }
  return null;
}

/** Köşe adlarıyla çokgen adı arasında gelebilen sıfatlar: "de e fe ikizkenar üçgeni", "de e fe ge düzgün dörtgeni". */
const POLYGON_ADJECTIVE = /^(?:ikizkenar|eşkenar|eskenar|dik|düzgün|duzgun|çeşitkenar|cesitkenar|öklid|oklid|öklit|oklit|pisagor|tales)$/i;

/**
 * tokens[start]'tan başlayan, tek başına anlamı da olan adla ("de", "e") açılan harf dizisi köşe adı mı?
 * Köşe sayısı çokgenle tutmalı ("de e fe üçgeni" evet, "de a be ce üçgeni" hayır) ve harfler alfabede ardışık olmalı:
 * "e fe ge üçgeni" EFG'dir, "e a be ce karesi" ise duraksama + ABC'dir. O (orijin) her dizinin başında olabilir.
 * "de e fe noktalarını birleştir": en az üç ardışık harften sonra "noktalar" da gelebilir.
 */
function polygonRunAt(tokens: string[], start: number): boolean {
  let end = start;
  while (end < tokens.length && letterOf(tokens[end])) end++;
  const letters = tokens.slice(start, end).map(t => letterOf(t)!);
  const consecutive = letters.every((l, k) => k === 0 || l.charCodeAt(0) === letters[k - 1].charCodeAt(0) + 1);
  if (lc(tokens[start]) !== 'o' && !consecutive) return false;
  if (/^noktalar/i.test(tokens[end] ?? '')) return end - start >= 3;
  const noun = POLYGON_ADJECTIVE.test(tokens[end] ?? '') ? end + 1 : end;
  return POLYGON_VERTICES.some(([re, count]) => re.test(tokens[noun] ?? '') && end - start === count);
}

/** Fonksiyon adından sonraki parantezli argüman: "parantez beş", "parantez içinde on iki", "( eksi iki )". Parantezsiz sayı okunmaz ("fe beş üç" koordinattır). */
function readCallArgument(tokens: string[], k: number): { text: string; end: number } | null {
  const open = lc(tokens[k]);
  if (open !== 'parantez' && open !== '(') return null;
  const start = open === 'parantez' && lc(tokens[k + 1]) === 'içinde' ? k + 2 : k + 1;
  const number = readNumber(tokens, start);
  const decimal = readDecimal(tokens, start);
  const argument = decimal ?? (number && { text: trNumber(number.value), end: number.end });
  if (!argument) return null;
  const closed = tokens[argument.end] === ')' || (open === 'parantez' && lc(tokens[argument.end]) === 'parantez');
  const end = closed ? argument.end + 1 : argument.end;
  // "fe parantez aç iki virgül üç parantez kapat noktası": virgülle ayrılmış iki sayı, ardından soru gelmedikçe F(2,3) koordinatıdır.
  if (decimal && !VALUE_QUESTION.test(tokens[end] ?? '')) return null;
  if (closed) return { text: argument.text, end };
  // Kapatılmamış parantezden sonra ikinci sayı geliyorsa koordinat olabilir: "fe parantez beş üç"
  return open === 'parantez' && !readNumber(tokens, argument.end) ? argument : null;
}

/** "ef in üçteki değeri", "genin ikideki değeri", "f'nin 3'teki değeri", "f nin beş için değeri" → ad ve nokta ("3'teki"); motor f(3) diye okur. */
function readValueAt(tokens: string[], i: number): { name: string; at: string; end: number } | null {
  const token = lc(tokens[i]);
  // Bitişik yazımda ek ünlü uyumuna uymalı ("fenin", "efin", "hanın"); tek harfli ad yalnızca kesmeyle ("f'nin"). "gün", "hain" karışmasın.
  const merged = token.match(/^(?:(fe|ge|he)['’]?nin|(ef)['’]?in|(ha)['’]?nın|([fgh])['’]n?[ıi]n)$/);
  // Ayrı yazımda addan sonra "x" gelebilir, iyelik "fonksiyonunun" da olabilir: "ef in", "ef x in", "ef fonksiyonunun"
  const owner = !merged && FUNCTION_NAMES[token] && /^(?:x|iks)$/.test(lc(tokens[i + 1])) ? i + 2 : i + 1;
  const separate = FUNCTION_NAMES[token] && (/^n?[ıiuü]n$/.test(lc(tokens[owner])) || lc(tokens[owner]) === 'fonksiyonunun');
  if (!merged && !separate) return null;
  const name = merged ? FUNCTION_NAMES[merged[1] ?? merged[2] ?? merged[3] ?? merged[4]] : FUNCTION_NAMES[token];
  const k = merged ? i + 1 : owner + 1;
  // "üçteki", "yirmi beşteki", "iki virgül beşteki", "3'teki": sayının son sözcüğü -de/-te + -ki alır
  for (let end = k + 1; end <= Math.min(tokens.length, k + 4); end++) {
    const last = tokens[end - 1].match(/^(.+?)['’]?([dt][ae]ki)$/u);
    if (!last || !/^değer/i.test(tokens[end] ?? '')) continue;
    const words = [...tokens.slice(k, end - 1), last[1]];
    const number = readNumber(words, 0);
    const decimal = readDecimal(words, 0);
    const text = decimal?.end === words.length ? decimal.text : number?.end === words.length ? trNumber(number.value) : null;
    if (text !== null) return { name, at: `${text}'${lc(last[2])}`, end };
  }
  // "ef in x eşittir üç için değeri" ("x eşittir" önceden "x =" yazılmış olabilir)
  const valueStart = lc(tokens[k]) === 'x' && /^(?:=|eşittir)$/.test(lc(tokens[k + 1])) ? k + 2 : k;
  const number = readNumber(tokens, valueStart);
  if (number && /^(?:için|noktasındaki)$/i.test(tokens[number.end] ?? '') && /^değer/i.test(tokens[number.end + 1] ?? '')) {
    return { name, at: trNumber(number.value), end: number.end };
  }
  return null;
}

/**
 * Tanım gövdesi formül olarak spokenMath'e kalır; yalnızca onun çözemediği iki kalıp burada yazıya çevrilir:
 * sözlü ondalık ("sıfır virgül beş x kare" → "0,5 x kare") ve okunuşla söylenen fonksiyon çağrısı ("ef x artı bir" → "f(x) artı bir").
 */
function normalizeDefinitionBody(body: string): string {
  const tokens = body.split(' ').filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const decimal = readDecimal(tokens, i);
    if (decimal) { out.push(decimal.text); i = decimal.end - 1; continue; }
    const name = FUNCTION_NAMES[lc(tokens[i])];
    if (name && name !== lc(tokens[i]) && /^(?:x|iks)$/i.test(tokens[i + 1] ?? '')) { out.push(`${name}(x)`); i++; continue; }
    out.push(tokens[i]);
  }
  return out.join(' ');
}

export function normalizeSpokenCommand(transcript: string): string {
  let text = (transcript ?? '').replace(/\s+/g, ' ').trim().replace(/[.!…]+$/u, '').trim();
  if (!text) return '';

  // Bitişik ya da bölünmüş sözcükler
  text = text
    .replace(/(?<![\p{L}])(çember|daire|kare|üçgen|nokta|doğru|elips|yay|açı|dikdörtgen)(çiz|oluştur|sil|ekle)(?![\p{L}])/giu, '$1 $2')
    .replace(/doğruparça/giu, 'doğru parça')
    .replace(/(?<![\p{L}])çem ber/giu, 'çember')
    .replace(/(?<![\p{L}])dikdört gen/giu, 'dikdörtgen')
    .replace(/(?<![\p{L}])(üç|dört|beş|altı|yedi|sekiz|dokuz|çok) gen(?![\p{L}])/giu, '$1gen')
    .replace(/(?<![\p{L}])parantez aç(?![\p{L}])\s*/giu, '(')
    .replace(/\s*(?<![\p{L}])parantez kapat(?![\p{L}])/giu, ')');

  // Fonksiyon tanımı: "f x eşittir …", "f of x eşittir …", "ge x eşittir …", "ef x eşittir …". Gövde formül olarak kalır (spokenMath çevirir).
  // Art arda iki tanım "ve" ile ayrılır: "ef x eşittir x kare ge x eşittir iki x" → "f(x) = x kare ve g(x) = iki x".
  let definitions = 0;
  text = text.replace(/(?<![\p{L}])(?:(ve)\s+)?(f|fe|ef|g|ge|h|ha|he)\s*(?:\(\s*x\s*\)|(?:of\s+)?(?:x|iks))\s+(?:eşittir|eşit)\s+/giu, (_, and: string | undefined, name: string) => {
    const joined = !!and || definitions > 0;
    definitions++;
    return `${joined ? 've ' : ''}${FUNCTION_NAMES[lc(name)]}(x) = `;
  });
  const definition = text.match(/^(.*?)((?<![\p{L}])[fgh]\(x\) = .*)$/u);
  if (definition) {
    const prefix = definition[1].trim() ? normalizeTokens(definition[1].replace(/\s+ve\s*$/u, '')) : '';
    const joiner = /\s+ve\s*$/u.test(definition[1]) ? ' ve' : '';
    return `${prefix}${joiner} ${normalizeDefinitionBody(definition[2].trim())}`.trim();
  }
  text = text.replace(/(?<![\p{L}])([xy])\s+(?:eşittir|eşit)\s+/iu, (_, name: string) => `${lc(name)} = `);
  text = text.replace(/(?<![\p{L}])iks(?![\p{L}])/giu, 'x');
  return normalizeTokens(text);
}

function normalizeTokens(input: string): string {
  const raw = input.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').replace(/\s*;\s*/g, ' ; ').split(' ').filter(Boolean);
  // Dolgu sözcükleri ve takılmalar ("a a noktası")
  const tokens: string[] = [];
  for (const token of raw) {
    if (FILLERS.test(token)) continue;
    const previous = tokens[tokens.length - 1];
    if (previous && lc(previous) === lc(token) && (letterOf(token) || token.length === 1)) continue;
    tokens.push(token);
  }

  const out: string[] = [];
  const lastOut = () => lc(out[out.length - 1]);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const low = lc(token);

    // Fonksiyon değeri soruları: "f parantez beş kaç" → "f(5) kaç", "ef in üçteki değeri nedir" → "f'nin 3'teki değeri nedir"
    // Büyük harfle yazılmış tek harf ("F(2,3) noktası", ses tanıma çıktısı) nokta adıdır; fonksiyon adı sayılmaz.
    const functionName = /^[A-ZÇĞİÖŞÜ]$/.test(token) ? undefined : FUNCTION_NAMES[low];
    const call = functionName ? readCallArgument(tokens, i + 1) : null;
    if (functionName && call) { out.push(`${functionName}(${call.text})`); i = call.end - 1; continue; }
    const valueAt = readValueAt(tokens, i);
    if (valueAt) { out.push(`${valueAt.name}'nin`, valueAt.at); i = valueAt.end - 1; continue; }
    // "fe fonksiyonunu kırmızı yap" → "f fonksiyonunu kırmızı yap"
    if (functionName && /^fonksiyon/i.test(tokens[i + 1] ?? '')) { out.push(functionName); continue; }
    // "x iki iken ef kaç": eşittirsiz söylenen değer de koşuldur → "x = 2 iken f kaç"
    const bareValue = /^(?:iken|için|olduğunda|olunca|ise)$/.test(lastOut()) && lc(out[out.length - 3]) === 'x' ? readNumber([out[out.length - 2] ?? ''], 0) : null;
    if (functionName && bareValue) out.splice(out.length - 2, 1, '=', trNumber(bareValue.value));
    // "x = 2 iken fe kaç" → "x = 2 iken f kaç", "… iken ef x kaç" → "… iken f(x) kaç"
    if (functionName && /^(?:iken|için|olduğunda|olunca|ise)$/.test(lastOut()) && /^-?\d+(?:,\d+)?$/.test(out[out.length - 2] ?? '')
      && out[out.length - 3] === '=' && lc(out[out.length - 4]) === 'x') {
      if (lc(tokens[i + 1]) === 'x') { out.push(`${functionName}(x)`); i++; } else out.push(functionName);
      continue;
    }

    // Harf ya da kısa ad + "eşittir" + sayı: "a eşittir üç" → "a = 3", "te eşittir sıfır virgül beş" → "t = 0,5"
    if (lc(tokens[i + 1]) === 'eşittir' && (letterOf(token) || /^[a-zçğıöşü]{1,2}$/i.test(token))) {
      const name = letterOf(token) ? lc(letterOf(token)) : low;
      // "te eşittir sıfır nokta beş": atamada "nokta" da ondalık ayıracıdır.
      const decimal = readDecimal(tokens, i + 2, /^(?:virgül|nokta)$/);
      const value = readNumber(tokens, i + 2);
      out.push(name, '=');
      if (decimal) { out.push(decimal.text); i = decimal.end - 1; }
      else if (value) { out.push(trNumber(value.value)); i = value.end - 1; } else i += 1;
      continue;
    }
    if (low === 'eşittir' || token === '=') {
      out.push(token === '=' ? '=' : 'eşittir');
      const decimal = readDecimal(tokens, i + 1);
      const value = readNumber(tokens, i + 1);
      if (decimal) { out.push(decimal.text); i = decimal.end - 1; }
      else if (value && !/^(?:x|iks|kare|küp)$/i.test(tokens[value.end] ?? '')) { out.push(trNumber(value.value)); i = value.end - 1; }
      continue;
    }

    // Oran: "ikiye bir oranında", "iki bir oranında"
    const dative = DATIVE_NUMBERS[low];
    if (dative !== undefined) {
      const second = readNumber(tokens, i + 1);
      if (second && /^oran/i.test(tokens[second.end] ?? '')) { out.push(`${dative}:${trNumber(second.value)}`); i = second.end - 1; continue; }
    }

    // Sözlü koordinat: "a iki üç noktası", "a sıfır sıfır be dört sıfır noktaları", "iki üç koordinatına", "iki noktalı virgül üç"
    const letter = letterOf(token);
    const numberStart = letter && !/^(?:bir|on)$/.test(low) ? i + 1 : i;
    const first = readNumber(tokens, numberStart);
    if (first) {
      let second = readNumber(tokens, first.end);
      let end = second?.end ?? 0;
      if (!second && lc(tokens[first.end]) === 'noktalı' && lc(tokens[first.end + 1]) === 'virgül') { second = readNumber(tokens, first.end + 2); end = second?.end ?? 0; }
      if (!second && tokens[first.end] === ';') { second = readNumber(tokens, first.end + 1); end = second?.end ?? 0; }
      const pointContext = /^(?:nokta|köşe|kose)/i.test(lastOut()) || /^(?:nokta|konum|koordinat|vektör|vektor)/i.test(tokens[end] ?? '')
        || (letter && (letterOf(tokens[end]) && readNumber(tokens, end + 1) !== null));
      const explicitPair = tokens[first.end] === ';' || lc(tokens[first.end]) === 'noktalı';
      if (second && (pointContext || explicitPair) && (letter || numberStart === i)) {
        const coordinate = `(${trNumber(first.value)}; ${trNumber(second.value)})`;
        if (letter && numberStart === i + 1) {
          if (out.length && /^[A-ZÇĞİÖŞÜ]\(/.test(out[out.length - 1]) && letterOf(tokens[end]) === undefined && /^nokta/i.test(tokens[end] ?? '')) {
            out[out.length - 1] = out[out.length - 1].replace(/,$/, '');
            out.push('ve');
          }
          out.push(`${letter}${coordinate}`);
          if (letterOf(tokens[end]) && readNumber(tokens, end + 1)) {
            const nextSecond = readNumber(tokens, (readNumber(tokens, end + 1)?.end ?? end));
            if (nextSecond) out[out.length - 1] += ',';
          }
        } else out.push(coordinate);
        i = end - 1;
        continue;
      }
      // Ondalık ya da liste: "on iki virgül beş" → 12,5; "üç virgül dört ve beş" → 3, 4 ve 5
      if (lc(tokens[first.end]) === 'virgül' && numberStart === i) {
        const after = readNumber(tokens, first.end + 1);
        if (after) {
          const listTail = lc(tokens[after.end]) === 've' ? readNumber(tokens, after.end + 1) : null;
          const isList = listTail !== null || lc(tokens[after.end]) === 'virgül';
          const pointBefore = /^(?:nokta|koordinat|konum)/i.test(lastOut());
          if (pointBefore && !isList) out.push(`(${trNumber(first.value)}; ${trNumber(after.value)})`);
          else if (isList) {
            out.push(`${trNumber(first.value)},`, trNumber(after.value));
            if (listTail) { out.push('ve', trNumber(listTail.value)); i = listTail.end - 1; continue; }
          } else {
            const digits = tokens.slice(first.end + 1, after.end).length === 1 && /^\d+$/.test(tokens[first.end + 1]) ? tokens[first.end + 1] : String(Math.abs(after.value));
            out.push(`${trNumber(Math.trunc(first.value))},${digits}`);
          }
          i = after.end - 1;
          continue;
        }
      }
      // "eksi iki" → "-2" (formül içinde değilse)
      if (low === 'eksi' && !MATH_WORDS.test(lastOut()) && !/^\d/.test(lastOut())) { out.push(trNumber(first.value)); i = first.end - 1; continue; }
    }
    if (low === 'virgül') { if (out.length) out[out.length - 1] += ','; continue; }
    if (low === 'noktalı' && lc(tokens[i + 1]) === 'virgül') { out.push(';'); i++; continue; }

    // Harf adları dizisi: "a be ce üçgeni" → "ABC üçgeni", "a be nin" → "AB'nin", "be ye" → "B'ye"
    const run: string[] = [];
    let suffix = '';
    let j = i;
    while (j < tokens.length) {
      const t = tokens[j];
      const tl = lc(t);
      const merged = run.length ? splitMergedSuffix(t) : null;
      if (merged && !letterOf(t)) { run.push(LETTER_NAMES[merged[0]]); suffix = merged[1]; j++; break; }
      const apostrophe = t.match(/^([\p{L}]+?)['’]([\p{L}]+)$/u);
      if (apostrophe && letterOf(apostrophe[1]) && (run.length || !NOT_FIRST.has(lc(apostrophe[1])))) { run.push(letterOf(apostrophe[1])!); suffix = lc(apostrophe[2]); j++; break; }
      const name = letterOf(t);
      if (!name) break;
      // "de e fe üçgeni": köşe sayısı çokgenle tutuyorsa "de" bağlaç değil, ilk köşedir
      if (!run.length && NOT_FIRST.has(tl) && !POSSESSIVE_POINT.test(tokens[j + 1] ?? '') && !/^(?:açı)/i.test(tokens[j + 1] ?? '') && !polygonRunAt(tokens, j)) break;
      if (run.length && (tl === 'ye' || tl === 'ya')) { suffix = tl; j++; break; }
      // "ce de doğruları", "be de yarıçaplı" → CD, BD; "be de sil", "merkezi be de yarıçapı iki" → B'de (çap/yarıçap yalnızca sıfat biçimiyle ada bağlanır)
      const afterDe = tokens[j + 1] ?? '';
      if (run.length && (tl === 'de' || tl === 'da') && (!NOUN_AFTER.test(afterDe) || /^(?:yarı|yari)?(?:çap|cap)(?!l[ıi])/i.test(afterDe))) { suffix = tl; j++; break; }
      run.push(name);
      j++;
    }
    if (run.length && !suffix && SUFFIX_WORDS.has(lc(tokens[j]))) { suffix = lc(tokens[j]); j++; }
    if (run.length) {
      const next = tokens[j] ?? '';
      const previousWord = lastOut();
      const renameTarget = /^(?:adını|ismini|adı)$/.test(previousWord) && /^(?:yap|olsun|olarak)/i.test(next)
        || /^(?:olarak)$/i.test(next) && /^(?:adlandır|isimlendir)/i.test(tokens[j + 1] ?? '');
      // "be kaydırıcısı", "te değeri sıfır virgül beş olsun": tek harf kaydırıcı adıdır.
      const sliderName = run.length === 1 && /^(?:kaydırıcı|parametre|sürgü|değeri$|degeri$)/i.test(next);
      const coordinated = /^(?:ve|ile|,)$/.test(lc(next)) && letterOf(tokens[j + 1]) !== undefined;
      // "de e fe ikizkenar üçgenini çiz": köşe adı ile çokgen adı arasında sıfat; "çapı a be olan çember": çapın adı
      const adjectivePolygon = run.length >= 3 && POLYGON_ADJECTIVE.test(next) && POLYGON_VERTICES.some(([re]) => re.test(tokens[j + 1] ?? ''));
      const roleValue = run.length >= 2 && /^(?:çapı|capi|yarıçapı|yaricapi)$/.test(previousWord) && /^olan$/i.test(next);
      const accepted = suffix || NOUN_AFTER.test(next) || renameTarget || sliderName || adjectivePolygon || roleValue || (run.length >= 2 && coordinated)
        || (run.length === 1 && (POSSESSIVE_POINT.test(next) || /^açı/i.test(next) || next.startsWith('(')));
      const shortRunOk = run.length >= 2 || suffix || POSSESSIVE_POINT.test(next) || /^(?:nokta|merkez|köşe|kose|açı)/i.test(next) || renameTarget || sliderName || next.startsWith('(');
      if (accepted && shortRunOk) {
        const label = sliderName ? lc(run.join('')) : run.join('');
        out.push(suffix ? `${label}'${suffix}` : label);
        i = j - 1;
        continue;
      }
    }
    out.push(token);
  }

  // Sıralanan harfler: "a ile B arasındaki", "a, be ve C noktaları" → "A ile B", "A, B ve C"
  for (let k = 0; k < out.length - 2; k++) {
    const connector = lc(out[k + 1]);
    const right = out[k + 2];
    const rightIsLabel = /^[A-ZÇĞİÖŞÜ](?:['’]|$)/.test(right) || (letterOf(right) !== undefined && /^(?:nokta|ara|kesiş|doğru|ile)/i.test(out[k + 3] ?? ''));
    if ((connector === 've' || connector === 'ile') && letterOf(out[k]) && !/^[A-ZÇĞİÖŞÜ]/.test(out[k]) && !NOT_FIRST.has(lc(out[k])) && rightIsLabel) {
      out[k] = letterOf(out[k])!;
      if (!/^[A-ZÇĞİÖŞÜ]/.test(right)) out[k + 2] = letterOf(right)!;
    }
  }
  for (let k = out.length - 1; k > 0; k--) {
    const m = out[k - 1].match(/^([\p{L}]+),$/u);
    if (m && letterOf(m[1]) && !/^[A-ZÇĞİÖŞÜ]/.test(m[1]) && /^[A-ZÇĞİÖŞÜ]$/.test(out[k])) out[k - 1] = `${letterOf(m[1])},`;
  }

  return out.join(' ')
    .replace(/\s+,/g, ',')
    .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
    .replace(/(?<=[A-ZÇĞİÖŞÜ]) \((?=-?\d)/g, '(')
    .replace(/\s+/g, ' ')
    .trim();
}
