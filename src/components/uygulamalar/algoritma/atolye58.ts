/**
 * Algoritma Laboratuvarı — Atölye projeleri, 5–8. sınıf (her sınıfta üç açık uçlu proje).
 *
 * Atölye adım adım görev değildir: yönerge amacı söyler, yöntemi söylemez. Kod birkaç dünyada sınanır:
 * ★ ilk dünyada doğru · ★★ bütün dünyalarda doğru · ★★★ ayrıca en çok `enCokBlok` blok. Her projenin
 * dünyaları gerçekten farklıdır (sıra uzunluğu, bitki durumları, dünyanın verdiği n, k, r, m, b, en, boy);
 * ilk dünyaya göre sayılmış kod öteki dünyalarda bozulur. Hedef bütün dünyalar için ortaktır; bu yüzden
 * sonuç dünyanın kendisinde denetlenir (bütün olgunlar toplandı, bütün tarla ekildi, yapı kuruldu,
 * çizgiler çizildi, noktalar kondu). Her proje sınıfın bildiği bloklarla kurulur.
 *
 *   5. sınıf  a5-hasattan-tohuma   bahçe    sayaç + "sayaç kez tekrarla" + bitene kadar + eğer
 *             a5-gokdelen          inşaat   kat değişkeniyle büyüyen kuleler, çıkışa kadar
 *             a5-merdiven-tarla    tarla    sıraları 1, 3, 5 … kare olan tarla (kat ← kat + 2)
 *   6. sınıf  a6-gubre-takvimi     sera     her k. saksı (sıra mod k), kuru toprağa su
 *             a6-piramit           inşaat   1, 3, … 2n − 1, … 3, 1 kuleler (genel terim, n)
 *             a6-sarmal-pist       saha     1, 2, … n birimlik parçalardan sarmal (genel terim)
 *   7. sınıf  a7-sera-bloklari     bahçe    en × boy bitkilik blok: iç içe tarama, iki karar
 *             a7-tribun            inşaat   üç iç içe tekrar; arkadan öne alçalan sıralar
 *             a7-gol-yansimasi     saha     yatay aynada sur deseninin yansıması (n diş)
 *   8. sınıf  a8-dogru-grafigi     düzlem   y = m·x + b doğrusunun n noktası
 *             a8-site-insaati      inşaat   tanımla BLOK: n eş blok, aralarında ara kadar boşluk
 *             a8-uslu-sera         sera     r'nin kuvvetleri olan sıralar (x ölçümü, kuvvet × r)
 */
import { ifadeKur, kosulKur, programKur, type BlokSablonu, type EylemTuru, type KisaBlok } from './program';
import { bahce, insaatAlani, saha, saksiSirasi, type DunyaTanimi } from './dunya';
import type { Atolye } from './gorev';

const k = (liste: KisaBlok[], onek: string) => programKur(liste, onek);
const E = (eylem: EylemTuru): BlokSablonu => ({ tur: 'eylem', eylem });

const ILERI = E('ileri');
const SAGA = E('sagaDon');
const SOLA = E('solaDon');
const SULA = E('sula');
const TOPLA = E('topla');
const GUBRE = E('gubreVer');
const EK = E('ek');
const KOY = E('koy');
const ISARETLE = E('isaretle');
const KALDIR = E('kalemKaldir');
const INDIR = E('kalemIndir');
const CIKISA_KADAR: BlokSablonu = { tur: 'tekrarlaKadar', kosul: 'cikistayim' };
const EGER_KURU: BlokSablonu = { tur: 'eger', kosul: 'toprakKuru' };
const EGER_KIRMIZI: BlokSablonu = { tur: 'eger', kosul: 'domatesKirmizi' };
const kez = (n: number): BlokSablonu => ({ tur: 'tekrarlaKez', kez: n });
/** İfadeyle verilen tekrar sayısı (öğrenci işlenenleri ve işlemi değiştirebilir) */
const kezIfade = (i: Parameters<typeof ifadeKur>[0]): BlokSablonu => ({ tur: 'tekrarlaKez', kez: 1, kezIfade: ifadeKur(i) });
const ata = (degisken: string, i: Parameters<typeof ifadeKur>[0]): BlokSablonu => ({ tur: 'ata', degisken, ifade: ifadeKur(i) });

// ---------------------------------------------------------------------------
// Nokta ağı (saha, koordinat düzlemi) yardımcısı
// ---------------------------------------------------------------------------

type Nokta = readonly [number, number];

/**
 * Nokta ağı satırları. Noktalar (x, y); `yukari` ise y aşağıdan yukarı artar (koordinat düzlemi, en alt
 * sıra y = 0), değilse satır sırasıdır. Hazır yollar '=' / '!', çizilecekler '-' / '|', noktalar 'o'.
 */
