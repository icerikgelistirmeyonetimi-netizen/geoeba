import type { MathObject, Point2D, PointObject, PolygonObject } from '@/types/math';
import { createId } from '@/state/ids';
import { generateNextPointLabels } from './geometry';

/*
 * Düzgün çokgen ve KENAR SAYISI KAYDIRICISI (kullanıcı, 26.10.2026: "sürgüye kenar sayısı da bağlanabilir mi"). Kenar
 * sayısı kaydırıcıya bağlı düzgün çokgende ilk iki köşe serbesttir; öteki köşeler bu iki köşeden ve kaydırıcının
 * değerinden hesaplanır (nokta kurulumu `regularVertex`, commandBindings.resolveCommandBindings). Kenar sayısı değişince
 * köşe noktaları eklenir ya da silinir (duzgunCokgenKoseleriniEsle).
 */

export const DUZGUN_COKGEN_EN_AZ_KENAR = 3;
export const DUZGUN_COKGEN_EN_COK_KENAR = 30;

/** Kaydırıcının değerinden kenar sayısı: tam sayı, 3–30 arası */
export const kenarSayisi = (deger: number): number =>
  Math.max(DUZGUN_COKGEN_EN_AZ_KENAR, Math.min(DUZGUN_COKGEN_EN_COK_KENAR, Math.round(Number.isFinite(deger) ? deger : DUZGUN_COKGEN_EN_AZ_KENAR)));

/** Düzgün çokgenin adı (Düzgün Çokgen penceresi ve kenar sayısı kaydırıcısı aynı adı verir) */
export function duzgunCokgenAdi(n: number): string {
  if (n === 3) return 'Eşkenar Üçgen';
  if (n === 4) return 'Kare (Düzgün Dörtgen)';
  if (n === 5) return 'Düzgün Beşgen';
  if (n === 6) return 'Düzgün Altıgen (Petek)';
  if (n === 7) return 'Düzgün Yedigen';
  if (n === 8) return 'Düzgün Sekizgen';
  if (n === 9) return 'Düzgün Dokuzgen';
  if (n === 10) return 'Düzgün Ongen';
  if (n === 12) return 'Düzgün Onikigen';
  return `Düzgün ${n}-gen`;
}

/** Köşelerin dönüş yönü: saat yönünün tersine (dünya koordinatı, y yukarı) +1, saat yönünde −1 */
export function donusYonu(koseler: readonly Point2D[]): 1 | -1 {
  let alan = 0;
  for (let i = 0; i < koseler.length; i++) {
    const p = koseler[i], q = koseler[(i + 1) % koseler.length];
    alan += p.x * q.y - q.x * p.y;
  }
  return alan >= 0 ? 1 : -1;
}

/** Köşeler (bu sırayla) düzgün çokgen mi: bütün kenarlar ve bütün iç açılar eşit, çokgen dışbükey */
export function duzgunMu(koseler: readonly Point2D[], tolerans = 1e-6): boolean {
  const n = koseler.length;
  if (n < DUZGUN_COKGEN_EN_AZ_KENAR) return false;
  const kenar = (i: number) => Math.hypot(koseler[(i + 1) % n].x - koseler[i].x, koseler[(i + 1) % n].y - koseler[i].y);
  const s = kenar(0);
  if (!(s > 1e-9)) return false;
  const yon = donusYonu(koseler);
  for (let i = 0; i < n; i++) {
    if (Math.abs(kenar(i) - s) > tolerans * Math.max(1, s)) return false;
    // Her köşe, ilk iki köşeden kurulan düzgün n-genin aynı sıradaki köşesiyle çakışmalı
    const beklenen = duzgunKose(koseler[0], koseler[1], n, i, yon);
    if (Math.hypot(beklenen.x - koseler[i].x, beklenen.y - koseler[i].y) > tolerans * Math.max(1, s) * 10) return false;
  }
  return true;
}

/**
 * Ardışık iki köşesi p0, p1 olan düzgün n-genin k. köşesi (k = 0 → p0, k = 1 → p1). `yon` +1: köşeler saat yönünün
 * tersine dizilir (iç taraf p0 → p1 doğrultusunun solunda).
 */
export function duzgunKose(p0: Point2D, p1: Point2D, n: number, k: number, yon: 1 | -1): Point2D {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const s = Math.hypot(dx, dy);
  if (!(s > 1e-12)) return { x: p0.x, y: p0.y };
  const yarim = Math.PI / n;
  const h = s / (2 * Math.tan(yarim));
  const cx = (p0.x + p1.x) / 2 + yon * (-dy / s) * h;
  const cy = (p0.y + p1.y) / 2 + yon * (dx / s) * h;
  const r = s / (2 * Math.sin(yarim));
  const t = Math.atan2(p0.y - cy, p0.x - cx) + yon * k * 2 * yarim;
  return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
}

