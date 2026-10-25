/**
 * 2B çizim araçlarının ortak nesne kurucuları ve araç listeleri: Temel Çizim Araçları (Nokta, Doğru Parçası, Doğru, Işın,
 * Ölçülü Doğru Parçası, Çember, Çokgen, Düzgün Çokgen), Çokgen Araçları (Kare, Dikdörtgen), Alanı Modelle ve ölçüm
 * çokgenleri.
 *
 * Aynı şekil birden çok yoldan kurulur: tıkla-tıkla akışı (WorkspaceContext.handlePointClick / handleCanvasClick),
 * tuvalde sürükleyerek çizim (Canvas), ölçme aletleri ve diyaloglar. Nesnenin alanları (renk, kalınlık, bayraklar, ad
 * kalıbı, anahtar sırası) burada bir kez yazılır; böylece yollar birbirinden ayrışamaz. Saf işlevlerdir: durumu
 * değiştirmez, yalnız nesne üretir (kimlik createId ile, zaman Date.now ile).
 *
 * Yazılı / sesli komutların kurduğu şekiller (math/commands/scene.ts) bu modülü kullanmaz: komut motorunun kendi
 * varsayılanları vardır (ör. çokgenin adı "ABC", parçanın uzunluğu açık).
 */
import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import { createId } from '@/state/ids';
import { regularPolygonVertices } from '@/math/regularPolygon';
import { calculateDistance } from '@/math/geometry';
import { kesirEtiketi, type KesirAyari } from './kesirModeli';
import { formatTurkishNumber } from '@/math/coordinates';
import { ilkokulUzunlukMetni } from './ilkokulKipi';
import type {
  AngleObject, ArcObject, ButtonObject, CheckboxObject, CircleObject, EllipseObject, FractionObject, InputBoxObject, LineObject, MathObject,
  MeasurementObject, PenStrokeObject, Point2D, PointObject, PolygonObject, RayObject, SectorObject, SegmentObject, SliderObject, TextObject,
} from '@/types/math';
import type { ToolMode } from '@/types/workspace';

/** İki noktaya tıklanarak kurulan temel araçlar: tıkla-tıkla akışı ve tuvaldeki lastik bant önizlemesi. */
export const IKI_NOKTALI_TEMEL_ARACLAR = ['segment', 'line', 'ray', 'circle'] as const;
export type IkiNoktaliTemelArac = (typeof IKI_NOKTALI_TEMEL_ARACLAR)[number];

export const ikiNoktaliTemelAracMi = (arac: string): arac is IkiNoktaliTemelArac =>
  (IKI_NOKTALI_TEMEL_ARACLAR as readonly string[]).includes(arac);

/** Tuvalde sürüklenerek de çizilen araçlar; kısa sürükleme (0,4 br altı) tıklama sayılır (Canvas). */
export const SURUKLEYEREK_CIZILEN_ARACLAR: readonly ToolMode[] = ['square', 'rectangle', 'circle', 'ellipse', 'segment'];

/**
 * Boş tuvale ya da bir şeklin kenarına tıklanınca önce NOKTA koyan araçlar: tıklanan yer (kenara ya da ızgaraya
 * oturtulmuş) yeni nokta olur ve aracın adımına eklenir. Klasik inşa araçları da bu yolu kullanır.
 */
export const NOKTA_URETEN_ARACLAR: readonly ToolMode[] = [
  'point',
  'segment',
  'line',
  'ray',
  'circle',
  'circle_3points',
  'arc',
  'sector',
  'angle',
  'polygon',
  'midpoint',
  'divide_ratio',
  'perp_bisector',
  'angle_bisector',
  'perpendicular',
  'parallel',
  'segment_length',
  'translate',
  'measure_slope',
  'trig_ratios',
];

/**
 * Nesne adı için nokta adlarını birleştirir ("A", "B" → "AB"). Noktalardan biri yoksa ya da adı boşsa boş metin döner:
 * kurucular o zaman aracın adına düşer ("[B]", " Merkezli Çember" gibi yarım adlar oluşmaz).
 */
export function adlariBirlestir(...noktalar: readonly (Pick<PointObject, 'label'> | undefined)[]): string {
  return noktalar.every((p) => p && p.label) ? noktalar.map((p) => p!.label).join('') : '';
}

/** Şekli Döndür aracının çevirebildiği şekiller (tam çember döndürülmez: görünüşü değişmez) */
export const DONDURULEBILIR_TURLER: readonly MathObject['type'][] = ['polygon', 'segment', 'arc', 'sector', 'ellipse'];

/** Çokgen ve ölçüm çokgeni: köşeler aynı doğru üzerindeyken (alan sıfır) kapatılmak istenince */
export const DOGRUDAS_KOSELER_IPUCU = 'Köşeler aynı doğru üzerinde; çokgen kurulamaz. Doğrunun dışına bir köşe daha ekleyin.';

