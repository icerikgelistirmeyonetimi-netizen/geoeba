import type { Point3D, Solid3DObject, Solid3DType, Tool3DMode } from '@/types/workspace3d';
import { calculate3DSurfaceArea, calculate3DVolume, generateSolidMesh, rotatePoint3D } from '@/math/geometry3d';
import { OLCEK_EN_AZ, OLCEK_EN_COK, olcekSonucu } from '@/math/donusum3d';
import type { AynaDuzlemi, Eksen } from '@/math/donusum3d';
import { formatTurkishNumber } from '@/math/coordinates';

/**
 * 3B tuvalin dönüşüm ve inceleme araçlarının saf (three.js'siz) mantığı: fare sürüklemesi → dönme açısı,
 * tutamaç sürüklemesi → ölçek çarpanı, karşılıklı yüz eşlemesi, Türkçe sayı okuma, şerit metinleri.
 * Canvas3D yalnız olayları toplar ve buradaki işlevleri çağırır; böylece davranış tarayıcısız sınanabilir.
 */

export interface EkranNoktasi {
  x: number;
  y: number;
}

/* ----------------------------- Döndürme ----------------------------- */

/** Serbest sürüklemede piksel başına dönme (derece). */
export const PIKSEL_BASINA_DERECE = 0.5;
/** Shift basılıyken açılar bu adıma yuvarlanır (derece). */
export const ACI_ADIMI = 15;

/** Açıyı 15° adımlara yuvarlar (Shift davranışı); shift kapalıysa olduğu gibi döner. */
export function aciyiYuvarla(derece: number, shift: boolean, adim = ACI_ADIMI): number {
  if (!shift) return derece;
  const v = Math.round(derece / adim) * adim;
  return v === 0 ? 0 : v;
}

/**
 * Serbest sürükleme ("parmakla her yöne çevirme"): yatay hareket dünya z ekseni etrafında,
 * dikey hareket kameranın sağ vektörü etrafında döndürür. Sağa sürüklemek ön yüzü sağa götürür (+z),
 * aşağı sürüklemek cismin üstünü izleyiciye doğru yatırır (+sağ vektör).
 */
export function surukleAcisi(dxPx: number, dyPx: number, shift: boolean): { zDerece: number; sagDerece: number } {
  return {
    zDerece: aciyiYuvarla(dxPx * PIKSEL_BASINA_DERECE, shift),
    sagDerece: aciyiYuvarla(dyPx * PIKSEL_BASINA_DERECE, shift),
  };
}

/** Ekran koordinatında (y aşağı) merkezden noktaya giden doğrultunun açısı (radyan). */
const ekranAcisi = (merkez: EkranNoktasi, p: EkranNoktasi) => Math.atan2(p.y - merkez.y, p.x - merkez.x);

/**
 * Halka sürüklemesi: işaretçinin halka merkezi etrafında taradığı açı (derece, (−180, 180]).
 * `eksenKamerayaBakiyor`: halkanın ekseni izleyiciye doğruysa (eksen · kameraİleri < 0) ekranda saat yönünün tersi
 * pozitif dönmedir; aksi hâlde işaret ters çevrilir. Ekranda y aşağı olduğundan ham açı farkı eksiyle alınır.
 */
