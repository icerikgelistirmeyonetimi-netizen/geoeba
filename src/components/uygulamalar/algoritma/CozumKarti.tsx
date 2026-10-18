'use client';
import React, { useEffect, useRef } from 'react';
import { BlokDuzenleyici } from './BlokDuzenleyici';
import type { Program } from './program';

/** `sozde`: çözüm öğrencinin baktığı biçimde, sözde kodla gösterilir */
export function CozumKarti({ program, onKapat, sozde = false }: { program: Program; onKapat: () => void; sozde?: boolean }) {
  const kapatRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { const onceki = document.activeElement as HTMLElement | null; kapatRef.current?.focus(); return () => onceki?.focus(); }, []);
  return <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onKeyDown={(e) => { if (e.key === 'Escape') onKapat(); if (e.key === 'Tab') { e.preventDefault(); kapatRef.current?.focus(); } }}>
    <section role="dialog" aria-modal="true" aria-label="Örnek doğru çözüm" className="flex h-[min(90%,720px)] w-full max-w-[600px] flex-col rounded-2xl bg-card p-4 shadow-xl">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Örnek doğru çözüm</h2><button ref={kapatRef} type="button" className="rounded-full bg-muted px-4 py-2 font-bold" onClick={onKapat}>Kapat</button></div>
      <p className="my-3 text-[14px]">Adımların sırasını, tekrarların içini ve işlem sonuçlarını kendi kodunla karşılaştır. Ardından eksik adımı düzeltip yeniden çalıştır.</p>
      <div className="min-h-0 flex-1"><BlokDuzenleyici program={program} aracKutusu={[]} baslik="Çözüm adımları" sozde={sozde} /></div>
    </section>
  </div>;
}
