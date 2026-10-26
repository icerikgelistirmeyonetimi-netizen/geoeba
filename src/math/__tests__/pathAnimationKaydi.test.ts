import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject } from '@/types/math';
import { advancePointOnHost, evaluatePointOnPath, getPointPathParameter } from '../pathAnimation';

/*
 * Taşıyıcı üzerinde canlandırma (pathAnimation) çıktı kaydı: bütün taşıyıcı türleri, eksik / dejenere geometri,
 * parametre, konum ve bütün kip × yön × adım birleşimleri. Kod yeniden yazılırken değişmemesi için önceki koda göre
 * alındı; sayılar 9 ondalığa yuvarlanır.
 */

const nk = (id: string, x: number, y: number) => ({ id, type: 'point', label: id, x, y, visible: true }) as unknown as PointObject;
const o = (id: string, type: string, alanlar: Record<string, unknown>) => ({ id, type, label: id, visible: true, ...alanlar }) as unknown as MathObject;

const sahne: MathObject[] = [
  nk('A', -2, -1), nk('B', 3, 1.5), nk('C', 0.5, 4), nk('D', 4, -2), nk('M', 1, 1), nk('R', 3, 1), nk('Z', 1, 1),
  o('seg', 'segment', { startPointId: 'A', endPointId: 'B' }),
  o('seg0', 'segment', { startPointId: 'M', endPointId: 'Z' }),
  o('segX', 'segment', { startPointId: 'A', endPointId: 'yok' }),
  o('cir', 'circle', { centerPointId: 'M', radiusPointId: 'R' }),
  o('cirF', 'circle', { centerPointId: 'M', fixedRadius: 1.5 }),
  o('cir0', 'circle', { centerPointId: 'M', radiusPointId: 'Z' }),
  o('cirX', 'circle', { centerPointId: 'yok', fixedRadius: 2 }),
  o('arc', 'arc', { centerPointId: 'M', startPointId: 'R', directionPointId: 'C' }),
  o('sec', 'sector', { centerPointId: 'M', startPointId: 'C', directionPointId: 'R' }),
  o('arc0', 'arc', { centerPointId: 'M', startPointId: 'Z', directionPointId: 'C' }),
  o('elp', 'ellipse', { centerPointId: 'M', radiusX: 3, radiusY: 1.5 }),
  o('elp0', 'ellipse', { centerPointId: 'M', radiusX: 0, radiusY: 0 }),
  o('poly', 'polygon', { pointIds: ['A', 'B', 'C'] }),
  o('poly4', 'polygon', { pointIds: ['A', 'D', 'B', 'Z', 'M', 'C'] }),
  o('poly1', 'polygon', { pointIds: ['A', 'yok'] }),
  o('poly0', 'polygon', { pointIds: ['M', 'Z'] }),
  o('ln', 'line', { point1Id: 'A', point2Id: 'B' }),
  o('ln0', 'line', { point1Id: 'M', point2Id: 'Z' }),
  o('ray', 'ray', { startPointId: 'C', throughPointId: 'D' }),
  o('fn', 'function', { expression: 'x' }),
];
const tasiyicilar = sahne.filter((n) => n.type !== 'point');
const yoklamalar = [nk('P', 0, 0), nk('Q', 2.2, 3.1), nk('S', -3, 2), nk('T', 5, -4), nk('U', 1, 1)];
const parametreler = [-7, -1.3, -0.2, 0, 0.25, 0.5, 0.999, 1, 1.7, 3.5, Math.PI, 2 * Math.PI, 7];

const y = (n: number) => (Number.isFinite(n) ? Math.round(n * 1e9) / 1e9 + 0 : String(n));
const nokta = (p: { x: number; y: number } | null) => (p ? [y(p.x), y(p.y)] : null);

describe('pathAnimation çıktı kaydı', () => {
  it.each(tasiyicilar.map((t) => t.id))('%s: parametre ve konum', (id) => {
    const t = tasiyicilar.find((n) => n.id === id)!;
    expect({
      parametre: yoklamalar.map((p) => y(getPointPathParameter(p, t, sahne))),
      konum: parametreler.map((p) => nokta(evaluatePointOnPath(p, t, sahne))),
    }).toMatchSnapshot();
  });

  it.each(tasiyicilar.map((t) => t.id))('%s: ilerletme (kip × yön × adım × başlangıç)', (id) => {
    const t = tasiyicilar.find((n) => n.id === id)!;
    const sonuclar: unknown[] = [];
    for (const kip of [undefined, 'oscillating', 'increasing', 'decreasing', 'increasing_once'] as const) {
      for (const yon of [1, -1] as const) {
        for (const ilerleme of [undefined, -0.4, 0, 0.3, 0.97, 1, 3, 6.2, 2 * Math.PI, 6.4, 4.99, -4.9]) {
          for (const [dt, hiz, tur] of [[0.016, undefined, undefined], [0.5, 2, 8], [3, 1, 2], [0.1, -1, 8]] as const) {
            const p = { ...yoklamalar[1], animMode: kip, animProgress: ilerleme, animSpeed: hiz } as PointObject;
            const r = advancePointOnHost(p, t, sahne, yon, dt, tur);
            sonuclar.push(r ? [y(r.x), y(r.y), y(r.progress), r.direction] : null);
          }
        }
      }
    }
    expect(sonuclar).toMatchSnapshot();
  });
});
