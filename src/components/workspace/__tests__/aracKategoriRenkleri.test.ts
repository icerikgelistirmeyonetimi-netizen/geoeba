import { describe, it, expect } from 'vitest';
import { TOOL_GROUPS, ARAC_KATEGORI_RENKLERI, ARAC_KATEGORI_ZEMINLERI } from '../toolDefinitions';
import { TREE_TOOL_GROUPS } from '../treeToolDefinitions';

/** Tema geçişi sonrası yasak sabit Tailwind renk aileleri (tema tokenları ve 'ada' paleti serbest). */
const SABIT_RENK = /\b(bg|text|border|ring|from|to|via)-(blue|slate|indigo|purple|violet|emerald|green|amber|yellow|rose|red|pink|sky|teal|cyan|gray|zinc|white|black|orange|fuchsia)(-\d{2,3})?(\/\d+)?\b|\b(bg|text|border)-\[#[0-9a-fA-F]{3,8}\]/;

const kategoriRenkleri = new Set<string>(Object.values(ARAC_KATEGORI_RENKLERI));

describe('araç kategori renkleri (tema)', () => {
  it('araç listesindeki her simge rengi kategori tablosundan gelir', () => {
    for (const tool of TOOL_GROUPS.flatMap((g) => g.tools)) {
      expect(kategoriRenkleri.has(tool.iconColor), `${tool.id}: ${tool.iconColor}`).toBe(true);
      expect(Object.values(ARAC_KATEGORI_ZEMINLERI)).toContain(tool.iconBg);
    }
  });

  it('ağaç menüdeki araçlar da aynı tablodan renk alır', () => {
    for (const tool of TREE_TOOL_GROUPS.flatMap((g) => g.tools)) {
      expect(kategoriRenkleri.has(tool.iconColor), `${tool.id}: ${tool.iconColor}`).toBe(true);
    }
  });

  it('aynı araç her iki listede de aynı renktedir', () => {
    const listeRengi = new Map(TOOL_GROUPS.flatMap((g) => g.tools).map((t) => [t.id as string, t.iconColor]));
    for (const tool of TREE_TOOL_GROUPS.flatMap((g) => g.tools)) {
      const beklenen = listeRengi.get(tool.id);
      if (beklenen === undefined) continue; // add_object gibi yalnız ağaçta olanlar
      expect(tool.iconColor, tool.id).toBe(beklenen);
    }
  });

  it('kategori tablosu ve grup sınıfları sabit Tailwind rengi içermez', () => {
    const siniflar = [
      ...Object.values(ARAC_KATEGORI_RENKLERI),
      ...Object.values(ARAC_KATEGORI_ZEMINLERI),
      ...TOOL_GROUPS.flatMap((g) => [g.themeColor, g.badgeBg, g.containerBg, g.containerBorder, g.headerTextColor]),
    ];
    for (const sinif of siniflar) {
      expect(sinif, sinif).not.toMatch(SABIT_RENK);
    }
  });

  it('koyu temada okunmayan deniz/mürekkep tonlarının koyu tema karşılığı vardır', () => {
    for (const [kategori, sinif] of Object.entries(ARAC_KATEGORI_RENKLERI)) {
      if (/text-ada-(deniz|deniz-koyu|murekkep-2)\b/.test(sinif)) {
        expect(sinif, kategori).toMatch(/dark:text-/);
      }
    }
  });
});
