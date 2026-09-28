'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Backpack, BookOpen, Check, GraduationCap, Shapes } from 'lucide-react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useKademeDuzeyi } from '@/hooks/useKademeDuzeyi';
import { TREE_TOOL_GROUPS } from './treeToolDefinitions';
import { ARAC_KATEGORI_RENKLERI } from './toolDefinitions';
import {
  KADEMELER,
  KADEME_DUZEYLERI,
  aracGorunurMu,
  gorunenAracSayisi,
  kademeEtiketi,
  type KademeDuzeyi,
  type KademeId,
} from './kademeDuzeyleri';

/** Açılır listenin genişliği (w-72); sağa taşacaksa başlığın sağ kenarına yaslanır. */
const MENU_GENISLIGI = 288;
const KENAR_BOSLUGU = 8;

/** Kademe simgeleri: sırt çantası (ilkokul), açık kitap (ortaokul), mezuniyet kepi (lise) */
const KADEME_SIMGELERI: Record<KademeId, React.ComponentType<{ className?: string }>> = {
  ilkokul: Backpack,
  ortaokul: BookOpen,
  lise: GraduationCap,
};

/** Seçenek düğmelerinin ortak görünümü (44 px dokunma hedefi) */
const SECENEK_SINIFI =
  'w-full min-h-[44px] px-3 py-1.5 flex items-center justify-between gap-3 text-left text-[13px] [&_svg]:shrink-0 text-foreground hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none transition-colors cursor-pointer';

interface KademeDuzeyiMenusuProps {
  acik: boolean;
  onBaslikTikla: () => void;
  /** Başka bir menü açıkken başlığın üzerine gelinince bu menüye geçilir (menü çubuğunun davranışı) */
  onBaslikUzerine: () => void;
  onKapat: () => void;
}

/**
 * Menü çubuğundaki "Kademe" menüsü: seçilen kademenin (ilkokul, ortaokul, lise) programına göre sol araç
 * panelini daraltır. Başlıkta seçili kademenin adı küçük bir rozetle görünür; "Tüm araçlar"da rozet yoktur.
 * Menü çubuğunun diğer açılır listeleriyle aynı görünüm: opak bg-popover, 44 px dokunma hedefleri.
 *
 * Klavye: açılınca odak seçili seçeneğe gider; yukarı / aşağı oklar döngüsel gezer, Home / End uçlara gider,
 * Escape kapatır. Seçim ya da Escape ile kapanınca odak başlığa döner.
 */
