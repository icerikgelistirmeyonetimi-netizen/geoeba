/**
 * Algoritma Laboratuvarı — Atölye projeleri, 1–4. sınıf (her sınıfa üç proje).
 *
 * Atölye açık uçlu bir projedir: yönerge amacı söyler, yöntemi söylemez; öğrenci sınıfın bildiği
 * bütün bloklarla kendi çözümünü kurar. Yıldızlar (`sina`): ★ ilk dünyada doğru · ★★ bütün
 * dünyalarda doğru · ★★★ ayrıca en çok `enCokBlok` blok.
 *
 *   1. sınıf (kart, tek dünya; ★★★ en az kart = en kısa yol, tekrar yok)
 *      a1-tur       Bahçe turu        halka bahçe: hangi yandan dolaşılırsa az kart gerekir
 *      a1-yol       İki yol           robotun baktığı yol uzun; öbür yol 8 kartla biter
 *      a1-merdiven  Saksı merdiveni   her basamakta aynı örüntü: ileri, sula, sağa, ileri, sola
 *   2. sınıf (kart, tek dünya; ★★★ tekrarla kartıyla az kart)
 *      a2-bahce     Köşe bahçe        3 kez 2 adım + 2 kez 2 adım, köşede dönüş
 *      a2-kale      Kale duvarı       inşaat dronu: "1, 2" dişi 3 kez (3 × 3 = 9 küp)
 *      a2-yol       Kısa yol yarışı   en kısa yol merdiven: 3 kez basamak (uzun yol 14 adım)
 *   3. sınıf (blok, dört dünya; ezber kod bir dünyada kalır)
 *      a3-sera      Sera sabahı       çıkışa kadar + üç "eğer": sula, gübrele, topla
 *      a3-teras     Teras bahçe       basamak sayısı farklı merdivenler; iki kareye de bak
 *      a3-ayna      Ayna atölyesi     artı şeklinin her sahada başka yarısı çizili: bütün şekli çiz
 *   4. sınıf (blok, dört dünya)
 *      a4-cevre     Bahçe çevresi     kare halka: 4 kez (3 kez ileri + iki "eğer"), sağa dön
 *      a4-kule      Kule şehri        uzunluğu ve yönü farklı sokaklar: çıkışa kadar 3 küplük kule
 *      a4-pencere   Pencere ustası    2 × 2 pencerenin her seferinde başka çıtaları eksik
 *
 * 3–4. sınıfta çizim sahasında algılayıcı yoktur; genellik orada "hangi parça eksik olursa olsun
 * bütün şekli çizen kod" demektir (hazır çizili çizginin üstünden geçmek hata değildir).
 */
import { programKur, type BlokSablonu, type KisaBlok } from './program';
import { bahce, insaatAlani, saha, type BitkiTanimi, type DunyaTanimi, type Hedef } from './dunya';
import { CICEK } from './sinif1';
import type { Atolye } from './gorev';

// ---------------------------------------------------------------------------
// Bloklar ve hedefler
// ---------------------------------------------------------------------------

const ILERI: BlokSablonu = { tur: 'eylem', eylem: 'ileri' };
const SAGA: BlokSablonu = { tur: 'eylem', eylem: 'sagaDon' };
const SOLA: BlokSablonu = { tur: 'eylem', eylem: 'solaDon' };
const SULA: BlokSablonu = { tur: 'eylem', eylem: 'sula' };
const TOPLA: BlokSablonu = { tur: 'eylem', eylem: 'topla' };
const GUBRE: BlokSablonu = { tur: 'eylem', eylem: 'gubreVer' };
const KOY: BlokSablonu = { tur: 'eylem', eylem: 'koy' };
const KADAR: BlokSablonu = { tur: 'tekrarlaKadar', kosul: 'cikistayim' };
const KURUYSA: BlokSablonu = { tur: 'eger', kosul: 'toprakKuru' };
const SARIYSA: BlokSablonu = { tur: 'eger', kosul: 'yaprakSari' };
const KIRMIZIYSA: BlokSablonu = { tur: 'eger', kosul: 'domatesKirmizi' };
const kez = (n: number): BlokSablonu => ({ tur: 'tekrarlaKez', kez: n });
/** 2. sınıfın tekrarla kartı 2 ile gelir; sayıyı çocuk bulur */
const TEKRAR = kez(2);

