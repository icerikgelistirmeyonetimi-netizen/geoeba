/**
 * Algoritma Laboratuvarı — 4. sınıf (Mucit adası, blok görünümü): dört ünite.
 *
 *   1. Dönüş ve açı      çeyrek (90°), yarım (180°), tam dönüş (360°); üç sağa = bir sola
 *                         MAT.4.3.5 · 4.3.7
 *   2. Kodla şekil çiz   kare, dikdörtgen, kapanmayan şekil; çevre
 *                         MAT.4.3.10 · 4.3.2 · 4.3.3
 *   3. İç içe tekrar     kule sırası (inşaat dronu), yan yana kareler; iç döngü kaç kez çalışır
 *                         MAT.4.2.6 · 4.1.5
 *   4. Simetri           boyalı karolarla doğruya göre simetri; öteleme ile karıştırma
 *                         MAT.4.3.8 · 4.3.9
 *
 * Çizim sahasında her sağa ya da sola dönüş çeyrek dönüştür (90°); başarı cümleleri dereceyi
 * dönüş sayısından, çevreyi çizilen birim çizgi sayısından, küp sayısını izden hesaplar.
 * Karo dünyalarında `eksen.k` hücre koordinatındadır: 2.5, x = 2 ile x = 3 hücrelerinin arasıdır.
 */
import { programKur, type BlokSablonu, type KisaBlok } from './program';
import { bahce, insaatAlani, saha, type DunyaTanimi, type Hedef } from './dunya';
import { izOzeti } from './yorumlayici';
import type { Gorev, Unite } from './gorev';

const ILERI: BlokSablonu = { tur: 'eylem', eylem: 'ileri' };
const SAGA: BlokSablonu = { tur: 'eylem', eylem: 'sagaDon' };
const SOLA: BlokSablonu = { tur: 'eylem', eylem: 'solaDon' };
const KOY: BlokSablonu = { tur: 'eylem', eylem: 'koy' };
const BOYA: BlokSablonu = { tur: 'eylem', eylem: 'boya' };
const kez = (n: number): BlokSablonu => ({ tur: 'tekrarlaKez', kez: n });

const k = (liste: KisaBlok[], onek: string) => programKur(liste, onek);

const CIZ: Hedef = { cizimiTamamla: true, cikistaBitir: false };
const KUR: Hedef = { yapiyiKur: true, cikistaBitir: false };
const BOYA_HEDEF: Hedef = { boyamayiTamamla: true, cikistaBitir: false };

const HAREKET: BlokSablonu[] = [ILERI, SAGA, SOLA];

const ORTAK = { sinif: 4, kademe: 'Mucit adası', gorunum: 'blok' as const, sesliYonerge: false };

/** Dönüş sayısından derece: "2 × 90° = 180°" */
const derece = (donus: number) => `${donus} × 90° = ${donus * 90}°`;

// ---------------------------------------------------------------------------
// 1. Dönüş ve açı
// ---------------------------------------------------------------------------

const ACI_L = saha('s4-aci-1', 'L harfi', ['B-.-.', '    |', '. . .', '    |', '. . .']);
const ACI_ARKA = saha('s4-aci-2', 'Arkadaki çizgi', ['.-.-.-B .']);
const ACI_UZUN = saha('s4-aci-3', 'Uzun çizgi', ['. . . . .', '         ', '.-.-B-.-.', '         ', '. . . . .']);
const ACI_SOL = saha('s4-aci-4', 'Sola dönen yol', ['. . .', '    |', '. . .', '    |', 'B-.-.']);
const ACI_KARE = saha('s4-aci-5', 'Kare', ['B-.-.', '|   |', '. . .', '|   |', '.-.-.']);
const ACI_KAPI = saha('s4-aci-6', 'Kapı', ['.-.-.', '|   |', '. . .', '|   |', 'B . .'], { yon: 3 });

const L_COZUMU = k(['ileri', 'ileri', 'sagaDon', 'ileri', 'ileri'], 's4a1-');
const KARE_DONUSU = k([['kez', 4, ['ileri', 'ileri', 'sagaDon']]], 's4a5-');

