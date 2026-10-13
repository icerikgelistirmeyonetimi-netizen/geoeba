import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { Camera3D, Point3D, Solid3DObject, Solid3DType } from '@/types/workspace3d';
import {
  CISIM_BOSLUGU,
  CISIM_EKRAN_PAYI,
  SIGDIRMA_EN_AZ_ZOOM,
  VARSAYILAN_CISIM_OLCULERI,
  VARSAYILAN_KAMERA_3B,
  bakisNoktasi,
  bosKonumBul,
  cisimTabanKutusu,
  cismiGorunurKil,
  cizimOlculeri,
  ekranaIzdusur,
  kameraOdagi,
  kameraTabani,
  kamerayiSifirla,
  ucgenTabaniGuncellemesi,
} from '../cisimYerlesimi';
import { kutuKoseleri } from '../canvas3dDonusum';
import { eskenarYuksekligi, ucgenTabaniniBul } from '@/math/geometry3d';

/*
 * Uzman 4. tur (geoeba (3).xlsx) [173] yeni cismin yeri ve kamera odağı, Görünümü Sıfırla (3B); [174] dikdörtgen prizma
 * ölçüsü ve üçgen prizmanın taban türü.
 */

const W = 922;
const H = 696;

function cisim(type: Solid3DType, position: Point3D, ek: Partial<Solid3DObject> = {}): Solid3DObject {
  const d = VARSAYILAN_CISIM_OLCULERI[type];
  return {
    id: `${type}-${position.x}-${position.y}`, type, name: type, position, dimensions: { ...d }, rotation: { x: 0, y: 0, z: 0 },
    color: '#3b82f6', opacity: 0.85, showWireframe: true, showVertices: true, showFaces: true, unfoldProgress: 0, selectedFaceIndex: null, ...ek,
  };
}

/** Canvas3D.buildCameraBasis'in three.js kamerası (aynı formül): ekranaIzdusur bununla birebir uyuşmalı */
function threeKamerasi(cam: Camera3D) {
  const { ileri, yukari, bakis, zoom } = kameraTabani(cam);
  const uzaklik = (H / 2) / (zoom * Math.tan((20 * Math.PI) / 180));
  const c = new THREE.PerspectiveCamera(40, W / H, 0.1, 4000);
  c.position.set(bakis.x - ileri.x * uzaklik, bakis.y - ileri.y * uzaklik, bakis.z - ileri.z * uzaklik);
  c.up.set(yukari.x, yukari.y, yukari.z);
  c.lookAt(bakis.x, bakis.y, bakis.z);
  c.updateProjectionMatrix();
  c.updateMatrixWorld(true);
  return c;
}

const ortusur = (a: ReturnType<typeof cisimTabanKutusu>, b: ReturnType<typeof cisimTabanKutusu>, pay = 0) =>
  a.minX < b.maxX + pay && a.maxX > b.minX - pay && a.minY < b.maxY + pay && a.maxY > b.minY - pay;

describe('Dikdörtgen prizmanın varsayılan ölçüsü [174]', () => {
  it('Tıkla Ekle: 4 × 3 × 2 br — üç ayrıt farklı (küp değil); küp 3 br', () => {
    const p = VARSAYILAN_CISIM_OLCULERI.prism;
    expect([p.width, p.depth, p.height]).toEqual([4, 3, 2]);
    expect(new Set([p.width, p.depth, p.height]).size).toBe(3);
    expect(VARSAYILAN_CISIM_OLCULERI.cube).toMatchObject({ width: 3, height: 3, depth: 3 });
  });
  it('Zeminde Çiz: prizma 4 : 3 : 2 oranını korur, öteki cisimler eş boyutlu', () => {
    expect(cizimOlculeri('prism', 4)).toMatchObject({ width: 4, depth: 3, height: 2 });
    expect(cizimOlculeri('prism', 8)).toMatchObject({ width: 8, depth: 6, height: 4 });
    const kucuk = cizimOlculeri('prism', 2);
    expect(kucuk.width).toBeGreaterThan(kucuk.depth);
    expect(kucuk.depth).toBeGreaterThan(kucuk.height);
    expect(cizimOlculeri('cube', 5)).toMatchObject({ width: 5, height: 5, depth: 5 });
  });
});

