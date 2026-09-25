/**
 * Algoritma Laboratuvarı — 5. sınıf (Mühendis adası): dört ünite, blok görünümü ve değişkenler.
 *
 * Bu sınıfta değişken gelir: adı olan, "←" ile değer alan, değeri tuvalin üstünde görünen bir kutu.
 * Hedef yalnız robotun işini değil, program bitince değişkenin değerini de denetler (sayaç = 4 gibi).
 * Araç kutusundaki atama şablonları ifadenin biçimini verir; öğrenci işlenenleri (sayı, değişken,
 * ölçüm) ve işlemi değiştirebilir, işlem ekleyip çıkaramaz. Kazanımlar TYMM matematik listesindendir.
 *
 *   1. Sayaç             olgun domatesleri say; sıfırlanan sayaç, yanlış yerde artırma     MAT.5.2.4
 *   2. Toplayıcı         toplam kütle; atama ile birikim karışması; gram → kilogram       MAT.5.2.4 · 5.1.2
 *   3. Tarlayı ek        sıra sıra ekim (yılan deseni); alan = en × boy; çevre             MAT.5.4.2 · 5.4.3 · 5.4.4
 *   4. Örüntünün kuralı  artan / azalan kuleler; değişkenle tekrar sayısı                  MAT.5.2.3 · 5.2.4
 */
import { ifadeKur, programKur, type BlokSablonu, type KisaBlok } from './program';
import { bahce, domatesSirasi, insaatAlani, type DunyaTanimi, type Hedef } from './dunya';
import { izOzeti, type Iz } from './yorumlayici';
import type { Gorev, Unite } from './gorev';

const k = (liste: KisaBlok[], onek: string) => programKur(liste, onek);

const ILERI: BlokSablonu = { tur: 'eylem', eylem: 'ileri' };
const SAGA: BlokSablonu = { tur: 'eylem', eylem: 'sagaDon' };
const SOLA: BlokSablonu = { tur: 'eylem', eylem: 'solaDon' };
const TOPLA: BlokSablonu = { tur: 'eylem', eylem: 'topla' };
const EK: BlokSablonu = { tur: 'eylem', eylem: 'ek' };
const KOY: BlokSablonu = { tur: 'eylem', eylem: 'koy' };
const CIKISA_KADAR: BlokSablonu = { tur: 'tekrarlaKadar', kosul: 'cikistayim' };
const EGER_KIRMIZI: BlokSablonu = { tur: 'eger', kosul: 'domatesKirmizi' };

// ---------------------------------------------------------------------------
// İzden okunan sayılar (başarı cümleleri ve soruların cevapları)
// ---------------------------------------------------------------------------

const deger = (iz: Iz, ad: string): number => iz.son.degiskenler[ad] ?? 0;
/** Değişkenin sırayla aldığı değerler (atama adımları) */
const degerleri = (iz: Iz, ad: string): number[] => iz.adimlar.flatMap((a) => (a.tur === 'atama' && a.degisken === ad && a.deger !== undefined ? [a.deger] : []));
/** Her atamada değişkene eklenen miktar; ilk atama başlangıç değeridir */
const eklenenler = (iz: Iz, ad: string): number[] => {
  const d = degerleri(iz, ad);
  return d.slice(1).map((v, i) => v - d[i]);
};
const domatesSayisi = (iz: Iz) => iz.son.bitkiler.length;
/** Sıradaki kulelerin küp sayıları, soldan sağa */
const kuleler = (iz: Iz) => iz.son.kupler.filter((h) => h > 0);
/** [1, 2, 3] → "1, 2 ve 3" */
const liste = (s: readonly number[]) => (s.length <= 1 ? s.join('') : `${s.slice(0, -1).join(', ')} ve ${s[s.length - 1]}`);

/** Ekilecek alanın eni ve boyu (hedef karelerin kapladığı dikdörtgen) ve ekilen kare sayısı */
function tarla(iz: Iz): { en: number; boy: number; alan: number } {
  const g = iz.son.izgara;
  const xs = new Set<number>();
  const ys = new Set<number>();
  g.boyaHedef.forEach((v, h) => {
    if (v) {
      xs.add(h % g.en);
      ys.add(Math.floor(h / g.en));
    }
  });
  return { en: xs.size, boy: ys.size, alan: iz.son.boyali.length };
}

// ---------------------------------------------------------------------------
// 1. Sayaç
// ---------------------------------------------------------------------------

const SAYAC_KUTUSU: BlokSablonu[] = [
  ILERI,
  TOPLA,
  CIKISA_KADAR,
  EGER_KIRMIZI,
  { tur: 'ata', degisken: 'sayaç', ifade: ifadeKur(0) },
  { tur: 'ata', degisken: 'sayaç', ifade: ifadeKur(['sayaç', '+', 1]) },
];
const sayacHedefi = (n: number): Hedef => ({ cikistaBitir: true, degiskenler: { sayaç: n } });
const sayacCozumu = (onek: string) => k([['ata', 'sayaç', 0], 'ileri', ['kadar', 'cikistayim', [['eger', 'domatesKirmizi', [['ata', 'sayaç', ['sayaç', '+', 1]]]], 'ileri']]], onek);

const SAYAC_SIRA: DunyaTanimi = { id: 's5-sayac-d1', ad: 'Domates sırası', bitkiler: domatesSirasi('K Y K K Y K') };
const SAYAC_UZUN: DunyaTanimi = { id: 's5-sayac-d2', ad: 'Uzun sıra', bitkiler: domatesSirasi('Y K K Y K K K Y K Y') };
const SAYAC_SONU_OLGUN: DunyaTanimi = { id: 's5-sayac-d3', ad: 'Sonu olgun sıra', bitkiler: domatesSirasi('K K Y K Y K K') };
const SAYAC_KARISIK: DunyaTanimi = { id: 's5-sayac-d4', ad: 'Karışık sıra', bitkiler: domatesSirasi('Y K Y K K Y') };
const SAYAC_SEPET: DunyaTanimi = { id: 's5-sayac-d5', ad: 'Yarı dolu sepet', bitkiler: domatesSirasi('K Y Y K K Y K Y') };

/** Tahmin: sepette 2 domates varken olgunları topla ve say */
const SEPETLI_SAYAC = k([['ata', 'sayaç', 2], 'ileri', ['kadar', 'cikistayim', [['eger', 'domatesKirmizi', ['topla', ['ata', 'sayaç', ['sayaç', '+', 1]]]], 'ileri']]], 's5s5-');

