/**
 * Algoritma Laboratuvarı — 1. sınıf (Keşif adası): dört ünite.
 *
 * Okumaya yeni başlayan çocuklar için: numaralı ok kartları, kısa yönergeler (kendiliğinden sesli
 * okunur), tek harita, yalnız sıralı adımlar (tekrar ve karar yok). Robot bahçede yürür; her adımda
 * hücreye numaralı iz bırakır (sayma). Kazanımlar projedeki TYMM matematik listesindendir.
 *
 *   1. Adım adım     sıralı adımlar, sayma          MAT.1.3.1 · 1.1.5 · 1.1.3
 *   2. Sağa, sola    yön değiştirme                 MAT.1.3.1
 *   3. Git ve sula   eylemi doğru yerde yapmak      MAT.1.3.1 · 1.2.1 · 1.1.3
 *   4. Örüntü        tekrar eden parça (2. sınıfta "tekrarla" olacak)   MAT.1.1.6
 */
import { programKur, type BlokSablonu, type KisaBlok } from './program';
import { bahce, type HedefAdi, type Hedef } from './dunya';
import { izOzeti } from './yorumlayici';
import type { Gorev, Unite } from './gorev';

export const CICEK: HedefAdi = { yalin: 'çiçek', yonelme: 'çiçeğe', belirtme: 'çiçeği' };

const ILERI: BlokSablonu = { tur: 'eylem', eylem: 'ileri' };
const SAGA: BlokSablonu = { tur: 'eylem', eylem: 'sagaDon' };
const SOLA: BlokSablonu = { tur: 'eylem', eylem: 'solaDon' };
const SULA: BlokSablonu = { tur: 'eylem', eylem: 'sula' };

const HEDEFE_VAR: Hedef = { cikistaBitir: true };
const HEPSINI_SULA: Hedef = { kurulariSula: true, cikistaBitir: false };

const k = (liste: KisaBlok[], onek: string) => programKur(liste, onek);
const tekrar = (n: number, parca: KisaBlok[]): KisaBlok[] => Array.from({ length: n }, () => parca).flat();

const ADIM = (iz: Parameters<Gorev['basari']>[0]) => izOzeti(iz).ileri;

// ---------------------------------------------------------------------------
// 1. Adım adım
// ---------------------------------------------------------------------------

