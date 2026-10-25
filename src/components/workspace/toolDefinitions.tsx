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

/** Rozet: kum zemin + mürekkep yazı (koyu temada secondary). */
const ROZET = 'bg-ada-kum text-ada-murekkep border-ada-altin/30 dark:bg-secondary dark:text-secondary-foreground dark:border-border';

export interface ToolItem {
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

/** 2B aracın tek kaydı: panel listesi ve ağaç liste bundan üretilir. */
export interface AracKaydi {
  id: ToolMode;
  name: string;
  description: string;
  /** Ağaç listede (araç paneli, Ara sekmesi, kılavuz) gösterilen kısa açıklama; yoksa `description` */
  agacAciklamasi?: string;
  icon: React.ReactNode;
  /** Simge rengi ve zemini (ARAC_KATEGORI_RENKLERI / ARAC_KATEGORI_ZEMINLERI) */
  kategori: AracKategorisi;
}

export interface AracGrubuKaydi {
  /** Ağaç listedeki grup kimliği (TREE_TOOL_GROUPS; kademe süzgeci ve Araçlar menüsünün alt grupları bunu kullanır) */
  agacKimligi: string;
  groupName: string;
  /** Grup başlığı gradyanının kategorisi */
  tema: AracKategorisi;
  /** Ağaç listede başlangıçta açık mı (defaultExpanded) */
  acik: boolean;
  tools: AracKaydi[];
}

/**
 * 2B araçların TEK kaydı. Panel listesi (TOOL_GROUPS: imleç rozeti, komut önerileri, menü kısayolları) ve ağaç liste
 * (treeToolDefinitions.TREE_TOOL_GROUPS: araç paneli, Ara sekmesi, Araçlar menüsü, kılavuz) bundan üretilir; grup ve
 * araç sırası, ad, simge ve renk iki listede ayrışamaz. Kademe süzgeci (kademeDuzeyleri) araç kimliğine bakar.
 */
export const ARAC_GRUPLARI: readonly AracGrubuKaydi[] = [
  // 1. Temel Çizim Araçları
  {
    agacKimligi: 'temel_cizim',
    groupName: 'Temel Çizim Araçları',
    tema: 'temel',
    acik: true,
    tools: [
      { id: 'point', name: 'Nokta', description: 'Tuvale tıklayarak yeni nokta oluşturun.', icon: <GeometryToolIcon kind="point" />, kategori: 'temel' },
      { id: 'segment', name: 'Doğru Parçası', description: 'İki nokta arasına doğru parçası çizin.', icon: <GeometryToolIcon kind="segment" />, kategori: 'temel' },
      { id: 'line', name: 'Doğru', description: 'İki noktadan geçen sonsuz doğru çizin.', icon: <GeometryToolIcon kind="line" />, kategori: 'temel' },
      { id: 'ray', name: 'Işın', description: 'Başlangıç noktası ve üzerinden geçen ikinci nokta ile ışın çizin.', icon: <GeometryToolIcon kind="ray" />, kategori: 'temel' },
      { id: 'segment_length', name: 'Ölçülü Doğru Parçası', description: 'Bir başlangıç noktasına tıklayın, uzunluğu sayı olarak girin.', icon: <Ruler className="w-4 h-4" />, kategori: 'temel' },
      { id: 'circle', name: 'Çember', description: 'Merkez ve yarıçap noktasıyla çember çizin.', icon: <CircleIcon className="w-4 h-4" />, kategori: 'cember' },
      // Çokgen ve Düzgün Çokgen temel araçlardır (her kademede sık kullanılır; panelin üstündeki ayrı kısayol şeridi kaldırıldı, 16 Ekim 2026)
      { id: 'polygon', name: 'Çokgen', description: 'Köşeleri belirleyerek çokgen çizin.', icon: <GeometryToolIcon kind="polygon" />, kategori: 'cokgen' },
      { id: 'regular_polygon', name: 'Düzgün Çokgen', description: 'Kenar sayısını girerek düzgün çokgen oluşturun.', icon: <Hexagon className="w-4 h-4" />, kategori: 'cokgen' },
      { id: 'pen', name: 'Kalem', description: 'Serbest çizim kalemi.', icon: <PenTool className="w-4 h-4" />, kategori: 'temel' },
    ],
  },
  // 2. Düzenleme Araçları
  {
    agacKimligi: 'duzenleme',
    groupName: 'Düzenleme Araçları',
    tema: 'temel',
    acik: true,
    tools: [
      { id: 'select', name: 'Seç ve Taşı', description: 'Noktaları veya nesneleri seçip sürükleyin.', icon: <MousePointer className="w-4 h-4" />, kategori: 'temel' },
      { id: 'delete', name: 'Sil', description: 'Silmek istediğiniz nesneye dokunun.', icon: <Trash2 className="w-4 h-4" />, kategori: 'tehlike' },
    ],
  },
  // 3. Ölçme Araçları
  {
    agacKimligi: 'olcme',
    groupName: 'Ölçme Araçları',
    tema: 'olcme',
    acik: false,
    tools: [
      { id: 'measure_distance', name: 'Uzunluk Ölç (cm)', description: 'Mesafe ve uzunluk ölçün.', icon: <Ruler className="w-4 h-4 -rotate-45" />, kategori: 'olcme' },
      { id: 'unit_measure', name: 'Birimle Ölç (br)', description: 'Birim karelerle ölçüm yapın.', icon: <GeometryToolIcon kind="grid" />, kategori: 'olcme' },
      { id: 'measure_angle', name: 'Açıölçer', description: 'Açı ölçümü yapın.', icon: <GeometryToolIcon kind="protractor" />, kategori: 'olcme' },
      { id: 'angle', name: 'Açı Oluştur', description: '3 nokta ile açı oluşturun.', icon: <GeometryToolIcon kind="angle" />, kategori: 'olcme' },
      { id: 'measure_area', name: 'Alanı Bul', description: 'Kapalı şeklin alanını hesaplayın.', icon: <GeometryToolIcon kind="area" />, kategori: 'olcme' },
      { id: 'measure_perimeter', name: 'Çevre Hesapla', description: 'Şeklin çevre uzunluğunu hesaplayın.', icon: <GeometryToolIcon kind="perimeter" />, kategori: 'olcme' },
      { id: 'measure_slope', name: 'Eğim Ölç', description: 'İki noktaya tıklayın; aradaki doğrunun eğimini gösterir.', icon: <TrendingUp className="w-4 h-4" />, kategori: 'olcme' },
      { id: 'trig_ratios', name: 'Trig. Oranlar', description: 'Bir kola, AÇININ KÖŞESİNE ve diğer kola tıklayın; sin, cos, tan değerlerini gösterir. Üçgen dikse kenar oranları da yazılır.', agacAciklamasi: 'Açının trigonometrik oranlarını ve dik üçgen oranlarını gösterir.', icon: <Triangle className="w-4 h-4" />, kategori: 'olcme' },
      { id: 'measure_arc', name: 'Yay Ölç', description: 'Aynı çemberin üzerindeki iki noktaya tıklayın; aralarındaki yayın uzunluğunu ve ölçüsünü gösterir.', icon: <GeometryToolIcon kind="arcMeasure" />, kategori: 'olcme' },
      { id: 'area_model', name: 'Alanı Modelle', description: 'Alan modelleme ızgarası.', icon: <GeometryToolIcon kind="grid" />, kategori: 'olcme' },
      { id: 'ruler', name: 'Cetvel', description: 'İnteraktif cetvel aracı.', icon: <Ruler className="w-4 h-4 -rotate-45" />, kategori: 'olcme' },
      { id: 'setsquare', name: 'Gönye', description: 'Dik açı ve gönye aracı.', icon: <GeometryToolIcon kind="setsquare" />, kategori: 'olcme' },
    ],
  },
  // 4. Çember Araçları
  {
    agacKimligi: 'cember',
    groupName: 'Çember Araçları',
    tema: 'cember',
    acik: false,
    tools: [
      { id: 'circle_radius', name: 'Yarıçapla Çember', description: 'Merkeze tıklayın, yarıçapı sayı olarak girin.', icon: <CircleDot className="w-4 h-4" />, kategori: 'cember' },
      { id: 'circle_3points', name: '3 Noktalı Çember', description: 'Üç noktaya tıklayın; bu üç noktadan geçen çember (çevrel çember) çizilir.', agacAciklamasi: 'Üç noktaya tıklayın; çevrel çember çizilir.', icon: <CircleIcon className="w-4 h-4" />, kategori: 'cember' },
      { id: 'arc', name: 'Yay', description: 'Merkez, başlangıç ve bitiş noktasına tıklayın; saat yönünün tersine yay çizilir.', icon: <GeometryToolIcon kind="arc" />, kategori: 'cember' },
      { id: 'sector', name: 'Daire Dilimi', description: 'Yay ile aynı üç tıklama, ama içi dolu pasta dilimi çizilir.', icon: <PieChart className="w-4 h-4" />, kategori: 'cember' },
      { id: 'ellipse', name: 'Elips', description: 'Tuvalde sürükleyin; sürüklediğiniz kutuya içten teğet elips çizilir.', agacAciklamasi: 'Kutuya içten teğet elips çizilir.', icon: <GeometryToolIcon kind="ellipse" />, kategori: 'cember' },
    ],
  },
  // 5. Çokgen Araçları
  {
    agacKimligi: 'cokgen',
    groupName: 'Çokgen Araçları',
    tema: 'cokgen',
    acik: false,
    tools: [
      { id: 'rectangle', name: 'Dikdörtgen', description: 'Dikdörtgen şekli ekleyin.', icon: <GeometryToolIcon kind="rectangle" />, kategori: 'cokgen' },
      { id: 'square', name: 'Kare', description: 'Köşeye dokunup kenar uzunluğunu yazın ya da sürükleyerek çizin.', icon: <Square className="w-4 h-4" />, kategori: 'cokgen' },
    ],
  },
  // 6. Cebir & Fonksiyon
  {
    agacKimligi: 'cebir_fonksiyon',
    groupName: 'Cebir & Fonksiyon',
    tema: 'cebir',
    acik: false,
    tools: [
      { id: 'function', name: 'Fonksiyon', description: 'f(x) ifadesi girerek grafik çizin.', icon: <GeometryToolIcon kind="function" />, kategori: 'cebir' },
      { id: 'slider', name: 'Sürgü', description: 'a, b gibi parametreler için sürgü ekleyin.', icon: <Sliders className="w-4 h-4" />, kategori: 'cebir' },
    ],
  },
  // 7. İnşa Araçları: pergel-cetvel geleneğindeki temel inşalar (orta nokta, orta dikme, açıortay,
  // dik/paralel doğru, pergel ve kesişim). Hepsi tıklanan NOKTALARDAN üretilir.
  {
    agacKimligi: 'insa',
    groupName: 'İnşa Araçları',
    tema: 'insa',
    acik: false,
    tools: [
      { id: 'midpoint', name: 'Orta Nokta', description: 'İki noktaya tıklayın; aralarındaki orta nokta oluşur.', icon: <GeometryToolIcon kind="midpoint" />, kategori: 'insa' },
      { id: 'divide_ratio', name: 'Oranda Böl', description: 'İki noktaya tıklayın, sonra m:n oranını girin (örn. 2:1).', agacAciklamasi: 'İki noktaya tıklayın, sonra m:n oranını girin.', icon: <Scissors className="w-4 h-4" />, kategori: 'insa' },
      { id: 'perp_bisector', name: 'Orta Dikme', description: 'İki noktaya tıklayın; orta noktadan geçen dik doğru çizilir.', icon: <SeparatorVertical className="w-4 h-4" />, kategori: 'insa' },
      { id: 'angle_bisector', name: 'Açıortay', description: 'Açının bir kolu, köşesi ve diğer kolu: Üç noktaya sırayla tıklayın.', icon: <GitBranch className="w-4 h-4" />, kategori: 'insa' },
      { id: 'perpendicular', name: 'Dik Doğru', description: 'Bir doğru (ya da doğrultuyu veren iki nokta), sonra doğrunun geçeceği nokta seçilir.', icon: <Plus className="w-4 h-4" />, kategori: 'insa' },
      { id: 'parallel', name: 'Paralel Doğru', description: 'Bir doğru (ya da doğrultuyu veren iki nokta), sonra doğrunun geçeceği nokta seçilir.', icon: <Equal className="w-4 h-4" />, kategori: 'insa' },
      { id: 'compass', name: 'Pergel', description: 'İğneyi saplayın, açıklığı ayarlayın, yayın başlangıcını istediğiniz yere bırakın ve iki yöne de çizin.', agacAciklamasi: 'İğneyi saplayın, açıklığı ayarlayın ve çember çizin.', icon: <GeometryToolIcon kind="compass" />, kategori: 'insa' },
      { id: 'intersect', name: 'Kesiştir', description: 'İki şekle tıklayın; ortak noktalarını oluşturur. Doğru, ışın, doğru parçası, çember ve yay desteklenir; elips yalnızca doğrularla kesiştirilebilir.', agacAciklamasi: 'İki şekle tıklayın; ortak noktalarını oluşturur.', icon: <XIcon className="w-4 h-4" />, kategori: 'insa' },
    ],
  },
  // 8. Dönüşüm Araçları
  {
    agacKimligi: 'donusum',
    groupName: 'Dönüşüm Araçları',
    tema: 'donusum',
    acik: false,
    tools: [
      { id: 'rotate', name: 'Şekli Döndür', description: 'Şekli bir merkez etrafında döndürün.', icon: <RotateCw className="w-4 h-4" />, kategori: 'donusum' },
      { id: 'translate', name: 'Öteleme', description: 'Önce şekli seçin; sonra öteleme vektörünün başlangıç ve bitiş noktasına tıklayın.', agacAciklamasi: 'Öteleme vektörüyle şekli taşıyın.', icon: <MoveRight className="w-4 h-4" />, kategori: 'donusum' },
      { id: 'reflect', name: 'Yansıt', description: 'Doğruya göre simetri / yansıma.', icon: <FlipHorizontal className="w-4 h-4" />, kategori: 'donusum' },
      { id: 'symmetry', name: 'Simetri Keşfet', description: 'Simetri eksenlerini keşfedin.', icon: <Sparkles className="w-4 h-4" />, kategori: 'donusum' },
    ],
  },
  // 9. Etkileşim Araçları: düğme, işaret kutusu, girdi kutusu
  {
    agacKimligi: 'etkilesim',
    groupName: 'Etkileşim Araçları',
    tema: 'etkilesim',
    acik: false,
    tools: [
      { id: 'checkbox', name: 'İşaret Kutusu', description: 'Önce göster/gizle edilecek nesneleri seçin, sonra kutunun yerine tıklayın.', agacAciklamasi: 'Nesneleri göster/gizle etmek için kutu ekleyin.', icon: <CheckSquare className="w-4 h-4" />, kategori: 'etkilesim' },
      { id: 'button', name: 'Düğme', description: 'Seçili nesneleri gösterip gizleyen ya da kaydırıcıyı oynatan düğme ekler.', agacAciklamasi: 'Seçili nesneleri çalıştıran düğme ekleyin.', icon: <MousePointerClick className="w-4 h-4" />, kategori: 'etkilesim' },
      { id: 'input_box', name: 'Girdi Kutusu', description: 'Önce bir kaydırıcı veya fonksiyon seçin, sonra kutunun yerine tıklayın.', agacAciklamasi: 'Değer girmek için kutu ekleyin.', icon: <TextCursorInput className="w-4 h-4" />, kategori: 'etkilesim' },
    ],
  },
  // 10. Kesir & Medya
  {
    agacKimligi: 'kesir_medya',
    groupName: 'Kesir & Medya',
    tema: 'etkilesim',
    acik: false,
    tools: [
      { id: 'fraction', name: 'Kesir Göster', description: 'Kesir modeli oluşturun.', icon: <span className="font-bold text-xs">½</span>, kategori: 'etkilesim' },
      { id: 'image', name: 'Görsel Ekle', description: 'Tuvale görsel ekleyin.', icon: <ImageIcon className="w-4 h-4" />, kategori: 'etkilesim' },
      { id: 'text', name: 'Yazı Ekle', description: 'Tuvale metin kutusu ekleyin.', icon: <Type className="w-4 h-4" />, kategori: 'etkilesim' },
    ],
  },
];

/** Panel listesindeki araç: simge zemini ve rengi kategoriden */
const panelAraci = ({ id, name, description, icon, kategori }: AracKaydi): ToolItem => ({
  id,
  name,
  description,
  icon,
  iconBg: ARAC_KATEGORI_ZEMINLERI[kategori],
  iconColor: ARAC_KATEGORI_RENKLERI[kategori],
});

export const TOOL_GROUPS: ToolGroup[] = ARAC_GRUPLARI.map((grup) => ({
  groupName: grup.groupName,
  themeColor: GRUP_GRADYANLARI[grup.tema],
  badgeBg: ROZET,
  containerBg: 'bg-card',
  containerBorder: 'border-border',
  headerTextColor: 'text-foreground',
  tools: grup.tools.map(panelAraci),
}));

const ARAC_ADLARI: ReadonlyMap<string, string> = new Map(TOOL_GROUPS.flatMap((g) => g.tools.map((t) => [t.id, t.name] as const)));

/** Aracın paneldeki adı ("ellipse" → "Elips"); listede olmayan araç (ör. El) için 'pan' → "Görünümü Kaydır". */
export function aracAdi(arac: string): string {
  return ARAC_ADLARI.get(arac) ?? (arac === 'pan' ? 'Görünümü Kaydır' : arac);
}
