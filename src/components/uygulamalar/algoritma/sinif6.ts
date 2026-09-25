/**
 * Algoritma Laboratuvarı — 6. sınıf (Mühendis adası): dört ünite, blok görünümü, değişken ve ifadeler.
 *
 * 5. sınıfın sayaç ve toplayıcısı burada cebire bağlanır: tekrar sayısı bir ifadedir (n, 2 × n,
 * 2 × n + 1), karar bir karşılaştırmadır (sıra mod 3 = 0, kütle > enBüyük). Dünya n'yi verir; aynı kod
 * farklı n'lerde sınanır. Şablonlar ifadenin biçimini verir; öğrenci işlenenleri ve işlemi değiştirir.
 * Kazanımlar TYMM matematik listesindendir.
 *
 *   1. Formüllü algoritma     n kez; 2 × n; 2 × n + 1 adım; bir fazla hatası            MAT.6.2.3 · 6.2.1
 *   2. Katlar ve bölünebilme  her 3. saksı (mod); her 4.; ortak kat; geç sayan sayaç    MAT.6.1.1 · 6.1.2 · 6.1.4
 *   3. Örüntü ve genel terim  2 × i − 1 kuleler; i'nin başlangıcı; 20. terim            MAT.6.2.2 · 6.2.3
 *   4. En büyüğü bul          en ağır domates; yanlış başlangıç; ters karşılaştırma     MAT.6.5.1
 */
import { ifadeKur, kosulKur, programKur, type BlokSablonu, type IfadeKisa, type KisaBlok } from './program';
import { domatesSirasi, insaatAlani, saksiSirasi, type DunyaTanimi, type Hedef } from './dunya';
import { izOzeti, type Iz } from './yorumlayici';
import type { Gorev, Unite } from './gorev';

const k = (liste: KisaBlok[], onek: string) => programKur(liste, onek);

const ILERI: BlokSablonu = { tur: 'eylem', eylem: 'ileri' };
const SULA: BlokSablonu = { tur: 'eylem', eylem: 'sula' };
const GUBRE: BlokSablonu = { tur: 'eylem', eylem: 'gubreVer' };
const TOPLA: BlokSablonu = { tur: 'eylem', eylem: 'topla' };
const KOY: BlokSablonu = { tur: 'eylem', eylem: 'koy' };
const CIKISA_KADAR: BlokSablonu = { tur: 'tekrarlaKadar', kosul: 'cikistayim' };
const EGER_KURU: BlokSablonu = { tur: 'eger', kosul: 'toprakKuru' };

// ---------------------------------------------------------------------------
// İzden okunan sayılar
// ---------------------------------------------------------------------------

const deger = (iz: Iz, ad: string): number => iz.son.degiskenler[ad] ?? 0;
/** Değişkenin sırayla aldığı değerler (atama adımları) */
const degerleri = (iz: Iz, ad: string): number[] => iz.adimlar.flatMap((a) => (a.tur === 'atama' && a.degisken === ad && a.deger !== undefined ? [a.deger] : []));
/** Sıradaki kulelerin küp sayıları, soldan sağa */
const kuleler = (iz: Iz) => iz.son.kupler.filter((h) => h > 0);
/** [1, 2, 3] → "1, 2 ve 3" */
const liste = (s: readonly number[]) => (s.length <= 1 ? s.join('') : `${s.slice(0, -1).join(', ')} ve ${s[s.length - 1]}`);
/** Robotun gübre verdiği saksılar (sırada x, saksının sırasıdır) */
const gubreYerleri = (iz: Iz) => iz.adimlar.flatMap((a) => (a.tur === 'eylem' && a.eylem === 'gubreVer' && !a.hata ? [a.durum.x] : []));
/** Sıradaki domateslerin kütleleri */
const kutleler = (iz: Iz) => iz.baslangic.bitkiler.map((b) => b.gram ?? 0);

/** Sayının ardına ilgi eki: 3’ün, 4’ün, 6’nın … */
const NIN: Record<number, string> = { 2: '2’nin', 3: '3’ün', 4: '4’ün', 5: '5’in', 6: '6’nın' };
const nin = (m: number) => NIN[m] ?? `${m}’in`;

// ---------------------------------------------------------------------------
// 1. Formüllü algoritma
// ---------------------------------------------------------------------------

const KEZ_N: BlokSablonu = { tur: 'tekrarlaKez', kez: 1, kezIfade: ifadeKur('n') };
const KEZ_2N: BlokSablonu = { tur: 'tekrarlaKez', kez: 1, kezIfade: ifadeKur([2, '×', 'n']) };
const FORMUL_KUTUSU: BlokSablonu[] = [ILERI, SULA, { tur: 'tekrarlaKez', kez: 5 }, KEZ_N];
const FORMUL_KUTUSU_2: BlokSablonu[] = [ILERI, SULA, EGER_KURU, { tur: 'tekrarlaKez', kez: 5 }, KEZ_N, KEZ_2N];
const SULAMA_HEDEFI: Hedef = { kurulariSula: true, cikistaBitir: true };

const nKez = (onek: string) => k([['kez', 'n', ['ileri', 'sula']], 'ileri'], onek);

const SIRA_5: DunyaTanimi = { id: 's6-formul-d1', ad: 'n = 5', bitkiler: saksiSirasi('K K K K K'), degiskenler: { n: 5 } };
const SIRA_8: DunyaTanimi = { id: 's6-formul-d2', ad: 'n = 8', bitkiler: saksiSirasi('K K K K K K K K'), degiskenler: { n: 8 } };
const SIRA_6: DunyaTanimi = { id: 's6-formul-d3', ad: 'n = 6', bitkiler: saksiSirasi('K K K K K K'), degiskenler: { n: 6 } };
/** Her kuru saksının önünde nemli bir saksı: 2 × n saksı */
const CIFT_4: DunyaTanimi = { id: 's6-formul-d4', ad: 'n = 4 çift', bitkiler: saksiSirasi('N K N K N K N K'), degiskenler: { n: 4 } };
const CIFT_5: DunyaTanimi = { id: 's6-formul-d5', ad: 'n = 5 çift', bitkiler: saksiSirasi('N K N K N K N K N K'), degiskenler: { n: 5 } };

const FORMUL_TAHMIN_KODU = k([['kez', [[2, '×', 'n'], '+', 1], ['ileri', ['eger', 'toprakKuru', ['sula']]]]], 's6f5-');