const SAYAC_GOREVLERI: Gorev[] = [
  {
    id: 's5-sayac-1',
    tur: 'yaz',
    baslik: 'Olgunları say',
    yonerge: 'Robot domates sırasında yürüyor. Olgun (kırmızı) domatesleri sayaç değişkeniyle saysın. Program bitince sayaç, olgun domates sayısı olmalı.',
    dunya: SAYAC_SIRA,
    hedef: sayacHedefi(4),
    bitkiAdi: 'bitki',
    aracKutusu: SAYAC_KUTUSU,
    baslangic: k(['ileri', ['kadar', 'cikistayim', [['eger', 'domatesKirmizi', []], 'ileri']]], 's5s1b-'),
    cozum: sayacCozumu('s5s1c-'),
    ipuclari: [
      'Saymaya başlamadan önce sayaç kaç olmalı? "sayaç ← 0" bloğunu en başa koy.',
      'Robot kırmızı domates gördükçe sayacı 1 artırmalı. "sayaç ← sayaç + 1" bloğunu "eğer domates kırmızıysa" bloğunun içine koy.',
    ],
    basari: (iz) => `Oldu! Robot ${domatesSayisi(iz)} domatese baktı. sayaç = ${deger(iz, 'sayaç')}: sırada ${deger(iz, 'sayaç')} olgun domates var.`,
    soru: {
      metin: 'Sırada 6 domates var. Kaçı ham (yeşil)?',
      birim: 'domates',
      cevap: (iz) => domatesSayisi(iz) - deger(iz, 'sayaç'),
      sonrasi: '6 − 4 = 2: iki domates ham.',
      yonlendirme: 'Bütün domateslerin sayısından olgunların sayısını çıkar.',
    },
    kazanimlar: ['MAT.5.2.4'],
    degiskenler: ['sayaç'],
  },
  {
    id: 's5-sayac-2',
    tur: 'kurgu',
    genelleme: true,
    baslik: 'Uzun sıra',
    yonerge: 'Bu sıra daha uzun. Kodun burada da doğru sayıyor mu? Çalıştır, gerekirse düzelt.',
    dunya: SAYAC_UZUN,
    hedef: sayacHedefi(6),
    bitkiAdi: 'bitki',
    aracKutusu: SAYAC_KUTUSU,
    baslangic: 'onceki',
    cozum: sayacCozumu('s5s2c-'),
    ipuclari: ['Kodun domates sayısını bilmeden çalışmalı. Sayı yanlışsa adım adım çalıştır ve her domateste sayacın değerini izle.'],
    basari: (iz) => `Oldu! Kodun sıranın uzunluğunu bilmeden sayıyor: ${domatesSayisi(iz)} domatesten ${deger(iz, 'sayaç')} tanesi olgun.`,
    kazanimlar: ['MAT.5.2.4'],
    degiskenler: ['sayaç'],
  },
  {
    id: 's5-sayac-3',
    tur: 'hata',
    baslik: 'Sıfırlanan sayaç',
    yonerge: 'Bu kod olgun domatesleri sayamıyor. Adım adım çalıştır, sayacın değerini izle. Hatayı bul, düzelt.',
    dunya: SAYAC_SONU_OLGUN,
    hedef: sayacHedefi(5),
    bitkiAdi: 'bitki',
    aracKutusu: SAYAC_KUTUSU,
    baslangic: k(['ileri', ['kadar', 'cikistayim', [['ata', 'sayaç', 0], ['eger', 'domatesKirmizi', [['ata', 'sayaç', ['sayaç', '+', 1]]]], 'ileri']]], 's5s3h-'),
    cozum: sayacCozumu('s5s3c-'),
    ipuclari: ['sayaç ne zaman yeniden 0 oluyor?', '"sayaç ← 0" bloğu tekrarın içinde: her turda sayaç sıfırlanıyor. Onu tekrarın dışına, en başa taşı.'],
    basari: (iz) => `Buldun! "sayaç ← 0" yalnız bir kez, en başta çalışmalı. Şimdi sayaç = ${deger(iz, 'sayaç')}.`,
    kazanimlar: ['MAT.5.2.4'],
    degiskenler: ['sayaç'],
  },
  {
    id: 's5-sayac-4',
    tur: 'hata',
    baslik: 'Her domatesi sayan',
    yonerge: 'Bu kod ham domatesleri de sayıyor. Hatayı bul, düzelt.',
    dunya: SAYAC_KARISIK,
    hedef: sayacHedefi(3),
    bitkiAdi: 'bitki',
    aracKutusu: SAYAC_KUTUSU,
    baslangic: k([['ata', 'sayaç', 0], 'ileri', ['kadar', 'cikistayim', [['eger', 'domatesKirmizi', []], ['ata', 'sayaç', ['sayaç', '+', 1]], 'ileri']]], 's5s4h-'),
    cozum: sayacCozumu('s5s4c-'),
    ipuclari: ['"sayaç ← sayaç + 1" bloğu hangi bloğun içinde? Yeşil domateste de çalışıyor mu?', 'Artırma bloğunu "eğer domates kırmızıysa" bloğunun içine taşı.'],
    basari: (iz) => `Buldun! sayaç artık yalnız olgun domateste artıyor: ${deger(iz, 'sayaç')} olgun, ${domatesSayisi(iz) - deger(iz, 'sayaç')} ham domates.`,
    kazanimlar: ['MAT.5.2.4'],
    degiskenler: ['sayaç'],
  },
  {
    id: 's5-sayac-5',
    tur: 'tahmin',
    baslik: 'Sepette 2 domates',
    yonerge: 'Kodu oku. Sepette önceden 2 domates var; robot olgunları toplayıp sayacak.',
    dunya: SAYAC_SEPET,
    hedef: { kirmizilariTopla: true, cikistaBitir: true, degiskenler: { sayaç: 6 } },
    bitkiAdi: 'bitki',
    aracKutusu: SAYAC_KUTUSU,
    baslangic: SEPETLI_SAYAC,
    cozum: SEPETLI_SAYAC,
    ipuclari: ['Önce sayacın başlangıç değerine bak: 0 değil.', 'Kırmızı domatesleri say ve başlangıç değerine ekle.'],
    basari: (iz) => `2 + ${izOzeti(iz).sepet} = ${deger(iz, 'sayaç')}: sepette ${deger(iz, 'sayaç')} domates var. Başlangıç değeri sonucu değiştirir.`,
    tahmin: {
      metin: 'Program bitince sayaç kaç olur?',
      birim: 'domates',
      cevap: (iz) => deger(iz, 'sayaç'),
      sonrasi: 'sayaç 0’dan değil 2’den başladı: 2 + 4 = 6.',
      yonlendirme: 'Kod "sayaç ← 2" ile başlıyor; sonra her olgun domateste 1 artıyor.',
    },
    kazanimlar: ['MAT.5.2.4'],
    degiskenler: ['sayaç'],
  },
];

// ---------------------------------------------------------------------------
// 2. Toplayıcı
// ---------------------------------------------------------------------------

const TOPLAM_KUTUSU: BlokSablonu[] = [
  ILERI,
  TOPLA,
  CIKISA_KADAR,
  EGER_KIRMIZI,
  { tur: 'ata', degisken: 'toplam', ifade: ifadeKur(0) },
  { tur: 'ata', degisken: 'toplam', ifade: ifadeKur(['toplam', '+', 1]) },
];
const toplamHedefi = (g: number): Hedef => ({ kirmizilariTopla: true, cikistaBitir: true, degiskenler: { toplam: g } });
const toplamCozumu = (onek: string) =>
  k([['ata', 'toplam', 0], 'ileri', ['kadar', 'cikistayim', [['eger', 'domatesKirmizi', ['topla', ['ata', 'toplam', ['toplam', '+', '@kutle']]]], 'ileri']]], onek);
