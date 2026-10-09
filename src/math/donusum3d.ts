import type { Point3D, Solid3DObject } from '@/types/workspace3d';
import { rotatePoint3D } from './geometry3d';

/**
 * 3B katı cisim dönüşümleri (saf, sınanabilir): döndürme, büyütme / küçültme, düzleme göre yansıtma, öteleme.
 *
 * Cisim modeli (types/workspace3d.ts, geometry3d.generateSolidMesh): yerel köşeler tabanı z = 0 düzleminde ve taban
 * merkezi orijinde olacak biçimde üretilir; sonra `rotation` (derece, X→Y→Z sırası: dünya = Rz·Ry·Rx·yerel) uygulanır
 * ve `position` (TABAN merkezi) eklenir. Bu modül yalnızca `position`, `rotation` ve `dimensions` alanlarını değiştirir;
 * çizim motoru dokunulmadan kalır.
 *
 *  - Döndürme: yeni dönme matrisi R' = Ra · R (Ra: dünya ekseni etrafında); Euler açıları matristen geri çözülür.
 *    Pivot "merkez" ise taban merkezi, geometrik merkez etrafında döndürülür (cisim yerinde çevrilir).
 *  - Ölçekleme: boyutlar k katı; taban pivotunda konum değişmez (cisim yerde kalır), nokta pivotunda homoteti.
 *  - Yansıtma: dünya aynası S (x = c, y = c ya da z = c düzlemi). Cisim yerel x-aynası M altında simetrik olduğundan
 *    (yedi cisim türünün hepsi) ayna görüntüsü yine bir cisimdir: R' = S·R·M (öz dönme), P' = S(P). Böylece ayna
 *    bayrağı gerekmez; proje dosyası biçimi değişmez.
 */

export type Eksen = 'x' | 'y' | 'z';
/** Ayna düzlemi: 'yz' → x = seviye, 'xz' → y = seviye, 'xy' → z = seviye */
export type AynaDuzlemi = 'yz' | 'xz' | 'xy';
export type Pivot = 'merkez' | 'taban';
type Mat = [[number, number, number], [number, number, number], [number, number, number]];

const d2r = (d: number) => (d * Math.PI) / 180;
const r2d = (r: number) => (r * 180) / Math.PI;
/** −0 ve 1e-12 gibi kalıntıları temizler. */
const temiz = (n: number) => { const v = Math.round(n * 1e9) / 1e9; return v === 0 ? 0 : v; };
/** Açıyı (−180, 180] aralığına getirir. */
export const aciNormalle = (d: number) => { let v = ((d + 180) % 360 + 360) % 360 - 180; if (v === -180) v = 180; return temiz(v); };

export const BIRIM: Mat = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

export function carp(A: Mat, B: Mat): Mat {
  const out: Mat = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
  return out;
}

export function uygula(R: Mat, p: Point3D): Point3D {
  return {
    x: R[0][0] * p.x + R[0][1] * p.y + R[0][2] * p.z,
    y: R[1][0] * p.x + R[1][1] * p.y + R[1][2] * p.z,
    z: R[2][0] * p.x + R[2][1] * p.y + R[2][2] * p.z,
  };
}

/** rotation (derece, X→Y→Z) → dünya matrisi R = Rz·Ry·Rx (rotatePoint3D ile aynı). */
export function eulerMatrisi(rot: Point3D): Mat {
  const [a, b, c] = [d2r(rot.x), d2r(rot.y), d2r(rot.z)];
  const [sa, ca, sb, cb, sc, cc] = [Math.sin(a), Math.cos(a), Math.sin(b), Math.cos(b), Math.sin(c), Math.cos(c)];
  return [
    [cc * cb, cc * sb * sa - sc * ca, cc * sb * ca + sc * sa],
    [sc * cb, sc * sb * sa + cc * ca, sc * sb * ca - cc * sa],
    [-sb, cb * sa, cb * ca],
  ];
}

