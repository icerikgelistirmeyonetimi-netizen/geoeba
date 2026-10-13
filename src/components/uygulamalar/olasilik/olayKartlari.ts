/**
 * Olasılık Laboratuvarı — ilkokul kademesi «olay kartları» kipi (saf mantık).
 *
 * Alan uzmanı (4. tur, geoeba (3).xlsx satır 183): TYMM MAT.4.4.1 — günlük yaşamdaki olayların olasılığı
 * "imkânsız, olabilir, kesin" diye belirlenir; sayı, kesir ve yüzde temsilleri beklenmez. Her kartta öğrenci
 * olayı ÖNCE sınıflandırır, SONRA laboratuvarın torba / çark deneyiyle kararını sınar. Sınıf elle yazılmaz,
 * şablonun örnek uzayından türetilir (istenen durum hiç yok → imkânsız, her durum istenen → kesin, ikisi de
 * değilse → olabilir). Dönüt niteldir: "hiç / bazen / her seferinde" gözlemi + sınıf + gerekçe; hiçbir
 * metinde rakam, kesir, yüzde ya da sayı küpü yoktur. React'tan bağımsızdır; vitest ile sınanır.
 */
import { RENK_SECENEKLERI, istenenMi, teorikOlasilik, type Sablon, type Sonuc } from './olasilik';

export type OlaySinifi = 'imkansiz' | 'olabilir' | 'kesin';

export const OLAY_SINIFLARI: readonly OlaySinifi[] = ['imkansiz', 'olabilir', 'kesin'];

export const OLAY_SINIFI_ADLARI: Record<OlaySinifi, string> = {
  imkansiz: 'İmkânsız',
  olabilir: 'Olabilir',
  kesin: 'Kesin',
};

/** Sınıflandırma düğmelerinin altındaki kısa açıklama */
export const OLAY_SINIFI_IPUCLARI: Record<OlaySinifi, string> = {
  imkansiz: 'Hiç olmaz.',
  olabilir: 'Olabilir de olmayabilir de.',
  kesin: 'Mutlaka olur.',
};

/** Olay kartlarında yalnız torba ve çark deneyi kullanılır (sayı küpü, madeni para, Galton yok). */
export type KartSablonu = Extract<Sablon, { tur: 'torba' }> | Extract<Sablon, { tur: 'cark' }>;

export interface OlayKarti {
  id: string;
  /** Kartın olay cümlesi */
  olay: string;
  sablon: KartSablonu;
  /** Doğru sınıfın nitel gerekçesi (dönütte) */
  gerekce: string;
}

function renk(ad: string): { ad: string; renk: string } {
  const r = RENK_SECENEKLERI.find((x) => x.ad === ad);
  if (!r) throw new Error(`Bilinmeyen renk: ${ad}`);
  return r;
}

/** İadeli torba: her çekilişten sonra bilye geri konur (deney tekrarlanabilir kalsın). */
function torba(bilyeler: readonly (readonly [string, number])[], istenenRenk: string): KartSablonu {
  return { tur: 'torba', bilyeler: bilyeler.map(([ad, adet]) => ({ ...renk(ad), adet })), iadeli: true, istenenRenk };
}

/** Eşit dilimli çark */
function cark(dilimler: readonly string[], istenenRenk: string): KartSablonu {
  return { tur: 'cark', dilimler: dilimler.map((ad) => ({ ...renk(ad), genislik: 1 })), istenenRenk };
}

/**
 * Altı kart, her sınıftan ikisi (biri torba, biri çark). Sıra: ardışık iki kart aynı sınıfta değil ve sınıflar
 * düzenli bir örüntüyle (imkânsız, olabilir, kesin, imkânsız…) gelmez; ilk kart uzmanın örneğidir (yalnız mavi
 * bilye bulunan torbadan kırmızı çekmek).
 */
