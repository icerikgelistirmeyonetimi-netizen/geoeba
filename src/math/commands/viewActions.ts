import type { MathObject, Point2D, PointObject, ViewportTransform } from '@/types/math';
import { getVisibleWorldBounds, screenToWorld } from '../coordinates';
import type { AppAction, CommandSuccess } from './types';

/**
 * Yazılı komutların görünüm eylemleri için SAF yardımcılar.
 * CommandPanel bunları setViewport(prev => …) içinde kullanır; Canvas'taki düğmelerle birebir aynı sonucu verir.
 */

/** Canvas zoomAt ile aynı sınırlar. */
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 300;
/** WorkspaceContext DEFAULT_ZOOM ile aynı (görünümü sıfırla / boş sahneyi sığdır). */
export const RESET_ZOOM = 44;

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/**
 * Yakınlaştırma: ekran noktasının (verilmezse görünüm merkezinin) altındaki dünya koordinatı sabit kalır.
 * Canvas zoomAt(screenPoint, factor) ile aynı formül. Sınırda ya da geçersiz çarpanda görünüm aynen döner.
 */
export function zoomViewport(vp: ViewportTransform, factor: number, at?: Point2D | null): ViewportTransform {
  if (!Number.isFinite(factor) || factor <= 0) return vp;
  const zoom = clampZoom(vp.zoom * factor);
  if (zoom === vp.zoom) return vp;
  const sp = at ?? { x: vp.width / 2, y: vp.height / 2 };
  const world = screenToWorld(sp, vp);
  return {
    ...vp,
    zoom,
    panX: sp.x - vp.width / 2 - world.x * zoom,
    panY: sp.y - vp.height / 2 + world.y * zoom,
  };
}

/** Görünümü sıfırlar (Canvas centerOrigin / WorkspaceContext resetViewport). */
export function resetViewportTransform(vp: ViewportTransform): ViewportTransform {
  return { ...vp, zoom: RESET_ZOOM, panX: 0, panY: 0 };
}

/**
 * Tüm görünür nesneleri ekrana sığdırır. Canvas fitToObjects ile aynı kurallar:
 * noktalar, yazılar, kesir (± yarıçap), görsel (± max(g, y)/2), kalem noktaları ve merkez noktası olan çemberler (± r).
 * 1,5 birim kenar boşluğu, en küçük kutu 2 birim; zoom [5, 300] aralığında. Nesne yoksa görünüm sıfırlanır.
 */
export function fitViewport(vp: ViewportTransform, objects: MathObject[]): ViewportTransform {
  const kutu = nesneKutusu(objects);
  if (!kutu) return resetViewportTransform(vp);
  const { minX, minY, maxX, maxY } = kutu;
  const padding = 1.5;
  const boxW = Math.max(maxX - minX + padding * 2, 2);
  const boxH = Math.max(maxY - minY + padding * 2, 2);
  const zoom = clampZoom(Math.min(vp.width / boxW, vp.height / boxH));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { ...vp, zoom, panX: -cx * zoom, panY: cy * zoom };
}

export interface DunyaKutusu { minX: number; minY: number; maxX: number; maxY: number }

/**
 * Görünür nesnelerin dünya kutusu (fitViewport ile aynı kurallar). `yalniz` verilirse yalnız o kimliklerin
 * nesneleri sayılır (çember merkezi gibi bağlı noktalar yine bütün sahneden okunur). Kutu yoksa null.
 */
