import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Karakterizasyon: "Temel Çizim Araçları" grubunun (Nokta, Doğru Parçası, Doğru, Işın, Ölçülü Doğru Parçası, Çember,
 * Çokgen, Düzgün Çokgen) tıklama akışları GERÇEK WorkspaceProvider ve Düzgün Çokgen diyaloğu üzerinde: oluşan nesneler
 * (anahtar sırasıyla), etiketler, geçmiş adımları, ipuçları, geri al / yinele ve ilkokul kuralları. Beklenen değerler
 * yeniden düzenlemeden ÖNCEKİ koddan kaydedildi (__snapshots__); davranış değişirse bu testler kırılır.
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

import type { MathObject, PointObject, SegmentObject, SliderObject } from '@/types/math';
import type { ToolMode } from '@/types/workspace';
import { kademeDuzeyiniAyarla } from '@/hooks/useKademeDuzeyi';
import { tarayiciOrtamiKur } from './kancaKosumu';
import { SABIT_AN, calismaKur, duzgunCokgenKur, kimlikAdlandirici } from './temelCizimKosumu';

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

const nokta = (id: string, label: string, x: number, y: number): PointObject => ({
  id, type: 'point', label, showLabel: true, x, y, color: '#000000', visible: true, isIndependent: true, createdAt: SABIT_AN,
});

/** Sahneye hazır noktalar koyar (tek geçmiş adımı) */
function hazirNoktalar(k: ReturnType<typeof calismaKur>, noktalar: PointObject[]) {
  k.yap((d) => d.addObjects(noktalar, 'hazır noktalar'));
}

describe('Nokta aracı', () => {
  it('boş tuvale tıklama ızgaraya oturan, sıradaki harfi alan bağımsız nokta koyar; geri al / yinele', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('point'));
    k.yap((d) => d.handleCanvasClick({ x: 1.2, y: -0.9 }));
    k.yap((d) => d.handleCanvasClick({ x: 3.4, y: 2.1 }));
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('iki nokta');
    expect(k.gecmis()).toMatchSnapshot('geçmiş');
    expect(k.d.pendingPointIds).toEqual([]);
    k.yap((d) => d.undoWorkspace());
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('geri alınca');
    k.yap((d) => d.redoWorkspace());
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('yineleyince');
    expect(k.gecmis()).toMatchSnapshot('yineleme sonrası geçmiş');
  });

  it('bir şeklin kenarına yakın tıklama noktayı kenara oturtur ve şekle bağlar', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    const A = nokta('pt-a-1-x', 'A', 0, 0);
    const B = nokta('pt-b-1-x', 'B', 4, 0);
    const parca: SegmentObject = {
      id: 'seg-ab-1-x', type: 'segment', label: '[AB]', showLabel: true, startPointId: A.id, endPointId: B.id,
      color: '#000000', visible: true, createdAt: SABIT_AN,
    };
    k.yap((d) => d.addObjects([A, B, parca], 'hazır parça'));
    k.yap((d) => d.setActiveTool('point'));
    k.yap((d) => d.handleCanvasClick({ x: 1.37, y: 0.2 }));
    expect(ad.belge(k.d.kaynakNesneler.slice(3))).toMatchSnapshot('kenardaki nokta');
    expect(k.gecmis()).toMatchSnapshot('geçmiş');
  });

  it('var olan noktaya Nokta aracıyla tıklamak bir şey değiştirmez', () => {
    const k = calismaKur();
    hazirNoktalar(k, [nokta('pt-a-1-x', 'A', 0, 0)]);
    k.yap((d) => d.setActiveTool('point'));
    const once = k.d.kaynakNesneler;
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    expect(k.d.kaynakNesneler).toBe(once);
    expect(k.d.pendingPointIds).toEqual([]);
    expect(k.gecmis().adimlar).toEqual(['Boş çalışma alanı', 'hazır noktalar']);
  });
});

const IKI_NOKTALI: ToolMode[] = ['segment', 'line', 'ray', 'circle'];

