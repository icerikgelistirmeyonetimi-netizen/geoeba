import { describe, expect, it } from 'vitest';
import { sina } from '../degerlendirme';
import { izgara } from '../dunya';
import { blokSayisi, programKur, type KisaBlok, type Program } from '../program';
import { ATOLYELER_1_4 } from '../atolye14';
import type { Atolye } from '../gorev';
import { atolyeleriDenetle } from './uniteDenetimi';

const atolye = (id: string): Atolye => {
  const a = ATOLYELER_1_4.find((x) => x.id === id);
  if (!a) throw new Error(id);
  return a;
};
/** Sına düğmesinin yaptığı: görünen dünya + sınama dünyaları */
const sinat = (a: Atolye, p: Program) =>
  sina(p, { gorunen: a.dunyalar[0], sinama: a.dunyalar.slice(1), hedef: a.hedef, enFazlaBlok: a.enCokBlok, bitkiAdi: a.bitkiAdi }, 1);

const ileri = (n: number): KisaBlok[] => Array.from({ length: n }, () => 'ileri' as const);

interface Deneme {
  /** Çocuğun olası kodu */
  ad: string;
  program: KisaBlok[];
  yildiz: 0 | 1 | 2 | 3;
  /** Dünya adı → çocuğun okuduğu cümle */
  iletiler?: Record<string, string>;
  /** ★★ alıp ★★★ alamayan kodun notu */
  not?: string;
}

/**
 * Her proje için çocuğun yazabileceği kodlar. 3–4. sınıfta ilk dünyaya göre sayılmış (ezber) kod ★ alır,
 * ★★ alamaz; 1–2. sınıfta uzun (dolambaçlı, tekrarsız) kod ★★ alır, ★★★ için notu okur.
 */
