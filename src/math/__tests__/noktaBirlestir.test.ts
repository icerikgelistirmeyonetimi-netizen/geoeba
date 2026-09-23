import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject } from '@/types/math';
import { objectDependencies } from '@/state/WorkspaceContext';
import { resolveCommandBindings } from '@/math/commandBindings';
import { validateProjectObjects } from '@/math/projectFile';
import {
  bagimliliklar,
  baglariYonlendir,
  birlesmeSirasi,
  birlestirmeIpucu,
  birlestirmeMaddesi,
  birlestirmeToleransi,
  bozukMu,
  noktalariBirlestir,
  ustUsteCiftler,
  ustUsteNoktalar,
  ustUsteleriBirlestir,
} from '@/math/noktaBirlestir';

const T = 1750000000000;

const nokta = (id: string, x = 0, y = 0, ek: Record<string, unknown> = {}): MathObject =>
  ({ id, type: 'point', label: id, showLabel: true, x, y, color: '#2563eb', visible: true, isIndependent: true, createdAt: T, ...ek }) as MathObject;

const yap = (o: Record<string, unknown>): MathObject =>
  ({ showLabel: true, visible: true, color: '#000', createdAt: T, label: String(o.id), ...o }) as MathObject;

/** Sahnede HİÇBİR nesne var olmayan bir kimliğe işaret etmemeli. */
function sarkikBasvurular(objects: MathObject[]): string[] {
  const idler = new Set(objects.map(o => o.id));
  const sarkik: string[] = [];
  for (const o of objects) {
    for (const d of bagimliliklar(o)) if (d && !idler.has(d)) sarkik.push(`${o.id} → ${d}`);
    if (o.type === 'point' && o.dependsOn) for (const d of o.dependsOn) if (!idler.has(d)) sarkik.push(`${o.id} → ${d}`);
    if (o.type === 'circle' && o.releasedRadiusPointId && !idler.has(o.releasedRadiusPointId)) sarkik.push(`${o.id} → ${o.releasedRadiusPointId}`);
    if (o.type === 'measurement' && o.startPointId && !idler.has(o.startPointId)) sarkik.push(`${o.id} → ${o.startPointId}`);
  }
  return sarkik;
}

/** Sahnenin tamamında kaldırılan kimliğin kaç kez geçtiği (ham JSON taraması: hiçbir alan atlanmasın). */
const gecisSayisi = (objects: MathObject[], id: string) => (JSON.stringify(objects).match(new RegExp(`"${id}"`, 'g')) ?? []).length;

describe('ölçüm etiketi çapalarının nokta birleştirmesi', () => {
  it('dekoratif grup noktalarını yönlendirir ve aynı noktayı iki kez saymaz', () => {
    const shape = yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'D',
      labelAnchors: { length: { pointIds: ['A', 'C', 'D'], offset: { x: 5, y: 2 }, alignment: 'left' } } });
    const snapshot = JSON.stringify(shape);
    const next = baglariYonlendir(shape, 'C', 'A');
    expect(next.labelAnchors?.length).toEqual({ pointIds: ['A', 'D'], offset: { x: 5, y: 2 }, alignment: 'left' });
    expect(bagimliliklar(shape)).toEqual(['A', 'D']);
    expect(JSON.stringify(shape)).toBe(snapshot);
  });

  it('yalnız etikette geçen kaldırılan kimliği de canlı birleştirmeden sonra bırakmaz', () => {
    const shape = yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'D',
      labelOffsets: { length: { x: 2, y: 1 } },
      labelAnchors: { length: { pointIds: ['A', 'C', 'D'], offset: { x: 5, y: 2 }, alignment: 'right' } } });
    const scene = [nokta('A'), nokta('C'), nokta('D', 4, 0), shape];
    const result = noktalariBirlestir(scene, 'A', 'C');
    expect(result.changed).toBe(true);
    expect(gecisSayisi(result.objects, result.dropId)).toBe(0);
    expect(result.objects.find(o => o.id === 's')?.labelAnchors?.length.pointIds).toEqual(['A', 'D']);
    expect(validateProjectObjects(result.objects)).toEqual(result.objects);
  });
});

describe('üst üste gelen noktaları bulma', () => {
  it('ekran piksel sınırını dünya birimine çevirir', () => {
    expect(birlestirmeToleransi(40)).toBeCloseTo(0.3, 10);
    expect(birlestirmeToleransi(0)).toBeGreaterThan(0);
  });

  it('yalnızca toleransa giren GÖRÜNÜR noktaları üst üste sayar', () => {
    const s = [nokta('A', 2, 2), nokta('C', 2.1, 2), nokta('D', 5, 5), nokta('G', 2, 2, { visible: false })];
    expect(ustUsteNoktalar(s, 'A', 0.3).map(p => p.id)).toEqual(['C']);
    expect(ustUsteNoktalar(s, 'D', 0.3)).toEqual([]);
  });

  it('en yakın olanı önce verir', () => {
    const s = [nokta('A', 0, 0), nokta('B', 0.2, 0), nokta('C', 0.05, 0)];
    expect(ustUsteNoktalar(s, 'A', 0.3).map(p => p.id)).toEqual(['C', 'B']);
  });

  it('sahnedeki bütün çiftleri bir kez listeler', () => {
    const s = [nokta('A', 0, 0), nokta('B', 0, 0), nokta('C', 0, 0), nokta('D', 9, 9)];
    expect(ustUsteCiftler(s, 0.3)).toEqual([['A', 'B'], ['A', 'C'], ['B', 'C']]);
  });

  it('noktalar üst üste DEĞİLKEN hiçbir şey değişmez (birleştirme yine de istenirse çalışır)', () => {
    const s = [nokta('A', 0, 0), nokta('B', 5, 5)];
    expect(ustUsteCiftler(s, 0.3)).toEqual([]);
    expect(ustUsteleriBirlestir(s, 0.3)).toEqual({ objects: s, birlesme: 0, kaldirilan: 0, atlanan: 0 });
  });
});

