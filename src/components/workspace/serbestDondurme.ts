import type { Point2D } from '@/types/math';
import { ceyregeYuvarla } from './ilkokulKipi';

/** Ekran noktasının merkeze göre açısı (radyan; ekranda y aşağı doğru olduğundan işareti çevrilir: CCW +) */
const ekranAcisi = (p: Point2D, merkez: Point2D) => Math.atan2(-(p.y - merkez.y), p.x - merkez.x);

/**
 * Döndürme kolu sürüklenirken dönüş miktarı (tam derece, CCW +): basılan yerden imlece, merkez çevresinde. İlkokulda
 * çeyrek dönüşlere yuvarlanır (uzman 4. tur [179]); Shift basılıyken 15°'nin katlarına.
 */
export function serbestDonusDerecesi(bas: Point2D, imlec: Point2D, merkez: Point2D, secenek: { ilkokul: boolean; onBesli: boolean }): number {
  const derece = Math.round(((ekranAcisi(imlec, merkez) - ekranAcisi(bas, merkez)) * 180) / Math.PI);
  if (secenek.ilkokul) return ceyregeYuvarla(derece);
  return secenek.onBesli ? Math.round(derece / 15) * 15 : derece;
}
