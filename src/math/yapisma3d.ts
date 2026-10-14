import type { Point3D, Solid3DObject } from '@/types/workspace3d';
import { generateSolidMesh } from './geometry3d';
import { cisimMerkezi, eulerMatrisi } from './donusum3d';

/**
 * 3B «Mıknatıs» (YAP3B, kullanıcı isteği 14.10.2026: «3B'de nesneleri yan yana snap'leyebilme»). Saf, three.js'siz,
 * belirlenimci: Canvas3D taşıma sürüklemesinin ham ötelemesini (`hamDelta`) bu kurallardan geçirir.
 *
 * Öğrenciye söylenen kural:
 *   1. Yerde ya da bir cismin üstünde duran cisim, ortası hangi düz üst yüzün üstüne gelirse oraya oturur; hiçbirine
 *      gelmezse yere iner. Havada duran cisim yüksekliğini korur.
 *   2. Yanındaki cisme yaklaşınca ona dayanır; cisimler iç içe girmez.
 *   3. Dayandığı cisimle kenarları ya da ortası hizalanır (eğri yüzlü ya da eğik duran cisimde yalnız ortası).
 *   4. Başka bir şeye yakın değilse kareli zemine oturur.
 * Öncelik: temas > hiza > ızgara; yükseklik 1. kuraldan gelir.
 *
 * Gövde modeli: dünya eksenli kutu + kutu düzlemlerinde yatan gerçek yüzler + «dilim kesiti»: iki cismin ortak
 * yükseklik diliminde alınan yatay kesit (çokyüzlüde köşe ve ayrıt kesişimlerinin kutusu, düşey silindir / koni ve
 * kürede daire; küre–küre 3B). Kesit cismi her zaman kapsar (tutucu): yapışma iç içe geçirmez, eğik cisimde boşluk
 * kalabilir. Ağ işi yalnız `yapismaOturumuKur`'da (sürükleme başına bir kez); `yapistir` kare başına ağ üretmez.
 */

export type Eksen3 = 'x' | 'y' | 'z';
type Yatay = 'x' | 'y';
export type YuzYonu = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
/** Yüz düzlemindeki nokta: ±x → (y, z), ±y → (x, z), ±z → (x, y) */
export interface Nokta2 {
  u: number;
  v: number;
}
export interface Kutu3 {
  min: Point3D;
  max: Point3D;
}

/** Değme payı (br): konumlar 0,01'e yuvarlandığından bu kadar örtüşme «değme» sayılır. */
export const TEMAS_PAYI = 0.01;
export const IZGARA_ADIMI_3B = 1;
/** Eşikler ekran pikselinde (giriş / çıkış: histerezis); dünya birimine `esikler` çevirir. */
export const ESIK_PX = { temas: 14, temasCikis: 20, hiza: 12, hizaCikis: 16, izgara: 10, izgaraCikis: 14, destek: 6 } as const;
export const DOKUNMA_CARPANI = 1.5;
export const ESIK_EN_AZ = 0.05;
export const ESIK_EN_COK = 0.75;

const DIK_ACI_TOLERANSI = 1e-3;
const DUZLEM_TOLERANSI = 1e-6;
/**
 * Silindir / koninin ekseni dünyada düşey sayılır: eksenin yatay bileşeni bunu aşmaz. Tasarımdaki 1e-3 (2,6°) kesit
 * dairesini tutucu olmaktan çıkarırdı (3 br boyda 0,13 br taşma); 1e-6 ile taşma 0,00001 br altında kalır.
 */
const DUSEY_EKSEN_TOLERANSI = 1e-6;
const IZ_UZATMA = 0.3;
/** Çakışma çözümünde birleşik (x + y) aday için her eksenden alınan en yakın tekil aday sayısı */
const BIRLESIK_ADAY = 4;
const SIFIR: Readonly<Point3D> = Object.freeze({ x: 0, y: 0, z: 0 });
const YATAYLAR: readonly Yatay[] = ['x', 'y'];
const DUZLEM_EKSENLERI: Readonly<Record<Eksen3, readonly [Eksen3, Eksen3]>> = { x: ['y', 'z'], y: ['x', 'z'], z: ['x', 'y'] };

export type GovdeProfili =
  | { tur: 'cokyuzlu'; koseler: Point3D[]; ayritlar: [number, number][] }
  | { tur: 'silindir' | 'koni_yukari' | 'koni_asagi'; cx: number; cy: number; r: number }
  | { tur: 'kure'; c: Point3D; r: number };

export interface YapismaGovdesi {
  id: string;
  /** Başlangıç konumundaki dünya eksenli kutu */
  kutu: Kutu3;
  /** Kutu düzlemlerinde yatan gerçek düz yüzler; '+z' = düz üst yüz */
  yuzler: Partial<Record<YuzYonu, Nokta2[]>>;
  hiza: 'kenar' | 'orta';
  profil: GovdeProfili;
}

export type Kesit =
  | { tur: 'kutu'; minX: number; maxX: number; minY: number; maxY: number }
  | { tur: 'daire'; cx: number; cy: number; r: number };

const oteki = (u: Yatay): Yatay => (u === 'x' ? 'y' : 'x');
const kirp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);
const topla = (p: Point3D, q: Readonly<Point3D>): Point3D => ({ x: p.x + q.x, y: p.y + q.y, z: p.z + q.z });
/** Bir sayının [a, b] aralığına uzaklığı (içindeyse 0) */
const aralikUzakligi = (n: number, a: number, b: number) => (n < a ? a - n : n > b ? n - b : 0);
const kMin = (k: Extract<Kesit, { tur: 'kutu' }>, e: Yatay) => (e === 'x' ? k.minX : k.minY);
const kMax = (k: Extract<Kesit, { tur: 'kutu' }>, e: Yatay) => (e === 'x' ? k.maxX : k.maxY);
const kMer = (k: Extract<Kesit, { tur: 'daire' }>, e: Yatay) => (e === 'x' ? k.cx : k.cy);
const ciftAnahtari = (m: YapismaGovdesi, h: YapismaGovdesi) => `${m.id}|${h.id}`;

function gizliMi(s: Solid3DObject): boolean {
  return typeof s.opacity === 'number' && !(s.opacity > 0);
}

/** Dönme matrisinin her öğesi 0 ya da ±1 mi (çeyrek dönüşler: yüzler yine eksenlere dik)? */
export function dikAciliMi(rotation: Point3D): boolean {
  return eulerMatrisi(rotation).every((satir) =>
    satir.every((e) => {
      const a = Math.abs(e);
      return a <= DIK_ACI_TOLERANSI || Math.abs(a - 1) <= DIK_ACI_TOLERANSI;
    }),
  );
}

function noktaKutusu(noktalar: readonly Point3D[]): Kutu3 {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of noktalar) {
    if (p.x < min.x) min.x = p.x;
    if (p.y < min.y) min.y = p.y;
    if (p.z < min.z) min.z = p.z;
    if (p.x > max.x) max.x = p.x;
    if (p.y > max.y) max.y = p.y;
    if (p.z > max.z) max.z = p.z;
  }
  return { min, max };
}

/** Ardışık (ve son–ilk) yinelenen köşeleri atar. */
function tekillestir(noktalar: Nokta2[]): Nokta2[] {
  const out: Nokta2[] = [];
  for (const p of noktalar) {
    const son = out[out.length - 1];
    if (!son || Math.abs(son.u - p.u) > 1e-9 || Math.abs(son.v - p.v) > 1e-9) out.push(p);
  }
  while (out.length > 1 && Math.abs(out[0].u - out[out.length - 1].u) <= 1e-9 && Math.abs(out[0].v - out[out.length - 1].v) <= 1e-9) out.pop();
  return out;
}

function cokgenAlani(p: readonly Nokta2[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i];
    const r = p[(i + 1) % p.length];
    a += q.u * r.v - r.u * q.v;
  }
  return a / 2;
}

/**
 * Cismin yapışma gövdesi. Açınımlı ya da gizli → null. `konum` verilirse position yerine o kullanılır (sürükleme başı).
 */
