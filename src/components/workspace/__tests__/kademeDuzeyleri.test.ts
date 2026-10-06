import { describe, expect, it } from 'vitest';
import { TOOL_GROUPS } from '../toolDefinitions';
import { TREE_TOOL_GROUPS } from '../treeToolDefinitions';
import {
  ACIK_GRUP_SINIRI,
  HER_KADEMEDE_ACIK_ARACLAR,
  KADEMELER,
  KADEME_DUZEYLERI,
  KADEME_KIMLIKLERI,
  aracGorunurMu,
  araclariSuz,
  gorunenAracSayisi,
  grupAcikliklari,
  gruplariSuz,
  kademeDuzeyiniCoz,
  kademeEtiketi,
  sinifinKademesi,
  type KademeDuzeyi,
} from '../kademeDuzeyleri';

/** Sol paneldeki (ağaç liste) araçlar, panel sırasıyla */
const PANEL_ARACLARI = TREE_TOOL_GROUPS.flatMap((g) => g.tools.map((t) => t.id as string));
/** Araç tanımları (komut kataloğu, imleç, kısayol listesi bunu kullanır) */
const TANIMLI_ARACLAR = new Set(TOOL_GROUPS.flatMap((g) => g.tools.map((t) => t.id as string)));
const EMOJI = /\p{Extended_Pictographic}/u;

const gorunenKimlikler = (duzey: KademeDuzeyi) =>
  gruplariSuz(TREE_TOOL_GROUPS, duzey).flatMap((g) => g.tools.map((t) => t.id as string));

/**
 * Raporun ilkokul menülerindeki araçlar (Dinamik Matematik Yazılımı İlkokul Raporu, 23.07.2026); alan uzmanlarının
 * güncellemesiyle (2. tur) çıkanlar UZMAN_ILKOKULDA_YOK listesindedir.
 */
const RAPOR_ILKOKUL = [
  'select', 'point', 'polygon', 'circle', 'pen', // Temel Araçlar (Geometri ve Ölçüm ekranı)
  'delete', // Düzenleme Araçları
  'measure_angle', 'measure_distance', 'ruler', 'setsquare', // Ölçme Araçları (+ açıölçer)
  'regular_polygon', // Çokgen Araçları
  'rotate', 'reflect', // Dönüşüm Araçları
  'fraction', // Kesir Araçları
  'image', 'text', // Medya Araçları
];
/**
 * Alan uzmanlarının (atölye inceleme, 2. tur) ilkokuldan çıkardığı araçlar: Doğru Parçası, Doğru, Işın (TYMM MAT.4.3.5:
 * "ışın, doğru ve doğru parçası gibi temel geometrik kavramlara girilmeden"), Sürgü ("Cebir ve Fonksiyon aracı ilkokul
 * için uygun değildir"), Alanı Bul (alan birim karelerle kaplanarak bulunur; hesap yok).
 */
const UZMAN_ILKOKULDA_YOK = ['segment', 'line', 'ray', 'slider', 'measure_area'];
/** Raporda "ilkokul seviyesinin üzerinde, yazılımda kullanılmayacak" denen Oluşturma (Construct) araçları */
const INSA_ARACLARI = ['midpoint', 'divide_ratio', 'perp_bisector', 'angle_bisector', 'perpendicular', 'parallel', 'compass', 'intersect'];

