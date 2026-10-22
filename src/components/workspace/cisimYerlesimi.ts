/**
 * 3B sahnede yeni cismin ÖLÇÜSÜ, YERİ ve kameranın ona ODAKLANMASI; Görünümü Sıfırla (3B).
 *
 * Alan uzmanı (4. tur, geoeba (3).xlsx [173], [174]):
 *  - Eklenen cisimler sol kenarda, araç panelinin altında doğuyor, yeniler öncekilerin üstüne biniyordu
 *    (eski kural: sıra numarasıyla x = (i mod 4 − 1,5) · 4,5 — ilk cisim bile merkezin 6,75 br solunda).
 *    → Yeni cisim kameranın baktığı noktanın en yakınındaki BOŞ yere konur (bosKonumBul); hâlâ görünmüyorsa
 *    kamera ona kaydırılır, sığmıyorsa uzaklaşılır (cismiGorunurKil).
 *  - Görünümü Sıfırla 3B kamerayı geri getirmiyordu (Ölçek %130 kalıyordu) → kamerayiSifirla.
 *  - Dikdörtgen prizma 3 × 3 × 3 (küp) ekleniyordu → 4 × 3 × 2 (VARSAYILAN_CISIM_OLCULERI).
 *
 * Kamera formülleri Canvas3D.buildCameraBasis ile birebir aynıdır (three.js'e bağlı olmadan).
 */
import {
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  type Camera3D,
  type Point3D,
  type Solid3DObject,
  type Solid3DType,
  type UcgenTabani,
} from '@/types/workspace3d';
import { eskenarYuksekligi, generateSolidMesh, ucgenTabaniniBul } from '@/math/geometry3d';
import { yapismaOturumuKur, yapistir, type YapismaProfili } from '@/math/yapisma3d';
import { kutuKoseleri } from './canvas3dDonusum';

/** Stüdyonun açılış kamerası; Ölçek %100 = zoom 55 (Canvas3D alt bilgisi: zoom / 55). */
export const VARSAYILAN_KAMERA_3B: Camera3D = {
  rotX: 25,
  rotY: -40,
  zoom: 55,
  panX: 0,
  panY: 30,
  perspective: 700,
  showGrid: true,
  showAxes: true,
  showCoordinates: true,
};

/** Görünümü Sıfırla (3B): açı, ölçek (%100) ve kaydırma varsayılana döner; ızgara / eksen seçimleri korunur. */
export function kamerayiSifirla(onceki: Camera3D): Camera3D {
  const { rotX, rotY, zoom, panX, panY } = VARSAYILAN_KAMERA_3B;
  return { ...onceki, rotX, rotY, zoom, panX, panY };
}

export interface CisimOlculeri {
  width: number;
  height: number;
  depth: number;
  radius: number;
}

/**
 * Tıkla Ekle ile gelen cismin ölçüleri. Dikdörtgen prizmanın üç ayrıtı FARKLI (4 × 3 × 2 br: genişlik × derinlik
 * × yükseklik): küple aynı 3 × 3 × 3 ölçü, öğrenciye "dikdörtgen prizma = küp" modelini veriyordu.
 */
export const VARSAYILAN_CISIM_OLCULERI: Readonly<Record<Solid3DType, CisimOlculeri>> = {
  cube: { width: 3, height: 3, depth: 3, radius: 1.5 },
  sphere: { width: 3, height: 3, depth: 3, radius: 1.5 },
  cylinder: { width: 3, height: 3, depth: 3, radius: 1.5 },
  prism: { width: 4, height: 2, depth: 3, radius: 2 },
  triangular_prism: { width: 3, height: 3, depth: 3, radius: 1.5 },
  cone: { width: 3, height: 3, depth: 3, radius: 1.5 },
  pyramid: { width: 3, height: 3, depth: 3, radius: 1.5 },
};

