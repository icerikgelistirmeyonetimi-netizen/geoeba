import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  VARSAYILAN_YAZIM, aci, aciklama, alan, cevre, olcuDugumleri, sesli, trigOrani, uzunluk, yayUzunlugu,
} from '@/math/matematikYazimi';
import { MatematikEtiketi, etiketEsit, type MatematikEtiketiProps } from '../MatematikEtiketi';
import { MatematikMetni, metinEsit } from '../MatematikMetni';

const P = (label: string) => ({ label, showLabel: true, visible: true });
const [A, B, C] = ['A', 'B', 'C'].map(P);
const d = (o: Parameters<typeof olcuDugumleri>[0]) => olcuDugumleri(o, VARSAYILAN_YAZIM);

const ciz = (props: Partial<MatematikEtiketiProps> = {}) => {
  const o = uzunluk(A, B, 10.3923);
  const tam: MatematikEtiketiProps = {
    satirlar: [d(o)], x: 100, y: 50, px: 11, renk: 'on',
    kutu: { sinif: 'fill-background/90 stroke-border' },
    sesli: sesli(o), ipucu: aciklama(o), ...props,
  };
  return renderToStaticMarkup(<svg><MatematikEtiketi {...tam} /></svg>);
};

describe('MatematikEtiketi (tuval SVG etiketi)', () => {
  it('erişilebilir ad yalnızca aria-label; grup içinde <title> yok', () => {
    const html = ciz();
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="a be uzunluğu yaklaşık on virgül otuz dokuz birim"');
    // Fare ipucu kutunun içindedir: role="img" altındaki sunumsal düğüm ekran okuyucuya okunmaz.
    expect(html).toMatch(/<rect[^>]*data-yazim-kutu[^>]*>\s*<title>AB uzunluğu: ≈ 10,39 br<\/title><\/rect>/);
    expect(html.indexOf('<title>')).toBeGreaterThan(html.indexOf('<rect'));
  });

  it('data-yazim satırları yeni satırla birleştirir (| çubuklarıyla karışmasın)', () => {
    const html = ciz({ satirlar: [d(alan([A, B, C], 6)), d(cevre([A, B, C], 12))] });
    expect(html).toContain('data-yazim="A(ABC) = 6 br²\nÇ(ABC) = 12 br"');
  });

  it('yerleşim tek transform ile yapılır (kaydırmada etiket başına tek öznitelik)', () => {
    expect(ciz()).toContain('transform="translate(100 50)"');
    expect(ciz({ donmeAcisi: -30.5 })).toContain('transform="translate(100 50) rotate(-30.5)"');
    expect(ciz({ donmeAcisi: 0 })).toContain('transform="translate(100 50)"');
  });

  it.each([{ x: 25, y: 75 }, { x: 300, y: -100 }])('merkez $x,$y noktasına taşınınca yazı, kutu ve süs boyları sabit kalır', merkez => {
    const props = { donmeAcisi: -30.5, satirlar: [d(aci(A, B, C, 60))] };
    const temel = ciz(props);
    const html = ciz({ ...props, ...merkez });
    expect(html).toContain(`transform="translate(${merkez.x} ${merkez.y}) rotate(-30.5)"`);
    expect(html).not.toContain('scale(');
    expect(html).toContain('font-size="11"');
    // Konum haricinde kutu ölçüleri, glifler ve süslerin bütün geometrisi aynı kalır.
    expect(html.replace(`translate(${merkez.x} ${merkez.y})`, 'translate(100 50)')).toBe(temel);
  });

  it('zoom ölçeği verilmezse yazı boyutu piksel ayarıyla değişir', () => {
    const normal = ciz();
    const buyuk = ciz({ px: 18 });
    expect(normal).toContain('font-size="11"');
    expect(buyuk).toContain('font-size="18"');
    expect(buyuk).not.toContain('scale(');
    const kutuGenisligi = (html: string) => Number(html.match(/data-yazim-kutu=""[^>]*?\swidth="([\d.]+)"/)?.[1]);
    expect(kutuGenisligi(buyuk)).toBeGreaterThan(kutuGenisligi(normal));
  });

  it.each([0.25, 0.5, 1.05])('zoom ölçeği %s iken bütün etiket aynı merkez etrafında ölçeklenir', olcek => {
    const props = { donmeAcisi: -30.5, satirlar: [d(aci(A, B, C, 60))] };
    const normal = ciz(props);
    const scaled = ciz({ ...props, olcek });
    expect(scaled).toContain(`transform="translate(100 50) rotate(-30.5) scale(${olcek})"`);
    // Kutu, metin, hale ve açı süsü tek dönüşüm altındadır; canonical düzen değişmez.
    expect(scaled.replace(` scale(${olcek})`, '')).toBe(normal);
  });

  it('kutu gizliyken bile çizilir: ipucu ve fare alanı kalır, dışa aktarımda görünmez', () => {
    const html = ciz({ kutuGizli: true });
    expect(html).toContain('fill="transparent"');
    expect(html).toContain('stroke="none"');
    expect(html).not.toContain('display:none');
    expect(html).toContain('<title>');
    // Kutu gizliyken yazı zemin renginde haleyle okunur kalır
    expect(html).toContain('paint-order="stroke"');
  });

  it('kutu verildiğinde hale yok, sınıf ve dolgu kutuya uygulanır', () => {
    const html = ciz();
    expect(html).toContain('class="fill-background/90 stroke-border"');
    expect(html).not.toContain('paint-order="stroke"');
  });

  it('her yazı parçası textLength ve boşluk koruması taşır', () => {
    const html = ciz();
    const parcalar = html.match(/<text[^>]*>/g) ?? [];
    expect(parcalar.length).toBeGreaterThan(1);
    for (const t of parcalar) {
      expect(t).toMatch(/textLength="[\d.]+"/);
      expect(t).toContain('lengthAdjust="spacingAndGlyphs"');
      expect(t).toContain('xml:space="preserve"');
      expect(t).toContain('white-space:pre');
    }
    // Baştaki boşluk korunur: SVG onu silseydi textLength kalan glifleri gererdi
    expect(html).toMatch(/<text[^>]*> ≈ 10,39 br<\/text>/);
  });

  it('süsler ve mutlak değer çizgileri <path> olarak çizilir (foreignObject yok)', () => {
    const html = ciz({ satirlar: [d(aci(A, B, C, 60))] });
    expect(html).not.toContain('foreignObject');
    expect(html).toContain('<path');
    const yaySayisi = (ciz({ satirlar: [d(yayUzunlugu({ bas: A, son: B, buyuk: false }, 7.12))] }).match(/<path/g) ?? []).length;
    expect(yaySayisi).toBeGreaterThanOrEqual(3); // yay süsü + iki mutlak değer çizgisi
  });

  it('satır başına renk verilebilir (alan / çevre)', () => {
    const html = ciz({
      satirlar: [d(alan([A, B, C], 6)), d(cevre([A, B, C], 12))],
      renk: 'on', satirRengi: ['alan', 'cevre'],
    });
    expect(html).toContain('fill-ada-deniz-koyu dark:fill-ada-vurgu');
    expect(html).toContain('fill-ada-murekkep-2 dark:fill-ada-kum');
  });

  it('açık renk (hex) sınıf yerine öznitelik yazar', () => {
    expect(ciz({ renk: { hex: '#123456' } })).toContain('fill="#123456"');
  });
});