function ag(en: number, boy: number, bas: Nokta, o: { hazir?: Nokta[][]; cizilecek?: Nokta[][]; noktalar?: Nokta[] }, yukari = false): string[] {
  const s: string[][] = Array.from({ length: 2 * boy - 1 }, (_, r) => Array.from({ length: 2 * en - 1 }, (_, c) => (r % 2 === 0 && c % 2 === 0 ? '.' : ' ')));
  const satir = (y: number) => (yukari ? boy - 1 - y : y);
  const icinde = ([x, y]: Nokta) => {
    if (x < 0 || y < 0 || x >= en || y >= boy) throw new Error(`Ağın dışında: (${x}, ${y})`);
  };
  const yol = (liste: Nokta[], yatay: string, dikey: string) => {
    for (let i = 1; i < liste.length; i++) {
      let [x, y] = liste[i - 1];
      const [x2, y2] = liste[i];
      if (x !== x2 && y !== y2) throw new Error(`Çapraz çizgi: ${liste[i - 1]} → ${liste[i]}`);
      while (x !== x2 || y !== y2) {
        const nx = x + Math.sign(x2 - x);
        const ny = y + Math.sign(y2 - y);
        icinde([nx, ny]);
        if (ny === y) s[2 * satir(y)][2 * Math.min(x, nx) + 1] = yatay;
        else s[2 * Math.min(satir(y), satir(ny)) + 1][2 * x] = dikey;
        x = nx;
        y = ny;
      }
    }
  };
  (o.hazir ?? []).forEach((l) => yol(l, '=', '!'));
  (o.cizilecek ?? []).forEach((l) => yol(l, '-', '|'));
  for (const p of o.noktalar ?? []) {
    icinde(p);
    s[2 * satir(p[1])][2 * p[0]] = 'o';
  }
  icinde(bas);
  const r = 2 * satir(bas[1]);
  s[r][2 * bas[0]] = s[r][2 * bas[0]] === 'o' ? 'b' : 'B';
  return s.map((satirlar) => satirlar.join(''));
}

// ===========================================================================
// 5. sınıf (blok): sayaç, toplayıcı, tarla, örüntünün kuralı
// ===========================================================================

// --- Hasattan tohuma: olgunları topla ve say, sonra o kadar tohum ek --------

/** Üst sıra domatesler (B … H), alt sıra tarla; tohumlar H'nin altından batıya doğru */
const HASAT = { boyaTuru: 'ek' as const, adimIzi: false };
const HASAT_1 = bahce('a5-hasat-d1', 'Kısa sıra', ['BRYRRYH', '...ooo.'], { ...HASAT, sinar: '5 domates, 3 olgun' });
const HASAT_2 = bahce('a5-hasat-d2', 'Uzun sıra', ['BYRRYRRYRH', '....ooooo.'], { ...HASAT, sinar: '8 domates, 5 olgun' });
const HASAT_3 = bahce('a5-hasat-d3', 'Hepsi olgun', ['BRRRRH', '.oooo.'], { ...HASAT, sinar: '4 domates, hepsi olgun' });
const HASAT_4 = bahce('a5-hasat-d4', 'Tek olgun', ['BYYRYYYH', '......o.'], { ...HASAT, sinar: '6 domates, 1 olgun' });

const A5_HASAT: Atolye = {
  id: 'a5-hasattan-tohuma',
  sinif: 5,
  ad: 'Hasattan tohuma',
  aciklama: 'Olgun domatesleri topla ve say; tarlaya topladığın kadar tohum ek.',
  yonerge: 'Robot sıradaki bütün olgun domatesleri toplasın. Sonra alttaki tarlaya, topladığı her domates için bir tohum eksin. Sıralar farklı uzunlukta; kodun her bahçede çalışmalı.',
  dunyalar: [HASAT_1, HASAT_2, HASAT_3, HASAT_4],
  hedef: { kirmizilariTopla: true, boyamayiTamamla: true, cikistaBitir: false },
  bitkiAdi: 'bitki',
  aracKutusu: [ILERI, SAGA, SOLA, TOPLA, EK, CIKISA_KADAR, EGER_KIRMIZI, ata('sayaç', 0), ata('sayaç', ['sayaç', '+', 1]), kez(4), kezIfade('sayaç')],
  enCokBlok: 13,
  cozum: k(
    [
      ['ata', 'sayaç', 0],
      ['kadar', 'cikistayim', ['ileri', ['eger', 'domatesKirmizi', ['topla', ['ata', 'sayaç', ['sayaç', '+', 1]]]]]],
      'sagaDon',
      'ileri',
      'sagaDon',
      ['kez', 'sayaç', ['ileri', 'ek']],
    ],
    'a51c-'
  ),
  degiskenler: ['sayaç'],
  kazanimlar: ['MAT.5.2.4'],
  kalip: 'sayac',
  ipucu: 'Toplarken say; ekerken saydığın sayı kadar tekrarla.',
  gorunum: 'blok',
};

// --- Gökdelen caddesi: 1, 2, 3 … katlı binalar, sarı çıkışa kadar ---------

const GOKDELEN_1 = insaatAlani('a5-gokdelen-d1', 'Dört bina', ['B1234H'], { sinar: '1, 2, 3, 4' });
const GOKDELEN_2 = insaatAlani('a5-gokdelen-d2', 'Altı bina', ['B123456H'], { sinar: 'Cadde uzun' });
const GOKDELEN_3 = insaatAlani('a5-gokdelen-d3', 'Üç bina', ['B123H'], { sinar: 'Cadde kısa' });
const GOKDELEN_4 = insaatAlani('a5-gokdelen-d4', 'Beş bina', ['B12345H'], { sinar: 'Beş bina' });

