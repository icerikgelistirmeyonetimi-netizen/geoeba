import type { AngleObject, MathObject, MeasurementObject, PointObject, PolygonObject } from '@/types/math';
import { angleTrigRatios, calculateAngleDegrees } from '../../../geometry';
import { noktadakiAcilar } from '../../../pointAngles';
import type { Clause, LabelRef } from '../../text';
import { type CommandScene, fail, tidy, trNum } from '../../scene';
import { type Olcu, aci } from '@/math/matematikYazimi';
import {
  type Intent, type Kind, arcGeometry, corner, deg, esit, fmt, merkezAciOlcusu, nameOf, nounFilter, pick, setFlags, wantsMany, yaz,
} from './common';

export interface Ctx {
  c: Clause;
  scene: CommandScene;
  text: string;
  labels: LabelRef[];
  it: Intent;
  kinds: Kind[];
  focus: string[];
  out: string[];
  /** Hesaplanan sayısal yanıtlar (evet/hayır soruları için: "ABC açısı 60 derece mi"). */
  answers: number[];
  /** "y = 2x + 1 doğrusunun eğimi kaç": sahnede olmayan (ya da aynı ifadeli) fonksiyonun soruda yazılan denklemi. */
  formula?: { name: string; expression: string };
}

const angleValue = (scene: CommandScene, a: AngleObject) => {
  const inner = calculateAngleDegrees(scene.point(a.point1Id), scene.point(a.vertexPointId), scene.point(a.point3Id));
  return a.reflex ? 360 - inner : inner;
};

export function findAngle(scene: CommandScene, ids: [string, string, string]): AngleObject | undefined {
  return scene.objects.find((a): a is AngleObject => a.type === 'angle' && a.vertexPointId === ids[1]
    && ((a.point1Id === ids[0] && a.point3Id === ids[2]) || (a.point1Id === ids[2] && a.point3Id === ids[0])));
}

/** Üç nokta bir çokgenin ardışık köşeleriyse o köşenin reflex bilgisi. */
function reflexFor(scene: CommandScene, ids: [string, string, string]): boolean {
  for (const polygon of scene.ofType('polygon')) {
    const n = polygon.pointIds.length, i = polygon.pointIds.indexOf(ids[1]);
    if (i < 0) continue;
    const prev = polygon.pointIds[(i - 1 + n) % n], next = polygon.pointIds[(i + 1) % n];
    if ((prev === ids[0] && next === ids[2]) || (prev === ids[2] && next === ids[0])) return corner(scene, polygon, i).reflex;
  }
  return false;
}

export type AngleSpec =
  | { kind: 'angle'; ids: [string, string, string]; reflex: boolean; existing?: AngleObject }
  | { kind: 'central'; shape: MathObject };

const onlyPoint = (scene: CommandScene, ref: LabelRef): PointObject | undefined => {
  const pts = scene.pointsFromLabel(ref.text);
  return pts?.length === 1 ? pts[0] : undefined;
};

/** "3 açı var" yerine "üç açı var": soru cümlesi Türkçe okunsun. */
const SAYI_ADLARI = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on'];
const sayiAdi = (n: number) => SAYI_ADLARI[n] ?? String(n);

/**
 * Köşede BİRDEN ÇOK açı varsa sessizce birini seçmek yerine sorar (yanıt vermeden geri döner: tek aday varsa sorun yok).
 * Liste sağ tık menüsündeki "Açı ölç" alt menüsüyle aynı kaynaktan (noktadakiAcilar) gelir, ikisi çelişemez.
 */
function hangiAci(x: Ctx, vertex: PointObject): void {
  const adaylar = noktadakiAcilar(vertex.id, x.scene.objects);
  if (adaylar.length < 2) return;
  fail(`${vertex.label} noktasında ${sayiAdi(adaylar.length)} açı var: ${adaylar.map(a => a.title).join(', ')}. Hangisini ölçeyim? Üç harfle yazın: “${adaylar[0].title} açısını ölç”. Hepsini istiyorsanız: “${vertex.label} noktasındaki açıları ölç”.`);
}

