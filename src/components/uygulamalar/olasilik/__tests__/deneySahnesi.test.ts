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

describe('sayı küpü yüzü → quaternion', () => {
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

/**
 * Kullanıcı isteği (13.10): sayı küpünün yüzlerinde gerçek zar gibi noktalar değil rakamlar (1–6). Doku bir tuvale
 * çizilir; Node'da tuval yok, sahte tuval çizim çağrılarını kaydeder.
 */
function sahteTuvalleCiz<T>(ciz: () => T): { sonuc: T; cagrilar: { ad: string; arg: unknown[] }[] } {
  const cagrilar: { ad: string; arg: unknown[] }[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_h, ad: string) => (ad === 'createRadialGradient' || ad === 'createLinearGradient' ? () => ({ addColorStop: () => {} }) : (...arg: unknown[]) => cagrilar.push({ ad, arg })),
      set: (_h, ad: string, deger: unknown) => {
        cagrilar.push({ ad: `=${ad}`, arg: [deger] });
        return true;
      },
    }
  );
  const g = globalThis as { document?: unknown };
  const eski = g.document;
  g.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };
  try {
    return { sonuc: ciz(), cagrilar };
  } finally {
    if (eski === undefined) delete g.document;
    else g.document = eski;
  }
}

describe('sayı küpü yüzü: rakam, nokta yok', () => {
  it('her yüzün dokusu ortada tek bir rakam yazar; daire (pip) çizmez', () => {
    for (let yuz = 1; yuz <= 6; yuz++) {
      const { cagrilar } = sahteTuvalleCiz(() => m.zarDokusu(yuz));
      const yazilar = cagrilar.filter((c) => c.ad === 'fillText');
      expect(yazilar).toHaveLength(1);
      expect(yazilar[0].arg[0]).toBe(String(yuz));
      // Ortada (tuvalin yarısı) ve büyük, kalın yazı
      expect(yazilar[0].arg[1]).toBe(128);
      expect(cagrilar.some((c) => c.ad === 'arc')).toBe(false);
      const yazi = cagrilar.filter((c) => c.ad === '=font').map((c) => String(c.arg[0]));
      expect(yazi.at(-1)).toMatch(/^800 \d+px/);
      expect(Number(yazi.at(-1)?.match(/(\d+)px/)?.[1])).toBeGreaterThanOrEqual(140);
      // Fildişi zemin, mürekkep rengi rakam
      const renkler = cagrilar.filter((c) => c.ad === '=fillStyle').map((c) => c.arg[0]);
      expect(renkler[0]).toBe('#fbf7ee');
      expect(renkler.at(-1)).toBe('#15302d');
    }
  });

  it('yalnız 6 altı çizili (9 sanılmasın); öbür rakamlar çizgisiz', () => {
    for (let yuz = 1; yuz <= 6; yuz++) expect(m.zarYuzuYazisi(yuz)).toEqual({ rakam: String(yuz), altiCizili: yuz === 6 });
    const alti = sahteTuvalleCiz(() => m.zarDokusu(6)).cagrilar.filter((c) => c.ad === 'fillRect');
    const bes = sahteTuvalleCiz(() => m.zarDokusu(5)).cagrilar.filter((c) => c.ad === 'fillRect');
    expect(alti.length).toBe(bes.length + 1);
  });

  it('her yönelimde yukarı bakan yüzün rakamı sonuçtur (malzeme i ↔ ZAR_YUZLERI[i])', () => {
    for (let yuz = 1; yuz <= 6; yuz++) {
      for (const d of [0, 0.4, -0.6, 2.5]) {
        const q = m.zarYuzQuaternion(yuz, d);
        const ust = m.zarUstYuzu(q);
        expect(ust).toBe(yuz);
        const i = m.ZAR_YUZLERI.indexOf(ust);
        expect(m.zarYuzuYazisi(m.ZAR_YUZLERI[i]).rakam).toBe(String(yuz));
      }
    }
  });

  it('üstteki rakam düz okunur: dönme 0 iken yüz dokusunun üstü kameradan uzağa (−Z) bakar', () => {
    for (let yuz = 1; yuz <= 6; yuz++) {
      const q = m.zarYuzQuaternion(yuz, 0);
      const i = m.ZAR_YUZLERI.indexOf(yuz);
      const ust = m.ZAR_DOKU_YUKARILARI[i].clone().applyQuaternion(q);
      expect(ust.x).toBeCloseTo(0, 6);
      expect(ust.y).toBeCloseTo(0, 6);
      expect(ust.z).toBeCloseTo(-1, 6);
      // Küçük dönme yalnız eğiklik verir (en çok o açı kadar)
      const egik = m.ZAR_DOKU_YUKARILARI[i].clone().applyQuaternion(m.zarYuzQuaternion(yuz, 0.5));
      expect(egik.angleTo(new THREE.Vector3(0, 0, -1))).toBeCloseTo(0.5, 6);
    }
  });

  it('doku yukarıları yüz normallerine dik (her yüzün kendi düzleminde)', () => {
    for (let i = 0; i < 6; i++) expect(m.ZAR_DOKU_YUKARILARI[i].dot(m.zarYuzNormali(m.ZAR_YUZLERI[i]))).toBeCloseTo(0, 9);
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