/** Çokgen araçlarında bekleyen bir köşeye yeniden tıklanınca (ilk köşe ve en az üç köşe dışında) verilen ipucu */
export function bekleyenKoseIpucu(bekleyen: readonly string[], kimlik: string): string {
  return bekleyen[0] === kimlik
    ? 'Çokgeni kapatmak için en az üç köşe gerekir.'
    : 'Bu köşe zaten seçili. Şekli kapatmak için ilk köşeye dokunun.';
}

/** Yeni bağımsız nokta: tuvale tıklama, sürükleyerek çizim, köşe ve yardımcı noktalar. */
export function yeniNokta(label: string, x: number, y: number, color: string = NESNE_RENGI.mavi, createdAt: number = Date.now()): PointObject {
  return {
    id: createId('pt'),
    type: 'point',
    label,
    showLabel: true,
    x,
    y,
    color,
    visible: true,
    isIndependent: true,
    createdAt,
  };
}

/** Çokgen kaydının görünümü; ölçüler varsayılan olarak kapalı, ad görünür. */
export interface CokgenGorunumu {
  /** Dönüşümle kurulan görüntü (yansıma) */
  donusum?: 'yansima' | 'oteleme';
  label: string;
  showLabel?: boolean;
  color: string;
  fillColor: string;
  fillOpacity: number;
  showArea?: boolean;
  showPerimeter?: boolean;
  /** Çokgen ÖLÇMEK için kuruldu: silinince kullanıcının noktalarını götürmez */
  olcumSekli?: true;
  createdAt?: number;
}

/** Köşe kimliklerinden çokgen kaydı (bütün çokgen kurucuları aynı alan sırasını kullanır). */
export function cokgenKaydi(pointIds: readonly string[], g: CokgenGorunumu): PolygonObject {
  return {
    id: createId('poly'),
    type: 'polygon',
    ...(g.donusum ? { donusum: g.donusum } : {}),
    label: g.label,
    showLabel: g.showLabel ?? true,
    pointIds: [...pointIds],
    color: g.color,
    fillColor: g.fillColor,
    fillOpacity: g.fillOpacity,
    visible: true,
    showArea: g.showArea ?? false,
    showPerimeter: g.showPerimeter ?? false,
    ...(g.olcumSekli ? { olcumSekli: true as const } : {}),
    createdAt: g.createdAt ?? Date.now(),
  };
}

/** Kare aracının görünümü (tıklayıp kenar yazarak ya da sürükleyerek) */
export const KARE_GORUNUMU: CokgenGorunumu = { label: 'Kare', color: NESNE_RENGI.pembe, fillColor: NESNE_RENGI.pembe, fillOpacity: 0.18 };
/** Dikdörtgen aracının görünümü (tıklayarak 6 × 4 ya da sürükleyerek) */
export const DIKDORTGEN_GORUNUMU: CokgenGorunumu = { label: 'Dikdörtgen', color: NESNE_RENGI.kehribar, fillColor: NESNE_RENGI.kehribar, fillOpacity: 0.18 };

/** Eksenlere paralel dörtgenin köşeleri: (x1; y1), (x2; y1), (x2; y2), (x1; y2). */
export function dikdortgenKoseleri(x1: number, y1: number, x2: number, y2: number): [Point2D, Point2D, Point2D, Point2D] {
  return [
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 },
    { x: x1, y: y2 },
  ];
}

/** Köşe noktaları (verilen adlar ve renkle) ve onlardan kurulan çokgen: [köşeler…, çokgen]; tek geçmiş adımında eklenir. */
export function koseliCokgen(koseler: readonly Point2D[], adlar: readonly string[], noktaRengi: string, gorunum: CokgenGorunumu): MathObject[] {
  const pts = koseler.map((k, i) => yeniNokta(adlar[i], k.x, k.y, noktaRengi));
  return [...pts, cokgenKaydi(pts.map((p) => p.id), gorunum)];
}

/** Doğru Parçası aracının parçası (tıklayarak ya da sürükleyerek): uzunluk yazısı kapalı başlar. */
export function parcaNesnesi(startPointId: string, endPointId: string, label: string): SegmentObject {
  return {
    id: createId('seg'),
    type: 'segment',
    label,
    showLabel: true,
    startPointId,
    endPointId,
    color: NESNE_RENGI.camgobegi,
    visible: true,
    showLength: false,
    thickness: 2.5,
    createdAt: Date.now(),
  };
}

