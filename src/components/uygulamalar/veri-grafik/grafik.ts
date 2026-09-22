/**
 * Veri ve Grafik — grafik geometrisi (saf, React'siz).
 * Nokta grafiği yığma, aralık genişliği, dağınık başlangıç konumları, doğrusal ölçek,
 * daire dilim açıları ve sınır sürükleme yeniden dağıtımı, sütun sürükleme yuvarlaması, Δ / % değişim.
 */
import { guzelAdim, temizle } from './istatistik';
import type { DegerNoktasi } from './veri';

export type { DegerNoktasi };

/** Seri renkleri (ada paleti): deniz, mercan, lavanta, altın, vurgu */
export const SERI_RENKLERI = ['#216a78', '#d9805f', '#7f88c4', '#b9884a', '#2a9d94'] as const;

export function seriRengi(indeks: number): string {
  return SERI_RENKLERI[((indeks % SERI_RENKLERI.length) + SERI_RENKLERI.length) % SERI_RENKLERI.length];
}

// ── Yığma (nokta grafiği) ─────────────────────────────────────────────────────

export interface YiginOgesi extends DegerNoktasi {
  /** yığın içindeki sıra (0 = en altta) */
  sira: number;
}

export interface Yigin {
  /** yığının oturduğu değer: gruplamasız çizimde değerin kendisi, gruplamada grubun ortası */
  merkez: number;
  baslangic: number;
  bitis: number;
  ogeler: YiginOgesi[];
}

/** Gruplamasız (tam değer) çizimde sayı doğrusunda en çok bu kadar farklı konum olur; fazlası gruplanır */
export const TAM_DEGER_SINIRI = 60;

const katMi = (deger: number, adim: number) => Math.abs(deger / adim - Math.round(deger / adim)) < 1e-6;

/**
 * Verinin çözünürlüğü: bütün değerleri tam gösteren en büyük "güzel" adım (…, 10, 5, 2, 1, 0,5, 0,25, 0,1, …).
 * Açıklıktan büyük olamaz (hepsi 0 olan veride 1). Hiçbiri tutmazsa (ör. 3,4667 gibi ortalamalar) null.
 */
export function veriCozunurlugu(degerler: number[]): number | null {
  if (degerler.length === 0) return 1;
  const acik = Math.max(...degerler) - Math.min(...degerler);
  const adaylar = [1000, 500, 250, 200, 100, 50, 25, 20, 10, 5, 2, 1, 0.5, 0.25, 0.2, 0.1, 0.05, 0.025, 0.02, 0.01];
  for (const s of adaylar) {
    if (s > Math.max(acik, 1)) continue;
    if (degerler.every((d) => katMi(d, s))) return s;
  }
  return null;
}

/** Bu aralık genişliği değerleri gruplar mı (çözünürlükten genişse ya da veri tam gösterilemiyorsa) */
export function gruplamaVar(degerler: number[], aralik: number): boolean {
  const r = veriCozunurlugu(degerler);
  return r === null || aralik > r + 1e-9;
}

/**
 * Varsayılan aralık genişliği: değerler sayı doğrusuna sığıyorsa gruplama yok (çözünürlük; her nokta tam
 * değerinde durur), sığmıyorsa ~12 grup veren ve çözünürlüğün katı olan güzel adım.
 */
export function varsayilanAralik(degerler: number[]): number {
  if (degerler.length === 0) return 1;
  const acik = Math.max(...degerler) - Math.min(...degerler);
  const r = veriCozunurlugu(degerler);
  if (r !== null && acik / r + 1 <= TAM_DEGER_SINIRI) return r;
  const g = acik > 0 ? guzelAdim(acik, 12) : guzelAdim(Math.max(Math.abs(degerler[0]), 1), 10);
  return r !== null ? temizle(Math.ceil(g / r - 1e-9) * r) : g;
}

