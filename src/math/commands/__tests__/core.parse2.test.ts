import { describe, expect, it } from 'vitest';
import type { FunctionObject, MathObject } from '@/types/math';
import { rankHandlers, runCommand } from '../engine';
import { CommandScene } from '../scene';
import { type KnownNames, parseClause } from '../text';
import type { CommandSuccess } from '../types';
import { build, byType, point } from './helpers';

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
const play = (...texts: string[]) => texts.reduce<MathObject[]>((scene, text) => ok(text, scene).objects, []);
const known = (points: string[], names: string[] = []): KnownNames => ({ points, names });
const knownOf = (scene: MathObject[]) => new CommandScene(scene).known();
const parse = (text: string, scene: MathObject[]) => parseClause(text, knownOf(scene));
const labels = (text: string, k: KnownNames) => parseClause(text, k).labels.map(l => l.text + (l.suffix ? `+${l.suffix}` : ''));
const fn = (objects: MathObject[], name: string) => byType(objects, 'function').find(f => f.label.startsWith(`${name}(x)`)) as FunctionObject | undefined;

const pointsAB = () => play('A (0; 0) noktası', 'B (4; 0) noktası');
const triangle = () => play('A (0; 0) noktası', 'B (4; 0) noktası', 'C (0; 3) noktası', 'ABC üçgeni çiz');
const functions = () => play('f(x) = x^2', 'g(x) = sin(x)');

describe('core parse 2: lowercase words are not split into point labels', () => {
  it('reads “batır” as the compass verb, not BA + tır', () => {
    const c = parseClause('Pergelin ucunu A noktasına batır', known(['A', 'B']));
    expect(c.labels.map(l => l.text)).toEqual(['A']);
    expect(c.text).toBe('pergelin ucunu $0 noktasina batir');
    expect(ok('Pergelin ucunu A noktasına batır', pointsAB()).message).toContain('Pergelin ucu A noktasına kondu');
  });

  it.each([
    ['bakın A noktası', ['A', 'B', 'K']],
    ['katır A noktası', ['A', 'K']],
    ['dahi A noktası', ['A', 'D', 'H']],
  ])('“%s”: a vowel- or t-initial ending cannot follow a letter name', (text, points) => {
    expect(labels(text, known(points))).toEqual(['A']);
  });

  it.each(['hemen', 'tamam', 'sadece', 'neden', 'dede', 'mesela'])('“%s” repeats a letter, so it is a word even when every letter is a point', word => {
    const points = ['A', 'B', 'C', 'D', 'E', 'H', 'K', 'L', 'M', 'N', 'S'];
    expect(labels(`${word} ABC üçgenini sil`, known(points))).toEqual(['ABC']);
  });

  it('still reads lowercase labels typed on purpose', () => {
    expect(labels('abnin uzunluğu', known(['A', 'B', 'N']))).toEqual(['AB+nin']);
    expect(labels('cden geçen doğru', known(['C', 'D', 'E']))).toEqual(['C+den']);
    expect(labels('abye paralel doğru', known(['A', 'B']))).toEqual(['AB+ye']);
    expect(labels('abc yi sil', known(['A', 'B', 'C']))).toEqual(['ABC+yi']);
    expect(labels('a noktasını sil', known([]))).toEqual(['A']);
    expect(labels('a yı 3 yap', known([], ['a']))).toEqual(['A+yi']);
  });
});

describe('core parse 2: “buçuk” after a digit', () => {
  it('adds a half to the number before it', () => {
    const c = parseClause('kenarları 2 buçuk 6 ve 6 buçuk olan üçgen');
    expect(c.numbers).toEqual([2.5, 6, 6.5]);
    expect(c.text).not.toContain('bucuk');
    expect(parseClause('-3 buçuk birim sola kaydır').numbers).toEqual([-3.5]);
    expect(parseClause('yarıçapı iki buçuk olan çember').numbers).toEqual([2.5]);
    expect(parseClause('kenarları 3, 4 ve 5 olan üçgen').numbers).toEqual([3, 4, 5]);
  });

  it.each(['kenarları 2 buçuk 6 ve 6 buçuk olan üçgen', 'kenarları 2 buçuk 6 ve 6 buçuk olan üçgen çiz'])('%s draws the triangle', text => {
    const r = ok(text);
    expect(byType(r.objects, 'polygon')).toHaveLength(1);
    expect(r.message).toContain('2,5');
    expect(r.message).toContain('6,5');
  });
});

