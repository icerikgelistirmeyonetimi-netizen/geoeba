import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject } from '@/types/math';
import {
  bagimliZleriHesapla,
  nesneleriZdeOtele,
  nesnelerin3BMerkezi,
  noktaZ,
  tabanZ,
  tanimNoktalari,
  zTasinabilir,
} from '../zEkseni';
import { resolveCommandBindings } from '../commandBindings';
import { parseProjectFile } from '../projectFile';
import { ortakGeriAlmaHedefi, ortakYinelemeHedefi, AYNI_EYLEM_MS } from '../ortakGecmis';
import { secimBasligi } from '@/components/workspace/secimBasligi';

const ortak = { showLabel: true, color: '#000', visible: true, createdAt: 0 };
const P = (id: string, x: number, y: number, z?: number, ek: Partial<PointObject> = {}): PointObject => ({
  ...ortak,
  id,
  label: id,
  type: 'point',
  x,
  y,
  ...(z === undefined ? {} : { z }),
  isIndependent: true,
  ...ek,
});
const byId = (objs: MathObject[], id: string) => objs.find((o) => o.id === id) as PointObject;
const ucgen = (): MathObject[] => [
  P('A', 0, 0),
  P('B', 4, 0),
  P('C', 0, 3),
  { ...ortak, id: 'u', label: 'ABC', type: 'polygon', pointIds: ['A', 'B', 'C'] },
];

describe('z ekseni: temel', () => {
  it('z tanımsızsa ya da sonlu değilse 0 sayılır', () => {
    expect(noktaZ(P('A', 1, 2))).toBe(0);
    expect(noktaZ(P('A', 1, 2, 3.5))).toBe(3.5);
    expect(noktaZ({ z: Number.NaN })).toBe(0);
    expect(noktaZ(undefined)).toBe(0);
  });

  it('noktaya dayalı türler z taşınabilir; konumlu türler (metin, görsel, kalem, kesir) dışarıda kalır', () => {
    expect(zTasinabilir(ucgen()[3])).toBe(true);
    expect(zTasinabilir({ ...ortak, id: 't', label: 't', type: 'text', text: 'x', x: 0, y: 0 })).toBe(false);
    expect(zTasinabilir({ ...ortak, id: 'k', label: 'k', type: 'pen', points: [], thickness: 2 })).toBe(false);
    expect(zTasinabilir({ ...ortak, id: 'f', label: 'f', type: 'fraction', numerator: 1, denominator: 2, x: 0, y: 0, radius: 1, modelType: 'pie' })).toBe(false);
  });

  it('tanım noktaları moveObjects ile aynı: çember merkez + yarıçap noktası, yay üç nokta', () => {
    expect(tanimNoktalari({ ...ortak, id: 'c', label: 'c', type: 'circle', centerPointId: 'O', radiusPointId: 'R' })).toEqual(['O', 'R']);
    expect(tanimNoktalari({ ...ortak, id: 'y', label: 'y', type: 'arc', centerPointId: 'O', startPointId: 'S', directionPointId: 'D' })).toEqual(['O', 'S', 'D']);
    expect(tanimNoktalari(P('A', 0, 0))).toEqual(['A']);
  });
});