const A5_GOKDELEN: Atolye = {
  id: 'a5-gokdelen',
  sinif: 5,
  ad: 'Gökdelen caddesi',
  aciklama: 'Her bina bir öncekinden bir kat yüksek. Cadde uzasa da kodun çalışsın.',
  yonerge: 'Dron caddeye binaları kursun: ilk bina 1 katlı, her bina bir öncekinden 1 kat yüksek. Dron sarı çıkış karesine varınca iş biter. Caddeler farklı uzunlukta.',
  dunyalar: [GOKDELEN_1, GOKDELEN_2, GOKDELEN_3, GOKDELEN_4],
  hedef: { yapiyiKur: true, cikistaBitir: true },
  bitkiAdi: 'bitki',
  aracKutusu: [ILERI, KOY, CIKISA_KADAR, kez(4), kezIfade('kat'), ata('kat', 1), ata('kat', ['kat', '+', 1])],
  enCokBlok: 8,
  cozum: k([['ata', 'kat', 1], 'ileri', ['kadar', 'cikistayim', [['kez', 'kat', ['koy']], ['ata', 'kat', ['kat', '+', 1]], 'ileri']]], 'a52c-'),
  degiskenler: ['kat'],
  kazanimlar: ['MAT.5.2.3', 'MAT.5.2.4'],
  kalip: 'kural',
  ipucu: 'Kat sayısını bir değişkende tut; her binadan sonra onu büyüt.',
  gorunum: 'blok',
};

// --- Merdiven tarla: sıralar 1, 3, 5 … kare; robot sarı çıkışta biter -------

/** m sıralı merdiven tarla: y. sırada 2y + 1 kare (x = 0 … 2y); çıkış m. sıranın başında */
function merdivenTarla(id: string, ad: string, m: number): DunyaTanimi {
  const en = 2 * m;
  const satirlar = Array.from({ length: m }, (_, y) => ('o'.repeat(2 * y + 1) + '.'.repeat(en - 2 * y - 1)).replace(/^o/, y === 0 ? 'b' : 'o'));
  return bahce(id, ad, [...satirlar, 'H' + '.'.repeat(en - 1)], { boyaTuru: 'ek', adimIzi: false, sinar: `${m} sıra: ${m} × ${m} = ${m * m} kare` });
}
const MERDIVEN_1 = merdivenTarla('a5-merdiven-d1', 'Dört sıra', 4);
const MERDIVEN_2 = merdivenTarla('a5-merdiven-d2', 'Beş sıra', 5);
const MERDIVEN_3 = merdivenTarla('a5-merdiven-d3', 'Üç sıra', 3);
const MERDIVEN_4 = merdivenTarla('a5-merdiven-d4', 'İki sıra', 2);

const A5_MERDIVEN: Atolye = {
  id: 'a5-merdiven-tarla',
  sinif: 5,
  ad: 'Merdiven tarla',
  aciklama: 'Sıraları 1, 3, 5 … kare olan tarlayı ek. Kaç kare ekeceğini tahmin edebilir misin?',
  yonerge: 'Merdiven biçimli tarlanın her karesine tohum ek. İlk sırada 1 kare var; her sıra bir öncekinden 2 kare uzun. Robot sarı çıkışa varınca iş biter. Tarlaların sıra sayısı farklı.',
  dunyalar: [MERDIVEN_1, MERDIVEN_2, MERDIVEN_3, MERDIVEN_4],
  hedef: { boyamayiTamamla: true, cikistaBitir: true },
  bitkiAdi: 'bitki',
  aracKutusu: [ILERI, SAGA, SOLA, EK, CIKISA_KADAR, kez(4), kezIfade('kat'), ata('kat', 1), ata('kat', ['kat', '+', 1])],
  enCokBlok: 14,
  cozum: k(
    [
      ['ata', 'kat', 1],
      ['kadar', 'cikistayim', [['kez', 'kat', ['ek', 'ileri']], 'sagaDon', 'sagaDon', ['kez', 'kat', ['ileri']], 'solaDon', 'ileri', 'solaDon', ['ata', 'kat', ['kat', '+', 2]]]],
    ],
    'a53c-'
  ),
  degiskenler: ['kat'],
  kazanimlar: ['MAT.5.4.2', 'MAT.5.2.3'],
  kalip: 'yilan',
  ipucu: 'Bir sırayı ek, sıranın başına dön, alt sıraya geç; sıranın uzunluğunu bir değişkende büyüt.',
  gorunum: 'blok',
};

// ===========================================================================
// 6. sınıf (blok): formüllü algoritma, katlar, genel terim, en büyük
// ===========================================================================

// --- Gübre takvimi: her k. saksı sarı (k dünyadan), kuru toprak sulanır -----

