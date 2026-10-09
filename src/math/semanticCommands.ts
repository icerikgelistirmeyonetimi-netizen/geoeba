import type { MathObject, PointObject } from '@/types/math';
import { type Clause, type LabelRef, STOPWORDS, fold, labelKey, normalizeCommand, parseClause } from './commands/text';

export type SemanticMatch = { intent: string; score: number };
export type SemanticInterpretation = { command?: string; clarification?: string };

/**
 * Anlam modelinin karıştırdığı işlemleri ayırt eden terimler. İLK eşleşen desen kazanır: özel ifadeler (orta dikme,
 * çevrel çember, açıortay…) genel olanlardan (dik, çevre, açı…) önce gelmelidir. Eşleşen niyet +0,25 alır, desen
 * eşleştiğinde diğer tüm niyetler −0,15 alır; bu yüzden intents.json'daki her niyetin burada bir deseni olmalıdır.
 */
export const SEMANTIC_ANCHORS: [RegExp, string][] = [
  // Teoremler ve klasik şekiller: adlı kalıplar genel sözcüklerden (teğet, çember, açı, orta…) önce gelir.
  [/oklid|oklit|euclid|euklid/, 'oklid'],
  [/pisagor|pitagor|pythagor|kenarlar\w* uzerine kare/, 'pisagor'],
  [/tales|thales|temel oranti|capi goren cevre aci/, 'tales'],
  [/orta ?taban/, 'orta_taban'],
  [/dokuz nokta|9 nokta|feuerbach|euler cember/, 'dokuz_nokta'],
  [/euler|oyler/, 'euler'],
  [/dis ?te[gy]et cember|dis ?te[gy]et(?:i|in|leri)? (?:ciz|olustur|bul)|uc dis ?te[gy]et/, 'dis_teget'],
  [/ortak te[gy]et/, 'ortak_teget'],
  [/te[gy]et[- ]?kiris|te[gy]et ile .*kiris\w* arasindaki/, 'teget_kiris'],
  [/\bkesen(?:ler)?(?:i|in|ini)? (?:teorem|ciz|olustur)|cember\w* (?:bir |iki |uc )?kesen|kiris(?:ler)? teorem|te[gy]et[- ]kesen|iki kesen/, 'kesen'],
  [/kuvvet/, 'kuvvet'],
  [/cevre aci/, 'cevre_aci'],
  [/kiris|cember\w* cap(?:i|ini)\b(?! olan)|\bcap(?:i|ini) ciz/, 'kiris'],
  [/aciortay (?:teorem|baginti|uzunlug)|kenarortay (?:teorem|baginti|uzunlug)|stewart|stuart|\bceva|menela|sinus (?:teorem|baginti|kural)|kosinus (?:teorem|baginti|kural)|heron|ucgen esitsizli|cizilebilir mi|ucgen (?:olur|olusturur) mu|ucgen var mi|aci[- ]kenar (?:iliski|baginti)|buyuk aci\w* karsisinda/, 'ucgen_teoremi'],
  [/^(?!.*(?:kenar|uzunluk|bagla)).*(?:kaydirici|surgu|parametre).*(?:olustur|ekle|koy|tanimla|yap|iste|lazim)/, 'slider'],
  [/kaydirici|surgu|surguler|kaydirarak|surukle.*(?:kenar|uzunluk)|(?:kenar|uzunluk).*surukle/, 'bind'],
  [/geri al|geri don|onceki adima|son yaptigim|yinele|ileri al|vazgec/, 'undo'],
  [/yakinlas|uzaklas|sigdir|ekrani (?:buyut|kucult)|gorunumu (?:buyut|kucult|sifirla)|\bzoom/, 'zoom'],
  [/izgara|kareli (?:arka|zemin|defter)|koordinat cizgi/, 'grid'],
  [/orta ?dikme|dik ?ortay|esit uzak|ortasindan dik/, 'perp_bisector'],
  [/aci ?ortay|aciyi (?:iki|ikiye|esit)/, 'angle_bisector'],
  [/kenar ?ortay|kose\w* .*orta noktas\w* (?:birlestir|baglayan)/, 'median'],
  [/cevrel|kose\w* (?:gecen|dokunan)(?: dis)? (?:cember|daire)|dis cember/, 'circumcircle'],
  [/ic ?teget|icten teget|icine (?:sigan|cizilen)/, 'incircle'],
  [/yukseklik|dikme|dik indir|tabana.*dik|karsi kenara.*dik/, 'altitude'],
  [/paralel|kosut/, 'parallel'],
  [/\bdik (?:dogru|cizgi|olan)|dogru\w* dik\b|kenar\w* dik\b|parca\w* dik\b|(?:doksan|90) derece.*(?:dogru|kes)/, 'perpendicular'],
  [/kesis|ortak nokta/, 'intersection'],
  [/teget|teyet|(?:tek|bir) noktada (?:dokun|deg)/, 'tangent'],
  [/yansi|simetri|aynala|ayna/, 'reflect'],
  [/dondur|cevir/, 'rotate'],
  [/otele|vektor/, 'translate'],
  [/^(?!.*(?:yazi|nokta(?:lari)? |cizgi|ekran|gorunum|etiket)).*(?:homotet|olcekle|buyut|kucult|yari boyut)/, 'dilate'],
  [/\btasi(?:yin|yalim|n)?\b|\bkaydir(?!ici)|yerini degistir|konumuna/, 'move'],
  [/yok et|sile(?:lim|bilir)|silin|ortadan kaldir/, 'delete'],
  [/gizle|sakla|gorunmez|gorunmesin/, 'hide'],
  [/boya|renk|rengi/, 'color'],
  [/adlandir|isimlendir|adini|ismini|\badi\b|\bismi\b/, 'rename'],
  [/fonksiyon|grafi[gk]|parabol|sinus|kosinus/, 'function'],
  [/kesir|bolu|payda/, 'fraction'],
  [/\byazi|\bmetin|\bnot\b|baslik/, 'text'],
  [/duzgun|besgen|altigen|yedigen|sekizgen|dokuzgen|\bongen|onikigen/, 'regular_polygon'],
  [/elips|oval/, 'ellipse'],
  [/dilim/, 'sector'],
  [/aci(?:si|sini|yi|nin)?\b|kose.*derece|kac derece/, 'angle'],
  [/cevre|etraf|kenar.*toplam|dis sinir/, 'perimeter'],
  [/alan|yuzolcum|birim kare|kapla/, 'area'],
  [/orta(?:si|sina|sini| nokta)|tam orta/, 'midpoint'],
  [/birlestir|dogru parcasi|sonlu.*cizgi/, 'segment'],
  [/isin|tek yon|bir yon/, 'ray'],
  [/sonsuz.*dogru|dogru.*sonsuz/, 'line'],
  [/kenar\w* (?:uzunluk\w* )?(?:olc|goster|yaz|kac|hesapla|bul)|(?:her|uc|tum|butun) kenar\w* (?:ayri|uzunluk|olc)/, 'lengths'],
  [/\byay(?:i|in|ini)?\b|kavis/, 'arc'],
  [/yaricap|capi|cember|yuvarlak/, 'circle'],
  [/dikdortgen/, 'rectangle'],
  [/\bkare(?!li)/, 'square'],
  [/cokgen|\bdortgen|kose(?:li|si olan)/, 'polygon'],
  [/ucgen/, 'triangle'],
  [/nokta/, 'point'],
];

