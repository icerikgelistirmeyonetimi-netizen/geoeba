import { describe, expect, it } from 'vitest';
import type {
  AngleObject, ArcObject, CircleObject, EllipseObject, FunctionObject, LineObject, MathObject,
  MeasurementObject, PointObject, PolygonObject, RayObject, SectorObject, SegmentObject,
} from '@/types/math';
import { nesneMetni, nesneSatirlari, panelYazimi, satirMetni } from '@/math/panelYazimlari';

/**
 * Panellerin (Cebir listesi, Özellikler, araç kutusu nesne listesi) MEB yazımı.
 *
 * Kural tuvalle ortaktır: ad yalnızca GÖRÜNEN nokta adlarından kurulur, nesnenin kendi etiketi
 * ('Çokgen', 'A Merkezli Çember') yazımda kullanılmaz; ad kurulamazsa yazım sözcüğe düşer.
 * Tuvalden farkı: panelde "göster" anahtarlarına bakılmaz, nesnenin bütün ölçüleri listelenir.
 */

let sayac = 0;
function nokta(label: string, x: number, y: number, ek: Partial<PointObject> = {}): PointObject {
  return {
    id: `p${++sayac}_${label}`, type: 'point', label, x, y,
    color: '#2563eb', visible: true, showLabel: true, createdAt: sayac, isIndependent: true, ...ek,
  } as PointObject;
}

const govde = <T extends MathObject>(o: Partial<T> & { type: T['type']; id: string }): T =>
  ({ label: o.id, color: '#0284c7', visible: true, showLabel: true, createdAt: 1, ...o }) as T;

const metinler = (o: MathObject, objects: MathObject[]) => nesneSatirlari(o, objects).map(satirMetni);

// ------------------------------------------------------------------------------------------------ panel yazım ayarı

describe('panelYazimi', () => {
  it('Kısa (yalnızca değer) ayarında bile panel TAM yazımdadır', () => {
    expect(panelYazimi({ olcuYazimi: 'kisa', aciYazimi: 'sapka' })).toEqual({ olcuYazimi: 'tam', aciYazimi: 'sapka' });
  });

  it('açı yazımı seçimi panelde de geçerlidir', () => {
    expect(panelYazimi({ olcuYazimi: 'tam', aciYazimi: 'isaret' }).aciYazimi).toBe('isaret');
  });

  it('ayar yoksa ya da bozuksa varsayılana düşer', () => {
    expect(panelYazimi(null)).toEqual({ olcuYazimi: 'tam', aciYazimi: 'sapka' });
    expect(panelYazimi({ olcuYazimi: 'uzun', aciYazimi: 7 })).toEqual({ olcuYazimi: 'tam', aciYazimi: 'sapka' });
  });
});

// ------------------------------------------------------------------------------------------------ çokgen

describe('çokgen satırları', () => {
  const A = nokta('A', 0, 0);
  const B = nokta('B', 4, 0);
  const C = nokta('C', 0, 3);

  it('alan ve çevre köşe adlarıyla yazılır', () => {
    const poly = govde<PolygonObject>({ id: 'poly1', type: 'polygon', label: 'Çokgen', pointIds: [A.id, B.id, C.id] });
    expect(metinler(poly, [A, B, C, poly])).toEqual(['A(ABC) = 6 br²', 'Ç(ABC) = 12 br']);
  });

  it('köşe adı gizliyken sözcüğe düşer (nesnenin kendi etiketi kullanılmaz)', () => {
    const G = nokta('C', 0, 3, { showLabel: false });
    const poly = govde<PolygonObject>({ id: 'poly2', type: 'polygon', label: 'Çokgen', pointIds: [A.id, B.id, G.id] });
    expect(metinler(poly, [A, B, G, poly])).toEqual(['Alan = 6 br²', 'Çevre = 12 br']);
  });

  it('köşesi eksik çokgen sözcükle anlatılır', () => {
    const poly = govde<PolygonObject>({ id: 'poly3', type: 'polygon', pointIds: [A.id, B.id] });
    expect(metinler(poly, [A, B, poly])).toEqual(['Çokgen (2 köşe)']);
  });
});

// ------------------------------------------------------------------------------------------------ parça, doğru, ışın

