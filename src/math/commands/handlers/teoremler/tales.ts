import type { LineObject, MathObject, Point2D, PointObject, PolygonObject } from '@/types/math';
import type { CommandHandler } from '../../types';
import type { Clause } from '../../text';
import type { CommandScene } from '../../scene';
import { ensureDirectionLine, ensureMidpoint, ensureRatioPoint, freeName, helperName } from '../constructions/build';
import { type Ref, joinTr, newPointNames, refPoints } from '../constructions/refs';
import { MEASURE_NOUN, PLURAL_ALL, triangleOf, triangleWithSide } from '../constructions/common';
import {
  AD, COLORS, PUAN, type Triangle, type UcgenNoktalari, adlar, cumleRengiUygula, fail, istenenKoseAdlari, sayi, sekilYerlestir, ucgenCiz,
  ucgenGerekli, ucgenNoktalari, uzaklik, yabanciFiil,
} from './ortak';

/**
 * Tales teoremi (temel orantı teoremi) şekilleri ve oranları, Tales çemberi (çapı gören çevre açı) ve orta taban
 * (üçgen ve yamuk). Şekiller CANLI kurulur: oran noktası, paralel doğrultu noktası ve kesişim noktası inşa
 * kurallarıyla bağlanır; köşeler sürüklenince oranlar birlikte değişir.
 */

// ---------------------------------------------------------------------------------------------- ortak yardımcılar

const TEMEL_ORANTI = /\btemel oranti/;
const KELEBEK = /\bkelebek/;
const CEMBER_SOZU = /\bcember|\bdaire|\bcap(?:i|li|ini|inin|lari)?\b/;
/** "çapı gören çevre açı", "çapı gören açı" */
const CAPI_GOREN = /\bcap(?:i|ini)? goren/;
/** "AB çapı üzerinde dik açı şekli" */
const CAP_USTUNDE_DIK = /\bcap\w* (?:uzerinde|ustunde)\w* dik(?!me)/;
/** Yeni şekil kurma isteği (oran gösterme isteğinden ayırmak için). */
const KURMA = /\bsekil\b|\bsekl(?:i|ini|ler|leri|lerini)\b|\bsekiller\w*|\bciz|\bkur(?!al(?:i|lar|lari)?\b)|\bolustur|\bek(?:le|leyin)\b|\byap(?!is)/;

