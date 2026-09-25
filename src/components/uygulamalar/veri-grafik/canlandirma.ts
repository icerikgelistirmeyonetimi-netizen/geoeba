/**
 * Veri ve Grafik — "Veri topla" deneylerinin canlandırma planı (saf, React'siz; VT §11.10).
 *
 * Bir "20 kez at" çalışmasında kaç atışın sahnede canlandırılacağını, her birinin süresini ve kalanın anında
 * (rAF parçalarıyla) yapılacağını belirler. Hedef süreler: 20 atış Otomatik ≈ 8 s, 30 atış ≈ 12 s, 100 atış ≈ 3 s,
 * 2000 atış ≤ 1,5 s; çarkta (çevirme ≥ 1000 ms) 20 çevirme ≈ 7,8 s, 100 çevirme ≈ 2,6 s. Azaltılmış harekette her şey
 * anındadır.
 *
 * Tek hareket kuralı: anında kısmında sahne durur (son sonucu gösterir); satır parlaması ve nokta halkası yalnız
 * canlandırılan atışlarda olur. Canlandırma bileşenleri (toplama/useDeneyCalistirici, sahneler) bu modülü kullanır.
 * İçe aktarma: `deney.ts` (fiil) ve türler; `durum.ts` içe aktarılmaz.
 */
import type { DeneyNesnesi, HizSecimi } from './arastirma';
import { TABLOYA_YAZMA_SINIRI, fiil } from './deney';
import type { Uretec } from './rastgele';

/** Seçilebilir hızların bir atış süresi (ms): Yavaş, Orta, Hızlı, Anında */
export const HIZ_SURELERI = [1400, 700, 220, 0] as const;
/** Hız adları (HIZ_SURELERI sırasıyla) */
export const HIZ_ADLARI = ['Yavaş', 'Orta', 'Hızlı', 'Anında'] as const;

/** Hız menüsünün öğeleri (sırasıyla): Otomatik (önerilen) · Yavaş · Orta · Hızlı · Anında */
export const HIZ_MENUSU: readonly { hiz: HizSecimi; ad: string }[] = [
  { hiz: 'oto', ad: 'Otomatik (önerilen)' },
  { hiz: 0, ad: HIZ_ADLARI[0] },
  { hiz: 1, ad: HIZ_ADLARI[1] },
  { hiz: 2, ad: HIZ_ADLARI[2] },
  { hiz: 3, ad: HIZ_ADLARI[3] },
];

/** Otomatik hızda bir atışın süresi: 10 atışa kadar 700 ms, 30 atışa kadar 400 ms, sonrasında ilk 10 atış 220 ms */
export const OTOMATIK_SURELER = { az: 700, orta: 400, cok: 220 } as const;
/** 30 atışa kadar bütün atışlar canlandırılır; daha çoğunda yalnız ilk 10 atış (bütçe) */
export const BUTUN_ATISLAR_SINIRI = 30;
export const GORUNUR_BUTCE = 10;
/** Sahneye dokunarak yapılan tek atışın süresi; çarkta tek çevirme */
export const TEK_ATIS_SURESI = 900;
export const TEK_CEVIRME_SURESI = 1400;
/** Çarkta görünür bir çevirme en az bu kadar sürer */
export const CARK_EN_AZ_SURE = 1000;
/**
 * Çarkta görünür çevirme bütçesi (Otomatik ve Hızlı). Bir çevirme 1000 ms'den kısa olamaz, ardından sonuç okunsun diye
 * kısa bir duruş gelir (`carkSonucDurusu`): 30 çevirmeye kadar ilk 6 (≈ 7,8 s), daha çoğunda ilk 2 çevirme (≈ 2,6 s)
 * görünür, kalanı anında. Böylece 20 çevirme ≤ 10 s ve 100 çevirme ≤ 4 s sürer (VT §16-10). Yavaş ve Orta seçilince
 * öğretmen izlemek istemiştir; bütün çevirmeler (30'a kadar) görünür kalır.
 */
export const CARK_GORUNUR_BUTCE = { az: 6, cok: 2 } as const;
/** Yeni nokta halkası (ms); azaltılmış harekette halka bu süre durağan kalır */
export const YENI_NOKTA_HALKASI = 700;
export const AZALTILMIS_HALKA = 1000;
/** Yeni satır parlaması (ms) */
export const YENI_SATIR_PARLAMASI = 600;
/** Anında kipinde bir karede en çok bu kadar iş yapılır (ms) */
export const ANINDA_KARE_BUTCESI = 24;
/** Tahmin için anında yapılan bir atışın ortalama maliyeti (ms): 2000 atış ≈ 1 s */
export const ANINDA_ATIS_MALIYETI = 0.5;
/** Sayı küpünün yüzü dönerken bu aralıkla değişir (ms) */
export const ZAR_YUZ_ARALIGI = 90;

