import { describe, expect, it } from 'vitest';
import { etiketHedefiniBul, etiketMetniDuzenlenebilir, etiketMetniGuncelle } from '../etiketMetni';

/*
 * Sağ tık > "Etiketi düzenle…" (8 Ekim 2026): ölçü etiketinin hesaplanan yazısı yerine kullanıcının
 * metni gösterilir; boş metin hesaplanan yazıya döndürür.
 */

describe('etiketMetniDuzenlenebilir', () => {
  it('alan, çevre, yarıçap, uzunluk, kenar ve açı etiketleri elle yazılabilir', () => {
    for (const kind of ['area', 'perimeter', 'radius', 'length', 'edge0', 'edge12', 'angle']) {
      expect(etiketMetniDuzenlenebilir(kind, 'polygon')).toBe(true);
    }
  });

  it("'measure' yalnız uzaklık ve eğim ölçümünde düzenlenir; yay ve trig rozetleri hesaplanmış kalır", () => {
    expect(etiketMetniDuzenlenebilir('measure', 'measurement', 'distance')).toBe(true);
    expect(etiketMetniDuzenlenebilir('measure', 'measurement', 'slope')).toBe(true);
    expect(etiketMetniDuzenlenebilir('measure', 'measurement', 'arc')).toBe(false);
    expect(etiketMetniDuzenlenebilir('measure', 'measurement', 'trig')).toBe(false);
    expect(etiketMetniDuzenlenebilir('measure', 'polygon')).toBe(false);
  });

  it('nokta adı ve yay rozetleri bu yoldan düzenlenmez', () => {
    for (const kind of ['pointLabel', 'arcLength', 'chordLength', 'centralAngle', 'trig-sin', 'edge']) {
      expect(etiketMetniDuzenlenebilir(kind, 'arc')).toBe(false);
    }
  });
});

describe('etiketMetniGuncelle', () => {
  it('metni anahtara yazar, kırpar; öteki anahtarları korur', () => {
    expect(etiketMetniGuncelle(undefined, 'area', '  Alan = ? ')).toEqual({ area: 'Alan = ?' });
    expect(etiketMetniGuncelle({ area: 'Alan = ?' }, 'perimeter', 'Çevre = ?')).toEqual({ area: 'Alan = ?', perimeter: 'Çevre = ?' });
  });

  it('boş metin ya da null anahtarı siler; hiç anahtar kalmazsa undefined (dosyaya yazılmaz)', () => {
    expect(etiketMetniGuncelle({ area: 'Alan = ?', edge0: 'taban' }, 'area', '   ')).toEqual({ edge0: 'taban' });
    expect(etiketMetniGuncelle({ area: 'Alan = ?' }, 'area', null)).toBeUndefined();
    expect(etiketMetniGuncelle(undefined, 'area', null)).toBeUndefined();
  });

  it('girdiyi değiştirmez', () => {
    const mevcut = { area: 'Alan = ?' };
    etiketMetniGuncelle(mevcut, 'area', null);
    expect(mevcut).toEqual({ area: 'Alan = ?' });
  });
});

describe('etiketHedefiniBul', () => {
  /** Sahte DOM: closest ile bulunan etiket düğümü */
  const dugum = (oznitelikler: Record<string, string | undefined>) => ({
    closest: (secici: string) => (secici === '[data-label-kind]' && oznitelikler['data-label-kind'] !== undefined ? {
      getAttribute: (ad: string) => oznitelikler[ad] ?? null,
    } : null),
  }) as unknown as Element;

  it('etiket düğümünden sahip, anahtar ve ekrandaki metni okur', () => {
    expect(etiketHedefiniBul(dugum({ 'data-label-kind': 'area', 'data-label-object': 'poly1', 'data-label-text': 'A(ABC) = 6 br²' })))
      .toEqual({ objectId: 'poly1', kind: 'area', metin: 'A(ABC) = 6 br²' });
  });

  it('metin özniteliği yoksa boş metin; etiket değilse null', () => {
    expect(etiketHedefiniBul(dugum({ 'data-label-kind': 'edge0', 'data-label-object': 'poly1' }))).toEqual({ objectId: 'poly1', kind: 'edge0', metin: '' });
    expect(etiketHedefiniBul(dugum({}))).toBeNull();
    expect(etiketHedefiniBul(dugum({ 'data-label-kind': 'area' }))).toBeNull();
    expect(etiketHedefiniBul(null)).toBeNull();
  });
});
