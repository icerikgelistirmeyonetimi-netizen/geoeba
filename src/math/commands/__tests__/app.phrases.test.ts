import { describe, expect, it } from 'vitest';
import type { MathObject, ViewportTransform } from '@/types/math';
import type { StyleSettings } from '@/types/workspace';
import { runCommand } from '../engine';
import { normalizeSpokenCommand } from '../speechText';
import { DEFAULT_VIEWPORT } from '../handlers/app/shared';
import type { AppAction, CommandResult, EngineOptions } from '../types';
import { build } from './helpers';

/**
 * Uygulama ailesi: öğretmenin yazdığı ya da söylediği gerçekçi cümleler, TÜM komut aileleriyle (varsayılan HANDLERS).
 * app.test.ts kayıt dosyasını taklit ederek yalnızca bu aileyi sınar; buradaki cümleler aileler arası çakışmaları da yakalar.
 */

const tri = () => build(s => {
  const a = s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  const b = s.addPoint({ x: 4, y: 0 }, { label: 'B' });
  const c = s.addPoint({ x: 0, y: 3 }, { label: 'C' });
  s.addPolygon([a.id, b.id, c.id], { kind: 'triangle' });
});
const opts = (patch: Partial<ViewportTransform> = {}): EngineOptions => ({ viewport: { ...DEFAULT_VIEWPORT, ...patch } });

interface Setup { scene?: MathObject[]; selection?: string[]; options?: EngineOptions; speech?: boolean }

function run(text: string, setup: Setup = {}): CommandResult {
  const input = setup.speech ? normalizeSpokenCommand(text) : text;
  return runCommand(input, setup.scene ?? [], setup.selection ?? [], setup.options ?? opts());
}
function ok(text: string, setup: Setup = {}) {
  const r = run(text, setup);
  if (!r.ok) throw new Error(`“${text}” başarısız: ${r.message}`);
  return r;
}
const viewPatch = (actions: AppAction[]) => Object.assign({}, ...actions.flatMap(a => a.kind === 'viewport' ? [a.patch] : [])) as Partial<ViewportTransform>;
const stylePatch = (actions: AppAction[]) => Object.assign({}, ...actions.flatMap(a => a.kind === 'styleSettings' ? [a.patch] : [])) as Partial<StyleSettings>;

describe('app phrases: undo / redo', () => {
  it.each([
    ['son işlemi iptal et', { kind: 'undo' }],
    ['yaptığım son değişikliği geri al', { kind: 'undo' }],
    ['geri alsana', { kind: 'undo' }],
    ['geri alalım', { kind: 'undo' }],
    ['iki adım geri al', { kind: 'undo', count: 2 }],
    ['üç kere geri al', { kind: 'undo', count: 3 }],
    ['hepsini geri al', { kind: 'undo', count: 120 }],
    ['geri aldığımı geri getir', { kind: 'redo' }],
    ['bir adım ileri git', { kind: 'redo' }],
    ['iki kez yinele', { kind: 'redo', count: 2 }],
    ['yinelesene', { kind: 'redo' }],
  ])('%s', (text, action) => {
    const r = ok(text);
    expect(r.actions).toEqual([action]);
    expect(r.sceneChanged).toBe(false);
  });
  it.each(['şey geri al', 'tamam geri al', 'evet geri al', 'geri al.'])('speech: %s', text => {
    expect(ok(text, { speech: true }).actions).toEqual([{ kind: 'undo' }]);
  });
});

describe('app phrases: clear and select all', () => {
  it.each(['baştan başlayalım', 'temizle', 'çizimleri temizle', 'tahtayı sil', 'herşeyi sil', 'her şeyi silip baştan başla', 'bütün şekilleri kaldır'])('%s asks to clear', text => {
    const scene = tri();
    const r = ok(text, { scene });
    expect(r.actions).toEqual([{ kind: 'clearAll' }]);
    expect(r.objects).toBe(scene);
  });
  it('leaves a bare “temizle” alone when something is selected', () => {
    const scene = tri();
    const r = run('temizle', { scene, selection: [scene[3].id] });
    expect(r.ok && r.actions.some(a => a.kind === 'clearAll')).toBe(false);
  });
  it('does not treat “animasyonu baştan başlat” as clearing', () => {
    const r = run('animasyonu baştan başlat', { scene: tri() });
    expect(r.ok && r.actions.some(a => a.kind === 'clearAll')).toBe(false);
  });
  it('selects everything with “ctrl a” even when a point is named A', () => {
    const scene = tri();
    expect(ok('ctrl a', { scene }).selectedIds).toEqual(scene.map(o => o.id));
  });
});

