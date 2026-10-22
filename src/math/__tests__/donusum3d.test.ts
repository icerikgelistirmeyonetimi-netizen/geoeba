import { describe, expect, it } from 'vitest';
import type { Point3D, Solid3DObject, Solid3DType } from '@/types/workspace3d';
import { calculate3DSurfaceArea, calculate3DVolume, generateSolidMesh } from '../geometry3d';
import {
  aciNormalle, cisimMerkezi, cismiDondur, cismiOlcekle, cismiOtele, cismiYansit, donmeyiSifirla, eksenMatrisi, eulerMatrisi, kopyaAdi,
  matrisEuler, olcekSonucu, uygula, seciliAltElemanBilgisi, altElemaniOtele, altElemaniOlcekle, altElemaniDondur,
} from '../donusum3d';

const TURLER: Solid3DType[] = ['cube', 'sphere', 'cylinder', 'prism', 'triangular_prism', 'cone', 'pyramid'];

function cisim(type: Solid3DType, ek: Partial<Solid3DObject> = {}): Solid3DObject {
  return {
    id: `s-${type}`, type, name: `${type} 1`, position: { x: 1, y: 2, z: 0 },
    dimensions: { width: 3, height: 4, depth: 2, radius: 1.5 }, rotation: { x: 0, y: 0, z: 0 },
    color: '#3b82f6', opacity: 0.85, showWireframe: true, showVertices: true, showFaces: true, unfoldProgress: 0, selectedFaceIndex: null, ...ek,
  };
}

const koseler = (s: Solid3DObject) => generateSolidMesh(s).vertices;
const yakin = (p: Point3D, q: Point3D, tol = 1e-6) => Math.abs(p.x - q.x) < tol && Math.abs(p.y - q.y) < tol && Math.abs(p.z - q.z) < tol;
/** İki köşe kümesi (sıra ve tekrar gözetilmeden) aynı mı? */
function ayniKume(a: Point3D[], b: Point3D[]) {
  expect(a.length).toBe(b.length);
  for (const p of a) expect(b.some(q => yakin(p, q)), `${JSON.stringify(p)} karşılığı yok`).toBe(true);
  for (const q of b) expect(a.some(p => yakin(p, q)), `${JSON.stringify(q)} karşılığı yok`).toBe(true);
}
const donusumUygula = (pts: Point3D[], f: (p: Point3D) => Point3D) => pts.map(f);

describe('Euler ↔ matris', () => {
  it('gidiş-dönüş rastgele açılarda birebir', () => {
    for (const rot of [{ x: 0, y: 0, z: 0 }, { x: 20, y: 35, z: 50 }, { x: -170, y: 60, z: 120 }, { x: 45, y: -89, z: 10 }, { x: 90, y: 0, z: 90 }]) {
      const geri = matrisEuler(eulerMatrisi(rot));
      // Açılar farklı yazılabilir ama matris aynı olmalı
      const A = eulerMatrisi(rot), B = eulerMatrisi(geri);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(B[i][j]).toBeCloseTo(A[i][j], 9);
    }
  });
  it('gimbal kilidinde (y = 90°) tutarlı bir çözüm verir', () => {
    const rot = { x: 30, y: 90, z: 40 };
    const A = eulerMatrisi(rot), B = eulerMatrisi(matrisEuler(A));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(B[i][j]).toBeCloseTo(A[i][j], 6);
  });
  it('eksen matrisi: z etrafında 90° (1,0,0) → (0,1,0)', () => {
    const p = uygula(eksenMatrisi('z', 90), { x: 1, y: 0, z: 0 });
    expect(p.x).toBeCloseTo(0); expect(p.y).toBeCloseTo(1); expect(p.z).toBeCloseTo(0);
    expect(() => eksenMatrisi({ x: 0, y: 0, z: 0 }, 10)).toThrow();
  });
  it('açı normalleme (−180, 180]', () => {
    expect(aciNormalle(190)).toBe(-170); expect(aciNormalle(-180)).toBe(180); expect(aciNormalle(360)).toBe(0); expect(aciNormalle(540)).toBe(180);
  });
});

