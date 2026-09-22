import { describe, expect, it } from 'vitest';
import type { MathObject, ViewportTransform } from '@/types/math';
import { HANDLERS } from '../handlers';
import * as esitlik from '../handlers/esitlik';
import { rankHandlers } from '../engine';
import { CommandScene } from '../scene';
import { parseClause, splitClauses } from '../text';
import type { CommandSuccess } from '../types';
import { esitlikIsaretleri } from '../../esitlikIsaretleri';
import { expectFail, expectOk } from './helpers';

/** Aile henüz kayıtlı değilse de sınanabilsin. */
const ALL = HANDLERS.some((h) => h.id.startsWith('marks.')) ? HANDLERS : [...HANDLERS, ...esitlik.handlers];

type Extra = Record<string, unknown>;
const pt = (id: string, x: number, y: number, extra: Extra = {}) =>
  ({ id, type: 'point', label: id.replace(/^pt-/, ''), showLabel: true, x, y, color: '#2563eb', visible: true, isIndependent: true, createdAt: 0, ...extra }) as MathObject;
const seg = (id: string, a: string, b: string, extra: Extra = {}) =>
  ({ id, type: 'segment', label: `[${a.replace(/^pt-/, '')}${b.replace(/^pt-/, '')}]`, showLabel: true, startPointId: a, endPointId: b, color: '#0284c7', visible: true, thickness: 2.5, createdAt: 0, ...extra }) as MathObject;
const arc = (id: string, c: string, s: string, d: string) =>
  ({ id, type: 'arc', label: `${s.replace(/^pt-/, '')}${d.replace(/^pt-/, '')} Yayı`, showLabel: true, centerPointId: c, startPointId: s, directionPointId: d, color: '#0284c7', visible: true, thickness: 3, createdAt: 0 }) as MathObject;
const circle = (id: string, c: string, r: string) =>
  ({ id, type: 'circle', label: id, showLabel: true, centerPointId: c, radiusPointId: r, color: '#8b5cf6', visible: true, createdAt: 0 }) as MathObject;

/** Kullanıcının sahnesi: AC = AD (aynı çemberin yarıçapları), CD farklı */
const kullanici = (): MathObject[] => [
  pt('pt-A', -5.196152422706632, -3), pt('pt-B', -10.39230484541326, 6), circle('circ-A', 'pt-A', 'pt-B'),
  pt('pt-C', 5.196152422706632, -3, { onObjectId: 'circ-A' }), circle('circ-C', 'pt-C', 'pt-A'),
  pt('pt-D', -0.0787366730477208, 6.045001716149253, { onObjectId: 'circ-A' }),
  seg('seg-AC', 'pt-A', 'pt-C'), seg('seg-AD', 'pt-A', 'pt-D'), seg('seg-CD', 'pt-C', 'pt-D'),
  pt('pt-F', 10.392304845413264, 6, { onObjectId: 'circ-C' }),
];
const dortYay = (): MathObject[] => [
  pt('pt-O', 0, 0), pt('pt-A', 4, 0), pt('pt-C', -4, 0), pt('pt-B', 0, 4), pt('pt-D', 0, -4),
  arc('yAB', 'pt-O', 'pt-A', 'pt-B'), arc('yBC', 'pt-O', 'pt-B', 'pt-C'), arc('yCD', 'pt-O', 'pt-C', 'pt-D'), arc('yDA', 'pt-O', 'pt-D', 'pt-A'),
];
const ucgen = (): MathObject[] => [pt('pt-A', -3, -2), pt('pt-B', 3, -2), pt('pt-C', 0, 2),
  { id: 'ABC', type: 'polygon', label: 'ABC', showLabel: true, pointIds: ['pt-A', 'pt-B', 'pt-C'], color: '#10b981', visible: true, createdAt: 0 } as MathObject];

const ok = (text: string, scene: MathObject[], selection: string[] = [], viewport?: Partial<ViewportTransform>) =>
  expectOk(ALL, text, scene, selection, viewport ? { viewport: { zoom: 40, panX: 0, panY: 0, width: 800, height: 600, showGrid: true, showAxes: true, showCoordinates: false, snapToGrid: false, gridStep: 1, ...viewport } } : {});
const vpPatch = (r: CommandSuccess) => r.actions.filter((a) => a.kind === 'viewport').map((a) => (a as { patch: Partial<ViewportTransform> }).patch);
const mark = (objects: MathObject[], id: string) => (objects.find((o) => o.id === id) as { equalityMark?: number } | undefined)?.equalityMark;
const topHandler = (text: string, scene: MathObject[]) => {
  const s = new CommandScene(scene, [], {});
  return splitClauses(text).map((cl) => {
    const c = parseClause(cl, s.known());
    return c.negated ? '(olumsuz)' : rankHandlers(c, s, ALL)[0]?.handler.id ?? '(yok)';
  });
};

