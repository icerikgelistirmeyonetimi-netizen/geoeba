import React from 'react';
import { ToolMode } from '@/types/workspace';
import { MousePointer, CheckSquare, MousePointerClick, TextCursorInput, Scissors, SeparatorVertical, GitBranch, Equal, X as XIcon, MoveRight, Ruler, Square, Triangle, Circle as CircleIcon, CircleDot, PieChart, PenTool, Trash2, Hexagon, RotateCw, FlipHorizontal, Sparkles, Image as ImageIcon, Type, Plus, TrendingUp, Sliders } from 'lucide-react';
import { GeometryToolIcon } from './GeometryToolIcon';

/**
 * Araç kategorisi → simge rengi (ada paleti). Aynı kategori her yerde aynı renk:
 * araç listesi, ağaç menü, bağlam işlemleri ve imleç rozeti bu tabloyu kullanır.
 * Koyu temada deniz tonları okunmadığı için turkuaza, altın fenere düşer.
 */
export const ARAC_KATEGORI_RENKLERI = {
  temel: 'text-ada-deniz dark:text-ada-vurgu',        // nokta / doğru / parça / ışın / seç
  cember: 'text-ada-lavanta',                          // çember / yay / elips
  cokgen: 'text-ada-vurgu',                            // çokgen / alan
  olcme: 'text-ada-altin dark:text-ada-fener',         // ölçme
  donusum: 'text-ada-mercan',                          // dönüşüm
  cebir: 'text-ada-deniz-koyu dark:text-ada-vurgu',    // cebir / fonksiyon / kaydırıcı
  insa: 'text-ada-deniz dark:text-ada-vurgu',          // inşa
  etkilesim: 'text-ada-murekkep-2 dark:text-ada-kum',  // etkileşim / medya
  tehlike: 'text-destructive',                         // sil
} as const;
export type AracKategorisi = keyof typeof ARAC_KATEGORI_RENKLERI;

/** Kategori simgesinin arkasındaki yumuşak zemin. */
export const ARAC_KATEGORI_ZEMINLERI: Record<AracKategorisi, string> = {
  temel: 'bg-ada-deniz/10 dark:bg-ada-vurgu/15',
  cember: 'bg-ada-lavanta/15',
  cokgen: 'bg-ada-vurgu/15',
  olcme: 'bg-ada-altin/15',
  donusum: 'bg-ada-mercan/15',
  cebir: 'bg-ada-deniz-koyu/10 dark:bg-ada-vurgu/15',
  insa: 'bg-ada-deniz/10 dark:bg-ada-vurgu/15',
  etkilesim: 'bg-ada-murekkep-2/10 dark:bg-ada-kum/10',
  tehlike: 'bg-destructive/10',
};

/** Grup başlığı gradyanı (kategori rengiyle uyumlu). */
const GRUP_GRADYANLARI: Record<AracKategorisi, string> = {
  temel: 'from-ada-deniz to-ada-vurgu',
  cember: 'from-ada-lavanta to-ada-deniz',
  cokgen: 'from-ada-vurgu to-ada-deniz',
  olcme: 'from-ada-altin to-ada-fener',
  donusum: 'from-ada-mercan to-ada-altin',
  cebir: 'from-ada-deniz-koyu to-ada-vurgu',
  insa: 'from-ada-deniz to-ada-deniz-koyu',
  etkilesim: 'from-ada-murekkep-2 to-ada-deniz',
  tehlike: 'from-destructive to-ada-mercan',
};

const R = ARAC_KATEGORI_RENKLERI;
const Z = ARAC_KATEGORI_ZEMINLERI;
/** Rozet: kum zemin + mürekkep yazı (koyu temada secondary). */
const ROZET = 'bg-ada-kum text-ada-murekkep border-ada-altin/30 dark:bg-secondary dark:text-secondary-foreground dark:border-border';

