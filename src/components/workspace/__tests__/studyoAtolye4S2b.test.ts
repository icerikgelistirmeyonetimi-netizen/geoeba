import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FunctionObject, MathObject, PointObject, PolygonObject, SliderObject, ViewportTransform } from '@/types/math';
import { fonksiyonAdiYazimi, fonksiyonEtiketiYazimi, ifadeYazimi } from '@/math/fonksiyonYazimi';
import { fonksiyonParcalari, parcalardanYol, sureksizlikAra } from '@/math/fonksiyonCizimi';
import { nesneSatirlari, satirMetni } from '@/math/panelYazimlari';
import { latex, metniCozumle } from '@/math/matematikYazimi';
import { worldToScreen, getVisibleWorldBounds } from '@/math/coordinates';
import { fitViewport, nesneKutusu, serbestDikdortgen, yeniNesneleriGoster, KOMUT_KENAR_PAYI } from '@/math/commands/viewActions';
import { executeTurkishCommand } from '@/math/turkishCommands';
import { fonksiyonEtiketYeri } from '../fonksiyonEtiketi';
import { FONKSIYON_SABLONLARI, fonksiyonSablonlari, trigonometriIpucuGosterilir } from '../fonksiyonSablonlari';
import { ALT_SERIT, UST_SERIT, surguKutusu, surguUzunlugu, yeniSurguYerleri } from '../surguYerlesimi';
import { tuvalEngelleri } from '../eksenSayilari';
import { NESNE_TURU_ADLARI, ayirtEdiciAdlar, fonksiyonSatiri, nesneGorunenAdi, nesneTuruAdi } from '../nesneListesi';
import { duzenlemeAdi } from '../FunctionDialog';

/*
 * Atölye inceleme 4. tur (geoeba (3).xlsx), Serbest Çizim Stüdyosu — ortaokul, 2B araçlar II: satır 157-162, 169.
 */

const KOK = path.resolve(__dirname, '..');
const oku = (ad: string) => readFileSync(path.join(KOK, ad), 'utf8');

const fonksiyon = (id: string, label: string, expression: string): FunctionObject =>
  ({ id, type: 'function', label, showLabel: true, expression, color: '#2563eb', visible: true, createdAt: 1 }) as FunctionObject;
const nokta = (id: string, label: string, x: number, y: number): PointObject =>
  ({ id, type: 'point', label, showLabel: true, x, y, color: '#0284c7', visible: true, isIndependent: true, createdAt: 1 }) as PointObject;
const gorunum = (p: Partial<ViewportTransform> = {}): ViewportTransform =>
  ({ zoom: 44, panX: 0, panY: 0, width: 921, height: 698, showGrid: true, showAxes: true, showCoordinates: false, ...p }) as ViewportTransform;
const kesisir = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// ------------------------------------------------------------------------------------------------ [157]