const TAKVIM_1: DunyaTanimi = { id: 'a6-takvim-d1', ad: 'k = 3', sinar: '9 saksı, sarılar 3, 6, 9', bitkiler: saksiSirasi('K N Ns K N Ks K N Ns'), degiskenler: { k: 3 } };
const TAKVIM_2: DunyaTanimi = { id: 'a6-takvim-d2', ad: 'k = 4', sinar: '12 saksı, sarılar 4, 8, 12', bitkiler: saksiSirasi('K K N Ns K N K Ks N K K Ns'), degiskenler: { k: 4 } };
const TAKVIM_3: DunyaTanimi = { id: 'a6-takvim-d3', ad: 'k = 2', sinar: '7 saksı, sarılar 2, 4, 6', bitkiler: saksiSirasi('K Ns K Ks N Ns K'), degiskenler: { k: 2 } };
const TAKVIM_4: DunyaTanimi = { id: 'a6-takvim-d4', ad: 'k = 5', sinar: '11 saksı, sarılar 5, 10', bitkiler: saksiSirasi('N N K N Ks K N N K Ns N'), degiskenler: { k: 5 } };

const A6_TAKVIM: Atolye = {
  id: 'a6-gubre-takvimi',
  sinif: 6,
  ad: 'Gübre takvimi',
  aciklama: 'Her k. saksıya gübre, kuru toprağa su. k her serada farklı.',
  yonerge: 'Robotun renk algılayıcısı bozuk. Bu seralarda her k. saksının yaprakları sarı; k her serada farklı. Sarı yapraklılara gübre ver, kuru toprakları sula, çıkışa var.',
  dunyalar: [TAKVIM_1, TAKVIM_2, TAKVIM_3, TAKVIM_4],
  hedef: { kurulariSula: true, sarilariGubrele: true, cikistaBitir: true },
  bitkiAdi: 'saksı',
  aracKutusu: [ILERI, SULA, GUBRE, CIKISA_KADAR, EGER_KURU, { tur: 'eger', kosul: kosulKur([['sıra', 'mod', 3], '=', 0]) }, ata('sıra', 0), ata('sıra', ['sıra', '+', 1]), kez(5)],
  enCokBlok: 10,
  cozum: k(
    [
      ['ata', 'sıra', 0],
      'ileri',
      ['kadar', 'cikistayim', [['ata', 'sıra', ['sıra', '+', 1]], ['eger', [['sıra', 'mod', 'k'], '=', 0], ['gubreVer']], ['eger', 'toprakKuru', ['sula']], 'ileri']],
    ],
    'a61c-'
  ),
  degiskenler: ['sıra', 'k'],
  kazanimlar: ['MAT.6.1.1', 'MAT.6.1.2', 'MAT.6.2.3'],
  kalip: 'katlari',
  ipucu: 'Saksıları sırayla say; sıra numarası k’nın katıysa gübre zamanı.',
  gorunum: 'blok',
};

// --- Basamaklı piramit: 1, 3, … 2n − 1, … 3, 1 ------------------------------

/** Tepesi n. kule olan tek sayı piramidi */
const piramit = (n: number) => {
  const cik = Array.from({ length: n }, (_, i) => 2 * i + 1);
  return 'B' + [...cik, ...cik.slice(0, -1).reverse()].join('');
};
const PIRAMIT_1 = insaatAlani('a6-piramit-d1', 'n = 3', [piramit(3)], { degiskenler: { n: 3 }, sinar: '1, 3, 5, 3, 1' });
const PIRAMIT_2 = insaatAlani('a6-piramit-d2', 'n = 4', [piramit(4)], { degiskenler: { n: 4 }, sinar: '1, 3, 5, 7, 5, 3, 1' });
const PIRAMIT_3 = insaatAlani('a6-piramit-d3', 'n = 2', [piramit(2)], { degiskenler: { n: 2 }, sinar: '1, 3, 1' });

const A6_PIRAMIT: Atolye = {
  id: 'a6-piramit',
  sinif: 6,
  ad: 'Basamaklı piramit',
  aciklama: 'Kuleler tek sayılarla tepeye çıkıp aynı sayılarla iniyor: 1, 3, 5, 3, 1.',
  yonerge: 'Dron bir piramit kursun: kuleler 1, 3, 5 … diye tepedeki n. kuleye kadar yükselir, sonra aynı sayılarla iner. n her alanda farklı.',
  dunyalar: [PIRAMIT_1, PIRAMIT_2, PIRAMIT_3],
  hedef: { yapiyiKur: true, cikistaBitir: false },
  bitkiAdi: 'bitki',
  aracKutusu: [ILERI, KOY, kez(3), kezIfade('n'), kezIfade(['n', '+', 1]), kezIfade([[2, '×', 'n'], '+', 1]), ata('i', 1), ata('i', ['i', '+', 1])],
  enCokBlok: 13,
  cozum: k(
    [
      ['ata', 'i', 1],
      ['kez', 'n', ['ileri', ['kez', [[2, '×', 'i'], '-', 1], ['koy']], ['ata', 'i', ['i', '+', 1]]]],
      ['ata', 'i', ['i', '-', 2]],
      ['kez', ['n', '-', 1], ['ileri', ['kez', [[2, '×', 'i'], '-', 1], ['koy']], ['ata', 'i', ['i', '-', 1]]]],
    ],
    'a62c-'
  ),
  degiskenler: ['i', 'n'],
  kazanimlar: ['MAT.6.2.2', 'MAT.6.2.3'],
  kalip: 'genel-terim',
  ipucu: 'Çıkışta kule sırası büyür, inişte küçülür; iki yarıyı ayrı tekrarlarla kur.',
  gorunum: 'blok',
};