describe('doğru parçası, doğru ve ışın', () => {
  const A = nokta('A', 0, 0);
  const B = nokta('B', 4, 0);

  it('parça |AB| = 4 br yazar', () => {
    const seg = govde<SegmentObject>({ id: 's1', type: 'segment', startPointId: A.id, endPointId: B.id });
    expect(metinler(seg, [A, B, seg])).toEqual(['|AB| = 4 br']);
  });

  it('ölçü aracının cm birimi korunur', () => {
    const seg = govde<SegmentObject>({ id: 's2', type: 'segment', startPointId: A.id, endPointId: B.id, unit: 'cm' });
    expect(metinler(seg, [A, B, seg])).toEqual(['|AB| = 4 cm']);
  });

  it('doğru denklemi düz metin, eğim ölçü satırıdır', () => {
    const C = nokta('C', 2, 1);
    const line = govde<LineObject>({ id: 'd1', type: 'line', point1Id: A.id, point2Id: C.id });
    const satirlar = nesneSatirlari(line, [A, C, line]);
    expect(satirlar[0].tur).toBe('metin');
    expect(satirlar[1].tur).toBe('olcu');
    expect(satirMetni(satirlar[1])).toBe('AC eğimi = 0,5');
  });

  it('ışın köşeli parantez açık yazılır', () => {
    const ray = govde<RayObject>({ id: 'i1', type: 'ray', startPointId: A.id, throughPointId: B.id });
    expect(metinler(ray, [A, B, ray])).toEqual(['[AB) ışını']);
  });
});

// ------------------------------------------------------------------------------------------------ açı

describe('açı satırı', () => {
  const A = nokta('A', 0, 0);
  const B = nokta('B', 4, 0);
  const C = nokta('C', 0, 3);

  it('m(∠BAC) = 90° yazar', () => {
    const ang = govde<AngleObject>({ id: 'a1', type: 'angle', label: '∠BAC', point1Id: B.id, vertexPointId: A.id, point3Id: C.id });
    expect(metinler(ang, [A, B, C, ang])).toEqual(['m(∠BAC) = 90°']);
  });

  it('dış açıda 360° − iç açı yazılır ve niteleme eklenir', () => {
    const ang = govde<AngleObject>({ id: 'a2', type: 'angle', point1Id: B.id, vertexPointId: A.id, point3Id: C.id, reflex: true });
    expect(metinler(ang, [A, B, C, ang])).toEqual(['m(∠BAC) = 270° (dış açı)']);
  });
});

// ------------------------------------------------------------------------------------------------ çember ve elips

describe('çember ve elips satırları', () => {
  const M = nokta('M', 0, 0);
  const S = nokta('S', 2, 0);

  it('yarıçap, alan ve çevre MEB yazımıyla gelir', () => {
    const circ = govde<CircleObject>({ id: 'c1', type: 'circle', centerPointId: M.id, radiusPointId: S.id });
    expect(metinler(circ, [M, S, circ])).toEqual(['r = |MS| = 2 br', 'Alan = πr² ≈ 12,57 br²', 'Çevre = 2πr ≈ 12,57 br']);
  });

  it('sabit yarıçaplı çemberde yalnızca r yazılır', () => {
    const circ = govde<CircleObject>({ id: 'c2', type: 'circle', centerPointId: M.id, fixedRadius: 3 });
    expect(metinler(circ, [M, circ])[0]).toBe('r = 3 br');
  });

  it('üç noktadan geçen çemberde yarıçap 0 değildir ve ad yazılmaz', () => {
    const P1 = nokta('P', 1, 0);
    const P2 = nokta('Q', -1, 0);
    const P3 = nokta('R', 0, 1);
    const circ = govde<CircleObject>({
      id: 'c3', type: 'circle', centerPointId: '', throughPointIds: [P1.id, P2.id, P3.id],
    });
    expect(metinler(circ, [P1, P2, P3, circ])[0]).toBe('r = 1 br');
  });

  it('elipste alan ve çevre yaklaşık, a ile b düz metindir', () => {
    const elp = govde<EllipseObject>({ id: 'e1', type: 'ellipse', centerPointId: 'yok', radiusX: 3, radiusY: 2, rotation: 0 });
    expect(metinler(elp, [elp])).toEqual(['Alan = πab ≈ 18,85 br²', 'Çevre ≈ 15,87 br', 'a = 3 br, b = 2 br']);
  });
});

// ------------------------------------------------------------------------------------------------ yay ve daire dilimi

