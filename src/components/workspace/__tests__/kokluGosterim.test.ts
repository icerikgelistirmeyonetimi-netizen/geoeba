import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Etikette köklü gösterim (kullanıcı, 2026-10-30: "köklü gösterim ise tercihe bağlı; metin kutusuna sağ tıklandığında
 * köklü gösterimi aç butonu olmalı menüde"). Ortaokul ve lisede uzunluk varsayılan 2 ondalık; iki ucu kılavuzda olan
 * uzunluğun etiketi sağ tık > "Köklü gösterimi aç" ile √13 br yazılır. Tercih nesnede kalır; ilkokulda yoktur.
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

import type { MathObject, PointObject } from '@/types/math';
import { kademeDuzeyiniAyarla } from '@/hooks/useKademeDuzeyi';
import { parseProjectFile } from '@/math/projectFile';
import type { KademeDuzeyi } from '../kademeDuzeyleri';
import { kokluEtiketUclari, kokluEtiketleriGuncelle, kokluGosterimAcik, kokluGosterimSunulur } from '../kokluGosterim';
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
const nk = (id: string, x: number, y: number) => o(id, 'point', { x, y, isIndependent: true }) as PointObject;

// E(5; −3) – F(7; 0): √13; A(0; 0) – B(3; 4): 5; K(0; 0) – L(1,5; 2): kılavuz dışı
const noktalar = [nk('E', 5, -3), nk('F', 7, 0), nk('A', 0, 0), nk('B', 3, 4), nk('L', 1.5, 2)];
const sahne = (ek: Record<string, unknown> = {}): MathObject[] => [
  ...noktalar,
  o('ef', 'segment', { label: '[EF]', startPointId: 'E', endPointId: 'F', showLength: true, ...ek }),
  o('ab', 'segment', { label: '[AB]', startPointId: 'A', endPointId: 'B', showLength: true }),
  o('al', 'segment', { label: '[AL]', startPointId: 'A', endPointId: 'L', showLength: true }),
];
const nokta = (id: string) => noktalar.find((p) => p.id === id);

type Madde = { id: string; label: string; onSelect?: () => void };

/** Parçanın uzunluk etiketindeki yazı */
function etiketMetni(t: ReturnType<typeof tuvalKur>, kimlik: string, kind = 'length'): string | undefined {
  return t.oge((x) => x.props['data-label-object'] === kimlik && x.props['data-label-kind'] === kind)?.props['data-label-text'] as string | undefined;
}

/** Parçanın uzunluk etiketine sağ tıklar; açılan menünün maddeleri */
function etiketMenusu(t: ReturnType<typeof tuvalKur>, kimlik: string, kind = 'length'): Madde[] {
  const grup = t.oge((x) => x.props['data-object-id'] === kimlik && typeof x.props.onContextMenu === 'function');
  if (!grup) throw new Error(`${kimlik} grubu yok`);
  const nitelikler: Record<string, string> = { 'data-label-kind': kind, 'data-label-object': kimlik, 'data-label-text': etiketMetni(t, kimlik, kind) ?? '' };
  const etiketDugumu = { getAttribute: (a: string) => nitelikler[a] ?? null };
  const hedef = {
    tagName: 'text', hasAttribute: () => false, getAttribute: () => null, parentElement: null,
    closest: (secici: string) => (secici === '[data-label-kind]' ? etiketDugumu : null),
  };
  t.yap(() => (grup.props.onContextMenu as (e: unknown) => void)({ preventDefault() {}, stopPropagation() {}, clientX: 400, clientY: 300, target: hedef, currentTarget: hedef }));
  const menu = t.oge((x) => x.props.ariaLabel === 'Çizim alanı')!;
  expect(menu.props.open).toBe(true);
  return menu.props.items as Madde[];
}

describe('kokluGosterim: kurallar', () => {
  it('uçlar: parça / doğru / ışın uzunluğu, çokgen kenarı, uzaklık ölçümü', () => {
    expect(kokluEtiketUclari(sahne()[5], 'length', nokta)?.map((p) => p.id)).toEqual(['E', 'F']);
    const cokgen = o('p', 'polygon', { pointIds: ['A', 'E', 'F'] });
    expect(kokluEtiketUclari(cokgen, 'edge2', nokta)?.map((p) => p.id)).toEqual(['F', 'A']);
    expect(kokluEtiketUclari(cokgen, 'edge3', nokta)).toBeNull();
    expect(kokluEtiketUclari(o('m', 'measurement', { kind: 'distance', pointIds: ['E', 'F'] }), 'measure', nokta)?.map((p) => p.id)).toEqual(['E', 'F']);
    expect(kokluEtiketUclari(o('m', 'measurement', { kind: 'slope', pointIds: ['E', 'F'] }), 'measure', nokta)).toBeNull();
    expect(kokluEtiketUclari(cokgen, 'area', nokta)).toBeNull();
  });

  it('yalnız kılavuzdaki ve tam kare olmayan uzunlukta sunulur', () => {
    const [, , , , , ef, ab, al] = sahne();
    expect(kokluGosterimSunulur(ef, 'length', nokta)).toBe(true);
    expect(kokluGosterimSunulur(ab, 'length', nokta)).toBe(false);
    expect(kokluGosterimSunulur(al, 'length', nokta)).toBe(false);
  });

  it('tercih açılır, kapanır; boş kalınca alan silinir', () => {
    expect(kokluEtiketleriGuncelle(undefined, 'length', true)).toEqual(['length']);
    expect(kokluEtiketleriGuncelle(['edge0'], 'edge1', true)).toEqual(['edge0', 'edge1']);
    expect(kokluEtiketleriGuncelle(['edge0', 'edge1'], 'edge0', false)).toEqual(['edge1']);
    expect(kokluEtiketleriGuncelle(['length'], 'length', false)).toBeUndefined();
    expect(kokluGosterimAcik(o('s', 'segment', { kokluEtiketler: ['length'] }), 'length')).toBe(true);
    expect(kokluGosterimAcik(o('s', 'segment'), 'length')).toBe(false);
  });

  it('proje dosyası tercihi korur; tanınmayan anahtar düşer', () => {
    const dosya = (kokluEtiketler: unknown) => ({ version: 1, objects: [...noktalar, o('ef', 'segment', { startPointId: 'E', endPointId: 'F', kokluEtiketler })] });
    const ef = (d: ReturnType<typeof dosya>) => parseProjectFile(d as never).objects.find((x) => x.id === 'ef')!;
    expect(ef(dosya(['length', 'edge2', 'measure'])).kokluEtiketler).toEqual(['length', 'edge2', 'measure']);
    expect(ef(dosya(['length', 'area', 'length'])).kokluEtiketler).toEqual(['length']);
    expect(ef(dosya(['area'])).kokluEtiketler).toBeUndefined();
    expect(() => ef(dosya('length'))).toThrow();
  });
});

describe('tuvalde köklü gösterim tercihi', () => {
  it.each<KademeDuzeyi>(['ortaokul', 'lise'])('%s: varsayılan ondalık; sağ tık > "Köklü gösterimi aç" √13 br yazar, "kapat" geri alır', (kademe) => {
    kademeDuzeyiniAyarla(kademe);
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne(), 'hazır'));
    expect(etiketMetni(t, 'ef')).toBe('≈ 3,61 br');
    const ac = etiketMenusu(t, 'ef').find((m) => m.id === 'koklu-gosterim')!;
    expect(ac.label).toBe('Köklü gösterimi aç');
    t.yap(() => ac.onSelect!());
    expect(t.d.kaynakNesneler.find((x) => x.id === 'ef')?.kokluEtiketler).toEqual(['length']);
    expect(etiketMetni(t, 'ef')).toBe('√13 br');
    const kapat = etiketMenusu(t, 'ef').find((m) => m.id === 'koklu-gosterim')!;
    expect(kapat.label).toBe('Köklü gösterimi kapat');
    t.yap(() => kapat.onSelect!());
    expect(t.d.kaynakNesneler.find((x) => x.id === 'ef')?.kokluEtiketler).toBeUndefined();
    expect(etiketMetni(t, 'ef')).toBe('≈ 3,61 br');
  });

  it('tam kare ve kılavuz dışındaki uzunlukta menüde yok', () => {
    kademeDuzeyiniAyarla('lise');
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne(), 'hazır'));
    expect(etiketMenusu(t, 'ab').some((m) => m.id === 'koklu-gosterim')).toBe(false);
    expect(etiketMenusu(t, 'al').some((m) => m.id === 'koklu-gosterim')).toBe(false);
  });

  it('elle yazılmış etiket metninde sunulmaz', () => {
    kademeDuzeyiniAyarla('lise');
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne({ labelTexts: { length: 'hipotenüs' } }), 'hazır'));
    expect(etiketMenusu(t, 'ef').some((m) => m.id === 'koklu-gosterim')).toBe(false);
  });

  it('ilkokulda menüde yok; kayıtlı tercih de uygulanmaz ("yaklaşık 4 br")', () => {
    kademeDuzeyiniAyarla('ilkokul');
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne({ kokluEtiketler: ['length'] }), 'hazır'));
    expect(etiketMetni(t, 'ef')).toBe('yaklaşık 4 br');
    expect(etiketMenusu(t, 'ef').some((m) => m.id === 'koklu-gosterim')).toBe(false);
  });

  it('çentikler tercihten bağımsız: biri köklü, biri ondalık yazılan iki √13 aynı çentiği alır', () => {
    kademeDuzeyiniAyarla('lise');
    const t = tuvalKur();
    // F(7; 0) – G(9; 3) de √13 ve EF'ye F'de değer
    t.yap((d) => d.addObjects([...sahne({ kokluEtiketler: ['length'] }), nk('G', 9, 3), o('fg', 'segment', { startPointId: 'F', endPointId: 'G', showLength: true })], 'hazır'));
    expect(etiketMetni(t, 'ef')).toBe('√13 br');
    expect(etiketMetni(t, 'fg')).toBe('≈ 3,61 br');
    // Çentik katmanı alt bileşendir: çizilecek işaretler onun `isaretler` özelliğindedir
    const katman = t.oge((x) => Array.isArray(x.props.isaretler) && (x.props.isaretler as { tur: string }[]).some((m) => m.tur === 'duz'));
    const centikler = Object.fromEntries((katman?.props.isaretler as { sahipId: string; sayi: number }[] ?? []).map((m) => [m.sahipId, m.sayi]));
    expect(centikler).toEqual({ ef: 1, fg: 1 });
  });
});