export function yapismaGovdesi(solid: Solid3DObject, konum?: Point3D): YapismaGovdesi | null {
  if ((solid.unfoldProgress || 0) > 0 || gizliMi(solid)) return null;
  const s: Solid3DObject = { ...solid, position: konum ?? solid.position, unfoldProgress: 0 };
  const { vertices, faces } = generateSolidMesh(s);
  if (vertices.length === 0) return null;
  const kutu = noktaKutusu(vertices);

  const yuzler: Partial<Record<YuzYonu, Nokta2[]>> = {};
  for (const f of faces) {
    const n = f.normal;
    const eksen: Eksen3 | null =
      Math.abs(n.x) >= 1 - 1e-6 ? 'x' : Math.abs(n.y) >= 1 - 1e-6 ? 'y' : Math.abs(n.z) >= 1 - 1e-6 ? 'z' : null;
    if (!eksen) continue;
    const pts = f.vertexIndices.map((i) => vertices[i]).filter(Boolean);
    const ustte = pts.every((p) => Math.abs(p[eksen] - kutu.max[eksen]) <= DUZLEM_TOLERANSI);
    const altta = pts.every((p) => Math.abs(p[eksen] - kutu.min[eksen]) <= DUZLEM_TOLERANSI);
    if (ustte === altta) continue;
    const yon = `${ustte ? '+' : '-'}${eksen}` as YuzYonu;
    if (yuzler[yon]) continue;
    const [a, b] = DUZLEM_EKSENLERI[eksen];
    const cokgen = tekillestir(pts.map((p) => ({ u: p[a], v: p[b] })));
    if (cokgen.length >= 3 && Math.abs(cokgenAlani(cokgen)) > 1e-9) yuzler[yon] = cokgen;
  }

  const hiza: 'kenar' | 'orta' =
    (s.type === 'cube' || s.type === 'prism' || s.type === 'triangular_prism' || s.type === 'pyramid') && dikAciliMi(s.rotation)
      ? 'kenar'
      : 'orta';

  const w = s.dimensions.width || 3;
  const r = s.dimensions.radius || w / 2;
  let profil: GovdeProfili;
  if (s.type === 'sphere') {
    const c = cisimMerkezi(s);
    profil = { tur: 'kure', c, r };
    // Kutu çözümsel: döndürülmüş küre ağının köşeleri en uç noktaları örneklemeyebilir
    kutu.min = { x: c.x - r, y: c.y - r, z: c.z - r };
    kutu.max = { x: c.x + r, y: c.y + r, z: c.z + r };
  } else if ((s.type === 'cylinder' || s.type === 'cone') && Math.hypot(eulerMatrisi(s.rotation)[0][2], eulerMatrisi(s.rotation)[1][2]) <= DUSEY_EKSEN_TOLERANSI) {
    const R = eulerMatrisi(s.rotation);
    const c = cisimMerkezi(s);
    profil = { tur: s.type === 'cylinder' ? 'silindir' : R[2][2] > 0 ? 'koni_yukari' : 'koni_asagi', cx: c.x, cy: c.y, r };
    kutu.min = { x: c.x - r, y: c.y - r, z: kutu.min.z };
    kutu.max = { x: c.x + r, y: c.y + r, z: kutu.max.z };
  } else {
    // Ayrıtlar yüzlerin kenarlarından (silindirin ağında yan ayrıt yoktur)
    const gorulen = new Set<number>();
    const ayritlar: [number, number][] = [];
    const n = vertices.length;
    for (const f of faces) {
      const ix = f.vertexIndices;
      for (let i = 0; i < ix.length; i++) {
        let a = ix[i];
        let b = ix[(i + 1) % ix.length];
        if (a === b || a === undefined || b === undefined) continue;
        if (a > b) [a, b] = [b, a];
        const k = a * n + b;
        if (gorulen.has(k)) continue;
        gorulen.add(k);
        ayritlar.push([a, b]);
      }
    }
    profil = { tur: 'cokyuzlu', koseler: vertices, ayritlar };
  }

  return { id: solid.id, kutu, yuzler, hiza, profil };
}

/**
 * Gövdenin `t` ötelemesiyle [zAlt, zUst] yatay dilimindeki kesiti (xy). Dilim gövdenin yükseklik aralığına hiç
 * girmiyorsa null. Çokyüzlüde dilimdeki köşeler ve ayrıtların iki sınır düzlemiyle kesişimlerinin kutusu.
 */
export function kesitAl(g: YapismaGovdesi, t: Readonly<Point3D>, zAlt: number, zUst: number): Kesit | null {
  const z0 = g.kutu.min.z + t.z;
  const z1 = g.kutu.max.z + t.z;
  const a = Math.max(zAlt, z0);
  const b = Math.min(zUst, z1);
  if (b < a - 1e-9) return null;
  const p = g.profil;
  switch (p.tur) {
    case 'kure': {
      const cz = p.c.z + t.z;
      const dz = cz - kirp(cz, a, b);
      return { tur: 'daire', cx: p.c.x + t.x, cy: p.c.y + t.y, r: Math.sqrt(Math.max(0, p.r * p.r - dz * dz)) };
    }
    case 'silindir':
      return { tur: 'daire', cx: p.cx + t.x, cy: p.cy + t.y, r: p.r };
    case 'koni_yukari':
    case 'koni_asagi': {
      const h = z1 - z0;
      const k = h > 1e-12 ? (p.tur === 'koni_yukari' ? 1 - (a - z0) / h : (b - z0) / h) : 1;
      return { tur: 'daire', cx: p.cx + t.x, cy: p.cy + t.y, r: p.r * kirp(k, 0, 1) };
    }
    case 'cokyuzlu': {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      const ekle = (x: number, y: number) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      };
      const E = 1e-9;
      for (const v of p.koseler) {
        const z = v.z + t.z;
        if (z >= a - E && z <= b + E) ekle(v.x, v.y);
      }
      for (const [i, j] of p.ayritlar) {
        const P1 = p.koseler[i];
        const P2 = p.koseler[j];
        const za = P1.z + t.z;
        const zb = P2.z + t.z;
        if ((za - a) * (zb - a) < 0) {
          const s = (a - za) / (zb - za);
          ekle(P1.x + s * (P2.x - P1.x), P1.y + s * (P2.y - P1.y));
        }
        if (b !== a && (za - b) * (zb - b) < 0) {
          const s = (b - za) / (zb - za);
          ekle(P1.x + s * (P2.x - P1.x), P1.y + s * (P2.y - P1.y));
        }
      }
      if (minX === Infinity) return null;
      return { tur: 'kutu', minX: minX + t.x, maxX: maxX + t.x, minY: minY + t.y, maxY: maxY + t.y };
    }
  }
}

/** İki gövdenin ortak yükseklik dilimi; kalınlığı `pay`'ı aşmıyorsa null (yatay ilişki yok). */
function dilim(a: YapismaGovdesi, ta: Readonly<Point3D>, b: YapismaGovdesi, tb: Readonly<Point3D>, pay = TEMAS_PAYI): { zAlt: number; zUst: number } | null {
  const zAlt = Math.max(a.kutu.min.z + ta.z, b.kutu.min.z + tb.z);
  const zUst = Math.min(a.kutu.max.z + ta.z, b.kutu.max.z + tb.z);
  return zUst - zAlt > pay ? { zAlt, zUst } : null;
}