/** Zeminde Çiz: sürüklenen boy `boy` br; dikdörtgen prizma varsayılanın oranını (4 : 3 : 2) korur, küp olmaz. */
export function cizimOlculeri(tur: Solid3DType, boy: number, tamSayi = false): CisimOlculeri {
  if (tamSayi) {
    const d = cizimOlculeri(tur, Math.max(1, Math.round(boy)));
    const dimensions = { width: Math.max(1, Math.round(d.width)), height: Math.max(1, Math.round(d.height)),
      depth: Math.max(1, Math.round(d.depth)), radius: Math.max(1, Math.round(d.radius)) };
    if (tur === 'sphere' || tur === 'cylinder' || tur === 'cone') {
      dimensions.width = dimensions.depth = dimensions.radius * 2;
      if (tur === 'sphere') dimensions.height = dimensions.radius * 2;
    }
    return dimensions;
  }
  if (tur === 'prism') {
    const v = VARSAYILAN_CISIM_OLCULERI.prism;
    const k = boy / v.width;
    const yuvarla = (n: number) => Math.max(0.5, Number((n * k).toFixed(1)));
    return { width: boy, depth: yuvarla(v.depth), height: yuvarla(v.height), radius: boy / 2 };
  }
  return { width: boy, height: boy, depth: boy, radius: boy / 2 };
}

/**
 * Taban üçgeni türü değişince cismin güncellemesi. Eşkenar: yükseklik kenardan hesaplanır. Eşkenardan ikizkenara
 * geçişte yükseklik genişliğe eşitlenir (aksi hâlde üçgen yine eşkenar kalırdı); dik üçgende yükseklik 0,5 br'ye yuvarlanır.
 */
export function ucgenTabaniGuncellemesi(solid: Solid3DObject, tur: UcgenTabani): Partial<Solid3DObject> {
  const d = solid.dimensions;
  const yuvarla = (v: number) => Math.max(0.5, Math.round(v * 2) / 2);
  if (tur === 'eskenar') return { tabanUcgeni: tur, dimensions: { ...d, height: eskenarYuksekligi(d.width) } };
  const eskenardi = ucgenTabaniniBul(solid) === 'eskenar';
  if (tur === 'ikizkenar') return { tabanUcgeni: tur, dimensions: eskenardi ? { ...d, height: yuvarla(d.width) } : d };
  return { tabanUcgeni: tur, dimensions: { ...d, height: yuvarla(d.height) } };
}

/* ------------------------------ Kamera ------------------------------ */

interface Vektor {
  x: number;
  y: number;
  z: number;
}

const nokta = (a: Vektor, b: Vektor) => a.x * b.x + a.y * b.y + a.z * b.z;
const RAD = Math.PI / 180;
/** Canvas3D FOV_DEG ile aynı */
const GORUS_ACISI = 40;

/** Kameranın ileri / yukarı / sağ birim vektörleri ve bakış noktası (Canvas3D.buildCameraBasis). */
export function kameraTabani(kamera: Camera3D): { ileri: Vektor; yukari: Vektor; sag: Vektor; bakis: Vektor; zoom: number } {
  const yaw = kamera.rotY * RAD;
  const pitch = kamera.rotX * RAD;
  const cp = Math.cos(pitch);
  const sp = -Math.sin(pitch);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const ileri = { x: sy * cp, y: cy * cp, z: sp };
  const yukari = { x: -sy * sp, y: -cy * sp, z: cp };
  const sag = { x: cy, y: -sy, z: 0 };
  const zoom = Math.max(1, kamera.zoom);
  const a = -kamera.panX / zoom;
  const b = kamera.panY / zoom;
  const bakis = { x: sag.x * a + yukari.x * b, y: sag.y * a + yukari.y * b, z: sag.z * a + yukari.z * b };
  return { ileri, yukari, sag, bakis, zoom };
}

