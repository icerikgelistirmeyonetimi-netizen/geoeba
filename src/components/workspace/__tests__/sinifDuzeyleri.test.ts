import { describe, expect, it } from 'vitest';
import { TOOL_GROUPS } from '../toolDefinitions';
import { TREE_TOOL_GROUPS } from '../treeToolDefinitions';
import {
  ACIK_GRUP_SINIRI,
  HER_SINIFTA_ACIK_ARACLAR,
  KADEMELER,
  SINIF_DUZEYLERI,
  SINIF_NUMARALARI,
  aracGorunurMu,
  araclariSuz,
  gorunenAracSayisi,
  grupAcikliklari,
  gruplariSuz,
  sinifDuzeyiniCoz,
  sinifEtiketi,
  type SinifNo,
} from '../sinifDuzeyleri';

/** Sol paneldeki (ağaç liste) araçlar, panel sırasıyla */
const PANEL_ARACLARI = TREE_TOOL_GROUPS.flatMap((g) => g.tools.map((t) => t.id as string));
/** Araç tanımları (komut kataloğu, imleç, kısayol listesi bunu kullanır) */
const TANIMLI_ARACLAR = new Set(TOOL_GROUPS.flatMap((g) => g.tools.map((t) => t.id as string)));
const EMOJI = /\p{Extended_Pictographic}/u;

const gorunenKimlikler = (duzey: SinifNo | 'tum') =>
  gruplariSuz(TREE_TOOL_GROUPS, duzey).flatMap((g) => g.tools.map((t) => t.id as string));

