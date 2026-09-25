/**
 * Algoritma Laboratuvarı — 3. sınıf (Mucit adası, blok görünümü): üç yeni ünite.
 *
 * 4. ünite "Bak ve karar ver" unite.ts'tedir (değişmedi). Bu dosyadaki üniteler ondan önce gelir:
 *
 *   1. Yönergeyi izle     hazır kodu oku, sonucu tahmin et (litre); depoya göre kodu kur
 *                          MAT.3.2.5 · 3.2.4 · 3.3.5
 *   2. Simetriyi tamamla  yarısı çizili şeklin öbür yarısını çiz; aynada sağ ile sol yer değiştirir
 *                          MAT.3.3.8 · 3.3.7 · 3.3.6
 *   3. Bitene kadar       "çıkışa varana kadar tekrarla"; farklı uzunlukta sıralar; direk hatası
 *                          MAT.3.2.5 · 3.2.4
 *
 * Sera sıralarında robot x = 0'da başlar, saksılar 1…n, çıkış n + 1'dedir; her sulama 2 litredir.
 * Çizim sahasında çift satır / sütunlar noktalardır: "=" ve "!" hazır çizili yarıdır, "-" ve "|"
 * çizilecek (gizli) yarıdır; simetri doğrusu `eksen` ile çizilir, robot doğrunun üstünde başlar.
 */
import { programKur, type BlokSablonu, type KisaBlok } from './program';
import { saha, saksiSirasi, type DunyaTanimi, type Hedef } from './dunya';
import { izOzeti } from './yorumlayici';
import type { Gorev, Unite } from './gorev';

const ILERI: BlokSablonu = { tur: 'eylem', eylem: 'ileri' };
const SAGA: BlokSablonu = { tur: 'eylem', eylem: 'sagaDon' };
const SOLA: BlokSablonu = { tur: 'eylem', eylem: 'solaDon' };
const SULA: BlokSablonu = { tur: 'eylem', eylem: 'sula' };
const KADAR: BlokSablonu = { tur: 'tekrarlaKadar', kosul: 'cikistayim' };
const kez = (n: number): BlokSablonu => ({ tur: 'tekrarlaKez', kez: n });

const k = (liste: KisaBlok[], onek: string) => programKur(liste, onek);
const sera = (id: string, ad: string, yazim: string, depo: number): DunyaTanimi => ({ id, ad, bitkiler: saksiSirasi(yazim), depo });

const SULA_VE_CIK: Hedef = { kurulariSula: true, cikistaBitir: true };
const CIKISA_VAR: Hedef = { cikistaBitir: true };
const CIZ: Hedef = { cizimiTamamla: true, cikistaBitir: false };

type IzT = Parameters<Gorev['basari']>[0];

const ORTAK = { sinif: 3, kademe: 'Mucit adası', gorunum: 'blok' as const, sesliYonerge: false };

// ---------------------------------------------------------------------------
// 1. Yönergeyi izle
// ---------------------------------------------------------------------------

const IZLE_ARACLARI: BlokSablonu[] = [ILERI, SULA, kez(4)];

/** Tahmin görevlerinin hazır (doğru) kodları: başlangıç ve çözüm aynıdır */
const IZLE_1 = k([['kez', 4, ['ileri', 'sula']], 'ileri'], 's3i1-');
const IZLE_2 = k([['kez', 3, ['ileri', 'sula', 'ileri']], 'ileri'], 's3i2-');

