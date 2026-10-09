'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tool3DMode, Solid3DType, Solid3DObject } from '@/types/workspace3d';
import { LayoutMode } from '@/types/workspace';
import { calculate3DVolume, calculate3DSurfaceArea, getSolidPropertyCounts, generateSolidMesh, computeFaceArea } from '@/math/geometry3d';
import { formatTurkishNumber } from '@/math/coordinates';
import { useKademeDuzeyi } from '@/hooks/useKademeDuzeyi';
import { KademeAramaBosNotu, KademeSuzgeciSeridi } from './KademeSuzgeci';
import { CISIM_RENKLERI } from './cisimRenkleri';
import {
  CISIM_ADLARI,
  TREE_TOOL_GROUPS_3D,
  TUM_3B_ARACLAR,
  arac3BAramayaUyar,
  type CameraPreset3D,
  type TreeTool3DItem,
} from './treeToolDefinitions3D';
import { gruplari3BSuz, grupAcikliklari3B } from './kademeDuzeyleri3B';
import {
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Columns2,
  Columns3,
  Calculator,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  PanelLeft,
  PanelRight,
  RotateCw,
  Ruler,
  Search,
  Sparkles,
  Square,
  Trash2,
  X,
  BookOpen,
  MapPin,
  Paintbrush,
} from 'lucide-react';

/*
 * 3B araç paneli — 2B Toolbar ile aynı tasarım sistemi: 68 px yan şerit, genişliği geçişle kapanan panel
 * (içerik kaldırılmaz), kapatma kulakçığı, "Çalışma Alanım" başlıklı ağaç liste, kademe süzgeci,
 * 44 px araç satırları, kategori renginde kutusuz simgeler. Araç verisi treeToolDefinitions3D.tsx'te,
 * kademe listesi kademeDuzeyleri3B.ts'te; Bağlamlar sekmesi eski (kaldırılan) Properties3D panelinin canlı ölçüm,
 * boyut, konum, döndürme, renk ve yüz renklendirme parçalarını taşır.
 *
 * Sahne değişiklikleri hep üst bileşenin geri alınabilir yollarından geçer (onUpdateSolid → setSolids(…, key)).
 */

type SidebarTab = 'araclar' | 'nesneler' | 'baglamlar' | 'gorunumler' | 'ara';
type CreationMethod = 'instant' | 'draw';

/** Araç panelinin daraltma/kapatma tercihi: 2B panelle aynı anahtar. */
const PANEL_KAPALI_ANAHTARI = 'geoeba_arac_paneli_kapali_v1';

interface Toolbar3DProps {
  activeTool: Tool3DMode;
  setActiveTool: (tool: Tool3DMode) => void;
  onAddSolid: (type: Solid3DType) => void;
  onAutoArrange: () => void;
  onSetCameraPreset: (preset: CameraPreset3D) => void;
  toggleShowVertices: () => void;
  toggleShowEdges: () => void;
  toggleShowFaces: () => void;
  /** Zemin ızgarası ve eksenler (3B kamera ayarı); verilmezse satırlar pasif kalır. */
  showGrid?: boolean;
  showAxes?: boolean;
  toggleShowGrid?: () => void;
  toggleShowAxes?: () => void;
  showVertices: boolean;
  showEdges: boolean;
  showFaces: boolean;
  onDeleteSelected: () => void;
  hasSelection?: boolean;
  onClearAll?: () => void;
  onOpenAddObjectDialog?: () => void;
  onSwitchTo2D?: () => void;
  solids?: Solid3DObject[];
  selectedSolidId?: string | null;
  selectedSolidIds?: string[];
  onSelectSolid?: (id: string | null) => void;
  onSelectSolids?: (ids: string[]) => void;
  /** Seçili cismi günceller (WorkspaceView.handleUpdateSolid → setSolids(…, key), geri alınabilir). */
  onUpdateSolid?: (updates: Partial<Solid3DObject>) => void;
  onDeleteSolidById?: (id: string) => void;
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
  /** Hazır ölçülü cisim ("Kare Prizma": prism, 3 × 4 × 3). Yoksa onAddSolid ile varsayılan ölçü eklenir. */
  onAddSolidPreset?: (type: Solid3DType, dims: { width?: number; height?: number; depth?: number; radius?: number }) => void;
  /** Başlıktaki geri al / yinele; verilmezse düğmeler çizilmez. */
  /**
   * Kimliği verilen cismi günceller (Nesneler sekmesi: göster/gizle ve ad düzenleme, seçili olmayan cisimde).
   * Verilmezse seçili olmayan cisim önce seçilir, işlem ikinci tıklamada uygulanır.
   */
  onUpdateSolidById?: (id: string, updates: Partial<Solid3DObject>) => void;
  /** Açılışta seçili sekme (varsayılan Araçlar). */
  initialTab?: SidebarTab;
}

/** Gizlenen cismin geri yüklenecek görünüm değerleri (göz simgesi) */
interface GizliGorunum {
  opacity: number;
  showFaces: boolean;
  showVertices: boolean;
  showWireframe: boolean;
}

/** Nesneler sekmesindeki göz: gizli cisim = opacity 0; yüz, köşe ve telkafes de kapanır (Canvas3D çizmez). */
export const GIZLEME_GUNCELLEMESI: Readonly<GizliGorunum> = { opacity: 0, showFaces: false, showVertices: false, showWireframe: false };

/**
 * Türkçe yazılmış sayıyı çözer: "2,5" → 2,5; "1.000,5" → 1000,5; boşluklar atılır; en çok iki ondalık,
 * [min, max] aralığına kırpılır. Sayı değilse null.
 */
