import { describe, expect, it } from 'vitest';
import { ATOLYELER_5_8 } from '../atolye58';
import { sina } from '../degerlendirme';
import { izOzeti } from '../yorumlayici';
import { programKur, type KisaBlok, type Program } from '../program';
import type { Atolye } from '../gorev';
import { atolyeleriDenetle } from './uniteDenetimi';

const atolye = (id: string): Atolye => {
  const a = ATOLYELER_5_8.find((x) => x.id === id);
  if (!a) throw new Error(`atölye yok: ${id}`);
  return a;
};
const sinav = (a: Atolye, p: Program) =>
  sina(p, { gorunen: a.dunyalar[0], sinama: a.dunyalar.slice(1), hedef: a.hedef, enFazlaBlok: a.enCokBlok, bitkiAdi: a.bitkiAdi }, 1);
/** Dünya adı → çocuğun okuyacağı ileti */
const iletiler = (a: Atolye, p: Program) => Object.fromEntries(sinav(a, p).dunyalar.map((d) => [d.dunya.ad, d.ileti]));

type Ozet = ReturnType<typeof izOzeti>;
interface Beklenen {
  /** İlk dünyaya göre sayılmış (ezber) kod: ilk dünyada doğru, başka dünyada bozulur */
  ezber: KisaBlok[];
  /** Ezber kodun bazı dünyalardaki iletisi */
  ezberIletileri: Record<string, string>;
  /** Çözüm bitince değişkenler, dünya sırasıyla */
  degiskenler: Record<string, number>[];
  /** Çözümün her dünyadaki işi (izOzeti'nden bir ölçü), dünya sırasıyla */
  is: { olcu: keyof Ozet; degerler: number[] };
}

