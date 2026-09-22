'use client';

import React, { useState } from 'react';
import { GeometryToolIcon } from './GeometryToolIcon';
import { Tool3DMode, Solid3DType, Solid3DObject } from '@/types/workspace3d';
import { LayoutMode } from '@/types/workspace';

type CameraPreset = 'isometric' | 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left' | 'side';
import {
  MousePointer,
  RotateCw,
  Hand,
  Eye,
  Trash2,
  Box,
  Cylinder,
  Cone,
  Pyramid,
  Plus,
  PanelLeftClose,
  ChevronDown,
  ChevronRight,
  Search,
  Layers,
  Sparkles,
  LayoutGrid,
  Columns2,
  Columns3,
  Calculator,
  PanelLeft,
  PanelRight,
  Square,
  Check,
  CircleDot,
  ScanSearch,
} from 'lucide-react';

interface Toolbar3DProps {
  activeTool: Tool3DMode;
  setActiveTool: (tool: Tool3DMode) => void;
  onAddSolid: (type: Solid3DType) => void;
  onAutoArrange: () => void;
  onSetCameraPreset: (preset: CameraPreset) => void;
  toggleShowVertices: () => void;
  toggleShowEdges: () => void;
  toggleShowFaces: () => void;
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
  onUpdateSolid?: (updates: Partial<Solid3DObject>) => void;
  onDeleteSolidById?: (id: string) => void;
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
}

const SOLID_DEFINITIONS: {
  type: Solid3DType;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { type: 'cube', label: 'Küp', description: 'Eşit kenarlı 6 kare yüzlü düzgün prizma', Icon: Box },
  { type: 'sphere', label: 'Küre', description: 'Merkezden eşit uzaklıkta noktalar kümesi', Icon: ({ className }) => <GeometryToolIcon kind="sphere" className={className} /> },
  { type: 'cylinder', label: 'Silindir', description: 'İki daire tabanlı ve kavisli yan yüzey', Icon: Cylinder },
  { type: 'prism', label: 'Dikdörtgenler Prizması', description: 'Karşılıklı yüzleri eşit dikdörtgen prizma', Icon: ({ className }) => <GeometryToolIcon kind="prism" className={className} /> },
  { type: 'triangular_prism', label: 'Üçgen Prizma', description: 'İki üçgen taban ve üç dikdörtgen yan yüzey', Icon: ({ className }) => <GeometryToolIcon kind="triangularPrism" className={className} /> },
  { type: 'cone', label: 'Koni', description: 'Dairesel taban ve sivri tepe noktası', Icon: Cone },
  { type: 'pyramid', label: 'Kare Piramit', description: 'Kare tabanlı ve tepe noktasında birleşen 4 üçgen', Icon: Pyramid },
];

