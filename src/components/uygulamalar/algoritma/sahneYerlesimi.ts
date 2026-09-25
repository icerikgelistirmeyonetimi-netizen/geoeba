/**
 * Sera sahnesinin saf yerleşim hesapları (three.js'e bağlı değil; vitest ile sınanır).
 *
 * Eksenler: +x sıra boyunca (robotun başlangıç yönü), +z kameraya doğru, +y yukarı.
 * Robot yolu z = YOL_Z, bitkiler z = BITKI_Z (robotun solunda kalır).
 */
export const HUCRE = 0.9;
export const YOL_Z = 0.42;
export const BITKI_Z = -0.52;
export const ARKA_DUVAR_Z = -1.55;

/** x hücresinin (0 başlangıç … n + 1 çıkış) dünya koordinatı; sıra ortalanır. */
export function hucreX(x: number, bitkiSayisi: number): number {
  return (x - (bitkiSayisi + 1) / 2) * HUCRE;
}

/** Yön (0 doğu, 1 güney, 2 batı, 3 kuzey) → robotun Y ekseni etrafındaki dönüşü (yerel +x ileri). */
export function yonAcisi(yon: number): number {
  return -yon * (Math.PI / 2);
}

/** a'dan b'ye en kısa açısal fark (radyan). */
export function aciFarki(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export interface KameraYerlesimi {
  konum: [number, number, number];
  hedef: [number, number, number];
  /** Robotu izleyen kamera mı (uzun sıralar) */
  izle: boolean;
}

/** Bütün sıranın sığdığı hücre sayısı eşiği; daha uzun sıralarda kamera robotu izler. */
export const TUMU_SIGAR = 10;
const IZLEME_HUCRESI = 8;

/**
 * Kamera yerleşimi. Genel görünüm: 3/4 bakış, sıranın tamamı sığar. Uzun sırada (> TUMU_SIGAR
 * hücre) yalnız IZLEME_HUCRESI kadar hücre sığar ve hedef robotun x'ine kayar. Üstten bakış:
 * neredeyse dik yukarıdan, sıranın tamamı.
 */
export function kameraYerlesimi(bitkiSayisi: number, en: number, boy: number, ustten: boolean, robotX = 0, dikeyAci = 30): KameraYerlesimi {
  const hucreSayisi = bitkiSayisi + 2;
  const oran = Math.max(0.6, en / Math.max(1, boy));
  const yarim = (dikeyAci * Math.PI) / 360;
  const yatayYarim = Math.atan(Math.tan(yarim) * oran);
  const izle = !ustten && hucreSayisi > TUMU_SIGAR;
  const gorunenGenislik = (izle ? IZLEME_HUCRESI : hucreSayisi) * HUCRE + 1.25;
  if (ustten) {
    const derinlik = 2.9;
    const uzaklik = Math.max((gorunenGenislik / 2) / Math.tan(yatayYarim), (derinlik / 2) / Math.tan(yarim), 4.5);
    return { konum: [0, uzaklik, 0.35], hedef: [0, 0, -0.12], izle: false };
  }
  // 44° eğim: saksılardaki toprak (kuru / nemli) ve domatesler yukarıdan açıkça görünür; geniş
  // sıralarda derinlik ekranı dikeyde de doldurur
  const egim = (44 * Math.PI) / 180;
  const uzaklik = Math.max((gorunenGenislik / 2) / Math.tan(yatayYarim), 1.4 / Math.tan(yarim), 4.8);
  const hx = izle ? sinirla(robotX, hucreX(0, bitkiSayisi) + (IZLEME_HUCRESI * HUCRE) / 2 - HUCRE / 2, hucreX(bitkiSayisi + 1, bitkiSayisi) - (IZLEME_HUCRESI * HUCRE) / 2 + HUCRE / 2) : 0;
  const hedef: [number, number, number] = [hx, 0.28, -0.02];
  return {
    konum: [hx, hedef[1] + uzaklik * Math.sin(egim), hedef[2] + uzaklik * Math.cos(egim)],
    hedef,
    izle,
  };
}

function sinirla(v: number, a: number, b: number): number {
  if (a > b) return (a + b) / 2;
  return Math.min(b, Math.max(a, v));
}

/** Kolay-çıkış ve yumuşak geçiş eğrileri */
export function kolayCikis(t: number): number {
  const u = 1 - Math.min(1, Math.max(0, t));
  return 1 - u * u * u;
}
export function yumusak(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}
export function hizlanYavasla(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

/** Parabolik yay: a'dan b'ye, tepe yüksekliği h (t 0…1). */
export function yay(a: [number, number, number], b: [number, number, number], h: number, t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 4 * h * t * (1 - t), a[2] + (b[2] - a[2]) * t];
}

// ---------------------------------------------------------------------------
// Bahçe (ızgara) yerleşimi: hücre (x, y) → dünya (X, Z); y güneye (kameraya) doğru artar
// ---------------------------------------------------------------------------
export const BAHCE_HUCRE = 1.3;
/** Bitki / hedef çiçeği hücrenin kuzeydoğu köşesinde durur (robot hücrenin ortasında) */
export const BAHCE_KOSE = 0.34;

export function bahceHucre(x: number, y: number, en: number, boy: number): [number, number] {
  return [(x - (en - 1) / 2) * BAHCE_HUCRE, (y - (boy - 1) / 2) * BAHCE_HUCRE];
}

/** Bahçe kamerası: 52° eğimle bütün ızgara sığar; üstten bakışta neredeyse dik. yukseklik: inşaatta kuleler ve dron. */
export function bahceKamerasi(en: number, boy: number, w: number, h: number, ustten: boolean, dikeyAci = 30, yukseklik = 0, egimDerece = 52): KameraYerlesimi {
  const oran = Math.max(0.6, w / Math.max(1, h));
  const yarim = (dikeyAci * Math.PI) / 360;
  const yatayYarim = Math.atan(Math.tan(yarim) * oran);
  const genislik = en * BAHCE_HUCRE + 1.9;
  // Alttaki ileti ve üstteki göstergeler için dikeyde pay
  const derinlik = boy * BAHCE_HUCRE + 1.9 + 0.9;
  if (ustten) {
    const uzaklik = Math.max(genislik / 2 / Math.tan(yatayYarim), derinlik / 2 / Math.tan(yarim), 4.5);
    return { konum: [0, uzaklik, 0.3], hedef: [0, 0, 0], izle: false };
  }
  const egim = (egimDerece * Math.PI) / 180;
  const dikey = derinlik * Math.sin(egim) + (1.1 + yukseklik) * Math.cos(egim);
  const uzaklik = Math.max(genislik / 2 / Math.tan(yatayYarim), dikey / 2 / Math.tan(yarim), 5);
  const hedef: [number, number, number] = [0, 0.25 + yukseklik * 0.42, 0.55];
  return { konum: [0, hedef[1] + uzaklik * Math.sin(egim), hedef[2] + uzaklik * Math.cos(egim)], hedef, izle: false };
}
