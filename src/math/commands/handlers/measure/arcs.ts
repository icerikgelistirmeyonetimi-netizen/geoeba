import type { MathObject, PointObject } from '@/types/math';
import {
  arcNearMissHint, arcTitle, commonCircles, findArcMeasurement, isArcMeasurement, isPointOnCircle, makeArcMeasurement, resolveArc,
  sameArc, type ArcMeasurement, type ArcSpec,
} from '@/math/arcMeasure';
import { yayOlcusu, yayUzunlugu } from '@/math/matematikYazimi';
import type { Clause, LabelRef } from '../../text';
import { type CommandScene, fail, skip } from '../../scene';
import type { CommandHandler } from '../../types';
import { EXPLICIT, QUESTION, isForeign, setFlags, view, yaz, yayOlcumUclari } from './common';

/**
 * İKİ NOKTA ARASINDAKİ YAY (çember bölünmeden): "BD yayını ölç", "BD yayının uzunluğu", "BD yayının ölçüsü",
 * "BCD yayını ölç" (C'yi içeren yay), "BD büyük yayını ölç", "B ile D arasındaki yayı ölç", "BD yayı kaç derece".
 *
 * - Adı gerçek bir yay ya da daire dilimine aitse ("SD yayı" bir ArcObject ise) eşleşmez: o yay eskisi gibi ölçülür.
 * - Soru ("kaç", "nedir") yalnızca yanıtlar; yeni ölçüm nesnesi oluşturmaz (ailenin kuralı).
 * - Silme / gizleme / gösterme ("BD yayını sil", "BD yayı ölçümünü gizle", "BD yayını göster") ayrı işleyicidedir
 *   (arcEditHandler, düzenleme bandında): yalnızca bu yay ölçümlerini hedefler.
 */

const ARC_REF = /(?:^| )\$(\d+) (?:(buyuk|kucuk) )?yay(?:i|in|ini|inin|ina|inda)?\b/;
const ARC_BETWEEN = /(?:^| )\$(\d+) (?:ile|ve) \$(\d+)(?: noktalari)? arasi(?:ndaki|nda kalan) (?:(buyuk|kucuk) )?yay/;
const WANT = /\bolc(?!ek)|\bhesapla|\bbul(?:un)?\b|\bgoster|\byaz(?:\b|in\b)|\buzunlu|\bderece|\bmerkez aci|\bkac\b|\bkactir|\bnedir\b|\bne kadar|\?/;
const EXCLUDE = /\bkiris|\byaricap|\bcap(?:i|ini|inin)?\b|\balan|\bcevre|\begim|\btrigonometri|\b(?:sin|cos|tan|cot)\b|\bdilim|\bdenklem|\bkoordinat|\bkosegen/;
const HIDE = /\b(?:gizle|sakla|kapat|gorunmesin|gorunmez|kaldir)/;
const DELETE = /\b(?:sil(?!indir)|kaldir|temizle|yok et)/;
const HIDE_ONLY = /\b(?:gizle|sakla|kapat|gorunmesin|gorunmez)/;
const SHOW = /\b(?:goster|gorunur)/;

interface ArcRequest {
  /** 2 nokta [A, B] ya da 3 nokta [A, T, B] (ortadaki yayın geçtiği nokta) */
  points: PointObject[];
  major: boolean;
  /** "B ile D arasındaki yay" biçimi */
  between: boolean;
  text: string;
}

/** Görünümdeki $N yer tutucusunun etiketi (birleştirilmiş/atılmış etiketlerden sonra da doğru sırayla). */
function labelAt(text: string, labels: LabelRef[], n: number): LabelRef | undefined {
  const kept = [...new Set([...text.matchAll(/\$(\d+)/g)].map(m => Number(m[1])))].sort((a, b) => a - b);
  const i = kept.indexOf(n);
  return i >= 0 ? labels[i] : undefined;
}