const SULA_VE_VAR: Hedef = { kurulariSula: true, cikistaBitir: true };
const HEPSINI_SULA: Hedef = { kurulariSula: true, cikistaBitir: false };
const HEDEFE_VAR: Hedef = { cikistaBitir: true };
const EN_KISA: Hedef = { cikistaBitir: true, enKisaYol: true };
const YAPIYI_KUR: Hedef = { yapiyiKur: true, cikistaBitir: false };
const KUR_VE_CIK: Hedef = { yapiyiKur: true, cikistaBitir: true };
const CIZ: Hedef = { cizimiTamamla: true, cikistaBitir: false };

const k = (liste: KisaBlok[], onek: string) => programKur(liste, onek);

// ---------------------------------------------------------------------------
// Dünya yardımcıları
// ---------------------------------------------------------------------------

/** Karışık sera sırası: K / N kuru / nemli saksı (sonunda "s": yaprak sarı), R / Y kırmızı / yeşil domates */
function karisikSira(yazim: string): BitkiTanimi[] {
  return yazim
    .trim()
    .split(/\s+/)
    .map((t): BitkiTanimi => {
      const u = t.toUpperCase();
      if (u[0] === 'R' || u[0] === 'Y') return { tur: 'domates', domates: u[0] === 'R' ? 'kirmizi' : 'yesil' };
      return { tur: 'saksi', toprak: u[0] === 'K' ? 'kuru' : 'nemli', yaprak: u.endsWith('S') ? 'sari' : 'saglam' };
    });
}

const sera = (id: string, ad: string, yazim: string, sinar: string): DunyaTanimi => ({ id, ad, sinar, bitkiler: karisikSira(yazim), depo: 20 });

/**
 * Teras (merdiven) bahçe: robot (0, 0)'da doğuya bakar; her basamak bir doğu karesi (T) ve bir güney
 * karesidir (R). `yol` bu kareleri yürüme sırasıyla verir: "T1 R1 T2 R2 … Tk" ('.' boş, K / N saksı);
 * son güney karesi çiçektir. Haritanın okuma sırası yürüme sırasıyla aynıdır (iletilerdeki saksı sırası).
 */
function teras(id: string, ad: string, yol: string, sinar: string): DunyaTanimi {
  const t = yol.trim().split(/\s+/);
  if (t.length % 2 === 0) throw new Error(`${id}: teras yolu tek sayıda kare olmalı`);
  const n = (t.length + 1) / 2;
  const satir = Array.from({ length: n + 1 }, () => Array.from({ length: n + 1 }, () => '#'));
  satir[0][0] = 'B';
  t.forEach((c, i) => {
    const j = Math.floor(i / 2) + 1;
    if (i % 2 === 0) satir[j - 1][j] = c;
    else satir[j][j] = c;
  });
  satir[n][n] = 'H';
  return bahce(
    id,
    ad,
    satir.map((s) => s.join('')),
    { hedefAdi: CICEK, adimIzi: false, sinar }
  );
}

/** 4 × 4 kare halka, saat yönünde köşeden köşeye: (0,0) (1,0) (2,0) (3,0) (3,1) … (0,1) */
const HALKA: readonly [number, number][] = [
  [0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1],
];

/**
 * Kare bahçe halkası: robot bir köşede başlar ve saat yönünde dolaşacak biçimde bakar. `yol` robotun
 * önünden başlayarak 11 kareyi sırayla verir ('.' boş, K / N saksı, R / Y domates). Ortası çalı.
 */