/** Metinde ilk eşleşen ayırt edici terimin niyeti. */
export function anchorIntent(raw: string): string | undefined {
  const text = normalizeCommand(raw);
  return SEMANTIC_ANCHORS.find(([pattern]) => pattern.test(text))?.[1];
}

/** Vektör benzerliğini ayırt edici geometri terimleriyle yeniden sırala. */
export function rankSemanticMatches(raw: string, matches: SemanticMatch[]): SemanticMatch[] {
  if (!canSearchMeaning(raw)) return [];
  const intent = anchorIntent(raw);
  const ranked = matches.filter(m => Number.isFinite(m.score)).map(m => ({
    ...m, score: m.score + (intent === m.intent ? 0.25 : intent ? -0.15 : 0),
  })).sort((a, b) => b.score - a.score);
  return ranked.filter(m => m.score >= 0.6 && m.score >= (ranked[0]?.score ?? 1) - 0.06).slice(0, 3);
}

export function canSearchMeaning(raw: string): boolean {
  const text = normalizeCommand(raw);
  return text.length >= 4 && text.length <= 500 && !/[=\n]/.test(raw)
    && !/\b(cizme|cizmeyin|olusturma|yapma|baglama|silme|istemiyorum|degil|iptal|kaldir|sil|ayir|coz)\b/.test(text);
}

// ------------------------------------------------------------------------------------------- Türkçe ekler

/** Harfin okunuşundaki son ünlü ("B" → be → e). Harfle bitmeyen adlarda null. */
function letterSound(label: string): { vowel: string; consonant: boolean } | null {
  const last = label.slice(-1);
  if (!/\p{L}/u.test(last)) return null;
  const lower = last.toLocaleLowerCase('tr');
  if (lower === 'x') return { vowel: 'i', consonant: true };
  if (lower === 'q') return { vowel: 'ü', consonant: false };
  if (lower === 'w') return { vowel: 'u', consonant: false };
  return { vowel: 'aıioöuü'.includes(lower) ? lower : 'e', consonant: false };
}
const narrow = (v: string) => ('aı'.includes(v) ? 'ı' : 'ei'.includes(v) ? 'i' : 'ou'.includes(v) ? 'u' : 'ü');
const wide = (v: string) => ('aıou'.includes(v) ? 'a' : 'e');

/** "ABC" + belirtme → "ABC'yi"; "A" + yönelme → "A'ya"; "O" + ilgi → "O'nun". Harfle bitmeyen adlarda `fallback` eklenir. */
export function inflectLabel(label: string, kind: 'acc' | 'dat' | 'gen' | 'abl', fallback: string): string {
  const sound = letterSound(label);
  if (!sound) return `${label} ${fallback}`;
  const { vowel, consonant } = sound;
  const suffix = kind === 'acc' ? (consonant ? '' : 'y') + narrow(vowel)
    : kind === 'dat' ? (consonant ? '' : 'y') + wide(vowel)
    : kind === 'gen' ? (consonant ? '' : 'n') + narrow(vowel) + 'n'
    : (consonant ? 't' : 'd') + wide(vowel) + 'n';
  return `${label}'${suffix}`;
}

const fmt = (n: number) => String(Number(n.toFixed(6))).replace('.', ',');

const COLOR_NAMES: [string, string][] = [
  ['acik mavi', 'açık mavi'], ['kahverengi', 'kahverengi'], ['lacivert', 'lacivert'], ['turkuaz', 'turkuaz'], ['kirmizi', 'kırmızı'],
  ['turuncu', 'turuncu'], ['yesil', 'yeşil'], ['siyah', 'siyah'], ['beyaz', 'beyaz'], ['pembe', 'pembe'], ['mavi', 'mavi'], ['sari', 'sarı'],
  ['mor', 'mor'], ['gri', 'gri'],
];
const POLYGON_NAMES: [RegExp, number][] = [
  [/onikigen/, 12], [/\bongen/, 10], [/dokuzgen/, 9], [/sekizgen/, 8], [/yedigen/, 7], [/altigen/, 6], [/besgen/, 5],
];
const DIRECTIONS: Record<string, string> = { saga: 'sağa', sola: 'sola', yukari: 'yukarı', asagi: 'aşağı' };

// ------------------------------------------------------------------------------------------- sahne çözümü

type Ref = { ref: LabelRef; index: number; points: PointObject[]; objects: MathObject[] };

function pointsOf(label: string, points: PointObject[]): PointObject[] | null {
  const sorted = [...points].sort((a, b) => labelKey(b.label).length - labelKey(a.label).length);
  const walk = (rest: string): PointObject[] | null => {
    if (!rest) return [];
    for (const p of sorted) {
      const key = labelKey(p.label);
      if (key && rest.startsWith(key)) {
        const tail = walk(rest.slice(key.length));
        if (tail) return [p, ...tail];
      }
    }
    return null;
  };
  const found = walk(labelKey(label));
  return found && found.length ? found : null;
}

class SceneReader {
  readonly points: PointObject[];
  readonly byId: Map<string, MathObject>;
  readonly clause: Clause | null;
  readonly refs: Ref[];
  readonly selected: MathObject[];

  readonly folded: string;

