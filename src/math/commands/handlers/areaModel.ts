import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import type { CommandHandler } from '../types';
import { fail, trNum } from '../scene';

/**
 * Alanı Modelle aracı: sütun × satır birim karelik dikdörtgen model (Canvas "Tuvale Ekle" ile aynı nesneler).
 * "4 x 3 alan modeli oluştur", "5 sütun 2 satırlık alan modeli çiz", "3 satır 4 sütunluk alan modeli", "alan modeli çiz" (4 × 3).
 */
export const areaModel: CommandHandler = {
  id: 'polygons.areaModel',
  examples: ['4 x 3 alan modeli oluştur', '5 sütun 2 satırlık alan modeli çiz', '3 satır 6 sütunluk alan modeli oluştur', 'alan modeli çiz', '2x7 alan modeli oluştur', '10 sütun 10 satırlık alan modeli çiz'],
  match(c) {
    if (!c.has(/\balani? model/)) return 0;
    if (c.hasVerb('delete', 'hide', 'color', 'move', 'rename', 'rotate', 'reflect', 'translate', 'copy', 'select')) return 0;
    return 66;
  },
  run(c, scene) {
    const columns = c.paramBefore(/sutun/) ?? c.paramAfter(/sutun/);
    const rows = c.paramBefore(/satir/) ?? c.paramAfter(/satir/);
    const pair = c.match(/#(\d+)\s*(?:x|e|ye|a|ya|carpi|kere)?\s*#(\d+)/);
    let cols = columns ?? (pair ? c.num(`#${pair[1]}`) : undefined);
    let rowCount = rows ?? (pair ? c.num(`#${pair[2]}`) : undefined);
    if (cols === undefined && rowCount === undefined && c.numbers.length === 1) fail('Alan modeli için sütun ve satır sayısını birlikte yazın. Örneğin: “4 x 3 alan modeli oluştur”.');
    cols ??= 4;
    rowCount ??= 3;
    for (const [value, name] of [[cols, 'Sütun'], [rowCount, 'Satır']] as const) {
      if (!Number.isInteger(value) || value < 1 || value > 15) fail(`${name} sayısı 1 ile 15 arasında bir tam sayı olmalı.`);
    }
    const center = scene.placeShape(cols, rowCount);
    const x1 = Math.round(center.x - cols / 2), y1 = Math.round(center.y - rowCount / 2);
    const labels = scene.nextPointLabels(4);
    const corners = [[x1, y1], [x1 + cols, y1], [x1 + cols, y1 + rowCount], [x1, y1 + rowCount]];
    const points = corners.map(([x, y], i) => scene.addPoint({ x, y }, { label: labels[i], color: NESNE_RENGI.zumrut }));
    scene.addPolygon(points.map(p => p.id), {
      kind: 'polygon', label: 'Alan Modeli', color: NESNE_RENGI.zumrut, fillColor: NESNE_RENGI.zumrut, fillOpacity: 0.22, showArea: true, showPerimeter: true, reuse: false,
    });
    scene.say(`Alan modeli oluşturuldu: ${cols} × ${rowCount} = ${trNum(cols * rowCount)} birim kare (${points.map(p => p.label).join('')}).`);
  },
};