describe('[157] fonksiyonun okunur yazımı: 2x ve x², * ve ^ değil', () => {
  it.each([
    ['2*x + 1', '2x + 1'],
    ['x^2 - 4', 'x² − 4'],
    ['a*x^2 + b', 'ax² + b'],
    ['1/x', '1/x'],
    ['sqrt(x)', '√x'],
    ['sqrt(x+1)', '√(x + 1)'],
    ['|x-2|', '|x − 2|'],
    ['abs(x-2)', '|x − 2|'],
    ['-x^2+3*x', '−x² + 3x'],
    ['0.5*x', '0,5x'],
    ['x^(1/2)', 'x^(1/2)'],
    ['(x+1)*(x-1)', '(x + 1)(x − 1)'],
    ['x^-1', 'x⁻¹'],
    ['x^(3)', 'x³'],
    ['pi*x', 'πx'],
    ['x*x', 'x·x'],
    ['2*3', '2·3'],
    ['x*sin(x)', 'x·sin(x)'],
    ['2*sin(x)', '2sin(x)'],
    ['2x + 1', '2x + 1'],
    ['x² - 4', 'x² − 4'],
    ['||x|-1|', '||x| − 1|'],
  ])('%s → %s', (ham, okunur) => {
    expect(ifadeYazimi(ham)).toBe(okunur);
  });

  it('ad ve denklem: "f(x) = 2x + 1"; y etiketi ve özel ad korunur', () => {
    expect(fonksiyonEtiketiYazimi(fonksiyon('f1', 'f(x) = 2*x + 1', '2*x + 1'))).toBe('f(x) = 2x + 1');
    expect(fonksiyonEtiketiYazimi(fonksiyon('f2', 'g(x) = x^2 - 4', 'x^2 - 4'))).toBe('g(x) = x² − 4');
    expect(fonksiyonEtiketiYazimi(fonksiyon('f3', 'y = x^2', 'x^2'))).toBe('y = x²');
    expect(fonksiyonEtiketiYazimi(fonksiyon('f4', 'Parabol', 'x^2'))).toBe('Parabol');
    expect(fonksiyonAdiYazimi(fonksiyon('f1', 'f(x) = 2*x + 1', '2*x + 1'))).toBe('f(x)');
    expect(fonksiyonAdiYazimi(fonksiyon('f3', 'y = x^2', 'x^2'))).toBeNull();
  });

  it('Nesneler / Cebir / Bağlamlar satırı okunur yazımda ("y = x² + 1")', () => {
    const fn = fonksiyon('f1', 'f(x) = x^2 + 1', 'x^2 + 1');
    expect(nesneSatirlari(fn, [fn]).map(satirMetni)).toEqual(['y = x² + 1']);
    // Nesneler listesindeki fonksiyon satırı: "f(x)" + "= x² + 1"
    expect(fonksiyonSatiri(fn)).toEqual({ ad: 'f(x)', ozet: '= x² + 1', ayirac: false });
    expect(fonksiyonSatiri(fonksiyon('f2', 'y = 2*x', '2*x'))).toEqual({ ad: 'y', ozet: '= 2x', ayirac: false });
    expect(fonksiyonSatiri(fonksiyon('f3', 'Parabol', 'x^2'))).toEqual({ ad: 'Parabol', ozet: 'y = x²', ayirac: true });
    // Cebir görünümü de aynı yazımı kullanır
    const cebir = oku('AlgebraView.tsx');
    expect(cebir).toMatch(/header: fonksiyonEtiketiYazimi\(fn\), ana: metinSatiri\(`y = \$\{ifadeYazimi\(fn\.expression\)\}`\)/);
  });

  it('LaTeX kopyası yeni simgeleri tanır (x⁻¹, 2·3, √x)', () => {
    expect(latex(metniCozumle('y = x⁻¹'))).toContain('^{-1}');
    expect(latex(metniCozumle('y = 2·3'))).toContain('\\cdot');
    expect(latex(metniCozumle('y = √x'))).toContain('\\surd');
    expect(latex(metniCozumle('y = x² − 4'))).toContain('^2');
  });

  const birBolu = (x: number) => 1 / x;

  it('1/x: uzaklaştırılmış görünümde de x = 0\'da kollar birleşmez (eski eşik 0,5 · yükseklik kaçırıyordu)', () => {
    // Ölçek %23 civarı: 10 px/br; x = 0 örneklenmiyor (görünüm kaymış). Örnekler ±0,1'de: y = ±10, sıçrama 20 < 35.
    const kutu = { minX: -46.3, maxX: 45.7, minY: -35, maxY: 35 };
    const parcalar = fonksiyonParcalari(birBolu, kutu, 460);
    expect(parcalar).toHaveLength(2);
    for (const parca of parcalar) {
      const xs = parca.map((p) => p.x);
      expect(Math.min(...xs) < 0 && Math.max(...xs) > 0, 'bir parça x = 0\'ı geçiyor').toBe(false);
    }
    // Kollar kutba kadar (ekran dışına) uzatılır: sol kol altta, sağ kol üstte biter/başlar
    const sol = parcalar[0];
    const sag = parcalar[1];
    expect(sol[sol.length - 1].y).toBeLessThanOrEqual(kutu.minY);
    expect(sag[0].y).toBeGreaterThanOrEqual(kutu.maxY);
  });

  it.each([
    ['varsayılan görünüm', { minX: -10.47, maxX: 10.47, minY: -7.93, maxY: 7.93 }],
    ['x = 0 tam örneklenir', { minX: -10, maxX: 10, minY: -8, maxY: 8 }],
    ['çok uzak', { minX: -200, maxX: 180, minY: -150, maxY: 150 }],
    ['yakın', { minX: -1.03, maxX: 0.97, minY: -1, maxY: 1 }],
  ])('1/x %s: iki parça', (_ad, kutu) => {
    expect(fonksiyonParcalari(birBolu, kutu, 460)).toHaveLength(2);
  });

  it('sürekli fonksiyonlar kesilmez (dik doğru, parabol, hızlı salınan sinüs)', () => {
    const kutu = { minX: -10.47, maxX: 10.47, minY: -7.93, maxY: 7.93 };
    expect(fonksiyonParcalari((x) => 2 * x + 1, kutu, 460)).toHaveLength(1);
    expect(fonksiyonParcalari((x) => x * x - 4, kutu, 460)).toHaveLength(1);
    expect(fonksiyonParcalari((x) => 1000 * x, kutu, 460)).toHaveLength(1);
    expect(fonksiyonParcalari((x) => 5 * Math.sin(50 * x), kutu, 460)).toHaveLength(1);
    expect(fonksiyonParcalari((x) => x * x * x, { minX: -40, maxX: 40, minY: -30, maxY: 30 }, 460)).toHaveLength(1);
  });

  it('tan x kutuplarda, basamak sıçramasında kesilir; karekök yalnız tanım aralığında', () => {
    const kutu = { minX: -10.47, maxX: 10.47, minY: -7.93, maxY: 7.93 };
    // tan: görünür aralıkta 6 kutup (±π/2, ±3π/2, ±5π/2): 7 parça
    const tan = fonksiyonParcalari(Math.tan, kutu, 460);
    expect(tan.length).toBe(7);
    const basamak = fonksiyonParcalari((x) => (x < 0 ? -1 : 1), { minX: -3, maxX: 3, minY: -1.5, maxY: 1.5 }, 300);
    expect(basamak).toHaveLength(2);
    const kok = fonksiyonParcalari(Math.sqrt, kutu, 460);
    expect(kok).toHaveLength(1);
    expect(kok[0][0].x).toBeGreaterThanOrEqual(0);
  });

  it('sureksizlikAra: sürekli aralıkta null, kutupta iki yan', () => {
    expect(sureksizlikAra((x) => 10 * x, -0.5, -5, 0.5, 5, 0.1)).toBeNull();
    const kopma = sureksizlikAra(birBolu, -0.1, -10, 0.13, 1 / 0.13, 0.1);
    expect(kopma).not.toBeNull();
    expect(kopma!.sol.x).toBeLessThan(0);
    expect(kopma!.sag.x).toBeGreaterThan(0);
  });

  it('parcalardanYol: her parça M ile başlar', () => {
    const d = parcalardanYol([[{ x: 0, y: 0 }, { x: 1, y: 1 }], [{ x: 2, y: 2 }, { x: 3, y: 3 }]], (p) => p);
    expect(d.trim()).toBe('M 0 0 L 1 1 M 2 2 L 3 3');
  });

  it('grafik etiketi: tuvalin içinde, düğmelere ve çizgilere değmeden', () => {
    const vp = gorunum();
    const kutu = getVisibleWorldBounds(vp);
    const ekrana = (f: (x: number) => number) =>
      fonksiyonParcalari(f, kutu, 460).map((parca) => parca.map((p) => worldToScreen(p, vp)));
    const f = ekrana((x) => 2 * x + 1);
    const g = ekrana((x) => x * x - 4);
    const h = ekrana(birBolu);
    const cizgiler = [...f, ...g, ...h].flat();
    // Canvas'taki gibi: düğmeler + eksen çizgileri ve sayıları
    const o = worldToScreen({ x: 0, y: 0 }, vp);
    const engeller = [...tuvalEngelleri(vp.width, vp.height), { x: 0, y: o.y - 5, w: vp.width, h: 24 }, { x: o.x - 30, y: 0, w: 35, h: vp.height }];
    const yazi = { w: 13 * 7 * 0.56 * 2, h: 13 };
    for (const parcalar of [f, g, h]) {
      const yer = fonksiyonEtiketYeri(parcalar, { genislik: vp.width, yukseklik: vp.height }, yazi, engeller, cizgiler);
      expect(yer).not.toBeNull();
      const k = yer!.kutu;
      expect(k.x).toBeGreaterThanOrEqual(0);
      expect(k.y).toBeGreaterThanOrEqual(0);
      expect(k.x + k.w).toBeLessThanOrEqual(vp.width);
      expect(k.y + k.h).toBeLessThanOrEqual(vp.height);
      expect(engeller.some((e) => kesisir(k, e))).toBe(false);
      expect(cizgiler.some((c) => c.x >= k.x && c.x <= k.x + k.w && c.y >= k.y && c.y <= k.y + k.h)).toBe(false);
      engeller.push(k);
    }
    // Grafik görünür alanda değilse etiket yok
    expect(fonksiyonEtiketYeri([], { genislik: vp.width, yukseklik: vp.height }, yazi, [])).toBeNull();
  });

  it('Canvas grafikleri ön geçişten çizer (süreksizlik + etiket)', () => {
    const tuval = oku('Canvas.tsx');
    expect(tuval).toMatch(/const dunya = fonksiyonParcalari\(safeEval, worldBounds, pointsCount\)/);
    expect(tuval).toMatch(/data-fonksiyon-etiketi=\{fn\.id\}/);
    expect(tuval).toMatch(/if \(fn\.showLabel === false\) continue;/);
    // Eski kutup sezgisi (işaret değişimi VE yüksekliğin yarısı) kaldırıldı
    expect(tuval).not.toMatch(/const bigJump = Math\.abs\(yVal - prevY\) > rangeH \* 0\.5;/);
  });
});

