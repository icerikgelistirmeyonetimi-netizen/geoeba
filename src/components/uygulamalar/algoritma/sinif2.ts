/**
 * Algoritma Laboratuvarı — 2. sınıf (Keşif adası): dört ünite.
 *
 * 1. sınıfın bahçesi sürer: numaralı kartlar, kısa yönergeler (kendiliğinden sesli okunur), adım
 * izleri. Yeni olan "… kez tekrarla" kartıdır; sayıyı çocuk değiştirir (kart 2 ile gelir). Başarı
 * cümleleri tekrarı toplamaya ve çarpmaya bağlar (3 kez 2 adım = 6 adım). Son ünitede inşaat dronu
 * küp koyarak kule ve duvar kurar. Kazanımlar projedeki TYMM matematik listesindendir.
 *
 *   1. Kaç kez?          n kez tekrarla; bitişik, 2'şer ve 3'er aralıklı saksılar   MAT.2.2.4 · 2.1.4 · 2.2.5
 *   2. Tekrar eden yol   dönüşlü tekrar (merdiven yolu)                             MAT.2.1.5 · 2.3.6
 *   3. En kısa yol       iki yoldan kısası; kapanan yol; dolambaçlı kodu kısalt      MAT.2.3.6 · 2.2.1 · 2.2.2
 *   4. Küp kule          inşaat dronu: duvar, kule, basamak                          MAT.2.3.2 · 2.2.4 · 2.1.4
 */
import { programKur, type BlokSablonu, type KisaBlok } from './program';
import { bahce, insaatAlani, type Hedef } from './dunya';
import { izOzeti, type Iz } from './yorumlayici';
import { siraListesi } from './degerlendirme';
import { CICEK } from './sinif1';
import type { Gorev, Unite } from './gorev';

const ILERI: BlokSablonu = { tur: 'eylem', eylem: 'ileri' };
const SAGA: BlokSablonu = { tur: 'eylem', eylem: 'sagaDon' };
const SOLA: BlokSablonu = { tur: 'eylem', eylem: 'solaDon' };
const SULA: BlokSablonu = { tur: 'eylem', eylem: 'sula' };
const KOY: BlokSablonu = { tur: 'eylem', eylem: 'koy' };
/** Tekrarla kartı 2 ile gelir; doğru sayıyı çocuk bulur */
const TEKRAR: BlokSablonu = { tur: 'tekrarlaKez', kez: 2 };

const HEDEFE_VAR: Hedef = { cikistaBitir: true };
const HEPSINI_SULA: Hedef = { kurulariSula: true, cikistaBitir: false };
const SULA_VE_VAR: Hedef = { kurulariSula: true, cikistaBitir: true };
const EN_KISA: Hedef = { cikistaBitir: true, enKisaYol: true };
const YAPIYI_KUR: Hedef = { yapiyiKur: true, cikistaBitir: false };

const k = (liste: KisaBlok[], onek: string) => programKur(liste, onek);

// ---------------------------------------------------------------------------
// Başarı cümlelerinin matematiği (sayılar izden)
// ---------------------------------------------------------------------------

/** [2, 2, 2] → "2 + 2 + 2" */
const toplamYazisi = (parcalar: readonly number[]) => parcalar.join(' + ');
/** (3, 2) → "2 + 2 + 2" */
const tekrarliToplam = (n: number, parca: number) => toplamYazisi(Array.from({ length: n }, () => parca));

/** Robotun suladığı anlardaki adım sayıları: aralıklı saksılarda 2, 4, 6 (ritmik sayma) */
function sulamaAdimlari(iz: Iz): number[] {
  const l: number[] = [];
  let adim = 0;
  for (const a of iz.adimlar) {
    if (a.tur !== 'eylem' || a.hata) continue;
    if (a.eylem === 'ileri') adim += 1;
    else if (a.eylem === 'sula') l.push(adim);
  }
  return l;
}

/** "Robot 2., 4. ve 6. adımda suladı. 3 kez 2 adım = 6 adım." */
function aralikCumlesi(iz: Iz): string {
  const o = izOzeti(iz);
  const her = o.sulama ? o.ileri / o.sulama : 0;
  const carpim = Number.isInteger(her) && her > 0 ? ` ${o.sulama} kez ${her} adım = ${o.ileri} adım.` : '';
  return `Robot ${siraListesi(sulamaAdimlari(iz))} adımda suladı.${carpim}`;
}

/** "3 basamak, her basamakta 2 adım: 2 + 2 + 2 = 6 adım." (bir basamakta iki dönüş) */
function merdivenCumlesi(iz: Iz): string {
  const o = izOzeti(iz);
  const basamak = Math.round(o.donus / 2);
  const her = basamak ? o.ileri / basamak : 0;
  if (!basamak || !Number.isInteger(her)) return `Robot ${o.ileri} adım attı.`;
  return `${basamak} basamak, her basamakta ${her} adım: ${tekrarliToplam(basamak, her)} = ${o.ileri} adım.`;
}

/** Soldan sağa kule yükseklikleri (inşaat alanı tek sıra) */
const kuleler = (iz: Iz) => iz.son.kupler.filter((h) => h > 0);

/** Eşit kulelerde "3 kez 2 küp: 2 + 2 + 2 = 6 küp.", değilse "1 + 2 + 3 = 6 küp." */
function kupCumlesi(iz: Iz): string {
  const l = kuleler(iz);
  const toplam = izOzeti(iz).kup;
  if (l.length > 1 && l.every((h) => h === l[0])) return `${l.length} kez ${l[0]} küp: ${tekrarliToplam(l.length, l[0])} = ${toplam} küp.`;
  return `${toplamYazisi(l)} = ${toplam} küp.`;
}

// ---------------------------------------------------------------------------
// 1. Kaç kez?
// ---------------------------------------------------------------------------

