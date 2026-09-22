/**
 * Pencere hareketlerinin geometrisi ve oynatıcısı.
 *
 * Kendi çizimimiz "huni" hareketi (düz kenarlı; hazır bir masaüstü efektinin kopyası değil): pencere
 * görev çubuğundaki uygulama düğmesinden (yuvasından) dar bir şerit olarak çıkar, üst kenarı
 * yükselip genişler, sonra alt kenarı da yerine oturur; küçültülünce tersi — alt kenar daralarak
 * yuvanın üstüne iner (huni), ardından üst kenar huniden aşağı kayar ve pencere yuvaya girer.
 * Her ara kare bir düzlem homografisidir (homografi.ts → matrix3d): pencerenin dört köşesi
 * hedef dörtgene taşınır, içerik de onunla birlikte perspektifle çarpılır. Kapanış hafif çekilip
 * sönme, büyüt / geri al eski dikdörtgenden yenisine kaymadır (merkez kökenli translate + scale).
 * Hesap DOM'dan bağımsızdır (dikdörtgenler getBoundingClientRect'ten gelir). Oynatıcı Web
 * Animations API kullanır; az hareket tercihinde ya da API yokluğunda hareket atlanır ve bitiş geri
 * çağrısı hemen çalışır.
 */
import type { Dikdortgen } from './akis';
import { homografi, type Kose } from './homografi';

export interface Donusum {
  /** Merkezden merkeze öteleme (px) */
  x: number;
  y: number;
  /** Ölçek (hedef / pencere) */
  sx: number;
  sy: number;
}

/** Ölçek alt sınırı: 0 tekil matris verir (tarayıcı çizmez), çok küçük ölçek de titrer */
export const EN_KUCUK_OLCEK = 0.02;

/** Hareket eğrisi: sinif.module.css'teki --gecis ile aynı (yumuşak, sonu yavaşlayan) */
export const HAREKET_EGRISI = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** Görev çubuğu düğmesi bulunamazsa kullanılan yuva ölçüsü (px) */
export const YEDEK_YUVA = { w: 160, h: 46 } as const;

