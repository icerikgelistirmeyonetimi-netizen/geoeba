import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Tuvaldeki nesnelerin SAĞ TIK MENÜSÜ: hangi nesnede hangi maddeler (sırası, ayırıcıları, işaretleri, alt menüleri)
 * çıkıyor. Tuvalin kod kısmı yeniden yazılırken menü değişmemeli; kayıt önceki koda göre alındı. Maddelerin işlevleri
 * kendi testlerinde sınanır; burada yalnız menünün kuruluşu kaydedilir (canlandırma maddeleri ayrıca çalıştırılır).
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
import type { KademeDuzeyi } from '../kademeDuzeyleri';
import { tarayiciOrtamiKur } from './kancaKosumu';
import { SABIT_AN, tuvalKur } from './temelCizimKosumu';

let ortamiGeriAl: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(SABIT_AN);
  ortamiGeriAl = tarayiciOrtamiKur();
  kademeDuzeyiniAyarla('tum');
});
afterEach(() => {
  kademeDuzeyiniAyarla('tum');
  ortamiGeriAl();
  vi.useRealTimers();
});

const temel = { showLabel: true, color: '#2563eb', visible: true, createdAt: SABIT_AN };
const o = (id: string, type: string, alanlar: Record<string, unknown> = {}) => ({ id, type, label: id, ...temel, ...alanlar }) as unknown as MathObject;
const nk = (id: string, x: number, y: number, ek: Record<string, unknown> = {}) => o(id, 'point', { x, y, isIndependent: true, ...ek });

const sahne = (): MathObject[] => [
  nk('A', -4, -2), nk('B', 2, -2), nk('C', 0, 3),
  o('ab', 'segment', { label: '[AB]', startPointId: 'A', endPointId: 'B' }),
  nk('P', -1, -2, { onObjectId: 'ab', isIndependent: false }),
  nk('Q', 1, -2, { onObjectId: 'ab', isIndependent: false, animating: true }),
  nk('T', 4, 4, { showTrace: true }),
  o('poly', 'polygon', { label: 'ABC', pointIds: ['A', 'B', 'C'] }),
  nk('M', 6, 0), nk('R', 8, 0),
  o('c1', 'circle', { label: 'Ç1', centerPointId: 'M', radiusPointId: 'R' }),
  o('sa', 'slider', { label: 'a', variableName: 'a', min: 0, max: 5, step: 1, value: 2, x: -8, y: 5, length: 4 }),
  o('sb', 'slider', { label: 'b', variableName: 'b', min: 1, max: 6, step: 1, value: 3, x: -8, y: 3, length: 4, bindingTarget: { objectId: 'poly', propertyKey: 'edge:0' } }),
  o('fn', 'function', { label: 'f(x) = a*x', expression: 'a*x' }),
  o('txt', 'text', { label: 'Not', text: 'Not', x: -6, y: -5 }),
  o('ln', 'line', { label: 'BC', point1Id: 'B', point2Id: 'C' }),
  o('aA', 'angle', { label: 'BAC', point1Id: 'B', vertexPointId: 'A', point3Id: 'C' }),
  nk('K', -6, 1), nk('L', -3, 1),
  o('sr', 'slider', { label: 'α', variableName: 'α', min: 0, max: 360, step: 1, value: 40, x: -8, y: 1, length: 4 }),
  nk('L2', -3.7, 2.9, { isIndependent: false, construction: { kind: 'rotate', sourceId: 'L', centerId: 'K', degrees: 40, sliderId: 'sr', sliderVariableName: 'α' } }),
  o('aK', 'angle', { label: 'LKL2', point1Id: 'L', vertexPointId: 'K', point3Id: 'L2' }),
];

type Madde = { id: string; label: string; danger?: boolean; separatorBefore?: boolean; disabled?: boolean; checked?: boolean; radio?: boolean; submenu?: Madde[] };
const duz = (m: Madde): Record<string, unknown> => ({
  id: m.id,
  label: m.label,
  ...(m.danger ? { danger: true } : {}),
  ...(m.separatorBefore ? { ayirici: true } : {}),
  ...(m.disabled ? { disabled: true } : {}),
  ...(m.checked !== undefined ? { checked: m.checked } : {}),
  ...(m.radio ? { radio: true } : {}),
  ...(m.submenu ? { submenu: m.submenu.map(duz) } : {}),
});