const TEKRAR_GOREVLERI: Gorev[] = [
  {
    id: 's2-tekrar-1',
    tur: 'yaz',
    baslik: 'Uzun yol',
    yonerge: 'Robotu çiçeğe götür. Tekrarla kartını kullan.',
    dunya: bahce('b2-tekrar-1', 'Uzun yol', ['B.....H'], { hedefAdi: CICEK }),
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, TEKRAR],
    baslangic: 'bos',
    cozum: k([['kez', 6, ['ileri']]], 's2t1c-'),
    enCokBlok: 2,
    ipuclari: [
      'Çiçeğe kaç adım var? Kareleri say.',
      'Tekrarla kartını koy. İçine tek bir "ileri" kartı koy.',
      'Tekrarla kartındaki sayıyı 6 yap.',
    ],
    basari: (iz) => {
      const n = izOzeti(iz).ileri;
      return `Oldu! Robot ${n} adım attı: ${n} kez ileri.`;
    },
    kazanimlar: ['MAT.2.2.4'],
  },
  {
    id: 's2-tekrar-2',
    tur: 'kurgu',
    baslik: 'Yan yana saksılar',
    yonerge: 'Yolda 6 saksı var. Hepsini sula. Kodunu düzelt.',
    dunya: bahce('b2-tekrar-2', 'Yan yana saksılar', ['BKKKKKK']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA, TEKRAR],
    baslangic: 'onceki',
    cozum: k([['kez', 6, ['ileri', 'sula']]], 's2t2c-'),
    enCokBlok: 3,
    ipuclari: ['Robot her adımdan sonra ne yapmalı?', '"sula" kartını tekrarın içine, "ileri" kartının altına koy.'],
    basari: (iz) => {
      const s = izOzeti(iz).sulama;
      return `Oldu! ${s} kez "ileri, sula": ${s} saksı sulandı.`;
    },
    kazanimlar: ['MAT.2.2.4'],
  },
  {
    id: 's2-tekrar-3',
    tur: 'kurgu',
    baslik: 'İkişer adım',
    yonerge: 'Saksılar şimdi aralıklı. Hepsini sula. Kodunu düzelt.',
    dunya: bahce('b2-tekrar-3', 'İkişer aralıklı saksılar', ['B.K.K.K']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA, TEKRAR],
    baslangic: 'onceki',
    cozum: k([['kez', 3, ['ileri', 'ileri', 'sula']]], 's2t3c-'),
    enCokBlok: 4,
    ipuclari: [
      'Bir saksıdan ötekine kaç adım var?',
      'Tekrarın içi: ileri, ileri, sula.',
      'Kaç saksı var? Tekrarla kartındaki sayı o kadar olmalı.',
    ],
    basari: (iz) => `Oldu! ${aralikCumlesi(iz)}`,
    soru: {
      metin: 'Robot ikişer sayıyor: 2, 4, 6. Bir saksı daha olsaydı robot ona kaç adımda varırdı?',
      birim: 'adım',
      cevap: () => 8,
      sonrasi: '2, 4, 6, 8: ikişer sayınca her seferinde 2 artıyor.',
      yonlendirme: 'Ayak izlerine bak ve 2 kare daha say: 7, 8.',
    },
    kazanimlar: ['MAT.2.1.4', 'MAT.2.2.4'],
  },
  {
    id: 's2-tekrar-4',
    tur: 'hata',
    baslik: 'Kaç tur?',
    yonerge: 'Robot çite çarpıyor. Hatayı bul, düzelt.',
    dunya: bahce('b2-tekrar-4', 'Üçer aralıklı saksılar', ['B..K..K']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA, TEKRAR],
    baslangic: k([['kez', 6, ['ileri', 'ileri', 'ileri', 'sula']]], 's2t4h-'),
    cozum: k([['kez', 2, ['ileri', 'ileri', 'ileri', 'sula']]], 's2t4c-'),
    enCokBlok: 5,
    ipuclari: [
      'Robot kaç saksı suladı? Sonra ne oldu?',
      'Tekrarın içinde 3 adım var. Sayı adımları değil, turları söyler.',
      'Kaç saksı var? Tekrarla kartındaki 6\'yı o sayı yap.',
    ],
    basari: (iz) => `Buldun! ${aralikCumlesi(iz)}`,
    soru: {
      metin: 'Bahçe uzasaydı: 4 kez 3 adım kaç adım eder?',
      birim: 'adım',
      cevap: () => 12,
      sonrasi: '3 + 3 + 3 + 3 = 12. 4 kez 3 = 12.',
      yonlendirme: 'Üçer say: 3, 6, 9…',
    },
    kazanimlar: ['MAT.2.2.4', 'MAT.2.1.4', 'MAT.2.2.5'],
  },
  {
    id: 's2-tekrar-5',
    tur: 'hata',
    baslik: 'Dışarıda kalan kart',
    yonerge: 'Yalnız son saksı sulanıyor. Hatayı bul, düzelt.',
    dunya: bahce('b2-tekrar-5', 'Dört saksı', ['BKKKK']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA, TEKRAR],
    baslangic: k([['kez', 4, ['ileri']], 'sula'], 's2t5h-'),
    cozum: k([['kez', 4, ['ileri', 'sula']]], 's2t5c-'),
    enCokBlok: 3,
    ipuclari: ['"sula" kartı tekrarın içinde mi, dışında mı?', 'Tekrarın içindeki kartlar her turda çalışır. "sula" kartını içeri taşı.'],
    basari: (iz) => `Buldun! "sula" artık her turda çalışıyor: ${izOzeti(iz).sulama} saksı sulandı.`,
    kazanimlar: ['MAT.2.2.4'],
  },
];

// ---------------------------------------------------------------------------
// 2. Tekrar eden yol
// ---------------------------------------------------------------------------

