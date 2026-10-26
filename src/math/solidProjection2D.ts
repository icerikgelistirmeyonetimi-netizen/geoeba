import type { Point2D, ScreenPoint, ViewportTransform } from '@/types/math';
import type { Solid3DObject, Point3D } from '@/types/workspace3d';
import { worldToScreen, formatTurkishNumber } from '@/math/coordinates';
import { generateSolidMesh, calculate3DVolume, calculate3DSurfaceArea, ucgenTepeX } from '@/math/geometry3d';
import { labelZoomScale } from '@/math/labelViewport';
import { NESNE_RENGI, NESNE_SECIM_RENGI } from '@/utils/nesneRenkleri';

/*
 * 3B CİSİMLERİN 2B TUVALDEKİ GÖRÜNÜMÜ. Tuval cisimleri ÜSTTEN gösterir: küp kare, dikdörtgenler prizması dikdörtgen,
 * üçgen prizma taban üçgeni, piramit tepeye birleşen ayrıtlı taban, silindir / koni / küre daire. Hacimli
 * (aksonometrik) görünüm arayüzden kaldırıldı (8 Ekim 2026); hesabı ve testleri korunur.
 */

/** İzdüşüm açısı (55 derece, kavalier/aksonometrik bakış) */
export const PROJECTION_ANGLE_RAD = (55 * Math.PI) / 180;
/** Derinlik / Z ekseni ölçek çarpanı */
export const PROJECTION_DEPTH_SCALE = 0.55;

export type SolidProjectionMode = 'top' | 'axonometric';

/**
 * 3B noktanın 2B dünya karşılığı. Üstten görünümde z düzleme diktir, (x, y) aynen alınır; aksonometrik görünümde z,
 * `angleRad` açısıyla yukarı-sağa `scale` oranında kısalarak uzanır.
 */
export function projectPoint3DTo2DWorld(
  p: Point3D,
  angleRad: number = PROJECTION_ANGLE_RAD,
  scale: number = PROJECTION_DEPTH_SCALE,
  mode: SolidProjectionMode = 'top'
): Point2D {
  if (mode === 'top') return { x: p.x, y: p.y };
  return { x: p.x + p.z * Math.cos(angleRad) * scale, y: p.y + p.z * Math.sin(angleRad) * scale };
}

export interface ProjectedFace2D {
  points: ScreenPoint[];
  pointsAttr: string;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  label?: string;
  depth: number;
}

export interface ProjectedEdge2D {
  from: ScreenPoint;
  to: ScreenPoint;
  isHidden: boolean;
  stroke: string;
  strokeWidth: number;
}

export interface ProjectedFootprint2D {
  points: ScreenPoint[];
  pointsAttr: string;
  centerScreen: ScreenPoint;
  centerWorld: Point2D;
}

export interface TopViewData {
  kind: 'polygon' | 'circle' | 'cone' | 'pyramid';
  points?: ScreenPoint[];
  pointsAttr?: string;
  centerScreen: ScreenPoint;
  radius?: number;
  apexScreen?: ScreenPoint;
  diagEdges?: { from: ScreenPoint; to: ScreenPoint }[];
  dimensionLabels: { x: number; y: number; text: string }[];
  baseShapeName: string;
  baseArea: number;
  basePerimeter: number;
}

export interface ProjectedSolid2D {
  solid: Solid3DObject;
  type: Solid3DObject['type'];
  id: string;
  name: string;
  color: string;
  isSelected: boolean;
  mode: SolidProjectionMode;
  topView?: TopViewData;
  footprint: ProjectedFootprint2D;
  faces: ProjectedFace2D[];
  edges: ProjectedEdge2D[];
  badge: {
    x: number;
    y: number;
    title: string;
    dimText: string;
    /** Boyutlar ayrı ayrı ('r = 1', 'h = 3'): tuval her birini AYRI kutuda yazar */
    dimParts: string[];
    volume: number;
    surfaceArea: number;
    subtitle?: string;
  };
  curves?: {
    kind: 'cylinder' | 'cone' | 'sphere';
    bottomCenter: ScreenPoint;
    topCenter?: ScreenPoint;
    rx: number;
    ry: number;
    sphereR?: number;
    sideLines?: { from: ScreenPoint; to: ScreenPoint }[];
  };
}

