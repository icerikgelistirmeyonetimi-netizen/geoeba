import type { Point2D } from '@/types/math';
import { regularPolygonVertices } from '@/math/regularPolygon';
import { fail, polygonName, trNum } from '../../scene';
import { D, L, Reader, SEP, checkAngle, checkLength, ngonWord, toDeg, toRad } from './analyze';
import { type PolyKind, VERTEX_COLORS } from './place';

/** Yerel koordinatlarda okunmuş şekil. */
export interface LocalShape {
  local: Point2D[];
  notes: string[];
  /** Ölçüler cümlede verildi mi (varsayılan değil) */
  explicit: boolean;
  /** İletideki ölçü özeti: "kenar 4" */
  summary: string;
  kind: PolyKind;
  noun: string;
  label?: string;
  pointColor?: string;
  originCentered?: boolean;
  snap?: boolean;
}

const centered = (w: number, h: number): Point2D[] => [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }];

function noLeftovers(r: Reader, example: string) {
  if (r.lengths().length || r.degrees().length) fail(`Sayıların neyi gösterdiğini yazın. Örneğin: “${example}”.`);
}

// ---------------------------------------------------------------------------
// Kare
// ---------------------------------------------------------------------------
export function readSquare(r: Reader): LocalShape {
  let m: RegExpMatchArray | null;
  const notes: string[] = [];
  let side: number | undefined, how = '';
  if ((m = r.take(new RegExp(`\\bkosegen\\w* (${L})`)))) { const d = checkLength(r.value(m[1]), 'Köşegen'); side = d / Math.SQRT2; how = `köşegen ${trNum(d)}`; }
  else if ((m = r.take(new RegExp(`\\byaricap\\w* (${L})|(${L}) yaricapli`)))) { const R = checkLength(r.value(m[1] ?? m[2]), 'Yarıçap'); side = R * Math.SQRT2; how = `çevrel çember yarıçapı ${trNum(R)}`; }
  else if ((m = r.take(new RegExp(`\\bcap(?:i|li)? (${L})|(${L}) capli`)))) { const d = checkLength(r.value(m[1] ?? m[2]), 'Çap'); side = d / Math.SQRT2; how = `köşegen ${trNum(d)}`; }
  else if ((m = r.take(new RegExp(`\\balan\\w* (${L})`)))) { const a = checkLength(r.value(m[1]), 'Alan'); side = Math.sqrt(a); how = `alan ${trNum(a)}`; }
  else if ((m = r.take(new RegExp(`\\bcevre\\w* (${L})`)))) { const p = checkLength(r.value(m[1]), 'Çevre'); side = p / 4; how = `çevre ${trNum(p)}`; }
  else if ((m = r.take(new RegExp(`\\bkenar\\w* (${L})|(${L}) kenarli`)))) side = checkLength(r.value(m[1] ?? m[2]), 'Kenar');
  if (side === undefined) {
    const bare = r.lengths();
    if (bare.length === 1 || (bare.length === 2 && Math.abs(bare[0] - bare[1]) < 1e-12)) { side = checkLength(bare[0], 'Kenar'); r.take(new RegExp(`(${L})(?:${SEP}(${L}))?`)); }
    else if (bare.length === 2) fail('Karenin kenarları eşittir; farklı iki ölçü için “3x5 dikdörtgen çiz” yazın.');
  }
  noLeftovers(r, 'kenarı 5 olan kare çiz');
  const explicit = side !== undefined;
  const s = side ?? 4;
  return { local: centered(s, s), notes, explicit, summary: `kenar ${trNum(s)} br${how ? `, ${how}` : ''}`, kind: 'square', noun: 'kare', pointColor: VERTEX_COLORS.square };
}

