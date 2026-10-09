import type { LineObject, MathObject, Point2D, PointObject } from '@/types/math';
import type { CommandHandler } from '../../types';
import { type Clause, fold } from '../../text';
import { angleBisectorPoint, calculateCircumcircle, calculatePolygonArea, intersectLines } from '../../../geometry';
import type { CommandScene } from '../../scene';
import { type Ref, isPointRef, isUnknownRef, joinTr, lineFromRef, named, newPointNames, refPoints } from '../constructions/refs';
import { currentIntersections, distanceToLine, ensureBisectorRay, ensureDirectionLine, ensureMidpoint, ensureRatioPoint, freeName, helperName } from '../constructions/build';
import { ensureCenter } from '../constructions/points';
import {
  AD, BAGINTI_ISTEGI, COLORS, PUAN, type Triangle, type UcgenNoktalari, aciDerece, adlar, cumleRengiUygula, dikKose, fail, kare, koseSirasi, sayi,
  trNum, ucgenGerekli, ucgenNoktalari, uzaklik, yabanciFiil,
} from './ortak';

/**
 * Üçgen bağıntıları: var olan bir üçgen üzerinde açıortay / kenarortay / Stewart / Ceva / Menelaus bağıntıları,
 * sinüs ve kosinüs teoremi, Heron formülü, üçgen eşitsizliği ve açı–kenar ilişkisi.
 *
 * Hepsi PUAN.baginti ile puanlanır; üçgen ucgenGerekli ile bulunur. Köşe seçimi ("A köşesi için", "A açıortayı",
 * "BC kenarı") koseSirasi ile yapılır; seçim yoksa ilk köşe (A) ve ona ait eleman alınır. Gerekli yardımcı
 * elemanlar (açıortay ayağı, kenar orta noktası, kesişimler) CANLI inşa edilir: köşeler sürüklenince bağıntı
 * noktaları yerinde kalır. Çokgen kenarı bir nesne olmadığı için kenar doğrusu gizli bir doğru olarak eklenir ve
 * kesişim noktası bu gizli doğruya bağlanır.
 */

const sameSet = (x: string[], y: string[]) => x.length === y.length && x.every(id => y.includes(id));
const uz = (p: PointObject, q: PointObject) => `|${p.label}${q.label}|`;
/** Değer tam yazılabiliyorsa "=", yuvarlanıyorsa "≈". */
const esitIsareti = (x: number) => Math.abs(x - Number(trNum(x).replace(',', '.'))) < 1e-9 ? '=' : '≈';
/** Çarpanda yazılan sayı: eksi değer ayraç içinde ve eksi işaretiyle ("× (−0,71)"), "× -0,71" yazılmaz. */
const carpan = (x: number) => { const s = sayi(x); return s.startsWith('-') ? `(−${s.slice(1)})` : s; };
/** Eksi işaretli sayı yazımı: "-0,71" → "−0,71". */
const isaretli = (x: number) => sayi(x).replace(/^-/, '−');
/** Köşeler (neredeyse) aynı doğru üzerindeyse gerçek bir üçgen yoktur. */
const dejenere = (pts: UcgenNoktalari) => calculatePolygonArea(pts) < 1e-9;
const cos = (deg: number) => Math.cos(deg * Math.PI / 180);
const sin = (deg: number) => Math.sin(deg * Math.PI / 180);

// ---------------------------------------------------------------------------------------------- ortak yardımcılar

/** A köşesi için [A, B, C] sırası: seçilen köşe başa, diğerleri çokgen sırasıyla. */
function koseler(pts: UcgenNoktalari, i: 0 | 1 | 2): UcgenNoktalari {
  return [pts[i], pts[(i + 1) % 3], pts[(i + 2) % 3]];
}

/** Üçgenin köşesi olmayan, adı geçen noktalar. */
function koseDisiNoktalar(scene: CommandScene, tri: Triangle, refs: Ref[]): PointObject[] {
  const out: PointObject[] = [];
  for (const r of refs) {
    if (!r.label || !isPointRef(scene, r)) continue;
    const p = refPoints(scene, r)?.[0];
    if (p && !tri.ids.includes(p.id) && !out.includes(p)) out.push(p);
  }
  return out;
}

/**
 * Cümlenin gösterdiği köşe: tek köşe adı ("A köşesi için", "A açıortayı", "A açısı"), kenar adı ("BC kenarı" → karşı köşe)
 * ya da köşe + nokta ("AD için" → A). Yoksa ilk köşe.
 */
function secilenKose(c: Clause, scene: CommandScene, tri: Triangle, refs: Ref[]): 0 | 1 | 2 {
  for (const r of refs) {
    if (!r.label || olcuEtiketi(c, r)) continue;
    const text = r.label.text.replace(/[[\]|]/g, '');
    const tek = koseSirasi(scene, tri, text);
    if (tek !== undefined) return tek;
    const pts = scene.pointsFromLabel(text);
    if (pts && pts.length === 2) {
      const [i, j] = pts.map(p => tri.ids.indexOf(p.id));
      if (i >= 0 && j >= 0 && i !== j) return ((3 - i - j) % 3) as 0 | 1 | 2;
      if (i >= 0) return i as 0 | 1 | 2;
      continue;
    }
    if (!pts && text.length === 2) {
      const i = koseSirasi(scene, tri, text[0]);
      if (i !== undefined && koseSirasi(scene, tri, text[1]) === undefined) return i;
    }
  }
  return 0;
}

/** "BD = 2", "|BD| = 2": ölçü veren etiket (köşe seçimi için kullanılmaz). */
const olcuEtiketi = (c: Clause, r: Ref) => new RegExp(`\\$${r.index}[a-z]*\\s*=\\s*#`).test(c.text);

/** İki noktadan geçen doğru; yoksa GİZLİ olarak eklenir (çokgen kenarı nesne değildir; kesişim bu doğruya bağlanır). */
function gizliDogru(scene: CommandScene, a: PointObject, b: PointObject): LineObject {
  const existing = scene.ofType('line').find(l => sameSet([l.point1Id, l.point2Id], [a.id, b.id]));
  if (existing) return existing;
  const line = scene.addLine(a.id, b.id, { showEquation: false });
  return scene.update(line.id, { visible: false, showLabel: false }) as LineObject;
}

