/**
 * «Simetri Keşfet» İLKOKUL kipinde bir SINAMA aracıdır (alan uzmanı Umut IŞIK, geoeba (3).xlsx [178]): öğrenci şeklin
 * üzerine aday bir doğru çizer, «Katla» ile şeklin bir yarısı doğru üzerinden katlanır; iki yarı örtüşüyorsa doğru bir
 * simetri doğrusudur, örtüşmüyorsa örtüşmeyen bölge renklenir. Kare, dikdörtgen ve düzgün çokgenlerde bulunan simetri
 * doğruları sayılabilir (TYMM MAT.2.3.7, MAT.3.3.6, MAT.4.3.8: simetri doğrularını belirleme). «Yansıt» simetrik
 * TAMAMLAMA için kalır (MAT.3.3.7, MAT.4.3.9).
 *
 * Saf geometri; yansıma var olan `reflectPointAcrossLine` (math/geometry.ts) ile hesaplanır.
 */
import type { Point2D } from '@/types/math';
import { reflectPointAcrossLine } from '@/math/geometry';

export interface Dogru {
  a: Point2D;
  b: Point2D;
}

const EPS = 1e-9;

const fark = (p: Point2D, q: Point2D) => Math.hypot(p.x - q.x, p.y - q.y);

/**
 * Şeklin ölçüsüne göre karşılaştırma payı. Yansıma 2 basamağa yuvarlanır (reflectPointAcrossLine) VE Düzgün Çokgen
 * penceresi köşeleri 2 basamağa yuvarlar (RegularPolygonDialog): ikisi birlikte ≈ 0,03 br sapma verir. 0,02'lik pay
 * küçük düzgün sekizgenin simetri doğrularının yarısını reddediyordu (denetim, 4. tur [178]); 0,05 br ekranda ~1-2 px.
 */
function pay(koseler: readonly Point2D[]): number {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of koseler) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  return Math.max(0.05, 0.002 * Math.hypot(x1 - x0, y1 - y0));
}

/** Ardışık aynı köşeler ve doğrusal (açısı 180° olan) ara köşeler atılır: aynı şeklin en sade köşe dizisi. */
export function sadeKoseler(koseler: readonly Point2D[]): Point2D[] {
  let k = koseler.filter((p, i) => fark(p, koseler[(i + 1) % koseler.length]) > 1e-6);
  let degisti = true;
  while (degisti && k.length > 3) {
    degisti = false;
    for (let i = 0; i < k.length; i++) {
      const o = k[(i - 1 + k.length) % k.length], p = k[i], s = k[(i + 1) % k.length];
      const capraz = (p.x - o.x) * (s.y - p.y) - (p.y - o.y) * (s.x - p.x);
      if (Math.abs(capraz) < 1e-6 * Math.max(1, fark(o, p) * fark(p, s))) {
        k = k.filter((_, j) => j !== i);
        degisti = true;
        break;
      }
    }
  }
  return k;
}

/** Noktanın a→b doğrusuna işaretli uzaklığı (solda pozitif). */
export function isaretliUzaklik(p: Point2D, d: Dogru): number {
  const dx = d.b.x - d.a.x, dy = d.b.y - d.a.y;
  const boy = Math.hypot(dx, dy);
  if (boy < EPS) return 0;
  return (dx * (p.y - d.a.y) - dy * (p.x - d.a.x)) / boy;
}

/**
 * Doğru bu çokgenin simetri doğrusu mu? Köşelerin doğruya göre yansımaları yine köşelere düşmeli VE komşuluk
 * korunmalı (yansıyan köşe dizisi, şeklin köşe dizisinin dönmüş ya da ters çevrilmiş hâli): yansıyan şekil şeklin
 * kendisiyle örtüşür.
 */
export function simetriDogrusuMu(koseler: readonly Point2D[], d: Dogru): boolean {
  if (fark(d.a, d.b) < EPS) return false;
  const k = sadeKoseler(koseler);
  const n = k.length;
  if (n < 3) return false;
  const e = pay(k);
  const sigma: number[] = [];
  for (const p of k) {
    const r = reflectPointAcrossLine(p, d.a, d.b);
    const j = k.findIndex((q) => fark(q, r) < e);
    if (j < 0) return false;
    sigma.push(j);
  }
  const adim = (i: number) => (((sigma[(i + 1) % n] - sigma[i]) % n) + n) % n;
  const ilk = adim(0);
  if (ilk !== 1 && ilk !== n - 1) return false;
  for (let i = 1; i < n; i++) if (adim(i) !== ilk) return false;
  return true;
}