/** SVG `points` yazısı: "x,y x,y …" (bir ondalık) */
const noktaYazisi = (noktalar: readonly ScreenPoint[]) => noktalar.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const sayi = formatTurkishNumber;

/** Cismin ölçüleri; boş ölçü 3 birim, yarıçap verilmemişse genişliğin yarısı */
interface Olculer {
  w: number;
  h: number;
  d: number;
  r: number;
}

/**
 * Köşeli tabanın cismin kendi düzlemindeki köşeleri (merkez kökende, döndürmeden önce): küpte kenarı w kare,
 * dikdörtgenler prizması ve piramitte w × d dikdörtgen, üçgen prizmada taban w ve yükseklik h olan üçgen (tepe
 * ucgenTepeX'te). Yuvarlak tabanlı cisimlerde null.
 */
function tabanKoseleri(cisim: Solid3DObject, { w, h, d }: Olculer): [number, number][] | null {
  const yw = w / 2;
  switch (cisim.type) {
    case 'cube':
      return [[-yw, -yw], [yw, -yw], [yw, yw], [-yw, yw]];
    case 'prism':
    case 'pyramid':
      return [[-yw, -d / 2], [yw, -d / 2], [yw, d / 2], [-yw, d / 2]];
    case 'triangular_prism':
      return [[-yw, -h / 2], [yw, -h / 2], [ucgenTepeX(cisim), h / 2]];
    default:
      return null;
  }
}

type Etiket = TopViewData['dimensionLabels'][number];

/**
 * Üstten görünüm. Köşeli tabanda ölçü etiketleri kenarların dışında (alt kenarın 14 birim altında, sol kenarın 14 birim
 * solunda), dairede yarıçapın ortasının 8 birim üstündedir; boşluklar etiket ölçeğiyle büyür.
 */
function ustGorunum(
  cisim: Solid3DObject,
  o: Olculer,
  merkez: ScreenPoint,
  koseler: ScreenPoint[] | null,
  ekranda: (x: number, y: number) => ScreenPoint,
  zoom: number,
  ls: number,
): TopViewData | undefined {
  const { w, h, d, r } = o;
  const altKenar = (yd: number, metin: string): Etiket => {
    const p = ekranda(0, -yd);
    return { x: p.x, y: p.y + 14 * ls, text: metin };
  };
  const ortak = (ad: string, alan: number, cevre: number) => ({ baseShapeName: ad, baseArea: alan, basePerimeter: cevre });

  if (koseler) {
    const cokgen = { points: koseler, pointsAttr: noktaYazisi(koseler), centerScreen: merkez };
    switch (cisim.type) {
      case 'cube':
        return { kind: 'polygon', ...cokgen, dimensionLabels: [altKenar(w / 2, `a = ${sayi(w)} br`)], ...ortak('Kare', w * w, 4 * w) };
      case 'prism': {
        const sol = ekranda(-w / 2, 0);
        const etiketler = [altKenar(d / 2, `w = ${sayi(w)} br`), { x: sol.x - 14 * ls, y: sol.y, text: `d = ${sayi(d)} br` }];
        return { kind: 'polygon', ...cokgen, dimensionLabels: etiketler, ...ortak('Dikdörtgen', w * d, 2 * (w + d)) };
      }
      case 'pyramid':
        return {
          kind: 'pyramid',
          ...cokgen,
          apexScreen: merkez,
          diagEdges: koseler.map((k) => ({ from: k, to: merkez })),
          dimensionLabels: [altKenar(d / 2, `${sayi(w)} × ${sayi(d)} br`)],
          ...ortak('Piramit', w * d, 2 * (w + d)),
        };
      case 'triangular_prism': {
        // Taban alanı w·h/2; çevre taban ve iki yan kenar (tepe ucgenTepeX'te)
        const tx = ucgenTepeX(cisim);
        return { kind: 'polygon', ...cokgen, dimensionLabels: [], ...ortak('Üçgen', (w * h) / 2, w + Math.hypot(tx + w / 2, h) + Math.hypot(w / 2 - tx, h)) };
      }
    }
  }

  const daireAdi: Partial<Record<Solid3DObject['type'], string>> = { cylinder: 'Daire', cone: 'Daire (Koni)', sphere: 'Daire (Küre)' };
  const ad = daireAdi[cisim.type];
  if (!ad) return undefined;
  const yaricap = r * zoom;
  const daire = {
    centerScreen: merkez,
    radius: yaricap,
    dimensionLabels: [{ x: merkez.x + yaricap / 2, y: merkez.y - 8 * ls, text: `r = ${sayi(r)} br` }],
    ...ortak(ad, Math.PI * r * r, 2 * Math.PI * r),
  };
  // Koninin tepesi tabanın merkezine düşer
  return cisim.type === 'cone' ? { kind: 'cone', apexScreen: merkez, ...daire } : { kind: 'circle', ...daire };
}

