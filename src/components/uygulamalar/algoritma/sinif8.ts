/**
 * Algoritma Laboratuvarı — 8. sınıf (Araştırma adası): dört ünite.
 *
 * Kod paneli 7. sınıftaki gibi üç gösterim sunar (Bloklar · Sözde kod · Akış şeması). Çizgi robotu
 * koordinat düzleminde çalışır: y yukarı doğru artar, en alttaki sıra y = 0; x ve y ölçümleri
 * robotun koordinatlarıdır. Kendi komutunu tanımlama (tanımla ŞEKİL / ŞEKİL) bu sınıfta gelir.
 * Başarı cümlelerindeki sayılar izden hesaplanır. Kazanımlar TYMM listesindendir.
 *
 *   1. Koordinat düzlemi   noktaya git, işaretle; x ve y ölçümleri; (a, b) değişkenleri   MAT.8.2.1
 *   2. Doğrusal fonksiyon  y = x, 2x, 2x + 1, azalan doğru; "1 sağa, m yukarı" deseni     MAT.8.2.2 · 8.2.4 · 8.2.3
 *   3. Öteleme ve yansıma  tanımla ŞEKİL: şekli ötele; AYNA komutunda dönüşler yer değiştirir MAT.8.5.1 · 8.5.2 · 8.5.3
 *   4. Üslü artış          kat ← kat × 2: kuleler 1, 2, 4, 8; 2¹⁰ = 1024                     MAT.8.1.1
 */
import { ifadeKur, programKur, sayiMetni, type BlokSablonu, type EylemTuru, type KisaBlok } from './program';
import { insaatAlani, koordinatlar, saha, type DunyaTanimi, type Hedef } from './dunya';
import { izOzeti, type Iz } from './yorumlayici';
import { noktaMetni } from './degerlendirme';
import type { Gorev, Unite } from './gorev';

const E = (eylem: EylemTuru): BlokSablonu => ({ tur: 'eylem', eylem });
const ILERI = E('ileri');
const SAGA = E('sagaDon');
const SOLA = E('solaDon');
const ISARETLE = E('isaretle');
const KOY = E('koy');
const KALDIR = E('kalemKaldir');
const INDIR = E('kalemIndir');
const TEKRAR: BlokSablonu = { tur: 'tekrarlaKez', kez: 2 };

const k = (liste: KisaBlok[], onek: string) => programKur(liste, onek);
const ORTAK = { sinif: 8, kademe: 'Araştırma adası', gorunum: 'ifade' as const, sesliYonerge: false };

/** Programın bitişindeki değişken değeri (tanımsızsa 0) */
const deger = (iz: Iz, ad: string) => izOzeti(iz).degiskenler[ad] ?? 0;

// ---------------------------------------------------------------------------
// Koordinat düzlemi: nokta ağı (y yukarı)
// ---------------------------------------------------------------------------

type Nokta = readonly [number, number];

/**
 * Koordinat düzlemi satırları: noktalar (x, y), y aşağıdan yukarı (en alt sıra y = 0).
 * Hazır ve çizilecek yollar birim adımlarla işlenir; işaretlenecek noktalar "o".
 */