describe('yay ve daire dilimi satırları', () => {
  const M = nokta('M', 0, 0);
  const S = nokta('S', 2, 0);
  const D = nokta('D', 0, 2);

  it('yayda uzunluk, merkez açı, yarıçap ve kiriş yazılır', () => {
    const arc = govde<ArcObject>({ id: 'y1', type: 'arc', centerPointId: M.id, startPointId: S.id, directionPointId: D.id });
    expect(metinler(arc, [M, S, D, arc])).toEqual([
      '|S͡D| ≈ 3,14 br', 'm(S͡D) = 90°', 'r = |MS| = 2 br', 'kiriş |SD| ≈ 2,83 br',
    ]);
  });

  it('dilimde alan ve çevre eklenir, merkez açı ∠ ile yazılır', () => {
    const sec = govde<SectorObject>({ id: 'd1', type: 'sector', centerPointId: M.id, startPointId: S.id, directionPointId: D.id });
    expect(metinler(sec, [M, S, D, sec])).toEqual([
      '|S͡D| ≈ 3,14 br', 'm(∠SMD) = 90°', 'A(SMD dilimi) ≈ 3,14 br²', 'Ç(SMD dilimi) ≈ 7,14 br', 'r = |MS| = 2 br',
    ]);
  });

  it('yön noktası yayın üzerinde değilse yay adı yazılmaz', () => {
    const U = nokta('U', 0, 5);
    const arc = govde<ArcObject>({ id: 'y2', type: 'arc', centerPointId: M.id, startPointId: S.id, directionPointId: U.id });
    expect(metinler(arc, [M, S, U, arc])[0]).toBe('Yay uzunluğu ≈ 3,14 br');
  });
});

// ------------------------------------------------------------------------------------------------ ölçüm nesneleri

describe('ölçüm nesneleri', () => {
  const A = nokta('A', 0, 0);
  const B = nokta('B', 4, 0);
  const C = nokta('C', 0, 3);

  it('uzunluk ölçümü |AB| yazar', () => {
    const m = govde<MeasurementObject>({ id: 'm1', type: 'measurement', kind: 'distance', pointIds: [A.id, B.id] });
    expect(metinler(m, [A, B, m])).toEqual(['|AB| = 4 br']);
  });

  it('eğim ölçümü tanımlı ve tanımsız durumda', () => {
    const m = govde<MeasurementObject>({ id: 'm2', type: 'measurement', kind: 'slope', pointIds: [A.id, C.id] });
    expect(metinler(m, [A, C, m])).toEqual(['AC eğimi tanımsız']);
    const m2 = govde<MeasurementObject>({ id: 'm3', type: 'measurement', kind: 'slope', pointIds: [A.id, B.id] });
    expect(metinler(m2, [A, B, m2])).toEqual(['AB eğimi = 0']);
  });

  it('trigonometri ölçümü açı + üç oran satırı verir', () => {
    const D = nokta('D', 4, 3);
    const m = govde<MeasurementObject>({ id: 'm4', type: 'measurement', kind: 'trig', pointIds: [A.id, B.id, D.id] });
    const satirlar = metinler(m, [A, B, D, m]);
    expect(satirlar).toHaveLength(4);
    expect(satirlar[0]).toMatch(/^m\(∠ABD\) = 90°$/);
    expect(satirlar[1]).toMatch(/^sin /);
  });

  it('noktası eksik ölçüm sözcüğe düşer', () => {
    const m = govde<MeasurementObject>({ id: 'm5', type: 'measurement', kind: 'distance', pointIds: ['yok1', 'yok2'] });
    expect(metinler(m, [m])).toEqual(['Uzunluk ölçümü']);
  });
});

// ------------------------------------------------------------------------------------------------ yazımı olmayanlar

describe('ölçüsü olmayan nesneler', () => {
  it('nokta, fonksiyon ve serbest çizim düz metin kalır', () => {
    const A = nokta('A', 2, -3);
    expect(metinler(A, [A])).toEqual(['A(2; -3)']);
    const fn = govde<FunctionObject>({ id: 'f1', type: 'function', expression: 'x^2 + 1' } as Partial<FunctionObject> & { type: 'function'; id: string });
    expect(metinler(fn, [fn])).toEqual(['y = x^2 + 1']);
  });

  it('nesneMetni satırları virgülle birleştirir (arama süzgeci)', () => {
    const A = nokta('A', 0, 0);
    const B = nokta('B', 4, 0);
    const C = nokta('C', 0, 3);
    const poly = govde<PolygonObject>({ id: 'poly9', type: 'polygon', pointIds: [A.id, B.id, C.id] });
    expect(nesneMetni(poly, [A, B, C, poly])).toBe('A(ABC) = 6 br², Ç(ABC) = 12 br');
  });
});
