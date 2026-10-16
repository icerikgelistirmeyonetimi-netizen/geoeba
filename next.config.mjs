/**
 * GitHub Pages icin statik export yapilandirmasi.
 *
 * NEXT_PUBLIC_BASE_PATH: proje sayfalarinda '/repo-adi', kullanici kok
 * sitesinde ('<kullanici>.github.io') bos kalir. Actions is akisi bu degeri
 * otomatik doldurur; '/' gelirse kok site kabul edilir cunku Next basePath
 * olarak tek basina '/' degerini kabul etmez.
 */
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const basePath = rawBasePath === '/' ? '' : rawBasePath.replace(/\/$/, '');

/**
 * NEXT_PUBLIC_YAYIN_SURUMU: her yayinda degisen surum. Kazanim iceriklerinin
 * adreslerine ?v= olarak eklenir; Pages dosyalari 10 dk onbellege aldirdigi
 * icin tarayici aksi halde yayindan sonra eski sayfayi gosteriyordu. Actions'ta
 * commit karmasi (GITHUB_SHA her adimda hazir), yerelde derleme zamani.
 */
const yayinSurumu = (process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 12);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
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

export default nextConfig;
