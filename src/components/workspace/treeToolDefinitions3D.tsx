import React from 'react';
import {
  MousePointer,
  Orbit,
  Hand,
  Trash2,
  Rotate3d,
  Scaling,
  FlipHorizontal,
  MoveRight,
  Paintbrush,
  Ruler,
  BookOpen,
  CircleDot,
  Minus,
  Square,
  Eye,
  Axis3d,
  Grid3x3,
} from 'lucide-react';
import { EksenSimgesi } from './GrafikMenuSimgeleri';
import type { Solid3DType, Tool3DMode } from '@/types/workspace3d';
import { GeometryToolIcon } from './GeometryToolIcon';
import { ARAC_KATEGORI_RENKLERI } from './toolDefinitions';

/*
 * 3B araç panelinin TEK KAYNAĞI: Araçlar sekmesindeki ağaç liste, Ara sekmesi ve kademe süzgeci
 * (kademeDuzeyleri3B.ts) hep bu listeden okur. Araç adları ve kimlikleri Canvas3D ile paylaşılan
 * sözleşmedir (select_move "Taşı", orbit "Döndür ve İncele", inspect "Yüzü Seç ve Renklendir",
 * measure_edge "Uzunluk Ölçme", rotate_3d "Cismi Döndür", scale_3d "Büyüt ve Küçült" ...).
 *
 * Kaynaklar: İlkokul raporu (23.07.2026) 3B ekranı — Temel (Taşı, Sil), Cisim Özellikleri (Köşeleri /
 * Ayrıtları / Yüzleri Göster), Katı Cisimler (Küp, Küre, Silindir, Üçgen Prizma, Kare Prizma, Dikdörtgen
 * Prizma), Yüzü seç ve renklendir, Döndür, Büyüt ve Küçült, Uzunluk Ölçme, "Döndür ve İncele";
 * ortaokul: açınım (MAT.4.3.1, MAT.8.4.1), hacim ve yüzey alanı (MAT.7.4.x, MAT.8.4.3).
 */

const R = ARAC_KATEGORI_RENKLERI;

/** Hazır kamera açıları (WorkspaceView.handleSetCameraPreset ile aynı birlik) */
export type CameraPreset3D = 'isometric' | 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left' | 'side';

/**
 * Ağaçtaki satır kimlikleri: Canvas3D'nin araç kipleri (Tool3DMode) + yalnız panelde olan eylemler.
 * kare_prizma: onAddSolidPreset('prism', 3×4×3) · unfold: açınım şeridini açar · show_*: sahne katmanları ·
 * view_*: kamera açıları.
 */
export type Tool3DTreeId =
  | Tool3DMode
  | 'kare_prizma'
  | 'unfold'
  | 'show_vertices'
  | 'show_edges'
  | 'show_faces'
  | 'show_grid'
  | 'show_axes'
  | 'view_front'
  | 'view_top'
  | 'view_right'
  | 'view_isometric';

/** Satırın davranış türü: Toolbar3D tıklamayı buna göre yönlendirir. */
export type Tool3DTreeKind = 'tool' | 'solid' | 'toggle' | 'camera' | 'action';

export interface TreeTool3DItem {
  id: Tool3DTreeId;
  name: string;
  description: string;
  icon: React.ReactNode;
  /** Kategori simge rengi (ARAC_KATEGORI_RENKLERI) — 2B araç listesiyle aynı tablo. */
  iconColor: string;
  kind: Tool3DTreeKind;
  /** kind 'solid': eklenecek cisim türü */
  solidType?: Solid3DType;
  /** kind 'solid': varsayılan boyut yerine hazır ölçü (Kare Prizma: 3 × 4 × 3) */
  preset?: { width?: number; height?: number; depth?: number; radius?: number };
  /** kind 'camera': kamera açısı */
  cameraPreset?: CameraPreset3D;
}

export interface TreeTool3DGroup {
  id: string;
  name: string;
  defaultExpanded?: boolean;
  tools: TreeTool3DItem[];
}

/** Cisim türünün Türkçe adı (Nesneler ve Bağlamlar sekmeleri, komut yanıtları) */
export const CISIM_ADLARI: Record<Solid3DType, string> = {
  cube: 'Küp',
  sphere: 'Küre',
  cylinder: 'Silindir',
  prism: 'Dikdörtgen Prizma',
  triangular_prism: 'Üçgen Prizma',
  cone: 'Koni',
  pyramid: 'Kare Piramit',
};

