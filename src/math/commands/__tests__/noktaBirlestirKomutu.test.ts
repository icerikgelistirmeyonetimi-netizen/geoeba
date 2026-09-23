import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import { runCommand } from '../engine';

const T = 1750000000000;

const nokta = (id: string, label: string, x: number, y: number, ek: Record<string, unknown> = {}): MathObject =>
  ({ id, type: 'point', label, showLabel: true, x, y, color: '#2563eb', visible: true, isIndependent: true, createdAt: T, ...ek }) as MathObject;

const yap = (o: Record<string, unknown>): MathObject =>
  ({ showLabel: true, visible: true, color: '#000', createdAt: T, label: String(o.id), ...o }) as MathObject;

/** A ile C ÜST ÜSTE; C'den B'ye bir doğru parçası var (kullanıcının ekran görüntüsündeki durum). */
const ustUsteSahne = (): MathObject[] => [
  nokta('pA', 'A', 2, 2, { createdAt: T }),
  nokta('pB', 'B', 6, 2),
  nokta('pC', 'C', 2, 2, { createdAt: T + 100 }),
  yap({ id: 'seg', type: 'segment', startPointId: 'pC', endPointId: 'pB', label: '[CB]' }),
];

/** A ile C AYRI yerlerde. */
const ayriSahne = (): MathObject[] => [nokta('pA', 'A', 0, 0), nokta('pC', 'C', 5, 3)];

const calistir = (metin: string, sahne: MathObject[], secim: string[] = []) => runCommand(metin, sahne, secim);

describe('yazılı/sesli “noktaları birleştir” komutu', () => {
  it.each([
    'A ve C noktalarını birleştir',
    "C'yi A ile birleştir",
    'A ile C noktalarını birleştir',
    'A ile C noktalarını tek nokta yap',
  ])('“%s”: üst üste gelen iki noktayı tek noktaya indirir', (metin) => {
    const r = calistir(metin, ustUsteSahne());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.objects.filter(o => o.type === 'point')).toHaveLength(2);
    const seg = r.objects.find(o => o.id === 'seg');
    expect(seg).toBeTruthy();
    // Kalan nokta C (parçayı o taşıyor); parça artık yalnızca kalan noktayı kullanır
    expect(seg).toMatchObject({ startPointId: 'pC', endPointId: 'pB' });
    expect(r.objects.some(o => o.id === 'pA')).toBe(false);
    expect(r.message).toContain('birleştirildi');
  });

  it('noktalar AYRI yerlerdeyken eski davranış korunur: doğru parçası çizilir', () => {
    const r = calistir('A ve C noktalarını birleştir', ayriSahne());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.objects.filter(o => o.type === 'point')).toHaveLength(2);
    expect(r.objects.filter(o => o.type === 'segment')).toHaveLength(1);
  });

  it('“birleştiren doğru parçası” gibi şekil cümlelerini üstlenmez', () => {
    const r = calistir("A ile C'yi birleştiren doğru parçasını çiz", ustUsteSahne());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.objects.filter(o => o.type === 'point')).toHaveLength(3);
  });

  it('üst üste gelen bütün noktaları tek komutla birleştirir ve sayısını söyler', () => {
    const sahne: MathObject[] = [
      nokta('p1', 'A', 1, 1, { createdAt: T }),
      nokta('p2', 'C', 1, 1, { createdAt: T + 1 }),
      nokta('p3', 'E', 1, 1, { createdAt: T + 2 }),
      nokta('p4', 'B', 5, 1, { createdAt: T }),
      nokta('p5', 'D', 5, 1, { createdAt: T + 1 }),
      yap({ id: 'seg', type: 'segment', startPointId: 'p2', endPointId: 'p5' }),
    ];
    const r = calistir('üst üste gelen noktaları birleştir', sahne);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.objects.filter(o => o.type === 'point')).toHaveLength(2);
    expect(r.message).toContain('3 nokta çifti');
  });

  it('“çakışan noktaları birleştir” de aynı işi yapar', () => {
    const r = calistir('çakışan noktaları birleştir', ustUsteSahne());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.objects.filter(o => o.type === 'point')).toHaveLength(2);
  });

  it('üst üste nokta yoksa açıklayıcı hata verir ve sahneye dokunmaz', () => {
    const r = calistir('üst üste gelen noktaları birleştir', ayriSahne());
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain('Üst üste gelen nokta yok');
  });

  it('birleşmeyle çizilemez duruma gelen nesneleri kaldırdığını söyler', () => {
    const sahne: MathObject[] = [
      nokta('pA', 'A', 2, 2, { createdAt: T }),
      nokta('pC', 'C', 2, 2, { createdAt: T + 1 }),
      yap({ id: 'seg', type: 'segment', startPointId: 'pA', endPointId: 'pC', label: '[AC]' }),
    ];
    const r = calistir('A ve C noktalarını birleştir', sahne);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.objects.filter(o => o.type === 'segment')).toHaveLength(0);
    expect(r.message).toContain('kaldırıldı');
  });

  it('başka fiillerin komutlarını kapmaz ("A noktasını sil")', () => {
    const r = calistir('A noktasını sil', ustUsteSahne());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.objects.some(o => o.id === 'pA')).toBe(false);
    expect(r.objects.some(o => o.id === 'pC')).toBe(true);
  });
});
