import { describe, expect, it } from 'vitest';
import type { MathObject, PolygonObject } from '@/types/math';
import { executeTurkishCommand } from '@/math/turkishCommands';
import { ilkokulGorunumu } from '@/components/workspace/ilkokulKipi';
import { olcumKartKutulari } from '@/math/olcuYazimlari';
import { CommandScene } from '../scene';
import { byType } from './helpers';
import type { EngineOptions } from '../types';

const studio: EngineOptions = { showMeasurementsOnCreate: false };
function run(text: string, objects: MathObject[] = [], selection: string[] = [], options = studio) {
  const before = JSON.stringify(objects);
  const result = executeTurkishCommand(text, objects, selection, options);
  if (!result.ok) throw new Error(`${text}: ${result.message}`);
  expect(JSON.stringify(objects)).toBe(before);
  return result;
}
function cards(objects: MathObject[], primary = false) {
  return olcumKartKutulari({
    objects: primary ? ilkokulGorunumu(objects) : objects,
    viewport: { width: 800, height: 600, zoom: 40, panX: 0, panY: 0 } as never,
    yazim: { olcuYazimi: 'tam', aciYazimi: 'sapka', tamSayi: true, yaklasikSozcukle: true },
    px: () => 11,
  });
}

describe('Stüdyoda yeni çizim ile açık ölçüm isteği ayrı tutulur', () => {
  it.each(['kare çiz', 'dikdörtgen çiz', 'üçgen çiz', '6 kenarlı düzgün çokgen çiz', 'yarıçapı 2 olan daire çiz', 'elips çiz'])(
    '%s: başlangıçta sayısal ölçüm kartı veya kenar sonucu yok', text => {
      const made = run(text);
      expect(cards(made.objects)).toHaveLength(0);
      expect(cards(made.objects, true)).toHaveLength(0);
      for (const shape of byType(made.objects, 'polygon')) expect(shape.edgeLabels ?? []).toHaveLength(0);
    },
  );

  it('kare alanını ancak istendiğinde gösterir; kaynak veriyi değiştirmeden gizler', () => {
    const made = run('kenar uzunluğu 4 olan kare çiz');
    const square = byType(made.objects, 'polygon')[0];
    const measured = run('alanını ölç', made.objects, [square.id]);
    expect(cards(measured.objects).map(c => c.duz)).toEqual(['A(ABCD) = 16 birimkare']);
    expect(cards(measured.objects, true).map(c => c.duz)).toEqual(['Alan = 16 birimkare']);
    expect(square.showArea).toBe(false);
    const hidden = run('alanını gizle', measured.objects, [square.id]);
    expect(cards(hidden.objects)).toHaveLength(0);
  });

  it('birleşik komuttaki açık çevre isteğini korur; eğik kenarların gerçek toplamını gösterir', () => {
    const scene = new CommandScene([], [], studio);
    const pts = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 4 }].map((p, i) => scene.addPoint(p, { label: 'ABC'[i] }));
    const triangle = scene.addPolygon(pts.map(p => p.id), { kind: 'triangle' });
    expect(cards(scene.objects)).toHaveLength(0);
    const measured = run('çevresini ölç', scene.objects, [triangle.id]);
    expect(cards(measured.objects).map(c => c.duz)).toEqual(['Ç(ABC) yaklaşık 13 br']);
    expect(cards(measured.objects, true).map(c => c.duz)).toEqual(['Çevre yaklaşık 13 br']);
    const combined = run('kenar uzunluğu 4 olan kare çiz ve alanını ölç');
    expect(cards(combined.objects).map(c => c.duz)).toEqual(['A(ABCD) = 16 birimkare']);
    expect(cards(combined.objects, true).map(c => c.duz)).toEqual(['Alan = 16 birimkare']);
  });

  it('parça ve açı çizimi sonuçsuzdur; açık ölçme komutu sonuçlarını açar', () => {
    const segment = run('AB doğru parçası çiz');
    expect(byType(segment.objects, 'segment')[0].showLength).toBe(false);
    expect(byType(run('AB uzunluğunu ölç', segment.objects).objects, 'segment')[0].showLength).toBe(true);
    const angle = run('60 derecelik ABC açısı çiz');
    expect(byType(angle.objects, 'angle')[0].showValue).toBe(false);
    const measured = run('ABC açısını ölç', angle.objects);
    expect(byType(ilkokulGorunumu(measured.objects), 'angle')[0].showValue).toBe(true);
  });

  it('mevcut noktalardan istenen yeni açı ölçümünü de gösterir', () => {
    const scene = new CommandScene([], [], studio);
    scene.addPoint({ x: 3, y: 0 }, { label: 'A' });
    scene.addPoint({ x: 0, y: 0 }, { label: 'B' });
    scene.addPoint({ x: 0, y: 4 }, { label: 'C' });
    expect(byType(ilkokulGorunumu(run('ABC açısını ölç', scene.objects).objects), 'angle')[0].showValue).toBe(true);
  });

  it('yay ve dilimde otomatik merkez açısı yoktur; açık seçenekler korunur', () => {
    const scene = new CommandScene([], [], studio);
    const pts = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 3 }].map((p, i) => scene.addPoint(p, { label: 'ABC'[i] }));
    const [a, b, c] = pts.map(p => p.id);
    expect(scene.addArc(a, b, c)).toMatchObject({ showArcLength: false, showCentralAngle: false });
    expect(scene.addSector(a, b, c)).toMatchObject({ showArea: false, showCentralAngle: false });
    expect(scene.addCircle({ centerId: a, radius: 3 }, { showArea: true }).showArea).toBe(true);
    expect(scene.addSegment(a, b, { showLength: true }).showLength).toBe(true);
    expect(scene.addPolygon([a, b, c], { showArea: true }).showArea).toBe(true);
  });

  it('hazır örneklerin ölçülerini ve açık ölçüm seçeneğini korur', () => {
    const prepared = run('kare çiz', [], [], {});
    const square = byType(prepared.objects, 'polygon')[0];
    expect(square).toMatchObject({ showArea: true, showPerimeter: true });
    expect(ilkokulGorunumu(prepared.objects).find(o => o.id === square.id)).toMatchObject({ showArea: true, showPerimeter: true });
    const added = run('AB doğru parçası çiz', prepared.objects);
    expect(added.objects.find(o => o.id === square.id)).toEqual(square);
    const optedIn = run('kare çiz', [], [], { showMeasurementsOnCreate: true });
    expect(byType(optedIn.objects, 'polygon')[0]).toMatchObject({ showArea: true, showPerimeter: true });
  });
});