const DENEMELER: Record<string, Deneme[]> = {
  // --- 1. sınıf ---------------------------------------------------------------------
  'a1-tur': [
    { ad: 'kestirme: saksıları atlayıp çiçeğe', program: ['sagaDon', 'ileri'], yildiz: 0, iletiler: { 'Halka bahçe': '1., 2. ve 3. saksı susuz kaldı.' } },
    {
      ad: 'bahçeyi öbür yandan dolaşmak',
      program: ['sagaDon', 'ileri', 'ileri', 'solaDon', 'ileri', 'sula', 'ileri', 'solaDon', 'ileri', 'sula', 'ileri', 'solaDon', 'ileri', 'sula', 'ileri', 'solaDon', 'ileri'],
      yildiz: 2,
      not: 'Programında 17 blok var. Aynı işi 13 blokla yapmak mümkün.',
    },
  ],
  'a1-yol': [
    { ad: 'robotun baktığı uzun yol', program: [...ileri(4), 'solaDon', ...ileri(4), 'solaDon', ...ileri(2)], yildiz: 2, not: 'Programında 12 blok var. Aynı işi 8 blokla yapmak mümkün.' },
    { ad: 'kendi sağına göre dönmek', program: ['sagaDon', 'ileri'], yildiz: 0, iletiler: { 'İki yol': 'Robot bahçenin çitine çarptı.' } },
  ],
  'a1-merdiven': [
    { ad: 'basamakta geri dönmeyi unutmak', program: ['ileri', 'sula', 'sagaDon', 'ileri', 'ileri'], yildiz: 0, iletiler: { 'Saksı merdiveni': 'Robot çalıya çarptı.' } },
    {
      ad: 'sola dönmek yerine üç kez sağa',
      program: ['ileri', 'sula', 'sagaDon', 'ileri', 'sagaDon', 'sagaDon', 'sagaDon', 'ileri', 'sula', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'sula', 'sagaDon', 'ileri'],
      yildiz: 2,
      not: 'Programında 16 blok var. Aynı işi 14 blokla yapmak mümkün.',
    },
  ],
  // --- 2. sınıf ---------------------------------------------------------------------
  'a2-bahce': [
    { ad: 'saksı sayısını tur sayısına yazmak', program: [['kez', 5, ['ileri', 'ileri', 'sula']]], yildiz: 0, iletiler: { 'Köşe bahçe': 'Robot bahçenin çitine çarptı.' } },
    {
      ad: 'tekrarsız, kart kart',
      program: ['ileri', 'ileri', 'sula', 'ileri', 'ileri', 'sula', 'ileri', 'ileri', 'sula', 'sagaDon', 'ileri', 'ileri', 'sula', 'ileri', 'ileri', 'sula'],
      yildiz: 2,
      not: 'Programında 16 blok var. Aynı işi 9 blokla yapmak mümkün.',
    },
  ],
  'a2-kale': [
    { ad: 'bütün kuleleri eşit sanmak', program: [['kez', 3, ['ileri', 'koy', 'koy']]], yildiz: 0, iletiler: { 'Kale duvarı': 'Bu kule 1 küp olmalı; fazladan küp kondu.' } },
    { ad: 'yüksek dişte bir küp eksik', program: [['kez', 3, ['ileri', 'koy', 'ileri', 'koy']]], yildiz: 0, iletiler: { 'Kale duvarı': 'Yapıda 3 küp eksik (3 kulede).' } },
    {
      ad: 'tekrarsız, kart kart',
      program: ['ileri', 'koy', 'ileri', 'koy', 'koy', 'ileri', 'koy', 'ileri', 'koy', 'koy', 'ileri', 'koy', 'ileri', 'koy', 'koy'],
      yildiz: 2,
      not: 'Programında 15 blok var. Aynı işi 6 blokla yapmak mümkün.',
    },
  ],
  'a2-yol': [
    {
      ad: 'yukarıdan dolaşan uzun yol',
      program: ['solaDon', 'ileri', 'sagaDon', ['kez', 6, ['ileri']], 'sagaDon', ['kez', 4, ['ileri']], 'sagaDon', ['kez', 3, ['ileri']]],
      yildiz: 0,
      iletiler: { 'Kısa yol yarışı': 'Robot çiçeğe 14 adımda vardı. Daha kısa bir yol var: 6 adım.' },
    },
    {
      ad: 'merdiven tekrarsız',
      program: ['ileri', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'sagaDon', 'ileri'],
      yildiz: 2,
      not: 'Programında 11 blok var. Aynı işi 5 blokla yapmak mümkün.',
    },
  ],
  // --- 3. sınıf ---------------------------------------------------------------------
  'a3-sera': [
    {
      ad: 'ilk seranın bitkilerini sayıp "6 kez" yazmak',
      program: [['kez', 6, ['ileri', ['eger', 'toprakKuru', ['sula']], ['eger', 'yaprakSari', ['gubreVer']], ['eger', 'domatesKirmizi', ['topla']]]], 'ileri'],
      yildiz: 1,
      iletiler: {
        'Uzun sera': 'Robot çıkışa varamadı; 8., 9. ve 10. bitkiye hiç uğramadı. 7. bitkideki olgun domates dalda kaldı.',
        'Küçük sera': 'Robot çıkışa vardıktan sonra da ilerledi ve duvara çarptı.',
      },
    },
    {
      ad: 'bakmadan, ilk seraya göre ezber',
      program: ['ileri', 'sula', 'ileri', 'topla', 'ileri', 'gubreVer', 'ileri', 'ileri', 'sula', 'ileri', 'topla', 'ileri'],
      yildiz: 1,
      iletiler: { 'Uzun sera': '1. bitkinin toprağı zaten nemliydi; su taştı.' },
    },
    {
      ad: 'yaprağa bakmayı unutmak',
      program: [['kadar', 'cikistayim', ['ileri', ['eger', 'toprakKuru', ['sula']], ['eger', 'domatesKirmizi', ['topla']]]]],
      yildiz: 0,
      iletiler: { 'Sabah serası': 'Sararmış yapraklı 3. bitki gübresiz kaldı.', 'Uzun sera': 'Sararmış yapraklı 4. ve 9. bitki gübresiz kaldı.' },
    },
    {
      ad: 'önce ilerle, döngüde en sonda ilerle (o da genel)',
      program: ['ileri', ['kadar', 'cikistayim', [['eger', 'toprakKuru', ['sula']], ['eger', 'yaprakSari', ['gubreVer']], ['eger', 'domatesKirmizi', ['topla']], 'ileri']]],
      yildiz: 3,
    },
  ],
  'a3-teras': [
    {
      ad: 'ilk bahçenin basamaklarını sayıp "3 kez" yazmak',
      program: [['kez', 3, ['ileri', ['eger', 'toprakKuru', ['sula']], 'sagaDon', 'ileri', ['eger', 'toprakKuru', ['sula']], 'solaDon']]],
      yildiz: 1,
      iletiler: { 'Beş basamak': 'Robot çiçeğe varamadı: çiçek 4 kare uzakta. 6. ve 7. saksı susuz kaldı.', 'İki basamak': 'Robot bahçenin çitine çarptı.' },
    },
    {
      ad: 'basamağın yalnız ilk karesine bakmak',
      program: [['kadar', 'cikistayim', ['ileri', ['eger', 'toprakKuru', ['sula']], 'sagaDon', 'ileri', 'solaDon']]],
      yildiz: 0,
      iletiler: { 'Üç basamak': '3. saksı susuz kaldı.' },
    },
  ],
  'a3-ayna': [
    {
      ad: 'yalnız ilk sahada eksik olan sağ yarıyı çizmek',
      program: [['kez', 2, ['ileri', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'sagaDon', 'ileri']]],
      yildiz: 1,
      iletiler: { 'Sağ yarı çizili': 'Şeklin 8 çizgisi eksik kaldı.', 'Üst yarı çizili': 'Şeklin 4 çizgisi eksik kaldı.' },
    },
  ],
  // --- 4. sınıf ---------------------------------------------------------------------
  'a4-cevre': [
    {
      ad: 'ilk bahçenin düzenini ezberleyip bakmamak',
      program: [['kez', 4, ['ileri', 'sula', 'ileri', 'topla', 'ileri', 'sagaDon']]],
      yildiz: 1,
      iletiler: { 'Karışık bahçe': '1. bitkinin toprağı zaten nemliydi; su taştı.', 'Öbür köşe': 'Robot boş yerde toplamaya çalıştı; orada domates yok.' },
    },
    {
      ad: 'kenarı iç döngüsüz yazmak',
      program: [
        [
          'kez',
          4,
          [
            'ileri', ['eger', 'toprakKuru', ['sula']], ['eger', 'domatesKirmizi', ['topla']],
            'ileri', ['eger', 'toprakKuru', ['sula']], ['eger', 'domatesKirmizi', ['topla']],
            'ileri', ['eger', 'toprakKuru', ['sula']], ['eger', 'domatesKirmizi', ['topla']],
            'sagaDon',
          ],
        ],
      ],
      yildiz: 2,
      not: 'Programında 17 blok var. Aynı işi 8 blokla yapmak mümkün.',
    },
  ],
  'a4-kule': [
    {
      ad: 'ilk sokağın kulelerini sayıp "4 kez" yazmak',
      program: [['kez', 4, ['ileri', ['kez', 3, ['koy']]]], 'ileri'],
      yildiz: 1,
      iletiler: { 'İki kule': 'Dron küpü yanlış yere koydu; burada küp olmayacaktı.', 'Altı kule': 'Dron çıkışa varamadı: çıkış 2 kare uzakta. Yapıda 6 küp eksik (2 kulede).' },
    },
    {
      ad: 'direk hatası: önce ilerle, sonra kur',
      program: [['kadar', 'cikistayim', ['ileri', ['kez', 3, ['koy']]]]],
      yildiz: 0,
      iletiler: { 'Dört kule': 'Dron küpü yanlış yere koydu; burada küp olmayacaktı.' },
    },
    { ad: 'kuleyi iç döngüsüz kurmak', program: ['ileri', ['kadar', 'cikistayim', ['koy', 'koy', 'koy', 'ileri']]], yildiz: 2, not: 'Programında 6 blok var. Aynı işi 5 blokla yapmak mümkün.' },
  ],
  'a4-pencere': [
    {
      ad: 'yalnız ilk pencerede eksik olan artıyı çizmek',
      program: [['kez', 4, ['ileri', 'ileri', 'sagaDon', 'sagaDon', 'ileri', 'ileri', 'sagaDon']]],
      yildiz: 1,
      iletiler: { 'Sol camlar hazır': 'Şeklin 8 çizgisi eksik kaldı.', 'Bir cam hazır': 'Şeklin 12 çizgisi eksik kaldı.' },
    },
  ],
};

