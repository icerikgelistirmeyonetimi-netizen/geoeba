import type { Point2D } from '@/types/math';

/**
 * Türkçe komut metnini çözümleme katmanı.
 *
 * Cümle, işleyicilerin kolayca eşleyebileceği bir "yer tutuculu metne" dönüştürülür:
 *   "ABC'nin kenarları 3, 4 ve 5 olsun" → "$0nin kenarlari #0 , #1 ve #2 olsun"
 *   - #i  : numbers[i]   (ondalık virgül ve sayı sözcükleri çözülmüş: "iki buçuk" → 2.5)
 *   - @i  : coords[i]    ("(2,5; -3)", "(2, 3)", "(2;3)", "2 3 konumuna")
 *   - $i  : labels[i]    (A, AB, ABC, A_1, A', [AB], |AB|, sahnedeki küçük harfli adlar); ek varsa bitişik yazılır: "$0nin".
 *                        Etiketler cümledeki sırayla numaralanır.
 *   - "i" : quotes[i]    (çift, tek ya da tipografik tırnak içindeki ham yazı; komut sözcüğü sayılmaz)
 * Sözcükler katlanır: küçük harf, ı→i, aksanlar atılır (ç→c, ğ→g, ö→o, ş→s, ü→u), kesme işareti silinir.
 */

