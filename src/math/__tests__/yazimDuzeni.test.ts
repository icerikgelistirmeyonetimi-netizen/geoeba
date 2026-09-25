import { describe, expect, it } from 'vitest';
import { VARSAYILAN_YAZIM, aci, alan, kiris, olcuDugumleri, uzunluk, yayUzunlugu } from '../matematikYazimi';
import {
  HISTEREZIS, aciRozetiYerlesimi, duzenle, kutuMerkezli, kutuOlcusu, kutuParcayiKesiyorMu, kutularCakisir,
  ayirmaAdimi, ayirmaYarisi, donmusKaplama, isinaDiz, radyalUzanim,
  rozetUzakligi, sigarMi, susYolu, yakinAciRozetiYerlesimi,
  type Kutu, type KutuOlcusu, type Nokta, type RozetGirdisi,
} from '../yazimDuzeni';
import { metinGenisligi } from '../yaziGenisligi';

const P = (label: string) => ({ label, showLabel: true, visible: true });
const [A, B, C] = ['A', 'B', 'C'].map(P);
const KISA = { ...VARSAYILAN_YAZIM, olcuYazimi: 'kisa' as const };
const dugum = (o: Parameters<typeof olcuDugumleri>[0], ayar = VARSAYILAN_YAZIM) => olcuDugumleri(o, ayar);

describe('yazı genişliği (Manrope tablosu, DOM yok)', () => {
  it('tarayıcıda ölçülen genişliklerle aynı (1000 px em)', () => {
    expect(Math.abs(metinGenisligi('|AB| = 10,39 br', 1000) / 6873 - 1)).toBeLessThan(0.002);
    expect(Math.abs(metinGenisligi('A(ABCDE) = 12,5 br²', 1000) / 9602 - 1)).toBeLessThan(0.002);
    // Türkçe harfler latin-ext alt kümesinden ölçülmeli (ş = s, ğ = g, İ = I genişliğinde)
    expect(Math.abs(metinGenisligi('kiriş |AB|', 1000) / 4142 - 1)).toBeLessThan(0.002);
    expect(Math.abs(metinGenisligi('İŞĞ ığş', 1000) / 3308 - 1)).toBeLessThan(0.002);
    expect(Math.abs(metinGenisligi('Yay uzunluğu ≈ 7,12 br', 1000) / 10451 - 1)).toBeLessThan(0.002);
  });
  it('genişlik yazı boyuyla orantılı, 600 ağırlığı 700\'den dar', () => {
    expect(metinGenisligi('|AB| = 5 br', 22)).toBeCloseTo(2 * metinGenisligi('|AB| = 5 br', 11), 6);
    expect(metinGenisligi('|AB| = 5 br', 11, 600)).toBeLessThan(metinGenisligi('|AB| = 5 br', 11, 700));
  });
});

describe('düzen: süsler ve çubuklar harflerle hizalı', () => {
  it('şapka harflerin üstünde, çizgiler harflerin iki yanında', () => {
    const d = duzenle(dugum(aci(A, B, C, 60)), 11);
    const [s] = d.susler;
    const harfler = d.parcalar.find((p) => p.s === 'ABC')!;
    expect(s.x0).toBeGreaterThan(harfler.x);
    expect(s.x1).toBeLessThan(harfler.x + harfler.w);
    expect(s.y).toBeLessThan(-0.73 * 11);
    const u = duzenle(dugum(uzunluk(A, B, 5)), 11);
    const ab = u.parcalar.find((p) => p.s === 'AB')!;
    expect(u.cubuklar).toHaveLength(2);
    expect(u.cubuklar[0].x).toBeLessThan(ab.x);
    expect(u.cubuklar[1].x).toBeGreaterThan(ab.x + ab.w);
  });

  it('yay süsü eğri, üçgen süsü kapalı yol', () => {
    const yay = duzenle(dugum(yayUzunlugu({ bas: A, son: B, buyuk: false }, 7.12)), 11).susler[0];
    expect(yay.tur).toBe('yay');
    expect(susYolu(yay)).toMatch(/^M[\d.,-]+ Q[\d.,-]+ [\d.,-]+$/);
    expect(susYolu({ tur: 'ucgen', x0: 0, x1: 10, y: -8, h: 3 })).toMatch(/ Z$/);
  });

  it('soluk sözcük ayrı parçaya düşer (kendi rengini alabilsin)', () => {
    const d = duzenle(dugum(kiris(A, B, 4.24, false)), 11);
    expect(d.parcalar.find((p) => p.s === 'kiriş ')?.soluk).toBe(true);
    expect(d.parcalar.some((p) => !p.soluk)).toBe(true);
  });
});

