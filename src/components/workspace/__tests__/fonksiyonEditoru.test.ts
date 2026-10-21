import { describe, expect, it } from 'vitest';
import { compileMathExpression, validateMathExpression } from '@/math/parser';
import { ifadedenGeriSil, ifadeyeMetinEkle, ifadeyeSablonEkle, type IfadeDuzenleme } from '../fonksiyonEditoru';

const doldur = (sonuc: ReturnType<typeof ifadeyeSablonEkle>, metin: string) =>
  sonuc.ifade.slice(0, sonuc.bas) + metin + sonuc.ifade.slice(sonuc.son);

const hesapla = (ifade: string, x: number) => {
  expect(validateMathExpression(ifade).ok).toBe(true);
  const fonksiyon = compileMathExpression(ifade);
  expect(fonksiyon).not.toBeNull();
  return fonksiyon!(x);
};

describe('fonksiyon editörü şablonları', () => {
  it('karekökü imleçte açar ve girişten sonra çevredeki ifadeyi korur', () => {
    const sonuc = ifadeyeSablonEkle('2* + 1', 2, 2, 'karekok');
    expect(sonuc).toEqual({ ifade: '2*sqrt() + 1', bas: 7, son: 7 });
    expect(hesapla(doldur(sonuc, 'x'), 9)).toBe(7);
  });

  it.each([
    ['karekok', 'sqrt(x+1)', 8, 3],
    ['kupkok', 'cbrt(x+1)', -9, -2],
    ['mutlak', 'abs(x+1)', -4, 3],
    ['parantez', '(x+1)', 2, 3],
  ] as const)('%s seçilen ifadenin tamamını korur', (eylem, beklenen, x, deger) => {
    const sonuc = ifadeyeSablonEkle('x+1', 0, 3, eylem);
    expect(sonuc.ifade).toBe(beklenen);
    expect(sonuc.bas).toBe(beklenen.length);
    expect(sonuc.son).toBe(sonuc.bas);
    expect(hesapla(sonuc.ifade, x)).toBeCloseTo(deger);
  });

  it('seçili toplamın karesinde işlem önceliğini korur', () => {
    const sonuc = ifadeyeSablonEkle('3*x+1-4', 2, 5, 'kare');
    expect(sonuc.ifade).toBe('3*(x+1)^2-4');
    expect(hesapla(sonuc.ifade, 2)).toBe(23);
  });

  it('seçili toplamın üssünü doldurulacak alana yerleştirir', () => {
    const sonuc = ifadeyeSablonEkle('x+1', 0, 3, 'us');
    expect(sonuc).toEqual({ ifade: '(x+1)^()', bas: 7, son: 7 });
    expect(hesapla(doldur(sonuc, '3'), 2)).toBe(27);
  });

  it('seçili payı korur ve kesrin paydasına yazar', () => {
    const sonuc = ifadeyeSablonEkle('x+1', 0, 3, 'kesir');
    expect(sonuc).toEqual({ ifade: '(x+1)/()', bas: 7, son: 7 });
    expect(hesapla(doldur(sonuc, 'x+2'), 2)).toBeCloseTo(0.75);
  });

  it('boş kesirde önce payın doldurulmasını sağlar', () => {
    const sonuc = ifadeyeSablonEkle('', 0, 0, 'kesir');
    expect(sonuc).toEqual({ ifade: '()/()', bas: 1, son: 1 });
    expect(doldur(sonuc, 'x+1')).toBe('(x+1)/()');
  });

  it('dereceli kökte seçili ifadeyi korur ve derecenin hemen değiştirilmesini sağlar', () => {
    const sonuc = ifadeyeSablonEkle('2*(x+1)', 3, 6, 'kok');
    expect(sonuc).toEqual({ ifade: '2*(root(x+1,2))', bas: 12, son: 13 });
    expect(doldur(sonuc, '3')).toBe('2*(root(x+1,3))');
  });

  it('seçim yoksa x kökünü oluşturur ve dereceyi seçer', () => {
    const sonuc = ifadeyeSablonEkle('', 0, 0, 'kok');
    expect(sonuc).toEqual({ ifade: 'root(x,2)', bas: 7, son: 8 });
    expect(doldur(sonuc, '5')).toBe('root(x,5)');
  });

  it('Türkçe ondalık virgülünü kökün argüman ayırıcısıyla karıştırmaz', () => {
    const sonuc = ifadeyeSablonEkle('0,125', 0, 5, 'kok');
    expect(sonuc).toEqual({ ifade: 'root(0,125;2)', bas: 11, son: 12 });
    expect(sonuc.ifade.slice(sonuc.bas, sonuc.son)).toBe('2');
    expect(hesapla(sonuc.ifade, 0)).toBeCloseTo(Math.sqrt(0.125));
    expect(hesapla(doldur(sonuc, '3'), 0)).toBeCloseTo(0.5);
  });

  it('iç içe dereceli kökte virgüllü iç çağrıyı korur', () => {
    const sonuc = ifadeyeSablonEkle('root(x,3)', 0, 9, 'kok');
    expect(sonuc.ifade).toBe('root(root(x,3);2)');
    expect(sonuc.ifade.slice(sonuc.bas, sonuc.son)).toBe('2');
    expect(hesapla(sonuc.ifade, 64)).toBeCloseTo(2);
  });

  it.each(['', '2 + ', '('])('işlenen yoksa %s ardından taban alanını açar', (ifade) => {
    const kare = ifadeyeSablonEkle(ifade, ifade.length, ifade.length, 'kare');
    const us = ifadeyeSablonEkle(ifade, ifade.length, ifade.length, 'us');
    expect(doldur(kare, 'x')).toBe(`${ifade}(x)^2`);
    expect(doldur(us, 'x')).toBe(`${ifade}(x)^()`);
  });

  it.each([
    ['x', 16, 64], ['3', 9, 27], ['(x+1)', 25, 125], ['sqrt(x)', 4, 8], ['|x|', 16, 64], ['x ', 16, 64],
  ] as const)('işlenen varsa %s sonuna üs ekler', (ifade, kareSonucu, usSonucu) => {
    const kare = ifadeyeSablonEkle(ifade, ifade.length, ifade.length, 'kare');
    const us = ifadeyeSablonEkle(ifade, ifade.length, ifade.length, 'us');
    expect(kare.ifade).toBe(`${ifade}^2`);
    expect(doldur(us, '3')).toBe(`${ifade}^(3)`);
    expect(hesapla(kare.ifade, 4)).toBeCloseTo(kareSonucu);
    expect(hesapla(doldur(us, '3'), 4)).toBeCloseTo(usSonucu);
  });

  it.each([
    ['sin', 0, 0], ['cos', 0, 1], ['tan', 0, 0], ['ln', Math.E, 1], ['log', 100, 2],
  ] as const)('%s düğmesinin ürettiği ifade ayrıştırıcı tarafından hesaplanır', (eylem, x, deger) => {
    const sonuc = ifadeyeSablonEkle('x', 0, 1, eylem);
    expect(hesapla(sonuc.ifade, x)).toBeCloseTo(deger);
  });

  it.each(['cot', 'sind', 'cosd', 'tand', 'cotd', 'asin', 'acos', 'atan'] as const)(
    '%s seçili ifadeyi korur; boş girişte imleci parantez içine yerleştirir', (eylem) => {
      const secili = ifadeyeSablonEkle('2*x+1', 2, 5, eylem);
      expect(secili.ifade).toBe(`2*${eylem}(x+1)`);
      expect(secili.bas).toBe(secili.ifade.length);
      const bos = ifadeyeSablonEkle('', 0, 0, eylem);
      expect(doldur(bos, 'x')).toBe(`${eylem}(x)`);
    }
  );

  it.each([
    ['x', 'x'], ['pi', 'pi'], ['e', 'e'], ['arti', '+'], ['eksi', '-'], ['carpi', '*'], ['bolu', '/'],
  ] satisfies [IfadeDuzenleme, string][])('%s seçili aralığın yerine eklenir', (eylem, metin) => {
    expect(ifadeyeSablonEkle('2abc3', 1, 4, eylem)).toEqual({
      ifade: `2${metin}3`, bas: 1 + metin.length, son: 1 + metin.length,
    });
  });

  it('Euler sabitini ve e tabanlı üstel fonksiyonu hesaplar', () => {
    const sabit = ifadeyeSablonEkle('', 0, 0, 'e');
    expect(hesapla(sabit.ifade, 0)).toBeCloseTo(Math.E);
    const us = ifadeyeSablonEkle(sabit.ifade, sabit.bas, sabit.son, 'us');
    const fonksiyon = doldur(us, 'x');
    expect(fonksiyon).toBe('e^(x)');
    expect(hesapla(fonksiyon, 2)).toBeCloseTo(Math.E ** 2);
  });

  it('geçersiz seçim sınırlarını metne sınırlar ve ters aralığı normalleştirir', () => {
    expect(ifadeyeSablonEkle('x+1', -50, 50, 'kare').ifade).toBe('(x+1)^2');
    expect(ifadeyeSablonEkle('x+1', 3, 0, 'kare').ifade).toBe('(x+1)^2');
    expect(ifadeyeSablonEkle('x', Infinity, Infinity, 'arti')).toEqual({ ifade: 'x+', bas: 2, son: 2 });
    expect(ifadeyeSablonEkle('x', NaN, NaN, 'parantez')).toEqual({ ifade: '()x', bas: 1, son: 1 });
  });
});

