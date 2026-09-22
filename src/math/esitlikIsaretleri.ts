/**
 * EŞİTLİK İŞARETLERİ (ÇENTİKLER) — ders kitabı eşlik gösterimi: eşit uzunluktaki doğru parçaları / kenarlar ve
 * eş yaylar ortalarından geçen aynı sayıda kısa çizgiyle (|, ||, |||, ||||) işaretlenir.
 *
 * Saf modül: çizim (Canvas) yalnızca buradan dönen listeyi çizer; komutlar ve sağ tık menüsü de aynı sonucu okur.
 *
 * Kurallar
 * - OTOMATİK işaret yalnız BİRBİRİNE DEĞEN (birleşik) şekillerde konur: ortak nokta, üst üste düşen noktalar,
 *   bir şeklin üzerine konmuş nokta (onObjectId, kesişim/teğet inşası) ya da bir şeklin köşesinin başka bir şeklin
 *   kenarında/çemberinde durması. Birbirinden ayrı şekillerin eşit uzunlukları otomatik işaretlenmez.
 * - Eşitlik TAM eşitliktir (kayan nokta gürültüsü kadar tolerans): işaret "eştir" iddiasıdır; ekranda ikisi de
 *   "10,39" yazan 10,39 ile 10,388 işaretlenmez.
 * - Aynı çizgi tek öğedir: parçanın üzerine düşen çokgen kenarı, iki çokgenin ortak kenarı (köşegen) "kendine eşit" sayılmaz.
 * - Bir birleşik gruptaki farklı eşitlik grupları 1, 2, 3, 4 çizgi alır; sıra nesnelerin sahnedeki ilk görünüşüne göredir
 *   (sürükleme sırayı değiştirmez, çizgi sayıları kararlı kalır). Numaralama alanı: sınır kutuları çakışan/değen şekiller
 *   (dokunuyor gibi görünen ayrı şekillerde aynı sayı eşitsiz kenarlara verilmesin).
 * - Açı kolları (armOfAngleId) otomatik gruplamaya girmez (kolların eşit boyu yalnız çizim varsayılanıdır); elle işaretlenebilir.
 * - ELLE işaret (parça/yay: equalityMark, çokgen kenarı: edgeEqualityMarks) otomatiği ezer: 0 = işaretsiz, 1–4 = çizgi sayısı.
 *   Elle konan sayılar, aynı numaralama alanındaki otomatik gruplara verilmez.
 */
import type { MathObject, Point2D, PointObject, PolygonObject } from '@/types/math';
import { getArcGeometry } from './geometry';
import { commandCircleGeometry } from './commandBindings';
import { isArcMeasurement, resolveArc } from './arcMeasure';

// ------------------------------------------------------------------ sabitler
/** Uzunluk eşitliği: |a − b| ≤ UZUNLUK_BAGIL·max(a, b) + UZUNLUK_MUTLAK (komutların 9 basamaklı yuvarlaması dahil). */
export const UZUNLUK_BAGIL = 1e-7;
export const UZUNLUK_MUTLAK = 4e-9;
/** Merkez açı (radyan) eşitliği. */
export const ACI_BAGIL = 1e-7;
export const ACI_MUTLAK = 1e-9;
/**
 * Değme (çakışan nokta, kenar üzerindeki köşe) toleransı, dünya birimi. Eşitlikten çok daha gevşektir: değme bir
 * eşlik iddiası değildir ve arayüzün 4 basamaklı yuvarladığı noktalar (öteleme kopyaları) da değmiş sayılmalı.
 */
export const TEMAS_MUTLAK = 1e-4;
/** En çok çizgi sayısı. */
export const ESITLIK_EN_COK = 4;
/** Bundan kalabalık otomatik grup işaretlenmez (döşemeler, çok kenarlı düzgün çokgenler); elle işaret yine konabilir. */
export const OTOMATIK_GRUP_EN_COK = 12;
export const CIZGI_ADLARI = ['işaretsiz', 'tek çizgi', 'iki çizgi', 'üç çizgi', 'dört çizgi'] as const;

// ------------------------------------------------------------------ türler
export type EsitlikTuru = 'duz' | 'yay';
export type CizgiSayisi = 1 | 2 | 3 | 4;

interface OgeGeometrisi {
  /** Temsilci öğenin anahtarı: 'seg:<id>', 'edge:<çokgenId>:<i>', 'arc:<id>' */
  anahtar: string;
  tur: EsitlikTuru;
  /** Çizgi rengini ve seçim rengini veren nesne */
  sahipId: string;
  /** Çokgen kenarıysa kenar dizini */
  kenar?: number;
  /** Sahibin çizim rengi (katman varsayılanlarıyla) */
  renk: string;
  /** Sahibin taban çizgi kalınlığı (strokeScale uygulanmadan) */
  kalinlik: number;
  /** İlk görünüş sırası (sahne dizini·4096 + kenar dizini) */
  sira: number;
  /** Düz öğe: uçlar (dünya) */
  a?: Point2D;
  b?: Point2D;
  /** Yay: merkez, yarıçap, başlangıç açısı ve saat yönü tersine tarama (radyan, dünya) */
  merkez?: Point2D;
  yaricap?: number;
  baslangic?: number;
  tarama?: number;
}

/** Çizilecek bir çentik öbeği. */
export interface EsitlikIsareti extends OgeGeometrisi {
  sayi: CizgiSayisi;
  kaynak: 'otomatik' | 'elle';
}

/** Tekilleştirilmiş öğe: aynı çizgiyi gösteren tüm anahtarlar (parça + üzerine düşen kenar, ortak kenar…) tek öğedir. */
export interface EsitlikOgesi extends OgeGeometrisi {
  /** Aynı çizginin tüm anahtarları, temsilci önce */
  uyeler: string[];
  /** Düz öğede uzunluk, yayda yay uzunluğu */
  uzunluk: number;
  /** Birleşik grup (bağlı bileşen) kimliği */
  bilesen: string;
  /** Numaralama alanı kimliği */
  alan: string;
  /** Etkin elle değer (0–4); yoksa otomatik */
  elle?: number;
  /** Tüm üyeleri açı kolu: otomatik gruplamaya girmez */
  aciKolu: boolean;
}