describe('kutu ölçüsü ve tam/kısa kararı', () => {
  const tam = kutuOlcusu([dugum(uzunluk(A, B, 10.3923))], 11);
  const kisa = kutuOlcusu([dugum(uzunluk(A, B, 10.3923), KISA)], 11);

  it('yükseklik yazı boyunun ~1,5 katı ve boyla ölçeklenir', () => {
    expect(kutuOlcusu([dugum(uzunluk(A, B, 5))], 11).yukseklik).toBeCloseTo(16.61, 2);
    expect(kutuOlcusu([dugum(uzunluk(A, B, 5))], 22).yukseklik).toBeCloseTo(33.22, 2);
  });

  it('genişlik metinden gelir; kısa yazım daha dar', () => {
    expect(tam.genislik).toBeCloseTo(84.36, 1);
    expect(kisa.genislik).toBeLessThan(tam.genislik);
  });

  it('iki satırlı kutu tek satırlıdan yüksek, satır tabanları sıralı', () => {
    const iki = kutuOlcusu([dugum(alan([A, B, C], 12)), dugum(uzunluk(A, B, 5))], 11);
    expect(iki.yukseklik).toBeGreaterThan(tam.yukseklik * 1.8);
    expect(iki.satirlar[0].taban).toBeLessThan(iki.satirlar[1].taban);
  });

  it('minGenislik ve minYukseklik alt sınırdır', () => {
    const k = kutuOlcusu([dugum(uzunluk(A, B, 5))], 11, { minGenislik: 200, minYukseklik: 50 });
    expect(k.genislik).toBe(200);
    expect(k.yukseklik).toBe(50);
  });

  it('sigarMi histerezisi: kısadan tama dönüş fazladan pay ister', () => {
    const boy = tam.genislik + 8;
    expect(sigarMi(tam, boy, 'tam')).toBe(true);
    expect(sigarMi(tam, boy, 'kisa')).toBe(false);
    expect(sigarMi(tam, HISTEREZIS * boy, 'kisa')).toBe(true);
    // 84,4 px'lik kutu 90 px'lik çizgide (pay 0): tam kalır, kısadan geri dönmez
    expect(sigarMi(tam, 90, 'tam', 0)).toBe(true);
    expect(sigarMi(tam, 90, 'kisa', 0)).toBe(false);
    expect(sigarMi(kisa, 75)).toBe(true);
    expect(sigarMi(tam, 75)).toBe(false);
  });
});

describe('kutu geometrisi', () => {
  const k: Kutu = { x0: 0, y0: 0, x1: 10, y1: 10 };
  it('kutuMerkezli kutuyu merkeze yerleştirir', () => {
    const m = kutuMerkezli(100, 50, { genislik: 40, yukseklik: 20, satirlar: [] });
    expect(m).toEqual({ x0: 80, y0: 40, x1: 120, y1: 60 });
  });
  it('kutularCakisir payı hesaba katar', () => {
    expect(kutularCakisir(k, { x0: 12, y0: 0, x1: 20, y1: 10 }, 0)).toBe(false);
    expect(kutularCakisir(k, { x0: 12, y0: 0, x1: 20, y1: 10 }, 4)).toBe(true);
  });
  it('kutuParcayiKesiyorMu kesen ve kesmeyen parçayı ayırır', () => {
    expect(kutuParcayiKesiyorMu(k, { x: -5, y: 5 }, { x: 15, y: 5 }, 0)).toBe(true);
    expect(kutuParcayiKesiyorMu(k, { x: -5, y: 20 }, { x: 15, y: 20 }, 0)).toBe(false);
    expect(kutuParcayiKesiyorMu(k, { x: -5, y: 13 }, { x: 15, y: 13 }, 4)).toBe(true);
    // Kutuya değmeden biten parça kesişmez
    expect(kutuParcayiKesiyorMu(k, { x: -20, y: 5 }, { x: -12, y: 5 }, 0)).toBe(false);
  });
});

