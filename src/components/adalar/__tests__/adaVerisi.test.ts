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

  it('deniz feneri sahneden kaldırıldı', () => {
    expect(grup('landmark:fener')).toBeUndefined();
  });
});
