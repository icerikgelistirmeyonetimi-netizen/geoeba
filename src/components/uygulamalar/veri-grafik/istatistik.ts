/**
 * Veri ve Grafik — saf istatistik yardımcıları.
 * Aritmetik ortalama, ortanca (medyan), tepe değer, açıklık, ortalama mutlak sapma, "güzel" eksen aralıkları ve
 * İstatistik panelinin hesaplama adımlarında gösterilen (yuvarlanmış ya da tam) sayılar.
 * Boş dizi için null döner; bileşenler bunu "veri yok" olarak gösterir.
 * Bu dosya `grafik.ts`'i içe aktarmaz (tersi içe aktarır); gösterim ondalığı çağırandan gelir.
 */

export function toplam(degerler: readonly number[]): number {
  let t = 0;
  for (const d of degerler) t += d;
  return t;
}

export function ortalama(degerler: readonly number[]): number | null {
  if (degerler.length === 0) return null;
  return toplam(degerler) / degerler.length;
}

export function medyan(degerler: readonly number[]): number | null {
  if (degerler.length === 0) return null;
  const sirali = [...degerler].sort((a, b) => a - b);
  const orta = Math.floor(sirali.length / 2);
  return sirali.length % 2 === 1 ? sirali[orta] : (sirali[orta - 1] + sirali[orta]) / 2;
}

/** Ortanca: sıralı verilerin ortasındaki değer (programdaki ad; `medyan` ile aynı işlev) */
export const ortanca = medyan;

/** Ortalama mutlak sapma: ortalamaya uzaklıkların toplamı ÷ veri sayısı */
export function ortalamaMutlakSapma(degerler: readonly number[]): number | null {
  const ort = ortalama(degerler);
  if (ort === null) return null;
  let t = 0;
  for (const d of degerler) t += Math.abs(d - ort);
  return t / degerler.length;
}

export function enKucuk(degerler: readonly number[]): number | null {
  if (degerler.length === 0) return null;
  let m = Infinity;
  for (const d of degerler) if (d < m) m = d;
  return m;
}

export function enBuyuk(degerler: readonly number[]): number | null {
  if (degerler.length === 0) return null;
  let m = -Infinity;
  for (const d of degerler) if (d > m) m = d;
  return m;
}

export function aciklik(degerler: readonly number[]): number | null {
  const kucuk = enKucuk(degerler);
  const buyuk = enBuyuk(degerler);
  return kucuk === null || buyuk === null ? null : buyuk - kucuk;
}

/** Her farklı değerin sıklığı (kaç kez görüldüğü), küçükten büyüğe */
export function degerSikliklari(degerler: readonly number[]): { deger: number; siklik: number }[] {
  const sayac = new Map<number, number>();
  for (const d of degerler) sayac.set(d, (sayac.get(d) ?? 0) + 1);
  return [...sayac.entries()].map(([deger, siklik]) => ({ deger, siklik })).sort((a, b) => a.deger - b.deger);
}

/**
 * Tepe değer(ler): en sık görülen değer(ler), küçükten büyüğe. `sayi` en büyük sıklıktır.
 * Farklı değer sayısı ≥ 2 ve bütün sıklıklar eşitse tepe değer yoktur (boş dizi): [1, 1, 2, 2, 3, 3] → [],
 * [1, 2, 3] → []. Tek farklı değer varsa tepe değer odur: [5, 5, 5] → [5].
 */
export function tepeDeger(degerler: readonly number[]): { degerler: number[]; sayi: number } {
  const sikliklar = degerSikliklari(degerler);
  if (sikliklar.length === 0) return { degerler: [], sayi: 0 };
  let enCok = 0;
  for (const s of sikliklar) if (s.siklik > enCok) enCok = s.siklik;
  const tepeler = sikliklar.filter((s) => s.siklik === enCok).map((s) => s.deger);
  if (sikliklar.length >= 2 && tepeler.length === sikliklar.length) return { degerler: [], sayi: enCok };
  return { degerler: tepeler, sayi: enCok };
}

export interface Ozet {
  n: number;
  ortalama: number | null;
  medyan: number | null;
  /** tepe değer(ler); bütün değerler eşit sıklıktaysa boş */
  tepe: number[];
  /** en büyük sıklık (tepe değerin görülme sayısı; tepe yoksa her değerin ortak sıklığı) */
  tepeSayisi: number;
  oms: number | null;
  enKucuk: number | null;
  enBuyuk: number | null;
  aciklik: number | null;
}

