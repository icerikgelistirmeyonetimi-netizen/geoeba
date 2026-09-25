/**
 * Algoritma Laboratuvarı — dünya modeli (saf; sahne ve yorumlayıcı bunu paylaşır).
 *
 * Bütün dünyalar aynı ızgara kurallarıyla çalışır; türleri:
 * - Sıra (sera, 3. sınıf): tek satır; x = 0 başlangıç, x = 1…n bitkiler, x = n + 1 çıkış. Robot
 *   doğuya (+x) bakarak başlar; sıranın iki yanı ve iki ucu duvardır.
 * - Bahçe: `harita` satırlarından kurulan ızgara; yollar, çalılar, başlangıç, hedef (çiçek), saksılar,
 *   domatesler; boyanacak karolar ya da ekilecek tarla hücreleri.
 * - Saha (çizim): `cizim` satırlarıyla verilen nokta ağı; çizgi robotu kalem indiyken yürüdüğü
 *   her birim yolu çizer. Hedef şeklin çizgileri (bir kısmı hazır verilebilir) ve işaretlenecek noktalar.
 * - İnşaat alanı: harita rakamları hedef küp yüksekliklerini verir; dron uçar, bulunduğu kareye küp koyar.
 * Değişkenler (5. sınıftan) dünya durumunun parçasıdır; böylece iz her adımda değerleri taşır.
 */
import type { EylemTuru, KosulTuru, OlcumTuru } from './program';

export type ToprakDurumu = 'kuru' | 'nemli';
export type DomatesDurumu = 'kirmizi' | 'yesil' | 'yok';
export type YaprakDurumu = 'sari' | 'saglam';
/** 0 doğu (+x, sıra boyunca) · 1 güney (+y, kameraya doğru) · 2 batı · 3 kuzey */
export type Yon = 0 | 1 | 2 | 3;

export interface HedefAdi {
  /** "çiçek" */
  yalin: string;
  /** "çiçeğe" */
  yonelme: string;
  /** "çiçeği" */
  belirtme: string;
}

export const CIKIS_ADI: HedefAdi = { yalin: 'çıkış', yonelme: 'çıkışa', belirtme: 'çıkışı' };

export interface BitkiTanimi {
  tur: 'saksi' | 'domates';
  toprak?: ToprakDurumu;
  domates?: 'kirmizi' | 'yesil';
  yaprak?: YaprakDurumu;
  /** Domatesin kütlesi (g); ölçüm "kütle" bunu okur */
  gram?: number;
}

export type DunyaTuru = 'sera' | 'bahce' | 'cizim' | 'insaat';

export interface DunyaTanimi {
  id: string;
  /** Kısa ad: "Görünen sera", "Kısa sıra" … */
  ad: string;
  /** Neyi sınadığı (öğretmen notu) */
  sinar?: string;
  bitkiler: BitkiTanimi[];
  /** Depodaki su (litre); yalnız sulama dünyalarında anlamlı */
  depo?: number;
  /**
   * Bahçe / inşaat ızgarası (satırlar, kuzeyden güneye): '.' yol · '#' çalı · 'B' başlangıç · 'H' hedef ·
   * 'K' / 'N' kuru / nemli saksı · 'R' / 'Y' kırmızı / yeşil domates · 'o' boyanacak (ekilecek) kare ·
   * '*' hazır boyalı kare · 'b' boyanacak karede başlangıç · inşaatta '1'–'8' hedef kule yüksekliği.
   * Verilirse `bitkiler` haritadaki okuma sırasıyla üretilmiş olmalıdır (`bahce()` yardımcısı bunu yapar).
   */
  harita?: string[];
  /**
   * Saha (çizim) nokta ağı: çift satırlar noktalar, tek satırlar dikey çizgiler; çift sütunlar noktalar,
   * tek sütunlar yatay çizgiler. Nokta: '.' · 'B' başlangıç · 'o' işaretlenecek nokta · 'b' ikisi birden.
   * Yatay çizgi: '-' çizilecek · '=' hazır çizili. Dikey çizgi: '|' çizilecek · '!' hazır çizili.
   */
  cizim?: string[];
  /** Başlangıç yönü (varsayılan doğu) */
  yon?: Yon;
  /** Hedefin adı iletilerde (varsayılan "çıkış") */
  hedefAdi?: HedefAdi;
  /** Robot her adımda hücreye numaralı iz bırakır (1–2. sınıf sayma) */
  adimIzi?: boolean;
  /** Boyama dünyasında işin adı: karo boyamak ya da tarlaya tohum ekmek */
  boyaTuru?: 'boya' | 'ek';
  /** İnşaat alanı: dron uçar, küp koyar */
  insaat?: boolean;
  /** Simetri / yansıma doğrusu (nokta ya da hücre koordinatında; 2.5 iki hücrenin arası) */
  eksen?: { yon: 'dikey' | 'yatay'; k: number };
  /** Koordinat eksenleri çizilir; y yukarı doğru artar (en alttaki sıra y = 0) */
  koordinat?: boolean;
  /** Başlangıçta değeri olan değişkenler (ör. n = saksı sayısı) */
  degiskenler?: Record<string, number>;
  /** Kalem başta yerde mi (varsayılan: sahada çizgi varsa evet) */
  kalem?: boolean;
  /**
   * Hedef tuvalde gösterilmez (simetri, yansıma, fonksiyon görevleri: öğrenci akıl yürütür). Varsayılan:
   * çizilecek çizgiler soluk kesikli, boyanacak kareler çerçeveli, noktalar halka, yapı hayalet küplerle görünür.
   * İnşaatta gizliyse tuvalde yapının önden ve yandan görünümü çizilir.
   */
  hedefGizli?: boolean;
}

