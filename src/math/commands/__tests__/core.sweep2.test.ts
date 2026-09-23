import { describe, expect, it } from 'vitest';
import type { MathObject, SliderObject } from '@/types/math';
import { runCommand } from '../engine';
import type { AppAction, CommandSuccess } from '../types';
import { byType, point } from './helpers';

/** Tüm ailelerle çalıştırır; başarılı olmalı. */
function ok(text: string, scene: MathObject[] = [], selection: string[] = []): CommandSuccess {
  const r = runCommand(text, scene, selection);
  if (!r.ok) throw new Error(`“${text}” başarısız: ${r.message}`);
  return r;
}
function fails(text: string, scene: MathObject[] = []): string {
  const r = runCommand(text, scene);
  if (r.ok) throw new Error(`“${text}” başarısız olmalıydı ama uygulandı: ${r.message}`);
  return r.message;
}
const setup = (text: string) => ok(text).objects;
const pointsAB = () => setup('A (0; 0) noktası\nB (4; 0) noktası');
const pointsABC = () => setup('A (0; 0) noktası\nB (4; 0) noktası\nC (0; 3) noktası');
const viewPatch = (actions: AppAction[]) => Object.assign({}, ...actions.flatMap(a => a.kind === 'viewport' ? [a.patch] : []));

describe('core sweep 2: settings phrased with a negated verb', () => {
  it.each([
    ['ızgara olmasın', { showGrid: false }],
    ['eksenler olmasın', { showAxes: false }],
    ['eksenleri görmek istemiyorum', { showAxes: false }],
    ['koordinatlar olmasın', { showCoordinates: false }],
  ])('%s', (text, patch) => {
    const r = ok(text);
    expect(r.actions).toEqual([{ kind: 'viewport', patch }]);
    expect(r.sceneChanged).toBe(false);
  });

  it('clears the selection for “hiçbir şey seçili olmasın”', () => {
    const scene = setup('ABC üçgeni çiz');
    const r = ok('hiçbir şey seçili olmasın', scene, [scene[0].id]);
    expect(r.selectedIds).toEqual([]);
    expect(r.sceneChanged).toBe(false);
  });

  it.each(['üçgen çizme', 'çember olmasın', 'üçgen istemiyorum', 'ızgarayı gizleme'])('still refuses the real negation “%s”', text => {
    expect(fails(text)).toContain('Olumsuz');
  });
  it('still refuses negations about named objects', () => {
    const scene = setup('ABC üçgeni çiz');
    expect(fails('A noktasını silme', scene)).toContain('Olumsuz');
    expect(fails('A noktasının koordinatları olmasın', scene)).toContain('Olumsuz');
    expect(fails("ABC'nin içini doldurma", scene)).toContain('Olumsuz');
  });
});

describe('core sweep 2: “geç” and “doldur” as verbs', () => {
  it('switches to the squared plane and draws point A', () => {
    const r = ok('kareli düzleme geç ve A noktası çiz');
    expect(r.actions[0]).toEqual({ kind: 'planeType', plane: 'kareli_duzlem' });
    expect(viewPatch(r.actions)).toMatchObject({ showGrid: true, showAxes: false });
    expect(point(r.objects, 'A')).toBeDefined();
  });
  it('opens the ellipse tool and places point A', () => {
    const r = ok('elips aracına geç ve A noktası koy');
    expect(r.actions).toEqual([{ kind: 'selectTool', tool: 'ellipse' }]);
    expect(byType(r.objects, 'point').map(p => p.label)).toEqual(['A']);
  });
  it.each(['kareli düzleme geçelim ve A noktası çiz', 'kareli düzleme geçer misin ve A noktası çiz'])('%s', text => {
    const r = ok(text);
    expect(r.actions[0]).toEqual({ kind: 'planeType', plane: 'kareli_duzlem' });
    expect(point(r.objects, 'A')).toBeDefined();
  });
  it.each(['üçgen çizip içini doldur', 'kare çiz ve içini doldur', 'kare çiz içini doldur'])('fills the new shape: %s', text => {
    const r = ok(text);
    const polygons = byType(r.objects, 'polygon');
    expect(polygons).toHaveLength(1);
    expect(polygons[0].fillOpacity).toBeCloseTo(0.35, 6);
  });
});

describe('core sweep 2: back-to-back commands and distribution', () => {
  it('hides the grid and zooms in for “ızgarayı gizle yakınlaştır”', () => {
    expect(ok('ızgarayı gizle yakınlaştır').actions).toEqual([{ kind: 'viewport', patch: { showGrid: false } }, { kind: 'zoom', factor: 1.2 }]);
  });
  it('creates two sliders for “a = 1 b = 2”', () => {
    const sliders = byType(ok('a = 1 b = 2').objects, 'slider') as SliderObject[];
    expect(sliders.map(s => [s.variableName, s.value])).toEqual([['a', 1], ['b', 2]]);
  });
  it('draws a line and a segment for “AB doğrusunu ve CD doğru parçasını çiz”', () => {
    const r = ok('AB doğrusunu ve CD doğru parçasını çiz');
    expect(byType(r.objects, 'line')).toHaveLength(1);
    expect(byType(r.objects, 'segment').map(s => s.label)).toEqual(['[CD]']);
  });
  it.each(['merkezi A noktası, yarıçapı 3 olan çember çiz', 'merkezi A noktası ve yarıçapı 3 olan çember çiz'])('keeps the role phrase with its circle: %s', text => {
    const scene = pointsABC();
    const r = ok(text, scene);
    const circles = byType(r.objects, 'circle');
    expect(circles).toHaveLength(1);
    expect(circles[0].centerPointId).toBe(point(scene, 'A').id);
    expect(byType(r.objects, 'point')).toHaveLength(3);
  });
});

