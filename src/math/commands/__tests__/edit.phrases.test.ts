import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject } from '@/types/math';
import { calculateAngleDegrees } from '@/math/geometry';
import { runCommand } from '../engine';
import { CommandScene } from '../scene';
import { normalizeSpokenCommand } from '../speechText';
import type { CommandResult, CommandSuccess } from '../types';

/**
 * Düzenleme ailesi: öğretmenin yazdığı ya da söylediği cümleler TÜM komut aileleriyle (varsayılan HANDLERS) sınanır.
 * edit.test.ts aileyi yalıtılmış sınar; burada önceki komutun nesnesi (seçim), inşa ürünleri ve aileler arası öncelik de sınanır.
 */

type State = { objects: MathObject[]; selection: string[] };
const build = (fn: (s: CommandScene) => void): MathObject[] => { const s = new CommandScene([]); fn(s); s.resolve(); return s.objects; };
const P = (s: CommandScene, label: string, x: number, y: number) => s.addPoint({ x, y }, { label });
const st = (objects: MathObject[], selection: string[] = []): State => ({ objects, selection });
const unfocus = (s: State): State => st(s.objects);
const select = (s: State, pred: (o: MathObject) => boolean): State => st(s.objects, s.objects.filter(pred).map(o => o.id));
const patch = (s: State, pred: (o: MathObject) => boolean, p: Record<string, unknown>): State => st(s.objects.map(o => pred(o) ? ({ ...o, ...p } as MathObject) : o), s.selection);

/** Komutları arayüzdeki gibi sırayla uygular: her sonucun seçimi bir sonraki komutun seçimidir. */
function play(state: State, steps: string[]): State {
  for (const step of steps) {
    const r = runCommand(step, state.objects, state.selection);
    if (!r.ok) throw new Error(`“${step}” başarısız: ${r.message}`);
    state = st(r.objects, r.selectedIds);
  }
  return state;
}
function run(text: string, state: State, spoken = false): CommandSuccess {
  const before = JSON.stringify(state.objects);
  const r = runCommand(spoken ? normalizeSpokenCommand(text) : text, state.objects, state.selection);
  if (!r.ok) throw new Error(`“${text}” başarısız: ${r.message}`);
  expect(JSON.stringify(state.objects)).toBe(before);
  expect(new Set(r.objects.map(o => o.id)).size).toBe(r.objects.length);
  return r;
}
function failWith(text: string, state: State): string {
  const r: CommandResult = runCommand(text, state.objects, state.selection);
  if (r.ok) throw new Error(`“${text}” başarısız olmalıydı: ${r.message}`);
  expect(r.unrecognized).toBeFalsy();
  expect(r.message).not.toMatch(/Komut uygulanamadı/);
  return r.message;
}

const of = <T extends MathObject['type']>(o: MathObject[], t: T) => o.filter(x => x.type === t) as Extract<MathObject, { type: T }>[];
const pt = (o: MathObject[], label: string) => o.find((x): x is PointObject => x.type === 'point' && x.label === label);
const fn = (o: MathObject[], name: string) => of(o, 'function').find(f => f.label.startsWith(`${name}(x)`));
const built = (o: MathObject[], kind: string) => of(o, 'point').filter(p => p.construction?.kind === kind);
const tangents = (o: MathObject[]) => of(o, 'line').filter(l => l.label.startsWith('Teğet'));
const dist = (a?: PointObject, b?: PointObject) => Math.hypot(a!.x - b!.x, a!.y - b!.y);

