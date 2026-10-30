import type { PaylasimVarsayilanlari } from '@/math/cizimPaylasimi';
import { DEFAULT_ZOOM, VARSAYILAN_GORUNUM_AYARLARI } from '@/state/WorkspaceContext';
import { VARSAYILAN_KAMERA_3B } from './cisimYerlesimi';

/**
 * Alıcının çalışma alanı açılıştaki görünüm ve kamera: bunlara eşit alanlar paylaşım bağlantısına (ve çizimle güncellenen
 * adrese) yazılmaz, applyProjectMetadata aynı değerleri tamamlar. Dosya > Bağlantıyla paylaş ile adres eşitleyici ortak kullanır.
 */
export const PAYLASIM_VARSAYILANLARI: PaylasimVarsayilanlari = {
  gorunum: { zoom: DEFAULT_ZOOM, panX: 0, panY: 0, ...VARSAYILAN_GORUNUM_AYARLARI },
  kamera: VARSAYILAN_KAMERA_3B,
};
