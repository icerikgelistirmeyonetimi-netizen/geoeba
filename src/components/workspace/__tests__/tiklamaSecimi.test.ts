import { describe, expect, it } from 'vitest';
import { clickSelection } from '../contextMenuSelection';

describe('clickSelection (Seç ve Taşı ile nesneye tıklama)', () => {
  it('Shift/Ctrl: seçili değilse sona eklenir, seçiliyse çıkarılır; her zaman yeni dizi', () => {
    const secim = ['a', 'b'];
    const eklendi = clickSelection(secim, 'c', true);
    expect(eklendi).toEqual(['a', 'b', 'c']);
    const cikti = clickSelection(secim, 'a', true);
    expect(cikti).toEqual(['b']);
    expect(cikti).not.toBe(secim);
  });

  it('düz tıklama: zaten seçiliyse aynı dizi (seçimin tamamı sürüklenir), değilse yalnız tıklanan', () => {
    const secim = ['a', 'b'];
    expect(clickSelection(secim, 'b', false)).toBe(secim);
    expect(clickSelection(secim, 'c', false)).toEqual(['c']);
    expect(clickSelection([], 'c', false)).toEqual(['c']);
  });
});
