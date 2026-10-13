'use client';

/**
 * Sütun grafiklerinin eksen okları (uzman incelemesi, 4. tur: "eksenlerin ucuna ok"): dikey eksenin üst ucunda yukarı,
 * yatay eksenin sağ ucunda sağa bakan dolu ok başı. Eksen çizgisi ok başının tabanına kadar uzatılır (çağıran çizer).
 */
import React from 'react';
import { RENK } from './grafikOrtak';

/** Ok başının boyu ve yarı genişliği (px) */
const OK_BOYU = 9;
const OK_YARI = 4.5;

export function EksenOklari({ x, ustY, y, sagX }: { x: number; ustY: number; y: number; sagX: number }) {
  return (
    <g data-eksen-oklari="" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <path d={`M ${x} ${ustY - OK_BOYU} L ${x - OK_YARI} ${ustY} L ${x + OK_YARI} ${ustY} Z`} fill={RENK.metin} data-eksen-oku="dikey" />
      <path d={`M ${sagX + OK_BOYU} ${y} L ${sagX} ${y - OK_YARI} L ${sagX} ${y + OK_YARI} Z`} fill={RENK.metin} data-eksen-oku="yatay" />
    </g>
  );
}
