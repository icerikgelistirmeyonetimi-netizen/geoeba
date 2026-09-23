import { describe, expect, it } from 'vitest';
import { VARSAYILAN_YAZIM, aci, alan, kiris, olcuDugumleri, uzunluk, yayUzunlugu } from '../matematikYazimi';
import {
  HISTEREZIS, aciRozetiYerlesimi, duzenle, kutuMerkezli, kutuOlcusu, kutuParcayiKesiyorMu, kutularCakisir,
  rozetUzakligi, sigarMi, susYolu, type Kutu, type Nokta, type RozetGirdisi,
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
