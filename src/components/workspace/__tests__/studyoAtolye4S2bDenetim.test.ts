import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FunctionObject, SliderObject, ViewportTransform } from '@/types/math';
import { getVisibleWorldBounds, worldToScreen } from '@/math/coordinates';
import { fonksiyonParcalari } from '@/math/fonksiyonCizimi';
import { eksenSayilariniYerlestir, tuvalEngelleri, type EksenCentigi } from '../eksenSayilari';
import { fonksiyonEtiketiEngelleri, fonksiyonEtiketYeri, type Kutu } from '../fonksiyonEtiketi';
import { surguEngelleri, surguKutusu } from '../surguYerlesimi';
import { bagimlilikEngelleri } from '../FunctionDialog';

/*
 * Atölye 4. tur S2b DENETİM: fonksiyon grafiği etiketi ([157]) eksen rozetlerine ve tuvaldeki nesnelere binmez.
 * Tarayıcıda (1280 × 800, ortaokul, f, g, h = 1/x, k = 1/(x − 3)) "h(x) = 1/x" etiketi sağ kenardaki "+x" rozetinin
 * altında kalıyordu (ekran S2b_dogrulama_157_varsayilan.png).
 */

const KOK = path.resolve(__dirname, '..');
const oku = (ad: string) => readFileSync(path.join(KOK, ad), 'utf8');
const kesisir = (a: Kutu, b: Kutu) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const gorunum = (p: Partial<ViewportTransform> = {}): ViewportTransform =>
  ({ zoom: 44, panX: 0, panY: 0, width: 921, height: 698, showGrid: true, showAxes: true, showCoordinates: false, ...p }) as ViewportTransform;

/** Canvas'taki gibi eksen yerleşimi (tam sayı çentikleri). */
function eksen(vp: ViewportTransform) {
  const b = getVisibleWorldBounds(vp);
  const xs: EksenCentigi[] = [];
  const ys: EksenCentigi[] = [];
  for (let d = Math.ceil(b.minX); d <= Math.floor(b.maxX); d++) if (d) xs.push({ deger: d, ekran: worldToScreen({ x: d, y: 0 }, vp).x, metin: String(d) });
  for (let d = Math.ceil(b.minY); d <= Math.floor(b.maxY); d++) if (d) ys.push({ deger: d, ekran: worldToScreen({ x: 0, y: d }, vp).y, metin: String(d) });
  return eksenSayilariniYerlestir({
    genislik: vp.width, yukseklik: vp.height, orijin: worldToScreen({ x: 0, y: 0 }, vp),
    xCentikleri: xs, yCentikleri: ys, adim: 1, yaziBoyu: 11, engeller: tuvalEngelleri(vp.width, vp.height),
  });
}

const FONKSIYONLAR: [string, (x: number) => number][] = [
  ['f(x) = 2x + 1', (x) => 2 * x + 1],
  ['g(x) = x² − 4', (x) => x * x - 4],
  ['h(x) = 1/x', (x) => 1 / x],
  ['k(x) = 1/(x − 3)', (x) => 1 / (x - 3)],
];

/** Canvas'ın sırasıyla etiket yerleşimi (önceki etiketler de engel olur). */
function yerlestir(vp: ViewportTransform, ilkEngeller: readonly Kutu[]) {
  const kutu = getVisibleWorldBounds(vp);
  const pointsCount = Math.min(800, Math.max(200, Math.floor(vp.width / 2)));
  const parcalar = FONKSIYONLAR.map(([, f]) => fonksiyonParcalari(f, kutu, pointsCount).map((p) => p.map((q) => worldToScreen(q, vp))));
  const cizgiler = parcalar.flatMap((p) => p.flat());
  const engeller = [...ilkEngeller];
  const px = 13;
  return FONKSIYONLAR.map(([metin], i) => {
    const yer = fonksiyonEtiketYeri(parcalar[i], { genislik: vp.width, yukseklik: vp.height }, { w: metin.length * px * 0.56 + 4, h: px }, engeller, cizgiler);
    if (yer) engeller.push(yer.kutu);
    return yer;
  });
}

