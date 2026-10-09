import type { Point2D, PointObject, PolygonObject } from '@/types/math';
import type { Clause } from '../../text';
import { COLORS, type CommandScene, fail, tidy, trNum } from '../../scene';
import { type Ref, refsOf } from '../constructions/refs';
import { type Triangle, foreignVerb, triangleOf } from '../constructions/common';

/**
 * "Teoremler ve klasik şekiller" ailesinin ortak yardımcıları.
 *
 * Bu aile, geometri literatüründeki ADLI şekilleri ve bağıntıları yazıyla kurar: Öklid üçgeni ve bağıntıları,
 * Pisagor şekli, Tales teoremi ve Tales çemberi, orta taban, açıortay / kenarortay / Stewart / Ceva / Menelaus
 * bağıntıları, sinüs ve kosinüs teoremi, Heron, dış teğet çember, Euler doğrusu, dokuz nokta çemberi,
 * çemberde kiriş / kesen / çevre açı / teğet-kiriş açısı / kuvvet…
 *
 * PUANLAR: types.ts'teki bant tablosunda inşalar 65–74, dönüşümler 75–84'tür. Bu ailenin cümleleri teorem ya da
 * şekil ADIYLA (öklid, pisagor, tales, kiriş, kesen, kuvvet…) tanındığı için inşa ailesinin genel sözcüklerinden
 * ("açıortay", "yükseklik", "çember") daha belirgindir; o yüzden inşaların ÜSTÜNDE puanlanır. Dönüşüm bandıyla
 * çakışmaz: dönüşüm işleyicileri yalnız kendi fiilleriyle (yansıt, döndür, ötele, büyüt) eşleşir ve bu aile o
 * fiillerde 0 döndürür (yabanciFiil). Düzenleme / uygulama bandının (85+) altında kalır: "Öklid üçgenini sil"
 * düzenleme ailesinindir.
 */
export const PUAN = {
  /** Yeni bir şekil kurar: "Öklid üçgeni çiz", "Tales teoremi şekli çiz", "Pisagor şekli çiz" */
  sekil: 78,
  /** Var olan şekil üzerinde bağıntı / teorem gösterir: "Öklid bağıntılarını göster", "sinüs teoremini yaz" */
  baginti: 76,
} as const;

/** Teorem ve şekil adlarının katlanmış yazımları (ses tanıma ve yazım farkları dahil). */
export const AD = {
  oklid: /\b(?:oklid|oklit|euclid|euklid|oklidyen)\w*/,
  pisagor: /\b(?:pisagor|pitagor|pythagor)\w*/,
  tales: /\b(?:tales|thales)\w*/,
  euler: /\b(?:euler|oyler)\w*/,
  dokuzNokta: /\bdokuz nokta|\b9 nokta|\bfeuerbach/,
  ortaTaban: /\borta ?taban/,
  stewart: /\bstewart|\bstuart/,
  ceva: /\bceva\b|\bceva(?:nin|yi|ya)\b|\bseva\b/,
  menelaus: /\bmenela[uü]s|\bmenelaos/,
  heron: /\bheron\w*/,
  sinusTeoremi: /\bsinus (?:teorem|baginti|kural)/,
  kosinusTeoremi: /\bkosinus (?:teorem|baginti|kural)/,
  ucgenEsitsizligi: /\bucgen esitsizli/,
  kuvvet: /\bkuvvet/,
  kiris: /\bkiris/,
  kesen: /\bkesen/,
  cevreAci: /\bcevre aci/,
  tegetKiris: /\bteget[- ]kiris|\bteyet[- ]kiris/,
  disTeget: /\bdis ?te[gy]et/,
  simson: /\bsimson/,
  apollonius: /\bapollon\w*/,
} as const;

/** Bu cümle başka bir ailenin işi (dönüşüm, silme, gizleme, taşıma…): aile 0 döndürmeli. */
export const yabanciFiil = (c: Clause): boolean => foreignVerb(c);

/** Teorem / bağıntı gösterme isteği: "bağıntılarını göster", "teoremini yaz", "doğrula", "uygula", "açıkla". */
export const BAGINTI_ISTEGI = /\b(?:baginti|teorem|kural|formul|esitlik|ozellik|ozdeslik|iliski)\w*|\b(?:dogrula|uygula|acikla|kanitla|ispatla|gosterelim)\w*/;

/** Cümledeki adlar (inşa ailesinin Ref modeli). */
export const adlar = (c: Clause): Ref[] => refsOf(c);

/** Cümlenin gösterdiği üçgen; yoksa anlaşılır hatayla reddeder. */
export function ucgenGerekli(c: Clause, scene: CommandScene, refs: Ref[] = refsOf(c), ipucu = '“ABC üçgeninde …” diye yazın ya da önce bir üçgen çizin.'): Triangle {
  const tri = triangleOf(c, scene, refs);
  if (!tri) fail(`Hangi üçgen için olduğunu yazın: ${ipucu}`);
  return tri;
}

export type UcgenNoktalari = [PointObject, PointObject, PointObject];
export const ucgenNoktalari = (scene: CommandScene, tri: Triangle): UcgenNoktalari => tri.ids.map(id => scene.point(id)) as UcgenNoktalari;