export function halkaAcisi(
  merkezEkran: EkranNoktasi,
  baslangicEkran: EkranNoktasi,
  simdiEkran: EkranNoktasi,
  eksenKamerayaBakiyor: boolean,
  shift = false
): number {
  const r0 = Math.hypot(baslangicEkran.x - merkezEkran.x, baslangicEkran.y - merkezEkran.y);
  const r1 = Math.hypot(simdiEkran.x - merkezEkran.x, simdiEkran.y - merkezEkran.y);
  if (r0 < 1e-6 || r1 < 1e-6) return 0;
  let fark = ekranAcisi(merkezEkran, simdiEkran) - ekranAcisi(merkezEkran, baslangicEkran);
  fark = ((fark + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  const derece = (-fark * 180) / Math.PI * (eksenKamerayaBakiyor ? 1 : -1);
  return aciyiYuvarla(Math.round(derece * 100) / 100, shift);
}

/** Eksen izleyiciye mi bakıyor? (eksen · kameraİleri < 0; ileri = kameradan sahneye) */
export function eksenKamerayaBakiyor(eksen: Eksen, kameraIleri: Point3D): boolean {
  return kameraIleri[eksen] < 0;
}

/**
 * Halka düzlemi kameraya yeterince açık mı? Eğik bakışta halka elips görünür ve ekran açısı gerçek dönmeyi
 * yanlış okur (izometrik bakışta 90° için ≈ 41°); o zaman açı halka düzlemindeki kesişim noktalarından ölçülür
 * (eksenEtrafindaAci). Düzlem kenardan görünüyorsa (|eksen · ileri| küçük) kesişim kararsızdır; ekran açısına dönülür.
 */
export const HALKA_KENAR_ESIGI = 0.18;
export function halkaDuzlemiAcik(eksen: Eksen, kameraIleri: Point3D): boolean {
  return Math.abs(kameraIleri[eksen]) >= HALKA_KENAR_ESIGI;
}

/**
 * Halka düzlemindeki iki yarıçap vektörü arasındaki yönlü açı (derece, (−180, 180]); sağ el kuralı: eksen yönünde
 * bakınca saat yönünün tersi pozitiftir. Kameranın hangi yandan baktığı önemsizdir (işaret kendiliğinden doğru).
 * Vektörler önce düzleme izdüşürülür; biri sıfıra yakınsa 0.
 */
export function eksenEtrafindaAci(eksen: Eksen, v0: Point3D, v1: Point3D, shift = false): number {
  const n = { x: eksen === 'x' ? 1 : 0, y: eksen === 'y' ? 1 : 0, z: eksen === 'z' ? 1 : 0 };
  const izdus = (v: Point3D): Point3D => {
    const d = v.x * n.x + v.y * n.y + v.z * n.z;
    return { x: v.x - d * n.x, y: v.y - d * n.y, z: v.z - d * n.z };
  };
  const a = izdus(v0);
  const b = izdus(v1);
  if (Math.hypot(a.x, a.y, a.z) < 1e-6 || Math.hypot(b.x, b.y, b.z) < 1e-6) return 0;
  const capraz = { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
  const sin = capraz.x * n.x + capraz.y * n.y + capraz.z * n.z;
  const cos = a.x * b.x + a.y * b.y + a.z * b.z;
  const derece = (Math.atan2(sin, cos) * 180) / Math.PI;
  return aciyiYuvarla(Math.round(derece * 100) / 100, shift);
}

/** Canlı Euler okuması: "x: 0°, y: 0°, z: 90°" */
export function eulerMetni(rot: Point3D): string {
  const f = (v: number) => `${formatTurkishNumber(Math.round(v * 10) / 10, 1)}°`;
  return `x: ${f(rot.x)}, y: ${f(rot.y)}, z: ${f(rot.z)}`;
}

/** Hazır dönme açıları (derece). */
export const HAZIR_ACILAR = [30, 45, 60, 90, 180] as const;

/* --------------------------- Büyüt / küçült --------------------------- */

/**
 * Tutamaç sürüklemesi → ölçek çarpanı: işaretçinin cismin ekran merkezine uzaklığının başlangıçtaki
 * uzaklığa oranı. Başlangıç uzaklığı sıfıra yakınsa 1; sonuç [OLCEK_EN_AZ, OLCEK_EN_COK] aralığına kırpılır.
 */
export function tutamacOlcegi(merkezEkran: EkranNoktasi, baslangicEkran: EkranNoktasi, simdiEkran: EkranNoktasi): number {
  const r0 = Math.hypot(baslangicEkran.x - merkezEkran.x, baslangicEkran.y - merkezEkran.y);
  const r1 = Math.hypot(simdiEkran.x - merkezEkran.x, simdiEkran.y - merkezEkran.y);
  if (r0 < 1e-6) return 1;
  const k = Math.round((r1 / r0) * 100) / 100;
  return Math.min(OLCEK_EN_COK, Math.max(OLCEK_EN_AZ, k));
}

/** Hazır ölçek çarpanları (etiket, değer). */
export const HAZIR_OLCEKLER: readonly { etiket: string; k: number }[] = [
  { etiket: '×2', k: 2 },
  { etiket: '×1,5', k: 1.5 },
  { etiket: '×½', k: 0.5 },
];

/** "Kenarlar 2 katına çıktı: hacim 8 kat, yüzey alanı 4 kat" (k < 1 için "… katına indi"). */
export function olcekNotu(k: number): string {
  const { hacim, alan } = olcekSonucu(k);
  const fiil = k >= 1 ? 'çıktı' : 'indi';
  return `Kenarlar ${formatTurkishNumber(k, 2)} katına ${fiil}: hacim ${formatTurkishNumber(hacim, 3)} kat, yüzey alanı ${formatTurkishNumber(alan, 3)} kat`;
}

/**
 * Cismin KENDİ sınır kutusunun (yerel eksenlerde; döndürmeyle birlikte çevrilir) 8 köşesi, dünya koordinatında.
 * Tutamaçlar böylece döndürülmüş cismin de kendi köşelerinde durur; dünya eksenli kutu kullanılsa cisimden uzakta
 * boşlukta yüzerlerdi ("cisim üzerindeki tutamacı sürükleyerek" — ilkokul raporu).
 */
export function kutuKoseleri(solid: Solid3DObject): Point3D[] {
  const { vertices } = generateSolidMesh({ ...solid, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
  if (vertices.length === 0) return [];
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    if (v.z < minZ) minZ = v.z; if (v.z > maxZ) maxZ = v.z;
  }
  const out: Point3D[] = [];
  for (const x of [minX, maxX]) for (const y of [minY, maxY]) for (const z of [minZ, maxZ]) {
    const r = rotatePoint3D({ x, y, z }, solid.rotation);
    out.push({ x: r.x + solid.position.x, y: r.y + solid.position.y, z: r.z + solid.position.z });
  }
  return out;
}

/* ------------------------------ Yüzler ------------------------------ */

/**
 * Karşılıklı yüz dizini (generateSolidMesh yüz sırasına göre). `acik`: açınım açıkken (unfoldProgress > 0) yüz sırası
 * değişir. Eşleşmesi olmayan yüzlerde (piramit, koni, küre, üçgen prizmanın alt yüzü, silindirin yan şeritleri) null.
 */
export function karsiYuz(type: Solid3DType, index: number, acik = false): number | null {
  let ciftler: [number, number][];
  switch (type) {
    case 'cube':
    case 'prism':
      // kapalı: Alt, Üst, Arka, Ön, Sol, Sağ · açık: Alt, Arka, Üst, Ön, Sol, Sağ
      ciftler = acik ? [[0, 2], [1, 3], [4, 5]] : [[0, 1], [2, 3], [4, 5]];
      break;
    case 'triangular_prism':
      // kapalı: Alt, Sağ, Sol, Ön üçgen, Arka üçgen · açık: Alt, Sol, Sağ, Arka kapak, Ön kapak
      ciftler = [[1, 2], [3, 4]];
      break;
    case 'cylinder':
      // kapalı: Alt daire 0, Üst daire 1 · açık: 47 yan şeritten sonra Alt 47, Üst 48
      ciftler = acik ? [[47, 48]] : [[0, 1]];
      break;
    default:
      return null;
  }
  for (const [a, b] of ciftler) {
    if (index === a) return b;
    if (index === b) return a;
  }
  return null;
}

/* ----------------------------- Ayrıtlar ----------------------------- */

export interface OlculenAyrit {
  solidId: string;
  edgeIdx: number;
}

export const ayritAnahtari = (a: OlculenAyrit) => `${a.solidId}:${a.edgeIdx}`;

/** Listede varsa çıkarır, yoksa ekler (aynı ayrıta ikinci tıklama etiketi kaldırır). */
export function ayritiDegistir(liste: OlculenAyrit[], ayrit: OlculenAyrit): OlculenAyrit[] {
  const anahtar = ayritAnahtari(ayrit);
  return liste.some((a) => ayritAnahtari(a) === anahtar) ? liste.filter((a) => ayritAnahtari(a) !== anahtar) : [...liste, ayrit];
}

/** Cismin bir ayrıtının uzunluğu ve orta noktası; ayrıt yoksa null. */
export function ayritOlcusu(solid: Solid3DObject, edgeIdx: number): { uzunluk: number; orta: Point3D } | null {
  const mesh = generateSolidMesh(solid);
  const e = mesh.edges[edgeIdx];
  if (!e) return null;
  const a = mesh.vertices[e.startIdx];
  const b = mesh.vertices[e.endIdx];
  if (!a || !b) return null;
  return {
    uzunluk: Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z),
    orta: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 },
  };
}

/** Uzunluk etiketi: "3 br" (tam sayıysa ondalıksız, değilse en çok 2 basamak). */
export function uzunlukMetni(uzunluk: number): string {
  return `${formatTurkishNumber(Math.round(uzunluk * 100) / 100, 2)} br`;
}

/* ------------------------------ Sayılar ------------------------------ */

/** Türkçe yazılmış sayıyı okur ("1,5", "−2", " 3 "); boş ya da geçersizse null. */
export function turkceSayiOku(metin: string): number | null {
  const temiz = metin.trim().replace(/\s+/g, '').replace(/[−–]/g, '-').replace(',', '.');
  if (temiz === '' || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(temiz)) return null;
  const v = Number(temiz);
  return Number.isFinite(v) ? v : null;
}

/** Sayıyı Türkçe yazar (giriş kutularının başlangıç metni). */
export const turkceSayiYaz = (v: number) => formatTurkishNumber(v, 2);

/* ------------------------------ Şeritler ------------------------------ */

export const CISIM_GEREKEN_ARACLAR: readonly Tool3DMode[] = ['rotate_3d', 'scale_3d', 'reflect_3d', 'translate_3d'];

/** Cisim seçili değilken şeritte gösterilen açıklama. */
export const ONCE_CISIM_SECIN = 'Önce bir cisim seçin';

/** Seçili tek cisim için canlı "V = 27 br³ · A = 54 br²" */
export function hacimAlanMetni(solid: Solid3DObject): string {
  return `V = ${formatTurkishNumber(calculate3DVolume(solid), 1)} br³ · A = ${formatTurkishNumber(calculate3DSurfaceArea(solid), 1)} br²`;
}

/** Ayna düzlemi seçenekleri ve etiketleri: "xy düzlemi (z = 0)" */
export const AYNA_DUZLEMLERI: readonly { duzlem: AynaDuzlemi; dik: Eksen; ad: string }[] = [
  { duzlem: 'xy', dik: 'z', ad: 'xy düzlemi' },
  { duzlem: 'xz', dik: 'y', ad: 'xz düzlemi' },
  { duzlem: 'yz', dik: 'x', ad: 'yz düzlemi' },
];

export function duzlemEtiketi(duzlem: AynaDuzlemi, seviye: number): string {
  const tanim = AYNA_DUZLEMLERI.find((d) => d.duzlem === duzlem)!;
  return `${tanim.ad} (${tanim.dik} = ${formatTurkishNumber(seviye, 2)})`;
}

/** Ayna düzleminin dünya normali. */
export function duzlemNormali(duzlem: AynaDuzlemi): Point3D {
  return duzlem === 'yz' ? { x: 1, y: 0, z: 0 } : duzlem === 'xz' ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 };
}

// ---------------------------------------------------------------------------------------------- fare tuşları

export type KameraEtkilesimi = 'orbit' | 'pan';

/**
 * Fare tuşu → kamera etkileşimi (tuş şeması tek yerde):
 *   - Orta tuşla sürükleme görünümü DÖNDÜRÜR (Blender / SketchUp kuralı); Shift basılıyken kaydırır.
 *   - Sağ tuşla sürükleme görünümü KAYDIRIR (2B'den gelen alışkanlık korunur; bağlam menüsü yoktur).
 *   - Alt + sol tuş 2B tuvaldeki gibi kaydırır. Yalın sol tuş etkin araca bırakılır (null).
 *   - Tekerlek yakınlaştırmadır, burada ele alınmaz.
 */
export function kameraEtkilesimi(button: number, shiftKey: boolean, altKey: boolean): KameraEtkilesimi | null {
  if (button === 1) return shiftKey ? 'pan' : 'orbit';
  if (button === 2) return 'pan';
  if (button === 0 && altKey) return 'pan';
  return null;
}

// ---------------------------------------------------------------------------------------------- dokunma (iki parmak)

export interface ParmakCifti { orta: EkranNoktasi; uzaklik: number }

/** İki dokunuşun orta noktası ve aralarındaki uzaklık (piksel). */
export function parmakCifti(a: EkranNoktasi, b: EkranNoktasi): ParmakCifti {
  return { orta: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, uzaklik: Math.hypot(a.x - b.x, a.y - b.y) };
}

/**
 * İki parmak hareketi → kamera: orta nokta kayması görünümü kaydırır (piksel), parmak aralığı oranı yakınlaştırır.
 * Çok küçük aralıklar (parmaklar üst üste) oran hesabını bozmasın diye 1 piksele kırpılır.
 */
export function ikiParmakKamera(onceki: ParmakCifti, simdi: ParmakCifti): { dPanX: number; dPanY: number; zoomCarpani: number } {
  return {
    dPanX: simdi.orta.x - onceki.orta.x,
    dPanY: simdi.orta.y - onceki.orta.y,
    zoomCarpani: simdi.uzaklik / Math.max(1, onceki.uzaklik),
  };
}