// ---------------------------------------------------------------------------
// Dikdörtgen
// ---------------------------------------------------------------------------
export function readRectangle(r: Reader): LocalShape {
  let m: RegExpMatchArray | null;
  const notes: string[] = [];
  let w: number | undefined, h: number | undefined, area: number | undefined, perimeter: number | undefined, diagonal: number | undefined, oneSide: number | undefined;
  const len = (ref: string, what: string) => checkLength(r.value(ref), what);
  if ((m = r.take(new RegExp(`\\buzun kenar\\w* (${L})`)))) w = len(m[1], 'Uzun kenar');
  if ((m = r.take(new RegExp(`\\bkisa kenar\\w* (${L})`)))) h = len(m[1], 'Kısa kenar');
  if (r.has(/\buzunlug\w* #/) && r.has(/\bgenislig\w* #/)) {
    if ((m = r.take(new RegExp(`\\buzunlug\\w* (${L})`)))) w = len(m[1], 'Uzunluk');
    if ((m = r.take(new RegExp(`\\bgenislig\\w* (${L})`)))) h = len(m[1], 'Genişlik');
  }
  if ((m = r.take(new RegExp(`\\b(?:en|eni|enini|genislig\\w*) (${L})`)))) w = len(m[1], 'En');
  if ((m = r.take(new RegExp(`\\b(?:boy\\w*|yukseklig\\w*) (${L})`)))) h = len(m[1], 'Boy');
  if ((m = r.take(new RegExp(`\\buzunlug\\w* (${L})`)))) { if (w === undefined) w = len(m[1], 'Uzunluk'); else h = len(m[1], 'Uzunluk'); }
  if ((m = r.take(new RegExp(`\\balan\\w* (${L})`)))) area = len(m[1], 'Alan');
  if ((m = r.take(new RegExp(`\\bcevre\\w* (${L})`)))) perimeter = len(m[1], 'Çevre');
  if ((m = r.take(new RegExp(`\\bkosegen\\w* (${L})`)))) diagonal = len(m[1], 'Köşegen');
  if ((m = r.take(new RegExp(`\\b(?:kenar\\w*|boyut\\w*|olcu\\w*) (${L})${SEP}(${L})`)))) { w = len(m[1], 'Kenar'); h = len(m[2], 'Kenar'); }
  else if ((m = r.take(new RegExp(`\\b(?:bir |diger )?kenar\\w* (${L})`)))) oneSide = len(m[1], 'Kenar');
  const bare = r.lengths();
  if (bare.length > 2) fail('Dikdörtgen için en ve boy yazın. Örneğin: “3x5 dikdörtgen çiz”.');
  if (bare.length === 2 && w === undefined && h === undefined) { [w, h] = bare.map(x => checkLength(x, 'Kenar')); r.take(new RegExp(`(${L})${SEP}(${L})`)); }
  else if (bare.length === 1) { oneSide = checkLength(bare[0], 'Kenar'); r.take(new RegExp(`(${L})`)); }
  noLeftovers(r, 'eni 3 boyu 5 olan dikdörtgen çiz');
  if (oneSide !== undefined) {
    if (w === undefined) w = oneSide;
    else if (h === undefined) h = oneSide;
    else fail('Dikdörtgen için en ve boy yazın; iki kenar yeterli. Örneğin: “3x5 dikdörtgen çiz”.');
  }

  const explicit = [w, h, area, perimeter, diagonal].some(v => v !== undefined);
  const known = w ?? h;
  if (w !== undefined && h !== undefined) { /* tamam */ }
  else if (known !== undefined && area !== undefined) { const other = area / known; if (w === undefined) w = other; else h = other; }
  else if (known !== undefined && perimeter !== undefined) {
    const other = perimeter / 2 - known;
    if (other <= 1e-12) fail('Bu çevreyle bu kenar uzunluğunda dikdörtgen olmaz; çevre, kenarın iki katından büyük olmalı.');
    if (w === undefined) w = other; else h = other;
  } else if (known !== undefined && diagonal !== undefined) {
    if (diagonal <= known) fail('Köşegen kenardan uzun olmalı.');
    const other = Math.sqrt(diagonal * diagonal - known * known);
    if (w === undefined) w = other; else h = other;
  } else if (area !== undefined && perimeter !== undefined) {
    const half = perimeter / 2, disc = half * half - 4 * area;
    if (disc < -1e-12) fail('Bu alan ve çevreyle dikdörtgen oluşmaz (çevrenin karesi alanın 16 katından küçük olamaz).');
    w = (half + Math.sqrt(Math.max(0, disc))) / 2; h = half - w;
  } else if (known !== undefined) {
    const other = 4;
    if (w === undefined) { w = known === other ? 6 : other; notes.push(`En ${trNum(w)} birim alındı.`); } else { h = known === other ? 6 : other; notes.push(`Boy ${trNum(h)} birim alındı.`); }
  } else if (area !== undefined) {
    w = Math.sqrt(area * 1.5); h = area / w; notes.push('Kenarlar 3:2 oranında alındı.');
  } else if (perimeter !== undefined) {
    w = perimeter * 0.3; h = perimeter * 0.2; notes.push('Kenarlar 3:2 oranında alındı.');
  } else if (diagonal !== undefined) {
    w = diagonal * 0.8; h = diagonal * 0.6; notes.push('Kenarlar 4:3 oranında alındı.');
  } else {
    w = 6; h = 4;
  }
  checkLength(w!, 'En'); checkLength(h!, 'Boy');
  return { local: centered(w!, h!), notes, explicit, summary: `${trNum(w!)} × ${trNum(h!)} br`, kind: 'rectangle', noun: 'dikdörtgen', pointColor: VERTEX_COLORS.rectangle };
}

// ---------------------------------------------------------------------------
// Düzgün çokgen
// ---------------------------------------------------------------------------
export function regularSides(r: Reader): number | undefined {
  let m: RegExpMatchArray | null;
  const word = ngonWord(r.s);
  if (word) return word;
  if (/\bduzgun ucgen/.test(r.s)) return 3;
  if (/\bduzgun dortgen/.test(r.s)) return 4;
  if ((m = r.take(new RegExp(`\\b(?:kenar|kose) sayisi (${L})|(${L}) (?:kenari|kosesi) (?:olan|bulunan)\\b`)))) return r.value(m[1] ?? m[2]);
  if ((m = r.take(new RegExp(`(${L}) ?-? ?gen\\b`)))) return r.value(m[1]);
  if ((m = r.take(new RegExp(`(${L}) (?:kenarli|koseli)(?= (?:duzgun )?cokgen)`)))) return r.value(m[1]);
  if ((m = r.take(new RegExp(`(${L}) (?:kenarli|koseli)`)))) return r.value(m[1]);
  return undefined;
}

export function readRegular(r: Reader, nameCount?: number): LocalShape {
  let m: RegExpMatchArray | null;
  const notes: string[] = [];
  const n = regularSides(r) ?? nameCount;
  if (n === undefined) fail('Düzgün çokgenin kaç kenarlı olduğunu yazın. Örneğin: “6 kenarlı düzgün çokgen çiz” ya da “düzgün beşgen çiz”.');
  if (!Number.isInteger(n) || n < 3 || n > 30) fail('Düzgün çokgenin kenar sayısı 3 ile 30 arasında bir tam sayı olmalı.');
  const sin = Math.sin(Math.PI / n);
  let radius: number | undefined, how = '';
  if ((m = r.take(new RegExp(`\\byaricap\\w* (${L})|(${L}) yaricapli`)))) radius = checkLength(r.value(m[1] ?? m[2]), 'Yarıçap');
  else if ((m = r.take(new RegExp(`\\bcap\\w* (${L})|(${L}) capli`)))) radius = checkLength(r.value(m[1] ?? m[2]), 'Çap') / 2;
  else if ((m = r.take(new RegExp(`\\bkenar\\w* (${L})|(${L}) kenarli`)))) { const s = checkLength(r.value(m[1] ?? m[2]), 'Kenar'); radius = s / (2 * sin); how = 'side'; }
  else if ((m = r.take(new RegExp(`\\bcevre\\w* (${L})`)))) { const p = checkLength(r.value(m[1]), 'Çevre'); radius = p / n / (2 * sin); how = 'perimeter'; }
  else if ((m = r.take(new RegExp(`\\balan\\w* (${L})`)))) { const a = checkLength(r.value(m[1]), 'Alan'); radius = Math.sqrt(2 * a / (n * Math.sin(2 * Math.PI / n))); how = 'area'; }
  noLeftovers(r, 'kenar uzunluğu 2 olan düzgün sekizgen çiz');
  const explicit = radius !== undefined;
  const R = radius ?? 3;
  if (R > 1000) fail('Düzgün çokgenin yarıçapı en fazla 1000 olabilir.');
  // Düzgün Çokgen penceresiyle aynı düzen: yatay taban, A sol alt köşe, saat yönünün tersine
  const local = regularPolygonVertices(n, R);
  const side = 2 * R * sin;
  const summary = how === 'side' ? `kenar ${trNum(side)} br` : how === 'perimeter' ? `kenar ${trNum(side)} br, çevre ${trNum(side * n)}` : how === 'area' ? `kenar ${trNum(side)} br, yarıçap ${trNum(R)}` : `yarıçap ${trNum(R)} br, kenar ${trNum(side)} br`;
  return { local, notes, explicit, summary, kind: 'regular', noun: polygonName(n).toLocaleLowerCase('tr'), label: polygonName(n), pointColor: VERTEX_COLORS.regular, originCentered: true };
}

// ---------------------------------------------------------------------------
// Paralelkenar ve eşkenar dörtgen
// ---------------------------------------------------------------------------
const parallelogram = (a: number, b: number, deg: number): Point2D[] => {
  const dx = b * Math.cos(toRad(deg)), dy = b * Math.sin(toRad(deg));
  return [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a + dx, y: dy }, { x: dx, y: dy }];
};