/**
 * Çember aracının çemberi: yarıçap ya bir noktayla (tıkla-tıkla) ya da sabit sayıyla (sürükleyerek) verilir.
 * Ölçüler (yarıçap, alan, çevre) hazır gelmez; sağ tık menüsü ya da komutla açılır (8 Ekim 2026).
 */
export function cemberNesnesi(
  centerPointId: string,
  label: string,
  yaricap: { radiusPointId: string } | { fixedRadius: number }
): CircleObject {
  return {
    id: createId('circ'),
    type: 'circle',
    label,
    showLabel: true,
    centerPointId,
    ...yaricap,
    color: NESNE_RENGI.mor,
    visible: true,
    fillOpacity: 0.1,
    createdAt: Date.now(),
  };
}

/**
 * Tıkla-tıkla akışında iki FARKLI noktayla kurulan şekil ve geçmiş açıklaması. Adlar noktaların adlarından gelir
 * ("[AB]", "AB Doğrusu", "AB Işını", "A Merkezli Çember"); nokta bulunamazsa ad aracın adına düşer.
 */
export function ikiNoktaliSekil(
  arac: IkiNoktaliTemelArac,
  ilkId: string,
  ikinciId: string,
  p1: PointObject | undefined,
  p2: PointObject | undefined
): { nesne: SegmentObject | LineObject | RayObject | CircleObject; aciklama: string } {
  const names = adlariBirlestir(p1, p2);

  if (arac === 'segment') {
    const label = names ? `[${names}]` : 'Doğru Parçası';
    return { nesne: parcaNesnesi(ilkId, ikinciId, label), aciklama: `${label} doğru parçası oluşturuldu` };
  }
  if (arac === 'line') {
    const label = names ? `${names} Doğrusu` : 'Doğru';
    const newLine: LineObject = {
      id: createId('line'),
      type: 'line',
      label,
      showLabel: true,
      point1Id: ilkId,
      point2Id: ikinciId,
      color: NESNE_RENGI.camgobegi,
      visible: true,
      showEquation: true,
      thickness: 2,
      createdAt: Date.now(),
    };
    return { nesne: newLine, aciklama: `${label} oluşturuldu` };
  }
  if (arac === 'ray') {
    const label = names ? `${names} Işını` : 'Işın';
    const newRay: RayObject = {
      id: createId('ray'),
      type: 'ray',
      label,
      showLabel: true,
      startPointId: ilkId,
      throughPointId: ikinciId,
      color: NESNE_RENGI.camgobegi,
      visible: true,
      thickness: 2,
      createdAt: Date.now(),
    };
    return { nesne: newRay, aciklama: `${label} oluşturuldu` };
  }
  const merkezAdi = adlariBirlestir(p1);
  const label = merkezAdi ? `${merkezAdi} Merkezli Çember` : 'Çember';
  return { nesne: cemberNesnesi(ilkId, label, { radiusPointId: ikinciId }), aciklama: `${label} oluşturuldu` };
}

/** Ölçülü Doğru Parçası: başlangıç noktasından sağa, uzunluğu verilen parça (birim br). */
export function olculuParcaNesnesi(bas: PointObject, uc: PointObject): SegmentObject {
  return {
    id: createId('seg'),
    type: 'segment',
    label: `[${bas.label}${uc.label}]`,
    showLabel: true,
    startPointId: bas.id,
    endPointId: uc.id,
    color: NESNE_RENGI.camgobegi,
    showLength: false,
    unit: 'br',
    visible: true,
    createdAt: Date.now(),
  };
}

/** Çokgen aracı: ilk köşeye dönülünce kapanan çokgen; adı köşe adlarından ("ABC Çokgeni"), bir köşe adsızsa "Çokgen". */
export function cokgenNesnesi(pointIds: readonly string[], koseAdlari: readonly (string | undefined)[]): PolygonObject {
  const names = adlariBirlestir(...koseAdlari.map((label) => (label === undefined ? undefined : { label })));
  return cokgenKaydi(pointIds, {
    label: names ? `${names} Çokgeni` : 'Çokgen',
    color: NESNE_RENGI.zumrut,
    fillColor: NESNE_RENGI.zumrut,
    fillOpacity: 0.15,
  });
}

/**
 * Alanı Bul / Çevre Hesapla aracı: köşelere tıklanarak kurulan ölçüm çokgeni; yalnız istenen ölçü (alan ya da çevre)
 * gösterilir.
 */
export function olcumCokgeni(pointIds: readonly string[], alanMi: boolean): PolygonObject {
  return cokgenKaydi(pointIds, {
    label: 'Çokgen',
    color: NESNE_RENGI.zumrut,
    fillColor: NESNE_RENGI.zumrut,
    fillOpacity: 0.2,
    showArea: alanMi,
    showPerimeter: !alanMi,
    olcumSekli: true,
  });
}