// ----------------------------------------------------------------------------- sahneler
const tri = () => st(build(s => { const a = P(s, 'A', 0, 0), b = P(s, 'B', 4, 0), c = P(s, 'C', 1, 3); s.addPolygon([a.id, b.id, c.id], { kind: 'triangle' }); }));
const seg = () => st(build(s => { const a = P(s, 'A', 0, 0), b = P(s, 'B', 3, 4); s.addSegment(a.id, b.id); }));
const circ = () => st(build(s => { const o = P(s, 'O', 0, 0); s.addCircle({ centerId: o.id, radius: 2 }); }));
const square = () => st(build(s => { const p = [P(s, 'P', 0, 0), P(s, 'Q', 2, 0), P(s, 'R', 2, 2), P(s, 'S', 0, 2)]; s.addPolygon(p.map(x => x.id), { kind: 'square', label: 'Kare' }); }));
const fraction = () => st(build(s => { s.addFraction(2, 3, { x: 0, y: 0 }); }));
const world = () => st(build(s => {
  const [a, b, c, o] = [P(s, 'A', 0, 0), P(s, 'B', 4, 0), P(s, 'C', 0, 3), P(s, 'O', -6, 0)];
  s.addPolygon([a.id, b.id, c.id], { kind: 'triangle' });
  s.addCircle({ centerId: o.id, radius: 2 }, { label: 'c1' });
  s.addSlider('a');
}));
const fns = () => play(st([]), ['f(x) = x^2', 'g(x) = sin(x)', 'h(x) = 2x + 1']);
const tangentScene = () => play(st(build(s => { const o = P(s, 'O', 0, 0); s.addCircle({ centerId: o.id, radius: 2 }, { label: 'c' }); P(s, 'P', 5, 0); })), ['P noktasından çembere teğet çiz']);
const altitudeScene = () => play(tri(), ['C köşesinden yükseklik çiz']);
const anglesScene = () => play(tri(), ['ABC üçgeninin açılarını göster']);
const intersectionScene = () => play(st(build(s => {
  const o = P(s, 'O', 0, 0); s.addCircle({ centerId: o.id, radius: 2 }, { label: 'c1' });
  const a = P(s, 'A', -4, 1), b = P(s, 'B', 4, 1); s.addLine(a.id, b.id);
})), ['c1 ile AB doğrusunun kesişim noktalarını bul']);

// ----------------------------------------------------------------------------- fonksiyon adları

describe('edit phrases (full engine): functions by name', () => {
  it.each(['f fonksiyonunu sil', 'f yi sil', "f'yi sil", 'f nin grafiğini sil', 'f(x) fonksiyonunu sil'])('%s deletes f, not the focused h', text => {
    const r = run(text, fns());
    expect(fn(r.objects, 'f')).toBeUndefined();
    expect(fn(r.objects, 'g')).toBeDefined();
    expect(fn(r.objects, 'h')).toBeDefined();
  });
  it('keeps lowercase function names in messages', () => {
    expect(run('g yi sil', fns()).message).toBe('g(x) = sin(x) fonksiyonu silindi.');
    // Çemberin kendi merkezi de gittiği için ad, giden noktayı da söyler (ŞEKLİN KENDİ NOKTALARI kuralı).
    expect(run('c1 çemberini kaldır', world()).message).toMatch(/^c1 çemberi \(O noktasıyla birlikte\) silindi\./);
  });
  it('edits several named functions and the right one', () => {
    const both = run('f ve g yi sil', fns());
    expect(of(both.objects, 'function').map(f => f.label)).toEqual(['h(x) = 2x + 1']);
    const hidden = run('f ile g yi gizle', fns());
    expect([fn(hidden.objects, 'f')!.visible, fn(hidden.objects, 'g')!.visible, fn(hidden.objects, 'h')!.visible]).toEqual([false, false, true]);
    expect(fn(run('f yi göster', patch(fns(), o => o.label.startsWith('f('), { visible: false })).objects, 'f')!.visible).toBe(true);
    expect(fn(run('g yi yeşil yap', play(fns(), ['f yi seç'])).objects, 'g')!.color).toBe('#10b981');
    expect(fn(run('f fonksiyonunu pembe yap', fns()).objects, 'h')!.color).not.toBe('#ec4899');
    const scene = fns();
    expect(run('g yi seç', scene).selectedIds).toEqual([fn(scene.objects, 'g')!.id]);
  });
  it('moves, thickens and renames the named function', () => {
    const moved = run('f fonksiyonunu 2 birim yukarı kaydır', fns());
    expect(fn(moved.objects, 'f')!.expression).not.toBe('x^2');
    expect(fn(moved.objects, 'h')!.expression).toBe('2x + 1');
    const thick = run('f fonksiyonunun kalınlığı 5 olsun', fns());
    expect(fn(thick.objects, 'f')!.thickness).toBe(5);
    expect(thick.actions).toEqual([]);
    expect(fn(run('g nin kalınlığını 3 yap', fns()).objects, 'g')!.thickness).toBe(3);
    expect(fn(run('f fonksiyonunun adını p yap', fns()).objects, 'p')!.expression).toBe('x^2');
    expect(fn(run('g nin adını k yap', fns()).objects, 'k')!.expression).toBe('sin(x)');
    expect(run('f fonksiyonunun adını f yap', fns()).message).toContain('zaten f');
  });
  it('works from speech', () => {
    expect(fn(run('evet f yi sil', fns(), true).objects, 'f')).toBeUndefined();
  });
});

