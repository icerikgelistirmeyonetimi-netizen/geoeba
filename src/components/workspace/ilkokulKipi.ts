/**
 * İlkokul kipi: atölye (Serbest Çizim Stüdyosu) İLKOKUL kademesi seçiliyken ya da 1-4. sınıf etkinliği için açıldığında
 * geçerli görünüm ve araç kuralları. Kaynak: alan uzmanlarının "atölye inceleme" notları (2. tur; 2, 3 ve 4. sınıf).
 * Ortaokul, lise ve "Tüm araçlar"da bu kuralların hiçbiri uygulanmaz.
 *
 *  - Zemin: koordinat düzlemi yok. Eksenler, negatif eksen sayıları, ondalık imleç konumu ve bölge adları kapalı;
 *    zemin kareli (noktalı / izometrik seçilirse o kalır), ızgara aralığı 1 birim ve noktalar ızgaraya oturur:
 *    birimle ölçüm kareli zeminle ilişkili olur (her kare 1 br).
 *  - Ölçüler pozitif TAM sayı yazılır (en yakın tama yuvarlanır); yuvarlanan değer "yaklaşık" der.
 *  - Yeni noktalar harf adı taşımaz (kare, dikdörtgen, düzgün çokgen köşelerinde A, B, C, D yok). Yeni çemberin
 *    merkezi, merkez adı, yarıçap, alan ve çevre yazıları gösterilmez. Yeni açıda derece yazılmaz (TYMM: "Açı ölçer ile
 *    açı ölçme uygulamalarına girilmez"). Yeni çokgende alan hesabı yazılmaz (alan birim karelerle kaplanarak bulunur).
 *  - Çokgen ve düzgün çokgen en çok 8 kenarlı (sekizgen).
 *  - Yansıtma yalnız şekil seçtirir: simetri doğrusu şeklin yanına dikey ya da yatay konur ("x ekseni" yok).
 *
 * Saf işlevler + tek React kancası (useIlkokulKipindeMi: WorkspaceContext nesne görünümünü bununla türetir).
 * Araç paneli ve menüler useIlkokulKipi (hooks/useKademeDuzeyi.ts) kullanır.
 */
import type { CircleObject, MathObject, Point2D, PolygonObject, ViewportTransform } from '@/types/math';
import type { ToolMode } from '@/types/workspace';
import type { KademeDuzeyi } from './kademeDuzeyleri';
import { TOOL_SHORTCUTS } from './toolShortcuts';
import { useSyncExternalStore } from 'react';
import { kademeDuzeyineAbone, kademeDuzeyiniOku } from '@/hooks/useKademeDuzeyi';

export const ilkokulMu = (duzey: KademeDuzeyi): boolean => duzey === 'ilkokul';

/**
 * İlkokul kipi şu an açık mı (React dışı okuma: WorkspaceContext'in commit'i ve araç işleyicileri). Yalnız GÖRÜNÜM ve
 * araç davranışı kurallarını seçer; araç süzgecine (kademeDuzeyleri) ve yazılı / sesli komutlara karışmaz.
 */
export const ilkokulKipindeMi = (): boolean => ilkokulMu(kademeDuzeyiniOku());

/**
 * İlkokul kipi (React): kademe deposuna abone olur, kademe değişince yeniden çizim tetikler. WorkspaceContext
 * tüketicilere verdiği nesne görünümünü (ilkokulGorunumu) bununla türetir. Kanca burada durur: komut yolu testi
 * (kademeSuzgeciBaglantisi) WorkspaceContext'in '@/hooks/useKademeDuzeyi' modülünü doğrudan bilmemesini ister.
 */
export function useIlkokulKipindeMi(): boolean {
  return useSyncExternalStore(kademeDuzeyineAbone, ilkokulKipindeMi, () => false);
}

/**
 * Araç adının yanında (panel, arama, Araçlar menüsü, ipucu) gösterilen klavye kısayolu harfi. İlkokulda gösterilmez
 * (alan uzmanı, 3. sınıf: "N, L, D, I, C, F gibi klavye kısayollarının görünmesi gerekli değildir"); kısayol yine çalışır.
 */
export function gorunenKisayol(arac: string, duzey: KademeDuzeyi): string | undefined {
  return ilkokulMu(duzey) ? undefined : TOOL_SHORTCUTS[arac as ToolMode];
}

/** İlkokulda çokgen ve düzgün çokgenin en çok kenar (köşe) sayısı: sekizgen */
export const ILKOKUL_EN_COK_KENAR = 8;

