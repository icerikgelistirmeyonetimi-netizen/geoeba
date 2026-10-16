import React from 'react';
import type { MathObject, Point2D, ViewportTransform } from '@/types/math';
import { worldToScreen } from '@/math/coordinates';
import { INSA_ADIMLARI, insaGeometrisi } from '@/math/insaGosterimi';

export function InsaGosterimleri({ objects, viewport }: { objects: readonly MathObject[]; viewport: ViewportTransform }) {
  const screen = (p: Point2D) => worldToScreen(p, viewport);
  return <g data-insa-yardimcilari="" pointerEvents="none">{objects.filter((o) => o.visible !== false && o.insaGosterimi).map((o) => {
    const g = insaGeometrisi(o, objects);
    if (!g) return null;
    const renk = o.color || '#0f766e';
    return <g key={o.id} stroke={renk} strokeWidth={1.5} fill="none">
      <title>{INSA_ADIMLARI[o.insaGosterimi!.tur].join(' ')}</title>
      {g.parcalar.map(([a,b],i) => { const p=screen(a), q=screen(b); return <line key={`p${i}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeOpacity={0.7} />; })}
      {g.cemberler.map((c,i) => { const p=screen(c.merkez); return <circle key={`c${i}`} cx={p.x} cy={p.y} r={c.r*viewport.zoom} strokeDasharray="5 4" strokeOpacity={0.55} />; })}
      {g.esitParcalar.map(([a,b],i) => { const p=screen(a), q=screen(b); const d=Math.hypot(q.x-p.x,q.y-p.y); if (d < 1) return null; const x=(p.x+q.x)/2,y=(p.y+q.y)/2, dx=-(q.y-p.y)/d*6,dy=(q.x-p.x)/d*6; return <line key={`e${i}`} x1={x-dx} y1={y-dy} x2={x+dx} y2={y+dy} strokeWidth={2} />; })}
      {g.noktalar.map((p,i) => { const q=screen(p); return <circle key={`n${i}`} cx={q.x} cy={q.y} r={3} fill={renk} />; })}
      {g.dik && (() => { const {kose,u,v}=g.dik; const k=screen(kose), a={x:k.x+u.x*12,y:k.y-u.y*12},c={x:k.x+v.x*12,y:k.y-v.y*12},b={x:a.x+v.x*12,y:a.y-v.y*12}; return <path d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}`} strokeWidth={2} />; })()}
    </g>;
  })}</g>;
}
