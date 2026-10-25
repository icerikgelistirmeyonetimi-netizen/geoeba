'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useWorkspace, createId, DEFAULT_ZOOM } from '@/state/WorkspaceContext';
import {
  MathObject,
  ViewportTransform,
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
  snapPointToGrid,
  visibleGridStep,
  getVisibleWorldBounds,
  formatTurkishNumber,
  formatCoordinate,
} from '@/math/coordinates';
import { MeasurementInstruments } from './MeasurementInstruments';
import { CanvasLayers } from './CanvasLayers';
import { InsaGosterimleri } from './InsaGosterimleri';
import { INSA_ADIMLARI } from '@/math/insaGosterimi';
import { parcalardanKapaliBolge } from '@/math/kapaliBolge';
import { ToolCursor } from './ToolCursor';
import { TextNoteDialog } from './TextNoteDialog';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { useSliderPlayback } from '@/hooks/useSliderPlayback';
import { Solid3DObject, Point3D } from '@/types/workspace3d';
import { projectSolidFor2D } from '@/math/solidProjection2D';
import { useCisimIzdusumu } from './cisimIzdusumu';
import { cisimIzdusumuYalnizAd, gizliSecimBirakilir, type AyrimDurumu } from './kademeDuzeyleri3B';
import { cisimBilgiSatiri, cisimBilgiEtiketi, izdusumGovdesi, kenarEtiketKutulari, rozetleriYerlestir } from '@/math/cisimEtiketleri2B';

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
  calculateLineEquation,
  calculateCircleArea,
  calculateCircleCircumference,
  calculateSlope,
  angleTrigRatios,
  calculateCircumcircle,
  intersectLines,
  intersectLineCircle,
  intersectCircles,
  intersectLineEllipse,
  closestPointOnPolygonEdge,
  distanceToSegment,
  getArcGeometry,
  reflectPointAcrossLine,
  generateNextPointLabels,
} from '@/math/geometry';
import { compileMathExpression } from '@/math/parser';
import { copyObjects, pasteObjects } from '@/math/objectClipboard';
import { workspaceOwnsKeyboard } from './toolShortcuts';
import { clickSelection, contextMenuSelection } from './contextMenuSelection';
import { contextMenuTargets } from './contextMenuTargets';
import { etiketReferansi, labelAnchorPointIds, shapeAnchorCenter, anchoredLabelPosition } from '@/math/labelAnchors';
import { LABEL_LAYOUT_ZOOM, labelFontScale, labelLayoutViewport, labelZoomScale, projectLabelPoint } from '@/math/labelViewport';
import { etiketYaziBoyu, eksenSayisiHaleKalinligi, type EtiketGrubu } from '@/math/etiketStandardi';
import { sliderBaginiAskiyaAl, sliderBaginiSurdur, sliderCurrentBinding, sliderIsBound, snapSliderValue } from '@/math/sliderBindings';
import { sliderDisplay } from '@/math/sliderDisplay';
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
  distanceLabelLayouts,
  isLengthShown,
  kenarEtiketiYani,
  lengthOptionsAtPoint,
  samePair,
  straightEnds,
  straightLengthOptions,
  type LengthOption,
} from '@/math/partialLengths';
import {
  RotateCcw,
  RotateCw,
  Hand,
  MousePointer,
  Trash2,
  ZoomIn,
  ZoomOut,
  Settings,
  Play,
  Pause,
  Check,
  Link2,
  Link2Off,
  Grid3x3,
  Magnet,
  SquareMousePointer,
  Ruler,
} from 'lucide-react';
import { EksenSimgesi, IzgaraSimgesi } from './GrafikMenuSimgeleri';
import { temaZemini, zeminTonu } from './zeminTonu';
import { eksenSayilariniYerlestir, tuvalEngelleri, type EksenCentigi } from './eksenSayilari';
import { bolgeRozetleri, eksenler, izgaraKonumlari, izometrikIzgara, kareliIzgara, noktaliIzgara } from './katmanlar/izgaraVeEksenler';
import { izKatmani, noktaKatmani } from './katmanlar/noktalarVeIzler';
import { gorselKatmani, kalemKatmani, kalemOnizlemesi, kesirKatmani, notKatmani, type SerbestKatmanBaglami } from './katmanlar/serbestNesneler';
import { canliOlcmeAraciMi, olcmeOnizlemesi, pergelOnizlemesi, secimKutusu, surukleOnizlemesi, tiklaOnizlemesi } from './katmanlar/onizlemeler';
import { pergelIlerlet, type PergelDurumu } from './pergel';
import { surguKapsami } from '@/math/surguKapsami';
import { dogrusalMi, dogrusalUclar, tanimNoktalari, type DogrusalNesne } from './katmanlar/dogrusalNesneler';
import { agirlikMerkezi, distaKalanNormal, yukariNormal } from './katmanlar/ekranGeometrisi';
import { cisimOlcuEtiketleri, cisimUstGorunumu } from './katmanlar/cisimUstGorunumu';
import { oynatmaIstegi, surguOynatmasiDegisir, useIzKaydi } from './izKaydi';
import { serbestDonusDerecesi } from './serbestDondurme';
import { kutuyaDuserMi } from './kutuSecimi';
import type { CisimSuruklemesi, KutuSecimi, NesneSuruklemesi, YansitmaEkseni } from './tuvalEtkilesimi';
import { surguEngelleri } from './surguYerlesimi';
import { fonksiyonParcalari, parcalardanYol } from '@/math/fonksiyonCizimi';
import { fonksiyonEtiketiYazimi } from '@/math/fonksiyonYazimi';
import { fonksiyonEtiketiEngelleri, fonksiyonEtiketYeri, type FonksiyonEtiketYeri } from './fonksiyonEtiketi';
import { useTheme } from '@/state/ThemeContext';
import { NESNE_RENGI, NESNE_SECIM_RENGI, NESNE_SECIM_RENGI_KOYU_TEMA } from '@/utils/nesneRenkleri';
import { KayanCubuk, CubukMetni, CubukAyirici, CubukDugmesi } from './KayanCubuk';
import { aracYonergesi } from './aracYonergeleri';
import { useIlkokulKipi, useKademeDuzeyi } from '@/hooks/useKademeDuzeyi';
import { tamSayiOlcuEtkin, olcumBildirimi, uzunlukOlcBirimi } from './olcuYuvarlama';
import { olcmeAraciMi } from './olcmeAraclari';
import {
  ALAN_MODELI_GORUNUMU, DIKDORTGEN_GORUNUMU, KARE_GORUNUMU, NOKTA_URETEN_ARACLAR, SURUKLEYEREK_CIZILEN_ARACLAR, birOndalik,
  cemberNesnesi, dikdortgenKoseleri, kapaliBolgeCokgeni, koseliCokgen, parcaNesnesi, pergelYayiNesnesi,
  sabitYaricapliCemberNesnesi, surukleCemberYaricapi, surukleParcaUcu, yeniNokta, dondurulmusKonum, elipsDonusAcisi,
  yansimaCokgeni, elipsMerkezi, elipsNesneleri, kalemCizgisi, notNesnesi,
} from './cizimNesneleri';
import {
  ilkokulDonusAdi, ilkokulSimetriDogrusu,
  type SimetriYonu,
} from './ilkokulKipi';
import { SimetriSinamaCubugu, SimetriSinamaKatmani, useSimetriSinama } from './SimetriSinamaArayuzu';
import { aciEtiketiUzakta, aciYayYaricapi, cizgiCercevesi, cizgiEtiketiUzakta, etiketAcisi, kenarEkseninden, kenarEksenine, koseAcilariniAyir, tabanaGoreDik, yayEtiketiYerlesimi, type KoseAcisi, type YayEtiketGeometrisi } from './olcuEtiketi';
import { MatematikEtiketi, type EtiketRengi } from './MatematikEtiketi';
import { EtiketMetniDiyalogu } from './EtiketMetniDiyalogu';
import { etiketHedefiniBul, etiketMetniDuzenlenebilir, etiketMetniGuncelle, type EtiketHedefi } from './etiketMetni';
import { MatematikMetni } from './MatematikMetni';
import {
  type Dugum, type Olcu, aciklama, cemberCevresi, daireAlani, duzMetin, egim, metinDugumleri, metniCozumle, metniSeslendir, olcuDugumleri, olcuMetni, sesli, uzunluk, yaricap, yazimAyari,
} from '@/math/matematikYazimi';
import {
  type Kutu, type KutuOlcusu, type Nokta, type RozetAdayi, aciRozetiYerlesimi, isinaDiz,
  yakinAciRozetiYerlesimi, kutuOlcusu,
} from '@/math/yazimDuzeni';
import {
  type OlcumKarti, TRIG_SATIRLARI, aciGrubu, aciOlcusu, cemberYaricapCizgisiVar, cemberYaricapiGorunur, cokgenKartSatirlari, kenarUzunlugu, noktaBulucu, olcumKartKutulari, segmentUzunlugu,
  trigEtiketAnahtari, trigSatirlari, yayGeometrisi, yayMerkezAcisi, yayOlcumuYazimi, yayOlculeri, yazimlar, elipsKartSatirlari,
} from '@/math/olcuYazimlari';
import { aciAnahtari, esitlikIsaretleri, esitlikYamalariniUygula } from '@/math/esitlikIsaretleri';
import { tamSayiCemberCevresi, tamSayiDaireAlani, toplamiKoruyarakYuvarla } from '@/math/tamSayiHesap';
import { EsitlikIsaretleriKatmani, esitlikMenuMaddeleri, esitUzunluklarMaddesi } from './EsitlikIsaretleri';
import { etiketPayi } from './esitlikCizimi';
import { imlecDegeri, imlecSinifi } from './imlecSiniflari';
import { gorunumKaydirmaBasisiMi, kaydirmaDisiHedefMi, nesneBasisiIslenmeli } from './gorunumKaydirma';
import { KOSE_BOSLUGU, noktaEngelleri, type AdYonu } from './noktaAdi';
import { olcumParcasiMi } from '@/math/nesneAdlari';
import { cizgininUzerindeMi, dogrultuNoktalari, goruntuNoktaAdlari, yayinUzerindeMi } from '@/math/insaYardimcilari';
import { kesisimMesaji, kesismiyorMesaji } from './kesisimMesaji';
import { denklemEtiketiMerkezi, noktaAdiBolgesi, olcekliKutu, yiginKaymasi, yiginYeriSec } from './etiketCakismasi';
import { Box, Eye, EyeOff, FlipHorizontal2, Info, Lightbulb, Pentagon, PencilLine, X as CarpiSimgesi } from 'lucide-react';

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

interface CanvasProps {
  onSwitchTo3D?: () => void;
  onEditFunction?: (id: string) => void;
  solids?: Solid3DObject[];
  selectedSolidId?: string | null;
  selectedSolidIds?: string[];
  onSelectSolid?: (id: string | null) => void;
  onSelectSolids?: (ids: string[]) => void;
  onUpdateSolidPosition?: (id: string, pos: Point3D) => void;
  onDeleteSolid?: (id: string) => void;
  /** Birden çok cismi TEK geçmiş adımıyla siler. Yoksa onDeleteSolid tek tek çağrılır. */
  onDeleteSolids?: (ids: string[]) => void;
  onDragEnd?: () => void;
}

/** Sağ tık menüsünde "İzi Göster" sunulan nesne türleri */
const IZ_TUTAN_TURLER = new Set<string>(['point', 'segment', 'line', 'ray', 'circle', 'polygon', 'arc', 'sector', 'ellipse', 'function']);

/** Tekerleğin bir çentiği yakınlığı bu oranda değiştirir */
const TEKERLEK_ADIMI = 1.12;

/** Fare olayının tuvaldeki ekran konumu ve dünya karşılığı */
function fareKonumu(e: { clientX: number; clientY: number }, svg: SVGSVGElement, viewport: ViewportTransform) {
  const kutu = svg.getBoundingClientRect();
  const ekran = { x: e.clientX - kutu.left, y: e.clientY - kutu.top };
  return { ekran, world: screenToWorld(ekran, viewport) };
}

/** İzdüşüm kapalıyken tuvalin gördüğü sabit boş diziler */
const BOS_CISIMLER: Solid3DObject[] = [];
const BOS_CISIM_KIMLIKLERI: string[] = [];

