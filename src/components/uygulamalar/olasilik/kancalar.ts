'use client';

/**
 * Olasılık Laboratuvarı — laboratuvar ve ilkokul «olay kartları» görünümünün ortak kancaları
 * (koyu tema, azaltılmış hareket). Sahne (DeneyAlani) bu iki değerle kurulur.
 */
import { useEffect, useState } from 'react';

export function useKoyuTema(): boolean {
  const [koyu, setKoyu] = useState(false);
  useEffect(() => {
    const kok = document.documentElement;
    const guncelle = () => setKoyu(kok.classList.contains('dark'));
    guncelle();
    const mo = new MutationObserver(guncelle);
    mo.observe(kok, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return koyu;
}

export function useAzHareket(): boolean {
  const [az, setAz] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const guncelle = () => setAz(mq.matches);
    guncelle();
    mq.addEventListener('change', guncelle);
    return () => mq.removeEventListener('change', guncelle);
  }, []);
  return az;
}