// ----------------------------------------------------------------------------- inşa ürünleri ve şekil parçaları

describe('edit phrases (full engine): parts and construction products', () => {
  it('tangents: delete (with their contact points), colour, hide, select', () => {
    // İKİ teğet birden silinince onları tanımlayan P noktası da artık kullanılmıyor: şeklin kendi noktası olarak gider.
    const del = run('teğetleri sil', unfocus(tangentScene()));
    expect(tangents(del.objects)).toHaveLength(0);
    expect(built(del.objects, 'tangent')).toHaveLength(0);
    expect(pt(del.objects, 'P')).toBeUndefined();
    expect(of(del.objects, 'circle')).toHaveLength(1);
    const both = run('ikisini de sil', tangentScene());
    expect(tangents(both.objects)).toHaveLength(0);
    expect(pt(both.objects, 'P')).toBeUndefined();
    // "noktalar kalsın": yalnızca teğet doğruları gider, P ve değme noktaları kalır
    const keep = run('teğetleri sil, noktalar kalsın', unfocus(tangentScene()));
    expect(tangents(keep.objects)).toHaveLength(0);
    expect(pt(keep.objects, 'P')).toBeDefined();
    expect(built(keep.objects, 'tangent')).toHaveLength(2);
    const red = run('teğetleri kırmızı yap', unfocus(tangentScene()));
    expect(tangents(red.objects).map(l => l.color)).toEqual(['#ef4444', '#ef4444']);
    expect(of(red.objects, 'circle')[0].color).not.toBe('#ef4444');
    expect(tangents(run('teğetleri gizle', unfocus(tangentScene())).objects).every(l => !l.visible)).toBe(true);
    expect(run('teğetleri seç', unfocus(tangentScene())).selectedIds).toHaveLength(2);
    expect(tangents(run('teğet doğrularını sil', unfocus(tangentScene())).objects)).toHaveLength(0);
    const contacts = run('teğet noktalarını kırmızı yap', unfocus(tangentScene()));
    expect(built(contacts.objects, 'tangent').every(p => p.color === '#ef4444')).toBe(true);
    expect(pt(contacts.objects, 'P')!.color).not.toBe('#ef4444');
    expect(built(run('teğetlerin değme noktalarını gizle', unfocus(tangentScene())).objects, 'tangent').every(p => !p.visible)).toBe(true);
  });
  it('circle centre: hide, colour, delete, rename', () => {
    const hidden = run('çemberin merkezini gizle', circ());
    expect(pt(hidden.objects, 'O')!.visible).toBe(false);
    expect(of(hidden.objects, 'circle')[0].visible).toBe(true);
    const red = run('çemberin merkezini kırmızı yap', circ());
    expect(pt(red.objects, 'O')!.color).toBe('#ef4444');
    expect(of(red.objects, 'circle')[0].color).not.toBe('#ef4444');
    expect(pt(run('merkezi gizle', select(circ(), o => o.type === 'circle')).objects, 'O')!.visible).toBe(false);
    expect(pt(run('merkezini M olarak adlandır', select(circ(), o => o.type === 'circle')).objects, 'M')).toBeDefined();
    expect(pt(run('çemberin merkezine M adını ver', circ()).objects, 'M')).toBeDefined();
    expect(pt(run('c1 in merkezini gizle', world()).objects, 'O')!.visible).toBe(false);
    expect(pt(run('çemberin merkezini sil', circ()).objects, 'O')).toBeUndefined();
  });
  it('intersection points: delete, hide, select and name several at once', () => {
    const del = run('kesişim noktalarını sil', unfocus(intersectionScene()));
    expect(built(del.objects, 'intersection')).toHaveLength(0);
    expect(of(del.objects, 'point').map(p => p.label)).toEqual(['O', 'A', 'B']);
    expect(built(run('kesişim noktalarını gizle', unfocus(intersectionScene())).objects, 'intersection').every(p => !p.visible)).toBe(true);
    expect(run('kesişim noktalarını seç', unfocus(intersectionScene())).selectedIds).toHaveLength(2);
    for (const state of [intersectionScene(), unfocus(intersectionScene())]) {
      const r = run('kesişim noktalarını E ve F olarak adlandır', state);
      expect(built(r.objects, 'intersection').map(p => p.label)).toEqual(['E', 'F']);
    }
    expect(built(run('E ve F olarak adlandır', intersectionScene()).objects, 'intersection').map(p => p.label)).toEqual(['E', 'F']);
    expect(pt(run('C ve D yi E ve F olarak adlandır', intersectionScene()).objects, 'F')).toBeDefined();
    expect(failWith('kesişim noktalarını E olarak adlandır', unfocus(intersectionScene()))).toContain('Birden fazla');
    const cross = play(st(build(s => { const [a, b, c, d] = [P(s, 'A', -2, 0), P(s, 'B', 2, 0), P(s, 'C', 0, -2), P(s, 'D', 0, 2)]; s.addLine(a.id, b.id); s.addLine(c.id, d.id); })), ['AB ve CD doğrularının kesişim noktasını bul']);
    expect(built(run('kesişim noktasını P olarak adlandır', unfocus(cross)).objects, 'intersection')[0].label).toBe('P');
    expect(built(run('teğet noktalarını T ve U olarak adlandır', unfocus(tangentScene())).objects, 'tangent').map(p => p.label)).toEqual(['T', 'U']);
  });
  it('altitudes, their feet, midpoints and medians', () => {
    const del = run('yüksekliği sil', unfocus(altitudeScene()));
    expect(of(del.objects, 'segment')).toHaveLength(0);
    expect(built(del.objects, 'foot')).toHaveLength(0);
    expect(of(del.objects, 'polygon')).toHaveLength(1);
    expect(of(run('yüksekliği gizle', unfocus(altitudeScene())).objects, 'segment')[0].visible).toBe(false);
    expect(of(run('yüksekliği kırmızı yap', unfocus(altitudeScene())).objects, 'segment')[0].color).toBe('#ef4444');
    expect(built(run('ayağını K olarak adlandır', altitudeScene()).objects, 'foot')[0].label).toBe('K');
    expect(built(run('yüksekliğin ayağını K olarak adlandır', unfocus(altitudeScene())).objects, 'foot')[0].label).toBe('K');
    const foot = run('yüksekliğin ayağını gizle', unfocus(altitudeScene()));
    expect(built(foot.objects, 'foot')[0].visible).toBe(false);
    expect(of(foot.objects, 'segment')[0].visible).toBe(true);
    const all = run('ABC nin yüksekliklerini sil', unfocus(play(tri(), ['üçgenin tüm yüksekliklerini çiz'])));
    expect(of(all.objects, 'segment')).toHaveLength(0);
    expect(built(all.objects, 'foot')).toHaveLength(0);

    const mid = () => unfocus(play(tri(), ["AB'nin orta noktasını bul"]));
    expect(built(run('orta noktayı sil', mid()).objects, 'midpoint')).toHaveLength(0);
    expect(built(run('orta noktayı gizle', mid()).objects, 'midpoint')[0].visible).toBe(false);
    expect(built(run('AB nin orta noktasını gizle', mid()).objects, 'midpoint')[0].visible).toBe(false);
    expect(built(run('orta noktanın adını M yap', mid()).objects, 'midpoint')[0].label).toBe('M');

    const medians = run('üçgenin kenarortaylarını kırmızı yap', unfocus(play(tri(), ['üçgenin kenarortaylarını çiz'])));
    expect(of(medians.objects, 'segment').map(x => x.color)).toEqual(['#ef4444', '#ef4444', '#ef4444']);
    expect(of(medians.objects, 'polygon')[0].color).not.toBe('#ef4444');
    const centroid = run('ağırlık merkezini gizle', play(tri(), ['ağırlık merkezini bul', 'ABC yi seç']));
    expect(built(centroid.objects, 'triangleCenter')[0].visible).toBe(false);
  });
  it('angle objects of a triangle', () => {
    for (const text of ['açıları gizle', 'tüm açıları gizle', 'ABC üçgeninin açılarını gizle']) {
      const r = run(text, unfocus(anglesScene()));
      expect(of(r.objects, 'angle').every(a => !a.visible)).toBe(true);
      expect(of(r.objects, 'polygon')[0].visible).toBe(true);
    }
    expect(of(run('B açısını gizle', unfocus(anglesScene())).objects, 'angle').filter(a => !a.visible)).toHaveLength(1);
    expect(of(run('açıları sil', unfocus(anglesScene())).objects, 'angle')).toHaveLength(0);
    expect(of(run('açıları mor yap', unfocus(anglesScene())).objects, 'angle').every(a => a.color === '#8b5cf6')).toBe(true);
  });
});