const paralel = (u: Point2D, v: Point2D) => Math.abs(u.x * v.y - u.y * v.x) <= 1e-6 * Math.max(1, Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
const vek = (a: Point2D, b: Point2D): Point2D => ({ x: b.x - a.x, y: b.y - a.y });

/** İki doğrunun (a→b ve p→q) kesişimi; paralelse null. */
function dogruKesisimi(a: Point2D, b: Point2D, p: Point2D, q: Point2D): Point2D | null {
  const d1 = vek(a, b), d2 = vek(p, q);
  const den = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((p.x - a.x) * d2.y - (p.y - a.y) * d2.x) / den;
  return { x: a.x + t * d1.x, y: a.y + t * d1.y };
}

/** a→b doğrultusunda p'nin parametresi (a'da 0, b'de 1). */
function parametre(a: Point2D, b: Point2D, p: Point2D): number {
  const d = vek(a, b), len2 = d.x * d.x + d.y * d.y;
  return len2 < 1e-12 ? 0 : ((p.x - a.x) * d.x + (p.y - a.y) * d.y) / len2;
}

/** İki ondalıkla tam yazılabilen sayı. */
const tam = (x: number) => Math.abs(x - Number(x.toFixed(2))) < 1e-9;
/** Sayıların hepsi iki ondalıkla tam yazılıyorsa "=", değilse "≈". */
const isaret = (...xs: number[]) => xs.every(tam) ? '=' : '≈';
const uz = (p: PointObject, q: PointObject) => `|${p.label}${q.label}|`;
const ad2 = (p: PointObject, q: PointObject) => `${p.label}${q.label}`;

/**
 * Verilen konumda duran ve o konuma BAĞLI olan görünür nokta: iki nesnenin kesişim inşası ya da nesnelerden
 * birinin tanım noktası. Rastgele orada duran serbest bir nokta alınmaz; alınsaydı köşe sürüklenince şekil kopardı.
 */
function konumdakiNokta(scene: CommandScene, pos: Point2D, nesneler: MathObject[]): PointObject | undefined {
  const ids = nesneler.map(o => o.id);
  const tanimlayan = new Set(nesneler.flatMap(o => scene.definingPointIds(o)));
  return scene.points().find(p => p.visible && Math.hypot(p.x - pos.x, p.y - pos.y) < 1e-6 && (tanimlayan.has(p.id)
    || (p.construction?.kind === 'intersection' && p.construction.objectIds.every(id => ids.includes(id)))));
}

/** Üç köşe aynı doğru üzerindeyse (dejenere üçgen) reddeder. */
function ucgenDejenereMi(pts: UcgenNoktalari, ad: string) {
  const [a, b, c] = pts;
  const olcek = Math.max(1, uzaklik(a, b), uzaklik(a, c));
  if (Math.abs(vek(a, b).x * vek(a, c).y - vek(a, b).y * vek(a, c).x) < 1e-9 * olcek * olcek) fail(`${ad} üçgeninin köşeleri aynı doğru üzerinde; önce köşelerden birini taşıyın.`);
}

/**
 * Cümlenin gösterdiği üçgen: adıyla yazılmışsa o; yalnız bir kenar yazılmışsa ("BC'ye paralel") o kenarı içeren tek
 * üçgen (birden fazla üçgen varken de çalışır); yoksa odak / seçim / sahnedeki tek üçgen.
 */
function ucgenBul(c: Clause, scene: CommandScene, refs: Ref[], ornek: string): Triangle | null {
  const adli = refs.some(r => r.label && (scene.resolveLabel(r.label, ['polygon']).length > 0 || refPoints(scene, r)?.length === 3));
  if (!adli && scene.ofType('polygon').filter(p => p.pointIds.length === 3).length > 1) {
    for (const r of refs) {
      if (!r.label || r.label.bracket === 'length') continue;
      const found = refPoints(scene, r);
      if (found && found.length === 2 && found[0].id !== found[1].id) return triangleWithSide(scene, found[0], found[1], ornek);
    }
  }
  return triangleOf(c, scene, refs);
}

/** Çokgen çizimini, çizilmiş kenar ile sahnedeki doğru/parça/ışın nesnelerinde ara; yoksa gizli bir yardımcı doğru kur. */
function kenarNesnesi(scene: CommandScene, a: PointObject, b: PointObject): MathObject {
  const existing = scene.shapesWithPoints([a.id, b.id], ['line', 'segment', 'ray'])[0];
  if (existing) return existing;
  const line = scene.addLine(a.id, b.id, { showEquation: false, label: `${a.label}${b.label} Doğrusu` });
  return scene.update(line.id, { visible: false, showLabel: false });
}

/**
 * Tales oranlarının mesajı: A tepe, D ∈ [AP], E ∈ [AQ], DE paralel PQ.
 * "|AD| / |DB| = |AE| / |EC| = 1 (2,5 / 2,5 ≈ 3,2 / 3,2) ve |AD| / |AB| = |DE| / |BC| = 0,5 (2,5 / 5 = 4 / 8)."
 */
function talesOranMesaji(A: PointObject, D: PointObject, P: PointObject, E: PointObject, Q: PointObject): string {
  const ad = uzaklik(A, D), db = uzaklik(D, P), ae = uzaklik(A, E), ec = uzaklik(E, Q);
  const ab = uzaklik(A, P), de = uzaklik(D, E), pq = uzaklik(P, Q);
  if ([ad, db, ae, ec, ab, de, pq].some(x => !(x > 1e-9))) fail('Tales oranları hesaplanamadı: noktalardan bazıları çakışık.');
  const r1 = ad / db, r2 = ad / ab;
  return `${ad2(D, E)} paralel ${ad2(P, Q)}. ${uz(A, D)} / ${uz(D, P)} = ${uz(A, E)} / ${uz(E, Q)} ${isaret(r1)} ${sayi(r1)} `
    + `(${sayi(ad)} / ${sayi(db)} ${isaret(ad, db, ae, ec)} ${sayi(ae)} / ${sayi(ec)}) ve `
    + `${uz(A, D)} / ${uz(A, P)} = ${uz(D, E)} / ${uz(P, Q)} ${isaret(r2)} ${sayi(r2)} `
    + `(${sayi(ad)} / ${sayi(ab)} ${isaret(ad, ab, de, pq)} ${sayi(de)} / ${sayi(pq)}).`;
}

interface Kenar { tepe: number; P: PointObject; Q: PointObject; yazili: boolean }

/**
 * Üçgende paralelin çizileceği / orta tabanın ait olduğu kenar: cümlede yazılan iki köşeli ad ("BC'ye", "[BC]")
 * ya da varsayılan taban (en alttaki kenar). P ve Q yazılış sırasıyla döner.
 */
function kenarSec(scene: CommandScene, tri: Triangle, refs: Ref[], tepeAdi?: string): Kenar {
  const pts = ucgenNoktalari(scene, tri);
  for (const r of refs) {
    if (!r.label || r.label.bracket === 'length') continue;
    const found = refPoints(scene, r);
    if (!found || found.length !== 2 || found[0].id === found[1].id) continue;
    const i = tri.ids.indexOf(found[0].id), j = tri.ids.indexOf(found[1].id);
    if (i < 0 || j < 0) continue;
    const tepe = ([0, 1, 2] as const).find(k => k !== i && k !== j)!;
    return { tepe, P: found[0], Q: found[1], yazili: true };
  }
  // "|BD| = 2" yazılmışsa tepe B'dir (D, B'den çıkan ilk kenar üzerinde).
  const tepe = tepeAdi === undefined ? undefined : ([0, 1, 2] as const).find(k => pts[k].label.toLocaleUpperCase('tr') === tepeAdi.toLocaleUpperCase('tr'));
  if (tepe !== undefined) return { tepe, P: pts[(tepe + 1) % 3], Q: pts[(tepe + 2) % 3], yazili: false };
  return varsayilanTaban(pts);
}

/** "|AD| = 2" yazımındaki ilk harf: oran noktasının çıktığı tepe köşesi (yoksa undefined). */
function uzunluktanTepe(c: Clause): string | undefined {
  const m = c.match(/\$(\d+)\s*(?:=|:)\s*#\d+/);
  const text = m ? c.labels[Number(m[1])]?.text : undefined;
  return text && text.length === 2 && /^[A-ZÇĞİÖŞÜ]{2}$/.test(text) ? text[0] : undefined;
}

/** En alttaki kenar (ortalama y en küçük) taban sayılır; tepe karşı köşedir. */
function varsayilanTaban(pts: UcgenNoktalari): Kenar {
  let best: Kenar | undefined, bestY = Infinity;
  for (const tepe of [0, 1, 2] as const) {
    const P = pts[(tepe + 1) % 3], Q = pts[(tepe + 2) % 3];
    const y = (P.y + Q.y) / 2;
    if (y < bestY - 1e-9) { bestY = y; best = { tepe, P, Q, yazili: false }; }
  }
  return best!;
}

// ---------------------------------------------------------------------------------------------- Tales şekli

/** "2:1 oranında", "2'ye 3 oranında", "1/2 oranında" → t = m / (m + n); "|AD| = 2" → t = 2 / |AP|. */
function oranOku(c: Clause, scene: CommandScene, A: PointObject, P: PointObject): { t: number; dAdi?: string } {
  const uzunluk = c.match(/\$(\d+)\s*(?:=|:)\s*#(\d+)/);
  if (uzunluk) {
    const label = c.labels[Number(uzunluk[1])];
    const text = label?.text ?? '';
    if (text.length === 2 && text[0].toLocaleUpperCase('tr') === A.label.toLocaleUpperCase('tr')) {
      const deger = c.num(`#${uzunluk[2]}`);
      if (!(deger > 0)) fail(`|${text}| uzunluğu 0’dan büyük olmalı.`);
      const harf = text[1];
      const dAdi = scene.findPoint(harf) || harf === P.label ? undefined : harf;
      return { t: deger / uzaklik(A, P), dAdi };
    }
  }
  const oran = c.match(/#(\d+)\s*(?::|\/|ye|ya|e|a)\s*#(\d+)/);
  if (oran) {
    const m = c.num(`#${oran[1]}`), n = c.num(`#${oran[2]}`);
    if (!(m > 0 && n > 0)) fail('Oran için iki pozitif sayı yazın (ör. “2:1 oranında”).');
    return { t: m / (m + n) };
  }
  return { t: 0.5 };
}

interface TalesKurulum { A: PointObject; P: PointObject; Q: PointObject; D: PointObject; E: PointObject; paralel: LineObject; parca: MathObject }

/** A tepe, [PQ] taban: D ∈ [AP] oran noktası, D'den PQ'ya paralel doğru, E = paralel ∩ AQ (canlı kesişim), [DE]. */
function talesKur(scene: CommandScene, A: PointObject, P: PointObject, Q: PointObject, t: number, adlarD: (string | undefined)[]): TalesKurulum {
  if (!Number.isFinite(t) || t <= 0) fail('Oran noktası A tepesinin ötesine düşüyor; pozitif bir oran yazın (ör. “2:1 oranında”).');
  if (Math.abs(t - 1) < 1e-9) fail(`Oran noktası ${P.label} köşesiyle çakışıyor; başka bir oran yazın (ör. “2:1 oranında”).`);
  const D = (Math.abs(t - 0.5) < 1e-12 ? ensureMidpoint(scene, A.id, P.id, { name: freeName(scene, adlarD[0]) }) : ensureRatioPoint(scene, A.id, P.id, t, { name: freeName(scene, adlarD[0]) })).object;
  const yon = ensureDirectionLine(scene, D.id, [P.id, Q.id], 'parallel', ad2(P, Q), { label: `${D.label} / ${ad2(P, Q)} Paraleli` });
  // Doğrultu yardımcı noktası gizli kalır; görünen adlar (E…) kesişim noktasına kalsın.
  if (yon.created) scene.update(yon.helper.id, { label: helperName(scene, D.label), visible: false, showLabel: false });
  const paralel = yon.object;
  const aq = kenarNesnesi(scene, A, Q);
  const konum = { x: A.x + (Q.x - A.x) * t, y: A.y + (Q.y - A.y) * t };
  const E = konumdakiNokta(scene, konum, [paralel, aq]) ?? scene.addPoint(konum, {
    label: freeName(scene, adlarD[1]), color: COLORS.construction, construction: { kind: 'intersection', objectIds: [paralel.id, aq.id], index: 0 },
  });
  const parca = scene.addSegment(D.id, E.id, { showLength: true, color: COLORS.parallel });
  return { A: scene.point(A.id), P: scene.point(P.id), Q: scene.point(Q.id), D: scene.point(D.id), E: scene.point(E.id), paralel, parca };
}

/** Kelebek (X) düzeni: O'da kesişen iki doğru, zıt yanlarda paralel [AC] ve [BD]; B ve D, A ve C'nin O merkezli −k katı. */
function kelebekKur(c: Clause, scene: CommandScene) {
  const oran = c.match(/#(\d+)\s*(?::|\/|ye|ya|e|a)\s*#(\d+)/);
  let k = 2;
  if (oran) {
    const m = c.num(`#${oran[1]}`), n = c.num(`#${oran[2]}`);
    if (!(m > 0 && n > 0)) fail('Oran için iki pozitif sayı yazın (ör. “3:2 oranında”).');
    k = m / n;
  }
  const f = 1 / k;
  // Yerel: O(0;0), A(−3;4), C(3;4) → |OA| = |OC| = 5, |AC| = 6; B = −A/k, D = −C/k.
  const yerel: Point2D[] = [{ x: 0, y: 0 }, { x: -3, y: 4 }, { x: 3, y: 4 }, { x: 3 * f, y: -4 * f }, { x: -3 * f, y: -4 * f }];
  const istenen = ['O', 'A', 'C', 'B', 'D'];
  const [O, A, C, B, D] = sekilYerlestir(scene, yerel, { adlar: istenen.every(n => !scene.findPoint(n)) ? istenen : scene.nextPointLabels(5) });
  scene.update(B.id, { construction: { kind: 'dilate', sourceId: A.id, centerId: O.id, factor: -f }, isIndependent: false, color: COLORS.construction });
  scene.update(D.id, { construction: { kind: 'dilate', sourceId: C.id, centerId: O.id, factor: -f }, isIndependent: false, color: COLORS.construction });
  scene.resolve();
  const ab = scene.addSegment(A.id, B.id, { showLength: false });
  const cd = scene.addSegment(C.id, D.id, { showLength: false });
  const ac = scene.addSegment(A.id, C.id, { showLength: true, color: COLORS.parallel });
  const bd = scene.addSegment(B.id, D.id, { showLength: true, color: COLORS.parallel });
  const [o, a, b, cc, d] = [O, A, B, C, D].map(p => scene.point(p.id));
  const oa = uzaklik(o, a), ob = uzaklik(o, b), oc = uzaklik(o, cc), od = uzaklik(o, d), acL = uzaklik(a, cc), bdL = uzaklik(b, d);
  const r = oa / ob;
  scene.say(`Kelebek Tales şekli çizildi: ${ad2(a, cc)} paralel ${ad2(b, d)}, doğrular ${o.label} noktasında kesişiyor. `
    + `${uz(o, a)} / ${uz(o, b)} = ${uz(o, cc)} / ${uz(o, d)} = ${uz(a, cc)} / ${uz(b, d)} ${isaret(r)} ${sayi(r)} `
    + `(${sayi(oa)} / ${sayi(ob)} ${isaret(oa, ob, oc, od, acL, bdL)} ${sayi(oc)} / ${sayi(od)} ${isaret(oa, ob, oc, od, acL, bdL)} ${sayi(acL)} / ${sayi(bdL)}). `
    + `${a.label}, ${cc.label} ya da ${o.label} noktasını sürüklediğinizde ${b.label} ve ${d.label} birlikte gider; oranlar korunur.`);
  scene.setFocus([ac.id, bd.id, ab.id, cd.id, O.id, A.id, B.id, C.id, D.id]);
}

export const talesSekli: CommandHandler = {
  id: 'teoremler.talesSekli',
  examples: [
    'Tales teoremi şekli çiz',
    'Tales şekli çiz',
    'Tales teoremi için şekil kur',
    'kelebek Tales şekli çiz',
    'üçgende Tales şekli çiz',
    "ABC üçgeninde BC'ye paralel bir doğru çizerek Tales oranlarını göster",
    'ABC üçgeninde 2:1 oranında Tales şekli kur',
  ],
  match(c) {
    if (yabanciFiil(c)) return 0;
    if (c.has(AD.ortaTaban) || c.has(CEMBER_SOZU) || c.has(CAPI_GOREN)) return 0;
    const tales = c.has(AD.tales) || c.has(TEMEL_ORANTI);
    if (c.has(KELEBEK) && (tales || c.has(KURMA))) return PUAN.sekil;
    if (!tales) return 0;
    // "Tales oranlarını göster", "Tales teoremini uygula": var olan şekilde oran gösterme (talesOranlari).
    return c.has(KURMA) ? PUAN.sekil : 0;
  },
  run(c, scene) {
    if (c.has(KELEBEK)) {
      kelebekKur(c, scene);
      cumleRengiUygula(c, scene);
      return;
    }
    const refs = adlar(c);
    const anilan = c.has(/\bucgen/) || refs.some(r => r.label && (scene.resolveLabel(r.label, ['polygon']).length > 0 || (refPoints(scene, r)?.length ?? 0) >= 2));
    const varOlan = anilan ? ucgenBul(c, scene, refs, "ABC üçgeninde BC'ye paralel Tales şekli kur") : null;
    let tri: Triangle;
    let yeni = false;
    if (varOlan) tri = varOlan;
    else {
      // Yerel üçgen: A(3;4) tepe, B(0;0), C(8;0) → |AB| = 5, |BC| = 8.
      const pts = sekilYerlestir(scene, [{ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 8, y: 0 }], { adlar: istenenKoseAdlari(c, scene, 3) ?? ['A', 'B', 'C'] });
      const poly = ucgenCiz(scene, pts as UcgenNoktalari, { kenarEtiketleri: true });
      tri = { ids: [pts[0].id, pts[1].id, pts[2].id], polygon: poly, name: pts.map(p => p.label).join('') };
      yeni = true;
    }
    const pts = ucgenNoktalari(scene, tri);
    ucgenDejenereMi(pts, tri.name);
    const kenar = kenarSec(scene, tri, refs, uzunluktanTepe(c));
    const A = pts[kenar.tepe];
    const { t, dAdi } = oranOku(c, scene, A, kenar.P);
    const serbestAdlar = newPointNames(scene, refs).filter(n => !tri.ids.some(id => scene.point(id).label === n));
    const kurulum = talesKur(scene, A, kenar.P, kenar.Q, t, [dAdi ?? serbestAdlar[0], serbestAdlar[dAdi ? 0 : 1]]);
    const { D, E, P, Q } = kurulum;
    const bas = yeni ? `Tales teoremi şekli çizildi: ${tri.name} üçgeninde ` : 'Tales teoremi: ';
    const uzanti = t > 1 ? ` (${D.label}, [${ad2(A, P)}] uzantısında)` : '';
    // D ve E inşa noktalarıdır (sürüklenemez); oranlar köşeler taşınınca değişir.
    scene.say(`${bas}${talesOranMesaji(kurulum.A, D, P, E, Q).replace(/\.$/, '')}${uzanti}. ${kurulum.A.label}, ${P.label} ya da ${Q.label} köşesini sürüklediğinizde oranlar birlikte değişir.`);
    cumleRengiUygula(c, scene);
    scene.setFocus([kurulum.parca.id, kurulum.paralel.id, D.id, E.id, ...(tri.polygon ? [tri.polygon.id] : [])]);
  },
};

// ---------------------------------------------------------------------------------------------- Tales oranları

interface Paralel { tepe: PointObject; P: PointObject; Q: PointObject; nesne: MathObject; D: Point2D; E: Point2D; t: number }

/** Üçgenin bir kenarına paralel, diğer iki kenarı (ya da uzantılarını) kesen doğru/parça/ışın nesneleri. */
function paralelKesenler(scene: CommandScene, tri: Triangle): Paralel[] {
  const pts = ucgenNoktalari(scene, tri);
  const out: Paralel[] = [];
  for (const nesne of scene.ofType('line', 'segment', 'ray')) {
    const uc = scene.lineOf(nesne);
    if (!uc) continue;
    const [u, v] = uc;
    for (const tepeIdx of [0, 1, 2] as const) {
      const tepe = pts[tepeIdx], P = pts[(tepeIdx + 1) % 3], Q = pts[(tepeIdx + 2) % 3];
      if (!paralel(vek(u, v), vek(P, Q))) continue;
      // Kenarın kendisi ya da tepeden geçen paralel: Tales şekli vermez.
      if (Math.abs(vek(u, v).x * (P.y - u.y) - vek(u, v).y * (P.x - u.x)) < 1e-9 * Math.max(1, uzaklik(u, v))) continue;
      if (Math.abs(vek(u, v).x * (tepe.y - u.y) - vek(u, v).y * (tepe.x - u.x)) < 1e-9 * Math.max(1, uzaklik(u, v))) continue;
      const D = dogruKesisimi(u, v, tepe, P), E = dogruKesisimi(u, v, tepe, Q);
      if (!D || !E) continue;
      const t = parametre(tepe, P, D);
      if (t <= 1e-9 || Math.abs(t - 1) < 1e-9) continue;
      out.push({ tepe, P, Q, nesne, D, E, t });
    }
  }
  return out.sort((x, y) => Number(!(x.t > 0 && x.t < 1)) - Number(!(y.t > 0 && y.t < 1)));
}

/** Kelebek düzeni: paralel iki parça ve onları birleştiren, bir noktada kesişen iki doğru; o noktada bir nokta varsa bulunur. */
function kelebekBul(scene: CommandScene): { O: PointObject; A: PointObject; B: PointObject; C: PointObject; D: PointObject } | null {
  const segs = scene.ofType('segment');
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const s1 = scene.lineOf(segs[i])!, s2 = scene.lineOf(segs[j])!;
    if (!paralel(vek(s1[0], s1[1]), vek(s2[0], s2[1]))) continue;
    for (const [b1, b2] of [[s2[0], s2[1]], [s2[1], s2[0]]] as [PointObject, PointObject][]) {
      const [a1, a2] = s1;
      const O = dogruKesisimi(a1, b1, a2, b2);
      if (!O) continue;
      const t1 = parametre(a1, b1, O), t2 = parametre(a2, b2, O);
      if (!(t1 > 1e-9 && t1 < 1 - 1e-9 && t2 > 1e-9 && t2 < 1 - 1e-9)) continue;
      // Kesişim konumunda duran görünür nokta: kelebekte O serbest köşedir, inşa şartı aranmaz.
      const nokta = scene.points().find(p => p.visible && Math.hypot(p.x - O.x, p.y - O.y) < 1e-6);
      if (nokta) return { O: nokta, A: a1, B: b1, C: a2, D: b2 };
    }
  }
  return null;
}

export const talesOranlari: CommandHandler = {
  id: 'teoremler.talesOranlari',
  examples: [
    'Tales oranlarını göster',
    'Tales teoremini uygula',
    'Tales teoremini doğrula',
    'temel orantı teoremini göster',
    'ABC üçgeninde Tales teoremini uygula',
    'Tales bağıntılarını yaz',
  ],
  match(c) {
    if (yabanciFiil(c)) return 0;
    if (c.has(AD.ortaTaban) || c.has(CEMBER_SOZU) || c.has(CAPI_GOREN) || c.has(KELEBEK)) return 0;
    if (!c.has(AD.tales) && !c.has(TEMEL_ORANTI)) return 0;
    return PUAN.baginti;
  },
  run(c, scene) {
    const refs = adlar(c);
    const ipucu = 'Önce “Tales teoremi şekli çiz” ya da “ABC üçgeninde BC\'ye paralel bir doğru çizerek Tales oranlarını göster” yazın.';
    const tri = ucgenBul(c, scene, refs, 'ABC üçgeninde Tales oranlarını göster');
    if (tri) {
      const adaylar = paralelKesenler(scene, tri);
      if (!adaylar.length) fail(`${tri.name} üçgeninde bir kenara paralel kesen doğru yok. ${ipucu}`);
      const secim = adaylar.find(a => scene.focus.includes(a.nesne.id) || scene.selection.includes(a.nesne.id)) ?? adaylar[0];
      const { tepe, P, Q, nesne } = secim;
      const noktaOlustur = (konum: Point2D, kenarUcu: PointObject) => {
        const kenar = kenarNesnesi(scene, tepe, kenarUcu);
        return konumdakiNokta(scene, konum, [nesne, kenar]) ?? scene.addPoint(konum, {
          color: COLORS.construction, construction: { kind: 'intersection', objectIds: [nesne.id, kenar.id], index: 0 },
        });
      };
      const D = noktaOlustur(secim.D, P), E = noktaOlustur(secim.E, Q);
      const parca = scene.addSegment(D.id, E.id, { showLength: true, color: COLORS.parallel });
      // Oranın parçaları tuvalde uzunluklarıyla görünsün: [AD], [DB], [AE], [EC].
      const parcalar = ([[tepe, D], [D, P], [tepe, E], [E, Q]] as [PointObject, PointObject][]).map(([p, q]) => scene.addSegment(p.id, q.id, { showLength: true }));
      const uzanti = secim.t > 1 ? ` (${D.label} ve ${E.label} kenar uzantılarında)` : '';
      scene.say(`Tales teoremi (${tri.name} üçgeni): ${talesOranMesaji(tepe, D, P, E, Q).replace(/\.$/, '')}${uzanti}.`);
      cumleRengiUygula(c, scene);
      scene.setFocus([parca.id, nesne.id, D.id, E.id, ...parcalar.map(s => s.id)]);
      return;
    }
    const kelebek = kelebekBul(scene);
    if (kelebek) {
      const { O, A, B, C, D } = kelebek;
      const oa = uzaklik(O, A), ob = uzaklik(O, B), oc = uzaklik(O, C), od = uzaklik(O, D), ac = uzaklik(A, C), bd = uzaklik(B, D);
      const r = oa / ob;
      const parcalar = [A, B, C, D].map(p => scene.addSegment(O.id, p.id, { showLength: true }));
      scene.say(`Kelebek Tales şekli: ${ad2(A, C)} paralel ${ad2(B, D)}. ${uz(O, A)} / ${uz(O, B)} = ${uz(O, C)} / ${uz(O, D)} = ${uz(A, C)} / ${uz(B, D)} ${isaret(r)} ${sayi(r)} `
        + `(${sayi(oa)} / ${sayi(ob)} ${isaret(oa, ob, oc, od, ac, bd)} ${sayi(oc)} / ${sayi(od)} ${isaret(oa, ob, oc, od, ac, bd)} ${sayi(ac)} / ${sayi(bd)}).`);
      cumleRengiUygula(c, scene);
      scene.setFocus([...parcalar.map(s => s.id), O.id, A.id, B.id, C.id, D.id]);
      return;
    }
    fail(`Tales oranları için bir üçgen ve bir kenarına paralel bir kesen gerekir. ${ipucu}`);
  },
};

// ---------------------------------------------------------------------------------------------- Tales çemberi

export const talesCemberi: CommandHandler = {
  id: 'teoremler.talesCemberi',
  examples: [
    'Tales çemberi çiz',
    'AB çaplı Tales çemberi çiz',
    'çapı gören çevre açının dik olduğunu göster',
    'AB çapı üzerinde dik açı şekli çiz',
    'Tales teoremi çember şekli',
    'Tales çemberini üçgeniyle birlikte çiz',
  ],
  match(c) {
    if (yabanciFiil(c) || c.has(AD.ortaTaban)) return 0;
    // "Tales çemberinin alanını göster": ölçüm ailesinin işi ("çevre açı" ölçü sözcüğü değildir).
    if (c.has(MEASURE_NOUN) && !c.has(AD.cevreAci)) return 0;
    if (c.has(CAPI_GOREN) || c.has(CAP_USTUNDE_DIK)) return PUAN.sekil;
    return c.has(AD.tales) && c.has(CEMBER_SOZU) ? PUAN.sekil : 0;
  },
  run(c, scene) {
    const refs = adlar(c);
    // Çap uçları: cümledeki iki köşeli ad ("AB çaplı"); sahnede yoksa yeni noktalar.
    let uclar: PointObject[] | undefined;
    for (const r of refs) {
      if (!r.label) continue;
      const found = refPoints(scene, r);
      if (found && found.length === 2 && found[0].id !== found[1].id) { uclar = found; break; }
    }
    if (!uclar) {
      const adlarIstenen = istenenKoseAdlari(c, scene, 2) ?? ['A', 'B'];
      uclar = sekilYerlestir(scene, [{ x: -3, y: 0 }, { x: 3, y: 0 }], { adlar: adlarIstenen });
    }
    const [A, B] = uclar;
    if (uzaklik(A, B) < 1e-9) fail(`${A.label} ve ${B.label} aynı konumda; çap tanımsız.`);
    const M = ensureMidpoint(scene, A.id, B.id, { name: freeName(scene, 'M') ?? freeName(scene, 'O') }).object;
    const circle = scene.ofType('circle').find(o => o.centerPointId === M.id && (o.radiusPointId === A.id || o.radiusPointId === B.id))
      ?? scene.addCircle({ centerId: M.id, radiusPointId: A.id }, { label: `${ad2(A, B)} Çaplı Tales Çemberi`, fillOpacity: 0.06, showArea: false, showPerimeter: false });
    const cap = scene.addSegment(A.id, B.id, { showLength: false });
    // C çember ÜZERİNDE, çapın 100° ilerisinde (üstte).
    const r = uzaklik(A, B) / 2, aci = Math.atan2(B.y - A.y, B.x - A.x) + 100 * Math.PI / 180;
    const m = scene.point(M.id);
    const konum = { x: m.x + r * Math.cos(aci), y: m.y + r * Math.sin(aci) };
    const yeniAdlar = newPointNames(scene, refs);
    const C = scene.addPoint(konum, { label: freeName(scene, yeniAdlar[0]) ?? freeName(scene, 'C'), onObjectId: circle.id });
    scene.addSegment(A.id, C.id, { showLength: false });
    scene.addSegment(C.id, B.id, { showLength: false });
    const angle = scene.addAngle(A.id, C.id, B.id, { color: COLORS.angle });
    const focus = [circle.id, angle.id, C.id, cap.id];
    if (c.has(/\bucgen/)) focus.push(scene.addPolygon([A.id, C.id, B.id], { kind: 'triangle', fillOpacity: 0.08, edgeLabels: [0, 1, 2] }).id);
    scene.say(`Tales çemberi: [${ad2(A, B)}] çap, ${C.label} çember üzerinde; m(∠${A.label}${C.label}${B.label}) = 90°. `
      + `${C.label} noktasını çember üzerinde sürükleseniz de açı 90° kalır.`);
    cumleRengiUygula(c, scene);
    scene.setFocus(focus);
  },
};

// ---------------------------------------------------------------------------------------------- orta taban

const COGUL_ORTA_TABAN = /\borta ?tabanlar/;

/** Dörtgende paralel kenar çiftinin ilk kenarının sırası (0: AB–DC, 1: BC–AD); yamuk değilse undefined. */
function yamukTabani(v: PointObject[]): 0 | 1 | undefined {
  const kenar = (i: number) => vek(v[i % 4], v[(i + 1) % 4]);
  const ciftler = ([0, 1] as const).filter(i => paralel(kenar(i), kenar(i + 2)));
  if (!ciftler.length) return undefined;
  if (ciftler.length === 1) return ciftler[0];
  // Paralelkenar: en alttaki kenarı içeren çift taban sayılır.
  const altY = (i: number) => Math.min((v[i].y + v[(i + 1) % 4].y) / 2, (v[(i + 2) % 4].y + v[(i + 3) % 4].y) / 2);
  return altY(0) <= altY(1) ? 0 : 1;
}

function yamukOrtaTabani(c: Clause, scene: CommandScene, refs: Ref[], polygon: PolygonObject) {
  const v = scene.vertices(polygon);
  const i = yamukTabani(v);
  if (i === undefined) fail(`${polygon.label} bir yamuk değil: paralel kenarı yok. Orta taban için paralel iki kenar gerekir.`);
  const [p0, p1, p2, p3] = [v[i], v[(i + 1) % 4], v[(i + 2) % 4], v[(i + 3) % 4]];
  const adlarYeni = newPointNames(scene, refs);
  const E = ensureMidpoint(scene, p1.id, p2.id, { name: freeName(scene, adlarYeni[0]) }).object;
  const F = ensureMidpoint(scene, p3.id, p0.id, { name: freeName(scene, adlarYeni[1]) }).object;
  const parca = scene.addSegment(E.id, F.id, { showLength: true, color: COLORS.parallel });
  const e = scene.point(E.id), f = scene.point(F.id);
  const ef = uzaklik(e, f), taban1 = uzaklik(p0, p1), taban2 = uzaklik(p3, p2);
  scene.say(`${ad2(e, f)} orta tabanı çizildi: ${e.label}, [${ad2(p1, p2)}] orta noktası; ${f.label}, [${ad2(p3, p0)}] orta noktası. `
    + `${ad2(e, f)} paralel ${ad2(p0, p1)} ve ${uz(e, f)} = (${uz(p0, p1)} + ${uz(p3, p2)}) / 2 (${sayi(ef)} ${isaret(ef, taban1, taban2)} (${sayi(taban1)} + ${sayi(taban2)}) / 2).`);
  cumleRengiUygula(c, scene);
  scene.setFocus([parca.id, E.id, F.id, polygon.id]);
}

export const ortaTaban: CommandHandler = {
  id: 'teoremler.ortaTaban',
  examples: [
    'ABC üçgeninin orta tabanını çiz',
    "BC'ye paralel orta tabanı çiz",
    'BC kenarına ait orta tabanı çiz',
    'üçgenin orta tabanlarını çiz',
    'orta taban teoremini göster',
    'ABCD yamuğunun orta tabanını çiz',
    'yamukta orta tabanı çiz',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(AD.ortaTaban)) return 0;
    return PUAN.sekil;
  },
  run(c, scene) {
    const refs = adlar(c);
    const dortgenler = scene.ofType('polygon').filter(p => p.pointIds.length === 4);
    const ucgenler = scene.ofType('polygon').filter(p => p.pointIds.length === 3);
    const adliDortgen = refs.flatMap(r => r.label ? scene.resolveLabel(r.label, ['polygon']) : []).find((p): p is PolygonObject => p.type === 'polygon' && p.pointIds.length === 4);
    const yamukIstegi = c.has(/\byamu[gk]/) || !!adliDortgen;
    if (yamukIstegi || (!ucgenler.length && dortgenler.length && !c.has(/\bucgen/))) {
      if (!dortgenler.length) fail('Yamuğun orta tabanı için önce “tabanları 6 ve 4, yüksekliği 3 olan yamuk çiz” yazın.');
      const polygon = adliDortgen ?? scene.target(c, { types: ['polygon'], noun: 'yamuk', filter: o => o.type === 'polygon' && o.pointIds.length === 4, labels: [] }) as PolygonObject;
      yamukOrtaTabani(c, scene, refs, polygon);
      return;
    }
    const ornek = '“ABC üçgeninin orta tabanını çiz” diye yazın ya da önce bir üçgen çizin.';
    const tri = ucgenBul(c, scene, refs, "ABC üçgeninde BC'ye paralel orta tabanı çiz") ?? ucgenGerekli(c, scene, refs, ornek);
    const pts = ucgenNoktalari(scene, tri);
    const hepsi = c.has(COGUL_ORTA_TABAN) || c.has(PLURAL_ALL);
    const kenarlar: Kenar[] = hepsi
      ? ([0, 1, 2] as const).map(tepe => ({ tepe, P: pts[(tepe + 1) % 3], Q: pts[(tepe + 2) % 3], yazili: false }))
      : [kenarSec(scene, tri, refs)];
    const adlarYeni = newPointNames(scene, refs).filter(n => !tri.ids.some(id => scene.point(id).label === n));
    const parcalar: string[] = [];
    const cumleler: string[] = [];
    for (const { tepe, P, Q } of kenarlar) {
      const A = pts[tepe];
      const D = ensureMidpoint(scene, A.id, P.id, { name: hepsi ? undefined : freeName(scene, adlarYeni[0]) }).object;
      const E = ensureMidpoint(scene, A.id, Q.id, { name: hepsi ? undefined : freeName(scene, adlarYeni[1]) }).object;
      const parca = scene.addSegment(D.id, E.id, { showLength: true, color: COLORS.parallel });
      parcalar.push(parca.id, D.id, E.id);
      const d = scene.point(D.id), e = scene.point(E.id);
      const de = uzaklik(d, e), pq = uzaklik(P, Q);
      cumleler.push(hepsi
        ? `${ad2(d, e)} paralel ${ad2(P, Q)} (${uz(d, e)} = ${uz(P, Q)} / 2 ${isaret(de, pq)} ${sayi(de)})`
        : `${ad2(d, e)} orta tabanı çizildi: ${d.label}, [${ad2(A, P)}] orta noktası; ${e.label}, [${ad2(A, Q)}] orta noktası. `
          + `${ad2(d, e)} paralel ${ad2(P, Q)} ve ${uz(d, e)} = ${uz(P, Q)} / 2 (${sayi(de)} ${isaret(de, pq)} ${sayi(pq)} / 2).`);
    }
    scene.say(hepsi ? `${tri.name} üçgeninin orta tabanları çizildi: ${joinTr(cumleler)}.` : cumleler[0]);
    cumleRengiUygula(c, scene);
    scene.setFocus([...parcalar, ...(tri.polygon ? [tri.polygon.id] : [])]);
  },
};

export const handlers: CommandHandler[] = [talesSekli, talesOranlari, talesCemberi, ortaTaban];
