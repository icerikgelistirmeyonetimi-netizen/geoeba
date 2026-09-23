import type {
  AngleObject, ArcObject, CircleObject, EllipseObject, MathObject, MeasurementKind, Point2D, PointObject,
  PolygonObject, SectorObject, SegmentObject, ViewportTransform,
} from '@/types/math';
import { worldToScreen } from '@/math/coordinates';
import { anchoredLabelPosition } from '@/math/labelAnchors';
import { labelLayoutViewport, projectLabelPoint } from '@/math/labelViewport';
import {
  calculateArcLength, calculateCircleArea, calculateCircleCircumference, calculateDistance,
  calculateEllipseArea, calculateEllipsePerimeter, calculatePolygonArea, calculatePolygonPerimeter,
  calculateSectorArea, getArcGeometry,
} from '@/math/geometry';
import {
  type Adli, type Baslik, type Dugum, type Olcu, type Secenek, type YayUclari, type YazimAyari,
  aci, alan, cemberBasligi, cemberCevresi, cevre, daireAlani, dilimAlani, dilimCevresi,
  elipsAlani, elipsCevresi, kiris, kullanilabilirAd, merkezAci, olcuDugumleri, sayi, sesli, trigDegeri, trigOrani,
  uzunluk, yaricap, yayOlcusu, yayUzunlugu,
} from '@/math/matematikYazimi';
import { type Kutu, type KutuOlcusu, type Nokta, kutuOlcusu } from '@/math/yazimDuzeni';
import { type ArcMeasurement, TAU, circleGeometryOf, resolveArc, yayIcNoktasi } from '@/math/arcMeasure';

/**
 * NESNE → ÖLÇÜ YAZIMI: tuval katmanları, paneller ve komut motoru aynı kuralları kullansın diye
 * MathObject'lerden anlamsal Olcu kayıtları üretir (src/math/matematikYazimi.ts).
 *
 * Kural: ad YALNIZCA görünen nokta adlarından kurulur; nesnenin .label'ı ('Çokgen', 'BC Yayı',
 * 'A Merkezli Çember') yazımda hiç kullanılmaz. Ad kurulamazsa yazım sözcüğe düşer ('Alan = …').
 *
 * Motor tarafındaki ikizi src/math/commands/handlers/measure/common.ts'tir (CommandScene ile çalışır);
 * yay ucu / ara nokta / merkez açı kuralları iki yerde AYNI olmak zorundadır.
 */

export type NoktaBul = (id: string | undefined) => PointObject | null;

/** pointsById haritasından NoktaBul üretir. */
export const noktaBulucu = (harita: ReadonlyMap<string, PointObject>): NoktaBul =>
  (id) => (id ? harita.get(id) ?? null : null);

/** objects dizisinden NoktaBul üretir (panel ve motor yolu). */
export function nesnedenNokta(objects: readonly MathObject[]): NoktaBul {
  const harita = new Map<string, PointObject>();
  for (const o of objects) if (o.type === 'point') harita.set(o.id, o as PointObject);
  return (id) => (id ? harita.get(id) ?? null : null);
}

// ------------------------------------------------------------------------------------------------ tam / kısa

export interface IkiYazim {
  tam: Dugum[];
  kisa: Dugum[];
}

/**
 * Bir ölçünün iki biçimi. `tam` kullanıcının AYARINDAN gelir (ayar Kısa ise ikisi de kısadır);
 * `kisa` çizgiye ya da açıya sığmayan etiketin düştüğü biçimdir.
 */
export function yazimlar(o: Olcu, ayar: YazimAyari): IkiYazim {
  const tam = olcuDugumleri(o, ayar);
  return { tam, kisa: ayar.olcuYazimi === 'kisa' ? tam : olcuDugumleri(o, { ...ayar, olcuYazimi: 'kisa' }) };
}

// ------------------------------------------------------------------------------------------------ doğru parçası