export const OLAY_KARTLARI: readonly OlayKarti[] = [
  {
    id: 'mavi-torbadan-kirmizi',
    olay: 'Yalnız mavi bilye olan torbadan kırmızı bilye çekmek',
    sablon: torba([['Mavi', 5]], 'Kırmızı'),
    gerekce: 'Torbada hiç kırmızı bilye yok. Bu torbadan kırmızı bilye çekilemez.',
  },
  {
    id: 'kirmizi-sari-carkta-kirmizi',
    olay: 'Kırmızı ve sarı dilimli çarkta okun kırmızı dilimde durması',
    sablon: cark(['Kırmızı', 'Sarı', 'Kırmızı', 'Sarı'], 'Kırmızı'),
    gerekce: 'Çarkta kırmızı dilim de var, sarı dilim de. Ok kırmızıda da durabilir, sarıda da.',
  },
  {
    id: 'yesil-carkta-yesil',
    olay: 'Bütün dilimleri yeşil olan çarkta okun yeşil dilimde durması',
    sablon: cark(['Yeşil', 'Yeşil', 'Yeşil', 'Yeşil'], 'Yeşil'),
    gerekce: 'Çarkın bütün dilimleri yeşil. Ok nerede durursa dursun yeşil dilimdedir.',
  },
  {
    id: 'karisik-torbadan-mavi',
    olay: 'Kırmızı ve mavi bilye olan torbadan mavi bilye çekmek',
    sablon: torba(
      [
        ['Kırmızı', 3],
        ['Mavi', 3],
      ],
      'Mavi'
    ),
    gerekce: 'Torbada mavi bilye de var, kırmızı bilye de. Mavi de çıkabilir, kırmızı da.',
  },
  {
    id: 'sari-yesil-carkta-kirmizi',
    olay: 'Sarı ve yeşil dilimli çarkta okun kırmızı dilimde durması',
    sablon: cark(['Sarı', 'Yeşil', 'Sarı', 'Yeşil'], 'Kırmızı'),
    gerekce: 'Çarkta hiç kırmızı dilim yok. Ok kırmızı dilimde duramaz.',
  },
  {
    id: 'kirmizi-torbadan-kirmizi',
    olay: 'Yalnız kırmızı bilye olan torbadan kırmızı bilye çekmek',
    sablon: torba([['Kırmızı', 5]], 'Kırmızı'),
    gerekce: 'Torbadaki bütün bilyeler kırmızı. Hangisini çeksen kırmızı olur.',
  },
];

/** Şablonun olay sınıfı: örnek uzaydan (istenen temel durum yok / hepsi / bir kısmı). */
export function olaySinifi(sablon: Sablon): OlaySinifi {
  const t = teorikOlasilik(sablon);
  if (t.tum <= 0 || t.istenen <= 0) return 'imkansiz';
  return t.istenen >= t.tum ? 'kesin' : 'olabilir';
}

// ---------------------------------------------------------------------------
// Kart durumu
// ---------------------------------------------------------------------------
export interface KartDurumu {
  /** Öğrencinin sınıflandırması; deney başlayınca değişmez */
  tahmin: OlaySinifi | null;
  /** Deneme ve istenen sayısı yalnız içte tutulur (ekranda sayı gösterilmez) */
  deneme: number;
  istenen: number;
  /** Son sonuçlar, en yeni sonda (renkli bilye şeridi) */
  son: Sonuc[];
}

export const SON_SERIT_BOYU = 20;
/** Bu kadar denemeden önce sonuç dönütü verilmez ("birkaç kez daha dene") */
export const DONUT_ICIN_EN_AZ_DENEME = 5;
/** "Çok kez çek / çevir" düğmesinin bir seferde yaptığı deneme (ekranda yazmaz) */
export const COK_KEZ = 10;

export const BOS_KART_DURUMU: KartDurumu = { tahmin: null, deneme: 0, istenen: 0, son: [] };

/** Sınıflandırma: deney başlamadıysa seçilir ya da değiştirilir; başladıysa yok sayılır. */
export function tahminEt(d: KartDurumu, sinif: OlaySinifi): KartDurumu {
  if (d.deneme > 0 || d.tahmin === sinif) return d;
  return { ...d, tahmin: sinif };
}

/** Deney sonuçlarını işler; sınıflandırma yapılmadan deney sayılmaz (önce karar, sonra deney). */
export function sonuclariIsle(d: KartDurumu, sablon: Sablon, sonuclar: readonly Sonuc[]): KartDurumu {
  if (d.tahmin === null || !sonuclar.length) return d;
  const istenen = sonuclar.reduce((t, s) => t + (istenenMi(sablon, s) ? 1 : 0), 0);
  return {
    ...d,
    deneme: d.deneme + sonuclar.length,
    istenen: d.istenen + istenen,
    son: d.son.concat(sonuclar).slice(-SON_SERIT_BOYU),
  };
}