export function ozetHesapla(degerler: readonly number[]): Ozet {
  const tepe = tepeDeger(degerler);
  return {
    n: degerler.length,
    ortalama: ortalama(degerler),
    medyan: medyan(degerler),
    tepe: tepe.degerler,
    tepeSayisi: tepe.sayi,
    oms: ortalamaMutlakSapma(degerler),
    enKucuk: enKucuk(degerler),
    enBuyuk: enBuyuk(degerler),
    aciklik: aciklik(degerler),
  };
}

// ── Gösterim: tam ya da yuvarlanmış sayı ────────────────────────────────────

/** Hesaplama adımlarında bir sonucun tam yazılabileceği en çok ondalık basamak */
export const TAM_ONDALIK_SINIRI = 4;

/**
 * Yarımları sıfırdan uzağa yuvarlar; ölçekli değerin kayan nokta artığı önce temizlenir: (2,275; 2) → 2,28,
 * (−2,5; 0) → −3. Sonuç −0 olmaz.
 */
export function yuvarla(sayi: number, ondalik: number): number {
  if (!Number.isFinite(sayi)) return sayi;
  const k = 10 ** Math.max(0, Math.floor(ondalik));
  const r = (Math.sign(sayi) * Math.round(Number((Math.abs(sayi) * k).toPrecision(12)))) / k;
  return r === 0 ? 0 : r;
}

/** Sayının tam yazılması için gereken ondalık basamak; `enCok` basamakta tam yazılamıyorsa null (1/3, 14,958…) */
export function tamOndalik(sayi: number, enCok = TAM_ONDALIK_SINIRI): number | null {
  if (!Number.isFinite(sayi)) return null;
  for (let k = 0; k <= enCok; k++) {
    const olcekli = sayi * 10 ** k;
    // Yalnız kayan nokta artığı kadar tolerans (büyük sayıda 14 285,7142… tam sayılmasın)
    if (Math.abs(olcekli - Math.round(olcekli)) <= Math.max(1e-9, Math.abs(olcekli) * 1e-12)) return k;
  }
  return null;
}

/** Ekrana yazılacak sayı: değeri, yuvarlanıp yuvarlanmadığı (≈) ve yazılacak ondalık basamak */
export interface Gosterim {
  deger: number;
  yaklasik: boolean;
  ondalik: number;
}

/**
 * Hesaplama adımı gösterimi: en çok 4 ondalıkla tam yazılabiliyorsa kendisi (≈ yok); yazılamıyorsa `ondalik`
 * basamağa yuvarlanır ve yaklaşıktır. Ör. (5,775; 2) → 5,775; (14,9583…; 2) → ≈ 14,96.
 */
export function adimGosterimi(sayi: number, ondalik: number): Gosterim {
  const k = tamOndalik(sayi);
  if (k !== null) return { deger: yuvarla(sayi, k), yaklasik: false, ondalik: k };
  return { deger: yuvarla(sayi, ondalik), yaklasik: true, ondalik };
}

/**
 * Kart ve tablo gösterimi: en çok `ondalik` basamak; yuvarlama değeri değiştirdiyse yaklaşıktır (≈).
 * Ör. (2,275; 2) → ≈ 2,28; (17; 2) → 17.
 */
export function kartGosterimi(sayi: number, ondalik: number): Gosterim {
  const k = tamOndalik(sayi, ondalik);
  if (k !== null) return { deger: yuvarla(sayi, k), yaklasik: false, ondalik: k };
  return { deger: yuvarla(sayi, ondalik), yaklasik: true, ondalik };
}

/** En çok 4 ondalıklı sayıları kayan nokta artığı olmadan toplar (gösterilen terimlerin toplamı) */
export function tamToplam(terimler: readonly number[]): number {
  const k = 10 ** TAM_ONDALIK_SINIRI;
  let t = 0;
  for (const d of terimler) t += Math.round(d * k);
  const sonuc = t / k;
  return sonuc === 0 ? 0 : sonuc;
}

/** Bölük ayırıcısı: bölünmez boşluk (U+00A0), sayı satır sonunda ikiye ayrılmasın */
export const BOLUK_BOSLUGU = String.fromCharCode(0xa0);

