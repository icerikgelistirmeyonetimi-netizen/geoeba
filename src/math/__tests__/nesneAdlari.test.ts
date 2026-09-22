import { describe, it, expect } from 'vitest';
import { describe as adi, describeList, noktalari, noktalariyla, silmeIpucu } from '@/math/nesneAdlari';
import { describe as targetsAdi, describeList as targetsListe } from '@/math/commands/handlers/edit/targets';
import type { MathObject } from '@/types/math';

const t = 1750000000000;
const nokta = (id: string, ek: Record<string, unknown> = {}): MathObject =>
  ({ id, type: 'point', label: id, showLabel: true, x: 0, y: 0, visible: true, isIndependent: true, createdAt: t, ...ek }) as MathObject;
const yap = (o: Record<string, unknown>): MathObject =>
  ({ showLabel: true, visible: true, createdAt: t, label: String(o.id), ...o }) as MathObject;

const ucgen = () => [
  nokta('A'), nokta('B'), nokta('C'),
  yap({ id: 'ucgen', type: 'polygon', pointIds: ['A', 'B', 'C'], label: 'ABC' }),
];

describe('Nokta listeleri', () => {
  it('tekil, çoğul ve kalabalık', () => {
    expect(noktalari(['A'])).toBe('A noktası');
    expect(noktalari(['A', 'B'])).toBe('A ve B noktaları');
    expect(noktalari(['A', 'B', 'C'])).toBe('A, B ve C noktaları');
    expect(noktalariyla(['A'])).toBe('A noktasıyla');
    expect(noktalariyla(['A', 'B', 'C'])).toBe('A, B ve C noktalarıyla');
    const dokuz = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    expect(noktalariyla(dokuz)).toBe('9 noktasıyla');
    expect(noktalari(dokuz)).toBe('9 nokta');
  });
});

describe('Silme ipucu', () => {
  it('şekil kendi noktalarıyla silinince noktaları sayar', () => {
    expect(silmeIpucu(ucgen(), ['ucgen'], ['A', 'B', 'C'])).toBe(
      "ABC üçgeni A, B ve C noktalarıyla birlikte silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın."
    );
  });

  it('“Yalnızca şekli sil” kalan noktaları söyler', () => {
    expect(silmeIpucu(ucgen(), ['ucgen'], [], ['A', 'B', 'C'])).toBe(
      "ABC üçgeni silindi; A, B ve C noktaları yerinde kaldı. Geri almak için Geri Al'ı (Ctrl+Z) kullanın."
    );
    expect(silmeIpucu(ucgen(), ['ucgen'], [], ['A'])).toContain('A noktası yerinde kaldı');
  });

  it('açı, ölçüm ve nokta silmede ipucu yoktur (rozetin kendi ipucu ezilmesin)', () => {
    const o = [...ucgen(), yap({ id: 'aci', type: 'angle', point1Id: 'B', vertexPointId: 'A', point3Id: 'C' })];
    expect(silmeIpucu(o, ['aci'], [])).toBeNull();
    expect(silmeIpucu(o, ['A'], [])).toBeNull();
  });

  it('yalnızca GİZLİ nokta gittiyse ipucu yoktur', () => {
    const o = [...ucgen(), nokta('G', { visible: false })];
    expect(silmeIpucu(o, ['ucgen'], ['G'])).toBeNull();
    expect(silmeIpucu(o, ['ucgen'], ['G', 'A'])).toContain('A noktasıyla birlikte silindi');
  });

  it('görünür noktası olmayan silmede sessiz kalır (ortak noktalar)', () => {
    expect(silmeIpucu(ucgen(), ['ucgen'], [])).toBeNull();
  });
});

describe('Komut motoruyla aynı adlar', () => {
  it('targets.ts yeniden dışa aktarımı aynı sonucu verir', () => {
    const o = ucgen();
    for (const nesne of o) expect(targetsAdi(nesne)).toBe(adi(nesne));
    expect(targetsListe(o)).toBe(describeList(o));
    expect(adi(o[3])).toBe('ABC üçgeni');
  });
});
