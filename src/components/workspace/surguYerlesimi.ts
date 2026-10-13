import type { MathObject, Point2D, SliderObject, ViewportTransform } from '@/types/math';
import { getVisibleWorldBounds, screenToWorld, worldToScreen } from '@/math/coordinates';
import { tuvalEngelleri, type Dikdortgen } from './eksenSayilari';

/**
 * YENİ SÜRGÜNÜN TUVALDEKİ YERİ (alan uzmanı, atölye 4. tur, satır 159: "Sürgü ekleyince 'a' sürgüsü araç
 * çubuğunun altında sol üste yapışıyor; Kesir Göster aracının Pay/Payda çubuğu açıldığında sürgüyü tamamen
 * kapatıyor" → "Yeni sürgüyü tuvalde boş bir yere yerleştir ve araç çubuklarının altına gizlenmesini önle").
 *
 * Eskiden sürgü görünümün sol üstünden (genişliğin %6'sı, yüksekliğin %10'u) sırayla aşağı konuyordu: başlığı
 * tuvalin araç satırının (Seç, El, Geri al) altına, çubuğu üstteki yüzen çubuk şeridine (Kesir Göster, ipucu)
 * düşüyordu. Şimdi sürgünün ekran kutusu (başlık + çubuk + uç değerleri + dişli) şunlara değmeyen ilk yere konur:
 *   - tuvalin sabit düğmeleri (tuvalEngelleri) ve üstteki / alttaki yüzen çubuk şeritleri,
 *   - var olan sürgüler, noktalar (adlarıyla), yazılar, kesir modelleri ve görseller.
 * Adaylar soldan sağa sütunlar, her sütunda yukarıdan aşağı. Boş yer yoksa yalnız şeritlere değmeyen ilk aday,
 * o da yoksa eski yer.
 */

/** Üstteki yüzen çubuklar (KayanCubuk "ust": top-16 = 64 px, ~56 px yükseklik: Kesir Göster, ipucu, yansıtma). */
export const UST_SERIT = 124;
/** Alttaki yüzen çubuklar (KayanCubuk "alt": bottom-16, araç yönergesi) ve komut kutusunun üst kenarı. */
export const ALT_SERIT = 128;
const SOL_BOSLUK = 24;
const SATIR_ADIMI = 30;
/** Sürgü ile komşu nesneler arasındaki en az boşluk (px). */
const ARA = 6;

/** Sürgünün ekran kutusu: sol uç (sol) ve çubuk boyu (px). Canvas'taki çizimle aynı ölçüler. */
export function surguKutusu(sol: Point2D, uzunlukPx: number, baslikGenisligi = 60): Dikdortgen {
  return { x: sol.x - 12, y: sol.y - 34, w: Math.max(uzunlukPx, baslikGenisligi) + 12 + 46, h: 34 + 26 };
}

const kesisir = (a: Dikdortgen, b: Dikdortgen) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Sahnedeki nesnelerin ekran kutuları (sürgü bunların üstüne konmaz). */
export function surguEngelleri(objects: readonly MathObject[], vp: ViewportTransform): Dikdortgen[] {
  const kutular: Dikdortgen[] = [];
  for (const o of objects) {
    if (o.visible === false) continue;
    if (o.type === 'slider') {
      const s = o as SliderObject;
      if (s.x === undefined || s.y === undefined) continue;
      const sol = worldToScreen({ x: s.x, y: s.y }, vp);
      kutular.push(surguKutusu(sol, (s.length ?? 4) * vp.zoom));
    } else if (o.type === 'point') {
      const p = worldToScreen(o, vp);
      // Nokta ve sağ üstündeki adı
      kutular.push({ x: p.x - 12, y: p.y - 28, w: 46, h: 40 });
    } else if (o.type === 'text') {
      const p = worldToScreen(o, vp);
      const boy = o.fontSize || 14;
      const uzun = Math.max(...(o.text || '').split('\n').map((s) => s.length), 4);
      const satir = Math.max(1, (o.text || '').split('\n').length);
      kutular.push({ x: p.x - 6, y: p.y - boy * 1.4, w: uzun * boy * 0.6 + 12, h: satir * boy * 1.4 + 8 });
    } else if (o.type === 'fraction') {
      const p = worldToScreen(o, vp);
      const r = (o.radius ?? 1.5) * vp.zoom;
      kutular.push({ x: p.x - r - 8, y: p.y - r - 8, w: 2 * r + 16, h: 2 * r + 16 });
    } else if (o.type === 'image') {
      const p = worldToScreen(o, vp);
      const w = o.width * vp.zoom;
      const h = o.height * vp.zoom;
      kutular.push({ x: p.x - w / 2, y: p.y - h / 2, w, h });
    }
  }
  return kutular;
}