/** |AB| = 10,39 br — ölçü aracıyla kurulan parçalarda birim 'cm' olabilir. */
export function segmentUzunlugu(seg: SegmentObject, nokta: NoktaBul): Olcu {
  const p1 = nokta(seg.startPointId);
  const p2 = nokta(seg.endPointId);
  const birim = seg.unit === 'cm' || (!seg.unit && seg.label?.includes('cm')) ? 'cm' : 'br';
  return uzunluk(p1, p2, p1 && p2 ? calculateDistance(p1, p2) : 0, { birim });
}

/** Çokgenin i. kenarı: |AB| (köşeler sırayla). */
export const kenarUzunlugu = (koseler: readonly PointObject[], i: number): Olcu => {
  const a = koseler[i];
  const b = koseler[(i + 1) % koseler.length];
  return uzunluk(a, b, calculateDistance(a, b));
};

// ------------------------------------------------------------------------------------------------ açı

/**
 * m(ABC^) — dış (reflex) açıda değer 360° − iç açıdır ve yazıma ' (dış açı)' niteleyicisi eklenir.
 * `derece` çağırandan gelir: tuval onu zaten hesaplamıştır (iç/dış seçimiyle birlikte).
 */
export function aciOlcusu(ang: AngleObject, nokta: NoktaBul, derece: number, s?: Secenek): Olcu {
  return aci(nokta(ang.point1Id), nokta(ang.vertexPointId), nokta(ang.point3Id), derece, {
    ...s,
    disAci: !!ang.reflex,
  });
}

/**
 * Açı rozetlerinin TAM/KISA kararı grup grup verilir: bir çokgenin bütün köşe açıları birlikte
 * karar verir (biri sığmıyorsa hepsi kısaya düşer), tek başına duran açı kendi grubudur.
 */
export function aciGrubu(ang: AngleObject, objects: readonly MathObject[]): string {
  for (const o of objects) {
    if (o.type !== 'polygon' || o.visible === false) continue;
    const ids = (o as PolygonObject).pointIds;
    const n = ids.length;
    const k = ids.indexOf(ang.vertexPointId);
    if (k < 0) continue;
    const onceki = ids[(k - 1 + n) % n];
    const sonraki = ids[(k + 1) % n];
    const komsu = (ang.point1Id === onceki && ang.point3Id === sonraki) || (ang.point1Id === sonraki && ang.point3Id === onceki);
    if (komsu) return `poly:${o.id}`;
  }
  return `aci:${ang.id}`;
}

// ------------------------------------------------------------------------------------------------ trigonometri

export interface TrigOranlari {
  derece: number;
  sin: number;
  cos: number;
  tan: number | null;
  dikKose: 'vertex' | 'p1' | 'p3' | null;
  kenarlar: { karsi: number; komsu: number; hipotenus: number } | null;
}

/**
 * Dik üçgende oranlar kenar adlarıyla yazılır: 'sin B̂ = |AC| / |BC| = 3 / 5 = 0,6'.
 * Dik açı ÖLÇÜLEN köşedeyse (ya da üçgen dik değilse) bugünkü gibi yalnızca değer yazılır.
 * Kenarlar geometry.ts'in kuralıyla eşleşir: dik köşe p1 → komşu [köşe, kol1], karşı [kol1, kol2],
 * hipotenüs [köşe, kol2]; dik köşe p3 → komşu [köşe, kol2], karşı [kol1, kol2], hipotenüs [köşe, kol1].
 */
