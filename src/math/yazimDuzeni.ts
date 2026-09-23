import type { Dugum, Susleme } from '@/math/matematikYazimi';
import { metinGenisligi } from '@/math/yaziGenisligi';

/**
 * Görüntü ağacını (Dugum[]) piksel düzenine çevirir. Saf, DOM'suz, vitest ile denetlenebilir.
 * Koordinatlar satırın taban çizgisine (baseline) göredir: x soldan, y AŞAĞI pozitif.
 *
 * Her parça ayrı bir <text> olur ve genişliği textLength ile SABİTLENİR. Süsler (şapka, yay, üçgen) ve
 * mutlak değer çizgileri aynı sayılardan çizilir; yazı tipi ne olursa olsun (Manrope; çevrimdışı ya da
 * dışa aktarılan görüntüde Segoe UI) harfler ile süsler hizalı kalır.
 */

export interface Parca {
  x: number;
  /** Taban çizgisine göre kayma (alt indis için pozitif) */
  dy: number;
  s: string;
  /** textLength */
  w: number;
  px: number;
  soluk: boolean;
}
export interface Sus {
  tur: Susleme;
  x0: number;
  x1: number;
  /** Süsün alt kenarı (taban çizgisinin üstünde, negatif) */
  y: number;
  /** Süs yüksekliği */
  h: number;
}
export interface Cubuk {
  x: number;
  y0: number;
  y1: number;
}
export interface Duzen {
  parcalar: Parca[];
  susler: Sus[];
  cubuklar: Cubuk[];
  genislik: number;
  /** Taban çizgisinin üstünde kalan yükseklik (pozitif) */
  ust: number;
  /** Taban çizgisinin altında kalan derinlik (pozitif) */
  alt: number;
  /** Süs ve çizgi kalınlığı */
  cizgi: number;
}

// Manrope 700 ölçüleri (em): büyük harf 0,72; üst işaretli büyük harf ve parantez 0,86; parantez altı 0,20
const BUYUK = 0.73;
const AKSANLI = 0.87;
const AKSAN = /[İÖÜĞŞÂÎÛ]/;
const PARANTEZ_UST = 0.86;
const PARANTEZ_ALT = 0.21;
const SUS_ARA = 0.09;
const CUBUK_ICI = 0.11;
const CUBUK_DISI = 0.06;
const INDIS = 0.68;

interface Durum {
  px: number;
  agirlik: 600 | 700;
  x: number;
  parcalar: Parca[];
  susler: Sus[];
  cubuklar: Cubuk[];
  bekleyen: { s: string; soluk: boolean } | null;
  ust: number;
}

function bosalt(d: Durum) {
  const b = d.bekleyen;
  d.bekleyen = null;
  if (!b || !b.s) return;
  const w = metinGenisligi(b.s, d.px, d.agirlik);
  d.parcalar.push({ x: d.x, dy: 0, s: b.s, w, px: d.px, soluk: b.soluk });
  d.x += w;
}
function ekle(d: Durum, s: string, soluk = false) {
  if (d.bekleyen && d.bekleyen.soluk !== soluk) bosalt(d);
  if (!d.bekleyen) d.bekleyen = { s: '', soluk };
  d.bekleyen.s += s;
}

