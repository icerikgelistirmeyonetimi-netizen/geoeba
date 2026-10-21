import type { CircleObject, EllipseObject, PointObject } from '@/types/math';
import type { CommandHandler } from '../types';
import { type CommandScene, fail, trNum } from '../scene';
import { compileMathExpression, validateMathExpression } from '../../parser';

export const family = { id: 'conics', title: 'Denklem, eşitsizlik ve parametrik şekiller' };

// ------------------------------------------------------------------------------------------------ yazım hazırlığı

type Op = '<=' | '<' | '>=' | '>';
const OP_SYMBOL: Record<Op, string> = { '<=': '≤', '<': '<', '>=': '≥', '>': '>' };
const FUNCTION_WORDS = /^(?:sin|cos|tan|sqrt|abs|ln|log|exp|pi|kok|teta)$/i;

/** Sözlü ve tipografik yazımları formül yazımına çevirir: "x kare artı y kare küçük eşittir 9" → "x^2 + y^2 <= 9". */
function prepare(raw: string): string {
  return raw
    .replace(/²/g, '^2').replace(/³/g, '^3').replace(/[−–]/g, '-').replace(/[·×]/g, '*').replace(/θ/g, 't')
    .replace(/≤|=</g, '<=').replace(/≥|=>/g, '>=')
    .replace(/küçük\s+(?:ya\s+da\s+|veya\s+)?eşittir/giu, '<=').replace(/büyük\s+(?:ya\s+da\s+|veya\s+)?eşittir/giu, '>=')
    .replace(/(?<![\p{L}])küçüktür(?![\p{L}])/giu, '<').replace(/(?<![\p{L}])büyüktür(?![\p{L}])/giu, '>')
    .replace(/(?<![\p{L}])([xy)])\s*kare(?![\p{L}])/giu, '$1^2')
    .replace(/(?<![\p{L}])artı(?![\p{L}])/giu, '+').replace(/(?<![\p{L}])eksi(?![\p{L}])/giu, '-')
    .replace(/(?<![\p{L}])bölü(?![\p{L}])/giu, '/').replace(/(?<![\p{L}])çarpı(?![\p{L}])/giu, '*')
    .replace(/(?<![\p{L}])teta(?![\p{L}])/giu, 't');
}

/** Formülün önündeki ve arkasındaki Türkçe sözcükleri atar ("bölgesini çiz", "eğrisini göster"). */
function stripWords(expression: string, side: 'start' | 'end'): string {
  const words = expression.trim().split(/\s+/);
  const isWord = (w: string) => /^[\p{L}]{3,}$/u.test(w) && !FUNCTION_WORDS.test(w);
  if (side === 'end') { while (words.length && isWord(words[words.length - 1])) words.pop(); }
  else { while (words.length && isWord(words[0])) words.shift(); }
  return words.join(' ').trim();
}

// ------------------------------------------------------------------------------------------------ 2. dereceden polinom

type Poly = Map<string, number>;
const key = (i: number, j: number) => `${i},${j}`;
const coef = (p: Poly, i: number, j: number) => p.get(key(i, j)) ?? 0;
function add(a: Poly, b: Poly, sign = 1): Poly {
  const out = new Map(a);
  for (const [k, v] of b) out.set(k, (out.get(k) ?? 0) + sign * v);
  return out;
}
function mul(a: Poly, b: Poly): Poly {
  const out: Poly = new Map();
  for (const [ka, va] of a) for (const [kb, vb] of b) {
    const [ia, ja] = ka.split(',').map(Number), [ib, jb] = kb.split(',').map(Number);
    const k = key(ia + ib, ja + jb);
    out.set(k, (out.get(k) ?? 0) + va * vb);
  }
  return out;
}
const constant = (n: number): Poly => new Map([[key(0, 0), n]]);
const degree = (p: Poly) => Math.max(0, ...[...p].filter(([, v]) => Math.abs(v) > 1e-12).map(([k]) => k.split(',').map(Number).reduce((s, n) => s + n, 0)));

