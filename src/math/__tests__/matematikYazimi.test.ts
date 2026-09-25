import { describe, expect, it } from 'vitest';
import {
  VARSAYILAN_YAZIM, aci, aciklama, alan, cemberBasligi, cemberCevresi, cevre, daireAlani, dilimAlani, dilimCevresi,
  duzMetin, egim, elipsAlani, elipsCevresi, kiris, koordinat, koseAcisi, merkezAci, metniCozumle, metniSeslendir,
  olcuDugumleri, olcuMetni, sayiMetni, sembol, sesli, trigOrani, uzunluk, yaricap, yayOlcusu, yayUzunlugu, yazimAyari,
  yazimImzasi, yuvarlandiMi, ad,
} from '../matematikYazimi';

const P = (label: string, extra: object = {}) => ({ label, showLabel: true, visible: true, ...extra });
const [A, B, C, D, O] = ['A', 'B', 'C', 'D', 'O'].map((l) => P(l));
const KISA = { ...VARSAYILAN_YAZIM, olcuYazimi: 'kisa' as const };
const ISARET = { ...VARSAYILAN_YAZIM, aciYazimi: 'isaret' as const };

describe('düz metin (MEB yazımı)', () => {
  it.each([
    ['uzunluk tam', olcuMetni(uzunluk(A, B, 5)), '|AB| = 5 br'],
    ['uzunluk yuvarlanmış: ≈, "= ≈" yok', olcuMetni(uzunluk(A, B, 6 * Math.sqrt(3))), '|AB| ≈ 10,39 br'],
    ['uzunluk cm', olcuMetni(uzunluk(A, B, 4, { birim: 'cm' })), '|AB| = 4 cm'],
    ['uzunluk kısa', olcuMetni(uzunluk(A, B, 5), KISA), '5 br'],
    ['kısa yazımda yuvarlanmış değer ≈ ile yazılır', olcuMetni(uzunluk(A, B, 6.8284), KISA), '≈ 6,83 br'],
    ['gizli ad → yalnızca değer', olcuMetni(uzunluk(A, P('B', { showLabel: false }), 5)), '5 br'],
    ['görünmeyen nokta → yalnızca değer', olcuMetni(uzunluk(A, P('B', { visible: false }), 5)), '5 br'],
    ['nokta adı olmayan etiket yazımda kullanılmaz', olcuMetni(uzunluk(A, P('Çokgen'), 5)), '5 br'],
    ['açı', olcuMetni(aci(A, B, C, 60)), 'm(∠ABC) = 60°'],
    ['açı işaret ayarı: düz metin aynı', olcuMetni(aci(A, B, C, 60), ISARET), 'm(∠ABC) = 60°'],
    ['açı kısa', olcuMetni(aci(A, B, C, 60), KISA), '60°'],
    ['açı kısa yuvarlanmış (tuvalde 1 basamak)', olcuMetni(aci(A, B, C, 36.87, { basamak: 1 }), KISA), '≈ 36,9°'],
    ['açı tam dereceye yuvarlanmış', olcuMetni(aci(A, B, C, 53.13, { basamak: 0 })), 'm(∠ABC) ≈ 53°'],
    ['dış açı (reflex)', olcuMetni(aci(A, B, C, 300, { disAci: true })), 'm(∠ABC) = 300° (dış açı)'],
    ['dış açı kısa yazımda da nitelenir', olcuMetni(aci(A, B, C, 300, { disAci: true }), KISA), '300° (dış açı)'],
    ['tek köşe', olcuMetni(koseAcisi(B, 90)), 'm(B̂) = 90°'],
    ['merkez açı', olcuMetni(merkezAci(A, O, B, 80)), 'm(∠AOB) = 80°'],
    ['yay ölçüsü', olcuMetni(yayOlcusu({ bas: A, son: B, buyuk: false }, 80)), 'm(A͡B) = 80°'],
    ['yay uzunluğu', olcuMetni(yayUzunlugu({ bas: A, son: B, buyuk: false }, 7.1239)), '|A͡B| ≈ 7,12 br'],
    ['yay uzunluğu kısa: yalnızca değer', olcuMetni(yayUzunlugu({ bas: A, son: B, buyuk: false }, 7.1239), KISA), '≈ 7,12 br'],
    ['büyük yay, ara nokta yok', olcuMetni(yayUzunlugu({ bas: A, son: B, buyuk: true }, 14.5)), '|A͡B| = 14,5 br (büyük yay)'],
    ['büyük yay, ara nokta C', olcuMetni(yayUzunlugu({ bas: A, son: B, ara: C, buyuk: true }, 14.5)), '|A͡C͡B| = 14,5 br'],
    ['yarım çember, ara nokta yok', olcuMetni(yayOlcusu({ bas: A, son: B, buyuk: false, yarim: true }, 180)), 'm(A͡B) = 180° (yarım çember)'],
    ['yarım çember, ara nokta C', olcuMetni(yayOlcusu({ bas: A, son: B, ara: C, buyuk: false, yarim: true }, 180)), 'm(A͡C͡B) = 180°'],
    ['yay ucu yayın dışında → sözcük', olcuMetni(yayUzunlugu({ bas: A, son: null, buyuk: false }, 3.14159)), 'Yay uzunluğu ≈ 3,14 br'],
    ['alan', olcuMetni(alan([A, B, C], 12)), 'A(ABC) = 12 br²'],
    ['çevre', olcuMetni(cevre([A, B, C, D], 24)), 'Ç(ABCD) = 24 br'],
    ['alan kısa: sözcük kalır', olcuMetni(alan([A, B, C], 12), KISA), 'Alan = 12 br²'],
    ['çevre kısa', olcuMetni(cevre([A, B, C], 16.3), KISA), 'Çevre = 16,3 br'],
    ['alan cm²', olcuMetni(alan([A, B, C], 12, { birim: 'cm' })), 'A(ABC) = 12 cm²'],
    ['dilim alanı', olcuMetni(dilimAlani(A, O, B, 4.712)), 'A(AOB dilimi) ≈ 4,71 br²'],
    ['dilim çevresi', olcuMetni(dilimCevresi(A, O, B, 7.1416)), 'Ç(AOB dilimi) ≈ 7,14 br'],
    ['yarıçap', olcuMetni(yaricap(O, A, 3)), 'r = |OA| = 3 br'],
    ['sabit yarıçap', olcuMetni(yaricap(O, null, 3)), 'r = 3 br'],
    ['kiriş', olcuMetni(kiris(A, B, 3 * Math.SQRT2, false)), 'kiriş |AB| ≈ 4,24 br'],
    ['çap', olcuMetni(kiris(A, B, 6, true)), 'çap |AB| = 2r = 6 br'],
    ['çember kartı: Alan sözcüğü (A = ile nokta A çakışmasın)', olcuMetni(daireAlani(9 * Math.PI)), 'Alan = πr² ≈ 28,27 br²'],
    ['çember kartı: Çevre sözcüğü', olcuMetni(cemberCevresi(6 * Math.PI)), 'Çevre = 2πr ≈ 18,85 br'],
    ['elips alanı', olcuMetni(elipsAlani(6 * Math.PI)), 'Alan = πab ≈ 18,85 br²'],
    ['elips çevresi her zaman ≈', olcuMetni(elipsCevresi(16)), 'Çevre ≈ 16 br'],
    ['daire alanı kısa', olcuMetni(daireAlani(9 * Math.PI), KISA), 'Alan ≈ 28,27 br²'],
    ['eğim', olcuMetni(egim(A, B, 2)), 'AB eğimi = 2'],
    ['eğim tanımsız', olcuMetni(egim(A, B, null)), 'AB eğimi tanımsız'],
    ['eğim kısa', olcuMetni(egim(A, B, 2), KISA), 'Eğim = 2'],
    ['koordinat', olcuMetni(koordinat(A, 2.5, -3)), 'A(2,5; -3)'],
    ['koordinat kısa', olcuMetni(koordinat(A, 2.5, -3), KISA), '(2,5; -3)'],
    ['trig', olcuMetni(trigOrani('sin', B, [A, C], [B, C], 3, 5, 0.6)), 'sin B̂ = |AC|/|BC| = 3/5 = 0,6'],
    ['trig kısa', olcuMetni(trigOrani('sin', B, [A, C], [B, C], 3, 5, 0.6), KISA), 'sin = 3/5 = 0,6'],
    ['trig tanımsız', olcuMetni(trigOrani('tan', B, null, null, 1, 0, null)), 'tan B̂ tanımsız'],
  ])('%s', (_, gercek, beklenen) => expect(gercek).toBe(beklenen));

  it('cümle içinde sözcük küçük harfle başlar, gösterim değişmez', () => {
    expect(olcuMetni(daireAlani(9 * Math.PI), KISA, { cumleIci: true })).toBe('alan ≈ 28,27 br²');
    expect(olcuMetni(daireAlani(9 * Math.PI), VARSAYILAN_YAZIM, { cumleIci: true })).toBe('alan = πr² ≈ 28,27 br²');
    expect(olcuMetni(cemberCevresi(6 * Math.PI), VARSAYILAN_YAZIM, { cumleIci: true })).toBe('çevre = 2πr ≈ 18,85 br');
    expect(olcuMetni(alan([A, B, C], 6), VARSAYILAN_YAZIM, { cumleIci: true })).toBe('A(ABC) = 6 br²');
  });

  it("A_1 ve B' adları", () => {
    expect(olcuMetni(uzunluk(P('A_1'), P("B'"), 2))).toBe("|A_1B'| = 2 br");
    expect(sesli(uzunluk(P('A_1'), P("B'"), 2))).toBe('a bir be üssü uzunluğu iki birim');
  });

  it('dokuz köşeli çokgen adı sözcüğe düşer (en fazla 8 harf)', () => {
    const k = 'ABCDEFGHK'.split('').map((l) => P(l));
    expect(olcuMetni(alan(k, 10))).toBe('Alan = 10 br²');
    expect(olcuMetni(alan(k.slice(0, 8), 10))).toBe('A(ABCDEFGH) = 10 br²');
  });

  it('çember başlığı', () => {
    expect(cemberBasligi(O)?.duz).toBe('Ç(O, r)');
    expect(cemberBasligi(O)?.sesli).toBe('o merkezli çember');
    expect(cemberBasligi(P('O', { showLabel: false }))).toBeNull();
  });

  it('eski kayıt: ayar alanları eksik ya da bozuk → varsayılan', () => {
    expect(yazimAyari(undefined)).toEqual(VARSAYILAN_YAZIM);
    expect(yazimAyari(null)).toEqual(VARSAYILAN_YAZIM);
    expect(yazimAyari({})).toEqual(VARSAYILAN_YAZIM);
    expect(yazimAyari({ olcuYazimi: 'kisa', aciYazimi: 'x' })).toEqual({ olcuYazimi: 'kisa', aciYazimi: 'sapka', tamSayi: false });
    expect(yazimAyari({ olcuYazimi: 3, aciYazimi: 'isaret' })).toEqual({ olcuYazimi: 'tam', aciYazimi: 'isaret', tamSayi: false });
    // Tam sayı yalnız açıkça true iken açılır (bozuk değer kapalı sayılır)
    expect(yazimAyari({ tamSayiOlcu: 'evet' }).tamSayi).toBe(false);
    expect(yazimAyari({ tamSayiOlcu: true }).tamSayi).toBe(true);
  });

  it('sayı ve yuvarlama kuralı', () => {
    expect(sayiMetni(12)).toBe('12');
    expect(sayiMetni(10.392304845)).toBe('10,39');
    expect(sayiMetni(5.9999999999)).toBe('6');
    expect(yuvarlandiMi(12, 2)).toBe(false);
    expect(yuvarlandiMi(10.392304845, 2)).toBe(true);
    // Kayan nokta artığı yuvarlama sayılmaz: 5,9999999999 tam 6'dır, '≈' yazılmaz.
    expect(yuvarlandiMi(5.9999999999, 2)).toBe(false);
  });
});