describe('sınıf → araç eşlemesi', () => {
  it('eşlemedeki her araç kimliği araç kayıtlarında (panel ve araç tanımları) var', () => {
    for (const no of SINIF_NUMARALARI) {
      for (const arac of [...HER_SINIFTA_ACIK_ARACLAR, ...SINIF_DUZEYLERI[no].araclar]) {
        expect(PANEL_ARACLARI, `${no}. sınıf: ${arac}`).toContain(arac);
        expect(TANIMLI_ARACLAR.has(arac), `${no}. sınıf: ${arac}`).toBe(true);
      }
    }
  });

  it('bir sınıfın listesinde aynı araç iki kez geçmez; her sınıfta açık araçlar tekrar yazılmaz', () => {
    for (const no of SINIF_NUMARALARI) {
      const liste = SINIF_DUZEYLERI[no].araclar;
      expect(new Set(liste).size, `${no}. sınıf`).toBe(liste.length);
      for (const ortak of HER_SINIFTA_ACIK_ARACLAR) expect(liste, `${no}. sınıf`).not.toContain(ortak);
    }
  });

  it('her sınıf Seç ve Taşı ile Sil araçlarını panelde tutar', () => {
    for (const no of SINIF_NUMARALARI) {
      expect(aracGorunurMu(no, 'select'), `${no}. sınıf`).toBe(true);
      expect(aracGorunurMu(no, 'delete'), `${no}. sınıf`).toBe(true);
      const duzenleme = gruplariSuz(TREE_TOOL_GROUPS, no).find((g) => g.id === 'duzenleme');
      expect(duzenleme?.tools.map((t) => t.id), `${no}. sınıf`).toEqual(['select', 'delete']);
    }
  });

  it('"Tüm araçlar" hiçbir aracı gizlemez', () => {
    expect(gorunenKimlikler('tum')).toEqual(PANEL_ARACLARI);
    expect(gruplariSuz(TREE_TOOL_GROUPS, 'tum')).toEqual(TREE_TOOL_GROUPS);
    for (const arac of [...PANEL_ARACLARI, 'pan', 'bilinmeyen']) expect(aracGorunurMu('tum', arac)).toBe(true);
    expect(gorunenAracSayisi(TREE_TOOL_GROUPS, 'tum')).toBe(PANEL_ARACLARI.length);
  });

  it('1. sınıf küçüktür: nokta ve çember var, ileri düzey araçlar yok', () => {
    const birinci = gorunenKimlikler(1);
    expect(birinci.length).toBeLessThanOrEqual(12);
    expect(birinci).toEqual(expect.arrayContaining(['point', 'circle', 'select', 'delete']));
    for (const ileri of ['line', 'compass', 'measure_angle', 'function', 'slider', 'trig_ratios', 'intersect', 'reflect']) {
      expect(birinci, ileri).not.toContain(ileri);
    }
  });

  it('her sınıf paneli gerçekten daraltır', () => {
    for (const no of SINIF_NUMARALARI) {
      expect(gorunenKimlikler(no).length, `${no}. sınıf`).toBeLessThan(PANEL_ARACLARI.length);
    }
  });

  it('fonksiyon grafiği 8. sınıftan (doğrusal fonksiyonlar) itibaren açılır', () => {
    for (const no of SINIF_NUMARALARI) {
      expect(aracGorunurMu(no, 'function'), `${no}. sınıf`).toBe(no >= 8);
    }
  });

  it('kesir modeli 2-6. sınıflarda, trigonometrik oranlar 10-12. sınıflarda', () => {
    for (const no of SINIF_NUMARALARI) {
      expect(aracGorunurMu(no, 'fraction'), `${no}. sınıf kesir`).toBe(no >= 2 && no <= 6);
      expect(aracGorunurMu(no, 'trig_ratios'), `${no}. sınıf trig`).toBe(no >= 10);
    }
  });

  it('hiçbir sınıfa girmeyen araçlar bilinçli bir seçimdir (yeni araç eklenince sınıfları kararlaştırılmalı)', () => {
    const herhangiSinifta = new Set<string>(SINIF_NUMARALARI.flatMap((no) => gorunenKimlikler(no)));
    const disarida = PANEL_ARACLARI.filter((arac) => !herhangiSinifta.has(arac)).sort();
    // Elips TYMM matematik programında yok; işaret kutusu ve düğme kazanımdan bağımsız sayfa yapım araçları
    expect(disarida).toEqual(['button', 'checkbox', 'ellipse']);
  });

  it('kademeler 1-12. sınıfları sırayla ve birer kez kapsar', () => {
    expect(KADEMELER.map((k) => k.ad)).toEqual(['İlkokul', 'Ortaokul', 'Lise']);
    expect(KADEMELER.flatMap((k) => k.siniflar)).toEqual([...SINIF_NUMARALARI]);
  });

  it('etiketlerde ve konu özetlerinde emoji yok', () => {
    for (const no of SINIF_NUMARALARI) {
      expect(SINIF_DUZEYLERI[no].konular.trim().length, `${no}. sınıf`).toBeGreaterThan(20);
      expect(SINIF_DUZEYLERI[no].konular, `${no}. sınıf`).not.toMatch(EMOJI);
      expect(sinifEtiketi(no)).not.toMatch(EMOJI);
    }
    for (const kademe of KADEMELER) expect(kademe.ad).not.toMatch(EMOJI);
  });
});