describe('kademe → araç eşlemesi', () => {
  it('eşlemedeki her araç kimliği araç kayıtlarında (panel ve araç tanımları) var', () => {
    for (const id of KADEME_KIMLIKLERI) {
      for (const arac of [...HER_KADEMEDE_ACIK_ARACLAR, ...KADEME_DUZEYLERI[id].araclar]) {
        expect(PANEL_ARACLARI, `${id}: ${arac}`).toContain(arac);
        expect(TANIMLI_ARACLAR.has(arac), `${id}: ${arac}`).toBe(true);
      }
    }
  });

  it('bir kademenin listesinde aynı araç iki kez geçmez; her kademede açık araçlar tekrar yazılmaz', () => {
    for (const id of KADEME_KIMLIKLERI) {
      const liste = KADEME_DUZEYLERI[id].araclar;
      expect(new Set(liste).size, id).toBe(liste.length);
      for (const ortak of HER_KADEMEDE_ACIK_ARACLAR) expect(liste, id).not.toContain(ortak);
    }
  });

  it('her kademe Seç ve Taşı ile Sil araçlarını panelde tutar', () => {
    for (const id of KADEME_KIMLIKLERI) {
      expect(aracGorunurMu(id, 'select'), id).toBe(true);
      expect(aracGorunurMu(id, 'delete'), id).toBe(true);
      const duzenleme = gruplariSuz(TREE_TOOL_GROUPS, id).find((g) => g.id === 'duzenleme');
      expect(duzenleme?.tools.map((t) => t.id), id).toEqual(['select', 'delete']);
    }
  });

  it('"Tüm araçlar" hiçbir aracı gizlemez', () => {
    expect(gorunenKimlikler('tum')).toEqual(PANEL_ARACLARI);
    expect(gruplariSuz(TREE_TOOL_GROUPS, 'tum')).toEqual(TREE_TOOL_GROUPS);
    for (const arac of [...PANEL_ARACLARI, 'pan', 'bilinmeyen']) expect(aracGorunurMu('tum', arac)).toBe(true);
    expect(gorunenAracSayisi(TREE_TOOL_GROUPS, 'tum')).toBe(PANEL_ARACLARI.length);
  });

  it('ilkokul: raporun menülerindeki bütün araçlar var, oluşturma ve cebir araçları yok', () => {
    const ilkokul = gorunenKimlikler('ilkokul');
    for (const arac of RAPOR_ILKOKUL) expect(ilkokul, arac).toContain(arac);
    for (const arac of [...INSA_ARACLARI, 'function', 'input_box', 'trig_ratios', 'measure_slope', 'circle_radius', 'circle_3points', 'arc', 'sector', 'ellipse', 'segment_length', 'translate', 'checkbox', 'button']) {
      expect(ilkokul, arac).not.toContain(arac);
    }
  });

  it('ilkokul: raporun gereksinim listesi (kare, dikdörtgen, çevre, simetri, birim kare) 1-4. sınıf kazanımlarından tamamlanır', () => {
    const ilkokul = gorunenKimlikler('ilkokul');
    for (const arac of ['square', 'rectangle', 'measure_perimeter', 'symmetry', 'area_model', 'unit_measure', 'angle']) {
      expect(ilkokul, arac).toContain(arac);
    }
  });

  it('ilkokul (alan uzmanları, 2. tur): doğru parçası, doğru, ışın, sürgü (Cebir ve Fonksiyon) ve Alanı Bul yok', () => {
    const ilkokul = gorunenKimlikler('ilkokul');
    for (const arac of UZMAN_ILKOKULDA_YOK) {
      expect(ilkokul, arac).not.toContain(arac);
      expect(aracGorunurMu('ilkokul', arac), arac).toBe(false);
    }
    expect(gruplariSuz(TREE_TOOL_GROUPS, 'ilkokul').some((g) => g.id === 'cebir_fonksiyon')).toBe(false);
    // Ortaokul ve lisede bu araçlar yerinde (uzman notu yalnız ilkokul içindir)
    for (const id of ['ortaokul', 'lise'] as const) {
      for (const arac of UZMAN_ILKOKULDA_YOK) expect(aracGorunurMu(id, arac), `${id}: ${arac}`).toBe(true);
    }
  });

  it('ortaokul: inşa araçları, doğrusal fonksiyon ve öteleme var; kalem, görsel, dönme ve trigonometri yok', () => {
    const ortaokul = gorunenKimlikler('ortaokul');
    // Oranda bölen nokta (divide_ratio) lisede başlar (MAT.9.5.4 Tales, MAT.10.5.1)
    const ortaokulInsa = INSA_ARACLARI.filter((a) => a !== 'divide_ratio');
    for (const arac of [...ortaokulInsa, 'function', 'slider', 'translate', 'reflect', 'measure_slope', 'sector', 'arc', 'fraction', 'ruler', 'area_model']) {
      expect(ortaokul, arac).toContain(arac);
    }
    for (const arac of ['pen', 'image', 'rotate', 'symmetry', 'trig_ratios', 'input_box', 'divide_ratio', 'circle_3points', 'ellipse']) {
      expect(ortaokul, arac).not.toContain(arac);
    }
  });

  it('lise: trigonometri, giriş kutusu, oranda bölme, üç noktadan çember ve dönme var; kalem, cetvel, birim kare, kesir, görsel yok', () => {
    const lise = gorunenKimlikler('lise');
    for (const arac of ['trig_ratios', 'input_box', 'divide_ratio', 'circle_3points', 'rotate', 'translate', 'reflect', 'function', 'slider', 'compass']) {
      expect(lise, arac).toContain(arac);
    }
    for (const arac of ['pen', 'ruler', 'area_model', 'fraction', 'image', 'ellipse', 'checkbox', 'button']) {
      expect(lise, arac).not.toContain(arac);
    }
  });

  it('her kademe paneli gerçekten daraltır ve kademeler yukarı doğru genişler', () => {
    const sayilar = KADEME_KIMLIKLERI.map((id) => gorunenKimlikler(id).length);
    for (const [i, id] of KADEME_KIMLIKLERI.entries()) expect(sayilar[i], id).toBeLessThan(PANEL_ARACLARI.length);
    expect(sayilar[0]).toBeLessThan(sayilar[1]);
    expect(sayilar[1]).toBeLessThan(sayilar[2]);
  });

  it('fonksiyon grafiği ortaokuldan (doğrusal fonksiyonlar) itibaren, kesir modeli ilkokul ve ortaokulda', () => {
    expect(KADEME_KIMLIKLERI.map((id) => aracGorunurMu(id, 'function'))).toEqual([false, true, true]);
    expect(KADEME_KIMLIKLERI.map((id) => aracGorunurMu(id, 'fraction'))).toEqual([true, true, false]);
    expect(KADEME_KIMLIKLERI.map((id) => aracGorunurMu(id, 'trig_ratios'))).toEqual([false, false, true]);
  });

  it('hiçbir kademeye girmeyen araçlar bilinçli bir seçimdir (yeni araç eklenince kademeleri kararlaştırılmalı)', () => {
    const herhangiKademede = new Set<string>(KADEME_KIMLIKLERI.flatMap((id) => gorunenKimlikler(id)));
    const disarida = PANEL_ARACLARI.filter((arac) => !herhangiKademede.has(arac)).sort();
    // Elips TYMM matematik programında yok; işaret kutusu ve düğme programdan bağımsız sayfa yapım araçları
    expect(disarida).toEqual(['button', 'checkbox', 'ellipse']);
  });

  it('kademeler ilkokul, ortaokul, lise sırasıyla ve 1-12. sınıfları kapsar', () => {
    expect(KADEMELER.map((k) => k.id)).toEqual(['ilkokul', 'ortaokul', 'lise']);
    expect(KADEMELER.map((k) => k.ad)).toEqual(['İlkokul', 'Ortaokul', 'Lise']);
    expect(KADEMELER.map((k) => k.siniflar)).toEqual(['1-4. sınıf', '5-8. sınıf', '9-12. sınıf']);
    for (let sinif = 1; sinif <= 12; sinif++) expect(sinifinKademesi(sinif)).toBe(KADEMELER[Math.ceil(sinif / 4) - 1].id);
    for (const sayi of [0, 13, -1, 2.5, Number.NaN]) expect(sinifinKademesi(sayi)).toBeNull();
  });

  it('etiketlerde ve konu özetlerinde emoji yok', () => {
    for (const kademe of KADEMELER) {
      expect(kademe.konular.trim().length, kademe.id).toBeGreaterThan(20);
      expect(kademe.konular, kademe.id).not.toMatch(EMOJI);
      expect(kademe.ad).not.toMatch(EMOJI);
      expect(kademeEtiketi(kademe.id)).toBe(kademe.ad);
    }
    expect(kademeEtiketi('tum')).toBe('Tüm araçlar');
  });
});

