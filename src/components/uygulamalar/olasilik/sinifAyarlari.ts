/**
 * Olasılık Laboratuvarı — sınıf düzeyine göre içerik (saf, React'siz; vitest ile sınanır).
 *
 * TEGM Ortaokul Komisyonu inceleme raporu (20.10.2026): laboratuvar sınıf seçilmeden açılmaz ve öznel, deneysel, teorik
 * olasılık sınıf ayrımı olmadan birlikte verilmez; her sınıf programdaki kendi yaklaşımını görür (TYMM öğrenme çıktıları,
 * metinleri scripts/veri/kazanim-metinleri.json):
 * - 5. sınıf (MAT.5.6.1, 5.6.2): öznel olasılık. Olasılık spektrumu (0 imkânsız … 1/2 eşit olasılıklı … 1 kesin), az ya
 *   da çok olasılıklı olaylar. Deney, sayaç ve hesap yok: «olasılık spektrumu» görünümü (spektrum.ts, SpektrumGorunumu).
 * - 6. sınıf (MAT.6.6.1): deneysel olasılık, gözleme dayalı tahmin. Deneyler programdaki gibi sınırlı tekrarlıdır
 *   ("20, 30 kez gibi"; bir deney en çok 30 tekrar). Deneme sayısı grafiği ("deneme sayısı artınca ne olur?"), teorik ve
 *   öznel kart yok.
 * - 7. sınıf (MAT.7.7.1–7.7.3): teorik olasılık. Örnek uzay, istenen durum, olay ve tümleyeni; deneme sayısı arttıkça
 *   olayın göreli sıklığının teorik olasılığa yaklaştığını gösteren grafik (tümevarımsal akıl yürütme).
 * - 8. sınıf (MAT.8.7.1): üç yaklaşım (öznel, deneysel, teorik) birlikte; karşılaştırma ve deneme sayısı grafiği; gerçek
 *   yaşam durumları (okuldaki görüşler, penaltı) çarkla canlandırılır.
 * - Ortaokulda iki sayı küpü yoktur (bileşik olay; lise programında) ve Galton tahtası yoktur.
 * - Lise: 9. sınıf (MAT.9.7.1, 9.7.2) deneysel ve teorik olasılık; 10. sınıf ayrıca Galton tahtası (MAT.10.3.1 sayma
 *   stratejileri: yolları seçmeyle sayma, C(n, k) / 2ⁿ). İki sayı küpü lisede açıktır.
 */
import { RENK_SECENEKLERI, type CarkDilimi, type GaltonKosulu, type Sablon, type SablonTuru, type ZarKosulu } from './olasilik';

export type OlasilikSinifi = 5 | 6 | 7 | 8 | 9 | 10;
export type OlasilikKademesi = 'ortaokul' | 'lise';

export const OLASILIK_SINIFLARI: readonly OlasilikSinifi[] = [5, 6, 7, 8, 9, 10];

export interface OlasilikKartlari {
  oznel: boolean;
  deneysel: boolean;
  teorik: boolean;
}

export interface SinifAyari {
  sinif: OlasilikSinifi;
  kademe: OlasilikKademesi;
  /** Seçim kartındaki başlık ("Öznel olasılık") */
  baslik: string;
  /** Seçim kartındaki kısa açıklama */
  aciklama: string;
  /** Öğrenme çıktısı kodları ("MAT.6.6.1") */
  kazanim: readonly string[];
  /** 5. sınıf spektrum görünümü; ötekiler laboratuvar */
  gorunum: 'spektrum' | 'laboratuvar';
  /** Sekmelerde görünen şablonlar (sırasıyla) */
  sablonlar: readonly SablonTuru[];
  /** Görünen olasılık kartları */
  kartlar: OlasilikKartlari;
  /** "1 Kez Dene"nin yanındaki toplu deneme düğmeleri */
  topluSayilar: readonly number[];
  /** Bir deneyin en çok tekrar sayısı (6. sınıf: 30); null: sınırsız */
  enCokDeneme: number | null;
  /** Deneme sayısı arttıkça olayın göreli sıklığı (yakınsama) grafiği */
  yakinsama: boolean;
  /** Olasılık yaklaşımlarını yan yana gösteren sütun grafiği */
  karsilastirma: boolean;
  /** Sayı küpünde "İki sayı küpü (toplam)" seçeneği */
  ikiZar: boolean;
  /** Teorik kartta olayın tümleyeni (7. sınıf, MAT.7.7.1) */
  tumleyen: boolean;
  /** 8. sınıf: gerçek yaşam durumlarını canlandıran hazır çarklar */
  hazirCarklar: boolean;
}