function halka(id: string, ad: string, kose: 0 | 1 | 2 | 3, yol: string, sinar: string): DunyaTanimi {
  const t = yol.trim().split(/\s+/);
  if (t.length !== 11) throw new Error(`${id}: halkada 11 kare olmalı`);
  const satir = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => '#'));
  const bas = kose * 3;
  const [bx, by] = HALKA[bas];
  satir[by][bx] = 'B';
  t.forEach((c, i) => {
    const [x, y] = HALKA[(bas + 1 + i) % 12];
    satir[y][x] = c;
  });
  return bahce(
    id,
    ad,
    satir.map((s) => s.join('')),
    { yon: kose, adimIzi: false, sinar }
  );
}

/** Birim çizgi: [x1, y1, x2, y2] (nokta koordinatı, y aşağı doğru) */
type Cizgi = [number, number, number, number];

/** Çizim sahası: `cizgiler` şeklin birim çizgileri; `hazir` olanlar çizili verilir, ötekiler çizilecek. */
function sahaKur(en: number, boy: number, cizgiler: readonly Cizgi[], hazir: (c: Cizgi) => boolean, bas: [number, number]): string[] {
  const s: string[][] = Array.from({ length: 2 * boy - 1 }, (_, r) => Array.from({ length: 2 * en - 1 }, (_, c) => (r % 2 === 0 && c % 2 === 0 ? '.' : ' ')));
  for (const c of cizgiler) {
    const [x1, y1, x2, y2] = c;
    const verildi = hazir(c);
    if (y1 === y2) s[2 * y1][2 * Math.min(x1, x2) + 1] = verildi ? '=' : '-';
    else s[2 * Math.min(y1, y2) + 1][2 * x1] = verildi ? '!' : '|';
  }
  s[2 * bas[1]][2 * bas[0]] = 'B';
  return s.map((r) => r.join(''));
}

const enBuyukX = (c: Cizgi) => Math.max(c[0], c[2]);
const enKucukX = (c: Cizgi) => Math.min(c[0], c[2]);
const enBuyukY = (c: Cizgi) => Math.max(c[1], c[3]);
const enKucukY = (c: Cizgi) => Math.min(c[1], c[3]);

// ---------------------------------------------------------------------------
// 1. sınıf (Keşif adası, kart görünümü, tek dünya)
// ---------------------------------------------------------------------------

/** Çiçek başlangıcın hemen altında ama önce üç saksı sulanmalı: saat yönünde 13 kart, öbür yönden 17 */
const TUR_BAHCESI = bahce('a1-tur-bahce', 'Halka bahçe', ['BK.', 'H#K', '.K.'], { hedefAdi: CICEK, sinar: 'Bahçeyi hangi yandan dolaşmak daha az kart ister' });

/** Robot güneye (uzun yola) bakar; üstteki yol 6 adım (8 kart), alttaki 10 adım (12 kart) */
const IKI_YOL = bahce('a1-yol-bahce', 'İki yol', ['B....', '.###.', '.###H', '.###.', '.....'], { hedefAdi: CICEK, yon: 1, sinar: 'Robotun baktığı yol uzun yol' });

/** Üç basamak, her basamakta bir saksı */
const SAKSI_MERDIVENI = bahce('a1-merdiven-bahce', 'Saksı merdiveni', ['BK##', '#.K#', '##.K', '###H'], { hedefAdi: CICEK, sinar: 'Her basamakta aynı örüntü' });

// ---------------------------------------------------------------------------
// 2. sınıf (Keşif adası, kart görünümü, tek dünya)
// ---------------------------------------------------------------------------

const KOSE_BAHCE = bahce('a2-bahce-bahce', 'Köşe bahçe', ['B.K.K.K', '######.', '######K', '######.', '######K'], { sinar: 'İkişer aralıklı saksılar, köşede dönüş' });

const KALE_DUVARI = insaatAlani('a2-kale-alan', 'Kale duvarı', ['B121212'], { sinar: 'Dişli duvar: 1 küp, 2 küp, üç kez' });

