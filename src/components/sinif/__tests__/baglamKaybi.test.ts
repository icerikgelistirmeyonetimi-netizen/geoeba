import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EN_COK_KAYIP, KAYIP_PENCERESI_MS, baglamKaybiniIzle, kayipKarari } from '../baglamKaybi';

const kayipOlayi = () => new Event('webglcontextlost', { cancelable: true });

describe('kayıp kararı', () => {
  it('pencere içinde en çok 3 kayıpta yeniden kurar, 4.de vazgeçer; eski kayıtlar düşer', () => {
    const k: number[] = [];
    expect(kayipKarari(k, 0)).toBe('yenidenKur');
    expect(kayipKarari(k, 1000)).toBe('yenidenKur');
    expect(kayipKarari(k, 2000)).toBe('yenidenKur');
    expect(kayipKarari(k, 3000)).toBe('vazgec');
    // Bir dakika sonra sayaç baştan: yalnız pencere içindekiler kalır
    expect(kayipKarari(k, 3000 + KAYIP_PENCERESI_MS)).toBe('yenidenKur');
    expect(k).toEqual([3000 + KAYIP_PENCERESI_MS]);
    expect(EN_COK_KAYIP).toBe(3);
  });
});

describe('bağlam kaybı izleyicisi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('kayıpta varsayılanı engeller ve kısa bir beklemeden sonra sahneyi yeniden kurar (önceden tuval kalıcı boştu)', () => {
    const tuval = new EventTarget();
    const yenidenKur = vi.fn();
    const vazgec = vi.fn();
    baglamKaybiniIzle(tuval, [], { ad: 'Olasılık', yenidenKur, vazgec, saat: () => 0 });
    const o = kayipOlayi();
    tuval.dispatchEvent(o);
    expect(o.defaultPrevented).toBe(true);
    expect(yenidenKur).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(yenidenKur).toHaveBeenCalledTimes(1);
    expect(vazgec).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Olasılık: 3B sahnenin grafik bağlamı kayboldu'));
  });

  it('aynı anda gelen olaylar tek yeniden kuruluşa düşer', () => {
    const tuval = new EventTarget();
    const yenidenKur = vi.fn();
    baglamKaybiniIzle(tuval, [], { ad: 'x', yenidenKur, vazgec: vi.fn() });
    tuval.dispatchEvent(kayipOlayi());
    tuval.dispatchEvent(kayipOlayi());
    vi.advanceTimersByTime(300);
    expect(yenidenKur).toHaveBeenCalledTimes(1);
  });

  it('sık kayıpta (kurulumlar arasında aynı dizi) sade görünüme geçer', () => {
    const kayiplar: number[] = [];
    let zaman = 0;
    const yenidenKur = vi.fn();
    const vazgec = vi.fn();
    for (let i = 0; i < 4; i++) {
      // Her yeniden kurulum yeni tuval + yeni izleyici, aynı kayıp dizisi
      const tuval = new EventTarget();
      const birak = baglamKaybiniIzle(tuval, kayiplar, { ad: 'x', yenidenKur, vazgec, saat: () => zaman });
      tuval.dispatchEvent(kayipOlayi());
      vi.advanceTimersByTime(300);
      birak();
      zaman += 5000;
    }
    expect(yenidenKur).toHaveBeenCalledTimes(3);
    expect(vazgec).toHaveBeenCalledTimes(1);
  });

  it('bırakılınca (sahne söküldü) dinlemez ve bekleyen yeniden kurmayı iptal eder', () => {
    const tuval = new EventTarget();
    const yenidenKur = vi.fn();
    const birak = baglamKaybiniIzle(tuval, [], { ad: 'x', yenidenKur, vazgec: vi.fn() });
    tuval.dispatchEvent(kayipOlayi());
    birak();
    vi.advanceTimersByTime(1000);
    tuval.dispatchEvent(kayipOlayi());
    vi.advanceTimersByTime(1000);
    expect(yenidenKur).not.toHaveBeenCalled();
  });

  it('tuval yoksa hiçbir şey yapmaz', () => {
    expect(() => baglamKaybiniIzle(null, [], { ad: 'x', yenidenKur: vi.fn(), vazgec: vi.fn() })()).not.toThrow();
  });
});