/** "120 + 150 + 130 + 100 = 500" */
const toplamIslemi = (iz: Iz) => `${eklenenler(iz, 'toplam').join(' + ')} = ${deger(iz, 'toplam')}`;

const TOPLAM_SIRA: DunyaTanimi = { id: 's5-toplam-d1', ad: 'Tartılı domatesler', bitkiler: domatesSirasi('K120 Y90 K150 K130 Y80 K100') };
const TOPLAM_KILO: DunyaTanimi = { id: 's5-toplam-d2', ad: 'İri domatesler', bitkiler: domatesSirasi('K250 K300 Y120 K350 K200 Y150 K400 K250 Y100 K250') };
const TOPLAM_SILINEN: DunyaTanimi = { id: 's5-toplam-d3', ad: 'Altı domates', bitkiler: domatesSirasi('K140 K110 Y90 K160 K120 Y70') };
const TOPLAM_DEGERSIZ: DunyaTanimi = { id: 's5-toplam-d4', ad: 'Beş domates', bitkiler: domatesSirasi('Y100 K150 K200 Y90 K150') };
const TOPLAM_TAHMIN: DunyaTanimi = { id: 's5-toplam-d5', ad: 'Bir kiloluk sıra', bitkiler: domatesSirasi('K200 Y150 K300 K250 Y100 K250') };

const TOPLAM_TAHMIN_KODU = toplamCozumu('s5t5-');

const TOPLAM_GOREVLERI: Gorev[] = [
  {
    id: 's5-toplam-1',
    tur: 'yaz',
    baslik: 'Sepetin kütlesi',
    yonerge: 'Robot olgun domatesleri topluyor. toplam değişkeniyle sepetteki domateslerin kütlesini bulsun. kütle, robotun yanındaki domatesin gramıdır.',
    dunya: TOPLAM_SIRA,
    hedef: toplamHedefi(500),
    bitkiAdi: 'bitki',
    aracKutusu: TOPLAM_KUTUSU,
    baslangic: k(['ileri', ['kadar', 'cikistayim', [['eger', 'domatesKirmizi', ['topla']], 'ileri']]], 's5t1b-'),
    cozum: toplamCozumu('s5t1c-'),
    ipuclari: [
      'Toplamaya başlamadan önce toplam kaç olmalı? "toplam ← 0" bloğunu en başa koy.',
      'Robot her olgun domatesi topladıktan sonra onun kütlesini toplama eklemeli. "toplam ← toplam + 1" bloğunu "topla"nın altına koy.',
      'Bloktaki 1’e dokun, kütle yap: toplam ← toplam + kütle.',
    ],
    basari: (iz) => `Oldu! Sepetteki domatesler: ${toplamIslemi(iz)} gram.`,
    kazanimlar: ['MAT.5.2.4'],
    degiskenler: ['toplam'],
    olcumler: ['kutle'],
  },
  {
    id: 's5-toplam-2',
    tur: 'kurgu',
    genelleme: true,
    baslik: 'Kilogramlık sepet',
    yonerge: 'Bu sırada daha çok ve daha iri domates var. Kodun burada da doğru topluyor mu? Çalıştır, gerekirse düzelt.',
    dunya: TOPLAM_KILO,
    hedef: toplamHedefi(2000),
    bitkiAdi: 'bitki',
    aracKutusu: TOPLAM_KUTUSU,
    baslangic: 'onceki',
    cozum: toplamCozumu('s5t2c-'),
    ipuclari: ['Kodun domatesleri ve kütlelerini bilmeden çalışmalı: robot her olgun domatesi tartıp toplama ekliyor mu?'],
    basari: (iz) => `Oldu! ${domatesSayisi(iz)} domatesten ${izOzeti(iz).sepet} tanesi toplandı: ${toplamIslemi(iz)} gram.`,
    soru: {
      metin: 'Sepetteki domatesler kaç kilogram?',
      birim: 'kilogram',
      cevap: (iz) => deger(iz, 'toplam') / 1000,
      sonrasi: '1000 gram = 1 kilogram; 2000 gram = 2 kilogram.',
      yonlendirme: '1 kilogram 1000 gramdır. Toplamda kaç tane 1000 gram var?',
    },
    kazanimlar: ['MAT.5.2.4', 'MAT.5.1.2'],
    degiskenler: ['toplam'],
    olcumler: ['kutle'],
  },
  {
    id: 's5-toplam-3',
    tur: 'hata',
    baslik: 'Silinen toplam',
    yonerge: 'Bu kodda toplam sonunda yalnız bir domatesin kütlesi kalıyor. Adım adım çalıştır, toplamı izle. Hatayı bul, düzelt.',
    dunya: TOPLAM_SILINEN,
    hedef: toplamHedefi(530),
    bitkiAdi: 'bitki',
    aracKutusu: TOPLAM_KUTUSU,
    baslangic: k([['ata', 'toplam', 0], 'ileri', ['kadar', 'cikistayim', [['eger', 'domatesKirmizi', ['topla', ['ata', 'toplam', '@kutle']]], 'ileri']]], 's5t3h-'),
    cozum: toplamCozumu('s5t3c-'),
    ipuclari: [
      'Her olgun domateste toplam büyüyor mu, yoksa yeniden mi yazılıyor?',
      '"toplam ← kütle" eski toplamı siler. Araç kutusundan "toplam ← toplam + 1" bloğunu al, 1’i kütle yap ve eski bloğun yerine koy.',
    ],
    basari: (iz) => `Buldun! "toplam ← toplam + kütle" yeni kütleyi eskinin üstüne ekler: ${toplamIslemi(iz)} gram.`,
    kazanimlar: ['MAT.5.2.4'],
    degiskenler: ['toplam'],
    olcumler: ['kutle'],
  },
  {
    id: 's5-toplam-4',
    tur: 'hata',
    baslik: 'Değeri olmayan toplam',
    yonerge: 'Robot ilk olgun domateste duruyor. Hatayı bul, düzelt.',
    dunya: TOPLAM_DEGERSIZ,
    hedef: toplamHedefi(500),
    bitkiAdi: 'bitki',
    aracKutusu: TOPLAM_KUTUSU,
    baslangic: k(['ileri', ['kadar', 'cikistayim', [['eger', 'domatesKirmizi', ['topla', ['ata', 'toplam', ['toplam', '+', '@kutle']]]], 'ileri']]], 's5t4h-'),
    cozum: toplamCozumu('s5t4c-'),
    ipuclari: ['Robot "toplam + kütle" hesaplarken toplam kaçtı?', 'Toplamaya başlamadan önce toplama bir değer ver: "toplam ← 0" bloğunu en başa koy.'],
    basari: (iz) => `Buldun! toplam 0’dan başladı: ${toplamIslemi(iz)} gram.`,
    kazanimlar: ['MAT.5.2.4'],
    degiskenler: ['toplam'],
    olcumler: ['kutle'],
  },
  {
    id: 's5-toplam-5',
    tur: 'tahmin',
    baslik: 'Toplam kaç gram?',
    yonerge: 'Kodu oku. Robot olgun domatesleri toplayıp kütlelerini toplayacak. Kütleler sırayla 200, 150, 300, 250, 100 ve 250 gram.',
    dunya: TOPLAM_TAHMIN,
    hedef: toplamHedefi(1000),
    bitkiAdi: 'bitki',
    aracKutusu: TOPLAM_KUTUSU,
    baslangic: TOPLAM_TAHMIN_KODU,
    cozum: TOPLAM_TAHMIN_KODU,
    ipuclari: ['Yalnız kırmızı domatesler toplanıyor. Hangileri kırmızı?', 'Kırmızıların kütlelerini topla.'],
    basari: (iz) => `${toplamIslemi(iz)} gram, yani ${deger(iz, 'toplam') / 1000} kilogram.`,
    tahmin: {
      metin: 'Program bitince toplam kaç olur?',
      birim: 'gram',
      cevap: (iz) => deger(iz, 'toplam'),
      sonrasi: '200 + 300 + 250 + 250 = 1000 gram, yani 1 kilogram.',
      yonlendirme: 'Yeşil domatesler toplanmıyor; yalnız kırmızıların kütlelerini topla.',
    },
    kazanimlar: ['MAT.5.2.4', 'MAT.5.1.2'],
    degiskenler: ['toplam'],
    olcumler: ['kutle'],
  },
];

