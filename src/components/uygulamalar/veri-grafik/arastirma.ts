/**
 * Veri ve Grafik — "Veri topla" araştırma modeli (saf, React'siz).
 *
 * Bir araştırma, ortaokulun istatistiksel araştırma sürecinin beş adımını taşır: Soru · Plan · Topla ·
 * Düzenle · Yorumla. Veri üç yoldan toplanır: Anket (sor ve say), Ölçüm (ölç ve yaz), Deney (at ve
 * kaydet). Toplanan veri doğrudan Tablom'a yazılır; araştırma yalnız soruyu, planı, tahmini, sonucu ve
 * deney çalışmalarını saklar (`durum.arastirma`, kalıcı).
 *
 * Plan uygulanınca Tablom'a yazılan sütunların kimlikleri `${kimlik}-${rol}` biçimindedir
 * (ör. `ar7-x3k2-cevap`); rol, `kategorik.ts`'teki `arastirmaSutunRolu` ile geri okunur.
 *
 * İçe aktarma yönü: `deney.ts` bu modülden yalnız tür alır; bu modül `deney.ts`'in sabitlerini ve
 * varsayılan deney planını kullanır. `durum.ts` içe aktarılmaz (durum.ts bu modülü kullanır).
 */
import { kimlikUret, sayiOku, sayiYaz, type GrafikTuru, type Sutun, type SutunTuru, type VeriTablosu } from './veri';
import { ARASTIRMA_ROLLERI, arastirmaSutunRolu, type ArastirmaSutunRolu } from './kategorik';
import { EN_COK_TOP, type CarkDilimi, type KaristiriciOgesi } from './ornekleyici';
import { guzelEksen, ortalama, ortalamaMutlakSapma, ortanca, temizle, tepeDeger } from './istatistik';
import {
  DENEY_NESNELERI,
  EN_COK_ATIS,
  EN_COK_TABLO_SATIRI,
  TABLOYA_YAZMA_SINIRI,
  ayniSonuc,
  calismaSatirlari,
  calismaSayilari,
  deneyEtiketi,
  deneySikliklari,
  etkinIzlenen,
  eylemMetni,
  fiil,
  fiilBulunma,
  fiilCogul,
  fiilIle,
  gercekEtiketi,
  izlenenTeorik,
  siraliCalismalar,
  sonucDegerleri,
  sonucSayisalMi,
  sonucSutunAdi,
  tekDeneyAtisi,
  teorikGosterilir,
  teorikOlasiliklar,
  toplamAtis,
  torbadakiTopSayisi,
  varsayilanDeneyPlani,
} from './deney';

export { ARASTIRMA_ROLLERI, arastirmaSutunRolu };
export type { CarkDilimi };

// ── Türler ────────────────────────────────────────────────────────────────────

/** Araştırma sütununun rolü (kimliğin son parçası): cevap, grup, ad, deger, s0, s1, toplam, deney */
export type SutunRolu = ArastirmaSutunRolu;

export type ToplamaYontemi = 'anket' | 'olcum' | 'deney';
export type ArastirmaAdimi = 'soru' | 'plan' | 'topla' | 'duzenle' | 'yorum';
export type DeneyNesnesi = 'para' | 'zar' | 'iki-zar' | 'cark' | 'torba';
/** 'oto' = atış sayısına göre (önerilen); 0 Yavaş, 1 Orta, 2 Hızlı, 3 Anında */
export type HizSecimi = 'oto' | 0 | 1 | 2 | 3;
/** Ölçme duyarlığı: değerler bu adıma yuvarlanır (tam sayı, 0,5, 0,1) */
export type OlcmeDuyarligi = 1 | 0.5 | 0.1;
/** Deneyde kayıt kipi: sınıfta atılıp dokunarak yazılır ya da bilgisayar atar */
export type KayitKipi = 'gercek' | 'simulasyon';

/** Cevapları ya da ölçümleri ayıran grup (ör. Sınıf: 6-A / 6-B); 2–6 seçenek */
export interface Grup {
  /** grup sütununun adı ("Sınıf") */
  ad: string;
  secenekler: string[];
  /** Topla'da "CEVAP VEREN" segmentinde seçili grubun indeksi */
  etkin: number;
}

/** Torbadaki bir renk ve top sayısı */
export type TorbaRengi = KaristiriciOgesi;

/** Bir deney çalışması: bir "20 kez at" ya da elle kaydedilen gerçek atışların tamamı */
export interface DeneyCalismasi {
  /** simülasyon sırası (1, 2, …); gerçek atışlarda 0 */
  no: number;
  /** "1. deney (20)" | "Gerçek atışlar"; Deney sütunundaki etiket de budur */
  etiket: string;
  /** tamamlanan atış */
  n: number;
  /**
   * İzlenen sonuç sütununun (iki küpte Toplam, ötekilerde s0) değerlerine göre sayılar; anahtarlar
   * `deney.ts`'teki `sonucAnahtari` yazımıyla. `tabloda` = false iken tek kaynak budur.
   */
  sayilar: Record<string, number>;
  /** satırları Tablom'a yazıldı mı (500 ve üstü atış yazılmaz) */
  tabloda: boolean;
  /** elle kaydedilen gerçek atışlar mı */
  gercek: boolean;
}

export interface AnketPlani {
  /** tablo sütununun adı ("Meyve"); boşsa plan "Cevap" adını kullanır */
  degiskenAdi: string;
  /** 2–12 seçenek; seçeneklerin hepsi sayıysa sütun sayısaldır */
  secenekler: string[];
  grup: Grup | null;
}

export interface OlcumPlani {
  /** neyi ölçüyoruz ("Nabız") */
  degiskenAdi: string;
  /** "atım/dk" */
  birim: string;
  duyarlik: OlcmeDuyarligi;
  /** "Adları da yaz" (varsayılan kapalı) */
  adYaz: boolean;
  /** "KAÇ KİŞİ?" (isteğe bağlı; Topla'da ilerleme çubuğu) */
  hedefSayi: number | null;
  /** hazır ölçümlerde beklenen eksen aralığı [en küçük, en büyük] (eksen yalnız genişler) */
  beklenen: [number, number] | null;
  grup: Grup | null;
}

export interface TorbaPlani {
  /** en çok 6 renk, toplam en çok 60 top */
  toplar: TorbaRengi[];
  /** "Çekilen topu torbaya geri at" */
  geriAt: boolean;
}

export interface CarkPlani {
  /** sonuç sütununun adı ("Cevap", "Penaltı"; varsayılan "Çark") */
  degiskenAdi: string;
  /** en çok 12 dilim; yüzdeler toplamı 100 değilse orantılı düzeltilir */
  dilimler: CarkDilimi[];
}

export interface DeneyPlani {
  nesne: DeneyNesnesi;
  kayit: KayitKipi;
  /** "KAÇ ATIŞ?" (1–2000) */
  atisSayisi: number;
  hiz: HizSecimi;
  /** "NEYİ SAYACAĞIZ?"; null = nesnenin varsayılanı (Tura / 6 / 7 / ilk dilim / ilk renk) */
  izlenen: string | null;
  /** "Teorik olasılığı göster" (varsayılan açık) */
  teorikGoster: boolean;
  torba: TorbaPlani;
  cark: CarkPlani;
  /** çalışmalar, yapılış sırasıyla */
  calismalar: DeneyCalismasi[];
}

export interface Arastirma {
  surum: 1;
  /** `kimlikUret('ar')` biçiminde ("ar7-x3k2"); sütun kimliklerinin öneki */
  kimlik: string;
  /** hazır sorudan başlandıysa onun kimliği */
  hazirId: string | null;
  /** ≤ 140 */
  soru: string;
  /** kime soruldu / kimler ölçüldü; ≤ 40 */
  kimden: string;
  yontem: ToplamaYontemi | null;
  adim: ArastirmaAdimi;
  /** ≤ 40 */
  tahmin: string;
  /** "SONUCUMUZ"; ≤ 400 */
  sonuc: string;
  anket: AnketPlani;
  olcum: OlcumPlani;
  deney: DeneyPlani;
  /** plan uygulanınca Tablom'daki sütunların kimlikleri (rol → kimlik); null = henüz uygulanmadı */
  sutunlar: Partial<Record<SutunRolu, string>> | null;
}

// ── Sabitler ve sınırlar ──────────────────────────────────────────────────────

export const TOPLAMA_YONTEMLERI: readonly ToplamaYontemi[] = ['anket', 'olcum', 'deney'];
export const ARASTIRMA_ADIMLARI: readonly ArastirmaAdimi[] = ['soru', 'plan', 'topla', 'duzenle', 'yorum'];
export const OLCME_DUYARLIKLARI: readonly OlcmeDuyarligi[] = [1, 0.5, 0.1];
export const HIZ_SECIMLERI: readonly HizSecimi[] = ['oto', 0, 1, 2, 3];

/** Metin sınırları (karakter): soru, kimden, tahmin, sonuç; seçenek, sütun, grup ve renk adları (`ad`) */
export const METIN_SINIRI = { soru: 140, kimden: 40, tahmin: 40, sonuc: 400, ad: 24 } as const;

export const EN_AZ_SECENEK = 2;
export const EN_COK_SECENEK = 12;
export const EN_AZ_GRUP = 2;
export const EN_COK_GRUP = 6;
export const EN_COK_RENK = 6;
/** Torbada en çok bu kadar top olur (ornekleyici.ts ile aynı sınır) */
export const EN_COK_TORBA_TOPU = EN_COK_TOP;
export const EN_AZ_DILIM = 2;
export const EN_COK_DILIM = 12;
/** Saklanan deney çalışması sınırı (7 deneylik seri ~28 kez) */
export const EN_COK_CALISMA = 200;

// ── Kimlikler ve varsayılanlar ────────────────────────────────────────────────

const ARASTIRMA_KIMLIGI = /^ar\d+-[a-z0-9]+$/;

/** Yeni araştırma kimliği ("ar7-x3k2"); sütun kimliği kalıbına (`arastirmaSutunRolu`) her zaman uyar */
export function arastirmaKimligiUret(): string {
  for (;;) {
    const k = kimlikUret('ar');
    if (ARASTIRMA_KIMLIGI.test(k)) return k;
  }
}

/** Araştırma sütununun kimliği: `${kimlik}-${rol}` (ör. "ar7-x3k2-cevap") */
export function arastirmaSutunKimligi(kimlik: string, rol: SutunRolu): string {
  return `${kimlik}-${rol}`;
}

/** Grup açılınca gelen varsayılan: "Sınıf" · 6-A / 6-B */
export function varsayilanGrup(): Grup {
  return { ad: 'Sınıf', secenekler: ['6-A', '6-B'], etkin: 0 };
}

/**
 * Boş araştırma: yeni kimlik, Soru adımı, yöntem seçilmemiş, plan uygulanmamış. Anket ve ölçüm
 * adları boştur (Plan'da yer tutucular görünür); iki boş seçenek satırı hazırdır. Deney planı
 * `varsayilanDeneyPlani()`'dir (madenî para, bilgisayar atar, 20 atış).
 */
export function varsayilanArastirma(): Arastirma {
  return {
    surum: 1,
    kimlik: arastirmaKimligiUret(),
    hazirId: null,
    soru: '',
    kimden: '',
    yontem: null,
    adim: 'soru',
    tahmin: '',
    sonuc: '',
    anket: { degiskenAdi: '', secenekler: ['', ''], grup: null },
    olcum: { degiskenAdi: '', birim: '', duyarlik: 1, adYaz: false, hedefSayi: null, beklenen: null, grup: null },
    deney: varsayilanDeneyPlani(),
    sutunlar: null,
  };
}

// ── Kalıcılık doğrulaması ─────────────────────────────────────────────────────

type Ham = Record<string, unknown>;

const nesneMi = (x: unknown): x is Ham => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Metni en çok `sinir` karaktere kırpar (vekil çiftleri bölmeden) */
function kirp(m: string, sinir: number): string {
  return m.length <= sinir ? m : Array.from(m).slice(0, sinir).join('');
}

/** Metin alanı: metin kırpılır, sonlu sayı metne çevrilir; öteki her şey null */
function metinAl(x: unknown, sinir: number): string | null {
  if (typeof x === 'string') return kirp(x, sinir);
  if (typeof x === 'number' && Number.isFinite(x)) return kirp(String(x), sinir);
  return null;
}

function sayiAl(x: unknown): number | null {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x === 'string') return sayiOku(x);
  return null;
}

/** Tam sayı alanı: yuvarlanır ve [enAz, enCok] aralığına sıkıştırılır; okunamıyorsa varsayılan */
function tamSayiAl(x: unknown, enAz: number, enCok: number, varsayilan: number): number {
  const s = sayiAl(x);
  if (s === null) return varsayilan;
  return Math.min(enCok, Math.max(enAz, Math.round(s)));
}

/** Metin listesi (metin olmayan öğeler atlanır, her öğe kırpılır); dizi değilse null */
function metinListesi(x: unknown, sinir: number, enCok: number): string[] | null {
  if (!Array.isArray(x)) return null;
  const liste: string[] = [];
  for (const o of x) {
    const m = metinAl(o, sinir);
    if (m !== null) liste.push(m);
    if (liste.length >= enCok) break;
  }
  return liste;
}

function grupDogrula(ham: unknown): Grup | null {
  if (!nesneMi(ham)) return null;
  const secenekler = metinListesi(ham.secenekler, METIN_SINIRI.ad, EN_COK_GRUP);
  if (!secenekler || secenekler.length < EN_AZ_GRUP) return null;
  return {
    ad: metinAl(ham.ad, METIN_SINIRI.ad) ?? 'Sınıf',
    secenekler,
    etkin: tamSayiAl(ham.etkin, 0, secenekler.length - 1, 0),
  };
}

function anketDogrula(ham: unknown, v: AnketPlani): AnketPlani {
  if (!nesneMi(ham)) return v;
  const liste = metinListesi(ham.secenekler, METIN_SINIRI.ad, EN_COK_SECENEK);
  let secenekler = v.secenekler;
  if (liste) {
    secenekler = liste;
    while (secenekler.length < EN_AZ_SECENEK) secenekler.push('');
  }
  return {
    degiskenAdi: metinAl(ham.degiskenAdi, METIN_SINIRI.ad) ?? v.degiskenAdi,
    secenekler,
    grup: grupDogrula(ham.grup),
  };
}

function olcumDogrula(ham: unknown, v: OlcumPlani): OlcumPlani {
  if (!nesneMi(ham)) return v;
  const hedef = sayiAl(ham.hedefSayi);
  let beklenen: [number, number] | null = null;
  if (Array.isArray(ham.beklenen) && ham.beklenen.length === 2) {
    const a = sayiAl(ham.beklenen[0]);
    const b = sayiAl(ham.beklenen[1]);
    if (a !== null && b !== null && a !== b) beklenen = [Math.min(a, b), Math.max(a, b)];
  }
  return {
    degiskenAdi: metinAl(ham.degiskenAdi, METIN_SINIRI.ad) ?? v.degiskenAdi,
    birim: metinAl(ham.birim, METIN_SINIRI.ad) ?? v.birim,
    duyarlik: OLCME_DUYARLIKLARI.includes(ham.duyarlik as OlcmeDuyarligi) ? (ham.duyarlik as OlcmeDuyarligi) : v.duyarlik,
    adYaz: ham.adYaz === true,
    hedefSayi: hedef !== null && hedef >= 1 ? Math.min(EN_COK_TABLO_SATIRI, Math.round(hedef)) : null,
    beklenen,
    grup: grupDogrula(ham.grup),
  };
}

