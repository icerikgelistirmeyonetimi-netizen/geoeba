import { describe, expect, it } from 'vitest';
import { parseProjectFile } from '../projectFile';
import { ESITLIK_EN_COK } from '../esitlikIsaretleri';

const p = (id: string, x = 0, y = 0) => ({ id, type: 'point', x, y });
const tri = (extra: Record<string, unknown> = {}) => ({ id: 'T', type: 'polygon', pointIds: ['A', 'B', 'C'], ...extra });
const seg = (extra: Record<string, unknown> = {}) => ({ id: 's', type: 'segment', startPointId: 'A', endPointId: 'B', ...extra });
const noktalar = [p('A'), p('B', 3), p('C', 0, 4)];

describe('proje dosyası: eşitlik işaretleri', () => {
  it('görünüm anahtarını ve nesne alanlarını gidiş-dönüşte korur, olmayanı eklemez', () => {
    const file = {
      version: '2.0', solids: [],
      viewport: { zoom: 40, showEqualityMarks: false },
      objects: [...noktalar, seg({ equalityMark: 2 }), tri({ edgeEqualityMarks: { 0: 1, 2: 0 } }),
        { id: 'y', type: 'arc', centerPointId: 'A', startPointId: 'B', directionPointId: 'C', equalityMark: 3 },
        { id: 'd', type: 'sector', centerPointId: 'A', startPointId: 'B', directionPointId: 'C', equalityMark: 0 }],
    };
    const loaded = parseProjectFile(JSON.parse(JSON.stringify(file)));
    expect(loaded.viewport).toEqual({ zoom: 40, showEqualityMarks: false });
    const byId = new Map(loaded.objects.map((o) => [o.id, o as unknown as Record<string, unknown>]));
    expect(byId.get('s')!.equalityMark).toBe(2);
    expect(byId.get('T')!.edgeEqualityMarks).toEqual({ 0: 1, 2: 0 });
    expect(byId.get('y')!.equalityMark).toBe(3);
    expect(byId.get('d')!.equalityMark).toBe(0);
    const bos = parseProjectFile({ objects: [...noktalar, seg(), tri()], viewport: { zoom: 40 } });
    expect(bos.viewport).toEqual({ zoom: 40 });
    expect(bos.objects.some((o) => 'equalityMark' in o || 'edgeEqualityMarks' in o)).toBe(false);
  });

  it('yay ölçümünde elle işaret kabul edilir', () => {
    const loaded = parseProjectFile({ objects: [...noktalar, { id: 'c', type: 'circle', centerPointId: 'A', radiusPointId: 'B' },
      { id: 'm', type: 'measurement', kind: 'arc', pointIds: ['B', 'C'], circleId: 'c', equalityMark: 1 }] });
    expect((loaded.objects.find((o) => o.id === 'm') as unknown as { equalityMark: number }).equalityMark).toBe(1);
  });

  it.each([4, 5, 8])('%i çizgili işareti bütün desteklenen nesnelerde kaydedip açar', (sayi) => {
    const file = {
      version: '2.0', solids: [],
      objects: [...noktalar, seg({ equalityMark: sayi }), tri({ edgeEqualityMarks: { 0: sayi, 2: 0 } }),
        { id: 'y', type: 'arc', centerPointId: 'A', startPointId: 'B', directionPointId: 'C', equalityMark: sayi },
        { id: 'd', type: 'sector', centerPointId: 'A', startPointId: 'B', directionPointId: 'C', equalityMark: sayi },
        { id: 'c', type: 'circle', centerPointId: 'A', radiusPointId: 'B' },
        { id: 'm', type: 'measurement', kind: 'arc', pointIds: ['B', 'C'], circleId: 'c', equalityMark: sayi }],
    };
    const loaded = parseProjectFile(JSON.parse(JSON.stringify(file)));
    const reopened = parseProjectFile(JSON.parse(JSON.stringify(loaded)));
    const byId = new Map(reopened.objects.map((o) => [o.id, o as unknown as Record<string, unknown>]));
    for (const id of ['s', 'y', 'd', 'm']) expect(byId.get(id)!.equalityMark).toBe(sayi);
    expect(byId.get('T')!.edgeEqualityMarks).toEqual({ 0: sayi, 2: 0 });
  });

  it('artık olmayan kenarın işareti düşer, dosya yine açılır', () => {
    const loaded = parseProjectFile({ objects: [...noktalar, tri({ edgeEqualityMarks: { 1: 2, 5: 1 } })] });
    expect((loaded.objects.find((o) => o.id === 'T') as unknown as { edgeEqualityMarks: unknown }).edgeEqualityMarks).toEqual({ 1: 2 });
    const hepsi = parseProjectFile({ objects: [...noktalar, tri({ edgeEqualityMarks: { 7: 2 } })] });
    expect('edgeEqualityMarks' in hepsi.objects.find((o) => o.id === 'T')!).toBe(false);
  });

  it.each([
    { objects: [...noktalar, seg({ equalityMark: ESITLIK_EN_COK + 1 })] },
    { objects: [...noktalar, seg({ equalityMark: 1.5 })] },
    { objects: [...noktalar, seg({ equalityMark: -1 })] },
    { objects: [...noktalar, seg({ equalityMark: '2' })] },
    { objects: [{ ...p('A'), equalityMark: 1 }] },
    { objects: [...noktalar, { id: 'm', type: 'measurement', kind: 'distance', pointIds: ['A', 'B'], equalityMark: 1 }] },
    { objects: [...noktalar, tri({ edgeEqualityMarks: { 0: ESITLIK_EN_COK + 1 } })] },
    { objects: [...noktalar, tri({ edgeEqualityMarks: { x: 1 } })] },
    { objects: [...noktalar, tri({ edgeEqualityMarks: [1, 2] })] },
    { objects: [...noktalar, seg({ edgeEqualityMarks: { 0: 1 } })] },
    { objects: [], viewport: { showEqualityMarks: 'evet' } },
  ])('geçersiz eşitlik işaretini reddeder: %j', (file) => expect(() => parseProjectFile(file)).toThrow());
});
