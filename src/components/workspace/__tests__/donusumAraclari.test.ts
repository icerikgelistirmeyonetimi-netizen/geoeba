import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Karakterizasyon: Dönüşüm araçları tuvalde. Şekli Döndür (hazır derece düğmeleri / ilkokulda çeyrek, yarım, tam dönüş
 * ve sürüklenen döndürme kolu; çokgen, doğru parçası, yay, elips) ve Yansıt (eksen düğmeleri, doğruya göre; ilkokulda
 * dikey / yatay simetri doğrusu). Beklenen değerler yeniden düzenlemeden ÖNCEKİ koddan kaydedildi.
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

import type { EllipseObject, MathObject, PointObject, PolygonObject, SegmentObject } from '@/types/math';
import { kademeDuzeyiniAyarla } from '@/hooks/useKademeDuzeyi';
import type { KademeDuzeyi } from '../kademeDuzeyleri';
import { pencereOlaylariniKur, tarayiciOrtamiKur } from './kancaKosumu';
import { SABIT_AN, kimlikAdlandirici, tuvalKur } from './temelCizimKosumu';

let ortamiGeriAl: () => void;
let olaylar: ReturnType<typeof pencereOlaylariniKur>;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(SABIT_AN);
  ortamiGeriAl = tarayiciOrtamiKur();
  olaylar = pencereOlaylariniKur();
});
afterEach(() => {
  kademeDuzeyiniAyarla('tum');
  olaylar.geriAl();
  ortamiGeriAl();
  vi.useRealTimers();
});

const nk = (id: string, label: string, x: number, y: number): PointObject => ({
  id, type: 'point', label, showLabel: true, x, y, color: '#000000', visible: true, isIndependent: true, createdAt: SABIT_AN,
});
const P = nk('pt-p-1-x', 'P', 2, 1);
const Q = nk('pt-q-1-x', 'Q', 6, 1);
const R = nk('pt-r-1-x', 'R', 4, 4);
const A = nk('pt-a-1-x', 'A', -8, 4);
const B = nk('pt-b-1-x', 'B', -4, 3);
const O = nk('pt-o-1-x', 'O', -5, -3);
const M = nk('pt-m-1-x', 'M', 7, -3);
const S = nk('pt-s-1-x', 'S', 9, -3);
const T = nk('pt-t-1-x', 'T', 7, -1);
const U = nk('pt-u-1-x', 'U', -10, -6);
const V = nk('pt-v-1-x', 'V', -10, -2);
const COKGEN: PolygonObject = {
  id: 'poly-pqr-1-x', type: 'polygon', label: 'PQR Çokgeni', showLabel: true, pointIds: [P.id, Q.id, R.id], color: '#000000',
  fillColor: '#000000', fillOpacity: 0.15, visible: true, showArea: false, showPerimeter: false, createdAt: SABIT_AN,
};
const PARCA: SegmentObject = {
  id: 'seg-ab-1-x', type: 'segment', label: '[AB]', showLabel: true, startPointId: A.id, endPointId: B.id, color: '#000000', visible: true, createdAt: SABIT_AN,
};
const ELIPS: EllipseObject = {
  id: 'elp-o-1-x', type: 'ellipse', label: 'O Merkezli Elips', showLabel: true, centerPointId: O.id, radiusX: 2, radiusY: 1, rotation: 10,
  color: '#000000', fillColor: '#000000', fillOpacity: 0.12, visible: true, createdAt: SABIT_AN,
};
const YAY = {
  id: 'arc-mst-1-x', type: 'arc', label: 'ST Yayı', showLabel: true, centerPointId: M.id, startPointId: S.id, directionPointId: T.id,
  color: '#000000', thickness: 3, showArcLength: false, showCentralAngle: false, visible: true, createdAt: SABIT_AN,
} as unknown as MathObject;
const DOGRU = {
  id: 'line-uv-1-x', type: 'line', label: 'UV Doğrusu', showLabel: true, point1Id: U.id, point2Id: V.id, color: '#000000', visible: true, createdAt: SABIT_AN,
} as MathObject;
const SAHNE: MathObject[] = [P, Q, R, A, B, O, M, S, T, U, V, COKGEN, PARCA, ELIPS, YAY, DOGRU];
const SEKILLER = [COKGEN, PARCA, ELIPS, YAY] as const;