/** Doğru üzerindeki konumun [a, b] parçasına göre parametresi (0: a, 1: b). */
function parametre(a: Point2D, b: Point2D, p: Point2D): number {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
  return len2 < 1e-12 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
}

/** Nokta [a, b] parçasının içinde mi (uçlar hariç)? */
function parcaIcinde(a: PointObject, b: PointObject, p: PointObject): boolean {
  const t = parametre(a, b, p);
  return distanceToLine(p, a, b) < 1e-6 && t > 1e-9 && t < 1 - 1e-9;
}

/**
 * İki nesnenin CANLI kesişim noktası. Beklenen konum önce hesaplanır; araçtaki sıralı kesişim listesinde ona en yakın
 * olanın sırası (index) kurala yazılır. Aynı kurala sahip bir nokta ya da kesişimde zaten duran bir TANIM noktası
 * (nesnelerden birini tanımlayan nokta: kenarın ucu, kesenin tanım noktası) varsa o kullanılır. Rastlantıyla aynı yerde
 * duran serbest bir nokta kullanılmaz: köşe sürüklenince kesişimden ayrılır, bağıntı canlılığını yitirir.
 */
function canliKesisim(scene: CommandScene, first: MathObject, second: MathObject, beklenen: Point2D | null, o: { ad?: string; renk?: string; aciklama: string }): PointObject {
  const pts = currentIntersections(scene, first, second);
  if (!beklenen || !pts || !pts.length) fail(o.aciklama);
  let index = 0, enYakin = Infinity;
  pts.forEach((p, i) => { const d = uzaklik(p, beklenen); if (d < enYakin) { enYakin = d; index = i; } });
  const konum = pts[index];
  const tanim = [...scene.definingPointIds(first), ...scene.definingPointIds(second)];
  const existing = scene.points().find(p => p.construction?.kind === 'intersection' && p.construction.index === index && sameSet(p.construction.objectIds, [first.id, second.id]))
    ?? scene.points().find(p => p.visible && tanim.includes(p.id) && uzaklik(p, konum) < 1e-9);
  if (existing) return existing;
  return scene.addPoint(konum, { label: o.ad, color: o.renk ?? COLORS.intersection, construction: { kind: 'intersection', objectIds: [first.id, second.id], index } });
}

/** Yeni nokta adı: cümlede verilen ad, yoksa tercih edilen ad (boşsa), yoksa sıradaki ad. */
function yeniAd(scene: CommandScene, verilen: string | undefined, tercih: string): string | undefined {
  if (verilen && !scene.findPoint(verilen)) return verilen;
  return freeName(scene, tercih);
}

/** Üç köşenin iç açıları (derece), köşe sırasıyla. */
const icAcilar = ([A, B, C]: UcgenNoktalari): [number, number, number] => [aciDerece(B, A, C), aciDerece(A, B, C), aciDerece(A, C, B)];

/** Köşelerdeki açı nesnelerini (değerleriyle) gösterir. */
function acilariGoster(scene: CommandScene, pts: UcgenNoktalari, hangileri: (0 | 1 | 2)[]): string[] {
  return hangileri.map(i => { const [A, B, C] = koseler(pts, i); return scene.addAngle(B.id, A.id, C.id).id; });
}

/** Üçgen ve köşe seçimiyle başlayan işleyicilerin ortak girişi. */
function baslangic(c: Clause, scene: CommandScene) {
  const refs = adlar(c);
  const tri = ucgenGerekli(c, scene, refs);
  const pts = ucgenNoktalari(scene, tri);
  const i = secilenKose(c, scene, tri, refs);
  return { refs, tri, pts, kose: koseler(pts, i), i, adlarYeni: newPointNames(scene, refs) };
}

// ---------------------------------------------------------------------------------------------- açıortay teoremi

const ACIORTAY = /\baci ?ortay/;
const KENARORTAY = /\bkenar ?ortay/;
const UZUNLUK = /\buzunlu/;