const FORMUL_GOREVLERI: Gorev[] = [
  {
    id: 's6-formul-1',
    tur: 'yaz',
    baslik: 'n saksı',
    yonerge: 'Bu serada n = 5 kuru saksı var. Robot hepsini sulayıp çıkışa gitsin. Tekrar sayısı olarak 5 değil, n kullan.',
    dunya: SIRA_5,
    hedef: SULAMA_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: FORMUL_KUTUSU,
    baslangic: 'bos',
    cozum: nKez('s6f1-'),
    ipuclari: [
      'Her saksı için iki iş var: ileri git, sula. Bu iş kaç kez yapılmalı?',
      '"n kez tekrarla" içine "ileri git" ve "sula" koy.',
      'Son saksıdan sonra çıkış bir adım ötede: tekrardan sonra bir "ileri git" daha.',
    ],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! n = ${deger(iz, 'n')}: robot n = ${o.sulama} saksıyı suladı ve n + 1 = ${o.ileri} adım attı.`;
    },
    kazanimlar: ['MAT.6.2.3'],
    degiskenler: ['n'],
  },
  {
    id: 's6-formul-2',
    tur: 'kurgu',
    genelleme: true,
    baslik: 'n = 8',
    yonerge: 'Bu serada n = 8. Kodun burada da çalışıyor mu? Çalıştır, gerekirse düzelt.',
    dunya: SIRA_8,
    hedef: SULAMA_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: FORMUL_KUTUSU,
    baslangic: 'onceki',
    cozum: nKez('s6f2-'),
    ipuclari: ['Kodunda sayı mı var, n mi? Tekrar sayısı n olursa kod her serada çalışır.'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! Kodun n’yi okuyor: n = ${deger(iz, 'n')} saksı, n + 1 = ${o.ileri} adım, 2 × n = ${o.harcananSu} litre su.`;
    },
    soru: {
      metin: 'Her saksıya 2 litre su gider. n = 20 olsaydı kaç litre su gerekirdi?',
      birim: 'litre',
      cevap: (iz) => (izOzeti(iz).harcananSu / deger(iz, 'n')) * 20,
      sonrasi: '2 × n = 2 × 20 = 40 litre.',
      yonlendirme: 'Su miktarı 2 × n. n yerine 20 koy.',
    },
    kazanimlar: ['MAT.6.2.3', 'MAT.6.2.1'],
    degiskenler: ['n'],
  },
  {
    id: 's6-formul-3',
    tur: 'hata',
    baslik: 'Bir fazla tur',
    yonerge: 'Bu kod çıkışa varmak için bir tur fazla dönüyor. Çalıştır, izle. Hatayı bul, düzelt.',
    dunya: SIRA_6,
    hedef: SULAMA_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: FORMUL_KUTUSU,
    baslangic: k([['kez', ['n', '+', 1], ['ileri', 'sula']]], 's6f3h-'),
    cozum: nKez('s6f3-'),
    ipuclari: ['Son turda robot nerede suluyor?', 'Sulama n kez olmalı: "n kez tekrarla" kullan. Çıkışa varmak için tekrardan sonra bir "ileri git" ekle.'],
    basari: (iz) => `Buldun! n saksı için n tur yeter; çıkış son saksıdan bir adım ötede: n + 1 = ${izOzeti(iz).ileri} adım.`,
    kazanimlar: ['MAT.6.2.3'],
    degiskenler: ['n'],
  },
  {
    id: 's6-formul-4',
    tur: 'kurgu',
    baslik: 'İkişerli saksılar',
    yonerge: 'Bu serada n = 4 kuru saksı var; her kurunun önünde nemli bir saksı duruyor. Robot 2 × n saksının önünden geçmeli. Kodunu düzelt.',
    dunya: CIFT_4,
    hedef: SULAMA_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: FORMUL_KUTUSU_2,
    baslangic: 'onceki',
    cozum: k([['kez', [2, '×', 'n'], ['ileri', ['eger', 'toprakKuru', ['sula']]]], 'ileri'], 's6f4-'),
    ipuclari: [
      'Robot her saksıda sulamamalı. Toprağa bakıp karar vermeli.',
      '"2 × n kez tekrarla" içine "ileri git" ve "eğer toprak kuruysa: sula" koy.',
    ],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! n = ${deger(iz, 'n')}: robot 2 × n = ${o.ileri - 1} saksının önünden geçti, ${o.sulama} saksıyı suladı.`;
    },
    soru: {
      metin: 'Robot çıkışa kadar kaç adım attı?',
      birim: 'adım',
      cevap: (iz) => izOzeti(iz).ileri,
      sonrasi: '2 × n + 1 = 2 × 4 + 1 = 9 adım.',
      yonlendirme: '2 × n saksı, sonra çıkışa bir adım daha.',
    },
    kazanimlar: ['MAT.6.2.3', 'MAT.6.2.1'],
    degiskenler: ['n'],
  },
  {
    id: 's6-formul-5',
    tur: 'tahmin',
    baslik: 'Formülü oku',
    yonerge: 'Bu serada n = 5 çift saksı var. Kodu oku: tekrar sayısı bir formül. Sonra çalıştır.',
    dunya: CIFT_5,
    hedef: SULAMA_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: FORMUL_KUTUSU_2,
    baslangic: FORMUL_TAHMIN_KODU,
    cozum: FORMUL_TAHMIN_KODU,
    ipuclari: ['n yerine 5 koy: 2 × 5 + 1 kaç eder?'],
    basari: (iz) => `n = ${deger(iz, 'n')} için 2 × n + 1 = ${izOzeti(iz).ileri} adım.`,
    tahmin: {
      metin: 'Robot kaç adım atacak?',
      birim: 'adım',
      cevap: (iz) => izOzeti(iz).ileri,
      sonrasi: '2 × 5 + 1 = 11 adım.',
      yonlendirme: 'Önce çarpma: 2 × 5 = 10; sonra 1 ekle.',
    },
    soru: {
      metin: 'n = 10 olsaydı robot kaç adım atardı?',
      birim: 'adım',
      cevap: () => 2 * 10 + 1,
      sonrasi: '2 × 10 + 1 = 21 adım.',
      yonlendirme: 'Formülde n yerine 10 koy: 2 × 10 + 1.',
    },
    kazanimlar: ['MAT.6.2.3', 'MAT.6.2.1'],
    degiskenler: ['n'],
  },
];

// ---------------------------------------------------------------------------
// 2. Katlar ve bölünebilme
// ---------------------------------------------------------------------------

const KAT_KUTUSU: BlokSablonu[] = [
  ILERI,
  GUBRE,
  CIKISA_KADAR,
  { tur: 'eger', kosul: kosulKur([['sıra', 'mod', 3], '=', 0]) },
  { tur: 'ata', degisken: 'sıra', ifade: ifadeKur(0) },
  { tur: 'ata', degisken: 'sıra', ifade: ifadeKur(['sıra', '+', 1]) },
];
const KAT_KUTUSU_2: BlokSablonu[] = [...KAT_KUTUSU, SULA, { tur: 'eger', kosul: kosulKur([['sıra', 'mod', 3], '=', 0]), degilse: true }];
const GUBRE_HEDEFI: Hedef = { sarilariGubrele: true, cikistaBitir: true };

/** sıra ← 0; ileri; çıkışa kadar [sıra ← sıra + 1; eğer sıra mod m = 0 ise gübre ver; ileri] */
const katKodu = (m: number, onek: string) =>
  k([['ata', 'sıra', 0], 'ileri', ['kadar', 'cikistayim', [['ata', 'sıra', ['sıra', '+', 1]], ['eger', [['sıra', 'mod', m], '=', 0], ['gubreVer']], 'ileri']]], onek);
/** "3, 6 ve 9: 3 × 1, 3 × 2, 3 × 3" */
const katCumlesi = (iz: Iz, m: number) => {
  const y = gubreYerleri(iz);
  return `${liste(y)}. Hepsi ${nin(m)} katı: ${y.map((x) => `${m} × ${x / m}`).join(', ')}.`;
};

const KAT_3: DunyaTanimi = { id: 's6-kat-d1', ad: 'Dokuz saksı', bitkiler: saksiSirasi('N N Ns N N Ns N N Ns') };
const KAT_4: DunyaTanimi = { id: 's6-kat-d2', ad: 'On iki saksı', bitkiler: saksiSirasi('N N N Ns N N N Ns N N N Ns') };
const KAT_6: DunyaTanimi = { id: 's6-kat-d3', ad: 'Ortak katlar', bitkiler: saksiSirasi('N N N N N Ns N N N N N Ns') };
const KAT_3_UZUN: DunyaTanimi = { id: 's6-kat-d4', ad: 'On bir saksı', bitkiler: saksiSirasi('N N Ns N N Ns N N Ns N N') };
const KAT_SULA: DunyaTanimi = { id: 's6-kat-d5', ad: 'Kuru ve sarı', bitkiler: saksiSirasi('K K Ns K K Ns K K Ns') };

const KAT_GOREVLERI: Gorev[] = [
  {
    id: 's6-kat-1',
    tur: 'yaz',
    baslik: 'Her 3. saksı',
    yonerge: 'Robotun renk algılayıcısı bozuk; sararan yaprakları göremiyor. Sararanlar 3’ün katı olan sıralarda. Robot sıra değişkeniyle sayıp onlara gübre versin.',
    dunya: KAT_3,
    hedef: GUBRE_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: KAT_KUTUSU,
    baslangic: k([['ata', 'sıra', 0], 'ileri', ['kadar', 'cikistayim', [['ata', 'sıra', ['sıra', '+', 1]], 'ileri']]], 's6k1b-'),
    cozum: katKodu(3, 's6k1-'),
    ipuclari: [
      'sıra, robotun önündeki saksının numarası. Hangi numaralar 3’ün katı?',
      'Bir sayı 3’e kalansız bölünüyorsa 3’ün katıdır: sıra mod 3 = 0.',
      '"eğer sıra mod 3 = 0 ise" bloğunu "sıra ← sıra + 1"in altına koy, içine "gübre ver".',
    ],
    basari: (iz) => `Oldu! Gübre alan saksılar: ${katCumlesi(iz, 3)}`,
    kazanimlar: ['MAT.6.1.1', 'MAT.6.1.2'],
    degiskenler: ['sıra'],
  },
  {
    id: 's6-kat-2',
    tur: 'kurgu',
    baslik: 'Her 4. saksı',
    yonerge: 'Bu serada her 4. saksının yaprakları sararmış. Kodunu düzelt.',
    dunya: KAT_4,
    hedef: GUBRE_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: KAT_KUTUSU,
    baslangic: 'onceki',
    cozum: katKodu(4, 's6k2-'),
    ipuclari: ['Sararan saksıların numaraları: 4, 8, 12. Bunlar hangi sayının katı?', 'Karşılaştırmadaki 3’e dokun, 4 yap.'],
    basari: (iz) => `Oldu! Gübre alan saksılar: ${katCumlesi(iz, 4)}`,
    soru: {
      metin: '12 saksılık sırada kaç saksı 4’ün katı?',
      birim: 'saksı',
      cevap: (iz) => izOzeti(iz).gubre,
      sonrasi: '12 ÷ 4 = 3: 4, 8 ve 12.',
      yonlendirme: '4’ün katlarını say: 4, 8, … 12’yi geçme.',
    },
    kazanimlar: ['MAT.6.1.1', 'MAT.6.1.2'],
    degiskenler: ['sıra'],
  },
  {
    id: 's6-kat-3',
    tur: 'kurgu',
    baslik: 'Ortak kat',
    yonerge: 'Bu serada yalnız hem 2’nin hem 3’ün katı olan saksılar sararmış. Kodunu düzelt.',
    dunya: KAT_6,
    hedef: GUBRE_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: KAT_KUTUSU,
    baslangic: 'onceki',
    cozum: katKodu(6, 's6k3-'),
    ipuclari: ['2’nin katları: 2, 4, 6, 8, 10, 12. 3’ün katları: 3, 6, 9, 12. İkisinde de olanlar hangileri?', 'Ortak katlar 6’nın katlarıdır: sıra mod 6 = 0.'],
    basari: (iz) => `Oldu! Gübre alan saksılar: ${katCumlesi(iz, 6)} Bunlar 2’nin ve 3’ün ortak katlarıdır.`,
    soru: {
      metin: '2’nin ve 3’ün en küçük ortak katı kaç?',
      birim: '',
      cevap: (iz) => gubreYerleri(iz)[0],
      sonrasi: '6: hem 2 × 3 hem 3 × 2. Ortak katlar 6, 12, 18 … diye gider.',
      yonlendirme: 'İlk gübre alan saksının numarasına bak.',
    },
    kazanimlar: ['MAT.6.1.4', 'MAT.6.1.1'],
    degiskenler: ['sıra'],
  },
  {
    id: 's6-kat-4',
    tur: 'hata',
    baslik: 'Geç sayan sayaç',
    yonerge: 'Bu kod 3’ün katı olan saksılara gübre vermek istiyor ama ilk saksıda yanılıyor. Hatayı bul, düzelt.',
    dunya: KAT_3_UZUN,
    hedef: GUBRE_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: KAT_KUTUSU,
    baslangic: k([['ata', 'sıra', 0], 'ileri', ['kadar', 'cikistayim', [['eger', [['sıra', 'mod', 3], '=', 0], ['gubreVer']], ['ata', 'sıra', ['sıra', '+', 1]], 'ileri']]], 's6k4h-'),
    cozum: katKodu(3, 's6k4-'),
    ipuclari: ['Robot 1. saksıdayken sıra kaç? 0 mod 3 kaç eder?', 'sıra önce artmalı, sonra karşılaştırılmalı: "sıra ← sıra + 1" bloğunu "eğer"in üstüne taşı.'],
    basari: (iz) => `Buldun! Önce say, sonra karar ver. Gübre alan saksılar: ${liste(gubreYerleri(iz))}.`,
    kazanimlar: ['MAT.6.1.1', 'MAT.6.1.2'],
    degiskenler: ['sıra'],
  },
  {
    id: 's6-kat-5',
    tur: 'kurgu',
    zorlu: true,
    baslik: 'Katı değilse sula',
    yonerge: 'Bu serada 3’ün katı olmayan saksıların toprağı kuru. Robot 3’ün katlarına gübre versin, ötekileri sulasın. "değilse" kolunu kullan.',
    dunya: KAT_SULA,
    hedef: { kurulariSula: true, sarilariGubrele: true, cikistaBitir: true },
    bitkiAdi: 'saksı',
    aracKutusu: KAT_KUTUSU_2,
    baslangic: 'onceki',
    cozum: k([['ata', 'sıra', 0], 'ileri', ['kadar', 'cikistayim', [['ata', 'sıra', ['sıra', '+', 1]], ['eger', [['sıra', 'mod', 3], '=', 0], ['gubreVer'], ['sula']], 'ileri']]], 's6k5-'),
    ipuclari: ['Her saksıda iki yol var: 3’ün katıysa gübre, değilse su.', '"eğer … ise … değilse" bloğunu kullan: "gübre ver" üst kola, "sula" "değilse" koluna.'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! ${o.gubre} saksı gübre, ${o.sulama} saksı su aldı: ${o.gubre} + ${o.sulama} = ${o.gubre + o.sulama} saksı.`;
    },
    kazanimlar: ['MAT.6.1.1', 'MAT.6.1.2'],
    degiskenler: ['sıra'],
  },
];

