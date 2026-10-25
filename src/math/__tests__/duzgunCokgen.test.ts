import { describe, expect, it } from 'vitest';
import type { AngleObject, MathObject, PointObject, PolygonObject, SliderObject } from '@/types/math';
import { resolveCommandBindings } from '../commandBindings';
import { DUZGUN_COKGEN_EN_COK_KENAR, duzgunCokgenAdi, duzgunKose, duzgunMu, kenarSayisi } from '../duzgunCokgen';
import {
  bindSliderProperty, detachSliderBindings, sliderBaginiAskiyaAl, sliderBaginiSurdur, sliderBindingTargets, sliderCurrentBinding,
} from '../sliderBindings';
import { sliderDisplay } from '../sliderDisplay';
import { duzMetin } from '../matematikYazimi';
import { parseProjectFile } from '../projectFile';

/* Kenar sayısı kaydırıcıya bağlanan düzgün çokgen (kullanıcı, 26.10.2026: "sürgüye kenar sayısı da bağlanabilir mi"). */

const base = (id: string) => ({ id, label: id, showLabel: true, color: '#123456', visible: true, createdAt: 0 });
const nokta = (id: string, p: { x: number; y: number }): PointObject => ({ ...base(id), type: 'point', x: p.x, y: p.y, isIndependent: true });
const ADLAR = ['A', 'B', 'C', 'D', 'E'];
const besgen = (): MathObject[] => {
  const koseler = ADLAR.map((ad, k) => nokta(ad, duzgunKose({ x: 0, y: 0 }, { x: 2, y: 0 }, 5, k, 1)));
  const poly: PolygonObject = { ...base('poly'), label: 'Düzgün Beşgen', type: 'polygon', pointIds: [...ADLAR], edgeLabels: [0, 1, 2, 3, 4] };
  return [...koseler, poly];
};
const kaydirici = (value = 5, ek: Partial<SliderObject> = {}): SliderObject => ({ ...base('s'), type: 'slider', variableName: 'n', min: 3, max: 12, step: 1, value, x: -3, y: 5, length: 4, ...ek });
let sayac = 0;
const kimlik = () => `yeni-${++sayac}`;
const bagla = (objects: MathObject[]) => bindSliderProperty(objects, 's', 'poly', 'sides', kimlik);
const deger = (objects: MathObject[], v: number) => resolveCommandBindings(objects.map((o) => (o.id === 's' ? { ...o, value: v } as SliderObject : o)));
const cokgen = (objects: MathObject[]) => objects.find((o) => o.id === 'poly') as PolygonObject;
const koseleri = (objects: MathObject[]) => cokgen(objects).pointIds.map((id) => objects.find((o) => o.id === id) as PointObject);

describe('düzgün çokgen geometrisi', () => {
  it('ardışık iki köşeden düzgün n-genin köşeleri; düzgünlük denetimi', () => {
    const kare = [0, 1, 2, 3].map((k) => duzgunKose({ x: 0, y: 0 }, { x: 1, y: 0 }, 4, k, 1));
    expect(kare[2].x).toBeCloseTo(1, 9);
    expect(kare[2].y).toBeCloseTo(1, 9);
    expect(kare[3].x).toBeCloseTo(0, 9);
    expect(kare[3].y).toBeCloseTo(1, 9);
    expect(duzgunMu(kare)).toBe(true);
    expect(duzgunMu([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 1 }])).toBe(false);
    expect(duzgunMu(koseleri(besgen()))).toBe(true);
    expect(kenarSayisi(2)).toBe(3);
    expect(kenarSayisi(7.4)).toBe(7);
    expect(kenarSayisi(99)).toBe(DUZGUN_COKGEN_EN_COK_KENAR);
    expect(duzgunCokgenAdi(4)).toBe('Kare (Düzgün Dörtgen)');
  });
});

