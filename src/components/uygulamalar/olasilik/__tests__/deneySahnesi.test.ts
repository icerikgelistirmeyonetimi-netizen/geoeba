import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { CarkDilimi } from '../olasilik';

/* Sahne modülü dinamik yüklenir: içe aktarma DOM'a dokunmamalı (Node ortamı). */
let m: typeof import('../deneySahnesi');

beforeAll(async () => {
  m = await import('../deneySahnesi');
});

const DILIMLER: CarkDilimi[] = [
  { ad: 'A', renk: '#000', genislik: 1 },
  { ad: 'B', renk: '#111', genislik: 2 },
  { ad: 'C', renk: '#222', genislik: 1 },
  { ad: 'D', renk: '#333', genislik: 4 },
];

describe('modül', () => {
  it('Node ortamında içe aktarılır ve sınıfı verir; WebGL yok', () => {
    expect(m.DeneySahnesi).toBeTypeOf('function');
    expect(m.webglDestekli()).toBe(false);
  });
});

describe('easing', () => {
  it('uçlarda 0 ve 1, ortada monoton', () => {
    for (const f of [m.kolayCikis, m.yumusakAdim, m.hizlanYavasla]) {
      expect(f(0)).toBeCloseTo(0);
      expect(f(1)).toBeCloseTo(1);
      expect(f(-1)).toBeCloseTo(0);
      expect(f(2)).toBeCloseTo(1);
      let onceki = 0;
      for (let t = 0.05; t <= 1; t += 0.05) {
        const v = f(t);
        expect(v).toBeGreaterThanOrEqual(onceki - 1e-9);
        onceki = v;
      }
    }
  });
});

describe('zar yüzü → quaternion', () => {
  it('her yüz için quaternion o yüzün normalini +Y yapar', () => {
    for (let yuz = 1; yuz <= 6; yuz++) {
      const q = m.zarYuzQuaternion(yuz);
      const n = m.zarYuzNormali(yuz).applyQuaternion(q);
      expect(n.y).toBeCloseTo(1, 6);
      expect(m.zarUstYuzu(q)).toBe(yuz);
    }
  });

  it('Y ekseninde dönme üst yüzü değiştirmez', () => {
    for (let yuz = 1; yuz <= 6; yuz++) for (const d of [0.3, 1.7, -2.2]) expect(m.zarUstYuzu(m.zarYuzQuaternion(yuz, d))).toBe(yuz);
  });

  it('karşılıklı yüzlerin toplamı 7', () => {
    const z = m.ZAR_YUZLERI;
    expect(z[0] + z[1]).toBe(7);
    expect(z[2] + z[3]).toBe(7);
    expect(z[4] + z[5]).toBe(7);
  });

  it('rastgele yönelimden hedefe slerp sonunda hedef yüz yukarıdadır', () => {
    const q0 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 2, 3).normalize(), 2.1);
    const qF = m.zarYuzQuaternion(5, 0.9);
    const ara = q0.clone().slerp(qF, 1);
    expect(m.zarUstYuzu(ara)).toBe(5);
  });
});

describe('madeni para açısı', () => {
  it('hedef yüz açıdan doğru okunur', () => {
    expect(m.paraYuzuAcidan(0)).toBe('tura');
    expect(m.paraYuzuAcidan(Math.PI)).toBe('yazi');
    expect(m.paraYuzuAcidan(4 * Math.PI)).toBe('tura');
  });

  it('hedef açı en az istenen tur kadar ileridedir ve hedef yüzü verir', () => {
    for (const mevcut of [0, Math.PI, 3 * Math.PI]) {
      for (const hedef of ['tura', 'yazi'] as const) {
        const a = m.paraHedefAcisi(mevcut, hedef, 4);
        expect(a - mevcut).toBeGreaterThanOrEqual(4 * m.IKI_PI - 1e-9);
        expect(a - mevcut).toBeLessThanOrEqual(4 * m.IKI_PI + Math.PI + 1e-9);
        expect(m.paraYuzuAcidan(a)).toBe(hedef);
      }
    }
  });
});

describe('çark', () => {
  it('dilim aralıkları genişlikle orantılı ve 2π toplar', () => {
    const a = m.dilimAraliklari(DILIMLER);
    expect(a).toHaveLength(4);
    expect(a[1].uzunluk).toBeCloseTo(a[0].uzunluk * 2);
    expect(a[3].baslangic + a[3].uzunluk).toBeCloseTo(m.IKI_PI);
    expect(m.dilimAraliklari([])).toEqual([]);
  });

  it('açı 0 iken ok ilk dilimi gösterir (ok −Z, dilimler +Z’den başlar → π yerel açı)', () => {
    // Yerel açı π: A(0–π/4), B(π/4–3π/4), C(3π/4–π), D(π–2π) → D
    expect(m.carkDilimi(0, DILIMLER)).toBe(3);
    expect(m.carkDilimi(0, [])).toBe(-1);
  });

  it('hedef açı her dilim için oku o dilime getirir ve ≥ 3 tam tur döner', () => {
    for (let i = 0; i < DILIMLER.length; i++) {
      for (const mevcut of [0, 1.3, 20.7]) {
        for (const u of [0, 0.5, 1]) {
          const hedef = m.carkHedefAcisi(i, DILIMLER, mevcut, 3, u);
          expect(hedef - mevcut).toBeGreaterThanOrEqual(3 * m.IKI_PI - 1e-9);
          expect(hedef - mevcut).toBeLessThan(4 * m.IKI_PI);
          expect(m.carkDilimi(hedef, DILIMLER)).toBe(i);
        }
      }
    }
  });

  it('dilim sınırında dönen sonuç kararlıdır (modulo negatif açı)', () => {
    expect(m.modulo(-1, m.IKI_PI)).toBeCloseTo(m.IKI_PI - 1);
    expect(m.carkDilimi(-m.IKI_PI * 5, DILIMLER)).toBe(m.carkDilimi(0, DILIMLER));
  });
});
