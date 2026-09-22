import { describe, expect, it } from 'vitest';
import type { AngleObject, CircleObject, EllipseObject, FractionObject, FunctionObject, MathObject, PointObject, PolygonObject, SegmentObject, SliderObject, TextObject } from '@/types/math';
import { resolveCommandBindings } from '@/math/commandBindings';
import { calculateAngleDegrees, calculatePolygonArea } from '@/math/geometry';
import { compileMathExpression } from '@/math/parser';
import { handlers } from '../handlers/edit';
import { rankHandlers } from '../engine';
import { parseClause, splitClauses } from '../text';
import { CommandScene } from '../scene';
import type { CommandSuccess } from '../types';
import { build, byLabel, byType, dist, expectFail, expectOk, point, runWith } from './helpers';

const ok = (text: string, scene: MathObject[], selection: string[] = []) => expectOk(handlers, text, scene, selection);
const bad = (text: string, scene: MathObject[], selection: string[] = []) => expectFail(handlers, text, scene, selection);
const get = <T extends MathObject>(r: CommandSuccess | MathObject[], id: string) => ((Array.isArray(r) ? r : r.objects).find(o => o.id === id) as T);
const angleAt = (objects: MathObject[], p1: string, v: string, p3: string) => calculateAngleDegrees(point(objects, p1), point(objects, v), point(objects, p3));

/** Bu cümle için düzenleme ailesinden hangi işleyiciler eşleşiyor. */
function matching(text: string, scene: MathObject[] = [], selection: string[] = []): string[] {
  const s = new CommandScene(scene, selection);
  return splitClauses(text).flatMap(part => rankHandlers(parseClause(part, s.known()), s, handlers).map(r => r.handler.id));
}

// ----------------------------------------------------------------------------- sahneler

const pts = (s: CommandScene, list: [string, number, number][]) => Object.fromEntries(list.map(([l, x, y]) => [l, s.addPoint({ x, y }, { label: l })])) as Record<string, PointObject>;

/** A(0,0) B(4,0) C(0,3) üçgeni */
const triangle = () => build(s => { const p = pts(s, [['A', 0, 0], ['B', 4, 0], ['C', 0, 3]]); s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); });

/** Çok nesneli sahne */
const world = () => build(s => {
  const p = pts(s, [['A', 0, 0], ['B', 4, 0], ['C', 0, 3], ['O', -6, 0], ['K', 8, 0], ['L', 11, 0], ['F', 8, 4], ['G', 12, 4]]);
  s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' });
  s.addSegment(p.K.id, p.L.id);
  s.addLine(p.F.id, p.G.id);
  s.addCircle({ centerId: p.O.id, radius: 2 }, { label: 'c1' });
  s.addSlider('a');
  s.addFunction('a*x^2');
  s.addText('Selam', { x: 0, y: -6 });
  s.addFraction(1, 2, { x: -10, y: -6 });
});

const square = () => build(s => { const p = pts(s, [['P', 0, 0], ['Q', 2, 0], ['R', 2, 2], ['S', 0, 2]]); s.addPolygon([p.P.id, p.Q.id, p.R.id, p.S.id], { kind: 'square', label: 'Kare' }); });
const rectangle = () => build(s => { const p = pts(s, [['K', 0, 0], ['L', 4, 0], ['M', 4, 2], ['N', 0, 2]]); s.addPolygon([p.K.id, p.L.id, p.M.id, p.N.id], { kind: 'rectangle', label: 'Dikdörtgen' }); });
const angleScene = () => build(s => { const p = pts(s, [['A', 1, 0], ['B', 0, 0], ['C', 0, 1]]); s.addAngle(p.A.id, p.B.id, p.C.id); });
const circleScene = () => build(s => { const p = pts(s, [['O', 0, 0]]); s.addCircle({ centerId: p.O.id, radius: 2 }); });
const lineScene = () => build(s => { const p = pts(s, [['A', 0, 0], ['B', 4, 0], ['C', 1, 2]]); s.addLine(p.A.id, p.B.id); });
const segmentScene = () => build(s => { const p = pts(s, [['A', 0, 0], ['B', 3, 4]]); s.addSegment(p.A.id, p.B.id); });
const lockedScene = () => build(s => {
  const p = pts(s, [['A', 0, 0], ['B', 4, 0]]);
  const seg = s.addSegment(p.A.id, p.B.id);
  s.addPoint({ x: 1, y: 0 }, { label: 'P', onObjectId: seg.id });
});
const circleWithP = () => build(s => { const p = pts(s, [['M', 0, 0], ['P', 5, 0]]); s.addCircle({ centerId: p.M.id, radius: 2 }, { label: 'c1' }); });
const ellipseScene = () => build(s => { const p = pts(s, [['H', 0, 0]]); s.addEllipse(p.H.id, 3, 2); });
const textScene = () => build(s => { s.addText('Selam', { x: 1, y: 1 }); });
const fractionScene = () => build(s => { s.addFraction(1, 2, { x: 0, y: 0 }); });
const buttonScene = () => build(s => { const t = s.addText('Not', { x: 0, y: 0 }); s.addButton({ kind: 'toggle', targetIds: [t.id] }, { x: 3, y: 3 }); });
const functionScene = () => build(s => { s.addFunction('a*x^2'); });
const withMidpoint = () => build(s => {
  const p = pts(s, [['A', 0, 0], ['B', 4, 0]]);
  s.addSegment(p.A.id, p.B.id);
  s.addPoint({ x: 2, y: 0 }, { label: 'M', construction: { kind: 'midpoint', pointIds: [p.A.id, p.B.id] } });
});

// ----------------------------------------------------------------------------- örneklerin tamamı

