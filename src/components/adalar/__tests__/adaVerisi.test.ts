import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SahneGrubu } from '../adaSahnesi';
import { FENER, KADEME_ADALARI } from '../adaEslemeleri';

/**
 * Blender'dan dışa aktarılan ana sayfa verisi (public/adalar/data/ana-sayfa.json) ile
 * uygulamanın eşlemeleri tutarlı olmalı: her kademe adası ve fener sahnede olmalı,
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

  it('fenerin önündeki tabela "UYGULAMALAR" yazar ve fener grubu lambayla dışa aktarılmış', () => {
    const fener = grup(`landmark:${FENER.id}`);
    expect(fener).toBeDefined();
    expect(fener?.tabela).toBe(FENER.tabela);
    expect(fener?.tabela).toBe('UYGULAMALAR');
    expect(fener?.lamp).toHaveLength(3);
    expect(fener?.anchor).toHaveLength(3);
  });
});