const ADIM_GOREVLERI: Gorev[] = [
  {
    id: 's1-adim-1',
    tur: 'yaz',
    baslik: 'Çiçeğe git',
    yonerge: 'Robotu çiçeğe götür.',
    dunya: bahce('b-adim-1', 'Kısa yol', ['B..H'], { hedefAdi: CICEK }),
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI],
    baslangic: 'bos',
    cozum: k(tekrar(3, ['ileri']), 'a1-'),
    ipuclari: ['Robotun durduğu kareyi sayma. İlk adım bir sonraki karedir. Parmağınla say: bir, iki, üç.'],
    basari: (iz) => `Oldu! Robot ${ADIM(iz)} adım attı.`,
    kazanimlar: ['MAT.1.3.1', 'MAT.1.1.5'],
  },
  {
    id: 's1-adim-2',
    tur: 'kurgu',
    baslik: 'Uzak çiçek',
    yonerge: 'Çiçek şimdi daha uzakta. Kodunu düzelt.',
    dunya: bahce('b-adim-2', 'Uzun yol', ['B.....H'], { hedefAdi: CICEK }),
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI],
    baslangic: 'onceki',
    cozum: k(tekrar(6, ['ileri']), 'a2-'),
    ipuclari: ['Kodunda kaç adım var? Çiçeğe kaç adım var? Kaç adım eklemelisin?'],
    basari: (iz) => `Oldu! Robot ${ADIM(iz)} adım attı.`,
    kazanimlar: ['MAT.1.3.1', 'MAT.1.1.5', 'MAT.1.2.1'],
  },
  {
    id: 's1-adim-3',
    tur: 'kurgu',
    baslik: 'Yakın çiçek',
    yonerge: 'Bu kez çiçek daha yakın. Kodunu düzelt.',
    dunya: bahce('b-adim-3', 'Yol devam ediyor', ['B....H..'], { hedefAdi: CICEK }),
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI],
    baslangic: 'onceki',
    cozum: k(tekrar(5, ['ileri']), 'a3-'),
    ipuclari: ['Robot çiçeği geçiyorsa bir adımı çıkar. Bir kartı sürükleyip bloklara geri bırakabilirsin.'],
    basari: (iz) => `Oldu! Robot ${ADIM(iz)} adımda çiçeğe vardı.`,
    kazanimlar: ['MAT.1.3.1', 'MAT.1.2.1'],
  },
  {
    id: 's1-adim-4',
    tur: 'hata',
    baslik: 'Eksik adım',
    yonerge: 'Robot çiçeğe varamıyor. Hatayı bul, düzelt.',
    dunya: bahce('b-adim-4', 'Aşağı inen yol', ['B', '.', '.', '.', 'H'], { hedefAdi: CICEK, yon: 1 }),
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI],
    baslangic: k(tekrar(3, ['ileri']), 'h4-'),
    cozum: k(tekrar(4, ['ileri']), 'a4-'),
    ipuclari: ['Robot durunca çiçeğe kaç kare kaldı? O kadar adım ekle.'],
    basari: () => 'Buldun! Bir adım eksikti.',
    kazanimlar: ['MAT.1.3.1', 'MAT.1.1.5'],
  },
  {
    id: 's1-adim-5',
    tur: 'hata',
    baslik: 'Fazla adım',
    yonerge: 'Robot çiçeği geçiyor. Hatayı bul, düzelt.',
    dunya: bahce('b-adim-5', 'Sola giden yol', ['..H...B'], { hedefAdi: CICEK, yon: 2 }),
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI],
    baslangic: k(tekrar(6, ['ileri']), 'h5-'),
    cozum: k(tekrar(4, ['ileri']), 'a5-'),
    ipuclari: ['Robot çiçeği kaç kare geçti? O kadar adımı çıkar.'],
    basari: () => 'Buldun! İki adım fazlaydı.',
    kazanimlar: ['MAT.1.3.1', 'MAT.1.2.1'],
  },
];

// ---------------------------------------------------------------------------
// 2. Sağa, sola
// ---------------------------------------------------------------------------

const DON_1 = bahce('b-don-1', 'Sağa dönen yol', ['B..', '##.', '##H'], { hedefAdi: CICEK });
const DON_2 = bahce('b-don-2', 'Sola dönen yol', ['##H', '##.', 'B..'], { hedefAdi: CICEK });
const donBasari = (iz: Parameters<Gorev['basari']>[0]) => {
  const o = izOzeti(iz);
  return `Oldu! Robot ${o.ileri} adım attı, ${o.donus} kez döndü.`;
};

