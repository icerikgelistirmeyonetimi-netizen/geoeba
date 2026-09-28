import { afterEach, describe, expect, it, vi } from 'vitest';
import { ESKI_SINIF_DUZEYI_ANAHTARI, KADEME_DUZEYI_ANAHTARI } from '@/components/workspace/kademeDuzeyleri';

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
      removeItem: (anahtar: string) => {
        if (secenek.yazmaHatasi) throw new Error('SecurityError');
        depo.delete(anahtar);
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
  return import('@/hooks/useKademeDuzeyi');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('kademe tercihi (localStorage)', () => {
  it('kayıt yoksa "Tüm araçlar" ile başlar', async () => {
    sahteTarayici();
    const { kademeDuzeyiniOku } = await tazeDepo();
    expect(kademeDuzeyiniOku()).toBe('tum');
  });

  it('kayıtlı kademeyi okur, bozuk kaydı yok sayar', async () => {
    sahteTarayici({ [KADEME_DUZEYI_ANAHTARI]: 'ortaokul' });
    expect((await tazeDepo()).kademeDuzeyiniOku()).toBe('ortaokul');
    sahteTarayici({ [KADEME_DUZEYI_ANAHTARI]: 'anaokulu' });
    expect((await tazeDepo()).kademeDuzeyiniOku()).toBe('tum');
  });

  it('önceki sürümün sınıf kaydını kademeye taşır ve eski anahtarı siler', async () => {
    const { depo } = sahteTarayici({ [ESKI_SINIF_DUZEYI_ANAHTARI]: '7' });
    const { kademeDuzeyiniOku } = await tazeDepo();
    expect(kademeDuzeyiniOku()).toBe('ortaokul');
    expect(depo.get(KADEME_DUZEYI_ANAHTARI)).toBe('ortaokul');
    expect(depo.has(ESKI_SINIF_DUZEYI_ANAHTARI)).toBe(false);
    // Yeni kayıt varsa eski kayda bakılmaz
    sahteTarayici({ [KADEME_DUZEYI_ANAHTARI]: 'lise', [ESKI_SINIF_DUZEYI_ANAHTARI]: '2' });
    expect((await tazeDepo()).kademeDuzeyiniOku()).toBe('lise');
    // Eski kayıt "tum" ise yine tüm araçlar
    sahteTarayici({ [ESKI_SINIF_DUZEYI_ANAHTARI]: 'tum' });
    expect((await tazeDepo()).kademeDuzeyiniOku()).toBe('tum');
  });

  it('seçim saklanır ve dinleyicilere bildirilir', async () => {
    const { depo } = sahteTarayici();
    const { kademeDuzeyiniAyarla, kademeDuzeyiniOku, kademeDuzeyineAbone } = await tazeDepo();
    const dinleyici = vi.fn();
    const birak = kademeDuzeyineAbone(dinleyici);
    kademeDuzeyiniAyarla('ilkokul');
    expect(kademeDuzeyiniOku()).toBe('ilkokul');
    expect(depo.get(KADEME_DUZEYI_ANAHTARI)).toBe('ilkokul');
    expect(dinleyici).toHaveBeenCalledTimes(1);
    kademeDuzeyiniAyarla('tum');
    expect(depo.get(KADEME_DUZEYI_ANAHTARI)).toBe('tum');
    birak();
    kademeDuzeyiniAyarla('lise');
    expect(dinleyici).toHaveBeenCalledTimes(2);
  });

  it('depolama okunamıyorsa çökmez, varsayılanla açılır', async () => {
    sahteTarayici({ [KADEME_DUZEYI_ANAHTARI]: 'ilkokul' }, { okumaHatasi: true });
    const { kademeDuzeyiniOku } = await tazeDepo();
    expect(() => kademeDuzeyiniOku()).not.toThrow();
    expect(kademeDuzeyiniOku()).toBe('tum');
  });

  it('depolama yazılamıyorsa seçim bu oturumda geçerli kalır; eski kayıt yine de okunur', async () => {
    sahteTarayici({}, { yazmaHatasi: true });
    const { kademeDuzeyiniAyarla, kademeDuzeyiniOku } = await tazeDepo();
    expect(() => kademeDuzeyiniAyarla('lise')).not.toThrow();
    expect(kademeDuzeyiniOku()).toBe('lise');
    sahteTarayici({ [ESKI_SINIF_DUZEYI_ANAHTARI]: '3' }, { yazmaHatasi: true });
    expect((await tazeDepo()).kademeDuzeyiniOku()).toBe('ilkokul');
  });

  it('başka sekmedeki seçim bu sekmeye yansır; ilgisiz anahtarlar yok sayılır', async () => {
    const tarayici = sahteTarayici();
    const { kademeDuzeyiniOku, kademeDuzeyineAbone } = await tazeDepo();
    const dinleyici = vi.fn();
    const birak = kademeDuzeyineAbone(dinleyici);
    tarayici.baskaSekmeYazdi('baska_anahtar', 'lise');
    tarayici.baskaSekmeYazdi(ESKI_SINIF_DUZEYI_ANAHTARI, '5');
    expect(dinleyici).not.toHaveBeenCalled();
    tarayici.baskaSekmeYazdi(KADEME_DUZEYI_ANAHTARI, 'ortaokul');
    expect(kademeDuzeyiniOku()).toBe('ortaokul');
    expect(dinleyici).toHaveBeenCalledTimes(1);
    // Başka sekmede localStorage.clear(): varsayılana döner
    tarayici.baskaSekmeYazdi(null, null);
    expect(kademeDuzeyiniOku()).toBe('tum');
    birak();
    expect(tarayici.storageDinleyiciSayisi()).toBe(0);
  });
});
