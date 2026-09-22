import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/*
 * Motor modülü dinamik olarak yüklenir (adaSahnesi testleriyle aynı desen): içe aktarma
 * DOM'a dokunmamalı ve global ShaderChunk'ı değiştirmemelidir. Saf yardımcılar Node'da sınanır.
 */
const ORIJINAL_PARCA = THREE.ShaderChunk.lights_fragment_begin;

let modul: typeof import('../sinifSahnesi');

// public/sinif/data/sinif.json ile aynı değerler (Three.js Y yukarı)
const EKRAN = { width: 1.905, height: 1.0716 };
const KOSELER: [number, number, number][] = [
  [-0.9525, 2.1216, -4.406],
  [0.9525, 2.1216, -4.406],
  [0.9525, 1.05, -4.406],
  [-0.9525, 1.05, -4.406],
];
const MERKEZ = new THREE.Vector3(0, 1.5858, -4.406);
const LENS = 30;
const SENSOR = 36;

beforeAll(async () => {
  modul = await import('../sinifSahnesi');
});

/** Bitiş kamerası: ekran merkezinden +z normali boyunca d uzaklıkta, ekrana dik bakış. */
function bitisKamerasi(w: number, h: number): THREE.PerspectiveCamera {
  const d = modul.bitisUzakligi(EKRAN, w, h, LENS, SENSOR);
  const kamera = new THREE.PerspectiveCamera(modul.dikeyFov(LENS, SENSOR, w / h), w / h, 0.05, 60);
  kamera.position.copy(MERKEZ).add(new THREE.Vector3(0, 0, d));
  kamera.lookAt(MERKEZ);
  kamera.updateMatrixWorld();
  kamera.updateProjectionMatrix();
  return kamera;
}

describe('modül', () => {
  it('içe aktarmak global ShaderChunk parçasını değiştirmez ve motor sınıfını verir', () => {
    expect(modul.SinifSahnesi).toBeTypeOf('function');
    expect(THREE.ShaderChunk.lights_fragment_begin).toBe(ORIJINAL_PARCA);
  });
});

describe('dikeyFov', () => {
  it('yatay kadrajda yatay FOV sensör/lens çiftinden, dikey FOV en boy oranından türer', () => {
    const fov = modul.dikeyFov(LENS, SENSOR, 16 / 9);
    const yatayYarimTan = Math.tan(THREE.MathUtils.degToRad(fov) / 2) * (16 / 9);
    expect(yatayYarimTan).toBeCloseTo(SENSOR / 2 / LENS, 6);
  });

  it('dikey kadrajda sensör dikey kenara düşer', () => {
    const fov = modul.dikeyFov(LENS, SENSOR, 9 / 16);
    expect(Math.tan(THREE.MathUtils.degToRad(fov) / 2)).toBeCloseTo(SENSOR / 2 / LENS, 6);
  });
});

