import type { CircleObject, PointObject } from '@/types/math';
import type { CommandHandler } from '../../types';
import { type Clause, fold } from '../../text';
import { type CommandScene } from '../../scene';
import { calculateCircumcircle } from '../../../geometry';
import { joinTr, named, newPointNames, requestedName } from '../constructions/refs';
import { MEASURE_NOUN, PLURAL_ALL, countBefore } from '../constructions/common';
import { ensureBisectorRay, ensureFoot, ensureMidpoint, findConstructed, freeName, helperName } from '../constructions/build';
import { ensureCenter } from '../constructions/points';
import {
  AD, COLORS, PUAN, type Triangle, type UcgenNoktalari, adlar, cumleRengiUygula, dikKose, fail, koseSirasi, trNum, ucgenGerekli, ucgenNoktalari, uzaklik,
  yabanciFiil, yaklasik,
} from './ortak';

/**
 * Üçgenin çemberleri ve doğruları: dış teğet çember(ler), Euler doğrusu, dokuz nokta (Euler / Feuerbach) çemberi.
 * Hepsi var olan bir üçgen üzerinde, CANLI kurulur: köşeler sürüklenince merkezler, ayaklar ve çemberler yeniden hesaplanır.
 *   - Dış teğet çember: A'nın iç açıortayı ile B'nin dış açıortayının kesişimi merkez, [BC] doğrusuna dik ayak yarıçap noktasıdır.
 *   - Euler doğrusu: çevrel merkez O, ağırlık merkezi G ve diklik merkezi H'den geçen doğru (|OG| : |GH| = 1 : 2).
 *   - Dokuz nokta çemberi: kenar orta noktaları, yükseklik ayakları ve H ile köşelerin orta noktalarından geçen çember (r = R / 2).
 */

