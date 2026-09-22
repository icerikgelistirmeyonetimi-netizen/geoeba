'use client';

import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ToolMode } from '@/types/workspace';
import { isAnyModalOpen } from '@/components/ui/modalState';
import { workspaceOwnsKeyboard, toolForShortcut } from './toolShortcuts';
import { ARAC_SECILDI_OLAYI } from './olcmeAraclari';
import { Toolbar } from './Toolbar';
import { CommandAssistant } from './CommandAssistant';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { ActivityPanel } from './ActivityPanel';
import { FunctionDialog } from './FunctionDialog';
import { SliderDialog } from './SliderDialog';
import { RegularPolygonDialog } from './RegularPolygonDialog';
import { CircleRadiusDialog } from './CircleRadiusDialog';
import { ValuePromptDialog } from './ValuePromptDialog';
import { AddObjectModal } from './AddObjectModal';
import { ConfirmClearModal } from './ConfirmClearModal';

// 3D Bileşenleri
import { Toolbar3D } from './Toolbar3D';
import { Canvas3D } from './Canvas3D';
import { Properties3D } from './Properties3D';
import { AlgebraView } from './AlgebraView';
import { Solid3DObject, Solid3DType, Tool3DMode, Camera3D, Point3D } from '@/types/workspace3d';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  LayoutGrid,
  Columns2,
  Rows2,
  Maximize2,
  Box,
  Sliders,
  RotateCcw,
  Eye,
  PenTool,
  Palette,
  ChevronLeft,
  ChevronRight,
  Settings,
  Grid,
  Contrast,
  Check,
  Plus,
} from 'lucide-react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { syncUserFunctions } from '@/math/functionNames';
import { createId } from '@/state/ids';
import { validateProjectSolids } from '@/math/projectFile';

const SCENE_STORAGE_KEY = 'matematik_3d_sahne_v1';
const HISTORY_LIMIT = 80;
const COALESCE_MS = 700;

export type LayoutMode = 'default' | 'algebra_2d' | '2d_3d' | 'three_col' | 'algebra_3d' | '2d_only' | '3d_only';

const DEFAULT_CAMERA_3D: Camera3D = {
  rotX: 25,
  rotY: -40,
  zoom: 55,
  panX: 0,
  panY: 30,
  perspective: 700,
  showGrid: true,
  showAxes: true,
  showCoordinates: true,
};

const SOLID_NAMES: Record<Solid3DType, string> = {
  cube: 'Küp',
  sphere: 'Küre',
  cylinder: 'Silindir',
  prism: 'Prizma',
  triangular_prism: 'Üçgen Prizma',
  cone: 'Koni',
  pyramid: 'Kare Piramit',
};

const SOLID_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

/* ------------------------- 3D sahne geçmişi (undo/redo) ------------------------- */

interface SceneState {
  solids: Solid3DObject[];
  past: Solid3DObject[][];
  future: Solid3DObject[][];
  lastKey: string | null;
  lastTime: number;
  dragKey: string | null;
}

type SceneUpdater = (prev: Solid3DObject[]) => Solid3DObject[];

type SceneAction =
  | { type: 'set'; updater: SceneUpdater; key?: string; now: number }
  | { type: 'drag'; updater: SceneUpdater; key: string }
  | { type: 'dragEnd' }
  | { type: 'dragCancel' }
  | { type: 'restore'; solids: Solid3DObject[] }
  | { type: 'undo' }
  | { type: 'redo' };

/**
 * Her 3B sahne durumunun hangi zamanda OLUŞTURULDUĞU (anahtar: durum dizisinin kendisi).
 * 2B ve 3B geçmişleri ayrı olduğundan ortak geri alma, hangisinin son adımının daha yeni
 * olduğuna bu zamanlarla karar verir (bkz. math/ortakGecmis).
 */
const sahneZamani = new WeakMap<Solid3DObject[], number>();

function pushPast(past: Solid3DObject[][], snapshot: Solid3DObject[]): Solid3DObject[][] {
  const next = [...past, snapshot];
  if (next.length > HISTORY_LIMIT) next.shift();
  return next;
}