function torbaDogrula(ham: unknown, v: TorbaPlani): TorbaPlani {
  if (!nesneMi(ham)) return v;
  let kalan = EN_COK_TORBA_TOPU;
  const toplar: TorbaRengi[] = [];
  if (Array.isArray(ham.toplar)) {
    for (const t of ham.toplar) {
      if (!nesneMi(t)) continue;
      const adet = Math.min(kalan, tamSayiAl(t.adet, 0, EN_COK_TORBA_TOPU, 0));
      kalan -= adet;
      toplar.push({ etiket: metinAl(t.etiket, METIN_SINIRI.ad) ?? '', adet });
      if (toplar.length >= EN_COK_RENK) break;
    }
  }
  return { toplar: toplar.length > 0 ? toplar : v.toplar, geriAt: ham.geriAt !== false };
}

function carkDogrula(ham: unknown, v: CarkPlani): CarkPlani {
  if (!nesneMi(ham)) return v;
  const dilimler: CarkDilimi[] = [];
  if (Array.isArray(ham.dilimler)) {
    for (const x of ham.dilimler) {
      if (!nesneMi(x)) continue;
      dilimler.push({ etiket: metinAl(x.etiket, METIN_SINIRI.ad) ?? '', yuzde: Math.min(100, Math.max(0, sayiAl(x.yuzde) ?? 0)) });
      if (dilimler.length >= EN_COK_DILIM) break;
    }
  }
  return {
    degiskenAdi: metinAl(ham.degiskenAdi, METIN_SINIRI.ad) ?? v.degiskenAdi,
    dilimler: dilimler.length >= EN_AZ_DILIM ? dilimler : v.dilimler,
  };
}

const ETIKET_SINIRI = 40;
const EN_COK_SAYI_ANAHTARI = 64;

function calismaDogrula(ham: unknown, nesne: DeneyNesnesi): DeneyCalismasi | null {
  if (!nesneMi(ham)) return null;
  const gercek = ham.gercek === true;
  const no = gercek ? 0 : tamSayiAl(ham.no, 1, 9999, 1);
  const n = tamSayiAl(ham.n, 0, EN_COK_ATIS, 0);
  const sayilar: Record<string, number> = {};
  if (nesneMi(ham.sayilar)) {
    let adet = 0;
    for (const [k, x] of Object.entries(ham.sayilar)) {
      if (k === '__proto__' || k.length > METIN_SINIRI.ad) continue;
      const s = sayiAl(x);
      if (s === null) continue;
      sayilar[k] = Math.min(EN_COK_ATIS, Math.max(0, Math.round(s)));
      if (++adet >= EN_COK_SAYI_ANAHTARI) break;
    }
  }
  return {
    no,
    etiket: metinAl(ham.etiket, ETIKET_SINIRI) ?? (gercek ? gercekEtiketi(nesne) : deneyEtiketi(no, n)),
    n,
    sayilar,
    tabloda: typeof ham.tabloda === 'boolean' ? ham.tabloda : n < TABLOYA_YAZMA_SINIRI,
    gercek,
  };
}

function deneyDogrula(ham: unknown, v: DeneyPlani): DeneyPlani {
  if (!nesneMi(ham)) return v;
  const nesne = DENEY_NESNELERI.includes(ham.nesne as DeneyNesnesi) ? (ham.nesne as DeneyNesnesi) : 'para';
  const calismalar: DeneyCalismasi[] = [];
  if (Array.isArray(ham.calismalar)) {
    for (const c of ham.calismalar) {
      const g = calismaDogrula(c, nesne);
      if (g) calismalar.push(g);
      if (calismalar.length >= EN_COK_CALISMA) break;
    }
  }
  return {
    nesne,
    kayit: ham.kayit === 'gercek' || ham.kayit === 'simulasyon' ? ham.kayit : v.kayit,
    // Eski kayıttaki 500 / 2000 tek deney tabloya yazılmazdı (grafik boş kalırdı): en büyük çipe iner
    atisSayisi: tekDeneyAtisi(tamSayiAl(ham.atisSayisi, 1, EN_COK_ATIS, v.atisSayisi)),
    hiz: HIZ_SECIMLERI.includes(ham.hiz as HizSecimi) ? (ham.hiz as HizSecimi) : v.hiz,
    izlenen: metinAl(ham.izlenen, METIN_SINIRI.ad),
    teorikGoster: ham.teorikGoster !== false,
    torba: torbaDogrula(ham.torba, v.torba),
    cark: carkDogrula(ham.cark, v.cark),
    calismalar,
  };
}

function sutunlarDogrula(ham: unknown): Partial<Record<SutunRolu, string>> | null {
  if (!nesneMi(ham)) return null;
  const sutunlar: Partial<Record<SutunRolu, string>> = {};
  let bos = true;
  for (const rol of ARASTIRMA_ROLLERI) {
    const id = ham[rol];
    if (typeof id === 'string' && id.length <= 64 && arastirmaSutunRolu(id) === rol) {
      sutunlar[rol] = id;
      bos = false;
    }
  }
  return bos ? null : sutunlar;
}

/**
 * Kayıttan (localStorage) araştırma. Hiçbir zaman hata atmaz:
 * - nesne olmayan kayıt (null, sayı, metin, dizi) → null (geçersiz kayıt; durum.ts `arastirma = null` yazar);
 * - nesnede bozuk ya da eksik alanlar varsayılana döner: bilinmeyen yöntem null, bilinmeyen nesne 'para',
 *   bilinmeyen adım 'soru'; metinler sınırlarına (§8.5), seçenekler 12'ye, gruplar 6'ya, renkler 6'ya ve
 *   60 topa, dilimler 12'ye kırpılır; sayılar tam sayıya yuvarlanıp aralığa sıkıştırılır;
 * - yöntem seçilmemişse adım 'soru'; plan uygulanmamışken (sutunlar null) Topla / Düzenle / Yorumla → 'plan';
 * - geçerli bir araştırma değişmeden geçer (dogrula(a) ile a derin eşittir); bilinmeyen alanlar düşer.
 */
export function arastirmaDogrula(ham: unknown): Arastirma | null {
  if (!nesneMi(ham)) return null;
  const v = varsayilanArastirma();
  const kimlik = typeof ham.kimlik === 'string' && ARASTIRMA_KIMLIGI.test(ham.kimlik) ? ham.kimlik : v.kimlik;
  const yontem = TOPLAMA_YONTEMLERI.includes(ham.yontem as ToplamaYontemi) ? (ham.yontem as ToplamaYontemi) : null;
  const sutunlar = sutunlarDogrula(ham.sutunlar);
  let adim = ARASTIRMA_ADIMLARI.includes(ham.adim as ArastirmaAdimi) ? (ham.adim as ArastirmaAdimi) : 'soru';
  if (yontem === null) adim = 'soru';
  else if (sutunlar === null && adim !== 'soru' && adim !== 'plan') adim = 'plan';
  const hazirId = metinAl(ham.hazirId, ETIKET_SINIRI);
  return {
    surum: 1,
    kimlik,
    hazirId: hazirId === '' ? null : hazirId,
    soru: metinAl(ham.soru, METIN_SINIRI.soru) ?? '',
    kimden: metinAl(ham.kimden, METIN_SINIRI.kimden) ?? '',
    yontem,
    adim,
    tahmin: metinAl(ham.tahmin, METIN_SINIRI.tahmin) ?? '',
    sonuc: metinAl(ham.sonuc, METIN_SINIRI.sonuc) ?? '',
    anket: anketDogrula(ham.anket, v.anket),
    olcum: olcumDogrula(ham.olcum, v.olcum),
    deney: deneyDogrula(ham.deney, v.deney),
    sutunlar,
  };
}

// ── Yöntemler ve hazır sorular ────────────────────────────────────────────────

/** Soru adımındaki yöntem kartları: ad ve alt satır */
export const YONTEM_BILGISI: Readonly<Record<ToplamaYontemi, { ad: string; altSatir: string }>> = {
  anket: { ad: 'Anket', altSatir: 'Sor ve say' },
  olcum: { ad: 'Ölçüm', altSatir: 'Ölç ve yaz' },
  deney: { ad: 'Deney', altSatir: 'At ve kaydet' },
};

/** Hazır soru kartlarının 40 px simgeleri (adlar toplama/simgeler.tsx `HAZIR_SIMGE_ADLARI` ile aynıdır) */
export type HazirSoruSimgesi =
  | 'elma'
  | 'otobus'
  | 'gunes'
  | 'takvim'
  | 'oy-sandigi'
  | 'iki-kisi'
  | 'kitap'
  | 'boy-olcer'
  | 'kalp'
  | 'ay'
  | 'saat'
  | 'para'
  | 'zar'
  | 'torba'
  | 'cark'
  | 'kale'
  | 'seri'
  | 'iki-zar';

export interface HazirSoru {
  id: string;
  yontem: ToplamaYontemi;
  /** kart adı ("En sevilen meyve") */
  ad: string;
  /** araştırma sorusu (≤ 140) */
  soru: string;
  /** "5. sınıf · MAT.5.5.1" · "8. sınıf · MAT.8.6.1 · Simülasyon" */
  rozet: string;
  simge: HazirSoruSimgesi;
  /**
   * Karta dokununca açılan adım: 'topla' (plan varsayılanlarla hemen uygulanır), 'duzenle' (uygulanır, Düzenle'deki
   * Seri açılır), 'plan' (uygulanmaz; ör. aday adları Plan'da yazılır)
   */
  acilis: 'topla' | 'duzenle' | 'plan';
  anket?: { degiskenAdi: string; secenekler: readonly string[] };
  olcum?: { degiskenAdi: string; birim: string; duyarlik: OlcmeDuyarligi; beklenen: readonly [number, number] };
  deney?: {
    nesne: DeneyNesnesi;
    atisSayisi: number;
    izlenen: string;
    torba?: { toplar: readonly TorbaRengi[]; geriAt: boolean };
    cark?: { degiskenAdi: string; dilimler: readonly CarkDilimi[] };
  };
  /**
   * Simülasyonun anlatımı (okul anketi, penaltı): bir çevirme gerçek bir durumun bir parçasıdır (bir kişiye sormak, bir
   * penaltı). Yorum cümleleri ve tahmin alanı "çevirme" yerine bu sözcüklerle kurulur.
   */
  simulasyon?: SimulasyonBaglami;
  /** Öğretmen kartındaki "Bu etkinlikte" notu; verilmezse yöntemin genel notu */
  etkinlik?: string;
  /** Öğretmen notu; verilmezse yöntemin genel notu */
  ogretmenNotu?: string;
  /** Tartışalım soruları (veriye göre); verilmezse yöntemin soruları */
  tartisma?: (b: TartismaBilgisi) => string[];
}

/** Simülasyonun cümle parçaları: "20 kişiye sorduk (simülasyon): 12 kişi “evet” dedi (%60); okulda “evet” diyenler %60." */
export interface SimulasyonBaglami {
  /** "20 kişiye sorduk (simülasyon)"; `ek` parantezin içi (varsayılan "simülasyon") */
  yapilan: (n: number, ek?: string) => string;
  /** "12 kişi “evet” dedi" · "9 gol" */
  sonuc: (sayi: number) => string;
  /** "20 kişide" · "10 penaltıda" */
  bulunma: (n: number) => string;
  /** sayılan sonucun tümce içindeki adı: "“evet”" · "gol" */
  sayilan: string;
  /** gerçek oran: "okulda “evet” diyenler %60" · "oyuncunun gol oranı %70" */
  gercek: string;
}

/** Tartışalım sorularını veriye göre seçmek için kısa özet (`tartismaBilgisi`) */
export interface TartismaBilgisi {
  /** tek deneyin atış sayısı (plan) */
  atis: number;
  /** veri toplanmış bilgisayar deneylerinin sayısı */
  deneySayisi: number;
  /** elle kaydedilmiş gerçek atış var mı */
  gercekVar: boolean;
  /** ölçümde ötekilerden çok uzak değer var mı */
  uzakVar: boolean;
}

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/**
 * 18 hazır soru (VT §12.5): 7 anket, 4 ölçüm, 7 deney. Rozetler kurum belgesindeki kodlarla (6. sınıfın sayısal
 * anketleri örneklerle aynı kodu taşır: MAT.6.5.1). Simülasyonlar "Simülasyon", iki sayı küpü "Zenginleştirme"
 * işaretlidir. Öğretmen kartının kazanım satırları önce bu rozetten kurulur (`hazirRozeti`). Simülasyonlar ve sayı
 * küpleri kendi Tartışalım sorularını, notlarını ve cümle parçalarını taşır.
 */
