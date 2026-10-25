import { describe, expect, it } from 'vitest';
import type { Point3D, Solid3DObject, Solid3DType } from '@/types/workspace3d';
import { generateSolidMesh } from '../geometry3d';
import { cisimMerkezi, cismiDondur, cismiOlcekle, cismiYansit, donmeyiSifirla, eksenMatrisi, kaliciYuzBul, uygula } from '../donusum3d';
import { cisimOlculeriniBirlestir, hazirOlculuCizimOlculeri } from '@/components/workspace/cisimYerlesimi';
import { hacimAlanMetni, turkceSayiOku } from '@/components/workspace/canvas3dDonusum';

/*
 * Regresyon (cizim-araclari-raporu.md, 3B düzeltmeleri): köşe kaydırmaları, silinen yüzler ve yüz renkleri cismin
 * dönüşümlerini izler; hazır ölçüler, sayı okuma ve hacim yazısı tutarlıdır.
 */

function cisim(type: Solid3DType, ek: Partial<Solid3DObject> = {}): Solid3DObject {
  return {
    id: `s-${type}`, type, name: `${type} 1`, position: { x: 1, y: 2, z: 0 },
    dimensions: { width: 3, height: 4, depth: 2, radius: 1.5 }, rotation: { x: 0, y: 0, z: 0 },
    color: '#3b82f6', opacity: 0.85, showWireframe: true, showVertices: true, showFaces: true, unfoldProgress: 0, selectedFaceIndex: null, ...ek,
  };
}
const koseler = (s: Solid3DObject) => generateSolidMesh(s).vertices;
const yakin = (p: Point3D, q: Point3D, tol = 1e-6) => Math.abs(p.x - q.x) < tol && Math.abs(p.y - q.y) < tol && Math.abs(p.z - q.z) < tol;
function ayniKume(a: Point3D[], b: Point3D[]) {
  expect(a.length).toBe(b.length);
  for (const p of a) expect(b.some((q) => yakin(p, q)), `${JSON.stringify(p)} karşılığı yok`).toBe(true);
}
const fark = (p: Point3D, q: Point3D) => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
const topla = (p: Point3D, q: Point3D) => ({ x: p.x + q.x, y: p.y + q.y, z: p.z + q.z });
const kaydirmali = cisim('cube', { dimensions: { width: 2, height: 2, depth: 2, radius: 1 }, vertexOffsets: { 0: { x: 0.5, y: 0.25, z: 0.75 } } });

describe('köşe kaydırmaları cismin dönüşümünü izler', () => {
  it('Döndür: kaydırılmış köşe de merkez etrafında döner', () => {
    const once = koseler(kaydirmali);
    const merkez = cisimMerkezi(kaydirmali);
    const R = eksenMatrisi('z', 90);
    const sonra = koseler(cismiDondur(kaydirmali, 'z', 90));
    ayniKume(sonra, once.map((p) => topla(merkez, uygula(R, fark(p, merkez)))));
  });

  it('Ölçekle: kaydırma da ölçekle büyür (taban merkezi sabit)', () => {
    const once = koseler(kaydirmali);
    const taban = kaydirmali.position;
    const sonra = koseler(cismiOlcekle(kaydirmali, 2));
    ayniKume(sonra, once.map((p) => topla(taban, { x: 2 * (p.x - taban.x), y: 2 * (p.y - taban.y), z: 2 * (p.z - taban.z) })));
  });

  it('Dönmeyi sıfırla: döndürülüp sıfırlanan cisim kaydırmasıyla ilk hâline döner', () => {
    const donmus = cismiDondur(cismiDondur(kaydirmali, 'x', 30), 'y', 45);
    ayniKume(koseler(donmeyiSifirla(donmus)), koseler(kaydirmali));
  });

  it('Yansıt: kaydırılmış köşe de aynaya geçer', () => {
    const once = koseler(kaydirmali);
    const sonra = koseler(cismiYansit(kaydirmali, 'yz', 0));
    ayniKume(sonra, once.map((p) => ({ x: -p.x, y: p.y, z: p.z })));
  });

  it('alt yapısı olmayan cisimde yansıma sonucu değişmez (kaydırma alanı eklenmez)', () => {
    const duz = cismiYansit(cisim('prism'), 'xz', 1);
    expect(duz.vertexOffsets).toBeUndefined();
    expect(duz.faceColors).toBeUndefined();
    expect(duz.deletedFaces).toBeUndefined();
  });
});

