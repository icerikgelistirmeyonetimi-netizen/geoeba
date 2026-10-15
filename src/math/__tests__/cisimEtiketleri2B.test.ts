import { describe, expect, it } from 'vitest';
import type { Solid3DObject, Solid3DType } from '@/types/workspace3d';
import type { ViewportTransform } from '@/types/math';
import { projectSolidFor2D } from '../solidProjection2D';
import {
  cisimBilgiEtiketi,
  cisimBilgiSatiri,
  izdusumGovdesi,
  kenarEtiketKutulari,
  rozetleriYerlestir,
  type EkranKutusu,
} from '../cisimEtiketleri2B';
import { tuvalEngelleri } from '@/components/workspace/eksenSayilari';

/*
 * Uzman 4. tur [175]: 2B'deki 3B cisim etiketleri ('Küp 1 (Kare)', 'Koni 1 (Daire (Koni))', alt alta hacim / taban alanı
 * kutuları) birbirinin üstüne biniyordu → cismin yanında tek satır, çakışmasız yerleşim.
 */

const VP: ViewportTransform = { width: 922, height: 696, zoom: 44, panX: 0, panY: 0, showGrid: true, showAxes: true, showCoordinates: true, snapToGrid: true, gridStep: 1 };

function cisim(type: Solid3DType, x: number, y: number): Solid3DObject {
  return {
    id: `${type}-${x}-${y}`, type, name: { cube: 'Küp 1', prism: 'Prizma 1', cone: 'Koni 1', sphere: 'Küre 1', cylinder: 'Silindir 1', pyramid: 'Kare Piramit 1', triangular_prism: 'Üçgen Prizma 1' }[type],
    position: { x, y, z: 0 }, dimensions: type === 'prism' ? { width: 4, height: 2, depth: 3, radius: 2 } : { width: 3, height: 3, depth: 3, radius: 1.5 },
    rotation: { x: 0, y: 0, z: 0 }, color: '#3b82f6', opacity: 0.85, showWireframe: true, showVertices: true, showFaces: true, unfoldProgress: 0, selectedFaceIndex: null,
  };
}

const kesisir = (a: EkranKutusu, b: EkranKutusu) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function yerlestir(cisimler: Solid3DObject[], engeller: EkranKutusu[] = []) {
  const projeler = cisimler.map((s) => ({ s, p: projectSolidFor2D(s, VP, false, 'top') }));
  const girdiler = projeler.map(({ s, p }) => {
    const { olcu } = cisimBilgiEtiketi(cisimBilgiSatiri(p));
    return { id: s.id, govde: izdusumGovdesi(p), kenarlar: kenarEtiketKutulari(p, 1), w: olcu.genislik, h: olcu.yukseklik };
  });
  const yerler = rozetleriYerlestir(girdiler, 8, { w: VP.width, h: VP.height }, engeller);
  const kutular = girdiler.filter((g) => yerler.has(g.id)).map((g) => {
    const y = yerler.get(g.id)!;
    return { id: g.id, kutu: { x: y.x - g.w / 2, y: y.y - g.h / 2, w: g.w, h: g.h } };
  });
  return { girdiler, kutular };
}

describe('Cisim bilgi satırı', () => {
  it('tek satır: ad + taban alanı + hacim; taban biçiminin adı (Kare, Daire (Koni)) yazılmaz', () => {
    const kup = cisimBilgiSatiri(projectSolidFor2D(cisim('cube', 0, 0), VP, false, 'top'));
    expect(kup).toEqual({ ad: 'Küp 1', degerler: 'Taban alanı = 9 br² · V = 27 br³' });
    const koni = cisimBilgiSatiri(projectSolidFor2D(cisim('cone', 0, 0), VP, false, 'top'));
    expect(koni.ad).toBe('Koni 1');
    expect(`${koni.ad} ${koni.degerler}`).not.toMatch(/Daire|\(/);
  });
  it('kürenin tabanı yok: yalnız hacim', () => {
    expect(cisimBilgiSatiri(projectSolidFor2D(cisim('sphere', 0, 0), VP, false, 'top')).degerler).toBe('V = 14,14 br³');
  });
});

describe('Satırların yerleşimi', () => {
  it('yan yana sıkışık beş cisimde satırlar birbirine, cisimlere ve ölçü etiketlerine binmez', () => {
    const cisimler = [cisim('cube', -6, 0), cisim('prism', -1, 1), cisim('cone', 4, 0), cisim('cylinder', 0, -4), cisim('pyramid', 5, -4)];
    const { girdiler, kutular } = yerlestir(cisimler);
    expect(kutular).toHaveLength(5);
    for (let i = 0; i < kutular.length; i++) {
      for (let j = i + 1; j < kutular.length; j++) expect(kesisir(kutular[i].kutu, kutular[j].kutu), `${kutular[i].id} / ${kutular[j].id}`).toBe(false);
      for (const g of girdiler) {
        expect(kesisir(kutular[i].kutu, g.govde), `${kutular[i].id} gövde ${g.id}`).toBe(false);
        for (const k of g.kenarlar) expect(kesisir(kutular[i].kutu, k), `${kutular[i].id} kenar ${g.id}`).toBe(false);
      }
    }
  });
  it('ilk tercih cismin sağı (yanında, dikeyde ortalı)', () => {
    const { girdiler, kutular } = yerlestir([cisim('cube', 0, 0)]);
    const g = girdiler[0].govde;
    expect(kutular[0].kutu.x).toBeGreaterThanOrEqual(g.x + g.w);
    expect(kutular[0].kutu.y + kutular[0].kutu.h / 2).toBeCloseTo(g.y + g.h / 2, 6);
  });
  it('tuvalin düğmelerine (tuvalEngelleri) binmez; gövdesi tuval dışındaki cismin satırı yazılmaz', () => {
    const engeller = tuvalEngelleri(VP.width, VP.height, { cisimSecici: true });
    // sağ üst köşede (2D / 3D anahtarının altında) bir cisim ve tuvalin dışında bir cisim
    const { kutular } = yerlestir([cisim('cube', 8.5, 6.5), cisim('cube', 40, 40)], engeller);
    expect(kutular.map((k) => k.id)).toEqual(['cube-8.5-6.5']);
    for (const e of engeller) expect(kesisir(kutular[0].kutu, e)).toBe(false);
  });
});
