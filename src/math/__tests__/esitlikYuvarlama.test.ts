import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import { esitlikIsaretleri, type EsitlikSonucu } from '@/math/esitlikIsaretleri';
import { kilavuzKaresi } from '@/math/kilavuz';

/*
 * Kullanıcı (2026-10-27): "yuvarlamadan dolayı eşit olmayacak uzunluklar eşit gibi çentik atıyor".
 * Ekran görüntüsündeki sahne, ızgara noktalarıyla: sağda A(5;2) B(6;2) C(5;1) D(7;1) F(7;0) E(5;−3),
 * solda G(4;2) I(4;1) H(0;−2) J(0;−3) paralelkenarı. Uzunluklar: AB = AC = DF = 1, BD = √2 ≈ 1,41, CD = 2,
 * CE = 4, EF = √13 ≈ 3,61; GI = HJ = 1, GH = IJ = 4√2 ≈ 5,66.
 * Tam sayı yazımı eşitliği yuvarlanmış değerle kuruyordu: BD, AB ile; EF, CE ile eş çentikleniyordu.
 * 2026-10-30'dan beri eşitlik gerçek ölçüyle kurulur (kılavuz noktalarında uzunluk kareleriyle tam).
 */

const pt = (id: string, x: number, y: number) =>
  ({ id, type: 'point', label: id, showLabel: true, x, y, color: '#000', visible: true, isIndependent: true, createdAt: 0 }) as MathObject;
const seg = (ad: string) =>
  ({ id: ad, type: 'segment', label: ad, showLabel: false, startPointId: ad[0], endPointId: ad[1], color: '#0284c7', visible: true, createdAt: 0 }) as MathObject;

const sahne: MathObject[] = [
  pt('A', 5, 2), pt('B', 6, 2), pt('C', 5, 1), pt('D', 7, 1), pt('F', 7, 0), pt('E', 5, -3),
  pt('G', 4, 2), pt('I', 4, 1), pt('H', 0, -2), pt('J', 0, -3),
  ...['GH', 'IJ', 'GI', 'HJ', 'AB', 'AC', 'BD', 'CD', 'DF', 'CE', 'EF'].map(seg),
];

/** Parça adı → çentik sayısı (işaretsizler yok). */
const centikler = (s: EsitlikSonucu) => Object.fromEntries(s.isaretler.filter((m) => m.tur === 'duz').map((m) => [m.sahipId, m.sayi]));

describe('ekran görüntüsü (2026-10-27): yuvarlanınca aynı tam sayıyı gösteren eşit olmayan parçalar', () => {
  it('yalnız gerçekten eş parçalar çentiklenir: BD ve EF işaretsiz', () => {
    expect(centikler(esitlikIsaretleri(sahne))).toEqual({ GH: 1, IJ: 1, GI: 2, HJ: 2, AB: 1, AC: 1, DF: 1 });
  });

  it('kılavuz noktalarında uzunluk kareleri tam karşılaştırılır', () => {
    expect(kilavuzKaresi({ x: 5, y: -3 }, { x: 7, y: 0 })).toBe(13);
    expect(kilavuzKaresi({ x: 0, y: 0 }, { x: 0.5, y: 1 })).toBeUndefined();
    // Uçları kılavuzda: (1;2) ile (2;1) yönlü iki √5 eş; ikisi de "2,24" yazılsa da √5 ile 2,235 değil
    const s = esitlikIsaretleri([
      pt('K', 0, 0), pt('L', 1, 2), pt('M', 3, 1), pt('N', 0, 2.235),
      seg('KL'), seg('LM'), seg('KN'),
    ]);
    expect(centikler(s)).toEqual({ KL: 1, LM: 1 });
    expect(s.ogeler.get('seg:KL')?.kare).toBe(5);
    expect(s.ogeler.get('seg:KN')?.kare).toBeUndefined();
  });

  it('kılavuz dışında (4 basamaklı yuvarlanmış nokta) sıkı tolerans sürer: √2 ile 1,4142 eş', () => {
    // Çembere konan nokta koordinatları 4 basamağa yuvarlar; kılavuzdaki √2 ile eş sayılmalı
    const s = esitlikIsaretleri([pt('A', 0, 0), pt('B', 1, 1), pt('C', 1.4142, 0), seg('AB'), seg('AC')]);
    expect(centikler(s)).toEqual({ AB: 1, AC: 1 });
  });
});
