import { describe, expect, it } from 'vitest';
import type { Point3D, Solid3DObject, Solid3DType } from '@/types/workspace3d';
import { generateSolidMesh } from '../geometry3d';
import { cisimMerkezi } from '../donusum3d';
import { kameraTabani, VARSAYILAN_KAMERA_3B } from '@/components/workspace/cisimYerlesimi';
import {
  ESIK_EN_AZ,
  ESIK_EN_COK,
  TEMAS_PAYI,
  cokgenKes,
  destekBul,
  dikAciliMi,
  esikler,
  izAnahtari,
  kesisir,
  kesitAl,
  noktaCokgendeMi,
  pikselBasinaBirim,
  surukleKipi,
  temasOtelemesi,
  yapismaGovdesi,
  yapismaOturumuKur,
  yapistir,
  type YapismaGirdisi,
  type YapismaKipi,
  type YapismaOturumu,
  type YapismaProfili,
} from '../yapisma3d';

/*
 * YAP3B — 3B Mıknatıs saf modülü (src/math/yapisma3d.ts). Ortak düzen: birim küpler, pikselBasinaBirim = 50
 * (temas 0,28 / 0,40 · hiza 0,24 / 0,32 · ızgara 0,20 / 0,28 · destek 0,12), profil otomatik, ızgara gizli.
 */

const KESIN = 1e-9;
const SIFIR = { x: 0, y: 0, z: 0 };

function cisim(id: string, type: Solid3DType, position: Partial<Point3D> = {}, ek: Partial<Solid3DObject> = {}): Solid3DObject {
  return {
    id,
    type,
    name: id,
    position: { x: 0, y: 0, z: 0, ...position },
    dimensions: { width: 1, height: 1, depth: 1, radius: 0.5 },
    rotation: { x: 0, y: 0, z: 0 },
    color: '#93c5fd',
    opacity: 0.85,
    showWireframe: true,
    showVertices: false,
    showFaces: true,
    unfoldProgress: 0,
    selectedFaceIndex: null,
    ...ek,
  };
}
const kup = (id: string, x = 0, y = 0, z = 0, w = 1, ek: Partial<Solid3DObject> = {}) =>
  cisim(id, 'cube', { x, y, z }, { dimensions: { width: w, height: w, depth: w, radius: w / 2 }, ...ek });
const prizma = (id: string, x = 0, y = 0, z = 0, w = 4, d = 3, h = 2, ek: Partial<Solid3DObject> = {}) =>
  cisim(id, 'prism', { x, y, z }, { dimensions: { width: w, depth: d, height: h, radius: w / 2 }, ...ek });
const silindir = (id: string, x = 0, y = 0, z = 0, r = 1, h = 2, ek: Partial<Solid3DObject> = {}) =>
  cisim(id, 'cylinder', { x, y, z }, { dimensions: { width: 2 * r, depth: 2 * r, height: h, radius: r }, ...ek });
const kure = (id: string, x = 0, y = 0, z = 0, r = 1, ek: Partial<Solid3DObject> = {}) =>
  cisim(id, 'sphere', { x, y, z }, { dimensions: { width: 2 * r, depth: 2 * r, height: 2 * r, radius: r }, ...ek });

const OTO: YapismaProfili = { izgara: 'otomatik', zeminEngel: true, hizaCizgisi: true };
const HER_ZAMAN: YapismaProfili = { izgara: 'her_zaman', zeminEngel: true, hizaCizgisi: false };

function oturum(solids: Solid3DObject[], ids: string[], kip: YapismaKipi = 'serbest', profil: YapismaProfili = OTO): YapismaOturumu {
  const bas = Object.fromEntries(solids.filter((s) => ids.includes(s.id)).map((s) => [s.id, { ...s.position }]));
  return yapismaOturumuKur(solids, ids, bas, kip, profil);
}
const kare = (o: YapismaOturumu, ham: Partial<Point3D>, ek: Partial<YapismaGirdisi> = {}) =>
  yapistir(o, { hamDelta: { x: 0, y: 0, z: 0, ...ham }, pikselBasinaBirim: 50, izgaraGorunur: false, ...ek });

/** Taşınanın son kutusu */
function sonKutu(s: Solid3DObject, d: Point3D) {
  const g = yapismaGovdesi(s, { x: s.position.x + d.x, y: s.position.y + d.y, z: s.position.z + d.z })!;
  return g.kutu;
}