export const aciortayTeoremi: CommandHandler = {
  id: 'teoremler.aciortayTeoremi',
  examples: [
    'açıortay teoremini göster',
    'A açıortayı için açıortay teoremini uygula',
    'iç açıortay teoremini uygula',
    'ABC üçgeninde açıortay teoremini doğrula',
    'açıortay uzunluğunu hesapla',
    'dış açıortay teoremini uygula',
    'B köşesi için açıortay teoremini yaz',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(ACIORTAY) || c.has(KENARORTAY)) return 0;
    if (!c.has(BAGINTI_ISTEGI) && !c.has(UZUNLUK)) return 0;
    return PUAN.baginti;
  },
  run(c, scene) {
    const { tri, kose: [A, B, C], adlarYeni } = baslangic(c, scene);
    const b = uzaklik(A, C), cc = uzaklik(A, B);
    const dis = c.has(/\bdis aci ?ortay/);
    const ic = ensureBisectorRay(scene, B.id, A.id, C.id);
    // Bu cümlede oluşan açıortay yardımcı noktası görünen adları (D, E…) tüketmesin: ayak D adını alabilsin.
    if (ic.created) scene.update(ic.helper.id, { label: helperName(scene, `${A.label}${B.label}${C.label}`), showLabel: false });
    const ayakAdi = yeniAd(scene, adlarYeni[0], dis ? "D'" : 'D');
    const bcDogrusu = gizliDogru(scene, B, C);
    const focus: string[] = [];
    if (dis) {
      const paralel = `${A.label} köşesinin dış açıortayı ${B.label}${C.label} doğrusuna paralel (|${A.label}${B.label}| = |${A.label}${C.label}|); kesişim noktası yok. Dış açıortay teoremi için ${A.label} köşesine komşu kenarları farklı bir üçgen kullanın.`;
      if (Math.abs(b - cc) < 1e-9 * Math.max(1, b)) fail(paralel);
      const yon = { x: ic.helper.x - A.x, y: ic.helper.y - A.y };
      const beklenen = intersectLines(A, { x: A.x - yon.y, y: A.y + yon.x }, B, C);
      // Komşu kenarlar neredeyse eşitken kesişim çizim alanının çok dışına düşer; koordinat sınırı yerine nedeni söylenir.
      if (!beklenen || Math.max(Math.abs(beklenen.x), Math.abs(beklenen.y)) > 10000) {
        fail(`${A.label} köşesinin dış açıortayı ${B.label}${C.label} doğrusuna neredeyse paralel (|${A.label}${B.label}| ≈ |${A.label}${C.label}|); kesişim noktası çizim alanının çok dışında kalıyor. ${A.label} köşesine komşu kenarları belirgin biçimde farklı bir üçgen kullanın.`);
      }
      const disAciortay = ensureDirectionLine(scene, A.id, [A.id, ic.helper.id], 'perpendicular', `${A.label} iç açıortayı`, { color: COLORS.bisector, label: `${A.label} Dış Açıortayı` });
      // Doğrultu yardımcı noktası görünen adları (D, E…) tüketmesin ve D' ayağıyla karışmasın.
      if (disAciortay.created) scene.update(disAciortay.helper.id, { label: helperName(scene, `${A.label}dis`), showLabel: false });
      const D = canliKesisim(scene, disAciortay.object, bcDogrusu, beklenen, { ad: ayakAdi, aciklama: 'Dış açıortay kenar doğrusunu kesmiyor.' });
      const m = uzaklik(B, D), n = uzaklik(C, D);
      scene.say(`Dış açıortay teoremi (${A.label} köşesi): ${uz(A, B)} / ${uz(A, C)} = ${uz(B, D)} / ${uz(C, D)} (${sayi(cc)} / ${sayi(b)} = ${sayi(m)} / ${sayi(n)} = ${sayi(cc / b)}). ${D.label} noktası ${B.label}${C.label} doğrusunda, [${B.label}${C.label}] uzantısındadır.`);
      focus.push(disAciortay.object.id, D.id);
    } else {
      const beklenen = intersectLines(A, angleBisectorPoint(B, A, C) ?? A, B, C);
      const D = canliKesisim(scene, ic.object, bcDogrusu, beklenen, { ad: ayakAdi, aciklama: 'Açıortay karşı kenarı kesmiyor.' });
      const AD_ = scene.addSegment(A.id, D.id);
      const m = uzaklik(B, D), n = uzaklik(D, C), d = uzaklik(A, D);
      const d2 = cc * b - m * n;
      scene.say(`Açıortay teoremi (${A.label} köşesi): ${uz(A, B)} / ${uz(A, C)} = ${uz(B, D)} / ${uz(D, C)} (${sayi(cc)} / ${sayi(b)} = ${sayi(m)} / ${sayi(n)} = ${sayi(cc / b)}). `
        + `Açıortay uzunluğu ${uz(A, D)}² = ${uz(A, B)} × ${uz(A, C)} − ${uz(B, D)} × ${uz(D, C)} (${sayi(cc)} × ${sayi(b)} − ${sayi(m)} × ${sayi(n)} = ${sayi(d2)}; ${uz(A, D)} ${esitIsareti(d)} ${sayi(d)} br).`);
      focus.push(AD_.id, D.id);
    }
    if (tri.polygon) focus.push(tri.polygon.id);
    cumleRengiUygula(c, scene);
    scene.setFocus(focus);
  },
};

// ---------------------------------------------------------------------------------------------- kenarortay teoremi

export const kenarortayTeoremi: CommandHandler = {
  id: 'teoremler.kenarortayTeoremi',
  examples: [
    'kenarortay teoremini göster',
    'A kenarortayı için kenarortay teoremi',
    'kenarortay uzunluğunu hesapla',
    'ABC üçgeninde kenarortay bağıntısını yaz',
    'B köşesi için kenarortay teoremini uygula',
    'BC kenarına ait kenarortay teoremini doğrula',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(KENARORTAY) || c.has(ACIORTAY)) return 0;
    if (!c.has(BAGINTI_ISTEGI) && !c.has(UZUNLUK)) return 0;
    return PUAN.baginti;
  },
  run(c, scene) {
    const { tri, pts, kose: [A, B, C], i, adlarYeni } = baslangic(c, scene);
    const D = ensureMidpoint(scene, B.id, C.id, { name: yeniAd(scene, adlarYeni[0], 'D') }).object;
    const AD_ = scene.addSegment(A.id, D.id);
    const a = uzaklik(B, C), b = uzaklik(A, C), cc = uzaklik(A, B), m = uzaklik(A, D);
    scene.say(`Kenarortay teoremi (${A.label} köşesi, ${D.label} noktası [${B.label}${C.label}] orta noktası): 2 × ${uz(A, D)}² = ${uz(A, B)}² + ${uz(A, C)}² − ${uz(B, C)}² / 2 `
      + `(2 × ${kare(m)} = ${kare(cc)} + ${kare(b)} − ${kare(a)} / 2; ${sayi(2 * m * m)} = ${sayi(cc * cc + b * b - a * a / 2)}); ${uz(A, D)} ${esitIsareti(m)} ${sayi(m)} br.`);
    if (dikKose(pts) === i) scene.say(`Dik üçgende hipotenüse ait kenarortay hipotenüsün yarısıdır: ${uz(A, D)} = ${uz(B, C)} / 2 = ${sayi(a / 2)} br.`);
    cumleRengiUygula(c, scene);
    scene.setFocus([AD_.id, D.id, ...(tri.polygon ? [tri.polygon.id] : [])]);
  },
};

// ---------------------------------------------------------------------------------------------- Stewart teoremi