/** İki kesit arasında u boyunca değme ötelemeleri (A'yı kaydıran) */
function kesitTemasi(A: Kesit, B: Kesit, u: Yatay): { once: number; sonra: number } | null {
  const v = oteki(u);
  if (A.tur === 'kutu' && B.tur === 'kutu') {
    const ortusme = Math.min(kMax(A, v), kMax(B, v)) - Math.max(kMin(A, v), kMin(B, v));
    if (ortusme <= TEMAS_PAYI) return null;
    return { once: kMin(B, u) - kMax(A, u), sonra: kMax(B, u) - kMin(A, u) };
  }
  if (A.tur === 'daire' && B.tur === 'kutu') {
    const dv = aralikUzakligi(kMer(A, v), kMin(B, v), kMax(B, v));
    if (dv >= A.r - TEMAS_PAYI) return null;
    const D = Math.sqrt(A.r * A.r - dv * dv);
    return { once: kMin(B, u) - D - kMer(A, u), sonra: kMax(B, u) + D - kMer(A, u) };
  }
  if (A.tur === 'kutu' && B.tur === 'daire') {
    const dv = aralikUzakligi(kMer(B, v), kMin(A, v), kMax(A, v));
    if (dv >= B.r - TEMAS_PAYI) return null;
    const D = Math.sqrt(B.r * B.r - dv * dv);
    return { once: kMer(B, u) - D - kMax(A, u), sonra: kMer(B, u) + D - kMin(A, u) };
  }
  const a = A as Extract<Kesit, { tur: 'daire' }>;
  const b = B as Extract<Kesit, { tur: 'daire' }>;
  const R = a.r + b.r;
  const dv = Math.abs(kMer(a, v) - kMer(b, v));
  if (dv >= R - TEMAS_PAYI) return null;
  const D = Math.sqrt(R * R - dv * dv);
  return { once: kMer(b, u) - D - kMer(a, u), sonra: kMer(b, u) + D - kMer(a, u) };
}

/**
 * m'yi (öteleme t) yalnız u boyunca kaydırıp h'ye (yerinde) değdiren iki ek öteleme: `once` m h'nin −u yanında,
 * `sonra` +u yanında. Yükseklik dilimi ya da v'de örtüşme yoksa null.
 */
export function temasOtelemesi(m: YapismaGovdesi, t: Readonly<Point3D>, h: YapismaGovdesi, u: 'x' | 'y'): { once: number; sonra: number } | null {
  if (m.profil.tur === 'kure' && h.profil.tur === 'kure') {
    const v = oteki(u);
    const R = m.profil.r + h.profil.r;
    const mc = topla(m.profil.c, t);
    const dz = mc.z - h.profil.c.z;
    const dv = mc[v] - h.profil.c[v];
    if (Math.hypot(dz, dv) >= R - TEMAS_PAYI) return null;
    const D = Math.sqrt(R * R - dz * dz - dv * dv);
    return { once: h.profil.c[u] - D - mc[u], sonra: h.profil.c[u] + D - mc[u] };
  }
  const d = dilim(m, t, h, SIFIR);
  if (!d) return null;
  const A = kesitAl(m, t, d.zAlt, d.zUst);
  const B = kesitAl(h, SIFIR, d.zAlt, d.zUst);
  if (!A || !B) return null;
  return kesitTemasi(A, B, u);
}

/** İki kesit `pay`'dan derin örtüşüyor mu? */
function kesitlerKesisir(A: Kesit, B: Kesit, pay: number): boolean {
  if (A.tur === 'kutu' && B.tur === 'kutu') {
    return Math.min(A.maxX, B.maxX) - Math.max(A.minX, B.minX) > pay && Math.min(A.maxY, B.maxY) - Math.max(A.minY, B.minY) > pay;
  }
  if (A.tur === 'daire' && B.tur === 'daire') return Math.hypot(A.cx - B.cx, A.cy - B.cy) < A.r + B.r - pay;
  const d = (A.tur === 'daire' ? A : B) as Extract<Kesit, { tur: 'daire' }>;
  const k = (A.tur === 'kutu' ? A : B) as Extract<Kesit, { tur: 'kutu' }>;
  return Math.hypot(aralikUzakligi(d.cx, k.minX, k.maxX), aralikUzakligi(d.cy, k.minY, k.maxY)) < d.r - pay;
}

/** a (öteleme ta) ile b (öteleme tb) `pay`'dan derin kesişiyor mu? Tutucu: gerçek çakışmaya hiçbir zaman «yok» demez. */
export function kesisir(a: YapismaGovdesi, ta: Readonly<Point3D>, b: YapismaGovdesi, tb: Readonly<Point3D> = SIFIR, pay = TEMAS_PAYI): boolean {
  if (a.profil.tur === 'kure' && b.profil.tur === 'kure') {
    const ca = topla(a.profil.c, ta);
    const cb = topla(b.profil.c, tb);
    return Math.hypot(ca.x - cb.x, ca.y - cb.y, ca.z - cb.z) < a.profil.r + b.profil.r - pay;
  }
  const d = dilim(a, ta, b, tb, pay);
  if (!d) return false;
  const A = kesitAl(a, ta, d.zAlt, d.zUst);
  const B = kesitAl(b, tb, d.zAlt, d.zUst);
  return !!A && !!B && kesitlerKesisir(A, B, pay);
}

/** Dışbükey çokgen içinde mi (kenarlardan `pay` kadar dışarısı da içeride sayılır)? */
export function noktaCokgendeMi(p: Nokta2, cokgen: readonly Nokta2[], pay = 0): boolean {
  const n = cokgen.length;
  if (n < 3) return false;
  const yon = cokgenAlani(cokgen) >= 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = cokgen[i];
    const b = cokgen[(i + 1) % n];
    const ex = b.u - a.u;
    const ey = b.v - a.v;
    const uz = Math.hypot(ex, ey);
    if (uz < 1e-12) continue;
    if (((ex * (p.v - a.v) - ey * (p.u - a.u)) * yon) / uz < -pay) return false;
  }
  return true;
}

/** Sutherland–Hodgman: a çokgeninin dışbükey b çokgeniyle kesişimi. */
export function cokgenKes(a: readonly Nokta2[], b: readonly Nokta2[]): Nokta2[] {
  if (a.length < 3 || b.length < 3) return [];
  const yon = cokgenAlani(b) >= 0 ? 1 : -1;
  let cikti: Nokta2[] = a.slice();
  for (let i = 0; i < b.length && cikti.length > 0; i++) {
    const p = b[i];
    const q = b[(i + 1) % b.length];
    const isaret = (x: Nokta2) => yon * ((q.u - p.u) * (x.v - p.v) - (q.v - p.v) * (x.u - p.u));
    const girdi = cikti;
    cikti = [];
    for (let j = 0; j < girdi.length; j++) {
      const cur = girdi[j];
      const prev = girdi[(j + girdi.length - 1) % girdi.length];
      const dc = isaret(cur);
      const dp = isaret(prev);
      const kes = () => {
        const s = dp / (dp - dc);
        return { u: prev.u + s * (cur.u - prev.u), v: prev.v + s * (cur.v - prev.v) };
      };
      if (dc >= -1e-12) {
        if (dp < -1e-12) cikti.push(kes());
        cikti.push(cur);
      } else if (dp >= -1e-12) cikti.push(kes());
    }
  }
  return tekillestir(cikti);
}

/**
 * m'nin (öteleme t) taban ortasının altındaki destek: ortayı (en az pay kadar içeride) taşıyan düz üst yüzlerin en yükseği, yoksa
 * zemin (z 0, id null). `onceki` destek yüzü `genisletme` kadar genişletilmiş hâliyle aday kalır (histerezis).
 */
export function destekBul(
  m: YapismaGovdesi,
  t: Readonly<Point3D>,
  hedefler: readonly YapismaGovdesi[],
  onceki: string | null = null,
  genisletme = 0,
): { z: number; id: string | null } {
  const c = { u: (m.kutu.min.x + m.kutu.max.x) / 2 + t.x, v: (m.kutu.min.y + m.kutu.max.y) / 2 + t.y };
  let z = 0;
  let id: string | null = null;
  for (const h of hedefler) {
    const yuz = h.yuzler['+z'];
    if (!yuz) continue;
    // Yeni destek: orta yüzün en az pay kadar İÇİNDE olmalı (tam kenarda duran orta, itilen cismi yüzün kıyısına
    // çıkarmasın); önceki destek genişletilmiş hâliyle aday kalır (histerezis)
    const pay = h.id === onceki ? Math.max(genisletme, TEMAS_PAYI) : -TEMAS_PAYI;
    if (c.u < h.kutu.min.x - pay || c.u > h.kutu.max.x + pay || c.v < h.kutu.min.y - pay || c.v > h.kutu.max.y + pay) continue;
    if (!noktaCokgendeMi(c, yuz, pay)) continue;
    const hz = h.kutu.max.z;
    if (hz > z + 1e-9 || (id !== onceki && h.id === onceki && Math.abs(hz - z) <= 1e-9)) {
      z = hz;
      id = h.id;
    }
  }
  return { z, id };
}

