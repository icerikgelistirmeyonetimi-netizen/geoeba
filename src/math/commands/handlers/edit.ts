import type { AngleObject, CircleObject, EllipseObject, FunctionObject, MathObject, ObjectType, Point2D, PointObject, PolygonObject } from '@/types/math';
import { calculateAngleDegrees, calculatePolygonArea, calculatePolygonPerimeter, projectOntoHost } from '@/math/geometry';
import { copyObjects, pasteObjects } from '@/math/objectClipboard';
import { validateMathExpression } from '@/math/parser';
import type { CommandHandler } from '../types';
import { type Clause, type LabelRef, fold, labelKey } from '../text';
import { type CommandScene, NAMED_COLORS, colorIn, fail, skip, tidy, trNum } from '../scene';
import {
  type NounWord, HIDDEN_WORDS, QUANTIFIER, SET_VERB, SPECS, STRONG_CREATE, WHOLE_SCENE,
  clauseNouns, isRegularPolygon, isRightQuad, labelNoun, labelRole, labelWordIndex,
} from './edit/words';
import {
  type TargetOptions, candidatesFor, cleanLabel, depsOf, describe, describeList, expandVertices, findTargets, functionName, hasTargetHint, joinTr, pick, pointsOf,
} from './edit/targets';
import { gorunurNoktaAdlari, noktalari, noktalariyla } from '@/math/nesneAdlari';
import { hasPartWord, partExists, resolveParts, withoutPartWords } from './edit/parts';
import { withEditClause } from './edit/clause';
import { centroid, constructionName, fmtPoint, hostShapeOf, labelSequence, referencePoint, replaceCanonical, reproject, shiftFunction, transformPoints } from './edit/geometry';

export const family = { id: 'edit', title: 'Düzenleme' };

// ============================================================================ ortak yardımcılar

/** Cümle başı büyük harf; nesne adları ("c1 çemberi", "g(x) = sin(x) fonksiyonu", "a kaydırıcısı") yazıldığı gibi kalır. */
const sentence = (text: string) => /^(?:görsel|kalem|nesne)/.test(text) ? text.charAt(0).toLocaleUpperCase('tr') + text.slice(1) : text;
const snapshot = (s: CommandScene) => new Map(s.objects.map(o => [o.id, o]));
const isFree = (p: PointObject) => !p.construction && !p.onObjectId;
const ids = (list: MathObject[]) => list.map(o => o.id);

/** Parça adları ("merkezini", "teğetleri", "kesişim noktalarını", "açıları") önce; yoksa ad, odak, seçim ve "köşelerini" genişletmesi. */
function editTargets(c: Clause, s: CommandScene, o: TargetOptions): MathObject[] {
  return resolveParts(c, s, o) ?? expandVertices(c, s, findTargets(c, s, o));
}

/** Hedef olabilecek adlar: yalın, belirtme ve tamlayan hâlindekiler ("üçgeni", "çemberin"). Yönelme ("AB doğrusuna") hedef değildir. */
function targetNouns(c: Clause): NounWord[] {
  return clauseNouns(c).filter(n => n.grammarCase === 'nom' || n.grammarCase === 'acc' || n.grammarCase === 'gen');
}

const COLOR_NAMES: Record<string, string> = {
  mavi: 'mavi', 'acik mavi': 'açık mavi', lacivert: 'lacivert', mor: 'mor', pembe: 'pembe', kirmizi: 'kırmızı', turuncu: 'turuncu', sari: 'sarı',
  yesil: 'yeşil', gri: 'gri', siyah: 'siyah', kahverengi: 'kahverengi', beyaz: 'beyaz', turkuaz: 'turkuaz',
};
function colorName(hex: string): string {
  const key = Object.keys(NAMED_COLORS).find(k => NAMED_COLORS[k] === hex);
  return key ? COLOR_NAMES[key] ?? key : hex;
}

/** Listede olmayan ama yakın karşılığı olan renk adları. */
const COLOR_SYNONYMS: [RegExp, string][] = [
  [/\bkoyu mavi\w*/, 'lacivert'], [/\b(?:eflatun|lila|leylak)\w*/, 'mor'], [/\bfusya\w*/, 'pembe'], [/\bcamgobeg\w*/, 'turkuaz'], [/\bgumus\w*/, 'gri'], [/\bkizil\w*/, 'kirmizi'],
];
/** Karşılığı olmayan renk adları: anlaşılır bir hata verilir. */
const UNSUPPORTED_COLOR = /\b(bordo|bej|krem|haki|somon|mercan|fildisi|bronz|magenta)(?:ya|ye|yi|a|e|i|u|y?[iu]n|renk\w*)?\b/;

/** colorIn ile aynı; ek olarak "kırmızıyla", "maviyle", "yeşilli", "morun" gibi ekli yazımları da tanır. */
function colorOf(c: Clause): string | undefined {
  const synonym = COLOR_SYNONYMS.find(([re]) => re.test(c.text));
  if (synonym) return NAMED_COLORS[synonym[1]];
  const found = colorIn(c);
  if (found) return found;
  const names = Object.keys(NAMED_COLORS).sort((a, b) => b.length - a.length);
  const name = names.find(n => new RegExp(`\\b${n}(?:y?l[ae]|l[iu]|n[iu]n|y?[iu]n|d[ai]r)\\b`).test(c.text));
  return name ? NAMED_COLORS[name] : undefined;
}

const UNIT = /^(?:br|birim|birimlik|cm|kare|adim)$/;
const DIRECTIONS: [RegExp, Point2D, string][] = [
  [/^sag(?:a|ina)$/, { x: 1, y: 0 }, 'sağa'], [/^sol(?:a|una)$/, { x: -1, y: 0 }, 'sola'],
  [/^yukari(?:ya)?$/, { x: 0, y: 1 }, 'yukarı'], [/^asagi(?:ya)?$/, { x: 0, y: -1 }, 'aşağı'],
];