// --- Sarmal pist: parçalar 1, 2, 3 … n birim, her parçadan sonra sağa ------

/** n parçalı sarmalın nokta ağı: robot (sarmalın başı) doğuya bakar; y aşağı doğru */
function sarmal(id: string, ad: string, n: number): DunyaTanimi {
  let x = 0;
  let y = 0;
  let dx = 1;
  let dy = 0;
  const yol: [number, number][] = [[0, 0]];
  for (let i = 1; i <= n; i++) {
    x += dx * i;
    y += dy * i;
    yol.push([x, y]);
    [dx, dy] = [-dy, dx];
  }
  const minX = Math.min(...yol.map((p) => p[0]));
  const minY = Math.min(...yol.map((p) => p[1]));
  const kay = yol.map(([a, b]) => [a - minX, b - minY] as const);
  const en = Math.max(...kay.map((p) => p[0])) + 1;
  const boy = Math.max(...kay.map((p) => p[1])) + 1;
  return saha(id, ad, ag(en, boy, kay[0], { cizilecek: [kay] }), { degiskenler: { n }, sinar: `${n} parça: 1 + … + ${n} = ${(n * (n + 1)) / 2} birim` });
}
const SARMAL_1 = sarmal('a6-sarmal-d1', 'n = 5', 5);
const SARMAL_2 = sarmal('a6-sarmal-d2', 'n = 7', 7);
const SARMAL_3 = sarmal('a6-sarmal-d3', 'n = 4', 4);
const SARMAL_4 = sarmal('a6-sarmal-d4', 'n = 6', 6);

const A6_SARMAL: Atolye = {
  id: 'a6-sarmal-pist',
  sinif: 6,
  ad: 'Sarmal pist',
  aciklama: 'Her parçası bir öncekinden 1 birim uzun sarmal bir koşu pisti çiz.',
  yonerge: 'Çizgi robotu sarmal pistin bütün çizgilerini çizsin. Pist n parçadan oluşuyor; ilk parça 1 birim ve her parça bir öncekinden 1 birim uzun. n her sahada farklı.',
  dunyalar: [SARMAL_1, SARMAL_2, SARMAL_3, SARMAL_4],
  hedef: { cizimiTamamla: true, cikistaBitir: false },
  bitkiAdi: 'bitki',
  aracKutusu: [ILERI, SAGA, SOLA, kez(4), kezIfade('n'), ata('i', 1), ata('i', ['i', '+', 1])],
  enCokBlok: 7,
  cozum: k([['ata', 'i', 1], ['kez', 'n', [['kez', 'i', ['ileri']], 'sagaDon', ['ata', 'i', ['i', '+', 1]]]]], 'a63c-'),
  degiskenler: ['i', 'n'],
  kazanimlar: ['MAT.6.2.2', 'MAT.6.2.3'],
  kalip: 'formul',
  ipucu: 'Parçanın uzunluğunu bir değişkende tut; her parçadan sonra onu 1 artır.',
  gorunum: 'blok',
};

// ===========================================================================
// 7. sınıf (ifade): algoritma gösterimleri, eşitsizlik, prizma, yansıma
// ===========================================================================

// --- Sera blokları: en × boy bitki; kuruyu sula, olgunu topla ---------------

/** Bitki sıraları (K, N saksı; R, Y domates) → harita: robot sol üstte, çevresi yol */
function seraBlogu(id: string, ad: string, siralar: string[]): DunyaTanimi {
  const en = siralar[0].length;
  const harita = [...siralar.map((s, i) => (i === 0 ? 'B' : '.') + s + '.'), '.'.repeat(en + 2)];
  return bahce(id, ad, harita, { adimIzi: false, degiskenler: { en, boy: siralar.length }, sinar: `en = ${en}, boy = ${siralar.length}` });
}
const BLOK_1 = seraBlogu('a7-blok-d1', '4 × 2 sera', ['KRNY', 'YKKR']);
const BLOK_2 = seraBlogu('a7-blok-d2', '5 × 3 sera', ['RKNYK', 'NYRKR', 'KRYNK']);
const BLOK_3 = seraBlogu('a7-blok-d3', '3 × 4 sera', ['KYR', 'RNK', 'YKN', 'KRR']);
const BLOK_4 = seraBlogu('a7-blok-d4', '6 × 1 sera', ['YKRKNR']);

const A7_BLOK: Atolye = {
  id: 'a7-sera-bloklari',
  sinif: 7,
  ad: 'Sera blokları',
  aciklama: 'en × boy bitkilik serada her bitkiye bak: kuruyu sula, olgunu topla.',
  yonerge: 'Sera en × boy bitkilik bir blok; en ve boy her serada farklı. Robot bütün kuru saksıları sulasın, bütün olgun domatesleri toplasın.',
  dunyalar: [BLOK_1, BLOK_2, BLOK_3, BLOK_4],
  hedef: { kurulariSula: true, kirmizilariTopla: true, cikistaBitir: false },
  bitkiAdi: 'bitki',
  aracKutusu: [ILERI, SAGA, SOLA, SULA, TOPLA, CIKISA_KADAR, EGER_KURU, EGER_KIRMIZI, { tur: 'eger', kosul: 'domatesKirmizi', degilse: true }, kez(2), kezIfade('en')],
  enCokBlok: 15,
  cozum: k(
    [
      [
        'kez',
        'boy',
        [
          ['kez', 'en', ['ileri', ['eger', 'toprakKuru', ['sula']], ['eger', 'domatesKirmizi', ['topla']]]],
          'sagaDon',
          'sagaDon',
          ['kez', 'en', ['ileri']],
          'solaDon',
          'ileri',
          'solaDon',
        ],
      ],
    ],
    'a71c-'
  ),
  degiskenler: ['en', 'boy'],
  kazanimlar: ['MAT.7.2.4'],
  kalip: 'ic-ice',
  ipucu: 'Bir sırayı tarayan kodu yaz; sonra onu boy kez tekrarla ve her sıradan sonra başa dön.',
  gorunum: 'ifade',
};