describe('core parse 2: typed “eksi” in a bare coordinate pair', () => {
  it.each([
    ['ABC yi eksi 3 2 vektörüyle ötele', { x: -3, y: 2 }],
    ['ABC yi 3 eksi 2 vektörüyle ötele', { x: 3, y: -2 }],
    ['ABC yi eksi 3 eksi 2 vektörüyle ötele', { x: -3, y: -2 }],
    ['ABC yi 3 2 vektörüyle ötele', { x: 3, y: 2 }],
  ])('%s', (text, coord) => {
    const c = parse(text, triangle());
    expect(c.coords).toEqual([coord]);
    expect(c.text).not.toContain('eksi');
  });

  it('translates by the signed vector', () => {
    const r = ok('ABC yi eksi 3 2 vektörüyle ötele', triangle());
    expect(point(r.objects, "A'")).toMatchObject({ x: -3, y: 2 });
    expect(point(r.objects, "B'")).toMatchObject({ x: 1, y: 2 });
  });
});

describe('core parse 2: “x = 2, y = 3” is a point, not a function definition', () => {
  it.each(['x = 2, y = 3 olan nokta', 'x = 2, y = 3 olan A noktasını oluştur', 'A noktası x=2 y=3 olsun', 'x = -2 ve y = eksi 3 olan nokta'])('%s has no definition', text => {
    const c = parseClause(text, known(['A']));
    expect(c.definition).toBeUndefined();
    expect(c.assignment).toBeUndefined();
  });

  it('keeps real definitions', () => {
    expect(parseClause('y = 2x + 1 çiz').definition).toEqual({ name: 'y', body: '2x + 1 çiz' });
    expect(parseClause('f(x) = x^2').definition?.name).toBe('f');
    expect(parseClause('x = 2 için y = 3x olan doğru').definition?.name).toBe('y');
  });

  it('the point workaround still wins with score 98', () => {
    const scene = new CommandScene([]);
    expect(rankHandlers(parseClause('x = 2, y = 3 olan nokta', scene.known()), scene)[0].score).toBe(98);
  });

  it('creates or moves the point', () => {
    expect(point(ok('x = 2, y = 3 olan nokta').objects, 'A')).toMatchObject({ x: 2, y: 3 });
    expect(point(ok('x = 2, y = 3 olan K noktasını oluştur').objects, 'K')).toMatchObject({ x: 2, y: 3 });
    expect(point(ok('A noktası x=2 y=3 olsun', pointsAB()).objects, 'A')).toMatchObject({ x: 2, y: 3 });
    expect(point(ok('x = -2 ve y = eksi 3 olan nokta').objects, 'A')).toMatchObject({ x: -2, y: -3 });
    const withXY = play('X (1; 1) noktası', 'Y (1; 2) noktası');
    const r = ok('x = 2 y = 3 olan nokta', withXY);
    expect(byType(r.objects, 'point').find(p => p.x === 2 && p.y === 3)).toBeDefined();
    expect(point(r.objects, 'Y')).toMatchObject({ x: 1, y: 2 });
  });
});

describe('core parse 2: “seçtiğim” refers to the selection', () => {
  it.each(['seçtiğim noktaları birleştir', 'seçtiğin noktaları birleştir', 'seçtiğiniz noktaları birleştir', 'seçtiklerimi birleştir'])('%s', text => {
    const c = parseClause(text);
    expect(c.refersToSelection).toBe(true);
    expect(c.hasVerb('select')).toBe(false);
  });

  it('keeps the select verb and other selection words', () => {
    expect(parseClause('A noktasını seç').hasVerb('select')).toBe(true);
    expect(parseClause('tümünü seçer misin').hasVerb('select')).toBe(true);
    expect(parseClause('seçili noktayı sil').refersToSelection).toBe(true);
    expect(parseClause('A noktasını sil').refersToSelection).toBe(false);
  });

  it('joins the selected points', () => {
    const scene = play('A (0; 0) noktası', 'B (4; 0) noktası', 'C (0; 3) noktası');
    const r = ok('seçtiğim noktaları birleştir', scene, [point(scene, 'A').id, point(scene, 'C').id]);
    const segment = byType(r.objects, 'segment')[0];
    expect(new Set([segment.startPointId, segment.endPointId])).toEqual(new Set([point(scene, 'A').id, point(scene, 'C').id]));
  });
});

