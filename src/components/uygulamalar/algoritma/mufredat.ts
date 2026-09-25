/**
 * Algoritma Laboratuvarı — müfredat: sınıflara göre üniteler (1. sınıftan başlayarak).
 * Sıra, öğrencinin önerilen yoludur; öğrenci istediği üniteye geçebilir.
 */
import type { Unite } from './gorev';
import { SINIF1 } from './sinif1';
import { SINIF2 } from './sinif2';
import { SINIF3 } from './sinif3';
import { UNITE as SINIF3_BAK } from './unite';
import { SINIF4 } from './sinif4';
import { SINIF5 } from './sinif5';
import { SINIF6 } from './sinif6';
import { SINIF7 } from './sinif7';
import { SINIF8 } from './sinif8';

export const UNITELER: readonly Unite[] = [...SINIF1, ...SINIF2, ...SINIF3, SINIF3_BAK, ...SINIF4, ...SINIF5, ...SINIF6, ...SINIF7, ...SINIF8];

export const VARSAYILAN_UNITE = UNITELER[0].id;

export function uniteBul(id: string): Unite {
  return UNITELER.find((u) => u.id === id) ?? UNITELER[0];
}

/** Sınıflara göre gruplanmış üniteler (seçim menüsü) */
export function sinifGruplari(): { sinif: number; uniteler: Unite[] }[] {
  const g = new Map<number, Unite[]>();
  for (const u of UNITELER) g.set(u.sinif, [...(g.get(u.sinif) ?? []), u]);
  return [...g.entries()].sort((a, b) => a[0] - b[0]).map(([sinif, uniteler]) => ({ sinif, uniteler: uniteler.sort((a, b) => a.no - b.no) }));
}

/** Adalar (kademeler): açılış ekranındaki sınıf kutularının adı, rengi ve tanıtımı */
export const KADEMELER = [
  { siniflar: [1, 2], ad: 'Keşif adası', renk: '#2a9d94', aciklama: 'Robotla ilk adımlar: sıra, yön, tekrar.' },
  { siniflar: [3, 4], ad: 'Mucit adası', renk: '#b8863c', aciklama: 'Karar, döngü, şekil ve simetri.' },
  { siniflar: [5, 6], ad: 'Mühendis adası', renk: '#d9805f', aciklama: 'Değişken, sayaç, formül ve örüntü.' },
  { siniflar: [7, 8], ad: 'Araştırma adası', renk: '#7f88c4', aciklama: 'Akış şeması, denklem, fonksiyon ve dönüşüm.' },
] as const;

/** Sınıfa özgü kısa tanıtım (kutudaki ikinci satır) */
const SINIF_ACIKLAMASI: Record<number, string> = {
  1: 'Robotu bahçede adım adım yürüt, döndür, saksıları sula.',
  2: 'Tekrarla, en kısa yolu bul, dronla küp kuleler kur.',
  3: 'Yönergeyi izle, simetriyi tamamla, bak ve karar ver.',
  4: 'Açıyı dönüşle ölç, şekil çiz, döngü içinde döngü kur.',
  5: 'Sayaç ve toplayıcı değişkenler, tarla ve örüntü kuralı.',
  6: 'Formüllü algoritma, bölünebilme, genel terim, en büyük.',
  7: 'Algoritmayı akış şemasıyla ifade et, prizma kur, yansıt.',
  8: 'Koordinat, doğrusal fonksiyon, öteleme ve üslü artış.',
};

export function kademe(sinif: number): { ad: string; renk: string; aciklama: string } {
  const k = KADEMELER.find((x) => (x.siniflar as readonly number[]).includes(sinif)) ?? KADEMELER[0];
  return { ad: k.ad, renk: k.renk, aciklama: SINIF_ACIKLAMASI[sinif] ?? k.aciklama };
}

/** Sınıf kutusunun görseli: o sınıfın en tanıtıcı ünitesinin sahnesi */
export const VITRIN: Record<number, string> = {
  1: 's1-sula',
  2: 's2-kule',
  3: 's3-simetri',
  4: 's4-icice',
  5: 's5-tarla',
  6: 's6-terim',
  7: 's7-prizma',
  8: 's8-oteleme',
};

