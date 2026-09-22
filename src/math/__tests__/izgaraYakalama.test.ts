import { describe, expect, it } from 'vitest';
import { AUTO_SNAP_PX, nearestIsometricPoint, snapPointToGrid } from '../coordinates';

const v = (patch: Record<string, unknown> = {}) => ({
  snapToGrid: true,
  pointSnapMode: 'snapToGrid' as const,
  showGrid: true,
  gridStyle: 'kareli' as const,
  zoom: 40,
  ...patch,
}) as Parameters<typeof snapPointToGrid>[1];

describe('ızgaraya yakalama: modlar ve ızgara biçimleri', () => {
  it('kapalıyken (snapToGrid false ya da mod off) nokta olduğu gibi kalır', () => {
    expect(snapPointToGrid({ x: 1.3, y: 2.6 }, v({ snapToGrid: false }), 1)).toEqual({ x: 1.3, y: 2.6 });
    expect(snapPointToGrid({ x: 1.3, y: 2.6 }, v({ pointSnapMode: 'off' }), 1)).toEqual({ x: 1.3, y: 2.6 });
  });

  it('Izgaraya Sıçra ve Sabitli: kareli ve noktalı ızgarada en yakın kare örgü noktası', () => {
    for (const gridStyle of ['kareli', 'noktali'] as const) {
      expect(snapPointToGrid({ x: 1.3, y: 2.6 }, v({ gridStyle }), 1)).toEqual({ x: 1, y: 3 });
      expect(snapPointToGrid({ x: 1.3, y: 2.6 }, v({ gridStyle, pointSnapMode: 'fixedToGrid' }), 0.5)).toEqual({ x: 1.5, y: 2.5 });
    }
  });

  it('eski kayıtlar: mod yoksa snapToGrid açıkken sıçrar', () => {
    expect(snapPointToGrid({ x: 0.4, y: -0.6 }, v({ pointSnapMode: undefined }), 1)).toEqual({ x: 0, y: -1 });
  });

  it('Otomatik: yalnız ızgara görünürken ve yakınken yakalar', () => {
    const esik = AUTO_SNAP_PX / 40;
    expect(snapPointToGrid({ x: 2 + esik * 0.5, y: 3 }, v({ pointSnapMode: 'automatic' }), 1)).toEqual({ x: 2, y: 3 });
    expect(snapPointToGrid({ x: 2 + esik * 2, y: 3 }, v({ pointSnapMode: 'automatic' }), 1)).toEqual({ x: 2 + esik * 2, y: 3 });
    expect(snapPointToGrid({ x: 2.01, y: 3 }, v({ pointSnapMode: 'automatic', showGrid: false }), 1)).toEqual({ x: 2.01, y: 3 });
  });

  it('izometrik örgü: düğümler (m·s·√3/2, m·s/2 + k·s); en yakın düğüme oturur', () => {
    const h = Math.sqrt(3) / 2;
    expect(nearestIsometricPoint({ x: 0.1, y: 0.2 }, 1)).toEqual({ x: 0, y: 0 });
    const q = nearestIsometricPoint({ x: h + 0.05, y: 0.45 }, 1);
    expect(q.x).toBeCloseTo(h, 9);
    expect(q.y).toBeCloseTo(0.5, 9);
    const r = nearestIsometricPoint({ x: -h * 2 - 0.1, y: -1.1 }, 1);
    expect(r.x).toBeCloseTo(-2 * h, 9);
    expect(r.y).toBeCloseTo(-1, 9);
  });

  it('izometrik ızgarada yakalanan her nokta gerçekten bir düğümdür ve en fazla bir kenar uzaklıktadır', () => {
    const h = Math.sqrt(3) / 2;
    for (let i = 0; i < 200; i++) {
      const p = { x: Math.sin(i * 1.7) * 7, y: Math.cos(i * 2.3) * 7 };
      const q = snapPointToGrid(p, v({ gridStyle: 'izometrik' }), 1);
      const m = Math.round(q.x / h);
      expect(q.x).toBeCloseTo(m * h, 9);
      const k = (q.y - m / 2);
      expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-9);
      expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeLessThanOrEqual(1 / Math.sqrt(3) + 1e-9);
    }
  });

  it('izometrik ızgara en az 1 birim kenarlı (yakın yakınlaştırmada 0,5 adım olsa da)', () => {
    const q = snapPointToGrid({ x: 0.1, y: 0.55 }, v({ gridStyle: 'izometrik' }), 0.5);
    expect(q).toEqual({ x: 0, y: 1 });
  });
});
