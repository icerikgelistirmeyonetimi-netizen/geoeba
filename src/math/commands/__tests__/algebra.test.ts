import { describe, expect, it } from 'vitest';
import type { ButtonObject, CheckboxObject, FunctionObject, InputBoxObject, MathObject, PointObject, SliderObject } from '@/types/math';
import { compileMathExpression } from '@/math/parser';
import { resolveCommandBindings } from '@/math/commandBindings';
import { collectDependentIds } from '@/state/WorkspaceContext';
import { handlers } from '../handlers/algebra';
import { rankHandlers } from '../engine';
import { CommandScene } from '../scene';
import { parseClause } from '../text';
import type { CommandHandler } from '../types';
import { build, byLabel, byType, dist, expectFail, expectOk, point, runWith } from './helpers';

const ok = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectOk(handlers, text, scene, selection);
const bad = (text: string, scene: MathObject[] = [], selection: string[] = []) => expectFail(handlers, text, scene, selection);
const ranked = (text: string, scene: MathObject[] = []) => {
  const s = new CommandScene(scene);
  return rankHandlers(parseClause(text, s.known()), s, handlers);
};
const slider = (objects: MathObject[], name: string) => {
  const found = byType(objects, 'slider').find(s => s.variableName === name);
  if (!found) throw new Error(`${name} kaydırıcısı yok`);
  return found;
};
const fnValue = (fn: FunctionObject, x: number, scope: Record<string, number> = {}) => compileMathExpression(fn.expression)!(x, scope);
const idOf = (objects: MathObject[], label: string) => byLabel(objects, label)!.id;

// ---------------------------------------------------------------------------
// Sahneler
// ---------------------------------------------------------------------------

/** A(0,0) B(4,0) C(0,3) D(2,5); ABC üçgeni, [AB], D merkezli c1; a=1, b=2, k=0; f(x)=x^2, g(x)=sin(x). */
const rich = () => build(s => {
  const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  const B = s.addPoint({ x: 4, y: 0 }, { label: 'B' });
  const C = s.addPoint({ x: 0, y: 3 }, { label: 'C' });
  const D = s.addPoint({ x: 2, y: 5 }, { label: 'D' });
  s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
  s.addSegment(A.id, B.id);
  s.addCircle({ centerId: D.id, radius: 2 }, { label: 'c1' });
  s.addSlider('a', { value: 1 });
  s.addSlider('b', { value: 2 });
  s.addSlider('k', { value: 0 });
  s.addFunction('x^2', { label: 'f(x) = x^2' });
  s.addFunction('sin(x)', { label: 'g(x) = sin(x)' });
});
/** y = x² üzerinde dört nokta. */
const fitScene = () => build(s => {
  s.addPoint({ x: -1, y: 1 }, { label: 'A' });
  s.addPoint({ x: 0, y: 0 }, { label: 'B' });
  s.addPoint({ x: 1, y: 1 }, { label: 'C' });
  s.addPoint({ x: 2, y: 4 }, { label: 'D' });
});
const slidersOnly = () => build(s => { s.addSlider('a', { value: 1 }); s.addSlider('b', { value: 2 }); s.addSlider('k', { value: 0 }); });
/** Kenarları ab=3, bc=4, ca=5 kaydırıcılarına bağlı ABC üçgeni (constructions ailesinin "kaydırıcıya bağla" çıktısıyla aynı yapı). */
const boundTriangle = () => build(s => {
  const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  const ids = (['ab', 'bc', 'ca'] as const).map((n, i) => s.addSlider(n, { label: n.toUpperCase(), min: 0.1, max: 10, step: 0.1, value: [3, 4, 5][i] }).id) as [string, string, string];
  const B = s.addPoint({ x: 3, y: 0 }, { label: 'B', construction: { kind: 'triangleVertex', anchorId: A.id, sliderIds: ids, vertex: 1, rotation: 0, orientation: 1 } });
  const C = s.addPoint({ x: 0, y: 3 }, { label: 'C', construction: { kind: 'triangleVertex', anchorId: A.id, sliderIds: ids, vertex: 2, rotation: 0, orientation: 1 } });
  s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
});