const DESEN_GOREVLERI: Gorev[] = [
  {
    id: 's2-desen-1',
    tur: 'yaz',
    baslik: 'Merdiven',
    yonerge: 'Robot merdivenden inecek. Tekrar eden parçayı bul. Tekrarla kartını kullan.',
    dunya: bahce('b2-desen-1', 'Merdiven', ['B.##', '#..#', '##..', '###H'], { hedefAdi: CICEK }),
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, TEKRAR],
    baslangic: 'bos',
    cozum: k([['kez', 3, ['ileri', 'sagaDon', 'ileri', 'solaDon']]], 's2d1c-'),
    enCokBlok: 5,
    ipuclari: [
      'Bir basamakta robot ne yapıyor? Sesli söyle.',
      'Bir basamak: ileri, sağa dön, ileri, sola dön.',
      'Bu dört kartı tekrarın içine koy. Kaç basamak var?',
    ],
    basari: (iz) => `Oldu! ${merdivenCumlesi(iz)}`,
    kazanimlar: ['MAT.2.1.5', 'MAT.2.3.6'],
  },
  {
    id: 's2-desen-2',
    tur: 'kurgu',
    baslik: 'Uzun merdiven',
    yonerge: 'Merdiven uzadı. Kodunu düzelt.',
    dunya: bahce('b2-desen-2', 'Uzun merdiven', ['B.###', '#..##', '##..#', '###..', '####H'], { hedefAdi: CICEK }),
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, TEKRAR],
    baslangic: 'onceki',
    cozum: k([['kez', 4, ['ileri', 'sagaDon', 'ileri', 'solaDon']]], 's2d2c-'),
    enCokBlok: 5,
    ipuclari: ['Basamakları say. Tekrar eden parça değişti mi?', 'Parça aynı kalır. Yalnız tekrar sayısını değiştir.'],
    basari: (iz) => `Oldu! ${merdivenCumlesi(iz)}`,
    soru: {
      metin: 'Merdiven 5 basamak olsaydı robot kaç adım atardı?',
      birim: 'adım',
      cevap: () => 10,
      sonrasi: '2, 4, 6, 8, 10: her basamak 2 adım.',
      yonlendirme: 'Her basamak 2 adım. İkişer say.',
    },
    kazanimlar: ['MAT.2.1.5'],
  },
  {
    id: 's2-desen-3',
    tur: 'kurgu',
    baslik: 'Basamakta saksı',
    yonerge: 'Her basamakta bir saksı var. Hepsini sula, çiçeğe var.',
    dunya: bahce('b2-desen-3', 'Saksılı merdiven', ['BK###', '#.K##', '##.K#', '###.K', '####H'], { hedefAdi: CICEK }),
    hedef: SULA_VE_VAR,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SAGA, SOLA, SULA, TEKRAR],
    baslangic: 'onceki',
    cozum: k([['kez', 4, ['ileri', 'sula', 'sagaDon', 'ileri', 'solaDon']]], 's2d3c-'),
    enCokBlok: 6,
    ipuclari: ['Robot saksının karesine ne zaman geliyor?', 'Tekrarın içinde, ilk "ileri" kartının altına "sula" kartını koy.'],
    basari: (iz) => `Oldu! ${izOzeti(iz).sulama} saksı sulandı. ${merdivenCumlesi(iz)}`,
    kazanimlar: ['MAT.2.1.5', 'MAT.2.3.6'],
  },
  {
    id: 's2-desen-4',
    tur: 'hata',
    baslik: 'Yukarı çıkan merdiven',
    yonerge: 'Bu merdiven yukarı çıkıyor. Robot çite çarpıyor. Hatayı bul, düzelt.',
    dunya: bahce('b2-desen-4', 'Yukarı çıkan merdiven', ['###H', '##..', '#..#', 'B.##'], { hedefAdi: CICEK }),
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, TEKRAR],
    baslangic: k([['kez', 3, ['ileri', 'sagaDon', 'ileri', 'solaDon']]], 's2d4h-'),
    cozum: k([['kez', 3, ['ileri', 'solaDon', 'ileri', 'sagaDon']]], 's2d4c-'),
    enCokBlok: 5,
    ipuclari: ['İlk basamakta robot hangi yana dönmeli?', 'Dönüş kartlarının yerini değiştir: önce sola dön, sonra sağa dön.'],
    basari: (iz) => `Buldun! Yukarı çıkarken önce sola, sonra sağa. ${merdivenCumlesi(iz)}`,
    kazanimlar: ['MAT.2.3.6'],
  },
  {
    id: 's2-desen-5',
    tur: 'hata',
    baslik: 'Unutulan dönüş',
    yonerge: 'Robot bir dönüşü unutuyor. Hatayı bul, düzelt.',
    dunya: bahce('b2-desen-5', 'Geniş basamaklar', ['B..####', '##...##', '####...', '######H'], { hedefAdi: CICEK }),
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, TEKRAR],
    baslangic: k([['kez', 3, ['ileri', 'ileri', 'sagaDon', 'ileri']]], 's2d5h-'),
    cozum: k([['kez', 3, ['ileri', 'ileri', 'sagaDon', 'ileri', 'solaDon']]], 's2d5c-'),
    enCokBlok: 6,
    ipuclari: [
      'İkinci basamağa gelince robot hangi yöne bakıyor?',
      'Her basamağın sonunda robot yine ilk yöne bakmalı. Tekrarın sonuna "sola dön" ekle.',
    ],
    basari: (iz) => `Buldun! ${merdivenCumlesi(iz)}`,
    kazanimlar: ['MAT.2.1.5', 'MAT.2.3.6'],
  },
];

// ---------------------------------------------------------------------------
// 3. En kısa yol
// ---------------------------------------------------------------------------