/** Derlenmiş ızgara: yol hücreleri, başlangıç, hedef, bitkiler ve şekil / yapı hedefleri. */
export interface Izgara {
  /** Sıra dışındaki bütün ızgaralar (bahçe, saha, inşaat) */
  bahce: boolean;
  tur: DunyaTuru;
  en: number;
  boy: number;
  yol: boolean[];
  bas: { x: number; y: number; yon: Yon };
  hedef: { x: number; y: number } | null;
  /** Bitki sırası → hücre */
  bitkiYeri: { x: number; y: number }[];
  /** Hücre (y·en + x) → bitki sırası ya da −1 */
  hucreBitki: number[];
  /** Boyanacak (ekilecek) hücreler ve hazır boyalı olanlar */
  boyaHedef: boolean[];
  boyaVerilen: boolean[];
  /** İnşaat: hücre → hedef küp yüksekliği */
  yapiHedef: number[];
  /** Saha: çizilecek ve hazır çizili birim çizgiler ("a-b", a < b hücre sırası) */
  cizgiHedef: ReadonlySet<string>;
  cizgiVerilen: ReadonlySet<string>;
  /** İşaretlenecek noktalar */
  noktaHedef: boolean[];
}

const IZGARA_ONBELLEK = new WeakMap<DunyaTanimi, Izgara>();