/** Tek bir köşedeki açı: çokgen köşesi → yay/dilim merkezi → iki kolu olan nokta. */
function cornerAt(x: Ctx, vertex: PointObject, context?: PolygonObject): AngleSpec {
  const { scene } = x;
  let polygons = scene.ofType('polygon').filter(p => p.pointIds.includes(vertex.id));
  if (context) {
    if (!context.pointIds.includes(vertex.id)) fail(`${vertex.label} noktası ${context.label} çokgeninin bir köşesi değil.`);
    polygons = [context];
  }
  if (polygons.length > 1) {
    const preferred = polygons.filter(p => scene.focus.includes(p.id) || scene.selection.includes(p.id));
    if (preferred.length !== 1) {
      fail(`${vertex.label} köşesi birden fazla çokgende var (${polygons.map(p => p.label).join(', ')}). Hangisi olduğunu yazın: “${polygons[0].label} üçgeninin ${vertex.label} açısını ölç”.`);
    }
    polygons = preferred;
  }
  if (polygons.length === 1) {
    // Köşeye çokgen kenarları DIŞINDA kollar da geliyorsa (ör. A'dan inen yükseklik/açıortay) "A açısı" yine
    // belirsizdir: köşe açısını sessizce seçmeyip adayları sorarız. Çokgen AÇIKÇA belirtilmişse
    // (adıyla yazıldıysa, seçiliyse ya da odaktaysa) eski tek adımlı davranış korunur.
    const belirtilmis = !!context || scene.focus.includes(polygons[0].id) || scene.selection.includes(polygons[0].id);
    if (!belirtilmis) hangiAci(x, vertex);
    const found = corner(scene, polygons[0], polygons[0].pointIds.indexOf(vertex.id));
    return { kind: 'angle', ids: found.ids, reflex: found.reflex, existing: findAngle(scene, found.ids) };
  }
  const central = scene.objects.find(o => (o.type === 'arc' || o.type === 'sector') && o.centerPointId === vertex.id);
  if (central) return { kind: 'central', shape: central };
  const neighbours = new Set<string>();
  for (const o of scene.ofType('segment', 'line', 'ray')) {
    const pair = scene.lineOf(o);
    if (!pair) continue;
    if (pair[0].id === vertex.id) neighbours.add(pair[1].id);
    if (pair[1].id === vertex.id) neighbours.add(pair[0].id);
  }
  if (neighbours.size === 2) {
    const [a, b] = [...neighbours];
    const ids: [string, string, string] = [a, vertex.id, b];
    return { kind: 'angle', ids, reflex: false, existing: findAngle(scene, ids) };
  }
  // ÜÇ ya da daha çok kol: "E açısını ölç" hangisi belli değildir. Sessizce birini seçmek yerine
  // adaylar sayılır ve sorulur — sağ tık menüsündeki "Açı ölç" alt menüsüyle aynı liste.
  if (neighbours.size >= 3) hangiAci(x, vertex);
  // Başka bağlam yoksa ve sahnede köşe dışında yalnızca iki nokta varsa onlar kol sayılır ("A, B, C noktalarını oluştur" → "B açısı").
  const others = scene.points().filter(p => p.id !== vertex.id);
  if (!neighbours.size && others.length === 2) {
    const ids: [string, string, string] = [others[0].id, vertex.id, others[1].id];
    return { kind: 'angle', ids, reflex: false, existing: findAngle(scene, ids) };
  }
  fail(`${vertex.label} noktasında ölçülecek açının kolları belli değil. Üç harfle yazın: “${vertex.label === 'B' ? 'ABC' : `B${vertex.label}C`} açısını ölç”.`);
}