/* ------------------------------------------------------------------------------------------- oturum ve kare */

export type YapismaKipi = 'serbest' | Eksen3;

/** ok ekseni → o eksen; merkez + Shift (vertical) → 'z'; öteki → 'serbest' */
export function surukleKipi(axis: Eksen3 | 'free', vertical: boolean): YapismaKipi {
  if (axis !== 'free') return axis;
  return vertical ? 'z' : 'serbest';
}

export interface YapismaProfili {
  izgara: 'her_zaman' | 'otomatik';
  zeminEngel: boolean;
  hizaCizgisi: boolean;
}

export interface YapismaHafizasi {
  /** Son geçerli (iç içe geçmeyen) toplam öteleme; ilk değer {0,0,0} = başlangıç */
  sonGecerli: Point3D;
  /** Histerezis: eksen başına son karede uygulanan yapışmanın anahtarı */
  anahtarlar: Partial<Record<Eksen3, string>>;
  /** Üye → önceki karenin destek kimliği (null = zemin) */
  destek: Record<string, string | null>;
}

export interface YapismaOturumu {
  /** Canvas3D: it.startPositions (kimlik karşılaştırması: yeni sürükleme → yeni oturum) */
  kaynak: unknown;
  kip: YapismaKipi;
  profil: YapismaProfili;
  tasinanlar: YapismaGovdesi[];
  hedefler: YapismaGovdesi[];
  /** Başlangıçta kesişen (bilerek iç içe kurulmuş) çiftler: `${tasinanId}|${hedefId}` — o sürüklemede birbirini görmez */
  affedilen: ReadonlySet<string>;
  dayaniyordu: boolean;
  devreDisi: boolean;
  /** `yapistir` günceller */
  hafiza: YapismaHafizasi;
  /** İç: üye başına affedilmemiş hedefler (sahne sırası) */
  uyeHedefleri: Record<string, YapismaGovdesi[]>;
  /** İç: x / y / z okunda süpürme sınırları (başlangıca göre öteleme aralığı); serbest kipte null */
  sinir: { min: number; max: number } | null;
  /** İç: x / y okunda hiza ortakları (başlangıçta v'de değen komşular + başlangıç desteği) */
  eksenOrtaklari: Record<string, YapismaGovdesi[]>;
  /** İç: z okunda taban kesitleri örtüşen (aynı sütundaki) çiftler */
  sutun: [YapismaGovdesi, YapismaGovdesi][];
}

/** xy kutuları `pay`'dan fazla örtüşüyor mu (z'ye bakmaz)? */
function xyOrtusur(a: Kutu3, ta: Readonly<Point3D>, b: Kutu3, pay: number): boolean {
  return (
    Math.min(a.max.x + ta.x, b.max.x) - Math.max(a.min.x + ta.x, b.min.x) > pay &&
    Math.min(a.max.y + ta.y, b.max.y) - Math.max(a.min.y + ta.y, b.min.y) > pay
  );
}

export function yapismaOturumuKur(
  solids: readonly Solid3DObject[],
  tasinanIdler: readonly string[],
  baslangic: Readonly<Record<string, Point3D>>,
  kip: YapismaKipi,
  profil: YapismaProfili,
  kaynak?: unknown,
): YapismaOturumu {
  const idler = new Set(tasinanIdler);
  let devreDisi = false;
  const tasinanlar: YapismaGovdesi[] = [];
  const hedefler: YapismaGovdesi[] = [];
  for (const s of solids) {
    if (idler.has(s.id)) {
      if ((s.unfoldProgress || 0) > 0) {
        devreDisi = true;
        continue;
      }
      const g = yapismaGovdesi(s, baslangic[s.id] ?? s.position);
      if (g) tasinanlar.push(g);
    } else {
      const g = yapismaGovdesi(s);
      if (g) hedefler.push(g);
    }
  }
  if (tasinanlar.length === 0) devreDisi = true;

  const affedilen = new Set<string>();
  const uyeHedefleri: Record<string, YapismaGovdesi[]> = {};
  for (const m of tasinanlar) {
    const liste: YapismaGovdesi[] = [];
    for (const h of hedefler) {
      if (kesisir(m, SIFIR, h)) affedilen.add(ciftAnahtari(m, h));
      else liste.push(h);
    }
    uyeHedefleri[m.id] = liste;
  }

  const hafiza: YapismaHafizasi = { sonGecerli: { x: 0, y: 0, z: 0 }, anahtarlar: {}, destek: {} };
  let dayaniyordu = false;
  for (const m of tasinanlar) {
    const liste = uyeHedefleri[m.id];
    const d = destekBul(m, SIFIR, liste);
    hafiza.destek[m.id] = d.id;
    if (Math.abs(m.kutu.min.z - d.z) <= TEMAS_PAYI) dayaniyordu = true;
    // Tabanı bir düz üst yüze biniyor ama ortası dışarıda (elle konmuş): yine dayanıyor sayılır
    else {
      const alt = liste.find((h) => h.yuzler['+z'] && Math.abs(h.kutu.max.z - m.kutu.min.z) <= TEMAS_PAYI && xyOrtusur(m.kutu, SIFIR, h.kutu, TEMAS_PAYI));
      if (alt) {
        dayaniyordu = true;
        hafiza.destek[m.id] = alt.id;
      }
    }
  }

  let sinir: { min: number; max: number } | null = null;
  const eksenOrtaklari: Record<string, YapismaGovdesi[]> = {};
  const sutun: [YapismaGovdesi, YapismaGovdesi][] = [];
  if (kip === 'x' || kip === 'y') {
    const u = kip;
    const v = oteki(u);
    let min = -Infinity;
    let max = Infinity;
    for (const m of tasinanlar) {
      const ortaklar: YapismaGovdesi[] = [];
      for (const h of uyeHedefleri[m.id]) {
        const r = temasOtelemesi(m, SIFIR, h, u);
        if (r) {
          if (r.once >= -TEMAS_PAYI) max = Math.min(max, r.once);
          else if (r.sonra <= TEMAS_PAYI) min = Math.max(min, r.sonra);
        }
        const rv = temasOtelemesi(m, SIFIR, h, v);
        if (rv && (Math.abs(rv.once) <= TEMAS_PAYI || Math.abs(rv.sonra) <= TEMAS_PAYI)) ortaklar.push(h);
      }
      const dId = hafiza.destek[m.id];
      const dh = dId ? hedefler.find((h) => h.id === dId) : undefined;
      if (dh && !ortaklar.includes(dh)) ortaklar.push(dh);
      eksenOrtaklari[m.id] = ortaklar;
    }
    sinir = { min, max };
  } else if (kip === 'z') {
    let min = -Infinity;
    let max = Infinity;
    for (const m of tasinanlar) {
      const km = kesitAl(m, SIFIR, m.kutu.min.z, m.kutu.max.z);
      for (const h of uyeHedefleri[m.id]) {
        const kh = kesitAl(h, SIFIR, h.kutu.min.z, h.kutu.max.z);
        if (!km || !kh || !kesitlerKesisir(km, kh, TEMAS_PAYI)) continue;
        sutun.push([m, h]);
        if (h.kutu.min.z >= m.kutu.max.z - TEMAS_PAYI) max = Math.min(max, h.kutu.min.z - m.kutu.max.z);
        else if (h.kutu.max.z <= m.kutu.min.z + TEMAS_PAYI) min = Math.max(min, h.kutu.max.z - m.kutu.min.z);
      }
    }
    if (profil.zeminEngel && tasinanlar.length > 0) {
      const tabanZ = Math.min(...tasinanlar.map((m) => m.kutu.min.z));
      min = Math.max(min, Math.min(0 - tabanZ, 0));
    }
    sinir = { min, max };
  }

  return { kaynak, kip, profil, tasinanlar, hedefler, affedilen, dayaniyordu, devreDisi, hafiza, uyeHedefleri, sinir, eksenOrtaklari, sutun };
}

