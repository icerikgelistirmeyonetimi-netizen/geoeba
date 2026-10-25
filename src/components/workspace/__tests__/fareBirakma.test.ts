import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Tuvalde fareyi BIRAKMA (ve ona giden basış) davranışı: kalemle çizilen çizginin eklenmesi, kutuyla seçimin sonucu,
 * 3B cisim izdüşümünün sürüklenmesi, metin aracının not penceresini açması. Tuvalin fare işleyicileri yeniden yazılırken
 * değişmemesi için kaydedildi (önceki koda göre).
 */

vi.mock('react', async (gercekModul) => {
  const gercek = await gercekModul<typeof import('react')>();
  const { kancalar } = await import('./kancaKosumu');
  return { ...gercek, ...kancalar, default: { ...gercek, ...kancalar } };
});
vi.mock('@/state/CurriculumContext', async (gercekModul) => ({
  ...(await gercekModul<typeof import('@/state/CurriculumContext')>()),
  useCurriculum: () => ({ selectedActivity: null, selectedLevel: null, selectedGrade: null, isFreeSandbox: true }),
}));
vi.mock('@/state/ThemeContext', async (gercekModul) => ({
  ...(await gercekModul<typeof import('@/state/ThemeContext')>()),
  useTheme: () => ({ theme: 'light', isDark: false, setTheme: () => {}, toggleTheme: () => {} }),
}));

import type { MathObject } from '@/types/math';
import { kademeDuzeyiniAyarla } from '@/hooks/useKademeDuzeyi';
import { tarayiciOrtamiKur } from './kancaKosumu';
import { SABIT_AN, kimlikAdlandirici, tuvalKur } from './temelCizimKosumu';

let ortamiGeriAl: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(SABIT_AN);
  ortamiGeriAl = tarayiciOrtamiKur();
  kademeDuzeyiniAyarla('tum');
});
afterEach(() => {
  ortamiGeriAl();
  vi.useRealTimers();
});

const nk = (id: string, x: number, y: number) =>
  ({ id, type: 'point', label: id, x, y, isIndependent: true, showLabel: true, color: '#2563eb', visible: true, createdAt: SABIT_AN }) as unknown as MathObject;
const parca = (id: string, a: string, b: string) =>
  ({ id, type: 'segment', label: `[${a}${b}]`, startPointId: a, endPointId: b, showLabel: true, color: '#0891b2', visible: true, createdAt: SABIT_AN }) as unknown as MathObject;

describe('kalem', () => {
  it('basıp gezdirip bırakınca serbest çizim eklenir; çizim durur', () => {
    const t = tuvalKur();
    const ad = kimlikAdlandirici();
    t.yap((d) => d.setActiveTool('pen'));
    t.bas({ x: -2, y: 0 });
    t.tasi({ x: -1, y: 1 });
    t.tasi({ x: 0, y: 0.5 });
    t.birak();
    expect({ nesneler: ad.belge(t.d.kaynakNesneler), gecmis: t.gecmis().adimlar }).toMatchSnapshot();
    // Bırakıldıktan sonra gezinmek çizgiyi uzatmaz
    t.tasi({ x: 3, y: 3 });
    expect(t.oge((x) => x.props.stroke === '#e11d48')).toBeUndefined();
  });

  it('gezdirmeden bırakılan tek nokta eklenmez', () => {
    const t = tuvalKur();
    t.yap((d) => d.setActiveTool('pen'));
    t.bas({ x: 1, y: 1 });
    t.birak();
    expect(t.d.kaynakNesneler).toHaveLength(0);
  });
});

describe('kutuyla seçim', () => {
  const sahne = () => [nk('A', -4, 1), nk('B', 0, 3), nk('C', 2, -1), nk('D', 5, 2), parca('ab', 'A', 'B'), parca('cd', 'C', 'D')];

  it('kutunun içine düşenler seçilir; bırakınca kutu kalkar, seçim kalır', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne(), 'hazır'));
    t.yap((d) => d.setActiveTool('select'));
    t.bas({ x: -5, y: 4 });
    t.tasi({ x: 1, y: 0 });
    expect([...t.d.selectedObjectIds].sort()).toEqual(['A', 'B', 'ab']);
    t.birak();
    expect(t.oge((x) => typeof x.props.className === 'string' && x.props.className.includes('marquee-selection-box'))).toBeUndefined();
    expect([...t.d.selectedObjectIds].sort()).toEqual(['A', 'B', 'ab']);
  });

  it('çok küçük kutu seçimi değiştirmez; boş alana basış önceki seçimi bırakır', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne(), 'hazır'));
    t.yap((d) => d.setSelectedObjectIds(['cd']));
    t.yap((d) => d.setActiveTool('select'));
    t.bas({ x: -5, y: 4 });
    t.tasi({ x: -4.98, y: 3.99 });
    expect(t.d.selectedObjectIds).toEqual([]);
    t.birak();
  });
});

