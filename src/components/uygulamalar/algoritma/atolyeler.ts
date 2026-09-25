/**
 * Algoritma Laboratuvarı — Atölye projeleri (ikinci etkinlik türü), bütün sınıflar.
 * Sınıf sayfasında ünitelerin altında listelenir.
 */
import type { Atolye } from './gorev';
import { ATOLYELER_1_4 } from './atolye14';
import { ATOLYELER_5_8 } from './atolye58';

/** Her sınıfa üç proje; sınıf sırasıyla */
export const ATOLYELER: readonly Atolye[] = [...ATOLYELER_1_4, ...ATOLYELER_5_8];

export function atolyeBul(id: string): Atolye | undefined {
  return ATOLYELER.find((a) => a.id === id);
}

export function sinifAtolyeleri(sinif: number): Atolye[] {
  return ATOLYELER.filter((a) => a.sinif === sinif);
}