export function trigSatirlari(kol1: PointObject, kose: PointObject, kol2: PointObject, o: TrigOranlari): Olcu[] {
  const k = o.kenarlar;
  const kenar = (tur: 'karsi' | 'komsu' | 'hipotenus'): [Adli | null, Adli | null] | null => {
    if (!k) return null;
    if (o.dikKose === 'p1') return tur === 'komsu' ? [kose, kol1] : tur === 'karsi' ? [kol1, kol2] : [kose, kol2];
    if (o.dikKose === 'p3') return tur === 'komsu' ? [kose, kol2] : tur === 'karsi' ? [kol1, kol2] : [kose, kol1];
    return null;
  };
  const oran = (fn: 'sin' | 'cos' | 'tan', pay: 'karsi' | 'komsu', payda: 'hipotenus' | 'komsu', deger: number | null): Olcu =>
    k
      ? trigOrani(fn, kose, kenar(pay), kenar(payda), k[pay], k[payda], deger)
      : trigDegeri(fn, kose, deger);
  return [
    aci(kol1, kose, kol2, o.derece, { basamak: 1 }),
    oran('sin', 'karsi', 'hipotenus', o.sin),
    oran('cos', 'komsu', 'hipotenus', o.cos),
    oran('tan', 'karsi', 'komsu', o.tan),
  ];
}

// ------------------------------------------------------------------------------------------------ yay ve daire dilimi

/** Yayın 180° sınırı: ekranda 0,1° duyarlılıkla yazıldığı için kaba tutulur (motorla aynı). */
const YAY_EPS = 1e-4;

export interface YayGeometrisi {
  radius: number;
  startAngle: number;
  sweep: number;
}

const yayUstunde = (merkez: Point2D, r: number, p: Point2D) =>
  Math.abs(calculateDistance(merkez, p) - r) <= 1e-6 * Math.max(1, r);
const yayAcisi = (merkez: Point2D, bas: number, p: Point2D) =>
  ((Math.atan2(p.y - merkez.y, p.x - merkez.x) - bas) % TAU + TAU) % TAU;

/** Yayın ÜZERİNDE, uçlar dışında, ortasına en yakın adlandırılabilir nokta (büyük yay / yarım çember). */
function yayAraNoktasi(
  shape: ArcObject | SectorObject, objects: readonly MathObject[], merkez: Point2D, g: YayGeometrisi,
): PointObject | undefined {
  let best: { p: PointObject; d: number } | undefined;
  for (const o of objects) {
    if (o.type !== 'point' || o.visible === false) continue;
    const p = o as PointObject;
    if (p.id === shape.startPointId || p.id === shape.centerPointId || p.id === shape.directionPointId) continue;
    if (!kullanilabilirAd(p)) continue;
    if (!yayUstunde(merkez, g.radius, p)) continue;
    const u = yayAcisi(merkez, g.startAngle, p);
    if (!(u > 1e-6 && u < g.sweep - 1e-6)) continue;
    const d = Math.abs(u - g.sweep / 2);
    if (!best || d < best.d) best = { p, d };
  }
  return best?.p;
}

/**
 * Yay / daire diliminin uçları. Yön noktası yayın ÜZERİNDE değilse (yalnızca yönü veriyorsa) son uç
 * adlandırmada KULLANILMAZ: '|A͡B|' yerine 'Yay uzunluğu ≈ …' yazılır.
 */
export function yayUclari(
  shape: ArcObject | SectorObject, nokta: NoktaBul, objects: readonly MathObject[], g: YayGeometrisi,
): YayUclari {
  const merkez = nokta(shape.centerPointId);
  const yon = nokta(shape.directionPointId);
  const buyuk = g.sweep > Math.PI + YAY_EPS;
  const yarim = Math.abs(g.sweep - Math.PI) <= YAY_EPS;
  return {
    bas: nokta(shape.startPointId),
    son: merkez && yon && yayUstunde(merkez, g.radius, yon) ? yon : null,
    ara: merkez && (buyuk || yarim) ? yayAraNoktasi(shape, objects, merkez, g) : undefined,
    buyuk,
    yarim,
  };
}

/** Yay / daire diliminin merkez açısı: ucu yayın üzerinde olan YAYDA m(A͡B), yoksa m(∠AOB). */
export function yayMerkezAcisi(
  shape: ArcObject | SectorObject, nokta: NoktaBul, objects: readonly MathObject[], g: YayGeometrisi,
  derece: number, s?: Secenek,
): Olcu {
  const uclar = yayUclari(shape, nokta, objects, g);
  if (shape.type === 'arc' && uclar.son) return yayOlcusu(uclar, derece, s);
  return merkezAci(nokta(shape.startPointId), nokta(shape.centerPointId), nokta(shape.directionPointId), derece, s);
}