export function fold(text: string): string {
  return text.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Eski davranış: kesme işaretlerini de siler. Arama ve anlam katmanı kullanır. */
export function normalizeCommand(text: string): string {
  return fold(text).replace(/[’'′]/g, '').replace(/\s+/g, ' ').trim();
}

/** Etiket karşılaştırma anahtarı: büyük/küçük harf, köşeli parantez, boşluk ve kesme biçimi farkı gözetilmez. */
export function labelKey(label: string): string {
  return fold(label).replace(/[’′]/g, "'").replace(/[\s[\]|]/g, '');
}

export type VerbKind =
  | 'create' | 'measure' | 'delete' | 'hide' | 'show' | 'color' | 'move' | 'rename' | 'rotate' | 'reflect'
  | 'translate' | 'scale' | 'set' | 'select' | 'copy' | 'undo' | 'redo' | 'question' | 'bind' | 'play' | 'stop'
  | 'zoom' | 'lock' | 'unlock' | 'switch';

/** Katlanmış metin üzerinde fiil kökleri. Bir sözcük birden çok türe girebilir (ör. "göster": ölç + göster). */
export const VERB_PATTERNS: [VerbKind, RegExp][] = [
  // "pergelin ucunu A noktasına batır": pergel ucunu koymak
  ['create', /\b(?:ciz(?!g|im)|olustur|yap(?!istir|i\b)|ekle|koy|kur(?!al)|cek(?!il)|indir|yerlestir|tanimla|olsun|ist(?:iyor|ey|er\b|e(?!m))|lazim|gerek|getir|uret|birlestir|kesistir|bol(?!um|ge|u\b)|batir(?!ma))/],
  ['measure', /\b(?:olc(?!ek|u)|hesapla|bul(?!un)|goster|yaz(?:\b|in\b|ar|sana|dir|abil|iver)|kac\b|kactir|kacdir|nedir|ne kadar|soyle|belirt|ogren)/],
  ['delete', /\b(?:sil(?!indir)|kaldir|temizle|yok et)/],
  ['hide', /\b(?:gizle|sakla|gorunmez|kapat|gorunmesin)/],
  ['show', /\b(?:goster|gorunur|goruns|ac\b|acin\b)/],
  // "içini doldur", "içi doldurulsun" dolgu emridir; "içi doldurulmuş kare", "doldurarak" sıfat/ulaç biçimleri değildir.
  ['color', /\b(?:boya|renk|rengi|doldur(?!ul(?!sun\b)|ma|an\b|ara|mus))/],
  ['move', /\b(?:tasi(?!yici)|kaydir(?!ici)|surukle|ilerlet)/],
  ['rename', /\b(?:adlandir|isimlendir|adini|ismini|etiketini|adi\b|ismi\b)/],
  ['rotate', /\b(?:dondur|cevir)/],
  ['reflect', /\b(?:yansit|simetri|yansima|aynala)/],
  ['translate', /\b(?:otele)/],
  ['scale', /\b(?:buyut|kucult|olcekle|genislet|daralt|uzat|kisalt)/],
  ['set', /\b(?:ayarla|degistir|esitle|guncelle|olsun|yap(?!istir|i\b))|=/],
  // "seçtiğim noktaları birleştir": seçimi gösteren sıfat-fiil seçme emri değildir.
  ['select', /\bsec(?!il|im|enek|tig|tik)/],
  ['copy', /\b(?:kopyala|cogalt|kopya)/],
  ['undo', /\bgeri al/],
  ['redo', /\b(?:yinele|ileri al)/],
  ['question', /\bkac\b|\bkactir|\bkacdir|\bnedir\b|\bne kadar|\?/],
  ['bind', /\bbagla/],
  ['play', /\b(?:oynat|baslat|canlandir)/],
  ['stop', /\bdurdur/],
  ['zoom', /\b(?:yakinlas|uzaklas|sigdir|ortala)/],
  ['lock', /\b(?:kilitle|sabitle|ilistir)/],
  ['unlock', /\b(?:kilidini ac|kilit coz|serbest birak)/],
  // "kareli düzleme geç", "elips aracına geçelim", "3 boyuta geçer misin"; "A'dan geçsin", "B noktasından da geçsin" ise "içinden geçme" ilişkisidir.
  ['switch', /(?<!(?:dan|den|tan|ten)(?: da| de)? )\bgec(?:\b|in\b|elim\b|sin\b|iver\w*|er mi\w*|ebilir mi\w*|sene\b|sana\b)/],
];

export const NEGATION = /\b(?:ciz|olustur|yap|ekle|bagla|sil|gizle|koy|goster|tasi|dondur|yansit|boya|doldur|gec|batir)m(?:a|e)(?:yin|yiniz|sin|yalim)?\b|\bistemiyorum\b|\bistemem\b|\bdegil\b|\bolmasin\b/g;
/** "döndürme aracı", "çizme penceresi" gibi -me/-ma ile biten adlar olumsuzluk değildir. */
const VERBAL_NOUN_AFTER = /^\s*(?:arac|pencere|islem|modu|mod\b|dugme|buton|sekme|ozelli|komut)/;
/**
 * Olumsuz fiille söylenmiş görünüm ve seçim ayarları bir işlem isteğidir, olumsuz emir değil:
 * "ızgara olmasın", "ızgara çizgileri olmasın", "eksenleri görmek istemiyorum", "koordinatlar olmasın", "hiçbir şey seçili olmasın".
 * Etiketli cümleler ("A noktasının koordinatları olmasın") ve şekil emirleri ("üçgen çizme") olumsuz kalır.
 */
const NEGATED_SETTING = /\b(?:(?:x ve y |koordinat )?(?:izgara|eksen)[a-z]*(?: cizgi[a-z]*)?|(?:nokta )?koordinat(?:lar|lari|larini|i|ini)?|olcum(?:ler|leri|lerini)?|ceyrek bolge[a-z]*|esitlik (?:isaret|centik)[a-z]*) (?:(?:hic|artik|ekranda) )?(?:(?:gormek|gostermek|gorunmesini|gosterilmesini) )?(?:olmasin|istemiyorum|istemem)\b|\bhicbir (?:sey|nesne|sekil|nokta)[a-z]* secili olmasin\b/g;
/** Cümle sonundaki olumsuz ayar isteği: "ızgara olmasın ve üçgen çiz" iki işlemdir. */
const SETTING_REQUEST_END = new RegExp(`(?:${NEGATED_SETTING.source})$`);

/**
 * Ayar adından önce belli bir nesne anılıyor mu? "seçili noktanın koordinatları olmasın", "bu noktanın …", "üçgenin …"
 * genel görünüm ayarı değildir; olumsuz emir olarak kalır. "noktaların koordinatları" (tümü) ve "bütün eksenler" geneldir.
 */
function hasObjectOwner(before: string): boolean {
  const words = before.trim().split(/\s+/).filter(Boolean);
  const last = words[words.length - 1] ?? '';
  const genitive = /(?:nin|nun|in|un)$/.test(last) && !/(?:lar|ler)in$|^(?:butun|icin)$/.test(last);
  // "bu koordinatlar", "bu noktanın koordinatları"; "şu anda ızgara olmasın" ise zaman bildirir.
  const demonstrative = /^(?:bu|su|o)$/.test(last) || (genitive && /^(?:bu|su|o)$/.test(words[words.length - 2] ?? ''));
  return /\b(?:secil|sectig|sectik)/.test(before) || demonstrative || genitive;
}

export function detectVerbs(foldedText: string): Set<VerbKind> {
  return new Set(VERB_PATTERNS.filter(([, re]) => re.test(foldedText)).map(([kind]) => kind));
}

export function isNegated(foldedText: string): boolean {
  const settings = /\$\d/.test(foldedText) ? [] : [...foldedText.matchAll(NEGATED_SETTING)]
    .filter(m => !hasObjectOwner(foldedText.slice(0, m.index)))
    .map(m => [m.index!, m.index! + m[0].length]);
  for (const m of foldedText.matchAll(NEGATION)) {
    if (settings.some(([start, end]) => m.index! >= start && m.index! < end)) continue;
    if (!VERBAL_NOUN_AFTER.test(foldedText.slice(m.index! + m[0].length))) return true;
  }
  return false;
}

/** Katlanmış metinde ad kökleri. İşleyiciler kendi daha ayrıntılı kalıplarını da kullanabilir. */
export const NOUNS = {
  point: /\bnokta/,
  segment: /\bdogru parca|\bparcasi\b|\bparcayi\b|\bparcasini\b|\bparcasinin\b/,
  line: /\bdogru(?:su|sunu|sunun|suna|yu|nun|ya|lar|lari|larin|larini)?\b(?!\s+parca)/,
  ray: /\bisin(?:i|in|ini|a|dan|lar|lari)?\b/,
  circle: /\bcember|\bdaire(?!\s*dilim)|\byuvarla[kg]|\bdisk/,
  ellipse: /\belips/,
  arc: /\byay(?:i|in|ini|a|dan|lar|lari)?\b/,
  sector: /\bdaire dilim|\bdilim/,
  angle: /\baci(?:si|sini|sinin|nin|yi|ya|dan|lar|lari|larini|larinin)?\b|∠/,
  triangle: /\bucgen/,
  square: /\bkare(?!li|kok)/,
  rectangle: /\bdikdortgen/,
  polygon: /\bcokgen|\b(?:dort|bes|alti|yedi|sekiz|dokuz|on|oniki)gen|\bparalelkenar|\byamuk|\bdeltoid|\beskenar dortgen/,
  function: /\bfonksiyon|\bgrafi[gk]|\bparabol/,
  slider: /\bkaydirici|\bsurgu|\bparametre/,
  text: /\byazi(?!m)|\bmetin|\bnot(?:u|unu)?\b/,
  fraction: /\bkes(?:ir|ri)/,
  checkbox: /\b(?:onay|isaret) kutu/,
  button: /\bdugme|\bbuton/,
  inputBox: /\b(?:girdi|giris) kutu/,
  image: /\bgorsel|\bresim|\bfotograf/,
  pen: /\bkalem|\bserbest cizim/,
  vector: /\bvektor/,
} satisfies Record<string, RegExp>;
export type NounKind = keyof typeof NOUNS;

/** Etiketten sonra gelebilen Türkçe durum/iyelik ekleri (katlanmış). Kesme işaretsiz yazımda yalnızca bunlar kabul edilir. */
const SUFFIXES = new Set(['nin', 'nun', 'in', 'un', 'yi', 'yu', 'i', 'u', 'ye', 'ya', 'e', 'a', 'den', 'dan', 'ten', 'tan', 'de', 'da', 'te', 'ta',
  'le', 'la', 'yle', 'yla', 'ile', 'li', 'lu', 'lik', 'luk', 'ler', 'lar', 'si', 'su', 'sini', 'sunu', 'sinin', 'sunun', 'sine', 'suna', 'nda', 'nde',
  'ndan', 'nden', 'deki', 'daki', 'teki', 'taki', 'dir', 'dur', 'tir', 'tur', 'lerin', 'larin', 'leri', 'lari']);
/** Etiketten sonra AYRI yazılmış olabilen ekler: "BC nin", "A dan", "B yi" */
const DETACHED_SUFFIXES = new Set(['nin', 'nun', 'in', 'un', 'yi', 'yu', 'ye', 'ya', 'den', 'dan', 'ten', 'tan', 'de', 'da', 'te', 'ta', 'nda', 'nde', 'ndan', 'nden', 'deki', 'daki']);
export const STOPWORDS = new Set(['ve', 'ile', 'bir', 'bu', 'su', 'o', 'de', 'da', 'ki', 'mi', 'mu', 'ne', 'ya', 'en', 'her', 'hem', 'ama', 'gibi',
  'icin', 'olan', 'ise', 'veya', 'yada', 'lutfen', 'bana', 'tane', 'simdi', 'hadi', 'acaba', 'sonra', 'once', 'tum', 'butun', 'yeni', 'eski',
  'onu', 'ona', 'onun', 'ondan', 'onda', 'bunu', 'buna', 'bunun', 'bundan', 'bunda', 'onlar', 'onlari', 'bunlar', 'bunlari', 'sunu', 'suna']);
/** Küçük harfle yazılsa bile etiket sayılmayacak kısa sözcükler. */
const VOCAB = new Set(['mavi', 'sari', 'mor', 'gri', 'pembe', 'yesil', 'siyah', 'beyaz', 'yeni', 'eski', 'dik', 'dar', 'kisa', 'uzun', 'ince', 'orta',
  'alt', 'ust', 'sag', 'sol', 'tek', 'cift', 'ayni', 'ilk', 'son', 'esit', 'buyuk', 'kucuk', 'genis', 'kalin', 'bos', 'dolu', 'tam', 'yari', 'cok',
  'az', 'iki', 'uc', 'dort', 'bes', 'alti', 'yedi', 'on', 'kare', 'yay', 'aci', 'isin', 'alan', 'ciz', 'sil', 'sec', 'tasi', 'yaz', 'olc', 'ekle',
  'yap', 'koy', 'kur', 'ac', 'x', 'y', 'z', 'r', 'eksen', 'orjin', 'merkez', 'kenar', 'kose', 'nokta', 'dogru', 'daire', 'ad', 'adi', 'isim', 'renk',
  'cm', 'br', 'birim', 'kat', 'oran', 'dis', 'ic', 'hep', 'geri', 'ileri', 'al', 'ver', 'gel', 'git', 'at', 'as', 'in', 'is', 'ok', 'an', 'am',
  'saga', 'sola', 'yukari', 'asagi', 'lik', 'luk', 'li', 'lu', 'yan', 'tepe', 'taban', 'cap', 'sin', 'cos', 'tan', 'cot', 'kiris', 'egim',
  'bolu', 'carpi', 'arti', 'eksi', 'kere', 'pdf', 'png', 'svg', 'jpg', 'yuvarlak', 'disk', 'boy', 'en', 'sira', 'kez', 'defa', 'adim']);
const ACRONYMS = new Set(['pdf', 'png', 'svg', 'jpg', 'jpeg', 'gif', 'usb', 'word', 'excel']);

const NUMBER_WORDS: Record<string, number> = {
  sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, yirmi: 20, otuz: 30, kirk: 40,
  elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90, yuz: 100,
};
const PARAM_BEFORE_NUMBER = /^(?:yaricap|cap|kenar|uzunlug|boy|eni?$|genislig|yukseklig|taban|aci|olcu|deger|alan|cevre|egim|oran|kat|=|:)/;
const UNIT_AFTER_NUMBER = /^(?:birim|br|cm|santim|derece|kat|bucuk|tam|metre)$/;
const GEOMETRY_AFTER_LABEL = /^(?:nokta|merkez|kose|dogru|isin|ucgen|kare|dikdortgen|cokgen|cember|parca|kenar|yay|aci|olan|olsun|etraf|ekseni)/;
/** paramAfter/paramBefore: sayıyı sıfat biçimleri ("yarıçaplı", "derecelik") değil, iyelik biçimleri almalı. */
const ADJECTIVE_SUFFIX = /(?:li|lu|lik|luk)$/;

export interface LabelRef {
  /** Yazıldığı gibi etiket (ek ve köşeli parantez hariç): "ABC", "A_1", "A'" */
  text: string;
  /** Etiketten sonraki ekin katlanmış hâli ("nin", "den"; yoksa "") */
  suffix: string;
  bracket?: 'segment' | 'length';
  /** Küçük harfle yazılmış ve sahnedeki bir adla ya da bağlamla ("a noktası") eşleştirilmiş */
  lowercase?: boolean;
}

export interface KnownNames {
  /** Nokta etiketleri (büyük/küçük harf korunur) */
  points: string[];
  /** Nokta dışındaki nesne etiketleri ve kaydırıcı değişken adları */
  names: string[];
}

export interface Clause {
  raw: string;
  /** Yer tutuculu katlanmış metin; sözcükler tek boşlukla ayrılır. */
  text: string;
  words: string[];
  numbers: number[];
  coords: Point2D[];
  quotes: string[];
  /** Cümledeki sırayla etiketler */
  labels: LabelRef[];
  verbs: Set<VerbKind>;
  negated: boolean;
  /** f(x)=…, g(x)=…, y=… tanımı. Gövde, eşittirden sonraki ham metnin tamamıdır (sondaki "grafiğini çiz" gibi sözcükler dahil). */
  definition?: { name: string; body: string };
  /** "a = 2", "ab=3,5", "AB = 5", "a = 2 olsun" gibi tek satırlık atama; değer ham metindir. */
  assignment?: { name: string; valueRaw: string };
  has(re: RegExp): boolean;
  match(re: RegExp): RegExpMatchArray | null;
  /** "#3" → numbers[3] */
  num(ref: string): number;
  /** "$1" ya da "$1nin" → labels[1] */
  label(ref: string): LabelRef;
  /** stem sözcüğünden SONRA gelen sayı: "yarıçapı 3", "r = 3", "kenar uzunluğu: 5" (sıfat biçimi "yarıçaplı" sayılmaz) */
  paramAfter(stem: RegExp): number | undefined;
  /** stem sözcüğünden ÖNCE gelen sayı: "3 yarıçaplı", "5 birim kenarlı", "60 derecelik" */
  paramBefore(stem: RegExp): number | undefined;
  param(stem: RegExp): number | undefined;
  /** Sayı derece birimiyle mi yazıldı? ("60 derece", "60°", "60 derecelik") */
  isDegrees(ref: string): boolean;
  hasVerb(...kinds: VerbKind[]): boolean;
  hasNoun(...kinds: NounKind[]): boolean;
  /** "seçili/seçilen/seçilmiş" */
  refersToSelection: boolean;
  /** "onu, bunu, son çizilen, bu şekil…" */
  refersToLast: boolean;
}

const LABEL_UPPER = /^((?:[A-ZÇĞİÖŞÜ](?:_?\d+)?(?:['′’](?![a-zçğıöşü]))*)+)(?:(['’])?([a-zçğıöşü]+))?$/;
const QUOTE_RE = /"([^"\n]*)"|“([^”\n]*)”|«([^»\n]*)»|„([^“”\n]*)[“”]|‘([^’\n]*)’|(?<![\p{L}\p{N}])'([^'\n]{1,120})'(?![\p{L}\p{N}])/gu;

function parseNumber(text: string): number {
  return Number(text.replace('−', '-').replace(',', '.'));
}

function isDictionaryWord(folded: string): boolean {
  return Object.values(NOUNS).some(re => re.test(folded)) || detectVerbs(folded).size > 0 || VOCAB.has(folded) || STOPWORDS.has(folded);
}

/**
 * "abc" sahnedeki noktaların art arda yazımı mı? (A, B, C ya da A_1B gibi)
 * distinct: aynı nokta iki kez geçemez. Şekil adında köşe tekrarlanmaz; küçük harfli "dede", "neden", "tamam" gibi sözcükler ad değildir.
 */
function decomposes(key: string, points: Map<string, string>, distinct = false): boolean {
  if (key.length < 2) return false;
  const labels = [...points.keys()].sort((a, b) => b.length - a.length);
  const walk = (rest: string, used: string[]): boolean => !rest
    || labels.some(l => rest.startsWith(l) && !(distinct && used.includes(l)) && walk(rest.slice(l.length), [...used, l]));
  return walk(key, []);
}
/**
 * Harf adları ünlüyle biter (a, be, ce, de …); bitişik yazılan ek kaynaştırma ünsüzüyle başlar: "abnin", "cden", "abye".
 * Ünlüyle ya da t ile başlayan ek ("bak-ın", "bat-ır", "dah-i") harf adına gelmez; bu sözcükler noktalara bölünmez.
 */
const AFTER_LETTER_NAME = /^[^aeiout]/;
/** Ünsüzden sonra ünlü gelen küçük harfli sözcük ("bak", "ben", "hangi", "kendi", "belki") Türkçe sözcüğe benzer; "ab", "abc", "bcd" gibi harf dizisi değildir. */
const WORD_LIKE = /[^aeiou][aeiou]/;

/**
 * Bitişik ek gerçekten harf adına mı eklenmiş? Baş ünlüyle bitiyorsa ya da ortasında ünlü varsa sözcük Türkçe olarak da çözülür
 * ("e-den", "e-le", "el-de", "ben-de"); bu durumda ek harf adına bağlanmaz. Kabul edilenler:
 *   - ünlüsüz baş: "c-den", "bc-nin"
 *   - yalnızca ilk harfi ünlü olan baş + kaynaştırma ünsüzü (n, y, s; Türkçede ünsüzden sonra gelmez): "ab-nin", "ab-ye", "ac-nin"
 *   - aynı biçimde üç ve daha uzun baş + ünsüzle başlayan ek: "abc-den"
 *   - iki harfli baş + belirtme eki: "ab-ı", "ab-u" ("abyi" yazımının kısası)
 */
function gluedSuffixFits(head: string, suffix: string): boolean {
  const vowelFree = !/[aeiou]/.test(head);
  const initialVowelOnly = /^[aeiou][^aeiou]+$/.test(head);
  if (!AFTER_LETTER_NAME.test(suffix)) return /^(?:i|u)$/.test(suffix) && head.length === 2 && (vowelFree || initialVowelOnly);
  return vowelFree || (initialVowelOnly && (/^[nys]/.test(suffix) || head.length >= 3));
}

class ParsedClause implements Clause {
  raw: string;
  text = '';
  words: string[] = [];
  numbers: number[] = [];
  coords: Point2D[] = [];
  quotes: string[] = [];
  labels: LabelRef[] = [];
  verbs = new Set<VerbKind>();
  negated = false;
  definition?: { name: string; body: string };
  assignment?: { name: string; valueRaw: string };
  refersToSelection = false;
  refersToLast = false;

  constructor(raw: string, known: KnownNames) {
    this.raw = raw.trim();
    let source = this.raw.replace(/[−–—](?=\s*\d)/g, '-');

    // Tırnaklar önce ayrılır: içindeki "y = 2x", "ve", "değil" komut sayılmaz.
    source = source.replace(QUOTE_RE, (...groups: unknown[]) => {
      const content = groups.slice(1, 7).find(g => typeof g === 'string') as string | undefined;
      this.quotes.push(content ?? '');
      return ` "${this.quotes.length - 1}" `;
    });

    const definition = source.match(/(?:^|\s)((?:[a-zA-ZçğıöşüÇĞİÖŞÜ][a-zA-Z0-9]{0,2})\s*\(\s*x\s*\)|y)\s*=\s*(.+)$/);
    const definitionStart = definition ? definition.index! + (definition[0].length - definition[0].trimStart().length) : 0;
    // "x = 2, y = 3 olan nokta", "A noktası x=2 y=3 olsun": sayı değerli x'in ardından gelen sayı değerli y koordinattır, fonksiyon tanımı değil.
    // "x = 2 buçuk, y = 3", "x = 2; y = 3" ve ters sıra "y = 3, x = 2 olan nokta" da koordinat çiftidir.
    const pairValue = String.raw`(?:eksi\s+|-)?\d+(?:[.,]\d+)?(?:\s+bu[çc]uk)?`;
    const coordinatePair = !!definition && definition[1] === 'y' && (
      new RegExp(String.raw`(?<![\p{L}\p{N}])x\s*(?:=|:|eşittir|esittir)\s*${pairValue}\s*(?:,|;|\bve\b)?\s*$`, 'iu').test(source.slice(0, definitionStart))
        && new RegExp(String.raw`^${pairValue}(?:\s+\p{L}.*)?$`, 'u').test(definition[2].trim())
      || new RegExp(String.raw`^${pairValue}\s*(?:,|;|\bve\b)?\s*x\s*(?:=|:|eşittir|esittir)\s*${pairValue}\s+(?:olan|olsun|yap)\b`, 'iu').test(definition[2].trim()));
    // "y = x doğrusuna göre yansıt" bir fonksiyon tanımı değil, dönüşüm eksenidir.
    if (definition && !coordinatePair && !/\bg[öo]re\b|do[ğg]rusuna|eksenine/i.test(definition[2])) {
      this.definition = { name: definition[1].replace(/\s+/g, '').replace(/\(x\)$/, ''), body: definition[2].trim() };
      const start = definitionStart;
      source = `${source.slice(0, start)} fdef`;
    } else {
      // Değerde parantez olabilir ("a = f(2)", "k = sqrt(2)"); tamamı parantezli değer ("A = (2, 3)") noktadır.
      const assignment = source.match(/^\s*([a-zA-ZçğıöşüÇĞİÖŞÜ][a-zA-Z0-9çğıöşü_]{0,11})\s*=\s*([^=";]+?)\s*$/);
      if (assignment && !/^\(.*\)$/.test(assignment[2].trim())) {
        // "a = 2 buçuk" → "2,5"
        const value = assignment[2].replace(/\s+(?:olsun|yap|ayarla)$/i, '').replace(/(?<![\d.,])(\d+)\s+bu[çc]uk(?![\p{L}])/giu, '$1,5').trim();
        const words = fold(value).match(/[a-z]{4,}/g) ?? [];
        const mathWords = /^(?:sqrt|kok|cbrt|kupkok|asin|acos|atan|sind|cosd|tand|abs|mutlak|floor|ceil|round|exp|log)$/;
        if (value && words.every(w => mathWords.test(w))) this.assignment = { name: assignment[1], valueRaw: value };
      }
    }

    const signed = (minus: string | undefined, value: string) => { const n = parseNumber(value); return minus && n ? -n : n; };
    // Parantez içinde de "eksi" işaret, "buçuk" yarım verir: "(eksi 3, 2)", "(2 buçuk; 3 buçuk)"
    const halfValue = (minus: string | undefined, value: string, half: string | undefined) => {
      const n = Math.abs(parseNumber(value)) + (half ? 0.5 : 0);
      return (!!minus !== value.startsWith('-')) && n ? -n : n;
    };
    source = source.replace(/\(\s*(?:(eksi)\s+)?(-?\d+(?:[.,]\d+)?)(\s+bu[çc]uk)?\s*(?:;|,|\s)\s*(?:(eksi)\s+)?(-?\d+(?:[.,]\d+)?)(\s+bu[çc]uk)?\s*\)/gi, (_, mx, x, hx, my, y, hy) => {
      this.coords.push({ x: halfValue(mx, x, hx), y: halfValue(my, y, hy) });
      return ` @${this.coords.length - 1} `;
    });
    // Parantezsiz koordinat: "1 1 konumuna", "3 2 vektörüyle", "-2 ve 3 koordinatlarında", "2 3 noktasına", "eksi 3 2 vektörüyle"
    source = source.replace(/(?<![\d.,;@#$\p{L}])(?:(eksi)\s+)?(-?\d+(?:,\d+)?)\s+(?:ve\s+)?(?:(eksi)\s+)?(-?\d+(?:,\d+)?)\s+(?=(?:konum|koordinat|vekt[öo]r|noktas[ıi]na|noktas[ıi]nda)[\p{L}]*)/giu, (_, mx, x, my, y) => {
      this.coords.push({ x: signed(mx, x), y: signed(my, y) });
      return ` @${this.coords.length - 1} `;
    });
    // "eksi 3 eksi 2 kadar ötele": işaretli çift "kadar"dan önce de vektördür; işaretsiz "3 2 kadar" belirsiz kaldığı için sayı olarak kalır.
    source = source.replace(/(?<![\d.,;@#$\p{L}])(?:(eksi)\s+)?(-?\d+(?:,\d+)?)\s+(?:(eksi)\s+)?(-?\d+(?:,\d+)?)\s+(?=kadar(?![\p{L}]))/giu, (whole: string, mx: string | undefined, x: string, my: string | undefined, y: string) => {
      if (!mx && !my && !x.startsWith('-') && !y.startsWith('-')) return whole;
      this.coords.push({ x: signed(mx, x), y: signed(my, y) });
      return ` @${this.coords.length - 1} `;
    });
    const bracket = (kind: 'segment' | 'length') => (_: string, name: string, _apostrophe: string | undefined, suffix: string | undefined) => {
      this.labels.push({ text: name.replace(/[’′]/g, "'"), suffix: fold(suffix ?? ''), bracket: kind });
      return ` $${this.labels.length - 1} `;
    };
    source = source.replace(/\[\s*([A-Za-zÇĞİÖŞÜçğıöşü][A-Za-z0-9_'’′ÇĞİÖŞÜçğıöşü]{0,11})\s*\](['’])?([a-zçğıöşü]+)?/g, bracket('segment'));
    source = source.replace(/\|\s*([A-ZÇĞİÖŞÜ][A-Z0-9_'’′ÇĞİÖŞÜ]{0,11})\s*\|(['’])?([a-zçğıöşü]+)?/g, bracket('length'));
    source = source
      .replace(/(?<![\d.,])(\d+(?:,\d+){2,})(?![\d.,])/g, list => list.split(',').join(', '))
      .replace(/(\d)\s*[x×*]\s*(?=\d)/g, '$1 x ')
      .replace(/(\d)\s*°/g, '$1 derece ')
      .replace(/%\s*(\d)/g, 'yüzde $1')
      .replace(/(\d)\s*%/g, 'yüzde $1')
      .replace(/\b([23])\s*[dD](?:['’][a-zçğıöşü]+)?(?![\p{L}])/gu, '$1 boyut');

    const allCaps = !/[a-zçğıöşü]/.test(source.replace(/"\d+"|fdef/g, ''));
    const tokens = source.match(/"\d+"|@\d+|\$\d+|(?<![\p{L}\p{N}])-?\d+(?:[.,]\d+)?|[\p{L}\p{N}_'’′]+|\S/gu) ?? [];
    const out: string[] = [];
    const lowerPoints = new Map<string, string>();
    for (const p of known.points) lowerPoints.set(labelKey(p), p);
    const lowerNames = new Set(known.names.map(labelKey).filter(k => k.length <= 4 || /\d/.test(k)));
    const pushLabel = (label: LabelRef) => {
      this.labels.push(label);
      out.push(`$${this.labels.length - 1}${label.suffix}`);
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (/^\$\d+$/.test(token)) { out.push(token + this.labels[Number(token.slice(1))].suffix); continue; }
      if (/^"\d+"$|^@\d+$/.test(token)) { out.push(token); continue; }
      if (/^-?\d+(?:[.,]\d+)?$/.test(token)) {
        let value = parseNumber(token);
        // Rakamla yazılmış tam sayıdan sonra "buçuk": "2 buçuk" → 2,5; "-3 buçuk" → -3,5
        if (/^-?\d+$/.test(token) && tokens[i + 1] && fold(tokens[i + 1]) === 'bucuk') {
          value += token.startsWith('-') ? -0.5 : 0.5;
          i++;
        }
        this.numbers.push(value);
        out.push(`#${this.numbers.length - 1}`);
        continue;
      }
      if (!/[\p{L}\p{N}]/u.test(token)) { out.push(token); continue; }
      const folded = fold(token).replace(/[’′']/g, '');
      const nextWord = tokens[i + 1] ? fold(tokens[i + 1]) : '';

      // Etiketten ayrı yazılmış ek: "BC nin", "A dan"
      const previous = out[out.length - 1] ?? '';
      if (DETACHED_SUFFIXES.has(folded) && /^\$\d+$/.test(previous)) {
        const label = this.labels[Number(previous.slice(1))];
        if (label && !label.suffix) { label.suffix = folded; out[out.length - 1] = previous + folded; continue; }
      }

      // Sayı sözcükleri: "kırk beş", "iki buçuk", "yarıçapı bir"; "bir üçgen" gibi tanımlık "bir" sayı değildir.
      if (folded in NUMBER_WORDS || folded === 'yarim') {
        const isArticle = folded === 'bir' && !PARAM_BEFORE_NUMBER.test(previous) && !UNIT_AFTER_NUMBER.test(nextWord);
        if (!isArticle) {
          let value = folded === 'yarim' ? 0.5 : NUMBER_WORDS[folded];
          let j = i + 1;
          while (j < tokens.length) {
            const next = fold(tokens[j]);
            if (next === 'bucuk') { value += 0.5; j++; break; }
            if (!(next in NUMBER_WORDS)) break;
            const n = NUMBER_WORDS[next];
            if (n === 100 && value < 10) value = (value || 1) * 100;
            else if (value >= 10 && value < 100 && value % 10 === 0 && n < 10) value += n;
            else if (value >= 100 && value % 100 === 0 && n < 100) value += n;
            else break;
            j++;
          }
          i = j - 1;
          this.numbers.push(value);
          out.push(`#${this.numbers.length - 1}`);
          continue;
        }
        out.push(folded);
        continue;
      }

      // "X ekseni", "Y ekseni" etiket değildir; kısaltmalar (PDF, PNG) da.
      if (/^[XYxy]$/.test(token) && nextWord.startsWith('eksen')) { out.push(folded); continue; }
      if (ACRONYMS.has(folded.replace(/[^a-z]/g, ''))) { out.push(folded); continue; }

      // Büyük harfli etiketler: ABC, A_1, A', ABC'nin, Anın, O, DE
      const upper = !allCaps || token.length <= 3 ? token.match(LABEL_UPPER) : null;
      if (upper) {
        const suffix = fold(upper[3] ?? '');
        const stop = STOPWORDS.has(folded) || STOPWORDS.has(fold(upper[1]));
        const fullyUpper = !/[a-zçğıöşü]/.test(upper[1]) && token.replace(/['’][\p{L}]+$/u, '') === upper[1];
        const knownPoint = lowerPoints.has(labelKey(upper[1])) || decomposes(labelKey(upper[1]), lowerPoints);
        const beforeCoordinate = /^[@=]/.test(tokens[i + 1] ?? '');
        const stopAsLabel = fullyUpper && !allCaps && (knownPoint || beforeCoordinate || GEOMETRY_AFTER_LABEL.test(nextWord) || !!upper[2] || (i > 0 && upper[1].length >= 2));
        const dictionaryCaps = allCaps && isDictionaryWord(folded);
        if ((!stop || stopAsLabel) && !dictionaryCaps && (!suffix || upper[2] || SUFFIXES.has(suffix))) {
          pushLabel({ text: upper[1].replace(/[’′]/g, "'"), suffix });
          continue;
        }
      }

      // Koordinattan sonra ayrı yazılmış ek etiket değildir: "(0,0) a taşı" ("a" kaydırıcısı olsa da), "(2;3) e yansıt" (E noktası olsa da),
      // "(0,0) ı merkez alarak döndür" (I noktası olsa da). "(2,3) a noktası", "(2,3) A merkezli çember" gibi bağlamlı ad etiket kalır.
      const namedAfterCoordinate = /^(?:nokta|kose|koordinat)/.test(nextWord) || (/^merkez/.test(nextWord) && !(/^[iu]$/.test(folded) && /^merkez(?!li)/.test(nextWord)));
      if (/^@\d+$/.test(previous) && /^[aeiu]$/.test(folded) && /^[a-zçğıöşü]$/.test(token) && !namedAfterCoordinate) {
        out.push(folded);
        continue;
      }

      if (/^[a-zçğıöşü]/.test(token) && !DETACHED_SUFFIXES.has(folded)) {
        // Küçük harfle yazılmış etiketler: sahnedeki adlar, açık bağlam ("a noktası", "ab doğrusu") ya da kesme işareti ("a'nın")
        const apostrophe = token.match(/^([a-zçğıöşü](?:_?\d+)?|[a-zçğıöşü]{2,4})['’]([a-zçğıöşü]+)$/);
        const candidate = apostrophe ? apostrophe[1] : token;
        const key = labelKey(candidate);
        const foldedCandidate = fold(candidate);
        // "bak", "ben", "hangi", "kendi": sözcüğe benzeyen harf dizisi yalnızca kesmeyle ya da ayrı yazılmış ekle ("def yi sil") etiket olur.
        const suffixNext = DETACHED_SUFFIXES.has(nextWord) && !/^(?:de|da)$/.test(nextWord);
        const spelled = decomposes(key, lowerPoints, true) && (!WORD_LIKE.test(foldedCandidate) || suffixNext || !!apostrophe);
        const knownLower = lowerPoints.has(key) || spelled || lowerNames.has(key);
        // "a noktası", "ab uzunluğu", "abc üçgeni", "ab arasındaki mesafe" gibi: sahnede olmasa da etiket sayılır.
        const contextual = /^[a-zçğıöşü](?:_?\d+)?$/.test(candidate) && /^(?:nokta|kose|merkez|koordinat)/.test(nextWord)
          || /^[a-zçğıöşü]{2,4}$/.test(candidate) && /^(?:dogru(?!\s)|dogrusu|dogruyu|dogrunun|dogruya|isin|ucgen|kare|dikdortgen|cokgen|parca|kenar|yay|aci|dortgen|vektor|uzunlug|uzunluk|orta|arasi|mesafe|egim|alan|cevre|cap|yaricap)/.test(nextWord);
        // "x = 2, y = 3": eşittirden önceki küçük x/y, sahnede X ya da Y noktası olsa da eksen adıdır.
        const axisName = /^[xy]$/.test(foldedCandidate) && /^[=:]$/.test(tokens[i + 1] ?? '');
        const eligible = !axisName && (!isDictionaryWord(foldedCandidate) || (lowerPoints.has(key) && candidate.length === 1 && !STOPWORDS.has(foldedCandidate)));
        if (eligible && (knownLower || contextual || apostrophe)) {
          pushLabel({ text: lowerPoints.get(key) ?? candidate.toLocaleUpperCase('tr'), suffix: apostrophe ? fold(apostrophe[2]) : '', lowercase: true });
          continue;
        }
        // Kesme işaretsiz küçük harfli etiket + ek: "abnin", "cden"
        if (/^[a-zçğıöşü]{2,7}$/.test(token) && !isDictionaryWord(folded)) {
          let matched = false;
          for (let cut = token.length - 1; cut >= 1 && !matched; cut--) {
            const head = token.slice(0, cut), suffix = fold(token.slice(cut)), headKey = labelKey(head), headFolded = fold(head);
            if (!SUFFIXES.has(suffix) || !gluedSuffixFits(headFolded, suffix)) continue;
            // Sözlükteki baş ("aç") yalnızca ünsüzden sonra gelemeyen ekle harf dizisidir: "acnin", "acye".
            if (isDictionaryWord(headFolded) && !/^(?:nin|nun|yi|yu|ye|ya)$/.test(suffix)) continue;
            if (lowerPoints.has(headKey) || decomposes(headKey, lowerPoints, true)) {
              pushLabel({ text: lowerPoints.get(headKey) ?? head.toLocaleUpperCase('tr'), suffix, lowercase: true });
              matched = true;
            }
          }
          if (matched) continue;
        }
      }
      out.push(folded);
    }

    // Etiketleri cümledeki sıraya göre yeniden numaralandır (köşeli parantezliler önce ayrıldığı için).
    const order: number[] = [];
    for (const word of out) {
      const m = word.match(/^\$(\d+)/);
      if (m && !order.includes(Number(m[1]))) order.push(Number(m[1]));
    }
    this.labels.forEach((_, index) => { if (!order.includes(index)) order.push(index); });
    const renumber = new Map(order.map((oldIndex, newIndex) => [oldIndex, newIndex]));
    this.labels = order.map(index => this.labels[index]);
    for (let k = 0; k < out.length; k++) out[k] = out[k].replace(/^\$(\d+)/, (_, n) => `$${renumber.get(Number(n))}`);

    this.text = out.join(' ').replace(/\s+/g, ' ').trim();
    this.words = this.text.split(' ');
    const quoteless = this.text.replace(/"\d+"/g, ' ');
    this.verbs = detectVerbs(quoteless);
    // "f(x) = x^2 çizme": tanım gövdesi yer tutucuya döndüğü için sondaki olumsuz fiil gövdede de aranır.
    this.negated = isNegated(quoteless) || (!!this.definition && isNegated(fold(this.definition.body)));
    this.refersToSelection = /\bsecil(?:i|en|mis)|\bsec(?:tigim|tigin|tiklerim)/.test(quoteless);
    this.refersToLast = /\b(?:son (?:cizilen|olusturulan|eklenen|sekil)|onu|bunu|onun|bunun|onlari|bunlari|ona|buna|bu sekl|o sekl|sekli\b|seklin|sekle)/.test(quoteless);
  }

  has(re: RegExp) { return re.test(this.text); }
  match(re: RegExp) { return this.text.match(re); }
  num(ref: string) {
    const value = this.numbers[Number(ref.replace('#', ''))];
    if (value === undefined) throw new Error(`Sayı bulunamadı: ${ref}`);
    return value;
  }
  label(ref: string) {
    const value = this.labels[Number(ref.match(/\d+/)?.[0])];
    if (!value) throw new Error(`Etiket bulunamadı: ${ref}`);
    return value;
  }
  paramAfter(stem: RegExp) {
    const re = new RegExp(`\\b(?:${stem.source})([a-z]*)(?:\\s+(?:uzunlugu|uzunluklari|olcusu|olculeri|degeri|buyuklugu|miktari))?\\s*(?:=|:)?\\s*(?:olarak\\s+|ise\\s+)?(#\\d+)`, 'g');
    for (const m of this.text.matchAll(re)) if (!ADJECTIVE_SUFFIX.test(m[1])) return this.num(m[2]);
    return undefined;
  }
  paramBefore(stem: RegExp) {
    const re = new RegExp(`(#\\d+)\\s*(?:br|birim|cm|santim|derece|metre)?\\s*\\b(?:${stem.source})[a-z]*`);
    const m = this.text.match(re);
    return m ? this.num(m[1]) : undefined;
  }
  param(stem: RegExp) { return this.paramAfter(stem) ?? this.paramBefore(stem); }
  isDegrees(ref: string) { return new RegExp(`${ref}(?!\\d)\\s*derece`).test(this.text); }
  hasVerb(...kinds: VerbKind[]) { return kinds.some(k => this.verbs.has(k)); }
  hasNoun(...kinds: NounKind[]) { return kinds.some(k => NOUNS[k].test(this.text)); }
}

export function parseClause(raw: string, known: KnownNames = { points: [], names: [] }): Clause {
  return new ParsedClause(raw, known);
}

// ---------------------------------------------------------------------------
// Metni tek tek işlemlere ayırma
// ---------------------------------------------------------------------------

const MASK_OPEN = '', MASK_CLOSE = '';
const PARTICIPLE_END = /(?:an|en)$/;
const RELATIONAL = /\b(?:kesis|arasi|arasindaki|ortak|mesafe|uzaklik|birlestir|baglayan|gecen)/;
/** Cümle sonunda duran emir kipindeki fiiller: konuşmada bağlaçsız art arda gelen komutları ayırmak için. */
const FINITE_VERB = /^(?:ciz|cizin|olustur|olusturun|sil|silin|goster|hesapla|yap|ekle|koy|bul|olc|tasi|dondur|yansit|otele|boya|gizle|sec|kopyala|cogalt|yinele|bagla|birlestir|indir|cek|kaydir|buyut|kucult|uzat|getir|ac|kapat|temizle|adlandir|isimlendir|kilitle|oynat|durdur|ayarla|degistir|yaz|yakinlastir|uzaklastir|gec|doldur|batir)$/;
const AFTER_VERB_PARTICLE = /^(?:misin|misiniz|mi|musun|lutfen|hemen|bakalim|ve|sonra|ardindan|arac\w*)$/;
/** Ölçmeden sonra yalın söylenen "göster"/"yaz" ayrı bir işlem değildir: "alanını hesaplayıp göster", "alanını hesapla ve sonucu yaz". */
const MEASURE_VERB = /\b(?:hesapla|olc(?!ek|u)|bul(?!un))/;
const BARE_SHOW = /^(?:(?:bana|ekranda|tuvalde|tuvale|lutfen|sonucu|sonucunu|sonuclari) )*(?:goster(?:in|iniz|ir misin|ir misiniz|sene|sana|iver)?|yaz(?:in|iniz|ar misin|ar misiniz|sana|iver)?)(?: lutfen)?$/;
/**
 * "merkezi A noktası, yarıçapı 3 olan çember", "merkezi (1; 2) noktası, …", "merkezi A noktasında, …", "merkez A noktası, …":
 * yalnızca rol bildiren sol parça sonraki şeklin tümlecidir, ayrı şekil değil. Maskeli metinde sınanır (parantez tek sözcüktür).
 */
const ROLE_PHRASE = /^merkez(?:i|\s+noktasi)?\s+\S+(?:\s+noktas(?:i|inda))?$/;
/** "a = 1 b = 2", "a = 1 olsun b = 2 olsun" (sesli komutta bağlaçsız atamalar): sayı değerli atamadan sonra yeni bir "ad =" başlıyorsa işlem ayrılır. */
const BACK_TO_BACK_ASSIGNMENT = /(?<=(?:^|[\s,])[\p{L}][\p{L}\d_]{0,11}\s*=\s*-?\d+(?:[.,]\d+)?(?:\s+olsun)?)\s+(?=[\p{L}][\p{L}\d_]{0,11}\s*=\s*[^=\s])/u;
/** Bağlaçsız atama dizisinin her parçası yalın "ad = sayı" olmalı: "AB = 3 BC = 4 AC = 5 üçgen çiz", "r = 3 merkez = (1;2) çember çiz" tek işlemdir. */
const PURE_ASSIGNMENT = /^[\p{L}][\p{L}\d_]{0,11}\s*=\s*-?\d+(?:[.,]\d+)?(?:\s+olsun)?$/u;
/** Yüklem dağıtımında tek ad sayılan iki sözcüklü öbekler: "CD doğru parçasını çiz", "daire dilimini sil" ("üçgeninin açılarını" iki ayrı addır). */
const COMPOUND_NOUN = /^(?:dogru parca|daire dilim)/;

function foldedWords(text: string): string[] {
  return fold(text).replace(/[’'′]/g, '').split(/\s+/).filter(Boolean);
}

/** "noktasından geç", "üzerinden de geç": önceki sözcük ("da/de" atlanarak) -den ekliyse "geç" düzlem değiştirme değil, içinden geçme ilişkisidir. */
function afterAblative(wordsBefore: string[]): boolean {
  let k = wordsBefore.length - 1;
  if (/^(?:da|de)$/.test(wordsBefore[k] ?? '')) k--;
  return /(?:dan|den|tan|ten)$/.test(wordsBefore[k] ?? '');
}

/** Ölçme işleminin ardından gelen yalın "göster" mi? */
function isTrailingShow(before: string, after: string): boolean {
  return MEASURE_VERB.test(fold(before)) && BARE_SHOW.test(foldedWords(after).map(w => w.replace(/[,.;:!?]/g, '')).join(' '));
}

/** "a = 1 b = 2" → ["a = 1", "b = 2"]; "x = 2 y = 3 olan nokta" gibi koşul listeleri ve "AB = 3 BC = 4 üçgen çiz" bölünmez. */
function splitAssignments(sentence: string): string[] {
  if (/\bolan\b|\bnokta/i.test(fold(sentence))) return [sentence];
  const pieces = sentence.split(BACK_TO_BACK_ASSIGNMENT).map(s => s.trim()).filter(Boolean);
  return pieces.every(piece => PURE_ASSIGNMENT.test(piece)) ? pieces : [sentence];
}

/** Fiil, atama ya da olumsuz fiille söylenmiş görünüm ayarı ("ızgara olmasın") içeren parça kendi başına bir işlemdir. */
function isComplete(part: string): boolean {
  return detectVerbs(fold(part)).size > 0 || /=/.test(part) || SETTING_REQUEST_END.test(foldedWords(part).join(' '));
}

function hasDistributableNoun(part: string): boolean {
  const folded = fold(part);
  return Object.values(NOUNS).some(re => re.test(folded)) || /\b(?:alan|cevre|uzunlug|yaricap|egim|renk)/.test(folded);
}

function isParticiple(word: string): boolean {
  return PARTICIPLE_END.test(word) && !/(?:d|t)(?:an|en)$/.test(word) && detectVerbs(word).size === 0 && !Object.values(NOUNS).some(re => re.test(word));
}

/** "çember çiz kare çiz", "üçgen çiz alanını hesapla", "geri al geri al": bağlaçsız art arda emirleri ayırır. */
function splitBareVerbs(clause: string): string[] {
  const words = clause.split(/\s+/).filter(Boolean);
  const folded = words.map(w => fold(w).replace(/[’'′,.;:!?]/g, ''));
  // Büyük harfle yazılmış etiket fiil değildir: "AC köşegeni", "AC'ye dikme" (aç), "SEÇ" gibi tümü büyük yazımlar da.
  const isLabel = (k: number) => /^[A-ZÇĞİÖŞÜ]{2,}$/u.test(words[k].replace(/['’′].*$/u, '').replace(/[,.;:!?]/g, ''));
  // "eksenler olmasın üçgen çiz": olumsuz fiille söylenmiş görünüm ayarı da emir gibi işlemi bitirir.
  const isSettingEnd = (k: number) => /^(?:olmasin|istemiyorum|istemem)$/.test(folded[k]) && SETTING_REQUEST_END.test(folded.slice(0, k + 1).join(' '));
  const isFinite = (k: number) => (FINITE_VERB.test(folded[k]) && !isLabel(k)) || (folded[k] === 'al' && /^(?:geri|ileri)$/.test(folded[k - 1] ?? '')) || isSettingEnd(k);
  const parts: string[] = [];
  let start = 0;
  for (let k = 0; k < words.length - 1; k++) {
    if (!isFinite(k)) continue;
    // "yakınlaştır lütfen ızgarayı gizle": fiilden sonraki "lütfen" önceki emre aittir; bölme ondan sonra yapılır.
    const end = folded[k + 1] === 'lutfen' && k + 2 < words.length ? k + 1 : k;
    if (AFTER_VERB_PARTICLE.test(folded[end + 1])) continue;
    // "yakınlaştır yakınlaştır": tekrar tek işlemdir (her tekrar bir adım daha yakınlaştırır).
    if (/^(?:yakinlastir|uzaklastir)$/.test(folded[k]) && folded[end + 1] === folded[k]) continue;
    // "B noktasından geç…", "B'den de geç…" düzlem/araç değiştirme değil, "içinden geçme" ilişkisidir.
    if (folded[k] === 'gec' && afterAblative(folded.slice(0, k))) continue;
    // "alanını hesapla göster": ölçmeden sonra yalın "göster" aynı işlemdir.
    if (isTrailingShow(words.slice(start, end + 1).join(' '), words.slice(end + 1).join(' '))) continue;
    // Sonraki bölümde de kendi emir fiili olmalı; araç adları ("Alanı Bul aracını seç") bölünmez.
    let later = -1;
    for (let m = end + 1; m < words.length; m++) if (isFinite(m)) { later = m; break; }
    if (later < 0) continue;
    if (folded.slice(end + 1).some(w => /^arac/.test(w))) continue;
    parts.push(words.slice(start, end + 1).join(' '));
    start = end + 1;
  }
  parts.push(words.slice(start).join(' '));
  return parts.filter(Boolean);
}

/**
 * Birden fazla işlem içeren metni işlemlere ayırır.
 * - Kesin ayraçlar: satır sonu, ";", cümle sonu (. ! ?), "sonra", "ardından", "-ip" ulaç eki ("çizip"), "-dikten sonra".
 * - "," ve "ve": iki taraf da fiil içeriyorsa ayrılır ("üçgen çiz ve alanını göster").
 *   Soldaki parça fiilsiz bir ad öbeğiyse ve sağ taraf kendi adını taşıyorsa yüklem dağıtılır:
 *   "bir üçgen ve bir kare çiz" → "bir üçgen çiz" + "bir kare çiz"; "üçgeni ve çemberi kırmızı yap" → "üçgeni kırmızı yap" + …
 * - Bağlaçsız art arda emirler (konuşma): "çember çiz kare çiz" → iki işlem.
 *   "A ve B noktalarını birleştir", "kenarları 3, 4 ve 5 olan üçgen", "A'dan geçen ve BC'ye paralel doğru",
 *   "x = 2, y = 3 olan nokta", "2. dereceden", "Seç ve Taşı aracı", "Trig. Oranlar" bölünmez.
 * Parantez, köşeli parantez, |…| ve tırnak içindeki ayraçlar dikkate alınmaz.
 */
export function splitClauses(raw: string): string[] {
  const masks: string[] = [];
  const mask = (value: string) => { masks.push(value); return `${MASK_OPEN}${masks.length - 1}${MASK_CLOSE}`; };
  const unmask = (value: string): string => value.replace(new RegExp(`${MASK_OPEN}(\\d+)${MASK_CLOSE}`, 'g'), (_, i) => unmask(masks[Number(i)]));
  // Parametrik çift "x = 2cos(θ); y = 2sin(θ)": noktalı virgül işlem ayırıcı değil.
  let text = raw.replace(/(\bx\s*(?:\(\s*t\s*\))?\s*=[^;\n=]*(?:\bt\b|θ|\dt\b)[^;\n=]*);(\s*y\s*(?:\(\s*t\s*\))?\s*=)/giu, '$1,$2');
  text = text
    .replace(/"[^"\n]*"|“[^”\n]*”|«[^»\n]*»|‘[^’\n]*’|(?<![\p{L}\p{N}])'[^'\n]{1,120}'(?![\p{L}\p{N}])/gu, mask)
    .replace(/\([^()\n]*\)/g, mask)
    .replace(/\([^()\n]*\)/g, mask)
    .replace(/\[[^\]\n]*\]|\|[^|\n]*\|/g, mask)
    .replace(/\b(?:trig|vb|vs|örn|orn|bkz|dr|prof)\.(?=\s)/giu, mask)
    .replace(/se[cç] ve ta[sş][ıi]/giu, mask);
  // "-dikten sonra": "üçgen çizdikten sonra alanını göster" → "üçgen çiz sonra alanını göster"
  text = text.replace(/(?<![\p{L}])([\p{L}]{2,}?)(?:dikten|dıktan|dükten|duktan|tikten|tıktan|tükten|tuktan)(?=\s+sonra\b)/gu, (word, stem: string) => detectVerbs(fold(stem)).size ? stem : word);
  // "-ip" ulacı: "üçgen çizip alanını göster" → "üçgen çiz ve alanını göster" ("gösterip gizleyen düğme" hariç)
  text = text.replace(/(?<![\p{L}])([\p{L}]{2,}?)(?:ip|ıp|up|üp)(?=\s+(\S+))/gu, (word, stem: string, next: string, offset: number, whole: string) => {
    const clean = /y$/.test(stem) && detectVerbs(fold(stem.slice(0, -1))).size ? stem.slice(0, -1) : stem;
    const kinds = detectVerbs(fold(clean));
    if (!kinds.size) return word;
    // "A noktasından geçip BC'ye paralel doğru", "üzerinden de geçip": -den ile "geç" içinden geçme ilişkisidir, düzlem değiştirme değil.
    if (kinds.size === 1 && kinds.has('switch') && afterAblative(foldedWords(whole.slice(0, offset)))) return word;
    const nextWord = fold(next);
    // "gösterip gizleyen düğme": sonraki sözcük fiilden türemiş sıfat-fiilse (-(y)en/-(y)an) bölünmez.
    const verbalParticiple = /^[a-z]+(?:yan|yen|an|en)$/.test(nextWord) && !/(?:d|t)(?:an|en)$/.test(nextWord) && detectVerbs(nextWord).size > 0;
    return /^[a-z]+$/.test(nextWord) && (verbalParticiple || isParticiple(nextWord)) ? word : `${clean} ve`;
  });

  const sentences = text
    .split(/\n|(?<!\d\s?);(?!\s?-?\d)|\s+(?:ve\s+)?(?:daha\s+)?sonra\s+|\s+ardından\s+|\s+ardindan\s+|[!?](?=\s|$)|(?<!\d)\.(?=\s|$)|(?<=\d)\.(?=\s+[A-ZÇĞİÖŞÜ])/i)
    .map(s => (s ?? '').trim()).filter(Boolean);
  const clauses: string[] = [];
  for (const sentence of sentences.flatMap(splitAssignments)) {
    const pieces = sentence.split(/(\s*,\s+|(?<!\d)\s*,(?=\S)|\s+ve\s+|\s+hem\s+)/i);
    let current = pieces[0] ?? '';
    for (let i = 1; i < pieces.length; i += 2) {
      const separator = pieces[i], next = pieces[i + 1] ?? '';
      const currentWords = foldedWords(unmask(current));
      const lastWord = currentWords[currentWords.length - 1] ?? '';
      const participle = isParticiple(lastWord);
      const endsWithNoun = /^[a-z]{3,}$/.test(lastWord) && !(lastWord in NUMBER_WORDS) && lastWord !== 'bucuk';
      const rest = fold(unmask(pieces.slice(i + 1).join('')));
      // "x = 2, y = 3 olan nokta" ve parametrik "x = 3cos(t), y = 3sin(t)" tek işlemdir.
      const parametric = /\bx\s*(?:\(\s*t\s*\))?\s*=[^=]*(?:\bt\b|\dt\b|θ)/i.test(unmask(current)) && /^\s*y\s*(?:\(\s*t\s*\))?\s*=[^=]*(?:\bt\b|\dt\b|θ)/i.test(unmask(next));
      // "A noktası x=2, y=3 olsun", "A noktasını x = 2 ve y = 3 yap": nokta ya da konum anılan cümlede sayı değerli x, y çifti tek koordinattır.
      const coordinateList = /\bx\s*=\s*(?:eksi\s+)?-?\d+(?:[.,]\d+)?(?:\s+bu[çc]uk)?\s*$/i.test(unmask(current)) && /^\s*y\s*=\s*(?:eksi\s+)?-?\d/i.test(unmask(next))
        && /\b(?:nokta|konum|koordinat)/.test(`${fold(unmask(current))} ${rest}`);
      const equationList = /=/.test(current) && /=/.test(next) && /\bolan\b/.test(rest) || parametric || coordinateList;
      // "alanını hesapla ve göster": yalın "göster" ölçme işleminin parçasıdır.
      const trailingShow = isTrailingShow(unmask(current), unmask(next));
      // "merkezi A noktası, yarıçapı 3 olan çember çiz": sol parça yalnızca bir rol öbeği; yüklem dağıtılmaz.
      const rolePhrase = ROLE_PHRASE.test(foldedWords(current).join(' '));
      if (!participle && !equationList && !trailingShow && isComplete(current) && isComplete(next)) {
        clauses.push(current);
        current = next;
      } else if (!participle && !equationList && !rolePhrase && endsWithNoun && !isComplete(current) && isComplete(next)
        && hasDistributableNoun(current) && hasDistributableNoun(next) && !RELATIONAL.test(fold(next))) {
        const words = next.trim().split(/\s+/);
        const isNounWord = (w: string) => Object.values(NOUNS).some(re => re.test(fold(w)));
        const verbIndex = words.findIndex(w => detectVerbs(fold(w)).size > 0);
        let nounIndex = words.findIndex(isNounWord);
        // "CD doğru parçasını çiz", "daire dilimini sil": iki sözcüklü ad öbeği yüklemin parçası sayılmaz ("DEF üçgeninin açılarını ölç" iki ayrı addır).
        while (nounIndex >= 0 && nounIndex + 1 < verbIndex && COMPOUND_NOUN.test(fold(`${words[nounIndex]} ${words[nounIndex + 1]}`))) nounIndex++;
        const predicateStart = nounIndex >= 0 && nounIndex < verbIndex ? nounIndex + 1 : verbIndex;
        clauses.push(`${current} ${words.slice(predicateStart).join(' ')}`);
        current = next;
      } else {
        current += separator + next;
      }
    }
    clauses.push(current);
  }
  return clauses
    .flatMap(splitBareVerbs)
    .map(c => unmask(c).replace(/[\s,;]+$/, '').trim())
    .filter(Boolean);
}