/** "1:2", "1/2", "1'e 2", "bire iki" biçimli oran → t = m / (m + n). */
function oranParametresi(c: Clause): number | undefined {
  const m = c.match(/#(\d+)\s*(?::|\/|bolu|e|a|ye|ya)\s*#(\d+)/);
  if (!m) return undefined;
  const x = c.num(`#${m[1]}`), y = c.num(`#${m[2]}`);
  if (!(x > 0 && y > 0)) fail('Oranın iki tarafı da pozitif olmalı (ör. “1:2 oranında”).');
  return x / (x + y);
}

/** Stewart için [BC] üzerindeki D noktası: cümledeki nokta / uzunluk / oran; yoksa sahnedeki tek nokta; yoksa 1:2 noktası. */
function stewartNoktasi(c: Clause, scene: CommandScene, tri: Triangle, refs: Ref[], [A, B, C]: UcgenNoktalari, adlarYeni: string[]): { D: PointObject; not?: string } {
  const a = uzaklik(B, C);
  const uzerindeOlmali = (p: PointObject) => {
    if (!parcaIcinde(B, C, p)) fail(`${p.label} noktası [${B.label}${C.label}] kenarının üzerinde değil. Stewart teoremi için kenar üzerinde bir nokta yazın (ör. “${B.label}${C.label}'yi 1:2 oranında bölen D noktası için Stewart teoremini göster”).`);
    return { D: p };
  };
  let istenenAd: string | undefined = adlarYeni[0];
  for (const r of refs) {
    if (!r.label) continue;
    const text = r.label.text.replace(/[[\]|]/g, '');
    if (text.length !== 2 || koseSirasi(scene, tri, text[1]) !== undefined) continue;
    const p = scene.findPoint(text[1]);
    if (p && koseSirasi(scene, tri, text[0]) !== undefined && !olcuEtiketi(c, r)) return uzerindeOlmali(p);
    if (!p) istenenAd = text[1];
  }
  const adli = koseDisiNoktalar(scene, tri, refs);
  if (adli.length === 1) return uzerindeOlmali(adli[0]);
  const ad = yeniAd(scene, istenenAd, 'D');
  const olcu = c.match(/\$(\d+)[a-z]*\s*=\s*#(\d+)/);
  if (olcu) {
    const text = c.labels[Number(olcu[1])].text.replace(/[[\]|]/g, '');
    const v = c.num(`#${olcu[2]}`);
    const bastan = text[0] === B.label ? 'B' : text[0] === C.label ? 'C' : undefined;
    if (text.length === 2 && bastan && koseSirasi(scene, tri, text[1]) === undefined) {
      if (!(v > 0 && v < a)) fail(`|${text}| = ${trNum(v)} br olamaz: ${B.label}${C.label} kenarı ${trNum(a)} br; 0 ile ${trNum(a)} arasında bir değer yazın.`);
      const t = bastan === 'B' ? v / a : 1 - v / a;
      return { D: ensureRatioPoint(scene, B.id, C.id, t, { name: ad }).object };
    }
  }
  const t = oranParametresi(c);
  if (t !== undefined) return { D: ensureRatioPoint(scene, B.id, C.id, t, { name: ad }).object };
  const sahnede = scene.points().filter(p => !tri.ids.includes(p.id) && p.visible && parcaIcinde(B, C, p));
  if (sahnede.length === 1) return { D: sahnede[0] };
  if (sahnede.length > 1) fail(`[${B.label}${C.label}] üzerinde birden fazla nokta var (${joinTr(sahnede.map(p => p.label))}). Hangisi olduğunu yazın (ör. “${A.label}${sahnede[0].label} için Stewart teoremini uygula”).`);
  return { D: ensureRatioPoint(scene, B.id, C.id, 1 / 3, { name: ad }).object, not: `${B.label}${C.label} kenarını 1:2 oranında bölen nokta alındı; başka bir nokta için “|${B.label}D| = 2 olacak şekilde Stewart teoremini göster” yazabilirsiniz.` };
}

export const stewart: CommandHandler = {
  id: 'teoremler.stewart',
  examples: [
    'Stewart teoremini göster',
    'AD için Stewart teoremini uygula',
    'ABC üçgeninde Stewart teoremini doğrula',
    'BD = 2 olacak şekilde Stewart teoremini göster',
    "BC'yi 1:2 oranında bölen D noktası için Stewart teoremini göster",
    'Stewart bağıntısını yaz',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(AD.stewart)) return 0;
    return PUAN.baginti;
  },
  run(c, scene) {
    const { refs, tri, kose: [A, B, C], adlarYeni } = baslangic(c, scene);
    const { D, not } = stewartNoktasi(c, scene, tri, refs, [A, B, C], adlarYeni);
    const AD_ = scene.addSegment(A.id, D.id);
    const a = uzaklik(B, C), b = uzaklik(A, C), cc = uzaklik(A, B), d = uzaklik(A, D), m = uzaklik(B, D), n = uzaklik(D, C);
    const sol = b * b * m + cc * cc * n, sag = a * (d * d + m * n);
    scene.say(`Stewart teoremi (${A.label}${D.label} doğru parçası, ${D.label} noktası [${B.label}${C.label}] üzerinde): ${uz(A, C)}² × ${uz(B, D)} + ${uz(A, B)}² × ${uz(D, C)} = ${uz(B, C)} × (${uz(A, D)}² + ${uz(B, D)} × ${uz(D, C)}) `
      + `(${kare(b)} × ${sayi(m)} + ${kare(cc)} × ${sayi(n)} = ${sayi(a)} × (${kare(d)} + ${sayi(m)} × ${sayi(n)}); ${sayi(sol)} = ${sayi(sag)}). ${uz(A, D)} ${esitIsareti(d)} ${sayi(d)} br.`);
    if (not) scene.say(not);
    cumleRengiUygula(c, scene);
    scene.setFocus([AD_.id, D.id, ...(tri.polygon ? [tri.polygon.id] : [])]);
  },
};

// ---------------------------------------------------------------------------------------------- Ceva teoremi

/** Nokta üçgenin içinde mi (kenarlar hariç)? */
function ucgeninIcinde([A, B, C]: UcgenNoktalari, p: Point2D): boolean {
  const s = (p1: Point2D, p2: Point2D) => (p2.x - p1.x) * (p.y - p1.y) - (p2.y - p1.y) * (p.x - p1.x);
  const d1 = s(A, B), d2 = s(B, C), d3 = s(C, A);
  const eps = 1e-9;
  return (d1 > eps && d2 > eps && d3 > eps) || (d1 < -eps && d2 < -eps && d3 < -eps);
}

/** Ceva için iç nokta: cümlede adı geçen nokta, yoksa sahnede üçgen içindeki tek nokta, yoksa ağırlık merkezi (not düşülür). */
function cevaNoktasi(scene: CommandScene, tri: Triangle, refs: Ref[], pts: UcgenNoktalari): { P: PointObject; not?: string } {
  // "P noktası için" denmiş ama sahnede P yoksa ayaklardan birine P adını vermek yerine açıklanır.
  const bilinmeyen = refs.find(r => r.noun === 'point' && isUnknownRef(scene, r));
  if (bilinmeyen) fail(`${bilinmeyen.label!.text} adlı nokta yok. Ceva teoremi için önce üçgenin içine bir nokta koyun (ör. “(2; 1) noktasına ${bilinmeyen.label!.text} koy”) ya da nokta adı yazmayın; o zaman ağırlık merkezi alınır.`);
  const adli = koseDisiNoktalar(scene, tri, refs);
  if (adli.length > 1) fail(`Ceva teoremi tek bir iç nokta için gösterilir; hangisi olduğunu yazın (ör. “${adli[0].label} noktası için Ceva teoremini uygula”).`);
  if (adli.length === 1) {
    if (!ucgeninIcinde(pts, adli[0])) fail(`${adli[0].label} noktası ${tri.name} üçgeninin içinde değil. Ceva teoremi üçgenin içindeki bir nokta için gösterilir; noktayı üçgenin içine taşıyın ya da içerideki bir noktanın adını yazın.`);
    return { P: adli[0] };
  }
  const icerde = scene.points().filter(p => p.visible && !tri.ids.includes(p.id) && ucgeninIcinde(pts, p));
  if (icerde.length === 1) return { P: icerde[0] };
  if (icerde.length > 1) fail(`Üçgenin içinde birden fazla nokta var (${joinTr(icerde.map(p => p.label))}). Hangisi olduğunu yazın (ör. “${icerde[0].label} noktası için Ceva teoremini uygula”).`);
  const { point, created } = ensureCenter(scene, tri.ids, 'centroid');
  return { P: point, not: created ? `Üçgenin içinde nokta olmadığı için ağırlık merkezi ${named(point)} alındı; başka bir nokta için “P noktası için Ceva teoremini uygula” yazın.` : undefined };
}

export const ceva: CommandHandler = {
  id: 'teoremler.ceva',
  examples: [
    'Ceva teoremini göster',
    'P noktası için Ceva teoremini uygula',
    'ABC üçgeninde Ceva teoremi',
    "Ceva'yı doğrula",
    'Ceva bağıntısını yaz',
    'G noktası için Ceva teoremini uygula',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(AD.ceva)) return 0;
    return PUAN.baginti;
  },
  run(c, scene) {
    const refs = adlar(c);
    const tri = ucgenGerekli(c, scene, refs);
    const pts = ucgenNoktalari(scene, tri);
    const [A, B, C] = pts;
    const { P, not } = cevaNoktasi(scene, tri, refs, pts);
    const adlarYeni = newPointNames(scene, refs);
    const ayak = (V: PointObject, W: PointObject, X: PointObject, tercih: string, k: number) => canliKesisim(scene, gizliDogru(scene, V, P), gizliDogru(scene, W, X), intersectLines(V, P, W, X),
      { ad: yeniAd(scene, adlarYeni[k], tercih), aciklama: `${V.label}${P.label} doğrusu ${W.label}${X.label} kenarını kesmiyor.` });
    const D = ayak(A, B, C, 'D', 0), E = ayak(B, C, A, 'E', 1), F = ayak(C, A, B, 'F', 2);
    const parcalar = [scene.addSegment(A.id, D.id, { showLength: false }), scene.addSegment(B.id, E.id, { showLength: false }), scene.addSegment(C.id, F.id, { showLength: false })];
    const r1 = uzaklik(A, F) / uzaklik(F, B), r2 = uzaklik(B, D) / uzaklik(D, C), r3 = uzaklik(C, E) / uzaklik(E, A);
    scene.say(`Ceva teoremi (${P.label} noktası): (${uz(A, F)} / ${uz(F, B)}) × (${uz(B, D)} / ${uz(D, C)}) × (${uz(C, E)} / ${uz(E, A)}) = 1 (${sayi(r1)} × ${sayi(r2)} × ${sayi(r3)} = ${sayi(r1 * r2 * r3)}). `
      + `${D.label}, ${E.label} ve ${F.label} noktaları sırasıyla ${A.label}${P.label}, ${B.label}${P.label} ve ${C.label}${P.label} doğrularının karşı kenarları kestiği noktalardır.`);
    if (not) scene.say(not);
    cumleRengiUygula(c, scene);
    scene.setFocus([...parcalar.map(s => s.id), D.id, E.id, F.id, P.id]);
  },
};