/** Köşelerin ağırlık merkezi: şeklin her simetri doğrusu bundan geçer (simetri köşe kümesini kendine eşler). */
export function koseMerkezi(koseler: readonly Point2D[]): Point2D {
  const k = sadeKoseler(koseler);
  return { x: k.reduce((t, p) => t + p.x, 0) / k.length, y: k.reduce((t, p) => t + p.y, 0) / k.length };
}

/**
 * Tuvalde çizili bir PARÇA bu şeklin simetri doğrusu olarak sayılır mı? Doğrusu simetri doğrusu olmalı VE parça şeklin
 * üzerinden geçmeli (köşe merkezi parçanın iki ucu arasında). Yoksa yan yana duran iki şeklin aynı doğrultudaki simetri
 * doğrusu (ör. karenin yatay orta doğrusu, aynı yükseklikteki dikdörtgenin de simetri doğrusudur) öbür şeklin
 * "Bulunan" sayacına karışıyordu (denetim, 4. tur [178]).
 */
export function sekilUzerindekiSimetriDogrusuMu(koseler: readonly Point2D[], parca: Dogru): boolean {
  if (!simetriDogrusuMu(koseler, parca)) return false;
  const m = koseMerkezi(koseler);
  const dx = parca.b.x - parca.a.x, dy = parca.b.y - parca.a.y;
  const t = ((m.x - parca.a.x) * dx + (m.y - parca.a.y) * dy) / (dx * dx + dy * dy);
  return t >= -1e-6 && t <= 1 + 1e-6;
}

/**
 * İki doğru aynı doğru mu? (aynı doğrultu ve d2'nin orta noktası d1'in üstünde). Karşılaştırılanlar hep AYNI şeklin
 * sınanmış simetri doğrularıdır (ikisi de köşe merkezinden geçer; ayrı simetri doğruları en az 180°/n açılıdır), bu yüzden
 * pay, tuvale 2 basamağa yuvarlanarak yazılan uçları ve Düzgün Çokgen penceresinin yuvarladığı köşeleri karşılar:
 * eski pay (sin < 0,001, iki uç 0,02 içinde) düzgün beşgende köşeden ve karşı kenarın ortasından geçen AYNI doğruyu iki kez
 * sayıyordu ("9 simetri doğrusu"; denetim, 4. tur [178]).
 */
export function ayniDogruMu(d1: Dogru, d2: Dogru, e = 0.05): boolean {
  const u1 = { x: d1.b.x - d1.a.x, y: d1.b.y - d1.a.y };
  const u2 = { x: d2.b.x - d2.a.x, y: d2.b.y - d2.a.y };
  const b1 = Math.hypot(u1.x, u1.y), b2 = Math.hypot(u2.x, u2.y);
  if (b1 < EPS || b2 < EPS) return false;
  const sin = Math.abs(u1.x * u2.y - u1.y * u2.x) / (b1 * b2);
  const orta = { x: (d2.a.x + d2.b.x) / 2, y: (d2.a.y + d2.b.y) / 2 };
  return sin < 0.03 && Math.abs(isaretliUzaklik(orta, d1)) < e;
}

/**
 * Şeklin bütün simetri doğruları (kare 4, dikdörtgen 2, eşkenar üçgen 3, düzgün n-gen n; simetrisi yoksa boş).
 * Adaylar: köşe merkezinden geçip bir köşeden ya da bir kenarın ortasından geçen doğrular; her aday sınanır.
 */
export function simetriDogrulari(koseler: readonly Point2D[]): Dogru[] {
  const k = sadeKoseler(koseler);
  if (k.length < 3) return [];
  const m = koseMerkezi(k);
  const adaylar: Point2D[] = [];
  k.forEach((p, i) => {
    const s = k[(i + 1) % k.length];
    adaylar.push(p, { x: (p.x + s.x) / 2, y: (p.y + s.y) / 2 });
  });
  const sonuc: Dogru[] = [];
  for (const p of adaylar) {
    if (fark(p, m) < 1e-6) continue;
    const d = { a: m, b: p };
    if (!simetriDogrusuMu(k, d)) continue;
    if (sonuc.some((x) => ayniDogruMu(x, d))) continue;
    sonuc.push(d);
  }
  return sonuc;
}