/** Cümlenin gösterdiği tek açı. */
export function angleSpec(x: Ctx): AngleSpec {
  const { scene, labels } = x;
  // 1) Adıyla var olan açı nesnesi ("alfa", "∠ABC")
  for (const ref of labels) {
    const named = scene.resolveLabel(ref, ['angle']).filter((o): o is AngleObject => o.type === 'angle');
    if (named.length === 1) return { kind: 'angle', ids: [named[0].point1Id, named[0].vertexPointId, named[0].point3Id], reflex: !!named[0].reflex, existing: named[0] };
  }
  // 2) "ABC üçgeninin B açısı"
  const single = labels.map(ref => onlyPoint(scene, ref)).filter((p): p is PointObject => !!p);
  const polygonRef = labels.map(ref => scene.resolveLabel(ref, ['polygon'])[0] as PolygonObject | undefined).find(Boolean);
  if (single.length === 1 && polygonRef && labels.length === 2) return cornerAt(x, single[0], polygonRef);
  // 3) "ABC açısı" ya da "A, B, C noktalarının oluşturduğu açı"
  let triple: PointObject[] | null = null;
  if (labels.length === 1) {
    const pts = scene.pointsFromLabel(labels[0].text);
    if (pts?.length === 3) triple = pts;
  } else if (labels.length === 3 && single.length === 3) triple = single;
  if (triple) {
    const ids = triple.map(p => p.id) as [string, string, string];
    if (new Set(ids).size !== 3) fail('Açı için üç farklı nokta yazın (ör. “ABC açısı”).');
    return { kind: 'angle', ids, reflex: reflexFor(scene, ids), existing: findAngle(scene, ids) };
  }
  // 4) "B açısı", "A noktasının açısı"
  if (labels.length === 1 && single.length === 1) return cornerAt(x, single[0]);
  if (labels.length) {
    const missing = labels.filter(ref => !scene.pointsFromLabel(ref.text) && !scene.resolveLabel(ref).length).map(r => r.text);
    if (missing.length) fail(`${missing.join(', ')} adlı nokta ya da açı bulunamadı.`);
    fail('Açıyı köşesiyle ya da üç harfle yazın: “B açısını ölç” veya “ABC açısını ölç”.');
  }
  // 5) Adsız: odak/seçim, sonra sahnedeki tek açı
  const nf = nounFilter(x.text);
  const pool = x.c.refersToSelection ? [scene.selection, scene.focus] : [scene.focus, scene.selection];
  for (const ids of pool) {
    const objs = ids.map(id => scene.get(id)).filter((o): o is MathObject => !!o);
    const angle = objs.filter((o): o is AngleObject => o.type === 'angle');
    if (angle.length === 1) return { kind: 'angle', ids: [angle[0].point1Id, angle[0].vertexPointId, angle[0].point3Id], reflex: !!angle[0].reflex, existing: angle[0] };
    const shapes = objs.filter(o => o.type === 'arc' || o.type === 'sector');
    if (shapes.length === 1 && (!nf || nf.types.includes(shapes[0].type))) return { kind: 'central', shape: shapes[0] };
    const points = objs.filter((o): o is PointObject => o.type === 'point');
    if (points.length === 1 && objs.length === 1) return cornerAt(x, points[0]);
  }
  if (nf && (nf.types.includes('arc') || nf.types.includes('sector'))) {
    return { kind: 'central', shape: pick(x.c, scene, { types: nf.types.includes('sector') ? ['sector'] : ['arc', 'sector'], noun: nf.noun, labels: [] })[0] };
  }
  const all = scene.ofType('angle');
  if (all.length === 1) return { kind: 'angle', ids: [all[0].point1Id, all[0].vertexPointId, all[0].point3Id], reflex: !!all[0].reflex, existing: all[0] };
  fail('Hangi açı? Köşesini ya da üç harfini yazın: “B açısını ölç” veya “ABC açısını ölç”.');
}

/** m(∠ABC) = 60° — kol, KÖŞE, kol; 180°'den büyük açıya " (dış açı)" niteleyicisi eklenir. */
function aciOlcusu(scene: CommandScene, ids: [string, string, string], derece: number, disAci = false): Olcu {
  const [p1, v, p3] = ids.map(id => scene.point(id));
  return aci(p1, v, p3, derece, { disAci });
}

function centralAngle(x: Ctx, shape: MathObject, create: boolean) {
  const g = arcGeometry(x.scene, shape);
  if (create || x.it.question) setFlags(x.scene, shape, { showCentralAngle: true });
  x.focus.push(shape.id);
  x.answers.push(g.sweep * 180 / Math.PI);
  x.out.push(`${nameOf(shape)}: ${yaz(merkezAciOlcusu(x.scene, shape, g.sweep * 180 / Math.PI), true)}.`);
}

/** Açıyı gösterir (yoksa oluşturur); soru ise yalnızca yanıtlar. Açı nesnesini (ya da merkez açılı şekli) döndürür. */
function showAngle(x: Ctx, spec: Extract<AngleSpec, { kind: 'angle' }>, create: boolean): { value: number; object?: MathObject; created: boolean } {
  const { scene } = x;
  if (spec.existing) {
    setFlags(scene, spec.existing, { showValue: true, visible: true });
    return { value: angleValue(scene, scene.must(spec.existing.id) as AngleObject), object: spec.existing, created: false };
  }
  const [p1, v, p3] = spec.ids.map(id => scene.point(id));
  const inner = calculateAngleDegrees(p1, v, p3);
  if (!create) return { value: spec.reflex ? 360 - inner : inner, created: false };
  const made = scene.addAngle(spec.ids[0], spec.ids[1], spec.ids[2], { reflex: spec.reflex });
  if (made.type !== 'angle') {
    const g = arcGeometry(scene, made);
    return { value: g.sweep * 180 / Math.PI, object: made, created: false };
  }
  return { value: spec.reflex ? 360 - inner : inner, object: made, created: true };
}

