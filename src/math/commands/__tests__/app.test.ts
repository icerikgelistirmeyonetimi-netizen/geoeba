import { describe, expect, it, vi } from 'vitest';
import type { MathObject, ViewportTransform } from '@/types/math';

// Diğer aileler paralel yazılıyor: kayıt dosyası yüklenmesin, testler yalnızca bu ailenin işleyicileriyle çalışsın.
vi.mock('../handlers', () => ({ HANDLERS: [], COMMAND_CATALOG: [] }));
import { DEFAULT_STYLE_SETTINGS, type StyleSettings } from '@/types/workspace';
import { handlers } from '../handlers/app';
import { TOOLS } from '../handlers/app/tools';
import { DEFAULT_VIEWPORT } from '../handlers/app/shared';
import { toolActions } from '../handlers/app/toolHandlers';
import { rankHandlers } from '../engine';
import { parseClause, splitClauses } from '../text';
import { CommandScene } from '../scene';
import type { AppAction, EngineOptions } from '../types';
import { build, expectFail, expectOk, runWith } from './helpers';

const triangleScene = () => build(s => {
  const a = s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  const b = s.addPoint({ x: 4, y: 0 }, { label: 'B' });
  const c = s.addPoint({ x: 0, y: 3 }, { label: 'C' });
  s.addPolygon([a.id, b.id, c.id], { kind: 'triangle' });
});
const vp = (patch: Partial<ViewportTransform> = {}): ViewportTransform => ({ ...DEFAULT_VIEWPORT, ...patch });
const opts = (patch: Partial<ViewportTransform> = {}): EngineOptions => ({ viewport: vp(patch) });
const withStyle = (style: Partial<StyleSettings>, patch: Partial<ViewportTransform> = {}) => ({ viewport: vp(patch), styleSettings: style }) as EngineOptions;

/** Uygulama ailesinin bir cümleye verdiği en yüksek puan (0 = ait değil). */
function score(text: string, scene: MathObject[] = []): number {
  const s = new CommandScene(scene);
  const clause = parseClause(text, s.known());
  return Math.max(0, ...handlers.map(h => h.match(clause, s)));
}
function actionsOf(text: string, scene: MathObject[] = [], selection: string[] = [], options: EngineOptions = opts()): AppAction[] {
  const r = expectOk(handlers, text, scene, selection, options);
  expect(r.sceneChanged).toBe(false);
  expect(r.objects).toBe(scene);
  return r.actions;
}
const patchOf = (text: string, options: EngineOptions = opts()) => {
  const actions = actionsOf(text, [], [], options).filter((a): a is Extract<AppAction, { kind: 'viewport' }> => a.kind === 'viewport');
  return Object.assign({}, ...actions.map(a => a.patch)) as Partial<ViewportTransform>;
};
const stylePatch = (text: string, options: EngineOptions = opts()) => {
  const actions = actionsOf(text, [], [], options).filter((a): a is Extract<AppAction, { kind: 'styleSettings' }> => a.kind === 'styleSettings');
  expect(actions.length).toBeGreaterThan(0);
  return Object.assign({}, ...actions.map(a => a.patch)) as Partial<StyleSettings>;
};

describe('app: every example runs without touching the scene', () => {
  const cases = handlers.flatMap(h => h.examples.map(example => [h.id, example] as const));
  it('has 6–20 examples per handler', () => {
    for (const h of handlers) {
      expect(h.examples.length, h.id).toBeGreaterThanOrEqual(6);
      expect(h.examples.length, h.id).toBeLessThanOrEqual(20);
    }
  });
  it.each(cases)('%s: %s', (id, example) => {
    const scene = triangleScene();
    const selection = [scene[3].id];
    const r = expectOk(handlers, example, scene, selection, opts());
    expect(r.sceneChanged).toBe(false);
    expect(r.objects).toBe(scene);
    expect(r.message.length).toBeGreaterThan(5);
    const clauses = splitClauses(example);
    const s = new CommandScene(scene, selection, opts());
    // "… geç ve …" artık bölücüde ayrılır; birleşik işleyici bölünmeyen cümleler için yedektir: her parça yine bu ailede olmalı.
    if (id === 'app.compound' && clauses.length > 1) {
      for (const part of clauses) expect(rankHandlers(parseClause(part, s.known()), s, handlers)[0]?.handler.id, part).toBeDefined();
      return;
    }
    const top = rankHandlers(parseClause(clauses[clauses.length - 1], s.known()), s, handlers)[0];
    expect(top.handler.id).toBe(id);
  });
});