describe('gruplariSuz: araç paneli süzgeci', () => {
  it('ilkokulda boşalan gruplar (çember, inşa, etkileşim) düşer; grup sayacı süzülmüş araç sayısıdır', () => {
    const gruplar = gruplariSuz(TREE_TOOL_GROUPS, 'ilkokul');
    expect(gruplar.map((g) => g.id)).toEqual(['temel_cizim', 'duzenleme', 'olcme', 'cokgen', 'donusum', 'kesir_medya']);
    const sayac = Object.fromEntries(gruplar.map((g) => [g.id, g.tools.length]));
    expect(sayac).toEqual({ temel_cizim: 3, duzenleme: 2, olcme: 8, cokgen: 4, donusum: 3, kesir_medya: 3 });
  });

  it('araçların panel sırası korunur', () => {
    for (const id of KADEME_KIMLIKLERI) {
      const kimlikler = gorunenKimlikler(id);
      const siralar = kimlikler.map((k) => PANEL_ARACLARI.indexOf(k));
      expect(siralar, id).toEqual([...siralar].sort((a, b) => a - b));
    }
  });

  it('özgün araç tanımları değişmez (süzgeç kopyalar üzerinde çalışır)', () => {
    const once = TREE_TOOL_GROUPS.map((g) => g.tools.length);
    gruplariSuz(TREE_TOOL_GROUPS, 'ilkokul');
    gruplariSuz(TREE_TOOL_GROUPS, 'lise');
    expect(TREE_TOOL_GROUPS.map((g) => g.tools.length)).toEqual(once);
  });

  it('grup nesnesinin diğer alanları (ad, varsayılan açıklık) korunur', () => {
    const temel = gruplariSuz(TREE_TOOL_GROUPS, 'ortaokul').find((g) => g.id === 'temel_cizim');
    const ozgun = TREE_TOOL_GROUPS.find((g) => g.id === 'temel_cizim');
    expect(temel?.name).toBe(ozgun?.name);
    expect(temel?.defaultExpanded).toBe(ozgun?.defaultExpanded);
    // Aynı araç nesnesi (simge, açıklama) kullanılır
    expect(temel?.tools[0]).toBe(ozgun?.tools[0]);
  });

  it('araclariSuz düz listelerde de çalışır ve bilinmeyen kimlikleri kademede gizler', () => {
    const liste = [{ id: 'point' }, { id: 'compass' }, { id: 'select' }, { id: 'bilinmeyen' }];
    expect(araclariSuz(liste, 'ilkokul')).toEqual([{ id: 'point' }, { id: 'select' }]);
    expect(araclariSuz(liste, 'tum')).toEqual(liste);
    expect(araclariSuz(liste, 'tum')).not.toBe(liste);
  });

  it('görünen araç sayısı kademe listesi + her kademede açık araçlardır', () => {
    for (const id of KADEME_KIMLIKLERI) {
      expect(gorunenAracSayisi(TREE_TOOL_GROUPS, id), id).toBe(
        KADEME_DUZEYLERI[id].araclar.length + HER_KADEMEDE_ACIK_ARACLAR.length,
      );
    }
  });
});

