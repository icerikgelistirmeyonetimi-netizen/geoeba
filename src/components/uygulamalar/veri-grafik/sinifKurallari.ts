/**
 * Veri ve Grafik — sınıf düzeyine göre içerik kuralları (saf, React'siz).
 *
 * Tablom bir örnek veriye bağlıyken örneğin sınıfı (5–8) uygulamanın gösterdiklerini öğretim programına göre süzer
 * (alan uzmanı incelemesi, 4. tur):
 * - 5. sınıf: yalnız veriyi görselleştiren grafikler (Nokta, Sütun, Daire); merkezi eğilim ve yayılım ölçüsü yok
 *   (tepe değer dahil); dairede ve sütunlarda açı ve yüzde yazılmaz, sıklık tablosunda göreli sıklık ve merkez açı
 *   sütunu yok; iki yönlü sıklık tablosu varken tek yönlü tablo gösterilmez.
 * - 6. sınıf: Çizgi yerine Kök-yaprak gösterimi, Saçılım yok; ölçüler aritmetik ortalama, ortanca, tepe değer, açıklık
 *   (ortalama mutlak sapma ve standart sapma yok).
 * - 7. ve 8. sınıf: bütün grafikler; ortalama mutlak sapma var, standart sapma (lise ölçüsü) yok.
 * - 5–8. sınıf: iki veri grubu tek grafikte, ikili gruplar hâlinde karşılaştırılır (sütunlar ve nokta yığınları yan
 *   yana; "önce birinci grup, sonra ikinci grup" değil).
 * Örneğe bağlı olmayan tablo (kendi tablonuz, veri toplama) ya da sınıfı olmayan örnek bugünkü bütün davranışla
 * çalışır: lise ve serbest kullanım değişmez.
 *
 * İlkokul (alan uzmanı incelemesi, 4. tur, satır 181; TYMM MAT.1.4.1, MAT.2.4.1, MAT.3.4.1, MAT.4.4.2): kategorik veri,
 * en çok iki veri grubu; merkezi eğilim ve yayılım ölçüsü, yüzde ve açı yok; daire, çizgi, kök-yaprak ve saçılım yok.
 * Programın temsilleri: çetele ve sıklık tablosu (İstatistik sekmesi "Sıklık tablosu" adını alır, tabloda çetele
 * sütunu) ve sınıfın grafiği — 1. sınıf nesne grafiği (her veri bir resim), 2. sınıf şekil grafiği (her veri bir kare),
 * 3. sınıf nokta grafiği, 4. sınıf nokta grafiği ve sütun grafiği ("Sütunlara dönüştür" yalnız 4. sınıfta).
 * Kademe menüsünde İlkokul seçiliyken 1–4. sınıf örneğine bağlı olmayan her tablo (kendi tablonuz, veri toplama, 5–8.
 * sınıf örneği) ilkokulun ortak kurallarıyla (ILKOKUL_KURALLARI: 4. sınıfın temsilleri) çalışır.
 */
import { ilkokulSinifi, type GrafikTuru, type SinifDuzeyi } from './veri';

/** Nokta sekmesinin her veriyi çizdiği biçim: nokta (daire), şekil (kare; şekil grafiği) ya da nesne (resim; nesne grafiği) */
export type NoktaSekli = 'nokta' | 'sekil' | 'nesne';

/** İstatistik ölçüleri (İstatistik paneli, nokta grafiğinin seçenek şeridi, hesaplama adımları) */
export interface OlcuKumesi {
  /** Aritmetik ortalama, ortanca, tepe değer */
  merkezi: boolean;
  aciklik: boolean;
  oms: boolean;
  standartSapma: boolean;
}