describe('cismiDondur', () => {
  it('z ekseni, merkez pivotu: Euler z toplanır, taban merkezi yerinde kalır', () => {
    const s = cismiDondur(cismiDondur(cisim('cube'), 'z', 30), 'z', 60);
    expect(s.rotation).toEqual({ x: 0, y: 0, z: 90 });
    expect(s.position).toEqual({ x: 1, y: 2, z: 0 });
  });
  it.each(TURLER)('%s: köşeler, merkez etrafındaki gerçek dönmeyle aynı (x ekseni 90°)', type => {
    const once = cisim(type, { rotation: { x: 10, y: 20, z: 30 } });
    const c = cisimMerkezi(once);
    const R = eksenMatrisi('x', 90);
    const beklenen = donusumUygula(koseler(once), p => { const d = uygula(R, { x: p.x - c.x, y: p.y - c.y, z: p.z - c.z }); return { x: c.x + d.x, y: c.y + d.y, z: c.z + d.z }; });
    ayniKume(koseler(cismiDondur(once, 'x', 90)), beklenen);
  });
  it('taban pivotu: position değişmez, köşeler taban merkezi etrafında döner', () => {
    const once = cisim('pyramid');
    const R = eksenMatrisi('y', 45);
    const beklenen = donusumUygula(koseler(once), p => { const d = uygula(R, { x: p.x - 1, y: p.y - 2, z: p.z }); return { x: 1 + d.x, y: 2 + d.y, z: d.z }; });
    const sonra = cismiDondur(once, 'y', 45, 'taban');
    expect(sonra.position).toEqual(once.position);
    ayniKume(koseler(sonra), beklenen);
  });
  it('serbest eksen (kamera sağ vektörü gibi) etrafında döner ve geometrik merkezi korur', () => {
    const once = cisim('cone');
    const sonra = cismiDondur(once, { x: 1, y: 1, z: 0 }, 37);
    const c1 = cisimMerkezi(once), c2 = cisimMerkezi(sonra);
    expect(yakin(c1, c2)).toBe(true);
  });
  it('donmeyiSifirla: döndürme sıfır, geometrik merkez yerinde', () => {
    const egik = cismiDondur(cisim('prism'), 'x', 70);
    const duz = donmeyiSifirla(egik);
    expect(duz.rotation).toEqual({ x: 0, y: 0, z: 0 });
    expect(yakin(cisimMerkezi(duz), cisimMerkezi(egik))).toBe(true);
  });
  it('geçersiz açı reddedilir', () => { expect(() => cismiDondur(cisim('cube'), 'z', NaN)).toThrow(); });
});

describe('cismiOlcekle', () => {
  it('boyutlar k katı; hacim k³, yüzey alanı k² katı; taban pivotunda konum sabit', () => {
    for (const type of TURLER) {
      const once = cisim(type);
      const sonra = cismiOlcekle(once, 2);
      expect(sonra.position).toEqual(once.position);
      expect(sonra.dimensions).toEqual({ width: 6, height: 8, depth: 4, radius: 3 });
      expect(calculate3DVolume(sonra)).toBeCloseTo(calculate3DVolume(once) * 8, 6);
      expect(calculate3DSurfaceArea(sonra)).toBeCloseTo(calculate3DSurfaceArea(once) * 4, 6);
    }
    expect(olcekSonucu(3)).toEqual({ hacim: 27, alan: 9 });
  });
  it('merkez pivotu: geometrik merkez yerinde kalır', () => {
    const once = cismiDondur(cisim('cylinder'), 'x', 30);
    const sonra = cismiOlcekle(once, 0.5, 'merkez');
    expect(yakin(cisimMerkezi(once), cisimMerkezi(sonra))).toBe(true);
  });
  it('nokta pivotu: homoteti (P′ = M + k(P − M))', () => {
    const sonra = cismiOlcekle(cisim('cube'), 3, { x: -2, y: 0, z: 0 });
    expect(sonra.position).toEqual({ x: 7, y: 6, z: 0 });
  });
  it('sıfır ya da negatif çarpan reddedilir, aşırı çarpan kırpılır', () => {
    expect(() => cismiOlcekle(cisim('cube'), 0)).toThrow();
    expect(() => cismiOlcekle(cisim('cube'), -2)).toThrow();
    expect(cismiOlcekle(cisim('cube'), 1000).dimensions.width).toBe(150);
  });
});