describe('bitisUzakligi', () => {
  it('16:9 kapta ekran genişliği tam kap genişliğine oturur (d = 0.9525 / 0.6)', () => {
    expect(modul.bitisUzakligi(EKRAN, 1920, 1080, LENS, SENSOR)).toBeCloseTo(0.9525 / 0.6, 5);
  });

  it('geniş kapta (21:9) izdüşüm genişliği kap genişliğine eşittir, yükseklik kabı taşar (örtme)', () => {
    const w = 2100;
    const h = 900;
    const koseler = modul.koseIzdusumu(KOSELER, bitisKamerasi(w, h), w, h);
    expect(koseler).not.toBeNull();
    const kutu = modul.koseKutusu(koseler!);
    expect(kutu.x).toBeCloseTo(0, 3);
    expect(kutu.w).toBeCloseTo(w, 3);
    expect(kutu.h).toBeGreaterThan(h);
    expect(kutu.h).toBeCloseTo(w / (EKRAN.width / EKRAN.height), 1);
    // Dikey ortalı
    expect(kutu.y + kutu.h / 2).toBeCloseTo(h / 2, 3);
  });

  it('dar kapta (4:3, dikey telefon) izdüşüm yüksekliği kap yüksekliğine eşittir, genişlik kabı taşar (örtme)', () => {
    for (const [w, h] of [
      [1200, 900],
      [390, 844],
    ]) {
      const koseler = modul.koseIzdusumu(KOSELER, bitisKamerasi(w, h), w, h);
      expect(koseler).not.toBeNull();
      const kutu = modul.koseKutusu(koseler!);
      expect(kutu.y).toBeCloseTo(0, 3);
      expect(kutu.h).toBeCloseTo(h, 3);
      expect(kutu.w).toBeGreaterThan(w);
      expect(kutu.w).toBeCloseTo(h * (EKRAN.width / EKRAN.height), 1);
      expect(kutu.x + kutu.w / 2).toBeCloseTo(w / 2, 3);
    }
  });

  it('tam 16:9 kapta ekran kabı hem yatay hem dikey doldurur; köşeler TL,TR,BR,BL sırasındadır', () => {
    const w = 1920;
    const h = 1080;
    const koseler = modul.koseIzdusumu(KOSELER, bitisKamerasi(w, h), w, h)!;
    expect(koseler[0][0]).toBeCloseTo(0, 2);
    expect(koseler[0][1]).toBeCloseTo(0, 1);
    expect(koseler[1][0]).toBeCloseTo(w, 2);
    expect(koseler[1][1]).toBeCloseTo(0, 1);
    expect(koseler[2][0]).toBeCloseTo(w, 2);
    expect(koseler[2][1]).toBeCloseTo(h, 1);
    expect(koseler[3][0]).toBeCloseTo(0, 2);
    expect(koseler[3][1]).toBeCloseTo(h, 1);
  });
});

describe('koseIzdusumu', () => {
  it('kameranın arkasındaki nokta için null döner', () => {
    const kamera = bitisKamerasi(1920, 1080);
    const arkada: [number, number, number] = [0, 1.5858, kamera.position.z + 1];
    expect(modul.koseIzdusumu([arkada], kamera, 1920, 1080)).toBeNull();
    expect(modul.koseIzdusumu([...KOSELER, arkada], kamera, 1920, 1080)).toBeNull();
  });

  it('başlangıç kamerasından bakınca ekran dörtgeni kap içinde ve dışbükeydir', () => {
    const kamera = new THREE.PerspectiveCamera(modul.dikeyFov(LENS, SENSOR, 16 / 9), 16 / 9, 0.05, 60);
    kamera.position.set(2.3, 1.55, 3.9);
    kamera.lookAt(new THREE.Vector3(0.02399, 1.61927, -4.41239));
    kamera.updateMatrixWorld();
    const koseler = modul.koseIzdusumu(KOSELER, kamera, 1920, 1080)!;
    expect(koseler).toHaveLength(4);
    for (const [x, y] of koseler) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1920);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(1080);
    }
    // Sağdan bakıldığı için sol kenar (uzak) sağ kenardan (yakın) kısadır
    const sol = koseler[3][1] - koseler[0][1];
    const sag = koseler[2][1] - koseler[1][1];
    expect(sol).toBeGreaterThan(0);
    expect(sag).toBeGreaterThan(sol);
  });
});