const IZLE_GOREVLERI: Gorev[] = [
  {
    id: 's3-izle-1',
    tur: 'tahmin',
    baslik: 'Kaç litre?',
    yonerge: 'Kodu oku ama henüz çalıştırma. Her sulama 2 litre su harcar. Robot toplam kaç litre harcayacak? Tahminini yaz, sonra çalıştır.',
    dunya: sera('s3-izle-1', 'Dört saksı', 'K K K K', 20),
    hedef: SULA_VE_CIK,
    bitkiAdi: 'saksı',
    aracKutusu: IZLE_ARACLARI,
    baslangic: IZLE_1,
    cozum: IZLE_1,
    ipuclari: ['Döngünün içini bir kez oku: robot bir adım gidiyor, bir saksı suluyor.', 'Döngü 4 kez dönüyor: 2 + 2 + 2 + 2 ya da 4 × 2.'],
    tahmin: {
      metin: 'Robot kaç litre su harcayacak?',
      birim: 'litre',
      cevap: (iz) => izOzeti(iz).harcananSu,
      sonrasi: '4 kez 2 litre: 4 × 2 = 8 litre.',
      yonlendirme: 'Döngü kaç kez dönüyor? Her turda kaç litre su harcanıyor?',
    },
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Doğru! ${o.sulama} saksı × 2 litre = ${o.harcananSu} litre su harcandı.`;
    },
    kazanimlar: ['MAT.3.2.5', 'MAT.3.3.5'],
  },
  {
    id: 's3-izle-2',
    tur: 'tahmin',
    baslik: 'Depoda ne kalır?',
    yonerge: 'Depoda 20 litre su var. Kodu satır satır izle: robot hangi saksıları suluyor? Sonunda depoda kaç litre kalır? Tahmin et, sonra çalıştır.',
    dunya: sera('s3-izle-2', 'Aralıklı sera', 'K N K N K N', 20),
    hedef: SULA_VE_CIK,
    bitkiAdi: 'saksı',
    aracKutusu: IZLE_ARACLARI,
    baslangic: IZLE_2,
    cozum: IZLE_2,
    ipuclari: ['Döngünün bir turunda robot iki adım gidiyor ama yalnız bir kez suluyor.', 'Döngü 3 kez döner: 3 saksı sulanır. Harcanan suyu 20 litreden çıkar.'],
    tahmin: {
      metin: 'Depoda kaç litre su kalacak?',
      birim: 'litre',
      cevap: (iz) => izOzeti(iz).kalanSu,
      sonrasi: '3 × 2 = 6 litre harcandı; 20 − 6 = 14 litre kaldı.',
      yonlendirme: 'Önce kaç saksının sulandığını bul. Sonra harcanan suyu 20 litreden çıkar.',
    },
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Doğru! ${o.sulama} × 2 = ${o.harcananSu} litre harcandı; ${iz.baslangic.depo} − ${o.harcananSu} = ${o.kalanSu} litre kaldı.`;
    },
    kazanimlar: ['MAT.3.2.5', 'MAT.3.2.4', 'MAT.3.3.5'],
  },
  {
    id: 's3-izle-3',
    tur: 'yaz',
    baslik: 'Depoya göre',
    yonerge: 'Depoda 12 litre su var. Her saksıya 2 litre gider. Depo kaç saksıya yeter? Kuru saksıları sula, robotu çıkışa götür.',
    dunya: sera('s3-izle-3', 'Küçük depo', 'K K K K K K', 12),
    hedef: SULA_VE_CIK,
    bitkiAdi: 'saksı',
    aracKutusu: IZLE_ARACLARI,
    baslangic: 'bos',
    cozum: k([['kez', 6, ['ileri', 'sula']], 'ileri'], 's3i3-'),
    ipuclari: ['12 litreyi 2 litrelik sulamalara böl: 12 ÷ 2 = ?', 'Döngünün içine "ileri git" ve "sula" koy, döngüyü 6 kez tekrarla. Sonunda çıkışa bir adım daha at.'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! ${o.sulama} saksı × 2 litre = ${o.harcananSu} litre. Depo tam yetti: ${iz.baslangic.depo} ÷ 2 = ${iz.baslangic.depo / 2}.`;
    },
    soru: {
      metin: 'Depoda 20 litre olsaydı kaç saksıya yeterdi?',
      birim: 'saksı',
      cevap: () => 20 / 2,
      sonrasi: '20 ÷ 2 = 10 saksı.',
      yonlendirme: '20 litreyi 2 litrelik parçalara ayır.',
    },
    kazanimlar: ['MAT.3.2.4', 'MAT.3.3.5', 'MAT.3.2.5'],
  },
  {
    id: 's3-izle-4',
    tur: 'kurgu',
    baslik: 'Büyük sera',
    yonerge: 'Bu serada 8 kuru saksı var, depoda 16 litre su var. Depo yeter mi? Kodunu bu seraya göre düzelt.',
    dunya: sera('s3-izle-4', 'Büyük sera', 'K K K K K K K K', 16),
    hedef: SULA_VE_CIK,
    bitkiAdi: 'saksı',
    aracKutusu: IZLE_ARACLARI,
    baslangic: 'onceki',
    cozum: k([['kez', 8, ['ileri', 'sula']], 'ileri'], 's3i4-'),
    ipuclari: ['Kaç saksı var? Depo kaç saksıya yeter? 16 ÷ 2 = ?', 'Döngünün sayısını değiştir: 8 kez.'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! ${o.sulama} × 2 = ${o.harcananSu} litre: ${iz.baslangic.depo} litrelik depo tam yetti.`;
    },
    kazanimlar: ['MAT.3.2.4', 'MAT.3.2.5'],
  },
  {
    id: 's3-izle-5',
    tur: 'hata',
    baslik: 'Fazla tur',
    yonerge: 'Bu kod 5 saksıyı sulayıp çıkışa gitmeli. Kodu izle: döngü kaç kez dönüyor? Çalıştır, hatayı bul ve düzelt.',
    dunya: sera('s3-izle-5', 'Beş saksı', 'K K K K K', 20),
    hedef: SULA_VE_CIK,
    bitkiAdi: 'saksı',
    aracKutusu: IZLE_ARACLARI,
    baslangic: k([['kez', 6, ['ileri', 'sula']]], 's3i5h-'),
    cozum: k([['kez', 5, ['ileri', 'sula']], 'ileri'], 's3i5-'),
    ipuclari: ['Saksıları ve çıkışı ayrı say: 5 saksı var, 6. kare çıkış.', 'Döngü 5 kez dönsün. Çıkışa gitmek için döngünün altına bir "ileri git" ekle.'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Buldun! Döngü ${o.sulama} saksı için ${o.sulama} kez dönüyor: ${o.sulama} × 2 = ${o.harcananSu} litre, hiç su boşa gitmedi.`;
    },
    kazanimlar: ['MAT.3.2.5', 'MAT.3.2.4'],
  },
  {
    id: 's3-izle-6',
    tur: 'hata',
    baslik: 'Biten depo',
    yonerge: 'Depoda 8 litre su var. Kuru saksıları sula, nemlileri sulama, sonra çıkışa git. Bu kodda bir hata var: çalıştır, izle ve düzelt.',
    dunya: sera('s3-izle-6', 'Az su', 'K K K K N N', 8),
    hedef: SULA_VE_CIK,
    bitkiAdi: 'saksı',
    aracKutusu: IZLE_ARACLARI,
    baslangic: k([['kez', 6, ['ileri', 'sula']], 'ileri'], 's3i6h-'),
    cozum: k([['kez', 4, ['ileri', 'sula']], 'ileri', 'ileri', 'ileri'], 's3i6-'),
    ipuclari: ['8 litre kaç saksıya yeter? 8 ÷ 2 = ?', 'Kuru saksılar ilk 4 saksı. Döngü 4 kez dönsün; sonra robot sulamadan çıkışa yürüsün.'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Buldun! ${o.sulama} × 2 = ${o.harcananSu} litre: depodaki ${iz.baslangic.depo} litrenin hepsi kuru saksılara gitti.`;
    },
    kazanimlar: ['MAT.3.2.4', 'MAT.3.3.5'],
  },
];