// --- Stadyum tribünü: en arka sıra boy kat, öne doğru birer kat alçalır ------

/** Tribün: 1. sıra (arka) boy kat … boy. sıra (ön) 1 kat; dron arka sıranın solunda */
function tribun(id: string, ad: string, en: number, boy: number): DunyaTanimi {
  const bos = '.'.repeat(en + 2);
  const siralar = Array.from({ length: boy }, (_, r) => (r === 0 ? 'B' : '.') + String(boy - r).repeat(en) + '.');
  return insaatAlani(id, ad, [bos, ...siralar, bos], { degiskenler: { en, boy }, sinar: `${en} × ${boy} taban, ${boy} kat` });
}
const TRIBUN_1 = tribun('a7-tribun-d1', '4 × 3 tribün', 4, 3);
const TRIBUN_2 = tribun('a7-tribun-d2', '3 × 5 tribün', 3, 5);
const TRIBUN_3 = tribun('a7-tribun-d3', '6 × 2 tribün', 6, 2);
const TRIBUN_4 = tribun('a7-tribun-d4', '2 × 4 tribün', 2, 4);

const A7_TRIBUN: Atolye = {
  id: 'a7-tribun',
  sinif: 7,
  ad: 'Stadyum tribünü',
  aciklama: 'Arkadan öne alçalan bir tribünü küplerle kur; ölçüler her alanda farklı.',
  yonerge: 'Dron en × boy tabanlı bir tribün kursun: en arka sıra boy kat, öne doğru her sıra bir kat alçak, en ön sıra 1 kat. en ve boy her alanda farklı.',
  dunyalar: [TRIBUN_1, TRIBUN_2, TRIBUN_3, TRIBUN_4],
  hedef: { yapiyiKur: true, cikistaBitir: false },
  bitkiAdi: 'bitki',
  aracKutusu: [ILERI, SAGA, SOLA, KOY, kez(2), kezIfade('en'), ata('basamak', 1), ata('basamak', ['basamak', '+', 1])],
  enCokBlok: 15,
  cozum: k(
    [
      ['ata', 'basamak', 'boy'],
      [
        'kez',
        'boy',
        [
          ['kez', 'en', ['ileri', ['kez', 'basamak', ['koy']]]],
          'sagaDon',
          'sagaDon',
          ['kez', 'en', ['ileri']],
          'solaDon',
          'ileri',
          'solaDon',
          ['ata', 'basamak', ['basamak', '-', 1]],
        ],
      ],
    ],
    'a72c-'
  ),
  degiskenler: ['basamak', 'en', 'boy'],
  kazanimlar: ['MAT.7.4.3', 'MAT.7.4.4'],
  kalip: 'uc-kat',
  ipucu: 'Kule, sıra, tribün: üç iç içe tekrar. Sıradan sıraya kule yüksekliği değişir.',
  gorunum: 'ifade',
};

// --- Göldeki yansıma: n dişli surun yatay aynadaki görüntüsü ---------------

/**
 * Kıyıdaki sur (hazır, y = 0–1) ve göldeki yansıması (gizli, y = 2–3); ayna y = 1,5 doğrusu.
 * Sur (0, 1)'den başlar: her dişte yukarı, doğuya, aşağı, doğuya. Robot surun bittiği (2n, 1) noktasında.
 */
function surYansimasi(id: string, ad: string, n: number): DunyaTanimi {
  const sur: [number, number][] = [[0, 1]];
  for (let j = 0; j < n; j++) {
    const x = 2 * j;
    sur.push([x, 0], [x + 1, 0], [x + 1, 1], [x + 2, 1]);
  }
  const yansima = sur.map(([x, y]) => [x, 3 - y] as const);
  return saha(id, ad, ag(2 * n + 1, 4, [2 * n, 1], { hazir: [sur], cizilecek: [yansima] }), {
    eksen: { yon: 'yatay', k: 1.5 },
    hedefGizli: true,
    degiskenler: { n },
    sinar: `${n} diş`,
  });
}
const SUR_1 = surYansimasi('a7-sur-d1', 'Üç dişli sur', 3);
const SUR_2 = surYansimasi('a7-sur-d2', 'Dört dişli sur', 4);
const SUR_3 = surYansimasi('a7-sur-d3', 'İki dişli sur', 2);