/** Ekranın ortasındaki bakış noktası (kamera hedefi); yeni cisim bunun zemindeki izdüşümünün yanına konur. */
export function bakisNoktasi(kamera: Camera3D): Point3D {
  return kameraTabani(kamera).bakis;
}

/** Kamerayı `p` ekranın ortasına gelecek biçimde kaydırır (açı ve ölçek değişmez). */
export function kameraOdagi(kamera: Camera3D, p: Point3D): Camera3D {
  const { sag, yukari, zoom } = kameraTabani(kamera);
  return { ...kamera, panX: -nokta(p, sag) * zoom, panY: nokta(p, yukari) * zoom };
}

/** Dünya noktasının ekran konumu (piksel; Canvas3D'nin perspektif kamerasıyla aynı); kameranın arkasındaysa null. */
export function ekranaIzdusur(kamera: Camera3D, p: Point3D, genislik: number, yukseklik: number): { x: number; y: number } | null {
  const { ileri, yukari, sag, bakis, zoom } = kameraTabani(kamera);
  const yariGorus = (GORUS_ACISI / 2) * RAD;
  const odak = Math.max(1, yukseklik) / 2 / Math.tan(yariGorus);
  const uzaklik = odak / zoom;
  const goz = { x: bakis.x - ileri.x * uzaklik, y: bakis.y - ileri.y * uzaklik, z: bakis.z - ileri.z * uzaklik };
  const v = { x: p.x - goz.x, y: p.y - goz.y, z: p.z - goz.z };
  const derinlik = nokta(v, ileri);
  if (derinlik <= 0.1) return null;
  return {
    x: genislik / 2 + (nokta(v, sag) / derinlik) * odak,
    y: yukseklik / 2 - (nokta(v, yukari) / derinlik) * odak,
  };
}

/** Tuvalin cisim çizilebilen kısmı: üstte araç düğmeleri ve açınım şeridi, sağda 2D/3D ve yakınlaştırma düğmeleri, altta alt bilgi. */
export interface EkranPayi {
  sol: number;
  ust: number;
  sag: number;
  alt: number;
}
export const CISIM_EKRAN_PAYI: EkranPayi = { sol: 24, ust: 120, sag: 64, alt: 48 };

/** Hepsini sığdırırken inilebilecek en küçük ölçek (zoom 30 ≈ %55): daha uzakta yazılar okunmaz, yalnız yeni cisme odaklanılır. */
export const SIGDIRMA_EN_AZ_ZOOM = 30;

/**
 * Yeni eklenen cismin bütün köşeleri (kutuKoseleri) güvenli alanda görünüyorsa kamerayı OLDUĞU GİBİ döndürür. Değilse
 * önce sahnedeki BÜTÜN cisimleri (tumKoseler) güvenli alana sığdırmayı dener (ortalar, gerekirse SIGDIRMA_EN_AZ_ZOOM'a
 * kadar uzaklaşır): yeni cisme odaklanırken eskiler ekrandan kaçmasın. Sığmıyorsa yalnız yeni cisme odaklanır.
 */