/** Alanı Bul / Çevre Hesapla: doğru parçalarıyla çevrili bölgeye basınca kurulan (adsız) ölçüm çokgeni */
export function kapaliBolgeCokgeni(pointIds: readonly string[], alanMi: boolean): PolygonObject {
  return cokgenKaydi(pointIds, {
    label: 'Kapalı bölge',
    showLabel: false,
    color: '#0d9488',
    fillColor: '#14b8a6',
    fillOpacity: 0.08,
    showArea: alanMi,
    showPerimeter: !alanMi,
    olcumSekli: true,
  });
}

/** Alanı Modelle: ızgaradan kurulan dikdörtgen; alan ve çevre açık gelir */
export const ALAN_MODELI_GORUNUMU: CokgenGorunumu = {
  label: 'Alan Modeli',
  color: '#059669',
  fillColor: '#10b981',
  fillOpacity: 0.22,
  showArea: true,
  showPerimeter: true,
};

/**
 * Düzgün Çokgen diyaloğunun köşeleri ve çokgeni. Ders kitabı düzeni: yatay tabana oturur, ilk köşe sol altta,
 * köşeler saat yönünün tersine (regularPolygonVertices). Köşeler yuvarlanmaz: eşit kenarlar eşit kalır.
 * `adlar` köşe adlarıdır (en az `kenar` tane); zaman damgaları `base`, `base + 1`, … diye sıralanır.
 */
export function duzgunCokgenNesneleri(
  kenar: number,
  yaricap: number,
  merkez: Point2D,
  adlar: readonly string[],
  label: string,
  base: number
): { koseler: PointObject[]; cokgen: PolygonObject } {
  const corners = regularPolygonVertices(kenar, yaricap, merkez);
  const koseler: PointObject[] = [];
  for (let i = 0; i < kenar; i++) {
    koseler.push(yeniNokta(adlar[i], corners[i].x, corners[i].y, NESNE_RENGI.zumrut, base + i));
  }
  const cokgen = cokgenKaydi(koseler.map((p) => p.id), {
    label,
    color: NESNE_RENGI.zumrut,
    fillColor: NESNE_RENGI.zumrut,
    fillOpacity: 0.2,
    createdAt: base + kenar,
  });
  return { koseler, cokgen };
}

/* ----------------------------------------------- İnşa ve ölçme araçları ----------------------------------------------- */

/** İki nokta isteyen inşa ve ölçme araçları (handlePointClick) */
export const IKI_NOKTALI_INSA_ARACLARI: readonly ToolMode[] = ['midpoint', 'divide_ratio', 'perp_bisector', 'measure_slope'];
/** Üç nokta isteyen inşa ve ölçme araçları (handlePointClick) */
export const UC_NOKTALI_INSA_ARACLARI: readonly ToolMode[] = ['angle_bisector', 'perpendicular', 'parallel', 'trig_ratios'];

/** Orta Dikme: [AB]'nin orta dikmesi; orta noktadan (n1) ve dikme yönündeki gizli noktadan (n2) geçer. */
export function ortaDikmeNesnesi(a: PointObject, b: PointObject, n1Id: string, n2Id: string): LineObject {
  return {
    id: createId('line'),
    type: 'line',
    label: adlariBirlestir(a, b) ? '[' + adlariBirlestir(a, b) + '] Orta Dikmesi' : 'Orta Dikme',
    insaGosterimi: { tur: 'perp_bisector', pointIds: [a.id, b.id] },
    showLabel: true,
    point1Id: n1Id,
    point2Id: n2Id,
    color: NESNE_RENGI.zumrut,
    visible: true,
    createdAt: Date.now(),
  };
}

/** Açıortay: a bir kol, b KÖŞE, c diğer kol; köşeden açıortay yönündeki gizli noktaya (n2) ışın. */
export function aciortayNesnesi(a: PointObject, b: PointObject, c: PointObject, n2Id: string): RayObject {
  return {
    id: createId('ray'),
    type: 'ray',
    label: adlariBirlestir(a, b, c) ? adlariBirlestir(a, b, c) + ' Açıortayı' : 'Açıortay',
    insaGosterimi: { tur: 'angle_bisector', pointIds: [a.id, b.id, c.id] },
    showLabel: true,
    startPointId: b.id,
    throughPointId: n2Id,
    color: NESNE_RENGI.kehribar,
    visible: true,
    createdAt: Date.now(),
  };
}

