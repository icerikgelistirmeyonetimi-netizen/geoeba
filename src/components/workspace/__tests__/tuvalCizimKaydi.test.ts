import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * TUVAL ÇİZİM ÇIKTISI KAYDI (altın kayıt). Tuvalin kod kısmı yeniden yazılırken TASARIM DEĞİŞMEMELİ (kullanıcı,
 * 26.10.2026: "tasarımı değiştirme sakın, sadece js"). Her sahnenin SVG öğe ağacı (etiketler, sınıflar, koordinatlar,
 * yazılar, alt bileşenlerin özellikleri) birebir kaydedilir; yeniden yazımdan sonra aynı kalmalıdır.
 * Kayıt değişikliğe göre değil, değişiklikten ÖNCEKİ koda göre alındı.
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

import type { MathObject, ViewportTransform } from '@/types/math';
import type { StyleSettings } from '@/types/workspace';
import type { ToolMode } from '@/types/workspace';
import { kademeDuzeyiniAyarla } from '@/hooks/useKademeDuzeyi';
import type { KademeDuzeyi } from '../kademeDuzeyleri';
import { tarayiciOrtamiKur } from './kancaKosumu';
import { SABIT_AN, kimlikAdlandirici, tuvalKur } from './temelCizimKosumu';
import { cevir } from './cizimAgaci';

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
const nk = (id: string, label: string, x: number, y: number, ek: Record<string, unknown> = {}) =>
  o(id, 'point', { label, x, y, isIndependent: true, ...ek });

/* --------------------------------------------------------------------------------------------- sahneler */

const temelSekiller = (): MathObject[] => [
  nk('A', 'A', -4, 1), nk('B', 'B', 0, 3), nk('C', 'C', 2, -1), nk('D', 'D', 5, 2), nk('E', 'E', -3, -3), nk('F', 'F', -1, -2),
  o('seg', 'segment', { label: '[AB]', startPointId: 'A', endPointId: 'B', showLength: true }),
  o('line', 'line', { label: 'CD', point1Id: 'C', point2Id: 'D', showLength: false }),
  o('ray', 'ray', { label: '[EF', startPointId: 'E', throughPointId: 'F' }),
];

const cokgenSahnesi = (): MathObject[] => [
  nk('A', 'A', -3, -2), nk('B', 'B', 3, -2), nk('C', 'C', 1, 3),
  o('poly', 'polygon', { label: 'ABC', pointIds: ['A', 'B', 'C'], fillColor: '#10b981', fillOpacity: 0.2, showArea: true, showPerimeter: true, edgeLabels: [0, 1, 2] }),
  o('aA', 'angle', { point1Id: 'C', vertexPointId: 'A', point3Id: 'B' }),
  o('aB', 'angle', { point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }),
  o('aC', 'angle', { point1Id: 'B', vertexPointId: 'C', point3Id: 'A', reflex: true }),
];

const cemberSahnesi = (): MathObject[] => [
  nk('M', 'M', -3, 0), nk('T', 'T', -1, 0), nk('O', 'O', 3, 1), nk('R', 'R', 5, 1), nk('S', 'S', 3, 3),
  o('c1', 'circle', { label: 'Ç1', centerPointId: 'M', radiusPointId: 'T', showRadius: true, showArea: true, showPerimeter: true }),
  o('seg', 'segment', { label: '[MT]', startPointId: 'M', endPointId: 'T' }),
  o('sec', 'sector', { label: 'O Daire Dilimi', centerPointId: 'O', startPointId: 'R', directionPointId: 'S', showCentralAngle: true, showRadius: true, showArcLength: true, showArea: true, showPerimeter: true, showChordLength: true }),
];

