/**
 * Veri ve Grafik — kategorik (etiket türündeki) değişkenler için saf yardımcılar:
 * değişken olarak kullanılabilecek sütunlar, kategori sırası, frekans / göreli sıklık, mod,
 * kategori renkleri ve nokta grafiğinde ayrık kutucuk yerleşimi.
 */
import type { Sutun, VeriTablosu } from './veri';

/**
 * Kategori paleti: ada tonlarından türetilmiş 12 ayrı renk (deniz, mercan, lavanta, altın, turkuaz, gül,
 * zeytin, mor, gök, kiremit, arduvaz, kahve). Hepsinin bağıl parlaklığı 0,18–0,27 bandında: açık (fildişi)
 * ve koyu (mürekkep) kart zemininde en az 3:1 karşıtlık verir; 12 kategoriye kadar renk yinelenmez.
 */
export const KATEGORI_PALETI = [
  '#2f8394',
  '#c8684a',
  '#7f88c4',
  '#a8782f',
  '#2a9d94',
  '#bd5c8f',
  '#6b8e3a',
  '#9168bd',
  '#3f7fcb',
  '#c75454',
  '#6f7c8c',
  '#94704f',
] as const;

/** Renk adı geçen etiketler kendi rengine yakın bir paleti tonu alır (torba: kırmızı / mavi …) */
const ADLI_RENKLER: [RegExp, string][] = [
  [/^k[ıi]rm[ıi]z[ıi]/i, '#c75454'],
  [/^mavi/i, '#3f7fcb'],
  [/^ye[şs][ıi]l/i, '#6b8e3a'],
  [/^sar[ıi]/i, '#a8782f'],
  [/^mor/i, '#9168bd'],
  [/^turuncu/i, '#c8684a'],
  [/^pembe/i, '#bd5c8f'],
  [/^gri/i, '#6f7c8c'],
  [/^kahve/i, '#94704f'],
  [/^siyah/i, '#15302d'],
  [/^beyaz/i, '#efe5d0'],
];

export function kategoriRengi(etiket: string, indeks: number): string {
  const m = etiket.trim().toLocaleLowerCase('tr');
  for (const [desen, renk] of ADLI_RENKLER) if (desen.test(m)) return renk;
  const n = KATEGORI_PALETI.length;
  return KATEGORI_PALETI[((indeks % n) + n) % n];
}

/** Açık renkli zeminde okunur metin rengi */
export function rengeGoreMetin(renk: string): string {
  const hex = renk.replace('#', '');
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const parlaklik = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return parlaklik > 0.68 ? '#15302d' : '#ffffff';
}

/** Sütunun boş olmayan (kırpılmış) metinleri, satır indeksiyle */
export function sutunMetinleri(tablo: VeriTablosu, sutun: number): { satir: number; deger: string }[] {
  if (sutun < 0 || sutun >= tablo.sutunlar.length) return [];
  const sonuc: { satir: number; deger: string }[] = [];
  tablo.satirlar.forEach((r, i) => {
    const m = (r.hucreler[sutun] ?? '').trim();
    if (m !== '') sonuc.push({ satir: i, deger: m });
  });
  return sonuc;
}

/**
 * Kategorik değişken sayılan sütun mu? Etiket türündeki sütunlar kategoriktir; yalnız ilk sütun
 * (satır adı: "Ayşe", "Çekiliş 1" …) her değeri farklıysa değişken sayılmaz — tekrar eden değer varsa sayılır.
 */
/** Örnekleyicinin sıra numarası sütunları ("Çekiliş", "Tekrar"): hiçbir zaman değişken sayılmaz */
export const SIRA_SUTUNLARI: ReadonlySet<string> = new Set(['vg-cekilis', 'vg-tekrar']);

export function kategorikMi(tablo: VeriTablosu, sutun: number): boolean {
  const s = tablo.sutunlar[sutun];
  if (!s || s.tur !== 'etiket' || SIRA_SUTUNLARI.has(s.id)) return false;
  if (sutun > 0) return true;
  const metinler = sutunMetinleri(tablo, 0).map((m) => m.deger);
  return metinler.length >= 2 && new Set(metinler).size < metinler.length;
}

/** Değişken rozetlerinde / menülerinde gösterilecek sütunlar (tablo sırasıyla) */
export function degiskenSutunlari(tablo: VeriTablosu): Sutun[] {
  return tablo.sutunlar.filter((s, i) => s.tur === 'sayi' || kategorikMi(tablo, i));
}