// ----------------------------------------------------------------------------- önceki komutun nesnesi

describe('edit phrases (full engine): the object of the previous command', () => {
  it.each([['sil', 'üçgen çiz'], ['üçgeni sil', 'üçgen çiz'], ['onu sil', 'kare çiz'], ['bunu siler misin', 'AB doğru parçası çiz'], ['sil onu', 'üçgen çiz']])(
    '“%s” after “%s” also removes the vertices created with it', (text, first) => {
      expect(run(text, play(st([]), [first])).objects).toEqual([]);
    });
  it('removes the unused vertices when the shape is deleted by name too', () => {
    const r = run('ABC üçgenini sil', tri());
    expect(of(r.objects, 'point')).toHaveLength(0);
    const keep = run('yalnızca ABC üçgenini sil', tri());
    expect(of(keep.objects, 'polygon')).toHaveLength(0);
    expect(of(keep.objects, 'point')).toHaveLength(3);
  });
  it('hides, shows and names parts of the focused shape', () => {
    expect(of(run('gizle', play(st([]), ['yarıçapı 3 olan çember çiz'])).objects, 'circle')[0].visible).toBe(false);
    const vertices = run('köşelerini gizle', play(st([]), ['üçgen çiz']));
    expect(of(vertices.objects, 'point').every(p => !p.visible)).toBe(true);
    expect(of(vertices.objects, 'polygon')[0].visible).toBe(true);
    expect(of(run('köşelerini göster', patch(play(st([]), ['üçgen çiz']), o => o.type === 'point', { visible: false })).objects, 'point').every(p => p.visible)).toBe(true);
    const labels = run('etiketlerini gizle', play(st([]), ['üçgen çiz']));
    expect(of(labels.objects, 'point').every(p => !p.showLabel)).toBe(true);
    expect(labels.selectedIds).toEqual([of(labels.objects, 'polygon')[0].id]);
    expect(built(run('ikisini de gizle', intersectionScene()).objects, 'intersection').every(p => !p.visible)).toBe(true);
  });
  it('sets the thickness of the focused object instead of the global line style', () => {
    const segment = select(seg(), o => o.type === 'segment');
    const two = run('kalınlığını 2 yap', segment);
    expect(of(two.objects, 'segment')[0].thickness).toBe(2);
    expect(two.actions).toEqual([]);
    expect(of(run('kenar kalınlığını 3 yap', segment).objects, 'segment')[0].thickness).toBe(3);
    expect(failWith('kenar kalınlığını 3 yap', select(tri(), o => o.type === 'polygon'))).toContain('kalınlaştırılamaz');
    expect(run('çizgi kalınlığını 2 yap', tri()).actions).toEqual([{ kind: 'styleSettings', patch: { strokeScale: 2 } }]);
  });
  it('edits a focused fraction model without naming it', () => {
    expect(of(run('paydasını 6 yap', select(fraction(), () => true)).objects, 'fraction')[0].denominator).toBe(6);
    expect(of(run('payını 1 yap', select(fraction(), () => true)).objects, 'fraction')[0].numerator).toBe(1);
  });
  it('asks what to act on when nothing is selected', () => {
    expect(failWith('sil', tri())).toContain('Neyi sileyim');
    expect(failWith('gizle', tri())).toContain('Neyi gizleyeyim');
  });
});