describe('Atölye 1–4: ortak kurallar', () => {
  it('ortak denetim: çözüm her dünyada ★★★, boş kod yıldızsız, kurallar sınıfa uygun', () => atolyeleriDenetle(ATOLYELER_1_4));

  it('her sınıfa üç proje; kimlik öneki, görünüm, dünya sayısı', () => {
    expect(ATOLYELER_1_4.map((a) => a.id)).toEqual([
      'a1-tur', 'a1-yol', 'a1-merdiven',
      'a2-bahce', 'a2-kale', 'a2-yol',
      'a3-sera', 'a3-teras', 'a3-ayna',
      'a4-cevre', 'a4-kule', 'a4-pencere',
    ]);
    for (const a of ATOLYELER_1_4) {
      expect(a.id.startsWith(`a${a.sinif}-`), a.id).toBe(true);
      expect(a.ad.split(' ').length, a.id).toBeLessThanOrEqual(4);
      expect(a.kazanimlar.length, a.id).toBeGreaterThanOrEqual(1);
      expect(a.kazanimlar.length, a.id).toBeLessThanOrEqual(3);
      expect(a.ipucu.length, a.id).toBeGreaterThan(10);
      if (a.sinif <= 2) {
        // Tekrar sayısı sabit: tek dünya; kart görünümünde en çok 6 kart; ızgara 7 × 5
        expect(a.dunyalar.length, a.id).toBe(1);
        expect(a.gorunum, a.id).toBe('kart');
        expect(a.aracKutusu.length, a.id).toBeLessThanOrEqual(6);
      } else {
        expect(a.dunyalar.length, a.id).toBeGreaterThanOrEqual(3);
        expect(a.gorunum, a.id).toBe('blok');
      }
      for (const d of a.dunyalar) {
        const g = izgara(d);
        if (g.tur === 'sera') continue;
        expect(g.en, `${a.id}/${d.id} en`).toBeLessThanOrEqual(a.sinif <= 2 ? 7 : 9);
        expect(g.boy, `${a.id}/${d.id} boy`).toBeLessThanOrEqual(a.sinif <= 2 ? 5 : 6);
        if (a.sinif >= 3 && d.harita && !d.insaat) expect(d.adimIzi, `${a.id}/${d.id} adım izi`).toBe(false);
      }
      // ★★★ sınırı en iyi çözüme yakın: çözüm sınırda ya da bir altında
      expect(a.enCokBlok - blokSayisi(a.cozum), a.id).toBeLessThanOrEqual(1);
    }
    for (const s of [1, 2, 3, 4]) expect(ATOLYELER_1_4.filter((a) => a.sinif === s).length, `${s}. sınıf`).toBe(3);
  });

  it('metinlerde emoji yok', () => {
    expect(/\p{Extended_Pictographic}/u.test(JSON.stringify(ATOLYELER_1_4))).toBe(false);
  });

  it('her projenin çocuk kodu denemesi var; 3–4. sınıfta ezber kod da var', () => {
    expect(Object.keys(DENEMELER).sort()).toEqual(ATOLYELER_1_4.map((a) => a.id).sort());
    for (const a of ATOLYELER_1_4) {
      if (a.sinif >= 3) expect(DENEMELER[a.id].some((d) => d.yildiz === 1), `${a.id}: ilk dünyaya göre sayılmış kod`).toBe(true);
      else expect(DENEMELER[a.id].some((d) => d.yildiz === 2), `${a.id}: uzun kod ★★`).toBe(true);
    }
  });
});

