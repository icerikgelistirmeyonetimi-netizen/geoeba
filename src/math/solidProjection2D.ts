// 3D Katı Cisimlerin 2D Düzlemine Projeksiyon Modülü (Üstten Görünüm ve Aksonometrik Görünüm)
import { Point2D, ScreenPoint, ViewportTransform } from '@/types/math';
import { Solid3DObject, Point3D } from '@/types/workspace3d';
import { worldToScreen, formatTurkishNumber } from '@/math/coordinates';
import { generateSolidMesh, calculate3DVolume, calculate3DSurfaceArea } from '@/math/geometry3d';
import { labelZoomScale } from '@/math/labelViewport';

/** İzdüşüm açısı (55 derece, kavalier/aksonometrik bakış) */
export const PROJECTION_ANGLE_RAD = (55 * Math.PI) / 180;
/** Derinlik / Z ekseni ölçek çarpanı */
export const PROJECTION_DEPTH_SCALE = 0.55;

export type SolidProjectionMode = 'top' | 'axonometric';

/**
 * 3D koordinatı (X, Y, Z) 2D matematiksel dünya koordinatına (x, y) projekte eder.
 * mode === 'top' (üstten görünüm): Z koordinatı düzleme diktir, (X, Y) doğrudan 2D koordinatıdır.
 * mode === 'axonometric': Z koordinatı 55° açıyla yukarı-sağa doğru uzanır.
 */
