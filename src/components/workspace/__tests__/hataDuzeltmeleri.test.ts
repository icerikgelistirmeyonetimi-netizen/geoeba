import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Regresyon: çizim araçlarında düzeltilen hatalar (cizim-araclari-raporu.md, bölüm 7). Her test düzeltmeden önceki
 * yanlış davranışı değil, düzeltilmiş davranışı açıkça bekler.
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

import type { CircleObject, EllipseObject, MathObject, PointObject, PolygonObject, SectorObject, SegmentObject, SliderObject } from '@/types/math';
import { bindSliderProperty } from '@/math/sliderBindings';
import { duzgunKose } from '@/math/duzgunCokgen';
import { duzMetin, type Dugum } from '@/math/matematikYazimi';
import { calculateDistance } from '@/math/geometry';
import { worldToScreen } from '@/math/coordinates';
import { kademeDuzeyiniAyarla } from '@/hooks/useKademeDuzeyi';
import type { KademeDuzeyi } from '../kademeDuzeyleri';
import { elipsMerkezi } from '../cizimNesneleri';
import { ogeBul, tarayiciOrtamiKur } from './kancaKosumu';
import { SABIT_AN, calismaKur, kaydiriciAyarlariKur, kaydiriciEkleKur, tuvalKur } from './temelCizimKosumu';

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

const nk = (id: string, label: string, x: number, y: number): PointObject => ({
  id, type: 'point', label, showLabel: true, x, y, color: '#000000', visible: true, isIndependent: true, createdAt: SABIT_AN,
});
const parca = (id: string, a: PointObject, b: PointObject): SegmentObject => ({
  id, type: 'segment', label: `[${a.label}${b.label}]`, showLabel: true, startPointId: a.id, endPointId: b.id, color: '#000000', visible: true, createdAt: SABIT_AN,
});
const yeniNesneler = (d: { kaynakNesneler: MathObject[] }, onceki: number) => d.kaynakNesneler.slice(onceki);

describe('1. kısa tıklamada kenara yapışma (Doğru Parçası, Çember) ve noktanın şekle bağlanması', () => {
  const A = nk('pt-a-1-x', 'A', 0, 0);
  const B = nk('pt-b-1-x', 'B', 4, 1);
  const AB = parca('seg-ab-1-x', A, B);
  it.each(['segment', 'circle', 'line', 'ray', 'polygon'] as const)('%s: kenara 10 px uzaktan basış noktayı kenara koyar ve bağlar', (arac) => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, AB], 'hazır'));
    t.yap((d) => d.setActiveTool(arac));
    const n = { x: -1 / Math.hypot(4, 1), y: 4 / Math.hypot(4, 1) };
    const u = 10 / t.d.viewport.zoom;
    t.bas({ x: 2 + n.x * u, y: 0.5 + n.y * u });
    t.birak();
    const [nokta] = yeniNesneler(t.d, 3) as PointObject[];
    expect(nokta).toMatchObject({ type: 'point', x: 2, y: 0.5, onObjectId: AB.id });
  });
});

describe('2. değişiklik üretmeyen işlem geri al geçmişine boş adım yazmaz', () => {
  it('Açıölçer: görünen açıyı yeniden ölçmek yeni adım eklemez', () => {
    const k = calismaKur();
    k.yap((d) => d.addObjects([nk('pt-a-1-x', 'A', 0, 0), nk('pt-b-1-x', 'B', 4, 0), nk('pt-c-1-x', 'C', 0, 3)], 'hazır'));
    k.yap((d) => d.setActiveTool('measure_angle'));
    for (const id of ['pt-b-1-x', 'pt-a-1-x', 'pt-c-1-x']) k.yap((d) => d.handlePointClick(id));
    const adim = k.gecmis().adimlar.length;
    for (const id of ['pt-c-1-x', 'pt-a-1-x', 'pt-b-1-x']) k.yap((d) => d.handlePointClick(id));
    expect(k.gecmis().adimlar.length).toBe(adim);
    expect(k.d.kaynakNesneler.filter((o) => o.type === 'angle')).toHaveLength(1);
  });

  it('Orta Nokta: orta noktası zaten gösterilen parça için yeni adım eklemez', () => {
    const k = calismaKur();
    k.yap((d) => d.addObjects([nk('pt-a-1-x', 'A', 0, 0), nk('pt-b-1-x', 'B', 4, 0)], 'hazır'));
    k.yap((d) => d.setActiveTool('midpoint'));
    for (const id of ['pt-a-1-x', 'pt-b-1-x']) k.yap((d) => d.handlePointClick(id));
    const adim = k.gecmis().adimlar.length;
    for (const id of ['pt-a-1-x', 'pt-b-1-x']) k.yap((d) => d.handlePointClick(id));
    expect(k.gecmis().adimlar.length).toBe(adim);
    expect(k.d.hintMessage).toContain('zaten');
  });
});

describe('3. 3 Noktalı Çember / Yay / Dilim kurulamazsa az önce oluşan nokta kaybolmaz', () => {
  it.each(['circle_3points', 'arc', 'sector'] as const)('%s: doğrudaş ya da aynı noktalarda yeni nokta kaydedilir', (arac) => {
    const k = calismaKur();
    k.yap((d) => d.setActiveTool(arac));
    k.yap((d) => d.handleCanvasClick({ x: 0, y: 0 }));
    k.yap((d) => d.handleCanvasClick({ x: 2, y: 0 }));
    k.yap((d) => d.handleCanvasClick(arac === 'circle_3points' ? { x: 4, y: 0 } : { x: 0, y: 0 }));
    // Üçüncü tıklamanın yarattığı nokta (yay / dilimde merkezle çakışan) kaydedilir, bekleyen kalmaz
    expect(k.d.kaynakNesneler.filter((o) => o.type === 'point')).toHaveLength(3);
    expect(k.d.kaynakNesneler.some((o) => o.type === 'circle' || o.type === 'arc' || o.type === 'sector')).toBe(false);
    expect(k.d.pendingPointIds).toEqual([]);
  });
});