describe('core parse 2: function names are known names', () => {
  it('lists function names taken from labels', () => {
    const names = knownOf(functions()).names;
    expect(names).toContain('f');
    expect(names).toContain('g');
    expect(knownOf(play('y = 2x + 1')).names).not.toContain('y');
    expect(parse('g nin grafiğini gizle', functions()).labels).toEqual([{ text: 'G', suffix: 'nin', lowercase: true }]);
  });

  it('resolves a lowercase function name, but an uppercase name to the point of that name', () => {
    const scene = new CommandScene(play('f(x) = x^2', 'F (1; 1) noktası'));
    expect(scene.resolveLabel({ text: 'F', suffix: '', lowercase: true }).map(o => o.type)).toEqual(['function']);
    expect(scene.resolveLabel({ text: 'F', suffix: '' }).map(o => o.type)).toEqual(['point']);
    expect(new CommandScene(functions()).resolveLabel('g').map(o => o.label)).toEqual(['g(x) = sin(x)']);
  });

  it('deletes, hides, colours and shifts by name', () => {
    const deleted = ok('f yi sil', functions()).objects;
    expect(fn(deleted, 'f')).toBeUndefined();
    expect(fn(deleted, 'g')).toBeDefined();
    expect(fn(ok('g nin grafiğini gizle', functions()).objects, 'g')!.visible).toBe(false);
    expect(fn(ok('f fonksiyonunu kırmızı yap', functions()).objects, 'f')!.color).toBe('#ef4444');
    expect(fn(ok('f yi 2 birim sağa ötele', functions()).objects, 'f')!.label).toBe('f(x) = (x - 2)^2');
    expect(fn(ok('f fonksiyonunu 2 birim sağa ötele', functions()).objects, 'f')!.label).toBe('f(x) = (x - 2)^2');
    expect(fn(ok('f yi 2 birim yukarı kaydır', functions()).objects, 'g')!.label).toBe('g(x) = sin(x)');
  });

  it('asks for a direction when “f yi 2 birim ötele” has none, like any shape', () => {
    expect(fails('f yi 2 birim ötele', functions())).toContain('yön');
    expect(fails('ABC yi 2 birim ötele', triangle())).toContain('vektör');
  });

  it('shapes are still translated by the transform family', () => {
    const r = ok("ABC'yi 2 birim sağa ötele", play('f(x) = x^2', 'A (0; 0) noktası', 'B (4; 0) noktası', 'C (0; 3) noktası', 'ABC üçgeni çiz'));
    expect(point(r.objects, "A'")).toMatchObject({ x: 2, y: 0 });
  });

  it('an uppercase point of the same name keeps its meaning', () => {
    const scene = play('f(x) = x^2', 'F (1; 1) noktası');
    const r = ok('F noktasını sil', scene);
    expect(byType(r.objects, 'point')).toHaveLength(0);
    expect(fn(r.objects, 'f')).toBeDefined();
  });
});

describe('core parse 2: a detached ending after a coordinate is not a label', () => {
  const world = () => build(s => {
    const o = s.addPoint({ x: -6, y: 0 }, { label: 'O' });
    s.addPoint({ x: 0, y: 0 }, { label: 'A' });
    s.addCircle({ centerId: o.id, radius: 2 }, { label: 'c1' });
    s.addSlider('a');
  });

  it('“c1 in merkezini (0,0) a taşı” with a slider a', () => {
    const c = parse('c1 in merkezini (0,0) a taşı', world());
    expect(c.labels.map(l => l.text)).toEqual(['C1']);
    expect(c.text).toBe('$0in merkezini @0 a tasi');
    expect(point(ok('c1 in merkezini (0,0) a taşı', world()).objects, 'O')).toMatchObject({ x: 0, y: 0 });
  });

  it('“(2;3) e yansıt” with a point E', () => {
    const scene = play('E (5; 5) noktası', 'A (1; 1) noktası');
    const c = parse('(2;3) e yansıt', scene);
    expect(c.labels).toEqual([]);
    expect(c.text).toBe('@0 e yansit');
    expect(point(ok('A yı (2;3) e göre yansıt', scene).objects, "A'")).toMatchObject({ x: 3, y: 5 });
    expect(point(ok('A noktasını (2; 3) e taşı', scene).objects, 'A')).toMatchObject({ x: 2, y: 3 });
  });

  it('a point name after a coordinate is still a label', () => {
    expect(parseClause('(2,3) a noktasını oluştur').labels.map(l => l.text)).toEqual(['A']);
    expect(point(ok('(2,3) a noktasını oluştur').objects, 'A')).toMatchObject({ x: 2, y: 3 });
  });
});

