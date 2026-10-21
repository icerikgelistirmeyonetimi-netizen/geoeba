import type { FunctionObject, MathObject, Point2D, SliderObject } from '@/types/math';
import type { CommandHandler } from '../../types';
import { type Clause, type VerbKind, fold } from '../../text';
import { type CommandScene, NAMED_COLORS, colorIn, fail, trNum } from '../../scene';
import {
  BUTTON_NOUN, CHECKBOX_NOUN, FOREIGN_EDIT_VERBS, FRACTION_NOUN, FUNCTION_NOUN, INPUT_NOUN, NUMBER_WORDS, SLIDER_NOUN, TEXT_NOUN, WIDGET_NOUN,
  contextSliders, describeTargets, findFunction, findSlider, finiteVerbsOf, functionName, functionsInClause, hasForeignEditVerb, isStopword,
  labelPoint, nounAfterLabel, rawQuotes, rawWords, reparseWithoutQuotes, sliderByName, slidersInClause, widgetTargets,
} from './shared';

const round2 = (n: number) => Number(n.toFixed(2));

// ---------------------------------------------------------------------------
// Yazı notları
// ---------------------------------------------------------------------------

/** Tuvaldeki yaklaşık genişlik (dünya birimi; varsayılan 44 px/birim yakınlaştırmada). */
const textWidth = (text: string, fontSize: number) => (text.length * fontSize * 0.55) / 44;

function objectBox(scene: CommandScene, obj: MathObject): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const pts: Point2D[] = [];
  if ('x' in obj && typeof obj.x === 'number' && typeof obj.y === 'number') pts.push({ x: obj.x, y: obj.y });
  for (const id of scene.definingPointIds(obj)) { const p = scene.get(id); if (p?.type === 'point') pts.push({ x: p.x, y: p.y }); }
  const circle = scene.circleOf(obj);
  if (circle) pts.push({ x: circle.center.x - circle.radius, y: circle.center.y - circle.radius }, { x: circle.center.x + circle.radius, y: circle.center.y + circle.radius });
  if (obj.type === 'ellipse') {
    const c = scene.get(obj.centerPointId);
    if (c?.type === 'point') pts.push({ x: c.x - obj.radiusX, y: c.y - obj.radiusY }, { x: c.x + obj.radiusX, y: c.y + obj.radiusY });
  }
  if (!pts.length) return null;
  return { minX: Math.min(...pts.map(p => p.x)), maxX: Math.max(...pts.map(p => p.x)), minY: Math.min(...pts.map(p => p.y)), maxY: Math.max(...pts.map(p => p.y)) };
}