/** Hız menüsündeki ad: "Otomatik" · "Yavaş" · "Orta" · "Hızlı" · "Anında" */
export function hizAdi(hiz: HizSecimi): string {
  return hiz === 'oto' ? 'Otomatik' : HIZ_ADLARI[hiz];
}

export interface CanlandirmaPlani {
  /** baştan kaç atış sahnede canlandırılır */
  gorunur: number;
  /** canlandırılan her atışın süresi (ms; çarkta en az 1000) */
  sure: number;
  /** kalan atışlar anında yapılır */
  aninda: number;
  /** hız seçimi kilitli mi (500 ve üstü atış ya da azaltılmış hareket: her şey anında) */
  kilitli: boolean;
}

/**
 * Canlandırma planı (VT §11.10):
 * - Otomatik: n ≤ 10 her atış 700 ms; 11–30 her atış 400 ms; 31–499 ilk 10 atış 220 ms, kalanı anında; ≥ 500 anında.
 * - Yavaş (1400) · Orta (700) · Hızlı (220): n ≤ 30 her atış seçilen sürede; 31–499 ilk 10 atış seçilen sürede,
 *   kalanı anında; ≥ 500 anında.
 * - Anında ve azaltılmış hareket: hepsi anında.
 * - Çarkta görünür bir çevirme en az 1000 ms sürer; Otomatik ve Hızlı'da görünür çevirme sayısı `CARK_GORUNUR_BUTCE`
 *   ile sınırlıdır (n ≤ 30 ilk 6, daha çoğunda ilk 2), kalanı anında.
 */
export function canlandirmaPlani(n: number, hiz: HizSecimi, azaltilmis: boolean, nesne: DeneyNesnesi): CanlandirmaPlani {
  const adet = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const kilitli = azaltilmis || adet >= TABLOYA_YAZMA_SINIRI;
  if (kilitli || hiz === 3 || adet === 0) return { gorunur: 0, sure: 0, aninda: adet, kilitli };
  let sure: number;
  let gorunur: number;
  if (hiz === 'oto') {
    sure = adet <= 10 ? OTOMATIK_SURELER.az : adet <= BUTUN_ATISLAR_SINIRI ? OTOMATIK_SURELER.orta : OTOMATIK_SURELER.cok;
    gorunur = adet <= BUTUN_ATISLAR_SINIRI ? adet : GORUNUR_BUTCE;
  } else {
    sure = HIZ_SURELERI[hiz];
    gorunur = adet <= BUTUN_ATISLAR_SINIRI ? adet : GORUNUR_BUTCE;
  }
  if (nesne === 'cark') {
    sure = Math.max(sure, CARK_EN_AZ_SURE);
    // Çevirme kısalamadığı için hızlı seçimlerde görünür çevirme sayısı azalır (Hızlı, Orta'yla aynı sürmesin)
    if (hiz === 'oto' || hiz === 2) {
      gorunur = Math.min(gorunur, adet <= BUTUN_ATISLAR_SINIRI ? CARK_GORUNUR_BUTCE.az : CARK_GORUNUR_BUTCE.cok);
    }
  }
  return { gorunur, sure, aninda: adet - gorunur, kilitli: false };
}

/**
 * Çarkta ibre durunca sonucun okunması için kısa duruş (ms): T × 0,25 + 60, en çok 300 (1000 ms'lik çevirmede 300).
 * Deney motoru görünür her çevirmeden sonra bu kadar bekler.
 */
export function carkSonucDurusu(sure: number): number {
  return Math.min(300, Math.round(Math.max(0, sure) * 0.25 + 60));
}

/**
 * Planın tahmini süresi (ms): canlandırılan atışlar + anında kısmın kaba maliyeti. Nesne çark verilirse her görünür
 * çevirmeden sonraki sonuç duruşu da eklenir.
 */
export function tahminiSure(p: CanlandirmaPlani, nesne?: DeneyNesnesi): number {
  const durus = nesne === 'cark' && p.sure > 0 ? carkSonucDurusu(p.sure) : 0;
  return p.gorunur * (p.sure + durus) + Math.ceil(p.aninda * ANINDA_ATIS_MALIYETI);
}