export interface EsitlikGrubu {
  tur: EsitlikTuru;
  sayi: CizgiSayisi;
  /** Temsilci anahtarlar, ilk görünüş sırasıyla */
  anahtarlar: string[];
  uzunluk: number;
  bilesen: string;
  alan: string;
}

export interface EsitlikSonucu {
  /** Çizilecek işaretler (ilk görünüş sırasıyla) */
  isaretler: EsitlikIsareti[];
  /** Temsilci anahtar → öğe */
  ogeler: Map<string, EsitlikOgesi>;
  /** Herhangi bir üye anahtarı → temsilci anahtar */
  temsilci: Map<string, string>;
  /** Otomatik eşitlik grupları */
  gruplar: EsitlikGrubu[];
  /** İşaret çizilen çokgen kenarları `${çokgenId}:${i}` (ortak kenarın iki çokgendeki kopyası dahil); etiketler dışarı itilir. */
  isaretliKenarlar: Set<string>;
  /** İşaret çizilen öğelerin tüm üye anahtarları */
  isaretliAnahtarlar: Set<string>;
  /** Temsilci anahtar → çizilen işaret */
  isaretHaritasi: Map<string, EsitlikIsareti>;
  /** Sahnede elle kullanılan çizgi sayıları (1–4), türe göre */
  elleSayilar: { duz: Set<number>; yay: Set<number> };
  otomatik: boolean;
}

// ------------------------------------------------------------------ anahtarlar
export const parcaAnahtari = (id: string) => `seg:${id}`;
export const kenarAnahtari = (cokgenId: string, i: number) => `edge:${cokgenId}:${i}`;
export const yayAnahtari = (id: string) => `arc:${id}`;

/** 'seg:id' | 'edge:id:i' | 'arc:id' anahtarını çözer. */
export function anahtarCoz(anahtar: string): { tur: 'seg' | 'edge' | 'arc'; id: string; kenar?: number } | null {
  if (anahtar.startsWith('seg:')) return anahtar.length > 4 ? { tur: 'seg', id: anahtar.slice(4) } : null;
  if (anahtar.startsWith('arc:')) return anahtar.length > 4 ? { tur: 'arc', id: anahtar.slice(4) } : null;
  if (anahtar.startsWith('edge:')) {
    const son = anahtar.lastIndexOf(':');
    const id = anahtar.slice(5, son);
    const kenar = Number(anahtar.slice(son + 1));
    return son > 5 && id && Number.isInteger(kenar) && kenar >= 0 ? { tur: 'edge', id, kenar } : null;
  }
  return null;
}

// ------------------------------------------------------------------ küçük yardımcılar
const sonlu = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const gecerliElle = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= ESITLIK_EN_COK;
const gorunur = (o: MathObject) => o.visible !== false;
const IKI_PI = 2 * Math.PI;
const aciFarki = (a: number, b: number) => {
  const d = (((a - b) % IKI_PI) + IKI_PI) % IKI_PI;
  return Math.min(d, IKI_PI - d);
};
const uzunlukEsit = (a: number, b: number) => Math.abs(a - b) <= UZUNLUK_BAGIL * Math.max(a, b) + UZUNLUK_MUTLAK;
const aciEsit = (a: number, b: number) => Math.abs(a - b) <= ACI_BAGIL * Math.max(a, b) + ACI_MUTLAK;
const temasToleransi = (p: Point2D) => TEMAS_MUTLAK + 1e-9 * Math.max(Math.abs(p.x), Math.abs(p.y));

const BAGLAYICI = new Set(['segment', 'line', 'ray', 'circle', 'ellipse', 'arc', 'sector', 'polygon']);

class BirlesimKumesi {
  private ata = new Map<string, string>();
  bul(x: string): string {
    let r = x;
    for (let n = this.ata.get(r); n !== undefined && n !== r; n = this.ata.get(r)) r = n;
    if (!this.ata.has(r)) this.ata.set(r, r);
    // yol sıkıştırma
    let y = x;
    while (y !== r) {
      const n = this.ata.get(y)!;
      this.ata.set(y, r);
      y = n;
    }
    return r;
  }
  birlestir(a: string, b: string) {
    const ra = this.bul(a), rb = this.bul(b);
    if (ra !== rb) this.ata.set(ra, rb);
  }
}

/**
 * Yay ölçümünün (iki nokta arası, çember bölünmeden) geometrisi: yay ölçümü katmanıyla (7.5) AYNI çözüm
 * (arcMeasure.resolveArc), böylece çentik tam vurgulanan yayın ortasına düşer.
 */
function olcumYayi(m: MathObject, objects: readonly MathObject[]): { merkez: Point2D; yaricap: number; baslangic: number; tarama: number } | null {
  if (!isArcMeasurement(m)) return null;
  let y: ReturnType<typeof resolveArc> = null;
  try { y = resolveArc(m, objects); } catch { return null; }
  if (!y || !(y.sweep > 1e-9) || !(y.radius > 1e-9) || !sonlu(y.center.x) || !sonlu(y.center.y)) return null;
  return { merkez: y.center, yaricap: y.radius, baslangic: y.startAngle, tarama: y.sweep };
}

/** Elle değer okuma: parça/yay/dilim/yay ölçümü equalityMark, çokgen kenarı edgeEqualityMarks. */
function elleDeger(o: MathObject | undefined, kenar?: number): number | undefined {
  if (!o) return undefined;
  if (o.type === 'polygon') {
    const v = kenar === undefined ? undefined : o.edgeEqualityMarks?.[String(kenar)];
    return gecerliElle(v) ? v : undefined;
  }
  const v = (o as { equalityMark?: unknown }).equalityMark;
  return gecerliElle(v) ? v : undefined;
}

