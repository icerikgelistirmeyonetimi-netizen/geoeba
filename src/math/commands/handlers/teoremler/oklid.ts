import type { PointObject, PolygonObject } from '@/types/math';
import type { CommandHandler } from '../../types';
import type { Clause } from '../../text';
import { rotateAround } from '../../../commandBindings';
import type { CommandScene } from '../../scene';
import { ensureFoot, freeName } from '../constructions/build';
import { type Ref, refPoints, requestedName } from '../constructions/refs';
import { MEASURE_NOUN, fromPolygon, triangleOf } from '../constructions/common';
import {
  AD, COLORS, PUAN, type Triangle, type UcgenNoktalari, aciDerece, adlar, cumleRengiUygula, dikKose, fail, istenenKoseAdlari, sekilYerlestir,
  trNum, ucgenCiz, ucgenNoktalari, uzaklik, yabanciFiil,
} from './ortak';

/**
 * Öklid üçgeni ve Öklid bağıntıları; Pisagor şekli ve Pisagor bağıntısı.
 *
 * Ders kitabı gösterimi (dik açı A'da, hipotenüs [BC], hipotenüse ait yükseklik [AH]):
 *   |BC| = a, |AC| = b, |AB| = c, |AH| = h, |BH| = p, |HC| = k
 *   h² = p·k,  c² = p·a,  b² = k·a,  b·c = a·h   (Öklid bağıntıları)
 *   b² + c² = a²                                  (Pisagor bağıntısı)
 * Yeni Öklid üçgeni hipotenüs yatay altta olacak biçimde kurulur: B(0;0), C(a;0), A(p;h), H(p;0).
 * Pisagor şeklinde dik açı ilk köşededir: A(0;0), B(c;0), C(0;b); her kenar üzerine dışa doğru kare çizilir.
 * Yükseklik ayağı ve kare köşeleri CANLI inşadır (foot / rotate): köşeler sürüklenince şekil bozulmaz.
 */

// ---------------------------------------------------------------------------------------------- ortak çözümleme

/** Şekil kurma sözleri: "şekli çiz", "üçgeni kur", "şekil oluştur". */
const SEKIL_SOZU = /\bsekl|\bsekil|\bucgen|\bciz|\bkur(?!al)|\bolustur|\byap\b/;
/** Kenarları üzerine kareler çizilmiş dik üçgen: adı anılmadan istenen Pisagor şekli. */
const KARELI_DIK_UCGEN = /\bkenar\w* (?:uzerin[ed]|ustune|uzerine) (?:birer )?kare|\bkareler\w* cizil|\bkareli dik ucgen/;
/** "dik mi", "dik midir", "dik üçgen mi" sorusu. */
const DIK_MI = /\bdik (?:ucgen )?m[iu](?:dir)?\b/;
/** Ölçü sözcüğü bir parametre olarak geçiyor: "dik kenar uzunlukları 6 ve 8", "hipotenüs uzunluğu 10", "|AB| uzunluğu 6". */
const OLCU_PARAMETRESI = /(?:\b(?:kenar|hipotenus|yuksekli)\w*|\$\d+)\s+uzunlu\w*\s*(?:=|:)?\s*#\d+/;

/** Bağıntı / teorem gösterme isteği mi (yeni şekil kurma değil)? */
function bagintiIstegi(c: Clause): boolean {
  if (c.has(/\bbaginti|\bformul|\besitlik|\bozdeslik|\biliski/)) return true;
  if (c.has(/\bdogrula|\buygula|\bacikla|\bkanitla|\bispatla|\bgosterelim|\bgore\b/)) return true;
  // "Öklid üçgeninde BH kaç": bağıntılar istenir. "Öklid üçgeninin alanı kaç" ölçüm ailesinin, "çizer misin?" çizim isteğidir.
  if (c.hasVerb('question') && !c.hasVerb('create') && !c.has(MEASURE_NOUN)) return true;
  // "Öklid teoremini göster / yaz": şekil sözü yoksa bağıntı istenmiştir.
  return c.has(/\bteorem|\bkural/) && !c.has(SEKIL_SOZU);
}

/** Şekil kurma cümlesi mi? Ölçme fiili tek başına ("Öklid üçgenini ölç") bu ailenin işi değildir. */
function sekilIstegi(c: Clause): boolean {
  if (bagintiIstegi(c)) return false;
  if (c.has(MEASURE_NOUN) && !c.has(OLCU_PARAMETRESI)) return false;
  if (c.hasVerb('measure') && !c.hasVerb('create')) return false;
  return true;
}

/** Üçgen dejenere mi (çakışık köşe ya da doğrusal köşeler)? Bağıntılar ve açılar hesaplanamaz; NaN mesaja geçmesin. */
function ucgenSaglam(pts: UcgenNoktalari, ad: string, ornek = 'Öklid üçgeni çiz') {
  const [A, B, C] = pts;
  const kenarlar = [uzaklik(A, B), uzaklik(B, C), uzaklik(C, A)];
  const alan2 = Math.abs((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x));
  if (kenarlar.some(k => k < 1e-6) || alan2 < 1e-9 * Math.max(1, ...kenarlar) ** 2) {
    fail(`${ad} üçgeni dejenere: köşeleri çakışık ya da aynı doğru üzerinde; bağıntı hesaplanamaz. Köşeleri ayırın ya da yeni şekil için “${ornek}” yazın.`);
  }
}