/** Dik / Paralel Doğru: a, b doğrultuyu verir; doğru c'den ve gizli noktadan (n2) geçer. Yalnız dik doğru inşa gösterimi taşır. */
export function dikVeyaParalelDogruNesnesi(
  tur: 'perpendicular' | 'parallel',
  a: PointObject,
  b: PointObject,
  c: PointObject,
  n2Id: string
): LineObject {
  return {
    id: createId('line'),
    type: 'line',
    label:
      adlariBirlestir(a, b, c)
        ? (tur === 'perpendicular' ? 'Dik doğru: ' : 'Paralel doğru: ') + c.label + ' / ' + a.label + b.label
        : tur === 'perpendicular' ? 'Dik Doğru' : 'Paralel Doğru',
    ...(tur === 'perpendicular' ? { insaGosterimi: { tur: 'perpendicular' as const, pointIds: [a.id, b.id, c.id] } } : {}),
    showLabel: true,
    point1Id: c.id,
    point2Id: n2Id,
    color: NESNE_RENGI.mavi,
    visible: true,
    createdAt: Date.now(),
  };
}

/** Eğim Ölç ve Trig. Oranlar: sonuç geçici ipucunda kaybolmasın diye tuvalde kalıcı, CANLI ölçüm etiketi. */
export function olcumEtiketiNesnesi(kind: 'slope' | 'trig', label: string, pointIds: string[], color: string): MeasurementObject {
  return {
    id: createId('olc'),
    type: 'measurement',
    kind,
    label,
    showLabel: true,
    pointIds,
    showValue: true,
    color,
    visible: true,
    createdAt: Date.now(),
  };
}

/* --------------------------------------------- Çember araçları ve açılar --------------------------------------------- */

/** Yarıçapla Çember ve Pergel: sabit yarıçaplı, içi boş çember */
export function sabitYaricapliCemberNesnesi(centerPointId: string, label: string, fixedRadius: number): CircleObject {
  return {
    id: createId('circ'),
    type: 'circle',
    label,
    showLabel: true,
    centerPointId,
    fixedRadius,
    color: NESNE_RENGI.mor,
    fillOpacity: 0,
    visible: true,
    createdAt: Date.now(),
  };
}

/** Sürüklenen kutuya içten teğet elipsin merkezi (0,1 br'ye yuvarlanır; önizleme ve oluşan elips aynı merkezi kullanır) */
export const elipsMerkezi = (x1: number, y1: number, dx: number, dy: number): Point2D => ({
  x: Number((x1 + dx / 2).toFixed(1)),
  y: Number((y1 + dy / 2).toFixed(1)),
});

/** Elips aracı (sürükleyerek ya da tıklayarak): merkez noktası ve yarıçapları verilen elips; ölçüler kapalı başlar */
export function elipsNesneleri(merkez: Point2D, radiusX: number, radiusY: number, merkezAdi: string): [PointObject, EllipseObject] {
  const nokta = yeniNokta(merkezAdi, merkez.x, merkez.y, NESNE_RENGI.camgobegi);
  const elips: EllipseObject = {
    id: createId('elp'),
    type: 'ellipse',
    label: `${merkezAdi} Merkezli Elips`,
    showLabel: true,
    centerPointId: nokta.id,
    radiusX,
    radiusY,
    color: NESNE_RENGI.camgobegi,
    fillColor: NESNE_RENGI.camgobegi,
    fillOpacity: 0.12,
    visible: true,
    showArea: false,
    showPerimeter: false,
    createdAt: Date.now(),
  };
  return [nokta, elips];
}

/** Pergelle çizilen yay (her zaman saat yönünün tersine kaydedilir); yay uzunluğu açık gelir */
export function pergelYayiNesnesi(centerPointId: string, startPointId: string, directionPointId: string, label: string): ArcObject {
  return {
    id: createId('arc'),
    type: 'arc',
    label,
    showLabel: true,
    centerPointId,
    startPointId,
    directionPointId,
    thickness: 3,
    color: NESNE_RENGI.mor,
    showArcLength: true,
    visible: true,
    createdAt: Date.now(),
  };
}

/** 3 Noktalı Çember: üç noktadan geçen (çevrel) çember; merkez noktası yoktur, içi boş. */
export function ucNoktaliCemberNesnesi(a: PointObject, b: PointObject, c: PointObject): CircleObject {
  return {
    id: createId('circ'),
    type: 'circle',
    label: adlariBirlestir(a, b, c) ? `${adlariBirlestir(a, b, c)} Çemberi` : '3 Noktalı Çember',
    showLabel: true,
    centerPointId: '',
    throughPointIds: [a.id, b.id, c.id],
    color: NESNE_RENGI.mor,
    fillOpacity: 0,
    visible: true,
    createdAt: Date.now(),
  };
}

/**
 * Yay ve Daire Dilimi: merkez a, başlangıç b; c yalnız AÇIYI verir (yarıçap |ab|), saat yönünün tersine. Merkez açı ve
 * ölçüler kapalı başlar.
 */