const ACI_GOREVLERI: Gorev[] = [
  {
    id: 's4-aci-1',
    tur: 'yaz',
    baslik: 'Çeyrek dönüş',
    yonerge: 'Çizgi robotu L harfini çizecek. Köşede dönmesi gerekiyor. Robotun kodunu yaz.',
    dunya: ACI_L,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: HAREKET,
    baslangic: 'bos',
    cozum: L_COZUMU,
    ipuclari: ['Robot önce sağa doğru 2 birim çizsin. Köşede hangi yana dönmeli?', 'Bir kez sağa dönmek çeyrek dönüştür: 90°.'],
    basari: (iz) => `Oldu! Robot köşede döndü: ${derece(izOzeti(iz).donus)}. Köşedeki açı bir dik açı.`,
    soru: {
      metin: 'Robot köşede kaç derece döndü?',
      birim: 'derece',
      cevap: (iz) => izOzeti(iz).donus * 90,
      sonrasi: 'Çeyrek dönüş 90 derecedir. Köşede bir dik açı oluştu.',
      yonlendirme: 'Bir tam tur 360 derece. Robot turun ne kadarını döndü?',
    },
    kazanimlar: ['MAT.4.3.5', 'MAT.4.3.7'],
  },
  {
    id: 's4-aci-2',
    tur: 'kurgu',
    baslik: 'Arkadaki çizgi',
    yonerge: 'Bu kez çizgi robotun arkasında. Robot arkasına dönüp 3 birimlik çizgiyi çizmeli. Kodunu düzelt.',
    dunya: ACI_ARKA,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: HAREKET,
    baslangic: 'onceki',
    cozum: k(['sagaDon', 'sagaDon', 'ileri', 'ileri', 'ileri'], 's4a2-'),
    ipuclari: ['Robot şimdi hangi yöne bakıyor? Çizgi hangi yönde?', 'Arkaya dönmek için iki kez sağa (ya da iki kez sola) dön.'],
    basari: (iz) => `Oldu! ${izOzeti(iz).donus} çeyrek dönüş: ${derece(izOzeti(iz).donus)}. Robot arkasına döndü.`,
    soru: {
      metin: 'Robot arkasına dönmek için kaç derece döndü?',
      birim: 'derece',
      cevap: (iz) => izOzeti(iz).donus * 90,
      sonrasi: 'İki çeyrek dönüş bir yarım dönüştür: 90° + 90° = 180°.',
      yonlendirme: 'Her dönüş 90°. Robot kaç kez döndü?',
    },
    kazanimlar: ['MAT.4.3.5'],
  },
  {
    id: 's4-aci-3',
    tur: 'hata',
    baslik: 'Yarım kalan dönüş',
    yonerge: 'Robot çizginin ortasında. Önce sağ uca gidip sonra geri dönerek bütün çizgiyi çizmeli. Kodda bir hata var: çalıştır, bul ve düzelt.',
    dunya: ACI_UZUN,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: HAREKET,
    baslangic: k(['ileri', 'ileri', 'sagaDon', 'ileri', 'ileri', 'ileri', 'ileri'], 's4a3h-'),
    cozum: k(['ileri', 'ileri', 'sagaDon', 'sagaDon', 'ileri', 'ileri', 'ileri', 'ileri'], 's4a3-'),
    ipuclari: ['Robot sağ uca varınca kaç derece dönmeli ki geri gelsin?', 'Bir kez sağa dönmek 90°: robot aşağı bakar. Geri dönmek için 180° gerekir.'],
    basari: (iz) => `Buldun! Geri dönmek yarım dönüştür: ${derece(izOzeti(iz).donus)}. Robot kendi çizgisinin üstünden geri geldi.`,
    kazanimlar: ['MAT.4.3.5', 'MAT.4.3.7'],
  },
  {
    id: 's4-aci-4',
    tur: 'yaz',
    baslik: 'Üç sağa, bir sola',
    yonerge: 'Bu kod şekli doğru çiziyor ama köşede 3 kez sağa dönüyor. Aynı dönüşü tek blokla yap: kod en çok 5 blok olsun.',
    dunya: ACI_SOL,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: HAREKET,
    baslangic: k(['ileri', 'ileri', 'sagaDon', 'sagaDon', 'sagaDon', 'ileri', 'ileri'], 's4a4h-'),
    cozum: k(['ileri', 'ileri', 'solaDon', 'ileri', 'ileri'], 's4a4-'),
    enCokBlok: 5,
    ipuclari: ['Üç sağa dönüşten sonra robot hangi yöne bakıyor? Hangi tek dönüş onu aynı yöne çevirir?', '"sağa dön" bloklarını çıkar, yerine bir "sola dön" koy.'],
    basari: () => `Oldu! Tek sola dönüş 90°. Üç sağa dönüş ${derece(3)} eder; robot ikisinde de aynı yöne bakar.`,
    soru: {
      metin: 'Üç kez sağa dönmek kaç derece eder?',
      birim: 'derece',
      cevap: () => 3 * 90,
      sonrasi: '3 × 90° = 270°. 270° + 90° = 360°: üç sağa dönüş, bir sola dönüşle aynı yöne çevirir.',
      yonlendirme: 'Her sağa dönüş 90°. Üç tanesini topla.',
    },
    kazanimlar: ['MAT.4.3.5'],
  },
  {
    id: 's4-aci-5',
    tur: 'tahmin',
    baslik: 'Tam tur',
    yonerge: 'Kodu oku ama henüz çalıştırma. Robot kareyi çizerken toplam kaç derece dönecek? Tahminini yaz, sonra çalıştır.',
    dunya: ACI_KARE,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: [...HAREKET, kez(4)],
    baslangic: KARE_DONUSU,
    cozum: KARE_DONUSU,
    ipuclari: ['Her "sağa dön" çeyrek dönüştür: 90°.', 'Döngü 4 kez dönüyor: 90 + 90 + 90 + 90.'],
    tahmin: {
      metin: 'Robot toplam kaç derece dönecek?',
      birim: 'derece',
      cevap: (iz) => izOzeti(iz).donus * 90,
      sonrasi: '4 çeyrek dönüş: 4 × 90° = 360°, bir tam tur.',
      yonlendirme: 'Döngü kaç kez dönüyor? Her turda robot kaç derece dönüyor?',
    },
    basari: (iz) => `Doğru! ${derece(izOzeti(iz).donus)}: robot bir tam tur döndü ve yine başladığı yöne bakıyor.`,
    kazanimlar: ['MAT.4.3.5', 'MAT.4.3.7'],
  },
  {
    id: 's4-aci-6',
    tur: 'hata',
    baslik: 'Fazladan dönüş',
    yonerge: 'Robot kapı biçiminde bir şekil çizecek ama ikinci köşede geri dönüyor. Çalıştır, hatayı bul ve düzelt.',
    dunya: ACI_KAPI,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: HAREKET,
    baslangic: k(['ileri', 'ileri', 'sagaDon', 'ileri', 'ileri', 'sagaDon', 'sagaDon', 'ileri', 'ileri'], 's4a6h-'),
    cozum: k(['ileri', 'ileri', 'sagaDon', 'ileri', 'ileri', 'sagaDon', 'ileri', 'ileri'], 's4a6-'),
    ipuclari: ['İkinci köşede robot kaç derece dönüyor? Aşağı inmek için kaç derece gerek?', 'İki "sağa dön" 180° eder; robot geri döner. Birini çıkar: 90° yeter.'],
    basari: (iz) => `Buldun! Her köşede çeyrek dönüş: ${derece(izOzeti(iz).donus)}. İki köşe, iki dik açı.`,
    kazanimlar: ['MAT.4.3.5', 'MAT.4.3.7'],
  },
];

// ---------------------------------------------------------------------------
// 2. Kodla şekil çiz
// ---------------------------------------------------------------------------

const SEKIL_ARACLARI: BlokSablonu[] = [...HAREKET, kez(2)];

const KARE_3 = saha('s4-sekil-1', 'Kare', ['B-.-.-.', '|     |', '. . . .', '|     |', '. . . .', '|     |', '.-.-.-.']);
const KARE_4 = saha('s4-sekil-2', 'Büyük kare', ['B-.-.-.-.', '|       |', '. . . . .', '|       |', '. . . . .', '|       |', '. . . . .', '|       |', '.-.-.-.-.']);
const KARE_ALT = saha('s4-sekil-3', 'Kapanmayan kare', ['.-.-.-.', '|     |', '. . . .', '|     |', '. . . .', '|     |', 'B-.-.-.'], { yon: 3 });
const DIKDORTGEN = saha('s4-sekil-4', 'Dikdörtgen', ['B-.-.-.-.', '|       |', '. . . . .', '|       |', '.-.-.-.-.']);
const DIKDORTGEN_GENIS = saha('s4-sekil-5', 'Dikdörtgen', ['B-.-.-.-.', '|       |', '. . . . .', '|       |', '.-.-.-.-.', '         ', '. . . . .']);
const INCE_DIKDORTGEN = saha('s4-sekil-6', 'İnce dikdörtgen', ['B-.-.-.', '|     |', '.-.-.-.']);

const DIKDORTGEN_KODU: KisaBlok[] = [['kez', 2, ['ileri', 'ileri', 'ileri', 'ileri', 'sagaDon', 'ileri', 'ileri', 'sagaDon']]];
const INCE_KOD = k([['kez', 2, ['ileri', 'ileri', 'ileri', 'sagaDon', 'ileri', 'sagaDon']]], 's4s6-');