const LAB_SABLONLARI: readonly SablonTuru[] = ['para', 'zar', 'cark', 'torba'];

export const SINIF_AYARLARI: Record<OlasilikSinifi, SinifAyari> = {
  5: {
    sinif: 5,
    kademe: 'ortaokul',
    baslik: 'Öznel olasılık',
    aciklama: 'Olayları olasılık spektrumuna yerleştir: imkânsızdan kesine, az ya da çok olasılıklı.',
    kazanim: ['MAT.5.6.1', 'MAT.5.6.2'],
    gorunum: 'spektrum',
    sablonlar: [],
    kartlar: { oznel: true, deneysel: false, teorik: false },
    topluSayilar: [],
    enCokDeneme: null,
    yakinsama: false,
    karsilastirma: false,
    ikiZar: false,
    tumleyen: false,
    hazirCarklar: false,
  },
  6: {
    sinif: 6,
    kademe: 'ortaokul',
    baslik: 'Deneysel olasılık',
    aciklama: 'Deney yap, sonuçları gözle; olayın olasılığını gözleme dayalı tahmin et.',
    kazanim: ['MAT.6.6.1'],
    gorunum: 'laboratuvar',
    sablonlar: LAB_SABLONLARI,
    kartlar: { oznel: false, deneysel: true, teorik: false },
    topluSayilar: [10, 20, 30],
    enCokDeneme: 30,
    yakinsama: false,
    karsilastirma: false,
    ikiZar: false,
    tumleyen: false,
    hazirCarklar: false,
  },
  7: {
    sinif: 7,
    kademe: 'ortaokul',
    baslik: 'Teorik olasılık',
    aciklama: 'Örnek uzayı ve istenen durumları say; olayın ve tümleyeninin olasılığını bul.',
    kazanim: ['MAT.7.7.1', 'MAT.7.7.2', 'MAT.7.7.3'],
    gorunum: 'laboratuvar',
    sablonlar: LAB_SABLONLARI,
    kartlar: { oznel: false, deneysel: false, teorik: true },
    topluSayilar: [10, 100, 1000],
    enCokDeneme: null,
    yakinsama: true,
    karsilastirma: false,
    ikiZar: false,
    tumleyen: true,
    hazirCarklar: false,
  },
  8: {
    sinif: 8,
    kademe: 'ortaokul',
    baslik: 'Üç yaklaşım',
    aciklama: 'Öznel, deneysel ve teorik olasılığı birlikte sorgula; olaya uygun yaklaşımla karar ver.',
    kazanim: ['MAT.8.7.1'],
    gorunum: 'laboratuvar',
    sablonlar: LAB_SABLONLARI,
    kartlar: { oznel: true, deneysel: true, teorik: true },
    topluSayilar: [10, 100, 1000, 10000],
    enCokDeneme: null,
    yakinsama: true,
    karsilastirma: true,
    ikiZar: false,
    tumleyen: false,
    hazirCarklar: true,
  },
  9: {
    sinif: 9,
    kademe: 'lise',
    baslik: 'Deneysel ve teorik olasılık',
    aciklama: 'Gözleme dayalı tahmini teorik olasılıkla karşılaştır; deneme sayısının etkisini incele.',
    kazanim: ['MAT.9.7.1', 'MAT.9.7.2'],
    gorunum: 'laboratuvar',
    sablonlar: LAB_SABLONLARI,
    kartlar: { oznel: false, deneysel: true, teorik: true },
    topluSayilar: [10, 100, 1000, 10000],
    enCokDeneme: null,
    yakinsama: true,
    karsilastirma: true,
    ikiZar: true,
    tumleyen: false,
    hazirCarklar: false,
  },
  10: {
    sinif: 10,
    kademe: 'lise',
    baslik: 'Galton tahtası ve olasılık',
    aciklama: 'Bilyelerin yollarını say (seçme); Galton tahtasında deneysel ve teorik dağılımı karşılaştır.',
    kazanim: ['MAT.10.3.1'],
    gorunum: 'laboratuvar',
    sablonlar: [...LAB_SABLONLARI, 'galton'],
    kartlar: { oznel: false, deneysel: true, teorik: true },
    topluSayilar: [10, 100, 1000, 10000],
    enCokDeneme: null,
    yakinsama: true,
    karsilastirma: true,
    ikiZar: true,
    tumleyen: false,
    hazirCarklar: false,
  },
};