type Setup = { scene: () => MathObject[]; select?: (objects: MathObject[]) => string[] };
const empty: Setup = { scene: () => [] };
const inRich: Setup = { scene: rich };
const EXAMPLE_SCENES: Record<string, Setup> = {
  'f(x) = 2x + 1': empty, 'f(x) = x^2': empty, 'g(x)=sin(x) grafiğini çiz': empty, 'y = x^2 - 4 parabolünü çiz': empty, 'h(x) = |x-2|': empty,
  'y = a*x': empty, 'y = mx + n doğrusunu çiz': empty, 'f(x) = 0,5x² - 3 fonksiyonunu kırmızı çiz': empty, 'p(x) = sqrt(x) çizer misin': empty,
  'x kare fonksiyonunu çiz': empty, 'x küp grafiğini çiz': empty, 'karekök x fonksiyonunu çizer misin': empty, 'sinüs x grafiği': inRich,
  'x kare eksi 4 parabolünü çiz': empty, 'y eşittir 2x artı 1': empty, 'fonksiyon çiz': empty, 'yeni bir fonksiyon ekle': empty,
  'A, B, C noktalarına 2. dereceden polinom uydur': { scene: fitScene }, 'A, B ve C noktalarına ikinci dereceden polinom uydur': { scene: fitScene },
  'seçili noktalara doğrusal regresyon uygula': { scene: fitScene, select: o => byType(o, 'point').map(p => p.id) },
  'tüm noktalara 3. derece polinom uydur': { scene: fitScene }, 'ABCD noktalarından geçen kübik polinomu bul': { scene: fitScene },
  'ab = 4': { scene: boundTriangle }, 'a = 2': empty, 'k = 3,5': empty, 'b = -1 olsun': inRich, 't = pi/2': empty,
  "a'yı 3 yap": inRich, "a'nın değerini 2,5 olarak ayarla": inRich, 'a kaydırıcısının aralığını -10 ile 10 yap': inRich, "b'nin adımını 0,1 yap": inRich,
  "a'nın en büyük değerini 20 yap": inRich, "k'yı 2 artır": inRich, 'kaydırıcıyı 4 yap': { scene: slidersOnly, select: o => [slider(o, 'b').id] },
  'a kaç?': inRich, "a'nın değeri nedir": inRich, 'k parametresinin değerini söyle': inRich,
  "a'yı oynat": inRich, 'animasyonu başlat': inRich, 'animasyonu durdur': inRich, 'tüm kaydırıcıları oynat': inRich, 'kaydırıcıları durdur': empty,
  'a kaydırıcısı oluştur': empty, '0 ile 10 arasında adımı 0,5 olan b kaydırıcısı': empty, 'değeri 3 olan k parametresi': empty,
  'en küçük değeri -2, en büyük değeri 8 olan m sürgüsü ekle': inRich, 'a, b ve c kaydırıcılarını oluştur': empty, 'kaydırıcı ekle': inRich, '2 tane kaydırıcı ekle': empty,
  '"Merhaba" yazısı ekle': empty, '(2,3) noktasına "tepe" yaz': empty, 'A noktasının yanına "köşe" notu ekle': inRich, '"Alan = 12" yazısını büyük yaz': empty,
  '"Alan = 12" yazısını kırmızı yaz': empty, 'ABC üçgeninin içine "iç bölge" yaz': inRich, '"Soru 1" başlığını 24 punto yaz': empty,
  'Merhaba yazısı ekle': empty, 'yazı ekle': empty, 'not ekle': empty,
  '3/4 kesir modeli': empty, 'üç bölü dört kesrini göster': empty, "2/5'i şerit modeliyle göster": empty, '5/8 pasta modeli': empty, 'dörtte üç kesrini çiz': empty,
  '1 tam 1/2 kesir modeli ekle': empty,
  'ABC için onay kutusu ekle': inRich, 'c1 ve AB için onay kutusu': inRich, 'ABC üçgenini gösteren onay kutusu ekle': inRich,
  'seçili nesneler için onay kutusu oluştur': { scene: rich, select: o => [idOf(o, 'c1')] }, '"Çemberi göster" onay kutusu ekle': { scene: rich, select: o => [idOf(o, 'c1')] },
  'a kaydırıcısını oynatan düğme ekle': inRich, "c1'i gizleyen düğme ekle": inRich, "a'yı 0 yapan düğme": inRich, 'oynat düğmesi ekle': inRich,
  'ABC üçgenini gösteren buton ekle': inRich, 'gizle/göster düğmesi ekle': { scene: rich, select: o => [idOf(o, 'c1')] },
  'a için girdi kutusu ekle': inRich, 'f fonksiyonu için girdi kutusu': inRich, 'g(x) için giriş kutusu oluştur': inRich, 'a ve b için girdi kutuları ekle': inRich,
  'resim ekle': empty, 'görsel ekle': empty, 'fotoğraf yükle': empty, 'serbest çizim yap': empty, 'kalemle çiz': empty, 'elle çizmek istiyorum': empty,
  'fonksiyon oluştur': empty, 'bir grafik çiz': empty, 'fonksiyon tanımla': empty, 'fonksiyon eklemek istiyorum': empty,
  'A, B, C, D noktalarına en uygun parabolü uydur': { scene: fitScene }, 'm = 0,5': empty,
  'seçili noktaları doğrusal fonksiyona dönüştür': { scene: fitScene, select: o => byType(o, 'point').map(p => p.id) }, 'n = 2*a': inRich, 'c = -3': empty,
  'b kaç': inRich, 'a kaydırıcısının değeri ne': inRich, 'k nedir': inRich, 'oynat': inRich, 'kaydırıcıları canlandır': inRich, 'a ve b kaydırıcılarını oynat': inRich,
  'Soru yazısını koy': empty, 'Çözüm notu ekle': empty, 'metin ekle': empty, 'tüm çemberler için onay kutusu ekle': inRich,
  'b kaydırıcısı için girdi kutusu': inRich, 'seçili fonksiyon için girdi kutusu': { scene: rich, select: o => [idOf(o, 'f(x) = x^2')] },
  'tuvale bir resim koy': empty, 'görsel eklemek istiyorum': empty, 'resim yerleştir': empty, 'kalem ile çizim yap': empty, 'serbest elle çiz': empty, 'karalama yap': empty,
  'f(5) kaç': inRich, 'f(2) + g(1) hesapla': inRich, 'f(3) değerini bul': inRich, "f'nin 4'teki değeri nedir": inRich, 'x = 2 iken f kaç': inRich, '2^10 kaç': empty,
  'CanlandırmayıBaşlat[true]': inRich, 'StartAnimation[false]': inRich, 'CanlandırmayıBaşlat[A, true]': inRich, 'StartAnimation[a, false]': inRich,
  'A noktasının animasyonunu başlat': inRich, 'A noktasını canlandır': inRich,
  'DeğerAta[a, 5]': inRich, 'SetValue[a, 2]': inRich, 'DeğerAta[b, -1.5]': inRich, 'SetValue[k, 0]': inRich,
  'DeğerAta[a, 10]': inRich, 'SetValue[b, 4]': inRich,
  'İzBırak[A, true]': inRich, 'ShowTrace[A, true]': inRich, 'İzBırak[A, false]': inRich, 'İziGöster[A]': inRich,
  'İzleriTemizle[]': inRich, 'ClearTrace[]': inRich, 'izleri temizle': inRich, 'A noktasının izini aç': inRich,
};

describe('algebra examples', () => {
  const all = handlers.flatMap(h => h.examples.map(e => [h.id, e] as const));
  it('has 6–20 examples per user-facing handler and a scene for every example', () => {
    for (const h of handlers) {
      if (h.id === 'algebra.polyfit.prefix') continue;
      expect(h.examples.length, h.id).toBeGreaterThanOrEqual(6);
      expect(h.examples.length, h.id).toBeLessThanOrEqual(20);
    }
    expect(all.length).toBeGreaterThanOrEqual(60);
    for (const [, e] of all) expect(EXAMPLE_SCENES[e], e).toBeDefined();
  });
  it.each(all)('[%s] %s', (id, example) => {
    const setup = EXAMPLE_SCENES[example];
    const scene = setup.scene();
    const result = ok(example, scene, setup.select?.(scene) ?? []);
    expect(result.message.length).toBeGreaterThan(5);
    const s = new CommandScene(scene, setup.select?.(scene) ?? []);
    const best = rankHandlers(parseClause(example.split(/\s+2\.|\s+3\./)[0], s.known()), s, handlers)[0];
    if (!/\d\. derece/.test(example)) expect(best?.handler.id).toBe(id);
  });
});

// ---------------------------------------------------------------------------
// Fonksiyonlar
// ---------------------------------------------------------------------------