export interface YapismaGirdisi {
  hamDelta: Point3D;
  pikselBasinaBirim: number;
  dokunma?: boolean;
  izgaraGorunur: boolean;
  /** Sürüklerken Alt basılı: bu karede kurallar işlemez */
  geciciKapali?: boolean;
}
export type YapismaDurumu = 'serbest' | 'yapisti' | 'itildi' | 'durdu';
/** `cift`: `${tasinanId}|${hedefId}|<eksen>` — kılavuz yeni temas girişini bundan tanır */
export type TemasIzi = { tur: 'yuz'; cift: string; kose: Point3D[] } | { tur: 'cizgi'; cift: string; a: Point3D; b: Point3D };
export interface HizaIzi {
  a: Point3D;
  b: Point3D;
  tur: 'kenar' | 'orta';
}
export interface YapismaIzi {
  temaslar: TemasIzi[];
  hizalar: HizaIzi[];
  destekId: string | null;
}
export interface YapismaSonucu {
  /** Başlangıca göre TOPLAM öteleme (tam duyarlık; Canvas3D 0,01'e yuvarlar) */
  delta: Point3D;
  durum: YapismaDurumu;
  /** Yapışma yoksa null */
  iz: YapismaIzi | null;
  /** Dar evre çift sayısı (tekil taşınan–hedef çifti) ve çakışma çözümünde sınanan aday sayısı (maliyet testi) */
  istatistik: { cift: number; aday: number };
}

type Esikler = Record<keyof typeof ESIK_PX, number>;

/** Piksel eşiklerini dünya birimine çevirir: px / pxBr (dokunmada ×1,5), [0,05; 0,75] br'ye kırpılır. */
export function esikler(pikselBasinaBirim: number, dokunma = false): Esikler {
  const pb = pikselBasinaBirim > 0 && Number.isFinite(pikselBasinaBirim) ? pikselBasinaBirim : 1e-9;
  const k = (dokunma ? DOKUNMA_CARPANI : 1) / pb;
  const out = {} as Esikler;
  for (const ad of Object.keys(ESIK_PX) as (keyof typeof ESIK_PX)[]) out[ad] = kirp(ESIK_PX[ad] * k, ESIK_EN_AZ, ESIK_EN_COK);
  return out;
}

/**
 * Perspektif kamerada `nokta` derinliğinde 1 br kaç piksel: H / (2·tan(fov/2)·derinlik); bakış noktasında Camera3D.zoom.
 * `ileri` birim vektör.
 */
export function pikselBasinaBirim(goz: Point3D, ileri: Point3D, nokta: Point3D, yukseklikPx: number, fovDerece = 40): number {
  const derinlik = (nokta.x - goz.x) * ileri.x + (nokta.y - goz.y) * ileri.y + (nokta.z - goz.z) * ileri.z;
  return yukseklikPx / (2 * Math.tan(((fovDerece / 2) * Math.PI) / 180) * Math.max(derinlik, 0.1));
}

class Sayac {
  private ciftler = new Set<string>();
  aday = 0;
  cift(m: YapismaGovdesi, h: YapismaGovdesi) {
    this.ciftler.add(ciftAnahtari(m, h));
  }
  sonuc() {
    return { cift: this.ciftler.size, aday: this.aday };
  }
}

/** Geniş evre: xy kutusu (`pay` kadar genişletilmiş) örtüşen affedilmemiş çiftler */
function yakinCiftler(o: YapismaOturumu, P: Readonly<Point3D>, pay: number, sayac: Sayac): [YapismaGovdesi, YapismaGovdesi][] {
  const out: [YapismaGovdesi, YapismaGovdesi][] = [];
  for (const m of o.tasinanlar) {
    const x0 = m.kutu.min.x + P.x - pay;
    const x1 = m.kutu.max.x + P.x + pay;
    const y0 = m.kutu.min.y + P.y - pay;
    const y1 = m.kutu.max.y + P.y + pay;
    for (const h of o.uyeHedefleri[m.id]) {
      if (h.kutu.max.x < x0 || h.kutu.min.x > x1 || h.kutu.max.y < y0 || h.kutu.min.y > y1) continue;
      sayac.cift(m, h);
      out.push([m, h]);
    }
  }
  return out;
}

function kutularKesisir(m: YapismaGovdesi, P: Readonly<Point3D>, h: YapismaGovdesi): boolean {
  return (
    Math.min(m.kutu.max.x + P.x, h.kutu.max.x) - Math.max(m.kutu.min.x + P.x, h.kutu.min.x) > TEMAS_PAYI &&
    Math.min(m.kutu.max.y + P.y, h.kutu.max.y) - Math.max(m.kutu.min.y + P.y, h.kutu.min.y) > TEMAS_PAYI &&
    Math.min(m.kutu.max.z + P.z, h.kutu.max.z) - Math.max(m.kutu.min.z + P.z, h.kutu.min.z) > TEMAS_PAYI
  );
}

/** Hiçbir affedilmemiş çift kesişmiyor mu? */
function gecerliMi(o: YapismaOturumu, P: Readonly<Point3D>, sayac: Sayac): boolean {
  for (const m of o.tasinanlar) {
    for (const h of o.uyeHedefleri[m.id]) {
      if (!kutularKesisir(m, P, h)) continue;
      sayac.cift(m, h);
      if (kesisir(m, P, h)) return false;
    }
  }
  return true;
}

function carpisanlar(o: YapismaOturumu, P: Readonly<Point3D>, sayac: Sayac): [YapismaGovdesi, YapismaGovdesi][] {
  const out: [YapismaGovdesi, YapismaGovdesi][] = [];
  for (const m of o.tasinanlar) {
    for (const h of o.uyeHedefleri[m.id]) {
      if (!kutularKesisir(m, P, h)) continue;
      sayac.cift(m, h);
      if (kesisir(m, P, h)) out.push([m, h]);
    }
  }
  return out;
}

type Destekler = Record<string, { z: number; id: string | null }>;

function destekleriBul(o: YapismaOturumu, P: Readonly<Point3D>, onceki: Readonly<Record<string, string | null>>, genisletme: number): Destekler {
  const D: Destekler = {};
  for (const m of o.tasinanlar) D[m.id] = destekBul(m, P, o.uyeHedefleri[m.id], onceki[m.id] ?? null, genisletme);
  return D;
}

/** Grubun z ötelemesi: her üyenin desteğe oturması için gereken yükselmelerin en büyüğü */
function yukseklik(o: YapismaOturumu, D: Destekler): number {
  let z = -Infinity;
  for (const m of o.tasinanlar) z = Math.max(z, D[m.id].z - m.kutu.min.z);
  return Number.isFinite(z) ? z : 0;
}

const ayniDestekler = (a: Destekler, b: Destekler) => Object.keys(a).every((k) => a[k].id === b[k]?.id);

interface Aday {
  s: number;
  anahtar: string;
  m: YapismaGovdesi;
  h: YapismaGovdesi;
  tur: 'min' | 'max' | 'orta';
  eksen: Yatay;
}

/** u boyunca en yakın değme (eşik içinde; önceki karenin anahtarına çıkış eşiği) */
function temasAdayi(P: Readonly<Point3D>, u: Yatay, ciftler: readonly [YapismaGovdesi, YapismaGovdesi][], E: Esikler, onceki?: string): Omit<Aday, 'tur' | 'eksen'> | null {
  let en: Omit<Aday, 'tur' | 'eksen'> | null = null;
  for (const [m, h] of ciftler) {
    const r = temasOtelemesi(m, P, h, u);
    if (!r) continue;
    for (const tur of ['once', 'sonra'] as const) {
      const s = r[tur];
      const anahtar = `temas:${m.id}:${h.id}:${tur}`;
      const esik = anahtar === onceki ? E.temasCikis : E.temas;
      if (Math.abs(s) <= esik && (!en || Math.abs(s) < Math.abs(en.s) - 1e-12)) en = { s, anahtar, m, h };
    }
  }
  return en;
}

