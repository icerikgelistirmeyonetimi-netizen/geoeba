import { describe, expect, it } from 'vitest';
import type {
  AngleObject, ArcObject, CircleObject, EllipseObject, MathObject, PointObject, PolygonObject,
  SectorObject, SegmentObject, ViewportTransform,
} from '@/types/math';
import { VARSAYILAN_YAZIM, duzMetin, olcuMetni, type YazimAyari } from '@/math/matematikYazimi';
import {
  aciGrubu, aciOlcusu, cemberKartSatirlari, cokgenKartSatirlari, elipsKartSatirlari, kenarUzunlugu,
  nesnedenNokta, noktaBulucu, olcumKartKutulari, segmentUzunlugu, trigSatirlari, yayGeometrisi,
  yayMerkezAcisi, yayOlcumuYazimi, yayOlculeri, yayUclari, yazimlar,
} from '@/math/olcuYazimlari';
import { aciRozetiYerlesimi, kutuOlcusu, type RozetAdayi } from '@/math/yazimDuzeni';
import { aci, olcuDugumleri } from '@/math/matematikYazimi';
import type { ArcMeasurement } from '@/math/arcMeasure';
import { screenToWorld } from '@/math/coordinates';

/**
 * Tuval etiketlerinin MEB yazımı: nesne → Olcu uyarlayıcıları, ölçüm kartlarının ekran kutuları ve
 * açı rozetlerinin tam/kısa kararı. Tuval JSX'i çizemeyen node ortamında kuralların kendisi sınanır.
 */

/** Şapkalı köşe adı: 'A' + U+0302 (önceden birleşik 'Â' DEĞİL). */
const SA = 'Â';

const KISA: YazimAyari = { olcuYazimi: 'kisa', aciYazimi: 'sapka' };
const ISARET: YazimAyari = { olcuYazimi: 'tam', aciYazimi: 'isaret' };

let sayac = 0;
function nokta(label: string, x: number, y: number, ek: Partial<PointObject> = {}): PointObject {
  return {
    id: `p${++sayac}_${label}`, type: 'point', label, x, y,
    color: '#2563eb', visible: true, showLabel: true, createdAt: sayac, isIndependent: true, ...ek,
  } as PointObject;
}

const govde = <T extends MathObject>(o: Partial<T> & { type: T['type']; id: string }): T =>
  ({ label: o.id, color: '#0284c7', visible: true, showLabel: true, createdAt: 1, ...o }) as T;

const GORUNUM: ViewportTransform = {
  zoom: 40, panX: 0, panY: 0, width: 800, height: 600,
  showGrid: true, showAxes: true, showCoordinates: false, snapToGrid: false, gridStep: 1,
} as ViewportTransform;

const bul = (ps: PointObject[]) => noktaBulucu(new Map(ps.map((p) => [p.id, p])));

// ------------------------------------------------------------------------------------------------ uzunluk

describe('doğru parçası ve kenar uzunluğu', () => {
  const A = nokta('A', 0, 0);
  const B = nokta('B', 3, 4);

  it('|AB| = 5 br yazar', () => {
    const seg = govde<SegmentObject>({ id: 's1', type: 'segment', startPointId: A.id, endPointId: B.id });
    expect(olcuMetni(segmentUzunlugu(seg, bul([A, B])))).toBe('|AB| = 5 br');
  });

  it('ölçü aracının cm birimini korur', () => {
    const seg = govde<SegmentObject>({ id: 's1', type: 'segment', startPointId: A.id, endPointId: B.id, unit: 'cm' });
    expect(olcuMetni(segmentUzunlugu(seg, bul([A, B])))).toBe('|AB| = 5 cm');
  });

  it('eski kayıtlarda birim etiketten okunur', () => {
    const seg = govde<SegmentObject>({ id: 's1', type: 'segment', label: '|AB| (cm)', startPointId: A.id, endPointId: B.id });
    expect(olcuMetni(segmentUzunlugu(seg, bul([A, B])))).toBe('|AB| = 5 cm');
  });

  it('adı gizli uçta yalnızca değer yazar', () => {
    const G = nokta('B', 3, 4, { showLabel: false });
    const seg = govde<SegmentObject>({ id: 's1', type: 'segment', startPointId: A.id, endPointId: G.id });
    expect(olcuMetni(segmentUzunlugu(seg, bul([A, G])))).toBe('5 br');
  });

  it('yuvarlanan değer ≈ alır', () => {
    const C = nokta('C', 1, 1);
    const seg = govde<SegmentObject>({ id: 's1', type: 'segment', startPointId: A.id, endPointId: C.id });
    expect(olcuMetni(segmentUzunlugu(seg, bul([A, C])))).toBe('|AC| ≈ 1,41 br');
  });

  it('çokgen kenarı köşe sırasını kullanır', () => {
    const C = nokta('C', 0, 4);
    expect(olcuMetni(kenarUzunlugu([A, B, C], 0))).toBe('|AB| = 5 br');
    expect(olcuMetni(kenarUzunlugu([A, B, C], 2))).toBe('|CA| = 4 br');
  });

  it('kısa yazım yalnızca değer verir, tam yazım adı taşır', () => {
    const seg = govde<SegmentObject>({ id: 's1', type: 'segment', startPointId: A.id, endPointId: B.id });
    const { tam, kisa } = yazimlar(segmentUzunlugu(seg, bul([A, B])), VARSAYILAN_YAZIM);
    expect(duzMetin(tam)).toBe('|AB| = 5 br');
    expect(duzMetin(kisa)).toBe('5 br');
  });

  it('ayar kısa iken iki biçim de kısadır', () => {
    const seg = govde<SegmentObject>({ id: 's1', type: 'segment', startPointId: A.id, endPointId: B.id });
    const { tam, kisa } = yazimlar(segmentUzunlugu(seg, bul([A, B])), KISA);
    expect(duzMetin(tam)).toBe('5 br');
    expect(duzMetin(kisa)).toBe('5 br');
  });
});