const A7_SUR: Atolye = {
  id: 'a7-gol-yansimasi',
  sinif: 7,
  ad: 'Göldeki yansıma',
  aciklama: 'Kıyıdaki surun göle düşen yansımasını çiz. Surun diş sayısı değişiyor.',
  yonerge: 'Kıyıdaki sur hazır çizili; göldeki yansıması görünmüyor. Çizgi robotu surun kıyı çizgisine göre yansımasını çizsin. Surdaki diş sayısı n her sahada farklı.',
  dunyalar: [SUR_1, SUR_2, SUR_3],
  hedef: { cizimiTamamla: true, cikistaBitir: false },
  bitkiAdi: 'bitki',
  aracKutusu: [ILERI, SAGA, SOLA, KALDIR, INDIR, kez(2), kezIfade('n')],
  enCokBlok: 15,
  cozum: k(['kalemKaldir', 'sagaDon', 'ileri', 'kalemIndir', 'sagaDon', ['kez', 'n', ['ileri', 'solaDon', 'ileri', 'sagaDon', 'ileri', 'sagaDon', 'ileri', 'solaDon']]], 'a73c-'),
  degiskenler: ['n'],
  kazanimlar: ['MAT.7.3.1'],
  kalip: 'yansit',
  ipucu: 'Yatay aynada doğu doğu kalır, kuzey güney olur; önce yansımanın başlangıç noktasını bul.',
  gorunum: 'ifade',
};

// ===========================================================================
// 8. sınıf (ifade): koordinat, doğrusal fonksiyon, öteleme (komut), üslü artış
// ===========================================================================

// --- Doğru grafiği: y = m·x + b doğrusunun x = 0 … n − 1 noktaları -----------

function dogruGrafigi(id: string, ad: string, m: number, b: number, n: number): DunyaTanimi {
  const noktalar = Array.from({ length: n }, (_, x) => [x, m * x + b] as const);
  return saha(id, ad, ag(7, 8, [0, 0], { noktalar }, true), {
    koordinat: true,
    hedefGizli: true,
    degiskenler: { m, b, n },
    sinar: `y = ${m}x + ${b}, ${n} nokta`,
  });
}
const DOGRU_1 = dogruGrafigi('a8-dogru-d1', 'y = 2x + 1', 2, 1, 4);
const DOGRU_2 = dogruGrafigi('a8-dogru-d2', 'y = x + 2', 1, 2, 6);
const DOGRU_3 = dogruGrafigi('a8-dogru-d3', 'y = 3x', 3, 0, 3);
const DOGRU_4 = dogruGrafigi('a8-dogru-d4', 'y = 3', 0, 3, 5);

const A8_DOGRU: Atolye = {
  id: 'a8-dogru-grafigi',
  sinif: 8,
  ad: 'Doğru grafiği',
  aciklama: 'y = m·x + b doğrusunun noktalarını işaretle; m, b ve n her düzlemde farklı.',
  yonerge: 'Noktalar gizli. y = m·x + b doğrusunun x = 0, 1, …, n − 1 için noktalarını işaretle. m, b ve n her düzlemde farklı. Robot (0, 0) noktasında, x ekseni yönüne bakıyor.',
  dunyalar: [DOGRU_1, DOGRU_2, DOGRU_3, DOGRU_4],
  hedef: { noktalariKoy: true, cikistaBitir: false },
  bitkiAdi: 'bitki',
  aracKutusu: [ILERI, SAGA, SOLA, ISARETLE, kez(2), kezIfade('m'), kezIfade(['n', '+', 1])],
  enCokBlok: 13,
  cozum: k(['solaDon', ['kez', 'b', ['ileri']], 'sagaDon', ['kez', ['n', '-', 1], ['isaretle', 'ileri', 'solaDon', ['kez', 'm', ['ileri']], 'sagaDon']], 'isaretle'], 'a81c-'),
  degiskenler: ['m', 'b', 'n'],
  olcumler: ['x', 'y'],
  kazanimlar: ['MAT.8.2.1', 'MAT.8.2.2', 'MAT.8.2.4'],
  kalip: 'egim',
  ipucu: 'Önce doğrunun y eksenini kestiği noktaya çık; sonra her adımda 1 sağa, m yukarı.',
  gorunum: 'ifade',
};

// --- Site inşaatı: n eş blok (3 katlı bina + 1 katlı dükkân), arada ara kare ---

/** B, sonra n blok ("31"), bloklar arasında ara kadar boş kare; alan son blokla biter */
const site = (n: number, ara: number) => 'B' + Array.from({ length: n }, () => '31').join('.'.repeat(ara));
const SITE_1 = insaatAlani('a8-site-d1', 'Üç blok', [site(3, 1)], { degiskenler: { n: 3, ara: 1 }, sinar: 'Öteleme 3 birim' });
const SITE_2 = insaatAlani('a8-site-d2', 'Geniş aralık', [site(2, 3)], { degiskenler: { n: 2, ara: 3 }, sinar: 'Öteleme 5 birim' });
const SITE_3 = insaatAlani('a8-site-d3', 'Bitişik bloklar', [site(4, 0)], { degiskenler: { n: 4, ara: 0 }, sinar: 'Öteleme 2 birim' });
const SITE_4 = insaatAlani('a8-site-d4', 'Tek blok', [site(1, 4)], { degiskenler: { n: 1, ara: 4 }, sinar: 'Boşluk yok' });