/**
 * Çokgeni doğrunun iki yanına ayırır (yarı düzlemle kırpma, Sutherland–Hodgman): `sol` doğrunun solundaki parça,
 * `sag` sağındaki. Doğru şeklin içinden geçmiyorsa parçalardan biri boştur.
 */
export function yarilaraAyir(koseler: readonly Point2D[], d: Dogru): { sol: Point2D[]; sag: Point2D[] } {
  const kirp = (isaret: 1 | -1): Point2D[] => {
    const out: Point2D[] = [];
    const n = koseler.length;
    for (let i = 0; i < n; i++) {
      const p = koseler[i], q = koseler[(i + 1) % n];
      const sp = isaret * isaretliUzaklik(p, d), sq = isaret * isaretliUzaklik(q, d);
      if (sp >= -EPS) out.push(p);
      if ((sp > EPS && sq < -EPS) || (sp < -EPS && sq > EPS)) {
        const t = sp / (sp - sq);
        out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
      }
    }
    return alan(out) > 1e-9 ? out : [];
  };
  return { sol: kirp(1), sag: kirp(-1) };
}

/** Çokgen alanı (mutlak) */
export function alan(k: readonly Point2D[]): number {
  let t = 0;
  for (let i = 0; i < k.length; i++) {
    const p = k[i], q = k[(i + 1) % k.length];
    t += p.x * q.y - q.x * p.y;
  }
  return Math.abs(t) / 2;
}

/** Doğru şekli iki parçaya ayırıyor mu (içinden geçiyor mu)? */
export function sekliBoluyorMu(koseler: readonly Point2D[], d: Dogru): boolean {
  const { sol, sag } = yarilaraAyir(koseler, d);
  return sol.length > 0 && sag.length > 0;
}

/**
 * Katlama canlandırması: noktanın doğru üzerinden katlanırken (kâğıt doğru çevresinde döner) üstten görünen yeri.
 * t = 0 yerinde, t = 1 yansıması (reflectPointAcrossLine); arada doğruya uzaklığı cos(π t) ile kısalır.
 */
export function katlanmisNokta(p: Point2D, d: Dogru, t: number): Point2D {
  if (t >= 1) return reflectPointAcrossLine(p, d.a, d.b);
  if (t <= 0) return { x: p.x, y: p.y };
  const dx = d.b.x - d.a.x, dy = d.b.y - d.a.y;
  const boy2 = dx * dx + dy * dy;
  if (boy2 < EPS) return { x: p.x, y: p.y };
  const u = ((p.x - d.a.x) * dx + (p.y - d.a.y) * dy) / boy2;
  const ayak = { x: d.a.x + u * dx, y: d.a.y + u * dy };
  const c = Math.cos(Math.PI * t);
  return { x: ayak.x + (p.x - ayak.x) * c, y: ayak.y + (p.y - ayak.y) * c };
}

/** Katlanan yarı: şeklin doğrunun SOLUNDAKİ parçası (boşsa sağdaki) ve öbür yarı. */
export function katlamaYarilari(koseler: readonly Point2D[], d: Dogru): { katlanan: Point2D[]; sabit: Point2D[] } {
  const { sol, sag } = yarilaraAyir(koseler, d);
  return sol.length > 0 ? { katlanan: sol, sabit: sag } : { katlanan: sag, sabit: sol };
}

/** Noktanın çokgenin içinde olup olmadığı (çift-tek kuralı) */
export function icindeMi(p: Point2D, k: readonly Point2D[]): boolean {
  let ic = false;
  for (let i = 0, j = k.length - 1; i < k.length; j = i++) {
    const a = k[i], b = k[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ic = !ic;
  }
  return ic;
}

/**
 * ÖRTÜŞME DENETİMİ (sayısal): katlanan yarının yansıması ile öbür yarı ızgara örnekleriyle karşılaştırılır; dönen
 * değer örtüşmeyen alanın şeklin alanına oranıdır (0: tam örtüşme). Tuvaldeki "örtüşmeyen bölge" bu iki parçanın
 * çift-tek dolgusudur (yalnız birinin örttüğü yerler).
 */
export function ortusmeyenOran(koseler: readonly Point2D[], d: Dogru, ornek = 80): number {
  const { katlanan, sabit } = katlamaYarilari(koseler, d);
  const yansiyan = katlanan.map((p) => reflectPointAcrossLine(p, d.a, d.b));
  const hepsi = [...koseler, ...yansiyan];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of hepsi) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  const hx = (x1 - x0) / ornek, hy = (y1 - y0) / ornek;
  let ortusmeyen = 0;
  for (let i = 0; i < ornek; i++) {
    for (let j = 0; j < ornek; j++) {
      const p = { x: x0 + (i + 0.5) * hx, y: y0 + (j + 0.5) * hy };
      if (icindeMi(p, yansiyan) !== (sabit.length > 0 && icindeMi(p, sabit))) ortusmeyen++;
    }
  }
  const sekil = alan(koseler);
  return sekil > 0 ? (ortusmeyen * hx * hy) / sekil : 1;
}