describe.each(IKI_NOKTALI)('iki noktalı araç: %s', (arac) => {
  it('boş tuvale iki tıklama: ilk tıklama noktayı kaydeder ve bekletir, ikincisi şekli kurar; geri al / yinele', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool(arac));
    k.yap((d) => d.handleCanvasClick({ x: 0.1, y: -0.2 }));
    expect(ad.kimlikler(k.d.pendingPointIds)).toEqual(['pt#1']);
    expect(k.gecmis()).toMatchSnapshot('ilk tıklamadan sonra geçmiş');
    k.yap((d) => d.handleCanvasClick({ x: 2.9, y: 4.2 }));
    expect(k.d.pendingPointIds).toEqual([]);
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('nesneler');
    expect(k.gecmis()).toMatchSnapshot('geçmiş');
    expect(k.d.hintMessage).toMatchSnapshot('ipucu');
    k.yap((d) => d.undoWorkspace());
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('bir adım geri');
    k.yap((d) => d.undoWorkspace());
    expect(k.d.kaynakNesneler).toEqual([]);
    k.yap((d) => d.redoWorkspace());
    k.yap((d) => d.redoWorkspace());
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('iki adım yineleme');
    expect(k.gecmis().konum).toBe(2);
  });

  it('var olan iki noktaya tıklama yalnız şekli ekler', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    hazirNoktalar(k, [nokta('pt-a-1-x', 'A', 0, 0), nokta('pt-b-1-x', 'B', 2, 1)]);
    k.yap((d) => d.setActiveTool(arac));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    expect(ad.kimlikler(k.d.pendingPointIds)).toEqual(['pt#1']);
    expect(k.gecmis().adimlar).toHaveLength(2);
    k.yap((d) => d.handlePointClick('pt-b-1-x'));
    expect(ad.belge(k.d.kaynakNesneler.slice(2))).toMatchSnapshot('şekil');
    expect(k.gecmis()).toMatchSnapshot('geçmiş');
  });

  it('aynı noktaya iki kez tıklama şekil kurmaz, bekleyen nokta temizlenir', () => {
    const k = calismaKur();
    hazirNoktalar(k, [nokta('pt-a-1-x', 'A', 0, 0)]);
    k.yap((d) => d.setActiveTool(arac));
    const once = k.d.kaynakNesneler;
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    expect(k.d.kaynakNesneler).toBe(once);
    expect(k.d.pendingPointIds).toEqual([]);
    expect(k.gecmis().adimlar).toEqual(['Boş çalışma alanı', 'hazır noktalar']);
  });

  it('aynı noktaya ikinci tıklama boş tuvalde yeni nokta doğurmuşsa nokta kaydedilir (şekil yok)', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool(arac));
    k.yap((d) => d.handleCanvasClick({ x: 1, y: 1 }));
    const ilk = k.d.pendingPointIds[0];
    // İkinci tıklama ilk noktanın kendisine: nesne yok, bekleyen temizlenir
    k.yap((d) => d.handlePointClick(ilk));
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('yalnız nokta');
    expect(k.d.pendingPointIds).toEqual([]);
  });

  it('ilk tıklama var olan noktaya, ikincisi boş tuvale', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    hazirNoktalar(k, [nokta('pt-a-1-x', 'A', 0, 0), nokta('pt-b-1-x', 'B', 5, 5)]);
    k.yap((d) => d.setActiveTool(arac));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    k.yap((d) => d.handleCanvasClick({ x: -2.2, y: 3.1 }));
    expect(ad.belge(k.d.kaynakNesneler.slice(2))).toMatchSnapshot('yeni nokta ve şekil');
    expect(k.gecmis()).toMatchSnapshot('geçmiş');
  });

  it('adı boş noktalarda etiketin yedekleri', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    hazirNoktalar(k, [nokta('pt-a-1-x', '', 0, 0), nokta('pt-b-1-x', '', 3, 0), nokta('pt-c-1-x', 'C', 0, 3)]);
    k.yap((d) => d.setActiveTool(arac));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    k.yap((d) => d.handlePointClick('pt-b-1-x'));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    k.yap((d) => d.handlePointClick('pt-c-1-x'));
    expect(ad.belge(k.d.kaynakNesneler.slice(3))).toMatchSnapshot('etiketler');
    expect(k.gecmis().adimlar.slice(2)).toMatchSnapshot('geçmiş');
  });

  it('araç değişince bekleyen nokta bırakılır', () => {
    const k = calismaKur();
    hazirNoktalar(k, [nokta('pt-a-1-x', 'A', 0, 0)]);
    k.yap((d) => d.setActiveTool(arac));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    expect(k.d.pendingPointIds).toEqual(['pt-a-1-x']);
    k.yap((d) => d.setActiveTool('polygon'));
    expect(k.d.pendingPointIds).toEqual([]);
  });
});