function mulberry32(tohum: number) {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('1. dünya eksenli kutu', () => {
  it('küp, prizma, küre ve döndürülmüş prizma / küp', () => {
    const k = yapismaGovdesi(kup('a', 0, 0, 0, 3))!.kutu;
    expect(k.min).toEqual({ x: -1.5, y: -1.5, z: 0 });
    expect(k.max).toEqual({ x: 1.5, y: 1.5, z: 3 });
    const p = yapismaGovdesi(prizma('p'))!.kutu;
    expect([p.min.x, p.max.x, p.min.y, p.max.y, p.min.z, p.max.z]).toEqual([-2, 2, -1.5, 1.5, 0, 2]);
    const s = yapismaGovdesi(kure('s', 0, 0, 0, 1.5))!.kutu;
    expect(s.min.z).toBeCloseTo(0, 12);
    expect(s.max.z).toBeCloseTo(3, 12);
    const p90 = yapismaGovdesi(prizma('p', 0, 0, 0, 4, 3, 2, { rotation: { x: 0, y: 0, z: 90 } }))!.kutu;
    expect(p90.min.x).toBeCloseTo(-1.5, 9);
    expect(p90.max.y).toBeCloseTo(2, 9);
    const k45 = yapismaGovdesi(kup('a', 0, 0, 0, 3, { rotation: { x: 0, y: 0, z: 45 } }))!.kutu;
    expect(k45.max.x).toBeCloseTo(1.5 * Math.SQRT2, 9);
  });

  it('kutu ağ köşelerinin kutusudur (çokyüzlü); eğri cisimde ağı kapsar (7 tür × 20 tohumlu dönme)', () => {
    const rnd = mulberry32(7);
    const turler: Solid3DType[] = ['cube', 'prism', 'triangular_prism', 'pyramid', 'cylinder', 'cone', 'sphere'];
    for (const tur of turler) {
      for (let i = 0; i < 20; i++) {
        const rot = i < 4 ? { x: 90 * i, y: 0, z: 90 * (i % 2) } : { x: rnd() * 360, y: rnd() * 360, z: rnd() * 360 };
        const s = cisim('c', tur, { x: rnd() * 4 - 2, y: rnd() * 4 - 2, z: rnd() * 2 }, {
          rotation: rot,
          dimensions: { width: 1 + rnd() * 2, depth: 1 + rnd() * 2, height: 1 + rnd() * 2, radius: 0.5 + rnd() },
        });
        const g = yapismaGovdesi(s)!;
        const V = generateSolidMesh(s).vertices;
        for (const e of ['x', 'y', 'z'] as const) {
          const mn = Math.min(...V.map((v) => v[e]));
          const mx = Math.max(...V.map((v) => v[e]));
          if (g.profil.tur === 'cokyuzlu') {
            expect(g.kutu.min[e]).toBeCloseTo(mn, 9);
            expect(g.kutu.max[e]).toBeCloseTo(mx, 9);
          } else {
            expect(g.kutu.min[e]).toBeLessThanOrEqual(mn + 1e-9);
            expect(g.kutu.max[e]).toBeGreaterThanOrEqual(mx - 1e-9);
          }
        }
      }
    }
  });

  it('açınımlı ya da gizli cisim gövde vermez', () => {
    expect(yapismaGovdesi(kup('a', 0, 0, 0, 1, { unfoldProgress: 0.3 }))).toBeNull();
    expect(yapismaGovdesi(kup('a', 0, 0, 0, 1, { opacity: 0 }))).toBeNull();
  });
});

describe('2. gerçek düz yüzler', () => {
  const yonler = (s: Solid3DObject) => Object.keys(yapismaGovdesi(s)!.yuzler).sort();
  it('küpte 6, dik silindirde ±z, kürede yok, piramit ve konide düz üst yüz yok', () => {
    expect(yonler(kup('a'))).toEqual(['+x', '+y', '+z', '-x', '-y', '-z']);
    expect(yonler(silindir('s'))).toEqual(['+z', '-z']);
    expect(yonler(kure('k'))).toEqual([]);
    expect(yonler(cisim('p', 'pyramid'))).toEqual(['-z']);
    expect(yonler(cisim('k', 'cone'))).toEqual(['-z']);
  });
  it('üçgen prizma: ikizkenarda ±x yok, dik üçgende −x var, x ekseninde 180° çevrilince +z var', () => {
    expect(yonler(cisim('u', 'triangular_prism'))).toEqual(['+y', '-y', '-z']);
    expect(yonler(cisim('u', 'triangular_prism', {}, { tabanUcgeni: 'dik' }))).toEqual(['+y', '-x', '-y', '-z']);
    expect(yonler(cisim('u', 'triangular_prism', {}, { rotation: { x: 180, y: 0, z: 0 } }))).toContain('+z');
  });
  it('yüz çokgeni yüz düzleminin koordinatlarındadır (+z: x, y)', () => {
    const ust = yapismaGovdesi(kup('a', 2, 3, 0, 2))!.yuzler['+z']!;
    expect(ust.map((p) => [p.u, p.v]).sort()).toEqual([[1, 2], [1, 4], [3, 2], [3, 4]]);
  });
});

describe('3. hiza türü ve gövde profili', () => {
  it('dik açılı çokyüzlü kenar, eğik ya da eğri cisim orta', () => {
    expect(yapismaGovdesi(kup('a'))!.hiza).toBe('kenar');
    expect(yapismaGovdesi(kup('a', 0, 0, 0, 1, { rotation: { x: 0, y: 0, z: 30 } }))!.hiza).toBe('orta');
    expect(yapismaGovdesi(silindir('s'))!.hiza).toBe('orta');
    expect(yapismaGovdesi(kup('a', 0, 0, 0, 1, { rotation: { x: 90, y: 180, z: 270 } }))!.hiza).toBe('kenar');
    expect(dikAciliMi({ x: 90, y: 0, z: -90 })).toBe(true);
    expect(dikAciliMi({ x: 0, y: 0, z: 45 })).toBe(false);
  });
  it('dik silindir silindir, yatırılmış silindir çokyüzlü, ters koni koni_asagi, döndürülmüş küre kure', () => {
    expect(yapismaGovdesi(silindir('s'))!.profil.tur).toBe('silindir');
    expect(yapismaGovdesi(silindir('s', 0, 0, 0, 1, 2, { rotation: { x: 90, y: 0, z: 0 } }))!.profil.tur).toBe('cokyuzlu');
    expect(yapismaGovdesi(cisim('k', 'cone', { z: 2 }, { rotation: { x: 180, y: 0, z: 0 } }))!.profil.tur).toBe('koni_asagi');
    expect(yapismaGovdesi(cisim('k', 'cone'))!.profil.tur).toBe('koni_yukari');
    const k = kure('k', 1, 2, 0, 1, { rotation: { x: 90, y: 0, z: 0 } });
    const p = yapismaGovdesi(k)!.profil;
    expect(p.tur).toBe('kure');
    if (p.tur === 'kure') {
      const c = cisimMerkezi(k);
      expect(p.c.x).toBeCloseTo(c.x, 12);
      expect(p.c.y).toBeCloseTo(c.y, 12);
      expect(p.c.z).toBeCloseTo(c.z, 12);
    }
  });
});

describe('4. dilim kesiti', () => {
  it('piramit (taban 3, yükseklik 3) z ∈ [1; 2] → yarı genişlik 1', () => {
    const g = yapismaGovdesi(cisim('p', 'pyramid', {}, { dimensions: { width: 3, depth: 3, height: 3 } }))!;
    const k = kesitAl(g, SIFIR, 1, 2)!;
    expect(k.tur).toBe('kutu');
    if (k.tur === 'kutu') {
      expect(k.maxX).toBeCloseTo(1, 9);
      expect(k.minY).toBeCloseTo(-1, 9);
    }
  });
  it('dik üçgen prizma yukarı doğru incelir', () => {
    const g = yapismaGovdesi(cisim('u', 'triangular_prism', {}, { tabanUcgeni: 'dik', dimensions: { width: 2, depth: 2, height: 2 } }))!;
    const k = kesitAl(g, SIFIR, 1, 2)!;
    if (k.tur !== 'kutu') throw new Error('kutu bekleniyordu');
    expect(k.minX).toBeCloseTo(-1, 9);
    expect(k.maxX).toBeCloseTo(0, 9);
  });
  it('koni yukarı / aşağı ve küre ekvatoru', () => {
    const yukari = yapismaGovdesi(cisim('k', 'cone', {}, { dimensions: { width: 2, depth: 2, height: 2, radius: 1 } }))!;
    expect(kesitAl(yukari, SIFIR, 1, 2)).toMatchObject({ tur: 'daire', r: 0.5 });
    const asagi = yapismaGovdesi(cisim('k', 'cone', { z: 2 }, { rotation: { x: 180, y: 0, z: 0 }, dimensions: { width: 2, depth: 2, height: 2, radius: 1 } }))!;
    const ka = kesitAl(asagi, SIFIR, 0, 1)!;
    expect(ka.tur === 'daire' && ka.r).toBeCloseTo(0.5, 9);
    const k = yapismaGovdesi(kure('k'))!;
    expect(kesitAl(k, SIFIR, 0.5, 1.5)).toMatchObject({ tur: 'daire', r: 1 });
    const ust = kesitAl(k, SIFIR, 1.5, 2)!;
    expect(ust.tur === 'daire' && ust.r).toBeCloseTo(Math.sqrt(0.75), 9);
    expect(kesitAl(k, SIFIR, 3, 4)).toBeNull();
  });
});

describe('5. temas ötelemesi', () => {
  it('kutu–kutu', () => {
    const a = yapismaGovdesi(kup('a', -3))!;
    const b = yapismaGovdesi(kup('b'))!;
    expect(temasOtelemesi(a, SIFIR, b, 'x')).toEqual({ once: 2, sonra: 4 });
  });
  it('silindir (r 1) küpün köşesinde: dv 0,5 → Δ 0,866', () => {
    const s = yapismaGovdesi(silindir('s', -3, 1))!;
    const b = yapismaGovdesi(kup('b'))!;
    const r = temasOtelemesi(s, SIFIR, b, 'x')!;
    expect(r.once).toBeCloseTo(-0.5 - Math.sqrt(0.75) + 3, 9);
  });
  it('eş silindirler dv 1 → √3; küre–küre zeminde r 1 ve 2 → yatay 2√2', () => {
    const s1 = yapismaGovdesi(silindir('s1', -5, 1))!;
    const s2 = yapismaGovdesi(silindir('s2'))!;
    expect(temasOtelemesi(s1, SIFIR, s2, 'x')!.once).toBeCloseTo(-Math.sqrt(3) + 5, 9);
    const k1 = yapismaGovdesi(kure('k1', -6, 0, 0, 1))!;
    const k2 = yapismaGovdesi(kure('k2', 0, 0, 0, 2))!;
    expect(temasOtelemesi(k1, SIFIR, k2, 'x')!.once).toBeCloseTo(-2 * Math.SQRT2 + 6, 9);
  });
  it('v\'de örtüşme yoksa ya da dilim kalınlığı paydan inceyse null', () => {
    const a = yapismaGovdesi(kup('a', -3, 2))!;
    const b = yapismaGovdesi(kup('b'))!;
    expect(temasOtelemesi(a, SIFIR, b, 'x')).toBeNull();
    const ust = yapismaGovdesi(kup('u', -3, 0, 1))!;
    expect(temasOtelemesi(ust, SIFIR, b, 'x')).toBeNull();
  });
});

describe('6. yüz yüze temas — altı yön', () => {
  it('±x ve ±y: 0,2 boşluk da 0,2 içeri de tam temasa çekilir', () => {
    for (const [eksen, isaret] of [['x', 1], ['x', -1], ['y', 1], ['y', -1]] as const) {
      for (const fark of [0.2, -0.2]) {
        const bas = { x: 0, y: 0, z: 0 };
        bas[eksen] = -3 * isaret;
        const a = kup('a', bas.x, bas.y);
        const o = oturum([a, kup('b')], ['a']);
        const ham = { x: 0, y: 0, z: 0 };
        // A'nın B'ye bakan yüzü B'nin yüzüne `fark` kadar uzak (eksi: içeri)
        ham[eksen] = isaret * (3 - 1 - fark);
        const r = kare(o, ham);
        expect(r.durum).toBe('yapisti');
        expect(Math.abs(r.delta[eksen] - isaret * 2)).toBeLessThanOrEqual(KESIN);
        expect(r.iz?.temaslar.some((t) => t.tur === 'yuz')).toBe(true);
      }
    }
  });
  it('+z serbest: ortası B\'nin üstüne gelen A B\'ye oturur ve kenarları hizalanır', () => {
    const o = oturum([kup('a', -3), kup('b')], ['a']);
    const r = kare(o, { x: 3.1 });
    expect(r.delta.z).toBeCloseTo(1, 12);
    expect(r.delta.x).toBeCloseTo(3, 12);
    expect(r.iz?.destekId).toBe('b');
  });
  it('+z z okuyla: 0,2 yukarıdan inerken oturur', () => {
    const o = oturum([kup('a', 0, 0, 1.2), kup('b')], ['a'], 'z');
    const r = kare(o, { z: -0.15 });
    expect(r.delta.z).toBeCloseTo(-0.2, 12);
  });
  it('−z z okuyla: havadaki B\'nin altına 0,2 yaklaşınca A.max.z = B.min.z', () => {
    const o = oturum([kup('a'), kup('b', 0, 0, 3)], ['a'], 'z');
    const r = kare(o, { z: 1.8 });
    expect(r.delta.z).toBeCloseTo(2, 12);
  });
});

describe('7. kenar ve merkez hizası', () => {
  it('min↔min ve max↔max (temas eden yüzde)', () => {
    const b = kup('b', 0, 0, 0, 2);
    let o = oturum([kup('a', -4, -0.35), b], ['a']);
    let r = kare(o, { x: 2.5 });
    expect(r.delta.x).toBeCloseTo(2.5, 12);
    expect(sonKutu(kup('a', -4, -0.35), r.delta).min.y).toBeCloseTo(-1, 9);
    o = oturum([kup('a', -4, 0.35), b], ['a']);
    r = kare(o, { x: 2.5 });
    expect(sonKutu(kup('a', -4, 0.35), r.delta).max.y).toBeCloseTo(1, 9);
    expect(r.iz?.hizalar[0]?.tur).toBe('kenar');
  });
  it('merkez hizası: A 2 br, B 4 br, merkezler 0,2 farklı', () => {
    const o = oturum([kup('a', -5, 0.2, 0, 2), kup('b', 0, 0, 0, 4)], ['a']);
    const r = kare(o, { x: 2 });
    expect(r.delta.y).toBeCloseTo(-0.2, 12);
    expect(r.iz?.hizalar[0]?.tur).toBe('orta');
  });
  it('köşe köşeye (min↔max) aday üretilmez', () => {
    const o = oturum([kup('a', -3, 0.9), kup('b')], ['a']);
    const r = kare(o, { x: 1.9 });
    expect(r.delta.x).toBeCloseTo(2, 12);
    expect(r.delta.y).toBe(0);
  });
});

describe('8. eğri cisimde yalnız orta', () => {
  it('silindir küpün yanında: kenar adayına 0,1 → çekilmez; merkeze 0,2 → ortalanır', () => {
    const b = kup('b', 0, 0, 0, 2);
    let o = oturum([silindir('s', -4, -0.4, 0, 0.5), b], ['s']);
    let r = kare(o, { x: 2.4 });
    expect(r.delta.x).toBeCloseTo(2.5, 9);
    expect(r.delta.y).toBe(0);
    o = oturum([silindir('s', -4, 0.2, 0, 0.5), b], ['s']);
    r = kare(o, { x: 2.4 });
    expect(r.delta.y).toBeCloseTo(-0.2, 12);
  });
});

describe('9. istif', () => {
  it('dayanan A boşlukta zeminde; ortası B\'nin üstünde → B.max.z', () => {
    const o = oturum([kup('a', -3), kup('b')], ['a']);
    expect(kare(o, { x: 1 }).delta.z).toBe(0);
    expect(kare(o, { x: 2.95 }).delta.z).toBeCloseTo(1, 12);
  });
  it('tabanı biner, ortası dışarıda → zeminde kalır ve yana itilir', () => {
    const o = oturum([kup('a', -3), kup('b')], ['a']);
    const r = kare(o, { x: 2.4 });
    expect(r.delta.z).toBe(0);
    expect(r.durum).toBe('itildi');
    expect(r.delta.x).toBeCloseTo(2, 12);
  });
  it('kürenin üstüne gelen küp yere iner ve küreye dayanır (içine girmez)', () => {
    const k = kure('k', 0, 0, 0, 1);
    const o = oturum([kup('a', -4), k], ['a']);
    let r = kare(o, {});
    for (let x = 0; x <= 3.75; x += 0.05) r = kare(o, { x });
    const gk = yapismaGovdesi(k)!;
    const ga = yapismaGovdesi(kup('a', -4))!;
    expect(r.delta.z).toBe(0);
    expect(kesisir(ga, r.delta, gk)).toBe(false);
    expect(sonKutu(kup('a', -4), r.delta).max.x).toBeCloseTo(-1, 6);
  });
  it('küre küpün üstüne oturur', () => {
    const o = oturum([kure('k', -4, 0, 0, 0.5), kup('b', 0, 0, 0, 2)], ['k']);
    const r = kare(o, { x: 4.1 });
    expect(r.delta.z).toBeCloseTo(2, 12);
  });
  it('havadaki A (z 2) serbest sürüklemede z 2\'de kalır', () => {
    const o = oturum([kup('a', -3, 0, 2), kup('b', 5)], ['a']);
    expect(o.dayaniyordu).toBe(false);
    expect(kare(o, { x: 1.3, y: 0.7 }).delta.z).toBe(0);
  });
});

describe('10. destek histerezisi', () => {
  it('ortası üst yüz kenarında ±0,05 salınır → destek değişmez; 0,2 dışarı → zemine iner', () => {
    const o = oturum([kup('a', 0, 0, 1), kup('b')], ['a']);
    expect(o.dayaniyordu).toBe(true);
    for (const x of [0.45, 0.55, 0.45, 0.55]) expect(kare(o, { x }).delta.z).toBe(0);
    const r = kare(o, { x: 0.7 });
    expect(r.delta.z).toBeCloseTo(-1, 12);
    expect(r.delta.x).toBeCloseTo(1, 12);
  });
});

describe('11. ızgara', () => {
  it('her_zaman (ilkokul): köşe tam sayıya; orta grupta merkez', () => {
    let o = oturum([kup('a')], ['a'], 'serbest', HER_ZAMAN);
    let r = kare(o, { x: 0.37, y: -0.2 }, { izgaraGorunur: true });
    expect(sonKutu(kup('a'), r.delta).min.x).toBeCloseTo(0, 12);
    expect(sonKutu(kup('a'), r.delta).min.y).toBeCloseTo(-1, 12);
    o = oturum([kure('k', 0, 0, 0, 0.5)], ['k'], 'serbest', HER_ZAMAN);
    r = kare(o, { x: 0.37 }, { izgaraGorunur: true });
    expect(r.delta.x).toBeCloseTo(0, 12);
  });
  it('otomatik: 0,15 → çizgiye; 0,25 → değişmez; ızgara gizli → yok', () => {
    const a = kup('a', 0.5, 0.5);
    let o = oturum([a], ['a']);
    let r = kare(o, { x: 0.15 }, { izgaraGorunur: true });
    expect(r.delta.x).toBeCloseTo(0, 12);
    o = oturum([a], ['a']);
    r = kare(o, { x: 0.25, y: 0.25 }, { izgaraGorunur: true });
    expect(r.delta).toEqual({ x: 0.25, y: 0.25, z: 0 });
    o = oturum([a], ['a']);
    r = kare(o, { x: 0.15 });
    expect(r.delta.x).toBe(0.15);
  });
});

describe('12. eşik dışı → değişmez', () => {
  it('0,5 boşluk: delta hama birebir eşit, iz yok', () => {
    const o = oturum([kup('a', -3), kup('b')], ['a']);
    const r = kare(o, { x: 1.5, y: 0.123 });
    expect(r.delta).toEqual({ x: 1.5, y: 0.123, z: 0 });
    expect(r.iz).toBeNull();
    expect(r.durum).toBe('serbest');
  });
});

describe('13. çakışma', () => {
  it('ortası dışarıda 0,6 içeri → en yakın temasa itilir', () => {
    const o = oturum([kup('a', -4, 0, 0, 2), kup('b')], ['a']);
    const r = kare(o, { x: 3.1 });
    expect(r.durum).toBe('itildi');
    expect(sonKutu(kup('a', -4, 0, 0, 2), r.delta).max.x).toBeCloseTo(-0.5, 12);
  });
  it('köşe cebi: iki komşuya birlikte değer', () => {
    const o = oturum([kup('a', -3, -3), kup('b'), kup('c', -1, 1)], ['a']);
    const r = kare(o, { x: 1.9, y: 2.9 });
    expect(r.delta.x).toBeCloseTo(2, 12);
    expect(r.delta.y).toBeCloseTo(3, 12);
    expect(r.iz?.temaslar.filter((t) => t.tur === 'yuz')).toHaveLength(2);
  });
  it('0,5\'lik aralığa birim küp sığmaz → durdu, delta = son geçerli', () => {
    const o = oturum([kup('a', 0.75, -3), kup('b'), kup('c', 1.5)], ['a']);
    const once = kare(o, { y: 1 });
    expect(once.durum).not.toBe('durdu');
    const r = kare(o, { y: 3 });
    expect(r.durum).toBe('durdu');
    expect(r.delta).toEqual(once.delta);
  });
});

describe('14. özellik testi: iç içe geçme yok', () => {
  it('300 tohumlu sahne × 20 kare', () => {
    const rnd = mulberry32(20261014);
    const turler: Solid3DType[] = ['cube', 'prism', 'triangular_prism', 'pyramid', 'cylinder', 'cone', 'sphere'];
    let sinanan = 0;
    for (let sahne = 0; sahne < 300; sahne++) {
      const n = 2 + Math.floor(rnd() * 5);
      const solids: Solid3DObject[] = [];
      for (let i = 0; i < n; i++) {
        const tur = turler[Math.floor(rnd() * turler.length)];
        const dik = rnd() < 0.6;
        const rot = dik ? { x: 90 * Math.floor(rnd() * 4), y: 0, z: 90 * Math.floor(rnd() * 4) } : { x: rnd() * 60, y: rnd() * 60, z: rnd() * 360 };
        solids.push(
          cisim(`c${i}`, tur, { x: Math.round((rnd() * 10 - 5) * 100) / 100, y: Math.round((rnd() * 10 - 5) * 100) / 100, z: rnd() < 0.8 ? 0 : Math.round(rnd() * 300) / 100 }, {
            rotation: rot,
            dimensions: { width: 0.5 + rnd() * 2.5, depth: 0.5 + rnd() * 2.5, height: 0.5 + rnd() * 2.5, radius: 0.3 + rnd() * 1.2 },
          }),
        );
      }
      const tasinan = rnd() < 0.3 && n > 2 ? ['c0', 'c1'] : ['c0'];
      const kipler: YapismaKipi[] = ['serbest', 'serbest', 'serbest', 'x', 'y', 'z'];
      const kip = kipler[Math.floor(rnd() * kipler.length)];
      const o = oturum(solids, tasinan, kip, rnd() < 0.5 ? OTO : HER_ZAMAN);
      const ham = { x: 0, y: 0, z: 0 };
      for (let k = 0; k < 20; k++) {
        if (kip === 'serbest' || kip === 'x') ham.x += rnd() * 1.2 - 0.6;
        if (kip === 'serbest' || kip === 'y') ham.y += rnd() * 1.2 - 0.6;
        if (kip === 'z') ham.z += rnd() * 1.2 - 0.6;
        const r = yapistir(o, { hamDelta: { ...ham }, pikselBasinaBirim: 20 + rnd() * 100, izgaraGorunur: rnd() < 0.7, dokunma: rnd() < 0.2 });
        for (const m of o.tasinanlar) {
          for (const h of o.hedefler) {
            if (o.affedilen.has(`${m.id}|${h.id}`)) continue;
            sinanan++;
            expect(kesisir(m, r.delta, h), `sahne ${sahne} kare ${k} ${m.id}-${h.id}`).toBe(false);
            // Dik kutu çiftlerinde bağımsız denetim: gerçek ağların kutuları paydan derin örtüşmez
            const sm = solids.find((s) => s.id === m.id)!;
            const sh = solids.find((s) => s.id === h.id)!;
            if ((sm.type === 'cube' || sm.type === 'prism') && (sh.type === 'cube' || sh.type === 'prism') && dikAciliMi(sm.rotation) && dikAciliMi(sh.rotation)) {
              const ka = sonKutu(sm, r.delta);
              const kb = yapismaGovdesi(sh)!.kutu;
              const ortusme = (['x', 'y', 'z'] as const).map((e) => Math.min(ka.max[e], kb.max[e]) - Math.max(ka.min[e], kb.min[e]));
              expect(Math.min(...ortusme)).toBeLessThanOrEqual(TEMAS_PAYI + 1e-9);
            }
          }
        }
      }
    }
    expect(sinanan).toBeGreaterThan(5000);
  });
});

describe('15. affetme', () => {
  it('B\'nin içinde başlayan A için B görünmez', () => {
    const o = oturum([kup('a', 0, 0, 0, 1), kup('b', 0, 0, 0, 3)], ['a']);
    expect(o.affedilen.has('a|b')).toBe(true);
    const r = kare(o, { x: 0.3 });
    expect(r.delta).toEqual({ x: 0.3, y: 0, z: 0 });
    expect(r.iz).toBeNull();
  });
});

describe('16. döndürülmüş cisim', () => {
  it('45° küp düz küpün yanında: kesişme yok, yüz izi yok, hiza yalnız orta', () => {
    const a = kup('a', -3, 0.1, 0, 1, { rotation: { x: 0, y: 0, z: 45 } });
    const o = oturum([a, kup('b')], ['a']);
    const r = kare(o, { x: 1.7 });
    const ga = yapismaGovdesi(a)!;
    expect(kesisir(ga, r.delta, yapismaGovdesi(kup('b'))!)).toBe(false);
    expect(sonKutu(a, r.delta).max.x).toBeCloseTo(-0.5, 9);
    expect(r.iz?.temaslar).toEqual([]);
    expect(r.iz?.hizalar.map((h) => h.tur)).toEqual(['orta']);
  });
});

describe('17. çoklu seçim tek gövde', () => {
  it('iki küplü grup yakın üyeden temas alır, aynı delta; öteki üye üçüncüye girmez', () => {
    const solids = [kup('a1', -4), kup('a2', -4, 1.5), kup('b'), kup('c', 0, 1.5)];
    const o = oturum(solids, ['a1', 'a2']);
    const r = kare(o, { x: 3.2 });
    expect(r.delta.x).toBeCloseTo(3, 12);
    for (const id of ['a1', 'a2']) for (const h of ['b', 'c']) expect(kesisir(o.tasinanlar.find((m) => m.id === id)!, r.delta, o.hedefler.find((x) => x.id === h)!)).toBe(false);
  });
  it('bir üyenin ortası bloğun üstündeyse grup yükselir; iki katlı kule kule kalır', () => {
    let o = oturum([kup('a1', -4), kup('a2', -5), kup('b')], ['a1', 'a2']);
    expect(kare(o, { x: 4 }).delta.z).toBeCloseTo(1, 12);
    o = oturum([kup('a1', -4), kup('a2', -4, 0, 1), kup('b', 4)], ['a1', 'a2']);
    const r = kare(o, { x: 1.3, y: 2 });
    expect(r.delta.z).toBe(0);
  });
});

describe('18. ok kipleri', () => {
  it('x oku: B\'nin öbür yanına atlayan ham temasta durur (tünel yok)', () => {
    const o = oturum([kup('a', -3), kup('b')], ['a'], 'x');
    expect(kare(o, { x: 5 }).delta.x).toBeCloseTo(2, 12);
    const o2 = oturum([kup('a', 3), kup('b')], ['a'], 'x');
    expect(kare(o2, { x: -5 }).delta.x).toBeCloseTo(-2, 12);
  });
  it('z oku: aşağı inen B\'nin üstünde durur; zemin engeli; z ızgarası 1 br', () => {
    let o = oturum([kup('a', 0, 0, 3), kup('b')], ['a'], 'z');
    expect(kare(o, { z: -5 }).delta.z).toBeCloseTo(-2, 12);
    o = oturum([kup('a', 5)], ['a'], 'z');
    expect(kare(o, { z: -2 }).delta.z).toBe(0);
    o = oturum([kup('a', 5)], ['a'], 'z', { ...OTO, zeminEngel: false });
    expect(kare(o, { z: -2 }).delta.z).toBe(-2);
    o = oturum([kup('a', 5)], ['a'], 'z', HER_ZAMAN);
    expect(kare(o, { z: 1.37 }, { izgaraGorunur: true }).delta.z).toBeCloseTo(1, 12);
  });
  it('surukleKipi: ok → eksen, merkez + Shift → z, öteki → serbest', () => {
    expect(surukleKipi('x', false)).toBe('x');
    expect(surukleKipi('free', true)).toBe('z');
    expect(surukleKipi('free', false)).toBe('serbest');
  });
});

describe('19. Alt (geçici kapatma)', () => {
  it('Alt basılıyken delta = ham, iz yok; Alt bırakılınca örtüşen konum temasa itilir', () => {
    const o = oturum([kup('a', -4, 0, 0, 2), kup('b')], ['a']);
    const alt = kare(o, { x: 3.1 }, { geciciKapali: true });
    expect(alt.delta).toEqual({ x: 3.1, y: 0, z: 0 });
    expect(alt.iz).toBeNull();
    const serbest = kare(o, { x: 1 }, { geciciKapali: true });
    expect(o.hafiza.sonGecerli).toEqual(serbest.delta);
    const birak = kare(o, { x: 3.1 });
    expect(birak.durum).toBe('itildi');
    expect(birak.delta.x).toBeCloseTo(2.5, 12);
  });
});

describe('20. histerezis', () => {
  it('temas 13 px\'te yapışır, 18 px\'te kalır, 21 px\'te bırakır, yeniden 15 px\'te yapışmaz', () => {
    const o = oturum([kup('a', -3), kup('b')], ['a']);
    const bosluk = (px: number) => ({ x: 2 - px / 50 });
    expect(kare(o, bosluk(13)).delta.x).toBeCloseTo(2, 12);
    expect(kare(o, bosluk(18)).delta.x).toBeCloseTo(2, 12);
    expect(kare(o, bosluk(21)).delta.x).toBeCloseTo(2 - 21 / 50, 12);
    expect(kare(o, bosluk(15)).delta.x).toBeCloseTo(2 - 15 / 50, 12);
  });
});

describe('21. ölçek tutarlılığı', () => {
  it('pikselBasinaBirim 20 ve 100 → dünya eşiği 5 kat; kırpmalar; dokunma ×1,5', () => {
    expect(esikler(20).temas / esikler(100).temas).toBeCloseTo(5, 9);
    expect(esikler(5).temas).toBe(ESIK_EN_COK);
    expect(esikler(1000).hiza).toBe(ESIK_EN_AZ);
    expect(esikler(100, true).temas).toBeCloseTo(esikler(100).temas * 1.5, 12);
    expect(esikler(55).temas).toBeCloseTo(14 / 55, 12);
  });
});

describe('22. devre dışı', () => {
  it('açınımlı taşınan → delta = ham; açınımlı ya da gizli hedef yok sayılır', () => {
    let o = oturum([kup('a', -3, 0, 0, 1, { unfoldProgress: 0.5 }), kup('b')], ['a']);
    expect(o.devreDisi).toBe(true);
    expect(kare(o, { x: 1.9 }).delta).toEqual({ x: 1.9, y: 0, z: 0 });
    o = oturum([kup('a', -3), kup('b', 0, 0, 0, 1, { unfoldProgress: 0.5 }), kup('c', 0, 3, 0, 1, { opacity: 0 })], ['a']);
    expect(o.hedefler).toEqual([]);
    expect(kare(o, { x: 1.9 }).delta.x).toBe(1.9);
  });
});

describe('23. belirlenimcilik', () => {
  it('aynı girdi iki kez → derin eşit; eşit uzaklıkta iki aday → sahne sırasındaki ilk hedef', () => {
    const sahne = [kup('a', -3, 0.1), kup('b'), kup('c', 0, 1.6)];
    const kareler = [{ x: 1 }, { x: 1.8 }, { x: 2.1, y: 0.2 }, { x: 2.6 }];
    const a = oturum(sahne, ['a']);
    const b = oturum(sahne, ['a']);
    expect(kareler.map((k) => kare(a, k))).toEqual(kareler.map((k) => kare(b, k)));
    // A, B ile C arasında: iki yana 0,2 boşluk
    const ortada = (sira: Solid3DObject[]) => kare(oturum(sira, ['a']), { x: 3 + 1.2 }).delta.x;
    const bc = [kup('a', -3), kup('b'), kup('c', 2.4)];
    expect(ortada(bc)).toBeCloseTo(4, 12);
    expect(ortada([bc[0], bc[2], bc[1]])).toBeCloseTo(4.4, 12);
  });
});

describe('24. pikselBasinaBirim', () => {
  it('bakış noktasında zoom; iki kat derinlikte yarısı; derinlik 0,1\'e kırpılır', () => {
    const H = 800;
    for (const zoom of [15, 55, 180]) {
      const t = kameraTabani({ ...VARSAYILAN_KAMERA_3B, zoom });
      const uzaklik = H / 2 / (zoom * Math.tan((20 * Math.PI) / 180));
      const goz = { x: t.bakis.x - t.ileri.x * uzaklik, y: t.bakis.y - t.ileri.y * uzaklik, z: t.bakis.z - t.ileri.z * uzaklik };
      expect(pikselBasinaBirim(goz, t.ileri, t.bakis, H)).toBeCloseTo(zoom, 9);
      const uzak = { x: goz.x + t.ileri.x * 2 * uzaklik, y: goz.y + t.ileri.y * 2 * uzaklik, z: goz.z + t.ileri.z * 2 * uzaklik };
      expect(pikselBasinaBirim(goz, t.ileri, uzak, H)).toBeCloseTo(zoom / 2, 9);
      expect(pikselBasinaBirim(goz, t.ileri, goz, H)).toBeCloseTo(H / (2 * Math.tan((20 * Math.PI) / 180) * 0.1), 6);
    }
  });
});

describe('25. maliyet (sayıyla)', () => {
  it('10 × 20 = 200 küplük dizide ortadaki küp 100 kare sürüklenir: çift ≤ 40, aday ≤ 64', () => {
    const solids: Solid3DObject[] = [];
    for (let i = 0; i < 10; i++) for (let j = 0; j < 20; j++) solids.push(kup(`k${i}_${j}`, 2 * i, 2 * j));
    const o = oturum(solids, ['k5_10']);
    for (let k = 0; k < 100; k++) {
      const r = kare(o, { x: Math.sin(k / 9) * 1.4, y: Math.cos(k / 7) * 1.4 }, { izgaraGorunur: true });
      expect(r.istatistik.cift).toBeLessThanOrEqual(40);
      expect(r.istatistik.aday).toBeLessThanOrEqual(64);
    }
  });
});

describe('26. yardımcılar', () => {
  it('izAnahtari kararlı; boş iz boş metin', () => {
    const o = oturum([kup('a', -3), kup('b')], ['a']);
    const r1 = kare(o, { x: 1.9 });
    const r2 = kare(oturum([kup('a', -3), kup('b')], ['a']), { x: 1.9000001 });
    expect(izAnahtari(r1.iz)).toBe(izAnahtari(r2.iz));
    expect(izAnahtari(null)).toBe('');
  });
  it('cokgenKes: kare ∩ kare, üçgen ∩ üçgen', () => {
    const kare1 = [{ u: 0, v: 0 }, { u: 2, v: 0 }, { u: 2, v: 2 }, { u: 0, v: 2 }];
    const kare2 = [{ u: 1, v: 1 }, { u: 3, v: 1 }, { u: 3, v: 3 }, { u: 1, v: 3 }];
    const k = cokgenKes(kare1, kare2);
    expect(k).toHaveLength(4);
    expect(k.map((p) => [p.u, p.v]).sort()).toEqual([[1, 1], [1, 2], [2, 1], [2, 2]]);
    const u1 = [{ u: 0, v: 0 }, { u: 4, v: 0 }, { u: 0, v: 4 }];
    const u2 = [{ u: 0, v: 0 }, { u: 0, v: 4 }, { u: 4, v: 0 }]; // ters yönlü aynı üçgen
    expect(cokgenKes(u1, u2)).toHaveLength(3);
    expect(cokgenKes(kare1, [{ u: 5, v: 5 }, { u: 6, v: 5 }, { u: 6, v: 6 }])).toEqual([]);
  });
  it('noktaCokgendeMi: sınır ve pay', () => {
    const kare1 = [{ u: 0, v: 0 }, { u: 2, v: 0 }, { u: 2, v: 2 }, { u: 0, v: 2 }];
    expect(noktaCokgendeMi({ u: 2, v: 1 }, kare1)).toBe(true);
    expect(noktaCokgendeMi({ u: 2.05, v: 1 }, kare1)).toBe(false);
    expect(noktaCokgendeMi({ u: 2.05, v: 1 }, kare1, 0.1)).toBe(true);
  });
  it('destekBul: en yüksek düz üst yüz, yoksa zemin', () => {
    const a = yapismaGovdesi(kup('a'))!;
    const b = yapismaGovdesi(kup('b', 0, 0, 0, 2))!;
    const c = yapismaGovdesi(kup('c', 0, 0, 2, 1))!;
    expect(destekBul(a, { x: 0, y: 0, z: 0 }, [b, c])).toEqual({ z: 3, id: 'c' });
    expect(destekBul(a, { x: 5, y: 0, z: 0 }, [b, c])).toEqual({ z: 0, id: null });
  });
});
