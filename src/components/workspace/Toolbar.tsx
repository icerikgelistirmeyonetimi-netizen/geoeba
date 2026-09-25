'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspace } from '@/state/WorkspaceContext';
import { ToolMode } from '@/types/workspace';
import {
  MathObject,
  PointObject,
  FunctionObject,
  CircleObject,
  EllipseObject,
  SegmentObject,
  AngleObject,
  SliderObject,
  MeasurementObject,
  PolygonObject,
} from '@/types/math';
import {
  generateNextPointLabel,
  calculateDistance,
  calculateAngleDegrees,
  calculateSlope,
  rightTriangleRatios,
} from '@/math/geometry';
import { formatTurkishNumber } from '@/math/coordinates';
import { arcDetachedText, resolveArc } from '@/math/arcMeasure';
import { metniCozumle, olcuDugumleri, yazimAyari } from '@/math/matematikYazimi';
import { nesnedenNokta } from '@/math/olcuYazimlari';
import { type PanelSatiri, metinSatiri, nesneSatirlari, panelYazimi, satirMetni } from '@/math/panelYazimlari';
import { PanelOlcusu } from './PanelOlcusu';
import { MatematikMetni } from './MatematikMetni';
import { YazimKopyala } from './YazimKopyala';
import { validateMathExpression, extractVariableNames, compileMathExpression, evaluateNumericInput } from '@/math/parser';
import { functionDefinitionCycle, functionNameOwner, relabelFunction, undefinedFunctionCalls } from '@/math/functionNames';
import {
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Calculator,
  Shapes,
  Eye,
  EyeOff,
  Plus,
  Check,
  X,
  AlertCircle,
  Keyboard,
  ChevronsUpDown,
  Layers,
  Sparkles,
  LayoutGrid,
  Box,
  Columns2,
  Columns3,
  PanelLeft,
  PanelRight,
  Lock,
  Unlock,
  Copy,
  SlidersHorizontal,
  Square,
  Circle,
  MousePointer,
  Pencil,
} from 'lucide-react';
import { TOOL_SHORTCUTS } from './toolShortcuts';
import { TOOL_GROUPS } from './toolDefinitions';
import { TREE_TOOL_GROUPS, TreeToolItem } from './treeToolDefinitions';
import { gruplariSuz, grupAcikliklari } from './sinifDuzeyleri';
import { SinifAramaBosNotu, SinifSuzgeciSeridi } from './SinifSuzgeci';
import { useSinifDuzeyi } from '@/hooks/useSinifDuzeyi';
import { MathKeypad } from '@/components/workspace/MathKeypad';
import { LayoutMode } from './PropertiesPanel';

interface ToolbarProps {
  onSelectTool?: (tool: ToolMode) => void;
  onOpenFunctionDialog?: () => void;
  onOpenSliderDialog?: () => void;
  /**
   * 2D "Nesne ekle" diyaloğunu açar. Verilmezse düğme gösterilmez.
   * (WorkspaceView bu prop'u geçtiğinde AddObjectModal'ın 2D sekmeleri erişilebilir olur.)
   */
  onOpenAddObjectDialog?: () => void;
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
}

/** Araç panelinin daraltma/kapatma tercihi bu anahtarla saklanır. */
const PANEL_KAPALI_ANAHTARI = 'geoeba_arac_paneli_kapali_v1';

const TABLE_ROWS = 10;
const TABLE_COLS = 3;
const COLUMN_LETTERS = ['A', 'B', 'C'];

// Hücre biçimleri: "(2, 3)", "(2; 3)", "2,5" (Türkçe ondalık) veya "(1,5; 2)"
const NUMBER_PATTERN = '[-+]?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)';
const COORD_REGEX = new RegExp(`^\\s*\\(?\\s*(${NUMBER_PATTERN})\\s*[;,]\\s*(${NUMBER_PATTERN})\\s*\\)?\\s*$`);
const NUM_REGEX = new RegExp(`^\\s*(${NUMBER_PATTERN})\\s*$`);

const parseCell = (raw: string): number => parseFloat(raw.replace(',', '.'));

/**
 * "(1,5, 2)" gibi girdilerde ondalık virgül ile ayırıcı virgül karışabilir;
 * bu durumda yalnızca ";" veya boşluk+virgül ayırıcı kabul edilir.
 */
function matchCoordinate(raw: string): [number, number] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const m = trimmed.match(COORD_REGEX);
  if (!m) return null;
  const a = parseCell(m[1]);
  const b = parseCell(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
}