describe('eşitlik komutları: aç / kapat', () => {
  it.each(['eşit kenarları işaretle', 'eşit uzunlukları işaretle', 'eşitlik işaretlerini göster', 'eşit kenarları göster'])('%s: açar ve grupları söyler', (text) => {
    const r = ok(text, kullanici());
    expect(vpPatch(r)).toEqual([{ showEqualityMarks: true }]);
    expect(r.sceneChanged).toBe(false);
    expect(r.message).toContain('1 grup');
    expect(r.message).toContain('[AC] = [AD], tek çizgi');
  });

  it.each(['eşitlik işaretlerini gizle', 'eşitlik işaretlerini kaldır', 'eşitlik işaretlerini kapat', 'eşit kenarları işaretleme',
    'eşit kenarlar işaretlenmesin', 'eşitlik işaretleri olmasın', 'eşitlik çentiklerini istemiyorum'])('%s: kapatır, nesnelere dokunmaz', (text) => {
    const sahne = kullanici();
    const r = ok(text, sahne);
    expect(vpPatch(r)).toEqual([{ showEqualityMarks: false }]);
    expect(r.objects).toBe(sahne);
    expect(r.message).toContain('kapatıldı');
  });

  it('"kaldırma" olumsuz emri hiçbir şey yapmaz, açıklar', () => {
    expect(expectFail(ALL, 'eşitlik işaretlerini kaldırma', kullanici())).toMatch(/Olumsuz/);
  });

  it('tüm eşitlik işaretlerini sil: elle konanları da kaldırır', () => {
    const sahne = kullanici().map((o) => (o.id === 'seg-CD' ? { ...o, equalityMark: 2 } : o)) as MathObject[];
    const r = ok('tüm eşitlik işaretlerini sil', sahne);
    expect(r.objects.some((o) => 'equalityMark' in o)).toBe(false);
    expect(r.objects).toHaveLength(sahne.length);
    expect(r.message).toContain('elle konan 1 işaret kaldırıldı');
    const kapat = ok('eşitlik işaretlerini gizle', sahne);
    expect(kapat.message).toContain('Elle konan 1 işaret duruyor');
  });

  it('eşit yayları işaretle: dört eş yay bir grup; yay yoksa yol gösterir', () => {
    expect(ok('eşit yayları işaretle', dortYay()).message).toMatch(/Eşit yaylar işaretlendi: 1 grup \(AB Yayı = BC Yayı = CD Yayı = DA Yayı, tek çizgi\)/);
    expect(ok('eşit yayları işaretle', kullanici()).message).toMatch(/eşit yay bulunamadı.*yaylara ayırın/);
  });

  it('ayrı şekillerde eşit uzunluk yoksa ne yapılacağını söyler', () => {
    const ayri = [pt('pt-A', 0, 0), pt('pt-B', 5, 0), seg('s1', 'pt-A', 'pt-B'), pt('pt-C', 10, 10), pt('pt-D', 15, 10), seg('s2', 'pt-C', 'pt-D')];
    expect(ok('eşit kenarları işaretle', ayri).message).toContain('eşit işaretle');
  });
});