function readAngle(r: Reader): number | undefined {
  let m: RegExpMatchArray | null;
  if ((m = r.take(new RegExp(`\\b(?:(?:bir|dar|genis|ic|taban) )?aci\\w* (${D})|(${D}) (?:(?:olan|lik|luk) )?(?:(?:bir|dar|genis|ic) )?aci\\w*`)))) return checkAngle(r.value(m[1] ?? m[2]), 'Açı');
  const degrees = r.degrees();
  if (degrees.length === 1) { r.take(/#\d+d/); return checkAngle(degrees[0], 'Açı'); }
  if (degrees.length > 1) fail('Paralelkenar için tek bir açı yazın; komşu açı 180° − açıdır.');
  return undefined;
}

export function readParallelogram(r: Reader): LocalShape {
  let m: RegExpMatchArray | null;
  const notes: string[] = [];
  const len = (ref: string, what: string) => checkLength(r.value(ref), what);
  let a: number | undefined, b: number | undefined, h: number | undefined;
  if ((m = r.take(new RegExp(`\\byan kenar\\w* (${L})`)))) b = len(m[1], 'Yan kenar');
  if ((m = r.take(new RegExp(`\\btaban\\w* (${L})`)))) a = len(m[1], 'Taban');
  if ((m = r.take(new RegExp(`\\byukseklig\\w* (${L})`)))) h = len(m[1], 'Yükseklik');
  if ((m = r.take(new RegExp(`\\bkenar\\w* (${L})${SEP}(${L})`)))) { a = len(m[1], 'Kenar'); b = len(m[2], 'Kenar'); }
  else if ((m = r.take(new RegExp(`\\b(?:bir |diger )?kenar\\w* (${L})`)))) { if (a === undefined) a = len(m[1], 'Kenar'); else b = len(m[1], 'Kenar'); }
  let angle = readAngle(r);
  const bare = r.lengths();
  if (bare.length > 2) fail('Paralelkenar için iki kenar ve bir açı yazın. Örneğin: “kenarları 5 ve 3, açısı 60 derece olan paralelkenar”.');
  for (const value of bare) { if (a === undefined) a = checkLength(value, 'Kenar'); else if (b === undefined) b = checkLength(value, 'Kenar'); }
  r.s = r.s.replace(/#\d+(?![\dd])/g, ' ');
  const explicit = [a, b, h, angle].some(v => v !== undefined);
  if (angle !== undefined && Math.abs(angle - 90) < 1e-9) notes.push('Açı 90° olduğu için şekil bir dikdörtgendir.');
  if (a === undefined) { a = 5; if (explicit) notes.push('Taban 5 birim alındı.'); }
  if (h !== undefined) {
    if (b !== undefined && angle === undefined) {
      if (h > b) fail('Yükseklik yan kenardan uzun olamaz.');
      angle = toDeg(Math.asin(h / b));
    } else {
      if (angle === undefined) { angle = 60; notes.push('Açı 60° alındı.'); }
      b = h / Math.sin(toRad(angle));
    }
  }
  if (b === undefined) { b = 3; if (explicit) notes.push('Yan kenar 3 birim alındı.'); }
  if (angle === undefined) { angle = 60; if (explicit) notes.push('Açı 60° alındı.'); }
  return {
    local: parallelogram(a, b, angle), notes, explicit, snap: true,
    summary: `kenarlar ${trNum(a)} ve ${trNum(b)} br, açı ${trNum(angle)}°`, kind: 'polygon', noun: 'paralelkenar',
  };
}

export function readRhombus(r: Reader): LocalShape {
  let m: RegExpMatchArray | null;
  const notes: string[] = [];
  const len = (ref: string, what: string) => checkLength(r.value(ref), what);
  let p: number | undefined, q: number | undefined, a: number | undefined, h: number | undefined;
  if ((m = r.take(new RegExp(`\\bkosegen\\w* (${L})${SEP}(${L})`)))) { p = len(m[1], 'Köşegen'); q = len(m[2], 'Köşegen'); }
  else if ((m = r.take(new RegExp(`\\bkosegen\\w* (${L})`)))) p = len(m[1], 'Köşegen');
  if ((m = r.take(new RegExp(`\\bkenar\\w* (${L})|(${L}) kenarli`)))) a = len(m[1] ?? m[2], 'Kenar');
  if ((m = r.take(new RegExp(`\\byukseklig\\w* (${L})`)))) h = len(m[1], 'Yükseklik');
  let angle = readAngle(r);
  const bare = r.lengths();
  if (bare.length === 1 && a === undefined) { a = checkLength(bare[0], 'Kenar'); r.take(new RegExp(`(${L})`)); }
  else if (bare.length === 2 && p === undefined) { [p, q] = bare.map(x => checkLength(x, 'Köşegen')); r.take(new RegExp(`(${L})${SEP}(${L})`)); notes.push('İki sayı köşegen olarak alındı.'); }
  noLeftovers(r, 'kenarı 4, açısı 60 derece olan eşkenar dörtgen');
  const explicit = [p, q, a, h, angle].some(v => v !== undefined);
  if (p !== undefined && q === undefined && a !== undefined) {
    if (p >= 2 * a) fail('Köşegen, kenarın iki katından kısa olmalı.');
    q = 2 * Math.sqrt(a * a - p * p / 4);
  }
  if (p !== undefined && q !== undefined) {
    const local = [{ x: -p / 2, y: 0 }, { x: 0, y: -q / 2 }, { x: p / 2, y: 0 }, { x: 0, y: q / 2 }];
    const side = Math.hypot(p / 2, q / 2);
    return { local, notes, explicit, snap: true, summary: `köşegenler ${trNum(p)} ve ${trNum(q)}, kenar ${trNum(side)} br`, kind: 'polygon', noun: 'eşkenar dörtgen' };
  }
  if (p !== undefined) fail('Eşkenar dörtgen için iki köşegeni ya da kenarla bir köşegeni yazın. Örneğin: “köşegenleri 6 ve 8 olan eşkenar dörtgen”.');
  if (a === undefined) { a = 4; if (explicit) notes.push('Kenar 4 birim alındı.'); }
  if (h !== undefined && angle === undefined) {
    if (h > a) fail('Yükseklik kenardan uzun olamaz.');
    angle = toDeg(Math.asin(h / a));
  }
  if (angle === undefined) { angle = 60; if (explicit) notes.push('Açı 60° alındı.'); }
  if (Math.abs(angle - 90) < 1e-9) notes.push('Açı 90° olduğu için şekil bir karedir.');
  return { local: parallelogram(a, a, angle), notes, explicit, snap: true, summary: `kenar ${trNum(a)} br, açı ${trNum(angle)}°`, kind: 'polygon', noun: 'eşkenar dörtgen' };
}

// ---------------------------------------------------------------------------
// Yamuk
// ---------------------------------------------------------------------------
export function readTrapezoid(r: Reader): LocalShape {
  let m: RegExpMatchArray | null;
  const notes: string[] = [];
  const len = (ref: string, what: string) => checkLength(r.value(ref), what);
  const isosceles = r.has(/\bikizkenar/), right = r.has(/\bdik yamu/);
  let a: number | undefined, b: number | undefined, h: number | undefined, leg: number | undefined;
  if ((m = r.take(new RegExp(`\\b(?:alt|buyuk|uzun) taban\\w* (${L})`)))) a = len(m[1], 'Alt taban');
  if ((m = r.take(new RegExp(`\\b(?:ust|kucuk|kisa) taban\\w* (${L})`)))) b = len(m[1], 'Üst taban');
  if ((m = r.take(new RegExp(`\\btaban\\w* (${L})${SEP}(${L})`)))) { a = len(m[1], 'Taban'); b = len(m[2], 'Taban'); }
  if ((m = r.take(new RegExp(`\\byukseklig\\w* (${L})`)))) h = len(m[1], 'Yükseklik');
  if ((m = r.take(new RegExp(`\\b(?:yan|esit|egik) kenar\\w* (${L})|\\bbacak\\w* (${L})`)))) leg = len(m[1] ?? m[2], 'Yan kenar');
  const bare = r.lengths();
  if (bare.length > 3) fail('Yamuk için iki taban ve yükseklik yazın. Örneğin: “tabanları 6 ve 4, yüksekliği 3 olan yamuk”.');
  const fill = bare.map(x => checkLength(x, 'Uzunluk'));
  if (a === undefined && fill.length) a = fill.shift();
  if (b === undefined && fill.length) b = fill.shift();
  if (h === undefined && leg === undefined && fill.length) h = fill.shift();
  r.s = r.s.replace(/#\d+(?![\dd])/g, ' ');
  noLeftovers(r, 'tabanları 6 ve 4, yüksekliği 3 olan yamuk');
  const explicit = [a, b, h, leg].some(v => v !== undefined);
  if (a === undefined) { a = 6; if (explicit) notes.push('Alt taban 6 birim alındı.'); }
  if (b === undefined) { b = a / 2; if (explicit) notes.push(`Üst taban ${trNum(b)} birim alındı.`); }
  if (Math.abs(a - b) < 1e-9) fail('Yamuğun tabanları farklı uzunlukta olmalı; eşit tabanlarla paralelkenar olur.');
  const kind = right ? 'dik yamuk' : isosceles || leg !== undefined ? 'ikizkenar yamuk' : 'yamuk';
  if (h === undefined && leg !== undefined) {
    const half = Math.abs(a - b) / 2;
    if (leg <= half) fail('Yan kenar, tabanların farkının yarısından uzun olmalı.');
    h = right ? leg : Math.sqrt(leg * leg - half * half);
  }
  if (h === undefined) { h = 3; if (explicit) notes.push('Yükseklik 3 birim alındı.'); }
  const offset = right ? 0 : kind === 'ikizkenar yamuk' ? (a - b) / 2 : (a - b) / 4;
  const local = [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: offset + b, y: h }, { x: offset, y: h }];
  return { local, notes, explicit, snap: true, summary: `tabanlar ${trNum(a)} ve ${trNum(b)}, yükseklik ${trNum(h)} br`, kind: 'polygon', noun: kind };
}

// ---------------------------------------------------------------------------
// Deltoid
// ---------------------------------------------------------------------------
export function readKite(r: Reader): LocalShape {
  let m: RegExpMatchArray | null;
  const notes: string[] = [];
  const len = (ref: string, what: string) => checkLength(r.value(ref), what);
  let p: number | undefined, q: number | undefined, short: number | undefined, long: number | undefined;
  if ((m = r.take(new RegExp(`\\bkosegen\\w* (${L})${SEP}(${L})`)))) { p = len(m[1], 'Köşegen'); q = len(m[2], 'Köşegen'); }
  if ((m = r.take(new RegExp(`\\bkisa kenar\\w* (${L})`)))) short = len(m[1], 'Kısa kenar');
  if ((m = r.take(new RegExp(`\\buzun kenar\\w* (${L})`)))) long = len(m[1], 'Uzun kenar');
  if ((m = r.take(new RegExp(`\\bkenar\\w* (${L})${SEP}(${L})`)))) { const [x, y] = [len(m[1], 'Kenar'), len(m[2], 'Kenar')]; short = Math.min(x, y); long = Math.max(x, y); }
  noLeftovers(r, 'köşegenleri 6 ve 4 olan deltoid');
  const explicit = [p, q, short, long].some(v => v !== undefined);
  if (short !== undefined || long !== undefined) {
    if (short === undefined || long === undefined) fail('Deltoid için kısa ve uzun kenarları birlikte yazın. Örneğin: “kısa kenarları 3, uzun kenarları 5 olan deltoid”.');
    const w = q !== undefined ? q / 2 : 0.6 * Math.min(short!, long!);
    if (w >= Math.min(short!, long!)) fail('Bu köşegen bu kenarlarla deltoid oluşturmaz.');
    if (q === undefined) notes.push(`Kısa köşegen ${trNum(2 * w)} birim alındı.`);
    const lower = Math.sqrt(long! * long! - w * w), upper = Math.sqrt(short! * short! - w * w);
    const local = [{ x: 0, y: 0 }, { x: w, y: lower }, { x: 0, y: lower + upper }, { x: -w, y: lower }];
    return { local, notes, explicit, snap: true, summary: `kenarlar ${trNum(short!)} ve ${trNum(long!)} br`, kind: 'polygon', noun: 'deltoid' };
  }
  const P = p ?? 6, Q = q ?? 4;
  const local = [{ x: 0, y: 0 }, { x: Q / 2, y: 2 * P / 3 }, { x: 0, y: P }, { x: -Q / 2, y: 2 * P / 3 }];
  if (p !== undefined) notes.push('Simetri köşegeni ilk yazılan köşegen alındı.');
  return { local, notes, explicit, snap: true, summary: `köşegenler ${trNum(P)} ve ${trNum(Q)} br`, kind: 'polygon', noun: 'deltoid' };
}

/** Ölçüsüz "dörtgen çiz": genel bir dışbükey dörtgen */
export function defaultQuad(r: Reader): LocalShape {
  noLeftovers(r, 'köşeleri (0;0), (5;0), (4;3), (1;3) olan dörtgen');
  return { local: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 4, y: 3 }, { x: 1, y: 3.5 }], notes: [], explicit: false, snap: true, summary: 'genel dörtgen', kind: 'polygon', noun: 'dörtgen' };
}

/** "ABCDE çokgeni" yeni köşelerle: düzgün çokgen düzeninde */
export function namedPolygonLayout(n: number): LocalShape {
  const local = regularPolygonVertices(n, 3);
  return { local, notes: ['Köşeler düzgün çokgen düzeninde yerleştirildi.'], explicit: false, summary: `${n} köşe`, kind: 'polygon', noun: 'çokgen', originCentered: true };
}
