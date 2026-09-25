'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { Check, Shapes } from 'lucide-react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useSinifDuzeyi } from '@/hooks/useSinifDuzeyi';
import { TREE_TOOL_GROUPS } from './treeToolDefinitions';
import { ARAC_KATEGORI_RENKLERI } from './toolDefinitions';
import {
  KADEMELER,
  SINIF_DUZEYLERI,
  aracGorunurMu,
  gorunenAracSayisi,
  sinifEtiketi,
  type SinifDuzeyi,
} from './sinifDuzeyleri';

/** Açılır listenin genişliği (w-64); sağa taşacaksa başlığın sağ kenarına yaslanır. */
const MENU_GENISLIGI = 256;
const KENAR_BOSLUGU = 8;

interface SinifDuzeyiMenusuProps {
  acik: boolean;
  onBaslikTikla: () => void;
  /** Başka bir menü açıkken başlığın üzerine gelinince bu menüye geçilir (menü çubuğunun davranışı) */
  onBaslikUzerine: () => void;
  onKapat: () => void;
}

/**
 * Menü çubuğundaki "Sınıf" menüsü: seçilen sınıfın kazanımlarına göre sol araç panelini daraltır.
 * Başlıkta seçili sınıfın numarası küçük bir rozetle görünür; "Tüm araçlar"da rozet yoktur.
 * Menü çubuğunun diğer açılır listeleriyle aynı görünüm: opak bg-popover, 44 px dokunma hedefleri.
 * Sınıflar kademelere göre dörtlü ızgarada durur (13 satırlık liste pencereye sığmıyordu).
 */
export function SinifDuzeyiMenusu({ acik, onBaslikTikla, onBaslikUzerine, onKapat }: SinifDuzeyiMenusuProps) {
  const [duzey, setDuzey] = useSinifDuzeyi();
  const { activeTool, setActiveTool } = useWorkspace();
  const kokRef = useRef<HTMLDivElement>(null);
  const [sagaYasla, setSagaYasla] = useState(false);
  /** Fareyle üzerine gelinen seçenek: alttaki özet onu anlatır (dokunmatikte seçili olan) */
  const [onizleme, setOnizleme] = useState<SinifDuzeyi | null>(null);

  // Açılır liste pencerenin (ya da ekranın) sağından taşacaksa sağa yaslanır
  useLayoutEffect(() => {
    if (!acik) {
      setOnizleme(null);
      return;
    }
    const kok = kokRef.current;
    if (!kok) return;
    const kutu = kok.getBoundingClientRect();
    const pencere = kok.closest('[data-pencere]')?.getBoundingClientRect();
    const sagSinir = Math.min(window.innerWidth, pencere?.right ?? window.innerWidth) - KENAR_BOSLUGU;
    const solSinir = Math.max(0, pencere?.left ?? 0) + KENAR_BOSLUGU;
    setSagaYasla(kutu.left + MENU_GENISLIGI > sagSinir && kutu.right - MENU_GENISLIGI >= solSinir);
  }, [acik]);

  const sec = (yeni: SinifDuzeyi) => {
    setDuzey(yeni);
    // Etkin araç paneldeki listeden çıktıysa Seç ve Taşı'ya dön. Yalnız sınıf değişirken bakılır:
    // yazılı / sesli komutla ya da kısayolla sonradan seçilen gizli araçlara dokunulmaz.
    if (!aracGorunurMu(yeni, activeTool)) setActiveTool('select');
    onKapat();
  };

  const gosterilen = onizleme ?? duzey;
  const aracSayisi = gorunenAracSayisi(TREE_TOOL_GROUPS, gosterilen);
  const ozet = gosterilen === 'tum' ? 'Panel süzülmez; bütün araçlar görünür.' : SINIF_DUZEYLERI[gosterilen].konular;
  const etiket = sinifEtiketi(duzey);

  return (
    <div ref={kokRef} className="relative">
      <button
        type="button"
        onClick={onBaslikTikla}
        onMouseEnter={onBaslikUzerine}
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label={`Sınıf düzeyi: ${etiket}`}
        title={`Sınıf düzeyi: ${etiket}`}
        data-sinif-duzeyi={duzey}
        className={`min-h-[44px] px-3 py-1 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
          acik ? 'bg-primary/15 text-primary shadow-2xs' : 'text-foreground/80 hover:text-foreground hover:bg-muted'
        }`}
      >
        <span>Sınıf</span>
        {duzey !== 'tum' && (
          <span
            aria-hidden="true"
            className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-md bg-primary text-primary-foreground text-[11px] font-bold leading-none tabular-nums"
          >
            {duzey}
          </span>
        )}
      </button>

      {acik && (
        <div
          role="menu"
          aria-label="Sınıf düzeyi"
          onMouseLeave={() => setOnizleme(null)}
          className={`absolute top-full ${sagaYasla ? 'right-0' : 'left-0'} mt-1 w-64 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100`}
        >
          <div className="px-3 pt-1 pb-1.5">
            <div className="text-[13px] font-semibold text-foreground">Sınıf düzeyi</div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Araç paneli seçilen sınıfın kazanımlarındaki araçları gösterir. Yazılı ve sesli komutlar bütün araçlarla çalışır.
            </p>
          </div>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={duzey === 'tum'}
            onClick={() => sec('tum')}
            onMouseEnter={() => setOnizleme('tum')}
            onFocus={() => setOnizleme('tum')}
            className="w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Shapes className={`w-3.5 h-3.5 ${ARAC_KATEGORI_RENKLERI.temel}`} />
              <span>Tüm araçlar</span>
            </div>
            {duzey === 'tum' && <Check className="w-3.5 h-3.5 text-primary" />}
          </button>

          {KADEMELER.map((kademe) => (
            <div key={kademe.ad} role="group" aria-label={kademe.ad}>
              <div className="my-1 border-t border-border/60" />
              <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {kademe.ad}
              </div>
              <div className="grid grid-cols-4 gap-1 px-2 pb-0.5">
                {kademe.siniflar.map((no) => {
                  const secili = duzey === no;
                  return (
                    <button
                      key={no}
                      type="button"
                      role="menuitemradio"
                      aria-checked={secili}
                      aria-label={sinifEtiketi(no)}
                      title={`${sinifEtiketi(no)}: ${SINIF_DUZEYLERI[no].konular}`}
                      onClick={() => sec(no)}
                      onMouseEnter={() => setOnizleme(no)}
                      onFocus={() => setOnizleme(no)}
                      className={`min-h-[44px] rounded-lg border text-[13px] font-semibold tabular-nums transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        secili
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'border-border/70 text-foreground hover:bg-muted/70'
                      }`}
                    >
                      {no}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mx-3 mt-1.5 pt-1.5 border-t border-border/60">
            <div className="text-[11px] font-semibold text-foreground">
              {sinifEtiketi(gosterilen)} · {aracSayisi} araç
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">{ozet}</p>
          </div>
        </div>
      )}
    </div>
  );
}