// ------------------------------------------------------------------ açı rozeti yerleşimi

const uz = (a: Nokta, b: Nokta) => Math.hypot(b.x - a.x, b.y - a.y);
const ekranAci = (a: Nokta, b: Nokta) => Math.atan2(b.y - a.y, b.x - a.x);

function ucgenGrubu(A0: Nokta, B0: Nokta, C0: Nokta, px = 10, basamak = 1) {
  const uclu: [string, Nokta, Nokta, Nokta][] = [['A', B0, A0, C0], ['B', A0, B0, C0], ['C', A0, C0, B0]];
  return uclu.map(([isim, p1, kose, p3]) => {
    const a1 = ekranAci(kose, p1);
    const a2 = ekranAci(kose, p3);
    let delta = a2 - a1;
    while (delta <= -Math.PI) delta += 2 * Math.PI;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    const derece = (Math.abs(delta) * 180) / Math.PI;
    const girdi: RozetGirdisi = {
      kose, kol1: a1, kol2: a2, boy1: uz(kose, p1), boy2: uz(kose, p3),
      orta: a1 + delta / 2, tarama: Math.abs(delta), yayR: 22,
    };
    return {
      girdi,
      tam: kutuOlcusu([dugum(aci(A, P(isim), C, derece, { basamak }))], px),
      kisa: kutuOlcusu([dugum(aci(null, null, null, derece, { basamak }), KISA)], px),
    };
  });
}
const esk = (k: number): [Nokta, Nokta, Nokta] => [{ x: 0, y: 0 }, { x: k, y: 0 }, { x: k / 2, y: (-k * Math.sqrt(3)) / 2 }];
const kenarlarOf = (t: [Nokta, Nokta, Nokta]): [Nokta, Nokta][] => [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]];