describe('4. Eğim Ölç: AB ile BA aynı eğimdir', () => {
  it('ters sırada yeniden ölçmek ikinci etiket eklemez', () => {
    const k = calismaKur();
    k.yap((d) => d.addObjects([nk('pt-a-1-x', 'A', 0, 0), nk('pt-b-1-x', 'B', 4, 2)], 'hazır'));
    k.yap((d) => d.setActiveTool('measure_slope'));
    for (const id of ['pt-a-1-x', 'pt-b-1-x', 'pt-b-1-x', 'pt-a-1-x']) k.yap((d) => d.handlePointClick(id));
    expect(k.d.kaynakNesneler.filter((o) => o.type === 'measurement')).toHaveLength(1);
    expect(k.d.hintMessage).toBe('BA eğimi zaten ölçülmüş.');
  });
});

describe('5. Şekli Döndür ipucu döndürülebilir her şekli tanır', () => {
  it('doğru parçası seçiliyken "Önce bir şekil seçin" denmez', () => {
    const k = calismaKur();
    const A = nk('pt-a-1-x', 'A', 0, 0);
    const B = nk('pt-b-1-x', 'B', 4, 2);
    k.yap((d) => d.addObjects([A, B, parca('seg-ab-1-x', A, B)], 'hazır'));
    k.yap((d) => d.setActiveTool('rotate'));
    k.yap((d) => d.setSelectedObjectIds(['seg-ab-1-x']));
    k.yap((d) => d.handleCanvasClick({ x: 8, y: 5 }));
    expect(k.d.hintMessage).not.toBe('Önce bir şekil seçin');
    expect(k.d.hintMessage).toContain('döndürme');
  });
});

describe('6. araç değişince yarım kalan çok adımlı etkileşimler bırakılır', () => {
  it('Kesiştir: ilk şekil araç değişince unutulur', () => {
    const t = tuvalKur();
    const [A, B, C, D] = [nk('pt-a-1-x', 'A', 0, 0), nk('pt-b-1-x', 'B', 4, 0), nk('pt-c-1-x', 'C', 2, -2), nk('pt-d-1-x', 'D', 2, 2)];
    t.yap((d) => d.addObjects([A, B, C, D, parca('seg-ab-1-x', A, B), parca('seg-cd-1-x', C, D)], 'hazır'));
    t.yap((d) => d.setActiveTool('intersect'));
    t.nesneyeBas('seg-ab-1-x', { x: 1, y: 0 }, 'line');
    t.yap((d) => d.setActiveTool('select'));
    t.yap((d) => d.setActiveTool('intersect'));
    t.nesneyeBas('seg-cd-1-x', { x: 2, y: 1 }, 'line');
    expect(t.d.kaynakNesneler).toHaveLength(6);
    expect(t.d.hintMessage).toBe('[CD] seçildi. Şimdi kesiştirmek istediğiniz ikinci şekle tıklayın.');
  });

  it('Pergel: iğne konduktan sonra araç değişirse yeniden başlar', () => {
    const t = tuvalKur();
    t.yap((d) => d.setActiveTool('compass'));
    t.bas({ x: 0, y: 0 });
    t.birak();
    t.yap((d) => d.setActiveTool('select'));
    t.yap((d) => d.setActiveTool('compass'));
    t.tasi({ x: 3, y: 0 });
    t.bas({ x: 3, y: 0 });
    t.birak();
    // İğne yeniden kondu: açıklık değil yine ilk adımın ipucu
    expect(t.d.hintMessage).toBe('Açıklığı ayarlayın: İmleci iğneden uzaklaştırıp tıklayın.');
  });
});

describe('7. Elips tıklamayla da çizilir', () => {
  it('boş tuvale tıklama 3 × 2 br elips (dikdörtgenin 6 × 4 kutusuna içten teğet)', () => {
    const k = calismaKur();
    k.yap((d) => d.setActiveTool('ellipse'));
    k.yap((d) => d.handleCanvasClick({ x: 1.2, y: -0.9 }));
    const [merkez, elips] = k.d.kaynakNesneler as [PointObject, EllipseObject];
    expect(merkez).toMatchObject({ type: 'point', x: 1, y: -1 });
    expect(elips).toMatchObject({ type: 'ellipse', centerPointId: merkez.id, radiusX: 3, radiusY: 2, label: 'A Merkezli Elips' });
    expect(k.gecmis().adimlar.at(-1)).toBe('Elips oluşturuldu (a = 3 br, b = 2 br)');
  });

  it('tuvalde kısa basış da elips çizer', () => {
    const t = tuvalKur();
    t.yap((d) => d.setActiveTool('ellipse'));
    t.bas({ x: 2, y: 2 });
    t.birak();
    expect(t.d.kaynakNesneler.map((o) => o.type)).toEqual(['point', 'ellipse']);
  });
});

describe('8. adsız noktada etiket yedekleri', () => {
  it('yarım ad oluşmaz: adı boş uçta araç adı kullanılır', () => {
    const k = calismaKur();
    k.yap((d) => d.addObjects([nk('pt-a-1-x', '', 0, 0), nk('pt-b-1-x', 'B', 3, 0)], 'hazır'));
    for (const [arac, ad] of [['segment', 'Doğru Parçası'], ['line', 'Doğru'], ['ray', 'Işın'], ['circle', 'Çember']] as const) {
      k.yap((d) => d.setActiveTool(arac));
      k.yap((d) => d.handlePointClick('pt-a-1-x'));
      k.yap((d) => d.handlePointClick('pt-b-1-x'));
      expect(k.d.kaynakNesneler.at(-1)?.label).toBe(ad);
    }
  });
});