/** Dünya matrisi → rotation (derece, X→Y→Z). Gimbal kilidinde (|cos y| ≈ 0) z = 0 alınır. */
export function matrisEuler(R: Mat): Point3D {
  const sb = Math.max(-1, Math.min(1, -R[2][0]));
  const b = Math.asin(sb);
  if (Math.abs(Math.cos(b)) < 1e-9) {
    // R[0][1] = cc·sb·sa − sc·ca, R[1][1] = sc·sb·sa + cc·ca; z = 0 alınınca a = atan2(sb·R[0][1], R[1][1])
    return { x: aciNormalle(r2d(Math.atan2(sb * R[0][1], R[1][1]))), y: aciNormalle(r2d(b)), z: 0 };
  }
  return { x: aciNormalle(r2d(Math.atan2(R[2][1], R[2][2]))), y: aciNormalle(r2d(b)), z: aciNormalle(r2d(Math.atan2(R[1][0], R[0][0]))) };
}

/** Birim eksen vektörü ya da serbest vektör etrafında `derece` kadar dönme (Rodrigues). */
export function eksenMatrisi(eksen: Eksen | Point3D, derece: number): Mat {
  const v = typeof eksen === 'string' ? { x: eksen === 'x' ? 1 : 0, y: eksen === 'y' ? 1 : 0, z: eksen === 'z' ? 1 : 0 } : eksen;
  const len = Math.hypot(v.x, v.y, v.z);
  if (!(len > 1e-12)) throw new RangeError('Dönme ekseni sıfır vektör olamaz.');
  const [x, y, z] = [v.x / len, v.y / len, v.z / len];
  const t = d2r(derece), c = Math.cos(t), s = Math.sin(t), k = 1 - c;
  return [
    [c + x * x * k, x * y * k - z * s, x * z * k + y * s],
    [y * x * k + z * s, c + y * y * k, y * z * k - x * s],
    [z * x * k - y * s, z * y * k + x * s, c + z * z * k],
  ];
}

const topla = (p: Point3D, q: Point3D): Point3D => ({ x: p.x + q.x, y: p.y + q.y, z: p.z + q.z });
const cikar = (p: Point3D, q: Point3D): Point3D => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
const olcek = (p: Point3D, k: number): Point3D => ({ x: p.x * k, y: p.y * k, z: p.z * k });
const noktaTemizle = (p: Point3D): Point3D => ({ x: temiz(p.x), y: temiz(p.y), z: temiz(p.z) });

/** Cismin yerel geometrik merkezinin yüksekliği (taban merkezinden). */
export function merkezYuksekligi(solid: Solid3DObject): number {
  const { width, height, radius } = solid.dimensions;
  if (solid.type === 'sphere') return radius || (width || 3) / 2;
  if (solid.type === 'cube') return (width || 3) / 2;
  // Koni ve piramidin ağırlık merkezi h/4'tedir; döndürme pivotu olarak sınır kutusunun ortası (h/2) daha sezgiseldir.
  return (height || 3) / 2;
}

/** Cismin dünya koordinatlarındaki geometrik merkezi (döndürme dikkate alınır). */
export function cisimMerkezi(solid: Solid3DObject): Point3D {
  return topla(solid.position, rotatePoint3D({ x: 0, y: 0, z: merkezYuksekligi(solid) }, solid.rotation));
}

/**
 * Cismi dünya ekseni (ya da verilen vektör) etrafında `derece` kadar döndürür.
 * pivot 'merkez': geometrik merkez sabit kalır (cisim yerinde çevrilir); 'taban': taban merkezi (position) sabit kalır.
 */
export function cismiDondur(solid: Solid3DObject, eksen: Eksen | Point3D, derece: number, pivot: Pivot = 'merkez'): Solid3DObject {
  if (!Number.isFinite(derece)) throw new RangeError('Dönme açısı sayı olmalı.');
  const Ra = eksenMatrisi(eksen, derece);
  const rotation = matrisEuler(carp(Ra, eulerMatrisi(solid.rotation)));
  if (pivot === 'taban') return { ...solid, rotation };
  const c = cisimMerkezi(solid);
  const position = noktaTemizle(topla(c, uygula(Ra, cikar(solid.position, c))));
  return { ...solid, rotation, position };
}

/** Cismin döndürmesini sıfırlar; geometrik merkez yerinde kalır. */
export function donmeyiSifirla(solid: Solid3DObject): Solid3DObject {
  const c = cisimMerkezi(solid);
  const dik: Solid3DObject = { ...solid, rotation: { x: 0, y: 0, z: 0 } };
  const yeniMerkez = cisimMerkezi(dik);
  return { ...dik, position: noktaTemizle(topla(solid.position, cikar(c, yeniMerkez))) };
}

export const OLCEK_EN_AZ = 0.05;
export const OLCEK_EN_COK = 50;

