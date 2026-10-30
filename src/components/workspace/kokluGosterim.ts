/**
 * ETİKETTE KÖKLÜ GÖSTERİM (sağ tık > "Köklü gösterimi aç", kullanıcı 2026-10-30: "köklü gösterim ise tercihe bağlı;
 * metin kutusuna sağ tıklandığında köklü gösterimi aç butonu olmalı menüde").
 *
 * Ortaokul ve lisede uzunluk etiketi varsayılan olarak 2 ondalıkla yazılır (≈ 3,61 br). İki ucu kılavuz noktasında olan
 * uzunluğun etiketi, sağ tık menüsünden kesin kareköklü biçime çevrilebilir (√13 br, 2√2 br). Tercih nesnenin
 * `kokluEtiketler` alanında etiket anahtarıyla (labelOffsets / labelTexts ile aynı) saklanır; proje dosyasına ve paylaşılan
 * çizime girer. İlkokulda uygulanmaz. Eşitlik çentikleri bu tercihten bağımsızdır (esitlikIsaretleri gerçek ölçüye bakar).
 */
import type { MathObject, PointObject } from '@/types/math';
import { KOK_EN_BUYUK_KARE, kilavuzKaresi, kokluBicim } from '@/math/kilavuz';

/** Köklü gösterimi olabilen etiket anahtarları: parça / doğru / ışın uzunluğu, çokgen kenarı, uzaklık ölçümü. */
export const KOKLU_ETIKET_ANAHTARI = /^(?:length|measure|edge\d+)$/;

/** Etiketin ölçtüğü uzunluğun uç noktaları; uzunluk etiketi değilse ya da uç eksikse null. */
export function kokluEtiketUclari(
  sahip: MathObject, kind: string, nokta: (id: string) => PointObject | undefined,
): [PointObject, PointObject] | null {
  let uclar: [string | undefined, string | undefined] | null = null;
  if (kind === 'length') {
    if (sahip.type === 'segment') uclar = [sahip.startPointId, sahip.endPointId];
    else if (sahip.type === 'line') uclar = [sahip.point1Id, sahip.point2Id];
    else if (sahip.type === 'ray') uclar = [sahip.startPointId, sahip.throughPointId];
  } else if (kind === 'measure') {
    if (sahip.type === 'measurement' && sahip.kind === 'distance') uclar = [sahip.pointIds?.[0], sahip.pointIds?.[1]];
  } else {
    const kenar = /^edge(\d+)$/.exec(kind);
    if (kenar && sahip.type === 'polygon' && Array.isArray(sahip.pointIds)) {
      const i = Number(kenar[1]);
      const n = sahip.pointIds.length;
      if (i < n) uclar = [sahip.pointIds[i], sahip.pointIds[(i + 1) % n]];
    }
  }
  const a = uclar?.[0] ? nokta(uclar[0]) : undefined;
  const b = uclar?.[1] ? nokta(uclar[1]) : undefined;
  return a && b ? [a, b] : null;
}

/**
 * Menüde "Köklü gösterimi aç / kapat" sunulur mu: iki uç da kılavuz noktasında ve uzunluk tam kare değil
 * (tam karede — 5 br — köklü biçim ondalıkla aynıdır).
 */
export function kokluGosterimSunulur(sahip: MathObject, kind: string, nokta: (id: string) => PointObject | undefined): boolean {
  const uclar = kokluEtiketUclari(sahip, kind, nokta);
  const kare = uclar ? kilavuzKaresi(uclar[0], uclar[1]) : undefined;
  return kare !== undefined && kare > 0 && kare <= KOK_EN_BUYUK_KARE && kokluBicim(kare).radikand > 1;
}

/** Bu etikette köklü gösterim açık mı? */
export const kokluGosterimAcik = (sahip: MathObject | undefined, kind: string): boolean =>
  !!sahip?.kokluEtiketler?.includes(kind);

/** Tercihi açar / kapatır (yeni dizi); hiç anahtar kalmazsa undefined (alan proje dosyasına yazılmaz). */
export function kokluEtiketleriGuncelle(mevcut: readonly string[] | undefined, kind: string, acik: boolean): string[] | undefined {
  const sonraki = (mevcut ?? []).filter((k) => k !== kind);
  if (acik) sonraki.push(kind);
  return sonraki.length ? sonraki : undefined;
}