// ---------------------------------------------------------------------------
// 3. Tarlayı ek
// ---------------------------------------------------------------------------

const TARLA_KUTUSU: BlokSablonu[] = [ILERI, SAGA, SOLA, EK, { tur: 'tekrarlaKez', kez: 4 }];
const TARLA_HEDEFI: Hedef = { boyamayiTamamla: true, cikistaBitir: false };
const TARLA = { boyaTuru: 'ek' as const, adimIzi: false };

/** Bir sıra: `adim` kez (ek, ileri), sonra son kareye ek */
const sira = (adim: number): KisaBlok[] => [['kez', adim, ['ek', 'ileri']], 'ek'];
/** Gidiş ve dönüş sırası; sonunda robot bir alttaki sıranın başına geçer */
const ciftSira = (adim: number): KisaBlok[] => [...sira(adim), 'sagaDon', 'ileri', 'sagaDon', ...sira(adim), 'solaDon', 'ileri', 'solaDon'];

// Tarlanın çevresi yol: sıra sonunda yapılan fazladan dönüş robotu çite çarptırmaz
const TARLA_IKI = bahce('s5-tarla-d1', 'İki sıralık tarla', ['.......', '.boooo.', '.ooooo.', '.......'], TARLA);
const TARLA_DORT = bahce('s5-tarla-d2', 'Dört sıralık tarla', ['.......', '.boooo.', '.ooooo.', '.ooooo.', '.ooooo.', '.......'], TARLA);
// Doğu ve batı yanı çit: fazladan adım robotu çite çarptırır
const TARLA_CITLI = bahce('s5-tarla-d3', 'Çitli tarla', ['booooo', 'oooooo', 'oooooo', 'oooooo', '......'], TARLA);
const TARLA_BUYUK = bahce('s5-tarla-d4', 'Büyük tarla', ['boooooo', 'ooooooo', 'ooooooo', 'ooooooo', '.......'], TARLA);

const TARLA_TAHMIN_KODU = k([['kez', 2, ciftSira(6)]], 's5e5-');

const TARLA_GOREVLERI: Gorev[] = [
  {
    id: 's5-tarla-1',
    tur: 'yaz',
    baslik: 'İki sıra',
    yonerge: 'Robot tarlanın her karesine bir tohum eksin. Önce birinci sırayı ek; sıranın sonunda dön, ikinci sırayı geri gelerek ek.',
    dunya: TARLA_IKI,
    hedef: TARLA_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: TARLA_KUTUSU,
    baslangic: 'bos',
    cozum: k([...sira(4), 'sagaDon', 'ileri', 'sagaDon', ...sira(4)], 's5e1-'),
    ipuclari: [
      'Bir sırada 5 kare var. Robot kaç kez ilerlemeli? İlk kareden son kareye 4 adım var.',
      '"4 kez tekrarla" içine "tohum ek" ve "ileri git" koy; tekrardan sonra son kareye de tohum ek.',
      'Sıranın sonunda: sağa dön, ileri git, sağa dön. Sonra aynı sırayı yeniden kur.',
    ],
    basari: (iz) => {
      const t = tarla(iz);
      return `Oldu! Robot ${t.alan} kareye tohum ekti: ${t.en} × ${t.boy} = ${t.en * t.boy}.`;
    },
    soru: {
      metin: 'Tarlanın alanı kaç birim kare?',
      birim: 'birim kare',
      cevap: (iz) => tarla(iz).alan,
      sonrasi: 'Alan = en × boy = 5 × 2 = 10 birim kare.',
      yonlendirme: 'Ekilen her kare 1 birim karedir. Kaç kare ekildi?',
    },
    kazanimlar: ['MAT.5.4.2'],
  },
  {
    id: 's5-tarla-2',
    tur: 'kurgu',
    baslik: 'Dört sıra',
    yonerge: 'Bu tarla dört sıra. Kodunu düzelt. Aynı blokları yeniden dizme: iki sıralık parçayı tekrarla.',
    dunya: TARLA_DORT,
    hedef: TARLA_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: TARLA_KUTUSU,
    baslangic: 'onceki',
    cozum: k([['kez', 2, ciftSira(4)]], 's5e2-'),
    enCokBlok: 16,
    ipuclari: [
      'İki sıra ekince robotu bir alttaki sıranın başına getir: sola dön, ileri git, sola dön.',
      'Bütün kodu "2 kez tekrarla" bloğunun içine al.',
    ],
    basari: (iz) => {
      const t = tarla(iz);
      return `Oldu! İki sıralık parça 2 kez tekrarlandı: ${t.en} × ${t.boy} = ${t.alan} kare ekildi.`;
    },
    soru: {
      metin: 'Tarla bir sıra daha uzun olsaydı kaç kareye tohum ekilirdi?',
      birim: 'kare',
      cevap: (iz) => tarla(iz).en * (tarla(iz).boy + 1),
      sonrasi: '5 × 5 = 25 birim kare.',
      yonlendirme: 'Yeni tarlanın eni 5, boyu 5 kare olurdu.',
    },
    kazanimlar: ['MAT.5.4.2', 'MAT.5.4.4'],
  },
  {
    id: 's5-tarla-3',
    tur: 'hata',
    baslik: 'Yanlış dönüş',
    yonerge: 'Robot bir sıranın sonunda yanlış yöne dönüyor. Adım adım çalıştır, hatayı bul, düzelt.',
    dunya: TARLA_DORT,
    hedef: TARLA_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: TARLA_KUTUSU,
    baslangic: k([['kez', 2, [...sira(4), 'solaDon', 'ileri', 'solaDon', ...sira(4), 'solaDon', 'ileri', 'solaDon']]], 's5e3h-'),
    cozum: k([['kez', 2, ciftSira(4)]], 's5e3-'),
    ipuclari: ['Robotun yerine geç: birinci sıranın sonunda ikinci sıra senin hangi yanında?', 'Birinci sıranın sonunda iki kez sağa dönülür: sağa dön, ileri git, sağa dön.'],
    basari: (iz) => `Buldun! Sıranın sonunda robot tarlanın içine doğru dönmeli. ${tarla(iz).alan} kare ekildi.`,
    kazanimlar: ['MAT.5.4.2'],
  },
  {
    id: 's5-tarla-4',
    tur: 'hata',
    baslik: 'Çite çarpan robot',
    yonerge: 'Bu tarlanın her sırasında 6 kare var. Robot çite çarpıyor. Hatayı bul, düzelt.',
    dunya: TARLA_CITLI,
    hedef: TARLA_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: TARLA_KUTUSU,
    baslangic: k([['kez', 2, ciftSira(6)]], 's5e4h-'),
    cozum: k([['kez', 2, ciftSira(5)]], 's5e4-'),
    ipuclari: ['6 kareyi ekmek için robot kaç adım atmalı? Parmağınla say: ilk kareden son kareye.', '6 kare için 5 adım yeter: "6 kez tekrarla" bloklarındaki sayıyı 5 yap.'],
    basari: (iz) => {
      const t = tarla(iz);
      return `Buldun! ${t.en} kare için ${t.en - 1} adım yeter. ${t.en} × ${t.boy} = ${t.alan} kare ekildi.`;
    },
    kazanimlar: ['MAT.5.4.2'],
  },
  {
    id: 's5-tarla-5',
    tur: 'tahmin',
    baslik: 'Kaç tohum?',
    yonerge: 'Kodu oku: robot her sırada kaç kareye tohum ekiyor, kaç sıra var? Sonra çalıştır.',
    dunya: TARLA_BUYUK,
    hedef: TARLA_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: TARLA_KUTUSU,
    baslangic: TARLA_TAHMIN_KODU,
    cozum: TARLA_TAHMIN_KODU,
    ipuclari: ['Bir sırada 6 adım var; kaç kareye ekiliyor?', 'Bir sıradaki kare sayısını sıra sayısıyla çarp.'],
    basari: (iz) => {
      const t = tarla(iz);
      return `Oldu! ${t.en} × ${t.boy} = ${t.alan} kare ekildi.`;
    },
    tahmin: {
      metin: 'Robot kaç kareye tohum ekecek?',
      birim: 'kare',
      cevap: (iz) => tarla(iz).alan,
      sonrasi: 'Bir sırada 7 kare, 4 sıra: 7 × 4 = 28.',
      yonlendirme: '6 adımda 7 kare ekilir. Kaç sıra var?',
    },
    soru: {
      metin: 'Tarlanın çevresine tel çekilecek. Kaç birim tel gerekir?',
      birim: 'birim',
      cevap: (iz) => 2 * (tarla(iz).en + tarla(iz).boy),
      sonrasi: 'Çevre = 7 + 4 + 7 + 4 = 22 birim. Alan içi ölçer (28 birim kare), çevre kenarı.',
      yonlendirme: 'Çevre, dört kenarın uzunlukları toplamıdır: 7 + 4 + 7 + 4.',
    },
    kazanimlar: ['MAT.5.4.3', 'MAT.5.4.4'],
  },
];