// ------------------------------------------------------------------------------------------------ açı

describe('açı ölçüsü ve rozet grubu', () => {
  const A = nokta('A', 0, 0);
  const B = nokta('B', 4, 0);
  const C = nokta('C', 4, 3);
  const ang = govde<AngleObject>({ id: 'a1', type: 'angle', label: '∠ABC', point1Id: A.id, vertexPointId: B.id, point3Id: C.id });

  it('m(∠ABC) yazar (şapka ayarı düz metinde ∠ ile gösterilir)', () => {
    expect(olcuMetni(aciOlcusu(ang, bul([A, B, C]), 90, { basamak: 1 }))).toBe('m(∠ABC) = 90°');
  });

  it('∠ ayarında da aynı metni verir', () => {
    expect(olcuMetni(aciOlcusu(ang, bul([A, B, C]), 90, { basamak: 1 }), ISARET)).toBe('m(∠ABC) = 90°');
  });

  it('dış açıda niteleyici ekler', () => {
    const dis = { ...ang, reflex: true };
    expect(olcuMetni(aciOlcusu(dis, bul([A, B, C]), 300, { basamak: 1 }))).toBe('m(∠ABC) = 300° (dış açı)');
  });

  it('ondalıklı derece ≈ ile yazılır', () => {
    expect(olcuMetni(aciOlcusu(ang, bul([A, B, C]), 36.8699, { basamak: 1 }))).toBe('m(∠ABC) ≈ 36,9°');
  });

  it('köşe adı gizliyse yalnızca değer kalır', () => {
    const gizli = nokta('B', 4, 0, { visible: false });
    expect(olcuMetni(aciOlcusu({ ...ang, vertexPointId: gizli.id }, bul([A, gizli, C]), 90))).toBe('90°');
  });

  it('çokgenin ardışık köşesindeki açı çokgenle aynı gruptadır', () => {
    const poly = govde<PolygonObject>({ id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, C.id] });
    expect(aciGrubu(ang, [poly])).toBe('poly:poly1');
  });

  it('çokgene ait olmayan açı kendi grubudur', () => {
    const D = nokta('D', 9, 9);
    const poly = govde<PolygonObject>({ id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, D.id] });
    expect(aciGrubu(ang, [poly])).toBe('aci:a1');
    expect(aciGrubu(ang, [])).toBe('aci:a1');
  });

  it('gizli çokgen grup kurmaz', () => {
    const poly = govde<PolygonObject>({ id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, C.id], visible: false });
    expect(aciGrubu(ang, [poly])).toBe('aci:a1');
  });
});

// ------------------------------------------------------------------------------------------------ trigonometri