/** DOMRect benzeri bir ölçüyü sade dikdörtgene çevirir. */
export function dikdortgen(r: { left: number; top: number; width: number; height: number }): Dikdortgen {
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/**
 * Pencereyi (doğal yerinde) `hedef` dikdörtgenine indiren dönüşüm: merkezler çakışır, ölçek
 * hedef/pencere. Büyüt/geri al geçişinde `hedef` pencerenin eski dikdörtgenidir (FLIP).
 */
export function hedefeDonusum(pencere: Dikdortgen, hedef: Dikdortgen): Donusum {
  const x = hedef.x + hedef.w / 2 - (pencere.x + pencere.w / 2);
  const y = hedef.y + hedef.h / 2 - (pencere.y + pencere.h / 2);
  const sx = pencere.w > 0 ? Math.max(EN_KUCUK_OLCEK, hedef.w / pencere.w) : 1;
  const sy = pencere.h > 0 ? Math.max(EN_KUCUK_OLCEK, hedef.h / pencere.h) : 1;
  return { x, y, sx, sy };
}

/** Görev çubuğu düğmesi yoksa: alanın alt orta kenarı (pencere yine aşağıdan yukarı çekilir). */
export function yedekYuva(alan: Dikdortgen): Dikdortgen {
  const w = Math.min(YEDEK_YUVA.w, Math.max(0, alan.w));
  return { x: alan.x + (alan.w - w) / 2, y: alan.y + alan.h, w, h: YEDEK_YUVA.h };
}

function yuvarla(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** CSS transform metni (translate → scale; origin merkez). */
export function donusumMetni(d: Donusum): string {
  return `translate(${yuvarla(d.x)}px, ${yuvarla(d.y)}px) scale(${yuvarla(d.sx)}, ${yuvarla(d.sy)})`;
}

/**
 * Huni yolunun kare sayısı. Tarayıcılar iki matrix3d arasını ayrıştırarak (döndürme/eğme/perspektif
 * bileşenlerine bölerek) ara değerler; izdüşümlü (perspektifli) matrislerde bu ara kareler çarpık
 * çıkar. Bu yüzden kareler arası ara değerleme yapılmaz (easing 'step-end'): her ekran karesinde tam
 * bir homografi gösterilir. 48 kare, 400–460 ms'de 60–120 Hz için kare başına yaklaşık bir örnektir.
 */
export const HUNI_ADIM = 48;

/**
 * Huni evreleri (t oranları). İlk evrede köşeler yuvaya doğru kısmen çekilir: alt köşeler yuvanın
 * üst köşelerine ALT_PAY, üst köşeler UST_PAY oranında yaklaşır — pencere daralır, aşağı kayar ve
 * altı üstünden dar bir huni olur (oran yaklaşık 1,6:1; daha sert bir daralma izdüşümde içeriği
 * "uzaklaşan düzlem" gibi çarpıtıyordu). İkinci evrede bütün köşeler yuvanın köşelerine varır.
 */
export const HUNI_EVRE = {
  /** İlk evre: t ∈ [0, ILK] */
  ILK: 0.6,
  /** İkinci evre: t ∈ [IKINCI, 1] (evreler örtüşür, akıcı olsun) */
  IKINCI: 0.4,
  /** Üst köşelerin ilk evrede yuvaya yaklaşma payı */
  UST_PAY: 0.45,
  /** Alt köşelerin ilk evrede yuvaya yaklaşma payı */
  ALT_PAY: 0.7,
  /** Yuvaya girerken solma başlangıcı */
  SOLMA: 0.75,
  /** Yuvadaki (en küçük) görünürlük */
  EN_SOLUK: 0.3,
} as const;

function sinirla01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

/** Yumuşak giriş-çıkış (ease-in-out cubic), [0,1] dışı kırpılır. */
export function yumusak(t: number): number {
  const u = sinirla01(t);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

function ara(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function koseAra(a: Kose, b: Kose, t: number): Kose {
  return [ara(a[0], b[0], t), ara(a[1], b[1], t)];
}

/**
 * Huni yolu: t = 0 pencerenin kendi dikdörtgeni, t = 1 yuva dikdörtgeni. İlk evrede alt köşeler
 * yuvanın üst köşelerine ALT_PAY, üst köşeler UST_PAY oranında yaklaşır (pencere daralarak aşağı
 * kayar, altı dar bir huni); ikinci evrede üst köşeler yuvanın üst, alt köşeler yuvanın alt
 * köşelerine kayar. Köşeler TL, TR, BR, BL sırasında, pencerenin doğal sol üstüne göre px
 * (transform-origin 0 0).
 */
export function huniKoseleri(pencere: Dikdortgen, yuva: Dikdortgen, t: number): Kose[] {
  const yx = yuva.x - pencere.x;
  const yy = yuva.y - pencere.y;
  const pTL: Kose = [0, 0];
  const pTR: Kose = [pencere.w, 0];
  const pBR: Kose = [pencere.w, pencere.h];
  const pBL: Kose = [0, pencere.h];
  const yTL: Kose = [yx, yy];
  const yTR: Kose = [yx + yuva.w, yy];
  const yBR: Kose = [yx + yuva.w, yy + yuva.h];
  const yBL: Kose = [yx, yy + yuva.h];
  const ilk = yumusak(t / HUNI_EVRE.ILK);
  const ikinci = yumusak((t - HUNI_EVRE.IKINCI) / (1 - HUNI_EVRE.IKINCI));
  return [
    koseAra(koseAra(pTL, yTL, HUNI_EVRE.UST_PAY * ilk), yTL, ikinci),
    koseAra(koseAra(pTR, yTR, HUNI_EVRE.UST_PAY * ilk), yTR, ikinci),
    koseAra(koseAra(pBR, yTR, HUNI_EVRE.ALT_PAY * ilk), yBR, ikinci),
    koseAra(koseAra(pBL, yTL, HUNI_EVRE.ALT_PAY * ilk), yBL, ikinci),
  ];
}

/** Yuvaya girmiş/çıkmış oranına göre görünürlük: son çeyrekte EN_SOLUK'a iner. */
export function huniGorunurlugu(t: number): number {
  return 1 - (1 - HUNI_EVRE.EN_SOLUK) * yumusak((t - HUNI_EVRE.SOLMA) / (1 - HUNI_EVRE.SOLMA));
}

/** Huni karelerinin bütün-hareket zaman eğrisi: eğri örneklere işlidir, üstüne eğri binmemeli */
export const HUNI_EGRISI = 'linear';

/**
 * Yuva hareketinin kareleri: 'ac' yuvadan pencereye (t: 1 → 0), 'kucult' pencereden yuvaya
 * (t: 0 → 1). Eğri örneklere işlenmiştir; kareler arası ara değerleme yoktur ('step-end', bk.
 * HUNI_ADIM) ve oynatırken bütün-hareket eğrisi HUNI_EGRISI ('linear') olmalıdır — varsayılan
 * ease-out eğrisi huniyi ilk 60 ms'e sıkıştırıp kalan sürede son kareyi tutuyordu. Pencere kendi
 * yerindeyken dönüşüm 'none' (bitişte kalıntı kalmasın).
 */
export function yuvaKareleri(pencere: Dikdortgen, yuva: Dikdortgen, yon: 'ac' | 'kucult', adim = HUNI_ADIM): Keyframe[] {
  const kareler: Keyframe[] = [];
  for (let i = 0; i <= adim; i++) {
    const u = i / adim;
    const t = yon === 'kucult' ? u : 1 - u;
    kareler.push({
      offset: u,
      transform: t <= 0 ? 'none' : homografi(pencere.w, pencere.h, huniKoseleri(pencere, yuva, t)),
      transformOrigin: '0 0',
      opacity: huniGorunurlugu(t),
      easing: 'step-end',
    });
  }
  return kareler;
}

/** Kapanış: hafif çekilip söner (yuvaya gitmez; uygulama bitmiştir). */
export const KAPANIS_KARELERI: readonly Keyframe[] = [
  { transform: 'none', opacity: 1 },
  { transform: 'scale(0.94)', opacity: 0 },
];

/** Büyüt / geri al: eski dikdörtgenden yenisine (FLIP). */
export function boyutKareleri(d: Donusum): Keyframe[] {
  return [{ transform: donusumMetni(d) }, { transform: 'none' }];
}

/** Kullanıcı az hareket istemiş mi (prefers-reduced-motion). */
export function hareketAzaltilmis(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface OynatmaSecenekleri {
  /** Süre (ms); 0 ise animasyon atlanır */
  sure: number;
  /** 'forwards': son kare, eleman gizlenip/sökülüp iptal edilene dek tutulur (çıkış hareketleri) */
  doldur?: 'none' | 'forwards' | 'backwards';
  /** Bütün hareketin zaman eğrisi (EffectTiming.easing); varsayılan HAREKET_EGRISI, huni karelerinde HUNI_EGRISI */
  egri?: string;
}

/** Animasyon oynatabilen en küçük eleman arayüzü (testte sahte nesne). */
export interface Oynatilabilir {
  animate?: (kareler: Keyframe[], secenekler: KeyframeAnimationOptions) => Pick<Animation, 'cancel' | 'finish' | 'onfinish'> & Partial<Pick<Animation, 'currentTime' | 'playState'>>;
}

/** Bitiş olayı gelmezse `bitti`nin yine de çağrılacağı ek süre (ms) */
export const BITIS_PAYI = 250;

/**
 * Elemanı verilen karelerle oynatır; bitince `bitti` bir kez çağrılır. Süre 0, az hareket tercihi
 * ya da API yokluğunda hareket atlanır ve `bitti` hemen çalışır. Bitiş olayı çizim karesine
 * bağlıdır: sekme arka plandayken ya da ana iş parçacığı tıkalıyken gecikebilir; süre + BITIS_PAYI
 * sonra bir yedek zamanlayıcı bakar: hareket duraklatılmışsa ya da (yavaşlatılmış da olsa) hâlâ
 * ilerliyorsa bekler, ilerlemiyorsa son kareye atlatır ve `bitti`yi çağırır ki görüntü ile durum
 * makinesi (küçültme, kapanış) birbirinden kopmasın, hiçbiri asılı kalmasın.
 * Dönen işlev hareketi iptal eder ve tutulan kareyi bırakır (`bitti` bir daha çağrılmaz); eleman
 * sökülürken ve 'kucuk' olunca çağrılır.
 */
export function oynat(el: Oynatilabilir, kareler: readonly Keyframe[], secenekler: OynatmaSecenekleri, bitti?: () => void): () => void {
  if (secenekler.sure <= 0 || typeof el.animate !== 'function' || hareketAzaltilmis()) {
    bitti?.();
    return () => {};
  }
  const hareket = el.animate([...kareler], {
    duration: secenekler.sure,
    easing: secenekler.egri ?? HAREKET_EGRISI,
    fill: secenekler.doldur ?? 'backwards',
  });
  let iptal = false;
  let bittiCagrildi = false;
  const bitir = () => {
    if (iptal || bittiCagrildi) return;
    bittiCagrildi = true;
    clearTimeout(yedek);
    bitti?.();
  };
  let yedek: ReturnType<typeof setTimeout>;
  let sonZaman = -1;
  const kontrol = () => {
    const simdi = Number(hareket.currentTime ?? 0);
    const ilerliyor = hareket.playState === 'running' && simdi > sonZaman && simdi < secenekler.sure;
    if (hareket.playState === 'paused' || ilerliyor) {
      sonZaman = simdi;
      yedek = setTimeout(kontrol, secenekler.sure + BITIS_PAYI);
      return;
    }
    hareket.finish();
    bitir();
  };
  yedek = setTimeout(kontrol, secenekler.sure + BITIS_PAYI);
  hareket.onfinish = bitir;
  return () => {
    iptal = true;
    clearTimeout(yedek);
    hareket.cancel();
  };
}