const yaySahnesi = (): MathObject[] => [
  nk('O', 'O', 0, 0), nk('P', 'P', 3, 0), nk('Q', 'Q', 0, -3), nk('K', 'K', -4, 2), nk('L', 'L', -2, 2), nk('N', 'N', -4, 4),
  o('sec', 'sector', { label: 'O Daire Dilimi', centerPointId: 'O', startPointId: 'P', directionPointId: 'Q', showCentralAngle: true, centralAngleReflex: true, showArcLength: true }),
  o('arc', 'arc', { label: 'LN Yayı', centerPointId: 'K', startPointId: 'L', directionPointId: 'N', showCentralAngle: true, showArcLength: true, showRadius: true, showChordLength: true }),
  nk('U', 'U', 4, 3), o('elp', 'ellipse', { label: 'U Merkezli Elips', centerPointId: 'U', radiusX: 2, radiusY: 1, showArea: true, showPerimeter: true, rotation: 20 }),
];

const cebirSahnesi = (): MathObject[] => [
  o('fn', 'function', { label: 'f(x) = a*x^2 + 1', expression: 'a*x^2 + 1' }),
  o('g', 'function', { label: 'g(x) = sin(x)', expression: 'sin(x)', style: 'dashed', color: '#dc2626' }),
  o('sa', 'slider', { label: 'a', variableName: 'a', min: -3, max: 3, step: 1, value: 1, x: -8, y: 5, length: 4 }),
  nk('A', 'A', 1, 1), nk('B', 'B', 4, 1), nk('C', 'C', 1, 4),
  o('poly', 'polygon', { label: 'ABC', pointIds: ['A', 'B', 'C'] }),
  o('sb', 'slider', { label: 'b', variableName: 'b', min: 1, max: 6, step: 1, value: 3, x: -8, y: 3, length: 4, bindingTarget: { objectId: 'poly', propertyKey: 'edge:0' } }),
];

const etkilesimSahnesi = (): MathObject[] => [
  o('txt', 'text', { label: 'Not', text: 'Merhaba **dünya**', x: -6, y: 4, fontSize: 18 }),
  nk('A', 'A', 2, 2),
  o('chk', 'checkbox', { label: 'A noktasını göster', x: -6, y: 2, targetIds: ['A'], checked: true }),
  o('btn', 'button', { label: 'Gizle / göster', x: -6, y: 0, action: { kind: 'toggle', targetIds: ['A'] } }),
  o('sa', 'slider', { label: 'a', variableName: 'a', min: 0, max: 10, step: 1, value: 4, x: 2, y: -3, length: 4 }),
  o('inp', 'input_box', { label: 'a =', x: -6, y: -2, targetId: 'sa', field: 'value' }),
  o('fr1', 'fraction', { label: '3/4', numerator: 3, denominator: 4, x: 4, y: 3, radius: 1, modelType: 'pie' }),
  o('fr2', 'fraction', { label: '2/5', numerator: 2, denominator: 5, x: 4, y: 0, radius: 1, modelType: 'bar' }),
];

const olcumSahnesi = (): MathObject[] => [
  nk('A', 'A', -5, -2), nk('B', 'B', -1, -2), nk('P', 'P', -3, -2, { onObjectId: 'seg' }),
  o('seg', 'segment', { label: '[AB]', startPointId: 'A', endPointId: 'B' }),
  o('d1', 'measurement', { label: '|AP|', kind: 'distance', pointIds: ['A', 'P'] }),
  nk('E', 'E', 1, -1), nk('F', 'F', 4, 1),
  o('m1', 'measurement', { label: 'EF eğimi', kind: 'slope', pointIds: ['E', 'F'] }),
  nk('K', 'K', -5, 1), nk('L', 'L', -1, 1), nk('N', 'N', -1, 4),
  o('m2', 'measurement', { label: 'trig', kind: 'trig', pointIds: ['K', 'L', 'N'] }),
  nk('M', 'M', 3, 4), nk('X', 'X', 5, 4), nk('Y', 'Y', 3, 6, { onObjectId: 'c1' }),
  o('c1', 'circle', { label: 'Ç', centerPointId: 'M', radiusPointId: 'X' }),
  o('m3', 'measurement', { label: 'XY yayı', kind: 'arc', pointIds: ['X', 'Y'], circleId: 'c1' }),
];