/** x ve y cinsinden en çok 2. dereceden polinomu çözümler; başka bir şey varsa null. */
export function parsePolynomial(source: string): Poly | null {
  const tokens = source.replace(/\s+/g, '').match(/\d+(?:[.,]\d+)?|[xy]|[-+*/^()]/gi);
  if (!tokens || tokens.join('').length !== source.replace(/\s+/g, '').length) return null;
  let i = 0;
  const peek = () => tokens[i];
  const expr = (): Poly | null => {
    let left = term();
    while (left && (peek() === '+' || peek() === '-')) {
      const op = tokens[i++];
      const right = term();
      if (!right) return null;
      left = add(left, right, op === '+' ? 1 : -1);
    }
    return left;
  };
  const term = (): Poly | null => {
    let left = factor();
    while (left && i < tokens.length && (peek() === '*' || peek() === '/' || /^[\dxy(]/i.test(peek()))) {
      const op = peek() === '*' || peek() === '/' ? tokens[i++] : '*';
      const right = factor();
      if (!right) return null;
      if (op === '/') {
        if (degree(right) !== 0 || Math.abs(coef(right, 0, 0)) < 1e-12) return null;
        left = mul(left, constant(1 / coef(right, 0, 0)));
      } else left = mul(left, right);
    }
    return left;
  };
  const factor = (): Poly | null => {
    if (peek() === '-') { i++; const f = factor(); return f ? mul(f, constant(-1)) : null; }
    if (peek() === '+') { i++; return factor(); }
    let base = primary();
    if (base && peek() === '^') {
      i++;
      const exponent = tokens[i++];
      if (!exponent || !/^\d+$/.test(exponent) || Number(exponent) > 4) return null;
      let result = constant(1);
      for (let k = 0; k < Number(exponent); k++) result = mul(result, base);
      base = result;
    }
    return base;
  };
  const primary = (): Poly | null => {
    const t = tokens[i++];
    if (t === undefined) return null;
    if (/^\d/.test(t)) return constant(Number(t.replace(',', '.')));
    if (/^x$/i.test(t)) return new Map([[key(1, 0), 1]]);
    if (/^y$/i.test(t)) return new Map([[key(0, 1), 1]]);
    if (t === '(') { const inner = expr(); if (!inner || tokens[i++] !== ')') return null; return inner; }
    return null;
  };
  const result = expr();
  return result && i === tokens.length && degree(result) <= 2 ? result : null;
}

type Conic = { kind: 'circle'; center: { x: number; y: number }; radius: number } | { kind: 'ellipse'; center: { x: number; y: number }; rx: number; ry: number };

/** P(x, y) = 0 eksenlere paralel çember ya da elips mi? A>0 olacak biçimde normalleştirilmiş katsayıyla döner. */
export function classifyConic(p: Poly): { conic: Conic; leading: number } | null {
  const A = coef(p, 2, 0), C = coef(p, 0, 2), B = coef(p, 1, 1), D = coef(p, 1, 0), E = coef(p, 0, 1), F = coef(p, 0, 0);
  if (Math.abs(B) > 1e-12 || Math.abs(A) < 1e-12 || Math.abs(C) < 1e-12 || A * C < 0) return null;
  const cx = -D / (2 * A), cy = -E / (2 * C);
  const k = D * D / (4 * A) + E * E / (4 * C) - F;
  const rx2 = k / A, ry2 = k / C;
  if (!(rx2 > 1e-12 && ry2 > 1e-12)) return null;
  // "+ 0": −0'ı 0 yapar (merkez koordinatında "-0" görünmesin).
  const tidy = (n: number) => (Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : n) + 0;
  const center = { x: tidy(cx), y: tidy(cy) };
  const conic: Conic = Math.abs(rx2 - ry2) < 1e-9
    ? { kind: 'circle', center, radius: tidy(Math.sqrt(rx2)) }
    : { kind: 'ellipse', center, rx: tidy(Math.sqrt(rx2)), ry: tidy(Math.sqrt(ry2)) };
  return { conic, leading: A };
}

function centerPoint(scene: CommandScene, center: { x: number; y: number }): PointObject {
  const existing = scene.points().find(p => !p.construction && Math.abs(p.x - center.x) < 1e-9 && Math.abs(p.y - center.y) < 1e-9);
  return existing ?? scene.addPoint(center);
}

// ------------------------------------------------------------------------------------------------ eşitsizlik bölgeleri

const INEQUALITY = /(<=|>=|<|>)/;

function splitInequality(raw: string): { left: string; op: Op; right: string } | null {
  const prepared = prepare(raw);
  const parts = prepared.split(INEQUALITY);
  if (parts.length !== 3) return null;
  return { left: stripWords(parts[0], 'start'), op: parts[1] as Op, right: stripWords(parts[2], 'end') };
}

export const regionInequality: CommandHandler = {
  id: 'conics.region',
  examples: ['x^2 + y^2 <= 9', 'x² + y² < 16 bölgesini çiz', '(x-1)^2 + (y-2)^2 ≤ 4', 'x^2/9 + y^2/4 <= 1', 'x^2 + y^2 - 2x + 4y - 4 <= 0', 'x kare artı y kare küçük eşittir 25'],
  match(c) {
    const parts = splitInequality(c.raw);
    if (!parts || !/[xy]/i.test(parts.left + parts.right)) return 0;
    const left = parsePolynomial(parts.left), right = parsePolynomial(parts.right);
    return left && right && degree(add(left, right, -1)) === 2 ? 97 : 0;
  },
  run(c, scene) {
    const parts = splitInequality(c.raw)!;
    const p = add(parsePolynomial(parts.left)!, parsePolynomial(parts.right)!, -1);
    const found = classifyConic(p);
    if (!found) fail('Bu eşitsizlik eksenlere paralel bir çember ya da elips bölgesi değil. Örnek: “x^2 + y^2 <= 9” ya da “x^2/9 + y^2/4 <= 1”.');
    // P = sol − sağ; baş katsayı pozitifse iç bölge P < 0 demektir.
    const inside = found.leading > 0 ? parts.op === '<=' || parts.op === '<' : parts.op === '>=' || parts.op === '>';
    const written = `${parts.left} ${OP_SYMBOL[parts.op]} ${parts.right}`.replace(/\^2/g, '²');
    if (!inside) {
      fail(`${written} şeklin DIŞINDAKİ bölgedir; uygulama dış bölgeyi tarayamıyor. Sınırı çizmek için eşittir kullanın (ör. “${parts.left.replace(/\^2/g, '²')} = ${parts.right}”) ya da iç bölge için ≤ yazın.`);
    }
    const strict = parts.op === '<' || parts.op === '>';
    const edgeNote = strict ? ' Sınır bölgeye dahil değil (kesikli sınır çizimi henüz yok).' : ' Sınır da bölgeye dahil.';
    const center = centerPoint(scene, found.conic.center);
    if (found.conic.kind === 'circle') {
      const r = found.conic.radius;
      scene.addCircle({ centerId: center.id, radius: r }, { label: `${center.label} Dairesi (r = ${trNum(r)})`, fillOpacity: 0.25, showArea: scene.options.showMeasurementsOnCreate !== false }) as CircleObject;
      scene.say(`${written} bölgesi çizildi: merkezi ${center.label} (${trNum(center.x)}; ${trNum(center.y)}), yarıçapı ${trNum(r)} olan daire.${edgeNote}`);
    } else {
      const { rx, ry } = found.conic;
      const ellipse = scene.addEllipse(center.id, rx, ry) as EllipseObject;
      scene.update(ellipse.id, { fillOpacity: 0.25 });
      scene.say(`${written} bölgesi çizildi: merkezi ${center.label} (${trNum(center.x)}; ${trNum(center.y)}), yatay yarıçapı ${trNum(rx)}, dikey yarıçapı ${trNum(ry)} olan elips bölgesi.${edgeNote}`);
    }
  },
};

export const halfPlane: CommandHandler = {
  id: 'conics.halfPlane',
  examples: ['y >= 2x + 1', 'y < x^2 - 4 bölgesini çiz'],
  match(c) {
    const parts = splitInequality(c.raw);
    if (!parts) return 0;
    const yLeft = /^y$/i.test(parts.left), yRight = /^y$/i.test(parts.right);
    if (yLeft === yRight) return 0;
    const expression = yLeft ? parts.right : parts.left;
    return /x/i.test(expression) || /^-?\d/.test(expression) ? 96 : 0;
  },
  run(c, scene) {
    const parts = splitInequality(c.raw)!;
    const yLeft = /^y$/i.test(parts.left);
    const expression = yLeft ? parts.right : parts.left;
    const op: Op = yLeft ? parts.op : ({ '<=': '>=', '<': '>', '>=': '<=', '>': '<' } as const)[parts.op];
    const check = validateMathExpression(expression);
    if (!check.ok) fail(`Sınır ifadesi anlaşılamadı: ${check.error}`);
    scene.addFunction(expression, { label: `y = ${expression}` });
    const side = op === '>=' || op === '>' ? 'üst' : 'alt';
    scene.say(`y ${OP_SYMBOL[op]} ${expression} bölgesinin sınırı y = ${expression} çizildi. Bölge bu çizginin ${side} tarafıdır${op.length === 1 ? ' (sınır dahil değil)' : ' (sınır dahil)'}; uygulama bölgeleri henüz taramıyor.`);
  },
};

// ------------------------------------------------------------------------------------------------ parametrik çember / elips

const PARAMETRIC = /\bx\s*(?:\(\s*t\s*\))?\s*=\s*(.+?)\s*(?:,|;|\bve\b)\s*y\s*(?:\(\s*t\s*\))?\s*=\s*(.+)$/i;

function parametricParts(raw: string): { xExpr: string; yExpr: string } | null {
  const m = prepare(raw).match(PARAMETRIC);
  if (!m) return null;
  const clean = (e: string, side: 'x' | 'y') => {
    const trimmed = side === 'y' ? stripWords(e, 'end') : e.trim();
    return trimmed.replace(/(sin|cos|tan)\s+(-?\d*(?:[.,]\d+)?\s*\*?\s*t)\b/gi, '$1($2)');
  };
  const xExpr = clean(m[1], 'x'), yExpr = clean(m[2], 'y');
  return /\bt\b|\dt\b|\(t\)/i.test(xExpr) && /\bt\b|\dt\b|\(t\)/i.test(yExpr) ? { xExpr, yExpr } : null;
}

export const parametric: CommandHandler = {
  id: 'conics.parametric',
  examples: ['x = 3cos(t), y = 3sin(t)', 'x = 2 + 3cos(t) ve y = 1 + 3sin(t) eğrisini çiz', 'x = 4cos(t), y = 2sin(t)'],
  match(c) { return parametricParts(c.raw) ? 98 : 0; },
  run(c, scene) {
    const { xExpr, yExpr } = parametricParts(c.raw)!;
    const toX = (e: string) => e.replace(/\bt\b/gi, 'x').replace(/(\d)t\b/gi, '$1x');
    const fx = compileMathExpression(toX(xExpr), []), fy = compileMathExpression(toX(yExpr), []);
    if (!fx || !fy) fail(`Parametrik ifade anlaşılamadı. Örnek: “x = 3cos(t), y = 3sin(t)”.`);
    const samples = Array.from({ length: 96 }, (_, k) => {
      const t = (k / 96) * 2 * Math.PI;
      return { x: fx(t), y: fy(t) };
    });
    if (samples.some(s => !Number.isFinite(s.x) || !Number.isFinite(s.y))) fail('Parametrik eğri t ∈ [0, 2π) aralığında tanımsız değerler veriyor.');
    const xs = samples.map(s => s.x), ys = samples.map(s => s.y);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const rx = (Math.max(...xs) - Math.min(...xs)) / 2, ry = (Math.max(...ys) - Math.min(...ys)) / 2;
    const onEllipse = rx > 1e-9 && ry > 1e-9 && samples.every(s => Math.abs(((s.x - cx) / rx) ** 2 + ((s.y - cy) / ry) ** 2 - 1) < 1e-6);
    if (!onEllipse) {
      fail(`x = ${xExpr}, y = ${yExpr} bir çember ya da elips değil. Uygulama şimdilik yalnızca x = a + r·cos(t), y = b + r·sin(t) biçimindeki parametrik çember ve elipsleri çizebiliyor.`);
    }
    const tidy = (n: number) => (Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : Number(n.toFixed(9))) + 0;
    const center = centerPoint(scene, { x: tidy(cx), y: tidy(cy) });
    if (Math.abs(rx - ry) < 1e-9) {
      scene.addCircle({ centerId: center.id, radius: tidy(rx) });
      scene.say(`x = ${xExpr}, y = ${yExpr} parametrik çemberi çizildi: merkezi ${center.label} (${trNum(center.x)}; ${trNum(center.y)}), yarıçapı ${trNum(tidy(rx))}.`);
    } else {
      scene.addEllipse(center.id, tidy(rx), tidy(ry));
      scene.say(`x = ${xExpr}, y = ${yExpr} parametrik elipsi çizildi: merkezi ${center.label} (${trNum(center.x)}; ${trNum(center.y)}), yatay yarıçapı ${trNum(tidy(rx))}, dikey yarıçapı ${trNum(tidy(ry))}.`);
    }
  },
};

export const handlers: CommandHandler[] = [parametric, regionInequality, halfPlane];
