import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Tuvaldeki DÜĞMELERİN eylemleri (canlandır, izleri temizle, değer ver, göster/gizle). Tuvalin kod kısmı yeniden
 * yazılırken değişmemesi için önceki koda göre kaydedildi.
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
import { SABIT_AN, tuvalKur } from './temelCizimKosumu';

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

const temel = { showLabel: true, color: '#2563eb', visible: true, createdAt: SABIT_AN };
const o = (id: string, type: string, alanlar: Record<string, unknown> = {}) => ({ id, type, label: id, ...temel, ...alanlar }) as unknown as MathObject;

const sahne = (): MathObject[] => [
  o('A', 'point', { x: -3, y: 0, isIndependent: true }), o('B', 'point', { x: 3, y: 0, isIndependent: true }),
  o('ab', 'segment', { startPointId: 'A', endPointId: 'B' }),
  o('P', 'point', { x: 0, y: 0, onObjectId: 'ab', isIndependent: false }),
  o('s', 'slider', { variableName: 's', min: 0, max: 10, step: 1, value: 2, x: -6, y: 4, length: 4 }),
  o('b1', 'button', { x: 4, y: 4, action: { kind: 'animate', targetIds: ['P'] } }),
  o('b2', 'button', { x: 4, y: 3, action: { kind: 'animate', play: true, targetIds: ['P', 'A', 'ab'] } }),
  o('b3', 'button', { x: 4, y: 2, action: { kind: 'animate', play: false } }),
  o('b4', 'button', { x: 4, y: 1, action: { kind: 'clearTraces' } }),
  o('b5', 'button', { x: 4, y: 0, action: { kind: 'setValue', targetId: 's', value: 7 } }),
  o('b6', 'button', { x: 4, y: -1, action: { kind: 'toggle', targetIds: ['B'] } }),
  o('b7', 'button', { x: 4, y: -2, action: { kind: 'setValue', targetId: 'A', value: 5 } }),
];

describe('tuval düğmeleri', () => {
  it('canlandır, değer ver, göster/gizle ve izleri temizle sırayla', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects(sahne(), 'hazır'));
    const bas = (id: string) => {
      const dugme = t.oge((x) => (x.props.obj as { id?: string } | undefined)?.id === id && typeof x.props.onRun === 'function');
      expect(dugme, id).toBeDefined();
      t.yap(() => (dugme!.props.onRun as () => void)());
    };
    const durum = () => {
      const n = (id: string) => t.d.kaynakNesneler.find((x) => x.id === id) as unknown as Record<string, unknown>;
      return {
        oynuyor: t.oge((x) => 'aria-pressed' in x.props && /Animasyonu/.test(String(x.props['aria-label'])))?.props['aria-pressed'],
        P: n('P').animating ?? null,
        A: n('A').animating ?? null,
        ab: n('ab').animating ?? null,
        s: n('s').value,
        B: n('B').visible,
        gecmis: t.gecmis().adimlar.length,
      };
    };
    const adimlar: Record<string, unknown> = { 'başta': durum() };
    for (const id of ['b1', 'b2', 'b3', 'b1', 'b5', 'b7', 'b6', 'b4', 'b6']) {
      bas(id);
      adimlar[`${Object.keys(adimlar).length}. ${id}`] = durum();
    }
    expect(adimlar).toMatchSnapshot();
  });
});
