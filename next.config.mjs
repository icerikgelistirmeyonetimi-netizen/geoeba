import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';

/**
 * Statik export yapilandirmasi (EBA CDN ve GitHub Pages).
 *
 * NEXT_PUBLIC_BASE_PATH: sitenin sunucudaki alt yolu. Verilmezse:
 * - `next build` (out/ klasoru): EBA CDN yolu '/icerik/eba-matematik'
 *   (https://cdn.eba.gov.tr/icerik/eba-matematik/). Onek olmadan derlenen site
 *   /_next, /images, /fonts dosyalarini alan adinin kokunde arar ve CDN'de bos acilir.
 * - `next dev`: kok; yerelde http://localhost:3000/ adresinde calisir.
 * GitHub Pages is akisi degeri kendisi verir: proje sayfalarinda '/repo-adi',
 * kullanici kok sitesinde ('<kullanici>.github.io') bos. '/' gelirse kok site
 * kabul edilir cunku Next basePath olarak tek basina '/' degerini kabul etmez.
 */
const EBA_CDN_YOLU = '/icerik/eba-matematik';

/**
 * NEXT_PUBLIC_YAYIN_SURUMU: her yayinda degisen surum. Kazanim iceriklerinin
 * adreslerine ?v= olarak eklenir; Pages dosyalari 10 dk onbellege aldirdigi
 * icin tarayici aksi halde yayindan sonra eski sayfayi gosteriyordu. Actions'ta
 * commit karmasi (GITHUB_SHA her adimda hazir), yerelde derleme zamani.
 */
const yayinSurumu = (process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 12);

/** @type {(phase: string) => import('next').NextConfig} */
export default function nextConfig(phase) {
  const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? (phase === PHASE_PRODUCTION_BUILD ? EBA_CDN_YOLU : '');
  const basePath = rawBasePath === '/' ? '' : rawBasePath.replace(/\/$/, '');
  return {
    output: 'export',
    basePath,
    // Sayfalar klasor/index.html olarak yazilir (out/fen-bilimleri/index.html). EBA CDN uzantisiz
    // adresi .html dosyasina eslemiyor: /fen-bilimleri klasore 301 ile yonlenir, klasorde index.html arar.
    trailingSlash: true,
    // next/image sunucu tarafli optimizasyon ister; statik export'ta kapatilir.
    images: { unoptimized: true },
    // public/ altindaki dosya yollari basePath ile otomatik prefixlenmez,
    // bu yuzden normalize edilmis degeri istemci tarafina aciyoruz.
    env: { NEXT_PUBLIC_ASSET_PREFIX: basePath, NEXT_PUBLIC_YAYIN_SURUMU: yayinSurumu },
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
  };
}