/** u boyunca kenar (min↔min, max↔max) ya da merkez hizası; `orta` çiftinde yalnız merkez */
function hizaAdayi(P: Readonly<Point3D>, u: Yatay, ciftler: readonly [YapismaGovdesi, YapismaGovdesi][], E: Esikler, onceki?: string): Aday | null {
  let en: Aday | null = null;
  for (const [m, h] of ciftler) {
    const yalnizOrta = m.hiza === 'orta' || h.hiza === 'orta';
    const mMin = m.kutu.min[u] + P[u];
    const mMax = m.kutu.max[u] + P[u];
    const secenekler: [Aday['tur'], number][] = [];
    if (!yalnizOrta) secenekler.push(['min', h.kutu.min[u] - mMin], ['max', h.kutu.max[u] - mMax]);
    secenekler.push(['orta', (h.kutu.min[u] + h.kutu.max[u]) / 2 - (mMin + mMax) / 2]);
    for (const [tur, s] of secenekler) {
      const anahtar = `hiza:${m.id}:${h.id}:${tur}`;
      const esik = anahtar === onceki ? E.hizaCikis : E.hiza;
      if (Math.abs(s) <= esik && (!en || Math.abs(s) < Math.abs(en.s) - 1e-12)) en = { s, anahtar, m, h, tur, eksen: u };
    }
  }
  return en;
}

/** Grup birleşim kutusunu u boyunca ızgaraya oturtan öteleme */
function izgaraAdayi(o: YapismaOturumu, P: Readonly<Point3D>, u: Eksen3, E: Esikler, onceki?: string): { s: number; anahtar: string } | null {
  let mn = Infinity;
  let mx = -Infinity;
  let kenar = true;
  for (const m of o.tasinanlar) {
    mn = Math.min(mn, m.kutu.min[u] + P[u]);
    mx = Math.max(mx, m.kutu.max[u] + P[u]);
    if (m.hiza !== 'kenar') kenar = false;
  }
  if (u === 'z') kenar = true; // yükseklikte taban (min) adımlara oturur
  const adim = IZGARA_ADIMI_3B;
  const orta = (mn + mx) / 2;
  const oturt = (ref: string, deger: number) => {
    const k = Math.round(deger / adim);
    return { s: k * adim - deger, anahtar: `izgara:${ref}:${k}` };
  };
  if (o.profil.izgara === 'her_zaman') return u === 'z' || kenar ? oturt('min', mn) : oturt('orta', orta);
  const secenekler: [string, number][] = u === 'z' ? [['min', mn]] : kenar ? [['min', mn], ['max', mx], ['orta', orta]] : [['orta', orta]];
  let en: { s: number; anahtar: string } | null = null;
  for (const [ref, deger] of secenekler) {
    const a = oturt(ref, deger);
    const esik = a.anahtar === onceki ? E.izgaraCikis : E.izgara;
    if (Math.abs(a.s) <= esik && (!en || Math.abs(a.s) < Math.abs(en.s) - 1e-12)) en = a;
  }
  return en;
}

interface Gecis {
  P: Point3D;
  anahtarlar: Partial<Record<Eksen3, string>>;
  hizalar: Aday[];
}

/** Serbest kipte bir geçiş: yükseklik (destekten), temas (x sonra y), hiza, ızgara */
function serbestGecis(o: YapismaOturumu, P0: Readonly<Point3D>, D: Destekler | null, E: Esikler, izgaraGorunur: boolean, sayac: Sayac): Gecis {
  const P: Point3D = { x: P0.x, y: P0.y, z: D ? yukseklik(o, D) : 0 };
  const onceki = o.hafiza.anahtarlar;
  const anahtarlar: Partial<Record<Eksen3, string>> = {};
  const hizalar: Aday[] = [];
  const ortak: Partial<Record<Yatay, { m: YapismaGovdesi; h: YapismaGovdesi }>> = {};
  const yakin = yakinCiftler(o, P, 2 * ESIK_EN_COK, sayac);

  for (const u of YATAYLAR) {
    const t = temasAdayi(P, u, yakin, E, onceki[u]);
    if (t) {
      P[u] += t.s;
      anahtarlar[u] = t.anahtar;
      ortak[u] = { m: t.m, h: t.h };
    }
  }
  for (const u of YATAYLAR) {
    if (anahtarlar[u]) continue;
    const ciftler: [YapismaGovdesi, YapismaGovdesi][] = [];
    const t = ortak[oteki(u)];
    if (t) ciftler.push([t.m, t.h]);
    if (D) {
      for (const m of o.tasinanlar) {
        const id = D[m.id]?.id;
        const h = id ? o.uyeHedefleri[m.id].find((x) => x.id === id) : undefined;
        if (h && !(t && t.m === m && t.h === h)) ciftler.push([m, h]);
      }
    }
    const a = hizaAdayi(P, u, ciftler, E, onceki[u]);
    if (a) {
      P[u] += a.s;
      anahtarlar[u] = a.anahtar;
      hizalar.push(a);
    }
  }
  if (izgaraGorunur) {
    for (const u of YATAYLAR) {
      if (anahtarlar[u]) continue;
      const k = izgaraAdayi(o, P, u, E, onceki[u]);
      if (k) {
        P[u] += k.s;
        anahtarlar[u] = k.anahtar;
      }
    }
  }
  return { P, anahtarlar, hizalar };
}

/** Çakışan çiftlerden tam temas itmeleri; en yakın geçerli aday (yoksa null) */
function enYakinGecerli(
  o: YapismaOturumu,
  P: Readonly<Point3D>,
  E: Esikler,
  onceki: Readonly<Record<string, string | null>>,
  sayac: Sayac,
): { P: Point3D; D: Destekler | null; anahtarlar: Partial<Record<Eksen3, string>> } | null {
  const cak = carpisanlar(o, P, sayac);
  const tekil: Record<Yatay, { s: number; anahtar: string }[]> = { x: [], y: [] };
  for (const u of YATAYLAR) {
    for (const [m, h] of cak) {
      const r = temasOtelemesi(m, P, h, u);
      if (!r) continue;
      tekil[u].push({ s: r.once, anahtar: `temas:${m.id}:${h.id}:once` }, { s: r.sonra, anahtar: `temas:${m.id}:${h.id}:sonra` });
    }
  }
  const adaylar: { dx: number; dy: number; anahtarlar: Partial<Record<Eksen3, string>> }[] = [
    ...tekil.x.map((a) => ({ dx: a.s, dy: 0, anahtarlar: { x: a.anahtar } })),
    ...tekil.y.map((a) => ({ dx: 0, dy: a.s, anahtarlar: { y: a.anahtar } })),
  ];
  const enYakinlar = (l: { s: number; anahtar: string }[]) => [...l].sort((a, b) => Math.abs(a.s) - Math.abs(b.s)).slice(0, BIRLESIK_ADAY);
  for (const a of enYakinlar(tekil.x)) for (const b of enYakinlar(tekil.y)) adaylar.push({ dx: a.s, dy: b.s, anahtarlar: { x: a.anahtar, y: b.anahtar } });

  // Grup kendi yarı boyundan fazla itilmez: büyük sıçrama yerine duvarın önünde bekler (durdu)
  let gx = 0;
  let gy = 0;
  {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const m of o.tasinanlar) {
      x0 = Math.min(x0, m.kutu.min.x);
      x1 = Math.max(x1, m.kutu.max.x);
      y0 = Math.min(y0, m.kutu.min.y);
      y1 = Math.max(y1, m.kutu.max.y);
    }
    gx = x1 - x0;
    gy = y1 - y0;
  }
  const itmeSiniri = Math.max(E.temasCikis, 0.5 * Math.min(gx, gy));

  let en: { P: Point3D; D: Destekler | null; anahtarlar: Partial<Record<Eksen3, string>>; d: number } | null = null;
  for (const a of adaylar) {
    if (Math.hypot(a.dx, a.dy) > itmeSiniri + 1e-9) continue;
    const Q: Point3D = { x: P.x + a.dx, y: P.y + a.dy, z: P.z };
    let D: Destekler | null = null;
    if (o.dayaniyordu) {
      D = destekleriBul(o, Q, onceki, E.destek);
      Q.z = yukseklik(o, D);
    }
    sayac.aday++;
    const d = Math.hypot(Q.x - P.x, Q.y - P.y, Q.z - P.z);
    if (en && d >= en.d - 1e-12) continue;
    if (!gecerliMi(o, Q, sayac)) continue;
    en = { P: Q, D, anahtarlar: a.anahtarlar, d };
  }
  return en ? { P: en.P, D: en.D, anahtarlar: en.anahtarlar } : null;
}

