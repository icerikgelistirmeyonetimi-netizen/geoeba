/**
 * Algoritma Laboratuvarı — 7. sınıf (Araştırma adası): dört ünite.
 *
 * Kod paneli üç gösterim sunar: Bloklar · Sözde kod · Akış şeması (düzenleme bloklarda, ötekiler canlı
 * ayna). Okuma görevleri (tahmin, hatayı bul) akış şeması ya da sözde kodla açılır. Değişkenler ve
 * karşılaştırmalar 5–6. sınıftan bilinir; bu sınıfta algoritma denklem, eşitsizlik, hacim ve yansıma
 * düşüncesine bağlanır. Başarı cümlelerindeki sayılar izden hesaplanır. Kazanımlar TYMM listesindendir.
 *
 *   1. Algoritmayı ifade et   aynı algoritma: adım adım yazı, sözde kod, akış şeması   MAT.7.2.4
 *   2. Denklem ve eşitsizlik  depo yettiği sürece sula (2x ≤ 18, 2x + 3 = 15)          MAT.7.2.2 · 7.2.4
 *   3. Küplerle prizma        iç içe üç döngü; hacim = en × boy × yükseklik; görünümler MAT.7.4.3 · 7.4.4 · 7.4.1
 *   4. Yansıma                kalemi kaldır, aynadaki başlangıca git, dönüşleri çevir   MAT.7.3.1
 */
import { ifadeKur, kosulKur, programKur, sayiMetni, type BlokSablonu, type EylemTuru, type KisaBlok } from './program';
import { domatesSirasi, insaatAlani, saha, saksiSirasi, type DunyaTanimi, type Hedef } from './dunya';
import { izOzeti, type Iz } from './yorumlayici';
import type { Gorev, Unite } from './gorev';

const E = (eylem: EylemTuru): BlokSablonu => ({ tur: 'eylem', eylem });
const ILERI = E('ileri');
const SAGA = E('sagaDon');
const SOLA = E('solaDon');
const SULA = E('sula');
const TOPLA = E('topla');
const KOY = E('koy');
const KALDIR = E('kalemKaldir');
const INDIR = E('kalemIndir');
const TEKRAR: BlokSablonu = { tur: 'tekrarlaKez', kez: 2 };
const CIKISA_KADAR: BlokSablonu = { tur: 'tekrarlaKadar', kosul: 'cikistayim' };

const k = (liste: KisaBlok[], onek: string) => programKur(liste, onek);
const ORTAK = { sinif: 7, kademe: 'Araştırma adası', gorunum: 'ifade' as const, sesliYonerge: false };

/** Programın bitişindeki değişken değeri (tanımsızsa 0) */
const deger = (iz: Iz, ad: string) => izOzeti(iz).degiskenler[ad] ?? 0;

// ---------------------------------------------------------------------------
// 1. Algoritmayı ifade et
// ---------------------------------------------------------------------------

const SERA_SULAMA: DunyaTanimi = { id: 's7-sera-sulama', ad: 'Sera', sinar: '5 kuru saksı, 20 litre', bitkiler: saksiSirasi('K N K K N K N K'), depo: 20 };
const HASAT_SIRA: DunyaTanimi = { id: 's7-hasat-sira', ad: 'Domates sırası', sinar: '5 olgun, 3 ham', bitkiler: domatesSirasi('K Y K K Y K K Y') };
const HASAT_UZUN: DunyaTanimi = { id: 's7-hasat-uzun', ad: 'Uzun domates sırası', sinar: '8 olgun, 4 ham', bitkiler: domatesSirasi('K K Y K Y Y K K K Y K K') };
const HASAT_HATA: DunyaTanimi = { id: 's7-hasat-hata', ad: 'Yedi fide', sinar: '4 olgun, 3 ham; sıra hamla biter', bitkiler: domatesSirasi('Y K K Y K K Y') };

const SULAMA_KODU = k([['kadar', 'cikistayim', ['ileri', ['eger', 'toprakKuru', ['sula']]]]], 's7i1-');
const hasatKodu = (onek: string) =>
  k([['ata', 'olgun', 0], ['ata', 'ham', 0], 'ileri', ['kadar', 'cikistayim', [['eger', 'domatesKirmizi', ['topla', ['ata', 'olgun', ['olgun', '+', 1]]], [['ata', 'ham', ['ham', '+', 1]]]], 'ileri']]], onek);
/** Hata: "ileri git" döngünün başında → son turda robot çıkışta da bakar, çıkışı ham sayar */
const HASAT_BIR_FAZLA = k([['ata', 'olgun', 0], ['ata', 'ham', 0], ['kadar', 'cikistayim', ['ileri', ['eger', 'domatesKirmizi', ['topla', ['ata', 'olgun', ['olgun', '+', 1]]], [['ata', 'ham', ['ham', '+', 1]]]]]]], 's7i4h-');

const HASAT_ARACLARI: BlokSablonu[] = [
  ILERI,
  TOPLA,
  CIKISA_KADAR,
  { tur: 'eger', kosul: 'domatesKirmizi', degilse: true },
  { tur: 'ata', degisken: 'olgun', ifade: ifadeKur(0) },
  { tur: 'ata', degisken: 'olgun', ifade: ifadeKur(['olgun', '+', 1]) },
  { tur: 'ata', degisken: 'ham', ifade: ifadeKur(0) },
  { tur: 'ata', degisken: 'ham', ifade: ifadeKur(['ham', '+', 1]) },
  { tur: 'tekrarlaKez', kez: 8 },
];

const hasatHedefi = (olgun: number, ham: number): Hedef => ({ kirmizilariTopla: true, cikistaBitir: true, degiskenler: { olgun, ham } });