describe('hangi nokta kalır', () => {
  it('kurulumlu nokta serbest noktayı yener', () => {
    const s = [nokta('X', -1, 0), nokta('Y', 1, 0), nokta('M', 0, 0, { isIndependent: false, construction: { kind: 'midpoint', pointIds: ['X', 'Y'] } }), nokta('A', 0, 0)];
    expect(birlesmeSirasi(s, 'A', 'M')).toMatchObject({ keepId: 'M', dropId: 'A', reason: 'kurulumlu' });
  });

  it('nesne ÜZERİNDEKİ nokta serbest noktayı yener', () => {
    const s = [nokta('O', 0, 0), nokta('R', 3, 0), yap({ id: 'c', type: 'circle', centerPointId: 'O', radiusPointId: 'R' }),
      nokta('P', 3, 0, { onObjectId: 'c' }), nokta('A', 3, 0)];
    expect(birlesmeSirasi(s, 'A', 'P')).toMatchObject({ keepId: 'P', dropId: 'A', reason: 'kurulumlu' });
  });

  it('kaynağına dayanan nokta KALAMAZ (döngü doğmasın)', () => {
    // M, A ile B'nin orta noktası; A ile M üst üste gelirse M kalırsa kendi kendinin orta noktası olurdu
    const s = [nokta('A', 0, 0), nokta('B', 0, 0), nokta('M', 0, 0, { isIndependent: false, construction: { kind: 'midpoint', pointIds: ['A', 'B'] } })];
    expect(birlesmeSirasi(s, 'A', 'M')).toMatchObject({ keepId: 'A', dropId: 'M', reason: 'bagimlilik' });
  });

  it('eşit türde sahnenin daha çok dayandığı nokta kalır', () => {
    const s = [nokta('A', 0, 0), nokta('C', 0, 0), nokta('D', 4, 0), nokta('E', 0, 4),
      yap({ id: 's1', type: 'segment', startPointId: 'C', endPointId: 'D' }),
      yap({ id: 's2', type: 'segment', startPointId: 'C', endPointId: 'E' })];
    expect(birlesmeSirasi(s, 'A', 'C')).toMatchObject({ keepId: 'C', dropId: 'A', reason: 'kullanim' });
  });

  it('her şey eşitse önce çizilen kalır', () => {
    const s = [nokta('A', 0, 0, { createdAt: T }), nokta('C', 0, 0, { createdAt: T + 500 })];
    expect(birlesmeSirasi(s, 'C', 'A')).toMatchObject({ keepId: 'A', dropId: 'C', reason: 'once' });
  });

  it('aynı nokta ya da eksik nokta için karar vermez', () => {
    const s = [nokta('A')];
    expect(birlesmeSirasi(s, 'A', 'A')).toBeNull();
    expect(birlesmeSirasi(s, 'A', 'yok')).toBeNull();
    expect(noktalariBirlestir(s, 'A', 'A').changed).toBe(false);
  });
});