describe('function definitions', () => {
  it('creates a function exactly like the Function dialog', () => {
    const r = ok('f(x) = 2x + 1');
    const [fn] = byType(r.objects, 'function');
    expect(fn).toMatchObject({ expression: '2x + 1', label: 'f(x) = 2x + 1', color: '#2563eb', thickness: 2.5, visible: true, showLabel: true });
    expect(r.selectedIds).toEqual([fn.id]);
    expect(r.message).toContain('f(x) = 2x + 1');
    expect(fnValue(fn, 3)).toBeCloseTo(7, 9);
    expect(ranked('f(x) = x^2')[0].score).toBe(97);
  });

  it.each([
    ['g(x)=sin(x) grafiğini çiz', 'sin(x)', 'g(x) = sin(x)'],
    ['y = x^2 - 4 parabolünü çiz', 'x^2 - 4', 'y = x^2 - 4'],
    ['h(x) = |x-2|', '|x-2|', 'h(x) = |x-2|'],
    ['p(x) = sqrt(x) çizer misin', 'sqrt(x)', 'p(x) = sqrt(x)'],
    ['f(x) = x^2.', 'x^2', 'f(x) = x^2'],
    ["f(x)=x^2'yi çiz", 'x^2', 'f(x) = x^2'],
    ['y = 2x+1 doğrusunu çiz', '2x+1', 'y = 2x+1'],
    ['y = mx + n doğrusunu çiz', 'm*x + n', 'y = m*x + n'],
    ['f(x) = x kare artı 1', 'x^2 + 1', 'f(x) = x^2 + 1'],
    ['lütfen f(x) = 3x çiz', '3x', 'f(x) = 3x'],
    ['F(x) = 2X lütfen', '2X', 'F(x) = 2X'],
  ])('%s → %s', (text, expression, label) => {
    const [fn] = byType(ok(text).objects, 'function');
    expect(fn.expression).toBe(expression);
    expect(fn.label).toBe(label);
  });

  it('auto-creates sliders for parameters (legacy y = a*x) and reuses existing ones', () => {
    const r = ok('y = a*x');
    const a = slider(r.objects, 'a');
    expect(a).toMatchObject({ min: -5, max: 5, step: 0.1, value: 1, label: 'a Parametresi', color: '#8b5cf6' });
    expect(r.message).toContain('a için kaydırıcı');
    const again = ok('y = a*x^2', r.objects);
    expect(byType(again.objects, 'slider')).toHaveLength(1);
    expect(byType(again.objects, 'function')).toHaveLength(2);
    const lines = ok('y = mx + n doğrusunu çiz');
    expect(byType(lines.objects, 'slider').map(s => s.variableName).sort()).toEqual(['m', 'n']);
    expect(fnValue(byType(lines.objects, 'function')[0], 2, { m: 3, n: 1 })).toBeCloseTo(7, 9);
  });

  it('takes the colour from trailing words', () => {
    const [fn] = byType(ok('f(x) = 0,5x² - 3 fonksiyonunu kırmızı çiz').objects, 'function');
    expect(fn.color).toBe('#ef4444');
    expect(fnValue(fn, 2)).toBeCloseTo(-1, 9);
  });

  it('redefines a named function in place but always adds new y = … graphs', () => {
    const first = ok('f(x) = x^2');
    const fnId = byType(first.objects, 'function')[0].id;
    const second = ok('f(x) = x^3', first.objects);
    expect(byType(second.objects, 'function')).toHaveLength(1);
    expect(byType(second.objects, 'function')[0]).toMatchObject({ id: fnId, expression: 'x^3', label: 'f(x) = x^3' });
    expect(second.message).toContain('yeniden tanımlandı');
    const ys = ok('y = 2x', ok('y = x').objects);
    expect(byType(ys.objects, 'function')).toHaveLength(2);
  });

  it('handles several definitions and assignments in one command', () => {
    const r = ok('f(x) = x^2 ve g(x) = 2x');
    expect(byType(r.objects, 'function').map(f => f.label)).toEqual(['f(x) = x^2', 'g(x) = 2x']);
    const s = ok('a = 2, b = 3');
    expect([slider(s.objects, 'a').value, slider(s.objects, 'b').value]).toEqual([2, 3]);
  });

  it('fails with the parser message for invalid expressions', () => {
    expect(bad('f(x) = 2x +')).toContain('İfade eksik');
    expect(bad('f(x) = sinx')).toContain('Bilinmeyen ifade');
    expect(bad('g(x) = (x+1')).toContain('parantez');
  });

  it.each([
    ['x kare fonksiyonunu çiz', 'x^2'],
    ['x küp grafiğini çiz', 'x^3'],
    ['karekök x fonksiyonunu çizer misin', 'sqrt(x)'],
    ['sinüs x grafiği', 'sin(x)'],
    ['x kare eksi 4 parabolünü çiz', 'x^2 - 4'],
    ['y eşittir 2x artı 1', '2x + 1'],
    ["x'in karesi artı bir fonksiyonunu çiz", 'x^2 + 1'],
    ['iki üzeri x grafiğini çiz', '2 ^ x'],
    ['mutlak değer x grafiği', 'abs(x)'],
    ['1 bölü x fonksiyonu', '1 / x'],
    ['lütfen bana 2x + 3 fonksiyonunu çiz', '2x + 3'],
  ])('Turkish formula: %s → %s', (text, expression) => {
    const [fn] = byType(ok(text).objects, 'function');
    expect(fn.expression).toBe(expression);
    expect(compileMathExpression(fn.expression)).not.toBeNull();
  });

  it('names Turkish-formula functions like the dialog (f, g, h…)', () => {
    const r1 = ok('x kare fonksiyonunu çiz');
    const r2 = ok('x küp grafiğini mavi çiz', r1.objects);
    expect(byType(r2.objects, 'function').map(f => f.label)).toEqual(['f(x) = x^2', 'g(x) = x^3']);
    expect(byType(r2.objects, 'function')[1].color).toBe('#2563eb');
  });

  it('opens the function dialog when no expression is given', () => {
    const r = ok('fonksiyon çiz');
    expect(r.actions).toEqual([{ kind: 'openDialog', dialog: 'function' }]);
    expect(r.sceneChanged).toBe(false);
  });
});

