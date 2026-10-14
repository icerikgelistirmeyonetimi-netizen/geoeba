'use client';

/**
 * 2B sayı küpü (WebGL yoksa deney alanındaki SVG): «?» kutusu yerine üç yüzü görünen rakamlı küp. Üstteki rakam
 * sonuçtur; ön ve sağ yüzler 3B küpün aynı sonuçtaki yönelimiyle aynı (deneySahnesi.zarGorunenYuzler). Bir <svg>
 * içinde, verilen merkeze çizilir.
 */
import React from 'react';
import { zarGorunenYuzler, zarYuzuYazisi } from './deneySahnesi';
import type { Sablon, Sonuc } from './olasilik';

/** 2B sayı küplerinin üst yüzleri: sonuç varsa sonuç, yoksa 3B sahnenin açılış duruşu (1; ikinci küp 3). */
export function svgZarlari(sablon: Sablon, sonuc: Sonuc | null): number[] {
  if (sonuc?.tur === 'zar' && sonuc.zarlar.length) return [...sonuc.zarlar];
  return sablon.tur === 'zar' && sablon.ikiZar ? [1, 3] : [1];
}

const KUP_KENAR = 76;
/** Derinlik ekseni (eğik izdüşüm): ön yüzden arka kenara, ekranda sağ-yukarı. */
const KUP_DERINLIK = { x: 34, y: -26 } as const;

/** Bir yüzün rakamı (6 altı çizili; 3B dokudaki gibi). (0, 0) merkezli, yerel koordinatta. */
function KupRakami({ yuz }: { yuz: number }) {
  const { rakam, altiCizili } = zarYuzuYazisi(yuz);
  return (
    <>
      <text textAnchor="middle" dominantBaseline="central" fontSize="44" fontWeight="800" fill="#15302d" fontFamily="Manrope, system-ui, sans-serif">
        {rakam}
      </text>
      {altiCizili && <rect x="-10" y="21" width="20" height="3.6" rx="1.2" fill="#15302d" />}
    </>
  );
}

/**
 * 2B sayı küpü (WebGL yoksa): eğik izdüşümle üç yüz (üst, ön, sağ), yüzlerde rakam. Üstteki rakam sonuçtur; ön ve sağ
 * yüzler 3B küpün o sonuçtaki yönelimiyle aynı (zarGorunenYuzler).
 */
export function SvgSayiKupu({ ust, cx, cy }: { ust: number; cx: number; cy: number }) {
  const a = KUP_KENAR;
  const { x: dx, y: dy } = KUP_DERINLIK;
  const yuzler = zarGorunenYuzler(ust);
  // Ön yüzün sol üst köşesi: küp (genişlik a + dx, yükseklik a − dy; dy < 0) (cx, cy) çevresinde ortalanır
  const x0 = cx - (a + dx) / 2;
  const y0 = cy - (a + dy) / 2;
  const p = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const on = [p(x0, y0), p(x0 + a, y0), p(x0 + a, y0 + a), p(x0, y0 + a)].join(' ');
  const ustYuz = [p(x0, y0), p(x0 + a, y0), p(x0 + a + dx, y0 + dy), p(x0 + dx, y0 + dy)].join(' ');
  const sag = [p(x0 + a, y0), p(x0 + a + dx, y0 + dy), p(x0 + a + dx, y0 + a + dy), p(x0 + a, y0 + a)].join(' ');
  const k = (n: number) => n.toFixed(4);
  // Yerel yazı ekseninden yüze: üstte yazının «aşağısı» öğrenciye doğru (−derinlik), sağda yatay derinlik boyunca
  const ustMatris = `matrix(1 0 ${k(-dx / a)} ${k(-dy / a)} ${(x0 + a / 2 + dx / 2).toFixed(1)} ${(y0 + dy / 2).toFixed(1)})`;
  const sagMatris = `matrix(${k(dx / a)} ${k(dy / a)} 0 1 ${(x0 + a + dx / 2).toFixed(1)} ${(y0 + a / 2 + dy / 2).toFixed(1)})`;
  return (
    <g data-sayi-kupu={`${yuzler.ust}-${yuzler.on}-${yuzler.sag}`} strokeLinejoin="round">
      <polygon points={on} fill="#fbf7ee" stroke="#cbbfa4" strokeWidth="3" />
      <polygon points={ustYuz} fill="#fffdf8" stroke="#cbbfa4" strokeWidth="3" />
      <polygon points={sag} fill="#e8dcc2" stroke="#cbbfa4" strokeWidth="3" />
      <g transform={`translate(${(x0 + a / 2).toFixed(1)} ${(y0 + a / 2).toFixed(1)})`}>
        <KupRakami yuz={yuzler.on} />
      </g>
      <g transform={ustMatris}>
        <KupRakami yuz={yuzler.ust} />
      </g>
      <g transform={sagMatris} opacity={0.9}>
        <KupRakami yuz={yuzler.sag} />
      </g>
    </g>
  );
}