describe('9. lastik bant önizlemesi tam sayı ölçü ayarına uyar', () => {
  it.each<[KademeDuzeyi, string]>([
    ['tum', 'r = 3 br'],
    ['ortaokul', 'r = 2,77 br'],
    ['ilkokul', 'r = yaklaşık 3 br'],
  ])('%s: %s', (kademe, beklenen) => {
    kademeDuzeyiniAyarla(kademe);
    const t = tuvalKur();
    t.yap((d) => d.setActiveTool('circle'));
    t.bas({ x: 1, y: 1 });
    t.birak();
    t.tasi({ x: 3.5, y: 2.2 });
    expect(t.yazilar()).toContain(beklenen);
  });
});

describe('10. çokgen araçlarında sessiz tıklama kalmadı; doğrudaş köşeler uyarılır', () => {
  it.each(['polygon', 'measure_area', 'measure_perimeter'] as const)('%s', (arac) => {
    const k = calismaKur();
    k.yap((d) => d.addObjects([nk('pt-a-1-x', 'A', 0, 0), nk('pt-b-1-x', 'B', 2, 0), nk('pt-c-1-x', 'C', 4, 0), nk('pt-d-1-x', 'D', 1, 3)], 'hazır'));
    k.yap((d) => d.setActiveTool(arac));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    expect(k.d.hintMessage).toBe('Çokgeni kapatmak için en az üç köşe gerekir.');
    k.yap((d) => d.handlePointClick('pt-b-1-x'));
    k.yap((d) => d.handlePointClick('pt-b-1-x'));
    expect(k.d.hintMessage).toBe('Bu köşe zaten seçili. Şekli kapatmak için ilk köşeye dokunun.');
    k.yap((d) => d.handlePointClick('pt-c-1-x'));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    expect(k.d.hintMessage).toBe('Köşeler aynı doğru üzerinde; çokgen kurulamaz. Doğrunun dışına bir köşe daha ekleyin.');
    expect(k.d.kaynakNesneler.filter((o) => o.type === 'polygon')).toHaveLength(0);
    expect(k.d.pendingPointIds).toEqual(['pt-a-1-x', 'pt-b-1-x', 'pt-c-1-x']);
    // Doğrunun dışına bir köşe eklenince kapanır
    k.yap((d) => d.handlePointClick('pt-d-1-x'));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    expect(k.d.kaynakNesneler.filter((o) => o.type === 'polygon')).toHaveLength(1);
  });
});

describe('11. Ölçülü Doğru Parçası en çok 100 br', () => {
  it('100 br üstü reddedilir, 100 kabul edilir', () => {
    const k = calismaKur();
    k.yap((d) => d.setActiveTool('segment_length'));
    k.yap((d) => d.handleCanvasClick({ x: 0, y: 0 }));
    const istek = k.d.valuePrompt!;
    expect(istek.onSubmit('100,5')).toBe('Uzunluk en çok 100 br olabilir.');
    let sonuc: unknown;
    k.yap(() => {
      sonuc = istek.onSubmit('100');
    });
    expect(sonuc).toBeNull();
  });
});

describe('12. elips önizlemesi oluşan elipsle aynı merkezde', () => {
  it('ızgarasız sürüklemede önizleme merkezi ve yarıçapları = oluşan elips', () => {
    const t = tuvalKur();
    t.yap((d) => d.setViewport((v) => ({ ...v, snapToGrid: false })));
    t.yap((d) => d.setActiveTool('ellipse'));
    t.bas({ x: 0.13, y: 0.27 });
    t.tasi({ x: 3.13, y: 2.27 });
    const onizleme = t.oge((o) => o.type === 'ellipse' && o.props.strokeDasharray === '4,4')!;
    const merkez = worldToScreen(elipsMerkezi(0.13, 0.27, 3, 2), t.d.viewport);
    expect(onizleme.props.cx).toBeCloseTo(merkez.x, 6);
    expect(onizleme.props.cy).toBeCloseTo(merkez.y, 6);
    expect(onizleme.props.rx).toBeCloseTo(1.5 * t.d.viewport.zoom, 6);
    t.birak();
    const nokta = t.d.kaynakNesneler[0] as PointObject;
    expect({ x: nokta.x, y: nokta.y }).toEqual(elipsMerkezi(0.13, 0.27, 3, 2));
  });
});

describe('13. sürükleyerek çizimde parça ve çember aynı yuvarlamayı kullanır', () => {
  it.each<[KademeDuzeyi, number]>([
    ['tum', 4],
    ['ortaokul', 3.7],
  ])('%s: ızgarasız 3,7 br sürükleme → parça %s br', (kademe, beklenen) => {
    kademeDuzeyiniAyarla(kademe);
    const t = tuvalKur();
    t.yap((d) => d.setViewport((v) => ({ ...v, snapToGrid: false })));
    t.yap((d) => d.setActiveTool('segment'));
    t.bas({ x: 0, y: 0 });
    t.tasi({ x: 3.7, y: 0 });
    t.birak();
    const [p1, p2] = t.d.kaynakNesneler as PointObject[];
    expect(calculateDistance(p1, p2)).toBeCloseTo(beklenen, 9);
  });
});

// ------------------------------------------------------------------------------------------------ 25.10.2026 turu

const dilim = (id: string, merkez: PointObject, bas: PointObject, yon: PointObject, ek: Partial<SectorObject> = {}): SectorObject => ({
  id, type: 'sector', label: `${merkez.label} Daire Dilimi`, showLabel: true, centerPointId: merkez.id, startPointId: bas.id,
  directionPointId: yon.id, color: '#10b981', visible: true, createdAt: SABIT_AN, ...ek,
});
/** Tuvaldeki bir ölçü etiketinin görünen düz metni (yoksa null) */
const etiketMetni = (t: ReturnType<typeof tuvalKur>, nesne: string, tur: string): string | null => {
  const g = t.oge((o) => o.props['data-label-object'] === nesne && o.props['data-label-kind'] === tur);
  const m = g && ogeBul(g.props.children, (o) => Array.isArray(o.props.satirlar));
  return m ? duzMetin((m.props.satirlar as Dugum[][])[0]) : null;
};
/** Etiketin ekran merkezi */
const etiketYeri = (t: ReturnType<typeof tuvalKur>, nesne: string, tur: string) => {
  const g = t.oge((o) => o.props['data-label-object'] === nesne && o.props['data-label-kind'] === tur)!;
  const m = ogeBul(g.props.children, (o) => Array.isArray(o.props.satirlar))!;
  return { x: Number(m.props.x), y: Number(m.props.y) };
};