/** Aksonometrik bakışta kameraya doğru yön: yüzün normali buna bakıyorsa yüz görünür */
const KAMERA_YONU = { x: -Math.cos(PROJECTION_ANGLE_RAD) * PROJECTION_DEPTH_SCALE, y: -Math.sin(PROJECTION_ANGLE_RAD) * PROJECTION_DEPTH_SCALE, z: 1.0 };
const kameraya = (v: Point3D) => v.x * KAMERA_YONU.x + v.y * KAMERA_YONU.y + v.z * KAMERA_YONU.z;

/** Yüzün saydamlığı: üst yüz daha koyu, ön yüz açık, yan yüzler koyu; cismin saydamlığıyla (0,85'e göre) ölçeklenir */
function yuzSaydamligi(normal: Point3D, cisimSaydamligi: number | undefined): number {
  let s = 0.35;
  if (normal.z > 0.5) s = 0.45;
  else if (normal.y < -0.4) s = 0.3;
  else if (normal.x > 0.4 || normal.x < -0.4) s = 0.5;
  return cisimSaydamligi === undefined ? s : Math.max(0.15, Math.min(0.85, s * (cisimSaydamligi / 0.85)));
}

type Ag = ReturnType<typeof generateSolidMesh>;

/**
 * Aksonometrik yüzler ve ayrıtlar. Kameraya bakmayan yüz soluk, ince çizilir; yüzler derinliğe göre (uzaktan yakına)
 * sıralanır. Bitişik yüzlerinin hiçbiri görünmeyen ayrıt gizli (kesikli, gri ya da seçim renginde) sayılır.
 */
function agiIzdus(cisim: Solid3DObject, ag: Ag, ekran: ScreenPoint[], renk: string, cizgiRengi: string, kalinlik: number, secili: boolean) {
  const gorunur = ag.faces.map((f) => kameraya(f.normal) > 0.001);
  const yuzler: ProjectedFace2D[] = ag.faces.map((f, i) => {
    let derinlik = 0;
    const noktalar: ScreenPoint[] = [];
    for (const k of f.vertexIndices) {
      const v = ag.vertices[k];
      if (!v) continue;
      derinlik += kameraya(v);
      noktalar.push(ekran[k]);
    }
    derinlik /= Math.max(1, f.vertexIndices.length);
    return {
      points: noktalar,
      pointsAttr: noktaYazisi(noktalar),
      fill: cisim.faceColors?.[i] || renk,
      fillOpacity: gorunur[i] ? yuzSaydamligi(f.normal, cisim.opacity) : 0.08,
      stroke: cizgiRengi,
      strokeWidth: gorunur[i] ? kalinlik : 1.0,
      label: f.label,
      depth: derinlik,
    };
  });

  const anahtar = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
  const bitisikYuzler = new Map<string, number[]>();
  ag.faces.forEach((f, i) => {
    const k = f.vertexIndices;
    k.forEach((a, j) => {
      const ad = anahtar(a, k[(j + 1) % k.length]);
      bitisikYuzler.set(ad, [...(bitisikYuzler.get(ad) ?? []), i]);
    });
  });
  const ayritlar: ProjectedEdge2D[] = [];
  for (const e of ag.edges) {
    const a = ekran[e.startIdx];
    const b = ekran[e.endIdx];
    if (!a || !b) continue;
    const komsu = bitisikYuzler.get(anahtar(e.startIdx, e.endIdx)) || [];
    const gizli = komsu.length > 0 && !komsu.some((i) => gorunur[i]);
    ayritlar.push({ from: a, to: b, isHidden: gizli, stroke: gizli ? (secili ? NESNE_SECIM_RENGI : '#94a3b8') : cizgiRengi, strokeWidth: gizli ? 1.2 : kalinlik });
  }
  return { yuzler: yuzler.sort((p, q) => p.depth - q.depth), ayritlar };
}