/**
 * Aday doğrunun ucunu yakalar: yakındaysa şeklin köşesine, kenar ortasına ya da köşe merkezine; değilse yarım
 * birimlik ızgara noktasına (3 br'lik karenin simetri doğrusu x = 1,5'ten geçer). `esik` dünya biriminde.
 */
export function adayNoktasi(p: Point2D, koseler: readonly Point2D[], esik: number): Point2D {
  const k = sadeKoseler(koseler);
  const ozel: Point2D[] = [...k];
  k.forEach((q, i) => {
    const s = k[(i + 1) % k.length];
    ozel.push({ x: (q.x + s.x) / 2, y: (q.y + s.y) / 2 });
  });
  if (k.length >= 3) ozel.push(koseMerkezi(k));
  let enIyi: Point2D | null = null;
  let enKisa = esik;
  for (const q of ozel) {
    const u = fark(p, q);
    if (u <= enKisa) {
      enKisa = u;
      enIyi = q;
    }
  }
  if (enIyi) return { x: enIyi.x, y: enIyi.y };
  return { x: Math.round(p.x * 2) / 2, y: Math.round(p.y * 2) / 2 };
}

/**
 * Doğrunun şekil üzerinde çizilecek parçası: köşelerin doğru üzerine izdüşümlerinin kapladığı aralık, iki uçtan
 * `uzanti` kadar uzatılır (doğru şeklin iki yanına taşar, kâğıt katlama çizgisi gibi).
 */
export function sekilUzerindeParca(koseler: readonly Point2D[], d: Dogru, uzanti = 0.8): Dogru {
  const dx = d.b.x - d.a.x, dy = d.b.y - d.a.y;
  const boy = Math.hypot(dx, dy);
  if (boy < EPS) return d;
  const ux = dx / boy, uy = dy / boy;
  let t0 = Infinity, t1 = -Infinity;
  for (const p of [...koseler, d.a, d.b]) {
    const t = (p.x - d.a.x) * ux + (p.y - d.a.y) * uy;
    t0 = Math.min(t0, t);
    t1 = Math.max(t1, t);
  }
  return {
    a: { x: d.a.x + (t0 - uzanti) * ux, y: d.a.y + (t0 - uzanti) * uy },
    b: { x: d.a.x + (t1 + uzanti) * ux, y: d.a.y + (t1 + uzanti) * uy },
  };
}

/** Sınama sonucu */
export type SinamaSonucu = 'dogru' | 'yanlis' | 'disinda';

/** Aday doğrunun sınama sonucu: şekli bölmüyorsa 'disinda', simetri doğrusuysa 'dogru', değilse 'yanlis'. */
export function adayiSina(koseler: readonly Point2D[], d: Dogru): SinamaSonucu {
  if (!sekliBoluyorMu(koseler, d)) return 'disinda';
  return simetriDogrusuMu(koseler, d) ? 'dogru' : 'yanlis';
}

/** Sınama sonucunun öğrenciye bildirimi */
export function sinamaBildirimi(sonuc: SinamaSonucu): string {
  switch (sonuc) {
    case 'dogru':
      return 'Evet! İki yarı tam örtüştü: Bu bir simetri doğrusu.';
    case 'yanlis':
      return 'İki yarı örtüşmedi: Renkli bölgeler üst üste gelmiyor. Bu bir simetri doğrusu değil; başka bir doğru dene.';
    case 'disinda':
      return 'Doğru şeklin içinden geçmiyor. Simetri doğrusu şekli iki parçaya ayırır.';
  }
}

/** "Bu şeklin 4 simetri doğrusu var." / "Bu şeklin simetri doğrusu yok." */
export function simetriSayisiMetni(sayi: number): string {
  return sayi === 0 ? 'Bu şeklin simetri doğrusu yok.' : `Bu şeklin ${sayi} simetri doğrusu var.`;
}
