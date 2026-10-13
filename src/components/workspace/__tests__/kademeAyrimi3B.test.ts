import { describe, expect, it } from 'vitest';
import { cisimIzdusumuAnahtariVar, cisimIzdusumuVarsayilanAcik, kademe2BNesneleri3BdeGosterir } from '../kademeDuzeyleri3B';
import { KADEME_KIMLIKLERI } from '../kademeDuzeyleri';
import { cisimIzdusumuAcikMi, cisimIzdusumunuDegistir } from '../cisimIzdusumu';

/*
 * Uzman 4. tur [172], [175] (ortaokul): 2B ve 3B nesne kümeleri ayrı. Kural YALNIZ ortaokulda; ilkokul, lise ve
 * Tüm araçlar eskisi gibi (ortak model, izdüşüm açık).
 */
describe('Kademe: 2B - 3B ayrımı', () => {
  it('3B sahnede 2B nesneler yalnız ortaokulda gizli', () => {
    expect(kademe2BNesneleri3BdeGosterir('ortaokul')).toBe(false);
    for (const k of ['ilkokul', 'lise', 'tum'] as const) expect(kademe2BNesneleri3BdeGosterir(k), k).toBe(true);
  });
  it('2B tuvalde cisim izdüşümü ortaokulda kapalı açılır, ötekilerde açık', () => {
    expect(cisimIzdusumuVarsayilanAcik('ortaokul')).toBe(false);
    for (const k of ['ilkokul', 'lise', 'tum'] as const) expect(cisimIzdusumuVarsayilanAcik(k), k).toBe(true);
  });
  it('"3B cisimler" anahtarı ilkokul dışındaki her kademede; ilkokul arayüzü değişmez', () => {
    expect(cisimIzdusumuAnahtariVar('ilkokul')).toBe(false);
    for (const k of [...KADEME_KIMLIKLERI.filter((k) => k !== 'ilkokul'), 'tum'] as const) expect(cisimIzdusumuAnahtariVar(k), k).toBe(true);
  });
});

describe('"3B cisimler" anahtarının seçimi', () => {
  it('seçim yalnız yapıldığı kademede geçerli; kademe değişince varsayılana dönülür', () => {
    expect(cisimIzdusumuAcikMi('ortaokul')).toBe(false);
    cisimIzdusumunuDegistir('ortaokul');
    expect(cisimIzdusumuAcikMi('ortaokul')).toBe(true);
    expect(cisimIzdusumuAcikMi('lise')).toBe(true);
    cisimIzdusumunuDegistir('lise');
    expect(cisimIzdusumuAcikMi('lise')).toBe(false);
    // Ortaokuldaki seçim lise seçimiyle değiştiği için ortaokul yine varsayılanında (kapalı)
    expect(cisimIzdusumuAcikMi('ortaokul')).toBe(false);
  });
});