/** İlkokul zemininin değiştirdiği görünüm alanları */
export type IlkokulZeminAlanlari = Pick<
  ViewportTransform,
  'showAxes' | 'showQuadrants' | 'showCoordinates' | 'showGrid' | 'gridStyle' | 'gridStep' | 'gridStepAuto' | 'snapToGrid' | 'pointSnapMode'
>;

const ZEMIN_ANAHTARLARI: readonly (keyof IlkokulZeminAlanlari)[] = [
  'showAxes', 'showQuadrants', 'showCoordinates', 'showGrid', 'gridStyle', 'gridStep', 'gridStepAuto', 'snapToGrid', 'pointSnapMode',
];

/** Görünümün ilkokul zeminiyle değişecek alanlarının şimdiki değerleri (kademe değişince geri yüklemek için) */
export function zeminAlanlari(v: ViewportTransform): IlkokulZeminAlanlari {
  const out: Partial<IlkokulZeminAlanlari> = {};
  for (const k of ZEMIN_ANAHTARLARI) (out as Record<string, unknown>)[k] = v[k];
  return out as IlkokulZeminAlanlari;
}

/**
 * İlkokul açılış zemini: eksen ve koordinat bilgisi kapalı, kareli (ya da seçilmişse noktalı / izometrik) ızgara,
 * 1 birimlik sabit aralık, noktalar ızgaraya oturur. Değişecek bir şey yoksa AYNI nesne döner.
 */
export function ilkokulZemini(v: ViewportTransform): ViewportTransform {
  const gridStyle = v.gridStyle === 'noktali' || v.gridStyle === 'izometrik' ? v.gridStyle : 'kareli';
  const hedef: IlkokulZeminAlanlari = {
    showAxes: false,
    showQuadrants: false,
    showCoordinates: false,
    showGrid: true,
    gridStyle,
    gridStep: 1,
    gridStepAuto: false,
    snapToGrid: true,
    pointSnapMode: 'snapToGrid',
  };
  return ZEMIN_ANAHTARLARI.every((k) => v[k] === hedef[k]) ? v : { ...v, ...hedef };
}

/** İlkokuldan çıkınca zeminin önceki (ilkokuldan önceki) alanları geri gelir; yalnız zemin alanları değişir. */
export function zeminiGeriYukle(v: ViewportTransform, onceki: IlkokulZeminAlanlari): ViewportTransform {
  return ZEMIN_ANAHTARLARI.every((k) => v[k] === onceki[k]) ? v : { ...v, ...onceki };
}

/** Eksenler ilkokulda açılırsa (komut, eski kayıt) kapatılır: ilkokulda koordinat ekseni sunulmaz. */
export function ilkokulEksensiz(v: ViewportTransform): ViewportTransform {
  return v.showAxes || v.showQuadrants || v.showCoordinates ? { ...v, showAxes: false, showQuadrants: false, showCoordinates: false } : v;
}

/**
 * İlkokulda uzunluk: pozitif TAM sayı (en yakın tama yuvarlanır, en az 1). `yaklasik`: değer tam sayı değildi.
 */
export function ilkokulUzunlugu(deger: number): { deger: number; yaklasik: boolean } {
  if (!Number.isFinite(deger) || deger <= 0) return { deger: 0, yaklasik: false };
  const tam = Math.max(1, Math.round(deger));
  return { deger: tam, yaklasik: Math.abs(deger - tam) > 1e-6 };
}

/** "5 cm" ya da "yaklaşık 4 br": ilkokul ölçme araçlarının canlı okuması ve ipucu */
export function ilkokulUzunlukMetni(deger: number, birim: 'cm' | 'br'): string {
  const u = ilkokulUzunlugu(deger);
  return `${u.yaklasik ? 'yaklaşık ' : ''}${u.deger} ${birim}`;
}

/** Alan modelinde ilkokul okuması: çarpma yok, birim kare sayısı ("12 birim kare") */
export const ilkokulAlanOkumasi = (sutun: number, satir: number): string => `${sutun * satir} birim kare`;

