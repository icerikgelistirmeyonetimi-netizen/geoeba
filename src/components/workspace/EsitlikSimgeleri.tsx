'use client';

/**
 * Eşitlik çentiği menü simgeleri (16×16, currentColor; GrafikMenuSimgeleri ile aynı biçem).
 */
import React from 'react';

/** Yatay bir parça ve üzerinde `sayi` kadar dik çentik (0: çentiksiz parça). */
export function EsitlikSimgesi({ sayi }: { sayi: number }) {
  const k = Math.max(0, Math.min(4, Math.round(sayi)));
  const d = Array.from({ length: k }, (_, j) => {
    const x = 8 + (j - (k - 1) / 2) * 2.6;
    return `M${x.toFixed(2)} 4.6V11.4`;
  }).join('');
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M2.2 8h11.6" strokeWidth="1.4" />
      {/* Uç noktalar: simge "+" değil, çentikli bir doğru parçası olarak okunsun */}
      <circle cx="1.9" cy="8" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14.1" cy="8" r="1.3" fill="currentColor" stroke="none" />
      {d && <path d={d} strokeWidth="1.2" />}
    </svg>
  );
}

/** Eşit uzunluklar: iki yan kenarında birer çentik olan ikizkenar üçgen. */
export function EsitUzunluklarSimgesi() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M8 2 2.5 14h11Z" strokeWidth="1.3" />
      <path d="M3.6 7.25 6.9 8.75M9.1 8.75 12.4 7.25" strokeWidth="1.2" />
    </svg>
  );
}