// ---------------------------------------------------------------------------
// 2. Simetriyi tamamla
// ---------------------------------------------------------------------------

const DIKEY_AYNA = { yon: 'dikey' as const, k: 2 };
const AYNA_ARACLARI: BlokSablonu[] = [ILERI, SAGA, SOLA];

/** Sol yarısı çizili U: robot doğrunun üstünde, yukarı bakar */
const AYNA_U = saha('s3-simetri-1', 'Aynadaki yarım', ['. . . . .', '  !   |  ', '. . . . .', '  !   |  ', '. .=B-. .'], { yon: 3, eksen: DIKEY_AYNA, hedefGizli: true });
/** Sağ yarısı çizili geniş U: sol yarı çizilecek */
const AYNA_GENIS = saha('s3-simetri-2', 'Öbür yan', ['. . . . .', '|       !', '. . . . .', '|       !', '.-.-B=.=.'], { yon: 3, eksen: DIKEY_AYNA, hedefGizli: true });
/** Basamaklı çatılı ev: robot çatının tepesinde, aşağı bakar */
const AYNA_EV = saha(
  's3-simetri-3',
  'Basamaklı ev',
  ['. .=B-. .', '  !   |  ', '.=. . .-.', '!       |', '. . . . .', '!       |', '.=.=.-.-.'],
  { yon: 1, eksen: DIKEY_AYNA, hedefGizli: true }
);
/** Kupa: gövde ve ayak hazır; sol yarısı çizili */
const AYNA_KUPA = saha(
  's3-simetri-4',
  'Kupa',
  ['. . . . .', '!       |', '.=. . .-.', '  !   |  ', '. .=B-. .', '    !    ', '. . . . .', '    !    ', '. .=.=. .'],
  { yon: 3, eksen: DIKEY_AYNA, hedefGizli: true }
);
/** Dikdörtgen, yatay ayna: üst yarısı çizili, robot aynanın sol ucunda sağa bakar */
const AYNA_YATAY = saha('s3-simetri-5', 'Yatay ayna', ['.=.=.=.=.', '!       !', 'B . . . .', '|       |', '.-.-.-.-.'], { yon: 0, eksen: { yon: 'yatay', k: 1 }, hedefGizli: true });