describe('core parse 2: translation by a vector named with two points', () => {
  it("ABC'yi DE vektörü boyunca ötele", () => {
    const scene = play('A (0; 0) noktası', 'B (4; 0) noktası', 'C (0; 3) noktası', 'ABC üçgeni çiz', 'D (1; 1) noktası', 'E (3; 2) noktası');
    const c = parse("ABC'yi DE vektörü boyunca ötele", scene);
    expect(c.labels.map(l => l.text)).toEqual(['ABC', 'DE']);
    const r = ok("ABC'yi DE vektörü boyunca ötele", scene);
    expect(r.message).toContain('DE vektörü');
    expect(point(r.objects, "A'")).toMatchObject({ x: 2, y: 1 });
    expect(point(r.objects, "B'")).toMatchObject({ x: 6, y: 1 });
    expect(point(r.objects, "C'")).toMatchObject({ x: 2, y: 4 });
    expect(point(r.objects, 'D')).toMatchObject({ x: 1, y: 1 });
  });
});

describe('core parse 2 repair: ordinary words next to point letters', () => {
  const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P'];
  it.each([
    ['A noktasını merkez kabul eden 3 yarıçaplı çember çiz', ['A', 'B', 'E'], ['A']],
    ['AB yi çap kabul eden çember çiz', ['A', 'B', 'E'], ['AB+yi']],
    ['bak A noktasını sil', ['A', 'B', 'K'], ['A']],
    ['elde edilen A noktasını sil', ['A', 'B', 'E', 'L', 'D'], ['A']],
    ['A yı ele al ve sil', ['A', 'E', 'L'], ['A+yi']],
    ['ben A noktasını silmek istiyorum', ['A', 'B', 'E', 'N'], ['A']],
    ['bende A noktası var onu sil', ['A', 'B', 'E', 'N', 'D'], ['A']],
    ['şu anda A noktasını sil', ['A', 'N', 'D'], ['A']],
    ['hangi nokta A noktasına en yakın', many, ['A']],
    ['benim çizdiğim ABC üçgenini sil', many, ['ABC']],
    ['kendi ABC üçgenini kırmızı yap', many, ['ABC']],
    ['belki ABC yi kırmızı yaparsın', many, ['ABC+yi']],
  ])('“%s” keeps the word a word', (text, points, expected) => {
    expect(labels(text, known(points))).toEqual(expected);
  });

  it.each([
    ['cden geçen doğru', many, ['C+den']],
    ['abı sil', ['A', 'B', 'C'], ['AB+i']],
    ['abu sil', ['A', 'B', 'C'], ['AB+u']],
    ['acnin uzunluğu kaç', ['A', 'B', 'C'], ['AC+nin']],
    ['acye paralel doğru çiz', ['A', 'B', 'C'], ['AC+ye']],
    ['abcden geçen doğru', ['A', 'B', 'C', 'D'], ['ABC+den']],
    ['def yi sil', ['D', 'E', 'F'], ['DEF+yi']],
    ['def üçgenini sil', ['D', 'E', 'F'], ['DEF']],
    ['abc sil', ['A', 'B', 'C'], ['ABC']],
  ])('“%s” is still a lowercase label', (text, points, expected) => {
    expect(labels(text, known(points))).toEqual(expected);
  });

  it('runs the circle, move and delete commands with those words', () => {
    const abe = () => play('A (0; 0) noktası', 'B (4; 0) noktası', 'E (5; 5) noktası');
    expect(ok('A noktasını merkez kabul eden 3 yarıçaplı çember çiz', abe()).message).toContain('Merkezi A, yarıçapı 3');
    expect(ok('AB yi çap kabul eden çember çiz', abe()).message).toContain('Çapı [AB] olan çember');
    expect(ok('A yı merkez kabul eden ve B den geçen çember çiz', abe()).message).toContain('Merkezi A olan ve B noktasından geçen');
    const deleted = ok('A yı ele al ve sil', play('A (0; 0) noktası', 'E (5; 5) noktası')).objects;
    expect(byType(deleted, 'point').map(p => p.label)).toEqual(['E']);
    expect(point(ok('bak şimdi A yı B ye taşı', play('A (0; 0) noktası', 'B (4; 0) noktası', 'K (5; 5) noktası')).objects, 'A')).toMatchObject({ x: 4, y: 0 });
    expect(byType(ok('abı sil', play('A (0; 0) noktası', 'B (4; 0) noktası', 'C (0; 3) noktası', '[AB] doğru parçası çiz')).objects, 'segment')).toHaveLength(0);
    expect(ok('acnin uzunluğu kaç', triangle()).message).toContain('|CA| = 3');
  });
});

