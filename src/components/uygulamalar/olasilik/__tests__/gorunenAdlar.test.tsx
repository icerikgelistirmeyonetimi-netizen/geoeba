import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GORUNEN_SABLON_TURLERI, SABLON_ADLARI } from '../durum';
import { OlayPaneli } from '../OlayPaneli';
import { varsayilanSablon } from '../olasilik';

/** MEB terimi: tavla zarı yerine "sayı küpü". Kod anahtarı ('zar') ve kayıt biçimi değişmez, yalnız görünen metin. */
describe('görünen adlar: sayı küpü', () => {
  it('şablon sekmesinin adı "Sayı Küpü"; hiçbir görünen şablon adında "zar" yok', () => {
    expect(SABLON_ADLARI.zar).toBe('Sayı Küpü');
    for (const t of GORUNEN_SABLON_TURLERI) expect(SABLON_ADLARI[t]).not.toMatch(/\bzar/i);
  });

  it('olay panelindeki iki küp seçeneği "İki sayı küpü (toplam)"', () => {
    const html = renderToStaticMarkup(
      <OlayPaneli
        sablon={varsayilanSablon('zar')}
        onSablon={() => {}}
        oznel={50}
        oznelKilitli={false}
        onOznel={() => {}}
        onKilit={() => {}}
        deneme={0}
        gerceklesen={0}
        kilitli={false}
      />,
    );
    expect(html).toContain('İki sayı küpü (toplam)');
    expect(html).not.toMatch(/\bzar/i);
  });
});
