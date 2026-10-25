import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Karakterizasyon: genel senaryoların (cizimAraclariSenaryolari) ulaşmadığı çizim akışları. Alan modeli ızgarasından
 * çokgen, doğru parçalarıyla çevrili kapalı bölgenin alanı / çevresi. Beklenen değerler yeniden düzenlemeden ÖNCEKİ
 * koddan kaydedildi.
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

import type { FunctionObject, MathObject, PointObject, SegmentObject } from '@/types/math';
import { kademeDuzeyiniAyarla } from '@/hooks/useKademeDuzeyi';
import { CircleRadiusDialog } from '../CircleRadiusDialog';
import { baglamDegerleri, bilesen, durula, ogeBul, tarayiciOrtamiKur, type Bilesen } from './kancaKosumu';
import { SABIT_AN, calismaKur, kimlikAdlandirici, tuvalKur } from './temelCizimKosumu';

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

describe('Alanı Modelle', () => {
  it.each(['tum', 'ilkokul'] as const)('%s: ızgaradan kurulan çokgen (köşeler, renkler, ölçüler, geçmiş)', (kademe) => {
    kademeDuzeyiniAyarla(kademe);
    const t = tuvalKur();
    const ad = kimlikAdlandirici();
    t.yap((d) => d.addObjects([nk('pt-a-1-x', 'A', 9, 9)], 'hazır'));
    t.yap((d) => d.setActiveTool('area_model'));
    const aletler = t.oge((o) => typeof o.props.onAddPolygonFromAreaModel === 'function');
    expect(aletler).toBeTruthy();
    t.yap(() => (aletler!.props.onAddPolygonFromAreaModel as (p: { x: number; y: number }, c: number, r: number) => void)({ x: -2, y: 1 }, 3, 2));
    expect(ad.belge(t.d.kaynakNesneler.slice(1))).toMatchSnapshot('nesneler');
    expect(t.gecmis().adimlar).toMatchSnapshot('geçmiş');
  });
});

describe('Alanı Bul / Çevre Hesapla: doğru parçalarıyla çevrili bölge', () => {
  it.each(['measure_area', 'measure_perimeter'] as const)('%s: bölgenin içine basış ölçüm çokgeni kurar; ikinci basış yenisini kurmaz', (arac) => {
    const t = tuvalKur();
    const ad = kimlikAdlandirici();
    const A = nk('pt-a-1-x', 'A', 0, 0);
    const B = nk('pt-b-1-x', 'B', 4, 0);
    const C = nk('pt-c-1-x', 'C', 0, 3);
    t.yap((d) => d.addObjects([A, B, C, parca('seg-ab-1-x', A, B), parca('seg-bc-1-x', B, C), parca('seg-ca-1-x', C, A)], 'hazır'));
    t.yap((d) => d.setActiveTool(arac));
    t.bas({ x: 1, y: 1 });
    t.birak();
    expect(ad.belge(t.d.kaynakNesneler.slice(6))).toMatchSnapshot('nesneler');
    expect({ gecmis: t.gecmis().adimlar, ipucu: t.d.hintMessage, bekleyen: t.d.pendingPointIds }).toMatchSnapshot('durum');
    t.bas({ x: 1.2, y: 0.8 });
    t.birak();
    expect(ad.belge(t.d.kaynakNesneler.slice(6))).toMatchSnapshot('ikinci basış');
    expect({ gecmis: t.gecmis().adimlar, ipucu: t.d.hintMessage }).toMatchSnapshot('ikinci basış durumu');
  });
});