/**
 * Türkçe sayı metni: ondalık virgül, gerçek eksi işareti (−), 5 ve daha çok basamaklı tam kısımda bölük
 * boşluğu (100 000; bölünmez boşluk). Sondaki sıfırlar yazılmaz. Ör. (−3,5; 2) → "−3,5"; (100000; 2) → "100 000".
 */
export function sayiMetni(sayi: number, ondalik = 2): string {
  if (!Number.isFinite(sayi)) return '';
  const r = yuvarla(sayi, ondalik);
  const [tam, kesir = ''] = Math.abs(r).toFixed(Math.max(0, Math.floor(ondalik))).split('.');
  const kesirKisa = kesir.replace(/0+$/, '');
  const tamKisim = tam.length >= 5 ? tam.replace(/\B(?=(\d{3})+(?!\d))/g, BOLUK_BOSLUGU) : tam;
  return `${r < 0 ? '−' : ''}${tamKisim}${kesirKisa ? `,${kesirKisa}` : ''}`;
}

/** Gösterimin metni; yaklaşıksa başına "≈ " eklenir */
export function gosterimMetni(g: Gosterim, yaklasikIsareti = true): string {
  return `${g.yaklasik && yaklasikIsareti ? '≈ ' : ''}${sayiMetni(g.deger, g.ondalik)}`;
}

/** İşlem içindeki terim: negatif sayı parantezli yazılır, "(−3)" */
export function terimMetni(sayi: number, ondalik = TAM_ONDALIK_SINIRI): string {
  const metin = sayiMetni(sayi, ondalik);
  return sayi < 0 && metin.startsWith('−') ? `(${metin})` : metin;
}

/** Sayı (ya da metin) listesi: "2 ve 2,55"; üç ve daha çok öğede "1; 4 ve 7" (ondalık virgülle karışmasın) */
export function listeMetni(ogeler: readonly string[]): string {
  if (ogeler.length <= 1) return ogeler[0] ?? '';
  return `${ogeler.slice(0, -1).join('; ')} ve ${ogeler[ogeler.length - 1]}`;
}

// ── Hesaplama adımları ──────────────────────────────────────────────────────

/** Ortalama mutlak sapma tablosunun bir satırı (gösterilen ortalamayla) */
export interface AdimSatiri {
  deger: number;
  /** değer − gösterilen ortalama (gösterildiği gibi) */
  fark: number;
  /** |fark| = ortalamaya uzaklık */
  uzaklik: number;
  /** fark yuvarlanarak yazıldı (veri 4'ten çok ondalıklı) */
  yaklasik: boolean;
  /** farkın yazılacak ondalık basamağı */
  ondalik: number;
}

/** Sıklık tablosu satırı (çok veride adımlar bu biçimdedir) */
export interface SiklikSatiri {
  deger: number;
  siklik: number;
  /** değer × sıklık */
  carpim: number;
  /** |değer − gösterilen ortalama| */
  uzaklik: number;
  /** sıklık × uzaklık */
  uzaklikCarpim: number;
}

/** Bu kadar veriden sonra adımlar sıklık tablosu biçimine geçer */
export const SIKLIK_BICIMI_SINIRI = 30;

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
  // Gösterim alanları (sonradan eklendi; yukarıdakiler aynen kalır)
  /** yaklaşık yazılan sonuçların ondalık basamağı (çağıran verilerden verir; en az 2) */
  ondalik: number;
  /** verilerin toplamı (gösterildiği gibi) */
  toplamGosterim: Gosterim;
  /** aritmetik ortalama: ≤ 4 ondalıkla tamsa kendisi, değilse yuvarlanmış (yaklasik) */
  ortalamaGosterim: Gosterim;
  /** her veri, tablodaki sırasıyla: fark ve uzaklık gösterilen ortalamayla hesaplanır */
  satirlar: AdimSatiri[];
  /** gösterilen farkların toplamı (ortalama tamsa 0) */
  farkToplami: number;
  /** gösterilen uzaklıkların toplamı ("uzaklıkların toplamı") */
  uzaklikToplami: number;
  /** ortalamanın altında (solunda) kalan verilerin gösterilen uzaklıkları toplamı */
  solUzaklikToplami: number;
  /** ortalamanın üstünde (sağında) kalan verilerin gösterilen uzaklıkları toplamı (ortalama tamsa soldakine eşit) */
  sagUzaklikToplami: number;
  /** uzaklıkların toplamı ÷ veri sayısı */
  omsGosterim: Gosterim;
  /** farklı değerlerin sıklık tablosu, küçükten büyüğe */
  sikliklar: SiklikSatiri[];
  /** n > 30: adımlar sıklık tablosu biçiminde yazılır */
  siklikBicimi: boolean;
  /** ortancanın sıralı dizideki 1 tabanlı konum(lar)ı: tekte [k], çiftte [k, k + 1] */
  ortancaKonumlari: number[];
  ortancaGosterim: Gosterim;
  tepe: { degerler: number[]; sayi: number };
  enKucuk: number;
  enBuyuk: number;
  aciklikGosterim: Gosterim;
}