const SEKIL_GOREVLERI: Gorev[] = [
  {
    id: 's4-sekil-1',
    tur: 'yaz',
    baslik: 'Kare',
    yonerge: 'Kenarı 3 birim olan bir kare çiz. Karenin 4 kenarı eş, 4 köşesi dik açı: "tekrarla" bloğunu kullan. Kod en çok 5 blok olsun.',
    dunya: KARE_3,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: SEKIL_ARACLARI,
    baslangic: 'bos',
    cozum: k([['kez', 4, ['ileri', 'ileri', 'ileri', 'sagaDon']]], 's4s1-'),
    enCokBlok: 5,
    ipuclari: ['Bir kenarı ve bir köşeyi çizen blokları bul: 3 kez ileri git, 1 kez sağa dön.', 'Bu parçayı "tekrarla" bloğunun içine koy, sayıyı 4 yap.'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! 4 kenar × ${o.cizgi / 4} birim = ${o.cizgi} birim: karenin çevresi ${o.cizgi} birim.`;
    },
    soru: {
      metin: 'Karenin çevresi kaç birim?',
      birim: 'birim',
      cevap: (iz) => izOzeti(iz).cizgi,
      sonrasi: '3 + 3 + 3 + 3 = 4 × 3 = 12 birim.',
      yonlendirme: 'Robotun çizdiği bütün kenarları topla: 3 + 3 + 3 + 3.',
    },
    kazanimlar: ['MAT.4.3.10', 'MAT.4.3.2', 'MAT.4.3.3'],
  },
  {
    id: 's4-sekil-2',
    tur: 'kurgu',
    baslik: 'Büyük kare',
    yonerge: 'Bu karenin kenarı 4 birim. Kodunu bu kareye göre düzelt. Kod en çok 6 blok olsun.',
    dunya: KARE_4,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: SEKIL_ARACLARI,
    baslangic: 'onceki',
    cozum: k([['kez', 4, ['ileri', 'ileri', 'ileri', 'ileri', 'sagaDon']]], 's4s2-'),
    enCokBlok: 6,
    ipuclari: ['Döngünün içinde kenar için kaç "ileri git" var? Şimdi kaç tane olmalı?'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! 4 × ${o.cizgi / 4} = ${o.cizgi} birim. Kenar 1 birim uzayınca çevre 4 birim uzadı.`;
    },
    soru: {
      metin: 'Bu karenin çevresi kaç birim?',
      birim: 'birim',
      cevap: (iz) => izOzeti(iz).cizgi,
      sonrasi: '4 × 4 = 16 birim.',
      yonlendirme: 'Karenin 4 kenarı var, her biri 4 birim.',
    },
    kazanimlar: ['MAT.4.3.10', 'MAT.4.3.3'],
  },
  {
    id: 's4-sekil-3',
    tur: 'hata',
    baslik: 'Kapanmayan kare',
    yonerge: 'Bu kod bir kare çizmeli ama şekil kapanmıyor. Çalıştır, hatayı bul ve düzelt.',
    dunya: KARE_ALT,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: SEKIL_ARACLARI,
    baslangic: k([['kez', 3, ['ileri', 'ileri', 'ileri', 'sagaDon']]], 's4s3h-'),
    cozum: k([['kez', 4, ['ileri', 'ileri', 'ileri', 'sagaDon']]], 's4s3-'),
    ipuclari: ['Karenin kaç kenarı var? Döngü kaç kez dönüyor?', 'Her tur bir kenar çizer. 4 kenar için döngü 4 kez dönmeli.'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Buldun! 4 tur, 4 kenar: şekil kapandı. Çevre 4 × ${o.cizgi / 4} = ${o.cizgi} birim.`;
    },
    kazanimlar: ['MAT.4.3.2', 'MAT.4.3.10'],
  },
  {
    id: 's4-sekil-4',
    tur: 'yaz',
    baslik: 'Dikdörtgen',
    yonerge: 'Uzun kenarı 4, kısa kenarı 2 birim olan dikdörtgeni çiz. Karşılıklı kenarlar eş: hangi parça tekrar ediyor? Kod en çok 9 blok olsun.',
    dunya: DIKDORTGEN,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: [...HAREKET, kez(4)],
    baslangic: 'bos',
    cozum: k(DIKDORTGEN_KODU, 's4s4-'),
    enCokBlok: 9,
    ipuclari: ['Bir uzun ve bir kısa kenarı çizen parçayı bul: 4 kez ileri, sağa dön, 2 kez ileri, sağa dön.', 'Bu parçayı "2 kez tekrarla" bloğunun içine koy.'],
    basari: (iz) => `Oldu! Uzun kenar, dönüş, kısa kenar, dönüş: bu parça 2 kez tekrar etti. Çevre 2 × (4 + 2) = ${izOzeti(iz).cizgi} birim.`,
    soru: {
      metin: 'Dikdörtgenin çevresi kaç birim?',
      birim: 'birim',
      cevap: (iz) => izOzeti(iz).cizgi,
      sonrasi: '4 + 2 + 4 + 2 = 12 birim. Kenarı 3 birim olan karenin çevresi de 12 birimdi: şekiller farklı, çevreleri aynı.',
      yonlendirme: 'Bütün kenarları topla: 4 + 2 + 4 + 2.',
    },
    kazanimlar: ['MAT.4.3.10', 'MAT.4.3.2', 'MAT.4.3.3'],
  },
  {
    id: 's4-sekil-5',
    tur: 'hata',
    baslik: 'Kare sanılan dikdörtgen',
    yonerge: 'Bu kod dikdörtgeni kare çizer gibi çiziyor ve şeklin dışına çıkıyor. Çalıştır, hatayı bul ve düzelt.',
    dunya: DIKDORTGEN_GENIS,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: [...HAREKET, kez(4)],
    baslangic: k([['kez', 4, ['ileri', 'ileri', 'ileri', 'ileri', 'sagaDon']]], 's4s5h-'),
    cozum: k(DIKDORTGEN_KODU, 's4s5-'),
    enCokBlok: 9,
    ipuclari: ['Dikdörtgenin bütün kenarları eş mi? Kısa kenar kaç birim?', 'Dikdörtgende 2 çift eş kenar var: "4 ileri, sağa dön, 2 ileri, sağa dön" parçasını 2 kez tekrarla.'],
    basari: (iz) => `Buldun! Dikdörtgenin karşılıklı kenarları eş: 4, 2, 4, 2. Çevre ${izOzeti(iz).cizgi} birim.`,
    kazanimlar: ['MAT.4.3.2', 'MAT.4.3.10'],
  },
  {
    id: 's4-sekil-6',
    tur: 'tahmin',
    baslik: 'Çevreyi tahmin et',
    yonerge: 'Kodu oku ama henüz çalıştırma. Robot kaç birim çizgi çizecek? Bu sayı şeklin çevresi. Tahmin et, sonra çalıştır.',
    dunya: INCE_DIKDORTGEN,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: SEKIL_ARACLARI,
    baslangic: INCE_KOD,
    cozum: INCE_KOD,
    ipuclari: ['Döngünün bir turunda kaç kez "ileri git" var?', 'Her "ileri git" 1 birim çizer. Bir turdaki birimi 2 ile çarp.'],
    tahmin: {
      metin: 'Robot kaç birim çizgi çizecek?',
      birim: 'birim',
      cevap: (iz) => izOzeti(iz).cizgi,
      sonrasi: '2 × (3 + 1) = 8 birim: dikdörtgenin çevresi.',
      yonlendirme: 'Bir turda kaç "ileri git" var? Döngü kaç kez dönüyor?',
    },
    basari: (iz) => {
      const n = izOzeti(iz).cizgi;
      return `Doğru! Bir turda 3 + 1 = ${n / 2} birim, 2 turda 2 × ${n / 2} = ${n} birim: çevre ${n} birim.`;
    },
    kazanimlar: ['MAT.4.3.3', 'MAT.4.3.10'],
  },
];

// ---------------------------------------------------------------------------
// 3. İç içe tekrar
// ---------------------------------------------------------------------------

const KULE_ARACLARI: BlokSablonu[] = [ILERI, KOY, SAGA, kez(3)];
const KARELER_ARACLARI: BlokSablonu[] = [...HAREKET, kez(4)];

/** "3 kule × 3 küp = 9 küp": kule sayısı ilerlemelerden, küp sayısı izden */
const kuleCumlesi = (iz: Parameters<Gorev['basari']>[0]) => {
  const o = izOzeti(iz);
  return `${o.ileri} kule × ${o.kup / o.ileri} küp = ${o.kup} küp`;
};

const UC_KARE = saha('s4-icice-5', 'Yan yana kareler', ['B-.-.-.', '| | | |', '.-.-.-.']);
const DORT_KARE = saha('s4-icice-6', 'Dört kare', ['B-.-.-.-.', '| | | | |', '.-.-.-.-.']);
const KULE_TAHMIN = k([['kez', 3, ['ileri', ['kez', 4, ['koy']]]]], 's4i3-');

const ICICE_GOREVLERI: Gorev[] = [
  {
    id: 's4-icice-1',
    tur: 'yaz',
    baslik: 'Kule sırası',
    yonerge: 'Dron 3 kule kuracak, her kule 3 küp. Bir döngünün içine başka bir döngü koy. Kod en çok 4 blok olsun.',
    dunya: insaatAlani('s4-icice-1', 'Üç kule', ['B333']),
    hedef: KUR,
    bitkiAdi: 'bitki',
    aracKutusu: KULE_ARACLARI,
    baslangic: 'bos',
    cozum: k([['kez', 3, ['ileri', ['kez', 3, ['koy']]]]], 's4i1-'),
    enCokBlok: 4,
    ipuclari: ['Bir kuleyi kuran parçayı bul: ileri git, sonra 3 kez küp koy.', 'Küp koymayı kendi döngüsüne al; bu parçayı da "3 kez tekrarla" içine koy.'],
    basari: (iz) => `Oldu! ${kuleCumlesi(iz)}. İç döngü her kulede baştan çalıştı.`,
    soru: {
      metin: 'Dron toplam kaç küp koydu?',
      birim: 'küp',
      cevap: (iz) => izOzeti(iz).kup,
      sonrasi: '3 × 3 = 9 küp.',
      yonlendirme: 'Bir kulede kaç küp var? Kaç kule var?',
    },
    kazanimlar: ['MAT.4.2.6', 'MAT.4.1.5'],
  },
  {
    id: 's4-icice-2',
    tur: 'kurgu',
    baslik: 'Dört kule',
    yonerge: 'Bu kez 4 kule var, her kule 2 küp. Kodunu düzelt: iki döngünün sayılarını değiştir. Kod yine en çok 4 blok olsun.',
    dunya: insaatAlani('s4-icice-2', 'Dört alçak kule', ['B2222']),
    hedef: KUR,
    bitkiAdi: 'bitki',
    aracKutusu: KULE_ARACLARI,
    baslangic: 'onceki',
    cozum: k([['kez', 4, ['ileri', ['kez', 2, ['koy']]]]], 's4i2-'),
    enCokBlok: 4,
    ipuclari: ['Dış döngü kule sayısını, iç döngü bir kuledeki küp sayısını söyler.'],
    basari: (iz) => `Oldu! ${kuleCumlesi(iz)}.`,
    kazanimlar: ['MAT.4.2.6'],
  },
  {
    id: 's4-icice-3',
    tur: 'tahmin',
    baslik: 'Kaç kez?',
    yonerge: 'Kodu oku ama henüz çalıştırma. İçteki "küp koy" bloğu kaç kez çalışacak? Tahmin et, sonra çalıştır.',
    dunya: insaatAlani('s4-icice-3', 'Yüksek kuleler', ['B444']),
    hedef: KUR,
    bitkiAdi: 'bitki',
    aracKutusu: KULE_ARACLARI,
    baslangic: KULE_TAHMIN,
    cozum: KULE_TAHMIN,
    ipuclari: ['Önce bir kuleyi düşün: iç döngü bir turda kaç küp koyuyor?', 'Sonra dış döngünün kaç tur döndüğüne bak ve çarp.'],
    tahmin: {
      metin: 'İçteki "küp koy" bloğu kaç kez çalışacak?',
      birim: 'kez',
      cevap: (iz) => izOzeti(iz).kup,
      sonrasi: 'Dış döngü 3 tur, iç döngü her turda 4 kez: 3 × 4 = 12.',
      yonlendirme: 'İç döngü bir turda kaç küp koyuyor? Dış döngü kaç tur dönüyor?',
    },
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Doğru! Dış döngü ${o.ileri} tur × iç döngü ${o.kup / o.ileri} kez = ${o.kup} küp.`;
    },
    kazanimlar: ['MAT.4.2.6', 'MAT.4.1.5'],
  },
  {
    id: 's4-icice-4',
    tur: 'hata',
    baslik: 'Yayılan küpler',
    yonerge: 'Dron 3 kule kurmalı, her kule 2 küp. Ama küpler yere yayılıyor. Çalıştır, hatayı bul ve düzelt.',
    dunya: insaatAlani('s4-icice-4', 'Üç ikili kule', ['B222..']),
    hedef: KUR,
    bitkiAdi: 'bitki',
    aracKutusu: KULE_ARACLARI,
    // "ileri git" iç döngüye girmiş: dron her küpten sonra ilerliyor
    baslangic: k([['kez', 3, [['kez', 2, ['ileri', 'koy']]]]], 's4i4h-'),
    cozum: k([['kez', 3, ['ileri', ['kez', 2, ['koy']]]]], 's4i4-'),
    ipuclari: ['"ileri git" hangi döngünün içinde? Dron her küpten sonra mı ilerlemeli, her kuleden sonra mı?', '"ileri git" bloğunu iç döngüden çıkar; dış döngünün içine, iç döngünün önüne koy.'],
    basari: (iz) => `Buldun! Dron her kuleden sonra ilerliyor: ${kuleCumlesi(iz)}.`,
    kazanimlar: ['MAT.4.2.6'],
  },
  {
    id: 's4-icice-5',
    tur: 'yaz',
    baslik: 'Yan yana kareler',
    yonerge: 'Yan yana 3 kare çiz. Bir kareyi çizen döngü dış döngünün içinde olsun; her kareden sonra robot bir sonraki kareye geçsin. En çok 5 blok.',
    dunya: UC_KARE,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: KARELER_ARACLARI,
    baslangic: 'bos',
    cozum: k([['kez', 3, [['kez', 4, ['ileri', 'sagaDon']], 'ileri']]], 's4i5-'),
    enCokBlok: 5,
    ipuclari: ['Önce bir kareyi çizen döngüyü yaz: 4 kez "ileri git, sağa dön".', 'Kare bitince robot bir adım ilerleyip sonraki kareye geçsin. Hepsini "3 kez tekrarla" içine koy.'],
    basari: (iz) => {
      const o = izOzeti(iz);
      return `Oldu! İç döngü 3 × 4 = ${o.donus} kez çalıştı. Ortak kenarlar iki kez çizildiği için sahada ${o.cizgi} çizgi var.`;
    },
    soru: {
      metin: 'Yan yana 4 kare olsaydı sahada kaç çizgi olurdu?',
      birim: 'çizgi',
      cevap: (iz) => izOzeti(iz).cizgi + 3,
      sonrasi: '1 kare 4, 2 kare 7, 3 kare 10 çizgi: her yeni kare 3 çizgi ekler. 4 kare 13 çizgi.',
      yonlendirme: 'Yeni kare komşusuyla bir kenarı paylaşır. Her yeni kare kaç çizgi ekler?',
    },
    kazanimlar: ['MAT.4.2.6', 'MAT.4.1.5'],
  },
  {
    id: 's4-icice-6',
    tur: 'hata',
    baslik: 'Hep aynı kare',
    yonerge: 'Robot yan yana 4 kare çizmeli ama hep aynı kareyi çiziyor. Çalıştır, izle, hatayı bul ve düzelt.',
    dunya: DORT_KARE,
    hedef: CIZ,
    bitkiAdi: 'bitki',
    aracKutusu: KARELER_ARACLARI,
    // Sonraki kareye geçiş ("ileri git") dış döngünün dışında kalmış
    baslangic: k([['kez', 4, [['kez', 4, ['ileri', 'sagaDon']]]], 'ileri'], 's4i6h-'),
    cozum: k([['kez', 4, [['kez', 4, ['ileri', 'sagaDon']], 'ileri']]], 's4i6-'),
    ipuclari: ['Robot sonraki kareye ne zaman geçiyor? "ileri git" hangi döngünün içinde?', 'Son "ileri git" bloğunu dış döngünün içine, iç döngünün altına taşı.'],
    basari: (iz) => `Buldun! Robot her kareden sonra bir adım ilerledi: 4 kare, 4 + 3 + 3 + 3 = ${izOzeti(iz).cizgi} çizgi.`,
    kazanimlar: ['MAT.4.2.6', 'MAT.4.1.5'],
  },
];