/** Yazının konumu: koordinat, bir noktanın ya da şeklin yanı/üstü/altı/içi; yoksa boş bir yer. */
function textAnchor(c: Clause, scene: CommandScene, width: number): { pos: Point2D; desc: string } {
  const t = c.text;
  if (c.coords.length) {
    const p = c.coords[0];
    return { pos: p, desc: `(${trNum(p.x)}; ${trNum(p.y)}) konumuna` };
  }
  const where = /\balt(?:ina|inda|ta)/.test(t) ? 'alt' : /\b(?:ust(?:une|unde|te)|uzerine|uzerinde|tepesine)/.test(t) ? 'ust'
    : /\bsol(?:una|unda|da)/.test(t) ? 'sol' : /\bic(?:ine|inde|i\b)|\borta(?:sina|sinda)|\bmerkez(?:ine|inde)/.test(t) ? 'ic' : 'yan';
  const whereText = { alt: 'altına', ust: 'üstüne', sol: 'soluna', ic: 'içine', yan: 'yanına' }[where];
  for (let i = 0; i < c.labels.length; i++) {
    const ref = c.labels[i];
    const typed = nounAfterLabel(c, i);
    let list = scene.resolveLabel(ref, typed);
    if (!list.length) { const fn = findFunction(scene, ref.text); if (fn) list = [fn]; }
    if (!list.length) fail(`${ref.text} bulunamadı. Yazıyı koymak için var olan bir noktanın ya da şeklin adını yazın, ya da koordinat verin: “(2, 3) noktasına "tepe" yaz”.`);
    const point = labelPoint(scene, ref, typed, list) ?? (typed?.includes('point') ? list.find(o => o.type === 'point') : undefined);
    if (point && point.type === 'point') {
      const offset = { yan: { x: 0.3, y: 0.3 }, ic: { x: 0.3, y: 0.3 }, ust: { x: -width / 2, y: 0.6 }, alt: { x: -width / 2, y: -0.8 }, sol: { x: -0.3 - width, y: 0.3 } }[where];
      return { pos: { x: round2(point.x + offset.x), y: round2(point.y + offset.y) }, desc: `${point.label} noktasının ${whereText}` };
    }
    const shape = list.find(o => o.type !== 'point' && objectBox(scene, o));
    if (!shape) continue;
    const box = objectBox(scene, shape)!;
    const cx = (box.minX + box.maxX) / 2, cy = (box.minY + box.maxY) / 2;
    const pos = { ic: { x: cx - width / 2, y: cy }, ust: { x: cx - width / 2, y: box.maxY + 0.5 }, alt: { x: cx - width / 2, y: box.minY - 0.8 },
      sol: { x: box.minX - 0.4 - width, y: cy }, yan: { x: box.maxX + 0.4, y: cy } }[where];
    const name = shape.type === 'slider' ? shape.variableName : shape.type === 'function' ? functionName(shape) : shape.label;
    return { pos: { x: round2(pos.x), y: round2(pos.y) }, desc: `${name} ${whereText}` };
  }
  return { pos: scene.freeSpot(), desc: 'boş bir yere' };
}