export const HAZIR_SORULAR: readonly HazirSoru[] = [
  {
    id: 'meyve',
    yontem: 'anket',
    ad: 'En sevilen meyve',
    soru: 'Sınıfımızda en çok sevilen meyve hangisi?',
    rozet: '5. sınıf · MAT.5.5.1',
    simge: 'elma',
    acilis: 'topla',
    anket: { degiskenAdi: 'Meyve', secenekler: ['Elma', 'Muz', 'Çilek', 'Portakal', 'Karpuz'] },
  },
  {
    id: 'ulasim',
    yontem: 'anket',
    ad: 'Okula geliş',
    soru: 'Okula nasıl geliyoruz?',
    rozet: '5. sınıf · MAT.5.5.1',
    simge: 'otobus',
    acilis: 'topla',
    anket: { degiskenAdi: 'Ulaşım', secenekler: ['Yürüyerek', 'Servisle', 'Otobüsle', 'Arabayla', 'Bisikletle'] },
  },
  {
    id: 'mevsim',
    yontem: 'anket',
    ad: 'En sevilen mevsim',
    soru: 'En sevdiğimiz mevsim hangisi?',
    rozet: '5. sınıf · MAT.5.5.1',
    simge: 'gunes',
    acilis: 'topla',
    anket: { degiskenAdi: 'Mevsim', secenekler: ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'] },
  },
  {
    id: 'oylama',
    yontem: 'anket',
    ad: 'Sınıf başkanlığı',
    soru: 'Sınıf başkanlığı seçiminde kim önde?',
    rozet: '5. sınıf · MAT.5.5.1',
    simge: 'oy-sandigi',
    acilis: 'plan',
    anket: { degiskenAdi: 'Aday', secenekler: ['1. aday', '2. aday', '3. aday'] },
  },
  {
    id: 'dogum-ayi',
    yontem: 'anket',
    ad: 'Doğum ayı',
    soru: 'Sınıfımızda en çok hangi ayda doğan var?',
    rozet: '5. sınıf · MAT.5.5.1',
    simge: 'takvim',
    acilis: 'topla',
    anket: { degiskenAdi: 'Doğum ayı', secenekler: AYLAR },
  },
  {
    id: 'kardes',
    yontem: 'anket',
    ad: 'Kardeş sayısı',
    soru: 'Kaç kardeşimiz var?',
    rozet: '6. sınıf · MAT.6.5.1',
    simge: 'iki-kisi',
    acilis: 'topla',
    anket: { degiskenAdi: 'Kardeş sayısı', secenekler: ['0', '1', '2', '3', '4', '5'] },
  },
  {
    id: 'kitap',
    yontem: 'anket',
    ad: 'Okunan kitap',
    soru: 'Bu dönem kaç kitap okuduk?',
    rozet: '6. sınıf · MAT.6.5.1',
    simge: 'kitap',
    acilis: 'topla',
    anket: { degiskenAdi: 'Kitap sayısı', secenekler: ['0', '1', '2', '3', '4', '5', '6'] },
  },
  {
    id: 'boy',
    yontem: 'olcum',
    ad: 'Boyumuz',
    soru: 'Sınıfımızdaki öğrencilerin boyları kaç cm?',
    rozet: '7. sınıf · MAT.7.6.1',
    simge: 'boy-olcer',
    acilis: 'topla',
    olcum: { degiskenAdi: 'Boy', birim: 'cm', duyarlik: 1, beklenen: [130, 175] },
  },
  {
    id: 'nabiz',
    yontem: 'olcum',
    ad: 'Nabzımız',
    soru: 'Bir dakikada nabzımız kaç kez atıyor?',
    rozet: '7. sınıf · MAT.7.6.1',
    simge: 'kalp',
    acilis: 'topla',
    olcum: { degiskenAdi: 'Nabız', birim: 'atım/dk', duyarlik: 1, beklenen: [60, 120] },
  },
  {
    id: 'uyku',
    yontem: 'olcum',
    ad: 'Uyku süremiz',
    soru: 'Dün gece kaç saat uyuduk?',
    rozet: '7. sınıf · MAT.7.6.1',
    simge: 'ay',
    acilis: 'topla',
    olcum: { degiskenAdi: 'Uyku süresi', birim: 'saat', duyarlik: 0.5, beklenen: [6, 11] },
  },
  {
    id: 'gelis',
    yontem: 'olcum',
    ad: 'Okula geliş süresi',
    soru: 'Okula kaç dakikada geliyoruz?',
    rozet: '8. sınıf · MAT.8.6.1',
    simge: 'saat',
    acilis: 'topla',
    olcum: { degiskenAdi: 'Geliş süresi', birim: 'dakika', duyarlik: 1, beklenen: [0, 60] },
  },
  {
    id: 'para',
    yontem: 'deney',
    ad: 'Madenî para',
    soru: 'Madenî parayı 20 kez atarsak kaç kez tura gelir?',
    rozet: '6. sınıf · MAT.6.6.1',
    simge: 'para',
    acilis: 'topla',
    deney: { nesne: 'para', atisSayisi: 20, izlenen: 'Tura' },
  },
  {
    id: 'zar',
    yontem: 'deney',
    ad: 'Sayı küpü',
    soru: 'Sayı küpünü 30 kez atınca her sayı kaç kez gelir?',
    rozet: '6. sınıf · MAT.6.6.1',
    simge: 'zar',
    acilis: 'topla',
    deney: { nesne: 'zar', atisSayisi: 30, izlenen: '6' },
    tartisma: (b) => [
      'Her sayı aynı sayıda mı geldi? Sence neden?',
      b.deneySayisi >= 2
        ? 'Atış sayısını artırınca sayıların göreli sıklıkları birbirine yaklaştı mı?'
        : `Atış sayısı ${b.atis} yerine ${b.atis >= 200 ? 2000 : b.atis * 10} olsaydı sayıların sıklıkları birbirine yaklaşır mıydı?`,
      b.gercekVar
        ? 'Gerçek atışlarla bilgisayarın sonuçları neden farklı olabilir?'
        : `Teorik olasılığa göre ${b.atis} atışta her sayının kaç kez gelmesini beklerdik?`,
    ],
  },
  {
    id: 'torba',
    yontem: 'deney',
    ad: 'Torbadan top',
    soru: 'Torbada 3 kırmızı, 2 mavi top var: 20 çekişte kaç kırmızı çıkar?',
    rozet: '7. sınıf · MAT.7.7.1',
    simge: 'torba',
    acilis: 'topla',
    deney: {
      nesne: 'torba',
      atisSayisi: 20,
      izlenen: 'Kırmızı',
      torba: {
        toplar: [
          { etiket: 'Kırmızı', adet: 3 },
          { etiket: 'Mavi', adet: 2 },
        ],
        geriAt: true,
      },
    },
  },
  {
    id: 'seri',
    yontem: 'deney',
    ad: 'Atış sayısı artınca',
    soru: 'Atış sayısı arttıkça tura çıkma oranı nasıl değişir?',
    rozet: '8. sınıf · MAT.7.7.1 · 8.7.1',
    simge: 'seri',
    acilis: 'duzenle',
    deney: { nesne: 'para', atisSayisi: 20, izlenen: 'Tura' },
  },
  {
    id: 'anket-orneklem',
    yontem: 'deney',
    ad: 'Okul anketi tahmini',
    soru: 'Okulda “evet” diyenler %60 ise 20 kişiye sorunca kaç “evet” çıkar?',
    rozet: '8. sınıf · MAT.8.6.1 · Simülasyon',
    simge: 'cark',
    acilis: 'topla',
    deney: {
      nesne: 'cark',
      atisSayisi: 20,
      izlenen: 'Evet',
      cark: {
        degiskenAdi: 'Cevap',
        dilimler: [
          { etiket: 'Evet', yuzde: 60 },
          { etiket: 'Hayır', yuzde: 40 },
        ],
      },
    },
    simulasyon: {
      yapilan: (n, ek = 'simülasyon') => `${n} kişiye sorduk (${ek})`,
      sonuc: (sayi) => `${sayi} kişi “evet” dedi`,
      bulunma: (n) => `${n} kişide`,
      sayilan: '“evet”',
      gercek: 'okulda “evet” diyenler %60',
    },
    etkinlik:
      'Çark, “evet” diyenlerin %60 olduğu bir okulu canlandırır: her çevirme okuldan rastgele seçilen bir kişinin cevabıdır. 20 kişilik örneklemi birkaç kez seçip “evet” sayısının örneklemden örnekleme değiştiğini ama okulun oranı (%60) çevresinde toplandığını görürüz.',
    ogretmenNotu:
      'Önce sınıfa sorun: 20 kişiye sorsak kaç “evet” bekleriz? “20 kez çevir”e birkaç kez basın; her deney yeni bir 20 kişilik örneklemdir. Sonuçların 12 çevresinde dağıldığını ama her seferinde tam 12 çıkmadığını konuşun. Evren okulun tamamı, örneklem seçilen 20 kişidir. “Çevirme sayısı artınca ne olur?” büyük örneklemde oranın %60 çevresine yerleştiğini gösterir.',
    tartisma: (b) => [
      b.deneySayisi >= 2
        ? `Her deneyde yeni ${b.atis} kişi seçildi: “evet” sayısı her seferinde aynı mı çıktı? Neden?`
        : `Deneyi 5 kez yapsak her seferinde kaç “evet” çıkar? Hep aynı mı olur?`,
      `Okulda “evet” diyenler %60 ise ${b.atis} kişide kaç “evet” beklerdik? Sonuçlarımız buna ne kadar yakın?`,
      `${b.atis} yerine ${b.atis * 5} kişiye sorsaydık “evet” oranı okulun oranına daha mı yakın çıkardı?`,
    ],
  },
  {
    id: 'penalti',
    yontem: 'deney',
    ad: 'Penaltı',
    soru: '%70 gol atan bir oyuncu 10 penaltıda kaç gol atar?',
    rozet: '8. sınıf · MAT.8.7.1 · Simülasyon',
    simge: 'kale',
    acilis: 'topla',
    deney: {
      nesne: 'cark',
      atisSayisi: 10,
      izlenen: 'Gol',
      cark: {
        degiskenAdi: 'Penaltı',
        dilimler: [
          { etiket: 'Gol', yuzde: 70 },
          { etiket: 'Kaçtı', yuzde: 30 },
        ],
      },
    },
    simulasyon: {
      yapilan: (n, ek = 'simülasyon') => `${n} penaltı attık (${ek})`,
      sonuc: (sayi) => `${sayi} gol`,
      bulunma: (n) => `${n} penaltıda`,
      sayilan: 'gol',
      gercek: 'oyuncunun gol oranı %70',
    },
    etkinlik:
      'Çark, penaltıların %70 kadarını gole çeviren bir oyuncuyu canlandırır: her çevirme bir penaltıdır. 10 penaltılık denemelerde gol sayısının her seferinde değiştiğini, çok sayıda penaltıda gol oranının %70 çevresine yerleştiğini görürüz.',
    ogretmenNotu:
      'Önce tahmin alın: 10 penaltıda kaç gol? “10 kez çevir”e birkaç kez basın; 7 gol en olası sonuçtur ama 5, 6, 8 ya da 9 gol de çıkabilir. Gol oranının %70 olması her 10 penaltıda tam 7 gol demek değildir. “Çevirme sayısı artınca ne olur?” ile oranın %70 çevresine yerleştiğini gösterin.',
    tartisma: (b) => [
      `Oyuncunun gol oranı %70 ise ${b.atis} penaltıda kaç gol beklerdik? Tam o sayı mı çıktı?`,
      b.deneySayisi >= 2 ? 'Deneyi yeniden yapınca gol sayısı nasıl değişti?' : 'Deneyi birkaç kez yapsak gol sayısı hep aynı mı çıkar?',
      `${b.atis} yerine ${b.atis * 10} penaltı atılsaydı gol oranı %70 değerine daha mı yakın olurdu?`,
    ],
  },
  {
    id: 'iki-zar',
    yontem: 'deney',
    ad: 'İki sayı küpü',
    soru: 'İki sayı küpünün toplamında en sık hangi sayı çıkar?',
    rozet: '8. sınıf · Zenginleştirme',
    simge: 'iki-zar',
    acilis: 'topla',
    deney: { nesne: 'iki-zar', atisSayisi: 100, izlenen: '7' },
    tartisma: (b) => [
      'Neden bazı toplamlar (7 gibi) ötekilerden daha sık gelir? Her toplam kaç farklı yolla elde edilir?',
      b.deneySayisi >= 2
        ? 'Atış sayısını artırınca en sık çıkan toplam değişti mi?'
        : `Atış sayısı ${b.atis} yerine ${b.atis >= 200 ? 2000 : b.atis * 10} olsaydı dağılım nasıl görünürdü?`,
      b.gercekVar ? 'Gerçek atışlarla bilgisayarın sonuçları neden farklı olabilir?' : 'Toplam 2 ve toplam 12 neden bu kadar seyrek geldi?',
    ],
  },
];

export function hazirSoruBul(id: string | null | undefined): HazirSoru | undefined {
  return id ? HAZIR_SORULAR.find((h) => h.id === id) : undefined;
}

/**
 * Araştırmanın hazır sorusu, plan o soruya hâlâ uyuyorsa: aynı yöntem; deneyde aynı nesne (çarkta aynı dilim adları).
 * Plan değiştirilip başka bir araştırmaya dönüştüyse (ör. çark yerine para) hazır sorunun kazanımı, notları ve cümle
 * parçaları kullanılmaz: undefined.
 */
export function hazirBaglami(a: Arastirma): HazirSoru | undefined {
  const h = hazirSoruBul(a.hazirId);
  if (!h || h.yontem !== a.yontem) return undefined;
  if (h.deney) {
    if (h.deney.nesne !== a.deney.nesne) return undefined;
    if (h.deney.cark) {
      const adlar = (l: readonly { etiket: string }[]) =>
        l
          .map((x) => x.etiket.trim())
          .filter(Boolean)
          .join('|');
      if (adlar(h.deney.cark.dilimler) !== adlar(a.deney.cark.dilimler)) return undefined;
    }
  }
  return h;
}

/** Rozetteki kazanım kodları: "8. sınıf · MAT.7.7.1 · 8.7.1" → ["7.7.1", "8.7.1"] */
export function kazanimKodlari(rozet: string): string[] {
  return [...new Set(Array.from(rozet.matchAll(/(\d)\.(\d)\.(\d)/g)).map((m) => `${m[1]}.${m[2]}.${m[3]}`))];
}

/** Kodların rozeti: ["7.7.1", "8.7.1"] → "MAT.7.7.1 · 8.7.1" */
export function kodRozeti(kodlar: readonly string[]): string {
  return kodlar.length === 0 ? '' : `MAT.${kodlar.join(' · ')}`;
}

/**
 * Hazır sorunun kendi kazanım rozeti: kodlarıyla ("MAT.6.5.1", "MAT.7.7.1 · 8.7.1"); kodu yoksa işareti
 * ("Zenginleştirme"). Hazır soru yoksa ya da plan ona artık uymuyorsa null (yöntemin varsayılanları kullanılır).
 */
export function hazirRozeti(a: Arastirma): string | null {
  const h = hazirBaglami(a);
  if (!h) return null;
  const kodlar = kazanimKodlari(h.rozet);
  if (kodlar.length > 0) return kodRozeti(kodlar);
  return h.rozet.includes('Zenginleştirme') ? 'Zenginleştirme' : null;
}

/** Tümce içinde küçük harfle yazılan sonuç adları; öbür adlar (özel ad olabilir) aynen yazılır */
const KUCUK_YAZILANLAR = new Set([
  'yazı',
  'tura',
  'kırmızı',
  'mavi',
  'yeşil',
  'sarı',
  'mor',
  'turuncu',
  'pembe',
  'siyah',
  'beyaz',
  'gri',
  'kahverengi',
  'lacivert',
  'evet',
  'hayır',
  'gol',
  'kaçtı',
]);

/** Sonucun tümce içindeki yazımı: "Tura" → "tura", "Kırmızı" → "kırmızı"; sayılar ve öbür adlar aynen */
export function tumceIciAdi(etiket: string): string {
  const t = etiket.trim();
  const k = t.toLocaleLowerCase('tr');
  return KUCUK_YAZILANLAR.has(k) ? k : t;
}

/**
 * Hazır soru kartının araştırması: yeni kimlik, soru, yöntem ve plan varsayılanlarla doldurulur; adım 'plan', plan
 * henüz uygulanmamıştır (`sutunlar` null). Kartın açılışı 'topla' ya da 'duzenle' ise panel bunu hemen
 * `toplamaDurumu.planiUygula`'ya verir (adım oraya göre Topla ya da Düzenle olur); 'plan' ise yalnız araştırmayı
 * yazar. Bilinmeyen kimlikte null.
 */
export function hazirSoruUygula(id: string): Arastirma | null {
  const h = hazirSoruBul(id);
  if (!h) return null;
  const a = varsayilanArastirma();
  a.hazirId = h.id;
  a.soru = h.soru;
  a.yontem = h.yontem;
  a.adim = 'plan';
  if (h.anket) a.anket = { degiskenAdi: h.anket.degiskenAdi, secenekler: [...h.anket.secenekler], grup: null };
  if (h.olcum) {
    a.olcum = { ...a.olcum, degiskenAdi: h.olcum.degiskenAdi, birim: h.olcum.birim, duyarlik: h.olcum.duyarlik, beklenen: [h.olcum.beklenen[0], h.olcum.beklenen[1]] };
  }
  if (h.deney) {
    const x = h.deney;
    a.deney = {
      ...a.deney,
      nesne: x.nesne,
      atisSayisi: x.atisSayisi,
      izlenen: x.izlenen,
      torba: x.torba ? { toplar: x.torba.toplar.map((t) => ({ ...t })), geriAt: x.torba.geriAt } : a.deney.torba,
      cark: x.cark ? { degiskenAdi: x.cark.degiskenAdi, dilimler: x.cark.dilimler.map((d) => ({ ...d })) } : a.deney.cark,
    };
  }
  return a;
}

// ── Plan: sütunlar, satırlar ve sorunlar ──────────────────────────────────────

const trKucuk = (m: string) => m.toLocaleLowerCase('tr');

/** Boş olmayan, kırpılmış, yinelenmeyen metinler (sıra korunur) */
function temizListe(liste: readonly string[]): string[] {
  const sonuc: string[] = [];
  for (const x of liste) {
    const t = x.trim();
    if (t !== '' && !sonuc.includes(t)) sonuc.push(t);
  }
  return sonuc;
}

/** Anket seçenekleri: kırpılmış, boş olmayan, yinelenmeyen (plan sırasıyla) */
export function anketSecenekleri(a: Arastirma): string[] {
  return temizListe(a.anket.secenekler);
}

/** Anketin cevap sütunu sayısal mı: en az bir seçenek var ve hepsi sayı (0, 1, 2 …) */
export function anketSayisalMi(a: Arastirma): boolean {
  const s = anketSecenekleri(a);
  return s.length > 0 && s.every((x) => sayiOku(x) !== null);
}

/** Planın grubu: ankette ve ölçümde (varsa); deneyde yok */
export function planGrubu(a: Arastirma): Grup | null {
  if (a.yontem === 'anket') return a.anket.grup;
  if (a.yontem === 'olcum') return a.olcum.grup;
  return null;
}

/** Grubun seçenekleri (kırpılmış, boş olmayan, yinelenmeyen) */
export function grupSecenekleri(g: Grup | null): string[] {
  return g ? temizListe(g.secenekler) : [];
}

/**
 * Bir veri satırının rolleri, sırasıyla (toplama verisinin `hucreler` dizisi bu sıradadır; Deney sütunu otomatiktir):
 * anket [cevap, (grup)]; ölçüm [(ad), deger, (grup)]; deney [s0] ya da iki küpte [s0, s1, toplam].
 */
export function veriRolleri(a: Arastirma): SutunRolu[] {
  if (a.yontem === 'anket') return a.anket.grup ? ['cevap', 'grup'] : ['cevap'];
  if (a.yontem === 'olcum') return [...(a.olcum.adYaz ? (['ad'] as const) : []), 'deger', ...(a.olcum.grup ? (['grup'] as const) : [])];
  if (a.yontem === 'deney') return a.deney.nesne === 'iki-zar' ? ['s0', 's1', 'toplam'] : ['s0'];
  return [];
}

/**
 * Plan sütununun adı: cevap → değişken adı (boşsa "Cevap"); grup → grup adı (boşsa "Grup"); ad → "Öğrenci";
 * deger → "Nabız (atım/dk)" (birim varsa); s0 / s1 / toplam → nesnenin sonuç sütunu adı; deney → "Deney".
 */
export function planSutunAdi(a: Arastirma, rol: SutunRolu): string {
  switch (rol) {
    case 'cevap':
      return a.anket.degiskenAdi.trim() || 'Cevap';
    case 'grup':
      return planGrubu(a)?.ad.trim() || 'Grup';
    case 'ad':
      return 'Öğrenci';
    case 'deger': {
      const ad = a.olcum.degiskenAdi.trim() || 'Değer';
      const birim = a.olcum.birim.trim();
      return birim ? `${ad} (${birim})` : ad;
    }
    case 'deney':
      return 'Deney';
    default:
      return sonucSutunAdi(a.deney, rol);
  }
}

/** Plan sütununun türü: sayısal anket cevabı, ölçüm değeri ve sayı küpü sonuçları sayı; ötekiler etiket */
export function planSutunTuru(a: Arastirma, rol: SutunRolu): SutunTuru {
  if (rol === 'cevap') return anketSayisalMi(a) ? 'sayi' : 'etiket';
  if (rol === 'deger' || rol === 'toplam') return 'sayi';
  if (rol === 's0' || rol === 's1') return sonucSayisalMi(a.deney.nesne) ? 'sayi' : 'etiket';
  return 'etiket';
}

/** Planın sütunları (kimlikler `${kimlik}-${rol}`; sırası veri satırıyla aynı) */
export function planSutunlari(a: Arastirma): Sutun[] {
  return veriRolleri(a).map((rol) => ({ id: arastirmaSutunKimligi(a.kimlik, rol), ad: planSutunAdi(a, rol), tur: planSutunTuru(a, rol) }));
}

/**
 * Planın boş tablosu: anket [cevap (seçeneklerin hepsi sayıysa sayı, değilse etiket), (grup)]; ölçüm [(ad), deger,
 * (grup)]; deney [s0] ya da [s0, s1, toplam]. Deney sütunu ikinci deneyde eklenir. Yöntem yoksa sütunsuz.
 */
export function planTablosu(a: Arastirma): VeriTablosu {
  return { sutunlar: planSutunlari(a), satirlar: [] };
}

/** Tablonun adı (bildirim, menü): ana değişkenin adı ("Meyve", "Nabız (atım/dk)"); deneyde nesne ya da çark sütunu */
export function arastirmaTabloAdi(a: Arastirma): string {
  if (a.yontem === 'anket') return planSutunAdi(a, 'cevap');
  if (a.yontem === 'olcum') return planSutunAdi(a, 'deger');
  if (a.yontem === 'deney') {
    if (a.deney.nesne === 'cark') return sonucSutunAdi(a.deney, 's0');
    return a.deney.nesne === 'para' ? 'Madenî para' : a.deney.nesne === 'zar' ? 'Sayı küpü' : a.deney.nesne === 'iki-zar' ? 'İki sayı küpü' : 'Torba';
  }
  return 'Tablom';
}

/** Yinelenen ilk metin (Türkçe küçük harfle karşılaştırılır; boşlar sayılmaz) */
function yinelenen(liste: readonly string[]): string | null {
  const gorulen = new Set<string>();
  for (const x of liste) {
    const t = x.trim();
    if (t === '') continue;
    const k = trKucuk(t);
    if (gorulen.has(k)) return t;
    gorulen.add(k);
  }
  return null;
}

function grupSorunu(g: Grup | null): string | null {
  if (!g) return null;
  const y = yinelenen(g.secenekler);
  if (y) return `“${y}” grubu iki kez yazılmış.`;
  return grupSecenekleri(g).length < EN_AZ_GRUP ? 'En az iki grup yazın.' : null;
}

/** "Toplamaya başla"yı engelleyen sorun (düğmenin title'ı); yoksa null */
export function planSorunu(a: Arastirma): string | null {
  if (a.yontem === null) return 'Önce veriyi nasıl toplayacağınızı seçin.';
  if (a.yontem === 'anket') {
    const y = yinelenen(a.anket.secenekler);
    if (y) return `“${y}” seçeneği iki kez yazılmış.`;
    if (anketSecenekleri(a).length < EN_AZ_SECENEK) return 'En az iki seçenek yazın.';
    return grupSorunu(a.anket.grup);
  }
  if (a.yontem === 'olcum') {
    if (a.olcum.degiskenAdi.trim() === '') return 'Neyi ölçtüğünüzü yazın (ör. Boy).';
    return grupSorunu(a.olcum.grup);
  }
  const d = a.deney;
  if (d.nesne === 'torba') {
    if (d.torba.toplar.some((t) => t.adet > 0 && t.etiket.trim() === '')) return 'Rengi yazılmamış toplar var.';
    const n = torbadakiTopSayisi(d);
    if (n === 0) return 'Torbada hiç top yok.';
    if (n > EN_COK_TORBA_TOPU) return `Torbada en çok ${EN_COK_TORBA_TOPU} top olabilir.`;
  }
  if (d.nesne === 'cark') {
    if (d.cark.dilimler.some((x) => x.yuzde > 0 && x.etiket.trim() === '')) return 'Adı yazılmamış dilimler var.';
    if (temizListe(d.cark.dilimler.map((x) => x.etiket)).length < EN_AZ_DILIM) return 'Çarkta en az iki dilim olmalı.';
    if (!(d.cark.dilimler.reduce((s, x) => s + (Number.isFinite(x.yuzde) && x.yuzde > 0 ? x.yuzde : 0), 0) > 0)) return 'Dilim yüzdelerinin toplamı 0 olamaz.';
  }
  return null;
}

/**
 * Soru yazılmadan başlanan planın sorusu (görev metni ve soru şeridi boş kalmasın): "Boy kaç cm?" · "En çok hangi
 * meyve seçiliyor?" · "Madenî parayı 20 kez atınca kaç kez tura gelir?". Yöntem seçilmemişse ''.
 */
export function planSorusu(a: Arastirma): string {
  let s = '';
  if (a.yontem === 'anket') {
    const ad = a.anket.degiskenAdi.trim();
    if (anketSayisalMi(a)) s = `${ad || 'Cevabımız'} kaç?`;
    else s = ad ? `En çok hangi ${ad.toLocaleLowerCase('tr')} seçiliyor?` : 'En çok hangi seçenek seçiliyor?';
  } else if (a.yontem === 'olcum') {
    const ad = a.olcum.degiskenAdi.trim() || 'Ölçtüğümüz değer';
    const birim = a.olcum.birim.trim();
    s = birim ? `${ad} kaç ${birim}?` : `${ad} kaç?`;
  } else if (a.yontem === 'deney') {
    const d = a.deney;
    const n = tekDeneyAtisi(d.atisSayisi);
    const iz = tumceIciAdi(etkinIzlenen(d));
    if (d.nesne === 'para') s = `Madenî parayı ${n} kez atınca kaç kez ${iz} gelir?`;
    else if (d.nesne === 'zar') s = `Sayı küpünü ${n} kez atınca kaç kez ${iz} gelir?`;
    else if (d.nesne === 'iki-zar') s = `İki sayı küpünü ${n} kez atınca toplam kaç kez ${iz} olur?`;
    else if (d.nesne === 'cark') s = `Çarkı ${n} kez çevirince kaç kez ${iz} gelir?`;
    else s = `Torbadan ${n} top çekince kaç ${iz} top çıkar?`;
  }
  return s.slice(0, METIN_SINIRI.soru);
}

/** Anketin bir cevap satırı (veri rolleri sırasıyla): [seçenek, (seçili grup)] → ör. ["Elma", "6-A"] */
export function anketSatiri(a: Arastirma, secenek: string, grupIndeksi?: number): string[] {
  const satir = [secenek.trim()];
  const g = a.anket.grup;
  if (g) satir.push((g.secenekler[grupIndeksi ?? g.etkin] ?? '').trim());
  return satir;
}

/**
 * Ölçüm değeri ölçme duyarlığına yuvarlanır (yarımlar sıfırdan uzağa): duyarlık 1 → 149,6 → 150; 0,5 → 7,3 → 7,5;
 * 0,1 → 36,66 → 36,7.
 */
export function olcumDegeri(x: number, duyarlik: OlcmeDuyarligi): number {
  if (!Number.isFinite(x)) return x;
  const adim = Number(Math.abs(x / duyarlik).toPrecision(12));
  const v = Math.sign(x) * Math.round(adim) * duyarlik;
  const r = Number(v.toPrecision(12));
  return r === 0 ? 0 : r;
}

/**
 * Değer ölçme duyarlığına yuvarlandıysa bunu söyleyen not: "7,3 yuvarlandı: 7,5 (ölçme duyarlığı 0,5)". Değişmediyse
 * null (sessiz yuvarlama olmaz).
 */
export function yuvarlamaNotu(x: number, duyarlik: OlcmeDuyarligi): string | null {
  if (!Number.isFinite(x)) return null;
  const v = olcumDegeri(x, duyarlik);
  if (Math.abs(v - x) < 1e-9) return null;
  return `${sayiYaz(x, 6)} yuvarlandı: ${olcumHucresi(x, duyarlik)} (ölçme duyarlığı ${sayiYaz(duyarlik, 1)})`;
}

/** Ölçüm değerinin tablodaki yazımı ("150", "7,5", "36,7") */
export function olcumHucresi(x: number, duyarlik: OlcmeDuyarligi): string {
  return sayiYaz(olcumDegeri(x, duyarlik), duyarlik === 1 ? 0 : 1);
}

/**
 * Ölçüm satırları (veri rolleri sırasıyla): her değer için [(ad), duyarlığa yuvarlanmış değer, (seçili grup)].
 * Ad yalnız "Adları da yaz" açıkken yazılır.
 */
export function olcumSatirlari(a: Arastirma, degerler: readonly number[], ad = ''): string[][] {
  const g = a.olcum.grup;
  const grup = g ? (g.secenekler[g.etkin] ?? '').trim() : '';
  return degerler
    .filter((x) => Number.isFinite(x))
    .map((x) => veriRolleri({ ...a, yontem: 'olcum' }).map((rol) => (rol === 'ad' ? ad.trim() : rol === 'grup' ? grup : olcumHucresi(x, a.olcum.duyarlik))));
}

/** Ölçüm değerinin birimle metni: "84 atım/dk" · "7,5 saat" · "152,2 cm" (birim yoksa yalnız sayı) */
export function olcumMetni(a: Arastirma, x: number, ondalik = 2): string {
  const birim = a.olcum.birim.trim();
  return `${sayiYaz(x, ondalik)}${birim ? ` ${birim}` : ''}`;
}

/**
 * Beklenen aralığın çok dışındaki değer (aralığın onda biri kadar pay bırakılır) yine eklenir, ama uyarı çıkar:
 * "Bu değer beklenen aralığın dışında (60–120): doğru mu?". Aralık yoksa ya da değer içindeyse null.
 */
export function beklenenUyarisi(a: Arastirma, x: number): string | null {
  const b = a.olcum.beklenen;
  if (!b || !Number.isFinite(x)) return null;
  const pay = (b[1] - b[0]) * 0.1;
  if (x >= b[0] - pay && x <= b[1] + pay) return null;
  return `Bu değer beklenen aralığın dışında (${sayiYaz(b[0], 2)}–${sayiYaz(b[1], 2)}): doğru mu?`;
}

export interface ListeParcasi {
  /** kullanıcının yazdığı parça */
  metin: string;
  /** okunan sayı; okunamıyorsa null (önizlemede kırmızı) */
  deger: number | null;
}

/**
 * "Listeden ekle" ayrıştırıcısı. Ayırıcılar boşluk, satır sonu ve noktalı virgüldür; virgül ondalıktır ("1,5 2,5" →
 * 1,5 ve 2,5; "152,148" → 152,148). Parçanın başındaki ya da sonundaki virgül ayırıcı sayılır ("152, 148" → 152 ve
 * 148). Unicode eksi okunur ("−3,5"). Okunamayan parçalar `hatalar`a gider ("15a").
 */
export function hizliListeAyristir(metin: string): { degerler: number[]; hatalar: string[]; parcalar: ListeParcasi[] } {
  const parcalar: ListeParcasi[] = [];
  for (const ham of metin.split(/[\s;]+/)) {
    const m = ham.replace(/^,+|,+$/g, '');
    if (m === '') continue;
    parcalar.push({ metin: m, deger: sayiOku(m) });
  }
  return {
    degerler: parcalar.filter((p) => p.deger !== null).map((p) => p.deger as number),
    hatalar: parcalar.filter((p) => p.deger === null).map((p) => p.metin),
    parcalar,
  };
}

/** İki ya da daha çok öğe: "A ve B" · "A, B ve C" */
function veListesi(ogeler: readonly string[]): string {
  if (ogeler.length <= 1) return ogeler[0] ?? '';
  return `${ogeler.slice(0, -1).join(', ')} ve ${ogeler[ogeler.length - 1]}`;
}

/**
 * Listeden ekle önizlemesi: "4 değer eklenecek: 72 · 80 · 76 · 91" (en çok 12 değer yazılır); okunamayan parça varsa
 * "“15a” sayı değil; yalnız 3 değer eklenecek." Ölçüm planı verilirse değerler duyarlığa yuvarlanmış yazılır ve
 * yuvarlanan ilk değer söylenir: "… “152,148” 152 olarak eklenecek (ölçme duyarlığı 1). İki ayrı değerse araya boşluk
 * koyun." Boş metinde ''.
 */
export function listeOnizlemeMetni(
  sonuc: { degerler: readonly number[]; hatalar: readonly string[]; parcalar?: readonly ListeParcasi[] },
  a?: Arastirma,
): string {
  const n = sonuc.degerler.length;
  if (sonuc.hatalar.length > 0) {
    const hatalar = veListesi(sonuc.hatalar.slice(0, 3).map((h) => `“${h}”`));
    const devam = sonuc.hatalar.length > 3 ? ' ve başkaları' : '';
    return n > 0 ? `${hatalar}${devam} sayı değil; yalnız ${n} değer eklenecek.` : `${hatalar}${devam} sayı değil; eklenecek değer yok.`;
  }
  if (n === 0) return '';
  const yaz = (x: number) => (a ? olcumHucresi(x, a.olcum.duyarlik) : sayiYaz(x, 6));
  const gorunen = sonuc.degerler.slice(0, 12).map(yaz).join(' · ');
  const metin = `${n} değer eklenecek: ${gorunen}${n > 12 ? ' …' : ''}`;
  // Yuvarlanan ilk değer söylenir; "152,148" gibi virgülden sonra iki ve daha çok basamak iki değer de olabilir
  const parca = a ? sonuc.parcalar?.find((p) => p.deger !== null && yuvarlamaNotu(p.deger, a.olcum.duyarlik) !== null) : undefined;
  if (!a || !parca || parca.deger === null) return metin;
  const not = `“${parca.metin}” ${olcumHucresi(parca.deger, a.olcum.duyarlik)} olarak eklenecek (ölçme duyarlığı ${sayiYaz(a.olcum.duyarlik, 1)})`;
  const ikiDeger = /,\d{2,}$/.test(parca.metin) ? ' İki ayrı değerse araya boşluk koyun.' : '';
  return `${metin}. ${not}.${ikiDeger}`;
}

// ── Bağ, sütunlar ve sayım ────────────────────────────────────────────────────

/** Araştırma sütununun tablodaki yeri (rol planda ya da tabloda yoksa −1) */
export function arastirmaSutunu(tablo: VeriTablosu, a: Arastirma | null, rol: SutunRolu): number {
  const id = a?.sutunlar?.[rol];
  return id ? tablo.sutunlar.findIndex((s) => s.id === id) : -1;
}

/**
 * Araştırma Tablom'a bağlı mı: plan uygulanmış ve planın bütün sütun kimlikleri tabloda duruyor. Sütunun adı ya da
 * türü değişse de bağ sürer; biri silinince kopar.
 */
export function arastirmaBagli(tablo: VeriTablosu, a: Arastirma | null): boolean {
  if (!a || !a.sutunlar) return false;
  const idler = Object.values(a.sutunlar).filter((x): x is string => typeof x === 'string');
  return idler.length > 0 && idler.every((id) => tablo.sutunlar.some((s) => s.id === id));
}

/**
 * Kayıttan okunan tabloda araştırma sütunlarının türünü onarır. `tabloDogrula` bugün araştırma sütununun türünü korur;
 * eski sürümü ise ilk sütunu her zaman etikete çevirirdi ve o kayıtlar hâlâ okunabilir. Oysa plan tablolarında ilk
 * sütun sayısal olabilir (ölçüm değeri, sayı küpü, sayısal anket cevabı). İdempotenttir. Yalnız ilk sütuna
 * dokunulur (kullanıcı ilk sütunun türünü değiştiremez): sütun verilen araştırmanınsa türü plandan gelir; değilse
 * rolünden (deger ve toplam sayı; cevap, s0, s1 dolu hücrelerinin hepsi sayıysa sayı). Değişiklik yoksa aynı tablo.
 */
export function arastirmaTurleriniOnar(tablo: VeriTablosu, a: Arastirma | null): VeriTablosu {
  const ilk = tablo.sutunlar[0];
  if (!ilk || ilk.tur !== 'etiket') return tablo;
  const rol = arastirmaSutunRolu(ilk.id);
  if (!rol || rol === 'ad' || rol === 'grup' || rol === 'deney') return tablo;
  let tur: SutunTuru;
  if (a && a.sutunlar?.[rol] === ilk.id) tur = planSutunTuru(a, rol);
  else if (rol === 'deger' || rol === 'toplam') tur = 'sayi';
  else {
    const dolu = tablo.satirlar.map((r) => (r.hucreler[0] ?? '').trim()).filter((h) => h !== '');
    tur = dolu.length > 0 && dolu.every((h) => sayiOku(h) !== null) ? 'sayi' : 'etiket';
  }
  return tur === ilk.tur ? tablo : { ...tablo, sutunlar: tablo.sutunlar.map((s, i) => (i === 0 ? { ...s, tur } : s)) };
}

export interface SecenekSayisi {
  secenek: string;
  sayi: number;
  /** grup seçeneklerinin sırasıyla bu seçeneğin sayıları (grup yoksa boş) */
  gruplar: number[];
}

export interface SecenekSayimi {
  /** plan seçenekleri sırasıyla (hiç seçilmeyen 0) */
  satirlar: SecenekSayisi[];
  /** cevabı dolu satır sayısı (seçenek dışı yazımlar dahil) */
  toplam: number;
  /** cevabı boş satır sayısı */
  bos: number;
  /** seçeneklerle eşleşmeyen cevap sayısı (Düzenle'de "seçenek dışı yazım") */
  disarida: number;
  /** grup seçenekleri (grup yoksa boş) */
  gruplar: string[];
  /** grubu boş ya da grup seçeneği dışında olan cevap sayısı */
  grupsuz: number;
}

/**
 * Anket sayımı (Topla kutucukları ve Düzenle sıklık tablosu): her seçeneğin sayısı ve grup kırılımı. Eşleşme kırpılmış
 * metinle (sayısal seçeneklerde "2" ile "2,0" aynıdır); boş hücre sayılmaz.
 */
export function secenekSayilari(tablo: VeriTablosu, a: Arastirma): SecenekSayimi {
  const secenekler = anketSecenekleri(a);
  const gruplar = grupSecenekleri(a.anket.grup);
  const satirlar: SecenekSayisi[] = secenekler.map((secenek) => ({ secenek, sayi: 0, gruplar: gruplar.map(() => 0) }));
  const j = arastirmaSutunu(tablo, a, 'cevap');
  const g = arastirmaSutunu(tablo, a, 'grup');
  let toplam = 0;
  let bos = 0;
  let disarida = 0;
  let grupsuz = 0;
  if (j >= 0) {
    for (const r of tablo.satirlar) {
      const cevap = (r.hucreler[j] ?? '').trim();
      if (cevap === '') {
        bos += 1;
        continue;
      }
      toplam += 1;
      const i = secenekler.findIndex((s) => ayniSonuc(s, cevap));
      if (i < 0) {
        disarida += 1;
        continue;
      }
      satirlar[i].sayi += 1;
      if (gruplar.length > 0) {
        const k = g >= 0 ? gruplar.indexOf((r.hucreler[g] ?? '').trim()) : -1;
        if (k >= 0) satirlar[i].gruplar[k] += 1;
        else grupsuz += 1;
      }
    }
  }
  return { satirlar, toplam, bos, disarida, gruplar, grupsuz };
}

/** Karşılaştırma anahtarı: Türkçe küçük harf, iç boşluklar teke iner, uçlar kırpılır */
function yazimAnahtari(m: string): string {
  return trKucuk(m).replace(/\s+/g, ' ').trim();
}

const SADELESTIR: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };

/** Türkçe harfleri sadeleştirilmiş anahtar ("Çilek" → "cilek"): elle yazımdaki harf eksiklerini yakalar */
function sadeAnahtar(m: string): string {
  return yazimAnahtari(m).replace(/[çğıiöşüâîû]/g, (h) => SADELESTIR[h] ?? h);
}

export interface SecenekDisiYazim {
  /** tablodaki yazım (kırpılmış) */
  deger: string;
  /** bu yazımın geçtiği satırlar */
  satirlar: number[];
  /** birleştirme önerisi: küçük harf ve boşluk farkıyla (ya da Türkçe harf farkıyla) eşleşen seçenek; yoksa null */
  oneri: string | null;
}

/**
 * Tabloda seçeneklerle eşleşmeyen yazımlar (Düzenle: "Tabloda seçenek dışı yazım: “elma” (1 satır). [Elma ile
 * birleştir]"). Öneri Türkçe küçük harfe çevrilip boşluklar kırpılarak aranır ("  elma " → Elma); bulunamazsa Türkçe
 * harf farkı da yok sayılır ("cilek" → Çilek). Eşleşme yoksa öneri null ("Kivi": [Seçenek olarak ekle]). `rol` 'grup'
 * ise grup sütunu denetlenir.
 */
export function secenekDisiYazimlar(tablo: VeriTablosu, a: Arastirma, rol: 'cevap' | 'grup' = 'cevap'): SecenekDisiYazim[] {
  const secenekler = rol === 'cevap' ? anketSecenekleri(a) : grupSecenekleri(planGrubu(a));
  const j = arastirmaSutunu(tablo, a, rol);
  if (j < 0) return [];
  const bulunan = new Map<string, number[]>();
  tablo.satirlar.forEach((r, i) => {
    const deger = (r.hucreler[j] ?? '').trim();
    if (deger === '' || secenekler.some((s) => ayniSonuc(s, deger))) return;
    const liste = bulunan.get(deger);
    if (liste) liste.push(i);
    else bulunan.set(deger, [i]);
  });
  return [...bulunan.entries()].map(([deger, satirlar]) => {
    const oneri = secenekler.find((s) => yazimAnahtari(s) === yazimAnahtari(deger)) ?? secenekler.find((s) => sadeAnahtar(s) === sadeAnahtar(deger)) ?? null;
    return { deger, satirlar, oneri };
  });
}

