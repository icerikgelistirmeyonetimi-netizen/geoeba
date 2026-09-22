import { describe, expect, it } from 'vitest';
import type { AngleObject, PointObject, SegmentObject, ViewportTransform } from '@/types/math';
import { worldToScreen } from '@/math/coordinates';
import { calculateAngleDegrees } from '@/math/geometry';
import {
  ALAN_HAZIR_BOYUTLAR,
  aciTuru,
  alanBoyutuTutamactan,
  alanBoyutunuDegistir,
  alanModeliMenusu,
  alanModeliniYerlestir,
  alanOkumasi,
  cetvelBoyuSigdir,
  cetvelBoyuSuruklemeden,
  cetvelBoyunuDegistir,
  cetvelCentikDuzeni,
  cetvelCentikYollari,
  cetvelEtiketleri,
  cetvelKoseleri,
  cetvelMenusu,
  cetvelMerkezi,
  cetvelOkumasi,
  cetveldenParcaNesneleri,
  cetveliYerlestir,
  cevreOkumasi,
  donusOkumasi,
  donusYakala,
  gonyeBoyuSigdir,
  gonyeMenusu,
  gonyeMerkezi,
  gonyeyiYerlestir,
  iletkiCentikYollari,
  iletkiEtiketleri,
  iletkiKolAcisi,
  iletkiMenusu,
  iletkiMerkezi,
  iletkiOkumasi,
  iletkiYaricapi,
  iletkidenAciNesneleri,
  iletkiyiYerlestir,
  normalizeDeg,
  okumaGenisligi,
  okumaKonumu,
  olcmeAraciMi,
  tabanOkumasi,
  yereldenEkrana,
  type OlcmeMenuMaddesi,
} from '../olcmeAraclari';

/** Tekrarlanabilir rastgele sayılar (mulberry32) */
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

const vp = (p: Partial<ViewportTransform> = {}): ViewportTransform => ({
  zoom: 44,
  panX: 0,
  panY: 0,
  width: 1241,
  height: 898,
  showGrid: true,
  showAxes: true,
  showCoordinates: true,
  snapToGrid: false,
  gridStep: 1,
  ...p,
});

const rastgeleGorunumler = (adet: number, tohum = 7) => {
  const r = mulberry32(tohum);
  const aralik = (a: number, b: number) => a + (b - a) * r();
  return Array.from({ length: adet }, () => ({
    v: vp({
      width: Math.round(aralik(400, 1900)),
      height: Math.round(aralik(300, 1100)),
      panX: aralik(-2000, 2000),
      panY: aralik(-2000, 2000),
      zoom: aralik(5, 300),
    }),
    donus: Math.floor(aralik(0, 360)),
    taban: Math.floor(aralik(0, 360)),
  }));
};

const ortadaMi = (p: { x: number; y: number }, v: ViewportTransform) => {
  const s = worldToScreen(p, v);
  expect(Math.abs(s.x - v.width / 2)).toBeLessThan(0.5);
  expect(Math.abs(s.y - v.height / 2)).toBeLessThan(0.5);
};

describe('ölçme araçları: araç kimlikleri', () => {
  it('yalnız dört ölçme aracını tanır', () => {
    expect(['ruler', 'measure_angle', 'setsquare', 'area_model'].every(olcmeAraciMi)).toBe(true);
    expect(olcmeAraciMi('select')).toBe(false);
    expect(olcmeAraciMi(undefined)).toBe(false);
  });
});