describe('fonksiyon editöründe metin ve geri silme', () => {
  it('rakam ve ondalık noktasını imleçte ekler', () => {
    let sonuc = ifadeyeMetinEkle('x+', 2, 2, '1');
    sonuc = ifadeyeMetinEkle(sonuc.ifade, sonuc.bas, sonuc.son, '.');
    sonuc = ifadeyeMetinEkle(sonuc.ifade, sonuc.bas, sonuc.son, '5');
    expect(sonuc).toEqual({ ifade: 'x+1.5', bas: 5, son: 5 });
    expect(hesapla(sonuc.ifade, 2)).toBe(3.5);
  });

  it('seçili metni değiştirir, metnin kalanını korur', () => {
    expect(ifadeyeMetinEkle('2*x+1', 2, 3, 'sqrt(x)')).toEqual({ ifade: '2*sqrt(x)+1', bas: 9, son: 9 });
  });

  it('metin eklerken ters ve metin dışı seçim sınırlarını düzeltir', () => {
    expect(ifadeyeMetinEkle('x+1', 3, 0, '2')).toEqual({ ifade: '2', bas: 1, son: 1 });
    expect(ifadeyeMetinEkle('x', -20, 20, 'pi')).toEqual({ ifade: 'pi', bas: 2, son: 2 });
    expect(ifadeyeMetinEkle('x', Infinity, Infinity, '2')).toEqual({ ifade: 'x2', bas: 2, son: 2 });
  });

  it('geri silmede yalnız imlecin solundaki karakteri kaldırır', () => {
    expect(ifadedenGeriSil('x+12', 3, 3)).toEqual({ ifade: 'x+2', bas: 2, son: 2 });
  });

  it('geri silmede seçili aralığı kaldırır', () => {
    expect(ifadedenGeriSil('2*(x+1)', 3, 6)).toEqual({ ifade: '2*()', bas: 3, son: 3 });
    expect(ifadedenGeriSil('2*(x+1)', 6, 3)).toEqual({ ifade: '2*()', bas: 3, son: 3 });
  });

  it('geri silme başlangıçta ve boş ifadede metni değiştirmez', () => {
    expect(ifadedenGeriSil('x+1', 0, 0)).toEqual({ ifade: 'x+1', bas: 0, son: 0 });
    expect(ifadedenGeriSil('', 5, 5)).toEqual({ ifade: '', bas: 0, son: 0 });
  });

  it('geri silmede metin dışı seçim sınırları veri taşmasına yol açmaz', () => {
    expect(ifadedenGeriSil('x+1', -5, 50)).toEqual({ ifade: '', bas: 0, son: 0 });
    expect(ifadedenGeriSil('x+1', 50, 50)).toEqual({ ifade: 'x+', bas: 2, son: 2 });
  });
});
