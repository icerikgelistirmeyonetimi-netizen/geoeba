/**
 * Veri ve Grafik — iki veri grubunu tek grafikte, ikili gruplar hâlinde karşılaştırma (saf, React'siz).
 *
 * Alan uzmanı (4. tur): iki grup karşılaştırılırken ikisi de aynı grafikte gösterilir ve "önce birinci grup, sonra
 * ikinci grup" sırası kullanılmaz; verilerden biri birinci, biri ikinci gruptan alınarak ikili gruplar kurulur.
 * - İki sayısal değişken (Selma | Yasemin, Erzurum | Adana): her satır bir ikili grup (1. maç: Selma, Yasemin).
 * - Bir sayısal değişken + kategorik değişkene göre gruplar (Puan, Sınıf): her grubun k. verisi k. ikili grupta
 *   (7A-01 ile 7B-01, 7A-02 ile 7B-02 …).
 * Sütun grafiği `sutunCiftleri` ile yan yana sütun çiftleri çizer. Nokta grafiği iki sayısal değişkeni `ikiSeriTablosu`
 * ile tek sayısal sütunlu bir tabloya açar (seriyi kategorik sütunda tutar) ve her değerde grupların yığınlarını yan
 * yana dizer (NoktaGrafigi: `yanYana`).
 * Alan uzmanı (7. tur): Sütun ve Çizgi'de karşılaştırma bütün düzeylerde tek grafiktedir; çizgide `grupCizgiTablosu`
 * her grubu bir seriye açar, grupların çizgileri ortak eksenlerde altlı üstlü durur (ayrı panel yok).
 */
import { seriRengi } from './grafik';
import { kategoriler, kategoriRengi, sutunMetinleri, type RenkEslemesi } from './kategorik';
import { gecerliDegerler, satirEtiketi, type VeriTablosu } from './veri';

/** Karşılaştırmanın kaynağı: ikinci sayısal sütun ya da gruplayan kategorik sütun (indeksler) */
export type IkiliKarsilastirma = { tur: 'sayi'; sutun: number } | { tur: 'grup'; sutun: number; sira?: string[] };

export interface IkiliSeri {
  ad: string;
  renk: string;
}

export interface IkiliCubuk {
  /** tablonun satır indeksi */
  satir: number;
  /** değerin sütunu (sürükleme bu hücreyi yazar) */
  sutun: number;
  deger: number;
  /** serinin indeksi (ikili gruptaki yeri: 0 solda) */
  seri: number;
  /** çubuğun kendi adı (gruplu karşılaştırmada satır etiketi: "7A-01") */
  etiket: string;
}

export interface IkiliGrup {
  /** grubun adı: iki sayısal değişkende satır etiketi ("1. maç"), gruplu karşılaştırmada sıra ("1.") */
  etiket: string;
  /** seri sırasıyla; değeri olmayan seri için null (yer boş kalır, çiftler hizalı) */
  cubuklar: (IkiliCubuk | null)[];
}

export interface SutunCiftleri {
  seriler: IkiliSeri[];
  gruplar: IkiliGrup[];
  /** her çubuğun altına kendi adı mı yazılır (gruplu karşılaştırma) yoksa grubun adı mı (iki sayısal değişken) */
  cubukEtiketli: boolean;
}

/** Grup sütununun renk eşlemesi: renk anahtarı aynı sütunsa onun renkleri, değilse kategori paleti */
function grupRenkleri(kats: string[], renkEslemi: RenkEslemesi | null | undefined, sutun: number): string[] {
  return kats.map((k, i) => (renkEslemi && renkEslemi.sutun === sutun ? renkEslemi.renkler.get(k) : undefined) ?? kategoriRengi(k, i));
}

/**
 * Yan yana sütun çiftleri. `ana` sayısal sütun; karşılaştırma ikinci sayısal sütunsa satır satır, gruplu ise her
 * grubun k. verisi k. ikili grupta. Hiç veri yoksa gruplar boştur.
 */