const SIMETRI_GOREVLERI: Gorev[] = [
  {
    id: 's3-simetri-1',
    tur: 'yaz',
    baslik: 'Aynadaki yarım',
    yonerge: 'Şeklin sol yarısı çizili. Hazır kod sol yarıyı çizen kod: robot çizginin üstünden geçer. Kodu değiştir: robot aynadaki sağ yarıyı çizsin.',
    dunya: AYNA_U,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: AYNA_ARACLARI,
    baslangic: k(['solaDon', 'ileri', 'sagaDon', 'ileri', 'ileri'], 's3s1h-'),
    cozum: k(['sagaDon', 'ileri', 'solaDon', 'ileri', 'ileri'], 's3s1-'),
    ipuclari: ['Kodu çalıştır ve izle: robot ilk önce hangi yana döndü?', 'Aynada adımlar aynı kalır, dönüşler yer değiştirir: "sola dön" yerine "sağa dön", "sağa dön" yerine "sola dön".'],
    basari: (iz) => `Oldu! Aynı ${izOzeti(iz).ileri} adım, ters dönüşler: sağ yarı, sol yarının aynadaki görüntüsü.`,
    kazanimlar: ['MAT.3.3.8', 'MAT.3.3.7'],
  },
  {
    id: 's3-simetri-2',
    tur: 'kurgu',
    baslik: 'Öbür yan',
    yonerge: 'Bu kez sağ yarı çizili, sol yarıyı sen çiz. Şekil de daha geniş. Önceki kodunu düzelt.',
    dunya: AYNA_GENIS,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: AYNA_ARACLARI,
    baslangic: 'onceki',
    cozum: k(['solaDon', 'ileri', 'ileri', 'sagaDon', 'ileri', 'ileri'], 's3s2-'),
    ipuclari: ['Sağ yarıyı çizen kodu düşün: sağa dön, 2 adım, sola dön, 2 adım.', 'Aynada dönüşleri tersine çevir: sola dön, 2 adım, sağa dön, 2 adım.'],
    basari: (iz) => `Oldu! Sağ yarıda "sağa dön" olan yer, sol yarıda "sola dön" oldu. Sol yarıya ${izOzeti(iz).cizgi} çizgi çizdin.`,
    kazanimlar: ['MAT.3.3.7', 'MAT.3.3.8'],
  },
  {
    id: 's3-simetri-3',
    tur: 'yaz',
    baslik: 'Basamaklı ev',
    yonerge: 'Evin sol yarısı çizili. Robot çatının tepesinde, aşağı bakıyor. Evin sağ yarısını aynadaki gibi çiz.',
    dunya: AYNA_EV,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: [...AYNA_ARACLARI, kez(2)],
    baslangic: 'bos',
    cozum: k([['kez', 2, ['solaDon', 'ileri', 'sagaDon', 'ileri']], 'ileri', 'sagaDon', 'ileri', 'ileri'], 's3s3-'),
    ipuclari: [
      'Sol yarıyı çizen kodu kafanda kur: sağa dön, ileri, sola dön, ileri…',
      'Şimdi her dönüşü tersine çevir. Çatıdaki basamak iki kez tekrar ediyor: "2 kez tekrarla" kullanabilirsin.',
    ],
    basari: (iz) => {
      const n = izOzeti(iz).cizgi;
      return `Oldu! Evin iki yarısı eş: her yarıda ${n} çizgi, bütün evde ${n} + ${n} = ${2 * n} çizgi.`;
    },
    kazanimlar: ['MAT.3.3.8', 'MAT.3.3.7'],
  },
  {
    id: 's3-simetri-4',
    tur: 'hata',
    baslik: 'Unutulan dönüşler',
    yonerge: 'Bu kod kupanın sağ yarısını çizmeli ama robot bir köşede yanlış çizgiye sapıyor. Çalıştır, hatayı bul ve düzelt.',
    dunya: AYNA_KUPA,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: [...AYNA_ARACLARI, kez(2)],
    // Sol yarının kodu; yalnız ilk dönüş aynaya göre değiştirilmiş, öteki dönüşler aynı kalmış
    baslangic: k(['sagaDon', 'ileri', 'sagaDon', 'ileri', 'solaDon', 'ileri', 'sagaDon', 'ileri'], 's3s4h-'),
    cozum: k(['sagaDon', 'ileri', 'solaDon', 'ileri', 'sagaDon', 'ileri', 'solaDon', 'ileri'], 's3s4-'),
    ipuclari: ['Robot hangi köşede saptı? O köşede hangi yana dönmeliydi?', 'Sol yarının kodundaki bütün dönüşler aynada tersine döner, yalnız ilki değil.'],
    basari: (iz) => `Buldun! ${izOzeti(iz).donus} dönüşün hepsi aynada tersine döner, yalnız ilki değil.`,
    kazanimlar: ['MAT.3.3.8', 'MAT.3.3.7'],
  },
  {
    id: 's3-simetri-5',
    tur: 'yaz',
    baslik: 'Yatay ayna',
    yonerge: 'Bu kez ayna yatay: dikdörtgenin üst yarısı çizili. Robot aynanın sol ucunda, sağa bakıyor. Alt yarıyı çiz.',
    dunya: AYNA_YATAY,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: [...AYNA_ARACLARI, kez(4)],
    baslangic: 'bos',
    cozum: k(['sagaDon', 'ileri', 'solaDon', ['kez', 4, ['ileri']], 'solaDon', 'ileri'], 's3s5-'),
    ipuclari: ['Üst yarıyı çizen kodu düşün: sola dön, ileri, sağa dön, 4 adım, sağa dön, ileri.', 'Aynada dönüşleri tersine çevir: sağa dön, ileri, sola dön, 4 adım, sola dön, ileri.'],
    basari: (iz) => `Oldu! Alt yarıda da ${izOzeti(iz).cizgi} çizgi var: dikdörtgenin iki yarısı eş.`,
    soru: {
      metin: 'Bu dikdörtgenin kaç simetri doğrusu var?',
      birim: 'doğru',
      cevap: () => 2,
      sonrasi: 'Yatay doğru ve dikey doğru: ikisi de dikdörtgeni iki eş parçaya ayırır.',
      yonlendirme: 'Şekli yatay katladın. Ortadan dikey katlasan iki yarı yine üst üste gelir mi?',
    },
    kazanimlar: ['MAT.3.3.6', 'MAT.3.3.7', 'MAT.3.3.8'],
  },
];

// ---------------------------------------------------------------------------
// 3. Bitene kadar
// ---------------------------------------------------------------------------

const KADAR_ARACLARI: BlokSablonu[] = [ILERI, SULA, KADAR, kez(4)];
const YURUYEN = k([['kadar', 'cikistayim', ['ileri']]], 's3k1-');
/** Direk hatasız sulama: önce ilk saksıya var; döngüde önce sula, sonra ilerle */
const SULAYAN = k(['ileri', ['kadar', 'cikistayim', ['sula', 'ileri']]], 's3k3-');