const DON_GOREVLERI: Gorev[] = [
  {
    id: 's1-don-1',
    tur: 'yaz',
    baslik: 'Köşeyi dön',
    yonerge: 'Robotu çiçeğe götür. Köşede dönmen gerek.',
    dunya: DON_1,
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA],
    baslangic: 'bos',
    cozum: k(['ileri', 'ileri', 'sagaDon', 'ileri', 'ileri'], 'd1-'),
    ipuclari: ['Kendini robotun yerine koy: yüzün hangi yöne bakıyor? Köşede sağına mı dönmelisin, soluna mı?', 'Dönmek robotu ilerletmez; döndükten sonra yine "ileri" gerekir.'],
    basari: donBasari,
    kazanimlar: ['MAT.1.3.1'],
  },
  {
    id: 's1-don-2',
    tur: 'kurgu',
    baslik: 'Öbür yana',
    yonerge: 'Bu yol öbür yana dönüyor. Kodunu düzelt.',
    dunya: DON_2,
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA],
    baslangic: 'onceki',
    cozum: k(['ileri', 'ileri', 'solaDon', 'ileri', 'ileri'], 'd2-'),
    ipuclari: ['Adımlar aynı; yalnız dönüş değişti. Hangi kartı değiştirmelisin?'],
    basari: donBasari,
    kazanimlar: ['MAT.1.3.1'],
  },
  {
    id: 's1-don-3',
    tur: 'yaz',
    baslik: 'İki kez dön',
    yonerge: 'Bu yol birkaç kez dönüyor. Robotu çiçeğe götür.',
    dunya: bahce('b-don-3', 'Kıvrılan yol', ['B.###', '#...#', '###H#'], { hedefAdi: CICEK }),
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA],
    baslangic: 'bos',
    cozum: k(['ileri', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'ileri', 'sagaDon', 'ileri'], 'd3-'),
    ipuclari: ['Yolu parmağınla izle. Her köşede dur ve sor: sağa mı, sola mı?'],
    basari: donBasari,
    kazanimlar: ['MAT.1.3.1'],
  },
  {
    id: 's1-don-4',
    tur: 'hata',
    baslik: 'Yanlış yön',
    yonerge: 'Robot yanlış yöne dönüyor. Hatayı bul, düzelt.',
    dunya: DON_1,
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA],
    baslangic: k(['ileri', 'ileri', 'solaDon', 'ileri', 'ileri'], 'h6-'),
    cozum: k(['ileri', 'ileri', 'sagaDon', 'ileri', 'ileri'], 'd4-'),
    ipuclari: ['Robot köşede hangi yana döndü? Öbür yana dönmeli.'],
    basari: () => 'Buldun! Robot sola değil, sağa dönmeliydi.',
    kazanimlar: ['MAT.1.3.1'],
  },
  {
    id: 's1-don-5',
    tur: 'hata',
    baslik: 'Unutulan dönüş',
    yonerge: 'Robot dönmeyi unutuyor. Hatayı bul, düzelt.',
    dunya: DON_2,
    hedef: HEDEFE_VAR,
    bitkiAdi: 'bitki',
    aracKutusu: [ILERI, SAGA, SOLA],
    baslangic: k(tekrar(4, ['ileri']), 'h7-'),
    cozum: k(['ileri', 'ileri', 'solaDon', 'ileri', 'ileri'], 'd5-'),
    ipuclari: ['Köşeye gelince robot ne yapmalı? Dönüş kartını doğru yere koy.'],
    basari: () => 'Buldun! Köşede dönmek gerekiyordu.',
    kazanimlar: ['MAT.1.3.1'],
  },
];

// ---------------------------------------------------------------------------
// 3. Git ve sula
// ---------------------------------------------------------------------------

const sulaBasari = (iz: Parameters<Gorev['basari']>[0]) => `Oldu! Robot ${izOzeti(iz).sulama} saksıyı suladı.`;

