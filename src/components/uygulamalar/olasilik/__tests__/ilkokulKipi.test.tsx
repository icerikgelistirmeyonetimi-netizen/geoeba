// İlkokul kademesi (alan uzmanı, 4. tur — geoeba (3).xlsx satır 183): Kademe menüsünde İlkokul seçiliyken Olasılık
// Laboratuvarı «olay kartları» görünümüyle açılır (sayı, kesir, yüzde, öznel/teorik/deneysel paneller, sayı küpü yok);
// ortaokul, lise ve Tüm araçlar'da laboratuvar değişmez. Kullanıcı isteği (13.10): sayı küpü simgesinde rakam.
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import OlasilikUygulamasi from '../index';
import { SablonSimgesi } from '../SablonSimgesi';
import { OLAY_KARTLARI, OLAY_SINIFI_ADLARI, OLAY_SINIFI_IPUCLARI, OLAY_SINIFLARI } from '../olayKartlari';
import type { KademeDuzeyi } from '@/components/workspace/kademeDuzeyleri';

const bos = () => undefined;
const kademe = vi.hoisted(() => ({ deger: 'tum' as KademeDuzeyi }));
vi.mock('@/hooks/useKademeDuzeyi', async (orijinal) => {
  const m = await orijinal<typeof import('@/hooks/useKademeDuzeyi')>();
  return {
    ...m,
    useKademeDuzeyi: () => [kademe.deger, bos] as const,
    useIlkokulKipi: () => kademe.deger === 'ilkokul',
    kademeDuzeyiniOku: () => kademe.deger,
  };
});
afterEach(() => {
  kademe.deger = 'tum';
});

function ciz(k: KademeDuzeyi): string {
  kademe.deger = k;
  return renderToStaticMarkup(<OlasilikUygulamasi pencereGenisligi={1280} />);
}

/** Görünen metin: etiketler atılır (sınıf adları, SVG yolları vb. sayı içerir) */
function metin(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('Olasılık: ilkokulda «olay kartları»', () => {
  it('ilk kart (uzmanın örneği), üç sınıf düğmesi, torbanın içi ve deney düğmeleri görünür', () => {
    const html = ciz('ilkokul');
    expect(html).toContain('data-olasilik-kip="olay-kartlari"');
    const m = metin(html);
    expect(m).toContain('Olay kartları');
    expect(m).toContain(OLAY_KARTLARI[0].olay);
    for (const s of OLAY_SINIFLARI) {
      expect(m).toContain(OLAY_SINIFI_ADLARI[s]);
      expect(m).toContain(OLAY_SINIFI_IPUCLARI[s]);
    }
    expect(m).toContain('Bu olay sence nasıl?');
    expect(m).toContain('Torbanın içi');
    expect(m).toContain('Bir bilye çek');
    expect(m).toContain('Çok kez çek');
    expect(m).toContain('Önce karar ver: Bu olay imkânsız mı, olabilir mi, kesin mi?');
    // Önce karar: deney düğmeleri sınıflandırmadan önce kapalı
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-olay-dene="bir"/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-olay-dene="cok"/);
    // Altı kart sekmesi (torba / çark simgesiyle; sayı yazmadan)
    expect(html.match(/data-olay-sekme=/g)).toHaveLength(OLAY_KARTLARI.length);
  });

  it('görünen metinde sayı, kesir, yüzde, teorik/deneysel/öznel paneli, frekans tablosu ve sayı küpü yok', () => {
    const m = metin(ciz('ilkokul'));
    expect(m).not.toMatch(/[0-9%]/);
    expect(m).not.toMatch(/teorik|deneysel|öznel|frekans|kesir|yüzde|sayı küpü|madeni para|galton|\bzar/i);
    // Sekme simgeleri yalnız torba ve çark (sayı küpü simgesi yok)
    expect(ciz('ilkokul')).not.toContain('<text');
  });

  it('ortaokul, lise ve Tüm araçlar: önce sınıf seçimi (TEGM 20.10.2026); kademenin sınıfları, Galton ve olay kartları yok', () => {
    const beklenen = { ortaokul: ['5', '6', '7', '8'], lise: ['9', '10'], tum: ['5', '6', '7', '8', '9', '10'] } as const;
    for (const k of ['ortaokul', 'lise', 'tum'] as const) {
      const html = ciz(k);
      expect(html).toContain('data-olasilik-kip="sinif-secimi"');
      expect(Array.from(html.matchAll(/data-sinif-secenek="(\d+)"/g), (m) => m[1])).toEqual(beklenen[k]);
      const m = metin(html);
      expect(m).toContain('Sınıfını seç');
      expect(m).not.toContain('Olay kartları');
      // Laboratuvar sınıf seçilmeden açılmaz: şablon sekmesi, deney düğmesi, Galton yok
      expect(m).not.toMatch(/Galton Tahtası|1 Kez Dene|Madeni Para/);
    }
  });
});

describe('sayı küpü simgesi: rakam, nokta yok (kullanıcı isteği 13.10)', () => {
  it('şablon sekmesindeki sayı küpü simgesi ortada bir rakam yazar, daire (nokta) çizmez', () => {
    const html = renderToStaticMarkup(<SablonSimgesi tur="zar" />);
    expect(html).toMatch(/<text[^>]*>3<\/text>/);
    expect(html).not.toContain('<circle');
  });
});