function sceneReducer(state: SceneState, action: SceneAction): SceneState {
  switch (action.type) {
    case 'set': {
      const nextSolids = action.updater(state.solids);
      if (nextSolids === state.solids) return state;
      sahneZamani.set(nextSolids, action.now);
      const coalesce = !!action.key && state.lastKey === action.key && action.now - state.lastTime < COALESCE_MS;
      if (coalesce) {
        return { ...state, solids: nextSolids, lastTime: action.now, dragKey: null };
      }
      return {
        solids: nextSolids,
        past: pushPast(state.past, state.solids),
        future: [],
        lastKey: action.key || null,
        lastTime: action.now,
        dragKey: null,
      };
    }
    case 'drag': {
      const nextSolids = action.updater(state.solids);
      if (nextSolids === state.solids) return state;
      sahneZamani.set(nextSolids, Date.now());
      if (state.dragKey === action.key) {
        return { ...state, solids: nextSolids };
      }
      return {
        solids: nextSolids,
        past: pushPast(state.past, state.solids),
        future: [],
        lastKey: null,
        lastTime: 0,
        dragKey: action.key,
      };
    }
    case 'dragEnd': {
      if (state.dragKey === null) return state;
      return { ...state, dragKey: null };
    }
    case 'dragCancel': {
      if (state.dragKey === null || state.past.length === 0) {
        return state.dragKey === null ? state : { ...state, dragKey: null };
      }
      const restored = state.past[state.past.length - 1];
      return {
        ...state,
        solids: restored,
        past: state.past.slice(0, -1),
        dragKey: null,
      };
    }
    case 'restore': {
      return { solids: action.solids, past: [], future: [], lastKey: null, lastTime: 0, dragKey: null };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        solids: previous,
        past: state.past.slice(0, -1),
        future: [state.solids, ...state.future],
        lastKey: null,
        lastTime: 0,
        dragKey: null,
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        solids: next,
        past: [...state.past, state.solids],
        future: state.future.slice(1),
        lastKey: null,
        lastTime: 0,
        dragKey: null,
      };
    }
    default:
      return state;
  }
}

function loadSavedScene(): Solid3DObject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SCENE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.solids)) throw new Error('Geçersiz 3B kaydı');
    return validateProjectSolids(parsed.solids);
  } catch {
    throw new Error('Kayıtlı 3B sahne açılamadı. Önceki kayıt korunuyor; çalışmanızı Dosya menüsünden kaydedebilirsiniz.');
  }
}