type ExampleCase = { scene: () => MathObject[]; selection?: (objects: MathObject[]) => string[]; check?: (r: CommandSuccess, before: MathObject[]) => void };
const selectType = (type: MathObject['type']) => (objects: MathObject[]) => objects.filter(o => o.type === type).map(o => o.id);
const EXAMPLES: Record<string, ExampleCase> = {
  // silme
  'ABC sil': { scene: triangle, check: r => expect(byType(r.objects, 'polygon')).toHaveLength(0) },
  'A noktasını sil': { scene: triangle, check: r => expect(r.objects.map(o => o.label).sort()).toEqual(['B', 'C']) },
  'A, B ve C noktalarını sil': { scene: triangle, check: r => expect(r.objects).toHaveLength(0) },
  'tüm çemberleri sil': { scene: () => build(s => { const p = pts(s, [['O', 0, 0], ['Q', 5, 5]]); s.addCircle({ centerId: p.O.id, radius: 1 }); s.addCircle({ centerId: p.Q.id, radius: 2 }); }), check: r => expect(byType(r.objects, 'circle')).toHaveLength(0) },
  'son çizileni sil': { scene: world, check: (r, before) => expect(r.objects).toHaveLength(before.length - 1) },
  'seçili nesneleri sil': { scene: world, selection: selectType('segment'), check: r => expect(byType(r.objects, 'segment')).toHaveLength(0) },
  'f fonksiyonunu sil': { scene: world, check: r => { expect(byType(r.objects, 'function')).toHaveLength(0); expect(byType(r.objects, 'slider')).toHaveLength(1); } },
  'a kaydırıcısını sil': { scene: world, check: r => { expect(byType(r.objects, 'slider')).toHaveLength(0); expect(point(r.objects, 'A')).toBeTruthy(); } },
  'ABC üçgenini noktalarıyla birlikte sil': { scene: triangle, check: r => expect(r.objects).toHaveLength(0) },
  'yalnızca ABC üçgenini sil': { scene: triangle, check: r => { expect(byType(r.objects, 'polygon')).toHaveLength(0); expect(byType(r.objects, 'point')).toHaveLength(3); } },
  'ABC üçgenini sil, noktalar kalsın': { scene: triangle, check: r => { expect(byType(r.objects, 'polygon')).toHaveLength(0); expect(byType(r.objects, 'point')).toHaveLength(3); } },
  // seçme
  'ABC seç': { scene: world, check: r => expect(r.selectedIds).toEqual(byType(r.objects, 'polygon').map(o => o.id)) },
  "ABC'yi seç": { scene: world, check: r => expect(r.sceneChanged).toBe(false) },
  "A ve B'yi seç": { scene: world, check: r => expect(r.selectedIds.map(id => get(r, id).label)).toEqual(['A', 'B']) },
  'tüm noktaları seç': { scene: world, check: r => expect(r.selectedIds).toHaveLength(8) },
  "ABC'nin köşelerini seç": { scene: world, check: r => expect(r.selectedIds.map(id => get(r, id).label)).toEqual(['A', 'B', 'C']) },
  'seçimi kaldır': { scene: world, selection: selectType('polygon'), check: r => expect(r.selectedIds).toEqual([]) },
  // renk
  "ABC'yi kırmızı yap": { scene: triangle, check: r => expect(byType(r.objects, 'polygon')[0]).toMatchObject({ color: '#ef4444', fillColor: '#ef4444' }) },
  'çemberin rengini yeşil yap': { scene: circleScene, check: r => expect(byType(r.objects, 'circle')[0].color).toBe('#10b981') },
  'tüm noktaları maviye boya': { scene: () => build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A', color: '#000000' }); s.addPoint({ x: 1, y: 0 }, { label: 'B', color: '#000000' }); }), check: r => expect(byType(r.objects, 'point').every(p => p.color === '#2563eb')).toBe(true) },
  '#ff8800 yap': { scene: triangle, selection: selectType('polygon'), check: r => expect(byType(r.objects, 'polygon')[0].color).toBe('#ff8800') },
  "ABC'nin içini sarıya boya": { scene: triangle, check: r => expect(byType(r.objects, 'polygon')[0]).toMatchObject({ color: '#10b981', fillColor: '#eab308' }) },
  "AB'nin rengi mor olsun": { scene: segmentScene, check: r => expect(byType(r.objects, 'segment')[0].color).toBe('#8b5cf6') },
  // dolgu
  'içini doldur': { scene: triangle, selection: selectType('polygon'), check: r => expect(byType(r.objects, 'polygon')[0].fillOpacity).toBe(0.35) },
  "ABC'nin dolgusunu kaldır": { scene: triangle, check: r => expect(byType(r.objects, 'polygon')[0].fillOpacity).toBe(0.001) },
  'yarı saydam yap': { scene: circleScene, selection: selectType('circle'), check: r => expect(byType(r.objects, 'circle')[0].fillOpacity).toBe(0.5) },
  '%30 saydamlık': { scene: triangle, selection: selectType('polygon'), check: r => expect(byType(r.objects, 'polygon')[0].fillOpacity).toBeCloseTo(0.7) },
  'çemberin içini boya': { scene: circleScene, check: r => expect(byType(r.objects, 'circle')[0].fillOpacity).toBe(0.35) },
  // kalınlık
  "AB'yi kalın yap": { scene: segmentScene, check: r => expect(byType(r.objects, 'segment')[0].thickness).toBe(4) },
  'ince yap': { scene: segmentScene, selection: selectType('segment'), check: r => expect(byType(r.objects, 'segment')[0].thickness).toBe(1.56) },
  'kalınlığını 4 yap': { scene: segmentScene, selection: selectType('segment'), check: r => expect(byType(r.objects, 'segment')[0].thickness).toBe(4) },
  'f fonksiyonunun kalınlığı 5 olsun': { scene: functionScene, check: r => expect(byType(r.objects, 'function')[0].thickness).toBe(5) },
  // görünürlük
  'A noktasını gizle': { scene: triangle, check: r => expect(point(r.objects, 'A').visible).toBe(false) },
  'gizli nesneleri göster': { scene: () => triangle().map(o => ({ ...o, visible: o.label === 'A' ? false : o.visible })), check: r => expect(r.objects.every(o => o.visible)).toBe(true) },
  "c1'i göster": { scene: () => circleWithP().map(o => o.type === 'circle' ? { ...o, visible: false } : o), check: r => expect(byType(r.objects, 'circle')[0].visible).toBe(true) },
  'tüm noktaları gizle': { scene: triangle, check: r => expect(byType(r.objects, 'point').every(p => !p.visible)).toBe(true) },
  'ABC üçgenini gizle': { scene: triangle, check: r => { expect(byType(r.objects, 'polygon')[0].visible).toBe(false); expect(byType(r.objects, 'point').every(p => p.visible)).toBe(true); } },
  'onu tekrar görünür yap': { scene: () => triangle().map(o => o.label === 'A' ? { ...o, visible: false } : o), selection: o => [point(o, 'A').id], check: r => expect(point(r.objects, 'A').visible).toBe(true) },
  // adlar
  'A noktasının adını gizle': { scene: triangle, check: r => expect(point(r.objects, 'A').showLabel).toBe(false) },
  'etiketleri göster': { scene: () => triangle().map(o => o.type === 'point' ? { ...o, showLabel: false } : o), check: r => expect(byType(r.objects, 'point').every(p => p.showLabel)).toBe(true) },
  'noktaların adlarını gizle': { scene: triangle, check: r => expect(byType(r.objects, 'point').every(p => !p.showLabel)).toBe(true) },
  "ABC'nin köşe adlarını göster": { scene: () => triangle().map(o => o.type === 'point' ? { ...o, showLabel: false } : o), check: r => expect(byType(r.objects, 'point').every(p => p.showLabel)).toBe(true) },
  // yeniden adlandırma
  'A noktasının adını P yap': { scene: triangle, check: r => { expect(point(r.objects, 'P')).toBeTruthy(); expect(byType(r.objects, 'polygon')[0].label).toBe('PBC'); } },
  "A'yı P olarak adlandır": { scene: triangle, check: r => expect(point(r.objects, 'P')).toBeTruthy() },
  'AB doğrusunun adını d yap': { scene: lineScene, check: r => expect(byType(r.objects, 'line')[0].label).toBe('d') },
  "B'nin adı K olsun": { scene: triangle, check: r => expect(byType(r.objects, 'polygon')[0].label).toBe('AKC') },
  'a kaydırıcısının adını k yap': { scene: functionScene, check: r => { expect(byType(r.objects, 'slider')[0]).toMatchObject({ variableName: 'k', label: 'k Parametresi' }); expect(byType(r.objects, 'function')[0]).toMatchObject({ expression: 'k*x^2', label: 'f(x) = k*x^2' }); } },
  // taşıma
  "A'yı (3;4)'e taşı": { scene: triangle, check: r => expect(point(r.objects, 'A')).toMatchObject({ x: 3, y: 4 }) },
  'A noktasını 2 birim sağa taşı': { scene: triangle, check: r => expect(point(r.objects, 'A')).toMatchObject({ x: 2, y: 0 }) },
  "ABC'yi (1,-2) kadar kaydır": { scene: triangle, check: r => { expect(point(r.objects, 'B')).toMatchObject({ x: 5, y: -2 }); expect(point(r.objects, 'C')).toMatchObject({ x: 1, y: 1 }); } },
  "c1'in merkezini (0,0)'a taşı": { scene: world, check: r => expect(point(r.objects, 'O')).toMatchObject({ x: 0, y: 0 }) },
  "ABC'yi 3 birim yukarı kaydır": { scene: triangle, check: r => expect(point(r.objects, 'C')).toMatchObject({ x: 0, y: 6 }) },
  'A noktasını B noktasına taşı': { scene: triangle, check: r => expect(point(r.objects, 'A')).toMatchObject({ x: 4, y: 0 }) },
  'f fonksiyonunu 2 birim yukarı kaydır': { scene: functionScene, check: r => expect(byType(r.objects, 'function')[0].expression).toBe('(a*x^2) + 2') },
  "ABC'yi AB vektörü kadar kaydır": { scene: triangle, check: r => expect(point(r.objects, 'A')).toMatchObject({ x: 4, y: 0 }) },
  // boyut
  "AB'nin uzunluğunu 5 yap": { scene: triangle, check: r => expect(dist(point(r.objects, 'A'), point(r.objects, 'B'))).toBeCloseTo(5, 6) },
  'AB = 5': { scene: segmentScene, check: r => expect(dist(point(r.objects, 'A'), point(r.objects, 'B'))).toBeCloseTo(5, 6) },
  'çemberin yarıçapını 4 yap': { scene: circleScene, check: r => expect(byType(r.objects, 'circle')[0]).toMatchObject({ fixedRadius: 4, label: 'O Çemberi (r = 4)' }) },
  'ABC açısını 60 derece yap': { scene: angleScene, check: r => expect(angleAt(r.objects, 'A', 'B', 'C')).toBeCloseTo(60, 6) },
  'karenin kenarını 5 yap': { scene: square, check: r => expect(dist(point(r.objects, 'P'), point(r.objects, 'Q'))).toBeCloseTo(5, 6) },
  'dikdörtgenin boyutlarını 3 ve 6 yap': { scene: rectangle, check: r => { expect(dist(point(r.objects, 'K'), point(r.objects, 'L'))).toBeCloseTo(3, 6); expect(dist(point(r.objects, 'K'), point(r.objects, 'N'))).toBeCloseTo(6, 6); } },
  'elipsin yarıçaplarını 4 ve 2 yap': { scene: ellipseScene, check: r => expect(byType(r.objects, 'ellipse')[0]).toMatchObject({ radiusX: 4, radiusY: 2 }) },
  'çemberin çapını 10 yap': { scene: circleScene, check: r => expect(byType(r.objects, 'circle')[0].fixedRadius).toBe(5) },
  "ABC'nin alanını 24 yap": { scene: triangle, check: r => expect(calculatePolygonArea(['A', 'B', 'C'].map(l => point(r.objects, l)))).toBeCloseTo(24, 6) },
  "AB'yi 5 birim yap": { scene: segmentScene, check: r => expect(dist(point(r.objects, 'A'), point(r.objects, 'B'))).toBeCloseTo(5, 6) },
  // yazı / kesir / düğme
  'yazıyı "Merhaba" olarak değiştir': { scene: textScene, check: r => expect(byType(r.objects, 'text')[0].text).toBe('Merhaba') },
  'kesri 3/4 yap': { scene: fractionScene, check: r => expect(byType(r.objects, 'fraction')[0]).toMatchObject({ numerator: 3, denominator: 4, label: '3/4 Kesir Modeli' }) },
  'yazının boyutunu 18 yap': { scene: textScene, check: r => expect(byType(r.objects, 'text')[0].fontSize).toBe(18) },
  'kesrin paydasını 8 yap': { scene: fractionScene, check: r => expect(byType(r.objects, 'fraction')[0]).toMatchObject({ numerator: 1, denominator: 8 }) },
  'kesri şerit modeli yap': { scene: fractionScene, check: r => expect(byType(r.objects, 'fraction')[0].modelType).toBe('bar') },
  'düğmenin yazısını "Başlat" yap': { scene: buttonScene, check: r => expect(byType(r.objects, 'button')[0].label).toBe('Başlat') },
  // kopyalama
  "ABC'yi kopyala": { scene: triangle, check: r => { expect(byType(r.objects, 'polygon').map(p => p.label)).toEqual(['ABC', 'DEF']); expect(r.selectedIds).toEqual([byType(r.objects, 'polygon')[1].id]); } },
  'çoğalt': { scene: triangle, selection: selectType('polygon'), check: r => expect(byType(r.objects, 'polygon')).toHaveLength(2) },
  'ABC üçgenini 5 birim sağa kopyala': { scene: triangle, check: r => expect(point(r.objects, 'D')).toMatchObject({ x: 5, y: 0 }) },
  "c1'i (6;0) noktasına kopyala": { scene: circleWithP, check: r => { const copy = byType(r.objects, 'circle')[1]; expect(point(r.objects, get<PointObject>(r, copy.centerPointId).label)).toMatchObject({ x: 6, y: 0 }); } },
  'A noktasını 3 kez çoğalt': { scene: triangle, check: r => expect(byType(r.objects, 'point')).toHaveLength(6) },
  // kilit
  'C noktasını AB doğrusuna kilitle': { scene: lineScene, check: r => expect(point(r.objects, 'C')).toMatchObject({ x: 1, y: 0, onObjectId: byType(r.objects, 'line')[0].id }) },
  "P'yi c1 çemberine sabitle": { scene: circleWithP, check: r => expect(point(r.objects, 'P')).toMatchObject({ x: 2, y: 0, onObjectId: byType(r.objects, 'circle')[0].id }) },
  "A'nın kilidini aç": { scene: () => lockedScene().map(o => o.label === 'P' ? { ...o, label: 'A_9' } : o).map(o => o.label === 'A' ? { ...o, label: 'Z' } : o).map(o => o.label === 'A_9' ? { ...o, label: 'A' } : o), check: r => expect(point(r.objects, 'A').onObjectId).toBeUndefined() },
  'P noktasını serbest bırak': { scene: lockedScene, check: r => expect(point(r.objects, 'P')).toMatchObject({ onObjectId: undefined, isIndependent: true }) },
  "C'yi AB üzerine kilitle": { scene: () => build(s => { const p = pts(s, [['A', 0, 0], ['B', 4, 0], ['C', 2, 3]]); s.addSegment(p.A.id, p.B.id); }), check: r => expect(point(r.objects, 'C')).toMatchObject({ x: 2, y: 0 }) },
  // iç / dış açı
  'B açısını dış açı yap': { scene: angleScene, check: r => expect(byType(r.objects, 'angle')[0].reflex).toBe(true) },
  "∠ABC'yi iç açı yap": { scene: () => angleScene().map(o => o.type === 'angle' ? { ...o, reflex: true } : o), check: r => expect(byType(r.objects, 'angle')[0].reflex).toBe(false) },
  'açıyı dış açıya çevir': { scene: angleScene, check: r => expect(byType(r.objects, 'angle')[0].reflex).toBe(true) },
  'tüm açıları iç açı yap': { scene: () => angleScene().map(o => o.type === 'angle' ? { ...o, reflex: true } : o), check: r => expect(byType(r.objects, 'angle')[0].reflex).toBe(false) },
};

describe('edit examples', () => {
  const all = handlers.flatMap(h => h.examples.map(e => [h.id, e] as const));
  it('every handler has 4–20 examples and every example has a test case', () => {
    for (const h of handlers) expect(h.examples.length).toBeGreaterThanOrEqual(4);
    for (const h of handlers) expect(h.examples.length).toBeLessThanOrEqual(20);
    expect(all.filter(([, e]) => !EXAMPLES[e]).map(([, e]) => e)).toEqual([]);
  });
  it.each(all)('%s: %s', (id, example) => {
    const c = EXAMPLES[example];
    const scene = c.scene();
    const selection = c.selection?.(scene) ?? [];
    expect(matching(example, scene, selection)[0]).toBe(id);
    const r = ok(example, scene, selection);
    expect(r.message.length).toBeGreaterThan(5);
    c.check?.(r, scene);
  });
});

// ----------------------------------------------------------------------------- aile sınırları

describe('ownership boundaries', () => {
  it.each([
    'tümünü sil', 'her şeyi sil', 'tuvali temizle', 'tümünü seç', 'kalem aracını seç', 'kırmızı bir üçgen çiz', "ABC'nin alanını gizle", 'ızgarayı gizle',
    'etiket kutularını gizle', 'tüm ölçümleri gizle', 'dolguları kaldır', 'çizgileri kalınlaştır', 'yazıları büyüt', '3 4 5 üçgeni olsun',
    'üçgenin kenarları 3, 4 ve 5 olsun', "a'yı 3 yap", 'a = 2', 'yarıçapı 3 olan çember çiz', "ABC'yi A etrafında 90 derece döndür", 'AB uzunluğunu göster',
    'üçgenin kaydırıcı bağını kaldır', 'geri al', '"Merhaba" yazısı ekle', 'kenar uzunluğu 4 olan kare çiz', "AB'nin orta noktasını oluştur", 'A = (1;2)',
    'ABC açısını göster', "ABC'yi x eksenine göre yansıt", 'üçgen uzunluklarını kaydırıcıya bağla', 'noktaları küçült', 'ABC üçgeninin açılarını göster',
    "ABC'yi (2;1) vektörü ile ötele", 'yeşil renkte bir çember oluştur', 'kenarları 3 4 5 olan üçgen çiz', 'AB uzunluğu kaç?', 'siyah beyaz yap',
    '3/4 kesri çiz', 'A noktasının koordinatlarını göster', 'kırmızı kare yap', 'tüm nesneleri sil',
  ])('%s → no edit handler', text => {
    const scene = world();
    expect(matching(text, scene)).toEqual([]);
  });
  it('AB = 5 is left to the algebra family when a slider named ab exists', () => {
    const scene = build(s => { s.addSlider('ab'); }, segmentScene());
    expect(matching('AB = 5', scene)).toEqual([]);
    expect(matching('AB = 5', segmentScene())).toEqual(['edit.size']);
  });
});

// ----------------------------------------------------------------------------- silme

describe('delete', () => {
  it('cascades dependents and reports them', () => {
    const r = ok('A noktasını sil', world());
    expect(byType(r.objects, 'polygon')).toHaveLength(0);
    expect(r.message).toContain('A noktası silindi');
    expect(r.message).toContain('Bağlı 1 nesne');
    expect(r.selectedIds).toEqual([]);
  });
  // ŞEKLİN KENDİ NOKTALARI: üçgen hangi yoldan silinirse silinsin, başka hiçbir nesnenin kullanmadığı köşeleri de gider.
  it.each(["ABC'yi sil", 'ABC üçgenini sil', 'abc yi sil', 'lütfen ABC üçgenini siler misin', 'ABC kaldır'])('%s removes the polygon and its unused vertices', text => {
    const r = ok(text, triangle());
    expect(byType(r.objects, 'polygon')).toHaveLength(0);
    expect(byType(r.objects, 'point')).toHaveLength(0);
    expect(r.message).toBe('ABC üçgeni (A, B ve C noktalarıyla birlikte) silindi.');
  });
  it.each(['yalnızca ABC üçgenini sil', 'sadece ABC üçgenini sil', 'ABC üçgenini sil, noktalar kalsın',
    'ABC üçgenini sil, noktaları yerinde kalsın', 'ABC üçgenini sil, köşeleri dursun', 'ABC üçgenini sil, noktalara dokunma'])(
    '%s keeps the vertices', text => {
      const r = ok(text, triangle());
      expect(byType(r.objects, 'polygon')).toHaveLength(0);
      expect(byType(r.objects, 'point').map(p => p.label)).toEqual(['A', 'B', 'C']);
      expect(r.message).toBe('ABC üçgeni silindi (A, B ve C noktaları yerinde kaldı).');
    });
  it('keeps a vertex that another shape still uses', () => {
    const shared = build(s => { const d = s.addPoint({ x: 4, y: 3 }, { label: 'D' }); s.addPolygon([s.findPoint('B')!.id, s.findPoint('C')!.id, d.id], { kind: 'triangle', label: 'BCD' }); }, triangle());
    const r = ok('ABC üçgenini sil', shared);
    expect(byType(r.objects, 'point').map(p => p.label)).toEqual(['B', 'C', 'D']);
    expect(r.message).toBe('ABC üçgeni (A noktasıyla birlikte) silindi.');
  });
  it('keeps a vertex of an unfinished drawing (pendingPointIds)', () => {
    const scene = triangle();
    const a = byType(scene, 'point').find(p => p.label === 'A')!;
    const r = expectOk(handlers, 'ABC üçgenini sil', scene, [], { pendingPointIds: [a.id] });
    expect(byType(r.objects, 'point').map(p => p.label)).toEqual(['A']);
  });
  it('distinguishes point A from slider a by letter case', () => {
    expect(byType(ok("A'yı sil", world()).objects, 'slider')).toHaveLength(1);
    const lower = ok("a'yı sil", world());
    expect(byType(lower.objects, 'slider')).toHaveLength(0);
    expect(point(lower.objects, 'A')).toBeTruthy();
  });
  it('removes a whole last creation group but not shared points', () => {
    expect(ok('son çizileni sil', triangle()).objects).toHaveLength(0);
    const shared = build(s => { const [a, b] = [s.findPoint('A')!, s.findPoint('B')!]; s.addSegment(a.id, b.id); }, triangle());
    const r = ok('son çizileni sil', shared);
    expect(byType(r.objects, 'segment')).toHaveLength(0);
    expect(byType(r.objects, 'point')).toHaveLength(3);
  });
  it('removes all objects of a type and the selection', () => {
    expect(byType(ok('tüm noktaları sil', world()).objects, 'point')).toHaveLength(0);
    const scene = world();
    const r = ok('seçilileri sil', scene, [byType(scene, 'text')[0].id]);
    expect(byType(r.objects, 'text')).toHaveLength(0);
    expect(r.objects).toHaveLength(scene.length - 1);
  });
  it('works with a preceding selection clause', () => {
    const r = ok("A ve B'yi seç, sonra onları sil", triangle());
    expect(byType(r.objects, 'point').map(p => p.label)).toEqual(['C']);
  });
  it.each([
    ['X noktasını sil', 'bulunamadı'],
    ['çemberi sil', 'Birden fazla çember'],
    ['seçili nesneleri sil', 'Seçili nesne yok'],
    ['C1 doğrusunu sil', 'doğru değil'],
  ])('fails clearly: %s', (text, expected) => {
    const scene = build(s => { const o = s.addPoint({ x: 20, y: 20 }, { label: 'W' }); s.addCircle({ centerId: o.id, radius: 1 }); }, world());
    expect(bad(text, scene)).toContain(expected);
  });
});

// ----------------------------------------------------------------------------- seçme

describe('select', () => {
  it('does not change the scene and returns the selection', () => {
    const scene = world();
    const r = ok('ABC seç', scene);
    expect(r.sceneChanged).toBe(false);
    expect(r.objects).toBe(scene);
    expect(get(r, r.selectedIds[0]).type).toBe('polygon');
  });
  it.each([['tüm çemberleri seç', 'circle', 1], ['bütün fonksiyonları seç', 'function', 1], ['yazıyı seç', 'text', 1]] as const)('%s', (text, type, n) => {
    const r = ok(text, world());
    expect(r.selectedIds).toHaveLength(n);
    expect(r.selectedIds.every(id => get(r, id).type === type)).toBe(true);
  });
  it('selects by label then edits the selection in the same command', () => {
    const r = ok("ABC'yi seç ve mavi yap", world());
    expect(byType(r.objects, 'polygon')[0].color).toBe('#2563eb');
  });
});

// ----------------------------------------------------------------------------- renk ve dolgu

describe('color', () => {
  it('writes color and fillColor where the renderer reads them', () => {
    const scene = build(s => {
      const o = s.addPoint({ x: 0, y: 0 }, { label: 'O' });
      s.addEllipse(o.id, 2, 1);
      const a = s.addPoint({ x: 1, y: 0 }, { label: 'S' });
      const b = s.addPoint({ x: 0, y: 1 }, { label: 'T' });
      s.addSector(o.id, a.id, b.id);
    });
    const first = ok('elipsi turuncu yap', scene);
    expect(byType(first.objects, 'ellipse')[0]).toMatchObject({ color: '#f59e0b', fillColor: '#f59e0b' });
    const r = ok('daire dilimini turuncu yap', first.objects);
    expect(byType(r.objects, 'sector')[0]).toMatchObject({ color: '#f59e0b', fillColor: '#f59e0b' });
  });
  it.each([
    ["ABC'nin kenarlarını pembe yap", { color: '#ec4899', fillColor: '#10b981' }],
    ['ABC üçgeninin rengini açık mavi yap', { color: '#0284c7', fillColor: '#0284c7' }],
    ['ABC yi yeşile boyar mısın', { color: '#10b981' }],
    ["ABC'nin dolgusunu kırmızı yap", { fillColor: '#ef4444', color: '#10b981' }],
  ])('%s', (text, expected) => {
    expect(byType(ok(text, triangle()).objects, 'polygon')[0]).toMatchObject(expected);
  });
  it('colors functions, texts and focus from a previous clause', () => {
    expect(byType(ok('f fonksiyonunu kırmızı yap', world()).objects, 'function')[0].color).toBe('#ef4444');
    expect(byType(ok('yazıyı mor yap', world()).objects, 'text')[0].color).toBe('#8b5cf6');
    const r = ok('ABC seç, sonra onu gri yap', world());
    expect(byType(r.objects, 'polygon')[0].color).toBe('#6b7280');
    expect(r.selectedIds).toEqual([byType(r.objects, 'polygon')[0].id]);
  });
  it('asks for a colour or target when missing', () => {
    expect(bad("ABC'nin rengini değiştir", triangle())).toContain('Hangi renk');
    expect(bad('kırmızı yap', triangle())).toContain('Hangi nesne');
    expect(bad("AB'nin içini kırmızıya boya", segmentScene())).toContain('dolgu');
  });
});

describe('fill', () => {
  it.each([
    ["ABC'nin içini doldur", 0.35], ['ABC üçgenini dolgusuz yap', 0.001], ["ABC'nin saydamlığını %50 yap", 0.5], ["ABC'nin dolgusunu %80 yap", 0.8],
    ['ABC yi opak yap', 1], ["ABC'yi tam saydam yap", 0.001],
  ])('%s → %s', (text, opacity) => {
    expect(byType(ok(text, triangle()).objects, 'polygon')[0].fillOpacity).toBeCloseTo(opacity, 6);
  });
  it('rejects shapes without fill and invalid percentages', () => {
    expect(bad("AB'nin içini doldur", segmentScene())).toContain('içi boyanabilen');
    expect(bad("ABC'nin saydamlığını %150 yap", triangle())).toContain('0 ile 100');
  });
});

// ----------------------------------------------------------------------------- kalınlık, görünürlük, adlar

describe('thickness', () => {
  it('scales, sets and explains unsupported types', () => {
    const scene = world();
    const r = ok('KL yi çok kalın yap', scene);
    expect(byType(r.objects, 'segment')[0].thickness).toBe(5.5);
    expect(byType(ok('[KL] parçasını incelt', scene).objects, 'segment')[0].thickness).toBe(1.56);
    expect(bad('FG doğrusunu kalın yap', scene)).toContain('Doğru ve ışınlar');
    expect(bad("ABC'yi kalın yap", scene)).toContain('çizgileri kalınlaştır');
    expect(bad('KL yi kesikli yap', scene)).toContain('Kesikli');
    expect(bad("KL'nin kalınlığını 50 yap", scene)).toContain('0,5 ile 20');
  });
});

describe('visibility and names', () => {
  it('hides a shape together with its points on request and shows hidden ones by type', () => {
    const hidden = ok('ABC üçgenini noktalarıyla birlikte gizle', triangle());
    expect(hidden.objects.every(o => !o.visible)).toBe(true);
    const shown = ok('gizli noktaları göster', hidden.objects);
    expect(byType(shown.objects, 'point').every(p => p.visible)).toBe(true);
    expect(byType(shown.objects, 'polygon')[0].visible).toBe(false);
    expect(ok('A noktasını göster', triangle()).message).toContain('zaten görünür');
    expect(bad('gizli nesneleri göster', triangle())).toContain('Gizli nesne yok');
  });
  it('toggles point names for shapes via their vertices', () => {
    const r = ok("ABC'nin köşe adlarını gizle", triangle());
    expect(byType(r.objects, 'point').every(p => p.showLabel === false)).toBe(true);
    expect(r.message).toBe('A, B ve C noktalarının adları gizlendi.');
    expect(bad('f fonksiyonunun adını gizle', functionScene())).toContain('noktaların');
  });
});

// ----------------------------------------------------------------------------- yeniden adlandırma

describe('rename', () => {
  it('updates canonical labels of dependent objects', () => {
    const scene = build(s => {
      const [a, b, c] = ['A', 'B', 'C'].map(l => s.findPoint(l)!);
      s.addSegment(a.id, b.id);
      s.addLine(b.id, c.id);
      s.addAngle(b.id, a.id, c.id);
      s.addCircle({ centerId: a.id, radius: 1 });
    }, triangle());
    const r = ok("A'nın adını P olarak değiştir", scene);
    expect(r.objects.map(o => o.label)).toEqual(['P', 'B', 'C', 'PBC', '[PB]', 'BC Doğrusu', '∠BPC', 'P Çemberi (r = 1)']);
  });
  it.each([
    ["A'yı B olarak adlandır", 'zaten var'],
    ['A noktasının adını 1x yap', 'geçerli bir nokta adı değil'],
    ['A noktasını yeniden adlandır', 'Yeni adı yazın'],
  ])('fails: %s', (text, expected) => {
    expect(bad(text, triangle())).toContain(expected);
  });
  it('renames non-point objects and functions; the new name is usable afterwards', () => {
    const renamed = ok('AB doğrusunun adını d yap', lineScene());
    expect(byType(ok('d doğrusunu sil', renamed.objects).objects, 'line')).toHaveLength(0);
    const fn = ok('f fonksiyonunun adını g yap', functionScene());
    expect(byType(fn.objects, 'function')[0].label).toBe('g(x) = a*x^2');
    expect(bad('a kaydırıcısının adını x yap', functionScene())).toContain('kaydırıcı adı olamaz');
  });
});

// ----------------------------------------------------------------------------- taşıma

describe('move', () => {
  it.each([
    ['A noktasını sola 3 birim kaydır', { x: -3, y: 0 }],
    ['A yı 2 birim sağa 1 birim aşağı taşı', { x: 2, y: -1 }],
    ['A noktasını x yönünde -2 birim taşı', { x: -2, y: 0 }],
    ['A noktasını (2,5; -1) konumuna taşı', { x: 2.5, y: -1 }],
    ["A'yı iki buçuk birim yukarı taşır mısın", { x: 0, y: 2.5 }],
  ])('%s', (text, expected) => {
    expect(point(ok(text, triangle()).objects, 'A')).toMatchObject(expected);
  });
  it('moves shapes by centroid or centre to an absolute position', () => {
    const r = ok("ABC'yi (1;1) noktasına taşı", triangle());
    const c = ['A', 'B', 'C'].map(l => point(r.objects, l));
    expect((c[0].x + c[1].x + c[2].x) / 3).toBeCloseTo(1, 6);
    expect((c[0].y + c[1].y + c[2].y) / 3).toBeCloseTo(1, 6);
    expect(r.message).toContain('ağırlık merkezi');
    const circle = ok("c1'i (3;3)'e taşı", circleWithP());
    expect(point(circle.objects, 'M')).toMatchObject({ x: 3, y: 3 });
    expect(circle.message).toContain('merkezi');
  });
  it('moves positioned objects', () => {
    const r = ok('yazıyı 2 birim sağa kaydır', world());
    expect(byType(r.objects, 'text')[0]).toMatchObject({ x: 2, y: -6 });
    const fn = ok('f fonksiyonunu 1 birim sağa kaydır', functionScene());
    const compiled = compileMathExpression(byType(fn.objects, 'function')[0].expression)!;
    expect(compiled(3, { a: 1 })).toBeCloseTo(4, 6);
  });
  it('keeps live constructions live and refuses to move a construction point', () => {
    const r = ok("AB'yi 1 birim yukarı kaydır", withMidpoint());
    expect(point(r.objects, 'M')).toMatchObject({ x: 2, y: 1 });
    const moved = resolveCommandBindings(r.objects.map(o => o.type === 'point' && o.label === 'B' ? { ...o, x: 8 } : o));
    expect(point(moved, 'M').x).toBeCloseTo(4, 6);
    expect(bad('M noktasını 1 birim sağa taşı', withMidpoint())).toContain('orta nokta');
  });
  it('carries attached points with their host and projects a moved attached point back', () => {
    const carried = ok("AB'yi 2 birim yukarı kaydır", lockedScene());
    expect(point(carried.objects, 'P')).toMatchObject({ x: 1, y: 2 });
    const projected = ok("P'yi (3;5)'e taşı", lockedScene());
    expect(point(projected.objects, 'P')).toMatchObject({ x: 3, y: 0 });
    expect(projected.message).toContain('en yakın konuma');
    const circle = build(s => { const c = s.ofType('circle')[0]; s.addPoint({ x: 0, y: 2 }, { label: 'Q', onObjectId: c.id }); }, circleWithP());
    const shifted = ok('M noktasını 1 birim sağa taşı', circle);
    expect(point(shifted.objects, 'Q')).toMatchObject({ x: 1, y: 2 });
  });
  it('re-projects an attached point when only one end of its host moves', () => {
    const r = ok("B'yi (4;4)'e taşı", lockedScene());
    const p = point(r.objects, 'P');
    expect(Math.abs(p.x - p.y)).toBeLessThan(1e-6);
  });
  it.each([
    ["A'yı taşı", 'Nereye'],
    ["ABC'yi ve c1'i (0;0)'a taşı", 'aynı konuma'],
    ['f fonksiyonunu (1;1) noktasına taşı', 'yön ve miktar'],
  ])('fails: %s', (text, expected) => {
    expect(bad(text, world())).toContain(expected);
  });
});

// ----------------------------------------------------------------------------- boyut

describe('size', () => {
  it('sets a segment length moving the end point along its direction', () => {
    const r = ok('AB doğru parçasının uzunluğunu 10 yap', segmentScene());
    expect(point(r.objects, 'A')).toMatchObject({ x: 0, y: 0 });
    expect(point(r.objects, 'B').x).toBeCloseTo(6, 6);
    expect(point(r.objects, 'B').y).toBeCloseTo(8, 6);
    expect(r.message).toContain('|AB| = 10 br');
    const reversed = ok("BA'nın uzunluğu 2,5 olsun", segmentScene());
    expect(point(reversed.objects, 'B')).toMatchObject({ x: 3, y: 4 });
    expect(dist(point(reversed.objects, 'A'), point(reversed.objects, 'B'))).toBeCloseTo(2.5, 6);
  });
  it('moves the free end when the other end is bound, and keeps the midpoint live', () => {
    const scene = build(s => { const m = s.findPoint('M')!; const a = s.findPoint('A')!; s.addSegment(m.id, a.id); }, withMidpoint());
    expect(bad("MA'nın uzunluğunu 1 yap", scene)).toContain('orta nokta');
    const r = ok('|AB| = 6', withMidpoint());
    expect(point(r.objects, 'M').x).toBeCloseTo(3, 6);
  });
  it('sets radius for radius-point circles, arcs and three-point circles', () => {
    const rp = build(s => { const [o, p] = [s.addPoint({ x: 0, y: 0 }, { label: 'O' }), s.addPoint({ x: 0, y: 1 }, { label: 'R' })]; s.addCircle({ centerId: o.id, radiusPointId: p.id }); });
    expect(point(ok("çemberin yarıçapı 3 olsun", rp).objects, 'R')).toMatchObject({ x: 0, y: 3 });
    const arc = build(s => { const p = pts(s, [['O', 0, 0], ['S', 2, 0], ['T', 0, 1]]); s.addArc(p.O.id, p.S.id, p.T.id); });
    const ra = ok('yayın yarıçapını 4 yap', arc);
    expect(point(ra.objects, 'S')).toMatchObject({ x: 4, y: 0 });
    expect(point(ra.objects, 'T')).toMatchObject({ x: 0, y: 4 });
    const three = build(s => { const p = pts(s, [['A', 1, 0], ['B', 0, 1], ['C', -1, 0]]); s.addCircle({ throughIds: [p.A.id, p.B.id, p.C.id] }); });
    expect(bad('çemberin yarıçapını 4 yap', three)).toContain('Üç noktadan geçen');
  });
  it('re-projects points attached to a resized circle', () => {
    const scene = build(s => { s.addPoint({ x: 0, y: 2 }, { label: 'Q', onObjectId: s.ofType('circle')[0].id }); }, circleScene());
    const r = ok('çemberin yarıçapını 5 yap', scene);
    expect(point(r.objects, 'Q')).toMatchObject({ x: 0, y: 5 });
  });
  it('sets angles on angle objects, polygon corners and reflex angles', () => {
    const tri = ok('B açısını 45 derece yap', triangle());
    expect(angleAt(tri.objects, 'A', 'B', 'C')).toBeCloseTo(45, 6);
    expect(point(tri.objects, 'A')).toMatchObject({ x: 0, y: 0 });
    const formal = ok('∠ABC = 120', angleScene());
    expect(angleAt(formal.objects, 'A', 'B', 'C')).toBeCloseTo(120, 6);
    const reflex = ok('açıyı 300° yap', angleScene());
    expect(angleAt(reflex.objects, 'A', 'B', 'C')).toBeCloseTo(60, 6);
    expect(byType(reflex.objects, 'angle')[0].reflex).toBe(true);
    expect(bad('ABC açısını 400 derece yap', angleScene())).toContain('0 ile 360');
  });
  it('scales regular polygons, rectangles, areas and perimeters about the centre', () => {
    const sq = ok('karenin kenar uzunluğunu 4 yap', square());
    const v = ['P', 'Q', 'R', 'S'].map(l => point(sq.objects, l));
    expect(v[0]).toMatchObject({ x: -1, y: -1 });
    expect(v[2]).toMatchObject({ x: 3, y: 3 });
    const rect = ok('dikdörtgenin enini 8 yap', rectangle());
    expect(point(rect.objects, 'L')).toMatchObject({ x: 6, y: 0 });
    expect(point(rect.objects, 'K')).toMatchObject({ x: -2, y: 0 });
    const perim = ok('ABC üçgeninin çevresini 24 yap', triangle());
    const [a, b, c] = ['A', 'B', 'C'].map(l => point(perim.objects, l));
    expect(dist(a, b) + dist(b, c) + dist(c, a)).toBeCloseTo(24, 6);
    const circleArea = ok('çemberin alanını 9π yap'.replace('π', ''), circleScene());
    expect(byType(circleArea.objects, 'circle')[0].fixedRadius).toBeCloseTo(Math.sqrt(9 / Math.PI), 6);
    expect(bad('üçgenin kenarını 5 yap', triangle())).toContain('düzgün bir çokgen değil');
    expect(bad('ABC nin boyutlarını 3 ve 4 yap', triangle())).toContain('dikdörtgen değil');
  });
  it('sets ellipse radii individually', () => {
    expect(byType(ok('elipsin yatay yarıçapını 5 yap', ellipseScene()).objects, 'ellipse')[0]).toMatchObject({ radiusX: 5, radiusY: 2 });
    expect(byType(ok('elipsin dikey yarıçapı 1 olsun', ellipseScene()).objects, 'ellipse')[0]).toMatchObject({ radiusX: 3, radiusY: 1 });
  });
  it.each([["AB'nin uzunluğunu -2 yap", 'büyük olmalı'], ['çemberin yarıçapını 0 yap', 'büyük olmalı']])('fails: %s', (text, expected) => {
    expect(bad(text, build(s => { const o = s.addPoint({ x: 9, y: 9 }, { label: 'O' }); s.addCircle({ centerId: o.id, radius: 1 }); }, segmentScene()))).toContain(expected);
  });
});

// ----------------------------------------------------------------------------- yazı, kopya, kilit

describe('phrasing variety', () => {
  it.each([
    ['A noktasını (1;2) noktasına götür', 'A', { x: 1, y: 2 }],
    ["ABC'nin A köşesini (1;1)'e taşı", 'A', { x: 1, y: 1 }],
    ["ABC'nin A köşesini (1;1)'e taşı", 'B', { x: 4, y: 0 }],
    ['lütfen A noktasını sağa doğru 2 birim kaydırır mısın', 'A', { x: 2, y: 0 }],
  ])('%s → %s', (text, label, expected) => {
    expect(point(ok(text, triangle()).objects, label)).toMatchObject(expected);
  });
  it('targets the vertices of a named shape', () => {
    const hidden = ok("ABC'nin köşelerini gizle", triangle());
    expect(byType(hidden.objects, 'point').every(p => !p.visible)).toBe(true);
    expect(byType(hidden.objects, 'polygon')[0].visible).toBe(true);
    const colored = ok('ABC üçgeninin noktalarını kırmızı yap', triangle());
    expect(byType(colored.objects, 'point').every(p => p.color === '#ef4444')).toBe(true);
    expect(byType(colored.objects, 'polygon')[0].color).toBe('#10b981');
    expect(byType(ok("ABC'nin köşelerini sil", triangle()).objects, 'polygon')).toHaveLength(0);
  });
  it('renames with a colon, hides a name with “görünmesin”, colors everything', () => {
    expect(point(ok('A noktasını yeniden adlandır: P', triangle()).objects, 'P')).toBeTruthy();
    expect(point(ok('C noktasının adı görünmesin', triangle()).objects, 'C').showLabel).toBe(false);
    expect(ok('hepsini kırmızı yap', triangle()).objects.every(o => o.color === '#ef4444')).toBe(true);
    expect(point(ok('B noktası görünmesin', triangle()).objects, 'B').visible).toBe(false);
  });
  it.each(['2/5 kesrini şerit modeliyle göster', 'üç bölü dört kesrini göster', '(1;2) noktasını göster'])('does not claim creation phrased with göster: %s', text => {
    expect(matching(text, world())).toEqual([]);
  });
});

describe('text, copy and lock', () => {
  it('edits text by its content and clamps font size', () => {
    const scene = build(s => { s.addText('İkinci', { x: 5, y: 5 }); }, textScene());
    const r = ok('"Selam" yazısını "Günaydın" yap', scene);
    expect(byType(r.objects, 'text').map(t => t.text)).toEqual(['Günaydın', 'İkinci']);
    expect(byType(ok('yazıyı büyüt', textScene()).objects, 'text')[0].fontSize).toBe(18);
    expect(bad('yazının boyutunu 200 yap', textScene())).toContain('6 ile 96');
    expect(bad('kesri 3/40 yap', fractionScene())).toContain('1–30');
    expect(byType(ok('kesri üç bölü beş yap', fractionScene()).objects, 'fraction')[0]).toMatchObject({ numerator: 3, denominator: 5 });
  });
  it('creates independent copies with fresh names', () => {
    const r = ok("ABC'yi kopyala", triangle());
    const copy = byType(r.objects, 'polygon')[1];
    expect(copy.pointIds.map(id => get<PointObject>(r, id).label)).toEqual(['D', 'E', 'F']);
    expect(Math.min(...copy.pointIds.map(id => get<PointObject>(r, id).x))).toBeGreaterThan(4);
    const moved = ok("A'yı (1;1)'e taşı", r.objects);
    expect(point(moved.objects, 'D')).toEqual(point(r.objects, 'D'));
    const functions = ok('f fonksiyonunu kopyala', functionScene());
    expect(byType(functions.objects, 'slider').map(s => s.variableName)).toEqual(['a', 'a2']);
  });
  it('enforces point-lock rules', () => {
    expect(bad('A noktasını AB doğrusuna kilitle', lineScene())).toContain('bağlı');
    expect(bad("C'yi ABC'ye kilitle", build(s => { s.addPoint({ x: 9, y: 9 }, { label: 'D' }); }, triangle()))).toContain('Noktalar yalnızca');
    expect(bad('C noktasını kilitle', lineScene())).toContain('neye kilitleyeyim');
    expect(bad('M noktasını AB doğrusuna kilitle', build(s => { const [a, b] = [s.findPoint('A')!, s.findPoint('B')!]; s.addLine(a.id, b.id); }, withMidpoint()))).toContain('bağlı');
    const released = build(s => { const [o, p] = [s.addPoint({ x: 0, y: 0 }, { label: 'O' }), s.addPoint({ x: 2, y: 0 }, { label: 'R' })]; s.addCircle({ centerId: o.id, radiusPointId: p.id }); });
    const r = ok('R noktasını çembere kilitle', released);
    expect(byType(r.objects, 'circle')[0]).toMatchObject({ fixedRadius: 2, radiusPointId: undefined });
    expect(point(r.objects, 'R').onObjectId).toBe(byType(r.objects, 'circle')[0].id);
  });
  it('accepts uppercase point names the parser reads as words (O, DE)', () => {
    const scene = build(s => { const p = pts(s, [['O', 0, 0], ['D', 1, 0], ['E', 3, 0]]); s.addSegment(p.D.id, p.E.id); });
    expect(ok('O noktasını sil', scene).objects.some(o => o.label === 'O')).toBe(false);
    expect(byType(ok('DE yi kırmızı yap', scene).objects, 'segment')[0].color).toBe('#ef4444');
    expect(point(ok("O'yu (2;2)'ye taşı", scene).objects, 'O')).toMatchObject({ x: 2, y: 2 });
  });
  it('a locked point follows its line when the line moves', () => {
    const locked = ok('C noktasını AB doğrusuna kilitle', lineScene());
    const moved = ok("A'yı (0;2)'ye taşı", locked.objects);
    const [a, b, c] = ['A', 'B', 'C'].map(l => point(moved.objects, l));
    expect((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)).toBeCloseTo(0, 6);
  });
});