describe('ölçme araçları: ortaya yerleştirme', () => {
  const durumlar = rastgeleGorunumler(300);

  it('cetvelin görsel merkezi görünen alanın ortasında', () => {
    for (const { v, donus } of durumlar) {
      const { konum, boy } = cetveliYerlestir(8, donus, v);
      ortadaMi(cetvelMerkezi(konum, donus, boy, v.zoom), v);
    }
  });

  it('cetvel gövdesinin dört köşesinin ortası da görünen alanın ortasında (merkez tanımı gövdeyle tutarlı)', () => {
    for (const { v, donus } of durumlar.slice(0, 50)) {
      const { konum, boy } = cetveliYerlestir(8, donus, v);
      const k = cetvelKoseleri(konum, donus, boy, v);
      const ort = { x: k.reduce((t, p) => t + p.x, 0) / 4, y: k.reduce((t, p) => t + p.y, 0) / 4 };
      expect(Math.abs(ort.x - v.width / 2)).toBeLessThan(0.5);
      expect(Math.abs(ort.y - v.height / 2)).toBeLessThan(0.5);
    }
  });

  it('açıölçerin görsel merkezi görünen alanın ortasında', () => {
    for (const { v, taban } of durumlar) {
      const { konum, yaricap } = iletkiyiYerlestir(taban, v);
      ortadaMi(iletkiMerkezi(konum, taban, yaricap, v.zoom), v);
    }
  });

  it('açıölçer merkezi yarım dairenin kutusunun ortası (yerel (0, -R/2))', () => {
    const v = vp({ panX: 120, panY: -60 });
    for (const taban of [0, 30, 90, 180, 270, 333]) {
      const { konum, yaricap } = iletkiyiYerlestir(taban, v);
      const koken = worldToScreen(konum, v);
      const ekran = yereldenEkrana(koken, -taban, { x: 0, y: -yaricap / 2 });
      expect(Math.abs(ekran.x - v.width / 2)).toBeLessThan(1e-6);
      expect(Math.abs(ekran.y - v.height / 2)).toBeLessThan(1e-6);
    }
  });

  it('gönyenin ağırlık merkezi görünen alanın ortasında', () => {
    for (const { v, donus } of durumlar) {
      const { konum, boy } = gonyeyiYerlestir(6, donus, v);
      ortadaMi(gonyeMerkezi(konum, donus, boy), v);
    }
  });

  it('alan modelinin merkezi görünen alanın ortasında', () => {
    for (const { v } of durumlar) {
      const { konum, sutun, satir } = alanModeliniYerlestir(4, 3, v);
      ortadaMi({ x: konum.x + sutun / 2, y: konum.y + satir / 2 }, v);
    }
  });
});

