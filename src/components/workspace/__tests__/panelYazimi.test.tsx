import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { uzunluk } from '@/math/matematikYazimi';
import { metinSatiri, olcuSatiri } from '@/math/panelYazimlari';
import { MatematikMetni } from '../MatematikMetni';
import { PanelOlcusu } from '../PanelOlcusu';
import { YazimKopyala, panoyaYaz } from '../YazimKopyala';

/**
 * Panel yüzeylerinin yazım katmanı: ölçü satırı MEB yazımıyla çizilir ve ekran okuyucuya sözcük
 * biçimini verir; yazımı olmayan satır düz metin kalır. Kopyalama düğmeleri metni ve LaTeX'i verir.
 * (Projede jsdom yok; iki mevcut bileşen sınaması gibi renderToStaticMarkup kullanılır.)
 */

const P = (label: string) => ({ label, showLabel: true, visible: true });
const [A, B] = ['A', 'B'].map(P);

describe('PanelOlcusu', () => {
  it('ölçü satırını MEB yazımıyla çizer, düz metni data-duz taşır', () => {
    const html = renderToStaticMarkup(<PanelOlcusu satir={olcuSatiri(uzunluk(A, B, 5))} />);
    expect(html).toContain('data-duz="|AB| = 5 br"');
    // Mutlak değer çizgisi kenarlıktır, '|' karakteri değil.
    expect(html).toContain('border-left:0.085em solid currentColor');
    // Ekran okuyucu sözcükleri duyar.
    expect(html).toContain('a be uzunluğu beş birim');
  });

  it('ölçü satırına fare ipucu koyar, istenmezse koymaz', () => {
    expect(renderToStaticMarkup(<PanelOlcusu satir={olcuSatiri(uzunluk(A, B, 5))} />))
      .toContain('title="AB uzunluğu: 5 br"');
    expect(renderToStaticMarkup(<PanelOlcusu satir={olcuSatiri(uzunluk(A, B, 5))} ipucu={false} />))
      .not.toContain('title=');
  });

  it('düz metin satırı çözümlenmez; mono sınıfını korur', () => {
    const html = renderToStaticMarkup(
      <PanelOlcusu satir={metinSatiri('y = 2x + 1')} className="text-xs" metinSinifi="font-mono" />
    );
    expect(html).toBe('<span class="text-xs font-mono">y = 2x + 1</span>');
  });

  it('as="div" ile blok satır olur', () => {
    expect(renderToStaticMarkup(<PanelOlcusu satir={metinSatiri('Yay')} as="div" />)).toMatch(/^<div/);
    expect(renderToStaticMarkup(<PanelOlcusu satir={olcuSatiri(uzunluk(A, B, 5))} as="div" />)).toMatch(/^<div/);
  });
});

describe('Açı yazımı ayarının önizlemesi', () => {
  const ciz = (aciYazimi: 'sapka' | 'isaret') =>
    renderToStaticMarkup(<MatematikMetni metin="m(∠ABC) = 60°" ayar={{ olcuYazimi: 'tam', aciYazimi }} />);

  it('şapkalı seçenek harflerin üstüne çizilmiş şapka verir', () => {
    const html = ciz('sapka');
    expect(html).toContain('M3,9 L50,1.5 L97,9');
    // Kopyalanan metin yine MEB düz yazımıdır.
    expect(html).toContain('data-duz="m(∠ABC) = 60°"');
  });

  it('∠ işaretli seçenekte şapka çizilmez', () => {
    const html = ciz('isaret');
    expect(html).not.toContain('M3,9 L50,1.5 L97,9');
    expect(html).toContain('m(∠');
  });

  it('iki seçenek de aynı sözcükleri okutur', () => {
    expect(ciz('sapka')).toContain('a be ce açısının ölçüsü altmış derece');
    expect(ciz('isaret')).toContain('a be ce açısının ölçüsü altmış derece');
  });
});

describe('YazimKopyala', () => {
  it('iki düğme: Metni kopyala ve LaTeX olarak kopyala', () => {
    const html = renderToStaticMarkup(<YazimKopyala metin="A(ABC) = 6 br²" />);
    expect(html).toContain('aria-label="Metni kopyala"');
    expect(html).toContain('aria-label="LaTeX olarak kopyala"');
    expect(html).toContain('data-yazim-kopyala="1"');
  });

  it('pano yoksa hata fırlatmaz, false döner', async () => {
    await expect(panoyaYaz('deneme')).resolves.toBe(false);
  });
});

describe('MatematikMetni: adlar ve aksanlı harfler', () => {
  it('panel satırında A_1 alt indise, B′ prime döner; kopyada A_1 kalır', () => {
    const html = renderToStaticMarkup(<PanelOlcusu satir={olcuSatiri(uzunluk(P('A_1'), P("B'"), 4))} />);
    expect(html).toContain('data-duz="|A_1B&#x27;| = 4 br"');
    // Görsel kısımda düz '_' YOK; alt indis kendi küçük kutusunda ve prim ′ olarak çizilir.
    expect(html).toContain('font-size:0.68em');
    expect(html).toContain('vertical-align:sub');
    expect(html).toContain('′');
    // Seçip kopyalayınca 'A_1' gelsin diye gizli '_' korunur.
    expect(html).toContain('>_</span>');
  });

  it('şapka aksanlı büyük harflerin (İ, Ğ) üstüne çıkar', () => {
    const duz = renderToStaticMarkup(<MatematikMetni metin="m(∠ABC) = 60°" />);
    const aksanli = renderToStaticMarkup(<MatematikMetni metin="m(∠İÇĞ) = 60°" />);
    expect(duz).toContain('top:-0.28em');
    expect(aksanli).toContain('top:-0.42em');
    expect(aksanli).not.toContain('top:-0.28em');
  });
});
