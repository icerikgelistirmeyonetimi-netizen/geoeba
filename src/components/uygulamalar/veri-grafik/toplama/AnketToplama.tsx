'use client';

/**
 * Anket iş yüzeyi (Topla · Anket; VT §6.5): gruplu ankette "CEVAP VEREN: [6-A] [6-B]" segmenti ve seçenek
 * kutucukları (ad, büyük sayı, küçük yüzde, çetele) + "+ Seçenek ekle" kutucuğu. Kutucuk renkleri grafikteki kategori
 * renkleriyle aynıdır. Dokunuş panelde satıra dönüşür (`anketSatiri`).
 */
import React from 'react';
import { secenekSayilari, type Arastirma } from '../arastirma';
import type { VeriTablosu } from '../veri';
import { GrupSecici } from './GrupSecici';
import { SecenekKutucuklari } from './SecenekKutucuklari';
import { anketKutucuklari } from './panelYardimcilari';

export interface AnketToplamaProps {
  arastirma: Arastirma;
  tablo: VeriTablosu;
  onCevap: (secenek: string) => void;
  /** "+ Seçenek ekle": false dönerse ad reddedildi */
  onSecenekEkle: (ad: string) => boolean | void;
  onGrupSec: (indeks: number) => void;
  azaltilmisHareket: boolean;
  kilitli?: boolean;
}

export function AnketToplama({ arastirma, tablo, onCevap, onSecenekEkle, onGrupSec, azaltilmisHareket, kilitli = false }: AnketToplamaProps) {
  const kutucuklar = anketKutucuklari(tablo, arastirma);
  const g = arastirma.anket.grup;
  const sayim = g ? secenekSayilari(tablo, arastirma) : null;
  const grupSayilari = sayim ? sayim.gruplar.map((_, k) => sayim.satirlar.reduce((t, s) => t + (s.gruplar[k] ?? 0), 0)) : undefined;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-yuzey="anket">
      {g && <GrupSecici grup={g} onSec={onGrupSec} baslik="Cevap veren" sayilar={grupSayilari} />}
      <SecenekKutucuklari
        className="min-h-0 flex-1"
        kutucuklar={kutucuklar}
        onSec={(i) => {
          const k = kutucuklar[i];
          if (k) onCevap(k.etiket);
        }}
        onSecenekEkle={onSecenekEkle}
        azaltilmisHareket={azaltilmisHareket}
        kilitli={kilitli}
      />
    </div>
  );
}
