import type { ArcObject, MathObject, ObjectType, Point2D, PointObject, PolygonObject } from '@/types/math';
import {
  calculateAngleDegrees, calculateEllipseArea, calculateEllipsePerimeter, calculatePolygonArea, calculatePolygonPerimeter, getArcGeometry,
} from '../../../geometry';
import { TAU, type ArcSpec, type ResolvedArc, yayIcNoktasi } from '@/math/arcMeasure';
import {
  type Olcu, type YayUclari, VARSAYILAN_YAZIM, alan, cemberBasligi, cemberCevresi, cevre, daireAlani, dilimAlani, dilimCevresi,
  elipsAlani, elipsCevresi, kullanilabilirAd, merkezAci, olcuMetni, sayiMetni, yayOlcusu, yuvarlandiMi,
} from '@/math/matematikYazimi';
import { type Clause, type LabelRef, fold, labelKey } from '../../text';
import { type CommandScene, fail, tidy, trNum } from '../../scene';

/**
 * Ölçme ailesinin ortak yardımcıları: cümle sınıflandırma, hedef seçimi, değer hesaplama ve Türkçe biçimleme.
 */

// ---------------------------------------------------------------------------------------------------------------- metin

/**
 * Sahnede C, A, P gibi noktalar varken "çapı" sözcüğü $0i ("ÇAP" etiketi) olarak çözümlenebilir.
 * Bu küçük harfli sahte etiketleri yeniden sözcüğe çevirir. Kalan gerçek etiketler `labels` içindedir.
 */
const WORD_LABELS = new Set(['cap', 'sin', 'cos', 'tan', 'cot', 'alan', 'aci', 'boy', 'kose',
  // Konuşmadaki dolgu sözcükleri: "şey üçgenin alanı kaç" → "ŞEY üçgeni" sanılmasın.
  'sey', 'hani', 'yani', 'peki', 'evet', 'tamam', 'iste', 'hmm']);

/** Konuşma tanımanın yazdığı harf adları: "be açısı" → B, "a ile be arası" → A, B. */
const LETTER_NAMES: Record<string, string> = {
  a: 'A', be: 'B', ce: 'C', de: 'D', e: 'E', fe: 'F', ge: 'G', he: 'H', i: 'I', je: 'J', ke: 'K', ka: 'K', le: 'L', me: 'M', ne: 'N',
  o: 'O', pe: 'P', ku: 'Q', re: 'R', se: 'S', te: 'T', u: 'U', ve: 'V', ye: 'Y', ze: 'Z', iks: 'X',
};
const LETTER_KEYS = Object.keys(LETTER_NAMES).sort((a, b) => b.length - a.length);
/** Harf harf söylenmiş etiketlerin ardından gelebilen şekil adları ("a b c üçgeni"). */
const SPELLED_NOUN = /^ (?:ucgen|dortgen|kare|dikdortgen|cokgen|besgen|altigen|aci|dogru|kenar|parca|yay|isin|uzunlug|egim|kiris)/;

export interface View {
  /** Sahte etiketleri sözcüğe çevrilmiş yer tutuculu metin. */
  text: string;
  labels: LabelRef[];
}

function spell(rest: string): string[] | null {
  if (!rest) return [];
  for (const name of LETTER_KEYS) {
    if (!rest.startsWith(name)) continue;
    const tail = spell(rest.slice(name.length));
    if (tail) return [LETTER_NAMES[name], ...tail];
  }
  return null;
}

/** Sahnede karşılığı olmayan "BE", "BECE" gibi etiketleri harf adlarından çözer (yalnızca sonuç sahnede varsa). */
function respell(ref: LabelRef, scene: CommandScene): LabelRef | null {
  if (ref.bracket || scene.pointsFromLabel(ref.text) || scene.resolveLabel(ref).length) return null;
  const key = fold(ref.text);
  if (!/^[a-z]{2,8}$/.test(key)) return null;
  const letters = spell(key);
  if (!letters || letters.length === key.length) return null;
  const joined = letters.join('');
  return scene.pointsFromLabel(joined) ? { ...ref, text: joined } : null;
}