const A8_SITE: Atolye = {
  id: 'a8-site-insaati',
  sinif: 8,
  ad: 'Site inşaatı',
  aciklama: 'Eş blokları bir kez tanımla, sitenin her yerinde kullan.',
  yonerge: 'Sitede n eş blok var: her blokta 3 katlı bir bina ve yanında 1 katlı bir dükkân. Bloklar arasında ara kadar boş kare kalır. Dron bütün blokları kursun; n ve ara her alanda farklı.',
  dunyalar: [SITE_1, SITE_2, SITE_3, SITE_4],
  hedef: { yapiyiKur: true, cikistaBitir: false },
  bitkiAdi: 'bitki',
  aracKutusu: [ILERI, KOY, kez(2), kezIfade('n'), kezIfade(['n', '+', 1]), { tur: 'tanim', ad: 'BLOK' }, { tur: 'cagir', ad: 'BLOK' }],
  enCokBlok: 12,
  cozum: k(
    [
      ['tanim', 'BLOK', ['ileri', ['kez', 3, ['koy']], 'ileri', 'koy']],
      ['cagir', 'BLOK'],
      ['kez', ['n', '-', 1], [['kez', 'ara', ['ileri']], ['cagir', 'BLOK']]],
    ],
    'a82c-'
  ),
  degiskenler: ['n', 'ara'],
  kazanimlar: ['MAT.8.5.1', 'MAT.8.5.3'],
  kalip: 'komut',
  ipucu: 'Bloğu bir kez komut olarak tanımla; n blok arasında kaç boşluk olduğunu düşün.',
  gorunum: 'ifade',
};

// --- Üslü sera: sarı yapraklar 1, r, r², … sıralarda (r dünyadan) ------------

const USLU_1: DunyaTanimi = { id: 'a8-uslu-d1', ad: 'r = 2', sinar: '9 saksı, sarılar 1, 2, 4, 8', bitkiler: saksiSirasi('Ns Ks K Ns N K N Ks K'), degiskenler: { r: 2 } };
const USLU_2: DunyaTanimi = { id: 'a8-uslu-d2', ad: 'r = 3', sinar: '10 saksı, sarılar 1, 3, 9', bitkiler: saksiSirasi('Ks N Ns K N K K N Ns K'), degiskenler: { r: 3 } };
const USLU_3: DunyaTanimi = { id: 'a8-uslu-d3', ad: 'Kısa sıra', sinar: '5 saksı, sarılar 1, 2, 4', bitkiler: saksiSirasi('Ns Ns K Ks N'), degiskenler: { r: 2 } };
const USLU_4: DunyaTanimi = { id: 'a8-uslu-d4', ad: 'r = 4', sinar: '12 saksı, sarılar 1, 4', bitkiler: saksiSirasi('Ns K N Ks K N N K N K N K'), degiskenler: { r: 4 } };

const A8_USLU: Atolye = {
  id: 'a8-uslu-sera',
  sinif: 8,
  ad: 'Üslü sera',
  aciklama: 'Sarı yapraklar r’nin kuvveti olan sıralarda: 1, r, r² … Onları bul, kuruları sula.',
  yonerge: 'Robotun renk algılayıcısı bozuk. Yaprakları sarı saksılar r’nin kuvvetleri olan sıralarda: 1, r, r², r³ … (r her serada farklı). Sarılara gübre ver, kuru toprakları sula, çıkışa var.',
  dunyalar: [USLU_1, USLU_2, USLU_3, USLU_4],
  hedef: { kurulariSula: true, sarilariGubrele: true, cikistaBitir: true },
  bitkiAdi: 'saksı',
  aracKutusu: [
    ILERI,
    SULA,
    GUBRE,
    CIKISA_KADAR,
    EGER_KURU,
    { tur: 'eger', kosul: kosulKur(['sıra', '=', 1]) },
    ata('kuvvet', 1),
    ata('kuvvet', ['kuvvet', '×', 2]),
    ata('sıra', 0),
    ata('sıra', ['sıra', '+', 1]),
  ],
  enCokBlok: 10,
  cozum: k(
    [
      ['ata', 'kuvvet', 1],
      'ileri',
      ['kadar', 'cikistayim', [['eger', ['@x', '=', 'kuvvet'], ['gubreVer', ['ata', 'kuvvet', ['kuvvet', '×', 'r']]]], ['eger', 'toprakKuru', ['sula']], 'ileri']],
    ],
    'a83c-'
  ),
  degiskenler: ['kuvvet', 'sıra', 'r'],
  olcumler: ['x'],
  kazanimlar: ['MAT.8.1.1', 'MAT.8.2.1'],
  kalip: 'katla',
  ipucu: 'Sıradaki kuvveti bir değişkende tut; o saksıya gelince gübre ver ve kuvveti r ile çarp.',
  gorunum: 'ifade',
};

// ---------------------------------------------------------------------------

export const ATOLYELER_5_8: readonly Atolye[] = [
  A5_HASAT,
  A5_GOKDELEN,
  A5_MERDIVEN,
  A6_TAKVIM,
  A6_PIRAMIT,
  A6_SARMAL,
  A7_BLOK,
  A7_TRIBUN,
  A7_SUR,
  A8_DOGRU,
  A8_SITE,
  A8_USLU,
];
