import type {
  AngleObject, ArcObject, CircleObject, EllipseObject, FunctionObject, LineObject, MathObject,
  MeasurementObject, PointObject, PolygonObject, RayObject, SectorObject, SegmentObject, SliderObject,
} from '@/types/math';
import {
  angleTrigRatios, calculateAngleDegrees, calculateArcLength, calculateCircleArea,
  calculateCircleCircumference, calculateDistance, calculateEllipseArea, calculateEllipsePerimeter,
  calculateLineEquation, calculatePolygonArea, calculatePolygonPerimeter, calculateSectorArea,
  calculateSlope,
} from '@/math/geometry';
import { formatTurkishNumber } from '@/math/coordinates';
import {
  type Olcu, type YazimAyari, alan, cemberCevresi, cevre, daireAlani, dilimAlani, dilimCevresi,
  egim, elipsAlani, elipsCevresi, kiris, koordinat, olcuMetni, uzunluk, yaricap, yayUzunlugu,
  yazimAyari,
} from '@/math/matematikYazimi';
import {
  type NoktaBul, aciOlcusu, cemberMerkezi, nesnedenNokta, segmentUzunlugu, trigSatirlari,
  yayGeometrisi, yayMerkezAcisi, yayOlcumuYazimi, yayUclari,
} from '@/math/olcuYazimlari';

/**
 * NESNE → PANEL SATIRLARI: Cebir listesi, Özellikler paneli ve araç kutusundaki nesne listesi
 * tuvalle AYNI MEB yazımını göstersin diye nesnelerden anlamsal Olcu kayıtları üretir.
 *
 * Tuval katmanları src/math/olcuYazimlari.ts'i doğrudan kullanır (ekran kutusu, yerleşim);
 * paneller ekran geometrisi bilmediği için buradaki sarmalayıcıları kullanır. Adlandırma kuralı
 * aynıdır: ad YALNIZCA görünen nokta adlarından kurulur, nesnenin .label'ı yazımda kullanılmaz.
 *
 * Tuvalden farkı: panelde nesnenin "göster" anahtarlarına (showArea, showRadius…) BAKILMAZ —
 * panel nesnenin bütün ölçülerini listeler, tuval yalnızca açık olanları çizer.
 */

/**
 * PANELLER HER ZAMAN TAM YAZIMDADIR. "Yalnızca değer" (Kısa) ayarı yalnızca TUVAL etiketlerini
 * seyrekleştirmek içindir; adın okunabildiği yer paneldir (Ayarlar'daki yardım metninin sözü:
 * "tam yazım ipucunda ve panelde görünür"). Açı yazımı seçimi (şapka / ∠) ise panelde de geçerlidir.
 */
export const panelYazimi = (s?: { olcuYazimi?: unknown; aciYazimi?: unknown } | null): YazimAyari =>
  ({ olcuYazimi: 'tam', aciYazimi: yazimAyari(s).aciYazimi });

/** Bir panel satırı: ya anlamsal ölçü ya da yazımı olmayan düz metin (denklem, ışın, fonksiyon…). */
export type PanelSatiri = { tur: 'olcu'; olcu: Olcu } | { tur: 'metin'; metin: string };

export const olcuSatiri = (olcu: Olcu): PanelSatiri => ({ tur: 'olcu', olcu });
export const metinSatiri = (metin: string): PanelSatiri => ({ tur: 'metin', metin });

/** Satırın düz metni (arama süzgeci, title ve eski davranışı koruyan yerler için). */
export const satirMetni = (s: PanelSatiri): string => (s.tur === 'olcu' ? olcuMetni(s.olcu) : s.metin);

/** Nesnenin panelde gösterilecek bütün satırları, düz metin olarak birleştirilmiş hali. */
export const nesneMetni = (obj: MathObject, objects: readonly MathObject[]): string =>
  nesneSatirlari(obj, objects).map(satirMetni).join(', ');

const sayi2 = (v: number) => formatTurkishNumber(v, 2);

/** Çokgenin köşe noktaları (eksik köşeler atılır). */
const cokgenKoseleri = (poly: PolygonObject, nokta: NoktaBul): PointObject[] =>
  poly.pointIds.map((id) => nokta(id)).filter((p): p is PointObject => !!p);

/** Yay / daire diliminin panel satırları: uzunluk, merkez açı, yarıçap (+ dilimde alan ve çevre). */
function yaySatirlari(shape: ArcObject | SectorObject, objects: readonly MathObject[], nokta: NoktaBul): PanelSatiri[] {
  const g = yayGeometrisi(shape, nokta);
  if (!g) return [metinSatiri(shape.type === 'sector' ? 'Daire dilimi' : 'Yay')];
  const merkez = nokta(shape.centerPointId);
  const bas = nokta(shape.startPointId);
  const yon = nokta(shape.directionPointId);
  const uclar = yayUclari(shape, nokta, objects, g);
  const yayBoyu = calculateArcLength(g.radius, g.sweep);
  const derece = (g.sweep * 180) / Math.PI;
  const out: PanelSatiri[] = [
    olcuSatiri(yayUzunlugu(uclar, yayBoyu)),
    olcuSatiri(yayMerkezAcisi(shape, nokta, objects, g, derece)),
  ];
  if (shape.type === 'sector') {
    out.push(olcuSatiri(dilimAlani(bas, merkez, yon, calculateSectorArea(g.radius, g.sweep))));
    out.push(olcuSatiri(dilimCevresi(bas, merkez, yon, yayBoyu + 2 * g.radius)));
  }
  out.push(olcuSatiri(yaricap(merkez, bas, g.radius)));
  if (shape.type === 'arc') {
    const capMi = Math.abs(g.sweep - Math.PI) < 1e-6;
    out.push(olcuSatiri(kiris(bas, uclar.son, 2 * g.radius * Math.sin(g.sweep / 2), capMi)));
  }
  return out;
}