interface ToolItem {
  id: ToolMode;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

interface ToolGroup {
  groupName: string;
  themeColor: string;
  badgeBg: string;
  containerBg: string;
  containerBorder: string;
  headerTextColor: string;
  tools: ToolItem[];
}

export const TOOL_GROUPS: ToolGroup[] = [
  // 1. Temel Çizim Araçları
  {
    groupName: 'Temel Çizim Araçları',
    themeColor: GRUP_GRADYANLARI.temel,
    badgeBg: ROZET,
    containerBg: 'bg-card',
    containerBorder: 'border-border',
    headerTextColor: 'text-foreground',
    tools: [
      { id: 'point', name: 'Nokta', description: 'Tuvale tıklayarak yeni nokta oluşturun.', icon: <GeometryToolIcon kind="point" />, iconBg: Z.temel, iconColor: R.temel },
      { id: 'segment', name: 'Doğru Parçası', description: 'İki nokta arasına doğru parçası çizin.', icon: <GeometryToolIcon kind="segment" />, iconBg: Z.temel, iconColor: R.temel },
      { id: 'line', name: 'Doğru', description: 'İki noktadan geçen sonsuz doğru çizin.', icon: <GeometryToolIcon kind="line" />, iconBg: Z.temel, iconColor: R.temel },
      { id: 'ray', name: 'Işın', description: 'Başlangıç noktası ve üzerinden geçen ikinci nokta ile ışın çizin.', icon: <GeometryToolIcon kind="ray" />, iconBg: Z.temel, iconColor: R.temel },
      { id: 'segment_length', name: 'Ölçülü Parça', description: 'Bir başlangıç noktasına tıklayın, uzunluğu sayı olarak girin.', icon: <Ruler className="w-4 h-4" />, iconBg: Z.temel, iconColor: R.temel },
      { id: 'circle', name: 'Çember', description: 'Merkez ve yarıçap noktasıyla çember çizin.', icon: <CircleIcon className="w-4 h-4" />, iconBg: Z.cember, iconColor: R.cember },
      { id: 'pen', name: 'Kalem', description: 'Serbest çizim kalemi.', icon: <PenTool className="w-4 h-4" />, iconBg: Z.temel, iconColor: R.temel },
    ],
  },

  // 2. Düzenleme Araçları
  {
    groupName: 'Düzenleme Araçları',
    themeColor: GRUP_GRADYANLARI.temel,
    badgeBg: ROZET,
    containerBg: 'bg-card',
    containerBorder: 'border-border',
    headerTextColor: 'text-foreground',
    tools: [
      { id: 'select', name: 'Seç ve Taşı', description: 'Noktaları veya nesneleri seçip sürükleyin.', icon: <MousePointer className="w-4 h-4" />, iconBg: Z.temel, iconColor: R.temel },
      { id: 'delete', name: 'Sil', description: 'Silmek istediğiniz nesneye dokunun.', icon: <Trash2 className="w-4 h-4" />, iconBg: Z.tehlike, iconColor: R.tehlike },
    ],
  },

  // 3. Ölçme Araçları
  {
    groupName: 'Ölçme Araçları',
    themeColor: GRUP_GRADYANLARI.olcme,
    badgeBg: ROZET,
    containerBg: 'bg-card',
    containerBorder: 'border-border',
    headerTextColor: 'text-foreground',
    tools: [
      { id: 'measure_distance', name: 'Uzunluk Ölç (cm)', description: 'Mesafe ve uzunluk ölçün.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: Z.olcme, iconColor: R.olcme },
      { id: 'unit_measure', name: 'Birimle Ölç (br)', description: 'Birim karelerle ölçüm yapın.', icon: <GeometryToolIcon kind="grid" />, iconBg: Z.olcme, iconColor: R.olcme },
      { id: 'measure_angle', name: 'Açıölçer', description: 'Açı ölçümü yapın.', icon: <GeometryToolIcon kind="protractor" />, iconBg: Z.olcme, iconColor: R.olcme },
      { id: 'angle', name: 'Açı Oluştur', description: '3 nokta ile açı oluşturun.', icon: <GeometryToolIcon kind="angle" />, iconBg: Z.olcme, iconColor: R.olcme },
      { id: 'measure_area', name: 'Alanı Bul', description: 'Kapalı şeklin alanını hesaplayın.', icon: <GeometryToolIcon kind="area" />, iconBg: Z.olcme, iconColor: R.olcme },
      { id: 'measure_perimeter', name: 'Çevre Hesapla', description: 'Şeklin çevre uzunluğunu hesaplayın.', icon: <GeometryToolIcon kind="perimeter" />, iconBg: Z.olcme, iconColor: R.olcme },
      { id: 'measure_slope', name: 'Eğim Ölç', description: 'İki noktaya tıklayın; aradaki doğrunun eğimini gösterir.', icon: <TrendingUp className="w-4 h-4" />, iconBg: Z.olcme, iconColor: R.olcme },
      { id: 'trig_ratios', name: 'Trig. Oranlar', description: 'Bir kola, AÇININ KÖŞESİNE ve diğer kola tıklayın; sin, cos, tan değerlerini gösterir. Üçgen dikse kenar oranları da yazılır.', icon: <Triangle className="w-4 h-4" />, iconBg: Z.olcme, iconColor: R.olcme },
      { id: 'measure_arc', name: 'Yay Ölç', description: 'Aynı çemberin üzerindeki iki noktaya tıklayın; aralarındaki yayın uzunluğunu ve ölçüsünü gösterir.', icon: <GeometryToolIcon kind="arcMeasure" />, iconBg: Z.olcme, iconColor: R.olcme },
      { id: 'area_model', name: 'Alanı Modelle', description: 'Alan modelleme ızgarası.', icon: <GeometryToolIcon kind="grid" />, iconBg: Z.olcme, iconColor: R.olcme },
      { id: 'ruler', name: 'Cetvel', description: 'İnteraktif cetvel aracı.', icon: <Ruler className="w-4 h-4 -rotate-45" />, iconBg: Z.olcme, iconColor: R.olcme },
      { id: 'setsquare', name: 'Gönye', description: 'Dik açı ve gönye aracı.', icon: <GeometryToolIcon kind="setsquare" />, iconBg: Z.olcme, iconColor: R.olcme },
    ],
  },

  // 4. Çokgen Araçları
  // Çember Araçları
  {
    groupName: 'Çember Araçları',
    themeColor: GRUP_GRADYANLARI.cember,
    badgeBg: ROZET,
    containerBg: 'bg-card',
    containerBorder: 'border-border',
    headerTextColor: 'text-foreground',
    tools: [
      { id: 'circle_radius', name: 'Yarıçapla Çember', description: 'Merkeze tıklayın, yarıçapı sayı olarak girin.', icon: <CircleDot className="w-4 h-4" />, iconBg: Z.cember, iconColor: R.cember },
      { id: 'circle_3points', name: '3 Noktalı Çember', description: 'Üç noktaya tıklayın; bu üç noktadan geçen çember (çevrel çember) çizilir.', icon: <CircleIcon className="w-4 h-4" />, iconBg: Z.cember, iconColor: R.cember },
      { id: 'arc', name: 'Yay', description: 'Merkez, başlangıç ve bitiş noktasına tıklayın; saat yönünün tersine yay çizilir.', icon: <GeometryToolIcon kind="arc" />, iconBg: Z.cember, iconColor: R.cember },
      { id: 'sector', name: 'Daire Dilimi', description: 'Yay ile aynı üç tıklama, ama içi dolu pasta dilimi çizilir.', icon: <PieChart className="w-4 h-4" />, iconBg: Z.cember, iconColor: R.cember },
      { id: 'ellipse', name: 'Elips', description: 'Tuvalde sürükleyin; sürüklediğiniz kutuya içten teğet elips çizilir.', icon: <GeometryToolIcon kind="ellipse" />, iconBg: Z.cember, iconColor: R.cember },
    ],
  },

  {
    groupName: 'Çokgen Araçları',
    themeColor: GRUP_GRADYANLARI.cokgen,
    badgeBg: ROZET,
    containerBg: 'bg-card',
    containerBorder: 'border-border',
    headerTextColor: 'text-foreground',
    tools: [
      { id: 'polygon', name: 'Çokgen', description: 'Köşeleri belirleyerek çokgen çizin.', icon: <GeometryToolIcon kind="polygon" />, iconBg: Z.cokgen, iconColor: R.cokgen },
      { id: 'rectangle', name: 'Dikdörtgen', description: 'Dikdörtgen şekli ekleyin.', icon: <GeometryToolIcon kind="rectangle" />, iconBg: Z.cokgen, iconColor: R.cokgen },
      { id: 'square', name: 'Kare', description: 'Sürükleyerek kare çizin.', icon: <Square className="w-4 h-4" />, iconBg: Z.cokgen, iconColor: R.cokgen },
      { id: 'regular_polygon', name: 'Düzgün Çokgen', description: 'Kenar sayısını girerek düzgün çokgen oluşturun.', icon: <Hexagon className="w-4 h-4" />, iconBg: Z.cokgen, iconColor: R.cokgen },
    ],
  },

  // 5. Cebir & Fonksiyon Araçları
  {
    groupName: 'Cebir & Fonksiyon',
    themeColor: GRUP_GRADYANLARI.cebir,
    badgeBg: ROZET,
    containerBg: 'bg-card',
    containerBorder: 'border-border',
    headerTextColor: 'text-foreground',
    tools: [
      { id: 'function', name: 'Fonksiyon', description: 'f(x) ifadesi girerek grafik çizin.', icon: <GeometryToolIcon kind="function" />, iconBg: Z.cebir, iconColor: R.cebir },
      { id: 'slider', name: 'Sürgü', description: 'a, b gibi parametreler için sürgü ekleyin.', icon: <Sliders className="w-4 h-4" />, iconBg: Z.cebir, iconColor: R.cebir },
    ],
  },

  // 5.5 Klasik Geometri İnşaları
  // Pergel-cetvel geleneğindeki temel inşalar: orta nokta, orta dikme, açıortay,
  // dik/paralel doğru, pergel ve kesişim. Hepsi tıklanan NOKTALARDAN üretilir.
  {
    groupName: 'İnşa Araçları',
    themeColor: GRUP_GRADYANLARI.insa,
    badgeBg: ROZET,
    containerBg: 'bg-card',
    containerBorder: 'border-border',
    headerTextColor: 'text-foreground',
    tools: [
      { id: 'midpoint', name: 'Orta Nokta', description: 'İki noktaya tıklayın; aralarındaki orta nokta oluşur.', icon: <GeometryToolIcon kind="midpoint" />, iconBg: Z.insa, iconColor: R.insa },
      { id: 'divide_ratio', name: 'Oranda Böl', description: 'İki noktaya tıklayın, sonra m:n oranını girin (örn. 2:1).', icon: <Scissors className="w-4 h-4" />, iconBg: Z.insa, iconColor: R.insa },
      { id: 'perp_bisector', name: 'Orta Dikme', description: 'İki noktaya tıklayın; orta noktadan geçen dik doğru çizilir.', icon: <SeparatorVertical className="w-4 h-4" />, iconBg: Z.insa, iconColor: R.insa },
      { id: 'angle_bisector', name: 'Açıortay', description: 'Açının bir kolu, köşesi ve diğer kolu: üç noktaya sırayla tıklayın.', icon: <GitBranch className="w-4 h-4" />, iconBg: Z.insa, iconColor: R.insa },
      { id: 'perpendicular', name: 'Dik Doğru', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', icon: <Plus className="w-4 h-4" />, iconBg: Z.insa, iconColor: R.insa },
      { id: 'parallel', name: 'Paralel Doğru', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', icon: <Equal className="w-4 h-4" />, iconBg: Z.insa, iconColor: R.insa },
      { id: 'compass', name: 'Pergel', description: 'İğneyi saplayın, açıklığı ayarlayın, yayın başlangıcını istediğiniz yere bırakın ve iki yöne de çizin.', icon: <GeometryToolIcon kind="compass" />, iconBg: Z.insa, iconColor: R.insa },
      { id: 'intersect', name: 'Kesiştir', description: 'İki şekle tıklayın; ortak noktalarını oluşturur. Doğru, ışın, doğru parçası, çember ve yay desteklenir; elips yalnızca doğrularla kesiştirilebilir.', icon: <XIcon className="w-4 h-4" />, iconBg: Z.insa, iconColor: R.insa },
    ],
  },

  // 6. Dönüşüm & Simetri Araçları (3)
  {
    groupName: 'Dönüşüm Araçları',
    themeColor: GRUP_GRADYANLARI.donusum,
    badgeBg: ROZET,
    containerBg: 'bg-card',
    containerBorder: 'border-border',
    headerTextColor: 'text-foreground',
    tools: [
      { id: 'rotate', name: 'Şekli Döndür', description: 'Şekli bir merkez etrafında döndürün.', icon: <RotateCw className="w-4 h-4" />, iconBg: Z.donusum, iconColor: R.donusum },
      { id: 'translate', name: 'Öteleme', description: 'Önce şekli seçin; sonra öteleme vektörünün başlangıç ve bitiş noktasına tıklayın.', icon: <MoveRight className="w-4 h-4" />, iconBg: Z.donusum, iconColor: R.donusum },
      { id: 'reflect', name: 'Yansıt', description: 'Doğruya göre simetri / yansıma.', icon: <FlipHorizontal className="w-4 h-4" />, iconBg: Z.donusum, iconColor: R.donusum },
      { id: 'symmetry', name: 'Simetri Keşfet', description: 'Simetri eksenlerini keşfedin.', icon: <Sparkles className="w-4 h-4" />, iconBg: Z.donusum, iconColor: R.donusum },
    ],
  },

  // 6.5 Etkileşim Araçları — düğme, işaret kutusu, girdi kutusu
  {
    groupName: 'Etkileşim Araçları',
    themeColor: GRUP_GRADYANLARI.etkilesim,
    badgeBg: ROZET,
    containerBg: 'bg-card',
    containerBorder: 'border-border',
    headerTextColor: 'text-foreground',
    tools: [
      { id: 'checkbox', name: 'İşaret Kutusu', description: 'Önce göster/gizle edilecek nesneleri seçin, sonra kutunun yerine tıklayın.', icon: <CheckSquare className="w-4 h-4" />, iconBg: Z.etkilesim, iconColor: R.etkilesim },
      { id: 'button', name: 'Düğme', description: 'Seçili nesneleri gösterip gizleyen ya da kaydırıcıyı oynatan düğme ekler.', icon: <MousePointerClick className="w-4 h-4" />, iconBg: Z.etkilesim, iconColor: R.etkilesim },
      { id: 'input_box', name: 'Girdi Kutusu', description: 'Önce bir kaydırıcı veya fonksiyon seçin, sonra kutunun yerine tıklayın.', icon: <TextCursorInput className="w-4 h-4" />, iconBg: Z.etkilesim, iconColor: R.etkilesim },
    ],
  },

  // 7. Kesir & Medya Araçları (3)
  {
    groupName: 'Kesir & Medya',
    themeColor: GRUP_GRADYANLARI.etkilesim,
    badgeBg: ROZET,
    containerBg: 'bg-card',
    containerBorder: 'border-border',
    headerTextColor: 'text-foreground',
    tools: [
      { id: 'fraction', name: 'Kesir Göster', description: 'Kesir modeli oluşturun.', icon: <span className="font-bold text-xs">½</span>, iconBg: Z.etkilesim, iconColor: R.etkilesim },
      { id: 'image', name: 'Görsel Ekle', description: 'Tuvale görsel ekleyin.', icon: <ImageIcon className="w-4 h-4" />, iconBg: Z.etkilesim, iconColor: R.etkilesim },
      { id: 'text', name: 'Yazı Ekle', description: 'Tuvale metin kutusu ekleyin.', icon: <Type className="w-4 h-4" />, iconBg: Z.etkilesim, iconColor: R.etkilesim },
    ],
  },
];