describe('Ölçülü Doğru Parçası', () => {
  it('boş tuvale tıklama başlangıç noktasını kaydeder ve uzunluğu sorar; 5 girilince sağa doğru parça çizilir', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('segment_length'));
    k.yap((d) => d.handleCanvasClick({ x: -1.1, y: 0.8 }));
    expect(k.d.pendingPointIds).toEqual([]);
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('başlangıç noktası');
    const istek = k.d.valuePrompt;
    expect(istek).not.toBeNull();
    const { onSubmit, ...alanlar } = istek!;
    expect(alanlar).toMatchSnapshot('pencere');
    let sonuc: string | null | undefined;
    k.yap(() => {
      sonuc = onSubmit('5') as string | null;
    });
    expect(sonuc).toBeNull();
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('parça');
    expect(k.gecmis()).toMatchSnapshot('geçmiş');
    k.yap((d) => d.undoWorkspace());
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('geri alınca');
    k.yap((d) => d.redoWorkspace());
    expect(k.d.kaynakNesneler).toHaveLength(3);
  });

  it('girdi denetimi: sayı, ifade, kaydırıcı, sıfır, eksi ve geçersiz yazı', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    const surgu: SliderObject = {
      id: 'slider-a-1-x', type: 'slider', label: 'a', showLabel: true, variableName: 'a', min: 0, max: 10, step: 1, value: 2,
      x: 0, y: 5, length: 4, color: '#000000', visible: true, createdAt: SABIT_AN,
    };
    k.yap((d) => d.addObjects([surgu, nokta('pt-a-1-x', 'A', 1, 1)], 'hazır'));
    k.yap((d) => d.setActiveTool('segment_length'));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    expect(k.d.kaynakNesneler).toHaveLength(2);
    const onSubmit = k.d.valuePrompt!.onSubmit;
    const sonuclar: Record<string, unknown> = {};
    for (const girdi of ['abc', '0', '-3', '', '2,5', 'a*1.5', 'sqrt(8)']) {
      k.yap(() => {
        sonuclar[girdi] = onSubmit(girdi);
      });
    }
    expect(sonuclar).toMatchSnapshot('sonuçlar');
    expect(ad.belge(k.d.kaynakNesneler.slice(2))).toMatchSnapshot('kurulan parçalar');
    expect(k.gecmis().adimlar).toMatchSnapshot('geçmiş');
  });
});

