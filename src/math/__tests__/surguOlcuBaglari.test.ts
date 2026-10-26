import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject, SliderObject } from '@/types/math';
import { sliderBindingTargets } from '../sliderBindings';
import { ayarDegeriKapsar, onerilenSurguAyari, ozellikDegeri } from '../surguOnerisi';
import { siradakiSurguAdi, yeniSurguyleBagla } from '../surguyeBagla';

/*
 * Kaydırıcıyı ÖLÇÜYE bağlama (surgu-baglama-onerisi.md): doğru parçası, doğru ve ışın uzunluğu, açı ölçüsü. Nokta
 * koordinatı bağlanmaz: listede nokta yoktur.
 */

const temel = { showLabel: true, color: '#2563eb', visible: true, createdAt: 0 };
const nk = (id: string, x: number, y: number, ek: Partial<PointObject> = {}) =>
  ({ id, type: 'point', label: id, x, y, isIndependent: true, ...temel, ...ek }) as PointObject;
const surgu = (id: string, value: number) =>
  ({ id, type: 'slider', label: id, variableName: id, min: -5, max: 5, step: 1, value, ...temel }) as SliderObject;
const bul = <T extends MathObject>(nesneler: MathObject[], id: string) => nesneler.find((n) => n.id === id) as T;

const sahne = (): MathObject[] => [
  nk('A', 2, 1), nk('B', -1, 3), nk('C', 2, 4),
  nk('P', 0, 0, { locked: true }), nk('Q', 4, 0, { locked: true }),
  { id: 'ab', type: 'segment', label: '[AB]', startPointId: 'A', endPointId: 'B', ...temel } as MathObject,
  { id: 'pq', type: 'segment', label: '[PQ]', startPointId: 'P', endPointId: 'Q', ...temel } as MathObject,
  { id: 'aci', type: 'angle', label: 'α', point1Id: 'B', vertexPointId: 'A', point3Id: 'C', ...temel } as MathObject,
  surgu('a', 2),
];

describe('bağlanabilecekler listesi', () => {
  it('doğru parçası uzunluğu ve açı ölçüsü; nokta yok', () => {
    const liste = sliderBindingTargets(sahne(), 'a');
    expect(liste.some((t) => ['A', 'B', 'C', 'P', 'Q'].includes(t.id))).toBe(false);
    expect(liste.find((t) => t.id === 'ab')).toMatchObject({ label: '[AB] doğru parçası', tur: 'dogru', properties: [{ key: 'length', label: 'Uzunluk' }] });
    expect(liste.find((t) => t.id === 'aci')).toMatchObject({ label: 'α açısı', tur: 'aci', properties: [{ key: 'angle', label: 'Açı ölçüsü (°)' }] });
  });

  it('uçları kilitli doğru parçasının uzunluğu düzenlenemez', () => {
    expect(sliderBindingTargets(sahne(), 'a').find((t) => t.id === 'pq')!.properties.every((p) => p.disabled)).toBe(true);
  });
});

describe('bağlanırken önerilen kaydırıcı ayarı', () => {
  it('özelliğin şimdiki değeri: uzunluk, açı; kenar sayısı ve nokta için yok', () => {
    const s = sahne();
    expect(ozellikDegeri(s, 'ab', 'length')!.deger).toBeCloseTo(Math.hypot(3, 2), 12);
    expect(ozellikDegeri(s, 'aci', 'angle')).toMatchObject({ tur: 'aci', enCokAci: 360 });
    expect(ozellikDegeri(s, 'ab', 'sides')).toBeNull();
    expect(ozellikDegeri(s, 'A', 'x')).toBeNull();
  });

  it('tam sayıda adım 1; ondalıkta adım 0,1 (nesne yerinden oynamaz)', () => {
    expect(onerilenSurguAyari({ tur: 'uzunluk', deger: 4 })).toEqual({ min: 1, max: 10, step: 1, value: 4 });
    expect(onerilenSurguAyari({ tur: 'uzunluk', deger: 12.36 })).toEqual({ min: 0.1, max: 13, step: 0.1, value: 12.4 });
    expect(onerilenSurguAyari({ tur: 'aci', deger: 60, enCokAci: 180 })).toEqual({ min: 0, max: 180, step: 1, value: 60 });
  });

  it('yazılan aralık değeri adım ızgarasında kapsıyorsa korunur', () => {
    expect(ayarDegeriKapsar(-5, 5, 1, 2)).toBe(true);
    expect(ayarDegeriKapsar(-5, 5, 1, 2.5)).toBe(false);
    expect(ayarDegeriKapsar(0, 1, 0.1, 0.3)).toBe(true);
    expect(ayarDegeriKapsar(0, 1, 0.1, 3)).toBe(false);
    expect(ayarDegeriKapsar(null, 1, 0.1, 0.3)).toBe(false);
  });
});

describe('menüden yeni kaydırıcıyla bağlama', () => {
  const yer = { x: -6, y: 5, length: 4 };
  const kimlikler = { surgu: 'yeniSurgu', nokta: () => 'yeniNokta', an: 0 };

  it('uzunlukta kullanılmayan ilk adla, ondalık şimdiki değerle bağlı kaydırıcı ekler', () => {
    const { nesneler, surgu: yeni } = yeniSurguyleBagla(sahne(), 'ab', 'length', yer, kimlikler);
    expect(yeni).toMatchObject({ variableName: 'b', min: 0.1, max: 10, step: 0.1, value: 3.6, x: -6, y: 5, length: 4 });
    expect(bul<SliderObject>(nesneler, 'yeniSurgu').bindingTarget).toEqual({ objectId: 'ab', propertyKey: 'length' });
    expect(nesneler.length).toBe(sahne().length + 1);
  });

  it('açıda Yunan harfli açı kaydırıcısı; ad sırası dolunca sıra numarası', () => {
    const { surgu: yeni } = yeniSurguyleBagla(sahne(), 'aci', 'angle', yer, kimlikler);
    expect(yeni).toMatchObject({ variableName: 'α', sliderType: 'angle', min: 0, max: 360 });
    expect(siradakiSurguAdi([...sahne(), surgu('α', 0)], true)).toBe('β');
  });

  it('bağlanamayan özellik hata verir, sahne değişmez', () => {
    const once = sahne();
    expect(() => yeniSurguyleBagla(once, 'pq', 'length', yer, kimlikler)).toThrow();
    expect(() => yeniSurguyleBagla(once, 'A', 'x', yer, kimlikler)).toThrow(/oluşturulamıyor/);
    expect(once.length).toBe(sahne().length);
  });
});