/**
 * Birleştirme: hedef sütunda (kırpılmış) `eski` yazan hücreler `yeni` olur; öteki sütunlar değişmez. `degisen`
 * bildirim içindir ("5 satır güncellendi.").
 */
export function yazimBirlestir(tablo: VeriTablosu, sutunId: string, eski: string, yeni: string): { tablo: VeriTablosu; degisen: number } {
  const j = tablo.sutunlar.findIndex((s) => s.id === sutunId);
  const e = eski.trim();
  if (j < 0 || e === '' || e === yeni) return { tablo, degisen: 0 };
  let degisen = 0;
  const satirlar = tablo.satirlar.map((r) => {
    if ((r.hucreler[j] ?? '').trim() !== e) return r;
    degisen += 1;
    return { ...r, hucreler: r.hucreler.map((h, k) => (k === j ? yeni : h)) };
  });
  return degisen > 0 ? { tablo: { ...tablo, satirlar }, degisen } : { tablo, degisen: 0 };
}

/**
 * Seçeneğin (ya da grubun) adını değiştirir: plandaki ad ve bağlı tablodaki aynı hücreler birlikte değişir (yalnız
 * hedef sütunda). Tahmin eski ada eşitse o da güncellenir. Tost: "5 satır güncellendi." [Geri al].
 */
export function secenekYenidenAdlandir(
  tablo: VeriTablosu,
  a: Arastirma,
  eski: string,
  yeni: string,
  rol: 'cevap' | 'grup' = 'cevap',
): { tablo: VeriTablosu; arastirma: Arastirma; degisen: number } {
  const e = eski.trim();
  const y = kirp(yeni.trim(), METIN_SINIRI.ad);
  if (e === '' || y === '' || e === y) return { tablo, arastirma: a, degisen: 0 };
  const degistir = (liste: readonly string[]) => liste.map((x) => (x.trim() === e ? y : x));
  let arastirma = a;
  if (rol === 'cevap') arastirma = { ...a, anket: { ...a.anket, secenekler: degistir(a.anket.secenekler) } };
  else if (a.yontem === 'olcum' && a.olcum.grup) arastirma = { ...a, olcum: { ...a.olcum, grup: { ...a.olcum.grup, secenekler: degistir(a.olcum.grup.secenekler) } } };
  else if (a.anket.grup) arastirma = { ...a, anket: { ...a.anket, grup: { ...a.anket.grup, secenekler: degistir(a.anket.grup.secenekler) } } };
  if (rol === 'cevap' && a.tahmin.trim() === e) arastirma = { ...arastirma, tahmin: y };
  const id = a.sutunlar?.[rol];
  const sonuc = id ? yazimBirlestir(tablo, id, e, y) : { tablo, degisen: 0 };
  return { tablo: sonuc.tablo, arastirma, degisen: sonuc.degisen };
}

/** "Seçenek olarak ekle" / "+ Seçenek ekle": seçenek (ya da grup) listesine ekler; sınırda ya da varsa değişmez */
export function secenekEkle(a: Arastirma, ad: string, rol: 'cevap' | 'grup' = 'cevap'): Arastirma {
  const y = kirp(ad.trim(), METIN_SINIRI.ad);
  if (y === '') return a;
  if (rol === 'cevap') {
    const dolu = a.anket.secenekler.filter((x) => x.trim() !== '');
    if (dolu.length >= EN_COK_SECENEK || dolu.some((x) => ayniSonuc(x, y))) return a;
    const bosYer = a.anket.secenekler.findIndex((x) => x.trim() === '');
    const secenekler = bosYer >= 0 ? a.anket.secenekler.map((x, i) => (i === bosYer ? y : x)) : [...a.anket.secenekler, y];
    return { ...a, anket: { ...a.anket, secenekler } };
  }
  const g = planGrubu(a);
  if (!g || g.secenekler.length >= EN_COK_GRUP || g.secenekler.some((x) => x.trim() === y)) return a;
  const yeni = { ...g, secenekler: [...g.secenekler, y] };
  return a.yontem === 'olcum' ? { ...a, olcum: { ...a.olcum, grup: yeni } } : { ...a, anket: { ...a.anket, grup: yeni } };
}