export function angles(x: Ctx) {
  const { scene, it } = x;
  const create = !it.question;
  // "üçgenin en büyük açısı", "ABC'nin en küçük açısı"
  const extreme = x.text.match(/\ben (buyuk|genis|kucuk|dar) aci/);
  if (extreme) {
    const nf = nounFilter(x.text);
    const [polygon] = pick(x.c, scene, { types: ['polygon'], noun: nf?.noun ?? 'çokgen', filter: nf?.filter }) as PolygonObject[];
    const big = extreme[1] === 'buyuk' || extreme[1] === 'genis';
    const best = polygon.pointIds.map((_, i) => corner(scene, polygon, i))
      .reduce((a, b) => (big ? b.degrees > a.degrees + 1e-9 : b.degrees < a.degrees - 1e-9) ? b : a);
    const shown = showAngle(x, { kind: 'angle', ids: best.ids, reflex: best.reflex, existing: findAngle(scene, best.ids) }, create);
    x.focus.push(shown.object ? shown.object.id : polygon.id);
    x.answers.push(shown.value);
    x.out.push(`${polygon.label} ${big ? 'en büyük' : 'en küçük'} açısı: ${yaz(aciOlcusu(scene, best.ids, shown.value, best.reflex))}.${shown.created ? ' Açı tuvale eklendi.' : ''}`);
    return;
  }
  const plural = /\bacilar/.test(x.text) || (it.all && x.labels.every(ref => !onlyPoint(scene, ref)));
  if (plural) {
    // "E noktasındaki açıları ölç": bir KÖŞEDEKİ bütün açılar (kol çiftlerinin hepsi), çokgen değil.
    const tekNokta = x.labels.length === 1 ? onlyPoint(scene, x.labels[0]) : undefined;
    const koseAcilari = tekNokta ? noktadakiAcilar(tekNokta.id, scene.objects) : [];
    if (tekNokta && koseAcilari.length) {
      const parts: string[] = [];
      let added = 0;
      for (const koseAci of koseAcilari) {
        const ids: [string, string, string] = [koseAci.armIds[0], tekNokta.id, koseAci.armIds[1]];
        const reflex = reflexFor(scene, ids);
        const shown = showAngle(x, { kind: 'angle', ids, reflex, existing: findAngle(scene, ids) }, create);
        if (shown.object) x.focus.push(shown.object.id);
        if (shown.created) added++;
        parts.push(yaz(aciOlcusu(scene, ids, shown.value, reflex)));
      }
      if (!create) x.focus.push(tekNokta.id);
      x.out.push(`${tekNokta.label} noktasındaki açılar: ${parts.join(', ')}${added ? '; açılar tuvale eklendi' : ''}.`);
      return;
    }
    const nf = nounFilter(x.text);
    const polygons = pick(x.c, scene, { types: ['polygon'], noun: nf?.noun ?? 'çokgen', filter: nf?.filter, many: wantsMany(x.text, x.labels) }) as PolygonObject[];
    for (const polygon of polygons) {
      const parts: string[] = [];
      let sum = 0, added = 0;
      polygon.pointIds.forEach((_, i) => {
        const found = corner(scene, polygon, i);
        const shown = showAngle(x, { kind: 'angle', ids: found.ids, reflex: found.reflex, existing: findAngle(scene, found.ids) }, create);
        if (shown.object) x.focus.push(shown.object.id);
        if (shown.created) added++;
        sum += shown.value;
        parts.push(yaz(aciOlcusu(scene, found.ids, shown.value, found.reflex)));
      });
      if (!create) x.focus.push(polygon.id);
      x.out.push(`${polygon.label} açıları: ${parts.join(', ')} (toplam ${deg(sum)})${added ? '; açılar tuvale eklendi' : ''}.`);
    }
    return;
  }
  const spec = angleSpec(x);
  if (spec.kind === 'central') return centralAngle(x, spec.shape, create);
  const shown = showAngle(x, spec, create);
  x.answers.push(shown.value);
  const radians = /\bradyan/.test(x.text) ? ` (${fmt(shown.value * Math.PI / 180, 4)} rad)` : '';
  if (shown.object && shown.object.type !== 'angle') {
    x.focus.push(shown.object.id);
    x.out.push(`${nameOf(shown.object)}: ${yaz(merkezAciOlcusu(scene, shown.object, shown.value), true)}${radians}.`);
    return;
  }
  x.focus.push(...(shown.object ? [shown.object.id] : [spec.ids[1]]));
  const note = shown.created ? ' Açı tuvale eklendi.' : !shown.object && !create ? ' Tuvalde göstermek için “… açısını ölç” yazın.' : '';
  x.out.push(`${yaz(aciOlcusu(scene, spec.ids, shown.value, spec.reflex))}${radians}.${note}`);
}