/** Cümledeki yay: noktalar ve küçük/büyük. Uygun değilse null. Önbelleğe alınmaz (sahne her cümlede değişebilir). */
function parseArc(c: Clause, scene: CommandScene): ArcRequest | null {
  if (c.negated || c.definition || c.assignment) return null;
  const { text, labels } = view(c, scene);
  if (EXCLUDE.test(text)) return null;
  const distinct = (pts: PointObject[]) => new Set(pts.map(p => p.id)).size === pts.length;
  const between = text.match(ARC_BETWEEN);
  if (between) {
    const refs = [labelAt(text, labels, Number(between[1])), labelAt(text, labels, Number(between[2]))];
    if (refs.some(r => !r || r.bracket)) return null;
    const pts = refs.map(r => scene.pointsFromLabel(r!.text));
    if (pts.some(p => !p || p.length !== 1)) return null;
    const points = pts.map(p => p![0]);
    if (!distinct(points)) return null;
    return { points, major: between[3] === 'buyuk', between: true, text };
  }
  const ref = text.match(ARC_REF);
  if (!ref) return null;
  const label = labelAt(text, labels, Number(ref[1]));
  if (!label || label.bracket) return null;
  const points = scene.pointsFromLabel(label.text);
  if (!points || points.length < 2 || points.length > 3 || !distinct(points)) return null;
  // Gerçek bir yay ya da daire dilimi bu adı taşıyorsa ("SD yayı") onun ölçüleri eskisi gibi çalışır.
  if (scene.resolveLabel(label, ['arc', 'sector']).length) return null;
  return { points, major: ref[2] === 'buyuk', between: false, text };
}

/** İstek ve sahneden yay tanımı; ortak çember yoksa açıklamalı hata (gerçek yaylar varsa sıradaki işleyiciye bırakır). */
function specFor(req: ArcRequest, scene: CommandScene): { spec: ArcSpec; circles: MathObject[]; A: PointObject; B: PointObject; T?: PointObject } {
  const [A, T, B] = req.points.length === 3 ? req.points : [req.points[0], undefined, req.points[1]];
  const preferId = scene.selection.find(id => scene.get(id)?.type === 'circle');
  const pair = commonCircles(A.id, B.id, scene.objects, { preferId });
  const circles = T ? pair.filter(k => isPointOnCircle(T, k, scene.objects)) : pair;
  if (!circles.length) {
    if (T && pair.length) {
      fail(`${T.label} noktası ${A.label} ve ${B.label} ile aynı çemberin üzerinde değil; ${A.label}${T.label}${B.label} yayı için üç nokta da aynı çemberin üzerinde olmalı.`);
    }
    // "B ile D arasındaki yay": çember bölünüp gerçek yaylar oluştuysa onların ölçüsü sıradaki işleyicilerindir.
    if (scene.shapesWithPoints([A.id, B.id], ['arc', 'sector']).length) skip();
    const near = arcNearMissHint(A.id, B.id, scene.objects);
    fail(`${A.label} ile ${B.label} aynı çemberin üzerinde değil; aralarındaki yay ölçülemez. ${near ?? 'Önce iki noktadan geçen bir çember çizin ya da noktaları çemberin üzerine koyun.'}`);
  }
  const spec: ArcSpec = { circleId: circles[0].id, pointIds: [A.id, B.id], ...(T ? { throughPointId: T.id } : {}), ...(!T && req.major ? { major: true } : {}) };
  return { spec, circles, A, B, T };
}

function reply(spec: ArcSpec, circles: MathObject[], scene: CommandScene): string {
  const r = resolveArc(spec, scene.objects) ?? fail('Noktalar çakışık; aralarında yay yok.');
  const where = circles.length > 1 ? ` (${circles[0].label || 'çember'} üzerinde)` : '';
  const uclar = yayOlcumUclari(spec, scene, r);
  return `${arcTitle(spec, scene.objects, r)}${where}: ${yaz(yayUzunlugu(uclar, r.length))}, ${yaz(yayOlcusu(uclar, r.degrees))}.`;
}

/** Ölçümü gösterir (yoksa oluşturur). Hiçbir alan değişmediyse yalnızca ölçüm görünümünü açar (boş geçmiş adımı yok). */
function showArc(spec: ArcSpec, scene: CommandScene): ArcMeasurement {
  const existing = findArcMeasurement(spec, scene.objects);
  if (existing) {
    if (!setFlags(scene, existing, { showValue: true, visible: true })) {
      scene.act({ kind: 'styleMode', mode: 'Ayrıntılı' });
      scene.act({ kind: 'viewport', patch: { showMeasurements: true } });
    }
    return scene.get(existing.id) as ArcMeasurement;
  }
  return scene.add(makeArcMeasurement(spec, scene.objects));
}