describe('app: undo / redo', () => {
  it.each([
    ['geri al', { kind: 'undo' }],
    ['Geri al lütfen', { kind: 'undo' }],
    ['geri alır mısın?', { kind: 'undo' }],
    ['2 adım geri al', { kind: 'undo', count: 2 }],
    ['iki kez geri al', { kind: 'undo', count: 2 }],
    ['son üç işlemi geri al', { kind: 'undo', count: 3 }],
    ['son 5 değişikliği geri al', { kind: 'undo', count: 5 }],
    ['bir adım geri al', { kind: 'undo' }],
    ['önceki adıma dön', { kind: 'undo' }],
    ['tüm işlemleri geri al', { kind: 'undo', count: 120 }],
    ['yinele', { kind: 'redo' }],
    ['ileri al', { kind: 'redo' }],
    ['3 kez yinele', { kind: 'redo', count: 3 }],
    ['geri alınanı yinele', { kind: 'redo' }],
    ['geri almayı geri al', { kind: 'redo' }],
    ['son işlemi yeniden yap', { kind: 'redo' }],
  ])('%s', (text, action) => {
    expect(actionsOf(text)).toEqual([action]);
  });
  it('reports the number of steps', () => {
    expect(runWith(handlers, '2 adım geri al').ok && expectOk(handlers, '2 adım geri al').message).toBe('Son 2 işlem geri alındı.');
    expect(expectOk(handlers, 'yinele').message).toBe('Geri alınan işlem yinelendi.');
  });
  it('rejects invalid step counts', () => {
    expect(expectFail(handlers, '0 adım geri al')).toContain('1 ile 120');
    expect(expectFail(handlers, '2,5 adım yinele')).toContain('tam sayı');
    expect(expectFail(handlers, '500 kez geri al')).toContain('120');
  });
  it('runs several history steps in order', () => {
    expect(actionsOf('geri al sonra yinele')).toEqual([{ kind: 'undo' }, { kind: 'redo' }]);
  });
  it('does not treat object phrases as history', () => {
    expect(score('üçgeni tekrar yap')).toBe(0);
    expect(score("A'yı geri al", triangleScene())).toBe(0);
    expect(score('geri alma')).toBe(0);
  });
});

describe('app: clear all and select all', () => {
  it.each(['tümünü sil', 'tuvali temizle', 'her şeyi sil', 'hepsini sil', 'ekranı temizle', 'tüm şekilleri sil', 'bütün çizimi sil', 'sayfayı temizle', 'sıfırdan başla', 'Tuvali tamamen temizler misin'])('%s asks for confirmation', text => {
    const scene = triangleScene();
    const r = expectOk(handlers, text, scene);
    expect(r.actions).toEqual([{ kind: 'clearAll' }]);
    expect(r.objects).toBe(scene);
    expect(r.message).toContain('onay');
    expect(r.message).toContain('4 nesne');
  });
  it('says the canvas is already empty', () => {
    const r = expectOk(handlers, 'tuvali temizle');
    expect(r.actions).toEqual([]);
    expect(r.message).toBe('Tuval zaten boş.');
  });
  it.each(['tüm çemberleri sil', 'seçilileri sil', 'A noktasını sil', 'son çizileni sil', 'ABC üçgenini sil'])('leaves “%s” to the edit family', text => {
    expect(score(text, triangleScene())).toBe(0);
  });
  it.each(['tümünü seç', 'hepsini seç', 'her şeyi seç', 'tüm nesneleri seç', 'bütün şekilleri seç', 'hepsini seçer misin'])('%s selects every object', text => {
    const scene = triangleScene();
    const r = expectOk(handlers, text, scene);
    expect(r.selectedIds).toEqual(scene.map(o => o.id));
    expect(r.actions).toEqual([]);
    expect(r.message).toBe('Tüm nesneler seçildi (4 nesne).');
  });
  it('selects all and continues with another clause', () => {
    const scene = triangleScene();
    const r = expectOk(handlers, 'tümünü seç ve ızgarayı gizle', scene, [], opts());
    expect(r.selectedIds).toHaveLength(4);
    expect(r.actions).toEqual([{ kind: 'viewport', patch: { showGrid: false } }]);
  });
  it.each(['seçimi kaldır', 'seçimi temizle', 'seçimi iptal et', 'seçimden çık', 'hiçbir şeyi seçme'])('%s clears the selection', text => {
    const scene = triangleScene();
    const r = expectOk(handlers, text, scene, [scene[0].id, scene[3].id]);
    expect(r.selectedIds).toEqual([]);
    expect(r.message).toBe('Seçim kaldırıldı.');
  });
  it('does not take specific selections', () => {
    expect(score("ABC'yi seç", triangleScene())).toBe(0);
    expect(score('A noktasını seç', triangleScene())).toBe(0);
    expect(score('tüm çemberleri seç', triangleScene())).toBe(0);
  });
  it('handles an empty canvas', () => {
    expect(expectOk(handlers, 'tümünü seç').message).toBe('Tuvalde seçilecek nesne yok.');
  });
});

