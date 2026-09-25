// Çalışma Alanı Araç ve Durum Tipleri

import { MathObject } from './math';
import { ACI_YAZIMLARI, OLCU_YAZIMLARI, type AciYazimi, type OlcuYazimi } from '@/math/matematikYazimi';

export type ToolMode =
  | 'select'
  | 'point'
  | 'segment'
  | 'line'
  | 'ray'
  | 'circle'
  | 'circle_radius'
  | 'circle_3points'
  | 'ellipse'
  | 'arc'
  | 'sector'
  | 'angle'
  | 'polygon'
  | 'square'
  | 'rectangle'
  | 'regular_polygon'
  // --- Klasik geometri inşaları ---
  | 'midpoint'
  | 'divide_ratio'
  | 'perp_bisector'
  | 'angle_bisector'
  | 'perpendicular'
  | 'parallel'
  | 'segment_length'
  | 'compass'
  | 'intersect'
  | 'translate'
  | 'measure_slope'
  | 'trig_ratios'
  | 'measure_arc'
  | 'checkbox'
  | 'button'
  | 'input_box'
  | 'pen'
  | 'measure_distance'
  | 'measure_angle'
  | 'measure_area'
  | 'measure_perimeter'
  | 'unit_measure'
  | 'area_model'
  | 'ruler'
  | 'setsquare'
  | 'rotate'
  | 'reflect'
  | 'symmetry'
  | 'fraction'
  | 'image'
  | 'text'
  | 'slider'
  | 'function'
  | 'delete'
  | 'pan';

export type LayoutMode = 'default' | 'algebra_2d' | '2d_3d' | 'three_col' | 'algebra_3d' | '2d_only' | '3d_only';

export interface ToolCategory {
  id: string;
  name: string;
  tools: {
    id: ToolMode;
    name: string;
    description: string;
    icon: string;
    shortcut?: string;
  }[];
}

export interface WorkspaceHistoryStep {
  objects: MathObject[];
  description: string; // Türkçe işlem açıklaması (Örn: "A noktası eklendi")
  timestamp: number;
}

export interface WorkspaceState {
  objects: MathObject[];
  selectedObjectId: string | null;
  activeTool: ToolMode;
  isDragging: boolean;
  draggedObjectId: string | null;
  pendingCreation: {
    tool: ToolMode;
    selectedPointIds: string[];
    previewCoordinates?: { x: number; y: number };
  };
  history: WorkspaceHistoryStep[];
  historyIndex: number;
}

/**
 * Çizim stili ayarları — sağ paneldeki "Stil" sekmesinden yönetilir.
 *
 * Ölçekler ÇARPAN olarak tutulur (1 = varsayılan); böylece yakınlaştırmadan bağımsız
 * olarak tüm çizim orantılı biçimde büyür veya küçülür. Ayrıntılı yazı ölçekleri
 * genel `fontScale` ile ÇARPILIR: genel ayar hepsini birden, ayrıntılı ayar tek bir
 * grubu değiştirir.
 */
export interface StyleSettings {
  /** Şekil çizgilerinin kalınlık çarpanı (0,5 – 3) */
  strokeScale: number;
  /** Tüm yazıların orantılı boyut çarpanı (0,6 – 2) */
  fontScale: number;
  /** Nokta / pivot işaretçisinin yarıçapı, piksel (3 – 14) */
  pointRadius: number;
  /** Ayrıntılı: nokta adları ve koordinatları */
  pointLabelScale: number;
  /** Ayrıntılı: ölçüm kutuları (uzunluk, alan, çevre, açı) */
  measurementScale: number;
  /** Ayrıntılı: eksen sayıları ve bölge etiketleri */
  axisScale: number;
  /**
   * Ölçüm etiketlerini arka plan kutusu içinde gösterir. Kapalıyken (varsayılan) yazılar kutusuz, tuval rengi
   * haleyle okunur. Eski kayıtlardaki hideLabelBoxes: false yalnızca eski varsayılandı; yeni ad sayesinde
   * bu kayıtlar da kutusuz açılır.
   */
  showLabelBoxes: boolean;
  /** Şekillerin iç dolgusunu kaldırır: yalnızca kenar çizgileri kalır. */
  hideFills: boolean;
  /** Ölçü yazımı: 'tam' = adıyla (|AB| = 5 br), 'kisa' = yalnızca değer (5 br). Yalnızca tuval etiketlerini etkiler. */
  olcuYazimi: OlcuYazimi;
  /** Açı yazımı: 'sapka' = m(ABC^) (MEB), 'isaret' = m(∠ABC). */
  aciYazimi: AciYazimi;
  /**
   * Uzunluk, açı, alan ve çevre TAM SAYI yazılır; alan ve çevre görünen tam sayılardan hesaplanır
   * (kullanıcı isteği, 2026-09-25: "hesaplamalarda tam sayıya göre olmalı ki hatalı sonuç almayalım").
   */
  tamSayiOlcu: boolean;
}

export const DEFAULT_STYLE_SETTINGS: StyleSettings = {
  strokeScale: 1,
  fontScale: 1,
  pointRadius: 6,
  pointLabelScale: 1,
  measurementScale: 1,
  axisScale: 1,
  showLabelBoxes: false,
  hideFills: false,
  olcuYazimi: 'tam',
  aciYazimi: 'sapka',
  tamSayiOlcu: true,
};

/** Metin (seçenek) alanlarının kabul edilen değerleri; kayıttan okurken ve proje dosyasında denetlenir. */
export const STYLE_SECENEKLERI: Partial<Record<keyof StyleSettings, readonly string[]>> = {
  olcuYazimi: OLCU_YAZIMLARI,
  aciYazimi: ACI_YAZIMLARI,
};

/** Stil ayarlarının tarayıcıda saklandığı anahtar. */
export const STYLE_STORAGE_KEY = 'geoeba_stil_ayarlari_v1';

/**
 * Kayıtlı stil ayarlarını okur. Eksik veya bozuk alanlar varsayılandan tamamlanır;
 * böylece yeni bir ayar eklendiğinde eski kayıtlar bozulmaz.
 */
export function loadStyleSettings(): StyleSettings {
  if (typeof window === 'undefined') return DEFAULT_STYLE_SETTINGS;
  try {
    const raw = localStorage.getItem(STYLE_STORAGE_KEY);
    if (!raw) return DEFAULT_STYLE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<StyleSettings>;
    if (!parsed || typeof parsed !== 'object') return DEFAULT_STYLE_SETTINGS;
    const sonuc = { ...DEFAULT_STYLE_SETTINGS };
    (Object.keys(DEFAULT_STYLE_SETTINGS) as (keyof StyleSettings)[]).forEach((k) => {
      const v = parsed[k];
      const secenekler = STYLE_SECENEKLERI[k];
      const varsayilan = DEFAULT_STYLE_SETTINGS[k];
      if (secenekler) {
        // Seçenek alanları metindir: eski sürümde bu dal olmadığı için her yüklemede varsayılana dönerlerdi.
        if (typeof v === 'string' && secenekler.includes(v)) (sonuc[k] as string) = v;
      } else if (typeof varsayilan === 'boolean') {
        if (typeof v === 'boolean') (sonuc[k] as boolean) = v;
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        (sonuc[k] as number) = v;
      }
    });
    return sonuc;
  } catch {
    return DEFAULT_STYLE_SETTINGS;
  }
}