/**
 * Hesaplama adımları. `ondalik`: tam yazılamayan sonuçların yuvarlanacağı basamak (İstatistik paneli verilerin
 * `gosterimOndaligi`ni verir). Ortalama tam yazılamıyorsa farklar yuvarlanmış ortalamayla hesaplanır; böylece
 * gösterilen her terim ve toplam birbirini tutar.
 */
export function hesaplamaAdimlari(degerler: readonly number[], ondalik = 2): HesaplamaAdimlari | null {
  if (degerler.length === 0) return null;
  const d = Math.max(0, Math.min(TAM_ONDALIK_SINIRI, Math.floor(Number.isFinite(ondalik) ? ondalik : 2)));
  const n = degerler.length;
  const t = toplam(degerler);
  const ort = t / n;
  const sapmalar = degerler.map((deger) => ({ deger, sapma: Math.abs(deger - ort) }));
  const sapmaToplami = toplam(sapmalar.map((s) => s.sapma));
  const sirali = [...degerler].sort((a, b) => a - b);
  const orta = Math.floor(n / 2);
  const ortaIndeksler = n % 2 === 1 ? [orta] : [orta - 1, orta];

  const hepsiTam = degerler.every((x) => tamOndalik(x) !== null);
  const tamT = hepsiTam ? tamToplam(degerler) : t;
  const toplamGosterim = adimGosterimi(tamT, d);
  const ortalamaGosterim = adimGosterimi(tamT / n, d);
  const m = ortalamaGosterim.deger;
  const satirlar: AdimSatiri[] = degerler.map((deger) => {
    const f = adimGosterimi(deger - m, d);
    return { deger, fark: f.deger, uzaklik: Math.abs(f.deger), yaklasik: f.yaklasik, ondalik: f.ondalik };
  });
  const farkToplami = tamToplam(satirlar.map((s) => s.fark));
  const uzaklikToplami = tamToplam(satirlar.map((s) => s.uzaklik));
  const uzaklikBul = new Map(satirlar.map((s) => [s.deger, s.uzaklik]));
  const sikliklar: SiklikSatiri[] = degerSikliklari(degerler).map(({ deger, siklik }) => {
    const uzaklik = uzaklikBul.get(deger) ?? Math.abs(deger - m);
    return {
      deger,
      siklik,
      carpim: adimGosterimi(deger * siklik, d).deger,
      uzaklik,
      uzaklikCarpim: adimGosterimi(uzaklik * siklik, d).deger,
    };
  });
  const orn = medyan(degerler) as number;
  return {
    n,
    toplam: t,
    ortalama: ort,
    sapmalar,
    sapmaToplami,
    oms: sapmaToplami / n,
    siraliDegerler: sirali,
    medyan: orn,
    ortaIndeksler,
    ondalik: d,
    toplamGosterim,
    ortalamaGosterim,
    satirlar,
    farkToplami,
    uzaklikToplami,
    solUzaklikToplami: tamToplam(satirlar.filter((s) => s.fark < 0).map((s) => s.uzaklik)),
    sagUzaklikToplami: tamToplam(satirlar.filter((s) => s.fark > 0).map((s) => s.uzaklik)),
    omsGosterim: adimGosterimi(uzaklikToplami / n, d),
    sikliklar,
    siklikBicimi: n > SIKLIK_BICIMI_SINIRI,
    ortancaKonumlari: ortaIndeksler.map((i) => i + 1),
    ortancaGosterim: adimGosterimi(orn, d),
    tepe: tepeDeger(degerler),
    enKucuk: sirali[0],
    enBuyuk: sirali[n - 1],
    aciklikGosterim: adimGosterimi(sirali[n - 1] - sirali[0], d),
  };
}

// ── Eksen ───────────────────────────────────────────────────────────────────

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