const esitMi = (a: Readonly<Point3D>, b: Readonly<Point3D>) => a.x === b.x && a.y === b.y && a.z === b.z;

function serbestKip(o: YapismaOturumu, ham: Point3D, E: Esikler, izgaraGorunur: boolean, sayac: Sayac): YapismaSonucu {
  const onceki = o.hafiza.destek;
  const P0: Point3D = { x: ham.x, y: ham.y, z: 0 };
  const D1 = o.dayaniyordu ? destekleriBul(o, P0, onceki, E.destek) : null;
  let G = serbestGecis(o, P0, D1, E, izgaraGorunur, sayac);
  let D = D1;
  if (o.dayaniyordu && D1) {
    const D2 = destekleriBul(o, G.P, onceki, E.destek);
    if (!ayniDestekler(D2, D1)) {
      G = serbestGecis(o, { x: ham.x, y: ham.y, z: 0 }, D2, E, izgaraGorunur, sayac);
      D = destekleriBul(o, G.P, onceki, E.destek);
      G.P.z = yukseklik(o, D);
    } else D = D2;
  }

  let P = G.P;
  let anahtarlar = G.anahtarlar;
  let hizalar = G.hizalar;
  let durum: YapismaDurumu;
  if (gecerliMi(o, P, sayac)) durum = esitMi(P, ham) ? 'serbest' : 'yapisti';
  else {
    const itme = enYakinGecerli(o, P, E, onceki, sayac);
    if (itme) {
      // İtilen eksendeki hiza artık geçmez
      hizalar = hizalar.filter((h) => !itme.anahtarlar[h.eksen]);
      anahtarlar = { ...anahtarlar, ...itme.anahtarlar };
      P = itme.P;
      D = itme.D;
      durum = 'itildi';
    } else {
      P = { ...o.hafiza.sonGecerli };
      D = o.dayaniyordu ? destekleriBul(o, P, onceki, E.destek) : null;
      anahtarlar = {};
      hizalar = [];
      durum = 'durdu';
    }
  }
  if (durum !== 'durdu') o.hafiza.sonGecerli = { ...P };
  o.hafiza.anahtarlar = anahtarlar;
  if (D) for (const k of Object.keys(D)) o.hafiza.destek[k] = D[k].id;
  const delta = durum === 'serbest' ? { ...ham } : P;
  return { delta, durum, iz: izKur(o, delta, hizalar, D, sayac), istatistik: sayac.sonuc() };
}

/** x / y oku: o eksende temas, hiza (başlangıç ortakları), ızgara; sonra süpürme (cismin içinden geçilmez) */
function eksenKipi(o: YapismaOturumu, ham: Point3D, E: Esikler, izgaraGorunur: boolean, sayac: Sayac): YapismaSonucu {
  const u = o.kip as Yatay;
  const P: Point3D = { x: 0, y: 0, z: 0 };
  P[u] = ham[u];
  const onceki = o.hafiza.anahtarlar[u];
  const anahtarlar: Partial<Record<Eksen3, string>> = {};
  const hizalar: Aday[] = [];
  const yakin = yakinCiftler(o, P, 2 * ESIK_EN_COK, sayac);
  const t = temasAdayi(P, u, yakin, E, onceki);
  if (t) {
    P[u] += t.s;
    anahtarlar[u] = t.anahtar;
  } else {
    const ciftler: [YapismaGovdesi, YapismaGovdesi][] = [];
    for (const m of o.tasinanlar) for (const h of o.eksenOrtaklari[m.id] ?? []) ciftler.push([m, h]);
    const a = hizaAdayi(P, u, ciftler, E, onceki);
    if (a) {
      P[u] += a.s;
      anahtarlar[u] = a.anahtar;
      hizalar.push(a);
    } else if (izgaraGorunur) {
      const k = izgaraAdayi(o, P, u, E, onceki);
      if (k) {
        P[u] += k.s;
        anahtarlar[u] = k.anahtar;
      }
    }
  }
  return eksenBitir(o, ham, P, anahtarlar, hizalar, u, sayac);
}

/** z oku / merkez + Shift: üstüne koy, altına sok, zemin, ızgara; süpürme ve zemin engeli */
function zKipi(o: YapismaOturumu, ham: Point3D, E: Esikler, izgaraGorunur: boolean, sayac: Sayac): YapismaSonucu {
  const P: Point3D = { x: 0, y: 0, z: ham.z };
  const onceki = o.hafiza.anahtarlar.z;
  const anahtarlar: Partial<Record<Eksen3, string>> = {};
  let en: { s: number; anahtar: string } | null = null;
  const dene = (s: number, anahtar: string) => {
    const esik = anahtar === onceki ? E.temasCikis : E.temas;
    if (Math.abs(s) <= esik && (!en || Math.abs(s) < Math.abs(en.s) - 1e-12)) en = { s, anahtar };
  };
  for (const [m, h] of o.sutun) {
    sayac.cift(m, h);
    dene(h.kutu.max.z - (m.kutu.min.z + P.z), `temas:${m.id}:${h.id}:ust`);
    dene(h.kutu.min.z - (m.kutu.max.z + P.z), `temas:${m.id}:${h.id}:alt`);
  }
  for (const m of o.tasinanlar) dene(-(m.kutu.min.z + P.z), `zemin:${m.id}`);
  const secilen = en as { s: number; anahtar: string } | null;
  if (secilen) {
    P.z += secilen.s;
    anahtarlar.z = secilen.anahtar;
  } else if (izgaraGorunur) {
    const k = izgaraAdayi(o, P, 'z', E, onceki);
    if (k) {
      P.z += k.s;
      anahtarlar.z = k.anahtar;
    }
  }
  return eksenBitir(o, ham, P, anahtarlar, [], 'z', sayac);
}

function eksenBitir(
  o: YapismaOturumu,
  ham: Point3D,
  P: Point3D,
  anahtarlar: Partial<Record<Eksen3, string>>,
  hizalar: Aday[],
  u: Eksen3,
  sayac: Sayac,
): YapismaSonucu {
  const s = o.sinir;
  let durum: YapismaDurumu = 'yapisti';
  if (s) {
    const kirpik = kirp(P[u], s.min, s.max);
    if (kirpik !== P[u]) {
      P[u] = kirpik;
      durum = 'durdu';
    }
  }
  if (!gecerliMi(o, P, sayac)) {
    P = { ...o.hafiza.sonGecerli };
    durum = 'durdu';
    anahtarlar = {};
    hizalar = [];
  } else o.hafiza.sonGecerli = { ...P };
  if (durum === 'yapisti' && esitMi(P, ham)) durum = 'serbest';
  o.hafiza.anahtarlar = anahtarlar;
  const delta = durum === 'serbest' ? { ...ham } : P;
  return { delta, durum, iz: izKur(o, delta, hizalar, null, sayac), istatistik: sayac.sonuc() };
}