describe('ölçme araçları: görünüme sığdırma', () => {
  it('cetvel boyu tam sayı, 2…35 ve görünen alanın %70’ine sığar', () => {
    for (const { v, donus } of rastgeleGorunumler(300, 11)) {
      const L = cetvelBoyuSigdir(8, donus, v);
      expect(Number.isInteger(L)).toBe(true);
      expect(L).toBeGreaterThanOrEqual(2);
      expect(L).toBeLessThanOrEqual(35);
      if (L !== 2) {
        const r = (donus * Math.PI) / 180;
        expect(L * v.zoom * Math.abs(Math.cos(r))).toBeLessThanOrEqual(0.7 * v.width + 1e-6);
        expect(L * v.zoom * Math.abs(Math.sin(r))).toBeLessThanOrEqual(0.7 * v.height + 1e-6);
      }
    }
  });

  it('cetvel: varsayılan görünümde 8 br korunur, çok yakında 2 br, tercih kaybolmaz', () => {
    expect(cetvelBoyuSigdir(8, 0, vp())).toBe(8);
    expect(cetvelBoyuSigdir(8, 0, vp({ zoom: 300 }))).toBe(2);
    expect(cetvelBoyuSigdir(8, 0, vp({ zoom: 44 }))).toBe(8);
  });

  it('cetvel: çok uzakta okunur kalacak kadar uzar (en az ~160 px)', () => {
    const L = cetvelBoyuSigdir(8, 0, vp({ zoom: 5 }));
    expect(L * 5).toBeGreaterThanOrEqual(160);
    expect(L).toBeLessThanOrEqual(35);
  });

  it('açıölçer yarıçapı 120…170 px; görünümde tamamen görünür', () => {
    for (const { v } of rastgeleGorunumler(100, 3)) {
      const R = iletkiYaricapi(v);
      expect(R).toBeGreaterThanOrEqual(120);
      expect(R).toBeLessThanOrEqual(170);
    }
    for (const w of [500, 800, 1241, 1900]) {
      for (const h of [500, 700, 898]) {
        for (const taban of [0, 90, 180, 270]) {
          const v = vp({ width: w, height: h, panX: 37, panY: -91, zoom: 60 });
          const { konum, yaricap: R } = iletkiyiYerlestir(taban, v);
          const koken = worldToScreen(konum, v);
          const yon = (a: number, r: number) => ({ x: r * Math.cos((a * Math.PI) / 180), y: -r * Math.sin((a * Math.PI) / 180) });
          const noktalar = [
            { x: -R, y: 0 },
            { x: R, y: 0 },
            { x: 0, y: -R },
            yon(0, R + 32),
            yon(90, R + 32),
            yon(180, R + 32),
            { x: -0.55 * R, y: 46 },
          ].map((p) => yereldenEkrana(koken, -taban, p));
          for (const p of noktalar) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThanOrEqual(w);
            expect(p.y).toBeLessThanOrEqual(h);
          }
        }
      }
    }
  });

  it('gönye: köşeleri ve döndürme topuzu görünür, boy 0,5’in katı', () => {
    const r = mulberry32(5);
    for (let i = 0; i < 300; i++) {
      const v = vp({
        width: Math.round(400 + r() * 1500),
        height: Math.round(400 + r() * 700),
        zoom: 5 + r() * 295,
        panX: (r() - 0.5) * 4000,
        panY: (r() - 0.5) * 4000,
      });
      const donus = Math.floor(r() * 360);
      const { konum, boy } = gonyeyiYerlestir(6, donus, v);
      expect(boy * 2).toBe(Math.round(boy * 2));
      expect(boy).toBeGreaterThanOrEqual(0.5);
      expect(boy).toBeLessThanOrEqual(40);
      const Lp = boy * v.zoom;
      const koken = worldToScreen(konum, v);
      const noktalar = [
        { x: 0, y: 0 },
        { x: Lp, y: 0 },
        { x: 0, y: -Lp },
      ].map((p) => yereldenEkrana(koken, donus, p));
      const topuz = yereldenEkrana(koken, donus, { x: Lp / 2 + 20, y: -Lp / 2 - 20 });
      for (const p of noktalar) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(v.width);
        expect(p.y).toBeLessThanOrEqual(v.height);
      }
      expect(topuz.x - 12).toBeGreaterThanOrEqual(0);
      expect(topuz.y - 12).toBeGreaterThanOrEqual(0);
      expect(topuz.x + 12).toBeLessThanOrEqual(v.width);
      expect(topuz.y + 12).toBeLessThanOrEqual(v.height);
    }
    expect(gonyeBoyuSigdir(6, vp())).toBe(6);
  });

  it('alan modeli yalnız sığmıyorsa küçülür', () => {
    expect(alanModeliniYerlestir(4, 3, vp())).toMatchObject({ sutun: 4, satir: 3 });
    const v = vp({ zoom: 300 });
    const { sutun, satir } = alanModeliniYerlestir(4, 3, v);
    expect(sutun * 300 <= 0.75 * v.width || sutun === 1).toBe(true);
    expect(satir * 300 <= 0.7 * v.height || satir === 1).toBe(true);
  });

  it('menüden boy değişince: sığıyorsa 0 ucu yerinde, taşıyorsa görsel merkez yerinde', () => {
    const v = vp();
    const { konum, boy } = cetveliYerlestir(8, 0, v);
    expect(cetvelBoyunuDegistir(konum, 0, boy, 10, v)).toEqual(konum);
    const yeni = cetvelBoyunuDegistir(konum, 0, boy, 25, v);
    const m1 = cetvelMerkezi(konum, 0, boy, v.zoom);
    const m2 = cetvelMerkezi(yeni, 0, 25, v.zoom);
    expect(m2.x).toBeCloseTo(m1.x, 9);
    expect(m2.y).toBeCloseTo(m1.y, 9);

    const a = alanModeliniYerlestir(4, 3, v);
    expect(alanBoyutunuDegistir(a.konum, { sutun: 4, satir: 3 }, { sutun: 5, satir: 3 }, v)).toEqual(a.konum);
    const b = alanBoyutunuDegistir(a.konum, { sutun: 4, satir: 3 }, { sutun: 15, satir: 15 }, v);
    expect(b.x + 15 / 2).toBeCloseTo(a.konum.x + 2, 9);
    expect(b.y + 15 / 2).toBeCloseTo(a.konum.y + 1.5, 9);
  });
});