describe('bütün başvuru türleri kalan noktaya yönlendirilir', () => {
  it('şekil, ölçüm ve etkileşim bileşeni alanlarının hepsini çevirir', () => {
    // A bir doğru parçasının ÜZERİNDE durduğu için kalan nokta odur; C'nin bütün başvuruları ona taşınmalı.
    const s: MathObject[] = [
      nokta('A', 2, 2, { createdAt: T, onObjectId: 'tas' }), nokta('C', 2, 2, { createdAt: T + 1 }), nokta('D', 4, 0), nokta('E', 0, 4), nokta('F', 6, 6),
      yap({ id: 'tas', type: 'segment', startPointId: 'D', endPointId: 'E' }),
      yap({ id: 'seg', type: 'segment', startPointId: 'C', endPointId: 'D' }),
      yap({ id: 'lin', type: 'line', point1Id: 'C', point2Id: 'E' }),
      yap({ id: 'ray', type: 'ray', startPointId: 'C', throughPointId: 'F' }),
      yap({ id: 'cem', type: 'circle', centerPointId: 'C', radiusPointId: 'D' }),
      yap({ id: 'cev', type: 'circle', centerPointId: '', throughPointIds: ['C', 'E', 'F'] }),
      yap({ id: 'elp', type: 'ellipse', centerPointId: 'C', radiusX: 2, radiusY: 1 }),
      yap({ id: 'yay', type: 'arc', centerPointId: 'D', startPointId: 'C', directionPointId: 'E' }),
      yap({ id: 'dlm', type: 'sector', centerPointId: 'E', startPointId: 'C', directionPointId: 'F' }),
      yap({ id: 'aci', type: 'angle', point1Id: 'D', vertexPointId: 'C', point3Id: 'E' }),
      yap({ id: 'cok', type: 'polygon', pointIds: ['C', 'D', 'E', 'F'] }),
      yap({ id: 'egm', type: 'measurement', kind: 'slope', pointIds: ['C', 'D'] }),
      yap({ id: 'trg', type: 'measurement', kind: 'trig', pointIds: ['C', 'D', 'E'] }),
      yap({ id: 'yol', type: 'measurement', kind: 'arc', pointIds: ['C', 'E'], circleId: 'cev', startPointId: 'C', throughPointId: 'F' }),
      yap({ id: 'kut', type: 'checkbox', x: 0, y: 0, targetIds: ['C', 'seg'], checked: true }),
      yap({ id: 'dg1', type: 'button', x: 0, y: 0, action: { kind: 'toggle', targetIds: ['C'] } }),
      yap({ id: 'dg2', type: 'button', x: 0, y: 0, action: { kind: 'animate', targetIds: ['C'], sliderIds: [] } }),
      yap({ id: 'dg3', type: 'button', x: 0, y: 0, action: { kind: 'setValue', targetId: 'C', value: 2 } }),
      yap({ id: 'giri', type: 'input_box', x: 0, y: 0, targetId: 'C', field: 'value' }),
      nokta('P', 1, 1, { onObjectId: 'seg', dependsOn: ['C'] }),
    ];
    const r = noktalariBirlestir(s, 'A', 'C');
    expect(r.changed).toBe(true);
    expect(r.keepId).toBe('A');
    expect(r.dropId).toBe('C');
    // Sahnede "C" kimliği bir kez bile geçmemeli
    expect(gecisSayisi(r.objects, 'C')).toBe(0);
    expect(sarkikBasvurular(r.objects)).toEqual([]);
    const al = (id: string) => r.objects.find(o => o.id === id) as never as Record<string, unknown>;
    expect(al('seg')).toMatchObject({ startPointId: 'A' });
    expect(al('lin')).toMatchObject({ point1Id: 'A' });
    expect(al('ray')).toMatchObject({ startPointId: 'A' });
    expect(al('cem')).toMatchObject({ centerPointId: 'A' });
    expect(al('cev')).toMatchObject({ throughPointIds: ['A', 'E', 'F'] });
    expect(al('elp')).toMatchObject({ centerPointId: 'A' });
    expect(al('yay')).toMatchObject({ startPointId: 'A' });
    expect(al('dlm')).toMatchObject({ startPointId: 'A' });
    expect(al('aci')).toMatchObject({ vertexPointId: 'A' });
    expect(al('cok')).toMatchObject({ pointIds: ['A', 'D', 'E', 'F'] });
    expect(al('egm')).toMatchObject({ pointIds: ['A', 'D'] });
    expect(al('trg')).toMatchObject({ pointIds: ['A', 'D', 'E'] });
    expect(al('yol')).toMatchObject({ pointIds: ['A', 'E'], startPointId: 'A', throughPointId: 'F' });
    expect(al('kut')).toMatchObject({ targetIds: ['A', 'seg'] });
    expect(al('dg1')).toMatchObject({ action: { kind: 'toggle', targetIds: ['A'] } });
    expect(al('dg2')).toMatchObject({ action: { kind: 'animate', targetIds: ['A'] } });
    expect(al('dg3')).toMatchObject({ action: { kind: 'setValue', targetId: 'A' } });
    expect(al('giri')).toMatchObject({ targetId: 'A' });
    expect(al('P')).toMatchObject({ dependsOn: ['A'] });
  });

  it('düğmenin kaydırıcı hedeflerini ve çemberin bırakılmış yarıçap noktasını da çevirir', () => {
    const s: MathObject[] = [
      nokta('A', 0, 0), nokta('C', 0, 0), nokta('O', 5, 5),
      yap({ id: 'c', type: 'circle', centerPointId: 'O', fixedRadius: 2, releasedRadiusPointId: 'C' }),
      yap({ id: 'sl', type: 'slider', variableName: 'a', min: 0, max: 5, step: 1, value: 1 }),
      yap({ id: 'dg', type: 'button', x: 0, y: 0, action: { kind: 'setSlider', sliderId: 'sl', value: 3 } }),
    ];
    const r = noktalariBirlestir(s, 'A', 'C');
    expect(gecisSayisi(r.objects, 'C')).toBe(0);
    expect(r.objects.find(o => o.id === 'c')).toMatchObject({ releasedRadiusPointId: 'A' });
    expect(r.objects.find(o => o.id === 'dg')).toMatchObject({ action: { kind: 'setSlider', sliderId: 'sl' } });
  });

  it.each([
    ['foot', { kind: 'foot', sourceId: 'C', linePointIds: ['C', 'D'] }],
    ['midpoint', { kind: 'midpoint', pointIds: ['C', 'D'] }],
    ['tangent', { kind: 'tangent', circleId: 'cem', sourceId: 'C', branch: 1 }],
    ['triangleVertex', { kind: 'triangleVertex', anchorId: 'C', sliderIds: ['s1', 's2', 's3'], vertex: 1, rotation: 0, orientation: 1 }],
    ['sliderPoint length', { kind: 'sliderPoint', sliderId: 's1', mode: 'length', anchorId: 'C', direction: { x: 1, y: 0 } }],
    ['sliderPoint angle', { kind: 'sliderPoint', sliderId: 's1', mode: 'angle', anchorId: 'C', referenceId: 'C', radius: 2, orientation: 1 }],
    ['ratio', { kind: 'ratio', pointIds: ['C', 'D'], t: 0.5 }],
    ['direction', { kind: 'direction', throughId: 'C', linePointIds: ['C', 'D'], mode: 'parallel' }],
    ['bisector', { kind: 'bisector', pointIds: ['C', 'D', 'C'] }],
    ['intersection', { kind: 'intersection', objectIds: ['C', 'D'], index: 0 }],
    ['reflect', { kind: 'reflect', sourceId: 'C', axisPointIds: ['C', 'D'], centerId: 'C' }],
    ['rotate', { kind: 'rotate', sourceId: 'C', centerId: 'C', degrees: 30 }],
    ['translate', { kind: 'translate', sourceId: 'C', vectorPointIds: ['C', 'D'] }],
    ['dilate', { kind: 'dilate', sourceId: 'C', centerId: 'C', factor: 2 }],
    ['triangleCenter', { kind: 'triangleCenter', pointIds: ['C', 'D', 'C'], center: 'centroid' }],
  ])('kurulum türü %s içindeki her kaynağı çevirir', (_ad, construction) => {
    const p = nokta('K', 1, 1, { isIndependent: false, construction }) as PointObject;
    const cevrilen = baglariYonlendir(p, 'C', 'A') as PointObject;
    expect(JSON.stringify(cevrilen.construction)).not.toContain('"C"');
    expect(JSON.stringify(cevrilen.construction)).toContain('"A"');
  });
});

