/**
 * Olasılık Laboratuvarı — 5. sınıf «olasılık spektrumu» (saf mantık; vitest ile sınanır).
 *
 * TEGM Ortaokul Komisyonu (20.10.2026): 5. sınıf programında yalnız öznel olasılık yaklaşımı vardır; öğrenciye spektrum
 * üzerinde işaretleme ve öznel olasılık soruları sorulur. TYMM MAT.5.6.1: bir olayın olasılığı 0 (imkânsız) ile 1 (kesin)
 * arasındadır (0 ve 1 dâhil; olasılık spektrumu). MAT.5.6.2: olaylar az ya da çok olasılıklı diye yapılandırılır.
 * Terimler GeoEBA'nın 5. sınıf kazanım içerikleriyle aynıdır: imkânsız, eşit olasılıklı, kesin; az olasılıklı, çok
 * olasılıklı. Deney, sayaç, sıklık ve teorik hesap yoktur; öğrenci olayı kendi bilgisiyle spektruma yerleştirir.
 */

export type SpektrumDuragi = 'imkansiz' | 'az' | 'esit' | 'cok' | 'kesin';

export const SPEKTRUM_DURAKLARI: readonly SpektrumDuragi[] = ['imkansiz', 'az', 'esit', 'cok', 'kesin'];

export const DURAK_ADLARI: Record<SpektrumDuragi, string> = {
  imkansiz: 'İmkânsız',
  az: 'Az olasılıklı',
  esit: 'Eşit olasılıklı',
  cok: 'Çok olasılıklı',
  kesin: 'Kesin',
};

/** Durağın spektrumdaki değeri (sayı doğrusunun altında yazılır); az ve çok bir nokta değil, bir aralıktır */
export const DURAK_DEGERLERI: Record<SpektrumDuragi, string> = {
  imkansiz: '0',
  az: '0 ile 1/2 arası',
  esit: '1/2',
  cok: '1/2 ile 1 arası',
  kesin: '1',
};

/** Durağın spektrum üzerindeki konumu (0–1; çizim için) */
export const DURAK_KONUMLARI: Record<SpektrumDuragi, number> = { imkansiz: 0, az: 0.25, esit: 0.5, cok: 0.75, kesin: 1 };

/** Olayın yanında gösterilen nesne: torbanın içi, çarkın dilimleri ya da sayı küpü / madenî para simgesi */
export type SpektrumGorseli =
  | { tur: 'torba'; bilyeler: readonly { ad: string; renk: string; adet: number }[] }
  | { tur: 'cark'; dilimler: readonly { ad: string; renk: string }[] }
  | { tur: 'zar' }
  | { tur: 'para' }
  | { tur: 'gunluk' };

export interface SpektrumKarti {
  id: string;
  /** Kartın olay cümlesi */
  olay: string;
  /** Spektrumdaki işaretin kısa adı */
  kisaAd: string;
  dogru: SpektrumDuragi;
  /** Doğru durağın gerekçesi (dönütte) */
  gerekce: string;
  gorsel: SpektrumGorseli;
}

const SARI = { ad: 'Sarı', renk: '#e0b64a' };
const MAVI = { ad: 'Mavi', renk: '#216a78' };
const KIRMIZI = { ad: 'Kırmızı', renk: '#c9463d' };
const YESIL = { ad: 'Yeşil', renk: '#3f9a6a' };

/**
 * On kart, her duraktan ikisi. Sıra: ardışık iki kart aynı durakta değildir ve duraklar düzenli bir örüntüyle gelmez.
 * Günlük yaşam, madenî para, sayı küpü, torba ve çark olayları karışıktır (tek nesne, tek olay: bileşik olay yok).
 */