// ---------------------------------------------------------------------------
// 4. Simetri
// ---------------------------------------------------------------------------

const DIKEY = { yon: 'dikey' as const, k: 2.5 };
const YATAY = { yon: 'yatay' as const, k: 1.5 };
const karo = (id: string, ad: string, harita: string[], eksen: DunyaTanimi['eksen']): DunyaTanimi =>
  bahce(id, ad, harita, { boyaTuru: 'boya', hedefGizli: true, eksen, adimIzi: false });
const KARO_ARACLARI: BlokSablonu[] = [...HAREKET, BOYA];

const SIMETRI_GOREVLERI: Gorev[] = [
  {
    id: 's4-simetri-1',
    tur: 'yaz',
    baslik: 'Aynadaki karolar',
    yonerge: 'Ortadaki çizgi simetri doğrusu. Soldaki boyalı karoların simetriğini sağ yana boya: her karo çizgiye soldaki eşi kadar uzak olsun.',
    dunya: karo('s4-simetri-1', 'Karo sırası', ['*.*b.o'], DIKEY),
    hedef: BOYA_HEDEF,
    bitkiAdi: 'bitki',
    aracKutusu: KARO_ARACLARI,
    baslangic: 'bos',
    cozum: k(['boya', 'ileri', 'ileri', 'boya'], 's4y1-'),
    ipuclari: ['Soldaki her boyalı karo çizgiden kaç kare uzakta? Sağda da o kadar uzakta boya.', 'Robotun durduğu karo çizginin hemen yanında: çizgiye 1 kare uzak.'],
    basari: (iz) => `Oldu! ${izOzeti(iz).boya} karo boyandı; her biri simetri doğrusuna soldaki eşi kadar uzak.`,
    kazanimlar: ['MAT.4.3.9', 'MAT.4.3.8'],
  },
  {
    id: 's4-simetri-2',
    tur: 'kurgu',
    baslik: 'İki sıra',
    yonerge: 'Bu kez karolar iki sıra. Üst sıradaki boyalı karonun da simetriğini boya. Kodunu düzelt.',
    dunya: karo('s4-simetri-2', 'İki sıra karo', ['.*..o.', '*.*b.o'], DIKEY),
    hedef: BOYA_HEDEF,
    bitkiAdi: 'bitki',
    aracKutusu: KARO_ARACLARI,
    baslangic: 'onceki',
    cozum: k(['boya', 'ileri', 'ileri', 'boya', 'solaDon', 'ileri', 'solaDon', 'ileri', 'boya'], 's4y2-'),
    ipuclari: ['Üst sıradaki boyalı karo çizgiden kaç kare uzakta?', 'Alt sırayı bitirince yukarı çık; üst sırada çizgiye 2 kare uzaktaki karoyu boya.'],
    basari: (iz) => `Oldu! ${izOzeti(iz).boya} karo: her boyalı karonun simetriği aynı sırada, çizginin öbür yanında ve aynı uzaklıkta.`,
    kazanimlar: ['MAT.4.3.9'],
  },
  {
    id: 's4-simetri-3',
    tur: 'hata',
    baslik: 'Kaydırılmış kopya',
    yonerge: 'Bu kod soldaki bayrağın simetriğini boyamalı. Çalıştır ve izle: robot doğru karoları mı boyuyor? Hatayı bul ve düzelt.',
    dunya: karo('s4-simetri-3', 'Bayrak', ['**.Boo', '*....o'], DIKEY),
    hedef: BOYA_HEDEF,
    bitkiAdi: 'bitki',
    aracKutusu: KARO_ARACLARI,
    // Soldaki bayrağı boyayan kod sağda aynen çalıştırılmış: şekil yansımamış, kaymış (öteleme)
    baslangic: k(['boya', 'ileri', 'boya', 'sagaDon', 'ileri', 'sagaDon', 'ileri', 'boya'], 's4y3h-'),
    cozum: k(['ileri', 'boya', 'ileri', 'boya', 'sagaDon', 'ileri', 'boya'], 's4y3-'),
    ipuclari: ['Kodun boyadığı şekil soldakinin aynısı mı, aynadaki görüntüsü mü?', 'Soldaki bayrağın direği çizgiden en uzak sütunda. Aynada da çizgiden en uzak sütunda olmalı.'],
    basari: (iz) => `Buldun! Simetrik şekil kaymaz, ters döner: ${izOzeti(iz).boya} karo, her biri çizgiye eşi kadar uzak.`,
    kazanimlar: ['MAT.4.3.8', 'MAT.4.3.9'],
  },
  {
    id: 's4-simetri-4',
    tur: 'yaz',
    baslik: 'Yatay ayna',
    yonerge: 'Bu kez simetri doğrusu yatay. Üst yarıdaki boyalı karoların simetriğini alt yarıya boya.',
    dunya: karo('s4-simetri-4', 'Yatay ayna', ['..*..', '.***.', 'Booo.', '..o..'], YATAY),
    hedef: BOYA_HEDEF,
    bitkiAdi: 'bitki',
    aracKutusu: [...KARO_ARACLARI, kez(3)],
    baslangic: 'bos',
    cozum: k([['kez', 3, ['ileri', 'boya']], 'sagaDon', 'ileri', 'sagaDon', 'ileri', 'boya'], 's4y4-'),
    ipuclari: ['Çizginin hemen üstündeki sıra, hemen altındaki sıraya yansır.', 'En üst sıradaki karo çizgiden 2 sıra uzakta: simetriği en alt sırada.'],
    basari: (iz) => `Oldu! ${izOzeti(iz).boya} karo boyandı. Üst yarıdaki her karonun simetriği alt yarıda, çizgiye aynı uzaklıkta.`,
    soru: {
      metin: 'Bu şeklin kaç simetri doğrusu var?',
      birim: 'doğru',
      cevap: () => 2,
      sonrasi: 'Yatay çizgi ve ortadan geçen dikey çizgi: şekil ikisine göre de simetrik.',
      yonlendirme: 'Şekli ortadan dikey bir çizgiyle katlasan iki yarı üst üste gelir mi?',
    },
    kazanimlar: ['MAT.4.3.8', 'MAT.4.3.9'],
  },
  {
    id: 's4-simetri-5',
    tur: 'hata',
    baslik: 'Yanlış uzaklık',
    yonerge: 'Bu kod üst sıradaki karoların simetriğini boyamalı. Çalıştır ve izle: boyanan karolar çizgiye doğru uzaklıkta mı? Hatayı bul ve düzelt.',
    dunya: karo('s4-simetri-5', 'Uzak karolar', ['*.*..', '.....', 'B....', 'o.o..'], YATAY),
    hedef: BOYA_HEDEF,
    bitkiAdi: 'bitki',
    aracKutusu: KARO_ARACLARI,
    // Simetrik karolar çizginin hemen altına boyanıyor: uzaklık korunmamış
    baslangic: k(['boya', 'ileri', 'ileri', 'boya'], 's4y5h-'),
    cozum: k(['sagaDon', 'ileri', 'boya', 'solaDon', 'ileri', 'ileri', 'boya'], 's4y5-'),
    ipuclari: ['Üstteki karolar çizgiden kaç sıra uzakta? Kod çizgiden kaç sıra uzağı boyuyor?', 'Simetrik karo çizginin öbür yanında aynı uzaklıktadır: 2 sıra. Robot önce bir sıra aşağı insin.'],
    basari: (iz) => `Buldun! Üstteki karolar çizgiye 2 sıra uzak; simetrikleri de 2 sıra uzakta. ${izOzeti(iz).boya} karo boyandı.`,
    kazanimlar: ['MAT.4.3.9'],
  },
];

