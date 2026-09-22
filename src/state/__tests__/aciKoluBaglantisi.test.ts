import { describe, expect, it } from 'vitest';
import { AngleObject, MathObject, PointObject, SegmentObject } from '@/types/math';
import { parseProjectFile } from '@/math/projectFile';
import { copyObjects, pasteObjects } from '@/math/objectClipboard';
import { collectDependentIds, sarkikBaglariCoz } from '../WorkspaceContext';

const nokta = (id: string, label: string, x: number, y: number): PointObject =>
  ({ id, type: 'point', label, x, y, visible: true, showLabel: true, isIndependent: true, color: '#2563eb', createdAt: 1 }) as PointObject;
const kol = (id: string, a: string, b: string, aciId?: string): SegmentObject =>
  ({ id, type: 'segment', label: id, startPointId: a, endPointId: b, visible: true, showLabel: false, color: '#f59e0b', createdAt: 1, ...(aciId ? { armOfAngleId: aciId } : {}) }) as SegmentObject;
const aci = (id: string): AngleObject =>
  ({ id, type: 'angle', label: '∠ACB', point1Id: 'A', vertexPointId: 'C', point3Id: 'B', visible: true, showLabel: true, color: '#f59e0b', createdAt: 1 }) as AngleObject;

// Açı Oluştur aracıyla çizilmiş açı: iki turuncu kol parçası açıyı "kolu olduğu açı" diye anar
const sahne = (): MathObject[] => [nokta('A', 'A', 0, 3), nokta('C', 'C', 0, 0), nokta('B', 'B', 3, 0), kol('s1', 'C', 'A', 'ang'), kol('s2', 'C', 'B', 'ang'), aci('ang')];

describe('armOfAngleId bir hatırlatmadır, zorunlu bağlantı değildir', () => {
  it('açısı silinmiş kol parçası olan kayıt açılabilir (önceden çizim boş açılıyordu)', () => {
    const acisiz = sahne().filter((o) => o.id !== 'ang' && o.id !== 's2');
    expect(() => parseProjectFile({ version: '2.0', objects: acisiz })).not.toThrow();
    expect(parseProjectFile({ version: '2.0', objects: acisiz }).objects.map((o) => o.id)).toEqual(['A', 'C', 'B', 's1']);
  });

  it('yükleme temizliği sahipsiz kol hatırlatmasını düşürür, sağlam sahneye dokunmaz', () => {
    const acisiz = sahne().filter((o) => o.id !== 'ang');
    const temiz = sarkikBaglariCoz(acisiz);
    expect(temiz.filter((o) => o.type === 'segment').every((o) => !(o as SegmentObject).armOfAngleId)).toBe(true);
    const saglam = sahne();
    expect(sarkikBaglariCoz(saglam)).toBe(saglam);
  });

  it('tek bir kolu kopyalamak açıyı panoya çekmez; yapıştırılan parça kol hatırlatması taşımaz', () => {
    const s = sahne();
    const pano = copyObjects(s, ['s1']);
    expect(pano.objects.map((o) => o.type).sort()).toEqual(['point', 'point', 'segment']);
    const yapistirilan = pasteObjects(pano, s, { x: 10, y: 10 }).objects;
    const parca = yapistirilan.find((o) => o.type === 'segment') as SegmentObject;
    expect(parca.armOfAngleId).toBeUndefined();
  });

  it('açıyla birlikte kopyalanan kollar yeni açıya bağlanır', () => {
    const s = sahne();
    const yapistirilan = pasteObjects(copyObjects(s, ['s1', 's2', 'ang']), s, { x: 10, y: 10 }).objects;
    const yeniAci = yapistirilan.find((o) => o.type === 'angle')!;
    const kollar = yapistirilan.filter((o) => o.type === 'segment') as SegmentObject[];
    expect(kollar).toHaveLength(2);
    expect(kollar.every((k) => k.armOfAngleId === yeniAci.id)).toBe(true);
  });

  it('açı silinince araçla çizilmiş kolları da gider (açı düzeltmesi korunur)', () => {
    const silinen = collectDependentIds(sahne(), ['ang']);
    expect([...silinen].sort()).toEqual(['ang', 's1', 's2']);
  });
});
