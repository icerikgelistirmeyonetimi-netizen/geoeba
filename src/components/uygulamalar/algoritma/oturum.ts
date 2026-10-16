import type { LevelId } from '@/types/curriculum';
import { UNITELER, uniteBul } from './mufredat';
import type { LabKaydi } from './kayit';

export function oturumaUygunSinif(sinif: number, kademe: LevelId | null) {
  if (!kademe) return true;
  if (kademe === 'ilkokul') return sinif >= 1 && sinif <= 4;
  if (kademe === 'ortaokul') return sinif >= 5 && sinif <= 8;
  return sinif >= 9 && sinif <= 12;
}

/** Kayıtlar korunur; yalnız açılan ünitenin mevcut oturum kademesinde olması sağlanır. */
export function oturumKaydi(kayit: LabKaydi, kademe: LevelId | null): LabKaydi {
  if (oturumaUygunSinif(uniteBul(kayit.unite).sinif, kademe)) return kayit;
  const ilk = UNITELER.find((u) => oturumaUygunSinif(u.sinif, kademe));
  return ilk ? { ...kayit, unite: ilk.id } : kayit;
}