// ---------------------------------------------------------------------------
// 4. Örüntünün kuralı
// ---------------------------------------------------------------------------

const KURAL_KUTUSU: BlokSablonu[] = [
  ILERI,
  KOY,
  { tur: 'tekrarlaKez', kez: 4 },
  { tur: 'tekrarlaKez', kez: 1, kezIfade: ifadeKur('kat') },
  { tur: 'ata', degisken: 'kat', ifade: ifadeKur(1) },
  { tur: 'ata', degisken: 'kat', ifade: ifadeKur(['kat', '+', 1]) },
];
const KULE_HEDEFI: Hedef = { yapiyiKur: true, cikistaBitir: false };
/** kat ← bas; kule sayısı kez [ileri, kat kez küp koy, kat ← kat ± adim] */
const kuleKodu = (bas: number, op: '+' | '-', adim: number, kule: number, onek: string) =>
  k([['ata', 'kat', bas], ['kez', kule, ['ileri', ['kez', 'kat', ['koy']], ['ata', 'kat', ['kat', op, adim]]]]], onek);
/** "her kule bir öncekinden 2 fazla" */
const kuralMetni = (h: readonly number[]) => {
  const f = h.length > 1 ? h[1] - h[0] : 0;
  return f >= 0 ? `her kule bir öncekinden ${f} fazla` : `her kule bir öncekinden ${-f} eksik`;
};

const KULE_1234 = insaatAlani('s5-kural-d1', 'Büyüyen kuleler', ['B1234']);
const KULE_246 = insaatAlani('s5-kural-d2', 'İkişer artan kuleler', ['B246']);
const KULE_54321 = insaatAlani('s5-kural-d3', 'Azalan kuleler', ['B54321']);
const KULE_3456 = insaatAlani('s5-kural-d4', 'Üçten başlayan kuleler', ['B3456']);

const KURAL_TAHMIN_KODU = kuleKodu(3, '+', 1, 4, 's5k5-');

