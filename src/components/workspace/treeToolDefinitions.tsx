import React from 'react';
import { ToolMode } from '@/types/workspace';
import {
  MousePointer,
  CheckSquare,
  MousePointerClick,
  TextCursorInput,
  Scissors,
  SeparatorVertical,
  GitBranch,
  Equal,
  X as XIcon,
  MoveRight,
  Ruler,
  Square,
  Triangle,
  Circle as CircleIcon,
  CircleDot,
  PieChart,
  PenTool,
  Trash2,
  Hexagon,
  RotateCw,
  FlipHorizontal,
  Sparkles,
  Image as ImageIcon,
  Type,
  Plus,
  TrendingUp,
  Sliders,
} from 'lucide-react';
import { GeometryToolIcon } from './GeometryToolIcon';
import { ARAC_KATEGORI_RENKLERI } from './toolDefinitions';

const R = ARAC_KATEGORI_RENKLERI;

export interface TreeToolItem {
  id: ToolMode | 'add_object';
  name: string;
  description: string;
  icon: React.ReactNode;
  /** Kategori simge rengi (ARAC_KATEGORI_RENKLERI) — 2D araç listesiyle aynı. */
  iconColor: string;
}

export interface TreeToolGroup {
  id: string;
  name: string;
  defaultExpanded?: boolean;
  tools: TreeToolItem[];
}

