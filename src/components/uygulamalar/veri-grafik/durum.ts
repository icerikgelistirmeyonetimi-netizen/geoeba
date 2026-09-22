/**
 * Veri ve Grafik — uygulama durumu ve kalıcılık (saf, React'siz).
 * Üç veri kümesi vardır: "Tablom" (elle girilen / örnek veri), "Deney sonuçları" (örnekleyici) ve
 * "Ölçümler" (ölçüm topla). Etkin küme tabloyu ve bütün grafikleri belirler; her kümenin eksen
 * ataması (değişken, karşılaştırma, aralık) ayrı saklanır. Eski kayıtlar (yalnız Tablom) sorunsuz açılır;
 * bozuk kayıt varsayılana döner.
 */
import type { NoktaSecenekleri } from './NoktaGrafigi';
import { ornekVeriOlustur, tabloDogrula, type GrafikTuru, type VeriTablosu } from './veri';
import { TOPLAM_SUTUNU, ornekleyiciDogrula, sonucSutunlari, varsayilanOrnekleyici, type OrnekleyiciAyari } from './ornekleyici';
import { degiskenSutunlari } from './kategorik';

export type Sekme = GrafikTuru;

export const SEKMELER: { id: Sekme; ad: string }[] = [
  { id: 'nokta', ad: 'Nokta' },
  { id: 'sutun', ad: 'Sütun' },
  { id: 'cizgi', ad: 'Çizgi' },
  { id: 'daire', ad: 'Daire' },
  { id: 'sacilim', ad: 'Saçılım' },
  { id: 'istatistik', ad: 'İstatistik' },
];

/** Grafiğin veri türü gereksinimi: çizgi en az bir, saçılım en az iki sayısal değişken ister */
export const GEREKEN_SAYISAL: Partial<Record<Sekme, number>> = { cizgi: 1, sacilim: 2 };

/** Sekme bu tablonun veri türleriyle çizilebilir mi (sayısal değişken sayısına göre) */
export function sekmeKullanilabilir(sekme: Sekme, sayisalDegiskenSayisi: number): boolean {
  return sayisalDegiskenSayisi >= (GEREKEN_SAYISAL[sekme] ?? 0);
}

export type KumeId = 'tablom' | 'deney' | 'olcum';

export const KUMELER: { id: KumeId; ad: string; kisaAd: string }[] = [
  { id: 'tablom', ad: 'Tablom', kisaAd: 'Tablom' },
  { id: 'deney', ad: 'Deney sonuçları', kisaAd: 'Deney' },
  { id: 'olcum', ad: 'Ölçümler', kisaAd: 'Ölçümler' },
];

export interface Gorunum {
  degisken: string | null;
  ikinciDegisken: string | null;
  aralik: number | null;
}

export interface Durum {
  surum: 1;
  /** "Tablom" veri kümesi (eski kayıtlarla uyumlu alan adı) */
  tablo: VeriTablosu;
  sekme: Sekme;
  /** etkin kümede nokta grafiği eksenine atanmış sütun kimliği (null = dağınık) */
  degisken: string | null;
  /** karşılaştırma için ikinci nokta grafiği */
  ikinciDegisken: string | null;
  /** saçılım grafiğinin dikey ekseni (null = yatay eksenden sonraki ilk sayısal değişken) */
  yDegisken: string | null;
  /** renk anahtarı: noktaları / sütunları / tablo satırlarını renklendiren kategorik değişken (null = ilk kategorik, RENKSIZ = renksiz) */
  renkDegisken?: string | null;
  /** null = otomatik */
  aralik: number | null;
  secenekler: NoktaSecenekleri;
  sutunModu: boolean;
  yuvarlamaAdimi: number;
  adimlariGoster: boolean;
  deneyTablosu: VeriTablosu | null;
  olcumTablosu: VeriTablosu | null;
  etkinKume: KumeId;
  /** etkin olmayan kümelerin saklı eksen atamaları */
  gorunumler: Partial<Record<KumeId, Gorunum>>;
  ornekleyici: OrnekleyiciAyari;
  ornekleyiciAcik: boolean;
}

