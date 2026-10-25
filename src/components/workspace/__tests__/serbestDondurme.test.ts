import { describe, expect, it } from 'vitest';
import { serbestDonusDerecesi } from '../serbestDondurme';

const m = { x: 100, y: 100 };
const duz = { ilkokul: false, onBesli: false };

describe('serbestDonusDerecesi', () => {
  it('ekranda saat yönünün tersi pozitif (y aşağı doğru)', () => {
    expect(serbestDonusDerecesi({ x: 200, y: 100 }, { x: 100, y: 0 }, m, duz)).toBe(90);
    expect(serbestDonusDerecesi({ x: 200, y: 100 }, { x: 100, y: 200 }, m, duz)).toBe(-90);
  });

  it('tam dereceye yuvarlanır; Shift ile 15°, ilkokulda çeyrek dönüş', () => {
    const a = (d: number) => ({ x: 100 + 100 * Math.cos((d * Math.PI) / 180), y: 100 - 100 * Math.sin((d * Math.PI) / 180) });
    expect(serbestDonusDerecesi(a(0), a(37.4), m, duz)).toBe(37);
    expect(serbestDonusDerecesi(a(0), a(37.4), m, { ilkokul: false, onBesli: true })).toBe(30);
    expect(serbestDonusDerecesi(a(0), a(52), m, { ilkokul: false, onBesli: true })).toBe(45);
    expect(serbestDonusDerecesi(a(0), a(50), m, { ilkokul: true, onBesli: true })).toBe(90);
    expect(serbestDonusDerecesi(a(0), a(30), m, { ilkokul: true, onBesli: false })).toBe(0);
  });

  it('açı farkı sarmalanmaz: −180° çizgisini geçen sürükleme büyük açı verir (eski davranış)', () => {
    const a = (d: number) => ({ x: 100 + 100 * Math.cos((d * Math.PI) / 180), y: 100 - 100 * Math.sin((d * Math.PI) / 180) });
    expect(serbestDonusDerecesi(a(170), a(-170), m, duz)).toBe(-340);
  });
});