export function sinifAyari(sinif: OlasilikSinifi): SinifAyari {
  return SINIF_AYARLARI[sinif];
}

/** Kademenin seçim ekranındaki sınıfları: ortaokul 5–8, lise 9–10; kademe seçilmemişse (Tüm araçlar) hepsi */
export function kademeninSiniflari(kademe: string | null | undefined): readonly OlasilikSinifi[] {
  if (kademe === 'ortaokul' || kademe === 'lise') return OLASILIK_SINIFLARI.filter((s) => SINIF_AYARLARI[s].kademe === kademe);
  return OLASILIK_SINIFLARI;
}

/** Kayıttan gelen sınıf değeri */
export function sinifCoz(v: unknown): OlasilikSinifi | null {
  return typeof v === 'number' && (OLASILIK_SINIFLARI as readonly number[]).includes(v) ? (v as OlasilikSinifi) : null;
}

/** Sonraki toplu düğmenin yapılabilir olup olmadığı (6. sınıfta deney 30 tekrarı aşamaz) */
export function topluYapilabilir(ayar: SinifAyari, deneme: number, n: number): boolean {
  return ayar.enCokDeneme === null || deneme + n <= ayar.enCokDeneme;
}

/** Şablonu sınıfın kurallarına uydurur: ortaokulda iki sayı küpü tek küpe döner (istenen değer 1–6'ya sığdırılır). */
export function sablonuSinifaUydur(sablon: Sablon, ayar: SinifAyari): Sablon {
  if (sablon.tur !== 'zar' || ayar.ikiZar || !sablon.ikiZar) return sablon;
  const k = sablon.istenen;
  const istenen: ZarKosulu = k.tip === 'cift' || k.tip === 'tek' ? k : { tip: k.tip, deger: Math.min(6, Math.max(1, k.deger)) };
  return { ...sablon, ikiZar: false, istenen };
}

// ---------------------------------------------------------------------------
// Görev cümlesi (deney alanının üstündeki tek satır)
// ---------------------------------------------------------------------------

function zarOlayi(k: ZarKosulu, iki: boolean): string {
  const ne = iki ? 'toplamın' : '';
  switch (k.tip) {
    case 'sayi':
      return iki ? `${ne} ${k.deger} olma` : `${k.deger} gelme`;
    case 'cift':
      return iki ? `${ne} çift sayı olma` : 'çift sayı gelme';
    case 'tek':
      return iki ? `${ne} tek sayı olma` : 'tek sayı gelme';
    case 'enAz':
      return iki ? `${ne} ${k.deger} ya da daha büyük olma` : `${k.deger} ya da daha büyük bir sayı gelme`;
    case 'enFazla':
      return iki ? `${ne} ${k.deger} ya da daha küçük olma` : `${k.deger} ya da daha küçük bir sayı gelme`;
  }
}

function galtonOlayi(k: GaltonKosulu, n: number): string {
  switch (k.tip) {
    case 'orta':
      return n % 2 === 0 ? 'bilyenin ortadaki kutuya düşme' : 'bilyenin ortadaki iki kutudan birine düşme';
    case 'kutu':
      return `bilyenin ${k.kutu + 1}. kutuya düşme`;
    case 'enAz':
      return `bilyenin ${k.kutu + 1}. ya da daha sağdaki bir kutuya düşme`;
    case 'enFazla':
      return `bilyenin ${k.kutu + 1}. ya da daha soldaki bir kutuya düşme`;
  }
}

/** İstenen olayın adı, "olasılığı" sözcüğünden önce gelecek biçimde: "tura gelme", "okun kırmızı dilimde durma" */
export function olayAdi(sablon: Sablon): string {
  const kucuk = (s: string) => s.toLocaleLowerCase('tr-TR');
  switch (sablon.tur) {
    case 'para':
      return sablon.istenen === 'tura' ? 'tura gelme' : 'yazı gelme';
    case 'zar':
      return zarOlayi(sablon.istenen, sablon.ikiZar);
    case 'cark':
      return hazirCarkBul(sablon) ? `“${sablon.istenenRenk}” gelme` : `okun ${kucuk(sablon.istenenRenk)} dilimde durma`;
    case 'torba':
      return `${kucuk(sablon.istenenRenk)} bilye çekme`;
    case 'kart':
      return 'istenen kartı çekme';
    case 'galton':
      return galtonOlayi(sablon.istenen, sablon.satir);
  }
}