export function baslangicDurumu(): Durum {
  return {
    surum: 1,
    tablo: ornekVeriOlustur('boy'),
    sekme: 'nokta',
    degisken: null,
    ikinciDegisken: null,
    yDegisken: null,
    aralik: null,
    secenekler: { ortalama: false, oms: false, etiketler: false },
    sutunModu: false,
    yuvarlamaAdimi: 1,
    adimlariGoster: false,
    deneyTablosu: null,
    olcumTablosu: null,
    etkinKume: 'tablom',
    gorunumler: {},
    ornekleyici: varsayilanOrnekleyici(),
    ornekleyiciAcik: false,
  };
}

function gorunumDogrula(ham: unknown): Gorunum | undefined {
  if (!ham || typeof ham !== 'object') return undefined;
  const g = ham as Record<string, unknown>;
  return {
    degisken: typeof g.degisken === 'string' ? g.degisken : null,
    ikinciDegisken: typeof g.ikinciDegisken === 'string' ? g.ikinciDegisken : null,
    aralik: typeof g.aralik === 'number' && g.aralik > 0 && Number.isFinite(g.aralik) ? g.aralik : null,
  };
}

/** Kayıttan durum; Tablom okunamıyorsa null (çağıran varsayılanı kullanır). Diğer alanlar tek tek düzeltilir. */
export function durumCoz(ham: unknown): Durum | null {
  if (!ham || typeof ham !== 'object') return null;
  const nesne = ham as Partial<Record<keyof Durum, unknown>>;
  const tablo = tabloDogrula(nesne.tablo);
  if (!tablo) return null;
  const temel = baslangicDurumu();
  const sekme = SEKMELER.some((s) => s.id === nesne.sekme) ? (nesne.sekme as Sekme) : temel.sekme;
  const deneyTablosu = nesne.deneyTablosu ? tabloDogrula(nesne.deneyTablosu) : null;
  const olcumTablosu = nesne.olcumTablosu ? tabloDogrula(nesne.olcumTablosu) : null;
  let etkinKume: KumeId = KUMELER.some((k) => k.id === nesne.etkinKume) ? (nesne.etkinKume as KumeId) : 'tablom';
  const secenekHam = nesne.secenekler && typeof nesne.secenekler === 'object' ? (nesne.secenekler as Record<string, unknown>) : {};
  const gorunumHam = nesne.gorunumler && typeof nesne.gorunumler === 'object' ? (nesne.gorunumler as Record<string, unknown>) : {};
  const gorunumler: Partial<Record<KumeId, Gorunum>> = {};
  for (const k of KUMELER) {
    const g = gorunumDogrula(gorunumHam[k.id]);
    if (g) gorunumler[k.id] = g;
  }
  let gorunum: Gorunum = {
    degisken: typeof nesne.degisken === 'string' ? nesne.degisken : null,
    ikinciDegisken: typeof nesne.ikinciDegisken === 'string' ? nesne.ikinciDegisken : null,
    aralik: typeof nesne.aralik === 'number' && nesne.aralik > 0 && Number.isFinite(nesne.aralik) ? nesne.aralik : null,
  };
  // Etkin küme kayıtta yoksa Tablom'a dön (onun görünümü saklıysa onu al)
  if ((etkinKume === 'deney' && !deneyTablosu) || (etkinKume === 'olcum' && !olcumTablosu)) {
    etkinKume = 'tablom';
    gorunum = gorunumler.tablom ?? { degisken: null, ikinciDegisken: null, aralik: null };
  }
  return {
    ...temel,
    tablo,
    sekme,
    ...gorunum,
    secenekler: {
      ortalama: secenekHam.ortalama === true,
      oms: secenekHam.oms === true,
      etiketler: secenekHam.etiketler === true,
    },
    yDegisken: typeof nesne.yDegisken === 'string' ? nesne.yDegisken : null,
    // Eski kayıtlarda alanın adı sacilimRenk idi
    renkDegisken: typeof nesne.renkDegisken === 'string' ? nesne.renkDegisken : typeof (ham as Record<string, unknown>).sacilimRenk === 'string' ? ((ham as Record<string, unknown>).sacilimRenk as string) : null,
    sutunModu: nesne.sutunModu === true,
    yuvarlamaAdimi: [1, 0.5, 0.1].includes(nesne.yuvarlamaAdimi as number) ? (nesne.yuvarlamaAdimi as number) : 1,
    adimlariGoster: nesne.adimlariGoster === true,
    deneyTablosu,
    olcumTablosu,
    etkinKume,
    gorunumler,
    ornekleyici: ornekleyiciDogrula(nesne.ornekleyici),
    ornekleyiciAcik: nesne.ornekleyiciAcik === true,
  };
}

