import { describe, expect, it } from 'vitest';
import {
  VARSAYILAN_YAZIM, aci, alan, cemberCevresi, cevre, daireAlani, dilimAlani, duzMetin, egim, kiris, koordinat,
  latex, latexDenetle, metniCozumle, olcuLatex, trigOrani, uzunluk, yaricap, yayOlcusu, yayUzunlugu,
} from '../matematikYazimi';

const P = (label: string) => ({ label, showLabel: true, visible: true });
const [A, B, C, D, O] = ['A', 'B', 'C', 'D', 'O'].map(P);
const ISARET = { ...VARSAYILAN_YAZIM, aciYazimi: 'isaret' as const };

/** Komut yanıtlarının ve ipuçlarının biçimi — LaTeX ve gidiş-dönüş güvencesi bu listeden denetlenir. */
export const YAZIM_ORNEKLERI = [
  '|AB| = 5 br',
  '|AB| ≈ 10,39 br. |CD| = 2 cm.',
  'A(ABC) = 6 br², Ç(ABC) = 12 br.',
  'ABC açıları: m(∠CAB) = 90°, m(∠ABC) ≈ 36,87°, m(∠BCA) ≈ 53,13° (toplam 180°).',
  '|B͡C| ≈ 3,14 br. m(B͡C) = 90°.',
  '|A͡C͡B| ≈ 14,14 br',
  'Ç(A, r): alan = πr² ≈ 28,27 br², çevre = 2πr ≈ 18,85 br.',
  'A merkezli çemberin yarıçapı 2,5 br.',
  'ABCD köşegenleri: |AC| ≈ 2,83 br, |BD| ≈ 2,83 br.',
  'sin B̂ = |AC|/|BC| = 3/5 = 0,6',
  'm(∠ABC) ≈ 36,87°: sin = 0,6, cos = 0,8, tan = 0,75.',
  'r = |OA| = 3 br',
  'kiriş |BC| ≈ 2,83 br',
  'çap |BC| = 2r = 6 br',
  'A(AOB dilimi) ≈ 4,71 br², Ç(AOB dilimi) ≈ 7,14 br.',
  'AB eğimi ≈ 1,3333',
  "A_1 ve B' noktaları: |A_1B'| = 2 br.",
  'y = 2x + 1: eğim = 2.',
  'f(x) = x² - 1: eğim tanımsız.',
  '△ABC çizildi (kenar 4 br, açı 60°).',
  'm(∠ABC) = 300° (dış açı)',
  'm(A͡B) = 180° (yarım çember)',
  'Toplam %50 oranında büyütüldü.',
  "∠ABC açısı silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın.",
  'Not: uzunlukları şu an eşit değil (10,39 br; 10,47 br)',
  'A(2; -3) noktası oluşturuldu.',
  '[OH] ⊥ d, AB ∥ CD.',
  'Ölçüler adıyla yazılıyor: |AB| = 5 br.',
] as const;

describe('LaTeX (düğüm yolundan)', () => {
  it.each([
    [olcuLatex(uzunluk(A, B, 5)), '|\\mathrm{A}\\mathrm{B}| = 5\\ \\mathrm{br}'],
    [olcuLatex(aci(A, B, C, 60)), 'm(\\widehat{\\mathrm{A}\\mathrm{B}\\mathrm{C}}) = 60^\\circ'],
    [olcuLatex(aci(A, B, C, 60), ISARET), 'm(\\angle \\mathrm{A}\\mathrm{B}\\mathrm{C}) = 60^\\circ'],
    [olcuLatex(yayUzunlugu({ bas: A, son: B, buyuk: false }, 7.1239)), '|\\overset{\\frown}{\\mathrm{A}\\mathrm{B}}| \\approx 7{,}12\\ \\mathrm{br}'],
    [olcuLatex(alan([A, B, C], 12)), '\\mathrm{A}(\\mathrm{A}\\mathrm{B}\\mathrm{C}) = 12\\ \\mathrm{br}^2'],
    [olcuLatex(cevre([A, B, C], 24)), '\\text{Ç}(\\mathrm{A}\\mathrm{B}\\mathrm{C}) = 24\\ \\mathrm{br}'],
    [olcuLatex(daireAlani(9 * Math.PI)), '\\text{Alan} = \\pi r^2 \\approx 28{,}27\\ \\mathrm{br}^2'],
    [olcuLatex(cemberCevresi(6 * Math.PI)), '\\text{Çevre} = 2\\pi r \\approx 18{,}85\\ \\mathrm{br}'],
    [olcuLatex(dilimAlani(A, O, B, 4.712)), '\\mathrm{A}(\\mathrm{A}\\mathrm{O}\\mathrm{B}\\text{ dilimi}) \\approx 4{,}71\\ \\mathrm{br}^2'],
    [olcuLatex(yaricap(O, A, 3)), 'r = |\\mathrm{O}\\mathrm{A}| = 3\\ \\mathrm{br}'],
    [olcuLatex(kiris(A, B, 6, true)), '\\text{çap }|\\mathrm{A}\\mathrm{B}| = 2r = 6\\ \\mathrm{br}'],
    [olcuLatex(uzunluk(P('A_1'), P("B'"), 2)), "|\\mathrm{A}_{1}\\mathrm{B}'| = 2\\ \\mathrm{br}"],
    [olcuLatex(koordinat(A, 2.5, -3)), '\\mathrm{A}(2{,}5;\\ -3)'],
    [olcuLatex(egim(A, B, 2)), '\\mathrm{A}\\mathrm{B}\\text{ eğimi} = 2'],
    [olcuLatex(trigOrani('sin', B, [A, C], [B, C], 3, 5, 0.6)),
      '\\sin \\widehat{\\mathrm{B}} = \\frac{|\\mathrm{A}\\mathrm{C}|}{|\\mathrm{B}\\mathrm{C}|} = \\frac{3}{5} = 0{,}6'],
  ])('%s', (gercek, beklenen) => expect(gercek).toBe(beklenen));

  it('yay varsayılan olarak \\overset{\\frown}, seçenekle \\overparen', () => {
    const o = yayOlcusu({ bas: A, son: B, ara: C, buyuk: true }, 280);
    expect(olcuLatex(o)).toBe('m(\\overset{\\frown}{\\mathrm{A}\\mathrm{C}\\mathrm{B}}) = 280^\\circ');
    expect(olcuLatex(o, VARSAYILAN_YAZIM, { yayKomutu: 'overparen' })).toBe('m(\\overparen{\\mathrm{A}\\mathrm{C}\\mathrm{B}}) = 280^\\circ');
  });

  it('üçgen adı ve tüm düğüm türleri karşılanır', () => {
    expect(latex(metniCozumle('△ABC'))).toBe('\\overset{\\triangle}{\\mathrm{A}\\mathrm{B}\\mathrm{C}}');
  });
});

