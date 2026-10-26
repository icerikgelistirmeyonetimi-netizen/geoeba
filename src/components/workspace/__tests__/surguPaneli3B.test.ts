import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * 3B görünümün sürgü paneli (SurguPaneli3B): başlık, satırlar, sürükleme ve klavyeyle değer, ekle düğmesi, bağ zinciri,
 * kademeye göre gizlenme.
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

import type { MathObject, PointObject, SliderObject } from '@/types/math';
import { kademeDuzeyiniAyarla } from '@/hooks/useKademeDuzeyi';
import { bindSliderProperty } from '@/math/sliderBindings';
import { SurguSatiri } from '../SurguPaneli3B';
import { bilesen, durula, ogeBul, tarayiciOrtamiKur, type AgacOgesi } from './kancaKosumu';
import { SABIT_AN, surguPaneliKur } from './temelCizimKosumu';

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

const temel = { showLabel: true, color: '#7c3aed', visible: true, createdAt: SABIT_AN };
const A: PointObject = { id: 'A', type: 'point', label: 'A', x: 2, y: 1, isIndependent: true, ...temel };
const a: SliderObject = { id: 'sa', type: 'slider', label: 'a', variableName: 'a', min: -5, max: 5, step: 1, value: 2, ...temel };
const b: SliderObject = { id: 'sb', type: 'slider', label: 'b', variableName: 'b', min: 0, max: 10, step: 0.5, value: 4, ...temel };

/** Paneldeki satırı (alt bileşen) çizer ve ağacını döndürür */
function satiriCiz(k: ReturnType<typeof surguPaneliKur>, id: string) {
  const oge = k.oge((o) => o.type === SurguSatiri && (o.props.s as SliderObject).id === id)!;
  const satir = bilesen(`satir-${id}`, SurguSatiri as (p: Record<string, unknown>) => unknown, oge.props, { efektler: false });
  durula([satir], k.kaydet);
  return { agac: satir.sonuc, bul: (kosul: (o: AgacOgesi) => boolean) => ogeBul(satir.sonuc, kosul) };
}

describe('3B sürgü paneli', () => {
  it('başlık ve her görünür sürgü için bir satır', () => {
    const k = surguPaneliKur([A, a, b, { ...b, id: 'gizli', variableName: 'g', visible: false }]);
    expect(k.oge((o) => o.props['data-surgu-paneli-3b'] === '')).toBeDefined();
    expect(JSON.stringify(k.oge((o) => o.type === 'header')!.props.children)).toContain('Sürgüler');
    const satirlar: string[] = [];
    ogeBul(k.agac(), (o) => { if (o.type === SurguSatiri) satirlar.push((o.props.s as SliderObject).id); return false; });
    expect(satirlar).toEqual(['sa', 'sb']);
  });

  it('çubuğa basıp sürükleyince değer adıma oturarak değişir, bırakınca tek geçmiş adımı yazılır', () => {
    const k = surguPaneliKur([A, b]);
    const { bul } = satiriCiz(k, 'sb');
    const svg = bul((o) => o.type === 'svg')!;
    (svg.ref as { current: unknown }).current = { getBoundingClientRect: () => ({ left: 100, top: 0 }) };
    const olay = (clientX: number) => ({ button: 0, pointerId: 1, clientX, preventDefault() {}, currentTarget: { setPointerCapture() {} } });
    const once = k.gecmis().adimlar.length;
    // Çubuk 14 px'ten başlar, 150 px uzunluğunda; 0…10 aralığı
    k.yap(() => (svg.props.onPointerDown as (e: unknown) => void)(olay(100 + 14 + 75)));
    expect((k.d.kaynakNesneler.find((n) => n.id === 'sb') as SliderObject).value).toBe(5);
    k.yap(() => (svg.props.onPointerMove as (e: unknown) => void)(olay(100 + 14 + 100)));
    expect((k.d.kaynakNesneler.find((n) => n.id === 'sb') as SliderObject).value).toBe(6.5);
    k.yap(() => (svg.props.onPointerUp as (e: unknown) => void)(olay(100 + 14 + 100)));
    expect(k.gecmis().adimlar.length).toBe(once + 1);
    expect(k.gecmis().adimlar.at(-1)).toBe('b = 6,5');
  });

  it('klavyeyle ok tuşları bir adım değiştirir', () => {
    const k = surguPaneliKur([A, a]);
    const svg = satiriCiz(k, 'sa').bul((o) => o.type === 'svg')!;
    expect(svg.props.role).toBe('slider');
    k.yap(() => (svg.props.onKeyDown as (e: unknown) => void)({ key: 'ArrowRight', preventDefault() {} }));
    expect((k.d.kaynakNesneler.find((n) => n.id === 'sa') as SliderObject).value).toBe(3);
  });

  it('bağlı sürgüde zincir bağlı görünür ve tıklanınca bağı geçici kapatır; ekle düğmesi sürgü penceresini açar', () => {
    const k = surguPaneliKur(bindSliderProperty([A, a] as MathObject[], 'sa', 'A', 'x', () => 'yeni'));
    const zincir = satiriCiz(k, 'sa').bul((o) => typeof o.props['data-kaydirici-bagi'] === 'string')!;
    expect(zincir.props['data-kaydirici-bagi']).toBe('bagli');
    k.yap(() => (zincir.props.onClick as () => void)());
    expect((k.d.kaynakNesneler.find((n) => n.id === 'sa') as SliderObject).suspendedBinding).toEqual({ objectId: 'A', propertyKey: 'x' });
    const ekle = k.oge((o) => o.props['aria-label'] === 'Sürgü ekle')!;
    k.yap(() => (ekle.props.onClick as () => void)());
    expect(k.d.isSliderDialogOpen).toBe(true);
  });

  it('ilkokulda sürgü yokken panel hiç görünmez; ortaokulda sürgüsüz de ekle düğmesiyle görünür', () => {
    kademeDuzeyiniAyarla('ilkokul');
    expect(surguPaneliKur([A]).agac()).toBeNull();
    kademeDuzeyiniAyarla('ortaokul');
    const k = surguPaneliKur([A]);
    expect(k.oge((o) => o.props['aria-label'] === 'Sürgü ekle')).toBeDefined();
  });
});