describe('trigonometrik oranlar', () => {
  const kol1 = nokta('B', 4, 0);
  const kose = nokta('A', 0, 0);
  const kol2 = nokta('C', 4, 3);

  it('dik açı kolda ise kenar adlarıyla yazar', () => {
    const satirlar = trigSatirlari(kol1, kose, kol2, {
      derece: 36.8699, sin: 0.6, cos: 0.8, tan: 0.75, dikKose: 'p1',
      kenarlar: { komsu: 4, karsi: 3, hipotenus: 5 },
    }).map((o) => olcuMetni(o));
    expect(satirlar[0]).toBe('m(∠BAC) ≈ 36,9°');
    expect(satirlar[1]).toBe(`sin ${SA} = |BC|/|AC| = 3/5 = 0,6`);
    expect(satirlar[2]).toBe(`cos ${SA} = |AB|/|AC| = 4/5 = 0,8`);
    expect(satirlar[3]).toBe(`tan ${SA} = |BC|/|AB| = 3/4 = 0,75`);
  });

  it('dik açı öteki kolda ise kenarlar yer değiştirir', () => {
    const satirlar = trigSatirlari(kol1, kose, kol2, {
      derece: 30, sin: 0.5, cos: 0.866, tan: 0.5774, dikKose: 'p3',
      kenarlar: { komsu: 4, karsi: 3, hipotenus: 5 },
    }).map((o) => olcuMetni(o));
    expect(satirlar[1]).toBe(`sin ${SA} = |BC|/|AB| = 3/5 = 0,5`);
    expect(satirlar[2]).toBe(`cos ${SA} = |AC|/|AB| = 4/5 = 0,866`);
  });

  it('üçgen dik değilse yalnızca değer yazar', () => {
    const satirlar = trigSatirlari(kol1, kose, kol2, {
      derece: 50, sin: 0.766, cos: 0.6428, tan: 1.1918, dikKose: null, kenarlar: null,
    }).map((o) => olcuMetni(o));
    expect(satirlar[1]).toBe(`sin ${SA} = 0,766`);
    expect(satirlar[2]).toBe(`cos ${SA} = 0,6428`);
    expect(satirlar[3]).toBe(`tan ${SA} = 1,1918`);
  });

  it('tanımsız tanjant yazılır', () => {
    const satirlar = trigSatirlari(kol1, kose, kol2, {
      derece: 90, sin: 1, cos: 0, tan: null, dikKose: null, kenarlar: null,
    }).map((o) => olcuMetni(o));
    expect(satirlar[3]).toBe(`tan ${SA} tanımsız`);
  });

  it('kısa yazımda açı adı düşer', () => {
    const satirlar = trigSatirlari(kol1, kose, kol2, {
      derece: 36.8699, sin: 0.6, cos: 0.8, tan: 0.75, dikKose: 'p1',
      kenarlar: { komsu: 4, karsi: 3, hipotenus: 5 },
    }).map((o) => olcuMetni(o, KISA));
    expect(satirlar[1]).toBe('sin = 3/5 = 0,6');
  });
});

// ------------------------------------------------------------------------------------------------ yay ve dilim

