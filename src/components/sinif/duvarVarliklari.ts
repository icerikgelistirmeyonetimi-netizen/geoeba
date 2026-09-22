/**
 * Masaüstünün EBA logolu duvar kâğıdı varlıkları ve açılış sırasında önceden yüklenmeleri.
 *
 * Logo kaynak zinciri: public/sinif/duvar-eba kopyası → asıl marka varlığı (public/images/eba) → satır içi
 * kopya (data: URI; dosyanın BİREBİR aynısı, testte karşılaştırılır). Böylece iki dosya da yüklenmezse
 * logo yine görünür. Açılış ekranı (AcilisEkrani) duvar varlıklarını önceden indirip çözer: açılıştan
 * masaüstüne geçişte logo bir kare bile kaybolmaz.
 */

const VARLIK_ONEKI = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '';

/** public/images/eba/eba-karakter-koyu-zemin.svg (değiştirilmeden) */
export const KARAKTER_KOYU_ZEMIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220"><title>EBA tasiyici tip / karakter - koyu zemin icin</title><defs><clipPath id="ebaIc"><circle cx="110" cy="110" r="41.08"/></clipPath></defs><rect x="0" y="0" width="220" height="220" rx="36.85" ry="36.85" fill="#FFFFFF"/><g fill="none" stroke="#231F20" stroke-width="15.27" stroke-linecap="round"><path d="M30.62 110H61.29"/><path d="M158.71 110H189.38"/></g><circle cx="110" cy="110" r="48.71" fill="none" stroke="#231F20" stroke-width="15.26"/><g clip-path="url(#ebaIc)"><circle cx="110" cy="110" r="41.08" fill="#FFFFFF"/><circle cx="110" cy="110" r="13.95" fill="#231F20"/></g></svg>`;

/** public/images/eba/eba-yazi-beyaz.svg (değiştirilmeden) */
export const YAZI_BEYAZ_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 479.07 101.33" width="479.07" height="101.33"><title>EBA yazi markasi - beyaz</title><path fill="#FFFFFF" fill-rule="evenodd" d="M478.601 18.423C476.77 9.398 469.663 2.296 460.639 0.465C459.149 0.16 457.606 0 456.026 0L354.699 0C353.119 0 351.576 0.16 350.086 0.465C341.062 2.296 333.96 9.398 332.129 18.423C331.824 19.913 331.664 21.456 331.664 23.036L331.664 101.335L350.086 101.335L350.086 73.699L460.639 73.699L460.639 101.335L479.066 101.335L479.066 23.036C479.066 21.456 478.906 19.913 478.601 18.423M350.086 55.273L350.086 29.941C350.086 23.579 355.246 18.423 361.608 18.423L449.121 18.423C455.483 18.423 460.639 23.579 460.639 29.941L460.639 55.273L350.086 55.273M18.427 29.941L18.427 41.462L36.867 41.462L128.976 41.458L128.976 59.881L30.242 59.881C30.143 59.873 30.044 59.873 29.945 59.873C29.847 59.873 29.748 59.873 29.649 59.881L18.427 59.881L18.427 71.395C18.427 77.757 23.583 82.913 29.945 82.913L147.403 82.913L147.403 101.335L23.036 101.335C21.456 101.335 19.917 101.175 18.427 100.875C9.403 99.044 2.297 91.937 0.466 82.913C0.161 81.423 0 79.88 0 78.3L0 23.036C0 21.456 0.161 19.913 0.466 18.423C2.297 9.398 9.403 2.292 18.427 0.461C19.917 0.16 21.456 0 23.036 0L147.403 0L147.403 18.423L29.945 18.423C23.583 18.423 18.427 23.579 18.427 29.941M313.236 36.85L313.236 23.036C313.236 21.456 313.076 19.913 312.772 18.423C310.94 9.398 303.834 2.292 294.806 0.461C293.32 0.156 291.777 0 290.201 0L165.826 0L165.826 101.335L290.201 101.335C291.777 101.335 293.32 101.179 294.806 100.875C303.834 99.044 310.94 91.937 312.772 82.913C313.076 81.423 313.236 79.88 313.236 78.3L313.236 64.486C313.236 62.91 313.076 61.367 312.776 59.881C312.084 56.478 310.644 53.347 308.636 50.668C310.644 47.989 312.084 44.858 312.776 41.454C313.076 39.969 313.236 38.426 313.236 36.85M283.432 82.913C283.382 82.917 283.333 82.917 283.284 82.917C283.234 82.917 283.185 82.917 283.136 82.913L184.253 82.913L184.253 59.881L283.136 59.881C283.185 59.877 283.234 59.877 283.284 59.877C283.333 59.877 283.382 59.877 283.432 59.881C289.728 59.959 294.806 65.082 294.806 71.395C294.806 77.707 289.728 82.834 283.432 82.913M283.58 41.454C283.481 41.462 283.382 41.462 283.284 41.462C283.185 41.462 283.086 41.462 282.987 41.454L184.253 41.454L184.253 18.423L283.284 18.423C289.646 18.423 294.806 23.579 294.806 29.941C294.806 36.204 289.806 41.302 283.58 41.454"/></svg>`;

const satirIci = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

export const DUVAR_HALKALARI = `${VARLIK_ONEKI}/sinif/duvar-eba/goz-halkalari.svg`;

export const DUVAR_LOGOSU = {
  karakter: [
    `${VARLIK_ONEKI}/sinif/duvar-eba/eba-karakter-koyu-zemin.svg`,
    `${VARLIK_ONEKI}/images/eba/eba-karakter-koyu-zemin.svg`,
    satirIci(KARAKTER_KOYU_ZEMIN_SVG),
  ],
  yazi: [
    `${VARLIK_ONEKI}/sinif/duvar-eba/eba-yazi-beyaz.svg`,
    `${VARLIK_ONEKI}/images/eba/eba-yazi-beyaz.svg`,
    satirIci(YAZI_BEYAZ_SVG),
  ],
} as const;

/** Yedek zincirinde hata sonrası sıradaki kaynak; zincir bittiyse null */
export function sonrakiKaynakSirasi(sira: number, kaynakSayisi: number): number | null {
  return sira + 1 < kaynakSayisi ? sira + 1 : null;
}

/** Önceden yüklenen görseller modül ömrü boyunca tutulur (çözülmüş kopya bellekte kalsın) */
const onYuklenenler: HTMLImageElement[] = [];

/** Duvar kâğıdının halkalarını ve logosunu (ilk kaynaklar) indirip çözer; bir kez çalışır, SSR'da hiçbir şey yapmaz */
export function duvarVarliklariniOnYukle(): void {
  if (typeof window === 'undefined' || typeof Image === 'undefined' || onYuklenenler.length > 0) return;
  for (const src of [DUVAR_LOGOSU.karakter[0], DUVAR_LOGOSU.yazi[0], DUVAR_HALKALARI]) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    onYuklenenler.push(img);
    if (typeof img.decode === 'function') img.decode().catch(() => undefined);
  }
}