describe('eşitlik komutları: elle işaret', () => {
  it("AC ile AD'yi eşit işaretle: ikisine tek çizgi", () => {
    const r = ok("AC ile AD'yi eşit işaretle", kullanici());
    expect(mark(r.objects, 'seg-AC')).toBe(1);
    expect(mark(r.objects, 'seg-AD')).toBe(1);
    expect(r.message).toBe('[AC] ve [AD] tek çizgiyle eşit işaretlendi.');
  });

  it("AC ile CD'yi eşit işaretle: uzunluklar farklıysa not düşer", () => {
    const r = ok("AC ile CD'yi eşit işaretle", kullanici());
    expect(mark(r.objects, 'seg-AC')).toBe(1);
    expect(mark(r.objects, 'seg-CD')).toBe(1);
    expect(r.message).toContain('Not: uzunlukları şu an eşit değil (10,39 br; 10,47 br)');
  });

  it('seçili parçaları eşit işaretle', () => {
    const r = ok('seçili parçaları eşit işaretle', kullanici(), ['seg-AC', 'seg-CD']);
    expect([mark(r.objects, 'seg-AC'), mark(r.objects, 'seg-CD')]).toEqual([1, 1]);
  });

  it.each([
    ['CD kenarına iki çizgi koy', 2], ["CD'ye tek çizgi koy", 1], ["CD'ye bir çizgi koy", 1], ["CD'ye çift çizgi koy", 2],
    ["CD'ye üç çizgi at", 3], ['CD parçasına dört çizgi koy', 4], ["CD'ye çentik at", 1],
  ])('%s → %i', (text, beklenen) => {
    const sahne = kullanici();
    const r = ok(text as string, sahne);
    expect(mark(r.objects, 'seg-CD')).toBe(beklenen);
    expect(r.objects).toHaveLength(sahne.length);
  });

  it("CD'nin eşitlik işaretini kaldır / gizle: parça SİLİNMEZ, gizlenmez; işaret 0 olur", () => {
    for (const text of ["CD'nin eşitlik işaretini kaldır", "CD'nin eşitlik işaretini gizle", "CD'nin eşitlik işaretini sil"]) {
      const r = ok(text, kullanici());
      const cd = r.objects.find((o) => o.id === 'seg-CD')!;
      expect(cd.visible).toBe(true);
      expect(mark(r.objects, 'seg-CD')).toBe(0);
      expect(r.message).toBe('[CD]: eşitlik işareti kaldırıldı.');
    }
  });

  it('otomatik yap: elle değer silinir', () => {
    const sahne = kullanici().map((o) => (o.id === 'seg-CD' ? { ...o, equalityMark: 2 } : o)) as MathObject[];
    const r = ok("CD'nin eşitlik işaretini otomatik yap", sahne);
    expect('equalityMark' in r.objects.find((o) => o.id === 'seg-CD')!).toBe(false);
    expect(r.message).toContain('otomatiğe alındı');
  });

  it('yay ve çokgen kenarı', () => {
    const y = ok('AB yayına iki çizgi koy', dortYay());
    expect(mark(y.objects, 'yAB')).toBe(2);
    const u = ok('AB kenarına üç çizgi koy', ucgen());
    expect((u.objects.find((o) => o.id === 'ABC') as { edgeEqualityMarks?: unknown }).edgeEqualityMarks).toEqual({ 0: 3 });
    const e = esitlikIsaretleri(u.objects);
    expect(e.isaretHaritasi.get('edge:ABC:0')?.sayi).toBe(3);
  });

  it('hatalar: çizgi sayısı, bilinmeyen ad, karışık tür', () => {
    expect(expectFail(ALL, "CD'ye beş çizgi koy", kullanici())).toContain('1 ile 4');
    const sahne = kullanici();
    const r = expectFail(ALL, "XY'nin eşitlik işaretini kaldır", sahne);
    expect(r).toContain('bulunamadı');
    const karisik = [...dortYay(), pt('pt-E', 10, 0), pt('pt-F', 12, 0), seg('sEF', 'pt-E', 'pt-F')];
    expect(expectFail(ALL, "AB yayı ile EF'yi eşit işaretle", karisik)).toContain('yaylar');
  });
});

describe('eşitlik komutları: başka komutları kapmaz', () => {
  it.each([
    'AC uzunluğunu ölç', 'AC = 5 yap', "AC'yi sil", "AC'yi üç eşit parçaya böl", 'eşit parçalara böl', "AC'nin orta noktasını işaretle",
    'AC üzerinde bir nokta işaretle', 'İki nokta arasına çizgi koy', 'eşit kenarlı üçgen çiz', 'iki kenarı eşit üçgen çiz',
    'kenarları eşit olsun', 'Tabanı 6, yan kenarları 5 olan ikizkenar üçgen çiz', 'eşit açıları işaretle', 'kenarları 5, 5 ve 6 olan çeşitkenar üçgen',
    'a eşittir üç', "AC'ye dik bir çizgi koy", "AC'ye paralel bir çizgi koy", "AC'ye dik bir çizgi ekle", 'AC kenarına bir çizgi ekle',
    "AC'ye bir çizgi daha ekle", 'eşit uzunlukta iki doğru parçası göster', 'eşit kenarlı üçgeni sil', 'eşit parçaları sil',
    "AC'yi kalın çizgi yap", "AC'yi CD'ye eşitle", 'AC ile AD eşit uzunlukta mı', 'iki çizgi çiz', 'çizgi kalınlığını iki yap',
  ])('%s', (text) => {
    for (const id of topHandler(text, kullanici())) expect(id.startsWith('marks.')).toBe(false);
  });

  it('her örnek kendi sahnesinde çalışır', () => {
    const duz = [pt('pt-A', 0, 0), pt('pt-B', 4, 0), pt('pt-C', 4, 3), pt('pt-D', 0, 3), pt('pt-E', 10, 10), pt('pt-F', 13, 10),
      seg('sAB', 'pt-A', 'pt-B'), seg('sBC', 'pt-B', 'pt-C'), seg('sCD', 'pt-C', 'pt-D'), seg('sEF', 'pt-E', 'pt-F')];
    const yay = [pt('pt-O', 0, 0), pt('pt-A', 4, 0), pt('pt-B', 0, 4), pt('pt-P', 10, 0), pt('pt-C', 14, 0), pt('pt-D', 10, 4),
      arc('yAB', 'pt-O', 'pt-A', 'pt-B'), arc('yCD', 'pt-P', 'pt-C', 'pt-D')];
    for (const h of esitlik.handlers) {
      for (const example of h.examples) {
        const sahne = /yay/i.test(example) && !/eşit yayları/i.test(example) ? yay : duz;
        const r = ok(example, sahne, ['sAB', 'sCD']);
        expect(topHandler(example, sahne)[0]).toBe(h.id);
        expect(r.message.length).toBeGreaterThan(5);
      }
    }
  });
});
