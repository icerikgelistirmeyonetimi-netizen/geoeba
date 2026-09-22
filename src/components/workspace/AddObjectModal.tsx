'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import {
  PointObject,
  SegmentObject,
  CircleObject,
  PolygonObject,
  AngleObject,
} from '@/types/math';
import { Point3D, Solid3DType } from '@/types/workspace3d';
import { generateNextPointLabel } from '@/math/geometry';
import { createId } from '@/state/ids';
import { formatTurkishNumber } from '@/math/coordinates';
import { validateMathExpression } from '@/math/parser';
import { functionNameOwner, nextFunctionName } from '@/math/functionNames';
import { Modal } from '@/components/ui/Modal';
import {
  X,
  Hash,
  MoveRight,
  Circle as CircleIcon,
  Triangle,
  Square,
  Sigma,
  Box,
  Cylinder,
  Cone,
  Pyramid,
  AlertCircle,
} from 'lucide-react';

export interface SolidDimensions {
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
}

interface AddObjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  is3D?: boolean;
  onAddSolid3D?: (type: SolidType, dims?: SolidDimensions, pos?: Point3D) => void;
}

export type SolidType = Solid3DType;

type Tab2D = 'point' | 'segment' | 'circle' | 'disk' | 'triangle' | 'square' | 'rectangle' | 'angle' | 'function';
type Tab3D = 'cube' | 'sphere' | 'cylinder' | 'prism' | 'triangular_prism' | 'cone' | 'pyramid';
type TabType = Tab2D | Tab3D;

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  dimension: '2D' | '3D';
  defaultName: string;
}

const TABS: TabItem[] = [
  { id: 'point', label: 'Nokta', icon: <Hash className="w-4 h-4" />, dimension: '2D', defaultName: 'A' },
  { id: 'segment', label: 'Doğru parçası', icon: <MoveRight className="w-4 h-4" />, dimension: '2D', defaultName: 'd1' },
  { id: 'circle', label: 'Çember', icon: <CircleIcon className="w-4 h-4" />, dimension: '2D', defaultName: 'cember1' },
  { id: 'disk', label: 'Daire', icon: <CircleIcon className="w-4 h-4" />, dimension: '2D', defaultName: 'daire1' },
  { id: 'triangle', label: 'Üçgen', icon: <Triangle className="w-4 h-4" />, dimension: '2D', defaultName: 'ucgen1' },
  { id: 'square', label: 'Kare', icon: <Square className="w-4 h-4" />, dimension: '2D', defaultName: 'kare1' },
  { id: 'rectangle', label: 'Dikdörtgen', icon: <Square className="w-4 h-4" />, dimension: '2D', defaultName: 'dikdortgen1' },
  { id: 'angle', label: 'Açı', icon: <Sigma className="w-4 h-4" />, dimension: '2D', defaultName: 'alfa' },
  { id: 'function', label: 'Fonksiyon', icon: <span className="font-serif font-bold text-xs">f</span>, dimension: '2D', defaultName: 'f' },
  { id: 'cube', label: 'Küp', icon: <Box className="w-4 h-4" />, dimension: '3D', defaultName: 'kup1' },
  { id: 'sphere', label: 'Küre', icon: <CircleIcon className="w-4 h-4" />, dimension: '3D', defaultName: 'kure1' },
  { id: 'cylinder', label: 'Silindir', icon: <Cylinder className="w-4 h-4" />, dimension: '3D', defaultName: 'silindir1' },
  { id: 'prism', label: 'Dikdörtgenler Prizması', icon: <Box className="w-4 h-4" />, dimension: '3D', defaultName: 'prizma1' },
  { id: 'triangular_prism', label: 'Üçgen Prizma', icon: <Triangle className="w-4 h-4" />, dimension: '3D', defaultName: 'ucgenprizma1' },
  { id: 'cone', label: 'Koni', icon: <Cone className="w-4 h-4" />, dimension: '3D', defaultName: 'koni1' },
  { id: 'pyramid', label: 'Kare Piramit', icon: <Pyramid className="w-4 h-4" />, dimension: '3D', defaultName: 'piramit1' },
];

