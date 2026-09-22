'use client';

/**
 * Tuvalin boş alanına sağ tıklayınca açılan "Grafik" menüsünün elle çizilmiş simgeleri (16×16).
 * Çizgiler currentColor'dır; menü maddesinin rengine (soluk / etkin) uyar.
 */
import React from 'react';

/** Eksenler: ok uçlu yatay ve dikey eksen, üzerinde küçük bölme çizgileri */
export function EksenSimgesi() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 14.5V1.8M3.3 3.5 5 1.8l1.7 1.7" />
      <path d="M1.5 11h12.7M12.5 9.3l1.7 1.7-1.7 1.7" />
      <path d="M8 10.2v1.6M11 10.2v1.6M4.2 8h1.6M4.2 5h1.6" strokeWidth="1.1" />
    </svg>
  );
}

/** Izgara biçimi önizlemesi: boş, kareli, noktalı ya da izometrik zemin */
export function IzgaraSimgesi({ bicim }: { bicim: 'yok' | 'kareli' | 'noktali' | 'izometrik' }) {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" strokeWidth="1.3" />
      {bicim === 'kareli' && <path d="M5.8 1.5v13M10.2 1.5v13M1.5 5.8h13M1.5 10.2h13" strokeWidth="1" />}
      {/* İzometrik: dikey çizgi ve ±30° eğik çizgiler (eşkenar üçgen örgü) */}
      {bicim === 'izometrik' && (
        <path d="M8 1.5v13M1.5 4.5 14.5 12M1.5 12 14.5 4.5M1.5 8.3 8 12.1M8 4.5l6.5 3.8" strokeWidth="0.95" />
      )}
      {bicim === 'noktali' &&
        [4.5, 8, 11.5].flatMap((x) =>
          [4.5, 8, 11.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.95" fill="currentColor" stroke="none" />)
        )}
    </svg>
  );
}
