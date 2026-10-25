import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Karakterizasyon: Çizim Stüdyosu'nun BÜTÜN 2B araçları × kademe. Her araç, kademesinde panelde görünüyorsa, aynı hazır
 * sahne üzerinde aynı senaryolarla sürülür ve her adımdan sonra durum kaydedilir:
 *  - eklenen / değişen / silinen nesneler (anahtar sırasıyla), bekleyen noktalar, seçim, ipucu, açılan pencereler;
 *  - değer soran pencere açılırsa alanları ve tipik bir değerle gönderimin sonucu.
 * Senaryolar: boş tuvale tıklamalar (WorkspaceContext.handleCanvasClick), var olan noktalara tıklamalar
 * (handlePointClick), aynı noktaya iki tıklama, şekil seçiliyken tıklamalar; tuvalde (Canvas) sürükleme, kısa basış ve
 * nesnelere (parça, çokgen, çember, doğru, nokta) basış. Beklenen değerler yeniden düzenlemeden ÖNCEKİ koddan kaydedildi.
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

import type { CircleObject, LineObject, MathObject, Point2D, PointObject, PolygonObject, SegmentObject, SliderObject } from '@/types/math';
import type { ToolMode } from '@/types/workspace';
import { TOOL_SHORTCUTS } from '../toolShortcuts';
import { aracGorunurMu, type KademeDuzeyi } from '../kademeDuzeyleri';
import { kademeDuzeyiniAyarla } from '@/hooks/useKademeDuzeyi';
import { tarayiciOrtamiKur } from './kancaKosumu';
import { SABIT_AN, calismaKur, kimlikAdlandirici, tuvalKur, type Calisma } from './temelCizimKosumu';

let ortamiGeriAl: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(SABIT_AN);
  ortamiGeriAl = tarayiciOrtamiKur();
});
afterEach(() => {
  kademeDuzeyiniAyarla('tum');
  ortamiGeriAl();
  vi.useRealTimers();
});

/* ------------------------------------------------------------------ hazır sahne ------------------------------------------------------------------ */

const nk = (id: string, label: string, x: number, y: number): PointObject => ({
  id, type: 'point', label, showLabel: true, x, y, color: '#000000', visible: true, isIndependent: true, createdAt: SABIT_AN,
});
const A = nk('pt-a-1-x', 'A', -8, 4);
const B = nk('pt-b-1-x', 'B', -4, 4);
const K = nk('pt-k-1-x', 'K', -8, 1);
const L = nk('pt-l-1-x', 'L', -5, 1);
const M = nk('pt-m-1-x', 'M', -6, -2);
const P = nk('pt-p-1-x', 'P', 2, 1);
const Q = nk('pt-q-1-x', 'Q', 6, 1);
const R = nk('pt-r-1-x', 'R', 4, 4);
const O = nk('pt-o-1-x', 'O', 8, -3);
const S = nk('pt-s-1-x', 'S', 10, -3);
const T = nk('pt-t-1-x', 'T', 8, -1);
const U = nk('pt-u-1-x', 'U', -10, -5);
const V = nk('pt-v-1-x', 'V', -10, -2);
const PARCA: SegmentObject = {
  id: 'seg-ab-1-x', type: 'segment', label: '[AB]', showLabel: true, startPointId: A.id, endPointId: B.id, color: '#000000', visible: true, createdAt: SABIT_AN,
};
const COKGEN: PolygonObject = {
  id: 'poly-pqr-1-x', type: 'polygon', label: 'PQR Çokgeni', showLabel: true, pointIds: [P.id, Q.id, R.id], color: '#000000',
  fillColor: '#000000', fillOpacity: 0.15, visible: true, showArea: false, showPerimeter: false, createdAt: SABIT_AN,
};
const CEMBER: CircleObject = {
  id: 'circ-o-1-x', type: 'circle', label: 'O Merkezli Çember', showLabel: true, centerPointId: O.id, radiusPointId: S.id,
  color: '#000000', visible: true, fillOpacity: 0.1, createdAt: SABIT_AN,
};
const DOGRU: LineObject = {
  id: 'line-uv-1-x', type: 'line', label: 'UV Doğrusu', showLabel: true, point1Id: U.id, point2Id: V.id, color: '#000000', visible: true, createdAt: SABIT_AN,
};
const SURGU: SliderObject = {
  id: 'slider-a-1-x', type: 'slider', label: 'a', showLabel: true, variableName: 'a', min: 0, max: 10, step: 1, value: 2,
  x: -2, y: -6.5, length: 4, color: '#000000', visible: true, createdAt: SABIT_AN,
};
const SAHNE: MathObject[] = [A, B, K, L, M, P, Q, R, O, S, T, U, V, PARCA, COKGEN, CEMBER, DOGRU, SURGU];

