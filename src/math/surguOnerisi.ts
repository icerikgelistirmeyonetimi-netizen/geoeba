import type { MathObject, Point2D, PointObject } from '@/types/math';
import { calculateAngleDegrees, getArcGeometry } from './geometry';

/*
 * KAYDIRICI BAĞLANIRKEN ÖNERİLEN AYAR: ayar penceresinde bir nesnenin özelliği seçilince kaydırıcı o özelliğin şimdiki
 * değeriyle gelir; aralık ve adım özelliğin türüne göre önerilir. Bağlanınca nesne yerinden oynamaz: şimdiki değer
 * tam sayıysa adım 1, değilse 0,1 olur (varsayılanda ondalık adım yalnız bu durumda).
 */

export interface SurguAyari {
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface OzellikDegeri {
  tur: 'uzunluk' | 'aci';
  deger: number;
  /** Açının alabileceği en büyük değer (üçgen köşesinde 180, diğerlerinde 360) */
  enCokAci?: number;
}

const uzaklik = (a: Point2D, b: Point2D) => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Nesnenin bağlanacak özelliğinin şimdiki değeri: uzunluk (doğru parçası, kenar, yarıçap) ya da açı (derece). Kenar sayısı
 * ve bilinmeyen özellikler için null.
 */
export function ozellikDegeri(objects: readonly MathObject[], targetId: string, key: string): OzellikDegeri | null {
  const byId = new Map(objects.map((o) => [o.id, o]));
  const nokta = (id: string | undefined) => {
    const o = id ? byId.get(id) : undefined;
    return o?.type === 'point' ? o : undefined;
  };
  const uzunluk = (a: string | undefined, b: string | undefined): OzellikDegeri | null => {
    const p = nokta(a);
    const q = nokta(b);
    return p && q ? { tur: 'uzunluk', deger: uzaklik(p, q) } : null;
  };
  const hedef = byId.get(targetId);
  if (!hedef) return null;
  switch (hedef.type) {
    case 'segment':
      return key === 'length' ? uzunluk(hedef.startPointId, hedef.endPointId) : null;
    case 'line':
      return key === 'length' ? uzunluk(hedef.point1Id, hedef.point2Id) : null;
    case 'ray':
      return key === 'length' ? uzunluk(hedef.startPointId, hedef.throughPointId) : null;
    case 'angle': {
      const [a, k, b] = [nokta(hedef.point1Id), nokta(hedef.vertexPointId), nokta(hedef.point3Id)];
      if (key !== 'angle' || !a || !k || !b) return null;
      const derece = calculateAngleDegrees(a, k, b);
      return { tur: 'aci', deger: hedef.reflex ? 360 - derece : derece, enCokAci: 360 };
    }
    case 'polygon': {
      const eslesme = /^(edge|angle):(\d+)$/.exec(key);
      if (!eslesme) return null;
      const koseler = hedef.pointIds.map((id) => nokta(id));
      const n = koseler.length;
      const i = Number(eslesme[2]);
      if (i >= n || koseler.some((k) => !k)) return null;
      const k = koseler as PointObject[];
      if (eslesme[1] === 'edge') return { tur: 'uzunluk', deger: uzaklik(k[i], k[(i + 1) % n]) };
      // İç açı: köşe içbükeyse (çokgenin dönüş yönüyle aynı işaretli çapraz çarpım) 360'tan tamamlanır
      const onceki = k[(i + n - 1) % n];
      const sonraki = k[(i + 1) % n];
      const ikiAlan = k.reduce((t, p, j) => t + p.x * k[(j + 1) % n].y - k[(j + 1) % n].x * p.y, 0);
      const capraz = (onceki.x - k[i].x) * (sonraki.y - k[i].y) - (onceki.y - k[i].y) * (sonraki.x - k[i].x);
      const derece = calculateAngleDegrees(onceki, k[i], sonraki);
      return { tur: 'aci', deger: Math.sign(ikiAlan) * capraz > 0 ? 360 - derece : derece, enCokAci: n === 3 ? 180 : 360 };
    }
    case 'circle': {
      if (key !== 'radius') return null;
      if (hedef.fixedRadius !== undefined) return { tur: 'uzunluk', deger: hedef.fixedRadius };
      return uzunluk(hedef.centerPointId, hedef.radiusPointId);
    }
    case 'arc':
    case 'sector': {
      if (key === 'radius') return uzunluk(hedef.centerPointId, hedef.startPointId);
      const [m, bas, yon] = [nokta(hedef.centerPointId), nokta(hedef.startPointId), nokta(hedef.directionPointId)];
      const geo = key === 'centralAngle' && m && bas && yon ? getArcGeometry(m, bas, yon) : null;
      return geo ? { tur: 'aci', deger: (geo.sweep * 180) / Math.PI, enCokAci: 360 } : null;
    }
    case 'ellipse':
      if (key === 'radiusX' || key === 'radiusY') return { tur: 'uzunluk', deger: hedef[key] };
      return key === 'rotation' ? { tur: 'aci', deger: hedef.rotation ?? 0, enCokAci: 360 } : null;
    default:
      return null;
  }
}

const tamMi = (v: number) => Math.abs(v - Math.round(v)) < 1e-9;
const birOndalik = (v: number) => Math.round(v * 10) / 10;

/**
 * Önerilen ayar: uzunlukta 1 … en az 10, açıda 0 … en çok açı. Değer tam sayıysa adım 1, değilse 0,1 (bağlanınca nesne
 * yerinden oynamasın).
 */
export function onerilenSurguAyari({ tur, deger, enCokAci = 360 }: OzellikDegeri): SurguAyari {
  const tam = tamMi(deger);
  const v = tam ? Math.round(deger) : birOndalik(deger);
  if (tur === 'uzunluk') {
    return tam ? { min: 1, max: Math.max(10, v), step: 1, value: v } : { min: 0.1, max: Math.max(10, Math.ceil(deger)), step: 0.1, value: Math.max(0.1, v) };
  }
  return { min: 0, max: enCokAci, step: tam ? 1 : 0.1, value: Math.min(enCokAci, v) };
}

/** Kullanıcının yazdığı aralık değeri kapsıyor ve değer adım ızgarasında mı (öyleyse yalnız değer değişir) */
export function ayarDegeriKapsar(min: number | null, max: number | null, step: number | null, value: number): boolean {
  if (min === null || max === null || step === null || !(step > 0) || min >= max || value < min || value > max) return false;
  const adim = (value - min) / step;
  return Math.abs(adim - Math.round(adim)) < 1e-6;
}
