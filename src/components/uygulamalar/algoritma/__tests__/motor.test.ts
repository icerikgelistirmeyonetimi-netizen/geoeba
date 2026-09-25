import { describe, expect, it } from 'vitest';
import { bahce, domatesSirasi, enKisaYolUzunlugu, insaatAlani, izgara, saha, type Hedef } from '../dunya';
import { calistir, izOzeti } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import { adimAnlatimi } from '../anlatici';
import { blokSayisi, cikar, ekle, guncelle, ifadeKur, ifadeMetni, konumBul, programGecerli, programKur, sozdeKod, sozdeSatirlar, tasi, yapiAnahtari, DEGILSE, type EgerBlogu } from '../program';

const ileti = (p: ReturnType<typeof programKur>, d: Parameters<typeof calistir>[1], h: Hedef) => sonucIletisi(calistir(p, d, h).sonuc, d, 'bitki');

describe('program modeli: değişken, değilse, komut', () => {
  it('kısa yazım: ifade, karşılaştırma, değilse, n kez, tanım', () => {
    const p = programKur([
      ['ata', 'sayaç', 0],
      ['kez', 'n', ['ileri', ['eger', [['sayaç', 'mod', 3], '=', 0], ['sula'], ['ileri']]]],
      ['tanim', 'KARE', ['ileri']],
      ['cagir', 'KARE'],
    ]);
    expect(yapiAnahtari(p)).toBe('sayaç=0,kez(n)[ileri,eger([(sayaçmod3)=0])[sula]degilse[ileri]],tanim(KARE)[ileri],cagir(KARE)');
    expect(blokSayisi(p)).toBe(9);
    expect(programGecerli(JSON.parse(JSON.stringify(p)))).toBe(true);
    expect(programGecerli([{ id: 'x', tur: 'ata', degisken: 'a', ifade: { tur: 'islem', op: '^', sol: { tur: 'sayi', deger: 1 }, sag: { tur: 'sayi', deger: 2 } } }])).toBe(false);
  });

  it('kısa yazımda bilinmeyen eylem yazım hatası sayılır', () => {
    expect(() => programKur(['ileri', 'KARE' as never])).toThrow('Bilinmeyen eylem: KARE');
  });

  it('ifade yazımı: öncelik ve parantez, Türkçe eksi', () => {
    expect(ifadeMetni(ifadeKur([['a', '+', 'b'], '×', 2]))).toBe('(a + b) × 2');
    expect(ifadeMetni(ifadeKur([['i', '×', 2], '-', 1]))).toBe('i × 2 − 1');
    expect(ifadeMetni(ifadeKur(['a', '-', ['b', '-', 1]]))).toBe('a − (b − 1)');
    expect(ifadeMetni(ifadeKur(['toplam', '+', '@kutle']))).toBe('toplam + kütle');
  });

  it('değilse kolunda ekle, taşı, çıkar, güncelle', () => {
    let p = programKur([['eger', 'domatesKirmizi', ['topla'], []], 'ileri'], 'q');
    const e = p[0] as EgerBlogu;
    p = ekle(p, { ebeveyn: e.id + DEGILSE, indeks: 0 }, { id: 'y1', tur: 'eylem', eylem: 'sula' });
    expect((p[0] as EgerBlogu).degilse?.map((b) => b.id)).toEqual(['y1']);
    expect(konumBul(p, 'y1')).toEqual({ ebeveyn: 'q1' + DEGILSE, indeks: 0 });
    p = tasi(p, 'q3', { ebeveyn: 'q1' + DEGILSE, indeks: 1 });
    expect(yapiAnahtari(p)).toBe('eger(domatesKirmizi)[topla]degilse[sula,ileri]');
    p = guncelle(p, 'q1', { kosul: 'toprakKuru' });
    expect((p[0] as EgerBlogu).kosul).toBe('toprakKuru');
    p = cikar(p, 'y1')[0];
    expect(yapiAnahtari(p)).toBe('eger(toprakKuru)[topla]degilse[ileri]');
  });

  it('sözde kod: atama, değilse, komut tanımı BAŞLA öncesinde', () => {
    const p = programKur([['tanim', 'KARE', [['kez', 4, ['ileri', 'sagaDon']]]], ['ata', 'toplam', 0], ['eger', ['toplam', '<', 5], [['cagir', 'KARE']], ['sula']]]);
    expect(sozdeKod(p)).toBe(
      ['TANIMLA KARE', '    4 KEZ TEKRARLA', '        İLERİ GİT', '        SAĞA DÖN', '    TEKRAR SONU', 'TANIM SONU', 'BAŞLA', '    toplam ← 0', '    EĞER toplam < 5 İSE', '        KARE', '    DEĞİLSE', '        SULA', '    EĞER SONU', 'BİTİR'].join('\n')
    );
    expect(sozdeSatirlar(p).find((s) => s.metin === 'KARE' && s.girinti === 2)?.blokId).toBe('p7');
  });
});