export const uzaklik = (p: Point2D, q: Point2D) => Math.hypot(p.x - q.x, p.y - q.y);
export const kenarAdi = (a: PointObject, b: PointObject) => `${a.label}${b.label}`;
/** |AB| = 5 br biçiminde uzunluk yazımı (MEB yazımı; panel ve ses katmanı bu kalıbı tanır). */
export const uzunlukYazisi = (a: PointObject, b: PointObject, deger = uzaklik(a, b)) => `|${a.label}${b.label}| = ${trNum(deger)} br`;
/** Üç köşeden açı (derece). */
export function aciDerece(p: Point2D, kose: Point2D, q: Point2D): number {
  const u = { x: p.x - kose.x, y: p.y - kose.y }, v = { x: q.x - kose.x, y: q.y - kose.y };
  const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
}
export const yaklasik = (x: number, y: number, tol = 1e-6) => Math.abs(x - y) <= tol * Math.max(1, Math.abs(x), Math.abs(y));

/** Dik açının köşesi (0, 1 ya da 2); üçgen dik değilse undefined. Tolerans: 0,05°. */
export function dikKose(pts: UcgenNoktalari, tolDerece = 0.05): 0 | 1 | 2 | undefined {
  for (const i of [0, 1, 2] as const) {
    const [p, q] = [pts[(i + 1) % 3], pts[(i + 2) % 3]];
    if (Math.abs(aciDerece(p, pts[i], q) - 90) <= tolDerece) return i;
  }
  return undefined;
}

/** Üçgenin köşesinin adıyla ("A köşesinde", "B'den") gösterilen köşenin sırası. */
export function koseSirasi(scene: CommandScene, tri: Triangle, ad: string): 0 | 1 | 2 | undefined {
  const key = ad.toLocaleUpperCase('tr');
  const i = tri.ids.findIndex(id => scene.point(id).label.toLocaleUpperCase('tr') === key);
  return i < 0 ? undefined : (i as 0 | 1 | 2);
}

/**
 * Kullanıcının yeni şekil için yazdığı köşe adları: "DEF Öklid üçgeni" → ["D","E","F"]. Yalnız sahnede hiç
 * karşılığı olmayan, büyük harflerden oluşan etiketler alınır; yoksa undefined (sıradaki adlar kullanılır).
 */
export function istenenKoseAdlari(c: Clause, scene: CommandScene, adet: number): string[] | undefined {
  for (const ref of c.labels) {
    const text = ref.text.replace(/[[\]|]/g, '');
    if (!/^[A-ZÇĞİÖŞÜ]+$/.test(text) || text.length !== adet) continue;
    if (scene.resolveLabel(ref).length || scene.pointsFromLabel(text)) continue;
    const parts = text.split('');
    if (new Set(parts).size !== parts.length) continue;
    if (parts.some(p => scene.findPoint(p))) continue;
    return parts;
  }
  return undefined;
}

export interface YerlesimSecenekleri {
  /** Köşe adları; verilmezse ya da bir ad doluysa sıradaki boş adlar kullanılır */
  adlar?: string[];
  /** Nokta rengi */
  renk?: string;
  /** Yerleşim ızgarası (varsayılan 0,5 br). 0: yuvarlama yok. */
  izgara?: number;
}

/**
 * Yerel koordinatlı bir şekli çizimde boş bir yere koyar ve köşe noktalarını oluşturur.
 * Yerel şekil, kendi sınır kutusunun merkezi placeShape'in verdiği konuma gelecek biçimde taşınır; taşıma
 * ızgaraya yuvarlanır ki köşeler "güzel" sayılarda dursun. Döndürülen noktalar yerel dizinin sırasındadır.
 */
export function sekilYerlestir(scene: CommandScene, yerel: Point2D[], o: YerlesimSecenekleri = {}): PointObject[] {
  if (yerel.length < 2) fail('Şekil için en az iki nokta gerekir.');
  const xs = yerel.map(p => p.x), ys = yerel.map(p => p.y);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const hedef = scene.placeShape(w, h);
  const grid = o.izgara ?? 0.5;
  const yuvarla = (v: number) => grid > 0 ? Math.round(v / grid) * grid : v;
  const dx = yuvarla(hedef.x - (Math.min(...xs) + w / 2)), dy = yuvarla(hedef.y - (Math.min(...ys) + h / 2));
  const istenen = o.adlar && o.adlar.length === yerel.length && o.adlar.every(a => !scene.findPoint(a)) ? o.adlar : undefined;
  const bos = istenen ? [] : scene.nextPointLabels(yerel.length);
  return yerel.map((p, i) => scene.addPoint({ x: tidy(p.x + dx), y: tidy(p.y + dy) }, { label: istenen ? istenen[i] : bos[i], color: o.renk ?? COLORS.point }));
}

/** Noktalardan üçgen çokgeni (kenar uzunlukları etiketli). */
export function ucgenCiz(scene: CommandScene, pts: UcgenNoktalari, o: { renk?: string; etiket?: string; kenarEtiketleri?: boolean } = {}): PolygonObject {
  return scene.addPolygon(pts.map(p => p.id), {
    kind: 'triangle', color: o.renk, label: o.etiket, ...(o.kenarEtiketleri === false ? {} : { edgeLabels: [0, 1, 2] }),
  });
}

/** Sayıyı Türkçe yazımla (virgül) döndürür; tam sayıysa basamak yok. */
export const sayi = (n: number, basamak = 2) => trNum(n, basamak);
/** "a²" biçimli kare yazımı: değerin karesi (Türkçe yazım). */
export const kare = (n: number, basamak = 2) => trNum(n * n, basamak);

/** Cümledeki renk, sahnede bu cümlede oluşan (nokta dışı) nesnelere uygulanır. */
export { applyClauseColor as cumleRengiUygula } from '../constructions/common';
export { fail, skip, COLORS, trNum, tidy } from '../../scene';
export type { Triangle, Ref };