describe('yansımada yüz renkleri ve silinen yüzler aynadaki yüze geçer', () => {
  const yuzMerkezi = (s: Solid3DObject, yuz: number) => {
    const m = generateSolidMesh({ ...s, deletedFaces: undefined });
    const f = m.faces.find((g, i) => (g.faceIndex ?? i) === yuz)!;
    const k = f.vertexIndices.map((vi) => m.vertices[vi]);
    const t = k.reduce(topla, { x: 0, y: 0, z: 0 });
    return { x: t.x / k.length, y: t.y / k.length, z: t.z / k.length };
  };

  it('renkli yüzün aynadaki karşılığı aynı renkte', () => {
    const s = cisim('prism', { faceColors: { 2: '#ff0000' } });
    const once = yuzMerkezi(s, 2);
    const ayna = cismiYansit(s, 'yz', 0);
    const [[yuz, renk]] = Object.entries(ayna.faceColors ?? {});
    expect(renk).toBe('#ff0000');
    expect(yakin(yuzMerkezi(ayna, Number(yuz)), { x: -once.x, y: once.y, z: once.z })).toBe(true);
  });

  it('silinen yüz aynada da silinir', () => {
    const s = cisim('prism', { deletedFaces: [3] });
    const once = yuzMerkezi(s, 3);
    const ayna = cismiYansit(s, 'xz', 0);
    expect(ayna.deletedFaces).toHaveLength(1);
    expect(yakin(yuzMerkezi(ayna, ayna.deletedFaces![0]), { x: once.x, y: -once.y, z: once.z })).toBe(true);
  });
});

describe('kaliciYuzBul', () => {
  it('kalıcı yüz kimliğiyle bulur; kimlik yoksa sıradaki yüzü bulmaz', () => {
    const yuzler = [{ faceIndex: 4, ad: 'a' }, { faceIndex: 1, ad: 'b' }, { ad: 'c' }];
    expect(kaliciYuzBul({ faces: yuzler }, 1)?.ad).toBe('b');
    expect(kaliciYuzBul({ faces: yuzler }, 4)?.ad).toBe('a');
    expect(kaliciYuzBul({ faces: yuzler }, 7)).toBeUndefined();
  });
});

describe('hazır ölçüler', () => {
  it('cisimOlculeriniBirlestir: eksik ölçü varsayılandan, yarıçap genişlikten; küpte bütün ayrıtlar eşit', () => {
    expect(cisimOlculeriniBirlestir('prism')).toEqual({ width: 4, height: 2, depth: 3, radius: 2 });
    expect(cisimOlculeriniBirlestir('cylinder', { radius: 2 })).toMatchObject({ width: 4, depth: 4, radius: 2 });
    expect(cisimOlculeriniBirlestir('cube', { width: 5, height: 2 })).toEqual({ width: 5, height: 5, depth: 5, radius: 2.5 });
  });

  it('hazirOlculuCizimOlculeri: Kare Prizma (3 × 4 × 3) çizilen boyla büyürken kare tabanını korur', () => {
    const kare = { width: 3, height: 4, depth: 3 };
    expect(hazirOlculuCizimOlculeri('prism', 6, kare)).toMatchObject({ width: 6, depth: 6, height: 8 });
    expect(hazirOlculuCizimOlculeri('prism', 4.6, kare, true)).toMatchObject({ width: 5, depth: 5, height: 7 });
    // Hazır ölçü yoksa Zeminde Çiz kuralı (4 : 3 : 2)
    expect(hazirOlculuCizimOlculeri('prism', 8, null)).toMatchObject({ width: 8, depth: 6, height: 4 });
  });
});

describe('Türkçe sayı okuma ve hacim yazısı', () => {
  it.each<[string, number | null]>([
    ['2,5', 2.5], ['−3', -3], ['– 4,25', -4.25], ['1.000,5', 1000.5], [' 7 ', 7], ['abc', null], ['', null], ['1,2,3', null],
  ])('%j → %s', (girdi, beklenen) => {
    expect(turkceSayiOku(girdi)).toBe(beklenen);
  });

  it('hacim ve alan Bağlamlar sekmesiyle aynı basamakta (2 ondalık)', () => {
    const silindir = cisim('cylinder', { dimensions: { width: 2, height: 3, depth: 2, radius: 1 } });
    expect(hacimAlanMetni(silindir)).toBe('V = 9,42 br³ · A = 25,13 birimkare');
  });
});
