/** Bütün koordinatlar ekran pikselidir; yakınlaştırma bu eşiği değiştirmez. */
export const ETIKET_HIZALAMA_ESIGI = 6;

export interface EtiketHizalamaKutusu {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** Hedefin metin genişliği değişse de sabit kalan yatay çapası; taşınan kutuda dikkate alınmaz. */
  horizontalAlignment?: 'left' | 'center' | 'right';
}

export type YatayEtiketHizalamasi = 'left' | 'center' | 'right';
export type DikeyEtiketHizalamasi = 'top' | 'center' | 'bottom';

export interface EtiketHizalamaSonucu {
  delta: { x: number; y: number };
  xKilavuzu: { x: number; y1: number; y2: number; hedefId: string; hizalama: YatayEtiketHizalamasi } | null;
  yKilavuzu: { y: number; x1: number; x2: number; hedefId: string; hizalama: DikeyEtiketHizalamasi } | null;
  yatayHizalama: YatayEtiketHizalamasi | null;
}

interface Aday<T extends string> {
  duzeltme: number;
  konum: number;
  hizalama: T;
  sira: number;
  hedef: EtiketHizalamaKutusu;
  dikBosluk: number;
  dikMerkezUzakligi: number;
}

const kutuGecerli = (k: EtiketHizalamaKutusu) =>
  [k.left, k.right, k.top, k.bottom].every(Number.isFinite);

const kutuyuSirala = (k: EtiketHizalamaKutusu): EtiketHizalamaKutusu => ({
  id: k.id,
  left: Math.min(k.left, k.right),
  right: Math.max(k.left, k.right),
  top: Math.min(k.top, k.bottom),
  bottom: Math.max(k.top, k.bottom),
  horizontalAlignment: k.horizontalAlignment,
});

/** En küçük düzeltme; eşitlikte yakın satır/sütun, sonra kenar sırası ve kalıcı kimlik. */
function dahaIyi<T extends string>(aday: Aday<T>, onceki: Aday<T> | null): boolean {
  if (!onceki) return true;
  for (const fark of [
    Math.abs(aday.duzeltme) - Math.abs(onceki.duzeltme),
    aday.dikBosluk - onceki.dikBosluk,
    aday.dikMerkezUzakligi - onceki.dikMerkezUzakligi,
    aday.sira - onceki.sira,
  ]) {
    if (Math.abs(fark) > 1e-9) return fark < 0;
  }
  return aday.hedef.id < onceki.hedef.id;
}

/**
 * Sürüklenen kutunun ham ekran konumuna uygulanacak düzeltmeyi ve kılavuzları verir.
 * X ekseninde sol-sola / orta-ortaya / sağ-sağa, Y ekseninde üst-üste / orta-ortaya /
 * alt-alta hizalar. Eksenler bağımsız seçilir; kılavuz uçları iki düzeltmeyi de içerir.
 * `id` her ölçüm etiketine özgü olmalıdır; aynı kimlikteki kutu hedef alınmaz.
 */
export function etiketHizalama(
  tasinan: EtiketHizalamaKutusu,
  digerleri: readonly EtiketHizalamaKutusu[],
  esik: number = ETIKET_HIZALAMA_ESIGI,
): EtiketHizalamaSonucu {
  let x: Aday<YatayEtiketHizalamasi> | null = null;
  let y: Aday<DikeyEtiketHizalamasi> | null = null;
  const k = kutuyuSirala(tasinan);
  const tolerans = Number.isFinite(esik) ? Math.max(0, esik) : ETIKET_HIZALAMA_ESIGI;
  const xKonumlari = [k.left, (k.left + k.right) / 2, k.right];
  const yKonumlari = [k.top, (k.top + k.bottom) / 2, k.bottom];
  const xTurleri: YatayEtiketHizalamasi[] = ['left', 'center', 'right'];
  const yTurleri: DikeyEtiketHizalamasi[] = ['top', 'center', 'bottom'];

  if (kutuGecerli(k)) for (const diger of digerleri) {
    if (diger.id === tasinan.id || !kutuGecerli(diger)) continue;
    const hedef = kutuyuSirala(diger);
    const hedefX = [hedef.left, (hedef.left + hedef.right) / 2, hedef.right];
    const hedefY = [hedef.top, (hedef.top + hedef.bottom) / 2, hedef.bottom];
    for (let i = 0; i < 3; i++) {
      const dx = hedefX[i] - xKonumlari[i];
      if (Math.abs(dx) <= tolerans && (!hedef.horizontalAlignment || hedef.horizontalAlignment === xTurleri[i])) {
        const aday: Aday<YatayEtiketHizalamasi> = {
          duzeltme: dx, konum: hedefX[i], hizalama: xTurleri[i], sira: i, hedef,
          dikBosluk: Math.max(0, hedef.top - k.bottom, k.top - hedef.bottom),
          dikMerkezUzakligi: Math.abs(hedefY[1] - yKonumlari[1]),
        };
        if (dahaIyi(aday, x)) x = aday;
      }
      const dy = hedefY[i] - yKonumlari[i];
      if (Math.abs(dy) <= tolerans) {
        const aday: Aday<DikeyEtiketHizalamasi> = {
          duzeltme: dy, konum: hedefY[i], hizalama: yTurleri[i], sira: i, hedef,
          dikBosluk: Math.max(0, hedef.left - k.right, k.left - hedef.right),
          dikMerkezUzakligi: Math.abs(hedefX[1] - xKonumlari[1]),
        };
        if (dahaIyi(aday, y)) y = aday;
      }
    }
  }

  const delta = { x: x?.duzeltme ?? 0, y: y?.duzeltme ?? 0 };
  return {
    delta,
    xKilavuzu: x ? {
      x: x.konum,
      y1: Math.min(k.top + delta.y, x.hedef.top),
      y2: Math.max(k.bottom + delta.y, x.hedef.bottom),
      hedefId: x.hedef.id,
      hizalama: x.hizalama,
    } : null,
    yKilavuzu: y ? {
      y: y.konum,
      x1: Math.min(k.left + delta.x, y.hedef.left),
      x2: Math.max(k.right + delta.x, y.hedef.right),
      hedefId: y.hedef.id,
      hizalama: y.hizalama,
    } : null,
    yatayHizalama: x?.hizalama ?? null,
  };
}