describe('yorumlayıcı: değişkenler ve karşılaştırma', () => {
  const sira = { id: 's', ad: 'Sıra', bitkiler: domatesSirasi('K120 Y90 K150 K80') };
  const topla: Hedef = { kirmizilariTopla: true, cikistaBitir: true };

  it('sayaç ve toplayıcı: kırmızıları say, kütleleri topla', () => {
    const p = programKur([
      ['ata', 'sayaç', 0],
      ['ata', 'toplam', 0],
      'ileri',
      ['kadar', 'cikistayim', [['eger', 'domatesKirmizi', ['topla', ['ata', 'sayaç', ['sayaç', '+', 1]], ['ata', 'toplam', ['toplam', '+', '@kutle']]]], 'ileri']],
    ]);
    const iz = calistir(p, sira, { ...topla, degiskenler: { sayaç: 3, toplam: 350 } });
    expect(iz.sonuc.basarili).toBe(true);
    expect(iz.son.degiskenler).toEqual({ sayaç: 3, toplam: 350 });
    expect(iz.adimlar.filter((a) => a.tur === 'atama')).toHaveLength(8);
  });

  it('kütle toplanan domatesin kütlesidir (topladıktan sonra da okunur); domates yoksa 0', () => {
    const p = programKur([['ata', 't', 0], 'ileri', 'topla', ['ata', 't', ['t', '+', '@kutle']]]);
    expect(calistir(p, sira, { cikistaBitir: false }).son.degiskenler.t).toBe(120);
    expect(calistir(programKur([['ata', 't', '@kutle']]), sira, { cikistaBitir: false }).son.degiskenler.t).toBe(0);
  });

  it('değişken beklenen değer iletisi; değersiz değişken hatası', () => {
    const p = programKur([['ata', 'sayaç', 0], ['kez', 3, [['ata', 'sayaç', ['sayaç', '+', 2]]]]]);
    expect(ileti(p, sira, { cikistaBitir: false, degiskenler: { sayaç: 5 } })).toBe('sayaç 5 olmalıydı; program bitince 6 oldu.');
    expect(ileti(programKur([['ata', 'a', ['b', '+', 1]]]), sira, {})).toBe('b değişkeninin henüz bir değeri yok. Önce ona bir değer ver.');
    expect(ileti(programKur([['ata', 'a', [1, '÷', 0]]]), sira, {})).toBe('Sıfıra bölme yapılamaz.');
  });

  it('n kez (dünya değişkeni), geçersiz tekrar sayısı', () => {
    const d = bahce('n', 'N', ['BKKK'], { degiskenler: { n: 3 } });
    const iz = calistir(programKur([['kez', 'n', ['ileri', 'sula']]]), d, { kurulariSula: true, cikistaBitir: false });
    expect(iz.sonuc.basarili).toBe(true);
    expect(iz.adimlar.find((a) => a.tur === 'tur')?.toplamTur).toBe(3);
    expect(ileti(programKur([['kez', ['n', '-', 4], ['ileri']]]), d, {})).toBe('Tekrar sayısı −1 olamaz; 0 ile 60 arasında bir tam sayı olmalı.');
  });

  it('karşılaştırmalı döngü: depo yettiği sürece sula', () => {
    const d = bahce('d', 'Depo', ['BKKKKKKKKKKKKKKKK'], { depo: 11, adimIzi: false });
    const p = programKur([['kadar', ['@depo', '<', 2], ['ileri', 'sula']]]);
    const iz = calistir(p, d, { cikistaBitir: false });
    expect(iz.sonuc.basarili).toBe(true);
    expect(izOzeti(iz).sulama).toBe(5);
    const son = iz.adimlar[iz.adimlar.length - 1];
    expect(son.tur).toBe('donguBitti');
    expect(son.degerler).toEqual([1, 2]);
  });

  it('mod ile her 3. saksı; değilse kolu', () => {
    const d = bahce('m', 'Mod', ['BKNKNKN'], { adimIzi: false });
    const p = programKur([['ata', 'i', 0], ['kez', 6, ['ileri', ['ata', 'i', ['i', '+', 1]], ['eger', [['i', 'mod', 2], '=', 1], ['sula'], []]]]]);
    const iz = calistir(p, d, { kurulariSula: true, cikistaBitir: false });
    expect(iz.sonuc.basarili).toBe(true);
    const k = iz.adimlar.filter((a) => a.tur === 'kosul');
    expect(k.map((a) => a.sonuc)).toEqual([true, false, true, false, true, false]);
    expect(adimAnlatimi(k[1], iz.baslangic, p, d, 'saksı')).toBe('i mod 2 = 1 mi? 0 ile 1: Hayır. Değilse kolu çalışır.');
  });

  it('komut tanımı yalnız çağrılınca çalışır; tanımsız komut ve kendini çağırma', () => {
    const d = bahce('k', 'Komut', ['B....'], { adimIzi: false });
    const p = programKur([['tanim', 'İKİ', ['ileri', 'ileri']], ['cagir', 'İKİ'], ['cagir', 'İKİ']]);
    const iz = calistir(p, d, { cikistaBitir: false });
    expect(iz.son.x).toBe(4);
    expect(iz.adimlar[0].tur).toBe('cagri');
    expect(iz.adimlar[1].yigin).toEqual(['p4', 'p2']);
    expect(ileti(programKur([['cagir', 'YOK']]), d, {})).toBe('YOK diye bir komut tanımlanmadı.');
    expect(ileti(programKur([['tanim', 'A', [['cagir', 'A']]], ['cagir', 'A']]), d, {})).toBe('A komutu kendini çok kez çağırdı.');
  });

  it('sonsuz döngü: yalnız değişken değişiyorsa sonsuz sayılmaz, sınırda durur', () => {
    const d = bahce('s', 'S', ['B.'], { adimIzi: false });
    const iz = calistir(programKur([['ata', 'a', 0], ['kadar', ['a', '=', 50], [['ata', 'a', ['a', '+', 1]]]]]), d, { cikistaBitir: false });
    expect(iz.sonuc.basarili).toBe(true);
    expect(iz.son.degiskenler.a).toBe(50);
    expect(calistir(programKur([['ata', 'a', 0], ['kadar', ['a', '=', -1], [['ata', 'a', 0]]]]), d, {}).sonuc.hata?.tur).toBe('sonsuz');
  });
});

