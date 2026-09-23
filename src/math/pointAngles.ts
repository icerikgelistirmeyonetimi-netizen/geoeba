import type { AngleObject, ArcObject, MathObject, PointObject, SectorObject } from '@/types/math';
import { calculateAngleDegrees } from './geometry';

/**
 * Bir noktada AÇI KURAN komşu noktalar (tekrarsız, sırası korunur).
 *
 * Komşuluk yalnızca kenarlardan gelir:
 *  - noktayı uç/tanım noktası olarak kullanan doğru parçası, doğru ve ışın,
 *  - noktanın köşesi olduğu çokgenin iki komşu köşesi.
 * Çember/elips merkezi olmak ya da çemberin yarıçap noktası olmak kenar DEĞİLDİR;
 * bu yüzden düz bir çemberin merkezinde açı yoktur.
 *
 * Sıra measureAngleAtPoint'in eski davranışıyla aynıdır: önce parça/doğru/ışın komşuları
 * (nesne sırasıyla), sonra çokgen komşuları. Sahnede bulunmayan (sarkık) kimlikler sayılmaz.
 */
export function angleNeighbourIds(pointId: string, objects: readonly MathObject[]): string[] {
  const komsular: string[] = [];
  for (const o of objects) {
    let a: string | undefined;
    let b: string | undefined;
    if (o.type === 'segment') {
      a = o.startPointId;
      b = o.endPointId;
    } else if (o.type === 'line') {
      a = o.point1Id;
      b = o.point2Id;
    } else if (o.type === 'ray') {
      a = o.startPointId;
      b = o.throughPointId;
    }
    if (a === pointId && b) komsular.push(b);
    else if (b === pointId && a) komsular.push(a);
  }
  for (const o of objects) {
    if (o.type !== 'polygon') continue;
    const ids = o.pointIds;
    const i = ids.indexOf(pointId);
    if (i === -1) continue;
    komsular.push(ids[(i - 1 + ids.length) % ids.length]);
    komsular.push(ids[(i + 1) % ids.length]);
  }
  const noktalar = new Set(objects.filter((o) => o.type === 'point').map((o) => o.id));
  return [...new Set(komsular)].filter((id) => id !== pointId && noktalar.has(id));
}

/**
 * Şekil, köşesi `vertexId` olan bir açının `vertexId -> pointId` KOLUNU çiziyor mu?
 *
 * Kenar anlamı angleNeighbourIds ile aynıdır: iki ucu bu iki nokta olan doğru parçası,
 * tanım noktaları bu ikisi olan doğru, birinden başlayıp ötekinden geçen ışın (iki yön de)
 * ya da bu iki noktayı KOMŞU köşe olarak taşıyan çokgen (son köşeden ilke dönen kenar dâhil).
 * Çokgenin köşegeni kenar değildir. Silme zinciri bunu kullanır: kolu silinen açı,
 * kolu artık hiçbir şekil çizmiyorsa ekranda boşlukta asılı kalmasın diye birlikte gider.
 */
export function providesAngleArm(o: MathObject, vertexId: string, pointId: string): boolean {
  if (!vertexId || !pointId || vertexId === pointId) return false;
  const cift = (a?: string, b?: string) =>
    (a === vertexId && b === pointId) || (a === pointId && b === vertexId);
  if (o.type === 'segment') return cift(o.startPointId, o.endPointId);
  if (o.type === 'line') return cift(o.point1Id, o.point2Id);
  if (o.type === 'ray') return cift(o.startPointId, o.throughPointId);
  if (o.type === 'polygon') {
    const ids = o.pointIds;
    const n = ids.length;
    return n >= 2 && ids.some((id, i) => cift(id, ids[(i + 1) % n]));
  }
  return false;
}

export type PointAngleAction =
  /**
   * Nokta yay/dilim merkezi: "Açısını ölç" bu şekillerin merkez açılarını BİRLİKTE açıp kapatır
   * (ikiye bölünmüş çemberin merkezinde iki yay vardır; yalnız birini değiştirmek menüyle ekranı ayrıştırıyordu).
   */
  | { kind: 'central'; shape: ArcObject | SectorObject; shapes: (ArcObject | SectorObject)[] }
  /** Noktada en az iki farklı kenar buluşuyor: ilk iki komşu ile açı kurulur. */
  | { kind: 'vertex'; neighbourIds: [string, string] };

/**
 * Noktanın sağ tık menüsünde "Açısını ölç" sunulmalı mı, sunulursa ne yapmalı?
 * null → noktada ölçülecek açı yok (yalnız nokta, düz çember merkezi, yarıçap noktası…).
 * Menü ve measureAngleAtPoint AYNI kararı bu fonksiyondan alır.
 */
export function pointAngleAction(pointId: string, objects: readonly MathObject[]): PointAngleAction | null {
  const shapes = objects.filter(
    (o): o is ArcObject | SectorObject => (o.type === 'arc' || o.type === 'sector') && o.centerPointId === pointId
  );
  if (shapes.length > 0) return { kind: 'central', shape: shapes[0], shapes };
  const ids = angleNeighbourIds(pointId, objects);
  return ids.length >= 2 ? { kind: 'vertex', neighbourIds: [ids[0], ids[1]] } : null;
}