/**
 * Yay / daire diliminin açık ölçüleri (tuval 4.5 katmanı): yay uzunluğu, dilim alanı/çevresi,
 * yarıçap, kiriş ya da çap. Sıra bugünkü sırayla aynıdır; anahtarlar (sürükleme/gizleme) değişmez.
 */
export function yayOlculeri(
  shape: ArcObject | SectorObject, nokta: NoktaBul, objects: readonly MathObject[], g: YayGeometrisi,
): { kind: MeasurementKind; olcu: Olcu }[] {
  const out: { kind: MeasurementKind; olcu: Olcu }[] = [];
  const uclar = yayUclari(shape, nokta, objects, g);
  const merkez = nokta(shape.centerPointId);
  const bas = nokta(shape.startPointId);
  const yon = nokta(shape.directionPointId);
  const isSector = shape.type === 'sector';
  const yayBoyu = calculateArcLength(g.radius, g.sweep);
  if (shape.showArcLength) out.push({ kind: 'arcLength', olcu: yayUzunlugu(uclar, yayBoyu) });
  if (isSector && (shape as SectorObject).showArea) {
    out.push({ kind: 'area', olcu: dilimAlani(bas, merkez, yon, calculateSectorArea(g.radius, g.sweep)) });
  }
  if (isSector && (shape as SectorObject).showPerimeter) {
    out.push({ kind: 'perimeter', olcu: dilimCevresi(bas, merkez, yon, yayBoyu + 2 * g.radius) });
  }
  if (shape.showRadius) out.push({ kind: 'radius', olcu: yaricap(merkez, bas, g.radius) });
  if (shape.showChordLength) {
    const capMi = Math.abs(g.sweep - Math.PI) < 1e-6;
    out.push({ kind: 'chordLength', olcu: kiris(bas, uclar.son, 2 * g.radius * Math.sin(g.sweep / 2), capMi) });
  }
  return out;
}

/**
 * İki nokta arasındaki yay ÖLÇÜMÜ (7.5 katmanı). Adlar, büyük/yarım kararı ve ara nokta
 * arcMeasure.ts'ten (resolveArc + yayIcNoktasi) gelir: rozet ile 'BD yayı' başlığı asla çelişmez.
 */
export function yayOlcumuYazimi(
  m: ArcMeasurement, objects: readonly MathObject[], nokta: NoktaBul,
): { uzunluk: Olcu; olcu: Olcu } | null {
  const r = resolveArc(m, objects);
  if (!r) return null;
  const T = nokta(m.throughPointId);
  const u = T ? yayAcisi(r.center, r.startAngle, T) : -1;
  const icte = T && u > 1e-7 && u < r.sweep - 1e-7 ? T : undefined;
  const uclar: YayUclari = {
    bas: nokta(m.pointIds[0]),
    son: nokta(m.pointIds[1]),
    ara: r.major || r.half ? icte ?? yayIcNoktasi(m, objects, r) : undefined,
    buyuk: r.major,
    yarim: r.half,
  };
  return { uzunluk: yayUzunlugu(uclar, r.length), olcu: yayOlcusu(uclar, r.degrees, { basamak: 1 }) };
}

// ------------------------------------------------------------------------------------------------ ölçüm kartları

export type KartTuru = 'cokgen' | 'cember' | 'elips';
export type KartSatiri = 'baslik' | 'yaricap' | 'alan' | 'cevre';