// ── Ölçüm: düzenleme ve uzak değerler ─────────────────────────────────────────

/**
 * Ötekilerden çok uzak değerler (yazım hatası mı?): en az 5 değerde, [Ç1 − 3·ÇAA, Ç3 + 3·ÇAA] dışındakiler (Ç1 ve Ç3
 * alt ve üst yarının ortancası). Çeyrekler arası açıklık 0 ise ölçüt, ortancaya uzaklığın ortancanın yarısını
 * aşmasıdır. Değerler girdi sırasıyla döner.
 */
export function ucDegerler(degerler: readonly number[]): number[] {
  const temiz = degerler.filter((x) => Number.isFinite(x));
  if (temiz.length < 5) return [];
  const s = [...temiz].sort((x, y) => x - y);
  const yari = Math.floor(s.length / 2);
  const alt = s.slice(0, yari);
  const ust = s.slice(s.length % 2 === 0 ? yari : yari + 1);
  const q1 = ortanca(alt) as number;
  const q3 = ortanca(ust) as number;
  const orta = ortanca(s) as number;
  const caa = q3 - q1;
  const uzak = caa > 1e-12 ? (x: number) => x < q1 - 3 * caa || x > q3 + 3 * caa : (x: number) => Math.abs(x - orta) > Math.abs(orta) / 2;
  return temiz.filter(uzak);
}

export interface OlcumDuzeni {
  /** küçükten büyüğe bütün değerler */
  degerler: number[];
  enKucuk: number | null;
  enBuyuk: number | null;
  aciklik: number | null;
  /** değeri boş ya da okunamayan satırlar ("2 hücre boş ya da okunamıyor.") */
  bosSatirlar: number[];
  /** ötekilerden çok uzak değerler ve satırları */
  uzaklar: { satir: number; deger: number }[];
}

/** Ölçüm Düzenle adımı: sıralı değerler, en küçük / en büyük / açıklık, boş hücreler ve uzak değerler */
export function olcumDuzenBilgisi(tablo: VeriTablosu, a: Arastirma): OlcumDuzeni {
  const j = arastirmaSutunu(tablo, a, 'deger');
  const noktalar: { satir: number; deger: number }[] = [];
  const bosSatirlar: number[] = [];
  if (j >= 0) {
    tablo.satirlar.forEach((r, i) => {
      const x = sayiOku(r.hucreler[j] ?? '');
      if (x === null) bosSatirlar.push(i);
      else noktalar.push({ satir: i, deger: x });
    });
  }
  const degerler = noktalar.map((p) => p.deger).sort((x, y) => x - y);
  const uzakKume = new Set(ucDegerler(degerler));
  const enKucuk = degerler.length ? degerler[0] : null;
  const enBuyuk = degerler.length ? degerler[degerler.length - 1] : null;
  return {
    degerler,
    enKucuk,
    enBuyuk,
    aciklik: enKucuk === null || enBuyuk === null ? null : Number((enBuyuk - enKucuk).toPrecision(12)),
    bosSatirlar,
    uzaklar: noktalar.filter((p) => uzakKume.has(p.deger)),
  };
}

// ── Grafik görünümü: kategori sırası, eksen, soru şeridi, boş iletiler ─────────

/**
 * Araştırma sütunlarının kategori sıraları (sütun kimliği → sıra): anket cevabı seçenek sırasıyla, grup seçenekleri,
 * deney sonucu nesnedeki sırayla (Yazı, Tura · 1–6 · dilimler · renkler), Deney sütunu çalışma sırasıyla (önce
 * gerçek atışlar). Plan uygulanmamışsa boş.
 */
export function arastirmaKategoriSiralari(a: Arastirma | null): Map<string, string[]> {
  const m = new Map<string, string[]>();
  if (!a || !a.sutunlar) return m;
  const s = a.sutunlar;
  const g = grupSecenekleri(planGrubu(a));
  if (s.cevap && a.yontem === 'anket') m.set(s.cevap, anketSecenekleri(a));
  if (s.grup && g.length > 0) m.set(s.grup, g);
  if (a.yontem === 'deney') {
    const d = a.deney;
    if (s.s0) m.set(s.s0, d.nesne === 'iki-zar' ? ['1', '2', '3', '4', '5', '6'] : sonucDegerleri(d));
    if (s.s1 && d.nesne === 'iki-zar') m.set(s.s1, ['1', '2', '3', '4', '5', '6']);
    if (s.toplam && d.nesne === 'iki-zar') m.set(s.toplam, sonucDegerleri(d));
    if (s.deney) m.set(s.deney, siraliCalismalar(d.calismalar).map((c) => c.etiket.trim()));
  }
  return m;
}

/** Sütunun araştırmadaki rolü (sütun bu araştırmanın değilse null) */
function sutunRolu(a: Arastirma, sutunId: string): SutunRolu | null {
  if (!a.sutunlar) return null;
  for (const rol of ARASTIRMA_ROLLERI) if (a.sutunlar[rol] === sutunId) return rol;
  return null;
}

/**
 * Ölçüm toplanırken nokta ekseninin penceresi (VT §4.4, §7): beklenen aralık ∪ görülen değerler. Eksen ilk değerden
 * önce hazırdır (Nabız 60–120) ve toplama boyunca YALNIZ GENİŞLER: beklenen aralığın içindeki değerler ekseni hiç
 * oynatmaz, işaret adımı değişmez, noktalar yer değiştirmez (tek değerde "80–90, 1'er" gibi sahte duyarlıklı eksen
 * çıkmaz). Aralığın dışına düşen değer ekseni o yöne, beklenen aralığın güzel adımına (Nabız 10, Boy 10, Uyku 1)
 * oturan uca kadar genişletir: 131 → 60–140.
 */
export function olcumEksenPenceresi(beklenen: readonly [number, number], degerler: readonly number[]): { min: number; max: number } {
  const [b0, b1] = beklenen[0] <= beklenen[1] ? beklenen : [beklenen[1], beklenen[0]];
  const sayilar = degerler.filter((x) => Number.isFinite(x));
  if (sayilar.length === 0 || !(b1 > b0)) return { min: b0, max: b1 };
  const adim = guzelEksen(b0, b1, 6).adim;
  const kucuk = Math.min(...sayilar);
  const buyuk = Math.max(...sayilar);
  const min = kucuk < b0 ? Math.floor(temizle(kucuk / adim)) * adim : b0;
  const max = buyuk > b1 ? Math.ceil(temizle(buyuk / adim)) * adim : b1;
  return { min: temizle(min), max: temizle(max) };
}

/**
 * Nokta grafiğinin "en az bu aralık" ekseni (`eksenAlani`): sayısal anket cevabında [en küçük, en büyük seçenek];
 * ölçümde panel açıkken `olcumEksenPenceresi` (beklenen ∪ görülen, yalnız genişler); panel kapanınca (Bitti) veri
 * varsa null: eksen bir kez, bütün tablolardaki gibi veriye oturur (noktalar büyür). Veri yokken beklenen aralık.
 * Sayı küpünde [1, 6], iki küpün toplamında [2, 12]. Sütun sayısal değilse, araştırmanın değilse ya da bağ yoksa null.
 */
export function arastirmaEksenAlani(
  tablo: VeriTablosu,
  a: Arastirma | null,
  sutunId: string | null,
  toplamaAcik = true,
): { min: number; max: number } | null {
  if (!a || !sutunId || !arastirmaBagli(tablo, a)) return null;
  const rol = sutunRolu(a, sutunId);
  const sutun = tablo.sutunlar.find((s) => s.id === sutunId);
  if (!rol || !sutun || sutun.tur !== 'sayi') return null;
  if (rol === 'cevap' && a.yontem === 'anket') {
    const sayilar = anketSecenekleri(a)
      .map((x) => sayiOku(x))
      .filter((x): x is number => x !== null);
    if (sayilar.length < 2) return null;
    const min = Math.min(...sayilar);
    const max = Math.max(...sayilar);
    return max > min ? { min, max } : null;
  }
  if (rol === 'deger' && a.yontem === 'olcum') {
    if (!a.olcum.beklenen) return null;
    const j = tablo.sutunlar.indexOf(sutun);
    const degerler = tablo.satirlar.map((r) => sayiOku(r.hucreler[j] ?? '')).filter((x): x is number => x !== null);
    if (!toplamaAcik && degerler.length > 0) return null;
    return olcumEksenPenceresi(a.olcum.beklenen, degerler);
  }
  if (a.yontem === 'deney' && sonucSayisalMi(a.deney.nesne)) {
    if (rol === 's0' || rol === 's1') return { min: 1, max: 6 };
    if (rol === 'toplam') return { min: 2, max: 12 };
  }
  return null;
}

/**
 * Kategorik sütun grafiğinin toplama sırasındaki "en az" üst sınırı (`yEnAz`): sütunlar sabit bir çerçevede büyür,
 * eksen her dokunuşta sıçramaz.
 * - Kategorik anket: 5.
 * - Kategorik deney (para, çark, torba): hedef atış × en büyük teorik olasılık × 1,25, güzel sayıya yuvarlanır.
 *   Hedef atış = tablodaki satırlar + (sürmekte olan ya da seçili deneyin kalan atışları); böylece bir deney boyunca
 *   sınır değişmez, yalnız büyür. 500 ve üstü atış tabloya yazılmadığı için hesaba girmez.
 * Sayısal sütunlarda, bağ yoksa ya da yöntem uygun değilse undefined.
 */
export function toplamaYEnAz(tablo: VeriTablosu, a: Arastirma | null): number | undefined {
  if (!a || !arastirmaBagli(tablo, a)) return undefined;
  if (a.yontem === 'anket') return anketSayisalMi(a) ? undefined : 5;
  if (a.yontem !== 'deney' || sonucSayisalMi(a.deney.nesne)) return undefined;
  const d = a.deney;
  const satir = tablo.satirlar.length;
  const tablodakiler = d.calismalar.filter((c) => c.tabloda);
  const son = tablodakiler[tablodakiler.length - 1];
  const sonSatir = son ? (calismaSatirlari(tablo, a, son)?.length ?? Math.min(son.n, satir)) : 0;
  const hedef = d.atisSayisi < TABLOYA_YAZMA_SINIRI ? d.atisSayisi : 0;
  const n = Math.min(EN_COK_TABLO_SATIRI, Math.max(satir, satir - sonSatir + hedef));
  const p = teorikOlasiliklar(d).reduce((m, t) => Math.max(m, t.olasilik), 0);
  if (!(n > 0) || !(p > 0)) return undefined;
  return guzelEksen(0, n * p * 1.25, 5).max;
}

/** Ana sütunda değeri olan satır sayısı: anket cevabı dolu, ölçüm değeri okunabilen; deneyde bütün atışlar */
export function toplananSayisi(tablo: VeriTablosu, a: Arastirma): number {
  if (a.yontem === 'deney') return toplamAtis(tablo, a);
  const rol = a.yontem === 'anket' ? 'cevap' : 'deger';
  const j = arastirmaSutunu(tablo, a, rol);
  if (j < 0) return 0;
  let n = 0;
  for (const r of tablo.satirlar) {
    const h = (r.hucreler[j] ?? '').trim();
    if (rol === 'cevap' ? h !== '' : sayiOku(h) !== null) n += 1;
  }
  return n;
}

/** Topla alt çubuğundaki sayım: "24 cevap" · "12 ölçüm" · "47 atış" · "47 çevirme" · "47 çekiş" */
export function toplananMetni(tablo: VeriTablosu, a: Arastirma): string {
  const n = toplananSayisi(tablo, a);
  if (a.yontem === 'anket') return `${n} cevap`;
  if (a.yontem === 'olcum') return `${n} ölçüm`;
  return `${n} ${fiil(a.deney.nesne)}`;
}

/**
 * Deneyde tabloya yazılan atış sayısı, toplamdan azsa (500 ve üstü atışlık seri deneyleri yalnız Deney özetine
 * yazılır): sayım ve soru şeridi ikisini birden söyler ("3890 atış · 390 tabloda"). Fark yoksa null.
 */
export function tablodakiAtis(tablo: VeriTablosu, a: Arastirma): number | null {
  if (a.yontem !== 'deney' || a.deney.calismalar.every((c) => c.tabloda)) return null;
  const toplam = toplamAtis(tablo, a);
  const tabloda = a.deney.calismalar.filter((c) => c.tabloda).reduce((s, c) => s + calismaSayilari(tablo, a, c).n, 0);
  return tabloda < toplam ? tabloda : null;
}

/**
 * Grafik sütunundaki araştırma sorusu şeridi: soru ve sağda "6-A sınıfı · 24 veri" (deneyde "370 atış"). Bağ yoksa
 * ya da soru boşsa null.
 */
export function soruSeridiBilgisi(tablo: VeriTablosu, a: Arastirma | null): { soru: string; altBilgi: string } | null {
  if (!a || !arastirmaBagli(tablo, a)) return null;
  const soru = a.soru.trim();
  if (soru === '') return null;
  const n = toplananSayisi(tablo, a);
  const tabloda = tablodakiAtis(tablo, a);
  const sayim =
    n === 0
      ? 'henüz veri yok'
      : a.yontem === 'deney'
        ? `${n} ${fiil(a.deney.nesne)}${tabloda !== null ? ` · ${tabloda} tabloda` : ''}`
        : `${n} veri`;
  const kimden = a.kimden.trim();
  const altBilgi = kimden ? `${kimden} · ${sayim}` : sayim.charAt(0).toLocaleUpperCase('tr') + sayim.slice(1);
  return { soru, altBilgi };
}

/**
 * Boş grafik ipucu (0 veride, eksen çizili): "İlk cevapla noktalar burada belirir." · "İlk ölçümle …" · "İlk atışla …"
 * (çarkta "İlk çevirmeyle", torbada "İlk çekişle"). Sütun sekmesinde "sütunlar", Daire'de "dilimler" belirir.
 */
export function bosGrafikIpucu(a: Arastirma, sekme: GrafikTuru = 'nokta'): string {
  const ilk = a.yontem === 'anket' ? 'İlk cevapla' : a.yontem === 'olcum' ? 'İlk ölçümle' : `İlk ${fiilIle(fiil(a.deney.nesne))}`;
  const ne = sekme === 'sutun' ? 'sütunlar' : sekme === 'daire' ? 'dilimler' : sekme === 'nokta' ? 'noktalar' : 'veriler';
  return `${ilk} ${ne} burada belirir.`;
}

const NESNE_YONELME: Readonly<Record<DeneyNesnesi, string>> = {
  para: 'Paraya',
  zar: 'Sayı küpüne',
  'iki-zar': 'Sayı küplerine',
  cark: 'Çarka',
  torba: 'Torbaya',
};