/** Bir karenin yapışma sonucu. `hamDelta` değişmez; Mıknatıs kurallarından geçmiş toplam ötelemeyi döndürür. */
export function yapistir(o: YapismaOturumu, g: YapismaGirdisi): YapismaSonucu {
  const ham: Point3D = { x: g.hamDelta.x, y: g.hamDelta.y, z: g.hamDelta.z };
  const sayac = new Sayac();
  if (o.devreDisi) return { delta: ham, durum: 'serbest', iz: null, istatistik: sayac.sonuc() };
  if (g.geciciKapali) {
    o.hafiza.anahtarlar = {};
    o.hafiza.destek = {};
    if (gecerliMi(o, ham, sayac)) o.hafiza.sonGecerli = { ...ham };
    return { delta: ham, durum: 'serbest', iz: null, istatistik: sayac.sonuc() };
  }
  const E = esikler(g.pikselBasinaBirim, g.dokunma);
  if (o.kip === 'serbest') return serbestKip(o, ham, E, g.izgaraGorunur, sayac);
  if (o.kip === 'z') return zKipi(o, ham, E, g.izgaraGorunur, sayac);
  return eksenKipi(o, ham, E, g.izgaraGorunur, sayac);
}

/* ------------------------------------------------------------------------------------------------- iz */

function duzlemNoktasi(eksen: Eksen3, deger: number, q: Nokta2): Point3D {
  const [a, b] = DUZLEM_EKSENLERI[eksen];
  const p = { x: 0, y: 0, z: 0 };
  p[eksen] = deger;
  p[a] = q.u;
  p[b] = q.v;
  return p;
}

/** Son konumdaki temas izleri (karşılıklı gerçek yüzlerin kesişimi; dik silindirde düşey teğet doğru), destek ve hiza çizgileri */
function izKur(o: YapismaOturumu, P: Readonly<Point3D>, hizalar: readonly Aday[], D: Destekler | null, sayac: Sayac): YapismaIzi | null {
  const temaslar: TemasIzi[] = [];
  for (const [m, h] of yakinCiftler(o, P, TEMAS_PAYI, sayac)) {
    for (const eksen of ['x', 'y', 'z'] as const) {
      const [a, b] = DUZLEM_EKSENLERI[eksen];
      const kes = (my: YuzYonu, hy: YuzYonu, deger: number) => {
        const pm = m.yuzler[my];
        const ph = h.yuzler[hy];
        if (!pm || !ph) return;
        const tasinmis = pm.map((q) => ({ u: q.u + P[a], v: q.v + P[b] }));
        const ortak = cokgenKes(tasinmis, ph);
        if (ortak.length >= 3 && Math.abs(cokgenAlani(ortak)) > 1e-6) {
          temaslar.push({ tur: 'yuz', cift: `${m.id}|${h.id}|${eksen}`, kose: ortak.map((q) => duzlemNoktasi(eksen, deger, q)) });
        }
      };
      if (Math.abs(m.kutu.max[eksen] + P[eksen] - h.kutu.min[eksen]) <= TEMAS_PAYI) kes(`+${eksen}`, `-${eksen}`, h.kutu.min[eksen]);
      if (Math.abs(m.kutu.min[eksen] + P[eksen] - h.kutu.max[eksen]) <= TEMAS_PAYI) kes(`-${eksen}`, `+${eksen}`, h.kutu.max[eksen]);
    }
    // Dik silindirin yan yüzü: gerçek düşey yüze ya da başka dik silindire değiyorsa dilim boyunca düşey doğru
    const ms = m.profil.tur === 'silindir';
    const hs = h.profil.tur === 'silindir';
    if (!ms && !hs) continue;
    const d = dilim(m, P, h, SIFIR);
    if (!d) continue;
    const A = kesitAl(m, P, d.zAlt, d.zUst);
    const B = kesitAl(h, SIFIR, d.zAlt, d.zUst);
    if (!A || !B) continue;
    let nokta: { x: number; y: number } | null = null;
    if (A.tur === 'daire' && B.tur === 'daire' && ms && hs) {
      const uz = Math.hypot(B.cx - A.cx, B.cy - A.cy);
      if (uz > 1e-9 && Math.abs(uz - A.r - B.r) <= TEMAS_PAYI) nokta = { x: A.cx + ((B.cx - A.cx) * A.r) / uz, y: A.cy + ((B.cy - A.cy) * A.r) / uz };
    } else if ((A.tur === 'daire' && B.tur === 'kutu' && ms) || (A.tur === 'kutu' && B.tur === 'daire' && hs)) {
      const daire = (A.tur === 'daire' ? A : B) as Extract<Kesit, { tur: 'daire' }>;
      const kutu = (A.tur === 'kutu' ? A : B) as Extract<Kesit, { tur: 'kutu' }>;
      const kutuGovde = A.tur === 'kutu' ? m : h;
      const qx = kirp(daire.cx, kutu.minX, kutu.maxX);
      const qy = kirp(daire.cy, kutu.minY, kutu.maxY);
      const uz = Math.hypot(daire.cx - qx, daire.cy - qy);
      // Yalnız yüz teğeti: merkez kutunun bir aralığının içinde, karşı yüz gerçek düşey yüz
      const yon: YuzYonu | null =
        qx === daire.cx ? (qy === kutu.minY ? '-y' : qy === kutu.maxY ? '+y' : null) : qy === daire.cy ? (qx === kutu.minX ? '-x' : '+x') : null;
      if (yon && kutuGovde.yuzler[yon] && Math.abs(uz - daire.r) <= TEMAS_PAYI) nokta = { x: qx, y: qy };
    }
    if (nokta) temaslar.push({ tur: 'cizgi', cift: `${m.id}|${h.id}|s`, a: { ...nokta, z: d.zAlt }, b: { ...nokta, z: d.zUst } });
  }

  const hizaIzleri: HizaIzi[] = [];
  for (const a of hizalar) {
    const eksen = a.eksen;
    const v = oteki(eksen);
    const z = a.m.kutu.min.z + P.z;
    let deger: number;
    let v0: number;
    let v1: number;
    if (a.tur === 'orta') {
      deger = (a.h.kutu.min[eksen] + a.h.kutu.max[eksen]) / 2;
      const cm = (a.m.kutu.min[v] + a.m.kutu.max[v]) / 2 + P[v];
      const ch = (a.h.kutu.min[v] + a.h.kutu.max[v]) / 2;
      v0 = Math.min(cm, ch) - IZ_UZATMA;
      v1 = Math.max(cm, ch) + IZ_UZATMA;
    } else {
      deger = a.tur === 'min' ? a.h.kutu.min[eksen] : a.h.kutu.max[eksen];
      v0 = Math.min(a.m.kutu.min[v] + P[v], a.h.kutu.min[v]) - IZ_UZATMA;
      v1 = Math.max(a.m.kutu.max[v] + P[v], a.h.kutu.max[v]) + IZ_UZATMA;
    }
    const n0 = { x: 0, y: 0, z };
    const n1 = { x: 0, y: 0, z };
    n0[eksen] = deger;
    n1[eksen] = deger;
    n0[v] = v0;
    n1[v] = v1;
    hizaIzleri.push({ a: n0, b: n1, tur: a.tur === 'orta' ? 'orta' : 'kenar' });
  }

  let destekId: string | null = null;
  if (D) for (const m of o.tasinanlar) if (!destekId && D[m.id]?.id) destekId = D[m.id].id;
  if (temaslar.length === 0 && hizaIzleri.length === 0 && destekId === null) return null;
  return { temaslar, hizalar: hizaIzleri, destekId };
}

/** İzin kararlı metni (0,001'e yuvarlı); '' = iz yok. Kılavuz yalnız bu değişince yeniden kurulur. */
export function izAnahtari(iz: YapismaIzi | null): string {
  if (!iz) return '';
  const r = (n: number) => String(Math.round(n * 1000));
  const p = (q: Point3D) => `${r(q.x)},${r(q.y)},${r(q.z)}`;
  const t = iz.temaslar.map((x) => (x.tur === 'yuz' ? `Y${x.cift}:${x.kose.map(p).join(';')}` : `C${x.cift}:${p(x.a)};${p(x.b)}`)).join('|');
  const h = iz.hizalar.map((x) => `${x.tur}:${p(x.a)};${p(x.b)}`).join('|');
  return `${t}#${h}#${iz.destekId ?? ''}`;
}
