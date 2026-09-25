/**
 * Algoritma Laboratuvarı — örnek ünite: "Bak ve karar ver" (3. sınıf · Sera).
 *
 * Kurgu (kullanıcı kararı, 2026-09-24): ekranda yalnız tuval, kod ve yönerge. Öğrenci önce kodu
 * kendisi yazar; sonra aynı kod farklı kurgularda (başka sera, yeni kural, uzun sıra) sınanır ve
 * gerekirse düzeltilir; araya hazır kodlardaki hataları bulma görevleri girer. Görevler tek tek
 * gelir, ekranda hep yalnız bir görev vardır.
 *
 * Bütün içerik veridir; testler her görevin çözümünün kendi dünyasında çalıştığını, "önceki kod"
 * zincirinin anlamlı olduğunu (genel çözüm yeni kurguda da çalışır, ezber çözüm bozulur) ve hatalı
 * başlangıç kodlarının gerçekten hatalı olduğunu denetler.
 *
 * Kazanım kodları projedeki TYMM matematik listesindendir (scripts/veri/kazanim-metinleri.json).
 */
import { programKur, type BlokSablonu } from './program';
import { domatesSirasi, saksiSirasi, type DunyaTanimi, type Hedef } from './dunya';
import { izOzeti } from './yorumlayici';
import type { FissizEtkinlik, Gorev, OgretmenNotuVerisi, Unite } from './gorev';

export { GOREV_TURU_ADI, KAZANIMLAR } from './gorev';
export type { FissizEtkinlik, Gorev, GorevSorusu, GorevTuru, Kazanim, Unite } from './gorev';

// ---------------------------------------------------------------------------
// Dünyalar
// ---------------------------------------------------------------------------

export const SERA_ILK: DunyaTanimi = { id: 'sera-ilk', ad: 'Sera', bitkiler: saksiSirasi('K N K K N N'), depo: 20 };
export const SERA_UZUN: DunyaTanimi = { id: 'sera-uzun', ad: 'Büyük sera', bitkiler: saksiSirasi('N K K N K N K K'), depo: 20 };
export const SERA_SARI: DunyaTanimi = { id: 'sera-sari', ad: 'Sararmış yapraklar', bitkiler: saksiSirasi('K Ns K Ks N N'), depo: 20 };
export const SERA_KISA: DunyaTanimi = { id: 'sera-kisa', ad: 'Küçük sera', bitkiler: saksiSirasi('N K N K'), depo: 20 };
export const HASAT_ILK: DunyaTanimi = { id: 'hasat-ilk', ad: 'Domates sırası', bitkiler: domatesSirasi('K Y K K Y K Y K') };
export const HASAT_UZUN: DunyaTanimi = { id: 'hasat-uzun', ad: 'Uzun domates sırası', bitkiler: domatesSirasi('K K K Y K K K Y K K K K') };

// ---------------------------------------------------------------------------
// Programlar
// ---------------------------------------------------------------------------

/** 1. görevin başlangıcı: 2. üniteden bilinen döngü hazır; robot yürür ama sulamaz */
export const YURUYEN_ROBOT = programKur([['kadar', 'cikistayim', ['ileri']]], 'y');
/** Sulama: doğru çözüm */
export const SULAMA_PROGRAMI = programKur([['kadar', 'cikistayim', ['ileri', ['eger', 'toprakKuru', ['sula']]]]], 's');
/** Hata 1: "sula" eğer'in dışına kaymış → nemli saksı taşar */
export const BOZUK_SULAMA = programKur([['kadar', 'cikistayim', ['ileri', ['eger', 'toprakKuru', []], 'sula']]], 'h');
/** Hata 2: "ileri git" de eğer'in içine girmiş → robot başlangıçta sonsuza kadar bekler */
export const SONSUZ_SULAMA = programKur([['kadar', 'cikistayim', [['eger', 'toprakKuru', ['sula', 'ileri']]]]], 'z');
export const GUBRE_COZUMU = programKur([['kadar', 'cikistayim', ['ileri', ['eger', 'toprakKuru', ['sula']], ['eger', 'yaprakSari', ['gubreVer']]]]], 'g');
export const HASAT_COZUMU = programKur([['kadar', 'cikistayim', ['ileri', ['eger', 'domatesKirmizi', ['topla']]]]], 'c');

// ---------------------------------------------------------------------------
// Görevler
// ---------------------------------------------------------------------------