/** Sahneye dokunarak tek atış (ya da çarkta tek çevirme) süresi; azaltılmış harekette 0 */
export function tekAtisSuresi(nesne: DeneyNesnesi, azaltilmis: boolean): number {
  if (azaltilmis) return 0;
  return nesne === 'cark' ? TEK_CEVIRME_SURESI : TEK_ATIS_SURESI;
}

export interface AsamaOranlari {
  /** sonuç yüzünün (ya da topun) göründüğü an, sürenin oranı; çarkta null (ibre durunca) */
  sonuc: number | null;
  /** satırın tabloya yazıldığı an (nokta ve satır birlikte belirir); çarkta null (`transitionend`) */
  satir: number | null;
}

/**
 * Canlandırmanın aşamaları (sürenin oranı olarak): para sonuç %55, satır %80; sayı küpü ikisi de %70; torba top %45'te
 * ağızdan çıkar, satır %85; çarkta sonuç ve satır ibrenin `transitionend`'inde (yedek zaman aşımı `carkYedekSuresi`).
 */
export function asamaOranlari(nesne: DeneyNesnesi): AsamaOranlari {
  switch (nesne) {
    case 'zar':
    case 'iki-zar':
      return { sonuc: 0.7, satir: 0.7 };
    case 'torba':
      return { sonuc: 0.45, satir: 0.85 };
    case 'cark':
      return { sonuc: null, satir: null };
    default:
      return { sonuc: 0.55, satir: 0.8 };
  }
}

/** Çarkın `transitionend` gelmezse sonucu yazan yedek zaman aşımı: T × 0,8 + 900 ms */
export function carkYedekSuresi(sure: number): number {
  return Math.round(Math.max(0, sure) * 0.8 + 900);
}

/** Bir sayı küpü canlandırmasında dönerken gösterilecek ara yüz sayısı (sürenin %70'i, 90 ms'de bir) */
export function zarYuzAdedi(sure: number): number {
  return Math.max(0, Math.floor((Math.max(0, sure) * 0.7) / ZAR_YUZ_ARALIGI));
}

/**
 * Dönerken gösterilen ara yüzler (1–6): art arda iki yüz aynı olmaz; `son` verilirse son ara yüz ondan farklıdır
 * (sonuç yüzüne geçiş görünür). Tohumlu üreteçle kararlıdır.
 */
export function zarYuzDizisi(rnd: Uretec, adet: number, son?: number): number[] {
  const n = Number.isFinite(adet) ? Math.max(0, Math.floor(adet)) : 0;
  const yuzler: number[] = [];
  for (let i = 0; i < n; i++) {
    const onceki = yuzler[i - 1];
    const yasak = new Set<number>();
    if (onceki !== undefined) yasak.add(onceki);
    if (i === n - 1 && son !== undefined) yasak.add(son);
    const adaylar = [1, 2, 3, 4, 5, 6].filter((y) => !yasak.has(y));
    yuzler.push(adaylar[Math.min(adaylar.length - 1, Math.floor(rnd() * adaylar.length))]);
  }
  return yuzler;
}

/**
 * Görünür atış bütçesi devredeyse sahne kartının durum notu: "İlk 10 atış görünür, kalanı hızlı" (çarkta
 * "İlk 10 çevirme …", torbada "İlk 10 çekiş …"). Bütün atışlar görünürse ya da hepsi anındaysa null.
 */
export function butceMetni(p: CanlandirmaPlani, nesne: DeneyNesnesi): string | null {
  if (p.gorunur === 0 || p.aninda === 0) return null;
  return `İlk ${p.gorunur} ${fiil(nesne)} görünür, kalanı hızlı`;
}

/**
 * Hız menüsünün kilit notu: 500 ve üstünde "500 ve üstü atış anında yapılır ve yalnız Deney özetine yazılır.";
 * azaltılmış harekette "Sistemde hareket azaltıldığı için sonuçlar anında yazılır." Kilit yoksa null.
 */
export function hizKilidiMetni(n: number, azaltilmis: boolean, nesne: DeneyNesnesi): string | null {
  if (azaltilmis) return 'Sistemde hareket azaltıldığı için sonuçlar anında yazılır.';
  if (n >= TABLOYA_YAZMA_SINIRI) return `${TABLOYA_YAZMA_SINIRI} ve üstü ${fiil(nesne)} anında yapılır ve yalnız Deney özetine yazılır.`;
  return null;
}