/** Bağlı ve boş tablonun iletisi (VT §12.10) */
export function bosTabloIletisi(a: Arastirma): string {
  if (a.yontem === 'anket') return 'Henüz cevap yok. Soldaki kutucuklara dokunun; her cevap buraya bir satır olarak yazılır.';
  if (a.yontem === 'olcum') return 'Henüz ölçüm yok. Değeri yazıp “Ekle”ye basın.';
  const d = a.deney;
  const f = fiil(d.nesne);
  if (d.kayit === 'gercek') return `Henüz ${f} yok. Soldaki kutucuklara dokunun; her ${f} buraya bir satır olarak yazılır.`;
  const ek = d.nesne === 'cark' || d.nesne === 'torba' ? 'e' : 'a';
  return `Henüz ${f} yok. ${NESNE_YONELME[d.nesne]} dokunun ya da “${eylemMetni(d.nesne, d.atisSayisi)}”${ek} basın.`;
}

// ── Adım notları ──────────────────────────────────────────────────────────────

/** Adımın "Bu adımda …" notu ve kazanım rozeti (VT §12.3; terimler §6 sözlüğüyle) */
/**
 * Adımın "Bu adımda …" notu ve kazanım rozeti (VT §12.3; terimler §6 sözlüğüyle). Hazır sorudan başlanmışsa rozet
 * sorunun kendi kodudur (Kardeş sayısı → MAT.6.5.1, Okul anketi → MAT.8.6.1); deneyin Deney özeti ve seri adımı hep
 * "MAT.7.7.1 · 8.7.1" taşır. Kendi sorumuzda yöntemin varsayılanları: anket 5.5.1 (planda 8.6.1 de), ölçüm 7.6.1
 * (plan ve düzenlemede 8.6.1 de), deney 6.6.1.
 */
export function adimNotu(a: Arastirma, adim: ArastirmaAdimi = a.adim): { metin: string; rozet: string } {
  const y = a.yontem;
  const hazir = hazirRozeti(a);
  const r = (varsayilan: string) => hazir ?? varsayilan;
  switch (adim) {
    case 'plan':
      if (y === 'olcum') return { metin: 'Neyi, hangi birimle ve ne kadar duyarlı ölçeceğimizi planlarız.', rozet: r('MAT.7.6.1 · 8.6.1') };
      if (y === 'deney') return { metin: 'Hangi nesneyle kaç kez deneyeceğimizi ve neyi sayacağımızı planlarız.', rozet: r('MAT.6.6.1') };
      return { metin: 'Kime soracağımızı ve hangi seçenekleri sunacağımızı planlarız.', rozet: r('MAT.5.5.1 · 8.6.1') };
    case 'topla':
      if (y === 'olcum') return { metin: 'Her ölçüm tabloya bir satır, nokta grafiğine bir nokta ekler.', rozet: r('MAT.7.6.1') };
      if (y === 'deney') {
        if (a.deney.kayit === 'gercek') return { metin: `Sınıfta ${a.deney.nesne === 'cark' ? 'çevirin' : a.deney.nesne === 'torba' ? 'çekin' : 'atın'}; her dokunuş tabloya bir satır ekler.`, rozet: r('MAT.6.6.1') };
        const f = fiil(a.deney.nesne);
        return { metin: `Her ${f} tabloya bir satır, grafiğe bir nokta ekler.`, rozet: r('MAT.6.6.1') };
      }
      return { metin: 'Her dokunuş bir cevaptır: tabloya bir satır, grafiğe bir nokta ekler.', rozet: r('MAT.5.5.1') };
    case 'duzenle':
      if (y === 'olcum') return { metin: 'Veriyi analize hazırlarız: sıralarız, en küçük ve en büyük değere, ötekilerden çok uzak değerlere bakarız.', rozet: r('MAT.8.6.1 · 7.6.1') };
      if (y === 'deney') return { metin: 'Göreli sıklığı teorik olasılıkla karşılaştırırız.', rozet: 'MAT.7.7.1 · 8.7.1' };
      return { metin: 'Ham veriyi sıklık tablosuna dönüştürürüz: her seçeneği kaç kişi seçti?', rozet: r('MAT.5.5.1') };
    case 'yorum':
      return { metin: 'Uygun grafiği gerekçesiyle seçer, sorumuzun cevabını tartışırız.', rozet: r(y === 'olcum' ? 'MAT.7.6.1' : y === 'deney' ? 'MAT.6.6.1' : 'MAT.5.5.1') };
    default:
      return { metin: 'Merak ettiğimiz durumu veriyle cevaplanabilecek bir soruya dönüştürürüz.', rozet: r('MAT.5.5.1') };
  }
}

// ── Yorumla: grafik önerileri, tartışma soruları, kalıp cümleler ──────────────

export interface GrafikOnerisi {
  sekme: GrafikTuru;
  /** false: soluk gösterilir ve `gerekce` neden uygun olmadığını söyler */
  uygun: boolean;
  gerekce: string;
  /** true: düğme Tablom'da sekme değiştirmez, Deney özetini Çizgi grafiğinde gösterir (`ozeteGec`) */
  ozet?: boolean;
}

const BELIRTME: Readonly<Record<string, string>> = { atış: 'atışı', çevirme: 'çevirmeyi', çekiş: 'çekişi' };

/**
 * "HANGİ GRAFİK BU VERİYİ EN İYİ ANLATIR?" (VT §12.9): önce uygun grafikler gerekçesiyle, sonra soluk olanlar
 * nedenleriyle. Deneyde Deney özeti en az iki satırsa (`ozetSatiri` ≥ 2) Çizgi uygundur ve özete geçer.
 */
export function grafikOnerileri(a: Arastirma, secenek: { ozetSatiri?: number } = {}): GrafikOnerisi[] {
  const ozetVar = a.yontem === 'deney' && (secenek.ozetSatiri ?? 0) >= 2;
  const f = fiil(a.deney.nesne);
  const ozetCizgi: GrafikOnerisi = { sekme: 'cizgi', uygun: true, ozet: true, gerekce: `${f.charAt(0).toLocaleUpperCase('tr')}${f.slice(1)} sayısı arttıkça göreli sıklığın nasıl değiştiğini görmek için` };
  const deneyCizgi: GrafikOnerisi = ozetVar ? ozetCizgi : { sekme: 'cizgi', uygun: false, gerekce: 'En az iki deney gerekir: Deney özeti Çizgi grafiğinde çizilir.' };
  const oneriler: GrafikOnerisi[] = [];
  if (a.yontem === 'deney' && sonucSayisalMi(a.deney.nesne)) {
    oneriler.push(
      { sekme: 'nokta', uygun: true, gerekce: 'Her sonucun kaç kez geldiğini görmek için' },
      { sekme: 'istatistik', uygun: true, gerekce: 'Tepe değer, ortalama ve ortanca için' },
      deneyCizgi,
      { sekme: 'daire', uygun: false, gerekce: 'Parça-bütün ilişkisi yok.' },
    );
  } else if (a.yontem === 'olcum' || (a.yontem === 'anket' && anketSayisalMi(a))) {
    oneriler.push(
      { sekme: 'nokta', uygun: true, gerekce: 'Dağılımı, yığılmayı ve ötekilerden çok uzak değerleri görmek için' },
      { sekme: 'istatistik', uygun: true, gerekce: 'Ortalama, ortanca, tepe değer, açıklık ve ortalama mutlak sapma için' },
      { sekme: 'sutun', uygun: true, gerekce: 'Her değeri ayrı ayrı görmek için' },
      { sekme: 'daire', uygun: false, gerekce: 'Parça-bütün ilişkisi yok.' },
      { sekme: 'cizgi', uygun: false, gerekce: a.yontem === 'olcum' ? 'Ölçümler zamana göre sıralı değil.' : 'Cevaplar zamana göre sıralı değil.' },
    );
  } else if (a.yontem === 'deney') {
    oneriler.push(
      { sekme: 'sutun', uygun: true, gerekce: 'Sonuçları karşılaştırmak için' },
      { sekme: 'daire', uygun: true, gerekce: 'Her sonucun bütün içindeki payı için' },
      { sekme: 'nokta', uygun: true, gerekce: `Her ${BELIRTME[f]} tek tek görmek için` },
      deneyCizgi,
    );
  } else {
    oneriler.push(
      { sekme: 'sutun', uygun: true, gerekce: 'Seçenekleri karşılaştırmak için' },
      { sekme: 'daire', uygun: true, gerekce: 'Her seçeneğin bütün içindeki payı için' },
      { sekme: 'nokta', uygun: true, gerekce: 'Her cevabı tek tek görmek için' },
      { sekme: 'cizgi', uygun: false, gerekce: 'Zamana göre sıralı bir ölçüm yok.' },
    );
  }
  // Yorumla'da her zaman en az bir soluk ve gerekçeli grafik kalır (özetli kategorik deneyde Saçılım)
  if (oneriler.every((o) => o.uygun)) oneriler.push({ sekme: 'sacilim', uygun: false, gerekce: 'İki sayısal değişken gerekir; bu veride yok.' });
  const uygunlar = oneriler.filter((o) => o.uygun);
  const ozetler = uygunlar.filter((o) => o.ozet);
  return [...ozetler, ...uygunlar.filter((o) => !o.ozet), ...oneriler.filter((o) => !o.uygun)];
}

const COGUL_ILE: Readonly<Record<string, string>> = { atış: 'atışlarla', çevirme: 'çevirmelerle', çekiş: 'çekişlerle' };

/** İzlenen sonucun tümce içindeki adı: "tura" · "6" · "kırmızı" · iki küpte "toplam 7" */
function izlenenCumleAdi(d: DeneyPlani): string {
  const iz = tumceIciAdi(etkinIzlenen(d));
  return d.nesne === 'iki-zar' ? `toplam ${iz}` : iz;
}

/** Tartışalım sorularının veri özeti: deney sayısı, gerçek atış, ötekilerden çok uzak değer (tablo yoksa hepsi yok) */
export function tartismaBilgisi(a: Arastirma, tablo?: VeriTablosu): TartismaBilgisi {
  const d = a.deney;
  const b: TartismaBilgisi = { atis: tekDeneyAtisi(d.atisSayisi), deneySayisi: 0, gercekVar: false, uzakVar: false };
  if (!tablo) return b;
  if (a.yontem === 'deney') {
    const dolu = d.calismalar.filter((c) => calismaSayilari(tablo, a, c).n > 0);
    b.deneySayisi = dolu.filter((c) => !c.gercek).length;
    b.gercekVar = dolu.some((c) => c.gercek);
  } else if (a.yontem === 'olcum') b.uzakVar = olcumDuzenBilgisi(tablo, a).uzaklar.length > 0;
  return b;
}

/**
 * "TARTIŞALIM" soruları (3 soru). Hazır sorunun kendi soruları varsa onlar (okul anketi, penaltı, sayı küpleri);
 * yoksa yönteme göre. Tablo verilirse veriye göre seçilir: ötekilerden çok uzak değer yoksa o soru yerine ortalama
 * mutlak sapma sorulur; tek deneyde "20 yerine 200 atış" sorulur; gerçek atış yoksa gerçek-bilgisayar karşılaştırması
 * yerine teorik beklenti sorulur.
 */
export function tartismaSorulari(a: Arastirma, tablo?: VeriTablosu): string[] {
  const b = tartismaBilgisi(a, tablo);
  const h = hazirBaglami(a);
  if (h?.tartisma) return h.tartisma(b);
  if (a.yontem === 'olcum')
    return [
      'Aritmetik ortalama bu sınıfı iyi temsil ediyor mu?',
      'Ölçümlerde hata olabilir mi? Nasıl azaltırız?',
      b.uzakVar
        ? 'Ötekilerden çok uzak değer ortalamayı nasıl etkiledi? Ya ortancayı?'
        : 'Değerler ortalamadan ortalama ne kadar uzakta (ortalama mutlak sapma)? Bu bize ne söylüyor?',
    ];
  if (a.yontem === 'deney') {
    const d = a.deney;
    const f = fiil(d.nesne);
    const buyuk = `${f.charAt(0).toLocaleUpperCase('tr')}${f.slice(1)}`;
    const ad = izlenenCumleAdi(d);
    const gelir = d.nesne === 'torba' ? 'çıkar mı' : 'gelir mi';
    const cok = b.atis >= 200 ? 2000 : b.atis * 10;
    return [
      b.deneySayisi >= 2 ? `${buyuk} sayısını artırınca göreli sıklık nasıl değişti?` : `${buyuk} sayısı ${b.atis} yerine ${cok} olsaydı göreli sıklık nasıl değişirdi?`,
      `Deneyi yeniden yapsak yine aynı sayıda ${ad} ${gelir}? Neden?`,
      b.gercekVar
        ? `Gerçek ${COGUL_ILE[f]} bilgisayarın sonuçları neden farklı olabilir?`
        : teorikGosterilir(d)
          ? `Teorik olasılığa göre ${b.atis} ${fiilBulunma(f)} kaç kez ${ad} beklerdik? Sonucumuz buna ne kadar yakın?`
          : `Sonraki ${b.atis} ${fiilBulunma(f)} kaç kez ${ad} beklersin?`,
    ];
  }
  if (a.yontem === 'anket' && anketSayisalMi(a))
    return [
      'Aritmetik ortalama, ortanca ve tepe değer aynı mı çıktı? Hangisi sınıfımızı en iyi anlatır?',
      'En küçük ve en büyük cevap arasındaki fark (açıklık) bize ne söylüyor?',
      'Başka bir sınıfa sorsaydık sonuç aynı olur muydu?',
    ];
  return ['Sorumuza cevap verebildik mi? Neden?', 'Başka bir sınıfa sorsaydık sonuç aynı olur muydu?', 'Soruyu ya da seçenekleri değiştirmek gerekir mi?'];
}

const yuzdeYaz = (pay: number, payda: number) => `%${sayiYaz(payda > 0 ? (pay / payda) * 100 : 0, 1)}`;

/** Deney sonucunun cümlesi: "Tura 11 kez geldi" · "6 sayısı 5 kez geldi" · "toplam 7, 17 kez geldi" · "Kırmızı 11 kez çıktı" */
function sonucCumlesi(d: DeneyPlani, sayi: number): string {
  const iz = tumceIciAdi(etkinIzlenen(d));
  if (d.nesne === 'zar') return `${iz} sayısı ${sayi} kez geldi`;
  if (d.nesne === 'iki-zar') return `toplam ${iz}, ${sayi} kez geldi`;
  return `${iz} ${sayi} kez ${d.nesne === 'torba' ? 'çıktı' : 'geldi'}`;
}

