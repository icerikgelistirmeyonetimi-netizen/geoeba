/**
 * Madeni para görünümü: gerçek 1 Türk lirası gibi (alan uzmanı, 5. tur: «madeni para yapılırsa gerçek parayla aynı
 * olmalı»). 3B doku (deneySahnesi.ts), 2B yedek görünüm (MadeniPara2B.tsx) ve şablon simgesi aynı ölçü ve renkleri
 * kullanır.
 *
 * - İki metal: dışta altın sarısı halka (nikel-pirinç), ortada gümüş gri göbek (bakır-nikel); kenarda tırtık.
 * - Yazı yüzü = değer yüzü: göbekte «1», altında «LİRA».
 * - Tura yüzü: halkada «TÜRKİYE CUMHURİYETİ» ve yıl, göbekte kabartma gibi sade bir profil silüeti (portre değil:
 *   yüz çizgisi, saç, göz yok; yalnız baş-boyun-omuz dış hattı).
 *
 * Saf modül: DOM'a dokunmaz; çizim verilen 2B bağlama yapılır (testte sahte bağlamla sınanır).
 */
import type { ParaYuzu } from './olasilik';

export const PARA_YAZILARI = {
  ulke: 'TÜRKİYE CUMHURİYETİ',
  yil: '2024',
  deger: '1',
  birim: 'LİRA',
} as const;

/** Göbek yarıçapı / para yarıçapı (1 TL'de iç göbek çapın ~%62'si). */
export const PARA_GOBEK_ORANI = 0.62;

/** Halka yazılarının (ülke adı, yıl) ortalandığı yarıçap / para yarıçapı. */
export const PARA_HALKA_YAZI_ORANI = 0.79;

/** Kenardaki tırtık sayısı. */
export const PARA_TIRTIK_SAYISI = 120;

export const PARA_RENKLERI = {
  halka: { acik: '#f6e2a0', orta: '#d8b45e', koyu: '#9b752a', murekkep: '#6a4c14' },
  gobek: { acik: '#f5f6f7', orta: '#c7cbcf', koyu: '#8d9399', murekkep: '#4f555c' },
} as const;

type Egri = [number, number, number, number, number, number];

/**
 * Profil silüeti (baş, boyun, omuz; yüz sola bakar). Göbek yarıçapı 100 birim, merkez (0, 0), y aşağı.
 * Kübik Bézier eğrileri: [c1x, c1y, c2x, c2y, x, y].
 */
export const PROFIL_SILUETI: { bas: [number, number]; egriler: readonly Egri[] } = {
  bas: [62, 86],
  egriler: [
    [60, 70, 46, 60, 32, 54], // sırt / omuz → ense
    [25, 50, 21, 40, 24, 30], // ense
    [44, 8, 50, -40, 16, -62], // başın arkası
    [-6, -76, -34, -70, -42, -50], // tepe → alın
    [-45, -42, -46, -32, -46, -26], // alın
    [-47, -22, -50, -19, -52, -16], // kaş
    [-54, -12, -58, -4, -62, 2], // burun
    [-63, 4, -61, 7, -55, 7], // burun ucu
    [-54, 9, -55, 11, -54, 13], // üst dudak
    [-56, 15, -55, 18, -52, 19],
    [-54, 21, -53, 24, -51, 26], // alt dudak
    [-52, 30, -51, 35, -44, 38], // çene
    [-38, 40, -32, 42, -30, 47], // çene altı
    [-28, 55, -31, 61, -39, 67], // boyun önü
    [-50, 73, -60, 78, -62, 86], // göğüs
  ],
};

/** Silüetin göbek içinde kapladığı oran (göbek yarıçapına göre ölçek) ve merkez kayması. */
export const PROFIL_OLCEGI = 0.8;