/** Merdiven yolu 6 adım (tek en kısa yol); yukarıdan dolaşan yol 14 adım */
const YOL_YARISI = bahce('a2-yol-bahce', 'Kısa yol yarışı', ['.......', 'B.####.', '#..###.', '##..##.', '###H...'], { hedefAdi: CICEK, sinar: 'Kısa yol merdiven, uzun yol dolaşıyor' });

// ---------------------------------------------------------------------------
// 3. sınıf (Mucit adası, blok görünümü, dört dünya)
// ---------------------------------------------------------------------------

const SERALAR: DunyaTanimi[] = [
  sera('a3-sera-1', 'Sabah serası', 'K R Ns Y K R', 'Altı bitki: iki kuru saksı, bir sarı yaprak, iki olgun domates'),
  sera('a3-sera-2', 'Uzun sera', 'N Y R Ks K N R Y Ns R', 'On bitki: sayılmış kod burada yetmez'),
  sera('a3-sera-3', 'Küçük sera', 'R Ks', 'İki bitki: fazla tur duvara çarpar'),
  sera('a3-sera-4', 'Domates serası', 'Y R R N Y K R Y', 'Sekiz bitki, çoğu domates'),
];

const TERASLAR: DunyaTanimi[] = [
  teras('a3-teras-1', 'Üç basamak', 'K . N K K', 'Üç basamak; saksı güney karesinde de var'),
  teras('a3-teras-2', 'Beş basamak', 'K K . N K . N K K', 'Beş basamak: sayılmış kod yarıda kalır'),
  teras('a3-teras-3', 'İki basamak', 'N K K', 'İki basamak: fazla tur çite çarpar'),
  teras('a3-teras-4', 'Dört basamak', '. N K . K K N', 'Dört basamak, nemli saksılar arada'),
];

/** Artı: kolları 1 birim, genişliği 2 birim; iki simetri doğrusu (x = 2 ve y = 2) */
const ARTI: readonly Cizgi[] = [
  [1, 0, 2, 0], [2, 0, 3, 0],
  [3, 0, 3, 1], [3, 1, 4, 1], [4, 1, 4, 2], [4, 2, 4, 3], [3, 3, 4, 3], [3, 3, 3, 4],
  [2, 4, 3, 4], [1, 4, 2, 4],
  [1, 3, 1, 4], [0, 3, 1, 3], [0, 2, 0, 3], [0, 1, 0, 2], [0, 1, 1, 1], [1, 0, 1, 1],
];
const artiSahasi = (id: string, ad: string, hazir: (c: Cizgi) => boolean, eksen: DunyaTanimi['eksen'], sinar: string) =>
  saha(id, ad, sahaKur(5, 5, ARTI, hazir, [2, 0]), { yon: 0, eksen, hedefGizli: true, sinar });

const DIKEY_AYNA = { yon: 'dikey' as const, k: 2 };
const YATAY_AYNA = { yon: 'yatay' as const, k: 2 };

const AYNALAR: DunyaTanimi[] = [
  artiSahasi('a3-ayna-1', 'Sol yarı çizili', (c) => enBuyukX(c) <= 2, DIKEY_AYNA, 'Sağ yarı aynada'),
  artiSahasi('a3-ayna-2', 'Sağ yarı çizili', (c) => enKucukX(c) >= 2, DIKEY_AYNA, 'Sol yarı aynada: yalnız sağ yarıyı çizen kod yetmez'),
  artiSahasi('a3-ayna-3', 'Üst yarı çizili', (c) => enBuyukY(c) <= 2, YATAY_AYNA, 'Yatay ayna: alt yarı eksik'),
  artiSahasi('a3-ayna-4', 'Alt yarı çizili', (c) => enKucukY(c) >= 2, YATAY_AYNA, 'Yatay ayna: üst yarı eksik'),
];

// ---------------------------------------------------------------------------
// 4. sınıf (Mucit adası, blok görünümü, dört dünya)
// ---------------------------------------------------------------------------

