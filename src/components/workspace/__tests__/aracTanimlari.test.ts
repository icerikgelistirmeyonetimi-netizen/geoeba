import { describe, expect, it } from 'vitest';
import { ARAC_KATEGORI_RENKLERI, ARAC_KATEGORI_ZEMINLERI, TOOL_GROUPS, aracAdi } from '../toolDefinitions';
import { TREE_TOOL_GROUPS } from '../treeToolDefinitions';

/*
 * Karakterizasyon: 2B araç listelerinin TAMAMI. Panel listesi (TOOL_GROUPS: imleç rozeti, komut önerileri, menü
 * kısayolları) ve ağaç liste (TREE_TOOL_GROUPS: araç paneli, Ara sekmesi, Araçlar menüsünün alt grupları, kılavuz) için
 * grup sırası ve alanları, araç sırası, ad, açıklama, simge, renk ve anahtar sırası. Beklenen değerler yeniden
 * düzenlemeden ÖNCEKİ koddan kaydedildi.
 */

/** Simgenin kimliği: tür adı (GeometryToolIcon, lucide adı ya da 'span'), türü ve sınıfı, varsa yazısı */
function simge(icon: unknown): string {
  const oge = icon as { type: { displayName?: string; name?: string } | string; props: { kind?: string; className?: string; children?: unknown } };
  const tur = typeof oge.type === 'string' ? oge.type : oge.type.displayName ?? oge.type.name;
  return [tur, oge.props.kind, oge.props.className, typeof oge.props.children === 'string' ? oge.props.children : undefined].filter(Boolean).join(' ');
}

const satir = (arac: Record<string, unknown>) =>
  Object.entries(arac).map(([k, v]) => `${k}=${k === 'icon' ? simge(v) : String(v)}`).join(' | ');

describe('2B araç listeleri', () => {
  it('panel listesi (TOOL_GROUPS)', () => {
    expect(
      TOOL_GROUPS.map(({ tools, ...grup }) => ({ grup: Object.entries(grup).map(([k, v]) => `${k}=${v}`), araclar: tools.map((t) => satir({ ...t })) }))
    ).toMatchSnapshot();
  });

  it('ağaç liste (TREE_TOOL_GROUPS)', () => {
    expect(
      TREE_TOOL_GROUPS.map(({ tools, ...grup }) => ({ grup: Object.entries(grup).map(([k, v]) => `${k}=${v}`), araclar: tools.map((t) => satir({ ...t })) }))
    ).toMatchSnapshot();
  });

  it('iki listede araçlar aynı sırada, aynı ad, simge ve renkle; yalnız açıklamaları farklı olabilir', () => {
    const panel = TOOL_GROUPS.flatMap((g) => g.tools);
    const agac = TREE_TOOL_GROUPS.flatMap((g) => g.tools);
    expect(agac.map((t) => t.id)).toEqual(panel.map((t) => t.id));
    expect(TREE_TOOL_GROUPS.map((g) => g.name)).toEqual(TOOL_GROUPS.map((g) => g.groupName));
    for (let i = 0; i < panel.length; i += 1) {
      expect(agac[i].name, agac[i].id).toBe(panel[i].name);
      expect(agac[i].iconColor, agac[i].id).toBe(panel[i].iconColor);
      expect(simge(agac[i].icon), agac[i].id).toBe(simge(panel[i].icon));
    }
    const farkliAciklama = panel.filter((t, i) => agac[i].description !== t.description).map((t, i) => t.id);
    expect(farkliAciklama).toMatchSnapshot('açıklaması farklı araçlar');
  });

  it('kategori renkleri ve zeminleri; araç adları', () => {
    expect({ ARAC_KATEGORI_RENKLERI, ARAC_KATEGORI_ZEMINLERI }).toMatchSnapshot('renkler');
    expect(aracAdi('pan')).toBe('Görünümü Kaydır');
    expect(aracAdi('olmayan')).toBe('olmayan');
  });
});