describe('core sweep 2: measurement and compass', () => {
  it.each(['üçgenin alanını hesaplayıp göster', 'üçgenin alanını hesapla ve göster', 'üçgenin alanını hesapla göster'])('%s reports the area only once', text => {
    const r = ok(text, setup('ABC üçgeni çiz'));
    expect(r.message).toContain('A(ABC) ≈ 6,93 br²');
    expect(r.message).not.toContain('zaten görünür');
  });
  it('places the compass tip with “batır” and draws the arc around A', () => {
    const scene = pointsAB();
    const r = ok('Pergelin ucunu A noktasına batır ve 90 derecelik yay çiz', scene);
    expect(r.message).toContain('Pergelin ucu A noktasına kondu');
    expect(r.message).toContain('Merkezi A');
    expect(byType(r.objects, 'arc')).toHaveLength(1);
  });
});

describe('core sweep 2 repair: a negated setting followed by another command', () => {
  it.each([
    ['ızgara olmasın ve üçgen çiz', { showGrid: false }, 'polygon'],
    ['ızgarayı istemiyorum, kare çiz', { showGrid: false }, 'polygon'],
    ['eksenleri görmek istemiyorum ve bir çember çiz', { showAxes: false }, 'circle'],
    ['eksenler olmasın üçgen çiz', { showAxes: false }, 'polygon'],
    ['ızgara olmasın, a = 2', { showGrid: false }, 'slider'],
  ] as [string, object, MathObject['type']][])('%s runs both operations', (text, patch, type) => {
    const r = ok(text);
    expect(viewPatch(r.actions)).toEqual(patch);
    expect(byType(r.objects, type)).toHaveLength(1);
  });

  it.each(['seçili noktanın koordinatları olmasın', 'seçili noktanın koordinatlarını görmek istemiyorum', 'bu noktanın koordinatları olmasın'])(
    'refuses “%s” instead of measuring or hiding every coordinate', text => {
      const scene = setup('A (0; 0) noktası\nB (4; 0) noktası\nC (0; 3) noktası\nABC üçgeni çiz');
      const r = runCommand(text, scene, byType(scene, 'point').map(p => p.id));
      expect(r.ok).toBe(false);
      expect(r.message).toContain('Olumsuz');
    });

  it.each([
    ['ızgara çizgileri olmasın', { showGrid: false }],
    ['ızgarayı göstermek istemiyorum', { showGrid: false }],
    ['eksenlerin görünmesini istemiyorum', { showAxes: false }],
    ['şu anda ızgara olmasın', { showGrid: false }],
  ])('%s', (text, patch) => {
    expect(ok(text).actions).toEqual([{ kind: 'viewport', patch }]);
  });

  it.each(['hiçbir şekil seçili olmasın', 'hiçbir nokta seçili olmasın'])('%s clears the selection', text => {
    const scene = setup('ABC üçgeni çiz');
    expect(ok(text, scene, scene.map(o => o.id)).selectedIds).toEqual([]);
  });

  it('refuses the negated “geç” and “batır”, and fills with “içi doldurulsun”', () => {
    expect(fails('kareli düzleme geçme')).toContain('Olumsuz');
    expect(fails('pergeli A noktasına batırma', pointsAB())).toContain('Olumsuz');
    expect(fails('pergelin ucunu A noktasına batırmayın', pointsAB())).toContain('Olumsuz');
    expect(fails('f(x) = x^2 çizme')).toContain('Olumsuz');
    expect(byType(ok('kare çiz ve içi doldurulsun').objects, 'polygon')[0].fillOpacity).toBeCloseTo(0.35, 6);
  });
});