describe('MatematikEtiketi karşılaştırıcısı', () => {
  const temel = (): MatematikEtiketiProps => {
    const o = uzunluk(A, B, 5);
    return { satirlar: [d(o)], x: 10, y: 20, px: 11, renk: 'on', kutu: null, sesli: sesli(o) };
  };
  it('yalnızca düğüm dizisinin kimliği değiştiğinde yeniden çizmez', () => {
    const a = temel();
    const b = { ...a, satirlar: [d(uzunluk(A, B, 5))] };
    expect(a.satirlar).not.toBe(b.satirlar);
    expect(etiketEsit(a, b)).toBe(true);
  });
  it('değer, konum, renk ya da kutu değişince yeniden çizer', () => {
    const a = temel();
    expect(etiketEsit(a, { ...a, satirlar: [d(uzunluk(A, B, 6))] })).toBe(false);
    expect(etiketEsit(a, { ...a, x: 11 })).toBe(false);
    expect(etiketEsit(a, { ...a, renk: 'soluk' })).toBe(false);
    expect(etiketEsit(a, { ...a, renk: { hex: '#fff' } })).toBe(false);
    expect(etiketEsit(a, { ...a, kutu: { sinif: 'x' } })).toBe(false);
    expect(etiketEsit(a, { ...a, kutuGizli: true })).toBe(false);
    expect(etiketEsit(a, { ...a, donmeAcisi: 12 })).toBe(false);
    expect(etiketEsit(a, { ...a, olcek: 0.5 })).toBe(false);
    expect(etiketEsit(a, { ...a, olcek: 1 })).toBe(true);
    expect(etiketEsit(a, { ...a, sesli: 'başka' })).toBe(false);
    expect(etiketEsit(a, { ...a, satirRengi: ['alan'] })).toBe(false);
  });
  it('aynı hex rengi yeniden çizim gerektirmez', () => {
    const a = { ...temel(), renk: { hex: '#123456' } as const };
    expect(etiketEsit(a, { ...a, renk: { hex: '#123456' } })).toBe(true);
  });
});