describe('bozulan nesneler', () => {
  const ikiUstUste = (ek: MathObject[]) => [nokta('A', 0, 0, { createdAt: T }), nokta('C', 0, 0, { createdAt: T + 1 }), ...ek];

  it('iki ucu aynı noktaya gelen parça, doğru ve ışını kaldırır', () => {
    const s = ikiUstUste([
      yap({ id: 'seg', type: 'segment', startPointId: 'A', endPointId: 'C' }),
      yap({ id: 'lin', type: 'line', point1Id: 'A', point2Id: 'C' }),
      yap({ id: 'ray', type: 'ray', startPointId: 'A', throughPointId: 'C' }),
    ]);
    const r = noktalariBirlestir(s, 'A', 'C');
    expect(r.objects.map(o => o.id)).toEqual(['A']);
    expect(r.kaldirilanlar.map(o => o.id).sort()).toEqual(['lin', 'ray', 'seg']);
  });

  it('köşesi yinelenen çokgenden köşeyi düşürür ve kenar etiketlerini taşır', () => {
    const s = ikiUstUste([nokta('D', 4, 0), nokta('E', 0, 4),
      yap({ id: 'cok', type: 'polygon', pointIds: ['A', 'C', 'D', 'E'], edgeLabels: [1, 2], edgeEqualityMarks: { '2': 1, '3': 2 } })]);
    const r = noktalariBirlestir(s, 'A', 'C');
    const cok = r.objects.find(o => o.id === 'cok') as never as Record<string, unknown>;
    expect(cok).toMatchObject({ pointIds: ['A', 'D', 'E'] });
    // Eski 0-1 kenarı (A→C) yok oldu; 1 (C→D) yeni 0, 2 (D→E) yeni 1, 3 (E→A) yeni 2
    expect(cok.edgeLabels).toEqual([0, 1]);
    expect(cok.edgeEqualityMarks).toEqual({ '1': 1, '2': 2 });
    expect(r.kaldirilanlar).toEqual([]);
  });

  it('üçgenin iki köşesi birleşince üçgeni kaldırır ama kalan noktaları korur', () => {
    const s = ikiUstUste([nokta('D', 4, 0), yap({ id: 'ucg', type: 'polygon', pointIds: ['A', 'C', 'D'] })]);
    const r = noktalariBirlestir(s, 'A', 'C');
    expect(r.objects.map(o => o.id).sort()).toEqual(['A', 'D']);
    expect(r.kaldirilanlar.map(o => o.id)).toEqual(['ucg']);
  });

  it('çokgenin ilk ve son köşesi birleşince de köşeyi düşürür', () => {
    const s = ikiUstUste([nokta('D', 4, 0), nokta('E', 0, 4),
      yap({ id: 'cok', type: 'polygon', pointIds: ['A', 'D', 'E', 'C'] })]);
    const r = noktalariBirlestir(s, 'A', 'C');
    expect(r.objects.find(o => o.id === 'cok')).toMatchObject({ pointIds: ['A', 'D', 'E'] });
  });

  it('merkezi yarıçap noktasına eşitlenen çemberi kaldırır', () => {
    const s = ikiUstUste([yap({ id: 'cem', type: 'circle', centerPointId: 'A', radiusPointId: 'C' })]);
    expect(noktalariBirlestir(s, 'A', 'C').kaldirilanlar.map(o => o.id)).toEqual(['cem']);
  });

  it('üç noktası ikiye düşen çevrel çemberi kaldırır', () => {
    const s = ikiUstUste([nokta('D', 4, 0), yap({ id: 'cev', type: 'circle', centerPointId: '', throughPointIds: ['A', 'C', 'D'] })]);
    expect(noktalariBirlestir(s, 'A', 'C').kaldirilanlar.map(o => o.id)).toEqual(['cev']);
  });

  it('ayrı noktasını yitiren yayı ve daire dilimini kaldırır', () => {
    const s = ikiUstUste([nokta('D', 4, 0),
      yap({ id: 'yay', type: 'arc', centerPointId: 'D', startPointId: 'A', directionPointId: 'C' }),
      yap({ id: 'dlm', type: 'sector', centerPointId: 'A', startPointId: 'C', directionPointId: 'D' })]);
    expect(noktalariBirlestir(s, 'A', 'C').kaldirilanlar.map(o => o.id).sort()).toEqual(['dlm', 'yay']);
  });

  it('köşesi koluna eşitlenen açıyı kaldırır', () => {
    const s = ikiUstUste([nokta('D', 4, 0), yap({ id: 'aci', type: 'angle', point1Id: 'D', vertexPointId: 'A', point3Id: 'C' })]);
    expect(noktalariBirlestir(s, 'A', 'C').kaldirilanlar.map(o => o.id)).toEqual(['aci']);
  });

  it('aynı şeyi ölçen ikinci etiketi kaldırır, ilkini bırakır', () => {
    const s = ikiUstUste([nokta('D', 4, 0),
      yap({ id: 'o1', type: 'measurement', kind: 'distance', pointIds: ['A', 'D'] }),
      yap({ id: 'o2', type: 'measurement', kind: 'distance', pointIds: ['D', 'C'] })]);
    const r = noktalariBirlestir(s, 'A', 'C');
    expect(r.objects.some(o => o.id === 'o1')).toBe(true);
    expect(r.kaldirilanlar.map(o => o.id)).toEqual(['o2']);
  });

  it('iki ucu aynı olan ölçüm etiketini kaldırır', () => {
    const s = ikiUstUste([yap({ id: 'o1', type: 'measurement', kind: 'distance', pointIds: ['A', 'C'] })]);
    expect(noktalariBirlestir(s, 'A', 'C').kaldirilanlar.map(o => o.id)).toEqual(['o1']);
  });

  it('kaldırılan nesneye dayanan her şeyi de (zincirleme) kaldırır', () => {
    const s = ikiUstUste([
      yap({ id: 'seg', type: 'segment', startPointId: 'A', endPointId: 'C' }),
      nokta('P', 0, 0, { onObjectId: 'seg' }),
      yap({ id: 'kut', type: 'checkbox', x: 0, y: 0, targetIds: ['seg'], checked: true }),
    ]);
    const r = noktalariBirlestir(s, 'A', 'C');
    expect(r.objects.map(o => o.id)).toEqual(['A']);
    expect(r.kaldirilanlar.map(o => o.id).sort()).toEqual(['P', 'kut', 'seg']);
    expect(sarkikBasvurular(r.objects)).toEqual([]);
  });

  it('bozuk olmayanları olduğu gibi bırakır', () => {
    expect(bozukMu(yap({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'B' }))).toBe(false);
    expect(bozukMu(yap({ id: 'c', type: 'circle', centerPointId: 'O', fixedRadius: 2 }))).toBe(false);
    expect(bozukMu(yap({ id: 'e', type: 'ellipse', centerPointId: 'A', radiusX: 1, radiusY: 2 }))).toBe(false);
  });
});

describe('kullanıcının durumu: üst üste iki serbest nokta ve bir parça', () => {
  const sahne = (): MathObject[] => [
    nokta('A', 2, 2, { createdAt: T }),
    nokta('B', 6, 2),
    nokta('C', 2, 2, { createdAt: T + 100 }),
    yap({ id: 'seg', type: 'segment', startPointId: 'C', endPointId: 'B', label: '[CB]' }),
  ];

  it('çizimi taşıyan nokta kalır; parça sarkık başvuru bırakmaz', () => {
    // İkisi de serbest: sahnenin daha çok dayandığı C kalır, A gider (M3: "kullanım" kuralı)
    const r = noktalariBirlestir(sahne(), 'A', 'C');
    expect(r.keepId).toBe('C');
    expect(r.dropId).toBe('A');
    expect(r.objects.find(o => o.id === 'seg')).toMatchObject({ startPointId: 'C', endPointId: 'B' });
    expect(r.objects.map(o => o.id).sort()).toEqual(['B', 'C', 'seg']);
    expect(sarkikBasvurular(r.objects)).toEqual([]);
  });

  it('ipucu hangi adın kaldığını ve kaç nesnenin taşındığını söyler', () => {
    // Aynı sahnede A'nın üzerinde bir parça olursa bu kez A gitmez, C gider
    const s: MathObject[] = [
      nokta('A', 2, 2, { createdAt: T }), nokta('B', 6, 2), nokta('C', 2, 2, { createdAt: T + 100 }),
      yap({ id: 'sA', type: 'segment', startPointId: 'A', endPointId: 'B' }),
      yap({ id: 'sC', type: 'segment', startPointId: 'C', endPointId: 'B' }),
      yap({ id: 'oC', type: 'measurement', kind: 'slope', pointIds: ['C', 'B'] }),
    ];
    const r = noktalariBirlestir(s, 'A', 'C');
    expect(r.keepId).toBe('C');
    const ipucu = birlestirmeIpucu(r);
    expect(ipucu).toContain('A noktası C ile birleştirildi.');
    expect(ipucu).toContain('A noktasına bağlı 1 nesne artık C noktasını kullanıyor.');
    expect(ipucu).toContain('Ctrl+Z');
  });

  it('menü maddesi iki adı da yazar', () => {
    expect(birlestirmeMaddesi('C', 'A')).toBe('C ve A noktalarını birleştir');
  });

  it('kaldırılan nesneleri ipucunda sayar', () => {
    const s: MathObject[] = [nokta('A', 0, 0, { createdAt: T }), nokta('C', 0, 0, { createdAt: T + 1 }),
      yap({ id: 'seg', type: 'segment', startPointId: 'A', endPointId: 'C', label: '[AC]' })];
    expect(birlestirmeIpucu(noktalariBirlestir(s, 'A', 'C'))).toContain('1 nesne kaldırıldı');
  });
});