describe('core parse 2 repair: “seçtiğim” in measurements and circles', () => {
  const select = (scene: MathObject[], type: MathObject['type']) => scene.filter(o => o.type === type).map(o => o.id);
  it('measures the selected objects', () => {
    const pts = play('A (0; 0) noktası', 'B (4; 0) noktası', 'C (0; 3) noktası');
    expect(ok('seçtiğim noktalar arasındaki mesafeyi ölç', pts, [point(pts, 'A').id, point(pts, 'C').id]).message).toContain('|AC| = 3');
    const tri = triangle();
    expect(ok('seçtiğim üçgenin alanını hesapla', tri, select(tri, 'polygon')).message).toContain('A(ABC) = 6');
    expect(ok('seçtiğim üçgenin çevresini hesapla', tri, select(tri, 'polygon')).message).toContain('Ç(ABC) = 12');
    expect(ok('seçtiğim üçgenin alanı kaç', tri, select(tri, 'polygon')).message).toContain('A(ABC) = 6');
    const segment = play('A (0; 0) noktası', 'B (4; 0) noktası', '[AB] doğru parçası çiz');
    expect(ok('seçtiğim doğru parçasının uzunluğunu ölç', segment, select(segment, 'segment')).message).toContain('|AB| = 4');
    const angle = play('A (0; 0) noktası', 'B (4; 0) noktası', 'C (0; 3) noktası', 'ABC açısını çiz');
    expect(ok('seçtiğim açıyı ölç', angle, select(angle, 'angle')).message).toContain('∠ABC');
  });

  it.each(['seçtiğim noktalardan geçen çember çiz', 'seçtiğin noktalardan geçen çember çiz'])('%s uses the selected points', text => {
    const scene = play('A (0; 0) noktası', 'B (4; 0) noktası', 'C (0; 3) noktası', 'D (7; 7) noktası');
    const r = ok(text, scene, ['A', 'B', 'C'].map(l => point(scene, l).id));
    expect(r.message).toContain('A, B ve C noktalarından geçen çember');
    expect(byType(r.objects, 'point')).toHaveLength(4);
  });
});

describe('core parse 2 repair: functions among transform targets', () => {
  it('refuses to reflect a function with its own name', () => {
    const message = fails('f yi x eksenine göre yansıt', functions());
    expect(message).toContain('f bir fonksiyon');
    expect(message).not.toContain('F dönüştürülebilen');
  });

  it('translates the point and shifts the function in one sentence', () => {
    const scene = play('f(x) = x^2', 'g(x) = sin(x)', 'A (0; 0) noktası', 'B (4; 0) noktası', 'C (0; 3) noktası', 'ABC üçgeni çiz');
    const r = ok('A noktasını ve f yi 2 birim sağa ötele', scene);
    expect(point(r.objects, "A'")).toMatchObject({ x: 2, y: 0 });
    expect(point(r.objects, 'A')).toMatchObject({ x: 0, y: 0 });
    expect(fn(r.objects, 'f')!.label).toBe('f(x) = (x - 2)^2');
    const moved = ok('A noktasını ve f yi 2 birim sağa kaydır', play('f(x) = x^2', 'A (0; 0) noktası')).objects;
    expect(point(moved, 'A')).toMatchObject({ x: 2, y: 0 });
    expect(fn(moved, 'f')!.label).toBe('f(x) = (x - 2)^2');
  });

  it('shifts a function by a vector named with two points', () => {
    const r = ok('f yi AB vektörü kadar ötele', play('f(x) = x^2', 'A (0; 0) noktası', 'B (4; 0) noktası'));
    expect(fn(r.objects, 'f')!.label).toBe('f(x) = (x - 4)^2');
  });
});