describe('MatematikMetni (panel ve yanıt HTML gösterimi)', () => {
  const html = (p: Parameters<typeof MatematikMetni>[0]) => renderToStaticMarkup(<MatematikMetni {...p} />);

  it('düz metni data-duz olarak taşır (doğrulama betikleri bunu okur)', () => {
    expect(html({ metin: 'm(∠ABC) = 60°' })).toContain('data-duz="m(∠ABC) = 60°"');
  });

  it('görsel kısım aria-hidden, ekran okuyucu sözcükleri duyar', () => {
    const s = html({ metin: '|AB| = 5 br' });
    expect(s).toContain('aria-hidden="true"');
    expect(s).toContain('a be uzunluğu beş birim');
    expect(s).toContain('user-select:none');
  });

  it('hazır düğüm yolunda çözümleme ve seslendirme yapılmaz', () => {
    const o = alan([A, B, C], 6);
    const s = html({ dugumler: d(o), sesli: sesli(o) });
    expect(s).toContain('data-duz="A(ABC) = 6 br²"');
    expect(s).toContain('a be ce üçgeninin alanı altı birimkare');
  });

  it('süs satır yüksekliğini değiştirmez (panel yanıttan yanıta zıplamaz)', () => {
    const s = html({ metin: 'm(∠ABC) = 60°' });
    expect(s).toContain('top:-0.28em');
    expect(s).not.toContain('padding-top:0.32em');
  });

  it('kopyalama için gizli yardımcı karakterler bulunur', () => {
    expect(html({ metin: 'm(∠ABC)' })).toContain('∠');
    expect(html({ metin: '|A͡B| ≈ 7,12 br' })).toContain('͡');
    expect(html({ metin: '|AB|' })).toContain('border-left:0.085em solid currentColor');
  });

  it('mutlak değerli kesirde bölü işaretinin iki yanı açılır', () => {
    const trig = html({ dugumler: d(trigOrani('sin', B, [A, C], [B, C], 3, 5, 0.6)) });
    expect(trig).toContain('margin:0 0.12em');
  });

  it('birimden önce bölünmez boşluk gelir', () => {
    expect(html({ metin: '|AB| = 5 br' })).toContain(' br');
  });

  it("as='div' sarmalayıcıyı değiştirir", () => {
    expect(html({ metin: '5 br', as: 'div' }).startsWith('<div')).toBe(true);
  });

  it('karşılaştırıcı aynı içerikte yeniden çizmez', () => {
    const o = alan([A, B, C], 6);
    expect(metinEsit({ dugumler: d(o) }, { dugumler: d(o) })).toBe(true);
    expect(metinEsit({ dugumler: d(o) }, { dugumler: d(alan([A, B, C], 7)) })).toBe(false);
    expect(metinEsit({ metin: 'a' }, { metin: 'b' })).toBe(false);
    expect(metinEsit({ metin: 'a' }, { metin: 'a', ayar: { olcuYazimi: 'kisa', aciYazimi: 'sapka' } })).toBe(false);
  });
});
