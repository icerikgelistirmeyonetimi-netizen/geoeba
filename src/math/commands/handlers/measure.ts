import { type Clause, type LabelRef, parseClause } from '../text';
import { type CommandScene, skip, trNum } from '../scene';
import type { CommandHandler } from '../types';
import { prepareExpression } from './algebra/shared';
import { type Ctx, angles, trig } from './measure/angles';
import { type Intent, type Kind, YES_NO, intent, isForeign, nounFilter, view } from './measure/common';
import { allMeasures, areaPerimeter, circleParts, coordinates, diagonals, equations, hideMeasures, lengths, slopes } from './measure/shapes';
import { arcBetweenHandler, arcEditHandler } from './measure/arcs';

/**
 * ÖLÇME ailesi: alan, çevre, uzunluk, kenar uzunlukları, mesafe, açı, yarıçap/çap/kiriş/yay/merkez açı,
 * doğru denklemi, eğim ölçümü, trigonometrik oranlar, koordinatlar ve belirli bir nesnenin ölçülerini gizleme.
 *
 * Kurallar
 * - Ölçü etiketleri araçlardaki bayraklarla gösterilir (showArea, edgeLabels, showCentralAngle…); değer mesajda da yazılır.
 * - Soru ("kaç, nedir, ne kadar") bayrakları açar ama YENİ nesne (açı, eğim, ölçüm parçası) oluşturmaz; yalnızca yanıtlar.
 * - "alanı 16 olan kare çiz", "AB'nin uzunluğunu 5 yap" gibi oluşturma/düzenleme cümleleri eşleşmez.
 * - "tüm ölçümleri gizle/göster" (hedefsiz) uygulama ailesine bırakılır.
 */

export const family = { id: 'measure', title: 'Ölçme' };

const PRIORITY: Kind[] = ['trig', 'centralAngle', 'arcLength', 'chord', 'radius', 'diameter', 'equation', 'slope', 'coordinates', 'diagonal', 'area', 'perimeter', 'distance', 'edges', 'length', 'angle', 'all'];

interface Classified {
  text: string;
  labels: LabelRef[];
  it: Intent;
  kinds: Kind[];
  hide: boolean;
  formula?: { name: string; expression: string };
}

function subsume(list: Kind[]): Kind[] {
  const k = new Set(list);
  if (k.has('trig') || k.has('centralAngle') || k.has('slope')) k.delete('angle');
  if (k.has('slope') || k.has('equation')) k.delete('distance');
  if (k.has('diagonal')) { k.delete('edges'); k.delete('distance'); }
  if ((['arcLength', 'chord', 'perimeter', 'edges', 'distance', 'radius', 'diameter', 'diagonal'] as Kind[]).some(s => k.has(s))) k.delete('length');
  if ([...k].some(v => v !== 'all')) k.delete('all');
  return PRIORITY.filter(v => k.has(v));
}

/**
 * "y = 2x + 1 doğrusunun eğimi kaç", "f(x) = 3x - 2 fonksiyonunun eğimi nedir": tanımın ardından gelen soru.
 * Fonksiyon oluşturulmaz; eğim/denklem soruda yazılan ifadeden yanıtlanır.
 */