const SULA_GOREVLERI: Gorev[] = [
  {
    id: 's1-sula-1',
    tur: 'yaz',
    baslik: 'Saksıyı sula',
    yonerge: 'Saksıya git ve sula.',
    dunya: bahce('b-sula-1', 'Bir saksı', ['B..K']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA],
    baslangic: 'bos',
    cozum: k(['ileri', 'ileri', 'ileri', 'sula'], 's1-'),
    ipuclari: ['Önce saksının karesine git. Oraya varınca "sula" kartını kullan.'],
    basari: sulaBasari,
    kazanimlar: ['MAT.1.3.1'],
  },
  {
    id: 's1-sula-2',
    tur: 'kurgu',
    baslik: 'İki saksı',
    yonerge: 'Bu bahçede iki saksı var. İkisini de sula. Kodunu düzelt.',
    dunya: bahce('b-sula-2', 'İki saksı', ['B.K.K']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA],
    baslangic: 'onceki',
    cozum: k(['ileri', 'ileri', 'sula', 'ileri', 'ileri', 'sula'], 's2-'),
    ipuclari: ['Birinci saksı kaçıncı karede? İkinci saksı kaçıncı karede? Her saksıda dur ve sula.'],
    basari: sulaBasari,
    kazanimlar: ['MAT.1.3.1', 'MAT.1.1.3'],
  },
  {
    id: 's1-sula-3',
    tur: 'kurgu',
    baslik: 'Köşedeki saksı',
    yonerge: 'İkinci saksı köşeyi dönünce. Kodunu düzelt.',
    dunya: bahce('b-sula-3', 'Köşeli bahçe', ['B.K', '##.', '##K']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SAGA, SOLA, SULA],
    baslangic: 'onceki',
    cozum: k(['ileri', 'ileri', 'sula', 'sagaDon', 'ileri', 'ileri', 'sula'], 's3-'),
    ipuclari: ['Birinci saksıyı suladıktan sonra robot köşede. Oradan hangi yana dönmeli?'],
    basari: sulaBasari,
    kazanimlar: ['MAT.1.3.1'],
  },
  {
    id: 's1-sula-4',
    tur: 'hata',
    baslik: 'Boş yer',
    yonerge: 'Robot boş yeri suluyor. Hatayı bul, düzelt.',
    dunya: bahce('b-sula-4', 'Bir saksı', ['B..K']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA],
    baslangic: k(['ileri', 'ileri', 'sula', 'ileri'], 'h8-'),
    cozum: k(['ileri', 'ileri', 'ileri', 'sula'], 's4-'),
    ipuclari: ['Robot sularken saksının yanında mı? "sula" kartını doğru yere taşı.'],
    basari: () => 'Buldun! Robot önce saksıya varmalıydı.',
    kazanimlar: ['MAT.1.3.1'],
  },
  {
    id: 's1-sula-5',
    tur: 'hata',
    baslik: 'Unutulan saksı',
    yonerge: 'Robot bir saksıyı unutuyor. Hatayı bul, düzelt.',
    dunya: bahce('b-sula-5', 'Üç saksı', ['B.K.K.K']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA],
    baslangic: k(['ileri', 'ileri', 'sula', 'ileri', 'ileri', 'ileri', 'ileri', 'sula'], 'h9-'),
    cozum: k(['ileri', 'ileri', 'sula', 'ileri', 'ileri', 'sula', 'ileri', 'ileri', 'sula'], 's5-'),
    ipuclari: ['Hangi saksı susuz kaldı? Robot o saksının karesindeyken "sula" kartını ekle.'],
    basari: sulaBasari,
    soru: {
      metin: 'Robot 3 saksıyı suladı. 2 saksı daha olsaydı kaç saksı sulardı?',
      birim: 'saksı',
      cevap: () => 5,
      sonrasi: '3 + 2 = 5.',
      yonlendirme: 'Parmaklarınla say: üç, sonra iki tane daha.',
    },
    kazanimlar: ['MAT.1.3.1', 'MAT.1.1.3', 'MAT.1.2.1'],
  },
];

// ---------------------------------------------------------------------------
// 4. Örüntü
// ---------------------------------------------------------------------------

const ORUNTU_GOREVLERI: Gorev[] = [
  {
    id: 's1-oruntu-1',
    tur: 'yaz',
    baslik: 'Örüntüyü tamamla',
    yonerge: 'Robot bir adım gidip bir saksı suluyor. Örüntüyü tamamla.',
    dunya: bahce('b-or-1', 'Yan yana saksılar', ['BKKKK']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA],
    baslangic: k(['ileri', 'sula', 'ileri', 'sula'], 'o0-'),
    cozum: k(tekrar(4, ['ileri', 'sula']), 'o1-'),
    ipuclari: ['Örüntüyü sesli söyle: ileri, sula, ileri, sula… Sonra ne gelir?'],
    basari: (iz) => `Oldu! Örüntü: ileri, sula. Robot ${izOzeti(iz).sulama} saksıyı suladı.`,
    kazanimlar: ['MAT.1.1.6'],
  },
  {
    id: 's1-oruntu-2',
    tur: 'kurgu',
    baslik: 'Aralıklı saksılar',
    yonerge: 'Bu bahçede saksılar birer boşluk bırakarak dizilmiş. Örüntüyü değiştir.',
    dunya: bahce('b-or-2', 'Aralıklı saksılar', ['B.K.K.K']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA],
    baslangic: 'onceki',
    cozum: k(tekrar(3, ['ileri', 'ileri', 'sula']), 'o2-'),
    ipuclari: ['Bir saksıdan ötekine kaç adım var? Yeni örüntü: ileri, ileri, sula.'],
    basari: () => 'Oldu! Yeni örüntü: ileri, ileri, sula.',
    kazanimlar: ['MAT.1.1.6'],
  },
  {
    id: 's1-oruntu-3',
    tur: 'hata',
    baslik: 'Bozuk örüntü',
    yonerge: 'Örüntü bir yerde bozulmuş. Hatayı bul, düzelt.',
    dunya: bahce('b-or-3', 'Beş saksı', ['BKKKKK']),
    hedef: HEPSINI_SULA,
    bitkiAdi: 'saksı',
    aracKutusu: [ILERI, SULA],
    baslangic: k(['ileri', 'sula', 'ileri', 'sula', 'ileri', 'ileri', 'sula', 'ileri', 'sula'], 'o3h-'),
    cozum: k(tekrar(5, ['ileri', 'sula']), 'o3-'),
    ipuclari: ['Örüntüyü kart kart oku: ileri, sula, ileri, sula… Nerede bozuluyor?'],
    basari: () => 'Buldun! Örüntü artık hiç bozulmuyor: ileri, sula.',
    kazanimlar: ['MAT.1.1.6'],
  },
];

