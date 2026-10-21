import { describe, expect, it } from 'vitest';
import { fonksiyonEtiketiYazimi, ifadeYazimi } from '../fonksiyonYazimi';

describe('Dereceli köklerin okunur yazımı', () => {
  it.each([
    ['root(x,3)', '³√x'],
    ['root(8,3)', '³√8'],
    ['root(0,125;3)', '³√0,125'],
    ['root(0.125,3)', '³√0,125'],
    ['root((0,125),3)', '³√((0,125))'],
    ['root(x+1,4)', '⁴√(x + 1)'],
    ['root(-8,3)', '³√(−8)'],
    ['root(x,12)', '¹²√x'],
    ['root(x,2)', '√x'],
    ['root(root(x,3),2)', '√(³√x)'],
    ['root(x,-3)', 'root(x; −3)'],
    ['root(x,1+2)', 'root(x; 1 + 2)'],
    ['root(x,n)', 'root(x; n)'],
    ['root(x,0)', 'root(x; 0)'],
    ['root(x;2,5)', 'root(x; 2,5)'],
    ['cbrt(x)', '³√x'],
    ['cbrt(x+1)', '³√(x + 1)'],
    ['kupkok(-8)', '³√(−8)'],
    ['kok(x)', '√x'],
    ['cot(x)+cotd(x)', 'cot(x) + cotd(x)'],
    ['0,5*x + root(8,3)', '0,5x + ³√8'],
    ['sqrt(0,125)', '√0,125'],
    ['root(x,3)^2', '(³√x)²'],
    ['2root(8,3)', '2·³√8'],
    ['2*root(8,3)', '2·³√8'],
    ['1e3root(8,3)', '1·10³·³√8'],
    ['2e-3root(8,3)', '2·10⁻³·³√8'],
    ['2cbrt(x)', '2·³√x'],
    ['2*cbrt(x)', '2·³√x'],
  ])('%s → %s', (ifade, sonuc) => {
    expect(ifadeYazimi(ifade)).toBe(sonuc);
  });

  it('grafik etiketi ve fonksiyon adı korunur', () => {
    expect(fonksiyonEtiketiYazimi({ label: 'f(x) = root(x,5)', expression: 'root(x,5)' })).toBe('f(x) = ⁵√x');
  });
});
