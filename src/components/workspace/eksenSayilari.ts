/**
 * Koordinat eksenlerindeki sayıların (çentik değerlerinin), çentiklerin ve +x / +y / -y yön rozetlerinin
 * tuvaldeki yerleşimi.
 *
 * Saf hesap: DOM okumaz, React'e bağlı değildir (vitest node ortamında sınanır). Canvas.tsx yalnız bu
 * modülün sonucunu çizer.
 *
 * Kullanıcı bildirimi: "yapışan koordinat sayıları soldaki panelin içine giriyor, biraz dışında kalmalıydı".
 * Eskiden y sayıları eksen ekran dışındayken x = 8'e SAĞA hizalı çiziliyordu; "13" gibi iki haneli sayıların
 * ilk hanesi, "-13"ün eksi işareti sol panelin altında kalıyordu (yanlış değer okunuyordu).
 *
 * Kurallar:
 * - Eksen ekrandaysa sayılar eksenin yanında durur; ekran dışındaysa kenara "yapışır".
 * - y sayıları eksenin solundadır (sağa hizalı). Solda yer yoksa ya da eksen solda ekran dışındaysa sayılar
 *   çentiklerin SAĞINA (sola hizalı) geçer; "-13", "1000", "0,25" hiç kesilmez. Sol kenarda `solPay` kadar
 *   şerit boş kalır: kenar paneli bitişiktir ve "<" tutamacı tuvale 20 px taşar.
 * - x sayıları eksenin altındadır; alta yer yoksa üste geçer. Eksen aşağıda ekran dışındaysa sıra alt
 *   bilginin (İmleç · Ölçek · Nesne) ÜSTÜNDE durur; sağ alttaki yakınlaştırma düğmeleriyle komut hapının
 *   altına düşen sayılar çizilmez. Eksen yukarıda ekran dışındaysa sıra üst kenara yapışık kalır ve sol üstteki
 *   araç düğmelerinin altına düşen sayılar çizilmez (sırayı düğmelerin altına indirmek onu gerçek bir eksen
 *   gibi gösterirdi).
 * - x ve y sayıları çakışırsa (köşeler, orijin çevresi) köşeye en yakın olan düşer.
 * - Çok büyük yazıda ya da sık sabit ızgarada aynı eksendeki komşu sayılar üst üste binecekse sayılar
 *   adımın katlarıyla seyreltilir (çentikler ve ızgara aralığı değişmez; kaydırırken hangi sayının kaldığı
 *   değişmez).
 * - Yön rozetleri yalnız ekseni ekrandayken görünür ve araç düğmeleri, alt bilgi, yakınlaştırma düğmeleri,
 *   komut hapı ve orijin rozetiyle çakışmayan ilk konuma oturur; hep kendi yarı ekseninin yanında kalır ("+x"
 *   orijinin sağında, "+y" üstünde, "-y" altında), yer yoksa gizlenir. Sayılar rozetlere yol verir.
 * - Genişlik, karakter sayısı x yazı boyuyla kestirilir (her karede DOM ölçümü yapılmaz).
 */