const dogrusalSahne = (): MathObject[] => [
  nk('A', 'A', -6, 3), nk('B', 'B', -2, 4), nk('C', 'C', -6, 0), nk('D', 'D', -3, -1), nk('E', 'E', 1, 4), nk('F', 'F', 4, 2),
  nk('G', 'G', 1, -1), nk('H', 'H', 3, 1), nk('K', 'K', -5, -4), nk('L', 'L', -1, -2), nk('M', 'M', 5, -3), nk('N', 'N', 5, -3),
  o('s1', 'segment', { label: '[AB]', startPointId: 'A', endPointId: 'B', showLength: true, style: 'dashed', thickness: 4 }),
  o('s2', 'segment', { label: '[CD]', startPointId: 'C', endPointId: 'D', showLength: true, style: 'dotted', color: '' }),
  o('s3', 'segment', { label: '[KL]', startPointId: 'K', endPointId: 'L', showLength: false }),
  o('l1', 'line', { label: 'EF', point1Id: 'E', point2Id: 'F', showEquation: true, showLength: true }),
  o('r1', 'ray', { label: '[GH', startPointId: 'G', throughPointId: 'H', showLength: true }),
  o('l0', 'line', { label: 'MN', point1Id: 'M', point2Id: 'N', showEquation: true }),
  o('r0', 'ray', { label: '[MN', startPointId: 'M', throughPointId: 'N' }),
  o('lx', 'line', { label: 'kayıp', point1Id: 'M', point2Id: 'yok' }),
];

type Kurulum = {
  nesneler: () => MathObject[];
  kademe?: KademeDuzeyi;
  gorunum?: Partial<ViewportTransform>;
  stil?: Partial<StyleSettings>;
  secili?: string[];
  arac?: ToolMode;
};