function yuvarla(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** Silüetin SVG yolu: göbek yarıçapı `r` olan, (cx, cy) merkezli para göbeğine yerleşmiş. */
export function profilSvgYolu(r: number, cx = 0, cy = 0): string {
  const k = (r * PROFIL_OLCEGI) / 100;
  const x = (v: number) => yuvarla(cx + v * k);
  const y = (v: number) => yuvarla(cy + v * k);
  const [bx, by] = PROFIL_SILUETI.bas;
  let d = `M${x(bx)} ${y(by)}`;
  for (const [a, b, c, e, f, g] of PROFIL_SILUETI.egriler) d += ` C${x(a)} ${y(b)} ${x(c)} ${y(e)} ${x(f)} ${y(g)}`;
  return `${d} Z`;
}

/** 2B bağlamın bu modülde kullanılan alt kümesi (testte sahte bağlam). */
export type Cizim2B = Pick<
  CanvasRenderingContext2D,
  | 'save'
  | 'restore'
  | 'translate'
  | 'rotate'
  | 'beginPath'
  | 'closePath'
  | 'moveTo'
  | 'lineTo'
  | 'bezierCurveTo'
  | 'arc'
  | 'fill'
  | 'stroke'
  | 'clip'
  | 'fillRect'
  | 'fillText'
  | 'measureText'
  | 'createRadialGradient'
> & {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
};

function profilYolu(ctx: Cizim2B, r: number, cx: number, cy: number): void {
  const k = (r * PROFIL_OLCEGI) / 100;
  const [bx, by] = PROFIL_SILUETI.bas;
  ctx.beginPath();
  ctx.moveTo(cx + bx * k, cy + by * k);
  for (const [a, b, c, e, f, g] of PROFIL_SILUETI.egriler) ctx.bezierCurveTo(cx + a * k, cy + b * k, cx + c * k, cy + e * k, cx + f * k, cy + g * k);
  ctx.closePath();
}

function daire(ctx: Cizim2B, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

function yildiz(ctx: Cizim2B, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function harfGenisligi(ctx: Cizim2B, ch: string, boyut: number): number {
  const w = (ctx.measureText(ch) as TextMetrics | undefined)?.width;
  return typeof w === 'number' && Number.isFinite(w) && w > 0 ? w : boyut * (ch === ' ' ? 0.32 : 0.66);
}

/**
 * Yay boyunca yazı (harf harf). ust: saat 12 yönünde, harflerin altı merkeze bakar; değilse saat 6 yönünde, harfler dik
 * okunur (üstleri merkeze bakar). Her iki durumda soldan sağa okunur.
 */
export function yayYazisi(ctx: Cizim2B, metin: string, cx: number, cy: number, yaricap: number, ust: boolean, boyut: number): void {
  const harfler = [...metin];
  const aralik = boyut * 0.06;
  const genislikler = harfler.map((h) => harfGenisligi(ctx, h, boyut));
  const toplam = genislikler.reduce((t, w) => t + w, 0) + aralik * (harfler.length - 1);
  const merkez = ust ? -Math.PI / 2 : Math.PI / 2;
  const yon = ust ? 1 : -1;
  let a = merkez - (yon * toplam) / yaricap / 2;
  harfler.forEach((h, i) => {
    const w = genislikler[i];
    const orta = a + (yon * w) / 2 / yaricap;
    ctx.save();
    ctx.translate(cx + Math.cos(orta) * yaricap, cy + Math.sin(orta) * yaricap);
    ctx.rotate(ust ? orta + Math.PI / 2 : orta - Math.PI / 2);
    ctx.fillText(h, 0, 0);
    ctx.restore();
    a += (yon * (w + aralik)) / yaricap;
  });
}

/** Kabartma gibi çiz: önce gölge (sağ alta), sonra ışık (sol üste), en son gövde. */
function kabartma(ctx: Cizim2B, kip: 'renk' | 'yukseklik', derinlik: number, govde: string, golge: string, isik: string, ciz: () => void): void {
  if (kip === 'yukseklik') {
    ctx.fillStyle = govde;
    ciz();
    return;
  }
  ctx.save();
  ctx.translate(derinlik, derinlik);
  ctx.fillStyle = golge;
  ciz();
  ctx.restore();
  ctx.save();
  ctx.translate(-derinlik * 0.6, -derinlik * 0.6);
  ctx.fillStyle = isik;
  ciz();
  ctx.restore();
  ctx.fillStyle = govde;
  ciz();
}

/**
 * Para yüzünü kare tuvale (s × s) çizer. kip 'renk' → renk dokusu; 'yukseklik' → kabartma (bump) dokusu: açık = yüksek.
 * Tuvalin üstü yazıların üstüdür (3B'de doku döndürülerek kameradan düz okunur).
 */
export function paraYuzunuCiz(ctx: Cizim2B, s: number, yuz: ParaYuzu, kip: 'renk' | 'yukseklik' = 'renk'): void {
  const H = PARA_RENKLERI.halka;
  const G = PARA_RENKLERI.gobek;
  const renk = kip === 'renk';
  const m = s / 2;
  const R = m * 0.985;
  const r = R * PARA_GOBEK_ORANI;

  // Halka (köşeler silindir kapağında görünmez; aynı renkle doldurulur)
  ctx.fillStyle = renk ? H.orta : '#5c5c5c';
  ctx.fillRect(0, 0, s, s);
  if (renk) {
    const g = ctx.createRadialGradient(m * 0.62, m * 0.55, R * 0.05, m, m, R);
    g.addColorStop(0, H.acik);
    g.addColorStop(0.55, H.orta);
    g.addColorStop(1, H.koyu);
    ctx.fillStyle = g;
    daire(ctx, m, m, R);
    ctx.fill();
  }
  // Kenar çıkıntısı (dış pervaz) ve iç kenarındaki ince oluk
  ctx.strokeStyle = renk ? 'rgba(255, 244, 205, 0.45)' : '#e6e6e6';
  ctx.lineWidth = R * 0.07;
  daire(ctx, m, m, R * 0.955);
  ctx.stroke();
  ctx.strokeStyle = renk ? 'rgba(92, 64, 14, 0.6)' : '#262626';
  ctx.lineWidth = R * 0.012;
  daire(ctx, m, m, R * 0.915);
  ctx.stroke();

  // Göbek (gümüş gri) ve iki metalin birleşme çizgisi
  if (renk) {
    const g = ctx.createRadialGradient(m - r * 0.35, m - r * 0.4, r * 0.05, m, m, r);
    g.addColorStop(0, G.acik);
    g.addColorStop(0.6, G.orta);
    g.addColorStop(1, G.koyu);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = '#585858';
  }
  daire(ctx, m, m, r);
  ctx.fill();
  ctx.strokeStyle = renk ? 'rgba(58, 44, 18, 0.65)' : '#1c1c1c';
  ctx.lineWidth = R * 0.016;
  daire(ctx, m, m, r);
  ctx.stroke();
  if (renk) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = R * 0.008;
    daire(ctx, m, m, r * 0.968);
    ctx.stroke();
  }

  const derinlik = R * 0.012;
  const halkaYazi = renk ? H.murekkep : '#d8d8d8';
  const halkaGolge = 'rgba(70, 48, 8, 0.55)';
  const halkaIsik = 'rgba(255, 246, 214, 0.75)';
  const gobekYazi = renk ? '#7a8189' : '#d0d0d0';
  const gobekGolge = 'rgba(30, 34, 40, 0.65)';
  const gobekIsik = 'rgba(255, 255, 255, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (yuz === 'tura') {
    // Halkada ülke adı (üstte) ve yıl (altta); aralarında iki yıldız
    const boyut = R * 0.13;
    const ry = R * PARA_HALKA_YAZI_ORANI;
    ctx.font = `800 ${Math.round(boyut)}px Manrope, system-ui, sans-serif`;
    kabartma(ctx, kip, derinlik, halkaYazi, halkaGolge, halkaIsik, () => yayYazisi(ctx, PARA_YAZILARI.ulke, m, m, ry, true, boyut));
    kabartma(ctx, kip, derinlik, halkaYazi, halkaGolge, halkaIsik, () => yayYazisi(ctx, PARA_YAZILARI.yil, m, m, ry, false, boyut));
    for (const x of [m - ry, m + ry]) {
      kabartma(ctx, kip, derinlik, halkaYazi, halkaGolge, halkaIsik, () => {
        yildiz(ctx, x, m, R * 0.045);
        ctx.fill();
      });
    }
    // Göbekte kabartma profil silüeti (göbeğin içinde kalır)
    ctx.save();
    daire(ctx, m, m, r * 0.97);
    ctx.clip();
    kabartma(ctx, kip, derinlik * 1.8, renk ? '#8f969d' : '#d4d4d4', gobekGolge, gobekIsik, () => {
      profilYolu(ctx, r, m + r * 0.04, m + r * 0.02);
      ctx.fill();
    });
    ctx.restore();
  } else {
    // Göbekte değer: «1» ve altında «LİRA»
    ctx.font = `800 ${Math.round(r * 1.02)}px Manrope, system-ui, sans-serif`;
    kabartma(ctx, kip, derinlik * 1.4, gobekYazi, gobekGolge, gobekIsik, () => ctx.fillText(PARA_YAZILARI.deger, m, m - r * 0.12));
    ctx.font = `800 ${Math.round(r * 0.27)}px Manrope, system-ui, sans-serif`;
    kabartma(ctx, kip, derinlik, gobekYazi, gobekGolge, gobekIsik, () => ctx.fillText(PARA_YAZILARI.birim, m, m + r * 0.62));
    // Halkada süs: kabartma noktalar dizisi
    const ry = R * PARA_HALKA_YAZI_ORANI;
    const nokta = R * 0.022;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      kabartma(ctx, kip, derinlik * 0.7, halkaYazi, halkaGolge, halkaIsik, () => {
        daire(ctx, m + Math.cos(a) * ry, m + Math.sin(a) * ry, nokta);
        ctx.fill();
      });
    }
  }
}

/** Para kenarı (silindir yanı): altın sarısı zemin üzerinde dikey tırtıklar. Tuvalin yatayı kenarın çevresidir. */
export function paraKenariniCiz(ctx: Cizim2B, s: number, kip: 'renk' | 'yukseklik' = 'renk'): void {
  const H = PARA_RENKLERI.halka;
  const renk = kip === 'renk';
  ctx.fillStyle = renk ? H.orta : '#808080';
  ctx.fillRect(0, 0, s, s);
  const w = s / PARA_TIRTIK_SAYISI;
  for (let i = 0; i < PARA_TIRTIK_SAYISI; i++) {
    ctx.fillStyle = renk ? H.koyu : '#202020';
    ctx.fillRect(i * w, 0, w * 0.42, s);
    ctx.fillStyle = renk ? H.acik : '#f0f0f0';
    ctx.fillRect(i * w + w * 0.5, 0, w * 0.3, s);
  }
}