export function projectPoint3DTo2DWorld(
  p: Point3D,
  angleRad: number = PROJECTION_ANGLE_RAD,
  scale: number = PROJECTION_DEPTH_SCALE,
  mode: SolidProjectionMode = 'top'
): Point2D {
  if (mode === 'top') {
    return { x: p.x, y: p.y };
  }
  return {
    x: p.x + p.z * Math.cos(angleRad) * scale,
    y: p.y + p.z * Math.sin(angleRad) * scale,
  };
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

/**
 * Verilen 3D katı cismi 2D SVG ekranı için hesaplar ve projeksiyon verisini üretir.
 * @param mode 'top' (varsayılan: üstten görünüm / kare, dikdörtgen, daire) veya 'axonometric' (3D hacimli)
 */
export function projectSolidFor2D(
  solid: Solid3DObject,
  viewport: ViewportTransform,
  isSelected: boolean = false,
  mode: SolidProjectionMode = 'top'
): ProjectedSolid2D {
  const color = solid.color || '#3b82f6';
  const strokeColor = isSelected ? '#ec4899' : color;
  const strokeWidth = isSelected ? 2.4 : 1.6;
  // Etiket boşlukları referans zoom 44'e aittir. Dünya noktası etrafında bu
  // ölçüleri ölçeklemek, referans yerleşimini gerçek görünüme projekte eder.
  const labelScale = labelZoomScale(viewport);

  const w = solid.dimensions.width || 3;
  const h = solid.dimensions.height || 3;
  const d = solid.dimensions.depth || 3;
  const r = solid.dimensions.radius || w / 2;
  const rotZ = ((solid.rotation?.z || 0) * Math.PI) / 180;
  const cosZ = Math.cos(rotZ);
  const sinZ = Math.sin(rotZ);

  // Yerel 2D noktayı rotZ ile döndürüp solid.position'a taşır
  const toWorld = (lx: number, ly: number): Point2D => ({
    x: solid.position.x + (lx * cosZ - ly * sinZ),
    y: solid.position.y + (lx * sinZ + ly * cosZ),
  });

  const groundCenterWorld: Point2D = { x: solid.position.x, y: solid.position.y };
  const groundCenterScreen = worldToScreen(groundCenterWorld, viewport);

  // 1. ÜSTTEN GÖRÜNÜM (TOP-DOWN VIEW) HESAPLAMALARI
  let topView: TopViewData | undefined = undefined;

  if (solid.type === 'cube') {
    // KÜP -> ÜSTTEN GÖRÜNÜM: KARE (a = w)
    const hw = w / 2;
    const worldCorners = [
      toWorld(-hw, -hw),
      toWorld(hw, -hw),
      toWorld(hw, hw),
      toWorld(-hw, hw),
    ];
    const scrCorners = worldCorners.map((pt) => worldToScreen(pt, viewport));
    const pointsAttr = scrCorners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // Alt kenar orta noktası etiket konumu
    const bottomMidWorld = toWorld(0, -hw);
    const bottomMidScr = worldToScreen(bottomMidWorld, viewport);

    topView = {
      kind: 'polygon',
      points: scrCorners,
      pointsAttr,
      centerScreen: groundCenterScreen,
      dimensionLabels: [
        {
          x: bottomMidScr.x,
          y: bottomMidScr.y + 14 * labelScale,
          text: `a = ${formatTurkishNumber(w)} br`,
        },
      ],
      baseShapeName: 'Kare',
      baseArea: w * w,
      basePerimeter: 4 * w,
    };
  } else if (solid.type === 'prism') {
    // DİKDÖRTGENLER PRİZMASI -> ÜSTTEN GÖRÜNÜM: DİKDÖRTGEN (w x d)
    const hw = w / 2;
    const hd = d / 2;
    const worldCorners = [
      toWorld(-hw, -hd),
      toWorld(hw, -hd),
      toWorld(hw, hd),
      toWorld(-hw, hd),
    ];
    const scrCorners = worldCorners.map((pt) => worldToScreen(pt, viewport));
    const pointsAttr = scrCorners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const bottomMidScr = worldToScreen(toWorld(0, -hd), viewport);
    const leftMidScr = worldToScreen(toWorld(-hw, 0), viewport);

    topView = {
      kind: 'polygon',
      points: scrCorners,
      pointsAttr,
      centerScreen: groundCenterScreen,
      dimensionLabels: [
        {
          x: bottomMidScr.x,
          y: bottomMidScr.y + 14 * labelScale,
          text: `w = ${formatTurkishNumber(w)} br`,
        },
        {
          x: leftMidScr.x - 14 * labelScale,
          y: leftMidScr.y,
          text: `d = ${formatTurkishNumber(d)} br`,
        },
      ],
      baseShapeName: 'Dikdörtgen',
      baseArea: w * d,
      basePerimeter: 2 * (w + d),
    };
  } else if (solid.type === 'cylinder') {
    // SİLİNDİR -> ÜSTTEN GÖRÜNÜM: DAİRE (yarıçap: r)
    const scrR = r * viewport.zoom;
    topView = {
      kind: 'circle',
      centerScreen: groundCenterScreen,
      radius: scrR,
      dimensionLabels: [
        {
          x: groundCenterScreen.x + scrR / 2,
          y: groundCenterScreen.y - 8 * labelScale,
          text: `r = ${formatTurkishNumber(r)} br`,
        },
      ],
      baseShapeName: 'Daire',
      baseArea: Math.PI * r * r,
      basePerimeter: 2 * Math.PI * r,
    };
  } else if (solid.type === 'cone') {
    // KONİ -> ÜSTTEN GÖRÜNÜM: DAİRE (yarıçap: r) + MERKEZ TEPE NOKTASI
    const scrR = r * viewport.zoom;
    topView = {
      kind: 'cone',
      centerScreen: groundCenterScreen,
      apexScreen: groundCenterScreen,
      radius: scrR,
      dimensionLabels: [
        {
          x: groundCenterScreen.x + scrR / 2,
          y: groundCenterScreen.y - 8 * labelScale,
          text: `r = ${formatTurkishNumber(r)} br`,
        },
      ],
      baseShapeName: 'Daire (Koni)',
      baseArea: Math.PI * r * r,
      basePerimeter: 2 * Math.PI * r,
    };
  } else if (solid.type === 'pyramid') {
    // PİRAMİT -> ÜSTTEN GÖRÜNÜM: TABAN DİKDÖRTGENİ + TEPEYE BİRLEŞEN 4 AYRIT (X ŞEKLİNDE)
    const hw = w / 2;
    const hd = d / 2;
    const worldCorners = [
      toWorld(-hw, -hd),
      toWorld(hw, -hd),
      toWorld(hw, hd),
      toWorld(-hw, hd),
    ];
    const scrCorners = worldCorners.map((pt) => worldToScreen(pt, viewport));
    const pointsAttr = scrCorners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const diagEdges = scrCorners.map((pt) => ({
      from: pt,
      to: groundCenterScreen,
    }));

    const bottomMidScr = worldToScreen(toWorld(0, -hd), viewport);

    topView = {
      kind: 'pyramid',
      points: scrCorners,
      pointsAttr,
      centerScreen: groundCenterScreen,
      apexScreen: groundCenterScreen,
      diagEdges,
      dimensionLabels: [
        {
          x: bottomMidScr.x,
          y: bottomMidScr.y + 14 * labelScale,
          text: `${formatTurkishNumber(w)} × ${formatTurkishNumber(d)} br`,
        },
      ],
      baseShapeName: 'Piramit',
      baseArea: w * d,
      basePerimeter: 2 * (w + d),
    };
  } else if (solid.type === 'triangular_prism') {
    // ÜÇGEN PRİZMA -> ÜSTTEN GÖRÜNÜM: ÜÇGEN TABAN
    const hw = w / 2;
    const hd = d / 2;
    const worldCorners = [
      toWorld(-hw, -hd),
      toWorld(hw, -hd),
      toWorld(0, hd),
    ];
    const scrCorners = worldCorners.map((pt) => worldToScreen(pt, viewport));
    const pointsAttr = scrCorners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    topView = {
      kind: 'polygon',
      points: scrCorners,
      pointsAttr,
      centerScreen: groundCenterScreen,
      dimensionLabels: [],
      baseShapeName: 'Üçgen',
      baseArea: (w * d) / 2,
      basePerimeter: w + 2 * Math.hypot(hw, d),
    };
  } else if (solid.type === 'sphere') {
    // KÜRE -> ÜSTTEN GÖRÜNÜM: DAİRE (yarıçap: r)
    const scrR = r * viewport.zoom;
    topView = {
      kind: 'circle',
      centerScreen: groundCenterScreen,
      radius: scrR,
      dimensionLabels: [
        {
          x: groundCenterScreen.x + scrR / 2,
          y: groundCenterScreen.y - 8 * labelScale,
          text: `r = ${formatTurkishNumber(r)} br`,
        },
      ],
      baseShapeName: 'Daire (Küre)',
      baseArea: Math.PI * r * r,
      basePerimeter: 2 * Math.PI * r,
    };
  }

  // 2. AKSONOMETRİK 3D MESH VE PROJEKSİYON HESAPLAMALARI
  const camDir = {
    x: -Math.cos(PROJECTION_ANGLE_RAD) * PROJECTION_DEPTH_SCALE,
    y: -Math.sin(PROJECTION_ANGLE_RAD) * PROJECTION_DEPTH_SCALE,
    z: 1.0,
  };

  const { vertices, faces, edges } = generateSolidMesh(solid);
  const world2D = vertices.map((v) => projectPoint3DTo2DWorld(v, PROJECTION_ANGLE_RAD, PROJECTION_DEPTH_SCALE, mode));
  const screenPts = world2D.map((pt) => worldToScreen(pt, viewport));

  // Zemin İzdüşümü (Footprint)
  let footprintWorldPts: Point2D[] = [];
  if (solid.type === 'cube' || solid.type === 'prism') {
    const hw = w / 2;
    const hd = (solid.type === 'cube' ? w : d) / 2;
    footprintWorldPts = [
      toWorld(-hw, -hd),
      toWorld(hw, -hd),
      toWorld(hw, hd),
      toWorld(-hw, hd),
    ];
  } else if (solid.type === 'pyramid') {
    const hw = w / 2;
    const hd = d / 2;
    footprintWorldPts = [
      toWorld(-hw, -hd),
      toWorld(hw, -hd),
      toWorld(hw, hd),
      toWorld(-hw, hd),
    ];
  } else if (solid.type === 'triangular_prism') {
    const hw = w / 2;
    const hd = d / 2;
    footprintWorldPts = [
      toWorld(-hw, -hd),
      toWorld(hw, -hd),
      toWorld(0, hd),
    ];
  } else {
    for (let i = 0; i < 16; i++) {
      const theta = (i * 2 * Math.PI) / 16;
      footprintWorldPts.push({
        x: solid.position.x + r * Math.cos(theta),
        y: solid.position.y + r * Math.sin(theta),
      });
    }
  }

  const footprintScreenPts = footprintWorldPts.map((p) => worldToScreen(p, viewport));
  const footprintAttr = footprintScreenPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Yüzlerin görünürlüğünü ve derinliğini hesapla (Aksonometrik görünüm için)
  const faceVisibility: boolean[] = [];
  const projectedFaces: ProjectedFace2D[] = [];

  faces.forEach((f, fIdx) => {
    const dot = f.normal.x * camDir.x + f.normal.y * camDir.y + f.normal.z * camDir.z;
    const isVisible = dot > 0.001;
    faceVisibility[fIdx] = isVisible;

    let avgDepth = 0;
    const faceScreenPts: ScreenPoint[] = [];
    f.vertexIndices.forEach((vIdx) => {
      const v = vertices[vIdx];
      if (v) {
        avgDepth += v.x * camDir.x + v.y * camDir.y + v.z * camDir.z;
        faceScreenPts.push(screenPts[vIdx]);
      }
    });
    avgDepth /= Math.max(1, f.vertexIndices.length);

    let opacity = 0.35;
    if (f.normal.z > 0.5) opacity = 0.45;
    else if (f.normal.y < -0.4) opacity = 0.30;
    else if (f.normal.x > 0.4 || f.normal.x < -0.4) opacity = 0.50;

    if (solid.opacity !== undefined) {
      opacity = Math.max(0.15, Math.min(0.85, opacity * (solid.opacity / 0.85)));
    }

    const faceColor = solid.faceColors?.[fIdx] || color;

    projectedFaces.push({
      points: faceScreenPts,
      pointsAttr: faceScreenPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
      fill: faceColor,
      fillOpacity: isVisible ? opacity : 0.08,
      stroke: strokeColor,
      strokeWidth: isVisible ? strokeWidth : 1.0,
      label: f.label,
      depth: avgDepth,
    });
  });

  // Ayrıtlar (Aksonometrik görünüm için)
  const edgeMap = new Map<string, number[]>();
  faces.forEach((f, fIdx) => {
    const indices = f.vertexIndices;
    for (let i = 0; i < indices.length; i++) {
      const a = Math.min(indices[i], indices[(i + 1) % indices.length]);
      const b = Math.max(indices[i], indices[(i + 1) % indices.length]);
      const key = `${a}-${b}`;
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key)!.push(fIdx);
    }
  });

  const projectedEdges: ProjectedEdge2D[] = [];
  edges.forEach((e) => {
    const p1 = screenPts[e.startIdx];
    const p2 = screenPts[e.endIdx];
    if (!p1 || !p2) return;

    const key = `${Math.min(e.startIdx, e.endIdx)}-${Math.max(e.startIdx, e.endIdx)}`;
    const adjFaces = edgeMap.get(key) || [];
    const hasVisibleAdjacent = adjFaces.some((fIdx) => faceVisibility[fIdx]);
    const isHidden = adjFaces.length > 0 && !hasVisibleAdjacent;

    projectedEdges.push({
      from: p1,
      to: p2,
      isHidden,
      stroke: isHidden ? (isSelected ? '#ec4899' : '#94a3b8') : strokeColor,
      strokeWidth: isHidden ? 1.2 : strokeWidth,
    });
  });

  // Eğri yüzeyli şekiller için özel parametreler
  let curves: ProjectedSolid2D['curves'] = undefined;
  if (solid.type === 'cylinder') {
    const bCenter = worldToScreen({ x: solid.position.x, y: solid.position.y }, viewport);
    const tCenterWorld = projectPoint3DTo2DWorld({ x: solid.position.x, y: solid.position.y, z: h }, PROJECTION_ANGLE_RAD, PROJECTION_DEPTH_SCALE, mode);
    const tCenter = worldToScreen(tCenterWorld, viewport);
    const rx = r * viewport.zoom;
    const ry = r * 0.45 * viewport.zoom;

    curves = {
      kind: 'cylinder',
      bottomCenter: bCenter,
      topCenter: tCenter,
      rx,
      ry,
      sideLines: [
        { from: { x: bCenter.x - rx, y: bCenter.y }, to: { x: tCenter.x - rx, y: tCenter.y } },
        { from: { x: bCenter.x + rx, y: bCenter.y }, to: { x: tCenter.x + rx, y: tCenter.y } },
      ],
    };
  } else if (solid.type === 'cone') {
    const bCenter = worldToScreen({ x: solid.position.x, y: solid.position.y }, viewport);
    const apexWorld = projectPoint3DTo2DWorld({ x: solid.position.x, y: solid.position.y, z: h }, PROJECTION_ANGLE_RAD, PROJECTION_DEPTH_SCALE, mode);
    const apex = worldToScreen(apexWorld, viewport);
    const rx = r * viewport.zoom;
    const ry = r * 0.45 * viewport.zoom;

    curves = {
      kind: 'cone',
      bottomCenter: bCenter,
      topCenter: apex,
      rx,
      ry,
      sideLines: [
        { from: { x: bCenter.x - rx, y: bCenter.y }, to: apex },
        { from: { x: bCenter.x + rx, y: bCenter.y }, to: apex },
      ],
    };
  } else if (solid.type === 'sphere') {
    const cWorld = projectPoint3DTo2DWorld({ x: solid.position.x, y: solid.position.y, z: solid.position.z + r }, PROJECTION_ANGLE_RAD, PROJECTION_DEPTH_SCALE, mode);
    const cScreen = worldToScreen(cWorld, viewport);
    const sphereR = r * viewport.zoom;

    curves = {
      kind: 'sphere',
      bottomCenter: cScreen,
      rx: sphereR,
      ry: sphereR * 0.35,
      sphereR,
    };
  }

  // Boyut etiketi metni
  let dimText = '';
  switch (solid.type) {
    case 'cube':
      dimText = `${formatTurkishNumber(w)}×${formatTurkishNumber(w)}×${formatTurkishNumber(w)}`;
      break;
    case 'prism':
      dimText = `${formatTurkishNumber(w)}×${formatTurkishNumber(d)}×${formatTurkishNumber(h)}`;
      break;
    case 'triangular_prism':
      dimText = `t:${formatTurkishNumber(w)} y:${formatTurkishNumber(h)} b:${formatTurkishNumber(d)}`;
      break;
    case 'pyramid':
      dimText = `taban:${formatTurkishNumber(w)}×${formatTurkishNumber(d)} y:${formatTurkishNumber(h)}`;
      break;
    case 'cone':
    case 'cylinder':
      dimText = `r:${formatTurkishNumber(r)} h:${formatTurkishNumber(h)}`;
      break;
    case 'sphere':
      dimText = `r:${formatTurkishNumber(r)}`;
      break;
  }
  // Her boyut ayrı etiket: 'r:1 h:3' → ['r = 1', 'h = 3']; '2×3×4' tek boyut üçlüsüdür, bölünmez.
  const dimParts = dimText ? dimText.split(' ').map((p) => p.replace(':', ' = ')) : [];

  // Rozet pozisyonu (En yüksek noktanın hemen üstü)
  let minY = groundCenterScreen.y;
  if (mode === 'top') {
    if (topView?.radius) {
      minY = groundCenterScreen.y - topView.radius;
    } else if (topView?.points) {
      topView.points.forEach((p) => {
        if (p.y < minY) minY = p.y;
      });
    }
  } else {
    screenPts.forEach((p) => {
      if (p.y < minY) minY = p.y;
    });
    if (curves?.topCenter && curves.topCenter.y < minY) minY = curves.topCenter.y;
    if (curves?.sphereR && curves.bottomCenter.y - curves.sphereR < minY) {
      minY = curves.bottomCenter.y - curves.sphereR;
    }
  }

  const baseTitle = solid.name || 'Katı Cisim';
  const displayTitle = mode === 'top' && topView ? `${baseTitle} (${topView.baseShapeName})` : baseTitle;

  return {
    solid,
    type: solid.type,
    id: solid.id,
    name: solid.name || 'Katı Cisim',
    color,
    isSelected,
    mode,
    topView,
    footprint: {
      points: footprintScreenPts,
      pointsAttr: footprintAttr,
      centerScreen: groundCenterScreen,
      centerWorld: groundCenterWorld,
    },
    faces: projectedFaces.sort((a, b) => a.depth - b.depth),
    edges: projectedEdges,
    badge: {
      x: groundCenterScreen.x,
      y: Math.min(minY - 20 * labelScale, groundCenterScreen.y - 32 * labelScale),
      title: displayTitle,
      dimText,
      dimParts,
      volume: calculate3DVolume(solid),
      surfaceArea: calculate3DSurfaceArea(solid),
    },
    curves,
  };
}
