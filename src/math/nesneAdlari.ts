/**
 * Nesnelerin Türkçe adları ve silme cümleleri.
 *
 * Hem komut motoru (edit/targets.ts yeniden dışa aktarır) hem de WorkspaceContext kullanır: yazılı "ABC üçgenini sil"
 * ile ekrandan silme AYNI adları ve AYNI nokta listesini söylesin. Bu modül yalnızca türlere ve `fold`a dayanır
 * (döngüsel içe aktarma olmasın: WorkspaceContext -> nesneAdlari -> text).
 */
import type { MathObject, ObjectType, PointObject } from '@/types/math';
import { fold } from '@/math/commands/text';

/**
 * Tanım NOKTALARIYLA çizilen şekiller. Bunlardan biri silinince, başka hiçbir nesnenin kullanmadığı kendi noktaları da
 * gider (WorkspaceContext.planDeletion). Nokta, açı, ölçüm, metin, fonksiyon, kaydırıcı... bu listede değildir.
 */
export const NOKTALI_SEKILLER: ReadonlySet<ObjectType> = new Set<ObjectType>(['polygon', 'segment', 'line', 'ray', 'circle', 'ellipse', 'arc', 'sector']);

/**
 * "Uzunluk Ölç (cm)" / "Birimle Ölç (br)" aracının ve uzunluk ölçme komutlarının bıraktığı |AB| parçası: var olan iki
 * noktayı ÖLÇEN bir etikettir, noktaları tanımlayan bir şekil değildir. Bu yüzden silinince ölçtüğü noktalar yerinde
 * kalır (açı ve ölçüm etiketlerinde olduğu gibi); "3 br uzunluğunda AB doğru parçası" gibi gerçek şekiller ise |AB|
 * etiketi taşımadığı için bu süzgece takılmaz.
 */
export function olcumParcasiMi(o: MathObject): boolean {
  return o.type === 'segment' && !!o.unit && o.showLength !== false && /^\|[^|]+\|$/.test((o.label ?? '').trim());
}

/** Mesajlarda nesnenin Türkçe adı: "ABC üçgeni", "A noktası", "[AB] doğru parçası". */
export function describe(o: MathObject): string {
  const f = fold(o.label ?? '');
  switch (o.type) {
    case 'point': return `${o.label} noktası`;
    case 'segment': return /dogru parca/.test(f) ? o.label : `${o.label} doğru parçası`;
    case 'line': return /dogru/.test(f) ? o.label : `${o.label} doğrusu`;
    case 'ray': return /isin/.test(f) ? o.label : `${o.label} ışını`;
    case 'circle': return /cember|daire/.test(f) ? o.label : `${o.label} çemberi`;
    case 'ellipse': return /elips/.test(f) ? o.label : `${o.label} elipsi`;
    case 'arc': return /yay/.test(f) ? o.label : `${o.label} yayı`;
    case 'sector': return /dilim/.test(f) ? o.label : `${o.label} daire dilimi`;
    case 'angle': return /aci/.test(f) ? o.label : `${o.label} açısı`;
    case 'polygon': {
      if (/ucgen|kare|dikdortgen|cokgen|dortgen|gen\b|paralelkenar|yamuk|deltoid/.test(f)) return o.label;
      const n = o.pointIds.length;
      return `${o.label} ${n === 3 ? 'üçgeni' : n === 4 ? 'dörtgeni' : 'çokgeni'}`;
    }
    case 'function': return `${o.label} fonksiyonu`;
    case 'slider': return `${o.variableName} kaydırıcısı`;
    case 'text': return `“${o.text.length > 24 ? `${o.text.slice(0, 24)}…` : o.text}” yazısı`;
    case 'fraction': return `${o.numerator}/${o.denominator} kesir modeli`;
    case 'checkbox': return `“${o.label}” onay kutusu`;
    case 'button': return `“${o.label}” düğmesi`;
    case 'input_box': return `${o.label} girdi kutusu`;
    case 'image': return 'görsel';
    case 'pen': return 'kalem çizimi';
    case 'measurement': return o.label;
    default: return 'nesne';
  }
}