const SULAMA_HEDEFI: Hedef = { kurulariSula: true, cikistaBitir: true };
const GUBRE_HEDEFI: Hedef = { kurulariSula: true, sarilariGubrele: true, cikistaBitir: true };
const HASAT_HEDEFI: Hedef = { kirmizilariTopla: true, cikistaBitir: true };

const SULAMA_ARACLARI: BlokSablonu[] = [
  { tur: 'eylem', eylem: 'ileri' },
  { tur: 'eylem', eylem: 'sula' },
  { tur: 'tekrarlaKadar', kosul: 'cikistayim' },
  { tur: 'eger', kosul: 'toprakKuru' },
];

const HASAT_ARACLARI: BlokSablonu[] = [
  { tur: 'eylem', eylem: 'ileri' },
  { tur: 'eylem', eylem: 'topla' },
  { tur: 'tekrarlaKadar', kosul: 'cikistayim' },
  { tur: 'eger', kosul: 'domatesKirmizi' },
  { tur: 'eylem', eylem: 'sagaDon' },
  { tur: 'tekrarlaKez', kez: 8 },
];

export const GOREVLER: readonly Gorev[] = [
  {
    id: 'sulama-yaz',
    tur: 'yaz',
    baslik: 'Sulama robotu',
    yonerge: 'Robot çıkışa kadar yürüyor ama hiç sulamıyor. Koduna ekle: toprak kuruysa sulasın.',
    dunya: SERA_ILK,
    hedef: SULAMA_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: [...SULAMA_ARACLARI, { tur: 'tekrarlaKez', kez: 6 }],
    baslangic: YURUYEN_ROBOT,
    cozum: SULAMA_PROGRAMI,
    ipuclari: [
      'Robot her saksıda önce toprağa bakmalı. "eğer toprak kuruysa" bloğunu tekrarın içine, "ileri git"in altına koy.',
      '"sula" bloğunu "eğer toprak kuruysa" bloğunun içine koy.',
    ],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! Robot ${o.sulama} saksıyı suladı. Her sulama 2 litre: depoda ${o.kalanSu} litre su kaldı.`;
    },
    kazanimlar: ['MAT.3.2.5', 'MAT.3.3.5'],
  },
  {
    id: 'sulama-buyuk',
    tur: 'kurgu',
    genelleme: true,
    baslik: 'Başka bir sera',
    yonerge: 'Bu serada saksı sayısı farklı. Kodun burada da çalışıyor mu? Çalıştır, gerekirse düzelt.',
    dunya: SERA_UZUN,
    hedef: SULAMA_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: [...SULAMA_ARACLARI, { tur: 'tekrarlaKez', kez: 6 }],
    baslangic: 'onceki',
    cozum: SULAMA_PROGRAMI,
    ipuclari: ['Kodun saksı sayısını bilmeden çalışmalı. "… kez tekrarla" yerine "çıkışa varana kadar tekrarla" kullan.'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! Kodun saksı sayısını bilmeden de çalışıyor. ${o.sulama} saksı × 2 litre = ${o.harcananSu} litre su harcandı.`;
    },
    kazanimlar: ['MAT.3.2.5', 'MAT.3.2.4'],
  },
  {
    id: 'sulama-gubre',
    tur: 'kurgu',
    baslik: 'Sararmış yapraklar',
    yonerge: 'Bazı fidelerin yaprakları sararmış. Koduna ekle: yaprak sarıysa gübre versin.',
    dunya: SERA_SARI,
    hedef: GUBRE_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: [...SULAMA_ARACLARI, { tur: 'eylem', eylem: 'gubreVer' }, { tur: 'eger', kosul: 'yaprakSari' }],
    baslangic: 'onceki',
    cozum: GUBRE_COZUMU,
    ipuclari: ['Robot her saksıda iki şeye bakmalı: toprağa ve yaprağa. İkinci bir "eğer" bloğu ekle.'],
    basari: (iz) => `Oldu! Robot kuru saksıları suladı ve sararmış ${izOzeti(iz).gubre} fideye gübre verdi.`,
    kazanimlar: ['MAT.3.2.5'],
  },
  {
    id: 'hata-tasma',
    tur: 'hata',
    baslik: 'Taşan saksı',
    yonerge: 'Bu kodda bir hata var. Çalıştır, izle, hatayı bul ve düzelt.',
    dunya: SERA_ILK,
    hedef: SULAMA_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: SULAMA_ARACLARI,
    baslangic: BOZUK_SULAMA,
    cozum: SULAMA_PROGRAMI,
    ipuclari: ['"sula" bloğu hangi bloğun içinde? Robot nemli saksıyı sulamamalı.'],
    basari: () => 'Buldun! "sula" artık yalnız toprak kuruyken çalışıyor.',
    kazanimlar: ['MAT.3.2.5'],
  },
  {
    id: 'hata-sonsuz',
    tur: 'hata',
    baslik: 'Kıpırdamayan robot',
    yonerge: 'Robot yerinden hiç kıpırdamıyor. Neden? Hatayı bul ve düzelt.',
    zorlu: true,
    dunya: SERA_KISA,
    hedef: SULAMA_HEDEFI,
    bitkiAdi: 'saksı',
    aracKutusu: SULAMA_ARACLARI,
    baslangic: SONSUZ_SULAMA,
    cozum: SULAMA_PROGRAMI,
    ipuclari: ['Robot yalnız toprak kuruyken mi ilerliyor? "ileri git" bloğunun yerine bak.'],
    basari: () => 'Buldun! Robot artık her turda ilerliyor; kuru saksıya gelince de suluyor.',
    kazanimlar: ['MAT.3.2.5'],
  },
  {
    id: 'hasat-yaz',
    tur: 'yaz',
    baslik: 'Hasat robotu',
    yonerge: 'Hasat robotunun kodunu sen yaz: yalnız kırmızı domatesleri toplasın, çıkışta dursun.',
    dunya: HASAT_ILK,
    hedef: HASAT_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: HASAT_ARACLARI,
    baslangic: 'bos',
    cozum: HASAT_COZUMU,
    ipuclari: [
      'Sulama robotunun kodunu hatırla: çıkışa kadar tekrarla, ilerle, bak ve karar ver.',
      '"eğer domates kırmızıysa" bloğunun içine "topla" koy.',
    ],
    basari: (iz) => `Oldu! Sepette ${izOzeti(iz).sepet} domates var.`,
    kazanimlar: ['MAT.3.2.5'],
  },
  {
    id: 'hasat-uzun',
    tur: 'kurgu',
    genelleme: true,
    baslik: 'Uzun domates sırası',
    yonerge: 'Bu sıra çok uzun. Kodun burada da çalışıyor mu? Çalıştır, gerekirse düzelt.',
    dunya: HASAT_UZUN,
    hedef: HASAT_HEDEFI,
    bitkiAdi: 'bitki',
    aracKutusu: HASAT_ARACLARI,
    baslangic: 'onceki',
    cozum: HASAT_COZUMU,
    ipuclari: ['Kodun domates sayısını bilmeden çalışmalı: "çıkışa varana kadar tekrarla" kullan.'],
    basari: (iz) => `Oldu! Sepette ${izOzeti(iz).sepet} domates var.`,
    soru: { metin: 'Her domates 100 gram. Sepetteki domatesler kaç gram eder?', birim: 'gram', cevap: (iz) => izOzeti(iz).sepet * 100, sonrasi: '1000 gram = 1 kilogram.' },
    kazanimlar: ['MAT.3.2.5', 'MAT.3.2.4', 'MAT.3.1.15'],
  },
];

