/**
 * Deney özeti listesi (VT §6.6, §11.8, A9): her deney bir satır — Deney · Atış · Sayı · Göreli sıklık ve
 * 0–100 yatay çubuk (8 px, izlenen sonucun kategori rengi); çubuğun üstünde teorik değerde 2 px kesikli çentik.
 * Altta yapışkan "Tümü" satırı. Fazla satırlar yalnız listenin içinde kayar.
 */
import React from 'react';
import { oranMetni, yuzdeMetni } from './bicim';

export interface OzetSatiri {
  /** "Gerçek atışlar" · "1. deney (20)" */
  etiket: string;
  n: number;
  sayi: number;
  /** Tabloya yazılmadı (500 ve üstü): yalnız özette */
  tabloda?: boolean;
}

export interface DeneyOzetiProps {
  satirlar: OzetSatiri[];
  /** Sayılan sonuç: "Tura" */
  sayilanAd: string;
  /** Sayılan sonucun kategori rengi */
  renk: string;
  /** Teorik olasılık (0–1); yoksa çentik çizilmez */
  teorik: number | null;
  /** Birim sütunu başlığı: "Atış" · "Çevirme" · "Çekiş" */
  birimAd?: string;
  /** Liste alanının en çok yüksekliği (px); aşarsa liste kayar */
  enCokYukseklik?: number;
  /** Yeni eklenen satır (parlar) */
  vurguSatir?: number | null;
  className?: string;
}

const SUTUNLAR = 'minmax(0,1.25fr) 42px 42px minmax(120px,1.5fr)';

function Cubuk({ oran, teorik, renk }: { oran: number; teorik: number | null; renk: string }) {
  return (
    <span className="relative block h-2 min-w-0 flex-1" aria-hidden="true">
      <span className="block h-full w-full overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, oran)) * 100}%`, background: renk }} />
      </span>
      {teorik !== null && (
        <svg
          viewBox="0 0 4 16"
          width={4}
          height={16}
          className="absolute -top-1 -translate-x-1/2 text-foreground"
          style={{ left: `${teorik * 100}%` }}
          focusable="false"
        >
          <path d="M2 1v14" stroke="currentColor" strokeWidth={2} strokeDasharray="3 2" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

function Satir({
  s,
  teorik,
  renk,
  vurgu,
  tumu = false,
}: {
  s: OzetSatiri;
  teorik: number | null;
  renk: string;
  vurgu?: boolean;
  tumu?: boolean;
}) {
  const oran = s.n > 0 ? s.sayi / s.n : 0;
  return (
    <div
      role="row"
      className={`grid min-h-[34px] items-center gap-2 px-2 text-[13px] leading-4 ${tumu ? 'font-extrabold' : 'font-semibold'} ${
        vurgu ? 'bg-[#d9805f]/20' : ''
      }`}
      style={{ gridTemplateColumns: SUTUNLAR }}
      data-ozet-satiri={s.etiket}
    >
      <span role="cell" className="flex min-w-0 items-center gap-1.5">
        <span
          className={`truncate ${s.tabloda === false ? 'text-muted-foreground' : ''}`}
          title={s.tabloda === false ? `${s.etiket}: tabloya yazılmadı (500 ve üstü atış yalnız özete yazılır).` : s.etiket}
          data-yalniz-ozet={s.tabloda === false ? '' : undefined}
        >
          {s.etiket}
        </span>
      </span>
      <span role="cell" className="text-right tabular-nums">
        {s.n}
      </span>
      <span role="cell" className="text-right tabular-nums">
        {s.sayi}
      </span>
      <span role="cell" className="flex min-w-0 items-center gap-2">
        <span className="w-12 shrink-0 text-right tabular-nums">{yuzdeMetni(s.sayi, s.n, 1)}</span>
        <Cubuk oran={oran} teorik={teorik} renk={renk} />
      </span>
    </div>
  );
}

export function DeneyOzeti({
  satirlar,
  sayilanAd,
  renk,
  teorik,
  birimAd = 'Atış',
  enCokYukseklik = 280,
  vurguSatir = null,
  className = '',
}: DeneyOzetiProps) {
  const tumu: OzetSatiri = {
    etiket: 'Tümü',
    n: satirlar.reduce((t, s) => t + s.n, 0),
    sayi: satirlar.reduce((t, s) => t + s.sayi, 0),
  };
  return (
    <div
      role="table"
      aria-label={`Deney özeti: ${sayilanAd} göreli sıklığı${teorik !== null ? `, teorik ${oranMetni(teorik, 1)}` : ''}`}
      className={`flex min-h-0 flex-col overflow-hidden rounded-[calc(var(--radius)-6px)] border border-border bg-card ${className}`}
      data-deney-ozeti=""
    >
      <div
        role="row"
        className="grid min-h-[32px] items-center gap-2 border-b border-border bg-muted px-2 text-[12px] font-extrabold leading-4 text-muted-foreground"
        style={{ gridTemplateColumns: SUTUNLAR }}
      >
        <span role="columnheader">Deney</span>
        <span role="columnheader" className="text-right">
          {birimAd}
        </span>
        <span role="columnheader" className="truncate text-right" title={sayilanAd}>
          {sayilanAd}
        </span>
        <span role="columnheader" className="flex items-center justify-between gap-2">
          <span>Göreli sıklık</span>
          <span className="font-semibold tabular-nums">0–100</span>
        </span>
      </div>
      <div role="rowgroup" className="min-h-0 overflow-y-auto" style={{ maxHeight: enCokYukseklik }}>
        {satirlar.length === 0 ? (
          <p className="px-2 py-2.5 text-[12.5px] leading-4 text-muted-foreground">Henüz deney yok.</p>
        ) : (
          satirlar.map((s, i) => <Satir key={`${s.etiket}-${i}`} s={s} teorik={teorik} renk={renk} vurgu={vurguSatir === i} />)
        )}
      </div>
      {satirlar.length > 1 && (
        <div role="rowgroup" className="border-t-2 border-border bg-muted/60">
          <Satir s={tumu} teorik={teorik} renk={renk} tumu />
        </div>
      )}
    </div>
  );
}
