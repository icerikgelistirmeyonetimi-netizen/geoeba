// 3D Geometri ve Uzay Modeli Tipleri

export type Solid3DType = 'cube' | 'sphere' | 'cylinder' | 'prism' | 'triangular_prism' | 'cone' | 'pyramid';

export type Tool3DMode =
  | 'select_move'
  | 'orbit'
  | 'pan'
  | 'inspect'
  | 'delete'
  /** Dönüşüm araçları (3B): cismi döndür, büyüt / küçült, düzleme göre yansıt (kopya), vektörle ötele (kopya). Matematik: math/donusum3d.ts */
  | 'rotate_3d'
  | 'scale_3d'
  | 'reflect_3d'
  | 'translate_3d'
  /** Ayrıt uzunluğu ölçme: bir ayrıta tıklanır, uzunluk etiketi görünür ("Uzunluk Ölçme", ilkokul raporu). */
  | 'measure_edge'
  | 'create_cube'
  | 'create_sphere'
  | 'create_cylinder'
  | 'create_prism'
  | 'create_triangular_prism'
  | 'create_cone'
  | 'create_pyramid';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Face3D {
  vertexIndices: number[];
  normal: Point3D;
  color?: string;
  label?: string;
}

export interface Edge3D {
  startIdx: number;
  endIdx: number;
}

export interface Solid3DObject {
  id: string;
  type: Solid3DType;
  name: string;
  position: Point3D;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    radius?: number;
  };
  rotation: Point3D; // Açılar derece cinsinden (x, y, z)
  color: string;
  opacity: number;
  showWireframe: boolean;
  showVertices: boolean;
  showFaces: boolean;
  unfoldProgress: number; // 0 (kapalı cisim) - 1 (tam açınım)
  selectedFaceIndex: number | null;
  /** Yüz dizinine göre özel yüz renkleri (Yüzü renklendir aracı) */
  faceColors?: Record<number, string>;
}

export type Solid3D = Solid3DObject;

export interface Camera3D {
  rotX: number; // Pitch (dikey açı, derece)
  rotY: number; // Yaw (yatay açı, derece)
  zoom: number;
  panX: number;
  panY: number;
  perspective: number;
  showGrid: boolean;
  showAxes: boolean;
  showCoordinates: boolean;
}

/** Kamera yakınlaştırma sınırları (tek kaynak) */
export const CAMERA_ZOOM_MIN = 15;
export const CAMERA_ZOOM_MAX = 180;
export const CAMERA_PITCH_LIMIT = 85;