describe('cismiYansit', () => {
  const duzlemler = [['yz', 0.5], ['xz', -1], ['xy', 3]] as const;
  it.each(TURLER)('%s: kopyanın köşeleri, özgün köşelerin ayna görüntüsüyle aynı küme', type => {
    const once = cisim(type, { rotation: { x: 20, y: 35, z: 50 } });
    for (const [duzlem, seviye] of duzlemler) {
      const ayna = (p: Point3D): Point3D => ({ x: duzlem === 'yz' ? 2 * seviye - p.x : p.x, y: duzlem === 'xz' ? 2 * seviye - p.y : p.y, z: duzlem === 'xy' ? 2 * seviye - p.z : p.z });
      const kopya = cismiYansit(once, duzlem, seviye, { id: 'k', name: 'kopya' });
      expect(kopya.id).toBe('k');
      expect(kopya.faceColors).toBeUndefined();
      ayniKume(koseler(kopya), donusumUygula(koseler(once), ayna));
    }
  });
  it('yatay düzlem (xy) aynası koniyi baş aşağı çevirir', () => {
    const kopya = cismiYansit(cisim('cone'), 'xy', 0);
    const tepe = koseler(kopya).reduce((en, p) => (p.z < en.z ? p : en));
    expect(tepe.z).toBeCloseTo(-4);
  });
  it('özgün cisim değişmez', () => {
    const once = cisim('cube', { faceColors: { 1: '#f00' } });
    const kopya = JSON.parse(JSON.stringify(once));
    cismiYansit(once, 'yz');
    expect(once).toEqual(kopya);
  });
});

describe('cismiOtele ve adlar', () => {
  it('konum vektör kadar kayar, boyut ve döndürme aynı kalır', () => {
    const once = cisim('prism', { rotation: { x: 0, y: 0, z: 30 } });
    const kopya = cismiOtele(once, { x: 2, y: -1, z: 0.5 }, { id: 'o', name: kopyaAdi(once.name, 'öteleme') });
    expect(kopya.position).toEqual({ x: 3, y: 1, z: 0.5 });
    expect(kopya.rotation).toEqual(once.rotation);
    expect(kopya.name).toBe('prism 1 (öteleme)');
    expect(() => cismiOtele(once, { x: NaN, y: 0, z: 0 })).toThrow();
  });
  it('kopya adı eki yinelenmez', () => {
    expect(kopyaAdi('Küp 1 (yansıma)', 'yansıma')).toBe('Küp 1 (yansıma)');
    expect(kopyaAdi('Küp 1 (öteleme)', 'kopya')).toBe('Küp 1 (kopya)');
  });
});