describe('14. yay / dilimin yön noktası yaydan kopmaz', () => {
  const A = nk('pt-a-1-x', 'A', 0, 0);
  const B = nk('pt-b-1-x', 'B', 2, 0);
  const C = nk('pt-c-1-x', 'C', 0, 2);
  const nokta = (k: ReturnType<typeof calismaKur>, id: string) => k.d.kaynakNesneler.find((o) => o.id === id) as PointObject;

  it('başlangıç noktası ya da merkez kayınca yön noktası kendi doğrultusunda yeni yarıçapa gelir', () => {
    const k = calismaKur();
    k.yap((d) => d.addObjects([A, B, C, dilim('sct-1-x', A, B, C)], 'hazır'));
    k.yap((d) => d.updateObject(B.id, { x: 3 } as Partial<MathObject>, true));
    expect(nokta(k, C.id).x).toBeCloseTo(0, 9);
    expect(nokta(k, C.id).y).toBeCloseTo(3, 9);
    k.yap((d) => d.updateObject(A.id, { x: 1 } as Partial<MathObject>, true));
    expect(calculateDistance(nokta(k, A.id), nokta(k, C.id))).toBeCloseTo(calculateDistance(nokta(k, A.id), nokta(k, B.id)), 9);
  });

  it('yön noktası sürüklenince yay boyunca kayar', () => {
    const k = calismaKur();
    k.yap((d) => d.addObjects([A, B, C, dilim('sct-1-x', A, B, C)], 'hazır'));
    k.yap((d) => d.updateObject(C.id, { x: 1, y: 3 } as Partial<MathObject>, true));
    expect(nokta(k, C.id).x).toBeCloseTo(2 / Math.sqrt(10), 9);
    expect(nokta(k, C.id).y).toBeCloseTo(6 / Math.sqrt(10), 9);
  });

  it('başka bir şeklin noktası ya da baştan yayın dışında duran nokta yerinde kalır', () => {
    const k = calismaKur();
    const ucgen: PolygonObject = { id: 'poly-1-x', type: 'polygon', label: 'ABC', showLabel: true, pointIds: [A.id, B.id, C.id], color: '#000000', visible: true, createdAt: SABIT_AN };
    k.yap((d) => d.addObjects([A, B, C, ucgen, dilim('sct-1-x', A, B, C)], 'hazır'));
    k.yap((d) => d.updateObject(B.id, { x: 3 } as Partial<MathObject>, true));
    expect(nokta(k, C.id)).toMatchObject({ x: 0, y: 2 });
    const k2 = calismaKur();
    const D = nk('pt-d-1-x', 'D', 0, 5);
    k2.yap((d) => d.addObjects([A, B, D, dilim('sct-2-x', A, B, D)], 'hazır'));
    k2.yap((d) => d.updateObject(B.id, { x: 3 } as Partial<MathObject>, true));
    expect(nokta(k2, D.id)).toMatchObject({ x: 0, y: 5 });
  });

  it('araçla çizilen dilimde de geçerli (üçüncü nokta yaya konur, sonra yayda kalır)', () => {
    const k = calismaKur();
    k.yap((d) => d.setActiveTool('sector'));
    for (const p of [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 3 }]) k.yap((d) => d.handleCanvasClick(p));
    const s = k.d.kaynakNesneler.find((o) => o.type === 'sector') as SectorObject;
    expect(nokta(k, s.directionPointId)).toMatchObject({ x: 0, y: 2 });
    k.yap((d) => d.updateObject(s.startPointId, { x: 4 } as Partial<MathObject>, true));
    expect(nokta(k, s.directionPointId).y).toBeCloseTo(4, 9);
  });
});

describe('15. yay / dilimde yön noktası merkezle çakışırsa şekil kurulmaz', () => {
  it.each(['arc', 'sector'] as const)('%s', (arac) => {
    const k = calismaKur();
    k.yap((d) => d.setActiveTool(arac));
    for (const p of [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 0 }]) k.yap((d) => d.handleCanvasClick(p));
    expect(k.d.hintMessage).toBe('Üç FARKLI nokta seçmelisiniz.');
    expect(k.d.kaynakNesneler.some((o) => o.type === arac)).toBe(false);
  });
});

