import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Karakterizasyon: temel çizim araçlarının 2B tuvaldeki (Canvas) fare akışları GERÇEK Canvas + WorkspaceProvider
 * üzerinde: sürükleyerek doğru parçası ve çember, kısa sürüklemenin tıklamaya dönüşmesi, noktaya basarak çizim,
 * önizleme yazıları ve kademeye göre yuvarlama. Beklenen değerler yeniden düzenlemeden ÖNCEKİ koddan kaydedildi.
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

import type { KademeDuzeyi } from '../kademeDuzeyleri';
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
  kademeDuzeyiniAyarla('tum');
  ortamiGeriAl();
  vi.useRealTimers();
});

/** Önizleme etiketleri: "… br" ya da "r = …" yazıları */
const olcuYazilari = (yazilar: string[]) => yazilar.filter((y) => /br\b|^r = /.test(y));

function izgarasiz(k: ReturnType<typeof tuvalKur>) {
  k.yap((d) => d.setViewport((v) => ({ ...v, snapToGrid: false })));
}

describe('Doğru Parçası: sürükleyerek', () => {
  it('ızgaraya yapışırken: uçlar ızgarada, önizleme uzunluğu yazar, bırakınca iki nokta ve parça tek adımda', () => {
    const k = tuvalKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('segment'));
    k.bas({ x: 1.1, y: 0.9 });
    k.tasi({ x: 4.2, y: 5.1 });
    expect(olcuYazilari(k.yazilar())).toMatchSnapshot('önizleme');
    k.birak();
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('nesneler');
    expect(k.gecmis()).toMatchSnapshot('geçmiş');
    expect(k.d.pendingPointIds).toEqual([]);
    k.yap((d) => d.undoWorkspace());
    expect(k.d.kaynakNesneler).toEqual([]);
    k.yap((d) => d.redoWorkspace());
    expect(k.d.kaynakNesneler).toHaveLength(3);
  });

  it('ızgarasız: uç nokta önizlemedeki yuvarlanmış uzunluğa oturur', () => {
    const k = tuvalKur();
    const ad = kimlikAdlandirici();
    izgarasiz(k);
    k.yap((d) => d.setActiveTool('segment'));
    k.bas({ x: 0.13, y: 0.27 });
    k.tasi({ x: 3.41, y: 2.08 });
    expect(olcuYazilari(k.yazilar())).toMatchSnapshot('önizleme');
    k.birak();
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('nesneler');
    expect(k.gecmis().adimlar).toMatchSnapshot('geçmiş');
  });

  it('kısa sürükleme (0,4 br altı) tıklama sayılır: iki tıklama parçayı kurar', () => {
    const k = tuvalKur();
    const ad = kimlikAdlandirici();
    izgarasiz(k);
    k.yap((d) => d.setActiveTool('segment'));
    k.bas({ x: 0, y: 0 });
    k.tasi({ x: 0.2, y: 0.1 });
    k.birak();
    expect(ad.kimlikler(k.d.pendingPointIds)).toEqual(['pt#1']);
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('ilk tıklama');
    k.tasi({ x: 2, y: 3 });
    expect(olcuYazilari(k.yazilar())).toMatchSnapshot('lastik bant önizlemesi');
    k.bas({ x: 3, y: -1 });
    k.birak();
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('parça');
    expect(k.gecmis().adimlar).toMatchSnapshot('geçmiş');
  });

  it('var olan noktalara basarak parça', () => {
    const k = tuvalKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('point'));
    k.bas({ x: 0, y: 0 });
    k.bas({ x: 3, y: 2 });
    const [A, B] = k.d.kaynakNesneler.map((o) => o.id);
    k.yap((d) => d.setActiveTool('segment'));
    k.noktayaBas(A);
    expect(k.d.pendingPointIds).toEqual([A]);
    k.noktayaBas(B);
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('nesneler');
    expect(k.gecmis().adimlar).toMatchSnapshot('geçmiş');
  });
});

describe.each<[KademeDuzeyi, boolean]>([
  ['tum', true],
  ['tum', false],
  ['ortaokul', false],
  ['ortaokul', true],
  ['ilkokul', true],
])('Çember: sürükleyerek (kademe %s, ızgara %s)', (kademe, izgara) => {
  it('merkez basılan yerde, yarıçap kademenin yuvarlamasıyla sabit; önizleme aynı yarıçapı yazar', () => {
    kademeDuzeyiniAyarla(kademe);
    const k = tuvalKur();
    const ad = kimlikAdlandirici();
    if (!izgara) izgarasiz(k);
    k.yap((d) => d.setActiveTool('circle'));
    k.bas({ x: 0.31, y: -0.22 });
    k.tasi({ x: 2.64, y: 1.33 });
    expect(olcuYazilari(k.yazilar())).toMatchSnapshot('önizleme');
    const onizleme = k.oge((o) => o.type === 'circle' && o.props.strokeDasharray === '4,4');
    expect(onizleme?.props.r).toMatchSnapshot('önizleme yarıçapı (px)');
    k.birak();
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('nesneler');
    expect(k.gecmis().adimlar).toMatchSnapshot('geçmiş');
  });
});

