import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { LineObject, SegmentObject } from '@/types/math';
import { cizgininUzerindeMi, yayinUzerindeMi } from '@/math/insaYardimcilari';
import { kesisimMesaji } from '../kesisimMesaji';
import { alanModeliniYerlestir, ekranKutusuDunyaya } from '../olcmeAraclari';
import { eksenSayilariniYerlestir, type EksenCentigi } from '../eksenSayilari';

/*
 * Atölye inceleme 4. tur, S2a DENETİMİ (bağımsız doğrulama): denetçinin tarayıcıda bulup düzelttiği eksikler.
 */

const KOK = path.resolve(__dirname, '..');
const oku = (ad: string) => readFileSync(path.join(KOK, ad), 'utf8');

describe('[148] denetim: karartmaya basınca odak kutuda kalır', () => {
  it('uyarı durumunda basışın varsayılan odak değişimi engellenir (yazılan sayı kutuya gider)', () => {
    const modal = readFileSync(path.resolve(KOK, '../ui/Modal.tsx'), 'utf8');
    expect(modal).toMatch(/eylem === 'uyar'\) \{[\s\S]{0,400}e\.preventDefault\(\);[\s\S]{0,40}onBackdropPress\?\.\(\)/);
  });
});

describe('[151] denetim: uzunluğu hiç açılmamış parça ölçülür', () => {
  it('showLength yazılmamış parça (bağla, böl, kiriş) "zaten gösteriliyor" sayılmaz', () => {
    const canvas = oku('Canvas.tsx');
    expect(canvas).toMatch(/const zaten = seg\.showLength === true && \(seg\.unit \?\? 'br'\) === unit;/);
    expect(canvas).not.toMatch(/seg\.showLength !== false && \(seg\.unit/);
  });
});

describe('[150] denetim: dilim ve elipste bildirim değeri yazar', () => {
  it('Alanı Bul / Çevre Hesapla dilim ve elipste etiketle aynı hesabı bildirir', () => {
    const canvas = oku('Canvas.tsx');
    expect(canvas).toMatch(/const egriOlcusu = \(obj: MathObject, tur: 'area' \| 'perimeter'\)/);
    expect(canvas).toMatch(/egriOlcusu\(obj, 'area'\)/);
    expect(canvas).toMatch(/egriOlcusu\(obj, 'perimeter'\)/);
  });
});

describe('[152] denetim: alan modeli çizilmiş etiketlerin ve yönerge çubuğunun altına konmaz', () => {
  const vp = { zoom: 44, panX: 0, panY: 0, width: 920, height: 700 };

  it('ekran kutusu dünya kutusuna çevrilir (y yukarı)', () => {
    // Tuvalin ortası (460, 350) dünyada (0, 0); 44 px = 1 br
    const k = ekranKutusuDunyaya({ x0: 460, y0: 306, x1: 548, y1: 350 }, vp);
    expect(k.x0).toBeCloseTo(0, 9);
    expect(k.x1).toBeCloseTo(2, 9);
    expect(k.y0).toBeCloseTo(0, 9);
    expect(k.y1).toBeCloseTo(1, 9);
  });

  it('modelin kendi yazıları (üst, sol, alt) için pay bırakılır: engelin hemen altına yapışmaz', () => {
    // Ortada (model -2..2 × -1,5..1,5) bir etiket kutusu var; modelin alt yazısı ("4 × 3 = 12 br²") ona değmemeli
    const engel = { x0: -2, y0: 1.6, x1: 2, y1: 2.2 };
    const yer = alanModeliniYerlestir(4, 3, vp, [engel]);
    const pay = 24 / vp.zoom;
    const model = { x0: yer.konum.x - pay, y0: yer.konum.y - pay, x1: yer.konum.x + yer.sutun, y1: yer.konum.y + yer.satir + pay };
    expect(model.x0 < engel.x1 && engel.x0 < model.x1 && model.y0 < engel.y1 && engel.y0 < model.y1).toBe(false);
  });

  it('MeasurementInstruments çizilmiş [data-measurement] etiketlerini ve yönerge çubuğunu engel sayar', () => {
    const kaynak = oku('MeasurementInstruments.tsx');
    expect(kaynak).toMatch(/querySelectorAll\('\[data-measurement\]'\)/);
    expect(kaynak).toMatch(/querySelectorAll\('\[data-yonerge-cubugu\]'\)/);
    expect(kaynak).toMatch(/alanModeliEngelleri\(objects\), \.\.\.cizilmisEtiketler\(vp\)/);
  });
});

describe('[154] denetim: çokgen kenarı da doğrultu verir', () => {
  it('Dik / Paralel Doğru çokgenin kenarına dokununca kenarın iki köşesini doğrultu alır', () => {
    const canvas = oku('Canvas.tsx');
    expect(canvas).toMatch(/!dogrultu && obj\.type === 'polygon'/);
    expect(canvas).toMatch(/dogrultu = \[poly\.pointIds\[k\], poly\.pointIds\[\(k \+ 1\) % poly\.pointIds\.length\]\]/);
  });
});

describe('[155] denetim: uzantıdaki kesişim bildirimde "uzantısı" diye yazılır', () => {
  it('cizgininUzerindeMi: parça [0, 1], ışın [0, ∞), doğru her yer', () => {
    const a = { x: 5, y: 5 };
    const b = { x: 7, y: 5 };
    expect(cizgininUzerindeMi('parca', a, b, { x: 6, y: 5 })).toBe(true);
    expect(cizgininUzerindeMi('parca', a, b, { x: 10, y: 5 })).toBe(false);
    expect(cizgininUzerindeMi('isin', a, b, { x: 10, y: 5 })).toBe(true);
    expect(cizgininUzerindeMi('isin', a, b, { x: 4, y: 5 })).toBe(false);
    expect(cizgininUzerindeMi('dogru', a, b, { x: -40, y: 5 })).toBe(true);
  });

  it('yayinUzerindeMi: başlangıçtan saat yönünün tersine tarama içinde', () => {
    const m = { x: 0, y: 0 };
    // Üst yarım çember: 0 → π
    expect(yayinUzerindeMi(m, 0, Math.PI, { x: 0, y: 1 })).toBe(true);
    expect(yayinUzerindeMi(m, 0, Math.PI, { x: 0, y: -1 })).toBe(false);
    expect(yayinUzerindeMi(m, 0, Math.PI, { x: 1, y: 0 })).toBe(true);
    // 3π/2'den başlayıp π/2 tarayan yay (sağ alt çeyrek), açının 2π'den dönmesi
    expect(yayinUzerindeMi(m, -Math.PI / 2, Math.PI / 2, { x: 0.7, y: -0.7 })).toBe(true);
    expect(yayinUzerindeMi(m, -Math.PI / 2, Math.PI / 2, { x: -0.7, y: 0.7 })).toBe(false);
  });

  it('kesisimMesaji: uzantıdaki şeklin adı "… uzantısı" olur', () => {
    const ef = { id: 's', type: 'segment', label: '[EF]' } as SegmentObject;
    const ab = { id: 'l', type: 'line', label: 'AB' } as LineObject;
    expect(kesisimMesaji(ef, ab, [{ ad: 'H', x: 10, y: 5 }], [], [true, false])).toBe(
      '[EF] doğru parçasının uzantısı ile AB doğrusunun kesişim noktası H(10; 5).'
    );
    expect(kesisimMesaji(ab, ef, [{ ad: 'H', x: 10, y: 5 }], [], [false, true])).toBe(
      'AB doğrusu ile [EF] doğru parçasının uzantısının kesişim noktası H(10; 5).'
    );
    // Uzantı yoksa metin değişmez
    expect(kesisimMesaji(ef, ab, [{ ad: 'H', x: 6, y: 5 }])).toBe('[EF] doğru parçası ile AB doğrusunun kesişim noktası H(6; 5).');
  });

  it('eksenin yanındaki noktanın üstüne düşen eksen sayısı yazılmaz; eksen üstündeki noktalar sayıyı gizlemez', () => {
    const W = 900;
    const H = 700;
    const orijin = { x: 450, y: 350 };
    const xCentikleri: EksenCentigi[] = [-3, -2, -1, 1, 2, 3].map((d) => ({ deger: d, ekran: orijin.x + d * 44, metin: String(d).replace('-', '-') }));
    const temel = { genislik: W, yukseklik: H, orijin, xCentikleri, yCentikleri: [], adim: 1, yaziBoyu: 11 };
    const bos = eksenSayilariniYerlestir(temel);
    const sayi = (r: typeof bos, d: number) => r.x.ogeler.find((o) => o.deger === d)?.sayi;
    expect(sayi(bos, -3)?.gorunur).toBe(true);
    // F(-3; -0,3): eksenin 13 px altında, gövde 7 px
    const f = { x: orijin.x - 3 * 44 - 7, y: orijin.y + 13 - 7, w: 14, h: 14 };
    const sonuc = eksenSayilariniYerlestir({ ...temel, engeller: [f] });
    expect(sayi(sonuc, -3)?.gorunur).toBe(false);
    expect(sayi(sonuc, -2)?.gorunur).toBe(true);
    // Canvas: yalnız eksenin YANINDAKİ (2–24 px) noktalar engel olur
    const canvas = oku('Canvas.tsx');
    expect(canvas).toMatch(/const yaninda = \(d: number\) => d > 2 && d <= 24;/);
    expect(canvas).toMatch(/\.\.\.eksenYakiniNoktalar\]/);
  });
});

describe('[156] denetim: tek noktanın ötelemesi de benzersiz ad ve tür alır', () => {
  it('oteleSekil nokta dalı kopyala() ile üretir (A\' doluysa A\'\', donusum: oteleme)', () => {
    const ctx = readFileSync(path.resolve(KOK, '../../state/WorkspaceContext.tsx'), 'utf8');
    expect(ctx).not.toMatch(/yeni\.label = `\$\{hedef\.label\}'`;/);
    expect(ctx).toMatch(/if \(hedef\.type === 'point'\) \{[\s\S]{0,200}const k = kopyala\(\[hedef\.id\]\);/);
  });
});
