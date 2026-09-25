/**
 * Algoritma Laboratuvarı — elle çizilmiş SVG simgeler (24×24, currentColor, emoji yok).
 */
import React from 'react';
import type { EylemTuru, KosulTuru } from './program';

type SimgeProps = { className?: string; title?: string };

function Svg({ className, title, children }: SimgeProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const SIMGE = {
  ileri: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M4 12h13" />
      <path d="M12.5 6.5 18 12l-5.5 5.5" />
    </Svg>
  ),
  sagaDon: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M6 19v-6.5A5.5 5.5 0 0 1 11.5 7H18" />
      <path d="m14.5 3.5 3.5 3.5-3.5 3.5" />
    </Svg>
  ),
  solaDon: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M18 19v-6.5A5.5 5.5 0 0 0 12.5 7H6" />
      <path d="M9.5 3.5 6 7l3.5 3.5" />
    </Svg>
  ),
  sula: (p: SimgeProps) => (
    <Svg {...p}>
      {/* Kova gövde + arkada halka kulp + süzgeçli uzun ağız: tepede ortalı kulp asma kilide benziyordu */}
      <path d="M4.5 11h9l-.8 7.2a1.6 1.6 0 0 1-1.6 1.4H6.9a1.6 1.6 0 0 1-1.6-1.4z" />
      <path d="M4.9 13.6C2.2 13.4 2 8 5.6 7.8c1.9-.1 3.2 1.2 3.4 3.2" />
      <path d="M13.3 15 19 9.2" />
      <path d="M17.3 7.5l3.2 3.2" />
      <path d="M21 13.8v.01M19.2 16.2v.01M22.1 17v.01" strokeWidth={2.6} />
    </Svg>
  ),
  topla: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M4.5 12.5h15l-1.6 6.2a1.6 1.6 0 0 1-1.55 1.2H7.65a1.6 1.6 0 0 1-1.55-1.2z" />
      <circle cx="12" cy="8" r="3.2" />
      <path d="M12 4.8V3.5M10.4 5.2 9.6 4.4M13.6 5.2l.8-.8" />
    </Svg>
  ),
  gubreVer: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M7 6.5h10l1.2 12.2a1.5 1.5 0 0 1-1.5 1.8H7.3a1.5 1.5 0 0 1-1.5-1.8z" />
      <path d="M7.5 6.5 9 3.8h6l1.5 2.7" />
      <path d="M12 16.5c-2.2-1.3-2.2-4 0-5.5 2.2 1.5 2.2 4.2 0 5.5z" />
      <path d="M12 16.5V18" />
    </Svg>
  ),
  boya: (p: SimgeProps) => (
    <Svg {...p}>
      <rect x="4.5" y="4" width="11" height="5.5" rx="1.2" />
      <path d="M15.5 6.8h3v4.7H12v3" />
      <rect x="10.8" y="14.5" width="2.4" height="5.5" rx="1" />
    </Svg>
  ),
  ek: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M12 20v-6" />
      <path d="M12 14c-3.5 0-5-2-5-5 3 0 5 2 5 5z" />
      <path d="M12 14c0-3 1.5-5 5-5 0 3-1.5 5-5 5z" />
      <path d="M6.5 20h11" />
    </Svg>
  ),
  koy: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M12 3.5 19.5 7.5v9L12 20.5 4.5 16.5v-9z" />
      <path d="M4.5 7.5 12 11.5l7.5-4" />
      <path d="M12 11.5v9" />
    </Svg>
  ),
  isaretle: (p: SimgeProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    </Svg>
  ),
  kalemKaldir: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M4 20l1.6-4.6 8.2-8.2 3 3-8.2 8.2z" />
      <path d="M18.5 9V3.5M16 6l2.5-2.5L21 6" />
    </Svg>
  ),
  kalemIndir: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M4 20l1.6-4.6 8.2-8.2 3 3-8.2 8.2z" />
      <path d="M12.5 20.5h8" />
    </Svg>
  ),
  degisken: (p: SimgeProps) => (
    <Svg {...p}>
      <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
      <path d="M7.5 10l4 4M11.5 10l-4 4" />
      <path d="M14.5 12h3" />
    </Svg>
  ),
  komut: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M8 4H6.5A2.5 2.5 0 0 0 4 6.5V10l-1.5 2L4 14v3.5A2.5 2.5 0 0 0 6.5 20H8" />
      <path d="M16 4h1.5A2.5 2.5 0 0 1 20 6.5V10l1.5 2-1.5 2v3.5a2.5 2.5 0 0 1-2.5 2.5H16" />
      <path d="M9 12h6" />
    </Svg>
  ),
  degilse: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M12 20.5V13" />
      <path d="M12 13 6.5 7.5" />
      <path d="M12 13l5.5-5.5" />
      <path d="M6.5 11V7.5H10" />
      <path d="M14 7.5h3.5V11" />
    </Svg>
  ),
  karsilastir: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M12 4v16M6 20h12" />
      <path d="M4 9h6M14 9h6" />
      <path d="M4 9l-1.5 4.5a2.8 2.8 0 0 0 5.5 0L6.5 9M17.5 9 16 13.5a2.8 2.8 0 0 0 5.5 0L20 9" />
    </Svg>
  ),
  bloklar: (p: SimgeProps) => (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="5" rx="1.5" />
      <rect x="8" y="11" width="12" height="4" rx="1.3" />
      <rect x="4" y="17" width="16" height="3.5" rx="1.2" />
    </Svg>
  ),
  sozde: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M5 6h10M8 10h9M8 14h7M5 18h10" />
    </Svg>
  ),
  akis: (p: SimgeProps) => (
    <Svg {...p}>
      <rect x="8" y="2.8" width="8" height="4.2" rx="2.1" />
      <path d="M12 7v2.4" />
      <path d="M12 9.4 16 12.5 12 15.6 8 12.5z" />
      <path d="M12 15.6V18" />
      <rect x="8.5" y="18" width="7" height="3.4" rx=".8" />
    </Svg>
  ),
  tekrarlaKadar: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M17.5 8.5A6.5 6.5 0 1 0 18.5 13" />
      <path d="M18.8 4.8v4.2h-4.2" />
      <path d="M11 9.2v6.3" />
      <path d="M11 9.3h3.8l-1 1.4 1 1.4H11" />
    </Svg>
  ),
  tekrarlaKez: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M17.5 8.5A6.5 6.5 0 1 0 18.5 13" />
      <path d="M18.8 4.8v4.2h-4.2" />
      <path d="M10.2 10.5 12 9.2v6" />
    </Svg>
  ),
  eger: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M12 3.5 20.5 12 12 20.5 3.5 12z" />
      <path d="M10 10a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.7" />
      <path d="M12 15.8v.01" strokeWidth={2.4} />
    </Svg>
  ),
  // Koşullar (sensör)
  cikistayim: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M6 20.5V4" />
      <path d="M6 4.5h10.5l-2.2 3 2.2 3H6" />
    </Svg>
  ),
  toprakKuru: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M3.5 15.5h17" />
      <path d="M3.5 15.5 5 20h14l1.5-4.5" />
      <path d="M9 15.5l1.3 1.7-1 1.6M14.5 15.5l-1 1.5 1.3 1.8" />
      <circle cx="17" cy="7" r="2.6" />
      <path d="M17 2.5v1M17 10.5v1M21.5 7h-1M13.5 7h-1" />
    </Svg>
  ),
  domatesKirmizi: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M12 7.2c-4.6 0-7.2 2.8-7.2 6.2S7.6 20 12 20s7.2-3.2 7.2-6.6S16.6 7.2 12 7.2z" />
      <path d="M12 7.2 9.5 5.4M12 7.2l2.5-1.8M12 7.2V4" />
    </Svg>
  ),
  yaprakSari: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M5 19c0-8 5-13.5 14-14-0.5 9-6 14-14 14z" />
      <path d="M5 19c3-3.5 6-6.5 10-9" />
    </Svg>
  ),
  // Arayüz
  oynat: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />
    </Svg>
  ),
  duraklat: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M8.5 5.5v13M15.5 5.5v13" strokeWidth={2.6} />
    </Svg>
  ),
  adim: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M6 6.5v11l8-5.5z" fill="currentColor" stroke="none" />
      <path d="M17.5 6.5v11" strokeWidth={2.4} />
    </Svg>
  ),
  geriAdim: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M18 6.5v11L10 12z" fill="currentColor" stroke="none" />
      <path d="M6.5 6.5v11" strokeWidth={2.4} />
    </Svg>
  ),
  basa: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4v4.2h4.2" />
    </Svg>
  ),
  sina: (p: SimgeProps) => (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="m7.8 9.3 1.5 1.5 2.7-2.7M13.8 9.6h3M7.8 15l1.5 1.5 2.7-2.7M13.8 15.3h3" />
    </Svg>
  ),
  ipucu: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M9 17.5h6M10 20.5h4" />
      <path d="M12 3.5a5.8 5.8 0 0 0-3.4 10.5c.6.5 1 1.2 1 2V16.5h4.8V16c0-.8.4-1.5 1-2A5.8 5.8 0 0 0 12 3.5z" />
    </Svg>
  ),
  kalip: (p: SimgeProps) => (
    <Svg {...p}>
      <rect x="6.5" y="3.5" width="12" height="15.5" rx="2.2" />
      <path d="M4.5 7v11.8A2 2 0 0 0 6.5 20.8h9" />
      <path d="M9.5 8h6M9.5 11.2h6M9.5 14.4h3.5" />
    </Svg>
  ),
  ogretmen: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15.5H5.5A1.5 1.5 0 0 0 4 21z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15.5h5.5A1.5 1.5 0 0 1 20 21z" />
    </Svg>
  ),
  sinif: (p: SimgeProps) => (
    <Svg {...p}>
      <rect x="3.5" y="4" width="17" height="11.5" rx="1.8" />
      <path d="M8 20.5l2-5M16 20.5l-2-5M12 4V2.8" />
    </Svg>
  ),
  yazdir: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M7 8.5V3.5h10v5" />
      <rect x="3.5" y="8.5" width="17" height="8" rx="2" />
      <path d="M7 14.5h10v6H7z" />
    </Svg>
  ),
  mikrofon: (p: SimgeProps) => (
    <Svg {...p}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" />
      <path d="M5.8 11.5a6.2 6.2 0 0 0 12.4 0M12 17.8v2.7" />
    </Svg>
  ),
  ustten: (p: SimgeProps) => (
    <Svg {...p}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M4 10h16M4 14h16M10 4v16M14 4v16" strokeWidth={1.4} />
    </Svg>
  ),
  yandan: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M3.5 15.5 12 11l8.5 4.5L12 20z" />
      <path d="M3.5 15.5V10L12 5.5l8.5 4.5v5.5M12 11V5.5" />
    </Svg>
  ),
  onay: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeWidth={2.4} />
    </Svg>
  ),
  carpi: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M7 7l10 10M17 7 7 17" strokeWidth={2.2} />
    </Svg>
  ),
  kapat: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Svg>
  ),
  arti: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M12 6v12M6 12h12" strokeWidth={2.2} />
    </Svg>
  ),
  eksi: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M6 12h12" strokeWidth={2.2} />
    </Svg>
  ),
  sil: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M5 7h14M10 4h4M7 7l.9 12a1.5 1.5 0 0 0 1.5 1.4h5.2a1.5 1.5 0 0 0 1.5-1.4L17 7" />
    </Svg>
  ),
  kalem: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M4.5 19.5l1-4L15.8 5.2a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.9L8.5 18.5z" />
      <path d="M13.8 7.2l3 3" />
    </Svg>
  ),
  el: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M8 12.5V6.2a1.4 1.4 0 0 1 2.8 0v5M10.8 11V4.7a1.4 1.4 0 0 1 2.8 0V11M13.6 11V6a1.4 1.4 0 0 1 2.8 0v6.5" />
      <path d="M16.4 10.5a1.4 1.4 0 0 1 2.8 0v3.3A6.7 6.7 0 0 1 12.5 20.5h-.6a6 6 0 0 1-4.7-2.3L4.8 15a1.5 1.5 0 0 1 2.3-1.9L8 14" />
    </Svg>
  ),
  kitap: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M5 4.5h11.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2z" />
      <path d="M5 18a2 2 0 0 1 2-2h11.5" />
    </Svg>
  ),
  deney: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M9.5 3.5h5M10.5 3.5v6L5 18.5A1.5 1.5 0 0 0 6.3 20.5h11.4a1.5 1.5 0 0 0 1.3-2L13.5 9.5v-6" />
      <path d="M7.5 14.5h9" />
    </Svg>
  ),
  yildiz: ({ className, dolu }: SimgeProps & { dolu?: boolean }) => (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.1 2.7 1-5.7-4.1-4 5.7-.8z"
        fill={dolu ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  ),
  kilit: (p: SimgeProps) => (
    <Svg {...p}>
      <rect x="5.5" y="10.5" width="13" height="10" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </Svg>
  ),
  ok: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="m9 5.5 6.5 6.5L9 18.5" />
    </Svg>
  ),
  hoparlor: (p: SimgeProps) => (
    <Svg {...p}>
      <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </Svg>
  ),
  soru: (p: SimgeProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.9.7-.9 1.3v.6" />
      <path d="M12 16.6v.01" strokeWidth={2.4} />
    </Svg>
  ),
} as const;

export function EylemSimgesi({ eylem, className }: { eylem: EylemTuru; className?: string }) {
  const S = SIMGE[eylem];
  return <S className={className} />;
}

export function KosulSimgesi({ kosul, className }: { kosul: KosulTuru; className?: string }) {
  const S = SIMGE[kosul];
  return <S className={className} />;
}
