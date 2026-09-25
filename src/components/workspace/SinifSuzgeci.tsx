'use client';

import React from 'react';
import { sinifEtiketi, type SinifDuzeyi } from './sinifDuzeyleri';

/**
 * Araç panelinde sınıf süzgeci açıkken listenin üstündeki ince şerit: hangi sınıfın araçlarının
 * gösterildiğini söyler ve tek dokunuşla bütün araçlara döndürür. "Tüm araçlar"da çizilmez.
 */
export function SinifSuzgeciSeridi({ duzey, onTumAraclar }: { duzey: SinifDuzeyi; onTumAraclar: () => void }) {
  if (duzey === 'tum') return null;
  return (
    <div
      className="px-3.5 py-0.5 border-b border-border/60 bg-muted/40 flex items-center justify-between gap-2 shrink-0"
      data-sinif-suzgeci={duzey}
    >
      <span className="min-w-0 truncate text-[12px] text-muted-foreground">
        <span className="font-semibold text-foreground">{sinifEtiketi(duzey)}</span> araçları
      </span>
      <button
        type="button"
        onClick={onTumAraclar}
        title="Sınıf süzgecini kaldır, bütün araçları göster"
        className="shrink-0 min-h-[36px] px-2 rounded-lg text-[12px] font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
      >
        Tüm araçlar
      </button>
    </div>
  );
}

/**
 * Aramada sonuç yokken gösterilen not. Aranan araç yalnız sınıf süzgeci yüzünden gizliyse bunu söyler
 * ve bütün araçlara dönmeyi önerir (araç "yok" sanılmasın).
 */
export function SinifAramaBosNotu({
  arama,
  duzey,
  suzgecGizledi,
  onTumAraclar,
}: {
  arama: string;
  duzey: SinifDuzeyi;
  /** Arama sınıfın dışında eşleşiyor mu? */
  suzgecGizledi: boolean;
  onTumAraclar: () => void;
}) {
  return (
    <div role="status" className="px-2.5 py-3 text-[12px] leading-snug text-muted-foreground">
      {suzgecGizledi && duzey !== 'tum' ? (
        <>
          “{arama}” {sinifEtiketi(duzey)} araçları arasında yok.{' '}
          <button
            type="button"
            onClick={onTumAraclar}
            className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded cursor-pointer"
          >
            Tüm araçları göster
          </button>
        </>
      ) : (
        <>“{arama}” ile eşleşen araç yok.</>
      )}
    </div>
  );
}