describe('core parse 2 repair: an accusative after a coordinate before “merkez”', () => {
  const iau = () => play('I (5; 5) noktası', 'A (1; 1) noktası', 'U (6; 6) noktası');
  it.each([
    ['A yı (0,0) ı merkez alarak 90 derece döndür', { x: -1, y: 1 }],
    ['A yı (2,3) ü merkez alarak 90 derece döndür', { x: 4, y: 2 }],
    ["A yı (0,0)'ı merkez alarak 90 derece döndür", { x: -1, y: 1 }],
    ['A yı (1,2) yi merkez alarak 90 derece döndür', { x: 2, y: 2 }],
  ])('%s rotates about the coordinate, not about point I or U', (text, image) => {
    expect(parse(text, iau()).labels.map(l => l.text)).toEqual(['A']);
    expect(point(ok(text, iau()).objects, "A'")).toMatchObject(image);
  });

  it('draws a circle about “(0,0) ı merkez kabul eden”, and keeps “(2,3) a merkezli” as a name', () => {
    const scene = play('E (5; 5) noktası', 'A (1; 1) noktası');
    const circles = byType(ok('(0,0) ı merkez kabul eden 3 yarıçaplı çember çiz', scene).objects, 'circle');
    expect(circles).toHaveLength(1);
    expect(parseClause('(2,3) a merkezli 3 yarıçaplı çember çiz').labels.map(l => l.text)).toEqual(['A']);
  });
});

describe('core parse 2 repair: x and y values of a point', () => {
  it.each([
    ['A noktası x=2, y=3 olsun', 'A', { x: 2, y: 3 }],
    ['A noktası x = 2 ve y = 3 olsun', 'A', { x: 2, y: 3 }],
    ['B noktası x = -1, y = 2,5 olsun', 'B', { x: -1, y: 2.5 }],
    ['A noktasını x = 2, y = 3 yap', 'A', { x: 2, y: 3 }],
    ['A noktasını x = 2 y = 3 yap', 'A', { x: 2, y: 3 }],
    ["A'yı x = 2 y = 3 konumuna taşı", 'A', { x: 2, y: 3 }],
    ['A yı x = 2 y = 3 noktasına taşı', 'A', { x: 2, y: 3 }],
  ])('%s moves the point', (text, label, at) => {
    const r = ok(text, pointsAB());
    expect(point(r.objects, label)).toMatchObject(at);
    expect(byType(r.objects, 'point')).toHaveLength(2);
  });

  it.each([
    ['y = 3, x = 2 olan nokta', { x: 2, y: 3 }],
    ['x = 2; y = 3 olan nokta', { x: 2, y: 3 }],
    ['x = 2 buçuk, y = 3 olan nokta', { x: 2.5, y: 3 }],
  ])('%s creates the point', (text, at) => {
    expect(parseClause(text).definition).toBeUndefined();
    expect(point(ok(text).objects, 'A')).toMatchObject(at);
  });

  it('keeps definitions that are not coordinate pairs', () => {
    expect(parseClause('y = 3x + 1').definition).toEqual({ name: 'y', body: '3x + 1' });
    expect(parseClause('y = 3, x = 2').definition?.name).toBe('y');
  });
});

describe('core parse 2 repair: “buçuk” and “eksi” in values and coordinates', () => {
  it('reads halves in an assignment and inside parentheses', () => {
    expect(byType(ok('a = 2 buçuk').objects, 'slider')[0]).toMatchObject({ variableName: 'a', value: 2.5 });
    expect(parseClause('(2 buçuk; 3 buçuk) noktası').coords).toEqual([{ x: 2.5, y: 3.5 }]);
    expect(point(ok('(2 buçuk; 3 buçuk) noktası').objects, 'A')).toMatchObject({ x: 2.5, y: 3.5 });
  });

  it('reads a typed “eksi” inside parentheses and before “kadar”', () => {
    expect(parse('ABC yi (eksi 3, 2) vektörüyle ötele', triangle()).coords).toEqual([{ x: -3, y: 2 }]);
    expect(parse('ABC yi eksi 3 eksi 2 kadar ötele', triangle()).coords).toEqual([{ x: -3, y: -2 }]);
    expect(point(ok('ABC yi (eksi 3, 2) vektörüyle ötele', triangle()).objects, "A'")).toMatchObject({ x: -3, y: 2 });
    expect(point(ok('ABC yi eksi 3 eksi 2 kadar ötele', triangle()).objects, "A'")).toMatchObject({ x: -3, y: -2 });
    const unsigned = parseClause('ABC yi 3 2 kadar büyüt');
    expect(unsigned.coords).toEqual([]);
    expect(unsigned.numbers).toEqual([3, 2]);
  });
});