describe('Pergel', () => {
  /** İğne (0; 0), açıklık 3, başlangıç 0°, sonra imleç `acilar` (derece) boyunca gezdirilip bırakılır */
  const pergelYayi = (acilar: number[]) => {
    const t = tuvalKur();
    const ad = kimlikAdlandirici();
    t.yap((d) => d.setActiveTool('compass'));
    const yer = (derece: number) => ({ x: 3 * Math.cos((derece * Math.PI) / 180), y: 3 * Math.sin((derece * Math.PI) / 180) });
    t.bas({ x: 0, y: 0 });
    t.birak();
    t.tasi(yer(0));
    t.bas(yer(0));
    t.birak();
    t.tasi(yer(0));
    t.bas(yer(0));
    t.birak();
    for (const a of acilar) t.tasi(yer(a));
    t.bas(yer(acilar[acilar.length - 1]));
    t.birak();
    return { nesneler: ad.belge(t.d.kaynakNesneler), gecmis: t.gecmis().adimlar, ipucu: t.d.hintMessage };
  };

  it('saat yönünün tersine 90° yay: merkez, iki uç ve yay', () => {
    expect(pergelYayi([20, 45, 70, 90])).toMatchSnapshot();
  });

  it('saat yönünde 120° yay: uçlar yer değiştirir', () => {
    expect(pergelYayi([-30, -60, -90, -120])).toMatchSnapshot();
  });

  it('tam tura yakın tarama çember olur', () => {
    expect(pergelYayi([60, 120, 180, 240, 300, 357])).toMatchSnapshot();
  });
});

describe('Yarıçapla Çember penceresi', () => {
  it.each([['3', 'varsayılan'], ['2,5', 'ondalık virgül'], ['20', 'sınır dışı'], ['abc', 'geçersiz']])('%s (%s)', (girdi) => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    let kapandi = 0;
    k.yap((d) => d.addObjects([nk('pt-a-1-x', 'A', 9, 9)], 'hazır'));
    // Pencere sağlayıcının güncel değeriyle çizilir (bağlam değeri sağlayıcı her çizildiğinde kaydedilir)
    const diyalog = bilesen('yaricap', CircleRadiusDialog, { isOpen: true, onClose: () => void (kapandi += 1), targetPos: { x: 2, y: -1 } });
    const ciz = () => durula([diyalog as Bilesen<unknown, unknown>]);
    ciz();
    const girdi_ = ogeBul(diyalog.sonuc, (o) => o.props.id === 'cember-yaricap-girisi');
    (girdi_!.props.onChange as (e: unknown) => void)({ target: { value: girdi } });
    ciz();
    const form = ogeBul(diyalog.sonuc, (o) => o.type === 'form');
    (form!.props.onSubmit as (e: unknown) => void)({ preventDefault() {} });
    ciz();
    k.yap(() => {});
    const hata = ogeBul(diyalog.sonuc, (o) => o.props.role === 'alert');
    expect({ nesneler: ad.belge(k.d.kaynakNesneler.slice(1)), gecmis: k.gecmis().adimlar, kapandi, hata: hata?.props.children ?? null }).toMatchSnapshot();
    expect(baglamDegerleri.size).toBeGreaterThan(0);
  });
});

describe('Etkileşim araçları: seçime göre', () => {
  const fonksiyon: FunctionObject = {
    id: 'func-f-1-x', type: 'function', label: 'f(x) = 2x + 1', showLabel: true, expression: '2*x + 1', color: '#000000', visible: true, createdAt: SABIT_AN,
  };
  const P = nk('pt-p-1-x', 'P', 1, 1);
  const durumlar: [string, string, string[]][] = [
    ['button', 'yalnız nokta seçili: göster / gizle düğmesi', [P.id]],
    ['input_box', 'fonksiyon seçili: f(x) girdi kutusu', [fonksiyon.id]],
    ['input_box', 'seçim yok', []],
    ['checkbox', 'seçim yok', []],
    ['button', 'seçim yok', []],
    ['checkbox', 'nokta ve fonksiyon seçili', [P.id, fonksiyon.id]],
  ];
  it.each(durumlar)('%s: %s', (arac, _ad, secim) => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.addObjects([P, fonksiyon] as MathObject[], 'hazır'));
    k.yap((d) => d.setActiveTool(arac as 'button'));
    k.yap((d) => d.setSelectedObjectIds(secim));
    k.yap((d) => d.handleCanvasClick({ x: -3.456, y: 2.111 }));
    expect({ nesneler: ad.belge(k.d.kaynakNesneler.slice(2)), gecmis: k.gecmis().adimlar, ipucu: k.d.hintMessage }).toMatchSnapshot();
  });
});