describe('Atölye 1–4: çocuğun kodları ve okuduğu cümleler', () => {
  for (const a of ATOLYELER_1_4) {
    for (const d of DENEMELER[a.id] ?? []) {
      it(`${a.id}: ${d.ad}`, () => {
        const p = programKur(d.program, `${a.id}-deneme-`);
        const s = sinat(a, p);
        expect(s.yildiz, s.dunyalar.map((x) => `${x.dunya.ad}: ${x.ileti}`).join(' | ')).toBe(d.yildiz);
        if (d.yildiz === 1) {
          // Ezber kod: görünen dünyada çalışır, en az bir sınama dünyasında bozulur (★★ yok)
          expect(s.dunyalar[0].basarili, `${a.id}: ilk dünya`).toBe(true);
          expect(s.dunyalar.slice(1).some((x) => !x.basarili), `${a.id}: sınama dünyaları`).toBe(true);
          expect(s.yildiz).toBeLessThan(2);
        }
        for (const [dunya, cumle] of Object.entries(d.iletiler ?? {})) {
          const x = s.dunyalar.find((y) => y.dunya.ad === dunya);
          expect(x, `${a.id}: ${dunya} dünyası`).toBeTruthy();
          expect(x!.ileti, `${a.id}/${dunya}`).toBe(cumle);
        }
        if (d.not) expect(s.verimlilikNotu).toBe(d.not);
      });
    }
  }

  it('çözümler her dünyada "Program bu dünyada doğru çalıştı." der', () => {
    for (const a of ATOLYELER_1_4) {
      const s = sinat(a, a.cozum);
      expect(s.yildiz, a.id).toBe(3);
      for (const d of s.dunyalar) expect(d.ileti, `${a.id}/${d.dunya.ad}`).toBe('Program bu dünyada doğru çalıştı.');
    }
  });
});