const HALKALAR: DunyaTanimi[] = [
  halka('a4-cevre-1', 'Düzenli bahçe', 0, 'K R . K R . K R . K R', 'Her kenarda saksı, domates, boş köşe'),
  halka('a4-cevre-2', 'Karışık bahçe', 0, 'N K Y R . K N Y R . K', 'Nemli saksı ve ham domates: bakmadan yapan kod bozulur'),
  halka('a4-cevre-3', 'Öbür köşe', 1, 'K . R N K Y . R K N .', 'Robot sağ üst köşede, güneye bakıyor'),
  halka('a4-cevre-4', 'Dolu bahçe', 2, 'R K Y N K R K Y R N K', 'Bütün kareler dolu; robot sağ alt köşede'),
];

const SOKAKLAR: DunyaTanimi[] = [
  insaatAlani('a4-kule-1', 'Dört kule', ['B3333H'], { sinar: 'Doğuya uzanan sokak' }),
  insaatAlani('a4-kule-2', 'İki kule', ['B', '3', '3', 'H'], { yon: 1, sinar: 'Güneye inen kısa sokak: sayılmış kod çıkışa küp koyar' }),
  insaatAlani('a4-kule-3', 'Altı kule', ['H333333B'], { yon: 2, sinar: 'Batıya uzanan uzun sokak' }),
  insaatAlani('a4-kule-4', 'Üç kule', ['H', '3', '3', '3', 'B'], { yon: 3, sinar: 'Kuzeye çıkan sokak' }),
];

/** 2 × 2 pencere: kenarı 2 birim olan dört kare, 24 birim çizgi; robot ortada, kuzeye bakar */
const PENCERE: readonly Cizgi[] = [
  ...[0, 2, 4].flatMap((y) => [0, 1, 2, 3].map((x): Cizgi => [x, y, x + 1, y])),
  ...[0, 2, 4].flatMap((x) => [0, 1, 2, 3].map((y): Cizgi => [x, y, x, y + 1])),
];
const pencereSahasi = (id: string, ad: string, hazir: (c: Cizgi) => boolean, sinar: string) => saha(id, ad, sahaKur(5, 5, PENCERE, hazir, [2, 2]), { yon: 3, sinar });
const dis = (c: Cizgi) => (c[1] === c[3] ? c[1] === 0 || c[1] === 4 : c[0] === 0 || c[0] === 4);

const PENCERELER: DunyaTanimi[] = [
  pencereSahasi('a4-pencere-1', 'Çerçeve hazır', dis, 'Yalnız ortadaki artı eksik'),
  pencereSahasi('a4-pencere-2', 'Sol camlar hazır', (c) => enBuyukX(c) <= 2, 'Sağdaki iki cam eksik'),
  pencereSahasi('a4-pencere-3', 'Bir cam hazır', (c) => enKucukX(c) >= 2 && enBuyukY(c) <= 2, 'Yalnız sağ üst cam hazır'),
  pencereSahasi('a4-pencere-4', 'Alt camlar hazır', (c) => enKucukY(c) >= 2, 'Üstteki iki cam eksik'),
];

// ---------------------------------------------------------------------------
// Projeler
// ---------------------------------------------------------------------------

const KART = { gorunum: 'kart' as const };
const BLOK = { gorunum: 'blok' as const };

