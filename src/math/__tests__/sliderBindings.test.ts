import { describe, expect, it } from 'vitest';
import type { AngleObject, CircleObject, EllipseObject, MathObject, PointObject, PolygonObject, SliderObject } from '@/types/math';
import { constructionDependencies, resolveCommandBindings } from '../commandBindings';
import { calculateAngleDegrees, getArcGeometry } from '../geometry';
import { bindSliderProperty, rebindSliderProperty, sliderBindingTargets, sliderIsBound, snapSliderValue, validateSliderSettings } from '../sliderBindings';

const base = (id: string) => ({ id, label: id, showLabel: true, color: '#123456', visible: true, createdAt: 0 });
const point = (id: string, x: number, y: number, extra: Partial<PointObject> = {}): PointObject => ({ ...base(id), type: 'point', x, y, isIndependent: true, ...extra });
const slider = (value = 5, extra: Partial<SliderObject> = {}): SliderObject => ({ ...base('s'), type: 'slider', variableName: 'a', min: -10, max: 360, step: 0.25, value, x: -3, y: 5, length: 4, ...extra });
const A = point('A', 1, 2), B = point('B', 4, 6), C = point('C', -1, 5);
const segment: MathObject = { ...base('seg'), type: 'segment', startPointId: 'A', endPointId: 'B' };
const getPoint = (objects: MathObject[], id: string) => objects.find(o => o.id === id) as PointObject;
const bind = (objects: MathObject[], target: string, key: string) => bindSliderProperty(objects, 's', target, key, () => 'new-radius');
const value = (objects: MathObject[], next: number) => resolveCommandBindings(objects.map(o => o.id === 's' ? { ...o, value: next } as SliderObject : o));

describe('kaydırıcı ayarları', () => {
  it('sonlu, sıralı sınırları, pozitif adımı ve mevcut değeri doğrular', () => {
    expect(validateSliderSettings(-2, 8, 0.3, 3)).toBeNull();
    for (const args of [[2, 2, 1, 2], [3, 2, 1, 2], [0, 5, 0, 1], [0, 5, -1, 1], [0, 5, 1, 6], [NaN, 5, 1, 1], [0, Infinity, 1, 1], [0, 5, 1, NaN]]) {
      expect(validateSliderSettings(...args as [number, number, number, number])).toEqual(expect.any(String));
    }
  });

  it('adımı sıfır yerine minimumdan başlatır ve aralığı aşmaz', () => {
    expect(snapSliderValue(1.34, 1.1, 2, 0.2)).toBe(1.3);
    expect(snapSliderValue(1.2, 1.1, 2, 0.2)).toBe(1.3);
    expect(snapSliderValue(-0.14, -0.3, 1, 0.2)).toBe(-0.1);
    expect(snapSliderValue(0.30000000000000004, 0.1, 1, 0.1)).toBe(0.3);
    expect(snapSliderValue(-30, 1.1, 2, 0.2)).toBe(1.1);
    expect(snapSliderValue(30, 1.1, 2, 0.2)).toBe(2);
    expect(() => snapSliderValue(Infinity, 0, 10, 1)).toThrow('sonlu');
    expect(() => snapSliderValue(2, 0, 10, 0)).toThrow('Adım');
  });
});

