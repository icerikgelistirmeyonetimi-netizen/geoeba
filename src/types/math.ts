// Matematiksel Nesne ve Koordinat Tipleri

export type Point2D = {
  x: number;
  y: number;
};

export type ScreenPoint = {
  x: number;
  y: number;
};

/** Ölçüm yazısının ortak şekil grubuna bağlı, deformasyonda hizasını koruyan çapası. */
export interface MeasurementLabelAnchor {
  /** Merkezi birlikte belirleyen noktalar; geometrik bağımlılık değildir. */
  pointIds: string[];
  /** Hizalama noktasının, noktaların aritmetik merkezine göre dünya birimindeki kayıklığı. */
  offset: Point2D;
  alignment: 'left' | 'center' | 'right';
}

export type ObjectType =
  | 'point'
  | 'segment'
  | 'line'
  | 'ray'
  | 'circle'
  | 'ellipse'
  | 'arc'
  | 'sector'
  | 'angle'
  | 'polygon'
  | 'function'
  | 'slider'
  | 'fraction'
  | 'pen'
  | 'text'
  | 'image'
  | 'checkbox'
  | 'button'
  | 'input_box'
  | 'measurement';

/** Taşınabilir ölçüm etiketlerinin türleri (nesne başına birden çok etiket olabilir). */
export type MeasurementKind =
  /** Nokta adı ve koordinatı (taşınabilir, gizlenemez) */
  | 'pointLabel'
  | 'measure'
  | 'length'
  | 'area'
  | 'perimeter'
  | 'angle'
  | 'arcLength'
  | 'radius'
  | 'chordLength'
  /** Yay ve daire diliminin MERKEZ AÇISI; alan/yay uzunluğundan bağımsız gizlenebilir. */
  | 'centralAngle';

/** Çokgen kenarı etiketi için anahtar üretir: 0. kenar -> 'edge0'. */
export const edgeLabelKey = (index: number) => `edge${index}`;

export interface BaseMathObject {
  id: string;
  type: ObjectType;
  label: string;
  showLabel: boolean;
  color: string;
  visible: boolean;
  locked?: boolean;
  selected?: boolean;
  createdAt: number;
  /**
   * Ölçüm etiketlerinin varsayılan konumdan DÜNYA birimi cinsinden kayıklığı.
   * Kayıklık şekle GÖRE tutulduğu için şekil taşındığında etiket de onunla birlikte gider.
   */
  labelOffsets?: Record<string, Point2D>;
  /** Uzaklaştırılmış ölçüm yazılarının ortak şekil merkezine bağlı konumları. */
  labelAnchors?: Record<string, MeasurementLabelAnchor>;
  /** Nesne hareket ettikçe ekranda kalıcı iz bırakır mı (GeoGebra Show Trace) */
  showTrace?: boolean;
}