export const ATOLYELER_1_4: readonly Atolye[] = [
  // --- 1. sınıf ------------------------------------------------------------------
  {
    ...KART,
    id: 'a1-tur',
    sinif: 1,
    ad: 'Bahçe turu',
    aciklama: 'Bahçeyi dolaş, üç saksıyı da sula, çiçeğe var. En az kartla yapabilir misin?',
    yonerge: 'Üç saksının hepsini sula. Sonra robotu çiçeğe götür. En az kartla yapmaya çalış.',
    dunyalar: [TUR_BAHCESI],
    hedef: SULA_VE_VAR,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SAGA, SOLA, SULA],
    enCokBlok: 13,
    cozum: k(['ileri', 'sula', 'ileri', 'sagaDon', 'ileri', 'sula', 'ileri', 'sagaDon', 'ileri', 'sula', 'ileri', 'sagaDon', 'ileri'], 'a1t-'),
    kazanimlar: ['MAT.1.3.1', 'MAT.1.1.3', 'MAT.1.1.4'],
    kalip: 'git-ve-yap',
    ipucu: 'Çiçek yakında ama önce saksılar: bahçeyi hangi yandan dolaşırsan daha az kart gerekir?',
  },
  {
    ...KART,
    id: 'a1-yol',
    sinif: 1,
    ad: 'İki yol',
    aciklama: 'Çiçeğe iki yol gidiyor. Hangisi daha az kart ister? Robotu o yoldan götür.',
    yonerge: 'Robotu çiçeğe götür. Çiçeğe iki yol var. Az kartla götürmeye çalış.',
    dunyalar: [IKI_YOL],
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA],
    enCokBlok: 8,
    cozum: k(['solaDon', 'ileri', 'ileri', 'ileri', 'ileri', 'sagaDon', 'ileri', 'ileri'], 'a1y-'),
    kazanimlar: ['MAT.1.3.1', 'MAT.1.1.4', 'MAT.1.1.5'],
    kalip: 'don-ve-devam',
    ipucu: 'İki yolun karelerini parmağınla say. Az kare, az kart demek.',
  },
  {
    ...KART,
    id: 'a1-merdiven',
    sinif: 1,
    ad: 'Saksı merdiveni',
    aciklama: 'Merdivenin her basamağında bir saksı var. Hepsini sula, çiçeğe in.',
    yonerge: 'Her basamaktaki saksıyı sula. Sonra robotu çiçeğe götür.',
    dunyalar: [SAKSI_MERDIVENI],
    hedef: SULA_VE_VAR,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SAGA, SOLA, SULA],
    enCokBlok: 14,
    cozum: k(['ileri', 'sula', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'sula', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'sula', 'sagaDon', 'ileri'], 'a1m-'),
    kazanimlar: ['MAT.1.1.6', 'MAT.1.3.1'],
    kalip: 'oruntu',
    ipucu: 'Bir basamakta robot ne yapıyor? Sesli söyle: sonraki basamakta da aynısı var.',
  },

  // --- 2. sınıf ------------------------------------------------------------------
  {
    ...KART,
    id: 'a2-bahce',
    sinif: 2,
    ad: 'Köşe bahçe',
    aciklama: 'Köşeli yolda beş saksı var. Hepsini sula; tekrarla kartıyla az kart yeter.',
    yonerge: 'Yoldaki bütün saksıları sula. Az kartla yapmaya çalış.',
    dunyalar: [KOSE_BAHCE],
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SAGA, SOLA, SULA, TEKRAR],
    enCokBlok: 9,
    cozum: k([['kez', 3, ['ileri', 'ileri', 'sula']], 'sagaDon', ['kez', 2, ['ileri', 'ileri', 'sula']]], 'a2b-'),
    kazanimlar: ['MAT.2.2.4', 'MAT.2.1.4', 'MAT.2.3.6'],
    kalip: 'n-kez',
    ipucu: 'Saksıdan saksıya giderken tekrar eden parçayı bul; her yolda kaç kez tekrar ettiğini say.',
  },
  {
    ...KART,
    id: 'a2-kale',
    sinif: 2,
    ad: 'Kale duvarı',
    aciklama: 'Dron dişli bir kale duvarı kuracak: bir alçak, bir yüksek. Az kartla kur.',
    yonerge: 'Hayalet küplerin yerine küp koy. Kale duvarını az kartla kur.',
    dunyalar: [KALE_DUVARI],
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, KOY, TEKRAR],
    enCokBlok: 6,
    cozum: k([['kez', 3, ['ileri', 'koy', 'ileri', 'koy', 'koy']]], 'a2k-'),
    kazanimlar: ['MAT.2.3.2', 'MAT.2.1.5', 'MAT.2.2.4'],
    kalip: 'desenli-tekrar',
    ipucu: 'Duvarda tekrar eden parça hangisi? Bir parçayı kur, sonra kaç parça olduğunu say.',
  },
  {
    ...KART,
    id: 'a2-yol',
    sinif: 2,
    ad: 'Kısa yol yarışı',
    aciklama: 'Çiçeğe uzun bir yol ve kısa bir yol var. Kısa yolu bul, az kartla git.',
    yonerge: 'Robotu çiçeğe en kısa yoldan götür. Az kartla yapmaya çalış.',
    dunyalar: [YOL_YARISI],
    hedef: EN_KISA,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, TEKRAR],
    enCokBlok: 5,
    cozum: k([['kez', 3, ['ileri', 'sagaDon', 'ileri', 'solaDon']]], 'a2y-'),
    kazanimlar: ['MAT.2.3.6', 'MAT.2.1.5', 'MAT.2.2.1'],
    kalip: 'en-kisa',
    ipucu: 'İki yolun adımlarını say. Kısa yolda tekrar eden bir basamak var mı?',
  },

  // --- 3. sınıf ------------------------------------------------------------------
  {
    ...BLOK,
    id: 'a3-sera',
    sinif: 3,
    ad: 'Sera sabahı',
    aciklama: 'Her serada sula, gübrele, topla. Tek kodun uzun, kısa, bütün seralarda çalışsın.',
    yonerge: 'Kuru saksıları sula, sararmış yapraklara gübre ver, olgun domatesleri topla, çıkışta dur. Seraların uzunluğu ve bitkileri farklı: kodun hepsinde çalışsın.',
    dunyalar: SERALAR,
    hedef: { kurulariSula: true, sarilariGubrele: true, kirmizilariTopla: true, cikistaBitir: true },
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SULA, GUBRE, TOPLA, KADAR, KURUYSA, SARIYSA, KIRMIZIYSA, kez(6)],
    enCokBlok: 9,
    cozum: k([['kadar', 'cikistayim', ['ileri', ['eger', 'toprakKuru', ['sula']], ['eger', 'yaprakSari', ['gubreVer']], ['eger', 'domatesKirmizi', ['topla']]]]], 'a3s-'),
    kazanimlar: ['MAT.3.2.5', 'MAT.3.3.5', 'MAT.3.2.4'],
    kalip: 'bak-ve-karar-ver',
    ipucu: 'Robot seranın kaç bitki olduğunu da, bitkinin ne istediğini de bilmiyor: her bitkide önce bakmalı.',
  },
  {
    ...BLOK,
    id: 'a3-teras',
    sinif: 3,
    ad: 'Teras bahçe',
    aciklama: 'Basamaklı bahçelerde basamak sayısı farklı. Kuru saksıları sula, çiçeğe in.',
    yonerge: 'Kuru saksıları sula, nemlileri sulama, robotu çiçeğe indir. Her bahçede basamak sayısı ve saksıların yeri farklı: kodun hepsinde çalışsın.',
    dunyalar: TERASLAR,
    hedef: SULA_VE_VAR,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SAGA, SOLA, SULA, KADAR, KURUYSA, kez(3)],
    enCokBlok: 9,
    cozum: k([['kadar', 'cikistayim', ['ileri', ['eger', 'toprakKuru', ['sula']], 'sagaDon', 'ileri', ['eger', 'toprakKuru', ['sula']], 'solaDon']]], 'a3t-'),
    kazanimlar: ['MAT.3.2.5', 'MAT.3.2.4'],
    kalip: 'bitene-kadar',
    ipucu: 'Bir basamağı inen parçayı bul; saksı basamağın iki karesinden birinde olabilir.',
  },
  {
    ...BLOK,
    id: 'a3-ayna',
    sinif: 3,
    ad: 'Ayna atölyesi',
    aciklama: 'Artı şeklinin her sahada başka bir yarısı çizili. Hangisi olursa olsun şekli tamamla.',
    yonerge: 'Şeklin bir yarısı çizili; öbür yarısı aynadaki görüntüsü. Şekli tamamla. Her sahada başka yarı çizili: kodun hepsinde şekli tamamlasın.',
    dunyalar: AYNALAR,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, kez(2)],
    enCokBlok: 8,
    cozum: k([['kez', 4, ['ileri', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'sagaDon', 'ileri']]], 'a3a-'),
    kazanimlar: ['MAT.3.3.6', 'MAT.3.3.7', 'MAT.3.3.8'],
    kalip: 'ayna',
    ipucu: 'Artının iki simetri doğrusu var: dört çeyreği birbirinin eşi. Bir çeyreği çizen parçayı bul.',
  },

  // --- 4. sınıf ------------------------------------------------------------------
  {
    ...BLOK,
    id: 'a4-cevre',
    sinif: 4,
    ad: 'Bahçe çevresi',
    aciklama: 'Kare bahçenin çevresini bir tur dolaş: kuruyu sula, olgunu topla. Bitkiler her bahçede farklı.',
    yonerge: 'Robot kare bahçenin çevresini bir tur dolaşsın: kuru saksıları sulasın, olgun domatesleri toplasın. Her bahçede bitkiler başka yerde: kodun hepsinde çalışsın.',
    dunyalar: HALKALAR,
    hedef: { kurulariSula: true, kirmizilariTopla: true, cikistaBitir: false },
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, SULA, TOPLA, KURUYSA, KIRMIZIYSA, kez(3)],
    enCokBlok: 8,
    cozum: k([['kez', 4, [['kez', 3, ['ileri', ['eger', 'toprakKuru', ['sula']], ['eger', 'domatesKirmizi', ['topla']]]], 'sagaDon']]], 'a4c-'),
    kazanimlar: ['MAT.4.2.6', 'MAT.4.3.5', 'MAT.4.3.3'],
    kalip: 'sekil',
    ipucu: 'Karenin bir kenarını dolaşıp köşede dönen parçayı bul. Kare kaç kenarlı?',
  },
  {
    ...BLOK,
    id: 'a4-kule',
    sinif: 4,
    ad: 'Kule şehri',
    aciklama: 'Her sokakta kule sayısı farklı, her kule 3 küp. Tek kodla bütün sokakları kur.',
    yonerge: 'Dron sokaktaki bütün kuleleri kursun, her kule 3 küp. Sonra çıkışta dursun. Sokakların uzunluğu ve yönü farklı: kodun hepsinde çalışsın.',
    dunyalar: SOKAKLAR,
    hedef: KUR_VE_CIK,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, KOY, KADAR, kez(4)],
    enCokBlok: 5,
    cozum: k(['ileri', ['kadar', 'cikistayim', [['kez', 3, ['koy']], 'ileri']]], 'a4k-'),
    kazanimlar: ['MAT.4.2.6', 'MAT.4.1.5', 'MAT.4.3.10'],
    kalip: 'bitene-kadar',
    ipucu: 'Önce bir kuleyi kuran parçayı bul. Sonra düşün: dron kaç kule olduğunu bilmeden nerede durmalı?',
  },
  {
    ...BLOK,
    id: 'a4-pencere',
    sinif: 4,
    ad: 'Pencere ustası',
    aciklama: 'Dört camlı pencerelerin her seferinde başka çıtaları eksik. Hangisi eksik olursa olsun tamamla.',
    yonerge: 'Pencerenin eksik çıtalarını çiz. Her pencerede başka çıtalar eksik: kodun hepsinde bütün pencereyi tamamlasın.',
    dunyalar: PENCERELER,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA, kez(4)],
    enCokBlok: 6,
    cozum: k([['kez', 4, [['kez', 4, ['ileri', 'ileri', 'sagaDon']], 'sagaDon']]], 'a4p-'),
    kazanimlar: ['MAT.4.3.10', 'MAT.4.3.2', 'MAT.4.3.5'],
    kalip: 'ic-ice',
    ipucu: 'Pencere dört eş kareden oluşur. Bir kareyi çizen parçayı bul; sonra robotu bir sonraki kareye çevir.',
  },
];
