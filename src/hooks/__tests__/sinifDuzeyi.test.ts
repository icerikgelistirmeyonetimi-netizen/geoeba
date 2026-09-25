import { afterEach, describe, expect, it, vi } from 'vitest';
import { SINIF_DUZEYI_ANAHTARI } from '@/components/workspace/sinifDuzeyleri';

type StorageDinleyicisi = (olay: { key: string | null; newValue: string | null }) => void;

/** localStorage ve storage olayı olan küçük bir sahte tarayıcı; okuma / yazma hata verdirilebilir. */
function sahteTarayici(baslangic: Record<string, string> = {}, secenek: { okumaHatasi?: boolean; yazmaHatasi?: boolean } = {}) {
  const depo = new Map(Object.entries(baslangic));
  const dinleyiciler = new Set<StorageDinleyicisi>();
  const pencere = {
    localStorage: {
      getItem: (anahtar: string) => {
        if (secenek.okumaHatasi) throw new Error('SecurityError');
        return depo.get(anahtar) ?? null;
      },
      setItem: (anahtar: string, deger: string) => {
        if (secenek.yazmaHatasi) throw new Error('QuotaExceededError');
        depo.set(anahtar, deger);
      },
    },
    addEventListener: (tur: string, f: StorageDinleyicisi) => {
      if (tur === 'storage') dinleyiciler.add(f);
    },
    removeEventListener: (tur: string, f: StorageDinleyicisi) => {
      if (tur === 'storage') dinleyiciler.delete(f);
    },
  };
  vi.stubGlobal('window', pencere);
  return {
    depo,
    baskaSekmeYazdi: (key: string | null, newValue: string | null) => dinleyiciler.forEach((f) => f({ key, newValue })),
    storageDinleyiciSayisi: () => dinleyiciler.size,
  };
}

/** Modül durumu (bellekteki seçim) her testte sıfırdan başlasın */
async function tazeDepo() {
  vi.resetModules();
  return import('@/hooks/useSinifDuzeyi');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sınıf düzeyi tercihi (localStorage)', () => {
  it('kayıt yoksa "Tüm araçlar" ile başlar', async () => {
    sahteTarayici();
    const { sinifDuzeyiniOku } = await tazeDepo();
    expect(sinifDuzeyiniOku()).toBe('tum');
  });

  it('kayıtlı sınıfı okur, bozuk kaydı yok sayar', async () => {
    sahteTarayici({ [SINIF_DUZEYI_ANAHTARI]: '5' });
    expect((await tazeDepo()).sinifDuzeyiniOku()).toBe(5);
    sahteTarayici({ [SINIF_DUZEYI_ANAHTARI]: '99' });
    expect((await tazeDepo()).sinifDuzeyiniOku()).toBe('tum');
  });

  it('seçim saklanır ve dinleyicilere bildirilir', async () => {
    const { depo } = sahteTarayici();
    const { sinifDuzeyiniAyarla, sinifDuzeyiniOku, sinifDuzeyineAbone } = await tazeDepo();
    const dinleyici = vi.fn();
    const birak = sinifDuzeyineAbone(dinleyici);
    sinifDuzeyiniAyarla(7);
    expect(sinifDuzeyiniOku()).toBe(7);
    expect(depo.get(SINIF_DUZEYI_ANAHTARI)).toBe('7');
    expect(dinleyici).toHaveBeenCalledTimes(1);
    sinifDuzeyiniAyarla('tum');
    expect(depo.get(SINIF_DUZEYI_ANAHTARI)).toBe('tum');
    birak();
    sinifDuzeyiniAyarla(3);
    expect(dinleyici).toHaveBeenCalledTimes(2);
  });

  it('depolama okunamıyorsa çökmez, varsayılanla açılır', async () => {
    sahteTarayici({ [SINIF_DUZEYI_ANAHTARI]: '4' }, { okumaHatasi: true });
    const { sinifDuzeyiniOku } = await tazeDepo();
    expect(() => sinifDuzeyiniOku()).not.toThrow();
    expect(sinifDuzeyiniOku()).toBe('tum');
  });

  it('depolama yazılamıyorsa seçim bu oturumda geçerli kalır', async () => {
    sahteTarayici({}, { yazmaHatasi: true });
    const { sinifDuzeyiniAyarla, sinifDuzeyiniOku } = await tazeDepo();
    expect(() => sinifDuzeyiniAyarla(9)).not.toThrow();
    expect(sinifDuzeyiniOku()).toBe(9);
  });

  it('başka sekmedeki seçim bu sekmeye yansır; ilgisiz anahtarlar yok sayılır', async () => {
    const tarayici = sahteTarayici();
    const { sinifDuzeyiniOku, sinifDuzeyineAbone } = await tazeDepo();
    const dinleyici = vi.fn();
    const birak = sinifDuzeyineAbone(dinleyici);
    tarayici.baskaSekmeYazdi('baska_anahtar', '3');
    expect(dinleyici).not.toHaveBeenCalled();
    tarayici.baskaSekmeYazdi(SINIF_DUZEYI_ANAHTARI, '11');
    expect(sinifDuzeyiniOku()).toBe(11);
    expect(dinleyici).toHaveBeenCalledTimes(1);
    // Başka sekmede localStorage.clear(): varsayılana döner
    tarayici.baskaSekmeYazdi(null, null);
    expect(sinifDuzeyiniOku()).toBe('tum');
    birak();
    expect(tarayici.storageDinleyiciSayisi()).toBe(0);
  });
});