/** Cümlede ADIYLA gösterilen üçgen ("ABC üçgeninde", "ABC'de"); adsız cümlede sahnedeki üçgen kullanılmaz (yeni şekil kurulur). */
function adliUcgen(c: Clause, scene: CommandScene, refs: Ref[]): Triangle | null {
  for (const r of refs) {
    if (!r.label) continue;
    const polygons = scene.resolveLabel(r.label, ['polygon']).filter((p): p is PolygonObject => p.type === 'polygon' && p.pointIds.length === 3);
    if (polygons.length === 1) return fromPolygon(scene, polygons[0]);
    const pts = refPoints(scene, r);
    if (pts && pts.length === 3 && new Set(pts.map(p => p.id)).size === 3) return { ids: [pts[0].id, pts[1].id, pts[2].id], name: pts.map(p => p.label).join('') };
  }
  // "bu üçgende", "seçili üçgende", "üçgende Öklid şeklini kur": odaktaki / seçili / tek üçgen
  if (c.refersToLast || c.refersToSelection || c.has(/\bucgen(?:in)?d[ae](?:ki)?\b/)) return triangleOf(c, scene, refs);
  return null;
}

/** Dik köşeyi başa alır: [dik köşe, diğer, diğer] (üçgen sırası korunur). */
function dikSira(pts: UcgenNoktalari, dik: 0 | 1 | 2): UcgenNoktalari {
  return [pts[dik], pts[(dik + 1) % 3], pts[(dik + 2) % 3]];
}

/** Ret mesajı için üçgenin üç açısı: açılar: m(∠BAC) ≈ 53,13°, m(∠ABC) …, m(∠ACB) … */
function dikDegilAciklamasi(pts: UcgenNoktalari): string {
  const [A, B, C] = pts;
  const aci = (p: PointObject, v: PointObject, q: PointObject) => `m(∠${p.label}${v.label}${q.label}) ${deger(aciDerece(p, v, q))}°`;
  return `açılar: ${aci(B, A, C)}, ${aci(A, B, C)}, ${aci(A, C, B)}`;
}

/** Sayı ile birlikte "=" ya da "≈" işareti (iki basamağa yuvarlanınca değer değişiyorsa yaklaşıktır). */
const yaklasikMi = (v: number) => Math.abs(v - Number(v.toFixed(2))) > 1e-9;
const deger = (v: number) => `${yaklasikMi(v) ? '≈' : '='} ${trNum(v)}`;
const uzunluk = (p: PointObject, q: PointObject) => `|${p.label}${q.label}| ${deger(uzaklik(p, q))} br`;
const yazi = (v: number) => trNum(v);

// ---------------------------------------------------------------------------------------------- ölçü okuma

interface OklidOlculeri {
  /** |AB| (B tarafındaki dik kenar) */
  c?: number;
  /** |AC| (C tarafındaki dik kenar) */
  b?: number;
  /** hipotenüs |BC| */
  a?: number;
  /** |BH| */
  p?: number;
  /** |HC| */
  k?: number;
  /** yükseklik |AH| */
  h?: number;
}

const OLCU_ADI: Record<keyof OklidOlculeri, string> = { c: 'dik kenar |AB|', b: 'dik kenar |AC|', a: 'hipotenüs', p: 'p (|BH|)', k: 'k (|HC|)', h: 'yükseklik' };

const ORNEK_OLCU = '“dik kenarları 6 ve 8 olan Öklid üçgeni çiz”, “hipotenüsü 10 olan Öklid üçgeni çiz” ya da “p = 4 ve k = 9 olan Öklid üçgeni çiz”';