// ------------------------------------------------------------------ ana hesap
interface HamOge extends OgeGeometrisi {
  uyeler: { anahtar: string; sira: number; id: string; kenar?: number; kol: boolean; segment: boolean }[];
  uzunluk: number;
  bilesenDugumu: string;
}

/**
 * Sahnedeki eşitlik işaretlerini hesaplar. `otomatik: false` iken yalnız elle konan işaretler döner.
 * Bozuk başvurularda hata atmaz (eksik noktalı öğe atlanır).
 */
export function esitlikIsaretleri(objects: readonly MathObject[], secenek: { otomatik?: boolean } = {}): EsitlikSonucu {
  const otomatik = secenek.otomatik !== false;
  // 0) dizin
  const byId = new Map<string, MathObject>();
  const sira = new Map<string, number>();
  const pts = new Map<string, PointObject>();
  objects.forEach((o, i) => {
    if (!o || typeof o.id !== 'string' || byId.has(o.id)) return;
    byId.set(o.id, o);
    sira.set(o.id, i);
    if (o.type === 'point' && sonlu(o.x) && sonlu(o.y)) pts.set(o.id, o);
  });
  const baglayiciMi = (o: MathObject | undefined): o is MathObject => !!o && BAGLAYICI.has(o.type) && gorunur(o);

  // 1) yaylar (uç noktaları çakışma aramasına katılır)
  const yayGeo = new Map<string, { merkez: Point2D; yaricap: number; baslangic: number; tarama: number }>();
  for (const o of objects) {
    if (!o || (o.type !== 'arc' && o.type !== 'sector') || !gorunur(o)) continue;
    const c = pts.get(o.centerPointId), s = pts.get(o.startPointId), d = pts.get(o.directionPointId);
    if (!c || !s || !d) continue;
    const g = getArcGeometry(c, s, d);
    if (!g || !(g.sweep > 1e-9) || !sonlu(g.radius)) continue;
    yayGeo.set(o.id, { merkez: { x: c.x, y: c.y }, yaricap: g.radius, baslangic: g.startAngle, tarama: g.sweep });
  }

  // 2) çakışan noktalar → tek kanonik kimlik (ızgara karması, 3×3 komşu hücre)
  let enBuyukTol = TEMAS_MUTLAK;
  for (const p of pts.values()) enBuyukTol = Math.max(enBuyukTol, temasToleransi(p));
  const sonNoktalari: { id: string; yayId: string; p: Point2D }[] = [];
  for (const [id, g] of yayGeo) {
    const aci = g.baslangic + g.tarama;
    const p = { x: g.merkez.x + g.yaricap * Math.cos(aci), y: g.merkez.y + g.yaricap * Math.sin(aci) };
    if (!sonlu(p.x) || !sonlu(p.y)) continue;
    sonNoktalari.push({ id: `~son:${id}`, yayId: id, p });
    enBuyukTol = Math.max(enBuyukTol, temasToleransi(p));
  }
  const hucre = 2 * enBuyukTol;
  const izgara = new Map<string, { id: string; x: number; y: number; tol: number }[]>();
  const hk = (x: number, y: number) => `${Math.floor(x / hucre)},${Math.floor(y / hucre)}`;
  const kanonik = new Map<string, string>();
  const yakindaki = (x: number, y: number, tol: number): string | undefined => {
    const gx = Math.floor(x / hucre), gy = Math.floor(y / hucre);
    let enIyi: string | undefined, enIyiUzaklik = Infinity;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const liste = izgara.get(`${gx + dx},${gy + dy}`);
      if (!liste) continue;
      for (const q of liste) {
        const u = Math.hypot(q.x - x, q.y - y);
        if (u <= Math.max(tol, q.tol) && u < enIyiUzaklik) { enIyi = q.id; enIyiUzaklik = u; }
      }
    }
    return enIyi;
  };
  const yerlestir = (id: string, x: number, y: number, tol: number) => {
    const k = hk(x, y);
    const liste = izgara.get(k);
    if (liste) liste.push({ id, x, y, tol }); else izgara.set(k, [{ id, x, y, tol }]);
  };
  for (const p of pts.values()) {
    const tol = temasToleransi(p);
    const onceki = yakindaki(p.x, p.y, tol);
    if (onceki) kanonik.set(p.id, onceki);
    else { kanonik.set(p.id, p.id); yerlestir(p.id, p.x, p.y, tol); }
  }
  const C = (id: string) => kanonik.get(id) ?? id;

  // 3) değme çizgesi (birleşim kümesi)
  const uf = new BirlesimKumesi();
  for (const son of sonNoktalari) {
    const tol = temasToleransi(son.p);
    const onceki = yakindaki(son.p.x, son.p.y, tol);
    if (onceki) uf.birlestir(son.yayId, onceki);
    else { yerlestir(son.id, son.p.x, son.p.y, tol); uf.birlestir(son.yayId, son.id); }
  }
  const tanimNoktalari = (o: MathObject): (string | undefined)[] => {
    switch (o.type) {
      case 'segment': return [o.startPointId, o.endPointId];
      case 'line': return [o.point1Id, o.point2Id];
      case 'ray': return [o.startPointId, o.throughPointId];
      case 'polygon': return Array.isArray(o.pointIds) ? o.pointIds : [];
      case 'circle': return o.throughPointIds?.length ? o.throughPointIds : [o.centerPointId, o.radiusPointId];
      case 'ellipse': return [o.centerPointId];
      case 'arc': case 'sector': return [o.centerPointId, o.startPointId, o.directionPointId];
      default: return [];
    }
  };
  const kullanilanNoktalar = new Set<string>();
  for (const o of objects) {
    if (!baglayiciMi(o)) continue;
    uf.bul(o.id);
    for (const d of tanimNoktalari(o)) {
      if (!d || !pts.has(d)) continue;
      uf.birlestir(o.id, C(d));
      kullanilanNoktalar.add(C(d));
    }
  }
  for (const p of pts.values()) {
    const cp = C(p.id);
    if (p.onObjectId && baglayiciMi(byId.get(p.onObjectId))) { uf.birlestir(cp, p.onObjectId); kullanilanNoktalar.add(cp); }
    const k = p.construction;
    if (k?.kind === 'intersection') {
      for (const h of k.objectIds ?? []) if (baglayiciMi(byId.get(h))) { uf.birlestir(cp, h); kullanilanNoktalar.add(cp); }
    } else if (k?.kind === 'tangent' && baglayiciMi(byId.get(k.circleId))) { uf.birlestir(cp, k.circleId); kullanilanNoktalar.add(cp); }
  }

  // 4) düz öğeler (parça + çokgen kenarı), aynı çizgi tek öğe
  const duzAileleri = new Map<string, HamOge>();
  const duzEkle = (o: MathObject, anahtar: string, aId: string, bId: string, kenar: number | undefined, renk: string, kalinlik: number) => {
    const a = pts.get(aId), b = pts.get(bId);
    if (!a || !b) return;
    const ca = C(aId), cb = C(bId);
    if (ca === cb) return;
    const uzunluk = Math.hypot(a.x - b.x, a.y - b.y);
    if (!(uzunluk > 0) || !sonlu(uzunluk)) return;
    const ciftAnahtari = ca < cb ? `${ca}|${cb}` : `${cb}|${ca}`;
    const s = (sira.get(o.id) ?? 0) * 4096 + (kenar ?? 0);
    const segment = o.type === 'segment';
    const uye = { anahtar, sira: s, id: o.id, kenar, kol: segment && !!(o as { armOfAngleId?: string }).armOfAngleId, segment };
    const mevcut = duzAileleri.get(ciftAnahtari);
    if (!mevcut) {
      duzAileleri.set(ciftAnahtari, {
        anahtar, tur: 'duz', sahipId: o.id, kenar, renk, kalinlik, sira: s, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y },
        uyeler: [uye], uzunluk, bilesenDugumu: o.id,
      });
      return;
    }
    mevcut.uyeler.push(uye);
    mevcut.sira = Math.min(mevcut.sira, s);
    // Parça, çokgen kenarının üstünde çizilir: temsilci ilk parçadır
    const temsilciParcaMi = mevcut.uyeler.some((u) => u.anahtar === mevcut.anahtar && u.segment);
    if (segment && !temsilciParcaMi) {
      Object.assign(mevcut, { anahtar, sahipId: o.id, kenar, renk, kalinlik, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, uzunluk, bilesenDugumu: o.id });
    }
  };
  for (const o of objects) {
    if (!o || !gorunur(o)) continue;
    if (o.type === 'segment') {
      duzEkle(o, parcaAnahtari(o.id), o.startPointId, o.endPointId, undefined, o.color || '#0284c7', sonlu(o.thickness) && o.thickness > 0 ? o.thickness : 2.5);
    } else if (o.type === 'polygon' && Array.isArray(o.pointIds)) {
      const n = o.pointIds.length;
      if (n < 2) continue;
      for (let i = 0; i < n; i++) duzEkle(o, kenarAnahtari(o.id, i), o.pointIds[i], o.pointIds[(i + 1) % n], i, o.color || '#10b981', 2);
    }
  }

  // 5) geometrik değme: bir şeklin tanım noktası başka bir şeklin kenarında / doğrusunda / çemberinde
  {
    type Tasiyici = { sahip: string; a: Point2D; b: Point2D; tip: 'parca' | 'dogru' | 'isin'; uc: [string, string] };
    const tasiyicilar: Tasiyici[] = [];
    for (const aile of duzAileleri.values()) {
      const u = aile.uyeler[0];
      const o = byId.get(u.id)!;
      const [x, y] = o.type === 'segment' ? [o.startPointId, o.endPointId] : o.type === 'polygon' ? [o.pointIds[u.kenar!], o.pointIds[(u.kenar! + 1) % o.pointIds.length]] : ['', ''];
      tasiyicilar.push({ sahip: aile.bilesenDugumu, a: aile.a!, b: aile.b!, tip: 'parca', uc: [C(x), C(y)] });
    }
    const sonsuzlar: Tasiyici[] = [];
    const cemberler: { sahip: string; merkez: Point2D; r: number; baslangic?: number; tarama?: number }[] = [];
    for (const o of objects) {
      if (!baglayiciMi(o)) continue;
      if (o.type === 'line' || o.type === 'ray') {
        const [x, y] = o.type === 'line' ? [o.point1Id, o.point2Id] : [o.startPointId, o.throughPointId];
        const a = pts.get(x), b = pts.get(y);
        if (a && b && Math.hypot(a.x - b.x, a.y - b.y) > 1e-12) sonsuzlar.push({ sahip: o.id, a, b, tip: o.type === 'line' ? 'dogru' : 'isin', uc: [C(x), C(y)] });
      } else if (o.type === 'circle') {
        try {
          const g = commandCircleGeometry(o, (id) => { const p = pts.get(id); if (!p) throw new Error('eksik'); return p; });
          if (g.radius > 1e-9 && sonlu(g.radius)) cemberler.push({ sahip: o.id, merkez: g.center, r: g.radius });
        } catch { /* tanımsız çember değmez */ }
      } else if (o.type === 'arc' || o.type === 'sector') {
        const g = yayGeo.get(o.id);
        if (g) cemberler.push({ sahip: o.id, merkez: g.merkez, r: g.yaricap, baslangic: g.baslangic, tarama: g.tarama });
      }
    }
    // Düz taşıyıcılar için tek biçimli ızgara (sınır kutuları)
    let toplam = 0;
    for (const t of tasiyicilar) toplam += Math.hypot(t.a.x - t.b.x, t.a.y - t.b.y);
    const kutu = Math.max(tasiyicilar.length ? toplam / tasiyicilar.length : 1, 1e-3);
    const tIzgara = new Map<string, number[]>();
    const genis: number[] = [];
    tasiyicilar.forEach((t, i) => {
      const tol = Math.max(temasToleransi(t.a), temasToleransi(t.b));
      const x0 = Math.floor((Math.min(t.a.x, t.b.x) - tol) / kutu), x1 = Math.floor((Math.max(t.a.x, t.b.x) + tol) / kutu);
      const y0 = Math.floor((Math.min(t.a.y, t.b.y) - tol) / kutu), y1 = Math.floor((Math.max(t.a.y, t.b.y) + tol) / kutu);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 256) { genis.push(i); return; }
      for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
        const k = `${gx},${gy}`;
        const l = tIzgara.get(k);
        if (l) l.push(i); else tIzgara.set(k, [i]);
      }
    });
    const ustundeMi = (p: Point2D, t: Tasiyici, tol: number) => {
      const dx = t.b.x - t.a.x, dy = t.b.y - t.a.y;
      const L2 = dx * dx + dy * dy;
      if (!(L2 > 0)) return false;
      const u = ((p.x - t.a.x) * dx + (p.y - t.a.y) * dy) / L2;
      if (t.tip === 'parca' && (u < 0 || u > 1)) return false;
      if (t.tip === 'isin' && u < 0) return false;
      return Math.hypot(p.x - (t.a.x + u * dx), p.y - (t.a.y + u * dy)) <= tol;
    };
    const cemberKontrolu = cemberler.length * kullanilanNoktalar.size <= 400000;
    for (const pid of kullanilanNoktalar) {
      const p = pts.get(pid);
      if (!p) continue;
      const tol = temasToleransi(p);
      const aday = new Set<number>(tIzgara.get(`${Math.floor(p.x / kutu)},${Math.floor(p.y / kutu)}`) ?? []);
      for (const i of genis) aday.add(i);
      for (const i of aday) {
        const t = tasiyicilar[i];
        if (t.uc[0] === pid || t.uc[1] === pid) continue;
        if (ustundeMi(p, t, tol)) uf.birlestir(pid, t.sahip);
      }
      for (const t of sonsuzlar) {
        if (t.uc[0] === pid || t.uc[1] === pid) continue;
        if (ustundeMi(p, t, tol)) uf.birlestir(pid, t.sahip);
      }
      if (!cemberKontrolu) continue;
      for (const c of cemberler) {
        const u = Math.hypot(p.x - c.merkez.x, p.y - c.merkez.y);
        if (Math.abs(u - c.r) > tol) continue;
        if (c.tarama !== undefined && c.baslangic !== undefined) {
          const fark = (((Math.atan2(p.y - c.merkez.y, p.x - c.merkez.x) - c.baslangic) % IKI_PI) + IKI_PI) % IKI_PI;
          if (fark > c.tarama + tol / c.r && IKI_PI - fark > tol / c.r) continue;
        }
        uf.birlestir(pid, c.sahip);
      }
    }
  }

  // 6) yay öğeleri (yay, dilim, iki nokta arası yay ölçümü); aynı yay tek öğe
  const yayListesi: HamOge[] = [];
  const yayEkle = (o: MathObject, g: { merkez: Point2D; yaricap: number; baslangic: number; tarama: number }, renk: string, kalinlik: number, bilesenDugumu: string) => {
    const anahtar = yayAnahtari(o.id);
    const s = (sira.get(o.id) ?? 0) * 4096;
    const uye = { anahtar, sira: s, id: o.id, kol: false, segment: false };
    const tol = temasToleransi(g.merkez) + 1e-9 * g.yaricap;
    const ayni = yayListesi.length <= 400
      ? yayListesi.find((y) => Math.abs(y.merkez!.x - g.merkez.x) <= tol && Math.abs(y.merkez!.y - g.merkez.y) <= tol
        && uzunlukEsit(y.yaricap!, g.yaricap) && aciFarki(y.baslangic!, g.baslangic) <= 1e-7 && Math.abs(y.tarama! - g.tarama) <= 1e-7)
      : undefined;
    if (ayni) {
      ayni.uyeler.push(uye);
      ayni.sira = Math.min(ayni.sira, s);
      return;
    }
    yayListesi.push({
      anahtar, tur: 'yay', sahipId: o.id, renk, kalinlik, sira: s, merkez: g.merkez, yaricap: g.yaricap, baslangic: g.baslangic, tarama: g.tarama,
      uyeler: [uye], uzunluk: g.yaricap * g.tarama, bilesenDugumu,
    });
  };
  for (const o of objects) {
    if (!o || !gorunur(o)) continue;
    if (o.type === 'arc' || o.type === 'sector') {
      const g = yayGeo.get(o.id);
      if (!g) continue;
      const kal = (o as { thickness?: number }).thickness;
      yayEkle(o, g, o.color || (o.type === 'sector' ? '#10b981' : '#0284c7'), sonlu(kal) && kal > 0 ? kal : 3, o.id);
    } else if (o.type === 'measurement' && (o as { kind?: string }).kind === 'arc' && o.showValue !== false) {
      // Yay ölçümü bir BAĞLAYICI değildir (ayrı şekilleri birleştirmez); üzerinde durduğu çemberin grubuna aittir.
      // Gizlenmiş (showValue false) ölçüm çizilmez; işareti de çizilmez. Kalınlık: katmandaki vurgu (sw(6)).
      const g = olcumYayi(o, objects);
      if (!g) continue;
      const cember = o.circleId ? byId.get(o.circleId) : undefined;
      const dugum = baglayiciMi(cember) ? cember.id : C(o.pointIds?.[0] ?? o.id);
      yayEkle(o, g, o.color || '#65a30d', 6, dugum);
    }
  }

  // 7) bileşenler, numaralama alanları
  const hamOgeler: HamOge[] = [...duzAileleri.values(), ...yayListesi];
  const kutular = new Map<string, { x0: number; x1: number; y0: number; y1: number }>();
  const kutuyaEkle = (kok: string, x: number, y: number, r = 0) => {
    if (!sonlu(x) || !sonlu(y)) return;
    const k = kutular.get(kok);
    if (!k) kutular.set(kok, { x0: x - r, x1: x + r, y0: y - r, y1: y + r });
    else { k.x0 = Math.min(k.x0, x - r); k.x1 = Math.max(k.x1, x + r); k.y0 = Math.min(k.y0, y - r); k.y1 = Math.max(k.y1, y + r); }
  };
  for (const o of objects) {
    if (!baglayiciMi(o)) continue;
    const kok = uf.bul(o.id);
    if (o.type === 'circle') {
      try {
        const g = commandCircleGeometry(o, (id) => { const p = pts.get(id); if (!p) throw new Error('eksik'); return p; });
        kutuyaEkle(kok, g.center.x, g.center.y, g.radius);
      } catch { /* */ }
      continue;
    }
    if (o.type === 'ellipse') {
      const c = pts.get(o.centerPointId);
      if (c) kutuyaEkle(kok, c.x, c.y, Math.max(Math.abs(o.radiusX) || 0, Math.abs(o.radiusY) || 0));
      continue;
    }
    if (o.type === 'arc' || o.type === 'sector') {
      const g = yayGeo.get(o.id);
      if (g) kutuyaEkle(kok, g.merkez.x, g.merkez.y, g.yaricap);
      continue;
    }
    for (const d of tanimNoktalari(o)) { const p = d ? pts.get(d) : undefined; if (p) kutuyaEkle(kok, p.x, p.y); }
  }
  const alanUf = new BirlesimKumesi();
  {
    const liste = [...kutular.entries()].sort((a, b) => a[1].x0 - b[1].x0);
    const pay = TEMAS_MUTLAK * 10;
    let etkin: [string, { x0: number; x1: number; y0: number; y1: number }][] = [];
    for (const [kok, k] of liste) {
      alanUf.bul(kok);
      etkin = etkin.filter(([, e]) => e.x1 + pay >= k.x0);
      for (const [digeri, e] of etkin) if (e.y0 - pay <= k.y1 && k.y0 - pay <= e.y1) alanUf.birlestir(kok, digeri);
      etkin.push([kok, k]);
    }
  }

  // 8) öğeleri kesinleştir: temsilci önce, elle değer, açı kolu
  const ogeler = new Map<string, EsitlikOgesi>();
  const temsilci = new Map<string, string>();
  for (const h of hamOgeler) {
    const uyeler = [...h.uyeler].sort((a, b) => (a.anahtar === h.anahtar ? -1 : b.anahtar === h.anahtar ? 1 : a.sira - b.sira));
    let elle: number | undefined;
    for (const u of uyeler) {
      const v = elleDeger(byId.get(u.id), u.kenar);
      if (v !== undefined) { elle = v; break; }
    }
    const bilesen = uf.bul(h.bilesenDugumu);
    const oge: EsitlikOgesi = {
      anahtar: h.anahtar, tur: h.tur, sahipId: h.sahipId, kenar: h.kenar, renk: h.renk, kalinlik: h.kalinlik, sira: h.sira,
      a: h.a, b: h.b, merkez: h.merkez, yaricap: h.yaricap, baslangic: h.baslangic, tarama: h.tarama,
      uyeler: uyeler.map((u) => u.anahtar), uzunluk: h.uzunluk, bilesen, alan: alanUf.bul(bilesen), elle,
      aciKolu: h.tur === 'duz' && uyeler.every((u) => u.kol),
    };
    ogeler.set(oge.anahtar, oge);
    for (const u of oge.uyeler) temsilci.set(u, oge.anahtar);
  }

  // 9) elle işaretler
  const isaretler: EsitlikIsareti[] = [];
  const isaretle = (o: EsitlikOgesi, sayi: CizgiSayisi, kaynak: 'otomatik' | 'elle') => {
    isaretler.push({
      anahtar: o.anahtar, tur: o.tur, sahipId: o.sahipId, kenar: o.kenar, renk: o.renk, kalinlik: o.kalinlik, sira: o.sira,
      a: o.a, b: o.b, merkez: o.merkez, yaricap: o.yaricap, baslangic: o.baslangic, tarama: o.tarama, sayi, kaynak,
    });
  };
  const elleSayilar = { duz: new Set<number>(), yay: new Set<number>() };
  const alanElle = new Map<string, { duz: Set<number>; yay: Set<number> }>();
  for (const o of ogeler.values()) {
    if (o.elle === undefined || o.elle === 0) continue;
    isaretle(o, o.elle as CizgiSayisi, 'elle');
    elleSayilar[o.tur].add(o.elle);
    const k = alanElle.get(o.alan) ?? { duz: new Set<number>(), yay: new Set<number>() };
    k[o.tur].add(o.elle);
    alanElle.set(o.alan, k);
  }

  // 10) otomatik gruplar
  const gruplar: EsitlikGrubu[] = [];
  if (otomatik) {
    const bilesenler = new Map<string, EsitlikOgesi[]>();
    for (const o of ogeler.values()) {
      if (o.elle !== undefined || o.aciKolu) continue;
      const k = `${o.tur} ${o.bilesen}`;
      const l = bilesenler.get(k);
      if (l) l.push(o); else bilesenler.set(k, [o]);
    }
    const adaylar: { tur: EsitlikTuru; uyeler: EsitlikOgesi[]; alan: string; bilesen: string; sira: number }[] = [];
    const kumele = <T,>(liste: T[], deger: (x: T) => number, esit: (a: number, b: number) => boolean): T[][] => {
      const sirali = [...liste].sort((a, b) => deger(a) - deger(b));
      const sonuc: T[][] = [];
      let ilk: T | undefined;
      for (const x of sirali) {
        if (ilk !== undefined && esit(deger(ilk), deger(x))) sonuc[sonuc.length - 1].push(x);
        else { sonuc.push([x]); ilk = x; }
      }
      return sonuc;
    };
    for (const liste of bilesenler.values()) {
      if (liste.length < 2) continue;
      const tur = liste[0].tur;
      const kumeler = tur === 'duz'
        ? kumele(liste, (o) => o.uzunluk, uzunlukEsit)
        : kumele(liste, (o) => o.yaricap!, uzunlukEsit).flatMap((k) => kumele(k, (o) => o.tarama!, aciEsit));
      for (const k of kumeler) {
        if (k.length < 2 || k.length > OTOMATIK_GRUP_EN_COK) continue;
        k.sort((a, b) => a.sira - b.sira);
        adaylar.push({ tur, uyeler: k, alan: k[0].alan, bilesen: k[0].bilesen, sira: k[0].sira });
      }
    }
    adaylar.sort((a, b) => a.sira - b.sira);
    const alanSayac = new Map<string, number[]>();
    for (const g of adaylar) {
      const anahtar = `${g.tur} ${g.alan}`;
      let bos = alanSayac.get(anahtar);
      if (!bos) {
        const ayrilmis = alanElle.get(g.alan)?.[g.tur];
        bos = [1, 2, 3, 4].filter((n) => !ayrilmis?.has(n));
        alanSayac.set(anahtar, bos);
      }
      const sayi = bos.shift();
      if (sayi === undefined) continue; // bu alanda boş çizgi sayısı kalmadı: yanıltıcı yinelenen sayı yerine işaretsiz
      for (const o of g.uyeler) isaretle(o, sayi as CizgiSayisi, 'otomatik');
      gruplar.push({ tur: g.tur, sayi: sayi as CizgiSayisi, anahtarlar: g.uyeler.map((o) => o.anahtar), uzunluk: g.uyeler[0].uzunluk, bilesen: g.bilesen, alan: g.alan });
    }
  }

  // 11) bitir
  isaretler.sort((a, b) => a.sira - b.sira);
  const isaretliKenarlar = new Set<string>();
  const isaretliAnahtarlar = new Set<string>();
  const isaretHaritasi = new Map<string, EsitlikIsareti>();
  for (const m of isaretler) {
    isaretHaritasi.set(m.anahtar, m);
    for (const u of ogeler.get(m.anahtar)?.uyeler ?? [m.anahtar]) {
      isaretliAnahtarlar.add(u);
      const c = anahtarCoz(u);
      if (c?.tur === 'edge') isaretliKenarlar.add(`${c.id}:${c.kenar}`);
    }
  }
  return { isaretler, ogeler, temsilci, gruplar, isaretliKenarlar, isaretliAnahtarlar, isaretHaritasi, elleSayilar, otomatik };
}

