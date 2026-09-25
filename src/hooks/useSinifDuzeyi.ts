'use client';

import { useSyncExternalStore } from 'react';
import {
  SINIF_DUZEYI_ANAHTARI,
  VARSAYILAN_SINIF_DUZEYI,
  sinifDuzeyiniCoz,
  type SinifDuzeyi,
} from '@/components/workspace/sinifDuzeyleri';

/**
 * Seçili sınıf düzeyi (menü çubuğundaki "Sınıf" menüsü). Menü çubuğu ile araç paneli ayrı ağaçlarda
 * durduğu için değer bir harici depoda tutulur; ikisi de useSinifDuzeyi ile aynı değeri okur.
 *
 * Tarayıcıya özgü bir arayüz tercihidir (araç panelinin kapalı olması gibi): localStorage'da saklanır,
 * proje dosyasına girmez. Tema tercihindeki kalıp (ThemeContext): useSyncExternalStore, sunucuda
 * varsayılan, depolama okunamaz / yazılamazsa bellekteki değerle yalnızca bu oturum.
 */

/** Okunmuş ya da seçilmiş son değer; null: henüz okunmadı. */
let secili: SinifDuzeyi | null = null;
const dinleyiciler = new Set<() => void>();

function depodanOku(): SinifDuzeyi {
  if (typeof window === 'undefined') return VARSAYILAN_SINIF_DUZEYI;
  try {
    return sinifDuzeyiniCoz(window.localStorage.getItem(SINIF_DUZEYI_ANAHTARI));
  } catch {
    // Gizli sekme, engellenmiş site verisi: varsayılanla devam
    return VARSAYILAN_SINIF_DUZEYI;
  }
}

/** Şu anki sınıf düzeyi (React dışı okuma; bileşenler useSinifDuzeyi kullanır). */
export function sinifDuzeyiniOku(): SinifDuzeyi {
  if (secili === null) secili = depodanOku();
  return secili;
}

function sunucuDegeri(): SinifDuzeyi {
  return VARSAYILAN_SINIF_DUZEYI;
}

/** Değişiklikleri dinler; başka bir sekmedeki seçim de (storage olayı) buraya yansır. */
export function sinifDuzeyineAbone(dinleyici: () => void): () => void {
  dinleyiciler.add(dinleyici);
  const baskaSekme = (olay: StorageEvent) => {
    // key null: başka sekmede localStorage.clear() — varsayılana döner
    if (olay.key !== null && olay.key !== SINIF_DUZEYI_ANAHTARI) return;
    secili = sinifDuzeyiniCoz(olay.newValue);
    dinleyici();
  };
  window.addEventListener('storage', baskaSekme);
  return () => {
    dinleyiciler.delete(dinleyici);
    window.removeEventListener('storage', baskaSekme);
  };
}

/** Seçimi uygular ve saklar. Depolama kapalıysa seçim yalnızca bu oturumda geçerli olur. */
export function sinifDuzeyiniAyarla(yeni: SinifDuzeyi): void {
  secili = yeni;
  try {
    window.localStorage.setItem(SINIF_DUZEYI_ANAHTARI, String(yeni));
  } catch {
    /* depolama kapalı ya da dolu: seçim bellekte kalır */
  }
  dinleyiciler.forEach((dinleyici) => dinleyici());
}

/** [seçili düzey, düzeyi değiştir] */
export function useSinifDuzeyi(): [SinifDuzeyi, (yeni: SinifDuzeyi) => void] {
  const duzey = useSyncExternalStore(sinifDuzeyineAbone, sinifDuzeyiniOku, sunucuDegeri);
  return [duzey, sinifDuzeyiniAyarla];
}
