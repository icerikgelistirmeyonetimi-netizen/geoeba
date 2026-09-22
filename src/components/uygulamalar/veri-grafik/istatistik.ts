/**
 * Veri ve Grafik — saf istatistik yardımcıları.
 * Aritmetik ortalama, medyan, ortalama mutlak sapma (OMS), açıklık, "güzel" eksen aralıkları.
 * Boş dizi için null döner; bileşenler bunu "veri yok" olarak gösterir.
 */

export function toplam(degerler: number[]): number {
  let t = 0;
  for (const d of degerler) t += d;
  return t;
}

export function ortalama(degerler: number[]): number | null {
  if (degerler.length === 0) return null;
  return toplam(degerler) / degerler.length;
}

export function medyan(degerler: number[]): number | null {
  if (degerler.length === 0) return null;
  const sirali = [...degerler].sort((a, b) => a - b);
  const orta = Math.floor(sirali.length / 2);
  return sirali.length % 2 === 1 ? sirali[orta] : (sirali[orta - 1] + sirali[orta]) / 2;
}

/** Ortalama mutlak sapma: Σ|x − x̄| / n */
export function ortalamaMutlakSapma(degerler: number[]): number | null {
  const ort = ortalama(degerler);
  if (ort === null) return null;
  let t = 0;
  for (const d of degerler) t += Math.abs(d - ort);
  return t / degerler.length;
}

export function enKucuk(degerler: number[]): number | null {
  return degerler.length === 0 ? null : Math.min(...degerler);
}

export function enBuyuk(degerler: number[]): number | null {
  return degerler.length === 0 ? null : Math.max(...degerler);
}

export function aciklik(degerler: number[]): number | null {
  const kucuk = enKucuk(degerler);
  const buyuk = enBuyuk(degerler);
  return kucuk === null || buyuk === null ? null : buyuk - kucuk;
}

export interface Ozet {
  n: number;
  ortalama: number | null;
  medyan: number | null;
  oms: number | null;
  enKucuk: number | null;
  enBuyuk: number | null;
  aciklik: number | null;
}

export function ozetHesapla(degerler: number[]): Ozet {
  return {
    n: degerler.length,
    ortalama: ortalama(degerler),
    medyan: medyan(degerler),
    oms: ortalamaMutlakSapma(degerler),
    enKucuk: enKucuk(degerler),
    enBuyuk: enBuyuk(degerler),
    aciklik: aciklik(degerler),
  };
}

/** "Hesaplama adımlarını göster" için adım adım ara sonuçlar */
export interface HesaplamaAdimlari {
  n: number;
  toplam: number;
  ortalama: number;
  sapmalar: { deger: number; sapma: number }[];
  sapmaToplami: number;
  oms: number;
  siraliDegerler: number[];
  medyan: number;
  /** Medyanı veren orta eleman(lar)ın sıralı dizideki indeksleri (1 ya da 2 tane) */
  ortaIndeksler: number[];
}

export function hesaplamaAdimlari(degerler: number[]): HesaplamaAdimlari | null {
  if (degerler.length === 0) return null;
  const n = degerler.length;
  const t = toplam(degerler);
  const ort = t / n;
  const sapmalar = degerler.map((deger) => ({ deger, sapma: Math.abs(deger - ort) }));
  const sapmaToplami = toplam(sapmalar.map((s) => s.sapma));
  const sirali = [...degerler].sort((a, b) => a - b);
  const orta = Math.floor(n / 2);
  const ortaIndeksler = n % 2 === 1 ? [orta] : [orta - 1, orta];
  return {
    n,
    toplam: t,
    ortalama: ort,
    sapmalar,
    sapmaToplami,
    oms: sapmaToplami / n,
    siraliDegerler: sirali,
    medyan: medyan(degerler) as number,
    ortaIndeksler,
  };
}

/** Kayan nokta artıklarını temizler (0.30000000000000004 → 0.3) */
export function temizle(sayi: number): number {
  if (sayi === 0) return 0;
  return Number.parseFloat(sayi.toPrecision(12));
}

/** Verilen aralık için 1·10ⁿ, 2·10ⁿ ya da 5·10ⁿ biçiminde "güzel" adım (yaklaşık hedef sayıda işaret) */
export function guzelAdim(aralik: number, hedefIsaretSayisi = 6): number {
  if (!(aralik > 0) || !Number.isFinite(aralik)) return 1;
  const hedef = Math.max(1, hedefIsaretSayisi);
  const kaba = aralik / hedef;
  const us = Math.floor(Math.log10(kaba));
  const taban = Math.pow(10, us);
  const kesir = kaba / taban;
  let carpan: number;
  if (kesir < 1.5) carpan = 1;
  else if (kesir < 3.5) carpan = 2;
  else if (kesir < 7.5) carpan = 5;
  else carpan = 10;
  return temizle(carpan * taban);
}

export interface Eksen {
  min: number;
  max: number;
  adim: number;
  isaretler: number[];
}

/** min–max aralığını güzel adımlara oturtur; min === max ise aralığı genişletir */
export function guzelEksen(min: number, max: number, hedefIsaretSayisi = 6): Eksen {
  let alt = Math.min(min, max);
  let ust = Math.max(min, max);
  if (!Number.isFinite(alt) || !Number.isFinite(ust)) {
    alt = 0;
    ust = 1;
  }
  if (ust - alt === 0) {
    const pay = Math.abs(alt) > 0 ? Math.abs(alt) * 0.5 : 1;
    alt -= pay;
    ust += pay;
  }
  const adim = guzelAdim(ust - alt, hedefIsaretSayisi);
  const eksenMin = temizle(Math.floor(alt / adim) * adim);
  const eksenMax = temizle(Math.ceil(ust / adim) * adim);
  const isaretler: number[] = [];
  for (let v = eksenMin; v <= eksenMax + adim / 2; v += adim) {
    isaretler.push(temizle(v));
  }
  return { min: eksenMin, max: eksenMax, adim, isaretler };
}