function duzlemKur(en: number, boy: number, bas: Nokta, o: { noktalar?: Nokta[]; hazir?: Nokta[][]; cizilecek?: Nokta[][] } = {}): string[] {
  const s: string[][] = Array.from({ length: 2 * boy - 1 }, (_, r) => Array.from({ length: 2 * en - 1 }, (_, c) => (r % 2 === 0 && c % 2 === 0 ? '.' : ' ')));
  const satir = (y: number) => boy - 1 - y;
  const icinde = ([x, y]: Nokta) => {
    if (x < 0 || y < 0 || x >= en || y >= boy) throw new Error(`Düzlemin dışında: (${x}, ${y})`);
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

/** İşaretlenen noktaların koordinatları, işaretlenme sırasıyla */
function isaretlenenler(iz: Iz): { x: number; y: number }[] {
  const g = iz.son.izgara;
  return iz.son.noktalar.map((h) => koordinatlar(g, h % g.en, Math.floor(h / g.en)));
}
const sonKonum = (iz: Iz) => koordinatlar(iz.son.izgara, iz.son.x, iz.son.y);
const noktaListesi = (p: { x: number; y: number }[]) => p.map(noktaMetni).join(', ');

// ---------------------------------------------------------------------------
// 1. Koordinat düzlemi
// ---------------------------------------------------------------------------

const NOKTAYI_KOY: Hedef = { noktalariKoy: true, cikistaBitir: false };
const NOKTA_ARACLARI: BlokSablonu[] = [ILERI, SAGA, SOLA, ISARETLE, TEKRAR];
const AB_ARACLARI: BlokSablonu[] = [ILERI, SAGA, SOLA, ISARETLE, { tur: 'tekrarlaKez', kez: 1, kezIfade: ifadeKur('a') }];

const KOORD_1 = saha('s8-duzlem-32', '(3, 2) noktası', duzlemKur(7, 5, [0, 0], { noktalar: [[3, 2]] }), { koordinat: true, sinar: 'Önce x, sonra y' });
const KOORD_2 = saha('s8-duzlem-uc', 'Üç nokta', duzlemKur(7, 6, [0, 0], { noktalar: [[2, 1], [2, 4], [5, 4]] }), { koordinat: true, sinar: 'Noktadan noktaya' });
const KOORD_3 = saha('s8-duzlem-kayit', 'Konumu kaydet', duzlemKur(8, 6, [0, 0], { noktalar: [[3, 4]] }), { koordinat: true, sinar: 'x ve y ölçümleri' });
const KOORD_4 = saha('s8-duzlem-ab', '(a, b) noktası', duzlemKur(7, 5, [0, 0], { noktalar: [[3, 2]] }), { koordinat: true, degiskenler: { a: 3, b: 2 }, sinar: 'x ile y yer değiştirirse' });
const KOORD_5 = saha('s8-duzlem-ab2', 'Başka bir (a, b)', duzlemKur(7, 6, [0, 0], { noktalar: [[5, 4]] }), { koordinat: true, degiskenler: { a: 5, b: 4 }, sinar: 'Aynı kod, başka nokta' });

const abKodu = (ilk: string, ikinci: string, onek: string) => k([['kez', ilk, ['ileri']], 'solaDon', ['kez', ikinci, ['ileri']], 'isaretle'], onek);
const KAYIT_YOLU: KisaBlok[] = [['kez', 5, ['ileri']], 'solaDon', ['kez', 4, ['ileri']], 'solaDon', ['kez', 2, ['ileri']], 'isaretle'];

const KOORDINAT_GOREVLERI: Gorev[] = [
  {
    id: 's8-koordinat-1',
    tur: 'yaz',
    baslik: '(3, 2) noktası',
    yonerge: 'Robot (0, 0) noktasında, x ekseni yönüne bakıyor. (3, 2) noktasına git ve nokta koy.',
    dunya: KOORD_1,
    hedef: NOKTAYI_KOY,
    bitkiAdi: 'bitki',
    aracKutusu: NOKTA_ARACLARI,
    baslangic: 'bos',
    cozum: k([['kez', 3, ['ileri']], 'solaDon', ['kez', 2, ['ileri']], 'isaretle'], 's8k1-'),
    ipuclari: [
      '(3, 2): ilk sayı x, ikinci sayı y. x ekseni boyunca kaç birim, y ekseni boyunca kaç birim gideceksin?',
      'x ekseni boyunca 3 birim git, sola dön (yukarı bak), 2 birim git, nokta koy.',
    ],
    basari: (iz) => {
      const p = sonKonum(iz);
      return `Oldu! Robot x ekseni boyunca ${p.x} birim, y ekseni boyunca ${p.y} birim gitti: ${noktaMetni(p)} noktası.`;
    },
    soru: { metin: '(3, 2) noktası x eksenine kaç birim uzakta?', birim: 'birim', cevap: (iz) => sonKonum(iz).y, sonrasi: 'Noktanın x eksenine uzaklığı ordinatıdır: 2.' },
    kazanimlar: ['MAT.8.2.1'],
  },
  {
    id: 's8-koordinat-2',
    tur: 'kurgu',
    baslik: 'Üç nokta',
    yonerge: 'Üç nokta var: (2, 1), (2, 4) ve (5, 4). Hepsine sırayla nokta koy.',
    dunya: KOORD_2,
    hedef: NOKTAYI_KOY,
    bitkiAdi: 'bitki',
    aracKutusu: NOKTA_ARACLARI,
    baslangic: 'onceki',
    cozum: k([['kez', 2, ['ileri']], 'solaDon', 'ileri', 'isaretle', ['kez', 3, ['ileri']], 'isaretle', 'sagaDon', ['kez', 3, ['ileri']], 'isaretle'], 's8k2-'),
    ipuclari: ['Bir noktadan ötekine giderken hangi koordinat değişiyor: x mi, y mi?', '(2, 1)’den (2, 4)’e x aynı kalır, y 3 artar: 3 birim yukarı git.'],
    basari: (iz) => `Oldu! İşaretlenen noktalar: ${noktaListesi(isaretlenenler(iz))}. Apsisi aynı noktalar dikey, ordinatı aynı noktalar yatay bir doğru üstündedir.`,
    soru: {
      metin: '(2, 4) ile (5, 4) noktaları arasında kaç birim var?',
      birim: 'birim',
      cevap: (iz) => {
        const p = isaretlenenler(iz);
        return Math.abs(p[2].x - p[1].x);
      },
      sonrasi: 'Ordinatlar aynı: uzaklık apsislerin farkıdır, 5 − 2 = 3.',
    },
    kazanimlar: ['MAT.8.2.1'],
  },
  {
    id: 's8-koordinat-3',
    tur: 'yaz',
    baslik: 'Konumu kaydet',
    yonerge: 'Kod robotu bir noktaya götürüp işaretliyor. Noktanın koordinatlarını kaydet: apsis ← x ve ordinat ← y bloklarını doğru yere koy.',
    dunya: KOORD_3,
    hedef: { ...NOKTAYI_KOY, degiskenler: { apsis: 3, ordinat: 4 } },
    bitkiAdi: 'bitki',
    aracKutusu: [...NOKTA_ARACLARI, { tur: 'ata', degisken: 'apsis', ifade: ifadeKur('@x') }, { tur: 'ata', degisken: 'ordinat', ifade: ifadeKur('@y') }],
    baslangic: k(KAYIT_YOLU, 's8k3b-'),
    cozum: k([...KAYIT_YOLU, ['ata', 'apsis', '@x'], ['ata', 'ordinat', '@y']], 's8k3-'),
    degiskenler: ['apsis', 'ordinat'],
    olcumler: ['x', 'y'],
    ipuclari: [
      'x ve y ölçümleri robotun o anki koordinatlarıdır. Blok nerede çalışırsa oranın koordinatını okur.',
      'İki atama bloğunu robot noktaya vardıktan sonraya, kodun sonuna koy.',
    ],
    basari: (iz) => `Oldu! Robot (${deger(iz, 'apsis')}, ${deger(iz, 'ordinat')}) noktasında: apsis ${deger(iz, 'apsis')}, ordinat ${deger(iz, 'ordinat')}.`,
    soru: {
      metin: 'Robot ızgara üstünden (0, 0) noktasına en az kaç birimde döner?',
      birim: 'birim',
      cevap: (iz) => deger(iz, 'apsis') + deger(iz, 'ordinat'),
      sonrasi: '3 birim sola ve 4 birim aşağı: 3 + 4 = 7.',
    },
    kazanimlar: ['MAT.8.2.1'],
  },
  {
    id: 's8-koordinat-4',
    tur: 'hata',
    baslik: 'Sıralı ikili',
    yonerge: 'Robot (a, b) noktasını işaretleyecek; a = 3, b = 2. Ama yanlış noktaya gidiyor. Hatayı bul, düzelt.',
    dunya: KOORD_4,
    hedef: NOKTAYI_KOY,
    bitkiAdi: 'bitki',
    aracKutusu: AB_ARACLARI,
    baslangic: abKodu('b', 'a', 's8k4h-'),
    cozum: abKodu('a', 'b', 's8k4-'),
    degiskenler: ['a', 'b'],
    ipuclari: ['Robot hangi noktayı işaretledi? (2, 3) ile (3, 2) aynı nokta mı?', 'Sıralı ikilide ilk sayı apsis (x), ikincisi ordinattır (y). Tekrar sayılarını yer değiştir.'],
    basari: (iz) => {
      const p = sonKonum(iz);
      return `Buldun! (a, b) = ${noktaMetni(p)}: önce a birim x ekseni boyunca, sonra b birim y ekseni boyunca.`;
    },
    kazanimlar: ['MAT.8.2.1'],
  },
  {
    id: 's8-koordinat-5',
    tur: 'kurgu',
    genelleme: true,
    baslik: 'Her (a, b) için',
    yonerge: 'Şimdi a = 5, b = 4. Kodu değiştirmeden çalıştır: robot (a, b) noktasına yine gidiyor mu?',
    dunya: KOORD_5,
    hedef: NOKTAYI_KOY,
    bitkiAdi: 'bitki',
    aracKutusu: AB_ARACLARI,
    baslangic: 'onceki',
    cozum: abKodu('a', 'b', 's8k5-'),
    degiskenler: ['a', 'b'],
    ipuclari: ['Kodda sayı yok, a ve b var: değişkenler değişince robotun gideceği yer de değişir.'],
    basari: (iz) => {
      const p = sonKonum(iz);
      return `Oldu! Aynı kod bu kez ${noktaMetni(p)} noktasına gitti: a = ${deger(iz, 'a')}, b = ${deger(iz, 'b')}. Kod her (a, b) için çalışır.`;
    },
    kazanimlar: ['MAT.8.2.1'],
  },
];

// ---------------------------------------------------------------------------
// 2. Doğrusal fonksiyon
// ---------------------------------------------------------------------------

/** y = m·x + b doğrusunun verilen x değerlerindeki noktaları */
const dogruNoktalari = (m: number, b: number, xler: number[]): Nokta[] => xler.map((x) => [x, m * x + b] as const);
const dogru = (id: string, ad: string, m: number, b: number, xler: number[]) =>
  saha(id, ad, duzlemKur(8, 8, [0, 0], { noktalar: dogruNoktalari(m, b, xler) }), { koordinat: true, hedefGizli: true, sinar: `x = ${xler.join(', ')}` });

/** İşaretlenen ilk iki noktadan eğim ve y eksenini kestiği yer */
function dogruKurali(iz: Iz): { m: number; b: number } {
  const p = [...isaretlenenler(iz)].sort((a, c) => a.x - c.x);
  const m = (p[1].y - p[0].y) / (p[1].x - p[0].x);
  return { m, b: p[0].y - m * p[0].x };
}
/** "y = 2x + 1", "y = x", "y = −2x + 6" */
function dogruYazisi(m: number, b: number): string {
  const mx = m === 1 ? 'x' : m === -1 ? '−x' : `${sayiMetni(m)}x`;
  const bt = b === 0 ? '' : b > 0 ? ` + ${sayiMetni(b)}` : ` − ${sayiMetni(-b)}`;
  return `y = ${mx}${bt}`;
}

/** 1 sağa, m yukarı: nokta koy, ileri, sola dön, m kez ileri, sağa dön */
const yukariAdim = (n: number, m: number): KisaBlok => ['kez', n, ['isaretle', 'ileri', 'solaDon', ['kez', m, ['ileri']], 'sagaDon']];
/** Başlangıçta b birim yukarı çık (doğruyu y ekseninde kestiği yere) */
const yukariCik = (b: number): KisaBlok[] => ['solaDon', ['kez', b, ['ileri']], 'sagaDon'];

const DOGRU_1 = dogru('s8-dogru-x', 'y = x', 1, 0, [0, 1, 2, 3, 4, 5]);
const DOGRU_2 = dogru('s8-dogru-2x', 'y = 2x', 2, 0, [0, 1, 2, 3]);
const DOGRU_3 = dogru('s8-dogru-2x1', 'y = 2x + 1', 2, 1, [0, 1, 2, 3]);
const DOGRU_4 = dogru('s8-dogru-x2', 'y = x + 2', 1, 2, [0, 1, 2, 3, 4, 5]);
const DOGRU_5 = dogru('s8-dogru-azalan', 'y = 6 − 2x', -2, 6, [0, 1, 2, 3]);
const DOGRU_6 = dogru('s8-dogru-3x1', 'y = 3x + 1', 3, 1, [0, 1, 2]);

const DOGRU_ARACLARI: BlokSablonu[] = [ILERI, SAGA, SOLA, ISARETLE, TEKRAR];

const DOGRUSAL_GOREVLERI: Gorev[] = [
  {
    id: 's8-dogrusal-1',
    tur: 'yaz',
    baslik: 'y = x',
    yonerge: 'Noktalar gizli. y = x doğrusunun x = 0, 1, 2, 3, 4, 5 için noktalarını hesapla ve işaretle. Hangi adım deseni tekrar ediyor?',
    dunya: DOGRU_1,
    hedef: NOKTAYI_KOY,
    bitkiAdi: 'bitki',
    aracKutusu: DOGRU_ARACLARI,
    baslangic: 'bos',
    cozum: k([['kez', 5, ['isaretle', 'ileri', 'solaDon', 'ileri', 'sagaDon']], 'isaretle'], 's8d1-'),
    ipuclari: [
      'x = 0 iken y kaç? x = 1 iken? Noktaları sırayla yaz: (0, 0), (1, 1) …',
      'Bir noktadan sonrakine: 1 birim sağa, 1 birim yukarı. Bu deseni tekrarla.',
      '5 kez tekrarla: nokta koy, ileri git, sola dön, ileri git, sağa dön. Sonunda bir nokta daha koy.',
    ],
    basari: (iz) => {
      const d = dogruKurali(iz);
      return `Oldu! ${isaretlenenler(iz).length} nokta: x 1 artınca y ${sayiMetni(d.m)} artıyor. ${dogruYazisi(d.m, d.b)} doğrusunun eğimi ${sayiMetni(d.m)}.`;
    },
    kazanimlar: ['MAT.8.2.2', 'MAT.8.2.4'],
  },
  {
    id: 's8-dogrusal-2',
    tur: 'kurgu',
    baslik: 'y = 2x',
    yonerge: 'Şimdi y = 2x. x = 0, 1, 2, 3 için noktaları hesapla ve işaretle. Adım deseni nasıl değişir?',
    dunya: DOGRU_2,
    hedef: NOKTAYI_KOY,
    bitkiAdi: 'bitki',
    aracKutusu: DOGRU_ARACLARI,
    baslangic: 'onceki',
    cozum: k([yukariAdim(3, 2), 'isaretle'], 's8d2-'),
    ipuclari: ['x = 1 iken y = 2 × 1 = 2. Bir noktadan sonrakine kaç birim yukarı çıkılıyor?', 'Yukarı çıkan "ileri git" bloğunu "2 kez tekrarla" içine al; dış tekrar 3 olsun.'],
    basari: (iz) => {
      const d = dogruKurali(iz);
      return `Oldu! x 1 artınca y ${sayiMetni(d.m)} artıyor: ${dogruYazisi(d.m, d.b)} doğrusunun eğimi ${sayiMetni(d.m)}. Bu doğru y = x’ten daha dik.`;
    },
    soru: { metin: 'y = 2x doğrusunda x = 7 iken y kaç?', birim: '', cevap: (iz) => dogruKurali(iz).m * 7 + dogruKurali(iz).b, sonrasi: 'y = 2 × 7 = 14.' },
    kazanimlar: ['MAT.8.2.2', 'MAT.8.2.3'],
  },
  {
    id: 's8-dogrusal-3',
    tur: 'kurgu',
    baslik: 'y = 2x + 1',
    yonerge: 'y = 2x + 1 doğrusu (0, 1) noktasından başlar. x = 0, 1, 2, 3 için noktaları işaretle.',
    dunya: DOGRU_3,
    hedef: NOKTAYI_KOY,
    bitkiAdi: 'bitki',
    aracKutusu: DOGRU_ARACLARI,
    baslangic: 'onceki',
    cozum: k([...yukariCik(1), yukariAdim(3, 2), 'isaretle'], 's8d3-'),
    ipuclari: ['x = 0 iken y = 2 × 0 + 1 = 1. İlk nokta (0, 0) değil.', 'Kodun başında 1 birim yukarı çık, sonra aynı deseni sürdür.'],
    basari: (iz) => {
      const d = dogruKurali(iz);
      return `Oldu! Eğim yine ${sayiMetni(d.m)}, ama doğru y eksenini (0, ${sayiMetni(d.b)}) noktasında kesiyor. y = 2x ile ${dogruYazisi(d.m, d.b)} paralel.`;
    },
    soru: { metin: 'Aynı x için y = 2x + 1, y = 2x’ten kaç fazla?', birim: '', cevap: (iz) => dogruKurali(iz).b, sonrasi: 'Her x için 1 fazla: iki doğru paraleldir, hiç kesişmez.' },
    kazanimlar: ['MAT.8.2.2', 'MAT.8.2.3'],
  },
  {
    id: 's8-dogrusal-4',
    tur: 'hata',
    baslik: 'Eğim mi, başlangıç mı?',
    yonerge: 'Bu kod y = x + 2 doğrusunun noktalarını işaretleyecekti ama ikinci noktada yanılıyor. Hatayı bul, düzelt.',
    dunya: DOGRU_4,
    hedef: NOKTAYI_KOY,
    bitkiAdi: 'bitki',
    aracKutusu: DOGRU_ARACLARI,
    baslangic: k([...yukariCik(2), yukariAdim(5, 2), 'isaretle'], 's8d4h-'),
    cozum: k([...yukariCik(2), yukariAdim(5, 1), 'isaretle'], 's8d4-'),
    ipuclari: [
      'x = 1 iken y = 1 + 2 = 3 olmalı. Robot kaça çıktı?',
      '+ 2 doğrunun y eksenini kestiği yeri söyler; eğim x’in katsayısıdır: 1.',
      'Döngünün içindeki "2 kez tekrarla [ileri git]" bloğunu 1 yap; baştaki 2 kalsın.',
    ],
    basari: (iz) => {
      const d = dogruKurali(iz);
      return `Buldun! ${dogruYazisi(d.m, d.b)} doğrusunda eğim ${sayiMetni(d.m)}: her adımda ${sayiMetni(d.m)} birim yukarı. ${sayiMetni(d.b)} yalnız başlangıç yüksekliği: (0, ${sayiMetni(d.b)}).`;
    },
    kazanimlar: ['MAT.8.2.2', 'MAT.8.2.4'],
  },
  {
    id: 's8-dogrusal-5',
    tur: 'kurgu',
    baslik: 'Azalan doğru',
    yonerge: 'y = 6 − 2x azalan bir doğru: x artınca y azalır. x = 0, 1, 2, 3 için noktaları hesapla ve işaretle.',
    dunya: DOGRU_5,
    hedef: NOKTAYI_KOY,
    bitkiAdi: 'bitki',
    aracKutusu: DOGRU_ARACLARI,
    baslangic: 'onceki',
    cozum: k([...yukariCik(6), ['kez', 3, ['isaretle', 'ileri', 'sagaDon', ['kez', 2, ['ileri']], 'solaDon']], 'isaretle'], 's8d5-'),
    ipuclari: ['x = 0 iken y = 6: önce 6 birim yukarı çık.', 'Her adımda 1 birim sağa, 2 birim aşağı. Aşağı inmek için sağa dön; inince sola dönüp yine x ekseni yönüne bak.'],
    basari: (iz) => {
      const d = dogruKurali(iz);
      return `Oldu! x 1 artınca y ${sayiMetni(-d.m)} azalıyor: eğim ${sayiMetni(d.m)}. Doğru x eksenini (${sayiMetni(-d.b / d.m)}, 0) noktasında kesiyor.`;
    },
    soru: { metin: 'Doğru x eksenini hangi x değerinde keser?', birim: '', cevap: (iz) => -dogruKurali(iz).b / dogruKurali(iz).m, sonrasi: '6 − 2x = 0 ise x = 3.' },
    kazanimlar: ['MAT.8.2.2', 'MAT.8.2.3'],
  },
  {
    id: 's8-dogrusal-6',
    tur: 'tahmin',
    baslik: 'x = 10 iken',
    yonerge: 'Kodu oku: robot hangi doğrunun noktalarını işaretliyor? Kural sürerse x = 10 iken y kaç olur? Önce tahmin et, sonra çalıştır.',
    ilkGorunum: 'sozde',
    dunya: DOGRU_6,
    hedef: NOKTAYI_KOY,
    bitkiAdi: 'bitki',
    aracKutusu: DOGRU_ARACLARI,
    baslangic: k([...yukariCik(1), yukariAdim(2, 3), 'isaretle'], 's8d6-'),
    cozum: k([...yukariCik(1), yukariAdim(2, 3), 'isaretle'], 's8d6-'),
    ipuclari: ['Robot başta kaç birim yukarı çıkıyor? Her adımda kaç birim yukarı?', 'Başta 1, her adımda 3: y = 3x + 1.'],
    tahmin: {
      metin: 'Kural sürerse x = 10 iken y kaç olur?',
      birim: '',
      cevap: (iz) => dogruKurali(iz).m * 10 + dogruKurali(iz).b,
      sonrasi: 'y = 3 × 10 + 1 = 31.',
      yonlendirme: 'Önce kuralı bul: başlangıç yüksekliği ve her adımdaki artış.',
    },
    basari: (iz) => {
      const d = dogruKurali(iz);
      return `Oldu! Kural ${dogruYazisi(d.m, d.b)}: x = 10 iken y = ${sayiMetni(d.m)} × 10 + ${sayiMetni(d.b)} = ${sayiMetni(d.m * 10 + d.b)}.`;
    },
    kazanimlar: ['MAT.8.2.4', 'MAT.8.2.2'],
  },
];

// ---------------------------------------------------------------------------
// 3. Öteleme ve yansıma
// ---------------------------------------------------------------------------

/** 2 × 1 dikdörtgen: sol alt köşeden, x ekseni yönüne bakarak */
const dikdortgen = (x: number, y: number): Nokta[] => [[x, y], [x + 2, y], [x + 2, y + 1], [x, y + 1], [x, y]];
/** Bayrak: direk (x, y)’den 2 birim; kare direğin sağında (yon 1), solunda (yon −1); asagi: direk aşağı iner */
function bayrak(x: number, y: number, yan: 1 | -1, asagi = false): Nokta[][] {
  const dy = asagi ? -1 : 1;
  return [
    [[x, y], [x, y + 2 * dy]],
    [[x, y + 2 * dy], [x + yan, y + 2 * dy], [x + yan, y + dy], [x, y + dy]],
  ];
}

const SEKIL_DIKDORTGEN: KisaBlok = ['tanim', 'ŞEKİL', [['kez', 2, ['ileri', 'ileri', 'solaDon', 'ileri', 'solaDon']]]];
/** Bayrak komutu direğin dibinden başlar ve oraya, aynı yöne bakarak döner */
const SEKIL_BAYRAK: KisaBlok = ['tanim', 'ŞEKİL', [['kez', 2, ['ileri']], ['kez', 3, ['sagaDon', 'ileri']], 'solaDon', 'ileri', ['kez', 2, ['sagaDon']]]];
const AYNA_BAYRAK: KisaBlok = ['tanim', 'AYNA', [['kez', 2, ['ileri']], ['kez', 3, ['solaDon', 'ileri']], 'sagaDon', 'ileri', ['kez', 2, ['solaDon']]]];
/** Hata: AYNA, ŞEKİL’in kopyası; dönüşler değişmemiş */
const AYNA_KOPYA: KisaBlok = ['tanim', 'AYNA', [['kez', 2, ['ileri']], ['kez', 3, ['sagaDon', 'ileri']], 'solaDon', 'ileri', ['kez', 2, ['sagaDon']]]];

const OTELE_1 = saha('s8-otele-4', 'Dikdörtgenler', duzlemKur(9, 5, [1, 1], { cizilecek: [dikdortgen(1, 1), dikdortgen(5, 1)] }), { koordinat: true, sinar: '(x, y) → (x + 4, y)' });
const OTELE_2 = saha('s8-otele-32', 'Gizli görüntü', duzlemKur(9, 5, [1, 1], { hazir: [dikdortgen(1, 1)], cizilecek: [dikdortgen(4, 3)] }), {
  koordinat: true,
  hedefGizli: true,
  sinar: '(x, y) → (x + 3, y + 2)',
});
const OTELE_3 = saha('s8-otele-5', 'İki dikdörtgen', duzlemKur(9, 5, [0, 1], { cizilecek: [dikdortgen(0, 1), dikdortgen(5, 1)] }), { koordinat: true, sinar: 'Çağrı nerede?' });
const AYNA_DIKEY = saha('s8-ayna-dikey', 'Bayrak ve aynası', duzlemKur(9, 5, [2, 1], { cizilecek: [...bayrak(2, 1, 1), ...bayrak(6, 1, -1)] }), {
  koordinat: true,
  yon: 3,
  eksen: { yon: 'dikey', k: 4 },
  sinar: 'x = 4 doğrusuna göre yansıma',
});
const AYNA_YATAY = saha('s8-ayna-yatay', 'Yatay ayna', duzlemKur(7, 8, [2, 4], { hazir: bayrak(2, 4, 1), cizilecek: bayrak(2, 3, 1, true) }), {
  koordinat: true,
  yon: 3,
  eksen: { yon: 'yatay', k: 3.5 },
  hedefGizli: true,
  sinar: 'y = 3,5 doğrusuna göre yansıma',
});

const CIZIMI_TAMAMLA: Hedef = { cizimiTamamla: true, cikistaBitir: false };
const OTELE_ARACLARI: BlokSablonu[] = [ILERI, SAGA, SOLA, KALDIR, INDIR, TEKRAR, { tur: 'tanim', ad: 'ŞEKİL' }, { tur: 'cagir', ad: 'ŞEKİL' }];
const AYNA_ARACLARI: BlokSablonu[] = [...OTELE_ARACLARI, { tur: 'tanim', ad: 'AYNA' }, { tur: 'cagir', ad: 'AYNA' }];

/** Komutun çağrıldığı noktalar (koordinat), sırayla */
const cagriYerleri = (iz: Iz, ad: string) => iz.adimlar.filter((a) => a.tur === 'cagri' && a.komut === ad).map((a) => koordinatlar(a.durum.izgara, a.durum.x, a.durum.y));
const terim = (v: string, d: number) => (d === 0 ? v : d > 0 ? `${v} + ${d}` : `${v} − ${-d}`);
function otelemeCumlesi(iz: Iz): string {
  const [p, q] = cagriYerleri(iz, 'ŞEKİL');
  const a = q.x - p.x;
  const b = q.y - p.y;
  const yon = [a ? `${Math.abs(a)} birim ${a > 0 ? 'sağa' : 'sola'}` : '', b ? `${Math.abs(b)} birim ${b > 0 ? 'yukarı' : 'aşağı'}` : ''].filter(Boolean).join(', ');
  return `ŞEKİL ${noktaMetni(p)} ve ${noktaMetni(q)} noktalarında çağrıldı: her nokta ${yon} ötelendi, (x, y) → (${terim('x', a)}, ${terim('y', b)}).`;
}
const oteleme = (iz: Iz) => {
  const [p, q] = cagriYerleri(iz, 'ŞEKİL');
  return { a: q.x - p.x, b: q.y - p.y };
};

const OTELEME_GOREVLERI: Gorev[] = [
  {
    id: 's8-oteleme-1',
    tur: 'yaz',
    baslik: 'Bir kez tanımla',
    yonerge: 'İki eş dikdörtgen çiz. Dikdörtgeni bir kez ŞEKİL komutu olarak tanımla; sonra iki yerde çağır. Arada kalemi kaldırıp git.',
    dunya: OTELE_1,
    hedef: CIZIMI_TAMAMLA,
    bitkiAdi: 'bitki',
    aracKutusu: OTELE_ARACLARI,
    baslangic: 'bos',
    cozum: k([SEKIL_DIKDORTGEN, ['cagir', 'ŞEKİL'], 'kalemKaldir', ['kez', 4, ['ileri']], 'kalemIndir', ['cagir', 'ŞEKİL']], 's8o1-'),
    ipuclari: [
      'Dikdörtgeni çizen parçayı "ŞEKİL komutu" bloğunun içine koy. Robot dikdörtgeni bitirince başladığı yere dönmeli.',
      'Tanım kendiliğinden çalışmaz; "ŞEKİL" bloğuyla çağır.',
      'İlk çağrıdan sonra kalemi kaldır, 4 birim ileri git, kalemi indir, yeniden çağır.',
    ],
    basari: (iz) => `Oldu! ${otelemeCumlesi(iz)}`,
    soru: {
      metin: 'Dikdörtgenin (3, 2) köşesi ötelenince hangi noktaya gider? Apsisini yaz.',
      birim: '',
      cevap: (iz) => 3 + oteleme(iz).a,
      sonrasi: '(3, 2) → (3 + 4, 2) = (7, 2).',
    },
    kazanimlar: ['MAT.8.5.1'],
  },
  {
    id: 's8-oteleme-2',
    tur: 'kurgu',
    baslik: 'Sağa ve yukarı',
    yonerge: 'Dikdörtgeni 3 birim sağa, 2 birim yukarı ötele. Görüntü gizli: nereye çizileceğini koordinatlarla bul.',
    dunya: OTELE_2,
    hedef: CIZIMI_TAMAMLA,
    bitkiAdi: 'bitki',
    aracKutusu: OTELE_ARACLARI,
    baslangic: 'onceki',
    cozum: k([SEKIL_DIKDORTGEN, ['cagir', 'ŞEKİL'], 'kalemKaldir', ['kez', 3, ['ileri']], 'solaDon', ['kez', 2, ['ileri']], 'sagaDon', 'kalemIndir', ['cagir', 'ŞEKİL']], 's8o2-'),
    ipuclari: ['(x, y) → (x + 3, y + 2): (1, 1) köşesi hangi noktaya gider?', 'Kalem kalkıkken 3 birim sağa git, sola dön, 2 birim yukarı git, sağa dön; ŞEKİL’i yine x ekseni yönüne bakarak çağır.'],
    basari: (iz) => `Oldu! ${otelemeCumlesi(iz)}`,
    soru: { metin: '(1, 1) köşesinin görüntüsünün ordinatı kaç?', birim: '', cevap: (iz) => 1 + oteleme(iz).b, sonrasi: '(1, 1) → (4, 3): ordinat 2 arttı.' },
    kazanimlar: ['MAT.8.5.1', 'MAT.8.5.2'],
  },
  {
    id: 's8-oteleme-3',
    tur: 'hata',
    baslik: 'Aynı yerde iki kez',
    yonerge: 'Kod iki dikdörtgen çizecekti ama yalnız biri çiziliyor. Kodu izle: ŞEKİL nerede çağrılıyor? Hatayı bul, düzelt.',
    dunya: OTELE_3,
    hedef: CIZIMI_TAMAMLA,
    bitkiAdi: 'bitki',
    aracKutusu: OTELE_ARACLARI,
    baslangic: k([SEKIL_DIKDORTGEN, ['cagir', 'ŞEKİL'], ['cagir', 'ŞEKİL'], 'kalemKaldir', ['kez', 5, ['ileri']], 'kalemIndir'], 's8o3h-'),
    cozum: k([SEKIL_DIKDORTGEN, ['cagir', 'ŞEKİL'], 'kalemKaldir', ['kez', 5, ['ileri']], 'kalemIndir', ['cagir', 'ŞEKİL']], 's8o3-'),
    ipuclari: ['İki çağrı arasında robot yer değiştirdi mi?', 'Komut robotu kendiliğinden başka yere götürmez. İkinci çağrıyı gidişten sonraya taşı.'],
    basari: (iz) => `Buldun! ${otelemeCumlesi(iz)}`,
    kazanimlar: ['MAT.8.5.1'],
  },
  {
    id: 's8-oteleme-4',
    tur: 'hata',
    baslik: 'Aynadaki bayrak',
    yonerge: 'AYNA komutu bayrağın x = 4 doğrusuna göre yansımasını çizmeli ama görüntü yanlış çıkıyor. AYNA’nın içini izle; hatayı bul, düzelt.',
    dunya: AYNA_DIKEY,
    hedef: CIZIMI_TAMAMLA,
    bitkiAdi: 'bitki',
    aracKutusu: AYNA_ARACLARI,
    baslangic: k([SEKIL_BAYRAK, AYNA_KOPYA, ['cagir', 'ŞEKİL'], 'kalemKaldir', 'sagaDon', ['kez', 4, ['ileri']], 'solaDon', 'kalemIndir', ['cagir', 'AYNA']], 's8o4h-'),
    cozum: k([SEKIL_BAYRAK, AYNA_BAYRAK, ['cagir', 'ŞEKİL'], 'kalemKaldir', 'sagaDon', ['kez', 4, ['ileri']], 'solaDon', 'kalemIndir', ['cagir', 'AYNA']], 's8o4-'),
    ipuclari: [
      'Bayrak direğin sağında. Aynadaki bayrak direğin hangi yanında olmalı?',
      'Dikey aynada sağ ile sol yer değiştirir: AYNA’daki dönüşleri tersine çevir.',
      'AYNA’nın içinde "sağa dön" blokları "sola dön", "sola dön" bloğu "sağa dön" olsun.',
    ],
    basari: (iz) => {
      const [p] = cagriYerleri(iz, 'ŞEKİL');
      const [q] = cagriYerleri(iz, 'AYNA');
      return `Buldun! AYNA’da her dönüş tersine döndü. Direğin dibi ${noktaMetni(p)}, görüntüsü ${noktaMetni(q)}: dikey aynada (x, y) → (${p.x + q.x} − x, y).`;
    },
    kazanimlar: ['MAT.8.5.2', 'MAT.8.5.3'],
  },
  {
    id: 's8-oteleme-5',
    tur: 'kurgu',
    baslik: 'Yatay ayna',
    yonerge: 'Ayna bu kez yatay: y = 3,5 doğrusu. Bayrağın yansımasını çiz; görüntü gizli. Robot aynadaki direğe hangi yöne bakarak varmalı?',
    dunya: AYNA_YATAY,
    hedef: CIZIMI_TAMAMLA,
    bitkiAdi: 'bitki',
    aracKutusu: AYNA_ARACLARI,
    baslangic: 'onceki',
    cozum: k([SEKIL_BAYRAK, AYNA_BAYRAK, ['cagir', 'ŞEKİL'], 'kalemKaldir', ['kez', 2, ['sagaDon']], 'ileri', 'kalemIndir', ['cagir', 'AYNA']], 's8o5-'),
    ipuclari: [
      'Yatay aynada x aynı kalır, y değişir: direğin dibi (2, 4) ise görüntüsü hangi noktada?',
      'Aynadaki bayrak aşağı doğru çizilir: robot AYNA’yı aşağı bakarak çağırmalı.',
      'Kalemi kaldır, iki kez dön, 1 birim ileri git, kalemi indir, AYNA.',
    ],
    basari: (iz) => {
      const [p] = cagriYerleri(iz, 'ŞEKİL');
      const [q] = cagriYerleri(iz, 'AYNA');
      return `Oldu! Direğin dibi ${noktaMetni(p)}, görüntüsü ${noktaMetni(q)}: yatay aynada (x, y) → (x, ${sayiMetni(p.y + q.y)} − y). Bayrak aşağı doğru çizildi.`;
    },
    soru: {
      metin: 'Bayrağın (3, 6) köşesinin görüntüsünün ordinatı kaç?',
      birim: '',
      cevap: (iz) => cagriYerleri(iz, 'ŞEKİL')[0].y + cagriYerleri(iz, 'AYNA')[0].y - 6,
      sonrasi: '(3, 6) → (3, 7 − 6) = (3, 1).',
    },
    kazanimlar: ['MAT.8.5.2', 'MAT.8.5.3'],
  },
];

// ---------------------------------------------------------------------------
// 4. Üslü artış
// ---------------------------------------------------------------------------

const UST: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
/** 10 → "¹⁰", −1 → "⁻¹" */
const ust = (n: number) => String(n).replace(/./g, (c) => UST[c] ?? c);
const ikininKuvveti = (v: number) => `2${ust(Math.round(Math.log2(v)))}`;

/** Kulelerin yükseklikleri, soldan sağa */
const kuleler = (iz: Iz) => iz.son.kupler.filter((n) => n > 0);
/** kat değişkeninin kaç kez değiştiği (ilk değer verme hariç) */
const katlamaSayisi = (iz: Iz) => iz.adimlar.filter((a) => a.tur === 'atama' && a.degisken === 'kat').length - 1;

const KULE_1248 = insaatAlani('s8-us-1248', 'Kuleler 1, 2, 4, 8', ['.....', 'B1248', '.....'], { sinar: 'kat ← kat × 2' });
const KULE_8421 = insaatAlani('s8-us-8421', 'Kuleler 8, 4, 2, 1', ['.....', 'B8421', '.....'], { sinar: 'kat ← kat ÷ 2' });
const KULE_HATA = insaatAlani('s8-us-hata', 'İkiye katlanan kuleler', ['.....', 'B1248', '.....'], { sinar: 'Toplama ile katlama' });
const KULE_TAHMIN = insaatAlani('s8-us-tahmin', 'Kulelerden sonra', ['.....', 'B1248', '.....'], { sinar: '2⁴ · 2⁶ = 2¹⁰' });

const katlaKodu = (bas: number, op: '×' | '÷' | '+', n: number, onek: string, sonra: KisaBlok[] = []) =>
  k([['ata', 'kat', bas], ['kez', 4, ['ileri', ['kez', 'kat', ['koy']], ['ata', 'kat', ['kat', op, n]]]], ...sonra], onek);

const US_ARACLARI: BlokSablonu[] = [
  ILERI,
  KOY,
  { tur: 'tekrarlaKez', kez: 4 },
  { tur: 'tekrarlaKez', kez: 1, kezIfade: ifadeKur('kat') },
  { tur: 'ata', degisken: 'kat', ifade: ifadeKur(1) },
  { tur: 'ata', degisken: 'kat', ifade: ifadeKur(['kat', '+', 1]) },
];
const YAPIYI_KUR: Hedef = { yapiyiKur: true, cikistaBitir: false };

const US_GOREVLERI: Gorev[] = [
  {
    id: 's8-us-1',
    tur: 'yaz',
    baslik: 'İkiye katla',
    yonerge: 'Kuleler 1, 2, 4, 8 küp: her kule bir öncekinin 2 katı. kat değişkeniyle kur: her kule kat kadar küp, sonra kat ikiye katlansın.',
    dunya: KULE_1248,
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: US_ARACLARI,
    baslangic: 'bos',
    cozum: katlaKodu(1, '×', 2, 's8u1-'),
    degiskenler: ['kat'],
    ipuclari: [
      'Kule yüksekliği değişiyor: "kat kez tekrarla [küp koy]" kullan.',
      'Her kuleden sonra kat bir sonrakine hazırlanmalı: 1 → 2 → 4 → 8. Hangi işlem?',
      '"kat ← kat + 1" bloğunda işlemi × yap, 1’i 2 yap.',
    ],
    basari: (iz) => {
      const h = kuleler(iz);
      return `Oldu! Kuleler ${h.join(', ')} küp: ${h.map(ikininKuvveti).join(', ')}. Toplam ${izOzeti(iz).kup} küp: bir sonraki kuleden 1 eksik, 2${ust(h.length)} − 1.`;
    },
    soru: { metin: 'Döngü bitince kat kaç oldu? Beşinci kule olsaydı kaç küp olurdu?', birim: 'küp', cevap: (iz) => deger(iz, 'kat'), sonrasi: '2⁴ = 16.' },
    kazanimlar: ['MAT.8.1.1'],
  },
  {
    id: 's8-us-2',
    tur: 'kurgu',
    baslik: 'Yarıya böl',
    yonerge: 'Bu kez kuleler 8, 4, 2, 1 küp: her kule bir öncekinin yarısı. Kodunu düzelt.',
    dunya: KULE_8421,
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: US_ARACLARI,
    baslangic: 'onceki',
    cozum: katlaKodu(8, '÷', 2, 's8u2-'),
    degiskenler: ['kat'],
    ipuclari: ['İlk kule kaç küp? kat hangi değerle başlamalı?', 'Her kuleden sonra kat yarıya inmeli: × yerine ÷ kullan.'],
    basari: (iz) => {
      const h = kuleler(iz);
      const kat = deger(iz, 'kat');
      return `Oldu! Kuleler ${h.join(', ')} küp: ${h.map(ikininKuvveti).join(', ')}. Döngü bitince kat = ${sayiMetni(kat)} = ${ikininKuvveti(kat)}.`;
    },
    soru: { metin: '2⁰ kaç eder? Son kuleye bak.', birim: '', cevap: (iz) => kuleler(iz)[kuleler(iz).length - 1], sonrasi: '2¹ ÷ 2 = 2⁰ = 1.' },
    kazanimlar: ['MAT.8.1.1'],
  },
  {
    id: 's8-us-3',
    tur: 'hata',
    baslik: 'Ekle mi, katla mı?',
    yonerge: 'Bu kod 1, 2, 4, 8 küplük kuleleri kuracaktı. Çalıştır, kat değişkenini izle; hatayı bul ve düzelt.',
    dunya: KULE_HATA,
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: US_ARACLARI,
    baslangic: katlaKodu(1, '+', 2, 's8u3h-'),
    cozum: katlaKodu(1, '×', 2, 's8u3-'),
    degiskenler: ['kat'],
    ipuclari: ['kat değişkeni hangi değerleri alıyor: 1, 3, 5 …?', '2 eklemek ile 2 ile çarpmak farklıdır. Kuleler eklenerek değil, katlanarak büyümeli.'],
    basari: (iz) => `Buldun! kat + 2 ile kuleler 1, 3, 5, 7 olurdu: her kule 2 fazla (doğrusal artış). kat × 2 ile ${kuleler(iz).join(', ')}: her kule 2 katı (üslü artış).`,
    kazanimlar: ['MAT.8.1.1'],
  },
  {
    id: 's8-us-4',
    tur: 'tahmin',
    baslik: '2 üssü 10',
    yonerge: 'Kodu oku: dron kuleleri kurduktan sonra kat değişkenine ne oluyor? Program bitince kat kaç olur? Önce tahmin et, sonra çalıştır.',
    ilkGorunum: 'sozde',
    dunya: KULE_TAHMIN,
    hedef: YAPIYI_KUR,
    bitkiAdi: 'bitki',
    aracKutusu: US_ARACLARI,
    baslangic: katlaKodu(1, '×', 2, 's8u4-', [['kez', 6, [['ata', 'kat', ['kat', '×', 2]]]]]),
    cozum: katlaKodu(1, '×', 2, 's8u4-', [['kez', 6, [['ata', 'kat', ['kat', '×', 2]]]]]),
    degiskenler: ['kat'],
    ipuclari: ['Kuleler bitince kat kaç? Son kule 8 küp; ardından kat bir kez daha ikiye katlandı.', 'Sonra 6 kez daha ikiye katlanıyor: 16, 32 …', 'kat toplam kaç kez 2 ile çarpıldı? Cevap 2 üssü o sayı.'],
    tahmin: {
      metin: 'Program bitince kat kaç olur?',
      birim: '',
      cevap: (iz) => deger(iz, 'kat'),
      sonrasi: '4 + 6 = 10 kez ikiye katlandı: 2¹⁰ = 1024.',
      yonlendirme: '1’i kaç kez 2 ile çarptığını say: kulelerde 4 kez, sonra 6 kez.',
    },
    basari: (iz) => {
      const n = katlamaSayisi(iz);
      const t = kuleler(iz).length;
      return `Oldu! kat 1’den başladı ve ${n} kez 2 ile çarpıldı: 2${ust(n)} = ${deger(iz, 'kat')}. Kulelerde ${t}, sonra ${n - t} kez: 2${ust(t)} · 2${ust(n - t)} = 2${ust(n)}.`;
    },
    kazanimlar: ['MAT.8.1.1'],
  },
];

// ---------------------------------------------------------------------------
// Üniteler
// ---------------------------------------------------------------------------

export const SINIF8: readonly Unite[] = [
  {
    ...ORTAK,
    id: 's8-koordinat',
    no: 1,
    ad: 'Koordinat düzlemi',
    tema: 'Koordinat düzlemi',
    yeniKavram: 'Dik koordinat sistemi: sıralı ikili, x ve y ölçümleri',
    oncedenBilinen: 'Tekrar, değişkenler ve ölçümler (5–7. sınıf)',
    kalip: 'nokta',
    kazanimlar: ['MAT.8.2.1'],
    sure: '1 ders saati',
    gorevler: KOORDINAT_GOREVLERI,
    fissiz: {
      ad: 'Sınıf koordinat düzlemi',
      amac: 'Sıralı ikilide önce x, sonra y okunduğunu bedenle yaşamak; noktaya giden algoritmayı kartlarla kurmak.',
      sure: '10 dakika',
      roller: ['Bir öğrenci robot olur; orijinde, x ekseni yönüne bakarak durur.', 'Sınıf programcıdır; kartları tahtaya dizer.'],
      adimlar: [
        'Yere bantla x ve y eksenleri, tebeşirle birim çizgileri çizilir.',
        'Öğretmen bir nokta söyler: (3, 2). Sınıf robotun programını kartlarla kurar.',
        'Robot programı uygular; NOKTA KOY kartında bulunduğu yere bir pul bırakır.',
        'Öğretmen (2, 3) noktasını ister; sınıf iki noktanın neden farklı olduğunu tartışır.',
        'DEĞİŞKEN kartlarına a ve b yazılır; değerleri değiştirilince aynı programın başka noktalara gittiği görülür.',
      ],
      hazirlik: 'Yere bantla iki eksen çizin; birimleri 1 adım aralıklı işaretleyin. Pul ya da küçük kâğıtlar hazırlayın.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir birim ileri git.', adet: 6 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 1 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 1 },
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları yazılan sayı kadar uygula.', adet: 2 },
        { komut: 'NOKTA KOY', aciklama: 'Bulunduğun noktaya pul bırak.', adet: 2 },
        { komut: 'DEĞİŞKEN', aciklama: 'Bir değer tut: a = 3, b = 2.', adet: 2 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci dik koordinat sisteminde bir noktaya giden algoritmayı yazar; sıralı ikilide apsis ile ordinatı ayırt eder, robotun koordinatlarını x ve y ölçümleriyle değişkenlere kaydeder.',
      dersler: [{ baslik: '1 ders', metin: 'Fişsiz "Sınıf koordinat düzlemi" (10 dk), ardından 1–3. görevler; 4. görev (hatayı bul) ikişerli; 5. görev genelleme: aynı kod başka (a, b) için.' }],
      yanilgilar: [
        { ad: 'x ile y’yi karıştırmak', metin: '(3, 2) ile (2, 3) noktalarını aynı sanmak ya da önce y kadar gitmek. 4. görev bunu hedefler: robot (2, 3) noktasını işaretler.' },
        { ad: 'Ölçümü yanlış anda okumak', metin: 'apsis ← x bloğunu robot noktaya varmadan koymak: değişken o anki konumu, ör. 0’ı alır. 3. görevdeki ileti değişkenin ne olduğunu söyler.' },
        { ad: 'Başlangıç noktasını 1 saymak', metin: 'Orijini ilk birim sayıp bir eksik adım atmak. Nokta ağında sayılan şey noktalar değil, aralardaki birimlerdir.' },
      ],
      sorular: ['(3, 2) ile (2, 3) aynı nokta mı? Neden?', 'Bir noktanın x eksenine uzaklığı hangi koordinatı?', 'Kodda sayı yerine a ve b yazmak ne kazandırdı?', 'Robot (0, 0)’a en kısa hangi yoldan döner?'],
      celdiriciler: 'Araç kutusunda iki dönüş bloğu da vardır: y ekseni yönüne dönmek için hangisinin gerektiğini çocuk bulur. Tekrar bloğu kısa kod içindir; zorunlu değildir.',
    },
  },
  {
    ...ORTAK,
    id: 's8-dogrusal',
    no: 2,
    ad: 'Doğrusal fonksiyon',
    tema: 'Koordinat düzlemi',
    yeniKavram: 'Doğrusal fonksiyon: sabit adım deseni (1 sağa, m yukarı) ve eğim',
    oncedenBilinen: 'Koordinat düzlemi (1. ünite), genel terim (6. sınıf)',
    kalip: 'egim',
    kazanimlar: ['MAT.8.2.2', 'MAT.8.2.4', 'MAT.8.2.3'],
    sure: '2 ders saati',
    uygunluk: 'Noktalar gizlidir: çocuk her x için y’yi hesaplar. Yanlış nokta anında gösterilir.',
    gorevler: DOGRUSAL_GOREVLERI,
    fissiz: {
      ad: 'İnsan doğru',
      amac: 'Doğrusal fonksiyonun noktalarının "1 sağa, m yukarı" desenle dizildiğini görmek.',
      sure: '15 dakika',
      roller: ['Her öğrenci bir x değeri alır ve y değerini hesaplar.', 'Bir öğrenci robot olur; deseni kartlarla yürür.'],
      adimlar: [
        'Yere koordinat ızgarası çizilir.',
        'Tahtaya y = 2x + 1 yazılır. x = 0, 1, 2, 3 değerini alan öğrenciler y’yi hesaplar ve noktalarına geçer.',
        'Robot (0, 1) noktasından başlar; "1 sağa, 2 yukarı" desenini TEKRARLA kartıyla yürür, her noktada NOKTA KOY kartını uygular.',
        'Öğrencilerin durduğu noktalar ile robotun bıraktığı pullar karşılaştırılır: hepsi bir doğru üstünde mi?',
        'Kural y = 6 − 2x olur; sınıf azalan deseni (1 sağa, 2 aşağı) bulur.',
      ],
      hazirlik: 'Yere bantla 8 × 8 bir ızgara ve eksenler çizin. Pul ya da tebeşir hazırlayın.',
      kartlar: [
        { komut: 'İLERİ', aciklama: 'Bir birim ileri git.', adet: 4 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 1 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 1 },
        { komut: 'NOKTA KOY', aciklama: 'Bulunduğun noktaya pul bırak.', adet: 1 },
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları yazılan sayı kadar uygula.', adet: 2 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci doğrusal fonksiyonun noktalarını hesaplayıp işaretleyen algoritmayı yazar; eğimi adım desenindeki yükselişle, sabit terimi başlangıç yüksekliğiyle ilişkilendirir; paralel ve azalan doğruları karşılaştırır.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "İnsan doğru" (15 dk), ardından 1–3. görevler: y = x, y = 2x, y = 2x + 1.' },
        { baslik: '2. ders', metin: '4. görev (hatayı bul) ikişerli; 5. görev azalan doğru; 6. görevde çocuk kodu okuyup x = 10 için y’yi tahmin eder.' },
      ],
      yanilgilar: [
        { ad: 'Sabit terimi eğim sanmak', metin: 'y = x + 2’de her adımda 2 yukarı çıkmak. 4. görev bunu hedefler: robot (1, 4) noktasını işaretler.' },
        { ad: 'Her doğrunun orijinden geçtiğini sanmak', metin: 'y = 2x + 1’in noktalarını (0, 0)’dan başlatmak. 3. görevde ilk nokta (0, 1)’dir.' },
        { ad: 'Azalan doğruda yönü karıştırmak', metin: 'Eğim eksi olunca yine yukarı çıkmak. 5. görevde robot sağa dönüp aşağı iner.' },
      ],
      sorular: [
        'Eğim adım deseninde nerede görünüyor? Sabit terim nerede?',
        'y = 2x ile y = 2x + 1 kesişir mi? Neden?',
        'Eğim eksi olunca desen nasıl değişir?',
        'x = 100 iken y’yi robotu çalıştırmadan nasıl bulursun?',
      ],
      celdiriciler: 'Bu ünitede çeldirici blok yoktur; zorluk tekrar sayılarını (adım sayısı ve yükseliş) doğru seçmektedir.',
    },
  },
  {
    ...ORTAK,
    id: 's8-oteleme',
    no: 3,
    ad: 'Öteleme ve yansıma',
    tema: 'Koordinat düzlemi',
    yeniKavram: 'Kendi komutunu tanımlamak (alt program): şekli bir kez tanımla, farklı yerlerde çağır',
    oncedenBilinen: 'Koordinat düzlemi (1. ünite), yansıma (7. sınıf)',
    kalip: 'komut',
    kazanimlar: ['MAT.8.5.1', 'MAT.8.5.2', 'MAT.8.5.3'],
    sure: '2 ders saati',
    gorevler: OTELEME_GOREVLERI,
    fissiz: {
      ad: 'Komut kartı',
      amac: 'Bir şekli bir kez tanımlayıp farklı yerlerde çağırmak; öteleme ve yansımanın koda etkisini görmek.',
      sure: '15 dakika',
      roller: ['Bir grup KOMUT kartının altına şekli çizen kartları dizer.', 'Bir öğrenci robot olur; KOMUT kartını görünce altındaki kartları uygular.'],
      adimlar: [
        'Yere koordinat ızgarası çizilir.',
        'Grup ŞEKİL komutunu kurar: 2 birimlik bir dikdörtgen; robot bitirince başladığı yere döner.',
        'Robot (1, 1) noktasında ŞEKİL der ve çizer; tebeşiri kaldırıp 4 birim sağa gider, yeniden ŞEKİL der.',
        'Sınıf iki dikdörtgenin köşe koordinatlarını tabloya yazar: (x, y) → (x + 4, y).',
        'Grup bir bayrak çizer ve AYNA komutunu kurar: sağa dönüşler sola döner. Robot ayna doğrusunun öbür yanında AYNA der.',
      ],
      hazirlik: 'Yere bantla ızgara ve eksenler çizin. İki KOMUT kartına ŞEKİL ve AYNA yazın. Robotun elinde tebeşir olsun.',
      kartlar: [
        { komut: 'KOMUT', aciklama: 'Adı yazılı komut: altındaki kartları uygula.', adet: 2 },
        { komut: 'İLERİ', aciklama: 'Bir birim ileri git.', adet: 4 },
        { komut: 'SAĞA DÖN', aciklama: 'Yerinde sağına dön.', adet: 2 },
        { komut: 'SOLA DÖN', aciklama: 'Yerinde soluna dön.', adet: 2 },
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları yazılan sayı kadar uygula.', adet: 1 },
        { komut: 'KALEMİ KALDIR', aciklama: 'Tebeşiri kaldır; yürürken çizme.', adet: 1 },
        { komut: 'KALEMİ İNDİR', aciklama: 'Tebeşiri indir; yürürken çiz.', adet: 1 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci bir şekli komut olarak tanımlar ve farklı noktalarda çağırarak öteler; noktaların koordinatlarının öteleme ve eksene göre yansımada nasıl değiştiğini koddan ve çizimden çıkarır.',
      dersler: [
        { baslik: '1. ders', metin: 'Fişsiz "Komut kartı" (15 dk), ardından 1–2. görevler: komutu tanımla, iki yerde çağır; gizli görüntüye ötele.' },
        { baslik: '2. ders', metin: '3–4. görevler (hatayı bul) ikişerli: çağrının yeri ve AYNA komutundaki dönüşler. 5. görevde ayna yataydır; bayrak aşağı çizilir.' },
      ],
      yanilgilar: [
        { ad: 'Çağrının kendiliğinden yer değiştirdiğini sanmak', metin: 'ŞEKİL’i iki kez art arda çağırıp iki şekil çizileceğini sanmak. Robot yerinden kıpırdamadığı için aynı şekli iki kez çizer. 3. görev bunu hedefler.' },
        { ad: 'Yansımayı öteleme gibi yapmak', metin: 'AYNA komutunu ŞEKİL’in kopyası olarak yazmak: dönüşler aynı kalınca şekil aynaya göre değil, yana ötelenmiş olur. 4. görev bunu hedefler.' },
        { ad: 'Yatay aynada yönü yansıtmamak', metin: 'Yatay aynada yukarı bakan direğin görüntüsünün aşağı baktığını unutmak. 5. görev bunu gösterir.' },
      ],
      sorular: [
        'Komut tanımlamak kodu nasıl kısalttı? Üç şekil olsaydı?',
        'Ötelemede noktanın apsisi ve ordinatı nasıl değişti?',
        'Dikey aynada (x, y) noktasının görüntüsü nedir? Yatay aynada?',
        'Öteleme ile yansımayı koddan nasıl ayırt edersin?',
      ],
      celdiriciler: 'Bu ünitede çeldirici blok yoktur. 4–5. görevlerde hem ŞEKİL hem AYNA blokları kutudadır: hangisinin nerede çağrılacağını çocuk seçer.',
    },
  },
  {
    ...ORTAK,
    id: 's8-us',
    no: 4,
    ad: 'Üslü artış',
    tema: 'İnşaat alanı',
    yeniKavram: 'Üslü artış: her turda ikiye katlama (2ⁿ)',
    oncedenBilinen: 'Değişkenle büyüyen tekrar (5. sınıf), çarpma ve bölme',
    kalip: 'katla',
    kazanimlar: ['MAT.8.1.1'],
    sure: '1 ders saati',
    gorevler: US_GOREVLERI,
    fissiz: {
      ad: 'Katlanan kâğıt',
      amac: 'Her katlamada kat sayısının ikiye katlandığını görmek; tekrarlı çarpmayı 2ⁿ ile ilişkilendirmek.',
      sure: '10 dakika',
      roller: ['Her grup bir A4 kâğıdı katlar.', 'Bir öğrenci kat değişkenini tahtada tutar.', 'Bir öğrenci dron olur; kat kadar küple kule kurar.'],
      adimlar: [
        'Kâğıt katlanmadan önce 1 kattır: tahtaya kat = 1 yazılır.',
        'Her katlamada sınıf "kat ← kat × 2" der; tahtadaki değer güncellenir.',
        'Dron her katlamadan sonra kat kadar küple bir kule kurar: 1, 2, 4, 8.',
        'Sınıf 10 katlamada kaç kat olacağını tahmin eder: 2¹⁰ = 1024.',
        'Aynı oyun "kat ← kat + 2" ile oynanır; iki büyüme tahtada karşılaştırılır.',
      ],
      hazirlik: 'Her grup için bir A4 kâğıt ve 15 birim küp hazırlayın. İŞLEM kartlarından birine "kat × 2", ötekine "kat + 2" yazın.',
      kartlar: [
        { komut: 'BAŞLA', aciklama: 'Algoritma buradan başlar.', adet: 1 },
        { komut: 'DEĞİŞKEN', aciklama: 'kat = 1.', adet: 1 },
        { komut: 'TEKRARLA', aciklama: 'İçteki kartları yazılan sayı kadar uygula.', adet: 2 },
        { komut: 'KÜP KOY', aciklama: 'Bulunduğun kareye bir küp koy.', adet: 1 },
        { komut: 'İLERİ', aciklama: 'Bir kare ileri uç.', adet: 1 },
        { komut: 'İŞLEM', aciklama: 'kat’ı güncelle.', adet: 2 },
        { komut: 'BİTİR', aciklama: 'Algoritma burada biter.', adet: 1 },
      ],
    },
    ogretmenNotu: {
      hedef: 'Öğrenci her turda ikiye katlanan bir değişkenle 1, 2, 4, 8 küplük kuleler kurar; tekrarlı çarpmayı üslü ifadeyle yazar, doğrusal artışla üslü artışı karşılaştırır, 2ⁿ değerini çalıştırmadan tahmin eder.',
      dersler: [{ baslik: '1 ders', metin: 'Fişsiz "Katlanan kâğıt" (10 dk), ardından 1–2. görevler; 3. görev (hatayı bul) ikişerli; 4. görevde önce tahmin, sonra çalıştır.' }],
      yanilgilar: [
        { ad: 'Eklemeyle katlamayı karıştırmak', metin: '"İki katı" yerine "iki fazlası": kat ← kat + 2. Kuleler 1, 3, 5 diye büyür. 3. görev bunu hedefler.' },
        { ad: 'Üssü çarpan sanmak', metin: '2¹⁰’u 2 × 10 = 20 sanmak. 4. görevde kat 10 kez ikiye katlanır ve 1024 olur.' },
        { ad: 'Sıfırıncı kuvveti sıfır sanmak', metin: '2⁰’ın 0 olduğunu düşünmek. 2. görevde yarıya bölünen kulelerin sonuncusu 1 küptür: 2⁰ = 1.' },
      ],
      sorular: ['Kuleleri 10 tur sürdürseydik son kule kaç küp olurdu?', '1 + 2 + 4 + 8 neden 16’dan 1 eksik?', 'kat + 2 ile kat × 2 hangi turdan sonra çok farklılaşır?', 'Yarıya bölmeyi sürdürseydik kat hangi değerleri alırdı?'],
      celdiriciler: 'Araç kutusundaki "kat ← kat + 1" bir şablondur: ifadenin biçimini verir, işlemi ve sayıyı çocuk seçer. "4 kez tekrarla" kule sayısı içindir.',
    },
  },
];
