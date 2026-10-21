/**
 * 3B cisim ve yüz renk paleti (tek kaynak). Toolbar3D'nin Bağlamlar sekmesi (cisim rengi, seçili yüzün rengi)
 * ve Canvas3D'nin yüz renklendirme çubuğu aynı listeden okur. Kopyalar (yansıma, öteleme) 2B'deki gibi mor.
 */
import { NESNE_RENGI, NESNE_RENKLERI } from '@/utils/nesneRenkleri';

export interface CisimRengi {
  hex: string;
  name: string;
}

export const CISIM_RENKLERI: readonly CisimRengi[] = NESNE_RENKLERI;

/** Yansıma ve öteleme kopyalarının rengi (2B dönüşüm kopyalarıyla aynı mor). */
export const KOPYA_RENGI = NESNE_RENGI.mor;

/** Paletteki rengin Türkçe adı; palet dışı renkler için null. */
export function cisimRenkAdi(hex: string): string | null {
  const aranan = hex.trim().toLowerCase();
  return CISIM_RENKLERI.find((r) => r.hex === aranan)?.name ?? null;
}