export interface PointObject extends BaseMathObject {
  /** Türkçe komutlarla kurulan canlı geometrik ilişkiler. */
  construction?:
    | { kind: 'foot'; sourceId: string; linePointIds: [string, string] }
    | { kind: 'midpoint'; pointIds: [string, string] }
    | { kind: 'tangent'; circleId: string; sourceId: string; branch: -1 | 1; direction?: boolean }
    | { kind: 'triangleVertex'; anchorId: string; sliderIds: [string, string, string]; vertex: 1 | 2; rotation: number; orientation: 1 | -1 }
    /** A + t·(B − A); t = m/(m+n) oranında bölme. */
    | { kind: 'ratio'; pointIds: [string, string]; t: number }
    /** throughId noktasından geçen, AB'ye paralel/dik doğrunun ikinci noktası (|AB| kadar ötede). */
    | { kind: 'direction'; throughId: string; linePointIds: [string, string]; mode: 'parallel' | 'perpendicular' }
    /** ∠(P1, V, P3) açıortayı üzerindeki nokta. */
    | { kind: 'bisector'; pointIds: [string, string, string] }
    /** İki nesnenin (doğru/ışın/parça, çember/yay/dilim, elips) index. kesişim noktası; kesişim yoksa son konumda kalır. */
    | { kind: 'intersection'; objectIds: [string, string]; index: number }
    /** Doğruya (axisPointIds), noktaya (centerId) veya eksene göre yansıma. */
    | { kind: 'reflect'; sourceId: string; axisPointIds?: [string, string]; centerId?: string; axis?: 'x' | 'y' | 'y=x' | 'y=-x' }
    /** Merkez noktası (centerId) ya da sabit merkez etrafında saat yönünün tersine döndürme. Sürgüye bağlanabilir (canlandırma). */
    | { kind: 'rotate'; sourceId: string; centerId?: string; center?: Point2D; degrees: number; sliderId?: string; sliderVariableName?: string }
    /** Vektör (vectorPointIds: başlangıç → bitiş) ya da sabit vektör kadar öteleme. */
    | { kind: 'translate'; sourceId: string; vectorPointIds?: [string, string]; vector?: Point2D }
    /** Merkeze göre k katı (homotete). */
    | { kind: 'dilate'; sourceId: string; centerId?: string; center?: Point2D; factor: number }
    /** Üçgenin ağırlık, çevrel, iç teğet veya diklik merkezi. */
    | { kind: 'triangleCenter'; pointIds: [string, string, string]; center: 'centroid' | 'circumcenter' | 'incenter' | 'orthocenter' };
  type: 'point';
  x: number;
  y: number;
  /**
   * 3B görünümdeki yükseklik (varsayılan 0). 2B görünüm üstten bakıştır ve z'yi yok sayar.
   * Kurulumlu ve nesne üzerindeki noktalarda z, `zEkseni.bagimliZleriHesapla` ile kaynaklardan türetilir.
   */
  z?: number;
  size?: number; // Nokta yarıçapı (piksel)
  isIndependent: boolean; // Bağımsız sürüklenebilir mi yoksa kesişim/bağımlı nokta mı
  /**
   * Nokta bir nesnenin ÜZERİNDE oluşturulduysa o nesnenin kimliği.
   * Sürüklendiğinde bu nesnenin üzerinden ayrılmaz; nesne silinirse nokta da silinir.
   */
  onObjectId?: string;
  dependsOn?: string[]; // Bağımlı olduğu nesne kimlikleri
  /** Nokta canlandırması açık mı (GeoGebra Animation On) */
  animating?: boolean;
  /** Nokta canlandırma hızı */
  animSpeed?: number;
  /** Canlandırma modu (salınan, artan, azalan, bir kez artan) */
  animMode?: 'oscillating' | 'increasing' | 'decreasing' | 'increasing_once';
  /** Yol üzerindeki parametre ilerlemesi (ör. 0..1 veya açı) */
  animProgress?: number;
}

export interface SegmentObject extends BaseMathObject {
  type: 'segment';
  startPointId: string;
  endPointId: string;
  thickness?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  showLength?: boolean;
  unit?: 'cm' | 'br';
  /**
   * Bu parça bir açıyla BİRLİKTE, o açının kolu olarak çizildiyse açının kimliği (Açı aracı, "ABC açısını çiz").
   * Açının kendisi silinince, başka hiçbir nesnenin kullanmadığı bu kollar da gider (collectDependentIds).
   */
  armOfAngleId?: string;
  /** Elle konmuş eşitlik çentiği: 0 = işaretsiz, 1–4 = çizgi sayısı; yoksa otomatik (esitlikIsaretleri.ts). */
  equalityMark?: number;
}

export interface LineObject extends BaseMathObject {
  /** Tanım noktaları arasındaki sonlu mesafe; doğrunun/ışının toplam uzunluğu değildir. */
  showLength?: boolean;
  type: 'line';
  point1Id: string;
  point2Id: string;
  thickness?: number;
  style?: 'solid' | 'dashed';
  showEquation?: boolean;
}

export interface RayObject extends BaseMathObject {
  /** Tanım noktaları arasındaki sonlu mesafe; doğrunun/ışının toplam uzunluğu değildir. */
  showLength?: boolean;
  type: 'ray';
  startPointId: string;
  throughPointId: string;
  thickness?: number;
  style?: 'solid' | 'dashed';
}