/** JSON metninden durum (bozuk JSON → null) */
export function durumMetindenCoz(metin: string | null): Durum | null {
  if (!metin) return null;
  try {
    return durumCoz(JSON.parse(metin));
  } catch {
    return null;
  }
}

export function kumeTablosu(d: Durum, kume: KumeId = d.etkinKume): VeriTablosu | null {
  if (kume === 'deney') return d.deneyTablosu;
  if (kume === 'olcum') return d.olcumTablosu;
  return d.tablo;
}

const BOS_TABLO: VeriTablosu = { sutunlar: [{ id: 'bos-etiket', ad: 'Etiket', tur: 'etiket' }], satirlar: [] };

/** Etkin kümenin tablosu (küme henüz boşsa boş tablo) */
export function etkinTablo(d: Durum): VeriTablosu {
  return kumeTablosu(d) ?? BOS_TABLO;
}

/** Etkin kümenin tablosunu değiştirir */
export function etkinTabloYaz(d: Durum, tablo: VeriTablosu): Durum {
  if (d.etkinKume === 'deney') return { ...d, deneyTablosu: tablo };
  if (d.etkinKume === 'olcum') return { ...d, olcumTablosu: tablo };
  return { ...d, tablo };
}

/**
 * Kümenin varsayılan eksen değişkeni: deneyde Toplam (yoksa ilk aygıt sütunu), ölçümlerde en son eklenen
 * ölçü, kendi tablonuzda ilk sayısal sütun (yoksa ilk kategorik). Tabloda değişken yoksa null.
 */
export function varsayilanEksen(tablo: VeriTablosu, kume: KumeId): string | null {
  const degiskenler = degiskenSutunlari(tablo);
  if (degiskenler.length === 0) return null;
  if (kume === 'deney') return (degiskenler.find((s) => s.id === TOPLAM_SUTUNU) ?? degiskenler[0]).id;
  const sayisal = degiskenler.filter((s) => s.tur === 'sayi');
  if (kume === 'olcum' && sayisal.length > 0) return sayisal[sayisal.length - 1].id;
  return (sayisal[0] ?? degiskenler[0]).id;
}

/**
 * Eksen her zaman seçili gelir: atanmamışsa (açılış, örnek veri, küme değişimi) ya da atanmış sütun artık
 * yoksa (silindi, deney tablosu yeniden kuruldu) kümenin varsayılan değişkeni atanır. Karşılaştırma
 * değişkeni geçersizse ya da eksenle aynıysa kaldırılır. Değişiklik yoksa aynı nesne döner.
 */
export function eksenDuzelt(d: Durum): Durum {
  const tablo = etkinTablo(d);
  const degiskenler = degiskenSutunlari(tablo);
  const gecerli = (id: string | null) => id !== null && degiskenler.some((s) => s.id === id);
  let y = d;
  if (!gecerli(d.degisken)) {
    const yeni = varsayilanEksen(tablo, d.etkinKume);
    if (yeni !== d.degisken) y = { ...y, degisken: yeni, aralik: null, sutunModu: false };
  }
  if (y.ikinciDegisken !== null && (!gecerli(y.ikinciDegisken) || y.ikinciDegisken === y.degisken)) y = { ...y, ikinciDegisken: null };
  // Saçılımın dikey ekseni yalnız sayısal bir değişken olabilir; değilse varsayılana (null) döner
  if (y.yDegisken !== null && !degiskenler.some((s) => s.id === y.yDegisken && s.tur === 'sayi')) y = { ...y, yDegisken: null };
  // Renk anahtarı yalnız kategorik bir değişken olabilir (ya da bilerek "renksiz"); değilse otomatiğe döner
  if (y.renkDegisken && y.renkDegisken !== RENKSIZ && !degiskenler.some((s) => s.id === y.renkDegisken && s.tur === 'etiket')) y = { ...y, renkDegisken: null };
  return y;
}

