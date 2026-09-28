/**
 * Manrope ve Fraunces projeden yüklenir: küçük "a" harfi tek katlı olacak biçimde düzenlenmiş kesimler
 * (public/fonts/README.md; üretim: scripts/yazi-tipi-tek-katli-a.py). Aile adları değişmedi, bu yüzden
 * CSS modülleri ve tuval yazı dizgileri ('Manrope', 'Fraunces') olduğu gibi çalışır.
 *
 * @font-face kuralları CSS dosyasında değil burada üretilir: public/ dosyaları basePath ile kendiliğinden
 * öneklenmez (next.config.mjs) ve Next'in geliştirme sunucusu global CSS'teki yerel url() yollarını
 * bozuk (webpack:///… önekli) üretiyor. Kurallar kök düzende <style> olarak basılır (layout.tsx).
 */
const VARLIK_ONEKI = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '';

export const YAZI_TIPI_KESIMLERI = [
  { aile: 'Manrope', agirlik: 500, dosya: 'manrope-geoeba-500.woff2' },
  { aile: 'Manrope', agirlik: 600, dosya: 'manrope-geoeba-600.woff2' },
  { aile: 'Manrope', agirlik: 700, dosya: 'manrope-geoeba-700.woff2' },
  { aile: 'Manrope', agirlik: 800, dosya: 'manrope-geoeba-800.woff2' },
  { aile: 'Fraunces', agirlik: 500, dosya: 'fraunces-geoeba-500.woff2' },
  { aile: 'Fraunces', agirlik: 600, dosya: 'fraunces-geoeba-600.woff2' },
] as const;

/** Kesimlerin @font-face kuralları; dosya yolları varlık önekiyle (GitHub Pages proje sitesi) başlar. */
export function yaziTipiKurallari(onek: string = VARLIK_ONEKI): string {
  return YAZI_TIPI_KESIMLERI.map(
    (k) =>
      `@font-face{font-family:'${k.aile}';font-style:normal;font-weight:${k.agirlik};font-display:swap;` +
      `src:url('${onek}/fonts/${k.dosya}') format('woff2')}`,
  ).join('\n');
}