export interface SinifKurallari {
  sinif: SinifDuzeyi | null;
  /** Araç çubuğunda görünen grafik sekmeleri (SEKMELER sırasıyla) */
  sekmeler: readonly GrafikTuru[];
  olculer: OlcuKumesi;
  /** Daire ve sütun grafiğinde yüzde / merkez açı yazıları; sıklık tablosunda göreli sıklık ve merkez açı sütunları */
  yuzdeVeAci: boolean;
  /** İki yönlü (anahtara göre) sıklık tablosu varken tek yönlü sıklık tablosu da gösterilsin mi */
  tekYonluTabloIleBirlikte: boolean;
  /**
   * İki veri grubu (ikinci sayısal değişken ya da kategorik değişkene göre gruplar) tek grafikte, ikili gruplar hâlinde
   * karşılaştırılır: Sütun'da yan yana sütun çiftleri, Nokta'da her değerde yan yana yığınlar. Değilse bugünkü gibi
   * (Nokta'da alt alta paneller, Sütun'da tek değişken).
   */
  tekGrafikteKarsilastir: boolean;
  /** Sekmelerin bu sınıftaki adı (ilkokul: "Nesne grafiği", "Sıklık tablosu" …); yazılmayan sekme kendi adıyla */
  sekmeAdlari: Partial<Record<GrafikTuru, string>>;
  /** Nokta sekmesinde her veri: nokta, şekil (kare) ya da nesne (resim) */
  noktaSekli: NoktaSekli;
  /** Sıklık tablosunda çetele (ilkokul: çetele ve sıklık tablosu birlikte) */
  cetele: boolean;
  /** Nokta grafiğinin şeridinde "Sütunlara dönüştür" (ilkokulda yalnız sütun grafiğinin olduğu 4. sınıfta) */
  sutunaDonustur: boolean;
}

const TUM_SEKMELER: readonly GrafikTuru[] = ['nokta', 'sutun', 'cizgi', 'daire', 'sacilim', 'istatistik'];
const HEPSI: OlcuKumesi = { merkezi: true, aciklik: true, oms: true, standartSapma: true };
const OLCUSUZ: OlcuKumesi = { merkezi: false, aciklik: false, oms: false, standartSapma: false };
/** 5–8. sınıf ve sınıfsız tablo: sekme adları, nokta biçimi ve sütun dönüşümü bugünkü gibi; çetele yok */
const ORTAOKUL_TEMSILLERI = { sekmeAdlari: {}, noktaSekli: 'nokta', cetele: false, sutunaDonustur: true } as const;

/** İlkokulun ortak kuralları: ölçü, yüzde ve açı yok; çetele ve sıklık tablosu; iki grup tek grafikte */
const ILKOKUL_ORTAK = {
  olculer: OLCUSUZ,
  yuzdeVeAci: false,
  tekYonluTabloIleBirlikte: false,
  tekGrafikteKarsilastir: true,
  cetele: true,
} as const;
const SIKLIK_TABLOSU = 'Sıklık tablosu';

const KURALLAR: Record<SinifDuzeyi, Omit<SinifKurallari, 'sinif'>> = {
  1: {
    ...ILKOKUL_ORTAK,
    sekmeler: ['nokta', 'istatistik'],
    sekmeAdlari: { nokta: 'Nesne grafiği', istatistik: SIKLIK_TABLOSU },
    noktaSekli: 'nesne',
    sutunaDonustur: false,
  },
  2: {
    ...ILKOKUL_ORTAK,
    sekmeler: ['nokta', 'istatistik'],
    sekmeAdlari: { nokta: 'Şekil grafiği', istatistik: SIKLIK_TABLOSU },
    noktaSekli: 'sekil',
    sutunaDonustur: false,
  },
  3: {
    ...ILKOKUL_ORTAK,
    sekmeler: ['nokta', 'istatistik'],
    sekmeAdlari: { nokta: 'Nokta grafiği', istatistik: SIKLIK_TABLOSU },
    noktaSekli: 'nokta',
    sutunaDonustur: false,
  },
  4: {
    ...ILKOKUL_ORTAK,
    sekmeler: ['nokta', 'sutun', 'istatistik'],
    sekmeAdlari: { nokta: 'Nokta grafiği', sutun: 'Sütun grafiği', istatistik: SIKLIK_TABLOSU },
    noktaSekli: 'nokta',
    sutunaDonustur: true,
  },
  5: {
    sekmeler: ['nokta', 'sutun', 'daire', 'istatistik'],
    olculer: { merkezi: false, aciklik: false, oms: false, standartSapma: false },
    yuzdeVeAci: false,
    tekYonluTabloIleBirlikte: false,
    tekGrafikteKarsilastir: true,
    ...ORTAOKUL_TEMSILLERI,
  },
  6: {
    sekmeler: ['nokta', 'sutun', 'kokYaprak', 'daire', 'istatistik'],
    olculer: { merkezi: true, aciklik: true, oms: false, standartSapma: false },
    yuzdeVeAci: true,
    tekYonluTabloIleBirlikte: true,
    tekGrafikteKarsilastir: true,
    ...ORTAOKUL_TEMSILLERI,
  },
  7: {
    sekmeler: TUM_SEKMELER,
    olculer: { merkezi: true, aciklik: true, oms: true, standartSapma: false },
    yuzdeVeAci: true,
    tekYonluTabloIleBirlikte: true,
    tekGrafikteKarsilastir: true,
    ...ORTAOKUL_TEMSILLERI,
  },
  8: {
    sekmeler: TUM_SEKMELER,
    olculer: { merkezi: true, aciklik: true, oms: true, standartSapma: false },
    yuzdeVeAci: true,
    tekYonluTabloIleBirlikte: true,
    tekGrafikteKarsilastir: true,
    ...ORTAOKUL_TEMSILLERI,
  },
};

