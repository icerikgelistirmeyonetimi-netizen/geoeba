'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VARSAYILAN_GORUNUM_AYARLARI, useWorkspace } from '@/state/WorkspaceContext';
import { useTheme } from '@/state/ThemeContext';
import { DEFAULT_STYLE_SETTINGS, ToolMode } from '@/types/workspace';
import { LayoutMode } from './PropertiesPanel';
import { exportPng, exportSvg, exportPdf, exportWord, printSvg } from '@/utils/exportCanvas';
import { parseProjectFile } from '@/math/projectFile';
import { formatTurkishNumber, visibleGridStep } from '@/math/coordinates';
import { workspaceOwnsKeyboard, TOOL_SHORTCUTS } from './toolShortcuts';
import { TOOL_GROUPS } from './toolDefinitions';
import { isAnyModalOpen, registerModalOpen, registerModalClose } from '@/components/ui/modalState';
import { StylePanel } from './StylePanel';
import { EsitUzunluklarSimgesi } from './EsitlikSimgeleri';
import { SinifDuzeyiMenusu } from './SinifDuzeyiMenusu';
import { aracGorunurMu, sinifEtiketi } from './sinifDuzeyleri';
import { useSinifDuzeyi } from '@/hooks/useSinifDuzeyi';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Upload,
  Printer,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  Clipboard,
  Trash2,
  CheckSquare,
  LayoutGrid,
  Columns2,
  Box,
  Eye,
  Grid,
  Compass,
  Maximize,
  RotateCcw,
  MousePointer,
  Dot,
  Minus,
  Circle,
  Shapes,
  Ruler,
  FlipHorizontal,
  Wrench,
  Type,
  Image as ImageIcon,
  FunctionSquare,
  SlidersHorizontal,
  Link2,
  HelpCircle,
  BookOpen,
  Keyboard,
  Info,
  Palette,
  Globe,
  Settings,
  X,
  Check,
  ChevronRight,
  ExternalLink,
  Contrast,
  Sliders,
  Magnet,
  FileCode2,
  Grid2x2,
} from 'lucide-react';

export interface WorkspaceMenuBarProps {
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
  onSelectTool?: (tool: ToolMode) => void;
  onOpenFunctionDialog?: () => void;
  onOpenSliderDialog?: () => void;
  onOpenAddObjectDialog?: () => void;
  onOpenRegularPolygonDialog?: () => void;
  onClearAll?: () => void;
  onResetView?: () => void;
}

type MenuKey = 'dosya' | 'duzenle' | 'gorunum' | 'araclar' | 'ekle' | 'ayarlar' | 'yardim' | 'sinif' | null;

/** Menüdeki araç kısayolu ipucu: harf elle yazılmaz, klavyenin gerçek bağından (TOOL_SHORTCUTS) okunur. */
function AracKisayolu({ arac }: { arac: ToolMode }) {
  return <span className="text-[10px] text-muted-foreground whitespace-nowrap">{TOOL_SHORTCUTS[arac]}</span>;
}