describe('yazimImzasi', () => {
  it('aynı metni farklı düğüm ağaçlarından ayırır', () => {
    const a = [[sembol('AB')]];
    const b = [[ad('A'), ad('B')]];
    expect(duzMetin(a[0])).toBe(duzMetin(b[0]));
    expect(yazimImzasi(a)).not.toBe(yazimImzasi(b));
  });
  it('içerikçe aynı, kimlikçe farklı ağaçlar aynı imzayı verir', () => {
    const o = uzunluk(A, B, 5);
    expect(yazimImzasi([olcuDugumleri(o)])).toBe(yazimImzasi([olcuDugumleri(o)]));
    expect(yazimImzasi([olcuDugumleri(o)])).not.toBe(yazimImzasi([olcuDugumleri(uzunluk(A, B, 6))]));
  });
  it('soluk sözcüğü ayırt eder', () => {
    expect(yazimImzasi([olcuDugumleri(yayOlcusu({ bas: A, son: B, buyuk: true }, 280))]))
      .not.toBe(yazimImzasi([olcuDugumleri(yayOlcusu({ bas: A, son: B, buyuk: false }, 280))]));
  });
});

describe('sesli okunuş: hiçbir sembol okunmaz', () => {
  const SEMBOL = /[|∠^()[\]≈=°²³⌢△̂͡\d]|\bbr\b|\bm\(/u;
  it.each([
    [uzunluk(A, B, 6 * Math.sqrt(3)), 'a be uzunluğu yaklaşık on virgül otuz dokuz birim'],
    [aci(A, B, C, 60), 'a be ce açısının ölçüsü altmış derece'],
    [aci(A, B, C, 300, { disAci: true }), 'a be ce dış açısının ölçüsü üç yüz derece'],
    [alan([A, B, C], 12), 'a be ce üçgeninin alanı on iki birimkare'],
    [cevre([A, B, C, D], 24), 'a be ce de dörtgeninin çevresi yirmi dört birim'],
    [yayUzunlugu({ bas: A, son: B, buyuk: false }, 7.1239), 'a be yayının uzunluğu yaklaşık yedi virgül on iki birim'],
    [yayOlcusu({ bas: A, son: B, buyuk: true }, 280), 'a be büyük yayının ölçüsü iki yüz seksen derece'],
    [yayOlcusu({ bas: A, son: B, buyuk: false, yarim: true }, 180), 'a be yarım çemberinin ölçüsü yüz seksen derece'],
    [dilimAlani(A, O, B, 4.712), 'a o be daire diliminin alanı yaklaşık dört virgül yetmiş bir birimkare'],
    [yaricap(O, A, 3), 'o a yarıçapının uzunluğu üç birim'],
    [kiris(A, B, 6, true), 'a be çapının uzunluğu altı birim'],
    [daireAlani(9 * Math.PI), 'dairenin alanı yaklaşık yirmi sekiz virgül yirmi yedi birimkare'],
    [cemberCevresi(6 * Math.PI), 'çemberin çevre uzunluğu yaklaşık on sekiz virgül seksen beş birim'],
    [egim(A, B, -2), 'a be doğrusunun eğimi eksi iki'],
    [egim(A, B, null), 'a be doğrusunun eğimi tanımsız'],
    [koordinat(A, 2.5, -3), 'a noktasının koordinatları iki virgül beş ve eksi üç'],
    [trigOrani('sin', B, [A, C], [B, C], 3, 5, 0.6), 'be açısının sinüsü sıfır virgül altı'],
  ])('%#', (o, beklenen) => {
    expect(sesli(o)).toBe(beklenen);
    expect(sesli(o)).not.toMatch(SEMBOL);
  });

  it('açıklama (fare ipucu) adları ekrandaki gibi yazar', () => {
    expect(aciklama(alan([A, B, C], 12))).toBe('ABC üçgeninin alanı: 12 br²');
    expect(aciklama(uzunluk(A, B, 6 * Math.sqrt(3)))).toBe('AB uzunluğu: ≈ 10,39 br');
    expect(aciklama(egim(A, B, null))).toBe('AB doğrusunun eğimi tanımsız');
  });
});

describe('metniSeslendir: yanıtlar ve ipuçları', () => {
  const YASAK = /[|∠≈=°²³̂͡△⌢]|\bm\(|\bbr\b|\bcm\b/u;
  it.each([
    ['A(ABC) = 6 br², Ç(ABC) = 12 br.', 'a be ce üçgeninin alanı altı birimkare, a be ce üçgeninin çevresi on iki birim.'],
    ['Ç(A, r): alan = πr² ≈ 28,27 br², çevre = 2πr ≈ 18,85 br.',
      'a merkezli çember: alan pi r kare yaklaşık yirmi sekiz virgül yirmi yedi birimkare, çevre iki pi r yaklaşık on sekiz virgül seksen beş birim.'],
    ['|B͡C| ≈ 3,14 br. m(B͡C) = 90°.', 'be ce yayının uzunluğu yaklaşık üç virgül on dört birim. be ce yayının ölçüsü doksan derece.'],
    ['r = |OA| = 3 br', 'yarıçap, o a uzunluğu üç birim'],
    ['m(∠ABC) = 300° (dış açı)', 'a be ce açısının ölçüsü üç yüz derece (dış açı)'],
    ['f(x) = x² - 1: eğim tanımsız.', 'ef x eşittir x kare eksi bir: eğim tanımsız.'],
    ['UV doğrusu çizildi.', 'u vi doğrusu çizildi.'],
    ['MEB müfredatına uygun 2. sınıf örneği.', 'MEB müfredatına uygun ikinci sınıf örneği.'],
    ['A(2; -3) noktası oluşturuldu.', 'a noktası, iki ve eksi üç, oluşturuldu.'],
    ['ABCD köşegenleri: |AC| ≈ 2,83 br, |BD| ≈ 2,83 br.',
      'a be ce de köşegenleri: a ce uzunluğu yaklaşık iki virgül seksen üç birim, be de uzunluğu yaklaşık iki virgül seksen üç birim.'],
    ['sin B̂ = |AC|/|BC| = 3/5 = 0,6',
      'be açısının sinüsü eşittir a ce uzunluğu bölü be ce uzunluğu eşittir üç bölü beş eşittir sıfır virgül altı'],
    ['y = 2x + 1: eğim = 2.', 'y eşittir iki x artı bir: eğim eşittir iki.'],
    ['x = 3 doğrusu çizildi.', 'x eşittir üç doğrusu çizildi.'],
    ['|AB| = 5 br. |CD| = 2 br.', 'a be uzunluğu beş birim. ce de uzunluğu iki birim.'],
    ['kiriş |BC| ≈ 2,83 br', 'be ce kirişinin uzunluğu yaklaşık iki virgül seksen üç birim'],
    ['çap |BC| = 2r = 6 br', 'be ce çapının uzunluğu, iki r altı birim'],
    ['A(AOB dilimi) ≈ 4,71 br²', 'a o be daire diliminin alanı yaklaşık dört virgül yetmiş bir birimkare'],
    ['△ABC çizildi (kenar 4 br, açı 60°).', 'a be ce üçgeni çizildi (kenar dört birim, açı altmış derece).'],
    ['%50 olasılık', 'yüzde elli olasılık'],
    ["ABC'nin alanı", "a be ce'nin alanı"],
    ["∠ABC açısı silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın.",
      "a be ce açısı silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın."],
    ['Pergelle A merkezli çember çizildi (r = 3 br).', 'Pergelle a merkezli çember çizildi (yarıçap üç birim).'],
    ['Hayır, 45 değil.', 'Hayır, kırk beş değil.'],
    ['[AB] çizildi.', 'a be doğru parçası çizildi.'],
    // Ardından gelen 'doğru parçası' yutulur (eki korunur): aynı sözcük iki kez okunmaz.
    ['[AB] doğru parçası çizildi.', 'a be doğru parçası çizildi.'],
    ['[AB] doğru parçasının uzunluğu 5 br.', 'a be doğru parçasının uzunluğu beş birim.'],
    // Uygulamanın kendi ürettiği adlarda harf ile sayı AYRI okunur ('cbir' / 'con iki' değil).
    ['c1: r = 3 br.', 'ce bir: yarıçap üç birim.'],
    ['c12 çemberi çizildi.', 'ce on iki çemberi çizildi.'],
    ['f1 fonksiyonu çizildi.', 'fe bir fonksiyonu çizildi.'],
  ])('metniSeslendir(%j)', (metin, beklenen) => {
    const s = metniSeslendir(metin);
    expect(s).toBe(beklenen);
    expect(s).not.toMatch(YASAK);
  });
});

describe('metniCozumle: düz metin ↔ süslü gösterim', () => {
  const ornekler = [
    olcuMetni(uzunluk(A, B, 6 * Math.sqrt(3))),
    olcuMetni(aci(A, B, C, 60)),
    olcuMetni(koseAcisi(B, 90)),
    olcuMetni(yayUzunlugu({ bas: A, son: B, ara: C, buyuk: true }, 14.5)),
    olcuMetni(yayOlcusu({ bas: A, son: B, buyuk: false }, 80)),
    olcuMetni(trigOrani('sin', B, [A, C], [B, C], 3, 5, 0.6)),
    olcuMetni(daireAlani(9 * Math.PI)),
    olcuMetni(kiris(A, B, 6, true)),
    olcuMetni(koordinat(A, 2.5, -3)),
    'ABC: A(ABC) = 6 br², ∠ABC açısı silindi, △ABC ≅ △DEF',
    "ABC'nin alanı",
    'Ç(A, r): alan = πr² ≈ 28,27 br², çevre = 2πr ≈ 18,85 br.',
    'y = 2x + 1: eğim = 2.',
    'f(x) = x² - 1: eğim tanımsız.',
    'Toplam %50 oranında büyütüldü.',
    'Not: uzunlukları şu an eşit değil (10,39 br; 10,47 br)',
    "A_1 ve B' noktaları: |A_1B'| = 2 br.",
    'BD yayı: |B͡D| ≈ 4,71 br, m(B͡D) = 90°.',
  ];
  it.each(ornekler)('%s geri aynı metne döner', (m) => expect(duzMetin(metniCozumle(m))).toBe(m));

  it('süsleri tanır', () => {
    const d = metniCozumle('m(∠ABC) = 60°');
    expect(d.map((x) => x.t)).toEqual(['sembol', 'sus', 'sembol', 'sayi', 'birim']);
    expect(metniCozumle('m(∠ABC)', ISARET).map((x) => x.t)).toEqual(['sembol', 'ad', 'ad', 'ad', 'sembol']);
  });

  it('sayı, birim, ad ve sözcük ayrı düğümlere bölünür', () => {
    const d = metniCozumle('kenar 4 br');
    expect(d.map((x) => x.t)).toEqual(['kelime', 'sayi', 'birim']);
    expect(d[2]).toEqual({ t: 'birim', s: 'br' });
  });

  it('alt indis rakamı düzlenir: A₁ → A_1', () => {
    expect(duzMetin(metniCozumle('A₁ noktası'))).toBe('A_1 noktası');
  });

  it('aynı metin ve ayar için önbellekten aynı ağaç döner', () => {
    expect(metniCozumle('|AB| = 5 br')).toBe(metniCozumle('|AB| = 5 br'));
    expect(metniCozumle('m(∠ABC)')).not.toBe(metniCozumle('m(∠ABC)', ISARET));
  });
});