export function sutunCiftleri(tablo: VeriTablosu, ana: number, k: IkiliKarsilastirma, renkEslemi?: RenkEslemesi | null): SutunCiftleri {
  if (k.tur === 'sayi') {
    const a = new Map(gecerliDegerler(tablo, ana).map((n) => [n.satir, n.deger]));
    const b = new Map(gecerliDegerler(tablo, k.sutun).map((n) => [n.satir, n.deger]));
    const gruplar: IkiliGrup[] = [];
    tablo.satirlar.forEach((_, satir) => {
      if (!a.has(satir) && !b.has(satir)) return;
      const etiket = satirEtiketi(tablo, satir);
      const cubuk = (sutun: number, deger: number | undefined, seri: number): IkiliCubuk | null =>
        deger === undefined ? null : { satir, sutun, deger, seri, etiket };
      gruplar.push({ etiket, cubuklar: [cubuk(ana, a.get(satir), 0), cubuk(k.sutun, b.get(satir), 1)] });
    });
    return {
      seriler: [
        { ad: tablo.sutunlar[ana]?.ad ?? '', renk: seriRengi(0) },
        { ad: tablo.sutunlar[k.sutun]?.ad ?? '', renk: seriRengi(1) },
      ],
      gruplar,
      cubukEtiketli: false,
    };
  }
  const degerler = new Map(gecerliDegerler(tablo, ana).map((n) => [n.satir, n.deger]));
  const metinler = sutunMetinleri(tablo, k.sutun);
  const kats = kategoriler(
    metinler.map((m) => m.deger),
    k.sira,
  ).filter((kat) => metinler.some((m) => m.deger === kat));
  const listeler = kats.map((kat) => metinler.filter((m) => m.deger === kat && degerler.has(m.satir)).map((m) => m.satir));
  const enUzun = listeler.reduce((m, l) => Math.max(m, l.length), 0);
  const gruplar: IkiliGrup[] = Array.from({ length: enUzun }, (_, j) => ({
    etiket: `${j + 1}.`,
    cubuklar: listeler.map((l, seri) => {
      const satir = l[j];
      return satir === undefined ? null : { satir, sutun: ana, deger: degerler.get(satir) as number, seri, etiket: satirEtiketi(tablo, satir) };
    }),
  }));
  const renkler = grupRenkleri(kats, renkEslemi, k.sutun);
  return { seriler: kats.map((ad, i) => ({ ad, renk: renkler[i] })), gruplar, cubukEtiketli: true };
}

export interface IkiSeriTablosu {
  /** İlk sütun etiket ("1. maç · Selma"), ikinci sütun değer, üçüncü sütun seri (kategorik) */
  tablo: VeriTablosu;
  /** seri sütununun renk eşlemesi (seri renkleri: deniz, mercan) */
  eslem: RenkEslemesi;
  /** türetilmiş satır → asıl tablodaki satır */
  karsilik: number[];
}

/** "Adana (°C)" → "Adana"; birimi ortaksa ("°C") eksen adının sonuna bir kez yazılır */
function birimsiz(ad: string): string {
  return ad.replace(/\s*\([^()]*\)\s*$/, '').trim() || ad;
}
function birimi(ad: string): string | null {
  const m = /\(([^()]*)\)\s*$/.exec(ad);
  return m && m[1].trim() ? m[1].trim() : null;
}

/**
 * İki sayısal sütunu tek grafikte göstermek için uzun tablo: her asıl satır için iki satır (önce birinci, sonra ikinci
 * değişken; ikili gruplar). Değer sütununun adı iki değişkenin adı ve ortak birimi ("Erzurum ve Adana (°C)").
 */