describe('Çember: tıkla-tıkla', () => {
  it('kısa sürükleme merkezi bekletir; lastik bant yarıçapı yazar; ikinci tıklama yarıçap noktasıyla çember kurar', () => {
    const k = tuvalKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('circle'));
    k.bas({ x: 1, y: 1 });
    k.birak();
    expect(k.d.pendingPointIds).toHaveLength(1);
    k.tasi({ x: 3.5, y: 2.2 });
    expect(olcuYazilari(k.yazilar())).toMatchSnapshot('lastik bant');
    k.bas({ x: 4, y: 1 });
    k.birak();
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('nesneler');
  });

  it('ilkokulda lastik bant yarıçapı tam sayı ve "yaklaşık" der', () => {
    kademeDuzeyiniAyarla('ilkokul');
    const k = tuvalKur();
    k.yap((d) => d.setActiveTool('circle'));
    k.bas({ x: 0, y: 0 });
    k.birak();
    k.tasi({ x: 2.3, y: 1.1 });
    expect(olcuYazilari(k.yazilar())).toMatchSnapshot('lastik bant');
  });
});

describe('basınca çizen araçlar (sürükleme yok)', () => {
  it('Nokta: boş tuvale basış ızgaraya oturan nokta', () => {
    const k = tuvalKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('point'));
    k.bas({ x: 1.12, y: -2.93 });
    k.birak();
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('nokta');
  });

  it.each(['line', 'ray'])('%s: iki basış; ikinci noktaya imleç gelince lastik bant uzunluğu yazar', (arac) => {
    const k = tuvalKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool(arac as 'line'));
    k.bas({ x: -1, y: 0 });
    k.birak();
    k.tasi({ x: 2, y: 4 });
    expect(olcuYazilari(k.yazilar())).toMatchSnapshot('lastik bant');
    k.bas({ x: 2, y: 4 });
    k.birak();
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('nesneler');
  });

  it('Çokgen: üç basış ve ilk köşeye basış', () => {
    const k = tuvalKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('polygon'));
    k.bas({ x: 0, y: 0 });
    k.bas({ x: 3, y: 0 });
    k.bas({ x: 0, y: 2 });
    k.tasi({ x: 1, y: 1 });
    // Önizleme: konan köşeler ve imlece uzanan kenar
    expect(k.oge((o) => o.type === 'path' && o.props.stroke === '#10b981')).toBeTruthy();
    k.noktayaBas(k.d.pendingPointIds[0]);
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('nesneler');
  });

  it('Ölçülü Doğru Parçası: basış noktayı kaydeder ve pencereyi açar', () => {
    const k = tuvalKur();
    k.yap((d) => d.setActiveTool('segment_length'));
    k.bas({ x: 2, y: 2 });
    expect(k.d.kaynakNesneler.map((o) => o.type)).toEqual(['point']);
    expect(k.d.valuePrompt?.title).toBe('Uzunluğu Verilen Doğru Parçası');
  });

  it('Düzgün Çokgen: basış diyaloğu basılan yerde açar', () => {
    const k = tuvalKur();
    k.yap((d) => d.setActiveTool('regular_polygon'));
    k.bas({ x: -3.2, y: 1.4 });
    expect(k.d.isRegularPolygonDialogOpen).toBe(true);
    expect(k.d.regularPolygonPos).toEqual({ x: -3, y: 1 });
    expect(k.d.kaynakNesneler).toEqual([]);
  });

  it('şeklin kenarına basış (nokta üreten araç) noktayı kenara koyar', () => {
    const k = tuvalKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('segment'));
    k.bas({ x: 0, y: 0 });
    k.tasi({ x: 4, y: 0 });
    k.birak();
    const parca = k.d.kaynakNesneler.find((o) => o.type === 'segment')!;
    k.yap((d) => d.setActiveTool('line'));
    const oge = k.oge((o) => o.props['data-object-id'] === parca.id && typeof o.props.onPointerDown === 'function');
    expect(oge).toBeTruthy();
    // Parçanın gövdesine bas: nokta kenara oturur ve doğrunun ilk noktası olur
    const svg = k.oge((o) => o.type === 'svg')!;
    const hedef = { ...(svg.ref as { current: object }).current, tagName: 'line' };
    (oge!.props.onPointerDown as (e: unknown) => void)({
      clientX: 600 + 1.5 * k.d.viewport.zoom, clientY: 350 - 0.1 * k.d.viewport.zoom, button: 0, target: hedef, currentTarget: hedef,
      shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, pointerId: 1, pointerType: 'mouse', preventDefault() {}, stopPropagation() {},
    });
    k.yap(() => {});
    expect(ad.belge(k.d.kaynakNesneler.slice(3))).toMatchSnapshot('kenardaki nokta');
    expect(ad.kimlikler(k.d.pendingPointIds)).toEqual(['pt#1']);
  });
});
