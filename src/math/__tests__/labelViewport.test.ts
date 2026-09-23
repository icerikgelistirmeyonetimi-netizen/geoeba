import { describe, expect, it } from 'vitest';
import type { Point2D, ViewportTransform } from '@/types/math';
import { worldToScreen } from '../coordinates';
import { LABEL_LAYOUT_ZOOM, labelLayoutViewport, labelZoomScale, projectLabelPoint, unprojectLabelPoint } from '../labelViewport';

const viewport: ViewportTransform = {
  zoom: 44, width: 1000, height: 800, panX: 17, panY: -23,
  showGrid: true, showAxes: false, showCoordinates: true, snapToGrid: true, gridStep: 0.5,
  gridStyle: 'izometrik', gridOpacity: 0.4, showMeasurements: true,
};
const close = (actual: Point2D, expected: Point2D) => {
  expect(actual.x).toBeCloseTo(expected.x, 10);
  expect(actual.y).toBeCloseTo(expected.y, 10);
};

describe('ölçüm etiketleri için sabit yerleşim görünümü', () => {
  it('44 ölçeğinde sıfır merkezli görünüm üretir; kullanıcı ayarlarını ve girdiyi korur', () => {
    const source = { ...viewport, zoom: 132, panX: 200, panY: -150 };
    const initial = { ...source };
    const layout = labelLayoutViewport(source);
    expect(LABEL_LAYOUT_ZOOM).toBe(44);
    expect(layout).toEqual({ ...initial, width: 0, height: 0, panX: 0, panY: 0, zoom: 44 });
    expect(source).toEqual(initial);
    expect(layout).not.toBe(source);
  });

  it.each([
    [11, 0.25], [22, 0.5], [44, 1], [66, 1.5], [132, 3],
  ])('zoom %i için yazı ve kutu ölçeği %s olur', (zoom, expected) => {
    expect(labelZoomScale({ ...viewport, zoom })).toBe(expected);
  });

  it('negatif dünya koordinatını kaydırılmış tuvale doğru yönde yansıtır', () => {
    const vp = { ...viewport, zoom: 11 };
    // Dünya (-2,5; -1,75), sabit yerleşimde (-110; 77).
    expect(projectLabelPoint({ x: -110, y: 77 }, vp)).toEqual({ x: 489.5, y: 396.25 });
    expect(unprojectLabelPoint({ x: 489.5, y: 396.25 }, vp)).toEqual({ x: -110, y: 77 });
  });

  it.each([11, 22, 44, 66, 132])('zoom %i iken dört bölgedeki noktalar aynı sabit yerleşime döner', (zoom) => {
    const vp = { ...viewport, zoom, width: 1366, height: 768, panX: -143, panY: 79 };
    const layout = labelLayoutViewport(vp);
    for (const world of [{ x: -3.25, y: -1.75 }, { x: -3.25, y: 1.75 }, { x: 3.25, y: -1.75 }, { x: 3.25, y: 1.75 }]) {
      const canonical = worldToScreen(world, layout);
      close(canonical, { x: world.x * 44, y: -world.y * 44 });
      const screen = projectLabelPoint(canonical, vp);
      close(screen, worldToScreen(world, vp));
      close(unprojectLabelPoint(screen, vp), canonical);
    }
  });

  it('kaydırma, yeniden boyutlandırma ve zoom döngüsü etiket konumunu biriktirerek kaydırmaz', () => {
    const initial = { x: -121.5, y: 83.25 };
    let canonical = { ...initial };
    const cycle = [
      viewport,
      { ...viewport, zoom: 22, width: 1200, height: 640, panX: 120, panY: -300 },
      { ...viewport, zoom: 132, width: 500, height: 1000, panX: -77, panY: 211 },
      { ...viewport, zoom: 11, width: 1920, height: 1080, panX: -540, panY: 190 },
      viewport,
    ];
    const startScreen = projectLabelPoint(initial, viewport);
    for (let round = 0; round < 10; round++) for (const vp of cycle) {
      canonical = unprojectLabelPoint(projectLabelPoint(canonical, vp), vp);
      close(canonical, initial);
    }
    close(projectLabelPoint(canonical, viewport), startScreen);
  });

  it('etiket aralıkları yazı ölçeğiyle birlikte büyür; pan ve tuval boyutu aralığı değiştirmez', () => {
    const a = { x: -110, y: 77 };
    const b = { x: -88, y: 95 };
    for (const zoom of [11, 22, 44, 132]) {
      const vp = { ...viewport, zoom, width: 987, height: 654, panX: -99, panY: 123 };
      const pa = projectLabelPoint(a, vp);
      const pb = projectLabelPoint(b, vp);
      close({ x: pb.x - pa.x, y: pb.y - pa.y }, { x: 22 * labelZoomScale(vp), y: 18 * labelZoomScale(vp) });
    }
  });
});