describe('Kesir Göster', () => {
  it.each(['tum', 'ilkokul'] as const)('%s: tuvale basış kesir modelini koyar ve seçer', (kademe) => {
    kademeDuzeyiniAyarla(kademe);
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('fraction'));
    k.yap((d) => d.handleCanvasClick({ x: 1.3, y: -0.6 }));
    expect({ nesneler: ad.belge(k.d.kaynakNesneler), secili: ad.kimlikler(k.d.selectedObjectIds), gecmis: k.gecmis().adimlar }).toMatchSnapshot();
  });
});

describe('Açısını ölç (sağ tık menüsü)', () => {
  it('köşedeki açı ölçülür; ikinci istek yenisini kurmaz; gizlenmiş açı yeniden gösterilir; kollar verilebilir', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    const A = nk('pt-a-1-x', 'A', 0, 0);
    const B = nk('pt-b-1-x', 'B', 4, 0);
    const C = nk('pt-c-1-x', 'C', 0, 3);
    const D = nk('pt-d-1-x', 'D', -3, 1);
    k.yap((d) => d.addObjects([A, B, C, D, parca('seg-ab-1-x', A, B), parca('seg-ac-1-x', A, C)], 'hazır'));
    const kayitlar: unknown[] = [];
    const kaydet = (adim: string) => kayitlar.push({ adim, nesneler: ad.belge(k.d.kaynakNesneler.slice(6)), gecmis: k.gecmis().adimlar.slice(2), ipucu: k.d.hintMessage });
    k.yap((d) => d.measureAngleAtPoint(A.id));
    kaydet('ilk ölçüm');
    k.yap((d) => d.measureAngleAtPoint(A.id));
    kaydet('ikinci istek');
    const aci = k.d.kaynakNesneler.find((o) => o.type === 'angle')!;
    k.yap((d) => d.updateObject(aci.id, { showValue: false } as never));
    k.yap((d) => d.measureAngleAtPoint(A.id));
    kaydet('gizlendikten sonra');
    k.yap((d) => d.measureAngleAtPoint(A.id, [C.id, B.id]));
    kaydet('kollar ters sırada');
    k.yap((d) => d.measureAngleAtPoint(A.id, [B.id, D.id]));
    kaydet('başka kollar');
    expect(kayitlar).toMatchSnapshot();
  });

  it('Açıölçer aracı: aynı açı yeniden ölçülünce yenisi kurulmaz, gösterilir', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    const A = nk('pt-a-1-x', 'A', 0, 0);
    const B = nk('pt-b-1-x', 'B', 4, 0);
    const C = nk('pt-c-1-x', 'C', 0, 3);
    k.yap((d) => d.addObjects([A, B, C], 'hazır'));
    k.yap((d) => d.setActiveTool('measure_angle'));
    for (const id of [B.id, A.id, C.id]) k.yap((d) => d.handlePointClick(id));
    const ilk = ad.belge(k.d.kaynakNesneler.slice(3));
    const aci = k.d.kaynakNesneler.find((o) => o.type === 'angle')!;
    k.yap((d) => d.updateObject(aci.id, { visible: false } as never));
    for (const id of [C.id, A.id, B.id]) k.yap((d) => d.handlePointClick(id));
    expect({ ilk, sonra: ad.belge(k.d.kaynakNesneler.slice(3)), gecmis: k.gecmis().adimlar.slice(2), ipucu: k.d.hintMessage }).toMatchSnapshot();
  });
});
