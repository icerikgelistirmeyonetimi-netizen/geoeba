'use client';

/**
 * Sütun grafiklerinin eksen okları (uzman incelemesi, 4. tur: "eksenlerin ucuna ok"): dikey eksenin üst ucunda yukarı,
 * yatay eksenin sağ ucunda sağa bakan açık ok başı. Okun sivri ucu eksen çizgisinin ucuyla çakışır.
 */
import React from 'react';
import { RENK } from './grafikOrtak';

/** Ok başının boyu ve yarı genişliği (px) */
const OK_BOYU = 9;
const OK_YARI = 4.5;

export function EksenOklari({ x, ustY, y, sagX }: { x: number; ustY: number; y: number; sagX: number }) {
  return (
    <g data-eksen-oklari="" aria-hidden="true" style={{ pointerEvents: 'none' }}>
      <polyline points={`${x - OK_YARI} ${ustY + OK_BOYU} ${x} ${ustY} ${x + OK_YARI} ${ustY + OK_BOYU}`} fill="none" stroke={RENK.metin} strokeWidth={1.5} data-eksen-oku="dikey" />
      <polyline points={`${sagX - OK_BOYU} ${y - OK_YARI} ${sagX} ${y} ${sagX - OK_BOYU} ${y + OK_YARI}`} fill="none" stroke={RENK.metin} strokeWidth={1.5} data-eksen-oku="yatay" />
    </g>
  );
}