/**
 * Kategoriler: önce verilen sıra (aygıttaki sırayla, verisi olmasa da), sonra verideki diğerleri
 * Türkçe alfabetik (sayı gibi okunanlar sayısal sırayla).
 */
export function kategoriler(degerler: string[], sira?: string[]): string[] {
  const kume = new Set(degerler.map((d) => d.trim()).filter((d) => d !== ''));
  const sonuc: string[] = [];
  const eklenen = new Set<string>();
  for (const k of sira ?? []) {
    const t = k.trim();
    if (t === '' || eklenen.has(t)) continue;
    sonuc.push(t);
    eklenen.add(t);
  }
  const kalan = [...kume].filter((k) => !eklenen.has(k));
  kalan.sort((a, b) => {
    const na = Number(a.replace(',', '.'));
    const nb = Number(b.replace(',', '.'));
    if (Number.isFinite(na) && Number.isFinite(nb) && a.trim() !== '' && b.trim() !== '') return na - nb;
    return a.localeCompare(b, 'tr');
  });
  return [...sonuc, ...kalan];
}

export interface Frekans {
  kategori: string;
  sayi: number;
  /** göreli sıklık (0–1) */
  oran: number;
}

export function frekanslar(degerler: string[], sira?: string[]): Frekans[] {
  const temiz = degerler.map((d) => d.trim()).filter((d) => d !== '');
  const sayac = new Map<string, number>();
  for (const d of temiz) sayac.set(d, (sayac.get(d) ?? 0) + 1);
  const n = temiz.length;
  return kategoriler(temiz, sira).map((k) => {
    const sayi = sayac.get(k) ?? 0;
    return { kategori: k, sayi, oran: n > 0 ? sayi / n : 0 };
  });
}

/** En sık görülen kategori(ler); veri yoksa boş dizi */
export function mod(degerler: string[], sira?: string[]): string[] {
  const f = frekanslar(degerler, sira);
  const enCok = f.reduce((m, x) => Math.max(m, x.sayi), 0);
  if (enCok === 0) return [];
  return f.filter((x) => x.sayi === enCok).map((x) => x.kategori);
}

/**
 * Ayrık kutucukta nokta yerleşimi: en büyük yarıçapı (rMaks..rMin, 0,5 adım) seçer ki en kalabalık
 * kutudaki noktalar kutu genişliğine satır satır sığıp dikey alanı aşmasın. En küçük yarıçap da
 * sığmıyorsa sigdi = false döner (çağıran dikey adımı sıkıştırmalı ya da başka yerleşime geçmeli).
 */
export function kutuYerlesimi(
  enCok: number,
  kutuGenislik: number,
  dikeyAlan: number,
  rMaks = 22,
  rMin = 1.5,
): { r: number; birim: number; sutunSayisi: number; yukseklik: number; sigdi: boolean } {
  const yerlesim = (r: number) => {
    const birim = 2 * r + (r >= 4 ? 1 : 0.4);
    const sutunSayisi = Math.max(1, Math.floor((kutuGenislik - 8) / birim));
    const yukseklik = Math.ceil(Math.max(0, enCok) / sutunSayisi) * birim;
    return { r, birim, sutunSayisi, yukseklik, sigdi: yukseklik <= dikeyAlan };
  };
  if (enCok <= 0) return yerlesim(Math.min(rMaks, Math.max(rMin, (kutuGenislik - 8) / 4)));
  for (let r = rMaks; r >= rMin; r -= 0.5) {
    const y = yerlesim(r);
    if (y.sigdi) return y;
  }
  return yerlesim(rMin);
}

// ── Kategoriye göre renklendirme (renk anahtarı) ───────────────────────────────

/** Kategorisi boş satırın rengi */
export const BOS_KATEGORI_RENGI = '#9aa5a2';

/**
 * Bir kategorik sütuna göre renk eşlemesi: satır → kategori, kategori → renk (nokta, sütun, saçılım grafikleri
 * ve tablo aynı renkleri kullanır; kutucuk grafikleriyle de aynı palet).
 */
export interface RenkEslemesi {
  /** renklendiren sütunun indeksi ve adı */
  sutun: number;
  ad: string;
  kategoriler: string[];
  renkler: Map<string, string>;
  /** satır indeksi → kategori (boş hücreli satırlar yok) */
  satirKategorisi: Map<number, string>;
}