describe('yay ve daire dilimi ölçüleri', () => {
  const M = nokta('M', 0, 0);
  const S = nokta('S', 2, 0);
  const D = nokta('D', 0, 2); // çember ÜZERİNDE: 90° yay
  const yonDisi = nokta('D', 0, 5); // yalnızca yön verir
  const ara = nokta('K', -Math.SQRT2, Math.SQRT2);

  const arc = (uclar: { merkez: PointObject; bas: PointObject; yon: PointObject }) =>
    govde<ArcObject>({
      id: 'arc1', type: 'arc', centerPointId: uclar.merkez.id, startPointId: uclar.bas.id, directionPointId: uclar.yon.id,
      showArcLength: true, showRadius: true, showChordLength: true,
    });

  it('ucu yayın üzerindeyse |S͡D| yazar', () => {
    const o = arc({ merkez: M, bas: S, yon: D });
    const g = yayGeometrisi(o, bul([M, S, D]))!;
    const liste = yayOlculeri(o, bul([M, S, D]), [M, S, D], g);
    expect(liste.map((x) => x.kind)).toEqual(['arcLength', 'radius', 'chordLength']);
    expect(olcuMetni(liste[0].olcu)).toBe('|S͡D| ≈ 3,14 br');
    expect(olcuMetni(liste[1].olcu)).toBe('r = |MS| = 2 br');
    expect(olcuMetni(liste[2].olcu)).toBe('kiriş |SD| ≈ 2,83 br');
  });

  it('yön noktası çember dışındaysa ad kurulmaz', () => {
    const o = arc({ merkez: M, bas: S, yon: yonDisi });
    const g = yayGeometrisi(o, bul([M, S, yonDisi]))!;
    const liste = yayOlculeri(o, bul([M, S, yonDisi]), [M, S, yonDisi], g);
    expect(olcuMetni(liste[0].olcu)).toBe('Yay uzunluğu ≈ 3,14 br');
    expect(olcuMetni(liste[2].olcu)).toBe('Kiriş ≈ 2,83 br');
  });

  it('merkez açı: ucu yayda olan yayda m(S͡D), yön noktasında m(∠SMD)', () => {
    const uzerinde = arc({ merkez: M, bas: S, yon: D });
    const gU = yayGeometrisi(uzerinde, bul([M, S, D]))!;
    expect(olcuMetni(yayMerkezAcisi(uzerinde, bul([M, S, D]), [M, S, D], gU, 90, { basamak: 1 }))).toBe('m(S͡D) = 90°');

    const disarida = arc({ merkez: M, bas: S, yon: yonDisi });
    const gD = yayGeometrisi(disarida, bul([M, S, yonDisi]))!;
    expect(olcuMetni(yayMerkezAcisi(disarida, bul([M, S, yonDisi]), [M, S, yonDisi], gD, 90, { basamak: 1 }))).toBe('m(∠SMD) = 90°');
  });

  it('daire diliminin merkez açısı her zaman ∠ ile yazılır', () => {
    const dilim = govde<SectorObject>({
      id: 'sec1', type: 'sector', centerPointId: M.id, startPointId: S.id, directionPointId: D.id,
      showArea: true, showPerimeter: true, showArcLength: true,
    });
    const g = yayGeometrisi(dilim, bul([M, S, D]))!;
    expect(olcuMetni(yayMerkezAcisi(dilim, bul([M, S, D]), [M, S, D], g, 90, { basamak: 1 }))).toBe('m(∠SMD) = 90°');
    const liste = yayOlculeri(dilim, bul([M, S, D]), [M, S, D], g);
    expect(liste.map((x) => x.kind)).toEqual(['arcLength', 'area', 'perimeter']);
    expect(olcuMetni(liste[1].olcu)).toBe('A(SMD dilimi) ≈ 3,14 br²');
    expect(olcuMetni(liste[2].olcu)).toBe('Ç(SMD dilimi) ≈ 7,14 br');
  });

  it('180°lik yay yarım çember niteleyicisi alır, üzerindeki nokta onu adlandırır', () => {
    const karsi = nokta('D', -2, 0);
    const o = arc({ merkez: M, bas: S, yon: karsi });
    const nesneler = [M, S, karsi];
    const g = yayGeometrisi(o, bul(nesneler))!;
    expect(olcuMetni(yayOlculeri(o, bul(nesneler), nesneler, g)[0].olcu)).toBe('|S͡D| ≈ 6,28 br (yarım çember)');

    const adli = [...nesneler, ara];
    expect(olcuMetni(yayOlculeri(o, bul(adli), adli, g)[0].olcu)).toBe('|S͡K͡D| ≈ 6,28 br');
  });

  it('çap kirişi 2r ile yazılır', () => {
    const karsi = nokta('D', -2, 0);
    const o = arc({ merkez: M, bas: S, yon: karsi });
    const nesneler = [M, S, karsi];
    const g = yayGeometrisi(o, bul(nesneler))!;
    const liste = yayOlculeri(o, bul(nesneler), nesneler, g);
    expect(olcuMetni(liste[liste.length - 1].olcu)).toBe('çap |SD| = 2r = 4 br');
  });

  it('yayUclari yön noktasını son uç saymaz', () => {
    const o = arc({ merkez: M, bas: S, yon: yonDisi });
    const g = yayGeometrisi(o, bul([M, S, yonDisi]))!;
    expect(yayUclari(o, bul([M, S, yonDisi]), [M, S, yonDisi], g).son).toBeNull();
  });
});