export function ikiSeriTablosu(tablo: VeriTablosu, a: number, b: number): IkiSeriTablosu {
  const adA = tablo.sutunlar[a]?.ad ?? '';
  const adB = tablo.sutunlar[b]?.ad ?? '';
  const birimA = birimi(adA);
  const ortakBirim = birimA !== null && birimA === birimi(adB) ? birimA : null;
  const degerAdi = ortakBirim ? `${birimsiz(adA)} ve ${birimsiz(adB)} (${ortakBirim})` : `${adA} ve ${adB}`;
  const seriAdi = (ad: string) => (ortakBirim ? birimsiz(ad) : ad);
  const satirlar: VeriTablosu['satirlar'] = [];
  const karsilik: number[] = [];
  tablo.satirlar.forEach((r, i) => {
    for (const [sutun, ad] of [
      [a, adA],
      [b, adB],
    ] as const) {
      satirlar.push({ id: `${r.id}~${sutun}`, hucreler: [`${satirEtiketi(tablo, i)} · ${seriAdi(ad)}`, r.hucreler[sutun] ?? '', seriAdi(ad)] });
      karsilik.push(i);
    }
  });
  const yeni: VeriTablosu = {
    sutunlar: [
      { id: `${tablo.sutunlar[0]?.id ?? 'etiket'}~ikili`, ad: tablo.sutunlar[0]?.ad ?? 'Etiket', tur: 'etiket' },
      { id: `${tablo.sutunlar[a]?.id ?? 'a'}~${tablo.sutunlar[b]?.id ?? 'b'}`, ad: degerAdi, tur: 'sayi' },
      { id: 'ikili-seri', ad: 'Değişken', tur: 'etiket' },
    ],
    satirlar,
  };
  const kats = [seriAdi(adA), seriAdi(adB)];
  const satirKategorisi = new Map<number, string>();
  satirlar.forEach((_, j) => satirKategorisi.set(j, kats[j % 2]));
  return {
    tablo: yeni,
    eslem: { sutun: 2, ad: 'Değişken', kategoriler: kats, renkler: new Map(kats.map((k, i) => [k, seriRengi(i)])), satirKategorisi },
    karsilik,
  };
}

/**
 * Gruplu karşılaştırmanın renk eşlemesi (nokta grafiğinde yığınları yan yana ayıran ve renklendiren): renk anahtarı
 * gruplayan sütunsa onun kendisi, değilse sütunun kategorileri kategori paletiyle.
 */
export function grupEslemesi(tablo: VeriTablosu, grupSutun: number, sira: string[] | undefined, renkEslemi: RenkEslemesi | null | undefined): RenkEslemesi | null {
  if (grupSutun < 0 || grupSutun >= tablo.sutunlar.length) return null;
  if (renkEslemi && renkEslemi.sutun === grupSutun) return renkEslemi;
  const metinler = sutunMetinleri(tablo, grupSutun);
  const kats = kategoriler(
    metinler.map((m) => m.deger),
    sira,
  ).filter((kat) => metinler.some((m) => m.deger === kat));
  const renkler = grupRenkleri(kats, null, grupSutun);
  return {
    sutun: grupSutun,
    ad: tablo.sutunlar[grupSutun].ad,
    kategoriler: kats,
    renkler: new Map(kats.map((k, i) => [k, renkler[i]])),
    satirKategorisi: new Map(metinler.map((m) => [m.satir, m.deger])),
  };
}

// ── Çizgi: grupların çizgileri tek grafikte (altlı üstlü) ────────────────────

/** Gruplu çizginin grubu: adı ve satırları (tablonun geneline göre, tablo sırasıyla; grafikKurallari: GrupPaneli) */
export interface CizgiGrubu {
  kategori: string;
  satirlar: number[];
}

/**
 * Grupların k. satırları aynı adı mı taşıyor ("1. hafta" A'da da B'de de): uzun biçimli zaman dizisi. Ortaksa yatay
 * eksende o adlar, değilse grup içi sıra ("1.", "2." …) yazılır. En az bir sırada iki grubun satırı olmalı.
 */
export function grupEtiketleriOrtak(tablo: VeriTablosu, gruplar: readonly CizgiGrubu[]): boolean {
  const n = gruplar.reduce((m, g) => Math.max(m, g.satirlar.length), 0);
  let karsilasma = false;
  for (let k = 0; k < n; k++) {
    const adlar = gruplar.filter((g) => g.satirlar[k] !== undefined).map((g) => satirEtiketi(tablo, g.satirlar[k]).trim());
    if (adlar.length > 1) karsilasma = true;
    if (adlar.some((a) => a === '' || a !== adlar[0])) return false;
  }
  return karsilasma;
}

