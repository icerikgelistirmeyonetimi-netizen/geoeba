'use client';

/**
 * Renk anahtarı lejantı (SVG içinde, PNG'ye de çıkar): "Sınıf: ● A ● B". Kategoriler soldan sağa dizilir; sığmayan
 * kategoriler "…" ile kısaltılır. Kategorinin yanında veri sayısı yazılmaz (uzman incelemesi, 4. tur: eksen ve lejant
 * adlarının yanında parantez içinde veri sayısı yok). Bütün grafikler (nokta, sütun, çizgi, daire, saçılım) aynı
 * bileşeni kullanır.
 */
import React from 'react';
import { kenarGerekir, type RenkEslemesi } from './kategorik';
import { RENK } from './grafikOrtak';

export interface RenkLejantiProps {
  eslem: RenkEslemesi;
  /** lejantın başladığı x ve yazı taban çizgisi y */
  x: number;
  y: number;
  /** lejantın taşmaması gereken sağ sınır */
  sagSinir: number;
  /** kategori başına ek metin (ör. daire grafiğinde toplamdaki pay "%54,1") */
  ekler?: Map<string, string>;
}

/** 13 px kalın yazıda harf başına yaklaşık genişlik (SVG'de ölçüm yapılmaz) */
const HARF = 7.4;

function ogeMetni(k: string, ekler?: Map<string, string>): string {
  return ekler ? `${k} ${ekler.get(k) ?? ''}`.trim() : k;
}

/** Lejantın kısaltılmadan kaplayacağı yaklaşık genişlik (aynı satıra sığıyor mu kararı için) */
export function renkLejantiGenisligi(eslem: RenkEslemesi, ekler?: Map<string, string>): number {
  return eslem.kategoriler.reduce((t, k) => t + ogeMetni(k, ekler).length * HARF + 30, eslem.ad.length * HARF + 14);
}

export function RenkLejanti({ eslem, x, y, sagSinir, ekler }: RenkLejantiProps) {
  let imlec = x + eslem.ad.length * HARF + 14;
  const ogeler: React.ReactNode[] = [];
  let kisaldi = false;
  for (const k of eslem.kategoriler) {
    const metin = ogeMetni(k, ekler);
    const genislik = metin.length * HARF + 30;
    if (imlec + genislik > sagSinir) {
      kisaldi = true;
      break;
    }
    ogeler.push(
      <g key={k} transform={`translate(${imlec}, ${y - 4.5})`}>
        <circle cx={7} cy={0} r={7} fill={eslem.renkler.get(k)} stroke={kenarGerekir(eslem.renkler.get(k) ?? '') ? RENK.metin : RENK.kart} strokeWidth={1.5} />
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
