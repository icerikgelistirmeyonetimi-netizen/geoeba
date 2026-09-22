'use client';

/**
 * Renk anahtarı lejantı (SVG içinde, PNG'ye de çıkar): "Sınıf: ● A (10) ● B (10)". Kategoriler soldan sağa
 * dizilir; sığmayan kategoriler "…" ile kısaltılır. Bütün grafikler (nokta, sütun, çizgi, daire, saçılım)
 * aynı bileşeni kullanır.
 */
import React from 'react';
import type { RenkEslemesi } from './kategorik';
import { RENK } from './ortak';

export interface RenkLejantiProps {
  eslem: RenkEslemesi;
  /** lejantın başladığı x ve yazı taban çizgisi y */
  x: number;
  y: number;
  /** lejantın taşmaması gereken sağ sınır */
  sagSinir: number;
  /** kategori başına sayı (verilmezse sayı yazılmaz) */
  sayilar?: Map<string, number>;
  /** kategori başına ek metin (ör. daire grafiğinde toplamdaki pay "%54,1"); verilirse sayının yerine yazılır */
  ekler?: Map<string, string>;
}

/** 13 px kalın yazıda harf başına yaklaşık genişlik (SVG'de ölçüm yapılmaz) */
const HARF = 7.4;

function ogeMetni(k: string, sayilar?: Map<string, number>, ekler?: Map<string, string>): string {
  if (ekler) return `${k} ${ekler.get(k) ?? ''}`.trim();
  return sayilar ? `${k} (${sayilar.get(k) ?? 0})` : k;
}

/** Lejantın kısaltılmadan kaplayacağı yaklaşık genişlik (aynı satıra sığıyor mu kararı için) */
export function renkLejantiGenisligi(eslem: RenkEslemesi, sayilar?: Map<string, number>, ekler?: Map<string, string>): number {
  return eslem.kategoriler.reduce((t, k) => t + ogeMetni(k, sayilar, ekler).length * HARF + 30, eslem.ad.length * HARF + 14);
}

export function RenkLejanti({ eslem, x, y, sagSinir, sayilar, ekler }: RenkLejantiProps) {
  let imlec = x + eslem.ad.length * HARF + 14;
  const ogeler: React.ReactNode[] = [];
  let kisaldi = false;
  for (const k of eslem.kategoriler) {
    const metin = ogeMetni(k, sayilar, ekler);
    const genislik = metin.length * HARF + 30;
    if (imlec + genislik > sagSinir) {
      kisaldi = true;
      break;
    }
    ogeler.push(
      <g key={k} transform={`translate(${imlec}, ${y - 4.5})`}>
        <circle cx={7} cy={0} r={7} fill={eslem.renkler.get(k)} stroke={RENK.kart} strokeWidth={1.5} />
        <text x={19} y={4.5} fontSize={13} fontWeight={700} fill={RENK.metin}>
          {metin}
        </text>
      </g>,
    );
    imlec += genislik;
  }
  return (
    <g data-renk-lejanti style={{ pointerEvents: 'none' }}>
      <text x={x} y={y} fontSize={13} fontWeight={700} fill={RENK.solukMetin}>
        {eslem.ad}:
      </text>
      {ogeler}
      {kisaldi && (
        <text x={imlec} y={y} fontSize={13} fontWeight={700} fill={RENK.solukMetin}>
          …
        </text>
      )}
    </g>
  );
}
