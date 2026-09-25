'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import {
  MathObject,
  PointObject,
  LineObject,
  CircleObject,
  AngleObject,
  PolygonObject,
  FunctionObject,
  SliderObject,
} from '@/types/math';
import { Solid3DObject } from '@/types/workspace3d';
import { calculateLineEquation } from '@/math/geometry';
import { formatTurkishNumber, formatCoordinate } from '@/math/coordinates';
import { sliderIsBound } from '@/math/sliderBindings';
import { sliderDisplay } from '@/math/sliderDisplay';
import { yazimAyari, yaricap } from '@/math/matematikYazimi';
import { cemberMerkezi, nesnedenNokta } from '@/math/olcuYazimlari';
import { type PanelSatiri, metinSatiri, nesneSatirlari, olcuSatiri, panelYazimi } from '@/math/panelYazimlari';
import { MatematikMetni } from '@/components/workspace/MatematikMetni';
import { PanelOlcusu } from '@/components/workspace/PanelOlcusu';
import { executeTurkishCommand, normalizeCommand } from '@/math/turkishCommands';
import { searchCommands, CommandSuggestion } from '@/math/commandSearch';
import { interpretSemanticMatch } from '@/math/semanticCommands';
import { useSemanticCommands } from '@/hooks/useSemanticCommands';
import { useSliderPlayback } from '@/hooks/useSliderPlayback';
import {
  Play,
  Pause,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Plus,
  ArrowUp,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronRight,
  Sliders,
  CircleDot,
  Box,
  CornerDownLeft,
  Ruler,
} from 'lucide-react';

interface AlgebraViewProps {
  solids?: Solid3DObject[];
  onSelectSolid?: (id: string | null) => void;
  selectedSolidId?: string | null;
  onDeleteSolid?: (id: string) => void;
  onOpenFunctionDialog?: () => void;
  onOpenSliderDialog?: () => void;
  onAddSolid?: (type: any) => void;
  className?: string;
  showHeader?: boolean;
}