describe('nesne üzerindeki nokta ve zincirler', () => {
  it('çember üzerindeki noktanın üstüne bırakılan serbest nokta, çemberdekine katılır', () => {
    const s: MathObject[] = [
      nokta('O', 0, 0), nokta('R', 3, 0),
      yap({ id: 'c', type: 'circle', centerPointId: 'O', radiusPointId: 'R' }),
      nokta('P', 0, 3, { onObjectId: 'c' }),
      nokta('A', 0, 3),
      yap({ id: 'seg', type: 'segment', startPointId: 'A', endPointId: 'O' }),
    ];
    const r = noktalariBirlestir(s, 'A', 'P');
    expect(r.keepId).toBe('P');
    expect(r.objects.find(o => o.id === 'seg')).toMatchObject({ startPointId: 'P' });
    expect(r.objects.find(o => o.id === 'P')).toMatchObject({ onObjectId: 'c', x: 0, y: 3 });
    expect(sarkikBasvurular(r.objects)).toEqual([]);
  });

  it('serbest nokta orta noktanın üstüne bırakılınca orta nokta kalır ve yerinden oynamaz', () => {
    const s: MathObject[] = [
      nokta('X', -2, 0), nokta('Y', 2, 0),
      nokta('M', 0, 0, { isIndependent: false, construction: { kind: 'midpoint', pointIds: ['X', 'Y'] } }),
      nokta('A', 0.1, 0),
      yap({ id: 'seg', type: 'segment', startPointId: 'A', endPointId: 'X' }),
    ];
    const r = noktalariBirlestir(s, 'A', 'M');
    expect(r.keepId).toBe('M');
    expect(r.objects.find(o => o.id === 'M')).toMatchObject({ x: 0, y: 0 });
    expect(r.objects.find(o => o.id === 'seg')).toMatchObject({ startPointId: 'M' });
  });

  it('üst üste ÜÇ nokta arka arkaya birleştirilince tek noktaya iner', () => {
    let s: MathObject[] = [
      nokta('A', 1, 1, { createdAt: T }), nokta('C', 1, 1, { createdAt: T + 1 }), nokta('E', 1, 1, { createdAt: T + 2 }), nokta('B', 5, 1),
      yap({ id: 's1', type: 'segment', startPointId: 'C', endPointId: 'B' }),
      yap({ id: 's2', type: 'segment', startPointId: 'E', endPointId: 'B' }),
    ];
    const ilk = noktalariBirlestir(s, 'A', 'C');
    expect(ilk.keepId).toBe('C'); // parçası olan kalır
    const ikinci = noktalariBirlestir(ilk.objects, ilk.keepId, 'E');
    expect(ikinci.keepId).toBe('C'); // eşit kullanımda önce çizilen kalır
    expect(ikinci.objects.filter(o => o.type === 'point').map(o => o.id).sort()).toEqual(['B', 'C']);
    // İki parça da kalan noktayı kullanır (birbirinin kopyası olsalar da silinmez)
    expect(ikinci.objects.filter(o => o.type === 'segment')).toHaveLength(2);
    for (const seg of ikinci.objects.filter(o => o.type === 'segment')) expect(seg).toMatchObject({ startPointId: 'C' });
    expect(sarkikBasvurular(ikinci.objects)).toEqual([]);
  });

  it('“üst üste gelen noktaları birleştir” bütün çiftleri tek geçişte toplar', () => {
    const s: MathObject[] = [
      nokta('A', 1, 1, { createdAt: T }), nokta('C', 1, 1, { createdAt: T + 1 }), nokta('E', 1, 1, { createdAt: T + 2 }),
      nokta('B', 5, 1, { createdAt: T }), nokta('D', 5, 1, { createdAt: T + 1 }),
      yap({ id: 's1', type: 'segment', startPointId: 'C', endPointId: 'D' }),
    ];
    const r = ustUsteleriBirlestir(s, 0.3);
    expect(r.birlesme).toBe(3);
    // Her iki yığında da parçayı taşıyan nokta kalır
    expect(r.objects.filter(o => o.type === 'point').map(o => o.id).sort()).toEqual(['C', 'D']);
    expect(r.objects.find(o => o.id === 's1')).toMatchObject({ startPointId: 'C', endPointId: 'D' });
    expect(sarkikBasvurular(r.objects)).toEqual([]);
  });
});