const VIEWS = new WeakMap<Clause, { withScene: boolean; view: View }>();

/**
 * Ölçme ailesinin gördüğü metin ve etiketler. Sahne verilirse konuşma kaynaklı etiketler de düzeltilir:
 * "a b c üçgeni" (ayrı harfler) tek etikete, "be açısı" B'ye çevrilir. Sonuç cümle başına saklanır.
 */
export function view(c: Clause, scene?: CommandScene): View {
  const cached = VIEWS.get(c);
  if (cached && (cached.withScene || !scene)) return cached.view;
  const drop = new Set<number>();
  const replace = new Map<number, LabelRef>();
  c.labels.forEach((l, i) => { if (l.lowercase && WORD_LABELS.has(fold(l.text))) drop.add(i); });
  let text = c.text.replace(/\$(\d+)([a-z]*)/g, (whole, i: string, suffix: string) => drop.has(Number(i)) ? `${fold(c.labels[Number(i)].text)}${suffix}` : whole);
  // "yüz ölçümü": "yüz" sayı (100) sanılır.
  text = text.replace(/#(\d+) olcum/g, (whole, i: string) => c.numbers[Number(i)] === 100 ? 'yuzolcum' : whole);
  // Ayrı yazılmış sözcükler: "yarı çapı" → yarıçapı; "birim kare", "cm kare" alan birimidir, kare şekli değil.
  text = text.replace(/\byari cap/g, 'yaricap')
    .replace(/\b(?:birim|br|cm|santim|santimetre|metre) ?kare(?:dir|ye)?\b/g, 'birimkare');
  if (scene) {
    text = text.replace(/\$\d+(?: \$\d+)+(?=[a-z ])/g, (run, offset: number, all: string) => {
      if (!SPELLED_NOUN.test(all.slice(offset + run.length))) return run;
      const ids = run.split(' ').map(t => Number(t.slice(1)));
      const refs = ids.map(i => c.labels[i]);
      if (refs.some((r, k) => !r || r.bracket || [...r.text].length !== 1 || (r.suffix && k < refs.length - 1))) return run;
      const merged = refs.map(r => r.text).join('');
      if (!scene.pointsFromLabel(merged)) return run;
      replace.set(ids[0], { text: merged, suffix: refs[refs.length - 1].suffix, lowercase: refs.some(r => r.lowercase) });
      ids.slice(1).forEach(i => drop.add(i));
      return `$${ids[0]}`;
    });
    c.labels.forEach((l, i) => {
      if (drop.has(i) || replace.has(i)) return;
      const fixed = respell(l, scene);
      if (fixed) replace.set(i, fixed);
    });
  }
  const result = { text, labels: c.labels.map((l, i) => replace.get(i) ?? l).filter((_, i) => !drop.has(i)) };
  VIEWS.set(c, { withScene: !!scene, view: result });
  return result;
}

// ---------------------------------------------------------------------------------------------------------------- niyet

export type Kind =
  | 'trig' | 'centralAngle' | 'arcLength' | 'chord' | 'radius' | 'diameter' | 'equation' | 'slope' | 'coordinates'
  | 'diagonal' | 'edges' | 'distance' | 'angle' | 'area' | 'perimeter' | 'length' | 'all';

/** Oluşturma/düzenleme cümlesi mi? ("alanı 16 olan kare çiz", "AB'nin uzunluğunu 5 yap") Öyleyse ölçme ailesi eşleşmez. */
export function isForeign(c: Clause, text: string): boolean {
  if (c.definition || c.assignment) return true;
  if (/\b(?:ciz(?!dig)|olustur(?!dug|an\b)|ekle(?!n)|koy|kur(?!al)|cek(?!il)|yerlestir|tanimla|uret|birlestir|tasi(?!yici)|kaydir(?!ici)|dondur|yansit|otele|buyut|kucult|kopyala|adlandir|boya|sec(?!il|im|enek|tig|tik)|kilitle|bagla|indir)/.test(text)) return true;
  if (/\bolacak\b|\bnasil\b|\byardim|\bsil(?!indir)/.test(text)) return true;
  // "üçgenin kenarları eşit olsun", "ABC üçgeni eşkenar olsun": şekli değiştirme isteği (çokgen ailesi).
  if (/\b(?:esit|eskenar|ikizkenar) (?:olsun|yap)\b/.test(text)) return true;
  // "üçgenin kenarı üzerinde bir nokta al": nesne üzerinde nokta oluşturma (temel aile).
  if (/\b(?:uzerinde|uzerine|ustunde|ustune)\b/.test(text) && /\bnokta/.test(text) && /\b(?:al|isaretle)\b/.test(text)) return true;
  // "alanı 16 olan kare" oluşturmadır; "A'dan B'ye olan mesafe" ise sorudur.
  if (/\bolan\b/.test(text) && !/\bolan (?:mesafe|uzaklik|uzaklig)/.test(text)) return true;
  // "alanını kırmızı yap" gibi ölçüm fiilsiz "yap" cümleleri düzenlemedir.
  if (/\byap(?!istir|i\b)/.test(text) && !EXPLICIT.test(text) && !QUESTION.test(text)) return true;
  const hasValue = c.numbers.length > 0 || c.coords.length > 0;
  if (hasValue && /\b(?:yap(?!istir)|olsun|ayarla|degistir|esitle|guncelle|getir|=)/.test(text)) return true;
  // Sayı içeren fiilsiz öbek: "3 cm uzunluğunda doğru parçası" bir oluşturma isteğidir ("60 derece mi" ise sorudur).
  if (hasValue && !c.hasVerb('measure', 'question', 'hide') && !QUESTION.test(text)) return true;
  return false;
}

export interface Intent {
  kinds: Kind[];
  hide: boolean;
  /** ölç / göster / yaz / hesapla / bul gibi açık ölçüm fiili */
  explicit: boolean;
  /** Yalnızca soru: kaç, nedir, ne kadar, ? (açık ölçüm fiili yok) */
  question: boolean;
  /** Hiç fiil yok: "ABC açısının trigonometrik oranları" */
  bare: boolean;
  /** ölç veya göster (yeni ölçüm nesnesi oluşturmaya izin veren fiiller) */
  showOrMeasure: boolean;
  all: boolean;
  /** Ölçü adı yok ama "ölç" fiili var ("AB'yi ölç", "ABC üçgenini ölç"): ölçü, hedefin türünden çıkarılır. */
  inferred: boolean;
}

const HIDE = /\b(?:gizle|sakla|kapat|gorunmesin|gorunmez|kaldir)/;
const EXPLICIT = /\b(?:olc(?!ek|u)|goster|yaz(?:\b|in\b|ar|sana|dir|abil|iver)|hesapla|bul(?!un)|belirt|isaretle|gorunur)/;
export const QUESTION = /\bkac\b|\bkactir|\bkacdir|\bnedir\b|\bne kadar|\?|\bsoyle|\bogren|\bnerede|\bhangi|\bmidir\b|\bmudur\b|\bmi\b|\bmu\b|\bne(?: olur| acaba)?$/;
/** Evet/hayır sorusu: "ABC açısı 60 derece mi", "AB 5 birim mi" */
export const YES_NO = /\b(?:mi|mu|midir|mudur)\b/;
/** Birim sorusu: "AB kaç birim", "AB kaç cm" (uzunluk); "kaç birim kare" (alan) */
const LENGTH_UNIT = /(?:\bkac|#\d+) (?:birim|br|cm|santim|santimetre|metre)\b(?! ?kare)/;
const AREA_UNIT = /(?:\bkac|#\d+) (?:birim ?kare|br2|cm2|santimetre ?kare|metre ?kare)\b/;
export { EXPLICIT };
/** Doğrunun x ekseniyle yaptığı açı eğimden hesaplanır. */
export const SLOPE_ANGLE = /\begim aci|\bx ekseni\w*\b.*\baci/;

export function intent(c: Clause, text: string): Intent {
  const kinds: Kind[] = [];
  const add = (k: Kind, ok: boolean) => { if (ok && !kinds.includes(k)) kinds.push(k); };
  add('trig', /\btrigonometri|\b(?:sin|cos|tan|cot)\b|\bsinus|\bkosinus|\btanjant|\bkotanjant/.test(text));
  add('centralAngle', /\bmerkez aci/.test(text));
  add('arcLength', /\byay(?:i|in|inin)? uzunlu/.test(text));
  add('chord', /\bkiris/.test(text));
  add('radius', /\byaricap/.test(text));
  add('diameter', /\bcap(?:i|ini|inin|lari|larini)?\b/.test(text));
  add('equation', /\bdenklem/.test(text));
  add('slope', /\begim/.test(text) || SLOPE_ANGLE.test(text));
  add('coordinates', /\bkoordinat|\bnerede\b|\bkonumu|\ba[bp]sis|\bordinat/.test(text));
  add('diagonal', /\bkosegen/.test(text));
  add('edges', /\bkenar(?:lar|u|i|in|ini|inin|ina|lari|larin|larini|larinin)?\b|\bhipotenus/.test(text) && !/\bkenar sayi/.test(text));
  add('distance', /\bmesafe|\buzaklig|\buzaklik|\barasi(?:ndaki|nin|ni|n)?\b/.test(text));
  add('angle', /\baci(?:si|sini|sinin|nin|yi|ya|lar|lari|larini|larinin|sidir)?\b|∠|\bderece(?:dir)?\b|\bkac derece|\bkac radyan/.test(text) && !/\bmerkez aci/.test(text));
  add('area', /\balan(?:i|ini|inin|lari|larini|larinin)?\b|\byuzolcum/.test(text) || AREA_UNIT.test(text));
  // "çevreleri" ölçüdür; "çevrel çember" değildir.
  add('perimeter', /\bcevre(?!l(?![ae]r))|\betrafinin (?:toplam|uzunlug)/.test(text));
  add('length', /\buzunlug|\buzunluk|\bboy(?:u|unu|lari|larini)\b/.test(text) || LENGTH_UNIT.test(text) || c.labels.some(l => l.bracket === 'length'));
  add('all', /\bolcu(?:ler|leri|lerini|su|sunu|m|mler|mleri|mlerini|lerin)?\b|\bdegerler(?:i|ini)\b/.test(text));
  const hide = HIDE.test(text);
  const explicit = EXPLICIT.test(text);
  const question = !explicit && QUESTION.test(text);
  const inferred = !kinds.length && !hide && /\bolc(?!ek|u)/.test(text);
  if (inferred) kinds.push('all');
  return {
    kinds, hide, explicit, question, bare: !hide && !explicit && !question, inferred,
    showOrMeasure: /\b(?:olc(?!ek|u)|goster|gorunur)/.test(text),
    all: /\b(?:tum|butun|hepsi|hepsini|tamamini)\b/.test(text),
  };
}

// ---------------------------------------------------------------------------------------------------------------- biçim

/** 12,57 · yuvarlanmışsa "≈ 12,57" */
export function fmt(value: number, digits = 2): string {
  const t = tidy(value);
  const rounded = Number(t.toFixed(digits));
  return `${Math.abs(t - rounded) > 1e-9 ? '≈ ' : ''}${trNum(t, digits)}`;
}
export const br = (v: number) => `${fmt(v)} br`;
export const br2 = (v: number) => `${fmt(v)} br²`;
export const deg = (v: number) => `${fmt(v)}°`;
export const coord = (p: Point2D) => `(${trNum(p.x)}; ${trNum(p.y)})`;

// ---------------------------------------------------------------------------------------------------------------- yazım

/**
 * MEB yazımı (src/math/matematikYazimi.ts): yanıtlar |AB| = 5 br, m(∠ABC) = 60°, A(ABC) = 12 br²,
 * Ç(ABC) = 24 br, r = |OA| = 3 br, |A͡B| ≈ 7,12 br biçiminde yazılır. Motor yanıtları HER ZAMAN tam
 * yazımı kullanır (Kısa yazım yalnızca tuval etiketlerinindir).
 */
export const yaz = (o: Olcu, cumleIci = false) => olcuMetni(o, VARSAYILAN_YAZIM, { cumleIci });
/** Ölçü nokta adlarıyla yazılabiliyor mu? Yazılamıyorsa yanıt "alan = …" gibi sözcüğe düşer. */
export const adli = (o: Olcu) => !!o.adlar && o.adlar.length > 0;
/** "= 3 br" / "≈ 3,33 br": yuvarlanan değer yalnızca '≈' alır, "= ≈" hiçbir yerde yazılmaz. */
export const esit = (v: number, basamak = 2) => `${yuvarlandiMi(v, basamak) ? '≈' : '='} ${sayiMetni(v, basamak)}`;
export const esitBr = (v: number) => `${esit(v)} br`;
export const esitDeg = (v: number) => `${esit(v)}°`;

/** Çember başlığı "Ç(M, r)" — merkezi adlı çemberlerde; üç noktadan geçen çemberde null. */
export function cemberAdi(scene: CommandScene, o: MathObject): string | null {
  if (o.type !== 'circle') return null;
  const id = scene.circleOf(o)?.centerId;
  const c = id ? scene.get(id) : undefined;
  return c && c.type === 'point' ? cemberBasligi(c)?.duz ?? null : null;
}

/** Şeklin alan ölçüsü: çokgen köşeleriyle A(ABC), daire dilimi A(AOB dilimi), çember/elips sözcükle. */
export function alanOlcusu(scene: CommandScene, o: MathObject): Olcu {
  const v = areaOf(scene, o)!;
  switch (o.type) {
    case 'polygon': return alan(scene.vertices(o), v);
    case 'ellipse': return elipsAlani(v);
    case 'sector': return dilimAlani(scene.point(o.startPointId), scene.point(o.centerPointId), scene.point(o.directionPointId), v);
    default: return daireAlani(v);
  }
}

/** Şeklin çevre ölçüsü: Ç(ABC), Ç(AOB dilimi), çemberde "Çevre = 2πr", elipste "Çevre ≈ …". */
export function cevreOlcusu(scene: CommandScene, o: MathObject): Olcu {
  const v = perimeterOf(scene, o)!;
  switch (o.type) {
    case 'polygon': return cevre(scene.vertices(o), v);
    case 'ellipse': return elipsCevresi(v);
    case 'sector': return dilimCevresi(scene.point(o.startPointId), scene.point(o.centerPointId), scene.point(o.directionPointId), v);
    default: return cemberCevresi(v);
  }
}

/** Yayın ölçüleri: 180°'den büyük / tam 180° sınırı (ekranda 0,1° duyarlılıkla yazıldığı için kaba tutulur). */
const YAY_EPS = 1e-4;
const yayUstunde = (g: { center: Point2D; radius: number }, p: Point2D) =>
  Math.abs(distance(g.center, p) - g.radius) <= 1e-6 * Math.max(1, g.radius);
const yayAcisi = (merkez: Point2D, bas: number, p: Point2D) =>
  ((Math.atan2(p.y - merkez.y, p.x - merkez.x) - bas) % TAU + TAU) % TAU;

/** Yayın ÜZERİNDE, uçlar dışında, ortasına en yakın nokta: büyük yayı ve yarım çemberi üç harfle adlandırır. */
function yayAraNoktasi(scene: CommandScene, o: ArcObject, g: { center: Point2D; radius: number; startAngle: number; sweep: number }): PointObject | undefined {
  let best: { p: PointObject; d: number } | undefined;
  for (const p of scene.points()) {
    if (p.id === o.startPointId || p.id === o.centerPointId || p.id === o.directionPointId) continue;
    // Ad kurulamayan (gizli ya da adsız) nokta yayı adlandıramaz; aranan tek şey üçüncü harftir.
    if (p.visible === false || !kullanilabilirAd(p)) continue;
    if (!yayUstunde(g, p)) continue;
    const u = yayAcisi(g.center, g.startAngle, p);
    if (!(u > 1e-6 && u < g.sweep - 1e-6)) continue;
    const d = Math.abs(u - g.sweep / 2);
    if (!best || d < best.d) best = { p, d };
  }
  return best?.p;
}

/**
 * Yay / daire diliminin uçları. Yön noktası yayın ÜZERİNDE değilse (yalnızca yönü veriyorsa) son uç
 * adlandırmada kullanılmaz: "|A͡B|" yerine "Yay uzunluğu ≈ …" yazılır.
 */
export function yayUclariOf(scene: CommandScene, o: MathObject): YayUclari {
  const g = arcGeometry(scene, o);
  const shape = o as ArcObject;
  const yon = scene.point(shape.directionPointId);
  const buyuk = g.sweep > Math.PI + YAY_EPS;
  const yarim = Math.abs(g.sweep - Math.PI) <= YAY_EPS;
  return {
    bas: scene.point(shape.startPointId),
    son: yayUstunde(g, yon) ? yon : null,
    ara: buyuk || yarim ? yayAraNoktasi(scene, shape, g) : undefined,
    buyuk,
    yarim,
  };
}

/** Yay ya da daire diliminin merkez açısı: ucu yayın üzerinde olan yayda m(A͡B), yoksa m(∠AOB). */
export function merkezAciOlcusu(scene: CommandScene, o: MathObject, derece: number): Olcu {
  const uclar = yayUclariOf(scene, o);
  if (o.type === 'arc' && uclar.son) return yayOlcusu(uclar, derece);
  const shape = o as ArcObject;
  return merkezAci(scene.point(shape.startPointId), scene.point(shape.centerPointId), scene.point(shape.directionPointId), derece);
}

/** İki nokta arasındaki yay ölçümünün uçları — adlar arcMeasure'ın (resolveArc + yayIcNoktasi) kuralıyla. */
export function yayOlcumUclari(spec: ArcSpec, scene: CommandScene, r: ResolvedArc): YayUclari {
  const nokta = (id?: string) => { const p = id ? scene.get(id) : undefined; return p && p.type === 'point' ? p : null; };
  const T = nokta(spec.throughPointId);
  const u = T ? yayAcisi(r.center, r.startAngle, T) : -1;
  const icte = T && u > 1e-7 && u < r.sweep - 1e-7 ? T : undefined;
  return {
    bas: nokta(spec.pointIds[0]),
    son: nokta(spec.pointIds[1]),
    ara: r.major || r.half ? icte ?? yayIcNoktasi(spec, scene.objects, r) : undefined,
    buyuk: r.major,
    yarim: r.half,
  };
}

export function typeNoun(o: MathObject): string {
  switch (o.type) {
    case 'polygon': return o.pointIds.length === 3 ? 'üçgen' : o.pointIds.length === 4 ? 'dörtgen' : 'çokgen';
    case 'circle': return 'çember';
    case 'ellipse': return 'elips';
    case 'arc': return 'yay';
    case 'sector': return 'daire dilimi';
    case 'segment': return 'doğru parçası';
    case 'line': return 'doğru';
    case 'ray': return 'ışın';
    case 'angle': return 'açı';
    case 'point': return 'nokta';
    default: return 'nesne';
  }
}
/** Mesajlarda nesne adı: "ABC", "A Çemberi (r = 2)", "[AB]" */
export const nameOf = (o: MathObject) => o.label || typeNoun(o);

// ---------------------------------------------------------------------------------------------------------------- hedef

type Filter = (o: MathObject) => boolean;

/** Cümledeki şekil adına göre tür süzgeci ("üçgenin" → 3 köşeli çokgen). Yoksa null. */
export function nounFilter(text: string): { types: ObjectType[]; noun: string; filter?: Filter } | null {
  const sides = (n: number): Filter => o => o.type === 'polygon' && o.pointIds.length === n;
  if (/\bucgen/.test(text)) return { types: ['polygon'], noun: 'üçgen', filter: sides(3) };
  if (/\b(?:kare(?!li|kok)|dikdortgen|dortgen|paralelkenar|yamuk|deltoid|eskenar dortgen)/.test(text)) return { types: ['polygon'], noun: 'dörtgen', filter: sides(4) };
  const gon: [RegExp, number][] = [[/\bbesgen/, 5], [/\baltigen/, 6], [/\byedigen/, 7], [/\bsekizgen/, 8], [/\bdokuzgen/, 9], [/\bongen/, 10]];
  for (const [re, n] of gon) if (re.test(text)) return { types: ['polygon'], noun: 'çokgen', filter: sides(n) };
  if (/\bcokgen/.test(text)) return { types: ['polygon'], noun: 'çokgen' };
  if (/\bdaire dilim|\bdilim/.test(text)) return { types: ['sector'], noun: 'daire dilimi' };
  if (/\bcember|\bdaire/.test(text)) return { types: ['circle'], noun: 'çember' };
  if (/\belips/.test(text)) return { types: ['ellipse'], noun: 'elips' };
  if (/\bdogru parca|\bparcasi|\bparcanin|\bparcasinin/.test(text)) return { types: ['segment'], noun: 'doğru parçası' };
  if (/\bisin(?:i|in|ini|inin)?\b/.test(text)) return { types: ['ray'], noun: 'ışın' };
  if (/\bdogru(?:su|sunu|sunun|nun|yu)?\b/.test(text)) return { types: ['line'], noun: 'doğru' };
  if (/\byay(?:i|in|ini|inin)?\b/.test(text)) return { types: ['arc'], noun: 'yay' };
  return null;
}

/** Çoğul ya da "tüm" ile birden çok hedef isteniyor mu? ("üçgenlerin alanlarını", "tüm çemberlerin") */
export function wantsMany(text: string, labels: LabelRef[]): boolean {
  if (labels.length > 1) return true;
  if (/\b(?:tum|butun)\b/.test(text) && !labels.length) return true;
  if (/\b(?:ucgen|kare|dikdortgen|cokgen|cember|daire|elips|yay|dilim|dogru|isin|sekil|parca)(?:ler|lar)/.test(text)) return true;
  // "iki üçgenin alanlarını", "her iki çemberin"
  if (/(?:#\d+|\bher iki) (?:ucgen|kare|dikdortgen|cokgen|cember|daire|elips|yay|dilim|dogru|isin|sekil|parca)/.test(text)) return true;
  // Çoğul iyelikli ölçü adı, adsız hedefle: "(seçili parçaların) uzunluklarını ölç", "alanlarını göster".
  // "kenar uzunlukları" tek şeklin kenarlarıdır; çoğulluk şekilden gelmez.
  return !labels.length && /\b(?:alanlar|cevreler|yaricaplar|caplar|egimler|denklemler|uzunluklar)/.test(text) && !/\bkenar(?:larinin)? uzunluklar/.test(text);
}

export interface PickOptions {
  types: ObjectType[];
  noun: string;
  filter?: Filter;
  many?: boolean;
  labels?: LabelRef[];
}

/**
 * Ölçülecek nesneler. Cümlede ad varsa YALNIZCA adlardan çözülür (bulunamazsa açıklamalı hata);
 * yoksa odak → seçim → sahnedeki tek aday (scene.targets kuralları).
 */
export function pick(c: Clause, scene: CommandScene, o: PickOptions): MathObject[] {
  const labels = o.labels ?? view(c).labels;
  const ok = (x: MathObject) => o.types.includes(x.type) && (!o.filter || o.filter(x));
  if (labels.length) {
    const found: MathObject[] = [];
    const missing: string[] = [];
    for (const ref of labels) {
      const matches = scene.resolveLabel(ref, o.types).filter(ok);
      if (matches.length) found.push(...matches);
      else missing.push(ref.text);
    }
    const unique = [...new Set(found)];
    if (!unique.length) fail(`${missing.join(', ')} adlı bir ${o.noun} bulunamadı. Adı kontrol edin ya da şekli seçip yeniden yazın.`);
    if (!o.many && unique.length > 1) fail(`Birden fazla ${o.noun} eşleşti (${unique.map(nameOf).join(', ')}). Hangisi olduğunu tam adıyla yazın.`);
    return unique;
  }
  return scene.targets(c, { types: o.types, noun: o.noun, filter: o.filter, many: o.many, useLabels: false });
}

// ---------------------------------------------------------------------------------------------------------------- geometri

export const P = (p: PointObject): Point2D => ({ x: p.x, y: p.y });

export function signedArea(points: Point2D[]): number {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

/** Çokgenin i. köşesindeki iç açı: [önceki, köşe, sonraki] ve çokgen yönüne göre reflex (eski motorla aynı kural). */
export function corner(scene: CommandScene, polygon: PolygonObject, index: number): { ids: [string, string, string]; reflex: boolean; degrees: number } {
  const n = polygon.pointIds.length;
  const ids: [string, string, string] = [polygon.pointIds[(index - 1 + n) % n], polygon.pointIds[index], polygon.pointIds[(index + 1) % n]];
  const [first, v, last] = ids.map(id => scene.point(id));
  const cross = (first.x - v.x) * (last.y - v.y) - (first.y - v.y) * (last.x - v.x);
  const reflex = signedArea(scene.vertices(polygon).map(P)) * cross > 0;
  const inner = calculateAngleDegrees(first, v, last);
  return { ids, reflex, degrees: reflex ? 360 - inner : inner };
}

export function areaOf(scene: CommandScene, o: MathObject): number | null {
  switch (o.type) {
    case 'polygon': return calculatePolygonArea(scene.vertices(o).map(P));
    case 'circle': { const g = scene.circleOf(o)!; return Math.PI * g.radius * g.radius; }
    case 'ellipse': return calculateEllipseArea(o.radiusX, o.radiusY);
    case 'sector': { const g = arcGeometry(scene, o); return g.radius * g.radius * g.sweep / 2; }
    default: return null;
  }
}

export function perimeterOf(scene: CommandScene, o: MathObject): number | null {
  switch (o.type) {
    case 'polygon': return calculatePolygonPerimeter(scene.vertices(o).map(P));
    case 'circle': { const g = scene.circleOf(o)!; return 2 * Math.PI * g.radius; }
    case 'ellipse': return calculateEllipsePerimeter(o.radiusX, o.radiusY);
    case 'sector': { const g = arcGeometry(scene, o); return g.radius * g.sweep + 2 * g.radius; }
    default: return null;
  }
}

export function arcGeometry(scene: CommandScene, o: MathObject): { radius: number; sweep: number; center: Point2D; startAngle: number } {
  if (o.type !== 'arc' && o.type !== 'sector') fail('Bu ölçü yalnızca yay ve daire dilimi için hesaplanır.');
  const c = scene.point(o.centerPointId);
  const g = getArcGeometry(c, scene.point(o.startPointId), scene.point(o.directionPointId));
  if (!g) fail(`${nameOf(o)} için yarıçap sıfır; merkez ve başlangıç noktası farklı olmalı.`);
  return { radius: g.radius, sweep: g.sweep, center: P(c), startAngle: g.startAngle };
}

export const distance = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);

export function sameKey(a: string, b: string) { return labelKey(a) === labelKey(b); }

/** Yalnızca değişen alanları yazar (gereksiz geçmiş adımı oluşmasın). Değişiklik olduysa true. */
export function setFlags(scene: CommandScene, o: MathObject, patch: Record<string, unknown>): boolean {
  const current = (scene.get(o.id) ?? o) as unknown as Record<string, unknown>;
  const changed = Object.entries(patch).some(([key, value]) => JSON.stringify(current[key]) !== JSON.stringify(value));
  if (changed) scene.update(o.id, patch);
  return changed;
}

/** Etiket tek bir noktayı mı gösteriyor? */
export function onlyPoint(scene: CommandScene, ref: LabelRef): PointObject | undefined {
  const pts = scene.pointsFromLabel(ref.text);
  return pts?.length === 1 ? pts[0] : undefined;
}

/** Çokgende a–b kenarının dizini (yoksa -1). */
export function edgeIndex(polygon: PolygonObject, a: string, b: string): number {
  const n = polygon.pointIds.length;
  for (let i = 0; i < n; i++) {
    const p = polygon.pointIds[i], q = polygon.pointIds[(i + 1) % n];
    if ((p === a && q === b) || (p === b && q === a)) return i;
  }
  return -1;
}