// ---------------------------------------------------------------------------
// 3. Örüntü ve genel terim
// ---------------------------------------------------------------------------

const TERIM_KUTUSU: BlokSablonu[] = [
  ILERI,
  KOY,
  { tur: 'tekrarlaKez', kez: 3 },
  { tur: 'tekrarlaKez', kez: 1, kezIfade: ifadeKur([[2, '×', 'i'], '-', 1]) },
  { tur: 'tekrarlaKez', kez: 1, kezIfade: ifadeKur([2, '×', 'i']) },
  { tur: 'ata', degisken: 'i', ifade: ifadeKur(1) },
  { tur: 'ata', degisken: 'i', ifade: ifadeKur(['i', '+', 1]) },
];
const TERIM_KUTUSU_2: BlokSablonu[] = [
  ...TERIM_KUTUSU,
  { tur: 'ata', degisken: 'toplam', ifade: ifadeKur(0) },
  { tur: 'ata', degisken: 'toplam', ifade: ifadeKur(['toplam', '+', [[2, '×', 'i'], '-', 1]]) },
];
const KULE_HEDEFI: Hedef = { yapiyiKur: true, cikistaBitir: false };

/** i ← bas; 3 kez [ileri; genel terim kez küp koy; i ← i + 1] */
const terimKodu = (bas: number, terim: IfadeKisa, onek: string) =>
  k([['ata', 'i', bas], ['kez', 3, ['ileri', ['kez', terim, ['koy']], ['ata', 'i', ['i', '+', 1]]]]], onek);