const KADAR_GOREVLERI: Gorev[] = [
  {
    id: 's3-kadar-1',
    tur: 'yaz',
    baslik: 'Uzayan sıra',
    yonerge: 'Bu kod 3 saksılık kısa sırada robotu çıkışa götürüyordu. Bu sıra daha uzun. Saymadan çalışan bir kod yaz: "çıkışa varana kadar tekrarla" kullan.',
    dunya: sera('s3-kadar-1', 'Uzun sıra', 'N N N N N N N', 20),
    hedef: CIKISA_VAR,
    bitkiAdi: 'saksı',
    aracKutusu: KADAR_ARACLARI,
    baslangic: k([['kez', 4, ['ileri']]], 's3k1h-'),
    cozum: YURUYEN,
    ipuclari: ['Robot çıkışa varınca bunu kendisi anlayabilir. "çıkışa varana kadar tekrarla" bloğunu kullan.', 'Döngünün içine yalnız "ileri git" koy.'],
    basari: (iz) => `Oldu! Döngü ${izOzeti(iz).ileri} kez döndü; robot adımları saymadan çıkışa vardı.`,
    kazanimlar: ['MAT.3.2.5'],
  },
  {
    id: 's3-kadar-2',
    tur: 'kurgu',
    genelleme: true,
    baslik: 'Kısa sıra',
    yonerge: 'Bu sıra çok kısa. Kodun burada da çalışıyor mu? Çalıştır, gerekirse düzelt.',
    dunya: sera('s3-kadar-2', 'Kısa sıra', 'N N', 20),
    hedef: CIKISA_VAR,
    bitkiAdi: 'saksı',
    aracKutusu: KADAR_ARACLARI,
    baslangic: 'onceki',
    cozum: YURUYEN,
    ipuclari: ['"… kez tekrarla" kullandıysan sayı bu sıraya uymaz. "çıkışa varana kadar tekrarla" her sırada çalışır.'],
    basari: (iz) => `Oldu! Aynı kod bu sırada ${izOzeti(iz).ileri} tur döndü. Sıra uzasa da kısalsa da çalışıyor.`,
    soru: {
      metin: 'Bu sırada döngü kaç tur döndü?',
      birim: 'tur',
      cevap: (iz) => izOzeti(iz).ileri,
      sonrasi: '2 saksı ve çıkış: 3 adım, 3 tur.',
      yonlendirme: 'Robot her turda bir adım atıyor. Kaç adım attı?',
    },
    kazanimlar: ['MAT.3.2.5'],
  },
  {
    id: 's3-kadar-3',
    tur: 'kurgu',
    baslik: 'Sulayarak yürü',
    yonerge: 'Bu sıradaki saksıların hepsi kuru. Robot her saksıyı sulasın ve çıkışta dursun. Çıkışta saksı yok: orayı sulama!',
    dunya: sera('s3-kadar-3', 'Kuru sıra', 'K K K K', 20),
    hedef: SULA_VE_CIK,
    bitkiAdi: 'saksı',
    aracKutusu: KADAR_ARACLARI,
    baslangic: 'onceki',
    cozum: SULAYAN,
    ipuclari: [
      '"sula" bloğunu döngünün içine koy. Robot çıkışta da suluyor mu? Adım adım izle.',
      'Robot önce bir adım atıp ilk saksıya varsın. Döngünün içinde önce sulasın, sonra ilerlesin.',
    ],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! ${o.sulama} saksı × 2 litre = ${o.harcananSu} litre. Döngü çıkışta durdu, çıkış sulanmadı.`;
    },
    kazanimlar: ['MAT.3.2.5', 'MAT.3.2.4'],
  },
  {
    id: 's3-kadar-4',
    tur: 'hata',
    baslik: 'Çıkışı sulayan robot',
    yonerge: 'Bu robot her saksıyı suluyor ama sonunda bir hata yapıyor. Çalıştır, izle, hatayı bul ve düzelt.',
    dunya: sera('s3-kadar-4', 'Yedi saksı', 'K K K K K K K', 20),
    hedef: SULA_VE_CIK,
    bitkiAdi: 'saksı',
    aracKutusu: KADAR_ARACLARI,
    baslangic: k([['kadar', 'cikistayim', ['ileri', 'sula']]], 's3k4h-'),
    cozum: k(['ileri', ['kadar', 'cikistayim', ['sula', 'ileri']]], 's3k4-'),
    ipuclari: [
      'Son turda robot nereye ilerliyor, nerede suluyor?',
      'Döngü, çıkışa varıp varmadığına turun başında bakar. Bir adımı döngünün önüne al; döngüde önce sula, sonra ilerle.',
    ],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Buldun! ${o.sulama} saksı için ${o.ileri} adım: adım sayısı saksı sayısından 1 fazla. Çıkış sulanmadı.`;
    },
    kazanimlar: ['MAT.3.2.5'],
  },
  {
    id: 's3-kadar-5',
    tur: 'kurgu',
    genelleme: true,
    baslik: 'Uzun sera',
    yonerge: 'Bu serada 10 kuru saksı var, depoda 20 litre su. Kodun burada da çalışıyor mu? Çalıştır, gerekirse düzelt.',
    dunya: sera('s3-kadar-5', 'On saksı', 'K K K K K K K K K K', 20),
    hedef: SULA_VE_CIK,
    bitkiAdi: 'saksı',
    aracKutusu: KADAR_ARACLARI,
    baslangic: 'onceki',
    cozum: SULAYAN,
    ipuclari: ['Kodun saksı sayısına bağlı mı? Çıkışa varana kadar tekrarlayan kod her sırada çalışır.'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! Kod saymadan ${o.sulama} saksıyı suladı: ${o.sulama} × 2 = ${o.harcananSu} litre, depo tam yetti.`;
    },
    soru: {
      metin: 'Depoda 30 litre olsaydı bu kod kaç kuru saksıyı sulamaya yeterdi?',
      birim: 'saksı',
      cevap: () => 30 / 2,
      sonrasi: '30 ÷ 2 = 15 saksı.',
      yonlendirme: 'Her saksı 2 litre. 30 litrede kaç tane 2 litre var?',
    },
    kazanimlar: ['MAT.3.2.5', 'MAT.3.2.4'],
  },
  {
    id: 's3-kadar-6',
    tur: 'hata',
    baslik: 'Bitmeyen döngü',
    yonerge: 'Robot ilk saksıya varıyor, sonra hiç kıpırdamıyor. Neden? Blokların yerine bak, hatayı bul ve düzelt.',
    dunya: sera('s3-kadar-6', 'Üç saksı', 'K K K', 20),
    hedef: SULA_VE_CIK,
    bitkiAdi: 'saksı',
    aracKutusu: KADAR_ARACLARI,
    // Bloklar döngünün içine değil altına bırakılmış: döngü boş kalır, robot ilerlemez
    baslangic: k(['ileri', ['kadar', 'cikistayim', []], 'sula', 'ileri'], 's3k6h-'),
    cozum: k(['ileri', ['kadar', 'cikistayim', ['sula', 'ileri']]], 's3k6-'),
    ipuclari: ['Döngünün içinde hangi bloklar var? Döngü yalnız içindeki blokları tekrarlar.', '"sula" ve "ileri git" bloklarını döngünün içine taşı.'],
    basari: (iz) => `Buldun! "sula" ve "ileri git" artık döngünün içinde. Döngü ${izOzeti(iz).sulama} tur döndü, robot çıkışa vardı.`,
    kazanimlar: ['MAT.3.2.5'],
  },
];

// ---------------------------------------------------------------------------
// Üniteler
// ---------------------------------------------------------------------------

export const SINIF3: readonly Unite[] = [
  {
    ...ORTAK,
    id: 's3-izle',
    no: 1,
    ad: 'Yönergeyi izle',
    tema: 'Sera',
    yeniKavram: 'Kodu çalıştırmadan izlemek; tekrar sayısını çarpma ve bölmeyle bulmak',
    oncedenBilinen: '"… kez tekrarla" (2. sınıf)',
    kalip: 'izle',
    kazanimlar: ['MAT.3.2.5', 'MAT.3.2.4', 'MAT.3.3.5'],
    sure: '2 ders saati',
    uygunluk: '3. sınıfın ilk ünitesi. Çarpma ve bölmenin anlamı bilinmeli; litre bu ünitede yalnız "her sulama 2 litre" olarak kullanılır.',
    gorevler: IZLE_GOREVLERI,
    fissiz: {
      ad: 'Su taşıyan robot',
      amac: 'Kodu çalıştırmadan izleyip harcanacak suyu hesaplamak; deponun kaç saksıya yettiğini bulmak.',
      sure: '15 dakika',
      roller: [
        'Bir öğrenci robot olur; kartları sırayla uygular.',
        'Bir öğrenci depocu olur; elindeki su jetonlarını tutar. Her jeton 2 litredir.',
        'Sınıf programcıdır; kodu tahtaya dizer ve önce tahmin eder.',
      ],
      adimlar: [
        'Yere 6 saksı kartı bir sıra hâlinde dizilir; sıranın sonuna ÇIKIŞ yazılır.',
        'Tahtaya "4 kez TEKRARLA: İLERİ, SULA" programı dizilir. Sınıf çalıştırmadan önce tahmin eder: kaç litre su harcanacak?',
        'Robot programı uygular; her SULA kartında depocudan bir jeton alıp saksıya koyar. Sınıf jetonları sayar: 4 × 2 = 8 litre.',
        'Depocuya 6 jeton (12 litre) verilir. Sınıf depo kaç saksıya yeter diye hesaplar ve programı buna göre düzeltir.',
        'Tekrar sayısı 7 yapılır. Robot çıkış kartına gelince ne olur? Sınıf tartışır.',
      ],
      hazirlik: 'Saksı kartlarını kesin; su jetonu olarak düğme ya da kâğıt pul kullanın. TEKRARLA kartının üstüne tekrar sayısını tebeşirle yazın.',
      kartlar: [
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları yazılan sayı kadar uygula.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 4 },
        { komut: 'SULA', aciklama: 'Bulunduğun karedeki saksıya 2 litre su ver.', adet: 2 },
      ],
      saksiKartlari: 'K K K K K K',
    },
    ogretmenNotu: {
      hedef: 'Öğrenci hazır bir kodu çalıştırmadan satır satır izler, sonucunu (harcanan ve kalan su) çarpma ve çıkarmayla tahmin eder; depodaki suyun kaç saksıya yettiğini bölmeyle bulup koda aktarır.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "Su taşıyan robot" (15 dk), ardından 1–2. görevler (tahmin et) sınıfça: önce herkes tahminini yazar, sonra çalıştırılır. 3. görev bireysel.' },
        { baslik: '2. ders', metin: '4. görev (yeni kurgu) bireysel; 5–6. görevler (hatayı bul) ikişerli. Ders "depo kaç saksıya yeter?" sorusuyla kapanır.' },
      ],
      yanilgilar: [
        { ad: 'Çıkışı da saymak', metin: 'Tekrar sayısını kare sayısıyla karıştırmak: 5 saksı ve çıkış 6 kare eder. 5. görevde döngü 6 kez döner ve robot çıkışı sular.' },
        { ad: 'Depoyu hesaba katmamak', metin: 'Sıradaki her saksıyı sulamaya çalışmak; depodaki suyun kaç saksıya yettiğini düşünmemek. 6. görevde depo 4 saksıya yeter (8 ÷ 2 = 4).' },
        { ad: 'Döngüyü bir kez okumak', metin: 'Döngünün içini bir kez okuyup "2 litre" demek; tekrar sayısıyla çarpmayı unutmak. 1–2. görevlerdeki tahminler bunu ortaya çıkarır.' },
      ],
      sorular: [
        'Kodu çalıştırmadan sonucunu nasıl bildin?',
        'Depoda 12 litre varsa kaç saksı sulanır? 20 litre olsaydı?',
        'Döngü 6 kez dönünce robot neden çıkışı suladı?',
        'Aralıklı serada döngü 3 kez döndü ama robot 7 adım attı. Neden?',
      ],
      celdiriciler:
        'Araç kutusundaki "4 kez tekrarla" bloğunun sayısı çoğu görevde bilerek yanlıştır: öğrenci sayıyı saksı ve depo miktarından hesaplayıp değiştirir. Tahmin görevlerinde kod değiştirilmez.',
    },
  },
  {
    ...ORTAK,
    id: 's3-simetri',
    no: 2,
    ad: 'Simetriyi tamamla',
    tema: 'Spor sahası',
    yeniKavram: 'Simetri: aynada adımlar aynı kalır, sağa ve sola dönüşler yer değiştirir',
    oncedenBilinen: 'Adımlar ve dönüşler (1–2. sınıf)',
    kalip: 'ayna',
    kazanimlar: ['MAT.3.3.8', 'MAT.3.3.7', 'MAT.3.3.6'],
    sure: '2 ders saati',
    uygunluk: 'Çizgi robotu nokta ağında çizer. Öbür yarı gizlidir: öğrenci şekli aynaya bakarak tamamlar. Simetri doğrusu tuvalde çizilidir.',
    gorevler: SIMETRI_GOREVLERI,
    fissiz: {
      ad: 'Ayna dansı',
      amac: 'Aynadaki hareketin aynı adımlardan ama ters dönüşlerden oluştuğunu bedenle yaşamak.',
      sure: '15 dakika',
      roller: ['İki öğrenci robot olur; ayna doğrusunun üstünde yan yana, aynı yöne bakarak durur.', 'Sınıf programcıdır; birinci robotun kartlarını dizer, ikinci robotun kartlarını birlikte bulur.'],
      adimlar: [
        'Yere bantla düz bir çizgi yapıştırın: ayna doğrusu. İki robot çizginin üstünde yan yana durur.',
        'Birinci robot tahtadaki kartları uygular ve tebeşirle yolunu çizer.',
        'Sınıf ikinci robot için aynadaki programı kurar: adımlar aynı, SAĞA DÖN yerine SOLA DÖN, SOLA DÖN yerine SAĞA DÖN.',
        'İkinci robot uygular. İki yol çizginin iki yanında aynadaki gibi mi? Kâğıdı çizgiden katlayarak ya da bir ayna tutarak denetleyin.',
        'Birinci robotun kodunu olduğu gibi ikinci robota verin: ne oluyor? Sınıf tartışır.',
      ],
      hazirlik: 'Kartları iki takım kesin. Ayna doğrusu için bant, yollar için tebeşir gerekir. Küçük bir el aynası denetimi kolaylaştırır.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 6 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 3 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 3 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir parçası verilen simetrik şekli simetri doğrusuna göre kodla tamamlar; aynadaki kodda adımların aynı kaldığını, dönüşlerin yer değiştirdiğini fark eder ve birden çok simetri doğrusu olan şekilleri tanır.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "Ayna dansı" (15 dk), ardından 1–2. görevler: hazır sol yarı kodunu aynaya çevir, öbür yanda tekrarla. 3. görev (ev) bireysel.' },
        { baslik: '2. ders', metin: '4. görev (hatayı bul) ikişerli, 5. görev (yatay ayna) bireysel. Ders "dikdörtgenin kaç simetri doğrusu var?" sorusuyla kapanır.' },
      ],
      yanilgilar: [
        { ad: 'Kodu aynen kopyalamak', metin: 'Aynadaki yarı için aynı kodu kullanmak: robot aynı yarının üstünden geçer. 1. görevin hazır kodu bunu gösterir.' },
        { ad: 'Yalnız ilk dönüşü değiştirmek', metin: 'Robotu öbür yana çevirip sonraki dönüşleri aynı bırakmak. 4. görevde robot ilk basamakta aynadaki çizgiden sapar.' },
        { ad: 'Adım sayısını değiştirmek', metin: 'Aynada kenarların uzayıp kısaldığını sanmak. Oysa her kenar aynadaki eşiyle aynı uzunluktadır: adımlar aynı kalır.' },
      ],
      sorular: [
        'Aynadaki kodda hangi bloklar değişti, hangileri aynı kaldı?',
        'Robot ayna doğrusunun üstünde başlamasaydı ne olurdu?',
        'Dikdörtgenin kaç simetri doğrusu var? Karenin kaç?',
        'Evin iki yarısında kaçar çizgi var? Neden eşit?',
      ],
      celdiriciler: 'Araç kutusunda hem "sağa dön" hem "sola dön" vardır; ayna düşüncesi hangisinin seçileceğini belirler. "Tekrarla" bloğu çatıdaki basamaklar için isteğe bağlıdır.',
    },
  },
  {
    ...ORTAK,
    id: 's3-kadar',
    no: 3,
    ad: 'Bitene kadar',
    tema: 'Sera',
    yeniKavram: 'Koşullu döngü: "çıkışa varana kadar tekrarla"',
    oncedenBilinen: '"… kez tekrarla" ve kodu izlemek (1. ünite)',
    kalip: 'bitene-kadar',
    kazanimlar: ['MAT.3.2.5', 'MAT.3.2.4'],
    sure: '2 ders saati',
    uygunluk: 'Bu ünitede karar ("eğer") yoktur; o 4. ünitede ("Bak ve karar ver") gelir. Sıraların uzunluğu değişir, kod aynı kalır.',
    gorevler: KADAR_GOREVLERI,
    fissiz: {
      ad: 'Çıkışa kadar',
      amac: 'Sıranın uzunluğunu bilmeden çıkışa kadar tekrarlamak; son adımda neyin olduğunu fark etmek.',
      sure: '15 dakika',
      roller: ['Bir öğrenci robot olur; her turdan önce "çıkışta mıyım?" diye bakar.', 'Sınıf programcıdır; kartları tahtaya dizer.'],
      adimlar: [
        'Öğretmen yere her seferinde farklı sayıda saksı kartı dizer, sonuna ÇIKIŞ kartını koyar.',
        'Tahtaya "ÇIKIŞA KADAR TEKRARLA: İLERİ, SULA" dizilir. Robot uygular: çıkışa varınca da sular mı? Sınıf izler.',
        'Sınıf programı düzeltir: önce İLERİ, sonra "ÇIKIŞA KADAR TEKRARLA: SULA, İLERİ".',
        'Saksı sayısı değiştirilir; aynı program yeniden oynanır. Sınıfa sorulur: "Kaç saksı olduğunu bilmemiz gerekti mi?"',
        'İLERİ kartı döngünün altına konur. Robot ne yapar? Döngü biter mi?',
      ],
      hazirlik: 'Saksı kartlarını ve ÇIKIŞ kartını kesin. Robot her turun başında önündeki karta bakıp çıkışta olup olmadığını söyler.',
      kartlar: [
        { komut: 'ÇIKIŞA KADAR TEKRARLA', aciklama: 'Çıkışa varana kadar içteki kartları yeniden uygula. Her turdan önce bak.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 2 },
        { komut: 'SULA', aciklama: 'Bulunduğun karedeki saksıyı sula.', adet: 1 },
        { komut: 'BAK', aciklama: 'Çıkışta mısın? Önündeki karta bak.', adet: 1 },
      ],
      saksiKartlari: 'K K K K K K K',
    },
    ogretmenNotu: {
      hedef: 'Öğrenci tekrar sayısını bilmeden çalışan bir döngü yazar; aynı kodu farklı uzunlukta sıralarda sınar; son adımdaki "bir fazla" (direk) hatasını ve hiç bitmeyen döngüyü bulup düzeltir.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "Çıkışa kadar" (15 dk), ardından 1–3. görevler: "kez" yerine "kadar", kısa sırada sına, sulamayı ekle.' },
        { baslik: '2. ders', metin: '4. görev (direk hatası) ikişerli, 5. görev (uzun sera) bireysel, 6. görev (bitmeyen döngü) ikişerli. Ders tartışmayla kapanır.' },
      ],
      yanilgilar: [
        { ad: 'Direk hatası (bir fazla)', metin: 'n saksı için n + 1 adım gerekir. Döngüde önce ilerleyip sonra sulayan robot son turda çıkışa varır ve orayı sular (4. görev).' },
        { ad: 'Döngünün altındakilerin de tekrarlandığını sanmak', metin: 'Blokları döngünün içine değil altına bırakmak. Döngü boş kalır; robot ilerlemediği için döngü hiç bitmez (6. görev).' },
        { ad: 'Sayıyı sahneye bakıp yazmak', metin: '"… kez tekrarla" sayısını sahneye bakarak seçmek; sıra değişince kod bozulur (1–2. görev).' },
      ],
      sorular: [
        '"4 kez tekrarla" ile "çıkışa varana kadar tekrarla" arasındaki fark ne?',
        '7 saksılık sırada robot kaç adım atar? 10 saksılıkta?',
        'Döngü çıkışa varıp varmadığına ne zaman bakıyor: turun başında mı, sonunda mı?',
        'Döngünün içinde "ileri git" olmasaydı ne olurdu?',
      ],
      celdiriciler: 'Araç kutusundaki "4 kez tekrarla" bloğu bilerek çeldiricidir: bir sırada işe yarar gibi görünür, sıra uzayınca ya da kısalınca bozulur.',
    },
  },
];
