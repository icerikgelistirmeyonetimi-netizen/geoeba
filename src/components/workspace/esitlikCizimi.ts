/**
 * Eşitlik çentiklerinin ekran geometrisi (saf; Canvas yalnızca buradan dönen `d` yolunu çizer).
 *
 * Düz öğe: orta noktada, öğeye DİK, aralarında ARALIK px olan k kısa çizgi.
 * Yay: yayın orta açısında, yarıçap doğrultusunda (yayı dik kesen) k kısa çizgi.
 * Çentik yarı boyu çizilen çizgi kalınlığının yarısı + 5 px'tir: kalın çizgide (strokeScale 3, "kalın" parça) de
 * çizginin iki yanından 5 px taşar, görünmez olmaz. Çentik kalınlığı ise sınırlıdır (sw() kullanılmaz).
 */
import type { ViewportTransform } from '@/types/math';
import { worldToScreen } from '@/math/coordinates';
import type { EsitlikIsareti } from '@/math/esitlikIsaretleri';

/** Çentik merkezleri arası uzaklık (px) */
export const ARALIK = 4;
/** Çentik çizilebilecek en kısa öğe (ekranda, px) */
export const EN_KISA = 24;
/** Çentik çizilebilecek en küçük yay yarıçapı (px) */
export const EN_KUCUK_YARICAP = 10;
/** Çentiğin çizginin iki yanından taşma payı (px) */
export const TASMA = 5;
const YARI_EN_COK = 12;

/** Çentik çizgi kalınlığı (px): 1,6–2,4 arasında; çizgi ölçeğiyle sınırlı büyür. */
export function centikKalinligi(cizgiOlcegi: number): number {
  const k = 1.8 * (Number.isFinite(cizgiOlcegi) && cizgiOlcegi > 0 ? cizgiOlcegi : 1);
  return Math.min(2.4, Math.max(1.6, k));
}

/** Çentiğin yarı boyu (px): çizilen çizgi kalınlığının yarısı + TASMA (en çok 12). */
export function centikYariBoyu(tabanKalinlik: number, cizgiOlcegi: number): number {
  const olcek = Number.isFinite(cizgiOlcegi) && cizgiOlcegi > 0 ? cizgiOlcegi : 1;
  const w = (Number.isFinite(tabanKalinlik) && tabanKalinlik > 0 ? tabanKalinlik : 2) * olcek;
  return Math.min(YARI_EN_COK, w / 2 + TASMA);
}

/**
 * Çentiğin çizgiden en uzak ucu (px) kutusunun yakın kenarına `yakinKenar` px uzaklıkta duran bir ölçü etiketinin
 * dışarı itilmesi gereken ek pay (px). Çentik yarı boyu + kalınlığın yarısı + 1,5 px boşluk.
 */
export function etiketPayi(tabanKalinlik: number, cizgiOlcegi: number, yakinKenar: number): number {
  const uzanim = centikYariBoyu(tabanKalinlik, cizgiOlcegi) + centikKalinligi(cizgiOlcegi) / 2 + 1.5;
  return Math.max(0, Math.round((uzanim - yakinKenar) * 10) / 10);
}

const f = (n: number) => n.toFixed(2);

type CentikOgesi = Pick<EsitlikIsareti, 'tur' | 'sayi' | 'kalinlik' | 'a' | 'b' | 'merkez' | 'yaricap' | 'baslangic' | 'tarama'>;

/** Çentiği örtebilecek ekran engelleri: noktalar (yarıçaplı) ve eksen çizgileri (x = eksenX dikey, y = eksenY yatay). */
export interface CentikEngelleri {
  noktalar: { x: number; y: number; r: number }[];
  eksenX?: number;
  eksenY?: number;
}

/**
 * Çentik öbeğinin öğe boyunca kaydırılması (px). Orta noktada bir nokta duruyorsa (orta nokta, parça üzerindeki nokta)
 * ya da çentik bir eksen çizgisinin üstüne boylu boyunca düşüyorsa (y ekseninde ortalanmış yatay kenar) çentik
 * görünmez olur; öbek en yakın boş yere kaydırılır. Boşsa ya da yer yoksa 0.
 */
