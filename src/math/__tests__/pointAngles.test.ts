import { describe, expect, it } from 'vitest';
import { MathObject, PointObject } from '@/types/math';
import { ACI_MENU_SINIRI, angleNeighbourIds, noktadakiAcilar, pointAngleAction, providesAngleArm } from '../pointAngles';

const base = { showLabel: true, color: 'blue', visible: true, createdAt: 0 };
const point = (id: string, x: number, y: number): PointObject => ({ ...base, id, label: id, type: 'point', x, y, isIndependent: true });
const A = point('A', 0, 0), B = point('B', 4, 0), C = point('C', 0, 3), P = point('P', 2, 0), Q = point('Q', -3, 0);
const seg = (id: string, s: string, e: string): MathObject => ({ ...base, id, label: id, type: 'segment', startPointId: s, endPointId: e });
const circle = (id: string, center: string, radiusPointId?: string): MathObject =>
  ({ ...base, id, label: id, type: 'circle', centerPointId: center, ...(radiusPointId ? { radiusPointId } : { fixedRadius: 2 }) });
const triangle: MathObject = { ...base, id: 'poly', label: 'ABC', type: 'polygon', pointIds: ['A', 'B', 'C'] };

describe('pointAngleAction (sağ tık "Açısını ölç")', () => {
  it('düz çember merkezinde, yalnız noktada ve yarıçap noktasında sunulmaz', () => {
    expect(pointAngleAction('A', [A, circle('c', 'A')])).toBeNull();
    expect(pointAngleAction('A', [A, P, circle('c', 'A', 'P')])).toBeNull();
    expect(pointAngleAction('P', [A, P, circle('c', 'A', 'P')])).toBeNull();
    expect(pointAngleAction('Q', [A, Q])).toBeNull();
  });

  it('aynı zamanda çokgen köşesi olan çember merkezinde sunulur', () => {
    expect(pointAngleAction('A', [A, B, C, circle('c', 'A'), triangle])).toEqual({ kind: 'vertex', neighbourIds: ['C', 'B'] });
  });

  it('iki FARKLI komşu kenar gerekir', () => {
    expect(pointAngleAction('A', [A, B, seg('s1', 'A', 'B')])).toBeNull();
    expect(angleNeighbourIds('A', [A, B, seg('s1', 'A', 'B'), seg('s2', 'B', 'A')])).toEqual(['B']);
    expect(pointAngleAction('A', [A, seg('s0', 'A', 'A'), seg('s3', 'A', 'GONE')])).toBeNull();
    const mixed: MathObject[] = [A, B, C, seg('s1', 'A', 'B'),
      { ...base, id: 'r', label: 'r', type: 'ray', startPointId: 'A', throughPointId: 'C' }];
    expect(pointAngleAction('A', mixed)).toEqual({ kind: 'vertex', neighbourIds: ['B', 'C'] });
  });

  it('measureAngleAtPoint sırasını korur: önce parça/doğru/ışın, sonra çokgen komşuları', () => {
    const line: MathObject = { ...base, id: 'l', label: 'l', type: 'line', point1Id: 'Q', point2Id: 'A' };
    expect(angleNeighbourIds('A', [triangle, A, B, C, Q, line])).toEqual(['Q', 'C', 'B']);
  });

  it('yay / dilim merkezi merkez açı düğmesidir', () => {
    const arc: MathObject = { ...base, id: 'arc', label: 'arc', type: 'arc', centerPointId: 'A', startPointId: 'B', directionPointId: 'C' };
    expect(pointAngleAction('A', [A, B, C, arc])).toEqual({ kind: 'central', shape: arc, shapes: [arc] });
    // Bölünmüş çemberin merkezinde iki yay: ikisi birlikte açılıp kapanır
    const arc2 = { ...arc, id: 'arc2', startPointId: 'C', directionPointId: 'B' } as MathObject;
    const both = pointAngleAction('A', [A, B, C, arc, arc2]);
    expect(both?.kind === 'central' && both.shapes.map((s) => s.id)).toEqual(['arc', 'arc2']);
    const sector = { ...arc, id: 'sec', type: 'sector' } as MathObject;
    expect(pointAngleAction('A', [A, B, C, circle('c', 'A'), sector])?.kind).toBe('central');
    expect(pointAngleAction('B', [A, B, C, arc])).toBeNull();
  });
});