/** Tek sayıların genel terimi */
const TEK: IfadeKisa = [[2, '×', 'i'], '-', 1];

const KULE_135 = insaatAlani('s6-terim-d1', 'Tek sayı kuleleri', ['B135']);
const KULE_246 = insaatAlani('s6-terim-d2', 'Çift sayı kuleleri', ['B246']);
const KULE_135_B = insaatAlani('s6-terim-d3', 'Yeniden tek sayılar', ['B135']);
const KULE_135_C = insaatAlani('s6-terim-d4', 'Sıfırdan başlayan i', ['B135']);
const KULE_135_D = insaatAlani('s6-terim-d5', 'Küpleri say', ['B135']);

const TERIM_TAHMIN_KODU = terimKodu(0, [[2, '×', 'i'], '+', 1], 's6t4-');

const TERIM_GOREVLERI: Gorev[] = [
  {
    id: 's6-terim-1',
    tur: 'yaz',
    baslik: 'Tek sayı kuleleri',
    yonerge: 'Dron 1, 3 ve 5 küplük kuleler kuracak. i kulenin sırası olsun (1, 2, 3). i. kuleye 2 × i − 1 küp koysun.',
    dunya: KULE_135,
    hedef: KULE_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: TERIM_KUTUSU,
    baslangic: 'bos',
    cozum: terimKodu(1, TEK, 's6t1-'),
    ipuclari: [
      'Birinci kulede i = 1: 2 × 1 − 1 = 1 küp. İkincide i = 2: 2 × 2 − 1 = 3 küp.',
      '"i ← 1" ile başla. Her kulede: ileri git, "2 × i − 1 kez tekrarla" içinde küp koy, "i ← i + 1".',
      'Üç kule var: bu blokları "3 kez tekrarla" içine koy.',
    ],
    basari: (iz) => {
      const h = kuleler(iz);
      return `Oldu! i = ${liste(h.map((_, j) => j + 1))} için 2 × i − 1 = ${liste(h)} küp. Genel terim: 2 × i − 1.`;
    },
    soru: {
      metin: 'Bu kurala göre 20. kule kaç küp olur?',
      birim: 'küp',
      cevap: () => 2 * 20 - 1,
      sonrasi: '2 × 20 − 1 = 39. Genel terimle 20. kuleyi saymadan bulduk.',
      yonlendirme: 'Genel terimde i yerine 20 koy: 2 × 20 − 1.',
    },
    kazanimlar: ['MAT.6.2.2', 'MAT.6.2.3'],
    degiskenler: ['i'],
  },
  {
    id: 's6-terim-2',
    tur: 'kurgu',
    baslik: 'Çift sayı kuleleri',
    yonerge: 'Bu kez kuleler 2, 4 ve 6 küp. Genel terimi bul, kodunu düzelt.',
    dunya: KULE_246,
    hedef: KULE_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: TERIM_KUTUSU,
    baslangic: 'onceki',
    cozum: terimKodu(1, [2, '×', 'i'], 's6t2-'),
    ipuclari: ['Her kule, tek sayı kulesinden 1 fazla. i. kule kaç küp?', 'Çift sayıların genel terimi 2 × i. Araç kutusundaki "2 × i kez tekrarla" bloğunu kullan.'],
    basari: (iz) => `Oldu! 2 × i = ${liste(kuleler(iz))} küp: çift sayılar.`,
    soru: {
      metin: 'Bu kurala göre 15. kule kaç küp olur?',
      birim: 'küp',
      cevap: () => 2 * 15,
      sonrasi: '2 × 15 = 30.',
      yonlendirme: 'Genel terimde i yerine 15 koy.',
    },
    kazanimlar: ['MAT.6.2.2', 'MAT.6.2.3'],
    degiskenler: ['i'],
  },
  {
    id: 's6-terim-3',
    tur: 'hata',
    baslik: 'Sıfırdan başlayan i',
    yonerge: 'Bu kod 1, 3, 5 küplük kuleleri kurmak istiyor ama hemen duruyor. Hatayı bul, düzelt.',
    dunya: KULE_135_B,
    hedef: KULE_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: TERIM_KUTUSU,
    baslangic: terimKodu(0, TEK, 's6t3h-'),
    cozum: terimKodu(1, TEK, 's6t3-'),
    ipuclari: ['Birinci kulede i kaç? 2 × 0 − 1 kaç eder?', 'Birinci kule i = 1 olmalı: "i ← 0" bloğundaki 0’ı 1 yap.'],
    basari: (iz) => `Buldun! i 1’den başlayınca 2 × i − 1 = ${liste(kuleler(iz))}.`,
    kazanimlar: ['MAT.6.2.2', 'MAT.6.2.3'],
    degiskenler: ['i'],
  },
  {
    id: 's6-terim-4',
    tur: 'tahmin',
    baslik: 'Başka bir formül',
    yonerge: 'Bu kodda i 0’dan başlıyor ve genel terim 2 × i + 1. Kodu oku, sonra çalıştır.',
    dunya: KULE_135_C,
    hedef: KULE_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: TERIM_KUTUSU,
    baslangic: TERIM_TAHMIN_KODU,
    cozum: TERIM_TAHMIN_KODU,
    ipuclari: ['i = 0, 1, 2 için 2 × i + 1 kaç eder?', 'Üç kulenin küplerini topla.'],
    basari: (iz) => `i = 0, 1, 2 için 2 × i + 1 = ${liste(kuleler(iz))}: ${kuleler(iz).join(' + ')} = ${izOzeti(iz).kup} küp. Yine tek sayılar!`,
    tahmin: {
      metin: 'Dron toplam kaç küp koyacak?',
      birim: 'küp',
      cevap: (iz) => izOzeti(iz).kup,
      sonrasi: '1 + 3 + 5 = 9 küp.',
      yonlendirme: 'i = 0 iken 2 × 0 + 1 = 1 küp; sonra i = 1 ve i = 2.',
    },
    soru: {
      metin: 'Bu kodla 20. kule kaç küp olur? (20. kulede i = 19)',
      birim: 'küp',
      cevap: () => 2 * 19 + 1,
      sonrasi: '2 × 19 + 1 = 39: 2 × 20 − 1 ile aynı. i nereden başlarsa formül ona göre değişir.',
      yonlendirme: 'i yerine 19 koy: 2 × 19 + 1.',
    },
    kazanimlar: ['MAT.6.2.2', 'MAT.6.2.3'],
    degiskenler: ['i'],
  },
  {
    id: 's6-terim-5',
    tur: 'kurgu',
    zorlu: true,
    baslik: 'Küpleri topla',
    yonerge: 'Kuleleri kurarken dron kullandığı küpleri toplam değişkeninde toplasın. Program bitince toplam, bütün küplerin sayısı olmalı.',
    dunya: KULE_135_D,
    hedef: { yapiyiKur: true, cikistaBitir: false, degiskenler: { toplam: 9 } },
    bitkiAdi: 'bitki',
    aracKutusu: TERIM_KUTUSU_2,
    baslangic: 'onceki',
    cozum: k(
      [
        ['ata', 'i', 1],
        ['ata', 'toplam', 0],
        ['kez', 3, ['ileri', ['kez', [[2, '×', 'i'], '-', 1], ['koy']], ['ata', 'toplam', ['toplam', '+', [[2, '×', 'i'], '-', 1]]], ['ata', 'i', ['i', '+', 1]]]],
      ],
      's6t5-'
    ),
    ipuclari: ['Başta toplam 0. Her kulede o kulenin küp sayısı toplama eklenir.', '"toplam ← toplam + (2 × i − 1)" bloğunu i artmadan önce koy. Kodunda genel terim 2 × i + 1 ise işareti ona göre değiştir.'],
    basari: (iz) => `Oldu! toplam = ${kuleler(iz).join(' + ')} = ${deger(iz, 'toplam')} = ${kuleler(iz).length} × ${kuleler(iz).length}.`,
    soru: {
      metin: 'İlk 4 tek sayının toplamı kaç? (1 + 3 + 5 + 7)',
      birim: '',
      cevap: () => 1 + 3 + 5 + 7,
      sonrasi: '16 = 4 × 4. İlk n tek sayının toplamı n × n.',
      yonlendirme: '1 + 3 + 5 = 9; buna 7 ekle.',
    },
    kazanimlar: ['MAT.6.2.2', 'MAT.6.2.3'],
    degiskenler: ['i', 'toplam'],
  },
];