describe('Çokgen', () => {
  it('üç köşe ve ilk köşeye dönüş çokgeni kapatır; geri al / yinele', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('polygon'));
    k.yap((d) => d.handleCanvasClick({ x: 0, y: 0 }));
    k.yap((d) => d.handleCanvasClick({ x: 4, y: 0 }));
    k.yap((d) => d.handleCanvasClick({ x: 1, y: 3 }));
    expect(ad.kimlikler(k.d.pendingPointIds)).toEqual(['pt#1', 'pt#2', 'pt#3']);
    const ilk = k.d.pendingPointIds[0];
    k.yap((d) => d.handlePointClick(ilk));
    expect(k.d.pendingPointIds).toEqual([]);
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('üçgen');
    expect(k.gecmis()).toMatchSnapshot('geçmiş');
    k.yap((d) => d.undoWorkspace());
    expect(k.d.kaynakNesneler.map((o) => o.type)).toEqual(['point', 'point', 'point']);
    k.yap((d) => d.redoWorkspace());
    expect(k.d.kaynakNesneler.map((o) => o.type)).toEqual(['point', 'point', 'point', 'polygon']);
  });

  it('bekleyen bir köşeye yeniden tıklama ve iki köşeyle ilk köşeye dönüş yok sayılır', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    hazirNoktalar(k, [nokta('pt-a-1-x', 'A', 0, 0), nokta('pt-b-1-x', 'B', 3, 0), nokta('pt-c-1-x', 'C', 3, 3), nokta('pt-d-1-x', 'D', 0, 3)]);
    k.yap((d) => d.setActiveTool('polygon'));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    k.yap((d) => d.handlePointClick('pt-b-1-x'));
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    k.yap((d) => d.handlePointClick('pt-b-1-x'));
    expect(k.d.pendingPointIds).toEqual(['pt-a-1-x', 'pt-b-1-x']);
    k.yap((d) => d.handlePointClick('pt-c-1-x'));
    k.yap((d) => d.handlePointClick('pt-d-1-x'));
    k.yap((d) => d.handlePointClick('pt-c-1-x'));
    expect(k.d.pendingPointIds).toEqual(['pt-a-1-x', 'pt-b-1-x', 'pt-c-1-x', 'pt-d-1-x']);
    k.yap((d) => d.handlePointClick('pt-a-1-x'));
    expect(ad.belge(k.d.kaynakNesneler.slice(4))).toMatchSnapshot('dörtgen');
    expect(k.gecmis().adimlar).toMatchSnapshot('geçmiş');
  });

  it('adsız köşelerde etiket "Çokgen" olur', () => {
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    hazirNoktalar(k, [nokta('pt-a-1-x', '', 0, 0), nokta('pt-b-1-x', '', 3, 0), nokta('pt-c-1-x', '', 3, 3)]);
    k.yap((d) => d.setActiveTool('polygon'));
    for (const id of ['pt-a-1-x', 'pt-b-1-x', 'pt-c-1-x', 'pt-a-1-x']) k.yap((d) => d.handlePointClick(id));
    expect(ad.belge(k.d.kaynakNesneler.slice(3))).toMatchSnapshot('adsız çokgen');
  });

  it('kademe "Tüm araçlar": dokuz köşe konabilir', () => {
    const k = calismaKur();
    k.yap((d) => d.setActiveTool('polygon'));
    for (let i = 0; i < 9; i += 1) k.yap((d) => d.handleCanvasClick({ x: Math.cos(i) * 5, y: Math.sin(i) * 5 }));
    expect(k.d.pendingPointIds).toHaveLength(9);
    expect(k.d.kaynakNesneler).toHaveLength(9);
    expect(k.d.hintMessage).toBeNull();
  });

  it('ilkokul: en çok sekiz köşe; dokuzuncu tıklama ipucu verir ve noktayı kaydetmez, ilk köşe yine kapatır', () => {
    kademeDuzeyiniAyarla('ilkokul');
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('polygon'));
    for (let i = 0; i < 8; i += 1) k.yap((d) => d.handleCanvasClick({ x: Math.round(Math.cos(i * 0.7) * 5), y: Math.round(Math.sin(i * 0.7) * 5) + i * 0.01 }));
    expect(k.d.pendingPointIds).toHaveLength(8);
    expect(k.d.hintMessage).toBeNull();
    k.yap((d) => d.handleCanvasClick({ x: 9, y: 9 }));
    expect(k.d.pendingPointIds).toHaveLength(8);
    expect(k.d.kaynakNesneler).toHaveLength(8);
    expect(k.d.hintMessage).toMatchSnapshot('ipucu');
    const ilk = k.d.pendingPointIds[0];
    k.yap((d) => d.handlePointClick(ilk));
    expect(ad.belge(k.d.kaynakNesneler.slice(8))).toMatchSnapshot('sekizgen');
    // İlkokul görünümü: köşe adları gizli, gerçek veri değişmez
    expect((k.d.objects.filter((o) => o.type === 'point') as PointObject[]).every((p) => p.showLabel === false)).toBe(true);
    expect((k.d.kaynakNesneler.filter((o) => o.type === 'point') as PointObject[]).every((p) => p.showLabel === true)).toBe(true);
  });
});