// ---------------------------------------------------------------------------------------------- Menelaus teoremi

/** Doğru üçgenin köşelerinden geçmiyor ve en az iki kenar doğrusunu kesiyor mu? */
function kesenMi(pts: UcgenNoktalari, a: Point2D, b: Point2D): boolean {
  if (pts.some(p => distanceToLine(p, a, b) < 1e-9)) return false;
  const kenarlar: [Point2D, Point2D][] = [[pts[0], pts[1]], [pts[1], pts[2]], [pts[2], pts[0]]];
  return kenarlar.filter(([p, q]) => intersectLines(a, b, p, q)).length >= 2;
}

export const menelaus: CommandHandler = {
  id: 'teoremler.menelaus',
  examples: [
    'Menelaus teoremini göster',
    'd doğrusu için Menelaus teoremini uygula',
    'ABC üçgeninde Menelaus teoremini doğrula',
    'Menelaus bağıntısını yaz',
    'Menelaus teoremini açıkla',
    'DE doğrusu için Menelaus teoremi',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(AD.menelaus)) return 0;
    return PUAN.baginti;
  },
  run(c, scene) {
    const refs = adlar(c);
    const tri = ucgenGerekli(c, scene, refs);
    const pts = ucgenNoktalari(scene, tri);
    const [A, B, C] = pts;
    const adlarYeni = newPointNames(scene, refs);
    const kenarlar: [PointObject, PointObject, string, number][] = [[A, B, 'F', 2], [B, C, 'D', 0], [C, A, 'E', 1]];
    let kesen: LineObject | undefined;
    const notlar: string[] = [];
    const ucgenAdi = refs.filter(r => r.label && (scene.resolveLabel(r.label, ['polygon']).length || (refPoints(scene, r)?.length ?? 0) >= 3));
    const adli = refs.filter(r => !ucgenAdi.includes(r) && r.label && !isPointRef(scene, r)).map(r => ({ r, line: lineFromRef(scene, r) })).filter(x => x.line);
    if (adli.length) {
      const { r, line } = adli[0];
      const obj = line!.object;
      if (!obj || obj.type !== 'line') fail(`${r.label!.text} bir doğru değil. Kesen için bir doğru çizin (ör. “K ve L noktalarından geçen doğru çiz”) ve adını yazın.`);
      if (!kesenMi(pts, line!.a, line!.b)) fail(`${line!.name} doğrusu ${tri.name} üçgeninin köşesinden geçiyor ya da kenarlarını kesmiyor; Menelaus teoremi için köşelerden geçmeyen, kenar doğrularını kesen bir doğru gerekir.`);
      kesen = obj;
    } else {
      const adaylar = scene.ofType('line').filter(l => l.visible && kesenMi(pts, scene.point(l.point1Id), scene.point(l.point2Id)));
      if (adaylar.length === 1) kesen = adaylar[0];
      else if (adaylar.length > 1) fail(`Üçgeni kesen birden fazla doğru var (${joinTr(adaylar.map(l => l.label))}). Hangisi olduğunu yazın (ör. “${adaylar[0].label} doğrusu için Menelaus teoremini uygula”).`);
    }
    const noktalar: PointObject[] = [];
    if (!kesen) {
      const F = ensureRatioPoint(scene, A.id, B.id, 1 / 3, { name: yeniAd(scene, adlarYeni[2], 'F') }).object;
      const E = ensureRatioPoint(scene, A.id, C.id, 2 / 3, { name: yeniAd(scene, adlarYeni[1], 'E') }).object;
      kesen = scene.addLine(F.id, E.id, { label: `${F.label}${E.label} Keseni`, color: COLORS.construction, showEquation: false });
      notlar.push(`Kesen doğru için [${A.label}${B.label}] üzerinde ${named(F)} ve [${A.label}${C.label}] üzerinde ${named(E)} alındı; kendi doğrunuz için “d doğrusu için Menelaus teoremini uygula” yazın.`);
    }
    const [P, Q] = [scene.point(kesen.point1Id), scene.point(kesen.point2Id)];
    const kesenAdi = /dogru|kesen/.test(fold(kesen.label)) ? kesen.label : `${kesen.label} doğrusu`;
    for (const [U, V, tercih, k] of kenarlar) {
      const beklenen = intersectLines(P, Q, U, V);
      if (!beklenen) fail(`${kesenAdi} ${U.label}${V.label} kenar doğrusuna paralel; Menelaus teoremi için doğru üç kenar doğrusunu da kesmeli.`);
      noktalar.push(canliKesisim(scene, kesen, gizliDogru(scene, U, V), beklenen, { ad: yeniAd(scene, adlarYeni[k], tercih), aciklama: `${kesen.label} ${U.label}${V.label} doğrusunu kesmiyor.` }));
    }
    const [F, D, E] = noktalar;
    const r1 = uzaklik(A, F) / uzaklik(F, B), r2 = uzaklik(B, D) / uzaklik(D, C), r3 = uzaklik(C, E) / uzaklik(E, A);
    const konum = (U: PointObject, V: PointObject, X: PointObject) => { const t = parametre(U, V, X); return `${X.label} [${U.label}${V.label}] ${t < 0 || t > 1 ? 'uzantısında' : 'üzerinde'}`; };
    scene.say(`Menelaus teoremi (${kesen.label}): (${uz(A, F)} / ${uz(F, B)}) × (${uz(B, D)} / ${uz(D, C)}) × (${uz(C, E)} / ${uz(E, A)}) = 1 (${sayi(r1)} × ${sayi(r2)} × ${sayi(r3)} = ${sayi(r1 * r2 * r3)}). `
      + `${konum(A, B, F)}, ${konum(B, C, D)}, ${konum(C, A, E)}.`);
    notlar.forEach(n => scene.say(n));
    cumleRengiUygula(c, scene);
    scene.setFocus([kesen.id, F.id, D.id, E.id]);
  },
};