export function Canvas({
  onSwitchTo3D,
  onEditFunction,
  solids: tumCisimler = BOS_CISIMLER,
  selectedSolidId: seciliCisimHam = null,
  selectedSolidIds: seciliCisimlerHam = BOS_CISIM_KIMLIKLERI,
  onSelectSolid,
  onSelectSolids,
  onUpdateSolidPosition,
  onDeleteSolid,
  onDeleteSolids,
  onDragEnd,
}: CanvasProps) {
  // 3B cisimlerin üstten görünümü (uzman 4. tur [175]; ortaokulda kapalı açılır: cisimIzdusumu.ts). Kapalıyken tuval
  // cisimleri hiç görmez: çizim, isabet, seçim ve Sil tuşu yalnız 2B nesnelere gider. Anahtar sahnede cisim varken görünür.
  const { acik: cisimIzdusumu, degistir: onCisimIzdusumuDegis } = useCisimIzdusumu();
  const solids = cisimIzdusumu ? tumCisimler : BOS_CISIMLER;
  const selectedSolidIds = cisimIzdusumu ? seciliCisimlerHam : BOS_CISIM_KIMLIKLERI;
  const selectedSolidId = cisimIzdusumu ? seciliCisimHam : null;
  const toplamCisim = tumCisimler.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // İlkokul kipi (Kademe: İlkokul; 1-4. sınıf etkinliği): tam sayı ölçü, imleç koordinatı yok, eksen seçeneği yok,
  // yansıtma yalnız şekil seçtirir (alan uzmanları, 2. tur; ilkokulKipi.ts)
  const ilkokul = useIlkokulKipi();
  // Kademe: ortaokulda ölçüler 2 ondalık ve tek birim (br) yazılır (alan uzmanı, 4. tur; olcuYuvarlama.ts)
  const [kademe] = useKademeDuzeyi();

  const {
    objectClipboard, setObjectClipboard,
    objects,
    kaynakNesneler,
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
    undo,
    redo,
    canUndo,
    canRedo,
    cancelPendingAction,
    hintMessage,
    setHintMessage,
    isConfirmClearOpen,
    isRegularPolygonDialogOpen,
    handleSliderChange,
    setSliderSettingsId,
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
  // İzdüşüm kapalıyken 2B'ye geçilince (ya da anahtar kapatılınca) 3B'den kalan cisim seçimi bırakılır: yoksa 2B'de
  // Sil (menü ya da tuş: deleteSelection) görünmeyen cisimleri silerdi (3B'deki [172] kuralının eşi; denetim, 4. tur S3).
  const izdusumDurumuRef = useRef<AyrimDurumu | null>(null);
  const seciliCisimVar = seciliCisimlerHam.length > 0 || !!seciliCisimHam;
  useEffect(() => {
    const simdi: AyrimDurumu = { etkin: studioDimension === '2D', gizli: !cisimIzdusumu };
    if (gizliSecimBirakilir(izdusumDurumuRef.current, simdi, seciliCisimVar)) {
      onSelectSolid?.(null);
      onSelectSolids?.([]);
    }
    izdusumDurumuRef.current = simdi;
  }, [studioDimension, cisimIzdusumu, seciliCisimVar, onSelectSolid, onSelectSolids]);

  // Görsel dosyası seçimi (Görsel Ekle aracı)
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageWorldPosRef = useRef<Point2D | null>(null);

  // 2B'de izdüşümü gösterilen 3B cisme sağ tıklanınca açılan menü
  const [cisimMenusu, setCisimMenusu] = useState<{ solidId: string; ad: string; x: number; y: number } | null>(null);
  // İzdüşümün ölçüleri yalnız o cisim için açıkça istendiğinde görünür.
  const [cisimIzdusumOlcumleri, setCisimIzdusumOlcumleri] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setCisimIzdusumOlcumleri((prev) => {
      const kalan = Object.fromEntries(Object.entries(prev).filter(([id]) => solids?.some((solid) => solid.id === id)));
      return Object.keys(kalan).length === Object.keys(prev).length ? prev : kalan;
    });
    setCisimMenusu((prev) => prev && !solids?.some((solid) => solid.id === prev.solidId) ? null : prev);
  }, [solids]);

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
    /** Sağ tıklanan bir ÖLÇÜ ETİKETİYSE (alan, uzunluk, açı…): "Etiketi düzenle…" maddesi için */
    etiket?: EtiketHedefi;
  } | null>(null);
  // Dokunmatik uzun basma durumu
  const longPressRef = useRef<{ timer: number; startX: number; startY: number; obj: MathObject } | null>(null);

  // Yazı / Metin Notu Düzenleme Durumu
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [editingTextObj, setEditingTextObj] = useState<TextObject | null>(null);
  // Ölçü etiketinin metnini elle yazma (sağ tık > Etiketi düzenle…; etiketMetni.ts)
  const [etiketDuzenleme, setEtiketDuzenleme] = useState<{ objectId: string; kind: string; metin: string; elleYazilmis: boolean } | null>(null);
  const [pendingTextWorldPos, setPendingTextWorldPos] = useState<Point2D | null>(null);
  /** Var olan notu not penceresinde düzenlemeye açar (çift tık, kalem düğmesi, sağ tık menüsü) */
  const notuDuzenle = (not: TextObject) => {
    setEditingTextObj(not);
    setPendingTextWorldPos({ x: not.x, y: not.y });
    setIsTextDialogOpen(true);
  };
  const notPenceresiniKapat = () => {
    setIsTextDialogOpen(false);
    setEditingTextObj(null);
  };
  /**
   * Not penceresi kaydetti: düzenlenen not güncellenir ya da basılan yere yeni not eklenir. Yeni not eklenince araç
   * Seç ve Taşı'ya döner (alan uzmanı, 4. tur).
   */
  const notuKaydet = (metin: string, renk: string, boy: number) => {
    if (editingTextObj) {
      updateObject(editingTextObj.id, { text: metin, color: renk, fontSize: boy });
    } else if (pendingTextWorldPos) {
      addObject(notNesnesi(metin, pendingTextWorldPos, renk, boy), `"${metin}" notu eklendi`);
      if (activeTool === 'text') setActiveTool('select');
    }
    notPenceresiniKapat();
  };
  /**
   * Vazgeç: yeni not penceresi kapanınca da araç Seç ve Taşı'ya döner; yoksa sonraki tuval tıklaması (ör. menü
   * kapatırken) pencereyi yeniden açardı. Metin aracı düğmeyle ya da T kısayoluyla yeniden seçilir (alan uzmanı, 4. tur).
   */
  const notPenceresindenVazgec = () => {
    if (!editingTextObj && activeTool === 'text') setActiveTool('select');
    notPenceresiniKapat();
  };
  const notuSil = (not: TextObject) => {
    deleteObject(not.id);
    notPenceresiniKapat();
  };

  // Sürükleme ve Kaydırma (Pan/Drag) Durumları
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  /**
   * Son basışı el aracı (ya da orta tuş / Alt) yuttu mu?
   * Kaydırma bitince gelen `click` / `dblclick` işaret kutusunu değiştirmesin,
   * düğmeyi çalıştırmasın, etiketi gizlemesin diye tutulur (gorunumKaydirma.ts).
   */
  const kaydirmaYuttuRef = useRef(false);
  // Süren fare etkileşimleri (tuvalEtkilesimi.ts)
  const [draggingObjState, setDraggingObjState] = useState<NesneSuruklemesi | null>(null);
  const [draggingSolidState, setDraggingSolidState] = useState<CisimSuruklemesi | null>(null);
  const [selectionMarquee, setSelectionMarquee] = useState<KutuSecimi | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState<Point2D>({ x: 0, y: 0 });
  /** İlkokul Simetri Keşfet etkinken ölçü etiketine basış aday doğrunun ucunu koyar (SimetriSinamaArayuzu.tiklama) */
  const simetriEtiketGecisiRef = useRef<((world: Point2D) => void) | null>(null);

  // Sürükleyerek Şekil Boyutlandırma ve Oluşturma Durumu
  const [dragCreateStart, setDragCreateStart] = useState<Point2D | null>(null);

  const [dragCreateCurrent, setDragCreateCurrent] = useState<Point2D | null>(null);
  const [rotatingFeedback, setRotatingFeedback] = useState<{ shapeId: string; deg: number } | null>(null);
  const [reflectTargetPolyId, setReflectTargetPolyId] = useState<string | null>(null);
  /** İlkokul yansıtmasında simetri doğrusunun yönü (şeklin yanına dikey ya da yatay konur) */
  const [ilkokulSimetriYonu, setIlkokulSimetriYonu] = useState<SimetriYonu>('dikey');
  const [reflectAxisLine, setReflectAxisLine] = useState<YansitmaEkseni | null>(null);

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

  // Görünümün boyu tuval kabının yerleşim boyuna eşitlenir: açılışta, kap boyu ve pencere boyu değişince
  useEffect(() => {
    if (!containerRef.current) return;
    const olc = () => {
      const kap = containerRef.current;
      if (!kap) return;
      // clientWidth / clientHeight ata öğelerin dönüşümünden etkilenmez (kapta kenarlık ve iç boşluk yok).
      // getBoundingClientRect pencere açılırken (pencere-ac: scale(0.96) → 1) %4'e kadar küçük ölçüyordu; ResizeObserver
      // dönüşüm bitince yeniden tetiklenmediği için eksen sayıları, rozetler ve oklar alttan / sağdan içeride kalıyordu.
      const genislik = kap.clientWidth;
      const yukseklik = kap.clientHeight;
      if (!(genislik > 0 && yukseklik > 0)) return;
      setViewport((prev) => (prev.width === genislik && prev.height === yukseklik ? prev : { ...prev, width: genislik, height: yukseklik }));
    };
    olc();
    const gozcu = new ResizeObserver(olc);
    gozcu.observe(containerRef.current);
    window.addEventListener('resize', olc);
    return () => {
      gozcu.disconnect();
      window.removeEventListener('resize', olc);
    };
  }, [setViewport]);

  /** PERGEL: gerçek pergel gibi çalışır ve ara nokta üretmez (aşamaları: katmanlar/onizlemeler.tsx, PergelDurumu) */
  const [pergel, setPergel] = useState<PergelDurumu | null>(null);

  /** Kesiştir aracında tıklanan İLK şeklin kimliği (ikincisi gelince kesişim üretilir) */
  const kesistirIlkRef = useRef<string | null>(null);
  /** Sürükleyerek çizimde basılan HAM dünya konumu (kısa basış tıklamaya dönüşünce kullanılır) */
  const dragCreateHamRef = useRef<Point2D | null>(null);

  /** Araç değişince yarım kalan çok adımlı etkileşimler bırakılır: Pergel'in adımları ve Kesiştir'in ilk şekli. */
  const [oncekiArac, setOncekiArac] = useState(activeTool);
  if (oncekiArac !== activeTool) {
    setOncekiArac(activeTool);
    kesistirIlkRef.current = null;
    setPergel(null);
  }

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
      const merkezNokta = yeniNokta(ad, merkez.x, merkez.y, NESNE_RENGI.mor);
      const cember = sabitYaricapliCemberNesnesi(merkezNokta.id, `${ad} Merkezli Çember`, yaricap);
      addObjects([merkezNokta, cember], `Pergelle çember çizildi (r = ${formatTurkishNumber(yaricap)} br)`);
      setHintMessage(`Çember tamamlandı: r = ${formatTurkishNumber(yaricap)} br`);
      return;
    }

    const [adM, adB, adS] = generateNextPointLabels(labels, 3);
    const nokta = (ad: string, x: number, y: number): PointObject => yeniNokta(ad, Number(x.toFixed(4)), Number(y.toFixed(4)), NESNE_RENGI.mor);
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
    const yay = pergelYayiNesnesi(m.id, bas.id, bit.id, `${adB}${adS} Yayı`);
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
      setHintMessage(kesismiyorMesaji(o1, o2));
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
    // Bildirim okunur adlar ve koordinatla yazılır (alan uzmanı, 4. tur): "ABC açıortayı ile C noktasından AB
    // doğrusuna dik doğrunun kesişim noktası F(-3; -0,3)." Teğet yalnız eğri bir şekil tek noktada dokunduğunda
    // söylenir (kesisimMesaji.ts). Görünür alanın dışındaki nokta da bildirilir: harfi tuvalde aranıp bulunamıyordu.
    const disarida = yeniler
      .filter((p) => {
        const e = worldToScreen(p, viewport);
        return e.x < 0 || e.y < 0 || e.x > viewport.width || e.y > viewport.height;
      })
      .map((p) => p.label);
    // Parça / ışın / yay uzantısıyla kesiştirilir (davranış aynı); nokta şeklin dışındaysa bildirim "uzantısı" der
    const uzerinde = (o: MathObject, p: Point2D): boolean => {
      const b = kesisimBicimi(o);
      if (b?.tur === 'dogru') {
        return cizgininUzerindeMi(o.type === 'segment' ? 'parca' : o.type === 'ray' ? 'isin' : 'dogru', b.a, b.b, p, 1e-4);
      }
      if (o.type === 'arc' || o.type === 'sector') {
        const m = pointsById.get(o.centerPointId);
        const g = yayGeometrisi(o, noktaBul);
        return !m || !g || yayinUzerindeMi(m, g.startAngle, g.sweep, p, 1e-4);
      }
      return true;
    };
    const uzantilar: [boolean, boolean] = [yeniler.some((p) => !uzerinde(o1, p)), yeniler.some((p) => !uzerinde(o2, p))];
    setHintMessage(kesisimMesaji(o1, o2, yeniler.map((p) => ({ ad: p.label, x: p.x, y: p.y })), disarida, uzantilar));
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

      // Delete / Backspace: seçili nesneler ve seçili cisimler silinir
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sayi = k.selectedObjectIds.length;
        if (sayi > 0) {
          e.preventDefault();
          k.deleteObjects(k.selectedObjectIds, sayi === 1 ? undefined : `${sayi} seçili nesne silindi`);
          k.setSelectedObjectIds([]);
        }
        const cisimler = k.selectedSolidIds.length > 0 ? k.selectedSolidIds : k.selectedSolidId ? [k.selectedSolidId] : [];
        if (cisimler.length > 0) {
          e.preventDefault();
          // Birden çok cisim tek geçmiş adımıyla silinir (tek Ctrl+Z hepsini geri getirir)
          if (k.onDeleteSolids) k.onDeleteSolids(cisimler);
          else cisimler.forEach((id) => k.onDeleteSolid?.(id));
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
  // Tam sayı yazımı kademeye göre: ilkokul hep, ortaokul kendi ayarıyla (varsayılan 2 ondalık), diğerleri tamSayiOlcu
  const tamSayiOlcu = tamSayiOlcuEtkin(styleSettings, kademe);
  const esitlik = useMemo(
    // İlkokulda "4 br" ile "yaklaşık 4 br" eş işaretlenmez (4. tur [176] denetimi; esitlikIsaretleri.yaklasikAyri)
    () => esitlikIsaretleri(objects, { otomatik: viewport.showEqualityMarks !== false, tamSayi: tamSayiOlcu, yaklasikAyri: ilkokul }),
    [objects, viewport.showEqualityMarks, tamSayiOlcu, ilkokul]
  );
  // Çentiğin altında kalmaması gereken noktalar. DİZİ: StrictMode render'ı aynı props ile iki kez çağırır,
  // tek kullanımlık bir yineleyici (pointsById.values()) ikinci çağrıda boş gelirdi.
  const esitlikNoktalari = useMemo(() => [...pointsById.values()], [pointsById]);
  // İki nokta arası uzunluk ('distance') etiketleri: kesikli ölçü çizgisi gerekli mi, hangi katta (partialLengths.ts)
  const mesafeYerlesimleri = useMemo(() => distanceLabelLayouts(objects), [objects]);
  // Uzunluğu gösterilen çokgen kenarı üzerindeki ölçümler: kenar etiketinin durduğu yan (dünya normali)
  const mesafeKenarYanlari = useMemo(() => {
    const harita = new Map<string, { x: number; y: number }>();
    for (const o of objects) {
      if (o.type !== 'measurement' || o.kind !== 'distance') continue;
      const yan = kenarEtiketiYani(objects, o.id);
      if (yan) harita.set(o.id, yan);
    }
    return harita;
  }, [objects]);

  // Nokta adlarının kaçınacağı çizgiler (noktadan çıkan/geçen parça, doğru, ışın, çokgen kenarı, çember).
  // Yerleşim kamera hareketinden bağımsızdır; yalnız sonuç ekrana projekte edilir.
  const etiketGorunumu = useMemo(() => labelLayoutViewport(viewport), []); // yalnız sabit geometri ölçeği
  const etiketOlcegi = labelZoomScale(viewport);
  // Yazı alt sınırı (Stil > "Uzaklaşınca yazılar en az"): uzaklaşınca yazılar şekille küçülür ama bu orandan
  // aşağı inmez (kullanıcı, 9 Ekim 2026: "zoom out yapıldığında nokta isimleri okunamıyor").
  const yaziOlcegi = labelFontScale(viewport, styleSettings.yaziAltSiniri);
  // Yazı ölçeğinin yerleşim ölçeğine oranı: alt sınır devredeyken 1'i aşar (açı rozeti yerleşimi bunu kullanır).
  const yaziOrani = yaziOlcegi / (etiketOlcegi || 1);
  // Yerleşim uzayındaki kutu boyları (nokta adı kutusu, ölçü kartı yığını, çakışma kutuları, rozet yığınları)
  // bununla çarpılır ki ekrandaki büyük yazıyla örtüşsün. Yakınlaşınca (yazı tavanı 1,05 < yerleşim ölçeği) 1'de
  // kalır: yerleşim eskisi gibi yazıdan bağımsızdır.
  const yerlesimOrani = Math.max(1, yaziOrani);
  // Ekran uzayında "kutu yarı boyu + sabit pay" toplamı bununla çarpılır (= max(yaziOlcegi, etiketOlcegi)); yoksa
  // alt sınırla büyüyen kutu ölçtüğü kenara/noktaya biner ve paylar yazıya göre sıfıra iner (mesafe oranlaması).
  const kutuOlcegi = etiketOlcegi * yerlesimOrani;
  /** Yerleşim uzayına (isinaDiz, çakışma, yığın) giren kutu: boyları yerlesimOrani ile; çizime ölçeksiz kutu gider */
  const yerlesimKutusu = (k: KutuOlcusu): KutuOlcusu => ({ ...k, genislik: k.genislik * yerlesimOrani, yukseklik: k.yukseklik * yerlesimOrani });
  // Yerleşim sabit ölçekte kalır; yalnız yazı ve kutusu kendi çapası çevresinde küçülür.
  const etiketOlcekDonusumu = (x: number, y: number) =>
    `translate(${x} ${y}) scale(${yaziOlcegi}) translate(${-x} ${-y})`;
  /**
   * Her nokta adının son yönü (sağ üst, sol alt…). Bir sonraki çizimde "önceki yer hâlâ rahatsa orada
   * kal" kuralı için okunur; önbellektir, çizimi tetiklemez. Silinen noktaların kaydı zararsızdır.
   */
  const adYonuRef = useRef(new Map<string, AdYonu>());
  // Görünen eksenler de adın kaçındığı çizgilerdir (eksenin hemen altındaki kesişim noktasının adı eksene binmesin)
  const eksenGorunur = viewport.showAxes !== false;
  const noktaEngelHaritasi = useMemo(() => {
    const koken = worldToScreen({ x: 0, y: 0 }, etiketGorunumu);
    return noktaEngelleri(objects, pointsById, (p) => worldToScreen(p, etiketGorunumu),
      eksenGorunur ? { yatay: koken.y, dikey: koken.x } : undefined);
  }, [objects, pointsById, etiketGorunumu, eksenGorunur]);

  // Aktif Kaydırıcı Değişkenleri Haritası (Fonksiyon grafikleri için)
  // Sahnedeki kaydırıcılar (oynatma ve tuval üstü çizim için)
  const sliders = useMemo(
    () => objects.filter((o) => o.type === 'slider' && o.visible) as SliderObject[],
    [objects]
  );

  // Şeklin üzerinde canlandırılan görünür noktalar (oynatma onları şekil boyunca yürütür)
  const animatingPoints = useMemo(
    () => objects.filter((o): o is PointObject => o.type === 'point' && !!o.animating && o.visible && !!o.onObjectId),
    [objects]
  );

  const { isPlaying: sliderPlaying, toggle: toggleSliderPlayback, canliKonumlar: sliderCanliKonumlari } = useSliderPlayback({
    sliders,
    animatingPoints,
    allObjects: objects,
    onValues: setSliderValues,
  });

  // İzi Göster: izi açık noktaların hareket izleri (izKaydi.ts)
  const { izler: traces, izleriTemizle: clearTraces, iziSil: clearTrace } = useIzKaydi(objects);

  // Yazılı komut ve düğmelerden gelen oynatma istekleri: hedef nokta ise canlandırması, hedef sürgü ise ya da hedef
  // yoksa sürgü oynatması değişir; 'geoeba:clear-traces' bütün izleri siler
  useEffect(() => {
    const oynat = (olay: Event) => {
      const { kip, hedef } = oynatmaIstegi((olay as CustomEvent<unknown>).detail);
      const nesne = hedef ? latestObjectsRef.current.find((o) => o.id === hedef || o.label === hedef) : undefined;
      if (nesne?.type === 'point') {
        updateObject(nesne.id, { animating: kip === 'play' ? true : kip === 'stop' ? false : !nesne.animating } as Partial<MathObject>, true);
      } else if ((!hedef || nesne?.type === 'slider') && surguOynatmasiDegisir(kip, sliderPlaying)) {
        toggleSliderPlayback();
      }
    };
    window.addEventListener('geoeba:slider-playback', oynat);
    window.addEventListener('geoeba:animation-playback', oynat);
    window.addEventListener('geoeba:clear-traces', clearTraces);
    return () => {
      window.removeEventListener('geoeba:slider-playback', oynat);
      window.removeEventListener('geoeba:animation-playback', oynat);
      window.removeEventListener('geoeba:clear-traces', clearTraces);
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
    /** Doğrusal ölçü etiketinde kenarın EKRAN uçları ve etiketin DOĞAL merkezi: kayıklık kenar eksenine göre de yazılır */
    cizgi?: { a: Point2D; b: Point2D; merkez: Point2D };
  } | null>(null);
  const [etiketKilavuzlari, setEtiketKilavuzlari] = useState<ReturnType<typeof etiketHizalama> | null>(null);
  // Etikete son basışın anı: dokunmatik uzun basış (sağ tık menüsü) rozetin silme tıklaması sayılmasın
  const etiketBasisRef = useRef<{ zaman: number; fare: boolean } | null>(null);
  // Nesne menüsünün en son AÇILDIĞI an (uzun basış zamanlayıcısı ya da tarayıcının contextmenu olayı):
  // dokunmatik basış sırasında menü açıldıysa parmak kalkınca gelen tıklama rozeti silmez
  const menuAcilisZamaniRef = useRef<number | null>(null);

  // Tuval üstü kaydırıcı tutamağının sürüklenmesi
  const sliderDragRef = useRef<{ id: string } | null>(null);
  // Dişli: kısa basış ayarları açar; sürükleme çubuğun konumunu değiştirir.
  const sliderPositionDragRef = useRef<{
    id: string;
    pointerId: number;
    startClient: Point2D;
    startPosition: Point2D;
    moved: boolean;
    /** Kısa basışta (sürüklenmeden bırakınca): ayarları aç (dişli, bağsız sürgü) ya da yalnız seç (bağlı sürgü) */
    kisaBasis?: 'ayarlar' | 'sec';
  } | null>(null);
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
      const deger = snapSliderValue(s.min + t * (s.max - s.min), s.min, s.max, s.step);
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

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = sliderPositionDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const slider = latestObjectsRef.current.find(o => o.id === drag.id);
      if (slider?.type !== 'slider' || slider.locked) return;
      const dx = e.clientX - drag.startClient.x, dy = e.clientY - drag.startClient.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      const zoom = viewportRef.current.zoom || 1;
      updateObject(drag.id, { x: drag.startPosition.x + dx / zoom, y: drag.startPosition.y - dy / zoom } as Partial<MathObject>, false);
    };
    const onUp = (e: PointerEvent) => {
      const drag = sliderPositionDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      if (e.type === 'pointerup') flushSync(() => onMove(e));
      sliderPositionDragRef.current = null;
      const slider = latestObjectsRef.current.find(o => o.id === drag.id);
      if (slider?.type !== 'slider') return;
      if (drag.moved) recordHistory(`${slider.variableName} kaydırıcısı taşındı`);
      else if (e.type === 'pointerup' && drag.kisaBasis === 'sec') setSelectedObjectId(drag.id);
      else if (e.type === 'pointerup') setSliderSettingsId(drag.id);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [updateObject, recordHistory, setSliderSettingsId, setSelectedObjectId]);

  /**
   * Dünya kayıklığına, doğrusal ölçüde kenarın KENDİ EKSENİNE göre karşılığını da ekler (boyunca + dik).
   * Kenar kısalıp uzadıkça ya da döndükçe yazı bu değerlerle aynı oranda ve aynı eksende kalır.
   * Varsayılan yerin dik uzaklığı da (eksenDikTaban) saklanır: varsayılan sonradan değişirse etiket onunla kayar.
   */
  const kenarEkseniyle = (off: Point2D, cizgi: { a: Point2D; b: Point2D; merkez: Point2D } | undefined, z: number) => {
    const cerceve = cizgi ? cizgiCercevesi(cizgi.a, cizgi.b) : null;
    if (!cerceve || !cizgi) return { x: off.x, y: off.y };
    const yer = { x: cizgi.merkez.x + off.x * z, y: cizgi.merkez.y - off.y * z };
    const eksen = kenarEksenine(yer, cerceve, z);
    const taban = kenarEksenine(cizgi.merkez, cerceve, z).dik;
    return { x: off.x, y: off.y, eksenBoyunca: eksen.boyunca, eksenDik: eksen.dik, eksenDikTaban: taban };
  };

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
        kenarEkseniyle({ x: d.startOffset.x + dx / z, y: d.startOffset.y - dy / z }, d.cizgi, z),
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
          const off = kenarEkseniyle({ x: d.lastCenter.x - natural.x, y: d.lastCenter.y - natural.y }, d.cizgi, z);
          const width = Number(d.element.dataset.labelWidth) / z;
          // Yazı bırakıldığı yerde kalır: tek bir köşe/kenar oynayınca kıpırdamaz, nesnenin
          // tamamı taşınırsa aynı vektörle birlikte gider (base + ortak öteleme).
          const anchor = d.element.dataset.labelDetached === 'true' ? {
            pointIds: d.pointIds,
            offset: { x: d.lastCenter.x - center.x + (d.alignment === 'left' ? -width / 2 : d.alignment === 'right' ? width / 2 : 0), y: d.lastCenter.y - center.y },
            alignment: d.alignment,
            base: { x: d.lastCenter.x, y: d.lastCenter.y },
            ref: etiketReferansi(latestObjectsRef.current, d.pointIds),
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
   * Kural 3B sahneyle ortaktır (etiketStandardi.etiketYaziBoyu; Canvas3D etiketleri aynı işlevi çağırır).
   */
  const fs = useCallback(
    (base: number, kind: EtiketGrubu = 'measure') => etiketYaziBoyu(base, kind, styleSettings),
    [styleSettings]
  );

  /** Kesir ve canlı ölçü yazıları da kalıcı ölçülerle aynı tema, boyut ve kutu ayarını kullanır. */
  const metinOlcuEtiketi = (metin: string, x: number, y: number, cerceve?: string) => (
    <g data-canvas-label="" className="pointer-events-none select-none">
      <MatematikEtiketi
        satirlar={[metinDugumleri(metin)]}
        x={x}
        y={y}
        px={fs(11, 'measure')}
        olcek={yaziOlcegi}
        renk="on"
        kutu={cerceve ? { sinif: 'fill-background/95', cizgi: cerceve, cizgiKalinligi: 1.2, rx: 7 } : { sinif: 'fill-background/95 stroke-border', rx: 7 }}
        kutuGizli={!styleSettings.showLabelBoxes}
        sesli={metniSeslendir(metin)}
        ipucu={metin}
      />
    </g>
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
    (objectId: string, kind: MeasurementKind | string, merkez?: Point2D, genislik = 0, cizgi?: { a: Point2D; b: Point2D }) => {
      const obj = objects.find((o) => o.id === objectId);
      const off = obj?.labelOffsets?.[kind];
      // Kayıklık ve çapa DÜNYA birimindedir: uzaklaşınca etiket şekille birlikte yerinde kalır. (Yazı alt sınırı
      // devredeyken kayıklığı yazıyla ölçeklemek denendi; taşınan etiketler şekilden uzaklaşıp köşelere kaçtı —
      // kullanıcı, 9 Ekim 2026: "uzaklaştıkça konumları aynı kalmalıydı". Yalnız OTOMATİK yerleşim payları ölçeklenir.)
      const z = viewport.zoom || 1;
      const anchor = obj?.labelAnchors?.[kind];
      const position = anchor && merkez ? anchoredLabelPosition(anchor, objects, genislik * yaziOlcegi / z) : null;
      if (position && merkez) {
        const screen = worldToScreen(position, viewport);
        return { x: screen.x - merkez.x, y: screen.y - merkez.y };
      }
      // Kenarın yanındaki ölçü: kayıklık KENAR EKSENİNE göre (boyunca oran + dik uzaklık) uygulanır;
      // kenar kısalıp uzadıkça ya da döndükçe yazı aynı oranda, aynı eksende kalır.
      const cerceve = cizgi && merkez && off && off.eksenBoyunca !== undefined && off.eksenDik !== undefined ? cizgiCercevesi(cizgi.a, cizgi.b) : null;
      if (cerceve && off && merkez) {
        // Varsayılan yer o günden beri çizgiye yaklaşıp uzaklaştıysa (uzunluk ölçümü kesikli kattan yalın banda geçti,
        // eşitlik çentiği geldi) etiket AYNI YANDA durdukça bu farkla kayar: elle verilen kayıklık korunur ve yerleşim
        // değişimi etiketi "uzak" yapıp kalıcı çapaya çevirmez (olcuEtiketi.tabanaGoreDik).
        const dik = tabanaGoreDik(off.eksenDik!, off.eksenDikTaban, kenarEksenine(merkez, cerceve, z).dik);
        const yer = kenarEkseninden({ boyunca: off.eksenBoyunca!, dik }, cerceve, z);
        return { x: yer.x - merkez.x, y: yer.y - merkez.y };
      }
      return { x: off ? off.x * z : 0, y: off ? -off.y * z : 0 };
    },
    [objects, viewport, yaziOlcegi]
  );
  const etiketAyrikMi = useCallback((id: string, kind: string) => {
    const dragging = labelDragRef.current;
    return !(dragging?.objectId === id && dragging.kind === kind) && !!objects.find(o => o.id === id)?.labelAnchors?.[kind];
  }, [objects]);
  const serbestEtiketYeri = useCallback((id: string, kind: string, merkez: Point2D, olcu: KutuOlcusu, metin?: string) => {
    const kayma = etiketKaymasi(id, kind, merkez, olcu.genislik);
    return { merkez, olcu, uzak: etiketAyrikMi(id, kind) || Math.hypot(kayma.x, kayma.y) > 18 * etiketOlcegi, metin };
  }, [etiketKaymasi, etiketAyrikMi, etiketOlcegi]);

  // Eski kayıtları yalnız belge değişiminde ele al. Kamera hareketi belgeye çapa yazamaz.
  useEffect(() => {
    if (labelDragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    for (const el of Array.from(svgRef.current.querySelectorAll<SVGGElement>('[data-label-detached="true"]'))) {
      const id = el.dataset.labelObject!, kind = el.dataset.labelKind!;
      const obj = objects.find(o => o.id === id);
      const off = obj?.labelOffsets?.[kind];
      // Kenar ekseniyle saklanmış kayıklık eski kayıt değildir: uzaklığı her karede geometriden yeniden ölçülür.
      // Bırakılırken uzaksa sürükleme zaten çapa yazar; sonradan (yerleşim değişince) uzak görünen etiket kalıcı
      // çapaya çevrilirse geri yaklaşınca bile kopuk kalıyor, ölçü çizgisi bir daha gelmiyordu.
      if (!off || (!off.x && !off.y) || off.eksenBoyunca !== undefined || obj?.labelAnchors?.[kind]) continue;
      const pointIds = labelAnchorPointIds(objects, id);
      const center = shapeAnchorCenter(objects, pointIds);
      const box = el.querySelector('[data-yazim-kutu]')?.getBoundingClientRect();
      if (!center || !box) continue;
      const position = screenToWorld({ x: box.left - rect.left, y: (box.top + box.bottom) / 2 - rect.top }, viewportRef.current);
      setLabelOffset(id, kind, off, false, {
        pointIds,
        offset: { x: position.x - center.x, y: position.y - center.y },
        alignment: 'left',
        base: position,
        ref: etiketReferansi(objects, pointIds),
      });
    }
    // Eski kenar etiketi kayıklıkları (yalnız x/y) kenar boyunca SABİT kalıyordu: kenar kısalınca yazı
    // uca, hatta noktanın üstüne kayıyordu. Bir kez bugünkü kenar eksenine çevrilir (boyunca + dik).
    for (const el of Array.from(svgRef.current.querySelectorAll<SVGGElement>('[data-label-detached="false"][data-cizgi]'))) {
      const id = el.dataset.labelObject!, kind = el.dataset.labelKind!;
      const obj = objects.find(o => o.id === id);
      const off = obj?.labelOffsets?.[kind];
      if (!off || off.eksenBoyunca !== undefined || (!off.x && !off.y) || obj?.labelAnchors?.[kind]) continue;
      const [ax, ay, bx, by] = (el.dataset.cizgi ?? '').split(',').map(Number);
      if (![ax, ay, bx, by].every(Number.isFinite)) continue;
      const cerceve = cizgiCercevesi({ x: ax, y: ay }, { x: bx, y: by });
      if (!cerceve) continue;
      const z = viewportRef.current.zoom || 1;
      const mx = Number(el.dataset.labelX), my = Number(el.dataset.labelY);
      if (!Number.isFinite(mx) || !Number.isFinite(my)) continue;
      const eksen = kenarEksenine({ x: mx + off.x * z, y: my - off.y * z }, cerceve, z);
      const taban = kenarEksenine({ x: mx, y: my }, cerceve, z).dik;
      setLabelOffset(id, kind, { x: off.x, y: off.y, eksenBoyunca: eksen.boyunca, eksenDik: eksen.dik, eksenDikTaban: taban }, false);
    }
    // Eski çapalar (bırakıldığı yer saklanmadan, yalnız şekil merkezine göre) tek bir köşe oynayınca
    // merkez kaydığı için sürükleniyordu. Bir kez bugünkü kurala çevrilir: bırakıldığı yerde kalsın.
    for (const obj of objects) {
      for (const [kind, anchor] of Object.entries(obj.labelAnchors ?? {})) {
        if (anchor.base && anchor.ref?.length) continue;
        const center = shapeAnchorCenter(objects, anchor.pointIds);
        if (!center) continue;
        setLabelOffset(obj.id, kind, obj.labelOffsets?.[kind] ?? { x: 0, y: 0 }, false, {
          ...anchor,
          base: { x: center.x + anchor.offset.x, y: center.y + anchor.offset.y },
          ref: etiketReferansi(objects, anchor.pointIds),
        });
      }
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
      yer?: { merkez: Point2D; olcu: KutuOlcusu; uzak: boolean; cizgi?: { a: Point2D; b: Point2D }; metin?: string },
      /**
       * Bir ölçümün AYRI etiketleri (trig: açı, sin, cos, tan) kendi anahtarıyla taşınır ama tıklama
       * kuralı ölçümün türüyle (eylemTuru) belirlenir; `gizle` yalnızca bu etiketi gizler.
       */
      secenek?: { eylemTuru?: string; gizle?: () => void },
    ) => {
      const obj = objects.find((o) => o.id === objectId);
      const eylemTuru = secenek?.eylemTuru ?? kind;
      // Eşitlik çentiği taşıyan açıda rozet tıklaması açıyı SİLMEZ, yalnız yazıyı gizler (kullanıcı
      // isteği): çentik açıyı okunur bir eşlik bilgisi olarak ayakta tuttuğu için yay sahipsiz kalmaz.
      const esitlikIsaretli = kind === 'angle' && esitlik.isaretliAnahtarlar.has(aciAnahtari(objectId));
      const { x: dx, y: dy } = etiketKaymasi(objectId, kind, yer?.merkez, yer?.olcu.genislik, yer?.cizgi);
      // Etiketler artık şeklin GÖVDESİNİN DIŞINDA duruyor (çokgende alt kenarın altı,
      // çemberde çemberin altı, yay/dilimde ve açıda yayın dışı). Bu yüzden
      // her zaman tıklanabilir olabilirler: şekli sürüklerken etiketi yakalama riski yok.
      // Önceki "yalnızca seçiliyken tıklanabilir" kuralı, hiç seçilemeyen açı rozetinin
      // asla gizlenememesine yol açıyordu.
      // Sil aracında açı rozeti ve bağımsız ölçüm etiketi bir SİLME düğmesidir: sürüklenmez.
      const silAraciylaSilinir = etiketSilAraciylaSilinirMi(obj, eylemTuru, activeTool, gizlenebilir, esitlikIsaretli);
      return {
        'data-label-object': objectId,
        'data-label-kind': kind,
        'data-label-alignment': obj?.labelAnchors?.[kind]?.alignment,
        'data-label-x': yer?.merkez.x,
        'data-label-y': yer?.merkez.y,
        'data-label-width': yer ? yer.olcu.genislik * yaziOlcegi : undefined,
        'data-label-detached': yer?.uzak,
        'data-cizgi': yer?.cizgi ? `${yer.cizgi.a.x},${yer.cizgi.a.y},${yer.cizgi.b.x},${yer.cizgi.b.y}` : undefined,
        // Ekrandaki düz metin: sağ tık > "Etiketi düzenle…" diyaloğunun başlangıç değeri (etiketMetni.ts)
        'data-label-text': yer?.metin,
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
          if (simetriEtiketGecisiRef.current && svgRef.current) {
            const r = svgRef.current.getBoundingClientRect();
            simetriEtiketGecisiRef.current(screenToWorld({ x: e.clientX - r.left, y: e.clientY - r.top }, viewportRef.current));
            return;
          }
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
          const sourceElement = e.currentTarget as SVGGElement;
          // Mesafe ölçüsünün yardımcı çizgisi alt katmanda kalır. Çizgiden başlayan
          // sürükleme de üstteki gerçek etiketin kutusunu ve çapa verisini kullanır.
          const element = kind !== 'pointLabel' && !sourceElement.querySelector('[data-yazim-kutu]')
            ? Array.from(svgRef.current?.querySelectorAll<SVGGElement>('[data-label-object]') ?? [])
              .find(el => el.dataset.labelObject === objectId && el.dataset.labelKind === kind) ?? sourceElement
            : sourceElement;
          const box = element.querySelector('[data-yazim-kutu]')?.getBoundingClientRect() ?? element.getBoundingClientRect();
          const startCenter = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
          labelDragRef.current = {
            objectId,
            kind,
            startClient: { x: e.clientX, y: e.clientY },
            // Başlangıç: ekranda GÖRÜNEN kayıklık. Kenar ekseniyle saklanmışsa x/y eski geometriye
            // göredir (kenar o zamandan beri kısalmış olabilir); oradan başlamak etiketi sıçratırdı.
            startOffset: { x: dx / (viewportRef.current.zoom || 1), y: -dy / (viewportRef.current.zoom || 1) },
            element,
            startCenter,
            pointIds: yer ? obj?.labelAnchors?.[kind]?.pointIds ?? labelAnchorPointIds(objects, objectId) : [],
            alignment: obj?.labelAnchors?.[kind]?.alignment ?? 'left',
            lastCenter: { x: 0, y: 0 },
            moved: false,
            cizgi: yer?.cizgi ? { ...yer.cizgi, merkez: yer.merkez } : undefined,
          };
        },
        onClick: (e: React.MouseEvent) => {
          // El aracında etiket gizlenmez/silinmez: görünüm aracı sahneyi değiştirmez
          if (!nesneBasisiIslenmeli(activeTool, e)) return;
          e.stopPropagation();
          // İlkokul Simetri Keşfet: basış aday ucunu koydu; etiket gizlenmez
          if (simetriEtiketGecisiRef.current) return;
          // Taşıma yapıldıysa bu tıklama sürüklemenin devamıdır; etiketi gizleme/silme.
          if (labelJustDraggedRef.current || labelDragRef.current?.moved) {
            labelJustDraggedRef.current = false;
            return;
          }
          const eylem = etiketTiklamaEylemi(obj, eylemTuru, activeTool, gizlenebilir, esitlikIsaretli);
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
          if (secenek?.gizle) {
            secenek.gizle();
            return;
          }
          hideMeasurement(objectId, eylemTuru);
        },
      };
    },
    [objects, etiketKaymasi, yaziOlcegi, hideMeasurement, activeTool, deleteObjects, setHintMessage, esitlik]
  );

  // ------------------------------------------------------------------ ÖLÇÜ YAZIMI (MEB) ÖN GEÇİŞİ
  /** Kullanıcının ölçü/açı yazımı ayarı: Tam/Kısa ve şapka / ∠ (src/math/matematikYazimi.ts). */
  // İlkokulda ölçüler hep TAM sayı (alan uzmanları: "ondalık kesir kullanılmamalı"), ayar kapalı olsa da
  // Ortaokulda varsayılan 2 ondalık (alan uzmanı, 4. tur): tamSayi kademenin kendi ayarından (olcuYuvarlama.ts)
  // İlkokulda yuvarlanan değer tuvalde de "yaklaşık" der (uzman 4. tur [176]; matematikYazimi.yaklasikSozcukle)
  const yazim = useMemo(
    () => ({ ...yazimAyari(styleSettings), tamSayi: tamSayiOlcu, niteleyiciGizli: true, ...(ilkokul ? { yaklasikSozcukle: true } : {}) }),
    [styleSettings, tamSayiOlcu, ilkokul, kademe],
  );
  /** Nokta arayıcı: yazım kuralları nesnenin .label'ını değil, GÖRÜNEN nokta adlarını kullanır. */
  const noktaBul = useMemo(() => noktaBulucu(pointsById), [pointsById]);

  /**
   * DOĞRU DENKLEMİ YERLERİ (ekran px, yazının merkezi). Eskiden denklem ikinci tanım noktasının sağ üstüne sabit
   * konuyor, oradaki nokta harfiyle (B ya da orta nokta) üst üste biniyordu (alan uzmanı, 4. tur). Şimdi doğru
   * boyunca aday yerler denenir; nokta adlarının bölgelerine ve önceki denklemlere değmeyen ilk yer seçilir
   * (etiketCakismasi.ts). Eski yer boşsa yazı yerinden oynamaz.
   */
  const denklemYerleri = useMemo(() => {
    const yerler = new Map<string, { x: number; y: number }>();
    if (!showDetails) return yerler;
    const adBoyu = fs(12, 'label') * kutuOlcegi;
    const engeller: Kutu[] = [];
    if (!isSade) {
      for (const o of objects) {
        if (o.type !== 'point' || o.visible === false || !o.showLabel) continue;
        const nokta = o as PointObject;
        engeller.push(noktaAdiBolgesi(worldToScreen(nokta, viewport), {
          genislik: Math.max(1, (nokta.label || '').length) * adBoyu * 0.66,
          yukseklik: adBoyu,
        }, KOSE_BOSLUGU * kutuOlcegi));
      }
    }
    for (const o of objects) {
      if (o.type !== 'line' || o.visible === false || !(o as LineObject).showEquation) continue;
      const line = o as LineObject;
      const p1 = pointsById.get(line.point1Id);
      const p2 = pointsById.get(line.point2Id);
      if (!p1 || !p2 || Math.hypot(p2.x - p1.x, p2.y - p1.y) === 0) continue;
      const satirlar = [metniCozumle(calculateLineEquation(p1, p2).equationText, yazim)];
      const kutu = kutuOlcusu(satirlar, fs(11, 'measure'), { yatay: 0 });
      const boyut = { genislik: kutu.genislik * kutuOlcegi, yukseklik: kutu.yukseklik * kutuOlcegi };
      const merkez = denklemEtiketiMerkezi({
        a: worldToScreen(p1, viewport),
        b: worldToScreen(p2, viewport),
        boyut,
        engeller,
        tuval: { genislik: viewport.width, yukseklik: viewport.height },
        olcek: kutuOlcegi,
      });
      yerler.set(line.id, merkez);
      engeller.push({ x0: merkez.x - boyut.genislik / 2, y0: merkez.y - boyut.yukseklik / 2, x1: merkez.x + boyut.genislik / 2, y1: merkez.y + boyut.yukseklik / 2 });
    }
    return yerler;
  }, [objects, pointsById, viewport, showDetails, isSade, fs, kutuOlcegi, yazim]);

  /** Çemberin dünya yarıçapı: yarıçap noktası varsa ondan, yoksa sabit yarıçaptan. */
  /** İki nokta arasında görünen bir doğru parçası var mı (yarıçap etiketi o zaman çizginin yanına konur)? */
  const cizgiVarMi = useCallback((a: string, b: string) => objects.some((o) => o.type === 'segment' && o.visible !== false
    && ((o.startPointId === a && o.endPointId === b) || (o.startPointId === b && o.endPointId === a))), [objects]);

  const cemberYaricapi = useCallback((c: CircleObject): number => {
    const merkez = pointsById.get(c.centerPointId);
    const yari = c.radiusPointId ? pointsById.get(c.radiusPointId) : undefined;
    return merkez && yari ? calculateDistance(merkez, yari) : c.fixedRadius ?? 0;
  }, [pointsById]);

  /**
   * ÖLÇÜM KARTLARI (çokgen alan/çevre, çember, elips) tek yerden ölçülür: 4, 4.6 ve 5 katmanları
   * kartı buradan çizer, 6 (açı rozeti) ve 7.5 (yay rozeti) katmanları kutuları ENGEL olarak okur.
   */
  const kartKutulari = useMemo(
    () => (showDetails ? olcumKartKutulari({ objects, viewport, yazim, px: (t) => fs(t, 'measure'), yaziOlcegi }) : []),
    [objects, viewport, yazim, fs, showDetails, yaziOlcegi],
  );
  /**
   * Alanı Bul / Çevre Hesapla sonucu zaten etikette görünüyorsa o etiket 1,6 sn vurgulanır (kutusu kalın çizgiyle
   * görünür ve nabız atar): öğrenci aracın çalıştığını ve sonucun nerede olduğunu görür (alan uzmanı, 4. tur).
   */
  const [vurguluKart, setVurguluKart] = useState<{ id: string; anahtar: string } | null>(null);
  const kartiVurgula = useCallback((id: string, anahtar: string) => setVurguluKart({ id, anahtar }), []);
  useEffect(() => {
    if (!vurguluKart) return;
    const t = window.setTimeout(() => setVurguluKart(null), 1600);
    return () => window.clearTimeout(t);
  }, [vurguluKart]);
  const kartVurguluMu = (id: string, anahtar: string) => vurguluKart?.id === id && vurguluKart.anahtar === anahtar;
  /** Şekil başına AYRI ölçü etiketleri (başlık, yarıçap, alan, çevre): hiçbiri başka biriyle aynı kutuda değil. */
  const kartHaritasi = useMemo(() => {
    const harita = new Map<string, OlcumKarti[]>();
    for (const k of kartKutulari) harita.set(k.id, [...(harita.get(k.id) ?? []), k]);
    return harita;
  }, [kartKutulari]);
  const kartEngelleri = useMemo(() => showDetails
    // Yerleşim uzayındaki çakışma kutuları: alt sınırla büyüyen yazıyla örtüşsün diye yazı ölçeği = yerlesimOrani
    ? olcumKartKutulari({ objects, viewport: etiketGorunumu, yazim, px: (t) => fs(t, 'measure'), yaziOlcegi: yerlesimOrani }).map(k => k.kutu) : [],
  [objects, etiketGorunumu, yazim, fs, showDetails, yerlesimOrani]);

  /**
   * AÇI YAYI YARIÇAPI (etiket yerleşim pikseli; ekranda etiketOlcegi ile çarpılır). Dar açıda yay okunur
   * kalsın diye büyür (olcuEtiketi.aciYayYaricapi); yay çizimi (7.6), eş açı çentikleri (7.9) ve rozet
   * yerleşimi AYNI değeri okur. Kol boyu da yerleşim pikseliyle verilir (dünya boyu · 44 = ekran / etiketOlcegi).
   * Eş açı çentiği taşıyan açıda hedef yay boyu çentik sayısıyla uzar; aynı köşedeki iç içe açılarda kapsayan
   * açının yayı dışa alınır (koseAcilariniAyir). Dik açının karesi (7.6: Math.round(derece) === 90) 22'de kalır.
   */
  const aciYaylari = useMemo(() => {
    const centikSayilari = new Map<string, number>();
    for (const m of esitlik.isaretler) if (m.tur === 'aci') centikSayilari.set(m.sahipId, m.sayi);
    const dikAcilar = new Set<string>();
    const koseAcilari: KoseAcisi[] = [];
    for (const o of objects) {
      if (o.type !== 'angle') continue;
      const ang = o as AngleObject;
      const p1 = pointsById.get(ang.point1Id);
      const kose = pointsById.get(ang.vertexPointId);
      const p3 = pointsById.get(ang.point3Id);
      if (!p1 || !kose || !p3) continue;
      const icDeg = calculateAngleDegrees(p1, kose, p3);
      const deg = ang.reflex ? 360 - icDeg : icDeg;
      const dik = !ang.reflex && Math.round(deg) === 90;
      if (dik) dikAcilar.add(ang.id);
      const kisaKol = Math.min(calculateDistance(kose, p1), calculateDistance(kose, p3)) * LABEL_LAYOUT_ZOOM;
      // Taramanın yönü 7.6'daki gibi: kol1'den kol2'ye en kısa dönüş, dış açıda ters yönden (dünya açıları)
      const a1 = Math.atan2(p1.y - kose.y, p1.x - kose.x);
      let delta = Math.atan2(p3.y - kose.y, p3.x - kose.x) - a1;
      while (delta <= -Math.PI) delta += 2 * Math.PI;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      koseAcilari.push({
        id: ang.id,
        // Gizli açı başkasını dışa itmesin: kendi köşe grubunda tek kalır
        kose: ang.visible === false ? `gizli:${ang.id}` : kose.id,
        baslangic: a1,
        tarama: ang.reflex ? delta - Math.sign(delta || 1) * 2 * Math.PI : delta,
        r: aciYayYaricapi(deg, kisaKol, centikSayilari.get(ang.id) ?? 0),
        sabit: dik,
      });
    }
    return { yaricaplar: koseAcilariniAyir(koseAcilari), dikAcilar };
  }, [objects, pointsById, esitlik]);
  const aciYayYaricaplari = aciYaylari.yaricaplar;
  /**
   * Eş açı çentikleri için aynı yarıçaplar, EKRAN pikseliyle. Dik açıda çentik karenin köşegen ortasına oturur
   * (yarıçapın yarısı); kare kararı yalnız burada ve 7.6'da, aynı ölçütle verilir.
   */
  const aciYaricaplariPx = useMemo(
    () => new Map([...aciYaylari.yaricaplar].map(([id, r]) => [id, r * etiketOlcegi * (aciYaylari.dikAcilar.has(id) ? 0.5 : 1)] as const)),
    [aciYaylari, etiketOlcegi],
  );

  /**
   * Otomatik açı rozetleri görünen yazının boyutuna göre yayın yakınına yerleşir.
   * Elle taşınmış yazıların kayıtlı kayıklıkları için önceki sabit yerleşim korunur.
   */
  const aciRozetleri = useMemo(() => {
    const rozetler = new Map<string, { satirlar: Dugum[][]; olcu: KutuOlcusu; merkez: Nokta; uzak: boolean; sesli: string; ipucu: string; metin: string }>();
    if (!showDetails) return { rozetler };
    const px = fs(11, 'measure');
    type Uye = { id: string; tasinmis: boolean; aday: RozetAdayi; tam: Dugum[]; kisa: Dugum[]; sesli: string; ipucu: string; ozel?: string };
    const gruplar = new Map<string, { uyeler: Uye[]; kenarlar: [Nokta, Nokta][] }>();

    // TAM SAYI: bir çokgenin BÜTÜN iç açıları ölçülmüşse yuvarlama toplamı korur ((n − 2) · 180°).
    // Ayrı ayrı yuvarlanınca 59,6 + 59,6 + 60,8 → 60 + 60 + 61 = 181 olur ve öğrenci "hatalı sonuç" bulur.
    const toplamKorunan = new Map<string, number>();
    if (yazim.tamSayi) {
      const aciObjeleri = objects.filter((o): o is AngleObject => o.type === 'angle' && o.visible !== false && !o.reflex);
      for (const poly of objects) {
        if (poly.type !== 'polygon' || poly.visible === false) continue;
        const ids = (poly as PolygonObject).pointIds;
        const n = ids.length;
        if (n < 3) continue;
        const icAcilar: { id: string; deg: number }[] = [];
        for (let i = 0; i < n; i++) {
          const onceki = ids[(i - 1 + n) % n], kose = ids[i], sonraki = ids[(i + 1) % n];
          const a = aciObjeleri.find((x) => x.vertexPointId === kose
            && ((x.point1Id === onceki && x.point3Id === sonraki) || (x.point1Id === sonraki && x.point3Id === onceki)));
          const p1 = a && pointsById.get(a.point1Id), k = a && pointsById.get(a.vertexPointId), p3 = a && pointsById.get(a.point3Id);
          if (!a || !p1 || !k || !p3) break;
          icAcilar.push({ id: a.id, deg: calculateAngleDegrees(p1, k, p3) });
        }
        if (icAcilar.length !== n) continue;
        const yuvarlak = toplamiKoruyarakYuvarla(icAcilar.map((x) => x.deg), (n - 2) * 180);
        icAcilar.forEach((x, i) => toplamKorunan.set(x.id, yuvarlak[i]));
      }
    }

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
      const hamOlcu = aciOlcusu(ang, noktaBul, deg, { basamak: 1 });
      const korunan = toplamKorunan.get(ang.id);
      // Toplamı korunan tam sayı kesindir (yeniden yuvarlanmaz); gerçek açıdan farklıysa '≈' yazılır
      const olcu = korunan === undefined ? hamOlcu
        : { ...hamOlcu, deger: korunan, basamak: 0, sabitBasamak: true, yaklasik: Math.abs(korunan - deg) > 1e-9 || undefined };
      const { tam, kisa } = yazimlar(olcu, yazim);
      const aday: RozetAdayi = {
        girdi: {
          kose: vS,
          kol1, kol2,
          boy1: Math.hypot(s1.x - vS.x, s1.y - vS.y),
          boy2: Math.hypot(s3.x - vS.x, s3.y - vS.y),
          orta: kol1 + tarama / 2,
          tarama: Math.abs(tarama),
          // Yayın gerçek yarıçapı: dar açıda büyüyen yay rozetin altında kalmasın
          yayR: aciYayYaricaplari.get(ang.id) ?? 22,
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
      grup.uyeler.push({ id: ang.id, tasinmis: !!ang.labelOffsets?.angle || !!ang.labelAnchors?.angle, aday, tam, kisa, sesli: sesli(olcu, yazim), ipucu: aciklama(olcu, yazim), ozel: ang.labelTexts?.angle });
    }

    // Yazı ölçeğinin yerleşim (geometri) ölçeğine oranı: kutular yazı biriminde, kollar/köşe yerleşim birimindedir.
    const oran = yaziOrani;

    for (const grup of gruplar.values()) {
      // BİÇİM KURALI (kullanıcı isteği): rozet yayın YANINDAYKEN yalnız değer yazılır ("sadece 8br
      // yazmalıydı"); 'm(AB̂C) = 60°' ancak rozet elle uzaklaştırılınca açılır. Bu yüzden grup sığma
      // kararı (aciRozetiYerlesimi) artık biçimi BELİRLEMEZ, yalnız taşınmış rozetlerin yerini verir.
      const yerlesim = grup.uyeler.some(u => u.tasinmis) ? aciRozetiYerlesimi(
        grup.uyeler.map((u) => ({ ...u.aday, tam: u.aday.kisa })),
        { kenarlar: grup.kenarlar, kutular: kartEngelleri },
        'kisa',
      ) : null;
      grup.uyeler.forEach((u, i) => {
        // Elle taşınmış rozetin doğal merkezi DEĞİŞMEZ (kayıtlı kayıklık ona göredir); taşınmamış
        // rozet her zaman yayın yanındaki en yakın yere oturur.
        const yer = u.tasinmis ? yerlesim?.yerler[i] : yakinAciRozetiYerlesimi(u.aday.girdi, u.aday.kisa, oran);
        if (!yer) return;
        const merkez = projectLabelPoint({ x: (yer.kutu.x0 + yer.kutu.x1) / 2, y: (yer.kutu.y0 + yer.kutu.y1) / 2 }, viewport);
        const kayma = etiketKaymasi(u.id, 'angle', merkez, u.aday.tam.genislik);
        const rozetUzak = etiketAyrikMi(u.id, 'angle') || aciEtiketiUzakta(projectLabelPoint(u.aday.girdi.kose, viewport), merkez, kayma, 18 * etiketOlcegi);
        // Tek ölçüt: rozet KÖŞEDEN uzaklaşmış mı? Yayın çevresinde aynı uzaklıkta kaydırmak
        // (kayıklığın boyu büyür ama rozet yayın yanındadır) tam yazıma çevirmez.
        const tamYazim = rozetUzak;
        // Elle yazılmış rozet metni (sağ tık > Etiketi düzenle…) kısa/tam yazının yerine geçer
        const ozelSatir = u.ozel !== undefined ? metinDugumleri(u.ozel) : null;
        const satir = ozelSatir ?? (tamYazim ? u.tam : u.kisa);
        rozetler.set(u.id, {
          satirlar: [satir],
          olcu: ozelSatir ? kutuOlcusu([ozelSatir], px) : tamYazim ? u.aday.tam : u.aday.kisa,
          merkez,
          uzak: rozetUzak,
          sesli: u.ozel ?? u.sesli,
          ipucu: u.ozel ?? u.ipucu,
          metin: u.ozel ?? duzMetin(satir),
        });
      });
    }
    return { rozetler };
  }, [objects, pointsById, viewport, etiketGorunumu, etiketOlcegi, yaziOlcegi, yazim, fs, showDetails, noktaBul, kartEngelleri, etiketKaymasi, etiketAyrikMi, aciYayYaricaplari]);

  /** Çapa her iki yazımda da kısa kutudan hesaplanır; sürüklerken biçim değişimi konumu değiştirmez. */
  const cizgiYazimi = useCallback((olcu: Olcu) => {
    const { tam, kisa } = yazimlar(olcu, yazim);
    return { tam, kisa, kisaKutu: kutuOlcusu([kisa], fs(11, 'measure')), sesli: sesli(olcu, yazim), ipucu: aciklama(olcu, yazim) };
  }, [yazim, fs]);

  /**
   * YAZIM KURALI (kullanıcı isteği): etiket ölçtüğü çizginin YANINDAYKEN yalnız değer yazılır
   * ("uzunluk ve açı hala şekle yakınken |AB| = 8br şeklinde yazıyor, sadece 8br yazmalıydı").
   * Tam yazım ('|AB| = 5 br') ancak etiket çizgiden UZAKLAŞTIRILDIĞINDA açılır; ipucunda ve
   * panelde ise her zaman tam yazım durur. Yön (paralel/yatay) da aynı yakınlığa bakar.
   *
   * İSTİSNA YOKTUR: Uzunluk/Birim Ölç aracının kendi ölçüm çizgisi ve yay rozeti de aynı kurala uyar
   * (kullanıcı, 2026-09-25: "ilgili konumda kısaltılmış yazmalıydı").
   */
  const cizgiEtiketiniYerlestir = useCallback((
    yazi: ReturnType<typeof cizgiYazimi>, objectId: string, kind: MeasurementKind | string,
    a: Nokta, b: Nokta, merkez: Nokta,
    /**
     * ucOtesiUzak: etiketin merkezi çizgi boyunca [a, b]'nin dışına (bir ucun ötesine) çıkınca da uzak sayılır.
     * Kesikli ölçü çizgili uzunluk ölçümü kullanır: yazı ucun dışına kayınca ölçü çizgisi kalkar ve tam yazıma
     * geçilir; parçaya uzaklık eşiği (18 px) ucun ötesinde ancak ~47 px sonra doluyordu.
     */
    secenek?: { ucOtesiUzak?: boolean },
  ) => {
    const px = fs(11, 'measure');
    // Elle yazılmış etiket metni (sağ tık > Etiketi düzenle…) hesaplanan kısa/tam yazının yerine geçer
    const ozel = objects.find((o) => o.id === objectId)?.labelTexts?.[kind];
    const ozelSatir = ozel !== undefined ? metinDugumleri(ozel) : null;
    const tamKutu = kutuOlcusu([ozelSatir ?? yazi.tam], px);
    const cizgi = { a, b };
    const kayma = etiketKaymasi(objectId, kind, merkez, tamKutu.genislik, cizgi);
    const ayrik = etiketAyrikMi(objectId, kind);
    let ucOtesi = false;
    if (secenek?.ucOtesiUzak) {
      const cerceve = cizgiCercevesi(a, b);
      if (cerceve) {
        const boyunca = (merkez.x + kayma.x - a.x) * cerceve.ex + (merkez.y + kayma.y - a.y) * cerceve.ey;
        ucOtesi = boyunca < 0 || boyunca > cerceve.boy;
      }
    }
    const uzak = ayrik || ucOtesi || cizgiEtiketiUzakta(a, b, merkez, kayma, 18 * etiketOlcegi);
    // TEK ÖLÇÜT `uzak`: etiket ÇİZGİDEN uzaklaşmışsa (ya da elle koparılmışsa) tam yazılır.
    // Kayıklığın BOYUNA bakılmaz: etiketi çizginin ÜSTÜNDE kaydırmak (uzunluk boyunca öteleme)
    // kayıklığı büyütür ama etiket hâlâ kenarın üstündedir — kullanıcı orada "sadece 6,08 br"
    // bekliyor, "|AC| ≈ 6,08 br" değil (2026-09-25, ekran görüntüsüyle bildirildi).
    const tamYazim = uzak;
    const satirlar = [ozelSatir ?? (tamYazim ? yazi.tam : yazi.kisa)];
    return {
      merkez,
      uzak,
      satirlar,
      olcu: ozelSatir || tamYazim ? tamKutu : yazi.kisaKutu,
      donmeAcisi: uzak ? 0 : etiketAcisi(b.x - a.x, b.y - a.y),
      sesli: ozel ?? yazi.sesli,
      ipucu: ozel ?? yazi.ipucu,
      metin: ozel ?? duzMetin(satirlar[0]),
      cizgi,
    };
  }, [etiketKaymasi, etiketAyrikMi, etiketOlcegi, fs, objects]);

  const sliderScope = useMemo(() => surguKapsami(objects), [objects]);

  // İlk görünüm ve proje/etkinlik yükleme WorkspaceContext tarafından yönetilir.
  // Tuval 3B'den dönünce yeniden bağlanabilir; kayıtlı yakınlaştırmayı sıfırlama.

  // Görünür dünya sınırları ve ızgara çizgileri
  const worldBounds = useMemo(() => getVisibleWorldBounds(viewport), [viewport]);

  // FONKSİYON GRAFİKLERİ ÖN GEÇİŞİ (alan uzmanı, 4. tur, satır 157): süreksizlikte (1/x'te x = 0) yol kesilir
  // (fonksiyonCizimi.ts). Her grafiğin okunur ad/denklem etiketinin ("f(x) = 2x + 1") yeri aşağıda,
  // eksen yerleşiminden sonra hesaplanır (fonksiyonEtiketleri).
  const fonksiyonCizimleri = useMemo(() => {
    const sonuc = new Map<string, { d: string; fn: FunctionObject; parcalar: Point2D[][] }>();
    const pointsCount = Math.min(800, Math.max(200, Math.floor(viewport.width / 2)));
    for (const o of objects) {
      if (o.type !== 'function' || !o.visible) continue;
      const fn = o as FunctionObject;
      const compiled = getCompiledExpression(fn.expression);
      if (!compiled) continue;
      const safeEval = (x: number): number => {
        try {
          const y = compiled(x, sliderScope);
          return typeof y === 'number' ? y : NaN;
        } catch (e) {
          return NaN;
        }
      };
      const dunya = fonksiyonParcalari(safeEval, worldBounds, pointsCount);
      const ekran = dunya.map((parca) => parca.map((p) => worldToScreen(p, viewport)));
      sonuc.set(fn.id, { d: parcalardanYol(ekran, (p) => p), fn, parcalar: ekran });
    }
    return sonuc;
  }, [objects, viewport, worldBounds, sliderScope]);
  // Çizilen ızgara adımı: Ayarlar > Izgara aralığı "Otomatik" ise yakınlaştırmaya göre, değilse girilen sabit aralık
  const gridInfo = useMemo(
    () => visibleGridStep(viewport),
    [viewport.zoom, viewport.gridStep, viewport.gridStepAuto] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Kareli ızgaranın ve eksen çentiklerinin konumları (katmanlar/izgaraVeEksenler.ts); ne ızgara ne eksen açıksa boş
  const gridLines = useMemo(
    () => izgaraKonumlari(worldBounds, gridInfo.step, viewport.showGrid || viewport.showAxes),
    [worldBounds, gridInfo.step, viewport.showGrid, viewport.showAxes]
  );

  // Izgaraya yapıştırma (çizilen uyarlanabilir ızgara adımıyla)
  const snapIfEnabled = (p: Point2D): Point2D =>
    // Tek yakalama kuralı: mod (Otomatik / Sıçra / Sabitli / Kapalı) ve ızgara biçimi (kareli / noktalı / izometrik)
    snapPointToGrid(p, viewport, gridInfo.step);

  // Yeni nokta nesnesi üretici (cizimNesneleri.yeniNokta; renk her çağrıda açıkça verilir)
  const makePoint = (label: string, x: number, y: number, color: string): PointObject => yeniNokta(label, x, y, color);

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

  /** Kutuyla seçim: kutu imlece uzar; kutu yeterince büyükse içindeki nesneler seçilir (Shift/Ctrl ile başladıysa eklenir) */
  const kutuSeciminiIlerlet = (kutu: KutuSecimi, imlec: Point2D) => {
    setSelectionMarquee((prev) => (prev ? { ...prev, currentWorld: imlec } : null));
    const x0 = Math.min(kutu.startWorld.x, imlec.x);
    const x1 = Math.max(kutu.startWorld.x, imlec.x);
    const y0 = Math.min(kutu.startWorld.y, imlec.y);
    const y1 = Math.max(kutu.startWorld.y, imlec.y);
    if (!(Math.hypot(x1 - x0, y1 - y0) > 0.05)) return;
    const icindekiler = objects.filter((o) => kutuyaDuserMi(o, pointsById, { x0, x1, y0, y1 })).map((o) => o.id);
    setSelectedObjectIds(kutu.baseIds.length > 0 ? Array.from(new Set([...kutu.baseIds, ...icindekiler])) : icindekiler);
  };

  /** 3B cismin 2B izdüşümü sürükleniyor: konum (2 ondalık) cismin kendisine yazılır, yükseklik (z) değişmez */
  const cismiSurukle = (surukleme: CisimSuruklemesi, imlec: Point2D) => {
    const dx = imlec.x - surukleme.startWorld.x;
    const dy = imlec.y - surukleme.startWorld.y;
    if (!(Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4)) return;
    onUpdateSolidPosition?.(surukleme.solidId, {
      x: Number((surukleme.initialPos.x + dx).toFixed(2)),
      y: Number((surukleme.initialPos.y + dy).toFixed(2)),
      z: surukleme.initialPos.z,
    });
    if (!surukleme.hasMoved) setDraggingSolidState((prev) => (prev ? { ...prev, hasMoved: true } : null));
  };

  /** Seçili nesneler sürükleniyor */
  const nesneleriSurukle = (surukleme: NesneSuruklemesi, world: Point2D) => {
    // Çapa noktasının SON konumunu hesapla (delta değil, hedef konum ızgaraya yapıştırılır)
    const anchorPos = getAnchorPosition(surukleme.anchorId);
    let delta: Point2D;
    let capa: { id: string; delta: Point2D } | undefined;
    let hedef: Point2D | null = null;
    if (anchorPos) {
      const target = snapIfEnabled({
        x: world.x + surukleme.anchorOffset.x,
        y: world.y + surukleme.anchorOffset.y,
      });
      hedef = target;
      // Kilit yüzünden çapa hedefe tam gidemeyebilir. Seçimin geri kalanı farenin GERÇEK adımını (hedef − çapanın
      // kısıtsız olsaydı bulunacağı yer) alır; çapanın grubu eksik kalan kısmı da yeniden ister ki taşıyıcısı
      // boyunca imleci izlesin. Aksi hâlde kilitli noktadan tutulunca serbest şekiller her karede fazla kayıyordu.
      const sanalCapa = surukleme.virtualAnchor ?? anchorPos;
      delta = { x: target.x - sanalCapa.x, y: target.y - sanalCapa.y };
      // İnşa noktası (orta nokta, kesişim…) çapaysa konumunu bağlı olduğu nesneler belirler: eksik kısmı yeniden
      // istemek onu her karede daha ileri itmeye çalışıp grubunu kaçırıyordu; o zaman grup da farenin adımını alır.
      if (surukleme.anchorId && !pointsById.get(surukleme.anchorId)?.construction) {
        capa = { id: surukleme.anchorId, delta: { x: target.x - anchorPos.x, y: target.y - anchorPos.y } };
      }
    } else {
      delta = { x: world.x - surukleme.lastWorld.x, y: world.y - surukleme.lastWorld.y };
    }

    if (Math.abs(delta.x) > 1e-9 || Math.abs(delta.y) > 1e-9) {
      moveObjects(surukleme.objectIds, delta, false, capa);
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
  };

  /** El aracıyla (ya da boş alanda sürükleyerek) görünüm kaydırılıyor */
  const gorunumuKaydir = (ekran: Point2D) => {
    const dx = ekran.x - panStart.x;
    const dy = ekran.y - panStart.y;
    setViewport((prev) => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
    setPanStart(ekran);
  };

  /**
   * İmleci izler (önizlemeler için dünya konumu) ve süren işlemi ilerletir: kalem çizgisi, sürükleyerek oluşturma,
   * kutuyla seçim, pergel, cisim ya da nesne sürükleme, görünüm kaydırma. Etiket sürüklenirken şekil sürüklenmez.
   */
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const { ekran, world } = fareKonumu(e, svgRef.current, viewport);
    setMouseWorldPos(world);
    if (isDrawingPen) setCurrentPenStroke((prev) => [...prev, world]);
    else if (dragCreateStart) setDragCreateCurrent(snapIfEnabled(world));
    else if (selectionMarquee) kutuSeciminiIlerlet(selectionMarquee, world);
    else if (activeTool === 'compass' && pergel) setPergel((p) => (p ? pergelIlerlet(p, world) : p));
    else if (labelDragRef.current) return;
    else if (draggingSolidState) cismiSurukle(draggingSolidState, world);
    else if (draggingObjState) nesneleriSurukle(draggingObjState, world);
    else if (isPanning) gorunumuKaydir(ekran);
  };

  // Belirli bir ekran noktası etrafında yakınlaştırma (tekerlek, +/- düğmeleri ortak yol)
  // screenPoint verilmezse görünümün merkezi kullanılır.
  const zoomAt = useCallback(
    (screenPoint: Point2D | null, factor: number) => {
      if (sliderPositionDragRef.current) return;
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

  // Tekerlekle imlecin çevresinde yakınlaştırma. Dinleyici passive: false bağlanır: React'in tekerlek olayı edilgendir,
  // preventDefault sayfanın kaymasını durduramazdı.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const tekerlek = (e: WheelEvent) => {
      e.preventDefault();
      const kutu = svg.getBoundingClientRect();
      zoomAt({ x: e.clientX - kutu.left, y: e.clientY - kutu.top }, e.deltaY < 0 ? TEKERLEK_ADIMI : 1 / TEKERLEK_ADIMI);
    };
    svg.addEventListener('wheel', tekerlek, { passive: false });
    return () => svg.removeEventListener('wheel', tekerlek);
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
          color: NESNE_RENGI.mavi,
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
      setHintMessage('Açıklığı ayarlayın: İmleci iğneden uzaklaştırıp tıklayın.');
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
        `Açıklık ${formatTurkishNumber(r)} br. Şimdi yayın BAŞLANGICINI istediğiniz yere bırakın: İmleci çemberin çevresinde gezdirip tıklayın.`
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

  /** Seç aracında boş alana basış: kutuyla seçim başlar; Shift/Ctrl yoksa önceki seçim (nesne ve cisim) bırakılır */
  const kutuSecimineBasla = (konum: Point2D, ekle: boolean) => {
    if (!ekle) {
      setSelectedObjectIds([]);
      onSelectSolid?.(null);
      onSelectSolids?.([]);
    }
    setSelectionMarquee({ startWorld: konum, currentWorld: konum, baseIds: ekle ? selectedObjectIds : [] });
  };

  /** Metin aracıyla tuvale basış: not penceresi yeni not için açılır (not, basılan yere ızgaraya oturarak konur) */
  const yeniNotAc = (konum: Point2D) => {
    setPendingTextWorldPos(snapIfEnabled(konum));
    setEditingTextObj(null);
    setIsTextDialogOpen(true);
  };

  /**
   * Tuvale basış (nesnelere basış nesne katmanlarında işlenir). Sırayla: görünüm kaydırma basışı; sol tuş değilse
   * hiçbir şey; etkin aracın kendi işi (not, kalem, görsel, kapalı bölge ölçme, sürükleyerek oluşturma, pergel, ilkokul
   * simetrisi); boş alanda Seç aracında kutuyla seçim, diğer araçlarda tuval tıklaması.
   */
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const { world } = fareKonumu(e, svgRef.current, viewport);

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

    // Boş alan: tuvalin kendisi, ızgara zemini ya da iz çizgisinin görünmez yakalayıcısı (o yalnız sağ tık içindir)
    const isBackground =
      e.target === svgRef.current ||
      (e.target as HTMLElement).id === 'grid-background' ||
      (e.target as Element).hasAttribute?.('data-iz-yakalayici');

    if (activeTool === 'text') {
      yeniNotAc(world);
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

    if (isBackground && (activeTool === 'measure_area' || activeTool === 'measure_perimeter')) {
      const pointIds = parcalardanKapaliBolge(objects, world);
      if (pointIds) {
        const mevcut = objects.find((o) => o.type === 'polygon' && o.pointIds.length === pointIds.length && pointIds.every((id) => o.pointIds.includes(id)));
        if (mevcut) {
          if (activeTool === 'measure_area') measureArea(mevcut.id); else measurePerimeter(mevcut.id);
        } else {
          const alanOlc = activeTool === 'measure_area';
          addObject(kapaliBolgeCokgeni(pointIds, alanOlc), alanOlc ? 'Doğru parçaları arasındaki alan ölçüldü' : 'Doğru parçalarının çevresi ölçüldü');
        }
        cancelPendingAction();
        setHintMessage('Kapalı bölgenin ölçüsü tuvale yazıldı; köşeler taşındığında ölçü güncellenir.');
        return;
      }
    }

    if (SURUKLEYEREK_CIZILEN_ARACLAR.includes(activeTool)) {
      const start = snapIfEnabled(world);
      // Kısa basış tıklama sayılır: tıklama yolu HAM konumu alır (önce kenara, sonra ızgaraya oturtur)
      dragCreateHamRef.current = world;
      setDragCreateStart(start);
      setDragCreateCurrent(start);
      return;
    }

    // PERGEL: kendi akışı var; boş tuval tıklaması NOKTA ÜRETMEZ.
    if (activeTool === 'compass') {
      pergelAdimi(world);
      return;
    }

    if (isBackground && activeTool === 'symmetry' && ilkokul) {
      simetri.tiklama(world);
      return;
    }

    if (!isBackground) return;
    if (activeTool === 'select') kutuSecimineBasla(world, e.shiftKey || e.ctrlKey);
    else handleCanvasClick(world);
  };

  /** Kalem bırakıldı: en az iki noktalı çizgi serbest çizim olarak eklenir */
  const kalemiBitir = () => {
    if (currentPenStroke.length > 1) addObject(kalemCizgisi(currentPenStroke), 'Serbest çizim eklendi');
    setIsDrawingPen(false);
    setCurrentPenStroke([]);
  };

  /** Sürükleyerek oluşturma bitti: kısa basış tıklama sayılır, yoksa önizlemedeki şekil (aynı yuvarlamayla) eklenir */
  const surukleyerekOlusturmayiBitir = (baslangic: Point2D) => {
    const endWorld = dragCreateCurrent || baslangic;
    const dx = Math.abs(endWorld.x - baslangic.x);
    const dy = Math.abs(endWorld.y - baslangic.y);
    const dist = Math.hypot(dx, dy);

    if (dist < 0.4) {
      // Tıklamayla standart boyutlu oluştur. Ham konum verilir: handleCanvasClick noktayı önce yakındaki şeklin
      // kenarına, yoksa ızgaraya oturtur (Doğru, Işın ve Nokta araçlarıyla aynı)
      handleCanvasClick(dragCreateHamRef.current ?? baslangic);
    } else {
      const x1 = Math.min(baslangic.x, endWorld.x);
      const y1 = Math.min(baslangic.y, endWorld.y);
      const round1 = birOndalik;
      const labels = existingPointLabels();

      if (activeTool === 'square') {
        const side = round1(Math.max(dx, dy));
        const adlar = generateNextPointLabels(labels, 4);
        addObjects(
          koseliCokgen(dikdortgenKoseleri(x1, y1, x1 + side, y1 + side), adlar, NESNE_RENGI.mavi, KARE_GORUNUMU),
          `Kare oluşturuldu (a = ${formatTurkishNumber(side)} br)`
        );
      } else if (activeTool === 'rectangle') {
        // Köşe konumları, gösterilen (yuvarlanmış) boyutlarla birebir eşleşir
        const rw = round1(dx);
        const rh = round1(dy);
        const adlar = generateNextPointLabels(labels, 4);
        addObjects(
          koseliCokgen(dikdortgenKoseleri(x1, y1, x1 + rw, y1 + rh), adlar, NESNE_RENGI.mavi, DIKDORTGEN_GORUNUMU),
          `Dikdörtgen oluşturuldu (${formatTurkishNumber(rw)} x ${formatTurkishNumber(rh)} br)`
        );
      } else if (activeTool === 'ellipse') {
        // Sürüklenen kutuya İÇTEN teğet elips: yarıçaplar kutunun yarı kenarlarıdır
        const ra = round1(dx / 2);
        const rb = round1(dy / 2);
        const [centerLabel] = generateNextPointLabels(labels, 1);
        addObjects(
          elipsNesneleri(elipsMerkezi(x1, y1, dx, dy), ra, rb, centerLabel),
          `Elips oluşturuldu (a = ${formatTurkishNumber(ra)} br, b = ${formatTurkishNumber(rb)} br)`
        );
      } else if (activeTool === 'circle') {
        // Yarıçap kademenin yuvarlamasıyla (tam sayı ölçüde tam birim), önizlemedeki değerle aynı
        const radius = surukleCemberYaricapi(dist, tamSayiOlcu);
        const [centerLabel] = generateNextPointLabels(labels, 1);
        const centerPt = makePoint(centerLabel, baslangic.x, baslangic.y, NESNE_RENGI.mor);
        const circ = cemberNesnesi(centerPt.id, `${centerLabel} Merkezli Çember`, { fixedRadius: radius });
        addObjects([centerPt, circ], `Çember oluşturuldu (r = ${formatTurkishNumber(radius)} br)`);
      } else if (activeTool === 'segment') {
        const [la, lb] = generateNextPointLabels(labels, 2);
        // Uç nokta önizlemedeki yuvarlanmış uzunluğa oturur; Izgaraya Yapış açıkken ızgarada kalır (surukleParcaUcu)
        const endPos = surukleParcaUcu(baslangic, endWorld, dist, viewport.snapToGrid, tamSayiOlcu);
        const p1 = makePoint(la, baslangic.x, baslangic.y, NESNE_RENGI.camgobegi);
        const p2 = makePoint(lb, endPos.x, endPos.y, NESNE_RENGI.camgobegi);
        const seg = parcaNesnesi(p1.id, p2.id, `[${la}${lb}]`);
        addObjects([p1, p2, seg], `[${la}${lb}] doğru parçası oluşturuldu`);
      }
    }
    setDragCreateStart(null);
    setDragCreateCurrent(null);
  };

  /** Nesne sürüklemesi bitti: gerçekten taşındıysa geçmişe tek adım yazılır ("A taşındı" ya da "3 nesne taşındı") */
  const nesneSuruklemesiniBitir = (surukleme: NesneSuruklemesi) => {
    if (surukleme.hasMoved) {
      const tasinan = surukleme.objectIds.map((id) => objects.find((o) => o.id === id)).filter((o): o is MathObject => !!o);
      recordHistory(tasinan.length === 1 ? `${tasinan[0].label || 'Nesne'} taşındı` : `${surukleme.objectIds.length} nesne taşındı`);
    }
    setDraggingObjState(null);
  };

  /** Fare bırakıldı: süren işlemler tamamlanır ve sürüklemeler biter */
  const handleMouseUp = () => {
    if (isDrawingPen) kalemiBitir();
    if (dragCreateStart) surukleyerekOlusturmayiBitir(dragCreateStart);
    if (selectionMarquee) setSelectionMarquee(null);
    if (draggingSolidState) {
      if (draggingSolidState.hasMoved) onDragEnd?.();
      setDraggingSolidState(null);
    }
    if (draggingObjState) nesneSuruklemesiniBitir(draggingObjState);
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
      setContextTarget({ obj, x: e.clientX, y: e.clientY, edgeIndex, adaylar: imlecinAltindakiler(e.clientX, e.clientY, obj, noktaGovdesi), etiket: etiketHedefiniBul(e.target as Element) ?? undefined });
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
      // Parmak bir ölçü etiketine bastıysa menüde "Etiketi düzenle…" de sunulur
      const etiket = etiketHedefiniBul(e.target as Element) ?? undefined;
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
        setContextTarget({ obj: hedef, x: startX, y: startY, edgeIndex, adaylar: imlecinAltindakiler(startX, startY, hedef, yakalayici), etiket });
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
      // İlkokulda zemin seçeneklerinde koordinat ekseni sunulmaz (kareli, noktalı, izometrik kalır)
      if (ilkokul) bostaMaddeler.splice(bostaMaddeler.findIndex((m) => m.id === 'eksenleri-goster'), 1);
      if (izMaddesi.length) bostaMaddeler[0] = { ...bostaMaddeler[0], separatorBefore: true };
      return [...izMaddesi, ...(objectClipboard?.objects.length ? [pasteItem] : []), ...bostaMaddeler];
    }
    const targetIds = selectedObjectIds.includes(hedef.id) ? selectedObjectIds : [hedef.id];
    const maddeler: ContextMenuItem[] = [
      { id: 'kopyala', label: 'Kopyala', onSelect: () => {
        // Pano gerçek nesneleri alır: ilkokul görünümünde gizlenen adlar yapıştırılan kopyaya yazılmasın
        setObjectClipboard(copyObjects(kaynakNesneler, targetIds));
        setHintMessage('Kopyalandı. Yapıştırmak istediğiniz yere sağ tıklayın.');
      } },
      pasteItem,
    ];
    if (hedef.type === 'function' && onEditFunction) {
      maddeler[0] = { ...maddeler[0], separatorBefore: true };
      maddeler.unshift({
        id: 'fonksiyonu-duzenle',
        label: 'Fonksiyonu Düzenle',
        icon: <PencilLine className="w-4 h-4" />,
        onSelect: () => onEditFunction(hedef.id),
      });
    }
    // Sağ tıklanan bir ÖLÇÜ ETİKETİYSE (alan, çevre, yarıçap, uzunluk, kenar, açı, eğim): metni elle yazılır
    // ya da hesaplanan yazıya dönülür (etiketMetni.ts). Yazı notlarının kendi "Metni düzenle…" maddesi var.
    const etiket = contextTarget?.etiket;
    const etiketSahibi = etiket ? objects.find((o) => o.id === etiket.objectId) : undefined;
    if (etiket && etiketSahibi && etiketMetniDuzenlenebilir(etiket.kind, etiketSahibi.type, (etiketSahibi as MeasurementObject).kind)) {
      const ozel = etiketSahibi.labelTexts?.[etiket.kind];
      const etiketMaddeleri: ContextMenuItem[] = [{
        id: 'etiketi-duzenle',
        label: 'Etiketi düzenle…',
        icon: <PencilLine className="w-4 h-4" />,
        onSelect: () => setEtiketDuzenleme({ objectId: etiketSahibi.id, kind: etiket.kind, metin: ozel ?? etiket.metin, elleYazilmis: ozel !== undefined }),
      }];
      if (ozel !== undefined) etiketMaddeleri.push({
        id: 'etiket-hesaplanan',
        label: 'Hesaplanan yazıya dön',
        icon: <RotateCcw className="w-4 h-4" />,
        onSelect: () => updateObject(etiketSahibi.id, { labelTexts: etiketMetniGuncelle(etiketSahibi.labelTexts, etiket.kind, null) } as Partial<MathObject>),
      });
      maddeler[0] = { ...maddeler[0], separatorBefore: true };
      maddeler.unshift(...etiketMaddeleri);
    }
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
        // En sık kullanılan uydurma tek tıkla: derece sorulmadan doğrusal regresyon (en uygun doğru)
        maddeler.push({
          id: 'dogrusal-uydur',
          label: 'Doğrusal fonksiyon uydur',
          separatorBefore: true,
          onSelect: () => fitPolynomialToPoints(seciliNoktalar, 1),
        });
        maddeler.push({
          id: 'polinom-uydur',
          label: `Noktalara polinom uydur… (${seciliNoktalar.length} nokta)`,
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
          alt.push({ id: 'yay-olc-fazlasi', label: `${fazlasi} yay daha var: Diğer noktaya sağ tıklayıp oradan seçin`, disabled: true, separatorBefore: true });
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
      // Nokta bir yay / dilimin merkeziyse görünen merkez açısı da listeye girer (çokgen köşesindeki gibi).
      const koseAcilari = objects.filter(
        (o): o is AngleObject => o.type === 'angle' && o.vertexPointId === hedef.id
      );
      const merkezAcilari = aciEylemi?.kind === 'central'
        ? aciEylemi.shapes.filter((s) => s.visible !== false && s.showCentralAngle !== false)
        : [];
      const noktaEtiketi = (id: string) =>
        (objects.find((o) => o.id === id && o.type === 'point') as PointObject | undefined)?.label || '?';
      const icDisSecenekleri = [
        ...koseAcilari.map((a) => ({
          id: a.id,
          label: `${noktaEtiketi(a.point1Id)}${hedef.label || '?'}${noktaEtiketi(a.point3Id)} açısı`,
          dis: !!a.reflex,
        })),
        ...merkezAcilari.map((s) => ({
          id: s.id,
          label: `${noktaEtiketi(s.startPointId)}${hedef.label || '?'}${noktaEtiketi(s.directionPointId)} merkez açısı`,
          dis: !!s.centralAngleReflex,
        })),
      ];
      if (icDisSecenekleri.length === 1) {
        maddeler.push({
          id: 'ic-dis-aci',
          label: 'İç açı / dış açı',
          onSelect: () => toggleAngleReflex(icDisSecenekleri[0].id),
        });
      } else if (icDisSecenekleri.length > 1) {
        maddeler.push({
          id: 'ic-dis-aci',
          label: 'İç açı / dış açı',
          submenu: icDisSecenekleri.map((a) => ({
            id: `ic-dis-aci-${a.id}`,
            label: a.label,
            checked: a.dis,
            onSelect: () => toggleAngleReflex(a.id),
          })),
        });
      }

      // Nokta bir parçanın/doğrunun ARASINDA (ya da bölünmüş zincirin eklem yerinde) duruyorsa
      // "baştan sona" ve "noktaya kadar" uzunlukları noktanın kendi menüsünde de sunulur.
      const noktaUzunluklari = lengthOptionsAtPoint(objects, hedef.id)?.options ?? [];
      noktaUzunluklari.forEach((o, i) => maddeler.push(uzunlukMaddesi(o, i === 0, noktaUzunluklari.length > 1)));

      // Bir şeklin üzerindeki nokta şekil boyunca canlandırılabilir
      if (hedef.onObjectId) {
        const oynuyor = !!hedef.animating;
        maddeler.push({
          id: 'canlandirma',
          label: oynuyor ? 'Animasyonu Durdur' : 'Animasyonu Başlat',
          separatorBefore: true,
          onSelect: () => updateObject(hedef.id, { animating: !oynuyor } as Partial<MathObject>, true),
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
      // Ölçüm ancak kullanıcı bu menüden istediğinde açılır.
      maddeler.push({ id: 'olc-alan', label: 'Alanını ölç', onSelect: () => measureArea(circ.id) });
      maddeler.push({ id: 'olc-cevre', label: 'Çevresini ölç', onSelect: () => measurePerimeter(circ.id) });
      // Yarıçap etiketi ayrı bir etikettir: tıklayınca gizlenir, buradan geri açılır.
      const yaricapAcik = cemberYaricapiGorunur(circ);
      maddeler.push({ id: 'olc-yaricap', label: yaricapAcik ? 'Yarıçap uzunluğunu gizle' : 'Yarıçap uzunluğunu ölç', onSelect: () => updateObject(circ.id, { showRadius: !yaricapAcik } as Partial<MathObject>, true) });
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
              ? [{ id: 'yay-olc-fazlasi', label: `${fazlasi} yay daha var: Bir noktaya sağ tıklayıp oradan seçin`, disabled: true, separatorBefore: true }]
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
            : ilkokul ? `${ad} kenarını ölç` : `${ad} kenarını ölç (${formatTurkishNumber(uzunluk)} br)`,
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
      maddeler.push({ id: 'olc-cevre', label: 'Çevresini ölç', separatorBefore: ilkokul, onSelect: () => measurePerimeter(hedef.id) });
    } else if (hedef.type === 'arc' || hedef.type === 'sector') {
      // Yay / daire dilimi: merkez açı her ikisinde de anlamlıdır (yarım çemberde 180°)
      const merkezAciAcik = (hedef as ArcObject | SectorObject).showCentralAngle !== false;
      maddeler.push({
        id: 'olc-merkez-aci',
        label: merkezAciAcik ? 'Merkez açıyı gizle' : 'Açısını ölç (merkez açı)',
        onSelect: () => measureArcAngle(hedef.id),
      });
      // İç / dış açı: çokgen açılarındaki gibi merkez açının tamamlayanı (360° − iç açı) gösterilebilir
      if (merkezAciAcik) maddeler.push({ id: 'ic-dis-aci', label: 'İç açı / dış açı', onSelect: () => toggleAngleReflex(hedef.id) });
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

      // Döndürmeyle kurulmuş açı bir sürgüye bağlıysa sürgüsüyle canlandırılır, sürgüsü değiştirilir ya da bağı
      // kaldırılır; bağlı değilse adı sorulan bir sürgüye bağlanarak canlandırılır
      const surguAdiSor = (ilkAd: string) => ({
        label: 'Sürgü Değişkeni / Adı',
        placeholder: 'ör. a, α, aci',
        initial: ilkAd,
        onSubmitText: (ad: string) => bindAngleToSlider(ang.id, ad),
      });
      if (boundSlider) {
        const ad = boundSlider.variableName;
        maddeler.push(
          { id: 'canlandir-aci', label: sliderPlaying ? 'Animasyonu Durdur' : `Animasyonu Başlat (${ad})`, onSelect: () => toggleSliderPlayback() },
          { id: 'surguyu-degistir-aci', label: `Sürgü Değişkenini Değiştir (${ad})…`, prompt: surguAdiSor(ad) },
          { id: 'surgu-baglantisini-kaldir', label: 'Sürgü Bağlantısını Kaldır', onSelect: () => unbindAngleFromSlider(ang.id) },
        );
      } else {
        maddeler.push({ id: 'surguye-bagla-canlandir', label: 'Canlandır (Sürgüye Bağla)…', prompt: surguAdiSor('α') });
      }

      maddeler.push({ id: 'ic-dis-aci', label: 'İç açı / dış açı', onSelect: () => toggleAngleReflex(ang.id) });
      // Rozete tıklamak dışında garantili bir çıkış yolu: menüden de gizlenebilsin.
      maddeler.push({
        id: 'olc-aci-deger-gorunurluk',
        label: ang.showValue === false ? 'Açı değerini göster' : 'Açı değerini gizle',
        onSelect: () =>
          ang.showValue === false
            ? updateObject(ang.id, { showValue: true } as Partial<MathObject>, true)
            : hideMeasurement(ang.id, 'angle'),
      });
    }

    if (hedef.type === 'text') maddeler.push({ id: 'metni-duzenle', label: 'Metni düzenle…', onSelect: () => notuDuzenle(hedef) });
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
    if (hedef.type === 'measurement' && hedef.kind !== 'arc') maddeler.push({ id: 'olc-goster', label: hedef.showValue === false ? 'Ölçümü göster' : 'Ölçümü gizle', onSelect: () => updateObject(hedef.id, (hedef.showValue === false ? { showValue: true, hiddenRatios: undefined } : { showValue: false }) as Partial<MathObject>, true) });
    // Trig oranları ayrı etiketlerdir; tek tek gizlenenler buradan geri gelir
    if (hedef.type === 'measurement' && hedef.kind === 'trig' && hedef.showValue !== false && hedef.hiddenRatios?.length) {
      maddeler.push({ id: 'olcum-oranlar', label: 'Gizlenen oranları göster', onSelect: () => updateObject(hedef.id, { hiddenRatios: undefined } as Partial<MathObject>, true) });
    }

    // EŞİTLİK ÇENTİĞİ: parça, tıklanan çokgen kenarı, yay, dilim, yay ölçümü ve AÇI; çoklu seçimde "Eşit olarak işaretle"
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

    // İzi Göster: izi tutulabilen nesnede iz aç / kapat; iz varsa bu nesnenin ya da bütün izlerin temizlenmesi
    if (IZ_TUTAN_TURLER.has(hedef.type)) {
      maddeler.push({
        id: 'iz-birak',
        label: hedef.showTrace ? 'İzi Gizle (İz Açık)' : 'İzi Göster (İz Bırak)',
        separatorBefore: true,
        onSelect: () => updateObject(hedef.id, { showTrace: !hedef.showTrace } as Partial<MathObject>, true),
      });
    }
    const kendiIzi = !!traces[hedef.id];
    if (kendiIzi) maddeler.push({ id: 'izini-temizle', label: 'Bu Nesnenin İzini Temizle', separatorBefore: true, onSelect: () => clearTrace(hedef.id) });
    if (Object.keys(traces).length > 0) {
      maddeler.push({ id: 'izleri-temizle', label: 'Tüm İzleri Temizle', separatorBefore: !kendiIzi, onSelect: () => clearTraces() });
    }

    // "Sil" her nesne türünde bulunur. Delete tuşuyla aynı kümeyi siler: tıklanan nesne seçimin
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
    objectClipboard, viewport, addObjects, setSelectedObjectIds, setActiveTool, activeTool, commit, ilkokul,
    onEditFunction,
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

  /**
   * Daire dilimi / elipsin alan ya da çevre ölçüsü — tuvaldeki etiketle aynı hesap (yayOlculeri, elipsKartSatirlari).
   * Alanı Bul / Çevre Hesapla bildirimi değeri yazsın diye (denetim, 4. tur: dilimde "alanı etiketle gösterildi"
   * deniyor, sayı yazılmıyordu).
   */
  const egriOlcusu = (obj: MathObject, tur: 'area' | 'perimeter'): Olcu | null => {
    if (obj.type === 'sector') {
      const dilim = obj as SectorObject;
      const g = yayGeometrisi(dilim, noktaBul);
      if (!g) return null;
      const yalniz: SectorObject = {
        ...dilim, showArcLength: false, showRadius: false, showChordLength: false,
        showArea: tur === 'area', showPerimeter: tur === 'perimeter',
      };
      return yayOlculeri(yalniz, noktaBul, objects, g).find((x) => x.kind === tur)?.olcu ?? null;
    }
    if (obj.type === 'ellipse') {
      const elp = obj as EllipseObject;
      return elipsKartSatirlari(elp.radiusX, elp.radiusY, tur === 'area', tur === 'perimeter').olculer[0] ?? null;
    }
    return null;
  };

  /**
   * Tuvaldeki düğmeye basış. 'animate': sürgü oynatması değişir (play verilmişse yalnız o duruma geçilir) ve hedef
   * noktaların canlandırması açılır / kapanır; 'clearTraces': bütün izler silinir; 'setValue': hedef sürgüyse değeri
   * verilir. Diğer eylemler (göster / gizle, sürgüye değer) çalışma alanında yürür (runButton).
   */
  const dugmeyiCalistir = (dugme: ButtonObject) => {
    const eylem = dugme.action;
    if (eylem.kind === 'animate') {
      if (eylem.play === undefined || eylem.play !== sliderPlaying) toggleSliderPlayback();
      for (const id of eylem.targetIds ?? []) {
        const hedef = objects.find((n) => n.id === id);
        if (hedef?.type === 'point') updateObject(hedef.id, { animating: eylem.play ?? !hedef.animating } as Partial<MathObject>, true);
      }
    } else if (eylem.kind === 'clearTraces') {
      clearTraces();
    } else if (eylem.kind === 'setValue') {
      const hedef = objects.find((n) => n.id === eylem.targetId);
      if (hedef?.type === 'slider') handleSliderChange(hedef.id, eylem.value);
    } else {
      runButton(dugme.id);
    }
  };

  /** Çokgeni eksene göre yansıtır ve yansıtma seçimini (eksen, hedef çokgen) bitirir */
  const yansit = (cokgen: PolygonObject, eksen: { p1: Point2D; p2: Point2D; name: string }) => {
    reflectPolygonAcrossSymmetryLine(cokgen, eksen.p1, eksen.p2, eksen.name);
    setReflectAxisLine(null);
    setReflectTargetPolyId(null);
  };

  /**
   * Seç ve Taşı: basılan nesneyle seçim sürüklenmeye başlar. Grubun tutulan noktası (çapa) imleçle arasındaki farkı
   * korur; sürüklerken hedef konum ızgaraya oturur (fark değil).
   */
  const nesneSuruklemesineBasla = (nesne: MathObject, kimlikler: string[], world: Point2D) => {
    const capaKimligi = getAnchorId(nesne);
    const capa = getAnchorPosition(capaKimligi);
    setDraggingObjState({
      objectIds: kimlikler,
      startWorld: world,
      lastWorld: world,
      hasMoved: false,
      anchorId: capa ? capaKimligi : null,
      anchorOffset: capa ? { x: capa.x - world.x, y: capa.y - world.y } : { x: 0, y: 0 },
      virtualAnchor: capa,
    });
  };

  const handleObjectMouseDown = (e: React.MouseEvent, obj: MathObject) => {
    // El aracı (orta tuş / Alt) görünümü kaydırır: basış yutulmaz, nesne seçilmez (gorunumKaydirma.ts)
    if (!nesneBasisiIslenmeli(activeTool, e)) return;
    if (e.button !== 0) return; // Sadece sol tık
    e.stopPropagation();

    // PERGEL çizerken tıklama nesnenin üzerine gelebilir (çember, eksen, nokta…).
    // Burada durursak pergel adım atlamaz ve kullanıcının bir sonraki tıklaması
    // başlangıcı bambaşka bir yere koyar. Bu yüzden tıklamayı pergele iletiriz.
    if (activeTool === 'compass' && svgRef.current) {
      pergelAdimi(fareKonumu(e, svgRef.current, viewport).world);
      return;
    }

    if (activeTool === 'delete') {
      deleteObject(obj.id);
      return;
    }

    // Yay Ölç noktalarla çalışır: çembere (ya da başka bir şekle) tıklanınca yol göster
    if (activeTool === 'measure_arc' && obj.type !== 'point') {
      setHintMessage('Yay Ölç: Çemberin kendisine değil, üzerindeki NOKTALARA tıklayın.');
      return;
    }

    if (activeTool === 'measure_distance' || activeTool === 'unit_measure') {
      if (obj.type === 'arc' || obj.type === 'sector') { measureArcLength(obj.id); return; }
      if (obj.type === 'line' || obj.type === 'ray') { measureLength(obj.id); return; }
      // Ortaokulda Uzunluk Ölç de br yazar (tek birim; olcuYuvarlama.ts)
      const unit = activeTool === 'measure_distance' ? uzunlukOlcBirimi(kademe) : 'br';
      if (obj.type === 'segment') {
        const seg = obj as SegmentObject;
        const p1 = pointsById.get(seg.startPointId);
        const p2 = pointsById.get(seg.endPointId);
        if (p1 && p2) {
          // İpucu ortak yazım modelinden gelir: yuvarlanan değer '≈' alır ve ad görünmeyen
          // noktalarda düşer. Parçanın kendi `label` alanına '|AB|' YAZILMAZ; adlar her zaman
          // görünen nokta etiketlerinden okunur (yazım tasarımı, kural R1).
          const olcu = uzunluk(p1, p2, calculateDistance(p1, p2), { birim: unit });
          // Uzunluk yalnız showLength AÇIKSA çizilir (bağla/böl/kiriş parçalarında alan hiç yazılmaz): undefined
          // "zaten görünüyor" sayılırsa ölçüm açılmaz ama bildirim "(etikette gösteriliyor)" der (denetim, 4. tur)
          const zaten = seg.showLength === true && (seg.unit ?? 'br') === unit;
          if (!zaten) {
            commit(
              (prev) =>
                prev.map((o) => (o.id === seg.id ? ({ ...o, showLength: true, unit } as MathObject) : o)),
              `${olcuMetni(olcu, yazim)} ölçüldü`
            );
          }
          cancelPendingAction();
          // Araç her dokunuşta görünür bir sonuç verir (alan uzmanı, 4. tur)
          setHintMessage(olcumBildirimi(olcuMetni(olcu, yazim), zaten));
          return;
        }
      } else if (obj.type === 'polygon' && svgRef.current) {
        // ÇOKGEN KENARI seçilebilir (alan uzmanı, 4. tur: "kenara tıklayınca ölçüm yapılmıyor; yalnız iki köşe
        // seçilince çalışıyor"): tıklanan kenar, iki köşesine sırayla dokunulmuş gibi ölçülür.
        const poly = obj as PolygonObject;
        const kenar = enYakinKenar(poly, fareKonumu(e, svgRef.current, viewport).ekran);
        if (kenar === null) {
          setHintMessage('Ölçmek istediğiniz kenarın üzerine dokunun ya da kenarın iki köşesini seçin.');
          return;
        }
        const ilkId = poly.pointIds[kenar];
        const sonId = poly.pointIds[(kenar + 1) % poly.pointIds.length];
        const mevcut = objects.find(
          (o): o is SegmentObject =>
            o.type === 'segment' && olcumParcasiMi(o) && (o.unit ?? 'br') === unit &&
            ((o.startPointId === ilkId && o.endPointId === sonId) || (o.startPointId === sonId && o.endPointId === ilkId))
        );
        if (mevcut) {
          cancelPendingAction();
          setHintMessage(olcumBildirimi(olcuMetni(segmentUzunlugu(mevcut, noktaBul), yazim), true));
          return;
        }
        handlePointClick(sonId, undefined, [ilkId]);
        return;
      } else if (obj.type === 'point') {
        handlePointClick(obj.id);
        return;
      }
    }

    // ALANI BUL / ÇEVRE HESAPLA: her dokunuş görünür bir sonuç verir (alan uzmanı, 4. tur: "görünür yeni bir sonuç,
    // etiket veya bildirim üretmiyor"). Etiket kapalıysa şeklin ayrı, sürüklenebilir ölçü etiketi açılır; zaten
    // açıksa yeniden açılmaz, bildirim "(etikette gösteriliyor)" der ve etiket kısa süre vurgulanır.
    if (activeTool === 'measure_perimeter') {
      if (obj.type === 'sector' || obj.type === 'ellipse') {
        const zaten = !!(obj as EllipseObject).showPerimeter;
        measurePerimeter(obj.id);
        // Bildirim değeri de yazar ("Ç(IHJ dilimi) ≈ 17,85 br"); hesap etiketle aynı (egriOlcusu)
        const olcu = egriOlcusu(obj, 'perimeter');
        setHintMessage(olcu
          ? olcumBildirimi(olcuMetni(olcu, yazim), zaten)
          : zaten ? `${obj.label || 'Şeklin'} çevresi etikette gösteriliyor.` : `${obj.label || 'Şeklin'} çevresi etiketle gösterildi.`);
        return;
      }
      if (obj.type === 'polygon') {
        const poly = obj as PolygonObject;
        const polyPoints = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
        const zaten = poly.showPerimeter === true;
        // Kartla AYNI sayı: tam sayı açıkken çevre görünen kenarların toplamıdır, ilkokulda gerçek kenarların
        // toplamının yuvarlanmışı (cokgenKartSatirlari)
        const [cevreOlcusu] = cokgenKartSatirlari(polyPoints, false, true, yazim.tamSayi, ilkokul).olculer;
        if (!zaten) {
          commit(
            (prev) => prev.map((o) => (o.id === poly.id ? ({ ...o, showPerimeter: true } as MathObject) : o)),
            `${olcuMetni(cevreOlcusu, yazim)} hesaplandı`
          );
        } else kartiVurgula(poly.id, 'perimeter');
        setHintMessage(olcumBildirimi(olcuMetni(cevreOlcusu, yazim), zaten));
        return;
      } else if (obj.type === 'circle') {
        const olcu = cemberCevresi(yazim.tamSayi ? tamSayiCemberCevresi(cemberYaricapi(obj as CircleObject)).deger : calculateCircleCircumference(cemberYaricapi(obj as CircleObject)));
        const zaten = (obj as CircleObject).showPerimeter === true;
        if (!zaten) {
          commit(
            (prev) => prev.map((o) => (o.id === obj.id ? ({ ...o, showPerimeter: true } as MathObject) : o)),
            `${olcuMetni(olcu, yazim)} hesaplandı`
          );
        } else kartiVurgula(obj.id, 'perimeter');
        setHintMessage(olcumBildirimi(olcuMetni(olcu, yazim), zaten));
        return;
      }
    }

    if (activeTool === 'measure_area') {
      if (obj.type === 'sector' || obj.type === 'ellipse') {
        const zaten = !!(obj as EllipseObject).showArea;
        measureArea(obj.id);
        // Bildirim değeri de yazar ("A(IHJ dilimi) ≈ 9,82 br²"); hesap etiketle aynı (egriOlcusu)
        const olcu = egriOlcusu(obj, 'area');
        setHintMessage(olcu
          ? olcumBildirimi(olcuMetni(olcu, yazim), zaten)
          : zaten ? `${obj.label || 'Şeklin'} alanı etikette gösteriliyor.` : `${obj.label || 'Şeklin'} alanı etiketle gösterildi.`);
        return;
      }
      if (obj.type === 'polygon') {
        const poly = obj as PolygonObject;
        const polyPoints = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
        // Kartla AYNI sayı: tam sayı açıkken dikdörtgen/dik üçgen alanı görünen kenarlardan (cokgenKartSatirlari)
        const [alanOlcusu] = cokgenKartSatirlari(polyPoints, true, false, yazim.tamSayi).olculer;
        const zaten = poly.showArea === true;
        if (!zaten) {
          commit(
            (prev) => prev.map((o) => (o.id === poly.id ? ({ ...o, showArea: true } as MathObject) : o)),
            `${olcuMetni(alanOlcusu, yazim)} hesaplandı`
          );
        } else kartiVurgula(poly.id, 'area');
        setHintMessage(olcumBildirimi(olcuMetni(alanOlcusu, yazim), zaten));
        return;
      } else if (obj.type === 'circle') {
        const olcu = daireAlani(yazim.tamSayi ? tamSayiDaireAlani(cemberYaricapi(obj as CircleObject)).deger : calculateCircleArea(cemberYaricapi(obj as CircleObject)));
        const zaten = (obj as CircleObject).showArea === true;
        if (!zaten) {
          commit(
            (prev) => prev.map((o) => (o.id === obj.id ? ({ ...o, showArea: true } as MathObject) : o)),
            `${olcuMetni(olcu, yazim)} hesaplandı`
          );
        } else kartiVurgula(obj.id, 'area');
        setHintMessage(olcumBildirimi(olcuMetni(olcu, yazim), zaten));
        return;
      }
    }

    // DİK / PARALEL DOĞRU: önce bir doğru ya da doğru parçası seçilebilir (alan uzmanı, 4. tur: "hazır bir doğru
    // tıklanınca doğru seçilmiyor, tıklanan yerde istenmeyen yeni bir nokta (I) oluşuyor"). Çizginin iki tanım
    // noktası doğrultuyu verir; çizginin üstüne dokunmak nokta üretmez. Önce nokta seçildiyse çizgi onu tamamlar.
    if ((activeTool === 'perpendicular' || activeTool === 'parallel') && pendingPointIds.length < 2) {
      // Çokgenin kenarı da bir doğru parçasıdır (üçgende yükseklik: kenara, sonra karşı köşeye dokunulur). Kenar
      // seçilmezse eskiden tıklanan yerde kenarın üstüne yeni nokta açılıyordu (denetim, 4. tur).
      let dogrultu = dogrultuNoktalari(obj);
      let kenarMi = false;
      if (!dogrultu && obj.type === 'polygon' && svgRef.current) {
        const poly = obj as PolygonObject;
        const k = enYakinKenar(poly, fareKonumu(e, svgRef.current, viewport).ekran);
        if (k !== null) {
          dogrultu = [poly.pointIds[k], poly.pointIds[(k + 1) % poly.pointIds.length]];
          kenarMi = true;
        }
      }
      const p1 = dogrultu && pointsById.get(dogrultu[0]);
      const p2 = dogrultu && pointsById.get(dogrultu[1]);
      if (dogrultu && p1 && p2) {
        const ad = obj.type === 'segment' || kenarMi ? `[${p1.label}${p2.label}]` : `${p1.label}${p2.label} ${obj.type === 'ray' ? 'ışını' : 'doğrusu'}`;
        const tur = activeTool === 'perpendicular' ? 'dik' : 'paralel';
        const gecen = pendingPointIds.length === 1 ? pendingPointIds[0] : null;
        if (gecen && !dogrultu.includes(gecen)) {
          // Nokta önce seçildi: çizgi doğrultuyu verir, doğru hemen kurulur
          handlePointClick(gecen, undefined, [dogrultu[0], dogrultu[1]]);
          return;
        }
        // İki tanım noktası sırayla seçilmiş sayılır (bekleyen seçim halkaları doğrultuyu gösterir)
        handlePointClick(dogrultu[1], undefined, [dogrultu[0]]);
        setHintMessage(`${ad} seçildi. Şimdi ${tur} doğrunun geçeceği noktaya dokunun.`);
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

    // İlkokul Simetri Keşfet: her dokunuş şekli seçer ya da aday doğrunun ucunu koyar (uzman 4. tur [178])
    if (activeTool === 'symmetry' && ilkokul && svgRef.current) {
      simetri.tiklama(fareKonumu(e, svgRef.current, viewport).world, obj);
      return;
    }

    // Yansıt / Simetri: eksen (doğru parçası, doğru ya da ışın) ve yansıtılacak çokgen herhangi bir sırayla seçilir;
    // ikisi de seçilince yansıma çizilir. İlkokulda yalnız çokgen seçilir, simetri doğrusu seçili yöndedir.
    if (activeTool === 'reflect' || activeTool === 'symmetry') {
      if (dogrusalMi(obj)) {
        const [a, b] = tanimNoktalari(obj).map((id) => pointsById.get(id));
        if (a && b) {
          const eksen = { id: obj.id, p1: { x: a.x, y: a.y }, p2: { x: b.x, y: b.y }, name: obj.label || `${a.label}${b.label} Doğrusu` };
          const hedefKimligi = reflectTargetPolyId || selectedObjectId;
          const hedefCokgen = objects.find((o): o is PolygonObject => o.id === hedefKimligi && o.type === 'polygon');
          if (hedefCokgen) {
            yansit(hedefCokgen, eksen);
          } else {
            setReflectAxisLine(eksen);
            setHintMessage('Önce bir şekil seçin');
          }
          return;
        }
      } else if (obj.type === 'polygon') {
        setReflectTargetPolyId(obj.id);
        setSelectedObjectId(obj.id);
        if (ilkokul) ilkokulSimetrisiniCiz(obj, ilkokulSimetriYonu);
        else if (reflectAxisLine) yansit(obj, reflectAxisLine);
        return;
      }
    }

    if (activeTool === 'select') {
      const secim = clickSelection(selectedObjectIds, obj.id, e.shiftKey || e.ctrlKey);
      if (secim !== selectedObjectIds) setSelectedObjectIds(secim);
      if (!svgRef.current) return;
      nesneSuruklemesineBasla(obj, secim, fareKonumu(e, svgRef.current, viewport).world);
    } else if (obj.type === 'point') {
      handlePointClick(obj.id);
    } else if (NOKTA_URETEN_ARACLAR.includes(activeTool) && svgRef.current) {
      // Nokta üreten araçla ŞEKLE basılınca nokta şeklin kenarına konur: kesişimi işaretlemek ya da alanı bölmek için
      // nokta tam kenarda olmalı (şekil basışı yuttuğu için eskiden kenara nokta konamıyordu)
      handleCanvasClick(fareKonumu(e, svgRef.current, viewport).world);
    } else {
      setSelectedObjectId(obj.id);
    }
  };

  /**
   * 3B cismin izdüşümüne basış: cisim seçilir ve izdüşüm sürüklenmeye başlar. Shift/Ctrl ile cisim seçime eklenir ya da
   * seçimden çıkarılır ve 2B nesne seçimi korunur; yoksa 2B seçim bırakılır. El aracında basış görünümü kaydırır.
   */
  const handleSolidMouseDown = useCallback(
    (solid: Solid3DObject, e: React.MouseEvent) => {
      if (!nesneBasisiIslenmeli(activeTool, e)) return;
      e.stopPropagation();
      if (e.button !== 0) return;
      if (e.shiftKey || e.ctrlKey) {
        const seciliydi = selectedSolidIds.includes(solid.id) || selectedSolidId === solid.id;
        const secim = seciliydi ? selectedSolidIds.filter((id) => id !== solid.id) : [...selectedSolidIds, solid.id];
        // Çoklu seçim onSelectSolids ile verilir: ardından onSelectSolid çağrılsaydı (tek kimlikli liste kurar)
        // Shift/Ctrl ile kurulan seçim silinirdi
        if (onSelectSolids) onSelectSolids(secim);
        else onSelectSolid?.(secim.length > 0 ? secim[secim.length - 1] : null);
      } else {
        onSelectSolid?.(solid.id);
        onSelectSolids?.([solid.id]);
        setSelectedObjectId(null);
        setSelectedObjectIds([]);
      }
      if (!svgRef.current) return;
      setDraggingSolidState({ solidId: solid.id, startWorld: fareKonumu(e, svgRef.current, viewport).world, initialPos: { ...solid.position }, hasMoved: false });
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

  /**
   * İlkokulda çeyrek / yarım / tam dönüş düğmeleri şekli CANLANDIRARAK döndürür (uzman 4. tur [179]: açı bir dönme
   * miktarıdır, MAT.4.3.5): tam dönüşte şeklin bir tur dönüp aynı yere geldiği görülür. Bir dönüş sürerken yenisi
   * başlamaz; geçmişe tek kayıt yazılır.
   */
  const donusAnimasyonuRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (donusAnimasyonuRef.current !== null) cancelAnimationFrame(donusAnimasyonuRef.current);
  }, []);
  const donusuCanlandir = (obj: MathObject, veri: NonNullable<ReturnType<typeof donusVerisi>>, deg: number) => {
    if (donusAnimasyonuRef.current !== null) return;
    const elipsMi = obj.type === 'ellipse';
    const bas = elipsMi ? (obj as EllipseObject).rotation ?? 0 : 0;
    const ilk = veri.points.map((p) => ({ id: p.id, x: p.x, y: p.y }));
    const { x: cx, y: cy } = veri.pivot;
    const uygula = (aci: number) => {
      if (elipsMi) {
        updateObject(obj.id, { rotation: elipsDonusAcisi(bas, aci) } as Partial<MathObject>, false);
        return;
      }
      ilk.forEach((pt) => updateObject(pt.id, dondurulmusKonum(pt, { x: cx, y: cy }, aci), false));
    };
    const kayit = `${obj.label || 'Şekil'} ${ilkokulDonusAdi(deg)} döndürüldü`;
    const azHareket = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (azHareket || typeof requestAnimationFrame === 'undefined') {
      uygula(deg);
      recordHistory(kayit);
      return;
    }
    const sure = Math.min(1400, 350 * Math.max(1, Math.abs(deg) / 90));
    const t0 = performance.now();
    const adim = (t: number) => {
      const f = Math.min(1, (t - t0) / sure);
      uygula(f < 1 ? deg * (1 - Math.cos(Math.PI * f)) / 2 : deg);
      if (f < 1) {
        donusAnimasyonuRef.current = requestAnimationFrame(adim);
      } else {
        donusAnimasyonuRef.current = null;
        recordHistory(kayit);
      }
    };
    donusAnimasyonuRef.current = requestAnimationFrame(adim);
  };

  const rotateShapeByAngle = (obj: MathObject, deg: number) => {
    const veri = donusVerisi(obj);
    if (!veri) {
      setHintMessage('Bu şekil döndürülemiyor.');
      return;
    }
    if (ilkokul) {
      donusuCanlandir(obj, veri, deg);
      return;
    }
    if (obj.type === 'ellipse') {
      const elp = obj as EllipseObject;
      updateObject(elp.id, { rotation: elipsDonusAcisi(elp.rotation ?? 0, deg) } as Partial<MathObject>, false);
      recordHistory(`${obj.label || 'Şekil'} ${formatTurkishNumber(deg)}° döndürüldü`);
      return;
    }

    const { points, pivot } = veri;
    points.forEach((pt) => updateObject(pt.id, dondurulmusKonum(pt, pivot, deg), false));

    recordHistory(`${obj.label || 'Şekil'} ${formatTurkishNumber(deg)}° döndürüldü`);
  };

  /**
   * Döndürme kolundan serbest döndürme: kol pencere boyunca izlenir; şekil her harekette BAŞLANGIÇ konumundan yeniden
   * döndürülür (yuvarlama hatası birikmez), elips yalnız açısını değiştirir. Bırakınca dönüş sıfır değilse geçmişe tek
   * adım yazılır. El aracı bir görünüm aracıdır: kol da görünümü kaydırır, şekil dönmez (gorunumKaydirma.ts).
   */
  const handleStartRotateShape = (e: React.MouseEvent, obj: MathObject) => {
    if (!nesneBasisiIslenmeli(activeTool, e)) return;
    e.stopPropagation();
    e.preventDefault();
    const veri = donusVerisi(obj);
    if (!veri) return;
    const elipsMi = obj.type === 'ellipse';
    const ilkAci = elipsMi ? (obj as EllipseObject).rotation ?? 0 : 0;
    const ilkKonumlar = veri.points.map((p) => ({ id: p.id, x: p.x, y: p.y }));
    const merkez = { x: veri.pivot.x, y: veri.pivot.y };
    const merkezEkran = worldToScreen(merkez, viewport);
    const kutu = svgRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const ekranda = (olay: { clientX: number; clientY: number }) => ({ x: olay.clientX - kutu.left, y: olay.clientY - kutu.top });
    const bas = ekranda(e);
    let sonDerece = 0;

    const tasi = (olay: MouseEvent) => {
      const derece = serbestDonusDerecesi(bas, ekranda(olay), merkezEkran, { ilkokul, onBesli: olay.shiftKey });
      sonDerece = derece;
      setRotatingFeedback({ shapeId: obj.id, deg: derece });
      if (elipsMi) updateObject(obj.id, { rotation: elipsDonusAcisi(ilkAci, derece) } as Partial<MathObject>, false);
      else ilkKonumlar.forEach((k) => updateObject(k.id, dondurulmusKonum(k, merkez, derece), false));
    };
    const birak = () => {
      setRotatingFeedback(null);
      if (sonDerece !== 0) {
        recordHistory(`${obj.label || 'Şekil'} ${ilkokul ? ilkokulDonusAdi(sonDerece) : `${formatTurkishNumber(sonDerece)}°`} döndürüldü`);
      }
      window.removeEventListener('pointermove', tasi);
      window.removeEventListener('pointerup', birak);
    };
    window.addEventListener('pointermove', tasi);
    window.addEventListener('pointerup', birak);
  };

  // Yansıtma Fonksiyonu: Herhangi bir simetri doğrusuna (p1, p2) göre nesneyi yansıt
  const reflectPolygonAcrossSymmetryLine = (
    targetPoly: PolygonObject,
    p1: Point2D,
    p2: Point2D,
    axisName: string,
    secenek: { ek?: MathObject[]; aciklama?: string } = {}
  ) => {
    const polyPoints = targetPoly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];

    if (polyPoints.length < 3) return;

    // Her dönüşüm kendi adını alır: A' doluysa A'' (alan uzmanı, 4. tur: yansıma ve öteleme görüntülerinin ikisi de A')
    const adlar = goruntuNoktaAdlari(polyPoints.map((p) => p.label), existingPointLabels());
    const newPts: PointObject[] = polyPoints.map((p, i) => {
      const reflected = reflectPointAcrossLine({ x: p.x, y: p.y }, p1, p2);
      return { ...makePoint(adlar[i], reflected.x, reflected.y, NESNE_RENGI.mor), donusum: 'yansima' };
    });

    const symPoly = yansimaCokgeni(newPts.map((p) => p.id), targetPoly.label);

    addObjects(
      [...newPts, symPoly, ...(secenek.ek ?? [])],
      secenek.aciklama ?? `${targetPoly.label || 'Çokgen'}, ${axisName} eksenine göre yansıtıldı`
    );
  };

  /**
   * İlkokul yansıtması: simetri doğrusu şeklin yanına (dikey: sağ kenar, yatay: alt kenar; ızgara çizgisinde) kesikli
   * çizgiyle çizilir ve şeklin simetriği doğrunun öbür yanına eklenir. "x ekseni" yok (alan uzmanı, 3. sınıf).
   */
  const ilkokulSimetrisiniCiz = (poly: PolygonObject, yon: SimetriYonu) => {
    const koseler = poly.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
    if (koseler.length < 3) return;
    const { p1, p2 } = ilkokulSimetriDogrusu(koseler, yon);
    const [la, lb] = generateNextPointLabels(existingPointLabels(), 2);
    const uc1: PointObject = { ...makePoint(la, p1.x, p1.y, NESNE_RENGI.mor), showLabel: false, visible: false };
    const uc2: PointObject = { ...makePoint(lb, p2.x, p2.y, NESNE_RENGI.mor), showLabel: false, visible: false };
    const dogru: SegmentObject = {
      id: createId('seg'),
      type: 'segment',
      label: 'Simetri doğrusu',
      showLabel: false,
      startPointId: uc1.id,
      endPointId: uc2.id,
      color: NESNE_RENGI.mor,
      style: 'dashed',
      thickness: 2,
      visible: true,
      createdAt: Date.now(),
    };
    reflectPolygonAcrossSymmetryLine(poly, p1, p2, 'simetri doğrusu', {
      ek: [uc1, uc2, dogru],
      aciklama: `${poly.label || 'Şekil'}: simetri doğrusuna göre simetriği çizildi`,
    });
  };

  // İLKOKUL «SİMETRİ KEŞFET»: aday doğruyu katlayarak sınama (uzman 4. tur [178]; SimetriSinamaArayuzu.tsx)
  const simetri = useSimetriSinama({
    etkin: ilkokul && activeTool === 'symmetry',
    objects,
    pointsById,
    zoom: viewport.zoom,
    addObjects,
    yeniNokta: makePoint,
    noktaAdlari: existingPointLabels,
    kimlik: createId,
    sec: (id) => {
      setSelectedObjectId(id);
      setSelectedObjectIds([id]);
    },
  });
  // Ölçü etiketine dokunuş da aday ucu koyar (etiketi gizlemez): etiketler şeklin üstünde ve yanında durur
  simetriEtiketGecisiRef.current = simetri.etkin ? (w: Point2D) => simetri.tiklama(w) : null;

  // Zoom Hızlı Eylemleri (görünüm merkezi etrafında)
  const zoomIn = () => zoomAt(null, 1.2);
  const zoomOut = () => zoomAt(null, 1 / 1.2);

  /** Görünümü başlangıcına döndürür: köken ortada, varsayılan yakınlıkta */
  const centerOrigin = () => {
    setViewport((prev) => ({ ...prev, panX: 0, panY: 0, zoom: DEFAULT_ZOOM }));
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
  const secimRengi = koyuTema ? NESNE_SECIM_RENGI_KOYU_TEMA : NESNE_SECIM_RENGI;
  const tuvalZemini = useMemo(() => temaZemini(viewport.backgroundColor, koyuTema), [viewport.backgroundColor, koyuTema]);
  const zeminTonuDegeri = useMemo(() => zeminTonu(tuvalZemini), [tuvalZemini]);

  // Kökenin ekrandaki yeri (eksenler, ızgara ve bölge rozetleri buna göre çizilir)
  const originScreen = useMemo(() => worldToScreen({ x: 0, y: 0 }, viewport), [viewport]);

  // Eksen sayıları, çentikler ve +x / +y / -y rozetlerinin yerleşimi (eksenSayilari.ts): eksen ekran dışındayken
  // kenara yapışan sayılar sol panelin, "<" tutamacının, araç düğmelerinin, alt bilginin ve yakınlaştırma
  // düğmelerinin altına girmez; köşede birbirini ezmez.
  /**
   * Eksen çizgisinin YANINDA (üstünde değil: 2–24 px) duran görünen noktaların gövde kutuları (ekran px). Eksen sayısı
   * bunları örtmez. Tam eksen üstündeki noktalar sayılmaz: sayı çentiğin ötesinde durur, noktayı örtmez ve kaybolmasın.
   */
  const eksenYakiniNoktalar = useMemo(() => {
    if (!viewport.showAxes) return [];
    const kutular: { x: number; y: number; w: number; h: number }[] = [];
    const yaninda = (d: number) => d > 2 && d <= 24;
    for (const o of objects) {
      if (o.type !== 'point' || o.visible === false) continue;
      const pt = o as PointObject;
      const e = worldToScreen(pt, viewport);
      if (!yaninda(Math.abs(e.y - originScreen.y)) && !yaninda(Math.abs(e.x - originScreen.x))) continue;
      const r = (pt.size || styleSettings.pointRadius) + 1;
      kutular.push({ x: e.x - r, y: e.y - r, w: 2 * r, h: 2 * r });
    }
    return kutular;
  }, [objects, viewport, originScreen, styleSettings.pointRadius]);
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
      xCentikleri: hazirla(gridLines.xKonumlari, (d) => worldToScreen({ x: d, y: 0 }, viewport).x, viewport.width),
      yCentikleri: hazirla(gridLines.yKonumlari, (d) => worldToScreen({ x: 0, y: d }, viewport).y, viewport.height),
      adim: gridInfo.step,
      yaziBoyu: fs(11, 'axis'),
      // Eksenin hemen yanındaki görünen noktalar da engeldir: üstüne düşen sayı ("-3") noktayı örtmesin, yazılmaz
      // (denetim, 4. tur: eksenin hemen altındaki kesişim noktası F sayının arkasında kalıyordu)
      engeller: [...tuvalEngelleri(viewport.width, viewport.height, { cisimSecici: toplamCisim > 0 }), ...eksenYakiniNoktalar],
    });
  }, [viewport, originScreen, gridLines, gridInfo.step, fs, toplamCisim, eksenYakiniNoktalar]);

  // FONKSİYON GRAFİĞİ ETİKETLERİ (alan uzmanı, 4. tur, satır 157: "f(x) = 2x + 1"): etiketler birbirine, tuvalin
  // düğmelerine, eksen çizgisine ve sayılarına, +x / +y / -y ve (0; 0) rozetlerine, noktalara, sürgülere, yazılara
  // ve grafik çizgilerine değmez (fonksiyonEtiketi.ts). Denetim: sağ kenardaki "+x" rozeti etiketin üstüne biniyordu.
  const fonksiyonEtiketleri = useMemo(() => {
    const sonuc = new Map<string, FonksiyonEtiketYeri & { metin: string; px: number }>();
    if (isSade) return sonuc;
    const cizimler = [...fonksiyonCizimleri.values()];
    const cizgiler = cizimler.flatMap((c) => c.parcalar.flat());
    // Düğmeler, eksen çizgisi / sayıları / rozetleri ve nesnelerin kutuları (noktalar adlarıyla, sürgüler, yazılar…)
    const engeller = fonksiyonEtiketiEngelleri(
      { genislik: viewport.width, yukseklik: viewport.height },
      eksenYerlesimi,
      tuvalEngelleri(viewport.width, viewport.height, { cisimSecici: toplamCisim > 0 }),
      surguEngelleri(objects, viewport)
    );
    const px = fs(13, 'label') * yaziOlcegi;
    for (const { fn, parcalar } of cizimler) {
      if (fn.showLabel === false) continue;
      const metin = fonksiyonEtiketiYazimi(fn);
      const yer = fonksiyonEtiketYeri(
        parcalar,
        { genislik: viewport.width, yukseklik: viewport.height },
        { w: metin.length * px * 0.56 + 4, h: px },
        engeller,
        cizgiler
      );
      if (!yer) continue;
      engeller.push(yer.kutu);
      sonuc.set(fn.id, { ...yer, metin, px });
    }
    return sonuc;
  }, [fonksiyonCizimleri, objects, viewport, isSade, fs, yaziOlcegi, toplamCisim, eksenYerlesimi]);
  // Sayıların zemin renginde halesi: ızgara çizgileri ve şekiller üstünde okunur kalır (özel zemin, koyu tema, zemin-acik)
  const eksenSayiHalesi = {
    stroke: tuvalZemini || 'hsl(var(--background))',
    strokeWidth: eksenSayisiHaleKalinligi(styleSettings),
    strokeLinejoin: 'round' as const,
    paintOrder: 'stroke',
  };

  /**
   * Bir nesnenin tuvaldeki grubunun olayları (her katmanda aynı): basış ve sürükleme, sağ tık menüsü, dokunmatikte uzun
   * basış (kaymada iptal). data-object-id seçimin, sağ tık hedefinin ve testlerin kullandığı nesne kimliğidir.
   */
  const nesneOlaylari = (nesne: MathObject) => ({
    onPointerDown: (e: React.PointerEvent) => handleObjectMouseDown(e, nesne),
    'data-object-id': nesne.id,
    onContextMenu: (e: React.MouseEvent) => openContextMenu(e, nesne),
    onTouchStart: (e: React.TouchEvent) => handleTouchStartOnObject(e, nesne),
    onTouchMove: cancelLongPress,
    onTouchEnd: () => cancelLongPress(),
    onTouchCancel: () => cancelLongPress(),
  });
  /** Belirli türdeki görünür nesneler (katman çizim işlevlerinin girdisi) */
  const gorunenler = <T extends MathObject>(tur: T['type']) => objects.filter((n): n is T => n.type === tur && n.visible);
  const serbestBaglam: SerbestKatmanBaglami = {
    viewport,
    seciliMi: (id) => selectedObjectIds.includes(id),
    secimRengi,
    imlec: imlecSinifi(activeTool, 'nesne'),
    olaylar: nesneOlaylari,
    etiketOlcegi,
    yaziOlcegi,
    yaziBoyu: fs,
    olcuEtiketi: metinOlcuEtiketi,
    olculerGorunur: showDetails,
    etiketDonusumu: etiketOlcekDonusumu,
    notuDuzenle,
  };

  /**
   * Çokgenin i. kenarının uzunluk yazısı: kenarın ortasında, çokgenin DIŞINA doğru (ağırlık merkezinden uzaklaşan dik
   * yönde) ve kenara PARALEL. Eşitlik çentiği kenarın ortasındadır, yazı çentiğin ucuna değmez; işaretler açıkken bütün
   * kenar yazıları aynı payla durur (çentik gelip gidince yazı sıçramaz). Geçersiz kenar numarası çizilmez.
   */
  const kenarUzunluguEtiketi = (cokgen: PolygonObject, koseler: PointObject[], ekran: Point2D[], merkez: Point2D, i: number) => {
    if (i < 0 || i >= koseler.length) return null;
    const j = (i + 1) % koseler.length;
    const yazi = cizgiYazimi(kenarUzunlugu(koseler, i));
    const orta = worldToScreen({ x: (koseler[i].x + koseler[j].x) / 2, y: (koseler[i].y + koseler[j].y) / 2 }, viewport);
    const n = distaKalanNormal(ekran[i], ekran[j], orta, merkez);
    const centik = esitlik.isaretHaritasi.get(esitlik.temsilci.get(`edge:${cokgen.id}:${i}`) ?? '');
    const centikPayi = centik || esitlik.otomatik ? etiketPayi(centik?.kalinlik ?? 2, styleSettings.strokeScale, 12) : 0;
    const aralik = (yazi.kisaKutu.yukseklik / 2 + 12 + centikPayi) * kutuOlcegi;
    const yer = { x: orta.x + n.x * aralik, y: orta.y + n.y * aralik };
    const etiket = cizgiEtiketiniYerlestir(yazi, cokgen.id, edgeLabelKey(i), ekran[i], ekran[j], yer);
    return (
      <g key={`kenar-${cokgen.id}-${i}`} {...olcumEtiketi(cokgen.id, edgeLabelKey(i), true, etiket)} className="select-none">
        <MatematikEtiketi
          olcek={yaziOlcegi}
          satirlar={etiket.satirlar}
          x={yer.x}
          y={yer.y}
          px={fs(11, 'measure')}
          renk="on"
          kutu={{ dolgu: '#ffffff', dolguOpakligi: 0.92, cizgi: cokgen.color || NESNE_RENGI.zumrut, cizgiKalinligi: 1.2, sinif: 'dark:fill-card' }}
          kutuGizli={!styleSettings.showLabelBoxes}
          donmeAcisi={etiket.donmeAcisi}
          olcu={etiket.olcu}
          sesli={etiket.sesli}
          ipucu={etiket.ipucu}
        />
      </g>
    );
  };

  /**
   * Çokgenin alan ya da çevre kartı. MEB yazımı: A(ABC) = 11 br² ve Ç(ABC) ≈ 16,3 br AYRI kartlardır; ad köşelerden
   * kurulur (kurulamazsa 'Alan = …'). Kutu ölçüsü ve yeri ön geçişten gelir (kartKutulari; açı ve yay rozetleri bunları
   * engel sayar). Her kart kendi anahtarıyla taşınır ve tıklanınca gizlenir; vurgulanan kart kalın çerçeveyle yanıp söner.
   */
  const cokgenKarti = (cokgen: PolygonObject, kart: OlcumKarti) => {
    const vurgulu = kartVurguluMu(cokgen.id, kart.anahtar);
    const et = olcumEtiketi(cokgen.id, kart.anahtar, true, serbestEtiketYeri(cokgen.id, kart.anahtar, kart.merkez, kart.olcu, kart.duz));
    return (
      <g key={`kart-${kart.anahtar}`} {...et} data-measurement={kart.anahtar} className="drop-shadow-sm select-none">
        <MatematikEtiketi
          olcek={yaziOlcegi}
          satirlar={kart.satirlar}
          x={kart.merkez.x}
          y={kart.merkez.y}
          px={fs(11, 'measure')}
          renk="on"
          kutu={{ dolgu: '#ffffff', dolguOpakligi: 0.92, cizgi: cokgen.color || NESNE_RENGI.zumrut, cizgiKalinligi: vurgulu ? 2.5 : 1.2, rx: 8, sinif: `shadow-sm dark:fill-card${vurgulu ? ' animate-pulse' : ''}` }}
          kutuGizli={!styleSettings.showLabelBoxes && !vurgulu}
          olcu={kart.olcu}
          sesli={kart.sesli}
          ipucu={kart.ipucu}
        />
      </g>
    );
  };

  /**
   * Doğru parçasının uzunluk yazısı: parçaya PARALEL döner ve parçanın yanında durur (üzerinde dursa parçayı ortasından
   * sürüklemek isteyen yazıyı yakalardı). Alt yanda (dikeyde solda) durur, dik uzaklığı her açıda aynıdır; eşitlik
   * çentiği varsa kalın çizgide uzayan çentiğe değmeyecek kadar açılır. Açı her çizimde uçlardan hesaplanır: parça ya da
   * bir ucu taşınınca yazı yeni doğrultuya kendiliğinden uyar.
   */
  const parcaUzunluguEtiketi = (parca: SegmentObject, s1: Point2D, s2: Point2D) => {
    const yazi = cizgiYazimi(segmentUzunlugu(parca, noktaBul));
    const n = yukariNormal(s1, s2);
    const centik = esitlik.isaretHaritasi.get(esitlik.temsilci.get(`seg:${parca.id}`) ?? '');
    const centikPayi = centik || esitlik.otomatik ? etiketPayi(centik?.kalinlik ?? (parca.thickness || 2.5), styleSettings.strokeScale, 14) : 0;
    const aralik = (yazi.kisaKutu.yukseklik / 2 + 14 + centikPayi) * kutuOlcegi;
    const yer = { x: (s1.x + s2.x) / 2 - n.x * aralik, y: (s1.y + s2.y) / 2 - n.y * aralik };
    const etiket = cizgiEtiketiniYerlestir(yazi, parca.id, 'length', s1, s2, yer);
    return (
      <g {...olcumEtiketi(parca.id, 'length', true, etiket)}>
        <MatematikEtiketi
          olcek={yaziOlcegi}
          satirlar={etiket.satirlar}
          x={yer.x}
          y={yer.y}
          px={fs(11, 'measure')}
          renk="on"
          kutu={{ sinif: 'fill-background/95 stroke-border/80 shadow-sm' }}
          kutuGizli={!styleSettings.showLabelBoxes}
          donmeAcisi={etiket.donmeAcisi}
          olcu={etiket.olcu}
          sesli={etiket.sesli}
          ipucu={etiket.ipucu}
        />
      </g>
    );
  };

  /**
   * Doğrunun denklemi: metni değişmez, ölçü yazımıyla çizilir (yazı boyuyla ölçeklenir, hale okunur kılar). Yeri ön
   * geçişten gelir (denklemYerleri: nokta adlarına ve diğer denklemlere değmez); yoksa ikinci noktanın sağ üstündedir.
   */
  const denklemEtiketi = (dogru: LineObject, p1: PointObject, p2: PointObject) => {
    const denklem = calculateLineEquation(p1, p2).equationText;
    const satirlar = [metniCozumle(denklem, yazim)];
    const px = fs(11, 'measure');
    const kutu = kutuOlcusu(satirlar, px, { yatay: 0 });
    const b = worldToScreen(p2, viewport);
    const yer = denklemYerleri.get(dogru.id) ?? {
      x: b.x + (12 + kutu.genislik / 2) * kutuOlcegi,
      y: b.y - (8 + kutu.yukseklik / 2) * kutuOlcegi,
    };
    return <MatematikEtiketi olcek={yaziOlcegi} satirlar={satirlar} x={yer.x} y={yer.y} px={px} renk="on" kutu={null} hale olcu={kutu} sesli={metniSeslendir(denklem)} ipucu={denklem} />;
  };

  /**
   * Doğru ve ışının |AB| yazısı: tanım noktalarının ortasında, doğruya PARALEL, alt yanda (dikeyde solda). Mutlak değer
   * çizgileri ÇİZGİ olarak çizilir (Manrope'ta '|' büyük I'ya benzer, 'IABI' okunuyordu). Pay kutu yarı boyu + 12 px:
   * alt sınırla büyüyen kutu doğruya binmez.
   */
  const tanimUzunluguEtiketi = (nesne: LineObject | RayObject, p1: PointObject, p2: PointObject) => {
    const a = worldToScreen(p1, viewport);
    const b = worldToScreen(p2, viewport);
    const n = yukariNormal(a, b);
    const olcu = uzunluk(p1, p2, calculateDistance(p1, p2));
    const yazi = cizgiYazimi(olcu);
    const aralik = (yazi.kisaKutu.yukseklik / 2 + 12) * kutuOlcegi;
    const yer = { x: (a.x + b.x) / 2 - n.x * aralik, y: (a.y + b.y) / 2 - n.y * aralik };
    const etiket = cizgiEtiketiniYerlestir(yazi, nesne.id, 'length', a, b, yer);
    return (
      <g {...olcumEtiketi(nesne.id, 'length', true, etiket)} data-measurement="length">
        <MatematikEtiketi
          olcek={yaziOlcegi}
          satirlar={etiket.satirlar}
          x={yer.x}
          y={yer.y}
          px={fs(11, 'measure')}
          renk="on"
          kutu={null}
          hale
          donmeAcisi={etiket.donmeAcisi}
          sesli={sesli(olcu, yazim)}
          ipucu={aciklama(olcu, yazim)}
        />
      </g>
    );
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
            title={ilkokul ? 'Seç ve Taşı' : 'Seç ve Taşı (V)'}
            className={`relative w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border shadow-sm backdrop-blur-md transition-colors cursor-pointer ${
              activeTool === 'select'
                ? 'bg-primary border-primary text-primary-foreground'
                : 'bg-card/95 border-border text-foreground hover:bg-accent'
            }`}
          >
            <MousePointer className="w-5 h-5" />
            {/* İlkokulda kısayol harfi gösterilmez (kısayol çalışır) */}
            {!ilkokul && <kbd className="absolute bottom-0.5 right-1 text-[8px] leading-none opacity-75">V</kbd>}
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

        {/* Sağ Alan: 3B cisim gösterimi (varsa) ve 2D / 3D geçişi (3B tuvaldekiyle birebir aynı anahtar) */}
        <div className="flex items-center gap-2 pointer-events-auto">

          {/* 3B cisimlerin 2B gösterimi (üstten görünüm) anahtarı: yalnız sahnede cisim varken (uzman 4. tur [175]) */}
          {onCisimIzdusumuDegis && toplamCisim > 0 && (
            <button
              type="button"
              onClick={onCisimIzdusumuDegis}
              aria-pressed={cisimIzdusumu}
              data-cisim-izdusumu-anahtari=""
              title={cisimIzdusumu ? '3B cisimlerin üstten görünümünü gizle' : '3B cisimlerin üstten görünümünü göster'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border shadow-md backdrop-blur-md text-xs font-extrabold transition-colors cursor-pointer ${
                cisimIzdusumu ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-card/95 border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {cisimIzdusumu ? <Eye className="w-3.5 h-3.5" aria-hidden="true" /> : <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />}
              <span>3B cisimler</span>
              <span className="font-mono">{toplamCisim}</span>
            </button>
          )}
          <div className="flex items-center p-1 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-md" role="group" aria-label="2D / 3D görünüm">
            <button
              type="button"
              aria-pressed="true"
              title="2D çizim düzlemi (açık)"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-ada-deniz to-ada-vurgu text-primary-foreground shadow-sm cursor-default"
            >
              <Grid3x3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>2D</span>
            </button>
            <button
              type="button"
              onClick={onSwitchTo3D}
              aria-pressed="false"
              title="3D uzaya geç"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            >
              <Box className="w-3.5 h-3.5" aria-hidden="true" />
              <span>3D</span>
            </button>
          </div>
        </div>
      </div>

      <ToolCursor tool={activeTool} surfaceRef={svgRef} />

      <svg
        ref={svgRef}
        data-workspace-canvas="2d"
        className="w-full h-full block transition-colors duration-200"
        // --etiket-hale: kutusuz ölçü yazılarının halesi tuvalin gerçek zemin rengiyle çizilir (MatematikEtiketi)
        style={{ backgroundColor: tuvalZemini || 'transparent', touchAction: 'none', ...(zeminTonuDegeri ? { '--etiket-hale': tuvalZemini } : {}) } as React.CSSProperties}
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
        <CanvasLayers>
        <defs>
          {/* saturate=0: parlaklığı koruyarak renkleri gri tona indirger */}
          <filter id="geoeba-siyah-beyaz" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>

        {/* Zemin: tuvalin rengi; basış hedefi olarak boş alan sayılır (id: grid-background) */}
        <rect id="grid-background" x={0} y={0} width="100%" height="100%" fill={tuvalZemini || 'transparent'} />

        {/* 1. ZEMİN: ızgara (noktalı, izometrik ya da kareli), dört bölge rozetleri ve eksenler (katmanlar/izgaraVeEksenler.tsx) */}
        {viewport.showGrid && viewport.gridStyle === 'noktali' && noktaliIzgara(viewport, gridInfo.step, originScreen)}
        {viewport.showGrid && viewport.gridStyle === 'izometrik' && izometrikIzgara(viewport, gridInfo.step, originScreen)}
        {viewport.showGrid && (viewport.gridStyle ?? 'kareli') === 'kareli' && kareliIzgara(viewport, gridLines)}
        {viewport.showQuadrants && viewport.showAxes && !isSade && bolgeRozetleri(viewport, originScreen, fs)}
        {viewport.showAxes && eksenler(viewport, originScreen, eksenYerlesimi, fs, eksenSayiHalesi)}

        {/* 2.5 İZLER KATMANI (İzi Göster; katmanlar/noktalarVeIzler.tsx): ize sağ tık "Bu izi sil" menüsünü açar */}
        {izKatmani(traces, viewport, (e, izId) => setContextTarget({ obj: null, x: e.clientX, y: e.clientY, edgeIndex: null, izId }))}

        {/* 3. FONKSİYON GRAFİKLERİ KATMANI: yol ve etiket yeri ön geçişten gelir (fonksiyonCizimleri, fonksiyonEtiketleri).
             Seçili grafik doğru parçası gibi seçim renginde ve kalın; ad / denklem etiketi grafiğin rengiyle, zemin
             halesiyle yazılır ve tıklanınca grafik seçilir. */}
        {objects
          .filter((o): o is FunctionObject => o.type === 'function' && o.visible)
          .map((fn) => {
            const cizim = fonksiyonCizimleri.get(fn.id);
            if (!cizim) return null;
            const secili = selectedObjectIds.includes(fn.id);
            const renk = secili ? secimRengi : fn.color || NESNE_RENGI.mavi;
            const etiket = fonksiyonEtiketleri.get(fn.id) ?? null;
            return (
              <g key={fn.id} className={`function-plot ${imlecSinifi(activeTool, 'nesne')}`} {...nesneOlaylari(fn)}>
                <path d={cizim.d} fill="none" stroke="transparent" strokeWidth={14} />
                <path d={cizim.d} fill="none" stroke={renk} strokeWidth={(fn.thickness || 2.5) + (secili ? 1.5 : 0)} strokeLinecap="round" strokeLinejoin="round" />
                {etiket && (
                  <text
                    data-fonksiyon-etiketi={fn.id}
                    x={etiket.x}
                    y={etiket.y}
                    textAnchor={etiket.anchor}
                    fontSize={etiket.px}
                    fill={renk}
                    stroke={tuvalZemini || 'hsl(var(--background))'}
                    strokeWidth={3}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    className="font-bold select-none"
                  >
                    {etiket.metin}
                  </text>
                )}
              </g>
            );
          })}

        {/* 4. ÇOKGENLER KATMANI: gövde, kenar uzunlukları (sağ tık menüsünden tek tek ya da toplu açılır), alan / çevre
             kartları ve seçili çokgende döndürme paleti (yalnız seçili şekilde: her çokgen palet çizse ekran okunmazdı) */}
        {objects
          .filter((o): o is PolygonObject => o.type === 'polygon' && o.visible)
          .map((cokgen) => {
            const koseler = cokgen.pointIds.map((id) => pointsById.get(id)).filter((k): k is PointObject => !!k);
            if (koseler.length < 3) return null;
            const ekran = koseler.map((k) => worldToScreen(k, viewport));
            const merkez = agirlikMerkezi(ekran);
            const secili = selectedObjectIds.includes(cokgen.id);
            const kartlar = (cokgen.showArea || cokgen.showPerimeter) && showDetails ? kartHaritasi.get(cokgen.id) ?? [] : [];
            return (
              <g key={cokgen.id} {...nesneOlaylari(cokgen)} className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}>
                <polygon
                  points={ekran.map((k) => `${k.x},${k.y}`).join(' ')}
                  fill={cokgen.fillColor || cokgen.color || NESNE_RENGI.zumrut}
                  fillOpacity={styleSettings.hideFills ? 0 : cokgen.fillOpacity || 0.15}
                  stroke={secili ? secimRengi : cokgen.color || NESNE_RENGI.zumrut}
                  strokeWidth={sw(secili ? 3 : 2)}
                  className="transition-colors"
                />
                {showDetails && (cokgen.edgeLabels || []).map((i) => kenarUzunluguEtiketi(cokgen, koseler, ekran, merkez, i))}
                {kartlar.map((kart) => cokgenKarti(cokgen, kart))}
                {activeTool === 'rotate' && secili && (
                  <RotateGizmo
                    center={merkez}
                    feedbackDeg={rotatingFeedback?.shapeId === cokgen.id ? rotatingFeedback.deg : null}
                    onFreeRotateStart={(e) => handleStartRotateShape(e, cokgen)}
                    onRotate={(deg) => rotateShapeByAngle(cokgen, deg)}
                    ilkokul={ilkokul}
                    stil={styleSettings}
                    olcek={yaziOlcegi}
                  />
                )}
              </g>
            );
          })}

        {/* 4.1 3D KATI CİSİMLER KATMANI (Küp, Prizma, Silindir, Koni, Piramit, Küre). Bilgi satırları önce hepsi
            birlikte yerleştirilir (rozetleriYerlestir): biri ötekinin, bir cismin ya da ölçü etiketinin üstüne binmez. */}
        {cisimIzdusumu && solids && solids.length > 0 && (() => {
          const izdusumler = solids.map((solid) => {
            const isSelected = selectedSolidIds.includes(solid.id) || selectedSolidId === solid.id;
            return { solid, isSelected, proj: projectSolidFor2D(solid, viewport, isSelected, 'top', kutuOlcegi) };
          });
          // Başlangıçta yalnız ad. İlkokulda taban alanı, hacim ve harfli ölçüler açılmaz.
          const yalnizAd = cisimIzdusumuYalnizAd(kademe);
          const cisimYaziBoyu = fs(11, 'measure');
          const satirlar = new Map(izdusumler.map(({ solid, proj }) => [solid.id, cisimBilgiEtiketi(cisimBilgiSatiri(proj, { yalnizAd: yalnizAd || !cisimIzdusumOlcumleri[solid.id] }), cisimYaziBoyu)]));
          const satirYerleri = showDetails
            ? rozetleriYerlestir(
                izdusumler.map(({ solid, proj }) => ({
                  id: solid.id,
                  govde: izdusumGovdesi(proj),
                  kenarlar: yalnizAd || !cisimIzdusumOlcumleri[solid.id] ? [] : kenarEtiketKutulari(proj, yaziOlcegi, cisimYaziBoyu),
                  w: satirlar.get(solid.id)!.olcu.genislik * yaziOlcegi,
                  h: satirlar.get(solid.id)!.olcu.yukseklik * yaziOlcegi,
                })),
                8 * kutuOlcegi,
                { w: viewport.width, h: viewport.height },
                // Tuvalin üstündeki düğmeler (araçlar, 2D/3D ve cisim anahtarı, alt bilgi, yakınlaştırma) de engeldir
                tuvalEngelleri(viewport.width, viewport.height, { cisimSecici: true }),
              )
            : new Map<string, { x: number; y: number }>();
          return (
          <g id="layer-solids-3d">
            {izdusumler.map(({ solid, isSelected, proj }) => {
              return (
                <g
                  key={solid.id}
                  id={`solid-${solid.id}`}
                  className={`group ${imlecSinifi(activeTool, 'cisim')}`}
                  data-solid-id={solid.id}
                  onPointerDown={(e) => handleSolidMouseDown(solid, e)}
                  onContextMenu={(e) => {
                    // Boş alan menüsü yerine cismin kendi ölçme / silme menüsü.
                    e.preventDefault();
                    e.stopPropagation();
                    setContextTarget(null);
                    setCisimMenusu({ solidId: solid.id, ad: solid.name, x: e.clientX, y: e.clientY });
                  }}
                >
                  {/* ÜSTTEN GÖRÜNÜM ve (ölçüleri açıksa) kenar / yarıçap ölçüleri (katmanlar/cisimUstGorunumu.tsx). İlkokulda
                      harfli ölçü ("a = 3 br") gösterilmez. Hacimli "3D izdüşüm" kipi 8 Ekim 2026'da kaldırıldı: 3B tuval ve
                      küpün ÜST/ÖN/SAĞ görünümleri aynı işi görüyor. */}
                  {proj.topView && (
                    <g id={`solid-topview-${solid.id}`}>
                      {cisimUstGorunumu(proj.topView, solid.color || NESNE_RENGI.mavi, isSelected ? secimRengi : solid.color || NESNE_RENGI.mavi, isSelected)}
                      {showDetails && !yalnizAd && cisimIzdusumOlcumleri[solid.id] &&
                        cisimOlcuEtiketleri(proj.topView, cisimYaziBoyu, yaziOlcegi, !styleSettings.showLabelBoxes)}
                    </g>
                  )}

                  {/* 5. Cisim Bilgi Satırı: cismin yanında TEK satır ("Küp 1 · Taban alanı = 9 br² · V = 27 br³");
                      yeri rozetleriYerlestir'den (uzman 4. tur [175]: başlık ve alt alta kutular birbirine biniyordu). */}
                  {showDetails && satirYerleri.has(solid.id) && (() => {
                    const yer = satirYerleri.get(solid.id)!;
                    const satir = satirlar.get(solid.id)!;
                    const cerceve = isSelected ? secimRengi : solid.color || NESNE_RENGI.mavi;
                    return (
                      <g
                        data-canvas-label=""
                        data-cisim-bilgisi={solid.id}
                        className="select-none pointer-events-none"
                      >
                        <MatematikEtiketi
                          {...satir}
                          x={yer.x}
                          y={yer.y}
                          px={cisimYaziBoyu}
                          olcek={yaziOlcegi}
                          renk="on"
                          kutu={{ dolgu: '#ffffff', dolguOpakligi: 0.92, cizgi: cerceve, cizgiKalinligi: isSelected ? 2.5 : 1.2, rx: 8, sinif: 'shadow-sm dark:fill-card' }}
                          kutuGizli={!styleSettings.showLabelBoxes}
                        />
                      </g>
                    );
                  })()}
                </g>
              );
            })}
          </g>
          );
        })()}

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
            // Arada nokta ya da kesen çizgi varsa ya da aralık çizili değilse kesikli ölçü çizgisiyle çizilir ki hangi
            // aralığın ölçüldüğü görülsün (kapsayan, daha uzun ölçüm bir kat dışarıda durur); yoksa çizginin yanında
            // yalın durur (partialLengths.olcuCizgisiGerekli). Bu dal trig'den ÖNCE olmalı: trig üç nokta bekler.
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
              const yariUzanim = yazi.kisaKutu.yukseklik / 2;
              const renk = m.color || '#0f766e';
              // KESİKLİ ÇİZGİ YALNIZ GEREKTİĞİNDE (kullanıcı, 2026-09-25: "araya doğru girmeyince kesikli çizgiye gerek
              // yok"): ölçülen aralığın içinde nokta ya da onu kesen çizgi yoksa etiket, parça uzunluğu gibi çizginin
              // hemen yanında (yakın bant) yalın durur. Karar ve katlar: partialLengths.distanceLabelLayouts.
              const yerlesim = mesafeYerlesimleri.get(m.id) ?? { kesikli: true, kat: 0 };
              // Yakın bant (yalın etiket): parçanın kendi uzunluk etiketiyle aynı aralık (yarı kutu + 14 px), öbür yanda.
              // İlk kesikli kat çizgiden ve uç nokta harflerinden ~26 px açıkta durur; her kat bir öncekinin dış kenarını
              // 4 px aşar. Yakın bantta yalın bir etiketle örtüşen ölçü çizgisi en az 1. kattadır: bandın dışından başlar.
              const esitlikAcik = esitlik.otomatik || esitlik.isaretler.length > 0;
              const yakinAralik = (yariUzanim + 14
                + (esitlikAcik ? etiketPayi(2.5, styleSettings.strokeScale, 14) : 0)) * kutuOlcegi;
              // Uzunluğu gösterilen çokgen kenarının üzerindeyse kenar etiketi (çokgenin dışında, yarı kutu + 12 px)
              // yukarı yanda olabilir: yalın etiket öbür yana geçer, kesikli çizgi kenar etiketinin dışından başlar.
              const kenarYani = mesafeKenarYanlari.get(m.id);
              const kenarUstte = !!kenarYani && kenarYani.x * nx - kenarYani.y * ny > 0;
              const kenarEtiketiDisi = 2 * yariUzanim + 12 + (esitlikAcik ? etiketPayi(2, styleSettings.strokeScale, 12) : 0);
              const ilkKatAraligi = Math.max(26 + yariUzanim, kenarUstte ? kenarEtiketiDisi + 4 + yariUzanim : 0) * kutuOlcegi;
              let ex: number, ey: number;
              let ax = 0, ay = 0, bx = 0, by = 0;
              if (yerlesim.kesikli) {
                const ofs = ilkKatAraligi + yerlesim.kat * (2 * yariUzanim + 4) * kutuOlcegi;
                ax = sa.x + nx * ofs;
                ay = sa.y + ny * ofs;
                bx = sb.x + nx * ofs;
                by = sb.y + ny * ofs;
                ex = (ax + bx) / 2;
                ey = (ay + by) / 2;
              } else {
                const yon = kenarUstte ? -1 : 1;
                ex = (sa.x + sb.x) / 2 + yon * nx * yakinAralik;
                ey = (sa.y + sb.y) / 2 + yon * ny * yakinAralik;
              }
              // Kesikli ölçüde yazı ucun ötesine kayınca da uzak sayılır (tam yazım, ölçü çizgisi yok)
              const etiket = cizgiEtiketiniYerlestir(yazi, m.id, 'measure', sa, sb, { x: ex, y: ey }, { ucOtesiUzak: yerlesim.kesikli });
              const et = olcumEtiketi(m.id, 'measure', true, etiket);
              const kayma = etiketKaymasi(m.id, 'measure', etiket.merkez, etiket.olcu.genislik, etiket.cizgi);
              // Yazının çizgiye dik uzaklığı (yukarı normal yönünde, px; öbür yanda eksi)
              const dik = kayma.x * nx + kayma.y * ny + (ex - sa.x) * nx + (ey - sa.y) * ny;
              // Etiket ölçtüğü aralıktan UZAKLAŞTIRILINCA (parçanın ucunun ötesine kaydırmak da uzaklaşmadır) ölçü
              // çizgisi boşlukta onunla gitmez, yalnız etiket kalır; geri yaklaştırılınca çizgi yeniden görünür.
              // Çizgiye doğru yakın banda (yalın etiketlerin yeri) ya da öbür yana çekilen etikette de ölçü çizgisi
              // kalkar: parçanın ve komşu yalın etiketlerin, parçanın kendi uzunluğunun üstünden geçmesin.
              const olcuCizgisi = yerlesim.kesikli && !etiket.uzak && dik >= (yakinAralik + ilkKatAraligi) / 2;
              // Yakın kaydırmada da ölçü çizgisi boşlukta kaymaz: hep ölçülen aralık boyunca [a, b] uzanır. Etiket
              // çizgiye DİK taşınınca çizgi de o kadar kayar; BOYUNCA taşınınca yalnız etiket çizginin üstünde kayar.
              // Grup etiketin kayıklığıyla ötelendiği için (olcumEtiketi transform'u) bu öteleme çizgiden düşülür.
              let kx = 0, ky = 0;
              if (olcuCizgisi) {
                const dikKayma = kayma.x * nx + kayma.y * ny;
                kx = nx * dikKayma - kayma.x;
                ky = ny * dikKayma - kayma.y;
              }
              return (
                <g key={m.id} {...et} data-object-id={m.id} data-measurement="distance" data-olcu-cizgisi={olcuCizgisi ? 'kesikli' : 'yok'} onContextMenu={(e) => openContextMenu(e, m)} className="select-none">
                  {olcuCizgisi && (
                    <>
                      <line x1={ax + kx} y1={ay + ky} x2={bx + kx} y2={by + ky} stroke={renk} strokeWidth={1.25} strokeDasharray="4 3" />
                      <line x1={ax + kx - nx * 5} y1={ay + ky - ny * 5} x2={ax + kx + nx * 5} y2={ay + ky + ny * 5} stroke={renk} strokeWidth={1.25} />
                      <line x1={bx + kx - nx * 5} y1={by + ky - ny * 5} x2={bx + kx + nx * 5} y2={by + ky + ny * 5} stroke={renk} strokeWidth={1.25} />
                    </>
                  )}
                  {/* Kutu, yazı ve süsler ölçü çizgisine PARALEL döner; açı her karede uçlardan hesaplanır */}
                  <MatematikEtiketi
                    olcek={yaziOlcegi}
                    satirlar={etiket.satirlar}
                    x={ex}
                    y={ey}
                    px={yaziBoyu}
                    renk="on"
                    kutu={{ sinif: 'fill-background/95 stroke-border', rx: 7 }}
                    kutuGizli={!styleSettings.showLabelBoxes}
                    donmeAcisi={etiket.donmeAcisi}
                    olcu={etiket.olcu}
                    sesli={sesli(olcu, yazim)}
                    ipucu={aciklama(olcu, yazim)}
                  />
                </g>
              );
            }

            if (m.kind === 'slope') {
              const [a, b] = noktalar as PointObject[];
              // 'AB eğimi = 2' / 'AB eğimi tanımsız' (dikey doğru)
              const olcu = egim(a, b, calculateSlope(a, b));
              // Parça ve açı etiketleriyle aynı kural (kullanıcı, 25.10.2026): doğrunun yanındayken kısa ('Eğim = 2'),
              // doğrudan uzaklaştırılınca tam ('AB eğimi = 2'). Elle yazılmış metin (sağ tık > Etiketi düzenle…) ikisinin
              // de yerine geçer (cizgiEtiketiniYerlestir). Yazı yatay kalır: eğim, doğruya paralel dönen bir uzunluk değildir.
              const yazi = cizgiYazimi(olcu);
              const yaziBoyu = fs(11, 'measure');
              const sa = worldToScreen(a, viewport);
              const sb = worldToScreen(b, viewport);
              // Etiket doğrunun ORTA noktasının YANINA konur; üzerinde durursa
              // doğruyu sürüklemek isteyen kullanıcı etiketi yakalardı.
              const dx = sb.x - sa.x;
              const dy = sb.y - sa.y;
              const boy = Math.hypot(dx, dy) || 1;
              // Kutu yarı boyu + 14 px pay (oran 1'de eski 22 px); alt sınırla büyüyen kutu doğruya binmez
              const egimAraligi = (yazi.kisaKutu.yukseklik / 2 + 14) * kutuOlcegi;
              const ex = (sa.x + sb.x) / 2 + (-dy / boy) * egimAraligi;
              const ey = (sa.y + sb.y) / 2 + (dx / boy) * egimAraligi;
              const etiket = cizgiEtiketiniYerlestir(yazi, m.id, 'measure', sa, sb, { x: ex, y: ey });
              const et = olcumEtiketi(m.id, 'measure', true, etiket);

              return (
                <g key={m.id} {...et} data-object-id={m.id} onContextMenu={(e) => openContextMenu(e, m)} className="select-none">
                  <MatematikEtiketi
                    olcek={yaziOlcegi}
                    satirlar={etiket.satirlar}
                    x={ex}
                    y={ey}
                    px={yaziBoyu}
                    renk="on"
                    kutu={{ sinif: 'fill-background/95 stroke-border', rx: 7 }}
                    kutuGizli={!styleSettings.showLabelBoxes}
                    olcu={etiket.olcu}
                    sesli={etiket.sesli}
                    ipucu={etiket.ipucu}
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
            // Açı, sin, cos ve tan AYRI etiketlerdir: köşenin sağ üstünden sola hizalı alt alta dizilir,
            // her biri kendi anahtarıyla taşınır ve tıklayınca yalnızca kendisi gizlenir (sonuncusu ölçümü kapatır).
            const olculer = trigSatirlari(kol1, kose, kol2, o);
            const gizliler = m.hiddenRatios ?? [];
            const yaziBoyu = fs(11, 'measure');
            const sk = worldToScreen(kose, viewport);
            let ust = -48;
            const trigEtiketleri = TRIG_SATIRLARI.flatMap((satir, i) => {
              if (gizliler.includes(satir)) return [];
              const satirlar = [olcuDugumleri(olculer[i], yazim)];
              const kutuOlcu = kutuOlcusu(satirlar, yaziBoyu);
              const merkez = { x: sk.x + (34 + kutuOlcu.genislik / 2) * kutuOlcegi, y: sk.y + (ust + kutuOlcu.yukseklik / 2) * kutuOlcegi };
              ust += kutuOlcu.yukseklik + 6;
              return [{ satir, olcu: olculer[i], satirlar, kutuOlcu, merkez }];
            });

            return (
              <g key={m.id} data-object-id={m.id} onContextMenu={(e) => openContextMenu(e, m)} className="select-none">
                {trigEtiketleri.map((t) => {
                  const anahtar = trigEtiketAnahtari(t.satir);
                  const gizle = () => {
                    if (trigEtiketleri.length <= 1) {
                      updateObject(m.id, { showValue: false, hiddenRatios: undefined } as Partial<MathObject>, true);
                      setHintMessage('Etiket gizlendi. Geri getirmek için oranları yeniden ölçün.');
                    } else {
                      updateObject(m.id, { hiddenRatios: [...gizliler, t.satir] } as Partial<MathObject>, true);
                      setHintMessage('Etiket gizlendi. Geri getirmek için kalan oran etiketlerinden birine sağ tıklayın.');
                    }
                  };
                  const et = olcumEtiketi(m.id, anahtar, true, serbestEtiketYeri(m.id, anahtar, t.merkez, t.kutuOlcu), { eylemTuru: 'measure', gizle });
                  return (
                    <g key={t.satir} {...et} data-measurement={`trig-${t.satir}`}>
                      <MatematikEtiketi
                        olcek={yaziOlcegi}
                        satirlar={t.satirlar}
                        x={t.merkez.x}
                        y={t.merkez.y}
                        px={yaziBoyu}
                        renk="on"
                        kutu={{ sinif: 'fill-background/95 stroke-border', rx: 8 }}
                        kutuGizli={!styleSettings.showLabelBoxes}
                        olcu={t.kutuOlcu}
                        sesli={sesli(t.olcu, yazim)}
                        ipucu={aciklama(t.olcu, yazim)}
                      />
                    </g>
                  );
                })}
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
              secimRengi,
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
              return <CanvasButton key={w.id} obj={w} {...ortak} onRun={() => dugmeyiCalistir(w)} />;
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
            // Canlandırmada tutamak akıcı kayar (sürekli konum), değer ise adıma oturur (useSliderPlayback)
            const gorunenDeger = sliderPlaying ? (sliderCanliKonumlari[s.id] ?? s.value) : s.value;
            const oran = aralik > 0 ? Math.min(1, Math.max(0, (gorunenDeger - s.min) / aralik)) : 0;
            const tutamakX = sol.x + (sag.x - sol.x) * oran;
            const isSelected = selectedObjectIds.includes(s.id);
            const renk = s.color || NESNE_RENGI.mor;
            const bagli = sliderIsBound(objects, s.id);
            // Bağ durumu: bir şeklin özelliğine bağlı (geçici kapatılabilir), geçici kapalı, fonksiyonda kullanılıyor ya da bağsız
            const askida = !!s.suspendedBinding && !bagli;
            const sekleBagli = bagli && !!sliderCurrentBinding(objects, s.id);
            const gosterim = sliderDisplay(objects, s, yazim);
            // Başlık kaydırıcının kendi adıyla ('a = 3 br'); bağlı olduğu ölçü çubuğun altında, ortada (soluk)
            const baslikSatirlari = [gosterim.degiskenNodes];
            const bagliOlcuSatirlari = gosterim.bagliOlcuNodes ? [gosterim.bagliOlcuNodes] : null;
            const bagliOlcuOlcu = bagliOlcuSatirlari ? kutuOlcusu(bagliOlcuSatirlari, fs(10, 'measure'), { yatay: 0, dikey: 0 }) : null;
            const baslikOlcu = kutuOlcusu(baslikSatirlari, fs(11, 'measure'), { yatay: 0, dikey: 0 });
            const baslikY = sol.y - 12 * etiketOlcegi - baslikOlcu.satirlar[0].taban;
            const ust = Math.min(sol.y - 27, baslikY - baslikOlcu.yukseklik / 2);
            const ayarlariAc = () => {
              setSelectedObjectIds([s.id]);
              setSliderSettingsId(s.id);
            };
            // Ayar ve oynat düğmeleri sürgünün üzerine gelince görünür (kullanıcı, 25.10.2026: "her zaman görünmesine
            // gerek yok"). Dokunmatikte üzerine gelme olmadığı için sürgü seçiliyken, klavyede odaktayken de görünürler;
            // canlandırma sürerken Durdur düğmesi hep görünür kalır. Adlandırılmış grup (group/surgu): tuvalin üst kapsayıcıları
            // da "group" taşıdığından düz group-hover fare tuvaldeyken hep açık kalıyordu.
            const hoverIleGorunur = (gorunur: boolean) =>
              `transition-opacity ${gorunur ? 'opacity-100' : 'opacity-0 group-hover/surgu:opacity-100 group-focus-within/surgu:opacity-100'}`;

            return (
              <g
                key={s.id}
                data-object-id={s.id} onContextMenu={(e) => openContextMenu(e, s)}
                className="group/surgu select-none"
                onPointerDown={(e) => {
                  if (!nesneBasisiIslenmeli(activeTool, e) || e.button !== 0) return;
                  // Seç ve Taşı'da sürgü gövdesinden (başlık, çubuk) sürüklenerek taşınır (alan uzmanı, 4. tur);
                  // kısa basış eskisi gibi: bağsız sürgüde ayarlar açılır, bağlı sürgü seçilir. Shift/Ctrl çoklu seçimdir.
                  if (activeTool === 'select' && !e.shiftKey && !e.ctrlKey) {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedObjectIds([s.id]);
                    sliderPositionDragRef.current = {
                      id: s.id, pointerId: e.pointerId,
                      startClient: { x: e.clientX, y: e.clientY },
                      startPosition: { x: s.x as number, y: s.y as number }, moved: false,
                      kisaBasis: bagli || askida ? 'sec' : 'ayarlar',
                    };
                    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* Pencere dinleyicileri sürüklemeyi sürdürür. */ }
                  } else {
                    handleObjectMouseDown(e, s);
                  }
                }}
              >
                {/* Gövde: başlıktan oynat düğmesine kadar (üzerine gelince düğmeler arada kaybolmasın) */}
                <rect
                  x={sol.x - 10} y={ust}
                  width={Math.max(sag.x - sol.x + 70, baslikOlcu.genislik) + 20}
                  height={sol.y + 24 - ust} fill="transparent"
                  className={imlecSinifi(activeTool, 'nesne')}
                >
                  <title>Taşımak için sürükleyin; ayarlar için tıklayın</title>
                </rect>
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
                  {formatTurkishNumber(s.min)}{gosterim.unit === '°' ? '°' : ''}
                </text>
                <text
                  x={sag.x}
                  y={sag.y + 17 * etiketOlcegi}
                  textAnchor="middle"
                  fontSize={fs(11, 'measure')} className="fill-foreground font-bold pointer-events-none"
                >
                  {formatTurkishNumber(s.max)}{gosterim.unit === '°' ? '°' : ''}
                </text>
                {/* Başlık kaydırıcının adı ve değeri */}
                <g className="pointer-events-none">
                  <MatematikEtiketi
                    satirlar={baslikSatirlari}
                    x={sol.x + baslikOlcu.genislik / 2}
                    y={baslikY}
                    px={fs(11, 'measure')}
                    renk="on"
                    sesli={metniSeslendir(bagliOlcuSatirlari ? `${duzMetin(gosterim.degiskenNodes)}, ${gosterim.text}` : duzMetin(gosterim.degiskenNodes))}
                    olcu={baslikOlcu}
                  />
                </g>
                {/* BAĞ SATIRI (kullanıcı, 25.10.2026): çubuğun altında, uç değerlerin arasında zincir simgesi ve bağlı olduğu ölçü
                    (|AB|, m(∠BAC) …). Bağlıysa renkli zincir, geçici kapalıysa turuncu kırık zincir, bağsızsa soluk kırık zincir;
                    nokta kilidiyle karışmasın diye kilit değil zincir. Zincire tıklamak bağı geçici olarak kapatır / yeniden
                    açar; bağsız (ya da yalnız fonksiyonda kullanılan) sürgüde ayarları açar. */}
                {(() => {
                  const taban = sol.y + 17 * etiketOlcegi;
                  const simge = 16;
                  const olcuGenisligi = bagliOlcuOlcu?.genislik ?? 0;
                  const satirSol = (sol.x + sag.x) / 2 - (simge + (olcuGenisligi ? 6 + olcuGenisligi : 0)) / 2;
                  const olcuAdi = gosterim.bagliOlcuNodes ? duzMetin(gosterim.bagliOlcuNodes) : '';
                  const durum = sekleBagli || (bagli && !askida) ? 'bagli' : askida ? 'askida' : 'bagsiz';
                  const aciklama = sekleBagli ? `${olcuAdi} ölçüsüne bağlı. Bağı geçici olarak kapatmak için tıklayın.`
                    : bagli ? 'Bir fonksiyonda kullanılıyor. Ayarlar için tıklayın.'
                      : askida ? `${olcuAdi} bağı geçici olarak kapalı. Yeniden bağlamak için tıklayın.`
                        : 'Hiçbir şekle bağlı değil. Bağlamak için tıklayın.';
                  const bagiDegistir = () => {
                    try {
                      if (sekleBagli) {
                        sliderBaginiAskiyaAl(objects, s.id);
                        commit((prev) => sliderBaginiAskiyaAl(prev, s.id), `${s.variableName} kaydırıcısının bağı geçici olarak kapatıldı`);
                        setHintMessage(`${s.variableName} kaydırıcısının bağı kapalı: şekil serbest. Yeniden bağlamak için zincire tıklayın.`);
                      } else if (askida) {
                        const yeniKimlikler: string[] = [];
                        let sira = 0;
                        const kimlik = () => yeniKimlikler[sira] ?? (yeniKimlikler[sira] = createId('point'));
                        sliderBaginiSurdur(objects, s.id, () => kimlik());
                        commit((prev) => { sira = 0; return sliderBaginiSurdur(prev, s.id, () => { const k = kimlik(); sira += 1; return k; }); }, `${s.variableName} kaydırıcısının bağı yeniden kuruldu`);
                        setHintMessage(`${s.variableName} kaydırıcısı yeniden bağlandı: şekil kaydırıcının değerine döndü.`);
                      } else {
                        ayarlariAc();
                      }
                    } catch (hata) {
                      setHintMessage(hata instanceof Error ? hata.message : 'Kaydırıcının bağı değiştirilemedi.');
                    }
                  };
                  return (
                    <>
                      <g
                        role="button"
                        tabIndex={0}
                        aria-label={`${s.variableName} kaydırıcısı: ${aciklama}`}
                        data-kaydirici-bagi={durum}
                        transform={`translate(${satirSol} ${taban - 13})`}
                        className={`${durum === 'bagli' ? 'text-primary' : durum === 'askida' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground opacity-70'} ${imlecSinifi(activeTool, 'nesne')}`}
                        style={{ touchAction: 'none' }}
                        onPointerDown={(e) => {
                          if (!nesneBasisiIslenmeli(activeTool, e) || e.button !== 0) return;
                          if (activeTool !== 'select') return;
                          e.stopPropagation();
                          e.preventDefault();
                          bagiDegistir();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); bagiDegistir(); }
                        }}
                      >
                        <title>{aciklama}</title>
                        <rect x={-4} y={-4} width={24} height={24} rx={5} fill="transparent" />
                        {durum === 'bagli' ? <Link2 width={simge} height={simge} strokeWidth={2.5} /> : <Link2Off width={simge} height={simge} />}
                      </g>
                      {bagliOlcuSatirlari && bagliOlcuOlcu && (
                        <g data-kaydirici-olcusu={olcuAdi} className="pointer-events-none">
                          <MatematikEtiketi
                            satirlar={bagliOlcuSatirlari}
                            x={satirSol + simge + 6 + olcuGenisligi / 2}
                            y={taban - bagliOlcuOlcu.satirlar[0].taban}
                            px={fs(10, 'measure')}
                            renk="soluk"
                            sesli={metniSeslendir(olcuAdi)}
                            olcu={bagliOlcuOlcu}
                          />
                        </g>
                      )}
                    </>
                  );
                })()}
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
                    if (activeTool === 'delete') { deleteObject(s.id); return; }
                    if (activeTool !== 'select') return;
                    // Bağsız sürgüde tutamak ayarları açar; bağı geçici kapalı sürgünün değeri yine sürüklenir
                    if (!bagli && !askida) { ayarlariAc(); return; }
                    setSelectedObjectId(s.id);
                    setSelectedObjectIds([s.id]);
                    sliderDragRef.current = { id: s.id };
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }
                  }}
                />
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`${gosterim.name} kaydırıcısı ayarları`}
                  transform={`translate(${sag.x + 18} ${sol.y - 9})`}
                  data-kaydirici-dugmesi="ayarlar"
                  className={`text-muted-foreground hover:text-primary ${hoverIleGorunur(isSelected)} ${imlecSinifi(activeTool, 'nesne')}`}
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => {
                    if (!nesneBasisiIslenmeli(activeTool, e) || e.button !== 0) return;
                    e.stopPropagation();
                    if (activeTool === 'delete') { deleteObject(s.id); return; }
                    if (activeTool !== 'select') return;
                    e.preventDefault();
                    setSelectedObjectIds([s.id]);
                    sliderPositionDragRef.current = {
                      id: s.id, pointerId: e.pointerId,
                      startClient: { x: e.clientX, y: e.clientY },
                      startPosition: { x: s.x as number, y: s.y as number }, moved: false,
                    };
                    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* Pencere dinleyicileri sürüklemeyi sürdürür. */ }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); ayarlariAc(); }
                  }}
                >
                  <title>Ayarlar için tıklayın; taşımak için sürükleyin</title>
                  <rect x={-4} y={-4} width={26} height={26} rx={5} fill="transparent" />
                  <Settings width={18} height={18} />
                </g>
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={sliderPlaying ? 'Animasyonu Durdur' : 'Animasyonu Başlat'}
                  aria-pressed={sliderPlaying}
                  transform={`translate(${sag.x + 44} ${sol.y - 9})`}
                  data-kaydirici-dugmesi="oynat"
                  className={`${sliderPlaying ? 'text-primary' : 'text-muted-foreground hover:text-primary'} ${hoverIleGorunur(isSelected || sliderPlaying)} ${imlecSinifi(activeTool, 'nesne')}`}
                  style={{ touchAction: 'none' }}
                  onPointerDown={(e) => {
                    if (!nesneBasisiIslenmeli(activeTool, e) || e.button !== 0) return;
                    e.stopPropagation();
                    if (activeTool === 'delete') { deleteObject(s.id); return; }
                    if (activeTool !== 'select') return;
                    e.preventDefault();
                    toggleSliderPlayback();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSliderPlayback();
                    }
                  }}
                >
                  <title>{sliderPlaying ? 'Animasyonu Durdur' : 'Animasyonu Başlat'}</title>
                  <rect x={-4} y={-4} width={26} height={26} rx={5} fill="transparent" />
                  {sliderPlaying ? <Pause width={18} height={18} /> : <Play width={18} height={18} />}
                </g>
                {isSelected && (
                  <circle
                    cx={tutamakX}
                    cy={sol.y}
                    r={13}
                    fill="none"
                    stroke={secimRengi}
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
            const stroke = isSelected ? secimRengi : shape.color || (isSector ? NESNE_RENGI.zumrut : NESNE_RENGI.camgobegi);
            const derece = (geo.sweep * 180) / Math.PI;

            // Etiket: yayın orta noktasının biraz dışında
            const midAng = geo.startAngle + geo.sweep / 2;
            // Rozet her iki şekilde de yayın DIŞINDA durur; dilimin içindeyken
            // dilimi sürüklemek isteyen kullanıcı rozeti yakalıyordu.
            const labelR = rPx + 12 * kutuOlcegi;
            const yayEtiketGeo: YayEtiketGeometrisi = { merkez: cS, yaricap: rPx, baslangic: -geo.startAngle, tarama: -geo.sweep };
            const yaziBoyu = fs(11, 'measure');
            const esik = 18 * etiketOlcegi;
            /*
             * YAZIM KURALI (kullanıcı, 25.10.2026; parça ve açı etiketleriyle aynı): her ölçü ÖLÇTÜĞÜ ŞEYİN yanındayken kısa,
             * oradan ayrılınca tam yazılır. Yay uzunluğu yayın, yarıçap yarıçap çizgisinin, kiriş kirişin, merkez açı merkezin
             * yanında kısalır ('≈ 3,14 br', 'r = 2 br', '90°'); elle oraya taşınan etiket de kısalır. Alan ve çevrenin kısa
             * biçimi yoktur: çokgendeki gibi hep adıyla yazılır ('A(BAC dilimi) = …'). Dilimin (ya da kenarı çizili yayın)
             * yarıçapı kenarın yanına, dilimin merkez açısı çokgen açıları gibi merkeze açı yayıyla konur; ötekiler yayın
             * dışında yığılır.
             */
            const yaricapCizgisi = isSector || cizgiVarMi(shape.centerPointId, shape.startPointId);
            const tumOlculer = yayOlculeri(shape, noktaBul, objects, geo);
            const yigindakiler = tumOlculer.filter((x) => !(x.kind === 'radius' && yaricapCizgisi));
            if (!isSector && shape.showCentralAngle !== false) {
              yigindakiler.push({ kind: 'centralAngle', olcu: yayMerkezAcisi(shape, noktaBul, objects, geo, derece, { basamak: 1 }) });
            }
            const olcumler = yigindakiler.map((x) => {
              const iki = yazimlar(x.olcu, yazim);
              const bicimler = x.kind === 'area' || x.kind === 'perimeter' ? { ...iki, kisa: iki.tam } : iki;
              return {
                kind: x.kind,
                bicimler,
                kisaKutu: kutuOlcusu([bicimler.kisa], yaziBoyu),
                tamKutu: kutuOlcusu([bicimler.tam], yaziBoyu),
                sesli: sesli(x.olcu, yazim),
                ipucu: aciklama(x.olcu, yazim),
              };
            });
            // Ölçü listesi yayın orta doğrultusunda dizilir (src/math/yazimDuzeni.ts: isinaDiz). Doğal yer yanındaki yerdir,
            // o yüzden yığın KISA kutularla kurulur. Yay uzunluğu yazısı teğete döner; ötekiler yataydır. Adım, iki kutuyu
            // ayırmaya YETEN en küçük paydır: her etikete tam radyal uzanım verilince 45°'lik dört etiketlik liste
            // yaydan ~250 px uzağa taşıyıp komşu şeklin ölçüm kartına giriyordu.
            // Yerleşim uzayındaki kutular yazı/yerleşim oranıyla büyütülür (yazı alt sınırı); çizime ölçeksiz kutu gider
            // ÇAKIŞMA ÖNLEYİCİ (alan uzmanı, 4. tur: dilim etiketleri "başka bir çokgenin etiketlerinin altına
            // yığılıyor"): yığın başka şekillerin alan/çevre etiketlerine değiyorsa önce kendi doğrultusunda biraz
            // dışa itilir, olmazsa dilimin çeyrek doğrultularından biri denenir. Etiketler hep kendi yayının yanında kalır.
            const yiginOgeleri = olcumler.map((m) => ({ kutu: yerlesimKutusu(m.kisaKutu), dondu: m.kind === 'arcLength' }));
            const yiginKur = (aci: number) => ({
              aci,
              taban: { x: cS.x + labelR * Math.cos(aci), y: cS.y - labelR * Math.sin(aci) },
              ...isinaDiz(yiginOgeleri, aci, 6 * yerlesimOrani),
            });
            type Yigin = ReturnType<typeof yiginKur>;
            const yigindaKonum = (y: Yigin, r: number, kayma: number) => ({
              x: y.taban.x + Math.cos(y.aci) * (r * etiketOlcegi + kayma),
              y: y.taban.y - Math.sin(y.aci) * (r * etiketOlcegi + kayma),
            });
            let yigin = yiginKur(midAng);
            let yiginItme = 0;
            const digerKartlar = showDetails ? kartKutulari.filter((k) => k.id !== shape.id).map((k) => k.kutu) : [];
            if (digerKartlar.length && olcumler.length) {
              const kutular = (y: Yigin) => olcumler.map((m, i) => olcekliKutu(yigindaKonum(y, y.yaricaplar[i], 0), m.kisaKutu, yaziOlcegi));
              // Önce yayın başka doğrultuları (itmesiz), sonra küçük itmeler; en son orta doğrultuda daha uzağa itme
              const adaylar = [0.5, 0.25, 0.75, 0.1, 0.9].map((t) => yiginKur(geo.startAngle + geo.sweep * t));
              const yon = (y: Yigin) => ({ x: Math.cos(y.aci), y: -Math.sin(y.aci) });
              const secilen = yiginYeriSec(adaylar.map((y) => ({ kutular: kutular(y), yon: yon(y) })), digerKartlar, 8, 24 * kutuOlcegi);
              if (secilen) {
                yigin = adaylar[secilen.sira];
                yiginItme = secilen.kayma;
              } else {
                const itme = yiginKaymasi(kutular(yigin), digerKartlar, yon(yigin), 8, 64 * kutuOlcegi);
                if (itme !== null) yiginItme = itme;
              }
            }
            const yiginR = yigin.yaricaplar;
            const yiginKonumu = (r: number) => yigindaKonum(yigin, r, yiginItme);

            return (
              <g
                key={shape.id}
                {...nesneOlaylari(shape)}
                className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
              >
                {/* Görünmez kalın tutma alanı (ince yayı yakalamak zor olmasın) */}
                <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
                <path
                  d={d}
                  fill={isSector ? (shape as SectorObject).fillColor || NESNE_RENGI.zumrut : 'none'}
                  fillOpacity={styleSettings.hideFills ? 0 : isSector ? (shape as SectorObject).fillOpacity ?? 0.4 : 0}
                  stroke={stroke}
                  strokeWidth={sw(isSelected ? 4 : (shape as ArcObject).thickness ?? 3)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {showDetails && olcumler.map((m, index) => {
                  const merkez = yiginKonumu(yiginR[index]);
                  const kayma = etiketKaymasi(shape.id, m.kind, merkez, m.tamKutu.genislik);
                  // Yakınlık ölçtüğü şeye göre: yay uzunluğu yaya, kiriş ve yarıçap kendi doğrularına, merkez açı merkeze;
                  // alan ve çevre (şeklin bütünü) doğal yerinden ayrılınca uzak sayılır
                  const yayaGore = m.kind === 'arcLength' ? yayEtiketiYerlesimi(yayEtiketGeo, merkez, kayma, esik) : null;
                  const uzak = etiketAyrikMi(shape.id, m.kind) || (
                    yayaGore ? yayaGore.uzak
                      : m.kind === 'chordLength' ? cizgiEtiketiUzakta(p0, p1, merkez, kayma, esik)
                        : m.kind === 'radius' ? cizgiEtiketiUzakta(cS, p0, merkez, kayma, esik)
                          : m.kind === 'centralAngle' ? aciEtiketiUzakta(cS, merkez, kayma, esik)
                            : Math.hypot(kayma.x, kayma.y) > esik);
                  const satirlar = [uzak ? m.bicimler.tam : m.bicimler.kisa];
                  const kutu = uzak ? m.tamKutu : m.kisaKutu;
                  return <g key={m.kind} {...olcumEtiketi(shape.id, m.kind, true, { merkez, olcu: kutu, uzak })} data-measurement={m.kind}>
                    <MatematikEtiketi
                      olcek={yaziOlcegi}
                      satirlar={satirlar}
                      x={merkez.x}
                      y={merkez.y}
                      px={yaziBoyu}
                      renk="on"
                      kutu={{ sinif: 'fill-background/90 stroke-border', rx: 7 }}
                      kutuGizli={!styleSettings.showLabelBoxes}
                      olcu={kutu}
                      donmeAcisi={!uzak && yayaGore ? yayaGore.donmeAcisi : 0}
                      sesli={m.sesli}
                      ipucu={m.ipucu}
                    />
                  </g>;
                })}

                {/* YARIÇAP: dilimin kenarı (ya da yayın çizili [merkez, başlangıç] parçası) bir doğru parçası gibi ölçülür:
                    etiket kenarın DIŞ yanında, kenara paralel ve kısa ('r = 2 br'); kenardan uzaklaşınca 'r = |AB| = 2 br'. */}
                {showDetails && yaricapCizgisi && (() => {
                  const yaricapOlcusu = tumOlculer.find((x) => x.kind === 'radius')?.olcu;
                  if (!yaricapOlcusu) return null;
                  const yazi = cizgiYazimi(yaricapOlcusu);
                  // Dış normal: başlangıç kenarının saat yönündeki yanı (dilim saat yönünün tersine açılır; ekranda y ters)
                  const nx = Math.sin(geo.startAngle);
                  const ny = Math.cos(geo.startAngle);
                  const aralik = (yazi.kisaKutu.yukseklik / 2 + 14) * kutuOlcegi;
                  const ex = (cS.x + p0.x) / 2 + nx * aralik;
                  const ey = (cS.y + p0.y) / 2 + ny * aralik;
                  const etiket = cizgiEtiketiniYerlestir(yazi, shape.id, 'radius', cS, p0, { x: ex, y: ey });
                  return (
                    <g {...olcumEtiketi(shape.id, 'radius', true, etiket)} data-measurement="radius">
                      <MatematikEtiketi
                        olcek={yaziOlcegi}
                        satirlar={etiket.satirlar}
                        x={ex}
                        y={ey}
                        px={yaziBoyu}
                        renk="on"
                        kutu={{ sinif: 'fill-background/90 stroke-border', rx: 7 }}
                        kutuGizli={!styleSettings.showLabelBoxes}
                        donmeAcisi={etiket.donmeAcisi}
                        olcu={etiket.olcu}
                        sesli={etiket.sesli}
                        ipucu={etiket.ipucu}
                      />
                    </g>
                  );
                })()}

                {/* DİLİMİN MERKEZ AÇISI: çokgen açıları gibi merkezde, açı yayıyla (90°'de kare) ve yayın yanında kısa ('90°');
                    merkezden uzaklaştırılınca tam ('m(∠BAC) = 90°'). Kendi ölçüm türü ('centralAngle') ve tıklama kutusu var. */}
                {showDetails && isSector && shape.showCentralAngle !== false && (() => {
                  const merkezOlcu = yayMerkezAcisi(shape, noktaBul, objects, geo, derece, { basamak: 1 });
                  const bicimler = yazimlar(merkezOlcu, yazim);
                  const kisaKutu = kutuOlcusu([bicimler.kisa], yaziBoyu);
                  const tamKutu = kutuOlcusu([bicimler.tam], yaziBoyu);
                  // Yerleşim açı rozetleriyle aynı (aciRozetleri): yerleşim uzayında, ekran açıları y aşağı
                  const kose = worldToScreen(center, etiketGorunumu);
                  const kol1 = -geo.startAngle;
                  // Dış açı (centralAngleReflex): başlangıç kolundan öbür yöne, dilimin DIŞINDAKİ 360° − iç açı taranır
                  const dis = !!shape.centralAngleReflex;
                  const tarama = dis ? 2 * Math.PI - geo.sweep : -geo.sweep;
                  const aciDerece = dis ? 360 - derece : derece;
                  const kolBoyu = geo.radius * LABEL_LAYOUT_ZOOM;
                  const yayR = aciYayYaricapi(aciDerece, kolBoyu);
                  const yer = yakinAciRozetiYerlesimi(
                    { kose, kol1, kol2: kol1 + tarama, boy1: kolBoyu, boy2: kolBoyu, orta: kol1 + tarama / 2, tarama: Math.abs(tarama), yayR },
                    kisaKutu, yaziOrani,
                  );
                  const merkez = projectLabelPoint({ x: (yer.kutu.x0 + yer.kutu.x1) / 2, y: (yer.kutu.y0 + yer.kutu.y1) / 2 }, viewport);
                  const kayma = etiketKaymasi(shape.id, 'centralAngle', merkez, tamKutu.genislik);
                  const uzak = etiketAyrikMi(shape.id, 'centralAngle') || aciEtiketiUzakta(cS, merkez, kayma, esik);
                  const satirlar = [uzak ? bicimler.tam : bicimler.kisa];
                  const kutu = uzak ? tamKutu : kisaKutu;
                  // Açı işareti (7.6 açı katmanıyla aynı çizim): 90°'de kare, değilse yay; büyük dilimde büyük yay
                  const r = yayR * etiketOlcegi;
                  const a1 = kol1;
                  const a2 = kol1 + tarama;
                  const dik = Math.round(aciDerece) === 90;
                  const kenar = r / Math.SQRT2;
                  const k1 = { x: cS.x + kenar * Math.cos(a1), y: cS.y + kenar * Math.sin(a1) };
                  const k2 = { x: cS.x + kenar * Math.cos(a2), y: cS.y + kenar * Math.sin(a2) };
                  const isaret = dik
                    ? `M ${k1.x} ${k1.y} L ${k1.x + k2.x - cS.x} ${k1.y + k2.y - cS.y} L ${k2.x} ${k2.y}`
                    : `M ${cS.x + r * Math.cos(a1)} ${cS.y + r * Math.sin(a1)} A ${r} ${r} 0 ${Math.abs(tarama) > Math.PI ? 1 : 0} ${tarama > 0 ? 1 : 0} ${cS.x + r * Math.cos(a2)} ${cS.y + r * Math.sin(a2)}`;
                  return (
                    <>
                      <path
                        d={isaret}
                        data-angle-marker={dik ? 'right' : 'arc'}
                        fill="none"
                        stroke={NESNE_RENGI.kehribar}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="miter"
                        className="opacity-80 pointer-events-none"
                      />
                      <g {...olcumEtiketi(shape.id, 'centralAngle', true, { merkez, olcu: kutu, uzak })} data-measurement="centralAngle">
                        <MatematikEtiketi
                          olcek={yaziOlcegi}
                          satirlar={satirlar}
                          x={merkez.x}
                          y={merkez.y}
                          px={yaziBoyu}
                          renk="on"
                          kutu={{ sinif: 'fill-background/90 stroke-border', rx: 6 }}
                          kutuGizli={!styleSettings.showLabelBoxes}
                          olcu={kutu}
                          sesli={sesli(merkezOlcu, yazim)}
                          ipucu={aciklama(merkezOlcu, yazim)}
                        />
                      </g>
                    </>
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
                    ilkokul={ilkokul}
                    stil={styleSettings}
                    olcek={yaziOlcegi}
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
                {...nesneOlaylari(elp)}
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
                    fill={elp.fillColor || elp.color || NESNE_RENGI.camgobegi}
                    fillOpacity={styleSettings.hideFills ? 0 : elp.fillOpacity ?? 0.12}
                    stroke={isSelected ? secimRengi : elp.color || NESNE_RENGI.camgobegi}
                    strokeWidth={sw(isSelected ? 3 : 2)}
                  />
                  {/* 🔄 DÖNDÜRME PALETİ — elips kendi merkezi etrafında döner */}
                  {activeTool === 'rotate' && isSelected && (
                    <RotateGizmo
                      center={cS}
                      feedbackDeg={rotatingFeedback?.shapeId === elp.id ? rotatingFeedback.deg : null}
                      onFreeRotateStart={(e) => handleStartRotateShape(e, elp)}
                      onRotate={(deg) => rotateShapeByAngle(elp, deg)}
                      ilkokul={ilkokul}
                      stil={styleSettings}
                      olcek={yaziOlcegi}
                    />
                  )}
                </g>

                {(hasArea || hasPerimeter) && (kartHaritasi.get(elp.id) ?? []).map((kart) => {
                  // MEB yazımı: 'Alan = πab ≈ …' ve 'Çevre ≈ …' AYRI etiketlerdir (elips çevresi her zaman yaklaşıktır).
                  const et = olcumEtiketi(elp.id, kart.anahtar, true, serbestEtiketYeri(elp.id, kart.anahtar, kart.merkez, kart.olcu, kart.duz));
                  return (
                    <g
                      key={`kart-${kart.anahtar}`}
                      {...et}
                      data-measurement={kart.anahtar}
                      className="drop-shadow-sm select-none"
                    >
                      <MatematikEtiketi
                        olcek={yaziOlcegi}
                        satirlar={kart.satirlar}
                        x={kart.merkez.x}
                        y={kart.merkez.y}
                        px={fs(11, 'measure')}
                        renk="on"
                        kutu={{ sinif: 'fill-background/90 stroke-border', rx: 8 }}
                        kutuGizli={!styleSettings.showLabelBoxes}
                        olcu={kart.olcu}
                        sesli={kart.sesli}
                        ipucu={kart.ipucu}
                      />
                    </g>
                  );
                })}
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

            // Başlık, yarıçap, alan ve çevre etiketleri ön geçişte hesaplanır (olcuYazimlari.olcumKartKutulari);
            // Sade görünümde kartKutulari boştur.

            return (
              <g
                key={circ.id}
                {...nesneOlaylari(circ)}
                className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}
              >
                <circle
                  cx={centerScreen.x}
                  cy={centerScreen.y}
                  r={pixelRadius}
                  fill={circ.color || NESNE_RENGI.mor}
                  fillOpacity={styleSettings.hideFills ? 0 : circ.fillOpacity || 0.08}
                  stroke={isSelected ? secimRengi : circ.color || NESNE_RENGI.mor}
                  strokeWidth={sw(isSelected ? 3 : 2)}
                />
                {(kartHaritasi.get(circ.id) ?? []).map((kart) => {
                  // MEB yazımı — her biri AYRI etiket: 'r = |OT| = 1,5 br', 'Alan = πr² ≈ 7,07 br²',
                  // 'Çevre = 2πr ≈ 9,42 br'. Eski 'r = … | A = …' satırındaki 'A =' tuvaldeki A noktasıyla
                  // karışıyordu; "Ç(O, r)" başlık kartı 8 Ekim 2026'da kaldırıldı. Tıklayınca tek tek gizlenir.
                  const et = olcumEtiketi(circ.id, kart.anahtar, true, serbestEtiketYeri(circ.id, kart.anahtar, kart.merkez, kart.olcu, kart.duz));
                  return (
                  <g
                    key={`kart-${kart.anahtar}`}
                    {...et}
                    data-measurement={kart.anahtar}
                    className="drop-shadow-sm select-none"
                  >
                    <MatematikEtiketi
                      olcek={yaziOlcegi}
                      satirlar={kart.satirlar}
                      x={kart.merkez.x}
                      y={kart.merkez.y}
                      px={fs(11, 'measure')}
                      renk="on"
                      kutu={{ dolgu: '#ffffff', dolguOpakligi: 0.92, cizgi: circ.color || NESNE_RENGI.mor, cizgiKalinligi: kartVurguluMu(circ.id, kart.anahtar) ? 2.5 : 1.2, rx: 7, sinif: `shadow-sm dark:fill-card${kartVurguluMu(circ.id, kart.anahtar) ? ' animate-pulse' : ''}` }}
                      kutuGizli={!styleSettings.showLabelBoxes && !kartVurguluMu(circ.id, kart.anahtar)}
                      olcu={kart.olcu}
                      sesli={kart.sesli}
                      ipucu={kart.ipucu}
                    />
                  </g>
                  );
                })}
                {/* YARIÇAP ÇİZİLİYSE (merkezle yarıçap noktası arasında parça varsa) etiket o çizginin yanında durur: kısa
                    'r = 3 br', çizgiden uzaklaşınca 'r = |OA| = 3 br'. Parçanın kendi uzunluk etiketinin KARŞI yanına konur. */}
                {showDetails && cemberYaricapiGorunur(circ) && cemberYaricapCizgisiVar(circ, objects) && (() => {
                  const merkezNoktasi = pointsById.get(circ.centerPointId);
                  const yaricapNoktasi = circ.radiusPointId ? pointsById.get(circ.radiusPointId) : undefined;
                  if (!merkezNoktasi || !yaricapNoktasi) return null;
                  const yazi = cizgiYazimi(yaricap(merkezNoktasi, yaricapNoktasi, radius));
                  const s2 = worldToScreen(yaricapNoktasi, viewport);
                  const dx = s2.x - centerScreen.x;
                  const dy = s2.y - centerScreen.y;
                  const boy = Math.hypot(dx, dy) || 1;
                  // Parça uzunluğu etiketinin normali (7. katman) ve onun tersi
                  let nx = -dy / boy;
                  let ny = dx / boy;
                  if (ny > 1e-9 || (Math.abs(ny) <= 1e-9 && nx < 0)) {
                    nx = -nx;
                    ny = -ny;
                  }
                  const aralik = (yazi.kisaKutu.yukseklik / 2 + 14) * kutuOlcegi;
                  const ex = (centerScreen.x + s2.x) / 2 + nx * aralik;
                  const ey = (centerScreen.y + s2.y) / 2 + ny * aralik;
                  const etiket = cizgiEtiketiniYerlestir(yazi, circ.id, 'radius', centerScreen, s2, { x: ex, y: ey });
                  return (
                    <g {...olcumEtiketi(circ.id, 'radius', true, etiket)} data-measurement="radius" className="drop-shadow-sm select-none">
                      <MatematikEtiketi
                        olcek={yaziOlcegi}
                        satirlar={etiket.satirlar}
                        x={ex}
                        y={ey}
                        px={fs(11, 'measure')}
                        renk="on"
                        kutu={{ dolgu: '#ffffff', dolguOpakligi: 0.92, cizgi: circ.color || NESNE_RENGI.mor, cizgiKalinligi: 1.2, rx: 7, sinif: 'shadow-sm dark:fill-card' }}
                        kutuGizli={!styleSettings.showLabelBoxes}
                        donmeAcisi={etiket.donmeAcisi}
                        olcu={etiket.olcu}
                        sesli={etiket.sesli}
                        ipucu={etiket.ipucu}
                      />
                    </g>
                  );
                })()}
              </g>
            );
          })}

        {/* 7. DOĞRU PARÇALARI, DOĞRULAR VE IŞINLAR KATMANI: görünmez kalın yakalayıcı, çizgi ve ölçü yazıları; parçayı
             Döndür aracı kendi orta noktası çevresinde döndürür */}
        {objects
          .filter((o): o is DogrusalNesne => dogrusalMi(o) && o.visible)
          .map((nesne) => {
            const uclar = dogrusalUclar(nesne, pointsById, viewport);
            if (!uclar) return null;
            const { p1, p2, s1, s2 } = uclar;
            const secili = selectedObjectIds.includes(nesne.id);
            const renk = secili ? secimRengi : nesne.color || NESNE_RENGI.camgobegi;
            return (
              <g key={nesne.id} {...nesneOlaylari(nesne)} className={`select-none ${imlecSinifi(activeTool, 'nesne')}`}>
                <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="transparent" strokeWidth={14} />
                {nesne.type === 'segment' ? (
                  <line
                    x1={s1.x}
                    y1={s1.y}
                    x2={s2.x}
                    y2={s2.y}
                    stroke={renk}
                    strokeWidth={sw((nesne.thickness || 2.5) + (secili ? 1.5 : 0))}
                    strokeDasharray={nesne.style === 'dashed' ? '8 6' : nesne.style === 'dotted' ? '2 5' : undefined}
                    strokeLinecap="round"
                    className="hover:opacity-80 transition-all"
                  />
                ) : (
                  <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={renk} strokeWidth={secili ? 3 : 2} />
                )}
                {nesne.type === 'segment'
                  ? nesne.showLength && showDetails && parcaUzunluguEtiketi(nesne, s1, s2)
                  : nesne.type === 'line' && nesne.showEquation && showDetails && denklemEtiketi(nesne, p1, p2)}
                {nesne.type === 'segment'
                  ? activeTool === 'rotate' && secili && (
                      <RotateGizmo
                        center={{ x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 }}
                        feedbackDeg={rotatingFeedback?.shapeId === nesne.id ? rotatingFeedback.deg : null}
                        onFreeRotateStart={(e) => handleStartRotateShape(e, nesne)}
                        onRotate={(deg) => rotateShapeByAngle(nesne, deg)}
                        ilkokul={ilkokul}
                        stil={styleSettings}
                        olcek={yaziOlcegi}
                      />
                    )
                  : nesne.showLength && showDetails && tanimUzunluguEtiketi(nesne, p1, p2)}
              </g>
            );
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
            const lp = { x: c.x, y: c.y - g.radius * z - (12 + kutu.yukseklik / 2) * kutuOlcegi };
            return (
              <g key={m.id} data-object-id={m.id} data-yay-olcumu={m.id} data-yay-cozulemedi="1" className="select-none">
                <g {...olcumEtiketi(m.id, 'measure', true, { merkez: lp, olcu: kutu, uzak: true })} data-yay-rozeti="1" data-measurement="arc" onContextMenu={(e) => openContextMenu(e, m)}>
                  <MatematikEtiketi
                    olcek={yaziOlcegi}
                    satirlar={satirlar}
                    x={lp.x}
                    y={lp.y}
                    px={yazi}
                    renk="yay"
                    satirRengi={['yay', 'uyari']}
                    kutu={{ sinif: 'fill-background/95 stroke-border', rx: 8 }}
                    kutuGizli={!styleSettings.showLabelBoxes}
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
              // Rozet de öbür ölçüler gibi uyarlanır: yayın YANINDAYKEN kısa, uzaklaştırılınca tam
              // (kullanıcı kuralı). Karar rozetin TAMAMI için bir kez verilir — `durum()` konumdan
              // türer, satır başına değil — böylece '|S͡W͡D| ≈ 9,42 br' ile çıplak '180°' yan yana gelmez.
              // Kopmuş ölçümün kırmızı uyarısı kısaltılamaz, o yüzden onda tam yazım kalır.
              const uyarlanabilir = !kopuk;
              const kisaSatirlar = yayYazimi && uyarlanabilir
                ? [yazimlar(yayYazimi.uzunluk, yazim).kisa, yazimlar(yayYazimi.olcu, yazim).kisa]
                : tamSatirlar;
              // Uzunluk ve derece AYRI kutulardır. Yerleşim ikisini aralarında 4 px ile alt alta duran tek bir
              // BİRİM olarak arar; sonra her kutu kendi yerinde, kendi anahtarıyla çizilir ve taşınır.
              const SATIR_ARALIGI = 4;
              // Yerleşim uzayındaki boyutlar (genislik, yukseklik, satirBoyu) yazı/yerleşim oranıyla büyütülür: yazı alt
              // sınırı devredeyken rozet yaya girmesin, iki satır üst üste binmesin. `kutular` çizim için ölçeksizdir.
              const birimOlcusu = (satirlar: Dugum[][]) => {
                const kutular = satirlar.map((s) => kutuOlcusu([s], yazi));
                const satirBoyu = kutular.map((k) => k.yukseklik * yerlesimOrani);
                return {
                  kutular,
                  satirBoyu,
                  genislik: Math.max(...kutular.map((k) => k.genislik)) * yerlesimOrani,
                  yukseklik: satirBoyu.reduce((t, h) => t + h, 0) + SATIR_ARALIGI * yerlesimOrani * (kutular.length - 1),
                };
              };
              const tamKutu = birimOlcusu(tamSatirlar);
              const kisaKutu = uyarlanabilir ? birimOlcusu(kisaSatirlar) : tamKutu;
              const layoutC = worldToScreen(yay.center, etiketGorunumu);
              const layoutR = yay.radius * LABEL_LAYOUT_ZOOM;
              const yayEtiketGeo: YayEtiketGeometrisi = { merkez: layoutC, yaricap: layoutR, baslangic: -yay.startAngle, tarama: -yay.sweep };
              const radyalNokta = (aci: number, ek: number): Point2D => ({
                x: layoutC.x + (layoutR + ek) * Math.cos(aci), y: layoutC.y - (layoutR + ek) * Math.sin(aci),
              });
              const yatayPay = (aci: number) => (Math.abs(Math.cos(aci)) * tamKutu.genislik + Math.abs(Math.sin(aci)) * tamKutu.yukseklik) / 2;
              const capa = radyalNokta(yay.midAngle, 12 * yerlesimOrani + (uyarlanabilir ? kisaKutu.yukseklik / 2 : yatayPay(yay.midAngle)));
              const durum = (p: Point2D, kayma: Point2D = { x: 0, y: 0 }) => uyarlanabilir
                ? yayEtiketiYerlesimi(yayEtiketGeo, capa, { x: p.x - capa.x + kayma.x, y: p.y - capa.y + kayma.y })
                : { uzak: true, donmeAcisi: 0 };
              // Rozet, yayın ortasında çemberin DIŞINDA: aci yönünde, çembere `ek` px daha uzak
              const yer = (aci: number, ek: number): Point2D => {
                const p = radyalNokta(aci, 12 * yerlesimOrani + ek + (uyarlanabilir ? kisaKutu.yukseklik / 2 : yatayPay(aci)));
                return uyarlanabilir && durum(p).uzak ? radyalNokta(aci, 12 * yerlesimOrani + ek + yatayPay(aci)) : p;
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
              // Kutu merkezleri sürüklemeden bağımsız birim yerleşiminden (lp ve onun teğet açısı) çıkar.
              // Her kutu kendi kayıklığıyla taşınır; yaya yakınken kısa yazılıp kendi teğetine döner,
              // uzaklaşınca tam yazılır ve yatay durur. Uzunluk eski tek rozetin 'measure' anahtarını devralır.
              const dogal = durum(lp);
              const birim = dogal.uzak ? tamKutu : kisaKutu;
              const teta = (dogal.donmeAcisi * Math.PI) / 180;
              let ust = -birim.yukseklik / 2;
              const yayEtiketleri = (['measure', 'arcDegree'] as const).map((anahtar, i) => {
                const yerel = ust + birim.satirBoyu[i] / 2;
                ust += birim.satirBoyu[i] + SATIR_ARALIGI * yerlesimOrani;
                const satirLp = { x: lp.x - yerel * Math.sin(teta), y: lp.y + yerel * Math.cos(teta) };
                const ekran = projectLabelPoint(satirLp, viewport);
                const kayma = etiketKaymasi(m.id, anahtar, ekran, tamKutu.kutular[i].genislik);
                const yerlesim = etiketAyrikMi(m.id, anahtar) ? { uzak: true, donmeAcisi: 0 } : durum(satirLp, { x: kayma.x / etiketOlcegi, y: kayma.y / etiketOlcegi });
                const olcuSatiri = i === 0 ? yayYazimi?.uzunluk : kopuk ? undefined : yayYazimi?.olcu;
                return {
                  anahtar,
                  ekran,
                  uzak: yerlesim.uzak,
                  donmeAcisi: yerlesim.donmeAcisi,
                  satirlar: [yerlesim.uzak ? tamSatirlar[i] : kisaSatirlar[i]],
                  olcu: yerlesim.uzak ? tamKutu.kutular[i] : kisaKutu.kutular[i],
                  renk: (i === 0 ? (!m.color || m.color === YAY_OLCUMU_RENGI ? 'yay' : { hex: m.color }) : kopuk ? 'uyari' : 'on') as EtiketRengi,
                  sesli: olcuSatiri ? sesli(olcuSatiri, yazim) : i === 0 ? baslik : kopuk ?? arcValueText(yay),
                  ipucu: olcuSatiri ? `${baslik}: ${aciklama(olcuSatiri, yazim)}` : baslik,
                };
              });
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
                  {/* Uzunluk ve derece (ya da kopukluk uyarısı) AYRI rozetlerdir; ikisi de aynı ölçümdür,
                      tıklamak ölçümü siler (Geri Al ile döner). */}
                  {yayEtiketleri.map((e, i) => (
                    <g key={e.anahtar} {...olcumEtiketi(m.id, e.anahtar, true, { merkez: e.ekran, olcu: e.olcu, uzak: e.uzak }, { eylemTuru: 'measure' })} data-yay-rozeti="1" data-measurement={i === 0 ? 'arc' : 'arc-degree'} onContextMenu={(ev) => openContextMenu(ev, m)}>
                      <MatematikEtiketi
                        olcek={yaziOlcegi}
                        satirlar={e.satirlar}
                        x={e.ekran.x}
                        y={e.ekran.y}
                        px={yazi}
                        renk={e.renk}
                        kutu={{ sinif: 'fill-background/95 stroke-border', rx: 8 }}
                        kutuGizli={!styleSettings.showLabelBoxes}
                        hale
                        olcu={e.olcu}
                        donmeAcisi={e.donmeAcisi}
                        sesli={e.sesli}
                        ipucu={e.ipucu}
                      />
                    </g>
                  ))}
                </g>
              );
            });
        })()}

        {/* 7.8 EŞİTLİK ÇENTİKLERİ (uzunluk ve yay): eşit uzunluk/yay işaretleri (|, ||, |||). Ölçü rozeti
            değil, Sade'de de çizilir; tıklamayı engellemez; geçişsiz (kaydırırken geride kalmaz). */}
        <EsitlikIsaretleriKatmani
          isaretler={esitlik.isaretler.filter((m) => m.tur !== 'aci')}
          viewport={viewport}
          seciliIdler={selectedObjectIds}
          secimRengi={secimRengi}
          cizgiOlcegi={styleSettings.strokeScale}
          noktalar={esitlikNoktalari}
          noktaYaricapi={styleSettings.pointRadius}
        />

        {/* 7.6 AÇILAR KATMANI — çizgilerin ÜSTÜNDE çizilir: köşeden geçen başka bir kenar açının yayını
            ortadan kesip "iki ayrı açı" gibi göstermesin (kullanıcı isteği). Noktaların altında kalır. */}
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

            // Yay yolu (SVG arc): küçük yay iç açıyı, büyük yay dış açıyı çizer
            // Dar açıda yay büyür (aciYayYaricaplari); 60° ve üstünde 22, dik açı karesi bugünkü boyutta kalır.
            const arcR = (aciYayYaricaplari.get(ang.id) ?? 22) * etiketOlcegi;
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

            // Otomatik rozet görünen yazı boyutuyla yayın yakınına yerleşir;
            // taşınmış rozetin kayıtlı konumu ve tam/kısa yazımı ön geçişten gelir.
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
                {...nesneOlaylari(ang)}
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
                  stroke={isAngleSelected ? secimRengi : ang.color || NESNE_RENGI.kehribar}
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
                      olcek={yaziOlcegi}
                      satirlar={rozet.satirlar}
                      x={rozet.merkez.x}
                      y={rozet.merkez.y}
                      px={fs(11, 'measure')}
                      renk="on"
                      kutu={{ sinif: 'fill-background/90 stroke-border', rx: 6 }}
                      kutuGizli={!styleSettings.showLabelBoxes}
                      olcu={rozet.olcu}
                      sesli={rozet.sesli}
                      ipucu={rozet.ipucu}
                    />
                  </g>
                )}
              </g>
            );
          })}

        {/* 7.9 EŞ AÇI ÇENTİKLERİ: açı yayının ÜSTÜNE çizilir, yoksa yay çentiği ortadan ikiye bölüyor.
            Yarıçap açının KENDİ yayınınkidir (aciYaricaplariPx; dar açıda büyür, dik açıda karenin köşegen ortası). */}
        <EsitlikIsaretleriKatmani
          isaretler={esitlik.isaretler.filter((m) => m.tur === 'aci')}
          viewport={viewport}
          seciliIdler={selectedObjectIds}
          secimRengi={secimRengi}
          cizgiOlcegi={styleSettings.strokeScale}
          noktalar={esitlikNoktalari}
          noktaYaricapi={styleSettings.pointRadius}
          aciYaricapiPx={22 * etiketOlcegi}
          aciYaricaplariPx={aciYaricaplariPx}
        />

        {/* 8. NOKTALAR KATMANI (katmanlar/noktalarVeIzler.tsx) */}
        {noktaKatmani(objects.filter((o): o is PointObject => o.type === 'point' && o.visible), {
          viewport,
          etiketGorunumu,
          seciliMi: (id) => selectedObjectIds.includes(id),
          bekleyenMi: (id) => pendingPointIds.includes(id),
          sade: isSade,
          noktaAraci: activeTool === 'point',
          olculerGorunur: showDetails,
          noktaYaricapi: styleSettings.pointRadius,
          secimRengi,
          imlec: imlecSinifi(activeTool, 'nokta'),
          olaylar: nesneOlaylari,
          kilitliMi: (n) => isPointLocked(n, objects),
          adEtiketi: (id) => olcumEtiketi(id, 'pointLabel', false),
          yaziBoyu: fs,
          yaziOlcegi,
          yerlesimOrani,
          etiketOlcegi,
          engeller: noktaEngelHaritasi,
          oncekiYonler: adYonuRef.current,
        })}

        {/* 9–12. KALEM, KESİR, NOT VE GÖRSEL KATMANLARI (katmanlar/serbestNesneler.tsx) */}
        {kalemKatmani(gorunenler<PenStrokeObject>('pen'), serbestBaglam)}
        {isDrawingPen && kalemOnizlemesi(currentPenStroke, viewport)}
        {kesirKatmani(gorunenler<FractionObject>('fraction'), serbestBaglam)}
        {notKatmani(gorunenler<TextObject>('text'), serbestBaglam)}
        {gorselKatmani(gorunenler<ImageObject>('image'), serbestBaglam)}

        {/* 13. CANLI ÖNİZLEMELER (katmanlar/onizlemeler.tsx): pergel, sürükleyerek oluşturma, tıkla-tıkla araçları,
             Uzunluk Ölç / Birimle Ölç ve kutuyla seçim */}
        {activeTool === 'compass' && pergel && pergelOnizlemesi(pergel, viewport, metinOlcuEtiketi)}
        {dragCreateStart && dragCreateCurrent && surukleOnizlemesi(activeTool, dragCreateStart, dragCreateCurrent, viewport, metinOlcuEtiketi, tamSayiOlcu)}
        {pendingPointIds.length > 0 &&
          tiklaOnizlemesi(activeTool, pendingPointIds.map((id) => pointsById.get(id)), mouseWorldPos, viewport, metinOlcuEtiketi, { ilkokul, tamSayiOlcu })}
        {canliOlcmeAraciMi(activeTool) && pendingPointIds.length === 1 && pointsById.has(pendingPointIds[0]) &&
          olcmeOnizlemesi(activeTool, pointsById.get(pendingPointIds[0])!, mouseWorldPos, viewport, metinOlcuEtiketi, {
            ilkokul,
            birim: activeTool === 'measure_distance' ? uzunlukOlcBirimi(kademe) : 'br',
          })}
        {selectionMarquee && secimKutusu(selectionMarquee, viewport, selectedObjectIds.length)}

        {etiketKilavuzlari && (
          <g data-label-alignment-guides="" pointerEvents="none" aria-hidden="true" stroke="#c026d3" strokeWidth={1} strokeDasharray="4 3">
            {etiketKilavuzlari.xKilavuzu && <line x1={etiketKilavuzlari.xKilavuzu.x} x2={etiketKilavuzlari.xKilavuzu.x} y1={etiketKilavuzlari.xKilavuzu.y1 - 8} y2={etiketKilavuzlari.xKilavuzu.y2 + 8} />}
            {etiketKilavuzlari.yKilavuzu && <line y1={etiketKilavuzlari.yKilavuzu.y} y2={etiketKilavuzlari.yKilavuzu.y} x1={etiketKilavuzlari.yKilavuzu.x1 - 8} x2={etiketKilavuzlari.yKilavuzu.x2 + 8} />}
          </g>
        )}
        <InsaGosterimleri objects={objects} viewport={viewport} />
        </CanvasLayers>

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
            const adlar = generateNextPointLabels(existingPointLabels(), 4);

            addObjects(
              koseliCokgen(dikdortgenKoseleri(x1, y1, x2, y2), adlar, '#10b981', ALAN_MODELI_GORUNUMU),
              `Alan modeli oluşturuldu (${formatTurkishNumber(cols)} x ${formatTurkishNumber(rows)} = ${formatTurkishNumber(cols * rows)} birimkare)`
            );
          }}
        />

        {/* İLKOKUL SİMETRİ KEŞFET: aday doğru, katlanan yarı, örtüşme / örtüşmeyen bölge (uzman 4. tur [178]) */}
        <SimetriSinamaKatmani sinama={simetri} viewport={viewport} imlec={mouseWorldPos} />

      </svg>


      {/* İLKOKUL SİMETRİ KEŞFET ÇUBUĞU: aday doğru → Katla → örtüşme; bulunan simetri doğrularının sayısı (uzman 4. tur [178]) */}
      {activeTool === 'symmetry' && ilkokul && <SimetriSinamaCubugu sinama={simetri} />}

      {/* İLKOKUL YANSIT ÇUBUĞU (simetrik tamamlama): yalnız şekil seçilir; simetri doğrusu dikey ya da yatay (eksen düğmesi yok) */}
      {activeTool === 'reflect' && ilkokul && (() => {
        const hedefId = reflectTargetPolyId || selectedObjectId;
        const sekil = objects.find((o) => o.id === hedefId && o.type === 'polygon') as PolygonObject | undefined;
        const yonSec = (yon: SimetriYonu) => {
          setIlkokulSimetriYonu(yon);
          if (sekil) ilkokulSimetrisiniCiz(sekil, yon);
        };
        return (
          <KayanCubuk konum="ust" data-yansitma-cubugu data-ilkokul-simetri>
            <CubukMetni
              vurgu="lavanta"
              simge={<FlipHorizontal2 className="w-4 h-4" />}
              baslik="Yansıt"
              aciklama={sekil ? 'Simetri doğrusunu seç' : 'Simetriğiyle tamamlamak istediğin şekle dokun'}
            />
            <CubukAyirici />
            <CubukDugmesi tur={ilkokulSimetriYonu === 'dikey' ? 'birincil' : 'normal'} aria-pressed={ilkokulSimetriYonu === 'dikey'} onClick={() => yonSec('dikey')}>
              Dikey simetri doğrusu
            </CubukDugmesi>
            <CubukDugmesi tur={ilkokulSimetriYonu === 'yatay' ? 'birincil' : 'normal'} aria-pressed={ilkokulSimetriYonu === 'yatay'} onClick={() => yonSec('yatay')}>
              Yatay simetri doğrusu
            </CubukDugmesi>
          </KayanCubuk>
        );
      })()}

      {/* YANSITMA VE SİMETRİ EKSENİ SEÇİM ÇUBUĞU */}
      {['reflect', 'symmetry'].includes(activeTool) && !ilkokul && (() => {
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
        const yonerge = aracYonergesi(activeTool, pendingPointIds.length, { ilkokul, uzunlukBirimi: uzunlukOlcBirimi(kademe) });
        if (!yonerge) return null;
        return (
          <KayanCubuk konum="alt" data-yonerge-cubugu>
            <CubukMetni simge={<Info className="w-4 h-4" />} baslik={yonerge.baslik} aciklama={activeTool in INSA_ADIMLARI ? `${yonerge.aciklama} ${INSA_ADIMLARI[activeTool as keyof typeof INSA_ADIMLARI].map((s,i) => `${i+1}) ${s}`).join(' ')}` : yonerge.aciklama} />
            {pendingPointIds.length > 0 && (
              <>
                <CubukAyirici />
                <CubukDugmesi simge={<CarpiSimgesi className="w-4 h-4" />} onClick={cancelPendingAction}>
                  Temizle
                </CubukDugmesi>
              </>
            )}
            {/* Ölçme aracı: sağ tık olmayan dokunmatik tahtada menüye ve Sil'e ulaşma yolu (MeasurementInstruments dinler) */}
            {olcmeAraciMi(activeTool) && (
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
                    color: NESNE_RENGI.zumrut,
                    fillColor: NESNE_RENGI.zumrut,
                    fillOpacity: 0.18,
                    visible: true,
                    showArea: false,
                    showPerimeter: false,
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

      {/* Alt bilgi: köşede yalın metin — çubuk/kutu yok (kullanıcı isteği) */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 text-[11px] font-medium leading-none text-muted-foreground select-none pointer-events-none">
        {/* İlkokulda ondalık imleç konumu gösterilmez (koordinat düzlemi yok) */}
        {!ilkokul && (
          <>
            <span>
              İmleç <span className="font-mono text-foreground">{formatCoordinate(mouseWorldPos)}</span>
            </span>
            <span aria-hidden="true">·</span>
          </>
        )}
        <span>
          Ölçek <span className="font-mono text-foreground">%{Math.round((viewport.zoom / DEFAULT_ZOOM) * 100)}</span>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Nesne <span className="font-mono text-foreground">{objects.length}</span>
        </span>
      </div>

      {/* 2. YAKINLAŞTIR / UZAKLAŞTIR — sağ alt köşe; 3B tuvalde de aynı iki düğme (kullanıcı isteği: yalnız bunlar).
          El, geri al ve yinele sol üstte; ızgara, yapışma, bölge adları, sığdırma ve temizleme Görünüm/Ayarlar
          menülerinde ve sağ tık menüsünde. */}
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
          {/* İpucu HER ZAMAN tam yazımdadır ("Yalnızca değer" yalnızca tuval etiketlerini seyreltir). */}
          <CubukMetni vurgu="altin" simge={<Lightbulb className="w-4 h-4" />} baslik={<MatematikMetni metin={hintMessage} ayar={{ olcuYazimi: 'tam', aciYazimi: yazim.aciYazimi }} className="leading-[1.45]" />} />
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

      {/* 6. NOT PENCERESİ: yeni not ya da var olan notu düzenleme */}
      <TextNoteDialog
        isOpen={isTextDialogOpen}
        onClose={notPenceresindenVazgec}
        initialText={editingTextObj?.text || ''}
        initialColor={editingTextObj?.color || '#0f172a'}
        initialFontSize={editingTextObj?.fontSize || 14}
        onSave={notuKaydet}
        onDelete={editingTextObj ? () => notuSil(editingTextObj) : undefined}
      />

      {/* 6b. ÖLÇÜ ETİKETİ METNİ DİYALOĞU (sağ tık > Etiketi düzenle…) */}
      <EtiketMetniDiyalogu
        acik={etiketDuzenleme !== null}
        metin={etiketDuzenleme?.metin ?? ''}
        elleYazilmis={etiketDuzenleme?.elleYazilmis ?? false}
        onKapat={() => setEtiketDuzenleme(null)}
        onKaydet={(metin) => {
          if (etiketDuzenleme) {
            const sahip = objects.find((o) => o.id === etiketDuzenleme.objectId);
            updateObject(etiketDuzenleme.objectId, { labelTexts: etiketMetniGuncelle(sahip?.labelTexts, etiketDuzenleme.kind, metin) } as Partial<MathObject>);
          }
          setEtiketDuzenleme(null);
        }}
        onHesaplananaDon={() => {
          if (etiketDuzenleme) {
            const sahip = objects.find((o) => o.id === etiketDuzenleme.objectId);
            updateObject(etiketDuzenleme.objectId, { labelTexts: etiketMetniGuncelle(sahip?.labelTexts, etiketDuzenleme.kind, null) } as Partial<MathObject>);
          }
          setEtiketDuzenleme(null);
        }}
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
          ...(!cisimIzdusumuYalnizAd(kademe) ? [{
            id: 'cisim-olculeri',
            label: cisimMenusu && cisimIzdusumOlcumleri[cisimMenusu.solidId] ? 'Ölçüleri gizle' : 'Ölçüleri göster',
            icon: <Ruler className="w-4 h-4" />,
            onSelect: () => {
              if (!cisimMenusu) return;
              const id = cisimMenusu.solidId;
              const goster = !cisimIzdusumOlcumleri[id];
              setCisimIzdusumOlcumleri((prev) => ({ ...prev, [id]: goster }));
              if (goster) {
                setViewport((prev) => prev.showMeasurements === false ? { ...prev, showMeasurements: true } : prev);
                window.dispatchEvent(new Event('geoeba:show-measurements'));
              }
            },
          }] : []),
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