describe('z ekseni: öteleme', () => {
  it('çokgeni z ekseninde 2 birim yukarı taşır; x, y aynen kalır (2B üstten bakış değişmez)', () => {
    const once = ucgen();
    const sonra = nesneleriZdeOtele(once, ['u'], 2);
    for (const id of ['A', 'B', 'C']) {
      expect(noktaZ(byId(sonra, id))).toBe(2);
      expect(byId(sonra, id).x).toBe(byId(once, id).x);
      expect(byId(sonra, id).y).toBe(byId(once, id).y);
    }
    // Girdi değişmez (geri al için eski dizi korunur)
    expect(noktaZ(byId(once, 'A'))).toBe(0);
  });

  it('ortak köşe bir kez kayar (çokgen + köşe noktası birlikte seçili)', () => {
    const sonra = nesneleriZdeOtele(ucgen(), ['u', 'A'], 1.5);
    expect(noktaZ(byId(sonra, 'A'))).toBe(1.5);
  });

  it('kilitli nesne ve z taşımanın dışındaki türler taşınmaz; değişiklik yoksa aynı dizi döner', () => {
    const kilitli = ucgen().map((o) => (o.id === 'u' ? { ...o, locked: true } : o));
    expect(nesneleriZdeOtele(kilitli, ['u'], 2)).toBe(kilitli);
    const metin: MathObject[] = [{ ...ortak, id: 't', label: 't', type: 'text', text: 'x', x: 0, y: 0 }];
    expect(nesneleriZdeOtele(metin, ['t'], 2)).toBe(metin);
    const objs = ucgen();
    expect(nesneleriZdeOtele(objs, ['u'], 0)).toBe(objs);
  });

  it('çember merkezini z ekseninde taşımak yarıçap noktasını da taşır; çember taban z = merkez z', () => {
    const objs: MathObject[] = [
      P('O', 0, 0),
      P('R', 2, 0),
      { ...ortak, id: 'c', label: 'c', type: 'circle', centerPointId: 'O', radiusPointId: 'R' },
    ];
    const sonra = nesneleriZdeOtele(objs, ['c'], 3);
    expect(noktaZ(byId(sonra, 'R'))).toBe(3);
    expect(tabanZ(sonra[2], (id) => noktaZ(byId(sonra, id)))).toBe(3);
  });

  it('ters öteleme (Esc) başlangıç z değerlerini birebir geri verir', () => {
    const once = ucgen();
    const ileri = nesneleriZdeOtele(once, ['u'], 2.37);
    const geri = nesneleriZdeOtele(ileri, ['u'], -2.37);
    for (const id of ['A', 'B', 'C']) expect(noktaZ(byId(geri, id))).toBeCloseTo(0, 9);
  });

  it("kurulumlu ya da nesne üzerindeki nokta z okuyla kaydırılmaz: aynı dizi döner (boş geçmiş adımı yok)", () => {
    const objs: MathObject[] = [
      P('A', 0, 0, 1), P('B', 4, 0, 3),
      P('M', 2, 0, 2, { construction: { kind: 'midpoint', pointIds: ['A', 'B'] } }),
      { ...ortak, id: 'ab', label: 'ab', type: 'segment', startPointId: 'A', endPointId: 'B' },
      P('S', 1, 0, 1.5, { onObjectId: 'ab' }),
    ];
    expect(nesneleriZdeOtele(objs, ['M'], 1)).toBe(objs);
    expect(nesneleriZdeOtele(objs, ['S'], 1)).toBe(objs);
    // Tüm z'ler 0 iken de orta noktaya açık bir `z: 0` alanı eklenmez
    const duz: MathObject[] = [P('A', 0, 0), P('B', 4, 0), P('M', 2, 0, undefined, { construction: { kind: 'midpoint', pointIds: ['A', 'B'] } })];
    expect(nesneleriZdeOtele(duz, ['M'], 1)).toBe(duz);
  });

  it('tanım noktası kilitli olan nesne bütünüyle yerinde kalır (kilitli köşe yükselmez)', () => {
    const objs = ucgen().map((o) => (o.id === 'A' ? { ...o, locked: true } : o));
    expect(nesneleriZdeOtele(objs, ['u'], 2)).toBe(objs);
    // Seçimdeki başka (kilitsiz) nesne yine taşınır
    const ek: MathObject[] = [...objs, P('D', 9, 9)];
    expect(noktaZ(byId(nesneleriZdeOtele(ek, ['u', 'D'], 2), 'D'))).toBe(2);
    expect(noktaZ(byId(nesneleriZdeOtele(ek, ['u', 'D'], 2), 'B'))).toBe(0);
  });

  it('çok basamaklı z (0,1234567) 6 basamağa yuvarlanmaz; 0,1 adımlarının kayan nokta artığı kalmaz', () => {
    const objs: MathObject[] = [P('A', 0, 0, 0.1234567)];
    const ileri = nesneleriZdeOtele(objs, ['A'], 0.1);
    expect(noktaZ(byId(ileri, 'A'))).toBe(0.2234567);
    let s: MathObject[] = [P('A', 0, 0)];
    for (let i = 0; i < 3; i++) s = nesneleriZdeOtele(s, ['A'], 0.1);
    expect(noktaZ(byId(s, 'A'))).toBe(0.3);
  });
});