export function renkEslemesi(tablo: VeriTablosu, sutun: number, sira?: string[]): RenkEslemesi | null {
  if (sutun < 0 || sutun >= tablo.sutunlar.length) return null;
  const metinler = sutunMetinleri(tablo, sutun);
  const kats = kategoriler(
    metinler.map((m) => m.deger),
    sira,
  );
  return {
    sutun,
    ad: tablo.sutunlar[sutun].ad,
    kategoriler: kats,
    renkler: new Map(kats.map((k, i) => [k, kategoriRengi(k, i)])),
    satirKategorisi: new Map(metinler.map((m) => [m.satir, m.deger])),
  };
}

/** Satırın renk anahtarındaki rengi (eşleme yoksa undefined, kategori boşsa gri) */
export function satirRengi(eslem: RenkEslemesi | null | undefined, satir: number): string | undefined {
  if (!eslem) return undefined;
  const k = eslem.satirKategorisi.get(satir);
  return k === undefined ? BOS_KATEGORI_RENGI : eslem.renkler.get(k) ?? BOS_KATEGORI_RENGI;
}

/** Kategori başına satır sayısı (verilen satırlar arasında; verilmezse bütün satırlar) */
export function kategoriSayilari(eslem: RenkEslemesi, satirlar?: Iterable<number>): Map<string, number> {
  const sayilar = new Map<string, number>();
  const kaynak = satirlar ?? eslem.satirKategorisi.keys();
  for (const s of kaynak) {
    const k = eslem.satirKategorisi.get(s);
    if (k !== undefined) sayilar.set(k, (sayilar.get(k) ?? 0) + 1);
  }
  return sayilar;
}

/** Renk anahtarına göre bir satır grubu: kategori null ise anahtar hücresi boş satırlar */
export interface RenkGrubu {
  kategori: string | null;
  renk: string;
  /** verilen sırayla (çizgi grafiğinde satır sırası korunur) */
  satirlar: number[];
}

/** Satırları anahtar kategorilerine ayırır: anahtar sırasıyla, boş gruplar atlanır, kategorisi boş satırlar sonda */
export function renkGruplari(eslem: RenkEslemesi, satirlar: Iterable<number>): RenkGrubu[] {
  const kovalar = new Map<string | null, number[]>();
  for (const s of satirlar) {
    const k = eslem.satirKategorisi.get(s) ?? null;
    const kova = kovalar.get(k);
    if (kova) kova.push(s);
    else kovalar.set(k, [s]);
  }
  const sonuc: RenkGrubu[] = [];
  for (const k of eslem.kategoriler) {
    const kova = kovalar.get(k);
    if (kova) sonuc.push({ kategori: k, renk: eslem.renkler.get(k) ?? BOS_KATEGORI_RENGI, satirlar: kova });
  }
  const bosKova = kovalar.get(null);
  if (bosKova) sonuc.push({ kategori: null, renk: BOS_KATEGORI_RENGI, satirlar: bosKova });
  return sonuc;
}

/** İki yönlü sayımın bir satırı: gösterilen değişkenin bir kategorisi, anahtar kategorilerine bölünmüş */
export interface CaprazSatiri {
  kategori: string;
  toplam: number;
  /** eslem.kategoriler sırasıyla sayılar */
  sayilar: number[];
  /** anahtar hücresi boş satır sayısı */
  bos: number;
}

/**
 * İki yönlü (çapraz) sayım: sütundaki her kategori için renk anahtarının kategorilerine göre satır sayıları.
 * Kategori sırası frekans tablosuyla aynıdır (verilen sıra önce, verisi olmasa da).
 */
export function caprazSayim(tablo: VeriTablosu, sutun: number, eslem: RenkEslemesi, sira?: string[]): CaprazSatiri[] {
  const metinler = sutunMetinleri(tablo, sutun);
  const anahtarSirasi = new Map(eslem.kategoriler.map((k, i) => [k, i]));
  const satirlar = new Map<string, CaprazSatiri>();
  for (const k of kategoriler(
    metinler.map((m) => m.deger),
    sira,
  )) {
    satirlar.set(k, { kategori: k, toplam: 0, sayilar: eslem.kategoriler.map(() => 0), bos: 0 });
  }
  for (const m of metinler) {
    const s = satirlar.get(m.deger);
    if (!s) continue;
    s.toplam += 1;
    const a = eslem.satirKategorisi.get(m.satir);
    const i = a === undefined ? undefined : anahtarSirasi.get(a);
    if (i === undefined) s.bos += 1;
    else s.sayilar[i] += 1;
  }
  return [...satirlar.values()];
}