export function cizgiAnahtari(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function cizgiUclari(k: string): [number, number] {
  const [a, b] = k.split('-').map(Number);
  return [a, b];
}

function bosIzgara(tur: DunyaTuru, en: number, boy: number, yonBas: Yon): Izgara {
  const n = en * boy;
  return {
    bahce: tur !== 'sera',
    tur,
    en,
    boy,
    yol: Array.from({ length: n }, () => true),
    bas: { x: 0, y: 0, yon: yonBas },
    hedef: null,
    bitkiYeri: [],
    hucreBitki: Array.from({ length: n }, () => -1),
    boyaHedef: Array.from({ length: n }, () => false),
    boyaVerilen: Array.from({ length: n }, () => false),
    yapiHedef: Array.from({ length: n }, () => 0),
    cizgiHedef: new Set(),
    cizgiVerilen: new Set(),
    noktaHedef: Array.from({ length: n }, () => false),
  };
}

export function izgara(t: DunyaTanimi): Izgara {
  const var_ = IZGARA_ONBELLEK.get(t);
  if (var_) return var_;
  const yon0 = (t.yon ?? 0) as Yon;
  let g: Izgara;
  if (t.cizim && t.cizim.length) {
    const satir = t.cizim;
    const boy = Math.floor((satir.length - 1) / 2) + 1;
    const en = Math.floor((Math.max(...satir.map((s) => s.length)) - 1) / 2) + 1;
    g = bosIzgara('cizim', en, boy, yon0);
    const hedef = new Set<string>();
    const verilen = new Set<string>();
    for (let r = 0; r < satir.length; r++) {
      for (let c = 0; c < satir[r].length; c++) {
        const ch = satir[r][c];
        if (r % 2 === 0 && c % 2 === 0) {
          const h = (r / 2) * en + c / 2;
          if (ch === 'B' || ch === 'b') g.bas = { x: c / 2, y: r / 2, yon: yon0 };
          if (ch === 'o' || ch === 'b') g.noktaHedef[h] = true;
        } else if (r % 2 === 0 && c % 2 === 1 && (ch === '-' || ch === '=')) {
          const a = (r / 2) * en + (c - 1) / 2;
          (ch === '-' ? hedef : verilen).add(cizgiAnahtari(a, a + 1));
        } else if (r % 2 === 1 && c % 2 === 0 && (ch === '|' || ch === '!')) {
          const a = ((r - 1) / 2) * en + c / 2;
          (ch === '|' ? hedef : verilen).add(cizgiAnahtari(a, a + en));
        }
      }
    }
    g.cizgiHedef = hedef;
    g.cizgiVerilen = verilen;
  } else if (t.harita && t.harita.length) {
    const boy = t.harita.length;
    const en = Math.max(...t.harita.map((r) => r.length));
    g = bosIzgara(t.insaat ? 'insaat' : 'bahce', en, boy, yon0);
    for (let y = 0; y < boy; y++) {
      for (let x = 0; x < en; x++) {
        const c = t.harita[y][x] ?? '#';
        const h = y * en + x;
        g.yol[h] = c !== '#';
        if ('KNRY'.includes(c)) {
          g.hucreBitki[h] = g.bitkiYeri.length;
          g.bitkiYeri.push({ x, y });
        }
        if (c === 'B' || c === 'b') g.bas = { x, y, yon: yon0 };
        if (c === 'H') g.hedef = { x, y };
        if (c === 'o' || c === 'b') g.boyaHedef[h] = true;
        if (c === '*') g.boyaVerilen[h] = true;
        if (c >= '1' && c <= '8') g.yapiHedef[h] = Number(c);
      }
    }
  } else {
    const n = t.bitkiler.length;
    const en = n + 2;
    g = bosIzgara('sera', en, 1, 0);
    g.hedef = { x: n + 1, y: 0 };
    g.bitkiYeri = t.bitkiler.map((_, i) => ({ x: i + 1, y: 0 }));
    g.hucreBitki = Array.from({ length: en }, (_, x) => (x >= 1 && x <= n ? x - 1 : -1));
  }
  IZGARA_ONBELLEK.set(t, g);
  return g;
}

export function hedefAdi(t: DunyaTanimi): HedefAdi {
  return t.hedefAdi ?? CIKIS_ADI;
}

/**
 * Bahçe dünyası: harita satırlarından bitkileri okuma sırasıyla üretir.
 * Örnek: bahce('b1', 'Çiçek bahçesi', ['B..H'], { hedefAdi: CICEK })
 */
export function bahce(id: string, ad: string, harita: string[], ek: Partial<Omit<DunyaTanimi, 'id' | 'ad' | 'harita' | 'bitkiler'>> & { gramlar?: number[] } = {}): DunyaTanimi {
  const { gramlar, ...kalan } = ek;
  const bitkiler: BitkiTanimi[] = [];
  let d = 0;
  for (const satir of harita) {
    for (const c of satir) {
      if (c === 'K') bitkiler.push({ tur: 'saksi', toprak: 'kuru', yaprak: 'saglam' });
      else if (c === 'N') bitkiler.push({ tur: 'saksi', toprak: 'nemli', yaprak: 'saglam' });
      else if (c === 'R' || c === 'Y') {
        const b: BitkiTanimi = { tur: 'domates', domates: c === 'R' ? 'kirmizi' : 'yesil' };
        if (gramlar?.[d] !== undefined) b.gram = gramlar[d];
        d += 1;
        bitkiler.push(b);
      }
    }
  }
  return { id, ad, harita, bitkiler, adimIzi: true, ...kalan };
}

/** Saha (çizim) dünyası; adım izi yok, kalem başta iner. */
export function saha(id: string, ad: string, cizim: string[], ek: Partial<Omit<DunyaTanimi, 'id' | 'ad' | 'cizim' | 'bitkiler' | 'harita'>> = {}): DunyaTanimi {
  return { id, ad, cizim, bitkiler: [], ...ek };
}

/** İnşaat alanı: rakamlar hedef kule yükseklikleri. */
export function insaatAlani(id: string, ad: string, harita: string[], ek: Partial<Omit<DunyaTanimi, 'id' | 'ad' | 'harita' | 'bitkiler' | 'insaat'>> = {}): DunyaTanimi {
  return { id, ad, harita, bitkiler: [], insaat: true, ...ek };
}

/** Hücrenin sırası (y·en + x) */
export function hucreNo(g: Izgara, x: number, y: number): number {
  return y * g.en + x;
}

export interface BitkiDurumu extends Omit<BitkiTanimi, 'toprak' | 'domates' | 'yaprak'> {
  toprak: ToprakDurumu;
  domates?: DomatesDurumu;
  yaprak: YaprakDurumu;
  sulama: number;
  gubre: boolean;
  /** Görsel zarar izi: taşan su, koparılmış ham domates, gereksiz gübre */
  zarar: 'tasma' | 'ham' | 'gubre' | null;
}

export interface DunyaDurumu {
  x: number;
  y: number;
  yon: Yon;
  /** Derlenmiş ızgara (paylaşılır, kopyalanmaz) */
  izgara: Izgara;
  /** Robotun adım attığı hücreler, sırayla (adım izleri) */
  izler: number[];
  /** Robot hedef hücreden en az bir kez geçti mi */
  hedefeUgradi: boolean;
  depo: number;
  harcanan: number;
  /** Sepetteki (toplanmış) domates sayısı; ham koparılanlar dahil değildir */
  sepet: number;
  /** Robotun şimdiye kadar ulaştığı en uzak x (bakılmayan bitkileri bildirmek için) */
  enUzak: number;
  bitkiler: BitkiDurumu[];
  /** Çizgi robotunun kalemi yerde mi */
  kalem: boolean;
  /** Robotun çizdiği birim çizgiler (hazır verilenler dahil değil), çizim sırasıyla */
  cizgiler: string[];
  /** Boyanan (ekilen) hücreler, sırayla */
  boyali: number[];
  /** Hücre → küp sayısı (inşaat) */
  kupler: number[];
  /** İşaretlenen noktalar, sırayla */
  noktalar: number[];
  degiskenler: Record<string, number>;
}

export const SULAMA_LITRE = 2;
export const VARSAYILAN_DEPO = 20;
export const DOMATES_GRAM = 100;
export const KULE_EN_COK = 8;

/** Sıra dünyasında çıkışın x'i (bahçede kullanılmaz) */
export function cikisX(d: { bitkiler: readonly unknown[] }): number {
  return d.bitkiler.length + 1;
}

export function hedefteMi(d: DunyaDurumu): boolean {
  const h = d.izgara.hedef;
  return !!h && d.x === h.x && d.y === h.y;
}

/** Robotun hücresindeki bitkinin sırası (yoksa −1) */
export function bitkiSirasi(d: DunyaDurumu): number {
  const g = d.izgara;
  if (d.x < 0 || d.y < 0 || d.x >= g.en || d.y >= g.boy) return -1;
  return g.hucreBitki[hucreNo(g, d.x, d.y)];
}

/** Koordinat düzleminde (y yukarı) hücrenin koordinatı */
export function koordinatlar(g: Izgara, x: number, y: number): { x: number; y: number } {
  return { x, y: g.boy - 1 - y };
}

export function baslangicDurumu(t: DunyaTanimi): DunyaDurumu {
  const g = izgara(t);
  return {
    x: g.bas.x,
    y: g.bas.y,
    yon: g.bas.yon,
    izgara: g,
    izler: [],
    hedefeUgradi: false,
    depo: t.depo ?? VARSAYILAN_DEPO,
    harcanan: 0,
    sepet: 0,
    enUzak: 0,
    bitkiler: t.bitkiler.map((b) => ({
      ...b,
      // Domates fidelerinin toprağı nemli kabul edilir (sulama gerekmez; sularsa taşar)
      toprak: b.toprak ?? 'nemli',
      domates: b.tur === 'domates' ? b.domates ?? 'yesil' : undefined,
      yaprak: b.yaprak ?? 'saglam',
      sulama: 0,
      gubre: false,
      zarar: null,
    })),
    // Çizilecek ya da hazır çizgi olan sahada kalem başta iner; yalnız nokta işaretlenen düzlemde kalkık
    kalem: t.kalem ?? (g.tur === 'cizim' && g.cizgiHedef.size + g.cizgiVerilen.size > 0),
    cizgiler: [],
    boyali: [],
    kupler: g.tur === 'insaat' ? Array.from({ length: g.en * g.boy }, () => 0) : [],
    noktalar: [],
    degiskenler: { ...(t.degiskenler ?? {}) },
  };
}

export function durumKopyala(d: DunyaDurumu): DunyaDurumu {
  return {
    ...d,
    izler: d.izler.slice(),
    bitkiler: d.bitkiler.map((b) => ({ ...b })),
    cizgiler: d.cizgiler.slice(),
    boyali: d.boyali.slice(),
    kupler: d.kupler.slice(),
    noktalar: d.noktalar.slice(),
    degiskenler: { ...d.degiskenler },
  };
}

/** Robotun bulunduğu hücredeki bitki (yoksa null). */
export function buradakiBitki(d: DunyaDurumu): BitkiDurumu | null {
  const i = bitkiSirasi(d);
  return i >= 0 ? d.bitkiler[i] : null;
}

/** Yön → hücre adımı */
export function yonAdimi(yon: Yon): [number, number] {
  return yon === 0 ? [1, 0] : yon === 1 ? [0, 1] : yon === 2 ? [-1, 0] : [0, -1];
}

export function kosulDegeri(d: DunyaDurumu, k: KosulTuru): boolean {
  const b = buradakiBitki(d);
  switch (k) {
    case 'cikistayim':
      return hedefteMi(d);
    case 'toprakKuru':
      return !!b && b.tur === 'saksi' && b.toprak === 'kuru';
    case 'domatesKirmizi':
      return !!b && b.domates === 'kirmizi';
    case 'yaprakSari':
      return !!b && b.yaprak === 'sari';
  }
}

/** Ölçüm değeri: buradaki domatesin kütlesi (domates yoksa 0), depo, koordinatlar */
export function olcumDegeri(d: DunyaDurumu, o: OlcumTuru): number {
  switch (o) {
    case 'kutle': {
      // Buradaki domates fidesinin domatesi (toplandıktan sonra da: robot tartıp sepete koyar)
      const b = buradakiBitki(d);
      return b && b.tur === 'domates' ? b.gram ?? DOMATES_GRAM : 0;
    }
    case 'depo':
      return d.depo;
    case 'x':
      return koordinatlar(d.izgara, d.x, d.y).x;
    case 'y':
      return koordinatlar(d.izgara, d.x, d.y).y;
  }
}

export type HataTuru =
  | 'duvar'
  | 'tasma'
  | 'bosSula'
  | 'depoBos'
  | 'ham'
  | 'bosTopla'
  | 'gereksizGubre'
  | 'bosGubre'
  | 'yanlisCizgi'
  | 'yanlisBoya'
  | 'yanlisKup'
  | 'yanlisNokta'
  | 'tanimsiz'
  | 'gecersizSayi'
  | 'bolmeSifir'
  | 'bilinmeyenKomut'
  | 'derin'
  | 'sonsuz'
  | 'cokUzun';

export interface Hata {
  tur: HataTuru;
  /** Hatanın olduğu hücre */
  x: number;
  y: number;
  yon: Yon;
  /** Hatanın olduğu bitki (1'den); başlangıç/çıkışta yok */
  bitki?: number;
  /** Hatayı üreten blok */
  blokId: string | null;
  /** Önceden toplanmış (kalmamış) domates · bahçede çarpılan şey (çalı / çit) · sahanın ya da alanın kenarı · küp: boş yer / fazla */
  alt?: 'kalmamis' | 'cali' | 'cit' | 'kenar' | 'bos' | 'fazla';
  /** Yanlış çizgi */
  cizgi?: string;
  /** Değişken ya da komut adı · geçersiz sayı */
  ad?: string;
  deger?: number;
  /** Kulenin olması gereken yüksekliği */
  hedefYukseklik?: number;
}

/**
 * Eylemi uygular. Başarılıysa yeni durum; hata varsa hata ve (görsel iz için) hatanın izini
 * taşıyan durum döner. Girdi durumu değiştirilmez.
 */
export function eylemUygula(d0: DunyaDurumu, e: EylemTuru, blokId: string | null = null): { durum: DunyaDurumu; hata: Hata | null } {
  const d = durumKopyala(d0);
  const g = d.izgara;
  const sira = bitkiSirasi(d);
  const hata = (tur: HataTuru, ek: Partial<Hata> = {}): { durum: DunyaDurumu; hata: Hata } => ({
    durum: d,
    hata: { tur, x: d.x, y: d.y, yon: d.yon, bitki: sira >= 0 ? sira + 1 : undefined, blokId, ...ek },
  });
  const b = buradakiBitki(d);
  const burasi = hucreNo(g, d.x, d.y);
  switch (e) {
    case 'ileri': {
      const [dx, dy] = yonAdimi(d.yon);
      const hx = d.x + dx;
      const hy = d.y + dy;
      const icinde = hx >= 0 && hy >= 0 && hx < g.en && hy < g.boy;
      const serbest = g.tur === 'cizim' || g.tur === 'insaat';
      if (!icinde || (!serbest && !g.yol[hucreNo(g, hx, hy)])) {
        return hata('duvar', g.bahce ? { alt: serbest ? 'kenar' : icinde ? 'cali' : 'cit' } : {});
      }
      const yeni = hucreNo(g, hx, hy);
      if (g.tur === 'cizim' && d.kalem) {
        const k = cizgiAnahtari(burasi, yeni);
        if (!g.cizgiHedef.has(k) && !g.cizgiVerilen.has(k)) {
          // Yanlış çizgi yine de çizilir (sahne mercan renkte gösterir), robot yeni noktadadır
          d.x = hx;
          d.y = hy;
          d.cizgiler.push(k);
          return hata('yanlisCizgi', { cizgi: k });
        }
        if (!d.cizgiler.includes(k) && !g.cizgiVerilen.has(k)) d.cizgiler.push(k);
      }
      d.x = hx;
      d.y = hy;
      d.enUzak = g.bahce ? d.enUzak : Math.max(d.enUzak, hx);
      d.izler.push(yeni);
      if (hedefteMi(d)) d.hedefeUgradi = true;
      return { durum: d, hata: null };
    }
    case 'sagaDon':
      d.yon = ((d.yon + 1) % 4) as Yon;
      return { durum: d, hata: null };
    case 'solaDon':
      d.yon = ((d.yon + 3) % 4) as Yon;
      return { durum: d, hata: null };
    case 'sula': {
      if (!b) return hata('bosSula');
      if (d.depo < SULAMA_LITRE) return hata('depoBos', { deger: d.depo });
      d.depo -= SULAMA_LITRE;
      d.harcanan += SULAMA_LITRE;
      b.sulama += 1;
      if (b.toprak === 'nemli') {
        b.zarar = 'tasma';
        return hata('tasma');
      }
      b.toprak = 'nemli';
      return { durum: d, hata: null };
    }
    case 'topla': {
      if (!b || b.tur !== 'domates') return hata('bosTopla');
      if (b.domates === 'yok') return hata('bosTopla', { alt: 'kalmamis' });
      if (b.domates === 'yesil') {
        b.domates = 'yok';
        b.zarar = 'ham';
        return hata('ham');
      }
      b.domates = 'yok';
      d.sepet += 1;
      return { durum: d, hata: null };
    }
    case 'gubreVer': {
      if (!b) return hata('bosGubre');
      if (b.yaprak !== 'sari' || b.gubre) {
        b.zarar = 'gubre';
        return hata('gereksizGubre');
      }
      b.gubre = true;
      b.yaprak = 'saglam';
      return { durum: d, hata: null };
    }
    case 'boya':
    case 'ek': {
      // Hazır boyalı kareyi yeniden boyamak zararsızdır
      if (g.boyaVerilen[burasi]) return { durum: d, hata: null };
      if (!g.boyaHedef[burasi]) {
        if (!d.boyali.includes(burasi)) d.boyali.push(burasi);
        return hata('yanlisBoya');
      }
      if (!d.boyali.includes(burasi)) d.boyali.push(burasi);
      return { durum: d, hata: null };
    }
    case 'koy': {
      const t = g.yapiHedef[burasi] ?? 0;
      const h = d.kupler[burasi] ?? 0;
      if (d.kupler.length) d.kupler[burasi] = Math.min(KULE_EN_COK, h + 1);
      if (h + 1 > t) return hata('yanlisKup', { alt: t === 0 ? 'bos' : 'fazla', hedefYukseklik: t });
      return { durum: d, hata: null };
    }
    case 'isaretle': {
      if (!d.noktalar.includes(burasi)) d.noktalar.push(burasi);
      if (!g.noktaHedef[burasi]) return hata('yanlisNokta');
      return { durum: d, hata: null };
    }
    case 'kalemKaldir':
      d.kalem = false;
      return { durum: d, hata: null };
    case 'kalemIndir':
      d.kalem = true;
      return { durum: d, hata: null };
  }
}

// ---------------------------------------------------------------------------
// Hedef
// ---------------------------------------------------------------------------

export interface Hedef {
  kurulariSula?: boolean;
  sarilariGubrele?: boolean;
  kirmizilariTopla?: boolean;
  cikistaBitir?: boolean;
  /** Robot hedefe en kısa yoldan varmalı (adım sayısı) */
  enKisaYol?: boolean;
  /** Şeklin bütün çizgileri çizilmeli */
  cizimiTamamla?: boolean;
  /** Bütün hedef kareler boyanmalı (ekilmeli) */
  boyamayiTamamla?: boolean;
  /** Yapı hedef yüksekliklere ulaşmalı */
  yapiyiKur?: boolean;
  /** Bütün hedef noktalar işaretlenmeli */
  noktalariKoy?: boolean;
  /** Program bitince değişkenlerin olması gereken değerleri */
  degiskenler?: Record<string, number>;
}

export type Eksik =
  | { tur: 'cikis'; bakilmayan: number[]; uzaklik?: number; gecti?: boolean }
  | { tur: 'susuz'; bitkiler: number[] }
  | { tur: 'gubresiz'; bitkiler: number[] }
  | { tur: 'dalda'; bitkiler: number[] }
  | { tur: 'uzunYol'; adim: number; enKisa: number }
  | { tur: 'cizim'; eksik: number }
  | { tur: 'boya'; eksik: number }
  | { tur: 'yapi'; eksik: number; kuleler: number }
  | { tur: 'nokta'; noktalar: { x: number; y: number }[] }
  | { tur: 'degisken'; ad: string; beklenen: number; olan?: number };

/** Başlangıçtan hedefe en kısa yolun adım sayısı (yol hücrelerinde, dört yöne); yol yoksa −1 */
export function enKisaYolUzunlugu(g: Izgara): number {
  if (!g.hedef) return -1;
  const hedef = hucreNo(g, g.hedef.x, g.hedef.y);
  const bas = hucreNo(g, g.bas.x, g.bas.y);
  const uzak = new Map<number, number>([[bas, 0]]);
  const kuyruk = [bas];
  while (kuyruk.length) {
    const h = kuyruk.shift()!;
    if (h === hedef) return uzak.get(h)!;
    const x = h % g.en;
    const y = Math.floor(h / g.en);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= g.en || ny >= g.boy) continue;
      const k = hucreNo(g, nx, ny);
      if (!g.yol[k] || uzak.has(k)) continue;
      uzak.set(k, uzak.get(h)! + 1);
      kuyruk.push(k);
    }
  }
  return -1;
}

