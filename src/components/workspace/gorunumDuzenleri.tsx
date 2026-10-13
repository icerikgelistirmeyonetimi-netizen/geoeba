'use client';

/**
 * Çalışma alanı yerleşimlerinin (görünüm düzenlerinin) TEK listesi. Menü çubuğundaki Görünüm menüsü ile 2B ve 3B
 * araç panellerinin Görünümler sekmesi buradan üretilir: adlar, sıra ve sayı her yerde aynıdır (alan uzmanı,
 * atölye inceleme 4. tur: menüde 5 yerleşim, panelde 7 yerleşim vardı; "Hesap / 3 Sütun" panelde "Üçü Bir Arada"
 * diye geçiyordu).
 *
 * "Cebir" yalnız cebir panelini tam alanda açar (algebra_only). Üç bölmeli görünüm yalnız "2D + 3D + Cebir"dir
 * (three_col); eski kayıtlardaki üç bölmeli 'default' düzeni de ona çevrilir (eskiDuzeniCevir).
 */
import React, { useState } from 'react';
import { Box, Calculator, Check, Columns2, Columns3, LayoutGrid, PanelLeft, PanelRight, Square, type LucideIcon } from 'lucide-react';
import type { LayoutMode } from '@/types/workspace';

export interface GorunumDuzeni {
  mode: LayoutMode;
  /** Menüde ve panelde görünen ad */
  ad: string;
  /** Üzerine gelince çıkan açıklama */
  aciklama: string;
  Simge: LucideIcon;
  /** Simge rengi (Tailwind sınıfı) */
  renk: string;
}

export const GORUNUM_DUZENLERI: readonly GorunumDuzeni[] = [
  { mode: '2d_only', ad: '2D Düzlem', aciklama: 'Yalnızca 2 boyutlu geometri çizim alanı', Simge: Square, renk: 'text-ada-deniz dark:text-ada-vurgu' },
  { mode: '3d_only', ad: '3D Uzay', aciklama: 'Yalnızca 3 boyutlu katı cisim ve uzay stüdyosu', Simge: Box, renk: 'text-ada-lavanta' },
  { mode: '2d_3d', ad: '2D + 3D', aciklama: 'Sol tarafta 2D çizim, sağ tarafta 3D uzay yan yana', Simge: Columns2, renk: 'text-ada-vurgu' },
  { mode: 'algebra_only', ad: 'Cebir', aciklama: 'Yalnızca cebir paneli: ifadeler, fonksiyonlar ve nesne listesi tam alanda', Simge: Calculator, renk: 'text-ada-deniz-koyu dark:text-ada-vurgu' },
  { mode: 'algebra_2d', ad: '2D + Cebir', aciklama: '2D geometri düzlemi ile cebir giriş paneli', Simge: PanelLeft, renk: 'text-ada-altin dark:text-ada-fener' },
  { mode: 'algebra_3d', ad: '3D + Cebir', aciklama: '3D uzay stüdyosu ile cebir giriş paneli', Simge: PanelRight, renk: 'text-ada-mercan' },
  { mode: 'three_col', ad: '2D + 3D + Cebir', aciklama: 'Cebir listesi, 2D geometri ve 3D uzay üç sütun hâlinde', Simge: Columns3, renk: 'text-ada-murekkep-2 dark:text-ada-kum' },
];

/** Eski kayıtlardaki üç bölmeli 'default' düzeni bugünkü üç bölmeli düzene ("2D + 3D + Cebir") çevrilir. */
export function eskiDuzeniCevir(mode: LayoutMode): LayoutMode {
  return mode === 'default' ? 'three_col' : mode;
}

/**
 * Görünümler sekmesi (2B ve 3B araç paneli aynı bileşeni kullanır): başlık, açıklama satırı ve yerleşim kartları
 * her iki panelde aynı yerde durur; 2B ile 3B arasında geçişte liste kaymaz.
 */
export function GorunumDuzeniPaneli({
  layoutMode,
  onLayoutModeChange,
}: {
  layoutMode: LayoutMode;
  onLayoutModeChange?: (mode: LayoutMode) => void;
}) {
  const [ipucu, setIpucu] = useState<{ text: string; x: number; y: number } | null>(null);
  const etkin = eskiDuzeniCevir(layoutMode);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-card" data-gorunum-paneli>
      <div className="p-3.5 border-b border-border/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-bold text-foreground tracking-tight">Görünümler</h3>
        </div>
      </div>

      <div className="p-3 border-b border-border/50 bg-muted/20 text-[11px] text-muted-foreground leading-normal shrink-0">
        Çalışma alanınızı tek ekranda veya çoklu pencerelerle görüntülemek için bir düzen seçin:
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
        {GORUNUM_DUZENLERI.map((duzen) => {
          const secili = etkin === duzen.mode;
          const { Simge } = duzen;
          return (
            <button
              key={duzen.mode}
              type="button"
              onClick={() => onLayoutModeChange?.(duzen.mode)}
              title={duzen.aciklama}
              aria-label={duzen.ad}
              aria-pressed={secili}
              data-gorunum-duzeni={duzen.mode}
              onMouseEnter={(e) => setIpucu({ text: duzen.aciklama, x: e.clientX + 14, y: e.clientY + 10 })}
              onMouseMove={(e) => setIpucu({ text: duzen.aciklama, x: e.clientX + 14, y: e.clientY + 10 })}
              onMouseLeave={() => setIpucu(null)}
              className={`w-full min-h-[48px] p-2.5 rounded-2xl border text-left transition-all cursor-pointer select-none relative group ${
                secili
                  ? 'bg-primary/10 border-primary/50 shadow-sm ring-1 ring-primary/30'
                  : 'bg-muted/30 border-border/70 hover:bg-muted/60 hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl shrink-0 transition-transform ${
                    secili ? 'bg-primary border border-primary text-primary-foreground shadow-xs [&>svg]:!text-primary-foreground' : 'bg-background border border-border group-hover:scale-105'
                  }`}
                >
                  <Simge className={`w-5 h-5 ${duzen.renk}`} aria-hidden="true" />
                </div>
                <span className="flex-1 min-w-0 font-bold text-[13px] text-foreground">{duzen.ad}</span>
                {secili && <Check className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Fareyle üzerine gelince çıkan açıklama (dokunmatik tahtada title / aria-label yeter) */}
      {ipucu && (
        <div
          style={{ left: ipucu.x, top: ipucu.y }}
          className="fixed z-[1000] pointer-events-none px-3 py-1.5 rounded-xl bg-ada-murekkep/95 text-ada-fildisi dark:bg-ada-fildisi/95 dark:text-ada-murekkep text-[13px] font-medium shadow-2xl border border-border/50 backdrop-blur-md max-w-xs animate-in fade-in-0 zoom-in-95 duration-100 select-none leading-tight"
        >
          {ipucu.text}
        </div>
      )}
    </div>
  );
}