/** Boş tuvalde, şekillerden uzak noktalar (E1, E2, E3 doğrudaş değil) */
const E1: Point2D = { x: 0, y: -3 };
const E2: Point2D = { x: 3, y: -3 };
const E3: Point2D = { x: 1, y: -1 };

/** Değer soran pencerelere verilen tipik yanıt */
const PENCERE_DEGERI: Partial<Record<ToolMode, string>> = { divide_ratio: '2:1' };

/* ------------------------------------------------------------------ durum kaydı ------------------------------------------------------------------ */

function kaydedici(d: () => Calisma) {
  const ad = kimlikAdlandirici();
  for (const o of SAHNE) ad.ad(o.id);
  let onceki = new Map(d().kaynakNesneler.map((o) => [o.id, o]));
  const json = (o: MathObject) => ad.belge([o]).replace(/\s*\n\s*/g, ' ').slice(2, -2);
  return (adim: string) => {
    const c = d();
    const simdi = new Map(c.kaynakNesneler.map((o) => [o.id, o]));
    const eklenen = c.kaynakNesneler.filter((o) => !onceki.has(o.id)).map(json);
    const degisen = c.kaynakNesneler.filter((o) => onceki.has(o.id) && onceki.get(o.id) !== o && JSON.stringify(onceki.get(o.id)) !== JSON.stringify(o)).map(json);
    const silinen = [...onceki.keys()].filter((id) => !simdi.has(id)).map(ad.ad);
    onceki = simdi;
    const kayit: Record<string, unknown> = { adim };
    if (eklenen.length) kayit.eklenen = eklenen;
    if (degisen.length) kayit.degisen = degisen;
    if (silinen.length) kayit.silinen = silinen;
    if (c.pendingPointIds.length) kayit.bekleyen = ad.kimlikler(c.pendingPointIds);
    if (c.selectedObjectIds.length) kayit.secili = ad.kimlikler(c.selectedObjectIds);
    if (c.hintMessage) kayit.ipucu = c.hintMessage;
    if (c.constraintError) kayit.hata = c.constraintError;
    if (c.activeTool) kayit.arac = c.activeTool;
    const pencereler = [
      c.isRegularPolygonDialogOpen && `düzgün çokgen @ ${JSON.stringify(c.regularPolygonPos)}`,
      c.isCircleRadiusDialogOpen && `yarıçap @ ${JSON.stringify(c.circleRadiusPos)}`,
      c.isFunctionDialogOpen && 'fonksiyon',
      c.isSliderDialogOpen && 'sürgü',
      c.isAddObjectDialogOpen && 'nesne ekle',
      c.isConfirmClearOpen && 'temizle',
    ].filter(Boolean);
    if (pencereler.length) kayit.pencereler = pencereler;
    if (c.valuePrompt) {
      const { onSubmit: _gonder, ...alanlar } = c.valuePrompt;
      kayit.degerPenceresi = alanlar;
    }
    return kayit;
  };
}

/** Açık değer penceresini aracın tipik değeriyle gönderir; sonucu ve oluşanları kaydeder. */
function pencereyiGonder(k: { d: Calisma; yap(e: (d: Calisma) => void): void }, arac: ToolMode, kaydet: (adim: string) => Record<string, unknown>, kayitlar: unknown[]) {
  const istek = k.d.valuePrompt;
  if (!istek) return;
  const deger = PENCERE_DEGERI[arac] ?? '3';
  let sonuc: unknown;
  k.yap(() => {
    sonuc = istek.onSubmit(deger);
  });
  kayitlar.push({ ...kaydet(`pencere "${deger}"`), sonuc });
  k.yap((d) => d.setValuePrompt(null));
}

/* ------------------------------------------------------------------ senaryolar ------------------------------------------------------------------ */

const TUM_ARACLAR = Object.keys(TOOL_SHORTCUTS) as ToolMode[];
const KADEMELER: KademeDuzeyi[] = ['tum', 'ilkokul', 'ortaokul'];
const DURUMLAR = KADEMELER.flatMap((kademe) => TUM_ARACLAR.filter((a) => aracGorunurMu(kademe, a)).map((arac) => [kademe, arac] as const));