const SAHNELER: Record<string, Kurulum> = {
  'boş tuval': { nesneler: () => [] },
  'boş tuval: bölgeler ve koordinatlar': { nesneler: () => [nk('A', 'A', 2, 3)], gorunum: { showQuadrants: true, showCoordinates: true } },
  'boş tuval: ızgarasız ve eksensiz': { nesneler: () => [nk('A', 'A', 2, 3)], gorunum: { showGrid: false, showAxes: false } },
  'noktalı ızgara': { nesneler: () => [nk('A', 'A', 2, 3)], gorunum: { gridStyle: 'noktali', gridOpacity: 0.8 } },
  'izometrik ızgara': { nesneler: () => [nk('A', 'A', 2, 3)], gorunum: { gridStyle: 'izometrik' } },
  'sabit ızgara aralığı (0,5) ve bölgeler': { nesneler: () => [nk('A', 'A', 2, 3)], gorunum: { gridStepAuto: false, gridStep: 0.5, showQuadrants: true, panX: -300, panY: 150 } },
  'uzaklaştırılmış ve kaydırılmış': { nesneler: cokgenSahnesi, gorunum: { zoom: 12, panX: 140, panY: -60 } },
  'yakınlaştırılmış': { nesneler: temelSekiller, gorunum: { zoom: 120 } },
  'nokta, parça, doğru, ışın (parça seçili)': { nesneler: temelSekiller, secili: ['seg'] },
  'çokgen: alan, çevre, kenarlar, açılar': { nesneler: cokgenSahnesi },
  'çember ve dilim: bütün ölçüler': { nesneler: cemberSahnesi },
  'dış açılı dilim, yay ve elips': { nesneler: yaySahnesi },
  'fonksiyonlar ve sürgüler': { nesneler: cebirSahnesi, secili: ['sa'] },
  'etkileşim nesneleri ve kesirler': { nesneler: etkilesimSahnesi },
  'ölçüm nesneleri': { nesneler: olcumSahnesi },
  'stil: dolgusuz, kutulu, kısa yazım, işaretli açı, kalın': {
    nesneler: () => [...cokgenSahnesi().map((x) => (x.id === 'A' || x.id === 'B' || x.id === 'C' ? { ...x, id: `${x.id}`, label: x.label } : x)), ...cemberSahnesi().filter((x) => !['A', 'B', 'C'].includes(x.id))],
    stil: { hideFills: true, showLabelBoxes: true, olcuYazimi: 'kisa', aciYazimi: 'isaret', strokeScale: 2, fontScale: 1.4, pointRadius: 8 },
  },
  'siyah-beyaz': { nesneler: cemberSahnesi, gorunum: { blackWhite: true } },
  'ölçüler gizli': { nesneler: cokgenSahnesi, gorunum: { showMeasurements: false } },
  'ilkokul: çokgen ve çember': { nesneler: () => [...cokgenSahnesi(), ...cemberSahnesi().filter((x) => x.type !== 'sector' && !['A', 'B', 'C'].includes(x.id))], kademe: 'ilkokul' },
  'ortaokul: çokgen ve çember': { nesneler: () => [...cokgenSahnesi(), ...cemberSahnesi().filter((x) => !['A', 'B', 'C'].includes(x.id))], kademe: 'ortaokul' },
  'lise: fonksiyonlar ve ölçümler': { nesneler: () => [...cebirSahnesi(), ...olcumSahnesi().filter((x) => !['A', 'B', 'C', 'poly'].includes(x.id))], kademe: 'lise' },
  'doğrusal nesneler: denklem, uzunluk, çizgi biçimleri': { nesneler: dogrusalSahne },
  'doğrusal nesneler: doğru, ışın ve parça seçili': { nesneler: dogrusalSahne, secili: ['s1', 'l1', 'r1'] },
  'döndür aracı: seçili parça': { nesneler: dogrusalSahne, secili: ['s2'], arac: 'rotate' },
  'döndür aracı: seçili çokgen': { nesneler: cokgenSahnesi, secili: ['poly'], arac: 'rotate' },
  'yansıt aracı: seçili çokgen': { nesneler: cokgenSahnesi, secili: ['poly'], arac: 'reflect' },
};

describe('tuval çizim çıktısı (altın kayıt)', () => {
  it.each(Object.keys(SAHNELER))('%s', (ad) => {
    const s = SAHNELER[ad];
    if (s.kademe) kademeDuzeyiniAyarla(s.kademe);
    const t = tuvalKur();
    const nesneler = s.nesneler();
    if (nesneler.length) t.yap((d) => d.addObjects(nesneler, 'hazır'));
    if (s.gorunum) t.yap((d) => d.setViewport((v) => ({ ...v, ...s.gorunum })));
    if (s.stil) t.yap((d) => d.setStyleSettings((v) => ({ ...v, ...s.stil })));
    if (s.arac) t.yap((d) => d.setActiveTool(s.arac!));
    if (s.secili) t.yap((d) => d.setSelectedObjectIds(s.secili!));
    expect(cevir(t.agac())).toMatchSnapshot();
  });
});

/* ------------------------------------------------- kalem, görsel, kesir modelleri ve seçili not (ek sahne) */

