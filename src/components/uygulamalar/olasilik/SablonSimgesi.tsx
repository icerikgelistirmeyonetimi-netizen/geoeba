'use client';

/**
 * Şablon sekmelerinin simgeleri: emoji yerine elle çizilmiş SVG'ler (24×24).
 * Dış çizgiler currentColor'dır; sekme seçiliyken (bg-primary, beyaz yazı) açık, değilken koyu görünür.
 * Dolgular ada paletinden gelir: fener altını, fildişi, mercan, deniz, turkuaz, sıcak kraft.
 */
import React, { useId } from 'react';
import type { SablonTuru } from './olasilik';

const RENK = {
  murekkep: '#15302d',
  fildisi: '#fbf7ee',
  altin: '#c99a52',
  altinKoyu: '#8f6a33',
  mercan: '#d9805f',
  deniz: '#216a78',
  sari: '#e0b64a',
  turkuaz: '#2a9d94',
  kraft: '#d8b684',
  kirmizi: '#c9463d',
};

export interface SablonSimgesiProps {
  tur: SablonTuru;
  className?: string;
}

export function SablonSimgesi({ tur, className }: SablonSimgesiProps) {
  const kimlik = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {tur === 'para' && <Para maskeKimligi={`para-hilal-${kimlik}`} />}
      {tur === 'zar' && <Zar />}
      {tur === 'cark' && <Cark />}
      {tur === 'torba' && <Torba />}
      {tur === 'galton' && <Galton />}
      {tur === 'kart' && <Kart />}
    </svg>
  );
}

/** Madeni para: altın gövde, iç kabartma halkası, ay-yıldız. */
function Para({ maskeKimligi }: { maskeKimligi: string }) {
  return (
    <>
      <defs>
        <mask id={maskeKimligi}>
          <rect width="24" height="24" fill="#fff" />
          <circle cx="12.35" cy="12" r="2.55" fill="#000" />
        </mask>
      </defs>
      <circle cx="12" cy="12" r="9.2" fill={RENK.altin} stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.6" stroke={RENK.altinKoyu} strokeWidth="1.1" opacity="0.85" />
      <circle cx="11.2" cy="12" r="3.1" fill={RENK.fildisi} mask={`url(#${maskeKimligi})`} />
      <path d="M15 10.9l.33 1 1.05 0-.85.62.33 1-.86-.62-.85.62.32-1-.85-.62 1.05 0z" fill={RENK.fildisi} />
    </>
  );
}

/** Zar: yuvarlatılmış fildişi küp yüzü, beş nokta. */
function Zar() {
  return (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.2" fill={RENK.fildisi} stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.2 5.6h9.6" stroke="#ffffff" strokeWidth="1.2" opacity="0.8" />
      {[
        [8.3, 8.3],
        [15.7, 8.3],
        [12, 12],
        [8.3, 15.7],
        [15.7, 15.7],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.55" fill={RENK.murekkep} />
      ))}
    </>
  );
}

/** Renkli çark: dört dilim, göbek, üstte sabit ok. */
function Cark() {
  return (
    <>
      <path d="M12 12.6V3.6a9 9 0 0 1 9 9z" fill={RENK.mercan} />
      <path d="M12 12.6h9a9 9 0 0 1-9 9z" fill={RENK.deniz} />
      <path d="M12 12.6v9a9 9 0 0 1-9-9z" fill={RENK.sari} />
      <path d="M12 12.6H3a9 9 0 0 1 9-9z" fill={RENK.turkuaz} />
      <circle cx="12" cy="12.6" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12.6" r="1.7" fill={RENK.fildisi} stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 5.2L9.9 1.4h4.2z" fill="currentColor" />
    </>
  );
}

/** Torba: büzgülü kese, bağcık kuşağı, ağzından görünen iki bilye. */
function Torba() {
  return (
    <>
      <circle cx="9.9" cy="5.2" r="2" fill={RENK.mercan} stroke="currentColor" strokeWidth="1.1" />
      <circle cx="14.1" cy="4.9" r="2" fill={RENK.deniz} stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M8.2 9.3C5.1 11.2 4.2 14.6 4.9 17.4 5.7 20.2 8.2 21.3 12 21.3s6.3-1.1 7.1-3.9c.7-2.8-.2-6.2-3.3-8.1z"
        fill={RENK.kraft}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M8.2 9.3c-.6-1.2-.9-2.2-.7-3 1.4.7 7.6.7 9 0 .2.8-.1 1.8-.7 3" fill={RENK.kraft} stroke="currentColor" strokeWidth="1.3" />
      <rect x="7.6" y="8.4" width="8.8" height="2" rx="1" fill={RENK.kirmizi} stroke="currentColor" strokeWidth="1" />
      <path d="M9 14.2c1 .6 5 .6 6 0" stroke={RENK.altinKoyu} strokeWidth="1" opacity="0.7" />
    </>
  );
}

/** Galton tahtası: huni, üçgen dizilmiş çiviler, sekerek düşen bilye, kutularda çan biçimli yığın. */
function Galton() {
  const civiler: [number, number][] = [
    [12, 6.4],
    [9.8, 9.2],
    [14.2, 9.2],
    [7.6, 12],
    [12, 12],
    [16.4, 12],
  ];
  return (
    <>
      <path d="M8 1.8L12 4.2l4-2.4" stroke="currentColor" strokeWidth="1.4" />
      {civiler.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.05" fill="currentColor" />
      ))}
      <path d="M12.9 7.4c1 .4 1.4 1 1.5 1.9" stroke={RENK.mercan} strokeWidth="1" strokeDasharray="0.1 1.6" />
      <circle cx="13.3" cy="10.6" r="1.35" fill={RENK.mercan} stroke="currentColor" strokeWidth="0.8" />
      <rect x="4.6" y="18.4" width="3" height="2.4" rx="0.5" fill={RENK.turkuaz} />
      <rect x="8.6" y="15.6" width="3" height="5.2" rx="0.5" fill={RENK.turkuaz} />
      <rect x="12.4" y="15.6" width="3" height="5.2" rx="0.5" fill={RENK.turkuaz} />
      <rect x="16.4" y="18.4" width="3" height="2.4" rx="0.5" fill={RENK.turkuaz} />
      <path d="M4 14.6v6.8M8.1 14.6v6.8M12 14.6v6.8M15.9 14.6v6.8M20 14.6v6.8M3.4 21.4h17.2" stroke="currentColor" strokeWidth="1.3" />
    </>
  );
}

/** Kart destesi (şimdilik gizli şablon): arkada bir kart, önde kupa. */
function Kart() {
  return (
    <>
      <rect x="8.2" y="2.6" width="11" height="15.4" rx="2" transform="rotate(10 13.7 10.3)" fill={RENK.deniz} stroke="currentColor" strokeWidth="1.3" />
      <rect x="4.8" y="5.4" width="11" height="15.4" rx="2" fill={RENK.fildisi} stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.3 16.4s-3.2-2-3.2-4.1c0-1.1.8-1.9 1.8-1.9.6 0 1.1.3 1.4.8.3-.5.8-.8 1.4-.8 1 0 1.8.8 1.8 1.9 0 2.1-3.2 4.1-3.2 4.1z" fill={RENK.kirmizi} />
    </>
  );
}