const KURAL_GOREVLERI: Gorev[] = [
  {
    id: 's5-kural-1',
    tur: 'yaz',
    baslik: 'Büyüyen kuleler',
    yonerge: 'Dron 1, 2, 3 ve 4 küplük kuleler kuracak. kat değişkeni bir kulede kaç küp olacağını tutsun; her kuleden sonra kat 1 artsın.',
    dunya: KULE_1234,
    hedef: KULE_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: KURAL_KUTUSU,
    baslangic: 'bos',
    cozum: kuleKodu(1, '+', 1, 4, 's5k1-'),
    ipuclari: [
      'İlk kule 1 küp: "kat ← 1" ile başla.',
      'Bir kule için: ileri git, "kat kez tekrarla" içinde küp koy, sonra "kat ← kat + 1".',
      'Dört kule var: bu üç bloğu "4 kez tekrarla" içine koy.',
    ],
    basari: (iz) => `Oldu! Kuleler ${liste(kuleler(iz))} küp: ${kuralMetni(kuleler(iz))}. Toplam ${izOzeti(iz).kup} küp.`,
    kazanimlar: ['MAT.5.2.3'],
    degiskenler: ['kat'],
  },
  {
    id: 's5-kural-2',
    tur: 'kurgu',
    baslik: 'İkişer artan',
    yonerge: 'Bu kez kuleler 2, 4 ve 6 küp. Örüntünün kuralını bul, kodunu düzelt.',
    dunya: KULE_246,
    hedef: KULE_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: KURAL_KUTUSU,
    baslangic: 'onceki',
    cozum: kuleKodu(2, '+', 2, 3, 's5k2-'),
    ipuclari: ['İlk kule kaç küp? Her kule bir öncekinden kaç fazla? Kaç kule var?', '"kat ← 2" ile başla, her kuleden sonra "kat ← kat + 2". Tekrar sayısını kule sayısına eşitle.'],
    basari: (iz) => `Oldu! Kuleler ${liste(kuleler(iz))} küp: ${kuralMetni(kuleler(iz))}.`,
    soru: {
      metin: 'Bu kurala göre 6. kulede kaç küp olur?',
      birim: 'küp',
      cevap: (iz) => {
        const h = kuleler(iz);
        return h[0] + 5 * (h[1] - h[0]);
      },
      sonrasi: '2, 4, 6, 8, 10, 12: 6. kulede 12 küp olur.',
      yonlendirme: 'Örüntüyü sürdür: 2, 4, 6, … her kuleye 2 ekle.',
    },
    kazanimlar: ['MAT.5.2.3'],
    degiskenler: ['kat'],
  },
  {
    id: 's5-kural-3',
    tur: 'kurgu',
    baslik: 'Azalan kuleler',
    yonerge: 'Kuleler bu kez 5, 4, 3, 2 ve 1 küp; örüntü azalıyor. Kodunu düzelt.',
    dunya: KULE_54321,
    hedef: KULE_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: KURAL_KUTUSU,
    baslangic: 'onceki',
    cozum: kuleKodu(5, '-', 1, 5, 's5k3-'),
    ipuclari: ['kat kaçtan başlamalı? Her kuleden sonra kat artmalı mı, azalmalı mı?', '"kat ← kat + 2" bloğundaki + işaretine dokun, − yap; sayıyı da 1 yap.'],
    basari: (iz) => `Oldu! Kuleler ${liste(kuleler(iz))} küp: ${kuralMetni(kuleler(iz))}. Toplam ${izOzeti(iz).kup} küp.`,
    kazanimlar: ['MAT.5.2.3'],
    degiskenler: ['kat'],
  },
  {
    id: 's5-kural-4',
    tur: 'hata',
    baslik: 'Erken artan kat',
    yonerge: 'Dron 1, 2, 3 ve 4 küplük kuleleri kuramıyor. Hatayı bul, düzelt.',
    dunya: KULE_1234,
    hedef: KULE_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: KURAL_KUTUSU,
    baslangic: k([['ata', 'kat', 1], ['kez', 4, ['ileri', ['ata', 'kat', ['kat', '+', 1]], ['kez', 'kat', ['koy']]]]], 's5k4h-'),
    cozum: kuleKodu(1, '+', 1, 4, 's5k4-'),
    ipuclari: ['Birinci kuleye kaç küp kondu? O sırada kat kaçtı?', '"kat ← kat + 1" kule kurulduktan sonra çalışmalı: bloğu "kat kez tekrarla"nın altına taşı.'],
    basari: (iz) => `Buldun! Önce kule kurulur, sonra kat artar: ${liste(kuleler(iz))} küp.`,
    kazanimlar: ['MAT.5.2.3'],
    degiskenler: ['kat'],
  },
  {
    id: 's5-kural-5',
    tur: 'tahmin',
    baslik: 'Kaç küp?',
    yonerge: 'Kodu oku: kat kaçtan başlıyor, her kuleden sonra nasıl değişiyor? Sonra çalıştır.',
    dunya: KULE_3456,
    hedef: KULE_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: KURAL_KUTUSU,
    baslangic: KURAL_TAHMIN_KODU,
    cozum: KURAL_TAHMIN_KODU,
    ipuclari: ['Kuleler kaç küp olacak? Sırayla yaz: 3, …', 'Dört kulenin küplerini topla.'],
    basari: (iz) => `${kuleler(iz).join(' + ')} = ${izOzeti(iz).kup} küp.`,
    tahmin: {
      metin: 'Dron toplam kaç küp koyacak?',
      birim: 'küp',
      cevap: (iz) => izOzeti(iz).kup,
      sonrasi: '3 + 4 + 5 + 6 = 18 küp.',
      yonlendirme: 'kat 3’ten başlıyor ve her kuleden sonra 1 artıyor. Dört kule var: 3 + 4 + 5 + 6.',
    },
    soru: {
      metin: 'Program bitince kat kaç olur?',
      birim: '',
      cevap: (iz) => deger(iz, 'kat'),
      sonrasi: 'Son kuleden sonra da kat 1 arttı: 6 + 1 = 7.',
      yonlendirme: 'Son kule 6 küp. Ondan sonra "kat ← kat + 1" bir kez daha çalıştı.',
    },
    kazanimlar: ['MAT.5.2.3', 'MAT.5.2.4'],
    degiskenler: ['kat'],
  },
];

// ---------------------------------------------------------------------------
// Üniteler
// ---------------------------------------------------------------------------

const ORTAK = { sinif: 5, kademe: 'Mühendis adası', gorunum: 'blok' as const, sesliYonerge: false };