/** Gruplama kaydırıcısı için seçenekler: en küçüğü çözünürlük (gruplama yok), sonra onun katı güzel genişlikler */
export function aralikSecenekleri(degerler: number[]): number[] {
  const temel = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  if (degerler.length === 0) return [1];
  const acik = Math.max(...degerler) - Math.min(...degerler);
  const r = veriCozunurlugu(degerler);
  const alt = r ?? acik / TAM_DEGER_SINIRI;
  const ust = Math.max(acik / 2, alt * 2);
  const adaylar = new Set<number>(temel);
  if (r !== null) for (const k of [2, 5, 10, 20, 50, 100]) adaylar.add(temizle(r * k));
  const secenekler = [...adaylar].filter((a) => a > alt - 1e-9 && a <= ust + 1e-9 && (r === null || katMi(a, r)));
  for (const zorunlu of [r, varsayilanAralik(degerler)]) {
    if (zorunlu !== null && !secenekler.some((a) => Math.abs(a - zorunlu) < 1e-9)) secenekler.push(zorunlu);
  }
  return secenekler.sort((a, b) => a - b);
}

/**
 * Noktaları yığınlara ayırır (satır sırası korunur). Gruplamasız çizimde her değer kendi konumunda durur
 * (aralık = çözünürlük, en yakın kat = değerin kendisi). Gruplamada kenarlar aralığın katlarıdır:
 * [12, 14), [14, 16) … — nokta grubun ortasında durur ve grafik grubun sınırlarını gösterir.
 */
export function yiginla(noktalar: DegerNoktasi[], aralik: number, gruplu = false): Yigin[] {
  const a = aralik > 0 && Number.isFinite(aralik) ? aralik : 1;
  const harita = new Map<number, Yigin>();
  for (const n of noktalar) {
    const k = gruplu ? Math.floor(temizle(n.deger / a) + 1e-9) : Math.round(n.deger / a);
    let y = harita.get(k);
    if (!y) {
      y = gruplu
        ? { merkez: temizle((k + 0.5) * a), baslangic: temizle(k * a), bitis: temizle((k + 1) * a), ogeler: [] }
        : { merkez: temizle(k * a), baslangic: temizle((k - 0.5) * a), bitis: temizle((k + 0.5) * a), ogeler: [] };
      harita.set(k, y);
    }
    y.ogeler.push({ ...n, sira: y.ogeler.length });
  }
  return [...harita.values()].sort((p, q) => p.merkez - q.merkez);
}

export function enYuksekYigin(yiginlar: Yigin[]): number {
  return yiginlar.reduce((m, y) => Math.max(m, y.ogeler.length), 0);
}

// ── Dağınık başlangıç konumları ───────────────────────────────────────────────