export function turkceSayiyiCoz(metin: string, sinir: { min?: number; max?: number } = {}): number | null {
  let ham = metin.trim().replace(/\s+/g, '');
  if (ham.includes(',')) ham = ham.replace(/\./g, '').replace(',', '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(ham)) return null;
  let v = Number(ham);
  if (!Number.isFinite(v)) return null;
  if (typeof sinir.min === 'number') v = Math.max(sinir.min, v);
  if (typeof sinir.max === 'number') v = Math.min(sinir.max, v);
  return Number(v.toFixed(2));
}

/** Türkçe ondalıklı sayı alanı: ham metin tutar ("2,5"), Enter ya da odak kaybında uygular; Escape vazgeçer. */
function SayiAlani({
  value,
  onCommit,
  className,
  min,
  max,
  label,
}: {
  value: number;
  onCommit: (v: number) => void;
  className?: string;
  min?: number;
  max?: number;
  label: string;
}) {
  const [metin, setMetin] = useState(formatTurkishNumber(value, 2));
  const [odakta, setOdakta] = useState(false);
  // Escape ile vazgeçildi: ardından gelen odak kaybı yazılan metni uygulamaz (olay işleyicisi eski metni görür)
  const vazgecildi = useRef(false);

  useEffect(() => {
    if (!odakta) setMetin(formatTurkishNumber(value, 2));
  }, [value, odakta]);

  const uygula = () => {
    const v = turkceSayiyiCoz(metin, { min, max });
    if (v !== null) {
      onCommit(v);
      setMetin(formatTurkishNumber(v, 2));
    } else {
      setMetin(formatTurkishNumber(value, 2));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={metin}
      aria-label={label}
      title={label}
      onFocus={() => {
        vazgecildi.current = false;
        setOdakta(true);
      }}
      onBlur={() => {
        setOdakta(false);
        if (vazgecildi.current) {
          vazgecildi.current = false;
          setMetin(formatTurkishNumber(value, 2));
          return;
        }
        uygula();
      }}
      onChange={(e) => setMetin(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          // Odak kaybı uygular; burada ayrıca uygulanmaz (çift kayıt olmasın)
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === 'Escape') {
          vazgecildi.current = true;
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className ?? 'w-full px-1.5 py-1 text-center font-mono font-semibold bg-muted rounded-lg border border-border text-[12px] text-foreground'}
    />
  );
}

/** Etiket + sayı alanı + kaydırıcı satırı (boyut, döndürme) */
function KaydiriciSatiri({
  label,
  value,
  min,
  max,
  step,
  unit = 'br',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[12px] font-semibold gap-2 text-foreground/90">
        <span>{label}</span>
        <div className="flex items-center gap-1">
          <SayiAlani
            value={value}
            min={min}
            max={max}
            onCommit={onChange}
            label={label}
            className="w-14 px-1 py-0.5 text-right font-mono font-semibold bg-muted rounded-md border border-border text-[12px] text-foreground"
          />
          <span className="font-mono text-muted-foreground">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary cursor-pointer"
      />
    </div>
  );
}

/** Yüzen bölme kartı (Bağlamlar sekmesi) */
function BaglamKarti({ baslik, simge, sag, children }: { baslik: string; simge?: React.ReactNode; sag?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5 p-3 rounded-2xl bg-card border border-border/80">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
          {simge}
          <span>{baslik}</span>
        </h4>
        {sag}
      </div>
      {children}
    </section>
  );
}

const LAYOUT_OPTIONS: Array<{ mode: LayoutMode; name: string; badge: string; description: string; icon: React.ReactNode }> = [
  { mode: '2d_only', name: '2D Düzlem', badge: '2D', description: 'Yalnızca 2 boyutlu geometri çizim alanı', icon: <Square className="w-5 h-5 text-ada-deniz dark:text-ada-vurgu" /> },
  { mode: '3d_only', name: '3D Uzay', badge: '3D', description: 'Yalnızca 3 boyutlu katı cisim ve uzay stüdyosu', icon: <Box className="w-5 h-5 text-ada-lavanta" /> },
  { mode: '2d_3d', name: '2D + 3D', badge: '2D + 3D', description: 'Sol tarafta 2D çizim, sağ tarafta 3D uzay yan yana', icon: <Columns2 className="w-5 h-5 text-ada-vurgu" /> },
  { mode: 'default', name: 'Cebir', badge: 'Cebir', description: 'Cebirsel ifadeler ve fonksiyonlar çalışma alanı', icon: <Calculator className="w-5 h-5 text-ada-deniz-koyu dark:text-ada-vurgu" /> },
  { mode: 'algebra_2d', name: '2D + Cebir', badge: '2D + Cebir', description: '2D geometri düzlemi ile cebir giriş paneli', icon: <PanelLeft className="w-5 h-5 text-ada-altin dark:text-ada-fener" /> },
  { mode: 'algebra_3d', name: '3D + Cebir', badge: '3D + Cebir', description: '3D uzay stüdyosu ile cebir giriş paneli', icon: <PanelRight className="w-5 h-5 text-ada-mercan" /> },
  { mode: 'three_col', name: '2D + 3D + Cebir', badge: 'Üçü Bir Arada', description: 'Cebir listesi, 2D geometri ve 3D uzay üç sütun halinde', icon: <Columns3 className="w-5 h-5 text-ada-murekkep-2 dark:text-ada-kum" /> },
];

const EKSENLER: { key: 'x' | 'y' | 'z'; label: string; cls: string }[] = [
  { key: 'x', label: 'X', cls: 'text-ada-mercan' },
  { key: 'y', label: 'Y', cls: 'text-ada-vurgu' },
  { key: 'z', label: 'Z', cls: 'text-ada-deniz dark:text-ada-vurgu' },
];

export function Toolbar3D({
  activeTool,
  setActiveTool,
  onAddSolid,
  onAutoArrange,
  onSetCameraPreset,
  toggleShowVertices,
  toggleShowEdges,
  toggleShowFaces,
  showGrid = true,
  showAxes = true,
  toggleShowGrid,
  toggleShowAxes,
  showVertices,
  showEdges,
  showFaces,
  onDeleteSelected,
  hasSelection = false,
  onClearAll,
  onOpenAddObjectDialog,
  solids = [],
  selectedSolidId = null,
  selectedSolidIds = [],
  onSelectSolid,
  onSelectSolids,
  onUpdateSolid,
  onDeleteSolidById,
  layoutMode = '3d_only',
  onLayoutModeChange,
  onAddSolidPreset,
  onUpdateSolidById,
  initialTab = 'araclar',
}: Toolbar3DProps) {
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(initialTab);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [creationMethod, setCreationMethod] = useState<CreationMethod>('instant');
  const [toolSearch, setToolSearch] = useState('');
  const [objectSearch, setObjectSearch] = useState('');
  const [layoutTooltip, setLayoutTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [adDuzenlenen, setAdDuzenlenen] = useState<{ id: string; taslak: string } | null>(null);
  const [gizliGorunumler, setGizliGorunumler] = useState<Record<string, GizliGorunum>>({});

  // Kademe süzgeci (menü çubuğundaki Kademe menüsü): yalnız bu panelin listeleri süzülür
  const [kademeDuzeyi, setKademeDuzeyi] = useKademeDuzeyi();
  const aracGruplari = useMemo(() => gruplari3BSuz(TREE_TOOL_GROUPS_3D, kademeDuzeyi), [kademeDuzeyi]);
  const tumAraclaraDon = () => setKademeDuzeyi('tum');

  // Panel kapalılık tercihi (2B panelle aynı anahtar; dar ekranda kapalı açılır)
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

  const sekmeyeGit = (sekme: SidebarTab) => {
    setSidebarTab(sekme);
    setIsPanelCollapsed(false);
  };

  // Ağaç menü gruplarının açıklığı; kademe değişince az araçlı kademede hepsi açık gelir
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => grupAcikliklari3B(TREE_TOOL_GROUPS_3D, kademeDuzeyi));
  useEffect(() => {
    setExpandedGroups(grupAcikliklari3B(TREE_TOOL_GROUPS_3D, kademeDuzeyi));
  }, [kademeDuzeyi]);

  const toggleGroup = (id: string) => setExpandedGroups((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  const toggleAllGroups = () => {
    const hepsiAcik = aracGruplari.every((g) => expandedGroups[g.id] !== false);
    setExpandedGroups(Object.fromEntries(TREE_TOOL_GROUPS_3D.map((g) => [g.id, !hepsiAcik])));
  };

  const selectedSolid =
    solids.find((s) => s.id === selectedSolidId) ?? (selectedSolidIds.length === 1 ? solids.find((s) => s.id === selectedSolidIds[0]) : undefined) ?? null;

  const cismiSec = (id: string | null) => {
    onSelectSolid?.(id);
    onSelectSolids?.(id ? [id] : []);
  };

  /**
   * onUpdateSolidById verilmemişse seçili olmayan cisme yapılacak güncelleme: cisim seçilir, seçim üst
   * bileşenden geri gelince (selectedSolidId) onUpdateSolid ile tek tıklamada uygulanır.
   */
  const [bekleyenGuncelleme, setBekleyenGuncelleme] = useState<{ id: string; updates: Partial<Solid3DObject> } | null>(null);
  useEffect(() => {
    if (!bekleyenGuncelleme) return;
    if (selectedSolidId !== bekleyenGuncelleme.id) return;
    onUpdateSolid?.(bekleyenGuncelleme.updates);
    setBekleyenGuncelleme(null);
    // onUpdateSolid üst bileşende her çizimde yeniden kurulur; yalnız seçim ve bekleyen iş izlenir
  }, [selectedSolidId, bekleyenGuncelleme]);

  /** Kimliği verilen cismi günceller: onUpdateSolidById → doğrudan; seçiliyse onUpdateSolid; değilse seçip bekletir. */
  const cismiGuncelle = (id: string, updates: Partial<Solid3DObject>) => {
    if (onUpdateSolidById) {
      onUpdateSolidById(id, updates);
      return;
    }
    if (id === selectedSolidId) {
      onUpdateSolid?.(updates);
      return;
    }
    cismiSec(id);
    setBekleyenGuncelleme({ id, updates });
  };

  const cisimGizliMi = (s: Solid3DObject) => s.opacity === 0;
  const gorunurlukDegistir = (s: Solid3DObject) => {
    if (cisimGizliMi(s)) {
      // Yerel haritada kayıt yoksa (sayfa yenilendi) yeni cismin varsayılan görünümüne döner
      const eski = gizliGorunumler[s.id] ?? { opacity: 1, showFaces: true, showVertices: true, showWireframe: true };
      cismiGuncelle(s.id, eski);
      setGizliGorunumler((prev) => {
        const sonraki = { ...prev };
        delete sonraki[s.id];
        return sonraki;
      });
      return;
    }
    const eski: GizliGorunum = { opacity: s.opacity, showFaces: s.showFaces, showVertices: s.showVertices, showWireframe: s.showWireframe };
    cismiGuncelle(s.id, GIZLEME_GUNCELLEMESI);
    setGizliGorunumler((prev) => ({ ...prev, [s.id]: eski }));
  };

  const adiUygula = () => {
    if (!adDuzenlenen) return;
    const ad = adDuzenlenen.taslak.trim();
    if (ad) cismiGuncelle(adDuzenlenen.id, { name: ad });
    setAdDuzenlenen(null);
  };

  /** Ağaç satırına tıklama: türüne göre araç kipi, cisim ekleme, katman, kamera ya da eylem */
  const aracTikla = (arac: TreeTool3DItem) => {
    switch (arac.kind) {
      case 'tool': {
        if (arac.id === 'delete' && hasSelection) {
          onDeleteSelected();
          return;
        }
        setActiveTool(arac.id as Tool3DMode);
        return;
      }
      case 'solid': {
        const tur = arac.solidType ?? 'cube';
        if (arac.preset) {
          if (onAddSolidPreset) onAddSolidPreset(tur, arac.preset);
          else onAddSolid(tur);
          return;
        }
        if (creationMethod === 'draw') {
          const kip = `create_${tur}` as Tool3DMode;
          setActiveTool(activeTool === kip ? 'select_move' : kip);
        } else {
          onAddSolid(tur);
        }
        return;
      }
      case 'toggle': {
        if (arac.id === 'show_grid') toggleShowGrid?.();
        else if (arac.id === 'show_axes') toggleShowAxes?.();
        else if (arac.id === 'show_vertices') toggleShowVertices();
        else if (arac.id === 'show_edges') toggleShowEdges();
        else toggleShowFaces();
        return;
      }
      case 'camera': {
        onSetCameraPreset(arac.cameraPreset ?? 'isometric');
        return;
      }
      case 'action': {
        if (arac.id === 'unfold') {
          // Açınım şeridi seçili cisim için görünür; kapalıysa çeyrek açarak başlatılır
          if (selectedSolid) {
            if (selectedSolid.type === 'sphere') return;
            if ((selectedSolid.unfoldProgress || 0) === 0) cismiGuncelle(selectedSolid.id, { unfoldProgress: 0.25 });
          } else if (solids.length > 0) {
            const aday = solids.find((s) => s.type !== 'sphere') ?? solids[0];
            cismiSec(aday.id);
          }
        }
        return;
      }
    }
  };

  /** Satır etkin mi? (araç kipi, çizim kipi, açık katman) */
  const aracEtkinMi = (arac: TreeTool3DItem): boolean => {
    switch (arac.kind) {
      case 'tool':
        return activeTool === arac.id;
      case 'solid':
        return !arac.preset && creationMethod === 'draw' && activeTool === `create_${arac.solidType}`;
      case 'toggle':
        if (arac.id === 'show_grid') return showGrid;
        if (arac.id === 'show_axes') return showAxes;
        return arac.id === 'show_vertices' ? showVertices : arac.id === 'show_edges' ? showEdges : showFaces;
      case 'action':
        return arac.id === 'unfold' && !!selectedSolid && (selectedSolid.unfoldProgress || 0) > 0;
      default:
        return false;
    }
  };

  const aracBasligi = (arac: TreeTool3DItem): string => {
    if (arac.kind === 'solid' && !arac.preset) {
      return `${arac.name} — ${creationMethod === 'draw' ? 'Zeminde sürükleyerek çizin.' : 'Tıklayınca sahneye eklenir.'} ${arac.description}`;
    }
    return `${arac.name} — ${arac.description}`;
  };

  // Arama (Ara sekmesi): kademe süzgecinden geçen araçlar arasında
  const normalizedSearch = toolSearch.trim().toLocaleLowerCase('tr');
  const aramayaUyar = (arac: TreeTool3DItem) => arac3BAramayaUyar(arac, normalizedSearch);
  const aramaSonuclari = aracGruplari.flatMap((g) => g.tools).filter(aramayaUyar);
  const suzgecAramayiGizledi = aramaSonuclari.length === 0 && TUM_3B_ARACLAR.some(aramayaUyar);

  const filteredSolids = solids.filter((s) => {
    const q = objectSearch.trim().toLocaleLowerCase('tr');
    if (!q) return true;
    return (s.name || '').toLocaleLowerCase('tr').includes(q) || CISIM_ADLARI[s.type].toLocaleLowerCase('tr').includes(q);
  });

  // Seçili cismin canlı ölçümleri (Bağlamlar)
  const olcumler = useMemo(() => {
    if (!selectedSolid) return null;
    const mesh = selectedSolid.selectedFaceIndex !== null && selectedSolid.selectedFaceIndex !== undefined ? generateSolidMesh(selectedSolid) : null;
    const yuz = mesh && selectedSolid.selectedFaceIndex !== null ? mesh.faces[selectedSolid.selectedFaceIndex] : null;
    return {
      hacim: calculate3DVolume(selectedSolid),
      alan: calculate3DSurfaceArea(selectedSolid),
      sayilar: getSolidPropertyCounts(selectedSolid.type),
      seciliYuz:
        mesh && yuz && selectedSolid.selectedFaceIndex !== null
          ? {
              index: selectedSolid.selectedFaceIndex,
              label: yuz.label || `Yüz ${selectedSolid.selectedFaceIndex + 1}`,
              area: computeFaceArea(mesh.vertices, yuz.vertexIndices),
              color: selectedSolid.faceColors?.[selectedSolid.selectedFaceIndex] ?? null,
            }
          : null,
    };
  }, [selectedSolid]);

  const sekmeDugmesi = (sekme: SidebarTab, baslik: string, etiket: string, simge: React.ReactNode, rozet?: React.ReactNode) => {
    const etkin = sidebarTab === sekme && !isPanelCollapsed;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={etkin}
        aria-label={etiket}
        onClick={() => sekmeyeGit(sekme)}
        title={baslik}
        className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
          etkin ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        {simge}
        <span className="text-[11px] font-bold leading-none">{etiket}</span>
        {rozet}
      </button>
    );
  };

  const dims = selectedSolid?.dimensions;
  const yaricap = dims ? dims.radius ?? dims.width / 2 : 0;
  const donme = selectedSolid?.rotation ?? { x: 0, y: 0, z: 0 };
  const boyutGuncelle = (patch: Partial<Solid3DObject['dimensions']>) => {
    if (!dims) return;
    onUpdateSolid?.({ dimensions: { ...dims, ...patch } });
  };
  const kutuMu = selectedSolid ? selectedSolid.type === 'prism' || selectedSolid.type === 'pyramid' || selectedSolid.type === 'triangular_prism' : false;
  const yuvarlakMi = selectedSolid ? selectedSolid.type === 'sphere' || selectedSolid.type === 'cylinder' || selectedSolid.type === 'cone' : false;

  return (
    <div className="flex h-full min-h-0 bg-card/95 backdrop-blur-md border-r border-border select-none z-30 shadow-sm shrink-0 relative">
      {/* 1. SOL DİKEY MENÜ SEÇİCİ (68 px) */}
      <div className="w-[68px] shrink-0 h-full border-r border-border flex flex-col items-center py-4 justify-between bg-muted/60" role="tablist" aria-label="3B panel sekmeleri">
        <div className="flex flex-col items-center gap-3 w-full px-1">
          {sekmeDugmesi('araclar', 'Araçlar (Katı Cisim, Dönüşüm ve Ölçme Araçları)', 'Araçlar', <Box className="w-5 h-5 shrink-0" aria-hidden="true" />)}
          {sekmeDugmesi(
            'nesneler',
            'Nesneler (Sahnedeki Katı Cisimler)',
            'Nesneler',
            <Layers className="w-5 h-5 shrink-0" aria-hidden="true" />,
            solids.length > 0 ? (
              <span
                className={`absolute -top-1 -right-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full border shadow-xs ${
                  sidebarTab === 'nesneler' && !isPanelCollapsed ? 'bg-card text-primary border-primary/30' : 'bg-primary text-primary-foreground border-border'
                }`}
              >
                {solids.length}
              </span>
            ) : undefined
          )}
          {sekmeDugmesi(
            'baglamlar',
            'Bağlamlar (Seçili Cismin Ölçüleri, Boyutları ve Rengi)',
            'Bağlamlar',
            <Sparkles className="w-5 h-5 shrink-0" aria-hidden="true" />,
            selectedSolid ? <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-ada-vurgu ring-2 ring-background animate-pulse" /> : undefined
          )}
          {sekmeDugmesi('gorunumler', 'Görünümler (2D, 3D, Cebir ve Çoklu Bölmeler)', 'Görünümler', <LayoutGrid className="w-5 h-5 shrink-0" aria-hidden="true" />)}
        </div>

        <div className="flex flex-col items-center gap-2 w-full px-1">
          <div className="w-8 h-px bg-border/80" />
          <button
            type="button"
            role="tab"
            aria-selected={sidebarTab === 'ara' && !isPanelCollapsed}
            onClick={() => {
              if (sidebarTab === 'ara' && !isPanelCollapsed) setSidebarTab('araclar');
              else sekmeyeGit('ara');
            }}
            title="3B Araç Ara"
            aria-label="Ara"
            className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              sidebarTab === 'ara' && !isPanelCollapsed ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Search className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="text-[11px] font-bold leading-none">Ara</span>
          </button>
        </div>
      </div>

      {/* 2. İÇERİK PANELİ — genişlik geçişle kapanır, içerik kaldırılmaz */}
      <div className={`h-full flex flex-col min-h-0 overflow-hidden transition-[width] duration-200 ${isPanelCollapsed ? 'w-0' : 'w-64 sm:w-72'}`}>
        {/* ================= A. ARAÇLAR ================= */}
        {sidebarTab === 'araclar' && (
          <div className="flex-1 flex flex-col min-h-0 bg-card">
            <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
              <h3 className="text-sm font-bold text-foreground tracking-tight">Çalışma Alanım</h3>
              {/* Geri al / yinele burada değil: tuvalin sol üst köşesindeki düğmeler (2B ile aynı yer) kullanılır. */}
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={toggleAllGroups}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Tüm Grupları Aç / Kapat"
                  aria-label="Tüm Grupları Aç / Kapat"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                {solids.length > 0 && onClearAll && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className="text-[11px] font-bold text-destructive hover:text-destructive flex items-center gap-1 hover:bg-destructive/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Sahnedeki Bütün Cisimleri Sil"
                    aria-label="Tümünü Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Tümünü Sil</span>
                  </button>
                )}
              </div>
            </div>

            {/* Kademe süzgeci açıkken: "İlkokul araçları · Tüm araçlar" */}
            <KademeSuzgeciSeridi duzey={kademeDuzeyi} onTumAraclar={tumAraclaraDon} />

            <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3.5 scrollbar-thin">
              {aracGruplari.map((group) => {
                const isExpanded = expandedGroups[group.id] ?? true;
                return (
                  <div key={group.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-muted/60 group select-none"
                      aria-expanded={isExpanded}
                      title={`${group.name} grubunu ${isExpanded ? 'kapat' : 'aç'}`}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" aria-hidden="true" />
                        )}
                        <span className="text-[13px] font-bold text-foreground/90 group-hover:text-foreground">{group.name}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground/70 px-1.5 py-0.5 rounded-md bg-muted/80">{group.tools.length}</span>
                    </button>

                    {isExpanded && (
                      <div className="flex flex-col space-y-0.5 pl-3">
                        {/* Katı Cisimler: ekleme yöntemi (bölütlü denetim) */}
                        {group.id === 'kati_cisimler' && (
                          <div className="flex items-center gap-1 p-0.5 mb-1 rounded-lg bg-muted/60 border border-border/60" role="radiogroup" aria-label="Cisim ekleme yöntemi">
                            {(
                              [
                                { kip: 'instant', ad: 'Tıkla Ekle', aciklama: 'Cisim sahnenin ortasına eklenir' },
                                { kip: 'draw', ad: 'Zeminde Çiz', aciklama: 'Tabanı zeminde sürükleyerek çizin' },
                              ] as { kip: CreationMethod; ad: string; aciklama: string }[]
                            ).map((secenek) => (
                              <button
                                key={secenek.kip}
                                type="button"
                                role="radio"
                                aria-checked={creationMethod === secenek.kip}
                                onClick={() => setCreationMethod(secenek.kip)}
                                title={secenek.aciklama}
                                className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                  creationMethod === secenek.kip ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {secenek.ad}
                              </button>
                            ))}
                          </div>
                        )}

                        {group.tools.map((tool) => {
                          const isActive = aracEtkinMi(tool);
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => aracTikla(tool)}
                              title={aracBasligi(tool)}
                              aria-label={tool.name}
                              aria-pressed={isActive}
                              className={`w-full flex items-center gap-3 min-h-[44px] px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer select-none text-[13px] ${
                                isActive ? 'bg-accent text-foreground font-semibold shadow-xs ring-1 ring-primary/25' : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground font-medium'
                              }`}
                            >
                              <div className={`w-5 h-5 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 ${tool.iconColor}`}>{tool.icon}</div>
                              <span className="flex-1 truncate leading-tight">{tool.name}</span>
                              {tool.kind === 'toggle' && isActive && <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />}
                              {tool.kind === 'solid' && !tool.preset && (
                                <span className="text-[11px] text-muted-foreground/60 shrink-0">{creationMethod === 'draw' ? 'Çiz' : 'Ekle'}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Sahne düzeni (araç değil, eylem) */}
              <div className="pt-1 border-t border-border/60 flex flex-col space-y-0.5">
                <button
                  type="button"
                  onClick={onAutoArrange}
                  title="Cisimleri Hizala — cisimleri zeminde düzenli aralıklarla sıralar"
                  aria-label="Cisimleri Hizala"
                  className="w-full flex items-center gap-3 min-h-[44px] px-2.5 py-1.5 rounded-lg text-left text-[13px] font-medium text-foreground/80 hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer"
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0 text-muted-foreground">
                    <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="flex-1 truncate leading-tight">Cisimleri Hizala</span>
                </button>
                {onOpenAddObjectDialog && (
                  <button
                    type="button"
                    onClick={onOpenAddObjectDialog}
                    title="Ölçülü Cisim Ekle — boyutlarını yazarak cisim ekleyin"
                    aria-label="Ölçülü Cisim Ekle"
                    className="w-full flex items-center gap-3 min-h-[44px] px-2.5 py-1.5 rounded-lg text-left text-[13px] font-medium text-foreground/80 hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer"
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0 text-muted-foreground">
                      <Ruler className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <span className="flex-1 truncate leading-tight">Ölçülü Cisim Ekle</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= B. NESNELER ================= */}
        {sidebarTab === 'nesneler' && (
          <div className="flex-1 flex flex-col min-h-0 bg-card">
            <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground tracking-tight">Sahne Cisimleri</h3>
                <span className="text-[11px] font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-muted">{solids.length}</span>
              </div>
              {solids.length > 0 && onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-[11px] font-bold text-destructive hover:text-destructive flex items-center gap-1 hover:bg-destructive/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Sahnedeki Bütün Cisimleri Sil"
                  aria-label="Tümünü Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Tümünü Sil</span>
                </button>
              )}
            </div>

            <div className="p-3 border-b border-border/60 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  type="text"
                  value={objectSearch}
                  onChange={(e) => setObjectSearch(e.target.value)}
                  placeholder="Cisim ara (örn: küp, prizma)..."
                  aria-label="Cisim ara"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground text-[13px] placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {solids.length === 0 ? (
                <div className="text-center py-12 px-4 text-muted-foreground text-[13px] space-y-3">
                  <Box className="w-10 h-10 mx-auto text-muted-foreground/40" aria-hidden="true" />
                  <p className="font-medium">
                    Sahnede henüz cisim yok.
                    <br />
                    Katı Cisimler grubundan ekleyin.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('araclar')}
                    title="Araçlar sekmesine git"
                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Box className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Araçlara Git</span>
                  </button>
                </div>
              ) : filteredSolids.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-[13px] font-medium" role="status">
                  Aramaya uyan cisim bulunamadı.
                </div>
              ) : (
                filteredSolids.map((s) => {
                  const isSelected = selectedSolidId === s.id || selectedSolidIds.includes(s.id);
                  const gizli = cisimGizliMi(s);
                  const duzenleniyor = adDuzenlenen?.id === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => cismiSec(s.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected ? 'bg-primary/10 border-primary/40 shadow-xs ring-1 ring-primary/20' : 'bg-muted/30 border-border/60 hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              gorunurlukDegistir(s);
                            }}
                            className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer p-0.5"
                            title={gizli ? 'Göster' : 'Gizle'}
                            aria-label={gizli ? `${s.name} cismini göster` : `${s.name} cismini gizle`}
                            aria-pressed={!gizli}
                          >
                            {gizli ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground/60" aria-hidden="true" /> : <Eye className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}
                          </button>

                          <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-foreground/15 shadow-xs" style={{ backgroundColor: s.color }} />

                          {duzenleniyor ? (
                            <form
                              className="flex items-center gap-1 min-w-0 flex-1"
                              onSubmit={(e) => {
                                e.preventDefault();
                                adiUygula();
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                autoFocus
                                type="text"
                                value={adDuzenlenen.taslak}
                                aria-label="Cisim adı"
                                onChange={(e) => setAdDuzenlenen({ id: s.id, taslak: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setAdDuzenlenen(null);
                                }}
                                className="w-full px-1.5 py-0.5 rounded bg-background border text-[12px] outline-none focus:border-primary"
                              />
                              <button type="submit" className="p-1 rounded bg-primary text-primary-foreground" title="Adı kaydet" aria-label="Adı kaydet">
                                <Check className="w-3 h-3" aria-hidden="true" />
                              </button>
                              <button type="button" onClick={() => setAdDuzenlenen(null)} className="p-1 rounded bg-muted" title="Vazgeç" aria-label="Vazgeç">
                                <X className="w-3 h-3" aria-hidden="true" />
                              </button>
                            </form>
                          ) : (
                            <div className="min-w-0 flex-1 leading-tight">
                              <span
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setAdDuzenlenen({ id: s.id, taslak: s.name });
                                }}
                                title="Adı düzenlemek için çift tıklayın"
                                className="block font-bold text-[13px] text-foreground truncate"
                              >
                                {s.name}
                              </span>
                              <span className="block text-[11px] text-muted-foreground truncate">
                                {CISIM_ADLARI[s.type]} · ({formatTurkishNumber(s.position.x, 1)}; {formatTurkishNumber(s.position.y, 1)}; {formatTurkishNumber(s.position.z, 1)})
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              cismiSec(s.id);
                              setSidebarTab('baglamlar');
                            }}
                            className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            title="Bu cismin bağlamını aç"
                            aria-label={`${s.name} bağlamını aç`}
                          >
                            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSolidById?.(s.id);
                            }}
                            className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            title="Cismi Sil"
                            aria-label={`${s.name} cismini sil`}
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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

        {/* ================= C. BAĞLAMLAR ================= */}
        {sidebarTab === 'baglamlar' && (
          <div className="flex-1 flex flex-col min-h-0 bg-card">
            <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-bold text-foreground tracking-tight">Cisim Bağlamı</h3>
              </div>
              {selectedSolid && (
                <button
                  type="button"
                  onClick={() => cismiSec(null)}
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  title="Seçimi Kaldır"
                >
                  Seçimi Kaldır
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
              {!selectedSolid || !dims || !olcumler ? (
                <div className="text-center py-14 px-4 text-muted-foreground text-[13px] space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-xs">
                    <Sparkles className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">Seçili Cisim Yok</h4>
                    <p className="mt-1 text-muted-foreground/80 leading-relaxed">
                      Sahneden veya <strong>Nesneler</strong> sekmesinden bir cisim seçin. Hacmi, yüzey alanı, boyutları ve rengi burada görünür.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('nesneler')}
                    title="Nesneler sekmesine git"
                    className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Nesneler Listesini Gör</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Başlık kartı */}
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full border border-foreground/15 shadow-xs shrink-0" style={{ backgroundColor: selectedSolid.color }} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-foreground truncate">{selectedSolid.name}</div>
                        <div className="text-[11px] text-muted-foreground">{CISIM_ADLARI[selectedSolid.type]}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onDeleteSelected}
                      className="p-1.5 rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0"
                      title="Seçili Cismi Sil"
                      aria-label="Seçili Cismi Sil"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Canlı ölçümler: V, A ve K - E + Y = 2 (MAT.8.4.3) */}
                  <section className="p-3 rounded-2xl bg-gradient-to-br from-ada-deniz/10 via-ada-vurgu/5 to-ada-lavanta/10 border border-primary/20 space-y-2" aria-live="polite">
                    <h4 className="text-[13px] font-bold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Canlı Ölçümler</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-xl bg-card border border-border/80 text-center">
                        <span className="text-[11px] font-semibold text-muted-foreground block">Hacim</span>
                        <span className="font-mono font-bold text-ada-deniz dark:text-ada-vurgu text-[13px]">V = {formatTurkishNumber(olcumler.hacim, 2)} br³</span>
                      </div>
                      <div className="p-2 rounded-xl bg-card border border-border/80 text-center">
                        <span className="text-[11px] font-semibold text-muted-foreground block">Yüzey Alanı</span>
                        <span className="font-mono font-bold text-ada-deniz-koyu dark:text-ada-lavanta text-[13px]">A = {formatTurkishNumber(olcumler.alan, 2)} br²</span>
                      </div>
                    </div>
                    {olcumler.sayilar.eulerValid && (
                      <div className="p-2 rounded-xl bg-card border border-border/80 text-[12px] font-mono text-muted-foreground flex items-center justify-between gap-2">
                        <span>
                          K = <strong className="text-foreground">{olcumler.sayilar.vertices}</strong>
                        </span>
                        <span>
                          E = <strong className="text-foreground">{olcumler.sayilar.edges}</strong>
                        </span>
                        <span>
                          Y = <strong className="text-foreground">{olcumler.sayilar.faces}</strong>
                        </span>
                        <span className="text-primary font-bold" title="Euler bağıntısı: Köşe - Ayrıt + Yüz = 2">
                          K - E + Y = 2
                        </span>
                      </div>
                    )}
                  </section>

                  {/* Seçili yüz: alanı ve rengi */}
                  {olcumler.seciliYuz && ((yuz) => (
                    <BaglamKarti
                      baslik={`Seçili Yüz: ${yuz.label}`}
                      simge={<Paintbrush className="w-3.5 h-3.5 text-ada-altin dark:text-ada-fener" aria-hidden="true" />}
                      sag={<span className="font-mono text-[12px] text-muted-foreground">A = {formatTurkishNumber(yuz.area, 2)} br²</span>}
                    >
                      <div className="flex flex-wrap gap-1.5 items-center" role="group" aria-label="Yüz rengi">
                        {CISIM_RENKLERI.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => onUpdateSolid?.({ faceColors: { ...(selectedSolid.faceColors || {}), [yuz.index]: c.hex } })}
                            title={`Yüzü ${c.name} yap`}
                            aria-label={`Yüzü ${c.name} yap`}
                            aria-pressed={yuz.color === c.hex}
                            className={`w-6 h-6 rounded-lg border border-foreground/15 transition-transform cursor-pointer ${
                              yuz.color === c.hex ? 'scale-110 ring-2 ring-primary ring-offset-1' : 'hover:scale-105'
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const sonraki = { ...(selectedSolid.faceColors || {}) };
                            delete sonraki[yuz.index];
                            onUpdateSolid?.({ faceColors: sonraki });
                          }}
                          title="Yüzün özel rengini kaldır"
                          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-card border border-border hover:bg-muted cursor-pointer"
                        >
                          Rengi Kaldır
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateSolid?.({ selectedFaceIndex: null })}
                          title="Yüz seçimini bırak"
                          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-card border border-border hover:bg-muted cursor-pointer"
                        >
                          Seçimi Bırak
                        </button>
                      </div>
                    </BaglamKarti>
                  ))(olcumler.seciliYuz)}

                  {/* Açınım */}
                  {selectedSolid.type !== 'sphere' && (
                    <BaglamKarti
                      baslik="Açınım"
                      simge={<BookOpen className="w-3.5 h-3.5 text-ada-altin dark:text-ada-fener" aria-hidden="true" />}
                      sag={<span className="font-mono text-[12px] text-muted-foreground">%{Math.round((selectedSolid.unfoldProgress || 0) * 100)}</span>}
                    >
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={selectedSolid.unfoldProgress || 0}
                        aria-label="Açınım oranı"
                        onChange={(e) => onUpdateSolid?.({ unfoldProgress: parseFloat(e.target.value) })}
                        className="w-full accent-primary cursor-pointer"
                      />
                      <div className="flex items-center gap-1">
                        {[
                          { v: 0, ad: 'Kapalı' },
                          { v: 0.5, ad: 'Yarı Açık' },
                          { v: 1, ad: 'Tam Açık' },
                        ].map((b) => {
                          const etkin = Math.abs((selectedSolid.unfoldProgress || 0) - b.v) < 0.03;
                          return (
                            <button
                              key={b.v}
                              type="button"
                              onClick={() => onUpdateSolid?.({ unfoldProgress: b.v })}
                              aria-pressed={etkin}
                              title={`Açınım: ${b.ad}`}
                              className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                etkin ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'
                              }`}
                            >
                              {b.ad}
                            </button>
                          );
                        })}
                      </div>
                    </BaglamKarti>
                  )}

                  {/* Boyutlar */}
                  <BaglamKarti
                    baslik="Boyutlar"
                    simge={<Ruler className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}
                    sag={
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatTurkishNumber(dims.width)} × {formatTurkishNumber(dims.height)} × {formatTurkishNumber(dims.depth)} br
                      </span>
                    }
                  >
                    {selectedSolid.type === 'cube' && (
                      <KaydiriciSatiri
                        label="Kenar (a)"
                        value={dims.width}
                        min={0.5}
                        max={10}
                        step={0.5}
                        onChange={(a) => onUpdateSolid?.({ dimensions: { width: a, height: a, depth: a, radius: a / 2 } })}
                      />
                    )}
                    {kutuMu && (
                      <>
                        <KaydiriciSatiri label="Genişlik" value={dims.width} min={0.5} max={12} step={0.5} onChange={(v) => boyutGuncelle({ width: v })} />
                        <KaydiriciSatiri label="Yükseklik" value={dims.height} min={0.5} max={12} step={0.5} onChange={(v) => boyutGuncelle({ height: v })} />
                        <KaydiriciSatiri label="Derinlik" value={dims.depth} min={0.5} max={12} step={0.5} onChange={(v) => boyutGuncelle({ depth: v })} />
                      </>
                    )}
                    {yuvarlakMi && (
                      <KaydiriciSatiri
                        label="Yarıçap (r)"
                        value={yaricap}
                        min={0.25}
                        max={8}
                        step={0.25}
                        onChange={(r) => boyutGuncelle({ radius: r, width: r * 2, depth: r * 2, ...(selectedSolid.type === 'sphere' ? { height: r * 2 } : {}) })}
                      />
                    )}
                    {(selectedSolid.type === 'cylinder' || selectedSolid.type === 'cone') && (
                      <KaydiriciSatiri label="Yükseklik (h)" value={dims.height} min={0.5} max={12} step={0.5} onChange={(v) => boyutGuncelle({ height: v })} />
                    )}
                  </BaglamKarti>

                  {/* Konum (taban merkezi) */}
                  <BaglamKarti
                    baslik="Konum"
                    simge={<MapPin className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}
                    sag={
                      <span className="text-[11px] text-muted-foreground font-mono">
                        ({formatTurkishNumber(selectedSolid.position.x)}; {formatTurkishNumber(selectedSolid.position.y)}; {formatTurkishNumber(selectedSolid.position.z)})
                      </span>
                    }
                  >
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {EKSENLER.map((eksen) => (
                        <div key={eksen.key} className="space-y-1">
                          <span className={`text-[11px] font-bold ${eksen.cls}`}>{eksen.label}</span>
                          <SayiAlani
                            label={`Konum ${eksen.label}`}
                            value={selectedSolid.position[eksen.key]}
                            min={-50}
                            max={50}
                            onCommit={(v) => onUpdateSolid?.({ position: { ...selectedSolid.position, [eksen.key]: v } })}
                          />
                        </div>
                      ))}
                    </div>
                  </BaglamKarti>

                  {/* Cismi Döndür (derece; X → Y → Z sırası) */}
                  <BaglamKarti
                    baslik="Cismi Döndür"
                    simge={<RotateCw className="w-3.5 h-3.5 text-ada-mercan" aria-hidden="true" />}
                    sag={
                      <button
                        type="button"
                        onClick={() => onUpdateSolid?.({ rotation: { x: 0, y: 0, z: 0 } })}
                        title="Döndürmeyi sıfırla"
                        className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-muted hover:bg-muted/70 border border-border cursor-pointer"
                      >
                        Sıfırla
                      </button>
                    }
                  >
                    {EKSENLER.map((eksen) => (
                      <KaydiriciSatiri
                        key={eksen.key}
                        label={`${eksen.label} ekseni`}
                        value={donme[eksen.key]}
                        min={-180}
                        max={180}
                        step={5}
                        unit="°"
                        onChange={(v) => onUpdateSolid?.({ rotation: { ...donme, [eksen.key]: v } })}
                      />
                    ))}
                  </BaglamKarti>

                  {/* Renk, saydamlık, telkafes */}
                  <BaglamKarti baslik="Renk ve Görünüm" simge={<Paintbrush className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Cisim rengi">
                      {CISIM_RENKLERI.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => onUpdateSolid?.({ color: c.hex })}
                          title={c.name}
                          aria-label={`Renk: ${c.name}`}
                          aria-pressed={selectedSolid.color === c.hex}
                          className={`w-7 h-7 rounded-xl border border-foreground/15 transition-transform cursor-pointer ${
                            selectedSolid.color === c.hex ? 'scale-110 ring-2 ring-primary ring-offset-2' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[12px] font-semibold text-foreground/90">
                        <span>Saydamlık</span>
                        <span className="font-mono">%{Math.round(selectedSolid.opacity * 100)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={selectedSolid.opacity}
                        aria-label="Saydamlık"
                        onChange={(e) => onUpdateSolid?.({ opacity: parseFloat(e.target.value) })}
                        className="w-full accent-primary cursor-pointer"
                      />
                    </div>
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-foreground/90">Telkafes</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!selectedSolid.showWireframe}
                        aria-label="Telkafes"
                        title="Telkafes (yalnız ayrıtlar)"
                        onClick={() => onUpdateSolid?.({ showWireframe: !selectedSolid.showWireframe })}
                        className={`w-10 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${selectedSolid.showWireframe ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`block w-5 h-5 rounded-full bg-card shadow-xs transition-transform ${selectedSolid.showWireframe ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </BaglamKarti>
                </>
              )}
            </div>
          </div>
        )}

        {/* ================= D. GÖRÜNÜMLER ================= */}
        {sidebarTab === 'gorunumler' && (
          <div className="flex-1 flex flex-col min-h-0 bg-card">
            <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-bold text-foreground tracking-tight">Çalışma Alanı Düzenleri</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {LAYOUT_OPTIONS.map((opt) => {
                const isCurrent = layoutMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => onLayoutModeChange?.(opt.mode)}
                    onMouseEnter={(e) => setLayoutTooltip({ text: opt.description, x: e.clientX + 14, y: e.clientY + 10 })}
                    onMouseMove={(e) => setLayoutTooltip({ text: opt.description, x: e.clientX + 14, y: e.clientY + 10 })}
                    onMouseLeave={() => setLayoutTooltip(null)}
                    title={opt.description}
                    aria-label={opt.name}
                    aria-pressed={isCurrent}
                    className={`w-full p-2.5 rounded-2xl border text-left transition-all cursor-pointer select-none relative group ${
                      isCurrent ? 'bg-primary/10 border-primary/50 shadow-sm ring-1 ring-primary/30' : 'bg-muted/30 border-border/70 hover:bg-muted/60 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl shrink-0 transition-transform ${isCurrent ? 'bg-primary text-primary-foreground shadow-xs [&>svg]:!text-primary-foreground' : 'bg-background border border-border group-hover:scale-105'}`}>
                        {opt.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-[13px] text-foreground">{opt.name}</span>
                          <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {opt.badge}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isCurrent && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-[11px] font-bold text-primary">
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {layoutTooltip && (
              <div
                style={{ left: layoutTooltip.x, top: layoutTooltip.y }}
                className="fixed z-[1000] pointer-events-none px-3 py-1.5 rounded-xl bg-ada-murekkep/95 text-ada-fildisi dark:bg-ada-fildisi/95 dark:text-ada-murekkep text-xs font-medium shadow-2xl border border-border/50 backdrop-blur-md max-w-xs animate-in fade-in-0 zoom-in-95 duration-100 select-none leading-tight"
              >
                {layoutTooltip.text}
              </div>
            )}
          </div>
        )}

        {/* ================= E. ARA ================= */}
        {sidebarTab === 'ara' && (
          <div className="flex-1 flex flex-col min-h-0 bg-card">
            <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-bold text-foreground tracking-tight">3B Araç Ara</h3>
              </div>
              {toolSearch && (
                <button
                  type="button"
                  onClick={() => setToolSearch('')}
                  title="Aramayı temizle"
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
                >
                  Temizle
                </button>
              )}
            </div>

            <div className="p-3 border-b border-border/60 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  type="text"
                  autoFocus
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  placeholder="Araç ara (örn: döndür, küp, açınım)..."
                  aria-label="3B araç ara"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground text-[13px] placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Kademe süzgeci açıkken arama da yalnız o kademenin araçlarında yapılır */}
            <KademeSuzgeciSeridi duzey={kademeDuzeyi} onTumAraclar={tumAraclaraDon} />

            <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 scrollbar-thin">
              {normalizedSearch !== '' && aramaSonuclari.length === 0 && (
                <KademeAramaBosNotu arama={toolSearch.trim()} duzey={kademeDuzeyi} suzgecGizledi={suzgecAramayiGizledi} onTumAraclar={tumAraclaraDon} />
              )}
              {aramaSonuclari.map((tool) => {
                const isActive = aracEtkinMi(tool);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => aracTikla(tool)}
                    title={aracBasligi(tool)}
                    aria-label={tool.name}
                    aria-pressed={isActive}
                    className={`w-full flex items-center justify-between min-h-[44px] px-3 py-2 rounded-xl text-left transition-all cursor-pointer select-none text-[13px] ${
                      isActive ? 'bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/30' : 'text-foreground/90 hover:bg-muted/70 hover:text-foreground font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 ${tool.iconColor}`}>{tool.icon}</div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold">{tool.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{tool.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
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
        aria-expanded={!isPanelCollapsed}
      >
        {isPanelCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
