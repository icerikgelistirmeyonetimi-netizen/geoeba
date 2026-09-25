import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STYLE_SETTINGS, STYLE_SECENEKLERI, STYLE_STORAGE_KEY, loadStyleSettings } from '../workspace';
import { ACI_YAZIMLARI, OLCU_YAZIMLARI, yazimAyari } from '@/math/matematikYazimi';

/** localStorage yerine küçük bir sahte depo (vitest node ortamı). */
function depoKur(kayit: string | null) {
  const depo = { getItem: vi.fn(() => kayit), setItem: vi.fn(), removeItem: vi.fn() };
  vi.stubGlobal('window', { localStorage: depo });
  vi.stubGlobal('localStorage', depo);
  return depo;
}

afterEach(() => vi.unstubAllGlobals());

describe('stil ayarları varsayılanları', () => {
  it('yeni yazım alanları MEB varsayılanıyla gelir', () => {
    expect(DEFAULT_STYLE_SETTINGS.olcuYazimi).toBe('tam');
    expect(DEFAULT_STYLE_SETTINGS.aciYazimi).toBe('sapka');
  });
  it('seçenek listeleri yazım kipiyle aynı', () => {
    expect(STYLE_SECENEKLERI.olcuYazimi).toBe(OLCU_YAZIMLARI);
    expect(STYLE_SECENEKLERI.aciYazimi).toBe(ACI_YAZIMLARI);
  });
  it('varsayılan ayarlar yazimAyari ile uyumlu', () => {
    // Uygulamanın varsayılanı: tam sayı AÇIK (kullanıcı isteği, 2026-09-25)
    expect(yazimAyari(DEFAULT_STYLE_SETTINGS)).toEqual({ olcuYazimi: 'tam', aciYazimi: 'sapka', tamSayi: true });
  });
});

describe('loadStyleSettings', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('kayıt yoksa varsayılanı verir', () => {
    depoKur(null);
    expect(loadStyleSettings()).toEqual(DEFAULT_STYLE_SETTINGS);
  });

  it('seçenek alanları kayıttan geri okunur (her açılışta sıfırlanmaz)', () => {
    depoKur(JSON.stringify({ olcuYazimi: 'kisa', aciYazimi: 'isaret' }));
    const s = loadStyleSettings();
    expect(s.olcuYazimi).toBe('kisa');
    expect(s.aciYazimi).toBe('isaret');
  });

  it('geçersiz seçenek varsayılana düşer', () => {
    depoKur(JSON.stringify({ olcuYazimi: 'uzun', aciYazimi: 42 }));
    const s = loadStyleSettings();
    expect(s.olcuYazimi).toBe('tam');
    expect(s.aciYazimi).toBe('sapka');
  });

  it('sayı ve mantıksal alanlar eskisi gibi davranır', () => {
    depoKur(JSON.stringify({ strokeScale: 2, showLabelBoxes: true, fontScale: 'büyük', hideFills: 'evet', olcuYazimi: 'kisa' }));
    const s = loadStyleSettings();
    expect(s.strokeScale).toBe(2);
    expect(s.showLabelBoxes).toBe(true);
    expect(s.fontScale).toBe(DEFAULT_STYLE_SETTINGS.fontScale);
    expect(s.hideFills).toBe(false);
    expect(s.olcuYazimi).toBe('kisa');
  });

  it('etiket kutuları varsayılan olarak kapalı; eski kayıttaki hideLabelBoxes: false kutuları geri getirmez', () => {
    expect(DEFAULT_STYLE_SETTINGS.showLabelBoxes).toBe(false);
    depoKur(JSON.stringify({ strokeScale: 2, hideLabelBoxes: false }));
    const s = loadStyleSettings();
    expect(s.showLabelBoxes).toBe(false);
    expect(s).not.toHaveProperty('hideLabelBoxes');
  });

  it('bozuk kayıt varsayılanı bozmaz', () => {
    depoKur('{bozuk');
    expect(loadStyleSettings()).toEqual(DEFAULT_STYLE_SETTINGS);
  });

  it('tanınmayan anahtarlar sonuca sızmaz', () => {
    depoKur(JSON.stringify({ birSey: 5, olcuYazimi: 'kisa' }));
    expect(Object.keys(loadStyleSettings()).sort()).toEqual(Object.keys(DEFAULT_STYLE_SETTINGS).sort());
  });

  it('depo anahtarı değişmedi (eski kayıtlar açılmaya devam eder)', () => {
    expect(STYLE_STORAGE_KEY).toBe('geoeba_stil_ayarlari_v1');
  });
});