export function hedefEksikleri(d: DunyaDurumu, h: Hedef): Eksik[] {
  const eksik: Eksik[] = [];
  const g = d.izgara;
  // Sırada robotun hiç uğramadığı bitkiler "çıkışa varamadı" iletisinde ayrıca sayılır; burada tekrarlanmaz
  const sira = (f: (b: BitkiDurumu) => boolean) => d.bitkiler.map((b, i) => (f(b) && (g.bahce || i + 1 <= d.enUzak) ? i + 1 : 0)).filter(Boolean);
  if (h.kurulariSula) {
    const s = sira((b) => b.tur === 'saksi' && b.toprak === 'kuru');
    if (s.length) eksik.push({ tur: 'susuz', bitkiler: s });
  }
  if (h.sarilariGubrele) {
    const s = sira((b) => b.yaprak === 'sari');
    if (s.length) eksik.push({ tur: 'gubresiz', bitkiler: s });
  }
  if (h.kirmizilariTopla) {
    const s = sira((b) => b.domates === 'kirmizi');
    if (s.length) eksik.push({ tur: 'dalda', bitkiler: s });
  }
  if (h.cizimiTamamla) {
    let n = 0;
    for (const k of g.cizgiHedef) if (!d.cizgiler.includes(k)) n += 1;
    if (n) eksik.push({ tur: 'cizim', eksik: n });
  }
  if (h.boyamayiTamamla) {
    const n = g.boyaHedef.filter((v, i) => v && !d.boyali.includes(i)).length;
    if (n) eksik.push({ tur: 'boya', eksik: n });
  }
  if (h.yapiyiKur) {
    let n = 0;
    let kule = 0;
    g.yapiHedef.forEach((t, i) => {
      const e = t - (d.kupler[i] ?? 0);
      if (e > 0) {
        n += e;
        kule += 1;
      }
    });
    if (n) eksik.push({ tur: 'yapi', eksik: n, kuleler: kule });
  }
  if (h.noktalariKoy) {
    const noktalar = g.noktaHedef
      .map((v, i) => (v && !d.noktalar.includes(i) ? koordinatlar(g, i % g.en, Math.floor(i / g.en)) : null))
      .filter((p): p is { x: number; y: number } => !!p);
    if (noktalar.length) eksik.push({ tur: 'nokta', noktalar });
  }
  if (h.degiskenler) {
    for (const [ad, beklenen] of Object.entries(h.degiskenler)) {
      const olan = d.degiskenler[ad];
      if (olan !== beklenen) eksik.push({ tur: 'degisken', ad, beklenen, olan });
    }
  }
  if (h.cikistaBitir !== false && g.hedef && !hedefteMi(d)) {
    if (g.bahce) {
      const uzaklik = Math.abs(d.x - g.hedef.x) + Math.abs(d.y - g.hedef.y);
      eksik.unshift({ tur: 'cikis', bakilmayan: [], uzaklik, gecti: d.hedefeUgradi });
    } else {
      const bakilmayan: number[] = [];
      for (let i = d.enUzak + 1; i <= d.bitkiler.length; i++) bakilmayan.push(i);
      eksik.unshift({ tur: 'cikis', bakilmayan });
    }
  } else if (h.enKisaYol && g.hedef && hedefteMi(d)) {
    const enKisa = enKisaYolUzunlugu(g);
    if (enKisa >= 0 && d.izler.length > enKisa) eksik.push({ tur: 'uzunYol', adim: d.izler.length, enKisa });
  }
  return eksik;
}