const serbestNesneler = (): MathObject[] => [
  o('pen1', 'pen', { label: 'Serbest çizim', points: [{ x: -7, y: 4 }, { x: -6, y: 5 }, { x: -5, y: 4.2 }, { x: -4, y: 5.5 }], color: '#ec4899' }),
  o('pen2', 'pen', { label: 'Serbest çizim 2', points: [{ x: -7, y: 2 }, { x: -5, y: 1 }], thickness: 6, color: '' }),
  o('pen3', 'pen', { label: 'Tek nokta', points: [{ x: 0, y: 0 }] }),
  o('img', 'image', { label: 'Şema', src: 'data:image/png;base64,iVBORw0KGgo=', x: 5, y: 4, width: 3, height: 2 }),
  o('img2', 'image', { label: 'Şema 2', src: 'data:image/png;base64,iVBORw0KGgo=', x: 5, y: 0.5, width: 2, height: 1 }),
  o('frL', 'fraction', { label: '5/4', numerator: 5, denominator: 4, x: -3, y: -3, radius: 1, modelType: 'line' }),
  o('frT', 'fraction', { label: '2/1', numerator: 2, denominator: 1, x: 2, y: -3, radius: 0.8, modelType: 'pie' }),
  o('frG', 'fraction', { label: 'geçersiz', numerator: 3, denominator: 0, x: 6, y: -3, radius: 0.8, modelType: 'pie' }),
  o('frB', 'fraction', { label: '7/3', numerator: 7, denominator: 3, x: -3, y: 1, radius: 1, modelType: 'bar', color: '#0ea5e9' }),
  o('frO', 'fraction', { label: '1,6/3', numerator: 1.6, denominator: Number.NaN, x: 0, y: 3, radius: 0.6 }),
  o('txt', 'text', { label: 'Not', text: 'Seçili not', x: 0, y: -6, color: '#dc2626' }),
  o('txt2', 'text', { label: 'Not 2', text: 'Kısa', x: 4, y: -6 }),
];

describe('tuval çizim çıktısı: kalem, görsel, kesir, not (altın kayıt)', () => {
  it.each([
    ['hiçbiri seçili değil', []],
    ['kalem, görsel, kesir ve not seçili', ['pen2', 'img', 'frL', 'frB', 'frT', 'txt']],
  ] as const)('%s', (_ad, secili) => {
    const t = tuvalKur();
    t.yap((d) => d.addObjects(serbestNesneler(), 'hazır'));
    if (secili.length) t.yap((d) => d.setSelectedObjectIds([...secili]));
    expect(cevir(t.agac())).toMatchSnapshot();
  });
});

/* ------------------------------------------------------------------------- etkileşim önizlemeleri */

type Tuval = ReturnType<typeof tuvalKur>;
const sinifIceren = (parca: string) => (x: { props: Record<string, unknown> }) => typeof x.props.className === 'string' && x.props.className.includes(parca);

