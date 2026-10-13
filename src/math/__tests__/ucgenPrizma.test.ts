import { describe, expect, it } from 'vitest';
import type { Point3D, Solid3DObject, UcgenTabani } from '@/types/workspace3d';
import {
  calculate3DSurfaceArea,
  calculate3DVolume,
  computeFaceArea,
  eskenarYuksekligi,
  generateSolidMesh,
  ucgenTabaniniBul,
  ucgenTepeX,
} from '../geometry3d';
import { cismiYansit } from '../donusum3d';
import { projectSolidFor2D } from '../solidProjection2D';
import { parseProjectFile } from '../projectFile';

/*
 * Uzman 4. tur [174]: üçgen prizmanın taban üçgeni ikizkenar / dik / eşkenar seçilebilir. Ağ (açınım), yüzey alanı,
 * hacim, yansıtma ve 2B taban gösterimi seçilen üçgene uymalı.
 */

function prizma(tabanUcgeni?: UcgenTabani, ek: Partial<Solid3DObject> = {}): Solid3DObject {
  const w = 4;
  return {
    id: `tp-${tabanUcgeni ?? 'yok'}`, type: 'triangular_prism', name: 'Üçgen Prizma 1', position: { x: 1, y: -2, z: 0 },
    dimensions: { width: w, height: tabanUcgeni === 'eskenar' ? eskenarYuksekligi(w) : 3, depth: 5, radius: 2 },
    rotation: { x: 0, y: 0, z: 0 }, color: '#10b981', opacity: 0.85, showWireframe: true, showVertices: true, showFaces: true,
    unfoldProgress: 0, selectedFaceIndex: null, ...(tabanUcgeni ? { tabanUcgeni } : {}), ...ek,
  };
}

const fark = (a: Point3D, b: Point3D) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const ic = (a: Point3D, b: Point3D) => a.x * b.x + a.y * b.y + a.z * b.z;
const uzunluk = (a: Point3D) => Math.sqrt(ic(a, a));
const yuzlerToplami = (s: Solid3DObject) => {
  const { vertices, faces } = generateSolidMesh(s);
  return faces.reduce((t, f) => t + computeFaceArea(vertices, f.vertexIndices), 0);
};

describe('Üçgen prizmanın taban üçgeni', () => {
  it('tepe noktası: ikizkenar ve eşkenarda ortada, dikte sol taban köşesinin üstünde; eski dosya (tür yok) ikizkenar', () => {
    expect(ucgenTepeX(prizma())).toBe(0);
    expect(ucgenTepeX(prizma('ikizkenar'))).toBe(0);
    expect(ucgenTepeX(prizma('eskenar'))).toBe(0);
    expect(ucgenTepeX(prizma('dik'))).toBe(-2);
    expect(ucgenTabaniniBul(prizma())).toBe('ikizkenar');
    expect(ucgenTabaniniBul(prizma('eskenar'))).toBe('eskenar');
    expect(ucgenTabaniniBul(prizma('dik'))).toBe('dik');
  });

  it('dik üçgen tabanda ön yüzün sol köşesinde 90° vardır', () => {
    const { vertices } = generateSolidMesh(prizma('dik'));
    // kapalı prizma: 0 (−w/2, −d/2, 0), 1 (w/2, −d/2, 0), 2 tepe (ax, −d/2, h)
    const [a, b, c] = vertices;
    expect(ic(fark(b, a), fark(c, a))).toBeCloseTo(0, 9);
    expect(uzunluk(fark(c, a))).toBeCloseTo(3, 9);
  });

  it('eşkenar üçgen tabanın üç kenarı eşit', () => {
    const { vertices } = generateSolidMesh(prizma('eskenar'));
    const [a, b, c] = vertices;
    expect(uzunluk(fark(b, a))).toBeCloseTo(4, 9);
    expect(uzunluk(fark(c, a))).toBeCloseTo(4, 9);
    expect(uzunluk(fark(c, b))).toBeCloseTo(4, 9);
  });

  it.each<UcgenTabani>(['ikizkenar', 'dik', 'eskenar'])('%s: V = taban alanı · uzunluk; yüzey alanı = yüzlerin toplamı (kapalı ve tam açık ağ)', (tur) => {
    const s = prizma(tur);
    const { width: w, height: h, depth: d } = s.dimensions;
    expect(calculate3DVolume(s)).toBeCloseTo((w * h * d) / 2, 9);
    expect(calculate3DSurfaceArea(s)).toBeCloseTo(yuzlerToplami(s), 9);
    for (const u of [0.35, 1]) expect(yuzlerToplami({ ...s, unfoldProgress: u })).toBeCloseTo(calculate3DSurfaceArea(s), 6);
    // Tam açık ağ düzlemdedir
    for (const v of generateSolidMesh({ ...s, unfoldProgress: 1 }).vertices) expect(Math.abs(v.z)).toBeLessThan(1e-9);
  });

  it('dik üçgen prizmanın ayna kopyası, köşelerin ayna görüntüsüyle aynı küme (yerel simetri y → −y)', () => {
    const once = prizma('dik', { rotation: { x: 20, y: 35, z: 50 } });
    for (const [duzlem, seviye] of [['yz', 0.5], ['xz', -1], ['xy', 3]] as const) {
      const ayna = (p: Point3D): Point3D => ({ x: duzlem === 'yz' ? 2 * seviye - p.x : p.x, y: duzlem === 'xz' ? 2 * seviye - p.y : p.y, z: duzlem === 'xy' ? 2 * seviye - p.z : p.z });
      const kopya = generateSolidMesh(cismiYansit(once, duzlem, seviye)).vertices;
      const beklenen = generateSolidMesh(once).vertices.map(ayna);
      for (const p of beklenen) expect(kopya.some((q) => uzunluk(fark(p, q)) < 1e-6), JSON.stringify(p)).toBe(true);
    }
  });

  it('2B gösterim taban üçgenidir: taban alanı w·h/2 (V ile tutarlı), dik üçgende tepe sol köşenin üstünde', () => {
    const vp = { width: 800, height: 600, zoom: 40, panX: 0, panY: 0, showGrid: true, showAxes: true, showCoordinates: true, snapToGrid: true, gridStep: 1 };
    for (const tur of ['ikizkenar', 'dik', 'eskenar'] as const) {
      const s = prizma(tur);
      const p = projectSolidFor2D(s, vp, false, 'top');
      expect(p.topView?.baseArea).toBeCloseTo((s.dimensions.width * s.dimensions.height) / 2, 9);
      expect(p.topView!.baseArea * s.dimensions.depth).toBeCloseTo(p.badge.volume, 9);
    }
    const dik = projectSolidFor2D(prizma('dik'), vp, false, 'top').topView!.points!;
    expect(dik[2].x).toBeCloseTo(dik[0].x, 9);
  });

  it('proje dosyası taban türünü korur, geçersiz türü reddeder', () => {
    const dosya = (tabanUcgeni: unknown) => ({ version: '2.0', objects: [], solids: [{ ...prizma('dik'), tabanUcgeni }] });
    expect(parseProjectFile(dosya('dik')).solids[0].tabanUcgeni).toBe('dik');
    expect(() => parseProjectFile(dosya('kare'))).toThrow();
  });
});