describe('kaynakları çöken kurulumlar', () => {
  /** Birleşmeden sonra sahne GERÇEKTEN çözülebilmeli: commit sırasında resolveCommandBindings de çalışır. */
  const cozulur = (objects: MathObject[]) => {
    expect(() => resolveCommandBindings(objects)).not.toThrow();
    expect(() => validateProjectObjects(JSON.parse(JSON.stringify(objects)))).not.toThrow();
  };

  it('kaydırıcı açısının köşesi ve referansı birleşirse açıyı ve bağlı parçayı kaldırır', () => {
    const s = [nokta('A', 0, 0), nokta('R', 0.05, 0),
      yap({ id: 'sl', type: 'slider', variableName: 'a', min: 0, max: 180, step: 1, value: 60 }),
      nokta('B', 1, Math.sqrt(3), { construction: { kind: 'sliderPoint', sliderId: 'sl', mode: 'angle', anchorId: 'A', referenceId: 'R', radius: 2, orientation: 1 } }),
      yap({ id: 'sAB', type: 'segment', startPointId: 'A', endPointId: 'B' })];
    const r = noktalariBirlestir(s, 'A', 'R');
    expect(r.changed).toBe(true);
    expect(r.kaldirilanlar.map(o => o.id).sort()).toEqual(['B', 'sAB']);
    expect(r.objects.find(o => o.id === 'sl')).toBeDefined();
    expect(sarkikBasvurular(r.objects)).toEqual([]);
    cozulur(r.objects);
  });

  it('kaydırıcı uzunluğunun dayandığı nokta birleşince bağ yeni noktada canlı kalır', () => {
    const s = [nokta('A', 0, 0), nokta('C', 0.03, 0),
      yap({ id: 'sl', type: 'slider', variableName: 'a', min: 1, max: 10, step: 1, value: 5 }),
      nokta('B', 3.03, 4, { construction: { kind: 'sliderPoint', sliderId: 'sl', mode: 'length', anchorId: 'C', direction: { x: 0.6, y: 0.8 } } })];
    const r = noktalariBirlestir(s, 'A', 'C');
    expect(r.changed).toBe(true);
    const target = r.objects.find((o): o is PointObject => o.id === 'B' && o.type === 'point')!;
    expect(target.construction).toMatchObject({ sliderId: 'sl', anchorId: r.keepId });
    expect(bagimliliklar(target).sort()).toEqual([r.keepId, 'sl'].sort());
    expect(birlesmeSirasi(r.objects, r.keepId, 'B')).toMatchObject({ keepId: r.keepId, dropId: 'B', reason: 'bagimlilik' });
    expect(sarkikBasvurular(r.objects)).toEqual([]);
    cozulur(r.objects);
    const changed = resolveCommandBindings(r.objects.map(o => o.id === 'sl' ? { ...o, value: 10 } : o));
    const anchor = changed.find(o => o.id === r.keepId) as PointObject;
    const end = changed.find(o => o.id === 'B') as PointObject;
    expect(end.x - anchor.x).toBeCloseTo(6);
    expect(end.y - anchor.y).toBeCloseTo(8);
  });

  it('yansıma ekseninin iki noktası birleşince yansıma noktası kaldırılır (adım reddedilmez)', () => {
    const s = [nokta('A', 2, 2), nokta('B', 2.06, 2), nokta('P', -1, 3),
      nokta('Q', 5, 5, { construction: { kind: 'reflect', sourceId: 'P', axisPointIds: ['A', 'B'] } }),
      yap({ id: 'sPQ', type: 'segment', startPointId: 'P', endPointId: 'Q' })];
    const r = noktalariBirlestir(s, 'A', 'B');
    expect(r.changed).toBe(true);
    expect(r.kaldirilanlar.map(o => o.id).sort()).toEqual(['Q', 'sPQ']);
    expect(r.objects.map(o => o.id).sort()).toEqual(['A', 'P']);
    expect(sarkikBasvurular(r.objects)).toEqual([]);
    cozulur(r.objects);
  });

  it('dik ayağının doğrultusu çökünce ayak noktası da gider', () => {
    const s = [nokta('A', -2, 0), nokta('B', -1.94, 0), nokta('P', 0, 3),
      yap({ id: 'd', type: 'line', point1Id: 'A', point2Id: 'B' }),
      nokta('F', 0, 0, { construction: { kind: 'foot', sourceId: 'P', linePointIds: ['A', 'B'] } })];
    const r = noktalariBirlestir(s, 'A', 'B');
    expect(r.kaldirilanlar.map(o => o.id).sort()).toEqual(['F', 'd']);
    cozulur(r.objects);
  });

  it('kaynakları aynı noktaya gelen orta nokta/oran noktası kaldırılır (sonsuza dek yapışık kalmaz)', () => {
    for (const kurulum of [
      { kind: 'midpoint', pointIds: ['A', 'B'] },
      { kind: 'ratio', pointIds: ['A', 'B'], t: 0.5 },
    ] as const) {
      const s = [nokta('A', 2, 2), nokta('B', 2.05, 2), nokta('M', 2, 2, { construction: kurulum })];
      const r = noktalariBirlestir(s, 'A', 'B');
      expect(r.kaldirilanlar.map(o => o.id)).toEqual(['M']);
      expect(r.objects.map(o => o.id)).toEqual(['A']);
      cozulur(r.objects);
    }
  });

  it('öteleme vektörünün iki ucu birleşince ötelenen şekil kaynağın üstüne çökmez, kaldırılır', () => {
    const s = [nokta('U', 1, 1), nokta('V', 1.05, 1), nokta('A', 3, 1), nokta('B', 5, 1),
      nokta('A2', 3, 1, { construction: { kind: 'translate', sourceId: 'A', vectorPointIds: ['U', 'V'] } }),
      nokta('B2', 5, 1, { construction: { kind: 'translate', sourceId: 'B', vectorPointIds: ['U', 'V'] } })];
    const r = noktalariBirlestir(s, 'U', 'V');
    expect(r.kaldirilanlar.map(o => o.id).sort()).toEqual(['A2', 'B2']);
    // Yeni üst üste çift DOĞMAZ
    expect(ustUsteCiftler(r.objects, 0.3)).toEqual([]);
    cozulur(r.objects);
  });

  it('merkezi kaynağına eşitlenen büyütme/döndürme noktası kaldırılır', () => {
    for (const kurulum of [
      { kind: 'dilate', sourceId: 'A', centerId: 'O', factor: 2 },
      { kind: 'rotate', sourceId: 'A', centerId: 'O', degrees: 90 },
      { kind: 'reflect', sourceId: 'A', centerId: 'O' },
    ] as const) {
      const s = [nokta('O', 1, 1), nokta('A', 1.04, 1), nokta('A2', 1, 1, { construction: kurulum })];
      const r = noktalariBirlestir(s, 'O', 'A');
      expect(r.kaldirilanlar.map(o => o.id)).toEqual(['A2']);
      cozulur(r.objects);
    }
  });

  it('açıortay ve üçgen merkezi kaynakları çakışınca kaldırılır', () => {
    const s1 = [nokta('A', 1, 0), nokta('V', 0, 0), nokta('C', 1.04, 0),
      nokta('W', 0, 0, { construction: { kind: 'bisector', pointIds: ['A', 'V', 'C'] } })];
    expect(noktalariBirlestir(s1, 'A', 'C').kaldirilanlar.map(o => o.id)).toEqual(['W']);
    const s2 = [nokta('A', -3, -1), nokta('B', 3, -1), nokta('C', 3.05, -0.97),
      nokta('O', 0, 0, { construction: { kind: 'triangleCenter', pointIds: ['A', 'B', 'C'], center: 'circumcenter' } })];
    const r2 = noktalariBirlestir(s2, 'B', 'C');
    expect(r2.kaldirilanlar.map(o => o.id)).toEqual(['O']);
    cozulur(r2.objects);
  });

  it('teğet noktası çemberin merkezine düşerse kaldırılır', () => {
    const s = [nokta('O', 0, 0), nokta('R', 3, 0), nokta('P', 0.04, 0.02),
      yap({ id: 'c', type: 'circle', centerPointId: 'O', radiusPointId: 'R' }),
      nokta('T', 3, 0, { construction: { kind: 'tangent', circleId: 'c', sourceId: 'P', branch: 1 } })];
    const r = noktalariBirlestir(s, 'O', 'P');
    expect(r.kaldirilanlar.map(o => o.id)).toEqual(['T']);
    expect(r.objects.find(o => o.id === 'c')).toBeDefined();
    cozulur(r.objects);
  });

  it('kaldırılan kuruluma dayanan her şey zincirleme gider ve ipucunda sayılır', () => {
    const s = [nokta('A', 2, 2), nokta('B', 2.05, 2), nokta('X', 6, 6),
      nokta('M', 2, 2, { construction: { kind: 'midpoint', pointIds: ['A', 'B'] } }),
      yap({ id: 'sMX', type: 'segment', startPointId: 'M', endPointId: 'X' })];
    const r = noktalariBirlestir(s, 'A', 'B');
    expect(r.kaldirilanlar.map(o => o.id).sort()).toEqual(['M', 'sMX']);
    expect(birlestirmeIpucu(r)).toContain('Çizilemez duruma gelen 2 nesne kaldırıldı');
    cozulur(r.objects);
  });

  it('sağlam kurulumlar birleşmeden etkilenmez', () => {
    const s = [nokta('X', -1, 0), nokta('Y', 1, 0), nokta('A', 0.02, 0.01),
      nokta('M', 0, 0, { construction: { kind: 'midpoint', pointIds: ['X', 'Y'] } })];
    const r = noktalariBirlestir(s, 'A', 'M');
    expect(r.keepId).toBe('M');
    expect(r.kaldirilanlar).toEqual([]);
    expect(r.objects.find(o => o.id === 'M')).toMatchObject({ x: 0, y: 0, construction: { pointIds: ['X', 'Y'] } });
    cozulur(r.objects);
  });

  it('sayılamayan bir bozulma kalırsa birleştirme YAPILMAZ ve nedeni söylenir (sessiz ret olmaz)', () => {
    // Çevrel çemberin üçüncü noktası, birleşmeden sonra diğer ikisiyle AYNI DOĞRU üzerinde kalıyor:
    // çember çözülemez hâle gelir. Böyle bir durumda adım hiç uygulanmamalı, ipucu da gerçeği söylemeli.
    const s: MathObject[] = [
      nokta('X', 0, 0), nokta('Y', 4, 0),
      nokta('W', 2, 0, { createdAt: T }), nokta('Z', 2.05, 0.02, { createdAt: T + 1 }),
      nokta('L1', -1, -1), nokta('L2', -1, 3),
      yap({ id: 'sWX', type: 'segment', startPointId: 'W', endPointId: 'X' }),
      yap({ id: 'cev', type: 'circle', centerPointId: '', throughPointIds: ['X', 'Y', 'Z'] }),
      yap({ id: 'l', type: 'line', point1Id: 'L1', point2Id: 'L2' }),
      nokta('I', 0, 0, { construction: { kind: 'intersection', objectIds: ['cev', 'l'], index: 0 } }),
    ];
    const r = noktalariBirlestir(s, 'W', 'Z');
    expect(r.changed).toBe(false);
    expect(r.objects).toBe(s);
    expect(r.hata).toMatch(/çember|Çember|doğru/i);
    expect(birlestirmeIpucu(r)).toBe(r.hata);
  });

  it('toplu birleştirmede çözülemeyen çift bütün işi durdurmaz', () => {
    const s: MathObject[] = [
      nokta('A', 1, 1), nokta('B', 1.05, 1),
      nokta('K', 5, 5, { createdAt: T }), nokta('L', 5.05, 5, { createdAt: T + 1 }),
      yap({ id: 'sKL', type: 'segment', startPointId: 'K', endPointId: 'L' }),
    ];
    const r = ustUsteleriBirlestir(s, 0.3);
    expect(r.birlesme).toBe(2);
    expect(r.atlanan).toBe(0);
    expect(r.objects.map(o => o.id).sort()).toEqual(['A', 'K']);
  });
});

