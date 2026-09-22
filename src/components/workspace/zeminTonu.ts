/**
 * Tuvalin zemin renginin açık mı koyu mu olduğunu söyler.
 *
 * Koyu temada "Pastel Sarı" gibi açık bir zemin seçilince tuvaldeki yazılar ve ızgara koyu temanın
 * açık renklerini kullandığı için zeminde kayboluyordu (ya da tersi). Tuval kabı bu sonuca göre
 * `zemin-acik` ya da `dark` sınıfını alır; böylece içindeki her şey zemine uygun temayla çizilir.
 *
 * Döner: 'acik' | 'koyu' | null (özel zemin yok, saydam ya da okunamayan renk → uygulamanın teması geçerli)
 */
export function zeminTonu(renk: string | undefined | null): 'acik' | 'koyu' | null {
  const rgb = renkCoz(renk);
  if (!rgb) return null;
  const kanal = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * kanal(rgb[0]) + 0.7152 * kanal(rgb[1]) + 0.0722 * kanal(rgb[2]);
  // Fildişi yazı (L≈0,93) ile mürekkep yazı (L≈0,025) arasında karşıtlığın eşitlendiği nokta ≈ 0,18
  return L >= 0.18 ? 'acik' : 'koyu';
}

/** Koyu temanın tuval zemini (globals.css --background: 190 38% 10%) */
const KOYU_ZEMIN: [number, number, number] = [16, 32, 35];

/**
 * Temaya göre tuvalin gerçek zemin rengi.
 * - Açık tema: seçilen renk olduğu gibi.
 * - Koyu tema: seçilen AÇIK renk koyu zemine %16 karışan hafif bir tona dönüşür (koordinat sistemi
 *   koyu kalır, seçilen rengin izi korunur); beyaz / seçim yok → temanın koyu zemini (undefined);
 *   zaten koyu seçilmiş renk olduğu gibi kalır.
 */
export function temaZemini(renk: string | undefined | null, koyuTema: boolean): string | undefined {
  if (!koyuTema) return renk || undefined;
  const rgb = renkCoz(renk);
  if (!rgb) return undefined;
  if (zeminTonu(renk) === 'koyu') return renk || undefined;
  const [r, g, b] = rgb;
  if (r >= 245 && g >= 245 && b >= 245) return undefined; // beyaz: temanın kendi koyu zemini
  const karis = (i: number, c: number) => Math.round(KOYU_ZEMIN[i] + (c - KOYU_ZEMIN[i]) * 0.16);
  const hex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hex(karis(0, r))}${hex(karis(1, g))}${hex(karis(2, b))}`;
}

function renkCoz(renk: string | undefined | null): [number, number, number] | null {
  if (!renk) return null;
  const r = renk.trim().toLowerCase();
  if (!r || r === 'transparent' || r === 'none') return null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/.exec(r);
  if (hex) {
    if (hex[2] === '00') return null; // tamamen saydam
    const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const fn = /^rgba?\(\s*(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)[\s,]+(\d+(?:\.\d+)?)(?:[\s,/]+(\d*\.?\d+)(%?))?\s*\)$/.exec(r);
  if (fn) {
    if (fn[4] !== undefined && parseFloat(fn[4]) === 0) return null;
    return [Number(fn[1]), Number(fn[2]), Number(fn[3])].map((v) => Math.max(0, Math.min(255, v))) as [number, number, number];
  }
  if (r === 'white') return [255, 255, 255];
  if (r === 'black') return [0, 0, 0];
  return null;
}