describe('noktadakiAcilar (sağ tık "Açı ölç" alt menüsü)', () => {
  // E köşesi kullanıcının ekranındaki gibi: üç kol (yukarı I, sağa F, sol-aşağı G).
  const E = point('E', 0, 0), I = point('I', 0, 3), F = point('F', 4, 0), G = point('G', -3, -3);
  const D = point('D', 0, -3);
  const uc: MathObject[] = [E, I, F, G, seg('s1', 'E', 'I'), seg('s2', 'E', 'F'), seg('s3', 'E', 'G')];
  const aci = (id: string, p1: string, v: string, p3: string, extra: Partial<MathObject> = {}): MathObject =>
    ({ ...base, id, label: `∠${p1}${v}${p3}`, type: 'angle', point1Id: p1, vertexPointId: v, point3Id: p3, showValue: true, ...extra } as MathObject);

  it('üç kollu köşede ÜÇ açı listeler; sıra ekrandaki gibi (önce komşu kollar)', () => {
    const liste = noktadakiAcilar('E', uc);
    expect(liste.map((a) => a.title)).toEqual(['FEI', 'IEG', 'GEF']);
    expect(liste.map((a) => Math.round(a.degrees))).toEqual([90, 135, 135]);
    expect(liste.map((a) => a.armIds)).toEqual([['F', 'I'], ['I', 'G'], ['G', 'F']]);
    expect(liste.every((a) => a.vertexId === 'E')).toBe(true);
    expect(liste.every((a) => a.existingId === undefined)).toBe(true);
    // Üç açının toplamı tam turdur
    expect(Math.round(liste.reduce((t, a) => t + a.degrees, 0))).toBe(360);
  });

  it('dört kollu köşede n*(n-1)/2 = 6 açı: önce komşu çiftler, sonra karşılıklılar (bir kez)', () => {
    const dort: MathObject[] = [A, B, C, Q, D, seg('s1', 'A', 'B'), seg('s2', 'A', 'C'), seg('s3', 'A', 'Q'), seg('s4', 'A', 'D')];
    const liste = noktadakiAcilar('A', dort);
    expect(liste.map((a) => a.title)).toEqual(['BAC', 'CAQ', 'QAD', 'DAB', 'BAQ', 'CAD']);
    expect(liste.map((a) => Math.round(a.degrees))).toEqual([90, 90, 90, 90, 180, 180]);
  });

  it('çokgen köşesinde tek açı (iki komşu kenar), kol sırası yönlere göre', () => {
    const liste = noktadakiAcilar('A', [A, B, C, triangle]);
    expect(liste).toHaveLength(1);
    expect(liste[0].title).toBe('BAC');
    expect(Math.round(liste[0].degrees)).toBe(90);
  });

  it('kollar doğru ve ışından gelebilir; karşılıklı (doğrusal) kollar 180°', () => {
    const line: MathObject = { ...base, id: 'l', label: 'l', type: 'line', point1Id: 'Q', point2Id: 'A' };
    const ray: MathObject = { ...base, id: 'r', label: 'r', type: 'ray', startPointId: 'A', throughPointId: 'C' };
    const liste = noktadakiAcilar('A', [A, B, C, Q, seg('s1', 'A', 'B'), line, ray]);
    expect(liste.map((a) => a.title)).toEqual(['BAC', 'CAQ', 'QAB']);
    expect(liste.map((a) => Math.round(a.degrees))).toEqual([90, 90, 180]);
  });

  it('üst üste binen şekillerden gelen aynı komşu bir kez sayılır; sarkık kimlik sayılmaz', () => {
    const cift: MathObject[] = [A, B, C, triangle, seg('s1', 'A', 'B'), seg('s2', 'B', 'A'), seg('s3', 'A', 'GONE')];
    const liste = noktadakiAcilar('A', cift);
    expect(liste).toHaveLength(1);
    expect(liste[0].title).toBe('BAC');
  });

  it('iki kolu olmayan nokta (yalnız nokta, tek kenar, yok olan köşe) boş liste verir', () => {
    expect(noktadakiAcilar('A', [A, B, seg('s1', 'A', 'B')])).toEqual([]);
    expect(noktadakiAcilar('A', [A, B, C])).toEqual([]);
    expect(noktadakiAcilar('YOK', uc)).toEqual([]);
    // Düz çember merkezi kenar değildir
    expect(noktadakiAcilar('A', [A, P, circle('c', 'A', 'P')])).toEqual([]);
  });

  it('ölçülmüş açı işaretli gelir; değeri gizlenmişse işaretli SAYILMAZ', () => {
    const olculu = noktadakiAcilar('E', [...uc, aci('ang1', 'I', 'E', 'F')]);
    expect(olculu[0]).toMatchObject({ title: 'FEI', existingId: 'ang1', existingShown: true });
    expect(olculu.slice(1).every((a) => a.existingId === undefined)).toBe(true);
    // Kol sırası ters yazılmış açı da bulunur
    const ters = noktadakiAcilar('E', [...uc, aci('ang2', 'G', 'E', 'I')]);
    expect(ters.find((a) => a.title === 'IEG')?.existingId).toBe('ang2');
    const gizli = noktadakiAcilar('E', [...uc, aci('ang3', 'I', 'E', 'F', { showValue: false })]);
    expect(gizli[0]).toMatchObject({ existingId: 'ang3', existingShown: false });
    const gorunmez = noktadakiAcilar('E', [...uc, aci('ang4', 'I', 'E', 'F', { visible: false })]);
    expect(gorunmez[0].existingShown).toBe(false);
    // Başka köşedeki açı bu köşeye sayılmaz
    expect(noktadakiAcilar('E', [...uc, aci('ang5', 'E', 'I', 'F')])[0].existingId).toBeUndefined();
  });

  it('DIŞ açıya çevrilmiş ölçüm menüde de tuvaldeki değeri gösterir (360 − iç açı)', () => {
    const disAci = noktadakiAcilar('E', [...uc, aci('ang6', 'I', 'E', 'G', { reflex: true })]);
    const satir = disAci.find((a) => a.title === 'IEG');
    expect(satir?.existingId).toBe('ang6');
    expect(Math.round(satir!.degrees)).toBe(225);
    // Ölçülmemiş kardeşleri iç açı olarak kalır
    expect(Math.round(disAci.find((a) => a.title === 'GEF')!.degrees)).toBe(135);
  });

  it('aynı yöndeki (0°) ve köşeyle çakışık kollar yozlaşmış açı üretmez', () => {
    // H, E–F kolunun üstünde: "FEH" 0°'lik anlamsız bir açı olurdu
    const H = point('H', 2, 0);
    const liste = noktadakiAcilar('E', [...uc, H, seg('s4', 'E', 'H')]);
    expect(liste.some((a) => a.title === 'FEH' || a.title === 'HEF')).toBe(false);
    expect(liste.every((a) => a.degrees > 0)).toBe(true);
    // Köşeyle ÇAKIŞIK kol (uzunluğu sıfır) hiçbir açı kurmaz
    const Z = point('Z', 0, 0);
    const cakisik = noktadakiAcilar('E', [E, F, Z, seg('s5', 'E', 'F'), seg('s6', 'E', 'Z')]);
    expect(cakisik).toEqual([]);
  });

  it('menü sınırı vardır (alt menü kaydırılmaz)', () => {
    expect(ACI_MENU_SINIRI).toBeGreaterThan(2);
  });
});