describe('16. dilim ve yay etiketleri: ölçtüğü şeyin yanında kısa, ayrılınca tam', () => {
  const A = nk('pt-a-1-x', 'A', 0, 0);
  const B = nk('pt-b-1-x', 'B', 2, 0);
  const C = nk('pt-c-1-x', 'C', 0, 2);
  const tumu = { showCentralAngle: true, showRadius: true, showArcLength: true, showChordLength: true, showArea: true };

  it('ilk ölçümde kısa: merkez açı merkezde (dik açı karesiyle), yarıçap kenarda, yay uzunluğu yayda', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, C, dilim('sct-1-x', A, B, C, tumu)], 'hazır'));
    expect(etiketMetni(t, 'sct-1-x', 'centralAngle')).toBe('90°');
    expect(etiketMetni(t, 'sct-1-x', 'radius')).toBe('r = 2 br');
    expect(etiketMetni(t, 'sct-1-x', 'arcLength')).toBe('3 br');
    expect(etiketMetni(t, 'sct-1-x', 'chordLength')).toBe('Kiriş = 3 br');
    // Alan ve çevrenin kısa biçimi yok: çokgendeki gibi adıyla
    expect(etiketMetni(t, 'sct-1-x', 'area')).toBe('A(BAC dilimi) = 3 birimkare');
    expect(t.oge((o) => o.props['data-angle-marker'] === 'right')).toBeTruthy();
    // Merkez açı rozeti merkezin yanında, dilimin içinde (sağ üst çeyrek)
    const yer = etiketYeri(t, 'sct-1-x', 'centralAngle');
    const merkez = worldToScreen(A, t.d.viewport);
    expect(yer.x).toBeGreaterThan(merkez.x);
    expect(yer.y).toBeLessThan(merkez.y);
    expect(Math.hypot(yer.x - merkez.x, yer.y - merkez.y)).toBeLessThan(2 * t.d.viewport.zoom);
    // Yarıçap kenarın (AB) dış yanında: AB'nin altında
    expect(etiketYeri(t, 'sct-1-x', 'radius').y).toBeGreaterThan(merkez.y);
  });

  it('uzaklaştırılan etiket tam yazılır, ötekiler kısa kalır', () => {
    const t = tuvalKur();
    const kayik = { labelOffsets: { centralAngle: { x: 2, y: 2 }, radius: { x: 0, y: -2 }, arcLength: { x: 2, y: 2 }, area: { x: 3, y: 3 } } };
    t.yap((d) => d.addObjects([A, B, C, dilim('sct-1-x', A, B, C, { ...tumu, ...kayik })], 'hazır'));
    expect(etiketMetni(t, 'sct-1-x', 'centralAngle')).toMatch(/^m\(.*\) = 90°$/);
    expect(etiketMetni(t, 'sct-1-x', 'radius')).toBe('r = |AB| = 2 br');
    expect(etiketMetni(t, 'sct-1-x', 'arcLength')).toMatch(/^\|.*\| = 3 br$/);
    expect(etiketMetni(t, 'sct-1-x', 'chordLength')).toBe('Kiriş = 3 br');
    expect(etiketMetni(t, 'sct-1-x', 'area')).toBe('A(BAC dilimi) = 3 birimkare');
  });

  it('yayda yarıçap: kenarı çiziliyse çizginin yanında, değilse listede; ikisinde de kısa', () => {
    const yay = { ...dilim('arc-1-x', A, B, C, { showRadius: true }), type: 'arc' as const } as unknown as MathObject;
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, C, yay], 'hazır'));
    expect(etiketMetni(t, 'arc-1-x', 'radius')).toBe('r = 2 br');
    const listede = etiketYeri(t, 'arc-1-x', 'radius');
    const t2 = tuvalKur();
    t2.yap((d) => d.addObjects([A, B, C, yay, parca('seg-ab-1-x', A, B)], 'hazır'));
    expect(etiketMetni(t2, 'arc-1-x', 'radius')).toBe('r = 2 br');
    const cizgide = etiketYeri(t2, 'arc-1-x', 'radius');
    const merkez = worldToScreen(A, t.d.viewport);
    expect(listede.y).toBeLessThan(merkez.y);
    expect(cizgide.y).toBeGreaterThan(merkez.y);
  });

  it('yarıçapı çizili çemberde yarıçap etiketi çizginin yanında ve tektir', () => {
    const M = nk('pt-m-1-x', 'M', 0, 0);
    const T = nk('pt-t-1-x', 'T', 2, 0);
    const cember: CircleObject = { id: 'circ-1-x', type: 'circle', label: 'Ç', showLabel: true, centerPointId: M.id, radiusPointId: T.id, color: '#7c3aed', visible: true, createdAt: SABIT_AN, showRadius: true, showArea: true };
    const t = tuvalKur();
    t.yap((d) => d.addObjects([M, T, cember, parca('seg-mt-1-x', M, T)], 'hazır'));
    expect(etiketMetni(t, 'circ-1-x', 'radius')).toBe('r = 2 br');
    expect(etiketMetni(t, 'circ-1-x', 'area')).toBe('Alan = 13 birimkare');
    let adet = 0;
    t.oge((o) => {
      if (o.props['data-label-object'] === 'circ-1-x' && o.props['data-label-kind'] === 'radius') adet++;
      return false;
    });
    expect(adet).toBe(1);
  });
});

describe('17. yay ve dilimde iç açı / dış açı', () => {
  it('dış açı 360° − iç açıyı merkezde öbür yanda gösterir; geri çevrilebilir', () => {
    const A = nk('pt-a-1-x', 'A', 0, 0);
    const B = nk('pt-b-1-x', 'B', 2, 0);
    const C = nk('pt-c-1-x', 'C', 0, 2);
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, C, dilim('sct-1-x', A, B, C, { showCentralAngle: true })], 'hazır'));
    t.yap((d) => d.toggleAngleReflex('sct-1-x'));
    expect(etiketMetni(t, 'sct-1-x', 'centralAngle')).toBe('270°');
    expect(t.oge((o) => o.props['data-angle-marker'] === 'arc')).toBeTruthy();
    expect(t.gecmis().adimlar.at(-1)).toBe('Dış açı gösterildi');
    // Rozet dilimin dışında (sağ üst çeyreğin dışı)
    const yer = etiketYeri(t, 'sct-1-x', 'centralAngle');
    const merkez = worldToScreen(A, t.d.viewport);
    expect(yer.x < merkez.x || yer.y > merkez.y).toBe(true);
    t.yap((d) => d.toggleAngleReflex('sct-1-x'));
    expect(etiketMetni(t, 'sct-1-x', 'centralAngle')).toBe('90°');
    expect(t.gecmis().adimlar.at(-1)).toBe('İç açı gösterildi');
  });
});