export function joinTr(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} ve ${parts[parts.length - 1]}`;
}

export function describeList(list: MathObject[]): string {
  if (list.length > 5) {
    const types = new Set(list.map(o => o.type));
    if (types.size === 1 && list[0].type === 'point') return `${list.length} nokta`;
    return `${list.length} nesne`;
  }
  const points = list.filter(o => o.type === 'point');
  const others = list.filter(o => o.type !== 'point').map(describe);
  const pointText = points.length > 1 ? `${joinTr(points.map(p => p.label))} noktaları` : points.map(describe);
  return joinTr([...others, ...(Array.isArray(pointText) ? pointText : [pointText])]);
}

/** Cümle başı büyük harf; nesne adları ("c1 çemberi", "g(x) = sin(x) fonksiyonu", "a kaydırıcısı") yazıldığı gibi kalır. */
export function cumleBasi(text: string): string {
  return /^(?:görsel|kalem|nesne)/.test(text) ? text.charAt(0).toLocaleUpperCase('tr') + text.slice(1) : text;
}

/** Birden çok noktayı adıyla saymak için üst sınır; fazlası sayıyla söylenir ("12 nokta"). */
const EN_COK_AD = 8;

/** "A noktası", "A, B ve C noktaları", 8'den fazlası "12 nokta". */
export function noktalari(labels: string[]): string {
  if (labels.length > EN_COK_AD) return `${labels.length} nokta`;
  return labels.length === 1 ? `${labels[0]} noktası` : `${joinTr(labels)} noktaları`;
}

/** "A noktasıyla", "A, B ve C noktalarıyla", 8'den fazlası "12 noktasıyla". */
export function noktalariyla(labels: string[]): string {
  if (labels.length > EN_COK_AD) return `${labels.length} noktasıyla`;
  return labels.length === 1 ? `${labels[0]} noktasıyla` : `${joinTr(labels)} noktalarıyla`;
}

/** Görünür ve adı olan noktaların adları, sahnedeki sırayla (gizli yardımcı noktalar hiç anılmaz). */
export function gorunurNoktaAdlari(objects: MathObject[], ids: readonly string[]): string[] {
  const byId = new Map(objects.map(o => [o.id, o]));
  return ids
    .map(id => byId.get(id))
    .filter((p): p is PointObject => p?.type === 'point' && p.visible !== false && !!p.label)
    .map(p => p.label);
}

/** Silme ipuçlarının ortak sonu; Açı rozeti ve yay ölçümü ipuçlarıyla aynı söyleyiş. */
export const GERI_AL_IPUCU = "Geri almak için Geri Al'ı (Ctrl+Z) kullanın.";

/**
 * Ekrandan silmenin ardından ipucu çubuğunda gösterilecek kısa cümle.
 *  - kendi noktalarıyla silinen şekil: "ABC üçgeni A, B ve C noktalarıyla birlikte silindi. Geri almak için ..."
 *  - "Yalnızca şekli sil (noktalar kalsın)": "ABC üçgeni silindi; A, B ve C noktaları yerinde kaldı. Geri almak için ..."
 * Görünür bir nokta gitmediyse (ortak noktalar, yalnızca nokta ya da etiket silme) null: ekran eskisi gibi sessiz kalır ve
 * açı rozeti / yay ölçümü yollarının kendi ipucu ezilmez.
 * `ids`: istenen nesneler; yalnızca NOKTALI_SEKILLER anılır.
 */
export function silmeIpucu(objects: MathObject[], ids: readonly string[], ownPointIds: readonly string[], keptPointIds: readonly string[] = []): string | null {
  const byId = new Map(objects.map(o => [o.id, o]));
  const sekiller = ids.map(id => byId.get(id)).filter((o): o is MathObject => !!o && NOKTALI_SEKILLER.has(o.type));
  if (!sekiller.length) return null;
  const ad = cumleBasi(describeList(sekiller));
  const kalanlar = gorunurNoktaAdlari(objects, keptPointIds);
  if (kalanlar.length) return `${ad} silindi; ${noktalari(kalanlar)} yerinde kaldı. ${GERI_AL_IPUCU}`;
  const gidenler = gorunurNoktaAdlari(objects, ownPointIds);
  if (gidenler.length) return `${ad} ${noktalariyla(gidenler)} birlikte silindi. ${GERI_AL_IPUCU}`;
  return null;
}