describe('[157] denetim: grafik etiketi eksen rozetlerine ve nesnelere binmez', () => {
  it('eski engel kümesinde bir etiket "+x" rozetine biniyordu; yenisinde hiçbir rozete ve (0; 0) rozetine değmez', () => {
    const vp = gorunum();
    const e = eksen(vp);
    const rozetler = [e.rozetler.artiX, e.rozetler.artiY, e.rozetler.eksiY].filter((r) => r.gorunur);
    expect(rozetler).toHaveLength(3);
    const o = worldToScreen({ x: 0, y: 0 }, vp);
    // S2b'nin engel kümesi: düğmeler + eksen şeritleri (rozetler yok)
    const eski = [...tuvalEngelleri(vp.width, vp.height), { x: 0, y: o.y - 5, w: vp.width, h: 24 }, { x: o.x - 30, y: 0, w: 35, h: vp.height }];
    expect(yerlestir(vp, eski).some((y) => y && rozetler.some((r) => kesisir(y.kutu, r)))).toBe(true);

    const yerler = yerlestir(vp, fonksiyonEtiketiEngelleri({ genislik: vp.width, yukseklik: vp.height }, e, tuvalEngelleri(vp.width, vp.height)));
    expect(yerler.every(Boolean)).toBe(true);
    for (const y of yerler) {
      for (const r of rozetler) expect(kesisir(y!.kutu, r)).toBe(false);
      if (e.orijinRozeti) expect(kesisir(y!.kutu, e.orijinRozeti)).toBe(false);
    }
  });

  it('eksen ekran dışındayken kenara yapışan sayı satırı da engeldir', () => {
    const vp = gorunum({ panY: 500 }); // x ekseni tuvalin altında: sayılar alt kenarda, çentiklerin üstünde
    const e = eksen(vp);
    expect(e.x.durum).toBe('alt');
    const engeller = fonksiyonEtiketiEngelleri({ genislik: vp.width, yukseklik: vp.height }, e);
    const serit = e.x.sayiYonu === 'alt' ? { x: 0, y: e.x.cizgiY - 5, w: vp.width, h: 24 } : { x: 0, y: e.x.cizgiY - 19, w: vp.width, h: 24 };
    expect(engeller).toContainEqual(serit);
    // Eksen gizliyse (eksenYerlesimi null) yalnız verilen kümeler
    expect(fonksiyonEtiketiEngelleri({ genislik: 100, yukseklik: 100 }, null, [{ x: 1, y: 2, w: 3, h: 4 }])).toEqual([{ x: 1, y: 2, w: 3, h: 4 }]);
  });

  it('etiket tuvaldeki sürgünün üstüne konmaz', () => {
    const vp = gorunum();
    const e = eksen(vp);
    const temel = fonksiyonEtiketiEngelleri({ genislik: vp.width, yukseklik: vp.height }, e, tuvalEngelleri(vp.width, vp.height));
    const [ilk] = yerlestir(vp, temel);
    expect(ilk).not.toBeNull();
    // f'nin etiketinin tam yerine bir sürgü koy
    const sol = { x: ilk!.kutu.x + 12, y: ilk!.kutu.y + 34 };
    const dunya = { x: (sol.x - vp.width / 2) / vp.zoom, y: (vp.height / 2 - sol.y) / vp.zoom };
    const s = { id: 's1', type: 'slider', label: 'a', variableName: 'a', min: -5, max: 5, step: 0.1, value: 1, x: dunya.x, y: dunya.y, length: 2, color: '#8b5cf6', visible: true, createdAt: 1 } as SliderObject;
    const surgu = surguKutusu(worldToScreen(dunya, vp), 2 * vp.zoom);
    expect(kesisir(ilk!.kutu, surgu)).toBe(true);
    const [kacan] = yerlestir(vp, fonksiyonEtiketiEngelleri({ genislik: vp.width, yukseklik: vp.height }, e, tuvalEngelleri(vp.width, vp.height), surguEngelleri([s], vp)));
    expect(kacan).not.toBeNull();
    expect(kesisir(kacan!.kutu, surgu)).toBe(false);
  });

  it('Canvas etiket engellerini eksen yerleşiminden ve nesne kutularından kurar; yazı boyu kutuyla aynı', () => {
    const tuval = oku('Canvas.tsx');
    expect(tuval).toMatch(/const engeller = fonksiyonEtiketiEngelleri\(\s*\{ genislik: viewport\.width, yukseklik: viewport\.height \},\s*eksenYerlesimi,/);
    expect(tuval).toMatch(/surguEngelleri\(objects, viewport\)\s*\);/);
    expect(tuval).toMatch(/const px = fs\(13, 'label'\) \* yaziOlcegi;/);
    expect(tuval).toMatch(/fontSize=\{etiket\.px\}/);
    // Etiket hesabı eksen yerleşiminden SONRA (TDZ değil, gerçek rozet konumları)
    expect(tuval.indexOf('const fonksiyonEtiketleri = useMemo')).toBeGreaterThan(tuval.indexOf('const eksenYerlesimi = useMemo'));
  });
});