describe('app phrases: tools and dialogs', () => {
  it.each([
    ['bana kalem lazım', 'pen'],
    ['pergel lazım', 'compass'],
    ['iletki aç', 'measure_angle'],
    ['silme aracına geç', 'delete'],
    ['elips aracına geçelim', 'ellipse'],
    ['elips aracını seçmek istiyorum', 'ellipse'],
    ['üç noktadan geçen çember aracı', 'circle_3points'],
    ['seçme aracına dön', 'select'],
    ['uzunluk ölçme aracını açar mısınız', 'measure_distance'],
    ['kalemle çiz', 'pen'],
    ['pergel', 'compass'],
  ])('%s → %s', (text, tool) => {
    expect(ok(text).actions).toEqual([{ kind: 'selectTool', tool }]);
  });
  it.each(['pergel aracini ac', 'şimdi cetvel aracını açalım'])('speech: %s', text => {
    expect(ok(text, { speech: true }).actions).toHaveLength(1);
  });
  it.each(['kalem aracını kapat', 'pergeli bırak', 'araçtan çık'])('%s returns to Seç ve Taşı', text => {
    const r = ok(text);
    expect(r.actions).toEqual([{ kind: 'selectTool', tool: 'select' }]);
    expect(r.message).toContain('Seç ve Taşı');
  });
  it('explains that dialogs are closed with their own buttons', () => {
    const r = run('fonksiyon penceresini kapat');
    expect(r.ok).toBe(false);
    expect(r.message).toContain('İptal');
  });
});

describe('app phrases: view toggles', () => {
  it.each([
    ['noktalar ızgaraya otursun', { snapToGrid: true }],
    ['ızgara gözüksün', { showGrid: true }],
    ['ızgara görünmesin', { showGrid: false }],
    ['kareli arka planı kaldır', { showGrid: false }],
    ['kareli zemini kaldır', { showGrid: false }],
    ['ölçüleri gizle', { showMeasurements: false }],
    ['mıknatısı kapat', { snapToGrid: false }],
    ['gri tonlamaya geç', { blackWhite: true }],
    ['x eksenini ve y eksenini gizle', { showAxes: false }],
    ['ızgarayı göster ama eksenleri gizle', { showGrid: true, showAxes: false }],
  ])('%s', (text, patch) => {
    expect(viewPatch(ok(text).actions)).toEqual(patch);
  });
  it.each([
    ['eksenleri gizle ızgarayı göster', { showAxes: false, showGrid: true }],
    ['izgarayi gizle', { showGrid: false }],
    ['şey ızgarayı gizle', { showGrid: false }],
    ['ızgarayı gizler misin lütfen', { showGrid: false }],
  ])('speech: %s', (text, patch) => {
    expect(viewPatch(ok(text, { speech: true }).actions)).toEqual(patch);
  });
  it('leaves “ölçüleri göster” and named measurements to the measure family', () => {
    for (const text of ['ölçüleri göster', 'üçgenin ölçülerini gizle']) {
      const r = run(text, { scene: tri() });
      expect(r.ok && r.actions.some(a => a.kind === 'viewport')).toBe(false);
    }
  });
});

describe('app phrases: zoom and view', () => {
  it('zooms to the only triangle by its noun', () => {
    const scene = tri();
    const r = ok('üçgene yakınlaştır', { scene });
    expect(r.actions).toHaveLength(1);
    expect(r.actions[0].kind).toBe('viewport');
    expect(r.selectedIds).toEqual([scene[3].id]);
  });
  it('asks which one when several shapes of that kind exist', () => {
    const scene = build(s => {
      const pts = [[0, 0], [4, 0], [0, 3], [10, 0], [14, 0], [10, 3]].map(([x, y]) => s.addPoint({ x, y }));
      s.addPolygon(pts.slice(0, 3).map(p => p.id), { kind: 'triangle' });
      s.addPolygon(pts.slice(3).map(p => p.id), { kind: 'triangle' });
    });
    const r = run('üçgene yakınlaştır', { scene });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('Birden fazla üçgen');
  });
  it('asks to draw first when the shape does not exist', () => {
    const r = run('çembere odaklan', { scene: tri() });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('çember');
  });
  it.each([
    ['a be ce üçgenine yakınlaştır', true],
    ['be noktasına odaklan', true],
  ])('speech: %s', text => {
    expect(ok(text, { scene: tri(), speech: true }).actions[0].kind).toBe('viewport');
  });
  it.each([
    ['beyaz zemin olsun', 'bos_duzlem'],
    ['kareli kağıda geç', 'kareli_duzlem'],
    ['analitik düzleme geç', 'dik_koordinat'],
  ])('%s → %s', (text, plane) => {
    expect(ok(text).actions[0]).toEqual({ kind: 'planeType', plane });
  });
});