/** Ölçüm nesnesinin (uzunluk, eğim, yay, trigonometri) panel satırları. */
function olcumSatirlari(m: MeasurementObject, objects: readonly MathObject[], nokta: NoktaBul): PanelSatiri[] {
  if (m.kind === 'arc') {
    const y = m.circleId ? yayOlcumuYazimi(m as Parameters<typeof yayOlcumuYazimi>[0], objects, nokta) : null;
    return y ? [olcuSatiri(y.uzunluk), olcuSatiri(y.olcu)] : [metinSatiri('Yay ölçümü')];
  }
  const a = nokta(m.pointIds[0]);
  const b = nokta(m.pointIds[1]);
  if (m.kind === 'distance') {
    return a && b ? [olcuSatiri(uzunluk(a, b, calculateDistance(a, b)))] : [metinSatiri('Uzunluk ölçümü')];
  }
  if (m.kind === 'slope') {
    return a && b ? [olcuSatiri(egim(a, b, calculateSlope(a, b)))] : [metinSatiri('Eğim ölçümü')];
  }
  const [kol1, kose, kol2] = m.pointIds.map((id) => nokta(id));
  if (!kol1 || !kose || !kol2) return [metinSatiri('Trigonometrik oranlar')];
  const o = angleTrigRatios(kol1, kose, kol2);
  return o ? trigSatirlari(kol1, kose, kol2, o).map(olcuSatiri) : [metinSatiri('Dik üçgen değil')];
}

/**
 * Nesnenin panel satırları. İlk satır listede tek satırlık özet olarak kullanılır
 * (Cebir görünümü, araç kutusu); Özellikler paneli hepsini alt alta gösterir.
 */
export function nesneSatirlari(obj: MathObject, objects: readonly MathObject[], noktaBul?: NoktaBul): PanelSatiri[] {
  const nokta = noktaBul ?? nesnedenNokta(objects);
  switch (obj.type) {
    case 'point': {
      const p = obj as PointObject;
      return [olcuSatiri(koordinat(p, p.x, p.y))];
    }
    case 'segment':
      return [olcuSatiri(segmentUzunlugu(obj as SegmentObject, nokta))];
    case 'line': {
      const line = obj as LineObject;
      const p1 = nokta(line.point1Id);
      const p2 = nokta(line.point2Id);
      if (!p1 || !p2) return [metinSatiri('Doğru')];
      const eq = calculateLineEquation(p1, p2);
      return [metinSatiri(eq.equationText), olcuSatiri(egim(p1, p2, eq.slope))];
    }
    case 'ray': {
      const ray = obj as RayObject;
      const p1 = nokta(ray.startPointId);
      const p2 = nokta(ray.throughPointId);
      return [metinSatiri(p1 && p2 ? `[${p1.label}${p2.label}) ışını` : 'Işın')];
    }
    case 'circle': {
      const circ = obj as CircleObject;
      const g = cemberMerkezi(circ, objects, nokta);
      if (!g) return [metinSatiri('Çember')];
      return [
        olcuSatiri(yaricap(g.merkezNoktasi, g.yaricapNoktasi, g.radius)),
        olcuSatiri(daireAlani(calculateCircleArea(g.radius))),
        olcuSatiri(cemberCevresi(calculateCircleCircumference(g.radius))),
      ];
    }
    case 'ellipse': {
      const elp = obj as EllipseObject;
      return [
        olcuSatiri(elipsAlani(calculateEllipseArea(elp.radiusX, elp.radiusY))),
        olcuSatiri(elipsCevresi(calculateEllipsePerimeter(elp.radiusX, elp.radiusY))),
        metinSatiri(`a = ${sayi2(elp.radiusX)} br, b = ${sayi2(elp.radiusY)} br`),
      ];
    }
    case 'arc':
    case 'sector':
      return yaySatirlari(obj as ArcObject | SectorObject, objects, nokta);
    case 'angle': {
      const ang = obj as AngleObject;
      const p1 = nokta(ang.point1Id);
      const v = nokta(ang.vertexPointId);
      const p3 = nokta(ang.point3Id);
      const ic = p1 && v && p3 ? calculateAngleDegrees(p1, v, p3) : 0;
      return [olcuSatiri(aciOlcusu(ang, nokta, ang.reflex ? 360 - ic : ic))];
    }
    case 'polygon': {
      const poly = obj as PolygonObject;
      const koseler = cokgenKoseleri(poly, nokta);
      if (koseler.length < 3) return [metinSatiri(`Çokgen (${poly.pointIds.length} köşe)`)];
      return [
        olcuSatiri(alan(koseler, calculatePolygonArea(koseler))),
        olcuSatiri(cevre(koseler, calculatePolygonPerimeter(koseler))),
      ];
    }
    case 'measurement':
      return olcumSatirlari(obj as MeasurementObject, objects, nokta);
    case 'function':
      return [metinSatiri(`y = ${(obj as FunctionObject).expression}`)];
    case 'slider': {
      const s = obj as SliderObject;
      return [metinSatiri(`${s.variableName || s.label} = ${formatTurkishNumber(s.value)}`)];
    }
    case 'fraction':
      return [metinSatiri(`${obj.numerator ?? 1}/${obj.denominator ?? 1}`)];
    case 'pen':
      return [metinSatiri('Serbest çizim')];
    case 'text':
      return [metinSatiri('Metin notu')];
    case 'image':
      return [metinSatiri('Görsel')];
    default:
      return [metinSatiri(obj.label || obj.type)];
  }
}