const BEKLENEN: Record<string, Beklenen> = {
  'a5-hasattan-tohuma': {
    ezber: ['ileri', 'topla', 'ileri', 'ileri', 'topla', 'ileri', 'topla', 'ileri', 'ileri', 'sagaDon', 'ileri', 'sagaDon', 'ileri', 'ek', 'ileri', 'ek', 'ileri', 'ek'],
    ezberIletileri: { 'Uzun sıra': '1. bitkideki domates yeşildi; ham domates koparıldı.', 'Hepsi olgun': 'Robot tarlanın çitine çarptı.' },
    degiskenler: [{ sayaç: 3 }, { sayaç: 5 }, { sayaç: 4 }, { sayaç: 1 }],
    is: { olcu: 'boya', degerler: [3, 5, 4, 1] },
  },
  'a5-gokdelen': {
    ezber: [['ata', 'kat', 1], ['kez', 4, ['ileri', ['kez', 'kat', ['koy']], ['ata', 'kat', ['kat', '+', 1]]]], 'ileri'],
    ezberIletileri: {
      'Altı bina': 'Dron çıkışa varamadı: çıkış 2 kare uzakta. Yapıda 11 küp eksik (2 kulede).',
      'Üç bina': 'Dron küpü yanlış yere koydu; burada küp olmayacaktı.',
    },
    degiskenler: [{ kat: 5 }, { kat: 7 }, { kat: 4 }, { kat: 6 }],
    is: { olcu: 'kup', degerler: [10, 21, 6, 15] },
  },
  'a5-merdiven-tarla': {
    ezber: [['ata', 'kat', 1], ['kez', 4, [['kez', 'kat', ['ek', 'ileri']], 'sagaDon', 'sagaDon', ['kez', 'kat', ['ileri']], 'solaDon', 'ileri', 'solaDon', ['ata', 'kat', ['kat', '+', 2]]]]],
    ezberIletileri: { 'Beş sıra': 'Robot çıkışa varamadı: çıkış 1 kare uzakta. Tarlada 9 kare boş kaldı.', 'Üç sıra': 'Robot tarlanın dışına tohum ekti.' },
    degiskenler: [{ kat: 9 }, { kat: 11 }, { kat: 7 }, { kat: 5 }],
    // 1 + 3 + 5 + 7 = 4 × 4
    is: { olcu: 'boya', degerler: [16, 25, 9, 4] },
  },
  'a6-gubre-takvimi': {
    // k = 3 ezberlenmiş: "sıra mod 3"
    ezber: [['ata', 'sıra', 0], 'ileri', ['kadar', 'cikistayim', [['ata', 'sıra', ['sıra', '+', 1]], ['eger', [['sıra', 'mod', 3], '=', 0], ['gubreVer']], ['eger', 'toprakKuru', ['sula']], 'ileri']]],
    ezberIletileri: { 'k = 4': '3. saksıdaki fidenin yaprakları sağlamdı; gübre gereksizdi.', 'k = 2': '3. saksıdaki fidenin yaprakları sağlamdı; gübre gereksizdi.' },
    degiskenler: [
      { k: 3, sıra: 9 },
      { k: 4, sıra: 12 },
      { k: 2, sıra: 7 },
      { k: 5, sıra: 11 },
    ],
    is: { olcu: 'gubre', degerler: [3, 3, 3, 2] },
  },
  'a6-piramit': {
    ezber: [
      ['ata', 'i', 1],
      ['kez', 3, ['ileri', ['kez', [[2, '×', 'i'], '-', 1], ['koy']], ['ata', 'i', ['i', '+', 1]]]],
      ['ata', 'i', ['i', '-', 2]],
      ['kez', 2, ['ileri', ['kez', [[2, '×', 'i'], '-', 1], ['koy']], ['ata', 'i', ['i', '-', 1]]]],
    ],
    ezberIletileri: { 'n = 4': 'Yapıda 12 küp eksik (4 kulede).', 'n = 2': 'Bu kule 1 küp olmalı; fazladan küp kondu.' },
    degiskenler: [
      { n: 3, i: 0 },
      { n: 4, i: 0 },
      { n: 2, i: 0 },
    ],
    // n² + (n − 1)²
    is: { olcu: 'kup', degerler: [13, 25, 5] },
  },
  'a6-sarmal-pist': {
    ezber: [['ata', 'i', 1], ['kez', 5, [['kez', 'i', ['ileri']], 'sagaDon', ['ata', 'i', ['i', '+', 1]]]]],
    ezberIletileri: { 'n = 7': 'Şeklin 13 çizgisi eksik kaldı.', 'n = 4': 'Robot şekilde olmayan bir çizgi çizdi.' },
    degiskenler: [
      { n: 5, i: 6 },
      { n: 7, i: 8 },
      { n: 4, i: 5 },
      { n: 6, i: 7 },
    ],
    // 1 + 2 + … + n
    is: { olcu: 'cizgi', degerler: [15, 28, 10, 21] },
  },
  'a7-sera-bloklari': {
    ezber: [['kez', 2, [['kez', 4, ['ileri', ['eger', 'toprakKuru', ['sula']], ['eger', 'domatesKirmizi', ['topla']]]], 'sagaDon', 'sagaDon', ['kez', 4, ['ileri']], 'solaDon', 'ileri', 'solaDon']]],
    ezberIletileri: {
      '5 × 3 sera': '5., 11. ve 15. bitki susuz kaldı. 2 olgun domates dalda kaldı (10. ve 12. bitki).',
      '6 × 1 sera': 'Robot bahçenin çitine çarptı.',
    },
    degiskenler: [
      { en: 4, boy: 2 },
      { en: 5, boy: 3 },
      { en: 3, boy: 4 },
      { en: 6, boy: 1 },
    ],
    is: { olcu: 'sulama', degerler: [3, 5, 4, 2] },
  },
  'a7-tribun': {
    ezber: [['ata', 'basamak', 3], ['kez', 3, [['kez', 4, ['ileri', ['kez', 'basamak', ['koy']]]], 'sagaDon', 'sagaDon', ['kez', 4, ['ileri']], 'solaDon', 'ileri', 'solaDon', ['ata', 'basamak', ['basamak', '-', 1]]]]],
    ezberIletileri: { '3 × 5 tribün': 'Dron küpü yanlış yere koydu; burada küp olmayacaktı.', '6 × 2 tribün': 'Bu kule 2 küp olmalı; fazladan küp kondu.' },
    degiskenler: [
      { en: 4, boy: 3, basamak: 0 },
      { en: 3, boy: 5, basamak: 0 },
      { en: 6, boy: 2, basamak: 0 },
      { en: 2, boy: 4, basamak: 0 },
    ],
    // en × (1 + 2 + … + boy)
    is: { olcu: 'kup', degerler: [24, 45, 18, 20] },
  },
  'a7-gol-yansimasi': {
    ezber: ['kalemKaldir', 'sagaDon', 'ileri', 'kalemIndir', 'sagaDon', ['kez', 3, ['ileri', 'solaDon', 'ileri', 'sagaDon', 'ileri', 'sagaDon', 'ileri', 'solaDon']]],
    ezberIletileri: { 'Dört dişli sur': 'Şeklin 4 çizgisi eksik kaldı.', 'İki dişli sur': 'Robot sahanın kenarına geldi; daha ileri gidemez.' },
    degiskenler: [{ n: 3 }, { n: 4 }, { n: 2 }],
    is: { olcu: 'cizgi', degerler: [12, 16, 8] },
  },
  'a8-dogru-grafigi': {
    ezber: ['solaDon', 'ileri', 'sagaDon', ['kez', 3, ['isaretle', 'ileri', 'solaDon', ['kez', 2, ['ileri']], 'sagaDon']], 'isaretle'],
    ezberIletileri: { 'y = x + 2': 'Robot yanlış noktayı işaretledi: (0, 1).', 'y = 3': 'Robot yanlış noktayı işaretledi: (0, 1).' },
    degiskenler: [
      { m: 2, b: 1, n: 4 },
      { m: 1, b: 2, n: 6 },
      { m: 3, b: 0, n: 3 },
      { m: 0, b: 3, n: 5 },
    ],
    is: { olcu: 'nokta', degerler: [4, 6, 3, 5] },
  },
  'a8-site-insaati': {
    ezber: ['ileri', ['kez', 3, ['koy']], 'ileri', 'koy', 'ileri', 'ileri', ['kez', 3, ['koy']], 'ileri', 'koy', 'ileri', 'ileri', ['kez', 3, ['koy']], 'ileri', 'koy'],
    ezberIletileri: { 'Geniş aralık': 'Dron küpü yanlış yere koydu; burada küp olmayacaktı.', 'Tek blok': 'Dron inşaat alanının kenarına geldi; daha ileri gidemez.' },
    degiskenler: [
      { n: 3, ara: 1 },
      { n: 2, ara: 3 },
      { n: 4, ara: 0 },
      { n: 1, ara: 4 },
    ],
    // blok başına 3 + 1 küp
    is: { olcu: 'kup', degerler: [12, 8, 16, 4] },
  },
  'a8-uslu-sera': {
    ezber: ['ileri', 'gubreVer', 'ileri', 'gubreVer', 'sula', 'ileri', 'sula', 'ileri', 'gubreVer', 'ileri', 'ileri', 'sula', 'ileri', 'ileri', 'gubreVer', 'sula', 'ileri', 'sula', 'ileri'],
    ezberIletileri: { 'r = 3': '2. saksıdaki fidenin yaprakları sağlamdı; gübre gereksizdi.', 'Kısa sıra': '2. saksının toprağı zaten nemliydi; su taştı.' },
    // Döngü bitince kuvvet, sıradan büyük ilk kuvvettir: 2⁴, 3³, 2³, 4²
    degiskenler: [
      { r: 2, kuvvet: 16 },
      { r: 3, kuvvet: 27 },
      { r: 2, kuvvet: 8 },
      { r: 4, kuvvet: 16 },
    ],
    is: { olcu: 'gubre', degerler: [4, 3, 3, 2] },
  },
};

