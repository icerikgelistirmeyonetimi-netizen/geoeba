'use client';

import React, { useState } from 'react';
import { exportPng, exportSvg, exportPdf, exportWord } from '@/utils/exportCanvas';
import { StylePanel } from '@/components/workspace/StylePanel';
import { useWorkspace } from '@/state/WorkspaceContext';
import {
  MathObject,
  PointObject,
  SegmentObject,
  LineObject,
  CircleObject,
  AngleObject,
  PolygonObject,
  SliderObject,
  FractionObject,
} from '@/types/math';
import {
  calculateDistance,
  calculateLineEquation,
} from '@/math/geometry';
import { formatTurkishNumber, formatCoordinate } from '@/math/coordinates';
import { noktaZ } from '@/math/zEkseni';
import { sliderIsBound } from '@/math/sliderBindings';
import { sliderDisplay } from '@/math/sliderDisplay';
import { metniCozumle, olcuDugumleri, yazimAyari } from '@/math/matematikYazimi';
import { nesnedenNokta } from '@/math/olcuYazimlari';
import { nesneSatirlari, panelYazimi } from '@/math/panelYazimlari';
import { MatematikMetni } from '@/components/workspace/MatematikMetni';
import { PanelOlcusu } from '@/components/workspace/PanelOlcusu';
import { YazimKopyala } from '@/components/workspace/YazimKopyala';
import {
  Settings,
  Trash2,
  Sliders,
  Grid,
  Maximize,
  Maximize2,
  Compass,
  Check,
  Download,
  LayoutGrid,
  Columns2,
  Box,
  Palette,
  ChevronDown,
  ChevronUp,
  X,
  Contrast,
  Magnet,
  Ruler,
} from 'lucide-react';

export type LayoutMode = 'default' | 'algebra_2d' | '2d_3d' | 'three_col' | 'algebra_3d' | '2d_only' | '3d_only';
export type PanelTab = 'ozellikler' | 'stil' | 'ayarlar';

interface PropertiesPanelProps {
  layoutMode?: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
  activeTab?: PanelTab;
  onTabChange?: (tab: PanelTab) => void;
  onClose?: () => void;
}

const COLOR_PRESETS = [
  '#2563eb', // Mavi
  '#0284c7', // Açık Mavi
  '#8b5cf6', // Mor
  '#ec4899', // Pembe
  '#ef4444', // Kırmızı
  '#f59e0b', // Turuncu
  '#10b981', // Yeşil
  '#6b7280', // Gri
];

