'use client';

import React from 'react';
import { type YazimAyari, aciklama, olcuDugumleri, sesli } from '@/math/matematikYazimi';
import type { PanelSatiri } from '@/math/panelYazimlari';
import { MatematikMetni } from './MatematikMetni';

/**
 * Panel satırı (Cebir listesi, Özellikler paneli, araç kutusu nesne listesi).
 *
 * Ölçü satırı MEB yazımıyla çizilir (şapkalı açı, yay imi, mutlak değer çizgisi) ve ekran okuyucuya
 * sözcük biçimini verir; yazımı olmayan satır (doğru denklemi, fonksiyon ifadesi) düz metin kalır ve
 * paneldeki tek aralıklı (mono) görünümünü korur.
 */
export function PanelOlcusu({
  satir,
  ayar,
  className = '',
  metinSinifi,
  as,
  ipucu = true,
}: {
  satir: PanelSatiri;
  ayar?: YazimAyari;
  className?: string;
  /** Düz metin satırına eklenecek ek sınıf (ör. 'font-mono') */
  metinSinifi?: string;
  as?: 'span' | 'div';
  /** Fare ipucu (<title>) yazılsın mı? */
  ipucu?: boolean;
}) {
  if (satir.tur === 'metin') {
    const Kap = as ?? 'span';
    return <Kap className={`${className} ${metinSinifi ?? ''}`.trim()}>{satir.metin}</Kap>;
  }
  return (
    <MatematikMetni
      dugumler={olcuDugumleri(satir.olcu, ayar)}
      sesli={sesli(satir.olcu)}
      title={ipucu ? aciklama(satir.olcu) : undefined}
      ayar={ayar}
      className={className}
      as={as}
    />
  );
}
