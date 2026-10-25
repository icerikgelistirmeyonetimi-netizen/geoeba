import { describe, expect, it } from 'vitest';
import { TOOL_GROUPS, aracAdi } from '../toolDefinitions';
import { TREE_TOOL_GROUPS } from '../treeToolDefinitions';
import { TOOL_SHORTCUTS, toolForShortcut } from '../toolShortcuts';
import { KADEME_KIMLIKLERI, aracGorunurMu, aracSecilebilirMi, gruplariSuz, type KademeDuzeyi } from '../kademeDuzeyleri';
import { gorunenKisayol } from '../ilkokulKipi';

/*
 * Karakterizasyon: "Temel Çizim Araçları" grubunun tanımı (iki araç listesi), klavye kısayolları ve kademe süzgeci.
 * Beklenen değerler yeniden düzenlemeden ÖNCEKİ koddan kaydedildi (__snapshots__).
 */

const TEMEL = ['point', 'segment', 'line', 'ray', 'segment_length', 'circle', 'polygon', 'regular_polygon'] as const;
const DUZEYLER: KademeDuzeyi[] = ['tum', ...KADEME_KIMLIKLERI];

/** Simgenin kimliği: GeometryToolIcon türü ya da lucide simgesinin adı ve sınıfı */
function simge(icon: unknown): string {
  const oge = icon as { type: { displayName?: string; name?: string } | string; props: { kind?: string; className?: string; children?: unknown } };
  const tur = typeof oge.type === 'string' ? oge.type : oge.type.displayName ?? oge.type.name;
  return [tur, oge.props.kind, oge.props.className, typeof oge.props.children === 'string' ? oge.props.children : undefined].filter(Boolean).join(' ');
}

describe('Temel Çizim Araçları tanımı', () => {
  const panel = TOOL_GROUPS.find((g) => g.groupName === 'Temel Çizim Araçları')!;
  const agac = TREE_TOOL_GROUPS.find((g) => g.id === 'temel_cizim')!;

  it('panel listesi (TOOL_GROUPS): sıra, ad, açıklama, simge ve renkler', () => {
    expect(TOOL_GROUPS.indexOf(panel)).toBe(0);
    const { tools, ...grup } = panel;
    expect(grup).toMatchSnapshot('grup');
    expect(tools.map((t) => ({ ...t, icon: simge(t.icon) }))).toMatchSnapshot('araçlar');
  });

  it('ağaç listesi (TREE_TOOL_GROUPS): aynı araçlar, aynı ad, açıklama, simge ve renk', () => {
    expect(TREE_TOOL_GROUPS.indexOf(agac)).toBe(0);
    expect(agac.name).toBe('Temel Çizim Araçları');
    expect(agac.defaultExpanded).toBe(true);
    expect(agac.tools.map((t) => ({ ...t, icon: simge(t.icon) }))).toEqual(
      panel.tools.map(({ iconBg: _zemin, ...t }) => ({ ...t, icon: simge(t.icon) }))
    );
    expect(Object.keys(agac.tools[0])).toEqual(['id', 'name', 'description', 'icon', 'iconColor']);
    expect(Object.keys(panel.tools[0])).toEqual(['id', 'name', 'description', 'icon', 'iconBg', 'iconColor']);
    for (const arac of TEMEL) expect(agac.tools.map((t) => t.id)).toContain(arac);
  });

  it('aracAdi', () => {
    expect(Object.fromEntries(TEMEL.map((a) => [a, aracAdi(a)]))).toMatchSnapshot();
  });
});

describe('kısayollar', () => {
  it('temel araçların kısayolları ve tuştan araca eşleme', () => {
    expect(Object.fromEntries(TEMEL.map((a) => [a, TOOL_SHORTCUTS[a]]))).toEqual({
      point: 'N', segment: 'L', line: 'D', ray: 'I', segment_length: 'Shift+L', circle: 'C', polygon: 'P', regular_polygon: 'Shift+P',
    });
    const tus = (kisayol: string) => {
      const shift = kisayol.startsWith('Shift+');
      return toolForShortcut({ code: `Key${kisayol.slice(shift ? 6 : 0)}`, shiftKey: shift, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, repeat: false });
    };
    for (const arac of TEMEL) expect(tus(TOOL_SHORTCUTS[arac]), arac).toBe(arac);
    // Değiştirici tuşlar ve basılı tutma araç seçmez
    expect(toolForShortcut({ code: 'KeyN', shiftKey: false, ctrlKey: true, metaKey: false, altKey: false, isComposing: false, repeat: false })).toBeUndefined();
    expect(toolForShortcut({ code: 'KeyN', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, repeat: true })).toBeUndefined();
  });

  it('kısayol harfi ilkokulda gösterilmez, diğer kademelerde gösterilir', () => {
    for (const arac of TEMEL) {
      expect(gorunenKisayol(arac, 'ilkokul')).toBeUndefined();
      for (const duzey of ['tum', 'ortaokul', 'lise'] as const) expect(gorunenKisayol(arac, duzey)).toBe(TOOL_SHORTCUTS[arac]);
    }
  });
});

describe('kademe süzgeci', () => {
  it('her kademede Temel Çizim Araçları grubunda kalan araçlar ve adları', () => {
    const tablo = Object.fromEntries(
      DUZEYLER.map((duzey) => {
        const grup = gruplariSuz(TREE_TOOL_GROUPS, duzey).find((g) => g.id === 'temel_cizim');
        return [duzey, grup?.tools.map((t) => `${t.id}: ${t.name}`)];
      })
    );
    expect(tablo).toMatchSnapshot();
  });

  it('panelde görünürlük ve kısayol / komutla seçilebilirlik', () => {
    const tablo = Object.fromEntries(
      TEMEL.map((arac) => [arac, DUZEYLER.map((d) => `${d}:${aracGorunurMu(d, arac) ? 'görünür' : 'gizli'}/${aracSecilebilirMi(d, arac) ? 'seçilir' : 'seçilmez'}`).join(' ')])
    );
    expect(tablo).toMatchSnapshot();
  });
});
