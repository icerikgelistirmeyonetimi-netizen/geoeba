// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DeneyAlani } from '../DeneyAlani';
import { GORUNEN_SABLON_TURLERI } from '../durum';
import { varsayilanSablon } from '../olasilik';

/**
 * Sayı küpü / para kartının boş kalması (BOS, 14.10.2026): three'nin tuvali kart içindeki div'e elle eklenir. Bileşenin
 * ağaç yapısı Galton'da (sarmalayıcı div) ve öbür şablonlarda (parça) farklıydı; React geçişte düğümleri konumla
 * yeniden kullanıp siliyor, sahne Galton'dayken kurulduysa tuval belgeden kopuyordu. Yapı her şablonda aynı olmalı.
 */
function ciz(tur: (typeof GORUNEN_SABLON_TURLERI)[number]): string {
  return renderToStaticMarkup(
    <DeneyAlani sablon={varsayilanSablon(tur)} koyu={false} azHareket={false} onBitti={() => {}} sonSonuc={null} animasyonda={false} />
  );
}

/** Kök etiketi ve doğrudan çocukların sırası (etiket + ayırt edici öznitelik) */
function iskelet(html: string): string[] {
  const kok = html.match(/^<div class="flex flex-col gap-1\.5" data-deney-alani-kabi="true">/);
  const parcalar = ['kök:' + (kok ? 'sarmalayıcı' : html.slice(0, 60))];
  parcalar.push(html.includes('data-deney-alani="true"') ? 'kart' : 'kart yok');
  parcalar.push(html.indexOf('data-deney-alani="true"') < html.indexOf('data-deney-canli') ? 'kart→canlı' : 'sıra bozuk');
  return parcalar;
}

describe('deney alanı ağaç yapısı şablondan bağımsız', () => {
  it('her görünen şablonda aynı sarmalayıcı, önce kart sonra canlı bölge; Galton anahtarı yalnız Galton\'da', () => {
    const beklenen = ['kök:sarmalayıcı', 'kart', 'kart→canlı'];
    for (const tur of GORUNEN_SABLON_TURLERI) {
      const html = ciz(tur);
      expect(iskelet(html), tur).toEqual(beklenen);
      expect(html.includes('data-galton-anahtar'), tur).toBe(tur === 'galton');
    }
  });

  it('kartın açılış etiketi şablonlar arasında aynı (yalnız yükseklik değişir): React düğümü yeniden kullanır, silmez', () => {
    const kartEtiketi = (html: string) => {
      const i = html.indexOf('<div class="relative w-full overflow-hidden');
      return html.slice(i, html.indexOf('style=', i));
    };
    const galton = kartEtiketi(ciz('galton'));
    for (const tur of GORUNEN_SABLON_TURLERI) expect(kartEtiketi(ciz(tur)), tur).toBe(galton);
  });
});