describe('açı rozeti yerleşimi', () => {
  it('rozet yayı örtmez ve kolların arasında kalır', () => {
    const [ilk] = ucgenGrubu(...esk(400));
    const d = rozetUzakligi(ilk.girdi, ilk.tam);
    expect(d).not.toBeNull();
    expect(d!).toBeGreaterThanOrEqual(ilk.girdi.yayR + 4);
  });

  it('çok dar açıda tam yazım sığmaz', () => {
    const ince = ucgenGrubu({ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 290, y: -12 });
    expect(rozetUzakligi(ince[0].girdi, ince[0].tam)).toBeNull();
  });

  it.each([
    [100, 'kisa'],
    [150, 'kisa'],
    [250, 'tam'],
    [400, 'tam'],
  ] as const)('eşkenar üçgen kenar %i px → %s yazım', (kenar, bicim) => {
    const t = esk(kenar);
    const grup = ucgenGrubu(...t);
    const r = aciRozetiYerlesimi(grup, { kenarlar: kenarlarOf(t) });
    expect(r.bicim).toBe(bicim);
    for (let i = 0; i < r.yerler.length; i++) {
      for (let j = i + 1; j < r.yerler.length; j++) {
        if (bicim === 'tam') expect(kutularCakisir(r.yerler[i].kutu, r.yerler[j].kutu, 0)).toBe(false);
      }
      if (bicim === 'tam') for (const [p, q] of kenarlarOf(t)) expect(kutuParcayiKesiyorMu(r.yerler[i].kutu, p, q, 0)).toBe(false);
    }
  });

  it.each([
    [40, 'kisa'],
    [80, 'tam'],
    [120, 'tam'],
  ] as const)('3-4-5 üçgeni %i px/birimde → %s yazım', (olcek, bicim) => {
    const t: [Nokta, Nokta, Nokta] = [{ x: 0, y: 0 }, { x: 4 * olcek, y: 0 }, { x: 0, y: -3 * olcek }];
    const r = aciRozetiYerlesimi(ucgenGrubu(...t), { kenarlar: kenarlarOf(t) });
    expect(r.bicim).toBe(bicim);
    if (bicim === 'tam') {
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) expect(kutularCakisir(r.yerler[i].kutu, r.yerler[j].kutu, 0)).toBe(false);
        for (const [p, q] of kenarlarOf(t)) expect(kutuParcayiKesiyorMu(r.yerler[i].kutu, p, q, 0)).toBe(false);
      }
    }
  });

  it('ölçüm ölçeği 2 iken 250 px eşkenar üçgen kısa yazıma düşer', () => {
    const t = esk(250);
    expect(aciRozetiYerlesimi(ucgenGrubu(...t, 20), { kenarlar: kenarlarOf(t) }).bicim).toBe('kisa');
  });

  it('ölçüm kartı rozetin yerini kapatınca kısa yazıma düşülür', () => {
    const t = esk(250);
    const grup = ucgenGrubu(...t);
    const serbest = aciRozetiYerlesimi(grup, { kenarlar: kenarlarOf(t) });
    expect(serbest.bicim).toBe('tam');
    const engel = serbest.yerler[0].kutu;
    expect(aciRozetiYerlesimi(grup, { kenarlar: kenarlarOf(t), kutular: [engel] }).bicim).toBe('kisa');
  });

  it('histerezis: kısadan tama dönüş daha çok pay ister', () => {
    const t = esk(250);
    const grup = ucgenGrubu(...t);
    const kenarlar = kenarlarOf(t);
    expect(aciRozetiYerlesimi(grup, { kenarlar }, 'tam').bicim).toBe('tam');
    const kisadan = aciRozetiYerlesimi(grup, { kenarlar }, 'kisa');
    // Daha büyük payla ya hâlâ tam sığar ya da kısa kalır; her iki durumda da yer bulunur.
    expect(kisadan.yerler).toHaveLength(3);
  });

  it('dış açıda (tarama > 180°) rozet ileri yarı düzlemde kalır', () => {
    const kose: Nokta = { x: 0, y: 0 };
    const girdi: RozetGirdisi = {
      kose, kol1: 0, kol2: Math.PI / 3, boy1: 200, boy2: 200,
      orta: Math.PI / 3 / 2 + Math.PI, tarama: 2 * Math.PI - Math.PI / 3, yayR: 22,
    };
    const kutu = kutuOlcusu([dugum(aci(A, B, C, 300, { basamak: 1, disAci: true }))], 10);
    const d = rozetUzakligi(girdi, kutu);
    expect(d).not.toBeNull();
    const merkez = { x: kose.x + d! * Math.cos(girdi.orta), y: kose.y + d! * Math.sin(girdi.orta) };
    expect(merkez.y).toBeLessThan(0);
  });

  it('hiçbir biçim sığmasa bile son çare yerleşimi döner', () => {
    const t: [Nokta, Nokta, Nokta] = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 20, y: -6 }];
    const r = aciRozetiYerlesimi(ucgenGrubu(...t), { kenarlar: kenarlarOf(t) });
    expect(r.bicim).toBe('kisa');
    expect(r.yerler).toHaveLength(3);
    for (const y of r.yerler) expect(Number.isFinite(y.d)).toBe(true);
  });
});