// ----------------------------------------------------------------------------- taşıma, ad, boyut, renk

describe('edit phrases (full engine): move, rename, size and colour', () => {
  it('moves to spoken coordinates and ignores a detached dative after a coordinate', () => {
    expect(pt(run('A noktasını 1 1 konumuna taşı', tri()).objects, 'A')).toMatchObject({ x: 1, y: 1 });
    expect(pt(run('c1 in merkezini (0,0) a taşı', world()).objects, 'O')).toMatchObject({ x: 0, y: 0 });
  });
  it('says the name is already taken by the same object', () => {
    const r = run('G yi G olarak adlandır', st(build(s => { P(s, 'G', 1, 1); })));
    expect(r.message).toBe('G noktasının adı zaten G.');
    expect(r.sceneChanged).toBe(false);
  });
  it('changes sizes relative to the current value', () => {
    expect(of(run('çemberin yarıçapını 2 katına çıkar', circ()).objects, 'circle')[0].fixedRadius).toBe(4);
    expect(of(run('yarıçapını 1 artır', select(circ(), o => o.type === 'circle')).objects, 'circle')[0].fixedRadius).toBe(3);
    const shorter = run('AB nin uzunluğunu 2 birim azalt', seg());
    expect(dist(pt(shorter.objects, 'A'), pt(shorter.objects, 'B'))).toBeCloseTo(3, 6);
    const angle = run('B açısını 10 derece artır', tri());
    const [a, b, c] = ['A', 'B', 'C'].map(l => pt(angle.objects, l)!);
    expect(calculateAngleDegrees(a, b, c)).toBeCloseTo(calculateAngleDegrees(pt(tri().objects, 'A')!, pt(tri().objects, 'B')!, pt(tri().objects, 'C')!) + 10, 6);
    const side = run('kenarını yarısına indir', select(square(), o => o.type === 'polygon'));
    expect(dist(pt(side.objects, 'P'), pt(side.objects, 'Q'))).toBeCloseTo(1, 6);
  });
  it('explains unknown colours and missing objects instead of not understanding', () => {
    expect(failWith('ABC yi bordo yap', tri())).toContain('bordo');
    expect(of(run('ABC yi eflatun yap', tri()).objects, 'polygon')[0].color).toBe('#8b5cf6');
    expect(failWith('AB nin uzunluğunu 5 yap', st(build(s => { P(s, 'A', 0, 0); })))).toContain('bulunamadı');
  });
});
