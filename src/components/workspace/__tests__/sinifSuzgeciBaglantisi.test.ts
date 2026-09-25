import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Koruma testleri: sınıf süzgeci araç panelinin ve Araçlar menüsünün HER listesine uygulanır,
 * ama yazılı / sesli komutlara ve klavye kısayollarına hiç karışmaz (kullanıcı her şeyi Türkçe
 * yazarak ya da konuşarak yapabilmeli).
 */

const KOK = path.resolve(__dirname, '..');
const SRC = path.resolve(KOK, '..', '..');
const oku = (dosya: string) => readFileSync(dosya, 'utf8');

describe('araç paneli sınıf süzgecinden geçer', () => {
  const toolbar = oku(path.join(KOK, 'Toolbar.tsx'));

  it('ağaç liste ve Ara sekmesi süzülmüş grupları kullanır', () => {
    expect(toolbar).toMatch(/gruplariSuz\(TREE_TOOL_GROUPS, sinifDuzeyi\)/);
    // Süzülmemiş kayıt listelenmez (grup açıklığının başlangıç değerleri dışında)
    expect(toolbar).not.toMatch(/TREE_TOOL_GROUPS\.map\(\(group\)/);
    expect(toolbar).not.toMatch(/TREE_TOOL_GROUPS\.flatMap\(\(g\) => g\.tools\)/);
    expect(toolbar.match(/aracGruplari\.(map|flatMap)\(/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('süzgeç açıkken iki listede de "Tüm araçlar" şeridi var', () => {
    expect(toolbar.match(/<SinifSuzgeciSeridi /g)?.length).toBe(2);
    expect(toolbar.match(/<SinifAramaBosNotu/g)?.length).toBe(2);
  });
});

describe('menü çubuğu', () => {
  const menu = oku(path.join(KOK, 'WorkspaceMenuBar.tsx'));

  it('Sınıf menüsü menü çubuğunda', () => {
    expect(menu).toMatch(/<SinifDuzeyiMenusu/);
    expect(menu).toMatch(/'sinif'/);
  });

  it('Araçlar menüsündeki her araç (Seçim dışında) sınıf süzgecinden geçer', () => {
    const bas = menu.indexOf('4. ARAÇLAR MENÜSÜ');
    const son = menu.indexOf('5. EKLE MENÜSÜ');
    expect(bas).toBeGreaterThan(-1);
    expect(son).toBeGreaterThan(bas);
    const blok = menu.slice(bas, son);
    const araclar = [...blok.matchAll(/onSelectTool\('([a-z_]+)'\)/g)].map((m) => m[1]).filter((a) => a !== 'select');
    expect(araclar.length).toBeGreaterThan(3);
    for (const arac of araclar) expect(blok, arac).toContain(`aracMenudeGorunur('${arac}')`);
  });
});

describe('komutlar ve kısayollar kısıtlanmaz', () => {
  /** Klasördeki .ts/.tsx dosyaları (testler hariç) */
  const dosyalar = (klasor: string): string[] =>
    readdirSync(klasor).flatMap((ad) => {
      const tam = path.join(klasor, ad);
      if (statSync(tam).isDirectory()) return ad === '__tests__' ? [] : dosyalar(tam);
      return /\.(ts|tsx)$/.test(ad) ? [tam] : [];
    });

  it('komut motoru, komut kutusu, kısayollar ve araç etkinleştirme sınıf süzgecini bilmez', () => {
    const komutYolu = [
      ...dosyalar(path.join(SRC, 'math', 'commands')),
      path.join(KOK, 'CommandPanel.tsx'),
      path.join(KOK, 'CommandAssistant.tsx'),
      path.join(KOK, 'toolShortcuts.ts'),
      path.join(KOK, 'WorkspaceView.tsx'),
      path.join(SRC, 'state', 'WorkspaceContext.tsx'),
    ];
    for (const dosya of komutYolu) {
      expect(oku(dosya), path.relative(SRC, dosya)).not.toMatch(/sinifDuzey|SinifDuzey|useSinifDuzeyi/);
    }
  });
});