export function yayVeyaDilimNesnesi(tur: 'arc' | 'sector', a: PointObject, b: PointObject, c: PointObject): ArcObject | SectorObject {
  const ortak = {
    centerPointId: a.id,
    startPointId: b.id,
    directionPointId: c.id,
    visible: true,
    showLabel: true,
    showCentralAngle: false,
    createdAt: Date.now(),
  };
  return tur === 'arc'
    ? ({
        ...ortak,
        id: createId('arc'),
        type: 'arc',
        label: adlariBirlestir(b, c) ? `${adlariBirlestir(b, c)} Yayı` : 'Yay',
        color: NESNE_RENGI.camgobegi,
        thickness: 3,
        showArcLength: false,
      } as ArcObject)
    : ({
        ...ortak,
        id: createId('sect'),
        type: 'sector',
        label: adlariBirlestir(a) ? `${adlariBirlestir(a)} Daire Dilimi` : 'Daire Dilimi',
        color: NESNE_RENGI.zumrut,
        fillColor: NESNE_RENGI.zumrut,
        fillOpacity: 0.4,
        showArea: false,
      } as SectorObject);
}

/**
 * Yayın / dilimin bitiş noktası için yayın ÜZERİNDEKİ konum: c ile aynı açıda, |merkez-başlangıç| yarıçapında.
 * Yarıçap ya da merkez uzaklığı sıfırsa null.
 */
export function yayUstundeKonum(merkez: Point2D, baslangic: Point2D, nokta: Point2D): Point2D | null {
  const yaricap = calculateDistance(merkez, baslangic);
  const dx = nokta.x - merkez.x;
  const dy = nokta.y - merkez.y;
  const uz = Math.hypot(dx, dy);
  if (!(uz > 1e-9 && yaricap > 1e-9)) return null;
  return {
    x: Number((merkez.x + (dx / uz) * yaricap).toFixed(10)),
    y: Number((merkez.y + (dy / uz) * yaricap).toFixed(10)),
  };
}

/**
 * Açı Oluştur: açı ve kolları (köşeden iki noktaya parça). Kollar açının kimliğini taşır: açı silinince (başka nesne
 * kullanmıyorsa) kolları da gider, turuncu çizgiler sahipsiz kalmaz. Noktalar bulunamazsa adlar "Açı" / "Açı Kolu"dur.
 */
export function aciVeKollari(
  p1Id: string,
  koseId: string,
  p3Id: string,
  p1: PointObject | undefined,
  kose: PointObject | undefined,
  p3: PointObject | undefined
): { kollar: [SegmentObject, SegmentObject]; aci: AngleObject } {
  const angleId = createId('ang');
  const kol = (uc: PointObject | undefined, ucId: string): SegmentObject => ({
    id: createId('seg'),
    type: 'segment',
    label: adlariBirlestir(kose, uc) ? `[${adlariBirlestir(kose, uc)}]` : 'Açı Kolu',
    showLabel: false,
    startPointId: koseId,
    endPointId: ucId,
    color: NESNE_RENGI.kehribar,
    visible: true,
    thickness: 2,
    armOfAngleId: angleId,
    createdAt: Date.now(),
  });
  const kollar: [SegmentObject, SegmentObject] = [kol(p1, p1Id), kol(p3, p3Id)];
  const aci: AngleObject = {
    id: angleId,
    type: 'angle',
    label: adlariBirlestir(p1, kose, p3) ? `∠${adlariBirlestir(p1, kose, p3)}` : 'Açı',
    showLabel: true,
    point1Id: p1Id,
    vertexPointId: koseId,
    point3Id: p3Id,
    color: NESNE_RENGI.kehribar,
    visible: true,
    showValue: false,
    createdAt: Date.now(),
  };
  return { kollar, aci };
}

/** Aynı açı mı: köşe aynı, kollar iki sıradan birinde. Açı ölçme yolları aynı açıyı ikinci kez kurmaz. */
export const ayniAciMi = (o: MathObject, koseId: string, p1Id: string, p3Id: string): o is AngleObject =>
  o.type === 'angle' &&
  o.vertexPointId === koseId &&
  ((o.point1Id === p1Id && o.point3Id === p3Id) || (o.point1Id === p3Id && o.point3Id === p1Id));

/** Açıölçer: tuvalde kalan, kaynak noktalarla güncellenen ölçülmüş açı (ölçüm şekli) */
export function olculenAciNesnesi(p1: PointObject, kose: PointObject, p3: PointObject): AngleObject {
  return { id: createId('ang'), type: 'angle', label: adlariBirlestir(p1, kose, p3) ? `∠${adlariBirlestir(p1, kose, p3)}` : 'Açı',
    showLabel: true, point1Id: p1.id, vertexPointId: kose.id, point3Id: p3.id,
    showValue: true, visible: true, color: NESNE_RENGI.kehribar, createdAt: Date.now(), olcumSekli: true };
}