describe('gruplariSuz: araç paneli süzgeci', () => {
  it('boşalan gruplar düşer; grup sayacı süzülmüş araç sayısıdır', () => {
    const gruplar = gruplariSuz(TREE_TOOL_GROUPS, 1);
    expect(gruplar.map((g) => g.id)).toEqual(['temel_cizim', 'duzenleme', 'olcme', 'cokgen', 'kesir_medya']);
    const sayac = Object.fromEntries(gruplar.map((g) => [g.id, g.tools.length]));
    expect(sayac).toEqual({ temel_cizim: 3, duzenleme: 2, olcme: 1, cokgen: 3, kesir_medya: 2 });
  });

  it('araçların panel sırası korunur', () => {
    for (const no of SINIF_NUMARALARI) {
      const kimlikler = gorunenKimlikler(no);
      const siralar = kimlikler.map((k) => PANEL_ARACLARI.indexOf(k));
      expect(siralar, `${no}. sınıf`).toEqual([...siralar].sort((a, b) => a - b));
    }
  });

  it('özgün araç tanımları değişmez (süzgeç kopyalar üzerinde çalışır)', () => {
    const once = TREE_TOOL_GROUPS.map((g) => g.tools.length);
    gruplariSuz(TREE_TOOL_GROUPS, 3);
    gruplariSuz(TREE_TOOL_GROUPS, 12);
    expect(TREE_TOOL_GROUPS.map((g) => g.tools.length)).toEqual(once);
  });

  it('grup nesnesinin diğer alanları (ad, varsayılan açıklık) korunur', () => {
    const temel = gruplariSuz(TREE_TOOL_GROUPS, 5).find((g) => g.id === 'temel_cizim');
    const ozgun = TREE_TOOL_GROUPS.find((g) => g.id === 'temel_cizim');
    expect(temel?.name).toBe(ozgun?.name);
    expect(temel?.defaultExpanded).toBe(ozgun?.defaultExpanded);
    // Aynı araç nesnesi (simge, açıklama) kullanılır
    expect(temel?.tools[0]).toBe(ozgun?.tools[0]);
  });

  it('araclariSuz düz listelerde de çalışır ve bilinmeyen kimlikleri sınıfta gizler', () => {
    const liste = [{ id: 'point' }, { id: 'compass' }, { id: 'select' }, { id: 'bilinmeyen' }];
    expect(araclariSuz(liste, 1)).toEqual([{ id: 'point' }, { id: 'select' }]);
    expect(araclariSuz(liste, 'tum')).toEqual(liste);
    expect(araclariSuz(liste, 'tum')).not.toBe(liste);
  });

  it('görünen araç sayısı sınıf listesi + her sınıfta açık araçlardır', () => {
    for (const no of SINIF_NUMARALARI) {
      expect(gorunenAracSayisi(TREE_TOOL_GROUPS, no), `${no}. sınıf`).toBe(
        SINIF_DUZEYLERI[no].araclar.length + HER_SINIFTA_ACIK_ARACLAR.length
      );
    }
  });
});

describe('grupAcikliklari: sınıf seçilince grupların açıklığı', () => {
  const varsayilan = Object.fromEntries(TREE_TOOL_GROUPS.map((g) => [g.id, g.defaultExpanded ?? true]));

  it('"Tüm araçlar"da grupların kendi varsayılanı', () => {
    expect(grupAcikliklari(TREE_TOOL_GROUPS, 'tum')).toEqual(varsayilan);
  });

  it('az araçlı sınıfta bütün gruplar açık, kalabalık sınıfta varsayılan', () => {
    for (const no of SINIF_NUMARALARI) {
      const hepsiAcik = gorunenAracSayisi(TREE_TOOL_GROUPS, no) <= ACIK_GRUP_SINIRI;
      const aciklik = grupAcikliklari(TREE_TOOL_GROUPS, no);
      expect(aciklik, `${no}. sınıf`).toEqual(
        hepsiAcik ? Object.fromEntries(TREE_TOOL_GROUPS.map((g) => [g.id, true])) : varsayilan
      );
    }
    // 1. sınıf her durumda tek bakışta görünür
    expect(Object.values(grupAcikliklari(TREE_TOOL_GROUPS, 1)).every(Boolean)).toBe(true);
  });
});

describe('sinifDuzeyiniCoz: saklanan değer', () => {
  it('geçerli değerleri tanır', () => {
    expect(sinifDuzeyiniCoz('tum')).toBe('tum');
    expect(sinifDuzeyiniCoz('5')).toBe(5);
    expect(sinifDuzeyiniCoz(' 12 ')).toBe(12);
    expect(sinifDuzeyiniCoz(1)).toBe(1);
  });

  it('tanınmayan her şey "Tüm araçlar"a düşer', () => {
    for (const ham of [null, undefined, '', '0', '13', '5.5', '-3', 'abc', 'Tüm araçlar', 3.5, Number.NaN, {}, [5]]) {
      expect(sinifDuzeyiniCoz(ham), String(ham)).toBe('tum');
    }
  });

  it('etiketler', () => {
    expect(sinifEtiketi('tum')).toBe('Tüm araçlar');
    expect(sinifEtiketi(5)).toBe('5. sınıf');
    expect(sinifEtiketi(12)).toBe('12. sınıf');
  });
});