export const arcBetweenHandler: CommandHandler = {
  id: 'measure.arcBetween',
  examples: [
    'BD yayını ölç', 'BD yayının uzunluğu', 'BD yayının uzunluğunu bul', 'BD yayının ölçüsü', 'BCD yayını ölç', 'BD büyük yayını ölç',
    'B ile D arasındaki yayı ölç', 'BD yayı kaç derece',
  ],
  match(c, scene) {
    const req = parseArc(c, scene);
    if (!req || isForeign(c, req.text) || HIDE.test(req.text) || !WANT.test(req.text)) return 0;
    return 62;
  },
  run(c, scene) {
    const req = parseArc(c, scene);
    if (!req) skip();
    const { spec, circles, A, B } = specFor(req, scene);
    const msg = reply(spec, circles, scene);
    const question = QUESTION.test(req.text) && !EXPLICIT.test(req.text);
    if (question) {
      const existing = findArcMeasurement(spec, scene.objects);
      scene.setFocus(existing ? [existing.id] : [A.id, B.id]);
      scene.say(msg);
      return;
    }
    const m = showArc(spec, scene);
    scene.setFocus([m.id]);
    scene.say(msg);
  },
};

/** Cümledeki iki (ya da üç) noktanın yay ölçümleri; "büyük/küçük" ve ara nokta verilmişse yalnızca o taraf. */
function matchingMeasurements(req: ArcRequest, scene: CommandScene): ArcMeasurement[] {
  const [A, T, B] = req.points.length === 3 ? req.points : [req.points[0], undefined, req.points[1]];
  const pair = new Set([A.id, B.id]);
  const sideGiven = !!T || /\b(?:buyuk|kucuk) yay/.test(req.text);
  return scene.objects.filter((o): o is ArcMeasurement => {
    if (!isArcMeasurement(o) || o.pointIds.length !== 2 || !o.pointIds.every(id => pair.has(id))) return false;
    if (!sideGiven) return true;
    const spec: ArcSpec = { circleId: o.circleId, pointIds: [A.id, B.id], ...(T ? { throughPointId: T.id } : {}), ...(!T && req.major ? { major: true } : {}) };
    return sameArc(o, spec, scene.objects);
  });
}

/**
 * Yay ölçümünü SİLME / GİZLEME / GÖSTERME: "BD yayını sil", "BD yayı ölçümünü kaldır", "BD yayını gizle", "BD yayını göster".
 * Düzenleme ailesinin genel "yay" hedefinden (yalnızca gerçek ArcObject'ler) önce çalışır; ad gerçek bir yaya aitse eşleşmez.
 */
export const arcEditHandler: CommandHandler = {
  id: 'measure.arcEdit',
  examples: ['BD yayını sil', 'BD yayı ölçümünü gizle', 'BD yayını göster'],
  match(c, scene) {
    const req = parseArc(c, scene);
    if (!req) return 0;
    const t = req.text;
    if (!DELETE.test(t) && !HIDE_ONLY.test(t) && !SHOW.test(t)) return 0;
    if (/\bgeri al|\bnokta(?:lar)?(?:i|iyla|la)?\b.*\bbirlikte/.test(t)) return 0;
    const [A, B] = [req.points[0], req.points[req.points.length - 1]];
    const onCircle = commonCircles(A.id, B.id, scene.objects).length > 0;
    return onCircle || matchingMeasurements(req, scene).length ? 91 : 0;
  },
  run(c, scene) {
    const req = parseArc(c, scene);
    if (!req) skip();
    const t = req.text;
    const found = matchingMeasurements(req, scene);
    const names = (list: ArcMeasurement[]) => list.map(m => arcTitle(m, scene.objects)).join(', ');
    if (SHOW.test(t) && !DELETE.test(t) && !HIDE_ONLY.test(t)) {
      if (found.length) {
        for (const m of found) setFlags(scene, m, { showValue: true, visible: true });
        scene.act({ kind: 'styleMode', mode: 'Ayrıntılı' });
        scene.act({ kind: 'viewport', patch: { showMeasurements: true } });
        scene.setFocus(found.map(m => m.id));
        scene.say(found.map(m => reply(m, [], scene)).join(' '));
        return;
      }
      const { spec, circles } = specFor(req, scene);
      const m = showArc(spec, scene);
      scene.setFocus([m.id]);
      scene.say(reply(spec, circles, scene));
      return;
    }
    const label = req.points.map(p => p.label).join('');
    if (!found.length) fail(`${label} yayı ölçülmemiş; ${DELETE.test(t) ? 'silinecek' : 'gizlenecek'} yay ölçümü yok. Ölçmek için “${label} yayını ölç” yazın.`);
    if (DELETE.test(t)) {
      const title = names(found);
      scene.remove(found.map(m => m.id));
      scene.setFocus([]);
      scene.say(`${title} ölçümü silindi.`);
      return;
    }
    const changed = found.filter(m => setFlags(scene, m, { visible: false }));
    scene.setFocus(found.map(m => m.id));
    scene.say(changed.length ? `${names(changed)} ölçümü gizlendi.` : `${names(found)} ölçümü zaten gizli.`);
  },
};
