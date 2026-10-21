import React from 'react';

type GorunumSimgesiTuru = 'grid' | 'axes' | 'front' | 'top' | 'right' | 'isometric';

// Yön küpüyle aynı yerleşim: ön yüz solda, sağ yüz sağda, üst yüz yukarıda.
const YUZLER = {
  top: '12,2.5 21,7.5 12,12.5 3,7.5',
  front: '3,7.5 12,12.5 12,22 3,17',
  right: '12,12.5 21,7.5 21,17 12,22',
};

/** Dolgu hangi yüze bakılacağını gösterir; renk, menünün etkin temasından gelir. */
export function GorunumSimgesi3D({ tur }: { tur: GorunumSimgesiTuru }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      className="w-5 h-5 shrink-0"
      data-gorunum-simgesi
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {tur === 'grid' ? (
        <>
          <path d="M12 4 22 10 12 20 2 14Z" fill="currentColor" fillOpacity=".08" />
          <path d="m8.7 7.3 10 6M5.3 10.7l10 6M5.3 16l10-10M8.7 18l10-10" strokeWidth="1.3" />
        </>
      ) : tur === 'axes' ? (
        <>
          <path d="M9 14V2M6.5 4.5 9 2l2.5 2.5M9 14l12 4M18 14.5l3 3.5-4.5 1M9 14l-7 6M2 16.5V20h3.5" />
          <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          {(Object.keys(YUZLER) as (keyof typeof YUZLER)[]).map((yuz) => (
            <polygon
              key={yuz}
              points={YUZLER[yuz]}
              fill="currentColor"
              fillOpacity={tur === yuz ? 0.65 : tur === 'isometric' ? 0.3 : 0.04}
              stroke="none"
            />
          ))}
          <path d="m12 2.5 9 5V17l-9 5-9-5V7.5ZM3 7.5l9 5 9-5M12 12.5V22" />
          {tur !== 'isometric' && <polygon points={YUZLER[tur]} strokeWidth="2.1" />}
        </>
      )}
    </svg>
  );
}