/** Uzunluk Ölç / Birimle Ölç: iki nokta arasında uzunluğu yazılı ölçüm parçası ("|AB|") */
export function olcumParcasiNesnesi(startPointId: string, endPointId: string, label: string, unit: 'cm' | 'br', cmMi: boolean): SegmentObject {
  return {
    id: createId('seg'),
    type: 'segment',
    label,
    showLabel: true,
    unit,
    startPointId,
    endPointId,
    color: cmMi ? NESNE_RENGI.camgobegi : NESNE_RENGI.zumrut,
    visible: true,
    showLength: true,
    thickness: 3,
    createdAt: Date.now(),
  };
}

/* ----------------------------------------------- Etkileşim ve kesir araçları ----------------------------------------------- */

/** Etkileşim araçlarının (işaret kutusu, düğme, girdi kutusu) yeri: tıklanan konum, 0,01 br'ye yuvarlanır (ızgaraya oturmaz) */
export const etkilesimKonumu = (p: Point2D): Point2D => ({ x: Number(p.x.toFixed(2)), y: Number(p.y.toFixed(2)) });

/** Girdi Kutusu: TEK bir kaydırıcıya (değeri) ya da fonksiyona (ifadesi) bağlanır */
export function girdiKutusuNesnesi(konum: Point2D, hedef: MathObject): InputBoxObject {
  return {
    id: createId('inp'),
    type: 'input_box',
    label: hedef.type === 'slider' ? `${(hedef as SliderObject).variableName} =` : 'f(x) =',
    showLabel: true,
    x: konum.x,
    y: konum.y,
    targetId: hedef.id,
    field: hedef.type === 'slider' ? 'value' : 'expression',
    width: hedef.type === 'slider' ? 90 : 170,
    color: NESNE_RENGI.zumrut,
    visible: true,
    createdAt: Date.now(),
  };
}

/** İşaret Kutusu: seçili nesneleri gösterip gizler (kutu kapanınca nesneler gizlenir, silinmez) */
export function isaretKutusuNesnesi(konum: Point2D, hedefler: string[]): CheckboxObject {
  return {
    id: createId('chk'),
    type: 'checkbox',
    label: `${hedefler.length} nesneyi göster`,
    showLabel: true,
    x: konum.x,
    y: konum.y,
    targetIds: hedefler,
    checked: true,
    color: NESNE_RENGI.mavi,
    visible: true,
    createdAt: Date.now(),
  };
}

/** Düğme: seçimde kaydırıcı varsa onların canlandırmasını başlatıp durdurur, yoksa seçili nesneleri gösterip gizler */
export function dugmeNesnesi(konum: Point2D, hedefler: string[], kaydiricilar: string[]): ButtonObject {
  return {
    id: createId('btn'),
    type: 'button',
    label: kaydiricilar.length > 0 ? 'Oynat / Durdur' : 'Göster / Gizle',
    showLabel: true,
    x: konum.x,
    y: konum.y,
    action:
      kaydiricilar.length > 0
        ? { kind: 'animate', sliderIds: kaydiricilar }
        : { kind: 'toggle', targetIds: hedefler },
    color: NESNE_RENGI.indigo,
    visible: true,
    createdAt: Date.now(),
  };
}

/** Kesir Göster: kesir çubuğunun ayarıyla (pay, payda, model; kademeye göre sınırlanmış) kesir modeli */
export function kesirModeliNesnesi(konum: Point2D, kesir: KesirAyari): FractionObject {
  return {
    id: createId('frac'),
    type: 'fraction',
    label: kesirEtiketi(kesir.pay, kesir.payda),
    showLabel: true,
    numerator: kesir.pay,
    denominator: kesir.payda,
    x: konum.x,
    y: konum.y,
    radius: 2.5,
    modelType: kesir.model,
    color: NESNE_RENGI.mor,
    visible: true,
    createdAt: Date.now(),
  };
}

/* ------------------------------------------------- Dönüşüm araçları ------------------------------------------------- */

/**
 * Şekli Döndür: noktanın `merkez` çevresinde `derece` (saat yönünün tersine pozitif) döndürülmüş konumu; 0,01 br'ye
 * yuvarlanır. Hazır derece düğmeleri, ilkokul canlandırması ve serbest döndürme kolu aynı hesabı kullanır.
 */
