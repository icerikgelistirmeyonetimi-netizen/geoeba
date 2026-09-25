/**
 * Sayı tuş takımı (VT §6.5 Ölçüm): 4 × 4 tuş — 7 8 9 ⌫ / 4 5 6 − / 1 2 3 , / 0 (iki hücre) · Ekle (iki hücre,
 * birincil). Tuş yüksekliği 52 px (kompakt 44, büyük ekranda 96'ya kadar). `data-tus` kararlı seçicidir. Değer girdisi
 * üst bileşendeki gerçek input'tadır; tuşlar `tusUygula` ile o metni düzenler.
 */
import React from 'react';
import { OnaySimgesi, SilSimgesi } from './simgeler';

export type SayiTusu = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'virgul' | 'eksi' | 'sil';

/** Tuşun metne etkisi (saf): rakam eklenir; virgül bir kez; eksi başa eklenir / kalkar; sil son karakteri siler */
export function tusUygula(metin: string, tus: SayiTusu, enCokUzunluk = 12): string {
  if (tus === 'sil') return metin.slice(0, -1);
  if (tus === 'eksi') return metin.startsWith('-') || metin.startsWith('−') ? metin.slice(1) : `-${metin}`;
  if (metin.replace(/^[-−]/, '').length >= enCokUzunluk) return metin;
  if (tus === 'virgul') {
    if (/[,.]/.test(metin)) return metin;
    const govde = metin.replace(/^[-−]/, '');
    return govde === '' ? `${metin}0,` : `${metin},`;
  }
  // Baştaki gereksiz sıfır: "0" + "7" → "7" (ama "0," korunur)
  if (/^[-−]?0$/.test(metin)) return `${metin.slice(0, -1)}${tus}`;
  return `${metin}${tus}`;
}

interface TusTanimi {
  tus: SayiTusu | 'ekle';
  ad: string;
  metin?: string;
  genis?: boolean;
}

const TUSLAR: TusTanimi[] = [
  { tus: '7', ad: '7' },
  { tus: '8', ad: '8' },
  { tus: '9', ad: '9' },
  { tus: 'sil', ad: 'Son rakamı sil' },
  { tus: '4', ad: '4' },
  { tus: '5', ad: '5' },
  { tus: '6', ad: '6' },
  { tus: 'eksi', ad: 'Eksi işareti', metin: '−' },
  { tus: '1', ad: '1' },
  { tus: '2', ad: '2' },
  { tus: '3', ad: '3' },
  { tus: 'virgul', ad: 'Virgül', metin: ',' },
  { tus: '0', ad: '0', genis: true },
  { tus: 'ekle', ad: 'Ekle', genis: true },
];

export interface SayiTusTakimiProps {
  onTus: (tus: SayiTusu) => void;
  onEkle: () => void;
  /** Değer okunabiliyor mu (Ekle etkin) */
  ekleEtkin: boolean;
  /** Tuş yüksekliği (px): 52 · kompakt 44 · 1920'de 72 */
  tusBoyu?: number;
  /** Negatif değer anlamsızsa (boy, nabız) eksi tuşu pasif */
  eksiVar?: boolean;
  /** Tam sayı duyarlığında virgül pasif */
  virgulVar?: boolean;
  kilitli?: boolean;
  className?: string;
}

const TUS =
  'inline-flex min-w-[44px] select-none items-center justify-center rounded-[calc(var(--radius)-6px)] border border-border bg-card font-bold text-foreground tabular-nums shadow-[0_2px_0_hsl(var(--border))] transition-[transform,background-color,box-shadow] duration-75 hover:bg-accent active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';

const EKLE =
  'inline-flex min-w-[44px] select-none items-center justify-center gap-2 rounded-[calc(var(--radius)-6px)] bg-primary font-extrabold text-primary-foreground shadow-[0_2px_0_hsl(var(--primary)/0.55)] transition-[transform,opacity,box-shadow] duration-75 hover:opacity-90 active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45';

export function SayiTusTakimi({
  onTus,
  onEkle,
  ekleEtkin,
  tusBoyu = 52,
  eksiVar = true,
  virgulVar = true,
  kilitli = false,
  className = '',
}: SayiTusTakimiProps) {
  const h = Math.max(44, tusBoyu);
  const yazi = h >= 84 ? 32 : h >= 64 ? 26 : h >= 52 ? 22 : 19;
  return (
    <div className={`grid grid-cols-4 gap-1.5 ${className}`} data-tus-takimi="">
      {TUSLAR.map((t) => {
        const pasif = kilitli || (t.tus === 'eksi' && !eksiVar) || (t.tus === 'virgul' && !virgulVar);
        if (t.tus === 'ekle') {
          return (
            <button
              key={t.tus}
              type="button"
              data-tus="ekle"
              disabled={kilitli || !ekleEtkin}
              onClick={onEkle}
              className={`${EKLE} col-span-2`}
              style={{ height: h, fontSize: Math.min(yazi - 3, 24), touchAction: 'manipulation' }}
            >
              <OnaySimgesi className="h-5 w-5" />
              Ekle
            </button>
          );
        }
        return (
          <button
            key={t.tus}
            type="button"
            data-tus={t.tus}
            aria-label={t.ad}
            disabled={pasif}
            onClick={() => onTus(t.tus as SayiTusu)}
            className={`${TUS} ${t.genis ? 'col-span-2' : ''}`}
            style={{ height: h, fontSize: yazi, touchAction: 'manipulation' }}
          >
            {t.tus === 'sil' ? <SilSimgesi className="h-6 w-6" /> : t.metin ?? t.tus}
          </button>
        );
      })}
    </div>
  );
}
