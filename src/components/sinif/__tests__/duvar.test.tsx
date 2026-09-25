// @vitest-environment node
import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  DUVAR_HALKALARI,
  DUVAR_LOGOSU,
  KARAKTER_KOYU_ZEMIN_SVG,
  YAZI_BEYAZ_SVG,
  duvarVarliklariniOnYukle,
  sonrakiKaynakSirasi,
} from '../duvarVarliklari';
import { Masaustu, YedekliGorsel } from '../Masaustu';
import { ThemeProvider } from '@/state/ThemeContext';
import { UYGULAMALAR } from '../uygulamalar';

const kok = path.resolve(__dirname, '../../../..');
const dosya = (yol: string) => readFileSync(path.join(kok, 'public', yol), 'utf8').trim();

describe('EBA logolu duvar kâğıdı', () => {
  it('logo zinciri: public/sinif kopyası → images/eba → satır içi kopya (hiç boş kalmaz)', () => {
    for (const [zincir, ad] of [
      [DUVAR_LOGOSU.karakter, 'eba-karakter-koyu-zemin.svg'],
      [DUVAR_LOGOSU.yazi, 'eba-yazi-beyaz.svg'],
    ] as const) {
      expect(zincir).toHaveLength(3);
      expect(zincir[0].endsWith(`/sinif/duvar-eba/${ad}`)).toBe(true);
      expect(zincir[1].endsWith(`/images/eba/${ad}`)).toBe(true);
      expect(zincir[2].startsWith('data:image/svg+xml,')).toBe(true);
    }
    expect(DUVAR_HALKALARI.endsWith('/sinif/duvar-eba/goz-halkalari.svg')).toBe(true);
  });

  it('marka varlıkları değiştirilmeden kopyalanır (kopya dosyalar ve satır içi yedek asılla birebir aynı)', () => {
    expect(dosya('sinif/duvar-eba/eba-karakter-koyu-zemin.svg')).toBe(dosya('images/eba/eba-karakter-koyu-zemin.svg'));
    expect(dosya('sinif/duvar-eba/eba-yazi-beyaz.svg')).toBe(dosya('images/eba/eba-yazi-beyaz.svg'));
    expect(KARAKTER_KOYU_ZEMIN_SVG).toBe(dosya('images/eba/eba-karakter-koyu-zemin.svg'));
    expect(YAZI_BEYAZ_SVG).toBe(dosya('images/eba/eba-yazi-beyaz.svg'));
    expect(decodeURIComponent(DUVAR_LOGOSU.karakter[2].slice('data:image/svg+xml,'.length))).toBe(KARAKTER_KOYU_ZEMIN_SVG);
  });

  it('hata sonrası sıradaki kaynak; zincir bitince null (gizlenir, çökmez)', () => {
    expect(sonrakiKaynakSirasi(0, 3)).toBe(1);
    expect(sonrakiKaynakSirasi(1, 3)).toBe(2);
    expect(sonrakiKaynakSirasi(2, 3)).toBeNull();
    expect(sonrakiKaynakSirasi(0, 0)).toBeNull();
  });

  it('YedekliGorsel ilk kaynağı dekoratif (alt="", aria-hidden) img olarak çizer', () => {
    const html = renderToStaticMarkup(<YedekliGorsel kaynaklar={DUVAR_LOGOSU.karakter} genislik={220} yukseklik={220} />);
    expect(html).toContain(`src="${DUVAR_LOGOSU.karakter[0]}"`);
    expect(html).toContain('alt=""');
    expect(html).toContain('aria-hidden="true"');
  });

  it('önceden yükleme sunucu tarafında hiçbir şey yapmaz (çökmez)', () => {
    expect(() => duvarVarliklariniOnYukle()).not.toThrow();
  });

  it('masaüstü: duvar katmanı aria-hidden, halka + logo, eski ada görüntüsü yok; görev çubuğunda Etkinlikler yok', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <Masaustu
          uygulamalar={UYGULAMALAR}
          pencereler={[]}
          ondeki={null}
          baslatMenusu={false}
          onBaslatMenusu={() => undefined}
          onUygulamaAc={() => undefined}
          onAdalaraDon={() => undefined}
        />
      </ThemeProvider>,
    );
    expect(html).not.toContain('duvar-kagidi.jpg');
    expect(html).toContain(`src="${DUVAR_HALKALARI}"`);
    expect(html).toContain(`src="${DUVAR_LOGOSU.karakter[0]}"`);
    expect(html).toContain(`src="${DUVAR_LOGOSU.yazi[0]}"`);
    const duvar = html.slice(0, html.indexOf(DUVAR_LOGOSU.yazi[0]));
    expect(duvar.lastIndexOf('aria-hidden="true"')).toBeGreaterThan(-1);
    // Etkinlikler düğmesi kullanıcının isteğiyle çubuktan kaldırıldı; ana girişe dönüş Başlat → "Adalara dön"
    expect(html).not.toContain('data-gorev="etkinlikler"');
    expect(html).not.toMatch(/Etkinlikler/);
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
    // Açık/koyu tema düğmesi görev çubuğunun sağ köşesinde, saatten sonra
    expect(html).toMatch(/data-tema-dugmesi/);
    expect(html.indexOf('data-tema-dugmesi')).toBeGreaterThan(html.indexOf('data-saat'));
  });
});