export function gorevSirasi(id: string): number {
  return GOREVLER.findIndex((g) => g.id === id);
}

// ---------------------------------------------------------------------------
// Fişsiz etkinlik (öğretmen notundan yazdırılır) ve öğretmen notu
// ---------------------------------------------------------------------------

export const FISSIZ: FissizEtkinlik = {
  ad: 'Robot bahçıvan',
  amac: 'Bakmadan karar verilemeyeceğini bedenle yaşamak.',
  sure: '15 dakika',
  roller: ['Bir öğrenci robot olur; yalnız kendisine verilen komut kartını uygular.', 'Bir grup programcı olur; komut kartlarını tahtaya dizer.'],
  adimlar: [
    'Altı saksı kartı yere bir sıra hâlinde, yüzü aşağı gelecek biçimde dizilir. Kartların bazılarında "kuru", bazılarında "nemli" yazar.',
    'Programcılar komut kartlarını tahtaya sırayla dizerek programı kurar.',
    'Robot programı uygular. Önündeki kartı yalnız BAK komutu gelince çevirebilir.',
    'Öğretmen saksı kartlarını karıştırır. Aynı program yeniden oynanır.',
    'Sınıfa sorulur: "Program hâlâ işe yarıyor mu? Neden?"',
  ],
  hazirlik: 'Saksı kartlarını kesin ve kesikli çizgiden katlayın: "kuru / nemli" yazan yarı arkada kalsın. Komut kartlarını kesin. Robot yalnız BAK komutu gelince önündeki kartı çevirebilir.',
  kartlar: [
    { komut: 'İLERİ', aciklama: 'Bir adım ileri git.', adet: 4 },
    { komut: 'BAK', aciklama: 'Önündeki saksı kartını çevir.', adet: 2 },
    { komut: 'SULA', aciklama: 'Saksıyı sula.', adet: 2 },
    { komut: 'ÇIKIŞA KADAR TEKRARLA', aciklama: 'Çıkışa varana kadar içteki kartları yeniden uygula.', adet: 1 },
    { komut: 'EĞER', aciklama: 'Yalnız koşul doğruysa içteki kartı uygula.', adet: 2 },
  ],
  saksiKartlari: 'K N K K N N',
};