export interface CircleObject extends BaseMathObject {
  type: 'circle';
  centerPointId: string;
  radiusPointId?: string; // Yarıçapı belirleyen ikinci nokta
  fixedRadius?: number; // Sabit yarıçaplı ise
  /** Bu nokta çembere KİLİTLENİRKEN yarıçap noktası olmaktan çıkarıldı; kilit çözülünce yarıçap ona geri verilir. */
  releasedRadiusPointId?: string;
  /**
   * Üç noktadan geçen (çevrel) çember: merkez ve yarıçap bu üç noktadan CANLI hesaplanır.
   * Verildiğinde centerPointId yok sayılır; noktalar sürüklendikçe çember yeniden kurulur.
   */
  throughPointIds?: string[];
  fillOpacity?: number;
  showArea?: boolean;
  showPerimeter?: boolean;
}

/**
 * Elips: merkez noktası ile yatay (a) ve dikey (b) yarıçaplar.
 * a = b olduğunda çemberle aynı şekli verir; ayrı bir tür olmasının nedeni
 * iki yarıçapın birbirinden bağımsız düzenlenebilmesidir.
 */
export interface EllipseObject extends BaseMathObject {
  type: 'ellipse';
  centerPointId: string;
  /** Yatay yarıçap (dünya birimi) */
  radiusX: number;
  /** Dikey yarıçap (dünya birimi) */
  radiusY: number;
  /** Saat yönünün tersine dönme açısı (derece) */
  rotation?: number;
  fillColor?: string;
  fillOpacity?: number;
  showArea?: boolean;
  showPerimeter?: boolean;
}

/**
 * Yay: merkez + başlangıç noktası + yön noktası.
 * Yarıçapı |merkez-başlangıç| belirler; yön noktası yalnızca yayın açısını/yönünü verir.
 */
export interface ArcObject extends BaseMathObject {
  showRadius?: boolean;
  showChordLength?: boolean;
  type: 'arc';
  centerPointId: string;
  startPointId: string;
  directionPointId: string;
  thickness?: number;
  showArcLength?: boolean;
  /** Merkez açı yazısı görünür mü? (varsayılan: evet) */
  showCentralAngle?: boolean;
  /** Elle konmuş eşitlik çentiği: 0 = işaretsiz, 1–4 = çizgi sayısı; yoksa otomatik (esitlikIsaretleri.ts). */
  equalityMark?: number;
}

/** Daire dilimi (sektör): yay ile aynı üç nokta, ama içi dolu. */
export interface SectorObject extends BaseMathObject {
  showArcLength?: boolean;
  showRadius?: boolean;
  showChordLength?: boolean;
  type: 'sector';
  centerPointId: string;
  startPointId: string;
  directionPointId: string;
  fillColor?: string;
  fillOpacity?: number;
  showArea?: boolean;
  showPerimeter?: boolean;
  /** Merkez açı yazısı görünür mü? (varsayılan: evet) */
  showCentralAngle?: boolean;
  /** Elle konmuş eşitlik çentiği: 0 = işaretsiz, 1–4 = çizgi sayısı; yoksa otomatik (esitlikIsaretleri.ts). */
  equalityMark?: number;
}

export interface AngleObject extends BaseMathObject {
  type: 'angle';
  point1Id: string; // Açının bir kolundaki nokta
  vertexPointId: string; // Açının köşe noktası
  point3Id: string; // Açının diğer kolundaki nokta
  showValue?: boolean;
  arcRadius?: number;
  /**
   * true ise dar/geniş iç açı yerine onu tamamlayan DIŞ açı (360° - iç açı) gösterilir.
   * Örn. iç açı 72° iken dış açı 288° olarak çizilir ve yazılır.
   */
  reflex?: boolean;
}

export interface PolygonObject extends BaseMathObject {
  type: 'polygon';
  pointIds: string[]; // Sıralı köşe noktaları
  /**
   * Uzunluğu gösterilecek kenarların dizinleri. i. kenar, pointIds[i] ile pointIds[i+1]
   * arasındaki kenardır (son kenar pointIds[n-1] -> pointIds[0]).
   */
  edgeLabels?: number[];
  /** Kenar dizini ('0', '1', …; i. kenar pointIds[i] → pointIds[i+1]) → elle eşitlik çentiği (0 = işaretsiz, 1–4 çizgi). */
  edgeEqualityMarks?: Record<string, number>;
  fillColor?: string;
  fillOpacity?: number;
  showArea?: boolean;
  showPerimeter?: boolean;
}