export const SPEKTRUM_KARTLARI: readonly SpektrumKarti[] = [
  {
    id: 'gunes-batidan',
    olay: 'Yarın sabah güneşin batıdan doğması',
    kisaAd: 'Güneş batıdan',
    dogru: 'imkansiz',
    gerekce: 'Güneş her sabah doğudan doğar; batıdan doğması hiç olmaz. Olasılığı 0’dır.',
    gorsel: { tur: 'gunluk' },
  },
  {
    id: 'tura',
    olay: 'Madenî para atıldığında tura gelmesi',
    kisaAd: 'Tura',
    dogru: 'esit',
    gerekce: 'Paranın iki yüzü var: yazı ve tura. Tura gelme ile yazı gelme eşit olasılıklıdır. Olasılığı 1/2’dir.',
    gorsel: { tur: 'para' },
  },
  {
    id: 'sari-bilye',
    olay: '8 sarı ve 2 mavi bilye olan torbadan sarı bilye çekmek',
    kisaAd: 'Sarı bilye',
    dogru: 'cok',
    gerekce: 'Torbadaki bilyelerin çoğu sarı. Sarı bilye çekmek çok olasılıklıdır; olasılığı 1/2’den büyük, 1’den küçüktür.',
    gorsel: { tur: 'torba', bilyeler: [{ ...SARI, adet: 8 }, { ...MAVI, adet: 2 }] },
  },
  {
    id: 'zar-alti',
    olay: 'Sayı küpü atıldığında 6 gelmesi',
    kisaAd: '6 gelmesi',
    dogru: 'az',
    gerekce: 'Sayı küpünün altı yüzünden yalnız birinde 6 var. 6 gelmesi az olasılıklıdır; olasılığı 0’dan büyük, 1/2’den küçüktür.',
    gorsel: { tur: 'zar' },
  },
  {
    id: 'zar-yediden-kucuk',
    olay: 'Sayı küpü atıldığında 7’den küçük bir sayı gelmesi',
    kisaAd: '7’den küçük',
    dogru: 'kesin',
    gerekce: 'Sayı küpündeki bütün sayılar (1, 2, 3, 4, 5, 6) 7’den küçüktür. Bu olay mutlaka olur. Olasılığı 1’dir.',
    gorsel: { tur: 'zar' },
  },
  {
    id: 'cark-yari',
    olay: 'Yarısı kırmızı, yarısı mavi olan çarkta okun kırmızı dilimde durması',
    kisaAd: 'Kırmızıda durma',
    dogru: 'esit',
    gerekce: 'Çarkın yarısı kırmızı, yarısı mavi. Okun kırmızıda durması ile mavide durması eşit olasılıklıdır. Olasılığı 1/2’dir.',
    gorsel: { tur: 'cark', dilimler: [KIRMIZI, MAVI, KIRMIZI, MAVI] },
  },
  {
    id: 'mavi-bilye',
    olay: '8 sarı ve 2 mavi bilye olan torbadan mavi bilye çekmek',
    kisaAd: 'Mavi bilye',
    dogru: 'az',
    gerekce: 'Torbada mavi bilye var ama azınlıkta. Mavi bilye çekmek az olasılıklıdır; olasılığı 0’dan büyük, 1/2’den küçüktür.',
    gorsel: { tur: 'torba', bilyeler: [{ ...SARI, adet: 8 }, { ...MAVI, adet: 2 }] },
  },
  {
    id: 'zar-yedi',
    olay: 'Sayı küpü atıldığında 7 gelmesi',
    kisaAd: '7 gelmesi',
    dogru: 'imkansiz',
    gerekce: 'Sayı küpünün yüzlerinde 1’den 6’ya kadar sayılar var; 7 yok. 7 gelmesi imkânsızdır. Olasılığı 0’dır.',
    gorsel: { tur: 'zar' },
  },
  {
    id: 'cark-yesil',
    olay: 'Dört eş diliminden üçü yeşil, biri kırmızı olan çarkta okun yeşil dilimde durması',
    kisaAd: 'Yeşilde durma',
    dogru: 'cok',
    gerekce: 'Çarkın dört diliminden üçü yeşil. Okun yeşilde durması çok olasılıklıdır; olasılığı 1/2’den büyük, 1’den küçüktür.',
    gorsel: { tur: 'cark', dilimler: [YESIL, YESIL, YESIL, KIRMIZI] },
  },
  {
    id: 'pazartesi',
    olay: 'Pazar gününden sonraki günün pazartesi olması',
    kisaAd: 'Pazartesi',
    dogru: 'kesin',
    gerekce: 'Haftanın günleri hep aynı sırayla gelir: Pazardan sonra her zaman pazartesi gelir. Olasılığı 1’dir.',
    gorsel: { tur: 'gunluk' },
  },
];

export interface SpektrumKartDurumu {
  /** Öğrencinin seçtiği durak */
  secim: SpektrumDuragi | null;
  /** Kontrol edilen seçim (dönüt bunun içindir); seçim değişince silinir */
  kontrol: SpektrumDuragi | null;
}

export const BOS_SPEKTRUM_DURUMU: SpektrumKartDurumu = { secim: null, kontrol: null };

/** Durak seçimi; doğru yerleşmiş kart kilitlidir (yanlış kontrol edilen kartta yeni seçim dönütü siler) */
export function durakSec(kart: SpektrumKarti, d: SpektrumKartDurumu, durak: SpektrumDuragi): SpektrumKartDurumu {
  if (yerlesti(kart, d)) return d;
  return { secim: durak, kontrol: null };
}

/** Kartın doğru durağa yerleştirilip kontrol edildiği */
export function yerlesti(kart: SpektrumKarti, d: SpektrumKartDurumu): boolean {
  return d.kontrol !== null && d.kontrol === kart.dogru;
}

export function kontrolEt(d: SpektrumKartDurumu): SpektrumKartDurumu {
  return d.secim === null ? d : { ...d, kontrol: d.secim };
}

export interface SpektrumDonutu {
  dogru: boolean;
  /** "Doğru: Bu olay eşit olasılıklıdır." · "Bu olay az olasılıklı değil." */
  karar: string;
  /** Doğruysa gerekçe; değilse ipucu (doğru cevap verilmez, yeniden denenir) */
  aciklama: string;
}

/** Bir durağın yönü: imkânsızdan kesine doğru sırası */
const SIRA: Record<SpektrumDuragi, number> = { imkansiz: 0, az: 1, esit: 2, cok: 3, kesin: 4 };

export function donut(kart: SpektrumKarti, d: SpektrumKartDurumu): SpektrumDonutu | null {
  if (d.kontrol === null) return null;
  if (d.kontrol === kart.dogru) return { dogru: true, karar: `Doğru: Bu olay ${DURAK_ADLARI[kart.dogru].toLocaleLowerCase('tr-TR')}.`, aciklama: kart.gerekce };
  const yon = SIRA[kart.dogru] > SIRA[d.kontrol] ? 'kesine' : 'imkânsıza';
  return {
    dogru: false,
    karar: `Bu olay ${DURAK_ADLARI[d.kontrol].toLocaleLowerCase('tr-TR')} değil.`,
    aciklama: `Olayı yeniden düşün: Spektrumda ${yon} daha yakın bir yere yerleştir.`,
  };
}

/** Dönütten sonra gidilecek kart: sıradaki bitmemiş kart (sona gelince baştan); hepsi bittiyse null */
export function siradakiKart(aktif: number, bitenler: readonly boolean[]): number | null {
  const n = bitenler.length;
  for (let k = 1; k <= n; k++) {
    const i = (aktif + k) % n;
    if (!bitenler[i]) return i;
  }
  return null;
}