// ---------------------------------------------------------------------------------------------- sinüs teoremi

export const sinusTeoremi: CommandHandler = {
  id: 'teoremler.sinusTeoremi',
  examples: [
    'sinüs teoremini göster',
    'sinüs teoremini uygula',
    'sinüs teoremini yaz',
    'ABC üçgeninde sinüs teoremi',
    'sinüs kuralını doğrula',
    'çevrel çemberle birlikte sinüs teoremini göster',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(AD.sinusTeoremi)) return 0;
    return PUAN.baginti;
  },
  run(c, scene) {
    const refs = adlar(c);
    const tri = ucgenGerekli(c, scene, refs);
    const pts = ucgenNoktalari(scene, tri);
    const [A, B, C] = pts;
    const cevrel = calculateCircumcircle(A, B, C);
    if (!cevrel) fail('Köşeler aynı doğru üzerinde; sinüs teoremi için gerçek bir üçgen gerekir.');
    const [alfa, beta, gama] = icAcilar(pts);
    const a = uzaklik(B, C), b = uzaklik(C, A), cc = uzaklik(A, B);
    const R = cevrel.radius;
    const focus = acilariGoster(scene, pts, [0, 1, 2]);
    scene.say(`Sinüs teoremi (${tri.name}): ${uz(B, C)} / sin ${A.label} = ${uz(C, A)} / sin ${B.label} = ${uz(A, B)} / sin ${C.label} = 2r: `
      + `${sayi(a)} / sin ${sayi(alfa)}° = ${sayi(b)} / sin ${sayi(beta)}° = ${sayi(cc)} / sin ${sayi(gama)}° = ${sayi(a / sin(alfa))} (r = ${sayi(R)} br, çevrel çemberin yarıçapı).`);
    if (c.has(/\bcember|\bcevrel|\bdaire/)) {
      const through = tri.ids;
      const circle = scene.ofType('circle').find(o => o.throughPointIds?.length === 3 && sameSet(o.throughPointIds, through))
        ?? scene.addCircle({ throughIds: through }, { label: `${tri.name} Çevrel Çemberi` });
      focus.push(circle.id);
    }
    if (tri.polygon) focus.push(tri.polygon.id);
    cumleRengiUygula(c, scene);
    scene.setFocus(focus);
  },
};