function anketCumleleri(tablo: VeriTablosu, a: Arastirma): string[] {
  const sayim = secenekSayilari(tablo, a);
  const n = sayim.toplam;
  if (n === 0) return [];
  const sayisal = anketSayisalMi(a);
  // Seçenekler ve seçenek dışı yazımlar birlikte (yazımlar birleştirilmemişse kendi başına bir cevaptır)
  const disari = secenekDisiYazimlar(tablo, a).map((x) => ({ secenek: x.deger, sayi: x.satirlar.length }));
  const hepsi = [...sayim.satirlar.map((s) => ({ secenek: s.secenek, sayi: s.sayi })), ...disari];
  const cumleler: string[] = [];
  const kimden = a.kimden.trim();
  cumleler.push(`${n} kişiye sorduk${kimden ? ` (${kimden})` : ''}.`);
  const enCok = hepsi.reduce((m, x) => Math.max(m, x.sayi), 0);
  const tepeler = hepsi.filter((x) => x.sayi === enCok).map((x) => x.secenek);
  const ad = sayisal ? 'verilen cevap' : 'seçilen';
  if (tepeler.length === 1) cumleler.push(`En çok ${ad}: ${tepeler[0]}, ${enCok} kişi (${yuzdeYaz(enCok, n)}).`);
  else cumleler.push(`En çok ${sayisal ? 'verilen cevaplar' : 'seçilenler'}: ${veListesi(tepeler)} (her biri ${enCok} kişi).`);
  const enAz = hepsi.reduce((m, x) => Math.min(m, x.sayi), Infinity);
  if (hepsi.length >= 2 && enAz < enCok) {
    const dipler = hepsi.filter((x) => x.sayi === enAz).map((x) => x.secenek);
    if (enAz === 0) cumleler.push(`Hiç ${sayisal ? 'verilmeyen cevap' : 'seçilmeyen'}: ${veListesi(dipler)}.`);
    else if (dipler.length === 1) cumleler.push(`En az ${ad}: ${dipler[0]}, ${enAz} kişi (${yuzdeYaz(enAz, n)}).`);
    else cumleler.push(`En az ${sayisal ? 'verilen cevaplar' : 'seçilenler'}: ${veListesi(dipler)} (her biri ${enAz} kişi).`);
  }
  if (sayim.gruplar.length > 0) {
    const parcalar = sayim.gruplar
      .map((g, k) => {
        const enCokG = sayim.satirlar.reduce((m, s) => Math.max(m, s.gruplar[k]), 0);
        if (enCokG === 0) return null;
        return `${g}: en çok ${veListesi(sayim.satirlar.filter((s) => s.gruplar[k] === enCokG).map((s) => s.secenek))}`;
      })
      .filter((x): x is string => x !== null);
    if (parcalar.length > 0) cumleler.push(`${parcalar.join(' · ')}.`);
  }
  if (sayisal) {
    const j = arastirmaSutunu(tablo, a, 'cevap');
    const sayilar = j < 0 ? [] : tablo.satirlar.map((r) => sayiOku(r.hucreler[j] ?? '')).filter((x): x is number => x !== null);
    const ort = ortalama(sayilar);
    const med = ortanca(sayilar);
    if (ort !== null && med !== null) {
      const tepe = tepeDeger(sayilar).degerler;
      const tepeMetni = tepe.length === 0 ? 'tepe değer yok' : tepe.length === 1 ? `tepe değer ${sayiYaz(tepe[0], 2)}` : `tepe değerler ${veListesi(tepe.map((x) => sayiYaz(x, 2)))}`;
      cumleler.push(`Aritmetik ortalama ${sayiYaz(ort, 1)}; ortanca ${sayiYaz(med, 1)}; ${tepeMetni}.`);
    }
  }
  const tahmin = a.tahmin.trim();
  if (tahmin !== '') {
    const dogru = tepeler.find((t) => trKucuk(t) === trKucuk(tahmin) || ayniSonuc(t, tahmin));
    cumleler.push(dogru ? `Tahminimiz doğru çıktı: ${dogru}.` : `Tahminimiz ${tahmin} idi; veriler ${veListesi(tepeler)} diyor.`);
  }
  return cumleler;
}

function olcumCumleleri(tablo: VeriTablosu, a: Arastirma): string[] {
  const duzen = olcumDuzenBilgisi(tablo, a);
  const x = duzen.degerler;
  const n = x.length;
  if (n === 0) return [];
  const o = a.olcum.duyarlik === 1 ? 1 : 2;
  const yaz = (v: number, ondalik = 2) => olcumMetni(a, v, ondalik);
  const cumleler: string[] = [];
  if (n === 1) cumleler.push(`1 ölçüm yaptık: ${yaz(x[0])}.`);
  else cumleler.push(`${n} ölçüm yaptık. En küçük ${yaz(duzen.enKucuk as number)}, en büyük ${yaz(duzen.enBuyuk as number)}; açıklık ${yaz(duzen.aciklik as number)}.`);
  const ort = ortalama(x) as number;
  const med = ortanca(x) as number;
  if (n >= 2) {
    cumleler.push(`Aritmetik ortalama ${yaz(ort, o)}; ortanca ${yaz(med, o)}.`);
    const oms = ortalamaMutlakSapma(x) as number;
    cumleler.push(`Ortalama mutlak sapma ${yaz(oms, o)}: değerler ortalamadan ortalama ${yaz(oms, o)} uzakta.`);
  }
  if (duzen.uzaklar.length > 0) {
    const uzak = temizListe(duzen.uzaklar.map((p) => yaz(p.deger)));
    cumleler.push(`${veListesi(uzak)} ötekilerden çok uzak: ortalamayı etkiliyor, ortancayı daha az etkiliyor.`);
  }
  const g = a.olcum.grup;
  const k = arastirmaSutunu(tablo, a, 'grup');
  const j = arastirmaSutunu(tablo, a, 'deger');
  if (g && k >= 0 && j >= 0) {
    const parcalar = grupSecenekleri(g)
      .map((ad) => {
        const deger = tablo.satirlar
          .filter((r) => (r.hucreler[k] ?? '').trim() === ad)
          .map((r) => sayiOku(r.hucreler[j] ?? ''))
          .filter((v): v is number => v !== null);
        const go = ortalama(deger);
        return go === null ? null : `${ad} ${yaz(go, o)}`;
      })
      .filter((p): p is string => p !== null);
    if (parcalar.length >= 2) cumleler.push(`Gruplara göre aritmetik ortalama: ${parcalar.join(' · ')}.`);
  }
  const t = sayiOku(a.tahmin);
  if (t !== null && n >= 1) {
    const fark = Math.abs(t - ort);
    const farkMetni = sayiYaz(fark, o);
    cumleler.push(farkMetni === '0' ? `Tahminimiz ${yaz(t)} idi; ortalamayla aynı çıktı.` : `Tahminimiz ${yaz(t)} idi; ortalamadan ${yaz(fark, o)} uzak.`);
  }
  return cumleler;
}

function deneyCumleleri(tablo: VeriTablosu, a: Arastirma): string[] {
  const d = a.deney;
  const f = fiil(d.nesne);
  const hepsi = deneySikliklari(tablo, a, 'tumu');
  const n = hepsi.n;
  if (n === 0) return [];
  const izlenen = etkinIzlenen(d);
  const sayiBul = (s: { satirlar: { deger: string; sayi: number }[] }) => s.satirlar.find((x) => ayniSonuc(x.deger, izlenen))?.sayi ?? 0;
  const sayi = sayiBul(hepsi);
  const cumleler: string[] = [];
  const sim = hazirBaglami(a)?.simulasyon;
  const teorik = teorikGosterilir(d) ? ` Teorik olasılık %${sayiYaz(izlenenTeorik(d).olasilik * 100, 1)}.` : '';
  const sayimlar = siraliCalismalar(d.calismalar)
    .map((c) => ({ c, s: calismaSayilari(tablo, a, c) }))
    .filter((x) => x.s.n > 0);
  const simler = sayimlar.filter((x) => !x.c.gercek);
  // Aynı büyüklükte birden çok örneklem (simülasyon): "Her deneyde 20 kişiye sorduk (simülasyon, 2 deney): toplam …"
  const ayniOrneklem = !!sim && simler.length >= 2 && new Set(simler.map((x) => x.s.n)).size === 1 && simler.length === sayimlar.length;
  if (sim && ayniOrneklem) cumleler.push(`Her deneyde ${sim.yapilan(simler[0].s.n, `simülasyon, ${simler.length} deney`)}: toplam ${sim.sonuc(sayi)} (${yuzdeYaz(sayi, n)}); ${sim.gercek}.`);
  else if (sim) cumleler.push(`${sim.yapilan(n)}: ${sim.sonuc(sayi)} (${yuzdeYaz(sayi, n)}); ${sim.gercek}.`);
  else cumleler.push(`${n} ${f} yaptık: ${sonucCumlesi(d, sayi)}, göreli sıklık ${yuzdeYaz(sayi, n)}.${teorik}`);
  // Sorunun kendisi en sık sonucu soruyorsa (sayı küpleri, üç ve daha çok sonuç): en sık gelen(ler) ve teorik beklenti
  if (sonucDegerleri(d).length >= 3) {
    const enCok = hepsi.satirlar.reduce((m, x) => Math.max(m, x.sayi), 0);
    const tepeler = hepsi.satirlar.filter((x) => x.sayi === enCok && enCok > 0).map((x) => x.deger);
    const adlar =
      d.nesne === 'iki-zar' ? ['En sık çıkan toplam', 'En sık çıkan toplamlar'] : d.nesne === 'zar' ? ['En sık gelen sayı', 'En sık gelen sayılar'] : ['En sık çıkan sonuç', 'En sık çıkan sonuçlar'];
    if (tepeler.length > 0) {
      let c = tepeler.length === 1 ? `${adlar[0]}: ${tepeler[0]} (${enCok} kez)` : `${adlar[1]}: ${veListesi(tepeler)} (her biri ${enCok} kez)`;
      if (d.nesne === 'iki-zar' && teorikGosterilir(d)) c += '; teorik olarak en olası toplam 7 (%16,7)';
      cumleler.push(`${c}.`);
    }
    if (d.nesne === 'zar') {
      const parcalar = hepsi.satirlar.filter((x) => sonucDegerleri(d).includes(x.deger)).map((x) => `${x.deger} (${x.sayi} kez)`);
      cumleler.push(`Her sayı: ${parcalar.join(' · ')}.${teorikGosterilir(d) ? ` Teorik olarak her sayı ${sayiYaz(n / 6, 1)} kez beklenir (%16,7).` : ''}`);
    }
  }
  if (sim && simler.length >= 2 && new Set(simler.map((x) => x.s.n)).size === 1) {
    // Aynı büyüklükte örneklemler: her deneyin sayısı ve aralığı ("Deneylerde “evet” sayısı: 12 · 10 · 14 (en az 10, en çok 14).")
    const son = simler.slice(-8).map((x) => Math.min(x.s.n, sayiBulKayit(x.s.sayilar, izlenen)));
    cumleler.push(`Deneylerde ${sim.sayilan} sayısı: ${son.join(' · ')} (en az ${Math.min(...son)}, en çok ${Math.max(...son)}).`);
  } else if (simler.length >= 2) {
    // Atış sayıları farklıysa "20 atışta %55"; yinelenen atış sayısında deneyin etiketiyle "1. deney (20): %45"
    const son = simler.slice(-7);
    const farkli = new Set(son.map((x) => x.s.n)).size === son.length;
    const parcalar = son.map((x) => {
      const oran = yuzdeYaz(Math.min(x.s.n, sayiBulKayit(x.s.sayilar, izlenen)), x.s.n);
      return farkli ? `${sim ? sim.bulunma(x.s.n) : `${x.s.n} ${fiilBulunma(f)}`} ${oran}` : `${x.c.etiket}: ${oran}`;
    });
    cumleler.push(`Göreli sıklık: ${parcalar.join(' · ')}.`);
  }
  const gercek = sayimlar.find((x) => x.c.gercek);
  if (gercek && simler.length > 0) {
    const simN = simler.reduce((s, x) => s + x.s.n, 0);
    const simSayi = simler.reduce((s, x) => s + sayiBulKayit(x.s.sayilar, izlenen), 0);
    const cogul = fiilCogul(f);
    cumleler.push(`Gerçek ${cogul}${cogul.endsWith('ler') ? 'de' : 'da'} ${yuzdeYaz(sayiBulKayit(gercek.s.sayilar, izlenen), gercek.s.n)}, bilgisayarda ${yuzdeYaz(simSayi, simN)}.`);
  }
  const t = sayiOku(a.tahmin);
  if (t !== null) {
    const hedef = sayimlar.find((x) => x.s.n === d.atisSayisi);
    if (hedef && sim) {
      cumleler.push(`Tahminimiz ${sayiYaz(t, 2)} ${sim.sayilan} idi; ${sim.bulunma(d.atisSayisi)} ${sayiBulKayit(hedef.s.sayilar, izlenen)} ${sim.sayilan} çıktı.`);
    } else if (hedef) {
      const ad = d.nesne === 'zar' ? `${izlenen} sayısı` : izlenenCumleAdi(d);
      cumleler.push(`Tahminimiz ${sayiYaz(t, 2)} kez ${ad} idi; ${d.atisSayisi} ${fiilBulunma(f)} ${sayiBulKayit(hedef.s.sayilar, izlenen)} kez ${d.nesne === 'torba' ? 'çıktı' : 'geldi'}.`);
    }
  }
  return cumleler;
}

/** Sayılardan izlenen sonucunkini okur ("7" ile "7,0" aynıdır) */
function sayiBulKayit(sayilar: Readonly<Record<string, number>>, deger: string): number {
  let t = 0;
  for (const [k, v] of Object.entries(sayilar)) if (ayniSonuc(k, deger)) t += v;
  return t;
}

/**
 * "VERİLER NE SÖYLÜYOR?" kalıp cümleleri (Yorumla'da kapalı başlar). Sayılara ek getirmeyen kalıplarla kurulur
 * (rakamdan sonra kesme işareti yok); ondalık virgül. Veri yoksa boş.
 * - Anket: kaç kişiye soruldu, en çok / en az seçilen (eşitlikte hepsi), gruplara göre en çok, sayısal ankette
 *   aritmetik ortalama, ortanca ve tepe değer, tahminle karşılaştırma.
 * - Ölçüm: ölçüm sayısı, en küçük / en büyük / açıklık, aritmetik ortalama ve ortanca, ortalama mutlak sapma,
 *   ötekilerden çok uzak değerler, gruplara göre ortalama, tahmin.
 * - Deney: bütün atışlarda sayılan sonuç ve göreli sıklık (+ teorik olasılık), birden çok deneyde atış sayısına göre
 *   göreli sıklık, gerçek atışlarla bilgisayarın karşılaştırması, tahmin.
 */
export function yorumCumleleri(tablo: VeriTablosu, a: Arastirma): string[] {
  if (a.yontem === 'anket') return anketCumleleri(tablo, a);
  if (a.yontem === 'olcum') return olcumCumleleri(tablo, a);
  if (a.yontem === 'deney') return deneyCumleleri(tablo, a);
  return [];
}

// ── Dosya adı ─────────────────────────────────────────────────────────────────

const HARF_HARITASI: Record<string, string> = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u', â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u' };

/**
 * CSV dosya adı araştırma sorusundan (yoksa tablo adından): "veri-grafik-sinifimizda-en-cok-sevilen-meyve.csv".
 * Uzantısız ad en çok 48 karakterdir; sözcük ortasından kesilmez.
 */
export function csvAdi(a: Arastirma): string {
  const kaynak = a.soru.trim() || arastirmaTabloAdi(a);
  const kisa = kaynak
    .replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g, (h) => HARF_HARITASI[h] ?? h)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  let ad = `veri-grafik-${kisa || 'tablom'}`;
  while (ad.length > 48 && ad.lastIndexOf('-') > 'veri-grafik'.length) ad = ad.slice(0, ad.lastIndexOf('-'));
  if (ad.length > 48) ad = ad.slice(0, 48).replace(/-+$/, '');
  return `${ad}.csv`;
}