function kur(kademe: KademeDuzeyi) {
  kademeDuzeyiniAyarla(kademe);
  const t = tuvalKur();
  t.yap((d) => d.addObjects(SAHNE, 'hazır sahne'));
  return t;
}

/** Sahnedeki bütün nesnelerin konum / açı özeti ve yeni nesneler */
function ozet(t: ReturnType<typeof tuvalKur>, ad: ReturnType<typeof kimlikAdlandirici>) {
  for (const o of SAHNE) ad.ad(o.id);
  const noktalar = t.d.kaynakNesneler
    .filter((o) => o.type === 'point' && SAHNE.some((s) => s.id === o.id))
    .map((o) => `${(o as PointObject).label}(${(o as PointObject).x}; ${(o as PointObject).y})`)
    .join(' ');
  const elips = t.d.kaynakNesneler.find((o) => o.id === ELIPS.id) as EllipseObject;
  const yeni = t.d.kaynakNesneler.filter((o) => !SAHNE.some((s) => s.id === o.id));
  return { noktalar, elipsAcisi: elips.rotation, yeni: yeni.length ? ad.belge(yeni) : undefined, gecmis: t.gecmis().adimlar.slice(2), ipucu: t.d.hintMessage };
}

describe.each(['tum', 'ilkokul'] as const)('Şekli Döndür (%s)', (kademe) => {
  it.each(SEKILLER.map((s) => [s.label, s] as const))('%s: hazır döndürme düğmeleri', (_ad, sekil) => {
    const t = kur(kademe);
    const ad = kimlikAdlandirici();
    t.yap((d) => d.setActiveTool('rotate'));
    t.yap((d) => d.setSelectedObjectIds([sekil.id]));
    const tutamac = t.oge((o) => typeof o.props.onRotate === 'function');
    expect(tutamac, 'döndürme tutamacı').toBeTruthy();
    const kayitlar: unknown[] = [];
    for (const derece of [90, -45, 180]) {
      const g = t.oge((o) => typeof o.props.onRotate === 'function')!;
      t.yap(() => (g.props.onRotate as (d: number) => void)(derece));
      kayitlar.push({ derece, ...ozet(t, ad) });
    }
    expect(kayitlar).toMatchSnapshot();
  });

  it.each(SEKILLER.map((s) => [s.label, s] as const))('%s: döndürme kolunu sürükleme', (_ad, sekil) => {
    const t = kur(kademe);
    const ad = kimlikAdlandirici();
    t.yap((d) => d.setActiveTool('rotate'));
    t.yap((d) => d.setSelectedObjectIds([sekil.id]));
    const g = t.oge((o) => typeof o.props.onFreeRotateStart === 'function')!;
    expect(g, 'serbest döndürme').toBeTruthy();
    // Dönme merkezi: tutamacın EKRAN koordinatı (piksel)
    const m = g.props.center as { x: number; y: number };
    const durdurma = { stopPropagation() {}, preventDefault() {} };
    t.yap(() => (g.props.onFreeRotateStart as (e: unknown) => void)({ ...durdurma, button: 0, clientX: m.x + 100, clientY: m.y, altKey: false }));
    const kayitlar: unknown[] = [{ dinleyiciler: [olaylar.sayi('pointermove'), olaylar.sayi('pointerup')] }];
    t.yap(() => olaylar.yayinla('pointermove', { clientX: m.x + 80, clientY: m.y - 60, shiftKey: false }));
    kayitlar.push({ adim: 'taşı 37°', ...ozet(t, ad) });
    t.yap(() => olaylar.yayinla('pointermove', { clientX: m.x, clientY: m.y - 100, shiftKey: true }));
    kayitlar.push({ adim: 'taşı 90° (Shift)', ...ozet(t, ad) });
    t.yap(() => olaylar.yayinla('pointerup', {}));
    kayitlar.push({ adim: 'bırak', ...ozet(t, ad), dinleyiciler: [olaylar.sayi('pointermove'), olaylar.sayi('pointerup')] });
    expect(kayitlar).toMatchSnapshot();
  });
});