describe('app phrases: style and help', () => {
  it.each([
    ['yazıları normale döndür', { fontScale: 1 }],
    ['çizgileri eski haline getir', { strokeScale: 1 }],
    ['yazılar büyük olsun', { fontScale: 1.25 }],
    ['noktalar küçük olsun', { pointRadius: 4 }],
    ['çizgiler ince olsun', { strokeScale: 0.7 }],
    ['çizgileri bir buçuk kat kalınlaştır', { strokeScale: 1.5 }],
    ['yazı boyutunu 1,5 yap', { fontScale: 1.5 }],
  ])('%s', (text, patch) => {
    expect(stylePatch(ok(text).actions)).toEqual(patch);
  });
  it('reads a spoken scale factor', () => {
    expect(stylePatch(ok('yazi boyutunu bir buçuk yap', { speech: true }).actions)).toEqual({ fontScale: 1.5 });
  });
  it('still lets text objects take pixel sizes', () => {
    const scene = build(s => { s.addText('Merhaba', { x: 0, y: 0 }); });
    const r = ok('yazı boyutunu 24 yap', { scene });
    expect(r.sceneChanged).toBe(true);
  });
  it.each(['3 boyuta geç', 'üç boyutlu görünüme geç'])('%s explains the 3D button', text => {
    const r = run(text);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('3D');
  });
  it.each(['yardım eder misin', 'ne yapabilirim', 'hangi komutları söyleyebilirim', 'neler yapabiliyorsun'])('%s opens help', text => {
    expect(ok(text).actions[0].kind).toBe('help');
  });
});

// ------------------------------------------------------------------------------------------------ süpürme 2 (kalıcı regresyonlar)
const zoomProduct = (actions: AppAction[]) => actions.reduce((p, a) => (a.kind === 'zoom' ? p * a.factor : p), 1);
const kinds = (actions: AppAction[]) => actions.map(a => a.kind);

describe('app phrases sweep 2: undo / redo / select', () => {
  it.each([
    ['son işlemi geri almak istiyorum', [{ kind: 'undo' }]],
    ['geri alınanları geri getir', [{ kind: 'redo' }]],
    ['her şeyi geri al', [{ kind: 'undo', count: 120 }]],
    ['kontrol z', [{ kind: 'undo' }]],
    ['kontrol y', [{ kind: 'redo' }]],
  ])('%s', (text, actions) => {
    expect(ok(text, { scene: tri() }).actions).toEqual(actions);
  });
  it('treats a first-person past sentence with a label as history', () => {
    const r = ok('A noktasını sildim geri al', { scene: tri() });
    expect(r.actions).toEqual([{ kind: 'undo' }]);
    expect(r.sceneChanged).toBe(false);
  });
  it('reads a merged spoken “gerial”', () => {
    expect(ok('gerial', { speech: true }).actions).toEqual([{ kind: 'undo' }]);
  });
  it('undoes twice for a repeated spoken “geri al geri al”', () => {
    const actions = ok('geri al geri al', { speech: true }).actions;
    expect(actions.every(a => a.kind === 'undo')).toBe(true);
    expect(actions.reduce((n, a) => n + (a.kind === 'undo' ? a.count ?? 1 : 0), 0)).toBe(2);
  });
  it('selects everything with a spoken “kontrol a” even when a point is named A', () => {
    const scene = tri();
    expect(ok('kontrol a', { scene, speech: true }).selectedIds).toEqual(scene.map(o => o.id));
  });
});

describe('app phrases sweep 2: tools and dialogs', () => {
  it.each([
    ['buton aracını seç', 'button'],
    ['açıyı ölçme aracı', 'measure_angle'],
    ['uzunluğu ölçme aracı', 'measure_distance'],
    ['üç noktadan çember aracı', 'circle_3points'],
    ['alan hesaplama aracı', 'measure_area'],
    ['eğimi ölçme aracı', 'measure_slope'],
    ['elips aracini secer misin', 'ellipse'],
    ['orta dikme aracina gecelim', 'perp_bisector'],
  ])('%s → %s', (text, tool) => {
    expect(ok(text, { speech: true }).actions).toEqual([{ kind: 'selectTool', tool }]);
  });
  it('opens the function dialog for “fonksiyon yazma ekranını aç”', () => {
    expect(ok('fonksiyon yazma ekranını aç').actions).toEqual([{ kind: 'openDialog', dialog: 'function' }]);
  });
  it('still clears the canvas with “ekranı temizle”', () => {
    expect(ok('ekranı temizle', { scene: tri() }).actions).toEqual([{ kind: 'clearAll' }]);
  });
});

