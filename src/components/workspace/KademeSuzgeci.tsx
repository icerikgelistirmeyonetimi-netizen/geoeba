'use client';

import React from 'react';
import { kademeEtiketi, type KademeDuzeyi } from './kademeDuzeyleri';

/**
 * Araç panelinde kademe süzgeci açıkken listenin üstündeki ince şerit: hangi kademenin araçlarının
 * gösterildiğini söyler ve tek dokunuşla bütün araçlara döndürür. "Tüm araçlar"da çizilmez.
 * Düğme 44 px dokunma hedefi taşır; şeridin kendi dikey dolgusu yoktur.
 */
export function KademeSuzgeciSeridi({ duzey, onTumAraclar }: { duzey: KademeDuzeyi; onTumAraclar: () => void }) {
  if (duzey === 'tum') return null;
  return (
    <div
      className="px-3.5 border-b border-border/60 bg-muted/40 flex items-center justify-between gap-2 shrink-0"
      data-kademe-suzgeci={duzey}
    >
      <span className="min-w-0 truncate text-[12px] text-muted-foreground">
        <span className="font-semibold text-foreground">{kademeEtiketi(duzey)}</span> araçları
      </span>
      <button
        type="button"
        onClick={onTumAraclar}
        title="Kademe süzgecini kaldır, bütün araçları göster"
        className="shrink-0 min-h-[44px] px-2 rounded-lg text-[12px] font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
      >
        Tüm araçlar
      </button>
    </div>
  );
}

/**
 * Aramada sonuç yokken gösterilen not. Aranan araç yalnız kademe süzgeci yüzünden gizliyse bunu söyler
 * ve bütün araçlara dönmeyi önerir (araç "yok" sanılmasın). Kademe adı cümle başında durur (İlkokul, Lise
 * cins isimdir; cümle ortasında büyük harf olmasın).
 */
export function KademeAramaBosNotu({
  arama,
  duzey,
  suzgecGizledi,
  onTumAraclar,
}: {
  arama: string;
  duzey: KademeDuzeyi;
  /** Arama kademenin dışında eşleşiyor mu? */
  suzgecGizledi: boolean;
  onTumAraclar: () => void;
}) {
  return (
    <div role="status" className="px-2.5 py-3 text-[12px] leading-snug text-muted-foreground">
      {suzgecGizledi && duzey !== 'tum' ? (
        <>
          <p className="m-0">
            {kademeEtiketi(duzey)} araçları arasında “{arama}” yok.
          </p>
          <button
            type="button"
            onClick={onTumAraclar}
            className="mt-1 inline-flex min-h-[44px] items-center rounded-lg px-2 -ml-2 font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
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
