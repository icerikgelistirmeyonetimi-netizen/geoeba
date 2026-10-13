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
 */
import type { GrafikTuru, SinifDuzeyi } from './veri';

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
}

const TUM_SEKMELER: readonly GrafikTuru[] = ['nokta', 'sutun', 'cizgi', 'daire', 'sacilim', 'istatistik'];
const HEPSI: OlcuKumesi = { merkezi: true, aciklik: true, oms: true, standartSapma: true };

const KURALLAR: Record<SinifDuzeyi, Omit<SinifKurallari, 'sinif'>> = {
  5: {
    sekmeler: ['nokta', 'sutun', 'daire', 'istatistik'],
    olculer: { merkezi: false, aciklik: false, oms: false, standartSapma: false },
    yuzdeVeAci: false,
    tekYonluTabloIleBirlikte: false,
    tekGrafikteKarsilastir: true,
  },
  6: {
    sekmeler: ['nokta', 'sutun', 'kokYaprak', 'daire', 'istatistik'],
    olculer: { merkezi: true, aciklik: true, oms: false, standartSapma: false },
    yuzdeVeAci: true,
    tekYonluTabloIleBirlikte: true,
    tekGrafikteKarsilastir: true,
  },
  7: {
    sekmeler: TUM_SEKMELER,
    olculer: { merkezi: true, aciklik: true, oms: true, standartSapma: false },
    yuzdeVeAci: true,
    tekYonluTabloIleBirlikte: true,
    tekGrafikteKarsilastir: true,
  },
  8: {
    sekmeler: TUM_SEKMELER,
    olculer: { merkezi: true, aciklik: true, oms: true, standartSapma: false },
    yuzdeVeAci: true,
    tekYonluTabloIleBirlikte: true,
    tekGrafikteKarsilastir: true,
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
};

export function sinifKurallari(sinif: SinifDuzeyi | null | undefined): SinifKurallari {
  if (sinif === null || sinif === undefined || !(sinif in KURALLAR)) return SERBEST_KURALLAR;
  return { sinif, ...KURALLAR[sinif] };
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