describe('yaklasmaYolu / yaklasmaKonumu', () => {
  const bas = new THREE.Vector3(2.3, 1.55, 3.9);
  const bitis = new THREE.Vector3(0, 1.5858, -1.806);
  const basHedef = new THREE.Vector3(0.02399, 1.61927, -4.41239);

  it('u=0 başlangıçta, u=1 bitişte; hedef ekran merkezine varır', () => {
    const yol = modul.yaklasmaYolu(bas, bitis, basHedef, MERKEZ);
    const a = modul.yaklasmaKonumu(yol, 0);
    expect(a.konum.distanceTo(bas)).toBeLessThan(1e-9);
    expect(a.hedef.distanceTo(basHedef)).toBeLessThan(1e-9);
    const b = modul.yaklasmaKonumu(yol, 1);
    expect(b.konum.distanceTo(bitis)).toBeLessThan(1e-9);
    expect(b.hedef.distanceTo(MERKEZ)).toBeLessThan(1e-9);
  });

  it('kontrol noktası orta noktanın +x tarafında 0,6 m dikmesindedir; ortada sapma 0,3 m', () => {
    const yol = modul.yaklasmaYolu(bas, bitis, basHedef, MERKEZ);
    const orta = bas.clone().add(bitis).multiplyScalar(0.5);
    expect(yol.kontrol.x).toBeGreaterThan(orta.x);
    expect(Math.hypot(yol.kontrol.x - orta.x, yol.kontrol.z - orta.z)).toBeCloseTo(modul.YAN_OFSET, 9);
    // Bézier'in u=0,5 noktası orta noktadan kontrol yönünde ofset/2 sapar
    const yarim = modul.yaklasmaKonumu(yol, 0.5).konum;
    expect(Math.hypot(yarim.x - orta.x, yarim.z - orta.z)).toBeCloseTo(modul.YAN_OFSET / 2, 9);
  });

  it('göz yüksekliği yolun ilk yüzde 60 bölümünde sabit kalır, sonda ekran merkezi yüksekliğine iner', () => {
    const yol = modul.yaklasmaYolu(bas, bitis, basHedef, MERKEZ);
    for (const u of [0, 0.2, 0.4, 0.6]) expect(modul.yaklasmaKonumu(yol, u).konum.y).toBeCloseTo(1.55, 9);
    const y8 = modul.yaklasmaKonumu(yol, 0.8).konum.y;
    expect(y8).toBeGreaterThan(1.55);
    expect(y8).toBeLessThan(1.5858);
    expect(modul.yaklasmaKonumu(yol, 1).konum.y).toBeCloseTo(1.5858, 9);
  });

  it('u sınır dışına taşarsa kenetlenir', () => {
    const yol = modul.yaklasmaYolu(bas, bitis, basHedef, MERKEZ);
    expect(modul.yaklasmaKonumu(yol, 1.5).konum.distanceTo(bitis)).toBeLessThan(1e-9);
    expect(modul.yaklasmaKonumu(yol, -1).konum.distanceTo(bas)).toBeLessThan(1e-9);
  });
});

describe('koseKutusu', () => {
  it('köşelerin eksenlere hizalı sınır kutusunu verir', () => {
    expect(
      modul.koseKutusu([
        [10, 5],
        [110, 6],
        [108, 60],
        [12, 58],
      ])
    ).toEqual({ x: 10, y: 5, w: 100, h: 55 });
  });
});

describe('yaklasmaEgrisi / GIRIS_KAYMA', () => {
  it('0 → 0, 1 → 1, tekdüze artar ve sınır dışında kenetlenir', () => {
    const f = modul.yaklasmaEgrisi;
    expect(f(0)).toBeCloseTo(0, 12);
    expect(f(1)).toBeCloseTo(1, 12);
    expect(f(-1)).toBe(f(0));
    expect(f(2)).toBe(f(1));
    let onceki = 0;
    for (let i = 1; i <= 100; i++) {
      const v = f(i / 100);
      expect(v).toBeGreaterThan(onceki);
      onceki = v;
    }
  });

  it('başta sıfır olmayan eğim (donmuş kare yok), sonda sıfır eğim (yumuşak varış)', () => {
    const f = modul.yaklasmaEgrisi;
    const h = 1e-4;
    const basEgim = (f(h) - f(0)) / h;
    const sonEgim = (f(1) - f(1 - h)) / h;
    expect(basEgim).toBeCloseTo(0.3, 2);
    expect(sonEgim).toBeLessThan(1e-3);
  });

  it('giriş sürüklenmesi yaklaşmanın başlangıç hızıyla süreklidir', () => {
    // giris(): GIRIS_KAYMA / GIRIS_SURESI; yaklas(): (1 − u0) · f′(0) / YAKLASMA_SURESI
    const girisHizi = modul.GIRIS_KAYMA / modul.GIRIS_SURESI;
    const h = 1e-4;
    const egim = (modul.yaklasmaEgrisi(h) - modul.yaklasmaEgrisi(0)) / h;
    const yaklasmaHizi = ((1 - modul.GIRIS_KAYMA) * egim) / modul.YAKLASMA_SURESI;
    expect(Math.abs(girisHizi - yaklasmaHizi) / girisHizi).toBeLessThan(0.05);
  });
});