// ---------------------------------------------------------------------------
// 4. En büyüğü bul
// ---------------------------------------------------------------------------

const EN_KUTUSU: BlokSablonu[] = [
  ILERI,
  TOPLA,
  CIKISA_KADAR,
  { tur: 'eger', kosul: kosulKur(['@kutle', '>', 'enBüyük']) },
  { tur: 'ata', degisken: 'enBüyük', ifade: ifadeKur(0) },
  { tur: 'ata', degisken: 'enBüyük', ifade: ifadeKur('@kutle') },
];
const EN_KUTUSU_2: BlokSablonu[] = [
  ...EN_KUTUSU,
  { tur: 'eger', kosul: kosulKur(['@kutle', '<', 'enKüçük']) },
  { tur: 'ata', degisken: 'enKüçük', ifade: ifadeKur(0) },
  { tur: 'ata', degisken: 'enKüçük', ifade: ifadeKur('@kutle') },
];
const enHedefi = (g: number): Hedef => ({ cikistaBitir: true, degiskenler: { enBüyük: g } });
/** enBüyük ← 0; ileri; çıkışa kadar [eğer kütle > enBüyük ise enBüyük ← kütle; ileri] */
const enBuyukKodu = (bas: number, onek: string) =>
  k([['ata', 'enBüyük', bas], 'ileri', ['kadar', 'cikistayim', [['eger', ['@kutle', '>', 'enBüyük'], [['ata', 'enBüyük', '@kutle']]], 'ileri']]], onek);
/** "0 → 120 → 150 → 180" */
const degisim = (iz: Iz, ad: string) => degerleri(iz, ad).join(' → ');

const EN_SIRA: DunyaTanimi = { id: 's6-en-d1', ad: 'Tartılacak domatesler', bitkiler: domatesSirasi('K120 Y90 K150 K180 Y110 K130') };
const EN_UZUN: DunyaTanimi = { id: 's6-en-d2', ad: 'Uzun sıra', bitkiler: domatesSirasi('K210 Y140 K90 K160 Y200 K120 K150 Y170') };
const EN_BUYUK_BAS: DunyaTanimi = { id: 's6-en-d3', ad: 'Beş domates', bitkiler: domatesSirasi('K140 Y160 K110 K190 Y130') };
const EN_TERS: DunyaTanimi = { id: 's6-en-d4', ad: 'Altı domates', bitkiler: domatesSirasi('K150 K200 Y80 K170 Y230 K120') };
const EN_TAHMIN: DunyaTanimi = { id: 's6-en-d5', ad: 'Rekor sırası', bitkiler: domatesSirasi('K100 K140 Y120 K160 K150 Y190') };
const EN_KUCUK: DunyaTanimi = { id: 's6-en-d6', ad: 'En hafif domates', bitkiler: domatesSirasi('K160 Y130 K210 K90 Y150 K120') };

const EN_TAHMIN_KODU = enBuyukKodu(0, 's6e5-');