export function WorkspaceView() {
  const {
    setSceneBridge,
    setHintMessage,
    selectAll,
    objects,
    setSelectedObjectIds,
    setActiveTool,
    openRegularPolygonDialog,
    studioDimension,
    setStudioDimension,
    clearWorkspace,
    isConfirmClearOpen,
    confirmClearTargetDim,
    setIsConfirmClearOpen,
    requestClearAll,
    isRegularPolygonDialogOpen,
    regularPolygonPos,
    setIsRegularPolygonDialogOpen,
    valuePrompt,
    setValuePrompt,
    isCircleRadiusDialogOpen,
    circleRadiusPos,
    setIsCircleRadiusDialogOpen,
    resetViewport,
    viewport,
    setViewport,
    layoutMode,
    setLayoutMode,
    isFunctionDialogOpen,
    setIsFunctionDialogOpen,
    isSliderDialogOpen,
    setIsSliderDialogOpen,
    isAddObjectDialogOpen,
    setIsAddObjectDialogOpen,
  } = useWorkspace();

  // Adlı fonksiyonlar (f, g …) tuval çizilmeden önce ayrıştırıcıya bildirilir
  syncUserFunctions(objects);

  // Düzen ve Panel Durumları
  const [showWorkspaceSettingsMenu, setShowWorkspaceSettingsMenu] = useState(false);
  const [splitY, setSplitY] = useState<number>(54); // Üst 2D panel yüksekliği yüzdesi (Varsayılan çoklu düzende)
  const [splitX, setSplitX] = useState<number>(44); // Alt/Sol Cebir paneli genişliği yüzdesi
  const [isDraggingY, setIsDraggingY] = useState(false);
  const [isDraggingX, setIsDraggingX] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // 2D & 3D Panel Durumları
  const [showToolbar, setShowToolbar] = useState(true);

  // 3D Stüdyo Durumları (geçmiş destekli)
  const [scene, dispatch] = useReducer(sceneReducer, null, () => ({
    solids: [] as Solid3DObject[],
    past: [] as Solid3DObject[][],
    future: [] as Solid3DObject[][],
    lastKey: null,
    lastTime: 0,
    dragKey: null,
  }));
  const solids = scene.solids;
  const [sceneLoaded, setSceneLoaded] = useState(false);

  // Kayıtlı sahneyi geri yükle
  useEffect(() => {
    try {
      const saved = loadSavedScene();
      if (saved.length > 0) dispatch({ type: 'restore', solids: saved });
      setSceneLoaded(true);
    } catch (error) { setHintMessage((error as Error).message); }
  }, [setHintMessage]);

  // Sahneyi kaydet
  useEffect(() => {
    if (!sceneLoaded) return;
    try { localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify({ version: 1, solids })); } catch { /* Dosya kaydı kullanılabilir. */ }
  }, [solids, sceneLoaded]);

  const dragKeyRef = useRef<string | null>(null);

  const setSolids = useCallback(
    (updater: Solid3DObject[] | SceneUpdater, key?: string) => {
      const fn: SceneUpdater = typeof updater === 'function' ? updater : () => updater;
      dragKeyRef.current = null;
      dispatch({ type: 'set', updater: fn, key, now: Date.now() });
    },
    []
  );

  const dragSolids = useCallback((updater: SceneUpdater) => {
    if (dragKeyRef.current === null) dragKeyRef.current = createId('drag');
    dispatch({ type: 'drag', updater, key: dragKeyRef.current });
  }, []);

  const handleDragEnd = useCallback(() => {
    dragKeyRef.current = null;
    dispatch({ type: 'dragEnd' });
  }, []);

  const handleDragCancel = useCallback(() => {
    dragKeyRef.current = null;
    dispatch({ type: 'dragCancel' });
  }, []);

  const [selectedSolidIds, setSelectedSolidIds] = useState<string[]>([]);
  const selectedSolidId = selectedSolidIds[0] || null;
  const setSelectedSolidId = (id: string | null) => setSelectedSolidIds(id ? [id] : []);

  const [active3DTool, setActive3DTool] = useState<Tool3DMode>('select_move');
  const [camera3D, setCamera3D] = useState<Camera3D>(DEFAULT_CAMERA_3D);
  const [showGlobalVertices, setShowGlobalVertices] = useState(true);
  const [showGlobalEdges, setShowGlobalEdges] = useState(true);
  const [showGlobalFaces, setShowGlobalFaces] = useState(true);

  useEffect(() => {
    setSceneBridge({
      solids, camera: camera3D, selectedIds: selectedSolidIds,
      canUndo: scene.past.length > 0, canRedo: scene.future.length > 0,
      undoTime: scene.past.length > 0 ? sahneZamani.get(solids) ?? 0 : undefined,
      redoTime: scene.future.length > 0 ? sahneZamani.get(scene.future[0]) ?? 0 : undefined,
      setSolids, setCamera: setCamera3D,
      select: ids => { setSelectedSolidIds(ids); setActive3DTool('select_move'); },
      restore: (next, camera) => { dispatch({ type: 'restore', solids: next }); if (camera) setCamera3D(camera); setSelectedSolidIds([]); },
      undo: () => dispatch({ type: 'undo' }), redo: () => dispatch({ type: 'redo' }),
    });
  }, [solids, camera3D, selectedSolidIds, scene.past.length, scene.future, setSolids, setSceneBridge]);
  useEffect(() => () => setSceneBridge(null), [setSceneBridge]);

  // Silinen cisimler seçimden düşsün
  useEffect(() => {
    setSelectedSolidIds((prev) => {
      const filtered = prev.filter((id) => solids.some((s) => s.id === id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [solids]);

  /* ------------------- Bölücüleri Fare ile Boyutlandırma ------------------- */
  const handleMouseDownSplitterY = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingY(true);
  }, []);

  const handleMouseDownSplitterX = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingX(true);
  }, []);

  useEffect(() => {
    if (!isDraggingY && !isDraggingX) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (isDraggingY) {
        const relativeY = e.clientY - rect.top;
        const percentY = Math.min(80, Math.max(20, (relativeY / rect.height) * 100));
        setSplitY(percentY);
      }

      if (isDraggingX) {
        const relativeX = e.clientX - rect.left;
        const percentX = Math.min(80, Math.max(18, (relativeX / rect.width) * 100));
        setSplitX(percentX);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingY(false);
      setIsDraggingX(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.userSelect = 'none';
    if (isDraggingY) document.body.style.cursor = 'row-resize';
    if (isDraggingX) document.body.style.cursor = 'col-resize';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingY, isDraggingX]);

  /* ------------------------------ 3D Eylemler ------------------------------ */

  const handleAddSolid = (
    type: Solid3DType,
    customDimensions?: { width?: number; height?: number; depth?: number; radius?: number },
    customPos?: Point3D
  ) => {
    const base = { width: 3, height: 3, depth: 3, radius: 1.5 };
    const dims = customDimensions
      ? {
          width: customDimensions.width ?? (customDimensions.radius ? customDimensions.radius * 2 : base.width),
          height: customDimensions.height ?? base.height,
          depth: customDimensions.depth ?? (customDimensions.radius ? customDimensions.radius * 2 : base.depth),
          radius: customDimensions.radius ?? (customDimensions.width ? customDimensions.width / 2 : base.radius),
        }
      : base;
    if (type === 'cube') {
      dims.height = dims.width;
      dims.depth = dims.width;
      dims.radius = dims.width / 2;
    }

    const newId = createId(`solid-${type}`);

    setSolids((prev) => {
      const count = prev.filter((s) => s.type === type).length + 1;
      const color = SOLID_COLORS[prev.length % SOLID_COLORS.length];
      const idx = prev.length;
      const autoPos: Point3D = { x: ((idx % 4) - 1.5) * 4.5, y: -Math.floor(idx / 4) * 4.5, z: 0 };

      const newSolid: Solid3DObject = {
        id: newId,
        type,
        name: `${SOLID_NAMES[type]} ${count}`,
        position: customPos || autoPos,
        dimensions: dims,
        rotation: { x: 0, y: 0, z: 0 },
        color,
        opacity: 0.85,
        showWireframe: true,
        showVertices: true,
        showFaces: true,
        unfoldProgress: 0,
        selectedFaceIndex: null,
      };
      return [...prev, newSolid];
    });
    setSelectedSolidIds([newId]);
  };

  const updateSolidById = (id: string, updates: Partial<Solid3DObject>, key?: string) => {
    setSolids((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)), key);
  };

  const handleUpdateSolid = (updates: Partial<Solid3DObject>) => {
    if (!selectedSolidId) return;
    updateSolidById(selectedSolidId, updates, `prop:${selectedSolidId}:${Object.keys(updates).join(',')}`);
  };

  const handleDeleteSolid = () => {
    if (selectedSolidIds.length === 0) return;
    setSolids((prev) => prev.filter((s) => !selectedSolidIds.includes(s.id)));
    setSelectedSolidIds([]);
  };

  const handleDeleteSolidById = useCallback((id: string) => {
    setSolids((prev) => prev.filter((s) => s.id !== id));
    setSelectedSolidIds((prev) => prev.filter((sid) => sid !== id));
  }, []);

  /** Birden çok cismi tek geçmiş adımıyla siler (2B seçim çubuğu ve cisim sağ tık menüsü). */
  const handleDeleteSolidsById = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const silinecek = new Set(ids);
    setSolids((prev) => prev.filter((s) => !silinecek.has(s.id)));
    setSelectedSolidIds((prev) => prev.filter((sid) => !silinecek.has(sid)));
  }, [setSolids]);

  const handleDragSolidPosition = useCallback(
    (id: string, newPos: Point3D) => {
      dragSolids((prev) => prev.map((s) => (s.id === id ? { ...s, position: newPos } : s)));
    },
    [dragSolids]
  );

  const handleDragSolidsPosition = useCallback(
    (ids: string[], delta: Point3D) => {
      dragSolids((prev) =>
        prev.map((s) =>
          ids.includes(s.id)
            ? {
                ...s,
                position: {
                  x: Number((s.position.x + delta.x).toFixed(2)),
                  y: Number((s.position.y + delta.y).toFixed(2)),
                  z: Number((s.position.z + delta.z).toFixed(2)),
                },
              }
            : s
        )
      );
    },
    [dragSolids]
  );

  const handleClearAllSolids = () => {
    setSolids([]);
    setSelectedSolidIds([]);
  };

  const handleConfirmClear = () => {
    if (confirmClearTargetDim === '2D') clearWorkspace();
    else handleClearAllSolids();
    setIsConfirmClearOpen(false);
  };

  const handleAutoArrange = () => {
    setSolids((prev) =>
      prev.map((solid, idx) => ({
        ...solid,
        position: { x: (idx - (prev.length - 1) / 2) * 6, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      }))
    );
    setCamera3D((prev) => ({ ...prev, rotX: 25, rotY: -40, panX: 0, panY: 30, zoom: 45 }));
  };

  const handleSetCameraPreset = (preset: 'isometric' | 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left' | 'side') => {
    const presets: Record<typeof preset, Partial<Camera3D>> = {
      isometric: { rotX: 25, rotY: -40, panX: 0, panY: 30, zoom: 55 },
      front: { rotX: 0, rotY: 0, panX: 0, panY: 30, zoom: 55 },
      back: { rotX: 0, rotY: 180, panX: 0, panY: 30, zoom: 55 },
      top: { rotX: 85, rotY: 0, panX: 0, panY: 0, zoom: 55 },
      bottom: { rotX: -85, rotY: 0, panX: 0, panY: 0, zoom: 55 },
      right: { rotX: 0, rotY: -90, panX: 0, panY: 30, zoom: 55 },
      side: { rotX: 0, rotY: -90, panX: 0, panY: 30, zoom: 55 },
      left: { rotX: 0, rotY: 90, panX: 0, panY: 30, zoom: 55 },
    };
    setCamera3D((prev) => ({ ...prev, ...presets[preset] }));
  };

  const undo3D = () => dispatch({ type: 'undo' });
  const redo3D = () => dispatch({ type: 'redo' });

  const activateTool = (tool: ToolMode) => {
    if (tool === 'function') {
      setIsFunctionDialogOpen(true);
      return;
    }
    if (tool === 'slider') {
      setIsSliderDialogOpen(true);
      return;
    }
    setActiveTool(tool);
    // Açık aracın yeniden seçilmesi durum değiştirmez; ölçme araçları bu olayla yeniden ortalanır
    containerRef.current?.dispatchEvent(new CustomEvent(ARAC_SECILDI_OLAYI, { bubbles: true, detail: { tool } }));
    if (tool === 'regular_polygon') openRegularPolygonDialog();
  };

  const shortcutsRef = useRef({ objects, solids, studioDimension, activateTool });
  shortcutsRef.current = { objects, solids, studioDimension, activateTool };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!workspaceOwnsKeyboard(event, containerRef.current) || isAnyModalOpen()) return;
      const current = shortcutsRef.current;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.code === 'KeyA') {
        event.preventDefault();
        selectAll();
        return;
      }
      if (current.studioDimension === '3D') return;
      const tool = toolForShortcut(event);
      if (tool) {
        event.preventDefault();
        current.activateTool(tool);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActiveTool, setSelectedObjectIds, selectAll]);

  const selectedSolid = solids.find((s) => s.id === selectedSolidId) || null;

  const is3DLayout = layoutMode === '3d_only' || layoutMode === 'algebra_3d';
  const is2DLayout = layoutMode === '2d_only' || layoutMode === 'algebra_2d';
  const isMultiView = !is3DLayout && !is2DLayout;
  const show3DToolbar = is3DLayout || (isMultiView && studioDimension === '3D');

  const handleSwitchTo3D = useCallback(() => {
    setStudioDimension('3D');
    if (layoutMode === '2d_only') {
      setLayoutMode('3d_only');
    } else if (layoutMode === 'algebra_2d') {
      setLayoutMode('algebra_3d');
    }
  }, [layoutMode, setStudioDimension, setLayoutMode]);

  const handleSwitchTo2D = useCallback(() => {
    setStudioDimension('2D');
    if (layoutMode === '3d_only') {
      setLayoutMode('2d_only');
    } else if (layoutMode === 'algebra_3d') {
      setLayoutMode('algebra_2d');
    }
  }, [layoutMode, setStudioDimension, setLayoutMode]);

  useEffect(() => {
    if ((layoutMode === '3d_only' || layoutMode === 'algebra_3d') && studioDimension !== '3D') {
      setStudioDimension('3D');
    } else if ((layoutMode === '2d_only' || layoutMode === 'algebra_2d') && studioDimension !== '2D') {
      setStudioDimension('2D');
    }
  }, [layoutMode, studioDimension, setStudioDimension]);

  /* ------------------- Render Panelleri Tanımları ------------------- */

  // 1. CEBİR PANELİ
  const renderAlgebraPanel = (
    <div className="flex flex-col h-full w-full bg-card/60 backdrop-blur-sm border-r border-border/60 overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 bg-muted/40 border-b border-border/60 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-ada-deniz shadow-sm shadow-ada-deniz/50" />
          <span className="text-xs font-bold tracking-wider text-foreground uppercase">CEBİR</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {objects.length + solids.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAddObjectDialogOpen(true)}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted/60 transition-colors"
            title="Yeni Nesne Ekle"
          >
            + Ekle
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <AlgebraView
          solids={solids}
          onOpenFunctionDialog={() => setIsFunctionDialogOpen(true)}
          onOpenSliderDialog={() => setIsSliderDialogOpen(true)}
          onAddSolid={handleAddSolid}
        />
      </div>
    </div>
  );

  // 2. 2D GRAFİK PANELİ (başlık şeridi yok: tuval dikeyde tüm alanı kullanır)
  const render2DPanel = (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      <div className="flex-1 min-h-0 relative flex overflow-hidden">
        <div className="flex-1 relative min-w-0">
          <Canvas
            onSwitchTo3D={handleSwitchTo3D}
            solids={solids}
            selectedSolidId={selectedSolidId}
            selectedSolidIds={selectedSolidIds}
            onSelectSolid={setSelectedSolidId}
            onSelectSolids={setSelectedSolidIds}
            onUpdateSolidPosition={handleDragSolidPosition}
            onDeleteSolid={handleDeleteSolidById}
            onDeleteSolids={handleDeleteSolidsById}
            onDragEnd={handleDragEnd}
          />
          <CommandAssistant onSelectTool={activateTool} />
        </div>
      </div>
    </div>
  );

  // 3. 3D GRAFİK PANELİ
  const render3DPanel = (
    <div
      onClick={() => {
        if (isMultiView && studioDimension !== '3D') {
          setStudioDimension('3D');
        }
      }}
      className="flex flex-col h-full w-full bg-background relative overflow-hidden border-l border-border/40"
    >
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-muted/30 border-b border-border/40 shrink-0 z-10 select-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-ada-lavanta shadow-sm shadow-ada-lavanta/50" />
          <span className="text-xs font-bold tracking-wider text-foreground uppercase">3D GRAFİK</span>
          {solids.length > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground">({solids.length} Cisim)</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setStudioDimension('3D');
              setIsAddObjectDialogOpen(true);
            }}
            className="text-[11px] font-bold text-primary hover:bg-accent px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
            title="3D Cisim Ekle"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nesne Ekle</span>
          </button>
          <button
            onClick={() => handleSetCameraPreset('isometric')}
            className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted/60 transition-colors flex items-center gap-1 cursor-pointer"
            title="İzometrik Görünüm"
          >
            <Box className="w-3 h-3" />
            <span className="hidden sm:inline">İzometrik</span>
          </button>
          <button
            onClick={() => handleSetCameraPreset('top')}
            className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted/60 transition-colors cursor-pointer"
            title="Üstten Görünüm (Z-Düzlemi)"
          >
            Üst
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative flex overflow-hidden">
        <div className="flex-1 relative min-w-0">
          <Canvas3D
            solids={solids}
            selectedSolidId={selectedSolidId}
            selectedSolidIds={selectedSolidIds}
            activeTool={active3DTool}
            camera={camera3D}
            showGlobalVertices={showGlobalVertices}
            showGlobalEdges={showGlobalEdges}
            showGlobalFaces={showGlobalFaces}
            setCamera={setCamera3D}
            onSelectSolid={setSelectedSolidId}
            onSelectSolids={setSelectedSolidIds}
            onAddSolid={handleAddSolid}
            onDeleteSolid={(id) => {
              if (id) {
                setSolids((prev) => prev.filter((s) => s.id !== id));
                setSelectedSolidIds((prev) => prev.filter((sid) => sid !== id));
              } else {
                handleDeleteSolid();
              }
            }}
            onDeleteSolids={handleDeleteSolid}
            onClearAll={() => requestClearAll('3D')}
            setActive3DTool={setActive3DTool}
            onUpdateSolid={(id, updates) => updateSolidById(id, updates, `prop:${id}:${Object.keys(updates).join(',')}`)}
            onUpdateSolidPosition={handleDragSolidPosition}
            onUpdateSolidsPosition={handleDragSolidsPosition}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            onSwitchTo2D={handleSwitchTo2D}
            onUndo={scene.past.length > 0 ? undo3D : undefined}
            onRedo={scene.future.length > 0 ? redo3D : undefined}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div data-calisma-alani className="flex flex-col h-[calc(100vh-3.5rem)] w-full bg-background text-foreground overflow-hidden">
      {studioDimension === '2D' && !is3DLayout && <ActivityPanel />}

      {/* ANA ÇALIŞMA ALANI */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* SOL ARAÇ ÇUBUĞU */}
        <div className="relative flex flex-col shrink-0 h-full min-h-0 z-30">
          {isMultiView && (
            <div className="p-1 border-b border-border bg-card/90 flex items-center gap-1 shrink-0 select-none">
              <button
                onClick={() => setStudioDimension('2D')}
                className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  studioDimension === '2D'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title="2D Geometri Araçlarını Göster"
              >
                <span>📐</span>
                <span className="hidden sm:inline">2D Araçları</span>
              </button>
              <button
                onClick={() => setStudioDimension('3D')}
                className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  studioDimension === '3D'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title="3D Katı Cisim Araçlarını Göster"
              >
                <span>🧊</span>
                <span className="hidden sm:inline">3D Araçları</span>
              </button>
            </div>
          )}
          <div className="flex-1 min-h-0 flex relative">
            {show3DToolbar ? (
              <Toolbar3D
                activeTool={active3DTool}
                setActiveTool={setActive3DTool}
                showEdges={showGlobalEdges}
                showVertices={showGlobalVertices}
                showFaces={showGlobalFaces}
                toggleShowEdges={() => setShowGlobalEdges((prev) => !prev)}
                toggleShowVertices={() => setShowGlobalVertices((prev) => !prev)}
                toggleShowFaces={() => setShowGlobalFaces((prev) => !prev)}
                onAddSolid={handleAddSolid}
                onDeleteSelected={handleDeleteSolid}
                hasSelection={selectedSolidIds.length > 0}
                onOpenAddObjectDialog={() => setIsAddObjectDialogOpen(true)}
                onAutoArrange={handleAutoArrange}
                onSetCameraPreset={handleSetCameraPreset}
                onClearAll={() => requestClearAll('3D')}
                onSwitchTo2D={handleSwitchTo2D}
                solids={solids}
                selectedSolidId={selectedSolidId}
                selectedSolidIds={selectedSolidIds}
                onSelectSolid={setSelectedSolidId}
                onSelectSolids={setSelectedSolidIds}
                onUpdateSolid={handleUpdateSolid}
                onDeleteSolidById={handleDeleteSolidById}
                layoutMode={layoutMode}
                onLayoutModeChange={setLayoutMode}
              />
            ) : (
              <Toolbar
                onSelectTool={activateTool}
                onOpenFunctionDialog={() => setIsFunctionDialogOpen(true)}
                onOpenSliderDialog={() => setIsSliderDialogOpen(true)}
                onOpenAddObjectDialog={() => setIsAddObjectDialogOpen(true)}
                layoutMode={layoutMode}
                onLayoutModeChange={setLayoutMode}
              />
            )}
          </div>
        </div>

        {/* ÇOKLU GÖRÜNÜM MERKEZİ ALAN */}
        <div ref={containerRef} className="flex-1 min-w-0 min-h-0 relative flex flex-col overflow-hidden bg-background">
          {layoutMode === 'default' && (
            /* 1. VARSAYILAN DÜZEN: Üstte 2D Grafik, Altta (Cebir + 3D) */
            <div className="flex flex-col h-full w-full overflow-hidden">
              {/* Üst Panel: 2D GRAFİK */}
              <div style={{ height: `${splitY}%` }} className="w-full min-h-[120px] overflow-hidden relative">
                {render2DPanel}
              </div>

              {/* Yatay Bölücü Çizgisi (Mouse ile sürüklenebilir) */}
              <div
                onMouseDown={handleMouseDownSplitterY}
                className="h-2 w-full bg-border/40 hover:bg-primary/40 active:bg-primary transition-colors cursor-row-resize flex items-center justify-center shrink-0 group z-30 select-none"
                title="Yüksekliği ayarlamak için sürükleyin"
              >
                <div className="w-12 h-1 rounded-full bg-border group-hover:bg-primary/80 transition-colors" />
              </div>

              {/* Alt Panel: Cebir ve 3D Yan Yana */}
              <div style={{ height: `${100 - splitY}%` }} className="w-full min-h-[120px] flex overflow-hidden relative">
                {/* Alt-Sol: CEBİR */}
                <div style={{ width: `${splitX}%` }} className="h-full min-w-[180px] overflow-hidden relative">
                  {renderAlgebraPanel}
                </div>

                {/* Dikey Bölücü Çizgisi (Mouse ile sürüklenebilir) */}
                <div
                  onMouseDown={handleMouseDownSplitterX}
                  className="w-2 h-full bg-border/40 hover:bg-primary/40 active:bg-primary transition-colors cursor-col-resize flex items-center justify-center shrink-0 group z-30 select-none"
                  title="Genişliği ayarlamak için sürükleyin"
                >
                  <div className="h-12 w-1 rounded-full bg-border group-hover:bg-primary/80 transition-colors" />
                </div>

                {/* Alt-Sağ: 3D GRAFİK */}
                <div style={{ width: `${100 - splitX}%` }} className="h-full min-w-[180px] overflow-hidden relative">
                  {render3DPanel}
                </div>
              </div>
            </div>
          )}

          {layoutMode === 'algebra_2d' && (
            /* 2. CEBİR + 2D */
            <div className="flex h-full w-full overflow-hidden">
              <div style={{ width: `${splitX}%` }} className="h-full min-w-[200px] overflow-hidden relative">
                {renderAlgebraPanel}
              </div>
              <div
                onMouseDown={handleMouseDownSplitterX}
                className="w-2 h-full bg-border/40 hover:bg-primary/40 active:bg-primary transition-colors cursor-col-resize flex items-center justify-center shrink-0 group z-30 select-none"
              >
                <div className="h-12 w-1 rounded-full bg-border group-hover:bg-primary/80 transition-colors" />
              </div>
              <div style={{ width: `${100 - splitX}%` }} className="h-full min-w-[200px] overflow-hidden relative">
                {render2DPanel}
              </div>
            </div>
          )}

          {layoutMode === '2d_3d' && (
            /* 3. 2D + 3D */
            <div className="flex h-full w-full overflow-hidden">
              <div style={{ width: `${splitX}%` }} className="h-full min-w-[200px] overflow-hidden relative">
                {render2DPanel}
              </div>
              <div
                onMouseDown={handleMouseDownSplitterX}
                className="w-2 h-full bg-border/40 hover:bg-primary/40 active:bg-primary transition-colors cursor-col-resize flex items-center justify-center shrink-0 group z-30 select-none"
              >
                <div className="h-12 w-1 rounded-full bg-border group-hover:bg-primary/80 transition-colors" />
              </div>
              <div style={{ width: `${100 - splitX}%` }} className="h-full min-w-[200px] overflow-hidden relative">
                {render3DPanel}
              </div>
            </div>
          )}

          {layoutMode === 'three_col' && (
            /* 4. 3 SÜTUN (Cebir | 2D | 3D) */
            <div className="flex h-full w-full overflow-hidden">
              <div className="w-1/4 h-full min-w-[200px] overflow-hidden relative">{renderAlgebraPanel}</div>
              <div className="w-[45%] h-full min-w-[200px] overflow-hidden relative border-x border-border/40">
                {render2DPanel}
              </div>
              <div className="flex-1 h-full min-w-[200px] overflow-hidden relative">{render3DPanel}</div>
            </div>
          )}

          {layoutMode === 'algebra_3d' && (
            /* 5. CEBİR + 3D */
            <div className="flex h-full w-full overflow-hidden">
              <div style={{ width: `${splitX}%` }} className="h-full min-w-[200px] overflow-hidden relative">
                {renderAlgebraPanel}
              </div>
              <div
                onMouseDown={handleMouseDownSplitterX}
                className="w-2 h-full bg-border/40 hover:bg-primary/40 active:bg-primary transition-colors cursor-col-resize flex items-center justify-center shrink-0 group z-30 select-none"
              >
                <div className="h-12 w-1 rounded-full bg-border group-hover:bg-primary/80 transition-colors" />
              </div>
              <div style={{ width: `${100 - splitX}%` }} className="h-full min-w-[200px] overflow-hidden relative">
                {render3DPanel}
              </div>
            </div>
          )}

          {layoutMode === '2d_only' && (
            /* 6. SADECE 2D */
            <div className="h-full w-full overflow-hidden">{render2DPanel}</div>
          )}

          {layoutMode === '3d_only' && (
            /* 7. SADECE 3D */
            <div className="h-full w-full overflow-hidden">{render3DPanel}</div>
          )}
        </div>
      </div>

      {/* 2D & 3D Modalları */}
      <AddObjectModal
        isOpen={isAddObjectDialogOpen}
        onClose={() => setIsAddObjectDialogOpen(false)}
        is3D={show3DToolbar}
        onAddSolid3D={handleAddSolid}
      />
      <FunctionDialog isOpen={isFunctionDialogOpen} onClose={() => setIsFunctionDialogOpen(false)} />
      <SliderDialog isOpen={isSliderDialogOpen} onClose={() => setIsSliderDialogOpen(false)} />
      <RegularPolygonDialog
        isOpen={isRegularPolygonDialogOpen}
        onClose={() => setIsRegularPolygonDialogOpen(false)}
        targetPos={regularPolygonPos}
      />
      <ValuePromptDialog request={valuePrompt} onClose={() => setValuePrompt(null)} />
      <CircleRadiusDialog
        isOpen={isCircleRadiusDialogOpen}
        onClose={() => setIsCircleRadiusDialogOpen(false)}
        targetPos={circleRadiusPos}
      />
      <ConfirmClearModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={handleConfirmClear}
        targetDimension={confirmClearTargetDim}
        objectCount={confirmClearTargetDim === '2D' ? objects.length : solids.length}
      />
    </div>
  );
}

