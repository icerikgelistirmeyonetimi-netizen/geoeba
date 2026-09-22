import { describe, expect, it } from 'vitest';
import type { ViewportTransform } from '@/types/math';
import { ARALIK, centikKalinligi, centikKaydirmasi, centikYariBoyu, centikYolu, etiketPayi } from '../esitlikCizimi';

const vp = { zoom: 40, panX: 0, panY: 0, width: 800, height: 600, showGrid: true, showAxes: true, showCoordinates: false, snapToGrid: false, gridStep: 1 } as ViewportTransform;

/** "M x y L x y" alt yollarını [[x1,y1,x2,y2], ...] olarak çözer. */
function alt(d: string | null): number[][] {
  if (!d) return [];
  return d.split('M').filter(Boolean).map((p) => p.replace('L', ' ').trim().split(/\s+/).map(Number));
}

describe('eşitlik çentiği çizimi', () => {
  it('yatay parçada iki çentik: dikey, ortada ±2 px, çizgi kalınlığının iki yanından 5 px taşar', () => {
    const d = centikYolu({ tur: 'duz', sayi: 2, kalinlik: 2.5, a: { x: -1, y: 0 }, b: { x: 1, y: 0 } }, vp, 1);
    const cizgiler = alt(d);
    expect(cizgiler).toHaveLength(2);
    expect((d!.match(/M/g) ?? []).length).toBe(2);
    const xs = cizgiler.map(([x1, , x2]) => { expect(x1).toBeCloseTo(x2, 6); return x1; }).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(400 - ARALIK / 2, 6);
    expect(xs[1]).toBeCloseTo(400 + ARALIK / 2, 6);
    for (const [, y1, , y2] of cizgiler) {
      expect((y1 + y2) / 2).toBeCloseTo(300, 6);
      expect(Math.abs(y1 - y2)).toBeCloseTo(2 * (2.5 / 2 + 5), 6);
    }
  });

  it('eğik parçada çentikler parçaya dik ve orta noktası parçanın ortası', () => {
    const d = centikYolu({ tur: 'duz', sayi: 1, kalinlik: 2, a: { x: 0, y: 0 }, b: { x: 3, y: 4 } }, vp, 1);
    const [[x1, y1, x2, y2]] = alt(d);
    expect((x1 + x2) / 2).toBeCloseTo(400 + 60, 6);
    expect((y1 + y2) / 2).toBeCloseTo(300 - 80, 6);
    // ekran yönü (3, -4)/5; çentik bununla dik
    expect((x2 - x1) * 3 + (y2 - y1) * -4).toBeCloseTo(0, 6);
  });

  it('ekranda kısa öğe çentiksiz; dört çentik daha uzun öğe ister', () => {
    expect(centikYolu({ tur: 'duz', sayi: 1, kalinlik: 2.5, a: { x: 0, y: 0 }, b: { x: 0.5, y: 0 } }, vp, 1)).toBeNull(); // 20 px
    const orta = { tur: 'duz' as const, kalinlik: 2.5, a: { x: 0, y: 0 }, b: { x: 0.65, y: 0 } }; // 26 px
    expect(centikYolu({ ...orta, sayi: 1 }, vp, 1)).not.toBeNull();
    expect(centikYolu({ ...orta, sayi: 4 }, vp, 1)).toBeNull();
  });

  it('yayda çentikler orta açıda yarıçap doğrultusunda (ekran y ters)', () => {
    const d = centikYolu({ tur: 'yay', sayi: 1, kalinlik: 3, merkez: { x: 0, y: 0 }, yaricap: 2, baslangic: 0, tarama: Math.PI / 2 }, vp, 1);
    const [[x1, y1, x2, y2]] = alt(d);
    const aci = Math.atan2(-((y1 + y2) / 2 - 300), (x1 + x2) / 2 - 400);
    expect(aci).toBeCloseTo(Math.PI / 4, 3);
    expect(Math.hypot((x1 + x2) / 2 - 400, (y1 + y2) / 2 - 300)).toBeCloseTo(80, 1);
    expect(Math.hypot(x2 - x1, y2 - y1)).toBeCloseTo(2 * (1.5 + 5), 1);
    // radyal: çentik doğrultusu merkezden geçer
    expect((x2 - x1) * -(y1 - 300) - (y2 - y1) * -(x1 - 400)).toBeCloseTo(0, 1);
    expect(centikYolu({ tur: 'yay', sayi: 1, kalinlik: 3, merkez: { x: 0, y: 0 }, yaricap: 0.2, baslangic: 0, tarama: Math.PI }, vp, 1)).toBeNull();
  });

  it('ortadaki nokta ya da boyuna eksen çentiği örtmesin: öbek öğe boyunca kayar', () => {
    const yatay = { tur: 'duz' as const, sayi: 1 as const, kalinlik: 2.5, a: { x: -2, y: 0 }, b: { x: 2, y: 0 } };
    expect(centikKaydirmasi(yatay, vp, 1, { noktalar: [] })).toBe(0);
    const o = centikKaydirmasi(yatay, vp, 1, { noktalar: [{ x: 400, y: 300, r: 6.5 }] });
    expect(Math.abs(o)).toBeGreaterThanOrEqual(0.9 + 6.5);
    expect(Math.abs(o)).toBeLessThan(80);
    const [[x1, , x2]] = alt(centikYolu(yatay, vp, 1, o));
    expect(Math.abs((x1 + x2) / 2 - 400)).toBeCloseTo(Math.abs(o), 1);
    // y ekseninde ortalanmış yatay kenar (kullanıcının AC'si): çentik eksenden en az 3 px açılır
    const eksende = { ...yatay, a: { x: -2, y: -3 }, b: { x: 2, y: -3 } };
    const e = centikKaydirmasi(eksende, vp, 1, { noktalar: [], eksenX: 400, eksenY: 300 });
    expect(Math.abs(e)).toBeGreaterThan(0.9 + 3);
    // eksene dik kesen çentik kaymaz (y ekseni üzerindeki dikey parça: çentik ekseni dik keser, görünür)
    const dikey = { ...yatay, a: { x: 0, y: 1 }, b: { x: 0, y: 3 } };
    expect(centikKaydirmasi(dikey, vp, 1, { noktalar: [], eksenX: 400, eksenY: 300 })).toBe(0);
    // ama x ekseninde ortalanmış dikey parçanın yatay çentiği x eksenine gömülür: kayar
    const dikeyOrtada = { ...yatay, a: { x: 1, y: -2 }, b: { x: 1, y: 2 } };
    expect(Math.abs(centikKaydirmasi(dikeyOrtada, vp, 1, { noktalar: [], eksenX: 400, eksenY: 300 }))).toBeGreaterThan(3);
    // yer yoksa kaymaz
    const kisa = { ...yatay, a: { x: -0.4, y: 0 }, b: { x: 0.4, y: 0 } };
    expect(centikKaydirmasi(kisa, vp, 1, { noktalar: [{ x: 400, y: 300, r: 12 }] })).toBe(0);
    // yay: orta açıdaki nokta
    const yay = { tur: 'yay' as const, sayi: 2 as const, kalinlik: 3, merkez: { x: 0, y: 0 }, yaricap: 2, baslangic: 0, tarama: Math.PI / 2 };
    const orta = { x: 400 + 80 * Math.SQRT1_2, y: 300 - 80 * Math.SQRT1_2 };
    expect(Math.abs(centikKaydirmasi(yay, vp, 1, { noktalar: [{ ...orta, r: 6.5 }] }))).toBeGreaterThan(6.5);
  });

  it('kalınlık sınırlı; kalın çizgide çentik yine 5 px taşar; etiket payı', () => {
    expect(centikKalinligi(3)).toBe(2.4);
    expect(centikKalinligi(0.5)).toBe(1.6);
    expect(centikKalinligi(1)).toBeCloseTo(1.8, 9);
    expect(centikYariBoyu(4, 3) - (4 * 3) / 2).toBeCloseTo(5, 9);
    expect(centikYariBoyu(10, 3)).toBe(12);
    expect(etiketPayi(2.5, 1, 8)).toBeLessThan(1);
    expect(etiketPayi(2, 1, 6)).toBeGreaterThan(2);
    expect(etiketPayi(4, 3, 8)).toBeGreaterThan(5);
  });
});