/** Her önizleme: sahneyi kurar, fareyi sürer; `iz` önizlemenin gerçekten çizildiğini doğrular (boş kayıt olmasın) */
const ONIZLEMELER: Record<string, { kur: (t: Tuval) => void; iz: (x: { type: unknown; props: Record<string, unknown> }) => boolean }> = {
  'kalemle çizerken': {
    kur: (t) => {
      t.yap((d) => d.setActiveTool('pen'));
      t.bas({ x: -2, y: 0 });
      t.tasi({ x: -1, y: 1 });
      t.tasi({ x: 0, y: 0.5 });
      t.tasi({ x: 1.5, y: 1.5 });
    },
    iz: (x) => x.props.stroke === '#e11d48',
  },
  'kutuyla seçim (iki nesne seçili)': {
    kur: (t) => {
      t.yap((d) => d.addObjects(temelSekiller(), 'hazır'));
      t.yap((d) => d.setActiveTool('select'));
      t.bas({ x: -7, y: 5 });
      t.tasi({ x: 1, y: 0.5 });
      t.tasi({ x: 3, y: -4 });
    },
    iz: sinifIceren('marquee-selection-box'),
  },
  ...Object.fromEntries(
    (['square', 'rectangle', 'ellipse', 'circle', 'segment'] as const).map((arac) => [
      `sürükleyerek oluşturma: ${arac}`,
      {
        kur: (t: Tuval) => {
          t.yap((d) => d.setActiveTool(arac));
          t.bas({ x: -1, y: -1 });
          t.tasi({ x: 0.5, y: 0 });
          t.tasi({ x: 2.3, y: 1.6 });
        },
        iz: (x: { type: unknown; props: Record<string, unknown> }) => x.props.strokeDasharray === '4,4' || x.props.strokeDasharray === '2,2',
      },
    ]),
  ),
  'pergel: açıklık': {
    kur: (t) => {
      t.yap((d) => d.setActiveTool('compass'));
      t.bas({ x: 0, y: 0 });
      t.birak();
      t.tasi({ x: 2, y: 1 });
    },
    iz: (x) => x.props.stroke === '#8b5cf6',
  },
  'pergel: başlangıç': {
    kur: (t) => {
      t.yap((d) => d.setActiveTool('compass'));
      t.bas({ x: 0, y: 0 });
      t.birak();
      t.tasi({ x: 3, y: 0 });
      t.bas({ x: 3, y: 0 });
      t.birak();
      t.tasi({ x: 1, y: 2 });
    },
    iz: (x) => x.props.fill === '#8b5cf6' && x.props.fillOpacity === 0.25,
  },
  'pergel: tarama': {
    kur: (t) => {
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
      for (const a of [30, 80, 140, 200]) t.tasi(yer(a));
    },
    iz: (x) => x.props.stroke === '#8b5cf6' && x.props.strokeWidth === 3,
  },
  'tıkla-tıkla: çokgen': {
    kur: (t) => {
      t.yap((d) => d.setActiveTool('polygon'));
      for (const p of [{ x: -3, y: -2 }, { x: 2, y: -2 }]) {
        t.bas(p);
        t.birak();
      }
      t.tasi({ x: 0, y: 3 });
    },
    iz: (x) => x.props.stroke === '#10b981',
  },
  ...Object.fromEntries(
    (['arc', 'sector', 'circle_3points', 'angle'] as const).map((arac) => [
      `tıkla-tıkla: ${arac}`,
      {
        kur: (t: Tuval) => {
          t.yap((d) => d.setActiveTool(arac));
          for (const p of [{ x: 0, y: 0 }, { x: 3, y: 0 }]) {
            t.bas(p);
            t.birak();
          }
          t.tasi({ x: 1, y: 2.5 });
        },
        iz: (x: { type: unknown; props: Record<string, unknown> }) => x.props.strokeDasharray === '5,4' || x.props.strokeDasharray === '4,3',
      },
    ]),
  ),
  'tıkla-tıkla: parça lastik bandı': {
    kur: (t) => {
      t.yap((d) => d.setActiveTool('segment'));
      t.bas({ x: -2, y: -1 });
      t.birak();
      t.tasi({ x: 2, y: 2 });
    },
    iz: (x) => x.props.stroke === '#8b5cf6' && x.props.strokeDasharray === '5,4',
  },
  'tıkla-tıkla: çember lastik bandı': {
    kur: (t) => {
      t.yap((d) => d.setActiveTool('circle'));
      t.bas({ x: -1, y: 0 });
      t.birak();
      t.tasi({ x: 1.5, y: 1 });
    },
    iz: (x) => x.props.stroke === '#8b5cf6' && x.props.fillOpacity === 0.08,
  },
  'tıkla-tıkla: çokgenin ilk köşesi': {
    kur: (t) => {
      t.yap((d) => d.setActiveTool('polygon'));
      t.bas({ x: -3, y: -2 });
      t.birak();
      t.tasi({ x: 1, y: 1 });
    },
    iz: (x) => x.props.stroke === '#10b981' && x.props.strokeDasharray === '4,4',
  },
  'birimle ölç önizlemesi (ilkokul)': {
    kur: (t) => {
      kademeDuzeyiniAyarla('ilkokul');
      t.yap((d) => d.addObjects([nk('A', 'A', -2, -1)], 'hazır'));
      t.yap((d) => d.setActiveTool('unit_measure'));
      t.noktayaBas('A');
      t.birak();
      t.tasi({ x: 2, y: 2 });
    },
    iz: sinifIceren('measurement-live-preview'),
  },
  'uzunluk ölç önizlemesi': {
    kur: (t) => {
      t.yap((d) => d.addObjects([nk('A', 'A', -2, -1)], 'hazır'));
      t.yap((d) => d.setActiveTool('measure_distance'));
      t.noktayaBas('A');
      t.birak();
      t.tasi({ x: 3, y: 2 });
    },
    iz: sinifIceren('measurement-live-preview'),
  },
};