describe('LaTeX (düz metin yolundan)', () => {
  it.each(YAZIM_ORNEKLERI)('%s geçerli LaTeX üretir', (s) => {
    expect(latexDenetle(latex(metniCozumle(s)))).toEqual([]);
  });

  it.each(YAZIM_ORNEKLERI)('%s gidiş-dönüşte aynı metne döner', (s) => {
    expect(duzMetin(metniCozumle(s))).toBe(s);
  });

  it.each([
    ["A_1 ve B' noktaları: |A_1B'| = 2 br.",
      "\\mathrm{A}_{1} \\text{ve }\\mathrm{B}' \\text{noktaları: }|\\mathrm{A}_{1}\\mathrm{B}'| = 2\\ \\mathrm{br}."],
    ['A(ABC) = 6 br², Ç(ABC) = 12 br.',
      '\\mathrm{A}(\\mathrm{A}\\mathrm{B}\\mathrm{C}) = 6\\ \\mathrm{br}^2, \\text{Ç}(\\mathrm{A}\\mathrm{B}\\mathrm{C}) = 12\\ \\mathrm{br}.'],
    ['Ç(A, r): alan = πr² ≈ 28,27 br², çevre = 2πr ≈ 18,85 br.',
      '\\text{Ç}(\\mathrm{A}, r): \\text{alan} = \\pi r^2 \\approx 28{,}27\\ \\mathrm{br}^2, \\text{çevre} = 2\\pi r \\approx 18{,}85\\ \\mathrm{br}.'],
    ['sin B̂ = |AC|/|BC| = 3/5 = 0,6',
      '\\sin \\widehat{\\mathrm{B}} = |\\mathrm{A}\\mathrm{C}|/|\\mathrm{B}\\mathrm{C}| = 3/5 = 0{,}6'],
    ['|A͡C͡B| ≈ 14,14 br', '|\\overset{\\frown}{\\mathrm{A}\\mathrm{C}\\mathrm{B}}| \\approx 14{,}14\\ \\mathrm{br}'],
    ['[OH] ⊥ d, AB ∥ CD.',
      '[\\mathrm{O}\\mathrm{H}] \\perp d, \\mathrm{A}\\mathrm{B} \\parallel \\mathrm{C}\\mathrm{D}.'],
  ])('%s', (metin, beklenen) => expect(latex(metniCozumle(metin))).toBe(beklenen));

  it('latexDenetle ondalık virgülü ve dengesiz parantezi yakalar', () => {
    expect(latexDenetle('28,27')).toEqual(['matematik kipinde çıplak ondalık virgül']);
    expect(latexDenetle('28{,}27')).toEqual([]);
    expect(latexDenetle('\\text{Ç} = 5')).toEqual([]);
    expect(latexDenetle('Ç = 5')[0]).toContain('ASCII dışı');
    expect(latexDenetle('\\frac{1}{2')).toEqual(['süslü parantezler dengesiz']);
  });

  it('% & _ gibi karakterler \\text{} içinde kaçırılır', () => {
    expect(latex(metniCozumle('%50 oran'))).toBe('\\%50 \\text{oran}');
    expect(latexDenetle(latex(metniCozumle('a_b & c%')))).toEqual([]);
  });
});