// ---------------------------------------------------------------------------------------------- kosinüs teoremi

export const kosinusTeoremi: CommandHandler = {
  id: 'teoremler.kosinusTeoremi',
  examples: [
    'kosinüs teoremini göster',
    'A açısı için kosinüs teoremini uygula',
    "kosinüs teoremiyle BC'yi hesapla",
    'ABC üçgeninde kosinüs teoremini yaz',
    'B köşesi için kosinüs teoremini doğrula',
    'kosinüs kuralını göster',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(AD.kosinusTeoremi)) return 0;
    return PUAN.baginti;
  },
  run(c, scene) {
    const { tri, kose: [A, B, C], i, pts } = baslangic(c, scene);
    const a = uzaklik(B, C), b = uzaklik(A, C), cc = uzaklik(A, B);
    const alfa = aciDerece(B, A, C), k = cos(alfa);
    const sag = cc * cc + b * b - 2 * cc * b * k;
    const focus = acilariGoster(scene, pts, [i]);
    scene.say(`Kosinüs teoremi (${A.label} açısı, m(∠${B.label}${A.label}${C.label}) = ${sayi(alfa)}°): ${uz(B, C)}² = ${uz(A, B)}² + ${uz(A, C)}² − 2 × ${uz(A, B)} × ${uz(A, C)} × cos ${A.label}; `
      + `cos ${A.label} ${esitIsareti(k)} ${isaretli(k)} olduğundan ${kare(a)} = ${kare(cc)} + ${kare(b)} − 2 × ${sayi(cc)} × ${sayi(b)} × ${carpan(k)} = ${sayi(sag)}; ${uz(B, C)} ${esitIsareti(a)} ${sayi(a)} br.`);
    if (tri.polygon) focus.push(tri.polygon.id);
    cumleRengiUygula(c, scene);
    scene.setFocus(focus);
  },
};

// ---------------------------------------------------------------------------------------------- Heron formülü

export const heron: CommandHandler = {
  id: 'teoremler.heron',
  examples: [
    'Heron formülüyle alanı hesapla',
    'Heron formülünü göster',
    'Heron formülünü uygula',
    "Heron ile ABC'nin alanı",
    'ABC üçgeninin alanını Heron formülüyle bul',
    'Heron bağıntısını yaz',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(AD.heron)) return 0;
    return PUAN.baginti;
  },
  run(c, scene) {
    const refs = adlar(c);
    const tri = ucgenGerekli(c, scene, refs);
    const pts = ucgenNoktalari(scene, tri);
    const [A, B, C] = pts;
    const a = uzaklik(B, C), b = uzaklik(C, A), cc = uzaklik(A, B);
    const u = (a + b + cc) / 2;
    const carpim = u * (u - a) * (u - b) * (u - cc);
    const alan = calculatePolygonArea(pts);
    if (!(carpim > 0) || alan < 1e-12) fail('Köşeler aynı doğru üzerinde; alanı sıfır olan şekil için Heron formülü uygulanmaz.');
    if (tri.polygon) scene.update(tri.polygon.id, { showArea: true });
    scene.say(`Heron formülü (${tri.name}): u = (${uz(A, B)} + ${uz(B, C)} + ${uz(C, A)}) / 2 = (${sayi(cc)} + ${sayi(a)} + ${sayi(b)}) / 2 = ${sayi(u)}; `
      + `A(${tri.name}) = karekök(u × (u − ${uz(A, B)}) × (u − ${uz(B, C)}) × (u − ${uz(C, A)})) = karekök(${sayi(u)} × ${sayi(u - cc)} × ${sayi(u - a)} × ${sayi(u - b)}) = karekök(${sayi(carpim)}) ${esitIsareti(alan)} ${sayi(alan)} br².`);
    cumleRengiUygula(c, scene);
    scene.setFocus(tri.polygon ? [tri.polygon.id] : tri.ids);
  },
};
// ---------------------------------------------------------------------------------------------- üçgen eşitsizliği

/** "çizilebilir mi", "olur mu", "oluşturur mu", "var mıdır", "mümkün mü" soru biçimleri. */
const SORU = /\b(?:cizilebilir|cizilir|cizebilir|olur|olusturur|olusur|olabilir|mumkun|var|olusturulabilir)\s+m[iu](?:dir|dur)?\b/;

/**
 * Sorudaki kenar uzunlukları. "3, 4 ve 5 kenarlı BİR üçgen" yazımında çözümleyici "kenarlı"dan sonraki "bir"i sayı
 * sayar; "bir üçgen" tanımlığı (değeri 1, hemen "üçgen" önünde) listeden düşülür.
 */