// ---------------------------------------------------------------------------
// Kısa yazım ve sürpriz dünya
// ---------------------------------------------------------------------------

/**
 * Saksı sırası: "K N K" (K kuru, N nemli); sonuna "s" eklenirse yaprak sarı ("Ks", "Ns").
 */
export function saksiSirasi(yazim: string): BitkiTanimi[] {
  return yazim
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => {
      const u = t.toUpperCase();
      return {
        tur: 'saksi' as const,
        toprak: u.startsWith('K') ? ('kuru' as const) : ('nemli' as const),
        yaprak: u.endsWith('S') ? ('sari' as const) : ('saglam' as const),
      };
    });
}

/** Domates sırası: "K Y K" (K kırmızı/olgun, Y yeşil/ham); ardından gelen sayı kütle (g): "K120 Y90". */
export function domatesSirasi(yazim: string): BitkiTanimi[] {
  return yazim
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => {
      const u = t.toUpperCase();
      const gram = u.slice(1) ? Number(u.slice(1)) : undefined;
      const b: BitkiTanimi = { tur: 'domates', domates: u.startsWith('K') ? 'kirmizi' : 'yesil' };
      if (gram !== undefined && Number.isFinite(gram)) b.gram = gram;
      return b;
    });
}

/** Tohumlu, küçük ve hızlı sözde rastgele üreteç (mulberry32). */
export function tohumluRastgele(tohum: number): () => number {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SurprizAyari {
  tur: 'saksi' | 'domates';
  enAz: number;
  enCok: number;
  /** Kuru / kırmızı olma olasılığı */
  oran: number;
  /** Sarı yaprak olasılığı (0 → hiç) */
  sariOrani?: number;
  depo?: number;
}

/** Sürpriz dünya: her "Sına"da yeni tohumla; en az bir "ilginç" bitki (kuru/kırmızı) ve bir diğeri olur. */
export function surprizDunya(a: SurprizAyari, tohum: number): DunyaTanimi {
  const r = tohumluRastgele(tohum);
  const n = a.enAz + Math.floor(r() * (a.enCok - a.enAz + 1));
  const bitkiler: BitkiTanimi[] = [];
  for (let i = 0; i < n; i++) {
    const ilginc = r() < a.oran;
    const sari = (a.sariOrani ?? 0) > 0 && r() < (a.sariOrani ?? 0);
    bitkiler.push(
      a.tur === 'saksi'
        ? { tur: 'saksi', toprak: ilginc ? 'kuru' : 'nemli', yaprak: sari ? 'sari' : 'saglam' }
        : { tur: 'domates', domates: ilginc ? 'kirmizi' : 'yesil', yaprak: sari ? 'sari' : 'saglam' }
    );
  }
  // Tekdüze sıralar (hepsi aynı) sürprizi anlamsızlaştırır: n ≥ 2 ise iki türün de bulunmasını sağla
  if (n >= 2) {
    const ilgincMi = (b: BitkiTanimi) => (a.tur === 'saksi' ? b.toprak === 'kuru' : b.domates === 'kirmizi');
    const say = bitkiler.filter(ilgincMi).length;
    const cevir = (b: BitkiTanimi): BitkiTanimi =>
      a.tur === 'saksi' ? { ...b, toprak: b.toprak === 'kuru' ? 'nemli' : 'kuru' } : { ...b, domates: b.domates === 'kirmizi' ? 'yesil' : 'kirmizi' };
    if (say === 0 || say === n) {
      const i = Math.floor(r() * n);
      bitkiler[i] = cevir(bitkiler[i]);
    }
  }
  return { id: `surpriz-${tohum}`, ad: 'Sürpriz dünya', sinar: 'Her sınamada yeniden üretilir', bitkiler, depo: a.depo };
}