function formulaQuery(c: Clause, scene: CommandScene): Classified | null {
  const d = c.definition!;
  // "y = 2x + 1 in eğimi": ayrı yazılmış tamlayan eki ifadeye katılmasın.
  const body = d.body.replace(/^(.*?[\dx)])\s*['’]?\s*n?[ıiuü]n(?=\s)/iu, '$1');
  const prepared = prepareExpression(body, scene);
  if (!prepared.ok || !prepared.trailing.length) return null;
  const tail = parseClause(prepared.trailing.join(' '), scene.known());
  const inner = compute(tail, scene);
  if (!inner || inner.hide || !inner.kinds.length || inner.kinds.some(k => k !== 'slope' && k !== 'equation')) return null;
  return { ...inner, labels: [], formula: { name: d.name === 'y' ? 'y' : `${d.name}(x)`, expression: prepared.expression } };
}

function compute(c: Clause, scene?: CommandScene): Classified | null {
  if (c.definition && !c.negated) return scene ? formulaQuery(c, scene) : null;
  const { text, labels } = view(c, scene);
  if (c.negated || isForeign(c, text)) return null;
  const it = intent(c, text);
  let kinds = subsume(it.kinds);
  if (!kinds.length) return null;
  const targetHint = labels.length > 0 || !!nounFilter(text) || c.refersToSelection || c.refersToLast;

  if (it.hide) {
    const valueWord = /\bdeger|\bolcu|\buzunlu/.test(text);
    kinds = kinds.filter(k => k !== 'coordinates' && k !== 'distance' && k !== 'diameter');
    // "açıları gizle", "kenarları gizle", "köşegenleri gizle" nesneleri gizlemektir (düzenleme ailesi).
    if (!valueWord) kinds = kinds.filter(k => k !== 'angle' && k !== 'edges' && k !== 'diagonal');
    if (!kinds.length) return null;
    if (kinds.length === 1 && kinds[0] === 'all' && it.all && !targetHint) return null;
    return { text, labels, it, kinds, hide: true };
  }

  if (it.bare) {
    // "3 cm uzunluğunda doğru parçası", "ABC açısı" gibi fiilsiz ad öbekleri oluşturma isteğidir.
    if (/\b(?:uzunlugunda|uzunlukta|alanli|cevreli|yaricapli|capli|egimli|acili|derecelik)\b/.test(text)) return null;
    if (/(?:\b(?:ucgen|kare|dikdortgen|cokgen|cember|daire|elips|yay|dilim|dogru|isin|nokta|aci|parca)[a-z]*|\$\d+[a-z]*)$/.test(text)) return null;
    if (kinds.includes('all')) return null;
  }
  if (kinds.length === 1 && kinds[0] === 'coordinates' && !labels.length && !/\bmerkez/.test(text)
    && !c.refersToSelection && !c.refersToLast && !/\bnokta(?:nin|sinin|larin|larinin)\b/.test(text)) return null;
  if (kinds.length === 1 && kinds[0] === 'all') {
    const possessive = /\bolculerini|\bolcusunu|\bolcumlerini/.test(text);
    if (it.inferred ? !targetHint : !(targetHint || possessive) || (it.all && !labels.length && !nounFilter(text))) return null;
  }
  return { text, labels, it, kinds, hide: false };
}

const cache = new WeakMap<Clause, Classified | null>();
export function classify(c: Clause, scene?: CommandScene): Classified | null {
  if (!cache.has(c)) cache.set(c, compute(c, scene));
  return cache.get(c) ?? null;
}

/** "AB'yi ölç" gibi ölçü adı olmayan cümlede hedefin türüne göre ölçü: şekil → tüm ölçüler, iki nokta → uzunluk, üç nokta → açı, tek nokta → koordinat. */
function inferKinds(scene: CommandScene, labels: LabelRef[]): Kind[] {
  if (labels.length === 2 && labels.every(ref => scene.pointsFromLabel(ref.text)?.length === 1)) return ['distance'];
  if (labels.length !== 1) return ['all'];
  if (scene.resolveLabel(labels[0]).some(o => o.type !== 'point')) return ['all'];
  const count = scene.pointsFromLabel(labels[0].text)?.length ?? 0;
  return count === 1 ? ['coordinates'] : count === 2 ? ['length'] : count === 3 ? ['angle'] : ['all'];
}

function execute(c: Clause, scene: CommandScene) {
  const k = classify(c, scene);
  if (!k) skip();
  const kinds = k.it.inferred ? inferKinds(scene, k.labels) : k.kinds;
  const x: Ctx = { c, scene, text: k.text, labels: k.labels, it: k.it, kinds, focus: [], out: [], answers: [], formula: k.formula };
  const has = (...wanted: Kind[]) => wanted.some(q => kinds.includes(q));
  if (k.hide) hideMeasures(x);
  else {
    if (has('trig')) trig(x);
    if (has('centralAngle', 'arcLength', 'chord', 'radius', 'diameter')) circleParts(x);
    if (has('equation')) equations(x);
    if (has('slope')) slopes(x);
    if (has('coordinates')) coordinates(x);
    if (has('diagonal')) diagonals(x);
    if (has('area', 'perimeter')) areaPerimeter(x);
    if (has('distance', 'edges', 'length')) lengths(x);
    if (has('angle')) angles(x);
    if (has('all')) allMeasures(x);
  }
  // Evet/hayır sorusu: "ABC açısı 60 derece mi", "AB 5 birim mi"
  if (!k.hide && YES_NO.test(k.text) && !/\byuzolcum/.test(k.text) && c.numbers.length === 1 && x.answers.length === 1) {
    const claim = c.numbers[0], value = x.answers[0];
    const same = Math.abs(value - claim) < 1e-6 || Number(value.toFixed(2)) === Number(claim.toFixed(2));
    x.out.unshift(same ? 'Evet.' : `Hayır, ${trNum(claim)} değil.`);
  }
  scene.setFocus([...new Set(x.focus)]);
  scene.say(x.out.join(' '));
}

function scorer(group: Kind[] | 'hide', base: number) {
  return (c: Clause, scene: CommandScene) => {
    const k = classify(c, scene);
    if (!k) return 0;
    if (group === 'hide') return k.hide ? base : 0;
    if (k.hide || !group.includes(k.kinds[0])) return 0;
    return k.it.bare ? base - 4 : base;
  };
}

const handler = (id: string, group: Kind[] | 'hide', base: number, examples: string[]): CommandHandler => ({ id, examples, match: scorer(group, base), run: execute });

export const handlers: CommandHandler[] = [
  handler('measure.hide', 'hide', 63, [
    "ABC'nin alanını gizle", "ABC'nin ölçülerini gizle", 'AB doğrusunun denklemini gizle', 'Kenar uzunluklarını gizle', 'B açısının değerini gizle', 'Merkez açısını gizle',
  ]),
  // İki nokta arasındaki yay (çember bölünmeden): ölçme 62, yay ölçümünü silme/gizleme/gösterme 91 (düzenleme bandı)
  arcEditHandler,
  arcBetweenHandler,
  handler('measure.trig', ['trig'], 62, [
    'ABC açısının trigonometrik oranları', 'sin cos tan değerleri', 'B açısının sinüsünü hesapla', 'ABC açısının sin cos tan değerlerini göster',
  ]),
  handler('measure.circle', ['centralAngle', 'arcLength', 'chord', 'radius', 'diameter'], 61, [
    "c1'in yarıçapı kaç", 'Yay uzunluğunu göster', 'Merkez açısını göster', 'Kirişin uzunluğu', 'Çemberin çapı nedir', 'Daire diliminin yarıçapını göster',
  ]),
  handler('measure.line', ['equation', 'slope'], 61, [
    'AB doğrusunun denklemini göster', 'AB doğrusunun denklemi nedir', "AB'nin eğimini ölç", 'AB doğrusunun eğimi kaç', 'Çemberin denklemi nedir',
  ]),
  handler('measure.coordinates', ['coordinates'], 60, [
    "A'nın koordinatları nedir", 'P noktasının koordinatlarını göster', 'Çemberin merkezinin koordinatları nedir', 'A nerede?',
  ]),
  handler('measure.area', ['area', 'perimeter'], 60, [
    'Üçgenin alanını yaz', 'ABC çevresini ölç', "ABC'nin alanı kaç?", 'Çemberin çevresini ölç', 'Çemberin alanını hesapla',
    'ABC üçgeninin alanını ve çevresini hesapla', 'Elipsin alanını göster', 'Daire diliminin alanı nedir', 'Şeklin etrafının toplamı ne kadar',
  ]),
  handler('measure.angle', ['angle'], 60, [
    'A noktasının açısını yaz', 'B açısını ölç', 'ABC açısını ölç', 'Üçgenin tüm açılarını göster', 'A köşesi kaç derecedir', 'ABC üçgeninin B açısını ölç',
  ]),
  handler('measure.length', ['diagonal', 'distance', 'edges', 'length'], 59, [
    'Üçgenin tüm kenarlarını ölç', "AB'nin uzunluğu nedir", 'A ile B arasındaki mesafe', 'A ile B arasındaki mesafeyi ölç', 'AB kenarının uzunluğunu göster',
    '[AB] uzunluğunu ölç', 'A noktasının BC doğrusuna uzaklığı ne kadar',
  ]),
  handler('measure.all', ['all'], 58, [
    "ABC'nin ölçülerini göster", 'Yayın tüm ölçülerini göster', 'Seçili şeklin ölçülerini göster',
  ]),
];