describe('app: tools', () => {
  it('mirrors the toolbar definitions', async () => {
    const { TOOL_GROUPS } = await import('@/components/workspace/toolDefinitions');
    const toolbar = TOOL_GROUPS.flatMap(g => g.tools).map(t => ({ id: t.id, name: t.name, description: t.description }));
    expect(TOOLS.map(t => ({ id: t.id, name: t.name, description: t.description }))).toEqual(toolbar);
  });
  it.each(TOOLS.map(t => [t.name, t.id] as const))('“%s aracını seç” opens %s', (name, id) => {
    const tool = TOOLS.find(t => t.id === id)!;
    const r = expectOk(handlers, `${name} aracını seç`);
    expect(r.actions).toEqual(toolActions(tool));
    expect(r.message).toContain(tool.name);
  });
  it.each([
    ['uzunluk ölç aracı', 'measure_distance'],
    ['uzunluk ölçme aracını aç', 'measure_distance'],
    ['trig oranlar aracını aç', 'trig_ratios'],
    ['trigonometrik oranlar aracını seç', 'trig_ratios'],
    ['trig oranları aç', 'trig_ratios'],
    ['açıölçer', 'measure_angle'],
    ['açıölçer aracını seç', 'measure_angle'],
    ['açı ölçeri aç', 'measure_angle'],
    ['iletkiyi getir', 'measure_angle'],
    ['açı oluştur aracına geç', 'angle'],
    ['pergeli aç', 'compass'],
    ['pergel', 'compass'],
    ['kalemi aç', 'pen'],
    ['kalemle çizmek istiyorum', 'pen'],
    ['serbest çizime geç', 'pen'],
    ['cetveli getir', 'ruler'],
    ['bana cetvel ver', 'ruler'],
    ['gönyeyi getir', 'setsquare'],
    ['silgiyi seç', 'delete'],
    ['el aracını seç', 'pan'],
    ['3 noktalı çember aracını aç', 'circle_3points'],
    ['üç noktalı çember aracına geç', 'circle_3points'],
    ['yarıçapla çember aracını seç', 'circle_radius'],
    ['doğru parçası aracını kullan', 'segment'],
    ['doğru aracını seç', 'line'],
    ['orta dikme aracına geç', 'perp_bisector'],
    ['kesişim aracını aç', 'intersect'],
    ['birimle ölç aracını seç', 'unit_measure'],
    ['alanı modelle aracını aç', 'area_model'],
    ['Seç ve Taşı aracını seç', 'select'],
    ['Trig. Oranlar aracını seç', 'trig_ratios'],
    ['yay ölç aracını seç', 'measure_arc'],
    ['Yay Ölç aracını seç', 'measure_arc'],
    ['yay ölçme aracını aç', 'measure_arc'],
    ['yay aracını seç', 'arc'],
  ])('%s → %s', (text, id) => {
    expect(actionsOf(text)).toEqual([{ kind: 'selectTool', tool: id }]);
  });
  it('maps dialog tools like WorkspaceView.activateTool', () => {
    expect(actionsOf('Fonksiyon aracını seç')).toEqual([{ kind: 'openDialog', dialog: 'function' }]);
    expect(actionsOf('kaydırıcı aracını aç')).toEqual([{ kind: 'openDialog', dialog: 'slider' }]);
    expect(actionsOf('Düzgün Çokgen aracını seç')).toEqual([{ kind: 'selectTool', tool: 'regular_polygon' }, { kind: 'openDialog', dialog: 'regularPolygon' }]);
    expect(actionsOf('Yarıçapla Çember aracını seç')).toEqual([{ kind: 'selectTool', tool: 'circle_radius' }]);
  });
  it('explains the tool it opened', () => {
    expect(expectOk(handlers, 'Elips aracını seç').message).toBe('Elips aracı açıldı. Tuvalde sürükleyin; sürüklediğiniz kutuya içten teğet elips çizilir.');
    expect(expectOk(handlers, 'Fonksiyon aracını seç').message).toContain('Fonksiyon penceresi açıldı');
  });
  it('fails helpfully for unknown tools', () => {
    expect(expectFail(handlers, 'ejderha aracını seç')).toContain('Elips aracını seç');
  });
  it.each(['çember çiz', 'elips çiz', 'pergelle A merkezli çember çiz', 'çember aracıyla çember çiz', "AB'yi cetvelle ölç", 'görsel ekle', 'yazı ekle', 'kaydırıcı ekle', 'açıyı ölç', 'trigonometrik oranları göster'])('does not open a tool for “%s”', text => {
    const scene = build(s => { s.addPoint({ x: 0, y: 0 }, { label: 'A' }); s.addPoint({ x: 3, y: 0 }, { label: 'B' }); });
    expect(score(text, scene)).toBeLessThan(35);
  });
});