const IFADE_GOREVLERI: Gorev[] = [
  {
    id: 's7-ifade-1',
    tur: 'tahmin',
    baslik: 'Akış şemasını oku',
    yonerge: 'Kod panelinde akış şeması açık. Robotun yolunu oklarla izle: çıkışa varınca depoda kaç litre su kalır? Önce tahmin et, sonra çalıştır.',
    ilkGorunum: 'akis',
    dunya: SERA_SULAMA,
    hedef: { kurulariSula: true, cikistaBitir: true },
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA, CIKISA_KADAR, { tur: 'eger', kosul: 'toprakKuru' }],
    baslangic: SULAMA_KODU,
    cozum: SULAMA_KODU,
    ipuclari: [
      'Eşkenar dörtgen bir karardır. Geri dönen ok döngüdür: robot her saksıda karara yeniden gelir.',
      'Kaç saksıda "evet" kolu çalışır? Kuru saksıları say; her sulama 2 litre.',
    ],
    tahmin: {
      metin: 'Robot çıkışa varınca depoda kaç litre su kalır?',
      birim: 'litre',
      cevap: (iz) => izOzeti(iz).kalanSu,
      sonrasi: 'Her kuru saksıya 2 litre: 20 − 5 × 2 = 10.',
      yonlendirme: 'Karar kutusunda kaç kez "evet" dendi? Kuru saksıları say.',
    },
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! ${o.sulama} kuru saksı × 2 litre = ${o.harcananSu} litre. ${iz.baslangic.depo} − ${o.harcananSu} = ${o.kalanSu} litre kaldı.`;
    },
    kazanimlar: ['MAT.7.2.4'],
  },
  {
    id: 's7-ifade-2',
    tur: 'yaz',
    baslik: 'Adımları koda çevir',
    yonerge: 'Adımları koda çevir. 1) olgun ← 0, ham ← 0. 2) İlerle. 3) Çıkışa varana kadar: kırmızıysa topla ve olgun 1 artsın, değilse ham 1 artsın; ilerle.',
    dunya: HASAT_SIRA,
    hedef: hasatHedefi(5, 3),
    bitkiAdi: 'bitki',
    aracKutusu: HASAT_ARACLARI,
    baslangic: 'bos',
    cozum: hasatKodu('s7i2-'),
    degiskenler: ['olgun', 'ham'],
    ipuclari: [
      'Her numaralı adım bir blok ya da blok grubudur. 3. adım bir döngü; içinde bir karar ve bir "ileri git" var.',
      '"eğer domates kırmızıysa … değilse" bloğunu döngünün içine koy; "ileri git" döngünün sonunda olsun.',
      'Sözde kod görünümüne geç: satırlar adımlarla aynı sırada mı?',
    ],
    basari: (iz) => {
      const olgun = deger(iz, 'olgun');
      const ham = deger(iz, 'ham');
      return `Oldu! ${olgun} olgun + ${ham} ham = ${olgun + ham} domates. Sepette ${izOzeti(iz).sepet} domates var.`;
    },
    kazanimlar: ['MAT.7.2.4'],
  },
  {
    id: 's7-ifade-3',
    tur: 'kurgu',
    genelleme: true,
    baslik: 'Uzun sıra',
    yonerge: 'Bu sıra daha uzun. Kodun burada da doğru sayıyor mu? Çalıştır; gerekirse düzelt.',
    dunya: HASAT_UZUN,
    hedef: hasatHedefi(8, 4),
    bitkiAdi: 'bitki',
    aracKutusu: HASAT_ARACLARI,
    baslangic: 'onceki',
    cozum: hasatKodu('s7i3-'),
    degiskenler: ['olgun', 'ham'],
    ipuclari: ['Kodun domates sayısını bilmeden çalışmalı: "8 kez tekrarla" yerine "çıkışa varana kadar tekrarla" kullan.'],
    basari: (iz) => {
      const olgun = deger(iz, 'olgun');
      const ham = deger(iz, 'ham');
      return `Oldu! Kod sıranın uzunluğunu bilmeden çalıştı: ${olgun} olgun + ${ham} ham = ${olgun + ham} domates.`;
    },
    soru: {
      metin: 'Olgun domates sayısı ham domates sayısının kaç katı?',
      birim: 'kat',
      cevap: (iz) => deger(iz, 'olgun') / deger(iz, 'ham'),
      sonrasi: '8 ÷ 4 = 2: her ham domatese 2 olgun domates düşüyor.',
    },
    kazanimlar: ['MAT.7.2.4'],
  },
  {
    id: 's7-ifade-4',
    tur: 'hata',
    baslik: 'Sözde kodu izle',
    yonerge: 'Sözde kodu satır satır izle: robot domatesleri sayıyor ama sayımlardan biri yanlış çıkıyor. Hatayı bul, bloklarda düzelt.',
    ilkGorunum: 'sozde',
    dunya: HASAT_HATA,
    hedef: hasatHedefi(4, 3),
    bitkiAdi: 'bitki',
    aracKutusu: HASAT_ARACLARI,
    baslangic: HASAT_BIR_FAZLA,
    cozum: hasatKodu('s7i4-'),
    degiskenler: ['olgun', 'ham'],
    ipuclari: [
      'Son turda robot nerede? Orada domates var mı?',
      'Robot çıkışta da EĞER satırına geliyor; DEĞİLSE kolu çıkışı ham domates sayıyor.',
      'İLERİ GİT satırını döngünün sonuna taşı; döngüden önce de bir İLERİ GİT koy.',
    ],
    basari: (iz) => {
      const olgun = deger(iz, 'olgun');
      const ham = deger(iz, 'ham');
      return `Buldun! ${olgun} olgun + ${ham} ham = ${olgun + ham}: sıradaki fide sayısı kadar. Çıkış artık sayılmıyor.`;
    },
    kazanimlar: ['MAT.7.2.4'],
  },
];

// ---------------------------------------------------------------------------
// 2. Denklem ve eşitsizlik
// ---------------------------------------------------------------------------

const onIkiKuru = saksiSirasi('K K K K K K K K K K K K');
const DEPO_18: DunyaTanimi = { id: 's7-depo-18', ad: '18 litrelik depo', sinar: '2x ≤ 18', bitkiler: onIkiKuru, depo: 18 };
const DEPO_15: DunyaTanimi = { id: 's7-depo-15', ad: '15 litre, 3 litre yedek', sinar: '2x + 3 = 15', bitkiler: onIkiKuru, depo: 15 };
const DEPO_13: DunyaTanimi = { id: 's7-depo-13', ad: '13 litrelik depo', sinar: 'Tek sayıda litre: 1 litre artar', bitkiler: onIkiKuru, depo: 13 };
const DEPO_NEMLI: DunyaTanimi = { id: 's7-depo-nemli', ad: 'Nemli saksılar', sinar: '9 kuru saksıdan 7’sine su yeter', bitkiler: saksiSirasi('K N K K N K K N K K K K'), depo: 14 };
const DEPO_21: DunyaTanimi = { id: 's7-depo-21', ad: '21 litre, 5 litre yedek', sinar: '2x + 5 = 21', bitkiler: onIkiKuru, depo: 21 };

const sulananHedefi = (sulanan: number): Hedef => ({ cikistaBitir: false, degiskenler: { sulanan } });
const depoKodu = (kosul: [string, '<' | '≤', number], onek: string) =>
  k([['ata', 'sulanan', 0], ['kadar', kosul, ['ileri', 'sula', ['ata', 'sulanan', ['sulanan', '+', 1]]]]], onek);

const DEPO_ARACLARI: BlokSablonu[] = [
  ILERI,
  SULA,
  { tur: 'tekrarlaKadar', kosul: kosulKur(['@depo', '<', 2]) },
  CIKISA_KADAR,
  { tur: 'ata', degisken: 'sulanan', ifade: ifadeKur(0) },
  { tur: 'ata', degisken: 'sulanan', ifade: ifadeKur(['sulanan', '+', 1]) },
];
const DEPO_ORTAK = { bitkiAdi: 'saksı' as const, degiskenler: ['sulanan'], olcumler: ['depo' as const] };

const DENKLEM_GOREVLERI: Gorev[] = [
  {
    ...DEPO_ORTAK,
    id: 's7-denklem-1',
    tur: 'yaz',
    baslik: 'Su yettiği sürece',
    yonerge: 'Depoda 18 litre su var; her sulama 2 litre. Su yettiği sürece ilerle ve sula. Sulanan saksıları sulanan değişkeninde say.',
    dunya: DEPO_18,
    hedef: sulananHedefi(9),
    aracKutusu: DEPO_ARACLARI,
    baslangic: 'bos',
    cozum: depoKodu(['@depo', '<', 2], 's7d1-'),
    ipuclari: [
      'Kaç saksı olduğunu bilmen gerekmiyor: döngü depoya baksın.',
      '"depo < 2 olana kadar tekrarla" bloğunun içine ilerle, sula ve sulanan ← sulanan + 1 koy.',
      'Döngüden önce sulanan ← 0 olsun.',
    ],
    basari: (iz) => {
      const x = deger(iz, 'sulanan');
      return `Oldu! ${x} saksı sulandı: 2 × ${x} = ${2 * x} litre. 2x ≤ ${iz.baslangic.depo} eşitsizliğini sağlayan en büyük sayı x = ${x}.`;
    },
    soru: { metin: 'Depoda 30 litre olsaydı kaç saksı sulanırdı?', birim: 'saksı', cevap: () => Math.floor(30 / 2), sonrasi: '2x ≤ 30 ise x ≤ 15.' },
    kazanimlar: ['MAT.7.2.2', 'MAT.7.2.4'],
  },
  {
    ...DEPO_ORTAK,
    id: 's7-denklem-2',
    tur: 'kurgu',
    baslik: 'Yedek su',
    yonerge: 'Depoda 15 litre var. Akşam sulaması için depoda 3 litre yedek kalmalı. Kodu buna göre düzelt.',
    dunya: DEPO_15,
    hedef: sulananHedefi(6),
    aracKutusu: DEPO_ARACLARI,
    baslangic: 'onceki',
    cozum: depoKodu(['@depo', '≤', 3], 's7d2-'),
    ipuclari: ['Döngü ne zaman durmalı? Depoda 3 litre kaldığında.', 'Koşulun sayısını ve işaretini değiştir: "depo ≤ 3 olana kadar".'],
    basari: (iz) => {
      const x = deger(iz, 'sulanan');
      const kalan = izOzeti(iz).kalanSu;
      return `Oldu! ${x} saksı × 2 litre + ${kalan} litre yedek = ${iz.baslangic.depo} litre: 2x + ${kalan} = ${iz.baslangic.depo}.`;
    },
    soru: { metin: '2x + 3 = 15 denkleminde x kaç?', birim: '', cevap: (iz) => deger(iz, 'sulanan'), sonrasi: '2x = 12, x = 6: robot 6 saksı suladı.' },
    kazanimlar: ['MAT.7.2.2', 'MAT.7.2.4'],
  },
  {
    ...DEPO_ORTAK,
    id: 's7-denklem-3',
    tur: 'hata',
    baslik: 'Su bitene kadar mı?',
    yonerge: 'Bu kod "su bitene kadar sula" diyor ama robot bir saksıda takılıyor. Çalıştır, depoyu izle, koşulu düzelt.',
    dunya: DEPO_13,
    hedef: sulananHedefi(6),
    aracKutusu: DEPO_ARACLARI,
    baslangic: depoKodu(['@depo', '≤', 0], 's7d3h-'),
    cozum: depoKodu(['@depo', '<', 2], 's7d3-'),
    ipuclari: [
      'Robot durduğunda depoda kaç litre var? Bir sulama kaç litre ister?',
      '1 litre ne sıfırdır ne de bir sulamaya yeter. Döngü depo 2 litreden az olunca durmalı.',
      'Koşulu "depo < 2" yap.',
    ],
    basari: (iz) => {
      const x = deger(iz, 'sulanan');
      return `Buldun! 2x ≤ ${iz.baslangic.depo} ise x ≤ ${sayiMetni(iz.baslangic.depo / 2)}; saksı sayısı tam sayı: x = ${x}. Depoda ${izOzeti(iz).kalanSu} litre kaldı.`;
    },
    kazanimlar: ['MAT.7.2.2'],
  },
  {
    ...DEPO_ORTAK,
    id: 's7-denklem-4',
    tur: 'kurgu',
    baslik: 'Nemli saksılar',
    yonerge: 'Bu sırada nemli saksılar da var; onları sulama. Su yettiği sürece yalnız kuru saksıları sula ve say.',
    dunya: DEPO_NEMLI,
    hedef: sulananHedefi(7),
    aracKutusu: [...DEPO_ARACLARI, { tur: 'eger', kosul: 'toprakKuru' }],
    baslangic: 'onceki',
    cozum: k([['ata', 'sulanan', 0], ['kadar', ['@depo', '<', 2], ['ileri', ['eger', 'toprakKuru', ['sula', ['ata', 'sulanan', ['sulanan', '+', 1]]]]]]], 's7d4-'),
    ipuclari: ['Robot her saksıda önce toprağa bakmalı.', '"sula" ve "sulanan ← sulanan + 1" bloklarını "eğer toprak kuruysa" bloğunun içine al.'],
    basari: (iz) => {
      const x = deger(iz, 'sulanan');
      return `Oldu! ${x} kuru saksı × 2 litre = ${izOzeti(iz).harcananSu} litre. Su ${iz.son.x}. saksıda bitti; nemli saksılar su harcamadı.`;
    },
    kazanimlar: ['MAT.7.2.2', 'MAT.7.2.4'],
  },
  {
    ...DEPO_ORTAK,
    id: 's7-denklem-5',
    tur: 'tahmin',
    baslik: 'Denklemi kur',
    yonerge: 'Kodu oku: depoda 21 litre var, her sulama 2 litre, döngü depo ≤ 5 olunca bitiyor. Kaç saksı sulanır? Denklemi kur, tahmin et, sonra çalıştır.',
    ilkGorunum: 'sozde',
    dunya: DEPO_21,
    hedef: sulananHedefi(8),
    aracKutusu: DEPO_ARACLARI,
    baslangic: depoKodu(['@depo', '≤', 5], 's7d5-'),
    cozum: depoKodu(['@depo', '≤', 5], 's7d5-'),
    ipuclari: ['Sonda depoda 5 litre kalır. Sulamalara kaç litre gider?', '2x + 5 = 21: iki yandan 5 çıkar, sonra 2’ye böl.'],
    tahmin: { metin: '2x + 5 = 21 ise x kaç? Kaç saksı sulanır?', birim: 'saksı', cevap: (iz) => deger(iz, 'sulanan'), sonrasi: '2x = 16, x = 8.', yonlendirme: 'Sulamalara 21 − 5 = 16 litre gider. Her saksı 2 litre.' },
    basari: (iz) => {
      const x = deger(iz, 'sulanan');
      const kalan = izOzeti(iz).kalanSu;
      return `Oldu! 2 × ${x} + ${kalan} = ${iz.baslangic.depo}: ${x} saksı sulandı, depoda ${kalan} litre kaldı.`;
    },
    kazanimlar: ['MAT.7.2.2', 'MAT.7.2.4'],
  },
];

// ---------------------------------------------------------------------------
// 3. Küplerle prizma
// ---------------------------------------------------------------------------

/**
 * Dikdörtgenler prizması: dron ilk sıranın solunda, doğuya bakarak başlar. Her sırada en kadar kule
 * (yükseklik kadar küp), sıra bitince geri dönüp bir sonraki sıraya geçer.
 */
const prizma = (boy: number | string, en: number | string, h: number | string): KisaBlok[] => [
  ['kez', boy, [['kez', en, ['ileri', ['kez', h, ['koy']]]], 'sagaDon', 'sagaDon', ['kez', en, ['ileri']], 'solaDon', 'ileri', 'solaDon']],
];

/** Kurulan yapının ölçüleri: kule olan sütun ve sıra sayısı, en yüksek kule, küp sayısı */
function prizmaOlculeri(iz: Iz) {
  const g = iz.son.izgara;
  const xs = new Set<number>();
  const ys = new Set<number>();
  let h = 0;
  iz.son.kupler.forEach((n, i) => {
    if (n > 0) {
      xs.add(i % g.en);
      ys.add(Math.floor(i / g.en));
      h = Math.max(h, n);
    }
  });
  return { en: xs.size, boy: ys.size, h, kup: izOzeti(iz).kup };
}
const prizmaCumlesi = (iz: Iz) => {
  const p = prizmaOlculeri(iz);
  return `${p.en} × ${p.boy} × ${p.h} = ${p.kup} küp: prizmanın hacmi ${p.kup} birim küp.`;
};

const PRIZMA_1 = insaatAlani('s7-prizma-3x2x2', 'Prizma 3 × 2 × 2', ['.....', 'B222.', '.222.', '.....'], { sinar: 'Üç iç içe döngü' });
const PRIZMA_2 = insaatAlani('s7-prizma-4x2x3', 'Prizma 4 × 2 × 3', ['......', 'B3333.', '.3333.', '......'], { sinar: 'Sayılar değişir' });
const PRIZMA_3 = insaatAlani('s7-prizma-3x2x3', 'Prizma 3 × 2 × 3', ['.....', 'B333.', '.333.', '.....'], { sinar: 'En ile boy karışırsa' });
const PRIZMA_4 = insaatAlani('s7-prizma-gizli', 'Gizli prizma', ['......', 'B2222.', '.2222.', '.2222.', '......'], { sinar: 'Önden ve yandan görünüm', hedefGizli: true });
const PRIZMA_5 = insaatAlani('s7-prizma-degisken', 'Değişkenli prizma', ['....', 'B44.', '.44.', '.44.', '....'], { sinar: 'en, boy, yükseklik değişkenleri', degiskenler: { en: 2, boy: 3, yükseklik: 4 } });

const PRIZMA_ARACLARI: BlokSablonu[] = [ILERI, SAGA, SOLA, KOY, TEKRAR];
const YAPIYI_KUR: Hedef = { yapiyiKur: true, cikistaBitir: false };

const PRIZMA_GOREVLERI: Gorev[] = [
  {
    id: 's7-prizma-1',
    tur: 'yaz',
    baslik: 'Sıradan prizmaya',
    yonerge: 'Kod prizmanın ilk sırasını kuruyor. Sıranın sonunda geri dönüp yandaki sıraya geç; bunu 2 sıra için tekrarla.',
    dunya: PRIZMA_1,
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: PRIZMA_ARACLARI,
    baslangic: k([['kez', 3, ['ileri', ['kez', 2, ['koy']]]]], 's7p1b-'),
    cozum: k(prizma(2, 3, 2), 's7p1-'),
    ipuclari: [
      'Kule → sıra → prizma: her biri bir tekrar. Kaç tekrar iç içe olmalı?',
      'Sıra bitince dron sıranın sonunda. Geri dönmek için iki kez sağa dön, 3 ileri git; sonra sola dön, 1 ileri git, yine sola dön.',
      'Sırayı kuran kodla geri dönüş kodunu birlikte "2 kez tekrarla" içine al.',
    ],
    basari: (iz) => `Oldu! ${prizmaCumlesi(iz)}`,
    soru: { metin: 'Aynı tabanla 5 katlı bir prizma kaç küp olurdu?', birim: 'küp', cevap: (iz) => prizmaOlculeri(iz).en * prizmaOlculeri(iz).boy * 5, sonrasi: '3 × 2 × 5 = 30: taban alanı × yükseklik.' },
    kazanimlar: ['MAT.7.4.3', 'MAT.7.4.4'],
  },
  {
    id: 's7-prizma-2',
    tur: 'kurgu',
    baslik: 'Daha büyük prizma',
    yonerge: 'Bu prizma daha geniş ve daha yüksek. Kodundaki tekrar sayılarını bu prizmaya göre değiştir.',
    dunya: PRIZMA_2,
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: PRIZMA_ARACLARI,
    baslangic: 'onceki',
    cozum: k(prizma(2, 4, 3), 's7p2-'),
    ipuclari: ['Hangi tekrar eni, hangisi boyu, hangisi yüksekliği sayıyor?', 'Geri dönüşteki "ileri git" sayısı da en kadar olmalı.'],
    basari: (iz) => `Oldu! ${prizmaCumlesi(iz)}`,
    soru: { metin: 'Prizmanın taban alanı kaç birim kare?', birim: 'birim kare', cevap: (iz) => prizmaOlculeri(iz).en * prizmaOlculeri(iz).boy, sonrasi: 'Hacim = taban alanı × yükseklik = 8 × 3 = 24.' },
    kazanimlar: ['MAT.7.4.3', 'MAT.7.4.4'],
  },
  {
    id: 's7-prizma-3',
    tur: 'hata',
    baslik: 'Yanlış yere küp',
    yonerge: 'Dron 3 × 2 tabanlı prizmayı kurarken küpü yanlış yere koydu. Kodu izle: hangi tekrar neyi sayıyor? Hatayı bul, düzelt.',
    dunya: PRIZMA_3,
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: PRIZMA_ARACLARI,
    baslangic: k(prizma(3, 2, 3), 's7p3h-'),
    cozum: k(prizma(2, 3, 3), 's7p3-'),
    ipuclari: [
      'Dron kaç sıra, her sırada kaç kule kurdu? Prizmada kaç sıra, kaç sütun var?',
      'Dıştaki tekrar sıraları, ortadaki her sıradaki kuleleri sayar. 3 × 2 ile 2 × 3 aynı sayıda küp, ama farklı yerleşim.',
      'Dıştaki tekrarı 2, ortadakini ve geri dönüştekini 3 yap.',
    ],
    basari: (iz) => {
      const p = prizmaOlculeri(iz);
      return `Buldun! ${p.en} × ${p.boy} × ${p.h} = ${p.kup}. ${p.boy} × ${p.en} × ${p.h} de ${p.kup} eder, ama küpler başka yere dizilir.`;
    },
    kazanimlar: ['MAT.7.4.3'],
  },
  {
    id: 's7-prizma-4',
    tur: 'kurgu',
    baslik: 'Görünümlerden kur',
    yonerge: 'Yapı gizli; tuvalde yalnız önden ve yandan görünümü var. Görünümlerden prizmanın enini, boyunu ve yüksekliğini bul; prizmayı kur.',
    dunya: PRIZMA_4,
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: PRIZMA_ARACLARI,
    baslangic: 'onceki',
    cozum: k(prizma(3, 4, 2), 's7p4-'),
    ipuclari: ['Önden görünümde kaç sütun ve kaç kat var? Bunlar en ve yükseklik.', 'Yandan görünümdeki sütun sayısı boydur: kaç sıra olduğunu söyler.'],
    basari: (iz) => {
      const p = prizmaOlculeri(iz);
      return `Oldu! Önden ${p.en} × ${p.h}, yandan ${p.boy} × ${p.h} görünen prizma: ${p.en} × ${p.boy} × ${p.h} = ${p.kup} küp.`;
    },
    soru: { metin: 'Bu prizmaya üstten bakınca kaç kare görünür?', birim: 'kare', cevap: (iz) => prizmaOlculeri(iz).en * prizmaOlculeri(iz).boy, sonrasi: 'Üstten görünüm tabanı gösterir: 4 × 3 = 12.' },
    kazanimlar: ['MAT.7.4.1', 'MAT.7.4.3'],
  },
  {
    id: 's7-prizma-5',
    tur: 'yaz',
    zorlu: true,
    baslik: 'Formülle prizma',
    yonerge: 'en, boy ve yükseklik değişkenleri hazır. Tekrar sayılarını bu değişkenlerle yaz; sonunda hacim ← en × boy × yükseklik hesapla.',
    dunya: PRIZMA_5,
    hedef: { yapiyiKur: true, cikistaBitir: false, degiskenler: { hacim: 24 } },
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, KOY, { tur: 'tekrarlaKez', kez: 1, kezIfade: ifadeKur('en') }, { tur: 'ata', degisken: 'hacim', ifade: ifadeKur([['en', '×', 'boy'], '×', 'yükseklik']) }],
    baslangic: 'bos',
    cozum: k([...prizma('boy', 'en', 'yükseklik'), ['ata', 'hacim', [['en', '×', 'boy'], '×', 'yükseklik']]], 's7p5-'),
    degiskenler: ['en', 'boy', 'yükseklik', 'hacim'],
    ipuclari: [
      'Önceki kodun aynısı, ama her sayının yerinde bir değişken var. Hangi sayı en, hangisi boy?',
      '"en kez tekrarla" bloğundaki değişkeni tıklayıp boy ya da yükseklik yapabilirsin.',
    ],
    basari: (iz) => {
      const v = izOzeti(iz).degiskenler;
      return `Oldu! hacim = ${v.en} × ${v.boy} × ${v.yükseklik} = ${v.hacim}; dron da ${izOzeti(iz).kup} küp koydu. Formül ile sayım aynı sonucu verdi.`;
    },
    kazanimlar: ['MAT.7.4.4', 'MAT.7.4.3'],
  },
];

// ---------------------------------------------------------------------------
// 4. Yansıma
// ---------------------------------------------------------------------------

type Nokta = readonly [number, number];

/**
 * Nokta ağı (saha) satırları: hazır ve çizilecek yollar birim adımlarla işlenir.
 * Noktalar (x, y); y aşağı doğru artar (satır sırası).
 */
function agKur(en: number, boy: number, bas: Nokta, hazir: Nokta[][], cizilecek: Nokta[][]): string[] {
  const s: string[][] = Array.from({ length: 2 * boy - 1 }, (_, r) => Array.from({ length: 2 * en - 1 }, (_, c) => (r % 2 === 0 && c % 2 === 0 ? '.' : ' ')));
  const yol = (liste: Nokta[], yatay: string, dikey: string) => {
    for (let i = 1; i < liste.length; i++) {
      let [x, y] = liste[i - 1];
      const [x2, y2] = liste[i];
      if (x !== x2 && y !== y2) throw new Error(`Çapraz çizgi: ${liste[i - 1]} → ${liste[i]}`);
      while (x !== x2 || y !== y2) {
        const nx = x + Math.sign(x2 - x);
        const ny = y + Math.sign(y2 - y);
        if (Math.max(x, nx) >= en || Math.max(y, ny) >= boy || Math.min(x, nx, y, ny) < 0) throw new Error(`Ağın dışında: (${nx}, ${ny})`);
        if (ny === y) s[2 * y][2 * Math.min(x, nx) + 1] = yatay;
        else s[2 * Math.min(y, ny) + 1][2 * x] = dikey;
        x = nx;
        y = ny;
      }
    }
  };
  hazir.forEach((l) => yol(l, '=', '!'));
  cizilecek.forEach((l) => yol(l, '-', '|'));
  s[2 * bas[1]][2 * bas[0]] = 'B';
  return s.map((r) => r.join(''));
}

/** Robotun kalem kalkıkken attığı adımlar ve kalem yerdeyken yaptığı dönüşler */
function kalemSayimi(iz: Iz) {
  let kalkik = 0;
  let sola = 0;
  let saga = 0;
  let once = iz.baslangic;
  for (const a of iz.adimlar) {
    if (a.tur === 'eylem' && !a.hata) {
      if (a.eylem === 'ileri' && !once.kalem) kalkik += 1;
      if (a.eylem === 'solaDon' && once.kalem) sola += 1;
      if (a.eylem === 'sagaDon' && once.kalem) saga += 1;
    }
    once = a.durum;
  }
  return { kalkik, sola, saga };
}

const AYNA_1 = saha(
  's7-ayna-dikey',
  'Dikey ayna',
  agKur(9, 5, [1, 1], [[[1, 1], [3, 1], [3, 3], [2, 3]]], [[[7, 1], [5, 1], [5, 3], [6, 3]]]),
  { eksen: { yon: 'dikey', k: 4 }, hedefGizli: true, sinar: 'Başlangıç ve yön yansır' }
);
const AYNA_2 = saha(
  's7-ayna-yatay',
  'Yatay ayna',
  agKur(6, 7, [1, 2], [[[1, 2], [3, 2], [3, 0], [2, 0]]], [[[1, 4], [3, 4], [3, 6], [2, 6]]]),
  { eksen: { yon: 'yatay', k: 3 }, hedefGizli: true, sinar: 'Yatay aynada doğu doğu kalır' }
);
const AYNA_3 = saha(
  's7-ayna-kalem',
  'Kanca',
  agKur(9, 5, [2, 0], [[[2, 0], [2, 1], [3, 1], [3, 3]]], [[[6, 0], [6, 1], [5, 1], [5, 3]]]),
  { eksen: { yon: 'dikey', k: 4 }, hedefGizli: true, yon: 1, sinar: 'Kalem kalkmazsa' }
);
const AYNA_4 = saha(
  's7-ayna-basamak',
  'Basamak',
  agKur(9, 5, [1, 1], [[[1, 1], [2, 1], [2, 2], [3, 2], [3, 3]]], [[[7, 1], [6, 1], [6, 2], [5, 2], [5, 3]]]),
  { eksen: { yon: 'dikey', k: 4 }, hedefGizli: true, sinar: 'Dönüşler aynen kalırsa' }
);

const CIZIMI_TAMAMLA: Hedef = { cizimiTamamla: true, cikistaBitir: false };
const AYNA_ARACLARI: BlokSablonu[] = [ILERI, SAGA, SOLA, KALDIR, INDIR, TEKRAR];

/** Başlangıç noktasının aynaya uzaklığı (dikey aynada x, yatay aynada y farkı) */
const aynayaUzaklik = (d: DunyaTanimi, iz: Iz) => (d.eksen ? Math.abs(d.eksen.k - (d.eksen.yon === 'dikey' ? iz.baslangic.x : iz.baslangic.y)) : 0);

const YANSIMA_GOREVLERI: Gorev[] = [
  {
    id: 's7-yansima-1',
    tur: 'yaz',
    baslik: 'Aynadaki şekil',
    yonerge: 'Hazır kod soldaki şekli çiziyor. Aynadaki görüntüsünü çiz: kalemi kaldırıp başlangıç noktasının yansımasına git, kalemi indir, şekli yansıt.',
    dunya: AYNA_1,
    hedef: CIZIMI_TAMAMLA,
    bitkiAdi: 'bitki',
    aracKutusu: AYNA_ARACLARI,
    baslangic: k(['ileri', 'ileri', 'sagaDon', 'ileri', 'ileri', 'sagaDon', 'ileri'], 's7y1b-'),
    cozum: k(['kalemKaldir', ['kez', 6, ['ileri']], 'sagaDon', 'sagaDon', 'kalemIndir', 'ileri', 'ileri', 'solaDon', 'ileri', 'ileri', 'solaDon', 'ileri'], 's7y1-'),
    ipuclari: [
      'Başlangıç noktası aynaya kaç birim uzak? Görüntüsü aynanın öbür yanında o kadar uzakta.',
      'Yansımada yön de değişir: robot doğuya bakıyordu; görüntüde batıya bakmalı.',
      'Görüntüyü çizerken aynı adımları at, ama her "sağa dön"ü "sola dön" yap.',
    ],
    basari: (iz) => {
      const d = aynayaUzaklik(AYNA_1, iz);
      const c = kalemSayimi(iz);
      return `Oldu! Başlangıç noktası aynaya ${d} birim uzaktı; görüntüsü de öbür yanda ${d} birim uzakta. Robot ${c.kalkik} birim çizmeden gitti, ${izOzeti(iz).cizgi} çizgi çizdi.`;
    },
    kazanimlar: ['MAT.7.3.1'],
  },
  {
    id: 's7-yansima-2',
    tur: 'kurgu',
    baslik: 'Yatay ayna',
    yonerge: 'Ayna bu kez yatay. Şekli aynanın altına yansıt. Yatay aynada hangi yön değişir, hangisi aynı kalır?',
    dunya: AYNA_2,
    hedef: CIZIMI_TAMAMLA,
    bitkiAdi: 'bitki',
    aracKutusu: AYNA_ARACLARI,
    baslangic: 'onceki',
    cozum: k(['kalemKaldir', 'sagaDon', ['kez', 2, ['ileri']], 'solaDon', 'kalemIndir', 'ileri', 'ileri', 'sagaDon', 'ileri', 'ileri', 'sagaDon', 'ileri'], 's7y2-'),
    ipuclari: [
      'Başlangıç noktası yatay aynanın kaç birim üstünde? Görüntüsü o kadar altında.',
      'Robot doğuya bakıyordu; yatay aynada görüntüsü de doğuya bakar.',
      'Şekil yukarı dönüyordu (sola dön); görüntü aşağı dönmeli (sağa dön).',
    ],
    basari: (iz) => {
      const d = aynayaUzaklik(AYNA_2, iz);
      const c = kalemSayimi(iz);
      return `Oldu! Başlangıç noktası aynanın ${d} birim üstünde, görüntüsü ${d} birim altında. Doğu yine doğu, ama ${c.saga} sola dönüş sağa döndü.`;
    },
    kazanimlar: ['MAT.7.3.1'],
  },
  {
    id: 's7-yansima-3',
    tur: 'hata',
    baslik: 'Yolda kalan çizgi',
    yonerge: 'Robot aynadaki başlangıca giderken şekilde olmayan bir çizgi çiziyor. Hatayı bul, düzelt.',
    dunya: AYNA_3,
    hedef: CIZIMI_TAMAMLA,
    bitkiAdi: 'bitki',
    aracKutusu: AYNA_ARACLARI,
    baslangic: k(['solaDon', ['kez', 4, ['ileri']], 'sagaDon', 'kalemIndir', 'ileri', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'ileri'], 's7y3h-'),
    cozum: k(['kalemKaldir', 'solaDon', ['kez', 4, ['ileri']], 'sagaDon', 'kalemIndir', 'ileri', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'ileri'], 's7y3-'),
    ipuclari: ['Robot yola çıkarken kalemi nerede?', 'Aynadaki başlangıca çizmeden gitmeli: yola çıkmadan önce "kalemi kaldır".'],
    basari: (iz) => {
      const c = kalemSayimi(iz);
      return `Buldun! Kalem kalkıkken robot ${c.kalkik} birim çizmeden gitti; sonra ${izOzeti(iz).cizgi} çizgilik görüntüyü çizdi.`;
    },
    kazanimlar: ['MAT.7.3.1'],
  },
  {
    id: 's7-yansima-4',
    tur: 'hata',
    baslik: 'Aynı dönüşler',
    yonerge: 'Kalem doğru, başlangıç doğru; ama görüntü aynadaki gibi değil. Kodu izle, hatayı bul, düzelt.',
    dunya: AYNA_4,
    hedef: CIZIMI_TAMAMLA,
    bitkiAdi: 'bitki',
    aracKutusu: AYNA_ARACLARI,
    baslangic: k(['kalemKaldir', ['kez', 6, ['ileri']], 'sagaDon', 'sagaDon', 'kalemIndir', 'ileri', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'sagaDon', 'ileri'], 's7y4h-'),
    cozum: k(['kalemKaldir', ['kez', 6, ['ileri']], 'sagaDon', 'sagaDon', 'kalemIndir', 'ileri', 'solaDon', 'ileri', 'sagaDon', 'ileri', 'solaDon', 'ileri'], 's7y4-'),
    ipuclari: [
      'Görüntünün ilk çizgisinden sonra robot hangi yöne döndü? Aynada hangi yöne dönmeliydi?',
      'Aynada sağ ile sol yer değiştirir: görüntüyü çizen kısımdaki her dönüşü tersine çevir.',
    ],
    basari: (iz) => {
      const c = kalemSayimi(iz);
      return `Buldun! Görüntüyü çizerken robot ${c.sola} kez sola, ${c.saga} kez sağa döndü; şekilde tam tersi vardı: ${c.sola} sağa, ${c.saga} sola.`;
    },
    kazanimlar: ['MAT.7.3.1'],
  },
];

// ---------------------------------------------------------------------------
// Üniteler
// ---------------------------------------------------------------------------

export const SINIF7: readonly Unite[] = [
  {
    ...ORTAK,
    id: 's7-ifade',
    no: 1,
    ad: 'Algoritmayı ifade et',
    tema: 'Sera',
    yeniKavram: 'Algoritma ifade yöntemleri: adım adım yazı, sözde kod, akış şeması',
    oncedenBilinen: 'Döngü, "eğer … değilse", sayaç değişkeni (5–6. sınıf)',
    kalip: 'ifade-yontemleri',
    kazanimlar: ['MAT.7.2.4'],
    sure: '2 ders saati',
    gorevler: IFADE_GOREVLERI,
    fissiz: {
      ad: 'Üç dilde sulama',
      amac: 'Aynı algoritmayı adım adım yazı, sözde kod ve akış şemasıyla ifade etmek; üçünün aynı işi anlattığını görmek.',
      sure: '20 dakika',
      roller: [
        'Sınıf üç gruba ayrılır: yazarlar adımları numaralı cümlelerle yazar, kodcular sözde kodu yazar, çizerler akış şemasını kartlarla kurar.',
        'Bir öğrenci robot olur; yalnız akış şemasındaki okları izleyerek hareket eder.',
      ],
      adimlar: [
        'Sekiz saksı kartı yüzü aşağı gelecek biçimde bir sıraya dizilir; robotun elinde 20 pul (litre) vardır.',
        'Yazarlar "1. Bir saksı ilerle. 2. Çıkıştaysan dur. 3. Toprak kuruysa sula. 4. 1. adıma dön." gibi adımları yazar.',
        'Kodcular aynı algoritmayı ÇIKIŞA VARANA KADAR TEKRARLA … TEKRAR SONU biçiminde sözde kodla yazar.',
        'Çizerler BAŞLA, İŞLEM, KARAR ve BİTİR kartlarını tahtaya dizip oklarla bağlar; döngü geri dönen bir oktur.',
        'Robot akış şemasını izler; her sulamada 2 pul verir. Sınıf sonunda kalan pulları sayar.',
        'Üç grup gösterimlerini eşleştirir: hangi cümle hangi satıra, hangi karta karşılık geliyor?',
      ],
      hazirlik:
        'Akış şeması kartlarını (BAŞLA, BİTİR, İŞLEM, KARAR, DEĞİLSE, DEĞİŞKEN) ve saksı kartlarını kesin. Okları tahtaya tebeşirle çizin. Robot yalnız BAK kartı gelince önündeki saksı kartını çevirir.',
      kartlar: [
        { komut: 'BAŞLA', aciklama: 'Algoritma buradan başlar.', adet: 1 },
        { komut: 'BİTİR', aciklama: 'Algoritma burada biter.', adet: 1 },
        { komut: 'İŞLEM', aciklama: 'Bir iş yap: ilerle, sula, bir değeri değiştir.', adet: 3 },
        { komut: 'KARAR', aciklama: 'Bir soru sor; "evet" ve "hayır" diye iki ok çıkar.', adet: 2 },
        { komut: 'DEĞİLSE', aciklama: 'Kararın "hayır" kolunda yapılacak iş.', adet: 1 },
        { komut: 'DEĞİŞKEN', aciklama: 'Bir değeri tut: depo = 20.', adet: 1 },
        { komut: 'BAK', aciklama: 'Önündeki saksı kartını çevir.', adet: 1 },
        { komut: 'SULA', aciklama: 'Saksıyı sula; 2 pul ver.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir saksı ilerle.', adet: 1 },
      ],
      saksiKartlari: 'K N K K N K N K',
    },
    ogretmenNotu: {
      hedef:
        'Öğrenci aynı algoritmayı adım adım yazı, sözde kod ve akış şemasıyla okur ve yazar; bir gösterimden ötekine çevirir, sözde koddaki hatayı bulup bloklarda düzeltir.',
      dersler: [
        {
          baslik: '1. ders',
          metin: 'Fişsiz "Üç dilde sulama" (20 dk). Ardından 1. görev: akış şemasını okuyup depoda kalan suyu tahmin etme. Kod panelinin başlığındaki Bloklar · Sözde kod · Akış şeması seçimi tanıtılır.',
        },
        {
          baslik: '2. ders',
          metin: '2–3. görevler: numaralı adımları koda çevirme ve uzun sırada sınama. 4. görev ikişerli: sözde kodu satır satır izleyip hatayı bulma. Ders "hangi gösterim ne zaman işe yarar?" tartışmasıyla kapanır.',
        },
      ],
      yanilgilar: [
        {
          ad: 'Çıkışı da saymak',
          metin: 'Döngünün başında ilerleyen robot son turda çıkışa varır ve orada da EĞER’e bakar; DEĞİLSE kolu çıkışı ham domates sayar. 4. görev bunu hedefler: sözde kodda İLERİ GİT satırının yerine bakılır.',
        },
        {
          ad: 'Geri dönen oku görmemek',
          metin: 'Akış şemasındaki geri dönen oku tekrar olarak okumamak; robotun bir kez sulayıp durduğunu sanmak. 1. görevde tahmin, karardaki "evet"leri sayarak yapılır.',
        },
        {
          ad: 'Gösterimleri ayrı algoritmalar sanmak',
          metin: 'Sözde kod ile akış şemasının farklı şeyler yaptığını düşünmek. Görünüm değiştirilince aynı programın aynı adımının vurgulandığını göstermek işe yarar.',
        },
      ],
      sorular: [
        'Akış şemasında döngü nasıl görünüyor? Sözde kodda nasıl?',
        'Numaralı adımlardaki "1. adıma dön" cümlesi kodda hangi bloğa karşılık geliyor?',
        'Robot çıkışa varınca EĞER’e bakmalı mı? Neden?',
        'Bir algoritmayı arkadaşına anlatmak için hangi gösterimi seçerdin? Neden?',
      ],
      celdiriciler: 'Araç kutusundaki "8 kez tekrarla" çeldiricidir: ilk sırada doğru sayar gibi görünür, uzun sırada (3. görev) yetmez.',
    },
  },
  {
    ...ORTAK,
    id: 's7-denklem',
    no: 2,
    ad: 'Denklem ve eşitsizlik',
    tema: 'Sera',
    yeniKavram: 'Eşitsizlikle sınırlanan döngü: kaynak yettiği sürece tekrarla',
    oncedenBilinen: 'Karşılaştırma koşulu, sayaç değişkeni (5–6. sınıf); algoritma gösterimleri (1. ünite)',
    kalip: 'sinir',
    kazanimlar: ['MAT.7.2.2', 'MAT.7.2.4'],
    sure: '2 ders saati',
    gorevler: DENKLEM_GOREVLERI,
    fissiz: {
      ad: 'Depo oyunu',
      amac: 'Bir kaynağın yettiği sürece tekrar eden algoritmayı ve bunun eşitsizlikle ilişkisini bedenle yaşamak.',
      sure: '15 dakika',
      roller: [
        'Bir öğrenci robot olur; elinde 15 pul (litre) vardır.',
        'Bir öğrenci depo bekçisidir; her turdan önce KARAR kartındaki soruyu sorar.',
        'Sınıf her sulamayı tahtaya işler.',
      ],
      adimlar: [
        'On iki saksı kartı yere bir sıra hâlinde dizilir.',
        'Tahtaya "depo < 2 olana kadar tekrarla: ilerle, sula" kartları dizilir.',
        'Robot her sulamada 2 pul verir; bekçi her turdan önce "depoda 2 puldan az mı var?" diye sorar.',
        'Robot durunca sınıf sorar: kaç saksı sulandı, kaç pul kaldı? Tahtaya 2x ≤ 15 yazılır ve çözülür.',
        'Oyun "depoda 3 pul yedek kalsın" kuralıyla yeniden oynanır; sınıf 2x + 3 = 15 denklemini kurar.',
      ],
      hazirlik: 'Saksı kartlarını kesin; 15 pul ya da kâğıt bardak hazırlayın. KARAR kartının arkasına koşulu yazın: "depo < 2".',
      kartlar: [
        { komut: 'BAŞLA', aciklama: 'Algoritma buradan başlar.', adet: 1 },
        { komut: 'DEĞİŞKEN', aciklama: 'depo = 15 litre.', adet: 1 },
        { komut: 'KARAR', aciklama: 'Depoda 2 litreden az mı var? Evetse bitir.', adet: 1 },
        { komut: 'TEKRARLA', aciklama: 'Karara geri dön.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir saksı ilerle.', adet: 1 },
        { komut: 'BAK', aciklama: 'Önündeki saksı kartını çevir.', adet: 1 },
        { komut: 'SULA', aciklama: 'Saksıyı sula; 2 pul ver.', adet: 1 },
        { komut: 'BİTİR', aciklama: 'Algoritma burada biter.', adet: 1 },
      ],
      saksiKartlari: 'K N K K N K K N K K K K',
    },
    ogretmenNotu: {
      hedef:
        'Öğrenci bir kaynağın (su) yettiği sürece tekrar eden döngüyü karşılaştırmayla kurar; döngünün kaç kez döneceğini 2x ≤ 18, 2x + 3 = 15 gibi eşitsizlik ve denklemlerle bulur ve sınır değeri hatasını düzeltir.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "Depo oyunu" (15 dk), ardından 1–2. görevler: su yettiği sürece sula; yedek suyla 2x + 3 = 15.' },
        { baslik: '2. ders', metin: '3. görev (hatayı bul) ikişerli; 4. görev nemli saksılarla; 5. görevde önce denklem kurulur, tahmin edilir, sonra çalıştırılır.' },
      ],
      yanilgilar: [
        {
          ad: 'Su bitene kadar sanmak',
          metin: '"Su bitene kadar" döngüsünü depo ≤ 0 ile yazmak. Depoda 1 litre kalınca ne sıfırdır ne de bir sulamaya yeter; robot sulamaya çalışır ve depo yetmez. 3. görev bu sınır değeri hatasını hedefler.',
        },
        {
          ad: '< ile ≤ işaretini karıştırmak',
          metin: '3 litre yedek kalsın derken "depo < 3" yazmak: 3 litre kalınca döngü durmaz, bir saksı fazla sulanır. 2. görevde sayaç bunu gösterir.',
        },
        { ad: 'Kararı unutmak', metin: 'Kaynak sınırını düşünürken nemli saksıyı da sulamak. 4. görevde su taşar.' },
      ],
      sorular: [
        'Depoda 30 litre olsaydı kaç saksı sulanırdı? Hangi eşitsizliği çözdün?',
        'Robot durduğunda depoda neden bazen 0, bazen 1 litre kalıyor?',
        '"depo < 2" ile "depo ≤ 1" aynı mı? "depo ≤ 0" ile?',
        'Döngünün kaç kez döneceğini çalıştırmadan nasıl bulursun?',
      ],
      celdiriciler: 'Araç kutusundaki "çıkışa varana kadar tekrarla" çeldiricidir: sıra uzun, su azdır; robot sıranın ortasında depoyu boşaltır.',
    },
  },
  {
    ...ORTAK,
    id: 's7-prizma',
    no: 3,
    ad: 'Küplerle prizma',
    tema: 'İnşaat alanı',
    yeniKavram: 'Üç iç içe döngü: kule, sıra, prizma',
    oncedenBilinen: 'İç içe tekrar (4. sınıf), alan = en × boy (5. sınıf), değişkenler',
    kalip: 'uc-kat',
    kazanimlar: ['MAT.7.4.3', 'MAT.7.4.4', 'MAT.7.4.1'],
    sure: '2 ders saati',
    uygunluk: '5. görev zorludur ve isteğe bağlıdır. 4. görevde yapı gizlidir; tuvalde önden ve yandan görünüm vardır.',
    gorevler: PRIZMA_GOREVLERI,
    fissiz: {
      ad: 'Birim küplerle prizma',
      amac: 'Prizmayı kule, sıra ve kat düzeniyle kurmak; küp sayısının en × boy × yükseklik olduğunu saymadan görmek.',
      sure: '15 dakika',
      roller: [
        'Bir öğrenci dron olur; kareli kâğıdın üstüne birim küpleri yerleştirir.',
        'Bir grup programcı olur; iç içe TEKRARLA kartlarını dizer.',
        'Bir grup yapının önden ve yandan görünümünü çizer.',
      ],
      adimlar: [
        'Kareli kâğıda 3 × 2 bir taban çizilir; dron ilk sıranın solunda başlar.',
        'Programcılar önce tek kuleyi (TEKRARLA 2: KÜP KOY), sonra bir sırayı (TEKRARLA 3), sonra bütün prizmayı (TEKRARLA 2) kartlarla kurar.',
        'Dron kartları uygular; sınıf her kulede ve her sırada küpleri sayar.',
        'Çizim grubu yapının önden ve yandan görünümünü kareli kâğıda çizer.',
        'Sınıf sorar: kaç küp kullandık? 3 × 2 × 2 = 12 mi? Tabanı 2 × 3 kursaydık ne değişirdi?',
      ],
      hazirlik: 'Her grup için 30 birim küp (ya da şeker küp) ve kareli kâğıt hazırlayın. Üç TEKRARLA kartını farklı boylarda kesmek iç içe oluşlarını gösterir.',
      kartlar: [
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları yazılan sayı kadar uygula.', adet: 3 },
        { komut: 'KÜP KOY', aciklama: 'Bulunduğun kareye bir küp koy.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir kare ileri uç.', adet: 2 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 2 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 2 },
      ],
    },
    ogretmenNotu: {
      hedef:
        'Öğrenci dikdörtgenler prizmasını iç içe üç döngüyle (kule, sıra, prizma) kurar; küp sayısını en × boy × yükseklik ile bulur, önden ve yandan görünümlerden yapının boyutlarını çıkarır.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "Birim küplerle prizma" (15 dk), ardından 1–2. görevler: tek sıranın kodunu prizmaya genişletme, sayıları yeni prizmaya uyarlama.' },
        { baslik: '2. ders', metin: '3. görev (hatayı bul) ikişerli; 4. görevde yapı gizlidir, yalnız görünümler vardır; 5. görev zorlu: değişkenlerle hacim formülü.' },
      ],
      yanilgilar: [
        { ad: 'En ile boyu karıştırmak', metin: '3 × 2 tabanı 2 × 3 diye kurmak. Küp sayısı aynıdır ama yerleşim farklıdır; dron alanın dışına küp koyar. 3. görev bunu hedefler.' },
        { ad: 'Geri dönüşü unutmak', metin: 'Sıra bitince dronun sıranın sonunda kaldığını unutup yeni sırayı oradan başlatmak. 1. görevde geri dönüş kodu eklenir.' },
        { ad: 'Görünümden yüksekliği yanlış okumak', metin: 'Önden görünümdeki sütun sayısını yükseklik sanmak. 4. görevde en, boy ve yükseklik görünümlerden çıkarılır.' },
      ],
      sorular: [
        'Hangi tekrar kuleyi, hangisi sırayı, hangisi prizmayı kuruyor?',
        '3 × 2 × 2 ile 2 × 3 × 2 aynı sayıda küp mü? Aynı yapı mı?',
        'Önden ve yandan görünüm yapıyı her zaman tek biçimde belirler mi?',
        'Hacmi 24 birim küp olan başka hangi prizmaları kurabilirsin?',
      ],
      celdiriciler: 'Bu ünitede çeldirici blok yoktur; zorluk tekrar sayılarını doğru yere yazmaktadır. Dönüş bloklarının ikisi de kutudadır: geri dönüşte hangisinin gerektiğini çocuk bulur.',
    },
  },
  {
    ...ORTAK,
    id: 's7-yansima',
    no: 4,
    ad: 'Yansıma',
    tema: 'Spor sahası',
    yeniKavram: 'Yansıma dönüşümü: başlangıç, yön ve dönüşler yansır',
    oncedenBilinen: 'Simetri ve aynada sağ ile sol (3–4. sınıf), kalemi kaldırıp indirmek',
    kalip: 'yansit',
    kazanimlar: ['MAT.7.3.1'],
    sure: '1 ders saati',
    gorevler: YANSIMA_GOREVLERI,
    fissiz: {
      ad: 'Ayna yürüyüşü',
      amac: 'Yansımada başlangıç noktasının, yönün ve dönüşlerin nasıl değiştiğini bedenle yaşamak.',
      sure: '10 dakika',
      roller: ['İki öğrenci robot olur; aralarında yere yapıştırılmış bir bant ayna doğrusudur.', 'Sınıf birinci robotun programını kartlarla kurar; ikinci robotun programını birlikte bulur.'],
      adimlar: [
        'Yere kare ızgara ve ortasına bir ayna doğrusu çizilir.',
        'Birinci robot doğrunun solunda, doğruya 3 kare uzakta başlar; kartlarla küçük bir şekil yürür.',
        'İkinci robot doğrunun sağında, 3 kare uzakta ve ters yöne bakarak başlar.',
        'Sınıf birinci robotun kartlarını ikinci robot için kopyalar: sağa dönüşler sola, sola dönüşler sağa döner.',
        'İki robotun yolu tebeşirle çizilir ve karşılaştırılır. Ayna doğrusu yatay olunca oyun yeniden oynanır.',
      ],
      hazirlik: 'Yere bantla ızgara ve ayna doğrusu çizin. Robotun elinde tebeşir olabilir: KALEMİ KALDIR kartında tebeşir yerden kalkar.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 6 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 2 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 2 },
        { komut: 'KALEMİ KALDIR', aciklama: 'Tebeşiri kaldır; yürürken çizme.', adet: 1 },
        { komut: 'KALEMİ İNDİR', aciklama: 'Tebeşiri indir; yürürken çiz.', adet: 1 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir şeklin doğruya göre yansımasını kodla çizer: kalemi kaldırıp başlangıç noktasının görüntüsüne gider, yönü yansıtır ve dönüşleri yer değiştirir.',
      dersler: [{ baslik: '1 ders', metin: 'Fişsiz "Ayna yürüyüşü" (10 dk), ardından 1–2. görevler (dikey ve yatay ayna), 3–4. görevler (hatayı bul) ikişerli.' }],
      yanilgilar: [
        { ad: 'Kalemi kaldırmayı unutmak', metin: 'Görüntünün başlangıcına giderken kalemi yerde bırakmak: robot şekilde olmayan bir çizgi çeker. 3. görev bunu hedefler.' },
        { ad: 'Dönüşleri aynen kopyalamak', metin: 'Yansımayı öteleme gibi yapmak: aynı kodu başka yerde çalıştırmak. Aynada sağ ile sol yer değiştirir; 4. görev bunu hedefler.' },
        { ad: 'Yönü yansıtmamak', metin: 'Dikey aynada doğuya bakan robotun görüntüsünün batıya baktığını unutmak. Yatay aynada ise doğu doğu kalır (2. görev).' },
      ],
      sorular: [
        'Bir nokta aynaya 3 birim uzaksa görüntüsü nerede?',
        'Dikey aynada hangi yön değişir, hangisi aynı kalır? Yatay aynada?',
        'Yansıma ile öteleme arasındaki fark nedir?',
        'Şekil aynaya değseydi görüntüsü nasıl olurdu?',
      ],
      celdiriciler: 'Bu ünitede çeldirici blok yoktur. Dönüş bloklarının ikisi de kutudadır; hangisinin gerektiğini aynadaki yön söyler.',
    },
  },
];
