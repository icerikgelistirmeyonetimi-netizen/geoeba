import { describe, expect, it } from 'vitest';
import type { ViewportTransform } from '@/types/math';
import type { Solid3DObject } from '@/types/workspace3d';
import { projectSolidFor2D } from '../solidProjection2D';

/*
 * 3B cisimlerin 2B tuvaldeki üstten görünümü (projectSolidFor2D, 'top'): taban şekli, ölçü etiketleri, taban alanı ve
 * çevresi, ayak izi ve rozet. Yeniden yazımda değişmemesi için önceki koda göre alındı; sayılar 9 ondalığa yuvarlanır.
 */

const vp = (ek: Partial<ViewportTransform> = {}) => ({ zoom: 44, panX: 0, panY: 0, width: 1200, height: 700, ...ek }) as ViewportTransform;
const cisim = (type: string, ek: Partial<Solid3DObject> = {}) => ({
  id: type, type, name: `${type} 1`, position: { x: 1, y: -2, z: 0 }, dimensions: { width: 2, height: 3, depth: 4, radius: 1.5 },
  rotation: { x: 0, y: 0, z: 0 }, color: '#3b82f6', opacity: 0.85, showWireframe: true, showVertices: true, showFaces: true,
  unfoldProgress: 0, selectedFaceIndex: null, ...ek,
}) as Solid3DObject;

const yuvarla = (v: unknown): unknown => {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 1e9) / 1e9 + 0 : String(v);
  if (Array.isArray(v)) return v.map(yuvarla);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, yuvarla(x)]));
  return v;
};

const TURLER = ['cube', 'prism', 'triangular_prism', 'pyramid', 'cylinder', 'cone', 'sphere'];
const DURUMLAR: [string, Partial<Solid3DObject>, Partial<ViewportTransform>, boolean, number | undefined][] = [
  ['varsayılan', {}, {}, false, undefined],
  ['döndürülmüş, seçili', { rotation: { x: 0, y: 0, z: 30 } }, {}, true, undefined],
  ['eksi açı, uzak, pay ölçeği', { rotation: { x: 0, y: 0, z: -125 } }, { zoom: 20, panX: 80, panY: -40 }, false, 1.7],
  ['boyutsuz, adsız, renksiz', { dimensions: { width: 0, height: 0, depth: 0 }, name: '', color: '' }, { zoom: 90 }, false, undefined],
  ['dik üçgen tabanı', { tabanUcgeni: 'dik' } as Partial<Solid3DObject>, {}, false, undefined],
];

describe('projectSolidFor2D üstten görünüm kaydı', () => {
  it.each(TURLER.flatMap((t) => DURUMLAR.map((d) => [t, ...d] as const)))('%s: %s', (tur, _ad, ek, gorunum, secili, pay) => {
    const p = projectSolidFor2D(cisim(tur, ek), vp(gorunum), secili, 'top', pay);
    const { solid: _solid, faces, edges, ...kalan } = p;
    expect(yuvarla({ ...kalan, yuzSayisi: faces.length, ayritSayisi: edges.length, ilkYuz: faces[0] ?? null, ilkAyrit: edges[0] ?? null })).toMatchSnapshot();
  });

  it('bilinmeyen tür: üstten görünüm yok, ayak izi daire', () => {
    const p = projectSolidFor2D(cisim('torus'), vp(), false, 'top');
    expect(p.topView).toBeUndefined();
    expect(yuvarla({ footprint: p.footprint, badge: p.badge, curves: p.curves ?? null })).toMatchSnapshot();
  });
});
