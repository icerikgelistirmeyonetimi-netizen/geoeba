// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { yapisma3BAcikMi, yapisma3BDegistir, yapisma3BTercihiniSifirla } from '../yapisma3BDurumu';

/* YAP3B: Mıknatıs seçimi yalnız yapıldığı kademede geçerli (cisimIzdusumu.ts kalıbı); proje dosyasına girmez. */
describe('3B Mıknatıs tercihi', () => {
  afterEach(() => yapisma3BTercihiniSifirla());

  it('açılışta her kademede açık', () => {
    for (const k of ['ilkokul', 'ortaokul', 'lise', 'tum'] as const) expect(yapisma3BAcikMi(k), k).toBe(true);
  });

  it('değiştir o kademede tersine çevirir; başka kademe varsayılanda; dönünce seçim yerinde', () => {
    yapisma3BDegistir('ortaokul');
    expect(yapisma3BAcikMi('ortaokul')).toBe(false);
    expect(yapisma3BAcikMi('ilkokul')).toBe(true);
    expect(yapisma3BAcikMi('ortaokul')).toBe(false);
    yapisma3BDegistir('ortaokul');
    expect(yapisma3BAcikMi('ortaokul')).toBe(true);
  });

  it('başka kademede değiştirmek öncekinin seçimini varsayılana döndürür; sıfırla tercihi siler', () => {
    yapisma3BDegistir('ortaokul');
    yapisma3BDegistir('ilkokul');
    expect(yapisma3BAcikMi('ilkokul')).toBe(false);
    expect(yapisma3BAcikMi('ortaokul')).toBe(true);
    yapisma3BTercihiniSifirla();
    expect(yapisma3BAcikMi('ilkokul')).toBe(true);
  });

  it('verilen tercih nesnesiyle de okunur (useSyncExternalStore anlık görüntüsü)', () => {
    expect(yapisma3BAcikMi('lise', { kademe: 'lise', acik: false })).toBe(false);
    expect(yapisma3BAcikMi('tum', { kademe: 'lise', acik: false })).toBe(true);
    expect(yapisma3BAcikMi('tum', null)).toBe(true);
  });
});
