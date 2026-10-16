'use client';

import React from 'react';
import { useOturum } from '@/state/OturumContext';
import { kademeAdasi } from '@/components/adalar/adaEslemeleri';
import { KADEME_SIMGELERI } from '@/components/adalar/kademeSimgeleri';
import { kademeEtiketi, type KademeDuzeyi } from './kademeDuzeyleri';

/**
 * Araç panelinde kademe süzgeci açıkken listenin üstündeki şerit: hangi kademenin araçlarının gösterildiğini
 * oturum açma ekranındaki hesap avatarının küçüğüyle (kademenin ada rengi halka + simge, kademeSimgeleri) bir
 * rozet olarak söyler; oturum dışında tek dokunuşla bütün araçlara döndürür. "Tüm araçlar"da çizilmez.
 * Oturumda (kademe sabit) düğme yoktur; rozet tek başına başlık gibi durur.
 */
export function KademeSuzgeciSeridi({ duzey, onTumAraclar }: { duzey: KademeDuzeyi; onTumAraclar: () => void }) {
  const { kademe } = useOturum();
  if (duzey === 'tum') return null;
  const renk = kademeAdasi(duzey)?.renk ?? 'hsl(var(--primary))';
  const Simge = KADEME_SIMGELERI[duzey];
  return (
    <div
      className="px-2.5 py-2 border-b border-border/60 flex items-center justify-between gap-2 shrink-0"
      data-kademe-suzgeci={duzey}
    >
      <span
        className="inline-flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12px] font-bold text-foreground"
        style={{ background: `color-mix(in srgb, ${renk} 14%, transparent)` }}
      >
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-card"
          style={{ color: renk, boxShadow: `0 0 0 1.5px ${renk}` }}
          aria-hidden="true"
        >
          <Simge className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </span>
        <span className="truncate">{kademeEtiketi(duzey)} araçları</span>
      </span>
      {!kademe && duzey !== 'ilkokul' && <button
        type="button"
        onClick={onTumAraclar}
        title="Kademe süzgecini kaldır, bütün araçları göster"
        className="shrink-0 min-h-[36px] px-2 rounded-lg text-[12px] font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
      >
        Tüm araçlar
      </button>}
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
  const { kademe } = useOturum();
  return (
    <div role="status" className="px-2.5 py-3 text-[12px] leading-snug text-muted-foreground">
      {suzgecGizledi && duzey !== 'tum' ? (
        <>
          <p className="m-0">
            {kademeEtiketi(duzey)} araçları arasında “{arama}” yok.
          </p>
          {!kademe && duzey !== 'ilkokul' && <button
            type="button"
            onClick={onTumAraclar}
            className="mt-1 inline-flex min-h-[44px] items-center rounded-lg px-2 -ml-2 font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
          >
            Tüm araçları göster
          </button>}
        </>
      ) : (
        <>“{arama}” ile eşleşen araç yok.</>
      )}
    </div>
  );
}
