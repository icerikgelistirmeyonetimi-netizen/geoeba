import { describe, expect, it } from 'vitest';
import { blokBul, blokSayisi, cikar, ekle, guncelle, kullanilanlar, konumBul, programGecerli, programKur, sozdeKod, tasi, yapiAnahtari } from '../program';
import { baslangicDurumu, domatesSirasi, eylemUygula, saksiSirasi, surprizDunya, type DunyaTanimi } from '../dunya';
import { calistir, izOzeti } from '../yorumlayici';
import { sina, siraListesi, sonucIletisi } from '../degerlendirme';
import { BOZUK_SULAMA, GOREVLER, GUBRE_COZUMU, HASAT_COZUMU, HASAT_ILK, HASAT_UZUN, SERA_ILK, SONSUZ_SULAMA, SULAMA_PROGRAMI, YURUYEN_ROBOT, gorevSirasi } from '../unite';

const gorev = (id: string) => GOREVLER[gorevSirasi(id)];
const SULAMA_HEDEFI = gorev('sulama-yaz').hedef;
const HASAT_HEDEFI = gorev('hasat-yaz').hedef;

describe('program', () => {
  it('kısa yazımdan kararlı kimliklerle kurar', () => {
    expect(SULAMA_PROGRAMI.map((b) => b.id)).toEqual(['s1']);
    expect(blokBul(SULAMA_PROGRAMI, 's3')?.tur).toBe('eger');
    expect(blokSayisi(SULAMA_PROGRAMI)).toBe(4);
    expect(yapiAnahtari(SULAMA_PROGRAMI)).toBe('kadar(cikistayim)[ileri,eger(toprakKuru)[sula]]');
  });

  it('taşır, çıkarır, ekler ve günceller (değişmez)', () => {
    const onarilmis = tasi(BOZUK_SULAMA, 'h4', { ebeveyn: 'h3', indeks: 0 });
    expect(yapiAnahtari(onarilmis)).toBe(yapiAnahtari(SULAMA_PROGRAMI));
    expect(yapiAnahtari(BOZUK_SULAMA)).toBe('kadar(cikistayim)[ileri,eger(toprakKuru)[],sula]');
    expect(tasi(SULAMA_PROGRAMI, 's1', { ebeveyn: 's3', indeks: 0 })).toBe(SULAMA_PROGRAMI);
    const p = tasi(SULAMA_PROGRAMI, 's2', { ebeveyn: 's1', indeks: 2 });
    expect(yapiAnahtari(p)).toBe('kadar(cikistayim)[eger(toprakKuru)[sula],ileri]');
    const [c, b] = cikar(SULAMA_PROGRAMI, 's4');
    expect(b?.id).toBe('s4');
    expect(blokSayisi(c)).toBe(3);
    const e = ekle(c, { ebeveyn: null, indeks: 0 }, { id: 'y', tur: 'eylem', eylem: 'sagaDon' });
    expect(konumBul(e, 'y')).toEqual({ ebeveyn: null, indeks: 0 });
    const k = guncelle(programKur([['kez', 3, ['ileri']]]), 'p1', { kez: 99 });
    expect(k[0].tur === 'tekrarlaKez' && k[0].kez).toBe(20);
    expect(kullanilanlar(GUBRE_COZUMU).eylemler.has('gubreVer')).toBe(true);
  });

  it('kayıt doğrulaması bozuk veriyi reddeder', () => {
    expect(programGecerli(SULAMA_PROGRAMI)).toBe(true);
    expect(programGecerli([{ id: 'x', tur: 'eylem', eylem: 'uc' }])).toBe(false);
    expect(programGecerli('bozuk')).toBe(false);
  });

  it('sözde kod üretir', () => {
    expect(sozdeKod(HASAT_COZUMU)).toBe(
      ['BAŞLA', '    ÇIKIŞA VARANA KADAR TEKRARLA', '        İLERİ GİT', '        EĞER domates kırmızı İSE', '            TOPLA', '        EĞER SONU', '    TEKRAR SONU', 'BİTİR'].join('\n')
    );
  });
});

describe('dünya', () => {
  it('kısa yazımı çözer', () => {
    expect(saksiSirasi('K Ns').map((b) => [b.toprak, b.yaprak])).toEqual([
      ['kuru', 'saglam'],
      ['nemli', 'sari'],
    ]);
    expect(domatesSirasi('K Y').map((b) => b.domates)).toEqual(['kirmizi', 'yesil']);
  });

  it('yana dönüp ilerlemek duvara çarptırır', () => {
    const d = baslangicDurumu({ id: 't', ad: 't', bitkiler: saksiSirasi('K') });
    const don = eylemUygula(d, 'sagaDon').durum;
    expect(eylemUygula(don, 'ileri').hata?.tur).toBe('duvar');
  });

  it('sürpriz dünya tohuma göre kararlıdır ve iki türü de içerir', () => {
    const a = { tur: 'domates' as const, enAz: 3, enCok: 12, oran: 0.55 };
    expect(surprizDunya(a, 42)).toEqual(surprizDunya(a, 42));
    for (let t = 1; t < 200; t++) {
      const d = surprizDunya(a, t);
      const k = d.bitkiler.filter((b) => b.domates === 'kirmizi').length;
      expect(d.bitkiler.length).toBeGreaterThanOrEqual(3);
      expect(k).toBeGreaterThan(0);
      expect(k).toBeLessThan(d.bitkiler.length);
    }
  });
});