export function cismiGorunurKil(
  kamera: Camera3D,
  koseler: readonly Point3D[],
  genislik: number,
  yukseklik: number,
  tumKoseler: readonly Point3D[] = koseler,
  pay: EkranPayi = CISIM_EKRAN_PAYI,
): Camera3D {
  if (koseler.length === 0 || genislik < 2 || yukseklik < 2) return kamera;
  // Dar tuvalde (çoklu görünüm) pay alanı yutmasın
  const p = genislik - pay.sol - pay.sag < 80 || yukseklik - pay.ust - pay.alt < 80 ? { sol: 8, ust: 8, sag: 8, alt: 8 } : pay;
  const alan = { x0: p.sol, y0: p.ust, x1: genislik - p.sag, y1: yukseklik - p.alt };
  const kutu = (k: Camera3D, noktalar: readonly Point3D[]) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of noktalar) {
      const e = ekranaIzdusur(k, c, genislik, yukseklik);
      if (!e) return null;
      x0 = Math.min(x0, e.x); x1 = Math.max(x1, e.x); y0 = Math.min(y0, e.y); y1 = Math.max(y1, e.y);
    }
    return { x0, y0, x1, y1 };
  };
  const icinde = (k: Camera3D, noktalar: readonly Point3D[]) => {
    const b = kutu(k, noktalar);
    return !!b && b.x0 >= alan.x0 - 0.5 && b.x1 <= alan.x1 + 0.5 && b.y0 >= alan.y0 - 0.5 && b.y1 <= alan.y1 + 0.5;
  };
  if (icinde(kamera, koseler)) return kamera;

  // Güvenli alanın ortası ekran ortasından kaydıkça (üst pay büyük) görüntü de o kadar kaydırılır:
  // panX + d → görüntü d px sağa, panY + d → d px aşağı (Canvas3D: bakış = sağ·(−panX/zoom) + yukarı·(panY/zoom)).
  const ortaX = (alan.x0 + alan.x1) / 2 - genislik / 2;
  const ortaY = (alan.y0 + alan.y1) / 2 - yukseklik / 2;
  const ortala = (k: Camera3D, noktalar: readonly Point3D[]) => {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (const c of noktalar) {
      x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y); z0 = Math.min(z0, c.z); z1 = Math.max(z1, c.z);
    }
    const o = kameraOdagi(k, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2 });
    return { ...o, panX: o.panX + ortaX, panY: o.panY + ortaY };
  };
  /** Ortalar; sığmıyorsa en çok `enAzZoom`a kadar uzaklaşır. */
  const sigdir = (noktalar: readonly Point3D[], enAzZoom: number) => {
    let yeni = ortala(kamera, noktalar);
    for (let i = 0; i < 6 && !icinde(yeni, noktalar); i++) {
      const b = kutu(yeni, noktalar);
      const oran = b ? Math.min((alan.x1 - alan.x0) / Math.max(1, b.x1 - b.x0), (alan.y1 - alan.y0) / Math.max(1, b.y1 - b.y0)) : 0.5;
      const zoom = Math.max(enAzZoom, Math.min(CAMERA_ZOOM_MAX, yeni.zoom * Math.min(0.95, oran * 0.92)));
      if (zoom >= yeni.zoom) break;
      yeni = ortala({ ...yeni, zoom }, noktalar);
    }
    return yeni;
  };

  if (tumKoseler.length > koseler.length) {
    const hepsi = sigdir(tumKoseler, Math.min(kamera.zoom, SIGDIRMA_EN_AZ_ZOOM));
    if (icinde(hepsi, tumKoseler)) return hepsi;
  }
  return sigdir(koseler, CAMERA_ZOOM_MIN);
}

/* ------------------------------ Boş yer ------------------------------ */

export interface Kutu2B {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Cismin zemindeki (xy) kapladığı dikdörtgen: döndürme ve açınım dahil, gerçek köşelerden. */
export function cisimTabanKutusu(cisim: Solid3DObject): Kutu2B {
  const { vertices } = generateSolidMesh(cisim);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
  }
  if (!Number.isFinite(minX)) {
    const { x, y } = cisim.position;
    return { minX: x, maxX: x, minY: y, maxY: y };
  }
  return { minX, maxX, minY, maxY };
}

/** İki cisim arasında bırakılan en az boşluk (br): ölçü etiketleri ve köşe işaretleri birbirine binmesin. */
export const CISIM_BOSLUGU = 1.5;
/** Boş yer bakış noktasının en çok bu kadar br yakınında aranır (ızgara 24 br; ötesi taşma sayılır). */
const ARAMA_YARICAPI = 30;

/** Ekranda (kameradan bakınca) iki cismin arasında bırakılan en az boşluk (br, bakış noktası uzaklığında). */
export const GORSEL_BOSLUK = 0.4;

