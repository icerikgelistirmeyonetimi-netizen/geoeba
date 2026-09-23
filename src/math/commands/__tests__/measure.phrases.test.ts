import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import { runCommand } from '../engine';
import { CommandScene } from '../scene';
import { normalizeSpokenCommand } from '../speechText';
import type { CommandSuccess } from '../types';

/**
 * Ölçme ailesi: yazılı ve konuşma biçimindeki öğretmen/öğrenci cümleleri TÜM komut aileleriyle (varsayılan HANDLERS) sınanır.
 * measure.test.ts aileyi yalıtılmış sınar; burada aileler arası çakışmalar da yakalanır.
 */

const build = (fn: (s: CommandScene) => void): MathObject[] => { const s = new CommandScene([]); fn(s); s.resolve(); return s.objects; };
const commands = (...texts: string[]): MathObject[] => {
  let objects: MathObject[] = [];
  for (const t of texts) { const r = runCommand(t, objects); if (!r.ok) throw new Error(`${t}: ${r.message}`); objects = r.objects; }
  return objects;
};

/** A(0,0), B(4,0), C(0,3): |AB| = 4, |BC| = 5, |CA| = 3, alan 6, çevre 12, ∠A = 90°. */
const SCENES = {
  empty: (): MathObject[] => [],
  tri: () => build(s => {
    const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' }), B = s.addPoint({ x: 4, y: 0 }, { label: 'B' }), C = s.addPoint({ x: 0, y: 3 }, { label: 'C' });
    s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
  }),
  two: () => build(s => {
    const [A, B, C, D, E, F] = ([[0, 0], [4, 0], [0, 3], [10, 0], [13, 0], [10, 4]] as const).map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABCDEF'[i] }));
    s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
    s.addPolygon([D.id, E.id, F.id], { kind: 'triangle' });
  }),
  /** [AB], A(0,0), B(3,4): |AB| = 5 */
  seg: () => build(s => { const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' }), B = s.addPoint({ x: 3, y: 4 }, { label: 'B' }); s.addSegment(A.id, B.id, { showLength: false }); }),
  /** AB doğrusu, A(0,1), B(2,5): y = 2x + 1 */
  line: () => build(s => { const A = s.addPoint({ x: 0, y: 1 }, { label: 'A' }), B = s.addPoint({ x: 2, y: 5 }, { label: 'B' }); s.addLine(A.id, B.id, { showEquation: false }); }),
  fn: () => commands('y = 2x + 1'),
  parabola: () => commands('f(x) = x^2'),
  circle: () => build(s => { const M = s.addPoint({ x: 1, y: -2 }, { label: 'M' }); s.addCircle({ centerId: M.id, radius: 3 }, { label: 'c1' }); }),
  arc: () => build(s => { const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' }), S = s.addPoint({ x: 2, y: 0 }, { label: 'S' }), D = s.addPoint({ x: 0, y: 2 }, { label: 'D' }); s.addArc(M.id, S.id, D.id); }),
  sector: () => build(s => { const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' }), S = s.addPoint({ x: 2, y: 0 }, { label: 'S' }), D = s.addPoint({ x: 0, y: 2 }, { label: 'D' }); s.addSector(M.id, S.id, D.id); }),
  ellipse: () => build(s => { const E = s.addPoint({ x: 0, y: 0 }, { label: 'E' }); s.addEllipse(E.id, 3, 2); }),
  /** ABCD karesi, kenar 2, köşegen 2√2 */
  square: () => build(s => {
    const p = ([[0, 0], [2, 0], [2, 2], [0, 2]] as const).map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABCD'[i] }));
    s.addPolygon(p.map(q => q.id), { kind: 'square' });
  }),
  pts: () => build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A' }); s.addPoint({ x: 4, y: 0 }, { label: 'B' }); s.addPoint({ x: 4, y: 3 }, { label: 'C' }); }),
  /** [AB] = 5, [CD] = 2 */
  twoSeg: () => build(s => {
    const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' }), B = s.addPoint({ x: 3, y: 4 }, { label: 'B' });
    const C = s.addPoint({ x: 5, y: 0 }, { label: 'C' }), D = s.addPoint({ x: 5, y: 2 }, { label: 'D' });
    s.addSegment(A.id, B.id, { showLength: false }); s.addSegment(C.id, D.id, { showLength: false });
  }),
};
type SceneKey = keyof typeof SCENES;

function run(text: string, scene: MathObject[], selection: string[] = []): CommandSuccess {
  const before = JSON.stringify(scene);
  const result = runCommand(text, scene, selection);
  if (!result.ok) throw new Error(`“${text}” başarısız: ${result.message}`);
  expect(JSON.stringify(scene)).toBe(before);
  return result;
}
function failWith(text: string, scene: MathObject[], selection: string[] = []): string {
  const result = runCommand(text, scene, selection);
  if (result.ok) throw new Error(`“${text}” başarısız olmalıydı: ${result.message}`);
  expect(result.unrecognized).toBeFalsy();
  expect(result.message).not.toMatch(/Komut uygulanamadı/);
  return result.message;
}
const fresh = (scene: MathObject[], r: CommandSuccess) => {
  const before = new Set(scene.map(o => o.id));
  const counts: Record<string, number> = {};
  for (const o of r.objects) if (!before.has(o.id)) counts[o.type] = (counts[o.type] ?? 0) + 1;
  return counts;
};
const labelled = (objects: MathObject[], label: string) => objects.find(o => o.label === label) as unknown as Record<string, unknown>;
const ids = (objects: MathObject[], labels: string[]) => labels.map(l => objects.find(o => o.label === l)!.id);
const spoken = (text: string) => normalizeSpokenCommand(text);

// ---------------------------------------------------------------------------------------------------------------- yanıt

describe('measure phrases (full engine): answers in the message', () => {
  it.each<[SceneKey, string, RegExp]>([
    ['tri', 'ABC üçgeninin alanını hesapla', /A\(ABC\) = 6 br²/],
    ['tri', 'abc üçgeninin alanı kaç', /A\(ABC\) = 6 br²/],
    ['tri', 'ABCnin alanı ne kadar', /A\(ABC\) = 6 br²/],
    ['tri', 'üçgenin alanını bulur musun', /A\(ABC\) = 6 br²/],
    ['tri', 'üçgenin alanını hesaplar mısın lütfen', /A\(ABC\) = 6 br²/],
    ['tri', 'bu üçgenin alanı nedir', /A\(ABC\) = 6 br²/],
    ['tri', 'üçgenin çevresini hesaplayalım', /Ç\(ABC\) = 12 br/],
    ['tri', 'üçgenin çevresini ölçmek istiyorum', /Ç\(ABC\) = 12 br/],
    ['tri', 'bana üçgenin alanı lazım', /A\(ABC\) = 6 br²/],
    ['tri', 'ABC üçgeninin alanını söyler misin', /A\(ABC\) = 6 br²/],
    ['tri', 'ABC üçgeninin alanı nedir acaba', /A\(ABC\) = 6 br²/],
    ['tri', 'üçgenin alanı ne', /A\(ABC\) = 6 br²/],
    ['tri', 'ABC nin alanı', /A\(ABC\) = 6 br²/],
    ['tri', 'ABC üçgeninin yüz ölçümü nedir', /A\(ABC\) = 6 br²/],
    ['tri', 'üçgenin çevre uzunluğu ne kadar', /Ç\(ABC\) = 12 br/],
    ['tri', 'üçgenin etrafının uzunluğu kaç', /Ç\(ABC\) = 12 br/],
    ['tri', 'ABC üçgeninin alanını ve çevresini bul', /A\(ABC\) = 6 br².*Ç\(ABC\) = 12 br/],
    ['tri', 'ABC üçgeninin alanı kaç birim kare', /A\(ABC\) = 6 br²/],
    ['tri', 'ABC nin alanı kaç br kare', /A\(ABC\) = 6 br²/],
    ['tri', 'ABC üçgeninin alanı kaç santimetre kare', /A\(ABC\) = 6 br²/],
    ['tri', 'üçgenin alanı kaç birim kare olur', /A\(ABC\) = 6 br²/],
    ['tri', 'ABC nin çevresi kaç cm', /Ç\(ABC\) = 12 br/],
    ['tri', 'AB kaç santim', /\|AB\| = 4 br/],
    ['tri', 'AB kaç cm', /\|AB\| = 4 br/],
    ['tri', 'AB kenarı kaç birim', /\|AB\| = 4 br/],
    ['tri', 'AC kaç birim', /\|CA\| = 3 br/],
    ['tri', 'bc nin uzunluğu kaç', /\|BC\| = 5 br/],
    ['tri', 'BC kenarının uzunluğu ne kadar', /\|BC\| = 5 br/],
    ['tri', 'ABC üçgeninde AB kenarının uzunluğu kaç', /\|AB\| = 4 br/],
    ['tri', 'hipotenüsün uzunluğu kaç', /hipotenüsü: \|BC\| = 5 br/],
    ['tri', 'üçgenin en uzun kenarı hangisi', /\|BC\| = 5 br/],
    ['tri', 'en kısa kenarı bul', /\|CA\| = 3 br/],
    ['tri', 'dik kenarları göster', /\|AB\| = 4 br, \|CA\| = 3 br/],
    ['tri', 'A açısı kaç derece', /m\(∠CAB\) = 90°/],
    ['tri', 'C köşesindeki açı kaç derece', /m\(∠BCA\) ≈ 53,13°/],
    ['tri', 'üçgenin en büyük açısı kaç', /en büyük açısı: m\(∠CAB\) = 90°/],
    ['tri', 'A açısının ölçüsü nedir', /90°/],
    ['tri', "ABC'nin iç açılarının toplamı kaç", /toplam 180°/],
    ['tri', 'A ile B arasındaki mesafe kaç', /\|AB\| = 4 br/],
    ['tri', 'A ile C arası kaç birim', /\|AC\| = 3 br/],
    ['tri', 'A noktası ile B noktası arasındaki uzaklık nedir', /\|AB\| = 4 br/],
    ['tri', 'A noktasının BC doğrusuna uzaklığı', /2,4 br/],
    ['tri', "A'nın koordinatları nedir", /A\(0; 0\)/],
    ['tri', 'C noktası nerede', /C\(0; 3\)/],
    ['tri', "B'nin apsisi kaç", /apsis \(x\) = 4/],
    ['tri', 'C nin ordinatı ne', /ordinat \(y\) = 3/],
    ['tri', 'B açısının sinüsü kaç', /sin = 0,6/],
    ['tri', 'tan B kaç', /tan = 0,75/],
    ['tri', 'AB doğrusunun denklemi nedir', /y = 0/],
    ['seg', 'AB doğru parçasının uzunluğu kaç', /\|AB\| = 5 br/],
    ['seg', 'AB parçasının boyu ne kadar', /\|AB\| = 5 br/],
    ['seg', 'AB kaç birim', /\|AB\| = 5 br/],
    ['seg', 'AB kaç santim', /\|AB\| = 5 br/],
    ['seg', 'AB parçası kaç cm', /\|AB\| = 5 br/],
    ['seg', 'AB nin uzunluğu kaç birimdir', /\|AB\| = 5 br/],
    ['seg', 'AB nin uzunluğunu söyle', /\|AB\| = 5 br/],
    ['seg', 'AB nin eğimi nedir', /AB eğimi ≈ 1,3333/],
    ['line', 'doğrunun denklemi nedir', /y = 2x \+ 1/],
    ['line', 'AB doğrusunun denklemini yazar mısın', /y = 2x \+ 1/],
    ['line', 'AB doğrusunun eğim açısı kaç derece', /63,43°/],
    ['line', 'AB doğrusunun x ekseniyle yaptığı açı kaç', /63,43°/],
    ['circle', 'çemberin yarıçapı kaç', /r = 3 br/],
    ['circle', 'çemberin yarı çapı kaç', /r = 3 br/],
    ['circle', 'c1 in yarıçapı ne kadar', /r = 3 br/],
    ['circle', 'çemberin çapı kaç santim', /çap = 6 br/],
    ['circle', 'dairenin alanı kaç birim kare', /alan = πr² ≈ 28,27 br²/],
    ['circle', 'M merkezli çemberin alanını hesapla', /alan = πr² ≈ 28,27 br²/],
    ['circle', 'dairenin çevre uzunluğu kaç', /çevre = 2πr ≈ 18,85 br/],
    ['circle', 'çemberin denklemini yaz', /\(x − 1\)² \+ \(y \+ 2\)² = 9/],
    ['circle', 'çemberin merkezi nerede', /merkezi: \(1; -2\)/],
    ['arc', 'yayın uzunluğu kaç', /\|S͡D\| ≈ 3,14 br/],
    ['arc', 'merkez açısı kaç derece', /m\(S͡D\) = 90°/],
    ['arc', 'yayın kirişini göster', /kiriş \|SD\| ≈ 2,83 br/],
    ['arc', 'yayın yarıçapı nedir', /r = \|MS\| = 2 br/],
    ['sector', 'dilimin çevresi kaç', /Ç\(SMD dilimi\) ≈ 7,14 br/],
    ['ellipse', 'elipsin alanı kaç', /alan = πab ≈ 18,85 br²/],
    ['ellipse', 'elipsin denklemi nedir', /x²\/9 \+ y²\/4 = 1/],
    ['square', 'karenin alanı kaç', /A\(ABCD\) = 4 br²/],
    ['square', 'ABCD nin çevresini hesapla', /Ç\(ABCD\) = 8 br/],
    ['square', 'AC nin uzunluğu kaç', /≈ 2,83 br/],
    ['pts', 'A ile B arası kaç birim', /\|AB\| = 4 br/],
    ['pts', 'A dan B ye olan mesafe kaç', /\|AB\| = 4 br/],
    ['pts', 'A ve B noktaları arasındaki mesafe', /\|AB\| = 4 br/],
    ['pts', 'A B arası mesafe kaç', /\|AB\| = 4 br/],
    ['pts', 'A ile C arası kaç santim', /\|AC\| = 5 br/],
    ['pts', 'A dan C ye mesafe ne kadar', /\|AC\| = 5 br/],
    ['pts', 'ABC nin alanı kaç', /çizili çokgen yok\): A\(ABC\) = 6 br²/],
    ['pts', 'BC doğrusunun eğimi kaç', /tanımsız/],
  ])('%s: “%s”', (key, text, expected) => {
    const scene = SCENES[key]();
    expect(run(text, scene).message).toMatch(expected);
  });

  it.each<[SceneKey, string, string]>([
    ['tri', 'A açısı 90 derece mi', 'Evet.'],
    ['tri', 'B açısı 45 derece mi', 'Hayır, 45 değil.'],
    ['tri', 'AB kenarının uzunluğu 4 birim mi', 'Evet.'],
    ['tri', 'üçgenin alanı 6 mı', 'Evet.'],
    ['seg', 'AB 5 birim mi', 'Evet.'],
    ['seg', 'AB nin uzunluğu 6 mı', 'Hayır, 6 değil.'],
  ])('yes/no %s: “%s”', (key, text, start) => {
    expect(run(text, SCENES[key]()).message.startsWith(start)).toBe(true);
  });

  it.each<[SceneKey, string]>([
    ['tri', 'A açısı kaç derece'], ['tri', 'ABC açısı kaç derece'], ['tri', 'AB nin eğimi kaç'], ['line', 'AB doğrusunun eğimi kaç'],
    ['line', 'ab doğrusunun eğimi ne'], ['pts', 'A ile B arası kaç birim'], ['pts', 'ABC açısı kaç derece'], ['pts', 'ABC nin alanı kaç'],
  ])('questions never create objects %s: “%s”', (key, text) => {
    const scene = SCENES[key]();
    expect(fresh(scene, run(text, scene))).toEqual({});
  });
});

// ---------------------------------------------------------------------------------------------------------------- bayraklar / nesneler

describe('measure phrases (full engine): labels on the canvas', () => {
  it('turns on polygon flags', () => {
    const tri = SCENES.tri();
    expect(labelled(run('alanını göster', tri).objects, 'ABC')).toMatchObject({ showArea: true });
    expect(labelled(run('kenar uzunluklarını göster', tri).objects, 'ABC')).toMatchObject({ edgeLabels: [0, 1, 2] });
    expect(labelled(run('üçgenin kenarlarını ölçer misin', tri).objects, 'ABC')).toMatchObject({ edgeLabels: [0, 1, 2] });
    expect(labelled(run('üçgenin tüm ölçülerini göster', tri).objects, 'ABC')).toMatchObject({ showArea: true, showPerimeter: true, edgeLabels: [0, 1, 2] });
    expect(labelled(run('ABC nin alanını ölç sonra çevresini göster', tri).objects, 'ABC')).toMatchObject({ showArea: true, showPerimeter: true });
    expect(labelled(run('karenin kenar uzunluklarını göster', SCENES.square()).objects, 'ABCD')).toMatchObject({ edgeLabels: [0, 1, 2, 3] });
  });

  it('hides specific measurements', () => {
    const shown = run('üçgenin tüm ölçülerini göster', SCENES.tri()).objects;
    expect(labelled(run("ABC'nin alanını gizle", shown).objects, 'ABC')).toMatchObject({ showArea: false, showPerimeter: true });
    expect(labelled(run('ABC üçgeninin çevresini gizle', shown).objects, 'ABC')).toMatchObject({ showPerimeter: false });
    expect(labelled(run('kenar uzunluklarını gizle', shown).objects, 'ABC')).toMatchObject({ edgeLabels: [] });
    expect(labelled(run('AB nin uzunluğunu gizle', run('AB nin uzunluğunu göster', SCENES.seg()).objects).objects, '[AB]')).toMatchObject({ showLength: false });
    expect(labelled(run('AB doğrusunun denklemini gizle', run('AB doğrusunun denklemini göster', SCENES.line()).objects).objects, 'AB Doğrusu')).toMatchObject({ showEquation: false });
  });

  it.each<[SceneKey, string, Record<string, number>]>([
    ['tri', 'B açısını ölç', { angle: 1 }],
    ['tri', 'A açısını göster', { angle: 1 }],
    ['tri', 'ABC üçgeninin B köşesindeki açıyı ölç', { angle: 1 }],
    ['tri', 'üçgenin açılarını göster', { angle: 3 }],
    ['tri', 'üçgenin tüm açılarını ölçelim', { angle: 3 }],
    ['tri', 'ABC üçgeninin açılarını ölçer misin', { angle: 3 }],
    ['tri', 'ABC açısının trigonometrik oranlarını göster', { measurement: 1 }],
    ['two', 'A açısını ölç', { angle: 1 }],
    ['square', 'karenin açılarını göster', { angle: 4 }],
    ['pts', 'A ile B arasındaki mesafeyi ölç', { segment: 1 }],
    ['pts', 'ABC açısını ölç', { angle: 1 }],
    ['line', 'AB doğrusunun eğimini hesapla', { measurement: 1 }],
  ])('%s: “%s” adds %o', (key, text, expected) => {
    const scene = SCENES[key]();
    expect(fresh(scene, run(text, scene))).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------------------------------------------- düzeltilen hatalar

describe('measure phrases (full engine): plural possessive measures every target', () => {
  it.each([
    'uzunluklarını ölç', 'bunların uzunluklarını göster', 'seçili doğru parçalarının uzunluklarını göster', 'uzunluklarını hesapla', 'seçili parçaların uzunlukları kaç',
  ])('two focused segments: “%s”', text => {
    const scene = SCENES.twoSeg();
    const r = run(text, scene, ids(scene, ['[AB]', '[CD]']));
    expect(r.message).toBe('|AB| = 5 br. |CD| = 2 br.');
    expect(fresh(scene, r)).toEqual({});
    if (/göster|ölç/.test(text)) expect(r.objects.filter(o => o.type === 'segment').every(o => (o as { showLength?: boolean }).showLength)).toBe(true);
  });

  it.each(['doğru parçalarının uzunluklarını göster', 'AB ve CD nin uzunluklarını göster'])('named or plural noun: “%s”', text => {
    expect(run(text, SCENES.twoSeg()).message).toBe('|AB| = 5 br. |CD| = 2 br.');
  });

  it('still asks which one for a singular request', () => {
    const scene = SCENES.twoSeg();
    expect(failWith('uzunluğunu göster', scene, ids(scene, ['[AB]', '[CD]']))).toMatch(/Birden fazla/);
  });

  it.each([
    ['iki üçgenin alanlarını hesapla', /A\(ABC\) = 6 br². A\(DEF\) = 6 br²/],
    ['tüm üçgenlerin çevrelerini hesapla', /Ç\(ABC\) = 12 br. Ç\(DEF\) = 12 br/],
    ['üçgenlerin alanlarını göster', /A\(ABC\) = 6 br². A\(DEF\) = 6 br²/],
  ])('two triangles: “%s”', (text, expected) => {
    expect(run(text, SCENES.two()).message).toMatch(expected);
  });

  it('keeps the singular ambiguity message', () => {
    expect(failWith('üçgenin alanını hesapla', SCENES.two())).toMatch(/Birden fazla üçgen/);
  });
});

describe('measure phrases (full engine): slope keeps the line in focus', () => {
  it.each(['AB doğrusunun eğimini hesapla ve kırmızı yap', 'AB doğrusunun eğimini ölç ve kırmızı yap'])('“%s” colours the line', text => {
    const scene = SCENES.line();
    const r = run(text, scene);
    const line = labelled(r.objects, 'AB Doğrusu');
    expect(line.color).toBe('#ef4444');
    expect(r.message).toContain('AB eğimi = 2');
    expect(r.selectedIds).toEqual([line.id]);
    const measurement = r.objects.find(o => o.type === 'measurement') as unknown as Record<string, unknown>;
    expect(measurement.color).not.toBe('#ef4444');
  });

  it('focuses the measurement when only points exist', () => {
    const scene = SCENES.pts();
    const r = run("AB'nin eğimini ölç", scene);
    expect(r.selectedIds).toEqual([r.objects.find(o => o.type === 'measurement')!.id]);
  });
});

describe('measure phrases (full engine): slope of a linear function', () => {
  it.each<[SceneKey, string, RegExp]>([
    ['fn', 'y = 2x + 1 doğrusunun eğimi kaç', /^y = 2x \+ 1: eğim = 2\.$/],
    ['empty', 'y = 2x + 1 doğrusunun eğimi kaç', /^y = 2x \+ 1: eğim = 2\.$/],
    ['fn', 'y = 2x + 1 doğrusunun eğimini göster', /eğim = 2/],
    ['fn', 'eğimini göster', /^y = 2x \+ 1: eğim = 2\.$/],
    ['fn', 'fonksiyonun eğimi kaç', /eğim = 2/],
    ['fn', 'doğrunun eğimi kaç', /eğim = 2/],
    ['fn', 'y = 2x + 1 in eğimi nedir', /eğim = 2/],
    ['empty', 'f(x) = 3x - 2 fonksiyonunun eğimi nedir', /^f\(x\) = 3x - 2: eğim = 3\.$/],
    ['fn', 'fonksiyonun denklemi nedir', /^Denklem: y = 2x \+ 1\.$/],
  ])('%s: “%s” answers without creating anything', (key, text, expected) => {
    const scene = SCENES[key]();
    const r = run(text, scene);
    expect(r.message).toMatch(expected);
    expect(fresh(scene, r)).toEqual({});
    expect(r.sceneChanged).toBe(false);
    if (key === 'fn') expect(r.selectedIds).toEqual([scene.find(o => o.type === 'function')!.id]);
  });

  it('explains that a parabola has no single slope', () => {
    expect(failWith('fonksiyonun eğimi kaç', SCENES.parabola())).toMatch(/doğrusal bir fonksiyon değil/);
  });

  it('still draws a function with an edit tail', () => {
    const r = run('y = 2x + 1', []);
    expect(r.objects.filter(o => o.type === 'function')).toHaveLength(1);
  });
});

describe('measure phrases (full engine): diagonals', () => {
  it.each(['ABCD karesinin köşegen uzunluğu kaç', 'karenin köşegeni kaç birim'])('answers “%s”', text => {
    const scene = SCENES.square();
    const r = run(text, scene);
    expect(r.message).toBe('ABCD köşegenleri: |AC| ≈ 2,83 br, |BD| ≈ 2,83 br.');
    expect(fresh(scene, r)).toEqual({});
  });

  it('measures with segments for ölç and reuses drawn diagonals', () => {
    const scene = SCENES.square();
    const r = run('karenin köşegenini ölç', scene);
    expect(r.message).toContain('|AC| ≈ 2,83 br');
    expect(fresh(scene, r)).toEqual({ segment: 2 });
    const drawn = run('karenin köşegenlerini çiz', scene).objects;
    const again = run('ABCD nin köşegenlerini ölç', drawn);
    expect(fresh(drawn, again)).toEqual({});
    expect(again.objects.filter(o => o.type === 'segment').every(o => (o as { showLength?: boolean }).showLength)).toBe(true);
  });

  it('keeps diagonal construction and intersection in the constructions family', () => {
    const scene = SCENES.square();
    expect(fresh(scene, run('karenin köşegenlerini çiz', scene))).toEqual({ segment: 2 });
    expect(fresh(scene, run('köşegenlerin kesişim noktasını bul', scene))).toMatchObject({ point: 1 });
  });

  it('fails for a triangle', () => {
    expect(failWith('üçgenin köşegeni kaç', SCENES.tri())).toMatch(/köşegeni yoktur/);
  });
});

// ---------------------------------------------------------------------------------------------------------------- konuşma

describe('measure phrases (full engine): speech transcripts', () => {
  it.each<[SceneKey, string, RegExp]>([
    ['tri', 'tamam şimdi üçgenin alanını hesapla', /A\(ABC\) = 6 br²/],
    ['tri', 'şey a be ce üçgeninin alanı kaç', /A\(ABC\) = 6 br²/],
    ['tri', 'a be ce üçgeninin alanını hesapla', /A\(ABC\) = 6 br²/],
    ['tri', 'a ile be arasındaki mesafe ne kadar', /\|AB\| = 4 br/],
    ['tri', 'a ile be arasındaki mesafe kaç birim', /\|AB\| = 4 br/],
    ['tri', 'be ce kenarının uzunluğu kaç', /\|BC\| = 5 br/],
    ['tri', 'a noktasının koordinatları nedir', /A\(0; 0\)/],
    ['tri', 'lütfen üçgenin çevresini hesapla', /Ç\(ABC\) = 12 br/],
    ['tri', 'a be ce açısı kaç derece', /∠ABC/],
    ['tri', 'üçgenin alanı kaç evet', /A\(ABC\) = 6 br²/],
    ['seg', 'a be nin uzunluğu kaç', /\|AB\| = 5 br/],
    ['seg', 'a be uzunluğu kaç', /\|AB\| = 5 br/],
    ['line', 'a be doğrusunun eğimi kaç', /AB eğimi = 2/],
    ['pts', 'a ile ce arasındaki uzaklık kaç', /\|AC\| = 5 br/],
  ])('%s: “%s”', (key, text, expected) => {
    expect(run(spoken(text), SCENES[key]()).message).toMatch(expected);
  });
});

// ---------------------------------------------------------------------------------------------------------------- birleşik ve hatalı

describe('measure phrases (full engine): combined sentences', () => {
  it('measures and edits in one sentence', () => {
    const tri = run('ABC üçgeninin alanını hesapla ve kırmızı yap', SCENES.tri());
    expect(labelled(tri.objects, 'ABC')).toMatchObject({ showArea: true, color: '#ef4444' });
    const seg = run('AB nin uzunluğunu hesapla ve mavi yap', SCENES.seg());
    expect(labelled(seg.objects, '[AB]')).toMatchObject({ color: '#2563eb' });
    expect(run('AB doğrusunun denklemini ve eğimini göster', SCENES.line()).message).toMatch(/y = 2x \+ 1.*AB eğimi = 2/);
  });

  it.each<[string, Record<string, number>, RegExp]>([
    ['üçgen çiz ve alanını göster', { polygon: 1, point: 3 }, /A\(ABC\) ≈ 6,93 br²/],
    ['AB doğru parçası çiz ve uzunluğunu göster', { segment: 1, point: 2 }, /\|AB\| = 4 br/],
    ['yarıçapı 3 olan çember çiz ve alanını hesapla', { circle: 1, point: 1 }, /alan = πr² ≈ 28,27 br²/],
    ['kare çiz ve alanını göster', { polygon: 1, point: 4 }, /A\(ABCD\) = 16 br²/],
  ])('draws then measures: “%s”', (text, counts, expected) => {
    const r = run(text, []);
    expect(fresh([], r)).toEqual(counts);
    expect(r.message).toMatch(expected);
  });
});

describe('measure phrases (full engine): helpful failures', () => {
  it.each<[SceneKey, string, RegExp]>([
    ['empty', 'üçgenin alanını hesapla', /Önce bir üçgen/],
    ['empty', 'ABC üçgeninin alanı kaç', /ABC adlı bir üçgen bulunamadı/],
    ['tri', 'XY nin uzunluğu kaç', /XY adlı nesne bulunamadı/],
    ['tri', 'B nin eğimi', /Eğim için/],
    ['seg', 'A açısını ölç', /kolları belli değil/],
    ['line', 'doğrunun alanı kaç', /alan ve çevre hesaplanmaz/],
    ['circle', 'çemberin yay uzunluğu', /çevresidir/],
    ['circle', 'çemberin kirişi kaç', /kirişin iki ucunu/],
    ['arc', 'yayın alanı kaç', /Yayın alanı/],
  ])('%s: “%s”', (key, text, expected) => {
    expect(failWith(text, SCENES[key]())).toMatch(expected);
  });
});