/**
 * Eğri yüzeyli cisimlerin elips / daire çizim verisi: silindirde alt ve üst taban merkezi ve iki yan çizgi, konide
 * taban ve tepe, kürede merkez ve yarıçap. Elipsin dikey yarıçapı yatayın 0,45'i (kürede 0,35'i).
 */
function egriler(cisim: Solid3DObject, { h, r }: Olculer, viewport: ViewportTransform, kip: SolidProjectionMode): ProjectedSolid2D['curves'] {
  const yukari = (z: number) => worldToScreen(projectPoint3DTo2DWorld({ x: cisim.position.x, y: cisim.position.y, z }, PROJECTION_ANGLE_RAD, PROJECTION_DEPTH_SCALE, kip), viewport);
  if (cisim.type === 'sphere') {
    const yaricap = r * viewport.zoom;
    return { kind: 'sphere', bottomCenter: yukari(cisim.position.z + r), rx: yaricap, ry: yaricap * 0.35, sphereR: yaricap };
  }
  if (cisim.type !== 'cylinder' && cisim.type !== 'cone') return undefined;
  const alt = worldToScreen({ x: cisim.position.x, y: cisim.position.y }, viewport);
  const ust = yukari(h);
  const rx = r * viewport.zoom;
  const ry = r * 0.45 * viewport.zoom;
  const yan = (isaret: 1 | -1) => ({
    from: { x: alt.x + isaret * rx, y: alt.y },
    to: cisim.type === 'cone' ? ust : { x: ust.x + isaret * rx, y: ust.y },
  });
  return { kind: cisim.type, bottomCenter: alt, topCenter: ust, rx, ry, sideLines: [yan(-1), yan(1)] };
}

/** Boyut yazısı ('2×3×4', 'r:1 h:3' …) */
function boyutYazisi(cisim: Solid3DObject, { w, h, d, r }: Olculer): string {
  switch (cisim.type) {
    case 'cube':
      return `${sayi(w)}×${sayi(w)}×${sayi(w)}`;
    case 'prism':
      return `${sayi(w)}×${sayi(d)}×${sayi(h)}`;
    case 'triangular_prism':
      return `t:${sayi(w)} y:${sayi(h)} b:${sayi(d)}`;
    case 'pyramid':
      return `taban:${sayi(w)}×${sayi(d)} y:${sayi(h)}`;
    case 'cone':
    case 'cylinder':
      return `r:${sayi(r)} h:${sayi(h)}`;
    case 'sphere':
      return `r:${sayi(r)}`;
    default:
      return '';
  }
}

/**
 * Verilen 3D katı cismi 2D SVG ekranı için hesaplar ve projeksiyon verisini üretir.
 * @param mode 'top' (varsayılan: üstten görünüm / kare, dikdörtgen, daire) veya 'axonometric' (3D hacimli)
 */