describe('app: dialogs', () => {
  it.each([
    ['Fonksiyon penceresini aç', ['function']],
    ['grafik penceresini aç', ['function']],
    ['Kaydırıcı penceresini aç', ['slider']],
    ['kaydırıcı penceresini göster', ['slider']],
    ['Yarıçapla çember penceresini aç', ['circleRadius']],
  ])('%s', (text, dialogs) => {
    expect(actionsOf(text)).toEqual(dialogs.map(dialog => ({ kind: 'openDialog', dialog })));
  });
  it('opens the regular polygon dialog with its tool', () => {
    expect(actionsOf('Düzgün çokgen penceresini aç')).toEqual([{ kind: 'selectTool', tool: 'regular_polygon' }, { kind: 'openDialog', dialog: 'regularPolygon' }]);
  });
  it('asks which dialog', () => {
    expect(expectFail(handlers, 'pencereyi aç')).toContain('Fonksiyon penceresini aç');
  });
});

describe('app: view toggles', () => {
  it.each([
    ['ızgarayı gizle', { showGrid: false }],
    ['ızgarayı göster', { showGrid: true }],
    ['ızgarayı kapat', { showGrid: false }],
    ['ızgara çizgilerini kaldır', { showGrid: false }],
    ['eksenleri gizle', { showAxes: false }],
    ['koordinat eksenlerini göster', { showAxes: true }],
    ['x ve y eksenlerini gizle', { showAxes: false }],
    ['koordinatları gizle', { showCoordinates: false }],
    ['nokta koordinatlarını göster', { showCoordinates: true }],
    ['ızgaraya yapıştır', { snapToGrid: true }],
    ['noktaları ızgaraya yapıştır', { snapToGrid: true }],
    ['ızgaraya yapıştırmayı kapat', { snapToGrid: false }],
    ['siyah beyaz görünüme geç', { blackWhite: true }],
    ['siyah-beyaz yap', { blackWhite: true }],
    ['renkli görünüme dön', { blackWhite: false }],
    ['siyah beyazı kapat', { blackWhite: false }],
    ['tüm ölçümleri gizle', { showMeasurements: false }],
    ['ızgarayı ve eksenleri gizle', { showGrid: false, showAxes: false }],
    ['ızgarayı, eksenleri ve koordinatları göster', { showGrid: true, showAxes: true, showCoordinates: true }],
  ])('%s', (text, patch) => {
    expect(patchOf(text)).toEqual(patch);
  });
  it('toggles from the current viewport', () => {
    expect(patchOf('ızgarayı aç kapa', opts({ showGrid: true }))).toEqual({ showGrid: false });
    expect(patchOf('ızgarayı aç kapa', opts({ showGrid: false }))).toEqual({ showGrid: true });
    expect(patchOf('ızgara', opts({ showGrid: false }))).toEqual({ showGrid: true });
    expect(patchOf('çeyrek bölgeler', opts({ showQuadrants: true }))).toEqual({ showQuadrants: false });
  });
  it('shows axes together with quadrant names', () => {
    const r = expectOk(handlers, 'çeyrek bölgeleri göster', [], [], opts({ showAxes: false }));
    expect(r.actions).toEqual([{ kind: 'viewport', patch: { showQuadrants: true, showAxes: true } }]);
    expect(r.message).toBe('Çeyrek bölge adları ve eksenler gösterildi.');
  });
  it('switches to detailed mode when measurements are shown', () => {
    expect(actionsOf('ölçümleri göster')).toEqual([{ kind: 'viewport', patch: { showMeasurements: true } }, { kind: 'styleMode', mode: 'Ayrıntılı' }]);
  });
  it('writes a readable message', () => {
    expect(expectOk(handlers, 'ızgarayı ve eksenleri gizle', [], [], opts()).message).toBe('Izgara ve eksenler gizlendi.');
    expect(expectOk(handlers, 'ızgaraya yapıştırmayı kapat', [], [], opts()).message).toBe('Izgaraya yapıştırma kapatıldı.');
  });
  it('splits separate view commands', () => {
    expect(actionsOf('ızgarayı gizle ve eksenleri göster')).toEqual([{ kind: 'viewport', patch: { showGrid: false } }, { kind: 'viewport', patch: { showAxes: true } }]);
  });
  it('rejects negated view commands', () => {
    expect(expectFail(handlers, 'ızgarayı gizleme')).toContain('Olumsuz');
  });
  it.each(['x eksenine göre yansıt', 'y eksenine göre yansımasını göster', 'A noktasının koordinatlarını göster', "ABC'nin ölçümlerini gizle", 'x eksenini kestiği noktayı bul', 'tümünü gizle'])('does not take “%s”', text => {
    expect(score(text, triangleScene())).toBe(0);
  });
});