describe('kenar sayısını kaydırıcıya bağlama', () => {
  it('düzgün beşgende seçilebilir, dikdörtgende düzenlenemez', () => {
    const dikdortgen: MathObject[] = [nokta('P', { x: 0, y: 0 }), nokta('Q', { x: 3, y: 0 }), nokta('R', { x: 3, y: 1 }), nokta('S', { x: 0, y: 1 }),
      { ...base('rect'), type: 'polygon', pointIds: ['P', 'Q', 'R', 'S'] } as PolygonObject];
    const hedefler = sliderBindingTargets([...besgen(), ...dikdortgen, kaydirici()], 's');
    const ozellik = (id: string) => hedefler.find((h) => h.id === id)!.properties.find((p) => p.key === 'sides')!;
    expect(ozellik('poly')).toEqual({ key: 'sides', label: 'Kenar sayısı' });
    expect(ozellik('rect').disabled).toBe(true);
    expect(() => bindSliderProperty([...dikdortgen, kaydirici()], 's', 'rect', 'sides', kimlik)).toThrow('düzgün çokgene');
  });

  it('bağlanınca ilk iki köşe serbest kalır, ötekiler kurulumlu; kaydırıcının aralığı 3–30 ve adımı tam sayı olmalı', () => {
    const bagli = bagla([...besgen(), kaydirici()]);
    expect(cokgen(bagli)).toMatchObject({ regularSides: { sliderId: 's', orientation: 1 }, preBindingSides: 5 });
    expect(koseleri(bagli).map((p) => p.construction?.kind ?? 'serbest')).toEqual(['serbest', 'serbest', 'regularVertex', 'regularVertex', 'regularVertex']);
    expect(sliderCurrentBinding(bagli, 's')).toEqual({ targetId: 'poly', propertyKey: 'sides' });
    expect(duzMetin(sliderDisplay(bagli, bagli.find((o) => o.id === 's') as SliderObject).bagliOlcuNodes!)).toBe('Kenar sayısı');
    expect(() => bagla([...besgen(), kaydirici(5, { min: -5, max: 5 })])).toThrow('3 ile 30');
    expect(() => bagla([...besgen(), kaydirici(5, { step: 0.5 })])).toThrow('tam sayı');
  });

  it('kaydırıcı değişince köşeler eklenir / silinir; çokgen düzgün kalır, adı ve kenar etiketleri uyarlanır', () => {
    const bagli = bagla([...besgen(), kaydirici()]);
    const yedi = deger(bagli, 7);
    expect(cokgen(yedi).pointIds).toHaveLength(7);
    expect(koseleri(yedi).slice(5).map((p) => p.label)).toEqual(['F', 'G']);
    expect(duzgunMu(koseleri(yedi))).toBe(true);
    expect(cokgen(yedi)).toMatchObject({ label: 'Düzgün Yedigen', edgeLabels: [0, 1, 2, 3, 4, 5, 6] });
    // İlk iki köşe yerinde: kenar uzunluğu değişmez
    expect(koseleri(yedi)[1].x).toBeCloseTo(2, 9);
    expect(koseleri(yedi)[1].y).toBeCloseTo(0, 9);
    const dort = deger(yedi, 4);
    expect(koseleri(dort).map((p) => p.label)).toEqual(['A', 'B', 'C', 'D']);
    expect(dort.some((o) => o.id === 'E')).toBe(false);
    expect(duzgunMu(koseleri(dort))).toBe(true);
    expect(cokgen(dort).label).toBe('Kare (Düzgün Dörtgen)');
  });

  it('silinen köşeye dayanan ölçülmüş açı da gider; taban köşesi taşınınca çokgen düzgün kalır', () => {
    const aci: AngleObject = { ...base('ang'), type: 'angle', point1Id: 'D', vertexPointId: 'E', point3Id: 'A' };
    const bagli = bagla([...besgen(), aci, kaydirici()]);
    expect(deger(bagli, 4).some((o) => o.id === 'ang')).toBe(false);
    const tasindi = resolveCommandBindings(bagli.map((o) => (o.id === 'B' ? { ...o, x: 3, y: 1 } as PointObject : o)));
    expect(duzgunMu(koseleri(tasindi))).toBe(true);
  });

  it('bağ geçici kapatılınca bağlanmadan önceki kenar sayısına döner, açılınca kaydırıcının değerine', () => {
    const yedi = deger(bagla([...besgen(), kaydirici()]), 7);
    const kapali = sliderBaginiAskiyaAl(yedi, 's');
    expect(cokgen(kapali).pointIds).toHaveLength(5);
    expect(cokgen(kapali)).not.toHaveProperty('regularSides');
    expect(koseleri(kapali).every((p) => !p.construction)).toBe(true);
    expect(kapali.find((o) => o.id === 's')).toMatchObject({ value: 7, suspendedBinding: { objectId: 'poly', propertyKey: 'sides' } });
    expect(duzgunMu(koseleri(kapali))).toBe(true);
    const acik = sliderBaginiSurdur(kapali, 's', kimlik);
    expect(cokgen(acik).pointIds).toHaveLength(7);
  });

  it('kaydırıcı silinince çokgen son kenar sayısıyla sıradan çokgen olarak kalır', () => {
    const cozuldu = detachSliderBindings(deger(bagla([...besgen(), kaydirici()]), 6), ['s']);
    expect(cokgen(cozuldu).pointIds).toHaveLength(6);
    expect(cokgen(cozuldu)).not.toHaveProperty('regularSides');
    expect(koseleri(cozuldu).every((p) => !p.construction)).toBe(true);
  });

  it('kaydedilip yeniden açılır', () => {
    const yedi = deger(bagla([...besgen(), kaydirici()]), 7);
    const yuklenen = parseProjectFile(JSON.parse(JSON.stringify({ objects: yedi })));
    expect(cokgen(yuklenen.objects)).toMatchObject({ regularSides: { sliderId: 's', orientation: 1 } });
    expect(cokgen(yuklenen.objects).pointIds).toHaveLength(7);
  });
});