// ------------------------------------------------------------------------------------------------ [158]

describe('[158] fonksiyon şablonları kademeye göre', () => {
  it('ortaokul: TEGM raporuna göre yalnız doğrusal fonksiyon', () => {
    expect(fonksiyonSablonlari('ortaokul').map((s) => s.kimlik)).toEqual(['dogrusal']);
    expect(trigonometriIpucuGosterilir('ortaokul')).toBe(false);
  });

  it('lise, ilkokul ve "Tüm araçlar" değişmez (8 şablon, trigonometri ipucu)', () => {
    for (const duzey of ['lise', 'ilkokul', 'tum'] as const) {
      expect(fonksiyonSablonlari(duzey)).toHaveLength(8);
      expect(trigonometriIpucuGosterilir(duzey)).toBe(true);
    }
    // Şablon ifadeleri eskisiyle aynı (saklanan biçim değişmedi); düğme yazısı okunur
    expect(FONKSIYON_SABLONLARI.map((s) => s.expr)).toEqual(['2*x + 1', 'x^2 - 4', 'sin(x)', 'cos(x)', '|x-2|', 'a*x^2 + b', 'sqrt(x)', 'sind(x)']);
    expect(FONKSIYON_SABLONLARI.every((s) => !/[*^]/.test(s.label))).toBe(true);
  });

  it('pencere kademeyi okur, eski sabit listeyi kullanmaz', () => {
    const pencere = oku('FunctionDialog.tsx');
    expect(pencere).toMatch(/const sablonlar = fonksiyonSablonlari\(kademe\);/);
    expect(pencere).toMatch(/sablonlar\.map\(\(t\) =>/);
    expect(pencere).not.toMatch(/const TEMPLATES = \[/);
  });
});

// ------------------------------------------------------------------------------------------------ [159]

describe('[159] yeni sürgü boş yere konur, çubukların altında kalmaz, gövdesinden taşınır', () => {
  const vp = gorunum();
  const uz = surguUzunlugu(vp);
  const ekranKutusu = (p: { x: number; y: number }) => surguKutusu(worldToScreen(p, vp), uz * vp.zoom);
  const seritler = [...tuvalEngelleri(vp.width, vp.height), { x: 0, y: 0, w: vp.width, h: UST_SERIT }, { x: 0, y: vp.height - ALT_SERIT, w: vp.width, h: ALT_SERIT }];

  it('eski yer (sol üst, %6 / %10) üst şeride biniyordu', () => {
    const b = getVisibleWorldBounds(vp);
    const eski = { x: b.minX + (b.maxX - b.minX) * 0.06, y: b.maxY - (b.maxY - b.minY) * 0.1 };
    expect(seritler.some((s) => kesisir(ekranKutusu(eski), s))).toBe(true);
  });

  it('boş sahnede: araç satırına, Kesir Göster / ipucu şeridine ve alt çubuklara değmez', () => {
    const [yer] = yeniSurguYerleri(vp, [], uz);
    const k = ekranKutusu(yer);
    expect(seritler.some((s) => kesisir(k, s))).toBe(false);
    expect(k.y).toBeGreaterThanOrEqual(UST_SERIT);
    expect(k.x).toBeGreaterThanOrEqual(0);
  });

  it('ikinci sürgü birinciye, sürgü noktaya binmez', () => {
    const [ilk] = yeniSurguYerleri(vp, [], uz);
    const a = { id: 's1', type: 'slider', label: 'a', variableName: 'a', min: -5, max: 5, step: 0.1, value: 1, x: ilk.x, y: ilk.y, length: uz, color: '#8b5cf6', visible: true, createdAt: 1 } as SliderObject;
    const [ikinci] = yeniSurguYerleri(vp, [a], uz);
    expect(kesisir(ekranKutusu(ilk), ekranKutusu(ikinci))).toBe(false);
    // İki sürgü birden (a*x^2 + b): ikisi de ayrı
    const [p, q] = yeniSurguYerleri(vp, [], uz, 2);
    expect(kesisir(ekranKutusu(p), ekranKutusu(q))).toBe(false);
    // Aday yerdeki nokta
    const A = nokta('A', 'A', ilk.x + 1, ilk.y);
    const [kacan] = yeniSurguYerleri(vp, [A], uz);
    const ap = worldToScreen(A, vp);
    expect(kesisir(ekranKutusu(kacan), { x: ap.x - 12, y: ap.y - 28, w: 46, h: 40 })).toBe(false);
  });

  it('tuval boyutu bilinmiyorsa eski yerleşim (sol üstten aşağı)', () => {
    const v0 = gorunum({ width: 0, height: 0 });
    expect(yeniSurguYerleri(v0, [], 4)).toHaveLength(1);
  });

  it('ekleme ve parametre sürgüleri yeni yerleşimi kullanır; Canvas gövdeden sürüklemeyi başlatır', () => {
    const baglam = readFileSync(path.resolve(KOK, '../../state/WorkspaceContext.tsx'), 'utf8');
    expect(baglam).toMatch(/const \[yer\] = yeniSurguYerleri\(vp, mevcut, uzunluk\);/);
    expect(baglam).toMatch(/const yerler = yeniSurguYerleri\(vp, mevcut, uzunluk, eksikler\.length\);/);
    const tuval = oku('Canvas.tsx');
    // Bağı geçici kapalı sürgü de bağlı gibi seçilir (zincir simgesi, 25.10.2026)
    expect(tuval).toMatch(/kisaBasis: bagli \|\| askida \? 'sec' : 'ayarlar',/);
    expect(tuval).toMatch(/else if \(e\.type === 'pointerup' && drag\.kisaBasis === 'sec'\) setSelectedObjectId\(drag\.id\);/);
  });
});

// ------------------------------------------------------------------------------------------------ [160]

describe('[160] yazı eklenince araç Seç ve Taşı\'ya döner', () => {
  it('Tuvale Ekle ve Vazgeç yazı aracını kapatır; düzenleme aracı değiştirmez', () => {
    const tuval = oku('Canvas.tsx');
    // Canvas.notuKaydet (davranışı fareBirakma.test.ts de sınar)
    expect(tuval).toMatch(/addObject\(notNesnesi\(metin, pendingTextWorldPos, renk, boy\), `"\$\{metin\}" notu eklendi`\);\s*if \(activeTool === 'text'\) setActiveTool\('select'\);/);
    expect(tuval).toMatch(/if \(!editingTextObj && activeTool === 'text'\) setActiveTool\('select'\);/);
  });
});

// ------------------------------------------------------------------------------------------------ [161]

describe('[161] Nesneler: uzun ad kısalır, aynı adlar ayırt edilir', () => {
  it('aynı görünen ad "(2)", "(3)" ekiyle; nesnenin adı değişmez', () => {
    const p1 = { id: 'p1', type: 'polygon', label: 'ABC Çokgeni (öteleme)', pointIds: ['a', 'b', 'c'], visible: true } as unknown as PolygonObject;
    const p2 = { ...p1, id: 'p2' } as PolygonObject;
    const p3 = { ...p1, id: 'p3' } as PolygonObject;
    const A = nokta('a', "A'", 0, 0);
    const adlar = ayirtEdiciAdlar([A, p1, p2, p3]);
    expect([...adlar.values()]).toEqual(["A'", 'ABC Çokgeni (öteleme)', 'ABC Çokgeni (öteleme) (2)', 'ABC Çokgeni (öteleme) (3)']);
    expect(p2.label).toBe('ABC Çokgeni (öteleme)');
  });

  it('etiketsiz nesne Türkçe tür adıyla ("pen" değil "Serbest çizim")', () => {
    expect(nesneGorunenAdi({ id: 'k', type: 'pen', label: '', points: [], visible: true } as unknown as MathObject)).toBe('Serbest çizim');
    expect(nesneGorunenAdi(fonksiyon('f1', 'f(x) = 2*x + 1', '2*x + 1'))).toBe('f(x) = 2x + 1');
  });

  it('satırda ad üç noktayla kısalır (shrink-0 değil), simge öbeği sabit', () => {
    const arac = oku('Toolbar.tsx');
    expect(arac).toMatch(/className="font-bold text-\[13px\] text-foreground min-w-0 max-w-\[70%\] shrink truncate yazim-payi"/);
    expect(arac).not.toMatch(/<span className="font-bold text-\[13px\] text-foreground shrink-0 yazim-payi">/);
    expect(arac).toMatch(/<div className="flex items-center gap-1 shrink-0">/);
    expect(arac).toMatch(/const listeAdlari = useMemo\(\(\) => ayirtEdiciAdlar\(objects\), \[objects\]\);/);
  });
});

// ------------------------------------------------------------------------------------------------ [162]

describe('[162] Bağlamlar: Türkçe tür etiketi, formül düzenleme aynı fonksiyonu günceller', () => {
  it('tür adları Türkçe; çokgende üçgen / dörtgen', () => {
    expect(nesneTuruAdi({ type: 'function' })).toBe('fonksiyon');
    expect(nesneTuruAdi({ type: 'polygon', pointIds: ['a', 'b', 'c'] })).toBe('üçgen');
    expect(nesneTuruAdi({ type: 'polygon', pointIds: ['a', 'b', 'c', 'd'] })).toBe('dörtgen');
    expect(nesneTuruAdi({ type: 'polygon', pointIds: ['a', 'b', 'c', 'd', 'e'] })).toBe('çokgen');
    for (const [tur, ad] of Object.entries(NESNE_TURU_ADLARI)) expect(ad, tur).not.toBe(tur);
  });

  it('Bağlamlar kartı Türkçe türü yazar; düğme seçili fonksiyonun kimliğiyle pencereyi açar', () => {
    const arac = oku('Toolbar.tsx');
    expect(arac).toMatch(/\{nesneTuruAdi\(selectedObject as MathObject & \{ pointIds\?: string\[\] \}\)\}/);
    expect(arac).not.toMatch(/\{selectedObject\.type\}\s*<\/span>/);
    expect(arac).toMatch(/onClick=\{\(\) => onOpenFunctionDialog\?\.\(selectedObject\.id\)\}/);
    const gorunumDosyasi = oku('WorkspaceView.tsx');
    expect(gorunumDosyasi).toMatch(/duzenlenecekId=\{duzenlenecekFonksiyonId\}/);
    expect(gorunumDosyasi).toMatch(/onOpenFunctionDialog=\{fonksiyonPenceresiniAc\}/);
  });

  it('pencere düzenlemede formülü yükler, "Güncelle" ile updateFunction çağırır', () => {
    const pencere = oku('FunctionDialog.tsx');
    expect(pencere).toMatch(/setExpression\(fn\.expression\);/);
    expect(pencere).toMatch(/if \(duzenlenen\) updateFunction\(duzenlenen\.id, expr, `\$\{name\} = \$\{expr\}`\);/);
    expect(pencere).toMatch(/\{duzenlenen \? 'Güncelle' : 'Grafiği Çiz'\}/);
    expect(pencere).toMatch(/\{duzenlenen \? 'Fonksiyonu Düzenle' : 'Fonksiyon Grafiği Ekle'\}/);
    // Kendi adı "kullanılıyor" uyarısı vermez
    expect(pencere).toMatch(/functionNameOwner\(objects, typedName, duzenlenen\?\.id\)/);
    const baglam = readFileSync(path.resolve(KOK, '../../state/WorkspaceContext.tsx'), 'utf8');
    expect(baglam).toMatch(/\.\.\.prev\.map\(\(o\) => \(o\.id === id \? \(\{ \.\.\.o, expression, label: etiket \} as MathObject\) : o\)\),/);
  });

  it('düzenleme adı: f(x) korunur, y etiketi y, adsızda sıradaki ad', () => {
    const g = fonksiyon('f2', 'g(x) = x^2 - 4', 'x^2 - 4');
    expect(duzenlemeAdi(g, [g])).toBe('g(x)');
    const y = fonksiyon('f3', 'y = 2*x', '2*x');
    expect(duzenlemeAdi(y, [y])).toBe('y');
    const adsiz = fonksiyon('f4', 'Parabol', 'x^2');
    const f = fonksiyon('f1', 'f(x) = x', 'x');
    expect(duzenlemeAdi(adsiz, [f, adsiz])).toBe('g(x)');
  });
});

// ------------------------------------------------------------------------------------------------ [169]

describe('[169] komutla oluşan nesne görünür kılınır', () => {
  const ucgen = (x0: number, y0: number): MathObject[] => {
    const A = nokta('A', 'A', x0, y0);
    const B = nokta('B', 'B', x0 + 3, y0);
    const C = nokta('C', 'C', x0 + 3, y0 + 4);
    const poly = { id: 'poly', type: 'polygon', label: 'ABC', pointIds: ['A', 'B', 'C'], visible: true } as unknown as PolygonObject;
    return [A, B, C, poly];
  };
  const ekranda = (vp: ViewportTransform, objs: MathObject[], ids: string[]) => {
    const k = nesneKutusu(objs, new Set(ids))!;
    const sol = worldToScreen({ x: k.minX, y: k.maxY }, vp);
    const sag = worldToScreen({ x: k.maxX, y: k.minY }, vp);
    return { x: sol.x, y: sol.y, w: sag.x - sol.x, h: sag.y - sol.y };
  };

  it('görünür alandaki yeni nesnede görünüm değişmez', () => {
    const vp = gorunum();
    const sonra = ucgen(-1.5, -2);
    expect(yeniNesneleriGoster(vp, [], sonra)).toBe(vp);
  });

  it('sağ altta, kısmen dışarıdaki üçgen: görünüm kaydırılır, yakınlık korunur', () => {
    const vp = gorunum();
    const once = [nokta('X', 'X', 0, 0)];
    const sonra = [...once, ...ucgen(8.5, -8)];
    const yeni = yeniNesneleriGoster(vp, once, sonra);
    expect(yeni).not.toBe(vp);
    expect(yeni.zoom).toBe(vp.zoom);
    const k = ekranda(yeni, sonra, ['A', 'B', 'C', 'poly']);
    const alan = serbestDikdortgen(vp.width, vp.height, { kenar: KOMUT_KENAR_PAYI });
    expect(k.x).toBeGreaterThanOrEqual(alan.x);
    expect(k.y).toBeGreaterThanOrEqual(alan.y);
    expect(k.x + k.w).toBeLessThanOrEqual(alan.x + alan.w);
    expect(k.y + k.h).toBeLessThanOrEqual(alan.y + alan.h);
  });

  it('açık komut kutusunun altında kalan üçgen kutunun üstüne alınır', () => {
    const vp = gorunum();
    const ortu = { x: 270, y: 530, w: 490, h: 170 };
    const sonra = ucgen(0, -7);
    const yeni = yeniNesneleriGoster(vp, [], sonra, { kenar: KOMUT_KENAR_PAYI, ortuler: [ortu] });
    const k = ekranda(yeni, sonra, ['A', 'B', 'C', 'poly']);
    expect(kesisir(k, ortu)).toBe(false);
    expect(k.y + k.h).toBeLessThanOrEqual(ortu.y);
  });

  it('sığmayan büyük şekilde yalnız uzaklaştırılır', () => {
    const vp = gorunum();
    const A = nokta('A', 'A', -30, -20);
    const B = nokta('B', 'B', 30, 20);
    const yeni = yeniNesneleriGoster(vp, [], [A, B]);
    expect(yeni.zoom).toBeLessThan(vp.zoom);
    const yakin = yeniNesneleriGoster(vp, [], [nokta('A', 'A', 50, 0)]);
    expect(yakin.zoom).toBe(vp.zoom);
  });

  it('"kenarları 3, 4, 5 olan üçgen çiz": var olan çizimin sağına konan üçgen görünür olur', () => {
    const vp = gorunum();
    const once = ucgen(-2, -2).map((o) => ({ ...o, id: `e${o.id}`, label: o.type === 'point' ? `${o.label}1` : o.label, ...(o.type === 'polygon' ? { pointIds: ['eA', 'eB', 'eC'] } : {}) })) as MathObject[];
    // Eski çizimi sağa yay: yeni üçgen görünümün dışına düşsün
    const genis = [...once, nokta('Z', 'Z', 7, 5)];
    const plan = executeTurkishCommand('kenarları 3, 4, 5 olan üçgen çiz', genis, [], { viewport: vp });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const yeniIds = plan.objects.filter((o) => !genis.some((g) => g.id === o.id)).map((o) => o.id);
    const yeni = yeniNesneleriGoster(vp, genis, plan.objects);
    const k = ekranda(yeni, plan.objects, yeniIds);
    const alan = serbestDikdortgen(vp.width, vp.height, { kenar: KOMUT_KENAR_PAYI });
    expect(k.x + k.w).toBeLessThanOrEqual(alan.x + alan.w);
    expect(k.x).toBeGreaterThanOrEqual(alan.x);
    expect(k.y).toBeGreaterThanOrEqual(alan.y);
    expect(k.y + k.h).toBeLessThanOrEqual(alan.y + alan.h);
  });

  it('fitViewport eski davranışında (nesneKutusu ortak)', () => {
    const vp = gorunum();
    const A = nokta('A', 'A', 0, 0);
    const B = nokta('B', 'B', 4, 3);
    const v = fitViewport(vp, [A, B]);
    expect(v.zoom).toBeCloseTo(Math.min(921 / 7, 698 / 6));
    expect(nesneKutusu([A, B])).toEqual({ minX: 0, minY: 0, maxX: 4, maxY: 3 });
  });

  it('CommandPanel komutla oluşan nesneyi gösterir, görünüm komutlarına karışmaz', () => {
    const panel = oku('CommandPanel.tsx');
    expect(panel).toMatch(/setViewport\(prev => yeniNesneleriGoster\(prev, onceki, plan\.objects, \{ kenar: KOMUT_KENAR_PAYI, ortuler \}\)\);/);
    expect(panel).toMatch(/if \(!plan\.actions\.some\(a => a\.kind === 'viewport' \|\| a\.kind === 'zoom' \|\| a\.kind === 'fitView' \|\| a\.kind === 'resetView'\)\)/);
  });
});
