import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject } from '@/types/math';
import { adayYerler, noktaAdiYeri, noktaEngelleri, type NoktaEngeli } from '../noktaAdi';

const KUTU = { genislik: 9, yukseklik: 12 };
const P = { x: 100, y: 100 };
const isin = (ux: number, uy: number, uzunluk = Infinity): NoktaEngeli => {
  const boy = Math.hypot(ux, uy);
  return { tur: 'isin', ux: ux / boy, uy: uy / boy, uzunluk };
};

describe('noktaAdiYeri — ad çizgilerin üstüne gelmez', () => {
  it('engel yoksa ad eski sabit yerinde kalır: sağ üst, +10/−10', () => {
    const yer = noktaAdiYeri(P, [], KUTU);
    expect(yer).toMatchObject({ x: 110, y: 90, textAnchor: 'start', yon: 'sağ-üst' });
  });

  it('tek kol sağ üste gidiyorsa ad kolun UZANTISINA (karşı yöne) geçer', () => {
    // Eski kural sıradaki ilk boş yeri (sol üst) seçiyordu; ders kitabında uç noktanın adı
    // parçanın uzantısında durur.
    const yer = noktaAdiYeri(P, [isin(1, -1, 140)], KUTU);
    expect(yer.yon).toBe('sol-alt');
    expect(yer.textAnchor).toBe('end');
    expect(yer.y).toBeGreaterThan(P.y + 10);
  });

  it('iki kol yukarı açılıyorsa (Λ) ad tam aralarına, aşağıya konur', () => {
    const yer = noktaAdiYeri(P, [isin(1, -1), isin(-1, -1)], KUTU);
    expect(yer.yon).toBe('alt');
    expect(yer.textAnchor).toBe('middle');
    expect(yer.y).toBeGreaterThan(P.y + 10);
  });

  it('yatay ya da dikey doğru kutuya değmediği için ad sağ üstte kalır', () => {
    expect(noktaAdiYeri(P, [isin(1, 0), isin(-1, 0)], KUTU).yon).toBe('sağ-üst');
    expect(noktaAdiYeri(P, [isin(0, 1), isin(0, -1)], KUTU).yon).toBe('sağ-üst');
  });

  it('30° yukarı giden ışın sağ üst kutuyu keser, ad karşı yana geçer; kısa parça (kutuya ulaşmayan) adı oynatmaz', () => {
    expect(noktaAdiYeri(P, [isin(Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6))], KUTU).yon).toBe('sol-alt');
    expect(noktaAdiYeri(P, [isin(Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6), 6)], KUTU).yon).toBe('sağ-üst');
  });

  it('noktadan geçen çember: adın kutusunu kestiği yönden kaçar', () => {
    // Merkez (100,150), r=50: nokta çemberin sol üst çeyreğinde, çember sağ üste doğru devam eder
    const nokta = { x: 100 - 50 * Math.SQRT1_2, y: 150 - 50 * Math.SQRT1_2 };
    const daire: NoktaEngeli = { tur: 'daire', cx: 100, cy: 150, r: 50 };
    expect(noktaAdiYeri(nokta, [daire], KUTU).yon).toBe('sol-üst');
    // Çemberin tepesindeki noktada çember yatay geçer; sağ üst boştur
    expect(noktaAdiYeri({ x: 100, y: 100 }, [daire], KUTU).yon).toBe('sağ-üst');
  });

  it('üçgenin köşesinde ad şeklin DIŞINA konur (kolların arasındaki en geniş açıklık)', () => {
    // Köşe P; kollar sağa ve sağ üste (üçgenin içi sağ üst çeyrekte) → ad sol alt tarafta
    const yer = noktaAdiYeri(P, [isin(1, 0, 150), isin(1, -1.2, 150)], KUTU);
    expect(['sol', 'sol-alt', 'alt']).toContain(yer.yon);
  });

  it('kıl payı kurtulan yer, bol boşluklu yeri yenemez', () => {
    // Sağ üst kapalı; sol üstün hemen yanından bir kol geçiyor (dar), alt taraf ferah
    const yer = noktaAdiYeri(P, [isin(1, -1, 150), isin(-0.35, -1, 150)], KUTU);
    expect(['alt', 'sol-alt', 'sağ-alt']).toContain(yer.yon);
  });

  it('şekil sürüklenirken ad önceki yerinde kalır; sağ üst ancak ferahlayınca geri döner', () => {
    // Sağ üst çok az boşlukla açık (kol kutunun 2-3 px yanından geçiyor)
    const darKol = [isin(1, -0.18, 150)];
    const ilk = noktaAdiYeri(P, darKol, KUTU);
    expect(ilk.yon).toBe('sağ-üst'); // ilk açılışta: değmiyorsa yerinden oynamaz
    // Ad daha önce sol altta idiyse ve sağ üst yalnız kıl payı açıksa orada KALIR (gidip gelmez)
    expect(noktaAdiYeri(P, darKol, KUTU, 'sol-alt').yon).toBe('sol-alt');
    // Sağ üst ferahladıysa (engel yok değil ama uzak) eve döner
    expect(noktaAdiYeri(P, [isin(1, 1, 150)], KUTU, 'sol-alt').yon).toBe('sağ-üst');
  });

  it('bütün yönler kapalıysa en az çizginin kestiği yön seçilir', () => {
    const engeller = [0, 45, 90, 135, 180, 225, 270, 315].map((d) => isin(Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180)));
    const yer = noktaAdiYeri(P, engeller, KUTU);
    expect(adayYerler(P, KUTU).map((a) => a.yon)).toContain(yer.yon);
  });
});