describe('18. tuval etiketlerinde "(büyük yay)" gibi niteleyiciler yok', () => {
  it('büyük dilimin yay uzunluğu tam yazımda da niteleyicisiz', () => {
    const A = nk('pt-a-1-x', 'A', 0, 0);
    const B = nk('pt-b-1-x', 'B', 2, 0);
    const C = nk('pt-c-1-x', 'C', 0, -2);
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, C, dilim('sct-1-x', A, B, C, { showArcLength: true, labelOffsets: { arcLength: { x: 3, y: 3 } } })], 'hazır'));
    const metin = etiketMetni(t, 'sct-1-x', 'arcLength')!;
    expect(metin).toMatch(/^\|.*\| = 9 br$/);
    expect(metin).not.toContain('büyük yay');
  });
});

describe('19. eğim etiketi: doğrunun yanında kısa, uzaklaşınca tam', () => {
  const A = nk('pt-a-1-x', 'A', 0, 0);
  const B = nk('pt-b-1-x', 'B', 4, 2);
  const egim = (ek: Partial<MathObject> = {}) => ({
    id: 'msr-1-x', type: 'measurement', kind: 'slope', label: 'AB eğimi', showLabel: true, pointIds: [A.id, B.id], color: '#0f766e', visible: true, createdAt: SABIT_AN, ...ek,
  } as unknown as MathObject);

  it('ilk ölçümde "Eğim = …", doğrudan uzaklaştırılınca "AB eğimi = …"', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, egim()], 'hazır'));
    expect(etiketMetni(t, 'msr-1-x', 'measure')).toBe('Eğim = 0,5');
    const t2 = tuvalKur();
    t2.yap((d) => d.addObjects([A, B, egim({ labelOffsets: { measure: { x: -2, y: 3 } } })], 'hazır'));
    expect(etiketMetni(t2, 'msr-1-x', 'measure')).toBe('AB eğimi = 0,5');
  });

  it('doğru boyunca kaydırılan etiket kısa kalır; elle yazılmış metin ikisinin de yerine geçer', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, egim({ labelOffsets: { measure: { x: 2, y: 1 } } })], 'hazır'));
    expect(etiketMetni(t, 'msr-1-x', 'measure')).toBe('Eğim = 0,5');
    const t2 = tuvalKur();
    t2.yap((d) => d.addObjects([A, B, egim({ labelTexts: { measure: 'm = 1/2' } })], 'hazır'));
    expect(etiketMetni(t2, 'msr-1-x', 'measure')).toBe('m = 1/2');
  });
});

describe('20. iç / dış açı köşe noktasının menüsünde de (çokgendeki gibi)', () => {
  type Madde = { id: string; label?: string; submenu?: Madde[]; checked?: boolean; onSelect?: () => void };
  const menuAc = (t: ReturnType<typeof tuvalKur>, nesne: string): Madde[] => {
    const g = t.oge((o) => o.props['data-object-id'] === nesne && typeof o.props.onContextMenu === 'function')!;
    t.yap(() => (g.props.onContextMenu as (e: unknown) => void)({
      preventDefault() {}, stopPropagation() {}, clientX: 10, clientY: 10, target: { tagName: 'text', closest: () => null },
    }));
    const menu = t.oge((o) => Array.isArray(o.props.items) && (o.props.items as Madde[]).some((m) => m.id === 'ic-dis-aci' || m.id === 'olc-aci'));
    return (menu?.props.items ?? []) as Madde[];
  };
  const A = nk('pt-a-1-x', 'A', 0, 0);
  const B = nk('pt-b-1-x', 'B', 2, 0);
  const C = nk('pt-c-1-x', 'C', 0, 2);

  it('dilimin merkezine sağ tık: tek madde merkez açıyı çevirir', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, C, dilim('sct-1-x', A, B, C, { showCentralAngle: true })], 'hazır'));
    const madde = menuAc(t, A.id).find((m) => m.id === 'ic-dis-aci')!;
    expect(madde.label).toBe('İç açı / dış açı');
    t.yap(() => madde.onSelect!());
    expect(etiketMetni(t, 'sct-1-x', 'centralAngle')).toBe('270°');
  });

  it('merkez açısı gizliyse madde yok; köşede ölçülmüş açı da varsa alt menüde ikisi birden', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, C, dilim('sct-1-x', A, B, C, { showCentralAngle: false })], 'hazır'));
    expect(menuAc(t, A.id).some((m) => m.id === 'ic-dis-aci')).toBe(false);
    const D = nk('pt-d-1-x', 'D', -2, 0);
    const aci = { id: 'ang-1-x', type: 'angle', label: 'α', showLabel: true, point1Id: B.id, vertexPointId: A.id, point3Id: D.id, color: '#f59e0b', visible: true, createdAt: SABIT_AN } as unknown as MathObject;
    const t2 = tuvalKur();
    t2.yap((d) => d.addObjects([A, B, C, D, dilim('sct-1-x', A, B, C, { showCentralAngle: true }), aci], 'hazır'));
    const alt = menuAc(t2, A.id).find((m) => m.id === 'ic-dis-aci')!.submenu!;
    expect(alt.map((m) => m.label)).toEqual(['BAD açısı', 'BAC merkez açısı']);
  });
});