describe('app: zoom, fit, reset and pan', () => {
  const zoomOf = (text: string, options: EngineOptions = opts()) => {
    const actions = actionsOf(text, [], [], options);
    expect(actions).toHaveLength(1);
    const a = actions[0];
    if (a.kind !== 'zoom') throw new Error(`zoom bekleniyordu: ${JSON.stringify(a)}`);
    return a.factor;
  };
  it.each([
    ['yakınlaştır', 1.2],
    ['uzaklaştır', 1 / 1.2],
    ['biraz yakınlaştır', 1.1],
    ['biraz uzaklaştır', 1 / 1.1],
    ['2 kat yakınlaştır', 2],
    ['iki kat uzaklaştır', 0.5],
    ['3 kez yakınlaştır', 1.728],
    ['3 kez uzaklaştır', 1 / 1.728],
    ['yüzde 150 yakınlaştır', 1.5],
    ['%20 yakınlaştır', 1.2],
    ['yüzde 20 uzaklaştır', 0.8],
    ['görünümü büyüt', 1.2],
    ['ekranı küçült', 1 / 1.2],
    ['yakınlaştırır mısın', 1.2],
  ])('%s → ×%d', (text, factor) => {
    expect(zoomOf(text)).toBeCloseTo(factor, 6);
  });
  it('describes the zoom', () => {
    expect(expectOk(handlers, '2 kat yakınlaştır').message).toBe('Görünüm 2 kat yakınlaştırıldı.');
    expect(expectOk(handlers, 'uzaklaştır').message).toBe('Görünüm 1,2 kat uzaklaştırıldı.');
  });
  it('does nothing at the zoom limits', () => {
    const r = expectOk(handlers, 'yakınlaştır', [], [], opts({ zoom: 300 }));
    expect(r.actions).toEqual([]);
    expect(r.message).toContain('en yakın');
    expect(expectOk(handlers, 'uzaklaştır', [], [], opts({ zoom: 5 })).message).toContain('en uzak');
  });
  it('rejects invalid factors', () => {
    expect(expectFail(handlers, '0 kat yakınlaştır')).toContain('2 kat yakınlaştır');
    expect(expectFail(handlers, '1 kat yakınlaştır')).toContain('1’den farklı');
    expect(expectFail(handlers, '50 kez uzaklaştır')).toContain('1 ile 20');
  });
  it.each([
    ['görünümü sıfırla', 'resetView'],
    ['yakınlaştırmayı sıfırla', 'resetView'],
    ['varsayılan görünüme dön', 'resetView'],
    ['orijine dön', 'resetView'],
    ['orijini ortala', 'resetView'],
    ['hepsini ekrana sığdır', 'fitView'],
    ['sığdır', 'fitView'],
    ['çizimi ortala', 'fitView'],
    ['tümünü ekranda göster', 'fitView'],
  ])('%s → %s', (text, kind) => {
    expect(actionsOf(text, triangleScene())).toEqual([{ kind }]);
  });
  it('zooms to a named triangle like fitToObjects', () => {
    const scene = triangleScene();
    const r = expectOk(handlers, 'ABC üçgenine yakınlaştır', scene, [], opts({ width: 1200, height: 700 }));
    const action = r.actions[0];
    if (action.kind !== 'viewport') throw new Error('viewport bekleniyordu');
    const z = Math.min(1200 / 7, 700 / 6);
    expect(action.patch.zoom).toBeCloseTo(z, 6);
    expect(action.patch.panX).toBeCloseTo(-2 * z, 6);
    expect(action.patch.panY).toBeCloseTo(1.5 * z, 6);
    // Kutu merkezi (2; 1,5) ekranın ortasına düşer.
    expect(600 + action.patch.panX! + 2 * action.patch.zoom!).toBeCloseTo(600, 6);
    expect(350 + action.patch.panY! - 1.5 * action.patch.zoom!).toBeCloseTo(350, 6);
    expect(r.selectedIds).toEqual([scene[3].id]);
    expect(r.message).toBe('Görünüm ABC üzerine yakınlaştırıldı.');
  });
  it('centres on a point without changing the zoom', () => {
    const r = expectOk(handlers, "B noktasını ortala", triangleScene(), [], opts({ zoom: 60 }));
    expect(r.actions).toEqual([{ kind: 'viewport', patch: { zoom: 60, panX: -240, panY: 0 } }]);
    expect(r.message).toBe('Görünüm B üzerine ortalandı.');
  });
  it('focuses on the selection', () => {
    const scene = triangleScene();
    // C (0; 3) tek nokta: kutu en az 3 × 3 (1,5 kenar payı), yakınlaştırma yükseklikle sınırlı.
    const r = expectOk(handlers, 'seçili nesneye odaklan', scene, [scene[2].id], opts({ width: 1200, height: 700 }));
    expect(r.actions).toHaveLength(1);
    const action = r.actions[0];
    if (action.kind !== 'viewport') throw new Error('viewport bekleniyordu');
    expect(action.patch.zoom).toBeCloseTo(700 / 3, 6);
    expect(Object.is(action.patch.panX, 0)).toBe(true);
    expect(action.patch.panY).toBeCloseTo(700, 6);
    expect(r.selectedIds).toEqual([scene[2].id]);
  });
  it('fails for unknown or missing targets', () => {
    expect(expectFail(handlers, 'Z noktasına yakınlaştır', triangleScene())).toContain('Z');
    expect(expectFail(handlers, 'seçili nesneye odaklan', triangleScene())).toContain('ortala');
  });
  it.each([
    ['tuvali 3 birim sağa kaydır', { panX: 132 }],
    ['görünümü 2 birim yukarı kaydır', { panY: -88 }],
    ['ekranı aşağı kaydır', { panY: 176 }],
    ['tuvali sola kaydır', { panX: -308 }],
  ])('%s', (text, patch) => {
    expect(patchOf(text, opts({ zoom: 44, width: 1200, height: 700 }))).toEqual(patch);
  });
  it('keeps edits of objects out of panning', () => {
    expect(score("ABC'yi 2 birim sağa kaydır", triangleScene())).toBe(0);
    expect(score('ABC üçgenini 2 kat büyüt', triangleScene())).toBe(0);
  });
});

