/**
 * 3B stüdyonun İLKOKUL görünüm kuralları (alan uzmanı Umut IŞIK, geoeba (3).xlsx [180]). 2B ilkokul kipi koordinat
 * eksenini kapatıyordu; 3B'de x, y, z eksenleri, –10'a kadar negatif sayılar ve "(0; 0; 0)" açık kalıyor, cisimler
 * "V = 27 br³", "Taban alanı = 9 br²", "a = 3 br" ile anılıyordu. Negatif sayılar, koordinat üçlüleri, hacim, üslü birim
 * (br², br³) ve harfle gösterilen kenar ilkokul programının kapsamı dışındadır (İGYS 3.1.1). İlkokulda:
 *  - eksenler ve koordinat yazıları yok (zemin ızgarası kalır) — kademeDuzeyleri3B.kademe3BEksenleriGosterir;
 *  - cisim özellikleri programın istediği niteliklerle sınırlı: yüz, köşe, ayrıt sayısı ve yüzlerin biçimi;
 *  - döndürme derece değil çeyrek dönüşlerle (2B'deki gibi; [179]).
 * Saf işlevler: Toolbar3D (Bağlamlar) ve Canvas3D (şeritler) okur.
 */
import type { Solid3DObject } from '@/types/workspace3d';
import { getSolidPropertyCounts, ucgenTepeX } from '@/math/geometry3d';
import { formatTurkishNumber } from '@/math/coordinates';

export interface IlkokulCisimOzellikleri {
  yuz: number;
  kose: number;
  ayrit: number;
  /** Yüzlerin biçimi: "6 kare", "2 kare, 4 dikdörtgen", "2 üçgen, 3 dikdörtgen", "2 daire, 1 eğri yüz" */
  yuzler: string;
}

const esit = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const dortgen = (u: number, v: number) => (esit(u, v) ? 'kare' : 'dikdörtgen');

/** Biçim sayaçlarını programdaki sırayla yazar: üçgen, kare, dikdörtgen, daire, eğri yüz. */
function bicimleriYaz(sayac: Record<string, number>): string {
  return ['üçgen', 'kare', 'dikdörtgen', 'daire', 'eğri yüz']
    .filter((b) => (sayac[b] ?? 0) > 0)
    .map((b) => `${sayac[b]} ${b}`)
    .join(', ');
}

/** İlkokulda cismin özellikleri: yüz / köşe / ayrıt sayısı ve yüz biçimleri (hacim, alan, harfle kenar yok). */
export function ilkokulCisimOzellikleri(solid: Pick<Solid3DObject, 'type' | 'dimensions' | 'tabanUcgeni'>): IlkokulCisimOzellikleri {
  const say = getSolidPropertyCounts(solid.type);
  const w = solid.dimensions.width || 3;
  const h = solid.dimensions.height || 3;
  const d = solid.dimensions.depth || 3;
  const sayac: Record<string, number> = {};
  const ekle = (bicim: string, adet = 1) => {
    sayac[bicim] = (sayac[bicim] ?? 0) + adet;
  };
  switch (solid.type) {
    case 'cube':
      ekle('kare', 6);
      break;
    case 'prism':
      // Alt-üst (genişlik × derinlik), ön-arka (genişlik × yükseklik), sağ-sol (derinlik × yükseklik)
      ekle(dortgen(w, d), 2);
      ekle(dortgen(w, h), 2);
      ekle(dortgen(d, h), 2);
      break;
    case 'triangular_prism': {
      // Taban üçgeni genişlik × yükseklik (xz düzleminde), prizmanın boyu derinlik: iki üçgen, üç dörtgen yan yüz
      const ax = ucgenTepeX(solid);
      ekle('üçgen', 2);
      for (const kenar of [w, Math.hypot(ax + w / 2, h), Math.hypot(w / 2 - ax, h)]) ekle(dortgen(kenar, d));
      break;
    }
    case 'pyramid':
      ekle(dortgen(w, d));
      ekle('üçgen', 4);
      break;
    case 'cylinder':
      ekle('daire', 2);
      ekle('eğri yüz');
      break;
    case 'cone':
      ekle('daire');
      ekle('eğri yüz');
      break;
    case 'sphere':
      ekle('eğri yüz');
      break;
  }
  return { yuz: say.faces, kose: say.vertices, ayrit: say.edges, yuzler: bicimleriYaz(sayac) };
}

/** Tek satır özet (şerit ve ekran okuyucu): "6 yüz (6 kare) · 8 köşe · 12 ayrıt" */
export function ilkokulOzellikMetni(solid: Pick<Solid3DObject, 'type' | 'dimensions' | 'tabanUcgeni'>): string {
  const o = ilkokulCisimOzellikleri(solid);
  return `${o.yuz} yüz (${o.yuzler}) · ${o.kose} köşe · ${o.ayrit} ayrıt`;
}

/** Büyüt ve Küçült notu ilkokulda: "Kenarlar 2 katına çıktı" (hacim ve alan katı yazılmaz). */
export function ilkokulOlcekNotu(k: number): string {
  return `Kenarlar ${formatTurkishNumber(k, 2)} katına ${k >= 1 ? 'çıktı' : 'indi'}`;
}

/**
 * İlkokulda Cismi Döndür şeridinin yönleri: eksen harfi ve derece yerine günlük dil (dönme ekseni z yukarı).
 * Her düğme cismi çeyrek dönüş (90°) çevirir.
 */
export const ILKOKUL_3B_DONUS_YONLERI = [
  { eksen: 'z', ad: 'Kendi çevresinde' },
  { eksen: 'x', ad: 'Öne doğru' },
  { eksen: 'y', ad: 'Yana doğru' },
] as const;