function nokta(id: string, x: number, y: number, ekstra: Partial<PointObject> = {}): PointObject {
  return { id, type: 'point', label: id, showLabel: true, color: '#000', visible: true, createdAt: 0, x, y, ...ekstra } as PointObject;
}
const birebir = (p: { x: number; y: number }) => ({ x: p.x, y: -p.y || 0 });

describe('noktaEngelleri — sahnedeki çizgiler', () => {
  const A = nokta('A', 0, 0);
  const B = nokta('B', 100, 0);
  const C = nokta('C', 0, 100);
  const P5 = nokta('P', 50, 0); // AB üzerinde, AB'yi tanımlamıyor
  const pointsById = new Map([A, B, C, P5].map((p) => [p.id, p]));

  it('doğru parçası iki ucuna birer sonlu ışın, doğru iki yönde sonsuz ışın verir', () => {
    const objects = [
      { id: 's', type: 'segment', startPointId: 'A', endPointId: 'C', visible: true } as unknown as MathObject,
      { id: 'l', type: 'line', point1Id: 'A', point2Id: 'B', visible: true } as unknown as MathObject,
    ];
    const harita = noktaEngelleri(objects, pointsById, birebir);
    const a = harita.get('A')!;
    expect(a.filter((e) => e.tur === 'isin' && e.uzunluk === 100)).toHaveLength(1); // AC, 100 px
    expect(a.filter((e) => e.tur === 'isin' && e.uzunluk === Infinity)).toHaveLength(2); // AB doğrusu iki yön
    expect(harita.get('C')!).toHaveLength(1);
    expect(harita.get('B')!.every((e) => e.tur === 'isin' && e.uzunluk === Infinity)).toBe(true);
  });

  it('ışın başlangıçta tek yönde sonsuz, geçtiği noktada geri sonlu + ileri sonsuz', () => {
    const objects = [{ id: 'r', type: 'ray', startPointId: 'A', throughPointId: 'C', visible: true } as unknown as MathObject];
    const harita = noktaEngelleri(objects, pointsById, birebir);
    expect(harita.get('A')).toEqual([{ tur: 'isin', ux: 0, uy: -1, uzunluk: Infinity }]);
    expect(harita.get('C')!.map((e) => (e.tur === 'isin' ? e.uzunluk : -1)).sort()).toEqual([100, Infinity]);
  });

  it('çokgen kenarları ve üzerinde duran nokta: P, AB çizgisini iki yönde engel alır', () => {
    const objects = [{ id: 'g', type: 'polygon', pointIds: ['A', 'B', 'C'], visible: true } as unknown as MathObject];
    const harita = noktaEngelleri(objects, pointsById, birebir);
    expect(harita.get('A')).toHaveLength(2);
    const p = harita.get('P')!;
    expect(p).toHaveLength(2);
    expect(p.map((e) => (e.tur === 'isin' ? e.uzunluk : -1)).sort()).toEqual([50, 50]);
  });

  it('görünmez nesneler ve tek noktası eksik çizgiler sayılmaz', () => {
    const objects = [
      { id: 's', type: 'segment', startPointId: 'A', endPointId: 'B', visible: false } as unknown as MathObject,
      { id: 't', type: 'segment', startPointId: 'A', endPointId: 'YOK', visible: true } as unknown as MathObject,
    ];
    expect(noktaEngelleri(objects, pointsById, birebir).size).toBe(0);
  });

  it('çember: merkezden yarıçap uzaklığındaki noktalar çemberi engel alır, merkez almaz', () => {
    const objects = [{ id: 'c', type: 'circle', centerPointId: 'A', radiusPointId: 'B', visible: true } as unknown as MathObject];
    const harita = noktaEngelleri(objects, pointsById, birebir);
    expect(harita.get('B')).toEqual([{ tur: 'daire', cx: 0, cy: 0, r: 100 }]);
    expect(harita.get('C')).toEqual([{ tur: 'daire', cx: 0, cy: 0, r: 100 }]);
    expect(harita.get('A')).toBeUndefined();
    expect(harita.get('P')).toBeUndefined();
  });
});
