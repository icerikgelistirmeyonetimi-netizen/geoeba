/**
 * Veri ve Grafik — kategorik (etiket türündeki) değişkenler için saf yardımcılar:
 * değişken olarak kullanılabilecek sütunlar, kategori sırası, sıklık / göreli sıklık, tepe değer (`mod`),
 * kategori renkleri, nokta grafiğinde ayrık kutucuk yerleşimi ve başlıklar için yönelme eki.
 */
import type { Sutun, VeriTablosu } from './veri';

/**
 * Kategori paleti: ada tonlarından türetilmiş 12 ayrı renk (deniz, mercan, lavanta, altın, zümrüt, gül,
 * zeytin, mor, gök, kiremit, arduvaz, kahve). Hepsinin bağıl parlaklığı 0,18–0,27 bandında: açık (fildişi)
 * ve koyu (mürekkep) kart zemininde en az 3:1 karşıtlık verir; 12 kategoriye kadar renk yinelenmez.
 * Beşinci renk (zümrüt) eskiden turkuazdı; birinci renge (deniz) çok yakın düşüyordu (ΔE 20 → 42).
 */
export const KATEGORI_PALETI = [
  '#2f8394',
  '#c8684a',
  '#7f88c4',
  '#a8782f',
  '#22a06f',
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

/** Onaltılık rengin bağıl parlaklığı (WCAG); onaltılık değilse (CSS değişkeni) null */
export function bagilParlaklik(renk: string): number | null {
  const hex = renk.trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  const kanal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * kanal(0) + 0.7152 * kanal(2) + 0.0722 * kanal(4);
}

/**
 * Kart zemininde seçilmeyecek kadar açık ya da koyu renk mi ("Beyaz" #efe5d0 fildişi kartta 1,2:1, "Siyah" #15302d
 * mürekkep kartta 1:1)? Böyle dolgulu nokta, sütun, dilim ve lejant noktasına metin renginde (temaya göre koyu ya
 * da açık) kenar çizilir. Paletin 12 rengi (bağıl parlaklık 0,16–0,28) kenar almaz.
 */
export function kenarGerekir(renk: string): boolean {
  const l = bagilParlaklik(renk);
  return l !== null && (l > 0.5 || l < 0.06);
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

/** Örnekleyicinin sıra numarası sütunları ("Çekiliş", "Tekrar"): hiçbir zaman değişken sayılmaz */
export const SIRA_SUTUNLARI: ReadonlySet<string> = new Set(['vg-cekilis', 'vg-tekrar']);

// ── Veri toplama (araştırma) sütun rolleri ────────────────────────────────────

/**
 * Veri toplama panelinin tabloya yazdığı sütunların rolleri. Sütun kimliği `${arastirma.kimlik}-${rol}`
 * biçimindedir (ör. `ar7-x3k2-cevap`): cevap (anket seçeneği), grup (Sınıf …), ad (ölçülen kişi),
 * deger (ölçüm), s0 / s1 (deney sonucu; iki sayı küpünde 1. ve 2. küp), toplam (iki küpün toplamı), deney.
 */
export const ARASTIRMA_ROLLERI = ['cevap', 'grup', 'ad', 'deger', 's0', 's1', 'toplam', 'deney'] as const;
export type ArastirmaSutunRolu = (typeof ARASTIRMA_ROLLERI)[number];

const ARASTIRMA_KIMLIGI = /^ar\d+-[a-z0-9]+-([a-z0-9]+)$/;

/** Sütun kimliğinden araştırma rolü; veri toplama sütunu değilse (elle eklenen, örnek veri …) null */
export function arastirmaSutunRolu(id: string): ArastirmaSutunRolu | null {
  const m = ARASTIRMA_KIMLIGI.exec(id);
  return m && (ARASTIRMA_ROLLERI as readonly string[]).includes(m[1]) ? (m[1] as ArastirmaSutunRolu) : null;
}

/** Etiket türündeyken her zaman kategorik değişken sayılan roller (boş tabloda da eksen atanabilsin) */
const KATEGORIK_ROLLER: ReadonlySet<ArastirmaSutunRolu> = new Set<ArastirmaSutunRolu>(['cevap', 'grup', 's0', 's1', 'deney']);

/**
 * Kategorik değişken sayılan sütun mu? Etiket türündeki sütunlar kategoriktir. İstisnalar:
 * - sıra numarası sütunları (`SIRA_SUTUNLARI`) hiçbir zaman sayılmaz;
 * - veri toplama sütunlarında rol belirler: 'ad' (kişi adı) sayılmaz; cevap / grup / s0 / s1 / deney
 *   veri olmasa da sayılır (anket ya da deney tablosu boşken eksen bu sütuna atanır);
 * - rolsüz ilk sütun (satır adı: "Ayşe", "1. maç" …) her değeri farklıysa sayılmaz — tekrar eden değer varsa sayılır.
 */
export function kategorikMi(tablo: VeriTablosu, sutun: number): boolean {
  const s = tablo.sutunlar[sutun];
  if (!s || s.tur !== 'etiket' || SIRA_SUTUNLARI.has(s.id)) return false;
  const rol = arastirmaSutunRolu(s.id);
  if (rol === 'ad') return false;
  if (rol !== null && KATEGORIK_ROLLER.has(rol)) return true;
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

/**
 * Tepe değer: en sık görülen kategori(ler). Veri yoksa boş dizi. En az iki kategori varken bütün kategoriler
 * eşit sayıdaysa da boş dizi döner ("bütün değerler eşit sayıda: tepe değer yok"); verilen sıradaki hiç
 * görülmemiş (sıklığı 0) kategoriler de sayılır: 3 · 3 · 0 sıklıklarında tepe değer ilk ikisidir.
 */
export function mod(degerler: string[], sira?: string[]): string[] {
  const f = frekanslar(degerler, sira);
  const enCok = f.reduce((m, x) => Math.max(m, x.sayi), 0);
  if (enCok === 0) return [];
  if (f.length >= 2 && f.every((x) => x.sayi === enCok)) return [];
  return f.filter((x) => x.sayi === enCok).map((x) => x.kategori);
}

/** Bütün kategoriler eşit sayıdayken tepe değer kartında yazan açıklama */
export const TEPE_DEGER_YOK = 'bütün değerler eşit sayıda: tepe değer yok';

const SESLILER = 'aıoueiöü';
const INCE_SESLILER = 'eiöü';
/** Rakamların okunuşundaki son sesli ve okunuşun sesliyle bitip bitmediği (0 sıfır, 1 bir, 2 iki …) */
const RAKAM_OKUNUSU: Record<string, [string, boolean]> = {
  '0': ['ı', false],
  '1': ['i', false],
  '2': ['i', true],
  '3': ['ü', false],
  '4': ['ö', false],
  '5': ['e', false],
  '6': ['ı', true],
  '7': ['i', true],
  '8': ['i', false],
  '9': ['u', false],
};
/** Onlar basamağı (sonu 0 olan sayılar): 10 on, 20 yirmi, 30 otuz … */
const ONLAR_OKUNUSU: Record<string, [string, boolean]> = {
  '1': ['o', false],
  '2': ['i', true],
  '3': ['u', false],
  '4': ['ı', false],
  '5': ['i', true],
  '6': ['ı', false],
  '7': ['i', false],
  '8': ['e', false],
  '9': ['a', false],
};

/**
 * Sütun adına kesme işaretiyle yönelme eki: "Sınıf" → "Sınıf'a", "Meyve" → "Meyve'ye", "Renk" → "Renk'e",
 * "Oy pusulası" → "Oy pusulası'na" (tamlamada n kaynaştırması), "2. küp" → "2. küp'e". Sondaki birim ayracı
 * ("Boy (cm)") ek için yok sayılır. "Sınıf'a göre sıklık tablosu" gibi başlıklarda kullanılır.
 */
export function yonelmeEkli(ad: string): string {
  const govde = ad.replace(/\s*\([^()]*\)\s*$/, '').trim() || ad.trim();
  if (govde === '') return ad;
  const kucuk = govde.toLocaleLowerCase('tr');
  const sonHarf = kucuk[kucuk.length - 1];
  let sonSesli: string | null = null;
  let sesliyleBiter = SESLILER.includes(sonHarf);
  if (/\d/.test(sonHarf)) {
    const onlar = kucuk.length >= 2 ? kucuk[kucuk.length - 2] : '';
    const okunus =
      sonHarf !== '0'
        ? RAKAM_OKUNUSU[sonHarf]
        : /\d/.test(onlar) && onlar !== '0'
          ? ONLAR_OKUNUSU[onlar]
          : /00$/.test(kucuk)
            ? (['ü', false] as [string, boolean]) // yüz, bin
            : RAKAM_OKUNUSU['0'];
    [sonSesli, sesliyleBiter] = okunus;
  } else {
    for (let i = kucuk.length - 1; i >= 0; i--) {
      if (SESLILER.includes(kucuk[i])) {
        sonSesli = kucuk[i];
        break;
      }
    }
  }
  const unlu = sonSesli !== null && INCE_SESLILER.includes(sonSesli) ? 'e' : 'a';
  if (!sesliyleBiter) return `${govde}'${unlu}`;
  // Birden çok sözcüklü ad ı / i / u / ü ile bitiyorsa tamlamadır (Oy pusulası, Göz rengi): n kaynaştırması
  const tamlama = /\s/.test(govde) && 'ıiuü'.includes(sonHarf);
  return `${govde}'${tamlama ? 'n' : 'y'}${unlu}`;
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