// ------------------------------------------------------------------ yardımcılar (menü ve komutlar)

/** A ve B uçlu doğru parçası / çokgen kenarı ve yay anahtarları (görünür nesneler). */
export function esitlikHedefleri(objects: readonly MathObject[], aId: string, bId: string): { duz: string[]; yay: string[] } {
  const duz: string[] = [], yay: string[] = [];
  const ayni = (x: string | undefined, y: string | undefined) => (x === aId && y === bId) || (x === bId && y === aId);
  for (const o of objects) {
    if (!o || !gorunur(o)) continue;
    if (o.type === 'segment' && ayni(o.startPointId, o.endPointId)) duz.push(parcaAnahtari(o.id));
    else if (o.type === 'polygon' && Array.isArray(o.pointIds)) {
      const n = o.pointIds.length;
      for (let i = 0; i < n; i++) if (ayni(o.pointIds[i], o.pointIds[(i + 1) % n])) duz.push(kenarAnahtari(o.id, i));
    } else if ((o.type === 'arc' || o.type === 'sector') && ayni(o.startPointId, o.directionPointId)) yay.push(yayAnahtari(o.id));
    else if (o.type === 'measurement' && (o as { kind?: string }).kind === 'arc' && ayni(o.pointIds?.[0], o.pointIds?.[1])) yay.push(yayAnahtari(o.id));
  }
  return { duz, yay };
}