/** Nesnenin başvurduğu kimlikler (…Id / …Ids alanları; görsel kayıtlar hariç) */
function basvurular(o: MathObject): string[] {
  const out: string[] = [];
  const tara = (v: unknown, anahtar: string) => {
    if (typeof v === 'string') { if (/Ids?$/.test(anahtar)) out.push(v); return; }
    if (Array.isArray(v)) { for (const x of v) tara(x, anahtar); return; }
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (k === 'labelAnchors' || k === 'bindingTarget' || k === 'suspendedBinding') continue;
        tara(x, k);
      }
    }
  };
  for (const [k, v] of Object.entries(o)) if (k !== 'id') tara(v, k);
  return out;
}

/**
 * Kenar sayısı kaydırıcıya bağlı düzgün çokgenlerin köşe sayısını kaydırıcının değerine eşler. Eksik köşeler yeni
 * noktalarla eklenir (sıradaki harflerle); fazla köşeler ve yalnız onlara dayanan nesneler (ölçülmüş açı, kenara bağlı
 * nokta…) silinir. Çokgenin adı düzgün çokgen adıysa yeni kenar sayısına göre değişir; kenar etiketleri ve eşitlik
 * çentikleri yeni kenarlara uyarlanır. Köşelerin KONUMUNU resolveCommandBindings hesaplar. Değişiklik yoksa AYNI dizi.
 */
export function duzgunCokgenKoseleriniEsle(objects: MathObject[], yeniKimlik: () => string = () => createId('pt')): MathObject[] {
  if (!objects.some((o) => o.type === 'polygon' && o.regularSides)) return objects;
  let sonuc = objects;
  for (const cokgen of objects) {
    if (cokgen.type !== 'polygon' || !cokgen.regularSides) continue;
    const byId = new Map(sonuc.map((o) => [o.id, o]));
    const guncel = byId.get(cokgen.id) as PolygonObject | undefined;
    const kaydirici = byId.get(cokgen.regularSides.sliderId);
    if (!guncel || kaydirici?.type !== 'slider' || guncel.pointIds.length < 2) continue;
    const n = kenarSayisi(kaydirici.value);
    const eskiN = guncel.pointIds.length;
    if (n === eskiN) continue;
    const [birinci, ikinci] = guncel.pointIds;
    const p0 = byId.get(birinci), p1 = byId.get(ikinci);
    if (p0?.type !== 'point' || p1?.type !== 'point') continue;
    const yon = cokgen.regularSides.orientation;
    let pointIds = guncel.pointIds;
    let eklenecek: PointObject[] = [];
    let silinecek = new Set<string>();
    if (n > eskiN) {
      const adlar = generateNextPointLabels(sonuc.filter((o) => o.type === 'point').map((o) => o.label).filter(Boolean), n - eskiN);
      const ornek = byId.get(guncel.pointIds[eskiN - 1]);
      eklenecek = adlar.map((label, i) => {
        const index = eskiN + i;
        const konum = duzgunKose(p0, p1, n, index, yon);
        return {
          id: yeniKimlik(), type: 'point', label, showLabel: ornek?.type === 'point' ? ornek.showLabel : true,
          x: konum.x, y: konum.y, color: ornek?.color ?? p0.color, visible: true, isIndependent: false, createdAt: Date.now(),
          construction: { kind: 'regularVertex', firstId: birinci, secondId: ikinci, sliderId: kaydirici.id, index, orientation: yon },
        } as PointObject;
      });
      pointIds = [...guncel.pointIds, ...eklenecek.map((p) => p.id)];
    } else {
      silinecek = new Set(guncel.pointIds.slice(n));
      pointIds = guncel.pointIds.slice(0, n);
      // Silinen köşelere (dolaylı da olsa) dayanan nesneler de gider; çokgenin kendisi yeni köşeleriyle kalır
      for (let degisti = true; degisti;) {
        degisti = false;
        for (const o of sonuc) {
          if (o.id === cokgen.id || silinecek.has(o.id)) continue;
          if (basvurular(o).some((id) => silinecek.has(id))) { silinecek.add(o.id); degisti = true; }
        }
      }
    }
    const tumKenarlar = (guncel.edgeLabels?.length ?? 0) >= eskiN;
    const edgeLabels = guncel.edgeLabels ? (tumKenarlar ? Array.from({ length: n }, (_, i) => i) : guncel.edgeLabels.filter((i) => i < n)) : undefined;
    const isaretler = guncel.edgeEqualityMarks ? Object.fromEntries(Object.entries(guncel.edgeEqualityMarks).filter(([i]) => Number(i) < n)) : undefined;
    const yeniCokgen: PolygonObject = {
      ...guncel,
      pointIds,
      label: guncel.label === duzgunCokgenAdi(eskiN) ? duzgunCokgenAdi(n) : guncel.label,
      ...(edgeLabels ? { edgeLabels } : {}),
      ...(isaretler ? { edgeEqualityMarks: isaretler } : {}),
    };
    sonuc = [
      ...sonuc.filter((o) => !silinecek.has(o.id)).map((o) => (o.id === cokgen.id ? yeniCokgen : o)),
      ...eklenecek,
    ];
  }
  return sonuc;
}
