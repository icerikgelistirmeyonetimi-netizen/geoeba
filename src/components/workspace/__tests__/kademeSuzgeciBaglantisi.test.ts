import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Koruma testleri: kademe süzgeci araç panelinin ve Araçlar menüsünün HER listesine uygulanır,
 * ama yazılı / sesli komutlara ve klavye kısayollarına hiç karışmaz (kullanıcı her şeyi Türkçe
 * yazarak ya da konuşarak yapabilmeli). Süzgeç sınıfa göre değil kademeye göredir (ilkokul, ortaokul, lise).
 */

const KOK = path.resolve(__dirname, '..');
const SRC = path.resolve(KOK, '..', '..');
const oku = (dosya: string) => readFileSync(dosya, 'utf8');

/** Klasördeki .ts/.tsx dosyaları (testler hariç) */
const dosyalar = (klasor: string): string[] =>
  readdirSync(klasor).flatMap((ad) => {
    const tam = path.join(klasor, ad);
    if (statSync(tam).isDirectory()) return ad === '__tests__' ? [] : dosyalar(tam);
    return /\.(ts|tsx)$/.test(ad) ? [tam] : [];
  });

describe('araç paneli kademe süzgecinden geçer', () => {
  const toolbar = oku(path.join(KOK, 'Toolbar.tsx'));

  it('ağaç liste ve Ara sekmesi süzülmüş grupları kullanır', () => {
    expect(toolbar).toMatch(/gruplariSuz\(TREE_TOOL_GROUPS, kademeDuzeyi\)/);
    // Süzülmemiş kayıt listelenmez (grup açıklığının başlangıç değerleri dışında)
    expect(toolbar).not.toMatch(/TREE_TOOL_GROUPS\.map\(\(group\)/);
    expect(toolbar).not.toMatch(/TREE_TOOL_GROUPS\.flatMap\(\(g\) => g\.tools\)/);
    expect(toolbar.match(/aracGruplari\.(map|flatMap)\(/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('süzgeç açıkken iki listede de "Tüm araçlar" şeridi var', () => {
    expect(toolbar.match(/<KademeSuzgeciSeridi /g)?.length).toBe(2);
    expect(toolbar.match(/<KademeAramaBosNotu/g)?.length).toBe(2);
  });
});

describe('menü çubuğu', () => {
  const menu = oku(path.join(KOK, 'WorkspaceMenuBar.tsx'));

  it('Kademe menüsü menü çubuğunda; sınıf menüsü yok', () => {
    expect(menu).toMatch(/<KademeDuzeyiMenusu/);
    expect(menu).toMatch(/'kademe'/);
    expect(menu).not.toMatch(/'sinif'/);
  });

  it('Araçlar menüsündeki her araç (Seçim dışında) kademe süzgecinden geçer', () => {
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

describe('sınıf sınıf süzgeç kalmadı', () => {
  it('çalışma alanı ve kancalar yalnız kademe süzgecini bilir', () => {
    for (const dosya of [...dosyalar(KOK), ...dosyalar(path.join(SRC, 'hooks'))]) {
      expect(oku(dosya), path.relative(SRC, dosya)).not.toMatch(/sinifDuzey|SinifDuzey|SinifSuzgec|useSinifDuzeyi/);
    }
  });
});

describe('komutlar ve kısayollar kısıtlanmaz', () => {
  it('komut motoru, komut kutusu, kısayollar ve araç etkinleştirme kademe süzgecini bilmez', () => {
    const komutYolu = [
      ...dosyalar(path.join(SRC, 'math', 'commands')),
      path.join(KOK, 'CommandPanel.tsx'),
      path.join(KOK, 'CommandAssistant.tsx'),
      path.join(KOK, 'toolShortcuts.ts'),
      path.join(KOK, 'WorkspaceView.tsx'),
      path.join(SRC, 'state', 'WorkspaceContext.tsx'),
    ];
    for (const dosya of komutYolu) {
      expect(oku(dosya), path.relative(SRC, dosya)).not.toMatch(/kademeDuzey|KademeDuzey|useKademeDuzeyi|sinifDuzey|SinifDuzey/);
    }
  });
});