describe('app: view mode and plane type', () => {
  it.each([
    ['sade görünüme geç', [{ kind: 'styleMode', mode: 'Sade' }, { kind: 'viewport', patch: { showCoordinates: false, showMeasurements: false } }]],
    ['görünümü sadeleştir', [{ kind: 'styleMode', mode: 'Sade' }, { kind: 'viewport', patch: { showCoordinates: false, showMeasurements: false } }]],
    ['ayrıntılı görünüme geç', [{ kind: 'styleMode', mode: 'Ayrıntılı' }, { kind: 'viewport', patch: { showCoordinates: true, showMeasurements: true } }]],
    ['detaylı moda geç', [{ kind: 'styleMode', mode: 'Ayrıntılı' }, { kind: 'viewport', patch: { showCoordinates: true, showMeasurements: true } }]],
    ['kareli düzleme geç', [{ kind: 'planeType', plane: 'kareli_duzlem' }, { kind: 'viewport', patch: { showGrid: true, showAxes: false, showCoordinates: false } }]],
    ['kareli kağıt olsun', [{ kind: 'planeType', plane: 'kareli_duzlem' }, { kind: 'viewport', patch: { showGrid: true, showAxes: false, showCoordinates: false } }]],
    ['boş düzlem yap', [{ kind: 'planeType', plane: 'bos_duzlem' }, { kind: 'viewport', patch: { showGrid: false, showAxes: false, showCoordinates: false } }]],
    ['dik koordinat düzlemine geç', [{ kind: 'planeType', plane: 'dik_koordinat' }, { kind: 'viewport', patch: { showGrid: true, showAxes: true, showCoordinates: true } }]],
    ['koordinat sistemini göster', [{ kind: 'planeType', plane: 'dik_koordinat' }, { kind: 'viewport', patch: { showGrid: true, showAxes: true, showCoordinates: true } }]],
    ['koordinat sistemini gizle', [{ kind: 'planeType', plane: 'bos_duzlem' }, { kind: 'viewport', patch: { showGrid: false, showAxes: false, showCoordinates: false } }]],
  ])('%s', (text, actions) => {
    expect(actionsOf(text)).toEqual(actions);
  });
  it('does not confuse squares with the grid paper', () => {
    expect(score('kare çiz')).toBe(0);
    expect(score('kenarı 4 olan kare oluştur')).toBe(0);
  });
});