export const TREE_TOOL_GROUPS_3D: TreeTool3DGroup[] = [
  // 1. Temel: seçme / taşıma, kamera, silme
  {
    id: 'temel_3b',
    name: 'Temel',
    defaultExpanded: true,
    tools: [
      { id: 'select_move', kind: 'tool', name: 'Taşı', description: 'Cisme tıklayıp sürükleyerek zeminde taşıyın; yönü ve yeri değişir, biçimi değişmez.', icon: <MousePointer className="w-4 h-4" />, iconColor: R.temel },
      { id: 'orbit', kind: 'tool', name: 'Döndür ve İncele', description: 'Boşlukta sürükleyerek sahneyi her yönden çevirin ve cisimleri inceleyin.', icon: <Orbit className="w-4 h-4" />, iconColor: R.temel },
      { id: 'pan', kind: 'tool', name: 'Görünümü Kaydır', description: 'Kamera bakış noktasını sürükleyerek kaydırın.', icon: <Hand className="w-4 h-4" />, iconColor: R.temel },
      { id: 'delete', kind: 'tool', name: 'Sil', description: 'Silmek istediğiniz cisme tıklayın; seçili cisim varsa hemen silinir.', icon: <Trash2 className="w-4 h-4" />, iconColor: R.tehlike },
    ],
  },

  // 2. Katı Cisimler: "Tıkla Ekle" sahnenin ortasına koyar, "Zeminde Çiz" tabanı sürükleyerek kurar
  {
    id: 'kati_cisimler',
    name: 'Katı Cisimler',
    defaultExpanded: true,
    tools: [
      { id: 'create_cube', kind: 'solid', solidType: 'cube', name: 'Küp', description: 'Altı kare yüzü eşit olan prizma.', icon: <GeometryToolIcon kind="cube" />, iconColor: R.cember },
      { id: 'create_sphere', kind: 'solid', solidType: 'sphere', name: 'Küre', description: 'Merkeze eşit uzaklıktaki noktaların oluşturduğu cisim.', icon: <GeometryToolIcon kind="sphere" />, iconColor: R.cember },
      { id: 'create_cylinder', kind: 'solid', solidType: 'cylinder', name: 'Silindir', description: 'İki daire taban ve kavisli yan yüzey.', icon: <GeometryToolIcon kind="cylinder" />, iconColor: R.cember },
      { id: 'create_prism', kind: 'solid', solidType: 'prism', name: 'Dikdörtgen Prizma', description: 'Karşılıklı yüzleri eş dikdörtgen olan prizma.', icon: <GeometryToolIcon kind="prism" />, iconColor: R.cember },
      { id: 'kare_prizma', kind: 'solid', solidType: 'prism', preset: { width: 3, depth: 3, height: 4 }, name: 'Kare Prizma', description: 'Tabanı kare olan dik prizma (3 × 3 taban, 4 br yükseklik).', icon: <GeometryToolIcon kind="squarePrism" />, iconColor: R.cember },
      { id: 'create_triangular_prism', kind: 'solid', solidType: 'triangular_prism', name: 'Üçgen Prizma', description: 'İki üçgen taban ve üç dikdörtgen yan yüz.', icon: <GeometryToolIcon kind="triangularPrism" />, iconColor: R.cember },
      { id: 'create_cone', kind: 'solid', solidType: 'cone', name: 'Koni', description: 'Daire taban ve bir tepe noktası.', icon: <GeometryToolIcon kind="cone" />, iconColor: R.cember },
      { id: 'create_pyramid', kind: 'solid', solidType: 'pyramid', name: 'Kare Piramit', description: 'Kare taban ve tepede birleşen dört üçgen yüz.', icon: <GeometryToolIcon kind="pyramid" />, iconColor: R.cember },
    ],
  },

  // 3. Dönüşüm: matematik math/donusum3d.ts; yansıtma ve öteleme kopya üretir (mor)
  {
    id: 'donusum_3b',
    name: 'Dönüşüm',
    defaultExpanded: true,
    tools: [
      { id: 'rotate_3d', kind: 'tool', name: 'Cismi Döndür', description: 'Cismi fareyle her yöne çevirin; biçimi değişmez, yalnız duruşu değişir.', icon: <Rotate3d className="w-4 h-4" />, iconColor: R.donusum },
      { id: 'scale_3d', kind: 'tool', name: 'Büyüt ve Küçült', description: 'Cismin üstündeki tutamacı sürükleyerek büyütün ya da küçültün.', icon: <Scaling className="w-4 h-4" />, iconColor: R.donusum },
      { id: 'reflect_3d', kind: 'tool', name: 'Yansıt', description: 'Cismi bir düzleme göre yansıtın; ayna görüntüsü kopya olarak eklenir.', icon: <FlipHorizontal className="w-4 h-4" />, iconColor: R.donusum },
      { id: 'translate_3d', kind: 'tool', name: 'Ötele', description: 'Cismi bir vektör kadar öteleyin; kopyası eklenir.', icon: <MoveRight className="w-4 h-4" />, iconColor: R.donusum },
    ],
  },

  // 4. Ölçme ve İnceleme
  {
    id: 'olcme_inceleme_3b',
    name: 'Ölçme ve İnceleme',
    defaultExpanded: true,
    tools: [
      { id: 'inspect', kind: 'tool', name: 'Yüzü Seç ve Renklendir', description: 'Bir yüze tıklayın; alanı gösterilir ve paletten renklendirilir. Eş ve karşılıklı yüzler bulunur.', icon: <Paintbrush className="w-4 h-4" />, iconColor: R.olcme },
      { id: 'measure_edge', kind: 'tool', name: 'Uzunluk Ölçme', description: 'Bir ayrıta tıklayın; uzunluğu birim olarak yazılır.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconColor: R.olcme },
      { id: 'unfold', kind: 'action', name: 'Açınım', description: 'Seçili cismin yüzeylerini açarak açınımını gösterir; şerit üzerinden adım adım açılır.', icon: <BookOpen className="w-4 h-4" />, iconColor: R.olcme },
    ],
  },

  // 5. Cisim Özellikleri: sahne katmanları (onay durumlu satırlar)
  {
    id: 'cisim_ozellikleri',
    name: 'Cisim Özellikleri',
    defaultExpanded: true,
    tools: [
      { id: 'show_vertices', kind: 'toggle', name: 'Köşeleri Göster', description: 'Cisimlerin köşe noktalarını işaretler.', icon: <CircleDot className="w-4 h-4" />, iconColor: R.temel },
      { id: 'show_edges', kind: 'toggle', name: 'Ayrıtları Göster', description: 'Cisimlerin ayrıtlarını çizgiyle gösterir.', icon: <Minus className="w-4 h-4 -rotate-45" />, iconColor: R.temel },
      { id: 'show_faces', kind: 'toggle', name: 'Yüzleri Göster', description: 'Cisimlerin yüzlerini renkli gösterir.', icon: <Square className="w-4 h-4" />, iconColor: R.temel },
    ],
  },

  // 6. Görünüm: kamera açıları (ızgara ve eksen tuval şeridindedir)
  {
    id: 'gorunum_3b',
    name: 'Görünüm',
    defaultExpanded: false,
    tools: [
      { id: 'show_grid', kind: 'toggle', name: 'Zemin Izgarası', description: 'Zemindeki kareli ızgarayı açar / kapatır.', icon: <Grid3x3 className="w-4 h-4" />, iconColor: R.etkilesim },
      { id: 'show_axes', kind: 'toggle', name: 'Eksenler', description: 'x, y ve z eksenlerini açar / kapatır.', icon: <EksenSimgesi />, iconColor: R.etkilesim },
      { id: 'view_front', kind: 'camera', cameraPreset: 'front', name: 'Önden Görünüm', description: 'Kamerayı cismin tam önüne alır.', icon: <Eye className="w-4 h-4" />, iconColor: R.etkilesim },
      { id: 'view_top', kind: 'camera', cameraPreset: 'top', name: 'Üstten Görünüm', description: 'Kamerayı tam üste alır; tabanlar görünür.', icon: <Eye className="w-4 h-4" />, iconColor: R.etkilesim },
      { id: 'view_right', kind: 'camera', cameraPreset: 'right', name: 'Sağdan Görünüm', description: 'Kamerayı sağ yana alır.', icon: <Eye className="w-4 h-4" />, iconColor: R.etkilesim },
      { id: 'view_isometric', kind: 'camera', cameraPreset: 'isometric', name: 'İzometrik Görünüm', description: 'Üç yüzü birden gösteren eğik bakış.', icon: <Axis3d className="w-4 h-4" />, iconColor: R.etkilesim },
    ],
  },
];

/** Ağaçtaki bütün satırlar (sıra korunur) */
export const TUM_3B_ARACLAR: readonly TreeTool3DItem[] = TREE_TOOL_GROUPS_3D.flatMap((g) => g.tools);

/** Kimlikten satır */
export function arac3BBul(id: string): TreeTool3DItem | undefined {
  return TUM_3B_ARACLAR.find((a) => a.id === id);
}

/** Araç adı ya da açıklaması aramayla eşleşiyor mu? (Boş arama her aracı kapsar; Türkçe küçük harf.) */
export function arac3BAramayaUyar(arac: Pick<TreeTool3DItem, 'name' | 'description'>, arama: string): boolean {
  const aranan = arama.trim().toLocaleLowerCase('tr');
  if (aranan === '') return true;
  return arac.name.toLocaleLowerCase('tr').includes(aranan) || arac.description.toLocaleLowerCase('tr').includes(aranan);
}

/** Gruplardaki araçlar arasında arama (Ara sekmesi) */
export function araclari3BAra(gruplar: readonly TreeTool3DGroup[], arama: string): TreeTool3DItem[] {
  return gruplar.flatMap((g) => g.tools).filter((a) => arac3BAramayaUyar(a, arama));
}
