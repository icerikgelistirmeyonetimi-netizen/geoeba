'use client';

/** Algoritma Laboratuvarı — ekranların ortak yardımcıları (görev ve atölye ekranı). */
import React, { useEffect, useRef, useState } from 'react';
import type { Iz } from './yorumlayici';

export const DAR_ESIK = 900;
export const DUGME =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-[15px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45';
export const GOSTERGE = 'inline-flex min-h-[44px] items-center gap-2 rounded-full bg-card/95 px-3 text-[15px] font-extrabold text-foreground shadow-sm ring-1 ring-border backdrop-blur';

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

/** Kabın boyutu (offsetWidth/Height: pencere açılış dönüşümü ölçüyü küçültmesin) */
export function useBoyut<T extends HTMLElement>(): [React.RefObject<T>, { en: number; boy: number }] {
  const ref = useRef<T>(null);
  const [b, setB] = useState({ en: 1200, boy: 700 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const olc = () => setB({ en: el.offsetWidth, boy: el.offsetHeight });
    olc();
    const ro = new ResizeObserver(olc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, b];
}

/** Tarayıcının Türkçe sesiyle okur (varsa); aynı anda tek konuşma. */
export function sesliOku(metin: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  try {
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(metin);
    u.lang = 'tr-TR';
    u.rate = 0.92;
    const ses = s.getVoices().find((v) => v.lang?.toLowerCase().startsWith('tr'));
    if (ses) u.voice = ses;
    s.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function sesiSustur() {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {
    /* yok */
  }
}

/** İzin k. adımına kadarki blok sayımları (koddaki canlı rozetler) */
export function sayimlarKadar(iz: Iz | null, k: number) {
  if (!iz || k < 0) return null;
  const s: Record<string, { calisma: number; evet: number; hayir: number }> = {};
  for (let i = 0; i <= k && i < iz.adimlar.length; i++) {
    const a = iz.adimlar[i];
    const x = (s[a.blokId] ??= { calisma: 0, evet: 0, hayir: 0 });
    if (a.tur === 'eylem' || a.tur === 'tur') x.calisma += 1;
    else if (a.tur === 'kosul') {
      x.calisma += 1;
      if (a.sonuc) x.evet += 1;
      else x.hayir += 1;
    }
  }
  return s;
}