const CEMBER = /\bcember|\bdaire(?!\s*dilim)/;
/** "dış teğet (olan | bir) çember", "dış teğet çemberin merkezi" — "iki çemberin ortak dış teğeti" (çember önce gelir) değil. */
const DIS_TEGET_CEMBER = /\bdis ?te[gy]et (?:olan |bir )*(?:cember|daire)/;
/** "dış teğet çemberin merkezini bul", "dış teğet çemberlerin merkezlerini bul": yalnız merkez(ler) istenir, çember çizilmez. */
const YALNIZ_MERKEZ = /\bdis ?te[gy]et (?:cember(?:in|inin|lerin|lerinin)? |daire(?:nin|lerin)? )?merkez(?:i|ini|inin|leri|lerini)?\b/;
/** "c1 çemberine dış teğet çember çiz", "dış teğet çemberine teğet …": bir çembere teğetlik istenir; üçgenin dış teğet çemberi değildir. */
const CEMBERE_TEGET = /\b(?:cember|daire)(?:e|ye|ine|sine|lere|lerine)\b/;
/** "Euler çemberi" (dokuz nokta çemberi) — "Euler doğrusunu ve … çemberini" cümlesindeki uzak "çember" değil. */
const EULER_CEMBERI = /\b(?:euler|oyler)\w* (?:cember|daire)/;
/** "dokuz nokta çemberi", "9 nokta çemberi", "dokuz noktalı çember" — "dokuz noktadan geçen çember" (noktalardan geçen çember) değil. */
const DOKUZ_NOKTA_CEMBERI = /\b(?:dokuz|9|#\d+) nokta(?:si|sinin|li|lar|lari)? (?:cember|daire)/;

/** "dokuz nokta" sayı sözcüğü olarak katlandığından ("#0 nokta") ham metinde de aranır; "9 nokta", "Feuerbach" ve "Euler çemberi" de kabul. */
function dokuzNoktaMi(c: Clause): boolean {
  if (!c.has(CEMBER)) return false;
  if (c.has(/\bfeuerbach/) || c.has(EULER_CEMBERI)) return true;
  if (DOKUZ_NOKTA_CEMBERI.test(fold(c.raw))) return true;
  const m = c.match(DOKUZ_NOKTA_CEMBERI);
  return !!m && (!m[0].startsWith('#') || c.num(m[0].split(' ')[0]) === 9);
}

const kenarAdi = (a: PointObject, b: PointObject) => `[${a.label}${b.label}]`;

// ---------------------------------------------------------------------------------------------- dış teğet çember

interface DisTegetSonuc { merkez: PointObject; cember?: CircleObject; yeni: boolean; yaricap: number }

/**
 * Köşeye (sıra i) ait dış teğet çemberin canlı kurulumu. Merkez I_A: A'nın iç açıortayı ile B'nin dış açıortayının kesişimi.
 * B'nin dış açıortayı için AB uzantısında A'' = B + (B − A) gizli noktası kullanılır (öteleme kurulumu).
 */
function disTegetKur(scene: CommandScene, pts: UcgenNoktalari, i: 0 | 1 | 2, o: { ad?: string; yalnizMerkez: boolean }): DisTegetSonuc {
  const A = pts[i], B = pts[(i + 1) % 3], C = pts[(i + 2) % 3];
  const a = uzaklik(B, C), b = uzaklik(C, A), c = uzaklik(A, B);
  const u = (a + b + c) / 2;
  const alan = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
  if (alan < 1e-9 || u - a < 1e-9) fail(`${A.label}${B.label}${C.label} köşeleri aynı doğru üzerinde; dış teğet çember tanımsız.`);
  const yaricap = alan / (u - a);
  if (yaricap < 1e-6) fail(`${A.label}${B.label}${C.label} üçgeni çok dar: dış teğet çemberin yarıçapı sıfıra iniyor. Köşeleri biraz açın.`);
  const beklenen = { x: (-a * A.x + b * B.x + c * C.x) / (-a + b + c), y: (-a * A.y + b * B.y + c * C.y) / (-a + b + c) };

  // 1) A'nın iç açıortayı (ışın)
  const r1 = ensureBisectorRay(scene, B.id, A.id, C.id);
  // 2) B'nin dış açıortayı: AB uzantısındaki gizli A'' ile ∠(C, B, A'') açıortayı
  const uzanti = scene.points().find(p => p.construction?.kind === 'translate' && p.construction.sourceId === B.id
    && p.construction.vectorPointIds?.[0] === A.id && p.construction.vectorPointIds?.[1] === B.id)
    ?? scene.addPoint({ x: 2 * B.x - A.x, y: 2 * B.y - A.y }, {
      label: helperName(scene, A.label), color: COLORS.construction, visible: false, showLabel: false,
      construction: { kind: 'translate', sourceId: B.id, vectorPointIds: [A.id, B.id] },
    });
  const r2 = ensureBisectorRay(scene, C.id, B.id, uzanti.id);
  // Yardımcı ışınlar ve açıortay noktaları gizlenir (yalnız bu cümlede oluşanlar; kullanıcının açıortayı görünür kalır).
  for (const made of [r1, r2]) {
    if (!made.created) continue;
    scene.update(made.object.id, { visible: false, showLabel: false });
    scene.update(made.helper.id, { label: helperName(scene, A.label), visible: false, showLabel: false });
  }

  // 3) Merkez: iki ışının kesişimi (canlı)
  const varOlan = findConstructed(scene, 'intersection', r => r.objectIds[0] === r1.object.id && r.objectIds[1] === r2.object.id);
  let yeni = false;
  const merkez = varOlan ?? (() => {
    yeni = true;
    return scene.addPoint(beklenen, {
      label: o.ad, color: COLORS.construction, construction: { kind: 'intersection', objectIds: [r1.object.id, r2.object.id], index: 0 },
    });
  })();
  if (!yaklasik(merkez.x, beklenen.x, 1e-6) || !yaklasik(merkez.y, beklenen.y, 1e-6)) fail('Dış teğet çemberin merkezi hesaplanamadı; üçgen çok dar olabilir.');
  if (o.yalnizMerkez) return { merkez, yeni, yaricap };

  // 4) Yarıçap noktası: merkezden BC doğrusuna ayak (gizli); çember
  const ayak = ensureFoot(scene, merkez.id, [B.id, C.id], { hidden: true }).object;
  const eski = scene.ofType('circle').find(x => x.centerPointId === merkez.id && x.radiusPointId === ayak.id);
  const cember = eski ?? scene.addCircle({ centerId: merkez.id, radiusPointId: ayak.id }, {
    label: `${A.label}${B.label}${C.label} Dış Teğet Çemberi (${A.label})`, fillOpacity: 0, showArea: false, showPerimeter: false,
  });
  return { merkez, cember, yeni: yeni || !eski, yaricap };
}

/** Cümlede köşe ya da kenar adıyla gösterilen köşe: "A köşesine ait", "BC kenarına teğet" → karşı köşe. */
function istenenKose(c: Clause, scene: CommandScene, tri: Triangle): 0 | 1 | 2 | undefined {
  const pts = ucgenNoktalari(scene, tri);
  for (const r of adlar(c)) {
    if (!r.label) continue;
    const text = r.label.text.replace(/[[\]|]/g, '');
    if (scene.resolveLabel(r.label, ['polygon']).length) continue;
    const found = scene.pointsFromLabel(text);
    if (!found) {
      if (r.noun === 'vertex' || r.noun === 'side') fail(`${text} adlı ${r.noun === 'vertex' ? 'köşe' : 'kenar'} yok. ${tri.name} üçgeninin köşeleri: ${joinTr(pts.map(p => p.label))}.`);
      continue;
    }
    if (found.length === 1) {
      const i = koseSirasi(scene, tri, found[0].label);
      if (i !== undefined) return i;
      fail(`${found[0].label} noktası ${tri.name} üçgeninin köşesi değil. Köşelerden birini yazın (ör. “${pts[0].label} köşesine ait dış teğet çemberi çiz”).`);
    }
    if (found.length === 2) {
      const [p, q] = found.map(x => koseSirasi(scene, tri, x.label));
      if (p === undefined || q === undefined) fail(`${text} kenarı ${tri.name} üçgenine ait değil.`);
      return ((3 - p - q) % 3) as 0 | 1 | 2;
    }
  }
  return undefined;
}

export const disTegetCember: CommandHandler = {
  id: 'teoremler.disTegetCember',
  examples: [
    'ABC üçgeninin dış teğet çemberini çiz',
    'A köşesine ait dış teğet çemberi çiz',
    'BC kenarına teğet dış teğet çember çiz',
    'üçgenin üç dış teğet çemberini çiz',
    'tüm dış teğet çemberleri çiz',
    'dış teğet çemberin merkezini bul',
    'C köşesinin dış teğet çemberi',
  ],
  match(c) {
    if (yabanciFiil(c) || c.has(MEASURE_NOUN) || !c.has(AD.disTeget) || !c.has(CEMBER)) return 0;
    // "iki çemberin ortak dış teğetleri": çember teoremleri ailesinin işi. "c1 çemberine dış teğet çember": çembere teğetlik, üçgen işi değil.
    if (c.has(/\bortak/) || c.has(CEMBERE_TEGET) || !c.has(DIS_TEGET_CEMBER)) return 0;
    return PUAN.sekil;
  },
  run(c, scene) {
    const refs = adlar(c);
    const tri = ucgenGerekli(c, scene, refs, '“ABC üçgeninin dış teğet çemberini çiz” diye yazın ya da önce bir üçgen çizin.');
    const pts = ucgenNoktalari(scene, tri);
    const yalnizMerkez = c.has(YALNIZ_MERKEZ) && !c.has(/\bmerkeziyle|\bmerkezi ile|\bmerkezini de\b/);
    const adet = countBefore(c, 'te[gy]et');
    if (adet !== undefined && adet !== 3) fail(`Üçgenin üç dış teğet çemberi vardır. Tek bir köşeninkini yazın (ör. “${pts[0].label} köşesine ait dış teğet çemberi çiz”) ya da “üç dış teğet çemberini çiz” deyin.`);
    const hepsi = c.has(PLURAL_ALL) || c.has(/\bcemberler|\bdaireler/) || adet === 3;
    const secilen = istenenKose(c, scene, tri);
    if (hepsi && secilen !== undefined) fail('Ya tek bir köşeyi yazın (ör. “A köşesine ait dış teğet çemberi çiz”) ya da “üç dış teğet çemberini çiz” deyin.');
    const koseler: (0 | 1 | 2)[] = hepsi ? [0, 1, 2] : [secilen ?? 0];
    // Merkez için istenen ad: "merkezi K olsun" ya da cümledeki yeni tek harfli ad (köşe / kenar görevindekiler değil).
    const istenenAd = requestedName(c)?.text ?? newPointNames(scene, refs.filter(r => r.noun !== 'vertex' && r.noun !== 'side'))[0];
    if (istenenAd && scene.findPoint(istenenAd)) fail(`${istenenAd} adlı nokta zaten var. Merkez için başka bir ad yazın.`);

    const odak: string[] = [];
    const sonuclar: { kose: PointObject; s: DisTegetSonuc }[] = [];
    koseler.forEach((i, sira) => {
      const ad = sira === 0 && istenenAd ? istenenAd : (!hepsi ? freeName(scene, 'I') : undefined);
      const s = disTegetKur(scene, pts, i, { ad, yalnizMerkez });
      sonuclar.push({ kose: pts[i], s });
      odak.push(s.cember?.id ?? s.merkez.id);
    });

    if (hepsi) {
      const liste = sonuclar.map(({ kose, s }) => `${kose.label} köşesi: merkez ${named(s.merkez)}, r = ${trNum(s.yaricap)} br`);
      scene.say(`${tri.name} üçgeninin üç dış teğet çemberi${yalnizMerkez ? 'nin merkezleri bulundu' : ' çizildi'}. ${joinTr(liste)}. Her çember bir kenara ve diğer iki kenarın uzantılarına teğettir.`);
    } else {
      const { kose, s } = sonuclar[0];
      const i = koseler[0];
      const B = pts[(i + 1) % 3], C = pts[(i + 2) % 3];
      if (yalnizMerkez) {
        scene.say(`${tri.name} üçgeninin ${kose.label} köşesine ait dış teğet çemberinin merkezi ${s.yeni ? 'bulundu' : 'zaten vardı'}: ${named(s.merkez)}, r = ${trNum(s.yaricap)} br. Merkez, ${kose.label} açısının iç açıortayı ile ${B.label} ve ${C.label} açılarının dış açıortaylarının kesişimidir.`);
      } else {
        scene.say(`${tri.name} üçgeninin ${kose.label} köşesine ait dış teğet çemberi ${s.yeni ? 'çizildi' : 'zaten var'}: merkez ${named(s.merkez)}, r = ${trNum(s.yaricap)} br. Çember ${kenarAdi(B, C)} kenarına ve ${kenarAdi(kose, B)}, ${kenarAdi(kose, C)} kenarlarının uzantılarına teğettir.`);
      }
    }
    cumleRengiUygula(c, scene);
    scene.setFocus(odak);
  },
};

// ---------------------------------------------------------------------------------------------- Euler doğrusu

/** Üçgenin O, G, H merkezleri (adlar boşsa O / G / H). */
function merkezler(scene: CommandScene, tri: Triangle) {
  const O = ensureCenter(scene, tri.ids, 'circumcenter').point;
  const G = ensureCenter(scene, tri.ids, 'centroid').point;
  const H = ensureCenter(scene, tri.ids, 'orthocenter').point;
  return { O, G, H };
}

export const eulerDogrusu: CommandHandler = {
  id: 'teoremler.eulerDogrusu',
  examples: [
    'ABC üçgeninin Euler doğrusunu çiz',
    'Euler doğrusu',
    'Euler doğrusunu çiz',
    'Oyler doğrusu çiz',
    'üçgenin Euler doğrusunu oluştur',
    "DEF'in Euler doğrusunu çiz",
  ],
  match(c) {
    if (yabanciFiil(c) || c.has(MEASURE_NOUN) || !c.has(AD.euler)) return 0;
    // "Euler çemberi" dokuz nokta çemberidir; "Euler doğrusunu (ve dokuz nokta) çemberini" ise Euler doğrusudur.
    if (c.has(EULER_CEMBERI)) return 0;
    return PUAN.sekil;
  },
  run(c, scene) {
    const tri = ucgenGerekli(c, scene, adlar(c), '“ABC üçgeninin Euler doğrusunu çiz” diye yazın ya da önce bir üçgen çizin.');
    const pts = ucgenNoktalari(scene, tri);
    const [A, B, C] = pts;
    const kenarlar = [uzaklik(B, C), uzaklik(C, A), uzaklik(A, B)];
    if (kenarlar.every(k => yaklasik(k, kenarlar[0], 1e-6))) fail(`${tri.name} eşkenar üçgen: çevrel merkez, ağırlık merkezi ve diklik merkezi çakışır; Euler doğrusu tanımsız.`);
    const { O, G, H } = merkezler(scene, tri);
    const OH = uzaklik(O, H);
    if (OH < 1e-9) fail(`${tri.name} üçgeninde merkezler çakışıyor; Euler doğrusu tanımsız.`);
    const eski = scene.ofType('line').find(l => [l.point1Id, l.point2Id].includes(O.id) && [l.point1Id, l.point2Id].includes(H.id));
    const dogru = eski ?? scene.addLine(O.id, H.id, { label: `${tri.name} Euler Doğrusu`, color: COLORS.construction, showEquation: false });
    const OG = uzaklik(O, G), GH = uzaklik(G, H);
    scene.say(`${tri.name} üçgeninin Euler doğrusu ${eski ? 'zaten var' : 'çizildi'}: ${O.label} (çevrel çemberin merkezi), ${G.label} (ağırlık merkezi) ve ${H.label} (diklik merkezi) aynı doğru üzerinde; |${O.label}${G.label}| : |${G.label}${H.label}| = 1 : 2 (|${O.label}${G.label}| ≈ ${trNum(OG)} br, |${G.label}${H.label}| ≈ ${trNum(GH)} br).`);
    const dik = dikKose(pts);
    if (dik !== undefined) {
      const [p, q] = [pts[(dik + 1) % 3], pts[(dik + 2) % 3]];
      scene.say(`Dik üçgende ${H.label} dik köşe ${pts[dik].label} üzerindedir; ${O.label} ise ${kenarAdi(p, q)} hipotenüsünün orta noktasıdır.`);
    }
    cumleRengiUygula(c, scene);
    scene.setFocus([dogru.id, O.id, G.id, H.id]);
  },
};

// ---------------------------------------------------------------------------------------------- dokuz nokta çemberi

export const dokuzNoktaCemberi: CommandHandler = {
  id: 'teoremler.dokuzNoktaCemberi',
  examples: [
    'dokuz nokta çemberini çiz',
    'ABC üçgeninin dokuz nokta çemberi',
    'Euler çemberi çiz',
    'Feuerbach çemberini çiz',
    '9 nokta çemberini çiz',
    'üçgenin dokuz nokta çemberini merkeziyle çiz',
  ],
  match(c) {
    if (yabanciFiil(c) || c.has(MEASURE_NOUN) || !dokuzNoktaMi(c)) return 0;
    // "iki çemberin ortak dış teğetleri" gibi başka çember işleri karışmasın.
    if (c.has(AD.disTeget) || c.has(/\bortak/)) return 0;
    return PUAN.sekil;
  },
  run(c, scene) {
    const refs = adlar(c);
    const tri = ucgenGerekli(c, scene, refs, '“ABC üçgeninin dokuz nokta çemberini çiz” diye yazın ya da önce bir üçgen çizin.');
    const pts = ucgenNoktalari(scene, tri);
    const [A, B, C] = pts;
    const cevrel = calculateCircumcircle(A, B, C);
    if (!cevrel) fail(`${tri.name} köşeleri aynı doğru üzerinde; dokuz nokta çemberi tanımsız.`);
    // Merkez için istenen ad: "merkezi K olsun", "merkezi K olan …" (yoksa N).
    const merkezIstendi = c.has(/\bmerkez/);
    const istenenAd = merkezIstendi ? requestedName(c)?.text ?? newPointNames(scene, refs)[0] : undefined;
    if (istenenAd && scene.findPoint(istenenAd)) fail(`${istenenAd} adlı nokta zaten var. Merkez için başka bir ad yazın.`);

    // Kenar orta noktaları (çember bu üç noktadan geçer: canlı)
    const ortalar = [[B, C], [C, A], [A, B]].map(([p, q]) => ensureMidpoint(scene, p.id, q.id).object);
    // Diklik merkezi (ve istenirse çevrel merkez) önce kurulur ki alışılmış H / O adlarını ayaklar tüketmesin
    const H = ensureCenter(scene, tri.ids, 'orthocenter').point;
    const O = merkezIstendi ? ensureCenter(scene, tri.ids, 'circumcenter').point : undefined;
    // Merkez N = [OH] orta noktası, ayaklardan ÖNCE kurulur ki istenen ad (ya da N) sıradaki adlara kaptırılmasın.
    // Eşkenar üçgende O ve H çakışır; orta nokta yine tanımlıdır (köşe sürüklenince ayrışır), yalnız notla söylenir.
    const N = O ? ensureMidpoint(scene, O.id, H.id, { name: istenenAd ?? freeName(scene, 'N') }).object : undefined;
    // Yükseklik ayakları (görünür)
    const ayaklar = [[A, B, C], [B, C, A], [C, A, B]].map(([p, q, r]) => ensureFoot(scene, p.id, [q.id, r.id]).object);
    // H ile köşelerin orta noktaları
    const hOrtalar = pts.map(p => ensureMidpoint(scene, H.id, p.id).object);

    const gecenler = ortalar.map(p => p.id) as [string, string, string];
    const eski = scene.ofType('circle').find(x => x.throughPointIds?.length === 3 && gecenler.every(id => x.throughPointIds!.includes(id)));
    const cember = eski ?? scene.addCircle({ throughIds: gecenler }, { label: `${tri.name} Dokuz Nokta Çemberi`, fillOpacity: 0, showArea: false, showPerimeter: false });
    const yaricap = cevrel.radius / 2;
    const odak = [cember.id];
    let merkezNotu = '';
    if (O && N) {
      odak.push(N.id);
      merkezNotu = uzaklik(O, H) < 1e-9
        ? ` Merkezi ${named(N)}; eşkenar üçgende ${O.label} (çevrel merkez) ve ${H.label} (diklik merkezi) ile çakışır.`
        : ` Merkezi ${named(N)}, ${O.label}${H.label} doğru parçasının orta noktasıdır (Euler doğrusu üzerinde).`;
    }
    scene.say(`${tri.name} üçgeninin dokuz nokta çemberi ${eski ? 'zaten var' : 'çizildi'} (r = R / 2 = ${trNum(yaricap)} br): kenar orta noktaları ${joinTr(ortalar.map(p => p.label))}; yükseklik ayakları ${joinTr(ayaklar.map(p => p.label))}; ${H.label} ile köşelerin orta noktaları ${joinTr(hOrtalar.map(p => p.label))}.${merkezNotu}`);
    cumleRengiUygula(c, scene);
    scene.setFocus(odak);
  },
};

export const handlers: CommandHandler[] = [disTegetCember, eulerDogrusu, dokuzNoktaCemberi];