describe('z ekseni: bağımlı noktaların z kuralı', () => {
  it('orta nokta ebeveynlerin z ortalamasıdır ve taşıma ile güncellenir', () => {
    const objs: MathObject[] = [P('A', 0, 0), P('B', 4, 0), P('M', 2, 0, undefined, { construction: { kind: 'midpoint', pointIds: ['A', 'B'] } })];
    const sonra = nesneleriZdeOtele(objs, ['B'], 4);
    expect(noktaZ(byId(sonra, 'M'))).toBe(2);
  });

  it('oran noktası ebeveynlerin z değerleri arasında doğrusaldır (t = 1/4)', () => {
    const objs: MathObject[] = [P('A', 0, 0, 2), P('B', 4, 0, 6), P('T', 1, 0, 0, { construction: { kind: 'ratio', pointIds: ['A', 'B'], t: 0.25 } })];
    expect(noktaZ(byId(bagimliZleriHesapla(objs), 'T'))).toBe(3);
  });

  it('ağırlık merkezi üç köşenin z ortalaması; zincirli kurulum (orta noktanın orta noktası) da çözülür', () => {
    const objs: MathObject[] = [
      P('A', 0, 0, 3), P('B', 4, 0, 0), P('C', 0, 3, 0),
      P('G', 0, 0, 0, { construction: { kind: 'triangleCenter', pointIds: ['A', 'B', 'C'], center: 'centroid' } }),
      P('M', 0, 0, 0, { construction: { kind: 'midpoint', pointIds: ['A', 'B'] } }),
      P('N', 0, 0, 0, { construction: { kind: 'midpoint', pointIds: ['M', 'C'] } }),
    ];
    const s = bagimliZleriHesapla(objs);
    expect(noktaZ(byId(s, 'G'))).toBe(1);
    expect(noktaZ(byId(s, 'M'))).toBe(1.5);
    expect(noktaZ(byId(s, 'N'))).toBe(0.75);
  });

  it("kesişim noktası ilk kaynağın taban z'sini alır (düzlemsel kurulum)", () => {
    const objs: MathObject[] = [
      P('A', 0, 0, 2), P('B', 4, 4, 2), P('C', 0, 4), P('D', 4, 0),
      { ...ortak, id: 's1', label: 's1', type: 'segment', startPointId: 'A', endPointId: 'B' },
      { ...ortak, id: 's2', label: 's2', type: 'segment', startPointId: 'C', endPointId: 'D' },
      P('K', 2, 2, 0, { construction: { kind: 'intersection', objectIds: ['s1', 's2'], index: 0 } }),
    ];
    expect(noktaZ(byId(bagimliZleriHesapla(objs), 'K'))).toBe(2);
  });

  it('dik ayak doğrunun iki noktası arasında xy izdüşüm parametresiyle doğrusaldır', () => {
    const objs: MathObject[] = [
      P('A', 0, 0, 0), P('B', 4, 0, 4), P('P', 1, 3),
      P('H', 1, 0, 0, { construction: { kind: 'foot', sourceId: 'P', linePointIds: ['A', 'B'] } }),
    ];
    expect(noktaZ(byId(bagimliZleriHesapla(objs), 'H'))).toBe(1);
  });

  it("öteleme, merkeze göre yansıma ve homotete z'de de uygulanır", () => {
    const objs: MathObject[] = [
      P('P', 0, 0, 1), P('M', 0, 0, 3), P('V0', 0, 0, 0), P('V1', 1, 0, 2),
      P('T', 1, 0, 0, { construction: { kind: 'translate', sourceId: 'P', vectorPointIds: ['V0', 'V1'] } }),
      P('Y', 0, 0, 0, { construction: { kind: 'reflect', sourceId: 'P', centerId: 'M' } }),
      P('H', 0, 0, 0, { construction: { kind: 'dilate', sourceId: 'P', centerId: 'M', factor: 2 } }),
    ];
    const s = bagimliZleriHesapla(objs);
    expect(noktaZ(byId(s, 'T'))).toBe(3);
    expect(noktaZ(byId(s, 'Y'))).toBe(5);
    expect(noktaZ(byId(s, 'H'))).toBe(-1);
  });

  it("parça üzerindeki nokta iki uç arasında doğrusal, çember üzerindeki nokta merkezin z'sinde", () => {
    const objs: MathObject[] = [
      P('A', 0, 0, 0), P('B', 4, 0, 2), P('S', 1, 0, 0, { onObjectId: 'ab' }),
      { ...ortak, id: 'ab', label: 'ab', type: 'segment', startPointId: 'A', endPointId: 'B' },
      P('O', 10, 0, 5), P('Q', 12, 0, 0, { onObjectId: 'c' }),
      { ...ortak, id: 'c', label: 'c', type: 'circle', centerPointId: 'O', fixedRadius: 2 },
    ];
    const s = bagimliZleriHesapla(objs);
    expect(noktaZ(byId(s, 'S'))).toBe(0.5);
    expect(noktaZ(byId(s, 'Q'))).toBe(5);
  });

  it('bağımsız noktalar ve z taşımayan sahneler değişmez (aynı dizi)', () => {
    const objs = ucgen();
    expect(bagimliZleriHesapla(objs)).toBe(objs);
    const havada = nesneleriZdeOtele(objs, ['u'], 1);
    expect(bagimliZleriHesapla(havada)).toBe(havada);
  });

  it("xy kurulum çözümü z'yi korur (resolveCommandBindings + z kuralı birlikte)", () => {
    const objs: MathObject[] = [P('A', 0, 0, 2), P('B', 6, 0, 4), P('M', 0, 0, 0, { construction: { kind: 'midpoint', pointIds: ['A', 'B'] } })];
    const s = bagimliZleriHesapla(resolveCommandBindings(objs));
    expect(byId(s, 'M')).toMatchObject({ x: 3, y: 0, z: 3 });
    expect(noktaZ(byId(s, 'A'))).toBe(2);
  });
});