  constructor(raw: string, readonly objects: MathObject[], selection: string[]) {
    this.folded = normalizeCommand(raw);
    this.points = objects.filter((o): o is PointObject => o.type === 'point');
    this.byId = new Map(objects.map(o => [o.id, o]));
    let clause: Clause | null = null;
    // Çekirdek ayrıştırıcı büyük harfli "DE", "O", "NE" adlarını bağlaç sanıp etiket saymıyor; sahnede bu noktalar varsa
    // köşeli parantezle ([DE]) açıkça etiket olarak işaretle.
    const prepared = raw.replace(/(?<![\p{L}\p{N}_[])([A-ZÇĞİÖŞÜ]{1,4})(?=(?:['’][a-zçğıöşü]+)?(?![\p{L}\p{N}_\]]))/gu, (whole, name: string) =>
      STOPWORDS.has(fold(name)) && pointsOf(name, this.points) ? `[${name}]` : whole);
    try {
      clause = parseClause(prepared, {
        points: this.points.map(p => p.label),
        names: objects.flatMap(o => o.type === 'point' ? [] : o.type === 'slider' ? [o.label, o.variableName] : [o.label]),
      });
    } catch { clause = null; }
    this.clause = clause;
    // Köşeli parantezli adlar ayrıştırıcıda önce işlendiği için etiket sırası cümle sırası değildir; yer tutucunun konumuna göre sırala.
    const position = (index: number) => {
      const at = clause?.text.search(new RegExp(`\\$${index}(?!\\d)`)) ?? -1;
      return at < 0 ? Number.MAX_SAFE_INTEGER : at;
    };
    this.refs = (clause?.labels ?? []).map((ref, index) => ({
      ref, index,
      points: pointsOf(ref.text, this.points) ?? [],
      objects: objects.filter(o => o.type !== 'point' && labelKey(o.label) === labelKey(ref.text)),
    })).sort((a, b) => position(a.index) - position(b.index));
    this.selected = objects.filter(o => selection.includes(o.id));
  }

  get text(): string { return this.clause?.text ?? ''; }
  get numbers(): number[] { return this.clause?.numbers ?? []; }
  resolved(): Ref[] { return this.refs.filter(r => r.points.length || r.objects.length); }
  refAt(placeholder: string | undefined): Ref | undefined { return placeholder === undefined ? undefined : this.refs.find(r => r.index === Number(placeholder)); }

  endpoints(o: MathObject): PointObject[] | null {
    const ids = o.type === 'segment' ? [o.startPointId, o.endPointId] : o.type === 'line' ? [o.point1Id, o.point2Id]
      : o.type === 'ray' ? [o.startPointId, o.throughPointId] : o.type === 'polygon' ? o.pointIds : null;
    if (!ids) return null;
    const pts = ids.map(id => this.byId.get(id)).filter((p): p is PointObject => p?.type === 'point');
    return pts.length === ids.length ? pts : null;
  }
  /** Komutta kullanılabilecek kısa ad: nokta adı, köşe adları (ABC), iki uç (AB). */
  describe(o: MathObject): string | undefined {
    if (o.type === 'point') return o.label;
    const pts = this.endpoints(o);
    if (pts) return pts.map(p => p.label).join('');
    return /^[\p{L}][\p{L}\p{N}_']{0,5}$/u.test(o.label) ? o.label : undefined;
  }
  refLabel(r: Ref): string {
    if (r.objects.length === 1) return this.describe(r.objects[0]) ?? r.ref.text;
    return r.points.length ? r.points.map(p => p.label).join('') : r.ref.text;
  }
  isLineLike(o: MathObject) { return o.type === 'segment' || o.type === 'line' || o.type === 'ray'; }

  /** İki noktalı doğru/doğru parçası adı: cümledeki "AB", adı yazılan doğru, seçili ya da tek doğru. */
  line(o: { allowTwoPoints?: boolean } = {}): string | undefined {
    const pair = this.refs.find(r => r.points.length === 2 && !r.objects.length);
    if (pair) return this.refLabel(pair);
    const named = this.refs.find(r => r.objects.some(x => this.isLineLike(x)));
    if (named) return this.describe(named.objects.find(x => this.isLineLike(x))!);
    const singles = this.refs.filter(r => r.points.length === 1 && !r.objects.length);
    if (o.allowTwoPoints && singles.length === 2) return singles.map(r => r.points[0].label).join('');
    const selected = this.selected.filter(x => this.isLineLike(x));
    if (selected.length === 1) return this.describe(selected[0]);
    const all = this.objects.filter(x => this.isLineLike(x));
    return all.length === 1 ? this.describe(all[0]) : undefined;
  }
  /** Tek nokta: cümlede adı geçen ilk tek nokta, yoksa seçili tek nokta. */
  point(exclude: Ref[] = []): string | undefined {
    const single = this.refs.find(r => r.points.length === 1 && !r.objects.length && !exclude.includes(r));
    if (single) return single.points[0].label;
    const selected = this.selected.filter(o => o.type === 'point');
    return selected.length === 1 ? selected[0].label : undefined;
  }
  triangles(): MathObject[] { return this.objects.filter(o => o.type === 'polygon' && o.pointIds.length === 3); }
  /** Üçgen adı (ABC): cümlede, seçimde ya da sahnede tek üçgen. */
  triangle(): string | undefined {
    for (const r of this.refs) {
      const t = r.objects.find(o => o.type === 'polygon' && o.pointIds.length === 3)
        ?? (r.points.length === 3 ? this.triangles().find(o => o.type === 'polygon' && r.points.every(p => o.pointIds.includes(p.id))) : undefined);
      if (t) return this.describe(t);
      if (r.points.length === 3) return this.refLabel(r);
    }
    const selected = this.selected.filter(o => o.type === 'polygon' && o.pointIds.length === 3);
    if (selected.length === 1) return this.describe(selected[0]);
    const all = this.triangles();
    return all.length === 1 ? this.describe(all[0]) : undefined;
  }
  /** Cümledeki şekil adı ("üçgeni", "doğruyu") hangi nesne türünü kastediyor? */
  private preferred(): ((o: MathObject) => boolean) | undefined {
    const f = this.folded;
    if (/ucgen/.test(f)) return o => o.type === 'polygon' && o.pointIds.length === 3;
    if (/\bkare(?!li)|dikdortgen|\bdortgen|paralelkenar|yamuk|deltoid/.test(f)) return o => o.type === 'polygon' && o.pointIds.length === 4;
    if (/cokgen|besgen|altigen|sekizgen/.test(f)) return o => o.type === 'polygon';
    if (/dogru parca|\bparcas/.test(f)) return o => o.type === 'segment';
    if (/\bisin/.test(f)) return o => o.type === 'ray';
    if (/\bdogru/.test(f)) return o => o.type === 'line';
    if (/\bnokta/.test(f)) return o => o.type === 'point';
    return undefined;
  }

  /** Dönüşüm/düzenleme hedefi: cümledeki ilk ad (hariç tutulanlar dışında), seçili tek nesne ya da sahnedeki tek şekil. */
  target(exclude: Ref[] = []): { label: string; point: boolean } | undefined {
    const ref = this.resolved().find(r => !exclude.includes(r));
    if (ref) return { label: this.refLabel(ref), point: ref.points.length === 1 && !ref.objects.length };
    const prefer = this.preferred();
    const as = (o: MathObject) => ({ label: this.describe(o)!, point: o.type === 'point' });
    const selected = this.selected.filter(o => this.describe(o) && (!prefer || prefer(o)));
    if (selected.length === 1) return as(selected[0]);
    const pool = this.objects.filter(o => this.describe(o) && (prefer ? prefer(o) : ['polygon', 'segment', 'line', 'ray'].includes(o.type)));
    return pool.length === 1 ? as(pool[0]) : undefined;
  }
}

const accusative = (t: { label: string; point: boolean }) => inflectLabel(t.label, 'acc', t.point ? 'noktasını' : 'şeklini');

/** Model sadece işlem türünü sıralar. Parametreler modelden tahmin edilmez. */
export function interpretSemanticMatch(raw: string, match: SemanticMatch, objects: MathObject[], selection: string[]): SemanticInterpretation {
  if (!canSearchMeaning(raw) || match.score < 0.55) return {};
  const text = normalizeCommand(raw);
  const points = objects.filter(o => o.type === 'point');
  const explicit = text.match(/\b([a-z]\d*)\s+(?:nokta|kose)/)?.[1]
    ?? text.match(/\b([a-z]\d*)(?:den|dan|nin|nun|daki|deki)\b/)?.[1];
  const mentioned = points.filter(p => text.split(/\s+/).includes(normalizeCommand(p.label)));
  const chosenPoints = points.filter(p => selection.includes(p.id));
  const vertex = explicit?.toUpperCase() ?? (mentioned.length === 1 ? mentioned[0].label : chosenPoints.length === 1 ? chosenPoints[0].label : undefined);
  const numericText = text.replace(/\b[a-z]+\d+\b/g, '');
  const numbers: string[] = numericText.match(/(?<![a-z\d])-?\d+(?:[.,]\d+)?/g) ?? [];
  const shapeTypes = ['polygon', 'circle', 'sector', 'ellipse', 'segment', 'line', 'ray', 'arc'];
  const shapes = objects.filter(o => shapeTypes.includes(o.type));
  const namedShapes = shapes.filter(o => text.split(/\s+/).includes(normalizeCommand(o.label)));
  const selectedShapes = shapes.filter(o => selection.includes(o.id));
  const shape = namedShapes.length === 1 ? namedShapes[0] : selectedShapes.length === 1 ? selectedShapes[0] : shapes.length === 1 ? shapes[0] : undefined;
  const target = /ucgen/.test(text) ? 'Üçgenin' : /cember|daire/.test(text) ? 'Çemberin' : shape?.label;
  const needVertex = { clarification: 'Hangi noktadan? Noktanın adını yazın veya bir nokta seçin.' };
  switch (match.intent) {
    case 'altitude': return vertex ? { command: `${vertex} noktasından dik indir` } : needVertex;
    case 'angle': return vertex ? { command: `${vertex} noktasının açısını yaz` } : { clarification: 'Hangi köşenin açısı? Noktanın adını yazın veya köşeyi seçin.' };
    case 'tangent': return vertex ? { command: `${vertex} noktasından ${shape?.type === 'circle' ? shape.label + ' ' : ''}çembere teğet doğru çiz` } : needVertex;
    case 'bind': return { command: `${shape?.type === 'polygon' ? shape.label + ' ' : ''}Üçgen uzunluklarını kaydırıcıya bağla` };
    case 'area': case 'perimeter': case 'lengths': {
      if (!target) return { clarification: 'Hangi şekli ölçelim? Şekli seçin veya adını belirtin.' };
      return { command: `${target} ${match.intent === 'area' ? 'alanını' : match.intent === 'perimeter' ? 'çevresini' : 'kenarlarını'} ölç` };
    }
    case 'triangle': {
      if (numbers.length !== 0 && numbers.length !== 3 && !/eskenar/.test(text)) return { clarification: 'Üçgen için üç kenar uzunluğu belirtin.' };
      const kind = /eskenar/.test(text) ? 'eşkenar üçgen' : /ikizkenar/.test(text) ? 'ikizkenar üçgen' : /\bdik\b/.test(text) ? 'dik üçgen' : 'üçgen';
      return { command: `${numbers.join(' ')} ${kind} ${/olsun|degistir|ayarla/.test(text) ? 'olsun' : 'çiz'}`.trim() };
    }
    case 'circle': {
      if (numbers.length > 1) return { clarification: 'Çember için tek yarıçap belirtin.' };
      const radius = numbers.length ? /\bcap[i ]/.test(text) ? String(Number(numbers[0].replace(',', '.')) / 2) : numbers[0] : undefined;
      return { command: `${vertex ? vertex + ' noktası merkezli ' : ''}${radius ? 'Yarıçapı ' + radius + ' olan ' : ''}çember çiz` };
    }
    case 'square': case 'rectangle': {
      if (numbers.length > (match.intent === 'square' ? 1 : 2)) return {};
      return { command: `${numbers.join(' ')} ${match.intent === 'square' ? 'kare' : 'dikdörtgen'} çiz`.trim() };
    }
    case 'segment': case 'line': case 'ray': case 'midpoint': {
      const pair = (text.match(/\b[a-z]{2}\b/g) ?? []).find(token =>
        points.some(p => normalizeCommand(p.label) === token[0]) && points.some(p => normalizeCommand(p.label) === token[1]))?.toUpperCase();
      const labels = pair ?? (mentioned.length === 2 ? mentioned.map(p => p.label).join('') : chosenPoints.length === 2 ? chosenPoints.map(p => p.label).join('') : undefined);
      if (!labels) return { clarification: 'Hangi iki nokta? Örneğin A ile B yazın veya iki noktayı seçin.' };
      return { command: `${labels} ${match.intent === 'midpoint' ? 'orta noktasını oluştur' : match.intent === 'segment' ? 'doğru parçası çiz' : match.intent === 'ray' ? 'ışın çiz' : 'doğru çiz'}` };
    }
    default: return interpretFamilyIntent(raw, match.intent, new SceneReader(raw, objects, selection), text);
  }
}

/** Yeni komut aileleri için kanonik cümleler. Eksik parametrede tahmin yerine açıklama istenir. */
function interpretFamilyIntent(raw: string, intent: string, scene: SceneReader, folded: string): SemanticInterpretation {
  const t = scene.text;
  const nums = scene.numbers;
  const numberAt = (placeholder: string | undefined) => placeholder === undefined ? undefined : nums[Number(placeholder.replace('#', ''))];
  switch (intent) {
    case 'point': {
      const coord = scene.clause?.coords[0];
      const newName = scene.refs.find(r => !r.points.length && !r.objects.length && /^[A-ZÇĞİÖŞÜ](?:_?\d+)?'*$/.test(r.ref.text))?.ref.text;
      const position = coord ?? (nums.length === 2 ? { x: nums[0], y: nums[1] } : /orijin|baslangic noktas/.test(folded) ? { x: 0, y: 0 } : undefined);
      if (!position) return nums.length ? { clarification: 'Noktanın iki koordinatını yazın; örneğin (2; 3).' } : { command: 'nokta oluştur' };
      return { command: `${newName ? newName + ' ' : ''}(${fmt(position.x)}; ${fmt(position.y)}) noktası oluştur` };
    }
    case 'parallel': case 'perpendicular': {
      const word = intent === 'parallel' ? 'paralel' : 'dik';
      const line = scene.line();
      if (!line) return { clarification: `Hangi doğruya ${word}? Doğrunun adını yazın (ör. AB) veya doğruyu seçin.` };
      const from = scene.point();
      if (!from) return { clarification: 'Yeni doğru hangi noktadan geçsin? Noktanın adını yazın veya bir nokta seçin.' };
      return { command: `${from} noktasından ${line} doğrusuna ${word} doğru çiz` };
    }
    case 'perp_bisector': {
      const segment = scene.line({ allowTwoPoints: true });
      if (!segment) return { clarification: 'Hangi doğru parçasının orta dikmesi? İki ucunu yazın (ör. AB) veya parçayı seçin.' };
      return { command: `${segment} doğru parçasının orta dikmesini çiz` };
    }
    case 'angle_bisector': {
      const three = scene.refs.find(r => r.points.length === 3);
      if (three) return { command: `${three.points.map(p => p.label).join('')} açısının açıortayını çiz` };
      const vertex = scene.point();
      if (vertex) {
        const polygons = scene.objects.filter(o => o.type === 'polygon' && o.pointIds.some(id => scene.byId.get(id)?.label === vertex));
        if (polygons.length === 1 && polygons[0].type === 'polygon') {
          const ids = polygons[0].pointIds, i = ids.findIndex(id => scene.byId.get(id)?.label === vertex);
          const name = (k: number) => (scene.byId.get(ids[(k + ids.length) % ids.length]) as PointObject).label;
          return { command: `${name(i - 1)}${vertex}${name(i + 1)} açısının açıortayını çiz` };
        }
      }
      return { clarification: 'Hangi açının açıortayı? Açıyı üç harfle yazın (ör. ABC açısı) veya köşeyi belirtin.' };
    }
    case 'median': {
      const vertex = scene.point();
      if (vertex) return { command: `${vertex} köşesinden kenarortay çiz` };
      const triangle = scene.triangle();
      if (triangle) return { command: `${inflectLabel(triangle, 'gen', 'üçgeninin')} kenarortaylarını çiz` };
      return { clarification: 'Hangi köşeden kenarortay? Köşenin adını yazın (ör. A köşesinden).' };
    }
    case 'circumcircle': case 'incircle': {
      const triangle = scene.triangle();
      if (!triangle) return { clarification: 'Hangi üçgenin? Üçgenin adını yazın (ör. ABC) veya üçgeni seçin.' };
      return { command: `${triangle} üçgeninin ${intent === 'circumcircle' ? 'çevrel' : 'iç teğet'} çemberini çiz` };
    }
    case 'intersection': {
      const describe = (o: MathObject): string | undefined => {
        if (o.type === 'circle' && o.centerPointId && !o.throughPointIds?.length) {
          const center = scene.byId.get(o.centerPointId);
          return center?.type === 'point' ? `${center.label} merkezli çember` : undefined;
        }
        return scene.describe(o);
      };
      // Motor kesişimde iki nesnenin adını ister: doğru benzerleri iki uç noktasıyla (AB), çember merkeziyle (K merkezli çember).
      const kinds = ['segment', 'line', 'ray', 'circle'];
      const fromText = scene.refs.flatMap(r => r.objects.length ? r.objects : r.points.length === 2
        ? scene.objects.filter(o => scene.isLineLike(o) && r.points.every(p => scene.endpoints(o)!.some(q => q.id === p.id)))
        : []).filter(o => kinds.includes(o.type));
      const selected = scene.selected.filter(o => kinds.includes(o.type));
      const all = scene.objects.filter(o => kinds.includes(o.type));
      const picked = fromText.length === 2 ? fromText : selected.length === 2 ? selected : all.length === 2 ? all : [];
      const names = picked.map(describe);
      if (names.length === 2 && names.every(Boolean)) return { command: `${names[0]} ile ${names[1]} kesişim noktalarını bul` };
      return { clarification: 'Hangi iki nesnenin kesişimi? İkisinin adını yazın (ör. AB ile CD) veya ikisini seçin.' };
    }
    case 'reflect': {
      const axis = /\bx eksen/.test(folded) ? 'x eksenine' : /\by eksen/.test(folded) ? 'y eksenine' : /orijin/.test(folded) ? 'orijine' : undefined;
      const resolved = scene.resolved();
      let target: { label: string; point: boolean } | undefined;
      let mirror = axis;
      if (resolved.length >= 2) {
        target = { label: scene.refLabel(resolved[0]), point: resolved[0].points.length === 1 && !resolved[0].objects.length };
        if (!mirror) {
          const m = resolved[1];
          const lineObject = m.objects.find(o => scene.isLineLike(o));
          mirror = lineObject ? `${scene.describe(lineObject)} doğrusuna` : m.points.length === 2 ? `${scene.refLabel(m)} doğrusuna` : m.points.length === 1 ? `${m.points[0].label} noktasına` : undefined;
        }
      } else if (resolved.length === 1) {
        const only = resolved[0];
        const onlyIsLine = only.points.length === 2 || only.objects.some(o => scene.isLineLike(o));
        if (!mirror && onlyIsLine && /gore/.test(folded)) {
          mirror = `${scene.refLabel(only)} doğrusuna`;
          target = scene.target([only]);
        } else {
          target = { label: scene.refLabel(only), point: only.points.length === 1 && !only.objects.length };
        }
      } else {
        target = scene.target();
      }
      if (!target) return { clarification: 'Neyi yansıtalım? Şeklin adını yazın (ör. ABC) veya şekli seçin.' };
      if (!mirror) return { clarification: 'Neye göre yansıtalım? Doğruyu (ör. DE doğrusu), ekseni (x ekseni) ya da noktayı yazın.' };
      return { command: `${accusative(target)} ${mirror} göre yansıt` };
    }
    case 'rotate': {
      const centerRef = scene.refAt(t.match(/\$(\d+)\S*\s+(?:noktasi\s+)?(?:etrafinda|merkezli|cevresinde|merkezinde)/)?.[1]);
      const center = centerRef ? `${centerRef.points[0]?.label ?? centerRef.ref.text} noktası` : /orijin/.test(folded) ? 'orijin' : undefined;
      const target = scene.target(centerRef ? [centerRef] : []);
      const degree = nums.length ? nums[0] : undefined;
      if (!target) return { clarification: 'Neyi döndürelim? Şeklin adını yazın (ör. ABC) veya şekli seçin.' };
      if (!center) return { clarification: 'Hangi nokta etrafında döndürelim? Noktanın adını ya da “orijin” yazın.' };
      if (degree === undefined) return { clarification: 'Kaç derece döndürelim? Örneğin 90 derece yazın.' };
      const direction = /ters/.test(folded) ? 'saat yönünün tersine ' : /saat yonunde|saat yonu/.test(folded) ? 'saat yönünde ' : '';
      return { command: `${accusative(target)} ${center} etrafında ${direction}${fmt(degree)} derece döndür` };
    }
    case 'translate': {
      const vectorRef = scene.refAt(t.match(/\$(\d+)\S*\s+vektor/)?.[1]);
      const coord = scene.clause?.coords[0];
      const step = t.match(/(#\d+)\s*(?:birim|br|cm)?\s*(saga|sola|yukari|asagi)\b/);
      const target = scene.target(vectorRef ? [vectorRef] : []);
      if (!target) return { clarification: 'Neyi öteleyelim? Şeklin adını yazın (ör. ABC) veya şekli seçin.' };
      if (vectorRef) return { command: `${accusative(target)} ${scene.refLabel(vectorRef)} vektörü boyunca ötele` };
      if (coord) return { command: `${accusative(target)} (${fmt(coord.x)}; ${fmt(coord.y)}) vektörü kadar ötele` };
      if (step) return { command: `${accusative(target)} ${fmt(numberAt(step[1])!)} birim ${DIRECTIONS[step[2]]} ötele` };
      return { clarification: 'Ne kadar öteleyelim? Örneğin “3 birim sağa” ya da “AB vektörü boyunca” yazın.' };
    }
    case 'dilate': {
      const centerRef = scene.refAt(t.match(/\$(\d+)\S*\s+(?:noktasi\s+)?merkez/)?.[1]);
      const center = centerRef ? `${centerRef.points[0]?.label ?? centerRef.ref.text} merkezli` : /orijin/.test(folded) ? 'orijin merkezli' : undefined;
      const shrink = /kucult|yari boyut/.test(folded);
      const factor = numberAt(t.match(/(#\d+)\s*(?:kat|oran)/)?.[1]) ?? numberAt(t.match(/oran\w*\s*(#\d+)/)?.[1]) ?? (/yari boyut/.test(folded) ? 0.5 : nums[0]);
      const target = scene.target(centerRef ? [centerRef] : []);
      if (!target) return { clarification: 'Neyi büyütelim? Şeklin adını yazın (ör. ABC) veya şekli seçin.' };
      if (!center) return { clarification: 'Hangi merkeze göre? Merkez noktasını yazın (ör. A merkezli).' };
      if (factor === undefined) return { clarification: 'Kaç kat? Örneğin 2 kat yazın.' };
      return { command: `${accusative(target)} ${center} ${fmt(factor)} kat ${shrink && factor >= 1 ? 'küçült' : 'büyüt'}` };
    }
    case 'delete': case 'hide': {
      const verb = intent === 'delete' ? 'sil' : 'gizle';
      if (/hepsini|her seyi|tumunu|butun nesne/.test(folded)) return { command: `tümünü ${verb}` };
      const resolved = scene.resolved();
      if (resolved.length === 1) return { command: `${accusative({ label: scene.refLabel(resolved[0]), point: resolved[0].points.length === 1 && !resolved[0].objects.length })} ${verb}` };
      if (resolved.length > 1) return { command: `${resolved.map(r => scene.refLabel(r)).join(', ')} ${verb}` };
      if (scene.selected.length) return { command: `seçilileri ${verb}` };
      return { clarification: `Neyi ${intent === 'delete' ? 'silelim' : 'gizleyelim'}? Adını yazın (ör. ABC) veya nesneyi seçin.` };
    }
    case 'color': {
      const color = COLOR_NAMES.find(([key]) => new RegExp(`\\b${key}`).test(folded))?.[1];
      if (!color) return { clarification: 'Hangi renk? Örneğin kırmızı, mavi ya da yeşil yazın.' };
      const resolved = scene.resolved();
      if (resolved.length) return { command: `${accusative({ label: scene.refLabel(resolved[0]), point: resolved[0].points.length === 1 && !resolved[0].objects.length })} ${color} yap` };
      if (scene.selected.length) return { command: `seçilileri ${color} yap` };
      const target = scene.target();
      if (target) return { command: `${accusative(target)} ${color} yap` };
      return { clarification: 'Neyi boyayalım? Adını yazın (ör. ABC) veya nesneyi seçin.' };
    }
    case 'move': {
      const coord = scene.clause?.coords[0];
      const step = t.match(/(#\d+)\s*(?:birim|br|cm)?\s*(saga|sola|yukari|asagi)\b/);
      const target = scene.target();
      if (!target) return { clarification: 'Neyi taşıyalım? Adını yazın (ör. A noktası) veya nesneyi seçin.' };
      if (coord) return { command: `${accusative(target)} (${fmt(coord.x)}; ${fmt(coord.y)}) konumuna taşı` };
      if (step) return { command: `${accusative(target)} ${fmt(numberAt(step[1])!)} birim ${DIRECTIONS[step[2]]} kaydır` };
      return { clarification: 'Nereye taşıyalım? Koordinat yazın (ör. (3; 4)) ya da “2 birim sağa” gibi yön verin.' };
    }
    case 'rename': {
      const existing = scene.resolved()[0];
      const fresh = scene.refs.find(r => r !== existing && !r.points.length && !r.objects.length && /^[A-ZÇĞİÖŞÜ]/.test(r.ref.text));
      const old = existing ? { label: scene.refLabel(existing), point: existing.points.length === 1 && !existing.objects.length } : scene.target();
      if (!old) return { clarification: 'Neyin adını değiştirelim? Adını yazın (ör. A noktası) veya nesneyi seçin.' };
      if (!fresh) return { clarification: `Yeni adı yazın; örneğin “${inflectLabel(old.label, 'gen', old.point ? 'noktasının' : 'şeklinin')} adını P yap”.` };
      return { command: `${inflectLabel(old.label, 'gen', old.point ? 'noktasının' : 'şeklinin')} adını ${fresh.ref.text} yap` };
    }
    case 'slider': {
      const name = folded.match(/\b([a-z])\s+(?:adinda|adli|isimli|icin|kaydirici|parametre|surgu|degisken)/)?.[1]
        ?? folded.match(/(?:kaydirici|parametre|surgu)(?:si|yi|su|yu)?\s+([a-z])\b/)?.[1];
      const range = t.match(/(#\d+)\s+ile\s+(#\d+)\s+arasi/);
      const subject = name ? `${name} kaydırıcısı` : 'kaydırıcı';
      if (range) return { command: `${fmt(numberAt(range[1])!)} ile ${fmt(numberAt(range[2])!)} arasında ${subject} oluştur` };
      return { command: `${subject} oluştur` };
    }
    case 'function': {
      if (/parabol|x kare/.test(folded)) return { command: 'f(x) = x^2' };
      if (/kosinus|cosinus/.test(folded)) return { command: 'f(x) = cos(x)' };
      if (/sinus/.test(folded)) return { command: 'f(x) = sin(x)' };
      if (/dogrusal/.test(folded)) return { command: 'f(x) = x' };
      return { clarification: 'Fonksiyonu yazın; örneğin f(x) = x^2 ya da y = 2x + 1.' };
    }
    case 'text': {
      const quote = raw.match(/"([^"]+)"|“([^”]+)”|«([^»]+)»/);
      const content = quote ? (quote[1] ?? quote[2] ?? quote[3]).trim() : '';
      if (!content) return { clarification: 'Yazıyı tırnak içinde yazın; örneğin “Merhaba” yazısını ekle.' };
      return { command: `"${content}" yazısını ekle` };
    }
    case 'fraction': {
      const slash = raw.match(/(\d+)\s*\/\s*(\d+)/);
      const pair = slash ? [Number(slash[1]), Number(slash[2])] : t.match(/(#\d+)\s+bolu\s+(#\d+)/)?.slice(1).map(p => numberAt(p)!) ?? (nums.length === 2 ? nums : null);
      if (!pair || pair.some(n => !Number.isInteger(n))) return { clarification: 'Kesri yazın; örneğin 3/4 ya da “üç bölü dört”.' };
      const bar = /serit|bant|cubuk/.test(folded);
      return { command: `${pair[0]}/${pair[1]} ${bar ? 'şerit ' : ''}kesir modeli oluştur` };
    }
    case 'zoom': {
      if (/sifirla|baslangic/.test(folded)) return { command: 'görünümü sıfırla' };
      if (/sigdir|hepsini goster|tamamini goster/.test(folded)) return { command: 'ekrana sığdır' };
      if (/uzaklas|kucult/.test(folded)) return { command: 'uzaklaştır' };
      return { command: 'yakınlaştır' };
    }
    case 'grid': return { command: /gizle|kapat|gorunmesin|sakla|kaldir/.test(folded) ? 'ızgarayı gizle' : 'ızgarayı göster' };
    case 'undo': {
      if (/yinele|ileri al|tekrar yap/.test(folded)) return { command: 'yinele' };
      const count = nums.find(n => Number.isInteger(n) && n > 1);
      return { command: count ? `${count} adım geri al` : 'geri al' };
    }
    case 'regular_polygon': {
      const sides = scene.clause?.paramBefore(/kenarli|koseli/) ?? POLYGON_NAMES.find(([re]) => re.test(folded))?.[1];
      if (sides === undefined) return { clarification: 'Kaç kenarlı? Örneğin “6 kenarlı düzgün çokgen” ya da “düzgün beşgen” yazın.' };
      if (!Number.isInteger(sides) || sides < 3) return { clarification: 'Düzgün çokgenin kenar sayısı 3 ya da daha büyük bir tam sayı olmalı.' };
      const side = scene.clause?.paramAfter(/kenar uzunlugu|kenari/);
      return { command: `${side !== undefined ? `kenar uzunluğu ${fmt(side)} olan ` : ''}${sides} kenarlı düzgün çokgen çiz` };
    }
    case 'ellipse': {
      if (nums.length === 1 || nums.length > 2) return { clarification: 'Elips için iki yarıçap yazın; örneğin “yarıçapları 4 ve 2 olan elips”.' };
      return { command: nums.length === 2 ? `yarıçapları ${fmt(nums[0])} ve ${fmt(nums[1])} olan elips çiz` : 'elips çiz' };
    }
    case 'arc': case 'sector': {
      const radius = scene.clause?.param(/yaricap/);
      const degreeRef = t.match(/(#\d+)\s*derece/)?.[1];
      const degree = numberAt(degreeRef);
      const noun = intent === 'arc' ? 'yay' : 'daire dilimi';
      return { command: `${radius !== undefined ? `yarıçapı ${fmt(radius)} olan ` : ''}${degree !== undefined ? `${fmt(degree)} derecelik ` : ''}${noun} çiz` };
    }
    case 'polygon': {
      const many = scene.refs.find(r => r.points.length >= 3);
      if (many) return { command: `${scene.refLabel(many)} çokgenini çiz` };
      const singles = scene.refs.filter(r => r.points.length === 1 && !r.objects.length);
      if (singles.length >= 3) return { command: `${singles.map(r => r.points[0].label).join('')} çokgenini çiz` };
      return { clarification: 'Köşe noktalarını sırayla yazın (ör. ABCD çokgeni) ya da düzgün çokgen için kenar sayısını belirtin.' };
    }
    default: return interpretTheoremIntent(raw, intent, scene, folded);
  }
}

const NEED_TRIANGLE = { clarification: 'Hangi üçgen için? Üçgenin adını yazın (ör. ABC) veya üçgeni seçin.' };
const NEED_CIRCLE = { clarification: 'Önce bir çember çizin (ör. “yarıçapı 3 olan çember çiz”) ya da çemberin adını yazın.' };

/** Üçgen teoremlerinin kanonik adları: cümledeki anahtar sözcükten işleyicinin beklediği ada. */
const TRIANGLE_THEOREMS: [RegExp, string][] = [
  [/aciortay/, 'açıortay teoremini'], [/kenarortay/, 'kenarortay teoremini'], [/stewart|stuart/, 'Stewart teoremini'], [/\bceva/, 'Ceva teoremini'],
  [/menela/, 'Menelaus teoremini'], [/sinus/, 'sinüs teoremini'], [/kosinus/, 'kosinüs teoremini'], [/heron/, 'Heron formülünü'],
  [/esitsizli|cizilebilir|olur mu|olusturur mu|var mi/, 'üçgen eşitsizliğini'], [/aci[- ]kenar|buyuk aci|kucuk aci/, 'açı kenar ilişkisini'],
];

/** Teoremler ve klasik şekiller: komutlar işleyici örnekleriyle aynı kalıptadır (handlers/teoremler). */
function interpretTheoremIntent(raw: string, intent: string, scene: SceneReader, folded: string): SemanticInterpretation {
  const nums = scene.numbers;
  const triangle = scene.triangle();
  const pair = scene.refs.find(r => r.points.length === 2 && !r.objects.length);
  const three = scene.refs.find(r => r.points.length === 3);
  const named = scene.refs.some(r => r.points.length === 3 || r.objects.some(o => o.type === 'polygon'));
  const circles = scene.objects.filter(o => o.type === 'circle');
  const theorem = /baginti|teorem|dogrula|uygula|acikla|kural|formul/.test(folded);
  switch (intent) {
    case 'oklid': case 'pisagor': {
      const oklid = intent === 'oklid';
      const figure = oklid ? 'Öklid üçgeni' : 'Pisagor şekli';
      if (nums.length === 2) return { command: `dik kenarları ${fmt(nums[0])} ve ${fmt(nums[1])} olan ${figure} çiz` };
      if (oklid && nums.length === 1 && /hipotenus/.test(folded)) return { command: `hipotenüsü ${fmt(nums[0])} olan Öklid üçgeni çiz` };
      if (!oklid && triangle && /dik mi/.test(folded)) return { command: `Pisagor'a göre ${triangle} dik mi` };
      if (theorem || /dik mi|hipotenus\w* kac/.test(folded)) {
        if (!triangle) return { clarification: `Hangi üçgen için? Üçgenin adını yazın (ör. ABC) ya da önce “${figure} çiz” deyin.` };
        return { command: oklid ? `${triangle} üçgeninde Öklid teoremini uygula` : `${triangle} üçgeninde Pisagor bağıntısını yaz` };
      }
      if (triangle && named) return { command: `${triangle} üçgeninde ${oklid ? 'Öklid' : 'Pisagor'} şeklini kur` };
      return { command: `${figure} çiz` };
    }
    case 'tales': {
      if (/cember|\bcap/.test(folded)) return { command: pair ? `${scene.refLabel(pair)} çaplı Tales çemberi çiz` : 'Tales çemberi çiz' };
      if (/kelebek/.test(folded)) return { command: 'kelebek Tales şekli çiz' };
      const ratio = raw.match(/(\d+)\s*:\s*(\d+)/);
      if (triangle && ratio) return { command: `${triangle} üçgeninde ${ratio[1]}:${ratio[2]} oranında Tales şekli kur` };
      if (triangle && (named || theorem || /oran/.test(folded))) return { command: `${triangle} üçgeninde Tales şekli kur` };
      return { command: 'Tales teoremi şekli çiz' };
    }
    case 'orta_taban': {
      if (triangle) return { command: /tabanlar/.test(folded) ? `${triangle} üçgeninin orta tabanlarını çiz` : `${triangle} üçgeninin orta tabanını çiz` };
      const quads = scene.objects.filter(o => o.type === 'polygon' && o.pointIds.length === 4 && scene.describe(o));
      const quad = scene.refs.flatMap(r => r.objects).find(o => quads.includes(o)) ?? (quads.length === 1 ? quads[0] : undefined);
      if (quad) return { command: `${scene.describe(quad)} yamuğunun orta tabanını çiz` };
      return { clarification: 'Hangi üçgenin ya da yamuğun orta tabanı? Adını yazın (ör. ABC) veya şekli seçin.' };
    }
    case 'euler': {
      return triangle ? { command: `${triangle} üçgeninin Euler doğrusunu çiz` } : NEED_TRIANGLE;
    }
    case 'dokuz_nokta': {
      return triangle ? { command: `${triangle} üçgeninin dokuz nokta çemberini${/merkez/.test(folded) ? ' merkeziyle' : ''} çiz` } : NEED_TRIANGLE;
    }
    case 'dis_teget': {
      if (!triangle) return NEED_TRIANGLE;
      if (/\buc\b|\btum|hepsi|butun|cemberler/.test(folded)) return { command: `${triangle} üçgeninin üç dış teğet çemberini çiz` };
      const vertex = scene.point();
      if (vertex && triangle.includes(vertex)) return { command: `${triangle} üçgeninin ${vertex} köşesine ait dış teğet çemberini çiz` };
      return { command: `${triangle} üçgeninin dış teğet çemberini çiz` };
    }
    case 'kiris': case 'kesen': case 'kuvvet': case 'cevre_aci': case 'teget_kiris': {
      if (!circles.length) return NEED_CIRCLE;
      // Birden fazla çemberde motor çemberi merkeziyle ister ("M merkezli çembere …"); cümlede ya da seçimde çember yoksa sorulur.
      const centerRef = scene.refs.find(r => r.points.length === 1 && !r.objects.length && circles.some(o => o.type === 'circle' && o.centerPointId === r.points[0].id) && /merkez/.test(folded));
      const chosen = scene.refs.flatMap(r => r.objects).find(o => o.type === 'circle')
        ?? (centerRef ? circles.find(o => o.type === 'circle' && o.centerPointId === centerRef.points[0].id) : undefined)
        ?? (scene.selected.filter(o => o.type === 'circle').length === 1 ? scene.selected.find(o => o.type === 'circle') : undefined);
      const center = chosen?.type === 'circle' && chosen.centerPointId ? scene.byId.get(chosen.centerPointId) : undefined;
      const name = circles.length === 1 ? undefined : center?.type === 'point' ? center.label : null;
      if (name === null) return { clarification: 'Birden fazla çember var; hangisi olduğunu merkeziyle yazın (ör. “M merkezli çembere …”) ya da çemberi seçin.' };
      const dative = name ? `${name} merkezli çembere` : 'çembere';
      const locative = name ? `${name} merkezli çemberde ` : '';
      const exclude = centerRef ? [centerRef] : [];
      if (intent === 'kiris') {
        if (/\bcap/.test(folded)) return { command: pair && !name ? `${scene.refLabel(pair)} çapını çiz` : `${name ? `${name} merkezli çemberin` : 'çemberin'} çapını çiz` };
        if (/orta dikme/.test(folded)) return { command: `${locative}kirişin orta dikmesini çiz` };
        if (/dikme|\bdik\b/.test(folded)) return { command: `${locative}merkezden kirişe dikme indir` };
        return { command: pair ? `${name ? `${dative} ` : ''}${scene.refLabel(pair)} kirişini çiz` : `${dative} bir kiriş çiz` };
      }
      if (intent === 'kesen' || intent === 'kuvvet') {
        const point = scene.point(exclude);
        if (intent === 'kuvvet' && !theorem) {
          return point ? { command: `${point} noktasının ${dative} göre kuvvetini hesapla` } : { clarification: 'Hangi noktanın kuvveti? Noktanın adını yazın (ör. P) veya noktayı seçin.' };
        }
        if (intent === 'kuvvet' || theorem) {
          if (name) return { clarification: 'Birden fazla çember varken teorem şekli kurulamıyor; diğer çemberleri gizleyin ya da yeni bir çizimde deneyin.' };
          if (/kiris(?:ler)? teorem/.test(folded)) return { command: 'kirişler teoremini göster' };
          if (/te[gy]et[- ]kesen/.test(folded)) return { command: 'teğet-kesen teoremini göster' };
          return { command: intent === 'kuvvet' ? 'kuvvet teoremini göster' : 'kesenler teoremini göster' };
        }
        if (point) return { command: `${point} noktasından ${dative} ${/\biki\b/.test(folded) ? 'iki ' : ''}kesen çiz` };
        return { command: `${dative} kesen çiz` };
      }
      if (intent === 'cevre_aci') {
        if (theorem || /iliski|yarisi|esit/.test(folded)) return { command: `${locative}çevre açı teoremini göster` };
        if (three) return { command: `${locative}${scene.refLabel(three)} çevre açısını çiz` };
        if (pair) return { command: `${locative}${scene.refLabel(pair)} yayını gören çevre açıyı çiz` };
        return { command: `${locative}çevre açı çiz` };
      }
      if (theorem || /yarisi/.test(folded)) return { command: `${locative}teğet kiriş açısı teoremini göster` };
      const at = scene.point(exclude);
      if (at) return { command: `${locative}${at} noktasındaki teğet-kiriş açısını çiz` };
      return { command: `${locative}teğet-kiriş açısını çiz` };
    }
    case 'ortak_teget': {
      if (circles.length < 2) return { clarification: 'Ortak teğet için iki çember gerekir; önce iki çember çizin ya da adlarını yazın (ör. c1 ve c2).' };
      if (/\bic\b/.test(folded)) return { command: 'iç ortak teğetleri çiz' };
      if (/\bdis\b/.test(folded)) return { command: 'dış ortak teğetleri çiz' };
      return { command: 'iki çemberin ortak teğetlerini çiz' };
    }
    case 'ucgen_teoremi': {
      const name = TRIANGLE_THEOREMS.find(([re]) => re.test(folded))?.[1];
      if (!name) return { clarification: 'Hangi teorem? Örneğin “açıortay teoremini göster” ya da “Heron formülünü uygula” yazın.' };
      if (name === 'üçgen eşitsizliğini' && nums.length === 3) {
        return { command: `kenarları ${fmt(nums[0])}, ${fmt(nums[1])} ve ${fmt(nums[2])} olan üçgen çizilebilir mi` };
      }
      if (!triangle) return NEED_TRIANGLE;
      const vertex = scene.point();
      if (vertex && /aciortay|kenarortay/.test(folded) && triangle.includes(vertex)) return { command: `${vertex} köşesi için ${name} uygula` };
      if (vertex && /kosinus/.test(folded) && triangle.includes(vertex)) return { command: `${vertex} açısı için kosinüs teoremini uygula` };
      if (vertex && /\bceva/.test(folded) && !triangle.includes(vertex)) return { command: `${vertex} noktası için Ceva teoremini uygula` };
      return { command: `${triangle} üçgeninde ${name} uygula` };
    }
    default: return {};
  }
}