const bosCisim = (yeni: Pick<Solid3DObject, 'type' | 'dimensions'> & Partial<Pick<Solid3DObject, 'rotation'>>): Solid3DObject => ({
  id: '', name: '', type: yeni.type, dimensions: yeni.dimensions, position: { x: 0, y: 0, z: 0 },
  rotation: yeni.rotation ?? { x: 0, y: 0, z: 0 }, color: '', opacity: 1, showWireframe: true, showVertices: true,
  showFaces: true, unfoldProgress: 0, selectedFaceIndex: null,
});

/**
 * Yeni cismin taban merkezi: bakış noktasının (zemindeki izdüşümü, tam sayıya yuvarlanmış) en yakınındaki ızgara noktası.
 * İki koşul aranır: (1) zeminde var olan cisimlerin kapladığı alana CISIM_BOSLUGU'ndan fazla yaklaşmaz (üst üste binme
 * yok); (2) kameradan bakınca (dik izdüşüm: kameranın sağ ve yukarı eksenleri) hiçbir cismin önüne ya da arkasına düşmez
 * (birbirini örtme yok — ölçü etiketleri ve açınım okunur kalsın). (2)'yi sağlayan yer yoksa yalnız (1) aranır.
 * Uzaklık ekran yatayında (kameranın sağı) 1, derinlikte 2 ağırlıkla ölçülür; eşitlikte sağ taraf önce gelir.
 * Hiç boş yer yoksa bakış noktası döner.
 */
export function yerlesimKonumuHesapla(
  mevcut: readonly Solid3DObject[],
  taslakTip: Solid3DType,
  taslakOlcu: { width: number; height: number; depth: number; radius?: number },
  hamKonum: Point3D,
  ayarlar: {
    acik: boolean;
    izgaraAcik: boolean;
    nesneAcik: boolean;
    izgaraGorunur: boolean;
    pikselBasinaBirim: number;
    profil: YapismaProfili;
  }
): Point3D {
  if (!ayarlar.acik || (!ayarlar.izgaraAcik && !ayarlar.nesneAcik)) {
    return { x: Number(hamKonum.x.toFixed(1)), y: Number(hamKonum.y.toFixed(1)), z: Number((hamKonum.z || 0).toFixed(1)) };
  }
  const taslak: Solid3DObject = {
    id: '__yerlesim_taslak__',
    type: taslakTip,
    name: '',
    position: { x: 0, y: 0, z: 0 },
    dimensions: taslakOlcu,
    rotation: { x: 0, y: 0, z: 0 },
    color: '',
    opacity: 1,
    showWireframe: true,
    showVertices: false,
    showFaces: true,
    unfoldProgress: 0,
    selectedFaceIndex: null,
  };
  const sahne = ayarlar.nesneAcik ? [...mevcut, taslak] : [taslak];
  const profil: YapismaProfili = ayarlar.izgaraAcik
    ? { ...ayarlar.profil, izgara: 'her_zaman' }
    : ayarlar.profil;
  const oturum = yapismaOturumuKur(
    sahne,
    ['__yerlesim_taslak__'],
    { __yerlesim_taslak__: { x: 0, y: 0, z: 0 } },
    'serbest',
    profil
  );
  const sonuc = yapistir(oturum, {
    hamDelta: hamKonum,
    pikselBasinaBirim: ayarlar.pikselBasinaBirim,
    izgaraGorunur: ayarlar.izgaraAcik && ayarlar.izgaraGorunur,
  });
  return {
    x: Number(sonuc.delta.x.toFixed(2)),
    y: Number(sonuc.delta.y.toFixed(2)),
    z: Number(sonuc.delta.z.toFixed(2)),
  };
}

