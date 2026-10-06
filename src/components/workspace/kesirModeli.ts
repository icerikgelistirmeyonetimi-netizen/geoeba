/**
 * "Kesir Göster" (Kesirle Göster) aracının ayarı: pay, payda ve model (daire ya da şerit).
 *
 * Alan uzmanı (3. sınıf, 2. tur): "Kesri göster seçeneğinde sadece 1/1 kesri daire şeklinde yapılabilmektedir."
 * Araç tuvale hep 1/1 daire koyuyordu; pay ve payda yalnız Özellikler panelinden değişiyordu. Artık tuvalin üstündeki
 * kesir çubuğunda (KesirAraciCubugu) pay, payda ve model seçilir; araç tuvale bu kesri koyar, seçili kesir modeli de
 * çubuktan değişir. İlkokulda payda 2-12 (TYMM: yarım, çeyrek, birim kesirler, payı paydasından büyük kesirler),
 * pay 1 ile iki bütün arası; ortaokul ve lisede Özellikler panelinin sınırları (pay 0-30, payda 1-30).
 */
import { useSyncExternalStore } from 'react';

export type KesirModelTuru = 'pie' | 'bar';

export interface KesirAyari {
  pay: number;
  payda: number;
  model: KesirModelTuru;
}

/** Çubukta ve sesli okumada modelin adı */
export const KESIR_MODEL_ADLARI: Readonly<Record<KesirModelTuru, string>> = { pie: 'Daire', bar: 'Şerit' };

export const VARSAYILAN_KESIR_AYARI: KesirAyari = { pay: 1, payda: 2, model: 'pie' };

export interface KesirSinirlari {
  payEnAz: number;
  /** Paydaya göre en büyük pay */
  payEnCok: (payda: number) => number;
  paydaEnAz: number;
  paydaEnCok: number;
}

export const ILKOKUL_KESIR_SINIRLARI: KesirSinirlari = { payEnAz: 1, payEnCok: (payda) => 2 * payda, paydaEnAz: 2, paydaEnCok: 12 };
/** PropertiesPanel'deki kesir sürgüleriyle aynı sınırlar */
export const GENEL_KESIR_SINIRLARI: KesirSinirlari = { payEnAz: 0, payEnCok: () => 30, paydaEnAz: 1, paydaEnCok: 30 };

export const kesirSinirlari = (ilkokul: boolean): KesirSinirlari => (ilkokul ? ILKOKUL_KESIR_SINIRLARI : GENEL_KESIR_SINIRLARI);

const tamSayi = (n: unknown, varsayilan: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : varsayilan);

/** Ayarı kademenin sınırlarına çeker: önce payda, sonra paydaya göre pay; bilinmeyen model daireye düşer. */
export function kesirAyariniSinirla(ham: Partial<KesirAyari>, ilkokul: boolean): KesirAyari {
  const s = kesirSinirlari(ilkokul);
  const payda = Math.max(s.paydaEnAz, Math.min(s.paydaEnCok, tamSayi(ham.payda, VARSAYILAN_KESIR_AYARI.payda)));
  const pay = Math.max(s.payEnAz, Math.min(s.payEnCok(payda), tamSayi(ham.pay, VARSAYILAN_KESIR_AYARI.pay)));
  const model: KesirModelTuru = ham.model === 'bar' ? 'bar' : 'pie';
  return { pay, payda, model };
}

/** Nesnenin etiketi (Cebir listesi, nesne adları): "3/4 Kesir Modeli" */
export const kesirEtiketi = (pay: number, payda: number): string => `${pay}/${payda} Kesir Modeli`;

// ---------------------------------------------------------------------------------------------- aracın ayarı (bellekte)

let ayar: KesirAyari = VARSAYILAN_KESIR_AYARI;
const dinleyiciler = new Set<() => void>();

/** Aracın şu anki ayarı (tuvale yeni kesir modeli konurken okunur) */
export function kesirAyariniOku(): KesirAyari {
  return ayar;
}

export function kesirAyariniAyarla(yeni: KesirAyari): void {
  if (yeni.pay === ayar.pay && yeni.payda === ayar.payda && yeni.model === ayar.model) return;
  ayar = yeni;
  dinleyiciler.forEach((d) => d());
}

function abone(d: () => void): () => void {
  dinleyiciler.add(d);
  return () => dinleyiciler.delete(d);
}

export function useKesirAyari(): KesirAyari {
  return useSyncExternalStore(abone, kesirAyariniOku, () => VARSAYILAN_KESIR_AYARI);
}