/** Eski yerleşim (tuval boyutu bilinmiyorsa): sol üstten, var olan sürgü sayısınca aşağı. */
function eskiYer(vp: ViewportTransform, sira: number): Point2D {
  const b = getVisibleWorldBounds(vp);
  const genislik = b.maxX - b.minX;
  const yukseklik = b.maxY - b.minY;
  return { x: Number((b.minX + genislik * 0.06).toFixed(2)), y: Number((b.maxY - yukseklik * (0.1 + sira * 0.07)).toFixed(2)) };
}

/**
 * `adet` yeni sürgü için dünya konumları (sol uç). `uzunluk`: sürgü boyu (dünya birimi).
 * Sonuçlar birbirine de değmez (sırayla yerleştirilir).
 */
export function yeniSurguYerleri(vp: ViewportTransform, objects: readonly MathObject[], uzunluk: number, adet = 1): Point2D[] {
  const W = vp.width;
  const H = vp.height;
  const mevcutSurgu = objects.filter((o) => o.type === 'slider').length;
  if (!(W > 0 && H > 0 && vp.zoom > 0)) return Array.from({ length: adet }, (_, i) => eskiYer(vp, mevcutSurgu + i));

  const uzPx = uzunluk * vp.zoom;
  const seritler: Dikdortgen[] = [
    ...tuvalEngelleri(W, H),
    { x: 0, y: 0, w: W, h: UST_SERIT },
    { x: 0, y: H - ALT_SERIT, w: W, h: ALT_SERIT },
  ];
  const dolu = surguEngelleri(objects, vp);
  const genislik = surguKutusu({ x: 0, y: 0 }, uzPx).w;
  const sutunlar: number[] = [];
  for (let x = SOL_BOSLUK; x + genislik - 12 <= W - 8; x += genislik + 16) sutunlar.push(x);
  const satirlar: number[] = [];
  for (let y = UST_SERIT + 34 + 4; y + 26 <= H - ALT_SERIT; y += SATIR_ADIMI) satirlar.push(y);

  const sonuc: Point2D[] = [];
  for (let n = 0; n < adet; n++) {
    let secilen: Point2D | null = null;
    let yedek: Point2D | null = null;
    for (const x of sutunlar) {
      for (const y of satirlar) {
        const kutu = surguKutusu({ x, y }, uzPx);
        if (seritler.some((s) => kesisir(kutu, s))) continue;
        yedek ??= { x, y };
        // Nesnelerle arasında birkaç piksel boşluk kalsın (yuvarlanan dünya konumu kenarları üst üste bindirmesin)
        const payli = { x: kutu.x - ARA, y: kutu.y - ARA, w: kutu.w + 2 * ARA, h: kutu.h + 2 * ARA };
        if (dolu.some((d) => kesisir(payli, d))) continue;
        secilen = { x, y };
        break;
      }
      if (secilen) break;
    }
    const ekran = secilen ?? yedek;
    if (!ekran) {
      sonuc.push(eskiYer(vp, mevcutSurgu + n));
      continue;
    }
    dolu.push(surguKutusu(ekran, uzPx));
    const w = screenToWorld(ekran, vp);
    sonuc.push({ x: Number(w.x.toFixed(2)), y: Number(w.y.toFixed(2)) });
  }
  return sonuc;
}

/** Görünüme göre sürgü boyu (dünya birimi): eskisi gibi görünür genişliğin %22'si, 2…6 birim. */
export function surguUzunlugu(vp: ViewportTransform): number {
  const b = getVisibleWorldBounds(vp);
  return Number(Math.max(2, Math.min(6, (b.maxX - b.minX) * 0.22)).toFixed(2));
}