export function PropertiesPanel({
  layoutMode = '2d_only',
  onLayoutModeChange,
  activeTab,
  onTabChange,
  onClose,
}: PropertiesPanelProps) {
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isStyleOpen, setIsStyleOpen] = useState(true);

  /** Sağ panel sekmesi: nesne/görünüm özellikleri mi, çalışma alanı ayarları mi? */
  const [localTab, setLocalTab] = useState<PanelTab>('ozellikler');
  const sekme = activeTab ?? localTab;
  const setSekme = (t: PanelTab) => {
    setLocalTab(t);
    onTabChange?.(t);
  };

  const [disaAktariliyor, setDisaAktariliyor] = useState<'png' | 'svg' | 'pdf' | 'word' | null>(null);
  const [disaAktarimHatasi, setDisaAktarimHatasi] = useState<string | null>(null);
  const {
    objects,
    selectedObjectId,
    viewport,
    updateObject,
    deleteObject,
    setViewport,
    handleSliderChange,
    setSliderSettingsId,
    recordHistory,
    styleSettings,
  } = useWorkspace();

  const selectedObject = objects.find((o) => o.id === selectedObjectId);
  const sliders = objects.filter((o) => o.type === 'slider') as SliderObject[];

  // Ölçüler tuvalle AYNI MEB yazımıyla yazılır; adlar yalnızca görünen nokta adlarından kurulur.
  const nokta = React.useMemo(() => nesnedenNokta(objects), [objects]);
  const yazim = React.useMemo(() => panelYazimi(styleSettings), [styleSettings]);

  /** Seçili nesnenin bütün ölçüleri, her biri kendi satırında (|AB| = 5 br, A(ABC) = 6 br², m(ABC^) = 60°). */
  const olcuKutusu = (obj: MathObject) => {
    const satirlar = nesneSatirlari(obj, objects, nokta);
    return (
      <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 border border-border/40">
        {satirlar.map((s, i) => (
          <PanelOlcusu
            key={i}
            satir={s}
            ayar={yazim}
            as="div"
            metinSinifi="font-mono"
            className="text-[13px] font-bold text-foreground leading-[1.45]"
          />
        ))}
        <YazimKopyala
          className="pt-1"
          satirlar={satirlar.map((s) => (s.tur === 'olcu' ? olcuDugumleri(s.olcu, yazim) : metniCozumle(s.metin, yazim)))}
        />
      </div>
    );
  };

  /**
   * Süren düzenlemelerin (sürgü sürükleme, etiket yazma) başlangıç durumunu tutar.
   * Anahtar -> düzenleme başlamadan önceki değerin metin özeti.
   * Böylece her tuş vuruşu / her sürgü adımı yerine, işlem bittiğinde
   * (bırakma, odak kaybı, Enter) TEK bir geçmiş adımı yazılır.
   */
  const pendingEditsRef = React.useRef<Record<string, string>>({});

  // Düzenleme başlat: yalnızca ilk değişiklikte önceki durumu kaydeder.
  const beginEdit = React.useCallback((key: string, snapshotBefore: string) => {
    if (pendingEditsRef.current[key] === undefined) {
      pendingEditsRef.current[key] = snapshotBefore;
    }
  }, []);

  // Düzenlemeyi bitir: gerçekten bir değişiklik olduysa tek bir geçmiş adımı yazar.
  const finishEdit = React.useCallback(
    (key: string, snapshotNow: string, description: string) => {
      const snapshotBefore = pendingEditsRef.current[key];
      if (snapshotBefore === undefined) return;
      delete pendingEditsRef.current[key];
      if (snapshotBefore !== snapshotNow) {
        recordHistory(description);
      }
    },
    [recordHistory]
  );

  /**
   * Range (sürgü) girişleri için bırakma olayları.
   * Fare + dokunma (onPointerUp), klavye ok tuşları (onKeyUp) ve
   * odak kaybı (onBlur) üçlüsü birlikte tüm etkileşim yollarını kapsar.
   */
  const sliderReleaseHandlers = React.useCallback(
    (key: string, snapshotNow: () => string, description: () => string) => {
      const finish = () => finishEdit(key, snapshotNow(), description());
      return { onPointerUp: finish, onKeyUp: finish, onBlur: finish };
    },
    [finishEdit]
  );

  // Seçim değişince yarım kalan düzenleme kayıtlarını temizle.
  React.useEffect(() => {
    pendingEditsRef.current = {};
  }, [selectedObjectId]);

  /** Tuvalin SVG düğümünü bulur (ekrandaki en geniş SVG çizim alanıdır). */
  const tuvaliBul = (): SVGSVGElement | null => {
    const hepsi = Array.from(document.querySelectorAll('svg'));
    if (hepsi.length === 0) return null;
    return hepsi.reduce((enGenis, cur) =>
      cur.getBoundingClientRect().width > enGenis.getBoundingClientRect().width ? cur : enGenis
    ) as SVGSVGElement;
  };

  const disaAktar = async (bicim: 'png' | 'svg' | 'pdf' | 'word') => {
    const svg = tuvaliBul();
    if (!svg) {
      setDisaAktarimHatasi('Çizim alanı bulunamadı.');
      return;
    }
    setDisaAktariliyor(bicim);
    setDisaAktarimHatasi(null);
    try {
      const baslik = 'GeoEBA Çizimi';
      if (bicim === 'png') await exportPng(svg, baslik);
      else if (bicim === 'svg') exportSvg(svg, baslik);
      else if (bicim === 'pdf') await exportPdf(svg, baslik);
      else await exportWord(svg, baslik);
    } catch (e) {
      // Sebebi göstermek şart: "başarısız oldu" tek başına ne kullanıcıya ne de
      // hata bildirimine yarıyor.
      const sebep = e instanceof Error ? e.message : String(e);
      setDisaAktarimHatasi(`Dışa aktarma başarısız: ${sebep}`);
      if (process.env.NODE_ENV !== 'production') console.error('Dışa aktarma hatası:', e);
    } finally {
      setDisaAktariliyor(null);
    }
  };

  const disaAktarimDugmeleri: { id: 'png' | 'svg' | 'pdf' | 'word'; etiket: string; ipucu: string; renk: string }[] = [
    { id: 'png', etiket: 'Görsel (PNG)', ipucu: 'Çizimi resim dosyası olarak indir', renk: 'text-ada-deniz dark:text-ada-vurgu' },
    { id: 'svg', etiket: 'Vektör (SVG)', ipucu: 'Kalitesi bozulmadan büyütülebilen vektör dosyası', renk: 'text-ada-lavanta' },
    { id: 'pdf', etiket: 'PDF', ipucu: 'Yazdırmaya hazır PDF belgesi', renk: 'text-ada-mercan' },
    { id: 'word', etiket: 'Word (.doc)', ipucu: 'Word ile açılıp düzenlenebilen belge', renk: 'text-ada-deniz-koyu dark:text-ada-vurgu' },
  ];

  return (
    <div className="w-full h-full bg-card p-4 space-y-4 overflow-y-auto select-none">
      {/* PANEL BAŞLIĞI & DARALTMA BUTONU */}
      <div className="flex items-center justify-between pb-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-ada-deniz dark:text-ada-vurgu" />
          <span className="text-sm font-black uppercase tracking-wider text-foreground">
            {sekme === 'ayarlar' || sekme === 'stil' ? 'Ayarlar' : 'Özellikler'}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {(sekme === 'ayarlar' || sekme === 'stil') && (
        <div className="flex flex-col gap-4 items-stretch text-xs">
          {/* 1. ARAPLAN RENGI */}
          <div className="space-y-2.5 p-3 rounded-2xl bg-muted/40 border border-border/70">
            <h3 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>Arkaplan Rengi</span>
            </h3>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {[
                { color: '#ffffff', name: 'Beyaz' },
                { color: '#f3e8ff', name: 'Lavanta' },
                { color: '#e0f2fe', name: 'Buz Mavisi' },
                { color: '#e6f4ea', name: 'Mint Yeşili' },
                { color: '#fef3c7', name: 'Pastel Sarı' },
                { color: '#ffedd5', name: 'Şeftali' },
                { color: '#ffe4e6', name: 'Pembe' },
              ].map((bg) => {
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
              {/* Özel renk seçici */}
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

          {/* 2. ÇİZİM VE METİN STİLİ */}
          <div className="space-y-2.5 p-3 rounded-2xl bg-muted/40 border border-border/70">
            <button
              type="button"
              onClick={() => setIsStyleOpen(!isStyleOpen)}
              className="flex items-center justify-between w-full cursor-pointer group"
            >
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-ada-mercan" />
                <span>Çizim ve Metin Stili</span>
              </h3>
              {isStyleOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </button>
            {isStyleOpen && (
              <div className="pt-1">
                <StylePanel />
              </div>
            )}
          </div>

          {/* 2. DİK AÇI STİLİ */}
          <div className="space-y-2.5 p-3 rounded-2xl bg-muted/40 border border-border/70">
            <h3 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>Dik Açı Stili</span>
            </h3>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
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

          {/* 3. NOKTA YAKALAMA (POINT SNAP) */}
          <div className="space-y-2.5 p-3 rounded-2xl bg-muted/40 border border-border/70">
            <h3 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span>Nokta Yakalama</span>
            </h3>
            <div className="pt-1">
              <select
                value={
                  !viewport.snapToGrid
                    ? 'off'
                    : viewport.pointSnapMode || 'snapToGrid'
                }
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
                className="w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-foreground text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
              >
                <option value="automatic">Otomatik</option>
                <option value="snapToGrid">Izgaraya Sıçra</option>
                <option value="fixedToGrid">Izgaraya Sabitli</option>
                <option value="off">Kapalı</option>
              </select>
            </div>
          </div>

          {/* 4. GÖRÜNÜM SEÇENEKLERİ */}
          <div className="space-y-2.5 p-3 rounded-[22px] bg-muted/40 border border-border/80 shadow-xs">
            <h3 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5 px-1">
              <Settings className="w-3.5 h-3.5 text-primary" />
              <span>Görünüm Seçenekleri</span>
            </h3>
            <div className="space-y-2 text-xs pt-1">
              <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                <div className="flex items-center gap-2.5">
                  <Grid className="w-4 h-4 text-ada-deniz dark:text-ada-vurgu" />
                  <span className="text-foreground font-bold">Izgara Çizgileri</span>
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

              <label
                className={`flex items-center justify-between p-2.5 rounded-2xl bg-card border cursor-pointer transition-all shadow-xs select-none ${
                  viewport.showAxes
                    ? 'border-primary/60 ring-2 ring-ring/30'
                    : 'border-border hover:border-primary/50'
                }`}
              >
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

              <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                <div className="flex items-center gap-2.5">
                  <Maximize className="w-4 h-4 text-ada-deniz dark:text-ada-vurgu" />
                  <span className="text-foreground font-bold">Nokta Koordinatları</span>
                </div>
                <input
                  type="checkbox"
                  checked={viewport.showCoordinates}
                  onChange={(e) =>
                    setViewport((prev) => ({ ...prev, showCoordinates: e.target.checked }))
                  }
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

              <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                <div className="flex items-center gap-2.5">
                  <div className="px-2 py-0.5 rounded-xl bg-ada-altin/15 border border-ada-altin/40 text-ada-altin text-[10px] font-black leading-tight text-center shrink-0">
                    I-<br />IV
                  </div>
                  <span className="text-foreground font-bold">Bölge İsimleri (1, 2, 3, 4. Bölge)</span>
                </div>
                <input
                  type="checkbox"
                  checked={viewport.showQuadrants ?? false}
                  onChange={(e) =>
                    setViewport((prev) => ({ ...prev, showQuadrants: e.target.checked }))
                  }
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

              <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                <div className="flex items-center gap-2.5">
                  <Contrast className="w-4 h-4 text-foreground" />
                  <span className="text-foreground font-bold">Siyah–Beyaz Mod</span>
                </div>
                <input
                  type="checkbox"
                  checked={viewport.blackWhite ?? false}
                  onChange={(e) =>
                    setViewport((prev) => ({ ...prev, blackWhite: e.target.checked }))
                  }
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
            </div>
          </div>
        </div>
      )}

      {sekme === 'ozellikler' && (
        <div className="flex flex-col gap-4 items-stretch">
          {/* 1. GÖRÜNÜM VE KOORDİNAT DÜZLEMİ AYARLARI */}
          <div className="space-y-2.5 p-3.5 rounded-[22px] bg-muted/40 border border-border/90 shadow-xs">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center justify-between w-full cursor-pointer group px-1"
            >
              <Settings className="w-4 h-4 text-ada-deniz dark:text-ada-vurgu shrink-0" />
              <div className="text-center font-black text-[11px] sm:text-xs text-foreground tracking-wider uppercase leading-snug">
                <div>GÖRÜNÜM VE KOORDİNAT</div>
                <div>DÜZLEMİ AYARLARI</div>
              </div>
              {isSettingsOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              )}
            </button>

            {isSettingsOpen && (
              <div className="space-y-2 text-xs pt-1">
                {/* 1. Izgara Çizgileri */}
                <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                  <div className="flex items-center gap-2.5">
                    <Grid className="w-4 h-4 text-ada-deniz dark:text-ada-vurgu" />
                    <span className="text-foreground font-bold">Izgara Çizgileri</span>
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

                {/* 2. Koordinat Eksenleri (x, y) */}
                <label
                  className={`flex items-center justify-between p-2.5 rounded-2xl bg-card border cursor-pointer transition-all shadow-xs select-none ${
                    viewport.showAxes
                      ? 'border-primary/60 ring-2 ring-ring/30'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
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

                {/* 3. Nokta Koordinatları */}
                <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                  <div className="flex items-center gap-2.5">
                    <Maximize className="w-4 h-4 text-ada-deniz dark:text-ada-vurgu" />
                    <span className="text-foreground font-bold">Nokta Koordinatları</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={viewport.showCoordinates}
                    onChange={(e) =>
                      setViewport((prev) => ({ ...prev, showCoordinates: e.target.checked }))
                    }
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

                {/* 4. Bölge İsimleri (1, 2, 3, 4. Bölge) */}
                <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                  <div className="flex items-center gap-2.5">
                    <div className="px-2 py-0.5 rounded-xl bg-ada-altin/15 border border-ada-altin/40 text-ada-altin text-[10px] font-black leading-tight text-center shrink-0">
                      I-<br />IV
                    </div>
                    <span className="text-foreground font-bold">Bölge İsimleri (1, 2, 3, 4. Bölge)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={viewport.showQuadrants ?? false}
                    onChange={(e) =>
                      setViewport((prev) => ({ ...prev, showQuadrants: e.target.checked }))
                    }
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

                {/* 5. Izgaraya Yapış (Snap) */}
                <label className="flex items-center justify-between p-2.5 rounded-2xl bg-card border border-border hover:border-primary/50 cursor-pointer transition-all shadow-xs select-none">
                  <div className="flex items-center gap-2.5">
                    <Magnet className="w-4 h-4 text-ada-deniz dark:text-ada-vurgu" />
                    <span className="text-foreground font-bold">Izgaraya Yapış (Snap)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={viewport.snapToGrid}
                    onChange={(e) => setViewport((prev) => ({ ...prev, snapToGrid: e.target.checked }))}
                    className="sr-only"
                  />
                  {viewport.snapToGrid ? (
                    <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-md border-2 border-border bg-card shrink-0" />
                  )}
                </label>
              </div>
            )}
          </div>

          {/* 2. GÖRÜNÜM DÜZENİ SEÇİCİ */}
          {onLayoutModeChange && (
            <div className="space-y-2.5 p-3 rounded-2xl bg-muted/40 border border-border/70">
              <button
                type="button"
                onClick={() => setIsLayoutOpen(!isLayoutOpen)}
                className="flex items-center justify-between w-full cursor-pointer group"
              >
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                  <span>Görünüm düzeni</span>
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                    {layoutMode === '2d_only'
                      ? '2D Grafik'
                      : layoutMode === '3d_only'
                      ? '3D Grafik'
                      : layoutMode === 'default'
                      ? 'Çoklu Görünüm'
                      : layoutMode === 'algebra_2d'
                      ? 'Cebir + 2D'
                      : layoutMode === '2d_3d'
                      ? '2D + 3D'
                      : layoutMode === 'three_col'
                      ? '3 Sütun'
                      : 'Cebir + 3D'}
                  </span>
                  {isLayoutOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </div>
              </button>

              {isLayoutOpen && (
                <div className="grid grid-cols-2 gap-1.5 text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => onLayoutModeChange('2d_only')}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      layoutMode === '2d_only'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                        : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] truncate">Sadece 2D</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onLayoutModeChange('default')}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      layoutMode === 'default'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                        : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] truncate">2D + Cebir/3D</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onLayoutModeChange('algebra_2d')}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      layoutMode === 'algebra_2d'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                        : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                    }`}
                  >
                    <Columns2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] truncate">Cebir + 2D</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onLayoutModeChange('2d_3d')}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      layoutMode === '2d_3d'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                        : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                    }`}
                  >
                    <Columns2 className="w-3.5 h-3.5 shrink-0 text-ada-vurgu" />
                    <span className="text-[11px] truncate">2D + 3D</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onLayoutModeChange('three_col')}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      layoutMode === 'three_col'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                        : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                    }`}
                  >
                    <Columns2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] truncate">3 Sütun</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onLayoutModeChange('algebra_3d')}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      layoutMode === 'algebra_3d'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                        : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                    }`}
                  >
                    <Columns2 className="w-3.5 h-3.5 shrink-0 text-ada-lavanta" />
                    <span className="text-[11px] truncate">Cebir + 3D</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onLayoutModeChange('3d_only')}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer col-span-2 ${
                      layoutMode === '3d_only'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                        : 'bg-card border-border/80 text-foreground hover:bg-muted font-medium'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5 shrink-0 text-ada-lavanta" />
                    <span className="text-[11px] truncate">Sadece 3D Grafik</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. ÇİZİMİ DIŞA AKTAR / ÇİZİMİ İNDİR */}
          <div className="space-y-2.5 p-3 rounded-2xl bg-muted/40 border border-border/70">
            <button
              type="button"
              onClick={() => setIsDownloadOpen(!isDownloadOpen)}
              className="flex items-center justify-between w-full cursor-pointer group"
            >
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>Çizimi indir</span>
              </h3>
              {isDownloadOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </button>

            {isDownloadOpen && (
              <div className="space-y-2 pt-1">
                {/* Siyah–beyaz mod: ekranda ne görünüyorsa indirilen dosya da öyle olur */}
                <label className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-card border border-border/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={viewport.blackWhite === true}
                    onChange={(e) => setViewport((prev) => ({ ...prev, blackWhite: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-primary cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-foreground">Siyah–beyaz mod</span>
                </label>
                <p className="text-[10px] text-muted-foreground leading-snug px-1">
                  {viewport.blackWhite
                    ? 'Çizim gri tonlamada; indirilen PNG, SVG, PDF ve Word dosyaları da siyah–beyaz olacak.'
                    : 'Açarsanız hem tuval hem de indirilen dosyalar renksiz (baskıya uygun) olur.'}
                </p>
                <div className="flex flex-col gap-2">
                  {disaAktarimDugmeleri.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => disaAktar(d.id)}
                      disabled={disaAktariliyor !== null}
                      title={d.ipucu}
                      className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-card hover:bg-muted border border-border/70 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${d.renk}`}
                    >
                      {disaAktariliyor === d.id ? (
                        <span className="text-[10px] font-semibold text-muted-foreground">Hazırlanıyor…</span>
                      ) : (
                        <span className="truncate">{d.etiket}</span>
                      )}
                    </button>
                  ))}
                </div>
                {disaAktarimHatasi && (
                  <p role="alert" className="text-[11px] text-destructive font-semibold">
                    {disaAktarimHatasi}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 4. SEÇİLİ NESNE BİLGİ VE ÖZELLİK PANELİ */}
          {selectedObject && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedObject.color || '#2563eb' }}
                  />
                  <h3 className="font-bold text-sm text-foreground truncate">
                    {selectedObject.label || 'Nesne Özellikleri'}
                  </h3>
                </div>
                <button
                  onClick={() => deleteObject(selectedObject.id)}
                  className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  title="Nesneyi Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* NOKTA ÖZELLİKLERİ */}
              {selectedObject.type === 'point' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/40">
                    <div className="text-muted-foreground font-medium">Koordinat:</div>
                    <div className="font-mono text-sm font-bold text-foreground">
                      {formatCoordinate(selectedObject as PointObject)}
                    </div>
                  </div>

                  {/* 3B yüksekliği (z): 2B görünüm üstten bakıştır; z yalnız 3B görünümde etkilidir */}
                  {(() => {
                    const pt = selectedObject as PointObject;
                    const z = noktaZ(pt);
                    const turetilmis = !!pt.construction || !!pt.onObjectId;
                    // 6 basamak: odaklanıp çıkmak z'yi yuvarlayıp sessizce değiştirmesin
                    const gosterim = formatTurkishNumber(z, 6);
                    const uygula = (input: HTMLInputElement) => {
                      const metin = input.value.trim();
                      // Metin değişmediyse hiçbir şey yazma (gösterim yuvarlaması z'yi bozmasın)
                      if (metin === gosterim) return;
                      const deger = Number(metin.replace(',', '.'));
                      // Boş ya da geçersiz giriş z'yi 0'a çekmez: alan eski değere döner
                      if (metin === '' || !Number.isFinite(deger)) {
                        input.value = gosterim;
                        return;
                      }
                      if (Math.abs(deger - z) < 1e-9) return;
                      updateObject(pt.id, { z: deger } as Partial<PointObject>);
                    };
                    return (
                      <div className="space-y-1">
                        <label htmlFor={`z-${pt.id}`} className="text-[11px] font-semibold text-muted-foreground">
                          Yükseklik (z, 3B görünüm)
                        </label>
                        {turetilmis ? (
                          <div className="font-mono text-xs text-foreground" title="Bu noktanın z'si kaynaklarından hesaplanır">
                            {formatTurkishNumber(z)} (kaynaklarından)
                          </div>
                        ) : (
                          <input
                            id={`z-${pt.id}`}
                            key={`z-${pt.id}-${z}`}
                            type="text"
                            inputMode="decimal"
                            defaultValue={gosterim}
                            onBlur={(e) => uygula(e.currentTarget)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') uygula(e.currentTarget);
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-input border border-border text-foreground text-xs font-mono focus:ring-1 focus:ring-primary outline-none"
                          />
                        )}
                      </div>
                    );
                  })()}

                  {/* Etiket Adı */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Etiket Adı</label>
                    <input
                      type="text"
                      value={selectedObject.label}
                      onChange={(e) => {
                        beginEdit(`label-${selectedObject.id}`, selectedObject.label);
                        updateObject(selectedObject.id, { label: e.target.value }, false);
                      }}
                      onBlur={() =>
                        finishEdit(
                          `label-${selectedObject.id}`,
                          selectedObject.label,
                          'Etiket güncellendi'
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          finishEdit(
                            `label-${selectedObject.id}`,
                            selectedObject.label,
                            'Etiket güncellendi'
                          );
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-input border border-border text-foreground text-xs focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              )}

              {/* DOĞRU PARÇASI ÖZELLİKLERİ */}
              {selectedObject.type === 'segment' && (() => {
                const seg = selectedObject as SegmentObject;

                return (
                  <div className="space-y-3 text-xs">
                    {olcuKutusu(seg)}

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-medium">Uzunluğu Göster</span>
                      <input
                        type="checkbox"
                        checked={seg.showLength ?? true}
                        onChange={(e) => updateObject(seg.id, { showLength: e.target.checked })}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* DOĞRU ÖZELLİKLERİ */}
              {selectedObject.type === 'line' && (() => {
                const line = selectedObject as LineObject;
                const p1 = objects.find((o) => o.id === line.point1Id) as PointObject;
                const p2 = objects.find((o) => o.id === line.point2Id) as PointObject;
                const eq = p1 && p2 ? calculateLineEquation(p1, p2) : null;

                return (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/40">
                      <div className="text-muted-foreground font-medium">Doğru Denklemi:</div>
                      <div className="font-mono text-sm font-bold text-foreground">
                        {eq?.equationText || 'y = mx + n'}
                      </div>
                      {eq?.slope !== null && eq?.slope !== undefined && (
                        <div className="text-muted-foreground text-[11px]">
                          Eğim (m): <span className="font-bold text-foreground">{formatTurkishNumber(eq.slope)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ÇEMBER ÖZELLİKLERİ */}
              {selectedObject.type === 'circle' && (() => {
                const circ = selectedObject as CircleObject;
                const center = objects.find((o) => o.id === circ.centerPointId) as PointObject;
                let radius = circ.fixedRadius ?? 0;
                if (circ.radiusPointId) {
                  const rPoint = objects.find((o) => o.id === circ.radiusPointId) as PointObject;
                  if (center && rPoint) radius = calculateDistance(center, rPoint);
                }

                return (
                  <div className="space-y-3 text-xs">
                    {olcuKutusu(circ)}

                    <div className="p-3 bg-muted/30 rounded-xl space-y-2 border border-border/50">
                      <span className="text-[11px] font-bold text-muted-foreground">Yarıçapı Ayarla</span>

                      {/* Canlı Yarıçap Ayarı */}
                      <div className="space-y-1 pt-1">
                        <input
                          type="range"
                          min="0.5"
                          max="15"
                          step="0.5"
                          value={radius}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            beginEdit(`circle-radius-${circ.id}`, String(radius));
                            if (circ.fixedRadius !== undefined) {
                              updateObject(circ.id, { fixedRadius: val }, false);
                            } else if (circ.radiusPointId && center) {
                              const rPoint = objects.find((o) => o.id === circ.radiusPointId) as PointObject;
                              if (rPoint) {
                                const curDist = calculateDistance(center, rPoint) || 1;
                                const ratio = val / curDist;
                                const nx = Number((center.x + (rPoint.x - center.x) * ratio).toFixed(2));
                                const ny = Number((center.y + (rPoint.y - center.y) * ratio).toFixed(2));
                                updateObject(rPoint.id, { x: nx, y: ny }, false);
                              }
                            } else {
                              updateObject(circ.id, { fixedRadius: val }, false);
                            }
                          }}
                          {...sliderReleaseHandlers(
                            `circle-radius-${circ.id}`,
                            () => String(radius),
                            () => `Yarıçap ${formatTurkishNumber(radius)} br olarak ayarlandı`
                          )}
                          className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* ÇOKGEN ÖZELLİKLERİ & EN/BOY AYARI */}
              {selectedObject.type === 'polygon' && (() => {
                const poly = selectedObject as PolygonObject;
                const polyPoints = poly.pointIds
                  .map((id) => objects.find((o) => o.id === id) as PointObject)
                  .filter(Boolean);

                const xs = polyPoints.map((p) => p.x);
                const ys = polyPoints.map((p) => p.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);
                const curW = Number(Math.max(0.1, maxX - minX).toFixed(1));
                const curH = Number(Math.max(0.1, maxY - minY).toFixed(1));
                const cx = (minX + maxX) / 2;
                const cy = (minY + maxY) / 2;

                const resizeKey = `polygon-size-${poly.id}`;
                const sizeSnapshot = () => `${curW}x${curH}`;

                const handleResize = (newW: number, newH: number) => {
                  beginEdit(resizeKey, sizeSnapshot());
                  const scaleX = newW / curW;
                  const scaleY = newH / curH;
                  polyPoints.forEach((p) => {
                    const nx = Number((cx + (p.x - cx) * scaleX).toFixed(2));
                    const ny = Number((cy + (p.y - cy) * scaleY).toFixed(2));
                    updateObject(p.id, { x: nx, y: ny }, false);
                  });
                };

                const isSquare = Math.abs(curW - curH) < 0.2 && polyPoints.length === 4;

                const resizeRelease = (description: () => string) =>
                  sliderReleaseHandlers(resizeKey, sizeSnapshot, description);

                return (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 border border-border/40">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Köşe Sayısı:</span>
                        <span className="font-bold text-foreground">{polyPoints.length}</span>
                      </div>
                      {nesneSatirlari(poly, objects, nokta).map((s, i) => (
                        <PanelOlcusu key={i} satir={s} ayar={yazim} as="div" metinSinifi="font-mono" className="text-[13px] font-bold text-foreground leading-[1.45]" />
                      ))}
                    </div>

                    {/* En / Boy / Kenar Boyutlandırma Kontrolleri */}
                    <div className="p-3 bg-muted/30 rounded-xl space-y-3 border border-border/50">
                      <div className="font-black text-foreground text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Ruler className="w-3.5 h-3.5 text-primary" />
                          Boyutları Ayarla
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{formatTurkishNumber(curW)} x {formatTurkishNumber(curH)} br</span>
                      </div>

                      {isSquare ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground font-semibold">Kenar Uzunluğu:</span>
                            <span className="font-mono font-bold text-primary">{formatTurkishNumber(curW)} br</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="20"
                            step="0.5"
                            value={curW}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleResize(val, val);
                            }}
                            {...resizeRelease(
                              () => `Kenar uzunluğu ${formatTurkishNumber(curW)} br olarak ayarlandı`
                            )}
                            className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground font-semibold">Genişlik (En):</span>
                              <span className="font-mono font-bold text-primary">{formatTurkishNumber(curW)} br</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="25"
                              step="0.5"
                              value={curW}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                handleResize(val, curH);
                              }}
                              {...resizeRelease(
                                () =>
                                  `Şekil ${formatTurkishNumber(curW)} x ${formatTurkishNumber(curH)} br olarak boyutlandırıldı`
                              )}
                              className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground font-semibold">Yükseklik (Boy):</span>
                              <span className="font-mono font-bold text-primary">{formatTurkishNumber(curH)} br</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="25"
                              step="0.5"
                              value={curH}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                handleResize(curW, val);
                              }}
                              {...resizeRelease(
                                () =>
                                  `Şekil ${formatTurkishNumber(curW)} x ${formatTurkishNumber(curH)} br olarak boyutlandırıldı`
                              )}
                              className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* AÇI ÖZELLİKLERİ */}
              {selectedObject.type === 'angle' && (() => {
                const ang = selectedObject as AngleObject;
                return <div className="space-y-3 text-xs">{olcuKutusu(ang)}</div>;
              })()}

              {/* YAY / DAİRE DİLİMİ / ELİPS ÖLÇÜLERİ */}
              {(selectedObject.type === 'arc' || selectedObject.type === 'sector' || selectedObject.type === 'ellipse') && (
                <div className="space-y-3 text-xs">{olcuKutusu(selectedObject)}</div>
              )}

              {/* ÖLÇÜM NESNESİ (uzunluk, eğim, yay, trigonometrik oranlar) */}
              {selectedObject.type === 'measurement' && (
                <div className="space-y-3 text-xs">{olcuKutusu(selectedObject)}</div>
              )}

              {/* KESİR MODELİ ÖZELLİKLERİ */}
              {selectedObject.type === 'fraction' && (() => {
                const frac = selectedObject as FractionObject;
                const num = frac.numerator ?? 1;
                const den = frac.denominator ?? 1;
                const decimalVal = den > 0 ? formatTurkishNumber(num / den, 2) : '0';
                const percentVal = den > 0 ? Math.round((num / den) * 100) : 0;

                const getFracType = () => {
                  if (num === 1 && den > 1) return 'Birim Kesir';
                  if (num < den) return 'Basit Kesir';
                  if (num === den) return 'Tam Kesir (1 Tam)';
                  return 'Bileşik Kesir';
                };

                const fractionKey = `fraction-${frac.id}`;
                const fractionSnapshot = () => `${num}/${den}`;

                const updateFraction = (newNum: number, newDen: number, record: boolean = true) => {
                  const clampedNum = Math.max(0, Math.min(30, newNum));
                  const clampedDen = Math.max(1, Math.min(30, newDen));
                  updateObject(
                    frac.id,
                    {
                      numerator: clampedNum,
                      denominator: clampedDen,
                      label: `${clampedNum}/${clampedDen} Kesir Modeli`,
                    },
                    record
                  );
                };

                const fractionRelease = sliderReleaseHandlers(
                  fractionKey,
                  fractionSnapshot,
                  () => `${num}/${den} kesrine güncellendi`
                );

                return (
                  <div className="space-y-4 text-xs">
                    {/* Kesir Kartı ve Matematiksel Değerler */}
                    <div className="p-3.5 bg-ada-lavanta/15 rounded-2xl border border-ada-lavanta/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        {/* Görsel Kesir Çizgisi */}
                        <div className="flex flex-col items-center justify-center font-mono font-black text-lg text-ada-deniz-koyu dark:text-ada-kum leading-tight">
                          <span>{num}</span>
                          <div className="w-8 h-0.5 bg-ada-deniz-koyu dark:bg-ada-kum my-0.5 rounded-full" />
                          <span>{den}</span>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="font-bold text-xs text-foreground">
                            = {decimalVal} <span className="text-muted-foreground font-normal">({percentVal}%)</span>
                          </div>
                          <div className="inline-block px-2 py-0.5 rounded-md bg-ada-lavanta/25 text-ada-deniz-koyu dark:text-ada-kum text-[10px] font-bold">
                            {getFracType()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pay ve Payda Sürgüleri */}
                    <div className="p-3 bg-muted/40 rounded-2xl space-y-4 border border-border/50">
                      {/* PAY SÜRGÜSÜ */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-foreground">Pay (Taranan Parça):</span>
                          <span className="font-mono font-black text-ada-lavanta text-sm">
                            {num}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateFraction(num - 1, den)}
                            className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center font-black hover:bg-muted cursor-pointer transition-colors shadow-sm"
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min="0"
                            max={Math.max(den, 20)}
                            step="1"
                            value={num}
                            onChange={(e) => {
                              beginEdit(fractionKey, fractionSnapshot());
                              updateFraction(parseInt(e.target.value) || 0, den, false);
                            }}
                            {...fractionRelease}
                            className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <button
                            onClick={() => updateFraction(num + 1, den)}
                            className="w-7 h-7 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center font-black cursor-pointer transition-colors shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* PAYDA SÜRGÜSÜ */}
                      <div className="space-y-1.5 pt-2 border-t border-border/40">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-foreground">Payda (Toplam Parça):</span>
                          <span className="font-mono font-black text-ada-lavanta text-sm">
                            {den}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateFraction(num, den - 1)}
                            className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center font-black hover:bg-muted cursor-pointer transition-colors shadow-sm"
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min="1"
                            max="24"
                            step="1"
                            value={den}
                            onChange={(e) => {
                              beginEdit(fractionKey, fractionSnapshot());
                              updateFraction(num, parseInt(e.target.value) || 1, false);
                            }}
                            {...fractionRelease}
                            className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <button
                            onClick={() => updateFraction(num, den + 1)}
                            className="w-7 h-7 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center font-black cursor-pointer transition-colors shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sık Kullanılan Kesir Şablonları */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Hızlı Kesir Şablonları
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { n: 1, d: 1 },
                          { n: 1, d: 2 },
                          { n: 1, d: 3 },
                          { n: 2, d: 3 },
                          { n: 1, d: 4 },
                          { n: 3, d: 4 },
                          { n: 2, d: 5 },
                          { n: 5, d: 8 },
                        ].map((item) => (
                          <button
                            key={`preset-${item.n}-${item.d}`}
                            onClick={() => updateFraction(item.n, item.d)}
                            className={`py-1 px-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              num === item.n && den === item.d
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-muted/60 hover:bg-muted text-foreground border-border/80'
                            }`}
                          >
                            {item.n}/{item.d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Renk Seçimi */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <label className="text-[11px] font-semibold text-muted-foreground">Renk</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PRESETS.map((col) => (
                    <button
                      key={col}
                      onClick={() => updateObject(selectedObject.id, { color: col })}
                      className="w-5 h-5 rounded-full border border-ada-murekkep/15 flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: col }}
                    >
                      {selectedObject.color === col && <Check className="w-3 h-3 text-ada-fildisi" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. DİNAMİK KAYDIRICILAR (Varsa) */}
          {sliders.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>Parametre Kaydırıcıları</span>
              </div>

              <div className="space-y-3">
                {sliders.map((s) => {
                  const label = sliderDisplay(objects, s, yazimAyari(styleSettings));
                  return (
                  <div key={s.id} className="p-3 bg-muted/40 rounded-xl border border-border/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <button type="button" onClick={() => setSliderSettingsId(s.id)} className="flex items-center gap-1 text-foreground hover:text-primary" aria-label={`${label.name} kaydırıcısı ayarları`} title={`${label.name} kaydırıcısı ayarları`}>
                        <MatematikMetni dugumler={label.nodes} /> <Settings className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      </button>
                    </div>
                    <input
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={s.value}
                      aria-label={`${label.name} değeri`}
                      aria-valuetext={label.text}
                      onPointerDown={(e) => {
                        if (!sliderIsBound(objects, s.id)) { e.preventDefault(); setSliderSettingsId(s.id); }
                      }}
                      onKeyDown={(e) => {
                        if (!sliderIsBound(objects, s.id) && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                          e.preventDefault(); setSliderSettingsId(s.id);
                        }
                      }}
                      onChange={(e) => {
                        if (!sliderIsBound(objects, s.id)) return;
                        beginEdit(`slider-${s.id}`, String(s.value));
                        handleSliderChange(s.id, parseFloat(e.target.value));
                      }}
                      {...sliderReleaseHandlers(
                        `slider-${s.id}`,
                        () => String(s.value),
                        () => `${s.variableName} = ${formatTurkishNumber(s.value)} olarak değiştirildi`
                      )}
                      className="w-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{s.min}</span>
                      <span>{s.max}</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