describe('kaydırıcı bağını yeniden düzenleme', () => {
  const points = [point('A', 0, 0), point('B', 3, 0), point('C', 0, 4)];
  const triangle: PolygonObject = { ...base('tri'), type: 'polygon', pointIds: ['A', 'B', 'C'] };
  const settings = (nextValue: number) => ({ min: 0, max: 360, step: 1, value: nextValue });
  const rebind = (objects: MathObject[], target: string, key: string, nextValue: number) =>
    rebindSliderProperty(objects, 's', target, key, settings(nextValue), () => 'new-radius');
  const property = (objects: MathObject[], id: string, key: string, owner?: string) =>
    sliderBindingTargets(objects, owner).find(t => t.id === id)?.properties.find(p => p.key === key);

  it('düzenlenen kaydırıcının kendi kenarını ve diğer köşe açılarını yeniden seçime açar', () => {
    const bound = bind([...points, slider(5), triangle], 'tri', 'edge:0');
    expect(property(bound, 'tri', 'angle:2')?.disabled).toBe(true);
    const edited = sliderBindingTargets(bound, 's')[0];
    expect(edited.properties).toHaveLength(6);
    expect(edited.properties.every(p => !p.disabled)).toBe(true);
    expect(property(bound, 'tri', 'angle:2', 'unknown')?.disabled).toBe(true);
  });

  it('kenar 5→açı 60 geçişinde yeni değeri eski uzunluğa uygulamaz; kol yarıçapı 5 kalır', () => {
    const bound = bind([...points, slider(5), triangle], 'tri', 'edge:0');
    const stale = bound.map(o => o.id === 'B' ? { ...o, x: -99, y: 99 } as PointObject : o);
    const snapshot = JSON.stringify(stale);
    const changed = rebindSliderProperty(stale, 's', 'tri', 'angle:0', { ...settings(60), x: -6, y: 4 }, () => { throw new Error('Yeni nokta gerekmemeli.'); });
    const moving = getPoint(changed, 'B');
    expect(moving.construction).toMatchObject({ kind: 'sliderPoint', mode: 'angle', radius: 5, maximumDegrees: 180 });
    expect(Math.hypot(moving.x, moving.y)).toBeCloseTo(5);
    expect(calculateAngleDegrees(getPoint(changed, 'C'), getPoint(changed, 'A'), moving)).toBeCloseTo(60);
    expect(changed.find(o => o.id === 's')).toMatchObject({ value: 60, x: -6, y: 4 });
    expect(JSON.stringify(stale)).toBe(snapshot);
  });

  it.each([0, 180])('aynı %s° köşe bağı yeniden açılıp değiştirilebilir; kural ve kol uzunluğu korunur', oldValue => {
    const bound = value(bind([...points, slider(60), triangle], 'tri', 'angle:0'), oldValue);
    const previousRule = getPoint(bound, 'B').construction;
    expect(property(bound, 'tri', 'angle:0', 's')?.disabled).not.toBe(true);
    const changed = rebind(bound, 'tri', 'angle:0', 60);
    expect(getPoint(changed, 'B').construction).toBe(previousRule);
    expect(calculateAngleDegrees(getPoint(changed, 'C'), getPoint(changed, 'A'), getPoint(changed, 'B'))).toBeCloseTo(60);
    expect(Math.hypot(getPoint(changed, 'B').x, getPoint(changed, 'B').y)).toBeCloseTo(3);
  });

  it('aynı ters uçtan bağlı uzunluğun kuralını ayar değişiminde korur', () => {
    const segment: MathObject = { ...base('seg'), type: 'segment', startPointId: 'A', endPointId: 'B' };
    const bound = bind([points[0], { ...points[1], locked: true }, slider(5), segment], 'seg', 'length');
    const rule = getPoint(bound, 'A').construction;
    const changed = rebindSliderProperty(bound, 's', 'seg', 'length', { min: 1, max: 20, step: 0.5, value: 7 }, () => 'unused');
    expect(getPoint(changed, 'A').construction).toBe(rule);
    expect(getPoint(changed, 'A').x).toBeCloseTo(-4);
    expect(getPoint(changed, 'B')).toBe(getPoint(bound, 'B'));
  });

  it('çemberin gizli yarıçap noktası kimliği ve kuralı aynı bağ yeniden kaydedilince korunur', () => {
    const circle: CircleObject = { ...base('circle'), type: 'circle', centerPointId: 'A', fixedRadius: 2 };
    const bound = bind([points[0], slider(5), circle], 'circle', 'radius');
    const rule = getPoint(bound, 'new-radius').construction;
    expect(property(bound, 'circle', 'radius', 's')?.disabled).not.toBe(true);
    const changed = rebindSliderProperty(bound, 's', 'circle', 'radius', settings(7), () => { throw new Error('Yardımcı kimliği değişmemeli.'); });
    expect(changed).toHaveLength(bound.length);
    expect(changed.find(o => o.id === 'circle')).toMatchObject({ radiusPointId: 'new-radius' });
    expect(getPoint(changed, 'new-radius')).toMatchObject({ visible: false, x: 7 });
    expect(getPoint(changed, 'new-radius').construction).toBe(rule);
  });

  it.each([false, true])('yayın mevcut %s döndürme/açı bağı yeniden düzenlenebilir', rotate => {
    const direction = point('D', 0, 2, rotate ? { isIndependent: false, construction: { kind: 'rotate', sourceId: 'B', centerId: 'A', degrees: 90 } } : {});
    const shape: MathObject = { ...base('arc'), type: 'arc', centerPointId: 'A', startPointId: 'B', directionPointId: 'D' };
    const bound = bind([points[0], points[1], direction, slider(90), shape], 'arc', 'centralAngle');
    const rule = getPoint(bound, 'D').construction;
    expect(property(bound, 'arc', 'centralAngle')?.disabled).toBe(true);
    expect(property(bound, 'arc', 'centralAngle', 's')?.disabled).not.toBe(true);
    const changed = rebind(bound, 'arc', 'centralAngle', 270);
    expect(getPoint(changed, 'D').construction).toBe(rule);
    expect(getArcGeometry(getPoint(changed, 'A'), getPoint(changed, 'B'), getPoint(changed, 'D'))!.sweep * 180 / Math.PI).toBeCloseTo(270);
  });

  it('elipsin kendi özelliği yeniden seçilebilir; diğer kaydırıcının özelliği korunur', () => {
    const other = { ...slider(2), id: 's2', variableName: 'b' };
    const ellipse: EllipseObject = { ...base('ellipse'), type: 'ellipse', centerPointId: 'A', radiusX: 3, radiusY: 2, sliderBindings: { radiusY: 's2' } };
    const bound = bind([points[0], slider(5), other, ellipse], 'ellipse', 'radiusX');
    expect(property(bound, 'ellipse', 'radiusX', 's')?.disabled).not.toBe(true);
    expect(property(bound, 'ellipse', 'radiusY', 's')?.disabled).toBe(true);
    const oldMap = (bound.find(o => o.id === 'ellipse') as EllipseObject).sliderBindings;
    const saved = rebind(bound, 'ellipse', 'radiusX', 6);
    expect((saved.find(o => o.id === 'ellipse') as EllipseObject).sliderBindings).toBe(oldMap);
    const switched = rebind(saved, 'ellipse', 'rotation', 60);
    expect(switched.find(o => o.id === 'ellipse')).toMatchObject({ radiusX: 6, radiusY: 2, rotation: 60, sliderBindings: { radiusY: 's2', rotation: 's' } });
  });

  it('yeniden bağlarken fonksiyonları, etkileşim bileşenlerini ve diğer kaydırıcı bağlarını bırakır', () => {
    const other = { ...slider(4), id: 's2', variableName: 'b' };
    const C = { ...points[2], isIndependent: false, construction: { kind: 'sliderPoint', mode: 'y', sliderId: 's2' } } as PointObject;
    const fn: MathObject = { ...base('f'), type: 'function', expression: 'a*x + b', label: 'f(x) = a*x + b' };
    const widget: MathObject = { ...base('button'), type: 'button', x: 0, y: 0, action: { kind: 'setSlider', sliderId: 's', value: 30 } };
    const bound = bind([points[0], points[1], C, slider(5), other, triangle, fn, widget], 'tri', 'edge:0');
    const changed = rebind(bound, 'tri', 'angle:0', 60);
    expect(changed.find(o => o.id === 'f')).toBe(fn);
    expect(changed.find(o => o.id === 'button')).toBe(widget);
    expect(changed.find(o => o.id === 's2')).toBe(other);
    expect(getPoint(changed, 'C').construction).toBe(C.construction);
    const updated = resolveCommandBindings(changed.map(o => o.id === 's2' ? { ...other, value: 6 } : o));
    expect(getPoint(updated, 'C').y).toBe(6);
    expect(getPoint(updated, 'B').construction).toMatchObject({ radius: 5 });
  });

  it('başka kaydırıcının bağını, kilitli şekli ve nesne üzerindeki noktayı seçime açmaz', () => {
    const other = { ...slider(5), id: 's2', variableName: 'b' };
    const foreign = point('R', 5, 0, { isIndependent: false, construction: { kind: 'sliderPoint', mode: 'length', sliderId: 's2', anchorId: 'A', direction: { x: 1, y: 0 } } });
    const hosted = point('H', 2, 0, { onObjectId: 'circle' });
    const objects: MathObject[] = [points[0], slider(3), other, foreign, hosted,
      { ...base('circle'), type: 'circle', centerPointId: 'A', radiusPointId: 'R' },
      { ...base('hosted'), type: 'circle', centerPointId: 'A', radiusPointId: 'H' },
      { ...triangle, locked: true },
    ];
    expect(property(objects, 'circle', 'radius', 's')?.disabled).toBe(true);
    expect(property(objects, 'hosted', 'radius', 's')?.disabled).toBe(true);
    expect(sliderBindingTargets(objects, 's').find(o => o.id === 'tri')?.properties.every(p => p.disabled)).toBe(true);
    const snapshot = JSON.stringify(objects);
    expect(() => rebind(objects, 'circle', 'radius', 4)).toThrow('bağlanamıyor');
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it('ortak üçgen kurulumunu yeni bağa taşımayı atomik reddeder; ayar kaydı ve diğer kaydırıcılar çalışır', () => {
    const sliders = [slider(3), { ...slider(4), id: 's2', variableName: 'b' }, { ...slider(5), id: 's3', variableName: 'c' }];
    const rule = { kind: 'triangleVertex' as const, anchorId: 'A', sliderIds: ['s', 's2', 's3'] as [string, string, string], rotation: 0, orientation: 1 as const };
    const B = { ...points[1], isIndependent: false, construction: { ...rule, vertex: 1 as const } };
    const C = { ...points[2], isIndependent: false, construction: { ...rule, vertex: 2 as const } };
    const circle: CircleObject = { ...base('circle'), type: 'circle', centerPointId: 'A', fixedRadius: 2 };
    const objects: MathObject[] = [points[0], B, C, ...sliders, triangle, circle];
    const snapshot = JSON.stringify(objects);
    expect(sliderBindingTargets(objects, 's').every(t => t.properties.every(p => p.disabled))).toBe(true);
    expect(() => rebind(objects, 'circle', 'radius', 4)).toThrow('ortak bağlı');
    expect(JSON.stringify(objects)).toBe(snapshot);
    const saved = rebind(objects, '', '', 4);
    expect(getPoint(saved, 'B').construction).toBe(B.construction);
    expect(getPoint(saved, 'C').construction).toBe(C.construction);
    expect(getPoint(saved, 'B').x).toBe(4);
    const updated = resolveCommandBindings(saved.map(o => o.id === 's2' ? { ...sliders[1], value: 6 } : o));
    expect(getPoint(updated, 'C').construction).toBe(C.construction);
    expect(getPoint(updated, 'C').x).not.toBeCloseTo(getPoint(saved, 'C').x);
  });

  it('başarısız yeni bağ eski kuralı, konumu ve kaydırıcı ayarlarını değiştirmez', () => {
    const bound = bind([...points, slider(60), triangle], 'tri', 'angle:0');
    const snapshot = JSON.stringify(bound);
    expect(() => rebind(bound, 'tri', 'angle:0', 270)).toThrow('180');
    expect(() => rebind(bound, 'tri', 'edge:0', 0)).toThrow('sıfırdan büyük');
    expect(() => rebindSliderProperty(bound, 's', 'tri', 'angle:0', { ...settings(60), x: NaN }, () => 'unused')).toThrow('konumu');
    expect(JSON.stringify(bound)).toBe(snapshot);
  });

  it('hedef listesi geçersiz eski inşada çözümleme yapıp render hatası üretmez', () => {
    const bound = bind([...points, slider(5), triangle], 'tri', 'edge:0');
    const invalid = bound.map(o => o.id === 's' ? { ...o, value: 0 } as SliderObject : o);
    expect(() => sliderBindingTargets(invalid, 's')).not.toThrow();
    expect(() => rebind(invalid, 'tri', 'angle:0', 60)).toThrow('sıfırdan büyük');
  });
});

describe('canlı kaydırıcı bağları', () => {
  it.each(['x', 'y'] as const)('%s koordinatını bağlar, serbest eksen sürüklemesini korur ve ayarları sıfırlamaz', mode => {
    const s = slider(7);
    const objects = [A, s];
    const snapshot = JSON.stringify(objects);
    const bound = bind(objects, 'A', mode);
    const other = mode === 'x' ? 'y' : 'x';
    expect(getPoint(bound, 'A')[mode]).toBe(7);
    expect(bound.find(o => o.id === 's')).toBe(s);
    expect(sliderIsBound(bound, 's')).toBe(true);
    const dragged = bound.map(o => o.id === 'A' ? { ...o, [other]: 12 } as PointObject : o);
    const changed = getPoint(value(dragged, 9), 'A');
    expect(changed[mode]).toBe(9);
    expect(changed[other]).toBe(12);
    expect(changed.isIndependent).toBe(false);
    expect(constructionDependencies(changed)).toEqual(['s']);
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it.each(['segment', 'line', 'ray'] as const)('%s tanım uzunluğunu ve sürüklenen başlangıç noktasını canlı izler', type => {
    const shape: MathObject = type === 'segment' ? segment : type === 'line'
      ? { ...base('seg'), type, point1Id: 'A', point2Id: 'B' }
      : { ...base('seg'), type, startPointId: 'A', throughPointId: 'B' };
    const midpoint = point('M', 0, 0, { isIndependent: false, construction: { kind: 'midpoint', pointIds: ['A', 'B'] } });
    const bound = bind([A, B, slider(10), shape, midpoint], 'seg', 'length');
    expect(getPoint(bound, 'B')).toMatchObject({ x: 7, y: 10 });
    const moved = value(bound.map(o => o.id === 'A' ? { ...A, x: -2, y: 3 } : o), 5);
    expect(getPoint(moved, 'B')).toMatchObject({ x: 1, y: 7 });
    expect(getPoint(moved, 'M')).toMatchObject({ x: -0.5, y: 5 });
    expect(constructionDependencies(getPoint(moved, 'B'))).toEqual(['s', 'A']);
  });

  it('ikinci uç kilitliyse serbest ilk ucu uzunluk için kullanır', () => {
    const result = bind([A, { ...B, locked: true }, slider(10), segment], 'seg', 'length');
    expect(getPoint(result, 'A')).toMatchObject({ x: -2, y: -2 });
    expect(getPoint(result, 'B')).toMatchObject({ x: 4, y: 6, locked: true });
  });

  it('seçilen çokgen kenarını bağlar', () => {
    const poly: MathObject = { ...base('poly'), type: 'polygon', pointIds: ['A', 'B', 'C'] };
    const result = bind([A, B, C, slider(8), poly], 'poly', 'edge:1');
    const end = getPoint(result, 'C');
    expect(Math.hypot(end.x - B.x, end.y - B.y)).toBeCloseTo(8);
    expect(end.construction).toMatchObject({ mode: 'length', anchorId: 'B' });
    expect(getPoint(result, 'A')).toBe(A);
  });

  it.each([false, true])('açıda kol yarıçapı ile yönünü korur ve referans sürüklemesini izler (reflex=%s)', reflex => {
    const V = point('V', 0, 0), R = point('R', 4, 0), P = point('P', 0, -2);
    const angle: AngleObject = { ...base('angle'), type: 'angle', point1Id: 'R', vertexPointId: 'V', point3Id: 'P', reflex };
    const bound = bind([V, R, P, slider(reflex ? 270 : 90), angle], 'angle', 'angle');
    expect(getPoint(bound, 'P').y).toBeCloseTo(-2);
    const rule = getPoint(bound, 'P').construction;
    expect(rule).toMatchObject({ mode: 'angle', radius: 2, orientation: reflex ? 1 : -1 });
    const moved = value(bound.map(o => o.id === 'V' ? { ...V, x: 1, y: 2 } : o.id === 'R' ? { ...R, x: 1, y: 8 } : o), 60);
    const p = getPoint(moved, 'P'), v = getPoint(moved, 'V'), r = getPoint(moved, 'R');
    expect(Math.hypot(p.x - v.x, p.y - v.y)).toBeCloseTo(2);
    expect(calculateAngleDegrees(r, v, p)).toBeCloseTo(60);
    expect((moved.find(o => o.id === 'angle') as AngleObject).reflex).toBe(false);
    expect(constructionDependencies(p)).toEqual(['s', 'V', 'R']);
    const external = value(moved, 300);
    expect((external.find(o => o.id === 'angle') as AngleObject).reflex).toBe(true);
    expect(calculateAngleDegrees(getPoint(external, 'R'), getPoint(external, 'V'), getPoint(external, 'P'))).toBeCloseTo(60);
  });

  it.each([0, 360])('%s derecelik açı uç değerini destekler', degrees => {
    const angle: AngleObject = { ...base('angle'), type: 'angle', point1Id: 'B', vertexPointId: 'A', point3Id: 'C' };
    const result = bind([A, B, C, slider(degrees), angle], 'angle', 'angle');
    expect((result.find(o => o.id === 'angle') as AngleObject).reflex ?? false).toBe(degrees > 180);
    expect(calculateAngleDegrees(getPoint(result, 'B'), A, getPoint(result, 'C'))).toBeCloseTo(0);
  });

  it('aynı kollardaki başka açı ölçümlerinin iç/dış seçimini değiştirmez', () => {
    const selected: AngleObject = { ...base('angle'), type: 'angle', point1Id: 'B', vertexPointId: 'A', point3Id: 'C', reflex: true };
    const interior: AngleObject = { ...selected, ...base('interior'), reflex: false };
    const exterior: AngleObject = { ...selected, ...base('exterior'), reflex: true };
    const bound = bind([A, B, C, slider(270), interior, selected, exterior], 'angle', 'angle');
    expect(bound.find(o => o.id === 'angle')).toMatchObject({ valueSliderId: 's', reflex: true });
    const changed = value(bound, 45);
    expect(changed.find(o => o.id === 'angle')).toMatchObject({ valueSliderId: 's', reflex: false });
    expect(changed.find(o => o.id === 'interior')).toBe(interior);
    expect(changed.find(o => o.id === 'exterior')).toBe(exterior);
    expect(value(changed, 300).find(o => o.id === 'interior')).toBe(interior);
  });

  it.each(['circle', 'arc', 'sector'] as const)('%s yarıçapını mevcut nokta üzerinden bağlar', type => {
    const shape: MathObject = type === 'circle'
      ? { ...base('round'), type, centerPointId: 'A', radiusPointId: 'B' }
      : { ...base('round'), type, centerPointId: 'A', startPointId: 'B', directionPointId: 'C' };
    const result = value(bind([A, B, C, slider(10), shape], 'round', 'radius'), 2);
    expect(Math.hypot(getPoint(result, 'B').x - A.x, getPoint(result, 'B').y - A.y)).toBeCloseTo(2);
    expect(result).toHaveLength(5);
  });

  it('sabit yarıçapı gizli canlı noktayla değiştirir ve mevcut noktayı korur', () => {
    const circle: CircleObject = { ...base('circle'), type: 'circle', centerPointId: 'A', radiusPointId: 'B', fixedRadius: 3, releasedRadiusPointId: 'C' };
    const objects = [A, B, C, slider(6), circle];
    const snapshot = JSON.stringify(objects);
    const result = bind(objects, 'circle', 'radius');
    const updated = result.find(o => o.id === 'circle') as CircleObject;
    expect(updated.fixedRadius).toBeUndefined();
    expect(updated.releasedRadiusPointId).toBeUndefined();
    expect(updated.radiusPointId).toBe('new-radius');
    expect(getPoint(result, 'new-radius')).toMatchObject({ visible: false, showLabel: false, isIndependent: false, x: 7, y: 2 });
    expect(getPoint(result, 'B')).toBe(B);
    const moved = value(result.map(o => o.id === 'A' ? { ...A, x: 5, y: -3 } : o), 9);
    expect(getPoint(moved, 'new-radius')).toMatchObject({ x: 14, y: -3 });
    expect(JSON.stringify(objects)).toBe(snapshot);
    expect(() => bindSliderProperty(objects, 's', 'circle', 'radius', () => 'A')).toThrow('benzersiz');
  });
});

describe('bağlanabilir hedefler ve koruma', () => {
  it('üst listede yalnız görünür şekilleri, düzenlenemeyen özellikleri de devre dışı gösterir', () => {
    const objects: MathObject[] = [A, B, C, slider(), segment,
      point('locked', 3, 4, { locked: true }), point('hosted', 3, 4, { onObjectId: 'seg' }),
      point('derived', 3, 4, { isIndependent: false }), point('hidden', 3, 4, { visible: false }),
      { ...base('circum'), type: 'circle', centerPointId: '', throughPointIds: ['A', 'B', 'C'] },
      { ...base('ellipse'), type: 'ellipse', centerPointId: 'A', radiusX: 3, radiusY: 2 },
      { ...base('poly'), type: 'polygon', pointIds: ['A', 'B', 'C'] },
      { ...base('circle'), type: 'circle', centerPointId: 'A', fixedRadius: 2 },
      { ...base('arc'), type: 'arc', centerPointId: 'A', startPointId: 'B', directionPointId: 'C' },
      { ...base('sector'), type: 'sector', centerPointId: 'A', startPointId: 'B', directionPointId: 'C' },
      { ...base('line'), type: 'line', point1Id: 'A', point2Id: 'B' },
      { ...base('ray'), type: 'ray', startPointId: 'A', throughPointId: 'B' },
      { ...base('angle'), type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' },
      { ...base('hiddenPoly'), type: 'polygon', pointIds: ['A', 'B', 'C'], visible: false },
      { ...base('lockedPoly'), type: 'polygon', pointIds: ['A', 'B', 'C'], locked: true },
    ];
    const targets = sliderBindingTargets(objects);
    expect(targets.map(t => t.id)).toEqual(['circum', 'ellipse', 'poly', 'circle', 'arc', 'sector', 'lockedPoly']);
    expect(targets.find(t => t.id === 'poly')?.properties.map(p => p.key)).toEqual(['edge:0', 'edge:1', 'edge:2', 'angle:0', 'angle:1', 'angle:2']);
    expect(targets.find(t => t.id === 'poly')?.properties[0].label).toBe('AB kenar uzunluğu');
    expect(targets.find(t => t.id === 'poly')?.properties[3].label).toBe('A köşe açısı (∠CAB)');
    expect(targets.find(t => t.id === 'circum')?.properties).toEqual([{ key: 'radius', label: 'Yarıçap', disabled: true }]);
    expect(targets.find(t => t.id === 'lockedPoly')?.properties.every(p => p.disabled)).toBe(true);
    expect(targets.find(t => t.id === 'ellipse')?.properties.map(p => p.key)).toEqual(['radiusX', 'radiusY', 'rotation']);
    expect(targets.find(t => t.id === 'arc')?.properties.map(p => p.key)).toEqual(['radius', 'centralAngle']);
  });

  it.each([
    { locked: true }, { onObjectId: 'seg' }, { isIndependent: false }, { dependsOn: ['B'] },
    { construction: { kind: 'midpoint', pointIds: ['B', 'C'] } },
  ] as Partial<PointObject>[])('korunan noktanın başka ilişkisini değiştirmez: %j', extra => {
    const objects = [{ ...A, ...extra }, B, C, slider(), segment];
    const snapshot = JSON.stringify(objects);
    expect(() => bind(objects, 'A', 'x')).toThrow('bağlanamıyor');
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it('dolaylı nokta ve nesne bağımlılığı döngüsünü bağlamadan reddeder', () => {
    const derived = { ...A, isIndependent: false, construction: { kind: 'midpoint', pointIds: ['B', 'C'] } } as PointObject;
    const hosted = { ...A, onObjectId: 'seg' };
    for (const anchor of [derived, hosted]) {
      const objects = [anchor, B, C, slider(), segment];
      const snapshot = JSON.stringify(objects);
      expect(sliderBindingTargets(objects).some(t => t.id === 'seg')).toBe(false);
      expect(() => bind(objects, 'seg', 'length')).toThrow('döngüsel');
      expect(JSON.stringify(objects)).toBe(snapshot);
    }
  });

  it('doğrudan çözümlemede de sliderPoint döngülerini reddeder', () => {
    const circular: PointObject = { ...A, construction: { kind: 'sliderPoint', sliderId: 's', mode: 'length', anchorId: 'B', direction: { x: 1, y: 0 } } };
    const dependent: PointObject = { ...B, construction: { kind: 'midpoint', pointIds: ['A', 'C'] } };
    expect(() => resolveCommandBindings([circular, dependent, C, slider()])).toThrow('Döngüsel');
  });

  it('geçersiz ölçü değerlerini ilk bağlamada ve canlı güncellemede atomik reddeder', () => {
    const original = [A, B, slider(0), segment];
    const snapshot = JSON.stringify(original);
    expect(() => bind(original, 'seg', 'length')).toThrow('sıfırdan büyük');
    expect(JSON.stringify(original)).toBe(snapshot);
    const bound = bind([A, B, slider(5), segment], 'seg', 'length');
    const before = JSON.stringify(bound);
    expect(() => value(bound, -1)).toThrow('sıfırdan büyük');
    expect(JSON.stringify(bound)).toBe(before);
    const angle: AngleObject = { ...base('angle'), type: 'angle', point1Id: 'B', vertexPointId: 'A', point3Id: 'C' };
    expect(() => bind([A, B, C, slider(-1), angle], 'angle', 'angle')).toThrow('0 ile 360');
    const boundAngle = bind([A, B, C, slider(90), angle], 'angle', 'angle');
    expect(() => value(boundAngle, 361)).toThrow('0 ile 360');
    expect(() => resolveCommandBindings(bound.filter(o => o.id !== 's'))).toThrow('kaydırıcı');
  });

  it('dönme, üçgen ve fonksiyon değişkeni kullanımını tanır', () => {
    const rotated = point('rot', 1, 1, { construction: { kind: 'rotate', sourceId: 'A', degrees: 30, sliderId: 's' } });
    const vertex = point('tri', 1, 1, { construction: { kind: 'triangleVertex', anchorId: 'A', sliderIds: ['s', 's2', 's3'], vertex: 1, rotation: 0, orientation: 1 } });
    const fn: MathObject = { ...base('f'), type: 'function', expression: 'a*x^2 + sin(x)' };
    expect(sliderIsBound([A, slider(), rotated], 's')).toBe(true);
    expect(sliderIsBound([A, slider(), vertex], 's')).toBe(true);
    expect(sliderIsBound([slider(), fn], 's')).toBe(true);
    expect(sliderIsBound([slider(), { ...fn, expression: 'aa*x + sin(x)' }], 's')).toBe(false);
    expect(sliderIsBound([slider()], 's')).toBe(false);
    expect(sliderIsBound([fn], 'missing')).toBe(false);
  });
});

describe('şekil özellikleri', () => {
  const squarePoints = [point('A', 0, 0), point('B', 3, 0), point('C', 3, 2), point('D', 0, 2)];
  const polygon = (points: PointObject[], extra: Partial<PolygonObject> = {}): PolygonObject => ({ ...base('poly'), type: 'polygon', pointIds: points.map(p => p.id), ...extra });
  const cornerDegrees = (objects: MathObject[], shape: PolygonObject, vertexId: string) => {
    const points = shape.pointIds.map(id => getPoint(objects, id));
    const i = points.findIndex(p => p.id === vertexId), count = points.length;
    const previous = points[(i + count - 1) % count], vertex = points[i], next = points[(i + 1) % count];
    const area = points.reduce((sum, p, j) => sum + p.x * points[(j + 1) % count].y - p.y * points[(j + 1) % count].x, 0);
    const cross = (previous.x - vertex.x) * (next.y - vertex.y) - (previous.y - vertex.y) * (next.x - vertex.x);
    const small = calculateAngleDegrees(previous, vertex, next);
    return area * cross > 0 ? 360 - small : small;
  };

  it.each([3, 5, 8])('%s köşeli çokgenin bütün kenarlarını ve köşe açılarını listeler', count => {
    const points = Array.from({ length: count }, (_, i) => point(String.fromCharCode(65 + i), 3 * Math.cos(i * Math.PI * 2 / count), 3 * Math.sin(i * Math.PI * 2 / count)));
    const [target] = sliderBindingTargets([...points, polygon(points)]);
    expect(target.properties.map(p => p.key)).toEqual([
      ...points.map((_, i) => `edge:${i}`), ...points.map((_, i) => `angle:${i}`),
    ]);
    expect(target.properties.every(p => !p.disabled)).toBe(true);
  });

  it('köşe açısını yeni ölçüm nesnesi yaratmadan bağlar, kol uzunluğunu ve diğer noktaları korur', () => {
    const poly = polygon(squarePoints);
    const objects = [...squarePoints, slider(60), poly];
    const snapshot = JSON.stringify(objects);
    const bound = bindSliderProperty(objects, 's', 'poly', 'angle:0', () => { throw new Error('Yeni nesne gerekmemeli.'); });
    expect(bound).toHaveLength(objects.length);
    expect(bound.some(o => o.type === 'angle')).toBe(false);
    expect(cornerDegrees(bound, poly, 'A')).toBeCloseTo(60);
    expect(getPoint(bound, 'B').construction).toMatchObject({ mode: 'angle', anchorId: 'A', referenceId: 'D', radius: 3, orientation: -1 });
    for (const id of ['A', 'C', 'D']) expect(getPoint(bound, id)).toBe(getPoint(objects, id));
    const moved = value(bound.map(o => o.id === 'A' ? { ...squarePoints[0], x: -1, y: -2 } : o.id === 'D' ? { ...squarePoints[3], x: -1, y: 5 } : o), 45);
    const v = getPoint(moved, 'A'), end = getPoint(moved, 'B');
    expect(Math.hypot(end.x - v.x, end.y - v.y)).toBeCloseTo(3);
    expect(calculateAngleDegrees(getPoint(moved, 'D'), v, end)).toBeCloseTo(45);
    expect(getPoint(moved, 'C')).toBe(squarePoints[2]);
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it('üçgen köşe açısını dış açıya dönüştürmez; 180° üstünü ilk bağda ve canlı güncellemede reddeder', () => {
    const points = squarePoints.slice(0, 3);
    const poly = polygon(points);
    expect(() => bind([...points, slider(270), poly], 'poly', 'angle:0')).toThrow('180');
    const objects = [...points, slider(60), poly];
    const bound = bind(objects, 'poly', 'angle:0');
    expect(getPoint(bound, 'B').construction).toMatchObject({ mode: 'angle', maximumDegrees: 180 });
    const snapshot = JSON.stringify(bound);
    expect(() => value(bound, 270)).toThrow('180');
    expect(JSON.stringify(bound)).toBe(snapshot);
    expect(cornerDegrees(value(bound, 90), poly, 'A')).toBeCloseTo(90);
  });

  it.each([false, true])('içbükey 270° köşesini çizim yönünden bağımsız doğru bağlar (ters=%s)', reverse => {
    const original = [point('A', 0, 0), point('B', 3, 0), point('C', 3, 1), point('D', 1, 1), point('E', 1, 3), point('F', 0, 3)];
    const points = reverse ? [...original].reverse() : original;
    const poly = polygon(points), index = poly.pointIds.indexOf('D');
    const objects = [...points, slider(270), poly];
    const bound = bind(objects, 'poly', `angle:${index}`);
    for (const p of points) {
      expect(getPoint(bound, p.id).x).toBeCloseTo(p.x);
      expect(getPoint(bound, p.id).y).toBeCloseTo(p.y);
    }
    expect(cornerDegrees(bound, poly, 'D')).toBeCloseTo(270);
    const movingId = poly.pointIds[(index + 1) % points.length];
    expect(getPoint(bound, movingId).construction).toMatchObject({ orientation: reverse ? 1 : -1 });
    const changed = value(bound, 240);
    expect(cornerDegrees(changed, poly, 'D')).toBeCloseTo(240);
    expect(Math.hypot(getPoint(changed, movingId).x - 1, getPoint(changed, movingId).y - 1)).toBeCloseTo(2);
    for (const p of points.filter(p => p.id !== movingId)) expect(getPoint(changed, p.id)).toBe(p);
  });

  it('sonraki köşe başka bağa sahipse önceki serbest köşeyi ters yönde hareket ettirir', () => {
    const s2 = { ...slider(3), id: 's2', variableName: 'b' };
    const points = squarePoints.map(p => p.id === 'B' ? { ...p, isIndependent: false, construction: { kind: 'sliderPoint', sliderId: 's2', mode: 'x' } } as PointObject : p);
    const poly = polygon(points);
    const objects = [...points, slider(60), s2, poly];
    const bound = bind(objects, 'poly', 'angle:0');
    expect(getPoint(bound, 'D').construction).toMatchObject({ mode: 'angle', referenceId: 'B', radius: 2, orientation: 1 });
    expect(getPoint(bound, 'B')).toBe(points[1]);
    expect(cornerDegrees(bound, poly, 'A')).toBeCloseTo(60);
    expect(cornerDegrees(value(bound, 45), poly, 'A')).toBeCloseTo(45);
  });

  it('iki olası hareketli köşe de döngü oluşturuyorsa adı listede tutar ve bağı atomik reddeder', () => {
    const points = squarePoints.map(p => p.id === 'A' ? { ...p, isIndependent: false, construction: { kind: 'midpoint', pointIds: ['B', 'D'] } } as PointObject : p);
    const objects = [...points, slider(60), polygon(points)];
    const snapshot = JSON.stringify(objects);
    expect(sliderBindingTargets(objects)[0].properties.find(p => p.key === 'angle:0')?.disabled).toBe(true);
    expect(() => bind(objects, 'poly', 'angle:0')).toThrow('döngüsel');
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it('iki kol kilitliyken bütün köşe adlarını gösterir ve kilidi aşmaz', () => {
    const points = squarePoints.map(p => p.id === 'B' || p.id === 'D' ? { ...p, locked: true } : p);
    const objects = [...points, slider(60), polygon(points)];
    const properties = sliderBindingTargets(objects)[0].properties;
    expect(properties.filter(p => p.key.startsWith('angle:'))).toHaveLength(4);
    expect(properties.find(p => p.key === 'angle:0')?.disabled).toBe(true);
    expect(() => bind(objects, 'poly', 'angle:0')).toThrow('kilitli');
  });

  it.each([false, true])('mevcut iç açı ölçüsünü kol sırası/fallback değişse de yönetir, dış ölçüyü korur (fallback=%s)', fallback => {
    const points = squarePoints.map(p => fallback && p.id === 'B' ? { ...p, locked: true } : p);
    const poly = polygon(points);
    const angle: AngleObject = { ...base('corner'), type: 'angle', point1Id: 'B', vertexPointId: 'A', point3Id: 'D', reflex: false };
    const outside: AngleObject = { ...angle, ...base('outside'), reflex: true };
    const bound = bind([...points, slider(90), poly, angle, outside], 'poly', 'angle:0');
    expect(bound.filter(o => o.type === 'angle')).toHaveLength(2);
    expect(bound.find(o => o.id === 'corner')).toMatchObject({ valueSliderId: 's', reflex: false });
    expect(value(bound, 270).find(o => o.id === 'corner')).toMatchObject({ valueSliderId: 's', reflex: true });
    expect(value(bound, 270).find(o => o.id === 'outside')).toBe(outside);
  });

  it.each(['arc', 'sector'] as const)('%s merkez açısını CCW 270° olarak bağlar, yay yarıçapını ve yön noktasının uzaklığını korur', type => {
    const M = point('M', 0, 0), S = point('S', 2, 0), D = point('D', 0, 5);
    const shape: MathObject = { ...base('round'), type, centerPointId: 'M', startPointId: 'S', directionPointId: 'D' };
    const bound = bind([M, S, D, slider(270), shape], 'round', 'centralAngle');
    const direction = getPoint(bound, 'D');
    expect(direction.x).toBeCloseTo(0);
    expect(direction.y).toBeCloseTo(-5);
    const geometry = getArcGeometry(M, S, direction)!;
    expect(geometry.radius).toBe(2);
    expect(geometry.sweep * 180 / Math.PI).toBeCloseTo(270);
    expect(getPoint(bound, 'S')).toBe(S);
    const at360 = getArcGeometry(M, S, getPoint(value(bound, 360), 'D'))!;
    expect(at360.sweep).toBeCloseTo(0);
  });

  it.each(['radiusX', 'radiusY', 'rotation'] as const)('elips %s özelliğini diğer parametreleri değiştirmeden canlı bağlar', property => {
    const ellipse: EllipseObject = { ...base('ellipse'), type: 'ellipse', centerPointId: 'A', radiusX: 3, radiusY: 2, rotation: 15 };
    const objects = [A, slider(6), ellipse];
    const snapshot = JSON.stringify(objects);
    const bound = bind(objects, 'ellipse', property);
    expect(bound).toHaveLength(objects.length);
    const changed = value(bound, 9).find(o => o.id === 'ellipse') as EllipseObject;
    expect(changed[property]).toBe(9);
    expect(changed.sliderBindings).toEqual({ [property]: 's' });
    expect(sliderIsBound(bound, 's')).toBe(true);
    for (const other of ['radiusX', 'radiusY', 'rotation'] as const) if (other !== property) expect(changed[other]).toBe(ellipse[other]);
    expect(sliderBindingTargets(bound)[0].properties.find(p => p.key === property)?.disabled).toBe(true);
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it.each(['arc', 'sector'] as const)('sabit açıyla çizilen %s döndürme ilişkisini koruyarak bağlanır ve yarıçap değişimini izler', type => {
    const M = point('M', 0, 0), S = point('S', 2, 0);
    const D = point('D', 0, 2, { isIndependent: false, construction: { kind: 'rotate', sourceId: 'S', centerId: 'M', degrees: 90 } });
    const shape: MathObject = { ...base('round'), type, centerPointId: 'M', startPointId: 'S', directionPointId: 'D' };
    const objects = [M, S, D, slider(60), shape];
    const snapshot = JSON.stringify(objects);
    expect(sliderBindingTargets(objects)[0].properties.find(p => p.key === 'centralAngle')?.disabled).not.toBe(true);
    const bound = bindSliderProperty(objects, 's', 'round', 'centralAngle', () => { throw new Error('Yeni nokta gerekmemeli.'); });
    expect(bound).toHaveLength(objects.length);
    expect(getPoint(bound, 'D').construction).toEqual({ ...D.construction, sliderId: 's', sliderVariableName: 'a' });
    expect(sliderIsBound(bound, 's')).toBe(true);
    const at270 = value(bound, 270);
    expect(getArcGeometry(M, S, getPoint(at270, 'D'))!.sweep * 180 / Math.PI).toBeCloseTo(270);
    const moved = value(at270.map(o => o.id === 'M' ? { ...M, x: 1, y: 2 } : o.id === 'S' ? { ...S, x: 6, y: 2 } : o), 270);
    expect(getPoint(moved, 'D').x).toBeCloseTo(1);
    expect(getPoint(moved, 'D').y).toBeCloseTo(-3);
    expect(getArcGeometry(getPoint(moved, 'M'), getPoint(moved, 'S'), getPoint(moved, 'D'))!.radius).toBeCloseTo(5);
    expect(constructionDependencies(getPoint(moved, 'D'))).toEqual(['S', 'M', 's']);
    expect(sliderBindingTargets(bound)[0].properties.find(p => p.key === 'centralAngle')?.disabled).toBe(true);
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it.each([
    { locked: true },
    { onObjectId: 'round' },
    { dependsOn: ['M'] },
    { construction: { kind: 'rotate', sourceId: 'S', centerId: 'M', degrees: 90, sliderId: 'other' } },
    { construction: { kind: 'rotate', sourceId: 'S', centerId: 'M', degrees: 90, sliderVariableName: 'b' } },
    { construction: { kind: 'rotate', sourceId: 'M', centerId: 'S', degrees: 90 } },
    { construction: { kind: 'midpoint', pointIds: ['M', 'S'] } },
  ] as Partial<PointObject>[])('yayın uyumlu sabit döndürmesi dışındaki ilişkiyi veya kilidini değiştirmez: %j', extra => {
    const M = point('M', 0, 0), S = point('S', 2, 0);
    const D = point('D', 0, 2, { isIndependent: false, construction: { kind: 'rotate', sourceId: 'S', centerId: 'M', degrees: 90 }, ...extra });
    const shape: MathObject = { ...base('round'), type: 'arc', centerPointId: 'M', startPointId: 'S', directionPointId: 'D' };
    const objects = [M, S, D, slider(60), shape];
    const snapshot = JSON.stringify(objects);
    expect(sliderBindingTargets(objects)[0].properties.find(p => p.key === 'centralAngle')?.disabled).toBe(true);
    expect(() => bind(objects, 'round', 'centralAngle')).toThrow('bağlanamıyor');
    expect(JSON.stringify(objects)).toBe(snapshot);
  });

  it('elipsin önceki bağını ezmez; sıfır yarıçapı ilk bağda ve canlı güncellemede reddeder', () => {
    const ellipse: EllipseObject = { ...base('ellipse'), type: 'ellipse', centerPointId: 'A', radiusX: 3, radiusY: 2 };
    expect(() => bind([A, slider(0), ellipse], 'ellipse', 'radiusX')).toThrow('sıfırdan büyük');
    const bound = bind([A, slider(3), ellipse], 'ellipse', 'radiusX');
    const snapshot = JSON.stringify(bound);
    expect(() => bind(bound, 'ellipse', 'radiusX')).toThrow('başka bir kaydırıcıya bağlı');
    expect(() => value(bound, 0)).toThrow();
    expect(JSON.stringify(bound)).toBe(snapshot);
  });
});