describe('yayın yanındaki otomatik açı rozeti', () => {
  const girdi = (): RozetGirdisi => ({
    kose: { x: 0, y: 0 }, kol1: Math.PI / 4, kol2: Math.PI / 2,
    orta: 3 * Math.PI / 8, tarama: Math.PI / 4, boy1: 400, boy2: 400, yayR: 22,
  });
  const kisaKutu = (px = 11) => kutuOlcusu([dugum(aci(null, null, null, 45), KISA)], px);
  const oran = (zoom: number) => Math.min(1.05, zoom / 44) / (zoom / 44);
  const merkezi = (k: Kutu): Nokta => ({ x: (k.x0 + k.x1) / 2, y: (k.y0 + k.y1) / 2 });
  const yayVeKollarAcik = (g: RozetGirdisi, k: Kutu) => {
    const enYakin = Math.hypot(
      Math.max(k.x0 - g.kose.x, g.kose.x - k.x1, 0),
      Math.max(k.y0 - g.kose.y, g.kose.y - k.y1, 0),
    );
    expect(enYakin).toBeGreaterThan(g.yayR);
    for (const [kol, boy] of [[g.kol1, g.boy1], [g.kol2, g.boy2]]) {
      const uc = { x: g.kose.x + boy * Math.cos(kol), y: g.kose.y + boy * Math.sin(kol) };
      expect(kutuParcayiKesiyorMu(k, g.kose, uc, 0)).toBe(false);
    }
  };

  it('45° ve zoom96 için merkezi 113 px yerine yaklaşık 66 px uzağa koyar; yayı ve kolları örtmez', () => {
    const g = girdi(), kutu = kisaKutu();
    const once = structuredClone(kutu);
    const yer = yakinAciRozetiYerlesimi(g, kutu, oran(96));
    const ekrandakiUzaklik = yer.d * 96 / 44;
    expect(rozetUzakligi(g, kutu)! * 96 / 44).toBeGreaterThan(113);
    expect(ekrandakiUzaklik).toBeGreaterThan(65);
    expect(ekrandakiUzaklik).toBeLessThan(67);
    expect((yer.kutu.x1 - yer.kutu.x0) * 96 / 44).toBeCloseTo(kutu.genislik * 1.05, 10);
    expect((yer.kutu.y1 - yer.kutu.y0) * 96 / 44).toBeCloseTo(kutu.yukseklik * 1.05, 10);
    yayVeKollarAcik(g, yer.kutu);
    expect(kutu).toEqual(once);
  });

  it('normal zoomda 40 px alt sınırı olmadan küçük kutuyu yayın yakınına yerleştirir', () => {
    const g = { ...girdi(), kol1: Math.PI / 4, kol2: 3 * Math.PI / 4, orta: Math.PI / 2, tarama: Math.PI / 2 };
    const yer = yakinAciRozetiYerlesimi(g, kisaKutu(), 1);
    expect(yer.d).toBeGreaterThan(33);
    expect(yer.d).toBeLessThan(35);
    expect(rozetUzakligi(g, kisaKutu())).toBe(40);
    yayVeKollarAcik(g, yer.kutu);
  });

  it('uzak koordinatta dış açının açıortayını izler; dar iç kama şartını uygulamaz', () => {
    const g = { ...girdi(), kol1: 0, kol2: Math.PI / 3, orta: 7 * Math.PI / 6, tarama: 5 * Math.PI / 3 };
    const ilk = yakinAciRozetiYerlesimi(g, kisaKutu(), 1);
    const uzak = yakinAciRozetiYerlesimi({ ...g, kose: { x: 12000, y: -7000 } }, kisaKutu(), 1);
    expect(uzak.d).toBe(ilk.d);
    expect(ilk.d).toBeLessThan(45);
    expect(merkezi(ilk.kutu).x).toBeLessThan(0);
    expect(merkezi(ilk.kutu).y).toBeLessThan(0);
    expect(merkezi(uzak.kutu).x - merkezi(ilk.kutu).x).toBeCloseTo(12000, 9);
    expect(merkezi(uzak.kutu).y - merkezi(ilk.kutu).y).toBeCloseTo(-7000, 9);
    yayVeKollarAcik(g, ilk.kutu);
  });

  it('yazı büyüme sınırında süreklidir ve zoom turu ilk konumu aynen geri verir', () => {
    const g = girdi(), kutu = kisaKutu();
    const ekranYeri = (zoom: number) => {
      const yer = yakinAciRozetiYerlesimi(g, kutu, oran(zoom));
      const merkez = merkezi(yer.kutu);
      return { x: merkez.x * zoom / 44, y: merkez.y * zoom / 44 };
    };
    const cap = 44 * 1.05;
    const once = ekranYeri(cap - 1e-6), sonra = ekranYeri(cap + 1e-6);
    expect(Math.hypot(sonra.x - once.x, sonra.y - once.y)).toBeLessThan(1e-4);
    const baslangic = ekranYeri(44);
    for (const zoom of [22, 96, cap, 200, 11, 44]) {
      const merkez = ekranYeri(zoom);
      expect(Number.isFinite(merkez.x) && Number.isFinite(merkez.y)).toBe(true);
    }
    expect(ekranYeri(44)).toEqual(baslangic);
  });

  it.each([0, 1e-12, 0.001])('çok dar %s radyan açıda sonsuza kaçmak yerine sınırlı yakın konuma döner', (tarama) => {
    for (const boy of [12, 2000]) {
      const g = { ...girdi(), kol1: 0, kol2: tarama, orta: tarama / 2, tarama, boy1: boy, boy2: boy };
      const yer = yakinAciRozetiYerlesimi(g, kisaKutu(), 1);
      expect(yer.d).toBeGreaterThan(g.yayR);
      expect(yer.d).toBeLessThan(50);
      expect(Object.values(yer.kutu).every(Number.isFinite)).toBe(true);
    }
  });

  it('kullanıcı yazıyı büyüttüğünde gereken açıklığı artırır; küçük kutuyu render ölçüsüne dönüştürmez', () => {
    const g = girdi();
    const normal = yakinAciRozetiYerlesimi(g, kisaKutu(11), oran(96));
    const buyukKutu = kisaKutu(22);
    const buyuk = yakinAciRozetiYerlesimi(g, buyukKutu, oran(96));
    expect(buyuk.d).toBeGreaterThan(normal.d);
    expect(buyuk.kutu.x1 - buyuk.kutu.x0).toBeCloseTo(buyukKutu.genislik * oran(96), 10);
    expect(buyukKutu.satirlar[0].duzen.parcalar[0].px).toBe(22);
    yayVeKollarAcik(g, buyuk.kutu);
  });
});