function karistir(metin: string): number {
  // FNV-1a benzeri küçük karma
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(tohum: number): () => number {
  let t = tohum >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Değişken atanmadan önce noktaların rastgele ama kararlı (anahtara bağlı) konumu; [0,1]² içinde kenar payıyla */
export function dagitikKonum(anahtar: string): { x: number; y: number } {
  const rnd = mulberry32(karistir(anahtar));
  const pay = 0.08;
  return { x: pay + rnd() * (1 - 2 * pay), y: pay + rnd() * (1 - 2 * pay) };
}

// ── Ölçek ─────────────────────────────────────────────────────────────────────

export interface DogrusalOlcek {
  ileri: (deger: number) => number;
  geri: (piksel: number) => number;
}

export function dogrusalOlcek(d0: number, d1: number, p0: number, p1: number): DogrusalOlcek {
  const dAralik = d1 - d0 === 0 ? 1 : d1 - d0;
  return {
    ileri: (v) => p0 + ((v - d0) / dAralik) * (p1 - p0),
    geri: (p) => (p1 - p0 === 0 ? d0 : d0 + ((p - p0) / (p1 - p0)) * dAralik),
  };
}

/** Sürüklenen değeri seçilen adıma yuvarlar (1 / 0,5 / 0,1) */
export function adimaYuvarla(deger: number, adim: number): number {
  if (!(adim > 0)) return deger;
  return temizle(Math.round(temizle(deger / adim)) * adim);
}

/** Yuvarlama adımına uygun ondalık basamak sayısı (1 → 0, 0,5 → 1, 0,1 → 1, 0,25 → 2) */
export function adimOndalik(adim: number): number {
  if (!(adim > 0) || Number.isInteger(adim)) return 0;
  const metin = temizle(adim).toString();
  const nokta = metin.indexOf('.');
  return nokta < 0 ? 0 : metin.length - nokta - 1;
}

/** Sütun tepesinin piksel konumundan yeni değer (sınırlandırılmış ve yuvarlanmış) */
export function surukleDegeri(pikselY: number, olcek: DogrusalOlcek, adim: number, min: number, max: number): number {
  const ham = olcek.geri(pikselY);
  const sinirli = Math.min(max, Math.max(min, ham));
  return adimaYuvarla(sinirli, adim);
}

// ── Çizgi grafiği ─────────────────────────────────────────────────────────────

export interface Degisim {
  fark: number;
  /** önceki değer 0 ise null */
  yuzde: number | null;
}

export function degisim(onceki: number, sonraki: number): Degisim {
  const fark = sonraki - onceki;
  return { fark, yuzde: onceki === 0 ? null : (fark / Math.abs(onceki)) * 100 };
}

// ── Daire grafiği ─────────────────────────────────────────────────────────────

export interface Dilim extends DegerNoktasi {
  /** derece; 0 = tepe (12 yönü), saat yönünde artar */
  baslangicAci: number;
  bitisAci: number;
  aci: number;
  yuzde: number;
}

/** Pozitif değerlerden dilimler; sıfır/negatif değer 0° dilim olur (lejantta kalır) */
export function daireDilimleri(noktalar: DegerNoktasi[]): Dilim[] {
  const toplam = noktalar.reduce((t, n) => t + (n.deger > 0 ? n.deger : 0), 0);
  let aci = 0;
  return noktalar.map((n) => {
    const pay = toplam > 0 && n.deger > 0 ? n.deger / toplam : 0;
    const dilimAci = pay * 360;
    const d: Dilim = { ...n, baslangicAci: aci, bitisAci: aci + dilimAci, aci: dilimAci, yuzde: pay * 100 };
    aci += dilimAci;
    return d;
  });
}

/** Kutupsal → kartezyen (0° tepe, saat yönü) */
export function kutupNoktasi(cx: number, cy: number, r: number, aciDerece: number): { x: number; y: number } {
  const rad = (aciDerece * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

/** İşaretçinin merkeze göre açısı (0° tepe, saat yönü, [0, 360)) */
export function isaretciAcisi(cx: number, cy: number, px: number, py: number): number {
  const derece = (Math.atan2(px - cx, cy - py) * 180) / Math.PI;
  return ((derece % 360) + 360) % 360;
}

/** SVG yay yolu (tam daire için iki yay) */
export function dilimYolu(cx: number, cy: number, r: number, baslangicAci: number, bitisAci: number): string {
  const aci = bitisAci - baslangicAci;
  if (aci <= 0) return '';
  if (aci >= 359.999) {
    const ust = kutupNoktasi(cx, cy, r, 0);
    const alt = kutupNoktasi(cx, cy, r, 180);
    return `M ${ust.x} ${ust.y} A ${r} ${r} 0 1 1 ${alt.x} ${alt.y} A ${r} ${r} 0 1 1 ${ust.x} ${ust.y} Z`;
  }
  const b = kutupNoktasi(cx, cy, r, baslangicAci);
  const s = kutupNoktasi(cx, cy, r, bitisAci);
  const buyukYay = aci > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${b.x} ${b.y} A ${r} ${r} 0 ${buyukYay} 1 ${s.x} ${s.y} Z`;
}

/**
 * Dilimin bitiş sınırı işaretçi açısına sürüklenince dilimin yeni değeri.
 * Dilim başlangıcından işaretçiye saat yönünde açı → toplamın o oranı.
 * Sınır dilimin başlangıcını geçince (açı 0'a çok yaklaşınca) değer 0'a, tam tura yaklaşınca toplama gider.
 */
export function sinirdanDeger(dilim: Dilim, isaretciAci: number, toplam: number): number {
  let aci = (((isaretciAci - dilim.baslangicAci) % 360) + 360) % 360;
  // Başlangıcın hemen "gerisine" geçildiğinde 359° yerine 0 kabul et (sıfıra sürükleme)
  if (aci > 350 && dilim.aci < 180) aci = 0;
  return (aci / 360) * toplam;
}

/**
 * i. dilimin değeri yeniDeger olur; toplam sabit kalacak biçimde diğerleri orantılı ölçeklenir.
 * Diğerlerinin toplamı 0 ise kalan eşit dağıtılır.
 */
export function dilimYenidenDagit(degerler: number[], indeks: number, yeniDeger: number): number[] {
  if (indeks < 0 || indeks >= degerler.length) return degerler;
  const pozitif = degerler.map((d) => (d > 0 ? d : 0));
  const toplam = pozitif.reduce((t, d) => t + d, 0);
  if (toplam <= 0) return degerler;
  const yeni = Math.min(toplam, Math.max(0, yeniDeger));
  const kalanEski = toplam - pozitif[indeks];
  const kalanYeni = toplam - yeni;
  const digerSayisi = degerler.length - 1;
  return pozitif.map((d, i) => {
    if (i === indeks) return temizle(yeni);
    if (kalanEski > 0) return temizle((d * kalanYeni) / kalanEski);
    return digerSayisi > 0 ? temizle(kalanYeni / digerSayisi) : 0;
  });
}

/**
 * i. dilimin bitiş sınırı işaretçi açısına sürüklenince yeni değer listesi (toplam sabit, diğerleri orantılı).
 * Doğrudan çözüm: öndeki dilimlerin toplamı S, sonrakilerin Q, diğerlerinin R = S + Q; hedef A = θ/360·T ise
 * yeni değer v = (A·R − S·T) / Q. Son dilimin sınırı tepede sabittir; onun için açı geriye doğru ölçülür
 * (v = (360 − θ)/360 · T), böylece öndeki dilimler tam işaretçide biter.
 */
export function sinirSurukle(degerler: number[], indeks: number, isaretciAci: number): number[] {
  const n = degerler.length;
  if (indeks < 0 || indeks >= n) return degerler;
  const pozitif = degerler.map((d) => (d > 0 ? d : 0));
  const toplam = pozitif.reduce((t, d) => t + d, 0);
  if (toplam <= 0) return degerler;
  const aci = ((isaretciAci % 360) + 360) % 360;
  const S = pozitif.slice(0, indeks).reduce((t, d) => t + d, 0);
  const Q = pozitif.slice(indeks + 1).reduce((t, d) => t + d, 0);
  let yeni: number;
  if (Q <= 0) {
    // Sonrasında dilim yok (ya da hepsi 0): bitiş sınırı tepede sabittir, açı geriye ölçülür
    yeni = aci === 0 ? pozitif[indeks] : ((360 - aci) / 360) * toplam;
  } else {
    const R = S + Q;
    const A = (aci / 360) * toplam;
    yeni = (A * R - S * toplam) / Q;
  }
  return dilimYenidenDagit(pozitif, indeks, Math.min(toplam, Math.max(0, yeni)));
}

// ── Frekans sütunları ─────────────────────────────────────────────────────────

export interface FrekansSutunu {
  merkez: number;
  frekans: number;
}

export function frekansSutunlari(yiginlar: Yigin[]): FrekansSutunu[] {
  return yiginlar.map((y) => ({ merkez: y.merkez, frekans: y.ogeler.length }));
}

/** Nokta yarıçapı: yığın genişliği ve en yüksek yığın dikey alana sığacak biçimde */
export function noktaYaricapi(yiginPiksel: number, dikeyAlan: number, enYuksek: number, enBuyuk = 11, enKucuk = 5): number {
  const yatay = yiginPiksel / 2 - 1;
  const dikey = enYuksek > 0 ? dikeyAlan / enYuksek / 2 - 0.5 : enBuyuk;
  return Math.max(enKucuk, Math.min(enBuyuk, yatay, dikey));
}

/**
 * Örnekleyici kutusunda top dizilimi (tuğla örgü): n top alanG × alanY alana alttan başlayarak dizilir,
 * tek numaralı sıralar yarım hücre kaydırılır. Sütun sayısı en iri topu verecek biçimde seçilir;
 * hücre hem yatayda hem dikeyde en az 2r + 2·bosluk olduğundan iki top asla üst üste binmez.
 * Konumlar alanın sol-üst köşesine göredir.
 */
export function topDizilimi(
  n: number,
  alanG: number,
  alanY: number,
  rMaks = 20,
  bosluk = 1.2,
): { r: number; sutun: number; satir: number; konumlar: { x: number; y: number }[] } {
  if (n <= 0) return { r: rMaks, sutun: 0, satir: 0, konumlar: [] };
  let enIyi = { r: -Infinity, sutun: 1, satir: n, hucreG: alanG, hucreY: alanY / n, kaydir: false };
  for (let sutun = 1; sutun <= n; sutun++) {
    const satir = Math.ceil(n / sutun);
    const kaydir = satir > 1;
    const hucreG = alanG / (sutun + (kaydir ? 0.5 : 0));
    const hucreY = alanY / satir;
    const r = Math.min(rMaks, Math.min(hucreG, hucreY) / 2 - bosluk);
    if (r > enIyi.r + 1e-9) enIyi = { r, sutun, satir, hucreG, hucreY, kaydir };
  }
  const { sutun, satir, hucreG, hucreY, kaydir } = enIyi;
  const r = Math.max(0.5, enIyi.r);
  const konumlar: { x: number; y: number }[] = [];
  // Dizi alanda yatay ortalanır (az topta kenara yapışmasın)
  const dizilimG = hucreG * (sutun + (kaydir ? 0.5 : 0));
  const solBosluk = (alanG - dizilimG) / 2;
  for (let i = 0; i < n; i++) {
    const sat = Math.floor(i / sutun);
    const sut = i % sutun;
    const buSatirda = Math.min(sutun, n - sat * sutun);
    // Son (eksik) sıra ortalanır
    const eksikKaydir = ((sutun - buSatirda) * hucreG) / 2;
    const x = solBosluk + (sut + 0.5) * hucreG + (kaydir && sat % 2 === 1 ? hucreG / 2 : 0) + eksikKaydir;
    const y = alanY - (sat + 0.5) * hucreY;
    konumlar.push({ x, y });
  }
  return { r, sutun, satir, konumlar };
}

/** Halka (annulus) dilimi: iç ve dış yarıçap arasında, açılar 0° tepe ve saat yönünde (tam tur için iki halka) */
export function halkaYolu(cx: number, cy: number, ic: number, dis: number, baslangicAci: number, bitisAci: number): string {
  const aci = bitisAci - baslangicAci;
  if (aci <= 0 || dis <= ic) return '';
  if (aci >= 359.999) {
    const d0 = kutupNoktasi(cx, cy, dis, 0);
    const d1 = kutupNoktasi(cx, cy, dis, 180);
    const i0 = kutupNoktasi(cx, cy, ic, 0);
    const i1 = kutupNoktasi(cx, cy, ic, 180);
    return (
      `M ${d0.x} ${d0.y} A ${dis} ${dis} 0 1 1 ${d1.x} ${d1.y} A ${dis} ${dis} 0 1 1 ${d0.x} ${d0.y} Z ` +
      `M ${i0.x} ${i0.y} A ${ic} ${ic} 0 1 0 ${i1.x} ${i1.y} A ${ic} ${ic} 0 1 0 ${i0.x} ${i0.y} Z`
    );
  }
  const buyukYay = aci > 180 ? 1 : 0;
  const d0 = kutupNoktasi(cx, cy, dis, baslangicAci);
  const d1 = kutupNoktasi(cx, cy, dis, bitisAci);
  const i1 = kutupNoktasi(cx, cy, ic, bitisAci);
  const i0 = kutupNoktasi(cx, cy, ic, baslangicAci);
  return `M ${d0.x} ${d0.y} A ${dis} ${dis} 0 ${buyukYay} 1 ${d1.x} ${d1.y} L ${i1.x} ${i1.y} A ${ic} ${ic} 0 ${buyukYay} 0 ${i0.x} ${i0.y} Z`;
}