describe('iki nokta arası yay ölçümü', () => {
  const M = nokta('M', 0, 0);
  const T = nokta('T', 2, 0);
  const V = nokta('V', 0, 2);
  const K = nokta('K', -Math.SQRT2, Math.SQRT2);
  const cember = govde<CircleObject>({ id: 'c1', type: 'circle', centerPointId: M.id, fixedRadius: 2 });
  const olcum = (ek: Partial<ArcMeasurement> = {}) =>
    govde<MathObject>({ id: 'm1', type: 'measurement', ...({ kind: 'arc', circleId: cember.id, pointIds: [T.id, V.id], ...ek } as object) }) as ArcMeasurement;

  it('küçük yayı iki harfle adlandırır', () => {
    const nesneler = [M, T, V, cember];
    const y = yayOlcumuYazimi(olcum({ startPointId: T.id }), nesneler, nesnedenNokta(nesneler))!;
    expect(olcuMetni(y.uzunluk)).toBe('|T͡V| ≈ 3,14 br');
    expect(olcuMetni(y.olcu)).toBe('m(T͡V) = 90°');
  });

  it('büyük yayı üzerindeki noktayla adlandırır', () => {
    const nesneler = [M, T, V, K, cember];
    const y = yayOlcumuYazimi(olcum({ startPointId: V.id }), nesneler, nesnedenNokta(nesneler))!;
    expect(olcuMetni(y.uzunluk)).toBe('|T͡K͡V| ≈ 9,42 br');
    expect(olcuMetni(y.olcu)).toBe('m(T͡K͡V) = 270°');
  });

  it('üzerinde adlandırıcı nokta yoksa büyük yay niteleyicisi yazılır', () => {
    const nesneler = [M, T, V, cember];
    const y = yayOlcumuYazimi(olcum({ startPointId: V.id }), nesneler, nesnedenNokta(nesneler))!;
    expect(olcuMetni(y.uzunluk)).toBe('|T͡V| ≈ 9,42 br (büyük yay)');
  });

  it('çözülemeyen yay için null döner', () => {
    const nesneler = [M, T, cember];
    expect(yayOlcumuYazimi(olcum(), nesneler, nesnedenNokta(nesneler))).toBeNull();
  });
});

// ------------------------------------------------------------------------------------------------ ölçüm kartları