function matchNumber(raw: string): number | null {
  const m = raw.trim().match(NUM_REGEX);
  if (!m) return null;
  const n = parseCell(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function Toolbar({
  onSelectTool,
  onOpenFunctionDialog,
  onOpenSliderDialog,
  onOpenAddObjectDialog,
  layoutMode = '2d_only',
  onLayoutModeChange,
}: ToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    objects,
    updateObject,
    deleteObject,
    addObject,
    addFunction,
    assignSliderValue,
    setHintMessage,
    setCircleRadius,
    setSegmentLength,
    setAngleDegrees,
    pendingPointIds,
    requestClearAll,
    openRegularPolygonDialog,
    recordHistory,
    selectedObjectId,
    setSelectedObjectId,
    styleSettings,
  } = useWorkspace();

  const [toolSearch, setToolSearch] = useState('');
  // Sınıf düzeyi (menü çubuğundaki "Sınıf" menüsü): panel yalnız o sınıfın kazanımlarındaki araçları gösterir.
  // Yalnız görünürlük süzülür; yazılı / sesli komutlar ve klavye kısayolları bütün araçlarla çalışır.
  const [sinifDuzeyi, setSinifDuzeyi] = useSinifDuzeyi();
  const aracGruplari = useMemo(() => gruplariSuz(TREE_TOOL_GROUPS, sinifDuzeyi), [sinifDuzeyi]);
  const [objectSearch, setObjectSearch] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'araclar' | 'nesneler' | 'baglamlar' | 'gorunumler' | 'ara'>('araclar');
  const [layoutTooltip, setLayoutTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const selectedObject = objects.find((o) => o.id === selectedObjectId);

  // Cebir Input State
  const [algebraInput, setAlgebraInput] = useState('');
  /** Hesap makinesi çizelgesi açık mı? */
  const [klavyeAcik, setKlavyeAcik] = useState(false);
  const algebraInputRef = useRef<HTMLInputElement>(null);
  const [algebraError, setAlgebraError] = useState<string | null>(null);

  // Cebir listesinde satır içi düzenleme (fonksiyon ifadesi / nokta koordinatı)
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<{ a: string; b: string }>({ a: '', b: '' });
  const [rowError, setRowError] = useState<string | null>(null);

  const cancelRowEdit = () => {
    setEditingRowId(null);
    setRowError(null);
  };

  /**
   * Cebir listesinde bir satırın hangi alanlarının düzenlenebileceğini tarif eder.
   * Böylece nokta, çember, elips, doğru parçası ve açı aynı arayüzü paylaşır:
   * kullanıcı değere tıklar, sayıyı yazar, Enter'a basar.
   */
  type SatirBicimi =
    | { mod: 'ifade'; aEtiket: string }
    | { mod: 'tekli'; aEtiket: string; birim: string }
    | { mod: 'ikili'; aEtiket: string; bEtiket: string; ayirac: string };

  const satirBicimi = (obj: MathObject): SatirBicimi | null => {
    switch (obj.type) {
      case 'function':
        return { mod: 'ifade', aEtiket: 'Fonksiyon ifadesi' };
      case 'point':
        return { mod: 'ikili', aEtiket: 'x koordinatı', bEtiket: 'y koordinatı', ayirac: ';' };
      case 'ellipse':
        return { mod: 'ikili', aEtiket: 'Yatay yarıçap (a)', bEtiket: 'Dikey yarıçap (b)', ayirac: '×' };
      case 'circle':
        return { mod: 'tekli', aEtiket: 'Yarıçap', birim: 'br' };
      case 'segment':
        return { mod: 'tekli', aEtiket: 'Uzunluk', birim: 'br' };
      case 'angle':
        return { mod: 'tekli', aEtiket: 'Açı', birim: '°' };
      case 'slider':
        return { mod: 'tekli', aEtiket: 'Değer', birim: '' };
      default:
        return null;
    }
  };

  /** Bir nesnenin çember/yay yarıçapı: merkez ile yarıçap noktası arasındaki uzaklık. */
  const cemberYaricapi = (circ: CircleObject): number => {
    if (typeof circ.fixedRadius === 'number') return circ.fixedRadius;
    const merkez = objects.find((o) => o.id === circ.centerPointId && o.type === 'point') as
      | PointObject
      | undefined;
    const yari = objects.find((o) => o.id === circ.radiusPointId && o.type === 'point') as
      | PointObject
      | undefined;
    if (!merkez || !yari) return 0;
    return Math.hypot(yari.x - merkez.x, yari.y - merkez.y);
  };

  const startRowEdit = (obj: MathObject) => {
    setRowError(null);
    const bicim = satirBicimi(obj);
    if (!bicim) return;
    if (obj.type === 'function') {
      setRowDraft({ a: (obj as FunctionObject).expression, b: '' });
    } else if (obj.type === 'point') {
      const pt = obj as PointObject;
      setRowDraft({ a: formatTurkishNumber(pt.x, 4), b: formatTurkishNumber(pt.y, 4) });
    } else if (obj.type === 'ellipse') {
      const e = obj as EllipseObject;
      setRowDraft({ a: formatTurkishNumber(e.radiusX, 4), b: formatTurkishNumber(e.radiusY, 4) });
    } else if (obj.type === 'circle') {
      setRowDraft({ a: formatTurkishNumber(cemberYaricapi(obj as CircleObject), 4), b: '' });
    } else if (obj.type === 'segment') {
      const seg = obj as SegmentObject;
      const p1 = objects.find((o) => o.id === seg.startPointId) as PointObject | undefined;
      const p2 = objects.find((o) => o.id === seg.endPointId) as PointObject | undefined;
      const uz = p1 && p2 ? Math.hypot(p2.x - p1.x, p2.y - p1.y) : 0;
      setRowDraft({ a: formatTurkishNumber(uz, 4), b: '' });
    } else if (obj.type === 'slider') {
      setRowDraft({ a: formatTurkishNumber((obj as SliderObject).value, 4), b: '' });
    } else if (obj.type === 'angle') {
      const a = obj as AngleObject;
      const p1 = objects.find((o) => o.id === a.point1Id) as PointObject | undefined;
      const v = objects.find((o) => o.id === a.vertexPointId) as PointObject | undefined;
      const p3 = objects.find((o) => o.id === a.point3Id) as PointObject | undefined;
      const derece = p1 && v && p3 ? calculateAngleDegrees(p1, v, p3) : 0;
      setRowDraft({ a: formatTurkishNumber(Math.round(derece), 4), b: '' });
    }
    setEditingRowId(obj.id);
  };

  /** Türkçe ondalık virgülü kabul eden sayı okuyucu. */
  /** Sahnedeki kaydırıcıların o anki değerleri: "a", "2*a" gibi girişler için kapsam. */
  const kaydiriciKapsami = (): Record<string, number> => {
    const kapsam: Record<string, number> = {};
    for (const o of objects) {
      if (o.type === 'slider') kapsam[(o as SliderObject).variableName] = (o as SliderObject).value;
    }
    return kapsam;
  };

  /**
   * Alana yazılanı sayıya çevirir. Düz sayı da olabilir ("3", "7,5"),
   * kaydırıcı adı veya ifade de ("a", "2*a", "pi/2", "sqrt(2)").
   * Hata varsa satırdaki uyarıya yazılır ve null döner.
   */
  const sayiOku = (raw: string): number | null => {
    const kapsam = kaydiriciKapsami();
    const sonuc = evaluateNumericInput(raw, kapsam);
    if (!sonuc.ok) {
      setRowError(sonuc.error);
      return null;
    }
    // Kaydırıcıya dayalı bir ifade yazıldıysa değerin ANLIK olduğunu söyle:
    // kaydırıcı sonradan oynatılınca bu değer kendiliğinden güncellenmez.
    const kullanilan = Object.keys(kapsam).filter((ad) =>
      new RegExp(`(^|[^a-zçğıöşü0-9])${ad}([^a-zçğıöşü0-9]|$)`, 'i').test(raw)
    );
    if (kullanilan.length > 0) {
      setHintMessage(
        `${raw.trim()} = ${formatTurkishNumber(sonuc.value)} olarak hesaplandı. ` +
          `Bu bir anlık değerdir: ${kullanilan.join(', ')} kaydırıcısını oynatınca kendiliğinden güncellenmez.`
      );
    }
    return sonuc.value;
  };

  const commitRowEdit = (obj: MathObject) => {
    if (obj.type === 'function') {
      const ifade = rowDraft.a.trim();
      if (!ifade) {
        setRowError('İfade boş olamaz.');
        return;
      }
      const dogrulama = validateMathExpression(ifade);
      if (!dogrulama.ok) {
        setRowError(dogrulama.error);
        return;
      }
      updateObject(obj.id, { expression: ifade, label: relabelFunction(obj, ifade, objects) });
      cancelRowEdit();
      return;
    }
    if (obj.type === 'point') {
      const x = sayiOku(rowDraft.a);
      const y = sayiOku(rowDraft.b);
      if (x === null || y === null) return; // hata mesajını sayiOku yazdı
      updateObject(obj.id, { x, y });
      cancelRowEdit();
      return;
    }
    if (obj.type === 'ellipse') {
      const a = sayiOku(rowDraft.a);
      const b = sayiOku(rowDraft.b);
      if (a === null || b === null) return;
      if (a <= 0 || b <= 0) {
        setRowError('a ve b sıfırdan büyük olmalı.');
        return;
      }
      updateObject(obj.id, { radiusX: a, radiusY: b } as Partial<MathObject>);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'circle') {
      const r = sayiOku(rowDraft.a);
      if (r === null) return;
      if (r <= 0) {
        setRowError('Yarıçap sıfırdan büyük olmalı.');
        return;
      }
      setCircleRadius(obj.id, r);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'segment') {
      const uz = sayiOku(rowDraft.a);
      if (uz === null) return;
      if (uz <= 0) {
        setRowError('Uzunluk sıfırdan büyük olmalı.');
        return;
      }
      setSegmentLength(obj.id, uz);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'slider') {
      const v = sayiOku(rowDraft.a);
      if (v === null) return; // hata mesajını sayiOku yazdı
      assignSliderValue((obj as SliderObject).variableName, v);
      cancelRowEdit();
      return;
    }
    if (obj.type === 'angle') {
      const d = sayiOku(rowDraft.a);
      if (d === null) return;
      if (d <= 0 || d >= 360) {
        setRowError('Açı 0 ile 360 arasında olmalı.');
        return;
      }
      setAngleDegrees(obj.id, d);
      cancelRowEdit();
      return;
    }
    cancelRowEdit();
  };

  // Spreadsheet Tablo Verileri: 10 Satır x 3 Sütun (A, B, C)
  const [tableData, setTableData] = useState<string[][]>(
    Array.from({ length: TABLE_ROWS }, () => Array.from({ length: TABLE_COLS }, () => ''))
  );

  // Sol araç paneli daraltma/kapatma durumu (kulakçık butonu ile açılıp kapanabilir)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  useEffect(() => {
    try {
      setIsPanelCollapsed(window.matchMedia('(max-width: 640px)').matches || localStorage.getItem(PANEL_KAPALI_ANAHTARI) === '1');
    } catch {
      setIsPanelCollapsed(window.matchMedia('(max-width: 640px)').matches);
    }
  }, []);

  const togglePanelCollapse = () => {
    setIsPanelCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PANEL_KAPALI_ANAHTARI, next ? '1' : '0');
      } catch {
        /* yoksay */
      }
      return next;
    });
  };

  // Ağaç menü gruplarının açma/kapama durumu
  const [expandedTreeGroups, setExpandedTreeGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TREE_TOOL_GROUPS.map((g) => [g.id, g.defaultExpanded ?? true]))
  );

  // Sınıf değişince (ve açılışta) gruplar yeniden açılır/kapanır: az araçlı sınıflarda hepsi açık gelir
  useEffect(() => {
    setExpandedTreeGroups(grupAcikliklari(TREE_TOOL_GROUPS, sinifDuzeyi));
  }, [sinifDuzeyi]);

  const toggleTreeGroup = (groupId: string) => {
    setExpandedTreeGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const toggleAllTreeGroups = () => {
    // Yalnız panelde görünen gruplara bakılır (sınıf süzgecinin boşalttığı gruplar sayılmaz)
    const allExpanded = aracGruplari.every((g) => expandedTreeGroups[g.id] !== false);
    const nextState = !allExpanded;
    setExpandedTreeGroups(
      Object.fromEntries(TREE_TOOL_GROUPS.map((g) => [g.id, nextState]))
    );
  };

  const handleToolClick = (toolId: ToolMode) => {
    if (onSelectTool) { onSelectTool(toolId); return; }
    if (toolId === 'function') {
      onOpenFunctionDialog?.();
      return;
    }
    if (toolId === 'slider') {
      onOpenSliderDialog?.();
      return;
    }
    if (toolId === 'regular_polygon') {
      setActiveTool('regular_polygon');
      openRegularPolygonDialog();
      return;
    }
    setActiveTool(toolId);
  };

  /**
   * Klavye tuşundan gelen metni İMLECİN bulunduğu yere yazar.
   * `geri` kadar imleci geri alır: sin() yazınca imleç parantezin içinde kalsın diye.
   */
  const klavyeEkle = (metin: string, geri = 0) => {
    const el = algebraInputRef.current;
    const bas = el?.selectionStart ?? algebraInput.length;
    const son = el?.selectionEnd ?? algebraInput.length;
    const yeni = algebraInput.slice(0, bas) + metin + algebraInput.slice(son);
    setAlgebraInput(yeni);
    if (algebraError) setAlgebraError(null);
    const imlec = bas + metin.length - geri;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(imlec, imlec);
    });
  };

  /** İmlecin solundaki karakteri siler (seçim varsa seçimi siler). */
  const klavyeSil = () => {
    const el = algebraInputRef.current;
    const bas = el?.selectionStart ?? algebraInput.length;
    const son = el?.selectionEnd ?? algebraInput.length;
    const kesBas = bas === son ? Math.max(0, bas - 1) : bas;
    const yeni = algebraInput.slice(0, kesBas) + algebraInput.slice(son);
    setAlgebraInput(yeni);
    if (algebraError) setAlgebraError(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(kesBas, kesBas);
    });
  };

  /**
   * "a = 2" gibi bir ATAMA mı yazıldı? Öyleyse değişken adı ve sağ tarafı döndürür.
   *
   * GeoGebra'da cebir girişine "a = 2" yazmak kaydırıcı üretir; burada da öyle olmalı.
   * Ama "y = x^2" bir FONKSİYON tanımıdır: sağ taraf x'e bağlıysa ya da sol taraf y ise
   * atama değil fonksiyon sayılır.
   */
  const atamayiCoz = (
    ifade: string
  ): { tur: 'kaydirici'; ad: string; sag: string } | { tur: 'fonksiyon'; ad?: string; sag: string } | null => {
    // f(x) = ... biçimi doğrudan fonksiyondur; adı korunur ("g(x) = f(x) + 1")
    const fonksiyonTanimi = /^\s*([a-zçğıöşü][a-zçğıöşü0-9]?)\s*\(\s*x\s*\)\s*=\s*(.+)$/i.exec(ifade);
    if (fonksiyonTanimi) return { tur: 'fonksiyon', ad: fonksiyonTanimi[1].toLowerCase(), sag: fonksiyonTanimi[2].trim() };

    const atama = /^\s*([a-zçğıöşü][a-zçğıöşü0-9]?)\s*=\s*(.+)$/i.exec(ifade);
    if (!atama) return null;

    const ad = atama[1].toLocaleLowerCase('tr');
    const sag = atama[2].trim();
    if (sag.includes('=')) return null; // "a = b = 2" gibi çoklu atama desteklenmiyor

    // Sağ taraf x'e bağlıysa ya da sol taraf y ise bu bir fonksiyon tanımıdır
    const degiskenler = extractVariableNames(sag);
    if (ad === 'y' || degiskenler.includes('x')) return { tur: 'fonksiyon', sag };
    return { tur: 'kaydirici', ad, sag };
  };

  /** Girişteki ifadeyi doğrular ve tuvale ekler. Hem Enter hem klavyedeki ↵ buradan geçer. */
  const algebraGonder = () => {
    const expr = algebraInput.trim();
    if (!expr) {
      setAlgebraError('Bir ifade girin. Örn: x^2 - 2  ya da  a = 2');
      return;
    }

    const cozum = atamayiCoz(expr);

    // 1) Kaydırıcı ataması: "a = 2", "k = 3/4", "m = 2*a" …
    if (cozum && cozum.tur === 'kaydirici') {
      const bilinen = objects
        .filter((o) => o.type === 'slider')
        .map((o) => (o as SliderObject).variableName);
      const dogrulama = validateMathExpression(cozum.sag, bilinen);
      if (!dogrulama.ok) {
        setAlgebraError(dogrulama.error);
        return;
      }
      const hesapla = compileMathExpression(cozum.sag, bilinen);
      const kapsam: Record<string, number> = {};
      for (const o of objects) {
        if (o.type === 'slider') kapsam[(o as SliderObject).variableName] = (o as SliderObject).value;
      }
      const deger = hesapla ? hesapla(0, kapsam) : NaN;
      if (!Number.isFinite(deger)) {
        setAlgebraError('Sağ taraf bir sayıya eşit olmalı. Örn: a = 2 veya a = 3/4');
        return;
      }
      assignSliderValue(cozum.ad, Number(deger.toFixed(6)));
      setAlgebraInput('');
      setAlgebraError(null);
      return;
    }

    // Eşittir içeren ama tanınmayan girdiler: ayrıştırıcının "Geçersiz karakter" uyarısı
    // burada yanıltıcı olurdu; kullanıcıya ne yazması gerektiğini söyleyelim.
    if (!cozum && expr.includes('=')) {
      setAlgebraError(
        'Atamayı "değişken = sayı" biçiminde yazın (örn. a = 2). Fonksiyon için "y = x^2" ya da doğrudan "x^2" yazabilirsiniz.'
      );
      return;
    }

    // 2) Fonksiyon tanımı: "g(x) = x^2" adıyla eklenir, aynı adlı fonksiyon varsa yeniden tanımlanır.
    //    "y = x^2" ve yalnız "x^2" sıradaki boş adı alır (f, g, h …).
    const ifade = cozum && cozum.tur === 'fonksiyon' ? cozum.sag : expr;
    const ad = cozum && cozum.tur === 'fonksiyon' ? cozum.ad : undefined;
    const validation = validateMathExpression(ifade);
    if (!validation.ok) {
      setAlgebraError(validation.error);
      return;
    }
    const dongu = ad ? functionDefinitionCycle(objects, ad, ifade) : null;
    if (dongu) {
      setAlgebraError(`${ad}(x) kendisine bağlı olamaz: ${dongu.map((n) => `${n}(x)`).join(' → ')}.`);
      return;
    }
    const tanimsiz = undefinedFunctionCalls(objects, ifade, ad);
    if (tanimsiz.length > 0) {
      setAlgebraError(`${tanimsiz[0]}(x) tanımlı değil. Önce ${tanimsiz[0]}(x) = … yazın; çarpma için ${tanimsiz[0]}*(…) kullanın.`);
      return;
    }
    const sahip = ad ? functionNameOwner(objects, ad) : undefined;
    if (sahip && sahip.type !== 'function') {
      setAlgebraError(`"${ad}" adı bir kaydırıcıda kullanılıyor. Fonksiyona başka bir ad verin (örn. g(x) = …).`);
      return;
    }
    if (sahip) {
      const kaydiricilar = new Set(
        objects.filter((o) => o.type === 'slider').map((o) => (o as SliderObject).variableName)
      );
      for (const eksik of extractVariableNames(ifade)) {
        if (!kaydiricilar.has(eksik)) assignSliderValue(eksik, 1);
      }
      updateObject(sahip.id, { expression: ifade, label: `${ad}(x) = ${ifade}`, visible: true });
    } else {
      addFunction(ifade, ad ? `${ad}(x) = ${ifade}` : undefined);
    }
    setAlgebraInput('');
    setAlgebraError(null);
  };

  // Cebir girişi: doğrulama ve ekleme tek yerde (algebraGonder) yapılır
  const handleAlgebraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    algebraGonder();
  };

  // Hesap tablosundan geçerli bir PointObject üretir (etiket sıradaki boş harf)
  const createSheetPoint = (
    id: string,
    x: number,
    y: number,
    color: string,
    usedLabels: string[]
  ): PointObject => {
    const label = generateNextPointLabel(usedLabels);
    usedLabels.push(label);
    return {
      id,
      type: 'point',
      label,
      showLabel: true,
      isIndependent: true,
      x,
      y,
      color,
      visible: true,
      createdAt: Date.now(),
    };
  };

  // Hücrede yazarken her tuş vuruşu ayrı bir geçmiş adımı üretmesin diye nokta
  // taşımaları geçmişe yazılmadan uygulanır; düzenleme bitince (odak kaybı) tek
  // bir geçmiş adımı kaydedilir. Böylece Geri Al tablo değişikliğini de geri alır.
  const hasUncommittedTableEditRef = useRef(false);

  const commitTableEdit = () => {
    if (!hasUncommittedTableEditRef.current) return;
    hasUncommittedTableEditRef.current = false;
    recordHistory('Hesap tablosu güncellendi');
  };

  // Spreadsheet Hücre Değişimi & Nokta Çizme
  const handleTableCellChange = (rowIdx: number, colIdx: number, val: string) => {
    const newData = tableData.map((row, rIdx) =>
      rIdx === rowIdx ? row.map((cell, cIdx) => (cIdx === colIdx ? val : cell)) : row
    );
    setTableData(newData);

    const usedLabels = objects.filter((o) => o.type === 'point').map((o) => o.label);
    const upsertPoint = (pointId: string, x: number, y: number, color: string) => {
      const existing = objects.find((o) => o.id === pointId);
      if (existing && existing.type === 'point') {
        if (existing.x !== x || existing.y !== y) {
          updateObject(pointId, { x, y } as Partial<PointObject>, false);
          hasUncommittedTableEditRef.current = true;
        }
      } else {
        addObject(createSheetPoint(pointId, x, y, color, usedLabels), 'Hesap tablosundan nokta eklendi');
        hasUncommittedTableEditRef.current = false;
      }
    };
    const removePoint = (pointId: string) => {
      if (objects.some((o) => o.id === pointId)) {
        deleteObject(pointId);
        hasUncommittedTableEditRef.current = false;
      }
    };

    // Yalnızca değişen satırı işle
    const r = rowIdx;
    const row = newData[r];

    // A ve B sütunları birlikte bir nokta: (A, B)
    const rowPointId = `spreadsheet-row-point-${r}`;
    const xVal = matchNumber(row[0]);
    const yVal = matchNumber(row[1]);
    if (xVal !== null && yVal !== null) {
      upsertPoint(rowPointId, xVal, yVal, '#3b82f6');
    } else {
      removePoint(rowPointId);
    }

    // Her hücre tek başına "(x, y)" koordinatı olabilir
    for (let c = 0; c < TABLE_COLS; c++) {
      const cellPointId = `spreadsheet-point-${r}-${c}`;
      const coord = matchCoordinate(row[c]);
      if (coord) {
        upsertPoint(cellPointId, coord[0], coord[1], '#6366f1');
      } else {
        removePoint(cellPointId);
      }
    }
  };

  // Nesne listesindeki ölçüler tuvalle AYNI MEB yazımını kullanır (|AB| = 5 br, m(ABC^) = 60°,
  // A(ABC) = 6 br²); adlar yalnızca görünen nokta adlarından kurulur (panelYazimlari.ts).
  const nokta = useMemo(() => nesnedenNokta(objects), [objects]);
  const yazim = useMemo(() => panelYazimi(styleSettings), [styleSettings]);

  /** Tek satıra sığan özet: nesnenin en ayırt edici bir ya da iki ölçüsü. */
  const nesneOzeti = (obj: MathObject): PanelSatiri[] => {
    if (obj.type === 'measurement') {
      const m = obj as MeasurementObject;
      if (m.kind === 'arc') {
        const y = m.circleId
          ? resolveArc({ circleId: m.circleId, pointIds: m.pointIds, startPointId: m.startPointId, throughPointId: m.throughPointId, major: m.major }, objects)
          : null;
        const uyari = y ? arcDetachedText(y, objects) : null;
        if (uyari) return [metinSatiri(uyari)];
      }
      return nesneSatirlari(obj, objects, nokta).slice(0, 2);
    }
    const satirlar = nesneSatirlari(obj, objects, nokta);
    // Elipste a ve b (üçüncü satır) listede yarıçaplardan daha bilgilendirici.
    if (obj.type === 'ellipse') return satirlar.slice(2, 3);
    if (obj.type === 'arc' || obj.type === 'sector') return satirlar.slice(0, 2);
    return satirlar.slice(0, 1);
  };

  /** Arama süzgeci ve başlık (title) için özetin düz metni. */
  const getObjectDetails = (obj: MathObject): string => nesneOzeti(obj).map(satirMetni).join(' · ');

  /** Özetin MEB yazımıyla çizilmiş hali (şapka, yay imi, mutlak değer çizgisi). */
  const nesneOzetiYazimi = (obj: MathObject) =>
    nesneOzeti(obj).map((s, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span aria-hidden="true"> · </span>}
        <PanelOlcusu satir={s} ayar={yazim} metinSinifi="font-mono" />
      </React.Fragment>
    ));

  const PRESET_COLORS = [
    { name: 'Mavi', hex: '#3b82f6' },
    { name: 'İndigo', hex: '#6366f1' },
    { name: 'Zümrüt', hex: '#10b981' },
    { name: 'Kırmızı', hex: '#ef4444' },
    { name: 'Kehribar', hex: '#f59e0b' },
    { name: 'Mor', hex: '#8b5cf6' },
    { name: 'Camgöbeği', hex: '#06b6d4' },
    { name: 'Koyu', hex: '#334155' },
  ];

  const LAYOUT_OPTIONS: Array<{
    mode: LayoutMode;
    name: string;
    badge: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      mode: '2d_only',
      name: '2D Düzlem',
      badge: '2D',
      description: 'Yalnızca 2 boyutlu geometri çizim alanı',
      icon: <Square className="w-5 h-5 text-ada-deniz dark:text-ada-vurgu" />,
    },
    {
      mode: '3d_only',
      name: '3D Uzay',
      badge: '3D',
      description: 'Yalnızca 3 boyutlu katı cisim ve uzay stüdyosu',
      icon: <Box className="w-5 h-5 text-ada-lavanta" />,
    },
    {
      mode: '2d_3d',
      name: '2D + 3D',
      badge: '2D + 3D',
      description: 'Sol tarafta 2D çizim, sağ tarafta 3D uzay yan yana',
      icon: <Columns2 className="w-5 h-5 text-ada-vurgu" />,
    },
    {
      mode: 'default',
      name: 'Cebir',
      badge: 'Cebir',
      description: 'Cebirsel ifadeler ve fonksiyonlar çalışma alanı',
      icon: <Calculator className="w-5 h-5 text-ada-deniz-koyu dark:text-ada-vurgu" />,
    },
    {
      mode: 'algebra_2d',
      name: '2D + Cebir',
      badge: '2D + Cebir',
      description: '2D geometri düzlemi ile cebir giriş paneli',
      icon: <PanelLeft className="w-5 h-5 text-ada-altin dark:text-ada-fener" />,
    },
    {
      mode: 'algebra_3d',
      name: '3D + Cebir',
      badge: '3D + Cebir',
      description: '3D uzay stüdyosu ile cebir giriş paneli',
      icon: <PanelRight className="w-5 h-5 text-ada-mercan" />,
    },
    {
      mode: 'three_col',
      name: '2D + 3D + Cebir',
      badge: 'Üçü Bir Arada',
      description: 'Cebir listesi, 2D geometri ve 3D uzay üç sütun halinde',
      icon: <Columns3 className="w-5 h-5 text-ada-murekkep-2 dark:text-ada-kum" />,
    },
  ];

  const filteredObjects = objects.filter((obj) => {
    if (!objectSearch.trim()) return true;
    const q = objectSearch.trim().toLocaleLowerCase('tr');
    const label = (obj.label || '').toLocaleLowerCase('tr');
    const details = getObjectDetails(obj).toLocaleLowerCase('tr');
    const type = obj.type.toLocaleLowerCase('tr');
    return label.includes(q) || details.includes(q) || type.includes(q);
  });

  const getExistingPointLabels = () => objects.map((o) => o.label || '').filter(Boolean);

  const addPointReflectOrigin = (pt: PointObject) => {
    const label = generateNextPointLabel(getExistingPointLabels());
    addObject({
      id: `point-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'point',
      x: -pt.x,
      y: -pt.y,
      label,
      color: pt.color || '#3b82f6',
      size: pt.size || 5,
      isIndependent: true,
      visible: true,
      showLabel: true,
      createdAt: Date.now(),
    });
    setHintMessage(`${label} noktası (${formatTurkishNumber(-pt.x, 2)}; ${formatTurkishNumber(-pt.y, 2)}) orijine göre simetrik olarak eklendi.`);
  };

  const addPointReflectX = (pt: PointObject) => {
    const label = generateNextPointLabel(getExistingPointLabels());
    addObject({
      id: `point-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'point',
      x: pt.x,
      y: -pt.y,
      label,
      color: pt.color || '#3b82f6',
      size: pt.size || 5,
      isIndependent: true,
      visible: true,
      showLabel: true,
      createdAt: Date.now(),
    });
    setHintMessage(`${label} noktası (${formatTurkishNumber(pt.x, 2)}; ${formatTurkishNumber(-pt.y, 2)}) x eksenine göre simetrik olarak eklendi.`);
  };

  const addPointReflectY = (pt: PointObject) => {
    const label = generateNextPointLabel(getExistingPointLabels());
    addObject({
      id: `point-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'point',
      x: -pt.x,
      y: pt.y,
      label,
      color: pt.color || '#3b82f6',
      size: pt.size || 5,
      isIndependent: true,
      visible: true,
      showLabel: true,
      createdAt: Date.now(),
    });
    setHintMessage(`${label} noktası (${formatTurkishNumber(-pt.x, 2)}; ${formatTurkishNumber(pt.y, 2)}) y eksenine göre simetrik olarak eklendi.`);
  };

  const addSegmentMidpoint = (seg: SegmentObject) => {
    const p1 = objects.find((o) => o.id === seg.startPointId && o.type === 'point') as PointObject | undefined;
    const p2 = objects.find((o) => o.id === seg.endPointId && o.type === 'point') as PointObject | undefined;
    if (!p1 || !p2) return;
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const label = generateNextPointLabel(getExistingPointLabels());
    addObject({
      id: `point-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'point',
      x: mx,
      y: my,
      label,
      color: '#10b981',
      size: 5,
      isIndependent: true,
      visible: true,
      showLabel: true,
      createdAt: Date.now(),
    });
    setHintMessage(`[${p1.label}${p2.label}] doğru parçasının orta noktası ${label} eklendi.`);
  };

  const addPolygonCentroid = (poly: PolygonObject) => {
    const pts = (poly.pointIds || [])
      .map((id) => objects.find((o) => o.id === id && o.type === 'point') as PointObject | undefined)
      .filter(Boolean) as PointObject[];
    if (pts.length < 3) return;
    const avgX = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
    const avgY = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
    const label = 'G';
    addObject({
      id: `point-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'point',
      x: avgX,
      y: avgY,
      label,
      color: '#8b5cf6',
      size: 6,
      isIndependent: true,
      visible: true,
      showLabel: true,
      createdAt: Date.now(),
    });
    setHintMessage(`${poly.label || 'Çokgenin'} ağırlık merkezi ${label} (${formatTurkishNumber(avgX, 2)}; ${formatTurkishNumber(avgY, 2)}) eklendi.`);
  };

  const duplicateObject = (obj: MathObject) => {
    if (obj.type === 'point') {
      const pt = obj as PointObject;
      const label = generateNextPointLabel(getExistingPointLabels());
      addObject({
        ...pt,
        id: `point-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        x: pt.x + 1,
        y: pt.y + 1,
        label,
        createdAt: Date.now(),
      });
      setHintMessage(`${label} noktası çoğaltıldı.`);
    } else {
      setHintMessage(`Nesne kopyalandı.`);
    }
  };

  const normalizedSearch = toolSearch.trim().toLocaleLowerCase('tr');
  /** Araç adı ya da açıklaması aramayla eşleşiyor mu? (Boş arama her aracı kapsar.) */
  const aramayaUyar = (tool: TreeToolItem) =>
    normalizedSearch === '' ||
    tool.name.toLocaleLowerCase('tr').includes(normalizedSearch) ||
    tool.description.toLocaleLowerCase('tr').includes(normalizedSearch);
  /** Sınıf süzgecinden geçen ve aramayla eşleşen araç sayısı */
  const gorunenSonucSayisi = aracGruplari.reduce((toplam, g) => toplam + g.tools.filter(aramayaUyar).length, 0);
  /** Arama yalnız sınıf süzgeci yüzünden mi boş kaldı? (Araç bütün araçlar arasında var.) */
  const suzgecAramayiGizledi = gorunenSonucSayisi === 0 && TREE_TOOL_GROUPS.some((g) => g.tools.some(aramayaUyar));
  const tumAraclaraDon = () => setSinifDuzeyi('tum');

  return (
    <div className="flex h-full min-h-0 bg-card/95 backdrop-blur-md border-r border-border select-none z-30 shadow-sm shrink-0 relative">

      {/* 1. SOL DİKEY MENÜ SEÇİCİ */}
      <div className="w-[68px] shrink-0 h-full border-r border-border flex flex-col items-center py-4 justify-between bg-muted/60">
        {/* Üst Kısım: Araçlar, Nesneler, Bağlamlar, Görünümler Butonları */}
        <div className="flex flex-col items-center gap-3 w-full px-1">
          {/* 1. Araçlar Sekmesi (Varsayılan) */}
          <button
            onClick={() => {
              setSidebarTab('araclar');
              setIsPanelCollapsed(false);
            }}
            title="Araçlar (Geometrik Çizim ve İnşa Araçları)"
            className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              sidebarTab === 'araclar'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Shapes className="w-5 h-5 shrink-0" />
            <span className="text-[11px] font-bold leading-none">Araçlar</span>
          </button>

          {/* 2. Nesneler Sekmesi */}
          <button
            onClick={() => {
              setSidebarTab('nesneler');
              setIsPanelCollapsed(false);
            }}
            title="Nesneler (Sahnedeki Tüm Şekiller ve Konum Bilgileri)"
            className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              sidebarTab === 'nesneler'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Layers className="w-5 h-5 shrink-0" />
            <span className="text-[11px] font-bold leading-none">Nesneler</span>
            {objects.length > 0 && (
              <span
                className={`absolute -top-1 -right-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full border shadow-xs ${
                  sidebarTab === 'nesneler'
                    ? 'bg-card text-primary border-primary/30'
                    : 'bg-primary text-primary-foreground border-border'
                }`}
              >
                {objects.length}
              </span>
            )}
          </button>

          {/* 3. Bağlamlar Sekmesi */}
          <button
            onClick={() => {
              setSidebarTab('baglamlar');
              setIsPanelCollapsed(false);
            }}
            title="Bağlamlar (Seçili Nesneye Özel İşlemler & Ayarlar)"
            className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              sidebarTab === 'baglamlar'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span className="text-[11px] font-bold leading-none">Bağlamlar</span>
            {selectedObject && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-ada-vurgu ring-2 ring-background animate-pulse" />
            )}
          </button>

          {/* 4. Görünümler Sekmesi */}
          <button
            onClick={() => {
              setSidebarTab('gorunumler');
              setIsPanelCollapsed(false);
            }}
            title="Görünümler (2D, 3D, Cebir ve Çoklu Bölmeler)"
            className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              sidebarTab === 'gorunumler'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <LayoutGrid className="w-5 h-5 shrink-0" />
            <span className="text-[11px] font-bold leading-none">Görünümler</span>
          </button>
        </div>

        {/* Alt Kısım: Ara Butonu (Soldaki Sabit Butonların En Altı) */}
        <div className="flex flex-col items-center gap-2 w-full px-1">
          <div className="w-8 h-px bg-border/80" />
          <button
            type="button"
            onClick={() => {
              if (sidebarTab === 'ara') {
                setSidebarTab('araclar');
              } else {
                setSidebarTab('ara');
                setIsPanelCollapsed(false);
              }
            }}
            title="Araç ve Komut Ara (Ctrl+K)"
            aria-label="Ara"
            className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              sidebarTab === 'ara'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Search className="w-5 h-5 shrink-0" />
            <span className="text-[11px] font-bold leading-none">Ara</span>
          </button>
        </div>
      </div>

      {/* 2. SAĞ KISIM: İÇERİK PANELİ */}
      <div
        className={`h-full flex flex-col min-h-0 overflow-hidden transition-[width] duration-200 ${
          isPanelCollapsed ? 'w-0' : 'w-64 sm:w-72'
        }`}
      >

          {/* A. NESNELER GÖRÜNÜMÜ */}
          {sidebarTab === 'nesneler' && (
            <div className="flex-1 flex flex-col min-h-0 bg-card">
              {/* Başlık */}
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Sahne Nesneleri</h3>
                  <span className="text-[11px] font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                    {objects.length}
                  </span>
                </div>
                {objects.length > 0 && (
                  <button
                    onClick={() => requestClearAll('2D')}
                    className="text-[11px] font-bold text-destructive hover:text-destructive flex items-center gap-1 hover:bg-destructive/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Tüm Girişleri ve Şekilleri Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Tümünü Sil</span>
                  </button>
                )}
              </div>

              {/* Arama Kutusu */}
              <div className="p-3 border-b border-border/60 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={objectSearch}
                    onChange={(e) => setObjectSearch(e.target.value)}
                    placeholder="Nesne ara (örn: A, doğru, çember)..."
                    aria-label="Nesne ara"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground text-[13px] placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Nesne Listesi (Tek Tek Konum ve Ad Bilgisi) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {objects.length === 0 ? (
                  <div className="text-center py-12 px-4 text-muted-foreground text-[13px] space-y-3">
                    <Box className="w-10 h-10 mx-auto text-muted-foreground/40" />
                    <p className="font-medium">
                      Sahnede henüz nesne yok.<br />Çizim araçlarını kullanarak şekiller ekleyin.
                    </p>
                    <button
                      onClick={() => setSidebarTab('araclar')}
                      className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Shapes className="w-3.5 h-3.5" />
                      <span>Araçlara Git</span>
                    </button>
                  </div>
                ) : filteredObjects.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-[13px] font-medium">
                    Arama kriterine uygun nesne bulunamadı.
                  </div>
                ) : (
                  filteredObjects.map((obj) => {
                    const isSelected = selectedObjectId === obj.id;
                    const bicim = satirBicimi(obj);
                    const duzenleniyor = editingRowId === obj.id;

                    return (
                      <div
                        key={obj.id}
                        onClick={() => setSelectedObjectId(obj.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/20'
                            : 'bg-muted/30 border-border/60 hover:bg-muted/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Görünürlük Düğmesi */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateObject(obj.id, { visible: obj.visible !== false ? false : true });
                              }}
                              className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer p-0.5"
                              title={obj.visible !== false ? 'Gizle' : 'Göster'}
                            >
                              {obj.visible !== false ? (
                                <Eye className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-muted-foreground/60" />
                              )}
                            </button>

                            {/* Renk Noktası */}
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-foreground/15 shadow-xs"
                              style={{ backgroundColor: obj.color || '#3b82f6' }}
                            />

                            {/* Nesne Adı — alt indis ve üssü yazımla çizilir ("A_1" değil "A₁") */}
                            <span className="font-bold text-[13px] text-foreground shrink-0 yazim-payi">
                              <MatematikMetni metin={obj.label || obj.type} ayar={yazim} />:
                            </span>

                            {/* Konum / Boyut / İfade Bilgisi */}
                            {duzenleniyor ? (
                              <form
                                className="flex items-center gap-1 min-w-0 flex-1"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  commitRowEdit(obj);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  autoFocus
                                  type="text"
                                  value={rowDraft.a}
                                  onChange={(e) => setRowDraft({ ...rowDraft, a: e.target.value })}
                                  className="w-full px-1.5 py-0.5 rounded bg-background border text-[11px] font-mono outline-none focus:border-primary"
                                />
                                <button type="submit" className="p-1 rounded bg-primary text-primary-foreground text-[11px]">
                                  <Check className="w-3 h-3" />
                                </button>
                                <button type="button" onClick={cancelRowEdit} className="p-1 rounded bg-muted text-[11px]">
                                  <X className="w-3 h-3" />
                                </button>
                              </form>
                            ) : (
                              <span
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  startRowEdit(obj);
                                }}
                                title="Değeri düzenlemek için çift tıklayın"
                                className="text-[11px] text-muted-foreground truncate yazim-payi hover:text-foreground leading-[1.45]"
                              >
                                {nesneOzetiYazimi(obj)}
                              </span>
                            )}
                          </div>

                          {/* Aksiyon Butonları */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Bağlam sekmesine git */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedObjectId(obj.id);
                                setSidebarTab('baglamlar');
                              }}
                              className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              title="Bu nesnenin bağlamsal işlemlerini aç"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>

                            {/* Silme Butonu */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteObject(obj.id);
                              }}
                              className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                              title="Nesneyi Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* B. BAĞLAMLAR GÖRÜNÜMÜ */}
          {sidebarTab === 'baglamlar' && (
            <div className="flex-1 flex flex-col min-h-0 bg-card">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Nesne Bağlamı</h3>
                </div>
                {selectedObject && (
                  <button
                    onClick={() => setSelectedObjectId(null)}
                    className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    Seçimi Kaldır
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
                {!selectedObject ? (
                  <div className="text-center py-14 px-4 text-muted-foreground text-[13px] space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Seçili Nesne Yok</h4>
                      <p className="mt-1 text-muted-foreground/80 leading-relaxed">
                        Tuvalden veya <strong>Nesneler</strong> sekmesinden bir nesne seçin.
                        Seçilen nesneye özel hesaplamalar, simetri ve stil işlemleri burada belirecektir.
                      </p>
                    </div>
                    <button
                      onClick={() => setSidebarTab('nesneler')}
                      className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Nesneler Listesini Gör</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Seçili Nesne Başlık Kartı */}
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-foreground/15 shadow-xs"
                            style={{ backgroundColor: selectedObject.color || '#3b82f6' }}
                          />
                          <span className="font-bold text-sm text-foreground">
                            {selectedObject.label || selectedObject.type}
                          </span>
                          <span className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                            {selectedObject.type}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Kilitleme / Sabitleme */}
                          <button
                            onClick={() =>
                              updateObject(selectedObject.id, {
                                locked: !(selectedObject as PointObject).locked,
                              })
                            }
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              (selectedObject as PointObject).locked
                                ? 'bg-ada-altin/15 text-ada-altin dark:text-ada-fener'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                            title={(selectedObject as PointObject).locked ? 'Kilidi Aç' : 'Konumu Kilitle / Sabitle'}
                          >
                            {(selectedObject as PointObject).locked ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Görünürlük */}
                          <button
                            onClick={() =>
                              updateObject(selectedObject.id, {
                                visible: selectedObject.visible !== false ? false : true,
                              })
                            }
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title={selectedObject.visible !== false ? 'Gizle' : 'Göster'}
                          >
                            {selectedObject.visible !== false ? (
                              <Eye className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Ölçü & Konum Detayı: seçili nesnenin BÜTÜN ölçüleri, MEB yazımıyla, her biri kendi satırında */}
                      <div className="text-[13px] text-muted-foreground bg-background/80 p-2 rounded-xl border border-border/50 leading-[1.45] space-y-0.5">
                        {nesneSatirlari(selectedObject, objects, nokta).map((s, i) => (
                          <PanelOlcusu key={i} satir={s} ayar={yazim} as="div" metinSinifi="font-mono" className="text-foreground font-semibold" />
                        ))}
                        <YazimKopyala
                          className="pt-1"
                          satirlar={nesneSatirlari(selectedObject, objects, nokta).map((s) =>
                            s.tur === 'olcu' ? olcuDugumleri(s.olcu, yazim) : metniCozumle(s.metin, yazim)
                          )}
                        />
                      </div>
                    </div>

                    {/* Renk Paleti */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                        Nesne Rengi
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            onClick={() => updateObject(selectedObject.id, { color: c.hex })}
                            className={`w-6 h-6 rounded-full transition-transform cursor-pointer shadow-xs ${
                              (selectedObject.color || '#3b82f6') === c.hex
                                ? 'scale-125 ring-2 ring-primary ring-offset-2'
                                : 'hover:scale-110'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Türe Özel Bağlam İşlemleri */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                        Bağlamsal İşlemler
                      </span>

                      <div className="grid grid-cols-1 gap-1.5">
                        {/* Noktaya Özel İşlemler */}
                        {selectedObject.type === 'point' && (
                          <>
                            <button
                              type="button"
                              onClick={() => addPointReflectOrigin(selectedObject as PointObject)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                              <span>Orijine Göre Simetriğini Ekle</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => addPointReflectX(selectedObject as PointObject)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                            >
                              <Columns2 className="w-3.5 h-3.5 text-primary" />
                              <span>X Eksenine Göre Yansıt</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => addPointReflectY(selectedObject as PointObject)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                            >
                              <Columns2 className="w-3.5 h-3.5 text-primary rotate-90" />
                              <span>Y Eksenine Göre Yansıt</span>
                            </button>
                          </>
                        )}

                        {/* Doğru Parçasına Özel İşlemler */}
                        {selectedObject.type === 'segment' && (
                          <>
                            <button
                              type="button"
                              onClick={() => addSegmentMidpoint(selectedObject as SegmentObject)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-ada-deniz dark:text-ada-vurgu" />
                              <span>Orta Noktayı Bul & Ekle</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveTool('perp_bisector')}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                            >
                              <Shapes className="w-3.5 h-3.5 text-ada-deniz dark:text-ada-vurgu" />
                              <span>Orta Dikme Çizimini Başlat</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveTool('measure_distance')}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                            >
                              <Calculator className="w-3.5 h-3.5 text-ada-altin dark:text-ada-fener" />
                              <span>Uzunluk Ölçümü Aracı</span>
                            </button>
                          </>
                        )}

                        {/* Çokgene Özel İşlemler */}
                        {selectedObject.type === 'polygon' && (
                          <>
                            <button
                              type="button"
                              onClick={() => addPolygonCentroid(selectedObject as PolygonObject)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-ada-deniz dark:text-ada-vurgu" />
                              <span>Ağırlık Merkezini (G) Ekle</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveTool('measure_area')}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                            >
                              <Calculator className="w-3.5 h-3.5 text-ada-altin dark:text-ada-fener" />
                              <span>Alanı Hesapla</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveTool('measure_perimeter')}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                            >
                              <Shapes className="w-3.5 h-3.5 text-ada-altin dark:text-ada-fener" />
                              <span>Çevre Uzunluğunu Hesapla</span>
                            </button>
                          </>
                        )}

                        {/* Çembere Özel İşlemler */}
                        {selectedObject.type === 'circle' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setActiveTool('measure_area')}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                            >
                              <Calculator className="w-3.5 h-3.5 text-ada-altin dark:text-ada-fener" />
                              <span>Dairenin Alanını Ölç</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveTool('measure_perimeter')}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                            >
                              <Circle className="w-3.5 h-3.5 text-ada-altin dark:text-ada-fener" />
                              <span>Çevre Uzunluğunu Ölç</span>
                            </button>
                          </>
                        )}

                        {/* Açıya Özel İşlemler */}
                        {selectedObject.type === 'angle' && (
                          <button
                            type="button"
                            onClick={() => setActiveTool('angle_bisector')}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                          >
                            <Shapes className="w-3.5 h-3.5 text-primary" />
                            <span>Açıortay Çizim Aracını Seç</span>
                          </button>
                        )}

                        {/* Fonksiyona Özel İşlemler */}
                        {selectedObject.type === 'function' && (
                          <button
                            type="button"
                            onClick={() => onOpenFunctionDialog?.()}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 text-ada-deniz-koyu dark:text-ada-vurgu" />
                            <span>Fonksiyon Formülünü Düzenle</span>
                          </button>
                        )}

                        {/* Sürgüye Özel İşlemler */}
                        {selectedObject.type === 'slider' && (
                          <button
                            type="button"
                            onClick={() => onOpenSliderDialog?.()}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-ada-deniz-koyu dark:text-ada-vurgu" />
                            <span>Sürgü Parametrelerini Ayarla</span>
                          </button>
                        )}

                        {/* Genel Çoğaltma */}
                        <button
                          type="button"
                          onClick={() => duplicateObject(selectedObject)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-[13px] font-semibold text-foreground text-left transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-ada-deniz dark:text-ada-vurgu" />
                          <span>Nesneyi Çoğalt (Klonla)</span>
                        </button>

                        {/* Silme */}
                        <button
                          type="button"
                          onClick={() => {
                            deleteObject(selectedObject.id);
                            setSelectedObjectId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-[13px] font-semibold text-destructive text-left transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Nesneyi Sil</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* C. GÖRÜNÜMLER SEKMESİ (2D, 3D, 2D+3D, Cebir, 2D+Cebir, 3D+Cebir, 2D+3D+Cebir) */}
          {sidebarTab === 'gorunumler' && (
            <div className="flex-1 flex flex-col min-h-0 bg-card">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Görünümler</h3>
                </div>
              </div>

              <div className="p-3 border-b border-border/50 bg-muted/20 text-[11px] text-muted-foreground leading-normal">
                Çalışma alanınızı tek ekranda veya çoklu pencerelerle görüntülemek için bir düzen seçin:
              </div>

              {/* 7 Görünüm Kartı Listesi */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
                {LAYOUT_OPTIONS.map((opt) => {
                  const isCurrent = layoutMode === opt.mode;

                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => onLayoutModeChange?.(opt.mode)}
                      title={opt.description}
                      onMouseEnter={(e) => {
                        setLayoutTooltip({ text: opt.description, x: e.clientX + 14, y: e.clientY + 10 });
                      }}
                      onMouseMove={(e) => {
                        setLayoutTooltip({ text: opt.description, x: e.clientX + 14, y: e.clientY + 10 });
                      }}
                      onMouseLeave={() => setLayoutTooltip(null)}
                      className={`w-full p-2.5 rounded-2xl border text-left transition-all cursor-pointer select-none relative group ${
                        isCurrent
                          ? 'bg-primary/10 border-primary/50 shadow-sm ring-1 ring-primary/30'
                          : 'bg-muted/30 border-border/70 hover:bg-muted/60 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl shrink-0 transition-transform ${
                            isCurrent
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'bg-background border border-border group-hover:scale-105'
                          }`}
                        >
                          {opt.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-[13px] text-foreground">
                              {opt.name}
                            </span>
                            <span
                              className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                isCurrent
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {opt.badge}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 text-[11px] font-bold text-primary">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Fare ile Üzerine Gelince Çıkan Yüzen Açıklama Etiketi (Tooltip Label) */}
              {layoutTooltip && (
                <div
                  style={{ left: layoutTooltip.x, top: layoutTooltip.y }}
                  className="fixed z-[1000] pointer-events-none px-3 py-1.5 rounded-xl bg-ada-murekkep/95 text-ada-fildisi dark:bg-ada-fildisi/95 dark:text-ada-murekkep text-[13px] font-medium shadow-2xl border border-border/50 backdrop-blur-md max-w-xs animate-in fade-in-0 zoom-in-95 duration-100 select-none leading-tight"
                >
                  {layoutTooltip.text}
                </div>
              )}
            </div>
          )}

          {/* D. ARAÇLAR GÖRÜNÜMÜ (Ağaç Menü — Tek Tek Alt Alta) */}
          {sidebarTab === 'araclar' && (
            <div className="flex-1 flex flex-col min-h-0 bg-card">
              {/* Başlık — "Çalışma Alanım" */}
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                <h3 className="text-sm font-bold text-foreground tracking-tight">Çalışma Alanım</h3>
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={toggleAllTreeGroups}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Tüm Grupları Aç / Kapat"
                    aria-label="Tüm Grupları Aç / Kapat"
                  >
                    <ChevronsUpDown className="w-3.5 h-3.5" />
                  </button>
                  {objects.length > 0 && (
                    <button
                      onClick={() => requestClearAll('2D')}
                      className="text-[11px] font-bold text-destructive hover:text-destructive flex items-center gap-1 hover:bg-destructive/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      title="Tüm Çizimleri ve Şekilleri Temizle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Tümünü Sil</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sınıf süzgeci açıkken: "5. sınıf araçları · Tüm araçlar" */}
              <SinifSuzgeciSeridi duzey={sinifDuzeyi} onTumAraclar={tumAraclaraDon} />

              {/* Ağaç Menü Araç Listesi (Alt Alta Tek Tek) — sınıf süzgecinden geçmiş gruplar; sayaçlar süzülmüş sayıdır */}
              <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3.5 scrollbar-thin">
                {normalizedSearch !== '' && gorunenSonucSayisi === 0 && (
                  <SinifAramaBosNotu
                    arama={toolSearch.trim()}
                    duzey={sinifDuzeyi}
                    suzgecGizledi={suzgecAramayiGizledi}
                    onTumAraclar={tumAraclaraDon}
                  />
                )}
                {aracGruplari.map((group) => {
                  const matchingTools = group.tools.filter(aramayaUyar);

                  if (matchingTools.length === 0) return null;

                  const isExpanded = normalizedSearch !== '' || (expandedTreeGroups[group.id] ?? true);

                  return (
                    <div key={group.id} className="space-y-1">
                      {/* Grup Başlığı (Kapama/Açma Butonlu) */}
                      <button
                        type="button"
                        onClick={() => toggleTreeGroup(group.id)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-muted/60 group select-none"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
                          )}
                          <span className="text-[13px] font-bold text-foreground/90 group-hover:text-foreground">
                            {group.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-muted-foreground/70 px-1.5 py-0.5 rounded-md bg-muted/80">
                          {matchingTools.length}
                        </span>
                      </button>

                      {/* Araçlar: Tek tek alt alta */}
                      {isExpanded && (
                        <div className="flex flex-col space-y-0.5 pl-3">
                          {matchingTools.map((tool) => {
                            const isActive = activeTool === tool.id;
                            const shortcut = TOOL_SHORTCUTS[tool.id as ToolMode];

                            return (
                              <button
                                key={tool.id}
                                type="button"
                                onClick={() => {
                                  if (tool.id === 'add_object') {
                                    onOpenAddObjectDialog?.();
                                    return;
                                  }
                                  handleToolClick(tool.id as ToolMode);
                                }}
                                title={`${tool.name}${shortcut ? ` (${shortcut})` : ''} — ${tool.description}`}
                                aria-label={tool.name}
                                aria-pressed={isActive}
                                className={`w-full flex items-center gap-3 min-h-[44px] px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer select-none text-[13px] ${
                                  isActive
                                    ? 'bg-accent text-foreground font-semibold shadow-xs ring-1 ring-primary/25'
                                    : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground font-medium'
                                }`}
                              >
                                {/* Orijinal Logolar/İkonlar */}
                                <div
                                  className={`w-5 h-5 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 ${tool.iconColor}`}
                                >
                                  {tool.icon}
                                </div>

                                <span className="flex-1 truncate leading-tight">
                                  {tool.name}
                                </span>

                                {shortcut && (
                                  <kbd className="text-[11px] font-mono text-muted-foreground/60 opacity-60 ml-auto shrink-0">
                                    {shortcut}
                                  </kbd>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* E. ARAMA GÖRÜNÜMÜ (Soldaki Sabit Butonların En Altından Açılır) */}
          {sidebarTab === 'ara' && (
            <div className="flex-1 flex flex-col min-h-0 bg-card">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Araç & Komut Ara</h3>
                </div>
                {toolSearch && (
                  <button
                    type="button"
                    onClick={() => setToolSearch('')}
                    className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
                  >
                    Temizle
                  </button>
                )}
              </div>

              {/* Arama Kutusu */}
              <div className="p-3 border-b border-border/60 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    autoFocus
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    placeholder="Araç veya komut ara..."
                    aria-label="Araç veya komut ara"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground text-[13px] placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Sınıf süzgeci açıkken arama da yalnız o sınıfın araçlarında yapılır */}
              <SinifSuzgeciSeridi duzey={sinifDuzeyi} onTumAraclar={tumAraclaraDon} />

              {/* Arama Sonuçları */}
              <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 scrollbar-thin">
                {normalizedSearch !== '' && gorunenSonucSayisi === 0 && (
                  <SinifAramaBosNotu
                    arama={toolSearch.trim()}
                    duzey={sinifDuzeyi}
                    suzgecGizledi={suzgecAramayiGizledi}
                    onTumAraclar={tumAraclaraDon}
                  />
                )}
                {aracGruplari.flatMap((g) => g.tools)
                  .filter(aramayaUyar)
                  .map((tool) => {
                    const isActive = activeTool === tool.id;
                    const shortcut = TOOL_SHORTCUTS[tool.id as ToolMode];

                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          if (tool.id === 'add_object') {
                            onOpenAddObjectDialog?.();
                            return;
                          }
                          handleToolClick(tool.id as ToolMode);
                        }}
                        title={`${tool.name}${shortcut ? ` (${shortcut})` : ''} — ${tool.description}`}
                        aria-label={tool.name}
                        aria-pressed={isActive}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer select-none text-[13px] ${
                          isActive
                            ? 'bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/30'
                            : 'text-foreground/90 hover:bg-muted/70 hover:text-foreground font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 ${tool.iconColor}`}>
                            {tool.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold">{tool.name}</div>
                            <div className="truncate text-[11px] text-muted-foreground">{tool.description}</div>
                          </div>
                        </div>
                        {shortcut && (
                          <kbd className="px-1.5 py-0.5 rounded bg-muted/80 border border-border text-[11px] font-mono text-muted-foreground shrink-0">
                            {shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Bekleyen Seçim Bilgisi */}
          {pendingPointIds.length > 0 && (
            <div className="p-3 border-t border-ada-altin/40 border-l-2 border-l-ada-altin bg-ada-altin/15 text-[11px] text-foreground font-medium shrink-0">
              <span className="font-bold">Bekleyen Seçim: </span>
              <span>{pendingPointIds.length} nokta seçildi. Devam etmek için sıradaki noktaya tıklayın.</span>
            </div>
          )}
        </div>

      {/* Kapatma / Açma Kulakçığı */}
      <button
        type="button"
        onClick={togglePanelCollapse}
        className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-12 rounded-r-md bg-card border border-l-0 border-border/80 shadow-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer group z-40"
        style={{ left: '100%' }}
        title={isPanelCollapsed ? 'Araç Panelini Aç (›)' : 'Araç Panelini Kapat (‹)'}
        aria-label={isPanelCollapsed ? 'Araç Panelini Aç' : 'Araç Panelini Kapat'}
      >
        {isPanelCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        )}
      </button>

    </div>
  );
}