export function AlgebraView({
  solids = [],
  onSelectSolid,
  selectedSolidId,
  onDeleteSolid,
  onOpenFunctionDialog,
  onOpenSliderDialog,
  onAddSolid,
  className = '',
  showHeader = true,
}: AlgebraViewProps) {
  const {
    objects,
    selectedObjectId,
    selectedObjectIds,
    setSelectedObjectIds,
    updateObject,
    deleteObject,
    handleSliderChange,
    setSliderSettingsId,
    setSliderValues,
    viewport,
    styleSettings,
    commit,
  } = useWorkspace();

  const sliders = useMemo(() => objects.filter((o): o is SliderObject => o.type === 'slider'), [objects]);
  const animatingPoints = useMemo(
    () =>
      objects.filter(
        (o) => o.type === 'point' && (o as PointObject).animating && (o as PointObject).onObjectId
      ) as PointObject[],
    [objects]
  );
  const { isPlaying: sliderPlaying, toggle: toggleSliderPlayback } = useSliderPlayback({
    sliders,
    animatingPoints,
    allObjects: objects,
    onValues: setSliderValues,
  });

  const [inputVal, setInputVal] = useState('');
  const [filterText, setFilterText] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [commandFeedback, setCommandFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Semantic and lexical autocomplete suggestions
  const meaning = useSemanticCommands(inputVal, isInputFocused);
  const lexicalSuggestions = useMemo(
    () =>
      searchCommands(inputVal, {
        examples: [
          'A = (3, 4)',
          'B = (5, 2)',
          'f(x) = x^2 + 1',
          'g(x) = sin(x)',
          'a = 3',
          'b = 2',
          'x^2 + y^2 = 25',
          'CanlandırmayıBaşlat[true]',
          'StartAnimation[true]',
          'DeğerAta[a, 5]',
          'İzBırak[A, true]',
        ],
        labels: objects.map((o) => o.label),
      }),
    [inputVal, objects]
  );
  const interpretations = meaning.matches
    .filter((m) => m.score >= 0.55 && m.score >= meaning.matches[0].score - 0.1)
    .map((match) => interpretSemanticMatch(inputVal, match, objects, selectedObjectIds));
  const semanticSuggestions: CommandSuggestion[] = interpretations.flatMap((item) =>
    item.command ? [{ text: item.command, kind: 'semantic' as const }] : []
  );
  const suggestions = [...semanticSuggestions, ...lexicalSuggestions]
    .filter((item, index, all) => all.findIndex((other) => normalizeCommand(other.text) === normalizeCommand(item.text)) === index)
    .slice(0, 5);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const executeCommand = (cmdText: string) => {
    const raw = cmdText.trim();
    if (!raw) return;

    const plan = executeTurkishCommand(raw, objects, selectedObjectIds, { viewport, styleSettings });
    if (!plan.ok) {
      setCommandFeedback({ ok: false, message: plan.message });
      return;
    }

    // Komut sahneyi değiştiriyorsa UYGULA. Eskiden yalnız "başarılı" yazılıyor, çizim değişmiyordu.
    if (plan.sceneChanged) {
      commit(plan.objects, `Komut: ${raw}`);
      if (plan.selectedIds) setSelectedObjectIds(plan.selectedIds);
    }

    if (plan.actions && plan.actions.length > 0) {
      for (const act of plan.actions) {
        if (act.kind === 'playback') {
          if (act.mode === 'play' && !sliderPlaying) toggleSliderPlayback();
          else if (act.mode === 'stop' && sliderPlaying) toggleSliderPlayback();
          else if (act.mode === 'toggle') toggleSliderPlayback();
        }
      }
    }

    setInputVal('');
    setActiveSuggestion(-1);
    setCommandFeedback({ ok: true, message: plan.message });
    setTimeout(() => setCommandFeedback(null), 3500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
        executeCommand(suggestions[activeSuggestion].text);
      } else {
        executeCommand(inputVal);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setIsInputFocused(false);
      setActiveSuggestion(-1);
    }
  };

  // Nesne satırları MEB yazımıyla yazılır (|AB| = 5 br, m(ABC^) = 60°, A(ABC) = 6 br²):
  // adlar yalnızca GÖRÜNEN nokta adlarından kurulur, kurallar tuvalle ortaktır (panelYazimlari.ts).
  const nokta = useMemo(() => nesnedenNokta(objects), [objects]);
  // Panel HER ZAMAN tam yazımdadır: "Yalnızca değer" ayarı yalnızca tuval etiketlerini seyreltir.
  const yazim = useMemo(() => panelYazimi(styleSettings), [styleSettings]);

  /** Nesne türüne göre listede görünen kısa ad (nesnenin kendi etiketi yoksa). */
  const VARSAYILAN_BASLIK: Partial<Record<MathObject['type'], string>> = {
    point: 'Nokta', segment: 's', line: 'd', ray: 'r', circle: 'c', ellipse: 'e',
    angle: 'α', polygon: 'Çokgen', arc: 'Yay', sector: 'Dilim', measurement: 'Ölçüm',
  };

  // Format single math object expression
  const formatObjectExpression = (obj: MathObject): { header: string; ana: PanelSatiri; ek?: PanelSatiri } => {
    const header = obj.label || VARSAYILAN_BASLIK[obj.type] || obj.type;
    switch (obj.type) {
      case 'point': {
        const pt = obj as PointObject;
        return { header, ana: metinSatiri(formatCoordinate({ x: pt.x, y: pt.y })) };
      }
      case 'slider': {
        const s = obj as SliderObject;
        return {
          header: s.variableName || s.label,
          ana: metinSatiri(`${formatTurkishNumber(s.value)}`),
          ek: metinSatiri(`[${formatTurkishNumber(s.min)} .. ${formatTurkishNumber(s.max)}]`),
        };
      }
      case 'function': {
        const fn = obj as FunctionObject;
        return { header, ana: metinSatiri(`y = ${(fn as FunctionObject).expression}`) };
      }
      case 'line': {
        const line = obj as LineObject;
        const p1 = nokta(line.point1Id);
        const p2 = nokta(line.point2Id);
        return { header, ana: metinSatiri(p1 && p2 ? calculateLineEquation(p1, p2).equationText : 'Doğru') };
      }
      case 'circle': {
        // Merkez ve yarıçap cemberMerkezi'nden gelir: üç noktadan geçen çemberde de doğrudur (eskiden r = 0 yazıyordu).
        const circ = obj as CircleObject;
        const g = cemberMerkezi(circ, objects, nokta);
        const r = g?.radius ?? 0;
        const cx = formatTurkishNumber(g?.merkez.x ?? 0);
        const cy = formatTurkishNumber(g?.merkez.y ?? 0);
        return {
          header,
          ana: metinSatiri(`(x - ${cx})² + (y - ${cy})² = ${formatTurkishNumber(r * r)}`),
          ek: g ? olcuSatiri(yaricap(g.merkezNoktasi, g.yaricapNoktasi, r)) : undefined,
        };
      }
      case 'ellipse': {
        const satirlar = nesneSatirlari(obj, objects, nokta);
        return { header, ana: satirlar[2] ?? satirlar[0], ek: satirlar[0] };
      }
      default: {
        const satirlar = nesneSatirlari(obj, objects, nokta);
        return { header, ana: satirlar[0] ?? metinSatiri(obj.type), ek: satirlar[1] };
      }
    }
  };

  // Grouped objects
  const groups = useMemo(() => {
    const q = normalizeCommand(filterText);
    const filtered = objects.filter((o) => {
      if (!q) return true;
      const label = normalizeCommand(o.label || '');
      const type = normalizeCommand(o.type || '');
      return label.includes(q) || type.includes(q);
    });

    return [
      {
        key: 'sliders',
        title: 'Sürgüler (Değişkenler)',
        icon: Sliders,
        items: filtered.filter((o) => o.type === 'slider') as SliderObject[],
      },
      {
        key: 'points',
        title: 'Noktalar',
        icon: CircleDot,
        items: filtered.filter((o) => o.type === 'point') as PointObject[],
      },
      {
        key: 'functions',
        title: 'Fonksiyonlar & Eğriler',
        icon: Sparkles,
        items: filtered.filter((o) => o.type === 'function') as FunctionObject[],
      },
      {
        key: 'lines',
        title: 'Doğrular & Parçalar',
        icon: Layers,
        items: filtered.filter((o) => ['segment', 'line', 'ray'].includes(o.type)),
      },
      {
        key: 'conics',
        title: 'Çemberler & Konikler',
        icon: CircleDot,
        items: filtered.filter((o) => ['circle', 'ellipse', 'arc', 'sector'].includes(o.type)),
      },
      {
        key: 'polygons',
        title: 'Çokgenler',
        icon: Layers,
        items: filtered.filter((o) => o.type === 'polygon') as PolygonObject[],
      },
      {
        key: 'angles',
        title: 'Açılar',
        icon: Sparkles,
        items: filtered.filter((o) => o.type === 'angle') as AngleObject[],
      },
      {
        // Ölçümler (uzunluk, eğim, yay, trigonometrik oranlar) listede hiç görünmüyordu.
        key: 'measurements',
        title: 'Ölçümler',
        icon: Ruler,
        items: filtered.filter((o) => o.type === 'measurement'),
      },
      {
        key: 'solids',
        title: '3D Katı Cisimler',
        icon: Box,
        items: solids.filter((s) => {
          if (!q) return true;
          return normalizeCommand(s.name || '').includes(q) || normalizeCommand(s.type || '').includes(q);
        }),
      },
    ].filter((g) => g.items.length > 0);
  }, [objects, solids, filterText]);

  return (
    <div className={`flex flex-col h-full w-full bg-card/95 border-r border-border backdrop-blur-sm select-none overflow-hidden ${className}`}>
      {/* BAŞLIK & FİLTRE */}
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/80 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider uppercase text-foreground/90">CEBİR</span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/15 text-primary">
              {objects.length + solids.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Nesne ara..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-24 focus:w-36 transition-all h-6 px-2 text-[11px] rounded-md bg-background/80 border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60"
              />
              {filterText && (
                <button onClick={() => setFilterText('')} className="absolute right-1 text-muted-foreground hover:text-foreground">
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NESNE LİSTESİ (GEOGEBRA STYLE ALGEBRA VIEW) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-3">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-muted-foreground/70 space-y-2">
            <Box className="w-8 h-8 opacity-40" />
            <p className="text-xs">Henüz nesne yok.</p>
            <p className="text-[10px] text-muted-foreground/60">Aşağıdaki girdi çubuğuna örn. <span className="font-mono text-primary font-semibold">A=(3,4)</span> veya <span className="font-mono text-primary font-semibold">f(x)=x²+1</span> yazın.</p>
          </div>
        ) : (
          groups.map((grp) => {
            const isCollapsed = !!collapsedGroups[grp.key];
            const Icon = grp.icon;
            return (
              <div key={grp.key} className="space-y-1">
                {/* Grup Başlığı */}
                <button
                  onClick={() => toggleGroup(grp.key)}
                  className="flex items-center justify-between w-full px-2 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <Icon className="w-3.5 h-3.5 opacity-70" />
                    <span>{grp.title}</span>
                  </div>
                  <span className="text-[10px] opacity-60">({grp.items.length})</span>
                </button>

                {/* Grup Nesneleri */}
                {!isCollapsed && (
                  <div className="space-y-1 pl-1">
                    {grp.items.map((item) => {
                      if (grp.key === 'solids') {
                        const solid = item as Solid3DObject;
                        const isSelected = selectedSolidId === solid.id;
                        return (
                          <div
                            key={solid.id}
                            onClick={() => onSelectSolid?.(solid.id)}
                            className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-primary/15 border-primary/40 shadow-sm'
                                : 'bg-background/60 hover:bg-muted/50 border-border/40 hover:border-border'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-xs border border-ada-fildisi/30"
                                style={{ backgroundColor: solid.color || '#3b82f6' }}
                              />
                              <div className="truncate">
                                <span className="font-bold text-foreground mr-1.5">{solid.name}</span>
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  ({formatTurkishNumber(solid.position.x)}; {formatTurkishNumber(solid.position.y)}; {formatTurkishNumber(solid.position.z)})
                                </span>
                              </div>
                            </div>
                            {onDeleteSolid && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSolid(solid.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                                title="Sil"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      }

                      // 2D Math Object
                      const obj = item as MathObject;
                      const isSelected = selectedObjectIds.includes(obj.id);
                      const expr = formatObjectExpression(obj);
                      const isVisible = obj.visible !== false;
                      const sliderBound = obj.type === 'slider' && sliderIsBound(objects, obj.id);
                      const sliderLabel = obj.type === 'slider' ? sliderDisplay(objects, obj, yazimAyari(styleSettings)) : null;

                      return (
                        <div
                          key={obj.id}
                          onClick={() => {
                            setSelectedObjectIds([obj.id]);
                            if (obj.type === 'slider' && !sliderBound) setSliderSettingsId(obj.id);
                          }}
                          className={`group flex flex-col px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-primary/15 border-primary/40 shadow-sm'
                              : 'bg-background/60 hover:bg-muted/50 border-border/40 hover:border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {/* Görünürlük Düğmesi (GeoGebra Style Bubble) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateObject(obj.id, { visible: !isVisible } as Partial<MathObject>, true);
                                }}
                                className={`w-3.5 h-3.5 rounded-full shrink-0 border transition-all cursor-pointer ${
                                  isVisible
                                    ? 'shadow-xs scale-100'
                                    : 'border-muted-foreground/40 bg-transparent scale-90 opacity-40'
                                }`}
                                style={{
                                  backgroundColor: isVisible ? obj.color || '#3b82f6' : 'transparent',
                                  borderColor: obj.color || '#3b82f6',
                                }}
                                title={isVisible ? 'Gizle' : 'Göster'}
                              />

                              {/* Cebirsel İfade */}
                              <div className="truncate yazim-payi flex-1 flex items-baseline gap-1.5 leading-[1.45]">
                                {sliderLabel ? (
                                  <MatematikMetni dugumler={sliderLabel.nodes} title={sliderLabel.text} className="min-w-0 truncate yazim-payi py-0.5 font-semibold text-foreground text-[12px]" />
                                ) : (
                                  <>
                                    <MatematikMetni metin={expr.header} ayar={yazim} className="font-bold text-foreground text-[12px]" />
                                    <PanelOlcusu satir={expr.ana} ayar={yazim} metinSinifi="font-mono" className="text-[11px] text-foreground/85 font-medium truncate yazim-payi" />
                                  </>
                                )}
                                {expr.ek && <span className="text-[10px] text-muted-foreground truncate yazim-payi">(<PanelOlcusu satir={expr.ek} ayar={yazim} metinSinifi="font-mono" />)</span>}
                              </div>
                            </div>

                            {/* Sağ Eylemler (Ayarlar / Sil / Oynat) */}
                            <div className="flex items-center gap-1">
                              {obj.type === 'slider' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSliderSettingsId(obj.id);
                                  }}
                                  aria-label={`${sliderLabel?.name ?? expr.header} kaydırıcısı ayarları`}
                                  title={`${sliderLabel?.name ?? expr.header} kaydırıcısı ayarları`}
                                  className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                  <Sliders className="w-3 h-3" aria-hidden="true" />
                                </button>
                              )}
                              {obj.type === 'slider' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSliderPlayback();
                                  }}
                                  className="p-1 text-primary hover:bg-primary/20 rounded transition-colors"
                                  title={sliderPlaying ? 'Durdur' : 'Oynat'}
                                >
                                  {sliderPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteObject(obj.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity rounded"
                                title="Sil"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Sürgü için Mini Kaydırma Çubuğu */}
                          {obj.type === 'slider' && (
                            <div className="mt-1.5 pt-1 border-t border-border/30 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="range"
                                min={(obj as SliderObject).min}
                                max={(obj as SliderObject).max}
                                step={(obj as SliderObject).step}
                                value={(obj as SliderObject).value}
                                aria-label={`${sliderLabel?.name ?? expr.header} değeri`}
                                aria-valuetext={sliderLabel?.text}
                                onPointerDown={(e) => {
                                  if (sliderBound) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSliderSettingsId(obj.id);
                                }}
                                onKeyDown={(e) => {
                                  if (sliderBound || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' '].includes(e.key)) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSliderSettingsId(obj.id);
                                }}
                                onChange={(e) => {
                                  if (sliderBound) handleSliderChange(obj.id, parseFloat(e.target.value));
                                }}
                                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* GERİ BİLDİRİM BİLGİSİ */}
      {commandFeedback && (
        <div
          className={`px-3 py-1.5 text-[11px] font-medium border-t flex items-center gap-1.5 transition-all ${
            commandFeedback.ok ? 'bg-primary/10 text-primary border-primary/20' : 'bg-destructive/10 text-destructive border-destructive/20'
          }`}
        >
          <MatematikMetni metin={commandFeedback.message} ayar={yazim} className="truncate yazim-payi leading-[1.45]" />
        </div>
      )}

      {/* GİRDİ ÇUBUĞU (COMMAND / ALGEBRA INPUT BAR) */}
      <div className="relative border-t border-border bg-background p-2">
        {/* Öneri Listesi */}
        {isInputFocused && suggestions.length > 0 && (
          <div className="absolute bottom-full left-2 right-2 mb-1 bg-popover/98 border border-border shadow-xl rounded-xl overflow-hidden z-30 divide-y divide-border/40">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand(s.text);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                  idx === activeSuggestion ? 'bg-primary/15 text-primary font-bold' : 'text-foreground hover:bg-muted/60'
                }`}
              >
                <span className="font-mono text-[11px] truncate">{s.text}</span>
                <span className="text-[10px] text-muted-foreground opacity-70 uppercase tracking-wider">{s.kind === 'semantic' ? 'Anlam' : 'Örnek'}</span>
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-center gap-1.5">
          <span className="text-primary font-bold text-sm pl-1 font-mono">+</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Girdi: f(x)=x²+1, A=(3,4), x²+y²=25..."
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setActiveSuggestion(-1);
            }}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setTimeout(() => setIsInputFocused(false), 200)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-8 px-2.5 text-xs font-mono rounded-lg bg-muted/40 border border-border/80 focus:bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60 transition-all"
          />
          <button
            type="button"
            disabled={!inputVal.trim()}
            onClick={() => executeCommand(inputVal)}
            className="h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all cursor-pointer shrink-0 shadow-xs"
            title="Uygula (Enter)"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