describe('Düzgün Çokgen', () => {
  it('araç seçilince diyalog açılır (konum değişmez); tuvale tıklama diyaloğu tıklanan (ızgaraya oturan) yerde açar', () => {
    const k = calismaKur();
    expect(k.d.isRegularPolygonDialogOpen).toBe(false);
    k.yap((d) => d.activateTool('regular_polygon'));
    expect(k.d.activeTool).toBe('regular_polygon');
    expect(k.d.isRegularPolygonDialogOpen).toBe(true);
    expect(k.d.regularPolygonPos).toEqual({ x: 0, y: 0 });
    k.yap((d) => d.setIsRegularPolygonDialogOpen(false));
    k.yap((d) => d.handleCanvasClick({ x: 2.3, y: -1.6 }));
    expect(k.d.isRegularPolygonDialogOpen).toBe(true);
    expect(k.d.regularPolygonPos).toMatchSnapshot('konum');
    expect(k.d.kaynakNesneler).toEqual([]);
    expect(k.gecmis().adimlar).toEqual(['Boş çalışma alanı']);
  });

  it('varsayılan (6 kenar, 3 br) gönderimi altıgeni tek geçmiş adımıyla ekler ve diyaloğu kapatır; geri al / yinele', () => {
    const k = duzgunCokgenKur({ x: 1, y: 2 });
    const ad = kimlikAdlandirici();
    expect(k.metinVarMi('Bir İç Açı')).toBe(true);
    expect(k.sablonlar()).toMatchSnapshot('şablonlar');
    k.gonder();
    expect(k.kapanmaSayisi()).toBe(1);
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('altıgen');
    expect(k.gecmis()).toMatchSnapshot('geçmiş');
    k.yap((d) => d.undoWorkspace());
    expect(k.d.kaynakNesneler).toEqual([]);
    k.yap((d) => d.redoWorkspace());
    expect(k.d.kaynakNesneler).toHaveLength(7);
  });

  it('kenar ve büyüklük girdileri; sınırlar ve var olan adlardan sonra gelen köşe adları', () => {
    const k = duzgunCokgenKur({ x: -2, y: 0 });
    const ad = kimlikAdlandirici();
    k.yap((d) => d.addObjects([nokta('pt-a-1-x', 'A', 9, 9), nokta('pt-b-1-x', 'B', 9, 8)], 'hazır'));
    k.kenarYaz('5');
    k.yaricapYaz('2,5');
    k.gonder();
    k.kenarYaz('40');
    k.yaricapYaz('0,1');
    k.gonder();
    k.kenarYaz('abc');
    k.yaricapYaz('99');
    k.gonder();
    const sonuc = k.d.kaynakNesneler.slice(2);
    expect(sonuc.filter((o) => o.type === 'polygon').map((o) => [o.label, (o as { pointIds: string[] }).pointIds.length])).toMatchSnapshot('çokgenler');
    expect(ad.belge(sonuc.slice(0, 6))).toMatchSnapshot('beşgen');
    expect(k.gecmis().adimlar).toMatchSnapshot('geçmiş');
  });

  it('ilkokul: en çok sekizgen, şablonlar sekize kadar, açı kartı yok', () => {
    kademeDuzeyiniAyarla('ilkokul');
    const k = duzgunCokgenKur({ x: 0, y: 0 });
    const ad = kimlikAdlandirici();
    expect(k.metinVarMi('Bir İç Açı')).toBe(false);
    expect(k.metinVarMi(' İlkokulda en çok sekizgen çizilir.')).toBe(true);
    expect(k.sablonlar()).toMatchSnapshot('şablonlar');
    k.kenarYaz('12');
    k.gonder();
    expect(k.d.kaynakNesneler.filter((o) => o.type === 'point')).toHaveLength(8);
    expect(ad.belge(k.d.kaynakNesneler.slice(8))).toMatchSnapshot('sekizgen');
    expect(k.gecmis().adimlar).toMatchSnapshot('geçmiş');
  });
});

describe('ilkokul görünümü yeni çemberde', () => {
  it('çember gerçek veride adlı merkezle kurulur; görünümde merkez ve yarıçap noktası gizlenir', () => {
    kademeDuzeyiniAyarla('ilkokul');
    const k = calismaKur();
    const ad = kimlikAdlandirici();
    k.yap((d) => d.setActiveTool('circle'));
    k.yap((d) => d.handleCanvasClick({ x: 0, y: 0 }));
    k.yap((d) => d.handleCanvasClick({ x: 3, y: 0 }));
    expect(ad.belge(k.d.kaynakNesneler)).toMatchSnapshot('gerçek veri');
    expect(ad.belge(k.d.objects as MathObject[])).toMatchSnapshot('görünüm');
  });
});