export interface OlcumKarti {
  id: string;
  tur: KartTuru;
  /** labelOffsets / gizleme anahtarı — bugünkü kural: alan varsa 'area', yoksa 'perimeter'. */
  anahtar: 'area' | 'perimeter';
  satirlar: Dugum[][];
  satirTurleri: KartSatiri[];
  /** Ekran okuyucu metni (satırlar birleşik) */
  sesli: string;
  olcu: KutuOlcusu;
  /** Kutunun MERKEZİ (ekran px), sürükleme kayıklığı UYGULANMADAN */
  merkez: Nokta;
  /** Sürükleme kayıklığı UYGULANMIŞ ekran kutusu (çakışma denetimleri bunu kullanır) */
  kutu: Kutu;
}

export interface KartGirdisi {
  objects: readonly MathObject[];
  viewport: ViewportTransform;
  yazim: YazimAyari;
  /** Canvas'ın fs(temel, 'measure') işlevi */
  px: (temel: number) => number;
}

const kartSesli = (satirlar: (Olcu | Baslik)[]): string =>
  satirlar.map((s) => ('tur' in s ? sesli(s) : s.sesli)).join('. ');

const kartDugumleri = (satirlar: (Olcu | Baslik)[], ayar: YazimAyari): Dugum[][] =>
  satirlar.map((s) => ('tur' in s ? olcuDugumleri(s, ayar) : s.dugumler));

/** Çokgenin alan/çevre kartının satırları (A(ABC) = …, Ç(ABC) = …). */
export function cokgenKartSatirlari(
  girdi: readonly PointObject[], alanVar: boolean, cevreVar: boolean,
): { olculer: Olcu[]; turler: KartSatiri[] } {
  const koseler = [...girdi];
  const olculer: Olcu[] = [];
  const turler: KartSatiri[] = [];
  if (alanVar) { olculer.push(alan(koseler, calculatePolygonArea(koseler))); turler.push('alan'); }
  if (cevreVar) { olculer.push(cevre(koseler, calculatePolygonPerimeter(koseler))); turler.push('cevre'); }
  return { olculer, turler };
}

/** Çemberin kartı: başlık Ç(O, r), yarıçap r = |OT|, Alan = πr², Çevre = 2πr. */
export function cemberKartSatirlari(
  merkez: PointObject | null, yaricapNoktasi: PointObject | null, r: number, alanVar: boolean, cevreVar: boolean,
): { satirlar: (Olcu | Baslik)[]; turler: KartSatiri[] } {
  const satirlar: (Olcu | Baslik)[] = [];
  const turler: KartSatiri[] = [];
  const baslik = cemberBasligi(merkez);
  if (baslik) { satirlar.push(baslik); turler.push('baslik'); }
  satirlar.push(yaricap(merkez, yaricapNoktasi, r));
  turler.push('yaricap');
  if (alanVar) { satirlar.push(daireAlani(calculateCircleArea(r))); turler.push('alan'); }
  if (cevreVar) { satirlar.push(cemberCevresi(calculateCircleCircumference(r))); turler.push('cevre'); }
  return { satirlar, turler };
}

/** Elipsin kartı: Alan = πab ≈ …, Çevre ≈ … (çevre her zaman yaklaşıktır). */
export function elipsKartSatirlari(
  a: number, b: number, alanVar: boolean, cevreVar: boolean,
): { olculer: Olcu[]; turler: KartSatiri[] } {
  const olculer: Olcu[] = [];
  const turler: KartSatiri[] = [];
  if (alanVar) { olculer.push(elipsAlani(calculateEllipseArea(a, b))); turler.push('alan'); }
  if (cevreVar) { olculer.push(elipsCevresi(calculateEllipsePerimeter(a, b))); turler.push('cevre'); }
  return { olculer, turler };
}

/** Çemberin ekrandaki merkezi ve yarıçap noktası (üç noktadan geçen çemberde merkez ADSIZDIR). */
export function cemberMerkezi(
  circ: CircleObject, objects: readonly MathObject[], nokta: NoktaBul,
): { merkez: Point2D; radius: number; merkezNoktasi: PointObject | null; yaricapNoktasi: PointObject | null } | null {
  const g = circleGeometryOf(circ, objects);
  if (!g) return null;
  const uc = circ.throughPointIds && circ.throughPointIds.length === 3;
  return {
    merkez: g.center,
    radius: g.radius,
    merkezNoktasi: uc ? null : nokta(circ.centerPointId),
    yaricapNoktasi: uc ? null : nokta(circ.radiusPointId),
  };
}