const DEFAULT_TAB_2D: TabType = 'disk';
const DEFAULT_TAB_3D: TabType = 'cube';

const INPUT_CLASS =
  'w-full px-4 py-2.5 rounded-2xl bg-muted border border-border text-foreground text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none font-mono';

const LABEL_CLASS = 'text-xs font-black text-foreground';

/** "-1,5" / "-1.5" gibi ham metni sayıya çevirir; geçersizse null. */
function parseNumberInput(raw: string): number | null {
  const n = parseFloat(raw.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const fmt = (n: number) => formatTurkishNumber(n, 2);

export function AddObjectModal({ isOpen, onClose, is3D = false, onAddSolid3D }: AddObjectModalProps) {
  const { addObject, addObjects, addFunction, objects } = useWorkspace();
  const [selectedTab, setSelectedTab] = useState<TabType>(is3D ? DEFAULT_TAB_3D : DEFAULT_TAB_2D);

  // Form Değerleri (ham metin; gönderimde ayrıştırılır)
  const [name, setName] = useState('daire1');
  const [startX, setStartX] = useState('1');
  const [startY, setStartY] = useState('1');
  const [startZ, setStartZ] = useState('0');
  const [radius, setRadius] = useState('2');
  const [width, setWidth] = useState('4');
  const [height, setHeight] = useState('3');
  const [depth, setDepth] = useState('3');
  const [angleVal, setAngleVal] = useState('60');
  const [funcExpr, setFuncExpr] = useState('2*x + 1');
  const [error, setError] = useState<string | null>(null);

  const visibleTabs = useMemo(() => TABS.filter((t) => t.dimension === (is3D ? '3D' : '2D')), [is3D]);

  // Modal her açıldığında veya 2D/3D bağlamı değiştiğinde varsayılan sekmeye dön
  useEffect(() => {
    if (!isOpen) return;
    const defaultTab = is3D ? DEFAULT_TAB_3D : DEFAULT_TAB_2D;
    setSelectedTab(defaultTab);
    setName(TABS.find((t) => t.id === defaultTab)?.defaultName ?? '');
    setError(null);
  }, [isOpen, is3D]);

  const handleTabChange = (tab: TabItem) => {
    setSelectedTab(tab.id);
    // Fonksiyon adı boştaki sıradaki ad olur (f varsa g …)
    setName(tab.id === 'function' ? nextFunctionName(objects) : tab.defaultName);
    setError(null);
  };

  // Sayısal alanların "mevcut" değerleri (önizleme için, varsayılanlarla)
  const x = parseNumberInput(startX) ?? 0;
  const y = parseNumberInput(startY) ?? 0;
  const z = parseNumberInput(startZ) ?? 0;
  const r = parseNumberInput(radius) ?? 2;
  const w = parseNumberInput(width) ?? 4;
  const h = parseNumberInput(height) ?? 3;
  const d = parseNumberInput(depth) ?? 3;
  const ang = parseNumberInput(angleVal) ?? 60;

  const showsPosition = selectedTab !== 'function';
  const showsRadius = ['circle', 'disk', 'sphere', 'cylinder', 'cone'].includes(selectedTab);
  const showsWidth = ['segment', 'triangle', 'square', 'rectangle', 'cube', 'prism', 'triangular_prism', 'pyramid', 'angle'].includes(selectedTab);
  const showsHeight = ['segment', 'triangle', 'rectangle', 'cylinder', 'prism', 'triangular_prism', 'cone', 'pyramid'].includes(selectedTab);
  const showsDepth = selectedTab === 'prism' || selectedTab === 'triangular_prism';
  const widthLabel =
    selectedTab === 'square' || selectedTab === 'cube' || selectedTab === 'pyramid'
      ? 'Kenar'
      : selectedTab === 'segment'
        ? 'Δx (yatay uzunluk)'
        : selectedTab === 'angle'
          ? 'Kol Uzunluğu'
          : 'Genişlik';
  const heightLabel = selectedTab === 'segment' ? 'Δy (dikey uzunluk)' : 'Yükseklik';

  // Komut Önizlemesi
  const commandPreview = useMemo(() => {
    const p = (px: number, py: number) => `Nokta(${fmt(px)}; ${fmt(py)})`;
    switch (selectedTab) {
      case 'point':
        return `${name} = Nokta(${fmt(x)}; ${fmt(y)})`;
      case 'segment':
        return `${name}A = ${p(x, y)}\n${name}B = ${p(x + w, y + h)}\n${name} = DoğruParçası(${name}A, ${name}B)`;
      case 'circle':
        return `${name}M = ${p(x, y)}\n${name} = Çember(${name}M, r=${fmt(r)})`;
      case 'disk':
        return `${name}M = ${p(x, y)}\n${name} = Daire(${name}M, r=${fmt(r)})`;
      case 'triangle':
        return `${name} = Üçgen(${p(x, y)}, ${p(x + w, y)}, ${p(x + w / 2, y + h)})`;
      case 'square':
        return `${name} = Kare(Köşe=${p(x, y)}, Kenar=${fmt(w)})`;
      case 'rectangle':
        return `${name} = Dikdörtgen(Köşe=${p(x, y)}, Genişlik=${fmt(w)}, Yükseklik=${fmt(h)})`;
      case 'angle':
        return `${name} = Açı(Köşe=${p(x, y)}, ${fmt(ang)}°)`;
      case 'function':
        return `${name}(x) = ${funcExpr}`;
      case 'cube':
        return `${name} = Küp(Merkez=(${fmt(x)}; ${fmt(y)}; ${fmt(z)}), Kenar=${fmt(w)})`;
      case 'sphere':
        return `${name} = Küre(Merkez=(${fmt(x)}; ${fmt(y)}; ${fmt(z)}), Yarıçap=${fmt(r)})`;
      case 'cylinder':
        return `${name} = Silindir(Merkez=(${fmt(x)}; ${fmt(y)}; ${fmt(z)}), Yarıçap=${fmt(r)}, Yükseklik=${fmt(h)})`;
      case 'prism':
        return `${name} = Prizma(Merkez=(${fmt(x)}; ${fmt(y)}; ${fmt(z)}), a=${fmt(w)}, b=${fmt(d)}, h=${fmt(h)})`;
      case 'triangular_prism':
        return `${name} = ÜçgenPrizma(Merkez=(${fmt(x)}; ${fmt(y)}; ${fmt(z)}), Taban=${fmt(w)}, Derinlik=${fmt(d)}, h=${fmt(h)})`;
      case 'cone':
        return `${name} = Koni(Merkez=(${fmt(x)}; ${fmt(y)}; ${fmt(z)}), Yarıçap=${fmt(r)}, Yükseklik=${fmt(h)})`;
      case 'pyramid':
        return `${name} = KarePiramit(Merkez=(${fmt(x)}; ${fmt(y)}; ${fmt(z)}), Kenar=${fmt(w)}, Yükseklik=${fmt(h)})`;
      default:
        return `${name} = Nesne()`;
    }
  }, [selectedTab, name, x, y, z, r, w, h, d, ang, funcExpr]);

  // Nesneyi Çalışma Alanına Ekle
  const handleAdd = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Ad boş olamaz.');
      return;
    }

    // Girdi doğrulama
    if (showsPosition) {
      if (parseNumberInput(startX) === null || parseNumberInput(startY) === null || (is3D && parseNumberInput(startZ) === null)) {
        setError('Konum değerleri geçerli birer sayı olmalıdır.');
        return;
      }
    }
    if (showsRadius && (parseNumberInput(radius) === null || r <= 0)) {
      setError('Yarıçap sıfırdan büyük bir sayı olmalıdır.');
      return;
    }
    if (showsWidth && (parseNumberInput(width) === null || (selectedTab !== 'segment' && w <= 0))) {
      setError(`${widthLabel} geçerli bir sayı olmalıdır${selectedTab !== 'segment' ? ' (sıfırdan büyük)' : ''}.`);
      return;
    }
    if (showsHeight && (parseNumberInput(height) === null || (selectedTab !== 'segment' && h <= 0))) {
      setError(`${heightLabel} geçerli bir sayı olmalıdır${selectedTab !== 'segment' ? ' (sıfırdan büyük)' : ''}.`);
      return;
    }
    if (showsDepth && (parseNumberInput(depth) === null || d <= 0)) {
      setError('Derinlik sıfırdan büyük bir sayı olmalıdır.');
      return;
    }
    if (selectedTab === 'segment' && w === 0 && h === 0) {
      setError('Doğru parçasının iki ucu aynı noktada olamaz (Δx ve Δy birlikte sıfır olamaz).');
      return;
    }

    // 3D Cisimler: ölçüler üst bileşene iletilir
    if (['cube', 'sphere', 'cylinder', 'prism', 'triangular_prism', 'cone', 'pyramid'].includes(selectedTab)) {
      const dimsByType: Record<Tab3D, SolidDimensions> = {
        cube: { width: w, height: w, depth: w },
        sphere: { radius: r, width: r * 2, height: r * 2, depth: r * 2 },
        cylinder: { radius: r, height: h, width: r * 2, depth: r * 2 },
        prism: { width: w, height: h, depth: d },
        triangular_prism: { width: w, height: h, depth: d },
        cone: { radius: r, height: h, width: r * 2, depth: r * 2 },
        pyramid: { width: w, height: h, depth: w },
      };
      // Kullanıcının girdiği merkez konumu da iletilir (aksi halde otomatik ızgara konumu kullanılır).
      onAddSolid3D?.(selectedTab as Tab3D, dimsByType[selectedTab as Tab3D], { x, y, z });
      setError(null);
      onClose();
      return;
    }

    // 2D Nesneler
    if (selectedTab === 'function') {
      const expr = funcExpr.trim();
      const validation = validateMathExpression(expr);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }
      if (functionNameOwner(objects, trimmedName)) {
        setError(`“${trimmedName}” adı zaten kullanılıyor. Başka bir ad yazın (örn. ${nextFunctionName(objects)}).`);
        return;
      }
      addFunction(expr, `${trimmedName}(x) = ${expr}`);
      setError(null);
      onClose();
      return;
    }

    const base = Date.now();
    let seq = 0;
    // createdAt sırası korunsun diye artan sayaç; kimlikler createId ile üretilir.
    const nextCreatedAt = () => base + seq++;

    // Otomatik nokta etiketleri: mevcut etiketlerle çakışmayan sıradaki harfler
    const usedLabels = objects.filter((o) => o.type === 'point').map((o) => o.label);
    const nextLabel = () => {
      const label = generateNextPointLabel(usedLabels);
      usedLabels.push(label);
      return label;
    };

    const makePoint = (px: number, py: number, label: string, color: string): PointObject => ({
      id: createId('pt'),
      type: 'point',
      label,
      showLabel: true,
      isIndependent: true,
      x: Number(px.toFixed(2)),
      y: Number(py.toFixed(2)),
      color,
      visible: true,
      createdAt: nextCreatedAt(),
    });

    if (selectedTab === 'point') {
      addObject(makePoint(x, y, trimmedName, '#2563eb'), `${trimmedName} noktası eklendi`);
    } else if (selectedTab === 'segment') {
      const a = makePoint(x, y, nextLabel(), '#2563eb');
      const b = makePoint(x + w, y + h, nextLabel(), '#2563eb');
      const seg: SegmentObject = {
        id: createId('seg'),
        type: 'segment',
        label: trimmedName,
        showLabel: true,
        startPointId: a.id,
        endPointId: b.id,
        color: '#2563eb',
        visible: true,
        showLength: true,
        createdAt: nextCreatedAt(),
      };
      addObjects([a, b, seg], `${trimmedName} doğru parçası eklendi`);
    } else if (selectedTab === 'disk' || selectedTab === 'circle') {
      const center = makePoint(x, y, nextLabel(), '#2563eb');
      const circ: CircleObject = {
        id: createId('circ'),
        type: 'circle',
        label: trimmedName,
        showLabel: true,
        centerPointId: center.id,
        fixedRadius: r,
        color: '#8b5cf6',
        fillOpacity: selectedTab === 'disk' ? 0.12 : 0,
        visible: true,
        showArea: selectedTab === 'disk',
        createdAt: nextCreatedAt(),
      };
      addObjects([center, circ], `${trimmedName} eklendi`);
    } else if (selectedTab === 'triangle' || selectedTab === 'square' || selectedTab === 'rectangle') {
      const sideH = selectedTab === 'square' ? w : h;
      const corners: [number, number][] =
        selectedTab === 'triangle'
          ? [
              [x, y],
              [x + w, y],
              [x + w / 2, y + h],
            ]
          : [
              [x, y],
              [x + w, y],
              [x + w, y + sideH],
              [x, y + sideH],
            ];
      const pts = corners.map(([px, py]) => makePoint(px, py, nextLabel(), '#3b82f6'));
      const poly: PolygonObject = {
        id: createId('poly'),
        type: 'polygon',
        label: trimmedName,
        showLabel: true,
        pointIds: pts.map((p) => p.id),
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.15,
        visible: true,
        showArea: true,
        showPerimeter: true,
        createdAt: nextCreatedAt(),
      };
      addObjects([...pts, poly], `${trimmedName} eklendi`);
    } else if (selectedTab === 'angle') {
      const arm = w;
      const rad = (ang * Math.PI) / 180;
      const vertex = makePoint(x, y, nextLabel(), '#0ea5e9');
      const p1 = makePoint(x + arm, y, nextLabel(), '#0ea5e9');
      const p3 = makePoint(x + arm * Math.cos(rad), y + arm * Math.sin(rad), nextLabel(), '#0ea5e9');
      const angle: AngleObject = {
        id: createId('ang'),
        type: 'angle',
        label: trimmedName,
        showLabel: true,
        point1Id: p1.id,
        vertexPointId: vertex.id,
        point3Id: p3.id,
        showValue: true,
        color: '#0ea5e9',
        visible: true,
        createdAt: nextCreatedAt(),
      };
      addObjects([vertex, p1, p3, angle], `${trimmedName} açısı (${fmt(ang)}°) eklendi`);
    }

    setError(null);
    onClose();
  };

  const numberField = (
    id: string,
    label: string,
    value: string,
    setter: (v: string) => void
  ) => (
    <div className="space-y-1.5">
      <label className={LABEL_CLASS} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          setter(e.target.value);
          setError(null);
        }}
        className={INPUT_CLASS}
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="add-object-modal-title"
      overlayClassName="bg-ada-murekkep/60 backdrop-blur-sm animate-in fade-in duration-200"
      className="relative w-full max-w-2xl bg-card text-card-foreground rounded-[28px] shadow-2xl border border-border overflow-hidden flex flex-col select-none"
    >
      {/* Üst Başlık & Kapatma Butonu */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <h2 id="add-object-modal-title" className="text-xl font-black text-foreground tracking-tight">
          Nesne ekle {is3D ? '(3D)' : '(2D)'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          title="Kapat (Esc)"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Ana Gövde: Sol Sekmeler + Sağ Form */}
      <form
        className="flex flex-col sm:flex-row min-h-[420px]"
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
      >
        {/* Sol Sekmeler Listesi */}
        <div
          className="w-full sm:w-52 p-3 bg-muted/50 border-r border-border flex flex-row sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto max-h-[460px] scrollbar-thin shrink-0"
          role="tablist"
          aria-label="Nesne türleri"
        >
          {visibleTabs.map((tab) => {
            const isSelected = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleTabChange(tab)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-card text-primary shadow-sm border border-border'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {tab.icon}
                </div>
                <span className="font-extrabold">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sağ Form Parametre Alanı */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[min(460px,calc(100vh-11rem))] scrollbar-thin">
          {/* Ad Alanı */}
          <div className="space-y-1.5">
            <label className={LABEL_CLASS} htmlFor="add-object-name">
              Ad
            </label>
            <input
              id="add-object-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className={INPUT_CLASS}
              autoFocus
            />
          </div>

          <p className="text-[11px] font-semibold text-ada-deniz dark:text-ada-vurgu">
            {selectedTab === 'function'
              ? 'x değişkenine bağlı bir ifade girin; grafik tuvale çizilir.'
              : 'Kesin ölçüleri girin; gerekli noktalar otomatik oluşur. Ondalık için virgül veya nokta kullanabilirsiniz.'}
          </p>

          {/* Fonksiyon İfadesi */}
          {selectedTab === 'function' && (
            <div className="space-y-1.5">
              <label className={LABEL_CLASS} htmlFor="add-object-function">
                İfade — {name || 'f'}(x) =
              </label>
              <input
                id="add-object-function"
                type="text"
                value={funcExpr}
                onChange={(e) => {
                  setFuncExpr(e.target.value);
                  setError(null);
                }}
                placeholder="Örn: x^2 - 4, 2x + 1, sin(x)"
                className={INPUT_CLASS}
              />
              <p className="text-[10px] text-muted-foreground">sin(x) radyan, sind(x) derece; x², 2x ve x sin(x) yazımı desteklenir.</p>
            </div>
          )}

          {/* Konum */}
          {showsPosition && (
            <div className={`grid ${is3D ? 'grid-cols-3' : 'grid-cols-2'} gap-3 pt-1`}>
              {numberField('add-object-x', selectedTab === 'angle' ? 'Köşe x' : is3D ? 'Merkez x' : 'Başlangıç x', startX, setStartX)}
              {numberField('add-object-y', selectedTab === 'angle' ? 'Köşe y' : is3D ? 'Merkez y' : 'Başlangıç y', startY, setStartY)}
              {is3D && numberField('add-object-z', 'Merkez z', startZ, setStartZ)}
            </div>
          )}

          {/* Yarıçap */}
          {showsRadius && numberField('add-object-radius', 'Yarıçap', radius, setRadius)}

          {/* Ölçüler */}
          {(showsWidth || showsHeight || showsDepth) && (
            <div className={`grid ${showsDepth ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
              {showsWidth && numberField('add-object-width', widthLabel, width, setWidth)}
              {showsHeight && numberField('add-object-height', heightLabel, height, setHeight)}
              {showsDepth && numberField('add-object-depth', 'Derinlik', depth, setDepth)}
            </div>
          )}

          {/* Açı Ölçüsü */}
          {selectedTab === 'angle' && numberField('add-object-angle', 'Açı Ölçüsü (°)', angleVal, setAngleVal)}

          {/* Komut Önizleme Kutusu */}
          <div className="space-y-1.5 pt-2">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">KOMUT ÖNİZLEME</div>
            <div className="p-3.5 rounded-2xl bg-muted/60 border border-border font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              {commandPreview}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-1.5 text-[11px] font-semibold text-destructive" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Ekle Butonu: kaydırılan bölmenin altına yapışık, içerik uzasa da her zaman görünür */}
          <div className="sticky bottom-0 -mx-6 -mb-6 mt-2 border-t border-border bg-card/95 px-6 pb-4 pt-3 backdrop-blur">
            <button
              type="submit"
              className="w-full min-h-[44px] py-3.5 rounded-2xl bg-primary hover:bg-ada-deniz-koyu dark:hover:bg-ada-deniz text-primary-foreground font-black text-xs shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Ekle</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