describe('sarkık alan bırakmaz', () => {
  it('dependsOn kendine dönmez (kayıtlı çalışma yine açılabilir)', () => {
    const s = [nokta('A', 2, 2), nokta('P', 2.05, 2, { onObjectId: 'l', dependsOn: ['A'] }),
      nokta('X', -4, -4), nokta('Y', 5, 5), yap({ id: 'l', type: 'line', point1Id: 'X', point2Id: 'Y' })];
    const r = noktalariBirlestir(s, 'A', 'P');
    const kalan = r.objects.find(o => o.id === r.keepId) as PointObject;
    expect(kalan.dependsOn ?? []).not.toContain(kalan.id);
    expect(() => validateProjectObjects(JSON.parse(JSON.stringify(r.objects)))).not.toThrow();
  });

  it('açı kaldırılınca kolun armOfAngleId bağı da düşer', () => {
    const s = [nokta('A', 1, 0), nokta('V', 0, 0), nokta('Z', 1.04, 0),
      yap({ id: 'aci', type: 'angle', point1Id: 'A', vertexPointId: 'V', point3Id: 'Z' }),
      yap({ id: 'kol1', type: 'segment', startPointId: 'V', endPointId: 'A', armOfAngleId: 'aci' }),
      yap({ id: 'kol2', type: 'segment', startPointId: 'V', endPointId: 'Z', armOfAngleId: 'aci' })];
    const r = noktalariBirlestir(s, 'A', 'Z');
    expect(r.kaldirilanlar.map(o => o.id)).toEqual(['aci']);
    for (const seg of r.objects.filter(o => o.type === 'segment')) expect(seg).not.toHaveProperty('armOfAngleId');
  });

  it('ardışık OLMAYAN yinelenen köşe kalırsa ipucunda söylenir', () => {
    const s = [nokta('A', 0, 0), nokta('B', 2, 0), nokta('C', 0.04, 0.01), nokta('D', 0, 2),
      yap({ id: 'poly', type: 'polygon', pointIds: ['A', 'B', 'C', 'D'], label: 'ABCD' })];
    const r = noktalariBirlestir(s, 'A', 'C');
    expect(r.objects.find(o => o.id === 'poly')).toMatchObject({ pointIds: ['A', 'B', 'A', 'D'] });
    expect(r.sikisanlar.map(o => o.id)).toEqual(['poly']);
    expect(birlestirmeIpucu(r)).toContain('aynı köşeden iki kez geçiyor');
  });

  it('sağlam birleşmede uyarı yazılmaz', () => {
    const s = [nokta('A', 1, 1), nokta('C', 1.05, 1.02), nokta('B', 4, 3),
      yap({ id: 'sCB', type: 'segment', startPointId: 'C', endPointId: 'B' })];
    const ipucu = birlestirmeIpucu(noktalariBirlestir(s, 'C', 'A'));
    expect(ipucu).not.toContain('aynı köşeden');
    expect(ipucu).not.toContain('kaldırıldı');
  });
});

