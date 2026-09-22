import { describe, expect, it, vi } from 'vitest';
import type { MathObject } from '@/types/math';
import { esitlikIsaretleri, esitlikYamalariniUygula, etkinEsitlik } from '@/math/esitlikIsaretleri';
import { esitlikMenuMaddeleri, esitUzunluklarMaddesi } from '../EsitlikIsaretleri';

const pt = (id: string, x: number, y: number) => ({ id, type: 'point', label: id.slice(3), showLabel: true, x, y, color: '#2563eb', visible: true, isIndependent: true, createdAt: 0 }) as MathObject;
const seg = (id: string, a: string, b: string, extra: Record<string, unknown> = {}) =>
  ({ id, type: 'segment', label: id, showLabel: true, startPointId: a, endPointId: b, color: '#0284c7', visible: true, createdAt: 0, ...extra }) as MathObject;
const sahne = (): MathObject[] => [
  pt('pt-A', 0, 0), pt('pt-C', 6, 0), pt('pt-D', 3, 5.196152422706632), pt('pt-E', 20, 20), pt('pt-F', 26, 20),
  seg('AC', 'pt-A', 'pt-C'), seg('AD', 'pt-A', 'pt-D'), seg('CD', 'pt-C', 'pt-D', { equalityMark: 2 }), seg('EF', 'pt-E', 'pt-F'),
  { id: 'L', type: 'line', label: 'd', showLabel: true, point1Id: 'pt-A', point2Id: 'pt-E', color: '#000', visible: true, createdAt: 0 } as MathObject,
  { id: 'P', type: 'polygon', label: 'ACD', showLabel: true, pointIds: ['pt-A', 'pt-C', 'pt-D'], color: '#10b981', visible: true, createdAt: 0 } as MathObject,
];

describe('eşitlik menüsü', () => {
  it('parça: "Eşitlik işareti" alt menüsü, beş seçenek, etkin değer işaretli', () => {
    const objects = sahne();
    const sonuc = esitlikIsaretleri(objects);
    const uygula = vi.fn();
    const m = esitlikMenuMaddeleri({ hedef: objects.find((o) => o.id === 'CD')!, kenarNo: null, objects, seciliIdler: [], sonuc, uygula });
    expect(m.map((x) => x.id)).toEqual(['esitlik-isareti']);
    expect(m[0].label).toBe('Eşitlik işareti');
    const alt = m[0].submenu!;
    expect(alt.map((x) => x.label)).toEqual(['Otomatik', 'Tek çizgi', 'İki çizgi', 'Üç çizgi', 'İşaretsiz']);
    expect(alt.every((x) => x.radio)).toBe(true);
    expect(alt.filter((x) => x.checked).map((x) => x.label)).toEqual(['İki çizgi']);
    alt[0].onSelect!();
    const [yamalar, aciklama] = uygula.mock.calls[0];
    expect(aciklama).toBe('Eşitlik işareti değiştirildi');
    // CD, üçgenin CD kenarıyla aynı çizgi: ikisi birden otomatiğe alınır
    const sonra = esitlikYamalariniUygula(objects, yamalar);
    expect('equalityMark' in sonra.find((o) => o.id === 'CD')!).toBe(false);
    expect(m.concat(alt).some((x) => x.id.startsWith('olc-'))).toBe(false);
  });

  it('çokgen: kenar yoksa madde yok; kenarda alt menü; doğru için madde yok', () => {
    const objects = sahne();
    const sonuc = esitlikIsaretleri(objects);
    const P = objects.find((o) => o.id === 'P')!;
    expect(esitlikMenuMaddeleri({ hedef: P, kenarNo: null, objects, seciliIdler: [], sonuc, uygula: () => {} })).toEqual([]);
    const kenar = esitlikMenuMaddeleri({ hedef: P, kenarNo: 0, objects, seciliIdler: [], sonuc, uygula: () => {} });
    expect(kenar[0].id).toBe('esitlik-isareti');
    // AC kenarı parçayla aynı: otomatik tek çizgi, "Otomatik" işaretli
    expect(kenar[0].submenu!.find((x) => x.checked)!.label).toBe('Otomatik');
    expect(etkinEsitlik(sonuc, 'edge:P:0').sayi).toBe(1);
    expect(esitlikMenuMaddeleri({ hedef: objects.find((o) => o.id === 'L')!, kenarNo: null, objects, seciliIdler: [], sonuc, uygula: () => {} })).toEqual([]);
  });

  it('iki parça seçiliyken "Eşit olarak işaretle" ikisine aynı boştaki sayıyı verir', () => {
    const objects = sahne();
    const sonuc = esitlikIsaretleri(objects);
    const uygula = vi.fn();
    const m = esitlikMenuMaddeleri({ hedef: objects.find((o) => o.id === 'EF')!, kenarNo: null, objects, seciliIdler: ['AC', 'EF'], sonuc, uygula });
    const esit = m.find((x) => x.id === 'esit-olarak-isaretle')!;
    expect(esit.label).toBe('Eşit olarak işaretle');
    esit.onSelect!();
    const sonra = esitlikYamalariniUygula(objects, uygula.mock.calls[0][0]);
    const s2 = esitlikIsaretleri(sonra);
    // 2 CD'de elle kullanılıyor; AC'nin kendi grubu hariç: 1
    expect(etkinEsitlik(s2, 'seg:AC')).toMatchObject({ elle: 1, sayi: 1 });
    expect(etkinEsitlik(s2, 'seg:EF')).toMatchObject({ elle: 1, sayi: 1 });
  });

  it('boş alan maddesi', () => {
    const fn = vi.fn();
    const m = esitUzunluklarMaddesi(true, fn);
    expect(m).toMatchObject({ id: 'esit-uzunluklar', label: 'Eşit Uzunlukları İşaretle', checked: true });
    m.onSelect!();
    expect(fn).toHaveBeenCalled();
    expect(esitUzunluklarMaddesi(false, fn).checked).toBe(false);
  });
});