describe('yorumlayıcı', () => {
  const iz = calistir(SULAMA_PROGRAMI, SERA_ILK, SULAMA_HEDEFI);
  const o = izOzeti(iz);

  it('ilk serada robot 3 saksıyı sular, depoda 14 litre kalır', () => {
    expect(iz.sonuc.basarili).toBe(true);
    expect(o.sulama).toBe(3);
    expect(o.kalanSu).toBe(14);
    expect(gorev('sulama-yaz').basari(iz)).toBe('Oldu! Robot 3 saksıyı suladı. Her sulama 2 litre: depoda 14 litre su kaldı.');
  });

  it('blok sayımları: 7 tur, ileri 7, eğer 7 (3 evet 4 hayır), sula 3', () => {
    expect(iz.sayimlar.s1.calisma).toBe(7);
    expect(iz.sayimlar.s2.calisma).toBe(7);
    expect(iz.sayimlar.s3).toEqual({ calisma: 7, evet: 3, hayir: 4 });
    expect(iz.sayimlar.s4.calisma).toBe(3);
  });

  it('izin son adımı döngüden çıkış; her adım o anki yığını taşır', () => {
    expect(iz.adimlar[iz.adimlar.length - 1].tur).toBe('donguBitti');
    const sulaAdimi = iz.adimlar.find((a) => a.eylem === 'sula');
    expect(sulaAdimi?.yigin).toEqual(['s1', 's3', 's4']);
    expect(sulaAdimi?.turlar.s1).toBe(1);
  });

  it('eğer dışındaki "sula" 2. saksıda taşar; "ileri" de eğer içindeyse sonsuz döngü yakalanır', () => {
    const t = calistir(BOZUK_SULAMA, SERA_ILK, SULAMA_HEDEFI);
    expect(t.sonuc.hata?.tur).toBe('tasma');
    expect(sonucIletisi(t.sonuc, SERA_ILK, 'saksı')).toBe('2. saksının toprağı zaten nemliydi; su taştı.');
    const z = calistir(SONSUZ_SULAMA, gorev('hata-sonsuz').dunya, SULAMA_HEDEFI);
    expect(z.sonuc.hata?.tur).toBe('sonsuz');
    expect(sonucIletisi(z.sonuc, gorev('hata-sonsuz').dunya, 'saksı')).toMatch(/20 turdur yerinden kıpırdamadı/);
  });
});

describe('sınama ve iletiler (hasat)', () => {
  const KISA: DunyaTanimi = { id: 'kisa', ad: 'Kısa sıra', bitkiler: domatesSirasi('Y Y K') };
  const ayar = { gorunen: HASAT_ILK, sinama: [KISA, HASAT_UZUN], hedef: HASAT_HEDEFI, enFazlaBlok: 4, bitkiAdi: 'bitki' as const };

  it('çözüm bütün dünyalarda çalışır, ★★★', () => {
    const s = sina(HASAT_COZUMU, { ...ayar, surpriz: { tur: 'domates', enAz: 3, enCok: 12, oran: 0.55 } }, 5);
    expect(s.dunyalar.every((d) => d.basarili)).toBe(true);
    expect(s.yildiz).toBe(3);
  });

  it('ezber program yalnız ilk sırada çalışır', () => {
    const ezber = programKur(['ileri', 'topla', 'ileri', 'ileri', 'topla', 'ileri', 'topla', 'ileri', 'ileri', 'topla', 'ileri', 'ileri', 'topla', 'ileri']);
    const s = sina(ezber, ayar, 7);
    expect(s.dunyalar[0].basarili).toBe(true);
    expect(s.yildiz).toBe(1);
    expect(s.dunyalar[1].ileti).toBe('1. bitkideki domates yeşildi; ham domates koparıldı.');
  });

  it('"9 kez tekrarla": kısa sırada duvara çarpar, uzun sırada çıkışa varamaz', () => {
    const dokuz = programKur([['kez', 9, ['ileri', ['eger', 'domatesKirmizi', ['topla']]]]]);
    const s = sina(dokuz, ayar, 3);
    expect(s.dunyalar[1].ileti).toBe('Robot çıkışa vardıktan sonra da ilerledi ve duvara çarptı.');
    expect(s.dunyalar[2].ileti).toBe('Robot çıkışa varamadı; 10., 11. ve 12. bitkiye hiç uğramadı.');
  });

  it('dalda kalan domatesler ve fazla blok', () => {
    const iz = calistir(programKur([['kadar', 'cikistayim', ['ileri']]]), HASAT_ILK, HASAT_HEDEFI);
    expect(sonucIletisi(iz.sonuc, HASAT_ILK, 'bitki')).toBe('5 olgun domates dalda kaldı (1., 3., 4., 6. ve 8. bitki).');
    const fazla = programKur([['kadar', 'cikistayim', ['ileri', ['eger', 'domatesKirmizi', ['topla']], 'sagaDon', 'sagaDon', 'sagaDon', 'sagaDon']]]);
    expect(sina(fazla, ayar, 1).verimlilikNotu).toBe('Programında 8 blok var. Aynı işi 4 blokla yapmak mümkün.');
  });

  it('sıra listesi', () => {
    expect(siraListesi([2])).toBe('2.');
    expect(siraListesi([2, 5])).toBe('2. ve 5.');
    expect(siraListesi([2, 5, 9])).toBe('2., 5. ve 9.');
  });
});