describe('bağımlılık listesi WorkspaceContext ile aynı kalmalı', () => {
  const ornekler: MathObject[] = [
    nokta('A'),
    nokta('P', 0, 0, { onObjectId: 'seg', construction: { kind: 'midpoint', pointIds: ['A', 'B'] } }),
    nokta('Q', 0, 0, { construction: { kind: 'intersection', objectIds: ['seg', 'cem'], index: 0 } }),
    nokta('R', 0, 0, { construction: { kind: 'rotate', sourceId: 'A', centerId: 'B', degrees: 30, sliderId: 'sl' } }),
    nokta('S', 0, 0, { construction: { kind: 'translate', sourceId: 'A', vectorPointIds: ['A', 'B'] } }),
    nokta('U', 0, 0, { construction: { kind: 'reflect', sourceId: 'A', axisPointIds: ['A', 'B'] } }),
    nokta('V', 0, 0, { construction: { kind: 'foot', sourceId: 'A', linePointIds: ['A', 'B'] } }),
    nokta('W', 0, 0, { construction: { kind: 'tangent', circleId: 'cem', sourceId: 'A', branch: 1 } }),
    nokta('Y', 0, 0, { construction: { kind: 'triangleVertex', anchorId: 'A', sliderIds: ['s1', 's2', 's3'], vertex: 1, rotation: 0, orientation: 1 } }),
    nokta('SX', 0, 0, { construction: { kind: 'sliderPoint', sliderId: 'sl', mode: 'x' } }),
    nokta('SY', 0, 0, { construction: { kind: 'sliderPoint', sliderId: 'sl', mode: 'y' } }),
    nokta('SL', 0, 0, { construction: { kind: 'sliderPoint', sliderId: 'sl', mode: 'length', anchorId: 'A', direction: { x: 1, y: 0 } } }),
    nokta('SA', 0, 0, { construction: { kind: 'sliderPoint', sliderId: 'sl', mode: 'angle', anchorId: 'A', referenceId: 'B', radius: 2, orientation: -1 } }),
    nokta('Z', 0, 0, { construction: { kind: 'direction', throughId: 'A', linePointIds: ['A', 'B'], mode: 'parallel' } }),
    nokta('T', 0, 0, { construction: { kind: 'bisector', pointIds: ['A', 'B', 'C'] } }),
    nokta('N', 0, 0, { construction: { kind: 'dilate', sourceId: 'A', centerId: 'B', factor: 2 } }),
    nokta('L', 0, 0, { construction: { kind: 'ratio', pointIds: ['A', 'B'], t: 0.5 } }),
    nokta('G', 0, 0, { construction: { kind: 'triangleCenter', pointIds: ['A', 'B', 'C'], center: 'centroid' } }),
    yap({ id: 'seg', type: 'segment', startPointId: 'A', endPointId: 'B' }),
    yap({ id: 'lin', type: 'line', point1Id: 'A', point2Id: 'B' }),
    yap({ id: 'ray', type: 'ray', startPointId: 'A', throughPointId: 'B' }),
    yap({ id: 'cem', type: 'circle', centerPointId: 'A', radiusPointId: 'B' }),
    yap({ id: 'cev', type: 'circle', centerPointId: '', throughPointIds: ['A', 'B', 'C'] }),
    yap({ id: 'elp', type: 'ellipse', centerPointId: 'A', radiusX: 1, radiusY: 2 }),
    yap({ id: 'sliderElp', type: 'ellipse', centerPointId: 'A', radiusX: 1, radiusY: 2, sliderBindings: { radiusX: 'sl', radiusY: 'sl', rotation: 'turn' } }),
    yap({ id: 'yay', type: 'arc', centerPointId: 'A', startPointId: 'B', directionPointId: 'C' }),
    yap({ id: 'dlm', type: 'sector', centerPointId: 'A', startPointId: 'B', directionPointId: 'C' }),
    yap({ id: 'aci', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
    yap({ id: 'sliderAci', type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C', valueSliderId: 'sl' }),
    yap({ id: 'cok', type: 'polygon', pointIds: ['A', 'B', 'C'] }),
    yap({ id: 'egm', type: 'measurement', kind: 'slope', pointIds: ['A', 'B'] }),
    yap({ id: 'ykl', type: 'measurement', kind: 'arc', pointIds: ['A', 'B'], circleId: 'cem', throughPointId: 'C' }),
    yap({ id: 'kut', type: 'checkbox', x: 0, y: 0, targetIds: ['A', 'seg'], checked: true }),
    yap({ id: 'dg1', type: 'button', x: 0, y: 0, action: { kind: 'toggle', targetIds: ['A'] } }),
    yap({ id: 'dg2', type: 'button', x: 0, y: 0, action: { kind: 'animate', sliderIds: ['sl'], targetIds: ['A'] } }),
    yap({ id: 'dg3', type: 'button', x: 0, y: 0, action: { kind: 'setSlider', sliderId: 'sl', value: 1 } }),
    yap({ id: 'dg4', type: 'button', x: 0, y: 0, action: { kind: 'setValue', targetId: 'sl', value: 1 } }),
    yap({ id: 'dg5', type: 'button', x: 0, y: 0, action: { kind: 'clearTraces' } }),
    yap({ id: 'giri', type: 'input_box', x: 0, y: 0, targetId: 'sl', field: 'value' }),
    yap({ id: 'fn', type: 'function', expression: 'x' }),
    yap({ id: 'sl', type: 'slider', variableName: 'a', min: 0, max: 1, step: 1, value: 0 }),
  ];

  it.each(ornekler.map(o => [`${o.type}:${o.id}`, o] as const))('%s için aynı bağımlılıkları verir', (_ad, o) => {
    expect(bagimliliklar(o)).toEqual(objectDependencies(o));
  });
});
