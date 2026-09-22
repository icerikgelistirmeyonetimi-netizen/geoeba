'use client';

/**
 * Veri ve Grafik — bileşenlerin paylaştığı küçük yardımcılar:
 * boyut gözlemi (ResizeObserver), azaltılmış hareket tercihi, SVG → PNG indirme, ortak sınıf adları.
 */
import React, { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { sekmeOkTusu } from '../sekmeler';

export interface Boyut {
  genislik: number;
  yukseklik: number;
}

/** Elemanın içerik boyutunu izler; pencere boyutu değişince grafik yeniden ölçeklenir */
export function useBoyut<T extends HTMLElement>(ref: RefObject<T>, varsayilan: Boyut = { genislik: 0, yukseklik: 0 }): Boyut {
  const [boyut, setBoyut] = useState<Boyut>(varsayilan);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const oku = () => {
      const r = el.getBoundingClientRect();
      setBoyut((onceki) => {
        const g = Math.round(r.width);
        const y = Math.round(r.height);
        return onceki.genislik === g && onceki.yukseklik === y ? onceki : { genislik: g, yukseklik: y };
      });
    };
    oku();
    if (typeof ResizeObserver === 'undefined') return;
    const gozlemci = new ResizeObserver(oku);
    gozlemci.observe(el);
    return () => gozlemci.disconnect();
  }, [ref]);
  return boyut;
}

/** prefers-reduced-motion: reduce → animasyonlar kapalı */
export function useAzaltilmisHareket(): boolean {
  const [azalt, setAzalt] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const guncelle = () => setAzalt(mq.matches);
    guncelle();
    mq.addEventListener('change', guncelle);
    return () => mq.removeEventListener('change', guncelle);
  }, []);
  return azalt;
}

/**
 * role="radio" düğmelerinde ok tuşları (roving tabindex): Sol/Yukarı önceki, Sağ/Aşağı sonraki, Home / End;
 * seçimi değiştirir ve odağı yeni radyoya taşır. Radyolar tabIndex={seçili ? 0 : -1} almalı.
 */
export function radyoTusu(e: React.KeyboardEvent<HTMLElement>, indeks: number, adet: number, sec: (i: number) => void): void {
  const hedef = sekmeOkTusu(e.key, indeks, adet);
  if (hedef === null) return;
  e.preventDefault();
  sec(hedef);
  const grup = e.currentTarget.closest('[role="radiogroup"]');
  grup?.querySelectorAll<HTMLElement>('[role="radio"]')[hedef]?.focus();
}

/**
 * Açılır menü (menü düğmesi deseni): açılınca odak ilk menuitem'e geçer; Aşağı / Yukarı / Home / End
 * öğeler arasında dolaşır; Escape kapatıp odağı düğmeye döndürür; Tab ve dışarı tıklama kapatır.
 */
export function useAcilirMenu() {
  const [acik, setAcik] = useState(false);
  const kapRef = useRef<HTMLDivElement>(null);
  const dugmeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const kapat = useCallback((odakDugmeye = false) => {
    setAcik(false);
    if (odakDugmeye) dugmeRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!acik) return;
    menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]:not([disabled])')?.focus();
    const tik = (e: MouseEvent) => {
      if (!kapRef.current?.contains(e.target as Node)) setAcik(false);
    };
    document.addEventListener('mousedown', tik);
    return () => document.removeEventListener('mousedown', tik);
  }, [acik]);
  const menuTusu = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const ogeler = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])'));
    const i = ogeler.indexOf(document.activeElement as HTMLElement);
    let hedef: number | null = null;
    if (e.key === 'ArrowDown') hedef = (i + 1) % ogeler.length;
    else if (e.key === 'ArrowUp') hedef = (i - 1 + ogeler.length) % ogeler.length;
    else if (e.key === 'Home') hedef = 0;
    else if (e.key === 'End') hedef = ogeler.length - 1;
    else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      kapat(true);
      return;
    } else if (e.key === 'Tab') {
      kapat(false);
      return;
    }
    if (hedef === null || ogeler.length === 0) return;
    e.preventDefault();
    ogeler[hedef]?.focus();
  };
  const dugmeTusu = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' && !acik) {
      e.preventDefault();
      setAcik(true);
    }
  };
  return { acik, setAcik, kapat, kapRef, dugmeRef, menuRef, menuTusu, dugmeTusu };
}