// ------------------------------------------------------------------------------------------------ [162] denetim

const fonksiyon = (id: string, label: string, expression: string): FunctionObject =>
  ({ id, type: 'function', label, showLabel: true, expression, color: '#2563eb', visible: true, createdAt: 1 }) as FunctionObject;

describe('[162] denetim: formül düzenleme döngü kurmaz, çağrılan fonksiyonun adı değişmez', () => {
  // Tarayıcıda (S2b_denetim/v162b.py): g(x) = f(x) + 1 varken f "g(x) − 1" yapılınca ya da f → p adlanınca
  // pencere uyarısız kabul ediyordu, grafikler siliniyordu.
  const f = fonksiyon('fn1', 'f(x) = 2*x + 1', '2*x + 1');
  const g = fonksiyon('fn2', 'g(x) = f(x) + 1', 'f(x) + 1');

  it('f(x) = g(x) − 1 döngüdür (f → g → f); kendini çağırma da', () => {
    expect(bagimlilikEngelleri([f, g], 'f', 'g(x) - 1', f).dongu).toEqual(['f', 'g', 'f']);
    expect(bagimlilikEngelleri([f], 'h', 'h(x) + 1').dongu).toEqual(['h', 'h']);
    // Döngüsüz düzenleme serbest
    expect(bagimlilikEngelleri([f, g], 'f', 'x^2', f)).toEqual({ dongu: null, eskiAd: 'f', cagiranlar: [] });
  });

  it('çağrılan fonksiyonun adı değişirse çağıranlar listelenir; adı aynı kalırsa ya da çağıran yoksa boş', () => {
    expect(bagimlilikEngelleri([f, g], 'p', '2*x + 1', f).cagiranlar.map((o) => o.id)).toEqual(['fn2']);
    expect(bagimlilikEngelleri([f, g], 'f', '3*x', f).cagiranlar).toEqual([]);
    // g'yi kimse çağırmıyor: g → q serbest
    expect(bagimlilikEngelleri([f, g], 'q', 'f(x) + 2', g)).toEqual({ dongu: null, eskiAd: 'g', cagiranlar: [] });
    // "y = …" (adsız) yapılırsa da çağıranlar kırılır
    expect(bagimlilikEngelleri([f, g], undefined, '2*x + 1', f).cagiranlar.map((o) => o.id)).toEqual(['fn2']);
  });

  it('pencere bu engelleri doğrulamaya katar ve uyarı yazar', () => {
    const pencere = oku('FunctionDialog.tsx');
    expect(pencere).toMatch(/const isValid = validation\.ok && !nameOwner && missingCalls\.length === 0 && !dongu && cagiranlar\.length === 0;/);
    expect(pencere).toMatch(/kendisine bağlı olamaz/);
    expect(pencere).toMatch(/adını değiştirmeden güncelleyin/);
  });
});