describe('app phrases sweep 2: view, zoom and plane', () => {
  it('shows quadrant names for “bölgelerin isimlerini göster” (not point names)', () => {
    const r = ok('bölgelerin isimlerini göster', { scene: tri() });
    expect(viewPatch(r.actions)).toEqual({ showQuadrants: true });
    expect(r.sceneChanged).toBe(false);
  });
  it('hides only the grid for “koordinat ızgarasını gizle”', () => {
    expect(viewPatch(ok('koordinat ızgarasını gizle').actions)).toEqual({ showGrid: false });
  });
  it.each([
    ['daha yakından göster', 1.2],
    ['büyüt ekranı', 1.2],
    ['görüntüyü küçült', 1 / 1.2],
  ])('%s zooms ×%d', (text, factor) => {
    expect(zoomProduct(ok(text).actions)).toBeCloseTo(factor, 6);
  });
  it('zooms twice for a repeated spoken “yakınlaştır yakınlaştır”', () => {
    expect(zoomProduct(ok('yakınlaştır yakınlaştır', { speech: true }).actions)).toBeCloseTo(1.44, 6);
  });
  it.each(['orijini merkeze al', 'başlangıç noktasına dön', 'ekranı ortala', 'sıfırla görünümü'])('%s resets the view without drawing', text => {
    const r = ok(text, { scene: tri() });
    expect(r.actions).toEqual([{ kind: 'resetView' }]);
    expect(r.sceneChanged).toBe(false);
  });
  it('switches to a blank plane for “beyaz kağıda geç”', () => {
    expect(ok('beyaz kağıda geç').actions[0]).toEqual({ kind: 'planeType', plane: 'bos_duzlem' });
  });
});

describe('app phrases sweep 2: “… geç ve …” sentences that the splitter keeps together', () => {
  it.each([
    ['sade görünüme geç ve ızgarayı gizle', ['styleMode', 'viewport', 'viewport']],
    ['elips aracına geç ve ızgarayı gizle', ['selectTool', 'viewport']],
    ['kareli düzleme geç ve 2 kat yakınlaştır', ['planeType', 'viewport', 'zoom']],
    ['ayrıntılı görünüme geç, koordinatları gizle', ['styleMode', 'viewport', 'viewport']],
    ['pergel aracına geç ve yakınlaştır', ['selectTool', 'zoom']],
    ['boş düzleme geç ve yazıları büyüt', ['planeType', 'viewport', 'styleSettings']],
  ])('%s', (text, expected) => {
    const r = ok(text, { scene: tri() });
    expect(kinds(r.actions)).toEqual(expected);
    expect(r.sceneChanged).toBe(false);
  });
  it('applies both parts in order', () => {
    const r = ok('sade görünüme geç ve ızgarayı gizle');
    expect(viewPatch(r.actions)).toEqual({ showCoordinates: false, showMeasurements: false, showGrid: false });
  });
  it('keeps “ızgarayı ve eksenleri kapat” as one view command', () => {
    expect(ok('ızgarayı ve eksenleri kapat').actions).toEqual([{ kind: 'viewport', patch: { showGrid: false, showAxes: false } }]);
  });
});

describe('app phrases sweep 2: style and help', () => {
  it.each([
    ['yazılar çok küçük büyüt', { fontScale: 1.25 }],
    ['çizgi kalınlığını artır', { strokeScale: 1.5 }],
    ['çizgi kalınlığını azalt', { strokeScale: 0.7 }],
    ['etiketleri büyüt', { pointLabelScale: 1.55 }],
    ['yazıları çok büyüt', { fontScale: 1.5 }],
  ])('%s', (text, patch) => {
    const r = ok(text, { scene: tri() });
    expect(stylePatch(r.actions)).toEqual(patch);
    expect(r.sceneChanged).toBe(false);
  });
  it('sets the global point radius for “nokta boyutunu 10 yap” (points have no own size)', () => {
    expect(stylePatch(ok('nokta boyutunu 10 yap', { scene: tri() }).actions)).toEqual({ pointRadius: 10 });
    const r = run('nokta boyutunu 50 yap', { scene: tri() });
    expect(r.ok).toBe(false);
    expect(r.message).toContain('3 ile 14');
  });
  it.each(['ne söyleyebilirim', 'ne diyebilirim'])('%s opens help', text => {
    expect(ok(text).actions[0].kind).toBe('help');
  });
});