/** 1. görevin öbür (uzun) yolu 7 adım; kısa yol kapanınca en kısa yol bu olur */
const UZUN_YOL_1 = 7;
const KISA_YOL_1 = 5;
/** 3. görevde kenardan dolanan az dönüşlü yol */
const KENAR_YOLU = 8;
/** 4. görevdeki hazır kodun yolu */
const DOLAMBAC = 10;

const YOL_GOREVLERI: Gorev[] = [
  {
    id: 's2-yol-1',
    tur: 'yaz',
    baslik: 'İki yol',
    yonerge: 'Çiçeğe iki yol gidiyor. Robotu kısa yoldan götür.',
    dunya: bahce('b2-yol-1', 'İki yol', ['B...', '.##.', '.##H', '....'], { hedefAdi: CICEK, yon: 1 }),
    hedef: EN_KISA,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, TEKRAR],
    baslangic: 'bos',
    cozum: k(['solaDon', ['kez', 3, ['ileri']], 'sagaDon', ['kez', 2, ['ileri']]], 's2y1c-'),
    ipuclari: [
      'İki yolun karelerini parmağınla say. Hangisi daha az?',
      'Üstteki yol 5 adım, alttaki yol 7 adım.',
      'Robot önce sola dönmeli. Sonra 3 adım, sağa dön, 2 adım.',
    ],
    basari: (iz) => `Oldu! Robot çiçeğe ${izOzeti(iz).ileri} adımda vardı. Öbür yol ${UZUN_YOL_1} adım.`,
    soru: {
      metin: `Uzun yol ${UZUN_YOL_1} adım. Kısa yol kaç adım daha az?`,
      birim: 'adım',
      cevap: (iz) => UZUN_YOL_1 - izOzeti(iz).ileri,
      sonrasi: `${UZUN_YOL_1} − ${KISA_YOL_1} = ${UZUN_YOL_1 - KISA_YOL_1}.`,
      yonlendirme: "5'ten sonra 7'ye kadar say: 6, 7. Kaç sayı söyledin?",
    },
    kazanimlar: ['MAT.2.3.6', 'MAT.2.2.1'],
  },
  {
    id: 's2-yol-2',
    tur: 'kurgu',
    baslik: 'Kapanan yol',
    yonerge: 'Kısa yola çalı çıktı. Robotu yine en kısa yoldan götür.',
    dunya: bahce('b2-yol-2', 'Kapanan yol', ['B.#.', '.##.', '.##H', '....'], { hedefAdi: CICEK, yon: 1 }),
    hedef: EN_KISA,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, TEKRAR],
    baslangic: 'onceki',
    cozum: k([['kez', 3, ['ileri']], 'solaDon', ['kez', 3, ['ileri']], 'solaDon', 'ileri'], 's2y2c-'),
    ipuclari: ['Çalı nerede? Robot artık hangi yoldan gidebilir?', 'Alttaki yolu izle: 3 adım, sola dön, 3 adım, sola dön, 1 adım.'],
    basari: (iz) => {
      const n = izOzeti(iz).ileri;
      return `Oldu! Yeni yol ${n} adım. Kapanan yol ${KISA_YOL_1} adımdı: ${n} − ${KISA_YOL_1} = ${n - KISA_YOL_1} adım fazla.`;
    },
    kazanimlar: ['MAT.2.3.6', 'MAT.2.2.1'],
  },
  {
    id: 's2-yol-3',
    tur: 'yaz',
    baslik: 'Çok dönüş, az adım',
    yonerge: 'Bir yolda çok dönüş var, ötekinde az. Robotu kısa yoldan götür.',
    dunya: bahce('b2-yol-3', 'Merdiven mi, kenar mı?', ['B.##', '...#', '.#..', '.##H', '....'], { hedefAdi: CICEK }),
    hedef: EN_KISA,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, TEKRAR],
    baslangic: 'bos',
    cozum: k([['kez', 3, ['ileri', 'sagaDon', 'ileri', 'solaDon']]], 's2y3c-'),
    ipuclari: [
      'İki yolun adımlarını say. Dönüşler adım sayılmaz.',
      `Merdiven yolu 6 adım, kenardaki yol ${KENAR_YOLU} adım.`,
      'Merdiven kodunu hatırla: ileri, sağa dön, ileri, sola dön.',
    ],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! ${o.ileri} adım, ${o.donus} dönüş. Kenardaki yolda dönüş az ama ${KENAR_YOLU} adım var.`;
    },
    kazanimlar: ['MAT.2.3.6', 'MAT.2.2.2'],
  },
  {
    id: 's2-yol-4',
    tur: 'hata',
    baslik: 'Dolambaçlı yol',
    yonerge: 'Robot çiçeğe dolanarak gidiyor. Kısa yolu bul, kodu düzelt.',
    dunya: bahce('b2-yol-4', 'Dolambaçlı yol', ['....H', '.###.', 'B###.', '.###.', '.....'], { hedefAdi: CICEK }),
    hedef: EN_KISA,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, TEKRAR],
    baslangic: k(['sagaDon', ['kez', 2, ['ileri']], 'solaDon', ['kez', 4, ['ileri']], 'solaDon', ['kez', 4, ['ileri']]], 's2y4h-'),
    cozum: k(['solaDon', ['kez', 2, ['ileri']], 'sagaDon', ['kez', 4, ['ileri']]], 's2y4c-'),
    ipuclari: [
      'Robot başta hangi yana dönerse yol kısalır? Üstteki yolu say.',
      'Önce sola dön, 2 adım git. Sonra sağa dön, 4 adım git.',
    ],
    basari: (iz) => `Buldun! Robot artık çiçeğe ${izOzeti(iz).ileri} adımda varıyor.`,
    soru: {
      metin: `Eski yol ${DOLAMBAC} adımdı. Yeni yol kaç adım daha kısa?`,
      birim: 'adım',
      cevap: (iz) => DOLAMBAC - izOzeti(iz).ileri,
      sonrasi: `${DOLAMBAC} − 6 = 4. Robot 4 adım kazandı.`,
      yonlendirme: "6'dan sonra 10'a kadar say: 7, 8, 9, 10. Kaç sayı söyledin?",
    },
    kazanimlar: ['MAT.2.3.6', 'MAT.2.2.1'],
  },
];

// ---------------------------------------------------------------------------
// 4. Küp kule (inşaat dronu)
// ---------------------------------------------------------------------------

const KULE_ARACLARI: BlokSablonu[] = [ILERI, KOY, TEKRAR];

const KULE_GOREVLERI: Gorev[] = [
  {
    id: 's2-kule-1',
    tur: 'yaz',
    baslik: 'Alçak duvar',
    yonerge: 'Dron alçak bir duvar kuracak. Her kareye bir küp koy.',
    dunya: insaatAlani('i2-kule-1', 'Alçak duvar', ['B1111']),
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: KULE_ARACLARI,
    baslangic: 'bos',
    cozum: k([['kez', 4, ['ileri', 'koy']]], 's2k1c-'),
    enCokBlok: 3,
    ipuclari: [
      'Dron her karede ne yapmalı?',
      'Tekrarın içine iki kart koy: ileri, küp koy.',
      'Kaç kare var? Tekrarla kartındaki sayıyı o kadar yap.',
    ],
    basari: (iz) => `Oldu! ${kupCumlesi(iz)}`,
    kazanimlar: ['MAT.2.3.2', 'MAT.2.1.4'],
  },
  {
    id: 's2-kule-2',
    tur: 'kurgu',
    baslik: 'Tek kule',
    yonerge: 'Şimdi tek bir kule kur: 3 küp üst üste. Kodunu düzelt.',
    dunya: insaatAlani('i2-kule-2', 'Tek kule', ['B.3..']),
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: KULE_ARACLARI,
    baslangic: 'onceki',
    cozum: k(['ileri', 'ileri', ['kez', 3, ['koy']]], 's2k2c-'),
    enCokBlok: 4,
    ipuclari: ['Kule kaçıncı karede? Dron oraya kaç adımda varır?', 'Önce iki kez ileri git. Sonra tekrarın içine yalnız "küp koy" koy.'],
    basari: (iz) => {
      const n = izOzeti(iz).kup;
      return `Oldu! Dron ${n} kez küp koydu: kule ${n} küp yüksekliğinde.`;
    },
    kazanimlar: ['MAT.2.3.2'],
  },
  {
    id: 's2-kule-3',
    tur: 'kurgu',
    baslik: 'Basamak kuleler',
    yonerge: 'Kuleler 1, 2 ve 3 küp. Merdiven gibi kur. Kodunu düzelt.',
    dunya: insaatAlani('i2-kule-3', 'Basamak kuleler', ['B123']),
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: KULE_ARACLARI,
    baslangic: 'onceki',
    cozum: k(['ileri', 'koy', 'ileri', ['kez', 2, ['koy']], 'ileri', ['kez', 3, ['koy']]], 's2k3c-'),
    ipuclari: ['Her kulede kaç küp var? Say: 1, 2, 3.', 'Her kulede önce ilerle, sonra o kadar küp koy.'],
    basari: (iz) => `Oldu! ${kupCumlesi(iz)}`,
    kazanimlar: ['MAT.2.3.2'],
  },
  {
    id: 's2-kule-4',
    tur: 'kurgu',
    baslik: 'İki katlı duvar',
    yonerge: 'Bu duvar iki katlı. Kodunu düzelt. Tekrarla kartını kullan.',
    dunya: insaatAlani('i2-kule-4', 'İki katlı duvar', ['B222']),
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: KULE_ARACLARI,
    baslangic: 'onceki',
    cozum: k([['kez', 3, ['ileri', 'koy', 'koy']]], 's2k4c-'),
    enCokBlok: 4,
    ipuclari: ['Her karede kaç küp var?', 'Tekrarın içi: ileri, küp koy, küp koy. Kaç kez?'],
    basari: (iz) => `Oldu! ${kupCumlesi(iz)}`,
    soru: {
      metin: 'Duvar 5 kare uzun olsaydı kaç küp gerekirdi?',
      birim: 'küp',
      cevap: () => 10,
      sonrasi: '2, 4, 6, 8, 10: 5 kez 2 küp = 10 küp.',
      yonlendirme: 'Her karede 2 küp. İkişer say: 2, 4, 6…',
    },
    kazanimlar: ['MAT.2.2.4', 'MAT.2.1.4'],
  },
  {
    id: 's2-kule-5',
    tur: 'hata',
    baslik: 'Alçak kalan duvar',
    yonerge: 'Duvar alçak kalıyor. Hatayı bul, düzelt.',
    dunya: insaatAlani('i2-kule-5', 'Uzun iki katlı duvar', ['B2222']),
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: KULE_ARACLARI,
    baslangic: k([['kez', 4, ['ileri', 'koy']]], 's2k5h-'),
    cozum: k([['kez', 4, ['ileri', 'koy', 'koy']]], 's2k5c-'),
    enCokBlok: 4,
    ipuclari: ['Her kulede kaç küp olmalı? Tekrarın içinde kaç "küp koy" var?', 'Tekrarın içine bir "küp koy" kartı daha ekle.'],
    basari: (iz) => `Buldun! ${kupCumlesi(iz)}`,
    kazanimlar: ['MAT.2.2.4', 'MAT.2.3.2'],
  },
  {
    id: 's2-kule-6',
    tur: 'hata',
    baslik: 'Fazla küp',
    yonerge: 'Dron fazladan küp koyuyor. Hatayı bul, düzelt.',
    dunya: insaatAlani('i2-kule-6', 'İki kule', ['B24']),
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: KULE_ARACLARI,
    baslangic: k(['ileri', ['kez', 2, ['koy']], 'ileri', ['kez', 5, ['koy']]], 's2k6h-'),
    cozum: k(['ileri', ['kez', 2, ['koy']], 'ileri', ['kez', 4, ['koy']]], 's2k6c-'),
    ipuclari: ['Hangi kulede fazla küp var? O kule kaç küp olmalı?', 'İkinci tekrarla kartındaki sayıyı 4 yap.'],
    basari: (iz) => `Buldun! ${kupCumlesi(iz)}`,
    kazanimlar: ['MAT.2.3.2'],
  },
];

// ---------------------------------------------------------------------------
// Üniteler
// ---------------------------------------------------------------------------

const ORTAK = { sinif: 2, kademe: 'Keşif adası', gorunum: 'kart' as const, sesliYonerge: true, sure: '1 ders saati' };

export const SINIF2: readonly Unite[] = [
  {
    ...ORTAK,
    tema: 'Okul bahçesi',
    id: 's2-tekrar',
    no: 1,
    ad: 'Kaç kez?',
    yeniKavram: '"… kez tekrarla": aynı parçayı bir kez yazıp sayıyla tekrarlamak',
    oncedenBilinen: 'Örüntü (1. sınıf, 4. ünite)',
    kalip: 'n-kez',
    kazanimlar: ['MAT.2.2.4', 'MAT.2.1.4', 'MAT.2.2.5'],
    gorevler: TEKRAR_GOREVLERI,
    fissiz: {
      ad: 'Tekrarla kartı',
      amac: 'Aynı kartı tekrar tekrar dizmek yerine bir kez koyup kaç kez yapılacağını söylemek.',
      sure: '10 dakika',
      roller: [
        'Bir öğrenci robot olur; yalnız gösterilen kartı uygular.',
        'Bir öğrenci sayıcı olur; her turda bir parmağını kaldırır.',
        'Sınıf programcıdır; kartları tahtaya dizer.',
      ],
      adimlar: [
        'Yere 6 karelik düz bir yol yapın; yolun sonuna bir çiçek resmi koyun.',
        'Sınıf önce 6 İLERİ kartını yan yana dizer. Öğretmen sorar: "Daha kısa yazabilir miyiz?"',
        'TEKRARLA kartının içine tek bir İLERİ koyun, sayı olarak 6 yazın. Robot her turda bir adım atar; sayıcı turları sayar.',
        'Saksıları ikişer kare arayla dizin. Sınıf yeni parçayı bulur: İLERİ, İLERİ, SULA. Robot yürürken sınıf ikişer sayar: 2, 4, 6.',
        'SULA kartını tekrarın dışına, altına koyun. Sınıf ne olacağını tahmin eder; robot uygular ve yalnız son saksıyı sular.',
      ],
      hazirlik:
        'Kartları kesin. TEKRARLA kartının üstüne sayıyı yapışkan notla yazın; tekrarlanacak kartları TEKRARLA kartının altına, çerçevenin içine dizin.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 6 },
        { komut: 'SULA', aciklama: 'Bulunduğun karedeki saksıyı sula.', adet: 2 },
        { komut: 'TEKRARLA', aciklama: 'İçindeki kartları üstündeki sayı kadar yeniden uygula.', adet: 1 },
      ],
    },
    ogretmenNotu: {
      hedef:
        'Öğrenci tekrar eden parçayı bir kez yazar ve kaç kez tekrarlanacağını sayıyla söyler; tekrar sayısını adım sayısından ayırır ve tekrarı toplamaya, çarpmaya bağlar (3 kez 2 adım = 6 adım).',
      dersler: [
        {
          baslik: '1 ders',
          metin:
            'Fişsiz "Tekrarla kartı" (10 dk), ardından 1–3. görevler sınıfça; 4–5. görevler (hatayı bul) ikişerli. 3. görevde ikişer, 4. görevde üçer ritmik sayılır; 4. görevdeki soru çarpmaya bağlanır (4 kez 3 adım = 12 adım).',
        },
      ],
      yanilgilar: [
        {
          ad: 'Tekrar sayısına adım sayısını yazmak',
          metin: '6 adım var diye "6 kez" yazmak; oysa tekrarın içinde 3 adım vardır ve 2 tur yeter. 4. görev bunu hedefler: robot iki saksıyı sular, 3. turda çite çarpar.',
        },
        {
          ad: 'Kartı tekrarın dışında bırakmak',
          metin: 'Tekrarın altına konan kartın da her turda çalıştığını sanmak. 5. görevde "sula" dışarıda kalır; yalnız son saksı sulanır, ileti susuz kalan saksıları sıra sayısıyla söyler.',
        },
        {
          ad: 'Sayıyı değiştirmeyi unutmak',
          metin: 'Tekrarla kartı 2 ile gelir. Sayı değiştirilmezse robot erken durur; ileti çiçeğin kaç kare uzakta kaldığını söyler.',
        },
      ],
      sorular: [
        'Tekrarla kartının içinde kaç kart var? Kaç kez çalıştı?',
        'Robot kaç adım attı? Bunu nasıl hesapladın?',
        'Saksılar iki adım arayla dizilince robot hangi adımlarda suladı?',
        '4 kez 3 adım kaç adım eder?',
      ],
      celdiriciler:
        'Tekrarla kartı hep 2 ile gelir; doğru sayıyı çocuk bulur. 1. görevde "sula" kartı yoktur, sonra gelir. Altı ayrı "ileri" kartı işi yapsa da görevi bitirmez (en çok blok sınırı): tekrarla kartı istenir.',
    },
  },
  {
    ...ORTAK,
    tema: 'Okul bahçesi',
    id: 's2-desen',
    no: 2,
    ad: 'Tekrar eden yol',
    yeniKavram: 'Desenli tekrar: dönüşlü bir parçayı (basamağı) tekrarlamak',
    oncedenBilinen: '"… kez tekrarla" (1. ünite), sağa ve sola dönmek (1. sınıf)',
    kalip: 'desenli-tekrar',
    kazanimlar: ['MAT.2.1.5', 'MAT.2.3.6'],
    gorevler: DESEN_GOREVLERI,
    fissiz: {
      ad: 'Merdiven dansı',
      amac: 'Dönüş içeren bir parçanın yol boyunca tekrar ettiğini bedenle fark etmek.',
      sure: '10 dakika',
      roller: ['Bir öğrenci robot olur.', 'Sınıf programcıdır; tekrar eden parçayı bulur.'],
      adimlar: [
        'Yere bantla 3 basamaklı bir merdiven yolu yapın: bir kare ileri, bir kare yana, yine bir kare ileri…',
        'Robot yolu yürür; sınıf her hareketi kartla tahtaya dizer.',
        'Sınıf tekrar eden parçayı bulur ve çerçeveler: İLERİ, SAĞA DÖN, İLERİ, SOLA DÖN.',
        'Parçayı TEKRARLA kartının içine koyun, 3 yazın. Robot yeniden yürür; sınıf basamakları sayar.',
        'Robotu merdivenin öbür ucundan yukarı çıkarın. Sınıf dönüşlerin yer değiştirdiğini keşfeder.',
      ],
      hazirlik: 'Bant ve kartlar. Robot kendi sağına ve soluna döner; her basamağın sonunda yine ilk yöne bakar.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 4 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 2 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 2 },
        { komut: 'TEKRARLA', aciklama: 'İçindeki kartları üstündeki sayı kadar yeniden uygula.', adet: 1 },
      ],
    },
    ogretmenNotu: {
      hedef:
        'Öğrenci dönüş içeren bir parçayı (bir basamak) bulur ve tekrarla kartının içine koyar; basamak sayısı ile adım sayısı arasındaki ilişkiyi görür (3 basamak, her biri 2 adım: 2 + 2 + 2 = 6).',
      dersler: [
        {
          baslik: '1 ders',
          metin: 'Fişsiz "Merdiven dansı" (10 dk), ardından 1–3. görevler; 4–5. görevler (hatayı bul) ikişerli. 2. görevdeki soru şekil örüntüsünden sayıya geçer (5 basamak = 10 adım).',
        },
      ],
      yanilgilar: [
        {
          ad: 'Dönüşleri ters koymak',
          metin: 'İnen merdivenin kodunu çıkan merdivende kullanmak. Yukarı çıkarken önce sola, sonra sağa dönülür; 4. görevde robot ilk basamakta çite çarpar.',
        },
        {
          ad: 'Parçanın sonundaki dönüşü unutmak',
          metin: 'Basamağın sonunda robot yeniden ilk yöne dönmelidir. Bu dönüş unutulursa ikinci turda robot yanlış yöne gider; 5. görevde çalıya çarpar.',
        },
      ],
      sorular: [
        'Bir basamakta robot hangi kartları kullanıyor?',
        'Merdivende kaç basamak var? Robot kaç adım attı?',
        'Merdiven yukarı çıkınca dönüşler nasıl değişir?',
        'Merdiven 5 basamak olsaydı robot kaç adım atardı?',
      ],
      celdiriciler:
        'Araç kutusunda hem "sağa dön" hem "sola dön" vardır; dönüşleri ters koyan çocuk çite çarpar ve nedenini görür. Tekrarla kartı 2 ile gelir; basamak sayısını çocuk bulur.',
    },
  },
  {
    ...ORTAK,
    tema: 'Okul bahçesi',
    id: 's2-yol',
    no: 3,
    ad: 'En kısa yol',
    yeniKavram: 'En kısa yol: yolları sayıp karşılaştırmak',
    oncedenBilinen: 'Adım sayma ve dönüşler (1. sınıf), tekrarla (1–2. ünite)',
    kalip: 'en-kisa',
    kazanimlar: ['MAT.2.3.6', 'MAT.2.2.1', 'MAT.2.2.2'],
    gorevler: YOL_GOREVLERI,
    fissiz: {
      ad: 'Kısa yol avı',
      amac: 'Hedefe giden yolları adım adım sayıp karşılaştırmak.',
      sure: '15 dakika',
      roller: ['İki öğrenci robot olur.', 'Sınıf iki gruba ayrılır; her grup bir yolu kartlarla yazar.'],
      adimlar: [
        'Yere 4 × 4 karelik bir ızgara çizin. Birkaç kareye çalı yerine kitap koyun; bir köşeye çiçek resmi koyun.',
        'İki grup çiçeğe giden farklı iki yol yazar.',
        'Robotlar yürür; sınıf adımları sayar. Dönüşler adım sayılmaz.',
        'Sınıf farkı çıkarmayla bulur: 7 − 5 = 2 adım.',
        'Kısa yola bir kitap koyun; gruplar yeni en kısa yolu bulur.',
      ],
      hazirlik: 'Tebeşir ya da bant, birkaç kitap ve kartlar. Tahtaya iki yolun adım sayısını yan yana yazın.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 8 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 2 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 2 },
        { komut: 'TEKRARLA', aciklama: 'İçindeki kartları üstündeki sayı kadar yeniden uygula.', adet: 2 },
      ],
    },
    ogretmenNotu: {
      hedef:
        'Öğrenci hedefe giden yolları adım adım sayar, karşılaştırır ve en kısasını seçer; yol kapanınca yeniden plan yapar; iki yol arasındaki farkı çıkarmayla bulur.',
      dersler: [
        {
          baslik: '1 ders',
          metin: 'Fişsiz "Kısa yol avı" (15 dk), ardından 1–3. görevler; 4. görev (hatayı bul) ikişerli. 1. ve 4. görevlerdeki sorular iki yolun farkını çıkarmayla buldurur.',
        },
      ],
      yanilgilar: [
        {
          ad: 'İlk görülen yolu seçmek',
          metin: 'Robotun baktığı yöndeki yol hep kısa değildir. 1. görevde robot aşağı bakar ama kısa yol üsttedir; uzun yolu seçen çocuk "7 adımda vardı, daha kısa bir yol var: 5 adım" iletisini görür.',
        },
        {
          ad: 'Dolanmayı fark etmemek',
          metin: 'Çiçeğe varan her kodu doğru sanmak. 4. görevde hazır kod çiçeğe 10 adımda varır; ileti 6 adımlık bir yol olduğunu söyler.',
        },
        {
          ad: 'Az dönüşü kısa yol sanmak',
          metin: 'Dönüşler adım değildir. 3. görevde çok dönüşlü merdiven yolu 6 adım, az dönüşlü kenar yolu 8 adımdır.',
        },
      ],
      sorular: [
        'İki yolu nasıl karşılaştırdın?',
        'Kısa yol kaç adım daha az? Nasıl hesapladın?',
        'Yol kapanınca ne yaptın?',
        'Dönüşler de adım sayılır mı?',
      ],
      celdiriciler:
        'Robotun ilk baktığı yön uzun yola açılır (1. görev); bu kasıtlıdır. Tekrarla kartı isteğe bağlıdır; kısa yolu daha az kartla yazmayı sağlar.',
    },
  },
  {
    ...ORTAK,
    tema: 'İnşaat alanı',
    id: 's2-kule',
    no: 4,
    ad: 'Küp kule',
    yeniKavram: 'Kat kat kurmak: küpleri yan yana ve üst üste dizmek',
    oncedenBilinen: '"… kez tekrarla" (1. ünite)',
    kalip: 'katman',
    kazanimlar: ['MAT.2.3.2', 'MAT.2.2.4', 'MAT.2.1.4'],
    sure: '2 ders saati',
    gorevler: KULE_GOREVLERI,
    fissiz: {
      ad: 'Küp kule ustası',
      amac: 'Bir yapıyı küp küp, alttan üste kurmak ve küpleri saymak.',
      sure: '15 dakika',
      roller: ['Bir öğrenci dron olur; eliyle küpleri taşır.', 'Sınıf programcıdır; kartları tahtaya dizer ve küpleri sayar.'],
      adimlar: [
        'Masaya 4 karelik bir kâğıt şerit koyun. İlk kare dronun başladığı yerdir; öbür karelere 1, 2 ve 3 yazın.',
        'Sınıf İLERİ ve KÜP KOY kartlarıyla programı kurar; TEKRARLA kartıyla kuleyi yükseltir.',
        'Dron kartları uygular; her küpte sınıf sayar. Toplam: 1 + 2 + 3 = 6 küp.',
        'Aynı 6 küple iki katlı bir duvar kurun: 3 kez 2 küp.',
        'Sınıf karşılaştırır: 1 + 2 + 3 ile 2 + 2 + 2 aynı sayı, yapılar farklı.',
      ],
      hazirlik: 'Birim küpler ya da oyuncak bloklar, kâğıt şerit ve kartlar. Dron önce ilerler, sonra küp koyar; başladığı kareye küp koymaz.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir kare ileri uç.', adet: 4 },
        { komut: 'KÜP KOY', aciklama: 'Bulunduğun kareye bir küp koy.', adet: 6 },
        { komut: 'TEKRARLA', aciklama: 'İçindeki kartları üstündeki sayı kadar yeniden uygula.', adet: 2 },
      ],
    },
    ogretmenNotu: {
      hedef:
        'Öğrenci küpleri yan yana ve üst üste koyarak yapı kurar; tekrarla kartıyla kuleyi kat kat yükseltir; küpleri sayar ve eşit kuleleri çarpmaya bağlar (3 kez 2 küp = 6 küp).',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "Küp kule ustası" (15 dk), ardından 1–3. görevler: duvar, tek kule, basamak kuleler.' },
        {
          baslik: '2. ders',
          metin: '4. görev (iki katlı duvar) ve 5–6. görevler (hatayı bul) ikişerli. Ders "1 + 2 + 3 ile 3 kez 2 neden aynı sayı?" sorusuyla kapanır.',
        },
      ],
      yanilgilar: [
        {
          ad: 'Tekrarın içinde kart eksik',
          metin: 'Her kulede 2 küp gerekirken tekrarın içine tek "küp koy" koymak. Eksik her turda tekrarlanır: 5. görevde ileti "Yapıda 4 küp eksik (4 kulede)" der.',
        },
        {
          ad: 'Fazla saymak',
          metin: 'Kule yüksekliğinden fazla küp koymak. 6. görevde 4 küplük kuleye 5 küp konur; dron beşinci küpte durur, ileti kulenin kaç küp olması gerektiğini söyler.',
        },
        {
          ad: 'İlerlemeden koymak',
          metin: 'Tekrarın içinde "küp koy" kartını "ileri"den önce koymak: dron ilk küpü başladığı boş kareye koyar. İleti "burada küp olmayacaktı" der.',
        },
      ],
      sorular: [
        'Kulede kaç küp var? Nasıl saydın?',
        'Basamak kulelerde ve iki katlı duvarda kaçar küp var? İkisi neden aynı?',
        'Tekrarın içine bir küp daha koyunca kaç küp artar?',
        '5 kez 2 küp kaç küp eder?',
      ],
      celdiriciler: 'Bu ünitede dönüş kartı yoktur; dron düz bir sıra boyunca uçar. Dikkat küp sayısı ve tekrarın içi üzerindedir.',
    },
  },
];