const PRESET_COLORS = [
  { hex: '#3b82f6', name: 'Mavi' },
  { hex: '#8b5cf6', name: 'Mor' },
  { hex: '#ec4899', name: 'Pembe' },
  { hex: '#10b981', name: 'Zümrüt' },
  { hex: '#f59e0b', name: 'Kehribar' },
  { hex: '#06b6d4', name: 'Camgöbeği' },
  { hex: '#6366f1', name: 'İndigo' },
  { hex: '#ef4444', name: 'Kırmızı' },
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
  showVertices,
  showEdges,
  showFaces,
  onDeleteSelected,
  hasSelection = false,
  onClearAll,
  onOpenAddObjectDialog,
  onSwitchTo2D,
  solids = [],
  selectedSolidId = null,
  selectedSolidIds = [],
  onSelectSolid,
  onSelectSolids,
  onUpdateSolid,
  onDeleteSolidById,
  layoutMode = '3d_only',
  onLayoutModeChange,
}: Toolbar3DProps) {
  const [sidebarTab, setSidebarTab] = useState<'araclar' | 'nesneler' | 'baglamlar' | 'gorunumler' | 'ara'>('araclar');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [creationMethod, setCreationMethod] = useState<'instant' | 'draw'>('instant');
  const [toolSearch, setToolSearch] = useState('');
  const [objectSearch, setObjectSearch] = useState('');
  const [layoutTooltip, setLayoutTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    incele: true,
    olustur: true,
    katmanlar: true,
    duzen: true,
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedSolid = solids.find((s) => s.id === selectedSolidId) || null;

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

  const filteredSolids = solids.filter((s) => {
    if (!objectSearch.trim()) return true;
    const q = objectSearch.trim().toLocaleLowerCase('tr');
    return (s.name || '').toLocaleLowerCase('tr').includes(q) || s.type.toLocaleLowerCase('tr').includes(q);
  });

  const normalizedSearch = toolSearch.trim().toLocaleLowerCase('tr');

  // Arama için 3D araç listesi
  const ALL_3D_TOOLS: {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    action: () => void;
  }[] = [
    {
      id: 'select_move',
      name: 'Cismi Seç / Taşı',
      description: 'Cismin konumunu 3D sahnede taşır',
      icon: <MousePointer className="w-4 h-4 text-ada-deniz dark:text-ada-vurgu" />,
      action: () => setActiveTool('select_move'),
    },
    {
      id: 'orbit',
      name: 'Görünümü Döndür',
      description: 'Fareyle sürükleyerek 3D sahneyi serbestçe çevirir',
      icon: <RotateCw className="w-4 h-4 text-ada-mercan" />,
      action: () => setActiveTool('orbit'),
    },
    {
      id: 'pan',
      name: 'Görünümü Kaydır',
      description: 'Kamera bakış noktasını kaydırır',
      icon: <Hand className="w-4 h-4 text-ada-mercan" />,
      action: () => setActiveTool('pan'),
    },
    {
      id: 'inspect',
      name: 'Yüz Seç ve İncele',
      description: 'Yüz alanlarını, ayrıt uzunluklarını ve açıları inceler',
      icon: <ScanSearch className="w-4 h-4 text-ada-altin dark:text-ada-fener" />,
      action: () => setActiveTool('inspect'),
    },
    ...SOLID_DEFINITIONS.map((s) => ({
      id: `create_${s.type}`,
      name: `${s.label} Ekle`,
      description: s.description,
      icon: <s.Icon className="w-4 h-4 text-ada-vurgu" />,
      action: () => {
        if (creationMethod === 'draw') {
          setActiveTool(`create_${s.type}` as Tool3DMode);
        } else {
          onAddSolid(s.type);
        }
      },
    })),
    {
      id: 'arrange',
      name: 'Cisimleri Otomatik Hizala',
      description: 'Cisimleri zeminde düzenli aralıklarla hizalar',
      icon: <LayoutGrid className="w-4 h-4 text-ada-deniz dark:text-ada-vurgu" />,
      action: onAutoArrange,
    },
    {
      id: 'clear',
      name: 'Sahneyi Temizle',
      description: 'Sahnede bulunan tüm 3D cisimleri siler',
      icon: <Trash2 className="w-4 h-4 text-destructive" />,
      action: () => onClearAll?.(),
    },
  ];

  return (
    <div className="flex h-full min-h-0 bg-card/95 backdrop-blur-md border-r border-border select-none z-30 shadow-sm shrink-0 relative">
      {/* 1. SOL DİKEY MENÜ SEÇİCİ (2D İLE BİREBİR AYNI 68px SABİT ŞERİT) */}
      <div className="w-[68px] shrink-0 h-full border-r border-border flex flex-col items-center py-4 justify-between bg-muted/60">
        {/* Üst Kısım: Araçlar, Nesneler, Bağlamlar, Görünümler Butonları */}
        <div className="flex flex-col items-center gap-3 w-full px-1">
          {/* 1. Araçlar Sekmesi */}
          <button
            onClick={() => {
              if (sidebarTab === 'araclar' && !isPanelCollapsed) {
                setIsPanelCollapsed(true);
              } else {
                setSidebarTab('araclar');
                setIsPanelCollapsed(false);
              }
            }}
            title="3D Araçlar (Katı Cisim ve Kamera Araçları)"
            className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              sidebarTab === 'araclar' && !isPanelCollapsed
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Box className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-bold leading-none">Araçlar</span>
          </button>

          {/* 2. Nesneler Sekmesi */}
          <button
            onClick={() => {
              if (sidebarTab === 'nesneler' && !isPanelCollapsed) {
                setIsPanelCollapsed(true);
              } else {
                setSidebarTab('nesneler');
                setIsPanelCollapsed(false);
              }
            }}
            title="Nesneler (Sahnedeki 3D Katı Cisimler)"
            className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              sidebarTab === 'nesneler' && !isPanelCollapsed
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Layers className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-bold leading-none">Nesneler</span>
            {solids.length > 0 && (
              <span
                className={`absolute -top-1 -right-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full border shadow-xs ${
                  sidebarTab === 'nesneler' && !isPanelCollapsed
                    ? 'bg-card text-primary border-primary/30'
                    : 'bg-primary text-primary-foreground border-border'
                }`}
              >
                {solids.length}
              </span>
            )}
          </button>

          {/* 3. Bağlamlar Sekmesi */}
          <button
            onClick={() => {
              if (sidebarTab === 'baglamlar' && !isPanelCollapsed) {
                setIsPanelCollapsed(true);
              } else {
                setSidebarTab('baglamlar');
                setIsPanelCollapsed(false);
              }
            }}
            title="Bağlamlar (Seçili Cisme Özel Renk & Boyut Ayarları)"
            className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              sidebarTab === 'baglamlar' && !isPanelCollapsed
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span className="text-[9.5px] font-bold leading-none">Bağlamlar</span>
            {selectedSolid && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-ada-vurgu ring-2 ring-background animate-pulse" />
            )}
          </button>

          {/* 4. Görünümler Sekmesi */}
          <button
            onClick={() => {
              if (sidebarTab === 'gorunumler' && !isPanelCollapsed) {
                setIsPanelCollapsed(true);
              } else {
                setSidebarTab('gorunumler');
                setIsPanelCollapsed(false);
              }
            }}
            title="Görünümler (2D, 3D, Cebir ve Çoklu Bölmeler)"
            className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              sidebarTab === 'gorunumler' && !isPanelCollapsed
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <LayoutGrid className="w-5 h-5 shrink-0" />
            <span className="text-[9.5px] font-bold leading-none">Görünümler</span>
          </button>
        </div>

        {/* Alt Kısım: Ara Butonu (Soldaki Sabit Butonların En Altı) */}
        <div className="flex flex-col items-center gap-2 w-full px-1">
          <div className="w-8 h-px bg-border/80" />
          <button
            type="button"
            onClick={() => {
              if (sidebarTab === 'ara' && !isPanelCollapsed) {
                setSidebarTab('araclar');
              } else {
                setSidebarTab('ara');
                setIsPanelCollapsed(false);
              }
            }}
            title="3D Araç ve Komut Ara (Ctrl+K)"
            aria-label="Ara"
            className={`w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              sidebarTab === 'ara' && !isPanelCollapsed
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Search className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-bold leading-none">Ara</span>
          </button>
        </div>
      </div>

      {/* 2. AÇILIR ÇEKMECE PANELİ (2D İLE BİREBİR AYNI STİL) */}
      {!isPanelCollapsed && (
        <div className="w-72 sm:w-80 min-h-0 flex flex-col bg-card border-r border-border animate-in fade-in slide-in-from-left-2 duration-150">
          {/* ================= A. ARAÇLAR GÖRÜNÜMÜ ================= */}
          {sidebarTab === 'araclar' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Başlık ve Kapatma */}
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground tracking-tight">3D Araçlar</h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(true)}
                  title="Paneli Daralt"
                  aria-label="Paneli Daralt"
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* Ağaç Menü Araç Listesi */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin">
                {/* 1. GRUP: İNCELEME & KAMERA */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup('incele')}
                    className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/60">
                        {expandedGroups.incele ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </span>
                      <span>İnceleme & Kamera</span>
                    </div>
                  </button>

                  {expandedGroups.incele && (
                    <div className="space-y-0.5 pl-2 border-l-2 border-border/60 ml-2.5">
                      {[
                        { id: 'select_move', label: 'Cismi Seç / Taşı', desc: 'Cismi seçer ve taşır', icon: <MousePointer className="w-3.5 h-3.5" /> },
                        { id: 'orbit', label: 'Görünümü Döndür', desc: 'Sahneyi serbestçe çevirir', icon: <RotateCw className="w-3.5 h-3.5" /> },
                        { id: 'pan', label: 'Görünümü Kaydır', desc: 'Kamera bakışını kaydırır', icon: <Hand className="w-3.5 h-3.5" /> },
                        { id: 'inspect', label: 'Yüz Seç ve İncele', desc: 'Yüz alanı ve açıları inceler', icon: <ScanSearch className="w-3.5 h-3.5" /> },
                      ].map((tool) => {
                        const isActive = activeTool === tool.id;
                        return (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => setActiveTool(tool.id as Tool3DMode)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer select-none text-xs ${
                              isActive
                                ? 'bg-primary/10 text-primary font-bold shadow-2xs ring-1 ring-primary/30'
                                : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 text-primary">
                                {tool.icon}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold">{tool.label}</div>
                                <div className="truncate text-[10px] text-muted-foreground">{tool.desc}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}

                      {/* Hazır Kamera Açıları */}
                      <div className="pt-1.5 flex items-center gap-1 flex-wrap">
                        {(['front', 'top', 'right', 'isometric'] as CameraPreset[]).map((preset) => {
                          const labels: Record<CameraPreset, string> = {
                            front: 'Önden',
                            top: 'Üstten',
                            right: 'Sağdan',
                            isometric: 'İzometrik',
                            back: 'Arkadan',
                            left: 'Soldan',
                            bottom: 'Alttan',
                            side: 'Yandan',
                          };
                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => onSetCameraPreset(preset)}
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3 text-muted-foreground" />
                              <span>{labels[preset]}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Silme Modu */}
                      <button
                        type="button"
                        onClick={() => {
                          if (hasSelection) onDeleteSelected();
                          else setActiveTool(activeTool === 'delete' ? 'select_move' : 'delete');
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer select-none text-xs mt-1 ${
                          activeTool === 'delete'
                            ? 'bg-destructive/15 text-destructive font-bold ring-1 ring-destructive/30'
                            : 'text-foreground/80 hover:bg-destructive/10 hover:text-destructive font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold">
                              {hasSelection ? 'Seçili Cismi Sil' : 'Silme Modu (Cisme Tıkla)'}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. GRUP: KATI CİSİM OLUŞTUR */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup('olustur')}
                    className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/60">
                        {expandedGroups.olustur ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </span>
                      <span>Katı Cisim Oluştur</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                      {SOLID_DEFINITIONS.length}
                    </span>
                  </button>

                  {expandedGroups.olustur && (
                    <div className="space-y-1 pl-2 border-l-2 border-border/60 ml-2.5">
                      {/* Oluşturma Yöntemi Seçici Kapsülü */}
                      <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/60 border border-border/60 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setCreationMethod('instant')}
                          className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            creationMethod === 'instant'
                              ? 'bg-background text-foreground shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Tıkla Ekle
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreationMethod('draw')}
                          className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            creationMethod === 'draw'
                              ? 'bg-background text-foreground shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Zeminde Çiz
                        </button>
                      </div>

                      {SOLID_DEFINITIONS.map((s) => {
                        const isDrawingActive = activeTool === `create_${s.type}`;
                        return (
                          <button
                            key={s.type}
                            type="button"
                            onClick={() => {
                              if (creationMethod === 'draw') {
                                setActiveTool(isDrawingActive ? 'select_move' : (`create_${s.type}` as Tool3DMode));
                              } else {
                                onAddSolid(s.type);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer select-none text-xs ${
                              isDrawingActive
                                ? 'bg-accent text-foreground font-bold ring-1 ring-primary/30'
                                : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 text-primary">
                                <s.Icon />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold">{s.label}</div>
                                <div className="truncate text-[10px] text-muted-foreground">{s.description}</div>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground/70 shrink-0">
                              {creationMethod === 'draw' ? 'Çiz' : '+ Ekle'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. GRUP: GÖRÜNÜM & KATMANLAR */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup('katmanlar')}
                    className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/60">
                        {expandedGroups.katmanlar ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </span>
                      <span>Görünüm & Katmanlar</span>
                    </div>
                  </button>

                  {expandedGroups.katmanlar && (
                    <div className="space-y-1 pl-2 border-l-2 border-border/60 ml-2.5">
                      {[
                        { label: 'Köşeleri Göster', active: showVertices, toggle: toggleShowVertices },
                        { label: 'Ayrıtları Göster', active: showEdges, toggle: toggleShowEdges },
                        { label: 'Yüzeyleri Göster', active: showFaces, toggle: toggleShowFaces },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.toggle}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer select-none text-xs ${
                            item.active
                              ? 'bg-primary/10 text-primary font-bold ring-1 ring-primary/30'
                              : 'text-foreground/80 hover:bg-muted/70 hover:text-foreground font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <CircleDot className="w-3.5 h-3.5" />
                            <span>{item.label}</span>
                          </div>
                          {item.active && <Check className="w-3.5 h-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. GRUP: DÜZEN & SAHNE */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup('duzen')}
                    className="w-full flex items-center justify-between px-1.5 py-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/60">
                        {expandedGroups.duzen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </span>
                      <span>Düzen & Sahne</span>
                    </div>
                  </button>

                  {expandedGroups.duzen && (
                    <div className="space-y-1 pl-2 border-l-2 border-border/60 ml-2.5">
                      <button
                        type="button"
                        onClick={onAutoArrange}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-medium text-foreground/80 hover:bg-muted/70 hover:text-foreground transition-all cursor-pointer"
                      >
                        <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                        <span>Cisimleri Otomatik Hizala</span>
                      </button>

                      <button
                        type="button"
                        onClick={onClearAll}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left text-xs font-medium text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Sahneyi Temizle</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= B. NESNELER GÖRÜNÜMÜ ================= */}
          {sidebarTab === 'nesneler' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground tracking-tight">
                    3D Cisimler ({solids.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(true)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* Arama Kutusu */}
              <div className="p-3 border-b border-border/60 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={objectSearch}
                    onChange={(e) => setObjectSearch(e.target.value)}
                    placeholder="Cisim ara..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground text-xs placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Cisimler Listesi */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-thin">
                {filteredSolids.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                    <p>Sahnede 3D katı cisim bulunamadı.</p>
                    <button
                      type="button"
                      onClick={() => onAddSolid('cube')}
                      className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      + Küp Ekle
                    </button>
                  </div>
                ) : (
                  filteredSolids.map((s) => {
                    const isSelected = selectedSolidId === s.id || selectedSolidIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          onSelectSolid?.(s.id);
                          onSelectSolids?.([s.id]);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-primary/10 border-primary/40 shadow-xs'
                            : 'bg-card border-border/70 hover:bg-muted/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full shrink-0 border border-foreground/15 shadow-2xs"
                            style={{ backgroundColor: s.color }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{s.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              Konum: ({s.position.x.toFixed(1)}, {s.position.y.toFixed(1)}, {s.position.z.toFixed(1)})
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSolidById?.(s.id);
                          }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Cismi Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ================= C. BAĞLAMLAR GÖRÜNÜMÜ ================= */}
          {sidebarTab === 'baglamlar' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Cisim Bağlamı & Özellikleri</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(true)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 scrollbar-thin">
                {selectedSolid ? (
                  <>
                    {/* Başlık Kartı */}
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-5 h-5 rounded-full border border-foreground/15 shadow-xs"
                          style={{ backgroundColor: selectedSolid.color }}
                        />
                        <div>
                          <div className="text-xs font-bold text-foreground">{selectedSolid.name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{selectedSolid.type}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onDeleteSelected}
                        className="p-1.5 rounded-xl text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Seçiliyi Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Renk Seçici */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground">Renk Paleti</label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => onUpdateSolid?.({ color: c.hex })}
                            title={c.name}
                            className={`w-6 h-6 rounded-full border border-foreground/15 transition-transform hover:scale-110 cursor-pointer ${
                              selectedSolid.color === c.hex ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Telkafes (Wireframe) */}
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Telkafes (Wireframe)</span>
                      <button
                        type="button"
                        onClick={() => onUpdateSolid?.({ showWireframe: !selectedSolid.showWireframe })}
                        className={`w-10 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                          selectedSolid.showWireframe ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-card shadow-xs transition-transform ${
                            selectedSolid.showWireframe ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Boyut Ayarı */}
                    <div className="pt-2 border-t border-border/60 space-y-2">
                      <div className="text-[11px] font-bold text-muted-foreground">Boyutlar (Genişlik × Yükseklik × Derinlik)</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground">G:</span>
                          <input
                            type="number"
                            step="0.5"
                            value={selectedSolid.dimensions.width}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0.5;
                              onUpdateSolid?.({ dimensions: { ...selectedSolid.dimensions, width: val } });
                            }}
                            className="w-full px-2 py-1 rounded-lg bg-muted border border-border text-xs text-foreground"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">Y:</span>
                          <input
                            type="number"
                            step="0.5"
                            value={selectedSolid.dimensions.height}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0.5;
                              onUpdateSolid?.({ dimensions: { ...selectedSolid.dimensions, height: val } });
                            }}
                            className="w-full px-2 py-1 rounded-lg bg-muted border border-border text-xs text-foreground"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground">D:</span>
                          <input
                            type="number"
                            step="0.5"
                            value={selectedSolid.dimensions.depth}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0.5;
                              onUpdateSolid?.({ dimensions: { ...selectedSolid.dimensions, depth: val } });
                            }}
                            className="w-full px-2 py-1 rounded-lg bg-muted border border-border text-xs text-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                    <Box className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="font-semibold text-foreground">Seçili 3D Cisim Yok</p>
                    <p className="text-[11px]">
                      Özelliklerini düzenlemek için sahneden veya Nesneler sekmesinden bir cisme tıklayın.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= D. GÖRÜNÜMLER GÖRÜNÜMÜ ================= */}
          {sidebarTab === 'gorunumler' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground tracking-tight">Çalışma Alanı Düzenleri</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(true)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {LAYOUT_OPTIONS.map((opt) => {
                  const isCurrent = layoutMode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      type="button"
                      onClick={() => onLayoutModeChange?.(opt.mode)}
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
                            <span className="font-bold text-xs text-foreground">{opt.name}</span>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {opt.badge}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-primary">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Hover Tooltip Label */}
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

          {/* ================= E. ARAMA GÖRÜNÜMÜ ================= */}
          {sidebarTab === 'ara' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-3.5 border-b border-border/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground tracking-tight">3D Araç & Komut Ara</h3>
                </div>
                {toolSearch && (
                  <button
                    type="button"
                    onClick={() => setToolSearch('')}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
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
                    placeholder="3D araç veya komut ara..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/40 border border-border/80 text-foreground text-xs placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Sonuçlar */}
              <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 scrollbar-thin">
                {ALL_3D_TOOLS.filter(
                  (t) =>
                    normalizedSearch === '' ||
                    t.name.toLocaleLowerCase('tr').includes(normalizedSearch) ||
                    t.description.toLocaleLowerCase('tr').includes(normalizedSearch)
                ).map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={tool.action}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer select-none text-xs hover:bg-muted/70 font-medium"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5 text-primary">
                        {tool.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">{tool.name}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{tool.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
