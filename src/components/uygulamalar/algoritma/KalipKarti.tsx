'use client';

import React from 'react';
import type { KalipKarti as Kart } from './kaliplar';
import { BlokDuzenleyici } from './BlokDuzenleyici';
import { SIMGE } from './simgeler';

/** Kalıp kartı: adı, ne işe yaradığı, örnek program, yeniden karşılaşılacak yerler. */
export function KalipKarti({ kart, kucuk = false, yeni = false }: { kart: Kart; kucuk?: boolean; yeni?: boolean }) {
  return (
    <article className={`relative overflow-hidden rounded-[18px] border border-border bg-card shadow-sm ${kucuk ? 'p-3' : 'p-4'}`} data-kalip-karti={kart.id}>
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#5d66a6,#2a9d94,#c99a52)]" aria-hidden="true" />
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#5d66a6]/12 text-[#5d66a6] dark:text-[#aab1e6]">
          <SIMGE.kalip className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
            Kalıp kartı{yeni ? ' · yeni' : ''} · {kart.kazanildigiYer}
          </p>
          <h4 className="font-baslik text-[20px] font-semibold leading-tight text-foreground">{kart.ad}</h4>
        </div>
      </div>
      <p className={`mt-2 font-semibold text-foreground ${kucuk ? 'text-[14px]' : 'text-[15px]'}`}>{kart.neIseYarar}</p>
      {!kucuk && (
        <>
          <div className="mt-3 rounded-[12px] border border-border bg-background/60 p-2">
            <div className="max-w-[320px]">
              <BlokDuzenleyici program={kart.ornek} baslik="Örnek" kompakt />
            </div>
            <p className="px-1 pb-1 text-[13px] font-medium text-muted-foreground">{kart.ornekAciklama}</p>
          </div>
          <p className="mt-3 text-[12px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">Yine karşına çıkacak</p>
          <ul className="mt-1 space-y-1">
            {kart.yineKarsinaCikacak.map((y) => (
              <li key={y} className="flex items-start gap-2 text-[14px] text-foreground">
                <SIMGE.ok className="mt-0.5 h-4 w-4 shrink-0 text-ada-vurgu" />
                {y}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-muted-foreground">Öğretmen notundaki adı: {kart.bicimselAd}</p>
        </>
      )}
    </article>
  );
}