describe('app: style settings', () => {
  it.each([
    ['yazıları büyüt', { fontScale: 1.25 }],
    ['tüm yazıları küçült', { fontScale: 0.8 }],
    ['yazıları çok büyüt', { fontScale: 1.5 }],
    ['yazı boyutunu 1,5 yap', { fontScale: 1.5 }],
    ['yazı ölçeğini 1,5 yap', { fontScale: 1.5 }],
    ['kalınlığı normale döndür', { strokeScale: 1 }],
    ['çizgilerin kalınlığını 2,5 yap', { strokeScale: 2.5 }],
    ['yazıları 3 kat büyüt', { fontScale: 2 }],
    ['noktaları küçült', { pointRadius: 4 }],
    ['noktaları büyüt', { pointRadius: 8 }],
    ['nokta boyutunu 8 piksel yap', { pointRadius: 8 }],
    ['noktaları 3 piksel büyüt', { pointRadius: 9 }],
    ['çizgileri kalınlaştır', { strokeScale: 1.5 }],
    ['çizgileri incelt', { strokeScale: 0.7 }],
    ['çizgi kalınlığını 2 yap', { strokeScale: 2 }],
    ['çizgileri 2 kat kalınlaştır', { strokeScale: 2 }],
    ['nokta adlarını büyüt', { pointLabelScale: 1.25 }],
    ['ölçüm yazılarını küçült', { measurementScale: 0.8 }],
    ['eksen sayılarını büyüt', { axisScale: 1.25 }],
    ['dolguları kaldır', { hideFills: true }],
    ['tüm şekillerin dolgularını gizle', { hideFills: true }],
    ['dolguları geri getir', { hideFills: false }],
    ['etiket kutularını gizle', { hideLabelBoxes: true }],
    ['etiket kutularını göster', { hideLabelBoxes: false }],
    ['stili sıfırla', { ...DEFAULT_STYLE_SETTINGS }],
  ])('%s', (text, patch) => {
    expect(stylePatch(text)).toEqual(patch);
  });
  it('builds on the current style when the panel passes it', () => {
    expect(stylePatch('yazıları büyüt', withStyle({ fontScale: 1.2 }))).toEqual({ fontScale: 1.5 });
    expect(stylePatch('noktaları küçült', withStyle({ pointRadius: 3.5 }))).toEqual({ pointRadius: 3 });
    const r = expectOk(handlers, 'yazıları büyüt', [], [], withStyle({ fontScale: 2 }));
    expect(r.message).toBe('Tüm yazıların ölçeği zaten en büyük değerde (2).');
  });
  it('splits two targets into two settings', () => {
    expect(actionsOf('yazıları ve noktaları büyüt')).toEqual([{ kind: 'styleSettings', patch: { fontScale: 1.25 } }, { kind: 'styleSettings', patch: { pointRadius: 8 } }]);
  });
  it('explains the value', () => {
    expect(expectOk(handlers, 'nokta boyutunu 8 piksel yap').message).toBe('Nokta yarıçapı 8 piksel olarak ayarlandı.');
    expect(expectOk(handlers, 'dolguları kaldır').message).toContain('dolguları kaldırıldı');
  });
  it('rejects out-of-range values', () => {
    expect(expectFail(handlers, 'yazı boyutunu 0,3 yap')).toContain('0,6 ile 2');
    expect(expectFail(handlers, 'nokta boyutunu 20 yap')).toContain('3 ile 14');
    expect(expectFail(handlers, 'çizgi kalınlığını 9 yap')).toContain('0,5 ile 3');
  });
  it('leaves pixel font sizes to text objects', () => {
    const r = runWith(handlers, 'yazıların boyutunu 20 yap');
    expect(r.ok).toBe(false);
    expect(r.message).toContain('tırnak içindeki metnini');
  });
  it('outranks object edits only for clearly global phrasing', () => {
    expect(score('tüm yazıların boyutunu 1,5 yap')).toBe(91);
    expect(score('noktaların boyutunu 8 piksel yap')).toBe(91);
    expect(score('çizgi kalınlığını 2 yap')).toBe(91);
    expect(score('dolguları kaldır')).toBe(91);
    // 0–2 arası yazı ölçeği bir yazı nesnesinin punto boyutu olamaz: düzenleme ailesinin (89) önüne geçer; piksel boyutları geçmez.
    expect(score('yazı boyutunu 1,5 yap')).toBe(90);
    expect(score('yazı boyutunu 18 yap')).toBe(88);
    // Noktaların tek tek boyutu yoktur: "nokta boyutu" her zaman genel nokta yarıçapıdır (düzenleme ailesinin boyut işleyicisinin, 90, önüne geçer).
    expect(score('nokta boyutunu 8 piksel yap')).toBe(91);
  });
  it('stays below the algebra pen handler for drawing phrases', () => {
    expect(score('kalemle serbest çizim yap')).toBe(11);
    expect(actionsOf('kalemle serbest çizim yap')).toEqual([{ kind: 'selectTool', tool: 'pen' }]);
  });
  it.each(["ABC'yi büyüt", 'noktaları sil', '"Merhaba" yazısını büyüt', 'dolguyu kaldır', 'AB doğrusunu kalınlaştır', 'noktaları kırmızı yap'])('does not take “%s”', text => {
    expect(score(text, triangleScene())).toBe(0);
  });
});