export function projectSolidFor2D(
  solid: Solid3DObject,
  viewport: ViewportTransform,
  isSelected: boolean = false,
  mode: SolidProjectionMode = 'top',
  /**
   * Etiket boşluklarının ölçeği (Canvas.kutuOlcegi = max(yazı ölçeği, yerleşim ölçeği)): yazı alt sınırı devredeyken
   * uzaklaşınca etiket büyük kalır, boşluk da onunla ölçeklenir ki etiket cisme binmesin. Verilmezse yerleşim ölçeği.
   */
  payOlcegi?: number,
): ProjectedSolid2D {
  const renk = solid.color || NESNE_RENGI.mavi;
  const cizgiRengi = isSelected ? NESNE_SECIM_RENGI : renk;
  const kalinlik = isSelected ? 2.4 : 1.6;
  // Etiket boşlukları referans yakınlığa (44) göredir; gerçek görünüme bu ölçekle taşınır
  const ls = payOlcegi ?? labelZoomScale(viewport);
  const w = solid.dimensions.width || 3;
  const olculer: Olculer = { w, h: solid.dimensions.height || 3, d: solid.dimensions.depth || 3, r: solid.dimensions.radius || w / 2 };

  // Cismin düzlemindeki nokta: z ekseni çevresinde döndürülüp cismin konumuna taşınır
  const aci = ((solid.rotation?.z || 0) * Math.PI) / 180;
  const cos = Math.cos(aci);
  const sin = Math.sin(aci);
  const dunyada = (x: number, y: number): Point2D => ({ x: solid.position.x + (x * cos - y * sin), y: solid.position.y + (x * sin + y * cos) });
  const ekranda = (x: number, y: number) => worldToScreen(dunyada(x, y), viewport);
  const merkezDunya: Point2D = { x: solid.position.x, y: solid.position.y };
  const merkez = worldToScreen(merkezDunya, viewport);

  const taban = tabanKoseleri(solid, olculer);
  const topView = ustGorunum(solid, olculer, merkez, taban && taban.map(([x, y]) => ekranda(x, y)), ekranda, viewport.zoom, ls);

  // Ayak izi: köşeli tabanın kendisi, yuvarlak tabanda 16 köşeli daire (döndürülmez)
  const izDunya = taban
    ? taban.map(([x, y]) => dunyada(x, y))
    : Array.from({ length: 16 }, (_, i) => {
        const t = (i * 2 * Math.PI) / 16;
        return { x: solid.position.x + olculer.r * Math.cos(t), y: solid.position.y + olculer.r * Math.sin(t) };
      });
  const iz = izDunya.map((p) => worldToScreen(p, viewport));

  const ag = generateSolidMesh(solid);
  const agEkran = ag.vertices.map((v) => worldToScreen(projectPoint3DTo2DWorld(v, PROJECTION_ANGLE_RAD, PROJECTION_DEPTH_SCALE, mode), viewport));
  const { yuzler, ayritlar } = agiIzdus(solid, ag, agEkran, renk, cizgiRengi, kalinlik, isSelected);
  const curves = egriler(solid, olculer, viewport, mode);

  const dimText = boyutYazisi(solid, olculer);
  // Her boyut ayrı etiket: 'r:1 h:3' → ['r = 1', 'h = 3']; '2×3×4' tek boyut üçlüsüdür, bölünmez
  const dimParts = dimText ? dimText.split(' ').map((p) => p.replace(':', ' = ')) : [];

  // Rozet cismin en üst noktasının üstünde (üstten görünümde dairenin tepesi ya da en üst köşe)
  let enUst = merkez.y;
  if (mode === 'top') {
    if (topView?.radius) enUst = merkez.y - topView.radius;
    else for (const p of topView?.points ?? []) if (p.y < enUst) enUst = p.y;
  } else {
    for (const p of agEkran) if (p.y < enUst) enUst = p.y;
    if (curves?.topCenter && curves.topCenter.y < enUst) enUst = curves.topCenter.y;
    if (curves?.sphereR && curves.bottomCenter.y - curves.sphereR < enUst) enUst = curves.bottomCenter.y - curves.sphereR;
  }

  const ad = solid.name || 'Katı Cisim';
  return {
    solid,
    type: solid.type,
    id: solid.id,
    name: ad,
    color: renk,
    isSelected,
    mode,
    topView,
    footprint: { points: iz, pointsAttr: noktaYazisi(iz), centerScreen: merkez, centerWorld: merkezDunya },
    faces: yuzler,
    edges: ayritlar,
    badge: {
      x: merkez.x,
      y: Math.min(enUst - 20 * ls, merkez.y - 32 * ls),
      title: mode === 'top' && topView ? `${ad} (${topView.baseShapeName})` : ad,
      dimText,
      dimParts,
      volume: calculate3DVolume(solid),
      surfaceArea: calculate3DSurfaceArea(solid),
    },
    curves,
  };
}