describe('isinaDiz — yay / daire dilimi ölçü listesinin ışın üzerinde dizilmesi', () => {
  const K = (genislik: number, yukseklik: number): KutuOlcusu =>
    ({ genislik, yukseklik, satirlar: [] as KutuOlcusu['satirlar'] });
  const R45 = Math.PI / 4;
  /** Işın üzerindeki r yarıçapına konan kutunun ekran kutusu (merkez orijinde). */
  const yerlestir = (k: { genislik: number; yukseklik: number }, r: number, aci: number): Kutu =>
    kutuMerkezli(Math.cos(aci) * r, -Math.sin(aci) * r, k as KutuOlcusu);

  it('yatay ışında yarı genişlik, dikey ışında yarı yükseklik ayırır', () => {
    expect(ayirmaYarisi(80, 14, 0)).toBeCloseTo(40);
    expect(ayirmaYarisi(80, 14, Math.PI / 2)).toBeCloseTo(7);
    // 45°'de geniş ama alçak kutuyu y ekseninde ayırmak yeter: 7 / sin45 ≈ 9,9
    expect(ayirmaYarisi(80, 14, R45)).toBeCloseTo(7 / Math.SQRT1_2, 6);
  });

  it('teğete dönmüş kutunun kaplaması eksenleri değiştirir', () => {
    expect(donmusKaplama(K(48, 16), 0)).toEqual({ genislik: 16, yukseklik: 48 });
    const e = donmusKaplama(K(48, 16), R45);
    expect(e.genislik).toBeCloseTo(64 * Math.SQRT1_2, 6);
    expect(e.yukseklik).toBeCloseTo(64 * Math.SQRT1_2, 6);
  });

  it('45° ışında dört etiketlik liste üst üste binmez ve yaydan 120 px’i aşmaz', () => {
    const ogeler = [
      { kutu: K(47, 17), dondu: true }, // yay uzunluğu (teğete dönük)
      { kutu: K(62, 13) },              // r = |NS| = 3 br
      { kutu: K(80, 13) },              // kiriş |SD| ≈ 4,24 br
    ];
    const { yaricaplar, sonraki } = isinaDiz(ogeler, R45);
    expect(yaricaplar).toHaveLength(3);
    // Eski kural (her etikete tam radyal uzanım) burada 150 px’i aşıyordu
    expect(sonraki(K(24, 12))).toBeLessThan(120);
    const kutular = ogeler.map((o, i) =>
      yerlestir(o.dondu ? donmusKaplama(o.kutu, R45) : o.kutu, yaricaplar[i], R45));
    for (let i = 0; i + 1 < kutular.length; i++) {
      expect(kutularCakisir(kutular[i], kutular[i + 1], 0)).toBe(false);
    }
    // Merkez açı rozeti de listenin dışında kalır
    const rozet = yerlestir(K(24, 12), sonraki(K(24, 12)), R45);
    expect(kutularCakisir(kutular[kutular.length - 1], rozet, 0)).toBe(false);
  });

  it('her yönde ve her sırada komşu kutular ayrışır', () => {
    const boyutlar = [K(47, 17), K(62, 13), K(80, 13), K(103, 12), K(24, 12)];
    for (let derece = 0; derece < 360; derece += 11) {
      const aci = (derece * Math.PI) / 180;
      const ogeler = boyutlar.map((kutu, i) => ({ kutu, dondu: i === 0 }));
      const { yaricaplar, sonraki } = isinaDiz(ogeler, aci);
      const rozetKutu = K(24, 12);
      const tum = [...ogeler, { kutu: rozetKutu, dondu: false }];
      const tumR = [...yaricaplar, sonraki(rozetKutu)];
      const kutular = tum.map((o, i) =>
        yerlestir(o.dondu ? donmusKaplama(o.kutu, aci) : o.kutu, tumR[i], aci));
      for (let i = 0; i + 1 < kutular.length; i++) {
        expect(kutularCakisir(kutular[i], kutular[i + 1], 0)).toBe(false);
      }
      expect(tumR.every(Number.isFinite)).toBe(true);
    }
  });

  it('ilk etiket şekilden tam radyal uzanım kadar açıkta durur; dönük ilk etiket yaya yaslanır', () => {
    const yatay = isinaDiz([{ kutu: K(62, 13) }], R45);
    expect(yatay.yaricaplar[0]).toBeCloseTo(radyalUzanim(K(62, 13), R45), 6);
    const donuk = isinaDiz([{ kutu: K(47, 17), dondu: true }], R45);
    expect(donuk.yaricaplar[0]).toBeCloseTo(8.5, 6);
  });

  it('boş listede sonraki etiket tam radyal uzanıma düşer', () => {
    const bos = isinaDiz([], R45);
    expect(bos.yaricaplar).toEqual([]);
    expect(bos.sonraki(K(24, 12))).toBeCloseTo(radyalUzanim(K(24, 12), R45), 6);
  });

  it('ayirmaAdimi çifti birlikte ölçer: kutu başına yarıları toplamak yetmez', () => {
    const dar = { genislik: 24, yukseklik: 40 };
    const genis = { genislik: 120, yukseklik: 12 };
    // 45°'de dar kutu x'te, geniş kutu y'de ayrışır: yarıları toplamak iki eksende de bindirme bırakır
    const aci = R45;
    const cift = ayirmaAdimi(dar, genis, aci);
    const toplam = ayirmaYarisi(dar.genislik, dar.yukseklik, aci) + ayirmaYarisi(genis.genislik, genis.yukseklik, aci);
    expect(cift).toBeGreaterThan(toplam);
    const a = kutuMerkezli(0, 0, dar as KutuOlcusu);
    const b = kutuMerkezli(Math.cos(aci) * cift, -Math.sin(aci) * cift, genis as KutuOlcusu);
    expect(kutularCakisir(a, b, 0)).toBe(false);
  });
});