export function dondurulmusKonum(p: Point2D, merkez: Point2D, derece: number): Point2D {
  const r = (derece * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = p.x - merkez.x;
  const dy = p.y - merkez.y;
  return { x: Number((merkez.x + dx * cos - dy * sin).toFixed(2)), y: Number((merkez.y + dx * sin + dy * cos).toFixed(2)) };
}

/** Elipsin döndürülmüş açısı: [0, 360) aralığında, 0,01°'ye yuvarlanmış (elips noktayla değil açıyla döner) */
export const elipsDonusAcisi = (baslangic: number, derece: number): number =>
  Number(((((baslangic + derece) % 360) + 360) % 360).toFixed(2));

/** Yansıt: çokgenin yansıması (mor; ölçüler kapalı) */
export function yansimaCokgeni(pointIds: readonly string[], kaynakAdi: string | undefined): PolygonObject {
  return cokgenKaydi(pointIds, {
    donusum: 'yansima',
    label: `${kaynakAdi || 'Çokgen'} Yansıması`,
    color: NESNE_RENGI.mor,
    fillColor: NESNE_RENGI.mor,
    fillOpacity: 0.2,
  });
}

/** Sürükleyerek çizimde ölçülerin yuvarlandığı basamak: 0,1 br (önizleme de aynı değeri yazar). */
export const birOndalik = (v: number): number => Number(v.toFixed(1));

/**
 * Sürükleyerek çizimde uzunluk / yarıçapın yuvarlanması: tam sayı ölçüde (ilkokul hep) tam birim, en az 1 ("r = 5,8 br"
 * değil "r = 6 br"; alan uzmanı, 21.10.2026); diğerlerinde 0,1 br. Çember ve doğru parçası aynı kuralı kullanır.
 */
export const surukleUzunlugu = (uzaklik: number, tamSayi: boolean): number =>
  tamSayi ? Math.max(1, Math.round(uzaklik)) : birOndalik(uzaklik);

/** Sürükleyerek çizilen çemberin yarıçapı; önizleme ve oluşan çember aynı değeri kullanır. */
export const surukleCemberYaricapi = surukleUzunlugu;

/**
 * Sürükleyerek çizilen parçanın uç noktası: önizlemede gösterilen yuvarlanmış uzunluğa oturtulur (kare / dikdörtgen /
 * çemberle tutarlı). Izgaraya Yapış açıkken uç nokta ızgarada kalmalıdır, o yüzden dokunulmaz.
 */
export function surukleParcaUcu(bas: Point2D, son: Point2D, uzaklik: number, izgaraya: boolean | undefined, tamSayi = false): Point2D {
  if (izgaraya) return son;
  const hedefUzunluk = surukleUzunlugu(uzaklik, tamSayi);
  return {
    x: bas.x + ((son.x - bas.x) / uzaklik) * hedefUzunluk,
    y: bas.y + ((son.y - bas.y) / uzaklik) * hedefUzunluk,
  };
}

/** Sürükleyerek çizilen parçanın önizlemede yazılan uzunluğu (uç noktasıyla aynı kural; ızgarada gerçek uzunluk). */
export const surukleParcaUzunlugu = (uzaklik: number, izgaraya: boolean | undefined, tamSayi = false): number =>
  izgaraya ? (tamSayi ? Math.round(uzaklik) : uzaklik) : surukleUzunlugu(uzaklik, tamSayi);

/**
 * Tıkla-tıkla akışındaki lastik bant önizlemesinin uzunluk yazısı: tuvaldeki ölçülerle aynı kural. İlkokulda tam sayı ve
 * "yaklaşık", tam sayı ölçüde tam sayı ('≈' yazılmaz), diğerlerinde 2 ondalık.
 */
export function onizlemeUzunlugu(uzaklik: number, secenek: { ilkokul: boolean; tamSayi: boolean }): string {
  if (secenek.ilkokul) return ilkokulUzunlukMetni(uzaklik, 'br');
  return `${formatTurkishNumber(secenek.tamSayi ? Math.round(uzaklik) : uzaklik)} br`;
}

/** Kalemle çizilen serbest çizgi: pembe, 3 px, adı gizli */
export function kalemCizgisi(noktalar: Point2D[]): PenStrokeObject {
  return {
    id: createId('pen'),
    type: 'pen',
    label: 'Serbest Çizim',
    showLabel: false,
    points: noktalar,
    thickness: 3,
    color: NESNE_RENGI.pembe,
    visible: true,
    createdAt: Date.now(),
  };
}

/** Metin notu: adı yazının ilk 20 harfi */
export function notNesnesi(metin: string, konum: Point2D, renk: string, boy: number): TextObject {
  return {
    id: createId('txt'),
    type: 'text',
    label: metin.slice(0, 20),
    showLabel: true,
    text: metin,
    x: konum.x,
    y: konum.y,
    fontSize: boy,
    color: renk,
    visible: true,
    createdAt: Date.now(),
  };
}
