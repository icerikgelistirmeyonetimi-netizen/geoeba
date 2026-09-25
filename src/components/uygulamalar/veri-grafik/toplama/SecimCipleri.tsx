'use client';

/**
 * Seçim çipleri (radiogroup): tarayıcının kendi açılır listesi (select) yerine dokunmaya uygun, sığmayınca alt satıra
 * sarılan çipler (44 px). Plan formundaki "NEYİ SAYACAĞIZ?" ve Düzenle'deki "Sayılan" için; seçenekler azdır (2–12:
 * Yazı / Tura, 1–6, toplam 2–12, dilim ve renk adları). Ok tuşları seçer ve odağı taşır; seçili çip uygulamanın vurgu
 * rengindedir (koyu temada da okunur).
 */
import React from 'react';
import { radyoTusu } from '../ortak';

export interface SecimCipleriProps {
  /** Grubun erişilebilir adı (etiketId verilmezse) */
  etiket: string;
  /** Görünür başlığın kimliği (aria-labelledby) */
  etiketId?: string;
  secenekler: readonly { id: string; ad: string }[];
  secili: string;
  onSec: (id: string) => void;
  className?: string;
}

export function SecimCipleri({ etiket, etiketId, secenekler, secili, onSec, className = '' }: SecimCipleriProps) {
  const seciliVar = secenekler.some((s) => s.id === secili);
  return (
    <div
      role="radiogroup"
      aria-label={etiketId ? undefined : etiket}
      aria-labelledby={etiketId}
      className={`flex min-w-0 flex-wrap gap-1 ${className}`}
      data-secim-cipleri=""
    >
      {secenekler.map((s, i) => {
        const sec = s.id === secili;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={sec}
            tabIndex={sec || (!seciliVar && i === 0) ? 0 : -1}
            onClick={() => onSec(s.id)}
            onKeyDown={(e) => radyoTusu(e, i, secenekler.length, (j) => onSec(secenekler[j].id))}
            className={`inline-flex h-11 min-w-[44px] items-center justify-center whitespace-nowrap rounded-[calc(var(--radius)-8px)] border px-3 text-[13.5px] font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              sec ? 'border-primary bg-primary text-primary-foreground dark:bg-[hsl(175_58%_30%)] dark:text-white' : 'border-border bg-card text-foreground hover:bg-accent'
            }`}
            data-secim={s.id}
          >
            {s.ad}
          </button>
        );
      })}
    </div>
  );
}