/** Sınıfın görev cümlesi (şablonun istenen olayıyla); 8. sınıfın hazır çarklarında durumun kendi cümlesi */
export function gorevMetni(ayar: SinifAyari, sablon: Sablon): string {
  const olay = olayAdi(sablon);
  if (ayar.hazirCarklar && sablon.tur === 'cark') {
    const h = hazirCarkBul(sablon);
    if (h) return h.gorev;
  }
  switch (ayar.sinif) {
    case 5:
      return 'Olayları olasılık spektrumuna yerleştir.';
    case 6:
      return `Deneyi 20 ya da 30 kez tekrarla ve sonuçları gözle: ${olay} olasılığını deneyin sonuçlarına göre tahmin et.`;
    case 7:
      return `Örnek uzaydaki durumları ve istenen durumları say: ${olay} olasılığını ve tümleyeninin olasılığını bul. Sonra deneyi çok kez tekrarlayıp sonuçları teorik olasılıkla karşılaştır.`;
    case 8:
      return `Önce tahminini (öznel olasılık) seç, sonra deney yap ve teorik olasılığı bul: ${olay} olasılığı için hangi yaklaşım daha uygun?`;
    default:
      return `${olay.charAt(0).toLocaleUpperCase('tr-TR')}${olay.slice(1)} olasılığını deneyle tahmin et ve teorik olasılıkla karşılaştır.`;
  }
}

// ---------------------------------------------------------------------------
// 8. sınıf: gerçek yaşam durumları (Veri ve Grafik'ten taşınan simülasyonlar)
// ---------------------------------------------------------------------------

export interface HazirCark {
  id: string;
  /** Düğme adı */
  ad: string;
  /** Görev cümlesi (TEGM: doğrudan "kaç tane çıkar?" diye sormaz; durumu inceletir) */
  gorev: string;
  dilimler: readonly CarkDilimi[];
  istenenRenk: string;
}

const renk = (ad: string) => RENK_SECENEKLERI.find((r) => r.ad === ad)?.renk ?? RENK_SECENEKLERI[0].renk;

export const HAZIR_CARKLAR: readonly HazirCark[] = [
  {
    id: 'okul-gorusleri',
    ad: 'Okuldaki görüşler',
    gorev:
      'Okuldaki görüş dağılımını inceleyelim: Öğrencilerin %60’ı “evet”, %40’ı “hayır” diyor. Çarkın her çevrilişi, okuldan rastgele seçilen bir öğrencinin cevabıdır. Önce tahminini seç, sonra deney yap ve teorik olasılıkla karşılaştır.',
    dilimler: [
      { ad: 'Evet', renk: renk('Yeşil'), genislik: 3 },
      { ad: 'Hayır', renk: renk('Turuncu'), genislik: 2 },
    ],
    istenenRenk: 'Evet',
  },
  {
    id: 'penalti',
    ad: 'Penaltı',
    gorev:
      'Bir oyuncu penaltılarının %70’ini gole çeviriyor. Çarkın her çevrilişi bir penaltıdır. Önce tahminini seç, sonra penaltıları çarkla canlandır: Gol olasılığı için hangi yaklaşım daha uygun?',
    dilimler: [
      { ad: 'Gol', renk: renk('Mavi'), genislik: 7 },
      { ad: 'Kaçtı', renk: renk('Sarı'), genislik: 3 },
    ],
    istenenRenk: 'Gol',
  },
];

/** Çark bir hazır durumun dilimlerini (ad ve genişlik) taşıyor mu? */
export function hazirCarkBul(sablon: Sablon): HazirCark | undefined {
  if (sablon.tur !== 'cark') return undefined;
  const imza = (l: readonly CarkDilimi[]) => l.map((d) => `${d.ad}:${d.genislik}`).join('|');
  return HAZIR_CARKLAR.find((h) => imza(h.dilimler) === imza(sablon.dilimler));
}

/** Hazır durumun çark şablonu */
export function hazirCarkSablonu(h: HazirCark): Extract<Sablon, { tur: 'cark' }> {
  return { tur: 'cark', dilimler: h.dilimler.map((d) => ({ ...d })), istenenRenk: h.istenenRenk };
}
