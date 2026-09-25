import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SahneGrubu } from '../adaSahnesi';
import { ATOLYE, KADEME_ADALARI } from '../adaEslemeleri';

/**
 * Blender'dan dışa aktarılan ana sayfa verisi (public/adalar/data/ana-sayfa.json) ile
 * uygulamanın eşlemeleri tutarlı olmalı: her kademe adası ve atölye sahnede olmalı,
 * önlerindeki 3B tabelaların yazısı beklenen olmalı.
 */
const VERI_YOLU = path.resolve(__dirname, '../../../../public/adalar/data/ana-sayfa.json');
const veri = JSON.parse(readFileSync(VERI_YOLU, 'utf8')) as { groups: SahneGrubu[] };
const grup = (anahtar: string) => veri.groups.find((g) => g.key === anahtar);

describe('ana sayfa sahne verisi', () => {
  it('her kademe adasının grubu, etiketi ve büyük harfli tabelası var', () => {
    for (const ada of KADEME_ADALARI) {
      const g = grup(`stage:${ada.id}`);
      expect(g, ada.id).toBeDefined();
      expect(g?.label).toBe(ada.baslik);
      expect(g?.anchor).toHaveLength(3);
      expect(g?.tabela).toBe(ada.ad.toLocaleUpperCase('tr'));
    }
  });

  it('atölyenin önündeki tabela "ATÖLYE" yazar ve grubu etiketiyle dışa aktarılmış', () => {
    const atolye = grup(`landmark:${ATOLYE.id}`);
    expect(atolye).toBeDefined();
    expect(atolye?.label).toBe(ATOLYE.ad);
    expect(atolye?.tabela).toBe(ATOLYE.tabela);
    expect(atolye?.tabela).toBe('ATÖLYE');
    expect(atolye?.anchor).toHaveLength(3);
  });

  it('atölye aletleri ayrı grup olarak dışa aktarıldı', () => {
    const pergel = grup('arac:pergel');
    const ibre = grup('arac:ibre');
    for (const [ad, g] of [['pergel', pergel], ['ibre', ibre]] as const) {
      expect(g, ad).toBeDefined();
      expect(g?.kind).toBe('arac');
      expect(g?.id).toBe(ad);
      expect(g?.owner).toBe('landmark:atolye');
      expect(g?.pivot).toHaveLength(3);
      expect(g?.axis).toHaveLength(3);
      expect(Math.hypot(...(g?.axis ?? [0, 0, 0])), ad).toBeCloseTo(1, 5);
      expect(g?.triangles, ad).toBeGreaterThan(0);
    }
    expect(pergel?.motion).toBe('tur');
    expect(ibre?.motion).toBe('salinim');

    // Eksen bileşen bazında karşılaştırılır: to_three −0.0 üretebilir, toEqual bunu ayırır
    const pAxis = pergel?.axis ?? [0, 0, 0];
    expect(pAxis[0]).toBeCloseTo(0, 5);
    expect(pAxis[1]).toBeCloseTo(1, 5); // düşey eksen (three +Y)
    expect(pAxis[2]).toBeCloseTo(0, 5);
    const iAxis = ibre?.axis ?? [0, 0, 0];
    expect(iAxis[0]).toBeCloseTo(0, 5);
    expect(iAxis[1]).toBeCloseTo(0, 5);
    expect(iAxis[2]).toBeCloseTo(1, 5); // iletki düzleminin normali (three +Z)

    // Pivotlar atölye adasının ana sahnedeki yerine göre (0,−25,0) + 1.6 ölçek
    const pPivot = pergel?.pivot ?? [0, 0, 0];
    expect(pPivot[0]).toBeCloseTo(4.64, 2);
    expect(pPivot[1]).toBeCloseTo(3.072, 2);
    expect(pPivot[2]).toBeCloseTo(24.248, 2);
    const iPivot = ibre?.pivot ?? [0, 0, 0];
    expect(iPivot[0]).toBeCloseTo(0, 3);
    expect(iPivot[1]).toBeCloseTo(6.176, 2);
    expect(ibre?.restAngle).toBeCloseTo(Math.PI / 3, 4); // modeldeki duruş: 60 derece
  });

  it('atölye kutusu ayrılan aletleri kapsıyor', () => {
    // Seçim vekili ve vurgu halkası bu kutudan üretiliyor: kapsama bozulursa
    // pergelin üzerine gelmek atölyeyi vurgulamaz ve tur tetiklenmez.
    const atolye = grup(`landmark:${ATOLYE.id}`);
    expect(atolye).toBeDefined();
    for (const anahtar of ['arac:pergel', 'arac:ibre']) {
      const alet = grup(anahtar);
      expect(alet, anahtar).toBeDefined();
      for (let i = 0; i < 3; i += 1) {
        expect(atolye?.bbox.min[i], `${anahtar} min[${i}]`).toBeLessThanOrEqual(alet!.bbox.min[i]);
        expect(atolye?.bbox.max[i], `${anahtar} max[${i}]`).toBeGreaterThanOrEqual(alet!.bbox.max[i]);
      }
    }
    expect(atolye?.bbox.max[1]).toBeGreaterThanOrEqual(10.26); // pergelin tutma başlığı tepesi
  });

  it('deniz feneri sahneden kaldırıldı', () => {
    expect(grup('landmark:fener')).toBeUndefined();
  });

  it('park saatinin üç ibresi ayrı grup: aynı göbek ve kadran ekseni, modeldeki 10:00 duruşu', () => {
    const eller = ['akrep', 'yelkovan', 'saniye'] as const;
    const ibreler = eller.map((el) => grup(`arac:saat-${el}`));
    ibreler.forEach((g, i) => {
      expect(g, eller[i]).toBeDefined();
      expect(g?.kind).toBe('arac');
      expect(g?.owner).toBe('stage:ilkokul');
      expect(g?.motion).toBe('saat');
      expect(g?.hand).toBe(eller[i]);
      expect(g?.shadow, eller[i]).toBeUndefined(); // pişmiş gölge duruş pozunda kalırdı
      expect(Math.hypot(...(g?.axis ?? [0, 0, 0]))).toBeCloseTo(1, 5);
      expect(g?.triangles).toBeGreaterThan(0);
      for (let k = 0; k < 3; k += 1) {
        expect(g?.pivot?.[k]).toBeCloseTo(ibreler[0]?.pivot?.[k] ?? NaN, 5);
        expect(g?.axis?.[k]).toBeCloseTo(ibreler[0]?.axis?.[k] ?? NaN, 5);
      }
    });
    // Kadran kameraya (three +Z) ve yukarı bakar
    expect(ibreler[0]?.axis?.[1]).toBeGreaterThan(0);
    expect(ibreler[0]?.axis?.[2]).toBeGreaterThan(0);
    // Duruş açısı 12'den saat yönünde: akrep 10'da (park_olustur.py: -0.30 x, 0.17 y → 299.5°), diğerleri 12'de
    const sapma = (g: SahneGrubu | undefined, beklenen: number) =>
      Math.abs(((((((g?.restAngle ?? NaN) * 180) / Math.PI - beklenen) % 360) + 540) % 360) - 180);
    expect(sapma(ibreler[0], 299.5)).toBeLessThan(1);
    expect(sapma(ibreler[1], 0)).toBeLessThan(1);
    expect(sapma(ibreler[2], 0)).toBeLessThan(1);
  });

  it('gözlemevi kubbesi ve kaburgaları aynı düşey eksende döner; yalnız kabuk gölge verir', () => {
    const kubbe = grup('arac:kubbe');
    const kaburga = grup('arac:kubbe-kaburga');
    for (const [ad, g] of [['kubbe', kubbe], ['kaburga', kaburga]] as const) {
      expect(g, ad).toBeDefined();
      expect(g?.kind).toBe('arac');
      expect(g?.owner).toBe('stage:lise');
      expect(g?.motion).toBe('kubbe');
      expect(g?.axis?.[0]).toBeCloseTo(0, 5);
      expect(g?.axis?.[1]).toBeCloseTo(1, 5);
      expect(g?.axis?.[2]).toBeCloseTo(0, 5);
      for (let k = 0; k < 3; k += 1) expect(g?.pivot?.[k]).toBeCloseTo(kubbe?.pivot?.[k] ?? NaN, 5);
    }
    expect(kubbe?.shadow).toBe(true);
    expect(kaburga?.shadow).toBeUndefined();
  });

  it('ortaokul piramidinin kapağı arka taban kenarından geriye yatar, roketi zeminin altında gizli bekler', () => {
    const kapak = grup('arac:piramit');
    const roket = grup('arac:roket');
    for (const [ad, g] of [['piramit', kapak], ['roket', roket]] as const) {
      expect(g, ad).toBeDefined();
      expect(g?.kind).toBe('arac');
      expect(g?.owner).toBe('stage:ortaokul');
      expect(g?.triangles).toBeGreaterThan(0);
    }
    expect(kapak?.motion).toBe('piramit');
    expect(roket?.motion).toBe('roket');
    // Menteşe −X ekseni (three): artı açı tepeyi kameradan uzağa (−Z) yatırır
    expect(kapak?.axis?.[0]).toBeCloseTo(-1, 5);
    expect(kapak?.axis?.[1]).toBeCloseTo(0, 5);
    expect(kapak?.axis?.[2]).toBeCloseTo(0, 5);
    // Menteşe kapağın arka (−Z en küçük) taban kenarında
    expect(kapak?.pivot?.[1]).toBeCloseTo(kapak?.bbox.min[1] ?? NaN, 1);
    expect(kapak?.pivot?.[2]).toBeCloseTo(kapak?.bbox.min[2] ?? NaN, 1);
    // Roket düşey yükselir; duruşta tepesi kapağın tabanından (zeminden) aşağıda, yükselince zeminde durur
    expect(roket?.axis?.[1]).toBeCloseTo(1, 5);
    expect(roket?.bbox.max[1]).toBeLessThanOrEqual((kapak?.pivot?.[1] ?? NaN) + 0.03);
    expect(roket?.rise).toBeGreaterThan(1);
    expect((roket?.pivot?.[1] ?? NaN) + (roket?.rise ?? NaN)).toBeGreaterThan(kapak?.pivot?.[1] ?? NaN);
    // Roket kapağın içinde, ön kenarına yakın (açık kapağın önünde kalan serbest şerit)
    expect(roket?.pivot?.[0]).toBeGreaterThan(kapak?.bbox.min[0] ?? NaN);
    expect(roket?.pivot?.[0]).toBeLessThan(kapak?.bbox.max[0] ?? NaN);
  });

  it('ada kutuları ayrılan saat ve kubbe parçalarını kapsıyor', () => {
    for (const [sahip, anahtarlar] of [
      ['stage:ilkokul', ['arac:saat-akrep', 'arac:saat-yelkovan', 'arac:saat-saniye']],
      ['stage:lise', ['arac:kubbe', 'arac:kubbe-kaburga']],
      ['stage:ortaokul', ['arac:piramit', 'arac:roket']],
    ] as const) {
      const ada = grup(sahip);
      for (const anahtar of anahtarlar) {
        const parca = grup(anahtar);
        expect(parca, anahtar).toBeDefined();
        for (let i = 0; i < 3; i += 1) {
          expect(ada?.bbox.min[i], `${anahtar} min[${i}]`).toBeLessThanOrEqual(parca!.bbox.min[i]);
          expect(ada?.bbox.max[i], `${anahtar} max[${i}]`).toBeGreaterThanOrEqual(parca!.bbox.max[i]);
        }
      }
    }
  });
});