describe('z ekseni: gizmo merkezi', () => {
  it('seçili nesnelerin tanım noktalarının 3B ortası', () => {
    const havada = nesneleriZdeOtele(ucgen(), ['u'], 2);
    const m = nesnelerin3BMerkezi(havada, ['u'])!;
    expect(m.x).toBeCloseTo(4 / 3);
    expect(m.y).toBeCloseTo(1);
    expect(m.z).toBe(2);
    expect(nesnelerin3BMerkezi(havada, ['yok'])).toBeNull();
  });
});

describe('proje dosyası z alanı', () => {
  it('nokta z değerini JSON gidiş-dönüşünde korur', () => {
    const file = { version: '2.0', objects: [P('A', 1, 2, 3.25), P('B', 0, 0)] };
    const loaded = parseProjectFile(JSON.parse(JSON.stringify(file)));
    expect((loaded.objects[0] as PointObject).z).toBe(3.25);
    expect((loaded.objects[1] as PointObject).z).toBeUndefined();
  });

  it.each([{ z: 'iki' }, { z: null }, { z: true }])('geçersiz z değerini reddeder: %j', (bozuk) => {
    expect(() => parseProjectFile({ objects: [{ ...P('A', 0, 0), ...bozuk }] })).toThrow();
  });
});

describe('ortak geri alma sırası (2B + 3B geçmişleri)', () => {
  it('geri alma en yeni adımı seçer; yalnız bir geçmiş varsa onu', () => {
    expect(ortakGeriAlmaHedefi(1000, 2000)).toEqual(['3b']);
    expect(ortakGeriAlmaHedefi(3000, 2000)).toEqual(['2b']);
    expect(ortakGeriAlmaHedefi(undefined, 5)).toEqual(['3b']);
    expect(ortakGeriAlmaHedefi(5, undefined)).toEqual(['2b']);
    expect(ortakGeriAlmaHedefi(undefined, undefined)).toEqual([]);
  });

  it('yineleme en eski adımı seçer; aynı eylemin iki adımı birlikte geri alınır/yinelenir', () => {
    expect(ortakYinelemeHedefi(1000, 2000)).toEqual(['2b']);
    expect(ortakYinelemeHedefi(3000, 2000)).toEqual(['3b']);
    expect(ortakGeriAlmaHedefi(1000, 1000 + AYNI_EYLEM_MS - 1)).toEqual(['2b', '3b']);
    expect(ortakYinelemeHedefi(1000, 1003)).toEqual(['2b', '3b']);
  });
});

describe('seçim çubuğu başlığı', () => {
  it('nesne ve cisim sayılarını birlikte yazar', () => {
    expect(secimBasligi(2, 0)).toBe('2 nesne seçildi');
    expect(secimBasligi(0, 1)).toBe('1 cisim seçildi');
    expect(secimBasligi(3, 2)).toBe('3 nesne, 2 cisim seçildi');
  });
});