// ---------------------------------------------------------------------------
// Üniteler
// ---------------------------------------------------------------------------

export const SINIF4: readonly Unite[] = [
  {
    ...ORTAK,
    id: 's4-aci',
    no: 1,
    ad: 'Dönüş ve açı',
    tema: 'Spor sahası',
    yeniKavram: 'Açı bir dönme miktarıdır: çeyrek dönüş 90°, yarım dönüş 180°, tam dönüş 360°',
    oncedenBilinen: 'Adımlar, dönüşler ve "… kez tekrarla" (1–3. sınıf)',
    kalip: 'dondur',
    kazanimlar: ['MAT.4.3.5', 'MAT.4.3.7'],
    sure: '2 ders saati',
    uygunluk: 'Çizgi robotu nokta ağında yalnız dik açılarla döner; dar ve geniş açılar dik açıyla karşılaştırılarak tartışma sorularında ele alınır.',
    gorevler: ACI_GOREVLERI,
    fissiz: {
      ad: 'Dönüş saati',
      amac: 'Dönüşü bir açı olarak bedenle yaşamak; çeyrek, yarım ve tam dönüşü derecelerle saymak.',
      sure: '15 dakika',
      roller: ['Bir öğrenci robot olur; yere çizilmiş büyük bir dairenin ortasında durur.', 'Sınıf programcıdır; kartları tahtaya dizer ve dereceleri hep birlikte sayar.'],
      adimlar: [
        'Yere tebeşirle bir daire çizin; robotun baktığı yöne 0°, sağına 90°, arkasına 180°, soluna 270° yazın.',
        'Robot her SAĞA DÖN kartında çeyrek tur döner; sınıf "90, 180, 270, 360" diye sayar.',
        'Sınıfa sorulur: robot arkasına bakmak için kaç kez dönmeli? Üç kez sağa dönen robot nereye bakar?',
        'Robot İLERİ ve SAĞA DÖN kartlarıyla yerde bir kare yürür. Sınıf toplam dönüşü hesaplar: 4 × 90° = 360°.',
        'Sınıfta köşeleri dik açı olan nesneler bulunur; dik açıdan küçük (dar) ve büyük (geniş) açılar gösterilir.',
      ],
      hazirlik: 'Dairenin üstüne 0°, 90°, 180° ve 270° yönlerini yazın. Kartları kesin; kâğıt köşesi dik açıyı denetlemek için kullanılabilir.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir adım ileri git.', adet: 4 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına çeyrek tur dön: 90°.', adet: 4 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna çeyrek tur dön: 90°.', adet: 2 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci açıyı bir dönme miktarı olarak yorumlar: çeyrek dönüşün 90° (dik açı), yarım dönüşün 180°, tam dönüşün 360° olduğunu robotun dönüşlerini sayarak bulur; üç sağa dönüşün bir sola dönüşle aynı yöne çevirdiğini fark eder.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "Dönüş saati" (15 dk), ardından 1–3. görevler: L harfi (90°), arkadaki çizgi (180°), yarım kalan dönüş (hatayı bul, ikişerli).' },
        { baslik: '2. ders', metin: '4. görev (üç sağa, bir sola) bireysel, 5. görev (tam tur) sınıfça tahminle, 6. görev (fazladan dönüş) ikişerli. Ders dar ve geniş açı örnekleriyle kapanır.' },
      ],
      yanilgilar: [
        { ad: 'Geri dönmek için bir dönüş yeter sanmak', metin: 'Arkaya dönmeyi çeyrek dönüş sanmak. 3. görevde robot 90° dönünce aşağı sapar; geri gelmek için 180° gerekir.' },
        { ad: 'Köşede fazladan dönmek', metin: 'Köşede iki kez dönmek (180°): robot kendi çizgisinin üstünden geri gelir ve şekil eksik kalır (6. görev).' },
        { ad: 'Sola dönmenin tek yolu "sola dön" sanmak', metin: 'Üç sağa dönüşün (270°) bir sola dönüşle aynı yöne çevirdiğini görmemek. 4. görevde uzun kod blok sınırını aşar.' },
      ],
      sorular: [
        'Robot kaç kez sağa dönerse ilk yönüne döner?',
        'Çeyrek, yarım ve tam dönüş kaç derece?',
        'Kare çizen robot toplam kaç derece döner?',
        'Sınıfta dik açı gördüğünüz yerler neler? Dik açıdan küçük (dar) ve büyük (geniş) açılar bulabilir misiniz?',
      ],
      celdiriciler:
        'Araç kutusunda hem "sağa dön" hem "sola dön" vardır. 4. görevdeki üç "sağa dön" bloğu bilerek konmuştur: aynı yön tek "sola dön" ile bulunur ve kod blok sınırına sığar.',
    },
  },
  {
    ...ORTAK,
    id: 's4-sekil',
    no: 2,
    ad: 'Kodla şekil çiz',
    tema: 'Spor sahası',
    yeniKavram: 'Şekil döngüsü: kenarı çiz, köşede dön, kenar sayısı kadar tekrarla',
    oncedenBilinen: 'Dönüş ve açı (1. ünite)',
    kalip: 'sekil',
    kazanimlar: ['MAT.4.3.10', 'MAT.4.3.2', 'MAT.4.3.3'],
    sure: '2 ders saati',
    uygunluk: 'Blok sınırı (en çok 5, 6, 9 blok) tekrar eden parçayı bulmaya yöneltir; çevre, robotun çizdiği birim çizgilerden sayılır.',
    gorevler: SEKIL_GOREVLERI,
    fissiz: {
      ad: 'Kare yürüyüşü',
      amac: 'Bir şeklin kenar ve köşelerini tekrar eden bir parça olarak görmek; çevreyi adım sayarak bulmak.',
      sure: '15 dakika',
      roller: ['Bir öğrenci robot olur; bantla çizilmiş kare ve dikdörtgen yollarda yürür.', 'Sınıf programcıdır; tekrar eden parçayı TEKRARLA kartının içine koyar.'],
      adimlar: [
        'Yere bantla kenarı 3 adım olan bir kare yapıştırın.',
        'Sınıf bir kenarı ve bir köşeyi yürüten kartları bulur: İLERİ, İLERİ, İLERİ, SAĞA DÖN. Bu kartlar TEKRARLA kartının içine konur; sayı 4 yazılır.',
        'Robot yürür, sınıf adımları sayar: 4 × 3 = 12 adım, karenin çevresi.',
        'Bir dikdörtgen (4 adıma 2 adım) yapıştırın. Sınıf tekrar eden parçayı bulur: uzun kenar, dönüş, kısa kenar, dönüş; 2 kez.',
        'TEKRARLA sayısı 3 yapılır: şekil kapanır mı? Sınıf tartışır.',
      ],
      hazirlik: 'Yere bantla bir kare ve bir dikdörtgen yapıştırın. TEKRARLA kartının üstüne sayıyı tebeşirle yazın.',
      kartlar: [
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları yazılan sayı kadar uygula.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir adım ileri git.', adet: 6 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön: 90°.', adet: 2 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci kare ve dikdörtgeni kenar ve köşe özelliklerine göre kodlar: tekrar eden parçayı bulur, kenar uzunluğunu ve tekrar sayısını değiştirir; kapanmayan şekli düzeltir ve çevreyi hesaplar.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "Kare yürüyüşü" (15 dk), ardından 1–3. görevler: kare, büyük kare, kapanmayan kare (hatayı bul, ikişerli).' },
        { baslik: '2. ders', metin: '4. görev (dikdörtgen) bireysel, 5. görev (hatayı bul) ikişerli, 6. görev (çevreyi tahmin et) sınıfça. Ders "aynı çevre, farklı şekil" tartışmasıyla kapanır.' },
      ],
      yanilgilar: [
        { ad: 'Son kenarı unutmak', metin: 'Kapanan şekilde son köşede dönmeye gerek olmadığı için 3 tur yeter sanmak. Her tur bir kenar çizer: 4 kenar, 4 tur (3. görev).' },
        { ad: 'Dikdörtgeni kare gibi çizmek', metin: 'Dikdörtgenin bütün kenarlarını eş sanmak. Dikdörtgende karşılıklı kenarlar eştir: parça 2 kez tekrar eder (5. görev).' },
        { ad: 'Çevreyi köşe sayısıyla karıştırmak', metin: 'Çevreyi kenar ya da köşe sayısı sanmak. Çevre, bütün kenarların uzunlukları toplamıdır; robotun çizdiği birimler sayılır.' },
      ],
      sorular: [
        'Kare çizen kodda hangi sayı kenarın uzunluğunu, hangi sayı kenar sayısını söylüyor?',
        'Kenarı 5 birim olan karenin çevresi kaç birim? Kodda neyi değiştirirdin?',
        'Dikdörtgen çizen kodda neden "2 kez tekrarla" yetiyor?',
        'Çevresi 12 birim olan başka şekiller çizebilir misiniz?',
      ],
      celdiriciler: 'Araç kutusunda "sola dön" ve sayısı bilerek yanlış verilmiş bir "tekrarla" bloğu vardır. Blok sınırı uzun, tekrarsız kodu kabul etmez.',
    },
  },
  {
    ...ORTAK,
    id: 's4-icice',
    no: 3,
    ad: 'İç içe tekrar',
    tema: 'İnşaat alanı',
    yeniKavram: 'İç içe döngü: iç döngü dış döngünün her turunda baştan sona çalışır',
    oncedenBilinen: '"… kez tekrarla" ve şekil döngüsü (2. ünite)',
    kalip: 'ic-ice',
    kazanimlar: ['MAT.4.2.6', 'MAT.4.1.5'],
    sure: '2 ders saati',
    uygunluk: 'Önce inşaat dronuyla kuleler (dış döngü kule, iç döngü küp), sonra çizgi robotuyla yan yana kareler. Blok sınırı iç içe döngü kurmaya yöneltir.',
    gorevler: ICICE_GOREVLERI,
    fissiz: {
      ad: 'Küp kuleler',
      amac: 'İç döngünün dış döngünün her turunda baştan çalıştığını gerçek küplerle görmek; toplamı çarpmayla bulmak.',
      sure: '15 dakika',
      roller: ['Bir öğrenci dron olur; masadaki karelere küp koyar.', 'Sınıf programcıdır; bir TEKRARLA kartını ötekinin içine koyar.'],
      adimlar: [
        'Masaya yan yana 4 kâğıt kare koyun; öğrencinin elinde bir kutu birim küp olsun.',
        'Tahtaya "3 kez TEKRARLA: İLERİ, (3 kez TEKRARLA: KÜP KOY)" dizilir. Sınıf önce tahmin eder: kaç küp gerekecek?',
        'Dron uygular; her kulede iç döngünün baştan başladığını sınıf sesli sayar: 1, 2, 3 … 1, 2, 3 …',
        'İLERİ kartı iç döngünün içine konur. Küpler nereye gider? Sınıf izler ve tartışır.',
        'Sayılar değiştirilir (4 kule, 2 küp). Sınıf toplamı çarpmayla bulur.',
      ],
      hazirlik: 'Birim küpler (ya da tak-çıkar yapı parçaları) ve kâğıt kareler hazırlayın. İki TEKRARLA kartının üstüne sayıları tebeşirle yazın.',
      kartlar: [
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları yazılan sayı kadar uygula. İçinde başka bir TEKRARLA olabilir.', adet: 2 },
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 1 },
        { komut: 'KÜP KOY', aciklama: 'Bulunduğun kareye bir küp koy.', adet: 1 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci iç içe döngülerle kule sıraları ve yan yana kareler kurar; iç döngünün toplam kaç kez çalıştığını çarpmayla bulur (3 × 4 = 12); bir blok yanlış döngüye konunca sonucun nasıl değiştiğini yorumlar.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "Küp kuleler" (15 dk), ardından 1–4. görevler: kule sırası, dört kule, kaç kez (tahmin et, sınıfça), yayılan küpler (hatayı bul, ikişerli).' },
        { baslik: '2. ders', metin: '5. görev (yan yana kareler) bireysel; sorudaki örüntü (4, 7, 10, 13) tahtada tartışılır. 6. görev (hatayı bul) ikişerli.' },
      ],
      yanilgilar: [
        { ad: 'İlerlemeyi iç döngüye koymak', metin: 'Dron her küpten sonra ilerler; küpler yere tek sıra yayılır ve dron boş yere küp koyar (4. görev).' },
        { ad: 'İlerlemeyi dış döngünün dışına koymak', metin: 'Robot sonraki kareye geçmez; aynı kareyi yeniden yeniden çizer. İleti eksik kalan çizgi sayısını söyler (6. görev).' },
        { ad: 'Toplamak yerine çarpmayı unutmak', metin: 'İç döngünün toplam kaç kez çalıştığını 3 + 4 = 7 sanmak; oysa 3 tur × 4 kez = 12 (3. görev).' },
      ],
      sorular: [
        'Dış döngü neyi, iç döngü neyi tekrarlıyor?',
        '5 kule, her birinde 3 küp: kaç küp gerekir? Kodda hangi sayıları değiştirirdin?',
        'Yan yana 3 kare çizilirken neden 12 değil 10 çizgi var?',
        'Her yeni kare kaç çizgi ekliyor? 10 kare olsaydı kaç çizgi olurdu?',
      ],
      celdiriciler: 'Kule görevlerinde "sağa dön" gereksizdir. Blok sınırı (en çok 4 ya da 5 blok) iç içe döngü kurmaya yöneltir; tek döngüyle yazılan uzun kod kabul edilmez.',
    },
  },
  {
    ...ORTAK,
    id: 's4-simetri',
    no: 4,
    ad: 'Simetri',
    tema: 'Okul bahçesi',
    yeniKavram: 'Doğruya göre simetri: her kare, simetri doğrusuna eşi kadar uzaktır',
    oncedenBilinen: 'Simetriyi tamamla (3. sınıf), dönüşler (1. ünite)',
    kalip: 'ayna-uzaklik',
    kazanimlar: ['MAT.4.3.8', 'MAT.4.3.9'],
    sure: '2 ders saati',
    uygunluk: 'Bahçe robotu karo boyar. Boyanacak karolar gizlidir: öğrenci simetriği simetri doğrusuna uzaklığı sayarak bulur. Yanlış karo anında hatadır.',
    gorevler: SIMETRI_GOREVLERI,
    fissiz: {
      ad: 'Ayna karoları',
      amac: 'Simetrik karenin simetri doğrusuna aynı uzaklıkta olduğunu kareli zeminde bulmak; yansıtmayı kaydırmadan ayırmak.',
      sure: '15 dakika',
      roller: ['Bir öğrenci robot olur; kareli zeminde yürür ve renkli kâğıt koyarak "boyar".', 'Sınıf programcıdır; simetrik kareleri önce sayarak bulur.'],
      adimlar: [
        'Yere 6 × 3 karelik bir ızgara bantlayın; ortasına bir çubukla simetri doğrusunu koyun.',
        'Doğrunun soluna birkaç renkli kâğıt koyarak bir bayrak yapın.',
        'Sınıf her kâğıdın doğrudan kaç kare uzak olduğunu sayar; robotun sağ yanda boyayacağı kareleri bulur ve programı kurar.',
        'Robot uygular. Doğrunun üstüne bir ayna tutun: yansıma boyanan karelerle örtüşüyor mu?',
        'Bayrağın aynısı sağa kaydırılarak konur. Ayna tutulur: örtüşüyor mu? Sınıf kaydırma ile yansıtma farkını tartışır.',
      ],
      hazirlik: 'Bant, bir çubuk ya da ip (simetri doğrusu), renkli kâğıt kareler ve küçük bir ayna hazırlayın.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir kare ileri git.', adet: 6 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 2 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 2 },
        { komut: 'BOYA', aciklama: 'Bulunduğun kareye renkli kâğıt koy.', adet: 4 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir şeklin doğruya göre simetriğini karo boyayarak kurar: her karenin simetri doğrusuna uzaklığını korur, dikey ve yatay doğrulara göre çalışır ve simetriyi öteleme (kaydırma) ile karıştırmaz.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "Ayna karoları" (15 dk), ardından 1–3. görevler: tek sıra, iki sıra, kaydırılmış kopya (hatayı bul, ikişerli).' },
        { baslik: '2. ders', metin: '4. görev (yatay ayna) bireysel, 5. görev (yanlış uzaklık) ikişerli. Ders "kaç simetri doğrusu var?" sorusu ve harf örnekleriyle kapanır.' },
      ],
      yanilgilar: [
        { ad: 'Simetriyi öteleme sanmak', metin: 'Şeklin aynısını öbür yana kaydırmak. Simetrik şekil ters döner: çizgiden uzak kenar yine çizgiden uzak kalır (3. görev).' },
        { ad: 'Uzaklığı korumamak', metin: 'Simetriği çizginin hemen yanına boyamak; oysa her kare çizgiye eşi kadar uzaktır (5. görev).' },
        { ad: 'Yalnız bir sırayı düşünmek', metin: 'Birden çok sıralı şekilde yalnız bir sıranın simetriğini boyamak. İleti boyanmayan kare sayısını söyler (2. görev).' },
      ],
      sorular: [
        'Bir karo çizgiye 2 kare uzaksa simetriği nerede olur?',
        'Kaydırma ile yansıtma arasındaki fark ne?',
        'A, B, F, H, M harflerinden hangilerinin simetri doğrusu var? Kaç tane?',
        'Aynayı simetri doğrusunun üstüne koyunca ne görüyorsunuz?',
      ],
      celdiriciler: 'Bu ünitede çeldirici blok yoktur; hedef karolar gizlidir. Öğrenci simetriği ancak uzaklığı sayarak bulur; yanlış karo anında durdurulur.',
    },
  },
];