export function bosKonumBul(
  mevcut: readonly Solid3DObject[],
  yeni: Pick<Solid3DObject, 'type' | 'dimensions'> & Partial<Pick<Solid3DObject, 'rotation'>>,
  kamera: Camera3D,
  bosluk: number = CISIM_BOSLUGU,
): Point3D {
  const { bakis, sag, yukari, ileri } = kameraTabani(kamera);
  const merkezX = Math.round(bakis.x);
  const merkezY = Math.round(bakis.y);
  // Yatay bakış yönü (ileri vektörünün zemindeki izdüşümü); tam üstten bakışta yukarı vektörü kullanılır
  const yatayUzunluk = Math.hypot(ileri.x, ileri.y);
  const derinlikYonu = yatayUzunluk > 1e-6 ? { x: ileri.x / yatayUzunluk, y: ileri.y / yatayUzunluk } : { x: -sag.y, y: sag.x };

  // (1) Zemin: kapladığı dikdörtgenler
  const ornek = bosCisim(yeni);
  const goreli = cisimTabanKutusu(ornek);
  const engeller = mevcut.map(cisimTabanKutusu);
  const zemindeBos = (x: number, y: number) =>
    engeller.every(
      (e) =>
        goreli.minX + x >= e.maxX + bosluk ||
        goreli.maxX + x <= e.minX - bosluk ||
        goreli.minY + y >= e.maxY + bosluk ||
        goreli.maxY + y <= e.minY - bosluk,
    );

  // (2) Ekran: sınır kutusu köşelerinin kameranın sağ / yukarı eksenlerine izdüşümü
  const ekranKutusu = (koseler: Point3D[]) => {
    let s0 = Infinity, s1 = -Infinity, u0 = Infinity, u1 = -Infinity;
    for (const c of koseler) {
      const a = nokta(c, sag);
      const b = nokta(c, yukari);
      s0 = Math.min(s0, a); s1 = Math.max(s1, a); u0 = Math.min(u0, b); u1 = Math.max(u1, b);
    }
    return { s0, s1, u0, u1 };
  };
  const yeniEkran = ekranKutusu(kutuKoseleri(ornek));
  const gorselEngeller = mevcut.map((m) => ekranKutusu(kutuKoseleri(m)));
  const ekrandaBos = (x: number, y: number) => {
    const ds = x * sag.x + y * sag.y;
    const du = x * yukari.x + y * yukari.y;
    return gorselEngeller.every(
      (e) =>
        yeniEkran.s0 + ds >= e.s1 + GORSEL_BOSLUK ||
        yeniEkran.s1 + ds <= e.s0 - GORSEL_BOSLUK ||
        yeniEkran.u0 + du >= e.u1 + GORSEL_BOSLUK ||
        yeniEkran.u1 + du <= e.u0 - GORSEL_BOSLUK,
    );
  };

  const ara = (gorselde: boolean): Point3D | null => {
    let enIyi: { x: number; y: number; puan: number; yan: number } | null = null;
    for (let dx = -ARAMA_YARICAPI; dx <= ARAMA_YARICAPI; dx++) {
      for (let dy = -ARAMA_YARICAPI; dy <= ARAMA_YARICAPI; dy++) {
        const yan = dx * sag.x + dy * sag.y;
        const derin = dx * derinlikYonu.x + dy * derinlikYonu.y;
        const puan = yan * yan + 2 * derin * derin;
        if (enIyi && (puan > enIyi.puan + 1e-9 || (Math.abs(puan - enIyi.puan) <= 1e-9 && yan <= enIyi.yan))) continue;
        const x = merkezX + dx;
        const y = merkezY + dy;
        if (!zemindeBos(x, y) || (gorselde && !ekrandaBos(x, y))) continue;
        enIyi = { x, y, puan, yan };
      }
    }
    return enIyi ? { x: enIyi.x, y: enIyi.y, z: 0 } : null;
  };
  return ara(true) ?? ara(false) ?? { x: merkezX, y: merkezY, z: 0 };
}