describe('ölçme araçları: tutamaç yakalama', () => {
  it('cetvel boyu tutamaçtan tam br', () => {
    const z = 44;
    expect(cetvelBoyuSuruklemeden(8, 100, 100 + 3.4 * z, z)).toBe(11);
    expect(cetvelBoyuSuruklemeden(8, 0, -100 * z, z)).toBe(2);
    expect(cetvelBoyuSuruklemeden(8, 0, 100 * z, z)).toBe(35);
    for (let d = -300; d <= 300; d += 7.3) expect(Number.isInteger(cetvelBoyuSuruklemeden(8, 0, d, z))).toBe(true);
  });

  it('iletki kolu: alt yarıda en yakın uca kilitlenir, tabana göreli, Shift 5°', () => {
    const vektor = (deg: number) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)] as const;
    expect(iletkiKolAcisi(1, 1, 0, false)).toBe(45);
    expect(iletkiKolAcisi(...vektor(300), 0, false)).toBe(0);
    expect(iletkiKolAcisi(...vektor(200), 0, false)).toBe(180);
    expect(iletkiKolAcisi(...vektor(270), 0, false)).toBe(180);
    expect(iletkiKolAcisi(...vektor(90), 30, false)).toBe(60);
    for (let d = 0; d < 180; d += 13) expect(iletkiKolAcisi(...vektor(d + 0.4), 0, true) % 5).toBe(0);
  });

  it('döndürme yakalaması', () => {
    expect(donusYakala(44, false, 15)).toBe(45);
    expect(donusYakala(40, false, 15)).toBe(40);
    expect(donusYakala(37, true, 15)).toBe(30);
    expect(donusYakala(359.4, false, 15)).toBe(0);
    expect(donusYakala(-10, true, 5)).toBe(350);
    expect(normalizeDeg(-30)).toBe(330);
  });

  it('alan köşe tutamacı', () => {
    const z = 44;
    expect(alanBoyutuTutamactan(3.4 * z, 2.6 * z, z)).toEqual([3, 3]);
    expect(alanBoyutuTutamactan(-50, -50, z)).toEqual([1, 1]);
    expect(alanBoyutuTutamactan(1e6, 1e6, z)).toEqual([15, 15]);
  });
});