export function KademeDuzeyiMenusu({ acik, onBaslikTikla, onBaslikUzerine, onKapat }: KademeDuzeyiMenusuProps) {
  const [duzey, setDuzey] = useKademeDuzeyi();
  const { activeTool, setActiveTool } = useWorkspace();
  const kokRef = useRef<HTMLDivElement>(null);
  const baslikRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [sagaYasla, setSagaYasla] = useState(false);
  /** Fareyle üzerine gelinen seçenek: alttaki özet onu anlatır (dokunmatikte seçili olan) */
  const [onizleme, setOnizleme] = useState<KademeDuzeyi | null>(null);

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

  // Açılınca odak seçili seçeneğe gider (klavye ve ekran okuyucu menünün içinde başlar)
  useEffect(() => {
    if (!acik) return;
    const secili = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]');
    (secili ?? secenekler()[0])?.focus();
  }, [acik]);

  const secenekler = () => Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? []);

  const kapatVeBasligaDon = () => {
    onKapat();
    baslikRef.current?.focus();
  };

  const sec = (yeni: KademeDuzeyi) => {
    setDuzey(yeni);
    // Etkin araç paneldeki listeden çıktıysa Seç ve Taşı'ya dön. Yalnız kademe değişirken bakılır:
    // yazılı / sesli komutla ya da kısayolla sonradan seçilen gizli araçlara dokunulmaz. El (pan) panelde
    // değil tuval şeridindedir; her kademede kalır.
    if (activeTool !== 'pan' && !aracGorunurMu(yeni, activeTool)) setActiveTool('select');
    kapatVeBasligaDon();
  };

  const tusaBas = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const liste = secenekler();
    if (liste.length === 0) return;
    const simdiki = liste.indexOf(document.activeElement as HTMLButtonElement);
    let hedef: number | null = null;
    if (e.key === 'ArrowDown') hedef = simdiki < 0 ? 0 : (simdiki + 1) % liste.length;
    else if (e.key === 'ArrowUp') hedef = simdiki < 0 ? liste.length - 1 : (simdiki - 1 + liste.length) % liste.length;
    else if (e.key === 'Home') hedef = 0;
    else if (e.key === 'End') hedef = liste.length - 1;
    else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      kapatVeBasligaDon();
      return;
    } else if (e.key === 'Tab') {
      // Menüden Tab ile çıkılınca menü kapanır; odak menü çubuğunda doğal sırayla ilerler
      onKapat();
      return;
    }
    if (hedef === null) return;
    e.preventDefault();
    liste[hedef].focus();
  };

  const gosterilen = onizleme ?? duzey;
  const aracSayisi = gorunenAracSayisi(TREE_TOOL_GROUPS, gosterilen);
  const ozet = gosterilen === 'tum' ? 'Panel süzülmez; bütün araçlar görünür.' : KADEME_DUZEYLERI[gosterilen].konular;
  const etiket = kademeEtiketi(duzey);

  return (
    <div ref={kokRef} className="relative">
      <button
        ref={baslikRef}
        type="button"
        onClick={onBaslikTikla}
        onMouseEnter={onBaslikUzerine}
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label={`Kademe: ${etiket}`}
        title={`Kademe: ${etiket}`}
        data-kademe-duzeyi={duzey}
        className={`min-h-[44px] px-3 py-1 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
          acik ? 'bg-primary/15 text-primary shadow-2xs' : 'text-foreground/80 hover:text-foreground hover:bg-muted'
        }`}
      >
        <span>Kademe</span>
        {duzey !== 'tum' && (
          <span
            aria-hidden="true"
            className="inline-flex items-center justify-center h-5 px-1.5 rounded-md bg-primary text-primary-foreground text-[11px] font-bold leading-none"
          >
            {KADEME_DUZEYLERI[duzey].ad}
          </span>
        )}
      </button>

      {acik && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Kademe"
          aria-describedby="kademe-menu-ozeti"
          onKeyDown={tusaBas}
          onMouseLeave={() => setOnizleme(null)}
          className={`absolute top-full ${sagaYasla ? 'right-0' : 'left-0'} mt-1 w-72 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border/90 py-1.5 z-[999] animate-in fade-in-0 zoom-in-95 duration-100`}
        >
          <div className="px-3 pt-1 pb-1.5" role="presentation">
            <div className="text-[13px] font-semibold text-foreground">Kademe</div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Araç paneli seçilen kademenin programındaki araçları gösterir. Yazılı ve sesli komutlar bütün araçlarla çalışır.
            </p>
          </div>

          <button
            type="button"
            role="menuitemradio"
            aria-checked={duzey === 'tum'}
            onClick={() => sec('tum')}
            onMouseEnter={() => setOnizleme('tum')}
            onFocus={() => setOnizleme('tum')}
            className={SECENEK_SINIFI}
          >
            <div className="flex items-center gap-2">
              <Shapes className={`w-3.5 h-3.5 ${ARAC_KATEGORI_RENKLERI.temel}`} />
              <span>Tüm araçlar</span>
            </div>
            {duzey === 'tum' && <Check className="w-3.5 h-3.5 text-primary" />}
          </button>

          <div role="separator" className="my-1 border-t border-border/60" />

          {KADEMELER.map((kademe) => {
            const Simge = KADEME_SIMGELERI[kademe.id];
            const secili = duzey === kademe.id;
            return (
              <button
                key={kademe.id}
                type="button"
                role="menuitemradio"
                aria-checked={secili}
                aria-label={`${kademe.ad} (${kademe.siniflar})`}
                title={`${kademe.ad}, ${kademe.siniflar}: ${kademe.konular}`}
                data-kademe-secenegi={kademe.id}
                onClick={() => sec(kademe.id)}
                onMouseEnter={() => setOnizleme(kademe.id)}
                onFocus={() => setOnizleme(kademe.id)}
                className={SECENEK_SINIFI}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Simge className={`w-3.5 h-3.5 ${ARAC_KATEGORI_RENKLERI.olcme}`} />
                  <span className={secili ? 'font-semibold' : undefined}>{kademe.ad}</span>
                  <span className="text-[11px] text-muted-foreground truncate">{kademe.siniflar}</span>
                </div>
                {secili && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            );
          })}

          {/* Odaklanılan / üzerine gelinen seçeneğin özeti; ekran okuyucu değişimi duyar (aria-live) */}
          <div id="kademe-menu-ozeti" aria-live="polite" className="mx-3 mt-1.5 pt-1.5 border-t border-border/60">
            <div className="text-[11px] font-semibold text-foreground">
              {kademeEtiketi(gosterilen)} · {aracSayisi} araç
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">{ozet}</p>
          </div>
        </div>
      )}
    </div>
  );
}