/** Renk anahtarında "renklendirme yok" seçimi (null = otomatik: ilk kategorik değişken) */
export const RENKSIZ = '__renksiz__';

/**
 * Renk anahtarı: noktaları, sütunları ve tablo satırlarını renklendiren kategorik değişken. Seçilmişse o,
 * RENKSIZ ise null, seçilmemişse (ya da artık geçersizse) tablodaki ilk kategorik değişken; yoksa null.
 */
export function renkAnahtari(d: { renkDegisken?: string | null }, tablo: VeriTablosu): string | null {
  if (d.renkDegisken === RENKSIZ) return null;
  const kategorik = degiskenSutunlari(tablo).filter((s) => s.tur === 'etiket');
  return kategorik.some((s) => s.id === d.renkDegisken) ? (d.renkDegisken as string) : kategorik[0]?.id ?? null;
}

/**
 * Saçılım grafiğinin eksenleri ve renkleri: yatay eksen seçili değişken (kategorikse ilk sayısal değişken),
 * dikey eksen `yDegisken` ya da yatay eksenden başka ilk sayısal değişken; noktalar renk anahtarıyla (`renkDegisken`) seçilen
 * (verilmezse ilk) kategorik değişkene göre renklenir, RENKSIZ ise tek renk. İki sayısal değişken yoksa null.
 */
export function sacilimEksenleri(
  d: { degisken: string | null; yDegisken: string | null; renkDegisken?: string | null },
  tablo: VeriTablosu,
): { x: string; y: string; renk: string | null } | null {
  const degiskenler = degiskenSutunlari(tablo);
  const sayisal = degiskenler.filter((s) => s.tur === 'sayi');
  if (sayisal.length < 2) return null;
  const x = sayisal.some((s) => s.id === d.degisken) ? (d.degisken as string) : sayisal[0].id;
  const y = d.yDegisken && d.yDegisken !== x && sayisal.some((s) => s.id === d.yDegisken) ? d.yDegisken : sayisal.find((s) => s.id !== x)!.id;
  return { x, y, renk: renkAnahtari(d, tablo) };
}

/**
 * Örnekleyiciyi açar / kapatır ve görünen kümeyi buna göre ayarlar: kapalıyken yalnız "Tablom" görünür;
 * açıkken tablo alanı deney sonuçlarını gösterir (henüz çekiliş yoksa sütunları hazır boş tablo),
 * "Ölçümler" ancak ölçüm toplandığında yanına gelir. Böylece küme seçici gereksiz yere görünmez.
 */
export function ornekleyiciDegistir(d: Durum, acik: boolean): Durum {
  if (!acik) return { ...kumeDegistir(d, 'tablom'), ornekleyiciAcik: false };
  let y: Durum = { ...d, ornekleyiciAcik: true };
  if (y.etkinKume === 'tablom') y = kumeDegistir(y, 'deney');
  if (!y.deneyTablosu) y = { ...y, deneyTablosu: { sutunlar: sonucSutunlari(y.ornekleyici), satirlar: [] } };
  return y;
}

/** Örnekleyici durumuna göre tablo alanında seçilebilen kümeler (tek küme varsa seçici çizilmez) */
export function gorunenKumeler(d: Pick<Durum, 'ornekleyiciAcik' | 'olcumTablosu'>): KumeId[] {
  if (!d.ornekleyiciAcik) return ['tablom'];
  return d.olcumTablosu ? ['deney', 'olcum'] : ['deney'];
}

/** Veri kümesini değiştirir: eski kümenin eksen ataması saklanır, yenisininki geri gelir */
export function kumeDegistir(d: Durum, kume: KumeId, gorunum?: Partial<Gorunum>): Durum {
  const saklanan: Gorunum = { degisken: d.degisken, ikinciDegisken: d.ikinciDegisken, aralik: d.aralik };
  const gorunumler = { ...d.gorunumler, [d.etkinKume]: saklanan };
  const hedef = { ...(kume === d.etkinKume ? saklanan : gorunumler[kume] ?? { degisken: null, ikinciDegisken: null, aralik: null }), ...gorunum };
  return { ...d, gorunumler, etkinKume: kume, ...hedef, sutunModu: kume === d.etkinKume ? d.sutunModu : false };
}
