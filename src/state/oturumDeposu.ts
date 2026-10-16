import type { LevelId } from '@/types/curriculum';

/** Eski ortak kayıt, bir kademe oturumuna kendiliğinden aktarılmaz. */
export function oturumKayitAnahtari(anahtar: string, kademe: LevelId | null): string {
  return kademe ? `${anahtar}_${kademe}` : anahtar;
}

export function oturumKaydiniOku(anahtar: string, kademe: LevelId | null): string | null {
  return localStorage.getItem(oturumKayitAnahtari(anahtar, kademe));
}

export function oturumKaydiniYaz(anahtar: string, kademe: LevelId | null, deger: string): void {
  localStorage.setItem(oturumKayitAnahtari(anahtar, kademe), deger);
}
