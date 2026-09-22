'use client';

/**
 * Karşılaştırma grafiği: yan yana üç sütun — Öznel Tahmin (altın), Deneysel Sonuç (deniz),
 * Teorik Beklenti (turkuaz). Saf SVG; kap genişliğine ResizeObserver ile uyar.
 */
import React from 'react';
import { yuzdeMetni } from './olasilik';
import { useKapGenisligi } from './useKapGenisligi';

export interface KarsilastirmaGrafigiProps {
  oznel: number; // 0–1
  deneysel: number; // 0–1
  teorik: number; // 0–1
  deneme: number;
}

export const KARSILASTIRMA_RENKLERI = { oznel: '#b9884a', deneysel: '#216a78', teorik: '#2a9d94' } as const;

export function KarsilastirmaGrafigi({ oznel, deneysel, teorik, deneme }: KarsilastirmaGrafigiProps) {
  const [kapRef, genislik] = useKapGenisligi(320);
  const W = Math.max(240, genislik);
  const H = 220;
  const ust = 30;
  const alt = 40;
  const sol = 36;
  const sag = 12;
  const icY = H - ust - alt;
  const sutunlar = [
    { ad: 'Öznel Tahmin', deger: oznel, renk: KARSILASTIRMA_RENKLERI.oznel },
    { ad: 'Deneysel Sonuç', deger: deneysel, renk: KARSILASTIRMA_RENKLERI.deneysel, yok: deneme === 0 },
    { ad: 'Teorik Beklenti', deger: teorik, renk: KARSILASTIRMA_RENKLERI.teorik },
  ];
  const aralik = (W - sol - sag) / sutunlar.length;
  const sutunGen = Math.min(88, aralik * 0.62);

  return (
    <section ref={kapRef} className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]" aria-label="Karşılaştırma grafiği">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">Öznel · Deneysel · Teorik</h3>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="mt-2 block" role="img" aria-label={`Öznel ${yuzdeMetni(oznel)}, deneysel ${deneme > 0 ? yuzdeMetni(deneysel) : 'yok'}, teorik ${yuzdeMetni(teorik)}`}>
        {[0, 0.25, 0.5, 0.75, 1].map((k) => {
          const y = ust + icY * (1 - k);
          return (
            <g key={k}>
              <line x1={sol} x2={W - sag} y1={y} y2={y} stroke="hsl(var(--grid-color))" strokeWidth={1} />
              <text x={sol - 6} y={y + 4} textAnchor="end" fontSize={13} fill="hsl(var(--muted-foreground))">
                %{Math.round(k * 100)}
              </text>
            </g>
          );
        })}
        {sutunlar.map((s, i) => {
          const x = sol + aralik * i + (aralik - sutunGen) / 2;
          const h = Math.max(0, Math.min(1, s.deger)) * icY;
          const y = ust + icY - h;
          return (
            <g key={s.ad}>
              <rect x={x} y={y} width={sutunGen} height={h} rx={6} fill={s.renk} style={{ transition: 'height 240ms cubic-bezier(0.2,0.8,0.2,1), y 240ms cubic-bezier(0.2,0.8,0.2,1)' }} opacity={s.yok ? 0.25 : 1} />
              <text x={x + sutunGen / 2} y={y - 6} textAnchor="middle" fontSize={13} fontWeight={700} fill="hsl(var(--foreground))">
                {s.yok ? '—' : yuzdeMetni(s.deger)}
              </text>
              <text x={x + sutunGen / 2} y={H - alt + 16} textAnchor="middle" fontSize={13} fill="hsl(var(--foreground))">
                {s.ad.split(' ')[0]}
              </text>
              <text x={x + sutunGen / 2} y={H - alt + 30} textAnchor="middle" fontSize={13} fill="hsl(var(--muted-foreground))">
                {s.ad.split(' ')[1]}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
