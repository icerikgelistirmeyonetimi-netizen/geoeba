'use client';

import { useSyncExternalStore } from 'react';
import {
  ESKI_SINIF_DUZEYI_ANAHTARI,
  KADEME_DUZEYI_ANAHTARI,
  VARSAYILAN_KADEME_DUZEYI,
  kademeDuzeyiniCoz,
  type KademeDuzeyi,
} from '@/components/workspace/kademeDuzeyleri';

/**
 * Seçili kademe (menü çubuğundaki "Kademe" menüsü: ilkokul, ortaokul, lise ya da tüm araçlar). Menü çubuğu
 * ile araç paneli ayrı ağaçlarda durduğu için değer bir harici depoda tutulur; ikisi de useKademeDuzeyi ile
 * aynı değeri okur.
 *
 * Tarayıcıya özgü bir arayüz tercihidir (araç panelinin kapalı olması gibi): localStorage'da saklanır,
 * proje dosyasına girmez. Tema tercihindeki kalıp (ThemeContext): useSyncExternalStore, sunucuda
 * varsayılan, depolama okunamaz / yazılamazsa bellekteki değerle yalnızca bu oturum.
 */

/** Okunmuş ya da seçilmiş son değer; null: henüz okunmadı. */
let secili: KademeDuzeyi | null = null;
const dinleyiciler = new Set<() => void>();

function depodanOku(): KademeDuzeyi {
  if (typeof window === 'undefined') return VARSAYILAN_KADEME_DUZEYI;
  try {
    const kayit = window.localStorage.getItem(KADEME_DUZEYI_ANAHTARI);
    if (kayit !== null) return kademeDuzeyiniCoz(kayit);
    // Önceki sürüm sınıf sınıf saklıyordu ('5'): sınıfın kademesine taşınır, eski kayıt silinir
    const eski = window.localStorage.getItem(ESKI_SINIF_DUZEYI_ANAHTARI);
    if (eski === null) return VARSAYILAN_KADEME_DUZEYI;
    const duzey = kademeDuzeyiniCoz(eski);
    try {
      window.localStorage.setItem(KADEME_DUZEYI_ANAHTARI, duzey);
      window.localStorage.removeItem(ESKI_SINIF_DUZEYI_ANAHTARI);
    } catch {
      /* yazılamadıysa taşıma bir sonraki açılışta yinelenir */
    }
    return duzey;
  } catch {
    // Gizli sekme, engellenmiş site verisi: varsayılanla devam
    return VARSAYILAN_KADEME_DUZEYI;
  }
}

/** Şu anki kademe (React dışı okuma; bileşenler useKademeDuzeyi kullanır). */
export function kademeDuzeyiniOku(): KademeDuzeyi {
  if (secili === null) secili = depodanOku();
  return secili;
}

function sunucuDegeri(): KademeDuzeyi {
  return VARSAYILAN_KADEME_DUZEYI;
}

/** Değişiklikleri dinler; başka bir sekmedeki seçim de (storage olayı) buraya yansır. */
export function kademeDuzeyineAbone(dinleyici: () => void): () => void {
  dinleyiciler.add(dinleyici);
  const baskaSekme = (olay: StorageEvent) => {
    // key null: başka sekmede localStorage.clear() — varsayılana döner
    if (olay.key !== null && olay.key !== KADEME_DUZEYI_ANAHTARI) return;
    secili = kademeDuzeyiniCoz(olay.newValue);
    dinleyici();
  };
  window.addEventListener('storage', baskaSekme);
  return () => {
    dinleyiciler.delete(dinleyici);
    window.removeEventListener('storage', baskaSekme);
  };
}

/** Seçimi uygular ve saklar. Depolama kapalıysa seçim yalnızca bu oturumda geçerli olur. */
export function kademeDuzeyiniAyarla(yeni: KademeDuzeyi): void {
  secili = yeni;
  try {
    window.localStorage.setItem(KADEME_DUZEYI_ANAHTARI, yeni);
  } catch {
    /* depolama kapalı ya da dolu: seçim bellekte kalır */
  }
  dinleyiciler.forEach((dinleyici) => dinleyici());
}

/** [seçili kademe, kademeyi değiştir] */
export function useKademeDuzeyi(): [KademeDuzeyi, (yeni: KademeDuzeyi) => void] {
  const duzey = useSyncExternalStore(kademeDuzeyineAbone, kademeDuzeyiniOku, sunucuDegeri);
  return [duzey, kademeDuzeyiniAyarla];
}
