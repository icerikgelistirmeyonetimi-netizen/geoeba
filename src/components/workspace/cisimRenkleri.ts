/**
 * 3B cisim ve yüz renk paleti (tek kaynak). Toolbar3D'nin Bağlamlar sekmesi (cisim rengi, seçili yüzün rengi)
 * ve Canvas3D'nin yüz renklendirme çubuğu aynı listeden okur. Kopyalar (yansıma, öteleme) 2B'deki gibi mor.
 */
export interface CisimRengi {
  hex: string;
  name: string;
}

export const CISIM_RENKLERI: readonly CisimRengi[] = [
  { hex: '#3b82f6', name: 'Mavi' },
  { hex: '#8b5cf6', name: 'Mor' },
  { hex: '#ec4899', name: 'Pembe' },
  { hex: '#10b981', name: 'Zümrüt' },
  { hex: '#f59e0b', name: 'Kehribar' },
  { hex: '#06b6d4', name: 'Camgöbeği' },
  { hex: '#6366f1', name: 'İndigo' },
  { hex: '#ef4444', name: 'Kırmızı' },
];

/** Yansıma ve öteleme kopyalarının rengi (2B dönüşüm kopyalarıyla aynı mor). */
export const KOPYA_RENGI = '#9333ea';

/** Paletteki rengin Türkçe adı; palet dışı renkler için null. */
export function cisimRenkAdi(hex: string): string | null {
  const aranan = hex.trim().toLowerCase();
  return CISIM_RENKLERI.find((r) => r.hex === aranan)?.name ?? null;
}