describe('polynomial fit', () => {
  it('fits a parabola through A, B, C despite the "2." split and removes the helper message', () => {
    const r = ok('A, B, C noktalarına 2. dereceden polinom uydur', fitScene());
    const [fn] = byType(r.objects, 'function');
    expect(fn.color).toBe('#2563eb'); // fonksiyon rengi; seçim pembesiyle karışmaz
    expect(r.selectedIds).toEqual([fn.id]); // noktalar değil eğri seçili: Delete eğriyi siler
    expect(fn.thickness).toBe(2.5);
    expect(fn.label.startsWith('f(x) = ')).toBe(true);
    for (const x of [-3, 0.5, 5]) expect(fnValue(fn, x)).toBeCloseTo(x * x, 6);
    expect(r.message).toContain('2. derece polinom');
    expect(r.message).toContain('tam geçiyor');
    expect(r.message).not.toContain('seçildi');
  });
  it('supports ordinal words, selection, "tüm noktalar" and cubic', () => {
    const scene = fitScene();
    expect(fnValue(byType(ok('A, B ve C noktalarına ikinci dereceden polinom uydur', scene).objects, 'function')[0], 3)).toBeCloseTo(9, 6);
    const secili = ok('seçili noktalara doğrusal regresyon uygula', scene, byType(scene, 'point').map(p => p.id));
    const linear = byType(secili.objects, 'function')[0];
    expect(secili.selectedIds).toEqual([linear.id]); // seçim noktalardan uydurulan fonksiyona geçer
    expect(fnValue(linear, 0)).toBeCloseTo(1, 6);
    expect(fnValue(linear, 2)).toBeCloseTo(3, 6);
    const cubic = byType(ok('tüm noktalara 3. derece polinom uydur', scene).objects, 'function')[0];
    for (const p of byType(scene, 'point')) expect(fnValue(cubic, p.x)).toBeCloseTo(p.y, 6);
    expect(fnValue(byType(ok('ABCD noktalarından geçen kübik polinomu bul', scene).objects, 'function')[0], -1)).toBeCloseTo(1, 6);
  });
  it('line of best fit from "doğrusal fonksiyona dönüştür" wordings, without a false "tam geçiyor"', () => {
    const scene = build(s => { ([[0, 1], [1, 3], [2, 5], [3, 7.2]] as const).forEach(([x, y], i) => s.addPoint({ x, y }, { label: 'KLMN'[i] })); });
    const ids = byType(scene, 'point').map(p => p.id);
    for (const [text, selection] of [['seçili noktaları doğrusal fonksiyona dönüştür', ids], ['K, L, M, N noktalarından doğrusal fonksiyon oluştur', []]] as const) {
      const r = ok(text, scene, [...selection]);
      const fn = byType(r.objects, 'function')[0];
      expect(fnValue(fn, 0)).toBeCloseTo(0.96, 6);
      expect(fnValue(fn, 1)).toBeCloseTo(3.02, 6);
      expect(r.message).toContain('en uygun doğru');
      expect(r.message).not.toContain('tam geçiyor'); // R² = 0,9994 ama noktalar doğrunun dışında
    }
    // Noktalar anılmadan "doğrusal fonksiyon çiz" uydurma değildir (Fonksiyon penceresi açılır)
    expect(byType(ok('doğrusal fonksiyon çiz', scene).objects, 'function')).toHaveLength(0);
  });
  it('uses a default degree and says so; rejects too few points, unknown points and repeated x', () => {
    const r = ok('A, B noktalarına polinom uydur', fitScene());
    expect(r.message).toContain('Derece yazılmadığı için 1 alındı');
    expect(bad('A, B noktalarına 2. dereceden polinom uydur', fitScene())).toContain('en az 3 nokta');
    expect(bad('A, E, C noktalarına ikinci dereceden polinom uydur', fitScene())).toContain('E noktası bulunamadı');
    const same = build(s => { s.addPoint({ x: 1, y: 1 }, { label: 'P' }); s.addPoint({ x: 1, y: 2 }, { label: 'Q' }); s.addPoint({ x: 2, y: 3 }, { label: 'R' }); });
    expect(bad('P, Q, R noktalarına ikinci dereceden polinom uydur', same)).toContain('uydurulamadı');
    expect(bad('polinom uydur', fitScene())).toContain('noktaları');
  });
});

// ---------------------------------------------------------------------------
// Kaydırıcılar
// ---------------------------------------------------------------------------

