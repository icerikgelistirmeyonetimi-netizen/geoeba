import { describe, expect, it } from 'vitest';
import { cisimIzdusumuAnahtariVar, cisimIzdusumuVarsayilanAcik, gizliSecimBirakilir, kademe2BNesneleri3BdeGosterir } from '../kademeDuzeyleri3B';
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

describe('görünmeyen kümenin seçimi yalnız geçişte bırakılır (denetim, 4. tur S3)', () => {
  const etkinGizli = { etkin: true, gizli: true };
  it('tuval kurulurken ya da etkin boyut bu tuvale geçerken: seçim varsa bırakılır', () => {
    // 2B'de Ctrl+A → 3B'ye geç (3B tuvali yeni kuruluyor ya da etkin boyut 2D → 3D)
    expect(gizliSecimBirakilir(null, etkinGizli, true)).toBe(true);
    expect(gizliSecimBirakilir({ etkin: false, gizli: true }, etkinGizli, true)).toBe(true);
    // İzdüşüm anahtarı kapatılınca (2B tuval) ya da kademe ortaokula dönünce (3B tuval)
    expect(gizliSecimBirakilir({ etkin: true, gizli: false }, etkinGizli, true)).toBe(true);
    // Seçim yoksa yapılacak iş yok
    expect(gizliSecimBirakilir(null, etkinGizli, false)).toBe(false);
  });
  it('durum aynı kaldıkça dokunulmaz: 2D + 3D çift görünümde öteki paneldeki ilk tıklamanın seçimi korunur', () => {
    // 3B panel etkin (etkin boyut 3D) → 2B paneldeki noktaya basış seçimi kurar; etkin boyut tıklamanın sonunda 2D olur
    expect(gizliSecimBirakilir(etkinGizli, etkinGizli, true)).toBe(false);
  });
  it('küme görünürken (ilkokul, lise, Tüm araçlar; izdüşüm açık) ya da tuval etkin değilken hiç bırakılmaz', () => {
    expect(gizliSecimBirakilir(null, { etkin: true, gizli: false }, true)).toBe(false);
    expect(gizliSecimBirakilir({ etkin: true, gizli: true }, { etkin: false, gizli: true }, true)).toBe(false);
    expect(gizliSecimBirakilir(null, { etkin: false, gizli: false }, true)).toBe(false);
  });
});