describe('grupAcikliklari: kademe seçilince grupların açıklığı', () => {
  const varsayilan = Object.fromEntries(TREE_TOOL_GROUPS.map((g) => [g.id, g.defaultExpanded ?? true]));
  const hepsi = Object.fromEntries(TREE_TOOL_GROUPS.map((g) => [g.id, true]));

  it('"Tüm araçlar"da grupların kendi varsayılanı', () => {
    expect(grupAcikliklari(TREE_TOOL_GROUPS, 'tum')).toEqual(varsayilan);
  });

  it('ilkokulda bütün gruplar açık (tek bakışta), kalabalık kademelerde varsayılan', () => {
    for (const id of KADEME_KIMLIKLERI) {
      const hepsiAcik = gorunenAracSayisi(TREE_TOOL_GROUPS, id) <= ACIK_GRUP_SINIRI;
      expect(grupAcikliklari(TREE_TOOL_GROUPS, id), id).toEqual(hepsiAcik ? hepsi : varsayilan);
    }
    expect(grupAcikliklari(TREE_TOOL_GROUPS, 'ilkokul')).toEqual(hepsi);
    expect(grupAcikliklari(TREE_TOOL_GROUPS, 'lise')).toEqual(varsayilan);
  });
});

describe('kademeDuzeyiniCoz: saklanan değer', () => {
  it('geçerli değerleri tanır (büyük harf ve boşluklara aldırmaz)', () => {
    expect(kademeDuzeyiniCoz('tum')).toBe('tum');
    expect(kademeDuzeyiniCoz('ilkokul')).toBe('ilkokul');
    expect(kademeDuzeyiniCoz(' Ortaokul ')).toBe('ortaokul');
    expect(kademeDuzeyiniCoz('LİSE')).toBe('lise');
    expect(kademeDuzeyiniCoz('İlkokul')).toBe('ilkokul');
  });

  it('önceki sürümün sınıf numaralarını kademeye çevirir', () => {
    expect(kademeDuzeyiniCoz('1')).toBe('ilkokul');
    expect(kademeDuzeyiniCoz(' 4 ')).toBe('ilkokul');
    expect(kademeDuzeyiniCoz('5')).toBe('ortaokul');
    expect(kademeDuzeyiniCoz(8)).toBe('ortaokul');
    expect(kademeDuzeyiniCoz('9')).toBe('lise');
    expect(kademeDuzeyiniCoz(12)).toBe('lise');
  });

  it('tanınmayan her şey "Tüm araçlar"a düşer', () => {
    for (const ham of [null, undefined, '', '0', '13', '5.5', '-3', 'abc', 'Tüm araçlar', 'anaokulu', 3.5, Number.NaN, {}, [5], ['lise']]) {
      expect(kademeDuzeyiniCoz(ham), String(ham)).toBe('tum');
    }
  });
});
