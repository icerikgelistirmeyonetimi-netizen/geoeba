import { describe, expect, it } from 'vitest';
import {
  GENEL_KESIR_SINIRLARI,
  ILKOKUL_KESIR_SINIRLARI,
  KESIR_MODEL_ADLARI,
  VARSAYILAN_KESIR_AYARI,
  kesirAyariniAyarla,
  kesirAyariniOku,
  kesirAyariniSinirla,
  kesirEtiketi,
} from '../kesirModeli';

/*
 * "Kesir Göster" (alan uzmanı, 3. sınıf, 2. tur): "sadece 1/1 kesri daire şeklinde yapılabilmektedir". Araç artık
 * çubuktaki pay, payda ve modelle kesir koyar.
 */
describe('kesir aracının ayarı', () => {
  it('varsayılan 1/1 değil: 1/2 daire', () => {
    expect(VARSAYILAN_KESIR_AYARI).toEqual({ pay: 1, payda: 2, model: 'pie' });
    expect(kesirAyariniOku()).toEqual(VARSAYILAN_KESIR_AYARI);
  });

  it('iki model seçilir: daire ve şerit', () => {
    expect(KESIR_MODEL_ADLARI).toEqual({ pie: 'Daire', bar: 'Şerit' });
    expect(kesirAyariniSinirla({ pay: 3, payda: 4, model: 'bar' }, true).model).toBe('bar');
    expect(kesirAyariniSinirla({ pay: 3, payda: 4, model: 'kare' as never }, true).model).toBe('pie');
  });

  it('ilkokulda payda 2-12, pay 1 ile iki bütün arası', () => {
    expect(ILKOKUL_KESIR_SINIRLARI.paydaEnAz).toBe(2);
    expect(ILKOKUL_KESIR_SINIRLARI.paydaEnCok).toBe(12);
    expect(kesirAyariniSinirla({ pay: 3, payda: 4 }, true)).toMatchObject({ pay: 3, payda: 4 });
    expect(kesirAyariniSinirla({ pay: 1, payda: 1 }, true)).toMatchObject({ pay: 1, payda: 2 });
    expect(kesirAyariniSinirla({ pay: 5, payda: 20 }, true)).toMatchObject({ pay: 5, payda: 12 });
    expect(kesirAyariniSinirla({ pay: 0, payda: 6 }, true)).toMatchObject({ pay: 1, payda: 6 });
    // Payı paydasından büyük kesir (4. sınıf): en çok iki bütün
    expect(kesirAyariniSinirla({ pay: 7, payda: 4 }, true)).toMatchObject({ pay: 7, payda: 4 });
    expect(kesirAyariniSinirla({ pay: 30, payda: 4 }, true)).toMatchObject({ pay: 8, payda: 4 });
    // Bozuk değerler varsayılana düşer
    expect(kesirAyariniSinirla({ pay: Number.NaN, payda: Number.NaN }, true)).toEqual({ pay: 1, payda: 2, model: 'pie' });
  });

  it('ortaokul ve lisede Özellikler panelinin sınırları (pay 0-30, payda 1-30)', () => {
    expect(GENEL_KESIR_SINIRLARI.paydaEnAz).toBe(1);
    expect(kesirAyariniSinirla({ pay: 0, payda: 1 }, false)).toMatchObject({ pay: 0, payda: 1 });
    expect(kesirAyariniSinirla({ pay: 40, payda: 40 }, false)).toMatchObject({ pay: 30, payda: 30 });
  });

  it('ayar saklanır; tuvale konan modelin etiketi kesirdir', () => {
    kesirAyariniAyarla({ pay: 3, payda: 8, model: 'bar' });
    expect(kesirAyariniOku()).toEqual({ pay: 3, payda: 8, model: 'bar' });
    kesirAyariniAyarla(VARSAYILAN_KESIR_AYARI);
    expect(kesirEtiketi(3, 8)).toBe('3/8 Kesir Modeli');
  });
});
