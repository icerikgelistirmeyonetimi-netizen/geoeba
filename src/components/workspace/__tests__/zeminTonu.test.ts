import { describe, expect, it } from 'vitest';
import { temaZemini, zeminTonu } from '../zeminTonu';

describe('temaZemini: koyu temada koordinat sistemi koyu kalır', () => {
  it('açık temada seçilen renk olduğu gibi', () => {
    expect(temaZemini('#fef3c7', false)).toBe('#fef3c7');
    expect(temaZemini(undefined, false)).toBeUndefined();
  });
  it('koyu temada beyaz ya da seçim yoksa temanın zemini', () => {
    expect(temaZemini('#ffffff', true)).toBeUndefined();
    expect(temaZemini(undefined, true)).toBeUndefined();
  });
  it('koyu temada pastel renkler koyu bir tona dönüşür (zemin koyu sayılır)', () => {
    for (const renk of ['#fef3c7', '#f3e8ff', '#e0f2fe', '#e6f4ea', '#ffedd5', '#ffe4e6']) {
      const t = temaZemini(renk, true)!;
      expect(t).toMatch(/^#[0-9a-f]{6}$/);
      expect(zeminTonu(t)).toBe('koyu');
    }
  });
  it('koyu temada zaten koyu seçilmiş renk korunur', () => {
    expect(temaZemini('#15302d', true)).toBe('#15302d');
  });
});

describe('zeminTonu: tuval zemininin açık/koyu olması', () => {
  it.each(['#ffffff', '#f3e8ff', '#e0f2fe', '#e6f4ea', '#fef3c7', '#ffedd5', '#ffe4e6', '#fff', 'white', 'rgb(254, 243, 199)'])(
    'menüdeki açık zeminler açık sayılır: %s',
    (renk) => expect(zeminTonu(renk)).toBe('acik')
  );
  it.each(['#15302d', '#0f4c57', '#000', 'black', 'rgb(21, 48, 45)', '#1e293b'])('koyu zeminler koyu sayılır: %s', (renk) =>
    expect(zeminTonu(renk)).toBe('koyu')
  );
  it.each([undefined, null, '', 'transparent', '#ffffff00', 'rgba(0,0,0,0)', 'kırmızımsı'])(
    'özel zemin yoksa ya da okunamıyorsa uygulamanın teması geçerli: %s',
    (renk) => expect(zeminTonu(renk)).toBeNull()
  );
});
