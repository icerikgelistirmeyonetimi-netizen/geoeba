'use client';

/**
 * WebGL yoksa deney alanındaki SVG para: 3B kapaklarla aynı görselleri kullanır.
 * Yazı yüzü kullanıcının para.eps vektöründen, tura yüzü TCMB kaynaklı Atatürk rölyefinden gelir.
 * Bir <svg> içinde, (0, 0) merkezli <g> olarak çizilir.
 */
import React from 'react';
import type { ParaYuzu } from './olasilik';
import { TURA_GORSELI } from './turaGorseli';
import { YAZI_GORSELI } from './yaziGorseli';

export function MadeniParaSvg({ yuz, r }: { yuz: ParaYuzu; r: number }) {
  const tura = yuz === 'tura';
  return (
    <g data-madeni-para={yuz}>
      <title>{tura ? 'Atatürk rölyefli 1 Türk lirası — tura yüzü' : '1 Türk lirası — yazı yüzü'}</title>
      <ellipse cx={r * 0.06} cy={r * 0.1} rx={r * 1.02} ry={r * 1.02} fill="rgba(60,40,10,0.18)" />
      <image href={tura ? TURA_GORSELI : YAZI_GORSELI} x={-r} y={-r} width={2 * r} height={2 * r} preserveAspectRatio="none" />
    </g>
  );
}