// ---------------------------------------------------------------------------
// Üniteler
// ---------------------------------------------------------------------------

const ORTAK = { sinif: 1, kademe: 'Keşif adası', tema: 'Okul bahçesi', gorunum: 'kart' as const, sesliYonerge: true, sure: '1 ders saati' };

export const SINIF1: readonly Unite[] = [
  {
    ...ORTAK,
    id: 's1-adim',
    no: 1,
    ad: 'Adım adım',
    yeniKavram: 'Sıralı adımlar ve sayma',
    oncedenBilinen: 'Yok (ilk ünite)',
    kalip: 'sirayla',
    kazanimlar: ['MAT.1.3.1', 'MAT.1.1.5', 'MAT.1.1.3', 'MAT.1.2.1'],
    gorevler: ADIM_GOREVLERI,
    fissiz: {
      ad: 'Robot yürüyüşü',
      amac: 'Bir hedefe ulaşmak için adımları saymak ve sırayla dizmek.',
      sure: '10 dakika',
      roller: ['Bir öğrenci robot olur; yalnız gösterilen kartı uygular.', 'Sınıf programcıdır; kartları tahtaya sırayla dizer ve adımları hep birlikte sayar.'],
      adimlar: [
        'Yere 6–8 karelik düz bir yol yapın; yolun sonuna bir çiçek resmi koyun.',
        'Sınıf çiçeğe kaç adım olduğunu sayar ve o kadar İLERİ kartını tahtaya dizer.',
        'Robot kartları sırayla uygular; her adımda sınıf hep birlikte sayar: bir, iki, üç…',
        'Çiçeği bir kare ileri ya da geri koyun. Sınıf kartları ekleyerek ya da çıkararak programı düzeltir.',
      ],
      hazirlik: 'İLERİ kartlarını kesin. Yere tebeşirle ya da bantla kare yol çizin. Robotun durduğu kare sayılmaz; ilk adım bir sonraki karedir.',
      kartlar: [{ komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 8 }],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir hedefe ulaşmak için gereken adımları sayar, kartları sırayla dizer ve eksik ya da fazla adımı düzeltir.',
      dersler: [{ baslik: '1 ders', metin: 'Fişsiz "Robot yürüyüşü" (10 dk), ardından 1–3. görevler sınıfça tahtada, 4–5. görevler (hatayı bul) ikişerli.' }],
      yanilgilar: [
        { ad: 'Başlangıç karesini saymak', metin: 'Robotun durduğu kareyi de sayıp bir adım fazla koymak. Adım izleri (1, 2, 3…) her adımın bir sonraki kareye gittiğini gösterir.' },
        { ad: 'Önünde durmak ya da geçmek', metin: 'Bir eksik ya da bir fazla adım. Tuvaldeki ileti kaç kare kaldığını ya da kaç kare geçildiğini söyler.' },
      ],
      sorular: ['Robot kaç adım attı? Nasıl saydın?', 'Çiçek bir kare uzaklaşınca koda ne eklemeliyiz?', 'Robot çiçeği geçince ne yapmalıyız?'],
      celdiriciler: 'Bu ünitede tek kart vardır: ileri. Dikkat sayma ve sıra üzerindedir.',
    },
  },
  {
    ...ORTAK,
    id: 's1-don',
    no: 2,
    ad: 'Sağa, sola',
    yeniKavram: 'Yön değiştirme',
    oncedenBilinen: 'Sıralı adımlar (1. ünite)',
    kalip: 'don-ve-devam',
    kazanimlar: ['MAT.1.3.1'],
    gorevler: DON_GOREVLERI,
    fissiz: {
      ad: 'Sağa, sola dansı',
      amac: 'Robotun kendi sağına ve soluna dönmesini bedenle yaşamak.',
      sure: '10 dakika',
      roller: ['Bir öğrenci robot olur.', 'Sınıf programcıdır; kartları tahtaya dizer.'],
      adimlar: [
        'Yere 3×3 karelik bir ızgara çizin; bir köşeye çiçek resmi koyun.',
        'Robot öğrenci bir kareye, bir yöne bakarak durur.',
        'Sınıf İLERİ, SAĞA DÖN, SOLA DÖN kartlarıyla çiçeğe giden programı kurar.',
        'Robot döner ama yerinden kıpırdamaz; dönmek bir adım değildir.',
        'Robotu sınıfa dönük durdurup yeniden deneyin: robotun sağı, sınıfın solu olur.',
      ],
      hazirlik: 'Kartları kesin. Robot dönerken kendi sağına ya da soluna döner, sınıfın sağına değil.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 6 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 2 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 2 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir hedefe ulaşmak için adımları ve dönüşleri birlikte kullanır; dönüşü robotun bakış açısından düşünür.',
      dersler: [{ baslik: '1 ders', metin: 'Fişsiz "Sağa, sola dansı" (10 dk), ardından 1–3. görevler; 4–5. görevler (hatayı bul) ikişerli.' }],
      yanilgilar: [
        { ad: 'Kendi bakışından düşünmek', metin: 'Robot kameraya doğru giderken onun sağı bizim solumuzdur. Çocuğa "robotun yerine geç" demek işe yarar.' },
        { ad: 'Dönmenin ilerlettiğini sanmak', metin: 'Dönen robot yerinde kalır; döndükten sonra yine "ileri" gerekir.' },
      ],
      sorular: ['Robot köşede hangi yana döndü?', 'Robot sana doğru gelirken onun sağı hangi yanda?', 'Dönünce robot kaç kare ilerledi?'],
      celdiriciler: 'Araç kutusunda hem "sağa dön" hem "sola dön" vardır; yanlış olanı seçen çocuk çite çarpar ve nedenini görür.',
    },
  },
  {
    ...ORTAK,
    id: 's1-sula',
    no: 3,
    ad: 'Git ve sula',
    yeniKavram: 'Eylemi doğru yerde yapmak',
    oncedenBilinen: 'Adımlar ve dönüşler (1–2. ünite)',
    kalip: 'git-ve-yap',
    kazanimlar: ['MAT.1.3.1', 'MAT.1.1.3', 'MAT.1.2.1'],
    gorevler: SULA_GOREVLERI,
    fissiz: {
      ad: 'Bahçıvan robot',
      amac: 'Önce doğru yere gidip sonra işi yapmak.',
      sure: '10 dakika',
      roller: ['Bir öğrenci robot olur; elinde küçük bir sulama kabı (ya da resmi) vardır.', 'Sınıf programcıdır.'],
      adimlar: [
        'Yere düz bir yol çizin; yola iki ya da üç saksı resmi koyun.',
        'Sınıf her saksıya kaç adımda varılacağını sayar ve SULA kartını doğru yere koyar.',
        'Robot programı uygular; saksıya varmadan sularsa sınıf "boş yere!" der.',
        'Saksılardan birinin yerini değiştirin; sınıf programı düzeltir.',
      ],
      hazirlik: 'İLERİ, dönüş ve SULA kartlarını kesin. Saksılar için resim ya da gerçek küçük saksılar kullanabilirsiniz.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 6 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 1 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 1 },
        { komut: 'SULA', aciklama: 'Bulunduğun karedeki saksıyı sula.', adet: 3 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir işi doğru yerde yapmak için önce oraya gider; birden çok saksıyı sırayla sular ve atlanan saksıyı bulur.',
      dersler: [{ baslik: '1 ders', metin: 'Fişsiz "Bahçıvan robot" (10 dk), ardından 1–3. görevler; 4–5. görevler (hatayı bul) ikişerli. 5. görevdeki soru toplamaya bağlanır.' }],
      yanilgilar: [
        { ad: 'Varmadan yapmak', metin: 'Saksıya varmadan "sula" kartını koymak. Tuval "boş yeri suladı" der ve suyun toprağa aktığını gösterir.' },
        { ad: 'Bir saksıyı atlamak', metin: 'İki saksı arasında "sula"yı unutmak. İleti hangi saksının susuz kaldığını sıra sayısıyla söyler (2. saksı).' },
      ],
      sorular: ['Robot hangi karede suladı?', 'Kaçıncı saksı susuz kaldı?', '3 saksı suladık; 2 tane daha olsaydı kaç ederdi?'],
      celdiriciler: 'Dönüş kartları yalnız köşeli bahçede gerekir; düz yolda kullanan çocuk çite çarpar.',
    },
  },
  {
    ...ORTAK,
    id: 's1-oruntu',
    no: 4,
    ad: 'Örüntü',
    yeniKavram: 'Tekrar eden parça (2. sınıfta "tekrarla" olacak)',
    oncedenBilinen: 'Git ve sula (3. ünite)',
    kalip: 'oruntu',
    kazanimlar: ['MAT.1.1.6'],
    gorevler: ORUNTU_GOREVLERI,
    fissiz: {
      ad: 'Örüntü dansı',
      amac: 'Kodda tekrar eden parçayı sesle ve bedenle fark etmek.',
      sure: '10 dakika',
      roller: ['Bir öğrenci robot olur.', 'Sınıf ritmi tutar.'],
      adimlar: [
        'Yere yan yana beş saksı resmi koyun.',
        'Sınıf ritimle söyler: "ileri – sula, ileri – sula…"; robot her sözcükte uygular.',
        'Saksıları birer boşluk bırakarak dizin. Sınıf yeni ritmi bulur: "ileri – ileri – sula".',
        'Öğretmen ritmi bir yerde bozar; sınıf bozuk yeri bulur.',
      ],
      hazirlik: 'İLERİ ve SULA kartlarını kesin. Kartları tahtaya dizerken tekrar eden parçayı renkli bir çerçeveyle gösterebilirsiniz.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 6 },
        { komut: 'SULA', aciklama: 'Bulunduğun karedeki saksıyı sula.', adet: 5 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci kodda tekrar eden parçayı (örüntüyü) bulur, sürdürür, değiştirir ve bozulduğu yeri düzeltir.',
      dersler: [{ baslik: '1 ders', metin: 'Fişsiz "Örüntü dansı" (10 dk), ardından üç görev. Ders "bu parçayı kaç kez yazdık?" sorusuyla kapanır; 2. sınıfta aynı parça "tekrarla" bloğuna girecek.' }],
      yanilgilar: [
        { ad: 'Bir kez yazıp bırakmak', metin: 'Örüntüyü bir iki kez yazıp kalan saksıları unutmak.' },
        { ad: 'Yanlış parçayı tekrar etmek', metin: 'Aralıklı saksılarda "ileri, sula" parçasını sürdürmek. Tuval ilk sulamanın boş yere yapıldığını gösterir.' },
      ],
      sorular: ['Kodda tekrar eden parça hangisi?', 'Bu parçayı kaç kez yazdık?', 'Saksılar aralıklı olunca parça nasıl değişti?'],
      celdiriciler: 'Bu ünitede yalnız iki kart vardır; dikkat örüntüyü görmek üzerindedir.',
    },
  },
];