/** Kartın üst kenarından merkezine: kutular bugünkü ÜST kenarlarında kalsın diye (sürükleme kayıklıkları tutar). */
const kartMerkezi = (cx: number, ust: number, olcu: KutuOlcusu): Nokta => ({ x: cx, y: ust + olcu.yukseklik / 2 });

/** Kenar etiketinin kenardan uzaklığı (Canvas 4. katmanla aynı: kutu yarı yüksekliği + bu pay). */
const KENAR_ETIKET_PAYI = 12;

/**
 * Alan/çevre kartının üst kenarı: çokgenin en alt köşesinin altı. Kenar uzunluğu etiketleri açıkken
 * alttaki kenarın etiketi de hesaba katılır, yoksa kart onun üstüne biner.
 */
function cokgenKartUstu(
  ekran: Nokta[], edgeLabels: readonly number[] | undefined, kenarKutuYuksekligi: number, taban: number,
): number {
  const altY = Math.max(...ekran.map((p) => p.y));
  let en = altY + taban;
  if (!edgeLabels?.length) return en;
  const cx = ekran.reduce((t, p) => t + p.x, 0) / ekran.length;
  const cy = ekran.reduce((t, p) => t + p.y, 0) / ekran.length;
  for (const i of edgeLabels) {
    if (i < 0 || i >= ekran.length) continue;
    const a = ekran[i];
    const b = ekran[(i + 1) % ekran.length];
    const ox = (a.x + b.x) / 2;
    const oy = (a.y + b.y) / 2;
    const boy = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let ny = (b.x - a.x) / boy;
    if ((ox - cx) * (-(b.y - a.y) / boy) + (oy - cy) * ny < 0) ny = -ny;
    const alt = oy + ny * (kenarKutuYuksekligi / 2 + KENAR_ETIKET_PAYI) + kenarKutuYuksekligi / 2;
    en = Math.max(en, alt + 4);
  }
  return en;
}

/**
 * ÖLÇÜM KARTLARI ÖN GEÇİŞİ — çokgen alan/çevre, çember ve elips kartlarının ekran kutuları.
 * Tuvalin 4, 4.6, 5, 6 (açı rozetleri) ve 7.5 (yay rozetleri) katmanları bu TEK listeyi okur:
 * kart ölçüsü iki kez hesaplanmaz ve rozetler kartların üstüne düşmez.
 */