describe('tuval çizim çıktısı: etkileşim önizlemeleri (altın kayıt)', () => {
  it.each(Object.keys(ONIZLEMELER))('%s', (ad) => {
    const t = tuvalKur();
    ONIZLEMELER[ad].kur(t);
    expect(t.oge(ONIZLEMELER[ad].iz as (x: unknown) => boolean)).toBeDefined();
    // Tıklamayla oluşan noktaların kimlikleri rastgeledir: görülme sırasıyla "pt#1" gibi adlandırılır
    const adlandir = kimlikAdlandirici();
    const metin = JSON.stringify(cevir(t.agac())).replace(/\b[a-z]+-[0-9a-z]{6,}-[0-9a-z]+-[0-9a-z]{5}\b/g, (k) => adlandir.ad(k));
    expect(JSON.parse(metin)).toMatchSnapshot();
  });
});

/* ------------------------------------------------------------ 3B cisimlerin üstten görünümü (ek sahne) */

const cisim = (id: string, type: string, x: number, z: number, ek: Record<string, unknown> = {}) => ({
  id, type, name: id, position: { x, y: 0, z }, dimensions: { width: 2, height: 3, depth: 2, radius: 1 }, rotation: { x: 0, y: 0, z: 0 },
  color: '#3b82f6', opacity: 1, showWireframe: true, showVertices: true, showFaces: true, unfoldProgress: 0, selectedFaceIndex: null, ...ek,
});
const cisimler = () => [
  cisim('Küp 1', 'cube', -6, -3),
  cisim('Prizma 1', 'prism', -2, -3, { dimensions: { width: 3, height: 2, depth: 1.5 } }),
  cisim('Üçgen prizma 1', 'triangular_prism', 2, -3, { color: '' }),
  cisim('Silindir 1', 'cylinder', 6, -3),
  cisim('Küre 1', 'sphere', -6, 3),
  cisim('Koni 1', 'cone', -2, 3, { color: '#f97316' }),
  cisim('Piramit 1', 'pyramid', 3, 3),
];

describe('tuval çizim çıktısı: 3B cisimlerin üstten görünümü (altın kayıt)', () => {
  it.each([
    ['ad satırları', [] as string[], [] as string[]],
    ['iki cisim seçili, üç cismin ölçüleri açık', ['Koni 1', 'Piramit 1'], ['Küp 1', 'Silindir 1', 'Piramit 1']],
  ])('%s', (_ad, secili, olculu) => {
    const t = tuvalKur({ solids: cisimler(), selectedSolidIds: secili });
    // "Ölçüleri göster" ölçü panelini açmak için pencereye olay yollar (düğüm ortamında window = globalThis)
    vi.stubGlobal('dispatchEvent', () => true);
    for (const id of olculu) {
      const grup = t.oge((x) => x.props['data-solid-id'] === id);
      expect(grup).toBeDefined();
      t.yap(() => (grup!.props.onContextMenu as (e: unknown) => void)({ preventDefault() {}, stopPropagation() {}, clientX: 10, clientY: 10 }));
      const menu = t.oge((x) => x.props.ariaLabel === 'Cisim');
      const madde = (menu!.props.items as { id: string; onSelect: () => void }[]).find((m) => m.id === 'cisim-olculeri')!;
      t.yap(() => madde.onSelect());
    }
    for (const id of ['Küp 1', 'Prizma 1', 'Üçgen prizma 1', 'Silindir 1', 'Küre 1', 'Koni 1', 'Piramit 1']) {
      expect(t.oge((x) => x.props.id === `solid-topview-${id}`)).toBeDefined();
    }
    vi.unstubAllGlobals();
    expect(cevir(t.agac())).toMatchSnapshot();
  });
});