describe('21. kaydırıcı ayarları açılınca bağlı olduğu şekil ve özellik formda seçili', () => {
  const nokta = (id: string, x: number, y: number) => nk(id, id.slice(3, 4).toUpperCase(), x, y);
  const A = nokta('pt-a-1-x', 0, 0);
  const B = nokta('pt-b-1-x', 4, 0);
  const C = nokta('pt-c-1-x', 0, 3);
  const ucgen: PolygonObject = { id: 'poly-1-x', type: 'polygon', label: 'ABC', showLabel: true, pointIds: [A.id, B.id, C.id], color: '#000000', visible: true, createdAt: SABIT_AN };
  const kaydirici: SliderObject = { id: 'sld-1-x', type: 'slider', label: 'a', showLabel: true, variableName: 'a', min: 1, max: 10, step: 1, value: 4, x: -3, y: 5, length: 4, color: '#000000', visible: true, createdAt: SABIT_AN };
  const secili = (k: ReturnType<typeof kaydiriciAyarlariKur>, id: string) => k.oge((o) => o.props.id === id)?.props.value;

  it('bağlı kaydırıcı: şekil ve özellik seçili gelir; Kaydet bağı değiştirmez', () => {
    const bagli = bindSliderProperty([A, B, C, kaydirici, ucgen], kaydirici.id, ucgen.id, 'edge:0', () => 'yeni');
    const k = kaydiriciAyarlariKur(bagli, kaydirici.id);
    expect(secili(k, 'slider-settings-target')).toBe(ucgen.id);
    expect(secili(k, 'slider-settings-property')).toBe('edge:0');
    const form = k.oge((o) => o.type === 'form')!;
    k.yap(() => (form.props.onSubmit as (e: unknown) => void)({ preventDefault() {} }));
    const s = k.d.kaynakNesneler.find((o) => o.id === kaydirici.id) as SliderObject;
    expect(s.bindingTarget).toEqual({ objectId: ucgen.id, propertyKey: 'edge:0' });
    expect(k.d.kaynakNesneler.find((o) => o.id === B.id)).toMatchObject({ construction: { kind: 'sliderPoint', sliderId: kaydirici.id } });
  });

  it('bağsız kaydırıcı: şekil seçilmemiş gelir', () => {
    const k = kaydiriciAyarlariKur([A, B, C, kaydirici, ucgen], kaydirici.id);
    expect(secili(k, 'slider-settings-target')).toBe('');
    expect(k.oge((o) => o.props.id === 'slider-settings-property')).toBeUndefined();
  });
});

describe('22. tuvaldeki kaydırıcı bağlı olup olmadığını simgeyle gösterir', () => {
  const A = nk('pt-a-1-x', 'A', 0, 0);
  const B = nk('pt-b-1-x', 'B', 4, 0);
  const C = nk('pt-c-1-x', 'C', 0, 3);
  const ucgen: PolygonObject = { id: 'poly-1-x', type: 'polygon', label: 'ABC', showLabel: true, pointIds: [A.id, B.id, C.id], color: '#000000', visible: true, createdAt: SABIT_AN };
  const kaydirici: SliderObject = { id: 'sld-1-x', type: 'slider', label: 'a', showLabel: true, variableName: 'a', min: 1, max: 10, step: 1, value: 4, x: -3, y: 5, length: 4, color: '#000000', visible: true, createdAt: SABIT_AN };
  const durum = (t: ReturnType<typeof tuvalKur>) => t.oge((o) => typeof o.props['data-kaydirici-bagi'] === 'string');

  it('zincire tıklamak bağı geçici kapatır (turuncu kırık zincir, şekil serbest) ve yeniden açar', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects(bindSliderProperty([A, B, C, kaydirici, ucgen], kaydirici.id, ucgen.id, 'edge:0', () => 'yeni'), 'hazır'));
    const bas = () => {
      const g = durum(t)!;
      t.yap(() => (g.props.onPointerDown as (e: unknown) => void)({ button: 0, pointerType: 'mouse', stopPropagation() {}, preventDefault() {} }));
    };
    bas();
    expect(durum(t)!.props['data-kaydirici-bagi']).toBe('askida');
    expect(String(durum(t)!.props.className)).toContain('text-amber-600');
    expect(t.d.kaynakNesneler.find((o) => o.id === kaydirici.id)).toMatchObject({ suspendedBinding: { objectId: ucgen.id, propertyKey: 'edge:0' } });
    expect((t.d.kaynakNesneler.find((o) => o.id === B.id) as PointObject).construction).toBeUndefined();
    expect(t.gecmis().adimlar.at(-1)).toBe('a kaydırıcısının bağı geçici olarak kapatıldı');
    bas();
    expect(durum(t)!.props['data-kaydirici-bagi']).toBe('bagli');
    expect(t.d.kaynakNesneler.find((o) => o.id === B.id)).toMatchObject({ construction: { kind: 'sliderPoint', sliderId: kaydirici.id } });
    expect(t.gecmis().adimlar.at(-1)).toBe('a kaydırıcısının bağı yeniden kuruldu');
  });

  it('bağsız: soluk kırık zincir; bağlı: renkli zincir ve açıklayıcı adı', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, C, kaydirici, ucgen], 'hazır'));
    expect(durum(t)!.props['data-kaydirici-bagi']).toBe('bagsiz');
    expect(String(durum(t)!.props['aria-label'])).toContain('bağlı değil');
    const t2 = tuvalKur();
    t2.yap((d) => d.addObjects(bindSliderProperty([A, B, C, kaydirici, ucgen], kaydirici.id, ucgen.id, 'edge:0', () => 'yeni'), 'hazır'));
    expect(durum(t2)!.props['data-kaydirici-bagi']).toBe('bagli');
    expect(String(durum(t2)!.props.className)).toContain('text-primary');
  });
});

describe('23. sürgünün varsayılan ayarları ondalıksız', () => {
  it('Sürgü penceresi: aralık -5 ile 5, adım 1, değer 1; kaydedilen sürgü de öyle', () => {
    const k = kaydiriciEkleKur();
    const deger = (id: string) => k.oge((o) => o.props.id === id)?.props.value;
    expect([deger('slider-min-input'), deger('slider-max-input'), deger('slider-step-input'), deger('slider-value-input')]).toEqual(['-5', '5', '1', '1']);
    const form = k.oge((o) => o.type === 'form')!;
    k.yap(() => (form.props.onSubmit as (e: unknown) => void)({ preventDefault() {} }));
    expect(k.d.kaynakNesneler.find((o) => o.type === 'slider')).toMatchObject({ min: -5, max: 5, step: 1, value: 1 });
  });

  it('fonksiyondaki parametre için açılan sürgü de adım 1', () => {
    const k = calismaKur();
    k.yap((d) => d.addFunction('a*x^2'));
    expect(k.d.kaynakNesneler.find((o) => o.type === 'slider')).toMatchObject({ variableName: 'a', step: 1 });
  });
});