export interface Dikdortgen {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EksenCentigi {
  /** Dünya değeri. 0 etiketlenmez: orijinde "(0; 0)" rozeti vardır. */
  deger: number;
  /** Ekran konumu (px): x ekseninde yatay, y ekseninde dikey konum */
  ekran: number;
  /** Yazılacak metin (formatTurkishNumber) */
  metin: string;
}

export interface EksenSayilariGirdisi {
  /** Tuvalin gerçek yerleşim boyutu (CSS px) */
  genislik: number;
  yukseklik: number;
  /** Orijinin ekran konumu (ekran dışında olabilir) */
  orijin: { x: number; y: number };
  xCentikleri: readonly EksenCentigi[];
  yCentikleri: readonly EksenCentigi[];
  /** Izgara adımı (dünya birimi); seyreltme için. Verilmezse çentiklerden çıkarılır. */
  adim?: number;
  /** Eksen sayılarının yazı boyu: fs(10, 'axis') (axisScale ve fontScale dahil) */
  yaziBoyu: number;
  /** Tuvalin üstündeki HTML katmanları (tuval px). Bkz. tuvalEngelleri */
  engeller?: readonly Dikdortgen[];
  /** Sağ kenardan en az boşluk (px) */
  kenarPayi?: number;
  /** Sol kenarda sayılara kapalı şerit (px): kenar paneli ve "<" tutamacı */
  solPay?: number;
  /** Alt kenarda alt bilgi satırının kapladığı bant (px) */
  altBosluk?: number;
}

export type Hiza = 'start' | 'middle' | 'end';
export type DusmeNedeni = 'kenar' | 'engel' | 'rozet' | 'seyrek' | 'kesisme';

export interface SayiYerlesimi {
  deger: number;
  metin: string;
  /** SVG text x */
  x: number;
  /** SVG text y (taban çizgisi) */
  y: number;
  hiza: Hiza;
  gorunur: boolean;
  /** Çizilmiyorsa neden */
  neden?: DusmeNedeni;
  /** Kestirilen metin kutusu (yazı tipinin satır kutusu: tabandan 1,1 em yukarı, 0,3 em aşağı) */
  kutu: Dikdortgen;
}

export interface CentikYerlesimi {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface EksenOgesi {
  deger: number;
  centik: CentikYerlesimi;
  /**
   * Çentik çizilsin mi. Gerçek eksende hep çizilir. Kenara yapışık (eksen ekran dışında) sırada sayısı
   * seyreltme dışında bir nedenle düşen çentik çizilmez: araç düğmelerinin, alt bilginin yanından
   * sayısız çentik uçları görünmesin.
   */
  centikGorunur: boolean;
  sayi: SayiYerlesimi;
}

export interface RozetYerlesimi extends Dikdortgen {
  gorunur: boolean;
}

export interface EksenSayilariSonucu {
  x: {
    /** x ekseninin konumu: ekranda ya da ekranın üstünde / altında */
    durum: 'ekranda' | 'ust' | 'alt';
    /** Çentiklerin çizildiği satır (ekrandaysa eksenin kendisi) */
    cizgiY: number;
    /** Sayılar çentiklerin altında mı üstünde mi */
    sayiYonu: 'alt' | 'ust';
    /** Yalnız ekrandaki çentikler (0 hariç) */
    ogeler: EksenOgesi[];
  };
  y: {
    durum: 'ekranda' | 'sol' | 'sag';
    cizgiX: number;
    sayiYonu: 'sol' | 'sag';
    ogeler: EksenOgesi[];
  };
  rozetler: { artiX: RozetYerlesimi; artiY: RozetYerlesimi; eksiY: RozetYerlesimi };
  /** Canvas'ın çizdiği "(0; 0)" rozetinin kutusu (görünürse) */
  orijinRozeti: Dikdortgen | null;
}

// ---------------------------------------------------------------- sabitler

/** Çentiğin eksenden bir yana uzunluğu (px) */
export const CENTIK_YARI = 3;
/** y çentiğinin ucu ile sayının arası (px) */
const Y_CENTIK_ARASI = 5;
/** x çentiğinin ucu ile metin (satır) kutusunun arası (px). Satır kutusu rakamların üstünde ~0,4 em boşluk içerir. */
const X_CENTIK_ARASI = 1;
/** Metin satır kutusu: tabandan yukarı / aşağı (em). Manrope 700'de ölçülen: 10 px yazıda -11 ... +3. */
export const METIN_UST = 1.1;
export const METIN_ALT = 0.3;
/** y sayısının tabanı çentiğin bu kadar em altında: rakamlar çentiğe ortalanır (10 px'te 3,5 px, eskisi gibi) */
const Y_TABAN_KAYMA = 0.35;
/** Üst ve alt kenardan en az boşluk (px) */
const DIKEY_PAY = 4;
/** Aynı eksendeki komşu sayılar arasında en az boşluk (px) */
const KOMSU_ARASI = 4;
/** Yön rozeti (Canvas: rect 36 x 20) */
export const ROZET_GENISLIK = 36;
export const ROZET_YUKSEKLIK = 20;
/** Rozetin tuval kenarlarına en az uzaklığı */
const ROZET_KENAR = 4;
/** Rozetin sayılarla ve öteki rozetlerle arasında kalacak boşluk */
const ROZET_ARASI = 2;
/**
 * Yön rozeti kendi yarı ekseninin yanında kalır: "+x" orijinin sağında, "+y" üstünde, "-y" altında (en az bu
 * kadar px). Uygun yer yoksa rozet gizlenir: "+y" kümesinde duran "-y" yazısı öğrenciyi yanıltır.
 */
const ROZET_TARAF_PAYI = 4;
/** x ve y sayıları arasında kalacak boşluk (köşede çapraz değip okunmayı zorlaştırmasın) */
const CAPRAZ_ARASI = 4;

export const VARSAYILAN_KENAR_PAYI = 8;
/** "<" tutamacı tuvale 20 px taşar; sayılar panelden biraz uzakta durur */
export const VARSAYILAN_SOL_PAY = 24;
/** Alt bilgi: bottom-3 (12 px) + 11 px yazı + 6 px boşluk */
export const VARSAYILAN_ALT_BOSLUK = 29;

// ---------------------------------------------------------------- genişlik kestirimi

/**
 * Eksen sayısının yaklaşık genişliği (px). Eksen sayıları Manrope 700 ile çizilir (globals.css'teki
 * `* { font-family: ... !important }` g.axes'in font-mono'sunu ezer; rakamlar eş genişlikte değildir).
 * Katsayılar ölçülen genişliklerin ÜST sınırıdır (10 px'te "0" 6,59; "1" 4,39; "-" 4,20; "," 3,05):
 * bir sayı hiçbir zaman kestirilenden geniş çizilmez, kesilmez.
 */
export function tahminiMetinGenisligi(metin: string, yaziBoyu: number): number {
  let em = 0;
  for (const ch of metin) {
    if (ch >= '0' && ch <= '9') em += 0.66;
    else if (ch === '-' || ch === '−') em += 0.45;
    else if (ch === ',' || ch === '.') em += 0.32;
    else if (ch === ' ') em += 0.28;
    else em += 0.66;
  }
  return em * yaziBoyu + 1;
}

// ---------------------------------------------------------------- tuval üstündeki HTML katmanları

/** "Üstten Görünüm / 3D İzdüşüm" seçicisinin ölçülen genişliği (px; iki kipte de aynı) */
const CISIM_SECICI_GENISLIK = 239;
/** Sarılma eşiğinin bu kadar yakınında seçici iki konumda da ayrılır (yazı tipi farkı) */
const CISIM_SECICI_ESIK_PAYI = 8;

/**
 * Tuvalin üstündeki kalıcı HTML katmanlarının kutuları (tuval px, 4 px pay eklenmiş). Değerler Tailwind
 * sınıflarından gelir; bu katmanlar taşınırsa burası da güncellenmeli:
 * - sol üst araçlar: Canvas.tsx "1. ÜST 2D / 3D DÜZLEM" şeridi (top-3 left-4, 4 x w-9 h-9, gap-2) → x 16..184, y 12..48
 * - alt bilgi "İmleç · Ölçek · Nesne": Canvas.tsx (absolute bottom-3 left-3 text-[11px]) → x 12..~300, y H-23..H-12
 *   (genişlik imleç koordinatıyla değişir; 320 px ayrılır)
 * - yakınlaştır / uzaklaştır: Canvas.tsx (bottom-3 right-3, 2 x w-9 h-9, gap-1.5) → x W-48..W-12, y H-90..H-12
 * - klavye + mikrofon hapı: CommandAssistant.tsx (bottom-3 right-14, sm:bottom-4 sm:right-16) → x W-159..W-64,
 *   y H-66..H-16 (dar pencerede W-151..W-56, H-62..H-12; ikisini de kapsar)
 * - 3B cisim varsa "Üstten Görünüm / 3D İzdüşüm" seçicisi (ölçülen 238,6 x 30 px). Şerit `flex-wrap
 *   justify-between` olduğundan geniş tuvalde sağ üsttedir (x W-254..W-16, y 15..45); tuval ~447 px'ten darsa
 *   (2D + 3D, üç sütun, dar pencere) araçların altındaki ikinci satıra, sola sarılır (x 16..255, y 56..86).
 *   Eşiğin ±8 px yakınında yazı tipi farkına karşı iki konum da ayrılır.
 * Sol kenardaki "<" tutamacı (x -1..19, satırın ortasında) yerine tam boy `solPay` şeridi kullanılır.
 */
export function tuvalEngelleri(genislik: number, yukseklik: number, secenek: { cisimSecici?: boolean } = {}): Dikdortgen[] {
  const W = genislik;
  const H = yukseklik;
  const kutular: Dikdortgen[] = [
    { x: 12, y: 8, w: 176, h: 44 },
    { x: 0, y: H - 29, w: 320, h: 29 },
    { x: W - 52, y: H - 94, w: 52, h: 94 },
    { x: W - 163, y: H - 70, w: 111, h: 70 },
  ];
  if (secenek.cisimSecici) {
    // Şerit: left-4 right-4 (16 px), gap-2 (8 px); sol grup 4 x 36 + 3 x 8 = 168 px
    const bos = W - 32 - (168 + 8 + CISIM_SECICI_GENISLIK);
    if (bos >= -CISIM_SECICI_ESIK_PAYI) kutular.push({ x: W - 260, y: 8, w: 252, h: 40 });
    if (bos < CISIM_SECICI_ESIK_PAYI) kutular.push({ x: 12, y: 52, w: CISIM_SECICI_GENISLIK + 8, h: 38 });
  }
  return kutular;
}

/**
 * Canvas'ın "(0; 0)" rozeti: orijin tuvalin 30 px yakınındaysa çizilir; kutu origin + (8, 8), 48 x 20, 1,5 px
 * çerçeve. Metni (Roboto Mono, fs(10, 'axis'), ortası origin + 32, tabanı origin + 22) büyük eksen yazısında
 * kutudan taşar (axisScale 2'de 72 px): engel kutusu ikisinin birleşimidir.
 */
export function orijinRozetiKutusu(
  orijin: { x: number; y: number },
  genislik: number,
  yukseklik: number,
  yaziBoyu = 10
): Dikdortgen | null {
  const { x, y } = orijin;
  if (!(x >= -30 && x <= genislik + 30 && y >= -30 && y <= yukseklik + 30)) return null;
  // Eş genişlikli yazı: 6 karakter x 0,6 em (ölçülen); yedek yazı tipine karşı 0,62 em + 2 px
  const metinW = 6 * 0.62 * yaziBoyu + 2;
  const sol = Math.min(x + 7, x + 32 - metinW / 2);
  const sag = Math.max(x + 57, x + 32 + metinW / 2);
  const ust = Math.min(y + 7, y + 22 - METIN_UST * yaziBoyu);
  const alt = Math.max(y + 29, y + 22 + METIN_ALT * yaziBoyu);
  return { x: sol, y: ust, w: sag - sol, h: alt - ust };
}

// ---------------------------------------------------------------- küçük geometri

export function kesisir(a: Dikdortgen, b: Dikdortgen, pay = 0): boolean {
  return a.x < b.x + b.w + pay && b.x < a.x + a.w + pay && a.y < b.y + b.h + pay && b.y < a.y + a.h + pay;
}

function metinKutusu(x: number, taban: number, hiza: Hiza, genislik: number, yaziBoyu: number): Dikdortgen {
  const sol = hiza === 'start' ? x : hiza === 'end' ? x - genislik : x - genislik / 2;
  return { x: sol, y: taban - METIN_UST * yaziBoyu, w: genislik, h: (METIN_UST + METIN_ALT) * yaziBoyu };
}

/** Komşu sayılar üst üste binmesin diye kaç adımda bir sayı yazılacağı (1 = hepsi) */
function seyreltmeKati(centikler: readonly EksenCentigi[], adim: number, gerekenPx: number): number {
  if (centikler.length < 2 || !(adim > 0)) return 1;
  let pikselBirim = 0;
  for (let i = 1; i < centikler.length; i++) {
    const dd = Math.abs(centikler[i].deger - centikler[i - 1].deger);
    if (dd > 1e-9) {
      pikselBirim = Math.abs(centikler[i].ekran - centikler[i - 1].ekran) / dd;
      break;
    }
  }
  const aralik = pikselBirim * adim;
  if (!(aralik > 0)) return 1;
  return Math.max(1, Math.ceil((gerekenPx - 1e-6) / aralik));
}

function adimiBul(centikler: readonly EksenCentigi[]): number {
  let enKucuk = Infinity;
  const sirali = centikler.map((c) => c.deger).sort((a, b) => a - b);
  for (let i = 1; i < sirali.length; i++) {
    const d = sirali[i] - sirali[i - 1];
    if (d > 1e-9 && d < enKucuk) enKucuk = d;
  }
  return Number.isFinite(enKucuk) ? enKucuk : 0;
}

// ---------------------------------------------------------------- ana hesap

const GIZLI_ROZET: RozetYerlesimi = { gorunur: false, x: 0, y: 0, w: ROZET_GENISLIK, h: ROZET_YUKSEKLIK };

export function eksenSayilariniYerlestir(g: EksenSayilariGirdisi): EksenSayilariSonucu {
  const W = g.genislik;
  const H = g.yukseklik;
  const fs = g.yaziBoyu;
  const K = g.kenarPayi ?? VARSAYILAN_KENAR_PAYI;
  const solPay = g.solPay ?? VARSAYILAN_SOL_PAY;
  const altSinir = H - (g.altBosluk ?? VARSAYILAN_ALT_BOSLUK);
  const ox = g.orijin.x;
  const oy = g.orijin.y;
  const engeller = g.engeller ?? [];
  const orijinRozeti = orijinRozetiKutusu(g.orijin, W, H, fs > 0 ? fs : 10);

  const xDurum: EksenSayilariSonucu['x']['durum'] = oy < 0 ? 'ust' : oy > H ? 'alt' : 'ekranda';
  const yDurum: EksenSayilariSonucu['y']['durum'] = ox < 0 ? 'sol' : ox > W ? 'sag' : 'ekranda';

  const bos: EksenSayilariSonucu = {
    x: { durum: xDurum, cizgiY: 0, sayiYonu: 'alt', ogeler: [] },
    y: { durum: yDurum, cizgiX: 0, sayiYonu: 'sol', ogeler: [] },
    rozetler: { artiX: { ...GIZLI_ROZET }, artiY: { ...GIZLI_ROZET }, eksiY: { ...GIZLI_ROZET } },
    orijinRozeti,
  };
  if (!(W > 0 && H > 0 && fs > 0) || !Number.isFinite(ox) || !Number.isFinite(oy)) return bos;

  // Yalnız ekrandaki çentikler (Canvas'ın ızgara listesi her yönde ~16 adım fazlasını taşır)
  const xler = g.xCentikleri.filter((c) => c.deger !== 0 && Number.isFinite(c.ekran) && c.ekran >= 0 && c.ekran <= W);
  const yler = g.yCentikleri.filter((c) => c.deger !== 0 && Number.isFinite(c.ekran) && c.ekran >= 0 && c.ekran <= H);

  // ---- x ekseni: çentik satırı ve sayıların yönü
  const cizgiY = xDurum === 'ekranda' ? oy : xDurum === 'ust' ? K : altSinir;
  const altaSigar = Math.max(cizgiY, K) + CENTIK_YARI + X_CENTIK_ARASI + (METIN_UST + METIN_ALT) * fs <= altSinir;
  const xYonu: 'alt' | 'ust' = altaSigar ? 'alt' : 'ust';
  // Üst kenara yakın (0..K) eksende sayılar, ekran dışındaki yapışık sırayla aynı yerde durur (kaydırırken zıplamaz);
  // alt bilgi bandındaki eksende de yapışık sıranın yerinde.
  const xTaban =
    xYonu === 'alt'
      ? Math.max(cizgiY, K) + CENTIK_YARI + X_CENTIK_ARASI + METIN_UST * fs
      : Math.min(cizgiY, altSinir) - CENTIK_YARI - X_CENTIK_ARASI - METIN_ALT * fs;

  // Orijin rozeti ve orijindeki odak halkası (r = 14, 1,5 px çizgi) da engeldir (rozetler ve sayılar için)
  const rozetEngelleri: Dikdortgen[] = orijinRozeti
    ? [...engeller, orijinRozeti, { x: ox - 15, y: oy - 15, w: 30, h: 30 }]
    : [...engeller];

  // ---- y ekseni: çentik sütunu ve sayıların yönü
  const cizgiX = yDurum === 'ekranda' ? ox : yDurum === 'sol' ? solPay - Y_CENTIK_ARASI - CENTIK_YARI : W - K;
  const yGenislikleri = yler.map((c) => tahminiMetinGenisligi(c.metin, fs));
  const solSinirX = Math.min(cizgiX, W - K) - CENTIK_YARI - Y_CENTIK_ARASI;
  // Yan seçimi yalnız solda ÇİZİLEBİLECEK sayılara bakar: alt bilginin, araç düğmelerinin altına ya da kenar
  // dışına düşecek (zaten çizilmeyecek) geniş bir sayı, kaydırırken bütün sütunu öbür yana atmasın.
  const enGenisY = yler.reduce((m, c, i) => {
    const k = metinKutusu(solSinirX, c.ekran + Y_TABAN_KAYMA * fs, 'end', yGenislikleri[i], fs);
    if (k.y < DIKEY_PAY - 1e-6 || k.y + k.h > H - DIKEY_PAY + 1e-6) return m;
    if (rozetEngelleri.some((e) => kesisir(k, e))) return m;
    return Math.max(m, yGenislikleri[i]);
  }, 0);
  let yYonu: 'sol' | 'sag';
  if (yDurum === 'sol') yYonu = 'sag';
  else if (yDurum === 'sag') yYonu = 'sol';
  else yYonu = solSinirX - enGenisY >= solPay ? 'sol' : 'sag';
  const yX = yYonu === 'sol' ? solSinirX : Math.max(cizgiX + CENTIK_YARI + Y_CENTIK_ARASI, solPay);
  const yHiza: Hiza = yYonu === 'sol' ? 'end' : 'start';

  // ---- yön rozetleri (sayılardan önce: sayılar rozetlere yol verir)
  const yerlesenRozetler: Dikdortgen[] = [];
  const rozetYerlestir = (adaylar: Array<{ x: number; y: number }>, kendiYaninda: (r: Dikdortgen) => boolean): RozetYerlesimi => {
    for (const a of adaylar) {
      const r: Dikdortgen = { x: a.x, y: a.y, w: ROZET_GENISLIK, h: ROZET_YUKSEKLIK };
      if (r.x < ROZET_KENAR || r.y < ROZET_KENAR || r.x + r.w > W - ROZET_KENAR || r.y + r.h > H - ROZET_KENAR) continue;
      if (!kendiYaninda(r)) continue;
      if (rozetEngelleri.some((e) => kesisir(r, e))) continue;
      if (yerlesenRozetler.some((b) => kesisir(r, b, ROZET_ARASI))) continue;
      yerlesenRozetler.push(r);
      return { gorunur: true, ...r };
    }
    return { ...GIZLI_ROZET };
  };

  let artiX: RozetYerlesimi = { ...GIZLI_ROZET };
  if (xDurum === 'ekranda') {
    // Eksenin sağ ucunda, sayıların OLMADIĞI yanda; düğmeler engelse sola kayar
    const satirlar = xYonu === 'alt' ? [oy - 24, oy + 4] : [oy + 4, oy - 24];
    const adaylar: Array<{ x: number; y: number }> = [];
    for (const y of satirlar) for (let k = 0; k <= 60; k++) adaylar.push({ x: W - 46 - k * 4, y });
    artiX = rozetYerlestir(adaylar, (r) => r.x >= ox + ROZET_TARAF_PAYI);
  }
  let artiY: RozetYerlesimi = { ...GIZLI_ROZET };
  let eksiY: RozetYerlesimi = { ...GIZLI_ROZET };
  if (yDurum === 'ekranda') {
    const sutunlar = yYonu === 'sol' ? [ox + 10, ox - 46] : [ox - 46, ox + 10];
    const ustAdaylar: Array<{ x: number; y: number }> = [];
    const altAdaylar: Array<{ x: number; y: number }> = [];
    for (let k = 0; k <= 40; k++) {
      for (const x of sutunlar) {
        ustAdaylar.push({ x, y: 10 + k * 4 });
        altAdaylar.push({ x, y: H - 30 - k * 4 });
      }
    }
    artiY = rozetYerlestir(ustAdaylar, (r) => r.y + r.h <= oy - ROZET_TARAF_PAYI);
    eksiY = rozetYerlestir(altAdaylar, (r) => r.y >= oy + ROZET_TARAF_PAYI);
  }
  const gorunenRozetler = [artiX, artiY, eksiY].filter((r) => r.gorunur);

  // ---- sayılar
  const sayiEngelleri: Dikdortgen[] = rozetEngelleri;
  const sinirIcinde = (k: Dikdortgen) =>
    k.x >= solPay - 1e-6 && k.x + k.w <= W - K + 1e-6 && k.y >= DIKEY_PAY - 1e-6 && k.y + k.h <= H - DIKEY_PAY + 1e-6;
  const adim = g.adim && g.adim > 0 ? g.adim : adimiBul([...g.xCentikleri, ...g.yCentikleri]);

  const denetle = (s: SayiYerlesimi) => {
    if (!sinirIcinde(s.kutu)) s.neden = 'kenar';
    else if (sayiEngelleri.some((e) => kesisir(s.kutu, e))) s.neden = 'engel';
    else if (gorunenRozetler.some((r) => kesisir(s.kutu, r, ROZET_ARASI))) s.neden = 'rozet';
    s.gorunur = !s.neden;
  };

  const xKati = seyreltmeKati(
    xler,
    adim,
    xler.reduce((m, c) => Math.max(m, tahminiMetinGenisligi(c.metin, fs)), 0) + KOMSU_ARASI
  );
  const yKati = seyreltmeKati(yler, adim, (METIN_UST + METIN_ALT) * fs + 2);
  const seyrekMi = (deger: number, kat: number) => kat > 1 && adim > 0 && Math.abs(Math.round(deger / adim)) % kat !== 0;

  const xOgeleri: EksenOgesi[] = xler.map((c) => {
    const w = tahminiMetinGenisligi(c.metin, fs);
    const sayi: SayiYerlesimi = {
      deger: c.deger,
      metin: c.metin,
      x: c.ekran,
      y: xTaban,
      hiza: 'middle',
      gorunur: true,
      kutu: metinKutusu(c.ekran, xTaban, 'middle', w, fs),
    };
    if (seyrekMi(c.deger, xKati)) {
      sayi.neden = 'seyrek';
      sayi.gorunur = false;
    } else denetle(sayi);
    return {
      deger: c.deger,
      centik: { x1: c.ekran, y1: cizgiY - CENTIK_YARI, x2: c.ekran, y2: cizgiY + CENTIK_YARI },
      centikGorunur: true,
      sayi,
    };
  });

  const yOgeleri: EksenOgesi[] = yler.map((c, i) => {
    const taban = c.ekran + Y_TABAN_KAYMA * fs;
    const sayi: SayiYerlesimi = {
      deger: c.deger,
      metin: c.metin,
      x: yX,
      y: taban,
      hiza: yHiza,
      gorunur: true,
      kutu: metinKutusu(yX, taban, yHiza, yGenislikleri[i], fs),
    };
    if (seyrekMi(c.deger, yKati)) {
      sayi.neden = 'seyrek';
      sayi.gorunur = false;
    } else denetle(sayi);
    return {
      deger: c.deger,
      centik: { x1: cizgiX - CENTIK_YARI, y1: c.ekran, x2: cizgiX + CENTIK_YARI, y2: c.ekran },
      centikGorunur: true,
      sayi,
    };
  });

  // ---- x ve y sayılarının çakışması: köşeye (çentik satırı ile sütununun kesiştiği nokta) en yakın olan düşer
  const koseX = cizgiX;
  const koseY = cizgiY;
  for (const xo of xOgeleri) {
    if (!xo.sayi.gorunur) continue;
    for (const yo of yOgeleri) {
      if (!yo.sayi.gorunur) continue;
      if (!kesisir(xo.sayi.kutu, yo.sayi.kutu, CAPRAZ_ARASI)) continue;
      const xUzaklik = Math.abs(xo.sayi.x - koseX);
      const yUzaklik = Math.abs(yo.sayi.kutu.y + yo.sayi.kutu.h / 2 - koseY);
      if (xUzaklik < yUzaklik) {
        xo.sayi.gorunur = false;
        xo.sayi.neden = 'kesisme';
        break;
      }
      yo.sayi.gorunur = false;
      yo.sayi.neden = 'kesisme';
    }
  }

  // ---- kenara yapışık sırada sayısı düşen çentik de çizilmez. Seyreltilen çentik kalır (sayısız ara çentik),
  // yalnız sayısı yazılsaydı bir katmanın altına / kenar dışına düşecek olanı da çizilmez.
  const yapisikCentikleriAyikla = (ogeler: EksenOgesi[]) => {
    for (const o of ogeler) {
      if (o.sayi.gorunur) continue;
      if (o.sayi.neden !== 'seyrek' || !sinirIcinde(o.sayi.kutu) || sayiEngelleri.some((e) => kesisir(o.sayi.kutu, e)))
        o.centikGorunur = false;
    }
  };
  if (xDurum !== 'ekranda') yapisikCentikleriAyikla(xOgeleri);
  if (yDurum !== 'ekranda') yapisikCentikleriAyikla(yOgeleri);

  return {
    x: { durum: xDurum, cizgiY, sayiYonu: xYonu, ogeler: xOgeleri },
    y: { durum: yDurum, cizgiX, sayiYonu: yYonu, ogeler: yOgeleri },
    rozetler: { artiX, artiY, eksiY },
    orijinRozeti,
  };
}