export function WorkspaceMenuBar(props: WorkspaceMenuBarProps = {}) {
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [infoModalType, setInfoModalType] = useState<'shortcuts' | 'about' | 'guide' | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'stil' | 'duzlem' | 'genel'>('stil');
  /** "Varsayılana Sıfırla" iki adımlıdır: ilk basış onay ister, 4 saniye içinde ikinci basış uygular. */
  const [sifirlamaOnayi, setSifirlamaOnayi] = useState(false);
  // Ayarlar > Düzlem > Izgara aralığı: özel değer kutusu
  const [ozelAralik, setOzelAralik] = useState('');
  const [ozelAralikHata, setOzelAralikHata] = useState<string | null>(null);
  useEffect(() => {
    if (!infoModalType && !isSettingsModalOpen) return;
    registerModalOpen();
    return registerModalClose;
  }, [infoModalType, isSettingsModalOpen]);
  // Tuvalin sağ tık menüsündeki "Ayarlar" maddesi çalışma alanı ayarlarını açar (varsayılan: Düzlem sekmesi)
  useEffect(() => {
    const ac = (event: Event) => {
      const sekme = (event as CustomEvent<unknown>).detail;
      setSettingsTab(sekme === 'stil' || sekme === 'genel' ? sekme : 'duzlem');
      setActiveMenu(null);
      setIsSettingsModalOpen(true);
    };
    window.addEventListener('geoeba:calisma-ayarlari', ac);
    return () => window.removeEventListener('geoeba:calisma-ayarlari', ac);
  }, []);
  const menuBarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BG_COLORS = [
    { color: '#ffffff', name: 'Beyaz' },
    { color: '#f3e8ff', name: 'Lavanta' },
    { color: '#e0f2fe', name: 'Buz Mavisi' },
    { color: '#e6f4ea', name: 'Mint Yeşili' },
    { color: '#fef3c7', name: 'Pastel Sarı' },
    { color: '#ffedd5', name: 'Şeftali' },
    { color: '#ffe4e6', name: 'Pembe' },
    { color: '#1e293b', name: 'Koyu Slate' },
  ];

  const { theme, setTheme } = useTheme();
  const {
    getProject, loadProject, copySelection, cutSelection, pasteSelection, deleteSelection, selectAll,
    canPaste, sceneBridge, selectedObjectIds,
    objects,
    selectedObjectId,
    viewport,
    setViewport,
    undoWorkspace: undo,
    redoWorkspace: redo,
    canUndoWorkspace: canUndo,
    canRedoWorkspace: canRedo,
    deleteObject,
    setSelectedObjectId,
    addObject,
    resetViewport,
    layoutMode: ctxLayoutMode,
    setLayoutMode: ctxSetLayoutMode,
    isFunctionDialogOpen,
    setIsFunctionDialogOpen,
    isSliderDialogOpen,
    setIsSliderDialogOpen,
    isAddObjectDialogOpen,
    setIsAddObjectDialogOpen,
    openRegularPolygonDialog,
    activateTool,
    requestClearAll,
    studioDimension,
    setStyleSettings,
  } = useWorkspace();

  const layoutMode = props.layoutMode ?? ctxLayoutMode;
  const onLayoutModeChange = props.onLayoutModeChange ?? ctxSetLayoutMode;
  const onSelectTool = props.onSelectTool ?? activateTool;
  const onOpenFunctionDialog = props.onOpenFunctionDialog ?? (() => setIsFunctionDialogOpen(true));
  const onOpenSliderDialog = props.onOpenSliderDialog ?? (() => setIsSliderDialogOpen(true));
  const onOpenAddObjectDialog = props.onOpenAddObjectDialog ?? (() => setIsAddObjectDialogOpen(true));
  const onOpenRegularPolygonDialog = props.onOpenRegularPolygonDialog ?? openRegularPolygonDialog;
  const onClearAll = props.onClearAll ?? (() => requestClearAll(studioDimension));
  const onResetView = props.onResetView ?? resetViewport;
  const hasSelection = studioDimension === '3D' ? !!sceneBridge?.selectedIds.length : selectedObjectIds.length > 0;
  // Silme her iki görünümde de seçili 2B nesneleri ve 3B cisimleri birlikte kapsar (deleteSelection)
  const hasDeletable = !!sceneBridge?.selectedIds.length || selectedObjectIds.length > 0;
  // Araçlar menüsü de araç paneli gibi seçili sınıfın araçlarını gösterir (Sınıf menüsü)
  const [sinifDuzeyi] = useSinifDuzeyi();
  const aracMenudeGorunur = (arac: ToolMode) => aracGorunurMu(sinifDuzeyi, arac);

  // Menü dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
        setInfoModalType(null);
        setIsSettingsModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMenuHeaderClick = (menu: MenuKey) => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const handleMenuHeaderHover = (menu: MenuKey) => {
    if (activeMenu !== null) {
      setActiveMenu(menu);
    }
  };

  const closeMenu = () => setActiveMenu(null);

  // Tuvali bulma (Dışa aktarma ve yazdırma için)
  const getCanvasSvg = (): SVGSVGElement | null => {
    const root = menuBarRef.current?.closest('[data-pencere]') ?? document;
    return root.querySelector<SVGSVGElement>(`svg[data-workspace-canvas="${studioDimension.toLowerCase()}"]`);
  };

  // Dışa aktarma eylemi
  const handleExport = async (format: 'png' | 'svg' | 'pdf' | 'word') => {
    closeMenu();
    const svg = getCanvasSvg();
    if (!svg) {
      alert('Dışa aktarılacak çizim alanı bulunamadı.');
      return;
    }
    const title = 'GeoEBA Çizimi';
    try {
      if (format === 'png') await exportPng(svg, title);
      else if (format === 'svg') exportSvg(svg, title);
      else if (format === 'pdf') await exportPdf(svg, title);
      else await exportWord(svg, title);
    } catch (err) {
      alert('Çizim dışa aktarılamadı. Lütfen tekrar deneyin.');
    }
  };

  // Proje kaydetme (.geoeba JSON)
  const handleSaveProject = () => {
    closeMenu();
    const projectData = { ...getProject(), timestamp: Date.now() };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geoeba-proje-${new Date().toISOString().slice(0, 10)}.geoeba`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  // Proje dosyası açma (.geoeba JSON)
  const handleOpenFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        loadProject(parseProjectFile(JSON.parse(event.target?.result as string)));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Dosya açılamadı. Mevcut çalışma korundu.');
      }
    };
    reader.onerror = () => alert('Dosya okunamadı. Mevcut çalışma korundu.');
    reader.readAsText(file);
    e.target.value = '';
    closeMenu();
  };

  // Yazdır
  const handlePrint = () => {
    closeMenu();
    const svg = getCanvasSvg();
    if (svg) printSvg(svg);
  };

  // Kopyala / Kes / Yapıştır
  const handleCopy = () => {
    closeMenu();
    copySelection();
  };

  const handleCut = () => {
    closeMenu();
    cutSelection();
  };

  const handlePaste = () => {
    closeMenu();
    pasteSelection();
  };

  const handleDelete = () => {
    closeMenu();
    deleteSelection();
  };

  const handleSelectAll = () => {
    closeMenu();
    selectAll();
  };

  const handleResetView = () => {
    closeMenu();
    if (onResetView) onResetView();
    else resetViewport();
  };

  const shortcutRef = useRef({ handleSaveProject, handlePrint, handleCopy, handleCut, handlePaste, handleDelete, handleSelectAll, undo, redo, canUndo, canRedo, onClearAll });
  shortcutRef.current = { handleSaveProject, handlePrint, handleCopy, handleCut, handlePaste, handleDelete, handleSelectAll, undo, redo, canUndo, canRedo, onClearAll };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!workspaceOwnsKeyboard(event, menuBarRef.current) || isAnyModalOpen() || event.altKey) return;
      const k = shortcutRef.current;
      const mod = event.ctrlKey || event.metaKey;
      let action: (() => void) | undefined;
      if (mod) {
        if (event.code === 'KeyZ') action = event.shiftKey ? () => { if (k.canRedo) k.redo(); } : () => { if (k.canUndo) k.undo(); };
        else if (!event.shiftKey) action = ({ KeyA: k.handleSelectAll, KeyC: k.handleCopy, KeyX: k.handleCut, KeyV: k.handlePaste,
          KeyS: k.handleSaveProject, KeyO: () => fileInputRef.current?.click(), KeyN: k.onClearAll, KeyP: k.handlePrint,
          KeyY: () => { if (k.canRedo) k.redo(); } } as Record<string, () => void>)[event.code];
      } else if (event.key === 'Delete' || event.key === 'Backspace') action = k.handleDelete;
      if (action) { event.preventDefault(); action(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* GİZLİ DOSYA YÜKLEME INPUTU */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleOpenFile}
        accept=".json,.geoeba"
        className="hidden"
      />

      {/* ÜST MENÜ ŞERİDİ */}
      <div
        ref={menuBarRef}
        className="flex-1 flex items-center justify-between z-30 select-none min-w-0 relative"
      >
        {/* SOL: 7 ANA MENÜ LİSTESİ */}
        <div className="flex items-center gap-0.5 sm:gap-1 text-[13px] font-medium">
          {/* 1. DOSYA MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('dosya')}
              onMouseEnter={() => handleMenuHeaderHover('dosya')}
              className={`min-h-[44px] px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeMenu === 'dosya'
                  ? 'bg-primary/15 text-primary shadow-2xs'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted'
              }`}
            >
              Dosya
            </button>
            {activeMenu === 'dosya' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    closeMenu();
                    onClearAll();
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>Yeni</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+N</span>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    fileInputRef.current?.click();
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-ada-altin" />
                    <span>Aç...</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+O</span>
                </button>

                <button
                  onClick={handleSaveProject}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-ada-vurgu" />
                    <span>Kaydet</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+S</span>
                </button>

                <button
                  onClick={handleSaveProject}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-ada-vurgu" />
                    <span>Farklı Kaydet...</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">.geoeba</span>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={() => {
                    closeMenu();
                    fileInputRef.current?.click();
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>İçe Aktar</span>
                  </div>
                </button>

                {/* Dışa Aktar Seçenekleri */}
                <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Dışa Aktar
                </div>
                <button
                  onClick={() => handleExport('png')}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Görsel (PNG)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">.png</span>
                </button>
                <button
                  onClick={() => handleExport('svg')}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Vektör (SVG)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">.svg</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Belge (PDF)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">.pdf</span>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={handlePrint}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Yazdır...</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+P</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. DÜZENLE MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('duzenle')}
              onMouseEnter={() => handleMenuHeaderHover('duzenle')}
              className={`min-h-[44px] px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeMenu === 'duzenle'
                  ? 'bg-primary/15 text-primary shadow-2xs'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted'
              }`}
            >
              Düzenle
            </button>
            {activeMenu === 'duzenle' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  disabled={!canUndo}
                  onClick={() => {
                    closeMenu();
                    undo();
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Undo2 className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>Geri Al</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+Z</span>
                </button>

                <button
                  disabled={!canRedo}
                  onClick={() => {
                    closeMenu();
                    redo();
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Redo2 className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>Yinele</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+Y</span>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  disabled={!hasSelection}
                  onClick={handleCut}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5 text-ada-altin" />
                    <span>Kes</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+X</span>
                </button>

                <button
                  disabled={!hasSelection}
                  onClick={handleCopy}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>Kopyala</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+C</span>
                </button>

                <button
                  onClick={handlePaste}
                  disabled={!canPaste}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Clipboard className="w-3.5 h-3.5 text-ada-vurgu" />
                    <span>Yapıştır</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+V</span>
                </button>

                <button
                  disabled={!hasDeletable}
                  onClick={handleDelete}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sil</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Del</span>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={handleSelectAll}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-ada-lavanta" />
                    <span>Tümünü Seç</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Ctrl+A</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. GÖRÜNÜM MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('gorunum')}
              onMouseEnter={() => handleMenuHeaderHover('gorunum')}
              className={`min-h-[44px] px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeMenu === 'gorunum'
                  ? 'bg-primary/15 text-primary shadow-2xs'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted'
              }`}
            >
              Görünüm
            </button>
            {activeMenu === 'gorunum' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Çalışma Alanı Düzenleri
                </div>

                <button
                  onClick={() => {
                    closeMenu();
                    onLayoutModeChange('2d_only');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Maximize className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>Grafik Paneli (2D)</span>
                  </div>
                  {layoutMode === '2d_only' && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onLayoutModeChange('3d_only');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-ada-lavanta" />
                    <span>3B Görünüm</span>
                  </div>
                  {layoutMode === '3d_only' && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onLayoutModeChange('2d_3d');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Columns2 className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>2D + 3D Çift Görünüm</span>
                  </div>
                  {layoutMode === '2d_3d' && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onLayoutModeChange('algebra_2d');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5 text-ada-vurgu" />
                    <span>Cebir Paneli + 2D</span>
                  </div>
                  {layoutMode === 'algebra_2d' && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onLayoutModeChange('three_col');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Columns2 className="w-3.5 h-3.5 text-ada-altin" />
                    <span>Hesap / 3 Sütun (Cebir+2D+3D)</span>
                  </div>
                  {layoutMode === 'three_col' && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <div className="my-1 border-t border-border/60" />

                <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Düzlem Ögeleri
                </div>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, showGrid: !prev.showGrid }));
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Grid className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>Izgara</span>
                  </div>
                  {viewport.showGrid && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, showAxes: !prev.showAxes }));
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-ada-vurgu" />
                    <span>Eksenler</span>
                  </div>
                  {viewport.showAxes && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={handleResetView}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Görünümü Sıfırla (Yakınlaştır)</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 4. ARAÇLAR MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('araclar')}
              onMouseEnter={() => handleMenuHeaderHover('araclar')}
              className={`min-h-[44px] px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeMenu === 'araclar'
                  ? 'bg-primary/15 text-primary shadow-2xs'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted'
              }`}
            >
              Araçlar
            </button>
            {activeMenu === 'araclar' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    closeMenu();
                    onSelectTool('select');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MousePointer className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>Seçim</span>
                  </div>
                  <AracKisayolu arac="select" />
                </button>

                {/* Seçili sınıfın panelinde olmayan araçlar burada da gösterilmez (Seçim her sınıfta var) */}
                {aracMenudeGorunur('point') && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onSelectTool('point');
                    }}
                    className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Dot className="w-3.5 h-3.5 text-ada-deniz" />
                      <span>Nokta</span>
                    </div>
                    <AracKisayolu arac="point" />
                  </button>
                )}

                {aracMenudeGorunur('segment') && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onSelectTool('segment');
                    }}
                    className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Minus className="w-3.5 h-3.5 text-ada-deniz" />
                      <span>Doğru / Parça</span>
                    </div>
                    <AracKisayolu arac="segment" />
                  </button>
                )}

                {aracMenudeGorunur('circle') && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onSelectTool('circle');
                    }}
                    className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Circle className="w-3.5 h-3.5 text-ada-lavanta" />
                      <span>Çember</span>
                    </div>
                    <AracKisayolu arac="circle" />
                  </button>
                )}

                {aracMenudeGorunur('polygon') && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onSelectTool('polygon');
                    }}
                    className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Shapes className="w-3.5 h-3.5 text-ada-vurgu" />
                      <span>Çokgen</span>
                    </div>
                    <AracKisayolu arac="polygon" />
                  </button>
                )}

                {(['measure_distance', 'reflect', 'perpendicular'] as const).some(aracMenudeGorunur) && (
                  <div className="my-1 border-t border-border/60" />
                )}

                {aracMenudeGorunur('measure_distance') && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onSelectTool('measure_distance');
                    }}
                    className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Ruler className="w-3.5 h-3.5 text-ada-altin" />
                      <span>Ölçüm (Uzunluk / Açı)</span>
                    </div>
                    <AracKisayolu arac="measure_distance" />
                  </button>
                )}

                {aracMenudeGorunur('reflect') && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onSelectTool('reflect');
                    }}
                    className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FlipHorizontal className="w-3.5 h-3.5 text-ada-mercan" />
                      <span>Dönüşüm (Simetri / Öteleme)</span>
                    </div>
                    <AracKisayolu arac="reflect" />
                  </button>
                )}

                {aracMenudeGorunur('perpendicular') && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onSelectTool('perpendicular');
                    }}
                    className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-ada-deniz" />
                      <span>Geometri Araçları (Dikme/Teğet)</span>
                    </div>
                    <AracKisayolu arac="perpendicular" />
                  </button>
                )}

                {sinifDuzeyi !== 'tum' && (
                  <div className="mx-3 mt-1 pt-1.5 border-t border-border/60 text-[11px] leading-snug text-muted-foreground">
                    {sinifEtiketi(sinifDuzeyi)} araçları gösteriliyor. Değiştirmek için Sınıf menüsü.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. EKLE MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('ekle')}
              onMouseEnter={() => handleMenuHeaderHover('ekle')}
              className={`min-h-[44px] px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeMenu === 'ekle'
                  ? 'bg-primary/15 text-primary shadow-2xs'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted'
              }`}
            >
              Ekle
            </button>
            {activeMenu === 'ekle' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    closeMenu();
                    onSelectTool('text');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Type className="w-3.5 h-3.5 text-ada-murekkep-2 dark:text-ada-kum" />
                    <span>Metin</span>
                  </div>
                  <AracKisayolu arac="text" />
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    fileInputRef.current?.click();
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-ada-murekkep-2 dark:text-ada-kum" />
                    <span>Görsel</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onOpenFunctionDialog();
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FunctionSquare className="w-3.5 h-3.5 text-ada-deniz-koyu dark:text-ada-vurgu" />
                    <span>Denklem / Fonksiyon</span>
                  </div>
                  {/* Fonksiyon aracının kısayolu da bu pencereyi açar (activateTool('function')) */}
                  <AracKisayolu arac="function" />
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onOpenSliderDialog();
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-ada-deniz-koyu dark:text-ada-vurgu" />
                    <span>Etkileşimli Sürgü</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    onOpenAddObjectDialog();
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-ada-lavanta" />
                    <span>Medya & 3D Cisim</span>
                  </div>
                </button>

                {onOpenRegularPolygonDialog && (
                  <button
                    onClick={() => {
                      closeMenu();
                      onOpenRegularPolygonDialog();
                    }}
                    className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Shapes className="w-3.5 h-3.5 text-ada-vurgu" />
                      <span>Düzgün Çokgen</span>
                    </div>
                  </button>
                )}

                <div className="my-1 border-t border-border/60" />

                <a
                  href="https://www.eba.gov.tr"
                  target="_blank"
                  rel="noreferrer"
                  onClick={closeMenu}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>EBA Bağlantısı</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </div>
            )}
          </div>

          {/* 6. AYARLAR MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('ayarlar')}
              onMouseEnter={() => handleMenuHeaderHover('ayarlar')}
              className={`min-h-[44px] px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeMenu === 'ayarlar'
                  ? 'bg-primary/15 text-primary shadow-2xs'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted'
              }`}
            >
              Ayarlar
            </button>
            {activeMenu === 'ayarlar' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
                {/* 1. Çalışma Alanı Ayarları Ana Butonu */}
                <button
                  onClick={() => {
                    closeMenu();
                    setIsSettingsModalOpen(true);
                  }}
                  className="w-[calc(100%-8px)] mx-1 min-h-[44px] px-2 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer rounded-lg [&_svg]:shrink-0"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    <span>Çalışma Alanı Ayarları...</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="my-1 border-t border-border/60" />

                <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Hızlı Düzlem Ayarları
                </div>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, showGrid: !prev.showGrid }));
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Grid className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>Izgara Çizgileri</span>
                  </div>
                  {viewport.showGrid && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, showAxes: !prev.showAxes }));
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-ada-vurgu" />
                    <span>Koordinat Eksenleri (x, y)</span>
                  </div>
                  {viewport.showAxes && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, showCoordinates: !prev.showCoordinates }));
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Maximize className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>Nokta Koordinatları</span>
                  </div>
                  {viewport.showCoordinates && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, showQuadrants: !prev.showQuadrants }));
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Grid2x2 className="w-3.5 h-3.5 text-ada-altin" />
                    <span>Bölge İsimleri (1-4)</span>
                  </div>
                  {viewport.showQuadrants && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <button
                  onClick={() => {
                    setViewport((prev) => ({ ...prev, snapToGrid: !prev.snapToGrid }));
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Magnet className="w-3.5 h-3.5 text-ada-deniz" aria-hidden="true" />
                    <span>Izgaraya Sıçra</span>
                  </div>
                  {viewport.snapToGrid && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                <div className="my-1 border-t border-border/60" />

                {/* Hızlı Arkaplan Rengi */}
                <div className="px-3 py-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Hızlı Arkaplan
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {BG_COLORS.slice(0, 7).map((bg) => (
                      <button
                        key={bg.color}
                        type="button"
                        onClick={() => setViewport((prev) => ({ ...prev, backgroundColor: bg.color }))}
                        title={bg.name}
                        className={`w-7 h-7 rounded-full border border-ada-murekkep/20 shadow-2xs flex items-center justify-center transition-transform hover:scale-115 cursor-pointer ${
                          (viewport.backgroundColor || '#ffffff') === bg.color ? 'ring-2 ring-primary ring-offset-1 scale-110' : ''
                        }`}
                        style={{ backgroundColor: bg.color }}
                      >
                        {(viewport.backgroundColor || '#ffffff') === bg.color && (
                          <Check className="w-2.5 h-2.5 text-ada-murekkep" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={() => {
                    closeMenu();
                    setTheme(theme === 'dark' ? 'light' : 'dark');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-ada-mercan" />
                    <span>Tema: {theme === 'dark' ? 'Koyu' : 'Açık'}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Değiştir</span>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    setInfoModalType('shortcuts');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Kısayollar...</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 7. YARDIM MENÜSÜ */}
          <div className="relative">
            <button
              onClick={() => handleMenuHeaderClick('yardim')}
              onMouseEnter={() => handleMenuHeaderHover('yardim')}
              className={`min-h-[44px] px-3 py-1 rounded-md transition-colors cursor-pointer ${
                activeMenu === 'yardim'
                  ? 'bg-primary/15 text-primary shadow-2xs'
                  : 'text-foreground/80 hover:text-foreground hover:bg-muted'
              }`}
            >
              Yardım
            </button>
            {activeMenu === 'yardim' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    closeMenu();
                    setInfoModalType('guide');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>Kullanım Kılavuzu</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    closeMenu();
                    setInfoModalType('shortcuts');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-3.5 h-3.5 text-ada-altin" />
                    <span>Klavye Kısayolları</span>
                  </div>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  onClick={() => {
                    closeMenu();
                    setInfoModalType('about');
                  }}
                  className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-ada-deniz" />
                    <span>GeoEBA Hakkında</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 8. SINIF DÜZEYİ MENÜSÜ: araç panelini seçilen sınıfın kazanımlarına göre daraltır. En sonda durur:
              kısa etiketi ve rozeti dar pencerede diğer menüleri itmez. */}
          <SinifDuzeyiMenusu
            acik={activeMenu === 'sinif'}
            onBaslikTikla={() => handleMenuHeaderClick('sinif')}
            onBaslikUzerine={() => handleMenuHeaderHover('sinif')}
            onKapat={closeMenu}
          />
          {/* Sağ üstteki hızlı işlem ve tema kapsülleri kullanıcı isteğiyle kaldırıldı: geri al / yinele tuvalin
              sol üstünde, sığdırma Görünüm menüsünde ve tuvalin sağ tık menüsünde, temizleme Dosya > Yeni'de;
              açık/koyu tema düğmesi masaüstü görev çubuğunun sağ köşesinde (Masaustu.tsx). */}
        </div>
      </div>

      {/* BİLGİLENDİRME MODALLARI (Kısayollar, Hakkında, Kılavuz) */}
      {infoModalType && (
        <div className="fixed inset-0 z-[1000] bg-ada-murekkep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-label="Stüdyo yardımı" className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Modal Başlık */}
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                {infoModalType === 'shortcuts' && <Keyboard className="w-5 h-5 text-ada-deniz" />}
                {infoModalType === 'about' && <Info className="w-5 h-5 text-ada-deniz" />}
                {infoModalType === 'guide' && <BookOpen className="w-5 h-5 text-ada-vurgu" />}
                <h3 className="font-bold text-base text-foreground">
                  {infoModalType === 'shortcuts' && 'Klavye Kısayolları'}
                  {infoModalType === 'about' && 'GeoEBA Hakkında'}
                  {infoModalType === 'guide' && 'Kullanım Kılavuzu'}
                </h3>
              </div>
              <button
                onClick={() => setInfoModalType(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal İçerik */}
            {infoModalType === 'shortcuts' && (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto text-xs pr-1">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'Ctrl + Z', desc: 'Geri Al' },
                    { key: 'Ctrl + Y', desc: 'Yinele' },
                    { key: 'Ctrl + S', desc: 'Projeyi Kaydet' },
                    { key: 'Ctrl + A', desc: 'Tümünü Seç' },
                    { key: 'Del / Backspace', desc: 'Seçiliyi Sil' },
                    { key: 'Esc', desc: 'İptal / Seçim Aracı' },
                    { key: 'Ctrl + C / X / V', desc: 'Kopyala / Kes / Yapıştır' },
                    { key: 'Ctrl + O', desc: 'Proje Aç' },
                    { key: 'Ctrl + N', desc: 'Yeni Çalışma' },
                    { key: 'Ctrl + P', desc: 'Çizimi Yazdır' },
                    { key: 'Ctrl + K', desc: 'Türkçe Komutlar' },
                    ...TOOL_GROUPS.flatMap(group => group.tools.map(tool => ({ key: TOOL_SHORTCUTS[tool.id], desc: tool.name }))),
                    { key: TOOL_SHORTCUTS.pan, desc: 'Görünümü Kaydır' },
                  ].map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/60"
                    >
                      <span className="font-mono font-bold text-primary">{s.key}</span>
                      <span className="text-muted-foreground">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {infoModalType === 'about' && (
              <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">GeoEBA</strong>, Millî Eğitim Bakanlığı müfredatına tam uyumlu; ilkokul, ortaokul ve lise kademelerinde geometri, matematik ve 3D uzamsal düşünme becerilerini geliştirmek amacıyla tasarlanmış yeni nesil etkileşimli çalışma ortamıdır.
                </p>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-foreground font-medium">
                  Sürüm: 1.0.0 (Etkileşimli 2D + 3D Hibrit Çizim Stüdyosu)
                </div>
                <p>
                  Tüm çizim araçları, dinamik fonksiyon grafikleyicisi, çokgen ağırlık merkezleri, 3D katı cisim açınımları ve EBA ders içerikleriyle entegre çalışır.
                </p>
              </div>
            )}

            {infoModalType === 'guide' && (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto text-xs text-muted-foreground leading-relaxed pr-1">
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <h4 className="font-bold text-foreground">1. Sol Menü (Araçlar, Nesneler, Bağlamlar)</h4>
                  <p>Sol taraftaki ağaç menüden dilediğiniz çizim aracını seçebilir, nesneler sekmesinden koordinatları inceleyebilirsiniz.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <h4 className="font-bold text-foreground">2. 2D ve 3D Görünümler</h4>
                  <p>Üstteki Görünüm menüsünden veya sol taraftaki Görünümler sekmesinden 2D, 3D veya yan yana çoklu görünümleri seçebilirsiniz.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <h4 className="font-bold text-foreground">3. Çalışma Alanı ve Düzlem Ayarları</h4>
                  <p>Üst menüdeki Ayarlar seçeneğinden ızgara, koordinat eksenleri, bölge isimleri, dik açı stili, çizim kalınlıkları ve arkaplan ayarlarını kontrol edebilirsiniz.</p>
                </div>
              </div>
            )}

            {/* Modal Alt Buton */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInfoModalType(null)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ÇALIŞMA ALANI VE DÜZLEM AYARLARI MODALI */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-ada-murekkep/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Modal Başlık */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Çalışma Alanı Ayarları</h3>
                  <p className="text-[11px] text-muted-foreground">Tuval, ızgara, stil ve koordinat düzlemi tercihleri</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sekme Seçici (Stil, Düzlem, Genel) */}
            <div className="flex items-center px-5 pt-3 border-b border-border/60 bg-muted/20 shrink-0 gap-1.5">
              <button
                onClick={() => setSettingsTab('stil')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  settingsTab === 'stil'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Stil & Arkaplan</span>
              </button>

              <button
                onClick={() => setSettingsTab('duzlem')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  settingsTab === 'duzlem'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Görünüm & Düzlem</span>
              </button>

              <button
                onClick={() => setSettingsTab('genel')}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  settingsTab === 'genel'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Genel & Sistem</span>
              </button>
            </div>

            {/* Modal Gövdesi (Scrollable) */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {settingsTab === 'stil' && (
                <div className="space-y-4">
                  {/* Arkaplan Rengi */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-primary" />
                      <span>Arkaplan Rengi</span>
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {BG_COLORS.map((bg) => {
                        const isSelected = (viewport.backgroundColor || '#ffffff') === bg.color;
                        return (
                          <button
                            key={bg.color}
                            type="button"
                            onClick={() => setViewport((prev) => ({ ...prev, backgroundColor: bg.color }))}
                            title={bg.name}
                            className={`w-7 h-7 rounded-full border border-ada-murekkep/15 shadow-xs flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                              isSelected ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''
                            }`}
                            style={{ backgroundColor: bg.color }}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-ada-murekkep" />}
                          </button>
                        );
                      })}
                      <label
                        title="Özel Renk Seç"
                        className="w-7 h-7 rounded-full border border-dashed border-border bg-card flex items-center justify-center cursor-pointer hover:border-primary transition-colors text-muted-foreground hover:text-foreground shadow-xs"
                      >
                        <span className="text-xs font-black">+</span>
                        <input
                          type="color"
                          value={viewport.backgroundColor || '#ffffff'}
                          onChange={(e) => setViewport((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Dik Açı Stili */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider">
                      Dik Açı Sembol Stili
                    </h4>
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {[
                        { id: 'arc_dot', label: 'Yay + Nokta', icon: '⦠' },
                        { id: 'square', label: 'Kare Köşe', icon: '⊾' },
                        { id: 'arc_fill', label: 'Dolu Yay', icon: '◬' },
                        { id: 'l_shape', label: 'L-Köşe', icon: '└' },
                      ].map((style) => {
                        const isSelected = (viewport.rightAngleStyle || 'square') === style.id;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => setViewport((prev) => ({ ...prev, rightAngleStyle: style.id as any }))}
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                                : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                            }`}
                            title={style.label}
                          >
                            <span className="text-base leading-none mb-1 font-serif">{style.icon}</span>
                            <span className="text-[10px] text-center leading-tight">{style.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Çizim ve Metin Stili (StylePanel) */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-ada-mercan" />
                      <span>Çizim, Metin ve Sadeleştirme</span>
                    </h4>
                    <div className="pt-1">
                      <StylePanel />
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'duzlem' && (
                <div className="space-y-4">
                  {/* Nokta Yakalama Seçeneği */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider">
                      Nokta Yakalama Modu (Snapping)
                    </h4>
                    <select
                      value={!viewport.snapToGrid ? 'off' : viewport.pointSnapMode || 'snapToGrid'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'off') {
                          setViewport((prev) => ({ ...prev, snapToGrid: false, pointSnapMode: 'off' }));
                        } else {
                          setViewport((prev) => ({
                            ...prev,
                            snapToGrid: true,
                            pointSnapMode: val as any,
                          }));
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-card border border-border/80 text-foreground text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
                    >
                      <option value="automatic">Otomatik</option>
                      <option value="snapToGrid">Izgaraya Sıçra</option>
                      <option value="fixedToGrid">Izgaraya Sabitli</option>
                      <option value="off">Kapalı</option>
                    </select>
                  </div>

                  {/* Görünüm ve Koordinat Düzlemi Seçenekleri */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-muted/40 border border-border/70">
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-wider">
                      Düzlem Elemanları
                    </h4>

                    <div className="space-y-2 text-xs pt-1">
                      {/* Izgara */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                        <div className="flex items-center gap-2.5">
                          <Grid className="w-4 h-4 text-ada-deniz dark:text-ada-vurgu" />
                          <span className="text-foreground font-bold">Izgara</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={viewport.showGrid}
                          onChange={(e) => setViewport((prev) => ({ ...prev, showGrid: e.target.checked }))}
                          className="sr-only"
                        />
                        {viewport.showGrid ? (
                          <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-border bg-card shrink-0" />
                        )}
                      </label>

                      {/* Izgara biçimi: kareli çizgiler ya da noktalı zemin (sağ tık menüsündeki seçimle aynı) */}
                      {viewport.showGrid && (
                        <div role="radiogroup" aria-label="Izgara biçimi" className="grid grid-cols-3 gap-1.5 pl-2">
                          {([['kareli', 'Kareli'], ['noktali', 'Noktalı'], ['izometrik', 'İzometrik']] as const).map(([bicim, ad]) => {
                            const secili = (viewport.gridStyle ?? 'kareli') === bicim;
                            return (
                              <button
                                key={bicim}
                                type="button"
                                role="radio"
                                aria-checked={secili}
                                onClick={() => setViewport((prev) => ({ ...prev, gridStyle: bicim }))}
                                className={`min-h-[40px] rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                  secili
                                    ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                                    : 'bg-card border-border text-foreground hover:border-primary/50'
                                }`}
                              >
                                {ad}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Izgara aralığı: Otomatik (yakınlaştırmaya göre) ya da sabit değer; çizim ve nokta yakalama birlikte kullanır */}
                      {(() => {
                        const otomatik = viewport.gridStepAuto !== false;
                        const simdiki = visibleGridStep(viewport).step;
                        const aralikSec = (deger: number | 'oto') => {
                          setOzelAralikHata(null);
                          setViewport((prev) =>
                            deger === 'oto' ? { ...prev, gridStepAuto: true } : { ...prev, gridStepAuto: false, gridStep: deger }
                          );
                        };
                        const ozelUygula = () => {
                          const deger = Number(ozelAralik.trim().replace(',', '.'));
                          if (!(deger > 0) || deger > 100) {
                            setOzelAralikHata('0 ile 100 arasında bir sayı girin (örn. 0,25).');
                            return;
                          }
                          aralikSec(deger);
                          setOzelAralik('');
                        };
                        return (
                          <div className="space-y-2 p-2.5 rounded-xl bg-card border border-border" data-izgara-araligi>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-foreground font-bold">Izgara aralığı</span>
                              <span className="text-[11px] text-muted-foreground">
                                {otomatik
                                  ? `Otomatik · şu an ${formatTurkishNumber(simdiki)} br`
                                  : `${formatTurkishNumber(viewport.gridStep)} br${simdiki !== viewport.gridStep ? ` (uzakta ${formatTurkishNumber(simdiki)} br)` : ''}`}
                              </span>
                            </div>
                            <div role="radiogroup" aria-label="Izgara aralığı" className="grid grid-cols-5 gap-1.5">
                              {([['oto', 'Otomatik'], [0.5, '0,5'], [1, '1'], [2, '2'], [5, '5']] as const).map(([deger, ad]) => {
                                const secili = deger === 'oto' ? otomatik : !otomatik && viewport.gridStep === deger;
                                return (
                                  <button
                                    key={String(deger)}
                                    type="button"
                                    role="radio"
                                    aria-checked={secili}
                                    onClick={() => aralikSec(deger)}
                                    className={`min-h-[40px] rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                      secili
                                        ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                                        : 'bg-card border-border text-foreground hover:border-primary/50'
                                    }`}
                                  >
                                    {ad}
                                  </button>
                                );
                              })}
                            </div>
                            <form
                              className="flex items-center gap-1.5"
                              onSubmit={(e) => {
                                e.preventDefault();
                                ozelUygula();
                              }}
                            >
                              <label htmlFor="izgara-ozel-aralik" className="text-[11px] font-semibold text-muted-foreground shrink-0">
                                Özel aralık
                              </label>
                              <input
                                id="izgara-ozel-aralik"
                                type="text"
                                inputMode="decimal"
                                placeholder="örn. 0,25"
                                value={ozelAralik}
                                onChange={(e) => {
                                  setOzelAralik(e.target.value);
                                  setOzelAralikHata(null);
                                }}
                                aria-invalid={ozelAralikHata !== null}
                                className={`min-w-0 flex-1 min-h-[40px] px-2.5 rounded-xl bg-background border text-xs font-mono text-foreground outline-none focus:border-primary ${
                                  ozelAralikHata ? 'border-destructive' : 'border-border'
                                }`}
                              />
                              <span className="text-[11px] font-bold text-muted-foreground">br</span>
                              <button
                                type="submit"
                                className="min-h-[40px] px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                              >
                                Uygula
                              </button>
                            </form>
                            {ozelAralikHata && (
                              <p role="alert" className="text-[11px] font-semibold text-destructive">
                                {ozelAralikHata}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Izgara saydamlığı: kareli, noktalı ve izometrik ızgaranın ne kadar belirgin çizileceği */}
                      <div className="space-y-1.5 p-2.5 rounded-xl bg-card border border-border" data-izgara-saydamligi>
                        <div className="flex items-center justify-between gap-2">
                          <label htmlFor="izgara-saydamligi" className="text-foreground font-bold">
                            Izgara saydamlığı
                          </label>
                          <span className="font-mono text-[11px] font-bold text-muted-foreground">
                            %{Math.round((viewport.gridOpacity ?? 1) * 100)} görünür
                          </span>
                        </div>
                        <input
                          id="izgara-saydamligi"
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={viewport.gridOpacity ?? 1}
                          onChange={(e) => {
                            const deger = parseFloat(e.target.value);
                            setViewport((prev) => ({ ...prev, gridOpacity: deger }));
                          }}
                          aria-valuetext={`Yüzde ${Math.round((viewport.gridOpacity ?? 1) * 100)} görünür`}
                          className="w-full min-h-[32px] accent-primary cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                          <span>Silik</span>
                          <span>Tam belirgin</span>
                        </div>
                      </div>

                      {/* Eksenler */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                        <div className="flex items-center gap-2.5">
                          <Compass className="w-4 h-4 text-ada-vurgu" />
                          <span className="text-foreground font-bold">Koordinat Eksenleri (x, y)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={viewport.showAxes}
                          onChange={(e) => setViewport((prev) => ({ ...prev, showAxes: e.target.checked }))}
                          className="sr-only"
                        />
                        {viewport.showAxes ? (
                          <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-border bg-card shrink-0" />
                        )}
                      </label>

                      {/* Nokta Koordinatları */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                        <div className="flex items-center gap-2.5">
                          <Maximize className="w-4 h-4 text-ada-deniz dark:text-ada-vurgu" />
                          <span className="text-foreground font-bold">Nokta Koordinatları</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={viewport.showCoordinates}
                          onChange={(e) => setViewport((prev) => ({ ...prev, showCoordinates: e.target.checked }))}
                          className="sr-only"
                        />
                        {viewport.showCoordinates ? (
                          <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-border bg-card shrink-0" />
                        )}
                      </label>

                      {/* Bölge İsimleri */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                        <div className="flex items-center gap-2.5">
                          <Grid2x2 className="w-4 h-4 text-ada-altin" />
                          <span className="text-foreground font-bold">Bölge İsimleri (1, 2, 3, 4. Bölge)</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={viewport.showQuadrants ?? false}
                          onChange={(e) => setViewport((prev) => ({ ...prev, showQuadrants: e.target.checked }))}
                          className="sr-only"
                        />
                        {viewport.showQuadrants ? (
                          <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-border bg-card shrink-0" />
                        )}
                      </label>

                      {/* Siyah-Beyaz Mod */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                        <div className="flex items-center gap-2.5">
                          <Contrast className="w-4 h-4 text-foreground" />
                          <span className="text-foreground font-bold">Siyah–Beyaz Mod</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={viewport.blackWhite ?? false}
                          onChange={(e) => setViewport((prev) => ({ ...prev, blackWhite: e.target.checked }))}
                          className="sr-only"
                        />
                        {viewport.blackWhite ? (
                          <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-border bg-card shrink-0" />
                        )}
                      </label>

                      {/* Eşit Uzunlukları İşaretle: birbirine değen şekillerde eşit kenar/yay çentikleri (|, ||, |||) */}
                      <label className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                        <div className="flex items-center gap-2.5">
                          <span className="text-ada-vurgu"><EsitUzunluklarSimgesi /></span>
                          <span className="text-foreground font-bold">Eşit Uzunlukları İşaretle</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={viewport.showEqualityMarks !== false}
                          onChange={(e) => setViewport((prev) => ({ ...prev, showEqualityMarks: e.target.checked }))}
                          className="sr-only"
                        />
                        {viewport.showEqualityMarks !== false ? (
                          <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border-2 border-border bg-card shrink-0" />
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'genel' && (
                <div className="space-y-4">
                  {/* Arayüz Teması */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Arayüz Teması</div>
                      <div className="text-[11px] text-muted-foreground">Koyu veya açık renk teması</div>
                    </div>
                    <button
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Palette className="w-3.5 h-3.5 text-ada-mercan" />
                      <span>{theme === 'dark' ? 'Koyu Tema' : 'Açık Tema'}</span>
                    </button>
                  </div>

                  {/* Ölçü ve Sayı Standardı */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
                    <div className="text-xs font-bold text-foreground">Sayı ve Ölçü Standartları</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Ondalık Ayırıcı:</span>
                        <span className="font-bold text-foreground">Virgül (,) — MEB Standardı</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Varsayılan Uzunluk Birimi:</span>
                        <span className="font-bold text-foreground">Birim (br)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Açı Birimi:</span>
                        <span className="font-bold text-foreground">Derece (°)</span>
                      </div>
                    </div>
                  </div>

                  {/* Kısayollar ve Bilgi */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Klavye Kısayolları</div>
                      <div className="text-[11px] text-muted-foreground">Hızlı çizim ve işlem tuş kombinasyonları</div>
                    </div>
                    <button
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        setInfoModalType('shortcuts');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-ada-deniz" />
                      <span>Görüntüle</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Alt Butonlar */}
            <div className="px-5 py-3 border-t border-border/70 bg-muted/20 flex items-center justify-between gap-3 shrink-0">
              {/* Bütün ayarları varsayılana döndürür; yanlışlıkla basmaya karşı iki adımlıdır.
                  Çizime bakış (yakınlaştırma, kaydırma) korunur; nesneler silinmez. */}
              <button
                type="button"
                onClick={() => {
                  if (!sifirlamaOnayi) {
                    setSifirlamaOnayi(true);
                    window.setTimeout(() => setSifirlamaOnayi(false), 4000);
                    return;
                  }
                  setSifirlamaOnayi(false);
                  setStyleSettings(DEFAULT_STYLE_SETTINGS);
                  setViewport((prev) => ({ ...prev, ...VARSAYILAN_GORUNUM_AYARLARI }));
                }}
                aria-label="Bütün ayarları varsayılana döndür"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  sifirlamaOnayi
                    ? 'bg-destructive/10 border-destructive text-destructive'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{sifirlamaOnayi ? 'Emin misiniz? Sıfırla' : 'Varsayılana Sıfırla'}</span>
              </button>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