describe('ölçme araçları: çentikler ve okumalar', () => {
  const mSayisi = (yol: string) => (yol.match(/M/g) ?? []).length;

  it('cetvel çentik yoğunluğu yakınlaştırmaya göre', () => {
    expect(cetvelCentikDuzeni(44)).toEqual({ etiketAdimi: 1, yarim: true, onda: true });
    expect(cetvelCentikDuzeni(20)).toEqual({ etiketAdimi: 2, yarim: true, onda: false });
    expect(cetvelCentikDuzeni(5)).toEqual({ etiketAdimi: 5, yarim: false, onda: false });
  });

  it('cetvel çentikleri üç yolda: 9 birim, 8 yarım, 64 onda bir (yarımın altındaki atlanır)', () => {
    const y = cetvelCentikYollari(8, 44);
    expect(mSayisi(y.birim)).toBe(9);
    expect(mSayisi(y.yarim)).toBe(8);
    expect(mSayisi(y.onda)).toBe(64);
    expect(cetvelCentikYollari(8, 5).onda).toBe('');
  });

  it('cetvel sayıları etiket adımında', () => {
    expect(cetvelEtiketleri(35, 5)).toEqual([0, 5, 10, 15, 20, 25, 30, 35]);
    expect(cetvelEtiketleri(8, 44)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('iletki: 1° çentikleri yalnız büyük yarıçapta, sayılar her 10°', () => {
    expect(iletkiCentikYollari(170).bir.length).toBeGreaterThan(0);
    expect(iletkiCentikYollari(120).bir).toBe('');
    expect(mSayisi(iletkiCentikYollari(170).on)).toBe(19);
    expect(mSayisi(iletkiCentikYollari(120).bes)).toBe(18);
    expect(iletkiEtiketleri(140).map((e) => e.derece)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180]);
  });

  it('en küçük yarıçapta 90–100 sayıları çakışmaz (° işareti yok, 10 px yazı)', () => {
    const e = iletkiEtiketleri(120);
    const doksan = e.find((t) => t.derece === 90)!;
    const yuz = e.find((t) => t.derece === 100)!;
    // "100" ≈ 18 px, "90" ≈ 12 px genişliğinde: merkezler arası en az 15 px
    expect(Math.abs(doksan.x - yuz.x)).toBeGreaterThanOrEqual(15);
  });

  it('okuma metinleri', () => {
    expect(cetvelOkumasi(12)).toBe('12 br');
    expect(donusOkumasi(-35)).toBe('35°');
    expect(donusOkumasi(330)).toBe('30°');
    expect(iletkiOkumasi(60)).toBe('60° · Dar Açı');
    expect(tabanOkumasi(23)).toBe('Taban 23°');
    expect(alanOkumasi(4, 3)).toBe('4 × 3 = 12 br²');
    expect(cevreOkumasi(4, 3)).toBe('Çevre = 2 × (4 + 3) = 14 br');
    expect([0, 89, 90, 91, 180].map(aciTuru)).toEqual(['Sıfır Açı', 'Dar Açı', 'Dik Açı', 'Geniş Açı', 'Doğru Açı']);
  });

  it('okuma hapı tutamacın üstünde; üst kenarda altına geçer ve yatayda kıstırılır', () => {
    const v = vp({ width: 800, height: 600 });
    const w = okumaGenisligi('12 br');
    expect(w).toBe(Math.round(22 + 7.4 * 5));
    expect(okumaKonumu({ x: 400, y: 300 }, w, v)).toEqual({ x: 400, y: 254 });
    expect(okumaKonumu({ x: 400, y: 30 }, w, v)).toEqual({ x: 400, y: 76 });
    expect(okumaKonumu({ x: 2, y: 300 }, w, v).x).toBe(w / 2 + 6);
    expect(okumaKonumu({ x: 799, y: 300 }, w, v).x).toBe(800 - w / 2 - 6);
  });
});

describe('ölçme araçları: sağ tık menüleri', () => {
  const duz = (m: OlcmeMenuMaddesi[]): OlcmeMenuMaddesi[] => m.flatMap((x) => [x, ...(x.submenu ? duz(x.submenu) : [])]);
  const bul = (m: OlcmeMenuMaddesi[], label: string) => duz(m).find((x) => x.label === label)!;

  const menuler: [string, OlcmeMenuMaddesi[]][] = [
    ['cetvel', cetvelMenusu({ boy: 10, donusSvg: 0 })],
    ['cetvel dönük', cetvelMenusu({ boy: 35, donusSvg: 300 })],
    ['iletki', iletkiMenusu({ aci: 60, taban: 0 })],
    ['iletki sıfır', iletkiMenusu({ aci: 0, taban: 45, olcuGoster: false })],
    ['gönye', gonyeMenusu({ donusSvg: 315 })],
    ['alan', alanModeliMenusu({ sutun: 3, satir: 4, ekleVar: true })],
    ['alan sınır', alanModeliMenusu({ sutun: 15, satir: 1, ekleVar: false, alanGoster: false, cevreGoster: true })],
  ];

  it.each(menuler)('%s: son madde Sil (Trash2, kırmızı, ayırıcılı)', (_, m) => {
    const son = m[m.length - 1];
    expect(son).toMatchObject({ label: 'Sil', ikon: 'Trash2', danger: true, separatorBefore: true, eylem: { tur: 'sil' } });
  });

  it.each(menuler)('%s: tek "Ortaya getir", benzersiz kimlikler, emoji yok, her maddenin işi var', (_, m) => {
    const hepsi = duz(m);
    expect(hepsi.filter((x) => x.label === 'Ortaya getir')).toHaveLength(1);
    expect(bul(m, 'Ortaya getir').eylem).toEqual({ tur: 'ortala' });
    const kimlikler = hepsi.map((x) => x.id);
    expect(new Set(kimlikler).size).toBe(kimlikler.length);
    for (const x of hepsi) {
      expect(x.label).not.toMatch(/\p{Extended_Pictographic}/u);
      if (!x.submenu) expect(!!x.eylem || !!x.prompt).toBe(true);
    }
  });

  it('seçenek (radio) işaretleri', () => {
    const c = cetvelMenusu({ boy: 10, donusSvg: 0 });
    const uzunluk = bul(c, 'Uzunluk').submenu!.filter((x) => x.radio);
    expect(uzunluk.map((x) => x.label)).toEqual(['5 br', '8 br', '10 br', '12 br', '15 br', '20 br']);
    expect(uzunluk.filter((x) => x.checked).map((x) => x.label)).toEqual(['10 br']);

    const i = bul(iletkiMenusu({ aci: 60, taban: 0 }), 'Açı').submenu!.filter((x) => x.radio);
    expect(i.filter((x) => x.checked).map((x) => x.label)).toEqual(['60°']);
    expect(i).toHaveLength(9);

    const g = bul(gonyeMenusu({ donusSvg: 315 }), 'Döndür').submenu!;
    expect(g.every((x) => x.radio)).toBe(true);
    expect(g.filter((x) => x.checked).map((x) => x.label)).toEqual(['45°']);
    expect(bul(gonyeMenusu({ donusSvg: 0 }), '90°').eylem).toEqual({ tur: 'gonyeDonus', donusSvg: 270 });

    const a = bul(alanModeliMenusu({ sutun: 3, satir: 4, ekleVar: true }), 'Hazır boyutlar').submenu!;
    expect(a).toHaveLength(ALAN_HAZIR_BOYUTLAR.length);
    expect(a).toHaveLength(6);
    expect(a.every((x) => x.radio)).toBe(true);
    expect(a.filter((x) => x.checked).map((x) => x.label)).toEqual(['3 × 4']);
  });

  it('sınırlarda devre dışı maddeler', () => {
    expect(bul(cetvelMenusu({ boy: 35, donusSvg: 0 }), '1 br uzat').disabled).toBe(true);
    expect(bul(cetvelMenusu({ boy: 2, donusSvg: 0 }), '1 br kısalt').disabled).toBe(true);
    expect(bul(cetvelMenusu({ boy: 8, donusSvg: 0 }), 'Yatay yap (0°)').disabled).toBe(true);
    expect(bul(cetvelMenusu({ boy: 8, donusSvg: 20 }), 'Yatay yap (0°)').disabled).toBeFalsy();
    expect(bul(cetvelMenusu({ boy: 8, donusSvg: 270 }), 'Dikey yap (90°)').disabled).toBe(true);
    expect(bul(iletkiMenusu({ aci: 0, taban: 0 }), 'Açıyı tuvale ekle').disabled).toBe(true);
    expect(bul(iletkiMenusu({ aci: 30, taban: 0 }), 'Tabanı yatay yap').disabled).toBe(true);
    const sinir = alanModeliMenusu({ sutun: 15, satir: 1, ekleVar: false });
    expect(bul(sinir, 'Sütun ekle').disabled).toBe(true);
    expect(bul(sinir, 'Satır çıkar').disabled).toBe(true);
    expect(bul(sinir, 'Çokgen olarak ekle').disabled).toBe(true);
    expect(bul(sinir, 'Sütun ekle').eylem).toEqual({ tur: 'alanBoyut', sutun: 15, satir: 1 });
  });

  it('eylemler ve yazılı değerler', () => {
    const c = cetvelMenusu({ boy: 8, donusSvg: 0 });
    expect(bul(c, '1 br uzat').eylem).toEqual({ tur: 'cetvelBoy', boy: 9 });
    expect(bul(c, 'Dikey yap (90°)').eylem).toEqual({ tur: 'cetvelDonus', donusSvg: 270 });
    const yaz = bul(c, 'Uzunluğu yaz…').prompt!;
    expect(yaz.unit).toBe('br');
    expect(yaz.eylem(12.4)).toEqual({ tur: 'cetvelBoy', boy: 12 });
    expect(yaz.eylem(99)).toEqual({ tur: 'cetvelBoy', boy: 35 });
    expect(bul(iletkiMenusu({ aci: 60, taban: 0 }), 'Açıyı yaz…').prompt!.eylem(200)).toEqual({ tur: 'iletkiAci', aci: 180 });
  });

  it('bilgi yazıları aç/kapat (onay kutusu, radio değil)', () => {
    const i = bul(iletkiMenusu({ aci: 60, taban: 0, olcuGoster: true }), 'Ölçüyü göster');
    expect(i.checked).toBe(true);
    expect(i.radio).toBeFalsy();
    expect(i.eylem).toEqual({ tur: 'gosterim', anahtar: 'olcu', acik: false });
    const a = alanModeliMenusu({ sutun: 4, satir: 3, ekleVar: true, alanGoster: true, cevreGoster: false });
    expect(bul(a, 'Alanı göster').checked).toBe(true);
    expect(bul(a, 'Çevreyi göster')).toMatchObject({ checked: false, eylem: { tur: 'gosterim', anahtar: 'cevre', acik: true } });
  });
});

describe('ölçme araçları: tuvale ekleme', () => {
  let sayac = 0;
  const kimlik = (onEk: string) => `${onEk}-${++sayac}`;

  it('cetvelden doğru parçası: iki nokta + parça, boy tam olarak L', () => {
    const { nesneler, bas, son } = cetveldenParcaNesneleri({ x: 1.234, y: -2.5 }, 330, 10, ['A', 'B'], kimlik);
    expect(nesneler).toHaveLength(3);
    const [p1, p2, s] = nesneler as [PointObject, PointObject, SegmentObject];
    expect([p1.label, p2.label]).toEqual(['C', 'D']);
    expect(s.type).toBe('segment');
    expect(s.startPointId).toBe(p1.id);
    expect(s.endPointId).toBe(p2.id);
    expect(Math.hypot(p2.x - p1.x, p2.y - p1.y)).toBeCloseTo(10, 9);
    // SVG 330° = matematik 30°: yukarı doğru
    expect(p2.y).toBeGreaterThan(p1.y);
    expect(bas).toEqual({ x: p1.x, y: p1.y });
    expect(son).toEqual({ x: p2.x, y: p2.y });
  });

  it('açıölçerden açı: 3 nokta, açının kolu olan 2 parça, açı ∠ABC', () => {
    const { nesneler, aciklama } = iletkidenAciNesneleri({ x: 0.5, y: 1 }, 60, 30, 3, [], kimlik);
    expect(nesneler).toHaveLength(6);
    const noktalar = nesneler.filter((n) => n.type === 'point') as PointObject[];
    const parcalar = nesneler.filter((n) => n.type === 'segment') as SegmentObject[];
    const aci = nesneler.find((n) => n.type === 'angle') as AngleObject;
    expect(noktalar).toHaveLength(3);
    expect(parcalar).toHaveLength(2);
    expect(parcalar.every((p) => p.armOfAngleId === aci.id)).toBe(true);
    const nokta = (id: string) => noktalar.find((p) => p.id === id)!;
    expect(nokta(aci.vertexPointId)).toMatchObject({ x: 0.5, y: 1 });
    expect(calculateAngleDegrees(nokta(aci.point1Id), nokta(aci.vertexPointId), nokta(aci.point3Id))).toBeCloseTo(60, 6);
    expect(aci.label).toBe('∠ABC');
    expect(aciklama).toContain('60°');
  });
});
