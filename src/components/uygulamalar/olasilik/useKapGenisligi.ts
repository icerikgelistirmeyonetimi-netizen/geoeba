'use client';

/** Kap genişliğini ResizeObserver ile izler (pencere boyutu değişince grafikler yeniden ölçeklenir). */
import { useLayoutEffect, useRef, useState } from 'react';

export function useKapGenisligi<T extends HTMLElement = HTMLElement>(varsayilan = 320): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [genislik, setGenislik] = useState(varsayilan);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const olc = () => {
      const stil = getComputedStyle(el);
      const ic = el.clientWidth - parseFloat(stil.paddingLeft || '0') - parseFloat(stil.paddingRight || '0');
      if (ic > 0) setGenislik(Math.round(ic));
    };
    olc();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(olc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, genislik];
}