export function olcumKartKutulari(g: KartGirdisi): OlcumKarti[] {
  const { objects, viewport, yazim, px } = g;
  const z = viewport.zoom || 1;
  const layoutViewport = labelLayoutViewport(viewport);
  const out: OlcumKarti[] = [];
  const ekle = (
    id: string, tur: KartTuru, alanVar: boolean, satirlar: (Olcu | Baslik)[], turler: KartSatiri[],
    cx: number, ust: number, boy: number, kayiklik: { x: number; y: number } | undefined,
  ) => {
    const dugumler = kartDugumleri(satirlar, yazim);
    const olcu = kutuOlcusu(dugumler, boy);
    // Doğal merkez referans ölçekte yerleşir ve dünya konumunu korur.
    // Yazı ile gerçek çakışma kutusunun piksel boyutu zoomdan bağımsızdır.
    const merkez = projectLabelPoint(kartMerkezi(cx, ust, olcu), viewport);
    const anchor = objects.find(o => o.id === id)?.labelAnchors?.[alanVar ? 'area' : 'perimeter'];
    const fixed = anchor ? anchoredLabelPosition(anchor, objects, olcu.genislik / z) : null;
    const screen = fixed ? worldToScreen(fixed, viewport) : null;
    const dx = screen ? screen.x - merkez.x : kayiklik ? kayiklik.x * z : 0;
    const dy = screen ? screen.y - merkez.y : kayiklik ? -kayiklik.y * z : 0;
    out.push({
      id, tur,
      anahtar: alanVar ? 'area' : 'perimeter',
      satirlar: dugumler,
      satirTurleri: turler,
      sesli: kartSesli(satirlar),
      olcu,
      merkez,
      kutu: {
        x0: merkez.x + dx - olcu.genislik / 2,
        y0: merkez.y + dy - olcu.yukseklik / 2,
        x1: merkez.x + dx + olcu.genislik / 2,
        y1: merkez.y + dy + olcu.yukseklik / 2,
      },
    });
  };
  const nokta = nesnedenNokta(objects);

  for (const o of objects) {
    if (o.visible === false) continue;
    const alanVar = !!(o as PolygonObject).showArea;
    const cevreVar = !!(o as PolygonObject).showPerimeter;
    if (!alanVar && !cevreVar) continue;
    const kayiklik = o.labelOffsets?.[alanVar ? 'area' : 'perimeter'];

    if (o.type === 'polygon') {
      const poly = o as PolygonObject;
      const koseler = poly.pointIds.map((id) => nokta(id)).filter((p): p is PointObject => !!p);
      if (koseler.length < 3 || koseler.length !== poly.pointIds.length) continue;
      const ekran = koseler.map((p) => worldToScreen(p, layoutViewport));
      const cx = ekran.reduce((t, p) => t + p.x, 0) / ekran.length;
      const { olculer, turler } = cokgenKartSatirlari(koseler, alanVar, cevreVar);
      // Bugünkü üst kenar: en alt köşenin 24 (tek satırda 22) px altı — kayıklıklar yerinde kalsın.
      // Kenar etiketleri açıksa kart onların da ALTINA iner (yoksa alt kenarın etiketini örtüyordu).
      const kenarBoyu = kutuOlcusu([[sayi(0)]], px(11)).yukseklik;
      const ust = cokgenKartUstu(ekran, poly.edgeLabels, kenarBoyu, olculer.length > 1 ? 24 : 22);
      ekle(poly.id, 'cokgen', alanVar, olculer, turler, cx, ust, px(11), kayiklik);
      continue;
    }
    if (o.type === 'circle') {
      const c = cemberMerkezi(o as CircleObject, objects, nokta);
      if (!c) continue;
      const ekran = worldToScreen(c.merkez, layoutViewport);
      const { satirlar, turler } = cemberKartSatirlari(c.merkezNoktasi, c.yaricapNoktasi, c.radius, alanVar, cevreVar);
      ekle(o.id, 'cember', alanVar, satirlar, turler, ekran.x, ekran.y + c.radius * layoutViewport.zoom + 14, px(11), kayiklik);
      continue;
    }
    if (o.type === 'ellipse') {
      const elp = o as EllipseObject;
      const merkez = nokta(elp.centerPointId);
      if (!merkez) continue;
      const ekran = worldToScreen(merkez, layoutViewport);
      const ryPx = Math.abs(elp.radiusY) * layoutViewport.zoom;
      const { olculer, turler } = elipsKartSatirlari(elp.radiusX, elp.radiusY, alanVar, cevreVar);
      ekle(elp.id, 'elips', alanVar, olculer, turler, ekran.x, ekran.y + ryPx + (olculer.length > 1 ? 4 : 14), px(11), kayiklik);
    }
  }
  return out;
}

/** Yay / daire dilimi geometrisi (tuvalin kullandığı biçimde); çözülemezse null. */
export function yayGeometrisi(shape: ArcObject | SectorObject, nokta: NoktaBul): YayGeometrisi | null {
  const merkez = nokta(shape.centerPointId);
  const bas = nokta(shape.startPointId);
  const yon = nokta(shape.directionPointId);
  if (!merkez || !bas || !yon) return null;
  const g = getArcGeometry(merkez, bas, yon);
  return g ? { radius: g.radius, startAngle: g.startAngle, sweep: g.sweep } : null;
}
