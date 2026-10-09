import type { CircleObject, LineObject, Point2D, PointObject, SegmentObject } from '@/types/math';
import type { CommandHandler } from '../../types';
import type { Clause } from '../../text';
import type { CommandScene } from '../../scene';
import { type Ref, isPointRef, isUnknownRef, joinTr, newPointNames, refPoints, requestedName } from '../constructions/refs';
import { MEASURE_NOUN, focusedPoint } from '../constructions/common';
import { distanceToLine, ensureDirectionLine, ensureFoot, ensurePerpBisector, findConstructed, freeName, helperName } from '../constructions/build';
import { ensureCenter } from '../constructions/points';
import { AD, BAGINTI_ISTEGI, COLORS, PUAN, aciDerece, adlar, cumleRengiUygula, fail, tidy, trNum, uzaklik, yabanciFiil } from './ortak';

/**
 * Çember teoremleri: kiriş ve çap, kesen (kesenler / kirişler / teğet-kesen teoremi), noktanın çembere göre
 * kuvveti, çevre açı ve merkez açı ilişkisi, teğet-kiriş açısı, iki çemberin ortak teğetleri.
 *
 * Hedef çember: cümlede adı geçen ("c1 çemberine", "M merkezli çember") ya da sahnedeki tek / odaktaki çember.
 * Çember üzerindeki yeni noktalar çembere BAĞLI eklenir (onObjectId): sürüklense de çemberin üzerinde kalır.
 * Kesişim, simetri, ayak ve dik doğrultu noktaları canlı inşalardır (construction); kaynak noktalar taşınınca
 * kendileri güncellenir. Yalnızca ortak teğetler statiktir (çemberler taşınınca yeniden çizilmeli).
 */

// ---------------------------------------------------------------------------------------------- yazım yardımcıları

/** Değer iki basamakla tam yazılabiliyorsa "=", yuvarlanıyorsa "≈" (koordinatlar 9 basamağa yuvarlandığı için tolerans 1e-6). */
const yuvarlanir = (v: number) => Math.abs(v - Number(v.toFixed(2))) > 1e-6;
const isaret = (v: number) => yuvarlanir(v) ? '≈' : '=';
const uzunluk = (a: PointObject, b: PointObject, v = uzaklik(a, b)) => `|${a.label}${b.label}| ${isaret(v)} ${trNum(v)} br`;
const aci = (p: PointObject, kose: PointObject, q: PointObject, deger: number) => `m(∠${p.label}${kose.label}${q.label}) ${isaret(deger)} ${trNum(deger)}°`;
const derece = (v: number) => `${trNum(v)}°`;
/** Negatif sayı eksi işaretiyle (U+2212) yazılır. */
const sayi = (v: number) => trNum(v).replace(/^-/, '−');
/** Çarpanlardan biri yuvarlanmışsa sonuç da "≈" ile yazılır. */
const carpim = (x: number, y: number) => `${trNum(x)} × ${trNum(y)} ${yuvarlanir(x) || yuvarlanir(y) || yuvarlanir(x * y) ? '≈' : '='} ${trNum(x * y)}`;

/** Teğet-kiriş ve teğet-kesen: tire ayrı sözcük olarak katlanır ("teget - kiris"). */
const TEGET_KIRIS = /\bte[gy]et(?: ?- ?| )kiris/;
const TEGET_KESEN = /\bte[gy]et(?: ?- ?| )kesen/;
const CAP = /\bcap(?:i|ini|inin|lar|lari|larini)?\b/;
const ORTA_DIKME = /\borta ?dikme/;
const DIKME = /\bdikme|\bdik (?:indir|cek|ciz|dogru)|\bdiklik|\bizdusum/;
const CIZIM = /\b(?:ciz|olustur|kur(?!al)|ekle|koy|indir|cek(?!il)|isaretle|yerlestir|yap(?!istir|i\b))/;
const ORTAK_TEGET = /\bortak te[gy]et/;
/**
 * Sıfat-fiil olarak "kesen": "kenarlarını kesen doğru", "d doğrusunu kesen", "x eksenini kesen nokta", "AB'yi kesen".
 * Belirtme ekli bir sözcüğün ardından gelir; çember anılmıyorsa çemberin keseni değildir ("iki kesen", "bir kesen",
 * "yeni kesen", "ikinci kesen" sayı/sıfat olduğu için dışarıda).
 */
const SIFAT_FIIL_KESEN = /(?:\$\d+(?:yi|yu|i|u|ni|nu)?|\b(?!(?:yeni|ikinci|birinci|ucuncu|gibi|mi|mu|ki)\b)[a-z]{2,}(?:[iu]|l[ae]r[iu])) kesen\b|\bkesen nokta/;

// ---------------------------------------------------------------------------------------------- çember ve noktaları

interface Cember { nesne: CircleObject; merkez: Point2D; r: number }

function geometri(scene: CommandScene, nesne: CircleObject): Cember {
  const g = scene.circleOf(nesne);
  if (!g || !(g.radius > 0)) fail(`${nesne.label} çemberinin yarıçapı sıfır; önce çemberi düzeltin.`);
  return { nesne, merkez: g.center, r: g.radius };
}

/** Cümlede adıyla geçen çember ("c1 çemberine", "M merkezli çembere"); yoksa odaktaki / sahnedeki tek çember. */
function hedefCember(c: Clause, scene: CommandScene, refs: Ref[]): Cember {
  const adli: CircleObject[] = [];
  for (const r of refs) {
    if (!r.label) continue;
    if (r.role === 'li' && isPointRef(scene, r)) {
      const merkez = refPoints(scene, r)![0];
      adli.push(...scene.ofType('circle').filter(o => o.centerPointId === merkez.id));
      continue;
    }
    if (r.noun === 'circle' || !scene.pointsFromLabel(r.label.text)) adli.push(...scene.ofType('circle').filter(o => scene.resolveLabel(r.label!, ['circle']).includes(o)));
  }
  const tekil = [...new Set(adli)];
  if (tekil.length > 1) fail(`Birden fazla çember eşleşti (${joinTr(tekil.map(o => o.label))}). Hangisi olduğunu belirtin.`);
  if (tekil.length === 1) return geometri(scene, tekil[0]);
  if (!scene.ofType('circle').length) fail('Önce bir çember çizin (ör. “yarıçapı 3 olan çember çiz”).');
  return geometri(scene, scene.target(c, { types: ['circle'], noun: 'çember', labels: [] }) as CircleObject);
}

const uzerinde = (cem: Cember, p: Point2D) => Math.abs(uzaklik(p, cem.merkez) - cem.r) <= 1e-6 * Math.max(1, cem.r);
const disinda = (cem: Cember, p: Point2D) => uzaklik(p, cem.merkez) > cem.r + 1e-6 * Math.max(1, cem.r);
const icinde = (cem: Cember, p: Point2D) => uzaklik(p, cem.merkez) < cem.r - 1e-6 * Math.max(1, cem.r);

/** Çemberin merkez noktası; üç noktadan geçen çemberde canlı çevrel merkez oluşturulur. */
function merkezNoktasi(scene: CommandScene, cem: Cember): PointObject {
  if (cem.nesne.throughPointIds?.length === 3) {
    const ids = cem.nesne.throughPointIds as [string, string, string];
    return ensureCenter(scene, ids, 'circumcenter', freeName(scene, 'M')).point;
  }
  return scene.point(cem.nesne.centerPointId);
}

/** Çember üzerinde duran var olan noktalar (merkez hariç). */
function uzerindekiler(scene: CommandScene, cem: Cember): PointObject[] {
  return scene.points().filter(p => p.id !== cem.nesne.centerPointId && uzerinde(cem, p));
}