/** Deney yapılabilir mi (sınıflandırma seçildi mi) */
export function deneyAcikMi(d: KartDurumu): boolean {
  return d.tahmin !== null;
}

export type Gozlem = 'hic' | 'bazen' | 'hep';

/** Nitel gözlem: istenen hiç çıkmadı / bazen çıktı / her seferinde çıktı. Deney yoksa null. */
export function gozlem(d: KartDurumu): Gozlem | null {
  if (d.deneme <= 0) return null;
  if (d.istenen <= 0) return 'hic';
  return d.istenen >= d.deneme ? 'hep' : 'bazen';
}

/** "Kırmızı" → "kırmızı" (Türkçe küçük harf) */
function kucuk(metin: string): string {
  return metin.toLocaleLowerCase('tr-TR');
}

export function gozlemMetni(sablon: KartSablonu, g: Gozlem): string {
  const r = kucuk(sablon.istenenRenk);
  if (sablon.tur === 'torba') {
    if (g === 'hic') return `Hiç ${r} bilye çekilmedi.`;
    if (g === 'hep') return `Her seferinde ${r} bilye çekildi.`;
    return `Bazen ${r} bilye çekildi, bazen başka renk.`;
  }
  if (g === 'hic') return `Ok hiç ${r} dilimde durmadı.`;
  if (g === 'hep') return `Ok her seferinde ${r} dilimde durdu.`;
  return `Ok bazen ${r} dilimde durdu, bazen başka renkte.`;
}

export interface Donut {
  dogru: boolean;
  /** Doğru sınıf */
  sinif: OlaySinifi;
  /** Deneyde ne görüldü */
  gozlem: string;
  /** Karar dönütü: "Kararın doğru: bu olay imkânsız." */
  karar: string;
  /** Neden o sınıf */
  gerekce: string;
  /** Olabilir olayda örneklem tek yanlı kaldıysa: denemeyi sürdürme önerisi */
  ek?: string;
}

/** Sonuç dönütü: sınıflandırma yapılmış ve en az birkaç deneme varsa; yoksa null. */
export function donut(kart: OlayKarti, d: KartDurumu): Donut | null {
  const g = gozlem(d);
  if (d.tahmin === null || g === null || d.deneme < DONUT_ICIN_EN_AZ_DENEME) return null;
  const sinif = olaySinifi(kart.sablon);
  const dogru = d.tahmin === sinif;
  const sinifAdi = kucuk(OLAY_SINIFI_ADLARI[sinif]);
  const karar = dogru ? `Kararın doğru: bu olay ${sinifAdi}.` : `Sen «${OLAY_SINIFI_ADLARI[d.tahmin]}» dedin. Bu olay ${sinifAdi}.`;
  const ek =
    sinif === 'olabilir' && g !== 'bazen'
      ? kart.sablon.tur === 'torba'
        ? 'Çekmeye devam et; başka renk de çıkabilir.'
        : 'Çevirmeye devam et; ok başka renkte de durabilir.'
      : undefined;
  return { dogru, sinif, gozlem: gozlemMetni(kart.sablon, g), karar, gerekce: kart.gerekce, ek };
}

/**
 * Dönütten sonra gidilecek kart: aktiften sonraki ilk bitmemiş kart, yoksa baştan ilk bitmemiş kart; aktif dışında
 * bitmemiş kart kalmadıysa null (bitiş iletisi). Kartlar sırasız bitirilse de bitiş iletisi son bitirilen kartta çıkar.
 */
export function siradakiKart(aktif: number, tamamlanan: readonly boolean[]): number | null {
  const bitmemis = tamamlanan.map((t, i) => (t || i === aktif ? -1 : i)).filter((i) => i >= 0);
  if (!bitmemis.length) return null;
  return bitmemis.find((i) => i > aktif) ?? bitmemis[0];
}

/** Deneyden önceki yönlendirme metni (sınıflandırma yok / deney az) */
export function yonlendirme(kart: OlayKarti, d: KartDurumu): string {
  if (d.tahmin === null) return 'Önce karar ver: bu olay imkânsız mı, olabilir mi, kesin mi?';
  const fiil = kart.sablon.tur === 'torba' ? 'bilye çek' : 'çarkı çevir';
  if (d.deneme === 0) return `Şimdi ${fiil}, kararını deneyle sına.`;
  return `Birkaç kez daha ${fiil}; sonra ne gördüğüne bak.`;
}
