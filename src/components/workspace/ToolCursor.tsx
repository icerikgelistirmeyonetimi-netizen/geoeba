'use client';

import React, { useEffect, useRef } from 'react';
import { Hand } from 'lucide-react';
import { ToolMode } from '@/types/workspace';
import { TOOL_GROUPS } from './toolDefinitions';

const tools = TOOL_GROUPS.flatMap(group => group.tools);

/** Rozetin ok imlecine göre kayması: okun sağ altında durur, ucunu ve seçilecek nesneyi örtmez. */
const ROZET_KAYDIRMA_X = 14;
const ROZET_KAYDIRMA_Y = 16;

/**
 * Etkin aracın küçük rozeti gerçek imlecin sağ altında onu izler. Ok imleci görünür kalır; böylece
 * nokta / kenar gibi küçük hedefler ucuyla hassas seçilir (rozet imlecin yerini aldığında seçmek zordu).
 * Seç ve el araçlarında imlecin kendisi aracı anlattığı için rozet çizilmez; dokunmatikte de gösterilmez.
 */
export function ToolCursor({ tool, surfaceRef }: {
  tool: ToolMode;
  surfaceRef: React.RefObject<SVGSVGElement>;
}) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const selected = tools.find(item => item.id === tool);
  const rozetsiz = tool === 'select' || tool === 'pan';

  useEffect(() => {
    const surface = surfaceRef.current;
    const badge = badgeRef.current;
    if (!surface || !badge) return;
    const hide = () => {
      badge.style.visibility = 'hidden';
    };
    const move = (event: PointerEvent) => {
      if (rozetsiz || event.pointerType === 'touch' ||
          (event.target instanceof Element && event.target.closest('foreignObject'))) {
        hide();
        return;
      }
      const bounds = surface.parentElement!.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      badge.style.transform = `translate(${x + ROZET_KAYDIRMA_X}px, ${y + ROZET_KAYDIRMA_Y}px)`;
      badge.style.visibility = 'visible';
    };
    surface.addEventListener('pointerenter', move);
    surface.addEventListener('pointermove', move, true);
    surface.addEventListener('pointerleave', hide);
    surface.addEventListener('pointercancel', hide);
    window.addEventListener('blur', hide);
    return () => {
      hide();
      surface.removeEventListener('pointerenter', move);
      surface.removeEventListener('pointermove', move, true);
      surface.removeEventListener('pointerleave', hide);
      surface.removeEventListener('pointercancel', hide);
      window.removeEventListener('blur', hide);
    };
  }, [surfaceRef, rozetsiz]);

  if (rozetsiz) return null;

  return <div ref={badgeRef} data-tool-cursor={tool} aria-hidden="true"
    style={{ visibility: 'hidden' }}
    className={`absolute left-0 top-0 z-30 pointer-events-none w-[22px] h-[22px] rounded-md border border-border shadow-sm bg-card flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5 ${selected?.iconColor ?? 'text-foreground'}`}>
    {selected?.icon ?? <Hand className="w-3.5 h-3.5" />}
  </div>;
}