describe('görevler', () => {
  it('her görevin çözümü kendi dünyasında çalışır ve araç kutusuyla kurulabilir', () => {
    for (const g of GOREVLER) {
      const iz = calistir(g.cozum, g.dunya, g.hedef);
      expect(iz.sonuc.basarili, g.id).toBe(true);
      expect(g.basari(iz).length, g.id).toBeGreaterThan(5);
      const k = kullanilanlar(g.cozum);
      for (const e of k.eylemler) expect(g.aracKutusu.some((a) => a.tur === 'eylem' && a.eylem === e), `${g.id}:${e}`).toBe(true);
      for (const c of k.kosullar) expect(g.aracKutusu.some((a) => (a.tur === 'eger' || a.tur === 'tekrarlaKadar') && a.kosul === c), `${g.id}:${c}`).toBe(true);
    }
  });

  it('1. görevin hazır kodu yürür ama sulamaz; yalnız 5. görev zorludur', () => {
    const iz = calistir(YURUYEN_ROBOT, SERA_ILK, SULAMA_HEDEFI);
    expect(iz.sonuc.hata).toBeNull();
    expect(sonucIletisi(iz.sonuc, SERA_ILK, 'saksı')).toBe('1., 3. ve 4. saksı susuz kaldı.');
    expect(GOREVLER.filter((g) => g.zorlu).map((g) => g.id)).toEqual(['hata-sonsuz']);
  });

  it('hatalı başlangıç kodları gerçekten hatalıdır', () => {
    for (const g of GOREVLER.filter((x) => x.tur === 'hata')) {
      expect(Array.isArray(g.baslangic), g.id).toBe(true);
      const iz = calistir(g.baslangic as never, g.dunya, g.hedef);
      expect(iz.sonuc.basarili, g.id).toBe(false);
    }
  });

  it('yeni kurgular anlamlı: genel çözüm çalışır, ezber ("6 kez") çözüm bozulur, eski kod yeni kurala yetmez', () => {
    const alti = programKur([['kez', 7, ['ileri', ['eger', 'toprakKuru', ['sula']]]]]);
    expect(calistir(alti, SERA_ILK, SULAMA_HEDEFI).sonuc.basarili).toBe(true);
    expect(calistir(alti, gorev('sulama-buyuk').dunya, SULAMA_HEDEFI).sonuc.basarili).toBe(false);
    expect(calistir(SULAMA_PROGRAMI, gorev('sulama-buyuk').dunya, SULAMA_HEDEFI).sonuc.basarili).toBe(true);
    expect(calistir(SULAMA_PROGRAMI, gorev('sulama-gubre').dunya, gorev('sulama-gubre').hedef).sonuc.basarili).toBe(false);
    expect(calistir(HASAT_COZUMU, gorev('hasat-uzun').dunya, HASAT_HEDEFI).sonuc.basarili).toBe(true);
    const sekiz = programKur([['kez', 9, ['ileri', ['eger', 'domatesKirmizi', ['topla']]]]]);
    expect(calistir(sekiz, HASAT_ILK, HASAT_HEDEFI).sonuc.basarili).toBe(true);
    expect(calistir(sekiz, gorev('hasat-uzun').dunya, HASAT_HEDEFI).sonuc.basarili).toBe(false);
  });

  it('büyük serada 5 saksı × 2 litre; uzun sırada 10 domates = 1000 gram', () => {
    const b = calistir(SULAMA_PROGRAMI, gorev('sulama-buyuk').dunya, SULAMA_HEDEFI);
    expect(gorev('sulama-buyuk').basari(b)).toBe('Oldu! Kodun saksı sayısını bilmeden de çalışıyor. 5 saksı × 2 litre = 10 litre su harcandı.');
    const u = calistir(HASAT_COZUMU, gorev('hasat-uzun').dunya, HASAT_HEDEFI);
    expect(gorev('hasat-uzun').soru?.cevap(u)).toBe(1000);
  });
});