describe('Atölye 5–8. sınıf', () => {
  it('ortak denetim: çözümler ★★★, boş kod ★ almaz, kurallar sınıfa uygun', () => {
    atolyeleriDenetle(ATOLYELER_5_8);
  });

  it('her sınıfta üç proje; kimlik, görünüm ve dünya türleri', () => {
    for (const sinif of [5, 6, 7, 8]) {
      const l = ATOLYELER_5_8.filter((a) => a.sinif === sinif);
      expect(l.length, `${sinif}. sınıf`).toBe(3);
      for (const a of l) {
        expect(a.id.startsWith(`a${sinif}-`), a.id).toBe(true);
        expect(a.gorunum, a.id).toBe(sinif <= 6 ? 'blok' : 'ifade');
        expect(a.kazanimlar.length, a.id).toBeGreaterThan(0);
      }
    }
    expect(Object.keys(BEKLENEN).sort()).toEqual(ATOLYELER_5_8.map((a) => a.id).sort());
  });

  it('bildirilen değişkenler dünyaların verdiği değişkenleri de içerir; ölçümler bildirilmiş', () => {
    for (const a of ATOLYELER_5_8) {
      for (const d of a.dunyalar) for (const v of Object.keys(d.degiskenler ?? {})) expect(a.degiskenler ?? [], `${a.id}: ${v}`).toContain(v);
    }
    expect(atolye('a8-uslu-sera').olcumler).toEqual(['x']);
  });

  for (const a of ATOLYELER_5_8) {
    const b = BEKLENEN[a.id];
    describe(a.id, () => {
      it('ilk dünyaya göre sayılmış kod ★ alır ama ★★ almaz', () => {
        const p = programKur(b.ezber, `${a.id}-ezber-`);
        const s = sinav(a, p);
        expect(s.dunyalar[0].basarili, `${a.id}: ezber kod ilk dünyada doğru olmalı (${s.dunyalar[0].ileti})`).toBe(true);
        expect(s.yildiz).toBe(1);
        const m = iletiler(a, p);
        for (const [dunya, ileti] of Object.entries(b.ezberIletileri)) expect(m[dunya], `${a.id} / ${dunya}`).toBe(ileti);
      });

      it('çözüm her dünyada doğru çalışır; son değişkenler ve yapılan iş', () => {
        const s = sinav(a, a.cozum);
        expect(s.dunyalar.map((d) => d.ileti)).toEqual(a.dunyalar.map(() => 'Program bu dünyada doğru çalıştı.'));
        expect(s.dunyalar.map((d) => d.iz.son.degiskenler)).toEqual(b.degiskenler);
        expect(s.dunyalar.map((d) => izOzeti(d.iz)[b.is.olcu])).toEqual(b.is.degerler);
        expect(s.verimlilikNotu).toBeNull();
      });
    });
  }

  it('öteki yollar: bir fazla tekrar kenara çarpar; uzun ama doğru kod ★★ ve verimlilik notu alır', () => {
    // Doğru grafiği: son noktadan sonra da "1 sağa, m yukarı" giden kod düzlemin dışına çıkar
    const fazla = programKur(['solaDon', ['kez', 'b', ['ileri']], 'sagaDon', ['kez', 'n', ['isaretle', 'ileri', 'solaDon', ['kez', 'm', ['ileri']], 'sagaDon']]], 'a8o1-');
    expect(iletiler(atolye('a8-dogru-grafigi'), fazla)).toEqual({
      'y = 2x + 1': 'Robot sahanın kenarına geldi; daha ileri gidemez.',
      'y = x + 2': 'Robot sahanın kenarına geldi; daha ileri gidemez.',
      'y = 3x': 'Robot sahanın kenarına geldi; daha ileri gidemez.',
      'y = 3': 'Program bu dünyada doğru çalıştı.',
    });
    // Site: son bloktan sonra da boşluk bırakan kod alanın kenarına çıkar (bitişik bloklarda çalışır)
    const site = programKur([['kez', 'n', ['ileri', ['kez', 3, ['koy']], 'ileri', 'koy', ['kez', 'ara', ['ileri']]]]], 'a8o2-');
    const siteSinav = sinav(atolye('a8-site-insaati'), site);
    expect(siteSinav.yildiz).toBe(0);
    expect(siteSinav.dunyalar[0].ileti).toBe('Dron inşaat alanının kenarına geldi; daha ileri gidemez.');
    expect(siteSinav.dunyalar[2].basarili).toBe(true);
    // Yansıma: aynadaki başlangıca gidip aynı yönde çizmek de doğrudur, ama daha uzundur
    const gidip = programKur(
      ['kalemKaldir', 'sagaDon', 'ileri', 'sagaDon', ['kez', [2, '×', 'n'], ['ileri']], 'sagaDon', 'sagaDon', 'kalemIndir', ['kez', 'n', ['sagaDon', 'ileri', 'solaDon', 'ileri', 'solaDon', 'ileri', 'sagaDon', 'ileri']]],
      'a7o3-'
    );
    const g = sinav(atolye('a7-gol-yansimasi'), gidip);
    expect(g.yildiz).toBe(2);
    expect(g.verimlilikNotu).toBe('Programında 18 blok var. Aynı işi 15 blokla yapmak mümkün.');
    // Üslü sera: x ölçümü yerine ayrı sayaç tutmak doğru ama bir blok fazla
    const sayacli = programKur(
      [
        ['ata', 'sıra', 0],
        ['ata', 'kuvvet', 1],
        'ileri',
        ['kadar', 'cikistayim', [['ata', 'sıra', ['sıra', '+', 1]], ['eger', ['sıra', '=', 'kuvvet'], ['gubreVer', ['ata', 'kuvvet', ['kuvvet', '×', 'r']]]], ['eger', 'toprakKuru', ['sula']], 'ileri']],
      ],
      'a8o3-'
    );
    const u = sinav(atolye('a8-uslu-sera'), sayacli);
    expect(u.yildiz).toBe(2);
    expect(u.verimlilikNotu).toBe('Programında 11 blok var. Aynı işi 10 blokla yapmak mümkün.');
  });
});