/** Anahtarın etkin elle değeri (0–4 ya da otomatik için undefined) ve şu an çizilen çizgi sayısı. */
export function etkinEsitlik(sonuc: EsitlikSonucu, anahtar: string): { elle?: number; sayi?: CizgiSayisi; kaynak?: 'otomatik' | 'elle'; temsilci: string } {
  const t = sonuc.temsilci.get(anahtar) ?? anahtar;
  const m = sonuc.isaretHaritasi.get(t);
  return { elle: sonuc.ogeler.get(t)?.elle, sayi: m?.sayi, kaynak: m?.kaynak, temsilci: t };
}

/**
 * Verilen öğeleri TEK eşitlik grubu olarak işaretlemek için çizgi sayısı: başka ellerle kullanılmayan ve hedeflerin
 * numaralama alanlarındaki (hedefleri içermeyen) otomatik gruplarda geçmeyen en küçük sayı; yoksa elle ayrılmamış en küçük
 * sayı; o da yoksa null. Hedeflerin kendi otomatik grubu hariç tutulur ("AC ile AD'yi eşit işaretle" tek çizgide kalır).
 */
export function sonrakiEsitlikSayisi(sonuc: EsitlikSonucu, tur: EsitlikTuru, anahtarlar: string[]): CizgiSayisi | null {
  const hedefler = new Set(anahtarlar.map((a) => sonuc.temsilci.get(a) ?? a));
  const alanlar = new Set([...hedefler].map((h) => sonuc.ogeler.get(h)?.alan).filter((x): x is string => !!x));
  const elle = new Set<number>();
  for (const o of sonuc.ogeler.values()) if (o.tur === tur && !hedefler.has(o.anahtar) && o.elle) elle.add(o.elle);
  const kullanilan = new Set(elle);
  for (const g of sonuc.gruplar) {
    if (g.tur !== tur || !alanlar.has(g.alan) || g.anahtarlar.some((a) => hedefler.has(a))) continue;
    kullanilan.add(g.sayi);
  }
  for (let k = 1; k <= ESITLIK_EN_COK; k++) if (!kullanilan.has(k)) return k as CizgiSayisi;
  for (let k = 1; k <= ESITLIK_EN_COK; k++) if (!elle.has(k)) return k as CizgiSayisi;
  return null;
}