const derecesi = (cem: Cember, p: Point2D) => Math.atan2(p.y - cem.merkez.y, p.x - cem.merkez.x) * 180 / Math.PI;
const konum = (cem: Cember, derece: number): Point2D => ({ x: cem.merkez.x + cem.r * Math.cos(derece * Math.PI / 180), y: cem.merkez.y + cem.r * Math.sin(derece * Math.PI / 180) });

/** Tercih edilen açılardan, üzerinde başka nokta bulunmayan ilki (hepsi doluysa 17°'lik adımlarla boş yer). */
function bosDerece(scene: CommandScene, cem: Cember, tercihler: number[]): number {
  const dolu = uzerindekiler(scene, cem).map(p => derecesi(cem, p));
  const fark = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
  const bos = (d: number) => dolu.every(x => fark(x, d) > 8);
  for (const d of tercihler) if (bos(d)) return d;
  for (let d = tercihler[0] + 17; d < tercihler[0] + 360; d += 17) if (bos(d)) return d;
  return tercihler[0];
}

/** Çembere bağlı yeni nokta (sürüklense de çember üzerinde kalır). */
function cemberNoktasi(scene: CommandScene, cem: Cember, derece: number, ad?: string): PointObject {
  return scene.addPoint(konum(cem, derece), { label: ad, onObjectId: cem.nesne.id, color: COLORS.point });
}

/** Kiriş / çevre açı ucu olarak yazılan nokta çember üzerinde olmalı (merkez olamaz). */
function cemberUstundeOlmali(cem: Cember, p: PointObject) {
  if (p.id === cem.nesne.centerPointId) fail(`${p.label} çemberin merkezi; çember üzerinde bir nokta yazın (ör. “çembere bir kiriş çiz”).`);
  if (!uzerinde(cem, p)) fail(`${p.label} noktası çemberin üzerinde değil. Çember üzerinde bir nokta için “çemberin üzerine ${p.label === 'P' ? 'Q' : 'P'} noktası koy” yazın ya da yeni adlar kullanın.`);
}

/** Verilen sayıda noktayı gösteren ad mı? ("AB" → 2: sahnedeki A, B ya da yeni iki harf) */
const adetliAd = (scene: CommandScene, r: Ref, adet: number) => !!r.label && !r.label.lowercase && r.role !== 'li' && r.noun !== 'circle'
  && (scene.pointsFromLabel(r.label.text)?.length === adet || scene.splitNewLabels(r.label.text)?.length === adet);

/** Cümledeki adın gösterdiği, çember üzerinde olması gereken noktalar: "AB kirişi" → [A, B]; eksikler yeni oluşturulur. */
function adliNoktalar(c: Clause, scene: CommandScene, cem: Cember, refs: Ref[], adet: number, dereceler: number[]): PointObject[] | null {
  const ref = refs.find(r => adetliAd(scene, r, adet));
  if (!ref) return null;
  const metin = ref.label!.text;
  const var_ = scene.pointsFromLabel(metin);
  const adlar_ = var_ ? var_.map(p => p.label) : scene.splitNewLabels(metin)!;
  const sonuc: PointObject[] = [];
  adlar_.forEach((ad, i) => {
    const p = scene.findPoint(ad);
    if (p) {
      cemberUstundeOlmali(cem, p);
      sonuc.push(p);
    } else sonuc.push(cemberNoktasi(scene, cem, bosDerece(scene, cem, dereceler.slice(i)), ad));
  });
  if (new Set(sonuc.map(p => p.id)).size !== adet) fail('Noktalar birbirinden farklı olmalı.');
  return sonuc;
}

/** Her iki ucu çember üzerinde olan doğru parçaları (kirişler). */
function kirisler(scene: CommandScene, cem: Cember): SegmentObject[] {
  return scene.ofType('segment').filter(s => {
    const a = scene.get(s.startPointId), b = scene.get(s.endPointId);
    return a?.type === 'point' && b?.type === 'point' && uzerinde(cem, a) && uzerinde(cem, b);
  });
}

interface Kiris { a: PointObject; b: PointObject; yeni: boolean }

/** Cümlede iki harfli adla yazılan kirişler ("AB kirişi", "AB ve CD kirişleri"); eksik uçlar yeni oluşturulur. */
function adliKirisler(c: Clause, scene: CommandScene, cem: Cember, refs: Ref[]): Kiris[] {
  return refs.filter(r => adetliAd(scene, r, 2)).map(r => {
    const [a, b] = adliNoktalar(c, scene, cem, [r], 2, [150, 30])!;
    return { a, b, yeni: !scene.shapesWithPoints([a.id, b.id], ['segment']).length };
  });
}

/** "A'dan geçen kiriş", "A noktasından kiriş çiz": bir ucu A olan yeni kiriş (A çember üzerinde olmalı). */
function ucluKiris(scene: CommandScene, cem: Cember, refs: Ref[]): Kiris | null {
  const ref = refs.find(r => r.label && !r.label.lowercase && r.role !== 'li' && r.noun !== 'circle' && isPointRef(scene, r) && refPoints(scene, r)?.length === 1);
  if (!ref) return null;
  const a = refPoints(scene, ref)![0];
  cemberUstundeOlmali(cem, a);
  const yon = derecesi(cem, a);
  const b = cemberNoktasi(scene, cem, bosDerece(scene, cem, [yon + 120, yon + 100, yon + 140]), newPointNames(scene, refs)[0]);
  return { a, b, yeni: true };
}

/** Yeni kiriş: iki yeni, çembere bağlı nokta (tercihen 150° ve 30°; dolu yerler atlanır). */
function yeniKiris(scene: CommandScene, cem: Cember, adlar_: string[] = [], kayma = 0): Kiris {
  const a = cemberNoktasi(scene, cem, bosDerece(scene, cem, [150 + kayma, 30 + kayma]), adlar_[0]);
  const b = cemberNoktasi(scene, cem, bosDerece(scene, cem, [30 + kayma, 150 + kayma]), adlar_[1]);
  return { a, b, yeni: true };
}

/** Cümlede geçen ya da sahnede tek olan kiriş (orta dikme / dikme için); yoksa yeni kiriş. */
function kirisBul(c: Clause, scene: CommandScene, cem: Cember, refs: Ref[]): Kiris {
  const adli = adliKirisler(c, scene, cem, refs)[0] ?? ucluKiris(scene, cem, refs);
  if (adli) return adli;
  let mevcut = kirisler(scene, cem);
  if (mevcut.length > 1) {
    const odak = mevcut.filter(s => scene.focus.includes(s.id) || scene.selection.includes(s.id));
    if (odak.length === 1) mevcut = odak;
    else fail(`Birden fazla kiriş var (${joinTr(mevcut.slice(0, 4).map(s => s.label))}). Hangisi olduğunu yazın (ör. “AB kirişinin orta dikmesini çiz”).`);
  }
  if (mevcut.length === 1) return { a: scene.point(mevcut[0].startPointId), b: scene.point(mevcut[0].endPointId), yeni: false };
  return yeniKiris(scene, cem);
}

/** Çember üzerindeki A'nın merkeze göre simetriği: canlı çap ucu. */
function capUcu(scene: CommandScene, cem: Cember, merkez: PointObject, a: PointObject, ad?: string): PointObject {
  const mevcut = findConstructed(scene, 'reflect', r => r.sourceId === a.id && r.centerId === merkez.id);
  if (mevcut) return mevcut;
  return scene.addPoint({ x: 2 * cem.merkez.x - a.x, y: 2 * cem.merkez.y - a.y }, {
    label: ad, color: COLORS.point, construction: { kind: 'reflect', sourceId: a.id, centerId: merkez.id },
  });
}

