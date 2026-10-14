import { describe, expect, it } from 'vitest';
import { onbellekliYukleyici, parcaYuklemeHatasiMi, yenidenDeneyerekYukle } from '../tembelYukleme';

/** webpack'in yayın sonrası eski parça 404'ünde fırlattığı hatanın biçimi */
function parcaHatasi(no = '6423'): Error {
  const h = new Error(`Loading chunk ${no} failed.\n(error: https://x.github.io/geoeba/_next/static/chunks/${no}-abc.js)`);
  h.name = 'ChunkLoadError';
  return h;
}

const aninda = () => Promise.resolve();

describe('parça yükleme hatası tanıma', () => {
  it('webpack ChunkLoadError, CSS parçası ve tarayıcıların dinamik import ağ hataları', () => {
    expect(parcaYuklemeHatasiMi(parcaHatasi())).toBe(true);
    expect(parcaYuklemeHatasiMi(new Error('Loading chunk app/page failed.'))).toBe(true);
    expect(parcaYuklemeHatasiMi(new Error('Loading CSS chunk 812 failed.\n(/geoeba/_next/static/css/812.css)'))).toBe(true);
    expect(parcaYuklemeHatasiMi(new TypeError('Failed to fetch dynamically imported module: https://x/a.js'))).toBe(true);
    expect(parcaYuklemeHatasiMi(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(parcaYuklemeHatasiMi(new TypeError('error loading dynamically imported module'))).toBe(true);
  });

  it('uygulamanın kendi hatası, boş değer ve dize parça hatası sayılmaz', () => {
    expect(parcaYuklemeHatasiMi(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    expect(parcaYuklemeHatasiMi(null)).toBe(false);
    expect(parcaYuklemeHatasiMi(undefined)).toBe(false);
    expect(parcaYuklemeHatasiMi('Loading chunk 1 failed')).toBe(false);
  });
});

describe('yeniden deneyerek yükleme', () => {
  it('geçici parça hatasında yeniden dener ve sonucu verir; bekleme her denemede artar', async () => {
    let n = 0;
    const beklemeler: number[] = [];
    const v = await yenidenDeneyerekYukle(
      async () => {
        n++;
        if (n < 3) throw parcaHatasi();
        return 'modül';
      },
      { deneme: 3, bekleme: 100, uyu: async (ms) => void beklemeler.push(ms) }
    );
    expect(v).toBe('modül');
    expect(n).toBe(3);
    expect(beklemeler).toEqual([100, 200]);
  });

  it('deneme hakkı bitince son parça hatasını olduğu gibi fırlatır', async () => {
    let n = 0;
    await expect(
      yenidenDeneyerekYukle(
        async () => {
          n++;
          throw parcaHatasi(String(n));
        },
        { deneme: 3, uyu: aninda }
      )
    ).rejects.toMatchObject({ name: 'ChunkLoadError', message: expect.stringContaining('Loading chunk 3 failed') });
    expect(n).toBe(3);
  });

  it('parça hatası olmayan hata yeniden denenmez (modül çalışırken hata verdi)', async () => {
    let n = 0;
    await expect(
      yenidenDeneyerekYukle(
        async () => {
          n++;
          throw new TypeError('x is not a function');
        },
        { deneme: 5, uyu: aninda }
      )
    ).rejects.toThrow('x is not a function');
    expect(n).toBe(1);
  });
});

describe('önbellekli yükleyici (pencere yeniden bağlanınca)', () => {
  it('başarısız yüklemeyi saklamaz: ağ düzelince sonraki çağrı yükler (eski next/dynamic reddi kalıcı tutuyordu)', async () => {
    let ag = false;
    let istek = 0;
    const y = onbellekliYukleyici(
      async () => {
        istek++;
        if (!ag) throw parcaHatasi();
        return { default: 'Bilesen' };
      },
      { deneme: 2, uyu: aninda }
    );
    await expect(y.yukle()).rejects.toMatchObject({ name: 'ChunkLoadError' });
    expect(y.hazir()).toBeUndefined();
    expect(istek).toBe(2);
    ag = true;
    await expect(y.yukle()).resolves.toEqual({ default: 'Bilesen' });
    expect(y.hazir()).toEqual({ default: 'Bilesen' });
    expect(istek).toBe(3);
  });

  it('başarılı sonucu saklar (bir kez indirilir); eşzamanlı çağrılar tek isteği paylaşır', async () => {
    let istek = 0;
    const y = onbellekliYukleyici(async () => {
      istek++;
      return 42;
    });
    const [a, b] = await Promise.all([y.yukle(), y.yukle()]);
    expect([a, b]).toEqual([42, 42]);
    expect(await y.yukle()).toBe(42);
    expect(istek).toBe(1);
    expect(y.hazir()).toBe(42);
  });
});
