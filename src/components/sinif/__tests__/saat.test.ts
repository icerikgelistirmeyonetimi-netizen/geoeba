import { describe, expect, it } from 'vitest';
import { saatMetni, sonrakiDakikayaKalan, tarihMetni } from '../saat';

describe('saat', () => {
  it("saat 'HH:MM' 24 saat biçiminde", () => {
    expect(saatMetni(new Date(2026, 8, 21, 9, 5))).toBe('09:05');
    expect(saatMetni(new Date(2026, 8, 21, 15, 30))).toBe('15:30');
    expect(saatMetni(new Date(2026, 8, 21, 0, 7))).toBe('00:07');
    expect(saatMetni(new Date(2026, 8, 21, 23, 59))).toBe('23:59');
  });

  it("tarih 'GG Ay YYYY Gün' (tr-TR)", () => {
    expect(tarihMetni(new Date(2026, 8, 21))).toBe('21 Eylül 2026 Pazartesi');
    expect(tarihMetni(new Date(2026, 0, 1))).toBe('1 Ocak 2026 Perşembe');
  });

  it('bir sonraki dakikaya kalan süre', () => {
    expect(sonrakiDakikayaKalan(new Date(2026, 8, 21, 9, 5, 0, 0))).toBe(60000);
    expect(sonrakiDakikayaKalan(new Date(2026, 8, 21, 9, 5, 30, 500))).toBe(29500);
    expect(sonrakiDakikayaKalan(new Date(2026, 8, 21, 9, 5, 59, 999))).toBe(1);
  });
});