describe('posterGecerli', () => {
  it('4 sayısal köşe, kimlik ve doku yolu ister', () => {
    const k = [
      [-1.15, 2.952, -4.486],
      [-0.75, 2.952, -4.486],
      [-0.75, 2.408, -4.486],
      [-1.15, 2.408, -4.486],
    ];
    expect(modul.posterGecerli({ id: 'istiklal', corners: k, width: 0.4, height: 0.544, texture: 'duvar/istiklal-marsi.jpg' })).toBe(true);
    expect(modul.posterGecerli({ id: 'istiklal', corners: k.slice(0, 3), width: 0.4, height: 0.544, texture: 'x.jpg' })).toBe(false);
    expect(modul.posterGecerli({ id: 'istiklal', corners: k, width: 0.4, height: 0.544, texture: '' })).toBe(false);
    expect(modul.posterGecerli({ id: '', corners: k, width: 0.4, height: 0.544, texture: 'x.jpg' })).toBe(false);
    expect(modul.posterGecerli({ id: 'p', corners: [[0, 0, 0], [1, 0, 0], [1, NaN, 0], [0, -1, 0]], width: 1, height: 1, texture: 'x.jpg' })).toBe(false);
    expect(modul.posterGecerli(null)).toBe(false);
    expect(modul.posterGecerli('istiklal')).toBe(false);
  });
});

describe('posterNormali / posterGeometrisi', () => {
  // Ön duvardaki poster: TL, TR, BR, BL (izleyici +z tarafında, duvar z = −4.486)
  const KOSE: [number, number, number][] = [
    [-0.22, 2.9792, -4.486],
    [0.22, 2.9792, -4.486],
    [0.22, 2.3808, -4.486],
    [-0.22, 2.3808, -4.486],
  ];

  it('normal izleyiciye (odaya, +z) bakar; ekran normaliyle aynı yön', () => {
    const n = modul.posterNormali(KOSE);
    expect(n.x).toBeCloseTo(0, 9);
    expect(n.y).toBeCloseTo(0, 9);
    expect(n.z).toBeCloseTo(1, 9);
    // Ayna sıralama (TR ↔ TL) duvara bakar
    const ayna = modul.posterNormali([KOSE[1], KOSE[0], KOSE[3], KOSE[2]]);
    expect(ayna.z).toBeCloseTo(-1, 9);
  });

  it('köşeler normal boyunca 3 mm öne alınır, UV TL(0,1)…BL(0,0), üçgenler saat yönünün tersine', () => {
    const g = modul.posterGeometrisi(KOSE);
    const konum = g.getAttribute('position');
    expect(konum.count).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(konum.getX(i)).toBeCloseTo(KOSE[i][0], 6);
      expect(konum.getY(i)).toBeCloseTo(KOSE[i][1], 6);
      expect(konum.getZ(i)).toBeCloseTo(KOSE[i][2] + modul.POSTER_OFSET, 6);
    }
    const uv = g.getAttribute('uv');
    expect([uv.getX(0), uv.getY(0)]).toEqual([0, 1]);
    expect([uv.getX(1), uv.getY(1)]).toEqual([1, 1]);
    expect([uv.getX(2), uv.getY(2)]).toEqual([1, 0]);
    expect([uv.getX(3), uv.getY(3)]).toEqual([0, 0]);
    const normal = g.getAttribute('normal');
    for (let i = 0; i < 4; i++) expect(normal.getZ(i)).toBeCloseTo(1, 9);
    // Her üçgenin geometrik normali +z (ön yüz izleyiciye; doku aynalanmaz, arka yüz kırpması gizlemez)
    const idx = g.getIndex()!;
    expect(idx.count).toBe(6);
    const p = (i: number) => new THREE.Vector3(konum.getX(i), konum.getY(i), konum.getZ(i));
    for (let t = 0; t < 2; t++) {
      const a = p(idx.getX(t * 3));
      const b = p(idx.getX(t * 3 + 1));
      const c = p(idx.getX(t * 3 + 2));
      const n = b.sub(a).cross(c.sub(a));
      expect(n.z).toBeGreaterThan(0);
    }
    // Alan: iki üçgen dörtgeni tam örter (0.44 × 0.5984)
    const alan = (() => {
      let s = 0;
      for (let t = 0; t < 2; t++) {
        const a = p(idx.getX(t * 3));
        const b = p(idx.getX(t * 3 + 1));
        const c = p(idx.getX(t * 3 + 2));
        s += b.sub(a).cross(c.sub(a)).length() / 2;
      }
      return s;
    })();
    expect(alan).toBeCloseTo(0.44 * 0.5984, 6);
    g.dispose();
  });
});