// ---------------------------------------------------------------------------------------------------------------- trigonometri

export function findTrig(scene: CommandScene, ids: [string, string, string]): MeasurementObject | undefined {
  return scene.objects.find((m): m is MeasurementObject => m.type === 'measurement' && m.kind === 'trig' && m.pointIds.length === 3 && m.pointIds[1] === ids[1]
    && new Set([m.pointIds[0], m.pointIds[2], ids[0], ids[2]]).size === 2);
}

type TrigFn = 'sin' | 'cos' | 'tan' | 'cot';
const TRIG_WORDS: Record<TrigFn, RegExp> = {
  sin: /\bsin\b|\bsinus/, cos: /\bcos\b|\bkosinus|\bcosinus/, tan: /\btan\b|\btanjant/, cot: /\bcot\b|\bkotanjant/,
};

/** "sin 30 kaç", "cos 60 derece", "tan 45 nedir": sahnedeki açı olmadan sayının oranları (derece; "radyan" yazılırsa radyan). */
function numericTrig(x: Ctx, asked: TrigFn[]) {
  const n = x.c.numbers[0];
  const radians = /\bradyan/.test(x.text);
  const theta = radians ? n : n * Math.PI / 180;
  const s = tidy(Math.sin(theta)), co = tidy(Math.cos(theta));
  const values: Record<TrigFn, number | null> = {
    sin: s, cos: co, tan: Math.abs(co) < 1e-9 ? null : s / co, cot: Math.abs(s) < 1e-9 ? null : co / s,
  };
  const fns: TrigFn[] = asked.length ? asked : ['sin', 'cos', 'tan'];
  const unit = radians ? `${trNum(n, 4)} rad` : `${trNum(n, 4)}°`;
  if (fns.length === 1 && values[fns[0]] !== null) x.answers.push(values[fns[0]]!);
  x.out.push(`${fns.map(f => `${f} ${unit} ${values[f] === null ? '= tanımsız' : esit(values[f]!, 4)}`).join(', ')}.`);
}

export function trig(x: Ctx) {
  const { scene } = x;
  const asked = (Object.keys(TRIG_WORDS) as TrigFn[]).filter(f => TRIG_WORDS[f].test(x.text));
  if (!x.labels.length && x.c.numbers.length === 1 && !x.c.coords.length) return numericTrig(x, asked);
  const spec = angleSpec(x);
  if (spec.kind === 'central') fail('Trigonometrik oranlar için açıyı üç harfle yazın: “ABC açısının trigonometrik oranları”.');
  const [p1, v, p3] = spec.ids.map(id => scene.point(id));
  const r = angleTrigRatios(p1, v, p3);
  if (!r) fail('Oranlar hesaplanamadı: açının noktaları çakışık.');
  const create = !x.it.question;
  const existing = findTrig(scene, spec.ids);
  let object: MeasurementObject | undefined = existing;
  if (existing) setFlags(scene, existing, { showValue: true, visible: true });
  else if (create) object = scene.addMeasurement('trig', spec.ids);
  x.focus.push(object ? object.id : v.id);
  const fns: TrigFn[] = asked.length ? asked : ['sin', 'cos', 'tan'];
  const value = (f: TrigFn) => f === 'tan' ? (r.tan === null ? '= tanımsız' : esit(r.tan, 4))
    : f === 'cot' ? (Math.abs(r.sin) < 1e-12 ? '= tanımsız' : esit(r.cos / r.sin, 4)) : esit(r[f], 4);
  const right = r.dikKose ? ' (dik üçgen)' : '';
  x.out.push(`${yaz(aciOlcusu(scene, spec.ids, r.derece))}${right}: ${fns.map(f => `${f} ${value(f)}`).join(', ')}.${object && !existing ? ' Oranlar tuvale eklendi.' : ''}`);
}