/** Nesne başına yama: equalityMark ya da edgeEqualityMarks (undefined = alanı sil). */
export interface EsitlikYamasi {
  id: string;
  patch: { equalityMark?: number; edgeEqualityMarks?: Record<string, number> };
}

/**
 * Elle değer yazma yamaları. Değer, aynı çizginin/yayın TÜM üyelerine yazılır (parça + üzerindeki çokgen kenarı gibi):
 * biri silinse de işaret kaybolmaz ve etkin değer tektir. deger undefined = Otomatik (alan silinir).
 * Yalnız gerçekten bir şey değiştiren yamalar döner.
 */
export function esitlikYamalari(objects: readonly MathObject[], sonuc: EsitlikSonucu, istekler: { anahtar: string; deger: number | undefined }[]): EsitlikYamasi[] {
  const byId = new Map(objects.map((o) => [o.id, o]));
  const tekil = new Map<string, number | undefined>(); // nesne id → yeni equalityMark
  const kenarlar = new Map<string, Record<string, number>>(); // çokgen id → yeni kayıt
  const kenarDegisti = new Set<string>();
  for (const { anahtar, deger } of istekler) {
    if (deger !== undefined && !gecerliElle(deger)) continue;
    const t = sonuc.temsilci.get(anahtar) ?? anahtar;
    const uyeler = sonuc.ogeler.get(t)?.uyeler ?? [anahtar];
    for (const u of uyeler) {
      const c = anahtarCoz(u);
      if (!c) continue;
      const o = byId.get(c.id);
      if (!o) continue;
      if (c.tur === 'edge') {
        if (o.type !== 'polygon') continue;
        const kayit = kenarlar.get(o.id) ?? { ...((o as PolygonObject).edgeEqualityMarks ?? {}) };
        if (deger === undefined) delete kayit[String(c.kenar)]; else kayit[String(c.kenar)] = deger;
        kenarlar.set(o.id, kayit);
        kenarDegisti.add(o.id);
      } else tekil.set(o.id, deger);
    }
  }
  const yamalar: EsitlikYamasi[] = [];
  for (const [id, deger] of tekil) {
    const onceki = (byId.get(id) as { equalityMark?: number } | undefined)?.equalityMark;
    if (onceki !== deger) yamalar.push({ id, patch: { equalityMark: deger } });
  }
  for (const id of kenarDegisti) {
    const kayit = kenarlar.get(id)!;
    const yeni = Object.keys(kayit).length ? kayit : undefined;
    const onceki = (byId.get(id) as PolygonObject).edgeEqualityMarks;
    if (JSON.stringify(onceki ?? null) !== JSON.stringify(yeni ?? null)) yamalar.push({ id, patch: { edgeEqualityMarks: yeni } });
  }
  return yamalar;
}