/** Nesnenin tuvaldeki grubuna sağ tıklar; açılan menünün maddelerini döndürür */
function menuyuAc(t: ReturnType<typeof tuvalKur>, kimlik: string, etiket = 'path') {
  const grup = t.oge((x) => x.props['data-object-id'] === kimlik && typeof x.props.onContextMenu === 'function');
  if (!grup) throw new Error(`${kimlik} grubu yok`);
  const hedef = { tagName: etiket, closest: () => null, hasAttribute: () => false, getAttribute: () => null, parentElement: null };
  t.yap(() => (grup.props.onContextMenu as (e: unknown) => void)({ preventDefault() {}, stopPropagation() {}, clientX: 400, clientY: 300, target: hedef, currentTarget: hedef }));
  const menu = t.oge((x) => x.props.ariaLabel === 'Çizim alanı')!;
  expect(menu.props.open).toBe(true);
  return { baslik: menu.props.title, maddeler: (menu.props.items as Madde[]).map(duz), ham: menu.props.items as Madde[] };
}

describe('sağ tık menüsü (kayıt)', () => {
  it.each([
    ['tum', 'P'], ['tum', 'Q'], ['tum', 'T'], ['tum', 'A'], ['tum', 'ab'], ['tum', 'poly'], ['tum', 'c1'], ['tum', 'sa'], ['tum', 'sb'],
    ['tum', 'fn'], ['tum', 'txt'], ['tum', 'ln'], ['tum', 'aA'], ['tum', 'aK'],
    ['ilkokul', 'poly'], ['ilkokul', 'A'], ['ortaokul', 'P'], ['lise', 'sb'],
  ] as [KademeDuzeyi, string][])('%s: %s', (kademe, kimlik) => {
    kademeDuzeyiniAyarla(kademe);
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne(), 'hazır'));
    const { baslik, maddeler } = menuyuAc(t, kimlik, 'text');
    expect({ baslik, maddeler }).toMatchSnapshot();
  });
});

describe('sağ tık menüsü: canlandırma ve sürgü oynatma maddeleri', () => {
  it('üzerindeki noktada "Animasyonu Başlat" canlandırmayı açar, açıkken "Durdur" kapatır', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne(), 'hazır'));
    const baslat = menuyuAc(t, 'P', 'text').ham.find((m) => m.id === 'canlandirma') as Madde & { onSelect: () => void };
    expect(baslat.label).toBe('Animasyonu Başlat');
    t.yap(() => baslat.onSelect());
    expect(t.d.kaynakNesneler.find((n) => n.id === 'P')).toMatchObject({ animating: true });
    const durdur = menuyuAc(t, 'Q', 'text').ham.find((m) => m.id === 'canlandirma') as Madde & { onSelect: () => void };
    expect(durdur.label).toBe('Animasyonu Durdur');
    t.yap(() => durdur.onSelect());
    expect(t.d.kaynakNesneler.find((n) => n.id === 'Q')).toMatchObject({ animating: false });
  });

  it('serbest noktada canlandırma maddesi yok', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne(), 'hazır'));
    expect(menuyuAc(t, 'A', 'text').ham.some((m) => m.id === 'canlandirma')).toBe(false);
  });
});

describe('sağ tık menüsü: Sürgüye bağla', () => {
  it('doğru parçasında "Uzunluk" yeni kaydırıcı oluşturup bağlar; parça yerinde kalır, tek geçmiş adımı', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne(), 'hazır'));
    const madde = menuyuAc(t, 'ab').ham.find((m) => m.id === 'surguye-bagla') as Madde & { submenu: (Madde & { onSelect: () => void })[] };
    expect(madde.submenu.map((m) => m.label)).toEqual(['Uzunluk']);
    const onceki = t.gecmis().adimlar.length;
    t.yap(() => madde.submenu[0].onSelect());
    const yeni = t.d.kaynakNesneler.find((n) => n.type === 'slider' && n.bindingTarget?.objectId === 'ab') as unknown as Record<string, unknown>;
    expect(yeni).toMatchObject({ variableName: 'c', min: 1, max: 10, step: 1, value: 6, bindingTarget: { objectId: 'ab', propertyKey: 'length' } });
    expect(t.d.kaynakNesneler.find((n) => n.id === 'A')).toMatchObject({ x: -4, y: -2 });
    expect(t.d.kaynakNesneler.find((n) => n.id === 'B')).toMatchObject({ x: 2, y: -2 });
    expect(t.gecmis().adimlar.length).toBe(onceki + 1);
    expect(t.gecmis().adimlar.at(-1)).toBe('c kaydırıcısı eklendi ve bağlandı ([AB] doğru parçası, Uzunluk)');
  });

  it('noktada madde yok: koordinat kaydırıcıya bağlanmaz', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne(), 'hazır'));
    expect(menuyuAc(t, 'B', 'text').ham.some((m) => m.id === 'surguye-bagla')).toBe(false);
  });

  it('ilkokulda madde yok (kaydırıcı aracı yok)', () => {
    kademeDuzeyiniAyarla('ilkokul');
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne(), 'hazır'));
    expect(menuyuAc(t, 'ab').ham.some((m) => m.id === 'surguye-bagla')).toBe(false);
  });
});