export const SINIF5: readonly Unite[] = [
  {
    ...ORTAK,
    id: 's5-sayac',
    no: 1,
    ad: 'Sayaç',
    tema: 'Sera',
    yeniKavram: 'Değişken ve sayaç: başta 0, her bulduğunda 1 artır',
    oncedenBilinen: '"Çıkışa varana kadar tekrarla" ve "eğer … ise" (3. sınıf)',
    kalip: 'sayac',
    kazanimlar: ['MAT.5.2.4'],
    sure: '1 ders saati',
    gorevler: SAYAC_GOREVLERI,
    fissiz: {
      ad: 'Sayaç tahtası',
      amac: 'Sayacın başta bir kez sıfırlandığını ve yalnız koşul doğruyken arttığını bedenle yaşamak.',
      sure: '15 dakika',
      roller: [
        'Bir öğrenci robot olur; domates kartlarının önünden yürür.',
        'Bir öğrenci sayaç olur; tahtadaki "sayaç" kutusuna yalnız robotun söylediği değeri yazar.',
        'Sınıf programcıdır; komut kartlarını tahtaya sırayla dizer.',
      ],
      adimlar: [
        'Yere 6–8 domates kartı dizin; bazıları kırmızı, bazıları yeşil olsun.',
        'Programcılar kartları dizer: sayaç ← 0, ileri, çıkışa kadar tekrarla, eğer kırmızıysa sayaç ← sayaç + 1.',
        'Robot programı uygular; her atama kartında sayaç öğrenci eski değeri silip yenisini yazar.',
        'Öğretmen "sayaç ← 0" kartını tekrarın içine taşır. Sınıf ne olacağını tahmin eder, sonra oynar.',
        'Sınıfa sorulur: "Sayaç neden bir türlü büyümedi? Sıfırlama kartı nerede olmalı?"',
      ],
      hazirlik: 'Domates kartlarını ve komut kartlarını kesin. Tahtaya "sayaç" yazılı bir kutu çizin; sayaç öğrencisi yeni değeri yazmadan önce eskisini siler.',
      kartlar: [
        { komut: 'DEĞİŞKEN', aciklama: 'sayaç ← 0: kutuya 0 yaz.', adet: 1 },
        { komut: 'DEĞİŞKEN', aciklama: 'sayaç ← sayaç + 1: kutudaki sayıyı 1 artır.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir domates ileri git.', adet: 2 },
        { komut: 'BAK', aciklama: 'Önündeki domatesin rengine bak.', adet: 1 },
        { komut: 'EĞER', aciklama: 'Domates kırmızıysa içteki kartı uygula.', adet: 1 },
        { komut: 'ÇIKIŞA KADAR TEKRARLA', aciklama: 'Çıkışa varana kadar içteki kartları yeniden uygula.', adet: 1 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir sayma algoritmasında değişkeni başlangıç değeriyle kurar, yalnız koşul doğruyken artırır ve program bitince değişkenin değerini yorumlar.',
      dersler: [
        { baslik: '1 ders', metin: 'Fişsiz "Sayaç tahtası" (15 dk), ardından 1–2. görevler bireysel; 3–4. görevler (hatayı bul) ikişerli, sayaç göstergesi adım adım izlenerek. 5. görevde önce herkes tahminini yazar.' },
      ],
      yanilgilar: [
        { ad: 'Sayacı döngüde sıfırlamak', metin: '"sayaç ← 0" tekrarın içine girince her turda sayaç sıfırlanır; sonunda yalnız son domates sayılmış olur (3. görev: 1 çıkar).' },
        { ad: 'Koşulun dışında saymak', metin: 'Artırma bloğu "eğer"in altına kayınca her domates sayılır (4. görev: 6 domatesin hepsi). Blokların yanındaki sayımlar bunu gösterir.' },
        { ad: 'Başlangıç değerini önemsememek', metin: 'Sayacın her zaman 0’dan başladığını sanmak. 5. görevde sayaç 2’den başlar; sonuç da 2 fazla çıkar.' },
      ],
      sorular: [
        'Sayaç neden en başta 0 yapılır? 0 yapmasaydık ne olurdu?',
        'Sıfırlama bloğu tekrarın içindeyken sayaç neden 1 çıktı?',
        'Kod domates sayısını bilmeden nasıl doğru sayıyor?',
        'Ham domatesleri saymak için kodda neyi değiştirirdiniz?',
      ],
      celdiriciler: 'Araç kutusundaki "topla" bloğu saymak için gerekmez; yalnız 5. görevde robot hem toplar hem sayar. Sayacın toplama bağlı olmadığını görmek içindir.',
    },
  },
  {
    ...ORTAK,
    id: 's5-toplam',
    no: 2,
    ad: 'Toplayıcı',
    tema: 'Sera',
    yeniKavram: 'Biriktiren değişken: toplam ← toplam + kütle',
    oncedenBilinen: 'Sayaç (1. ünite)',
    kalip: 'toplayici',
    kazanimlar: ['MAT.5.2.4', 'MAT.5.1.2'],
    sure: '1 ders saati',
    gorevler: TOPLAM_GOREVLERI,
    fissiz: {
      ad: 'Terazili sepet',
      amac: 'Toplamın her yeni değerle büyüdüğünü, eski değerin silinmediğini yaşamak.',
      sure: '15 dakika',
      roller: [
        'Bir öğrenci robot olur; domates kartlarının önünden yürür ve kartın arkasındaki gramı okur.',
        'Bir öğrenci toplam olur; tahtadaki "toplam" kutusuna yeni değeri yazar.',
        'Sınıf programcıdır ve hesabı denetler.',
      ],
      adimlar: [
        'Yere 5–6 domates kartı dizin; her kartın arkasında gramı yazsın (120 g, 150 g …).',
        'Programcılar kartları dizer: toplam ← 0, ileri, çıkışa kadar tekrarla, eğer kırmızıysa toplam ← toplam + kütle.',
        'Robot her kırmızı domateste gramı okur; toplam öğrencisi eski toplamı ve gramı toplayıp yeni değeri yazar.',
        'Öğretmen atama kartını "toplam ← kütle" yapar. Aynı sıra yeniden oynanır; sınıf farkı söyler.',
        'Sonuç gramdan kilograma çevrilir: 1000 gram = 1 kilogram.',
      ],
      hazirlik: 'Domates kartlarının arkasına gramı yazın. Tahtaya "toplam" kutusu çizin. İsterseniz gerçek bir mutfak terazisiyle sonucu karşılaştırın.',
      kartlar: [
        { komut: 'DEĞİŞKEN', aciklama: 'toplam ← 0: kutuya 0 yaz.', adet: 1 },
        { komut: 'DEĞİŞKEN', aciklama: 'toplam ← toplam + kütle: kutudaki sayıya domatesin gramını ekle.', adet: 1 },
        { komut: 'İŞLEM', aciklama: 'Toplamayı yap, sonucu söyle.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir domates ileri git.', adet: 2 },
        { komut: 'BAK', aciklama: 'Domatesin rengine ve gramına bak.', adet: 1 },
        { komut: 'EĞER', aciklama: 'Domates kırmızıysa içteki kartları uygula.', adet: 1 },
        { komut: 'ÇIKIŞA KADAR TEKRARLA', aciklama: 'Çıkışa varana kadar içteki kartları yeniden uygula.', adet: 1 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir toplama algoritmasında değişkeni 0’la başlatır, her yeni değeri eskisinin üstüne ekler; sonucu gram ve kilogramla yorumlar.',
      dersler: [
        { baslik: '1 ders', metin: 'Fişsiz "Terazili sepet" (15 dk), ardından 1–2. görevler; 2. görevin sorusu gramı kilograma çevirir. 3–4. görevler ikişerli. 5. görev (tahmin) sınıfça, hesap tahtada yapılarak.' },
      ],
      yanilgilar: [
        { ad: 'Atamayı birikim sanmak', metin: '"toplam ← kütle" yazıp toplamın büyüyeceğini sanmak. Atama eski değeri siler; sonunda yalnız son domatesin kütlesi kalır (3. görev).' },
        { ad: 'Başlangıç değeri vermemek', metin: 'Toplama hiç değer vermeden "toplam + kütle" hesaplamak. Robot ilk olgun domateste durur: toplamın henüz değeri yoktur (4. görev).' },
        { ad: 'Gram ile kilogramı karıştırmak', metin: 'Toplamı kilograma çevirirken 100’e bölmek. 1000 gram = 1 kilogram (2. görev sorusu).' },
      ],
      sorular: [
        '"toplam ← kütle" ile "toplam ← toplam + kütle" arasındaki fark nedir?',
        'Toplam neden 0’dan başlar? 1’den başlasaydı ne olurdu?',
        'Sayaç ile toplayıcı nasıl benzer, nasıl farklı?',
        'Sepetteki domateslerin ortalama kütlesini bulmak için neyi bilmeliyiz?',
      ],
      celdiriciler: 'Şablon "toplam ← toplam + 1" olarak verilir; öğrenci 1’i kütle yapmalıdır. Bu, sayaç ile toplayıcının aynı biçimde olduğunu gösterir.',
    },
  },
  {
    ...ORTAK,
    id: 's5-tarla',
    no: 3,
    ad: 'Tarlayı ek',
    tema: 'Tarla',
    yeniKavram: 'Alanı sıra sıra tarama (yılan deseni)',
    oncedenBilinen: 'Tekrarla ve iç içe tekrar (4. sınıf)',
    kalip: 'yilan',
    kazanimlar: ['MAT.5.4.2', 'MAT.5.4.3', 'MAT.5.4.4'],
    sure: '2 ders saati',
    gorevler: TARLA_GOREVLERI,
    fissiz: {
      ad: 'İnsan traktör',
      amac: 'Bir alanı eksiksiz ve üst üste gelmeden dolaşmanın yolunu bedenle bulmak; ekilen kare sayısının alan olduğunu görmek.',
      sure: '15 dakika',
      roller: ['Bir öğrenci traktör olur; her karede bir fasulye (tohum) bırakır.', 'Sınıf programcıdır; kartları tahtaya dizer.'],
      adimlar: [
        'Yere bantla 4 × 3 karelik bir tarla çizin.',
        'Programcılar birinci sırayı kodlar: tohum ek, ileri git… Sıranın sonunda traktör nasıl döner?',
        'Traktör programı uygular; bir kare boş kalırsa ya da iki kez ekilirse sınıf söyler.',
        'Sınıf tekrar eden parçayı bulur: gidiş sırası, dönüş, geliş sırası, dönüş.',
        'Ekilen tohumlar sayılır ve en × boy ile karşılaştırılır. Tarlanın çevresi de adımlanarak ölçülür.',
      ],
      hazirlik: 'Yere bantla karelik bir tarla çizin; her kareye bırakılacak fasulye ya da düğme hazırlayın.',
      kartlar: [
        { komut: 'TOHUM EK', aciklama: 'Bulunduğun kareye tohum bırak.', adet: 4 },
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 4 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 2 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 2 },
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları yazılan sayı kadar uygula.', adet: 2 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci dikdörtgen bir alanı sıra sıra tarayan bir algoritma kurar, onu tekrarla kısaltır; ekilen kare sayısından alanı (en × boy) bulur ve alanı çevreden ayırır.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "İnsan traktör" (15 dk), ardından 1–2. görevler. 2. görevde kod en çok 16 blok olabilir; tekrar eden parçayı bulmak gerekir.' },
        { baslik: '2. ders', metin: '3–4. görevler (hatayı bul) ikişerli; 5. görevde önce tahmin, sonra çevre sorusu. Ders "alan içi, çevre kenarı ölçer" tartışmasıyla kapanır.' },
      ],
      yanilgilar: [
        { ad: 'Yanlış yöne dönmek', metin: 'Sıranın sonunda robotun bakış yönünü düşünmeden dönmek. 3. görevde robot tarlanın dışına çıkar ve oraya tohum eker.' },
        { ad: 'Kare ile adımı karıştırmak', metin: '6 kare için 6 adım atmak (direk hatası). 6 kare arasında 5 adım vardır; 4. görevde robot çite çarpar.' },
        { ad: 'Alan ile çevreyi karıştırmak', metin: 'Ekilen kare sayısını çevre sanmak. 5. görevde alan 28 birim kare, çevre 22 birimdir.' },
      ],
      sorular: [
        'Robot kaç kareye tohum ekti? Saymadan nasıl bulabiliriz?',
        'Sıranın sonunda robot neden bir kez sağa, bir kez sola dönüyor?',
        'Tarla iki kat uzun olsaydı kod nasıl değişirdi? Alan nasıl değişirdi?',
        'Alanı 12 birim kare olan başka hangi tarlaları kurabiliriz?',
      ],
      celdiriciler: 'Araç kutusunda hem "sağa dön" hem "sola dön" vardır; sıra sonlarında ikisi sırayla gerekir. Tekrar bloğunun sayısı öğrenciye bilerek 4 verilir: kare ile adım sayısı ayrı düşünülmelidir.',
    },
  },
  {
    ...ORTAK,
    id: 's5-kural',
    no: 4,
    ad: 'Örüntünün kuralı',
    tema: 'İnşaat alanı',
    yeniKavram: 'Değişkenle büyüyen tekrar: "kat kez tekrarla"',
    oncedenBilinen: 'Sayaç (1. ünite), küp kule (2. sınıf)',
    kalip: 'kural',
    kazanimlar: ['MAT.5.2.3', 'MAT.5.2.4'],
    sure: '1 ders saati',
    gorevler: KURAL_GOREVLERI,
    fissiz: {
      ad: 'Kule örüntüsü',
      amac: 'Bir örüntünün kuralını bir değişkenle yazmak ve değişkenin her turda nasıl değiştiğini görmek.',
      sure: '15 dakika',
      roller: ['Bir öğrenci dron olur; masalara küp (ya da kitap) dizer.', 'Bir öğrenci kat olur; tahtadaki "kat" kutusunu günceller.', 'Sınıf programcıdır.'],
      adimlar: [
        'Masaya yan yana dört kule yeri işaretleyin.',
        'Programcılar kartları dizer: kat ← 1; 4 kez tekrarla: ileri, kat kez küp koy, kat ← kat + 1.',
        'Dron her kulede tahtadaki kat değeri kadar küp koyar; kat öğrencisi sonra değeri günceller.',
        'Kural değiştirilir: kat ← 2 ve kat ← kat + 2. Sınıf yeni kuleleri önceden söyler.',
        '"kat ← kat + 1" kartı küp koymadan önceye alınır; sınıf ilk kulenin neden 2 küp olduğunu açıklar.',
      ],
      hazirlik: 'Küp, lego ya da kitap hazırlayın. Tahtaya "kat" kutusu çizin.',
      kartlar: [
        { komut: 'DEĞİŞKEN', aciklama: 'kat ← 1: kutuya 1 yaz.', adet: 1 },
        { komut: 'DEĞİŞKEN', aciklama: 'kat ← kat + 1: kutudaki sayıyı 1 artır.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir sonraki kule yerine git.', adet: 1 },
        { komut: 'KÜP KOY', aciklama: 'Kuleye bir küp koy.', adet: 1 },
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları yazılan sayı (ya da kat) kadar uygula.', adet: 2 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci artan ve azalan örüntülerin kuralını bulur; kuralı başlangıç değeri ve her turdaki değişimle bir değişkene bağlar, tekrar sayısını değişkenle verir.',
      dersler: [
        { baslik: '1 ders', metin: 'Fişsiz "Kule örüntüsü" (15 dk), ardından 1–3. görevler (artan, ikişer artan, azalan); 4. görev ikişerli; 5. görevde önce tahmin.' },
      ],
      yanilgilar: [
        { ad: 'Önce artırmak', metin: 'Değişkeni kullanmadan önce artırmak; örüntü bir adım kayar. 4. görevde ilk kule 2 küp olur ve dron durur.' },
        { ad: 'Yalnız farka bakmak', metin: 'Kuralı yalnız "2 fazla" diye düşünüp başlangıç değerini ve kule sayısını unutmak. 2. görevde eski kod 1’den başlar ve 4 kule kurmaya çalışır; dron alanın kenarına çıkar.' },
        { ad: 'Son artışı unutmak', metin: 'Program bitince değişkenin son kulenin değerinde kaldığını sanmak; son turda da artar (5. görev sorusu: 7).' },
      ],
      sorular: [
        'Kuleler 2, 4, 6 ise 10. kule kaç küp olur? Nasıl buldunuz?',
        'Azalan örüntüde kat neden 5’ten başladı?',
        'Aynı kodla 1, 3, 5, 7 kulelerini nasıl kurarsınız?',
        '"kat ← kat + 1" bloğunun yeri neden önemli?',
      ],
      celdiriciler: 'Araç kutusunda iki tekrar bloğu vardır: sayılı "4 kez tekrarla" kule sayısı içindir, "kat kez tekrarla" bir kuledeki küp sayısı için. İkisini karıştıran öğrenci yanlış kuleler kurar.',
    },
  },
];