export function nesneKutusu(objects: readonly MathObject[], yalniz?: ReadonlySet<string>): DunyaKutusu | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const include = (x: number, y: number, pad = 0) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(pad)) return;
    minX = Math.min(minX, x - pad);
    maxX = Math.max(maxX, x + pad);
    minY = Math.min(minY, y - pad);
    maxY = Math.max(maxY, y + pad);
  };
  const points = new Map<string, PointObject>();
  for (const o of objects) if (o.type === 'point') points.set(o.id, o);

  for (const obj of objects) {
    if (!obj.visible) continue;
    if (yalniz && !yalniz.has(obj.id)) continue;
    if (obj.type === 'point' || obj.type === 'text') include(obj.x, obj.y);
    else if (obj.type === 'fraction') include(obj.x, obj.y, obj.radius);
    else if (obj.type === 'image') include(obj.x, obj.y, Math.max(obj.width, obj.height) / 2);
    else if (obj.type === 'pen') obj.points.forEach(p => include(p.x, p.y));
    else if (obj.type === 'circle') {
      const c = points.get(obj.centerPointId);
      if (c) {
        const rPt = obj.radiusPointId ? points.get(obj.radiusPointId) : undefined;
        const r = rPt ? Math.hypot(rPt.x - c.x, rPt.y - c.y) : obj.fixedRadius ?? 0;
        include(c.x, c.y, r);
      }
    } else if (yalniz && obj.type === 'polygon') {
      // Yeni çokgenin köşeleri eski noktalar olabilir ("ABC üçgenini çiz" var olan A, B, C ile)
      for (const id of obj.pointIds) { const p = points.get(id); if (p) include(p.x, p.y); }
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
  return { minX, minY, maxX, maxY };
}

/** Ekranda (piksel) nesnelerin görünmesi gereken serbest bölge ve onu örten kutular. */
export interface SerbestBolge {
  /** Tuvalin kenarlarından bırakılacak pay: üstte araç satırı, altta yüzen çubuklar. */
  kenar: { ust: number; alt: number; sol: number; sag: number };
  /** Tuvali örten kutular (ör. açık Yazarak Oluştur kutusu), tuval pikseliyle. */
  ortuler?: readonly { x: number; y: number; w: number; h: number }[];
}

/** Komutla oluşan nesneler için varsayılan kenar payları (piksel). */
export const KOMUT_KENAR_PAYI = { ust: 64, alt: 40, sol: 24, sag: 64 } as const;

const kesisir = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * KOMUTLA OLUŞAN NESNEYİ GÖRÜNÜR KILAR (alan uzmanı, atölye 4. tur, satır 169: "kenarları 3, 4, 5 olan üçgen çiz
 * komutu doğru sonuç veriyor ancak üçgen görünür alanın dışında, sağ alt köşede kısmen çiziliyor").
 *
 * Komut motoru yeni şekli var olan çizimin yanına koyar (scene.placeShape); bu yer görünür alanın dışında ya da açık
 * komut kutusunun altında kalabiliyordu. Yeni nesnelerin kutusu serbest bölgede (kenar payları çıkarılmış, örtülerin
 * dışında kalan en büyük dikdörtgen) tamamen görünüyorsa görünüm DEĞİŞMEZ. Görünmüyorsa:
 *   1. yakınlık aynı kalarak görünüm kaydırılır (yeni kutu bölgenin ortasına),
 *   2. sığmıyorsa yalnız uzaklaştırılır (hiç yakınlaştırılmaz);
 * önce bütün çizim (eski + yeni) bölgeye sığdırılmaya çalışılır, ancak bu yakınlığı yarıdan çok düşürecekse
 * yalnız yeni nesneler gösterilir.
 */
export function yeniNesneleriGoster(
  vp: ViewportTransform,
  onceki: readonly MathObject[],
  sonraki: readonly MathObject[],
  bolge: SerbestBolge = { kenar: KOMUT_KENAR_PAYI },
): ViewportTransform {
  if (!(vp.width > 0 && vp.height > 0)) return vp;
  const eskiler = new Set(onceki.map((o) => o.id));
  const yeniler = new Set(sonraki.filter((o) => !eskiler.has(o.id)).map((o) => o.id));
  if (yeniler.size === 0) return vp;
  const yeni = nesneKutusu(sonraki, yeniler);
  if (!yeni) return vp;

  const alan = serbestDikdortgen(vp.width, vp.height, bolge);
  const ekranKutusu = (k: DunyaKutusu, v: ViewportTransform) => {
    const cx = v.width / 2 + v.panX;
    const cy = v.height / 2 + v.panY;
    return { x: cx + k.minX * v.zoom, y: cy - k.maxY * v.zoom, w: (k.maxX - k.minX) * v.zoom, h: (k.maxY - k.minY) * v.zoom };
  };
  const icinde = (k: DunyaKutusu, v: ViewportTransform) => {
    const e = ekranKutusu(k, v);
    const pay = 14; // nokta işareti ve adı
    return e.x - pay >= alan.x && e.y - pay >= alan.y && e.x + e.w + pay <= alan.x + alan.w && e.y + e.h + pay <= alan.y + alan.h
      && !(bolge.ortuler ?? []).some((o) => kesisir({ x: e.x - pay, y: e.y - pay, w: e.w + 2 * pay, h: e.h + 2 * pay }, o));
  };
  if (icinde(yeni, vp)) return vp;

  const odakla = (k: DunyaKutusu): ViewportTransform => {
    const pay = 1; // dünya birimi
    const gerekenZoom = Math.min(alan.w / (k.maxX - k.minX + 2 * pay), alan.h / (k.maxY - k.minY + 2 * pay));
    const zoom = clampZoom(Math.min(vp.zoom, gerekenZoom));
    const kx = (k.minX + k.maxX) / 2;
    const ky = (k.minY + k.maxY) / 2;
    const hedefX = alan.x + alan.w / 2;
    const hedefY = alan.y + alan.h / 2;
    return { ...vp, zoom, panX: hedefX - vp.width / 2 - kx * zoom, panY: hedefY - vp.height / 2 + ky * zoom };
  };

  const hepsi = nesneKutusu(sonraki);
  if (hepsi) {
    const tum = odakla(hepsi);
    if (tum.zoom >= vp.zoom * 0.5 && icinde(yeni, tum)) return tum;
  }
  return odakla(yeni);
}

/** Kenar payları çıkarılmış tuvalde, örtülerin dışında kalan en büyük (üst ya da alt / sol ya da sağ) dikdörtgen. */
export function serbestDikdortgen(W: number, H: number, bolge: SerbestBolge): { x: number; y: number; w: number; h: number } {
  const { ust, alt, sol, sag } = bolge.kenar;
  let alan = { x: sol, y: ust, w: Math.max(1, W - sol - sag), h: Math.max(1, H - ust - alt) };
  for (const o of bolge.ortuler ?? []) {
    if (!kesisir(alan, o)) continue;
    const adaylar = [
      { x: alan.x, y: alan.y, w: alan.w, h: o.y - alan.y }, // örtünün üstü
      { x: alan.x, y: o.y + o.h, w: alan.w, h: alan.y + alan.h - (o.y + o.h) }, // altı
      { x: alan.x, y: alan.y, w: o.x - alan.x, h: alan.h }, // solu
      { x: o.x + o.w, y: alan.y, w: alan.x + alan.w - (o.x + o.w), h: alan.h }, // sağı
    ].filter((a) => a.w > 40 && a.h > 40);
    if (adaylar.length === 0) continue;
    alan = adaylar.reduce((en, a) => (a.w * a.h > en.w * en.h ? a : en));
  }
  return alan;
}

/** Görünümdeki dünya merkezi (pencereyle açılan araçların şekli görünür alana koyması için). */
export function viewportCenter(vp: ViewportTransform): Point2D {
  const b = getVisibleWorldBounds(vp);
  const round = (n: number) => Math.round(n * 2) / 2;
  return { x: round((b.minX + b.maxX) / 2), y: round((b.minY + b.maxY) / 2) };
}

/** Komutla gelen görünüm yamasını temizler: sayısal alanlar sonlu olmalı, zoom sınırlanır. */
export function sanitizeViewportPatch(patch: Partial<ViewportTransform>): Partial<ViewportTransform> {
  const clean: Partial<ViewportTransform> = {};
  for (const [key, value] of Object.entries(patch) as [keyof ViewportTransform, unknown][]) {
    if (key === 'width' || key === 'height') continue; // ekran boyutunu ResizeObserver yönetir
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue;
      (clean as Record<string, unknown>)[key] = key === 'zoom' ? clampZoom(value) : key === 'gridStep' ? Math.max(0.01, value) : value;
    } else if (typeof value === 'boolean' || value === undefined) {
      (clean as Record<string, unknown>)[key] = value;
    }
  }
  return clean;
}

/**
 * Görünümü etkileyen tek bir eylemi uygular (viewport, zoom, fitView, resetView); diğer eylemlerde görünüm aynen döner.
 * `objects`: eylemden sonra geçerli olacak sahne (sığdırma için).
 */
export function viewportAfterAction(vp: ViewportTransform, action: AppAction, objects: MathObject[]): ViewportTransform {
  switch (action.kind) {
    case 'viewport': return { ...vp, ...sanitizeViewportPatch(action.patch) };
    case 'zoom': return zoomViewport(vp, action.factor);
    case 'fitView': return fitViewport(vp, objects);
    case 'resetView': return resetViewportTransform(vp);
    default: return vp;
  }
}

/**
 * Başarılı bir komuttan sonra ölçümler zorla gösterilsin mi?
 * Yalnızca sahne değiştiyse ve kullanıcı aynı komutta sade görünüm ya da ölçümleri gizlemeyi istemediyse.
 */
export function shouldForceMeasurements(result: Pick<CommandSuccess, 'sceneChanged' | 'actions'>): boolean {
  if (!result.sceneChanged) return false;
  return !result.actions.some(a => (a.kind === 'styleMode' && a.mode === 'Sade')
    || (a.kind === 'viewport' && a.patch.showMeasurements === false));
}

/**
 * Geri al / yinele, sahneyi değiştiren işlemlerle aynı komutta uygulanamaz: motor yeni sahneyi geri almadan önceki
 * çizimden hesapladığı için sonuç yanlış olurdu. Böyle bir karışımda açıklama döndürür, yoksa null.
 */
export function historyConflict(result: Pick<CommandSuccess, 'sceneChanged' | 'actions'>): string | null {
  if (!result.sceneChanged) return null;
  const history = result.actions.find(a => a.kind === 'undo' || a.kind === 'redo');
  if (!history) return null;
  return `“${history.kind === 'undo' ? 'Geri al' : 'Yinele'}” komutunu çizim işlemleriyle aynı cümlede kullanmayın; önce onu ayrı yazıp uygulayın.`;
}

/** Geri al/yinele için gerçekten atılabilecek adım sayısı. */
export function historySteps(kind: 'undo' | 'redo', requested: number | undefined, historyIndex: number, historyLength: number): number {
  const want = Number.isFinite(requested) && (requested as number) >= 1 ? Math.floor(requested as number) : 1;
  const available = kind === 'undo' ? Math.max(0, historyIndex) : Math.max(0, historyLength - 1 - historyIndex);
  return Math.min(want, available);
}