export interface GrupCizgiTablosu {
  /** İlk sütun yatay eksenin adları (grup içi sıra ya da ortak satır adı), sonra her seri bir sayısal sütun */
  tablo: VeriTablosu;
  /** serilerin türetilmiş tablodaki sütunları (1, 2, …) */
  sutunlar: number[];
  /** seri sırasıyla: grubun rengi, grubun adı, kesikli mi (ikinci değişkenin serileri), asıl değişkenin sırası */
  renkler: string[];
  gruplar: string[];
  kesikli: boolean[];
  degiskenSirasi: number[];
  /** seri → asıl tablodaki sütun */
  asilSutunlar: number[];
  /** [türetilmiş satır][seri] → asıl satır (o grupta o sırada satır yoksa −1) */
  karsilik: number[][];
  /** dikey eksenin adı (değişkenin adı: "Puan"); seri adları lejantta */
  eksenAdi: string;
}

/**
 * Alan uzmanı (7. tur): karşılaştırmalı veride bütün grupların çizgileri aynı grafikte, ortak eksenlerde altlı üstlü
 * çizilir; ayrı paneller ve "önce birinci grup, sonra ikinci grup" sırası kullanılmaz. Her grubun k. satırı yatay
 * eksende aynı yere düşer (7A-01 ile 7B-01 "1."de). Türetilmiş tabloda her (değişken, grup) çifti bir seridir:
 * tek değişkende seri adı grubun adıdır ("7-A"), ikinci değişkende "7-A · Puan"; ikinci değişkenin serileri kesikli.
 */
export function grupCizgiTablosu(
  tablo: VeriTablosu,
  degiskenler: readonly number[],
  gruplar: readonly CizgiGrubu[],
  grupSutun: number,
  renkEslemi?: RenkEslemesi | null,
): GrupCizgiTablosu {
  const ortak = grupEtiketleriOrtak(tablo, gruplar);
  const n = gruplar.reduce((m, g) => Math.max(m, g.satirlar.length), 0);
  const ilk = tablo.sutunlar[0];
  const xAdi = ilk?.tur === 'etiket' ? (ortak ? ilk.ad : `${ilk.ad} sırası`) : 'Sıra';
  const grupRenk = grupRenkleri(gruplar.map((g) => g.kategori), renkEslemi, grupSutun);
  const seriler = degiskenler.flatMap((sutun, di) =>
    gruplar.map((g, gi) => ({
      sutun,
      di,
      gi,
      ad: degiskenler.length > 1 ? `${g.kategori} · ${birimsiz(tablo.sutunlar[sutun]?.ad ?? '')}` : g.kategori,
    })),
  );
  const karsilik = Array.from({ length: n }, (_, k) => seriler.map((s) => gruplar[s.gi].satirlar[k] ?? -1));
  const satirAdi = (k: number) => {
    if (!ortak) return `${k + 1}.`;
    const g = gruplar.find((x) => x.satirlar[k] !== undefined);
    return g ? satirEtiketi(tablo, g.satirlar[k]) : `${k + 1}.`;
  };
  const yeni: VeriTablosu = {
    sutunlar: [
      { id: `${ilk?.id ?? 'etiket'}~sira`, ad: xAdi, tur: 'etiket' },
      ...seriler.map((s) => ({ id: `${tablo.sutunlar[s.sutun]?.id ?? 's'}~${s.gi}`, ad: s.ad, tur: 'sayi' as const })),
    ],
    satirlar: karsilik.map((satirlar, k) => ({
      id: `sira-${k}`,
      hucreler: [satirAdi(k), ...satirlar.map((satir, j) => (satir < 0 ? '' : tablo.satirlar[satir]?.hucreler[seriler[j].sutun] ?? ''))],
    })),
  };
  const adlar = degiskenler.map((s) => tablo.sutunlar[s]?.ad ?? '');
  return {
    tablo: yeni,
    sutunlar: seriler.map((_, j) => j + 1),
    renkler: seriler.map((s) => grupRenk[s.gi]),
    gruplar: seriler.map((s) => gruplar[s.gi].kategori),
    kesikli: seriler.map((s) => s.di > 0),
    degiskenSirasi: seriler.map((s) => s.di),
    asilSutunlar: seriler.map((s) => s.sutun),
    karsilik,
    eksenAdi: adlar.join(' ve '),
  };
}
