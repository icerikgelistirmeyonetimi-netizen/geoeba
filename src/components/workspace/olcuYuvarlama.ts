/**
 * Ölçülerin tam sayıya yuvarlanıp yuvarlanmayacağı — kademeye göre (alan uzmanı, atölye inceleme 4. tur, ortaokul).
 *
 * Kullanıcı isteğiyle (2026-09-25) ölçüler varsayılan olarak tam sayı yazılıyordu. Ortaokul uzmanı aynı kenarın
 * tuvalde '6 cm', bildirimde ve Nesneler listesinde '5,81 br' göründüğünü, r = 2 dairenin alanının '13 br²'
 * (12,57) yazıldığını gösterdi ve 2 ondalık istedi. Karar yalnız ortaokulda geçerlidir:
 *  - ilkokul: her zaman tam sayı (alan uzmanları, 2. tur; değişmedi)
 *  - ortaokul: varsayılan 2 ondalık; Ayarlar'daki "Ölçüleri tam sayı yaz" kutusu ortaokulun KENDİ ayarını açar
 *    (tamSayiOlcuOrtaokul)
 *  - lise ve "Tüm araçlar": ortaokuldaki gibi varsayılan 2 ondalık (kullanıcı, 2026-10-30: "lisede virgüllü hesaplama
 *    ortaokuldaki gibi olsun"); kutu bu kademelerin kendi ayarını açar (tamSayiOlcuLise)
 */
import type { StyleSettings } from '@/types/workspace';
import type { KademeDuzeyi } from './kademeDuzeyleri';
import { kademeDuzeyiniOku } from '@/hooks/useKademeDuzeyi';

type TamSayiAyarlari = Partial<Pick<StyleSettings, 'tamSayiOlcuOrtaokul' | 'tamSayiOlcuLise'>>;

/** Bu kademede ölçüler tam sayı mı yazılır? */
export function tamSayiOlcuEtkin(s: TamSayiAyarlari | null | undefined, kademe: KademeDuzeyi): boolean {
  if (kademe === 'ilkokul') return true;
  if (kademe === 'ortaokul') return s?.tamSayiOlcuOrtaokul === true;
  return s?.tamSayiOlcuLise === true;
}

/** Ayarlar'daki kutunun bu kademede yazdığı alan (ilkokulda kutu kilitlidir). */
export function tamSayiAyarAnahtari(kademe: KademeDuzeyi): 'tamSayiOlcuOrtaokul' | 'tamSayiOlcuLise' {
  return kademe === 'ortaokul' ? 'tamSayiOlcuOrtaokul' : 'tamSayiOlcuLise';
}

/**
 * Ölçme aracının sonuç bildirimi (Alanı Bul, Çevre Hesapla, Uzunluk Ölç): araç her tıklamada görünür bir sonuç
 * versin. Sonuç zaten tuvaldeyse aynı etiket yeniden açılmaz, bildirim bunu söyler (alan uzmanı, 4. tur).
 */
export function olcumBildirimi(olcu: string, zatenGorunur: boolean): string {
  return zatenGorunur ? `${olcu} (etikette gösteriliyor)` : `${olcu} — etiketi sürükleyerek taşıyabilirsiniz`;
}

/**
 * Uzunluk Ölç aracının birimi: ortaokulda bütün ölçüler Ayarlar'daki varsayılan birimle (br) yazılır; aynı kenar
 * bir yerde 'cm', başka yerde 'br' görünmesin. İlkokulda da 'br' (alan uzmanı, 4. tur [177]: ekrandaki bir kare
 * aralığı gerçek bir santimetre değildir — dizüstünde ≈ 1,2 cm, akıllı tahtada 3 cm'den fazla — ve yakınlaştırmayla
 * değişir; "1 cm" yazmak standart birimi keyfî bir etikete çevirir). Lisede 'cm' kalır.
 */
export function uzunlukOlcBirimi(kademe: KademeDuzeyi): 'cm' | 'br' {
  return kademe === 'ortaokul' || kademe === 'ilkokul' ? 'br' : 'cm';
}

/** Şu anki kademede Uzunluk Ölç'ün birimi (React dışı okuma: WorkspaceContext'in araç işleyicisi). */
export const uzunlukOlcuBirimiSimdi = (): 'cm' | 'br' => uzunlukOlcBirimi(kademeDuzeyiniOku());

/** Şu anki kademede ölçüler tam sayı mı (React dışı okuma: WorkspaceContext'in ölçme bildirimi tuvalle aynı yazsın). */
export const tamSayiOlcuSimdi = (s: TamSayiAyarlari | null | undefined): boolean => tamSayiOlcuEtkin(s, kademeDuzeyiniOku());