describe('dünyalar: saha, boya, inşaat, koordinat, en kısa yol', () => {
  it('saha: nokta ağı çizgileri; hazır çizgiler; yanlış çizgi anında durur', () => {
    const d = saha('c', 'Kare', ['B-.', '| |', '.-.'], {});
    const g = izgara(d);
    expect([g.en, g.boy, g.tur]).toEqual([2, 2, 'cizim']);
    expect([...g.cizgiHedef].sort()).toEqual(['0-1', '0-2', '1-3', '2-3']);
    const kare = programKur([['kez', 4, ['ileri', 'sagaDon']]]);
    expect(calistir(kare, d, { cizimiTamamla: true, cikistaBitir: false }).sonuc.basarili).toBe(true);
    expect(ileti(programKur(['ileri', 'sagaDon', 'ileri']), d, { cizimiTamamla: true, cikistaBitir: false })).toBe('Şeklin 2 çizgisi eksik kaldı.');
    const yarim = saha('y', 'Yarım', ['B=.', '! |', '.-.'], { eksen: { yon: 'dikey', k: 1 } });
    expect(izgara(yarim).cizgiVerilen.size).toBe(2);
    const iz = calistir(programKur(['ileri', 'sagaDon', 'ileri', 'sagaDon', 'ileri']), yarim, { cizimiTamamla: true, cikistaBitir: false });
    expect(iz.sonuc.basarili).toBe(true);
    expect(iz.son.cizgiler).toEqual(['1-3', '2-3']);
    expect(ileti(programKur(['sagaDon', 'sagaDon', 'ileri']), saha('k', 'K', ['B-.'], {}), { cizimiTamamla: true })).toBe('Robot sahanın kenarına geldi; daha ileri gidemez.');
    const yanlis = calistir(programKur(['sagaDon', 'ileri', 'ileri']), saha('w', 'W', ['B-.', '   ', '. .'], {}), { cizimiTamamla: true, cikistaBitir: false });
    expect(yanlis.sonuc.hata).toMatchObject({ tur: 'yanlisCizgi', cizgi: '0-2', x: 0, y: 1 });
  });

  it('kalem kaldırınca çizmeden gider', () => {
    const d = saha('k', 'Kalem', ['B . .-.'], {});
    const p = programKur(['kalemKaldir', 'ileri', 'ileri', 'kalemIndir', 'ileri']);
    const iz = calistir(p, d, { cizimiTamamla: true, cikistaBitir: false });
    expect(iz.sonuc.basarili).toBe(true);
    expect(iz.son.cizgiler).toEqual(['2-3']);
  });

  it('boya / tarla: hedef kareler, hazır boyalı, yanlış boya', () => {
    const d = bahce('b', 'Boya', ['b*o.'], { boyaTuru: 'boya', adimIzi: false });
    const g = izgara(d);
    expect(g.boyaHedef).toEqual([true, false, true, false]);
    expect(g.boyaVerilen).toEqual([false, true, false, false]);
    expect(calistir(programKur(['boya', 'ileri', 'ileri', 'boya']), d, { boyamayiTamamla: true, cikistaBitir: false }).sonuc.basarili).toBe(true);
    expect(ileti(programKur(['boya']), d, { boyamayiTamamla: true, cikistaBitir: false })).toBe('1 kare boyanmadı.');
    expect(ileti(programKur(['ileri', 'ileri', 'ileri', 'boya']), d, { boyamayiTamamla: true })).toBe('Robot boyanmayacak bir kareyi boyadı.');
    const tarla = bahce('t', 'Tarla', ['boo'], { boyaTuru: 'ek', adimIzi: false });
    expect(ileti(programKur(['ek']), tarla, { boyamayiTamamla: true, cikistaBitir: false })).toBe('Tarlada 2 kare boş kaldı.');
  });

  it('inşaat: dron serbest uçar, küp yüksekliği, fazla küp', () => {
    const d = insaatAlani('i', 'Kule', ['B123']);
    const g = izgara(d);
    expect(g.tur).toBe('insaat');
    expect(g.yapiHedef).toEqual([0, 1, 2, 3]);
    const p = programKur([
      ['ata', 'h', 1],
      ['kez', 3, ['ileri', ['kez', 'h', ['koy']], ['ata', 'h', ['h', '+', 1]]]],
    ]);
    const iz = calistir(p, d, { yapiyiKur: true, cikistaBitir: false });
    expect(iz.sonuc.basarili).toBe(true);
    expect(izOzeti(iz).kup).toBe(6);
    expect(ileti(programKur(['ileri', 'koy', 'koy']), d, { yapiyiKur: true })).toBe('Bu kule 1 küp olmalı; fazladan küp kondu.');
    expect(ileti(programKur(['koy']), d, { yapiyiKur: true })).toBe('Dron küpü yanlış yere koydu; burada küp olmayacaktı.');
    expect(ileti(programKur(['ileri', 'koy', 'ileri', 'koy']), d, { yapiyiKur: true, cikistaBitir: false })).toBe('Yapıda 4 küp eksik (2 kulede).');
  });

  it('koordinat: y yukarı artar; ölçüm x, y; nokta iletileri', () => {
    const d = saha('k', 'Düzlem', ['. . .', '     ', '. . o', '     ', 'B . .'], { koordinat: true });
    const p = programKur(['ileri', 'ileri', 'solaDon', 'ileri', ['ata', 'a', '@x'], ['ata', 'b', '@y'], 'isaretle']);
    const iz = calistir(p, d, { noktalariKoy: true, cikistaBitir: false });
    expect(iz.sonuc.basarili).toBe(true);
    expect(iz.son.degiskenler).toEqual({ a: 2, b: 1 });
    expect(ileti(programKur(['ileri', 'isaretle']), d, { noktalariKoy: true })).toBe('Robot yanlış noktayı işaretledi: (1, 0).');
    expect(ileti(programKur([]), d, { noktalariKoy: true, cikistaBitir: false })).toBe('(2, 1) noktası işaretlenmedi.');
  });

  it('en kısa yol: BFS uzunluğu ve uzun yol iletisi', () => {
    const d = bahce('e', 'İki yol', ['B...', '.##.', '...H'], { hedefAdi: { yalin: 'çiçek', yonelme: 'çiçeğe', belirtme: 'çiçeği' } });
    expect(enKisaYolUzunlugu(izgara(d))).toBe(5);
    const uzun = programKur(['ileri', 'ileri', 'ileri', 'sagaDon', 'ileri', 'ileri']);
    expect(calistir(uzun, d, { cikistaBitir: true, enKisaYol: true }).sonuc.basarili).toBe(true);
    const dolam = bahce('f', 'Dolambaç', ['B...', '....', '...H'], {});
    expect(enKisaYolUzunlugu(izgara(dolam))).toBe(5);
    const zikzak = programKur(['sagaDon', 'ileri', 'ileri', 'solaDon', 'ileri', 'solaDon', 'ileri', 'ileri', 'sagaDon', 'ileri', 'sagaDon', 'ileri', 'ileri', 'solaDon', 'ileri']);
    expect(ileti(zikzak, dolam, { cikistaBitir: true, enKisaYol: true })).toBe('Robot çıkışa 9 adımda vardı. Daha kısa bir yol var: 5 adım.');
  });
});