/** Görüntü biçimi: A_1 → A + alt indis 1, B' → B′; sayıda eksi U+2212. */
function yerlestir(d: Durum, dugumler: Dugum[]): { ustSinir: number } {
  let ustSinir = 0;
  for (const n of dugumler) {
    switch (n.t) {
      case 'sembol': ekle(d, n.s); ustSinir = Math.max(ustSinir, /[()]/.test(n.s) ? PARANTEZ_UST : BUYUK); break;
      case 'kelime': ekle(d, n.s, !!n.soluk); ustSinir = Math.max(ustSinir, BUYUK); break;
      case 'sayi': ekle(d, n.s.replace('-', '−')); ustSinir = Math.max(ustSinir, BUYUK); break;
      case 'birim': ekle(d, n.s === '°' ? '°' : ` ${n.s}`); break;
      case 'ad': {
        const m = n.s.match(/^(\p{L})(?:_(\d+))?('*)$/u);
        if (m && m[2]) {
          ekle(d, m[1]);
          bosalt(d);
          const px = d.px * INDIS;
          const w = metinGenisligi(m[2], px, d.agirlik);
          d.parcalar.push({ x: d.x, dy: d.px * 0.24, s: m[2], w, px, soluk: false });
          d.x += w;
          if (m[3]) ekle(d, '′'.repeat(m[3].length));
        } else {
          ekle(d, n.s.replace(/'/g, '′'));
        }
        ustSinir = Math.max(ustSinir, AKSAN.test(n.s) ? AKSANLI : BUYUK);
        break;
      }
      case 'kesir': {
        const a = yerlestir(d, n.pay);
        ekle(d, '/');
        const b = yerlestir(d, n.payda);
        ustSinir = Math.max(ustSinir, a.ustSinir, b.ustSinir, BUYUK);
        break;
      }
      case 'sus': {
        bosalt(d);
        const x0 = d.x;
        const ic = yerlestir(d, n.ic);
        bosalt(d);
        const x1 = d.x;
        const px = d.px;
        const tek = x1 - x0 < px * 0.9;
        const yb = -(ic.ustSinir + SUS_ARA) * px;
        const h = n.tur === 'yay' ? Math.min(0.26 * px, (x1 - x0) * 0.2) : n.tur === 'ucgen' ? 0.3 * px : (tek ? 0.15 : 0.2) * px;
        const iceri = (tek ? 0.02 : 0.05) * px;
        d.susler.push({ tur: n.tur, x0: x0 + iceri, x1: x1 - iceri, y: yb, h });
        ustSinir = Math.max(ustSinir, -yb / px + h / px + 0.04);
        break;
      }
      case 'mutlak': {
        bosalt(d);
        d.x += CUBUK_DISI * d.px;
        const solX = d.x;
        d.x += CUBUK_ICI * d.px;
        const ic = yerlestir(d, n.ic);
        bosalt(d);
        d.x += CUBUK_ICI * d.px;
        const sagX = d.x;
        d.x += CUBUK_DISI * d.px;
        // Çizgiler parantezle aynı boyda; içeride yay varsa onun tepesini de kapsar.
        // Manrope'ta '|' büyük I ile aynı: bu yüzden karakter değil, çizgi çizilir.
        const y0 = -Math.max(0.9, ic.ustSinir + 0.02) * d.px;
        const y1 = 0.22 * d.px;
        d.cubuklar.push({ x: solX, y0, y1 }, { x: sagX, y0, y1 });
        ustSinir = Math.max(ustSinir, -y0 / d.px);
        break;
      }
    }
  }
  d.ust = Math.max(d.ust, ustSinir);
  return { ustSinir };
}

export function duzenle(dugumler: Dugum[], px: number, agirlik: 600 | 700 = 700): Duzen {
  const d: Durum = { px, agirlik, x: 0, parcalar: [], susler: [], cubuklar: [], bekleyen: null, ust: BUYUK };
  yerlestir(d, dugumler);
  bosalt(d);
  return {
    parcalar: d.parcalar,
    susler: d.susler,
    cubuklar: d.cubuklar,
    genislik: d.x,
    ust: Math.max(d.ust, PARANTEZ_UST) * px,
    alt: PARANTEZ_ALT * px,
    cizgi: Math.max(0.9, px * 0.075),
  };
}

const f2 = (n: number) => Number(n.toFixed(2));

/** Süsün SVG yolu (satır koordinatlarında). */
export function susYolu(s: Sus): string {
  const xm = (s.x0 + s.x1) / 2;
  if (s.tur === 'yay') return `M${f2(s.x0)},${f2(s.y)} Q${f2(xm)},${f2(s.y - 2 * s.h)} ${f2(s.x1)},${f2(s.y)}`;
  if (s.tur === 'ucgen') return `M${f2(s.x0)},${f2(s.y)} L${f2(xm)},${f2(s.y - s.h)} L${f2(s.x1)},${f2(s.y)} Z`;
  return `M${f2(s.x0)},${f2(s.y)} L${f2(xm)},${f2(s.y - s.h)} L${f2(s.x1)},${f2(s.y)}`;
}

export interface KutuOlcusu {
  genislik: number;
  yukseklik: number;
  satirlar: { duzen: Duzen; taban: number }[];
}

export interface KutuSecenegi {
  agirlik?: 600 | 700;
  /** Yatay iç boşluk (px). Varsayılan 0,55 em */
  yatay?: number;
  dikey?: number;
  aralik?: number;
  minGenislik?: number;
  minYukseklik?: number;
}

/**
 * Bir ya da birkaç satırlık etiketin kutu ölçüsü. taban: satırın taban çizgisinin kutu MERKEZİNE göre y'si.
 * Kutu genişliği buradan gelir; `metin.length * 6.6 + 10` gibi tahminler kalkar.
 */
export function kutuOlcusu(satirlar: Dugum[][], px: number, o: KutuSecenegi = {}): KutuOlcusu {
  const yatay = o.yatay ?? 0.55 * px;
  const dikey = o.dikey ?? 0.2 * px;
  const aralik = o.aralik ?? 0.25 * px;
  const duzenler = satirlar.map((s) => duzenle(s, px, o.agirlik ?? 700));
  const icYukseklik = duzenler.reduce((t, d, i) => t + d.ust + d.alt + (i ? aralik : 0), 0);
  const yukseklik = Math.max(o.minYukseklik ?? 0, icYukseklik + 2 * dikey);
  const genislik = Math.max(o.minGenislik ?? 0, Math.max(0, ...duzenler.map((d) => d.genislik)) + 2 * yatay);
  let y = -icYukseklik / 2;
  const sonuc = duzenler.map((duzen, i) => {
    if (i) y += aralik;
    const taban = y + duzen.ust;
    y += duzen.ust + duzen.alt;
    return { duzen, taban };
  });
  return { genislik, yukseklik, satirlar: sonuc };
}

/** Kısa yazımdan tam yazıma dönerken istenen fazladan pay (titremeyi önler). */
export const HISTEREZIS = 1.15;

/**
 * Çizgiye paralel etiket, çizginin ekrandaki boyuna sığıyor mu? Sığmıyorsa çağıran KISA yazıma düşer
 * (yalnızca değer) ve tam yazımı ipucunda verir.
 *
 * `onceki` şu anki biçimdir: kısa yazımdayken tam yazıma dönmek 1,15 kat pay ister, böylece sürüklerken
 * etiket tam ile kısa arasında titremez.
 */
export function sigarMi(kutu: KutuOlcusu, cizgiBoyuPx: number, onceki: 'tam' | 'kisa' = 'tam', pay = 8): boolean {
  const gereken = kutu.genislik + pay;
  return (onceki === 'kisa' ? HISTEREZIS * gereken : gereken) <= cizgiBoyuPx;
}

// ------------------------------------------------------------------------------------------------ kutular

export interface Nokta { x: number; y: number }
export interface Kutu { x0: number; y0: number; x1: number; y1: number }

export const kutuMerkezli = (cx: number, cy: number, k: KutuOlcusu): Kutu =>
  ({ x0: cx - k.genislik / 2, y0: cy - k.yukseklik / 2, x1: cx + k.genislik / 2, y1: cy + k.yukseklik / 2 });

export const kutularCakisir = (a: Kutu, b: Kutu, pay = 4): boolean =>
  a.x0 - pay < b.x1 && b.x0 - pay < a.x1 && a.y0 - pay < b.y1 && b.y0 - pay < a.y1;

/** Liang–Barsky: [p, q] doğru parçası (pay kadar şişirilmiş) kutuyu kesiyor mu? */
export function kutuParcayiKesiyorMu(k: Kutu, p: Nokta, q: Nokta, pay = 2): boolean {
  const x0 = k.x0 - pay, x1 = k.x1 + pay, y0 = k.y0 - pay, y1 = k.y1 + pay;
  let t0 = 0, t1 = 1;
  const dx = q.x - p.x, dy = q.y - p.y;
  for (const [pk, qk] of [[-dx, p.x - x0], [dx, x1 - p.x], [-dy, p.y - y0], [dy, y1 - p.y]] as [number, number][]) {
    if (Math.abs(pk) < 1e-12) { if (qk < 0) return false; continue; }
    const r = qk / pk;
    if (pk < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t0 <= t1;
}

const kutuKoseleri = (k: Kutu): Nokta[] =>
  [{ x: k.x0, y: k.y0 }, { x: k.x1, y: k.y0 }, { x: k.x1, y: k.y1 }, { x: k.x0, y: k.y1 }];

// ------------------------------------------------------------------------------------------------ açı rozeti

/** Açı rozeti yerleşiminin girdisi — hepsi EKRAN birimiyle (y aşağı, açılar radyan). */
export interface RozetGirdisi {
  kose: Nokta;
  /** Kolların ekran açıları */
  kol1: number;
  kol2: number;
  /** Kolların ekranda görünen boyları (px) */
  boy1: number;
  boy2: number;
  /** Açıortayın ekran açısı */
  orta: number;
  /** Açının taraması (|sweep|, radyan) */
  tarama: number;
  /** Açı yayının yarıçapı (px) */
  yayR: number;
}

function kamaIcinde(g: RozetGirdisi, k: Kutu, pay: number): boolean {
  if (g.tarama >= Math.PI - 1e-9) return true; // doğru / dış açı: kutu zaten ileri yarı düzlemde
  const orta = { x: Math.cos(g.orta), y: Math.sin(g.orta) };
  for (const kol of [g.kol1, g.kol2]) {
    const n = { x: -Math.sin(kol), y: Math.cos(kol) };
    const s = n.x * orta.x + n.y * orta.y >= 0 ? 1 : -1;
    for (const c of kutuKoseleri(k)) if (s * (n.x * (c.x - g.kose.x) + n.y * (c.y - g.kose.y)) < pay) return false;
  }
  return true;
}

const koseyeUzaklik = (g: RozetGirdisi, k: Kutu): number => {
  const dx = Math.max(k.x0 - g.kose.x, g.kose.x - k.x1, 0);
  const dy = Math.max(k.y0 - g.kose.y, g.kose.y - k.y1, 0);
  return Math.hypot(dx, dy);
};

/**
 * Rozetin köşeden uzaklığı: açıortay üzerinde, yayı örtmeyen ve kollar arasında KALAN en yakın yer.
 * null = bu yazım bu açıya sığmıyor (çağıran kısa yazımı dener).
 */
export function rozetUzakligi(g: RozetGirdisi, kutu: KutuOlcusu, pay = 3): number | null {
  const e = (kutu.genislik / 2) * Math.abs(Math.cos(g.orta)) + (kutu.yukseklik / 2) * Math.abs(Math.sin(g.orta));
  const dMin = Math.max(40, g.yayR + 4 + e);
  const dMax = Math.max(dMin, Math.min(180, 0.95 * Math.min(g.boy1, g.boy2)));
  for (let d = dMin; d <= dMax + 0.01; d += 2) {
    const k = kutuMerkezli(g.kose.x + d * Math.cos(g.orta), g.kose.y + d * Math.sin(g.orta), kutu);
    if (koseyeUzaklik(g, k) < g.yayR + 3) continue;
    if (!kamaIcinde(g, k, pay)) continue;
    return Number(d.toFixed(1));
  }
  return null;
}

export interface RozetAdayi {
  girdi: RozetGirdisi;
  tam: KutuOlcusu;
  kisa: KutuOlcusu;
}
export interface RozetEngelleri {
  /** Rozetin kesmemesi gereken çizgiler (çokgenin kenarları, tek açıda [p1, p3]) */
  kenarlar?: [Nokta, Nokta][];
  /** Rozetin örtmemesi gereken kutular (çokgen ve çember ölçüm kartları) */
  kutular?: Kutu[];
}
export interface RozetYerlesimi {
  bicim: 'tam' | 'kisa';
  yerler: { d: number; kutu: Kutu }[];
}

/**
 * Bir çokgenin BÜTÜN açı rozetleri (ya da tek başına bir açı) birlikte yerleştirilir: tam yazım ancak
 * hepsi sığıyorsa, hiçbiri öbürüyle, kenarla ya da ölçüm kartıyla çakışmıyorsa seçilir. Aksi halde kısa
 * yazıma düşülür.
 *
 * HİSTEREZİS: tam yazımdayken 2 px, kısa yazımdan dönerken 3 px pay istenir. Pay yalnızca bir BANT
 * yaratır; kısa yazımı KİLİTLEMEZ. (Pay büyütmek rozeti açıortay boyunca dışarı iter: 6 px pay,
 * 250 px'lik eşkenar üçgende rozeti karşı kenara sokup tam yazıma dönüşü kalıcı olarak engelliyordu.)
 */
export function aciRozetiYerlesimi(
  grup: RozetAdayi[],
  engeller: RozetEngelleri = {},
  onceki: 'tam' | 'kisa' = 'tam',
): RozetYerlesimi {
  const yerAl = (girdi: RozetGirdisi, kutu: KutuOlcusu, d: number) =>
    ({ d, kutu: kutuMerkezli(girdi.kose.x + d * Math.cos(girdi.orta), girdi.kose.y + d * Math.sin(girdi.orta), kutu) });
  const dene = (bicim: 'tam' | 'kisa', pay: number) => {
    const yerler: { d: number; kutu: Kutu }[] = [];
    for (const { girdi, tam, kisa } of grup) {
      const kutu = bicim === 'tam' ? tam : kisa;
      const d = rozetUzakligi(girdi, kutu, pay);
      if (d === null) return null;
      yerler.push(yerAl(girdi, kutu, d));
    }
    const dolu = engeller.kutular ?? [];
    for (let i = 0; i < yerler.length; i++) {
      for (let j = i + 1; j < yerler.length; j++) if (kutularCakisir(yerler[i].kutu, yerler[j].kutu, pay + 1)) return null;
      for (const k of dolu) if (kutularCakisir(yerler[i].kutu, k, pay + 1)) return null;
      for (const [p, q] of engeller.kenarlar ?? []) if (kutuParcayiKesiyorMu(yerler[i].kutu, p, q, pay - 1)) return null;
    }
    return yerler;
  };
  const t = dene('tam', onceki === 'kisa' ? 3 : 2);
  if (t) return { bicim: 'tam', yerler: t };
  const k = dene('kisa', 3);
  if (k) return { bicim: 'kisa', yerler: k };
  // Son çare: kısa kutuyu en yakın uygun uzaklığa koy (bugünkü davranış).
  const son = grup.map(({ girdi, kisa }) => {
    const e = (kisa.genislik / 2) * Math.abs(Math.cos(girdi.orta)) + (kisa.yukseklik / 2) * Math.abs(Math.sin(girdi.orta));
    return yerAl(girdi, kisa, Math.max(40, girdi.yayR + 4 + e));
  });
  return { bicim: 'kisa', yerler: son };
}