describe('public/sinif/data/sinif.json posters sözleşmesi', () => {
  const kok = path.resolve(__dirname, '../../../../public/sinif');
  const veri = JSON.parse(readFileSync(path.join(kok, 'data/sinif.json'), 'utf8')) as import('../sinifSahnesi').SinifVerisi;
  const ORAN = 1100 / 1496;

  it('üç poster soldan sağa istiklal, portre, hitabe; hepsi geçerli ve dokuları diskte', () => {
    expect(veri.posters?.map((p) => p.id)).toEqual(['istiklal', 'portre', 'hitabe']);
    for (const p of veri.posters!) {
      expect(modul.posterGecerli(p)).toBe(true);
      expect(existsSync(path.join(kok, p.texture))).toBe(true);
    }
    // Soldan sağa: TL.x artan
    const xler = veri.posters!.map((p) => p.corners[0][0]);
    expect(xler[0]).toBeLessThan(xler[1]);
    expect(xler[1]).toBeLessThan(xler[2]);
    // Portre ortada (x = 0) ve diğerlerinden büyük
    expect(veri.posters![1].corners[0][0] + veri.posters![1].corners[1][0]).toBeCloseTo(0, 6);
    expect(veri.posters![1].width).toBeGreaterThan(veri.posters![0].width);
  });

  it('köşeler düzlemsel, en-boy 1100:1496 (±%1), aynı yükseklikte, normal odaya (kameralara) bakar', () => {
    const kamBas = new THREE.Vector3(...veri.camera.start.position);
    const ekranNormali = new THREE.Vector3(...veri.screen.normal);
    const merkezler: number[] = [];
    for (const p of veri.posters!) {
      const [TL, TR, BR, BL] = p.corners.map((k) => new THREE.Vector3(...k));
      const n = modul.posterNormali(p.corners);
      const sapma = Math.abs(BR.clone().sub(TL).dot(n));
      expect(sapma).toBeLessThan(1e-4);
      const w = TR.distanceTo(TL);
      const h = BL.distanceTo(TL);
      expect(Math.abs(w / h / ORAN - 1)).toBeLessThan(0.01);
      expect(w).toBeCloseTo(p.width, 4);
      expect(h).toBeCloseTo(p.height, 4);
      // TL solda üstte (izleyiciye göre): TL.y > BL.y ve TL.x < TR.x
      expect(TL.y).toBeGreaterThan(BL.y);
      expect(TL.x).toBeLessThan(TR.x);
      expect(n.dot(kamBas.clone().sub(TL))).toBeGreaterThan(0);
      expect(n.dot(ekranNormali)).toBeCloseTo(1, 6);
      merkezler.push((TL.y + BL.y) / 2);
    }
    expect(merkezler[0]).toBeCloseTo(merkezler[1], 6);
    expect(merkezler[1]).toBeCloseTo(merkezler[2], 6);
    // Tahtanın üstünde: alt kenar ekranın üst kenarından yukarıda
    const ekranUst = Math.max(...veri.screen.corners.map((k) => k[1]));
    for (const p of veri.posters!) expect(p.corners[3][1]).toBeGreaterThan(ekranUst + 0.1);
  });

  it('poster:* grupları GLB grup listesinde (kâğıt zemin) yer alır', () => {
    for (const id of ['istiklal', 'portre', 'hitabe']) {
      const g = veri.groups.find((x) => x.key === `poster:${id}`);
      expect(g?.kind).toBe('poster');
      expect(g?.triangles).toBe(2);
    }
  });
});

describe('disGorunumMalzemesi', () => {
  it('pencere dışı için ışımalı, çift yüzlü gradyan gölgelendirici malzemesi verir', () => {
    const m = modul.disGorunumMalzemesi('Dış • gökyüzü ışığı');
    expect(m).toBeInstanceOf(THREE.ShaderMaterial);
    expect(m.side).toBe(THREE.DoubleSide);
    expect(m.userData.kind).toBe('emissive');
    expect(m.uniforms.uUfukY.value).toBeCloseTo(1.5);
    expect(m.fragmentShader).toContain('uYogunluk');
    m.dispose();
  });
});
