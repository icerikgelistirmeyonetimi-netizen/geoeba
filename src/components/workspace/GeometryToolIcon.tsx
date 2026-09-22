import React from 'react';

// Ortak 24×24 geometri dili: uç noktalar dolu, sonsuz doğrultular oklu.
const glyphs = {
  point: <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />,
  segment: <><path d="M5 18 19 6" /><circle cx="5" cy="18" r="2" fill="currentColor" /><circle cx="19" cy="6" r="2" fill="currentColor" /></>,
  line: <><path d="m3 21 18-18M3 15v6h6M15 3h6v6" /></>,
  ray: <><path d="M5 19 21 3M15 3h6v6" /><circle cx="5" cy="19" r="2" fill="currentColor" /></>,
  angle: <><path d="m17 4-13 16h17M9 14a8 8 0 0 1 3 6" /></>,
  protractor: <><path d="M3 19a9 9 0 0 1 18 0ZM12 10v3M6 13l2 2M18 13l-2 2M12 19l4-5" /></>,
  ellipse: <ellipse cx="12" cy="12" rx="9" ry="6" />,
  arc: <><path d="M4 18A9 9 0 0 1 20 7" /><circle cx="4" cy="18" r="1.5" fill="currentColor" /><circle cx="20" cy="7" r="1.5" fill="currentColor" /></>,
  // Yay Ölç: kesikli çember, iki nokta arasındaki kalın yay
  arcMeasure: <><circle cx="12" cy="12" r="8" strokeDasharray="2 3" strokeWidth="1.2" /><path d="M4.5 9.3A8 8 0 0 1 14.7 4.5" strokeWidth="3" /><circle cx="4.5" cy="9.3" r="1.6" fill="currentColor" /><circle cx="14.7" cy="4.5" r="1.6" fill="currentColor" /></>,
  polygon: <path d="m3 10 7-7 11 5-3 13-13-3Z" />,
  rectangle: <rect x="3" y="6" width="18" height="12" rx="1" />,
  area: <><rect x="4" y="4" width="16" height="16" fill="currentColor" fillOpacity=".2" /><path d="M4 12 12 4M4 18 18 4M10 20 20 10" /></>,
  perimeter: <rect x="4" y="4" width="16" height="16" strokeWidth="3" strokeDasharray="4 3" />,
  grid: <><rect x="3" y="3" width="18" height="18" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></>,
  midpoint: <><path d="M3 12h18M3 9v6M21 9v6" /><circle cx="12" cy="12" r="2.5" fill="currentColor" /></>,
  setsquare: <><path d="M3 3v18h18ZM7 12v5h5" /></>,
  compass: <><circle cx="12" cy="5" r="2" /><path d="m11 7-6 14M13 7l6 14M7 15h10M12 1v2" /></>,
  function: <><path d="M4 3v17h17M6 7c6 17 8 5 14-3" /></>,
  sphere: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12c4 4 14 4 18 0" /></>,
  prism: <><path d="m3 8 6-5 12 3v11l-6 4-12-3ZM3 8l12 3 6-5M15 11v10" /><path d="M9 3v11l12 3M3 18l6-4" strokeDasharray="2 3" /></>,
  triangularPrism: <><path d="m3 18 5-12 6 12ZM8 6l8-3 5 12-7 3M16 3l-3 10" /><path d="m3 18 10-5 8 2" strokeDasharray="2 3" /></>,
};

export function GeometryToolIcon({ kind, className = 'w-5 h-5' }: {
  kind: keyof typeof glyphs;
  className?: string;
}) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">{glyphs[kind]}</svg>;
}