describe('Yansıt', () => {
  it('eksen düğmeleri (Tüm araçlar): seçili çokgen her eksene göre yansıtılır', () => {
    const t = kur('tum');
    const ad = kimlikAdlandirici();
    t.yap((d) => d.setActiveTool('reflect'));
    t.yap((d) => d.setSelectedObjectIds([COKGEN.id]));
    const cubuk = t.oge((o) => o.props['data-yansitma-cubugu'] !== undefined);
    expect(cubuk).toBeTruthy();
    const dugmeler: { yazi: string; tikla: () => void }[] = [];
    const topla = (dugum: unknown) => {
      if (!dugum || typeof dugum !== 'object') return;
      if (Array.isArray(dugum)) return dugum.forEach(topla);
      const oge = dugum as { props?: Record<string, unknown> };
      if (!oge.props) return;
      if (typeof oge.props.onClick === 'function') {
        const c = oge.props.children;
        const yazi = (Array.isArray(c) ? c : [c]).filter((x) => typeof x === 'string').join(' ').trim();
        dugmeler.push({ yazi, tikla: oge.props.onClick as () => void });
      }
      topla(oge.props.children);
    };
    topla(cubuk!.props.children);
    const kayitlar: unknown[] = [];
    for (const dugme of dugmeler) {
      t.yap(() => dugme.tikla());
      kayitlar.push({ dugme: dugme.yazi, ...ozet(t, ad) });
    }
    expect(dugmeler.map((d) => d.yazi)).toMatchSnapshot('düğmeler');
    expect(kayitlar).toMatchSnapshot('yansımalar');
  });

  it('doğruya göre: önce doğruya, sonra çokgene basılır', () => {
    const t = kur('tum');
    const ad = kimlikAdlandirici();
    t.yap((d) => d.setActiveTool('reflect'));
    t.nesneyeBas(DOGRU.id, { x: -10, y: -4 }, 'line');
    t.birak();
    const once = ozet(t, ad);
    t.nesneyeBas(COKGEN.id, { x: 4, y: 2 }, 'polygon');
    t.birak();
    expect({ once, sonra: ozet(t, ad) }).toMatchSnapshot();
  });

  it.each(['dikey', 'yatay'] as const)('ilkokul: %s simetri doğrusuyla simetriği çizilir', (yon) => {
    const t = kur('ilkokul');
    const ad = kimlikAdlandirici();
    t.yap((d) => d.setActiveTool('reflect'));
    const cubuk = t.oge((o) => o.props['data-ilkokul-simetri'] !== undefined);
    const dugme = cubuk && (function bul(dugum: unknown): (() => void) | undefined {
      if (!dugum || typeof dugum !== 'object') return undefined;
      if (Array.isArray(dugum)) {
        for (const x of dugum) {
          const f = bul(x);
          if (f) return f;
        }
        return undefined;
      }
      const oge = dugum as { props?: Record<string, unknown> };
      if (!oge.props) return undefined;
      const c = oge.props.children;
      if (typeof oge.props.onClick === 'function' && typeof c === 'string' && c.toLocaleLowerCase('tr').startsWith(yon)) return oge.props.onClick as () => void;
      return bul(oge.props.children);
    })(cubuk.props.children);
    if (dugme) t.yap(() => dugme());
    t.nesneyeBas(COKGEN.id, { x: 4, y: 2 }, 'polygon');
    t.birak();
    expect({ dugmeBulundu: !!dugme, ...ozet(t, ad) }).toMatchSnapshot();
  });
});
