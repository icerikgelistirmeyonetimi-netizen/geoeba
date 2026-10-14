// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PencereHataSiniri, depoAnahtari, hataIletisi } from '../PencereHataSiniri';
import { UYGULAMALAR, uygulamaBul } from '../uygulamalar';

function parcaHatasi(): Error {
  const h = new Error('Loading chunk _app-pages-browser_src_components_uygulamalar_olasilik_index_tsx failed.\n(error: /geoeba/_next/static/chunks/1234-abc.js)');
  h.name = 'ChunkLoadError';
  return h;
}

/** Hata durumundaki sınırın çizimi (DOM ortamı yok: sınıf örneğinin render çıktısı sunucuda çizilir) */
function hataCizimi(hata: Error): string {
  const sinir = new PencereHataSiniri({ uygulamaId: 'olasilik', children: null });
  sinir.state = { hata, nesil: 0 };
  return renderToStaticMarkup(<>{sinir.render()}</>);
}

describe('pencere hata sınırı', () => {
  it('parça (dosya) yükleme hatasında veri silme önerilmez; «Yeniden dene» ve «Sayfayı yenile» gösterilir', () => {
    const html = hataCizimi(parcaHatasi());
    expect(html).toContain('Uygulama dosyaları yüklenemedi');
    expect(html).toContain('yeni sürümü yayımlanmış olabilir');
    expect(html).toContain('Kayıtlı veriniz silinmez');
    expect(html).toContain('>Yeniden dene<');
    expect(html).toContain('>Sayfayı yenile<');
    expect(html).not.toContain('Kayıtlı veriyi silip');
    expect(html).toContain('data-pencere-hata="parca"');
    expect(html).toContain('role="alert"');
  });

  it('uygulamanın kendi hatasında eski seçenekler kalır (yeniden başlat, kayıtlı veriyi silip yeniden başlat)', () => {
    const html = hataCizimi(new TypeError("Cannot read properties of undefined (reading 'tablo')"));
    expect(html).toContain('Uygulama bir hatayla karşılaştı');
    expect(html).toContain('>Yeniden başlat<');
    expect(html).toContain('Kayıtlı veriyi silip yeniden başlat');
    expect(html).not.toContain('Sayfayı yenile');
    expect(html).toContain('data-pencere-hata="uygulama"');
  });

  it('hata iletisi sınıflaması ve kayıt anahtarı sözleşmesi', () => {
    expect(hataIletisi(parcaHatasi()).parca).toBe(true);
    expect(hataIletisi(new Error('x')).parca).toBe(false);
    expect(depoAnahtari('veri-grafik')).toBe('geoeba_veri-grafik_v1');
  });

  it('getDerivedStateFromError hatayı duruma yazar', () => {
    const h = parcaHatasi();
    expect(PencereHataSiniri.getDerivedStateFromError(h)).toEqual({ hata: h });
  });
});

describe('tembel uygulama gövdeleri', () => {
  it('Veri ve Grafik, Olasılık, Algoritma tembel yükleyiciyle gelir; sunucu çiziminde "hazırlanıyor" görünür', () => {
    for (const id of ['veri-grafik', 'olasilik', 'algoritma']) {
      const u = uygulamaBul(id)!;
      expect((u.Bilesen as { displayName?: string }).displayName).toBe(`Tembel(${u.kisaAd})`);
      const html = renderToStaticMarkup(<u.Bilesen />);
      expect(html).toContain(`${u.kisaAd} hazırlanıyor…`);
      expect(html).toContain('data-uygulama-hazirlaniyor');
    }
    expect(UYGULAMALAR.length).toBe(4);
  });
});