export const GECIS = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** SVG içinde kullanılan tema renkleri (CSS değişkenleri; PNG'de hesaplanmış değerle çözülür) */
export const RENK = {
  metin: 'hsl(var(--foreground))',
  solukMetin: 'hsl(var(--muted-foreground))',
  kenar: 'hsl(var(--border))',
  birincil: 'hsl(var(--primary))',
  vurgu: 'hsl(var(--ring))',
  kart: 'hsl(var(--card))',
  zemin: 'hsl(var(--background))',
  izgara: 'hsl(var(--grid-color))',
  mercan: '#d9805f',
  altin: '#b9884a',
  lavanta: '#7f88c4',
} as const;

export const DUGME =
  'inline-flex items-center justify-center gap-1.5 h-11 min-w-[44px] px-3 rounded-[calc(var(--radius)-6px)] border border-border bg-card text-[13px] font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';

export const DUGME_BIRINCIL =
  'inline-flex items-center justify-center gap-1.5 h-11 min-w-[44px] px-3 rounded-[calc(var(--radius)-6px)] bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-opacity whitespace-nowrap';

export const SECIM =
  'h-11 rounded-[calc(var(--radius)-6px)] border border-border bg-card px-2 text-[13px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const ONAY_KUTUSU = 'h-6 w-6 accent-[hsl(var(--primary))] cursor-pointer';

export function dosyaIndir(blob: Blob, ad: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const RENK_NITELIKLERI = ['fill', 'stroke', 'color'] as const;

/** Canlı ağaçtaki hesaplanmış renkleri klona yazar (CSS değişkenleri PNG'de çözümsüz kalmasın) */
function renkleriCoz(canli: SVGSVGElement, klon: SVGSVGElement): void {
  const canliDugumler = [canli, ...Array.from(canli.querySelectorAll<SVGElement>('*'))];
  const klonDugumler = [klon, ...Array.from(klon.querySelectorAll<SVGElement>('*'))];
  canliDugumler.forEach((el, i) => {
    const k = klonDugumler[i];
    if (!k) return;
    const hesaplanmis = window.getComputedStyle(el);
    for (const nitelik of RENK_NITELIKLERI) {
      const nitelikDegeri = el.getAttribute(nitelik) ?? '';
      const stilDegeri = el.style.getPropertyValue(nitelik);
      if (nitelikDegeri.includes('var(') || stilDegeri.includes('var(')) {
        const cozulmus = hesaplanmis.getPropertyValue(nitelik);
        if (cozulmus) {
          k.setAttribute(nitelik, cozulmus);
          k.style.setProperty(nitelik, cozulmus);
        }
      }
    }
    const yaziTipi = hesaplanmis.fontFamily;
    if (el.tagName.toLowerCase() === 'text' && yaziTipi) k.style.fontFamily = yaziTipi;
    // Geçiş animasyonları PNG'ye taşınmaz
    k.style.transition = 'none';
  });
}

/** SVG → canvas → PNG dosyası (2× çözünürlük) */
export async function svgPngIndir(svg: SVGSVGElement, dosyaAdi: string): Promise<void> {
  const genislik = svg.clientWidth || Number(svg.getAttribute('width')) || 800;
  const yukseklik = svg.clientHeight || Number(svg.getAttribute('height')) || 500;
  const klon = svg.cloneNode(true) as SVGSVGElement;
  klon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  klon.setAttribute('width', String(genislik));
  klon.setAttribute('height', String(yukseklik));
  renkleriCoz(svg, klon);
  const zemin = window.getComputedStyle(svg).backgroundColor;
  const metin = new XMLSerializer().serializeToString(klon);
  const svgUrl = URL.createObjectURL(new Blob([metin], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const resim = await new Promise<HTMLImageElement>((coz, reddet) => {
      const img = new Image();
      img.onload = () => coz(img);
      img.onerror = () => reddet(new Error('SVG çizilemedi'));
      img.src = svgUrl;
    });
    const olcek = 2;
    const tuval = document.createElement('canvas');
    tuval.width = genislik * olcek;
    tuval.height = yukseklik * olcek;
    const ctx = tuval.getContext('2d');
    if (!ctx) throw new Error('Canvas yok');
    ctx.fillStyle = zemin && zemin !== 'rgba(0, 0, 0, 0)' ? zemin : '#fbf7ee';
    ctx.fillRect(0, 0, tuval.width, tuval.height);
    ctx.drawImage(resim, 0, 0, tuval.width, tuval.height);
    const blob = await new Promise<Blob | null>((coz) => tuval.toBlob(coz, 'image/png'));
    if (!blob) throw new Error('PNG üretilemedi');
    dosyaIndir(blob, dosyaAdi);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/** Dosya adı için güvenli kısaltma */
export function dosyaAdiTemizle(metin: string): string {
  const harita: Record<string, string> = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u' };
  return (
    metin
      .replace(/[çÇğĞıİöÖşŞüÜ]/g, (h) => harita[h] ?? h)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'grafik'
  );
}

/** İşaretçi olayını SVG yerel koordinatına çevirir (SVG piksel ölçeğinde çizildiği için doğrudan) */
export function svgKonumu(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const r = svg.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

/** Tablolarda kategori rengini gösteren küçük renk noktası (renk anahtarı, frekans ve iki yönlü tablolar) */
export function RenkNoktasi({ renk }: { renk: string | undefined }) {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" aria-hidden="true">
      <circle cx="6" cy="6" r="5.5" fill={renk} />
    </svg>
  );
}