// ---------------------------------------------------------------------------------------------- 1) kiriş ve çap

export const kiris: CommandHandler = {
  id: 'teoremler.kiris',
  examples: [
    'AB kirişini çiz',
    'çembere bir kiriş çiz',
    'c1 çemberine kiriş çiz',
    'M merkezli çembere kiriş çiz',
    'çemberin çapını çiz',
    'AB çapını çiz',
    'kirişin orta dikmesini çiz',
    'merkezden kirişe dikme indir',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.hasVerb('create')) return 0;
    if (c.has(AD.kesen) || c.has(AD.kuvvet) || c.has(AD.cevreAci) || c.has(/\bte[gy]et/) || c.has(BAGINTI_ISTEGI)) return 0;
    if (c.has(MEASURE_NOUN) && !c.has(CIZIM)) return 0;
    if (c.has(AD.kiris)) return PUAN.sekil;
    // "AB çapını çiz", "çemberin çapını çiz". Çember OLUŞTURAN cümleler ("çapı 8 olan çember", "AB çaplı çember",
    // "[AB]'yi çap olarak alan çember", "AB yi çap kabul eden çember") çember ailesinindir: çap belirtme/iyelik ekiyle
    // yazılmalı ve çember sözcüğü yalnız tamlayan olarak ("çemberin çapı") geçmeli.
    if (!c.has(/\bcap(?:i|ini)\b/) || c.numbers.length || c.has(/\bolan\b|\bolarak\b|\bkabul\b|\bcapli\b/)) return 0;
    if (c.has(/\b(?:cember|daire)/) && !c.has(/\b(?:cember|daire)\w*(?:in|nin|nun)\s+cap/)) return 0;
    return PUAN.sekil;
  },
  run(c, scene) {
    const refs = adlar(c);
    const cem = hedefCember(c, scene, refs);
    const odak: string[] = [];

    if (c.has(ORTA_DIKME)) {
      const { a, b } = kirisBul(c, scene, cem, refs);
      const merkez = merkezNoktasi(scene, cem);
      const parca = scene.addSegment(a.id, b.id, { showLength: true });
      const { object: dikme, mid } = ensurePerpBisector(scene, a.id, b.id);
      const uzak = uzaklik(merkez, mid);
      scene.say(`[${a.label}${b.label}] kirişinin orta dikmesi çizildi. Orta dikme merkezden geçer: orta nokta ${mid.label} için |${merkez.label}${mid.label}| ${isaret(uzak)} ${trNum(uzak)} br (merkezin kirişe uzaklığı).`);
      odak.push(parca.id, dikme.id);
    } else if (c.has(DIKME)) {
      // "merkezden kirişe dikme indir", "AB kirişine dikme indir" (kaynak: merkez), "P'den AB kirişine dikme indir" (kaynak: P)
      const kaynakRef = refs.find(r => r.label && r.role === 'from' && r.noun !== 'circle' && isPointRef(scene, r) && !uzerinde(cem, refPoints(scene, r)![0]));
      const { a, b } = kirisBul(c, scene, cem, refs.filter(r => r !== kaynakRef));
      const merkez = merkezNoktasi(scene, cem);
      const kaynak = kaynakRef ? refPoints(scene, kaynakRef)![0] : merkez;
      const parca = scene.addSegment(a.id, b.id, { showLength: true });
      const istenen = requestedName(c)?.text;
      const ad = istenen && !scene.findPoint(istenen) ? istenen : freeName(scene, 'H');
      const ayak = ensureFoot(scene, kaynak.id, [a.id, b.id], { name: ad }).object;
      const dikme = scene.addSegment(kaynak.id, ayak.id, { showLength: true, color: COLORS.construction });
      scene.say(kaynak.id === merkez.id
        ? `Merkez ${merkez.label}'den [${a.label}${b.label}] kirişine indirilen dikmenin ayağı ${ayak.label} kirişi ortalar: ${uzunluk(a, ayak)} ve ${uzunluk(ayak, b)}. ${uzunluk(merkez, ayak)}.`
        : `${kaynak.label} noktasından [${a.label}${b.label}] kirişine indirilen dikmenin ayağı ${ayak.label}: ${uzunluk(kaynak, ayak)}. Kirişi yalnızca merkezden inen dikme ortalar (${uzunluk(a, ayak)}, ${uzunluk(ayak, b)}).`);
      odak.push(parca.id, dikme.id, ayak.id);
    } else if (c.has(CAP) && !c.has(AD.kiris)) {
      const merkez = merkezNoktasi(scene, cem);
      const ref = refs.find(r => r.label && !r.label.lowercase && r.role !== 'li' && r.noun !== 'circle' && scene.splitNewLabels(r.label.text)?.length === 2);
      let a: PointObject, b: PointObject;
      if (ref) {
        const [adA, adB] = scene.splitNewLabels(ref.label!.text)!;
        const varA = scene.findPoint(adA), varB = scene.findPoint(adB);
        const kontrol = (p: PointObject) => {
          if (p.id === merkez.id) fail(`${p.label} çemberin merkezi; çapın uçları çember üzerinde olmalı.`);
          if (!uzerinde(cem, p)) fail(`${p.label} noktası çemberin üzerinde değil; çapın uçları çember üzerinde olmalı.`);
        };
        if (varA && varB) {
          kontrol(varA); kontrol(varB);
          if (!(uzaklik(varA, { x: 2 * cem.merkez.x - varB.x, y: 2 * cem.merkez.y - varB.y }) <= 1e-6 * Math.max(1, cem.r))) {
            fail(`${adA}${adB} bir çap değil: çap merkezden geçer, ${adB} noktası ${adA}'nın merkeze göre simetriği olmalı.`);
          }
          [a, b] = [varA, varB];
        } else if (varA || varB) {
          const kaynak = varA ?? varB!;
          kontrol(kaynak);
          a = kaynak;
          b = capUcu(scene, cem, merkez, kaynak, varA ? adB : adA);
        } else {
          a = cemberNoktasi(scene, cem, bosDerece(scene, cem, [150, 30]), adA);
          b = capUcu(scene, cem, merkez, a, adB);
        }
      } else {
        const ustte = uzerindekiler(scene, cem);
        a = ustte.length === 1 ? ustte[0] : cemberNoktasi(scene, cem, bosDerece(scene, cem, [150, 30]));
        b = capUcu(scene, cem, merkez, a);
      }
      const parca = scene.addSegment(a.id, b.id, { showLength: true });
      scene.say(`${a.label}${b.label} çapı çizildi: ${uzunluk(a, b)} (2r). Çap merkezden geçen en uzun kiriştir; ${b.label} noktası ${a.label} ile birlikte hareket eder.`);
      odak.push(parca.id);
    } else {
      // "AB kirişini çiz", "AB ve CD kirişlerini çiz", "A'dan geçen kiriş çiz", "çembere (bir / üç) kiriş çiz": adsız istek her zaman yeni kiriş kurar
      const kac = c.match(/#(\d+) (?:tane |adet )?kiris/);
      const adet = kac ? c.num(`#${kac[1]}`) : 1;
      if (!(Number.isInteger(adet) && adet >= 1 && adet <= 6)) fail('Tek seferde en fazla altı kiriş çizilir (ör. “çembere üç kiriş çiz”).');
      let liste = adliKirisler(c, scene, cem, refs);
      const uclu = liste.length ? null : ucluKiris(scene, cem, refs);
      if (uclu) liste = [uclu];
      if (!liste.length) {
        const adlar_ = newPointNames(scene, refs);
        for (let i = 0; i < adet; i++) liste.push(yeniKiris(scene, cem, adlar_.splice(0, 2), i * 360 / adet));
      }
      const parcalar = liste.map(k => scene.addSegment(k.a.id, k.b.id, { showLength: true }));
      const ad = (k: Kiris) => `${k.a.label}${k.b.label}`;
      if (liste.length === 1) {
        const [k] = liste;
        scene.say(`${ad(k)} kirişi ${k.yeni ? 'çizildi' : 'zaten vardı'}: ${uzunluk(k.a, k.b)}. En uzun kiriş çaptır (2r = ${trNum(2 * cem.r)} br).`);
      } else {
        scene.say(`${joinTr(liste.map(ad))} kirişleri çizildi: ${liste.map(k => uzunluk(k.a, k.b)).join(', ')}. En uzun kiriş çaptır (2r = ${trNum(2 * cem.r)} br).`);
      }
      odak.push(...parcalar.map(s => s.id));
    }
    cumleRengiUygula(c, scene);
    scene.setFocus(odak);
  },
};