export function centikKaydirmasi(m: CentikOgesi, viewport: ViewportTransform, cizgiOlcegi: number, engeller: CentikEngelleri): number {
  const k = Math.max(1, Math.min(4, Math.round(m.sayi)));
  const yari = centikYariBoyu(m.kalinlik, cizgiOlcegi);
  const gw = ((k - 1) / 2) * ARALIK + centikKalinligi(cizgiOlcegi) / 2;
  // Öğe boyunca o px ötedeki öbeğin merkezi (c), öğe yönü (d) ve çentik yönü (n)
  let yer: ((o: number) => { cx: number; cy: number; dx: number; dy: number; nx: number; ny: number }) | null = null;
  let enCok = 0;
  if (m.tur === 'duz') {
    if (!m.a || !m.b) return 0;
    const s1 = worldToScreen(m.a, viewport), s2 = worldToScreen(m.b, viewport);
    const L = Math.hypot(s2.x - s1.x, s2.y - s1.y);
    if (!(L > 0)) return 0;
    const dx = (s2.x - s1.x) / L, dy = (s2.y - s1.y) / L;
    const mx = (s1.x + s2.x) / 2, my = (s1.y + s2.y) / 2;
    yer = (o) => ({ cx: mx + dx * o, cy: my + dy * o, dx, dy, nx: -dy, ny: dx });
    enCok = L / 2 - gw - 6;
  } else {
    if (!m.merkez || m.yaricap === undefined || m.baslangic === undefined || m.tarama === undefined) return 0;
    const cS = worldToScreen(m.merkez, viewport);
    const rPx = m.yaricap * viewport.zoom;
    if (!(rPx > 0)) return 0;
    const orta = m.baslangic + m.tarama / 2;
    yer = (o) => {
      const t = orta + o / rPx;
      const c = Math.cos(t), s = Math.sin(t);
      return { cx: cS.x + rPx * c, cy: cS.y - rPx * s, nx: c, ny: -s, dx: -s, dy: -c };
    };
    enCok = (rPx * m.tarama) / 2 - gw - 6;
  }
  const carpar = (o: number) => {
    const { cx, cy, dx, dy, nx, ny } = yer!(o);
    for (const p of engeller.noktalar) {
      const ux = p.x - cx, uy = p.y - cy;
      if (Math.abs(ux * dx + uy * dy) <= gw + p.r && Math.abs(ux * nx + uy * ny) <= yari + p.r) return true;
    }
    // Eksen çentiğe PARALEL ve öbeğin üstünden geçiyorsa (dik kesişme görünür kalır, sorun değil)
    // (eksen 2,5 px kalın: çentik ondan en az ~3 px açıkta dursun)
    if (engeller.eksenX !== undefined && Math.abs(nx) < 0.2 && Math.abs(cx - engeller.eksenX) <= gw + 4) return true;
    if (engeller.eksenY !== undefined && Math.abs(ny) < 0.2 && Math.abs(cy - engeller.eksenY) <= gw + 4) return true;
    return false;
  };
  if (!carpar(0)) return 0;
  for (let o = 2; o <= enCok; o += 2) {
    if (!carpar(o)) return o;
    if (!carpar(-o)) return -o;
  }
  return 0;
}

/** Çentik öbeğinin SVG yolu; öğe ekranda çok kısaysa / yay çok küçükse null. `kaydirma`: öğe boyunca px (centikKaydirmasi). */
export function centikYolu(m: CentikOgesi, viewport: ViewportTransform, cizgiOlcegi: number, kaydirma = 0): string | null {
  const k = Math.max(1, Math.min(4, Math.round(m.sayi)));
  const yari = centikYariBoyu(m.kalinlik, cizgiOlcegi);
  const gerekli = Math.max(EN_KISA, (k - 1) * ARALIK + 16);
  const parcalar: string[] = [];
  if (m.tur === 'duz') {
    if (!m.a || !m.b) return null;
    const s1 = worldToScreen(m.a, viewport), s2 = worldToScreen(m.b, viewport);
    const L = Math.hypot(s2.x - s1.x, s2.y - s1.y);
    if (!(L >= gerekli)) return null;
    const dx = (s2.x - s1.x) / L, dy = (s2.y - s1.y) / L;
    const nx = -dy, ny = dx;
    const mx = (s1.x + s2.x) / 2 + dx * kaydirma, my = (s1.y + s2.y) / 2 + dy * kaydirma;
    for (let j = 0; j < k; j++) {
      const o = (j - (k - 1) / 2) * ARALIK;
      const cx = mx + dx * o, cy = my + dy * o;
      parcalar.push(`M${f(cx + nx * yari)} ${f(cy + ny * yari)}L${f(cx - nx * yari)} ${f(cy - ny * yari)}`);
    }
    return parcalar.join('');
  }
  if (!m.merkez || m.yaricap === undefined || m.baslangic === undefined || m.tarama === undefined) return null;
  const cS = worldToScreen(m.merkez, viewport);
  const rPx = m.yaricap * viewport.zoom;
  if (!(rPx >= EN_KUCUK_YARICAP) || !(rPx * m.tarama >= gerekli)) return null;
  const orta = m.baslangic + m.tarama / 2 + kaydirma / rPx;
  const ic = Math.max(0, rPx - yari), dis = rPx + yari;
  for (let j = 0; j < k; j++) {
    // Ekranda y aşağı: yay katmanındaki pt() ile aynı dönüşüm (cS.y − ρ·sin θ)
    const t = orta + ((j - (k - 1) / 2) * ARALIK) / rPx;
    const c = Math.cos(t), s = Math.sin(t);
    parcalar.push(`M${f(cS.x + ic * c)} ${f(cS.y - ic * s)}L${f(cS.x + dis * c)} ${f(cS.y - dis * s)}`);
  }
  return parcalar.join('');
}