describe('app: help and unsupported requests', () => {
  it.each(['yardım', 'neler yapabilirsin?', 'komut örnekleri', 'hangi komutları yazabilirim', 'yardım et', 'nasıl kullanılır'])('%s lists the categories', text => {
    const r = expectOk(handlers, text);
    expect(r.actions).toEqual([{ kind: 'help' }]);
    expect(r.message).toContain('Yazarak şunları yapabilirsiniz');
    expect(r.message).toContain('dönüşümler');
  });
  it.each([
    ['üçgen komutları neler', 'polygons'],
    ['çember için yardım', 'circles'],
    ['dönüşüm komutları', 'transforms'],
    ['ölçme için örnek komutlar', 'measure'],
    ['kaydırıcı komutları nelerdir', 'algebra'],
    ['görünüm komutları', 'app'],
  ])('%s → %s', (text, topic) => {
    const r = expectOk(handlers, text);
    expect(r.actions).toEqual([{ kind: 'help', topic }]);
    expect(r.message).toContain('örnek komutlar');
  });
  it('lets creation families take “üçgen çizmeme yardım et”', () => {
    expect(score('üçgen çizmeme yardım et')).toBe(10);
  });
  it.each([
    ['çizimi PDF olarak kaydet', 'Dışa aktarma'],
    ['PNG olarak indir', 'Dışa aktarma'],
    ["3D'ye geç", '3D'],
    ['araç çubuğunu gizle', 'Araç çubuğunu'],
  ])('%s explains where to do it', (text, part) => {
    expect(expectFail(handlers, text)).toContain(part);
  });
});

describe('app: ownership', () => {
  it.each([
    'çember çiz', 'A noktasını sil', 'kenarları 3, 4 ve 5 olan üçgen çiz', "ABC'nin alanını hesapla", "AB'nin orta noktasını bul",
    "ABC'yi y eksenine göre yansıt", 'yarıçapı 3 olan çember çiz', 'a = 2', 'f(x) = x^2', "A'yı (3;4)'e taşı", 'A noktasını kırmızı yap',
    'animasyonu başlat', 'noktaları birleştir', "ABC'nin alanını gizle", 'A(2;3) noktası oluştur', 'üçgen çiz', 'ABC açısını ölç',
    "ABC'yi kopyala", 'A noktasını B olarak adlandır', 'AB doğrusunu gizle',
  ])('%s → 0', text => {
    expect(score(text, triangleScene())).toBe(0);
  });
  it('scores inside the application band', () => {
    for (const text of ['geri al', 'tümünü sil', 'tümünü seç', 'Elips aracını seç', 'ızgarayı gizle', 'yakınlaştır', 'sade görünüme geç', 'yazıları büyüt', 'yardım']) {
      const value = score(text);
      expect(value, text).toBeGreaterThanOrEqual(85);
      expect(value, text).toBeLessThanOrEqual(94);
    }
  });
});