describe('slider assignment', () => {
  it('creates a slider like assignSliderValue (symmetric range, step 0.1)', () => {
    const r = ok('a = 2');
    expect(slider(r.objects, 'a')).toMatchObject({ min: -5, max: 5, step: 0.1, value: 2, label: 'a Parametresi', visible: true });
    expect(slider(ok('k = 3,5').objects, 'k')).toMatchObject({ value: 3.5, min: -7, max: 7 });
    expect(slider(ok('b = -1 olsun').objects, 'b').value).toBe(-1);
    expect(slider(ok('t = pi/2').objects, 't').value).toBeCloseTo(Math.PI / 2, 6);
    expect(slider(ok('ç = 1').objects, 'ç').value).toBe(1);
  });
  it('assigns an existing slider, widening its range and selecting it', () => {
    const scene = slidersOnly();
    const r = ok('a = 8', scene);
    expect(slider(r.objects, 'a')).toMatchObject({ value: 8, min: -5, max: 8 });
    expect(r.objects).toHaveLength(scene.length);
    expect(r.selectedIds).toEqual([slider(scene, 'a').id]);
    expect(r.message).toContain('genişletildi');
    expect(slider(ok('a = b*2', scene).objects, 'a').value).toBe(4);
    const long = build(s => { s.addSlider('ab1', { value: 0 }); });
    expect(slider(ok('ab1 = 3', long).objects, 'ab1').value).toBe(3);
  });
  it('drives a slider-bound triangle (legacy ab = 4 / ab = 10) and keeps it live', () => {
    const scene = boundTriangle();
    const r = ok('ab = 4', scene);
    const [A, B, C] = ['A', 'B', 'C'].map(l => point(r.objects, l));
    expect(dist(A, B)).toBeCloseTo(4, 9);
    expect(dist(B, C)).toBeCloseTo(4, 9);
    expect(dist(C, A)).toBeCloseTo(5, 9);
    const moved = resolveCommandBindings(r.objects.map(o => o.id === A.id ? { ...o, x: 2, y: 1 } as MathObject : o));
    expect(point(moved, 'B').x).toBeCloseTo(6, 9);
    expect(point(moved, 'B').y).toBeCloseTo(1, 9);
    expect(dist(point(moved, 'C'), point(moved, 'A'))).toBeCloseTo(5, 9);
    expect(bad('ab = 10', r.objects)).toContain('üçgen');
    expect(bad("ab'yi 10 yap", r.objects)).toContain('üçgen');
    expect(dist(point(ok('AB = 3,5', scene).objects, 'A'), point(ok('AB = 3,5', scene).objects, 'B'))).toBeCloseTo(3.5, 9);
    expect(collectDependentIds(scene, [slider(scene, 'ab').id]).has(byType(scene, 'polygon')[0].id)).toBe(true);
  });
  it('rejects reserved and invalid names with a hint', () => {
    expect(bad('e = 5')).toContain('kaydırıcı adı olarak kullanılamaz');
    expect(bad('pi = 3')).toContain('kaydırıcı adı');
    expect(bad('alfa = 2')).toContain('1–2 karakter');
    expect(bad('a = x')).toContain('x içeremez');
    expect(bad('a = 2 +')).toContain('anlaşılamadı');
  });
  it.each(['x = 3', 'x = 3 doğrusunu çiz', 'A = (1;2)'])('does not claim %s', text => {
    expect(ranked(text)).toEqual([]);
  });
  it('leaves AB = 5 / ab = 5 to the edit family when AB is a segment and no slider exists', () => {
    const scene = build(s => { const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' }); const B = s.addPoint({ x: 3, y: 0 }, { label: 'B' }); s.addSegment(A.id, B.id); });
    expect(ranked('AB = 5', scene)).toEqual([]);
    expect(ranked('ab = 5', scene)).toEqual([]);
    expect(ranked('A = 5', scene)).toEqual([]);
    expect(slider(ok('a = 5', scene).objects, 'a').value).toBe(5);
  });
});

describe('slider creation', () => {
  it('uses Slider dialog defaults and says which were applied', () => {
    const r = ok('a kaydırıcısı oluştur');
    expect(slider(r.objects, 'a')).toMatchObject({ min: -5, max: 5, step: 0.5, value: 1, label: 'a Parametresi', color: '#8b5cf6', x: -8, y: 6, length: 4 });
    expect(r.message).toContain('varsayılan');
    expect(r.selectedIds).toEqual([slider(r.objects, 'a').id]);
    expect(ranked('a kaydırıcısı oluştur')[0].score).toBe(50);
  });
  it.each([
    ['0 ile 10 arasında adımı 0,5 olan b kaydırıcısı', 'b', { min: 0, max: 10, step: 0.5, value: 1 }],
    ['değeri 3 olan k parametresi', 'k', { min: -5, max: 5, value: 3 }],
    ['en küçük değeri -2, en büyük değeri 8 olan m sürgüsü ekle', 'm', { min: -2, max: 8 }],
    ["-5'ten 5'e kadar giden t kaydırıcısı oluştur", 't', { min: -5, max: 5 }],
    ['aralığı 0 ile 1 olan p parametresi tanımla', 'p', { min: 0, max: 1, step: 0.01 }],
    ['kaydırıcı a oluştur, adım 0,25', 'a', { step: 0.25 }],
    ['"r" adlı kaydırıcı ekle', 'r', { min: -5, max: 5 }],
    ['k parametresi 3 olsun', 'k', { value: 3 }],
    ['başlangıç değeri 2 olan 0 ile 5 arasında s sürgüsü', 's', { min: 0, max: 5, value: 2 }],
  ] as const)('%s', (text, name, expected) => {
    expect(slider(ok(text).objects, name)).toMatchObject(expected);
  });
  it('creates several sliders, numbered sliders and next free names', () => {
    expect(byType(ok('a, b ve c kaydırıcılarını oluştur').objects, 'slider').map(s => s.variableName)).toEqual(['a', 'b', 'c']);
    expect(byType(ok('2 tane kaydırıcı ekle').objects, 'slider').map(s => s.variableName)).toEqual(['a', 'b']);
    const next = ok('kaydırıcı ekle', slidersOnly());
    expect(byType(next.objects, 'slider').map(s => s.variableName)).toEqual(['a', 'b', 'k', 'c']);
    // Oluşturulan kaydırıcılar alt alta dizilir (widgetSpot).
    const sliders = byType(next.objects, 'slider');
    expect(sliders[3].y).toBeLessThan(sliders[2].y!);
  });
  it('does not edit another slider for "k parametresi 3 olsun" when k does not exist', () => {
    const scene = build(s => { s.addSlider('a', { value: 1 }); });
    const r = ok('k parametresi 3 olsun', scene);
    expect(slider(r.objects, 'a').value).toBe(1);
    expect(slider(r.objects, 'k').value).toBe(3);
  });
  it('clamps an out-of-range value and reports it', () => {
    const r = ok('değeri 20 olan 0 ile 10 arasında p kaydırıcısı', []);
    expect(slider(r.objects, 'p').value).toBe(10);
    expect(r.message).toContain('aralığın dışında');
  });
  it('rejects bad names, duplicates and invalid ranges', () => {
    expect(bad('hız kaydırıcısı oluştur')).toContain('kaydırıcı adı olamaz');
    expect(bad('"hız" adlı kaydırıcı ekle')).toContain('1–2 karakter');
    expect(bad('x kaydırıcısı oluştur')).toContain('kullanılamaz');
    expect(bad('a kaydırıcısı oluştur', slidersOnly())).toContain('zaten var');
    expect(bad('10 ile 0 arasında a kaydırıcısı')).toContain('küçük olmalı');
    expect(bad('adımı 0 olan a kaydırıcısı')).toContain('0’dan büyük');
  });
  it('follows up on the created slider in the same command', () => {
    const r = ok('a kaydırıcısı oluştur ve değeri 3 olsun');
    expect(slider(r.objects, 'a').value).toBe(3);
  });
});

describe('slider editing, queries and playback', () => {
  it.each([
    ["a'yı 3 yap", 'a', { value: 3 }],
    ["a'nın değerini 2,5 olarak ayarla", 'a', { value: 2.5 }],
    ['a kaydırıcısının aralığını -10 ile 10 yap', 'a', { min: -10, max: 10, value: 1 }],
    ["b'nin adımını 0,1 yap", 'b', { step: 0.1 }],
    ["a'nın en büyük değerini 20 yap", 'a', { max: 20, min: -5 }],
    ["a'nın en küçük değeri -3 olsun", 'a', { min: -3 }],
    ["k'yı 2 artır", 'k', { value: 2 }],
    ["b'yi 1 azalt", 'b', { value: 1 }],
    ['a parametresini 4 e ayarla', 'a', { value: 4 }],
    ["a'yı 12 yap", 'a', { value: 12, max: 12 }],
  ] as const)('%s', (text, name, expected) => {
    const scene = slidersOnly();
    const r = ok(text, scene);
    expect(slider(r.objects, name)).toMatchObject(expected);
    expect(r.selectedIds).toEqual([slider(scene, name).id]);
    expect(ranked(text, scene)[0].score).toBeGreaterThanOrEqual(85);
  });
  it('clamps the value when only the range changes', () => {
    const scene = build(s => { s.addSlider('a', { value: 3 }); });
    const r = ok('a kaydırıcısının aralığını 0 ile 2 yap', scene);
    expect(slider(r.objects, 'a')).toMatchObject({ min: 0, max: 2, value: 2 });
    expect(r.message).toContain('sığdırıldı');
  });
  it('uses the selected slider for "kaydırıcıyı 4 yap" and asks otherwise', () => {
    const scene = slidersOnly();
    expect(slider(ok('kaydırıcıyı 4 yap', scene, [slider(scene, 'b').id]).objects, 'b').value).toBe(4);
    expect(bad('kaydırıcıyı 4 yap', scene)).toContain('Hangi kaydırıcı');
    expect(bad('kaydırıcıyı 4 yap', [])).toContain('Önce bir kaydırıcı');
  });
  it('explains missing sliders and contradictory ranges', () => {
    expect(bad("q'yu 3 yap", slidersOnly())).toContain('q adlı kaydırıcı bulunamadı');
    expect(bad('a kaydırıcısının aralığını -10 ile 10 yap')).toContain('a kaydırıcısı oluştur');
    expect(bad('a kaydırıcısının aralığını 5 ile 1 yap', slidersOnly())).toContain('küçük olmalı');
  });
  it('answers value questions without changing the scene', () => {
    const r = ok('a kaç?', slidersOnly());
    expect(r.message).toContain('a = 1');
    expect(r.sceneChanged).toBe(false);
    expect(ok("b'nin değeri nedir", slidersOnly()).message).toContain('b = 2');
    expect(ranked('A noktasının koordinatları kaç', rich())).toEqual([]);
  });
  it('emits playback actions', () => {
    const scene = slidersOnly();
    const play = ok("a'yı oynat", scene);
    expect(play.actions).toEqual([{ kind: 'playback', mode: 'play' }]);
    expect(play.sceneChanged).toBe(false);
    expect(play.selectedIds).toEqual([slider(scene, 'a').id]);
    expect(play.message).toContain('birlikte hareket eder');
    expect(ok('animasyonu durdur', scene).actions).toEqual([{ kind: 'playback', mode: 'stop' }]);
    expect(ok('oynat', scene).actions).toEqual([{ kind: 'playback', mode: 'play' }]);
    expect(ok('tüm kaydırıcıları oynat', scene).actions[0]).toMatchObject({ mode: 'play' });
    expect(ok('oynat/durdur', scene).actions).toEqual([{ kind: 'playback', mode: 'toggle' }]);
    expect(ok('kaydırıcıları durdur', []).actions).toEqual([{ kind: 'playback', mode: 'stop' }]);
  });
  it('shows a hidden slider before playing and fails without sliders', () => {
    const hidden = build(s => { const a = s.addSlider('a'); s.update(a.id, { visible: false }); });
    const r = ok("a'yı oynat", hidden);
    expect(slider(r.objects, 'a').visible).toBe(true);
    expect(r.sceneChanged).toBe(true);
    expect(bad('animasyonu başlat')).toContain('kaydırıcı yok');
    expect(bad("q'yu oynat", slidersOnly())).toContain('q adlı kaydırıcı bulunamadı');
  });
});

// ---------------------------------------------------------------------------
// Yazı, kesir
// ---------------------------------------------------------------------------

describe('text notes', () => {
  it('adds a TextNoteDialog-compatible note', () => {
    const r = ok('"Merhaba" yazısı ekle');
    const [t] = byType(r.objects, 'text');
    expect(t).toMatchObject({ text: 'Merhaba', label: 'Merhaba', fontSize: 14, color: '#0f172a', x: 0, y: 0, visible: true });
    expect(r.message).toContain('“Merhaba”');
  });
  it('places notes at coordinates, beside points and inside shapes', () => {
    expect(byType(ok('(2,3) noktasına "tepe" yaz').objects, 'text')[0]).toMatchObject({ x: 2, y: 3, text: 'tepe' });
    const scene = build(s => { s.addPoint({ x: 1, y: 2 }, { label: 'A' }); });
    expect(byType(ok('A noktasının yanına "köşe" notu ekle', scene).objects, 'text')[0]).toMatchObject({ x: 1.3, y: 2.3 });
    expect(byType(ok('"köşe" yazısını a noktasının altına koy', scene).objects, 'text')[0].y).toBeCloseTo(1.2, 9);
    const inside = byType(ok('ABC üçgeninin içine "iç bölge" yaz', rich()).objects, 'text')[0];
    expect(inside.y).toBeCloseTo(1.5, 9);
    expect(inside.x).toBeGreaterThan(0);
    expect(inside.x).toBeLessThan(2);
  });
  it('reads size and colour outside the quotes and ignores formulas inside them', () => {
    const big = ok('"Alan = 12" yazısını büyük yaz');
    expect(byType(big.objects, 'text')[0]).toMatchObject({ text: 'Alan = 12', fontSize: 18 });
    expect(byType(big.objects, 'slider')).toHaveLength(0);
    expect(byType(ok('"Alan = 12" yazısını kırmızı yaz').objects, 'text')[0].color).toBe('#ef4444');
    expect(byType(ok('"Soru 1" başlığını 24 punto yaz').objects, 'text')[0].fontSize).toBe(24);
    const formula = ok('"Denklem: y = 2x" yaz');
    expect(byType(formula.objects, 'function')).toHaveLength(0);
    expect(byType(formula.objects, 'text')[0].text).toBe('Denklem: y = 2x');
    expect(byType(ok('"A ve B eşit değil" yazısı ekle').objects, 'text')[0].text).toBe('A ve B eşit değil');
  });
  it('accepts single quotes and prefers an uppercase point over a same-named slider', () => {
    expect(byType(ok("'Merhaba' yazısı ekle").objects, 'text')[0].text).toBe('Merhaba');
    const scene = rich();
    expect(byType(ok("A'nın yanına 'köşe' yaz", scene).objects, 'text')[0]).toMatchObject({ text: 'köşe', x: 0.3, y: 0.3 });
    expect(byType(ok('"köşe" yazısını A\'nın yanına koy', scene).objects, 'text')[0]).toMatchObject({ x: 0.3, y: 0.3 });
    expect(byType(ok('a için onay kutusu', scene).objects, 'checkbox')[0].targetIds).toEqual([slider(scene, 'a').id]);
    expect(byType(ok('A için onay kutusu', scene).objects, 'checkbox')[0].targetIds).toEqual([point(scene, 'A').id]);
  });

  it('stacks several quoted notes', () => {
    const texts = byType(ok('"x" ve "y" yazılarını ekle').objects, 'text');
    expect(texts.map(t => t.text)).toEqual(['x', 'y']);
    expect(texts[0].y - texts[1].y).toBeCloseTo(0.7, 9);
  });
  it('handles unquoted notes and falls back to the text tool', () => {
    expect(byType(ok('Merhaba dünya yazısı ekle').objects, 'text')[0].text).toBe('Merhaba dünya');
    const tool = ok('yazı ekle');
    expect(tool.actions).toEqual([{ kind: 'selectTool', tool: 'text' }]);
    expect(tool.sceneChanged).toBe(false);
  });
  it('fails for empty quotes and unknown anchors', () => {
    expect(bad('"" yazısı ekle')).toContain('Tırnak');
    expect(bad('Z noktasının yanına "köşe" yaz')).toContain('Z bulunamadı');
  });
});

describe('fraction models', () => {
  it.each([
    ['3/4 kesir modeli', 3, 4, 'pie'],
    ['üç bölü dört kesrini göster', 3, 4, 'pie'],
    ["2/5'i şerit modeliyle göster", 2, 5, 'bar'],
    ['5/8 pasta modeli', 5, 8, 'pie'],
    ['dörtte üç kesrini çiz', 3, 4, 'pie'],
    ["8'de 5 kesir modeli ekle", 5, 8, 'pie'],
    ['1 tam 1/2 kesir modeli ekle', 3, 2, 'pie'],
    ['payı 2 paydası 3 olan kesir modeli oluştur', 2, 3, 'pie'],
  ] as const)('%s → %i/%i %s', (text, numerator, denominator, modelType) => {
    const [f] = byType(ok(text).objects, 'fraction');
    expect(f).toMatchObject({ numerator, denominator, modelType, radius: 2.5, color: '#8b5cf6', label: `${numerator}/${denominator} Kesir Modeli` });
  });
  it('places the model at a coordinate or beside the drawing', () => {
    expect(byType(ok('(3, -2) noktasına 1/3 kesir modeli').objects, 'fraction')[0]).toMatchObject({ x: 3, y: -2 });
    expect(byType(ok('3/4 kesir modeli', rich()).objects, 'fraction')[0].x).toBeGreaterThan(4);
  });
  it('rejects out-of-range fractions and leaves fraction edits to the edit family', () => {
    expect(bad('31/4 kesir modeli')).toContain('Kesir');
    expect(bad('3/0 kesir modeli')).toContain('Kesir');
    const scene = build(s => { s.addFraction(1, 2, { x: 0, y: 0 }); });
    expect(ranked('kesri 2/3 yap', scene)).toEqual([]);
    expect(ranked('AB doğru parçasını 3/4 oranında böl')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Onay kutusu, düğme, girdi kutusu
// ---------------------------------------------------------------------------

describe('checkboxes', () => {
  it('creates a checkbox for named objects at the widget spot', () => {
    const scene = rich();
    const r = ok('ABC için onay kutusu ekle', scene);
    const [box] = byType(r.objects, 'checkbox');
    const poly = byType(scene, 'polygon')[0];
    expect(box).toMatchObject({ targetIds: [poly.id], checked: true, color: '#2563eb', label: '1 nesneyi göster', x: -8, y: 2.4 });
    expect(r.selectedIds).toEqual([box.id]);
    expect(collectDependentIds(r.objects, [poly.id]).has(box.id)).toBe(true);
  });
  it('resolves several names, points, types, selection and quoted labels', () => {
    const scene = rich();
    const c1 = idOf(scene, 'c1'), ab = byType(scene, 'segment')[0].id;
    expect(byType(ok('c1 ve AB için onay kutusu', scene).objects, 'checkbox')[0].targetIds).toEqual([c1, ab]);
    expect(byType(ok('A için onay kutusu', scene).objects, 'checkbox')[0].targetIds).toEqual([point(scene, 'A').id]);
    expect(byType(ok('tüm çemberler için onay kutusu ekle', scene).objects, 'checkbox')[0].targetIds).toEqual([c1]);
    expect(byType(ok('seçili nesneler için onay kutusu oluştur', scene, [c1]).objects, 'checkbox')[0].targetIds).toEqual([c1]);
    expect(byType(ok('"Çemberi göster" onay kutusu ekle', scene, [c1]).objects, 'checkbox')[0]).toMatchObject({ label: 'Çemberi göster', targetIds: [c1] });
  });
  it('works after a "gösterip gizleyen" split when the previous clause focuses the target', () => {
    const showStub: CommandHandler = {
      id: 'stub.show', examples: [],
      match: c => c.hasVerb('show') && !/kutu|dugme/.test(c.text) && c.labels.length ? 85 : 0,
      run: (c, s) => s.setFocus(s.resolveLabel(c.labels[0], ['polygon']).map(o => o.id)),
    };
    const scene = rich();
    const r = runWith([showStub, ...handlers], "ABC'yi gösterip gizleyen onay kutusu ekle", scene);
    if (!r.ok) throw new Error(r.message);
    expect((byType(r.objects, 'checkbox')[0] as CheckboxObject).targetIds).toEqual([byType(scene, 'polygon')[0].id]);
  });
  it('fails without targets and leaves checkbox edits to others', () => {
    expect(bad('onay kutusu ekle', rich())).toContain('onay kutusu');
    expect(bad('XYZ için onay kutusu', rich())).toContain('bulunamadı');
    expect(ranked('onay kutusunu sil', rich())).toEqual([]);
    expect(ranked('onay kutusunu gizle', rich())).toEqual([]);
  });
});

describe('buttons', () => {
  const scene = rich();
  const a = slider(scene, 'a');
  const button = (text: string, selection: string[] = []) => byType(ok(text, scene, selection).objects, 'button')[0] as ButtonObject;
  it('creates animate, toggle and setSlider buttons', () => {
    expect(button('a kaydırıcısını oynatan düğme ekle')).toMatchObject({ action: { kind: 'animate', sliderIds: [a.id] }, label: 'Oynat / Durdur', color: '#4f46e5' });
    expect(button("c1'i gizleyen düğme")).toMatchObject({ action: { kind: 'toggle', targetIds: [idOf(scene, 'c1')] }, label: 'Göster / Gizle' });
    expect(button("a'yı 0 yapan düğme")).toMatchObject({ action: { kind: 'setSlider', sliderId: a.id, value: 0 }, label: 'a = 0' });
    expect(button("b'yi 2,5'e getiren düğme")).toMatchObject({ action: { kind: 'setSlider', sliderId: slider(scene, 'b').id, value: 2.5 } });
    expect(button('oynat düğmesi ekle').action).toEqual({ kind: 'animate', sliderIds: byType(scene, 'slider').map(s => s.id) });
    expect(button('ABC üçgenini gösteren buton ekle').action).toEqual({ kind: 'toggle', targetIds: [byType(scene, 'polygon')[0].id] });
    expect(button('gizle/göster düğmesi ekle', [idOf(scene, 'c1')]).action).toEqual({ kind: 'toggle', targetIds: [idOf(scene, 'c1')] });
    expect(button('"Sıfırla" diye a\'yı 0 yapan düğme ekle').label).toBe('Sıfırla');
  });
  it('cascades with its slider and explains failures', () => {
    const r = ok("a'yı 0 yapan düğme", scene);
    expect(collectDependentIds(r.objects, [a.id]).has(byType(r.objects, 'button')[0].id)).toBe(true);
    expect(bad("q'yu 0 yapan düğme", scene)).toContain('q adlı kaydırıcı bulunamadı');
    expect(bad('oynat düğmesi ekle', [])).toContain('kaydırıcı yok');
    expect(ranked('düğmeyi sil', scene)).toEqual([]);
  });
});

describe('input boxes', () => {
  const scene = rich();
  it('binds to sliders and functions like the Input Box tool', () => {
    const [sliderBox] = byType(ok('a için girdi kutusu ekle', scene).objects, 'input_box') as InputBoxObject[];
    expect(sliderBox).toMatchObject({ targetId: slider(scene, 'a').id, field: 'value', label: 'a =', width: 90, color: '#0d9488' });
    const [fnBox] = byType(ok('f fonksiyonu için girdi kutusu', scene).objects, 'input_box');
    expect(fnBox).toMatchObject({ targetId: idOf(scene, 'f(x) = x^2'), field: 'expression', label: 'f(x) =', width: 170 });
    expect(byType(ok('g(x) için giriş kutusu oluştur', scene).objects, 'input_box')[0].targetId).toBe(idOf(scene, 'g(x) = sin(x)'));
    const two = byType(ok('a ve b için girdi kutuları ekle', scene).objects, 'input_box');
    expect(two.map(b => b.targetId)).toEqual([slider(scene, 'a').id, slider(scene, 'b').id]);
    expect(two[0].y).not.toBe(two[1].y);
  });
  it('uses the selection and fails on ambiguity or missing targets', () => {
    expect(byType(ok('girdi kutusu ekle', scene, [idOf(scene, 'f(x) = x^2')]).objects, 'input_box')[0].field).toBe('expression');
    expect(bad('girdi kutusu ekle', scene)).toContain('yazın');
    expect(bad('q için girdi kutusu', scene)).toContain('q adlı');
    expect(bad('f fonksiyonu için girdi kutusu', [])).toContain('f adlı fonksiyon');
    const single = build(s => { s.addSlider('t'); });
    expect(byType(ok('girdi kutusu ekle', single).objects, 'input_box')[0].label).toBe('t =');
  });
});

// ---------------------------------------------------------------------------
// Araç açma ve aile sınırları
// ---------------------------------------------------------------------------

describe('image and pen tools', () => {
  it.each([['resim ekle', 'image'], ['görsel ekle', 'image'], ['fotoğraf yükle', 'image'], ['serbest çizim yap', 'pen'], ['kalemle çiz', 'pen']] as const)('%s → %s', (text, tool) => {
    const r = ok(text);
    expect(r.actions).toEqual([{ kind: 'selectTool', tool }]);
    expect(r.sceneChanged).toBe(false);
    expect(ranked(text)[0].score).toBeLessThanOrEqual(15);
  });
});

describe('family boundaries', () => {
  const scene = [...rich(), ...build(s => { s.addFraction(1, 2, { x: 9, y: 9 }); })];
  it.each([
    'f fonksiyonunu sil', 'f fonksiyonunu kırmızı yap', 'kalem aracını seç', 'resim aracını seç', 'kalemi aç', 'A = (1;2)',
    'üçgen uzunluklarını kaydırıcıya bağla', 'kaydırıcı bağını kaldır', 'a kaydırıcısını sil', 'a kaydırıcısını kırmızı yap', 'kaydırıcıları gizle',
    'tüm yazıları büyüt', 'yazıları gizle', 'yazının rengini kırmızı yap', 'A noktasının adını "K" yap', '"Merhaba" yazısını sil',
    "ABC'nin alanını hesapla", 'üçgen çiz', 'kare çiz', 'AB orta noktasını oluştur', 'geri al', 'A noktasının açısını yaz', 'yarıçapı 3 olan çember çiz',
    'ABC üçgenini göster', 'c1 çemberini gizle', 'AB doğrusunu çiz', 'A noktasını (3;4) e taşı', 'tümünü sil',
  ])('does not match: %s', text => {
    expect(ranked(text, scene).map(r => r.handler.id)).toEqual([]);
  });
  it('keeps definitions in the formal band and the rest below edit verbs', () => {
    expect(ranked('y = 2x+1 doğrusunu çiz')[0].score).toBe(97);
    expect(ranked('ab = 4', boundTriangle())[0].score).toBe(97);
    expect(ranked('"Merhaba" yazısı ekle')[0].score).toBe(54);
    expect(ranked('3/4 kesir modeli')[0].score).toBe(52);
    expect(ranked('ABC için onay kutusu ekle', scene)[0].score).toBe(52);
  });
  it('never mutates the input scene and keeps ids unique across a long mixed command', () => {
    const base = rich();
    const before = JSON.stringify(base);
    const r = ok('m = 2 ve y = m*x doğrusunu çiz, sonra "eğim" yazısı ekle ve m için girdi kutusu ekle', base);
    expect(JSON.stringify(base)).toBe(before);
    const fn = byType(r.objects, 'function').find(f => f.expression === 'm*x')!;
    expect(fnValue(fn, 3, { m: slider(r.objects, 'm').value })).toBeCloseTo(6, 9);
    expect(byType(r.objects, 'input_box').some(b => b.targetId === slider(r.objects, 'm').id)).toBe(true);
    expect(byType(r.objects, 'slider').filter(s => s.variableName === 'm')).toHaveLength(1);
    expect((byType(r.objects, 'point') as PointObject[]).length).toBe(4);
    expect((r.objects.filter(o => o.type === 'slider') as SliderObject[]).length).toBe(4);
  });
});