describe('core sweep 2 repair: “geçip” and “-den de geçsin” are relations', () => {
  it('draws one parallel line through A', () => {
    const r = ok('A noktasından geçip BC doğrusuna paralel olan doğruyu çiz', pointsABC());
    expect(r.message).toContain('A noktasından geçen ve BC doğrusuna paralel doğru');
    expect(byType(r.objects, 'line')).toHaveLength(1);
    expect(byType(ok('A noktasının üzerinden geçip BC ye paralel doğru çiz', pointsABC()).objects, 'line')).toHaveLength(1);
    expect(ok('A noktasından geçip x eksenine paralel doğru çiz', pointsABC()).message).toContain('A noktasından geçen yatay doğru');
  });
  it('keeps the point of a slope line and the second point of a line', () => {
    expect(ok('(1;2) noktasından geçip eğimi 3 olan doğruyu çiz').message).toContain('y = 3x - 1');
    const r = ok('A noktasından geçip B noktasına giden doğruyu çiz', pointsAB());
    expect(byType(r.objects, 'line')).toHaveLength(1);
    expect(byType(r.objects, 'point')).toHaveLength(2);
    expect(ok('B noktasından geçip AC doğrusuna dik olan doğruyu çiz', pointsABC()).message).not.toContain('zaten var');
  });
  it.each(['merkezi A olan bir çember çiz, B noktasından da geçsin', 'merkezi A olan çember çiz ve B noktasından da geçsin'])('%s', text => {
    const r = ok(text, pointsAB());
    expect(r.message).toContain('Merkezi A olan ve B noktasından geçen çember');
    expect(byType(r.objects, 'circle')).toHaveLength(1);
  });
});

describe('core sweep 2 repair: assignments that describe a shape', () => {
  it.each(['AB = 3 BC = 4 AC = 5 üçgen çiz', 'üçgen çiz AB = 3 BC = 4 AC = 5'])('%s draws the 3-4-5 triangle', text => {
    const r = ok(text);
    expect(r.message).toContain('|AB| = 3, |BC| = 4, |CA| = 5');
    expect(byType(r.objects, 'slider')).toHaveLength(0);
  });
  it('reads shape parameters written as assignments', () => {
    expect(ok('kenar = 4 açı = 60 eşkenar dörtgen çiz').message).toContain('kenar 4 br, açı 60°');
    const circle = ok('r = 3 merkez = (1;2) çember çiz');
    expect(circle.message).toContain('yarıçapı 3');
    expect(byType(circle.objects, 'slider')).toHaveLength(0);
    const rectangle = ok('en = 6 boy = 4 dikdörtgen çiz');
    expect(rectangle.message).toContain('6 × 4');
    expect(byType(rectangle.objects, 'slider')).toHaveLength(0);
  });
  it.each(['a = 3 b = 4 dikdörtgen çiz', 'a = 5 b = 3 kenarlı dikdörtgen çiz'])('%s asks what the numbers mean', text => {
    expect(fails(text)).toContain('Sayıların neyi gösterdiğini');
  });
  it('creates sliders for “a = 1 olsun b = 2 olsun”', () => {
    const sliders = byType(ok('a = 1 olsun b = 2 olsun').objects, 'slider') as SliderObject[];
    expect(sliders.map(s => [s.variableName, s.value])).toEqual([['a', 1], ['b', 2]]);
  });
});

describe('core sweep 2 repair: distribution, role phrases, trailing show and “lütfen”', () => {
  it('measures the angles of both triangles', () => {
    const scene = setup('A (0; 0) noktası\nB (4; 0) noktası\nC (0; 3) noktası\nABC üçgeni çiz\nD (6; 0) noktası\nE (10; 0) noktası\nF (6; 3) noktası\nDEF üçgeni çiz');
    const r = ok('ABC üçgeninin ve DEF üçgeninin açılarını ölç', scene);
    expect(r.message).toContain('ABC açıları');
    expect(r.message).toContain('DEF açıları');
    expect(byType(r.objects, 'angle')).toHaveLength(6);
  });
  it('keeps a parenthesised or locative centre with its circle', () => {
    const r = ok('merkezi (1; 2) noktası, yarıçapı 3 olan çember çiz');
    expect(r.message).toContain('Merkezi A (1; 2), yarıçapı 3');
    for (const text of ['merkezi A noktasında, yarıçapı 3 olan çember çiz', 'merkez A noktası, yarıçapı 3 olan çember çiz']) {
      const scene = pointsABC();
      const circles = byType(ok(text, scene).objects, 'circle');
      expect(circles).toHaveLength(1);
      expect(circles[0].centerPointId).toBe(point(scene, 'A').id);
    }
  });
  it.each(['üçgenin alanını hesaplayıp yaz', 'üçgenin alanını hesapla ve sonucu göster', 'üçgenin alanını hesapla ve tuvalde göster'])('%s reports the area', text => {
    expect(ok(text, setup('ABC üçgeni çiz')).message).toContain('A(ABC) ≈ 6,93 br²');
  });
  it('splits after “verb lütfen”', () => {
    expect(ok('yakınlaştır lütfen ızgarayı gizle').actions).toEqual([{ kind: 'zoom', factor: 1.2 }, { kind: 'viewport', patch: { showGrid: false } }]);
    expect(ok('ızgarayı gizle lütfen yakınlaştır').actions).toEqual([{ kind: 'viewport', patch: { showGrid: false } }, { kind: 'zoom', factor: 1.2 }]);
    const r = ok('kareli düzleme geç lütfen A noktası çiz');
    expect(r.actions[0]).toEqual({ kind: 'planeType', plane: 'kareli_duzlem' });
    expect(point(r.objects, 'A')).toBeDefined();
  });
});