const EN_GOREVLERI: Gorev[] = [
  {
    id: 's6-en-1',
    tur: 'yaz',
    baslik: 'En ağır domates',
    yonerge: 'Robot sıradaki bütün domatesleri tartsın ve en ağırının kütlesini enBüyük değişkeninde tutsun. Daha ağırını görünce enBüyük değişsin.',
    dunya: EN_SIRA,
    hedef: enHedefi(180),
    bitkiAdi: 'bitki',
    aracKutusu: EN_KUTUSU,
    baslangic: 'bos',
    cozum: enBuyukKodu(0, 's6e1-'),
    ipuclari: [
      'Başta henüz domates tartılmadı: "enBüyük ← 0" ile başla.',
      'Her domateste karşılaştır: kütle enBüyük’ten büyükse enBüyük ← kütle.',
      'Tarama kodunu hatırla: ileri git; çıkışa kadar tekrarla: karşılaştır, ileri git.',
    ],
    basari: (iz) => `Oldu! Robot ${iz.son.bitkiler.length} domatesi tarttı. enBüyük: ${degisim(iz, 'enBüyük')}. En ağır domates ${deger(iz, 'enBüyük')} gram.`,
    kazanimlar: ['MAT.6.5.1'],
    degiskenler: ['enBüyük'],
    olcumler: ['kutle'],
  },
  {
    id: 's6-en-2',
    tur: 'kurgu',
    genelleme: true,
    baslik: 'Başka bir sıra',
    yonerge: 'Bu sırada en ağır domates en başta. Kodun burada da doğru buluyor mu? Çalıştır, gerekirse düzelt.',
    dunya: EN_UZUN,
    hedef: enHedefi(210),
    bitkiAdi: 'bitki',
    aracKutusu: EN_KUTUSU,
    baslangic: 'onceki',
    cozum: enBuyukKodu(0, 's6e2-'),
    ipuclari: ['Kodun domatesleri bilmeden çalışmalı: her domatesi o ana kadarki en büyükle karşılaştırıyor mu?'],
    basari: (iz) =>
      degerleri(iz, 'enBüyük').length <= 2
        ? `Oldu! enBüyük: ${degisim(iz, 'enBüyük')}. İlk domatesten sonra hiç değişmedi, çünkü ondan ağırı yok.`
        : `Oldu! enBüyük: ${degisim(iz, 'enBüyük')}. En ağır domates ${deger(iz, 'enBüyük')} gram.`,
    soru: {
      metin: 'En ağır domates en hafifinden kaç gram ağır?',
      birim: 'gram',
      cevap: (iz) => Math.max(...kutleler(iz)) - Math.min(...kutleler(iz)),
      sonrasi: '210 − 90 = 120 gram. Bu farka verinin açıklığı denir.',
      yonlendirme: 'En hafif domates 90 gram. En ağırdan çıkar.',
    },
    kazanimlar: ['MAT.6.5.1'],
    degiskenler: ['enBüyük'],
    olcumler: ['kutle'],
  },
  {
    id: 's6-en-3',
    tur: 'hata',
    baslik: 'Çok büyük başlangıç',
    yonerge: 'Bu kod en ağır domatesi bulamıyor; enBüyük hiç değişmiyor. Hatayı bul, düzelt.',
    dunya: EN_BUYUK_BAS,
    hedef: enHedefi(190),
    bitkiAdi: 'bitki',
    aracKutusu: EN_KUTUSU,
    baslangic: enBuyukKodu(1000, 's6e3h-'),
    cozum: enBuyukKodu(0, 's6e3-'),
    ipuclari: ['Hangi domates 1000 gramdan ağır olabilir?', 'Başlangıç değeri bütün domateslerden küçük olmalı: 1000’i 0 yap.'],
    basari: (iz) => `Buldun! enBüyük 0’dan başlayınca her ağır domateste değişti: ${degisim(iz, 'enBüyük')}.`,
    kazanimlar: ['MAT.6.5.1'],
    degiskenler: ['enBüyük'],
    olcumler: ['kutle'],
  },
  {
    id: 's6-en-4',
    tur: 'hata',
    baslik: 'Ters karşılaştırma',
    yonerge: 'Bu kod ilk domatesle başlıyor ama en ağırını değil, başka bir domatesi buluyor. Hatayı bul, düzelt.',
    dunya: EN_TERS,
    hedef: enHedefi(230),
    bitkiAdi: 'bitki',
    aracKutusu: EN_KUTUSU,
    baslangic: k(['ileri', ['ata', 'enBüyük', '@kutle'], ['kadar', 'cikistayim', [['eger', ['@kutle', '<', 'enBüyük'], [['ata', 'enBüyük', '@kutle']]], 'ileri']]], 's6e4h-'),
    cozum: k(['ileri', ['ata', 'enBüyük', '@kutle'], ['kadar', 'cikistayim', [['eger', ['@kutle', '>', 'enBüyük'], [['ata', 'enBüyük', '@kutle']]], 'ileri']]], 's6e4-'),
    ipuclari: ['Program bitince enBüyük hangi domatesin kütlesi oldu? En ağırı mı, en hafifi mi?', 'Karşılaştırmadaki < işaretine dokun, > yap.'],
    basari: (iz) => `Buldun! "kütle > enBüyük" daha ağırını arar: ${degisim(iz, 'enBüyük')}.`,
    kazanimlar: ['MAT.6.5.1'],
    degiskenler: ['enBüyük'],
    olcumler: ['kutle'],
  },
  {
    id: 's6-en-5',
    tur: 'tahmin',
    baslik: 'Kaç kez değişir?',
    yonerge: 'Kodu oku. Kütleler sırayla 100, 140, 120, 160, 150 ve 190 gram. enBüyük her yeni rekorda değişir.',
    dunya: EN_TAHMIN,
    hedef: enHedefi(190),
    bitkiAdi: 'bitki',
    aracKutusu: EN_KUTUSU,
    baslangic: EN_TAHMIN_KODU,
    cozum: EN_TAHMIN_KODU,
    ipuclari: ['Her domateste sor: şimdiye kadarkilerin hepsinden ağır mı?'],
    basari: (iz) => `enBüyük: ${degisim(iz, 'enBüyük')}. Baştaki 0’dan sonra ${degerleri(iz, 'enBüyük').length - 1} kez değişti.`,
    tahmin: {
      metin: 'enBüyük, baştaki 0’dan sonra kaç kez değişecek?',
      birim: 'kez',
      cevap: (iz) => degerleri(iz, 'enBüyük').length - 1,
      sonrasi: '100, 140, 160 ve 190: dört rekor.',
      yonlendirme: '120 ve 150 kendilerinden önceki bir domatesten hafif; onlarda değişmez.',
    },
    kazanimlar: ['MAT.6.5.1'],
    degiskenler: ['enBüyük'],
    olcumler: ['kutle'],
  },
  {
    id: 's6-en-6',
    tur: 'kurgu',
    zorlu: true,
    baslik: 'En hafif domates',
    yonerge: 'Şimdi en hafif domatesi bul: kütlesi enKüçük değişkeninde kalsın. Başlangıç değerini iyi seç.',
    dunya: EN_KUCUK,
    hedef: { cikistaBitir: true, degiskenler: { enKüçük: 90 } },
    bitkiAdi: 'bitki',
    aracKutusu: EN_KUTUSU_2,
    baslangic: 'onceki',
    cozum: k([['ata', 'enKüçük', 1000], 'ileri', ['kadar', 'cikistayim', [['eger', ['@kutle', '<', 'enKüçük'], [['ata', 'enKüçük', '@kutle']]], 'ileri']]], 's6e6-'),
    ipuclari: ['En küçüğü ararken karşılaştırma nasıl değişir?', 'Başlangıç değeri bütün domateslerden büyük olmalı: "enKüçük ← 0" bloğundaki 0’ı 1000 yap.'],
    basari: (iz) => `Oldu! enKüçük: ${degisim(iz, 'enKüçük')}. En hafif domates ${deger(iz, 'enKüçük')} gram.`,
    kazanimlar: ['MAT.6.5.1'],
    degiskenler: ['enBüyük', 'enKüçük'],
    olcumler: ['kutle'],
  },
];

// ---------------------------------------------------------------------------
// Üniteler
// ---------------------------------------------------------------------------

const ORTAK = { sinif: 6, kademe: 'Mühendis adası', gorunum: 'blok' as const, sesliYonerge: false };

