import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TREE_TOOL_GROUPS_3D, TUM_3B_ARACLAR, arac3BBul } from '../treeToolDefinitions3D';
import { ILKOKUL_3B_ARACLARI } from '../kademeDuzeyleri3B';

/*
 * 3B araç tutarlılığı: Canvas3D'nin araç kipleri (Tool3DMode) üç yerde birden tanımlıdır — tip birliği
 * (types/workspace3d.ts), panel ağacı (treeToolDefinitions3D.tsx) ve tuval davranışı (Canvas3D.tsx). Yeni bir
 * kip eklenip panele ya da tuvale bağlanmazsa bu test düşer.
 */

const KOK = path.resolve(__dirname, '..');
const TIP_DOSYASI = path.resolve(KOK, '../../types/workspace3d.ts');

/** types/workspace3d.ts kaynağından Tool3DMode birliğinin üyelerini okur (çalışma zamanında tip yoktur). */
function tool3DModeUyeleri(): string[] {
  const kaynak = readFileSync(TIP_DOSYASI, 'utf8');
  const birlik = kaynak.match(/export type Tool3DMode =([\s\S]*?);/);
  if (!birlik) throw new Error('types/workspace3d.ts içinde Tool3DMode bulunamadı');
  return Array.from(birlik[1].matchAll(/\|\s*'([a-z_0-9]+)'/g), (e) => e[1]);
}

describe('3B araç kipleri (Tool3DMode) panel ve tuvalde tutarlı', () => {
  const kipler = tool3DModeUyeleri();

  it('Tool3DMode birliği beklenen araçları içerir', () => {
    expect(kipler.length).toBeGreaterThanOrEqual(17);
    for (const kip of ['select_move', 'orbit', 'inspect', 'delete', 'rotate_3d', 'scale_3d', 'reflect_3d', 'translate_3d', 'measure_edge', 'create_cube']) {
      expect(kipler).toContain(kip);
    }
    expect(new Set(kipler).size).toBe(kipler.length);
  });

  it('her Tool3DMode kimliği Toolbar3D ağacında (treeToolDefinitions3D) bir satırdır', () => {
    const agacKimlikleri = new Set(TUM_3B_ARACLAR.map((a) => a.id));
    const eksik = kipler.filter((kip) => !agacKimlikleri.has(kip as never));
    expect(eksik).toEqual([]);
  });

  it('her Tool3DMode kimliği Canvas3D.tsx kaynağında geçer (davranış bağlı)', () => {
    const kaynak = readFileSync(path.join(KOK, 'Canvas3D.tsx'), 'utf8');
    const eksik = kipler.filter((kip) => !new RegExp(`\\b${kip}\\b`).test(kaynak));
    expect(eksik).toEqual([]);
  });

  it('ağaçtaki kimlikler tekildir ve her satırın adı, açıklaması ve simge rengi vardır', () => {
    const kimlikler = TUM_3B_ARACLAR.map((a) => a.id);
    expect(new Set(kimlikler).size).toBe(kimlikler.length);
    for (const arac of TUM_3B_ARACLAR) {
      expect(arac.name.trim().length, arac.id).toBeGreaterThan(0);
      expect(arac.description.trim().length, arac.id).toBeGreaterThan(0);
      expect(arac.iconColor.trim().length, arac.id).toBeGreaterThan(0);
      expect(arac3BBul(arac.id)).toBe(arac);
    }
    expect(TREE_TOOL_GROUPS_3D.every((g) => g.tools.length > 0)).toBe(true);
  });

  it('paylaşılan sözleşmedeki araç adları ağaçta aynen yer alır', () => {
    const beklenen: Record<string, string> = {
      select_move: 'Taşı',
      orbit: 'Döndür ve İncele',
      pan: 'Görünümü Kaydır',
      inspect: 'Yüzü Seç ve Renklendir',
      measure_edge: 'Uzunluk Ölçme',
      rotate_3d: 'Cismi Döndür',
      scale_3d: 'Büyüt ve Küçült',
      reflect_3d: 'Yansıt',
      translate_3d: 'Ötele',
      delete: 'Sil',
      create_cube: 'Küp',
      create_sphere: 'Küre',
      create_cylinder: 'Silindir',
      create_prism: 'Dikdörtgen Prizma',
      create_triangular_prism: 'Üçgen Prizma',
      create_cone: 'Koni',
      create_pyramid: 'Kare Piramit',
      kare_prizma: 'Kare Prizma',
    };
    for (const [id, ad] of Object.entries(beklenen)) expect(arac3BBul(id)?.name, id).toBe(ad);
  });

  it('ilkokul 3B listesindeki her kimlik ağaçta vardır; koni, piramit, yansıtma ve öteleme ilkokulda yoktur', () => {
    const agacKimlikleri = new Set(TUM_3B_ARACLAR.map((a) => a.id));
    for (const id of ILKOKUL_3B_ARACLARI) expect(agacKimlikleri.has(id), id).toBe(true);
    for (const id of ['create_cone', 'create_pyramid', 'reflect_3d', 'translate_3d']) {
      expect(ILKOKUL_3B_ARACLARI).not.toContain(id);
    }
  });
});
