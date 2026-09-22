import type { MathObject } from '@/types/math';

/**
 * Tuvaldeki bir ölçüm etiketine (rozete) TIKLANINCA ne olacağı.
 *
 * - 'aciyiSil': açının derece rozeti açının KENDİSİDİR. Rozete tıklamak (hangi araç seçili olursa olsun)
 *   açıyı yayı ve rozetiyle birlikte TEK geçmiş adımında siler. Eskiden yalnızca rozet gizleniyor,
 *   turuncu yay ekranda sahipsiz kalıyordu ("açı silindiğinde açı çizgisi silinmeden kalıyor").
 *   Yalnızca değeri gizlemek isteyen kullanıcı sağ tık menüsündeki "Açı değerini gizle"yi kullanır.
 * - 'olcumuSil': Sil aracı seçiliyken bağımsız ölçüm nesnesinin (eğim, oranlar, |AP|) etiketine tıklamak
 *   o ölçüm nesnesini siler. Gizlemek, tuvalde sağ tıklanacak hiçbir parçası kalmayan bir nesne bırakıyordu.
 *   YAY ölçümünün ("BD yayı") rozeti ölçümün okunan parçasıdır: HER araçta tıklamak ölçümü (vurgulu yayıyla
 *   birlikte) tek geçmiş adımında siler; gizlemek çemberin üzerinde sahipsiz bir vurgu bırakırdı.
 * - 'gizle': şekle ait etiketler (uzunluk, alan, çevre, kenar, yarıçap, yay uzunluğu, kiriş, merkez açı)
 *   yalnızca gizlenir; şeklin kendisi yerinde kaldığı için geride sahipsiz bir işaret kalmaz.
 * - 'yok': gizlenemeyen etiketler (nokta adı): tıklama yalnızca taşımaya yarar.
 */
export type EtiketTiklamaEylemi = 'aciyiSil' | 'olcumuSil' | 'gizle' | 'yok';

export function etiketTiklamaEylemi(
  obj: MathObject | undefined,
  kind: string,
  activeTool: string,
  gizlenebilir = true
): EtiketTiklamaEylemi {
  if (!gizlenebilir) return 'yok';
  if (kind === 'angle' && obj?.type === 'angle') return 'aciyiSil';
  if (kind === 'measure' && obj?.type === 'measurement' && obj.kind === 'arc') return 'olcumuSil';
  if (activeTool === 'delete' && kind === 'measure' && obj?.type === 'measurement') return 'olcumuSil';
  return 'gizle';
}

/**
 * Sil aracında bu etikete basmak nesneyi silecekse etiket SÜRÜKLENMEMELİ:
 * rozet o anda bir silme düğmesidir, 3 px'lik titreme onu taşımaya çevirmesin.
 */
export function etiketSilAraciylaSilinirMi(
  obj: MathObject | undefined,
  kind: string,
  activeTool: string,
  gizlenebilir = true
): boolean {
  if (activeTool !== 'delete') return false;
  const eylem = etiketTiklamaEylemi(obj, kind, activeTool, gizlenebilir);
  return eylem === 'aciyiSil' || eylem === 'olcumuSil';
}

/** Rozetle silinen nesnenin Türkçe adı: "∠ABC açısı", "AB eğimi", "|AP|". */
function silinenAdi(obj: MathObject): string {
  const etiket = (obj.label ?? '').trim();
  if (obj.type === 'angle') {
    if (!etiket) return 'Açı';
    return /açısı$/i.test(etiket) ? etiket : `${etiket} açısı`;
  }
  return etiket || 'Ölçüm';
}

/** Rozetle silme sonrası gösterilen ipucu (geri alma yolunu da söyler). */
export function etiketSilindiIpucu(obj: MathObject): string {
  return `${silinenAdi(obj)} silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın.`;
}

/**
 * Dokunmatik uzun basış nesnenin sağ tık menüsünü açar (Canvas handleTouchStartOnObject zamanlayıcısı ya da
 * tarayıcının contextmenu olayı; ikisi de menuAcilisZamaniRef'i yazar). Parmak kalkınca
 * tarayıcı yine 'click' gönderirse açı, açılan menünün altında silinmesin: bu basış sırasında menü GERÇEKTEN
 * açıldıysa (menuAcilisZamani basıştan sonraysa) tıklama sayılmaz. Süre eşiği kullanılmaz; eşik menü
 * zamanlayıcısından kısa olunca arada kalan basış ne siliyor ne de menü açıyordu.
 */
export function uzunBasisMi(
  basis: { zaman: number; fare: boolean } | null,
  menuAcilisZamani: number | null
): boolean {
  return !!basis && !basis.fare && menuAcilisZamani !== null && menuAcilisZamani >= basis.zaman;
}