export interface FunctionObject extends BaseMathObject {
  type: 'function';
  expression: string; // Örn: "2*x + 1" veya "a*x^2 + b"
  domain?: [number, number];
  color: string;
  thickness?: number;
  style?: 'solid' | 'dashed';
}

export interface SliderObject extends BaseMathObject {
  type: 'slider';
  variableName: string; // Örn: 'a', 'b', 'm'
  min: number;
  max: number;
  step: number;
  value: number;
  /** Tuval üzerindeki çubuğun SOL UCUNUN dünya koordinatı. Yoksa panelde kalır, tuvale çizilmez. */
  x?: number;
  y?: number;
  /** Çubuğun dünya birimi cinsinden uzunluğu (varsayılan 4). */
  length?: number;
  sliderType?: 'number' | 'angle' | 'integer';
  animSpeed?: number;
  animMode?: 'oscillating' | 'increasing' | 'decreasing' | 'increasing_once';
}

export interface FractionObject extends BaseMathObject {
  type: 'fraction';
  numerator: number;
  denominator: number;
  x: number;
  y: number;
  radius: number;
  modelType: 'pie' | 'bar';
}

export interface PenStrokeObject extends BaseMathObject {
  type: 'pen';
  points: Point2D[];
  thickness: number;
}

export interface TextObject extends BaseMathObject {
  type: 'text';
  text: string;
  x: number;
  y: number;
  fontSize?: number;
}

