import { afterEach, describe, expect, it, vi } from 'vitest';
import { webglSondasiniSifirla, webglVar } from '../seraSahnesi';

/** Sahte belge: her createElement bir tuval, getContext sahte bağlam (loseContext sayılır) */
function sahteBelge(gl: boolean) {
  const sayac = { tuval: 0, baglam: 0, birakilan: 0 };
  const belge = {
    createElement: () => {
      sayac.tuval++;
      return {
        width: 0,
        height: 0,
        getContext: () => {
          if (!gl) return null;
          sayac.baglam++;
          return { getExtension: (ad: string) => (ad === 'WEBGL_lose_context' ? { loseContext: () => void sayac.birakilan++ } : null) };
        },
      };
    },
  };
  return { belge, sayac };
}

describe('Algoritma WebGL sondası (bağlam sızıntısı)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    webglSondasiniSifirla();
  });

  it('Node ortamında (belge yok) false', () => {
    expect(webglVar()).toBe(false);
  });

  it('sonda bağlamını hemen bırakır ve sonucu önbelleğe alır: her SahneAlani bağlanışında yeni bağlam açılmaz', () => {
    const { belge, sayac } = sahteBelge(true);
    vi.stubGlobal('document', belge);
    webglSondasiniSifirla();
    for (let i = 0; i < 10; i++) expect(webglVar()).toBe(true);
    expect(sayac.tuval).toBe(1);
    expect(sayac.baglam).toBe(1);
    expect(sayac.birakilan).toBe(1);
  });

  it('WebGL yoksa false (şema görünümü) ve yine tek sonda', () => {
    const { belge, sayac } = sahteBelge(false);
    vi.stubGlobal('document', belge);
    webglSondasiniSifirla();
    expect(webglVar()).toBe(false);
    expect(webglVar()).toBe(false);
    expect(sayac.tuval).toBe(1);
  });
});