export const OGRETMEN_NOTU: OgretmenNotuVerisi = {
  hedef:
    'Öğrenci, bir işi her durumda aynı biçimde yapmak yerine önce duruma bakıp karar veren bir algoritma yazar; aynı kodu farklı kurgularda sınayıp düzeltir ve hazır koddaki hataları bulur.',
  dersler: [
    { baslik: '1. ders', metin: 'Fişsiz "Robot bahçıvan" oyunu (15 dk), ardından 1–3. görevler: hazır döngüye kararı ekle, başka serada sına, yeni kural ekle.' },
    { baslik: '2. ders', metin: '4. görev (hatayı bul) ikişerli; 5. görev zorlu ve isteğe bağlı; 6–7. görevler (hasat kodunu sıfırdan yazma) bireysel. Ders tartışmayla kapanır.' },
  ],
  yanilgilar: [
    { ad: 'Kapsam', metin: 'Koşulun altına yazılan her komutun koşula bağlı olduğunu sanmak. 4. görev bunu hedefler: "sula" eğer\'in dışına kaymıştır.' },
    { ad: 'Sabit tekrar', metin: 'Tekrar sayısını sahneye bakıp saymak ("6 kez tekrarla"). 2. ve 7. görevlerdeki yeni kurgular bunun işe yaramadığını gösterir.' },
    { ad: 'Bir kez bakma', metin: 'Robotun bir kez bakınca her şeyi bildiğini sanmak. Adım adım çalıştırınca blokların yanındaki sayımlar ("eğer 7 kez, sula 3 kez") bunu görünür kılar.' },
  ],
  sorular: [
    'Robot hiç bakmasaydı ne olurdu?',
    'Kodunuz hangi serada bozuldu? Neden orada bozuldu?',
    '"6 kez tekrarla" neden bir serada çalışıp ötekinde çalışmıyor?',
    'Aynı işi daha az blokla yapabilir miyiz?',
  ],
  celdiriciler:
    'Araç kutusundaki "… kez tekrarla" ve "sağa dön" blokları kasıtlı çeldiricidir. "… kez tekrarla" ilk serada işe yarar gibi görünür; sonraki kurgu neden yetmediğini gösterir.',
};

export const UNITE: Unite = {
  id: 's3-bak',
  sinif: 3,
  no: 4,
  ad: 'Bak ve karar ver',
  kademe: 'Mucit adası',
  tema: 'Sera',
  yeniKavram: 'Seçim: "eğer … ise"',
  oncedenBilinen: '"Çıkışa varana kadar tekrarla" (3. ünite)',
  kalip: 'bak-ve-karar-ver',
  kazanimlar: ['MAT.3.2.5', 'MAT.3.3.5', 'MAT.3.2.4', 'MAT.3.1.15'],
  sure: '2 ders saati',
  uygunluk:
    '3. sınıfın son dönemi için. Öncesinde sıralı adımlar ve "çıkışa varana kadar tekrarla" üniteleri gelir; bu ünitede yeni olan yalnız "eğer". 5. görev zorludur ve isteğe bağlıdır.',
  gorunum: 'blok',
  sesliYonerge: false,
  gorevler: GOREVLER,
  fissiz: FISSIZ,
  ogretmenNotu: OGRETMEN_NOTU,
};