describe('providesAngleArm (silme zincirinde açının kolu)', () => {
  it('doğru parçası iki yönde de kolu çizer', () => {
    expect(providesAngleArm(seg('s', 'A', 'B'), 'A', 'B')).toBe(true);
    expect(providesAngleArm(seg('s', 'B', 'A'), 'A', 'B')).toBe(true);
    expect(providesAngleArm(seg('s', 'A', 'C'), 'A', 'B')).toBe(false);
  });

  it('doğru tanım noktalarıyla, ışın her iki yönde kolu çizer', () => {
    const line: MathObject = { ...base, id: 'l', label: 'l', type: 'line', point1Id: 'Q', point2Id: 'A' };
    expect(providesAngleArm(line, 'A', 'Q')).toBe(true);
    expect(providesAngleArm(line, 'A', 'B')).toBe(false);
    const ray: MathObject = { ...base, id: 'r', label: 'r', type: 'ray', startPointId: 'A', throughPointId: 'C' };
    expect(providesAngleArm(ray, 'A', 'C')).toBe(true);
    expect(providesAngleArm(ray, 'C', 'A')).toBe(true);
  });

  it('çokgende yalnızca KOMŞU köşeler (son->ilk kenar dâhil); köşegen kol değildir', () => {
    const kare: MathObject = { ...base, id: 'k', label: 'k', type: 'polygon', pointIds: ['A', 'B', 'C', 'D'] };
    expect(providesAngleArm(kare, 'A', 'B')).toBe(true);
    expect(providesAngleArm(kare, 'C', 'B')).toBe(true);
    expect(providesAngleArm(kare, 'A', 'D')).toBe(true);
    expect(providesAngleArm(kare, 'A', 'C')).toBe(false);
    expect(providesAngleArm(kare, 'B', 'D')).toBe(false);
  });

  it('köşe ile uç aynıysa ya da şekil kol çizmiyorsa false', () => {
    expect(providesAngleArm(seg('s0', 'A', 'A'), 'A', 'A')).toBe(false);
    expect(providesAngleArm(circle('c', 'A', 'B'), 'A', 'B')).toBe(false);
    expect(providesAngleArm(A, 'A', 'B')).toBe(false);
    const arc: MathObject = { ...base, id: 'arc', label: 'arc', type: 'arc', centerPointId: 'A', startPointId: 'B', directionPointId: 'C' };
    expect(providesAngleArm(arc, 'A', 'B')).toBe(false);
  });
});