/** Sınıfı olmayan tablo: bütün grafikler ve ölçüler (bugünkü davranış) */
export const SERBEST_KURALLAR: SinifKurallari = {
  sinif: null,
  sekmeler: TUM_SEKMELER,
  olculer: HEPSI,
  yuzdeVeAci: true,
  tekYonluTabloIleBirlikte: true,
  tekGrafikteKarsilastir: false,
  ...ORTAOKUL_TEMSILLERI,
};

/**
 * İlkokul kademesinde 1–4. sınıf örneğine bağlı olmayan tablo (kendi tablonuz, veri toplama, 5–8. sınıf örneği):
 * ilkokulun en geniş temsilleri (4. sınıf) — nokta grafiği, sütun grafiği, çetele ve sıklık tablosu; ölçü, yüzde, açı yok
 */
export const ILKOKUL_KURALLARI: SinifKurallari = { ...KURALLAR[4], sinif: null };

/**
 * Tablonun kuralları: bağlı örneğin sınıfı (1–8) varsa o sınıfın kuralları; yoksa sınıfsız davranış. `ilkokul`
 * (Kademe menüsünde İlkokul seçili) iken 1–4. sınıf dışındaki her tablo ilkokulun ortak kurallarını alır.
 */
export function sinifKurallari(sinif: SinifDuzeyi | null | undefined, ilkokul = false): SinifKurallari {
  if (ilkokul && !ilkokulSinifi(sinif)) return ILKOKUL_KURALLARI;
  if (sinif === null || sinif === undefined || !(sinif in KURALLAR)) return SERBEST_KURALLAR;
  return { sinif, ...KURALLAR[sinif] };
}

/** Sekmenin bu kurallardaki adı (ilkokulda "Nesne grafiği", "Sıklık tablosu" …; yoksa `ad`) */
export function sekmeAdi(sekme: GrafikTuru, ad: string, k: SinifKurallari): string {
  return k.sekmeAdlari[sekme] ?? ad;
}

/** Sekme bu sınıfta görünür mü */
export function sekmeSinifta(sekme: GrafikTuru, k: SinifKurallari): boolean {
  return k.sekmeler.includes(sekme);
}

/** Sınıfta görünmeyen sekme seçiliyse (kayıt, rehber eylemi, panel önerisi) Nokta'ya dönülür */
export function sinifSekmesi(sekme: GrafikTuru, k: SinifKurallari): GrafikTuru {
  return sekmeSinifta(sekme, k) ? sekme : 'nokta';
}

/** Nokta grafiğinin seçenek şeridindeki ölçü düğmeleri bu sınıfta var mı */
export function olcuDugmesiVar(olcu: 'ortalama' | 'ortanca' | 'oms' | 'standartSapma', k: SinifKurallari): boolean {
  if (olcu === 'oms') return k.olculer.oms;
  if (olcu === 'standartSapma') return k.olculer.standartSapma;
  return k.olculer.merkezi;
}
