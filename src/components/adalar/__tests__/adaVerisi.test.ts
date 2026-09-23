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
});