export interface ImageObject extends BaseMathObject {
  type: 'image';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * İŞARET KUTUSU — tuval üzerinde duran bir onay kutusu.
 * Bağlı nesneleri topluca gösterip gizler; böylece bir çizimi silmek yerine
 * geçici olarak kapatmak mümkün olur (etkinlik hazırlarken en çok istenen şey).
 */
export interface CheckboxObject extends BaseMathObject {
  type: 'checkbox';
  x: number;
  y: number;
  /** Görünürlüğü bu kutuya bağlı nesnelerin kimlikleri */
  targetIds: string[];
  checked: boolean;
}

/** DÜĞME — tıklanınca tek bir iş yapar. */
export interface ButtonObject extends BaseMathObject {
  type: 'button';
  x: number;
  y: number;
  action:
    /** Bağlı nesnelerin görünürlüğünü ters çevirir */
    | { kind: 'toggle'; targetIds: string[] }
    /** Canlandırmayı (sürgüler veya nesneler) başlatır/durdurur (GeoGebra StartAnimation) */
    | { kind: 'animate'; sliderIds?: string[]; targetIds?: string[]; play?: boolean }
    /** Bir kaydırıcıya sabit değer atar */
    | { kind: 'setSlider'; sliderId: string; value: number }
    /** Bir nesneye değer atar (GeoGebra SetValue) */
    | { kind: 'setValue'; targetId: string; value: number }
    /** Tuvaldeki izleri temizler */
    | { kind: 'clearTraces' };
}

/**
 * GİRDİ KUTUSU — bir kaydırıcının değerini ya da bir fonksiyonun ifadesini
 * doğrudan tuval üzerinden yazmayı sağlar.
 */
export interface InputBoxObject extends BaseMathObject {
  type: 'input_box';
  x: number;
  y: number;
  /** Bağlı kaydırıcı veya fonksiyon */
  targetId: string;
  /** Kaydırıcıda 'value', fonksiyonda 'expression' */
  field: 'value' | 'expression';
  /** Kutunun genişliği (dünya birimi değil, piksel) */
  width?: number;
}

/**
 * ÖLÇÜM ETİKETİ — tuval üzerinde duran, CANLI hesaplanan bir sonuç yazısı.
 *
 * "AB eğimi = 5" gibi sonuçlar geçici ipucu satırında kaybolmasın diye nesne olarak
 * saklanır: noktalar taşındığında değer kendiliğinden güncellenir, etiket sürüklenebilir
 * ve tıklanınca gizlenebilir.
 */
export interface MeasurementObject extends BaseMathObject {
  type: 'measurement';
  /**
   * slope: iki nokta arası eğim · trig: dik üçgende sin/cos/tan · distance: iki nokta arası CANLI uzunluk (ör. parça üzerindeki P için |AP|)
   * · arc: çember üzerindeki iki nokta arasındaki yay (çember BÖLÜNMEDEN; uzunluk ve derece)
   */
  kind: 'slope' | 'trig' | 'distance' | 'arc';
  /** slope / distance / arc: [A, B] · trig: [açı köşesi, DİK köşe, üçüncü köşe] */
  pointIds: string[];
  /** Değer yazısı görünür mü? (tıklayınca kapanır) */
  showValue?: boolean;
  /** arc: yayın üzerinde durduğu çember. Çember silinince ölçüm de silinir. */
  circleId?: string;
  /**
   * arc: yayın SAAT YÖNÜNÜN TERSİNE başladığı uç (pointIds'ten biri) — hangi yayın ölçüldüğünün kimliği.
   * Ölçüm oluşturulurken yazılır; noktalar taşınınca yay taraf değiştirmesin diye `throughPointId`/`major`
   * yerine bu alan kullanılır (eski kayıtlarda yoksa ilk işlemde doldurulur).
   */
  startPointId?: string;
  /** arc: bu noktayı İÇEREN taraf ölçülür ("BCD yayı"); yalnızca yay ilk seçilirken ve başlıkta kullanılır. */
  throughPointId?: string;
  /** arc: yay ilk seçilirken büyük yay istendiyse true (başlangıç ucu yazıldıktan sonra yalnızca hatırlatmadır). */
  major?: boolean;
}

export type MathObject =
  | PointObject
  | SegmentObject
  | LineObject
  | RayObject
  | CircleObject
  | EllipseObject
  | ArcObject
  | SectorObject
  | AngleObject
  | PolygonObject
  | FunctionObject
  | SliderObject
  | FractionObject
  | PenStrokeObject
  | TextObject
  | ImageObject
  | CheckboxObject
  | ButtonObject
  | InputBoxObject
  | MeasurementObject;

export interface ViewportTransform {
  zoom: number; // Piksel / birim ölçeği (varsayılan: 40px = 1 birim)
  panX: number; // Merkezin ekran piksel X ofseti
  panY: number; // Merkezin ekran piksel Y ofseti
  width: number;
  height: number;
  showGrid: boolean;
  showAxes: boolean;
  showCoordinates: boolean;
  showMeasurements?: boolean;
  showQuadrants?: boolean;
  /**
   * Siyah–beyaz (gri tonlamalı) gösterim. Açıkken hem ekrandaki çizim hem de
   * PNG/SVG/PDF/Word çıktıları renksiz üretilir; fotokopi ve baskı için uygundur.
   */
  blackWhite?: boolean;
  /**
   * Eşitlik çentikleri: birbirine değen şekillerde eşit uzunluklar/yaylar otomatik işaretlenir (|, ||, |||).
   * undefined/true = açık (varsayılan), false = kapalı (elle konan işaretler yine çizilir).
   */
  showEqualityMarks?: boolean;
  snapToGrid: boolean;
  /** Sabit ızgara aralığı (dünya birimi); yalnız gridStepAuto === false iken kullanılır */
  gridStep: number;
  /**
   * Izgara aralığı otomatik mi? Varsayılan (undefined/true): yakınlaştırmaya göre seçilir.
   * false: Ayarlar > Izgara aralığı'nda girilen gridStep kullanılır (çizim ve yakalama birlikte).
   */
  gridStepAuto?: boolean;
  /** Izgaranın (kareli, noktalı, izometrik) opaklığı 0,1–1; varsayılan 1. Ayarlar'da "saydamlık" olarak gösterilir. */
  gridOpacity?: number;
  /**
   * Izgara biçimi: kareli (çizgiler, varsayılan), noktalı (kesişimlerde noktalar; "noktalı zemin") ya da
   * izometrik (dikey ve ±30° eğik çizgiler; eşkenar üçgen örgü — izometrik kâğıt)
   */
  gridStyle?: 'kareli' | 'noktali' | 'izometrik';
  backgroundColor?: string;
  rightAngleStyle?: 'arc_dot' | 'square' | 'arc_fill' | 'l_shape';
  pointSnapMode?: 'automatic' | 'snapToGrid' | 'fixedToGrid' | 'off';
}
