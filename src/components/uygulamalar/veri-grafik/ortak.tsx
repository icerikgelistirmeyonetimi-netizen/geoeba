'use client';

/**
 * Veri ve Grafik — bileşenlerin paylaştığı küçük yardımcılar:
 * boyut gözlemi (ResizeObserver), azaltılmış hareket tercihi, radyo / açılır menü klavyesi, ortak sınıf adları.
 * Grafik yardımcıları (SVG renkleri, geçiş eğrisi, PNG indirme, SVG koordinatı, renk noktası) `grafikOrtak.tsx`'te;
 * eski içe aktarmalar bozulmasın diye buradan yeniden dışa aktarılır.
 */
import React, { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { sekmeOkTusu } from '../sekmeler';

export { GECIS, RENK, dosyaIndir, svgPngIndir, svgKonumu, RenkNoktasi } from './grafikOrtak';

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
      // offsetWidth/Height yerleşim kutusudur: pencere açılış / büyütme animasyonundaki transform ölçeğinden
      // etkilenmez (getBoundingClientRect ölçeklenmiş boyutu verir, animasyon bitince ResizeObserver tetiklenmez)
      setBoyut((onceki) => {
        const g = Math.round(el.offsetWidth);
        const y = Math.round(el.offsetHeight);
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
 * Tuş "Veri topla" panelinin mi (olayın hedefi `[data-veri-topla-paneli]` içinde): panel kendi kısayollarını ve
 * Escape'ini yönetir; uygulamanın genel (document düzeyindeki) tuş işleyicileri bu tuşları yakalamaz.
 */
export function paneldekiTus(hedef: EventTarget | null): boolean {
  const e = hedef as { closest?: (secici: string) => unknown } | null;
  return !!e && typeof e.closest === 'function' && !!e.closest('[data-veri-topla-paneli]');
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
    // Odak menüde değilken de (ör. menüde odaklanacak öğe yok) Escape kapatır ve odağı düğmeye döndürür. Odak "Veri
    // topla" panelindeyken tuş panelindir (kendi Escape'i öğretmen kartını kapatır): menü tuşu yakalamaz
    const tus = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || paneldekiTus(e.target)) return;
      setAcik(false);
      dugmeRef.current?.focus();
    };
    document.addEventListener('mousedown', tik);
    document.addEventListener('keydown', tus);
    return () => {
      document.removeEventListener('mousedown', tik);
      document.removeEventListener('keydown', tus);
    };
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

export const DUGME =
  'inline-flex items-center justify-center gap-1.5 h-11 min-w-[44px] px-3 rounded-[calc(var(--radius)-6px)] border border-border bg-card text-[13px] font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';

/**
 * Dolu (basılı / etkin) zemin: birincil renk üstünde beyaz yazı. Koyu temada birincil renk açık kaldığı için
 * zemin koyulaştırılır (hsl 175 58% 30%; beyaz yazıyla karşıtlık ≈ 5,2 : 1 ≥ 4,5 : 1).
 */
export const DOLU_ZEMIN = 'bg-primary text-primary-foreground dark:bg-[hsl(175_58%_30%)] dark:text-white';

export const DUGME_BIRINCIL = `inline-flex items-center justify-center gap-1.5 h-11 min-w-[44px] px-3 rounded-[calc(var(--radius)-6px)] ${DOLU_ZEMIN} text-[13px] font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-opacity whitespace-nowrap`;

export const SECIM =
  'h-11 rounded-[calc(var(--radius)-6px)] border border-border bg-card px-2 text-[13px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const ONAY_KUTUSU = 'h-6 w-6 accent-[hsl(var(--primary))] cursor-pointer';

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

/**
 * Değişken türü çipi (değişken sekmeleri ve tablo başlıkları): sayısalda "123", kategorikte "Abc".
 * Görseldir (aria-hidden); tür, çipi taşıyan öğenin adında ya da title'ında yazılır. `className` ek sınıflardır.
 */
export function TurIsareti({ tur, className = '' }: { tur: 'sayi' | 'etiket'; className?: string }) {
  const renk =
    tur === 'sayi'
      ? 'bg-[#216a78]/[0.12] text-[#0f4c57] dark:bg-[#2a9d94]/[0.22] dark:text-[#9fe0d9]'
      : 'bg-[#7f88c4]/[0.2] text-[#454d8c] dark:bg-[#7f88c4]/[0.3] dark:text-[#d3d7f5]';
  return (
    <span
      aria-hidden="true"
      data-tur-cipi={tur}
      className={`inline-flex h-6 shrink-0 select-none items-center rounded-full px-1.5 text-[12px] font-bold leading-none tabular-nums ${renk} ${className}`}
    >
      {tur === 'sayi' ? '123' : 'Abc'}
    </span>
  );
}
