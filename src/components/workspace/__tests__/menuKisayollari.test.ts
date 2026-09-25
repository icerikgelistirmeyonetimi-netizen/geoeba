import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Menü çubuğundaki araç kısayolu ipuçları elle yazılmaz: harf klavyenin gerçek bağından
 * (toolShortcuts.ts > TOOL_SHORTCUTS) okunur, böylece menü ile klavye birbirinden kopamaz.
 * Eskiden Araçlar menüsü Nokta P, Doğru / Parça S, Çokgen G, Ölçüm M; Ekle menüsü Fonksiyon F
 * gösteriyordu (gerçek bağlar N, L, P, U, W; F kalemi seçer).
 */

const menu = readFileSync(path.resolve(__dirname, '..', 'WorkspaceMenuBar.tsx'), 'utf8');
/** Her <button ile başlayan parça: bir menü maddesi ve ardından gelen koşul satırı */
const maddeler = menu.split('<button');

describe('menü çubuğu araç kısayolu ipuçları', () => {
  it('ipucu bileşeni harfi TOOL_SHORTCUTS bağından okur', () => {
    expect(menu).toMatch(/function AracKisayolu\([^)]*\)[^{]*\{[^}]*TOOL_SHORTCUTS\[arac\]/);
  });

  it('elle yazılmış araç harfi yok (Ctrl kısayolları menü çubuğunun kendi tuş işleyicisinde)', () => {
    const elleYazilmis = [...menu.matchAll(/text-muted-foreground[^"]*">((?:Shift\+)?[A-Z])<\/span>/g)].map((m) => m[1]);
    expect(elleYazilmis).toEqual([]);
  });

  it('araç seçen her menü maddesi kendi aracının kısayolunu gösterir', () => {
    const aracMaddeleri = maddeler.filter((madde) => madde.includes('onSelectTool('));
    // Araçlar: Seçim, Nokta, Doğru / Parça, Çember, Çokgen, Ölçüm, Dönüşüm, Geometri Araçları; Ekle: Metin
    expect(aracMaddeleri.length).toBeGreaterThanOrEqual(9);
    for (const madde of aracMaddeleri) {
      const araclar = [...madde.matchAll(/onSelectTool\('([a-z_0-9]+)'\)/g)].map((m) => m[1]);
      expect(araclar).toHaveLength(1);
      const ipuclari = [...madde.matchAll(/<AracKisayolu arac="([a-z_0-9]+)"/g)].map((m) => m[1]);
      expect(ipuclari, araclar[0]).toEqual(araclar);
    }
  });

  it('Denklem / Fonksiyon maddesi fonksiyon aracının kısayolunu gösterir (o da aynı pencereyi açar)', () => {
    const madde = maddeler.find((m) => m.includes('onOpenFunctionDialog()'));
    expect(madde).toContain('<AracKisayolu arac="function" />');
  });
});