export const TREE_TOOL_GROUPS: TreeToolGroup[] = [
  // 1. Temel Çizim Araçları
  {
    id: 'temel_cizim',
    name: 'Temel Çizim Araçları',
    defaultExpanded: true,
    tools: [
      { id: 'point', name: 'Nokta', description: 'Tuvale tıklayarak yeni nokta oluşturun.', icon: <GeometryToolIcon kind="point" />, iconColor: R.temel },
      { id: 'segment', name: 'Doğru Parçası', description: 'İki nokta arasına doğru parçası çizin.', icon: <GeometryToolIcon kind="segment" />, iconColor: R.temel },
      { id: 'line', name: 'Doğru', description: 'İki noktadan geçen sonsuz doğru çizin.', icon: <GeometryToolIcon kind="line" />, iconColor: R.temel },
      { id: 'ray', name: 'Işın', description: 'Başlangıç noktası ve üzerinden geçen ikinci nokta ile ışın çizin.', icon: <GeometryToolIcon kind="ray" />, iconColor: R.temel },
      { id: 'segment_length', name: 'Ölçülü Parça', description: 'Bir başlangıç noktasına tıklayın, uzunluğu sayı olarak girin.', icon: <Ruler className="w-4 h-4" />, iconColor: R.temel },
      { id: 'circle', name: 'Çember', description: 'Merkez ve yarıçap noktasıyla çember çizin.', icon: <CircleIcon className="w-4 h-4" />, iconColor: R.cember },
      { id: 'pen', name: 'Kalem', description: 'Serbest çizim kalemi.', icon: <PenTool className="w-4 h-4" />, iconColor: R.temel },
    ],
  },

  // 2. Düzenleme Araçları
  {
    id: 'duzenleme',
    name: 'Düzenleme Araçları',
    defaultExpanded: true,
    tools: [
      { id: 'select', name: 'Seç ve Taşı', description: 'Noktaları veya nesneleri seçip sürükleyin.', icon: <MousePointer className="w-4 h-4" />, iconColor: R.temel },
      { id: 'delete', name: 'Sil', description: 'Silmek istediğiniz nesneye dokunun.', icon: <Trash2 className="w-4 h-4" />, iconColor: R.tehlike },
    ],
  },

  // 3. Ölçme Araçları
  {
    id: 'olcme',
    name: 'Ölçme Araçları',
    defaultExpanded: false,
    tools: [
      { id: 'measure_distance', name: 'Uzunluk Ölç (cm)', description: 'Mesafe ve uzunluk ölçün.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconColor: R.olcme },
      { id: 'unit_measure', name: 'Birimle Ölç (br)', description: 'Birim karelerle ölçüm yapın.', icon: <GeometryToolIcon kind="grid" />, iconColor: R.olcme },
      { id: 'measure_angle', name: 'Açıölçer', description: 'Açı ölçümü yapın.', icon: <GeometryToolIcon kind="protractor" />, iconColor: R.olcme },
      { id: 'angle', name: 'Açı Oluştur', description: '3 nokta ile açı oluşturun.', icon: <GeometryToolIcon kind="angle" />, iconColor: R.olcme },
      { id: 'measure_area', name: 'Alanı Bul', description: 'Kapalı şeklin alanını hesaplayın.', icon: <GeometryToolIcon kind="area" />, iconColor: R.olcme },
      { id: 'measure_perimeter', name: 'Çevre Hesapla', description: 'Şeklin çevre uzunluğunu hesaplayın.', icon: <GeometryToolIcon kind="perimeter" />, iconColor: R.olcme },
      { id: 'measure_slope', name: 'Eğim Ölç', description: 'İki noktaya tıklayın; aradaki doğrunun eğimini gösterir.', icon: <TrendingUp className="w-4 h-4" />, iconColor: R.olcme },
      { id: 'trig_ratios', name: 'Trig. Oranlar', description: 'Açının trigonometrik oranlarını ve dik üçgen oranlarını gösterir.', icon: <Triangle className="w-4 h-4" />, iconColor: R.olcme },
      { id: 'measure_arc', name: 'Yay Ölç', description: 'Aynı çemberin üzerindeki iki noktaya tıklayın; aralarındaki yayın uzunluğunu ve ölçüsünü gösterir.', icon: <GeometryToolIcon kind="arcMeasure" />, iconColor: R.olcme },
      { id: 'area_model', name: 'Alanı Modelle', description: 'Alan modelleme ızgarası.', icon: <GeometryToolIcon kind="grid" />, iconColor: R.olcme },
      { id: 'ruler', name: 'Cetvel', description: 'İnteraktif cetvel aracı.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconColor: R.olcme },
      { id: 'setsquare', name: 'Gönye', description: 'Dik açı ve gönye aracı.', icon: <GeometryToolIcon kind="setsquare" />, iconColor: R.olcme },
    ],
  },

  // 4. Çember Araçları
  {
    id: 'cember',
    name: 'Çember Araçları',
    defaultExpanded: false,
    tools: [
      { id: 'circle_radius', name: 'Yarıçapla Çember', description: 'Merkeze tıklayın, yarıçapı sayı olarak girin.', icon: <CircleDot className="w-4 h-4" />, iconColor: R.cember },
      { id: 'circle_3points', name: '3 Noktalı Çember', description: 'Üç noktaya tıklayın; çevrel çember çizilir.', icon: <CircleIcon className="w-4 h-4" />, iconColor: R.cember },
      { id: 'arc', name: 'Yay', description: 'Merkez, başlangıç ve bitiş noktasına tıklayın; saat yönünün tersine yay çizilir.', icon: <GeometryToolIcon kind="arc" />, iconColor: R.cember },
      { id: 'sector', name: 'Daire Dilimi', description: 'Yay ile aynı üç tıklama, ama içi dolu pasta dilimi çizilir.', icon: <PieChart className="w-4 h-4" />, iconColor: R.cember },
      { id: 'ellipse', name: 'Elips', description: 'Kutuya içten teğet elips çizilir.', icon: <GeometryToolIcon kind="ellipse" />, iconColor: R.cember },
    ],
  },

  // 5. Çokgen Araçları
  {
    id: 'cokgen',
    name: 'Çokgen Araçları',
    defaultExpanded: false,
    tools: [
      { id: 'polygon', name: 'Çokgen', description: 'Köşeleri belirleyerek çokgen çizin.', icon: <GeometryToolIcon kind="polygon" />, iconColor: R.cokgen },
      { id: 'rectangle', name: 'Dikdörtgen', description: 'Dikdörtgen şekli ekleyin.', icon: <GeometryToolIcon kind="rectangle" />, iconColor: R.cokgen },
      { id: 'square', name: 'Kare', description: 'Sürükleyerek kare çizin.', icon: <Square className="w-4 h-4" />, iconColor: R.cokgen },
      { id: 'regular_polygon', name: 'Düzgün Çokgen', description: 'Kenar sayısını girerek düzgün çokgen oluşturun.', icon: <Hexagon className="w-4 h-4" />, iconColor: R.cokgen },
    ],
  },

  // 6. Cebir & Fonksiyon
  {
    id: 'cebir_fonksiyon',
    name: 'Cebir & Fonksiyon',
    defaultExpanded: false,
    tools: [
      { id: 'function', name: 'Fonksiyon', description: 'f(x) ifadesi girerek grafik çizin.', icon: <GeometryToolIcon kind="function" />, iconColor: R.cebir },
      { id: 'slider', name: 'Sürgü', description: 'a, b gibi parametreler için sürgü ekleyin.', icon: <Sliders className="w-4 h-4" />, iconColor: R.cebir },
    ],
  },

  // 7. İnşa Araçları
  {
    id: 'insa',
    name: 'İnşa Araçları',
    defaultExpanded: false,
    tools: [
      { id: 'midpoint', name: 'Orta Nokta', description: 'İki noktaya tıklayın; aralarındaki orta nokta oluşur.', icon: <GeometryToolIcon kind="midpoint" />, iconColor: R.insa },
      { id: 'divide_ratio', name: 'Oranda Böl', description: 'İki noktaya tıklayın, sonra m:n oranını girin.', icon: <Scissors className="w-4 h-4" />, iconColor: R.insa },
      { id: 'perp_bisector', name: 'Orta Dikme', description: 'İki noktaya tıklayın; orta noktadan geçen dik doğru çizilir.', icon: <SeparatorVertical className="w-4 h-4" />, iconColor: R.insa },
      { id: 'angle_bisector', name: 'Açıortay', description: 'Açının bir kolu, köşesi ve diğer kolu: üç noktaya sırayla tıklayın.', icon: <GitBranch className="w-4 h-4" />, iconColor: R.insa },
      { id: 'perpendicular', name: 'Dik Doğru', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', icon: <Plus className="w-4 h-4" />, iconColor: R.insa },
      { id: 'parallel', name: 'Paralel Doğru', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', icon: <Equal className="w-4 h-4" />, iconColor: R.insa },
      { id: 'compass', name: 'Pergel', description: 'İğneyi saplayın, açıklığı ayarlayın ve çember çizin.', icon: <GeometryToolIcon kind="compass" />, iconColor: R.insa },
      { id: 'intersect', name: 'Kesiştir', description: 'İki şekle tıklayın; ortak noktalarını oluşturur.', icon: <XIcon className="w-4 h-4" />, iconColor: R.insa },
    ],
  },

  // 8. Dönüşüm Araçları
  {
    id: 'donusum',
    name: 'Dönüşüm Araçları',
    defaultExpanded: false,
    tools: [
      { id: 'rotate', name: 'Şekli Döndür', description: 'Şekli bir merkez etrafında döndürün.', icon: <RotateCw className="w-4 h-4" />, iconColor: R.donusum },
      { id: 'translate', name: 'Öteleme', description: 'Öteleme vektörüyle şekli taşıyın.', icon: <MoveRight className="w-4 h-4" />, iconColor: R.donusum },
      { id: 'reflect', name: 'Yansıt', description: 'Doğruya göre simetri / yansıma.', icon: <FlipHorizontal className="w-4 h-4" />, iconColor: R.donusum },
      { id: 'symmetry', name: 'Simetri Keşfet', description: 'Simetri eksenlerini keşfedin.', icon: <Sparkles className="w-4 h-4" />, iconColor: R.donusum },
    ],
  },

  // 9. Etkileşim Araçları
  {
    id: 'etkilesim',
    name: 'Etkileşim Araçları',
    defaultExpanded: false,
    tools: [
      { id: 'checkbox', name: 'İşaret Kutusu', description: 'Nesneleri göster/gizle etmek için kutu ekleyin.', icon: <CheckSquare className="w-4 h-4" />, iconColor: R.etkilesim },
      { id: 'button', name: 'Düğme', description: 'Seçili nesneleri çalıştıran düğme ekleyin.', icon: <MousePointerClick className="w-4 h-4" />, iconColor: R.etkilesim },
      { id: 'input_box', name: 'Girdi Kutusu', description: 'Değer girmek için kutu ekleyin.', icon: <TextCursorInput className="w-4 h-4" />, iconColor: R.etkilesim },
    ],
  },

  // 10. Kesir & Medya
  {
    id: 'kesir_medya',
    name: 'Kesir & Medya',
    defaultExpanded: false,
    tools: [
      { id: 'fraction', name: 'Kesir Göster', description: 'Kesir modeli oluşturun.', icon: <span className="font-bold text-xs">½</span>, iconColor: R.etkilesim },
      { id: 'image', name: 'Görsel Ekle', description: 'Tuvale görsel ekleyin.', icon: <ImageIcon className="w-4 h-4" />, iconColor: R.etkilesim },
      { id: 'text', name: 'Yazı Ekle', description: 'Tuvale metin kutusu ekleyin.', icon: <Type className="w-4 h-4" />, iconColor: R.etkilesim },
    ],
  },
];