// ---------------------------------------------------------------------------------------------- 2) kesen ve teoremleri

/** Cümledeki tek nokta adı ("P noktasından", "P'nin"); sahnede yoksa verilen konumda yeni oluşturulur. */
function dayanakNoktasi(c: Clause, scene: CommandScene, cem: Cember, refs: Ref[], varsayilan: () => Point2D, kosul: (p: Point2D) => boolean, aciklama: string): PointObject {
  const tekli = refs.filter(r => r.label && r.role !== 'li' && r.noun !== 'circle' && (isPointRef(scene, r) || (isUnknownRef(scene, r) && /^[A-ZÇĞİÖŞÜ](?:_?\d+)?'*$/u.test(r.label.text))));
  const adli = tekli.find(r => isPointRef(scene, r) && r.kind === 'label');
  let p: PointObject | undefined = adli ? refPoints(scene, adli)![0] : undefined;
  if (!p) {
    const yeniAd = newPointNames(scene, tekli)[0];
    if (!yeniAd) {
      const odak = focusedPoint(scene);
      if (odak && odak.id !== cem.nesne.centerPointId && kosul(odak)) p = odak;
      else {
        const adaylar = scene.points().filter(q => q.id !== cem.nesne.centerPointId && kosul(q) && !uzerinde(cem, q) && !q.onObjectId && !q.construction);
        if (adaylar.length === 1) p = adaylar[0];
        else if (adaylar.length > 1) fail(`Birden fazla ${aciklama} nokta var (${joinTr(adaylar.slice(0, 4).map(q => q.label))}). Hangisi olduğunu yazın (ör. “${adaylar[0].label} noktasından çembere kesen çiz”).`);
      }
    }
    if (!p) p = scene.addPoint(varsayilan(), { label: yeniAd ?? freeName(scene, 'P'), color: COLORS.point });
  }
  if (p.id === cem.nesne.centerPointId) fail(`${p.label} çemberin merkezi; ${aciklama} bir nokta yazın.`);
  if (!kosul(p)) {
    if (uzerinde(cem, p)) fail(`${p.label} noktası çemberin üzerinde; ${aciklama} bir nokta gerekir (ör. “P (5; 0) noktası oluştur”).`);
    fail(disinda(cem, p)
      ? `${p.label} noktası çemberin dışında. Kirişler teoremi için çemberin içinde bir nokta gerekir; dış nokta için “kesen teoremini göster” yazın.`
      : `${p.label} noktası çemberin içinde. Kesen için çemberin dışında bir nokta gerekir; iç nokta için “kiriş teoremini göster” yazın.`);
  }
  return p;
}

/** Boş bir dış konum: çemberin sağında, çemberden 2r uzakta (doluysa başka yönde). */
function disKonum(scene: CommandScene, cem: Cember): Point2D {
  for (const d of [0, 45, -45, 90, -90, 135, -135, 180]) {
    const p = { x: tidy(cem.merkez.x + 3 * cem.r * Math.cos(d * Math.PI / 180)), y: tidy(cem.merkez.y + 3 * cem.r * Math.sin(d * Math.PI / 180)) };
    if (!scene.points().some(q => uzaklik(q, p) < 0.5)) return p;
  }
  return { x: tidy(cem.merkez.x + 3 * cem.r), y: tidy(cem.merkez.y) };
}
const icKonum = (scene: CommandScene, cem: Cember): Point2D => {
  for (const [kx, ky] of [[0.5, 0.25], [-0.5, 0.25], [0.3, -0.4], [-0.3, -0.4], [0.6, 0]]) {
    const p = { x: tidy(cem.merkez.x + kx * cem.r), y: tidy(cem.merkez.y + ky * cem.r) };
    if (!scene.points().some(q => uzaklik(q, p) < 0.3)) return p;
  }
  return { x: tidy(cem.merkez.x + cem.r / 2), y: tidy(cem.merkez.y + cem.r / 4) };
};

interface Kesen { dogru: LineObject; yakin: PointObject; uzak: PointObject }

/**
 * P'den geçen kesen: A çember üzerinde (bağlı, sürüklenebilir), doğru PA, B = doğrunun çemberi kestiği diğer nokta.
 * B canlıdır: kirişin orta noktası merkezin doğruya dik izdüşümü (gizli ayak) olduğundan B, A'nın bu ayağa göre
 * simetriğidir. Kesişim sırasına bağlı olmadığı için P ya da A nereye sürüklenirse sürüklensin doğru kalır
 * (kesişim index'i ile kurulsaydı P doğrunun öbür yanına geçince B, A'nın üstüne binerdi).
 * yakın/uzak: P'ye yakın ve uzak kesişim noktaları.
 */
function kesenKur(scene: CommandScene, cem: Cember, merkez: PointObject, p: PointObject, derece: number, adlar_: string[]): Kesen {
  const a = cemberNoktasi(scene, cem, bosDerece(scene, cem, [derece, derece + 20, derece - 20]), adlar_[0]);
  const dogru = scene.addLine(p.id, a.id, { label: `Kesen: ${p.label}${a.label}`, color: COLORS.construction, showEquation: false, reuse: false });
  const ayak = ensureFoot(scene, merkez.id, [p.id, a.id], { hidden: true }).object;
  const b = scene.addPoint(a, { label: adlar_[1], color: COLORS.intersection, construction: { kind: 'reflect', sourceId: a.id, centerId: ayak.id } });
  if (uzaklik(a, b) <= 1e-6) fail('Kesen kurulamadı: doğru çembere teğet çıktı. Noktayı biraz taşıyıp yeniden deneyin.');
  return uzaklik(p, a) <= uzaklik(p, b) ? { dogru, yakin: a, uzak: b } : { dogru, yakin: b, uzak: a };
}

/** P'den geçen, çemberi (üzerindeki iki noktayla) kesen var olan doğrular: kesenler ya da kirişlerin doğruları. */
function mevcutKesenler(scene: CommandScene, cem: Cember, p: PointObject): Kesen[] {
  const sonuc: Kesen[] = [];
  for (const dogru of scene.ofType('line')) {
    if (dogru.point1Id !== p.id && dogru.point2Id !== p.id) continue;
    const [d1, d2] = scene.lineOf(dogru)!;
    const uclar = scene.points().filter(q => q.id !== p.id && uzerinde(cem, q) && distanceToLine(q, d1, d2) <= 1e-7);
    if (uclar.length !== 2 || uzaklik(uclar[0], uclar[1]) <= 1e-6) continue;
    const [u, v] = uclar;
    sonuc.push(uzaklik(p, u) <= uzaklik(p, v) ? { dogru, yakin: u, uzak: v } : { dogru, yakin: v, uzak: u });
  }
  return sonuc;
}

/** Noktanın çembere göre kuvveti: |PM|² − r². */
const kuvvetDegeri = (cem: Cember, p: Point2D) => uzaklik(p, cem.merkez) ** 2 - cem.r ** 2;

export const kesen: CommandHandler = {
  id: 'teoremler.kesen',
  examples: [
    'P noktasından çembere kesen çiz',
    "P'den iki kesen çiz",
    'çembere kesen çiz',
    'kesen teoremini göster',
    'kesenler teoremini göster',
    'kiriş teoremini göster',
    'kirişler teoremini göster',
    'teğet-kesen teoremini göster',
  ],
  match(c) {
    if (yabanciFiil(c) || c.has(AD.tales) || c.has(/\bparalel/) || c.has(ORTAK_TEGET)) return 0;
    const teorem = c.has(BAGINTI_ISTEGI);
    if (teorem && (c.has(AD.kiris) || c.has(TEGET_KESEN) || c.has(AD.kesen))) {
      // "çevre açı teoremi", "kuvvet teoremi", "teğet-kiriş açısı teoremi" başka işleyicilerin.
      if (c.has(AD.cevreAci) || c.has(AD.kuvvet) || c.has(TEGET_KIRIS)) return 0;
      return PUAN.sekil;
    }
    if (!c.has(AD.kesen) || c.has(/\bdik(?:ey)? kesen|\bortadan kesen/)) return 0;
    if (c.has(MEASURE_NOUN) && !c.has(CIZIM)) return 0;
    // "AB'yi kesen doğru çiz", "kenarlarını kesen doğru", "x eksenini kesen nokta": çember anılmıyorsa çemberin keseni değil.
    if (c.has(SIFAT_FIIL_KESEN) && !c.has(/\bcember|\bdaire/)) return 0;
    return PUAN.sekil;
  },
  run(c, scene) {
    const refs = adlar(c);
    const cem = hedefCember(c, scene, refs);
    const merkez = merkezNoktasi(scene, cem);
    const teorem = c.has(BAGINTI_ISTEGI);
    const kirisTeoremi = teorem && c.has(AD.kiris) && !c.has(AD.kesen) && !c.has(TEGET_KESEN);
    const tegetKesen = teorem && c.has(TEGET_KESEN);
    const kacKesen = c.match(/#(\d+) (?:tane |adet )?kesen/);
    const adet = kirisTeoremi || tegetKesen || (teorem && !kacKesen) ? 2 : kacKesen ? c.num(`#${kacKesen[1]}`) : c.has(/\bkesenler/) ? 2 : 1;
    if (!(adet === 1 || adet === 2)) fail('Bir noktadan en fazla iki kesen çizilir (ör. “P’den iki kesen çiz”).');
    const p = kirisTeoremi
      ? dayanakNoktasi(c, scene, cem, refs, () => icKonum(scene, cem), q => icinde(cem, q), 'çemberin içinde')
      : dayanakNoktasi(c, scene, cem, refs, () => disKonum(scene, cem), q => disinda(cem, q), 'çemberin dışında');
    const yon = derecesi(cem, p);
    const yeniAdlar = newPointNames(scene, refs).filter(ad => ad !== p.label);
    const mevcut = teorem ? mevcutKesenler(scene, cem, p) : [];
    const kesenler: Kesen[] = [...mevcut];
    const tercih = kirisTeoremi ? [yon + 135, yon + 45] : [yon + 150, yon - 150];
    const odak: string[] = [];
    while (kesenler.length < adet) {
      const k = kesenKur(scene, cem, merkez, p, tercih[kesenler.length % 2], yeniAdlar.splice(0, 2));
      kesenler.push(k);
    }
    const kullanilan = kesenler.slice(0, adet);
    const parcalar: string[] = [];
    for (const k of kullanilan) {
      odak.push(k.dogru.id);
      if (kirisTeoremi) {
        parcalar.push(scene.addSegment(p.id, k.yakin.id, { showLength: true }).id, scene.addSegment(p.id, k.uzak.id, { showLength: true }).id);
      } else {
        parcalar.push(scene.addSegment(p.id, k.yakin.id, { showLength: true }).id, scene.addSegment(k.yakin.id, k.uzak.id, { showLength: true }).id);
      }
    }
    odak.push(...parcalar);
    const kuvvet = Math.abs(kuvvetDegeri(cem, p));
    const carp = (k: Kesen) => `|${p.label}${k.yakin.label}| × |${p.label}${k.uzak.label}|`;
    const sayilar = (k: Kesen) => carpim(uzaklik(p, k.yakin), uzaklik(p, k.uzak));

    if (tegetKesen) {
      let t = scene.points().find(q => q.construction?.kind === 'tangent' && q.construction.circleId === cem.nesne.id && q.construction.sourceId === p.id && !q.construction.direction);
      t ??= scene.addPoint(p, { label: yeniAdlar.shift() ?? freeName(scene, 'T'), color: COLORS.construction, construction: { kind: 'tangent', circleId: cem.nesne.id, sourceId: p.id, branch: 1 } });
      const tegetDogru = scene.addLine(p.id, t.id, { label: `Teğet: ${p.label}${t.label}`, color: COLORS.construction, showEquation: false });
      const tegetParca = scene.addSegment(p.id, t.id, { showLength: true });
      const [k] = kullanilan;
      const pt = uzaklik(p, t);
      scene.say(`Teğet-kesen teoremi: |${p.label}${t.label}|² = ${carp(k)} (${trNum(pt)}² ${isaret(pt * pt)} ${trNum(pt * pt)}; ${sayilar(k)}). Bu değer ${p.label} noktasının çembere göre kuvvetidir: |${p.label}${merkez.label}|² − r² = ${trNum(kuvvet)}.`);
      odak.push(tegetDogru.id, tegetParca.id);
    } else if (teorem) {
      const [k1, k2] = kullanilan;
      scene.say(kirisTeoremi
        ? `Kirişler teoremi: ${carp(k1)} = ${carp(k2)} (${sayilar(k1)}; ${sayilar(k2)}). ${p.label} içeride olduğu için bu çarpım, kuvvetin mutlak değeridir: r² − |${p.label}${merkez.label}|² = ${trNum(kuvvet)}.`
        : `Kesenler teoremi: ${carp(k1)} = ${carp(k2)} (${sayilar(k1)}; ${sayilar(k2)}). Bu değer ${p.label} noktasının çembere göre kuvvetidir: |${p.label}${merkez.label}|² − r² = ${trNum(kuvvet)}.`);
      scene.say(`${k1.yakin.label} ya da ${k2.yakin.label} noktasını çember üzerinde sürükleseniz de çarpım değişmez.`);
    } else {
      const liste = kullanilan.map(k => `${k.dogru.label} (${k.yakin.label} ve ${k.uzak.label} noktalarında keser; ${sayilar(k)})`);
      scene.say(`${p.label} noktasından ${adet === 1 ? 'kesen çizildi' : 'iki kesen çizildi'}: ${joinTr(liste)}. Her kesende dış parça ile tüm parçanın çarpımı ${trNum(kuvvet)} (noktanın çembere göre kuvveti).`);
    }
    cumleRengiUygula(c, scene);
    scene.setFocus(odak);
  },
};

// ---------------------------------------------------------------------------------------------- 3) noktanın kuvveti

export const kuvvet: CommandHandler = {
  id: 'teoremler.kuvvet',
  examples: [
    'P noktasının çembere göre kuvvetini hesapla',
    "P'nin c1 çemberine göre kuvveti nedir",
    'P noktasının kuvvetini bul',
    'P noktasının çembere göre kuvveti kaçtır',
    'kuvvet teoremini göster',
    'noktanın çembere göre kuvvetini hesapla',
  ],
  match(c) {
    // "kuvvetli çizgi" sıfattır; "2'nin 3. kuvveti" üs almadır (çember anılmadan sayıyla gelen kuvvet bu ailenin değil).
    if (yabanciFiil(c) || !c.has(AD.kuvvet) || c.has(/\bkuvvetl[iu]/)) return 0;
    if (c.numbers.length && !c.has(/\bcember|\bdaire/)) return 0;
    return PUAN.baginti;
  },
  run(c, scene) {
    const refs = adlar(c);
    const cem = hedefCember(c, scene, refs);
    const merkez = merkezNoktasi(scene, cem);
    const p = dayanakNoktasi(c, scene, cem, refs, () => disKonum(scene, cem), () => true, 'çemberin dışında ya da içinde');
    const pm = uzaklik(p, cem.merkez);
    const deger = kuvvetDegeri(cem, p);
    const hesap = `|${p.label}${merkez.label}|² − r² = ${trNum(pm * pm)} − ${trNum(cem.r * cem.r)} = ${sayi(deger)}`;
    const odak: string[] = [p.id];
    if (uzerinde(cem, p)) scene.say(`${p.label} çemberin üzerinde; çembere göre kuvveti ${hesap}. Kuvveti 0 olan noktalar tam olarak çemberin üzerindeki noktalardır.`);
    else if (deger > 0) scene.say(`${p.label} çemberin dışında; çembere göre kuvveti ${hesap}. ${p.label}'den geçen her kesen için |${p.label}A| × |${p.label}B| = ${trNum(deger)}; teğet için |${p.label}T|² = ${trNum(deger)}.`);
    else scene.say(`${p.label} çemberin içinde; çembere göre kuvveti ${hesap} (negatif). ${p.label}'den geçen her kiriş için |${p.label}A| × |${p.label}B| = ${trNum(-deger)}.`);
    if (c.has(BAGINTI_ISTEGI) && !uzerinde(cem, p)) {
      const yon = derecesi(cem, p);
      const k = kesenKur(scene, cem, merkez, p, deger > 0 ? yon + 150 : yon + 135, []);
      const parcalar = [scene.addSegment(p.id, k.yakin.id, { showLength: true }), scene.addSegment(deger > 0 ? k.yakin.id : p.id, k.uzak.id, { showLength: true })];
      scene.say(`Örnek: ${k.dogru.label} doğrusu için |${p.label}${k.yakin.label}| × |${p.label}${k.uzak.label}| ${isaret(uzaklik(p, k.yakin) * uzaklik(p, k.uzak))} ${carpim(uzaklik(p, k.yakin), uzaklik(p, k.uzak))}.`);
      odak.push(k.dogru.id, ...parcalar.map(s => s.id));
    }
    cumleRengiUygula(c, scene);
    scene.setFocus(odak);
  },
};

// ---------------------------------------------------------------------------------------------- 4) çevre açı

/** C'nin gördüğü AB yayının merkez açısı: C büyük yaydaysa küçük yay (≤ 180°), küçük yaydaysa büyük yay (reflex). */
function gorulenYay(cem: Cember, a: PointObject, b: PointObject, tepe: PointObject): { olcu: number; reflex: boolean } {
  const kucuk = aciDerece(a, cem.merkez, b);
  const cevre = aciDerece(a, tepe, b);
  const reflex = Math.abs(cevre - kucuk / 2) > Math.abs(cevre - (180 - kucuk / 2));
  return { olcu: reflex ? 360 - kucuk : kucuk, reflex };
}

/** C ile aynı yayda, C'den 30° ötede boş bir konum. */
function ayniYayda(scene: CommandScene, cem: Cember, a: PointObject, b: PointObject, tepe: PointObject): number {
  const dc = derecesi(cem, tepe);
  const yayUstunde = (d: number) => gorulenYay(cem, a, b, { ...tepe, ...konum(cem, d) }).reflex === gorulenYay(cem, a, b, tepe).reflex;
  const bos = (d: number) => uzerindekiler(scene, cem).every(p => Math.abs((((derecesi(cem, p) - d) % 360) + 540) % 360 - 180) > 8);
  for (const adim of [30, -30, 20, -20, 45, -45, 12, -12]) {
    const d = dc + adim;
    if (yayUstunde(d) && bos(d)) return d;
  }
  fail('Aynı yay üzerinde boş bir yer bulunamadı; noktaları biraz aralayın.');
}

export const cevreAci: CommandHandler = {
  id: 'teoremler.cevreAci',
  examples: [
    'ABC çevre açısını çiz',
    'AB yayını gören çevre açıyı çiz',
    'çevre açı çiz',
    'çevre açı teoremini göster',
    'çevre açı merkez açı ilişkisini göster',
    'çevre açı merkez açının yarısıdır',
    'aynı yayı gören çevre açılar eşittir',
    'AB yayını gören iki çevre açı çiz',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(AD.cevreAci)) return 0;
    // Çapı gören çevre açı (Tales) başka modülde.
    if (c.has(CAP) || c.has(AD.tales)) return 0;
    // "çevre" sözcüğü ölçü adı sayılmasın: "çevre açının ölçüsü kaç" ölçme ailesinindir, "çevre açı çiz" bizim.
    if (MEASURE_NOUN.test(c.text.replace(/\bcevre aci\w*/g, '')) && !c.has(CIZIM) && !c.has(BAGINTI_ISTEGI)) return 0;
    return PUAN.sekil;
  },
  run(c, scene) {
    const refs = adlar(c);
    const cem = hedefCember(c, scene, refs);
    const merkez = merkezNoktasi(scene, cem);
    const iki = c.has(/\bacilar\b|\besit|#\d+ cevre aci/) && !c.has(/\bmerkez/);
    const iliski = c.has(BAGINTI_ISTEGI) || c.has(/\bmerkez aci|\byarisi/);
    let a: PointObject, b: PointObject, tepe: PointObject;
    const uclu = adliNoktalar(c, scene, cem, refs, 3, [200, 90, 340]);
    if (uclu) [a, tepe, b] = uclu;
    else {
      const ikili = adliNoktalar(c, scene, cem, refs, 2, [200, 340]);
      if (ikili) {
        [a, b] = ikili;
        const orta = (derecesi(cem, a) + derecesi(cem, b)) / 2;
        // Büyük yayın ortası: AB'nin orta açısının karşısı (iki aday; merkeze göre A ve B'nin ters tarafı)
        const aday = [orta + 180, orta].map(d => konum(cem, d));
        const buyukYay = aday[Math.hypot(aday[0].x - (a.x + b.x) / 2, aday[0].y - (a.y + b.y) / 2) >= Math.hypot(aday[1].x - (a.x + b.x) / 2, aday[1].y - (a.y + b.y) / 2) ? 0 : 1];
        tepe = cemberNoktasi(scene, cem, bosDerece(scene, cem, [derecesi(cem, buyukYay), derecesi(cem, buyukYay) + 25, derecesi(cem, buyukYay) - 25]), newPointNames(scene, refs).find(ad => ad !== a.label && ad !== b.label));
      } else {
        const adlar_ = newPointNames(scene, refs);
        a = cemberNoktasi(scene, cem, bosDerece(scene, cem, [200, 215, 185]), adlar_[0]);
        b = cemberNoktasi(scene, cem, bosDerece(scene, cem, [340, 325, 355]), adlar_[1]);
        tepe = cemberNoktasi(scene, cem, bosDerece(scene, cem, [90, 70, 110]), adlar_[2]);
      }
    }
    if (tepe.id === merkez.id) fail('Çevre açının tepesi çember üzerinde olmalı, merkez olamaz. Merkez açı için tepesi merkez olan açıyı çizin (ör. “ABC açısını çiz”, B merkez).');
    const odak: string[] = [];
    const kollar = [scene.addSegment(tepe.id, a.id, { showLength: false }), scene.addSegment(tepe.id, b.id, { showLength: false })];
    const cevre = scene.addAngle(a.id, tepe.id, b.id);
    odak.push(...kollar.map(s => s.id), cevre.id);
    const yay = gorulenYay(cem, a, b, tepe);
    const cevreOlcu = aciDerece(a, tepe, b);
    if (iki) {
      const d = cemberNoktasi(scene, cem, ayniYayda(scene, cem, a, b, tepe), newPointNames(scene, refs).find(ad => ![a, b, tepe].some(p => p.label === ad)));
      const kollar2 = [scene.addSegment(d.id, a.id, { showLength: false }), scene.addSegment(d.id, b.id, { showLength: false })];
      const ikinci = scene.addAngle(a.id, d.id, b.id);
      odak.push(...kollar2.map(s => s.id), ikinci.id);
      scene.say(`Aynı ${a.label}${b.label} yayını gören çevre açılar eşittir: ${aci(a, tepe, b, cevreOlcu)} ve ${aci(a, d, b, aciDerece(a, d, b))}. İkisi de ${a.label}${b.label} yayının yarısıdır (${derece(yay.olcu)} / 2).`);
    } else if (iliski) {
      const yaricaplar = [scene.addSegment(merkez.id, a.id, { showLength: false, color: COLORS.construction }), scene.addSegment(merkez.id, b.id, { showLength: false, color: COLORS.construction })];
      const merkezAci = scene.addAngle(a.id, merkez.id, b.id, { reflex: yay.reflex, color: COLORS.construction });
      odak.push(...yaricaplar.map(s => s.id), merkezAci.id);
      scene.say(`Çevre açı, aynı yayı gören merkez açının yarısıdır: m(∠${a.label}${tepe.label}${b.label}) = m(∠${a.label}${merkez.label}${b.label}) / 2 (${derece(cevreOlcu)} = ${derece(yay.olcu)} / 2). ${tepe.label} noktasını aynı yay üzerinde sürükleseniz de açı değişmez.`);
    } else {
      scene.say(`${a.label}${tepe.label}${b.label} çevre açısı çizildi: ${aci(a, tepe, b, cevreOlcu)}. Gördüğü ${a.label}${b.label} yayının ölçüsü ${derece(yay.olcu)}; çevre açı bunun yarısıdır.`);
    }
    cumleRengiUygula(c, scene);
    scene.setFocus(odak);
  },
};

// ---------------------------------------------------------------------------------------------- 5) teğet-kiriş açısı

export const tegetKirisAcisi: CommandHandler = {
  id: 'teoremler.tegetKirisAcisi',
  examples: [
    'teğet-kiriş açısını göster',
    'teğet-kiriş açısını çiz',
    'A noktasındaki teğet ile AB kirişi arasındaki açıyı göster',
    'teğet kiriş açısı teoremini göster',
    'teğet-kiriş açısı gördüğü yayın yarısıdır',
    "A'daki teğet-kiriş açısını çiz",
  ],
  match(c) {
    if (yabanciFiil(c) || c.has(ORTAK_TEGET) || c.has(AD.kesen)) return 0;
    if (c.has(TEGET_KIRIS)) return PUAN.sekil;
    return c.has(/\bte[gy]et/) && c.has(AD.kiris) && c.hasNoun('angle') ? PUAN.sekil : 0;
  },
  run(c, scene) {
    const refs = adlar(c);
    const cem = hedefCember(c, scene, refs);
    const merkez = merkezNoktasi(scene, cem);
    let a: PointObject | undefined, b: PointObject | undefined;
    // "A noktasındaki teğet": tepe; "AB kirişi": kiriş
    const tepeRef = refs.find(r => r.label && r.role === 'at' && isPointRef(scene, r));
    const ikili = adliNoktalar(c, scene, cem, refs.filter(r => r !== tepeRef), 2, [210, 330]);
    if (ikili) [a, b] = ikili;
    if (tepeRef) {
      const tepe = refPoints(scene, tepeRef)![0];
      if (!uzerinde(cem, tepe)) fail(`${tepe.label} noktası çemberin üzerinde değil; teğet-kiriş açısının tepesi çember üzerinde olmalı.`);
      if (a && b && tepe.id !== a.id && tepe.id !== b.id) fail(`${tepe.label} noktası ${a.label}${b.label} kirişinin ucu değil; kirişi tepeden başlayarak yazın (ör. “${tepe.label}${a.label} kirişi”).`);
      if (a && b && tepe.id === b.id) [a, b] = [b, a];
      a ??= tepe;
    }
    if (!a || !b) {
      const mevcut = kirisler(scene, cem);
      const kir = mevcut.length === 1 ? mevcut[0] : mevcut.find(s => scene.focus.includes(s.id) || scene.selection.includes(s.id));
      if (kir) {
        const [u, v] = [scene.point(kir.startPointId), scene.point(kir.endPointId)];
        if (a) b = a.id === u.id ? v : a.id === v.id ? u : undefined;
        else [a, b] = [u, v];
      }
      if (!a || !b) {
        const adlar_ = newPointNames(scene, refs).filter(ad => ad !== a?.label);
        a ??= cemberNoktasi(scene, cem, bosDerece(scene, cem, [210, 230, 190]), adlar_.shift());
        b ??= cemberNoktasi(scene, cem, bosDerece(scene, cem, [derecesi(cem, a) + 120, derecesi(cem, a) + 100, derecesi(cem, a) + 140]), adlar_.shift());
      }
    }
    // A'daki teğet: MA'ya A'da dik doğru (canlı)
    const teget = ensureDirectionLine(scene, a.id, [merkez.id, a.id], 'perpendicular', `${merkez.label}${a.label}`, { color: COLORS.construction, label: `${a.label} Noktasındaki Teğet` });
    let t = teget.helper;
    // Açı, kirişin bulunduğu tarafta (≤ 90°) ölçülür; yardımcı nokta diğer taraftaysa simetriği alınır.
    if (aciDerece(t, a, b) > 90 + 1e-9) {
      t = findConstructed(scene, 'reflect', r => r.sourceId === teget.helper.id && r.centerId === a.id)
        ?? scene.addPoint({ x: 2 * a.x - t.x, y: 2 * a.y - t.y }, { color: COLORS.construction, construction: { kind: 'reflect', sourceId: teget.helper.id, centerId: a.id } });
    }
    const kirisParca = scene.addSegment(a.id, b.id, { showLength: false });
    const aciNesnesi = scene.addAngle(t.id, a.id, b.id);
    const yaricaplar = [scene.addSegment(merkez.id, a.id, { showLength: false, color: COLORS.construction }), scene.addSegment(merkez.id, b.id, { showLength: false, color: COLORS.construction })];
    const merkezAci = scene.addAngle(a.id, merkez.id, b.id, { color: COLORS.construction });
    const olcu = aciDerece(t, a, b), yay = aciDerece(a, cem.merkez, b);
    scene.say(`Teğet-kiriş açısı gördüğü yayın yarısıdır: m(∠${t.label}${a.label}${b.label}) = m(∠${a.label}${merkez.label}${b.label}) / 2 (${derece(olcu)} = ${derece(yay)} / 2). ${b.label} noktasını çember üzerinde sürükleyerek deneyin.`);
    cumleRengiUygula(c, scene);
    scene.setFocus([teget.object.id, kirisParca.id, aciNesnesi.id, ...yaricaplar.map(s => s.id), merkezAci.id]);
  },
};

// ---------------------------------------------------------------------------------------------- 6) iki çemberin ortak teğetleri

interface Teget { t1: Point2D; t2: Point2D }

/** İki çemberin dış (Δ = r1 − r2) ya da iç (Δ = r1 + r2) ortak teğetleri: n·x = k, n birim normal, n·(c1 − c2) = Δ. */
function ortakTegetler(c1: Cember, c2: Cember, ic: boolean): Teget[] {
  const dx = c1.merkez.x - c2.merkez.x, dy = c1.merkez.y - c2.merkez.y, d = Math.hypot(dx, dy);
  const delta = ic ? c1.r + c2.r : c1.r - c2.r;
  if (d < 1e-9 || Math.abs(delta) > d + 1e-9) return [];
  const theta = Math.atan2(dy, dx), beta = Math.acos(Math.max(-1, Math.min(1, delta / d)));
  // Teğet çemberler (|Δ| = d): tek teğet. β = 0 (r1 ≥ r2) ya da β = π (r1 < r2 içten teğet); ikisinde de iki çözüm çakışır.
  const tek = beta < 1e-7 || Math.PI - beta < 1e-7;
  const acilar = tek ? [theta + beta] : [theta + beta, theta - beta];
  return acilar.map(phi => {
    const n = { x: Math.cos(phi), y: Math.sin(phi) };
    return {
      t1: { x: c1.merkez.x - n.x * c1.r, y: c1.merkez.y - n.y * c1.r },
      t2: ic ? { x: c2.merkez.x + n.x * c2.r, y: c2.merkez.y + n.y * c2.r } : { x: c2.merkez.x - n.x * c2.r, y: c2.merkez.y - n.y * c2.r },
    };
  });
}

export const ortakTeget: CommandHandler = {
  id: 'teoremler.ortakTeget',
  examples: [
    'iki çemberin ortak teğetlerini çiz',
    "c1 ve c2'nin dış ortak teğetlerini çiz",
    'iç ortak teğetleri çiz',
    'dış ortak teğetleri çiz',
    'çemberlerin ortak teğetlerini çiz',
    'c1 ile c2 çemberlerinin iç ortak teğetlerini çiz',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(ORTAK_TEGET)) return 0;
    return PUAN.sekil;
  },
  run(c, scene) {
    const refs = adlar(c);
    const adli = refs.filter(r => r.label && (r.noun === 'circle' || !scene.pointsFromLabel(r.label.text)))
      .flatMap(r => scene.resolveLabel(r.label!, ['circle']) as CircleObject[]);
    const merkezli = refs.filter(r => r.label && r.role === 'li' && isPointRef(scene, r))
      .flatMap(r => scene.ofType('circle').filter(o => o.centerPointId === refPoints(scene, r)![0].id));
    let cemberler = [...new Set([...adli, ...merkezli])];
    if (cemberler.length === 1) cemberler = [];
    if (cemberler.length > 2) fail(`Ortak teğet iki çember arasında çizilir; ${cemberler.length} çember yazdınız.`);
    if (!cemberler.length) {
      const hepsi = scene.ofType('circle');
      if (hepsi.length < 2) fail(hepsi.length ? 'Ortak teğet için iki çember gerekir; önce ikinci bir çember çizin.' : 'Önce iki çember çizin (ör. “A merkezli yarıçapı 2 olan çember çiz”).');
      const odak = hepsi.filter(o => scene.focus.includes(o.id) || scene.selection.includes(o.id));
      cemberler = hepsi.length === 2 ? hepsi : odak.length === 2 ? odak : fail(`Birden fazla çember var (${joinTr(hepsi.slice(0, 4).map(o => o.label))}). Hangi ikisi olduğunu yazın (ör. “c1 ve c2'nin ortak teğetlerini çiz”).`);
    }
    const [c1, c2] = cemberler.map(o => geometri(scene, o));
    const d = uzaklik(c1.merkez, c2.merkez);
    const istenenIc = c.has(/\bic(?: ortak)? te[gy]et|\bic\b/) && !c.has(/\bdis/);
    const istenenDis = c.has(/\bdis/) && !c.has(/\bic\b/);
    if (d < 1e-9) fail('Çemberler eş merkezli; ortak teğetleri yok.');
    if (d < Math.abs(c1.r - c2.r) - 1e-9) fail('Çemberler iç içe; ortak teğetleri yok. Çemberlerden birini dışarı taşıyıp yeniden deneyin.');
    const dis = istenenIc ? [] : ortakTegetler(c1, c2, false);
    const ic = istenenDis ? [] : ortakTegetler(c1, c2, true);
    if (istenenIc && !ic.length) fail(d < c1.r + c2.r - 1e-9 ? 'Çemberler kesişiyor; iç ortak teğet yok. Dış ortak teğetler için “dış ortak teğetleri çiz” yazın.' : 'İç ortak teğet bulunamadı.');
    if (istenenDis && !dis.length) fail('Dış ortak teğet bulunamadı: çemberler iç içe.');
    const odak: string[] = [];
    const adlar_ = newPointNames(scene, refs);
    const kur = (tegetler: Teget[], baslik: string) => tegetler.map((t, i) => {
      const p1 = scene.addPoint(t.t1, { label: adlar_.shift(), onObjectId: c1.nesne.id, color: COLORS.construction });
      // Çemberler birbirine teğetse iki değme noktası çakışır: teğet doğru, değme noktasında yarıçapa diktir (gizli yardımcı nokta).
      const ortakNokta = uzaklik(t.t1, t.t2) <= 1e-7;
      const p2 = ortakNokta
        ? scene.addPoint({ x: t.t1.x - (t.t1.y - c1.merkez.y) / c1.r * Math.max(1, c1.r), y: t.t1.y + (t.t1.x - c1.merkez.x) / c1.r * Math.max(1, c1.r) },
          { label: helperName(scene, p1.label), color: COLORS.construction, visible: false, showLabel: false })
        : scene.addPoint(t.t2, { label: adlar_.shift(), onObjectId: c2.nesne.id, color: COLORS.construction });
      const dogru = scene.addLine(p1.id, p2.id, { label: `${baslik} ${tegetler.length > 1 ? i + 1 : ''}`.trim(), color: COLORS.construction, showEquation: false, reuse: false });
      odak.push(dogru.id);
      return ortakNokta ? `${dogru.label} (değme noktası ${p1.label})` : `${dogru.label} (${p1.label}, ${p2.label})`;
    });
    const disListe = kur(dis, 'Dış Ortak Teğet');
    const icListe = kur(ic, 'İç Ortak Teğet');
    const durum = d < c1.r + c2.r - 1e-9
      ? (Math.abs(d - Math.abs(c1.r - c2.r)) < 1e-9 ? 'Çemberler içten teğet: tek ortak teğet var.' : 'Çemberler kesişiyor: yalnızca dış ortak teğetler var.')
      : Math.abs(d - (c1.r + c2.r)) < 1e-9 ? 'Çemberler dıştan teğet: iki dış, bir iç ortak teğet var.' : 'Çemberler ayrık: iki dış ve iki iç ortak teğet var.';
    const parcalar = [disListe.length ? `Dış ortak ${disListe.length > 1 ? 'teğetler' : 'teğet'}: ${joinTr(disListe)}.` : '', icListe.length ? `İç ortak ${icListe.length > 1 ? 'teğetler' : 'teğet'}: ${joinTr(icListe)}.` : ''].filter(Boolean);
    scene.say(`${c1.nesne.label} ile ${c2.nesne.label} çemberlerinin ortak teğetleri çizildi. ${parcalar.join(' ')} ${durum} Değme noktaları çemberlere bağlıdır; çemberler taşınınca teğetleri yeniden çizin.`);
    cumleRengiUygula(c, scene);
    scene.setFocus(odak);
  },
};

export const handlers: CommandHandler[] = [kiris, kesen, kuvvet, cevreAci, tegetKirisAcisi, ortakTeget];