/** "2 birim sağa", "sağa doğru 3", "yukarı 1 br", "x yönünde −2" → toplam kaydırma vektörü. */
function parseDirections(c: Clause): { vector: Point2D; text: string; defaulted: boolean } | null {
  const w = c.words, used = new Set<number>();
  let x = 0, y = 0, found = false, defaulted = false;
  const parts: string[] = [];
  const numberAt = (i: number) => (i >= 0 && /^#\d+$/.test(w[i] ?? '') && !used.has(i) ? i : -1);
  for (let i = 0; i < w.length; i++) {
    const placeholder = w[i].match(/^\$(\d+)$/);
    const ref = placeholder ? c.labels[Number(placeholder[1])] : undefined;
    const word = placeholder ? (ref?.lowercase ? fold(ref.text) : '') : w[i];
    const dir = DIRECTIONS.find(([re]) => re.test(word));
    if (!dir) continue;
    found = true;
    let at = numberAt(UNIT.test(w[i - 1] ?? '') ? i - 2 : i - 1);
    if (at < 0) {
      let j = i + 1;
      if (w[j] === 'dogru') j++;
      at = numberAt(j);
    }
    let n = 1;
    if (at >= 0) { used.add(at); n = c.num(w[at]); } else defaulted = true;
    x += dir[1].x * n; y += dir[1].y * n;
    parts.push(`${trNum(n)} birim ${dir[2]}`);
  }
  for (const m of c.text.matchAll(/\b(x|y) (?:yonunde|ekseninde|ekseni boyunca|dogrultusunda) (#\d+)/g)) {
    found = true;
    const n = c.num(m[2]);
    if (m[1] === 'x') x += n; else y += n;
    parts.push(`${m[1]} yönünde ${trNum(n)} birim`);
  }
  return found ? { vector: { x, y }, text: joinTr(parts), defaulted } : null;
}

/** Çözümleyicinin "sağa doğru" gibi ifadelerde küçük harfli etiket sandığı yön sözcükleri: hedef değildir. */
function directionLabelIdx(c: Clause): number[] {
  return c.labels.flatMap((ref, i) => ref.lowercase && DIRECTIONS.some(([re]) => re.test(fold(ref.text))) ? [i] : []);
}

type CoordRole = 'relative' | 'absolute';
function coordRoles(c: Clause): CoordRole[] {
  return c.coords.map((_, k) => {
    const at = c.words.indexOf(`@${k}`);
    const next = c.words[at + 1] ?? '';
    return /^(?:kadar|vektor\w*|birim\w*|oteleme\w*)$/.test(next) ? 'relative' : 'absolute';
  });
}

function nextWordOfLabel(c: Clause, i: number): string {
  return c.words[labelWordIndex(c, i) + 1] ?? '';
}

// ============================================================================ silme

const PROPERTY_WORDS = /\b(?:dolgu\w*|renk\w*|rengi\w*|ad(?:i|ini|lari|larini)|isim\w*|ismi\w*|etiket\w*|kilit\w*|kilid\w*|olcu\w*|olcum\w*|alan(?:i|ini|lari|larini)|cevre\w*|uzunlug\w*|bag(?:i|ini|lari|larini|lanti\w*)|secim\w*|saydam\w*|kalinlig\w*|izgara\w*|eksen\w*|koordinat\w*|denklem\w*|deger\w*|egim\w*|yaricap\w*|ceyrek\w*|gorunum\w*|stil\w*)\b/;
const WITH_POINTS = /\b(?:nokta|kose)(?:lar|ler)?(?:i|u)?(?:yla|yle|la|le)\b|\bnoktalariyla|\bkoseleriyle/;
/** "yalnızca/yalnız/sadece ABC üçgenini sil": şekil gider, noktaları kalır. Seçim ve işaret sözcüklerinde geçerli değil. */
const ONLY_SHAPE = /\b(?:yalnizca|yalniz|sadece)\s+(?!(?:secil|sectig|sectik|bunu|bunlari|onu|onlari|sunu|sunlari|hepsi|tum|butun|her)\w*\b)/;
/** "…, noktalar kalsın", "köşeleri yerinde dursun", "noktalara dokunma": noktalar silinmez. */
const KEEP_PHRASE = /\b(?:nokta|kose)(?:lar|ler)(?:i|in|ini|inin)?\b(?:\s+(?!sil)\w+){0,2}\s+(?:kalsin|kalacak|kalmali|dursun|korunsun|silinmesin|gitmesin)\b|\b(?:nokta(?:lar(?:a|ina)|ya|sina)|kose(?:ler(?:e|ine)|ye|sine))\s+dokunma\w*/;
/** KEEP_PHRASE içindeki "noktalar/köşeleri" sözcüğü hedef değildir ("noktalar kalsın" tüm noktaları hedef yapmasın). */
const KEEP_NOUN = /^(?:nokta|kose)(?:lar|ler)(?:i|in|ini|inin|a|e|ina|ine)?$/;

const deleteHandler: CommandHandler = {
  id: 'edit.delete',
  examples: ['ABC sil', 'A noktasını sil', 'A, B ve C noktalarını sil', 'tüm çemberleri sil', 'son çizileni sil', 'seçili nesneleri sil',
    'f fonksiyonunu sil', 'a kaydırıcısını sil', 'ABC üçgenini noktalarıyla birlikte sil', 'yalnızca ABC üçgenini sil', 'ABC üçgenini sil, noktalar kalsın'],
  match(c, s) {
    if (!c.hasVerb('delete') || !/\b(?:sil|kaldir|temizle|yok et)/.test(c.text)) return 0;
    if (/\bgeri al|\bbagla/.test(c.text) || PROPERTY_WORDS.test(c.text) || STRONG_CREATE.test(c.text)) return 0;
    const nouns = targetNouns(c);
    const generic = nouns.every(n => n.spec.key === 'object');
    if (!c.labels.length && !c.refersToSelection && (WHOLE_SCENE.test(c.text) || (QUANTIFIER.test(c.text) && generic))) return 0;
    if (hasTargetHint(c, s, nouns) || hasPartWord(c, true)) return 90;
    return BARE_DELETE.test(c.text) ? 85 : 0;
  },
  run(c, s) {
    if (BARE_DELETE.test(c.text) && !s.focus.length && !s.selection.length) {
      fail('Neyi sileyim? Nesnenin adını yazın (ör. “A noktasını sil”) ya da önce nesneyi seçin. Çizimin tamamı için “tümünü sil” yazın.');
    }
    const withPoints = WITH_POINTS.test(c.text);
    const keepPhrase = !withPoints && KEEP_PHRASE.test(c.text);
    const keepPoints = keepPhrase || (!withPoints && ONLY_SHAPE.test(c.text));
    const nouns = targetNouns(c).filter(n => !WITH_POINTS.test(n.word) && !(keepPhrase && KEEP_NOUN.test(n.word)));
    const o: TargetOptions = { many: true, nouns, example: 'ABC üçgenini sil' };
    // expandVertices "noktaları/köşeleri" görünce şekli köşelerine çevirir: "noktaları kalsın" bunu yapmamalı.
    const targets = keepPhrase ? (resolveParts(c, s, o) ?? findTargets(c, s, o)) : editTargets(c, s, o);
    const all = withPoints ? [...new Set([...targets, ...pointsOf(s, targets)])] : targets;
    const before = [...snapshot(s).values()];
    // Şeklin kendi noktaları ekrandaki silmeyle AYNI kuraldan geçer (WorkspaceContext.planDeletion).
    const plan = s.removeWithOwnPoints(ids(all), { keepPoints, protectedIds: s.options.pendingPointIds });
    s.setFocus([]);
    const giden = gorunurNoktaAdlari(before, plan.ownPointIds);
    const kalan = gorunurNoktaAdlari(before, plan.keptPointIds);
    const extra = plan.removal.size - all.length - plan.ownPointIds.length;
    const ad = sentence(describeList(targets));
    const govde = kalan.length ? `${ad} silindi (${noktalari(kalan)} yerinde kaldı).`
      : `${ad}${all.length > targets.length ? ` (${all.length - targets.length} köşe noktasıyla birlikte)`
        : giden.length ? ` (${noktalariyla(giden)} birlikte)` : ''} silindi.`;
    s.say(`${govde}${extra > 0 ? ` Bağlı ${extra} nesne de silindi.` : ''}`);
  },
};

/** Yalın "sil", "şimdi sil", "sil lütfen": önceki komutun nesnesi ya da seçim. */
const BARE_DELETE = /^(?:(?:simdi|lutfen|hemen|hadi|tamam|evet) )*(?:sil|kaldir)(?:in|elim|er misin|ebilir misin|iver)?(?: (?:lutfen|tamam|hadi))*$/;

// ============================================================================ seçme

const DESELECT = /\bsecim\w*\s+(?:kaldir|temizle|iptal|birak|bosalt|sifirla)\w*|\bhicbir (?:sey|nesne|sekil|nokta)\w* secili/;

const selectHandler: CommandHandler = {
  id: 'edit.select',
  examples: ['ABC seç', "ABC'yi seç", "A ve B'yi seç", 'tüm noktaları seç', "ABC'nin köşelerini seç", 'seçimi kaldır'],
  match(c) {
    if (DESELECT.test(c.text)) return 89;
    if (!c.hasVerb('select') || /\barac\w*|\bsecenek/.test(c.text) || STRONG_CREATE.test(c.text)) return 0;
    const nouns = targetNouns(c);
    if (!c.labels.length && (WHOLE_SCENE.test(c.text) || (QUANTIFIER.test(c.text) && nouns.every(n => n.spec.key === 'object')))) return 0;
    return c.labels.length || nouns.length || c.refersToLast || hasPartWord(c, true) ? 88 : 0;
  },
  run(c, s) {
    if (DESELECT.test(c.text)) {
      s.selection = [];
      s.setFocus([]);
      s.say('Seçim kaldırıldı.');
      return;
    }
    const targets = editTargets(c, s, { many: true, nouns: targetNouns(c), example: "ABC'yi seç" });
    s.setFocus(ids(targets));
    s.say(`${sentence(describeList(targets))} seçildi.`);
  },
};

// ============================================================================ renk

const colorHandler: CommandHandler = {
  id: 'edit.color',
  examples: ["ABC'yi kırmızı yap", 'çemberin rengini yeşil yap', 'tüm noktaları maviye boya', '#ff8800 yap', "ABC'nin içini sarıya boya", "AB'nin rengi mor olsun"],
  match(c) {
    const color = colorOf(c);
    const colorWord = /\brenk\w*|\brengi\w*/.test(c.text) || UNSUPPORTED_COLOR.test(c.text);
    if (!color && !colorWord) return 0;
    if (/siyah\s*-?\s*beyaz|\bgri ton|\brenksiz|\bolan\b/.test(c.text) || STRONG_CREATE.test(c.text)) return 0;
    if (!color && c.hasVerb('question')) return 0;
    if (!SET_VERB.test(c.text) && !/\bboya\w*|\brenklendir\w*|\bdoldur\w*/.test(c.text)) return 0;
    const explicit = c.labels.length || c.refersToSelection || c.refersToLast || QUANTIFIER.test(c.text) || colorWord || /\bboya/.test(c.text);
    if (!explicit && targetNouns(c).some(n => n.grammarCase === 'nom' && !n.plural && !/si$|su$/.test(n.word))) return 0;
    return 88;
  },
  run(c, s) {
    const unsupported = c.text.match(UNSUPPORTED_COLOR)?.[1];
    const color = colorOf(c) ?? fail(unsupported
      ? `“${unsupported}” rengini tanımıyorum. Kullanılabilen renkler: ${Object.values(COLOR_NAMES).join(', ')} ya da #800020 gibi bir renk kodu.`
      : `Hangi renk? Örneğin “ABC'yi kırmızı yap” yazın. Renkler: ${Object.values(COLOR_NAMES).join(', ')} ya da #ff8800 gibi bir kod.`);
    // "içini kırmızıyla doldur": dolgu rengi verilir ve dolgu görünür yapılır.
    const fillVerb = /\bdoldur\w*/.test(c.text);
    const fillOnly = fillVerb || /\bic(?:i|ini|leri|lerini)\b|\bdolgu\w*/.test(c.text);
    const strokeOnly = !fillOnly && /\bkenar\w*|\bcizgi\w*|\bcerceve\w*|\bsinir\w*/.test(c.text);
    const nouns = targetNouns(c);
    const everything = !c.labels.length && !nouns.length && (/\b(?:tumunu|hepsini|her seyi)\b/.test(c.text));
    const targets = everything ? s.objects.filter(o => o.type !== 'image') : editTargets(c, s, { many: true, nouns, example: "ABC'yi kırmızı yap" });
    const applied: MathObject[] = [];
    for (const t of targets) {
      if (t.type === 'image') continue;
      const hasFill = t.type === 'polygon' || t.type === 'ellipse' || t.type === 'sector';
      if (fillOnly && !hasFill && t.type !== 'circle') continue;
      const patch: Record<string, unknown> = {};
      if (hasFill) {
        if (!strokeOnly) patch.fillColor = color;
        if (!fillOnly) patch.color = color;
      } else patch.color = color;
      const opacity = 'fillOpacity' in t && typeof t.fillOpacity === 'number' ? t.fillOpacity : 0;
      if (fillVerb && (hasFill || t.type === 'circle') && opacity < 0.2) patch.fillOpacity = 0.35;
      s.update(t.id, patch);
      applied.push(t);
    }
    if (!applied.length) {
      fail(fillOnly ? `${sentence(describeList(targets))} için dolgu rengi yok. Dolgu yalnızca çokgen, çember, elips ve daire diliminde vardır.` : 'Görsellerin rengi değiştirilemez.');
    }
    s.setFocus(ids(applied));
    const name = colorName(color);
    const what = fillOnly ? `: dolgu rengi ${name} yapıldı${fillVerb ? ' ve içi dolduruldu' : ''}.` : strokeOnly ? `: kenar rengi ${name} yapıldı.` : ` ${name} yapıldı.`;
    const note = strokeOnly && applied.some(t => t.type === 'circle') ? ' Çemberin içi de kenar rengiyle boyanır.' : '';
    const skipped = targets.length - applied.length;
    s.say(`${sentence(describeList(applied))}${what}${note}${skipped ? ` ${skipped} nesnede bu renk alanı olmadığı için değişiklik yapılmadı.` : ''}`);
  },
};

// ============================================================================ dolgu

const FILL_WORDS = /\bdoldur\w*|\bdolgu\w*|\bic(?:i|ini)\s+(?:boya|bosalt|bos|dolu|doldur)\w*|\bsaydam\w*|\bopak\w*|\bseffaf\w*|\bici bos\w*/;
const FILL_TYPES: ObjectType[] = ['polygon', 'circle', 'ellipse', 'sector'];

const fillHandler: CommandHandler = {
  id: 'edit.fill',
  examples: ['içini doldur', "ABC'nin dolgusunu kaldır", 'yarı saydam yap', '%30 saydamlık', 'çemberin içini boya'],
  match(c) {
    if (!FILL_WORDS.test(c.text) || colorOf(c)) return 0;
    if (/\bolan\b/.test(c.text) || (STRONG_CREATE.test(c.text) && !/\bdolgu\w* ekle/.test(c.text)) || c.hasVerb('question')) return 0;
    const nouns = targetNouns(c);
    if (/\bdolgular\w*/.test(c.text) && !c.labels.length && !nouns.length && !c.refersToSelection) return 0;
    return 88;
  },
  run(c, s) {
    const t = c.text;
    let opacity: number;
    const percent = t.match(/\byuzde (#\d+)/);
    if (/\b(?:kaldir|sil|bosalt|temizle|kapat|gizle|yok et)\w*|\bdolgusuz\w*|\bici bos|\btam saydam|\bseffaf\w*/.test(t)) opacity = 0.001;
    else if (/\byari(?:m)? saydam/.test(t)) opacity = 0.5;
    else if (percent || (/\bsaydam\w*|\bopak\w*|\bdolgu\w*/.test(t) && c.numbers.length)) {
      let v = percent ? c.num(percent[1]) : c.numbers[0];
      if (!percent && v <= 1) v *= 100;
      if (!(v >= 0 && v <= 100)) fail('Yüzde değeri 0 ile 100 arasında olmalı (ör. “%30 saydamlık”).');
      opacity = /\bsaydam/.test(t) ? 1 - v / 100 : v / 100;
    } else if (/\bsaydam/.test(t)) opacity = 0.001;
    else if (/\bopak|\btam dolu|\btamamen (?:doldur|dolu)|\btam (?:olarak )?doldur/.test(t)) opacity = 1;
    else opacity = 0.35;
    opacity = Math.max(0.001, Math.min(1, tidy(opacity)));

    const targets = findTargets(c, s, { many: true, nouns: targetNouns(c), prefer: FILL_TYPES, example: "ABC'nin içini doldur" });
    const eligible = targets.filter(o => FILL_TYPES.includes(o.type));
    if (!eligible.length) fail(`${sentence(describeList(targets))} içi boyanabilen bir şekil değil. Dolgu yalnızca çokgen, çember, elips ve daire diliminde vardır.`);
    for (const o of eligible) {
      const patch: Record<string, unknown> = { fillOpacity: opacity };
      if ((o.type === 'polygon' || o.type === 'ellipse' || o.type === 'sector') && !o.fillColor) patch.fillColor = o.color;
      s.update(o.id, patch);
    }
    s.setFocus(ids(eligible));
    const what = opacity <= 0.001 ? 'dolgu kaldırıldı' : `içi dolduruldu (opaklık %${Math.round(opacity * 100)})`;
    const skipped = targets.length - eligible.length;
    s.say(`${sentence(describeList(eligible))}: ${what}.${skipped ? ` ${skipped} nesnenin dolgusu olmadığı için atlandı.` : ''}`);
  },
};

// ============================================================================ kalınlık

const THICK = /\bkalin(?:lig\w*|las\w*|\b)|\bince(?:\b|l\w*)|\bincelt\w*|\bkesik(?!s)\w*|\bnoktali cizgi\w*|\bduz cizgi\w*/;
const THICK_DEFAULTS: Partial<Record<ObjectType, number>> = { segment: 2.5, arc: 3, sector: 3, function: 2.5, pen: 3 };

const thicknessHandler: CommandHandler = {
  id: 'edit.thickness',
  examples: ["AB'yi kalın yap", 'ince yap', 'kalınlığını 4 yap', 'f fonksiyonunun kalınlığı 5 olsun'],
  match(c, s) {
    const t = c.text;
    if (!THICK.test(t) || /\bolan\b/.test(t) || STRONG_CREATE.test(t)) return 0;
    const nouns = targetNouns(c);
    if (!c.labels.length && !nouns.length && !c.refersToSelection && /\bcizgiler\w*|\byazilar\w*|\bnoktalar\w*/.test(t)) return 0;
    if (!SET_VERB.test(t) && !/\bkalinlas\w*|\bincelt\w*/.test(t)) return 0;
    // "kalınlığını 2 yap" (önceki komutun nesnesi), "f'nin kalınlığı 5 olsun": nesnenin kalınlığıdır; genel çizgi stilinin (91) önüne geçer.
    const general = /\bcizgi\w*|\b(?:tum|butun)\b|\bstil\w*/.test(t);
    const objectRef = c.labels.length > 0 || c.refersToSelection || c.refersToLast || nouns.some(n => n.spec.key !== 'object') || s.focus.length > 0 || s.selection.length > 0;
    return objectRef && !general ? 92 : 87;
  },
  run(c, s) {
    const t = c.text;
    if (/\bkesik(?!s)|\bnoktali cizgi|\bduz cizgi/.test(t)) {
      fail('Kesikli ve noktalı çizgi stili henüz çizimde gösterilmiyor; çizgilerin yalnızca rengi ve kalınlığı değiştirilebilir (ör. “AB’yi kalın yap”).');
    }
    const value = c.paramAfter(/kalinlig/) ?? c.paramBefore(/kalinlig/) ?? (/\bkalinlig/.test(t) && c.numbers.length === 1 ? c.numbers[0] : undefined);
    if (value !== undefined && !(value >= 0.5 && value <= 20)) fail('Kalınlık 0,5 ile 20 arasında olmalı.');
    const thin = /\bince\w*|\bincelt\w*/.test(t);
    const factor = /\bcok (?:kalin|ince)/.test(t) ? 2.2 : 1.6;
    const targets = findTargets(c, s, { many: true, nouns: targetNouns(c), prefer: Object.keys(THICK_DEFAULTS) as ObjectType[], example: "AB'yi kalın yap" });
    const applied: { o: MathObject; thickness: number }[] = [];
    let lines = 0, outlines = 0;
    for (const o of targets) {
      const base = THICK_DEFAULTS[o.type];
      if (base === undefined) {
        if (o.type === 'line' || o.type === 'ray') lines++;
        else if (o.type === 'polygon' || o.type === 'circle' || o.type === 'ellipse') outlines++;
        continue;
      }
      const current = ('thickness' in o && typeof o.thickness === 'number' && o.thickness > 0) ? o.thickness : base;
      const next = Math.round(Math.max(0.5, Math.min(20, value ?? (thin ? current / factor : current * factor))) * 100) / 100;
      s.update(o.id, { thickness: next });
      applied.push({ o, thickness: next });
    }
    const lineNote = 'Doğru ve ışınlar çizimde sabit kalınlıkta gösterilir; kalınlıkları değiştirilemiyor.';
    const outlineNote = 'Çokgen, çember ve elips kenarları tek tek kalınlaştırılamaz; bütün çizgiler için “çizgileri kalınlaştır” yazın.';
    if (!applied.length) {
      if (lines) fail(`${lineNote} Kalınlığı değişebilenler: doğru parçası, yay, daire dilimi, fonksiyon grafiği ve kalem çizimi.`);
      if (outlines) fail(outlineNote);
      fail('Bu nesnenin çizgi kalınlığı yok. Kalınlığı değişebilenler: doğru parçası, yay, daire dilimi, fonksiyon grafiği ve kalem çizimi.');
    }
    s.setFocus(applied.map(a => a.o.id));
    const list = sentence(describeList(applied.map(a => a.o)));
    const text = value !== undefined ? `${list}: kalınlık ${trNum(value)} yapıldı.`
      : `${list} ${thin ? 'inceltildi' : 'kalınlaştırıldı'} (kalınlık ${joinTr([...new Set(applied.map(a => trNum(a.thickness)))])}).`;
    s.say(`${text}${lines ? ` ${lineNote}` : ''}${outlines ? ` ${outlineNote}` : ''}`);
  },
};

// ============================================================================ gizle / göster

const HIDE = /\b(?:gizle|sakla|gorunmez|gorunmesin|kapat)\w*/;
const SHOW = /\b(?:goster|gorunur|goruns|ortaya cikar|geri getir)\w*/;
/** "gizlenen noktaları göster", "gizlediğim nesneyi geri getir": gizleme fiili değil, hedefi niteleyen sözcük. */
const HIDDEN_ALL = new RegExp(HIDDEN_WORDS.source, 'g');
const hides = (t: string) => HIDE.test(t.replace(HIDDEN_ALL, ' '));
/** Önceki cümlenin nesnesine ya da seçime yönelik yalın komut: "tekrar göster", "gizle". */
const BARE_VISIBILITY = /^(?:(?:tekrar|yeniden|geri|simdi|lutfen|hemen|hadi) )*(?:goster|gizle|sakla|gorunur yap|gorunmez yap)\w*(?: (?:lutfen|tamam))?$/;
const MEASURE_WORDS = /\b(?:alan\w*|cevre\w*|uzunlu[gk]\w*|olcu\w*|olcum\w*|deger\w*|egim\w*|yaricap\w*|cap(?:i|ini|lari|larini)|koordinat\w*|denklem\w*|kenar\w*|aci\w*|kiris\w*|oran\w*|sinus\w*|kosinus\w*|tanjant\w*|mesafe\w*|uzaklig\w*|sonuc\w*|hesap\w*)\b/;
const VIEW_WORDS = /\b(?:izgara\w*|eksen\w*|ceyrek\w*|etiket kutu\w*|arac\w*|panel\w*|menu\w*|dolgu\w*|stil\w*|yardim\w*|klavye\w*|kilid\w*|kilit\w*)\b/;
const NAME_WORDS = /\b(?:ad(?:i|ini|lari|larini)|isim\w*|ismi\w*|etiket\w*|harf(?:i|ini|leri|lerini))\b/;
/** "köşelerini gizle": önceki komutun şeklinin köşeleri */
const VERTEX_PART = /\bkose(?:ler)?(?:i|ini|si|sini|leri|lerini)\b/;
/** "ikisini de gizle", "üçünü de göster": önceki komutun nesneleri */
const COUNT_PRONOUN = /\b(?:ikisini|ikisi|ucunu|ucu|dordunu|dordu)\b/;

const visibilityHandler: CommandHandler = {
  id: 'edit.visibility',
  examples: ['A noktasını gizle', 'gizli nesneleri göster', "c1'i göster", 'tüm noktaları gizle', 'ABC üçgenini gizle', 'onu tekrar görünür yap'],
  match(c, s) {
    const t = c.text;
    const hide = hides(t), show = SHOW.test(t);
    if (!hide && !show) return 0;
    // Parça adları ("kenarortayları", "yüksekliği", "merkezini") ölçü sözcüğü değildir; "açıları gizle" açı nesnelerini gizler
    // (açıları göstermek ölçüm ailesinindir).
    const part = hasPartWord(c);
    const angles = hide && !part && s.ofType('angle').length > 0 && hasPartWord(c, true);
    const plain = part || angles ? withoutPartWords(c, true) : t;
    if (MEASURE_WORDS.test(plain) || VIEW_WORDS.test(t) || NAME_WORDS.test(t) || STRONG_CREATE.test(t)) return 0;
    // "ağırlık merkezini göster" henüz yoksa oluşturma isteğidir (inşa ailesi).
    if (show && part && !partExists(c, s)) return 0;
    // "2/5 kesrini göster", "(1;2) noktasını göster": sayılı ifade yeni nesne ya da ölçü ister, görünürlük değil.
    // (Çözümleyici "bölü" gibi sözcükleri B, O noktaları varken "BO" etiketi sanabilir; yalnızca gerçek nesneye çıkan etiket sayılır.)
    if (show && (c.numbers.length || c.coords.length || c.quotes.length) && !c.labels.some(ref => candidatesFor(s, ref).length)) return 0;
    // "dörtte bir kesrini göster": "bir" burada paydır (cebir ailesinin kesir modeli), tanımlık değil.
    if (show && /\b(?:ikide|ucte|dortte|beste|altida|yedide|sekizde|dokuzda|onda) bir kes(?:ir|ri)/.test(t)) return 0;
    const nouns = targetNouns(c);
    const context = s.focus.length > 0 || s.selection.length > 0;
    if (c.labels.length || nouns.length || part || angles || c.refersToSelection || c.refersToLast || HIDDEN_WORDS.test(t)) return 88;
    if ((VERTEX_PART.test(t) || COUNT_PRONOUN.test(t)) && context) return 88;
    if (show && /\b(?:tumunu|hepsini|her seyi)\b/.test(t)) return 88;
    if (BARE_VISIBILITY.test(t)) return context ? 86 : hide ? 85 : 0;
    return 0;
  },
  run(c, s) {
    const t = c.text;
    const visible = !hides(t);
    if (BARE_VISIBILITY.test(t) && !s.focus.length && !s.selection.length) {
      fail(`Neyi ${visible ? 'göstereyim' : 'gizleyeyim'}? Nesnenin adını yazın (ör. “A noktasını ${visible ? 'göster' : 'gizle'}”) ya da önce nesneyi seçin.`);
    }
    const nouns = targetNouns(c);
    const specific = nouns.filter(n => n.spec.key !== 'object');
    let targets: MathObject[];
    if (visible && !c.labels.length && (HIDDEN_WORDS.test(t) || (!specific.length && /\b(?:tumunu|hepsini|her seyi)\b/.test(t)))) {
      targets = s.objects.filter(o => !o.visible && (!specific.length || specific.some(n => n.spec.types.includes(o.type) && (!n.spec.filter || n.spec.filter(o, s)))));
      if (!targets.length) fail(specific.length ? `Gizli ${specific[0].spec.noun} yok.` : 'Gizli nesne yok.');
    } else {
      targets = editTargets(c, s, { many: true, nouns: nouns.filter(n => !WITH_POINTS.test(n.word)), example: visible ? "c1'i göster" : 'A noktasını gizle' });
    }
    if (WITH_POINTS.test(t)) targets = [...new Set([...targets, ...pointsOf(s, targets)])];
    const changed = targets.filter(o => o.visible !== visible);
    for (const o of changed) s.update(o.id, { visible });
    s.setFocus(ids(targets));
    if (!changed.length) { s.say(`${sentence(describeList(targets))} zaten ${visible ? 'görünür' : 'gizli'}.`); return; }
    s.say(`${sentence(describeList(changed))} ${visible ? 'gösterildi' : 'gizlendi'}.`);
  },
};

// ============================================================================ nokta adlarını gizle / göster

const namesHandler: CommandHandler = {
  id: 'edit.names',
  examples: ['A noktasının adını gizle', 'etiketleri göster', 'noktaların adlarını gizle', "ABC'nin köşe adlarını göster"],
  match(c) {
    const t = c.text;
    if (!NAME_WORDS.test(t) || /\betiket kutu|\bolcum etiket|\bkoordinat/.test(t)) return 0;
    const hide = HIDE.test(t) || /\b(?:sil|kaldir)\w*/.test(t);
    if (!hide && !SHOW.test(t)) return 0;
    if (/\b(?:olarak|diye)\b|\badlandir|\bisimlendir/.test(t)) return 0;
    if (SET_VERB.test(t) && !/\b(?:gorunur|gorunmez|gizli)\w* (?:yap|olsun)/.test(t)) return 0;
    return 89;
  },
  run(c, s) {
    const t = c.text;
    const showLabel = !(HIDE.test(t) || /\b(?:sil|kaldir)\w*/.test(t));
    const nouns = targetNouns(c);
    // "nokta isimlerini gizle", "nokta adlarını göster": tekil "nokta" tamlamanın parçasıdır, tüm noktalar kastedilir.
    const pointCompound = nouns.length > 0 && nouns.every(n => n.spec.key === 'point' && n.grammarCase === 'nom' && !n.plural)
      && /\b(?:adlar|isimler|etiketler|harfler)\w*/.test(t);
    // "etiketlerini gizle", "adını göster": iyelik eki önceki komutun nesnesini (ya da seçimi) gösterir.
    const possessive = !pointCompound && /\b(?:adini|adlarini|ismini|isimlerini|etiketini|etiketlerini|harfini|harflerini)\b/.test(t) && (s.focus.length > 0 || s.selection.length > 0);
    const targets = !c.labels.length && (!nouns.length || pointCompound) && !c.refersToSelection && !c.refersToLast && !possessive && !hasPartWord(c, true)
      ? s.points()
      : editTargets(c, s, { many: true, nouns, example: 'A noktasının adını gizle' });
    const points = pointsOf(s, targets);
    if (!points.length) fail('Çizimde yalnızca noktaların adları gösterilir; bu nesnenin gösterilecek bir nokta adı yok.');
    for (const p of points) if (p.showLabel !== showLabel) s.update(p.id, { showLabel });
    s.setFocus(ids(targets));
    const verb = showLabel ? 'gösterildi' : 'gizlendi';
    if (points.length === 1) s.say(`${points[0].label} noktasının adı ${verb}.`);
    else if (points.length <= 8) s.say(`${joinTr(points.map(p => p.label))} noktalarının adları ${verb}.`);
    else s.say(`${points.length} noktanın adı ${verb}.`);
  },
};

// ============================================================================ yeniden adlandırma

function extractNewName(c: Clause): string | undefined {
  if (c.quotes.length) return c.quotes[c.quotes.length - 1].trim();
  const raw = c.raw.replace(/[’′]/g, "'");
  const name = '([^\\s"“”«»\']+)';
  const patterns = [
    new RegExp(`(?:ad[ıi]n[ıi]|ad[ıi]|ismini|ismi|etiketini|etiketi)\\s+${name}(?:'[a-zçğıöşü]+)?\\s+(?:olarak\\s+)?(?:yap|olsun|koy|ver|değiştir|degistir|çevir|cevir|ayarla)`, 'i'),
    new RegExp(`${name}(?:'[a-zçğıöşü]+)?\\s+(?:olarak|diye|adıyla|adiyla|ismiyle)\\s+(?:yeniden\\s+)?(?:adlandır|adlandir|isimlendir|değiştir|degistir|etiketle)`, 'i'),
    new RegExp(`(?:adlandır|adlandir|isimlendir)[a-zçğıöşü]*\\s*:\\s*${name}\\s*$`, 'i'),
    // "adını P ile değiştir", "adını P'yle değiştir"
    new RegExp(`(?:ad[ıi]n[ıi]|ismini|etiketini)\\s+${name}(?:'y?l[ae]|\\s+ile)\\s+(?:değiştir|degistir)`, 'i'),
    // "A noktasına P adını ver"
    new RegExp(`${name}(?:'[a-zçğıöşü]+)?\\s+(?:ad[ıi]n[ıi]|ismini|etiketini)\\s+(?:ver|koy)`, 'i'),
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m && !/^(?:olarak|diye|yeniden|adını|adini|ismini)$/i.test(m[1])) return m[1];
  }
  return undefined;
}

/** Konuşmada harf adları: "pe" → P, "ke" → K. */
const SPOKEN_LETTERS: Record<string, string> = {
  be: 'B', ce: 'C', de: 'D', fe: 'F', ge: 'G', he: 'H', je: 'J', ke: 'K', ka: 'K', le: 'L', me: 'M', ne: 'N', pe: 'P', ku: 'Q', re: 'R', se: 'S',
  te: 'T', vi: 'V', ye: 'Y', ze: 'Z', iks: 'X',
};
/** Tırnaksız küçük harfle yazılmış nokta adı büyük harfe çevrilir ("p" → P, "a_1" → A_1, "pe" → P); nokta adları büyük harfle yazılır. */
function pointNameOf(name: string): string {
  const spoken = SPOKEN_LETTERS[name];
  if (spoken) return spoken;
  if (/^[a-zçğıöşü](?:_?\d+)?'*$/.test(name)) return (/^[iı]/.test(name) ? 'I' : name.charAt(0).toLocaleUpperCase('tr')) + name.slice(1);
  return name;
}

/** "kesişim noktalarını E ve F olarak adlandır", "adlarını sırasıyla P, Q ve R yap" → ["E", "F"] */
function extractNewNames(c: Clause): string[] | undefined {
  const raw = c.raw.replace(/[’′]/g, "'");
  const item = '[^\\s,"“”«»\']+';
  const list = `(${item}(?:\\s*,\\s*${item})*\\s+(?:ve|ile)\\s+${item})`;
  const patterns = [
    new RegExp(`${list}(?:'[a-zçğıöşü]+)?\\s+(?:olarak|diye)\\s+(?:(?:yeniden|sırasıyla|sirasiyla)\\s+)?(?:adlandır|adlandir|isimlendir|değiştir|degistir|etiketle)`, 'i'),
    new RegExp(`(?:adlar[ıi]n[ıi]|isimlerini|etiketlerini)\\s+(?:(?:sırasıyla|sirasiyla)\\s+)?${list}\\s+(?:olarak\\s+)?(?:yap|koy|ver|değiştir|degistir)`, 'i'),
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m) return m[1].split(/\s*,\s*|\s+(?:ve|ile)\s+/).map(cleanLabel).filter(Boolean);
  }
  return undefined;
}

function checkPointName(s: CommandScene, name: string, own: string[]) {
  if (!/^[\p{L}][\p{L}\p{N}_']{0,11}$/u.test(name)) fail(`“${name}” geçerli bir nokta adı değil. Harfle başlayan kısa bir ad yazın (ör. P, A_1, B').`);
  const clash = s.points().find(q => !own.includes(q.id) && labelKey(q.label) === labelKey(name));
  if (clash) fail(`${clash.label} adlı nokta zaten var. Başka bir ad seçin.`);
  const other = s.objects.find(o => o.type !== 'point' && labelKey(o.label) === labelKey(name));
  if (other) fail(`“${name}” adı ${describe(other)} için kullanılıyor. Başka bir ad seçin.`);
}

/** Noktanın adını ve kendiliğinden verilmiş bağlı etiketleri ("ABC", "[AB]", "∠BAC") değiştirir; denetim yapmaz. */
function applyPointName(s: CommandScene, p: PointObject, name: string) {
  for (const o of s.objects) {
    if (o.type === 'point') continue;
    const seq = labelSequence(o);
    if (!seq.includes(p.id)) continue;
    const labelOf = (id: string) => s.get(id)?.label ?? '';
    const next = replaceCanonical(o.label, seq.map(labelOf).join(''), seq.map(id => id === p.id ? name : labelOf(id)).join(''));
    if (next) s.update(o.id, { label: next });
  }
  s.update(p.id, { label: name });
}

function renamePoint(s: CommandScene, p: PointObject, name: string) {
  if (p.label === name) { s.say(`${p.label} noktasının adı zaten ${name}.`); return; }
  checkPointName(s, name, [p.id]);
  const old = p.label;
  applyPointName(s, p, name);
  s.say(`${old} noktasının adı ${name} olarak değiştirildi.`);
}

function renameMany(c: Clause, s: CommandScene, names: string[]) {
  const finalNames = names.map(n => c.quotes.length ? n : pointNameOf(n));
  if (new Set(finalNames.map(labelKey)).size !== finalNames.length) fail('Yeni adlar birbirinden farklı olmalı.');
  const used = new Set<number>();
  for (const name of names) {
    const same = c.labels.map((_, i) => i).filter(i => !used.has(i) && labelKey(c.labels[i].text) === labelKey(name));
    if (same.length) used.add(same[same.length - 1]);
  }
  const labelIdx = c.labels.map((_, i) => i).filter(i => !used.has(i));
  const targets = editTargets(c, s, { labels: labelIdx, many: true, nouns: targetNouns(c), example: 'kesişim noktalarını E ve F olarak adlandır' });
  const order = (o: MathObject) => s.objects.findIndex(x => x.id === o.id);
  const points = targets.filter((o): o is PointObject => o.type === 'point').sort((a, b) => order(a) - order(b));
  if (points.length !== targets.length) fail('Birden fazla adı aynı anda yalnızca noktalara verebilirim (ör. “kesişim noktalarını E ve F olarak adlandır”).');
  if (points.length !== finalNames.length) {
    fail(`${points.length} nokta (${joinTr(points.map(p => p.label))}) için ${finalNames.length} ad yazıldı. Ad sayısı nokta sayısıyla aynı olmalı.`);
  }
  for (const name of finalNames) checkPointName(s, name, ids(points));
  const old = points.map(p => p.label);
  // Ad değiş tokuşunda ("E ve F" → "F ve E") çakışma olmasın diye önce geçici adlar verilir.
  points.forEach((p, i) => applyPointName(s, s.point(p.id), `§${i}`));
  points.forEach((p, i) => applyPointName(s, s.point(p.id), finalNames[i]));
  s.setFocus(ids(points));
  s.say(`${joinTr(old)} noktalarının adları sırasıyla ${joinTr(finalNames)} olarak değiştirildi.`);
}

const identifier = (name: string) => new RegExp(`(?<![A-Za-z_])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z_0-9])`, 'g');

function renameSlider(s: CommandScene, slider: Extract<MathObject, { type: 'slider' }>, name: string) {
  if (!/^[A-Za-z][A-Za-z0-9]{0,11}$/.test(name) || ['x', 'y', 'e', 'pi'].includes(name.toLowerCase())) {
    fail(`“${name}” kaydırıcı adı olamaz. Harfle başlayan, x, y, e ve pi dışında kısa bir ad yazın (ör. k).`);
  }
  if (slider.variableName === name) { s.say(`${name} kaydırıcısının adı zaten ${name}.`); return; }
  if (s.sliders().some(o => o.id !== slider.id && o.variableName === name)) fail(`${name} adlı kaydırıcı zaten var.`);
  const old = slider.variableName;
  let functions = 0;
  for (const fn of s.ofType('function')) {
    const expression = fn.expression.replace(identifier(old), name);
    if (expression === fn.expression) continue;
    const label = fn.label.endsWith(fn.expression) ? fn.label.slice(0, fn.label.length - fn.expression.length) + expression : fn.label;
    s.update(fn.id, { expression, label });
    functions++;
  }
  for (const box of s.ofType('input_box')) if (box.targetId === slider.id && box.label === `${old} =`) s.update(box.id, { label: `${name} =` });
  const label = slider.label === `${old} Parametresi` ? `${name} Parametresi` : slider.label === old ? name : slider.label;
  s.update(slider.id, { variableName: name, label });
  s.say(`${old} kaydırıcısının adı ${name} olarak değiştirildi.${functions ? ` ${functions} fonksiyon ifadesi de güncellendi.` : ''}`);
}

const renameHandler: CommandHandler = {
  id: 'edit.rename',
  examples: ['A noktasının adını P yap', "A'yı P olarak adlandır", 'AB doğrusunun adını d yap', "B'nin adı K olsun", 'a kaydırıcısının adını k yap'],
  match(c) {
    const t = c.text;
    const keyword = /\badlandir\w*|\bisimlendir\w*/.test(t)
      || (/\b(?:adini|ismini|etiketini|adi|ismi|etiketi)\b/.test(t) && /\b(?:yap|olsun|koy|ver|degistir|cevir|olarak|ayarla)\w*/.test(t))
      // "A'yı P diye değiştir"
      || (c.labels.length >= 2 && !c.quotes.length && !c.numbers.length && !c.coords.length && /\b(?:olarak|diye) (?:yeniden )?degistir\w*/.test(t));
    if (!keyword || HIDE.test(t) || SHOW.test(t) || STRONG_CREATE.test(t)) return 0;
    return 90;
  },
  run(c, s) {
    const names = extractNewNames(c);
    if (names && names.length > 1) { renameMany(c, s, names); return; }
    const newName = extractNewName(c) ?? fail('Yeni adı yazın; örneğin “A noktasının adını P yap” ya da “A’yı P olarak adlandır”.');
    const name = cleanLabel(newName);
    if (!name) fail('Yeni ad boş olamaz.');
    let labelIdx = c.labels.map((_, i) => i);
    // Yeni ad cümlede etiket olarak da geçer ("A'yı P olarak adlandır"). Tek başına ve adıyla/ekiyle hedef gösteriyorsa
    // ("f fonksiyonunun adını f yap") hedef olarak kalır.
    const same = labelIdx.filter(i => labelKey(c.labels[i].text) === labelKey(name));
    const nameIdx = same[same.length - 1];
    if (nameIdx !== undefined && (same.length > 1 || !(labelNoun(c, nameIdx) || c.labels[nameIdx].suffix))) labelIdx = labelIdx.filter(i => i !== nameIdx);
    const found = editTargets(c, s, { labels: labelIdx, many: false, nouns: targetNouns(c), example: 'A noktasının adını P yap' });
    if (found.length > 1) fail(`Birden fazla nesne var (${joinTr(found.map(o => o.label))}). Tek bir nesneye ad verin ya da her biri için ayrı ad yazın (ör. “E ve F olarak adlandır”).`);
    const [target] = found;
    s.setFocus([target.id]);
    if (target.type === 'point') { renamePoint(s, target, c.quotes.length ? name : pointNameOf(name)); return; }
    if (target.type === 'slider') { renameSlider(s, target, name); return; }
    if (name.length > 40) fail('Ad en fazla 40 karakter olabilir.');
    const before = describe(target);
    if (target.type === 'function') {
      const bare = name.replace(/\(\s*x\s*\)$/, '');
      if (!/^[A-Za-zçğıöşüÇĞİÖŞÜ][\w']{0,11}$/.test(bare)) fail(`“${name}” geçerli bir fonksiyon adı değil (ör. g).`);
      if (functionName(target.label) === bare) { s.say(`Fonksiyonun adı zaten ${bare}: ${target.label}.`); return; }
      // Fonksiyon adı yalnızca başka fonksiyon ve kaydırıcı adlarıyla çakışabilir (G noktası varken g(x) olur).
      const taken = s.objects.find(o => o.id !== target.id && ((o.type === 'function' && functionName(o.label) === bare) || (o.type === 'slider' && o.variableName === bare)));
      if (taken) fail(`“${bare}” adı ${describe(taken)} için kullanılıyor. Başka bir ad seçin.`);
      const label = functionName(target.label) ? target.label.replace(/^\s*[^=(]+?\s*(?:\(\s*x\s*\))?\s*=\s*/, `${bare}(x) = `) : bare;
      s.update(target.id, { label });
      // Başka ifadelerdeki çağrılar yeni adı kullanır: "g(x) = f(x) + 1" → "g(x) = k(x) + 1".
      const oldName = functionName(target.label);
      if (oldName && /^[a-zçğıöşü][a-zçğıöşü0-9]?$/i.test(bare)) {
        const callOf = () => new RegExp(`(?<![\\p{L}\\p{N}_])${oldName}(?=\\s*\\()`, 'giu');
        for (const other of s.ofType('function')) {
          if (other.id === target.id || !callOf().test(other.expression)) continue;
          const expression = other.expression.replace(callOf(), bare);
          s.update(other.id, { expression, label: other.label.replace(/=[\s\S]*$/, `= ${expression}`) });
        }
      }
      s.say(`${sentence(before)} artık ${label} olarak adlandırıldı.`);
      return;
    }
    if (target.label === name) { s.say(`${sentence(before)}: adı zaten “${name}”.`); return; }
    // Noktalarla yalnızca birebir aynı yazım çakışır (c çemberi ile C noktası birlikte olabilir).
    const clash = s.objects.find(o => o.id !== target.id && (o.type === 'point' ? o.label === name : labelKey(o.label) === labelKey(name) || (o.type === 'slider' && o.variableName === name)));
    if (clash) fail(`“${name}” adı ${describe(clash)} için kullanılıyor. Başka bir ad seçin.`);
    s.update(target.id, { label: name });
    s.say(`${sentence(before)} “${name}” olarak yeniden adlandırıldı.`);
  },
};

// ============================================================================ taşıma

/** Nesneleri d kadar kaydırır (araçtaki taşımayla aynı: tanım noktaları, üzerindeki noktalar, konumlu nesneler). */
function shiftObjects(s: CommandScene, targets: MathObject[], d: Point2D, lenient: Set<string>): PointObject[] {
  const before = snapshot(s);
  const pointIds = new Set<string>();
  for (const t of targets) {
    switch (t.type) {
      case 'text': case 'fraction': case 'image': case 'checkbox': case 'button': case 'input_box':
        s.update(t.id, { x: tidy(t.x + d.x), y: tidy(t.y + d.y) });
        break;
      case 'slider':
        if (t.x === undefined || t.y === undefined) fail(`${sentence(describe(t))} tuvalde durmuyor; taşınamaz.`);
        s.update(t.id, { x: tidy(t.x + d.x), y: tidy(t.y + d.y) });
        break;
      case 'pen':
        s.update(t.id, { points: t.points.map(p => ({ x: tidy(p.x + d.x), y: tidy(p.y + d.y) })) });
        break;
      case 'function':
        shiftFunction(s, t, d);
        break;
      default:
        for (const id of s.definingPointIds(t)) pointIds.add(id);
    }
  }
  if (!pointIds.size) return [];
  return transformPoints(s, [...pointIds], p => ({ x: p.x + d.x, y: p.y + d.y }), { kind: 'rigid', cannot: 'taşınamaz', lenient, before });
}

/** "dört beş noktasına", "x = 2 y = 3 konumuna" */
const NUMBER_PAIR = /(?:\bx (?:=|:) )?(#\d+) (?:[,;] |ve )?(?:y (?:=|:) )?(#\d+) (?:konum|nokta|koordinat)\w*/;

function adjustedNote(s: CommandScene, adjusted: PointObject[]): string {
  return adjusted.map(p => {
    const host = p.onObjectId ? s.get(p.onObjectId) : undefined;
    const now = s.point(p.id);
    return ` ${p.label} noktası ${host ? describe(host) : 'nesne'} üzerine kilitli olduğu için en yakın konuma ${fmtPoint(now)} yerleşti.`;
  }).join('');
}

/**
 * Cümle yalnızca fonksiyonları mı gösteriyor? "f yi …", "g fonksiyonunu …" (adla) ya da ad yoksa "fonksiyonu …".
 * "A noktasını ve f yi 2 birim sağa ötele" karışıktır: öteleme (dönüşüm ailesi) noktanın görüntüsünü çizer, fonksiyonu kaydırır.
 */
function functionTarget(c: Clause, s: CommandScene): boolean {
  if (!c.labels.length) return /\bfonksiyon\w*/.test(c.text);
  // Vektör ve başlangıç/varış noktası adları hedef değildir: "f yi AB vektörü kadar ötele", "f yi A'dan B'ye kaydır".
  const targets = c.labels.filter((_, i) => !/^vektor/.test(nextWordOfLabel(c, i)) && labelRole(c, i) !== 'abl' && labelRole(c, i) !== 'dat');
  return targets.length > 0 && targets.every(l => { const found = s.resolveLabel(l); return found.length > 0 && found.every(o => o.type === 'function'); });
}

const moveHandler: CommandHandler = {
  id: 'edit.move',
  examples: ["A'yı (3;4)'e taşı", 'A noktasını 2 birim sağa taşı', "ABC'yi (1,-2) kadar kaydır", "c1'in merkezini (0,0)'a taşı", "ABC'yi 3 birim yukarı kaydır",
    'A noktasını B noktasına taşı', 'f fonksiyonunu 2 birim yukarı kaydır', "ABC'yi AB vektörü kadar kaydır"],
  match(c, s) {
    const t = c.text;
    // "A noktasının koordinatlarını (5;1) yap"
    const setPosition = c.coords.length > 0 && /\b(?:koordinat|konum)(?:u|unu|lari|larini|i|ini)\b/.test(t) && SET_VERB.test(t);
    // "f yi 2 birim sağa ötele": dönüşüm ailesi fonksiyonu ötelemez; fonksiyon burada kaydırılır.
    const functionShift = /\botele\w*/.test(t) && !/\b(?:dondur|yansit)\w*/.test(t) && functionTarget(c, s);
    if ((!c.hasVerb('move') && !/\bgotur\w*/.test(t) && !setPosition && !functionShift) || (/\b(?:otele|dondur|yansit)\w*/.test(t) && !functionShift) || STRONG_CREATE.test(t)) return 0;
    if (/\betiket\w*|\bolcum\w*|\bgorunum\w*|\bekran\w*|\btuval\w*|\bkaydirici\w*/.test(t)) return 0;
    if (c.labels.length === 1 && !c.coords.length && c.numbers.length && !parseDirections(c)) {
      if (candidatesFor(s, c.labels[0]).some(o => o.type === 'slider')) return 0;
    }
    return 88;
  },
  run(c, s) {
    const directional = directionLabelIdx(c);
    const all = c.labels.map((_, i) => i).filter(i => !directional.includes(i));
    const roles = c.labels.map((_, i) => labelRole(c, i));
    const vectorIdx = all.filter(i => /^vektor/.test(nextWordOfLabel(c, i)));
    const fromIdx = all.filter(i => !vectorIdx.includes(i) && roles[i] === 'abl');
    const destIdx = all.filter(i => !vectorIdx.includes(i) && roles[i] === 'dat');
    const targetIdx = all.filter(i => !vectorIdx.includes(i) && !fromIdx.includes(i) && !destIdx.includes(i));
    const crole = coordRoles(c);
    const dirs = parseDirections(c);

    let delta: Point2D | undefined, dest: Point2D | undefined, deltaText = '', destText = '';
    const pointOfLabel = (i: number) => {
      const pts = s.pointsFromLabel(c.labels[i].text);
      if (!pts || pts.length !== 1) fail(`${cleanLabel(c.labels[i].text)} noktası bulunamadı.`);
      return pts[0];
    };
    if (vectorIdx.length) {
      const pts = s.pointsFromLabel(c.labels[vectorIdx[0]].text);
      if (!pts || pts.length !== 2) fail('Vektörü iki noktanın adıyla yazın (ör. “ABC’yi AB vektörü kadar kaydır”).');
      delta = { x: pts[1].x - pts[0].x, y: pts[1].y - pts[0].y };
      deltaText = `${pts[0].label}${pts[1].label} vektörü kadar`;
    } else if (fromIdx.length && destIdx.length) {
      const a = pointOfLabel(fromIdx[0]), b = pointOfLabel(destIdx[0]);
      delta = { x: b.x - a.x, y: b.y - a.y };
      deltaText = `${a.label} noktasından ${b.label} noktasına`;
    } else if (crole.includes('relative')) {
      delta = c.coords[crole.indexOf('relative')];
      deltaText = `${fmtPoint(delta)} kadar`;
    } else if (dirs) {
      delta = dirs.vector;
      deltaText = dirs.text;
    } else if (c.coords.length) {
      dest = c.coords[0];
      destText = fmtPoint(dest);
    } else if (destIdx.length) {
      const p = pointOfLabel(destIdx[0]);
      dest = { x: p.x, y: p.y };
      destText = `${p.label} noktasının konumuna ${fmtPoint(dest)}`;
    } else if (NUMBER_PAIR.test(c.text)) {
      // Konuşmada parantez yok: "A noktasını dört beş noktasına taşı" → (4; 5)
      const m = c.text.match(NUMBER_PAIR)!;
      dest = { x: c.num(m[1]), y: c.num(m[2]) };
      destText = fmtPoint(dest);
    } else if (/\bori?jin\w*|\bbaslangic noktas\w*/.test(c.text)) {
      dest = { x: 0, y: 0 };
      destText = 'orijin (0; 0)';
    } else {
      fail(functionTarget(c, s)
        ? 'Fonksiyonu kaydırmak için yön ve miktar yazın (ör. “f fonksiyonunu 2 birim sağa ötele” ya da “f yi 3 birim yukarı kaydır”).'
        : 'Nereye taşıyayım? Örneğin “A’yı (3;4) noktasına taşı” ya da “ABC’yi 2 birim sağa kaydır” yazın.');
    }

    const targets = findTargets(c, s, { labels: targetIdx, many: true, nouns: targetNouns(c), example: "ABC'yi 2 birim sağa kaydır" });
    const lenient = new Set(targets.filter(o => o.type === 'point' && o.onObjectId).map(o => o.id));
    let message: string;
    if (dest) {
      if (targets.length > 1) fail('Birden fazla nesneyi aynı konuma taşıyamam. Miktar yazın (ör. “2 birim sağa kaydır”) ya da tek bir nesne adı yazın.');
      const [t] = targets;
      const ref = referencePoint(s, t) ?? fail(t.type === 'function'
        ? 'Fonksiyonu taşımak için yön ve miktar yazın (ör. “f fonksiyonunu 2 birim yukarı kaydır”).'
        : `${sentence(describe(t))} bir konuma taşınamaz.`);
      delta = { x: dest.x - ref.at.x, y: dest.y - ref.at.y };
      const name = sentence(describe(t));
      message = ref.kind === 'center' ? `${name}, merkezi ${destText} olacak şekilde taşındı.`
        : ref.kind === 'centroid' ? `${name}, ağırlık merkezi ${destText} olacak şekilde taşındı.`
        : `${name} ${destText} konumuna taşındı.`;
      if (destIdx.length && ref.kind === 'point') message = `${name} ${destText} taşındı.`;
    } else {
      message = `${sentence(describeList(targets))} ${deltaText} kaydırıldı.`;
      if (dirs?.defaulted) message += ' Miktar yazılmadığı yönler için 1 birim kullanıldı.';
    }
    const adjusted = shiftObjects(s, targets, delta!, lenient);
    s.setFocus(ids(targets));
    s.say(message + adjustedNote(s, adjusted));
  },
};

// ============================================================================ boyut ayarlama

const SIZE_WORDS = /\b(?:uzunlug\w*|boy(?:u|unu)|mesafe\w*|uzaklig\w*|yaricap\w*|cap(?:i|ini)|kenar\w*|boyut\w*|en(?:i|ini)|genislig\w*|yukseklig\w*|alan(?:i|ini)|cevre(?:si|sini)|olcu(?:su|sunu)|derece\w*|aci(?:si|sini|yi|nin|sinin)?)\b/;
const SIZE_TYPES: ObjectType[] = ['segment', 'line', 'ray', 'circle', 'ellipse', 'arc', 'sector', 'angle', 'polygon'];
const NOT_SIZE_NOUNS = new Set(['text', 'fraction', 'slider', 'function', 'checkbox', 'button', 'inputBox', 'image', 'pen']);

function formalSize(c: Clause, s: CommandScene): { kind: 'length' | 'angle'; ref: LabelRef; value: number } | null {
  const m = c.text.match(/^(∠ )?\$0 = #0$/);
  if (!m || c.labels.length !== 1 || c.numbers.length !== 1) return null;
  const ref = c.labels[0];
  if (s.sliders().some(o => labelKey(o.variableName) === labelKey(ref.text))) return null;
  if (m[1]) return candidatesFor(s, ref, SPECS.angle).length || s.pointsFromLabel(ref.text)?.length === 3 ? { kind: 'angle', ref, value: c.numbers[0] } : null;
  return candidatesFor(s, ref, SPECS.segment).length ? { kind: 'length', ref, value: c.numbers[0] } : null;
}

function twoPointLabel(c: Clause, s: CommandScene): { ref: LabelRef; points: [PointObject, PointObject] } | null {
  for (const ref of c.labels) {
    const pts = s.pointsFromLabel(ref.text);
    if (pts?.length === 2) return { ref, points: [pts[0], pts[1]] };
  }
  return null;
}

function setPairLength(s: CommandScene, first: PointObject, second: PointObject, value: number) {
  if (!(value > 0 && value <= 10000)) fail('Uzunluk 0’dan büyük olmalı (en fazla 10000).');
  let [fixed, moving] = [first, second];
  if (!isFree(moving) && isFree(fixed)) [fixed, moving] = [moving, fixed];
  const dx = moving.x - fixed.x, dy = moving.y - fixed.y, length = Math.hypot(dx, dy);
  if (length < 1e-9) fail('İki uç üst üste; yön belirsiz. Önce noktalardan birini taşıyın.');
  const target = { x: fixed.x + dx * value / length, y: fixed.y + dy * value / length };
  transformPoints(s, [moving.id], () => target, { kind: 'rigid', cannot: 'uzunluk değiştirilemez' });
  const [a, b] = [s.point(first.id), s.point(second.id)];
  if (Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - value) > 1e-6) {
    const bound = [a, b].find(p => p.construction);
    fail(bound
      ? `${bound.label} noktası bir ${constructionName(bound)} olduğu için ${moving.label} taşınınca o da yer değiştiriyor; |${first.label}${second.label}| tam ${trNum(value)} yapılamadı. Bağlı olduğu noktaları değiştirin.`
      : `|${first.label}${second.label}| uzunluğu ${trNum(value)} yapılamadı; noktalar başka nesnelere bağlı.`);
  }
  s.setFocus(s.shapesWithPoints([first.id, second.id], ['segment', 'line', 'ray']).map(o => o.id));
  s.say(`|${first.label}${second.label}| = ${trNum(value)} br yapıldı; ${moving.label} noktası ${fmtPoint(target)} konumuna taşındı.`);
}

function setCircleRadius(s: CommandScene, o: MathObject, r: number, word = 'yarıçap') {
  if (!(r > 0 && r <= 10000 && Number.isFinite(r))) fail('Yarıçap 0’dan büyük olmalı (en fazla 10000).');
  const name = sentence(describe(o));
  if (o.type === 'circle') {
    const circle = o as CircleObject;
    if (circle.throughPointIds?.length) fail('Üç noktadan geçen çemberin yarıçapı bu noktalarla belirlenir; yarıçapı değiştirmek için noktaları taşıyın.');
    if (circle.radiusPointId) {
      const c = s.pos(circle.centerPointId), p = s.point(circle.radiusPointId);
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      const u = d < 1e-9 ? { x: 1, y: 0 } : { x: (p.x - c.x) / d, y: (p.y - c.y) / d };
      transformPoints(s, [p.id], () => ({ x: c.x + u.x * r, y: c.y + u.y * r }), { kind: 'rigid', cannot: 'yarıçap değiştirilemez' });
    } else {
      const before = snapshot(s);
      const label = /\(r = [^)]*\)$/.test(circle.label) ? circle.label.replace(/\(r = [^)]*\)$/, `(r = ${trNum(r)})`) : circle.label;
      s.update(circle.id, { fixedRadius: tidy(r), label });
      s.resolve();
      reproject(s, before);
    }
  } else if (o.type === 'arc' || o.type === 'sector') {
    const c = s.pos(o.centerPointId);
    transformPoints(s, [o.startPointId, o.directionPointId], p => {
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      return d < 1e-9 ? { x: c.x + r, y: c.y } : { x: c.x + (p.x - c.x) * r / d, y: c.y + (p.y - c.y) * r / d };
    }, { kind: 'similar', cannot: 'yarıçap değiştirilemez' });
  } else fail(`${name} bir çember, yay ya da daire dilimi değil.`);
  s.setFocus([o.id]);
  s.say(`${name}: ${word} ${trNum(word === 'çap' ? r * 2 : r)} br yapıldı.`);
}

function scalePolygon(s: CommandScene, poly: PolygonObject, k: number) {
  if (!(k > 0 && Number.isFinite(k))) fail('Ölçü 0’dan büyük olmalı.');
  const c = centroid(s.vertices(poly));
  transformPoints(s, poly.pointIds, p => ({ x: c.x + (p.x - c.x) * k, y: c.y + (p.y - c.y) * k }), { kind: 'similar', cannot: 'boyutu değiştirilemez' });
  s.setFocus([poly.id]);
}

function sizeTarget(c: Clause, s: CommandScene, prefer: ObjectType[], example: string): MathObject {
  const nouns = targetNouns(c);
  return findTargets(c, s, { many: false, nouns, prefer, soleFallback: true, example, filter: o => prefer.includes(o.type) })[0];
}

function setEllipse(c: Clause, s: CommandScene, e: EllipseObject, value: number, diameter: boolean) {
  const t = c.text;
  let rx = e.radiusX, ry = e.radiusY;
  const half = (n: number) => diameter ? n / 2 : n;
  if (c.numbers.length >= 2) { rx = half(c.numbers[0]); ry = half(c.numbers[1]); }
  else if (/\byatay|\bx yaricap|\bbuyuk yaricap/.test(t)) rx = half(value);
  else if (/\bdikey|\by yaricap|\bkucuk yaricap/.test(t)) ry = half(value);
  else rx = ry = half(value);
  if (!(rx > 0 && ry > 0 && rx <= 10000 && ry <= 10000)) fail('Elipsin yarıçapları 0’dan büyük olmalı.');
  const before = snapshot(s);
  s.update(e.id, { radiusX: tidy(rx), radiusY: tidy(ry) });
  s.resolve();
  reproject(s, before);
  s.setFocus([e.id]);
  s.say(`${sentence(describe(e))}: yatay yarıçap ${trNum(rx)}, dikey yarıçap ${trNum(ry)} br yapıldı.`);
}

/** "yarıçapını 1 artır", "uzunluğunu 2 birim azalt", "kenarını 2 katına çıkar", "alanını yarısına indir": mevcut ölçüden yeni ölçü. */
const RELATIVE = /\b(?:artir|arttir|azalt|eksilt)\w*|#\d+ katina\b|\byarisina\b/;
type Change = (current: number) => number;
function relativeChange(c: Clause): Change | undefined {
  const t = c.text;
  if (/\byarisina\b/.test(t)) return v => v / 2;
  const kat = t.match(/(#\d+) katina\b/);
  if (kat) { const k = c.num(kat[1]); return v => v * k; }
  const n = c.numbers[0];
  if (n === undefined) return undefined;
  if (/\b(?:artir|arttir)\w*/.test(t)) return v => v + n;
  if (/\b(?:azalt|eksilt)\w*/.test(t)) return v => v - n;
  return undefined;
}

function setAngle(c: Clause, s: CommandScene, degreesOrChange: number | Change, labels: LabelRef[] = c.labels) {
  if (typeof degreesOrChange === 'number' && !(degreesOrChange > 0 && degreesOrChange < 360)) fail('Açı 0 ile 360 derece arasında olmalı.');
  let angle: AngleObject | undefined;
  let triple: PointObject[] | undefined;
  for (const ref of labels) {
    const named = candidatesFor(s, ref, SPECS.angle);
    if (named.length) { angle = pick(ref, named) as AngleObject; break; }
    const pts = s.pointsFromLabel(ref.text);
    if (pts?.length === 3) { triple = pts; break; }
    if (pts?.length === 1) {
      const v = pts[0];
      const angles = s.ofType('angle').filter(a => a.vertexPointId === v.id);
      if (angles.length === 1) { angle = angles[0]; break; }
      if (angles.length > 1) fail(`${v.label} köşesinde birden fazla açı var (${angles.map(a => a.label).join(', ')}). Üç harfle yazın (ör. “ABC açısını 60 derece yap”).`);
      const polys = s.ofType('polygon').filter(p => p.pointIds.includes(v.id));
      if (polys.length > 1) fail(`${v.label} birden fazla çokgenin köşesi. Açıyı üç harfle yazın (ör. “ABC açısını 60 derece yap”).`);
      if (polys.length === 1) {
        const list = polys[0].pointIds, i = list.indexOf(v.id), n = list.length;
        triple = [s.point(list[(i + n - 1) % n]), v, s.point(list[(i + 1) % n])];
        break;
      }
      fail(`${v.label} köşesinde bir açı bulunamadı. Açıyı üç harfle yazın (ör. “ABC açısını 60 derece yap”).`);
    }
  }
  if (!angle && !triple) {
    const found = findTargets(c, s, { labels: [], many: false, nouns: targetNouns(c), prefer: ['angle'], soleFallback: true, filter: o => o.type === 'angle', example: 'ABC açısını 60 derece yap' })[0];
    if (found.type !== 'angle') fail('Hangi açı? Açıyı üç harfle yazın (ör. “ABC açısını 60 derece yap”).');
    angle = found;
  }
  if (angle) triple = [s.point(angle.point1Id), s.point(angle.vertexPointId), s.point(angle.point3Id)];
  const [p1, v, p3] = triple!;
  const inner = calculateAngleDegrees(p1, v, p3);
  const degrees = typeof degreesOrChange === 'number' ? degreesOrChange : degreesOrChange(angle?.reflex ? 360 - inner : inner);
  if (!(degrees > 0 && degrees < 360)) fail(`Açı 0 ile 360 derece arasında olmalı (istenen: ${trNum(degrees)}°).`);
  let interior = degrees;
  let reflex: boolean | undefined;
  if (angle?.reflex) {
    interior = 360 - degrees;
    if (interior > 180) { interior = degrees; reflex = false; }
  } else if (degrees > 180) {
    if (!angle) fail('180 dereceden büyük açı için açıyı dış açı olarak gösterin (ör. “B açısını dış açı yap”) ya da iç açıyı yazın.');
    interior = 360 - degrees;
    reflex = true;
  }
  let [fixed, moving] = [p1, p3];
  if (!isFree(moving) && isFree(fixed)) [fixed, moving] = [moving, fixed];
  const fx = fixed.x - v.x, fy = fixed.y - v.y, mx = moving.x - v.x, my = moving.y - v.y;
  const r = Math.hypot(mx, my);
  if (r < 1e-9 || Math.hypot(fx, fy) < 1e-9) fail('Açının kolu köşeyle çakışıyor; önce noktaları ayırın.');
  const sign = fx * my - fy * mx >= 0 ? 1 : -1;
  const theta = Math.atan2(fy, fx) + sign * interior * Math.PI / 180;
  const target = { x: v.x + r * Math.cos(theta), y: v.y + r * Math.sin(theta) };
  transformPoints(s, [moving.id], () => target, { kind: 'rigid', cannot: 'açı değiştirilemez' });
  const reached = calculateAngleDegrees(s.pos(p1.id), s.pos(v.id), s.pos(p3.id));
  if (Math.abs(reached - interior) > 1e-6) {
    const bound = [p1, v, p3].map(p => s.point(p.id)).find(p => p.construction);
    fail(`∠${p1.label}${v.label}${p3.label} tam ${trNum(degrees)}° yapılamadı${bound ? `: ${bound.label} noktası bir ${constructionName(bound)} ve ${moving.label} taşınınca yer değiştiriyor` : ''}. Bağlı noktaları değiştirin.`);
  }
  if (angle && reflex !== undefined) s.update(angle.id, { reflex });
  s.setFocus(angle ? [angle.id] : [moving.id]);
  s.say(`∠${p1.label}${v.label}${p3.label} = ${trNum(degrees)}° yapıldı; ${moving.label} noktası ${fmtPoint(target)} konumuna taşındı.`);
}

const sizeHandler: CommandHandler = {
  id: 'edit.size',
  examples: ["AB'nin uzunluğunu 5 yap", 'AB = 5', 'çemberin yarıçapını 4 yap', 'ABC açısını 60 derece yap', 'karenin kenarını 5 yap',
    'dikdörtgenin boyutlarını 3 ve 6 yap', 'elipsin yarıçaplarını 4 ve 2 yap', 'çemberin çapını 10 yap', "ABC'nin alanını 24 yap", "AB'yi 5 birim yap"],
  match(c, s) {
    const t = c.text;
    if (/\bbagla|\bkaydirici|\bsurgu|\bolan\b|\bolacak/.test(t) || STRONG_CREATE.test(t)) return 0;
    // "ABC'yi A etrafında 90 derece çevir", "90 derece döndür A noktası merkez olsun": dönme (transforms ailesi).
    if (/\b(?:dondur|cevir)\w*/.test(t) && /\b(?:etraf|cevresi|merkez)\w*|\bsaat(?:in)? yon\w*/.test(t)) return 0;
    if (formalSize(c, s)) return 98;
    const relative = RELATIVE.test(t) && SIZE_WORDS.test(t);
    if ((!c.numbers.length && !relative) || (!SET_VERB.test(t) && !relative) || c.hasVerb('question')) return 0;
    const nouns = targetNouns(c);
    if (nouns.some(n => NOT_SIZE_NOUNS.has(n.spec.key))) return 0;
    if (SIZE_WORDS.test(t)) {
      if (c.numbers.length >= 3 && (/\bkenar/.test(t) || nouns.some(n => n.spec.key === 'triangle'))) return 0;
      // Boyutu değişecek bir şey yoksa (ör. boş sahnede "EFG açısı 50 derece olsun") bu bir oluşturma cümlesidir;
      // "AB'nin uzunluğunu 5 yap" ise var olan nesneyi ister (bulunamazsa açıklamalı hata).
      const editsExisting = relative || (/\b(?:uzunlugunu|yaricapini|capini|acisini|olcusunu|alanini|cevresini|kenarini|boyunu|enini)\b/.test(t) && /\b(?:yap|ayarla|degistir|guncelle)\w*/.test(t));
      if (!editsExisting && !s.objects.some(o => SIZE_TYPES.includes(o.type)) && c.labels.every(l => !s.pointsFromLabel(l.text))) return 0;
      return 90;
    }
    if (c.labels.length === 1 && c.numbers.length === 1) {
      const list = candidatesFor(s, c.labels[0]);
      if (list.some(o => o.type === 'slider')) return 0;
      if (list.some(o => o.type === 'segment' || o.type === 'circle' || o.type === 'angle')) return 86;
    }
    return 0;
  },
  run(c, s) {
    const formal = formalSize(c, s);
    if (formal?.kind === 'angle') { setAngle(c, s, formal.value, [formal.ref]); return; }
    if (formal?.kind === 'length') {
      const seg = pick(formal.ref, candidatesFor(s, formal.ref, SPECS.segment)) as Extract<MathObject, { type: 'segment' }>;
      const pts = s.pointsFromLabel(formal.ref.text);
      const [a, b] = pts?.length === 2 ? pts : [s.point(seg.startPointId), s.point(seg.endPointId)];
      setPairLength(s, a, b, formal.value);
      return;
    }
    const t = c.text;
    const nums = c.numbers;
    const first = nums[0];
    const rel = relativeChange(c);

    // Yarıçap / çap
    if (/\byaricap\w*|\bcap(?:i|ini)\b/.test(t)) {
      const diameter = /\bcap(?:i|ini)\b/.test(t) && !/\byaricap/.test(t);
      const target = sizeTarget(c, s, ['circle', 'arc', 'sector', 'ellipse'], 'çemberin yarıçapını 4 yap');
      if (target.type === 'ellipse') {
        if (rel) fail('Elipsin yarıçaplarını değerleriyle yazın (ör. “elipsin yarıçaplarını 4 ve 2 yap”).');
        setEllipse(c, s, target, c.paramAfter(/yaricap|cap/) ?? first, diameter);
        return;
      }
      const value = rel ? rel((s.circleOf(target)?.radius ?? 0) * (diameter ? 2 : 1)) : c.paramAfter(/yaricap|cap/) ?? first;
      setCircleRadius(s, target, diameter ? value / 2 : value, diameter ? 'çap' : 'yarıçap');
      return;
    }
    // Açı
    if (/\bderece\w*|\baci(?:si|sini|yi|nin|sinin)?\b|∠/.test(t)) {
      setAngle(c, s, rel ?? c.paramAfter(/aci|olcu/) ?? first);
      return;
    }
    // Alan / çevre
    const area = /\balan(?:i|ini)\b/.test(t), perimeter = /\bcevre(?:si|sini)\b/.test(t);
    if (area || perimeter) {
      const target = sizeTarget(c, s, ['polygon', 'circle', 'ellipse'], `ABC'nin ${area ? 'alanını 24' : 'çevresini 12'} yap`);
      const currentMeasure = (): number => {
        if (target.type === 'polygon') { const v = s.vertices(target); return area ? calculatePolygonArea(v) : calculatePolygonPerimeter(v); }
        if (target.type === 'circle') { const r = s.circleOf(target)?.radius ?? 0; return area ? Math.PI * r * r : 2 * Math.PI * r; }
        if (target.type === 'ellipse' && area) return Math.PI * target.radiusX * target.radiusY;
        return fail(`${sentence(describe(target))} için ${area ? 'alan' : 'çevre'} bu şekilde değiştirilemez.`);
      };
      const value = rel ? rel(currentMeasure()) : c.paramAfter(area ? /alan/ : /cevre/) ?? first;
      if (!(value > 0)) fail(`${area ? 'Alan' : 'Çevre'} 0’dan büyük olmalı.`);
      if (target.type === 'polygon') {
        const v = s.vertices(target);
        const current = area ? calculatePolygonArea(v) : calculatePolygonPerimeter(v);
        if (!(current > 1e-12)) fail('Çokgenin alanı sıfır; önce köşeleri ayırın.');
        scalePolygon(s, target, area ? Math.sqrt(value / current) : value / current);
        s.say(`${sentence(describe(target))}: ${area ? 'alan' : 'çevre'} ${trNum(value)} ${area ? 'br²' : 'br'} yapıldı (şekli korunarak ölçeklendi).`);
        return;
      }
      if (target.type === 'circle') {
        setCircleRadius(s, target, area ? Math.sqrt(value / Math.PI) : value / (2 * Math.PI));
        return;
      }
      if (target.type === 'ellipse') {
        if (!area) fail('Elipsin çevresi için yarıçapları yazın (ör. “elipsin yarıçaplarını 4 ve 2 yap”).');
        const k = Math.sqrt(value / (Math.PI * target.radiusX * target.radiusY));
        const before = snapshot(s);
        s.update(target.id, { radiusX: tidy(target.radiusX * k), radiusY: tidy(target.radiusY * k) });
        s.resolve();
        reproject(s, before);
        s.setFocus([target.id]);
        s.say(`${sentence(describe(target))}: alan ${trNum(value)} br² yapıldı.`);
        return;
      }
      fail(`${sentence(describe(target))} için ${area ? 'alan' : 'çevre'} ayarlanamaz.`);
    }
    // İki noktalı etiket: uzunluk
    const pair = twoPointLabel(c, s);
    const dims = /\bboyut\w*|\ben(?:i|ini)\b|\bgenislig\w*|\byukseklig\w*/.test(t) || (/\bboy(?:u|unu)\b/.test(t) && !pair) || (/\bkenar\w*/.test(t) && nums.length === 2);
    if (pair && !dims) {
      const [a, b] = pair.points;
      setPairLength(s, a, b, rel ? rel(Math.hypot(b.x - a.x, b.y - a.y)) : c.paramAfter(/uzunlug|kenar|boy|mesafe|uzaklig/) ?? first);
      return;
    }
    if (dims || /\bkenar\w*/.test(t)) {
      const poly = sizeTarget(c, s, ['polygon'], 'karenin kenarını 5 yap');
      if (poly.type !== 'polygon') fail(`${sentence(describe(poly))} bir çokgen değil.`);
      if (dims) {
        if (!isRightQuad(poly, s)) fail(`${sentence(describe(poly))} dikdörtgen değil; boyutlar yalnızca kare ve dikdörtgende ayarlanabilir. Tek bir kenar için “AB kenarının uzunluğunu 5 yap” yazın.`);
        const V = s.vertices(poly);
        const u = { x: V[1].x - V[0].x, y: V[1].y - V[0].y }, w = Math.hypot(u.x, u.y);
        const v = { x: V[3].x - V[0].x, y: V[3].y - V[0].y }, h = Math.hypot(v.x, v.y);
        let W = w, H = h;
        if (nums.length >= 2 && !rel) [W, H] = [nums[0], nums[1]];
        else if (/\ben(?:i|ini)\b|\bgenislig/.test(t)) W = rel ? rel(w) : first;
        else if (/\bboy(?:u|unu)\b|\byukseklig/.test(t)) H = rel ? rel(h) : first;
        else if (rel) { W = rel(w); H = rel(h); }
        else fail('İki boyut yazın (ör. “dikdörtgenin boyutlarını 3 ve 6 yap”).');
        if (!(W > 0 && H > 0 && W <= 10000 && H <= 10000)) fail('Boyutlar 0’dan büyük olmalı.');
        const c0 = centroid(V), ux = { x: u.x / w, y: u.y / w }, vx = { x: v.x / h, y: v.y / h };
        transformPoints(s, poly.pointIds, p => {
          const a = (p.x - c0.x) * ux.x + (p.y - c0.y) * ux.y, b = (p.x - c0.x) * vx.x + (p.y - c0.y) * vx.y;
          return { x: c0.x + ux.x * a * W / w + vx.x * b * H / h, y: c0.y + ux.y * a * W / w + vx.y * b * H / h };
        }, { kind: 'affine', cannot: 'boyutu değiştirilemez' });
        s.setFocus([poly.id]);
        s.say(`${sentence(describe(poly))}: boyutlar ${trNum(W)} × ${trNum(H)} br yapıldı.`);
        return;
      }
      if (!isRegularPolygon(poly, s)) {
        const [a, b] = s.vertices(poly);
        const message = `${sentence(describe(poly))} düzgün bir çokgen değil; hangi kenar olduğunu yazın (ör. “${a.label}${b.label} kenarının uzunluğunu 5 yap”).`;
        // "ABC üçgeninin kenarlarını 6 yap": bütün kenarlar tek ölçü → eşkenar üçgen (çokgen ailesi uygular).
        if (poly.pointIds.length === 3 && /\bkenarlar/.test(t)) skip(message);
        fail(message);
      }
      const [a0, b0] = s.vertices(poly);
      const value = rel ? rel(Math.hypot(b0.x - a0.x, b0.y - a0.y)) : c.paramAfter(/kenar/) ?? first;
      if (!(value > 0 && value <= 10000)) fail('Kenar uzunluğu 0’dan büyük olmalı.');
      const [a, b] = s.vertices(poly);
      scalePolygon(s, poly, value / Math.hypot(b.x - a.x, b.y - a.y));
      s.say(`${sentence(describe(poly))}: kenar uzunluğu ${trNum(value)} br yapıldı.`);
      return;
    }
    // Uzunluk (etiketsiz ya da tek nesne adı: "AB'yi 5 yap", "doğru parçasının uzunluğunu 4 yap", "c1'i 3 yap")
    const target = sizeTarget(c, s, ['segment', 'line', 'ray', 'circle', 'arc', 'sector', 'angle'], "AB'nin uzunluğunu 5 yap");
    if (target.type === 'circle' || target.type === 'arc' || target.type === 'sector') { setCircleRadius(s, target, rel ? rel(s.circleOf(target)?.radius ?? 0) : first); return; }
    if (target.type === 'angle') { setAngle(c, s, rel ?? first); return; }
    const line = s.lineOf(target) ?? fail(`${sentence(describe(target))} için uzunluk ayarlanamaz.`);
    setPairLength(s, line[0], line[1], rel ? rel(Math.hypot(line[1].x - line[0].x, line[1].y - line[0].y)) : c.paramAfter(/uzunlug|boy|mesafe|uzaklig/) ?? first);
  },
};

// ============================================================================ yazı, kesir ve düğme içerikleri

/** "paydasını 6 yap", "payını 1 yap": önceki komutun nesnesi (ya da seçim) bir kesir modeli. */
function focusedFraction(c: Clause, s: CommandScene): boolean {
  return /\bpay(?:i|ini|dasi|dasini)\b|\b(?:serit|cubuk|pasta|daire) model\w*/.test(c.text)
    && [...s.focus, ...s.selection].some(id => s.get(id)?.type === 'fraction');
}

const textHandler: CommandHandler = {
  id: 'edit.text',
  examples: ['yazıyı "Merhaba" olarak değiştir', 'kesri 3/4 yap', 'yazının boyutunu 18 yap', 'kesrin paydasını 8 yap', 'kesri şerit modeli yap', 'düğmenin yazısını "Başlat" yap'],
  match(c, s) {
    const t = c.text;
    if (STRONG_CREATE.test(t)) return 0;
    const keys = new Set(targetNouns(c).map(n => n.spec.key));
    if (keys.has('fraction') || /\bkesr(?:i|in)\b/.test(t) || focusedFraction(c, s)) {
      if (/#\d+ (?:\/|bolu) #\d+ kes(?:ir|ri)/.test(t)) return 0;
      if (/\bpay(?:i|ini|dasi|dasini)\b/.test(t) && c.numbers.length) return 89;
      if (/#\d+ (?:\/|bolu) #\d+/.test(t) && SET_VERB.test(t)) return 89;
      if (/\b(?:serit|cubuk|bar|pasta|daire model)\w*/.test(t) && SET_VERB.test(t)) return 89;
      return 0;
    }
    if (keys.has('button') || keys.has('checkbox') || keys.has('inputBox')) return c.quotes.length && (SET_VERB.test(t) || /\bolarak\b/.test(t)) ? 89 : 0;
    if (keys.has('text')) {
      if (/\byazilar\w*/.test(t) && !c.labels.length) return 0;
      if (c.quotes.length && (SET_VERB.test(t) || /\bolarak\b/.test(t))) return 89;
      if (/\b(?:boyut\w*|punto\w*|font\w*|buyuklug\w*)/.test(t) && c.numbers.length && SET_VERB.test(t)) return 89;
      if (/\b(?:buyut|kucult)\w*/.test(t)) return 88;
      return 0;
    }
    if (c.quotes.length && /\bolarak degistir/.test(t) && [...s.focus, ...s.selection].some(id => s.get(id)?.type === 'text')) return 86;
    return 0;
  },
  run(c, s) {
    const t = c.text;
    const nouns = targetNouns(c);
    const keys = new Set(nouns.map(n => n.spec.key));
    if (keys.has('fraction') || /\bkesr(?:i|in)\b/.test(t) || focusedFraction(c, s)) {
      const f = findTargets(c, s, { many: false, nouns, prefer: ['fraction'], soleFallback: true, filter: o => o.type === 'fraction', example: 'kesri 3/4 yap' })[0];
      if (f.type !== 'fraction') fail(`${sentence(describe(f))} bir kesir modeli değil.`);
      let { numerator: n, denominator: d, modelType } = f;
      const ratio = t.match(/(#\d+) (?:\/|bolu) (#\d+)/);
      if (ratio) { n = c.num(ratio[1]); d = c.num(ratio[2]); }
      const num = t.match(/\bpay(?:i|ini) (?:= )?(#\d+)/), den = t.match(/\bpayda(?:si|sini) (?:= )?(#\d+)/);
      if (num) n = c.num(num[1]);
      if (den) d = c.num(den[1]);
      if (/\b(?:serit|cubuk|bar)\w*/.test(t)) modelType = 'bar';
      if (/\b(?:pasta|daire model)\w*/.test(t)) modelType = 'pie';
      if (!Number.isInteger(n) || !Number.isInteger(d) || n < 0 || n > 30 || d < 1 || d > 30) fail('Kesir için 0–30 arası pay ve 1–30 arası payda yazın (ör. “kesri 3/4 yap”).');
      s.update(f.id, { numerator: n, denominator: d, modelType, label: `${n}/${d} Kesir Modeli` });
      s.setFocus([f.id]);
      s.say(`Kesir modeli ${n}/${d} yapıldı${modelType !== f.modelType ? ` (${modelType === 'bar' ? 'şerit' : 'daire'} modeli)` : ''}.`);
      return;
    }
    if (keys.has('button') || keys.has('checkbox') || keys.has('inputBox')) {
      const types: ObjectType[] = ['button', 'checkbox', 'input_box'];
      const w = findTargets(c, s, { many: false, nouns, prefer: types, soleFallback: true, filter: o => types.includes(o.type), example: 'düğmenin yazısını "Başlat" yap' })[0];
      const label = c.quotes[c.quotes.length - 1].trim();
      if (!label) fail('Yeni yazıyı tırnak içinde yazın.');
      const before = describe(w);
      s.update(w.id, { label });
      s.setFocus([w.id]);
      s.say(`${sentence(before)} yazısı “${label}” yapıldı.`);
      return;
    }
    let target: MathObject | undefined;
    if (c.quotes.length >= 2) {
      const key = c.quotes[0].trim().toLocaleLowerCase('tr');
      const matches = s.ofType('text').filter(o => o.text.trim().toLocaleLowerCase('tr') === key);
      if (matches.length > 1) fail(`“${c.quotes[0]}” yazısı birden fazla. Önce birini seçin.`);
      target = matches[0];
      if (!target) fail(`“${c.quotes[0]}” yazısı bulunamadı.`);
    }
    target ??= findTargets(c, s, { many: false, nouns, prefer: ['text'], soleFallback: true, filter: o => o.type === 'text', example: 'yazıyı "Merhaba" olarak değiştir' })[0];
    if (target.type !== 'text') fail(`${sentence(describe(target))} bir yazı değil.`);
    s.setFocus([target.id]);
    if (c.quotes.length) {
      const text = c.quotes[c.quotes.length - 1];
      if (!text.trim()) fail('Yeni yazıyı tırnak içinde yazın (ör. yazıyı "Merhaba" olarak değiştir).');
      const label = target.label === target.text.slice(0, 20) ? text.slice(0, 20) : target.label;
      s.update(target.id, { text, label });
      s.say(`Yazı “${text}” olarak değiştirildi.`);
      return;
    }
    const current = target.fontSize || 14;
    const size = /\bbuyut\w*/.test(t) && !c.numbers.length ? Math.round(current * 1.25)
      : /\bkucult\w*/.test(t) && !c.numbers.length ? Math.round(current / 1.25)
        : c.paramAfter(/boyut|punto|font|buyuklug/) ?? c.numbers[0];
    if (!(size >= 6 && size <= 96)) fail('Yazı boyutu 6 ile 96 arasında olmalı.');
    s.update(target.id, { fontSize: size });
    s.say(`${sentence(describe(target))}: yazı boyutu ${trNum(size)} yapıldı.`);
  },
};

// ============================================================================ kopyalama

const copyHandler: CommandHandler = {
  id: 'edit.copy',
  examples: ["ABC'yi kopyala", 'çoğalt', 'ABC üçgenini 5 birim sağa kopyala', "c1'i (6;0) noktasına kopyala", 'A noktasını 3 kez çoğalt'],
  match(c) {
    // "kopya oluşturmadan yansıt", "kopyalamadan döndür": kopyalama değil, yerinde dönüşüm (transforms ailesi).
    if (/\bkopya\w*\s+(?:olusturmadan|olmadan|yapmadan|cikarmadan|almadan)|\bkopyalamadan|\bkopyasiz/.test(c.text)) return 0;
    return c.hasVerb('copy') && !/\byapistir/.test(c.text) ? 88 : 0;
  },
  run(c, s) {
    const directional = directionLabelIdx(c);
    const all = c.labels.map((_, i) => i).filter(i => !directional.includes(i));
    const roles = c.labels.map((_, i) => labelRole(c, i));
    const destIdx = all.filter(i => roles[i] === 'dat');
    const targetIdx = all.filter(i => !destIdx.includes(i));
    const targets = editTargets(c, s, { labels: targetIdx, many: true, nouns: targetNouns(c), example: "ABC'yi kopyala" });
    const countMatch = c.text.match(/(#\d+) (?:kez|kere|tane|kopya)\w*/);
    const count = countMatch ? c.num(countMatch[1]) : 1;
    if (!Number.isInteger(count) || count < 1 || count > 10) fail('Bir seferde 1 ile 10 arasında kopya oluşturabilirim.');
    const clip = copyObjects(s.objects, ids(targets));
    const positions = clip.objects.flatMap(o => o.type === 'pen' ? o.points : 'x' in o && typeof o.x === 'number' && typeof o.y === 'number' ? [{ x: o.x, y: o.y }] : []);
    const center = positions.length ? centroid(positions) : s.viewCenter();
    const crole = coordRoles(c);
    const dirs = parseDirections(c);
    const copies: MathObject[] = [];
    const focus: string[] = [];
    for (let k = 1; k <= count; k++) {
      let location: Point2D;
      if (crole.includes('relative')) { const v = c.coords[crole.indexOf('relative')]; location = { x: center.x + v.x * k, y: center.y + v.y * k }; }
      else if (dirs) location = { x: center.x + dirs.vector.x * k, y: center.y + dirs.vector.y * k };
      else if (c.coords.length) location = { x: c.coords[0].x + (k - 1) * 2, y: c.coords[0].y };
      else if (destIdx.length) {
        const pts = s.pointsFromLabel(c.labels[destIdx[0]].text);
        if (!pts || pts.length !== 1) fail(`${cleanLabel(c.labels[destIdx[0]].text)} noktası bulunamadı.`);
        location = { x: pts[0].x + (k - 1) * 2, y: pts[0].y };
      } else {
        const box = s.bbox(clip.objects) ?? { minX: center.x, maxX: center.x, minY: center.y, maxY: center.y };
        const spot = s.placeShape(Math.max(1, box.maxX - box.minX), Math.max(1, box.maxY - box.minY));
        location = { x: spot.x + center.x - (box.minX + box.maxX) / 2, y: spot.y + center.y - (box.minY + box.maxY) / 2 };
      }
      const pasted = pasteObjects(clip, s.objects, location);
      const byId = new Map(pasted.objects.map(o => [o.id, o]));
      const sourceById = new Map(clip.objects.map(o => [o.id, o]));
      pasted.objects.forEach((copy, i) => {
        const source = clip.objects[i];
        if (copy.type === 'point') return;
        if (copy.type === 'slider' && source.type === 'slider' && source.label === `${source.variableName} Parametresi`) { copy.label = `${copy.variableName} Parametresi`; return; }
        const oldSeq = labelSequence(source).map(id => sourceById.get(id)?.label ?? s.get(id)?.label ?? '').join('');
        const newSeq = labelSequence(copy).map(id => byId.get(id)?.label ?? '').join('');
        const next = replaceCanonical(source.label, oldSeq, newSeq);
        if (next && !s.objects.some(o => o.label === next) && !pasted.objects.some(o => o !== copy && o.label === next)) copy.label = next;
      });
      for (const o of pasted.objects) s.add(o);
      copies.push(...pasted.selectedIds.map(id => s.must(id)));
      focus.push(...pasted.selectedIds);
    }
    s.resolve();
    s.setFocus(focus);
    s.say(`${sentence(describeList(targets))} kopyalandı: ${describeList(copies)}.`);
  },
};

// ============================================================================ kilitle / kilidi aç

const UNLOCK = /\bkilid\w*\s+(?:kaldir|coz|ac)\w*|\bkilit\w*\s+coz\w*|\bkilitten (?:cikar|kurtar)\w*|\bserbest (?:birak|yap)\w*/;
const LOCK_TYPES: ObjectType[] = ['line', 'segment', 'ray', 'circle'];

const lockHandler: CommandHandler = {
  id: 'edit.lock',
  examples: ['C noktasını AB doğrusuna kilitle', "P'yi c1 çemberine sabitle", "A'nın kilidini aç", 'P noktasını serbest bırak', "C'yi AB üzerine kilitle"],
  match(c) {
    const t = c.text;
    if (c.hasVerb('unlock') || UNLOCK.test(t)) return 89;
    if (!c.hasVerb('lock') && !/\b(?:uzerine|ustune)\s+(?:bagla|yapistir|oturt)\w*/.test(t)) return 0;
    return /\bkaydirici|\bsurgu/.test(t) ? 0 : 89;
  },
  run(c, s) {
    const t = c.text;
    if (c.hasVerb('unlock') || UNLOCK.test(t)) {
      const targets = findTargets(c, s, { many: true, nouns: targetNouns(c), prefer: ['point'], example: 'A noktasının kilidini aç' });
      const points = targets.filter((o): o is PointObject => o.type === 'point');
      if (!points.length) fail('Kilit yalnızca noktalarda açılabilir (ör. “A noktasının kilidini aç”).');
      const locked = points.filter(p => p.onObjectId);
      s.setFocus(ids(points));
      if (!locked.length) { s.say(`${sentence(describeList(points))} zaten serbest.`); return; }
      for (const p of locked) s.update(p.id, { onObjectId: undefined, isIndependent: !p.construction });
      s.say(`${sentence(describeList(locked))} kilidi açıldı; artık serbestçe taşınabilir.`);
      return;
    }
    const all = c.labels.map((_, i) => i);
    const roles = all.map(i => labelRole(c, i));
    const hostIdx = all.filter(i => roles[i] === 'dat');
    const pointIdx = all.filter(i => !hostIdx.includes(i));
    let host: MathObject;
    if (hostIdx.length) {
      const ref = c.labels[hostIdx[0]];
      const noun = clauseNouns(c).find(n => n.index === labelWordIndex(c, hostIdx[0]) + 1 || n.index === labelWordIndex(c, hostIdx[0]) + 2);
      const list = candidatesFor(s, ref, noun && noun.spec.key !== 'point' ? noun.spec : undefined).filter(o => o.type !== 'point');
      if (!list.length) fail(`${cleanLabel(ref.text)} adlı doğru, doğru parçası, ışın ya da çember bulunamadı.`);
      host = pick(ref, list, LOCK_TYPES);
    } else {
      const dative = clauseNouns(c).filter(n => n.grammarCase === 'dat');
      if (!dative.length) fail('Noktayı neye kilitleyeyim? Örneğin “A noktasını AB doğrusuna kilitle” yazın.');
      const candidates = s.objects.filter(o => dative.some(n => n.spec.types.includes(o.type) && (!n.spec.filter || n.spec.filter(o, s))));
      if (!candidates.length) fail(`Sahnede ${dative[0].spec.noun} yok.`);
      if (candidates.length > 1) fail(`Birden fazla ${dative[0].spec.noun} var. Adını yazın (ör. “A noktasını AB doğrusuna kilitle”).`);
      host = candidates[0];
    }
    const [target] = findTargets(c, s, { labels: pointIdx, many: false, nouns: targetNouns(c).filter(n => n.spec.key === 'point'), prefer: ['point'], example: 'A noktasını AB doğrusuna kilitle' });
    if (target.type !== 'point') fail(`${sentence(describe(target))} bir nokta değil; yalnızca noktalar kilitlenebilir.`);
    const p = target;
    if (!LOCK_TYPES.includes(host.type)) fail('Noktalar yalnızca doğruya, doğru parçasına, ışına ya da çembere kilitlenebilir.');
    if (p.onObjectId === host.id) { s.setFocus([p.id]); s.say(`${p.label} noktası zaten ${describe(host)} üzerine kilitli.`); return; }
    if (p.onObjectId) {
      const old = s.get(p.onObjectId);
      fail(`${p.label} noktası zaten ${old ? describe(old) : 'başka bir nesne'} üzerine kilitli. Önce “${p.label} noktasının kilidini aç” yazın.`);
    }
    if (p.construction || !p.isIndependent) fail(`${p.label} noktası başka nesnelere bağlı olduğu için kilitlenemez.`);
    if (p.locked) fail(`${p.label} noktası sabitlenmiş; kilitlenemez.`);
    if (!host.visible) fail(`${sentence(describe(host))} gizli. Önce “göster” yazın.`);
    const dependsOnPoint = (id: string, seen = new Set<string>()): boolean => {
      if (id === p.id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      const o = s.get(id);
      return !!o && depsOf(o).some(d => dependsOnPoint(d, seen));
    };
    const releaseRadius = host.type === 'circle' && host.radiusPointId === p.id && !host.throughPointIds?.length && !dependsOnPoint(host.centerPointId);
    if (!releaseRadius && dependsOnPoint(host.id)) fail(`${sentence(describe(host))} ${p.label} noktasına bağlı olduğu için ${p.label} ona kilitlenemez.`);
    const shape = hostShapeOf(host, id => s.get(id)) ?? fail(`${sentence(describe(host))} üzerine nokta yerleştirilemiyor (uzunluğu ya da yarıçapı sıfır).`);
    const position = projectOntoHost(p, shape) ?? fail('Nokta nesnenin üzerine yerleştirilemedi.');
    if (releaseRadius && shape.kind === 'circle') s.update(host.id, { radiusPointId: undefined, fixedRadius: tidy(shape.radius) });
    const moved = Math.hypot(position.x - p.x, position.y - p.y) > 1e-9;
    s.update(p.id, { onObjectId: host.id, x: tidy(position.x), y: tidy(position.y) });
    s.setFocus([p.id]);
    s.say(`${p.label} noktası ${describe(host)} üzerine kilitlendi${moved ? ` ve ${fmtPoint(position)} konumuna yerleşti` : ''}; artık yalnızca onun üzerinde hareket eder.`);
  },
};

// ============================================================================ iç / dış açı

const reflexHandler: CommandHandler = {
  id: 'edit.reflex',
  examples: ['B açısını dış açı yap', "∠ABC'yi iç açı yap", 'açıyı dış açıya çevir', 'tüm açıları iç açı yap'],
  match(c) {
    const t = c.text;
    if (!/\b(?:dis|ic|yansimali|buyuk|kucuk) aci\w*/.test(t)) return 0;
    if (c.hasVerb('question') || /\b(?:hesapla|olc|bul)\w*/.test(t) || STRONG_CREATE.test(t)) return 0;
    return SET_VERB.test(t) || /\bgoster\w*/.test(t) ? 89 : 0;
  },
  run(c, s) {
    const reflex = /\b(?:dis|yansimali|buyuk) aci/.test(c.text);
    const angles: AngleObject[] = [];
    for (const ref of c.labels) {
      const named = candidatesFor(s, ref, SPECS.angle) as AngleObject[];
      if (named.length) { angles.push(pick(ref, named) as AngleObject); continue; }
      const pts = s.pointsFromLabel(ref.text);
      if (pts?.length === 1) {
        const at = s.ofType('angle').filter(a => a.vertexPointId === pts[0].id);
        if (!at.length) fail(`${pts[0].label} köşesinde gösterilen bir açı yok. Önce “${pts[0].label} açısını göster” yazın.`);
        angles.push(...at);
        continue;
      }
      if (pts && pts.length >= 3) {
        const poly = s.shapesWithPoints(pts.map(p => p.id), ['polygon'])[0];
        const at = poly ? s.ofType('angle').filter(a => pts.some(p => p.id === a.vertexPointId)) : [];
        if (at.length) { angles.push(...at); continue; }
        fail(`${cleanLabel(ref.text)} açısı çizimde yok. Önce “${cleanLabel(ref.text)} açısını göster” yazın.`);
      }
      fail(`${cleanLabel(ref.text)} açısı bulunamadı.`);
    }
    if (!c.labels.length) {
      angles.push(...findTargets(c, s, { many: true, nouns: targetNouns(c).filter(n => n.spec.key === 'angle'), prefer: ['angle'], soleFallback: true, filter: o => o.type === 'angle', example: 'B açısını dış açı yap' })
        .filter((o): o is AngleObject => o.type === 'angle'));
      if (!angles.length) fail('Hangi açı? Örneğin “B açısını dış açı yap” yazın.');
    }
    const unique = [...new Set(angles)];
    for (const a of unique) if (!!a.reflex !== reflex) s.update(a.id, { reflex });
    s.setFocus(ids(unique));
    const values = unique.map(a => {
      const inner = calculateAngleDegrees(s.pos(a.point1Id), s.pos(a.vertexPointId), s.pos(a.point3Id));
      return `${a.label} = ${trNum(reflex ? 360 - inner : inner, 1)}°`;
    });
    s.say(`${joinTr(values)}: ${reflex ? 'dış' : 'iç'} açı olarak gösteriliyor.`);
  },
};

export const handlers: CommandHandler[] = [
  sizeHandler, renameHandler, deleteHandler, namesHandler, lockHandler, reflexHandler, textHandler, selectHandler, colorHandler,
  visibilityHandler, moveHandler, copyHandler, fillHandler, thicknessHandler,
].map(withEditClause);