describe('Görünümü Sıfırla (3B) [173]', () => {
  it('%130 ölçek ve döndürülmüş kamera varsayılan açıya ve %100 ölçeğe döner; ızgara / eksen seçimi korunur', () => {
    const once: Camera3D = { ...VARSAYILAN_KAMERA_3B, zoom: 71.5, rotX: 60, rotY: 15, panX: -200, panY: 90, showGrid: false, showAxes: false };
    const sonra = kamerayiSifirla(once);
    expect(Math.round((sonra.zoom / 55) * 100)).toBe(100);
    expect(sonra).toMatchObject({ rotX: 25, rotY: -40, panX: 0, panY: 30, showGrid: false, showAxes: false });
  });
});

describe('Kamera izdüşümü (Canvas3D ile aynı formül)', () => {
  it.each([VARSAYILAN_KAMERA_3B, { ...VARSAYILAN_KAMERA_3B, rotX: 60, rotY: 120, zoom: 90, panX: 140, panY: -60 }])(
    'ekranaIzdusur three.js perspektif kamerasıyla birebir', (cam) => {
      const kamera = threeKamerasi(cam);
      for (const p of [{ x: 0, y: 0, z: 0 }, { x: 3, y: -2, z: 1.5 }, { x: -5, y: 4, z: 3 }]) {
        const v = new THREE.Vector3(p.x, p.y, p.z).project(kamera);
        const beklenen = { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
        const e = ekranaIzdusur(cam, p, W, H)!;
        expect(e.x).toBeCloseTo(beklenen.x, 6);
        expect(e.y).toBeCloseTo(beklenen.y, 6);
      }
    },
  );
  it('kameraOdagi noktayı ekranın tam ortasına getirir; açı ve ölçek değişmez', () => {
    const p = { x: 7, y: -4, z: 1.5 };
    const k = kameraOdagi({ ...VARSAYILAN_KAMERA_3B, rotY: 33 }, p);
    const e = ekranaIzdusur(k, p, W, H)!;
    expect(e.x).toBeCloseTo(W / 2, 6);
    expect(e.y).toBeCloseTo(H / 2, 6);
    expect(k.rotY).toBe(33);
    expect(k.zoom).toBe(55);
  });
});

describe('Yeni cismin yeri [173]', () => {
  it('boş sahnede ilk cisim bakış noktasına (açılışta orijin) konur — eski kural x = −6,75 idi', () => {
    expect(bosKonumBul([], cisim('cube', { x: 0, y: 0, z: 0 }), VARSAYILAN_KAMERA_3B)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('kamera kaydırılınca yeni cisim yeni bakış noktasının yanına gelir', () => {
    const cam = kameraOdagi(VARSAYILAN_KAMERA_3B, { x: 10, y: -6, z: 0 });
    const b = bakisNoktasi(cam);
    const yer = bosKonumBul([], cisim('cube', { x: 0, y: 0, z: 0 }), cam);
    expect(Math.hypot(yer.x - b.x, yer.y - b.y)).toBeLessThan(1);
  });

  it('art arda eklenen altı cisim zeminde üst üste binmez, aralarında en az CISIM_BOSLUGU kalır, kameradan bakınca birbirini örtmez', () => {
    const sahne: Solid3DObject[] = [];
    const turler: Solid3DType[] = ['cube', 'prism', 'triangular_prism', 'cone', 'cylinder', 'sphere'];
    for (const t of turler) {
      const yer = bosKonumBul(sahne, cisim(t, { x: 0, y: 0, z: 0 }), VARSAYILAN_KAMERA_3B);
      sahne.push(cisim(t, yer));
    }
    const kutular = sahne.map(cisimTabanKutusu);
    for (let i = 0; i < kutular.length; i++)
      for (let j = i + 1; j < kutular.length; j++) expect(ortusur(kutular[i], kutular[j], CISIM_BOSLUGU - 1e-9), `${i}-${j}`).toBe(false);
    // Ekranda (dik izdüşüm: kameranın sağ / yukarı eksenleri) sınır kutuları ayrık
    const { sag, yukari } = kameraTabani(VARSAYILAN_KAMERA_3B);
    const ekran = sahne.map((s) => {
      const k = kutuKoseleri(s).map((c) => ({ a: c.x * sag.x + c.y * sag.y + c.z * sag.z, b: c.x * yukari.x + c.y * yukari.y + c.z * yukari.z }));
      return { minX: Math.min(...k.map((q) => q.a)), maxX: Math.max(...k.map((q) => q.a)), minY: Math.min(...k.map((q) => q.b)), maxY: Math.max(...k.map((q) => q.b)) };
    });
    for (let i = 0; i < ekran.length; i++) for (let j = i + 1; j < ekran.length; j++) expect(ortusur(ekran[i], ekran[j]), `ekran ${i}-${j}`).toBe(false);
  });

  it('açınımı açık cismin ağı da dolu sayılır', () => {
    const acik = cisim('cube', { x: 0, y: 0, z: 0 }, { unfoldProgress: 1 });
    const yer = bosKonumBul([acik], cisim('cube', { x: 0, y: 0, z: 0 }), VARSAYILAN_KAMERA_3B);
    const yeni = cisimTabanKutusu(cisim('cube', yer));
    expect(ortusur(yeni, cisimTabanKutusu(acik), CISIM_BOSLUGU - 1e-9)).toBe(false);
  });
});

describe('Kamera yeni cisme odaklanır [173]', () => {
  const kose = (s: Solid3DObject) => kutuKoseleri(s);
  const guvenli = (cam: Camera3D, koseler: Point3D[]) =>
    koseler.every((c) => {
      const e = ekranaIzdusur(cam, c, W, H);
      return !!e && e.x >= CISIM_EKRAN_PAYI.sol - 0.5 && e.x <= W - CISIM_EKRAN_PAYI.sag + 0.5 && e.y >= CISIM_EKRAN_PAYI.ust - 0.5 && e.y <= H - CISIM_EKRAN_PAYI.alt + 0.5;
    });

  it('görünen cisimde kamera oynamaz (aynı nesne döner)', () => {
    const k = kose(cisim('cube', { x: 0, y: 0, z: 0 }));
    expect(cismiGorunurKil(VARSAYILAN_KAMERA_3B, k, W, H)).toBe(VARSAYILAN_KAMERA_3B);
  });

  it('ekran dışındaki cisim için kamera kaydırılır; eskiler de sığıyorsa hepsi görünür kalır', () => {
    const eski = cisim('cube', { x: 0, y: 0, z: 0 });
    const yeni = cisim('cube', { x: 12, y: 0, z: 0 });
    expect(guvenli(VARSAYILAN_KAMERA_3B, kose(yeni))).toBe(false);
    const cam = cismiGorunurKil(VARSAYILAN_KAMERA_3B, kose(yeni), W, H, [...kose(eski), ...kose(yeni)]);
    expect(guvenli(cam, kose(yeni))).toBe(true);
    expect(guvenli(cam, kose(eski))).toBe(true);
    expect(cam.rotX).toBe(VARSAYILAN_KAMERA_3B.rotX);
    expect(cam.rotY).toBe(VARSAYILAN_KAMERA_3B.rotY);
  });

  it('hepsi en az ölçekte bile sığmıyorsa yalnız yeni cisme odaklanılır (ölçek değişmez)', () => {
    // Kameranın sağ ekseni boyunca uzak iki cisim (bakış derinliği aynı kalsın)
    const { sag } = kameraTabani(VARSAYILAN_KAMERA_3B);
    const eski = cisim('cube', { x: -60 * sag.x, y: -60 * sag.y, z: 0 });
    const yeni = cisim('cube', { x: 40 * sag.x, y: 40 * sag.y, z: 0 });
    const cam = cismiGorunurKil(VARSAYILAN_KAMERA_3B, kose(yeni), W, H, [...kose(eski), ...kose(yeni)]);
    expect(guvenli(cam, kose(yeni))).toBe(true);
    expect(guvenli(cam, kose(eski))).toBe(false);
    expect(cam.zoom).toBe(VARSAYILAN_KAMERA_3B.zoom);
  });

  it('hepsini sığdırırken SIGDIRMA_EN_AZ_ZOOM altına inilmez', () => {
    const { sag } = kameraTabani(VARSAYILAN_KAMERA_3B);
    const eski = cisim('cube', { x: -6 * sag.x, y: -6 * sag.y, z: 0 });
    const yeni = cisim('cube', { x: 12 * sag.x, y: 12 * sag.y, z: 0 });
    const cam = cismiGorunurKil(VARSAYILAN_KAMERA_3B, kose(yeni), W, H, [...kose(eski), ...kose(yeni)]);
    expect(guvenli(cam, kose(yeni))).toBe(true);
    expect(guvenli(cam, kose(eski))).toBe(true);
    expect(cam.zoom).toBeLessThan(VARSAYILAN_KAMERA_3B.zoom);
    expect(cam.zoom).toBeGreaterThanOrEqual(SIGDIRMA_EN_AZ_ZOOM);
  });

  it('dar tuvalde (çoklu görünüm) de çalışır', () => {
    const yeni = cisim('prism', { x: 9, y: 9, z: 0 });
    const cam = cismiGorunurKil(VARSAYILAN_KAMERA_3B, kose(yeni), 300, 220);
    const e = kose(yeni).map((c) => ekranaIzdusur(cam, c, 300, 220)!);
    for (const p of e) {
      expect(p.x).toBeGreaterThanOrEqual(7.5);
      expect(p.x).toBeLessThanOrEqual(292.5);
    }
  });
});

describe('Üçgen prizmanın taban türü [174]', () => {
  const tp = cisim('triangular_prism', { x: 0, y: 0, z: 0 });
  it('eşkenar: yükseklik = kenar · √3 / 2', () => {
    const g = ucgenTabaniGuncellemesi(tp, 'eskenar');
    expect(g.tabanUcgeni).toBe('eskenar');
    expect(g.dimensions!.height).toBeCloseTo(eskenarYuksekligi(3), 12);
    expect(ucgenTabaniniBul({ ...tp, ...g })).toBe('eskenar');
  });
  it('eşkenardan ikizkenara: yükseklik genişliğe eşitlenir (üçgen artık eşkenar değil)', () => {
    const eskenar = { ...tp, ...ucgenTabaniGuncellemesi(tp, 'eskenar') };
    const g = ucgenTabaniGuncellemesi(eskenar, 'ikizkenar');
    expect(g.dimensions!.height).toBe(3);
    expect(ucgenTabaniniBul({ ...eskenar, ...g })).toBe('ikizkenar');
  });
  it('dik: tür saklanır, yükseklik 0,5 br adımına yuvarlanır', () => {
    const eskenar = { ...tp, ...ucgenTabaniGuncellemesi(tp, 'eskenar') };
    const g = ucgenTabaniGuncellemesi(eskenar, 'dik');
    expect(g.tabanUcgeni).toBe('dik');
    expect(g.dimensions!.height).toBe(2.5);
    expect(ucgenTabaniniBul({ ...eskenar, ...g })).toBe('dik');
  });
});