function fontSizeOf(c: Clause): { size: number; note: string } {
  const m = c.text.match(/(#\d+)\s*(?:punto|pt|px|piksel)/) ?? c.text.match(/(?:boyut\w*|punto\w*|font\w*|buyuklug\w*)\s*(?::|=)?\s*(#\d+)/);
  if (m) {
    const n = c.num(m[1]);
    const size = Math.min(72, Math.max(8, Math.round(n)));
    return { size, note: size !== n ? ` Yazı boyutu ${size} yapıldı (8–72 arası).` : '' };
  }
  if (/\b(?:buyuk|iri|kocaman|genis)/.test(c.text)) return { size: 18, note: '' };
  if (/\b(?:kucuk|minik|ufak)/.test(c.text)) return { size: 12, note: '' };
  return { size: 14, note: '' };
}

function addNotes(c: Clause, scene: CommandScene, texts: string[]) {
  const { size, note } = fontSizeOf(c);
  const color = colorIn(c);
  const widest = Math.max(...texts.map(s => textWidth(s, size)));
  const anchor = textAnchor(c, scene, widest);
  const gap = 0.7 * (size / 14);
  texts.forEach((text, i) => scene.addText(text, { x: anchor.pos.x, y: round2(anchor.pos.y - i * gap) }, { fontSize: size, color }));
  const quoted = texts.map(s => `“${s}”`).join(', ');
  scene.say(`${quoted} ${texts.length > 1 ? 'yazıları' : 'yazısı'} ${anchor.desc} eklendi.${note}`);
}

export const textHandler: CommandHandler = {
  id: 'algebra.text',
  examples: [
    '"Merhaba" yazısı ekle',
    '(2,3) noktasına "tepe" yaz',
    'A noktasının yanına "köşe" notu ekle',
    '"Alan = 12" yazısını büyük yaz',
    '"Alan = 12" yazısını kırmızı yaz',
    'ABC üçgeninin içine "iç bölge" yaz',
    '"Soru 1" başlığını 24 punto yaz',
  ],
  match(c, scene) {
    if (!rawQuotes(c.raw).length) return 0;
    const { clause: q } = reparseWithoutQuotes(c, scene);
    if (WIDGET_NOUN.test(q.text) || SLIDER_NOUN.test(q.text)) return 0;
    if (hasForeignEditVerb(q, ['scale']) && !/\b(?:yaz(?!i)|ekle|koy|olustur)/.test(q.text)) return 0;
    if (q.hasVerb('rename', 'delete', 'hide', 'move', 'select', 'copy') || /\b(?:degistir|guncelle|duzelt|duzenle)/.test(q.text)) return 0;
    if (!TEXT_NOUN.test(q.text) && !/\b(?:yaz(?!i)|ekle|koy|yerlestir|not al|not et)/.test(q.text)) return 0;
    return 54;
  },
  run(c, scene) {
    const { clause: q, quotes } = reparseWithoutQuotes(c, scene);
    const texts = quotes.map(s => s.trim()).filter(Boolean);
    if (!texts.length) fail('Tırnak içi boş. Eklenecek yazıyı tırnak içinde yazın, örneğin: “"Merhaba" yazısı ekle”.');
    addNotes(q, scene, texts);
  },
};

const CONTENT_STOP = /^(?:yan|alt|ust|sag|sol|uzer|ic|orta|yakin|nokta|kose|merkez|konum|koordinat|buyuk|kucuk|iri|kalin|ince|renk|yazi|metin|not|baslik|punto|tuval|ekran|sayfa|bos|ornek)/;

/** Tırnaksız yazı: "Merhaba yazısı ekle" → "Merhaba". Yazı sözcüğünden hemen önceki sade sözcükler (en fazla 4). */
function unquotedContent(c: Clause): string {
  const words = rawWords(c.raw);
  const noun = words.findIndex(w => TEXT_NOUN.test(w.folded));
  if (noun <= 0) return '';
  const content: string[] = [];
  for (let j = noun - 1; j >= 0 && content.length < 4; j--) {
    const w = words[j];
    if (!/^[\p{L}]+$/u.test(w.raw) || isStopword(w.folded) || CONTENT_STOP.test(w.folded) || w.folded in NAMED_COLORS || w.folded in NUMBER_WORDS) break;
    if (/^[A-ZÇĞİÖŞÜ]{1,3}$/.test(w.raw) || /(?:na|ne|ya|ye|da|de|ta|te)$/.test(w.folded) && j < noun - 1) break;
    content.unshift(w.raw);
  }
  return content.join(' ');
}

export const textWordsHandler: CommandHandler = {
  id: 'algebra.text.words',
  examples: ['Merhaba yazısı ekle', 'yazı ekle', 'not ekle', 'Soru yazısını koy', 'Çözüm notu ekle', 'metin ekle'],
  match(c) {
    if (rawQuotes(c.raw).length || !TEXT_NOUN.test(c.text) || WIDGET_NOUN.test(c.text) || c.definition || c.assignment) return 0;
    if (hasForeignEditVerb(c, ['scale', 'show', 'measure', 'play', 'stop']) || !/\b(?:ekle|koy|olustur|yerlestir|yaz(?!i))/.test(c.text)) return 0;
    if (/\b(?:degistir|guncelle|duzelt|duzenle)/.test(c.text)) return 0;
    return unquotedContent(c) ? 45 : 10;
  },
  run(c, scene) {
    const content = unquotedContent(c);
    if (content) { addNotes(c, scene, [content]); return; }
    scene.act({ kind: 'selectTool', tool: 'text' });
    scene.say('Yazı Ekle aracı seçildi: tuvalde yazının konacağı yere tıklayın. Doğrudan eklemek için yazıyı tırnak içinde yazın, örneğin: “"Merhaba" yazısı ekle”.');
  },
};

// ---------------------------------------------------------------------------
// Kesir modeli
// ---------------------------------------------------------------------------

const LOCATIVE_DENOMINATORS: Record<string, number> = { ikide: 2, ucte: 3, dortte: 4, beste: 5, altida: 6, yedide: 7, sekizde: 8, dokuzda: 9, onda: 10, yirmide: 20, otuzda: 30 };
const MODEL_WORD = /\b(?:pasta|serit|pizza|bant|cubuk|daire|dikdortgen)\s*model/;

function fractionParts(c: Clause): { numerator: number; denominator: number } | null {
  const t = c.text;
  let m = t.match(/(#\d+)\s+tam\s+(#\d+)\s*(?:\/|bolu)\s*(#\d+)/);
  if (m) { const d = c.num(m[3]); return { numerator: c.num(m[1]) * d + c.num(m[2]), denominator: d }; }
  m = t.match(/(#\d+)\s*(?:\/|bolu)\s*(#\d+)/);
  if (m) return { numerator: c.num(m[1]), denominator: c.num(m[2]) };
  // "dörtte üç", "dörtte bir" (tanımlık sanılan "bir" burada paydır)
  m = t.match(/\b(ikide|ucte|dortte|beste|altida|yedide|sekizde|dokuzda|onda|yirmide|otuzda)\s+(#\d+|bir\b)/);
  if (m) return { numerator: m[2] === 'bir' ? 1 : c.num(m[2]), denominator: LOCATIVE_DENOMINATORS[m[1]] };
  m = t.match(/(#\d+)\s+(?:de|da|te|ta)\s+(#\d+)/);
  if (m) return { numerator: c.num(m[2]), denominator: c.num(m[1]) };
  const num = t.match(/\bpay(?!da)\w*\s*(?::|=)?\s*(#\d+)/), den = t.match(/\bpayda\w*\s*(?::|=)?\s*(#\d+)/);
  if (num && den) return { numerator: c.num(num[1]), denominator: c.num(den[1]) };
  return null;
}

export const fractionHandler: CommandHandler = {
  id: 'algebra.fraction',
  examples: ['3/4 kesir modeli', 'üç bölü dört kesrini göster', "2/5'i şerit modeliyle göster", '5/8 pasta modeli', 'dörtte üç kesrini çiz', '1 tam 1/2 kesir modeli ekle'],
  match(c, scene) {
    if (c.definition || c.assignment || WIDGET_NOUN.test(c.text) || rawQuotes(c.raw).length) return 0;
    const noun = FRACTION_NOUN.test(c.text) || MODEL_WORD.test(c.text);
    if (!noun || hasForeignEditVerb(c, ['scale'])) return 0;
    const parts = fractionParts(c);
    // Var olan kesri değiştirmek ("kesri 2/3 yap") düzenleme ailesinindir.
    const editing = /\b(?:yap|olsun|degistir|guncelle)/.test(c.text) && !/\b(?:ekle|olustur|ciz|goster|koy|model)/.test(c.text) && scene.ofType('fraction').length > 0;
    if (editing) return 0;
    if (!parts && !c.hasVerb('create')) return 0;
    return 52;
  },
  run(c, scene) {
    const parts = fractionParts(c);
    const { numerator, denominator } = parts ?? { numerator: 1, denominator: 1 };
    const modelType = /say[ıi]\s+do[ğg]ru/i.test(c.raw) ? 'line' : /\b(?:serit|bant|cubuk|bar|dikdortgen)/.test(c.text) ? 'bar' : 'pie';
    const radiusRef = c.text.match(/(?:yaricap\w*|boyut\w*)\s*(?::|=)?\s*(#\d+)/);
    const radius = radiusRef ? c.num(radiusRef[1]) : /\bbuyuk/.test(c.text) ? 3.5 : /\bkucuk/.test(c.text) ? 1.5 : 2.5;
    if (!(radius > 0 && radius <= 50)) fail('Kesir modelinin boyutu 0 ile 50 arasında olmalı.');
    const wholes = Math.max(1, Math.ceil(numerator / Math.max(1, denominator)));
    const size = modelType === 'pie' ? { w: wholes * 2 * radius * 1.15, h: 2 * radius } : modelType === 'line' ? { w: wholes * 2 * radius + 1, h: 1.5 } : { w: 2 * radius, h: wholes * 1.2 };
    const pos = c.coords[0] ?? scene.placeShape(size.w, size.h);
    scene.addFraction(numerator, denominator, pos, { modelType, radius, color: colorIn(c) });
    scene.say(`${numerator}/${denominator} kesir modeli (${modelType === 'pie' ? 'pasta' : modelType === 'line' ? 'sayı doğrusu' : 'şerit'}) eklendi.${parts ? '' : ' Kesir yazılmadığı için 1/1 alındı; örneğin “3/4 kesir modeli” yazabilirsiniz.'}`);
  },
};

// ---------------------------------------------------------------------------
// Onay kutusu, düğme, girdi kutusu
// ---------------------------------------------------------------------------

/**
 * "onay kutusunu gizle", "düğmeyi sil" düzenleme ailesinindir; "gizle düğmesi", "oynat düğmesi", "ABC'yi gizleyen onay kutusu"
 * ise aracın görevini anlatır. Aracın adından hemen önceki sözcük ve sıfat-fiiller emir sayılmaz.
 */
const WIDGET_AHEAD = /\b[a-z]+(?:\s*\/\s*[a-z]+)?(?=\s(?:dugme|buton|(?:onay|isaret|secim) kutu|(?:girdi|giris|deger) (?:kutu|alan)))/g;
/** "gösterip gizleyen", "açıp kapatan": sıfat-fiile bağlanan -ip ulacı da aracın görevidir (cümle bölünmediyse). */
const CONVERB_BEFORE_PARTICIPLE = /\b[a-z]{2,}(?:ip|up)\s+(?=[a-z]{2,}(?:yan|yen|an|en)\b)/g;
const widgetMatch = (c: Clause, noun: RegExp, extra: VerbKind[]) => {
  if (!noun.test(c.text) || c.definition || c.assignment) return 0;
  const verbs = finiteVerbsOf(c.text.replace(CONVERB_BEFORE_PARTICIPLE, ' ').replace(WIDGET_AHEAD, ' '));
  if ([...FOREIGN_EDIT_VERBS, 'scale', ...extra].some(v => verbs.has(v as VerbKind))) return 0;
  return 52;
};

export const checkboxHandler: CommandHandler = {
  id: 'algebra.checkbox',
  examples: ['ABC için onay kutusu ekle', 'c1 ve AB için onay kutusu', 'ABC üçgenini gösteren onay kutusu ekle', 'seçili nesneler için onay kutusu oluştur', '"Çemberi göster" onay kutusu ekle', 'tüm çemberler için onay kutusu ekle'],
  match: c => widgetMatch(c, CHECKBOX_NOUN, ['show', 'measure', 'play', 'stop']),
  run(c, scene) {
    const targets = widgetTargets(c, scene, 'Onay kutusu');
    if (!targets.length) fail('Onay kutusunun gösterip gizleyeceği nesneleri yazın (ör. “ABC için onay kutusu ekle”) ya da önce seçin.');
    const label = rawQuotes(c.raw)[0]?.trim() || undefined;
    const box = scene.addCheckbox(targets.map(o => o.id), scene.widgetSpot(), { label });
    scene.say(`“${box.label}” onay kutusu eklendi (${describeTargets(targets)}). İşareti kaldırınca bu nesneler gizlenir.`);
  },
};

export const buttonHandler: CommandHandler = {
  id: 'algebra.button',
  examples: ['a kaydırıcısını oynatan düğme ekle', "c1'i gizleyen düğme ekle", "a'yı 0 yapan düğme", 'oynat düğmesi ekle', 'ABC üçgenini gösteren buton ekle', 'gizle/göster düğmesi ekle'],
  match: c => widgetMatch(c, BUTTON_NOUN, ['show', 'measure']),
  run(c, scene) {
    const t = c.text;
    const label = rawQuotes(c.raw)[0]?.trim() || undefined;
    const named = slidersInClause(c, scene);
    const spot = scene.widgetSpot();
    const setMatch = t.match(/(#\d+)\s*(?:e|a|ye|ya)?\s*(?:yapan|ayarlayan|esitleyen|getiren|ceken|atayan|donduren)/);
    if (setMatch) {
      if (named.sliders.length > 1) fail(`Düğme tek bir kaydırıcıya değer atar; ${named.sliders.map(s => s.variableName).join(', ')} arasından birini yazın.`);
      const slider = named.sliders[0] ?? (named.unknown.length ? undefined : contextSliders(c, scene)[0]);
      if (!slider) fail(named.unknown.length ? `${named.unknown[0]} adlı kaydırıcı bulunamadı.` : 'Düğmenin değiştireceği kaydırıcıyı yazın (ör. “a’yı 0 yapan düğme ekle”).');
      const value = c.num(setMatch[1]);
      const button = scene.addButton({ kind: 'setSlider', sliderId: slider.id, value }, spot, { label: label ?? `${slider.variableName} = ${trNum(value)}` });
      scene.say(`“${button.label}” düğmesi eklendi: tıklanınca ${slider.variableName} = ${trNum(value)} olur.`);
      return;
    }
    const toggleWords = /\b(?:gizle|goster|gorunur|kapa|ac(?:an|ip)\b)/.test(t);
    const animateWords = /\b(?:oynat|canlandir|animasyon|baslat|durdur)/.test(t);
    if (animateWords && !toggleWords) {
      if (named.unknown.length && !named.sliders.length) fail(`${named.unknown[0]} adlı kaydırıcı bulunamadı.`);
      const fromContext = [...scene.selection, ...scene.focus].map(id => scene.get(id)).filter((o): o is SliderObject => o?.type === 'slider');
      const sliders = named.sliders.length ? named.sliders : fromContext.length ? [...new Set(fromContext)] : scene.sliders();
      if (!sliders.length) fail('Oynatılacak kaydırıcı yok. Önce bir kaydırıcı oluşturun (ör. “a = 1”).');
      const button = scene.addButton({ kind: 'animate', sliderIds: sliders.map(s => s.id) }, spot, { label });
      scene.say(`“${button.label}” düğmesi eklendi (${sliders.map(s => s.variableName).join(', ')}). Tıklanınca görünür kaydırıcılar oynar ya da durur.`);
      return;
    }
    const targets = widgetTargets(c, scene, 'Düğme');
    if (!targets.length) fail('Düğmenin gizleyip göstereceği nesneleri yazın (ör. “c1’i gizleyen düğme ekle”) ya da önce seçin.');
    const sliders = targets.filter((o): o is SliderObject => o.type === 'slider');
    if (!toggleWords && sliders.length) {
      const button = scene.addButton({ kind: 'animate', sliderIds: sliders.map(s => s.id) }, spot, { label });
      scene.say(`“${button.label}” düğmesi eklendi (${sliders.map(s => s.variableName).join(', ')}).`);
      return;
    }
    const button = scene.addButton({ kind: 'toggle', targetIds: targets.map(o => o.id) }, spot, { label });
    scene.say(`“${button.label}” düğmesi eklendi: tıklanınca ${describeTargets(targets)} gizlenir ya da gösterilir.`);
  },
};

export const inputBoxHandler: CommandHandler = {
  id: 'algebra.inputBox',
  examples: ['a için girdi kutusu ekle', 'f fonksiyonu için girdi kutusu', 'g(x) için giriş kutusu oluştur', 'a ve b için girdi kutuları ekle', 'b kaydırıcısı için girdi kutusu', 'seçili fonksiyon için girdi kutusu'],
  match: c => widgetMatch(c, INPUT_NOUN, ['show', 'measure', 'play', 'stop']),
  run(c, scene) {
    const named = slidersInClause(c, scene);
    const targets: (SliderObject | FunctionObject)[] = [...named.sliders, ...functionsInClause(c, scene)];
    const add = (o: SliderObject | FunctionObject | undefined) => { if (o && !targets.includes(o)) targets.push(o); };
    for (const ref of c.labels) if (!named.sliders.some(s => findSlider(scene, ref.text) === s)) add(findFunction(scene, ref.text));
    const forWord = c.raw.match(/(?<![\p{L}\p{N}])([\p{L}][\p{L}\p{N}]?)(?:['’][\p{L}]+)?\s+i[çc]in(?![\p{L}])/u);
    if (!targets.length && forWord) {
      const hit = sliderByName(scene, forWord[1]) ?? findFunction(scene, forWord[1]);
      if (!hit) fail(`${forWord[1]} adlı kaydırıcı ya da fonksiyon bulunamadı. Önce oluşturun (ör. “${forWord[1].toLocaleLowerCase('tr')} = 1”).`);
      add(hit);
    }
    if (!targets.length && named.unknown.length) fail(`${named.unknown[0]} adlı kaydırıcı ya da fonksiyon bulunamadı.`);
    if (!targets.length) {
      const words = rawWords(c.raw);
      const noun = words.findIndex(w => FUNCTION_NOUN.test(w.folded));
      const written = noun > 0 ? words[noun - 1].raw.replace(/['’′][\p{L}]*$/u, '') : '';
      if (/^[\p{L}][\p{L}\p{N}]?$/u.test(written) && !isStopword(fold(written))) fail(`${written} adlı fonksiyon bulunamadı. Önce çizin (ör. “${written}(x) = 2x + 1”).`);
    }
    if (!targets.length) {
      const pick = (ids: string[]) => ids.map(id => scene.get(id)).filter((o): o is SliderObject | FunctionObject => o?.type === 'slider' || o?.type === 'function');
      const sources = c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
      const fromContext = sources.map(pick).find(list => list.length);
      const all = [...scene.sliders(), ...scene.ofType('function')];
      const chosen = fromContext ?? (all.length === 1 ? all : []);
      if (!chosen.length) {
        fail(all.length
          ? 'Girdi kutusunun bağlanacağı kaydırıcıyı ya da fonksiyonu yazın (ör. “a için girdi kutusu ekle”, “f fonksiyonu için girdi kutusu”).'
          : 'Girdi kutusu bir kaydırıcıya ya da fonksiyona bağlanır. Önce oluşturun (ör. “a = 1” ya da “f(x) = 2x + 1”).');
      }
      chosen.forEach(add);
    }
    for (const target of targets) scene.addInputBox(target, scene.widgetSpot());
    const names = targets.map(o => o.type === 'slider' ? o.variableName : functionName(o));
    scene.say(`${names.join(', ')} için girdi kutusu eklendi. Kutuya yazılan ${targets.every(o => o.type === 'slider') ? 'değer kaydırıcıya' : 'ifade bağlı nesneye'} uygulanır.`);
  },
};

// ---------------------------------------------------------------------------
// Görsel ve kalem (araç açma)
// ---------------------------------------------------------------------------

export const imageHandler: CommandHandler = {
  id: 'algebra.image',
  examples: ['resim ekle', 'görsel ekle', 'fotoğraf yükle', 'tuvale bir resim koy', 'görsel eklemek istiyorum', 'resim yerleştir'],
  match(c) {
    if (!/\b(?:gorsel|resim|resm|fotograf|foto\b|imaj)/.test(c.text) || /\barac/.test(c.text)) return 0;
    if (hasForeignEditVerb(c, ['scale', 'show', 'measure'])) return 0;
    if (!/\b(?:ekle|koy|yukle|olustur|getir|yerlestir|ac\b|ciz|istiyorum)/.test(c.text) && c.verbs.size) return 0;
    return 12;
  },
  run(_c, scene) {
    scene.act({ kind: 'selectTool', tool: 'image' });
    scene.say('Görsel Ekle aracı seçildi: tuvalde görselin konacağı yere tıklayın ve bilgisayarınızdan bir resim dosyası seçin (dosya yazarak seçilemez).');
  },
};

export const penHandler: CommandHandler = {
  id: 'algebra.pen',
  examples: ['serbest çizim yap', 'kalemle çiz', 'elle çizmek istiyorum', 'kalem ile çizim yap', 'serbest elle çiz', 'karalama yap'],
  match(c) {
    if (!/\b(?:serbest (?:cizim|el)|kalemle|kalem ile|elle ciz|elden ciz|karalama)/.test(c.text) || /\barac/.test(c.text)) return 0;
    if (hasForeignEditVerb(c, ['scale', 'show'])) return 0;
    return 12;
  },
  run(_c, scene) {
    scene.act({ kind: 'selectTool', tool: 'pen' });
    scene.say('Kalem aracı seçildi: tuvalde fareyi basılı tutarak serbestçe çizin.');
  },
};

export const widgetHandlers: CommandHandler[] = [textHandler, textWordsHandler, fractionHandler, checkboxHandler, buttonHandler, inputBoxHandler, imageHandler, penHandler];
