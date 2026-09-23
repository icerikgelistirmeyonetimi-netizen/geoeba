'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useWorkspace, createId, DEFAULT_ZOOM } from '@/state/WorkspaceContext';
import { useCurriculum } from '@/state/CurriculumContext';
import {
  MathObject,
  PointObject,
  SegmentObject,
  LineObject,
  RayObject,
  CircleObject,
  ArcObject,
  SectorObject,
  AngleObject,
  PolygonObject,
  FunctionObject,
  SliderObject,
  FractionObject,
  PenStrokeObject,
  TextObject,
  ImageObject,
  Point2D,
  EllipseObject,
  CheckboxObject,
  ButtonObject,
  InputBoxObject,
  MeasurementObject,
  MeasurementKind,
  MeasurementLabelAnchor,
  edgeLabelKey,
} from '@/types/math';
import {
  worldToScreen,
  screenToWorld,
  snapToGridPoint,
  snapPointToGrid,
  visibleGridStep,
  isometricSide,
  getVisibleWorldBounds,
  getAdaptiveGridStep,
  formatTurkishNumber,
  formatCoordinate,
} from '@/math/coordinates';
import { MeasurementInstruments } from './MeasurementInstruments';
import { ToolCursor } from './ToolCursor';
import { TextNoteDialog } from './TextNoteDialog';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { secimBasligi } from './secimBasligi';
import { useSliderPlayback } from '@/hooks/useSliderPlayback';
import { Solid3DObject, Point3D } from '@/types/workspace3d';
import { projectSolidFor2D, SolidProjectionMode } from '@/math/solidProjection2D';

/** Etiketi olmayan nesneler için menü başlığında gösterilecek tür adları. */
const TYPE_LABELS: Record<string, string> = {
  point: 'Nokta',
  segment: 'Doğru Parçası',
  line: 'Doğru',
  ray: 'Işın',
  circle: 'Çember',
  ellipse: 'Elips',
  arc: 'Yay',
  sector: 'Daire Dilimi',
  angle: 'Açı',
  polygon: 'Çokgen',
  function: 'Fonksiyon',
  slider: 'Sürgü',
  fraction: 'Kesir Modeli',
  pen: 'Serbest Çizim',
  text: 'Metin Notu',
  image: 'Görsel',
};
import { isAnyModalOpen } from '@/components/ui/modalState';
import { objectDependencies, planDeletion } from '@/state/WorkspaceContext';
import { RotateGizmo } from '@/components/workspace/RotateGizmo';
import {
  CanvasCheckbox,
  CanvasButton,
  CanvasInputBox,
  sliderDegerMetni,
} from '@/components/workspace/CanvasWidgets';
import {
  calculateDistance,
  findNearestEdgeIndex,
  calculateAngleDegrees,
  calculatePolygonArea,
  calculatePolygonPerimeter,
  calculateLineEquation,
  calculateCircleArea,
  calculateCircleCircumference,
  calculateEllipseArea,
  calculateEllipsePerimeter,
  calculateSlope,
  rightTriangleRatios,
  angleTrigRatios,
  calculateCircumcircle,
  intersectLines,
  intersectLineCircle,
  intersectCircles,
  intersectLineEllipse,
  closestPointOnPolygonEdge,
  distanceToSegment,
  getArcGeometry,
  calculateArcLength,
  calculateSectorArea,
  reflectPointAcrossLine,
  generateNextPointLabels,
} from '@/math/geometry';
import { compileMathExpression } from '@/math/parser';
import { copyObjects, pasteObjects, ObjectClipboard } from '@/math/objectClipboard';
import { workspaceOwnsKeyboard } from './toolShortcuts';
import { contextMenuSelection } from './contextMenuSelection';
import { contextMenuTargets } from './contextMenuTargets';
import { labelAnchorPointIds, shapeAnchorCenter, anchoredLabelPosition } from '@/math/labelAnchors';
import { LABEL_LAYOUT_ZOOM, labelLayoutViewport, labelZoomScale, projectLabelPoint } from '@/math/labelViewport';
import { etiketHizalama } from './etiketHizalama';
import { pointLockCandidates, isPointLocked } from '@/math/pointLock';
import { birlestirmeMaddesi, birlestirmeToleransi, ustUsteNoktalar } from '@/math/noktaBirlestir';
import { ACI_MENU_SINIRI, noktadakiAcilar, pointAngleAction, type NoktaAcisi } from '@/math/pointAngles';
import {
  arcBadgeTitle, arcDetachedText, arcFlipLabel, arcOptionsForCircle, arcOptionsForPair, arcOptionsForPoint, arcUnresolvedText, arcValueText, circleGeometryOf,
  flipArcMeasurement, isArcMeasurement, resolveArc, YAY_MENU_SINIRI, YAY_OLCUMU_RENGI, type ArcMeasurement, type ArcPairOption,
} from '@/math/arcMeasure';
import {
  etiketSilAraciylaSilinirMi,
  etiketSilindiIpucu,
  etiketTiklamaEylemi,
  uzunBasisMi,
} from '@/math/measurementLabelClick';
import {
  distanceLabelLevel,
  isLengthShown,
  lengthOptionsAtPoint,
  samePair,
  straightEnds,
  straightLengthOptions,
  type LengthOption,
} from '@/math/partialLengths';
import {
  Grid,
  Contrast,
  RotateCcw,
  RotateCw,
  Hand,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Trash2,
  Search,
  Settings,
  Check,
  Grid3x3,
  Magnet,
  SquareMousePointer,
} from 'lucide-react';
import { EksenSimgesi, IzgaraSimgesi } from './GrafikMenuSimgeleri';
import { temaZemini, zeminTonu } from './zeminTonu';
import { eksenSayilariniYerlestir, tuvalEngelleri, type EksenCentigi } from './eksenSayilari';
import { useTheme } from '@/state/ThemeContext';
import { KayanCubuk, CubukMetni, CubukAyirici, CubukDugmesi } from './KayanCubuk';
import { aracYonergesi } from './aracYonergeleri';
import { aciEtiketiUzakta, cizgiEtiketiUzakta, etiketAcisi, etiketDondurme, yayEtiketiYerlesimi, type YayEtiketGeometrisi } from './olcuEtiketi';
import { MatematikEtiketi, type EtiketRengi, type KutuStili } from './MatematikEtiketi';
import {
  type Dugum, type Olcu, aciklama, egim, koordinat, metniCozumle, olcuDugumleri, sesli, uzunluk, yazimAyari,
} from '@/math/matematikYazimi';
import {
  type Kutu, type KutuOlcusu, type Nokta, type RozetAdayi, aciRozetiYerlesimi, kutuOlcusu,
} from '@/math/yazimDuzeni';
import {
  type OlcumKarti, aciGrubu, aciOlcusu, kenarUzunlugu, noktaBulucu, olcumKartKutulari, segmentUzunlugu,
  trigSatirlari, yayGeometrisi, yayMerkezAcisi, yayOlcumuYazimi, yayOlculeri, yazimlar,
} from '@/math/olcuYazimlari';
import { esitlikIsaretleri, esitlikYamalariniUygula } from '@/math/esitlikIsaretleri';
import { EsitlikIsaretleriKatmani, esitlikMenuMaddeleri, esitUzunluklarMaddesi } from './EsitlikIsaretleri';
import { etiketPayi } from './esitlikCizimi';
import { imlecDegeri, imlecSinifi } from './imlecSiniflari';
import { gorunumKaydirmaBasisiMi, kaydirmaDisiHedefMi, nesneBasisiIslenmeli } from './gorunumKaydirma';
import { noktaAdiYeri, noktaEngelleri } from './noktaAdi';
import { Box, FlipHorizontal2, Info, Lightbulb, MousePointer2, Pentagon, X as CarpiSimgesi } from 'lucide-react';

// Derlenmiş fonksiyon ifadeleri önbelleği (ifade başına tek derleme)
const compiledExpressionCache = new Map<string, ((x: number, scope?: Record<string, number>) => number) | null>();
const getCompiledExpression = (expression: string) => {
  if (compiledExpressionCache.has(expression)) return compiledExpressionCache.get(expression) ?? null;
  let compiled: ((x: number, scope?: Record<string, number>) => number) | null = null;
  try {
    compiled = compileMathExpression(expression);
  } catch (e) {
    compiled = null;
  }
  if (compiledExpressionCache.size > 200) compiledExpressionCache.clear();
  compiledExpressionCache.set(expression, compiled);
  return compiled;
};

// Çoklu Seçim Kutusu ile Kesişim / İçerilme Kontrolü
const isObjectInMarquee = (
  obj: MathObject,
  pointsById: Map<string, PointObject>,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number
): boolean => {
  const inside = (p: Point2D | undefined) =>
    !!p && p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;

  if (obj.type === 'point') {
    return inside(obj as PointObject);
  }
  if (obj.type === 'ellipse') {
    return inside(pointsById.get((obj as EllipseObject).centerPointId));
  }
  if (obj.type === 'arc' || obj.type === 'sector') {
    // Yay ve daire dilimi merkezinden yakalanır; üç tanım noktasından biri kutuya girse de yeter
    const sh = obj as ArcObject | SectorObject;
    return [sh.centerPointId, sh.startPointId, sh.directionPointId].some((id) =>
      inside(pointsById.get(id))
    );
  }
  if (obj.type === 'polygon') {
    const poly = obj as PolygonObject;
    const pts = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
    if (pts.length === 0) return false;
    if (pts.some(inside)) return true;
    const avgX = pts.reduce((acc, p) => acc + p.x, 0) / pts.length;
    const avgY = pts.reduce((acc, p) => acc + p.y, 0) / pts.length;
    return inside({ x: avgX, y: avgY });
  }
  if (obj.type === 'segment') {
    const seg = obj as SegmentObject;
    const p1 = pointsById.get(seg.startPointId);
    const p2 = pointsById.get(seg.endPointId);
    if (!p1 || !p2) return false;
    return inside(p1) || inside(p2) || inside({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
  }
  if (obj.type === 'line') {
    const line = obj as LineObject;
    return inside(pointsById.get(line.point1Id)) || inside(pointsById.get(line.point2Id));
  }
  if (obj.type === 'ray') {
    const ray = obj as RayObject;
    return inside(pointsById.get(ray.startPointId)) || inside(pointsById.get(ray.throughPointId));
  }
  if (obj.type === 'circle') {
    const circ = obj as CircleObject;
    return inside(pointsById.get(circ.centerPointId));
  }
  if (obj.type === 'angle') {
    const ang = obj as AngleObject;
    return inside(pointsById.get(ang.vertexPointId));
  }
  if (obj.type === 'text') {
    const txt = obj as TextObject;
    return txt.x >= minX && txt.x <= maxX && txt.y >= minY && txt.y <= maxY;
  }
  if (obj.type === 'fraction') {
    const frac = obj as FractionObject;
    return frac.x >= minX && frac.x <= maxX && frac.y >= minY && frac.y <= maxY;
  }
  if (obj.type === 'image') {
    const img = obj as ImageObject;
    return img.x >= minX && img.x <= maxX && img.y >= minY && img.y <= maxY;
  }
  if (obj.type === 'pen') {
    const pen = obj as PenStrokeObject;
    return pen.points.some((p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
  }
  return false;
};

interface CanvasProps {
  onSwitchTo3D?: () => void;
  solids?: Solid3DObject[];
  selectedSolidId?: string | null;
  selectedSolidIds?: string[];
  onSelectSolid?: (id: string | null) => void;
  onSelectSolids?: (ids: string[]) => void;
  onUpdateSolidPosition?: (id: string, pos: Point3D) => void;
  onDeleteSolid?: (id: string) => void;
  /** Birden çok cismi TEK geçmiş adımıyla siler (2B seçim çubuğu). Yoksa onDeleteSolid tek tek çağrılır. */
  onDeleteSolids?: (ids: string[]) => void;
  onDragEnd?: () => void;
}

export function Canvas({
  onSwitchTo3D,
  solids = [],
  selectedSolidId = null,
  selectedSolidIds = [],
  onSelectSolid,
  onSelectSolids,
  onUpdateSolidPosition,
  onDeleteSolid,
  onDeleteSolids,
  onDragEnd,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  /** 2B seçim çubuğunun saydığı/sildiği 3B cisimler */
  const seciliCisimler = selectedSolidIds.length > 0 ? selectedSolidIds : selectedSolidId ? [selectedSolidId] : [];

  const { selectedLevel, selectedGrade, isFreeSandbox, selectedActivity } = useCurriculum();
  const isPrimary = selectedLevel?.id === 'ilkokul' || (selectedGrade && selectedGrade.gradeNumber <= 4);

  const {
    objectClipboard, setObjectClipboard,
    objects,
    selectedObjectId,
    selectedObjectIds,
    activeTool,
    setActiveTool,
    viewport,
    pendingPointIds,
    setViewport,
    setSelectedObjectId,
    setSelectedObjectIds,
    handlePointClick,
    handleCanvasClick,
    deleteObject,
    deleteObjects,
    moveObjects,
    recordHistory,
    addObject,
    addObjects,
    updateObject,
    commit,
    studioDimension,
    setStudioDimension,
    undo,
    redo,
    canUndo,
    canRedo,
    cancelPendingAction,
    requestClearAll,
    hintMessage,
    setHintMessage,
    isConfirmClearOpen,
    isRegularPolygonDialogOpen,
    handleSliderChange,
    setSliderValues,
    measureLength,
    measureArea,
    measurePerimeter,
    measureAngleAtPoint,
    measureArcAngle,
    hideMeasurement,
    setLabelOffset,
    measureArcLength,
    measureArcBetween,
    styleSettings,
    splitPolygon,
    splitSegmentAtPoint,
    splitCircleAtPoints,
    splitArcAtPoint,
    toggleCheckbox,
    runButton,
    applyInputBox,
    connectPoints,
    disconnectPoints,
    mergePoints,
    fitPolynomialToPoints,
    togglePolygonEdgeLabel,
    setAllPolygonEdgeLabels,
    toggleAngleReflex,
    setSegmentLength,
    setAngleDegrees,
    bindAngleToSlider,
    unbindAngleFromSlider,
    setCircleRadius,
    setLengthMeasurement,
  } = useWorkspace();

  // Görsel dosyası seçimi (Görsel Ekle aracı)
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageWorldPosRef = useRef<Point2D | null>(null);

  // 2B'de izdüşümü gösterilen 3B cisme sağ tıklanınca açılan menü
  const [cisimMenusu, setCisimMenusu] = useState<{ solidId: string; ad: string; x: number; y: number } | null>(null);

  // Sağ tık bağlam menüsü hedefi (nesne + ekran konumu)
  const [contextTarget, setContextTarget] = useState<{
    obj: MathObject | null;
    x: number;
    y: number;
    /** Çokgene sağ tıklandıysa imlece EN YAKIN kenarın dizini (yoksa null). */
    edgeIndex: number | null;
    /** Bir iz çizgisine (İzi Göster) sağ tıklandıysa o izin sahibi nesnenin kimliği */
    izId?: string;
    /** İmlecin ALTINDAKİ bütün nesneler (üstten alta). Birden çoksa menü başlığı sekmelere döner. */
    adaylar?: MathObject[];
  } | null>(null);
  // Dokunmatik uzun basma durumu
  const longPressRef = useRef<{ timer: number; startX: number; startY: number; obj: MathObject } | null>(null);

  // Yazı / Metin Notu Düzenleme Durumu
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [editingTextObj, setEditingTextObj] = useState<TextObject | null>(null);
  const [pendingTextWorldPos, setPendingTextWorldPos] = useState<Point2D | null>(null);

  // Sürükleme ve Kaydırma (Pan/Drag) Durumları
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  /**
   * Son basışı el aracı (ya da orta tuş / Alt) yuttu mu?
   * Kaydırma bitince gelen `click` / `dblclick` işaret kutusunu değiştirmesin,
   * düğmeyi çalıştırmasın, etiketi gizlemesin diye tutulur (gorunumKaydirma.ts).
   */
  const kaydirmaYuttuRef = useRef(false);
  const [draggingObjState, setDraggingObjState] = useState<{
    objectIds: string[];
    startWorld: Point2D;
    lastWorld: Point2D;
    hasMoved: boolean;
    // Izgaraya yapıştırma için referans (çapa) nokta: sürüklenen ilk noktanın kimliği ve tutma ofseti
    anchorId: string | null;
    anchorOffset: Point2D;
    /** Çapanın kilit olmasaydı bulunacağı yer (son hedef): seçimin geri kalanı farenin gerçek adımını buradan alır. */
    virtualAnchor?: Point2D | null;
  } | null>(null);

  const [draggingSolidState, setDraggingSolidState] = useState<{
    solidId: string;
    startWorld: Point2D;
    initialPos: Point3D;
    hasMoved: boolean;
  } | null>(null);
  const [solidProjectionMode, setSolidProjectionMode] = useState<SolidProjectionMode>('top');
  const [selectionMarquee, setSelectionMarquee] = useState<{
    startWorld: Point2D;
    currentWorld: Point2D;
    // Shift/Ctrl ile başlatılan kutu seçiminde korunacak mevcut seçim
    baseIds: string[];
  } | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState<Point2D>({ x: 0, y: 0 });
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Sürükleyerek Şekil Boyutlandırma ve Oluşturma Durumu
  const [dragCreateStart, setDragCreateStart] = useState<Point2D | null>(null);

  const [dragCreateCurrent, setDragCreateCurrent] = useState<Point2D | null>(null);
  const [rotatingFeedback, setRotatingFeedback] = useState<{ shapeId: string; deg: number } | null>(null);
  const [reflectTargetPolyId, setReflectTargetPolyId] = useState<string | null>(null);
  const [reflectAxisLine, setReflectAxisLine] = useState<{ id: string; p1: Point2D; p2: Point2D; name: string } | null>(null);

  // Serbest Çizim (Kalem) Durumu
  const [isDrawingPen, setIsDrawingPen] = useState(false);
  const [currentPenStroke, setCurrentPenStroke] = useState<Point2D[]>([]);

  // Ayrıntı görünümü (Ayrıntılı / Sade): sağ tık menüsünden ve yazılı komuttan seçilir
  const [styleMode, setStyleMode] = useState<'Sade' | 'Ayrıntılı'>('Ayrıntılı');

  useEffect(() => {
    const show = () => setStyleMode('Ayrıntılı');
    window.addEventListener('geoeba:show-measurements', show);
    return () => window.removeEventListener('geoeba:show-measurements', show);
  }, []);

  // Yazılı komut: "sade görünüm" / "ayrıntılı görünüm" — sağ tık menüsündeki seçimle aynı etki
  useEffect(() => {
    const onStyleMode = (event: Event) => {
      const mode = (event as CustomEvent<unknown>).detail;
      if (mode !== 'Sade' && mode !== 'Ayrıntılı') return;
      setStyleMode(mode);
      setViewport((prev) => mode === 'Sade'
        ? { ...prev, showCoordinates: false, showMeasurements: false }
        : { ...prev, showMeasurements: true });
    };
    window.addEventListener('geoeba:style-mode', onStyleMode);
    return () => window.removeEventListener('geoeba:style-mode', onStyleMode);
  }, [setViewport]);

  // Yazılı komut: "kareli düzlem", "boş düzlem", "dik koordinat sistemi" — eksen ve ızgara görünürlüğünü
  // ayarlar (sağ tık menüsündeki "Eksenleri Göster" / "Izgarayı Göster" ile aynı alanlar)
  useEffect(() => {
    const onPlaneType = (event: Event) => {
      const plane = (event as CustomEvent<unknown>).detail;
      if (plane === 'dik_koordinat') {
        setViewport((prev) => ({ ...prev, showGrid: true, showAxes: true }));
      } else if (plane === 'kareli_duzlem') {
        setViewport((prev) => ({ ...prev, showGrid: true, showAxes: false, showCoordinates: false }));
      } else if (plane === 'bos_duzlem') {
        setViewport((prev) => ({ ...prev, showGrid: false, showAxes: false, showCoordinates: false }));
      }
    };
    window.addEventListener('geoeba:plane-type', onPlaneType);
    return () => window.removeEventListener('geoeba:plane-type', onPlaneType);
  }, [setViewport]);

  const isSade = styleMode === 'Sade';
  const showDetails = !isSade && viewport.showMeasurements !== false;

  // Ekran boyutu senkronizasyonu
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current) return;
      // Yerleşim boyutu (CSS px). getBoundingClientRect ata öğelerin dönüşümünü içerir: pencere açılırken
      // (pencere-ac: scale(0.96) -> 1) ölçülen boyut %4'e kadar küçük kalıyordu ve ResizeObserver dönüşüm
      // bitince yeniden tetiklenmediği için eksen sayıları, rozetler ve oklar alttan/sağdan ~25-35 px içeride
      // çiziliyordu. clientWidth/clientHeight dönüşümden etkilenmez (kapta kenarlık / iç boşluk yok).
      const el = containerRef.current;
      const rect = { width: el.clientWidth, height: el.clientHeight };
      if (rect.width > 0 && rect.height > 0) {
        setViewport((prev) => {
          if (prev.width === rect.width && prev.height === rect.height) return prev;
          return { ...prev, width: rect.width, height: rect.height };
        });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [setViewport]);

  /**
   * PERGEL — gerçek pergel gibi çalışır ve ARA NOKTA ÜRETMEZ.
   *
   * 1. Tıklama: iğne (merkez) saplanır.
   * 2. Fare yatayda hareket eder, açıklık (yarıçap) belirlenir; 2. tıklama sabitler.
   * 3. Fare merkez çevresinde döndükçe yay taranır; 3. tıklama çizimi bitirir.
   *    Tam tura ulaşılırsa çember olarak kaydedilir.
   */
  const [pergel, setPergel] = useState<{
    merkez: Point2D;
    /** null iken AÇIKLIK (yarıçap) belirleniyor */
    yaricap: number | null;
    /** null iken yayın BAŞLANGIÇ açısı belirleniyor (radyan, dünya yönü: 0 = sağ, CCW +) */
    baslangic: number | null;
    /**
     * Aşamaya göre: yarıçap, başlangıç açısı ya da TARAMA.
     * Tarama İŞARETLİDİR: pozitif saat yönünün tersi, negatif saat yönü.
     * Böylece kullanıcı yayı istediği yöne çizebilir.
     */
    tarama: number;
    /** Tarama sırasında imlecin bir önceki ham açısı (sürekli toplama için) */
    sonHamAci: number;
  } | null>(null);

  /** Kesiştir aracında tıklanan İLK şeklin kimliği (ikincisi gelince kesişim üretilir) */
  const kesistirIlkRef = useRef<string | null>(null);

  /**
   * Bir şekli "doğru" (iki nokta) veya "çember" (merkez + yarıçap) olarak tanımlar.
   * Kesişim hesabı yalnızca bu iki temsili tanır; elips şu an desteklenmiyor.
   */
  const kesisimBicimi = (
    o: MathObject
  ):
    | { tur: 'dogru'; a: Point2D; b: Point2D; sinirli: boolean }
    | { tur: 'cember'; merkez: Point2D; r: number }
    | { tur: 'elips'; merkez: Point2D; rx: number; ry: number }
    | null => {
    const nk = (id: string) => pointsById.get(id);
    if (o.type === 'segment') {
      const a = nk(o.startPointId);
      const b = nk(o.endPointId);
      return a && b ? { tur: 'dogru', a, b, sinirli: true } : null;
    }
    if (o.type === 'line') {
      const a = nk(o.point1Id);
      const b = nk(o.point2Id);
      return a && b ? { tur: 'dogru', a, b, sinirli: false } : null;
    }
    if (o.type === 'ray') {
      const a = nk(o.startPointId);
      const b = nk(o.throughPointId);
      return a && b ? { tur: 'dogru', a, b, sinirli: false } : null;
    }
    if (o.type === 'circle') {
      const c = o as CircleObject;
      if (c.throughPointIds && c.throughPointIds.length === 3) {
        const [p1, p2, p3] = c.throughPointIds.map(nk);
        if (!p1 || !p2 || !p3) return null;
        const cc = calculateCircumcircle(p1, p2, p3);
        return cc ? { tur: 'cember', merkez: cc.center, r: cc.radius } : null;
      }
      const merkez = nk(c.centerPointId);
      if (!merkez) return null;
      const yari = c.radiusPointId ? nk(c.radiusPointId) : undefined;
      const r = c.fixedRadius ?? (yari ? calculateDistance(merkez, yari) : 0);
      return r > 0 ? { tur: 'cember', merkez, r } : null;
    }
    if (o.type === 'arc' || o.type === 'sector') {
      const merkez = nk(o.centerPointId);
      const bas = nk(o.startPointId);
      if (!merkez || !bas) return null;
      const r = calculateDistance(merkez, bas);
      return r > 0 ? { tur: 'cember', merkez, r } : null;
    }
    if (o.type === 'ellipse') {
      const e = o as EllipseObject;
      const merkez = nk(e.centerPointId);
      if (!merkez) return null;
      return { tur: 'elips', merkez, rx: Math.abs(e.radiusX), ry: Math.abs(e.radiusY) };
    }
    return null;
  };

  /**
   * Pergel çizimini kalıcı nesneye çevirir.
   * Tarama tam tura yakınsa ÇEMBER (yalnızca merkez noktası), değilse YAY üretilir.
   * Yay için uçları temsil eden iki nokta gerekir; bunlar yayın kendi uç noktalarıdır,
   * eski sürümdeki gibi yarıçap ölçmek için kullanılıp ortada kalan artık noktalar değil.
   */
  const pergeliTamamla = (merkez: Point2D, yaricap: number, baslangic: number, tarama: number) => {
    const TAM_TUR_ESIGI = 0.12; // ~7°: bu kadar yaklaşınca tam çember sayılır
    const mutlakTarama = Math.abs(tarama);
    const tamTur = mutlakTarama < TAM_TUR_ESIGI || mutlakTarama > 2 * Math.PI - TAM_TUR_ESIGI;
    const labels = existingPointLabels();

    if (tamTur) {
      const [ad] = generateNextPointLabels(labels, 1);
      const merkezNokta: PointObject = {
        id: createId('pt'),
        type: 'point',
        label: ad,
        showLabel: true,
        x: merkez.x,
        y: merkez.y,
        color: '#8b5cf6',
        visible: true,
        isIndependent: true,
        createdAt: Date.now(),
      };
      const cember: CircleObject = {
        id: createId('circ'),
        type: 'circle',
        label: `${ad} Merkezli Çember`,
        showLabel: true,
        centerPointId: merkezNokta.id,
        fixedRadius: yaricap,
        color: '#8b5cf6',
        fillOpacity: 0,
        visible: true,
        createdAt: Date.now(),
      };
      addObjects([merkezNokta, cember], `Pergelle çember çizildi (r = ${formatTurkishNumber(yaricap)} br)`);
      setHintMessage(`Çember tamamlandı: r = ${formatTurkishNumber(yaricap)} br`);
      return;
    }

    const [adM, adB, adS] = generateNextPointLabels(labels, 3);
    const nokta = (ad: string, x: number, y: number): PointObject => ({
      id: createId('pt'),
      type: 'point',
      label: ad,
      showLabel: true,
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      color: '#8b5cf6',
      visible: true,
      isIndependent: true,
      createdAt: Date.now(),
    });
    const m = nokta(adM, merkez.x, merkez.y);
    // Yay nesnesi her zaman saat yönünün TERSİNE taranır. Kullanıcı saat yönünde
    // çizdiyse (tarama < 0) uçları yer değiştiririz; böylece ekranda gördüğü yay
    // ile kaydedilen yay birebir aynı olur.
    const acilar =
      tarama >= 0 ? [baslangic, baslangic + tarama] : [baslangic + tarama, baslangic];
    const uc = (ad: string, a: number) =>
      nokta(ad, merkez.x + yaricap * Math.cos(a), merkez.y + yaricap * Math.sin(a));
    const bas = uc(adB, acilar[0]);
    const bit = uc(adS, acilar[1]);
    const yay: ArcObject = {
      id: createId('arc'),
      type: 'arc',
      label: `${adB}${adS} Yayı`,
      showLabel: true,
      centerPointId: m.id,
      startPointId: bas.id,
      directionPointId: bit.id,
      thickness: 3,
      color: '#8b5cf6',
      showArcLength: true,
      visible: true,
      createdAt: Date.now(),
    };
    const derece = Math.round((mutlakTarama * 180) / Math.PI);
    addObjects([m, bas, bit, yay], `Pergelle yay çizildi (${derece}°)`);
    setHintMessage(`Yay tamamlandı: r = ${formatTurkishNumber(yaricap)} br, ${derece}°`);
  };

  /** İki şeklin kesişim noktalarını hesaplar ve tuvale ekler. */
  const kesisimNoktalariOlustur = (o1: MathObject, o2: MathObject) => {
    const b1 = kesisimBicimi(o1);
    const b2 = kesisimBicimi(o2);
    if (!b1 || !b2) {
      setHintMessage('Bu iki şeklin kesişimi hesaplanamıyor. Doğru, ışın, doğru parçası, çember ve yay desteklenir.');
      return;
    }

    let noktalar: Point2D[] = [];
    if (b1.tur === 'dogru' && b2.tur === 'dogru') {
      const k = intersectLines(b1.a, b1.b, b2.a, b2.b);
      noktalar = k ? [k] : [];
    } else if (b1.tur === 'dogru' && b2.tur === 'cember') {
      noktalar = intersectLineCircle(b1.a, b1.b, b2.merkez, b2.r);
    } else if (b1.tur === 'cember' && b2.tur === 'dogru') {
      noktalar = intersectLineCircle(b2.a, b2.b, b1.merkez, b1.r);
    } else if (b1.tur === 'cember' && b2.tur === 'cember') {
      noktalar = intersectCircles(b1.merkez, b1.r, b2.merkez, b2.r);
    } else if (b1.tur === 'dogru' && b2.tur === 'elips') {
      noktalar = intersectLineEllipse(b1.a, b1.b, b2.merkez, b2.rx, b2.ry);
    } else if (b1.tur === 'elips' && b2.tur === 'dogru') {
      noktalar = intersectLineEllipse(b2.a, b2.b, b1.merkez, b1.rx, b1.ry);
    } else {
      // Elips–çember ve elips–elips kesişimi dördüncü dereceden denklem gerektirir;
      // henüz desteklenmiyor. Kullanıcıyı boş sonuçla baş başa bırakmayalım.
      setHintMessage(
        'Elipsin yalnızca DOĞRULARLA kesişimi hesaplanabiliyor. Elips–çember ve elips–elips henüz desteklenmiyor.'
      );
      return;
    }

    if (noktalar.length === 0) {
      setHintMessage(`${o1.label || 'Şekil'} ile ${o2.label || 'şekil'} kesişmiyor.`);
      return;
    }

    const mevcut = existingPointLabels();
    const adlar = generateNextPointLabels(mevcut, noktalar.length);
    const yeniler: PointObject[] = noktalar.map((p, i) => ({
      id: createId('pt'),
      type: 'point',
      label: adlar[i],
      showLabel: true,
      x: Number(p.x.toFixed(4)),
      y: Number(p.y.toFixed(4)),
      color: '#dc2626',
      visible: true,
      // Kesişim noktası bağımlı bir noktadır: serbestçe sürüklenmesi anlamsızdır
      isIndependent: false,
      createdAt: Date.now(),
    }));
    addObjects(
      yeniler,
      noktalar.length === 1
        ? `${adlar[0]} kesişim noktası oluşturuldu`
        : `${noktalar.length} kesişim noktası oluşturuldu`
    );
    setHintMessage(
      `${o1.label || 'Şekil'} ile ${o2.label || 'şekil'} ${noktalar.length === 1 ? 'tek noktada (teğet)' : noktalar.length + ' noktada'} kesişiyor: ${adlar.join(', ')}`
    );
  };

  /** Pergelin O ANKİ durumu: tıklama işleyicileri eski kapanışa takılmasın */
  const pergelRef = useRef(pergel);
  pergelRef.current = pergel;

  /** Escape pergel çizimini de iptal etsin (klavye dinleyicisi ref üzerinden çağırır) */
  const pergelIptalRef = useRef<() => void>(() => {});
  pergelIptalRef.current = () => setPergel(null);

  /** Ok tuşuyla taşıma sürüyor mu? (tuş bırakılınca tek geçmiş adımı yazılır) */
  const okTasimaRef = useRef(false);

  // Klavye kısayolları için güncel değer referansı (her render'da yeniden abone olmayı önler)
  const keyboardRef = useRef({
    selectedObjectIds,
    deleteObjects,
    setSelectedObjectIds,
    undo,
    redo,
    canUndo,
    canRedo,
    cancelPendingAction,
    dialogOpen: isTextDialogOpen || isConfirmClearOpen || isRegularPolygonDialogOpen,
    setActiveTool,
    moveObjects,
    recordHistory,
    gridStep: viewport.gridStep,
    zoom: viewport.zoom,
    selectedSolidId,
    selectedSolidIds,
    onDeleteSolid,
    onDeleteSolids,
    onSelectSolid,
    onSelectSolids,
  });
  keyboardRef.current = {
    selectedObjectIds,
    deleteObjects,
    setSelectedObjectIds,
    undo,
    redo,
    canUndo,
    canRedo,
    cancelPendingAction,
    dialogOpen: isTextDialogOpen || isConfirmClearOpen || isRegularPolygonDialogOpen,
    setActiveTool,
    moveObjects,
    recordHistory,
    gridStep: viewport.gridStep,
    zoom: viewport.zoom,
    selectedSolidId,
    selectedSolidIds,
    onDeleteSolid,
    onDeleteSolids,
    onSelectSolid,
    onSelectSolids,
  };

  // Klavye Kısayolları (Delete/Backspace: sil, Ctrl+Z: geri al, Ctrl+Y / Ctrl+Shift+Z: yinele, Esc: iptal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!workspaceOwnsKeyboard(e, svgRef.current)) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }
      const k = keyboardRef.current;
      // Canvas'ın kendi diyalogları + Modal tabanlı tüm diyaloglar
      // (Fonksiyon, Kaydırıcı, Nesne Ekle, Düzgün Çokgen, Tuvali Temizle...)
      if (k.dialogOpen || isAnyModalOpen()) return;
      // Odak bir diyalog içindeyken de kısayollar tuvale ulaşmamalı

      const isMod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isMod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (k.canUndo) k.undo();
        return;
      }
      if (isMod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (k.canRedo) k.redo();
        return;
      }
      if (e.key === 'Escape') {
        pergelIptalRef.current();
        k.cancelPendingAction();
        k.onSelectSolid?.(null);
        k.onSelectSolids?.([]);
        return;
      }

      // Ok tuşları: seçili nesneleri (pivot noktaları dâhil) ince ayarla.
      // Shift ile 5 adım birden, Alt ile ızgaranın onda biri kadar hassas.
      const OKLAR: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, 1],
        ArrowDown: [0, -1],
      };
      if (OKLAR[e.key] && k.selectedObjectIds.length > 0 && !isMod) {
        e.preventDefault();
        const [ix, iy] = OKLAR[e.key];
        const taban = k.gridStep || 1;
        const adim = e.altKey ? taban / 10 : e.shiftKey ? taban * 5 : taban;
        k.moveObjects(k.selectedObjectIds, { x: ix * adim, y: iy * adim }, false);
        okTasimaRef.current = true;
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (k.selectedObjectIds.length > 0) {
          e.preventDefault();
          const count = k.selectedObjectIds.length;
          k.deleteObjects(k.selectedObjectIds, count === 1 ? undefined : `${count} seçili nesne silindi`);
          k.setSelectedObjectIds([]);
        }
        if (k.selectedSolidIds.length > 0 || k.selectedSolidId) {
          e.preventDefault();
          const toDelete = k.selectedSolidIds.length > 0 ? k.selectedSolidIds : (k.selectedSolidId ? [k.selectedSolidId] : []);
          // Birden çok cisim tek geçmiş adımıyla silinsin (tek Ctrl+Z hepsini geri getirir)
          if (k.onDeleteSolids) k.onDeleteSolids(toDelete);
          else toDelete.forEach((sid) => k.onDeleteSolid?.(sid));
          k.onSelectSolid?.(null);
          k.onSelectSolids?.([]);
        }
      }
    };

    /**
     * Ok tuşuyla taşıma sırasında her basış geçmişe yazılsaydı 20 kez ok'a basan
     * kullanıcı 20 geri alma adımı biriktirirdi. Bu yüzden tuş BIRAKILDIĞINDA
     * tek bir adım kaydedilir.
     */
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!okTasimaRef.current) return;
      if (!e.key.startsWith('Arrow')) return;
      okTasimaRef.current = false;
      const sayi = keyboardRef.current.selectedObjectIds.length;
      keyboardRef.current.recordHistory(sayi === 1 ? 'Nesne taşındı' : `${sayi} nesne taşındı`);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Kimliğe göre nokta haritası (render sırasında tekrarlı aramaları önler)
  const pointsById = useMemo(() => {
    const map = new Map<string, PointObject>();
    for (const obj of objects) {
      if (obj.type === 'point') map.set(obj.id, obj as PointObject);
    }
    return map;
  }, [objects]);

  // EŞİTLİK İŞARETLERİ (|, ||, |||): birbirine değen şekillerde eşit uzunluk/yaylar + elle konanlar.
  // Yalnız nesneler ve aç/kapa değişince hesaplanır; kaydırma/yakınlaştırma yeniden gruplamaz (viewport'a bağlı DEĞİL).
  const esitlik = useMemo(
    () => esitlikIsaretleri(objects, { otomatik: viewport.showEqualityMarks !== false }),
    [objects, viewport.showEqualityMarks]
  );
  // Çentiğin altında kalmaması gereken noktalar. DİZİ: StrictMode render'ı aynı props ile iki kez çağırır,
  // tek kullanımlık bir yineleyici (pointsById.values()) ikinci çağrıda boş gelirdi.
  const esitlikNoktalari = useMemo(() => [...pointsById.values()], [pointsById]);

  // Nokta adlarının kaçınacağı çizgiler (noktadan çıkan/geçen parça, doğru, ışın, çokgen kenarı, çember).
  // Yerleşim kamera hareketinden bağımsızdır; yalnız sonuç ekrana projekte edilir.
  const etiketGorunumu = useMemo(() => labelLayoutViewport(viewport), []); // yalnız sabit geometri ölçeği
  const etiketOlcegi = labelZoomScale(viewport);
  const noktaEngelHaritasi = useMemo(
    () => noktaEngelleri(objects, pointsById, (p) => worldToScreen(p, etiketGorunumu)),
    [objects, pointsById, etiketGorunumu]
  );

  // Aktif Kaydırıcı Değişkenleri Haritası (Fonksiyon grafikleri için)
  // Sahnedeki kaydırıcılar (oynatma ve tuval üstü çizim için)
  const sliders = useMemo(
    () => objects.filter((o) => o.type === 'slider' && o.visible) as SliderObject[],
    [objects]
  );

  // Sahnedeki canlandırılan noktalar
  const animatingPoints = useMemo(
    () =>
      objects.filter(
        (o) =>
          o.type === 'point' &&
          (o as PointObject).animating &&
          o.visible &&
          (o as PointObject).onObjectId
      ) as PointObject[],
    [objects]
  );

  const { isPlaying: sliderPlaying, toggle: toggleSliderPlayback } = useSliderPlayback({
    sliders,
    animatingPoints,
    allObjects: objects,
    onValues: setSliderValues,
  });

  // İz bırakma (GeoGebra Trace) durumu
  const [traces, setTraces] = useState<Record<string, { points: Point2D[]; color: string }>>({});
  const clearTraces = useCallback(() => setTraces({}), []);
  /** Tek bir nesnenin iz çizgisini siler (iz çizgisine sağ tık → "Bu izi sil") */
  const clearTrace = useCallback((id: string) => {
    setTraces((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // showTrace: true olan nesnelerin hareket izlerini kaydet
  useEffect(() => {
    const traceObjects = objects.filter((o) => o.showTrace && o.visible);

    setTraces((prev) => {
      let changed = false;
      const next = { ...prev };
      // Nesne silindiyse ya da izi kapatıldıysa ("İzi Gizle") eski iz çizgileri de kalkar;
      // aksi hâlde ekranda silinemeyen kesikli çizgiler kalıyordu.
      const byId = new Map(objects.map((o) => [o.id, o]));
      for (const id of Object.keys(next)) {
        if (!byId.get(id)?.showTrace) {
          delete next[id];
          changed = true;
        }
      }
      for (const obj of traceObjects) {
        if (obj.type === 'point') {
          const pt = obj as PointObject;
          const curList = next[pt.id]?.points ?? [];
          const last = curList[curList.length - 1];
          if (!last || Math.hypot(last.x - pt.x, last.y - pt.y) > 0.02) {
            next[pt.id] = {
              color: pt.color || '#2563eb',
              points: [...curList.slice(-600), { x: pt.x, y: pt.y }],
            };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [objects]);

  // Yazılı komut / düğme: animasyon başlat/durdur ve iz temizleme dinleyicileri
  useEffect(() => {
    const onPlayback = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail;
      const mode = typeof detail === 'string' ? detail : detail?.mode ?? 'toggle';
      const targetId = typeof detail === 'object' ? detail?.targetId : undefined;

      if (targetId) {
        const obj = latestObjectsRef.current.find((o) => o.id === targetId || o.label === targetId);
        if (obj?.type === 'point') {
          const pt = obj as PointObject;
          const nextAnim = mode === 'play' ? true : mode === 'stop' ? false : !pt.animating;
          updateObject(pt.id, { animating: nextAnim } as Partial<MathObject>, true);
        } else if (obj?.type === 'slider') {
          if (mode === 'toggle' || (mode === 'play' && !sliderPlaying) || (mode === 'stop' && sliderPlaying)) {
            toggleSliderPlayback();
          }
        }
        return;
      }

      if (mode === 'toggle' || (mode === 'play' && !sliderPlaying) || (mode === 'stop' && sliderPlaying)) {
        toggleSliderPlayback();
      }
    };

    const onClearTraces = () => clearTraces();

    window.addEventListener('geoeba:slider-playback', onPlayback);
    window.addEventListener('geoeba:animation-playback', onPlayback);
    window.addEventListener('geoeba:clear-traces', onClearTraces);
    return () => {
      window.removeEventListener('geoeba:slider-playback', onPlayback);
      window.removeEventListener('geoeba:animation-playback', onPlayback);
      window.removeEventListener('geoeba:clear-traces', onClearTraces);
    };
  }, [sliderPlaying, toggleSliderPlayback, updateObject, clearTraces]);

  /**
   * Sürükleme biter bitmez tarayıcı bir 'click' olayı da gönderir. mouseup, click'ten ÖNCE
   * çalıştığı için sürükleme durumu o ana kadar temizlenmiş olur; bu bayrak olmasaydı
   * taşınan etiket hemen ardından "tıklandı" sayılıp gizlenirdi.
   */
  const labelJustDraggedRef = useRef(false);

  // Ölçüm etiketi sürükleme durumu (etiketler şekle GÖRE kaydırılır)
  const labelDragRef = useRef<{
    objectId: string;
    kind: MeasurementKind | string;
    startClient: Point2D;
    startOffset: Point2D;
    element: SVGGElement;
    startCenter: Point2D;
    pointIds: string[];
    alignment: MeasurementLabelAnchor['alignment'];
    lastCenter: Point2D;
    moved: boolean;
  } | null>(null);
  const [etiketKilavuzlari, setEtiketKilavuzlari] = useState<ReturnType<typeof etiketHizalama> | null>(null);
  // Etikete son basışın anı: dokunmatik uzun basış (sağ tık menüsü) rozetin silme tıklaması sayılmasın
  const etiketBasisRef = useRef<{ zaman: number; fare: boolean } | null>(null);
  // Nesne menüsünün en son AÇILDIĞI an (uzun basış zamanlayıcısı ya da tarayıcının contextmenu olayı):
  // dokunmatik basış sırasında menü açıldıysa parmak kalkınca gelen tıklama rozeti silmez
  const menuAcilisZamaniRef = useRef<number | null>(null);

  // Tuval üstü kaydırıcı tutamağının sürüklenmesi
  const sliderDragRef = useRef<{ id: string } | null>(null);
  // Pencere dinleyicileri her zaman güncel nesne/görünüm değerlerini görsün
  const latestObjectsRef = useRef(objects);
  latestObjectsRef.current = objects;
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = sliderDragRef.current;
      if (!drag || !svgRef.current) return;
      const s = (latestObjectsRef.current.find((o) => o.id === drag.id) as SliderObject | undefined);
      if (!s || s.x === undefined || s.y === undefined) return;
      const rect = svgRef.current.getBoundingClientRect();
      const world = screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewportRef.current);
      const uzunluk = s.length ?? 4;
      // Fare konumunu çubuk üzerinde [0, 1] orana çevir
      const t = Math.max(0, Math.min(1, (world.x - s.x) / (uzunluk || 1)));
      let deger = s.min + t * (s.max - s.min);
      if (s.step > 0) deger = Math.round(deger / s.step) * s.step;
      deger = Math.max(s.min, Math.min(s.max, Number(deger.toFixed(4))));
      handleSliderChange(s.id, deger);
    };
    const onUp = () => {
      if (!sliderDragRef.current) return;
      const id = sliderDragRef.current.id;
      sliderDragRef.current = null;
      // Sürükleme bitince TEK geçmiş adımı yaz (her fare karesi değil)
      const s = latestObjectsRef.current.find((o) => o.id === id) as SliderObject | undefined;
      recordHistory(s ? `${s.variableName} = ${formatTurkishNumber(s.value)}` : 'Kaydırıcı değiştirildi');
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [handleSliderChange, recordHistory]);

  // Ölçüm etiketi sürükleme: fare hareketi boyunca geçmişe yazmadan güncelle,
  // bırakıldığında TEK adım kaydet. Kayıklık dünya biriminde tutulur; şekil taşındığında
  // etiket de onunla birlikte gider (çapa şeklin kendi noktalarından hesaplanır).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = labelDragRef.current;
      if (!d) return;
      const dxPx = e.clientX - d.startClient.x;
      const dyPx = e.clientY - d.startClient.y;
      if (!d.moved && Math.hypot(dxPx, dyPx) < 3) return;
      d.moved = true;
      const z = viewportRef.current.zoom || 1;
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const kutu = d.element.querySelector('[data-yazim-kutu]')?.getBoundingClientRect();
      let dx = dxPx, dy = dyPx;
      if (kutu && d.kind !== 'pointLabel') {
        const cx = d.startCenter.x + dxPx, cy = d.startCenter.y + dyPx;
        const digerleri = Array.from(svgRef.current!.querySelectorAll<SVGGElement>('[data-label-object]'))
          .filter(el => el !== d.element && el.dataset.labelKind !== 'pointLabel')
          .flatMap(el => {
            const r = el.querySelector('[data-yazim-kutu]')?.getBoundingClientRect();
            return r && r.width > 0 && r.height > 0 ? [{ id: `${el.dataset.labelObject}:${el.dataset.labelKind}`, horizontalAlignment: el.dataset.labelAlignment as MeasurementLabelAnchor['alignment'] | undefined, left: r.left - svgRect.left, right: r.right - svgRect.left, top: r.top - svgRect.top, bottom: r.bottom - svgRect.top }] : [];
          });
        const hizalama = e.altKey ? null : etiketHizalama({
          id: `${d.objectId}:${d.kind}`, left: cx - kutu.width / 2 - svgRect.left, right: cx + kutu.width / 2 - svgRect.left,
          top: cy - kutu.height / 2 - svgRect.top, bottom: cy + kutu.height / 2 - svgRect.top,
        }, digerleri);
        dx += hizalama?.delta.x ?? 0;
        dy += hizalama?.delta.y ?? 0;
        d.alignment = hizalama?.yatayHizalama ?? 'left';
        setEtiketKilavuzlari(hizalama);
      }
      const position = screenToWorld({ x: d.startCenter.x + dx - svgRect.left, y: d.startCenter.y + dy - svgRect.top }, viewportRef.current);
      d.lastCenter = position;
      const center = shapeAnchorCenter(latestObjectsRef.current, d.pointIds);
      setLabelOffset(
        d.objectId,
        d.kind,
        { x: d.startOffset.x + dx / z, y: d.startOffset.y - dy / z },
        false,
        center ? { pointIds: d.pointIds, offset: { x: position.x - center.x, y: position.y - center.y }, alignment: 'center' } : undefined,
      );
    };
    const onUp = (e: PointerEvent) => {
      const d = labelDragRef.current;
      if (!d) return;
      // Son karede kısa/tam yazımla genişleyen kutu da tam hizaya gelsin.
      if (d.moved && e.type === 'pointerup') flushSync(() => onMove(e));
      if (d.moved) {
        const obj = latestObjectsRef.current.find(o => o.id === d.objectId);
        const z = viewportRef.current.zoom || 1;
        const center = shapeAnchorCenter(latestObjectsRef.current, d.pointIds);
        if (center) {
          const natural = screenToWorld({ x: Number(d.element.dataset.labelX), y: Number(d.element.dataset.labelY) }, viewportRef.current);
          const off = { x: d.lastCenter.x - natural.x, y: d.lastCenter.y - natural.y };
          const width = Number(d.element.dataset.labelWidth) / z;
          const anchor = d.element.dataset.labelDetached === 'true' ? {
            pointIds: d.pointIds,
            offset: { x: d.lastCenter.x - center.x + (d.alignment === 'left' ? -width / 2 : d.alignment === 'right' ? width / 2 : 0), y: d.lastCenter.y - center.y },
            alignment: d.alignment,
          } : null;
          setLabelOffset(d.objectId, d.kind, off, false, anchor);
        } else if (obj?.labelAnchors?.[d.kind]) {
          setLabelOffset(d.objectId, d.kind, obj.labelOffsets?.[d.kind] ?? { x: 0, y: 0 }, false, null);
        }
        labelJustDraggedRef.current = true;
        // Sürükleme tuval dışında biterse 'click' hiç gelmeyebilir; bayrak asılı kalmasın
        window.setTimeout(() => {
          labelJustDraggedRef.current = false;
        }, 300);
        recordHistory('Ölçüm etiketi taşındı');
      }
      labelDragRef.current = null;
      setEtiketKilavuzlari(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [setLabelOffset, recordHistory]);

  /**
   * Yazı boyutu: temel değer, genel `fontScale` ve gruba ait ayrıntılı ölçekle çarpılır.
   * Böylece "hepsini birden büyüt" ile "yalnızca ölçüm kutularını büyüt" aynı anda mümkün.
   */
  const fs = useCallback(
    (base: number, kind: 'label' | 'measure' | 'axis' = 'measure') => {
      const grup =
        kind === 'label'
          ? styleSettings.pointLabelScale
          : kind === 'axis'
          ? styleSettings.axisScale
          : styleSettings.measurementScale;
      return Number((base * styleSettings.fontScale * grup).toFixed(2));
    },
    [styleSettings]
  );

  /** Şekil çizgisi kalınlığı: temel kalınlık x kullanıcı çarpanı. Izgara ve arayüz etkilenmez. */
  const sw = useCallback(
    (base: number) => Number((base * styleSettings.strokeScale).toFixed(2)),
    [styleSettings.strokeScale]
  );

  /**
   * Kullanıcının sürükleyerek verdiği etiket kayıklığının EKRAN karşılığı (px).
   * Etiketin çizgiden gerçek uzaklığını (ve dolayısıyla düz mü eğik mi yazılacağını) bulmakta kullanılır.
   */
  const etiketKaymasi = useCallback(
    (objectId: string, kind: MeasurementKind | string, merkez?: Point2D, genislik = 0) => {
      const obj = objects.find((o) => o.id === objectId);
      const off = obj?.labelOffsets?.[kind];
      const z = viewport.zoom || 1;
      const anchor = obj?.labelAnchors?.[kind];
      const position = anchor && merkez ? anchoredLabelPosition(anchor, objects, genislik / z) : null;
      if (position && merkez) {
        const screen = worldToScreen(position, viewport);
        return { x: screen.x - merkez.x, y: screen.y - merkez.y };
      }
      return { x: off ? off.x * z : 0, y: off ? -off.y * z : 0 };
    },
    [objects, viewport]
  );
  const etiketAyrikMi = useCallback((id: string, kind: string) => {
    const dragging = labelDragRef.current;
    return !(dragging?.objectId === id && dragging.kind === kind) && !!objects.find(o => o.id === id)?.labelAnchors?.[kind];
  }, [objects]);
  const serbestEtiketYeri = useCallback((id: string, kind: string, merkez: Point2D, olcu: KutuOlcusu) => {
    const kayma = etiketKaymasi(id, kind, merkez, olcu.genislik);
    return { merkez, olcu, uzak: etiketAyrikMi(id, kind) || Math.hypot(kayma.x, kayma.y) > 18 * etiketOlcegi };
  }, [etiketKaymasi, etiketAyrikMi, etiketOlcegi]);

  // Eski kayıtları yalnız belge değişiminde ele al. Kamera hareketi belgeye çapa yazamaz.
  useEffect(() => {
    if (labelDragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    for (const el of Array.from(svgRef.current.querySelectorAll<SVGGElement>('[data-label-detached="true"]'))) {
      const id = el.dataset.labelObject!, kind = el.dataset.labelKind!;
      const obj = objects.find(o => o.id === id);
      const off = obj?.labelOffsets?.[kind];
      if (!off || (!off.x && !off.y) || obj?.labelAnchors?.[kind]) continue;
      const pointIds = labelAnchorPointIds(objects, id);
      const center = shapeAnchorCenter(objects, pointIds);
      const box = el.querySelector('[data-yazim-kutu]')?.getBoundingClientRect();
      if (!center || !box) continue;
      const position = screenToWorld({ x: box.left - rect.left, y: (box.top + box.bottom) / 2 - rect.top }, viewportRef.current);
      setLabelOffset(id, kind, off, false, { pointIds, offset: { x: position.x - center.x, y: position.y - center.y }, alignment: 'left' });
    }
  }, [objects, setLabelOffset]);

  /**
   * Taşınabilir ve tıklanabilir bir ölçüm etiketi için ortak SVG özellikleri.
   * - transform: şekle göre kayıklığı uygular
   * - sürükle: etiketi taşır (tek geçmiş adımı)
   * - tıkla: şekle ait etiketi gizler (sağ tık menüsünden geri getirilebilir).
   *   AÇI rozeti açının kendisidir: tıklamak açıyı yayıyla birlikte siler (tek adım, Geri Al ile döner).
   *   Sil aracında bağımsız ölçüm etiketi (eğim, oranlar, |AP|) de ölçüm nesnesiyle birlikte silinir.
   *   Kurallar: etiketTiklamaEylemi (src/math/measurementLabelClick.ts).
   */
  const olcumEtiketi = useCallback(
    (
      objectId: string,
      kind: MeasurementKind | string,
      /**
       * Tıklayınca gizlensin mi? Nokta ADI gizlenemez: kullanıcı onu taşımak
       * isterken yanlışlıkla kaybetmemeli, adı kaldırmanın yeri özellikler paneli.
       */
      gizlenebilir = true,
      yer?: { merkez: Point2D; olcu: KutuOlcusu; uzak: boolean },
    ) => {
      const obj = objects.find((o) => o.id === objectId);
      const off = obj?.labelOffsets?.[kind];
      const { x: dx, y: dy } = etiketKaymasi(objectId, kind, yer?.merkez, yer?.olcu.genislik);
      // Etiketler artık şeklin GÖVDESİNİN DIŞINDA duruyor (çokgende alt kenarın altı,
      // çemberde çemberin altı, yay/dilimde yayın dışı, açıda 40 px ötede). Bu yüzden
      // her zaman tıklanabilir olabilirler: şekli sürüklerken etiketi yakalama riski yok.
      // Önceki "yalnızca seçiliyken tıklanabilir" kuralı, hiç seçilemeyen açı rozetinin
      // asla gizlenememesine yol açıyordu.
      // Sil aracında açı rozeti ve bağımsız ölçüm etiketi bir SİLME düğmesidir: sürüklenmez.
      const silAraciylaSilinir = etiketSilAraciylaSilinirMi(obj, kind, activeTool, gizlenebilir);
      return {
        'data-label-object': objectId,
        'data-label-kind': kind,
        'data-label-alignment': obj?.labelAnchors?.[kind]?.alignment,
        'data-label-x': yer?.merkez.x,
        'data-label-y': yer?.merkez.y,
        'data-label-width': yer?.olcu.genislik,
        'data-label-detached': yer?.uzak,
        transform: `translate(${dx}, ${dy})`,
        style: {
          // Çizim araçlarında ve Silde artı, Seç'te taşıma okları, El aracında açık el (imlecSiniflari.ts)
          cursor: imlecDegeri(activeTool, 'etiket'),
          pointerEvents: 'auto' as const,
          // Dokunmatik cihazda parmak hareketini tarayıcı kaydırma sanmasın
          touchAction: 'none' as const,
        },
        // POINTER olayları kullanılır: fare, DOKUNMATİK ve kalem aynı yoldan geçer.
        // Yalnızca onMouseDown varken tablet ve akıllı tahtada etiket sürüklenemiyordu
        // (parmak touchmove üretir, mousemove üretmez) — kullanıcı "taşıyamıyorum" diyordu.
        onPointerDown: (e: React.PointerEvent) => {
          // El aracında etiket sürüklenmez; basış görünümü kaydırır (gorunumKaydirma.ts)
          if (!nesneBasisiIslenmeli(activeTool, e)) return;
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          e.stopPropagation();
          etiketBasisRef.current = { zaman: Date.now(), fare: e.pointerType === 'mouse' };
          labelJustDraggedRef.current = false;
          if (silAraciylaSilinir) {
            // Titreme etiketi taşımaya çevirmesin; silme 'click' ile yapılır
            labelDragRef.current = null;
            return;
          }
          try {
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
          } catch {
            /* yakalama desteklenmiyorsa sürükleme yine window dinleyicisiyle yürür */
          }
          const element = e.currentTarget as SVGGElement;
          const box = element.querySelector('[data-yazim-kutu]')?.getBoundingClientRect() ?? element.getBoundingClientRect();
          const startCenter = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
          labelDragRef.current = {
            objectId,
            kind,
            startClient: { x: e.clientX, y: e.clientY },
            startOffset: off ? { ...off } : { x: 0, y: 0 },
            element,
            startCenter,
            pointIds: yer ? obj?.labelAnchors?.[kind]?.pointIds ?? labelAnchorPointIds(objects, objectId) : [],
            alignment: obj?.labelAnchors?.[kind]?.alignment ?? 'left',
            lastCenter: { x: 0, y: 0 },
            moved: false,
          };
        },
        onClick: (e: React.MouseEvent) => {
          // El aracında etiket gizlenmez/silinmez: görünüm aracı sahneyi değiştirmez
          if (!nesneBasisiIslenmeli(activeTool, e)) return;
          e.stopPropagation();
          // Taşıma yapıldıysa bu tıklama sürüklemenin devamıdır; etiketi gizleme/silme.
          if (labelJustDraggedRef.current || labelDragRef.current?.moved) {
            labelJustDraggedRef.current = false;
            return;
          }
          const eylem = etiketTiklamaEylemi(obj, kind, activeTool, gizlenebilir);
          if (eylem === 'yok') return;
          if (eylem === 'aciyiSil' || eylem === 'olcumuSil') {
            // Dokunmatik uzun basış sağ tık menüsünü açtı; parmak kalkınca gelen tıklama nesneyi silmesin
            if (uzunBasisMi(etiketBasisRef.current, menuAcilisZamaniRef.current)) return;
            if (!obj) return;
            // Açının yalnızca rozetini gizlemek turuncu yayı sahipsiz bırakıyordu: açı bütünüyle,
            // tek geçmiş adımında silinir (Geri Al yay ve rozeti birlikte getirir).
            deleteObjects([objectId]);
            setHintMessage(etiketSilindiIpucu(obj));
            return;
          }
          hideMeasurement(objectId, kind);
        },
      };
    },
    [objects, etiketKaymasi, hideMeasurement, activeTool, deleteObjects, setHintMessage]
  );

  // ------------------------------------------------------------------ ÖLÇÜ YAZIMI (MEB) ÖN GEÇİŞİ
  /** Kullanıcının ölçü/açı yazımı ayarı: Tam/Kısa ve şapka / ∠ (src/math/matematikYazimi.ts). */
  const yazim = useMemo(() => yazimAyari(styleSettings), [styleSettings]);
  /** Nokta arayıcı: yazım kuralları nesnenin .label'ını değil, GÖRÜNEN nokta adlarını kullanır. */
  const noktaBul = useMemo(() => noktaBulucu(pointsById), [pointsById]);

  /**
   * ÖLÇÜM KARTLARI (çokgen alan/çevre, çember, elips) tek yerden ölçülür: 4, 4.6 ve 5 katmanları
   * kartı buradan çizer, 6 (açı rozeti) ve 7.5 (yay rozeti) katmanları kutuları ENGEL olarak okur.
   */
  const kartKutulari = useMemo(
    () => (showDetails ? olcumKartKutulari({ objects, viewport, yazim, px: (t) => fs(t, 'measure') }) : []),
    [objects, viewport, yazim, fs, showDetails],
  );
  const kartHaritasi = useMemo(() => new Map(kartKutulari.map((k) => [k.id, k])), [kartKutulari]);
  const kartEngelleri = useMemo(() => showDetails
    ? olcumKartKutulari({ objects, viewport: etiketGorunumu, yazim, px: (t) => fs(t, 'measure') }).map(k => k.kutu) : [],
  [objects, etiketGorunumu, yazim, fs, showDetails]);

  /**
   * Açı rozetleri kısa değer kutularıyla birlikte yerleştirilir. Bu sabit yerleşimden sürüklenen
   * etiketin köşeye gerçek uzaklığı yazımı belirler; biçim değişince sürükleme çapası sıçramaz.
   */
  const aciRozetleri = useMemo(() => {
    const rozetler = new Map<string, { satirlar: Dugum[][]; olcu: KutuOlcusu; merkez: Nokta; uzak: boolean; sesli: string; ipucu: string }>();
    if (!showDetails) return { rozetler };
    const px = fs(11, 'measure');
    type Uye = { id: string; aday: RozetAdayi; tam: Dugum[]; kisa: Dugum[]; sesli: string; ipucu: string };
    const gruplar = new Map<string, { uyeler: Uye[]; kenarlar: [Nokta, Nokta][] }>();

    for (const obj of objects) {
      if (obj.type !== 'angle' || obj.visible === false || obj.showValue === false) continue;
      const ang = obj as AngleObject;
      const p1 = pointsById.get(ang.point1Id);
      const kose = pointsById.get(ang.vertexPointId);
      const p3 = pointsById.get(ang.point3Id);
      if (!p1 || !kose || !p3) continue;
      const icDeg = calculateAngleDegrees(p1, kose, p3);
      const deg = ang.reflex ? 360 - icDeg : icDeg;
      const vS = worldToScreen(kose, etiketGorunumu);
      const s1 = worldToScreen(p1, etiketGorunumu);
      const s3 = worldToScreen(p3, etiketGorunumu);
      // Ekran açıları (y aşağı): açı katmanının kullandığı değerlerin aynısı
      const kol1 = Math.atan2(-(p1.y - kose.y), p1.x - kose.x);
      const kol2 = Math.atan2(-(p3.y - kose.y), p3.x - kose.x);
      let delta = kol2 - kol1;
      while (delta <= -Math.PI) delta += 2 * Math.PI;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      const tarama = ang.reflex ? delta - Math.sign(delta || 1) * 2 * Math.PI : delta;
      const olcu = aciOlcusu(ang, noktaBul, deg, { basamak: 1 });
      const { tam, kisa } = yazimlar(olcu, yazim);
      const aday: RozetAdayi = {
        girdi: {
          kose: vS,
          kol1, kol2,
          boy1: Math.hypot(s1.x - vS.x, s1.y - vS.y),
          boy2: Math.hypot(s3.x - vS.x, s3.y - vS.y),
          orta: kol1 + tarama / 2,
          tarama: Math.abs(tarama),
          yayR: 22,
        },
        tam: kutuOlcusu([tam], px),
        kisa: kutuOlcusu([kisa], px),
      };
      const anahtar = aciGrubu(ang, objects);
      let grup = gruplar.get(anahtar);
      if (!grup) {
        // Engel çizgileri: çokgen açılarında çokgenin kenarları, tek açıda kapatan [p1, p3] parçası
        const kenarlar: [Nokta, Nokta][] = [];
        const poly = anahtar.startsWith('poly:') ? objects.find((o) => o.id === anahtar.slice(5)) : null;
        if (poly && poly.type === 'polygon') {
          const koseler = (poly as PolygonObject).pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
          const ekran = koseler.map((p) => worldToScreen(p, etiketGorunumu));
          for (let i = 0; i < ekran.length; i++) kenarlar.push([ekran[i], ekran[(i + 1) % ekran.length]]);
        } else {
          kenarlar.push([s1, s3]);
        }
        grup = { uyeler: [], kenarlar };
        gruplar.set(anahtar, grup);
      }
      grup.uyeler.push({ id: ang.id, aday, tam, kisa, sesli: sesli(olcu), ipucu: aciklama(olcu) });
    }

    for (const grup of gruplar.values()) {
      const yerlesim = aciRozetiYerlesimi(
        grup.uyeler.map((u) => ({ ...u.aday, tam: u.aday.kisa })),
        { kenarlar: grup.kenarlar, kutular: kartEngelleri },
        'kisa',
      );
      grup.uyeler.forEach((u, i) => {
        const yer = yerlesim.yerler[i];
        if (!yer) return;
        // Rozet açının üstündeyken yalnızca değer; sürüklenip uzaklaştırıldığında tam yazım
        const merkez = projectLabelPoint({ x: (yer.kutu.x0 + yer.kutu.x1) / 2, y: (yer.kutu.y0 + yer.kutu.y1) / 2 }, viewport);
        const rozetUzak = etiketAyrikMi(u.id, 'angle') || aciEtiketiUzakta(projectLabelPoint(u.aday.girdi.kose, viewport), merkez, etiketKaymasi(u.id, 'angle', merkez, u.aday.tam.genislik), 18 * etiketOlcegi);
        rozetler.set(u.id, {
          satirlar: [rozetUzak ? u.tam : u.kisa],
          olcu: rozetUzak ? u.aday.tam : u.aday.kisa,
          merkez,
          uzak: rozetUzak,
          sesli: u.sesli,
          ipucu: u.ipucu,
        });
      });
    }
    return { rozetler };
  }, [objects, pointsById, viewport, etiketGorunumu, etiketOlcegi, yazim, fs, showDetails, noktaBul, kartEngelleri, etiketKaymasi, etiketAyrikMi]);

  /** Çapa her iki yazımda da kısa kutudan hesaplanır; sürüklerken biçim değişimi konumu değiştirmez. */
  const cizgiYazimi = useCallback((olcu: Olcu) => {
    const { tam, kisa } = yazimlar(olcu, yazim);
    return { tam, kisa, kisaKutu: kutuOlcusu([kisa], fs(11, 'measure')), sesli: sesli(olcu), ipucu: aciklama(olcu) };
  }, [yazim, fs]);

  /** Aynı yakınlık kararı hem kısa/tam yazımı hem paralel/yatay yönü belirler. */
  const cizgiEtiketiniYerlestir = useCallback((
    yazi: ReturnType<typeof cizgiYazimi>, objectId: string, kind: MeasurementKind | string,
    a: Nokta, b: Nokta, merkez: Nokta,
  ) => {
    const tamKutu = kutuOlcusu([yazi.tam], fs(11, 'measure'));
    const uzak = etiketAyrikMi(objectId, kind) || cizgiEtiketiUzakta(a, b, merkez, etiketKaymasi(objectId, kind, merkez, tamKutu.genislik), 18 * etiketOlcegi);
    const satirlar = [uzak ? yazi.tam : yazi.kisa];
    return {
      merkez,
      uzak,
      satirlar,
      olcu: uzak ? kutuOlcusu(satirlar, fs(11, 'measure')) : yazi.kisaKutu,
      donmeAcisi: uzak ? 0 : etiketAcisi(b.x - a.x, b.y - a.y),
      sesli: yazi.sesli,
      ipucu: yazi.ipucu,
    };
  }, [etiketKaymasi, etiketAyrikMi, etiketOlcegi, fs]);

  const sliderScope = useMemo(() => {
    const scope: Record<string, number> = {};
    for (const obj of objects) {
      if (obj.type === 'slider') {
        const s = obj as SliderObject;
        scope[s.variableName] = s.value;
      }
    }
    return scope;
  }, [objects]);

  // İlk görünüm ve proje/etkinlik yükleme WorkspaceContext tarafından yönetilir.
  // Tuval 3B'den dönünce yeniden bağlanabilir; kayıtlı yakınlaştırmayı sıfırlama.

  // Görünür dünya sınırları ve ızgara çizgileri
  const worldBounds = useMemo(() => getVisibleWorldBounds(viewport), [viewport]);
  // Çizilen ızgara adımı: Ayarlar > Izgara aralığı "Otomatik" ise yakınlaştırmaya göre, değilse girilen sabit aralık
  const gridInfo = useMemo(
    () => visibleGridStep(viewport),
    [viewport.zoom, viewport.gridStep, viewport.gridStepAuto] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Izgara çizgilerini ve eksen çentiklerini hesapla (Tam Ekran Kapsamı)
  const gridLines = useMemo(() => {
    if (!viewport.showGrid && !viewport.showAxes) return { xLines: [], yLines: [] };

    const { minX, maxX, minY, maxY } = worldBounds;
    const step = gridInfo.step;
    const buffer = step * 16; // Genişletilmiş sınır ile tüm yönlerde (özellikle -Y yönünde) tam ekran kapsar

    const startX = Math.floor((minX - buffer) / step) * step;
    const endX = Math.ceil((maxX + buffer) / step) * step;
    const startY = Math.floor((minY - buffer) / step) * step;
    const endY = Math.ceil((maxY + buffer) / step) * step;

    const xLines: number[] = [];
    for (let x = startX; x <= endX; x += step) {
      xLines.push(Number(x.toFixed(4)));
    }

    const yLines: number[] = [];
    for (let y = startY; y <= endY; y += step) {
      yLines.push(Number(y.toFixed(4)));
    }

    return { xLines, yLines };
  }, [worldBounds, gridInfo.step, viewport.showGrid, viewport.showAxes]);

  // Izgaraya yapıştırma (çizilen uyarlanabilir ızgara adımıyla)
  const snapIfEnabled = (p: Point2D): Point2D =>
    // Tek yakalama kuralı: mod (Otomatik / Sıçra / Sabitli / Kapalı) ve ızgara biçimi (kareli / noktalı / izometrik)
    snapPointToGrid(p, viewport, gridInfo.step);

  // Yeni nokta nesnesi üretici
  const makePoint = (label: string, x: number, y: number, color: string): PointObject => ({
    id: createId('pt'),
    type: 'point',
    label,
    showLabel: true,
    x,
    y,
    color,
    visible: true,
    isIndependent: true,
    createdAt: Date.now(),
  });

  const existingPointLabels = () =>
    (objects.filter((o) => o.type === 'point') as PointObject[]).map((p) => p.label);

  // Sürükleme çapası: bir nesnenin ızgaraya yapıştırılacak referans noktası
  const getAnchorId = (obj: MathObject): string | null => {
    switch (obj.type) {
      case 'point':
      case 'text':
      case 'fraction':
      case 'image':
      case 'pen':
        return obj.id;
      case 'polygon':
        return obj.pointIds[0] ?? null;
      case 'segment':
        return obj.startPointId;
      case 'line':
        return obj.point1Id;
      case 'ray':
        return obj.startPointId;
      case 'circle':
        return obj.centerPointId;
      case 'ellipse':
        return obj.centerPointId;
      case 'arc':
      case 'sector':
        // Izgaraya yapıştırma yayın MERKEZİNE göre yapılır: sürüklerken merkez tam kareye oturur
        return obj.centerPointId;
      case 'angle':
        return obj.vertexPointId;
      default:
        return null;
    }
  };

  const getAnchorPosition = (id: string | null): Point2D | null => {
    if (!id) return null;
    const pt = pointsById.get(id);
    if (pt) return { x: pt.x, y: pt.y };
    const obj = objects.find((o) => o.id === id);
    if (!obj) return null;
    if (obj.type === 'text' || obj.type === 'fraction' || obj.type === 'image') return { x: obj.x, y: obj.y };
    if (obj.type === 'pen') return obj.points[0] ?? null;
    return null;
  };

  // Fare Koordinatını Güncelleme
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const world = screenToWorld({ x: screenX, y: screenY }, viewport);
    setMouseWorldPos(world);

    if (isDrawingPen) {
      setCurrentPenStroke((prev) => [...prev, world]);
      return;
    }

    if (dragCreateStart) {
      setDragCreateCurrent(snapIfEnabled(world));
      return;
    }

    if (selectionMarquee) {
      setSelectionMarquee((prev) => (prev ? { ...prev, currentWorld: world } : null));

      const minX = Math.min(selectionMarquee.startWorld.x, world.x);
      const maxX = Math.max(selectionMarquee.startWorld.x, world.x);
      const minY = Math.min(selectionMarquee.startWorld.y, world.y);
      const maxY = Math.max(selectionMarquee.startWorld.y, world.y);

      if (Math.hypot(maxX - minX, maxY - minY) > 0.05) {
        const enclosedIds = objects
          .filter((o) => isObjectInMarquee(o, pointsById, minX, maxX, minY, maxY))
          .map((o) => o.id);
        // Shift/Ctrl ile başlatıldıysa önceki seçim korunur (ekleyerek seçim)
        setSelectedObjectIds(
          selectionMarquee.baseIds.length > 0
            ? Array.from(new Set([...selectionMarquee.baseIds, ...enclosedIds]))
            : enclosedIds
        );
      }
      return;
    }

    // PERGEL önizlemesi: açıklık yatayda ölçülür, sonra yay taranır
    if (activeTool === 'compass' && pergel) {
      const ham = Math.atan2(world.y - pergel.merkez.y, world.x - pergel.merkez.x);
      const aci = ham < 0 ? ham + 2 * Math.PI : ham;
      if (pergel.yaricap === null) {
        // Açıklık aşaması: iğne ile imleç arasındaki GERÇEK uzaklık ölçülür.
        // Yalnızca yatay bileşen alınınca fareyi yukarı-aşağı oynatmak hiçbir şey
        // yapmıyor, kullanıcı açıklığı istediği gibi ayarlayamıyordu. Ekranda
        // açıklık yine yatay bir çubuk olarak gösterilir.
        setPergel((p) =>
          p ? { ...p, tarama: Math.hypot(world.x - p.merkez.x, world.y - p.merkez.y) } : p
        );
      } else if (pergel.baslangic === null) {
        // Başlangıç aşaması: kalemin çember üzerindeki yeri
        setPergel((p) => (p ? { ...p, tarama: aci } : p));
      } else {
        // Tarama aşaması: imlecin GİTTİĞİ yöne göre işaretli olarak birikir.
        // Böylece kullanıcı yayı saat yönünde de, tersinde de çizebilir; tek yöne
        // zorlamak, başlangıç noktasından geriye doğru yay çizmeyi imkânsız kılıyordu.
        setPergel((p) => {
          if (!p) return p;
          let fark = aci - p.sonHamAci;
          // En kısa dönüşü al: (-π, π]. Aksi hâlde 359° -> 1° geçişinde sıçrar.
          while (fark <= -Math.PI) fark += 2 * Math.PI;
          while (fark > Math.PI) fark -= 2 * Math.PI;
          const ham = Math.max(-2 * Math.PI, Math.min(2 * Math.PI, p.tarama + fark));
          return { ...p, tarama: ham, sonHamAci: aci };
        });
      }
      return;
    }

    // Etiket sürükleniyorsa şekil sürüklemesi devreye girmemeli
    if (labelDragRef.current) return;

    if (draggingSolidState) {
      const dx = world.x - draggingSolidState.startWorld.x;
      const dy = world.y - draggingSolidState.startWorld.y;
      if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4) {
        onUpdateSolidPosition?.(draggingSolidState.solidId, {
          x: Number((draggingSolidState.initialPos.x + dx).toFixed(2)),
          y: Number((draggingSolidState.initialPos.y + dy).toFixed(2)),
          z: draggingSolidState.initialPos.z,
        });
        if (!draggingSolidState.hasMoved) {
          setDraggingSolidState((prev) => (prev ? { ...prev, hasMoved: true } : null));
        }
      }
      return;
    }

    if (draggingObjState) {
      // Çapa noktasının SON konumunu hesapla (delta değil, hedef konum ızgaraya yapıştırılır)
      const anchorPos = getAnchorPosition(draggingObjState.anchorId);
      let delta: Point2D;
      let capa: { id: string; delta: Point2D } | undefined;
      let hedef: Point2D | null = null;
      if (anchorPos) {
        const target = snapIfEnabled({
          x: world.x + draggingObjState.anchorOffset.x,
          y: world.y + draggingObjState.anchorOffset.y,
        });
        hedef = target;
        // Kilit yüzünden çapa hedefe tam gidemeyebilir. Seçimin geri kalanı farenin GERÇEK adımını (hedef − çapanın
        // kısıtsız olsaydı bulunacağı yer) alır; çapanın grubu eksik kalan kısmı da yeniden ister ki taşıyıcısı
        // boyunca imleci izlesin. Aksi hâlde kilitli noktadan tutulunca serbest şekiller her karede fazla kayıyordu.
        const sanalCapa = draggingObjState.virtualAnchor ?? anchorPos;
        delta = { x: target.x - sanalCapa.x, y: target.y - sanalCapa.y };
        // İnşa noktası (orta nokta, kesişim…) çapaysa konumunu bağlı olduğu nesneler belirler: eksik kısmı yeniden
        // istemek onu her karede daha ileri itmeye çalışıp grubunu kaçırıyordu; o zaman grup da farenin adımını alır.
        if (draggingObjState.anchorId && !pointsById.get(draggingObjState.anchorId)?.construction) {
          capa = { id: draggingObjState.anchorId, delta: { x: target.x - anchorPos.x, y: target.y - anchorPos.y } };
        }
      } else {
        delta = { x: world.x - draggingObjState.lastWorld.x, y: world.y - draggingObjState.lastWorld.y };
      }

      if (Math.abs(delta.x) > 1e-9 || Math.abs(delta.y) > 1e-9) {
        moveObjects(draggingObjState.objectIds, delta, false, capa);
        setDraggingObjState((prev) =>
          prev
            ? {
                ...prev,
                lastWorld: world,
                hasMoved: true,
                virtualAnchor: hedef,
              }
            : null
        );
      }
      return;
    }

    if (isPanning) {
      const dx = screenX - panStart.x;
      const dy = screenY - panStart.y;
      setViewport((prev) => ({
        ...prev,
        panX: prev.panX + dx,
        panY: prev.panY + dy,
      }));
      setPanStart({ x: screenX, y: screenY });
    }
  };

  // Belirli bir ekran noktası etrafında yakınlaştırma (tekerlek, +/- düğmeleri ortak yol)
  // screenPoint verilmezse görünümün merkezi kullanılır.
  const zoomAt = useCallback(
    (screenPoint: Point2D | null, factor: number) => {
      setViewport((prev) => {
        const newZoom = Math.max(5, Math.min(300, prev.zoom * factor));
        if (newZoom === prev.zoom) return prev;
        const sp = screenPoint ?? { x: prev.width / 2, y: prev.height / 2 };
        // İmlecin (veya merkezin) altındaki dünya koordinatını sabit tut
        const worldAt = screenToWorld(sp, prev);
        return {
          ...prev,
          zoom: newZoom,
          panX: sp.x - prev.width / 2 - worldAt.x * newZoom,
          panY: sp.y - prev.height / 2 + worldAt.y * newZoom,
        };
      });
    },
    [setViewport]
  );

  // Fare Tekerleği ile Yakınlaştırma (Passive: false ile tarayıcı hatasını önleme)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt({ x: e.clientX - rect.left, y: e.clientY - rect.top }, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, [zoomAt]);

  // Görsel dosyası seçildiğinde tuvale ekle
  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const worldPos = pendingImageWorldPosRef.current;
    e.target.value = '';
    if (!file || !worldPos) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : null;
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        const naturalW = img.naturalWidth || 400;
        const naturalH = img.naturalHeight || 400;
        const maxWidthUnits = 6;
        const width = Math.min(maxWidthUnits, Math.max(1, naturalW / 100));
        const height = width * (naturalH / naturalW);
        const label = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Görsel';
        const imgObj: ImageObject = {
          id: createId('img'),
          type: 'image',
          label,
          showLabel: true,
          src,
          x: worldPos.x,
          y: worldPos.y,
          width,
          height,
          color: '#3b82f6',
          visible: true,
          createdAt: Date.now(),
        };
        addObject(imgObj, `"${label}" görseli eklendi`);
        setSelectedObjectId(imgObj.id);
      };
      img.onerror = () => setHintMessage('Görsel okunamadı');
      img.src = src;
    };
    reader.onerror = () => setHintMessage('Görsel okunamadı');
    reader.readAsDataURL(file);
    pendingImageWorldPosRef.current = null;
  };

  // Tuvale Basıldığında
  /**
   * Pergelin bir adımını ilerletir: iğne -> açıklık -> başlangıç -> yay.
   *
   * Ayrı bir işlev olması şart: tıklama boş tuvale de, var olan bir nesnenin
   * üzerine de gelebilir. Nesne üstündeki tıklama `handleObjectMouseDown` ile
   * yutulduğunda pergel adım atlamıyor, kullanıcı ikinci kez tıklayınca
   * başlangıç bambaşka bir yere düşüyordu.
   *
   * Durum `pergelRef` üzerinden okunur: hızlı arka arkaya tıklamalarda kapanışta
   * kalan eski `pergel` değeri yüzünden yanlış aşama ilerlemesin.
   */
  const pergelAdimi = (world: Point2D) => {
    const p = pergelRef.current;
    const d = snapIfEnabled(world);

    // 1) İğne
    if (!p) {
      setPergel({ merkez: d, yaricap: null, baslangic: null, tarama: 0, sonHamAci: 0 });
      setHintMessage('Açıklığı ayarlayın: imleci iğneden uzaklaştırıp tıklayın.');
      return;
    }

    // 2) Açıklık: iğne ile imleç arasındaki gerçek uzaklık
    if (p.yaricap === null) {
      const r = Number(Math.hypot(d.x - p.merkez.x, d.y - p.merkez.y).toFixed(2));
      if (r < 0.05) {
        setHintMessage('Açıklık çok küçük. İğneden uzaklaşıp tıklayın.');
        return;
      }
      // Kalem, açıklığı ayarlarken imlecin bulunduğu yönde durur: başlangıç
      // önizlemesi ilk karede 0°'a sıçramasın, kullanıcı nereye bırakacağını görsün.
      const yon = Math.atan2(world.y - p.merkez.y, world.x - p.merkez.x);
      setPergel({
        ...p,
        yaricap: r,
        tarama: yon < 0 ? yon + 2 * Math.PI : yon,
        sonHamAci: 0,
      });
      setHintMessage(
        `Açıklık ${formatTurkishNumber(r)} br. Şimdi yayın BAŞLANGICINI istediğiniz yere bırakın: imleci çemberin çevresinde gezdirip tıklayın.`
      );
      return;
    }

    // 3) Başlangıç açısı — sabit bir yön dayatılmaz, kullanıcı seçer
    if (p.baslangic === null) {
      const aci = Math.atan2(world.y - p.merkez.y, world.x - p.merkez.x);
      const bas = aci < 0 ? aci + 2 * Math.PI : aci;
      // Tarama buradan itibaren İŞARETLİ olarak birikir; ilk ham açı başlangıçtır
      setPergel({ ...p, baslangic: bas, tarama: 0, sonHamAci: bas });
      setHintMessage(
        `Başlangıç ${Math.round((bas * 180) / Math.PI)}° konuldu. Şimdi istediğiniz yöne dönerek yayı çizin; tam tura getirirseniz çember olur.`
      );
      return;
    }

    // 4) Bitiş: taranan açı kadar yay
    pergeliTamamla(p.merkez, p.yaricap, p.baslangic, p.tarama);
    setPergel(null);
  };

  /**
   * Görünüm kaydırmayı başlatır (El aracı, orta tuş, Alt + sürükle).
   *
   * `pointerId` verilirse imleç KÖK SVG'ye yakalanır: basış bir noktanın ya da
   * şeklin üstünde başlasa bile sonraki pointermove/pointerup olayları tuvale
   * gelir, parmak tuvalin dışına çıksa da kaydırma sürer.
   */
  const kaydirmayaBasla = useCallback((clientX: number, clientY: number, pointerId?: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setIsPanning(true);
    setPanStart({ x: clientX - rect.left, y: clientY - rect.top });
    if (pointerId !== undefined) {
      try {
        svg.setPointerCapture(pointerId);
      } catch {
        /* Yakalama desteklenmiyorsa olağan olay akışı sürer. */
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToWorld({ x: screenX, y: screenY }, viewport);

    // Orta tuş, Alt veya El aracı: her araçta görünümü kaydırma.
    // (Normalde basış buraya hiç gelmez: kök SVG'nin yakalama aşamasındaki
    //  koruma onu daha önce alır — bu dal yalnızca güvenlik ağıdır.)
    if (gorunumKaydirmaBasisiMi(activeTool, e)) {
      e.preventDefault();
      kaydirmayaBasla(e.clientX, e.clientY);
      return;
    }

    // Çizim ve seçim yalnızca sol tuşla
    if (e.button !== 0) return;

    const isBackground =
      e.target === svgRef.current ||
      (e.target as HTMLElement).id === 'grid-background' ||
      // İz çizgisinin görünmez yakalayıcısı yalnız sağ tık içindir; sol tıkta boş alan sayılır
      (e.target as Element).hasAttribute?.('data-iz-yakalayici');

    if (activeTool === 'text') {
      setPendingTextWorldPos(snapIfEnabled(world));
      setEditingTextObj(null);
      setIsTextDialogOpen(true);
      return;
    }

    if (activeTool === 'pen') {
      setIsDrawingPen(true);
      setCurrentPenStroke([world]);
      return;
    }

    if (activeTool === 'image') {
      if (!isBackground) return;
      pendingImageWorldPosRef.current = snapIfEnabled(world);
      imageInputRef.current?.click();
      return;
    }

    if (['square', 'rectangle', 'circle', 'ellipse', 'segment'].includes(activeTool)) {
      const start = snapIfEnabled(world);
      setDragCreateStart(start);
      setDragCreateCurrent(start);
      return;
    }

    // PERGEL: kendi akışı var; boş tuval tıklaması NOKTA ÜRETMEZ.
    if (activeTool === 'compass') {
      pergelAdimi(world);
      return;
    }

    if (isBackground) {
      if (activeTool === 'select') {
        const keepSelection = e.shiftKey || e.ctrlKey;
        if (!keepSelection) {
          setSelectedObjectIds([]);
          onSelectSolid?.(null);
          onSelectSolids?.([]);
        }
        setSelectionMarquee({
          startWorld: world,
          currentWorld: world,
          baseIds: keepSelection ? selectedObjectIds : [],
        });
      } else {
        handleCanvasClick(world);
      }
    }
  };

  // Fare Bırakıldığında
  const handleMouseUp = () => {
    if (isDrawingPen) {
      if (currentPenStroke.length > 1) {
        const newStroke: PenStrokeObject = {
          id: createId('pen'),
          type: 'pen',
          label: 'Serbest Çizim',
          showLabel: false,
          points: currentPenStroke,
          thickness: 3,
          color: '#e11d48',
          visible: true,
          createdAt: Date.now(),
        };
        addObject(newStroke, 'Serbest çizim eklendi');
      }
      setIsDrawingPen(false);
      setCurrentPenStroke([]);
    }

    if (dragCreateStart) {
      const endWorld = dragCreateCurrent || dragCreateStart;
      const dx = Math.abs(endWorld.x - dragCreateStart.x);
      const dy = Math.abs(endWorld.y - dragCreateStart.y);
      const dist = Math.hypot(dx, dy);

      if (dist < 0.4) {
        // Tıklamayla standart boyutlu oluştur
        handleCanvasClick(dragCreateStart);
      } else {
        const x1 = Math.min(dragCreateStart.x, endWorld.x);
        const y1 = Math.min(dragCreateStart.y, endWorld.y);
        const round1 = (v: number) => Number(v.toFixed(1));
        const labels = existingPointLabels();

        if (activeTool === 'square') {
          const side = round1(Math.max(dx, dy));
          const [la, lb, lc, ld] = generateNextPointLabels(labels, 4);
          const color = '#3b82f6';
          const pts = [
            makePoint(la, x1, y1, color),
            makePoint(lb, x1 + side, y1, color),
            makePoint(lc, x1 + side, y1 + side, color),
            makePoint(ld, x1, y1 + side, color),
          ];

          const poly: PolygonObject = {
            id: createId('poly'),
            type: 'polygon',
            label: 'Kare',
            showLabel: true,
            pointIds: pts.map((p) => p.id),
            color: '#f43f5e',
            fillColor: '#f43f5e',
            fillOpacity: 0.18,
            visible: true,
            showArea: true,
            showPerimeter: true,
            createdAt: Date.now(),
          };

          addObjects([...pts, poly], `Kare oluşturuldu (a = ${formatTurkishNumber(side)} br)`);
        } else if (activeTool === 'rectangle') {
          // Köşe konumları, gösterilen (yuvarlanmış) boyutlarla birebir eşleşir
          const rw = round1(dx);
          const rh = round1(dy);
          const [la, lb, lc, ld] = generateNextPointLabels(labels, 4);
          const color = '#3b82f6';
          const pts = [
            makePoint(la, x1, y1, color),
            makePoint(lb, x1 + rw, y1, color),
            makePoint(lc, x1 + rw, y1 + rh, color),
            makePoint(ld, x1, y1 + rh, color),
          ];

          const poly: PolygonObject = {
            id: createId('poly'),
            type: 'polygon',
            label: 'Dikdörtgen',
            showLabel: true,
            pointIds: pts.map((p) => p.id),
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.18,
            visible: true,
            showArea: true,
            showPerimeter: true,
            createdAt: Date.now(),
          };

          addObjects(
            [...pts, poly],
            `Dikdörtgen oluşturuldu (${formatTurkishNumber(rw)} x ${formatTurkishNumber(rh)} br)`
          );
        } else if (activeTool === 'ellipse') {
          // Sürüklenen kutuya İÇTEN teğet elips: yarıçaplar kutunun yarı kenarlarıdır
          const ra = round1(dx / 2);
          const rb = round1(dy / 2);
          const [centerLabel] = generateNextPointLabels(labels, 1);
          const merkez = makePoint(centerLabel, round1(x1 + dx / 2), round1(y1 + dy / 2), '#0ea5e9');
          const elips: EllipseObject = {
            id: createId('elp'),
            type: 'ellipse',
            label: `${centerLabel} Merkezli Elips`,
            showLabel: true,
            centerPointId: merkez.id,
            radiusX: ra,
            radiusY: rb,
            color: '#0ea5e9',
            fillColor: '#0ea5e9',
            fillOpacity: 0.12,
            visible: true,
            showArea: true,
            showPerimeter: true,
            createdAt: Date.now(),
          };
          addObjects(
            [merkez, elips],
            `Elips oluşturuldu (a = ${formatTurkishNumber(ra)} br, b = ${formatTurkishNumber(rb)} br)`
          );
        } else if (activeTool === 'circle') {
          const radius = round1(dist);
          const [centerLabel] = generateNextPointLabels(labels, 1);
          const centerPt = makePoint(centerLabel, dragCreateStart.x, dragCreateStart.y, '#8b5cf6');
          const circ: CircleObject = {
            id: createId('circ'),
            type: 'circle',
            label: `${centerLabel} Merkezli Çember`,
            showLabel: true,
            centerPointId: centerPt.id,
            fixedRadius: radius,
            color: '#8b5cf6',
            visible: true,
            showArea: true,
            showPerimeter: true,
            fillOpacity: 0.1,
            createdAt: Date.now(),
          };
          addObjects([centerPt, circ], `Çember oluşturuldu (r = ${formatTurkishNumber(radius)} br)`);
        } else if (activeTool === 'segment') {
          const [la, lb] = generateNextPointLabels(labels, 2);
          // Uç nokta, önizlemede gösterilen yuvarlanmış uzunluğa oturtulur (kare/dikdörtgen/çemberle tutarlı).
          // Izgaraya Yapış açıkken uç nokta ızgarada kalmalıdır, o yüzden dokunulmaz.
          const endPos = viewport.snapToGrid
            ? endWorld
            : (() => {
                const targetLen = round1(dist);
                return {
                  x: dragCreateStart.x + ((endWorld.x - dragCreateStart.x) / dist) * targetLen,
                  y: dragCreateStart.y + ((endWorld.y - dragCreateStart.y) / dist) * targetLen,
                };
              })();
          const p1 = makePoint(la, dragCreateStart.x, dragCreateStart.y, '#0284c7');
          const p2 = makePoint(lb, endPos.x, endPos.y, '#0284c7');
          const seg: SegmentObject = {
            id: createId('seg'),
            type: 'segment',
            label: `[${la}${lb}]`,
            showLabel: true,
            startPointId: p1.id,
            endPointId: p2.id,
            color: '#0284c7',
            visible: true,
            showLength: true,
            thickness: 2.5,
            createdAt: Date.now(),
          };
          addObjects([p1, p2, seg], `[${la}${lb}] doğru parçası oluşturuldu`);
        }
      }
      setDragCreateStart(null);
      setDragCreateCurrent(null);
    }

    if (selectionMarquee) {
      setSelectionMarquee(null);
    }

    if (draggingSolidState) {
      if (draggingSolidState.hasMoved) {
        onDragEnd?.();
      }
      setDraggingSolidState(null);
    }

    if (draggingObjState) {
      if (draggingObjState.hasMoved) {
        const moved = draggingObjState.objectIds
          .map((id) => objects.find((o) => o.id === id))
          .filter(Boolean) as MathObject[];
        const desc =
          moved.length === 1
            ? `${moved[0].label || 'Nesne'} taşındı`
            : `${draggingObjState.objectIds.length} nesne taşındı`;
        recordHistory(desc);
      }
      setDraggingObjState(null);
    }

    setIsPanning(false);
  };

  // Nesne veya Nokta Sürükleme Başlat (Seç ve Taşı)
  /**
   * Nesneye sağ tıklandığında bağlam menüsünü açar.
   * Menü açılmadan önce nesne seçilir; böylece "menü hangi nesneyi konuşuyor" görsel olarak bellidir.
   */
  /**
   * Çokgende, verilen EKRAN noktasına en yakın kenarın dizinini döndürür.
   * Kullanıcı "şu kenarı ölç" derken tıkladığı yeri kastettiği için karşılaştırma
   * dünya biriminde değil, gördüğü ekran pikselinde yapılır.
   */
  const enYakinKenar = useCallback(
    (poly: PolygonObject, ekran: Point2D): number | null => {
      const kose = poly.pointIds
        .map((id) => pointsById.get(id))
        .filter((p): p is PointObject => p !== undefined);
      if (kose.length !== poly.pointIds.length || kose.length < 3) return null;
      const ekranKose = kose.map((p) => worldToScreen(p, viewport));
      // Şeklin ORTASINA tıklandığında "hangi kenar?" belirsizdir; o yüzden
      // yalnızca imleç bir kenara makul yakınlıktaysa (60 px) kenar maddesi gösterilir.
      return findNearestEdgeIndex(ekranKose, ekran, 60);
    },
    [pointsById, viewport]
  );

  /**
   * Noktaların 18 px'lik görünmez yakalayıcı daireleri üst üste biner; SONRA çizilen komşu nokta sağ
   * tıklamayı / uzun basmayı çalıyordu (gri kilitli noktaya sağ tıklayınca komşunun "Kilitle" menüsü
   * açılıyordu). İmlecin altındaki noktalardan GÖVDESİ en yakın olanı döndürür.
   */
  const imlecinNoktasi = useCallback(
    (clientX: number, clientY: number, obj: MathObject): MathObject => {
      if (obj.type !== 'point' || !svgRef.current) return obj;
      const rect = svgRef.current.getBoundingClientRect();
      const uzaklik = (p: PointObject) => {
        const s = worldToScreen(p, viewport);
        return Math.hypot(s.x - (clientX - rect.left), s.y - (clientY - rect.top));
      };
      let enYakin = obj as PointObject;
      for (const el of document.elementsFromPoint(clientX, clientY)) {
        const id = el.closest('[data-object-id]')?.getAttribute('data-object-id');
        const aday = id ? pointsById.get(id) : undefined;
        if (aday && uzaklik(aday) < uzaklik(enYakin)) enYakin = aday;
      }
      return enYakin;
    },
    [pointsById, viewport]
  );

  /**
   * İmlecin ALTINDAKİ bütün çizim nesneleri, üstten alta. Üst üste binmiş kenarlarda (ve nokta +
   * kenar gibi yığınlarda) menü bunları sekme olarak gösterir; kullanıcı menüyü kapatmadan
   * hangi nesneyi konuşacağını seçer. Tıklanan nesne her zaman ilk sekmedir.
   */
  const imlecinAltindakiler = useCallback(
    (clientX: number, clientY: number, tiklanan: MathObject, noktaGovdesi = false): MathObject[] => {
      const kimlikler = new Set<string>();
      const svg = svgRef.current;
      const topla = (x: number, y: number) => {
        if (typeof document === 'undefined' || !document.elementsFromPoint) return;
        for (const el of document.elementsFromPoint(x, y)) {
          if (svg && !svg.contains(el)) continue;
          const id = el.closest('[data-object-id]')?.getAttribute('data-object-id');
          if (id) kimlikler.add(id);
        }
      };
      topla(clientX, clientY);
      // Noktanın 18 px yakalama alanı çizgi uçlarından daha büyüktür. Gövdeye tıklamada
      // gerçek merkez de taranır: birkaç piksel kayık sağ tık, bağlı kenarları kaybetmesin.
      if (noktaGovdesi && tiklanan.type === 'point' && svg) {
        const rect = svg.getBoundingClientRect();
        const merkez = worldToScreen(tiklanan as PointObject, viewport);
        topla(rect.left + merkez.x, rect.top + merkez.y);
      }
      return contextMenuTargets(objects, tiklanan, [...kimlikler], noktaGovdesi);
    },
    [objects, viewport]
  );

  const openContextMenu = useCallback(
    (e: React.MouseEvent, tiklanan: MathObject) => {
      e.preventDefault();
      e.stopPropagation();
      // Yalnızca noktanın yakalayıcı dairesine tıklandıysa hedef düzeltilir; ad etiketine tıklama olduğu gibi kalır.
      const noktaGovdesi = (e.target as Element).tagName.toLowerCase() === 'circle';
      const obj = noktaGovdesi ? imlecinNoktasi(e.clientX, e.clientY, tiklanan) : tiklanan;
      // Sağ tıklanan nesne ZATEN çoklu seçimin parçasıysa seçim korunur.
      // Aksi hâlde "5 noktayı birleştir" gibi çoklu seçim maddeleri, menü açılır
      // açılmaz seçim tek nesneye indiği için hiç görünmüyordu.
      // (setSelectedObjectId burada ÇAĞRILMAZ: o da seçimi tek nesneye indirir.)
      setSelectedObjectIds(contextMenuSelection(selectedObjectIds, obj.id));
      let edgeIndex: number | null = null;
      if (obj.type === 'polygon' && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        edgeIndex = enYakinKenar(obj as PolygonObject, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      setContextTarget({ obj, x: e.clientX, y: e.clientY, edgeIndex, adaylar: imlecinAltindakiler(e.clientX, e.clientY, obj, noktaGovdesi) });
      menuAcilisZamaniRef.current = Date.now();
    },
    [setSelectedObjectIds, selectedObjectIds, enYakinKenar, imlecinNoktasi, imlecinAltindakiler]
  );

  /** Dokunmatik cihazlarda 600 ms basılı tutmak menüyü açar; 12 px'ten fazla kayma sürükleme sayılır. */
  const handleTouchStartOnObject = useCallback(
    (e: React.TouchEvent, obj: MathObject) => {
      // El aracında parmak sürüklemesi görünümü kaydırır; uzun basış menüsü açılmaz (gorunumKaydirma.ts)
      if (!nesneBasisiIslenmeli(activeTool)) return;
      const t = e.touches[0];
      if (!t) return;
      const startX = t.clientX;
      const startY = t.clientY;
      // Sağ tıklamadaki gibi yalnızca noktanın yakalayıcı dairesine basıldıysa hedef düzeltilir (ad etiketi olduğu gibi kalır)
      const yakalayici = (e.target as Element).tagName.toLowerCase() === 'circle';
      const timer = window.setTimeout(() => {
        // Üst üste binen yakalayıcılarda parmağın altındaki noktanın menüsü açılır
        const hedef = yakalayici ? imlecinNoktasi(startX, startY, obj) : obj;
        // Parmağın altındaki nesne çoklu seçimdeyse seçim korunur; zamanlayıcı eski seçimi görmesin diye güncel değerden
        setSelectedObjectIds((onceki) => contextMenuSelection(onceki, hedef.id));
        let edgeIndex: number | null = null;
        if (hedef.type === 'polygon' && svgRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          edgeIndex = enYakinKenar(hedef as PolygonObject, { x: startX - rect.left, y: startY - rect.top });
        }
        setContextTarget({ obj: hedef, x: startX, y: startY, edgeIndex, adaylar: imlecinAltindakiler(startX, startY, hedef, yakalayici) });
        menuAcilisZamaniRef.current = Date.now();
        longPressRef.current = null;
      }, 600);
      longPressRef.current = { timer, startX, startY, obj };
    },
    [activeTool, setSelectedObjectIds, enYakinKenar, imlecinNoktasi, imlecinAltindakiler]
  );

  const cancelLongPress = useCallback((e?: React.TouchEvent) => {
    const lp = longPressRef.current;
    if (!lp) return;
    if (e) {
      const t = e.touches[0];
      if (t && Math.hypot(t.clientX - lp.startX, t.clientY - lp.startY) <= 12) return;
    }
    window.clearTimeout(lp.timer);
    longPressRef.current = null;
  }, []);

  useEffect(() => () => {
    if (longPressRef.current) window.clearTimeout(longPressRef.current.timer);
  }, []);

  /**
   * Verilen nesnenin ÜZERİNDE duran noktalar (nesnenin kendi tanım noktaları hariç).
   * "Şu noktadan böl" maddelerini kurmak için gerekir.
   */
  const uzerindekiNoktalar = useCallback(
    (obj: MathObject): PointObject[] => {
      const ESIK = 1e-3;
      const tanim = new Set(objectDependencies(obj));
      const aday = objects.filter(
        (o): o is PointObject => o.type === 'point' && !tanim.has(o.id) && o.visible !== false
      );
      const nk = (id: string) => pointsById.get(id);

      // Nesneye BAĞLI doğmuş noktalar her zaman üzerindedir; geometrik eşiğe
      // bakmaya gerek yok (yuvarlama yüzünden eşiği kıl payı kaçırabilirler).
      const bagli = aday.filter((p) => p.onObjectId === obj.id);
      const birlestir = (geometrik: PointObject[]): PointObject[] => {
        const gorulen = new Set(bagli.map((p) => p.id));
        return [...bagli, ...geometrik.filter((p) => !gorulen.has(p.id))];
      };

      if (obj.type === 'segment') {
        const a = nk(obj.startPointId);
        const b = nk(obj.endPointId);
        if (!a || !b) return [];
        return birlestir(aday.filter((p) => distanceToSegment(p, a, b).distance < ESIK));
      }
      if (obj.type === 'circle') {
        const c = obj as CircleObject;
        const merkez = nk(c.centerPointId);
        if (!merkez) return [];
        const yari = c.radiusPointId ? nk(c.radiusPointId) : undefined;
        const r = c.fixedRadius ?? (yari ? calculateDistance(merkez, yari) : 0);
        if (!(r > 0)) return [];
        return birlestir(aday.filter((p) => Math.abs(calculateDistance(merkez, p) - r) < ESIK));
      }
      if (obj.type === 'arc') {
        const merkez = nk(obj.centerPointId);
        const bas = nk(obj.startPointId);
        const bit = nk(obj.directionPointId);
        if (!merkez || !bas || !bit) return [];
        const r = calculateDistance(merkez, bas);
        const geo = getArcGeometry(merkez, bas, bit);
        return birlestir(
          aday.filter((p) => {
          if (Math.abs(calculateDistance(merkez, p) - r) >= ESIK) return false;
          if (!geo) return true;
          // Nokta yayın TARANAN bölümünde mi?
          const aci = Math.atan2(p.y - merkez.y, p.x - merkez.x);
          const fark = ((aci - geo.startAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
          return fark > 1e-6 && fark < geo.sweep - 1e-6;
          })
        );
      }
      return bagli;
    },
    [objects, pointsById]
  );

  /** Sağ tıklanan nesnenin türüne göre menü maddelerini üretir. */
  const contextMenuItems = useMemo<ContextMenuItem[]>(() => {
    const hedef = objects.find(o => o.id === contextTarget?.obj?.id);
    const pasteItem: ContextMenuItem = {
      id: 'yapistir', label: 'Yapıştır', disabled: !objectClipboard?.objects.length,
      onSelect: () => {
        if (!objectClipboard || !contextTarget || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const location = screenToWorld({ x: contextTarget.x - rect.left, y: contextTarget.y - rect.top }, viewport);
        const pasted = pasteObjects(objectClipboard, objects, location);
        addObjects(pasted.objects, 'Nesneler yapıştırıldı');
        setSelectedObjectIds(pasted.selectedIds);
        setActiveTool('select');
      },
    };
    if (!hedef) {
      // BOŞ ALAN (Grafik) MENÜSÜ: eksenler, ızgara biçimi, ızgaraya sıçrama, izler, sığdırma, ayarlar.
      // Yapıştır yalnızca panoda nesne varken en üstte görünür.
      const izVar = Object.keys(traces).length > 0;
      const izgaraBicimi = viewport.showGrid ? viewport.gridStyle ?? 'kareli' : 'yok';
      const izgaraSec = (bicim: 'yok' | 'kareli' | 'noktali' | 'izometrik') =>
        setViewport((prev) =>
          bicim === 'yok' ? { ...prev, showGrid: false } : { ...prev, showGrid: true, gridStyle: bicim }
        );
      const bostaMaddeler: ContextMenuItem[] = [
        {
          id: 'eksenleri-goster',
          label: 'Eksenleri Göster',
          icon: <EksenSimgesi />,
          checked: viewport.showAxes,
          separatorBefore: !!objectClipboard?.objects.length,
          onSelect: () => setViewport((prev) => ({ ...prev, showAxes: !prev.showAxes })),
        },
        {
          id: 'izgarayi-goster',
          label: 'Izgarayı Göster',
          icon: <Grid3x3 className="w-4 h-4" />,
          submenu: [
            { id: 'izgara-yok', label: 'Izgara yok', icon: <IzgaraSimgesi bicim="yok" />, radio: true, checked: izgaraBicimi === 'yok', onSelect: () => izgaraSec('yok') },
            { id: 'izgara-kareli', label: 'Kareli ızgara', icon: <IzgaraSimgesi bicim="kareli" />, radio: true, checked: izgaraBicimi === 'kareli', onSelect: () => izgaraSec('kareli') },
            { id: 'izgara-noktali', label: 'Noktalı ızgara', icon: <IzgaraSimgesi bicim="noktali" />, radio: true, checked: izgaraBicimi === 'noktali', onSelect: () => izgaraSec('noktali') },
            { id: 'izgara-izometrik', label: 'İzometrik ızgara', icon: <IzgaraSimgesi bicim="izometrik" />, radio: true, checked: izgaraBicimi === 'izometrik', onSelect: () => izgaraSec('izometrik') },
          ],
        },
        {
          id: 'izgaraya-sicra',
          label: 'Izgaraya Sıçra',
          icon: <Magnet className="w-4 h-4" />,
          checked: viewport.snapToGrid,
          onSelect: () =>
            setViewport((prev) =>
              prev.snapToGrid
                ? { ...prev, snapToGrid: false, pointSnapMode: 'off' }
                : {
                    ...prev,
                    snapToGrid: true,
                    pointSnapMode: prev.pointSnapMode && prev.pointSnapMode !== 'off' ? prev.pointSnapMode : 'snapToGrid',
                  }
            ),
        },
        // Eşit uzunluk/yay çentikleri (otomatik); elle konanlar kapalıyken de çizilir
        esitUzunluklarMaddesi(viewport.showEqualityMarks !== false, () =>
          setViewport((prev) => ({ ...prev, showEqualityMarks: prev.showEqualityMarks === false }))
        ),
        // Ayrıntı görünümü (eskiden tuvalin sol üst köşesindeki açılır menü): Ayrıntılı = ölçüler ve
        // koordinatlar görünür; Sade = yalnız çizim
        {
          id: 'gorunum-ayrintili',
          label: 'Ayrıntılı Görünüm',
          radio: true,
          checked: styleMode === 'Ayrıntılı',
          separatorBefore: true,
          onSelect: () => {
            setStyleMode('Ayrıntılı');
            setViewport((prev) => ({ ...prev, showMeasurements: true }));
          },
        },
        {
          id: 'gorunum-sade',
          label: 'Sade Görünüm',
          radio: true,
          checked: styleMode === 'Sade',
          onSelect: () => {
            setStyleMode('Sade');
            setViewport((prev) => ({ ...prev, showCoordinates: false, showMeasurements: false }));
          },
        },
        {
          id: 'izleri-temizle',
          label: 'Tüm İzleri Temizle',
          icon: <RotateCcw className="w-4 h-4" />,
          separatorBefore: true,
          disabled: !izVar,
          onSelect: () => clearTraces(),
        },
        {
          id: 'tum-nesneleri-goster',
          label: 'Tüm Nesneleri Göster',
          icon: <SquareMousePointer className="w-4 h-4" />,
          onSelect: () => fitToObjects(),
        },
        {
          id: 'ayarlar',
          label: 'Ayarlar',
          icon: <Settings className="w-4 h-4" />,
          onSelect: () => window.dispatchEvent(new CustomEvent('geoeba:calisma-ayarlari', { detail: 'duzlem' })),
        },
      ];
      // İz çizgisine sağ tıklandıysa en üstte yalnız o izi silen madde
      const izHedefi = contextTarget?.izId && traces[contextTarget.izId] ? contextTarget.izId : null;
      const izSahibi = izHedefi ? objects.find((o) => o.id === izHedefi) : undefined;
      const izMaddesi: ContextMenuItem[] = izHedefi
        ? [
            {
              id: 'bu-izi-sil',
              label: izSahibi?.label ? `${izSahibi.label} noktasının izini sil` : 'Bu izi sil',
              icon: <Trash2 className="w-4 h-4" />,
              danger: true,
              onSelect: () => clearTrace(izHedefi),
            },
          ]
        : [];
      if (izMaddesi.length) bostaMaddeler[0] = { ...bostaMaddeler[0], separatorBefore: true };
      return [...izMaddesi, ...(objectClipboard?.objects.length ? [pasteItem] : []), ...bostaMaddeler];
    }
    const targetIds = selectedObjectIds.includes(hedef.id) ? selectedObjectIds : [hedef.id];
    const maddeler: ContextMenuItem[] = [
      { id: 'kopyala', label: 'Kopyala', onSelect: () => {
        setObjectClipboard(copyObjects(objects, targetIds));
        setHintMessage('Kopyalandı. Yapıştırmak istediğiniz yere sağ tıklayın.');
      } },
      pasteItem,
    ];
    if (activeTool !== 'select') {
      maddeler.unshift({ id: 'tasi', label: 'Taşı (V)', onSelect: () => {
        setSelectedObjectIds(targetIds);
        setActiveTool('select');
      } });
    }

    // YAY ÖLÇ (çember bölünmeden, src/math/arcMeasure.ts): madde ölçümün EKRANDAKİ durumunu söyler.
    // İşaretliyse (görünür ölçüm) seçmek ölçümü kaldırır; gizli ya da Sade görünümdeyse yeniden gösterir.
    const yayAcik = (o: ArcPairOption) => !!o.existingId && !!o.existingShown && showDetails;
    const yayKaldir = (o: ArcPairOption) => {
      if (!o.existingId) return;
      deleteObjects([o.existingId]);
      setHintMessage(`${o.title} ölçümü kaldırıldı. Geri almak için Geri Al'ı (Ctrl+Z) kullanın.`);
    };
    const yayMaddesi = (o: ArcPairOption): ContextMenuItem => ({
      id: `yay-olc-${o.circleId}-${o.pointIds.join('-')}`,
      label: `${o.title} (${formatTurkishNumber(o.degrees, 1)}°)`,
      checked: yayAcik(o),
      onSelect: () => (yayAcik(o) ? yayKaldir(o) : measureArcBetween(o.pointIds[0], o.pointIds[1], { circleId: o.circleId })),
    });
    // İki nokta seçiliyken (Shift ile) birine sağ tıklanınca: "BD yayını ölç" menünün başında
    if (hedef.type === 'point') {
      const seciliIki = selectedObjectIds.filter((id) => pointsById.has(id));
      if (seciliIki.length === 2 && seciliIki.includes(hedef.id)) {
        const ciftSecenekleri = arcOptionsForPair(seciliIki[0], seciliIki[1], objects);
        ciftSecenekleri.forEach((o, i) => {
          const cemberAdi = ciftSecenekleri.length > 1 ? ` (${objects.find((c) => c.id === o.circleId)?.label || 'çember'})` : '';
          const olcAdi = o.title.replace(/ yayı$/, ' yayını').replace(/ yarım çemberi$/, ' yarım çemberini');
          maddeler.push({
            id: `yay-olc-cift-${o.circleId}`,
            label: yayAcik(o) ? `${o.title} ölçümünü kaldır${cemberAdi}` : `${olcAdi} ölç${cemberAdi}`,
            separatorBefore: i === 0,
            onSelect: () => (yayAcik(o) ? yayKaldir(o) : measureArcBetween(o.pointIds[0], o.pointIds[1], { circleId: o.circleId })),
          });
        });
      }
    }

    // PARÇALI UZUNLUK: "[AB] baştan sona" + aradaki her nokta için "[AP] P noktasına kadar" /
    // "[PB] P noktasından sona". Metin ölçümün EKRANDAKİ durumunu söyler (ölç ↔ gizle); ayrıntılar
    // kapalıyken etiket görünmediği için "ölç" yazar (seçilince ayrıntılar açılır).
    const uzunlukMaddesi = (o: LengthOption, ayiriciOnce: boolean, ekGoster: boolean): ContextMenuItem => {
      const ad = `[${pointsById.get(o.fromId)?.label ?? '?'}${pointsById.get(o.toId)?.label ?? '?'}]`;
      const ara = o.viaId ? pointsById.get(o.viaId)?.label ?? '?' : '';
      const ek = !ekGoster
        ? ''
        : o.role === 'whole'
        ? ' (baştan sona)'
        : o.role === 'piece'
        ? ' (bu parça)'
        : o.role === 'toPoint'
        ? ` (${ara} noktasına kadar)`
        : o.role === 'fromPoint'
        ? ` (${ara} noktasından sona kadar)`
        : ` (${pointsById.get(o.fromId)?.label ?? '?'} ile ${pointsById.get(o.toId)?.label ?? '?'} arası)`;
      const acik = showDetails && isLengthShown(objects, o.fromId, o.toId);
      return {
        id: `olc-uzunluk-${o.fromId}-${o.toId}`,
        label: `${ad} uzunluğunu ${acik ? 'gizle' : 'ölç'}${ek}`,
        separatorBefore: ayiriciOnce,
        onSelect: () => setLengthMeasurement(o.fromId, o.toId, !acik),
      };
    };

    if (hedef.type === 'segment') {
      const seg = hedef as SegmentObject;
      const ustunde = uzerindekiNoktalar(seg);
      if (ustunde.length > 0) {
        const p = ustunde.find((o) => selectedObjectIds.includes(o.id)) || ustunde[0];
        maddeler.push({
          id: 'parcaya-ayir',
          label: `${p.label} noktasından ikiye ayır`,
          onSelect: () => splitSegmentAtPoint(seg.id, p.id),
        });
      }
      const a = pointsById.get(seg.startPointId);
      const b = pointsById.get(seg.endPointId);
      const uzunluk = a && b ? calculateDistance(a, b) : 0;
      const { options: uzunluklar } = straightLengthOptions(objects, seg.id);
      if (uzunluklar.length === 0) {
        maddeler.push({ id: 'olc-uzunluk', label: 'Uzunluğunu ölç', onSelect: () => measureLength(seg.id) });
      }
      uzunluklar.forEach((o, i) => maddeler.push(uzunlukMaddesi(o, i === 0, uzunluklar.length > 1)));
      maddeler.push({
        id: 'ayarla-uzunluk',
        label: 'Uzunluğu ayarla…',
        prompt: {
          scope: sliderScope,
          label: 'Uzunluk',
          unit: 'br',
          initial: formatTurkishNumber(uzunluk),
          onSubmit: (v) => setSegmentLength(seg.id, v),
        },
      });
    } else if (hedef.type === 'line' || hedef.type === 'ray') {
      maddeler.push({ id: 'olc-uzunluk', label: hedef.showLength ? 'İki nokta arasındaki mesafeyi gizle' : 'İki nokta arasındaki mesafeyi ölç',
        onSelect: () => hedef.showLength ? hideMeasurement(hedef.id, 'length') : measureLength(hedef.id) });
      // Üzerine nokta konmuş doğru/ışın: tanım noktaları dışındaki çiftler için kısmi uzunluklar
      const tanimCifti = straightEnds(hedef);
      straightLengthOptions(objects, hedef.id)
        .options.filter((o) => !samePair([o.fromId, o.toId], tanimCifti))
        .forEach((o) => maddeler.push(uzunlukMaddesi(o, false, true)));
      if (hedef.type === 'line') maddeler.push({ id: 'denklem', label: hedef.showEquation ? 'Denklemi gizle' : 'Denklemi göster',
        onSelect: () => updateObject(hedef.id, { showEquation: !hedef.showEquation } as Partial<MathObject>, true) });
    } else if (hedef.type === 'point') {
      // ÜST ÜSTE GELEN NOKTALARI BİRLEŞTİR (src/math/noktaBirlestir.ts).
      // İki nokta aynı yere gelince ekranda iki ad yan yana durur ama sahnede İKİ nokta vardır: biri
      // sürüklenince çizim ikiye ayrılır. Bu madde ikisini tek noktaya indirir; kalan noktanın hangisi
      // olduğunu (ve kaç nesnenin taşındığını) seçilince ipucu satırı söyler. Madde yalnızca gerçekten
      // birleştirilebilecek durumlarda çıkar: noktalar üst üsteyse ya da kullanıcı tam iki noktayı seçtiyse.
      const secimdekiNoktalar = selectedObjectIds.filter((id) => pointsById.has(id));
      const secilenEs = secimdekiNoktalar.length === 2 && secimdekiNoktalar.includes(hedef.id)
        ? pointsById.get(secimdekiNoktalar.find((id) => id !== hedef.id)!)
        : undefined;
      const birlesmeEsleri = secilenEs ? [secilenEs] : ustUsteNoktalar(objects, hedef.id, birlestirmeToleransi(viewport.zoom));
      // Çoklu seçimde menüde "Seçili N noktayı birleştir" (aralarına doğru parçası çizen ESKİ madde) de
      // bulunur. İki "birleştir" karışmasın diye bu durumda ne yapıldığı parantezle söylenir.
      const noktalariBaglaMaddesiVar = secimdekiNoktalar.length >= 2;
      const birlesMaddesi = (es: PointObject): ContextMenuItem => ({
        id: `nokta-birlestir-${es.id}`,
        label: `${birlestirmeMaddesi(hedef.label, es.label)}${noktalariBaglaMaddesiVar ? ' (tek nokta yap)' : ''}`,
        onSelect: () => mergePoints(hedef.id, es.id),
      });
      if (birlesmeEsleri.length === 1) {
        maddeler.push({ ...birlesMaddesi(birlesmeEsleri[0]), separatorBefore: true });
      } else if (birlesmeEsleri.length > 1) {
        maddeler.push({
          id: 'nokta-birlestir-listesi',
          label: 'Noktaları birleştir',
          separatorBefore: true,
          submenu: birlesmeEsleri.map(birlesMaddesi),
        });
      }
      // Menü, gri çizim ve "Kilitle" adayları AYNI yargıdan türer (isPointLocked): taşıyıcısı
      // silinmiş bir bağ kilit sayılmaz. "Kilit çöz", "Kilitle"nin tam tersidir: kilitlenirken
      // yarıçap noktası olmaktan çıkarılan nokta, kilidi çözülünce çemberin yarıçapını yeniden belirler.
      if (isPointLocked(hedef, objects)) {
        maddeler.push({ id: 'kilit-coz', label: 'Kilit çöz', separatorBefore: true,
          onSelect: () => commit(prev => prev.map(object => {
            if (object.id === hedef.id) return { ...object, onObjectId: undefined, locked: undefined, isIndependent: !hedef.construction } as MathObject;
            if (object.id === hedef.onObjectId && object.type === 'circle' && object.releasedRadiusPointId === hedef.id) {
              const { releasedRadiusPointId: _birakilan, fixedRadius: _sabit, ...cember } = object;
              return { ...cember, radiusPointId: hedef.id } as MathObject;
            }
            return object;
          }), `${hedef.label} noktasının kilidi çözüldü`) });
      } else {
        const candidates = pointLockCandidates(hedef, objects, viewport.zoom);
        for (const candidate of candidates) maddeler.push({
          id: `kilitle-${candidate.host.id}`,
          label: candidates.length === 1 ? 'Kilitle' : `Kilitle: ${candidate.host.label}`,
          separatorBefore: candidate === candidates[0],
          onSelect: () => commit(prev => prev.map(object => {
            if (object.id === hedef.id) return { ...object, onObjectId: candidate.host.id, x: candidate.position.x, y: candidate.position.y } as MathObject;
            if (object.id === candidate.host.id && object.type === 'circle' && candidate.fixedRadius !== undefined) {
              return { ...object, radiusPointId: undefined, fixedRadius: candidate.fixedRadius, releasedRadiusPointId: hedef.id };
            }
            return object;
          }), 'Nokta çizgiye kilitlendi'),
        });
      }
      // ÇOKLU SEÇİM: birden çok nokta seçiliyken bağlama / ayırma / uydurma sunulur.
      // (Seçim "Seç ve Taşı" ile Shift veya Ctrl basılı tutularak yapılır.)
      const seciliNoktalar = selectedObjectIds.filter((id) =>
        objects.some((o) => o.id === id && o.type === 'point')
      );
      if (seciliNoktalar.length >= 2) {
        maddeler.push({
          id: 'noktalari-birlestir',
          label: `Seçili ${seciliNoktalar.length} noktayı birleştir`,
          onSelect: () => connectPoints(seciliNoktalar),
        });
        maddeler.push({
          id: 'noktalari-ayir',
          label: 'Aralarındaki bağlantıları kaldır',
          onSelect: () => disconnectPoints(seciliNoktalar),
        });
        maddeler.push({
          id: 'polinom-uydur',
          label: `Noktalara polinom uydur… (${seciliNoktalar.length} nokta)`,
          separatorBefore: true,
          prompt: {
            scope: sliderScope,
            label: 'Polinomun derecesi',
            unit: '.',
            initial: String(Math.min(3, Math.max(1, seciliNoktalar.length - 1))),
            onSubmit: (d) => fitPolynomialToPoints(seciliNoktalar, Math.round(d)),
          },
        });
      }

      // ÜZERİNDE DURDUĞU NESNEYİ BURADAN PARÇALA
      // Bölme maddeleri şimdiye dek yalnızca şeklin kendisine sağ tıklayınca
      // çıkıyordu; çemberin ince çizgisine isabet ettirmek zordu. Nokta zaten
      // nesneye bağlı olduğuna göre madde noktanın menüsünde de olmalı.
      const tasiyiciId = (hedef as PointObject).onObjectId;
      const tasiyici = tasiyiciId ? objects.find((o) => o.id === tasiyiciId) : undefined;
      if (tasiyici) {
        const ustundekiler = uzerindekiNoktalar(tasiyici);
        const digerleri = ustundekiler.filter((o) => o.id !== hedef.id);
        // Eş nokta: kullanıcı ikincisini de seçtiyse o, yoksa üzerindeki ilk nokta
        const es = digerleri.find((o) => selectedObjectIds.includes(o.id)) || digerleri[0];
        const ad = tasiyici.label || 'Nesne';

        if (tasiyici.type === 'segment') {
          maddeler.push({
            id: 'tasiyiciyi-bol',
            label: `${ad} kenarını ${hedef.label} noktasından ikiye ayır`,
            separatorBefore: true,
            onSelect: () => splitSegmentAtPoint(tasiyici.id, hedef.id),
          });
        } else if (tasiyici.type === 'arc') {
          maddeler.push({
            id: 'tasiyiciyi-bol',
            label: `${ad} yayını ${hedef.label} noktasından ikiye ayır`,
            separatorBefore: true,
            onSelect: () => splitArcAtPoint(tasiyici.id, hedef.id),
          });
        } else if (tasiyici.type === 'circle') {
          maddeler.push({
            id: 'tasiyiciyi-bol',
            label: es
              ? `${ad} çemberini ${hedef.label}–${es.label} yaylarına ayır`
              : `${ad} çemberini ayırmak için üzerine ikinci bir nokta koyun`,
            separatorBefore: true,
            disabled: !es,
            onSelect: es
              ? () => splitCircleAtPoints(tasiyici.id, [hedef.id, es.id])
              : undefined,
          });
        } else if (tasiyici.type === 'polygon') {
          maddeler.push({
            id: 'tasiyiciyi-bol',
            label: es
              ? `${ad} alanını ${hedef.label}–${es.label} kirişinden böl`
              : `${ad} alanını bölmek için başka bir kenara da nokta koyun`,
            separatorBefore: true,
            disabled: !es,
            onSelect: es
              ? () => splitPolygon(tasiyici.id, [hedef.id, es.id])
              : undefined,
          });
        }
      }

      // YAY ÖLÇ: nokta bir ya da birkaç çemberin üzerindeyse o çemberdeki diğer noktalarla arasındaki küçük yaylar
      // (bağlantı türü fark etmez: yarıçap noktası, kesişim noktası…). Birden çok çember varsa çember adı başlıklarıyla
      // gruplanır; alt menü kaydırılmadığı için her çemberden sınırlı sayıda (en yakın yaylar önce) listelenir.
      const yayGruplari = arcOptionsForPoint(hedef.id, objects).filter((g) => g.options.length > 0);
      if (yayGruplari.length) {
        const grupSiniri = Math.max(3, Math.floor(YAY_MENU_SINIRI / yayGruplari.length));
        const alt: ContextMenuItem[] = [];
        let fazlasi = 0;
        yayGruplari.forEach((g, gi) => {
          if (yayGruplari.length > 1) {
            alt.push({ id: `yay-olc-baslik-${g.circle.id}`, label: g.circle.label || 'Çember', disabled: true, separatorBefore: gi > 0 });
          }
          g.options.slice(0, grupSiniri).forEach((o) => alt.push(yayMaddesi(o)));
          fazlasi += Math.max(0, g.options.length - grupSiniri);
        });
        if (fazlasi > 0) {
          alt.push({ id: 'yay-olc-fazlasi', label: `${fazlasi} yay daha var: diğer noktaya sağ tıklayıp oradan seçin`, disabled: true, separatorBefore: true });
        }
        maddeler.push({ id: 'yay-olc', label: 'Yay ölç', separatorBefore: true, submenu: alt });
      }

      // AÇI ÖLÇ (Yay ölç'ün hemen yanında): noktada ÜÇ ya da daha çok kol birleşiyorsa hangi açının
      // ölçüleceğini menü SORAR — "E noktasında IEF, FEG, IEG açıları var, hangisi?". Her kol çifti bir
      // maddedir (n kol → n*(n-1)/2 açı) ve sıra ekrandaki görüntüye uyar: önce komşu kolların kurduğu
      // küçük açılar. İKİ kollu noktada tek madde ("Açısını ölç") kalır: sık durum tek tıkla ölçülür.
      // Nokta bir yay/dilimin MERKEZİ ise merkez açı maddesi AYRICA sunulur; ikisi farklı açılardır.
      // Karar measureAngleAtPoint ile AYNI yardımcılardan gelir (src/math/pointAngles.ts).
      const aciEylemi = pointAngleAction(hedef.id, objects);
      if (aciEylemi?.kind === 'central') {
        // Bölünmüş çemberin merkezinde birden çok yay olabilir: herhangi birinin açısı görünüyorsa "gizle"
        const merkezAcisiGorunur = aciEylemi.shapes.some((s) => s.visible !== false && s.showCentralAngle !== false);
        maddeler.push({
          id: 'olc-aci',
          label: merkezAcisiGorunur ? 'Merkez açıyı gizle' : 'Açısını ölç (merkez açı)',
          onSelect: () => measureAngleAtPoint(hedef.id),
        });
      }
      const noktaAcilari = noktadakiAcilar(hedef.id, objects);
      // Madde ölçümün EKRANDAKİ durumunu söyler: işaretliyse seçmek açıyı (rozetiyle birlikte) kaldırır —
      // rozete tıklamakla aynı kural, tek geçmiş adımı.
      const aciAcik = (a: NoktaAcisi) => !!a.existingId && !!a.existingShown;
      // Menü ve ipucu tuvalde ÇİZİLEN rozetle aynı sayıyı söylemeli: rozet tam dereceye yuvarlanır
      // (bir ondalık yazılınca aynı açı menüde "116,6°", rozette "117°" görünüyordu).
      const aciDegeri = (a: NoktaAcisi) => `${formatTurkishNumber(Math.round(a.degrees))}°`;
      const aciSec = (a: NoktaAcisi) => {
        if (aciAcik(a)) {
          deleteObjects([a.existingId!]);
          setHintMessage(`${a.title} açısı silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın.`);
          return;
        }
        measureAngleAtPoint(hedef.id, a.armIds);
        if (!a.existingId) setHintMessage(`${a.title} açısı ölçüldü: ${aciDegeri(a)}.`);
      };
      const aciMaddesi = (a: NoktaAcisi): ContextMenuItem => ({
        id: `olc-aci-${a.armIds.join('-')}`,
        label: `${a.title} açısı · ${aciDegeri(a)}`,
        checked: aciAcik(a),
        onSelect: () => aciSec(a),
      });
      if (noktaAcilari.length > 1) {
        // ÖLÇÜLMÜŞ açılar sınırın ötesinde kalsa da listelenir: yoksa işaretli satır kaybolur ve
        // o açı menüden kaldırılamaz olurdu.
        const listelenen = noktaAcilari.filter((a, i) => i < ACI_MENU_SINIRI || !!a.existingId);
        const fazlasi = noktaAcilari.length - listelenen.length;
        maddeler.push({
          id: 'olc-aci-listesi',
          label: 'Açı ölç',
          submenu: [
            ...listelenen.map(aciMaddesi),
            ...(fazlasi > 0
              ? [{ id: 'olc-aci-fazlasi', label: `${fazlasi} geniş açı daha var: “Yazarak komut ver” ile üç harfle ölçün`, disabled: true, separatorBefore: true }]
              : []),
          ],
        });
      } else if (noktaAcilari.length === 1 && aciEylemi?.kind === 'central') {
        // Merkez açının YANINDA noktanın kendi açısı da var: adıyla ayrılır ki iki madde karışmasın.
        const a = noktaAcilari[0];
        maddeler.push({ ...aciMaddesi(a), id: 'olc-aci-tek', label: `${a.title} açısı · ${aciDegeri(a)}` });
      } else if (noktaAcilari.length === 1) {
        // İki kollu nokta: eski davranış aynen korunur (tek tık, alt menü yok).
        maddeler.push({ id: 'olc-aci', label: 'Açısını ölç', onSelect: () => measureAngleAtPoint(hedef.id) });
      }
      // İÇ / DIŞ AÇI: köşede birden çok ölçülmüş açı olabildiği için (yeni "Açı ölç" alt menüsü bunu
      // sıradan bir duruma çevirdi) hangi açının çevrileceği SORULUR; tek açı varsa eski düz madde kalır.
      const koseAcilari = objects.filter(
        (o): o is AngleObject => o.type === 'angle' && o.vertexPointId === hedef.id
      );
      if (koseAcilari.length === 1) {
        maddeler.push({
          id: 'ic-dis-aci',
          label: 'İç açı / dış açı',
          onSelect: () => toggleAngleReflex(koseAcilari[0].id),
        });
      } else if (koseAcilari.length > 1) {
        const noktaEtiketi = (id: string) =>
          (objects.find((o) => o.id === id && o.type === 'point') as PointObject | undefined)?.label || '?';
        maddeler.push({
          id: 'ic-dis-aci',
          label: 'İç açı / dış açı',
          submenu: koseAcilari.map((a) => ({
            id: `ic-dis-aci-${a.id}`,
            label: `${noktaEtiketi(a.point1Id)}${hedef.label || '?'}${noktaEtiketi(a.point3Id)} açısı`,
            checked: !!a.reflex,
            onSelect: () => toggleAngleReflex(a.id),
          })),
        });
      }

      // Nokta bir parçanın/doğrunun ARASINDA (ya da bölünmüş zincirin eklem yerinde) duruyorsa
      // "baştan sona" ve "noktaya kadar" uzunlukları noktanın kendi menüsünde de sunulur.
      const noktaUzunluklari = lengthOptionsAtPoint(objects, hedef.id)?.options ?? [];
      noktaUzunluklari.forEach((o, i) => maddeler.push(uzunlukMaddesi(o, i === 0, noktaUzunluklari.length > 1)));

      if ((hedef as PointObject).onObjectId) {
        const isAnim = (hedef as PointObject).animating;
        maddeler.push({
          id: 'canlandirma',
          label: isAnim ? 'Animasyonu Durdur' : 'Animasyonu Başlat',
          separatorBefore: true,
          onSelect: () => updateObject(hedef.id, { animating: !isAnim } as Partial<MathObject>, true),
        });
      }
    } else if (hedef.type === 'slider') {
      maddeler.push({
        id: 'canlandirma-slider',
        label: sliderPlaying ? 'Animasyonu Durdur' : 'Animasyonu Başlat',
        onSelect: () => toggleSliderPlayback(),
      });
    } else if (hedef.type === 'circle') {
      const circ = hedef as CircleObject;
      const merkez = pointsById.get(circ.centerPointId);
      const yariNokta = circ.radiusPointId ? pointsById.get(circ.radiusPointId) : undefined;
      const r = merkez && yariNokta ? calculateDistance(merkez, yariNokta) : circ.fixedRadius ?? 0;
      maddeler.push({ id: 'olc-alan', label: 'Alanını ölç', onSelect: () => measureArea(circ.id) });
      maddeler.push({ id: 'olc-cevre', label: 'Çevresini ölç', onSelect: () => measurePerimeter(circ.id) });
      const ustundeC = uzerindekiNoktalar(circ);
      if (ustundeC.length >= 2) {
        const secili = ustundeC.filter((o) => selectedObjectIds.includes(o.id));
        const ikisi = secili.length === 2 ? secili : ustundeC.slice(0, 2);
        maddeler.push({
          id: 'cemberi-ayir',
          label: `${ikisi.map((o) => o.label).join(' – ')} noktalarından iki yaya ayır`,
          onSelect: () => splitCircleAtPoints(circ.id, ikisi.map((o) => o.id)),
        });
      }
      // YAY ÖLÇ: çemberin üzerindeki her nokta çifti arasındaki küçük yay (çember bölünmez). Önce komşu
      // noktalar arasındakiler; alt menü kaydırılmadığı için liste sınırlanır ve kalan sayı söylenir.
      const yayCiftleri = arcOptionsForCircle(circ.id, objects);
      if (yayCiftleri.length) {
        const fazlasi = yayCiftleri.length - YAY_MENU_SINIRI;
        maddeler.push({
          id: 'yay-olc',
          label: 'Yay ölç',
          submenu: [
            ...yayCiftleri.slice(0, YAY_MENU_SINIRI).map(yayMaddesi),
            ...(fazlasi > 0
              ? [{ id: 'yay-olc-fazlasi', label: `${fazlasi} yay daha var: bir noktaya sağ tıklayıp oradan seçin`, disabled: true, separatorBefore: true }]
              : []),
          ],
        });
      } else {
        maddeler.push({ id: 'yay-olc-yok', label: 'Yay ölçmek için çemberin üzerine iki nokta koyun', disabled: true });
      }

      maddeler.push({
        id: 'ayarla-yaricap',
        label: 'Yarıçapı ayarla…',
        prompt: {
          scope: sliderScope,
          label: 'Yarıçap',
          unit: 'br',
          initial: formatTurkishNumber(r),
          onSubmit: (v) => setCircleRadius(circ.id, v),
        },
      });
    } else if (hedef.type === 'ellipse') {
      const elp = hedef as EllipseObject;
      maddeler.push({ id: 'olc-alan', label: 'Alanını ölç', onSelect: () => measureArea(elp.id) });
      maddeler.push({ id: 'olc-cevre', label: 'Çevresini ölç', onSelect: () => measurePerimeter(elp.id) });
      maddeler.push({
        id: 'elips-a',
        label: 'Yatay yarıçapı (a) ayarla…',
        separatorBefore: true,
        prompt: {
          scope: sliderScope,
          label: 'Yatay yarıçap (a)',
          unit: 'br',
          initial: formatTurkishNumber(elp.radiusX),
          onSubmit: (v) => updateObject(elp.id, { radiusX: Math.abs(v) } as Partial<MathObject>, true),
        },
      });
      maddeler.push({
        id: 'elips-b',
        label: 'Dikey yarıçapı (b) ayarla…',
        prompt: {
          scope: sliderScope,
          label: 'Dikey yarıçap (b)',
          unit: 'br',
          initial: formatTurkishNumber(elp.radiusY),
          onSubmit: (v) => updateObject(elp.id, { radiusY: Math.abs(v) } as Partial<MathObject>, true),
        },
      });
    } else if (hedef.type === 'polygon') {
      const poly = hedef as PolygonObject;
      const kenarNo = contextTarget?.edgeIndex ?? null;
      if (kenarNo !== null) {
        // Tıklanan kenarın adı ([AB]) ve şu anki uzunluğu, menüde doğrudan görünsün
        const a = pointsById.get(poly.pointIds[kenarNo]);
        const b = pointsById.get(poly.pointIds[(kenarNo + 1) % poly.pointIds.length]);
        const ad = a && b ? `[${a.label || '?'}${b.label || '?'}]` : 'Bu kenar';
        const uzunluk = a && b ? calculateDistance(a, b) : 0;
        const acik = (poly.edgeLabels || []).includes(kenarNo);
        maddeler.push({
          id: 'olc-kenar',
          label: acik
            ? `${ad} kenar uzunluğunu gizle`
            : `${ad} kenarını ölç (${formatTurkishNumber(uzunluk)} br)`,
          onSelect: () => togglePolygonEdgeLabel(poly.id, kenarNo),
        });
      }
      // Kenarları üzerinde duran noktalar: alanı bunlardan geçen kirişle bölebiliriz
      const koseler = poly.pointIds
        .map((id) => pointsById.get(id))
        .filter(Boolean) as PointObject[];
      const kenardakiNoktalar =
        koseler.length === poly.pointIds.length
          ? objects.filter((o) => {
              if (o.type !== 'point') return false;
              if (poly.pointIds.includes(o.id)) return false; // köşenin kendisi değil
              const y = closestPointOnPolygonEdge(koseler, o as PointObject);
              return !!y && y.distance < 1e-3;
            })
          : [];

      if (kenardakiNoktalar.length >= 2) {
        const secili = kenardakiNoktalar.filter((o) => selectedObjectIds.includes(o.id));
        const kullanilacak = secili.length === 2 ? secili : kenardakiNoktalar.slice(0, 2);
        const adlar = kullanilacak.map((o) => o.label).join(' – ');
        maddeler.push({
          id: 'alani-bol',
          label: `Alanı böl (${adlar})`,
          separatorBefore: true,
          onSelect: () => splitPolygon(poly.id, kullanilacak.map((o) => o.id)),
        });
      }

      const hepsiAcik = (poly.edgeLabels || []).length === poly.pointIds.length;
      maddeler.push({
        id: 'olc-tum-kenarlar',
        label: hepsiAcik ? 'Kenar uzunluklarını gizle' : 'Tüm kenarları ölç',
        onSelect: () => setAllPolygonEdgeLabels(poly.id, !hepsiAcik),
      });
      maddeler.push({ id: 'olc-alan', label: 'Alanını ölç', separatorBefore: true, onSelect: () => measureArea(hedef.id) });
      maddeler.push({ id: 'olc-cevre', label: 'Çevresini ölç', onSelect: () => measurePerimeter(hedef.id) });
    } else if (hedef.type === 'arc' || hedef.type === 'sector') {
      // Yay / daire dilimi: merkez açı her ikisinde de anlamlıdır (yarım çemberde 180°)
      const merkezAciAcik = (hedef as ArcObject | SectorObject).showCentralAngle !== false;
      maddeler.push({
        id: 'olc-merkez-aci',
        label: merkezAciAcik ? 'Merkez açıyı gizle' : 'Açısını ölç (merkez açı)',
        onSelect: () => measureArcAngle(hedef.id),
      });
      maddeler.push({ id: 'olc-yay', label: hedef.showArcLength ? 'Yay uzunluğunu gizle' : 'Yay uzunluğunu ölç', onSelect: () => hedef.showArcLength ? hideMeasurement(hedef.id, 'arcLength') : measureArcLength(hedef.id) });
      maddeler.push({ id: 'olc-yaricap', label: hedef.showRadius ? 'Yarıçap uzunluğunu gizle' : 'Yarıçap uzunluğunu ölç', onSelect: () => updateObject(hedef.id, { showRadius: !hedef.showRadius } as Partial<MathObject>, true) });
      maddeler.push({ id: 'olc-kiris', label: hedef.showChordLength ? 'Kiriş uzunluğunu gizle' : 'Kiriş / çap uzunluğunu ölç', onSelect: () => updateObject(hedef.id, { showChordLength: !hedef.showChordLength } as Partial<MathObject>, true) });
      if (hedef.type === 'sector') maddeler.push({ id: 'olc-cevre', label: hedef.showPerimeter ? 'Çevre uzunluğunu gizle' : 'Çevresini ölç', onSelect: () => hedef.showPerimeter ? hideMeasurement(hedef.id, 'perimeter') : measurePerimeter(hedef.id) });
      if (hedef.type === 'arc') {
        const ustundeY = uzerindekiNoktalar(hedef);
        if (ustundeY.length > 0) {
          const p = ustundeY.find((o) => selectedObjectIds.includes(o.id)) || ustundeY[0];
          maddeler.push({
            id: 'yayi-ayir',
            label: `${p.label} noktasından ikiye ayır`,
            onSelect: () => splitArcAtPoint(hedef.id, p.id),
          });
        }

      } else {
        maddeler.push({ id: 'olc-alan', label: 'Alanını ölç', onSelect: () => measureArea(hedef.id) });
      }
    } else if (hedef.type === 'angle') {
      const ang = hedef as AngleObject;
      const p1 = pointsById.get(ang.point1Id);
      const v = pointsById.get(ang.vertexPointId);
      const p3 = pointsById.get(ang.point3Id);
      const derece = p1 && v && p3 ? calculateAngleDegrees(p1, v, p3) : 0;
      const rotateConstruction = p3?.construction?.kind === 'rotate' ? p3.construction : undefined;
      const boundSlider = rotateConstruction?.sliderId
        ? (objects.find((o) => o.id === rotateConstruction.sliderId && o.type === 'slider') as SliderObject | undefined)
        : undefined;

      maddeler.push({
        id: 'ayarla-aci',
        label: 'Açıyı ayarla…',
        prompt: {
          scope: sliderScope,
          label: 'Açı (derece)',
          unit: '°',
          initial: formatTurkishNumber(Math.round(derece)),
          onSubmit: (val) => setAngleDegrees(ang.id, val),
        },
      });

      if (boundSlider) {
        maddeler.push({
          id: 'canlandir-aci',
          label: sliderPlaying ? 'Animasyonu Durdur' : `Animasyonu Başlat (${boundSlider.variableName})`,
          onSelect: () => toggleSliderPlayback(),
        });
        maddeler.push({
          id: 'surguyu-degistir-aci',
          label: `Sürgü Değişkenini Değiştir (${boundSlider.variableName})…`,
          prompt: {
            label: 'Sürgü Değişkeni / Adı',
            placeholder: 'ör. a, α, aci',
            initial: boundSlider.variableName,
            onSubmitText: (name) => bindAngleToSlider(ang.id, name),
          },
        });
        maddeler.push({
          id: 'surgu-baglantisini-kaldir',
          label: 'Sürgü Bağlantısını Kaldır',
          onSelect: () => unbindAngleFromSlider(ang.id),
        });
      } else {
        maddeler.push({
          id: 'surguye-bagla-canlandir',
          label: 'Canlandır (Sürgüye Bağla)…',
          prompt: {
            label: 'Sürgü Değişkeni / Adı',
            placeholder: 'ör. a, α, aci',
            initial: 'α',
            onSubmitText: (name) => bindAngleToSlider(ang.id, name),
          },
        });
      }

      maddeler.push({ id: 'ic-dis-aci', label: 'İç açı / dış açı', onSelect: () => toggleAngleReflex(ang.id) });
      // Rozete tıklamak dışında garantili bir çıkış yolu: menüden de gizlenebilsin
      maddeler.push({
        id: 'aci-deger-gorunurluk',
        label: ang.showValue === false ? 'Açı değerini göster' : 'Açı değerini gizle',
        onSelect: () =>
          ang.showValue === false
            ? updateObject(ang.id, { showValue: true } as Partial<MathObject>, true)
            : hideMeasurement(ang.id, 'angle'),
      });
    }

    if (hedef.type === 'text') maddeler.push({ id: 'metni-duzenle', label: 'Metni düzenle…', onSelect: () => { setEditingTextObj(hedef); setPendingTextWorldPos({ x: hedef.x, y: hedef.y }); setIsTextDialogOpen(true); } });
    // Yay ölçümü: diğer yaya (büyük ↔ küçük, yarım çemberde öbür yarıya) tek geçmiş adımında geçilir.
    // "Ölçümü gizle" sunulmaz: gizlenen yayın sağ tıklanacak parçası kalmaz; rozete tıklamak ölçümü kaldırır.
    if (isArcMeasurement(hedef)) {
      const simdiki = resolveArc(hedef, objects);
      if (simdiki) {
        const gecis = flipArcMeasurement(hedef, objects);
        const yazi = arcFlipLabel(simdiki);
        maddeler.push(
          'error' in gecis
            ? { id: 'yay-tarafi', label: gecis.error, disabled: true, separatorBefore: true }
            : {
                id: 'yay-tarafi',
                label: yazi,
                separatorBefore: true,
                onSelect: () => {
                  // Ölçüm menü açıkken değişmiş olabilir (nokta animasyonu, renk): tümleyen yay GÜNCEL
                  // nesneden yeniden hesaplanır, menüdeki anlık görüntü yazılmaz.
                  commit((prev) => {
                    const guncel = prev.find((o) => o.id === hedef.id);
                    if (!isArcMeasurement(guncel)) return prev;
                    const g = flipArcMeasurement(guncel, prev);
                    return 'error' in g ? prev : prev.map((o) => (o.id === hedef.id ? g.object : o));
                  }, `${gecis.title} ölçüldü`);
                  setHintMessage(`${gecis.title} ölçüldü.`);
                },
              }
        );
      }
    }
    if (hedef.type === 'measurement' && hedef.kind !== 'arc') maddeler.push({ id: 'olcum-goster', label: hedef.showValue === false ? 'Ölçümü göster' : 'Ölçümü gizle', onSelect: () => updateObject(hedef.id, { showValue: hedef.showValue === false } as Partial<MathObject>, true) });

    // EŞİTLİK ÇENTİĞİ: parça, tıklanan çokgen kenarı, yay, dilim ve yay ölçümü; çoklu seçimde "Eşit olarak işaretle"
    maddeler.push(...esitlikMenuMaddeleri({
      hedef,
      kenarNo: contextTarget?.edgeIndex ?? null,
      objects,
      seciliIdler: selectedObjectIds,
      sonuc: esitlik,
      uygula: (yamalar, aciklama) => {
        if (yamalar.length) commit((prev) => esitlikYamalariniUygula(prev, yamalar), aciklama);
      },
    }));

    // İZ BIRAKMA (GeoGebra Show Trace)
    const traceDestekleyenler = ['point', 'segment', 'line', 'ray', 'circle', 'polygon', 'arc', 'sector', 'ellipse', 'function'];
    if (traceDestekleyenler.includes(hedef.type)) {
      maddeler.push({
        id: 'iz-birak',
        label: hedef.showTrace ? 'İzi Gizle (İz Açık)' : 'İzi Göster (İz Bırak)',
        separatorBefore: true,
        onSelect: () => updateObject(hedef.id, { showTrace: !hedef.showTrace } as Partial<MathObject>, true),
      });
    }

    if (traces[hedef.id]) {
      maddeler.push({
        id: 'izini-temizle',
        label: 'Bu Nesnenin İzini Temizle',
        separatorBefore: true,
        onSelect: () => clearTrace(hedef.id),
      });
    }
    if (Object.keys(traces).length > 0) {
      maddeler.push({
        id: 'izleri-temizle',
        label: 'Tüm İzleri Temizle',
        separatorBefore: !traces[hedef.id],
        onSelect: () => clearTraces(),
      });
    }

    // "Sil" her nesne türünde bulunur. Delete tuşu ve seçim çubuğuyla aynı kümeyi siler: tıklanan nesne seçimin
    // içindeyse seçimin tamamı (Kopyala ile aynı targetIds). Şekil silinince kendi kullanılmayan noktaları da gider.
    const silAciklamasi = targetIds.length > 1 ? `${targetIds.length} nesne silindi` : undefined;
    maddeler.push({
      id: 'sil',
      label: targetIds.length > 1 ? `Seçili ${targetIds.length} nesneyi sil` : 'Sil',
      danger: true,
      separatorBefore: maddeler.length > 0,
      onSelect: () => deleteObjects(targetIds, silAciklamasi),
    });
    // Kaçış kapısı: yalnızca şekli siler, noktalar yerinde kalır. Yalnızca varsayılan silmenin GÖRÜNÜR bir noktayı
    // götüreceği durumlarda görünür (nokta, açı, ölçüm ve ortak noktalı şekillerde çıkmaz).
    // deleteObjects ile AYNI seçenekler: yarım kalmış çizimin tıklanmış noktaları zaten korunuyorsa madde çıkmaz.
    const gidecekNoktalar = planDeletion(objects, targetIds, { protectedIds: pendingPointIds }).ownPointIds;
    if (gidecekNoktalar.some(id => pointsById.get(id)?.visible !== false)) {
      maddeler.push({
        id: 'yalnizca-sekli-sil',
        label: 'Yalnızca şekli sil (noktalar kalsın)',
        danger: true,
        onSelect: () => deleteObjects(targetIds, silAciklamasi, { keepPoints: true }),
      });
    }
    return maddeler.map(item => item.id.startsWith('olc-') && item.onSelect ? {
      ...item,
      onSelect: () => {
        setStyleMode('Ayrıntılı');
        setViewport(prev => ({ ...prev, showMeasurements: true }));
        item.onSelect?.();
      },
    } : item);
  }, [
    objectClipboard, viewport, addObjects, setSelectedObjectIds, setActiveTool, activeTool, commit,
    contextTarget,
    objects,
    pointsById,
    measureLength,
    measureArea,
    measurePerimeter,
    measureAngleAtPoint,
    measureArcAngle,
    measureArcLength,
    togglePolygonEdgeLabel,
    setAllPolygonEdgeLabels,
    splitPolygon,
    splitSegmentAtPoint,
    splitCircleAtPoints,
    splitArcAtPoint,
    uzerindekiNoktalar,
    measureArcBetween,
    deleteObjects,
    setHintMessage,
    connectPoints,
    disconnectPoints,
    mergePoints,
    fitPolynomialToPoints,
    selectedObjectIds,
    toggleAngleReflex,
    updateObject,
    hideMeasurement,
    setSegmentLength,
    setAngleDegrees,
    bindAngleToSlider,
    unbindAngleFromSlider,
    setCircleRadius,
    setLengthMeasurement,
    showDetails,
    deleteObject,
    traces,
    clearTraces,
    sliderPlaying,
    toggleSliderPlayback,
    styleMode,
    setViewport,
    esitlik,
    pendingPointIds,
  ]);

  const handleObjectMouseDown = (e: React.MouseEvent, obj: MathObject) => {
    // El aracı (orta tuş / Alt) görünümü kaydırır: basış yutulmaz, nesne seçilmez (gorunumKaydirma.ts)
    if (!nesneBasisiIslenmeli(activeTool, e)) return;
    if (e.button !== 0) return; // Sadece sol tık
    e.stopPropagation();

    // PERGEL çizerken tıklama nesnenin üzerine gelebilir (çember, eksen, nokta…).
    // Burada durursak pergel adım atlamaz ve kullanıcının bir sonraki tıklaması
    // başlangıcı bambaşka bir yere koyar. Bu yüzden tıklamayı pergele iletiriz.
    if (activeTool === 'compass' && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      pergelAdimi(screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewport));
      return;
    }

    if (activeTool === 'delete') {
      deleteObject(obj.id);
      return;
    }

    // Yay Ölç noktalarla çalışır: çembere (ya da başka bir şekle) tıklanınca yol göster
    if (activeTool === 'measure_arc' && obj.type !== 'point') {
      setHintMessage('Yay Ölç: çemberin kendisine değil, üzerindeki NOKTALARA tıklayın.');
      return;
    }

    if (activeTool === 'measure_distance' || activeTool === 'unit_measure') {
      if (obj.type === 'arc' || obj.type === 'sector') { measureArcLength(obj.id); return; }
      if (obj.type === 'line' || obj.type === 'ray') { measureLength(obj.id); return; }
      if (obj.type === 'segment') {
        const seg = obj as SegmentObject;
        const p1 = pointsById.get(seg.startPointId);
        const p2 = pointsById.get(seg.endPointId);
        if (p1 && p2) {
          const isCm = activeTool === 'measure_distance';
          const unit = isCm ? 'cm' : 'br';
          const distStr = formatTurkishNumber(calculateDistance(p1, p2));
          const segLabel = `|${p1.label}${p2.label}|`;
          commit(
            (prev) =>
              prev.map((o) =>
                o.id === seg.id ? ({ ...o, showLength: true, unit, label: segLabel } as MathObject) : o
              ),
            `${segLabel} = ${distStr} ${unit} ölçüldü`
          );
          cancelPendingAction();
          return;
        }
      } else if (obj.type === 'point') {
        handlePointClick(obj.id);
        return;
      }
    }

    if (activeTool === 'measure_perimeter') {
      if (obj.type === 'sector' || obj.type === 'ellipse') { measurePerimeter(obj.id); return; }
      if (obj.type === 'polygon') {
        const poly = obj as PolygonObject;
        const polyPoints = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
        const perim = calculatePolygonPerimeter(polyPoints);
        commit(
          (prev) => prev.map((o) => (o.id === poly.id ? ({ ...o, showPerimeter: true } as MathObject) : o)),
          `${poly.label || 'Çokgen'} çevresi hesaplandı (${formatTurkishNumber(perim)} br)`
        );
        return;
      } else if (obj.type === 'circle') {
        commit(
          (prev) => prev.map((o) => (o.id === obj.id ? ({ ...o, showPerimeter: true } as MathObject) : o)),
          `${obj.label || 'Çember'} çevresi hesaplandı`
        );
        return;
      }
    }

    if (activeTool === 'measure_area') {
      if (obj.type === 'sector' || obj.type === 'ellipse') { measureArea(obj.id); return; }
      if (obj.type === 'polygon') {
        const poly = obj as PolygonObject;
        const polyPoints = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
        const area = calculatePolygonArea(polyPoints);
        commit(
          (prev) => prev.map((o) => (o.id === poly.id ? ({ ...o, showArea: true } as MathObject) : o)),
          `${poly.label || 'Çokgen'} alanı hesaplandı (${formatTurkishNumber(area)} br²)`
        );
        return;
      } else if (obj.type === 'circle') {
        commit(
          (prev) => prev.map((o) => (o.id === obj.id ? ({ ...o, showArea: true } as MathObject) : o)),
          `${obj.label || 'Daire'} alanı hesaplandı`
        );
        return;
      }
    }

    // KESİŞTİR: iki şekle sırayla tıklanır; ortak noktaları oluşturulur.
    if (activeTool === 'intersect') {
      if (obj.type === 'point') {
        setHintMessage('Kesiştirmek için NOKTA değil, iki şekle (doğru, çember, elips…) tıklayın.');
        return;
      }
      const ilk = kesistirIlkRef.current;
      if (!ilk) {
        kesistirIlkRef.current = obj.id;
        setSelectedObjectId(obj.id);
        setSelectedObjectIds([obj.id]);
        setHintMessage(`${obj.label || 'Şekil'} seçildi. Şimdi kesiştirmek istediğiniz ikinci şekle tıklayın.`);
        return;
      }
      if (ilk === obj.id) {
        setHintMessage('İki FARKLI şekil seçmelisiniz.');
        return;
      }
      const a = objects.find((o) => o.id === ilk);
      kesistirIlkRef.current = null;
      if (!a) return;
      kesisimNoktalariOlustur(a, obj);
      return;
    }

    if (activeTool === 'rotate') {
      // Hem tekil hem çoklu seçim güncellenmeli: döndürme paleti `selectedObjectIds`e bakıyor
      setSelectedObjectId(obj.id);
      setSelectedObjectIds([obj.id]);
      if (!dondurulebilir(obj)) {
        setHintMessage(
          obj.type === 'circle'
            ? 'Çember döndürülünce aynı görünür; döndürmek için yay veya daire dilimi kullanın.'
            : 'Bu şekil döndürülemiyor. Çokgen, yay, daire dilimi ve doğru parçası döndürülebilir.'
        );
      }
      return;
    }

    if (activeTool === 'reflect' || activeTool === 'symmetry') {
      // Simetri ekseni: doğru parçası, doğru veya ışın
      let axisPointIds: [string, string] | null = null;
      if (obj.type === 'segment') axisPointIds = [obj.startPointId, obj.endPointId];
      else if (obj.type === 'line') axisPointIds = [obj.point1Id, obj.point2Id];
      else if (obj.type === 'ray') axisPointIds = [obj.startPointId, obj.throughPointId];

      if (axisPointIds) {
        const p1 = pointsById.get(axisPointIds[0]);
        const p2 = pointsById.get(axisPointIds[1]);
        if (p1 && p2) {
          const axis = {
            id: obj.id,
            p1: { x: p1.x, y: p1.y },
            p2: { x: p2.x, y: p2.y },
            name: obj.label || `${p1.label}${p2.label} Doğrusu`,
          };

          const targetId = reflectTargetPolyId || selectedObjectId;
          const targetPoly = objects.find((o) => o.id === targetId && o.type === 'polygon') as
            | PolygonObject
            | undefined;

          if (targetPoly) {
            reflectPolygonAcrossSymmetryLine(targetPoly, axis.p1, axis.p2, axis.name);
            setReflectAxisLine(null);
            setReflectTargetPolyId(null);
          } else {
            setReflectAxisLine(axis);
            setHintMessage('Önce bir şekil seçin');
          }
          return;
        }
      } else if (obj.type === 'polygon') {
        const poly = obj as PolygonObject;
        setReflectTargetPolyId(poly.id);
        setSelectedObjectId(poly.id);

        if (reflectAxisLine) {
          reflectPolygonAcrossSymmetryLine(poly, reflectAxisLine.p1, reflectAxisLine.p2, reflectAxisLine.name);
          setReflectAxisLine(null);
          setReflectTargetPolyId(null);
        }
        return;
      }
    }

    if (activeTool === 'select') {
      const isAlreadySelected = selectedObjectIds.includes(obj.id);
      let targetIds: string[];

      if (e.shiftKey || e.ctrlKey) {
        targetIds = isAlreadySelected
          ? selectedObjectIds.filter((id) => id !== obj.id)
          : [...selectedObjectIds, obj.id];
        setSelectedObjectIds(targetIds);
      } else if (isAlreadySelected) {
        targetIds = selectedObjectIds;
      } else {
        targetIds = [obj.id];
        setSelectedObjectIds(targetIds);
      }

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = screenToWorld({ x: screenX, y: screenY }, viewport);

      const anchorId = getAnchorId(obj);
      const anchorPos = getAnchorPosition(anchorId);
      const anchorOffset = anchorPos ? { x: anchorPos.x - world.x, y: anchorPos.y - world.y } : { x: 0, y: 0 };

      setDraggingObjState({
        objectIds: targetIds,
        startWorld: world,
        lastWorld: world,
        hasMoved: false,
        anchorId: anchorPos ? anchorId : null,
        anchorOffset,
        virtualAnchor: anchorPos,
      });
    } else {
      if (obj.type === 'point') {
        handlePointClick(obj.id);
        return;
      }

      // Nokta üreten bir araçla ŞEKLE tıklandıysa, nokta o şeklin KENARINA konur.
      // Şekil tıklamayı yuttuğu için eskiden kenar üzerine nokta koyulamıyordu;
      // oysa kesişimi işaretlemek ya da alanı bölmek için nokta tam kenarda olmalı.
      const NOKTA_URETEN = [
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
      if (NOKTA_URETEN.includes(activeTool) && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        handleCanvasClick(
          screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top }, viewport)
        );
        return;
      }

      setSelectedObjectId(obj.id);
    }
  };

  const handleSolidMouseDown = useCallback(
    (solid: Solid3DObject, e: React.MouseEvent) => {
      // El aracında cismin izdüşümü de görünümü kaydırır; basış yutulmaz (gorunumKaydirma.ts)
      if (!nesneBasisiIslenmeli(activeTool, e)) return;
      e.stopPropagation();
      if (e.button !== 0) return;

      const isAlreadySelected = selectedSolidIds.includes(solid.id) || selectedSolidId === solid.id;
      if (e.shiftKey || e.ctrlKey) {
        const next = isAlreadySelected
          ? selectedSolidIds.filter((id) => id !== solid.id)
          : [...selectedSolidIds, solid.id];
        // Çoklu seçim listesi onSelectSolids ile verilir; ardından onSelectSolid çağrılırsa
        // (tek kimliklik liste kurar) Shift/Ctrl ile kurulan seçim silinirdi.
        if (onSelectSolids) onSelectSolids(next);
        else onSelectSolid?.(next.length > 0 ? next[next.length - 1] : null);
      } else {
        onSelectSolid?.(solid.id);
        onSelectSolids?.([solid.id]);
      }

      if (!e.shiftKey && !e.ctrlKey) {
        setSelectedObjectId(null);
        setSelectedObjectIds([]);
      }

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const world = screenToWorld({ x: screenX, y: screenY }, viewport);

      setDraggingSolidState({
        solidId: solid.id,
        startWorld: world,
        initialPos: { ...solid.position },
        hasMoved: false,
      });
    },
    [activeTool, selectedSolidId, selectedSolidIds, onSelectSolid, onSelectSolids, setSelectedObjectId, setSelectedObjectIds, viewport]
  );

  // Çokgeni belirli bir açıyla döndürme (pozitif: saat yönünün tersi, negatif: saat yönü)
  /**
   * Bir şeklin döndürme verisi: HANGİ noktalar döner ve HANGİ nokta etrafında.
   *
   * Çokgen ağırlık merkezi etrafında döner. Yay ve daire dilimi ise KENDİ MERKEZ
   * noktası etrafında döner: merkez yerinde kalır, başlangıç ve bitiş noktaları
   * döner; böylece yarıçap ve merkez açı korunur, şekil yerinde döner.
   * (Önceden yalnızca çokgen döndürülebiliyordu; yarım daire gibi yeni şekillerde
   * döndürme aracı hiçbir şey yapmıyordu.)
   */
  const donusVerisi = (obj: MathObject): { points: PointObject[]; pivot: Point2D } | null => {
    if (obj.type === 'polygon') {
      const pts = (obj as PolygonObject).pointIds
        .map((id) => pointsById.get(id))
        .filter(Boolean) as PointObject[];
      if (pts.length === 0) return null;
      return {
        points: pts,
        pivot: {
          x: pts.reduce((t, p) => t + p.x, 0) / pts.length,
          y: pts.reduce((t, p) => t + p.y, 0) / pts.length,
        },
      };
    }

    if (obj.type === 'arc' || obj.type === 'sector') {
      const sh = obj as ArcObject | SectorObject;
      const merkez = pointsById.get(sh.centerPointId);
      const bas = pointsById.get(sh.startPointId);
      const bit = pointsById.get(sh.directionPointId);
      if (!merkez || !bas || !bit) return null;
      return { points: [bas, bit], pivot: { x: merkez.x, y: merkez.y } };
    }

    // Elipsin biçimi noktalarla değil, iki yarıçap ve bir AÇIYLA tanımlıdır.
    // Bu yüzden döndürmek nokta kaydırmak değil, `rotation` alanını değiştirmektir.
    if (obj.type === 'ellipse') {
      const merkez = pointsById.get((obj as EllipseObject).centerPointId);
      if (!merkez) return null;
      return { points: [], pivot: { x: merkez.x, y: merkez.y } };
    }

    // Doğru parçası kendi ORTA noktası etrafında döner.
    // Sonsuz doğru ve ışın dışarıda: döndürülmüş hâlleri ekranda ayırt edilemez.
    if (obj.type === 'segment') {
      const seg = obj as SegmentObject;
      const pts = [seg.startPointId, seg.endPointId]
        .map((id) => pointsById.get(id))
        .filter(Boolean) as PointObject[];
      if (pts.length < 2) return null;
      return {
        points: pts,
        pivot: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      };
    }

    return null;
  };

  /** Bu şekil döndürme aracıyla çevrilebilir mi? (Tam çemberi döndürmek görsel olarak anlamsızdır.) */
  const dondurulebilir = (obj: MathObject) => donusVerisi(obj) !== null;

  const rotateShapeByAngle = (obj: MathObject, deg: number) => {
    const veri = donusVerisi(obj);
    if (!veri) {
      setHintMessage('Bu şekil döndürülemiyor.');
      return;
    }
    if (obj.type === 'ellipse') {
      const elp = obj as EllipseObject;
      const yeni = (((elp.rotation ?? 0) + deg) % 360 + 360) % 360;
      updateObject(elp.id, { rotation: Number(yeni.toFixed(2)) } as Partial<MathObject>, false);
      recordHistory(`${obj.label || 'Elips'} ${formatTurkishNumber(deg)}° döndürüldü`);
      return;
    }

    const { points, pivot } = veri;
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    points.forEach((pt) => {
      const dx = pt.x - pivot.x;
      const dy = pt.y - pivot.y;
      const nx = Number((pivot.x + dx * cos - dy * sin).toFixed(2));
      const ny = Number((pivot.y + dx * sin + dy * cos).toFixed(2));
      updateObject(pt.id, { x: nx, y: ny }, false);
    });

    recordHistory(`${obj.label || 'Şekil'} ${formatTurkishNumber(deg)}° döndürüldü`);
  };

  const handleStartRotateShape = (e: React.MouseEvent, obj: MathObject) => {
    // El aracı bir GÖRÜNÜM aracıdır: döndürme kolu da kaydırır, şekil dönmez (gorunumKaydirma.ts)
    if (!nesneBasisiIslenmeli(activeTool, e)) return;
    e.stopPropagation();
    e.preventDefault();

    const veri = donusVerisi(obj);
    if (!veri) return;

    const elipsMi = obj.type === 'ellipse';
    const baslangicAcisi = elipsMi ? (obj as EllipseObject).rotation ?? 0 : 0;
    const initialPositions = veri.points.map((p) => ({ id: p.id, x: p.x, y: p.y }));
    const cx = veri.pivot.x;
    const cy = veri.pivot.y;
    const centerScreen = worldToScreen({ x: cx, y: cy }, viewport);

    const svgEl = svgRef.current;
    const rect = svgEl?.getBoundingClientRect() || { left: 0, top: 0 };

    const startClientX = e.clientX - rect.left;
    const startClientY = e.clientY - rect.top;
    const startAngle = Math.atan2(-(startClientY - centerScreen.y), startClientX - centerScreen.x);

    let lastDeg = 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const curClientX = moveEvent.clientX - rect.left;
      const curClientY = moveEvent.clientY - rect.top;
      const currentAngle = Math.atan2(-(curClientY - centerScreen.y), curClientX - centerScreen.x);

      const deltaAngle = currentAngle - startAngle;
      let deg = Math.round((deltaAngle * 180) / Math.PI);

      if (moveEvent.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }

      lastDeg = deg;
      setRotatingFeedback({ shapeId: obj.id, deg });

      if (elipsMi) {
        const yeni = (((baslangicAcisi + deg) % 360) + 360) % 360;
        updateObject(obj.id, { rotation: Number(yeni.toFixed(2)) } as Partial<MathObject>, false);
        return;
      }

      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      initialPositions.forEach((pt) => {
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        const nx = Number((cx + dx * cos - dy * sin).toFixed(2));
        const ny = Number((cy + dx * sin + dy * cos).toFixed(2));
        updateObject(pt.id, { x: nx, y: ny }, false);
      });
    };

    const handleMouseUp = () => {
      setRotatingFeedback(null);
      if (lastDeg !== 0) {
        recordHistory(`${obj.label || 'Şekil'} ${formatTurkishNumber(lastDeg)}° döndürüldü`);
      }
      window.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('pointerup', handleMouseUp);
    };

    window.addEventListener('pointermove', handleMouseMove);
    window.addEventListener('pointerup', handleMouseUp);
  };

  // Yansıtma Fonksiyonu: Herhangi bir simetri doğrusuna (p1, p2) göre nesneyi yansıt
  const reflectPolygonAcrossSymmetryLine = (
    targetPoly: PolygonObject,
    p1: Point2D,
    p2: Point2D,
    axisName: string
  ) => {
    const polyPoints = targetPoly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];

    if (polyPoints.length < 3) return;

    const newPts: PointObject[] = polyPoints.map((p) => {
      const reflected = reflectPointAcrossLine({ x: p.x, y: p.y }, p1, p2);
      return makePoint(`${p.label}'`, reflected.x, reflected.y, '#9333ea');
    });

    const symPoly: PolygonObject = {
      id: createId('poly'),
      type: 'polygon',
      label: `${targetPoly.label || 'Çokgen'} Yansıması`,
      showLabel: true,
      pointIds: newPts.map((p) => p.id),
      color: '#9333ea',
      fillColor: '#9333ea',
      fillOpacity: 0.2,
      visible: true,
      showArea: true,
      showPerimeter: true,
      createdAt: Date.now(),
    };

    addObjects([...newPts, symPoly], `${targetPoly.label || 'Çokgen'}, ${axisName} eksenine göre yansıtıldı`);
  };

  // Zoom Hızlı Eylemleri (görünüm merkezi etrafında)
  const zoomIn = () => zoomAt(null, 1.2);
  const zoomOut = () => zoomAt(null, 1 / 1.2);

  const centerOrigin = () => {
    setViewport((prev) => ({
      ...prev,
      panX: 0,
      panY: 0,
      zoom: DEFAULT_ZOOM,
    }));
  };

  // Tüm nesnelerin sınırlayıcı kutusunu ekrana sığdır (nesne yoksa orijini ortala)
  const fitToObjects = () => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const include = (x: number, y: number, pad = 0) => {
      minX = Math.min(minX, x - pad);
      maxX = Math.max(maxX, x + pad);
      minY = Math.min(minY, y - pad);
      maxY = Math.max(maxY, y + pad);
    };

    for (const obj of objects) {
      if (!obj.visible) continue;
      if (obj.type === 'point') include(obj.x, obj.y);
      else if (obj.type === 'text') include(obj.x, obj.y);
      else if (obj.type === 'fraction') include(obj.x, obj.y, obj.radius);
      else if (obj.type === 'image') include(obj.x, obj.y, Math.max(obj.width, obj.height) / 2);
      else if (obj.type === 'pen') obj.points.forEach((p) => include(p.x, p.y));
      else if (obj.type === 'circle') {
        const c = pointsById.get(obj.centerPointId);
        if (c) {
          const rPt = obj.radiusPointId ? pointsById.get(obj.radiusPointId) : undefined;
          const r = rPt ? calculateDistance(c, rPt) : obj.fixedRadius ?? 0;
          include(c.x, c.y, r);
        }
      }
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      centerOrigin();
      return;
    }

    setViewport((prev) => {
      const padding = 1.5; // dünya birimi
      const boxW = Math.max(maxX - minX + padding * 2, 2);
      const boxH = Math.max(maxY - minY + padding * 2, 2);
      const zoom = Math.max(5, Math.min(300, Math.min(prev.width / boxW, prev.height / boxH)));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      return {
        ...prev,
        zoom,
        panX: -cx * zoom,
        panY: cy * zoom,
      };
    });
  };

  // Özel zemin renginin tonu (koyu temada açık zemin → tuvalin içi açık temayla çizilir)
  // Temaya duyarlı zemin: koyu temada açık renk seçimi koyu bir tona dönüşür, koordinat sistemi koyu kalır
  const { isDark: koyuTema } = useTheme();
  const tuvalZemini = useMemo(() => temaZemini(viewport.backgroundColor, koyuTema), [viewport.backgroundColor, koyuTema]);
  const zeminTonuDegeri = useMemo(() => zeminTonu(tuvalZemini), [tuvalZemini]);

  // Eksen Çizgileri ve Merkez
  const originScreen = useMemo(
    () => worldToScreen({ x: 0, y: 0 }, viewport),
    [viewport]
  );

  // Eksen sayıları, çentikler ve +x / +y / -y rozetlerinin yerleşimi (eksenSayilari.ts): eksen ekran dışındayken
  // kenara yapışan sayılar sol panelin, "<" tutamacının, araç düğmelerinin, alt bilginin ve yakınlaştırma
  // düğmelerinin altına girmez; köşede birbirini ezmez.
  const eksenYerlesimi = useMemo(() => {
    if (!viewport.showAxes) return null;
    const hazirla = (degerler: number[], ekran: (d: number) => number, uzunluk: number): EksenCentigi[] => {
      const out: EksenCentigi[] = [];
      for (const deger of degerler) {
        if (deger === 0) continue;
        const e = ekran(deger);
        if (e < 0 || e > uzunluk) continue;
        out.push({ deger, ekran: e, metin: formatTurkishNumber(deger) });
      }
      return out;
    };
    return eksenSayilariniYerlestir({
      genislik: viewport.width,
      yukseklik: viewport.height,
      orijin: originScreen,
      xCentikleri: hazirla(gridLines.xLines, (d) => worldToScreen({ x: d, y: 0 }, viewport).x, viewport.width),
      yCentikleri: hazirla(gridLines.yLines, (d) => worldToScreen({ x: 0, y: d }, viewport).y, viewport.height),
      adim: gridInfo.step,
      yaziBoyu: fs(10, 'axis'),
      engeller: tuvalEngelleri(viewport.width, viewport.height, { cisimSecici: solids.length > 0 }),
    });
  }, [viewport, originScreen, gridLines, gridInfo.step, fs, solids.length]);
  // Sayıların zemin renginde halesi: ızgara çizgileri ve şekiller üstünde okunur kalır (özel zemin, koyu tema, zemin-acik)
  const eksenSayiHalesi = {
    stroke: tuvalZemini || 'hsl(var(--background))',
    strokeWidth: Math.min(6, Math.max(2.5, fs(3, 'axis'))),
    strokeLinejoin: 'round' as const,
    paintOrder: 'stroke',
  };

  return (
    <div
      ref={containerRef}
      data-zemin-tonu={zeminTonuDegeri ?? undefined}
      className={`relative flex-1 min-w-0 min-h-0 h-full w-full bg-background overflow-hidden select-none ${imlecSinifi(activeTool, 'bos', { kaydiriliyor: isPanning })} ${
        // Seçilen zemin rengi açık/koyu ise tuvalin içi o zemine uygun temayla çizilir (yazı, ızgara, düğmeler okunur kalır)
        zeminTonuDegeri === 'acik' ? 'zemin-acik' : zeminTonuDegeri === 'koyu' ? 'dark' : ''
      }`}
      onPointerUp={handleMouseUp}
      onPointerLeave={handleMouseUp}
    >
      {/* 1. ÜST 2D / 3D DÜZLEM VE SEÇENEKLER ŞERİDİ (Referans Görsel Birebir) */}
      <div className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Sol alan: düzlem ve ayrıntı menüleri */}
        <div className="flex flex-wrap min-w-0 items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            aria-label="Seç ve Taşı"
            aria-keyshortcuts="V"
            aria-pressed={activeTool === 'select'}
            title="Seç ve Taşı (V)"
            className={`relative w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border shadow-sm backdrop-blur-md transition-colors cursor-pointer ${
              activeTool === 'select'
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-card/95 border-border text-foreground hover:bg-accent'
            }`}
          >
            <MousePointer className="w-5 h-5" />
            <kbd className="absolute bottom-0.5 right-1 text-[8px] leading-none opacity-75">V</kbd>
          </button>
          {/* Görünümü Kaydır (El): imlecin hemen yanında */}
          <button
            type="button"
            onClick={() => setActiveTool(activeTool === 'pan' ? 'select' : 'pan')}
            aria-label="Görünümü Kaydır (El Aracı)"
            aria-pressed={activeTool === 'pan'}
            title="Görünümü Kaydır (El Aracı)"
            className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border shadow-sm backdrop-blur-md transition-colors cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-card/95 border-border text-foreground hover:bg-accent'
            }`}
          >
            <Hand className="w-5 h-5" />
          </button>
          {/* Geri Al / Yinele */}
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Geri Al"
            aria-keyshortcuts="Control+Z"
            title="Geri Al (Ctrl+Z)"
            className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border shadow-sm backdrop-blur-md transition-colors bg-card/95 border-border ${
              canUndo
                ? 'text-foreground hover:bg-accent cursor-pointer'
                : 'text-muted-foreground/50 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Yinele"
            aria-keyshortcuts="Control+Y"
            title="Yinele (Ctrl+Y)"
            className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border shadow-sm backdrop-blur-md transition-colors bg-card/95 border-border ${
              canRedo
                ? 'text-foreground hover:bg-accent cursor-pointer'
                : 'text-muted-foreground/50 cursor-not-allowed'
            }`}
          >
            <RotateCw className="w-[18px] h-[18px]" />
          </button>
          {/* Düzlem (eksen / ızgara) ve Ayrıntılı / Sade seçimi sağ tık menüsünde ve Görünüm menüsündedir */}
        </div>

        {/* Sağ Alan: 3D Cisim Üstten Görünüm Modu (Varsa) */}
        <div className="flex items-center gap-2 pointer-events-auto">

          {solids && solids.length > 0 && (
            <div className="flex items-center bg-muted p-0.5 rounded-xl border border-border/80 shadow-xs">
              <button
                type="button"
                onClick={() => setSolidProjectionMode('top')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  solidProjectionMode === 'top'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="3D cisimler 2D düzlemde üstten görünüm (kare, dikdörtgen, daire) olarak gösterilir"
              >
                <span>⏹</span>
                <span>Üstten Görünüm</span>
              </button>
              <button
                type="button"
                onClick={() => setSolidProjectionMode('axonometric')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  solidProjectionMode === 'axonometric'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="3D cisimler 2D düzlemde 3D hacimli aksonometrik izdüşümle gösterilir"
              >
                <Box className="w-3.5 h-3.5" aria-hidden="true" />
                <span>3D İzdüşüm</span>
              </button>
            </div>
          )}

        </div>
      </div>

      <ToolCursor tool={activeTool} surfaceRef={svgRef} />

      <svg
        ref={svgRef}
        data-workspace-canvas="2d"
        className="w-full h-full block transition-colors duration-200"
        style={{ backgroundColor: tuvalZemini || 'transparent', touchAction: 'none' }}
        /* EL ARACI KORUMASI — tuvaldeki TEK kural (gorunumKaydirma.ts).
           Basış, nesne katmanlarına inmeden önce burada süzülür: El aracı (ya da
           orta tuş / Alt) etkinse olay hiçbir alt işleyiciye ulaşmaz, görünüm kayar.
           Böylece yeni bir nesne katmanı eklendiğinde kuralı unutamaz. */
        onPointerDownCapture={(e) => {
          kaydirmaYuttuRef.current = false;
          if (gorunumKaydirmaBasisiMi(activeTool, e) && !kaydirmaDisiHedefMi(e.target as Element)) {
            kaydirmaYuttuRef.current = true;
            e.preventDefault();
            e.stopPropagation();
            cancelLongPress();
            kaydirmayaBasla(e.clientX, e.clientY, e.pointerId);
            return;
          }
          if ((e.target as Element).closest('foreignObject, input, button, textarea, select')) return;
          if (e.pointerType !== 'mouse') e.preventDefault();
          // Yakalamayı basılan öğede tut: SVG köküne almak etiket/düğme click'ini yutar.
          try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* Yakalama desteklenmiyorsa normal olay akışı sürer. */ }
        }}
        /* Dokunmada uzun basış menüsü de aynı korumadan geçer: parmakla kaydırırken
           600 ms sonra nesne menüsü açılmasın. */
        onTouchStartCapture={(e) => {
          if (gorunumKaydirmaBasisiMi(activeTool) && !kaydirmaDisiHedefMi(e.target as Element)) e.stopPropagation();
        }}
        /* Kaydırma basışının ardından gelen tıklama nesneyi değiştirmesin:
           işaret kutusu değişmez, düğme çalışmaz, ölçüm etiketi gizlenmez. */
        onClickCapture={(e) => {
          if (!kaydirmaYuttuRef.current) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        onDoubleClickCapture={(e) => {
          if (!kaydirmaYuttuRef.current) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        onPointerCancel={() => { cancelLongPress(); handleMouseUp(); }}
        /* Süzgeç KÖKE uygulanır; böylece dışa aktarımda kök SVG kopyalandığında
           (PNG/SVG/PDF/Word) çıktı da kendiliğinden siyah–beyaz olur. */
        filter={viewport.blackWhite ? 'url(#geoeba-siyah-beyaz)' : undefined}
        onPointerMove={handleMouseMove}
        onPointerDown={handleMouseDown}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextTarget({ obj: null, x: e.clientX, y: e.clientY, edgeIndex: null });
        }}
      >
        <defs>
          {/* saturate=0: parlaklığı koruyarak renkleri gri tona indirger */}
          <filter id="geoeba-siyah-beyaz" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>

        {/* Arka Plan Yakalayıcı */}
        <rect
          id="grid-background"
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill={tuvalZemini || 'transparent'}
        />

        {/* 1a. NOKTALI IZGARA ("noktalı zemin"): kesişimlerde noktalar; tam birimlerde ve 5'in katlarında daha iri.
            Tek dikdörtgen + SVG deseni: binlerce <circle> yerine sabit maliyet. */}
        {viewport.showGrid && viewport.gridStyle === 'noktali' && (() => {
          const desenler = [
            { id: 'geoeba-noktali-izgara-adim', aralik: gridInfo.step * viewport.zoom, r: 1.6, sinif: 'fill-ada-murekkep-2/45 dark:fill-ada-fildisi/30' },
            ...(gridInfo.step < 1 ? [{ id: 'geoeba-noktali-izgara-birim', aralik: viewport.zoom, r: 2.1, sinif: 'fill-ada-murekkep-2/65 dark:fill-ada-fildisi/45' }] : []),
            { id: 'geoeba-noktali-izgara-ana', aralik: 5 * viewport.zoom, r: 2.8, sinif: 'fill-ada-murekkep-2/80 dark:fill-ada-fildisi/60' },
          ].filter((d) => d.aralik >= 6);
          return (
            <g className="grid-dots select-none pointer-events-none" data-grid-style="noktali" opacity={viewport.gridOpacity ?? 1}>
              <defs>
                {desenler.map((d) => (
                  <pattern
                    key={d.id}
                    id={d.id}
                    patternUnits="userSpaceOnUse"
                    width={d.aralik}
                    height={d.aralik}
                    x={originScreen.x - d.aralik / 2}
                    y={originScreen.y - d.aralik / 2}
                  >
                    <circle cx={d.aralik / 2} cy={d.aralik / 2} r={d.r} className={d.sinif} />
                  </pattern>
                ))}
              </defs>
              {desenler.map((d) => (
                <rect key={d.id} x={0} y={0} width="100%" height="100%" fill={`url(#${d.id})`} />
              ))}
            </g>
          );
        })()}

        {/* 1b. İZOMETRİK IZGARA: dikey ve ±30° eğik çizgi aileleri (eşkenar üçgen örgü, izometrik kâğıt).
            Her aile tek bir döndürülmüş SVG deseni; çizgiler orijinden geçer, aralık = kenar × √3/2. */}
        {viewport.showGrid && viewport.gridStyle === 'izometrik' && (() => {
          const kenar = isometricSide(viewport, gridInfo.step) * viewport.zoom; // üçgen kenarı (piksel); yakalamayla aynı kural
          const aralik = (kenar * Math.sqrt(3)) / 2;
          if (aralik < 6) return null;
          const aileler = [90, 30, -30];
          return (
            <g className="grid-isometric select-none pointer-events-none" data-grid-style="izometrik" opacity={viewport.gridOpacity ?? 1}>
              <defs>
                {aileler.map((aci) => (
                  <pattern
                    key={aci}
                    id={`geoeba-izometrik-${aci < 0 ? 'eksi' : ''}${Math.abs(aci)}`}
                    patternUnits="userSpaceOnUse"
                    width={64}
                    height={aralik}
                    patternTransform={`translate(${originScreen.x} ${originScreen.y}) rotate(${-aci})`}
                  >
                    <line x1={0} y1={0} x2={64} y2={0} strokeWidth={1.1} className="stroke-ada-murekkep-2/30 dark:stroke-ada-fildisi/20" />
                    <line x1={0} y1={aralik} x2={64} y2={aralik} strokeWidth={1.1} className="stroke-ada-murekkep-2/30 dark:stroke-ada-fildisi/20" />
                  </pattern>
                ))}
              </defs>
              {aileler.map((aci) => (
                <rect key={aci} x={0} y={0} width="100%" height="100%" fill={`url(#geoeba-izometrik-${aci < 0 ? 'eksi' : ''}${Math.abs(aci)})`} />
              ))}
            </g>
          );
        })()}

        {/* 1. IZGARA KATMANI (NET VE BELİRGİN GRAFİK KAĞIDI IZGARASI) */}
        {viewport.showGrid && (viewport.gridStyle ?? 'kareli') === 'kareli' && (
          <g className="grid-lines select-none pointer-events-none" data-grid-style="kareli" opacity={viewport.gridOpacity ?? 1}>
            {gridLines.xLines.map((xVal) => {
              const p = worldToScreen({ x: xVal, y: 0 }, viewport);
              const isMainAxis = xVal === 0;
              const isMajor = Math.abs(xVal % 5) < 0.001;
              const isInteger = Math.abs(Math.round(xVal) - xVal) < 0.001;
              // Ana eksenler (x=0, y=0) yalnızca eksenler açıkken ayrıca çizilir;
              // Kareli düzlemde (eksenler kapalıyken) ızgara çizgisi olarak eksiksiz çizilir.
              if (isMainAxis && viewport.showAxes) return null;

              return (
                <line
                  key={`gx-${xVal}`}
                  x1={p.x}
                  y1={-1000}
                  x2={p.x}
                  y2={Math.max(viewport.height, 2000) + 1000}
                  className={
                    isMajor
                      ? 'stroke-ada-murekkep-2/45 dark:stroke-ada-fildisi/25'
                      : isInteger
                      ? 'stroke-ada-murekkep-2/25 dark:stroke-ada-fildisi/15'
                      : 'stroke-ada-murekkep-2/14 dark:stroke-ada-fildisi/8'
                  }
                  strokeWidth={isMajor ? 1.4 : isInteger ? 1.0 : 0.7}
                />
              );
            })}

            {gridLines.yLines.map((yVal) => {
              const p = worldToScreen({ x: 0, y: yVal }, viewport);
              const isMainAxis = yVal === 0;
              const isMajor = Math.abs(yVal % 5) < 0.001;
              const isInteger = Math.abs(Math.round(yVal) - yVal) < 0.001;

              if (isMainAxis && viewport.showAxes) return null;

              return (
                <line
                  key={`gy-${yVal}`}
                  x1={-1000}
                  y1={p.y}
                  x2={Math.max(viewport.width, 3000) + 1000}
                  y2={p.y}
                  className={
                    isMajor
                      ? 'stroke-ada-murekkep-2/45 dark:stroke-ada-fildisi/25'
                      : isInteger
                      ? 'stroke-ada-murekkep-2/25 dark:stroke-ada-fildisi/15'
                      : 'stroke-ada-murekkep-2/14 dark:stroke-ada-fildisi/8'
                  }
                  strokeWidth={isMajor ? 1.4 : isInteger ? 1.0 : 0.7}
                />
              );
            })}
          </g>
        )}

        {/* 2. DÖRT BÖLGE (I, II, III, IV) İSİMLERİ (MEB Analitik Düzlem) */}
        {viewport.showQuadrants && viewport.showAxes && !isSade && (
          <g className="quadrant-badges select-none pointer-events-none font-black text-xs">
            {/* I. Bölge (Sağ Üst: +, +) */}
            <g transform={`translate(${Math.max(originScreen.x + 30, Math.min(viewport.width - 130, (viewport.width + originScreen.x) / 2 - 50))}, ${Math.min(originScreen.y - 45, Math.max(30, originScreen.y / 2 - 12))})`}>
              <rect width="100" height="26" rx="8" fill="#10b981" fillOpacity="0.18" stroke="#10b981" strokeWidth="1.5" className="shadow-sm backdrop-blur-sm" />
              <text x="50" y="17" textAnchor="middle" fill="#047857" fontSize={fs(11, 'axis')} className="font-bold font-sans">
                I. Bölge (+, +)
              </text>
            </g>
            {/* II. Bölge (Sol Üst: -, +) */}
            <g transform={`translate(${Math.min(originScreen.x - 130, Math.max(30, originScreen.x / 2 - 50))}, ${Math.min(originScreen.y - 45, Math.max(30, originScreen.y / 2 - 12))})`}>
              <rect width="100" height="26" rx="8" fill="#f59e0b" fillOpacity="0.18" stroke="#f59e0b" strokeWidth="1.5" className="shadow-sm backdrop-blur-sm" />
              <text x="50" y="17" textAnchor="middle" fill="#b45309" fontSize={fs(11, 'axis')} className="font-bold font-sans">
                II. Bölge (-, +)
              </text>
            </g>
            {/* III. Bölge (Sol Alt: -, -) */}
            <g transform={`translate(${Math.min(originScreen.x - 130, Math.max(30, originScreen.x / 2 - 50))}, ${Math.max(originScreen.y + 30, Math.min(viewport.height - 45, (viewport.height + originScreen.y) / 2 - 12))})`}>
              <rect width="100" height="26" rx="8" fill="#8b5cf6" fillOpacity="0.18" stroke="#8b5cf6" strokeWidth="1.5" className="shadow-sm backdrop-blur-sm" />
              <text x="50" y="17" textAnchor="middle" fill="#6d28d9" fontSize={fs(11, 'axis')} className="font-bold font-sans">
                III. Bölge (-, -)
              </text>
            </g>
            {/* IV. Bölge (Sağ Alt: +, -) */}
            <g transform={`translate(${Math.max(originScreen.x + 30, Math.min(viewport.width - 130, (viewport.width + originScreen.x) / 2 - 50))}, ${Math.max(originScreen.y + 30, Math.min(viewport.height - 45, (viewport.height + originScreen.y) / 2 - 12))})`}>
              <rect width="100" height="26" rx="8" fill="#0284c7" fillOpacity="0.18" stroke="#0284c7" strokeWidth="1.5" className="shadow-sm backdrop-blur-sm" />
              <text x="50" y="17" textAnchor="middle" fill="#0369a1" fontSize={fs(11, 'axis')} className="font-bold font-sans">
                IV. Bölge (+, -)
              </text>
            </g>
          </g>
        )}

        {/* 3. EKSENLER VE SAYISAL ÇENTİKLER KATMANI */}
        {viewport.showAxes && (
          <g fontSize={fs(10, 'axis')} className="axes text-muted-foreground font-mono pointer-events-none">
            {/* X Ekseni */}
            {originScreen.y >= -1000 && originScreen.y <= Math.max(viewport.height, 2000) + 1000 && (
              <>
                <line
                  x1={-1000}
                  y1={originScreen.y}
                  x2={Math.max(viewport.width, 3000) + 1000}
                  y2={originScreen.y}
                  stroke="#737373"
                  strokeWidth={2.5}
                />
                {/* X Eksen Sağ Ok (+x) */}
                <polygon
                  points={`${viewport.width - 12},${originScreen.y - 6} ${viewport.width - 2},${originScreen.y} ${viewport.width - 12},${originScreen.y + 6}`}
                  fill="#737373"
                />
                {/* X Eksen Sol Ok (-x) */}
                <polygon
                  points={`12,${originScreen.y - 6} 2,${originScreen.y} 12,${originScreen.y + 6}`}
                  fill="#737373"
                />
                {/* X Eksen Etiketi: yalnız eksen ekrandayken, düğmelere ve alt bilgiye girmeyen yerde */}
                {eksenYerlesimi?.rozetler.artiX.gorunur && (
                <g transform={`translate(${eksenYerlesimi.rozetler.artiX.x}, ${eksenYerlesimi.rozetler.artiX.y})`}>
                  <rect width="36" height="20" rx="6" fill="#737373" className="shadow-sm" />
                  <text x="18" y="14" textAnchor="middle" fill="#ffffff" fontSize={fs(11, 'axis')} className="font-black font-sans">
                    +x
                  </text>
                </g>
                )}
              </>
            )}

            {/* Y Ekseni */}
            {originScreen.x >= -1000 && originScreen.x <= Math.max(viewport.width, 3000) + 1000 && (
              <>
                <line
                  x1={originScreen.x}
                  y1={-1000}
                  x2={originScreen.x}
                  y2={Math.max(viewport.height, 2000) + 1000}
                  stroke="#737373"
                  strokeWidth={2.5}
                />
                {/* Y Eksen Üst Ok (+y) */}
                <polygon
                  points={`${originScreen.x - 6},12 ${originScreen.x},2 ${originScreen.x + 6},12`}
                  fill="#737373"
                />
                {/* Y Eksen Alt Ok (-y) — Aşağıya doğru tam genişleme */}
                <polygon
                  points={`${originScreen.x - 6},${viewport.height - 12} ${originScreen.x},${viewport.height - 2} ${originScreen.x + 6},${viewport.height - 12}`}
                  fill="#737373"
                />
                {/* Y Eksen Üst Etiketi (+y): yalnız eksen ekrandayken */}
                {eksenYerlesimi?.rozetler.artiY.gorunur && (
                <g transform={`translate(${eksenYerlesimi.rozetler.artiY.x}, ${eksenYerlesimi.rozetler.artiY.y})`}>
                  <rect width="36" height="20" rx="6" fill="#737373" className="shadow-sm" />
                  <text x="18" y="14" textAnchor="middle" fill="#ffffff" fontSize={fs(11, 'axis')} className="font-black font-sans">
                    +y
                  </text>
                </g>
                )}
                {/* Y Eksen Alt Etiketi (-y): yalnız eksen ekrandayken, alt bilgiye ve düğmelere girmeden */}
                {eksenYerlesimi?.rozetler.eksiY.gorunur && (
                <g transform={`translate(${eksenYerlesimi.rozetler.eksiY.x}, ${eksenYerlesimi.rozetler.eksiY.y})`}>
                  <rect width="36" height="20" rx="6" fill="#737373" className="shadow-sm" />
                  <text x="18" y="14" textAnchor="middle" fill="#ffffff" fontSize={fs(11, 'axis')} className="font-black font-sans">
                    -y
                  </text>
                </g>
                )}
              </>
            )}

            {/* Sayısal Değerler (Çentikler): yerleşim eksenSayilari.ts'te (eksen ekran dışındayken kenara yapışır,
                sol panelden / tutamaçtan uzak durur, düğmelerin ve alt bilginin altına düşen sayı çizilmez) */}
            {eksenYerlesimi && (['x', 'y'] as const).map((eksen) =>
              eksenYerlesimi[eksen].ogeler.map((o) => (
                <g key={`t${eksen}-${o.deger}`}>
                  {o.centikGorunur && (
                    <line
                      x1={o.centik.x1}
                      y1={o.centik.y1}
                      x2={o.centik.x2}
                      y2={o.centik.y2}
                      stroke="#737373"
                      strokeWidth={1.5}
                    />
                  )}
                  {o.sayi.gorunur && (
                    <text
                      data-eksen={eksen}
                      x={o.sayi.x}
                      y={o.sayi.y}
                      textAnchor={o.sayi.hiza}
                      {...eksenSayiHalesi}
                      fontSize={fs(10, 'axis')} className="fill-foreground/80 select-none font-bold"
                    >
                      {o.sayi.metin}
                    </text>
                  )}
                </g>
              ))
            )}

            {/* O (Orijin 0,0) Rozeti ve Odak Halkası */}
            {originScreen.x >= -30 && originScreen.x <= viewport.width + 30 && originScreen.y >= -30 && originScreen.y <= viewport.height + 30 && (
              <g transform={`translate(${originScreen.x}, ${originScreen.y})`}>
                <circle cx="0" cy="0" r="14" fill="#737373" fillOpacity="0.15" stroke="#737373" strokeWidth="1.5" strokeDasharray="3,2" />
                <circle cx="0" cy="0" r="4" fill="#737373" stroke="#ffffff" strokeWidth="1.5" />
                <g transform="translate(8, 8)">
                  <rect width="48" height="20" rx="6" fill="#ffffff" stroke="#737373" strokeWidth="1.5" className="shadow-sm" />
                  <text x="24" y="14" textAnchor="middle" fill="#737373" fontSize={fs(10, 'axis')} className="font-mono font-black">
                    (0; 0)
                  </text>
                </g>
              </g>
            )}
          </g>
        )}

        {/* 2.5 İZLER (TRACES) KATMANI — GeoGebra Show Trace */}
        {Object.entries(traces).map(([id, trace]) => {
          if (!trace.points || trace.points.length < 2) return null;
          const ptsStr = trace.points
            .map((pt) => {
              const sp = worldToScreen(pt, viewport);
              return `${sp.x},${sp.y}`;
            })
            .join(' ');
          return (
            <g key={`trace-${id}`} className="select-none" data-iz-id={id}>
              {/* Görünmez geniş yakalayıcı: iz çizgisine sağ tıklayınca "Bu izi sil" menüsü açılır (sol tık tuvale geçer) */}
              <polyline
                points={ptsStr}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                style={{ pointerEvents: 'stroke' }}
                data-iz-yakalayici=""
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextTarget({ obj: null, x: e.clientX, y: e.clientY, edgeIndex: null, izId: id });
                }}
              />
              <polyline
                className="pointer-events-none"
                points={ptsStr}
                fill="none"
                stroke={trace.color || '#2563eb'}
                strokeWidth={2}
                strokeOpacity={0.65}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="3,3"
              />
              {trace.points.map((pt, idx) => {
                if (idx % 3 !== 0) return null;
                const sp = worldToScreen(pt, viewport);
                return (
                  <circle
                    key={`tr-pt-${id}-${idx}`}
                    className="pointer-events-none"
                    cx={sp.x}
                    cy={sp.y}
                    r={2}
                    fill={trace.color || '#2563eb'}
                    fillOpacity={0.7}
                  />
                );
              })}
            </g>
          );
        })}

        {/* 3. FONKSİYON GRAFİKLERİ KATMANI */}
        {objects
          .filter((o) => o.type === 'function' && o.visible)
          .map((obj) => {
            const fn = obj as FunctionObject;
            const compiled = getCompiledExpression(fn.expression);
            if (!compiled) return null;

            const safeEval = (x: number): number => {
              try {
                const y = compiled(x, sliderScope);
                return typeof y === 'number' ? y : NaN;
              } catch (e) {
                return NaN;
              }
            };

            const pointsCount = Math.min(800, Math.max(200, Math.floor(viewport.width / 2)));
            const dx = (worldBounds.maxX - worldBounds.minX) / pointsCount;
            const rangeH = Math.max(worldBounds.maxY - worldBounds.minY, 1e-6);
            // Görünür alanın çok dışına taşan değerler kırpılır (kesikli çizgi değil, ekran dışına çıkış)
            const clampLimit = rangeH * 3;
            const clampY = (y: number) =>
              Math.max(worldBounds.minY - clampLimit, Math.min(worldBounds.maxY + clampLimit, y));

            let pathD = '';
            let isDrawing = false;
            let prevX = 0;
            let prevY: number | null = null;

            for (let i = 0; i <= pointsCount; i++) {
              const xVal = worldBounds.minX + i * dx;
              const yVal = safeEval(xVal);

              // Tanımsız / sonsuz örnek: yol burada kesilir (yeni parça 'M' ile başlar)
              if (!Number.isFinite(yVal)) {
                isDrawing = false;
                prevY = null;
                continue;
              }

              // Süreksizlik tespiti (tan x, 1/x gibi): işaret değişimi + görünür aralığa göre büyük sıçrama
              if (prevY !== null && isDrawing) {
                const signChanged = Math.sign(prevY) !== Math.sign(yVal) && prevY !== 0 && yVal !== 0;
                const bigJump = Math.abs(yVal - prevY) > rangeH * 0.5;
                if (signChanged && bigJump) {
                  // Kutup (dikey asimptot) doğrulaması: iki örneğin ortasına bak.
                  // Orta değer, KENDİ tarafındaki uç örnekten daha da büyümüşse
                  // arada sonsuza kaçan bir kutup vardır -> kop.
                  // Dik ama sürekli bir sıfır geçişinde (ör. 1000x) orta değer
                  // her zaman iki uç değerin arasında kalır -> kopma olmaz.
                  const midY = safeEval((prevX + xVal) / 2);
                  const sameSideRef =
                    Math.sign(midY) === Math.sign(prevY) ? Math.abs(prevY) : Math.abs(yVal);
                  const isPole = !Number.isFinite(midY) || Math.abs(midY) >= sameSideRef;
                  if (isPole) {
                    isDrawing = false;
                  }
                }
              }

              const sPoint = worldToScreen({ x: xVal, y: clampY(yVal) }, viewport);

              if (!isDrawing) {
                pathD += `M ${sPoint.x} ${sPoint.y} `;
                isDrawing = true;
              } else {
                pathD += `L ${sPoint.x} ${sPoint.y} `;
              }
              prevX = xVal;
              prevY = yVal;
            }

            return (
              <g key={fn.id} className={`function-plot ${imlecSinifi(activeTool, 'nesne')}`} data-object-id={fn.id} onContextMenu={(e) => openContextMenu(e, fn)} onPointerDown={(e) => handleObjectMouseDown(e, fn)} onTouchStart={(e) => handleTouchStartOnObject(e, fn)} onTouchMove={cancelLongPress} onTouchEnd={() => cancelLongPress()} onTouchCancel={() => cancelLongPress()}>
                <path d={pathD} fill="none" stroke="transparent" strokeWidth={14} />
                <path
                  d={pathD}
                  fill="none"
                  stroke={fn.color || '#2563eb'}
                  strokeWidth={fn.thickness || 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

        {/* 4. ÇOKGENLER KATMANI */}
        {objects
          .filter((o) => o.type === 'polygon' && o.visible)
          .map((obj) => {
            const poly = obj as PolygonObject;
            const polyPoints = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];

            if (polyPoints.length < 3) return null;

            const screenCoords = polyPoints.map((p) => worldToScreen(p, viewport));
            const pointsAttr = screenCoords.map((p) => `${p.x},${p.y}`).join(' ');

            // Ağırlık Merkezi (Centroid). Alan ve çevre değerleri ölçüm kartı ön geçişinde hesaplanır.
            const centroidScreen = {
              x: screenCoords.reduce((acc, p) => acc + p.x, 0) / screenCoords.length,
              y: screenCoords.reduce((acc, p) => acc + p.y, 0) / screenCoords.length,
            };

            const isSelected = selectedObjectIds.includes(poly.id);
            const hasArea = poly.showArea && showDetails;
            const hasPerimeter = poly.showPerimeter && showDetails;

            return (
              <g
                key={poly.id}
                onPointerDown={(e) => handleObjectMouseDown(e, poly)}
                data-object-id={poly.id} onContextMenu={(e) => openContextMenu(e, poly)}
                onTouchStart={(e) => handleTouchStartOnObject(e, poly)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
              >
                <polygon
                  points={pointsAttr}
                  fill={poly.fillColor || poly.color || '#10b981'}
                  fillOpacity={styleSettings.hideFills ? 0 : poly.fillOpacity || 0.15}
                  stroke={isSelected ? '#ec4899' : poly.color || '#10b981'}
                  strokeWidth={sw(isSelected ? 3 : 2)}
                  className="transition-colors"
                />

                {/* KENAR UZUNLUKLARI: sağ tık menüsünden tek tek veya toplu açılır.
                    Etiket kenarın ORTA noktasına, çokgenin DIŞINA doğru yerleştirilir. */}
                {showDetails &&
                  (poly.edgeLabels || []).map((i) => {
                    if (i < 0 || i >= polyPoints.length) return null;
                    const yazi = cizgiYazimi(kenarUzunlugu(polyPoints, i));
                    const a = polyPoints[i];
                    const b = polyPoints[(i + 1) % polyPoints.length];
                    const orta = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                    const ortaEkran = worldToScreen(orta, viewport);

                    // Kenara dik birim vektör; ağırlık merkezinden UZAKLAŞAN yönü seçilir
                    const sa = screenCoords[i];
                    const sb = screenCoords[(i + 1) % screenCoords.length];
                    const dx = sb.x - sa.x;
                    const dy = sb.y - sa.y;
                    const boy = Math.hypot(dx, dy) || 1;
                    let nx = -dy / boy;
                    let ny = dx / boy;
                    if ((ortaEkran.x - centroidScreen.x) * nx + (ortaEkran.y - centroidScreen.y) * ny < 0) {
                      nx = -nx;
                      ny = -ny;
                    }
                    // Eşitlik çentiği kenarın ortasındadır: etiket çentiğin ucuna değmesin. İşaretler açıkken tüm kenar
                    // etiketleri aynı payla durur (çentik gelip gidince etiket sıçramaz).
                    const centik = esitlik.isaretHaritasi.get(esitlik.temsilci.get(`edge:${poly.id}:${i}`) ?? '');
                    const kenarAraligi = (yazi.kisaKutu.yukseklik / 2 + 12
                      + (centik || esitlik.otomatik ? etiketPayi(centik?.kalinlik ?? 2, styleSettings.strokeScale, 12) : 0)) * etiketOlcegi;
                    const ex = ortaEkran.x + nx * kenarAraligi;
                    const ey = ortaEkran.y + ny * kenarAraligi;
                    const etiket = cizgiEtiketiniYerlestir(yazi, poly.id, edgeLabelKey(i), sa, sb, { x: ex, y: ey });

                    const et = olcumEtiketi(poly.id, edgeLabelKey(i), true, etiket);

                    return (
                      <g
                        key={`kenar-${poly.id}-${i}`}
                        {...et}
                        className="select-none"
                      >
                        {/* Kutu, yazı ve süsler kenara PARALEL döner (kullanıcı isteği); açı her karede uçlardan hesaplanır */}
                        <MatematikEtiketi
                          satirlar={etiket.satirlar}
                          x={ex}
                          y={ey}
                          px={fs(11, 'measure')}
                          renk="on"
                          kutu={{ dolgu: '#ffffff', dolguOpakligi: 0.92, cizgi: poly.color || '#10b981', cizgiKalinligi: 1.2, sinif: 'dark:fill-card' }}
                          kutuGizli={styleSettings.hideLabelBoxes}
                          donmeAcisi={etiket.donmeAcisi}
                          olcu={etiket.olcu}
                          sesli={etiket.sesli}
                          ipucu={etiket.ipucu}
                        />
                      </g>
                    );
                  })}

                {(hasArea || hasPerimeter) && (() => {
                  // MEB yazımı: A(ABC) = 11 br² / Ç(ABC) ≈ 16,3 br. Ad KÖŞELERDEN kurulur
                  // (poly.label 'Çokgen', 'Alan Modeli' olabilir); ad kurulamazsa 'Alan = …' yazılır.
                  // Kutu ölçüsü ve yeri ön geçişten gelir (kartKutulari): açı ve yay rozetleri
                  // bu kutuyu engel sayar. Kutu ÜST kenarından çapalanır: eski sürükleme kayıklıkları tutar.
                  const kart = kartHaritasi.get(poly.id);
                  if (!kart) return null;
                  const et = olcumEtiketi(poly.id, kart.anahtar, true, serbestEtiketYeri(poly.id, kart.anahtar, kart.merkez, kart.olcu));
                  return (
                  <g
                    {...et}
                    className="drop-shadow-sm select-none"
                  >
                    <MatematikEtiketi
                      satirlar={kart.satirlar}
                      x={kart.merkez.x}
                      y={kart.merkez.y}
                      px={fs(11, 'measure')}
                      renk="on"
                      kutu={{ dolgu: '#ffffff', dolguOpakligi: 0.92, cizgi: poly.color || '#10b981', cizgiKalinligi: 1.2, rx: 8, sinif: 'shadow-sm dark:fill-card' }}
                      kutuGizli={styleSettings.hideLabelBoxes}
                      olcu={kart.olcu}
                      sesli={kart.sesli}
                    />
                  </g>
                  );
                })()}

                {/* 🔄 DÖNDÜRME PALETİ (Şekli Döndür Aracı)
                    GENEL KURAL: palet yalnızca SEÇİLİ şekilde görünür. Aksi hâlde tuvaldeki
                    her çokgen kendi paletini çizip ekranı okunmaz hâle getiriyordu. */}
                {activeTool === 'rotate' && isSelected && (
                  <RotateGizmo
                    center={centroidScreen}
                    feedbackDeg={rotatingFeedback?.shapeId === poly.id ? rotatingFeedback.deg : null}
                    onFreeRotateStart={(e) => handleStartRotateShape(e, poly)}
                    onRotate={(deg) => rotateShapeByAngle(poly, deg)}
                  />
                )}
              </g>
            );
          })}

        {/* 4.1 3D KATI CİSİMLER KATMANI (Küp, Prizma, Silindir, Koni, Piramit, Küre) */}
        {solids && solids.length > 0 && (
          <g id="layer-solids-3d">
            {solids.map((solid) => {
              const isSelected = selectedSolidIds.includes(solid.id) || selectedSolidId === solid.id;
              const proj = projectSolidFor2D(solid, viewport, isSelected, solidProjectionMode);

              return (
                <g
                  key={solid.id}
                  id={`solid-${solid.id}`}
                  className={`group ${imlecSinifi(activeTool, 'cisim')}`}
                  data-solid-id={solid.id}
                  onPointerDown={(e) => handleSolidMouseDown(solid, e)}
                  onContextMenu={(e) => {
                    // Boş alan menüsü yerine cismin kendi menüsü (en az "Sil")
                    e.preventDefault();
                    e.stopPropagation();
                    setContextTarget(null);
                    setCisimMenusu({ solidId: solid.id, ad: solid.name, x: e.clientX, y: e.clientY });
                  }}
                >
                  {/* ======================================================== */}
                  {/* A) ÜSTTEN GÖRÜNÜM MODU (Küp -> Kare, Prizma -> Dikdörtgen, vb.) */}
                  {/* ======================================================== */}
                  {solidProjectionMode === 'top' && proj.topView && (
                    <g id={`solid-topview-${solid.id}`}>
                      {/* 1. Çokgen Tabanlı Cisimler (Küp -> Kare, Prizma -> Dikdörtgen, Üçgen Prizma -> Üçgen) */}
                      {proj.topView.kind === 'polygon' && proj.topView.pointsAttr && (
                        <g>
                          <polygon
                            points={proj.topView.pointsAttr}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.20}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2.6 : 1.8}
                            strokeLinejoin="round"
                          />
                          {/* Köşe Noktaları */}
                          {proj.topView.points?.map((pt, pti) => (
                            <circle
                              key={pti}
                              cx={pt.x}
                              cy={pt.y}
                              r={isSelected ? 4 : 3}
                              fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            />
                          ))}
                        </g>
                      )}

                      {/* 2. Dairesel Cisimler (Silindir -> Daire, Küre -> Daire) */}
                      {proj.topView.kind === 'circle' && proj.topView.radius && (
                        <g>
                          <circle
                            cx={proj.topView.centerScreen.x}
                            cy={proj.topView.centerScreen.y}
                            r={proj.topView.radius}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.20}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2.6 : 1.8}
                          />
                          <circle
                            cx={proj.topView.centerScreen.x}
                            cy={proj.topView.centerScreen.y}
                            r={3}
                            fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                          />
                        </g>
                      )}

                      {/* 3. Koni (Daire + Tepe Noktası / Artı İşareti) */}
                      {proj.topView.kind === 'cone' && proj.topView.radius && (
                        <g>
                          <circle
                            cx={proj.topView.centerScreen.x}
                            cy={proj.topView.centerScreen.y}
                            r={proj.topView.radius}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.20}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2.6 : 1.8}
                          />
                          <line
                            x1={proj.topView.centerScreen.x - 6}
                            y1={proj.topView.centerScreen.y}
                            x2={proj.topView.centerScreen.x + 6}
                            y2={proj.topView.centerScreen.y}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={1.5}
                          />
                          <line
                            x1={proj.topView.centerScreen.x}
                            y1={proj.topView.centerScreen.y - 6}
                            x2={proj.topView.centerScreen.x}
                            y2={proj.topView.centerScreen.y + 6}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={1.5}
                          />
                          <circle
                            cx={proj.topView.centerScreen.x}
                            cy={proj.topView.centerScreen.y}
                            r={3}
                            fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                          />
                        </g>
                      )}

                      {/* 4. Piramit (Taban Dikdörtgeni + Tepeye Birleşen 4 Ayrıt) */}
                      {proj.topView.kind === 'pyramid' && proj.topView.pointsAttr && (
                        <g>
                          <polygon
                            points={proj.topView.pointsAttr}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.20}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2.6 : 1.8}
                            strokeLinejoin="round"
                          />
                          {proj.topView.diagEdges?.map((diag, di) => (
                            <line
                              key={di}
                              x1={diag.from.x}
                              y1={diag.from.y}
                              x2={diag.to.x}
                              y2={diag.to.y}
                              stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                              strokeWidth={1.6}
                              strokeDasharray="4 3"
                            />
                          ))}
                          <circle
                            cx={proj.topView.centerScreen.x}
                            cy={proj.topView.centerScreen.y}
                            r={3.5}
                            fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                          />
                          {proj.topView.points?.map((pt, pti) => (
                            <circle
                              key={pti}
                              cx={pt.x}
                              cy={pt.y}
                              r={isSelected ? 4 : 3}
                              fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            />
                          ))}
                        </g>
                      )}

                      {/* Kenar / Yarıçap Ölçü Etiketleri */}
                      {showDetails &&
                        proj.topView.dimensionLabels.map((lbl, li) => (
                          <g key={li} transform={`translate(${lbl.x} ${lbl.y})`} className="select-none pointer-events-none">
                            <rect
                              x={-30}
                              y={-11}
                              width="60"
                              height="20"
                              rx="5"
                              fill="#ffffff"
                              fillOpacity="0.92"
                              stroke="#cbd5e1"
                              strokeWidth="0.9"
                              className="dark:fill-card dark:stroke-border shadow-2xs"
                            />
                            <text
                              x={0}
                              y={3}
                              textAnchor="middle"
                              fontSize="10"
                              className="font-mono font-bold fill-foreground"
                            >
                              {lbl.text}
                            </text>
                          </g>
                        ))}
                    </g>
                  )}

                  {/* ======================================================== */}
                  {/* B) AKSONOMETRİK / HACİMLİ 3D GÖRÜNÜM MODU */}
                  {/* ======================================================== */}
                  {solidProjectionMode === 'axonometric' && (
                    <g id={`solid-axon-${solid.id}`}>
                      {/* 1. Zemin İzdüşümü (Z=0 Düzlemindeki Taban İzi) */}
                      {proj.footprint.pointsAttr && (
                        <polygon
                          points={proj.footprint.pointsAttr}
                          fill={solid.color || '#3b82f6'}
                          fillOpacity={isSelected ? 0.22 : 0.08}
                          stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                          strokeWidth={isSelected ? 1.8 : 1.2}
                          strokeDasharray="4 3"
                        />
                      )}

                      {/* 2. Eğri Yüzeyli Cisimler (Silindir, Koni, Küre) */}
                      {proj.curves && proj.curves.kind === 'cylinder' && (
                        <g>
                          <ellipse
                            cx={proj.curves.bottomCenter.x}
                            cy={proj.curves.bottomCenter.y}
                            rx={proj.curves.rx}
                            ry={proj.curves.ry}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.22}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2 : 1.5}
                            strokeDasharray="4 3"
                          />
                          {proj.curves.topCenter && (
                            <path
                              d={`M ${proj.curves.bottomCenter.x - proj.curves.rx} ${proj.curves.bottomCenter.y}
                                  L ${proj.curves.topCenter.x - proj.curves.rx} ${proj.curves.topCenter.y}
                                  A ${proj.curves.rx} ${proj.curves.ry} 0 0 0 ${proj.curves.topCenter.x + proj.curves.rx} ${proj.curves.topCenter.y}
                                  L ${proj.curves.bottomCenter.x + proj.curves.rx} ${proj.curves.bottomCenter.y}
                                  A ${proj.curves.rx} ${proj.curves.ry} 0 0 1 ${proj.curves.bottomCenter.x - proj.curves.rx} ${proj.curves.bottomCenter.y} Z`}
                              fill={solid.color || '#3b82f6'}
                              fillOpacity={isSelected ? 0.3 : 0.18}
                              stroke="none"
                            />
                          )}
                          {proj.curves.sideLines?.map((sl, sli) => (
                            <line
                              key={sli}
                              x1={sl.from.x}
                              y1={sl.from.y}
                              x2={sl.to.x}
                              y2={sl.to.y}
                              stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                              strokeWidth={isSelected ? 2 : 1.5}
                            />
                          ))}
                          {proj.curves.topCenter && (
                            <ellipse
                              cx={proj.curves.topCenter.x}
                              cy={proj.curves.topCenter.y}
                              rx={proj.curves.rx}
                              ry={proj.curves.ry}
                              fill={solid.color || '#3b82f6'}
                              fillOpacity={isSelected ? 0.45 : 0.32}
                              stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                              strokeWidth={isSelected ? 2 : 1.5}
                            />
                          )}
                        </g>
                      )}

                      {proj.curves && proj.curves.kind === 'cone' && (
                        <g>
                          <ellipse
                            cx={proj.curves.bottomCenter.x}
                            cy={proj.curves.bottomCenter.y}
                            rx={proj.curves.rx}
                            ry={proj.curves.ry}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.3 : 0.18}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2 : 1.5}
                            strokeDasharray="4 3"
                          />
                          {proj.curves.topCenter && (
                            <polygon
                              points={`${proj.curves.bottomCenter.x - proj.curves.rx},${proj.curves.bottomCenter.y} ${proj.curves.topCenter.x},${proj.curves.topCenter.y} ${proj.curves.bottomCenter.x + proj.curves.rx},${proj.curves.bottomCenter.y}`}
                              fill={solid.color || '#3b82f6'}
                              fillOpacity={isSelected ? 0.32 : 0.2}
                              stroke="none"
                            />
                          )}
                          {proj.curves.sideLines?.map((sl, sli) => (
                            <line
                              key={sli}
                              x1={sl.from.x}
                              y1={sl.from.y}
                              x2={sl.to.x}
                              y2={sl.to.y}
                              stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                              strokeWidth={isSelected ? 2 : 1.5}
                            />
                          ))}
                          {proj.curves.topCenter && (
                            <circle
                              cx={proj.curves.topCenter.x}
                              cy={proj.curves.topCenter.y}
                              r={3.5}
                              fill={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            />
                          )}
                        </g>
                      )}

                      {proj.curves && proj.curves.kind === 'sphere' && (
                        <g>
                          <circle
                            cx={proj.curves.bottomCenter.x}
                            cy={proj.curves.bottomCenter.y}
                            r={proj.curves.sphereR}
                            fill={solid.color || '#3b82f6'}
                            fillOpacity={isSelected ? 0.35 : 0.22}
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={isSelected ? 2.2 : 1.6}
                          />
                          <ellipse
                            cx={proj.curves.bottomCenter.x}
                            cy={proj.curves.bottomCenter.y}
                            rx={proj.curves.rx}
                            ry={proj.curves.ry}
                            fill="none"
                            stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                            strokeWidth={1.2}
                            strokeDasharray="4 3"
                            strokeOpacity={0.7}
                          />
                        </g>
                      )}

                      {/* 3. Çokyüzlü Cisimlerin Yüzeyleri (Küp, Prizma, Piramit) */}
                      {!proj.curves &&
                        proj.faces.map((face, fi) => (
                          <polygon
                            key={fi}
                            points={face.pointsAttr}
                            fill={face.fill}
                            fillOpacity={isSelected ? Math.min(1, face.fillOpacity + 0.15) : face.fillOpacity}
                            stroke={face.stroke}
                            strokeWidth={face.strokeWidth}
                            strokeLinejoin="round"
                          />
                        ))}

                      {/* 4. Çokyüzlü Cisimlerin Ayrıtları (Görünen düz, arkadaki kesikli) */}
                      {!proj.curves &&
                        proj.edges.map((edge, ei) => (
                          <line
                            key={ei}
                            x1={edge.from.x}
                            y1={edge.from.y}
                            x2={edge.to.x}
                            y2={edge.to.y}
                            stroke={edge.stroke}
                            strokeWidth={edge.strokeWidth}
                            strokeDasharray={edge.isHidden ? '4 3' : undefined}
                            strokeOpacity={edge.isHidden ? 0.6 : 1}
                            strokeLinecap="round"
                          />
                        ))}
                    </g>
                  )}

                  {/* 5. Cisim Bilgi Rozeti (Başlık, Boyut, Taban Alanı, Hacim) */}
                  {showDetails && (
                    <g
                      transform={`translate(${proj.badge.x}, ${proj.badge.y})`}
                      className="select-none pointer-events-none"
                    >
                      <rect
                        x="-60"
                        y="-19"
                        width="120"
                        height="38"
                        rx="8"
                        fill="#0f172a"
                        fillOpacity="0.90"
                        stroke={isSelected ? '#ec4899' : solid.color || '#3b82f6'}
                        strokeWidth={isSelected ? '1.8' : '1.2'}
                        className="shadow-md backdrop-blur-xs"
                      />
                      <text
                        x="0"
                        y="-4"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill="#ffffff"
                        className="font-sans"
                      >
                        {proj.badge.title}
                      </text>
                      <text
                        x="0"
                        y="11"
                        textAnchor="middle"
                        fontSize="8.5"
                        fill="#cbd5e1"
                        className="font-mono"
                      >
                        {proj.topView
                          ? `A=${formatTurkishNumber(proj.topView.baseArea)} br² · V=${formatTurkishNumber(proj.badge.volume)} br³`
                          : `${proj.badge.dimText} · V=${formatTurkishNumber(proj.badge.volume)} br³`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* 4.25 ÖLÇÜM ETİKETLERİ — "AB eğimi = 5" gibi CANLI sonuç yazıları.
            Değer her karede noktalardan yeniden hesaplanır; noktalar taşınınca güncellenir. */}
        {objects
          .filter((o) => o.type === 'measurement' && o.visible !== false)
          .map((obj) => {
            const m = obj as MeasurementObject;
            if (m.kind === 'arc') return null; // yay ölçümü 7.5 katmanında çizilir
            const noktalar = m.pointIds.map((id) => pointsById.get(id));
            if (noktalar.some((p) => !p)) return null;
            if (!showDetails || m.showValue === false) return null;

            // İKİ NOKTA ARASI UZUNLUK — parça üzerindeki nokta için |AP|, bölünmüş zincir için |AB|.
            // Ölçü çizgisiyle çizilir ki hangi aralığın ölçüldüğü görülsün; kapsayan (daha uzun) ölçüm
            // bir kat dışarıda durur. Bu dal trig'den ÖNCE olmalı: trig üç nokta bekler.
            if (m.kind === 'distance') {
              const [a, b] = noktalar as PointObject[];
              const sa = worldToScreen(a, viewport);
              const sb = worldToScreen(b, viewport);
              const dx = sb.x - sa.x;
              const dy = sb.y - sa.y;
              const boy = Math.hypot(dx, dy) || 1;
              // Normal ekranda YUKARI bakar; soldan sağa çizilmiş parçanın kendi uzunluk etiketi
              // altta durduğu için üst üste binmezler.
              let nx = -dy / boy;
              let ny = dx / boy;
              // Tam dikey çizgide (ny = 0) yön nokta sırasına kalmasın: etiketler hep sağa konur
              if (ny > 1e-9 || (Math.abs(ny) <= 1e-9 && nx < 0)) {
                nx = -nx;
                ny = -ny;
              }
              // MEB yazımı: |AB| = 2 br (yuvarlanan değer '≈' alır). Ad gizliyse yalnızca değer yazılır.
              const olcu = uzunluk(a, b, calculateDistance(a, b));
              const yazi = cizgiYazimi(olcu);
              const yaziBoyu = fs(11, 'measure');
              // Kutu ölçü çizgisine PARALEL döndüğü için çizgiye dik yarı uzanımı her açıda kutu yarı yüksekliğidir.
              // İlk kat çizgiden ve uç nokta harflerinden ~26 px açıkta durur; her kat bir öncekinin dış kenarını 4 px aşar.
              const yariUzanim = yazi.kisaKutu.yukseklik / 2;
              const ofs = (26 + yariUzanim + distanceLabelLevel(objects, m.id) * (2 * yariUzanim + 4)) * etiketOlcegi;
              const ax = sa.x + nx * ofs;
              const ay = sa.y + ny * ofs;
              const bx = sb.x + nx * ofs;
              const by = sb.y + ny * ofs;
              const renk = m.color || '#0f766e';
              const etiket = cizgiEtiketiniYerlestir(yazi, m.id, 'measure', sa, sb, { x: (ax + bx) / 2, y: (ay + by) / 2 });
              const et = olcumEtiketi(m.id, 'measure', true, etiket);
              return (
                <g key={m.id} {...et} data-object-id={m.id} data-measurement="distance" onContextMenu={(e) => openContextMenu(e, m)} className="select-none">
                  <line x1={ax} y1={ay} x2={bx} y2={by} stroke={renk} strokeWidth={1.25} strokeDasharray="4 3" />
                  <line x1={ax - nx * 5} y1={ay - ny * 5} x2={ax + nx * 5} y2={ay + ny * 5} stroke={renk} strokeWidth={1.25} />
                  <line x1={bx - nx * 5} y1={by - ny * 5} x2={bx + nx * 5} y2={by + ny * 5} stroke={renk} strokeWidth={1.25} />
                  {/* Kutu, yazı ve süsler ölçü çizgisine PARALEL döner; açı her karede uçlardan hesaplanır */}
                  <MatematikEtiketi
                    satirlar={etiket.satirlar}
                    x={(ax + bx) / 2}
                    y={(ay + by) / 2}
                    px={yaziBoyu}
                    renk="on"
                    kutu={{ sinif: 'fill-background/95 stroke-border', rx: 7 }}
                    kutuGizli={styleSettings.hideLabelBoxes}
                    donmeAcisi={etiket.donmeAcisi}
                    olcu={etiket.olcu}
                    sesli={sesli(olcu)}
                    ipucu={aciklama(olcu)}
                  />
                </g>
              );
            }

            if (m.kind === 'slope') {
              const [a, b] = noktalar as PointObject[];
              // 'AB eğimi = 2' / 'AB eğimi tanımsız' (dikey doğru)
              const olcu = egim(a, b, calculateSlope(a, b));
              const satirlar = [olcuDugumleri(olcu, yazim)];
              const yaziBoyu = fs(11, 'measure');
              const kutuOlcu = kutuOlcusu(satirlar, yaziBoyu);
              const sa = worldToScreen(a, viewport);
              const sb = worldToScreen(b, viewport);
              // Etiket doğrunun ORTA noktasının YANINA konur; üzerinde durursa
              // doğruyu sürüklemek isteyen kullanıcı etiketi yakalardı.
              const dx = sb.x - sa.x;
              const dy = sb.y - sa.y;
              const boy = Math.hypot(dx, dy) || 1;
              const ex = (sa.x + sb.x) / 2 + (-dy / boy) * 22 * etiketOlcegi;
              const ey = (sa.y + sb.y) / 2 + (dx / boy) * 22 * etiketOlcegi;
              const et = olcumEtiketi(m.id, 'measure', true, serbestEtiketYeri(m.id, 'measure', { x: ex, y: ey }, kutuOlcu));

              return (
                <g key={m.id} {...et} data-object-id={m.id} onContextMenu={(e) => openContextMenu(e, m)} className="select-none">
                  <MatematikEtiketi
                    satirlar={satirlar}
                    x={ex}
                    y={ey}
                    px={yaziBoyu}
                    renk="on"
                    kutu={{ sinif: 'fill-background/95 stroke-border', rx: 7 }}
                    kutuGizli={styleSettings.hideLabelBoxes}
                    olcu={kutuOlcu}
                    sesli={sesli(olcu)}
                    ipucu={aciklama(olcu)}
                  />
                </g>
              );
            }

            // TRİGONOMETRİK ORANLAR — sıra: kol, KÖŞE, kol
            const [kol1, kose, kol2] = noktalar as PointObject[];
            const o = angleTrigRatios(kol1, kose, kol2);
            if (!o) return null;
            // Dik üçgende oranlar KENAR adlarıyla yazılır ('sin B̂ = |AC| / |BC| = 3 / 5 = 0,6');
            // dik açı ölçülen köşedeyse ya da üçgen dik değilse yalnızca değer ('sin B̂ = 0,6').
            const olculer = trigSatirlari(kol1, kose, kol2, o);
            const satirlar = olculer.map((x) => olcuDugumleri(x, yazim));
            const yaziBoyu = fs(11, 'measure');
            const kutuOlcu = kutuOlcusu(satirlar, yaziBoyu);
            const sk = worldToScreen(kose, viewport);
            const ex = sk.x + (34 + kutuOlcu.genislik / 2) * etiketOlcegi;
            const ey = sk.y + (-48 + kutuOlcu.yukseklik / 2) * etiketOlcegi;
            const et = olcumEtiketi(m.id, 'measure', true, serbestEtiketYeri(m.id, 'measure', { x: ex, y: ey }, kutuOlcu));

            return (
              <g key={m.id} {...et} data-object-id={m.id} onContextMenu={(e) => openContextMenu(e, m)} className="select-none">
                <MatematikEtiketi
                  satirlar={satirlar}
                  x={ex}
                  y={ey}
                  px={yaziBoyu}
                  renk="on"
                  kutu={{ sinif: 'fill-background/95 stroke-border', rx: 8 }}
                  kutuGizli={styleSettings.hideLabelBoxes}
                  olcu={kutuOlcu}
                  sesli={olculer.map(sesli).join('. ')}
                  ipucu={olculer.map(aciklama).join(' · ')}
                />
              </g>
            );
          })}

        {/* 4.3 ETKİLEŞİM BİLEŞENLERİ: işaret kutusu, düğme, girdi kutusu
            Şekillerin ÜSTÜNDE çizilir ki tıklanabilsinler. */}
        {objects
          .filter(
            (o) =>
              (o.type === 'checkbox' || o.type === 'button' || o.type === 'input_box') &&
              o.visible !== false
          )
          .map((obj) => {
            const w = obj as CheckboxObject | ButtonObject | InputBoxObject;
            const ekran = worldToScreen({ x: w.x, y: w.y }, viewport);
            const ortak = {
              ekran,
              secili: selectedObjectIds.includes(w.id),
              onMouseDown: (e: React.MouseEvent) => handleObjectMouseDown(e, w),
              onContextMenu: (e: React.MouseEvent) => openContextMenu(e, w),
            };

            if (w.type === 'checkbox') {
              return (
                <CanvasCheckbox
                  key={w.id}
                  obj={w}
                  {...ortak}
                  onToggle={() => toggleCheckbox(w.id)}
                />
              );
            }

            if (w.type === 'button') {
              const act = w.action;
              return (
                <CanvasButton
                  key={w.id}
                  obj={w}
                  {...ortak}
                  onRun={() => {
                    if (act.kind === 'animate') {
                      if (act.play !== undefined) {
                        if (act.play && !sliderPlaying) toggleSliderPlayback();
                        else if (!act.play && sliderPlaying) toggleSliderPlayback();
                      } else {
                        toggleSliderPlayback();
                      }
                      if (act.targetIds?.length) {
                        for (const tid of act.targetIds) {
                          const o = objects.find((obj) => obj.id === tid);
                          if (o?.type === 'point') {
                            updateObject(
                              o.id,
                              { animating: act.play ?? !(o as PointObject).animating } as Partial<MathObject>,
                              true
                            );
                          }
                        }
                      }
                    } else if (act.kind === 'clearTraces') {
                      clearTraces();
                    } else if (act.kind === 'setValue') {
                      const tgt = objects.find((o) => o.id === act.targetId);
                      if (tgt?.type === 'slider') {
                        handleSliderChange(tgt.id, act.value);
                      }
                    } else {
                      runButton(w.id);
                    }
                  }}
                />
              );
            }

            const hedef = objects.find((o) => o.id === w.targetId);
            const deger =
              hedef?.type === 'slider'
                ? sliderDegerMetni((hedef as SliderObject).value)
                : hedef?.type === 'function'
                ? (hedef as FunctionObject).expression
                : '';
            return (
              <CanvasInputBox
                key={w.id}
                obj={w}
                {...ortak}
                deger={deger}
                onCommit={(raw) => applyInputBox(w.id, raw)}
              />
            );
          })}

        {/* 4.4 TUVAL ÜSTÜ KAYDIRICILAR (GeoGebra tarzı fiziksel çubuk) */}
        {sliders
          .filter((s) => s.x !== undefined && s.y !== undefined)
          .map((s) => {
            const uzunluk = s.length ?? 4;
            const sol = worldToScreen({ x: s.x as number, y: s.y as number }, viewport);
            const sag = worldToScreen({ x: (s.x as number) + uzunluk, y: s.y as number }, viewport);
            const aralik = s.max - s.min;
            const oran = aralik > 0 ? (s.value - s.min) / aralik : 0;
            const tutamakX = sol.x + (sag.x - sol.x) * oran;
            const isSelected = selectedObjectIds.includes(s.id);
            const renk = s.color || '#8b5cf6';

            return (
              <g
                key={s.id}
                data-object-id={s.id} onContextMenu={(e) => openContextMenu(e, s)}
                className="select-none"
              >
                {/* Taşıyıcı çizgi */}
                <line
                  x1={sol.x}
                  y1={sol.y}
                  x2={sag.x}
                  y2={sag.y}
                  stroke="#94a3b8"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Dolu kısım */}
                <line
                  x1={sol.x}
                  y1={sol.y}
                  x2={tutamakX}
                  y2={sol.y}
                  stroke={renk}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Uç bölmeleri */}
                <line x1={sol.x} y1={sol.y - 5} x2={sol.x} y2={sol.y + 5} stroke="#94a3b8" strokeWidth={2} />
                <line x1={sag.x} y1={sag.y - 5} x2={sag.x} y2={sag.y + 5} stroke="#94a3b8" strokeWidth={2} />
                {/* Uç değerleri */}
                <text
                  x={sol.x}
                  y={sol.y + 17 * etiketOlcegi}
                  textAnchor="middle"
                  fontSize={fs(11, 'measure')} className="fill-foreground font-bold pointer-events-none"
                >
                  {formatTurkishNumber(s.min)}{s.sliderType === 'angle' ? '°' : ''}
                </text>
                <text
                  x={sag.x}
                  y={sag.y + 17 * etiketOlcegi}
                  textAnchor="middle"
                  fontSize={fs(11, 'measure')} className="fill-foreground font-bold pointer-events-none"
                >
                  {formatTurkishNumber(s.max)}{s.sliderType === 'angle' ? '°' : ''}
                </text>
                {/* Etiket: a = 1,50 */}
                <text
                  x={sol.x}
                  y={sol.y - 12 * etiketOlcegi}
                  fontSize={fs(11, 'measure')} className="fill-foreground font-black font-mono pointer-events-none"
                >
                  {s.variableName} = {formatTurkishNumber(s.value)}{s.sliderType === 'angle' ? '°' : ''}
                </text>
                {/* Tutamak (sürüklenebilir) */}
                <circle
                  cx={tutamakX}
                  cy={sol.y}
                  r={9}
                  fill={renk}
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  className="cursor-grab active:cursor-grabbing drop-shadow-md"
                  onPointerDown={(e) => {
                    // El aracında tutamak da görünümü kaydırır; kaydırıcı değeri değişmez (gorunumKaydirma.ts)
                    if (!nesneBasisiIslenmeli(activeTool, e)) return;
                    if (e.button !== 0) return;
                    e.stopPropagation();
                    setSelectedObjectId(s.id);
                    setSelectedObjectIds([s.id]);
                    sliderDragRef.current = { id: s.id };
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                  }}
                />
                {isSelected && (
                  <circle
                    cx={tutamakX}
                    cy={sol.y}
                    r={13}
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth={2}
                    className="pointer-events-none"
                  />
                )}
              </g>
            );
          })}

        {/* 4.5 YAYLAR VE DAİRE DİLİMLERİ KATMANI */}
        {objects
          .filter((o) => (o.type === 'arc' || o.type === 'sector') && o.visible)
          .map((obj) => {
            const isSector = obj.type === 'sector';
            const shape = obj as ArcObject | SectorObject;
            const center = pointsById.get(shape.centerPointId);
            const startP = pointsById.get(shape.startPointId);
            const dirP = pointsById.get(shape.directionPointId);
            if (!center || !startP || !dirP) return null;

            const geo = getArcGeometry(center, startP, dirP);
            if (!geo) return null;

            const cS = worldToScreen(center, viewport);
            const rPx = geo.radius * viewport.zoom;
            // Ekran uzayında y ters çevrildiği için açılar da negatiflenir
            const pt = (ang: number) => ({
              x: cS.x + rPx * Math.cos(ang),
              y: cS.y - rPx * Math.sin(ang),
            });
            const p0 = pt(geo.startAngle);
            const p1 = pt(geo.endAngle);
            const largeArc = geo.sweep > Math.PI ? 1 : 0;
            // Dünya uzayında saat yönü tersi = ekran uzayında saat yönü (sweep-flag 0)
            const arcSeg = `A ${rPx} ${rPx} 0 ${largeArc} 0 ${p1.x} ${p1.y}`;
            const d = isSector
              ? `M ${cS.x} ${cS.y} L ${p0.x} ${p0.y} ${arcSeg} Z`
              : `M ${p0.x} ${p0.y} ${arcSeg}`;

            const isSelected = selectedObjectIds.includes(shape.id);
            const stroke = isSelected ? '#ec4899' : shape.color || (isSector ? '#10b981' : '#0284c7');
            const derece = (geo.sweep * 180) / Math.PI;

            // Etiket: yayın orta noktasının biraz dışında
            const midAng = geo.startAngle + geo.sweep / 2;
            // Rozet her iki şekilde de yayın DIŞINDA durur; dilimin içindeyken
            // dilimi sürüklemek isteyen kullanıcı rozeti yakalıyordu.
            const labelR = rPx + 12 * etiketOlcegi;
            const labelPos = {
              x: cS.x + labelR * Math.cos(midAng),
              y: cS.y - labelR * Math.sin(midAng),
            };
            const yayEtiketGeo: YayEtiketGeometrisi = { merkez: cS, yaricap: rPx, baslangic: -geo.startAngle, tarama: -geo.sweep };
            // MEB yazımı: |B͡C| ≈ 3,14 br · A(BAC dilimi) ≈ … · r = |AB| = 2 br · kiriş |BC| ≈ … / çap |BC| = 2r = …
            // Yön noktası yayın ÜZERİNDE değilse (yalnızca yönü veriyorsa) ad kurulmaz: 'Yay uzunluğu ≈ …'.
            const yaziBoyu = fs(11, 'measure');
            const olcumler = yayOlculeri(shape, noktaBul, objects, geo).map((x) => {
              const bicimler = x.kind === 'arcLength' ? yazimlar(x.olcu, yazim) : null;
              const satirlar = [bicimler?.kisa ?? olcuDugumleri(x.olcu, yazim)];
              return { kind: x.kind, bicimler, satirlar, kutu: kutuOlcusu(satirlar, yaziBoyu), sesli: sesli(x.olcu), ipucu: aciklama(x.olcu) };
            });
            // Yay uzunluğu teğete paralel; diğer kutular yatay. Radyal açıklık kısa kutularla
            // sabit tutulur; biçim değişimi etiketi sıçratmaz ve dönen kutular birbirine girmez.
            const radyalUzanim = (k: KutuOlcusu) => (Math.abs(Math.cos(midAng)) * k.genislik + Math.abs(Math.sin(midAng)) * k.yukseklik) / 2;
            const yiginR: number[] = [];
            let yigin = 0;
            for (const m of olcumler) {
              const yari = m.kind === 'arcLength' ? m.kutu.yukseklik / 2 : radyalUzanim(m.kutu);
              yiginR.push(yigin + yari);
              yigin += 2 * yari + 6;
            }
            const yiginKonumu = (r: number) => ({ x: labelPos.x + Math.cos(midAng) * r * etiketOlcegi, y: labelPos.y - Math.sin(midAng) * r * etiketOlcegi });

            return (
              <g
                key={shape.id}
                onPointerDown={(e) => handleObjectMouseDown(e, shape)}
                data-object-id={shape.id} onContextMenu={(e) => openContextMenu(e, shape)}
                onTouchStart={(e) => handleTouchStartOnObject(e, shape)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
              >
                {/* Görünmez kalın tutma alanı (ince yayı yakalamak zor olmasın) */}
                <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
                <path
                  d={d}
                  fill={isSector ? (shape as SectorObject).fillColor || '#10b981' : 'none'}
                  fillOpacity={styleSettings.hideFills ? 0 : isSector ? (shape as SectorObject).fillOpacity ?? 0.4 : 0}
                  stroke={stroke}
                  strokeWidth={sw(isSelected ? 4 : (shape as ArcObject).thickness ?? 3)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {showDetails && olcumler.map((m, index) => {
                  const merkez = yiginKonumu(yiginR[index]);
                  const tamKutu = m.bicimler ? kutuOlcusu([m.bicimler.tam], yaziBoyu) : m.kutu;
                  const kayma = etiketKaymasi(shape.id, m.kind, merkez, tamKutu.genislik);
                  const yerlesim = etiketAyrikMi(shape.id, m.kind) ? { uzak: true, donmeAcisi: 0 } : m.bicimler ? yayEtiketiYerlesimi(yayEtiketGeo, merkez, kayma, 18 * etiketOlcegi) : null;
                  const satirlar = m.bicimler ? [yerlesim?.uzak ? m.bicimler.tam : m.bicimler.kisa] : m.satirlar;
                  const kutu = yerlesim?.uzak ? kutuOlcusu(satirlar, yaziBoyu) : m.kutu;
                  return <g key={m.kind} {...olcumEtiketi(shape.id, m.kind, true, { merkez, olcu: kutu, uzak: yerlesim?.uzak ?? Math.hypot(kayma.x, kayma.y) > 18 * etiketOlcegi })} data-measurement={m.kind}>
                    <MatematikEtiketi
                      satirlar={satirlar}
                      x={merkez.x}
                      y={merkez.y}
                      px={yaziBoyu}
                      renk="on"
                      kutu={{ sinif: 'fill-background/90 stroke-border', rx: 7 }}
                      kutuGizli={styleSettings.hideLabelBoxes}
                      olcu={kutu}
                      donmeAcisi={yerlesim?.donmeAcisi ?? 0}
                      sesli={m.sesli}
                      ipucu={m.ipucu}
                    />
                  </g>;
                })}

                {/* MERKEZ AÇI: kendi ölçüm türü ('centralAngle') ve kendi tıklama kutusu var.
                    Önceden alan/yay uzunluğu etiketiyle AYNI grubun içinde çıplak bir <text>'ti;
                    üzerine tıklamak ya hiçbir şey yapmıyor ya da alan etiketini de götürüyordu. */}
                {showDetails && shape.showCentralAngle !== false && (() => {
                  // Ölçüm rozeti varsa derece onun dışına, yoksa onun yerine geçer:
                  // iki etiket birbirinden bağımsız gizlenebildiği için boşluk kalmamalı.
                  // Rozetler birbirine çok yakınken kullanıcı '180°' yerine '6,28 br'
                  // etiketini yakalayabiliyordu; araya kutu yüksekliğinden fazla boşluk konur.
                  // Yazım: ucu yayın üzerinde olan YAYDA m(B͡C), daire diliminde / yön noktasında m(∠BAC).
                  const merkezOlcu = yayMerkezAcisi(shape, noktaBul, objects, geo, derece, { basamak: 1 });
                  const bicimler = yazimlar(merkezOlcu, yazim);
                  const yazi = fs(11, 'measure');
                  const kisaKutu = kutuOlcusu([bicimler.kisa], yazi);
                  const merkez = yiginKonumu(yigin + radyalUzanim(kisaKutu));
                  const uzak = etiketAyrikMi(shape.id, 'centralAngle') || yayEtiketiYerlesimi(yayEtiketGeo, merkez, etiketKaymasi(shape.id, 'centralAngle', merkez, kutuOlcusu([bicimler.tam], yazi).genislik), 18 * etiketOlcegi).uzak;
                  const satirlar = [uzak ? bicimler.tam : bicimler.kisa];
                  const kutu = kutuOlcusu(satirlar, yazi);
                  return (
                  <g {...olcumEtiketi(shape.id, 'centralAngle', true, { merkez, olcu: kutu, uzak })} data-measurement="centralAngle">
                    <MatematikEtiketi
                      satirlar={satirlar}
                      x={merkez.x}
                      y={merkez.y}
                      px={yazi}
                      renk="on"
                      kutu={{ sinif: 'fill-background/90 stroke-border', rx: 6 }}
                      kutuGizli={styleSettings.hideLabelBoxes}
                      olcu={kutu}
                      sesli={sesli(merkezOlcu)}
                      ipucu={aciklama(merkezOlcu)}
                    />
                  </g>
                  );
                })()}

                {/* 🔄 DÖNDÜRME PALETİ — yay ve daire dilimi de çevrilebilir.
                    Merkez yerinde kalır; başlangıç ve bitiş noktaları merkez etrafında döner. */}
                {activeTool === 'rotate' && isSelected && (
                  <RotateGizmo
                    center={cS}
                    feedbackDeg={rotatingFeedback?.shapeId === shape.id ? rotatingFeedback.deg : null}
                    onFreeRotateStart={(e) => handleStartRotateShape(e, shape)}
                    onRotate={(deg) => rotateShapeByAngle(shape, deg)}
                  />
                )}
              </g>
            );
          })}

        {/* 4.6 ELİPSLER KATMANI */}
        {objects
          .filter((o) => o.type === 'ellipse' && o.visible)
          .map((obj) => {
            const elp = obj as EllipseObject;
            const merkez = pointsById.get(elp.centerPointId);
            if (!merkez) return null;

            const cS = worldToScreen(merkez, viewport);
            const rxPx = Math.abs(elp.radiusX) * viewport.zoom;
            const ryPx = Math.abs(elp.radiusY) * viewport.zoom;
            const isSelected = selectedObjectIds.includes(elp.id);
            const hasArea = elp.showArea && showDetails;
            const hasPerimeter = elp.showPerimeter && showDetails;

            return (
              <g
                key={elp.id}
                onPointerDown={(e) => handleObjectMouseDown(e, elp)}
                data-object-id={elp.id} onContextMenu={(e) => openContextMenu(e, elp)}
                onTouchStart={(e) => handleTouchStartOnObject(e, elp)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
              >
                {/* Elipsin kendisi (ve döndürme paleti) döner; ÖLÇÜM KARTI dönmez:
                    yazı hep ekrana göre yatay durur ve sürükleme kayıklığı doğru yöne uygulanır. */}
                <g transform={elp.rotation ? `rotate(${-elp.rotation}, ${cS.x}, ${cS.y})` : undefined}>
                  <ellipse
                    cx={cS.x}
                    cy={cS.y}
                    rx={rxPx}
                    ry={ryPx}
                    fill={elp.fillColor || elp.color || '#0ea5e9'}
                    fillOpacity={styleSettings.hideFills ? 0 : elp.fillOpacity ?? 0.12}
                    stroke={isSelected ? '#ec4899' : elp.color || '#0ea5e9'}
                    strokeWidth={sw(isSelected ? 3 : 2)}
                  />
                  {/* 🔄 DÖNDÜRME PALETİ — elips kendi merkezi etrafında döner */}
                  {activeTool === 'rotate' && isSelected && (
                    <RotateGizmo
                      center={cS}
                      feedbackDeg={rotatingFeedback?.shapeId === elp.id ? rotatingFeedback.deg : null}
                      onFreeRotateStart={(e) => handleStartRotateShape(e, elp)}
                      onRotate={(deg) => rotateShapeByAngle(elp, deg)}
                    />
                  )}
                </g>

                {(hasArea || hasPerimeter) && (() => {
                  // MEB yazımı: 'Alan = πab ≈ …' ve 'Çevre ≈ …' (elips çevresi her zaman yaklaşıktır).
                  const kart = kartHaritasi.get(elp.id);
                  if (!kart) return null;
                  const et = olcumEtiketi(elp.id, kart.anahtar, true, serbestEtiketYeri(elp.id, kart.anahtar, kart.merkez, kart.olcu));
                  return (
                    <g
                      {...et}
                      className="drop-shadow-sm select-none"
                    >
                      <MatematikEtiketi
                        satirlar={kart.satirlar}
                        x={kart.merkez.x}
                        y={kart.merkez.y}
                        px={fs(11, 'measure')}
                        renk="on"
                        kutu={{ sinif: 'fill-background/90 stroke-border', rx: 8 }}
                        kutuGizli={styleSettings.hideLabelBoxes}
                        olcu={kart.olcu}
                        sesli={kart.sesli}
                      />
                    </g>
                  );
                })()}
              </g>
            );
          })}

        {/* 5. ÇEMBERLER KATMANI */}
        {objects
          .filter((o) => o.type === 'circle' && o.visible)
          .map((obj) => {
            const circ = obj as CircleObject;

            // Üç noktadan geçen çemberde merkez ve yarıçap her karede noktalardan hesaplanır
            let center: Point2D | undefined;
            let radius = 0;
            if (circ.throughPointIds && circ.throughPointIds.length === 3) {
              const [ta, tb, tc] = circ.throughPointIds.map((id) => pointsById.get(id));
              if (!ta || !tb || !tc) return null;
              const cc = calculateCircumcircle(ta, tb, tc);
              // Noktalar doğrusallaştıysa çember tanımsızdır; sessizce çizilmez
              if (!cc) return null;
              center = cc.center;
              radius = cc.radius;
            } else {
              center = pointsById.get(circ.centerPointId);
              if (!center) return null;
              radius = circ.fixedRadius ?? 0;
              if (circ.radiusPointId) {
                const rPoint = pointsById.get(circ.radiusPointId);
                if (rPoint) {
                  radius = calculateDistance(center, rPoint);
                }
              }
            }

            const centerScreen = worldToScreen(center, viewport);
            const pixelRadius = radius * viewport.zoom;
            const isSelected = selectedObjectIds.includes(circ.id);

            // Alan ve çevre değerleri ölçüm kartı ön geçişinde hesaplanır (olcuYazimlari.olcumKartKutulari).
            const hasCircArea = circ.showArea && showDetails;
            const hasCircPerimeter = circ.showPerimeter && showDetails;

            return (
              <g
                key={circ.id}
                onPointerDown={(e) => handleObjectMouseDown(e, circ)}
                data-object-id={circ.id} onContextMenu={(e) => openContextMenu(e, circ)}
                onTouchStart={(e) => handleTouchStartOnObject(e, circ)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
              >
                <circle
                  cx={centerScreen.x}
                  cy={centerScreen.y}
                  r={pixelRadius}
                  fill={circ.color || '#8b5cf6'}
                  fillOpacity={styleSettings.hideFills ? 0 : circ.fillOpacity || 0.08}
                  stroke={isSelected ? '#ec4899' : circ.color || '#8b5cf6'}
                  strokeWidth={sw(isSelected ? 3 : 2)}
                />
                {(hasCircArea || hasCircPerimeter) && (() => {
                  // MEB yazımı — çok satırlı kart: başlık Ç(O, r), 'r = |OT| = 1,5 br',
                  // 'Alan = πr² ≈ 7,07 br²', 'Çevre = 2πr ≈ 9,42 br'. Eski 'r = … | A = …' satırındaki
                  // 'A =' tuvaldeki A noktasıyla karışıyordu. Üç noktadan geçen çemberin merkezi adsızdır:
                  // başlık yazılmaz. Kutu ÜST kenarından çapalanır, sürükleme kayıklıkları yerinde kalır.
                  const kart = kartHaritasi.get(circ.id);
                  if (!kart) return null;
                  const et = olcumEtiketi(circ.id, kart.anahtar, true, serbestEtiketYeri(circ.id, kart.anahtar, kart.merkez, kart.olcu));
                  return (
                  <g
                    {...et}
                    className="drop-shadow-sm select-none"
                  >
                    <MatematikEtiketi
                      satirlar={kart.satirlar}
                      x={kart.merkez.x}
                      y={kart.merkez.y}
                      px={fs(11, 'measure')}
                      renk="on"
                      kutu={{ dolgu: '#ffffff', dolguOpakligi: 0.92, cizgi: circ.color || '#8b5cf6', cizgiKalinligi: 1.2, rx: 7, sinif: 'shadow-sm dark:fill-card' }}
                      kutuGizli={styleSettings.hideLabelBoxes}
                      olcu={kart.olcu}
                      sesli={kart.sesli}
                    />
                  </g>
                  );
                })()}
              </g>
            );
          })}

        {/* 6. AÇILAR KATMANI */}
        {objects
          .filter((o) => o.type === 'angle' && o.visible)
          .map((obj) => {
            const ang = obj as AngleObject;
            const p1 = pointsById.get(ang.point1Id);
            const vertex = pointsById.get(ang.vertexPointId);
            const p3 = pointsById.get(ang.point3Id);

            if (!p1 || !vertex || !p3) return null;
            const isAngleSelected = selectedObjectIds.includes(ang.id);

            const icDeg = calculateAngleDegrees(p1, vertex, p3);
            // reflex: iç açı yerine onu 360°'ye tamamlayan dış açı gösterilir
            const deg = ang.reflex ? 360 - icDeg : icDeg;
            const vScreen = worldToScreen(vertex, viewport);

            // Kolların ekran uzayındaki yönleri (y ekseni ters olduğu için negatiflendi)
            const angle1 = Math.atan2(-(p1.y - vertex.y), p1.x - vertex.x);
            const angle2 = Math.atan2(-(p3.y - vertex.y), p3.x - vertex.x);
            // angle1'den angle2'ye giden en kısa dönüş (-π, π]; iç açıyı tarar
            let delta = angle2 - angle1;
            while (delta <= -Math.PI) delta += 2 * Math.PI;
            while (delta > Math.PI) delta -= 2 * Math.PI;
            // Dış açıda ters yönden dolaşılır
            const sweepDelta = ang.reflex ? delta - Math.sign(delta || 1) * 2 * Math.PI : delta;
            // Açıortay: yayın tam ortası (±180° sınırında da doğru çalışır)
            const midAngle = angle1 + sweepDelta / 2;

            // Yay yolu (SVG arc): küçük yay iç açıyı, büyük yay dış açıyı çizer
            const arcR = 22 * etiketOlcegi;
            const arcStart = {
              x: vScreen.x + arcR * Math.cos(angle1),
              y: vScreen.y + arcR * Math.sin(angle1),
            };
            const arcEnd = {
              x: vScreen.x + arcR * Math.cos(angle1 + sweepDelta),
              y: vScreen.y + arcR * Math.sin(angle1 + sweepDelta),
            };
            const largeArcFlag = Math.abs(sweepDelta) > Math.PI ? 1 : 0;
            const sweepFlag = sweepDelta > 0 ? 1 : 0;
            const arcPath = `M ${arcStart.x} ${arcStart.y} A ${arcR} ${arcR} 0 ${largeArcFlag} ${sweepFlag} ${arcEnd.x} ${arcEnd.y}`;

            // Rozetin yeri ve tam/kısa biçimi ön geçişte, GRUP olarak verilir (aciRozetleri):
            // yayın dışında, kollar arasında, kenarları ve ölçüm kartlarını kesmeyen en yakın yer.
            const rozet = aciRozetleri.rozetler.get(ang.id);

            // 90° görünen ölçü kare işareti kullanır (değer yine yazılır).
            const isRightAngle = !ang.reflex && Math.round(deg) === 90;
            const squareSide = arcR / Math.SQRT2;
            const squareStart = { x: vScreen.x + squareSide * Math.cos(angle1), y: vScreen.y + squareSide * Math.sin(angle1) };
            const squareEnd = { x: vScreen.x + squareSide * Math.cos(angle2), y: vScreen.y + squareSide * Math.sin(angle2) };
            const markerPath = isRightAngle
              ? `M ${squareStart.x} ${squareStart.y} L ${squareStart.x + squareEnd.x - vScreen.x} ${squareStart.y + squareEnd.y - vScreen.y} L ${squareEnd.x} ${squareEnd.y}`
              : arcPath;

            return (
              <g
                key={ang.id}
                onPointerDown={(e) => handleObjectMouseDown(e, ang)}
                data-object-id={ang.id} onContextMenu={(e) => openContextMenu(e, ang)}
                onTouchStart={(e) => handleTouchStartOnObject(e, ang)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
              >
                {/* NOT: Burada eskiden r=22'lik DOLU görünmez bir disk vardı. Açı katmanı
                    çokgen ve çemberin ÜSTÜNDE çizildiği için bu disk, ölçülmüş köşenin
                    çevresindeki her basışı şekil yerine AÇIYA yönlendiriyordu; kullanıcı
                    şekli sürüklediğini sanırken yalnızca üç köşe kayıp şekil bozuluyordu.
                    Artık yalnızca yayın kendi üzerindeki kalın şerit yakalıyor. */}
                {/* Açı Yayı: iç açıda küçük, dış açıda büyük yay çizilir */}
                <path
                  d={markerPath}
                  data-angle-marker={isRightAngle ? 'right' : 'arc'}
                  fill="none"
                  stroke={isAngleSelected ? '#ec4899' : ang.color || '#f59e0b'}
                  strokeWidth={isAngleSelected ? 3 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="miter"
                  className="opacity-80"
                />
                {/* Yayın üzerinden de tutulabilsin diye görünmez kalın şerit */}
                <path
                  d={markerPath}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  pointerEvents={activeTool === 'select' || activeTool === 'delete' ? 'auto' : 'none'}
                />
                {/* Açı Değer Rozeti — MEB yazımı: m(ABC^) = 60° (ayar: m(∠ABC)); sığmazsa '60°' */}
                {showDetails && ang.showValue !== false && rozet && (
                  <g {...olcumEtiketi(ang.id, 'angle', true, rozet)}>
                    <MatematikEtiketi
                      satirlar={rozet.satirlar}
                      x={rozet.merkez.x}
                      y={rozet.merkez.y}
                      px={fs(11, 'measure')}
                      renk="on"
                      kutu={{ sinif: 'fill-background/90 stroke-border', rx: 6 }}
                      kutuGizli={styleSettings.hideLabelBoxes}
                      olcu={rozet.olcu}
                      sesli={rozet.sesli}
                      ipucu={rozet.ipucu}
                    />
                  </g>
                )}
              </g>
            );
          })}

        {/* 7. DOĞRULAR, IŞINLAR VE DOĞRU PARÇALARI KATMANI */}
        {objects
          .filter((o) => ['segment', 'line', 'ray'].includes(o.type) && o.visible)
          .map((obj) => {
            const isSelected = selectedObjectIds.includes(obj.id);

            if (obj.type === 'segment') {
              const seg = obj as SegmentObject;
              const p1 = pointsById.get(seg.startPointId);
              const p2 = pointsById.get(seg.endPointId);
              if (!p1 || !p2) return null;

              const s1 = worldToScreen(p1, viewport);
              const s2 = worldToScreen(p2, viewport);
              const length = calculateDistance(p1, p2);
              const midpointScreen = { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 };

              return (
                <g
                  key={seg.id}
                  onPointerDown={(e) => handleObjectMouseDown(e, seg)}
                data-object-id={seg.id} onContextMenu={(e) => openContextMenu(e, seg)}
                onTouchStart={(e) => handleTouchStartOnObject(e, seg)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                  className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
                >
                  <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="transparent" strokeWidth={14} />
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={isSelected ? '#ec4899' : seg.color || '#0284c7'}
                    strokeWidth={sw(isSelected ? (seg.thickness || 2.5) + 1.5 : seg.thickness || 2.5)}
                    strokeLinecap="round"
                    className="hover:opacity-80 transition-all"
                  />
                  {seg.showLength && showDetails && (() => {
                    const yazi = cizgiYazimi(segmentUzunlugu(seg, noktaBul));
                    // Etiket doğrunun ÜZERİNDE değil, YANINDA durur: üzerindeyken
                    // doğruyu ortasından tutup sürüklemek isteyen kullanıcı etiketi yakalıyordu.
                    const dx = s2.x - s1.x;
                    const dy = s2.y - s1.y;
                    const boy = Math.hypot(dx, dy) || 1;
                    // Kısmi uzunluk ('distance') etiketleri ekranda yukarı bakan normale konur; parçanın kendi uzunluğu
                    // hep KARŞI tarafta durur. Eskiden çizim yönüne bağlıydı: sağdan sola ya da dikey çizilmiş parçada iki
                    // etiket üst üste biniyordu.
                    let nx = -dy / boy;
                    let ny = dx / boy;
                    // Mesafe etiketleriyle AYNI kural (tam dikeyde onlar sağda, bu etiket solda)
                    if (ny > 1e-9 || (Math.abs(ny) <= 1e-9 && nx < 0)) {
                      nx = -nx;
                      ny = -ny;
                    }
                    // Kutu ve yazı parçaya PARALEL döner (kullanıcı isteği: uzunluk, ölçtüğü çizgiye paralel dursun);
                    // dik uzaklık bu yüzden her açıda aynıdır. Açı her karede uçlardan hesaplanır: parça ya da bir ucu
                    // döndürülüp taşındığında etiket yeni doğrultuya kendiliğinden uyar.
                    // Kalın çizgide eşitlik çentiği uzar: etiket çentiğin ucuna değmesin (ince çizgide pay ~0)
                    const centik = esitlik.isaretHaritasi.get(esitlik.temsilci.get(`seg:${seg.id}`) ?? '');
                    const aralik = (yazi.kisaKutu.yukseklik / 2 + 14
                      + (centik || esitlik.otomatik ? etiketPayi(centik?.kalinlik ?? (seg.thickness || 2.5), styleSettings.strokeScale, 14) : 0)) * etiketOlcegi;
                    const ex = midpointScreen.x - nx * aralik;
                    const ey = midpointScreen.y - ny * aralik;
                    const etiket = cizgiEtiketiniYerlestir(yazi, seg.id, 'length', s1, s2, { x: ex, y: ey });
                    return (
                      <g {...olcumEtiketi(seg.id, 'length', true, etiket)}>
                        <MatematikEtiketi
                          satirlar={etiket.satirlar}
                          x={ex}
                          y={ey}
                          px={fs(11, 'measure')}
                          renk="on"
                          kutu={{ sinif: 'fill-background/95 stroke-border/80 shadow-sm' }}
                          kutuGizli={styleSettings.hideLabelBoxes}
                          donmeAcisi={etiket.donmeAcisi}
                          olcu={etiket.olcu}
                          sesli={etiket.sesli}
                          ipucu={etiket.ipucu}
                        />
                      </g>
                    );
                  })()}

                  {/* 🔄 DÖNDÜRME PALETİ — doğru parçası kendi orta noktası etrafında döner */}
                  {activeTool === 'rotate' && selectedObjectIds.includes(seg.id) && (
                    <RotateGizmo
                      center={midpointScreen}
                      feedbackDeg={rotatingFeedback?.shapeId === seg.id ? rotatingFeedback.deg : null}
                      onFreeRotateStart={(e) => handleStartRotateShape(e, seg)}
                      onRotate={(deg) => rotateShapeByAngle(seg, deg)}
                    />
                  )}
                </g>
              );
            }

            if (obj.type === 'line') {
              const line = obj as LineObject;
              const p1 = pointsById.get(line.point1Id);
              const p2 = pointsById.get(line.point2Id);
              if (!p1 || !p2) return null;

              // Sonsuz doğruyu ekran sınırlarına genişlet
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const len = Math.hypot(dx, dy);
              if (len === 0) return null;
              const extendWorld = Math.max(viewport.width, viewport.height) * 2 / viewport.zoom;
              const pStart = { x: p1.x - (dx / len) * extendWorld, y: p1.y - (dy / len) * extendWorld };
              const pEnd = { x: p2.x + (dx / len) * extendWorld, y: p2.y + (dy / len) * extendWorld };

              const s1 = worldToScreen(pStart, viewport);
              const s2 = worldToScreen(pEnd, viewport);
              const eq = calculateLineEquation(p1, p2);

              return (
                <g
                  key={line.id}
                  onPointerDown={(e) => handleObjectMouseDown(e, line)}
                data-object-id={line.id} onContextMenu={(e) => openContextMenu(e, line)}
                onTouchStart={(e) => handleTouchStartOnObject(e, line)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                  className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
                >
                  <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="transparent" strokeWidth={14} />
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={isSelected ? '#ec4899' : line.color || '#0284c7'}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {line.showEquation && showDetails && (() => {
                    // Denklem METNİ değişmez; yalnızca ölçü yazımı düzeniyle çizilir (fs ile ölçeklenir, hale okunur kılar).
                    const satirlar = [metniCozumle(eq.equationText, yazim)];
                    const yazi = fs(11, 'measure');
                    const kutu = kutuOlcusu(satirlar, yazi, { yatay: 0 });
                    const s2e = worldToScreen(p2, viewport);
                    return (
                      <MatematikEtiketi
                        satirlar={satirlar}
                        x={s2e.x + (12 + kutu.genislik / 2) * etiketOlcegi}
                        y={s2e.y - (8 + kutu.yukseklik / 2) * etiketOlcegi}
                        px={yazi}
                          renk="on"
                        kutu={null}
                        hale
                        olcu={kutu}
                        sesli={eq.equationText}
                      />
                    );
                  })()}
                  {line.showLength && showDetails && (() => {
                    // |AB| yazısı doğruya PARALEL durur; ekranda üst (tam dikeyde sağ) tarafta 14 px açıkta.
                    // Açı her karede uçlardan hesaplanır: doğru döndürülünce yazı da döner.
                    const ekranA = worldToScreen(p1, viewport);
                    const ekranB = worldToScreen(p2, viewport);
                    const ddx = ekranB.x - ekranA.x;
                    const ddy = ekranB.y - ekranA.y;
                    const boy = Math.hypot(ddx, ddy) || 1;
                    let nx = -ddy / boy;
                    let ny = ddx / boy;
                    if (ny > 1e-9 || (Math.abs(ny) <= 1e-9 && nx < 0)) {
                      nx = -nx;
                      ny = -ny;
                    }
                    const dogruAraligi = 20 * etiketOlcegi;
                    const ex = (ekranA.x + ekranB.x) / 2 + nx * dogruAraligi;
                    const ey = (ekranA.y + ekranB.y) / 2 + ny * dogruAraligi;
                    // Manrope'ta '|' büyük I ile aynı görünür ('IABI'): mutlak değer çizgileri artık ÇİZGİ olarak çizilir.
                    const dogruOlcu = uzunluk(p1, p2, calculateDistance(p1, p2));
                    const etiket = cizgiEtiketiniYerlestir(cizgiYazimi(dogruOlcu), line.id, 'length', ekranA, ekranB, { x: ex, y: ey });
                    return (
                      <g {...olcumEtiketi(line.id, 'length', true, etiket)} data-measurement="length">
                        <MatematikEtiketi
                          satirlar={etiket.satirlar}
                          x={ex}
                          y={ey}
                          px={fs(11, 'measure')}
                          renk="on"
                          kutu={null}
                          hale
                          donmeAcisi={etiket.donmeAcisi}
                          sesli={sesli(dogruOlcu)}
                          ipucu={aciklama(dogruOlcu)}
                        />
                      </g>
                    );
                  })()}
                </g>
              );
            }

            if (obj.type === 'ray') {
              const ray = obj as RayObject;
              const p1 = pointsById.get(ray.startPointId);
              const p2 = pointsById.get(ray.throughPointId);
              if (!p1 || !p2) return null;

              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const len = Math.hypot(dx, dy);
              if (len === 0) return null;
              const extendWorld = Math.max(viewport.width, viewport.height) * 2 / viewport.zoom;
              const pEnd = { x: p1.x + (dx / len) * extendWorld, y: p1.y + (dy / len) * extendWorld };

              const s1 = worldToScreen(p1, viewport);
              const s2 = worldToScreen(pEnd, viewport);

              return (
                <g
                  key={ray.id}
                  onPointerDown={(e) => handleObjectMouseDown(e, ray)}
                data-object-id={ray.id} onContextMenu={(e) => openContextMenu(e, ray)}
                onTouchStart={(e) => handleTouchStartOnObject(e, ray)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                  className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
                >
                  <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="transparent" strokeWidth={14} />
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={isSelected ? '#ec4899' : ray.color || '#0284c7'}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  {ray.showLength && showDetails && (() => {
                    // |AB| yazısı doğruya PARALEL durur; ekranda üst (tam dikeyde sağ) tarafta 14 px açıkta.
                    // Açı her karede uçlardan hesaplanır: doğru döndürülünce yazı da döner.
                    const ekranA = worldToScreen(p1, viewport);
                    const ekranB = worldToScreen(p2, viewport);
                    const ddx = ekranB.x - ekranA.x;
                    const ddy = ekranB.y - ekranA.y;
                    const boy = Math.hypot(ddx, ddy) || 1;
                    let nx = -ddy / boy;
                    let ny = ddx / boy;
                    if (ny > 1e-9 || (Math.abs(ny) <= 1e-9 && nx < 0)) {
                      nx = -nx;
                      ny = -ny;
                    }
                    const isinAraligi = 20 * etiketOlcegi;
                    const ex = (ekranA.x + ekranB.x) / 2 + nx * isinAraligi;
                    const ey = (ekranA.y + ekranB.y) / 2 + ny * isinAraligi;
                    // Manrope'ta '|' büyük I ile aynı görünür ('IABI'): mutlak değer çizgileri artık ÇİZGİ olarak çizilir.
                    const isinOlcu = uzunluk(p1, p2, calculateDistance(p1, p2));
                    const etiket = cizgiEtiketiniYerlestir(cizgiYazimi(isinOlcu), ray.id, 'length', ekranA, ekranB, { x: ex, y: ey });
                    return (
                      <g {...olcumEtiketi(ray.id, 'length', true, etiket)} data-measurement="length">
                        <MatematikEtiketi
                          satirlar={etiket.satirlar}
                          x={ex}
                          y={ey}
                          px={fs(11, 'measure')}
                          renk="on"
                          kutu={null}
                          hale
                          donmeAcisi={etiket.donmeAcisi}
                          sesli={sesli(isinOlcu)}
                          ipucu={aciklama(isinOlcu)}
                        />
                      </g>
                    );
                  })()}
                </g>
              );
            }

            return null;
          })}

        {/* 7.5 YAY ÖLÇÜMLERİ — iki nokta arasındaki yay, çember BÖLÜNMEDEN (src/math/arcMeasure.ts).
            Vurgu noktaların altında; rozet çemberin DIŞINDA ve çemberin alan/çevre kutusuyla, diğer yay rozetleriyle çakışmaz. */}
        {showDetails && objects.some(isArcMeasurement) && (() => {
          const z = viewport.zoom || 1;
          // Ölçüm kartlarının (çember, çokgen, elips) GERÇEK ekran kutuları ön geçişten gelir.
          // Eskiden çember kartı "160 x 24/40" diye varsayılıyordu; kart artık 3-4 satırlık.
          const dolu: Kutu[] = [...kartEngelleri];
          // Engel kutuları sabit çizim uzayındadır. Kamera/kadraj ve araç çubukları
          // yazıyı yeniden yerleştiremez; pan/zoom yalnız çizimin görünümünü değiştirir.
          const cakisir = (a: Kutu) => dolu.some((b) => a.x0 < b.x1 + 4 && b.x0 < a.x1 + 4 && a.y0 < b.y1 + 4 && b.y0 < a.y1 + 4);
          // Çemberi GİZLİ olan ölçüm çizilmez: görünmeyen çemberin üzerinde öksüz bir vurgu kalmasın
          // (nokta gizlemek, parça/çember gizlemek gibi değildir: üzerine kurulan şekiller çizilmeye devam eder).
          const gizliCemberler = new Set(objects.filter((o) => o.type === 'circle' && o.visible === false).map((o) => o.id));
          /**
           * Uçlar çakıştığında (ya da bir uç merkeze geldiğinde) çizilecek yay yoktur. Ölçüm sessizce
           * kaybolmasın diye rozet açıklamayla çemberin tepesinde durur; noktalar ayrılınca değer geri gelir.
           */
          const yayCozulemedi = (m: ArcMeasurement) => {
            const cember = objects.find((o) => o.id === m.circleId);
            const g = cember && cember.type === 'circle' ? circleGeometryOf(cember, objects) : null;
            if (!g) return null;
            const c = worldToScreen(g.center, viewport);
            const yazi = fs(11, 'measure');
            const baslik = arcBadgeTitle(m, objects, null);
            const metin = arcUnresolvedText(m, objects);
            const satirlar = [metniCozumle(baslik, yazim), metniCozumle(metin, yazim)];
            const kutu = kutuOlcusu(satirlar, yazi, { minGenislik: 96 });
            const lp = { x: c.x, y: c.y - g.radius * z - (12 + kutu.yukseklik / 2) * etiketOlcegi };
            return (
              <g key={m.id} data-object-id={m.id} data-yay-olcumu={m.id} data-yay-cozulemedi="1" className="select-none">
                <g {...olcumEtiketi(m.id, 'measure', true, { merkez: lp, olcu: kutu, uzak: true })} data-yay-rozeti="1" data-measurement="arc" onContextMenu={(e) => openContextMenu(e, m)}>
                  <MatematikEtiketi
                    satirlar={satirlar}
                    x={lp.x}
                    y={lp.y}
                    px={yazi}
                    renk="yay"
                    satirRengi={['yay', 'uyari']}
                    kutu={{ sinif: 'fill-background/95 stroke-border', rx: 8 }}
                    kutuGizli={styleSettings.hideLabelBoxes}
                    hale
                    olcu={kutu}
                    sesli={`${baslik}. ${metin}`}
                  />
                </g>
              </g>
            );
          };
          return objects
            .filter((o): o is ArcMeasurement => isArcMeasurement(o) && o.visible !== false && o.showValue !== false && !gizliCemberler.has(o.circleId))
            .map((m) => {
              const yay = resolveArc(m, objects);
              if (!yay) return yayCozulemedi(m);
              const cS = worldToScreen(yay.center, viewport);
              const rPx = yay.radius * z;
              const nokta = (a: number) => ({ x: cS.x + rPx * Math.cos(a), y: cS.y - rPx * Math.sin(a) }); // ekranda y ters
              const p0 = nokta(yay.startAngle);
              const p1 = nokta(yay.startAngle + yay.sweep);
              // sweep-flag 0 = dünyada saat yönünün tersi
              const d = `M ${p0.x} ${p0.y} A ${rPx} ${rPx} 0 ${yay.sweep > Math.PI ? 1 : 0} 0 ${p1.x} ${p1.y}`;
              const kopuk = arcDetachedText(yay, objects);
              const baslik = arcBadgeTitle(m, objects, yay);
              const yazi = fs(11, 'measure');
              // MEB yazımı: 1. satır |B͡D| ≈ 4,71 br (ara noktayla |B͡C͡D|), 2. satır m(B͡D) = 90°.
              // Adlar, büyük/yarım kararı ve ara nokta arcMeasure.ts'ten gelir: başlıkla asla çelişmez.
              // Bir uç çemberin üzerinden kalktıysa 2. satırın YERİNE kırmızı uyarı yazılır (bugünkü davranış).
              const yayYazimi = yayOlcumuYazimi(m, objects, noktaBul);
              const tamSatirlar = yayYazimi
                ? [olcuDugumleri(yayYazimi.uzunluk, yazim), kopuk ? metniCozumle(kopuk, yazim) : olcuDugumleri(yayYazimi.olcu, yazim)]
                : [metniCozumle(baslik, yazim), metniCozumle(kopuk ?? arcValueText(yay), yazim)];
              // Kopmuş ölçümlerin açıklaması kısaltılmaz; uyarı satırı yatay ve görünür kalır.
              const uyarlanabilir = !!yayYazimi && !kopuk;
              const kisaSatirlar = yayYazimi && uyarlanabilir
                ? [yazimlar(yayYazimi.uzunluk, yazim).kisa, yazimlar(yayYazimi.olcu, yazim).kisa]
                : tamSatirlar;
              const tamKutu = kutuOlcusu(tamSatirlar, yazi, { minGenislik: 96 });
              const kisaKutu = uyarlanabilir ? kutuOlcusu(kisaSatirlar, yazi) : tamKutu;
              const layoutC = worldToScreen(yay.center, etiketGorunumu);
              const layoutR = yay.radius * LABEL_LAYOUT_ZOOM;
              const yayEtiketGeo: YayEtiketGeometrisi = { merkez: layoutC, yaricap: layoutR, baslangic: -yay.startAngle, tarama: -yay.sweep };
              const radyalNokta = (aci: number, ek: number): Point2D => ({
                x: layoutC.x + (layoutR + ek) * Math.cos(aci), y: layoutC.y - (layoutR + ek) * Math.sin(aci),
              });
              const yatayPay = (aci: number) => (Math.abs(Math.cos(aci)) * tamKutu.genislik + Math.abs(Math.sin(aci)) * tamKutu.yukseklik) / 2;
              const capa = radyalNokta(yay.midAngle, 12 + (uyarlanabilir ? kisaKutu.yukseklik / 2 : yatayPay(yay.midAngle)));
              const durum = (p: Point2D, kayma: Point2D = { x: 0, y: 0 }) => uyarlanabilir
                ? yayEtiketiYerlesimi(yayEtiketGeo, capa, { x: p.x - capa.x + kayma.x, y: p.y - capa.y + kayma.y })
                : { uzak: true, donmeAcisi: 0 };
              // Rozet, yayın ortasında çemberin DIŞINDA: aci yönünde, çembere `ek` px daha uzak
              const yer = (aci: number, ek: number): Point2D => {
                const p = radyalNokta(aci, 12 + ek + (uyarlanabilir ? kisaKutu.yukseklik / 2 : yatayPay(aci)));
                return uyarlanabilir && durum(p).uzak ? radyalNokta(aci, 12 + ek + yatayPay(aci)) : p;
              };
              // Teğete dönen kutunun gerçek ekran sınırı: çakışma ve kadraj denetimleri de dönüşü kullanır.
              const kutusu = (p: Point2D, kayma: Point2D = { x: 0, y: 0 }): Kutu => {
                const d = durum(p, kayma);
                const k = d.uzak ? tamKutu : kisaKutu;
                const aci = d.donmeAcisi * Math.PI / 180;
                const w = (Math.abs(Math.cos(aci)) * k.genislik + Math.abs(Math.sin(aci)) * k.yukseklik) / 2;
                const h = (Math.abs(Math.sin(aci)) * k.genislik + Math.abs(Math.cos(aci)) * k.yukseklik) / 2;
                return { x0: p.x + kayma.x - w, y0: p.y + kayma.y - h, x1: p.x + kayma.x + w, y1: p.y + kayma.y + h };
              };
              let lp = yer(yay.midAngle, 0);
              // Varsayılan çapa sürüklemeden bağımsız hesaplanır; ilk kayıklık kaydedilince
              // otomatik yerleşmiş rozet yayın ortasına sıçramasın.
              if (cakisir(kutusu(lp))) {
                const kaymalar = [0];
                for (let i = 1; i <= 8; i++) kaymalar.push((i * Math.min(yay.sweep, Math.PI)) / 18, (-i * Math.min(yay.sweep, Math.PI)) / 18);
                let bulunan: Point2D | null = null;
                for (let ek = 0; ek <= 96 && !bulunan; ek += 12) {
                  for (const kayma of kaymalar) {
                    const p = yer(yay.midAngle + kayma, ek);
                    if (!cakisir(kutusu(p))) { bulunan = p; break; }
                  }
                }
                for (let ek = 0; ek <= 288 && !bulunan; ek += 12) {
                  const p = yer(yay.midAngle, ek);
                  if (!cakisir(kutusu(p))) bulunan = p;
                }
                if (bulunan) lp = bulunan;
              }
              const ekranLp = projectLabelPoint(lp, viewport);
              const kayma = etiketKaymasi(m.id, 'measure', ekranLp, tamKutu.genislik);
              const yerlesim = etiketAyrikMi(m.id, 'measure') ? { uzak: true, donmeAcisi: 0 } : durum(lp, { x: kayma.x / etiketOlcegi, y: kayma.y / etiketOlcegi });
              const satirlar = yerlesim.uzak ? tamSatirlar : kisaSatirlar;
              const kutuOlcu = yerlesim.uzak ? tamKutu : kisaKutu;
              // Sonraki rozetin çapası, bu rozetin elle sürüklendiği yerden etkilenmesin.
              // Otomatik yerleşim her rozetin kayıklık uygulanmamış kutusunu ayırır.
              dolu.push(kutusu(lp));
              const varsayilan = !m.color || m.color === YAY_OLCUMU_RENGI;
              const secili = selectedObjectIds.includes(m.id);
              // Sil aracında vurgu da tıklanabilir: altındaki ÇEMBER değil, yalnızca ölçüm silinir
              const silAraci = activeTool === 'delete';
              return (
                <g
                  key={m.id}
                  data-object-id={m.id}
                  data-yay-olcumu={m.id}
                  data-yay-tarafi={yay.half ? 'yarim' : yay.major ? 'buyuk' : 'kucuk'}
                  data-yay-derece={yay.degrees.toFixed(2)}
                  data-yay-uzunluk={yay.length.toFixed(4)}
                  data-yay-kopuk={kopuk ? '1' : undefined}
                  className="select-none"
                >
                  <path
                    d={d}
                    fill="none"
                    data-yay-vurgusu="1"
                    strokeWidth={sw(secili ? 8 : 6)}
                    strokeLinecap="round"
                    strokeOpacity={kopuk ? 0.45 : 0.9}
                    strokeDasharray={kopuk ? '6 8' : undefined}
                    stroke={varsayilan ? undefined : m.color}
                    className={varsayilan ? 'stroke-lime-600 dark:stroke-lime-400' : undefined}
                    style={{ pointerEvents: silAraci ? 'stroke' : 'none', cursor: silAraci ? imlecDegeri(activeTool, 'etiket') : undefined }}
                    /* el-araci-izinli: yalnızca Sil aracında bağlanır; El aracı etkinken bu işleyici hiç kurulmaz. */
                    onPointerDown={silAraci ? (e) => e.stopPropagation() : undefined}
                    onClick={
                      silAraci
                        ? (e) => {
                            e.stopPropagation();
                            deleteObjects([m.id]);
                            setHintMessage(`${baslik} silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın.`);
                          }
                        : undefined
                    }
                  />
                  <g {...olcumEtiketi(m.id, 'measure', true, { merkez: ekranLp, olcu: kutuOlcu, uzak: yerlesim.uzak })} data-yay-rozeti="1" data-measurement="arc" onContextMenu={(e) => openContextMenu(e, m)}>
                    <MatematikEtiketi
                      satirlar={satirlar}
                      x={ekranLp.x}
                      y={ekranLp.y}
                      px={yazi}
                      renk={varsayilan ? 'yay' : { hex: m.color }}
                      satirRengi={[varsayilan ? 'yay' : { hex: m.color }, kopuk ? 'uyari' : 'on']}
                      kutu={{ sinif: 'fill-background/95 stroke-border', rx: 8 }}
                      kutuGizli={styleSettings.hideLabelBoxes}
                      hale
                      olcu={kutuOlcu}
                      donmeAcisi={yerlesim.donmeAcisi}
                      sesli={yayYazimi ? `${sesli(yayYazimi.uzunluk)}. ${kopuk ?? sesli(yayYazimi.olcu)}` : `${baslik}. ${kopuk ?? arcValueText(yay)}`}
                      ipucu={yayYazimi ? `${baslik}: ${aciklama(yayYazimi.uzunluk)}` : baslik}
                    />
                  </g>
                </g>
              );
            });
        })()}

        {/* 7.8 EŞİTLİK ÇENTİKLERİ KATMANI: eşit uzunluk/yay işaretleri (|, ||, |||). Ölçü rozeti değil, Sade'de de çizilir;
            tıklamayı engellemez; geçişsiz (kaydırırken geride kalmaz). Noktaların altında. */}
        <EsitlikIsaretleriKatmani
          isaretler={esitlik.isaretler}
          viewport={viewport}
          seciliIdler={selectedObjectIds}
          cizgiOlcegi={styleSettings.strokeScale}
          noktalar={esitlikNoktalari}
          noktaYaricapi={styleSettings.pointRadius}
        />

        {/* 8. NOKTALAR KATMANI */}
        {objects
          .filter((o) => o.type === 'point' && o.visible)
          .map((obj) => {
            const pt = obj as PointObject;
            const sPos = worldToScreen(pt, viewport);
            const isSelected = selectedObjectIds.includes(pt.id);
            const isPending = pendingPointIds.includes(pt.id);

            // Sade modda nokta gövdesi ve harfi gizlenir (aşağıdaki koşullarda),
            // ancak grup render edilmeye devam eder: 18 px'lik görünmez yakalayıcı
            // korunur ki noktalar Sade modda da seçilebilsin / taşınabilsin.

            return (
              <g
                key={pt.id}
                className={`group select-none ${imlecSinifi(activeTool, 'nokta')}`}
                onPointerDown={(e) => handleObjectMouseDown(e, pt)}
                data-object-id={pt.id} onContextMenu={(e) => openContextMenu(e, pt)}
                onTouchStart={(e) => handleTouchStartOnObject(e, pt)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
              >
                {/* Geniş Tıklama ve Tutma Yakalama Alanı (Görünmez Kolay Yakalayıcı) */}
                <circle
                  cx={sPos.x}
                  cy={sPos.y}
                  r={18}
                  fill="transparent"
                  className={imlecSinifi(activeTool, 'nokta')}
                />

                {/* Seçim veya Bekleme Halkası */}
                {(isSelected || isPending) && (
                  <circle
                    cx={sPos.x}
                    cy={sPos.y}
                    r={12}
                    fill="none"
                    stroke={isPending ? '#f59e0b' : '#ec4899'}
                    strokeWidth={2}
                    strokeDasharray={isPending ? '3,3' : undefined}
                    className="animate-pulse pointer-events-none"
                  />
                )}

                {/* Nokta Gövdesi (Sade modda seçili değilse gizli) */}
                {(!isSade || isSelected || isPending || activeTool === 'point') && (
                  <circle
                    cx={sPos.x}
                    cy={sPos.y}
                    r={(pt.size || styleSettings.pointRadius) + (isSelected ? 1.5 : 0)}
                    fill={isPointLocked(pt, objects) ? '#94a3b8' : pt.color || '#2563eb'}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 3 : 2}
                    // Yalnızca boyut/renk yumuşak geçer. transition-all cx/cy'yi de (tarayıcıda CSS özelliği) 150 ms'de
                    // kaydırıyordu: kaydırma ve yakınlaştırmada noktalar doğruların gerisinde kalıyordu.
                    className="transition-[r,fill,stroke-width] pointer-events-none drop-shadow-sm"
                  />
                )}

                {/* Nokta Etiketi (Harf) ve Koordinat (Sade modda tamamen gizli) */}
                {pt.showLabel && !isSade && (() => {
                  // Nokta adı sürüklenebilir: kalabalık çizimlerde adlar üst üste
                  // biniyordu. Kayıklık nesnenin kendi labelOffsets alanında tutulur,
                  // yani nokta taşınınca ad da onunla birlikte gider.
                  const et = olcumEtiketi(pt.id, 'pointLabel', false);
                  // Ad, noktadan çıkan ya da üzerinden geçen çizgilerin kesmediği ilk tercihli yöne konur
                  // (sağ üst → sol üst → sağ alt → …). Kullanıcı isteği: nokta harfleri çizgilerin
                  // üzerine gelmekten her zaman kaçsın. Kullanıcının elle sürüklediği kayıklık üstüne eklenir.
                  const adBoyu = fs(12, 'label');
                  const koordinat = viewport.showCoordinates && showDetails ? ` ${formatCoordinate(pt, 1)}` : '';
                  const yer = noktaAdiYeri(worldToScreen(pt, etiketGorunumu), noktaEngelHaritasi.get(pt.id) ?? [], {
                    genislik: (pt.label || '').length * adBoyu * 0.66 + koordinat.length * fs(10, 'label') * 0.56,
                    yukseklik: adBoyu,
                  });
                  const ekranYeri = projectLabelPoint(yer, viewport);
                  return (
                  <text
                    transform={et.transform}
                    style={et.style}
                    onPointerDown={et.onPointerDown}
                    onClick={et.onClick}
                    x={ekranYeri.x}
                    y={ekranYeri.y}
                    textAnchor={yer.textAnchor}
                    data-ad-yonu={yer.yon}
                    fontSize={adBoyu} className="fill-foreground font-bold select-none drop-shadow"
                  >
                    {pt.label}
                    {viewport.showCoordinates && showDetails && (
                      <tspan fontSize={fs(10, 'label')} className="font-normal fill-muted-foreground ml-1">
                        {' '}
                        {formatCoordinate(pt, 1)}
                      </tspan>
                    )}
                  </text>
                  );
                })()}
              </g>
            );
          })}

        {/* 9. SERBEST ÇİZİMLER (KALEM) KATMANI */}
        {objects
          .filter((o) => o.type === 'pen' && o.visible)
          .map((obj) => {
            const stroke = obj as PenStrokeObject;
            if (stroke.points.length < 2) return null;
            const pts = stroke.points.map((p) => worldToScreen(p, viewport));
            const pathData = pts.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
            const isSelected = selectedObjectIds.includes(stroke.id);

            return (
              <g
                key={stroke.id}
                onPointerDown={(e) => handleObjectMouseDown(e, stroke)}
                data-object-id={stroke.id} onContextMenu={(e) => openContextMenu(e, stroke)}
                onTouchStart={(e) => handleTouchStartOnObject(e, stroke)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
              >
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#ec4899' : stroke.color || '#e11d48'}
                  strokeWidth={stroke.thickness || 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`hover:opacity-80 ${imlecSinifi(activeTool, 'nesne')}`}
                />
              </g>
            );
          })}

        {/* Aktif Kalem Çizimi Önizlemesi */}
        {isDrawingPen && currentPenStroke.length > 1 && (
          <path
            d={currentPenStroke
              .map((p) => worldToScreen(p, viewport))
              .reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '')}
            fill="none"
            stroke="#e11d48"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none"
          />
        )}

        {/* 10. KESİR MODELLERİ KATMANI */}
        {objects
          .filter((o) => o.type === 'fraction' && o.visible)
          .map((obj) => {
            const frac = obj as FractionObject;
            const center = worldToScreen({ x: frac.x, y: frac.y }, viewport);
            const rPx = frac.radius * viewport.zoom;
            const isSelected = selectedObjectIds.includes(frac.id);
            const fracColor = frac.color || '#8b5cf6';
            // Geçersiz payda (0 veya negatif) -> 0/1 olarak göster
            const rawN = Number.isFinite(frac.numerator) ? Math.max(0, Math.round(frac.numerator)) : 0;
            const rawD = Number.isFinite(frac.denominator) ? Math.round(frac.denominator) : 0;
            const isInvalid = rawD <= 0;
            const n = isInvalid ? 0 : rawN;
            const d = isInvalid ? 1 : rawD;
            // Bileşik kesir: her bütünde d parça, ceil(n/d) bütün çizilir
            const wholes = Math.max(1, Math.ceil(n / d));
            const isBar = frac.modelType === 'bar';

            const shapes: React.ReactNode[] = [];
            let totalWidthPx = 0;
            let totalHeightPx = 0;

            if (isBar) {
              // Çubuk modeli: her bütün, d eşit dikdörtgen parçaya bölünmüş bir çubuk
              const barW = rPx * 2;
              const barH = Math.max(18 * etiketOlcegi, rPx * 0.6);
              const gap = Math.max(6 * etiketOlcegi, rPx * 0.15);
              totalWidthPx = barW;
              totalHeightPx = wholes * barH + (wholes - 1) * gap;
              const top = center.y - totalHeightPx / 2;
              const left = center.x - barW / 2;

              for (let w = 0; w < wholes; w++) {
                const y = top + w * (barH + gap);
                for (let i = 0; i < d; i++) {
                  const globalIndex = w * d + i;
                  const isFilled = globalIndex < n;
                  shapes.push(
                    <rect
                      key={`bar-${w}-${i}`}
                      x={left + (i * barW) / d}
                      y={y}
                      width={barW / d}
                      height={barH}
                      fill={isFilled ? fracColor : '#ffffff'}
                      fillOpacity={isFilled ? 0.45 : 0.8}
                      stroke={fracColor}
                      strokeWidth={1.5}
                    />
                  );
                }
                shapes.push(
                  <rect
                    key={`bar-outline-${w}`}
                    x={left}
                    y={y}
                    width={barW}
                    height={barH}
                    fill="none"
                    stroke={isSelected ? '#ec4899' : fracColor}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                );
              }
            } else {
              // Daire (pasta) modeli: bütünler yan yana
              const gap = Math.max(8 * etiketOlcegi, rPx * 0.2);
              totalWidthPx = wholes * rPx * 2 + (wholes - 1) * gap;
              totalHeightPx = rPx * 2;
              const firstCx = center.x - totalWidthPx / 2 + rPx;

              for (let w = 0; w < wholes; w++) {
                const cx = firstCx + w * (rPx * 2 + gap);
                const cy = center.y;
                if (d <= 1) {
                  const isFilled = w < n;
                  shapes.push(
                    <circle
                      key={`slice-full-${w}`}
                      cx={cx}
                      cy={cy}
                      r={rPx}
                      fill={isFilled ? fracColor : '#ffffff'}
                      fillOpacity={isFilled ? 0.45 : 0.8}
                      stroke={fracColor}
                      strokeWidth={1.5}
                    />
                  );
                } else {
                  for (let i = 0; i < d; i++) {
                    const startAngle = (i * 2 * Math.PI) / d - Math.PI / 2;
                    const endAngle = ((i + 1) * 2 * Math.PI) / d - Math.PI / 2;
                    const x1 = cx + rPx * Math.cos(startAngle);
                    const y1 = cy + rPx * Math.sin(startAngle);
                    const x2 = cx + rPx * Math.cos(endAngle);
                    const y2 = cy + rPx * Math.sin(endAngle);
                    const isFilled = w * d + i < n;

                    shapes.push(
                      <path
                        key={`slice-${w}-${i}`}
                        d={`M ${cx} ${cy} L ${x1} ${y1} A ${rPx} ${rPx} 0 0 1 ${x2} ${y2} Z`}
                        fill={isFilled ? fracColor : '#ffffff'}
                        fillOpacity={isFilled ? 0.45 : 0.8}
                        stroke={fracColor}
                        strokeWidth={1.5}
                      />
                    );
                  }
                }
                shapes.push(
                  <circle
                    key={`outline-${w}`}
                    cx={cx}
                    cy={cy}
                    r={rPx}
                    fill="none"
                    stroke={isSelected ? '#ec4899' : fracColor}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                );
              }
            }

            const badgeY = center.y + totalHeightPx / 2 + 8 * etiketOlcegi;

            return (
              <g
                key={frac.id}
                onPointerDown={(e) => handleObjectMouseDown(e, frac)}
                data-object-id={frac.id} onContextMenu={(e) => openContextMenu(e, frac)}
                onTouchStart={(e) => handleTouchStartOnObject(e, frac)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
              >
                {shapes}
                {showDetails && (
                  <g className="pointer-events-none drop-shadow-sm select-none">
                    <rect
                      x={center.x - 30}
                      y={badgeY}
                      width={60}
                      height={26}
                      rx={8}
                      fill="#0f172a"
                      fillOpacity={0.94}
                      stroke={fracColor}
                      strokeWidth={1.2}
                    />
                    <text
                      x={center.x}
                      y={badgeY + 17}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={12}
                      className="font-black font-mono tracking-wide"
                    >
                      {n}/{d}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

        {/* 11. METİN VE NOTLAR KATMANI */}
        {objects
          .filter((o) => o.type === 'text' && o.visible)
          .map((obj) => {
            const txt = obj as TextObject;
            const sPos = worldToScreen({ x: txt.x, y: txt.y }, viewport);
            const isSelected = selectedObjectIds.includes(txt.id);
            const fontSize = txt.fontSize || 14;
            const textWidth = Math.max(70, txt.text.length * (fontSize * 0.62) + 28);
            const textHeight = fontSize + 16;

            return (
              <g
                key={txt.id}
                onPointerDown={(e) => handleObjectMouseDown(e, txt)}
                data-object-id={txt.id} onContextMenu={(e) => openContextMenu(e, txt)}
                onTouchStart={(e) => handleTouchStartOnObject(e, txt)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingTextObj(txt);
                  setPendingTextWorldPos({ x: txt.x, y: txt.y });
                  setIsTextDialogOpen(true);
                }}
                className={`select-none group/txt ${imlecSinifi(activeTool, 'nesne')}`}
              >
                {/* Not Arka Plan Kartı */}
                <rect
                  x={sPos.x - 10}
                  y={sPos.y - textHeight + 6}
                  width={textWidth}
                  height={textHeight}
                  rx={8}
                  fill={isSelected ? '#eff6ff' : '#ffffff'}
                  stroke={isSelected ? '#2563eb' : '#cbd5e1'}
                  strokeWidth={isSelected ? 2 : 1.2}
                  className="shadow-sm transition-colors group-hover/txt:stroke-primary dark:fill-card dark:stroke-border"
                />

                {/* Not Metni */}
                <text
                  x={sPos.x}
                  y={sPos.y}
                  fill={txt.color || '#1e293b'}
                  fontSize={fontSize}
                  className="font-bold font-sans dark:fill-foreground"
                >
                  {txt.text}
                </text>

                {/* Düzenleme Kalem İkonu (Hover'da Görünür) */}
                <g
                  transform={`translate(${sPos.x + textWidth - 24}, ${sPos.y - textHeight + 10})`}
                  className="opacity-0 group-hover/txt:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTextObj(txt);
                    setPendingTextWorldPos({ x: txt.x, y: txt.y });
                    setIsTextDialogOpen(true);
                  }}
                >
                  <circle cx="6" cy="6" r="8" fill="#fbf7ee" stroke="#216a78" strokeWidth="1" />
                  {/* Düzenle: küçük kalem (emoji yerine çizim) */}
                  <path d="M2.6 9.4 3 7.2 7.6 2.6 9.4 4.4 4.8 9 2.6 9.4ZM6.8 3.4 8.6 5.2" fill="none" stroke="#216a78" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" />
                </g>
              </g>
            );
          })}

        {/* 12. GÖRSEL VE ŞEMALAR KATMANI */}
        {objects
          .filter((o) => o.type === 'image' && o.visible)
          .map((obj) => {
            const img = obj as ImageObject;
            const sPos = worldToScreen({ x: img.x, y: img.y }, viewport);
            const wPx = img.width * viewport.zoom;
            const hPx = img.height * viewport.zoom;
            const isSelected = selectedObjectIds.includes(img.id);

            return (
              <g
                key={img.id}
                onPointerDown={(e) => handleObjectMouseDown(e, img)}
                data-object-id={img.id} onContextMenu={(e) => openContextMenu(e, img)}
                onTouchStart={(e) => handleTouchStartOnObject(e, img)}
                onTouchMove={cancelLongPress}
                onTouchEnd={() => cancelLongPress()}
                onTouchCancel={() => cancelLongPress()}
                className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
              >
                <image
                  href={img.src}
                  x={sPos.x - wPx / 2}
                  y={sPos.y - hPx / 2}
                  width={wPx}
                  height={hPx}
                  preserveAspectRatio="xMidYMid meet"
                />
                {isSelected && (
                  <rect
                    x={sPos.x - wPx / 2 - 3}
                    y={sPos.y - hPx / 2 - 3}
                    width={wPx + 6}
                    height={hPx + 6}
                    rx={4}
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth={2.5}
                    strokeDasharray="6,3"
                    className="pointer-events-none"
                  />
                )}
              </g>
            );
          })}

        {/* 13. SÜRÜKLEYEREK ŞEKİL OLUŞTURMA CANLI ÖNİZLEMESİ
             Önizleme, handleMouseUp'taki oluşturma koduyla AYNI dünya matematiğinden türetilir:
             aynı yuvarlama (0,1) ve aynı çapa (dünyada sol-alt köşe). Aksi hâlde ekran y ekseni
             ters olduğu için kare/dikdörtgen önizlemesi imlecin altında görünür ama şekil
             yukarıda oluşurdu. */}
        {/* PERGEL ÖNİZLEMESİ */}
        {activeTool === 'compass' && pergel && (() => {
          const cS = worldToScreen(pergel.merkez, viewport);
          const rPx = (pergel.yaricap ?? pergel.tarama) * viewport.zoom;
          if (!(rPx > 0)) return null;
          const yatayUc = { x: cS.x + rPx, y: cS.y };
          /** Dünya açısını EKRAN noktasına çevirir (ekranda y ters olduğu için -sin). */
          const cemberde = (aci: number) => ({
            x: cS.x + rPx * Math.cos(aci),
            y: cS.y - rPx * Math.sin(aci),
          });

          if (pergel.yaricap === null) {
            // 1. aşama: açıklık YATAY bir çubuk olarak gösterilir, ama ölçü
            // imlecin iğneye gerçek uzaklığıdır; imleç nerede olursa olsun izlenir.
            return (
              <g className="pointer-events-none">
                <circle cx={cS.x} cy={cS.y} r={rPx} fill="none" stroke="#8b5cf6" strokeWidth={1.2} strokeDasharray="3,4" opacity={0.5} />
                <line x1={cS.x} y1={cS.y} x2={yatayUc.x} y2={yatayUc.y} stroke="#8b5cf6" strokeWidth={2.5} />
                <circle cx={cS.x} cy={cS.y} r={4} fill="#8b5cf6" />
                <circle cx={yatayUc.x} cy={yatayUc.y} r={4} fill="#ffffff" stroke="#8b5cf6" strokeWidth={2} />
                <rect x={(cS.x + yatayUc.x) / 2 - 36} y={cS.y - 26} width={72} height={20} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={(cS.x + yatayUc.x) / 2} y={cS.y - 12} textAnchor="middle" fill="#ffffff" className="font-bold" fontSize={11}>
                  r = {formatTurkishNumber(Number((rPx / viewport.zoom).toFixed(2)))} br
                </text>
              </g>
            );
          }

          // 2. aşama: BAŞLANGIÇ noktası seçiliyor.
          // İmleç çemberin üstünde olmak zorunda değil: hangi YÖNDEYSE kalem
          // çember üzerinde oraya gider. Böylece başlangıç istenen yere bırakılır.
          if (pergel.baslangic === null) {
            const kalem = cemberde(pergel.tarama);
            const derece = Math.round(((pergel.tarama * 180) / Math.PI) % 360);
            return (
              <g className="pointer-events-none">
                <circle cx={cS.x} cy={cS.y} r={rPx} fill="none" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.6} />
                <line x1={cS.x} y1={cS.y} x2={kalem.x} y2={kalem.y} stroke="#8b5cf6" strokeWidth={2} />
                <circle cx={cS.x} cy={cS.y} r={4} fill="#8b5cf6" />
                {/* Kalemin ineceği yer: büyük ve belirgin */}
                <circle cx={kalem.x} cy={kalem.y} r={7} fill="#8b5cf6" fillOpacity={0.25} />
                <circle cx={kalem.x} cy={kalem.y} r={5} fill="#ffffff" stroke="#8b5cf6" strokeWidth={2.5} />
                <rect x={kalem.x - 46} y={kalem.y - 30} width={92} height={20} rx={6} fill="#0f172a" fillOpacity={0.92} />
                <text x={kalem.x} y={kalem.y - 16} textAnchor="middle" fill="#ffffff" className="font-bold" fontSize={11}>
                  başlangıç {derece}°
                </text>
              </g>
            );
          }

          // 3. aşama: yay, seçilen BAŞLANGIÇTAN itibaren taranıyor (iki yöne de)
          const bas = cemberde(pergel.baslangic);
          const bitis = cemberde(pergel.baslangic + pergel.tarama);
          const mutlak = Math.abs(pergel.tarama);
          const buyukYay = mutlak > Math.PI ? 1 : 0;
          // Dünyada CCW = ekranda saat yönü (sweep-flag 0); CW ise tersi (1)
          const yon = pergel.tarama >= 0 ? 0 : 1;
          const d = `M ${bas.x} ${bas.y} A ${rPx} ${rPx} 0 ${buyukYay} ${yon} ${bitis.x} ${bitis.y}`;
          const derece = Math.round((mutlak * 180) / Math.PI);
          return (
            <g className="pointer-events-none">
              <circle cx={cS.x} cy={cS.y} r={rPx} fill="none" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="3,5" opacity={0.3} />
              <path d={d} fill="none" stroke="#8b5cf6" strokeWidth={3} strokeLinecap="round" />
              <line x1={cS.x} y1={cS.y} x2={bas.x} y2={bas.y} stroke="#8b5cf6" strokeWidth={1.2} strokeDasharray="2,3" opacity={0.6} />
              <line x1={cS.x} y1={cS.y} x2={bitis.x} y2={bitis.y} stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="3,3" opacity={0.7} />
              <circle cx={cS.x} cy={cS.y} r={4} fill="#8b5cf6" />
              <circle cx={bas.x} cy={bas.y} r={4} fill="#8b5cf6" stroke="#ffffff" strokeWidth={1.5} />
              <rect x={cS.x - 46} y={cS.y - 30} width={92} height={20} rx={6} fill="#0f172a" fillOpacity={0.9} />
              <text x={cS.x} y={cS.y - 16} textAnchor="middle" fill="#ffffff" className="font-bold" fontSize={11}>
                {derece}° {pergel.tarama < 0 ? '↻' : '↺'} {derece >= 353 ? '(tam tur)' : ''}
              </text>
            </g>
          );
        })()}

        {dragCreateStart && dragCreateCurrent && (() => {
          const s1 = worldToScreen(dragCreateStart, viewport);
          const s2 = worldToScreen(dragCreateCurrent, viewport);
          const dxWorld = Math.abs(dragCreateCurrent.x - dragCreateStart.x);
          const dyWorld = Math.abs(dragCreateCurrent.y - dragCreateStart.y);
          const distWorld = Math.hypot(dxWorld, dyWorld);
          const yuvarla = (v: number) => Number(v.toFixed(1));
          // Oluşturma kodundaki çapa: dünyada en küçük x ve y
          const x1w = Math.min(dragCreateStart.x, dragCreateCurrent.x);
          const y1w = Math.min(dragCreateStart.y, dragCreateCurrent.y);
          /** Dünya dikdörtgenini ekran dikdörtgenine çevirir (y ekseni ters olduğu için üst = y+h). */
          const dunyaKutu = (w: number, h: number) => {
            const solUst = worldToScreen({ x: x1w, y: y1w + h }, viewport);
            const sagAlt = worldToScreen({ x: x1w + w, y: y1w }, viewport);
            return { x: solUst.x, y: solUst.y, w: sagAlt.x - solUst.x, h: sagAlt.y - solUst.y };
          };

          if (activeTool === 'ellipse') {
            const ra = yuvarla(dxWorld / 2);
            const rb = yuvarla(dyWorld / 2);
            const kutu = dunyaKutu(ra * 2, rb * 2);
            const mx = kutu.x + kutu.w / 2;
            const my = kutu.y + kutu.h / 2;
            return (
              <g className="pointer-events-none">
                <ellipse
                  cx={mx}
                  cy={my}
                  rx={Math.abs(kutu.w) / 2}
                  ry={Math.abs(kutu.h) / 2}
                  fill="#0ea5e9"
                  fillOpacity={0.12}
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
                <rect x={mx - 52} y={my - 12} width={104} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={mx} y={my + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  a={formatTurkishNumber(ra)} b={formatTurkishNumber(rb)} br
                </text>
              </g>
            );
          } else if (activeTool === 'square') {
            const kenar = yuvarla(Math.max(dxWorld, dyWorld));
            const kutu = dunyaKutu(kenar, kenar);
            const mx = kutu.x + kutu.w / 2;
            const my = kutu.y + kutu.h / 2;
            return (
              <g className="pointer-events-none">
                <rect
                  x={kutu.x}
                  y={kutu.y}
                  width={kutu.w}
                  height={kutu.h}
                  fill="#f43f5e"
                  fillOpacity={0.15}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
                <rect x={mx - 36} y={my - 12} width={72} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={mx} y={my + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {formatTurkishNumber(kenar)} x {formatTurkishNumber(kenar)} br
                </text>
              </g>
            );
          } else if (activeTool === 'rectangle') {
            const gen = yuvarla(dxWorld);
            const yuk = yuvarla(dyWorld);
            const kutu = dunyaKutu(gen, yuk);
            const mx = kutu.x + kutu.w / 2;
            const my = kutu.y + kutu.h / 2;
            return (
              <g className="pointer-events-none">
                <rect
                  x={kutu.x}
                  y={kutu.y}
                  width={kutu.w}
                  height={kutu.h}
                  fill="#f59e0b"
                  fillOpacity={0.15}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
                <rect x={mx - 40} y={my - 12} width={80} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={mx} y={my + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {formatTurkishNumber(gen)} x {formatTurkishNumber(yuk)} br
                </text>
              </g>
            );
          } else if (activeTool === 'circle') {
            // Oluşan çemberin yarıçapı 0,1'e yuvarlanır; önizleme de aynı değeri çizmeli
            const yariCap = yuvarla(distWorld);
            const rPx = yariCap * viewport.zoom;
            return (
              <g className="pointer-events-none">
                <circle
                  cx={s1.x}
                  cy={s1.y}
                  r={rPx}
                  fill="#8b5cf6"
                  fillOpacity={0.12}
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                />
                <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="2,2" />
                <rect x={s1.x - 30} y={s1.y - 12} width={60} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={s1.x} y={s1.y + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  r = {formatTurkishNumber(yariCap)} br
                </text>
              </g>
            );
          } else if (activeTool === 'segment') {
            return (
              <g className="pointer-events-none">
                <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#0284c7" strokeWidth={2.5} strokeDasharray="4,4" />
                <rect x={(s1.x + s2.x) / 2 - 25} y={(s1.y + s2.y) / 2 - 12} width={50} height={24} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={(s1.x + s2.x) / 2} y={(s1.y + s2.y) / 2 + 4} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {/* Oluşacak parçanın gerçek uzunluğu gösterilir (ızgaraya yapış açıkken yuvarlama yapılmaz) */}
                  {formatTurkishNumber(viewport.snapToGrid ? distWorld : Number(distWorld.toFixed(1)))} br
                </text>
              </g>
            );
          }
          return null;
        })()}

        {/* 13.b TIKLA-TIKLA ARAÇLARIN CANLI ÖNİZLEMESİ
             Kullanıcı ilk nokta(lar)ını koyduktan sonra imleci gezdirirken sonucu kesikli görür;
             böylece son tıklamayı "kör" yapmaz. */}
        {pendingPointIds.length > 0 && (() => {
          const bekleyen = pendingPointIds
            .map((id) => pointsById.get(id))
            .filter(Boolean) as PointObject[];
          if (bekleyen.length !== pendingPointIds.length) return null;
          const imlec = mouseWorldPos;
          const RENK = '#8b5cf6';

          // 1) Üç noktadan geçen çember
          if (activeTool === 'circle_3points' && bekleyen.length === 2) {
            const cc = calculateCircumcircle(bekleyen[0], bekleyen[1], imlec);
            if (!cc) return null;
            // İmleç iki noktanın doğrusuna yaklaşınca yarıçap patlar; devasa bir çember
            // çizmek yerine önizlemeyi gizle (üçüncü nokta oraya konursa zaten hata verilir).
            const enBuyukYaricapPx = Math.max(viewport.width, viewport.height) * 4;
            if (cc.radius * viewport.zoom > enBuyukYaricapPx) return null;
            const cS = worldToScreen(cc.center, viewport);
            return (
              <g className="pointer-events-none">
                <circle
                  cx={cS.x}
                  cy={cS.y}
                  r={cc.radius * viewport.zoom}
                  fill={RENK}
                  fillOpacity={0.08}
                  stroke={RENK}
                  strokeWidth={2}
                  strokeDasharray="5,4"
                />
                <circle cx={cS.x} cy={cS.y} r={3.5} fill={RENK} />
              </g>
            );
          }

          // 2) Yay ve daire dilimi
          if ((activeTool === 'arc' || activeTool === 'sector') && bekleyen.length === 2) {
            const geo = getArcGeometry(bekleyen[0], bekleyen[1], imlec);
            if (!geo) return null;
            const cS = worldToScreen(bekleyen[0], viewport);
            const rPx = geo.radius * viewport.zoom;
            const nokta = (a: number) => ({ x: cS.x + rPx * Math.cos(a), y: cS.y - rPx * Math.sin(a) });
            const p0 = nokta(geo.startAngle);
            const p1 = nokta(geo.endAngle);
            const buyukYay = geo.sweep > Math.PI ? 1 : 0;
            const yay = 'A ' + rPx + ' ' + rPx + ' 0 ' + buyukYay + ' 0 ' + p1.x + ' ' + p1.y;
            const d =
              activeTool === 'sector'
                ? 'M ' + cS.x + ' ' + cS.y + ' L ' + p0.x + ' ' + p0.y + ' ' + yay + ' Z'
                : 'M ' + p0.x + ' ' + p0.y + ' ' + yay;
            const derece = Math.round((geo.sweep * 180) / Math.PI);
            return (
              <g className="pointer-events-none">
                <path
                  d={d}
                  fill={activeTool === 'sector' ? '#10b981' : 'none'}
                  fillOpacity={activeTool === 'sector' ? 0.18 : 0}
                  stroke={activeTool === 'sector' ? '#10b981' : '#0284c7'}
                  strokeWidth={2}
                  strokeDasharray="5,4"
                  strokeLinecap="round"
                />
                <line x1={cS.x} y1={cS.y} x2={p0.x} y2={p0.y} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="3,3" />
                <line x1={cS.x} y1={cS.y} x2={p1.x} y2={p1.y} stroke="#94a3b8" strokeWidth={1.2} strokeDasharray="3,3" />
                {/* Bitiş noktası yayın ÜZERİNE oturacak; hedef konumu şimdiden göster */}
                <circle cx={p1.x} cy={p1.y} r={5} fill="#ffffff" stroke={activeTool === 'sector' ? '#10b981' : '#0284c7'} strokeWidth={2} />
                <rect x={cS.x - 22} y={cS.y - 30} width={44} height={20} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={cS.x} y={cS.y - 16} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {formatTurkishNumber(derece)}°
                </text>
              </g>
            );
          }

          // 3) Açı Oluştur
          if (activeTool === 'angle' && bekleyen.length === 2) {
            const p1w = bekleyen[0];
            const vw = bekleyen[1];
            const vS = worldToScreen(vw, viewport);
            const a1 = Math.atan2(-(p1w.y - vw.y), p1w.x - vw.x);
            const a2 = Math.atan2(-(imlec.y - vw.y), imlec.x - vw.x);
            let fark = a2 - a1;
            while (fark <= -Math.PI) fark += 2 * Math.PI;
            while (fark > Math.PI) fark -= 2 * Math.PI;
            const R = 22;
            const b0 = { x: vS.x + R * Math.cos(a1), y: vS.y + R * Math.sin(a1) };
            const b1 = { x: vS.x + R * Math.cos(a1 + fark), y: vS.y + R * Math.sin(a1 + fark) };
            const derece = Math.round(Math.abs((fark * 180) / Math.PI));
            const iS = worldToScreen(imlec, viewport);
            const yayYolu =
              'M ' + b0.x + ' ' + b0.y + ' A ' + R + ' ' + R + ' 0 0 ' + (fark > 0 ? 1 : 0) + ' ' + b1.x + ' ' + b1.y;
            return (
              <g className="pointer-events-none">
                <line x1={vS.x} y1={vS.y} x2={iS.x} y2={iS.y} stroke={RENK} strokeWidth={1.5} strokeDasharray="4,4" />
                <path d={yayYolu} fill="none" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="4,3" />
                <rect x={vS.x + 26} y={vS.y - 32} width={44} height={20} rx={6} fill="#0f172a" fillOpacity={0.9} />
                <text x={vS.x + 48} y={vS.y - 18} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                  {formatTurkishNumber(derece)}°
                </text>
              </g>
            );
          }

          // 4) Doğru parçası / doğru / ışın / çember — tıkla-tıkla modunda lastik bant
          if (['segment', 'line', 'ray', 'circle'].includes(activeTool) && bekleyen.length === 1) {
            const p1w = bekleyen[0];
            const s1 = worldToScreen(p1w, viewport);
            const s2 = worldToScreen(imlec, viewport);
            const uzunluk = calculateDistance(p1w, imlec);
            if (activeTool === 'circle') {
              return (
                <g className="pointer-events-none">
                  <circle
                    cx={s1.x}
                    cy={s1.y}
                    r={uzunluk * viewport.zoom}
                    fill={RENK}
                    fillOpacity={0.08}
                    stroke={RENK}
                    strokeWidth={2}
                    strokeDasharray="5,4"
                  />
                  <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={RENK} strokeWidth={1.4} strokeDasharray="3,3" />
                  <rect x={s1.x - 32} y={s1.y - 12} width={64} height={22} rx={6} fill="#0f172a" fillOpacity={0.9} />
                  <text x={s1.x} y={s1.y + 3} textAnchor="middle" fill="#ffffff" className="font-bold text-[11px]">
                    r = {formatTurkishNumber(uzunluk)} br
                  </text>
                </g>
              );
            }
            return (
              <g className="pointer-events-none">
                <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={RENK} strokeWidth={2} strokeDasharray="5,4" />
                <rect
                  x={(s1.x + s2.x) / 2 - 30}
                  y={(s1.y + s2.y) / 2 - 24}
                  width={60}
                  height={20}
                  rx={6}
                  fill="#0f172a"
                  fillOpacity={0.9}
                />
                <text
                  x={(s1.x + s2.x) / 2}
                  y={(s1.y + s2.y) / 2 - 10}
                  textAnchor="middle"
                  fill="#ffffff"
                  className="font-bold text-[11px]"
                >
                  {formatTurkishNumber(uzunluk)} br
                </text>
              </g>
            );
          }

          // 5) Çokgen — konan köşeler + imlece uzanan kenar + kapanış ipucu
          if (activeTool === 'polygon' && bekleyen.length >= 1) {
            const ekran = bekleyen.map((pt) => worldToScreen(pt, viewport));
            const iS = worldToScreen(imlec, viewport);
            const yol = ekran.map((pt, i) => (i === 0 ? 'M ' : 'L ') + pt.x + ' ' + pt.y).join(' ');
            const son = ekran[ekran.length - 1];
            return (
              <g className="pointer-events-none">
                {ekran.length >= 2 && <path d={yol} fill="none" stroke="#10b981" strokeWidth={2} strokeDasharray="5,4" />}
                <line x1={son.x} y1={son.y} x2={iS.x} y2={iS.y} stroke="#10b981" strokeWidth={2} strokeDasharray="4,4" />
                {ekran.length >= 2 && (
                  <line
                    x1={iS.x}
                    y1={iS.y}
                    x2={ekran[0].x}
                    y2={ekran[0].y}
                    stroke="#10b981"
                    strokeWidth={1.2}
                    strokeDasharray="2,4"
                    strokeOpacity={0.6}
                  />
                )}
              </g>
            );
          }

          return null;
        })()}

        {/* 13. CANLI ÖLÇÜM ÖNİZLEMESİ (Uzunluk Ölç / Birimle Ölç) */}
        {['measure_distance', 'unit_measure'].includes(activeTool) && pendingPointIds.length === 1 && (() => {
          const p1 = pointsById.get(pendingPointIds[0]);
          if (!p1) return null;
          const s1 = worldToScreen(p1, viewport);
          const s2 = worldToScreen(mouseWorldPos, viewport);
          const dist = calculateDistance(p1, mouseWorldPos);
          const isCm = activeTool === 'measure_distance';
          const midX = (s1.x + s2.x) / 2;
          const midY = (s1.y + s2.y) / 2;

          return (
            <g className="pointer-events-none measurement-live-preview">
              {/* 1. Nokta Vurgu Halkası */}
              <circle
                cx={s1.x}
                cy={s1.y}
                r={16}
                fill="none"
                stroke={isCm ? '#0284c7' : '#059669'}
                strokeWidth={2.5}
                strokeDasharray="3,3"
                className="animate-spin"
              />
              {/* Canlı Ölçüm Çizgisi */}
              <line
                x1={s1.x}
                y1={s1.y}
                x2={s2.x}
                y2={s2.y}
                stroke={isCm ? '#0284c7' : '#059669'}
                strokeWidth={2.5}
                strokeDasharray="5,4"
              />
              {/* Çizgi Uç Çentikleri */}
              <circle cx={s2.x} cy={s2.y} r={4} fill={isCm ? '#0284c7' : '#059669'} stroke="#ffffff" strokeWidth={1.5} />
              {/* Canlı Ölçüm Rozeti */}
              <g transform={`translate(${midX}, ${midY - 14})`}>
                <rect
                  x="-36"
                  y="-12"
                  width="72"
                  height="24"
                  rx="7"
                  fill="#0f172a"
                  fillOpacity="0.95"
                  stroke={isCm ? '#38bdf8' : '#34d399'}
                  strokeWidth="1.2"
                  className="shadow-md"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#ffffff"
                  className="font-bold text-xs font-sans tracking-wide"
                >
                  {formatTurkishNumber(dist)} {isCm ? 'cm' : 'br'}
                </text>
              </g>
            </g>
          );
        })()}

        {/* SEÇİM ALANI / KUTUYLA ÇOKLU SEÇİM MARQUEE KATMANI */}
        {selectionMarquee && (() => {
          const s1 = worldToScreen(selectionMarquee.startWorld, viewport);
          const s2 = worldToScreen(selectionMarquee.currentWorld, viewport);
          const boxX = Math.min(s1.x, s2.x);
          const boxY = Math.min(s1.y, s2.y);
          const boxW = Math.abs(s1.x - s2.x);
          const boxH = Math.abs(s1.y - s2.y);

          return (
            <g className="pointer-events-none marquee-selection-box">
              <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={boxH}
                fill="#2a9d94"
                fillOpacity={0.1}
                stroke="#216a78"
                strokeWidth={1.5}
                strokeDasharray="5,4"
                rx={4}
              />
              {selectedObjectIds.length > 0 && boxW > 40 && boxH > 40 && (
                <g transform={`translate(${boxX + boxW / 2}, ${Math.max(16, boxY - 14)})`}>
                  <rect x="-48" y="-11" width="96" height="22" rx="11" fill="#15302d" fillOpacity="0.92" />
                  <text x="0" y="4" textAnchor="middle" fill="#fbf7ee" className="font-semibold text-[11px] font-sans">
                    {selectedObjectIds.length} nesne seçildi
                  </text>
                </g>
              )}
            </g>
          );
        })()}

        {/* 14. İNTERAKTİF ÖLÇME ARAÇLARI KATMANI (Açıölçer / İletki, Cetvel, Gönye, Alan Modeli) */}
        <MeasurementInstruments
          activeTool={activeTool}
          viewport={viewport}
          onAddPolygonFromAreaModel={(pos, cols, rows) => {
            // Izgara ekranda çapanın ÜSTÜNE doğru çiziliyor (worldToScreen y'yi ters çevirir),
            // bu yüzden çokgen de [pos.y, pos.y + rows] aralığında kurulmalı.
            const x1 = pos.x;
            const y1 = pos.y;
            const x2 = pos.x + cols;
            const y2 = pos.y + rows;
            const [la, lb, lc, ld] = generateNextPointLabels(existingPointLabels(), 4);
            const color = '#10b981';

            const pts = [
              makePoint(la, x1, y1, color),
              makePoint(lb, x2, y1, color),
              makePoint(lc, x2, y2, color),
              makePoint(ld, x1, y2, color),
            ];

            const poly: PolygonObject = {
              id: createId('poly'),
              type: 'polygon',
              label: 'Alan Modeli',
              showLabel: true,
              pointIds: pts.map((p) => p.id),
              color: '#059669',
              fillColor: '#10b981',
              fillOpacity: 0.22,
              visible: true,
              showArea: true,
              showPerimeter: true,
              createdAt: Date.now(),
            };

            addObjects(
              [...pts, poly],
              `Alan modeli oluşturuldu (${formatTurkishNumber(cols)} x ${formatTurkishNumber(rows)} = ${formatTurkishNumber(cols * rows)} br²)`
            );
          }}
        />
        {etiketKilavuzlari && (
          <g data-label-alignment-guides="" pointerEvents="none" aria-hidden="true" stroke="#c026d3" strokeWidth={1} strokeDasharray="4 3">
            {etiketKilavuzlari.xKilavuzu && <line x1={etiketKilavuzlari.xKilavuzu.x} x2={etiketKilavuzlari.xKilavuzu.x} y1={etiketKilavuzlari.xKilavuzu.y1 - 8} y2={etiketKilavuzlari.xKilavuzu.y2 + 8} />}
            {etiketKilavuzlari.yKilavuzu && <line y1={etiketKilavuzlari.yKilavuzu.y} y2={etiketKilavuzlari.yKilavuzu.y} x1={etiketKilavuzlari.yKilavuzu.x1 - 8} x2={etiketKilavuzlari.yKilavuzu.x2 + 8} />}
          </g>
        )}
      </svg>


      {/* YANSITMA VE SİMETRİ EKSENİ SEÇİM ÇUBUĞU */}
      {['reflect', 'symmetry'].includes(activeTool) && (() => {
        const reflectTargetId = reflectTargetPolyId || selectedObjectId;
        const targetPoly = objects.find((o) => o.id === reflectTargetId && o.type === 'polygon') as
          | PolygonObject
          | undefined;
        const reflectWithAxis = (p1: Point2D, p2: Point2D, axisName: string) => {
          if (targetPoly) {
            reflectPolygonAcrossSymmetryLine(targetPoly, p1, p2, axisName);
          } else {
            setHintMessage('Önce bir şekil seçin');
          }
        };

        return (
          <KayanCubuk konum="ust" data-yansitma-cubugu>
            <CubukMetni
              vurgu="lavanta"
              simge={<FlipHorizontal2 className="w-4 h-4" />}
              baslik="Yansıtma"
              aciklama={targetPoly ? `“${targetPoly.label || 'Çokgen'}” için ekseni seçin` : 'Şekli ya da ekseni seçin'}
            />
            <CubukAyirici />
            {/* Hızlı eksen seçimi */}
            <CubukDugmesi onClick={() => reflectWithAxis({ x: 0, y: 0 }, { x: 1, y: 0 }, 'x Ekseni')}>x ekseni</CubukDugmesi>
            <CubukDugmesi onClick={() => reflectWithAxis({ x: 0, y: 0 }, { x: 0, y: 1 }, 'y Ekseni')}>y ekseni</CubukDugmesi>
            <CubukDugmesi onClick={() => reflectWithAxis({ x: 0, y: 0 }, { x: 1, y: 1 }, 'y = x Doğrusu')}>y = x</CubukDugmesi>
            <CubukDugmesi onClick={() => reflectWithAxis({ x: 0, y: 0 }, { x: 1, y: -1 }, 'y = -x Doğrusu')}>y = −x</CubukDugmesi>
          </KayanCubuk>
        );
      })()}

      {/* 4. ARAÇ YÖNERGE ÇUBUĞU: simge rozeti + başlık · açıklama (emoji yok; metinler aracYonergeleri.ts) */}
      {(() => {
        const yonerge = aracYonergesi(activeTool, pendingPointIds.length);
        if (!yonerge) return null;
        return (
          <KayanCubuk konum="alt" data-yonerge-cubugu>
            <CubukMetni simge={<Info className="w-4 h-4" />} baslik={yonerge.baslik} aciklama={yonerge.aciklama} />
            {pendingPointIds.length > 0 && (
              <>
                <CubukAyirici />
                <CubukDugmesi simge={<CarpiSimgesi className="w-4 h-4" />} onClick={cancelPendingAction}>
                  Temizle
                </CubukDugmesi>
              </>
            )}
            {/* Ölçme aracı: sağ tık olmayan dokunmatik tahtada menüye ve Sil'e ulaşma yolu (MeasurementInstruments dinler) */}
            {['ruler', 'measure_angle', 'setsquare', 'area_model'].includes(activeTool) && (
              <>
                <CubukAyirici />
                <CubukDugmesi
                  simge={<Settings className="w-4 h-4" />}
                  aria-haspopup="menu"
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.dispatchEvent(new CustomEvent('geoeba:olcme-araci', { bubbles: true, detail: { islem: 'menu', x: r.left, y: r.top } }));
                  }}
                >
                  Seçenekler
                </CubukDugmesi>
                <CubukDugmesi
                  tur="tehlike"
                  simge={<Trash2 className="w-4 h-4" />}
                  onClick={(e) => e.currentTarget.dispatchEvent(new CustomEvent('geoeba:olcme-araci', { bubbles: true, detail: { islem: 'sil' } }))}
                >
                  Sil
                </CubukDugmesi>
              </>
            )}
          </KayanCubuk>
        );
      })()}

      {/* 5. ÇOKGEN OLUŞTURMA ÇUBUĞU */}
      {activeTool === 'polygon' && pendingPointIds.length > 0 && (
        <KayanCubuk konum="alt" data-cokgen-cubugu>
          <CubukMetni
            simge={<Pentagon className="w-4 h-4" />}
            baslik="Çokgen"
            aciklama={`${pendingPointIds.length} köşe belirlendi`}
          />
          <CubukAyirici />
          {pendingPointIds.length >= 3 && (
            <CubukDugmesi
              tur="birincil"
              simge={<Check className="w-4 h-4" />}
              onClick={() => {
                  const names = pendingPointIds
                    .map((id) => pointsById.get(id)?.label)
                    .filter(Boolean)
                    .join('');
                  const newPolygon: PolygonObject = {
                    id: createId('poly'),
                    type: 'polygon',
                    label: names ? `${names} Çokgeni` : 'Çokgen',
                    showLabel: true,
                    pointIds: [...pendingPointIds],
                    color: '#10b981',
                    fillColor: '#10b981',
                    fillOpacity: 0.18,
                    visible: true,
                    showArea: true,
                    showPerimeter: true,
                    createdAt: Date.now(),
                  };
                  addObject(newPolygon, `${newPolygon.label} oluşturuldu`);
                  cancelPendingAction();
              }}
            >
              Tamamla
            </CubukDugmesi>
          )}
          <CubukDugmesi simge={<CarpiSimgesi className="w-4 h-4" />} onClick={cancelPendingAction}>
            İptal
          </CubukDugmesi>
        </KayanCubuk>
      )}

      {/* 6. SEÇİM ÇUBUĞU (2D): alttaki komut çekmecesinin üstünde; düğmeler dokunmatik hedef (≥ 44 px) */}
      {(selectedObjectIds.length > 0 || seciliCisimler.length > 0) && activeTool === 'select' && (
        <KayanCubuk konum="alt-yuksek" data-secim-kapsulu>
          <CubukMetni
            simge={<MousePointer2 className="w-4 h-4" />}
            baslik={secimBasligi(selectedObjectIds.length, seciliCisimler.length)}
            aciklama="taşımak için sürükleyin"
          />
          <CubukAyirici />
          <CubukDugmesi
            tur="tehlike"
            simge={<Trash2 className="w-4 h-4" />}
            onClick={() => {
              if (selectedObjectIds.length > 0) {
                deleteObjects(
                  selectedObjectIds,
                  selectedObjectIds.length === 1 ? undefined : `${selectedObjectIds.length} seçili nesne silindi`
                );
                setSelectedObjectIds([]);
              }
              // Seçili 3B cisimler de silinir (tek geçmiş adımı; geri al ile geri gelir)
              if (seciliCisimler.length > 0) {
                if (onDeleteSolids) onDeleteSolids(seciliCisimler);
                else seciliCisimler.forEach((sid) => onDeleteSolid?.(sid));
                onSelectSolid?.(null);
                onSelectSolids?.([]);
              }
            }}
          >
            Sil
          </CubukDugmesi>
          <CubukDugmesi
            simge={<CarpiSimgesi className="w-4 h-4" />}
            onClick={() => {
              setSelectedObjectIds([]);
              if (seciliCisimler.length > 0) {
                onSelectSolid?.(null);
                onSelectSolids?.([]);
              }
            }}
          >
            Seçimi kaldır
          </CubukDugmesi>
        </KayanCubuk>
      )}

      {/* Alt bilgi: köşede yalın metin — çubuk/kutu yok (kullanıcı isteği) */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 text-[11px] font-medium leading-none text-muted-foreground select-none pointer-events-none">
        <span>
          İmleç <span className="font-mono text-foreground">{formatCoordinate(mouseWorldPos)}</span>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Ölçek <span className="font-mono text-foreground">%{Math.round((viewport.zoom / DEFAULT_ZOOM) * 100)}</span>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Nesne <span className="font-mono text-foreground">{objects.length}</span>
        </span>
      </div>

      {/* 2. YAKINLAŞTIR / UZAKLAŞTIR — sağ alt köşe. (Yüzen hızlı araç çubuğu kaldırıldı: el, geri al ve
          yinele sol üstteki imlecin yanında; ızgara, yapışma, bölge adları, sığdırma ve temizleme
          Görünüm/Ayarlar menülerinde ve sağ tık menüsünde.) */}
      <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={zoomIn}
          title="Yakınlaştır (+)"
          aria-label="Yakınlaştır"
          className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm backdrop-blur-md transition-colors cursor-pointer bg-card/95 border-border text-foreground hover:bg-accent"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={zoomOut}
          title="Uzaklaştır (-)"
          aria-label="Uzaklaştır"
          className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm backdrop-blur-md transition-colors cursor-pointer bg-card/95 border-border text-foreground hover:bg-accent"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
      </div>

      {/* İPUCU ÇUBUĞU (Örn: "Önce bir şekil seçin"): yalnız bilgi verir, tıklamaları engellemez */}
      {hintMessage && (
        <KayanCubuk konum="ust" etkilesimsiz className="z-40" role="status" aria-live="polite">
          <CubukMetni vurgu="altin" simge={<Lightbulb className="w-4 h-4" />} baslik={hintMessage} />
        </KayanCubuk>
      )}

      {/* Görsel Ekle aracı için gizli dosya seçici */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileSelected}
      />

      {/* 6. YAZI VE MATEMATİK NOTU DÜZENLEME DİYALOĞU */}
      <TextNoteDialog
        isOpen={isTextDialogOpen}
        onClose={() => {
          setIsTextDialogOpen(false);
          setEditingTextObj(null);
        }}
        initialText={editingTextObj?.text || ''}
        initialColor={editingTextObj?.color || '#0f172a'}
        initialFontSize={editingTextObj?.fontSize || 14}
        onSave={(text, color, fontSize) => {
          if (editingTextObj) {
            updateObject(editingTextObj.id, { text, color, fontSize });
          } else if (pendingTextWorldPos) {
            const newTextObj: TextObject = {
              id: createId('txt'),
              type: 'text',
              label: text.slice(0, 20),
              showLabel: true,
              text,
              x: pendingTextWorldPos.x,
              y: pendingTextWorldPos.y,
              fontSize,
              color,
              visible: true,
              createdAt: Date.now(),
            };
            addObject(newTextObj, `"${text}" notu eklendi`);
          }
          setIsTextDialogOpen(false);
          setEditingTextObj(null);
        }}
        onDelete={
          editingTextObj
            ? () => {
                deleteObject(editingTextObj.id);
                setIsTextDialogOpen(false);
                setEditingTextObj(null);
              }
            : undefined
        }
      />

      {/* SAĞ TIK BAĞLAM MENÜSÜ */}
      <ContextMenu
        open={contextTarget !== null}
        x={contextTarget?.x ?? 0}
        y={contextTarget?.y ?? 0}
        title={
          contextTarget?.obj
            ? isArcMeasurement(contextTarget.obj)
              ? arcBadgeTitle(contextTarget.obj, objects) // yay ölçümü: noktaların GÜNCEL adlarıyla
              : contextTarget.obj.label || TYPE_LABELS[contextTarget.obj.type] || 'Nesne'
            : ''
        }
        ariaLabel="Çizim alanı"
        sekmeler={(contextTarget?.adaylar ?? []).map((o) => ({
          id: o.id,
          baslik: isArcMeasurement(o) ? arcBadgeTitle(o, objects) : o.label || TYPE_LABELS[o.type] || 'Nesne',
        }))}
        etkinSekme={contextTarget?.obj?.id}
        onSekmeSec={(id) => {
          const yeni = objects.find((o) => o.id === id);
          if (!yeni || !contextTarget) return;
          // Sekme değişince menü maddeleri o nesneye göre yeniden kurulur; konum ve adaylar korunur.
          let edgeIndex: number | null = null;
          if (yeni.type === 'polygon' && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            edgeIndex = enYakinKenar(yeni as PolygonObject, { x: contextTarget.x - rect.left, y: contextTarget.y - rect.top });
          }
          setSelectedObjectIds(contextMenuSelection(selectedObjectIds, yeni.id));
          setContextTarget({ ...contextTarget, obj: yeni, edgeIndex, izId: undefined });
        }}
        items={contextMenuItems}
        onClose={() => setContextTarget(null)}
      />

      {/* 3B CİSİM SAĞ TIK MENÜSÜ */}
      <ContextMenu
        open={cisimMenusu !== null}
        x={cisimMenusu?.x ?? 0}
        y={cisimMenusu?.y ?? 0}
        title={cisimMenusu?.ad || 'Cisim'}
        ariaLabel="Cisim"
        items={[
          {
            id: 'cismi-sil',
            label: 'Sil',
            danger: true,
            icon: <Trash2 className="w-4 h-4" />,
            onSelect: () => {
              if (!cisimMenusu) return;
              if (onDeleteSolids) onDeleteSolids([cisimMenusu.solidId]);
              else onDeleteSolid?.(cisimMenusu.solidId);
              onSelectSolids?.(selectedSolidIds.filter((id) => id !== cisimMenusu.solidId));
            },
          },
        ]}
        onClose={() => setCisimMenusu(null)}
      />
    </div>
  );
}