describe('metin aracı ve not penceresi', () => {
  const pencere = (t: ReturnType<typeof tuvalKur>) => t.oge((x) => typeof x.props.isOpen === 'boolean' && 'initialText' in x.props)!;

  it('boş tuvale basış pencereyi yeni not için açar; kaydedince not ızgaraya oturan yere eklenir, araç Seç olur', () => {
    const t = tuvalKur();
    const ad = kimlikAdlandirici();
    t.yap((d) => d.setActiveTool('text'));
    t.bas({ x: 1.23, y: -0.48 });
    t.birak();
    expect(pencere(t).props).toMatchObject({ isOpen: true, initialText: '', initialColor: '#0f172a', initialFontSize: 14, onDelete: undefined });
    t.yap(() => (pencere(t).props.onSave as (a: string, b: string, c: number) => void)('Kenarları eşit bir dörtgen', '#123456', 18));
    expect(pencere(t).props.isOpen).toBe(false);
    expect({ nesneler: ad.belge(t.d.kaynakNesneler), gecmis: t.gecmis().adimlar, arac: t.d.activeTool }).toMatchSnapshot();
  });

  it('vazgeçince araç Seç olur ve not eklenmez', () => {
    const t = tuvalKur();
    t.yap((d) => d.setActiveTool('text'));
    t.bas({ x: 0, y: 0 });
    t.birak();
    t.yap(() => (pencere(t).props.onClose as () => void)());
    expect({ acik: pencere(t).props.isOpen, arac: t.d.activeTool, sayi: t.d.kaynakNesneler.length }).toEqual({ acik: false, arac: 'select', sayi: 0 });
  });

  it('nota çift tıklayınca pencere notun değerleriyle açılır; kaydedince not güncellenir, sil düğmesi notu siler', () => {
    const t = tuvalKur();
    const not = { id: 'txt', type: 'text', label: 'Not', text: 'Eski', x: 2, y: 1, fontSize: 16, color: '#dc2626', showLabel: true, visible: true, createdAt: SABIT_AN } as unknown as MathObject;
    t.yap((d) => d.addObjects([not], 'hazır'));
    // Düzenleme aracı değiştirmez (metin aracındayken de)
    t.yap((d) => d.setActiveTool('text'));
    const grup = t.oge((x) => x.props['data-object-id'] === 'txt' && typeof x.props.onDoubleClick === 'function')!;
    t.yap(() => (grup.props.onDoubleClick as (e: unknown) => void)({ stopPropagation() {} }));
    expect(pencere(t).props).toMatchObject({ isOpen: true, initialText: 'Eski', initialColor: '#dc2626', initialFontSize: 16 });
    expect(typeof pencere(t).props.onDelete).toBe('function');
    t.yap(() => (pencere(t).props.onSave as (a: string, b: string, c: number) => void)('Yeni', '#0000ff', 20));
    expect(t.d.kaynakNesneler[0]).toMatchObject({ text: 'Yeni', color: '#0000ff', fontSize: 20, x: 2, y: 1, label: 'Not' });
    expect(t.d.activeTool).toBe('text');
    expect(pencere(t).props.isOpen).toBe(false);
    t.yap(() => (grup.props.onDoubleClick as (e: unknown) => void)({ stopPropagation() {} }));
    t.yap(() => (pencere(t).props.onDelete as () => void)());
    expect({ sayi: t.d.kaynakNesneler.length, acik: pencere(t).props.isOpen }).toEqual({ sayi: 0, acik: false });
  });
});

describe('3B cisim izdüşümü', () => {
  const kup = {
    id: 'kup', type: 'cube', name: 'Küp 1', position: { x: 1, y: 1, z: 0.5 }, dimensions: { width: 2, height: 2, depth: 2 }, rotation: { x: 0, y: 0, z: 0 },
    color: '#3b82f6', opacity: 1, showWireframe: true, showVertices: true, showFaces: true, unfoldProgress: 0, selectedFaceIndex: null,
  };

  it('basıp sürükleyince konum (2 ondalık) cisme yazılır, bırakınca sürükleme biter', () => {
    const konumlar: unknown[] = [];
    const secimler: unknown[] = [];
    let bitti = 0;
    const t = tuvalKur({
      solids: [kup],
      onUpdateSolidPosition: (id: string, konum: unknown) => konumlar.push([id, konum]),
      onSelectSolid: (id: string | null) => secimler.push(id),
      onSelectSolids: (ids: string[]) => secimler.push(ids),
      onDragEnd: () => void (bitti += 1),
    });
    const grup = t.oge((x) => x.props['data-solid-id'] === 'kup')!;
    t.yap(() => (grup.props.onPointerDown as (e: unknown) => void)({ clientX: 644, clientY: 306, button: 0, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, stopPropagation() {}, preventDefault() {}, target: {}, currentTarget: {} }));
    t.tasi({ x: 2.333, y: 1.777 });
    t.tasi({ x: 3.1, y: -0.4 });
    t.birak();
    // Bırakıldıktan sonra gezinmek cismi taşımaz
    t.tasi({ x: 6, y: 6 });
    expect({ konumlar, secimler, bitti }).toMatchSnapshot();
  });
});