describe('ölçüm kartları', () => {
  const A = nokta('A', -2, 0);
  const B = nokta('B', 2, 0);
  const C = nokta('C', 2, 3);
  const px = (t: number) => t;
  const scale = GORUNUM.zoom / 44;

  const kartlar = (objects: MathObject[], yazim: YazimAyari = VARSAYILAN_YAZIM) =>
    olcumKartKutulari({ objects, viewport: GORUNUM, yazim, px });

  it('çokgen kartı A(ABC) ve Ç(ABC) satırlarını taşır', () => {
    const poly = govde<PolygonObject>({ id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, C.id], showArea: true, showPerimeter: true });
    const [k] = kartlar([A, B, C, poly]);
    expect(k.satirlar.map(duzMetin)).toEqual(['A(ABC) = 6 br²', 'Ç(ABC) = 12 br']);
    expect(k.satirTurleri).toEqual(['alan', 'cevre']);
    expect(k.anahtar).toBe('area');
    expect(k.sesli).toContain('üçgeninin alanı');
  });

  it('yalnızca çevre açıkken anahtar perimeter olur', () => {
    const poly = govde<PolygonObject>({ id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, C.id], showPerimeter: true });
    const [k] = kartlar([A, B, C, poly]);
    expect(k.anahtar).toBe('perimeter');
    expect(k.satirlar.map(duzMetin)).toEqual(['Ç(ABC) = 12 br']);
  });

  it('kartın doğal merkezi en alt köşenin altında referans yerleşimi izler', () => {
    const poly = govde<PolygonObject>({ id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, C.id], showArea: true, showPerimeter: true });
    const [k] = kartlar([A, B, C, poly]);
    const altY = GORUNUM.height / 2; // y = 0 dünya noktası
    expect(k.merkez.y).toBeCloseTo(altY + (24 + k.olcu.yukseklik / 2) * scale, 5);
    expect(k.kutu.y0).toBeCloseTo(k.merkez.y - k.olcu.yukseklik / 2, 5);
    expect(k.merkez.x).toBeCloseTo(GORUNUM.width / 2 + ((-2 + 2 + 2) / 3) * GORUNUM.zoom, 5);
  });

  it('kenar etiketleri açıkken kart onların da altına iner', () => {
    const yalin = govde<PolygonObject>({ id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, C.id], showArea: true });
    const etiketli = govde<PolygonObject>({ id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, C.id], showArea: true, edgeLabels: [0] });
    const [a] = kartlar([A, B, C, yalin]);
    const [b] = kartlar([A, B, C, etiketli]);
    expect(b.merkez.y).toBeGreaterThan(a.merkez.y + 8 * scale);
  });

  it('sürükleme kayıklığı yalnızca çakışma kutusuna uygulanır', () => {
    const poly = govde<PolygonObject>({
      id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, C.id], showArea: true,
      labelOffsets: { area: { x: 1, y: 2 } },
    });
    const [k] = kartlar([A, B, C, poly]);
    expect(k.kutu.x0).toBeCloseTo(k.merkez.x - k.olcu.genislik / 2 + 40, 5);
    expect(k.kutu.y0).toBeCloseTo(k.merkez.y - k.olcu.yukseklik / 2 - 80, 5);
  });

  it('köşe adı gizliyse sözcüğe düşer', () => {
    const gizli = nokta('C', 2, 3, { showLabel: false });
    const poly = govde<PolygonObject>({ id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, gizli.id], showArea: true });
    const [k] = kartlar([A, B, gizli, poly]);
    expect(k.satirlar.map(duzMetin)).toEqual(['Alan = 6 br²']);
  });

  it('ayrılmış kartın engel kutusu ortak çapayı ve değişen metin genişliğinde sol hizayı izler', () => {
    const poly = govde<PolygonObject>({
      id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, C.id], showArea: true, showPerimeter: true,
      labelOffsets: { area: { x: 100, y: 100 } },
      labelAnchors: { area: { pointIds: [A.id, B.id, C.id], offset: { x: 5, y: 2 }, alignment: 'left' } },
    });
    const [before] = kartlar([A, B, C, poly]);
    const [after] = kartlar([A, B, { ...C, x: 5, y: 6 }, poly]);
    expect(after.satirlar.map(duzMetin)).not.toEqual(before.satirlar.map(duzMetin));
    // Tek köşe üç birim değişince bütün grubun ortak merkezi bir birim değişir.
    expect(after.kutu.x0 - before.kutu.x0).toBeCloseTo(GORUNUM.zoom, 5);
    const cy = (k: typeof before) => (k.kutu.y0 + k.kutu.y1) / 2;
    expect(cy(after) - cy(before)).toBeCloseTo(-GORUNUM.zoom, 5);
    expect(before.kutu.x0).toBeCloseTo(GORUNUM.width / 2 + (2 / 3 + 5) * GORUNUM.zoom, 5);
  });

  it('çember kartı başlık, yarıçap, alan ve çevre satırlarını verir', () => {
    const M = nokta('M', 0, 0);
    const T = nokta('T', 2, 0);
    const circ = govde<CircleObject>({ id: 'c1', type: 'circle', centerPointId: M.id, radiusPointId: T.id, showArea: true, showPerimeter: true });
    const [k] = kartlar([M, T, circ]);
    expect(k.satirlar.map(duzMetin)).toEqual([
      'Ç(M, r)', 'r = |MT| = 2 br', 'Alan = πr² ≈ 12,57 br²', 'Çevre = 2πr ≈ 12,57 br',
    ]);
    expect(k.satirTurleri).toEqual(['baslik', 'yaricap', 'alan', 'cevre']);
    expect(k.merkez.y).toBeCloseTo(GORUNUM.height / 2 + 2 * GORUNUM.zoom + (14 + k.olcu.yukseklik / 2) * scale, 5);
  });

  it('üç noktadan geçen çemberde başlık yazılmaz', () => {
    const P = nokta('P', -1, 0);
    const Q = nokta('Q', 1, 0);
    const R = nokta('R', 0, 1);
    const circ = govde<CircleObject>({ id: 'c1', type: 'circle', centerPointId: '', throughPointIds: [P.id, Q.id, R.id], showArea: true });
    const [k] = kartlar([P, Q, R, circ]);
    expect(k.satirTurleri).toEqual(['yaricap', 'alan']);
    expect(duzMetin(k.satirlar[0])).toBe('r = 1 br');
  });

  it('merkezi gizli çemberde de yarıçap sözcüğe düşer', () => {
    const M = nokta('M', 0, 0, { visible: false });
    const T = nokta('T', 2, 0);
    const circ = govde<CircleObject>({ id: 'c1', type: 'circle', centerPointId: M.id, radiusPointId: T.id, showArea: true });
    const [k] = kartlar([M, T, circ]);
    expect(k.satirTurleri).toEqual(['yaricap', 'alan']);
    expect(duzMetin(k.satirlar[0])).toBe('r = 2 br');
  });

  it('elips kartı formülü yazar ve çevresi her zaman yaklaşıktır', () => {
    const U = nokta('U', 0, 0);
    const elp = govde<EllipseObject>({ id: 'e1', type: 'ellipse', centerPointId: U.id, radiusX: 3, radiusY: 2, showArea: true, showPerimeter: true });
    const [k] = kartlar([U, elp]);
    expect(k.satirlar.map(duzMetin)).toEqual(['Alan = πab ≈ 18,85 br²', 'Çevre ≈ 15,87 br']);
  });

  it('kısa ayarda kartlar da kısalır', () => {
    const poly = govde<PolygonObject>({ id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, C.id], showArea: true, showPerimeter: true });
    const [k] = kartlar([A, B, C, poly], KISA);
    expect(k.satirlar.map(duzMetin)).toEqual(['Alan = 6 br²', 'Çevre = 12 br']);
  });

  it('ölçüsü kapalı ve görünmez şekiller kart üretmez', () => {
    const poly = govde<PolygonObject>({ id: 'poly1', type: 'polygon', pointIds: [A.id, B.id, C.id] });
    const gizli = govde<PolygonObject>({ id: 'poly2', type: 'polygon', pointIds: [A.id, B.id, C.id], showArea: true, visible: false });
    expect(kartlar([A, B, C, poly, gizli])).toHaveLength(0);
  });

  it('kart satırları doğrudan da kurulabilir', () => {
    expect(cokgenKartSatirlari([A, B, C], true, false).turler).toEqual(['alan']);
    expect(cemberKartSatirlari(null, null, 2, false, true).turler).toEqual(['yaricap', 'cevre']);
    expect(elipsKartSatirlari(3, 2, true, true).turler).toEqual(['alan', 'cevre']);
  });

  const viewports: ViewportTransform[] = [
    { ...GORUNUM, zoom: 44, width: 0, height: 0 },
    { ...GORUNUM, zoom: 5, panX: 21, panY: -35 },
    { ...GORUNUM, zoom: 120, panX: -210, panY: 62, width: 1280, height: 720 },
    { ...GORUNUM, zoom: 300, panX: 315, panY: -143, width: 620, height: 900 },
  ];
  const worldCenter = (k: ReturnType<typeof kartlar>[number], viewport: ViewportTransform) =>
    screenToWorld({ x: (k.kutu.x0 + k.kutu.x1) / 2, y: (k.kutu.y0 + k.kutu.y1) / 2 }, viewport);
  const expectFixedSize = (k: ReturnType<typeof kartlar>[number]) => {
    expect(k.kutu.x1 - k.kutu.x0).toBeCloseTo(k.olcu.genislik, 8);
    expect(k.kutu.y1 - k.kutu.y0).toBeCloseTo(k.olcu.yukseklik, 8);
  };
  const expectPoint = (actual: { x: number; y: number }, expected: { x: number; y: number }) => {
    expect(actual.x).toBeCloseTo(expected.x, 8);
    expect(actual.y).toBeCloseTo(expected.y, 8);
  };

  it.each(['polygon', 'circle', 'ellipse'] as const)('%s kartının dünya merkezi ve piksel boyutu zoom, kaydırma ve pencere boyutunda değişmez', type => {
    const common = { id: 'zoomShape', showArea: true, showPerimeter: true };
    const shape = type === 'polygon'
      ? govde<PolygonObject>({ ...common, type, pointIds: [A.id, B.id, C.id], edgeLabels: [0, 1, 2] })
      : type === 'circle'
        ? govde<CircleObject>({ ...common, type, centerPointId: A.id, radiusPointId: B.id })
        : govde<EllipseObject>({ ...common, type, centerPointId: A.id, radiusX: 3, radiusY: 2 });
    const objects = [A, B, C, shape];
    const snapshot = JSON.stringify(objects);
    const [initial] = kartlar(objects);
    const center = screenToWorld(initial.merkez, GORUNUM);
    expectFixedSize(initial);
    for (const viewport of viewports) {
      const [card] = olcumKartKutulari({ objects, viewport, yazim: VARSAYILAN_YAZIM, px });
      expectPoint(screenToWorld(card.merkez, viewport), center);
      expectPoint(worldCenter(card, viewport), center);
      expect(card.olcu).toEqual(initial.olcu);
      expectFixedSize(card);
    }
    expect(kartlar(objects)[0]).toEqual(initial);
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it('legacy dünya kayıklığı zoom değişince aynı konumda kalır', () => {
    const offset = { x: 1.25, y: -0.75 };
    const poly = govde<PolygonObject>({ id: 'polyOffset', type: 'polygon', pointIds: [A.id, B.id, C.id], showArea: true, labelOffsets: { area: offset } });
    const objects = [A, B, C, poly];
    const [initial] = kartlar(objects);
    const initialCenter = worldCenter(initial, GORUNUM);
    for (const viewport of viewports) {
      const [card] = olcumKartKutulari({ objects, viewport, yazim: VARSAYILAN_YAZIM, px });
      const naturalWorld = screenToWorld(card.merkez, viewport);
      const renderedWorld = worldCenter(card, viewport);
      expectPoint(renderedWorld, { x: naturalWorld.x + offset.x, y: naturalWorld.y + offset.y });
      expectPoint(renderedWorld, initialCenter);
      expectFixedSize(card);
    }
    expect(poly.labelAnchors).toBeUndefined();
  });

  it.each(['left', 'center', 'right'] as const)('%s hizalı ortak çapanın dünya konumu zoom ve pencere boyutundan bağımsızdır', alignment => {
    const poly = govde<PolygonObject>({
      id: 'polyAnchor', type: 'polygon', pointIds: [A.id, B.id, C.id], showArea: true,
      labelOffsets: { area: { x: 100, y: 100 } },
      labelAnchors: { area: { pointIds: [A.id, B.id, C.id], offset: { x: 5, y: 2 }, alignment } },
    });
    const objects = [A, B, C, poly];
    const [initial] = kartlar(objects);
    expectFixedSize(initial);
    for (const viewport of viewports) {
      const [card] = olcumKartKutulari({ objects, viewport, yazim: VARSAYILAN_YAZIM, px });
      const alignmentX = alignment === 'left' ? card.kutu.x0 : alignment === 'right' ? card.kutu.x1 : (card.kutu.x0 + card.kutu.x1) / 2;
      expectPoint(screenToWorld({ x: alignmentX, y: (card.kutu.y0 + card.kutu.y1) / 2 }, viewport), { x: 2 / 3 + 5, y: 1 + 2 });
      expectFixedSize(card);
      expect(card.olcu).toEqual(initial.olcu);
    }
  });
});