describe('24. sürgüde değişken adı başlıkta, bağlı ölçü çubuğun altında; düğmeler üzerine gelince', () => {
  const A = nk('pt-a-1-x', 'A', 0, 0);
  const B = nk('pt-b-1-x', 'B', 4, 0);
  const C = nk('pt-c-1-x', 'C', 0, 3);
  const ucgen: PolygonObject = { id: 'poly-1-x', type: 'polygon', label: 'ABC', showLabel: true, pointIds: [A.id, B.id, C.id], color: '#000000', visible: true, createdAt: SABIT_AN };
  const kaydirici: SliderObject = { id: 'sld-1-x', type: 'slider', label: 'a', showLabel: true, variableName: 'a', min: 1, max: 10, step: 1, value: 4, x: -3, y: 5, length: 4, color: '#000000', visible: true, createdAt: SABIT_AN };
  const baslik = (t: ReturnType<typeof tuvalKur>) => {
    const g = t.oge((o) => o.props['data-object-id'] === kaydirici.id && typeof o.props.onPointerDown === 'function')!;
    const m = ogeBul(g.props.children, (o) => Array.isArray(o.props.satirlar))!;
    return duzMetin((m.props.satirlar as Dugum[][])[0]);
  };
  const altYazi = (t: ReturnType<typeof tuvalKur>) => {
    const g = t.oge((o) => typeof o.props['data-kaydirici-olcusu'] === 'string');
    const m = g && ogeBul(g.props.children, (o) => Array.isArray(o.props.satirlar));
    return m ? duzMetin((m.props.satirlar as Dugum[][])[0]) : null;
  };
  const dugme = (t: ReturnType<typeof tuvalKur>, ad: string) => String(t.oge((o) => o.props['data-kaydirici-dugmesi'] === ad)!.props.className);

  it('bağsız: "a = 4", alt yazı yok; bağlı: "a = 4 br" ve altta "|AB|"', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, C, kaydirici, ucgen], 'hazır'));
    expect(baslik(t)).toBe('a = 4');
    expect(altYazi(t)).toBeNull();
    const t2 = tuvalKur();
    t2.yap((d) => d.addObjects(bindSliderProperty([A, B, C, kaydirici, ucgen], kaydirici.id, ucgen.id, 'edge:0', () => 'yeni'), 'hazır'));
    expect(baslik(t2)).toBe('a = 4 br');
    expect(altYazi(t2)).toBe('|AB|');
  });

  it('ayar ve oynat düğmeleri yalnız üzerine gelince (ya da sürgü seçiliyken) görünür', () => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects([A, B, C, kaydirici, ucgen], 'hazır'));
    for (const ad of ['ayarlar', 'oynat']) expect(dugme(t, ad)).toContain('opacity-0 group-hover/surgu:opacity-100');
    t.yap((d) => d.setSelectedObjectIds([kaydirici.id]));
    for (const ad of ['ayarlar', 'oynat']) {
      expect(dugme(t, ad)).toContain('opacity-100');
      expect(dugme(t, ad)).not.toContain('opacity-0');
    }
    expect(String(t.oge((o) => o.props['data-object-id'] === kaydirici.id && typeof o.props.onPointerDown === 'function')!.props.className)).toContain('group/surgu');
  });
});

describe('25. kenar sayısı sürgüye bağlanır (ayarlar penceresi)', () => {
  it('"Kenar sayısı" seçilince aralık 3 ile 12, adım 1, değer çokgenin kenar sayısı olur; kaydedince bağlanır', () => {
    const adlar = ['A', 'B', 'C', 'D', 'E'];
    const koseler = adlar.map((ad, k) => { const p = duzgunKose({ x: 0, y: 0 }, { x: 2, y: 0 }, 5, k, 1); return nk(`pt-${ad.toLowerCase()}-1-x`, ad, p.x, p.y); });
    const besgen: PolygonObject = { id: 'poly-1-x', type: 'polygon', label: 'Düzgün Beşgen', showLabel: true, pointIds: koseler.map((p) => p.id), color: '#10b981', visible: true, createdAt: SABIT_AN };
    const kaydirici: SliderObject = { id: 'sld-1-x', type: 'slider', label: 'a', showLabel: true, variableName: 'a', min: -5, max: 5, step: 1, value: 1, x: -3, y: 5, length: 4, color: '#000000', visible: true, createdAt: SABIT_AN };
    const k = kaydiriciAyarlariKur([...koseler, besgen, kaydirici], kaydirici.id);
    const sec = (id: string, value: string) => {
      const oge = k.oge((o) => o.props.id === id)!;
      k.yap(() => (oge.props.onChange as (e: unknown) => void)({ target: { value } }));
    };
    sec('slider-settings-target', besgen.id);
    sec('slider-settings-property', 'sides');
    const deger = (id: string) => k.oge((o) => o.props.id === id)?.props.value;
    expect(['slider-settings-min', 'slider-settings-max', 'slider-settings-step', 'slider-settings-value'].map(deger)).toEqual(['3', '12', '1', '5']);
    const form = k.oge((o) => o.type === 'form')!;
    k.yap(() => (form.props.onSubmit as (e: unknown) => void)({ preventDefault() {} }));
    expect(k.d.kaynakNesneler.find((o) => o.id === besgen.id)).toMatchObject({ regularSides: { sliderId: kaydirici.id } });
    expect(k.d.kaynakNesneler.find((o) => o.id === kaydirici.id)).toMatchObject({ min: 3, max: 12, step: 1, value: 5 });
  });
});