/**
 * Büyütme / küçültme: bütün boyutlar k katı. pivot 'taban': taban merkezi yerinde (cisim yerde kalır);
 * 'merkez': geometrik merkez yerinde; nokta: o noktaya göre homoteti (P' = M + k(P − M)).
 */
export function cismiOlcekle(solid: Solid3DObject, k: number, pivot: Pivot | Point3D = 'taban'): Solid3DObject {
  if (!Number.isFinite(k) || k <= 0) throw new RangeError('Ölçek çarpanı 0’dan büyük bir sayı olmalı.');
  const oran = Math.min(OLCEK_EN_COK, Math.max(OLCEK_EN_AZ, k));
  const d = solid.dimensions;
  const dimensions = { ...d, width: temiz(d.width * oran), height: temiz(d.height * oran), depth: temiz(d.depth * oran), ...(d.radius !== undefined ? { radius: temiz(d.radius * oran) } : {}) };
  let position = solid.position;
  if (pivot === 'merkez') {
    const c = cisimMerkezi(solid);
    // Merkez sabit: yeni cisimde taban merkezi, merkezden (oran katı) uzaklıkta
    const yeniYukseklik = rotatePoint3D({ x: 0, y: 0, z: merkezYuksekligi({ ...solid, dimensions }) }, solid.rotation);
    position = noktaTemizle(cikar(c, yeniYukseklik));
  } else if (typeof pivot === 'object') {
    position = noktaTemizle(topla(pivot, olcek(cikar(solid.position, pivot), oran)));
  }
  return { ...solid, dimensions, position };
}

/** k katı büyütmede hacim k³, yüzey alanı k² katına çıkar. */
export const olcekSonucu = (k: number) => ({ hacim: k * k * k, alan: k * k });

/** Ayna matrisi: düzleme dik eksen bileşeni ters çevrilir. */
function aynaMatrisi(duzlem: AynaDuzlemi): Mat {
  const i = duzlem === 'yz' ? 0 : duzlem === 'xz' ? 1 : 2;
  const S: Mat = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  S[i][i] = -1;
  return S;
}
/** Bütün cisim türlerinin paylaştığı yerel simetri: x → −x (küp, prizmalar, piramit, silindir, koni, küre). */
const YEREL_AYNA: Mat = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]];

/**
 * Düzleme göre yansıtılmış KOPYA (ayna görüntüsü). `seviye`: düzlemin konumu (yz → x = seviye, xz → y = seviye, xy → z = seviye).
 * Yüz renkleri aynada yer değiştireceğinden kopyaya taşınmaz. id ve name çağıranın verdiği değerleri alır (yoksa aynı kalır).
 */
export function cismiYansit(solid: Solid3DObject, duzlem: AynaDuzlemi, seviye = 0, o: { id?: string; name?: string } = {}): Solid3DObject {
  const S = aynaMatrisi(duzlem);
  const rotation = matrisEuler(carp(carp(S, eulerMatrisi(solid.rotation)), YEREL_AYNA));
  const p = { ...solid.position };
  if (duzlem === 'yz') p.x = 2 * seviye - p.x;
  else if (duzlem === 'xz') p.y = 2 * seviye - p.y;
  else p.z = 2 * seviye - p.z;
  const { faceColors: _renkler, ...kalan } = solid;
  void _renkler;
  return { ...kalan, id: o.id ?? solid.id, name: o.name ?? solid.name, position: noktaTemizle(p), rotation, selectedFaceIndex: null };
}

/** Vektörle ötelenmiş KOPYA. */
export function cismiOtele(solid: Solid3DObject, v: Point3D, o: { id?: string; name?: string } = {}): Solid3DObject {
  if (![v.x, v.y, v.z].every(Number.isFinite)) throw new RangeError('Öteleme vektörünün bileşenleri sayı olmalı.');
  return { ...solid, id: o.id ?? solid.id, name: o.name ?? solid.name, position: noktaTemizle(topla(solid.position, v)), selectedFaceIndex: null };
}

/** Kopya adı: "Küp 1" → "Küp 1 (yansıma)"; aynı ek iki kez eklenmez. */
export function kopyaAdi(name: string, ek: 'yansıma' | 'öteleme' | 'kopya'): string {
  const temel = name.replace(/\s*\((?:yansıma|öteleme|kopya)\)$/u, '');
  return `${temel} (${ek})`;
}
