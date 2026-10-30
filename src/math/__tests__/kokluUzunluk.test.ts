import { describe, expect, it } from 'vitest';
import { kokluBicim } from '@/math/kilavuz';
import { aciklama, latex, olcuDugumleri, olcuMetni, sesli, uzunluk, type YazimAyari } from '@/math/matematikYazimi';

/*
 * Kareköklü gösterim (kullanıcı, 2026-10-30: "kareköklü gösterim ortaokulda ve lisede olsun"): iki ucu da kılavuz
 * (tam sayı koordinatlı) noktada olan parçanın uzunluğu √(Δx² + Δy²) kesin değeriyle yazılır.
 */

const nk = (label: string, x: number, y: number) => ({ label, showLabel: true, visible: true, x, y });
const ORTAOKUL: YazimAyari = { olcuYazimi: 'kisa', aciYazimi: 'sapka', tamSayi: false, kokluGosterim: true };
const TAM: YazimAyari = { olcuYazimi: 'tam', aciYazimi: 'sapka', tamSayi: false, kokluGosterim: true };

const parca = (a: [number, number], b: [number, number]) =>
  uzunluk(nk('A', ...a), nk('B', ...b), Math.hypot(a[0] - b[0], a[1] - b[1]));

describe('kokluBicim: √n sadeleşir', () => {
  it.each([[2, 1, 2], [8, 2, 2], [12, 2, 3], [13, 1, 13], [16, 4, 1], [72, 6, 2], [50, 5, 2]])('√%i = %i√%i', (n, katsayi, radikand) => {
    expect(kokluBicim(n)).toEqual({ katsayi, radikand });
  });
});

describe('kılavuzdaki uzunluk kareköklü yazılır', () => {
  it('√2, √13, 2√2; tam karede tam sayı', () => {
    expect(olcuMetni(parca([6, 2], [7, 1]), ORTAOKUL)).toBe('√2 br');
    expect(olcuMetni(parca([5, -3], [7, 0]), ORTAOKUL)).toBe('√13 br');
    expect(olcuMetni(parca([4, 2], [0, -2]), ORTAOKUL)).toBe('4√2 br');
    expect(olcuMetni(parca([0, 0], [3, 4]), ORTAOKUL)).toBe('5 br');
    expect(olcuMetni(parca([5, 1], [5, -3]), ORTAOKUL)).toBe('4 br');
  });

  it('tam yazımda bağlaç "=" (kesin değer, "≈" yok)', () => {
    expect(olcuMetni(parca([5, -3], [7, 0]), TAM)).toBe('|AB| = √13 br');
  });

  it('tam sayı ayarı kesin kareköklü değeri yuvarlamaz; kılavuz dışında yuvarlanan değer ≈ alır', () => {
    expect(olcuMetni(parca([5, -3], [7, 0]), { ...TAM, tamSayi: true })).toBe('|AB| = √13 br');
    expect(olcuMetni(parca([0, 0], [1.5, 3]), { ...ORTAOKUL, tamSayi: true })).toBe('≈ 3 br');
    expect(olcuMetni(parca([0, 0], [1.5, 2]), { ...ORTAOKUL, tamSayi: true })).toBe('≈ 3 br');
    expect(olcuMetni(parca([0, 0], [3, 4]), { ...ORTAOKUL, tamSayi: true })).toBe('5 br');
  });

  it('ayar kapalıyken (komut yanıtı, ilkokul) ondalık yazılır', () => {
    expect(olcuMetni(parca([5, -3], [7, 0]))).toBe('|AB| ≈ 3,61 br');
    expect(olcuMetni(parca([5, -3], [7, 0]), { ...TAM, kokluGosterim: false })).toBe('|AB| ≈ 3,61 br');
  });

  it('kılavuz dışındaki nokta ve sürgü değeri kareköklü yazılmaz', () => {
    expect(olcuMetni(parca([0, 0], [1.5, 2]), ORTAOKUL)).toBe('2,5 br');
    expect(olcuMetni(parca([0.5, 0], [1.5, 1]), ORTAOKUL)).toBe('≈ 1,41 br');
    // Değer iki noktanın uzaklığı değilse (sürgünün hedef değeri) kareköklü biçim eklenmez
    expect(olcuMetni(uzunluk(nk('A', 0, 0), nk('B', 1, 1), 1.5), ORTAOKUL)).toBe('1,5 br');
    // Adı olmayan uç (nokta değil) da kareköklü olmaz
    expect(olcuMetni(uzunluk(null, null, Math.SQRT2), ORTAOKUL)).toBe('≈ 1,41 br');
  });

  it('sesli okunuş, ipucu ve LaTeX', () => {
    const o = parca([4, 2], [0, -2]);
    expect(sesli(o, TAM)).toBe('a be uzunluğu dört kök iki birim');
    expect(aciklama(o, TAM)).toBe('AB uzunluğu: 4√2 br');
    expect(latex(olcuDugumleri(parca([5, -3], [7, 0]), TAM))).toBe('|\\mathrm{A}\\mathrm{B}| = \\surd 13\\ \\mathrm{br}');
  });
});