/** Bir köşede ölçülebilen TEK bir açı (alt menünün bir maddesi). */
export interface NoktaAcisi {
  /** Açının köşesi */
  vertexId: string;
  /** İki kolun uç noktaları; köşenin etrafındaki YÖNLERİNE göre sıralıdır */
  armIds: [string, string];
  /** Köşe ORTADA olmak üzere üç harfli ad, ör. "IEF" */
  title: string;
  /** Tuvalde okunan ölçü: iç açı (0–180); açı ölçülmüş ve dış açıya çevrilmişse 360 − iç açı */
  degrees: number;
  /** Bu açı zaten ölçülmüşse açı nesnesinin kimliği */
  existingId?: string;
  /** Var olan açı ekranda okunuyor mu (görünür ve değeri açık) */
  existingShown?: boolean;
}

/**
 * Bir köşede menüde listelenecek en çok açı sayısı. Alt menü kaydırılmadığı için
 * çok kollu köşelerde liste kesilir; Canvas kalan sayıyı söyleyen soluk bir madde ekler.
 */
export const ACI_MENU_SINIRI = 12;

/**
 * Bundan küçük ölçüler açı sayılmaz: aynı yönde giden iki kol (ör. kolun üstüne konmuş ikinci bir nokta)
 * ya da köşeyle çakışık bir kol 0°'lik yozlaşmış bir "açı" üretir; ölçülürse tuvalde anlamsız bir
 * 0° rozeti çıkar. Eşik, hesaplama yuvarlamasını (1e-7 derece mertebesinde) yutacak kadar küçüktür.
 */
const SIFIR_ACI_ESIGI = 1e-4;

/**
 * Bir NOKTADA kurulabilen BÜTÜN açılar: kolların her ikili birleşimi (n kol → n*(n-1)/2 açı).
 *
 * "E noktasında EIF, FEG ve EIG açıları var; hangisini ölçeyim?" sorusunun tek kaynağı budur:
 * sağ tık menüsündeki "Açı ölç" alt menüsü de, yazılı komut motoru da aynı listeyi kullanır.
 *
 * SIRA ekrandaki görüntüye uyar: kollar köşenin etrafındaki yönlerine göre dizilir, sonra
 * önce KOMŞU kol çiftleri (gözle görülen "küçük" açılar), sonra bir atlayanlar… gelir.
 * Kol komşuluğu angleNeighbourIds ile aynıdır (parça/doğru/ışın uçları, çokgenin komşu köşeleri);
 * yay/dilim MERKEZ açısı buraya girmez, onun kendi maddesi vardır.
 */
export function noktadakiAcilar(pointId: string, objects: readonly MathObject[]): NoktaAcisi[] {
  const noktalar = new Map<string, PointObject>();
  for (const o of objects) if (o.type === 'point') noktalar.set(o.id, o);
  const kose = noktalar.get(pointId);
  if (!kose) return [];
  const kollar = angleNeighbourIds(pointId, objects)
    .map((id) => noktalar.get(id))
    .filter((p): p is PointObject => !!p);
  const n = kollar.length;
  if (n < 2) return [];

  // Kolları köşeden bakıldığındaki yönlerine göre sırala: yan yana duran kollar listede de yan yana olsun.
  const sirali = kollar
    .map((p) => ({ p, yon: (Math.atan2(p.y - kose.y, p.x - kose.x) + 2 * Math.PI) % (2 * Math.PI) }))
    .sort((a, b) => a.yon - b.yon || (a.p.label || '').localeCompare(b.p.label || '', 'tr'));

  const mevcut = objects.filter(
    (o): o is AngleObject => o.type === 'angle' && o.vertexPointId === pointId
  );
  const sonuc: NoktaAcisi[] = [];
  for (let atlama = 1; atlama <= Math.floor(n / 2); atlama++) {
    // Çift sayıda kolda karşılıklı çiftler (atlama = n/2) yalnız bir kez yazılır.
    const sayi = n % 2 === 0 && atlama === n / 2 ? n / 2 : n;
    for (let i = 0; i < sayi; i++) {
      const a = sirali[i].p;
      const b = sirali[(i + atlama) % n].p;
      const ic = calculateAngleDegrees(a, kose, b);
      if (!(ic > SIFIR_ACI_ESIGI)) continue;
      const eski = mevcut.find(
        (o) =>
          (o.point1Id === a.id && o.point3Id === b.id) || (o.point1Id === b.id && o.point3Id === a.id)
      );
      sonuc.push({
        vertexId: pointId,
        armIds: [a.id, b.id],
        title: `${a.label || '?'}${kose.label || '?'}${b.label || '?'}`,
        // Ölçülmüş açı DIŞ açıya çevrilmişse (reflex) menüde de tuvalde OKUNAN değer yazmalı:
        // yoksa rozet 225° derken alt menüdeki işaretli satır 135° diyor.
        degrees: eski?.reflex ? 360 - ic : ic,
        ...(eski
          ? { existingId: eski.id, existingShown: eski.visible !== false && eski.showValue !== false }
          : {}),
      });
    }
  }
  return sonuc;
}