// ------------------------------------------------------------------------------------------------ rozet histerezisi

describe('açı rozeti histerezisi', () => {
  const eskenarGrup = (kenar: number): { grup: RozetAdayi[]; kenarlar: [{ x: number; y: number }, { x: number; y: number }][] } => {
    const h = (kenar * Math.sqrt(3)) / 2;
    const D = { x: 100, y: 100 + h };
    const E = { x: 100 + kenar, y: 100 + h };
    const F = { x: 100 + kenar / 2, y: 100 };
    const ad = (s: string) => ({ label: s, showLabel: true, visible: true });
    const grup = ([[D, F, E], [E, D, F], [F, E, D]] as const).map(([k, a, b]) => {
      const kol1 = Math.atan2(a.y - k.y, a.x - k.x);
      const kol2 = Math.atan2(b.y - k.y, b.x - k.x);
      let delta = kol2 - kol1;
      while (delta <= -Math.PI) delta += 2 * Math.PI;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      const olcu = aci(ad('D'), ad('E'), ad('F'), 60, { basamak: 1 });
      return {
        girdi: {
          kose: k, kol1, kol2,
          boy1: Math.hypot(a.x - k.x, a.y - k.y), boy2: Math.hypot(b.x - k.x, b.y - k.y),
          orta: kol1 + delta / 2, tarama: Math.abs(delta), yayR: 22,
        },
        tam: kutuOlcusu([olcuDugumleri(olcu, VARSAYILAN_YAZIM)], 10),
        kisa: kutuOlcusu([olcuDugumleri(olcu, KISA)], 10),
      };
    });
    return { grup, kenarlar: [[D, E], [E, F], [F, D]] };
  };

  it('kısa yazım KİLİTLENMEZ: yer açıldığında tam yazıma dönülür', () => {
    const { grup, kenarlar } = eskenarGrup(250);
    expect(aciRozetiYerlesimi(grup, { kenarlar }, 'kisa').bicim).toBe('tam');
    expect(aciRozetiYerlesimi(grup, { kenarlar }, 'tam').bicim).toBe('tam');
  });

  it('dar üçgende iki yönde de kısa kalır', () => {
    const { grup, kenarlar } = eskenarGrup(150);
    expect(aciRozetiYerlesimi(grup, { kenarlar }, 'tam').bicim).toBe('kisa');
    expect(aciRozetiYerlesimi(grup, { kenarlar }, 'kisa').bicim).toBe('kisa');
  });
});