/** "p = 4", "p'si 4", "k: 9", "h = 6" biçimindeki harfli ölçüler (harf küçük sözcük ya da büyük etiket olarak gelebilir). */
function harfliOlcu(c: Clause, harf: 'p' | 'k' | 'h'): { deger: number; ref: string } | undefined {
  const dogrudan = c.match(new RegExp(`(?:^|\\s)${harf}\\s*(?:si|su|sini|yi|i|degeri)?\\s*(?:=|:)?\\s*(#\\d+)`));
  if (dogrudan) return { deger: c.num(dogrudan[1]), ref: dogrudan[1] };
  for (const m of c.text.matchAll(/\$(\d+)(?:si|su|sini|yi|i)?\s*(?:=|:)?\s*(#\d+)/g)) {
    const etiket = c.labels[Number(m[1])];
    if (etiket && etiket.text.toLocaleLowerCase('tr') === harf) return { deger: c.num(m[2]), ref: m[2] };
  }
  return undefined;
}

/** Sayıdan sonra gelebilen birim: "6 cm ve 8 cm", "10 br". */
const BIRIM = String.raw`(?:\s*(?:br|birim|cm|mm|dm|km|m))?`;

/** Şeklin köşe ve ayak adları: ölçü etiketleri (|BH| = 4) bu adlara göre çözülür. */
interface SekilAdlari { A: string; B: string; C: string; H: string }

/** "|BH| = 4", "AB = 6", "|AC| uzunluğu 8" biçimindeki etiketli ölçülerin hangi büyüklük olduğu (adlara göre). */
function etiketliOlcu(etiket: string, ad: SekilAdlari): keyof OklidOlculeri | undefined {
  const temiz = etiket.replace(/[[\]|]/g, '').toLocaleUpperCase('tr');
  const tablo: [string, keyof OklidOlculeri][] = [
    [ad.A + ad.B, 'c'], [ad.A + ad.C, 'b'], [ad.B + ad.C, 'a'], [ad.A + ad.H, 'h'], [ad.B + ad.H, 'p'], [ad.C + ad.H, 'k'],
  ];
  const bulunan = tablo.find(([xy]) => xy.toLocaleUpperCase('tr') === temiz || xy.split('').reverse().join('').toLocaleUpperCase('tr') === temiz);
  return bulunan?.[1];
}

/** Cümledeki Öklid / Pisagor ölçülerini okur; yazılmamışsa alanlar boş kalır. */
function olculeriOku(c: Clause, ad: SekilAdlari): { verilen: OklidOlculeri; adet: number } {
  const verilen: OklidOlculeri = {};
  const kullanilan = new Set<string>();
  const al = (ref: string) => { kullanilan.add(ref); return c.num(ref); };
  let m: RegExpMatchArray | null;
  // Adet sözleri ölçü değildir: "iki dik kenarı 6 ve 8", "üç kenarı 3, 4 ve 5", "bir Öklid üçgeni"; "2 tane" ise desteklenmez.
  for (let i = 0; i < c.numbers.length; i++) {
    const ref = `#${i}`, deger = c.num(ref);
    if (c.has(new RegExp(`${ref}\\s+(?:tane|adet)\\b`))) {
      if (deger !== 1) fail('Tek seferde bir Öklid üçgeni çizilir; ikincisi için komutu yineleyin.');
      kullanilan.add(ref);
    } else if ((deger === 2 && c.has(new RegExp(`${ref}\\s+dik kenar`))) || (deger === 3 && c.has(new RegExp(`${ref}\\s+kenar`)))) {
      kullanilan.add(ref);
    }
  }
  if ((m = c.match(new RegExp(String.raw`\bdik kenar\w*(?:\s+uzunluklari)?\s*(?:=|:)?\s*(#\d+)${BIRIM}\s*(?:,|ve|ile)\s*(#\d+)`)))) { verilen.c = al(m[1]); verilen.b = al(m[2]); }
  else if ((m = c.match(/\b(?:bir\s+)?dik kenar\w*(?:\s+uzunlugu)?\s*(?:=|:)?\s*(#\d+)/))) verilen.c = al(m[1]);
  if ((m = c.match(/\bhipotenus\w*(?:\s+uzunlugu)?\s*(?:=|:)?\s*(#\d+)/))) verilen.a = al(m[1]);
  if ((m = c.match(/\byuksekli[gk]\w*(?:\s+uzunlugu)?\s*(?:=|:)?\s*(#\d+)/) ?? c.match(/(#\d+)\s*(?:br|birim)?\s*yuksekli[gk]\w*/))) verilen.h = al(m[1]);
  for (const harf of ['p', 'k', 'h'] as const) {
    const bulunan = harfliOlcu(c, harf);
    if (!bulunan) continue;
    verilen[harf] = bulunan.deger;
    kullanilan.add(bulunan.ref);
  }
  // Etiketli ölçüler: "|BH| = 4 ve |HC| = 9", "AB = 6", "|AC| uzunluğu 8" (adlar şeklin köşe adlarına göre)
  for (const e of c.text.matchAll(/\$(\d+)(?:si|su|sini|yi|i|nin|nun)?(?:\s+uzunlu\w*)?\s*(?:=|:)?\s*(#\d+)/g)) {
    const etiket = c.labels[Number(e[1])];
    if (!etiket || kullanilan.has(e[2])) continue;
    const olcu = etiketliOlcu(etiket.text, ad);
    if (!olcu) fail(`${etiket.text} ölçüsünü tanıyamadım. Bu şekilde ${ad.A} dik köşe, [${ad.B}${ad.C}] hipotenüs, ${ad.H} yükseklik ayağıdır: |${ad.A}${ad.B}|, |${ad.A}${ad.C}|, |${ad.B}${ad.C}|, |${ad.A}${ad.H}|, |${ad.B}${ad.H}| ya da |${ad.H}${ad.C}| yazın (ör. “|${ad.B}${ad.H}| = 4 ve |${ad.H}${ad.C}| = 9 olan Öklid üçgeni çiz”).`);
    if (verilen[olcu] !== undefined && Math.abs(verilen[olcu]! - c.num(e[2])) > 1e-9) fail(`${OLCU_ADI[olcu]} iki kez farklı yazılmış (${yazi(verilen[olcu]!)} ve ${yazi(c.num(e[2]))}).`);
    verilen[olcu] = al(e[2]);
  }
  // Yalın sayılar: "6 8 Öklid üçgeni" dik kenarlar, "3 4 5 Öklid üçgeni" üç kenar
  const yalin = c.numbers.map((_, i) => `#${i}`).filter(ref => !kullanilan.has(ref)).map(ref => c.num(ref));
  const adlandirilmis = Object.keys(verilen).length;
  if (yalin.length && !adlandirilmis) {
    if (yalin.length === 2) { [verilen.c, verilen.b] = yalin; }
    else if (yalin.length === 3) {
      const sirali = [...yalin].sort((x, y) => x - y);
      [verilen.c, verilen.b, verilen.a] = sirali;
    } else {
      fail(`Ölçüleri hangi kenara ait olduğuyla yazın; ör. ${ORNEK_OLCU}.`);
    }
  } else if (yalin.length && adlandirilmis) {
    fail(`Cümledeki ${yalin.map(yazi).join(', ')} sayısının hangi ölçü olduğunu anlayamadım. Ölçüleri adıyla yazın; ör. ${ORNEK_OLCU}.`);
  }
  for (const [ad, v] of Object.entries(verilen) as [keyof OklidOlculeri, number][]) {
    if (!(Number.isFinite(v) && v > 0)) fail(`${OLCU_ADI[ad]} sıfırdan büyük bir sayı olmalı (yazılan: ${yazi(v)}). Örnek: ${ORNEK_OLCU}.`);
    if (v < 0.01) fail(`${OLCU_ADI[ad]} en az 0,01 birim olmalı (yazılan: ${trNum(v, 4)}).`);
    if (v > 10000) fail(`${OLCU_ADI[ad]} en çok 10000 birim olabilir.`);
  }
  return { verilen, adet: Object.keys(verilen).length };
}

interface OklidCozumu { a: number; b: number; c: number; p: number; k: number; h: number; notlar: string[] }

/** Verilen ölçülerden dik üçgeni ve hipotenüse ait yükseklik parçalarını tamamlar; tutarsız / yetersiz veride reddeder. */
function cozumle(verilen: OklidOlculeri): OklidCozumu {
  const notlar: string[] = [];
  const v = { ...verilen };
  let c: number | undefined, b: number | undefined, a: number | undefined, p: number | undefined, k: number | undefined, h: number | undefined;
  if (v.c !== undefined && v.b !== undefined) { c = v.c; b = v.b; }
  else if (v.c !== undefined && v.a !== undefined) {
    if (v.a <= v.c) fail(`Hipotenüs dik kenardan uzun olmalı (hipotenüs ${yazi(v.a)}, dik kenar ${yazi(v.c)}). Örnek: “hipotenüsü 10 ve bir dik kenarı 6 olan Öklid üçgeni çiz”.`);
    c = v.c; b = Math.sqrt(v.a * v.a - v.c * v.c);
  } else if (v.p !== undefined && v.k !== undefined) { p = v.p; k = v.k; }
  else if (v.h !== undefined && v.p !== undefined) { h = v.h; p = v.p; k = h * h / p; }
  else if (v.h !== undefined && v.k !== undefined) { h = v.h; k = v.k; p = h * h / k; }
  else if (v.a !== undefined && v.p !== undefined) {
    if (v.a <= v.p) fail(`p (|BH|) hipotenüsten kısa olmalı (hipotenüs ${yazi(v.a)}, p = ${yazi(v.p)}). Örnek: “hipotenüsü 10 ve p = 3,6 olan Öklid üçgeni çiz”.`);
    p = v.p; k = v.a - v.p;
  } else if (v.a !== undefined && v.k !== undefined) {
    if (v.a <= v.k) fail(`k (|HC|) hipotenüsten kısa olmalı (hipotenüs ${yazi(v.a)}, k = ${yazi(v.k)}). Örnek: “hipotenüsü 10 ve k = 6,4 olan Öklid üçgeni çiz”.`);
    k = v.k; p = v.a - v.k;
  } else if (v.a !== undefined && v.h !== undefined) {
    // p ve k, t² − a·t + h² = 0 denkleminin kökleri: a ≥ 2h olmalı (yükseklik en çok hipotenüsün yarısı)
    const disk = v.a * v.a - 4 * v.h * v.h;
    if (disk < -1e-9) fail(`Dik üçgende hipotenüse ait yükseklik hipotenüsün yarısını geçemez (hipotenüs ${yazi(v.a)}, yükseklik ${yazi(v.h)}; yükseklik en çok ${yazi(v.a / 2)} olabilir). Örnek: “hipotenüsü 10 ve yüksekliği 4,8 olan Öklid üçgeni çiz”.`);
    h = v.h; p = (v.a - Math.sqrt(Math.max(0, disk))) / 2; k = v.a - p;
    if (disk > 1e-9) notlar.push(`p küçük kök alındı (p = ${yazi(p)}, k = ${yazi(k)}).`);
  } else if (v.a !== undefined) {
    c = v.a * 0.6; b = v.a * 0.8;
    notlar.push('Dik kenarlar 3:4 oranında alındı.');
  } else if (v.c !== undefined && v.h !== undefined) {
    if (v.h >= v.c) fail(`Yükseklik dik kenardan kısa olmalı (dik kenar ${yazi(v.c)}, yükseklik ${yazi(v.h)}). Örnek: “dik kenarı 5 ve yüksekliği 4 olan Öklid üçgeni çiz”.`);
    c = v.c; h = v.h; p = Math.sqrt(c * c - h * h); k = h * h / p;
  } else if (v.c !== undefined && v.b === undefined && (v.p !== undefined || v.k !== undefined)) {
    // c² = p·a ve a = p + k: tek dik kenarla p ya da k
    if (v.p !== undefined) { if (v.p >= v.c) fail(`p (|BH|) dik kenar |AB|'den kısa olmalı (|AB| = ${yazi(v.c)}, p = ${yazi(v.p)}). Örnek: “dik kenarı 5 ve p = 3 olan Öklid üçgeni çiz”.`); c = v.c; p = v.p; k = c * c / p - p; }
    else { c = v.c; k = v.k!; const a0 = (k + Math.sqrt(k * k + 4 * c * c)) / 2; p = a0 - k; }
  } else if (v.h !== undefined) {
    h = v.h; p = 0.75 * h; k = h * h / p;
    notlar.push('p = 0,75 × h alındı (3-4-5 üçgeni oranı).');
  } else if (v.c !== undefined) {
    fail(`Tek dik kenar yetmez; diğer dik kenarı ya da hipotenüsü de yazın (ör. “dik kenarları ${yazi(v.c)} ve 8 olan Öklid üçgeni çiz”).`);
  } else if (v.p !== undefined || v.k !== undefined) {
    const harf = v.p !== undefined ? 'p' : 'k';
    fail(`${harf} tek başına yetmez; yanına ${harf === 'p' ? 'k' : 'p'}, yüksekliği ya da hipotenüsü yazın (ör. “p = ${yazi(v.p ?? 4)} ve k = ${yazi(v.k ?? 9)} olan Öklid üçgeni çiz”).`);
  } else {
    c = 3; b = 4;
    notlar.push('Dik kenarlar 3 ve 4 birim alındı.');
  }
  // Kalan büyüklükler
  if (p !== undefined && k !== undefined) {
    a = p + k; h = h ?? Math.sqrt(p * k); c = Math.sqrt(p * a); b = Math.sqrt(k * a);
  } else if (c !== undefined && b !== undefined) {
    a = Math.hypot(c, b); p = c * c / a; k = b * b / a; h = b * c / a;
  } else {
    fail(`Öklid üçgeninin ölçüleri eksik. Örnek: ${ORNEK_OLCU}.`);
  }
  const cozum = { a, b, c, p, k, h };
  // Fazladan yazılan ölçüler hesaplananla uyuşmalı ("dik kenarları 6 ve 8, hipotenüsü 11" tutarsız)
  for (const [ad, deg] of Object.entries(verilen) as [keyof OklidOlculeri, number][]) {
    const hesap = cozum[ad];
    if (Math.abs(hesap - deg) > 1e-6 * Math.max(1, hesap, deg)) {
      fail(`Ölçüler tutarsız: yazılan ${OLCU_ADI[ad]} ${yazi(deg)}, diğer ölçülere göre ${trNum(hesap, 4)} olmalı. Yalnız bağımsız ölçüleri yazın; ör. ${ORNEK_OLCU}.`);
    }
  }
  return { ...cozum, notlar };
}

// ---------------------------------------------------------------------------------------------- Öklid bağıntıları yazımı

/** A dik köşe, H hipotenüsteki ayak: bağıntıları sayılarıyla yazar. */
function oklidBagintiYazisi(A: PointObject, B: PointObject, C: PointObject, H: PointObject): string {
  const a = uzaklik(B, C), b = uzaklik(A, C), c = uzaklik(A, B), h = uzaklik(A, H), p = uzaklik(B, H), k = uzaklik(H, C);
  const esit = (sol: number, sag: number) => (yaklasikMi(sol) || yaklasikMi(sag) ? '≈' : '=');
  const carpim = (x: number, y: number) => `${yazi(x)} × ${yazi(y)}`;
  const [AH, BH, HC, AB, AC, BC] = [`|${A.label}${H.label}|`, `|${B.label}${H.label}|`, `|${H.label}${C.label}|`, `|${A.label}${B.label}|`, `|${A.label}${C.label}|`, `|${B.label}${C.label}|`];
  return `${AH}² = ${BH} × ${HC} (${yazi(h * h)} ${esit(h * h, p * k)} ${carpim(p, k)}), `
    + `${AB}² = ${BH} × ${BC} (${yazi(c * c)} ${esit(c * c, p * a)} ${carpim(p, a)}), `
    + `${AC}² = ${HC} × ${BC} (${yazi(b * b)} ${esit(b * b, k * a)} ${carpim(k, a)}), `
    + `${AB} × ${AC} = ${BC} × ${AH} (${yazi(b * c)} ${esit(b * c, a * h)} ${yazi(a * h)}).`;
}

/** Hipotenüse ait yükseklik: ayak (canlı) + parça. Dik köşe A, hipotenüs [BC]. */
function yukseklikKur(scene: CommandScene, A: PointObject, B: PointObject, C: PointObject, ayak: AyakAdi) {
  const kurulan = ensureFoot(scene, A.id, [B.id, C.id], { name: ayak.ad });
  const H = kurulan.object;
  const parca = scene.addSegment(A.id, H.id, { color: COLORS.construction, showLength: true });
  const not = kurulan.created && ayak.istenen && H.label !== ayak.istenen ? `${ayak.istenen} adı kullanımda olduğu için ayağa ${H.label} dendi.` : undefined;
  return { H, parca, yeni: kurulan.created, not };
}

interface AyakAdi { ad?: string; istenen?: string }

/** Yükseklik ayağının istenen adı: "ayağı K olsun" ya da boşsa H (ikisi de doluysa sıradaki ad; kullanıcıya not düşülür). */
function ayakAdi(c: Clause, scene: CommandScene): AyakAdi {
  const istenen = requestedName(c)?.text;
  if (istenen && !scene.findPoint(istenen)) return { ad: istenen, istenen };
  return { ad: freeName(scene, 'H'), istenen };
}

// ---------------------------------------------------------------------------------------------- 1) Öklid üçgeni

export const oklidUcgeni: CommandHandler = {
  id: 'teoremler.oklidUcgeni',
  examples: [
    'Öklid üçgeni çiz',
    'Öklid şekli çiz',
    'Öklid teoremi için şekil kur',
    'dik kenarları 6 ve 8 olan Öklid üçgeni çiz',
    'hipotenüsü 10 olan Öklid üçgeni çiz',
    'p = 4 ve k = 9 olan Öklid üçgeni çiz',
    "yüksekliği 6 ve p'si 4 olan Öklid üçgeni",
    'DEF Öklid üçgeni çiz',
    'Öklit üçgeni çizer misin',
    'ABC üçgeninde Öklid şeklini kur',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(AD.oklid)) return 0;
    return sekilIstegi(c) ? PUAN.sekil : 0;
  },
  run(c, scene) {
    const refs = adlar(c).filter(r => r.label !== requestedName(c));
    const mevcut = adliUcgen(c, scene, refs);
    if (mevcut) return mevcutUcgendeOklid(c, scene, mevcut);

    const istenen = istenenKoseAdlari(c, scene, 3) ?? ['A', 'B', 'C'];
    const { verilen } = olculeriOku(c, { A: istenen[0], B: istenen[1], C: istenen[2], H: requestedName(c)?.text ?? 'H' });
    const cozum = cozumle(verilen);
    const { a, p, h } = cozum;
    // Yerel: hipotenüs yatay altta; A dik köşe üstte.
    const yerel = [{ x: p, y: h }, { x: 0, y: 0 }, { x: a, y: 0 }];
    const [A, B, C] = sekilYerlestir(scene, yerel, { adlar: istenen }) as UcgenNoktalari;
    const ucgen = ucgenCiz(scene, [A, B, C]);
    const { H, parca, not } = yukseklikKur(scene, A, B, C, ayakAdi(c, scene));
    scene.addAngle(B.id, A.id, C.id);
    scene.addAngle(A.id, H.id, B.id);
    scene.say(`${ucgen.label} Öklid üçgeni çizildi: m(∠${B.label}${A.label}${C.label}) = 90°, hipotenüs ${uzunluk(B, C)}, yükseklik ${uzunluk(A, H)}, ${uzunluk(B, H)}, ${uzunluk(H, C)}. `
      + `Öklid bağıntıları: ${oklidBagintiYazisi(A, B, C, H)}`);
    const notlar = [...cozum.notlar, ...(not ? [not] : [])];
    if (notlar.length) scene.say(notlar.join(' '));
    cumleRengiUygula(c, scene);
    scene.setFocus([ucgen.id, parca.id]);
  },
};

/** Var olan dik üçgende Öklid şekli: yalnız hipotenüse ait yükseklik ve dik açı işaretleri eklenir. */
function mevcutUcgendeOklid(c: Clause, scene: CommandScene, tri: Triangle) {
  if (c.numbers.length) fail(`${tri.name} üçgeni zaten çizili; ona ölçü verilmez. Ölçülü yeni şekil için “dik kenarları 6 ve 8 olan Öklid üçgeni çiz” yazın.`);
  const pts = ucgenNoktalari(scene, tri);
  ucgenSaglam(pts, tri.name);
  const dik = dikKose(pts);
  if (dik === undefined) fail(`Öklid şekli dik üçgende kurulur; ${tri.name} üçgeninde dik açı yok (${dikDegilAciklamasi(pts)}). Yeni dik üçgen için “Öklid üçgeni çiz” yazın.`);
  const [A, B, C] = dikSira(pts, dik);
  // Üç yalın noktayla gösterilen üçgenin çokgeni yoksa çizilir (Pisagor şekliyle aynı davranış).
  const ucgen = tri.polygon ?? ucgenCiz(scene, pts);
  const { H, parca, yeni, not } = yukseklikKur(scene, A, B, C, ayakAdi(c, scene));
  scene.addAngle(B.id, A.id, C.id);
  scene.addAngle(A.id, H.id, B.id);
  scene.say(`${tri.name} üçgeninde Öklid şekli kuruldu: m(∠${B.label}${A.label}${C.label}) = 90°, hipotenüs ${uzunluk(B, C)}, yükseklik ${uzunluk(A, H)}${yeni ? '' : ' (zaten vardı)'}, ${uzunluk(B, H)}, ${uzunluk(H, C)}. `
    + `Öklid bağıntıları: ${oklidBagintiYazisi(A, B, C, H)}`);
  if (not) scene.say(not);
  cumleRengiUygula(c, scene);
  scene.setFocus([ucgen.id, parca.id]);
}

// ---------------------------------------------------------------------------------------------- 2) Öklid bağıntıları

const OKLID_OZETI = 'Öklid bağıntıları dik üçgende hipotenüse ait yükseklik için geçerlidir: h² = p × k, c² = p × a, b² = k × a, b × c = a × h.';

export const oklidBagintilari: CommandHandler = {
  id: 'teoremler.oklidBagintilari',
  examples: [
    'Öklid bağıntılarını göster',
    'Öklid bağıntılarını yaz',
    'ABC üçgeninde Öklid teoremini uygula',
    'Öklid bağıntısı nedir',
    'Öklid teoremini doğrula',
    'Öklid bağıntılarını açıkla',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(AD.oklid)) return 0;
    return bagintiIstegi(c) ? PUAN.baginti : 0;
  },
  run(c, scene) {
    const refs = adlar(c);
    const tri = triangleOf(c, scene, refs);
    if (!tri) fail(`${OKLID_OZETI} Çizimde üçgen yok; önce “Öklid üçgeni çiz” yazın ya da bir dik üçgen çizip “ABC üçgeninde Öklid teoremini uygula” deyin.`);
    const pts = ucgenNoktalari(scene, tri);
    ucgenSaglam(pts, tri.name);
    const dik = dikKose(pts);
    if (dik === undefined) fail(`Öklid bağıntıları dik üçgende geçerlidir; ${tri.name} üçgeninde dik açı yok (${dikDegilAciklamasi(pts)}). Yeni dik üçgen için “Öklid üçgeni çiz” yazın.`);
    const [A, B, C] = dikSira(pts, dik);
    const { H, parca } = yukseklikKur(scene, A, B, C, { ad: freeName(scene, 'H') });
    scene.say(`${tri.name} üçgeninde Öklid bağıntıları (m(∠${B.label}${A.label}${C.label}) = 90°, yükseklik ${uzunluk(A, H)}, ${uzunluk(B, H)}, ${uzunluk(H, C)}): ${oklidBagintiYazisi(A, B, C, H)}`);
    cumleRengiUygula(c, scene);
    scene.setFocus([...(tri.polygon ? [tri.polygon.id] : []), parca.id]);
  },
};

// ---------------------------------------------------------------------------------------------- 3) Pisagor şekli

/** [PQ] kenarı üzerine, R köşesinin ters tarafına canlı kare (köşeler rotate inşasıyla P ve Q'ya bağlı). */
function kenarKaresi(scene: CommandScene, P: PointObject, Q: PointObject, R: PointObject): PolygonObject {
  const u = { x: Q.x - P.x, y: Q.y - P.y }, w = { x: R.x - P.x, y: R.y - P.y };
  // R, P→Q yönünün solundaysa (çapraz çarpım > 0) kare sağa (−90°) döndürülerek kurulur.
  const derece = u.x * w.y - u.y * w.x > 0 ? -90 : 90;
  const kose = (kaynak: PointObject, merkez: PointObject, deg: number) => scene.addPoint(rotateAround(kaynak, merkez, deg), {
    color: COLORS.square, showLabel: false, construction: { kind: 'rotate', sourceId: kaynak.id, centerId: merkez.id, degrees: deg },
  });
  const Pu = kose(Q, P, derece);
  const Qu = kose(P, Q, -derece);
  return scene.addPolygon([P.id, Q.id, Qu.id, Pu.id], { kind: 'square', label: `${P.label}${Q.label} Karesi`, showArea: true, showPerimeter: false, reuse: false });
}

/** Dik köşe A, hipotenüs [BC]: kareleri kurar ve bağıntıyı yazar. */
function pisagorSekliKur(c: Clause, scene: CommandScene, A: PointObject, B: PointObject, C: PointObject, ucgen: PolygonObject, giris: string, notlar: string[] = []) {
  const kareler = [kenarKaresi(scene, A, B, C), kenarKaresi(scene, B, C, A), kenarKaresi(scene, C, A, B)];
  const b = uzaklik(A, C), cc = uzaklik(A, B), a = uzaklik(B, C);
  const esit = yaklasikMi(cc * cc) || yaklasikMi(b * b) || yaklasikMi(a * a) ? '≈' : '=';
  scene.say(`${giris} Pisagor bağıntısı: |${A.label}${B.label}|² + |${A.label}${C.label}|² = |${B.label}${C.label}|²: `
    + `${yazi(cc * cc)} + ${yazi(b * b)} ${esit} ${yazi(a * a)} (karelerin alanları ${yazi(cc * cc)}, ${yazi(b * b)} ve ${yazi(a * a)} br²).`);
  if (notlar.length) scene.say(notlar.join(' '));
  cumleRengiUygula(c, scene);
  scene.setFocus([ucgen.id, ...kareler.map(k => k.id)]);
}

export const pisagorSekli: CommandHandler = {
  id: 'teoremler.pisagorSekli',
  examples: [
    'Pisagor şekli çiz',
    'Pisagor teoremi şekli',
    'Pisagor üçgeni çiz',
    'dik kenarları 5 ve 12 olan Pisagor şekli çiz',
    'kenarları üzerine kareler çizilmiş dik üçgen çiz',
    'ABC üçgeninde Pisagor şeklini kur',
  ],
  match(c) {
    if (yabanciFiil(c)) return 0;
    if (!c.has(AD.pisagor) && !(c.has(KARELI_DIK_UCGEN) && c.has(/\bdik ucgen|\bdik acili/))) return 0;
    return sekilIstegi(c) ? PUAN.sekil : 0;
  },
  run(c, scene) {
    const refs = adlar(c);
    const mevcut = adliUcgen(c, scene, refs);
    if (mevcut) {
      if (c.numbers.length) fail(`${mevcut.name} üçgeni zaten çizili; ona ölçü verilmez. Ölçülü yeni şekil için “dik kenarları 5 ve 12 olan Pisagor şekli çiz” yazın.`);
      const pts = ucgenNoktalari(scene, mevcut);
      ucgenSaglam(pts, mevcut.name, 'Pisagor şekli çiz');
      const dik = dikKose(pts);
      if (dik === undefined) fail(`Pisagor şekli dik üçgende kurulur; ${mevcut.name} üçgeninde dik açı yok (${dikDegilAciklamasi(pts)}). Yeni dik üçgen için “Pisagor şekli çiz” yazın.`);
      const [A, B, C] = dikSira(pts, dik);
      const ucgen = mevcut.polygon ?? ucgenCiz(scene, [A, B, C] as UcgenNoktalari);
      return pisagorSekliKur(c, scene, A, B, C, ucgen, `${mevcut.name} dik üçgeninin kenarları üzerine kareler çizildi.`);
    }
    const istenen = istenenKoseAdlari(c, scene, 3) ?? ['A', 'B', 'C'];
    const { verilen } = olculeriOku(c, { A: istenen[0], B: istenen[1], C: istenen[2], H: 'H' });
    const cozum = cozumle(verilen);
    // Dik açı ilk köşede: A(0;0), B(c;0), C(0;b)
    const yerel = [{ x: 0, y: 0 }, { x: cozum.c, y: 0 }, { x: 0, y: cozum.b }];
    const [A, B, C] = sekilYerlestir(scene, yerel, { adlar: istenen }) as UcgenNoktalari;
    const ucgen = ucgenCiz(scene, [A, B, C]);
    scene.addAngle(B.id, A.id, C.id);
    pisagorSekliKur(c, scene, A, B, C, ucgen, `${ucgen.label} dik üçgeni ve kenarları üzerine kareler çizildi.`, cozum.notlar);
  },
};

// ---------------------------------------------------------------------------------------------- 4) Pisagor bağıntısı

export const pisagorBagintisi: CommandHandler = {
  id: 'teoremler.pisagorBagintisi',
  examples: [
    'Pisagor bağıntısını göster',
    'Pisagor teoremini uygula',
    'ABC üçgeninde Pisagor bağıntısını yaz',
    'Pisagor teoremine göre hipotenüs kaç',
    "Pisagor'a göre ABC dik mi",
    'Pisagor bağıntısını doğrula',
  ],
  match(c) {
    if (yabanciFiil(c) || !c.has(AD.pisagor)) return 0;
    return bagintiIstegi(c) ? PUAN.baginti : 0;
  },
  run(c, scene) {
    const refs = adlar(c);
    const tri = triangleOf(c, scene, refs);
    if (!tri) fail('Pisagor bağıntısı: dik üçgende dik kenarların karelerinin toplamı hipotenüsün karesine eşittir (b² + c² = a²). Çizimde üçgen yok; önce “Pisagor şekli çiz” yazın ya da bir üçgen çizip “ABC üçgeninde Pisagor bağıntısını yaz” deyin.');
    const pts = ucgenNoktalari(scene, tri);
    ucgenSaglam(pts, tri.name, 'Pisagor şekli çiz');
    const dik = dikKose(pts);
    // En uzun kenarın karşısındaki köşe başa: [tepe, diğer, diğer]
    const karsiKenar = (i: number) => uzaklik(pts[(i + 1) % 3], pts[(i + 2) % 3]);
    const tepe = dik ?? ([0, 1, 2] as const).reduce((en, i) => (karsiKenar(i) > karsiKenar(en) ? i : en), 0 as 0 | 1 | 2);
    const [A, B, C] = dikSira(pts, tepe);
    const a = uzaklik(B, C), b = uzaklik(A, C), cc = uzaklik(A, B);
    const toplam = cc * cc + b * b, kare = a * a;
    const esit = yaklasikMi(cc * cc) || yaklasikMi(b * b) ? '≈' : '=';
    const dikSoru = c.has(DIK_MI);
    const kenarlar = `|${A.label}${B.label}|² + |${A.label}${C.label}|² ${esit} ${yazi(cc * cc)} + ${yazi(b * b)} = ${yazi(toplam)}`;
    if (dik !== undefined) {
      scene.say(`${dikSoru ? 'Evet, ' : ''}${tri.name} üçgeninde Pisagor bağıntısı sağlanır: ${kenarlar}, |${B.label}${C.label}|² ${deger(kare)}; üçgen diktir (m(∠${B.label}${A.label}${C.label}) = 90°). Hipotenüs ${uzunluk(B, C)}.`);
    } else {
      const genis = kare > toplam;
      scene.say(`${dikSoru ? 'Hayır, ' : ''}${tri.name} üçgeninde ${kenarlar}, |${B.label}${C.label}|² ${deger(kare)}: eşit değil; en uzun kenarın karesi ${genis ? 'büyük, üçgen geniş açılıdır' : 'küçük, üçgen dar açılıdır'} (m(∠${B.label}${A.label}${C.label}) ${deger(aciDerece(B, A, C))}°). Üçgen dik olmadığı için hipotenüsü yok; en uzun kenar ${uzunluk(B, C)}.`);
    }
    if (tri.polygon) scene.setFocus([tri.polygon.id]);
  },
};

export const handlers: CommandHandler[] = [oklidUcgeni, oklidBagintilari, pisagorSekli, pisagorBagintisi];