function kenarSayilari(c: Clause): number[] {
  const m = c.match(/#(\d+)\s+(?:tane\s+)?ucgen/);
  if (!m || c.numbers.length !== 4 || c.num(`#${m[1]}`) !== 1 || !/\bbir\s+(?:tane\s+)?ucgen/.test(fold(c.raw))) return c.numbers;
  return c.numbers.filter((_, i) => i !== Number(m[1]));
}

export const ucgenEsitsizligi: CommandHandler = {
  id: 'teoremler.ucgenEsitsizligi',
  examples: [
    'üçgen eşitsizliğini doğrula',
    'üçgen eşitsizliğini yaz',
    'ABC üçgeninde üçgen eşitsizliği',
    'kenarları 2, 3 ve 7 olan üçgen çizilebilir mi',
    '3, 4, 8 üçgen olur mu',
    '2 3 7 üçgen oluşturur mu',
    'kenarları 5, 6 ve 7 olan bir üçgen var mıdır',
  ],
  match(c) {
    if (yabanciFiil(c)) return 0;
    if (c.has(AD.ucgenEsitsizligi)) return PUAN.baginti;
    if (kenarSayilari(c).length === 3 && c.has(/\bucgen/) && c.has(SORU)) return PUAN.baginti;
    return 0;
  },
  run(c, scene) {
    const sayilar = kenarSayilari(c);
    if (sayilar.length === 3 && c.has(SORU)) {
      const [x, y, z] = sayilar;
      if (![x, y, z].every(v => v > 0 && Number.isFinite(v))) fail('Kenar uzunlukları pozitif sayılar olmalı (ör. “3, 4, 5 üçgen olur mu”).');
      const [s0, s1, s2] = [x, y, z].sort((p, q) => p - q);
      const toplam = s0 + s1;
      const liste = `${sayi(x)}, ${sayi(y)} ve ${sayi(z)}`;
      if (toplam > s2 + 1e-9) scene.say(`Evet: kenarları ${liste} olan üçgen çizilebilir. İki kısa kenarın toplamı ${sayi(s0)} + ${sayi(s1)} = ${sayi(toplam)}, en uzun kenar ${sayi(s2)} bundan küçük; üçgen eşitsizliği sağlanır.`);
      else if (Math.abs(toplam - s2) <= 1e-9) scene.say(`Hayır: kenarları ${liste} olan üçgen çizilemez. ${sayi(s0)} + ${sayi(s1)} = ${sayi(s2)} olduğundan üç nokta aynı doğru üzerinde kalır; iki kenarın toplamı üçüncü kenardan büyük olmalı.`);
      else scene.say(`Hayır: kenarları ${liste} olan üçgen çizilemez. ${sayi(s0)} + ${sayi(s1)} = ${sayi(toplam)}, en uzun kenar ${sayi(s2)} bundan büyük; üçgen eşitsizliği bozulur (iki kenarın toplamı üçüncü kenardan büyük olmalı).`);
      return;
    }
    const refs = adlar(c);
    const tri = ucgenGerekli(c, scene, refs);
    const pts = ucgenNoktalari(scene, tri);
    if (dejenere(pts)) fail(`${tri.name} köşeleri aynı doğru üzerinde; üçgen eşitsizliği sağlanmaz (iki kenarın toplamı üçüncüye eşit). Bir köşeyi doğrunun dışına taşıyın.`);
    const kenarlar = [0, 1, 2].map(i => { const [A, B, C] = koseler(pts, i as 0 | 1 | 2); return { ad: uz(B, C), a: uzaklik(B, C), b: uzaklik(C, A), cc: uzaklik(A, B) }; });
    const parcalar = kenarlar.map(({ ad, a, b, cc }) => {
      const [buyuk, kucuk] = b >= cc ? [b, cc] : [cc, b];
      return `${ad} = ${sayi(a)} br: ${sayi(buyuk)} − ${sayi(kucuk)} = ${sayi(buyuk - kucuk)} ile ${sayi(buyuk)} + ${sayi(kucuk)} = ${sayi(buyuk + kucuk)} arasında`;
    });
    if (tri.polygon) scene.update(tri.polygon.id, { edgeLabels: [0, 1, 2] });
    scene.say(`Üçgen eşitsizliği (${tri.name}): her kenar, diğer iki kenarın farkından büyük ve toplamından küçüktür. ${parcalar.join('; ')}.`);
    cumleRengiUygula(c, scene);
    scene.setFocus(tri.polygon ? [tri.polygon.id] : tri.ids);
  },
};

// ---------------------------------------------------------------------------------------------- açı–kenar ilişkisi

/** "açı kenar", "açı-kenar" (tire ayrı sözcük olarak gelir), "büyük açı karşısında…" */
const ACI_KENAR = /\baci(?:\s*-\s*|\s+)kenar|\bkenar(?:\s*-\s*|\s+)aci|\bbuyuk aci\w* karsi|\bbuyuk kenar\w* karsi|\bkucuk aci\w* karsi/;

export const aciKenar: CommandHandler = {
  id: 'teoremler.aciKenar',
  examples: [
    'açı kenar ilişkisini göster',
    'büyük açı karşısında büyük kenar',
    'ABC üçgeninde açı-kenar bağıntısını yaz',
    'açı kenar ilişkisini doğrula',
    'açıları ve karşı kenarları sırala',
    'büyük açının karşısında büyük kenar olduğunu doğrula',
  ],
  match(c) {
    if (yabanciFiil(c)) return 0;
    if (c.has(ACI_KENAR) && (c.has(BAGINTI_ISTEGI) || c.has(/\bbuyuk|\bkucuk|\bsirala/))) return PUAN.baginti;
    if (c.has(/\baci\w* ve (?:karsi |karsilarindaki )?kenar\w* sirala|\bkenar\w* ve (?:karsi )?aci\w* sirala/)) return PUAN.baginti;
    return 0;
  },
  run(c, scene) {
    const refs = adlar(c);
    const tri = ucgenGerekli(c, scene, refs);
    const pts = ucgenNoktalari(scene, tri);
    if (dejenere(pts)) fail(`${tri.name} köşeleri aynı doğru üzerinde; açı–kenar ilişkisi için gerçek bir üçgen gerekir. Bir köşeyi doğrunun dışına taşıyın.`);
    const acilar = icAcilar(pts);
    const sira = ([0, 1, 2] as (0 | 1 | 2)[]).sort((p, q) => acilar[q] - acilar[p]);
    const focus = acilariGoster(scene, pts, sira);
    const aciYazisi = sira.map(i => { const [A, B, C] = koseler(pts, i); return `m(∠${B.label}${A.label}${C.label}) = ${sayi(acilar[i])}°`; });
    const kenarYazisi = sira.map(i => { const [, B, C] = koseler(pts, i); return `${uz(B, C)} = ${sayi(uzaklik(B, C))} br`; });
    const esit = sira.some((i, k) => k > 0 && Math.abs(acilar[i] - acilar[sira[k - 1]]) < 1e-6);
    scene.say(`Açı-kenar ilişkisi (${tri.name}): açılar büyükten küçüğe ${aciYazisi.join(', ')}; karşılarındaki kenarlar da aynı sırada: ${kenarYazisi.join(', ')}. `
      + `Büyük açının karşısında büyük kenar, küçük açının karşısında küçük kenar bulunur${esit ? '; eşit açıların karşısındaki kenarlar da eşittir' : ''}.`);
    if (tri.polygon) focus.push(tri.polygon.id);
    cumleRengiUygula(c, scene);
    scene.setFocus(focus);
  },
};

export const handlers: CommandHandler[] = [aciortayTeoremi, kenarortayTeoremi, stewart, ceva, menelaus, sinusTeoremi, kosinusTeoremi, heron, ucgenEsitsizligi, aciKenar];