export const SINIF6: readonly Unite[] = [
  {
    ...ORTAK,
    id: 's6-formul',
    no: 1,
    ad: 'Formüllü algoritma',
    tema: 'Sera',
    yeniKavram: 'Tekrar sayısı bir cebirsel ifade: n, 2 × n, 2 × n + 1',
    oncedenBilinen: 'Değişken ve sayaç (5. sınıf)',
    kalip: 'formul',
    kazanimlar: ['MAT.6.2.3', 'MAT.6.2.1'],
    sure: '1 ders saati',
    gorevler: FORMUL_GOREVLERI,
    fissiz: {
      ad: 'n kişilik sıra',
      amac: 'Aynı programın farklı n değerlerinde çalıştığını ve adım sayısının bir formülle yazılabildiğini görmek.',
      sure: '15 dakika',
      roller: ['Bir öğrenci robot olur.', 'Bir öğrenci n kartını tutar ve sayıyı değiştirir.', 'Sınıf programcıdır ve adımları sayar.'],
      adimlar: [
        'Yere n saksı kartı dizin; tahtaya "n = 5" yazın.',
        'Programcılar kartları dizer: n kez tekrarla (ileri, sula), sonra ileri.',
        'Robot programı uygular; sınıf adımları sayar ve tahtaya "n = 5 → 6 adım" yazar.',
        'n değişir (3, 8); program aynı kalır. Tablo büyür; sınıf adım sayısının kuralını (n + 1) bulur.',
        'Saksılar ikişerli dizilir (nemli, kuru). Sınıf yeni formülü söyler: 2 × n + 1.',
      ],
      hazirlik: 'Saksı kartlarını kesin. Tahtaya n, adım ve su için üç sütunlu bir tablo çizin.',
      kartlar: [
        { komut: 'DEĞİŞKEN', aciklama: 'n: saksı sayısı. Öğretmen değerini değiştirir.', adet: 1 },
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları n (ya da 2 × n) kez uygula.', adet: 1 },
        { komut: 'İŞLEM', aciklama: 'Formülü hesapla: 2 × n + 1 gibi.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir saksı ileri git.', adet: 2 },
        { komut: 'SULA', aciklama: 'Önündeki saksıyı sula.', adet: 1 },
        { komut: 'EĞER', aciklama: 'Toprak kuruysa içteki kartı uygula.', adet: 1 },
      ],
      saksiKartlari: 'N K N K N K N K',
    },
    ogretmenNotu: {
      hedef: 'Öğrenci tekrar sayısını sayıyla değil bir cebirsel ifadeyle yazar; aynı kodu farklı n değerlerinde sınar ve adım, su gibi nicelikleri n cinsinden yorumlar.',
      dersler: [
        { baslik: '1 ders', metin: 'Fişsiz "n kişilik sıra" (15 dk), ardından 1–2. görevler (n kez; n değişince). 3. görev ikişerli. 4. görevde 2 × n, 5. görevde önce tahmin: 2 × n + 1.' },
      ],
      yanilgilar: [
        { ad: 'Bir fazla tur', metin: 'Çıkışa varmak için tekrarı n + 1 yapmak; son turda robot çıkışı sular (3. görev). Tur sayısı ile adım sayısı ayrı düşünülmeli.' },
        { ad: 'Sayıyı ezberlemek', metin: 'n yerine sahnedeki sayıyı yazmak (5 kez). 2. görevde n = 8 olunca kod bozulur.' },
        { ad: 'İşlem önceliği', metin: '2 × n + 1’i 2 × (n + 1) gibi hesaplamak. 5. görevin tahmini bunu ortaya çıkarır: 11, 12 değil.' },
      ],
      sorular: [
        'Kodda 5 yazmak ile n yazmak arasındaki fark nedir?',
        'n = 100 olsaydı robot kaç adım atardı? Çalıştırmadan nasıl bildiniz?',
        'Robot neden n + 1 adım atıyor ama n saksı suluyor?',
        '2 × n + 1 ile 2 × (n + 1) aynı mı?',
      ],
      celdiriciler: 'Araç kutusundaki sayılı "5 kez tekrarla" ilk serada çalışır; n değişince bozulur. 4. görevde "n kez tekrarla" da yetmez: 2 × n saksı vardır.',
    },
  },
  {
    ...ORTAK,
    id: 's6-katlar',
    no: 2,
    ad: 'Katlar ve bölünebilme',
    tema: 'Sera',
    yeniKavram: 'Bölünebilme koşulu: sıra mod k = 0',
    oncedenBilinen: 'Sayaç (5. sınıf), "eğer … ise" (3. sınıf)',
    kalip: 'katlari',
    kazanimlar: ['MAT.6.1.1', 'MAT.6.1.2', 'MAT.6.1.4'],
    sure: '1 ders saati',
    gorevler: KAT_GOREVLERI,
    fissiz: {
      ad: 'Kalan oyunu',
      amac: 'Bir sayının k’ya bölümünden kalanın 0 olmasının "k’nın katı" demek olduğunu oyunla yaşamak.',
      sure: '10 dakika',
      roller: ['Sınıf sırayla sayar; her öğrenci bir sayı söyler.', 'Bir öğrenci hakem olur; kalanı denetler.'],
      adimlar: [
        'Sınıf 1’den başlayarak sırayla sayar.',
        'Kural: sayı 3’e kalansız bölünüyorsa öğrenci sayı yerine "gübre!" der.',
        'Kural değişir: her 4. sayı. Sonra hem 2’nin hem 3’ün katı olan sayılar.',
        'Hakem soruyu sorar: "Hem 2’nin hem 3’ün katı olan sayılar hangi sayının katı?"',
        'Tahtada program kurulur: sıra ← sıra + 1; eğer sıra mod 3 = 0 ise gübre ver.',
      ],
      hazirlik: 'Hazırlık gerekmez. İsterseniz tahtaya 1–30 sayı şeridi yazıp katları renkli kalemle işaretleyin.',
      kartlar: [
        { komut: 'DEĞİŞKEN', aciklama: 'sıra ← sıra + 1: sayıyı 1 artır.', adet: 1 },
        { komut: 'İŞLEM', aciklama: 'sıra mod 3: 3’e bölümden kalanı bul.', adet: 1 },
        { komut: 'EĞER', aciklama: 'Kalan 0 ise içteki kartı uygula.', adet: 1 },
        { komut: 'DEĞİLSE', aciklama: 'Kalan 0 değilse bu kartı uygula.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir saksı ileri git.', adet: 1 },
        { komut: 'ÇIKIŞA KADAR TEKRARLA', aciklama: 'Çıkışa varana kadar içteki kartları yeniden uygula.', adet: 1 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir sayacı "mod" ile birleştirip katları bulan algoritma yazar; kuralı 3’ten 4’e, ortak kat için 6’ya değiştirir ve sayacın ne zaman arttığının önemini görür.',
      dersler: [
        { baslik: '1 ders', metin: 'Fişsiz "Kalan oyunu" (10 dk), ardından 1–3. görevler (3’ün, 4’ün katları, ortak kat). 4. görev ikişerli. 5. görev zorlu: "değilse" kolu.' },
      ],
      yanilgilar: [
        { ad: 'Geç sayan sayaç', metin: 'Karar sayaç artmadan verilince her şey bir kayar: 1. saksıda sıra = 0 olur ve 0 mod 3 = 0 çıkar (4. görev). Önce say, sonra karar ver.' },
        { ad: 'Ortak katı toplamla karıştırmak', metin: '2’nin ve 3’ün ortak katı için 5’i (2 + 3) denemek. Ortak katlar 6’nın katlarıdır (3. görev).' },
        { ad: 'mod’u bölüm sanmak', metin: '"sıra mod 3" ifadesinin bölümü verdiğini sanmak; mod kalanı verir. Adım adım çalıştırınca karşılaştırmanın iki yanının değeri görünür.' },
      ],
      sorular: [
        '0 neden 3’ün katıdır? Bu 4. görevde neye yol açtı?',
        'Hem 2’nin hem 3’ün katı olan sayılar neden 6’nın katıdır?',
        '30 saksılık sırada kaç saksı 4’ün katıdır?',
        'Tek sayıları bulmak için hangi koşulu yazardınız?',
      ],
      celdiriciler: 'Araç kutusunda "yaprak sarıysa" koşulu bilerek yoktur: robot yaprağı göremez, yalnız sayabilir. Böylece katlar kuralı zorunlu olur.',
    },
  },
  {
    ...ORTAK,
    id: 's6-terim',
    no: 3,
    ad: 'Örüntü ve genel terim',
    tema: 'İnşaat alanı',
    yeniKavram: 'Genel terim: i. adımdaki değer (2 × i − 1)',
    oncedenBilinen: 'Değişkenle büyüyen tekrar (5. sınıf)',
    kalip: 'genel-terim',
    kazanimlar: ['MAT.6.2.2', 'MAT.6.2.3'],
    sure: '1 ders saati',
    gorevler: TERIM_GOREVLERI,
    fissiz: {
      ad: 'Kule tablosu',
      amac: 'Örüntünün her terimini sırasıyla (i) ilişkilendirip genel terimi bulmak.',
      sure: '15 dakika',
      roller: ['Gruplar küplerle kule kurar.', 'Bir öğrenci tabloya yazar: i ve küp sayısı.'],
      adimlar: [
        'Gruplar 1, 3, 5 küplük kuleleri kurar.',
        'Tabloya yazılır: i = 1 → 1, i = 2 → 3, i = 3 → 5.',
        'Sınıf sorar: "Küp sayısı i’nin iki katından ne kadar farklı?" Genel terim bulunur: 2 × i − 1.',
        'Genel terimle 10. ve 20. kule hesaplanır; kurulmadan bilinir.',
        'i 0’dan başlasaydı formül ne olurdu? Tablo yeniden yazılır: 2 × i + 1.',
      ],
      hazirlik: 'Küp, lego ya da şeker küpü hazırlayın. Tahtaya iki sütunlu bir tablo çizin: i ve küp sayısı.',
      kartlar: [
        { komut: 'DEĞİŞKEN', aciklama: 'i ← 1, sonra i ← i + 1: kulenin sırası.', adet: 2 },
        { komut: 'İŞLEM', aciklama: '2 × i − 1’i hesapla.', adet: 1 },
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları hesaplanan sayı kadar uygula.', adet: 2 },
        { komut: 'KÜP KOY', aciklama: 'Kuleye bir küp koy.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir sonraki kule yerine git.', adet: 1 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir örüntünün terimlerini sıra numarasıyla (i) ilişkilendirir, genel terimi cebirsel ifadeyle yazar ve kodda kullanır; genel terimden istenen terimi hesaplar.',
      dersler: [
        { baslik: '1 ders', metin: 'Fişsiz "Kule tablosu" (15 dk), ardından 1–2. görevler (tek ve çift sayı kuleleri); 3. görev ikişerli; 4. görevde önce tahmin. 5. görev zorlu: ilk n tek sayının toplamı.' },
      ],
      yanilgilar: [
        { ad: 'i’yi 0’dan başlatmak', metin: 'Genel terim 2 × i − 1 iken i ← 0 yazmak: birinci kule −1 küp olur ve dron durur (3. görev). Formül ile başlangıç birlikte düşünülmelidir.' },
        { ad: 'Yalnız farka bakmak', metin: 'Örüntü 2’şer arttığı için genel terimi "i + 2" sanmak. Tablo i ile küp sayısını yan yana gösterir.' },
        { ad: 'Terimi saymakla bulmak', metin: '20. terimi bulmak için bütün terimleri yazmak. Genel terim saymadan bulur (1. görev sorusu).' },
      ],
      sorular: [
        '2 × i − 1 ile 2 × i + 1 aynı kuleleri nasıl kurabiliyor?',
        '100. tek sayı kaçtır?',
        'Çift sayı kuleleri ile tek sayı kuleleri arasında nasıl bir ilişki var?',
        '1 + 3 + 5 + 7 + 9 kaçtır? Bir kare çizerek gösterebilir misiniz?',
      ],
      celdiriciler: 'Araç kutusunda iki genel terim bloğu vardır (2 × i − 1 ve 2 × i). Öğrenci kulelere bakıp doğrusunu seçmelidir.',
    },
  },
  {
    ...ORTAK,
    id: 's6-enbuyuk',
    no: 4,
    ad: 'En büyüğü bul',
    tema: 'Sera',
    yeniKavram: 'En büyük değeri tutan değişken ve karşılaştırma koşulu',
    oncedenBilinen: 'Toplayıcı (5. sınıf), karşılaştırma',
    kalip: 'en-buyuk',
    kazanimlar: ['MAT.6.5.1'],
    sure: '1 ders saati',
    gorevler: EN_GOREVLERI,
    fissiz: {
      ad: 'Şampiyon kartı',
      amac: 'En büyüğü bulmak için her yeni değeri şimdiye kadarki en büyükle karşılaştırmayı yaşamak.',
      sure: '10 dakika',
      roller: ['Öğrenciler sıraya dizilir; her birinin elinde bir sayı kartı (domatesin gramı) vardır.', 'Bir öğrenci şampiyon kartını taşır.'],
      adimlar: [
        'Şampiyon kartına başta 0 yazılır.',
        'Kartı taşıyan öğrenci sırayla herkese gider: "Seninki benimkinden büyük mü?"',
        'Büyükse şampiyon kartındaki sayı silinir, yenisi yazılır.',
        'Sıranın sonunda şampiyon kartındaki sayı en büyüktür. Kaç kez değiştiği sayılır.',
        'Kart 1000’le başlarsa ne olur? En küçüğü bulmak için ne değişmeli?',
      ],
      hazirlik: 'Öğrencilere 80–250 arası sayılar yazılı kartlar dağıtın. Şampiyon kartı için silinebilir bir tahta ya da kâğıt hazırlayın.',
      kartlar: [
        { komut: 'DEĞİŞKEN', aciklama: 'enBüyük ← 0: şampiyon kartına 0 yaz.', adet: 1 },
        { komut: 'BAK', aciklama: 'Önündekinin sayısına bak.', adet: 1 },
        { komut: 'KARAR', aciklama: 'Bu sayı enBüyük’ten büyük mü?', adet: 1 },
        { komut: 'DEĞİŞKEN', aciklama: 'enBüyük ← kütle: şampiyon kartına yeni sayıyı yaz.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Sıradaki kişiye geç.', adet: 1 },
        { komut: 'ÇIKIŞA KADAR TEKRARLA', aciklama: 'Sıra bitene kadar içteki kartları yeniden uygula.', adet: 1 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir veri dizisinde en büyük değeri bulan algoritmayı kurar; başlangıç değerinin ve karşılaştırma yönünün sonucu nasıl etkilediğini yorumlar, en büyük ile en küçükten açıklığı hesaplar.',
      dersler: [
        { baslik: '1 ders', metin: 'Fişsiz "Şampiyon kartı" (10 dk), ardından 1–2. görevler; 3–4. görevler ikişerli; 5. görevde önce tahmin. 6. görev zorlu: en küçüğü bulmak.' },
      ],
      yanilgilar: [
        { ad: 'Çok büyük başlangıç değeri', metin: 'enBüyük’ü 1000 gibi bir sayıyla başlatmak: hiçbir domates ondan ağır olmadığı için değer hiç değişmez (3. görev).' },
        { ad: 'Ters karşılaştırma', metin: '"kütle < enBüyük" yazmak: kod en hafifini bulur (4. görev: 80 gram). Karşılaştırmanın yönü neyi aradığımızı belirler.' },
        { ad: 'Yalnız komşuyla karşılaştırmak', metin: 'Her domatesi yalnız bir öncekiyle karşılaştırmak. Kod her domatesi şimdiye kadarki en büyükle karşılaştırır (5. görevin tahmini).' },
      ],
      sorular: [
        'enBüyük neden 0’dan başlıyor? Domatesler eksi gram olabilseydi ne olurdu?',
        'En hafifi bulmak için hangi iki şeyi değiştirdiniz?',
        'enBüyük’ü ilk domatesin kütlesiyle başlatmak neden de doğru bir yol?',
        'Açıklık (en büyük − en küçük) bize veri hakkında ne söyler?',
      ],
      celdiriciler: 'Araç kutusundaki "topla" bloğu gerekmez: domatesler yalnız tartılır. Toplayan öğrenci ham domateste durur ve tartmanın toplamaktan ayrı olduğunu görür.',
    },
  },
];