/**
 * İlkokulda nesnelerin GÖRÜNÜMÜ (saf türetme; nesne verisi DEĞİŞMEZ — WorkspaceContext ilkokulken tüketicilere bu
 * türetilmiş diziyi verir, başka kademeye geçince gerçek nesneler olduğu gibi görünür):
 *  - nokta harf adı göstermez (showLabel: false);
 *  - çokgen alan hesabı göstermez (showArea: false);
 *  - çemberde alan, çevre ve yarıçap yazısı yok; merkezi ve yarıçap noktası (başka nesne kullanmıyorsa)
 *    gizlenir ve adsızdır: merkez / yarıçap bilgisi görünmez, çember gövdesinden sürüklenir;
 *  - açıda derece yazılmaz (showValue: false).
 * Kural eskiden yalnız YENİ eklenen nesneye oluşturma anında yazılıyordu; kademe değişince adlar ve ölçüler geri
 * gelmiyordu (kullanıcı, 9 Ekim 2026: "|AB| = 2 br liseye geçtiğimde geri gelmiyor"). Değişiklik yoksa dizinin kendisi döner.
 */
export function ilkokulGorunumu(nesneler: readonly MathObject[]): MathObject[] {
  /** Çemberlerin YALNIZ kendilerine ait (başka nesnenin kullanmadığı) noktaları */
  const cemberNoktasi = new Set<string>();
  for (const c of nesneler) {
    if (c.type !== 'circle') continue;
    const cember = c as CircleObject;
    for (const pid of [cember.centerPointId, cember.radiusPointId]) {
      if (!pid) continue;
      const baskasi = nesneler.some((o) => o.id !== cember.id && o.id !== pid && nesneNoktayiKullanir(o, pid));
      if (!baskasi) cemberNoktasi.add(pid);
    }
  }

  let degisti = false;
  const sonuc = nesneler.map((o) => {
    if (o.type === 'point') {
      const gizle = cemberNoktasi.has(o.id);
      if (o.showLabel === false && (!gizle || o.visible === false)) return o;
      degisti = true;
      return { ...o, showLabel: false, ...(gizle ? { visible: false } : {}) } as MathObject;
    }
    if (o.type === 'polygon') {
      const p = o as PolygonObject;
      if (!p.showArea) return o;
      degisti = true;
      return { ...p, showArea: false } as MathObject;
    }
    if (o.type === 'circle') {
      const c = o as CircleObject;
      if (c.showArea === false && c.showPerimeter === false && c.showRadius === false) return o;
      degisti = true;
      return { ...c, showArea: false, showPerimeter: false, showRadius: false } as MathObject;
    }
    if (o.type === 'angle') {
      if (o.showValue === false) return o;
      degisti = true;
      return { ...o, showValue: false } as MathObject;
    }
    return o;
  });
  return degisti ? sonuc : (nesneler as MathObject[]);
}

/** Nesne bu noktaya (kimliğiyle) başvuruyor mu? Nokta kimliği taşıyan bütün alanlara bakılır. */
function nesneNoktayiKullanir(o: MathObject, pid: string): boolean {
  for (const [k, v] of Object.entries(o)) {
    if (k === 'id') continue;
    if (v === pid) return true;
    if (Array.isArray(v) && v.includes(pid)) return true;
    if (v && typeof v === 'object' && !Array.isArray(v) && k === 'construction') {
      if (JSON.stringify(v).includes(`"${pid}"`)) return true;
    }
  }
  return false;
}

export type SimetriYonu = 'dikey' | 'yatay';

/**
 * İlkokul yansıtması: simetri doğrusu şeklin YANINA konur. Dikey: şeklin sağ kenarındaki ızgara çizgisi
 * (x = ⌈en büyük x⌉); yatay: alt kenarındaki ızgara çizgisi (y = ⌊en küçük y⌋). Böylece simetrik şekil
 * doğrunun öbür yanında, kareli zeminde aynı karelere oturur. Doğru, şeklin bir birim ötesine uzar (çizim için).
 */
export function ilkokulSimetriDogrusu(koseler: readonly Point2D[], yon: SimetriYonu): { p1: Point2D; p2: Point2D } {
  const xs = koseler.map((p) => p.x);
  const ys = koseler.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const yuvarla = (n: number, f: (v: number) => number) => (Math.abs(n - Math.round(n)) < 1e-6 ? Math.round(n) : f(n));
  if (yon === 'dikey') {
    const x = yuvarla(x1, Math.ceil);
    return { p1: { x, y: Math.floor(y0) - 1 }, p2: { x, y: Math.ceil(y1) + 1 } };
  }
  const y = yuvarla(y0, Math.floor);
  return { p1: { x: Math.floor(x0) - 1, y }, p2: { x: Math.ceil(x1) + 1, y } };
}