describe('alt eleman (yüzey ve köşe) dönüşümleri', () => {
  it('yüzey modunda yalnızca seçili yüzeyin köşelerini taşır, ölçekler ve döndürür; diğer köşeler sabit kalır', () => {
    const kup = cisim('cube', { selectedFaceIndex: 0 });
    const oncekiKoseler = koseler(kup);
    const alt = seciliAltElemanBilgisi(kup, 'face');
    expect(alt).not.toBeNull();
    expect(alt!.tur).toBe('face');

    const tasinmis = altElemaniOtele(kup, alt!.vertexIndices, { x: 0, y: 0, z: 2 });
    const tasinmisKoseler = koseler(tasinmis);
    oncekiKoseler.forEach((p, idx) => {
      if (alt!.vertexIndices.includes(idx)) {
        expect(tasinmisKoseler[idx].z).toBeCloseTo(p.z + 2, 5);
      } else {
        expect(yakin(tasinmisKoseler[idx], p)).toBe(true);
      }
    });

    const olceklenmis = altElemaniOlcekle(kup, 'face', 2);
    const olcekKoseler = koseler(olceklenmis);
    oncekiKoseler.forEach((p, idx) => {
      if (!alt!.vertexIndices.includes(idx)) {
        expect(yakin(olcekKoseler[idx], p)).toBe(true);
      }
    });

    const dondurulmus = altElemaniDondur(kup, 'face', 'z', 45);
    const dondurKoseler = koseler(dondurulmus);
    oncekiKoseler.forEach((p, idx) => {
      if (!alt!.vertexIndices.includes(idx)) {
        expect(yakin(dondurKoseler[idx], p)).toBe(true);
      }
    });
  });

  it('nokta modunda yalnızca seçili köşeyi taşır, diğer tüm köşeler sabit kalır', () => {
    const kup = cisim('cube', { selectedVertexIndex: 0 });
    const oncekiKoseler = koseler(kup);
    const alt = seciliAltElemanBilgisi(kup, 'vertex');
    expect(alt).not.toBeNull();
    expect(alt!.tur).toBe('vertex');

    const tasinmis = altElemaniOtele(kup, alt!.vertexIndices, { x: 1.5, y: -1, z: 0.5 });
    const tasinmisKoseler = koseler(tasinmis);
    expect(tasinmisKoseler[0].x).toBeCloseTo(oncekiKoseler[0].x + 1.5, 5);
    expect(tasinmisKoseler[0].y).toBeCloseTo(oncekiKoseler[0].y - 1, 5);
    expect(tasinmisKoseler[0].z).toBeCloseTo(oncekiKoseler[0].z + 0.5, 5);
    for (let i = 1; i < oncekiKoseler.length; i++) {
      expect(yakin(tasinmisKoseler[i], oncekiKoseler[i])).toBe(true);
    }
  });

  it('yüzey silindiğinde açınım kalan yüzeylerin komşuluk ağacından yeniden hesaplanır', () => {
    // 1) Küpte Arka Yüz (2) silindiğinde Üst Taban (1) Ön Yüz üzerinden açılır ve tüm kalan 5 yüz z=0 düzlemine yatar
    const arkaSilinmisKup = cisim('cube', { position: { x: 0, y: 0, z: 0 }, deletedFaces: [2], unfoldProgress: 1 });
    const acikKupMesh = generateSolidMesh(arkaSilinmisKup);
    expect(acikKupMesh.faces.length).toBe(5);
    acikKupMesh.vertices.forEach((v) => {
      expect(v.z).toBeCloseTo(0, 4);
    });
    expect(calculate3DSurfaceArea(arkaSilinmisKup)).toBeCloseTo(5 * 9, 4);

    // 2) Küpte Alt Taban (0) silindiğinde kalan 5 yüz Üst Taban etrafında z=0 düzlemine açılır
    const altSilinmisKup = cisim('cube', { position: { x: 0, y: 0, z: 0 }, deletedFaces: [0], unfoldProgress: 1 });
    const altAcikMesh = generateSolidMesh(altSilinmisKup);
    expect(altAcikMesh.faces.length).toBe(5);
    altAcikMesh.vertices.forEach((v) => {
      expect(v.z).toBeCloseTo(0, 4);
    });

    // 3) Piramitte Kare Taban (0) silindiğinde kalan 4 üçgen yan yüz yan ayrıtlarından birbirine bağlı yelpaze olarak z=0 düzlemine açılır
    const tabansizPiramit = cisim('pyramid', { position: { x: 0, y: 0, z: 0 }, deletedFaces: [0], unfoldProgress: 1 });
    const piramitMesh = generateSolidMesh(tabansizPiramit);
    expect(piramitMesh.faces.length).toBe(4);
    piramitMesh.vertices.forEach((v) => {
      expect(v.z).toBeCloseTo(0, 4);
    });

    // 4) Kürede tek yüzey olduğu için herhangi bir yüzey dilimi silindiğinde tüm küre yüzeyi silinir (0 yüz kalır)
    const kureMesh = generateSolidMesh(cisim('sphere', { deletedFaces: [42] }));
    expect(kureMesh.faces.length).toBe(0);
  });
});
