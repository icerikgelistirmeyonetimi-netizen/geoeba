import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  VARSAYILAN_YAZIM, aciklama, alan, daireAlani, duzMetin, latex, metinDugumleri,
  metniCozumle, olcuDugumleri, olcuLatex, olcuMetni, type Dugum,
} from '../matematikYazimi';
import { duzenle, kutuOlcusu } from '../yazimDuzeni';
import { metinGenisligi } from '../yaziGenisligi';
import { MatematikMetni } from '@/components/workspace/MatematikMetni';
import { etiketOlcusu3B } from '@/components/workspace/etiket3B';

const noktalar = ['A', 'B', 'C'].map(label => ({ label, showLabel: true, visible: true }));

describe('bütün kademelerde alan biriminin açık yazımı', () => {
  it.each([undefined, false, true])('eski alanBirimiAcik=%s ayarı kısaltmayı geri getirmez', alanBirimiAcik => {
    const ayar = { ...VARSAYILAN_YAZIM, alanBirimiAcik };
    const olcu = alan(noktalar, 12);
    expect(olcuMetni(olcu, ayar)).toBe('A(ABC) = 12 birimkare');
    expect(aciklama(olcu, ayar)).toBe('ABC üçgeninin alanı: 12 birimkare');
    expect(olcuLatex(olcu, ayar)).toContain('12\\ \\text{birimkare}');
    const html = renderToStaticMarkup(<MatematikMetni dugumler={olcuDugumleri(olcu, ayar)} />);
    expect(html).toContain('12 birimkare');
    expect(html).not.toContain('br²');
  });

  it.each(['A(ABC) = 12 br²', 'A(ABC) = 12 birimkare'])('eski ve yeni metin aynı görüntü ağacına çözülür: %s', metin => {
    const dugumler = metniCozumle(metin);
    expect(dugumler).toContainEqual({ t: 'birim', s: 'br²' });
    expect(duzMetin(dugumler)).toBe('A(ABC) = 12 birimkare');
    expect(latex(dugumler)).toContain('12\\ \\text{birimkare}');
    const html = renderToStaticMarkup(<MatematikMetni metin={metin} />);
    expect(html).toContain('data-duz="A(ABC) = 12 birimkare"');
    expect(html).not.toContain('br²');
  });

  it('eski birim anahtarı iç içe düğümlerde de bütün çıktı yollarında açık yazılır', () => {
    const dugumler: Dugum[] = [{ t: 'kesir', pay: metinDugumleri('12 br²'), payda: metinDugumleri('3 br') }];
    expect(duzMetin(dugumler)).toBe('12 birimkare/3 br');
    expect(latex(dugumler)).toBe('\\frac{12\\ \\text{birimkare}}{3\\ \\mathrm{br}}');
    expect(duzenle(dugumler, 13).parcalar.map(p => p.s).join(' ')).toContain('birimkare');
  });

  it('uzunluk, hacim, santimetrekare ve formüldeki kare üsleri değişmez', () => {
    expect(duzMetin(metinDugumleri('5 br, 8 br³, 12 cm², 60°'))).toBe('5 br, 8 br³, 12 cm², 60°');
    expect(olcuMetni(alan(noktalar, 12, { birim: 'cm' }))).toBe('A(ABC) = 12 cm²');
    expect(olcuMetni(daireAlani(9 * Math.PI))).toBe('Alan = πr² ≈ 28,27 birimkare');
  });

  it('2B kutusu ve 3B dokusu uzun birimin tamamını kapsar', () => {
    const dugumler = metinDugumleri('Alan = 1234,56 br²');
    const metin = 'Alan = 1234,56 birimkare';
    const genislik = metinGenisligi(metin, 13, 700);
    const kutu = kutuOlcusu([dugumler], 13);
    const doku = etiketOlcusu3B({ tur: 'olcu', dugumler, px: 13, agirlik: 700, aile: 'sans', renk: '#000000' });
    expect(kutu.genislik).toBeGreaterThan(genislik);
    expect(doku.genislik).toBeGreaterThanOrEqual(genislik);
    expect(doku.duzen.parcalar.map(p => p.s).join('')).toBe(metin);
  });
});