/** Yamaları uygular (yeni dizi); değeri undefined olan alanlar nesneden tamamen silinir (JSON temiz kalır). */
export function esitlikYamalariniUygula(objects: readonly MathObject[], yamalar: EsitlikYamasi[]): MathObject[] {
  if (!yamalar.length) return [...objects];
  const harita = new Map<string, EsitlikYamasi['patch']>();
  for (const y of yamalar) harita.set(y.id, { ...(harita.get(y.id) ?? {}), ...y.patch });
  return objects.map((o) => {
    const p = harita.get(o.id);
    if (!p) return o;
    const kopya = { ...o } as Record<string, unknown>;
    for (const [k, v] of Object.entries(p)) {
      if (v === undefined) delete kopya[k]; else kopya[k] = v;
    }
    return kopya as unknown as MathObject;
  });
}

/** Tüm elle eşitlik işaretlerini (0 dahil) kaldıran yamalar. */
export function tumElleIsaretleriniTemizle(objects: readonly MathObject[]): EsitlikYamasi[] {
  const yamalar: EsitlikYamasi[] = [];
  for (const o of objects) {
    const r = o as { equalityMark?: number; edgeEqualityMarks?: Record<string, number> };
    const patch: EsitlikYamasi['patch'] = {};
    if (r.equalityMark !== undefined) patch.equalityMark = undefined;
    if (r.edgeEqualityMarks !== undefined) patch.edgeEqualityMarks = undefined;
    if (Object.keys(patch).length) yamalar.push({ id: o.id, patch });
  }
  return yamalar;
}

/** Öğenin okunur adı: '[AB]' (parça/kenar), 'AB Yayı' (yay). */
export function esitlikOgesiAdi(objects: readonly MathObject[], anahtar: string): string {
  const c = anahtarCoz(anahtar);
  if (!c) return anahtar;
  const o = objects.find((x) => x.id === c.id);
  if (!o) return anahtar;
  const ad = (id: string | undefined) => (objects.find((x) => x.id === id && x.type === 'point') as PointObject | undefined)?.label || '?';
  if (c.tur === 'seg' && o.type === 'segment') return /^\[.*\]$/.test(o.label || '') ? o.label : `[${ad(o.startPointId)}${ad(o.endPointId)}]`;
  if (c.tur === 'edge' && o.type === 'polygon') {
    const n = o.pointIds.length;
    return `[${ad(o.pointIds[c.kenar!])}${ad(o.pointIds[(c.kenar! + 1) % n])}]`;
  }
  if (o.type === 'measurement') return `${ad(o.pointIds?.[0])}${ad(o.pointIds?.[1])} Yayı`;
  return o.label || anahtar;
}