describe.each(DURUMLAR)('%s × %s', (kademe, arac) => {
  beforeEach(() => kademeDuzeyiniAyarla(kademe));

  it('bağlam: boş tuval, var olan noktalar, aynı nokta, şekil seçiliyken', () => {
    const sonuclar: Record<string, unknown[]> = {};
    const senaryo = (ad: string, adimlar: [string, (d: Calisma) => void][], hazirla?: (d: Calisma) => void) => {
      const k = calismaKur();
      k.yap((d) => d.addObjects(SAHNE, 'hazır sahne'));
      if (hazirla) k.yap(hazirla);
      k.yap((d) => d.setActiveTool(arac));
      const kaydet = kaydedici(() => k.d);
      const kayitlar: unknown[] = [];
      for (const [adim, eylem] of adimlar) {
        k.yap(eylem);
        kayitlar.push(kaydet(adim));
        pencereyiGonder(k, arac, kaydet, kayitlar);
      }
      k.yap((d) => d.undoWorkspace());
      kayitlar.push({ geriAl: k.gecmis() });
      sonuclar[ad] = kayitlar;
    };
    senaryo('boş tuval', [
      ['E1', (d) => d.handleCanvasClick(E1)],
      ['E2', (d) => d.handleCanvasClick(E2)],
      ['E3', (d) => d.handleCanvasClick(E3)],
      ['ilk bekleyen', (d) => d.pendingPointIds[0] && d.handlePointClick(d.pendingPointIds[0])],
    ]);
    senaryo('noktalar', [
      ['K', (d) => d.handlePointClick(K.id)],
      ['L', (d) => d.handlePointClick(L.id)],
      ['M', (d) => d.handlePointClick(M.id)],
      ['K', (d) => d.handlePointClick(K.id)],
    ]);
    senaryo('aynı nokta', [
      ['K', (d) => d.handlePointClick(K.id)],
      ['K', (d) => d.handlePointClick(K.id)],
    ]);
    senaryo(
      'şekil seçili',
      [
        ['K', (d) => d.handlePointClick(K.id)],
        ['L', (d) => d.handlePointClick(L.id)],
        ['E1', (d) => d.handleCanvasClick(E1)],
      ],
      (d) => d.setSelectedObjectIds([COKGEN.id, SURGU.id])
    );
    expect(sonuclar).toMatchSnapshot();
  });

  it('tuval: sürükleme, kısa basış, nesnelere basış', () => {
    const sonuclar: Record<string, unknown[]> = {};
    const senaryo = (ad: string, adimlar: [string, (t: ReturnType<typeof tuvalKur>) => unknown][]) => {
      const t = tuvalKur();
      t.yap((d) => d.addObjects(SAHNE, 'hazır sahne'));
      t.yap((d) => d.setActiveTool(arac));
      const kaydet = kaydedici(() => t.d);
      const kayitlar: unknown[] = [];
      for (const [adim, eylem] of adimlar) {
        const donus = eylem(t);
        kayitlar.push({ ...kaydet(adim), ...(donus === false ? { ogeYok: true } : {}) });
        pencereyiGonder(t, arac, kaydet, kayitlar);
      }
      sonuclar[ad] = kayitlar;
    };
    senaryo('sürükleme', [
      ['bas E1', (t) => t.bas(E1)],
      ['taşı', (t) => t.tasi({ x: 1, y: -4 })],
      ['taşı', (t) => t.tasi({ x: 2.2, y: -4.6 })],
      ['bırak', (t) => t.birak()],
    ]);
    senaryo('kısa basış', [
      ['bas E3', (t) => t.bas(E3)],
      ['bırak', (t) => t.birak()],
      ['bas E2', (t) => t.bas(E2)],
      ['bırak', (t) => t.birak()],
    ]);
    senaryo('nesneler', [
      ['parça', (t) => t.nesneyeBas(PARCA.id, { x: -6, y: 4 }, 'line')],
      ['bırak', (t) => t.birak()],
      ['çokgen', (t) => t.nesneyeBas(COKGEN.id, { x: 4, y: 2 }, 'polygon')],
      ['bırak', (t) => t.birak()],
      ['çember', (t) => t.nesneyeBas(CEMBER.id, { x: 8, y: -1 }, 'circle')],
      ['bırak', (t) => t.birak()],
      ['doğru', (t) => t.nesneyeBas(DOGRU.id, { x: -10, y: -3 }, 'line')],
      ['bırak', (t) => t.birak()],
      ['nokta K', (t) => t.nesneyeBas(K.id, K, 'circle')],
      ['bırak', (t) => t.birak()],
    ]);
    expect(sonuclar).toMatchSnapshot();
  });
});
