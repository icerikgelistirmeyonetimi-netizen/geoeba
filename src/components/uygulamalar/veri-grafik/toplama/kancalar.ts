import { useEffect, useLayoutEffect } from 'react';

/**
 * Tarayıcıda useLayoutEffect (canlandırma ilk boyamadan önce başlar, titreme olmaz), sunucuda useEffect
 * (SSR uyarısı çıkmaz). Sahnelerin Web Animations kurulumu bunu kullanır.
 */
export const useCizimEtkisi = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
