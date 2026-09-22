/**
 * Olasılık Laboratuvarı — saf olasılık hesapları.
 *
 * Şablonların örnek uzayını kurar, istenen durumu sayar, kesirleri sadeleştirir ve teorik
 * olasılığı formülüyle verir. React'tan ve DOM'dan bağımsızdır; vitest ile sınanır.
 */

// ---------------------------------------------------------------------------
// Şablonlar
// ---------------------------------------------------------------------------
export type SablonTuru = 'para' | 'zar' | 'cark' | 'torba' | 'kart' | 'galton';

export type ParaYuzu = 'tura' | 'yazi';

/** Zar için istenen durum; iki zar seçeneğinde sayılar toplam (2–12) üzerinden okunur. */
export type ZarKosulu =
  | { tip: 'sayi'; deger: number }
  | { tip: 'cift' }
  | { tip: 'tek' }
  | { tip: 'enAz'; deger: number }
  | { tip: 'enFazla'; deger: number };

export interface CarkDilimi {
  ad: string;
  renk: string;
  /** Tam sayı genişlik (1–10); dilimler eşit olmayınca teorik olasılık değişir. */
  genislik: number;
}

export interface TorbaBilyesi {
  ad: string;
  renk: string;
  adet: number;
}

export type KartTuru = 'kupa' | 'karo' | 'maca' | 'sinek';
export type KartRengi = 'kirmizi' | 'siyah';
export const KART_DEGERLERI = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type KartDegeri = (typeof KART_DEGERLERI)[number];

export type KartKosulu =
  | { tip: 'renk'; deger: KartRengi }
  | { tip: 'tur'; deger: KartTuru }
  | { tip: 'deger'; deger: KartDegeri };

/**
 * Galton tahtası için istenen durum. Kutular iç temsilde 0..n (sağa sapma sayısı k); arayüzde
 * 1..n+1 diye numaralanır. 'orta': n çiftse k = n/2, tekse k ∈ {(n−1)/2, (n+1)/2}.
 */
export type GaltonKosulu =
  | { tip: 'kutu'; kutu: number }
  | { tip: 'enAz'; kutu: number }
  | { tip: 'enFazla'; kutu: number }
  | { tip: 'orta' };

export type Sablon =
  | { tur: 'para'; istenen: ParaYuzu }
  | { tur: 'zar'; ikiZar: boolean; istenen: ZarKosulu }
  | { tur: 'cark'; dilimler: CarkDilimi[]; istenenRenk: string }
  | { tur: 'torba'; bilyeler: TorbaBilyesi[]; iadeli: boolean; istenenRenk: string }
  | { tur: 'kart'; istenen: KartKosulu }
  /** satir: çivi satırı sayısı n (2–10) */
  | { tur: 'galton'; satir: number; istenen: GaltonKosulu };

// ---------------------------------------------------------------------------
// Sonuçlar (tek denemenin çıktısı)
// ---------------------------------------------------------------------------
export interface Kart {
  tur: KartTuru;
  deger: KartDegeri;
}

export type Sonuc =
  | { tur: 'para'; yuz: ParaYuzu }
  | { tur: 'zar'; zarlar: number[] }
  | { tur: 'cark'; dilim: number }
  | { tur: 'torba'; renk: string }
  | { tur: 'kart'; kart: Kart }
  /** yol: her çivi satırında 0 = sol, 1 = sağ (uzunluk n); kutu = yol toplamı (0..n) */
  | { tur: 'galton'; yol: number[]; kutu: number };

/** Örnek uzayın bir elemanı: ağırlık, eşit olasılıklı temel durum sayısıdır (çark genişliği, bilye adedi). */
export interface TemelDurum {
  etiket: string;
  agirlik: number;
  sonuc: Sonuc;
}

export interface OrnekUzay {
  durumlar: TemelDurum[];
  /** Ağırlıkların toplamı (payda) */
  toplam: number;
}

export interface Kesir {
  pay: number;
  payda: number;
}

export interface TeorikOlasilik {
  /** İstenen temel durum sayısı */
  istenen: number;
  /** Tüm temel durum sayısı */
  tum: number;
  kesir: Kesir;
  deger: number;
  /** Ör. "İstenen / Tüm durumlar = 2 / 6 = 1/3 ≈ %33,3" */
  formul: string;
}

// ---------------------------------------------------------------------------
// Sabitler ve ön tanımlar
// ---------------------------------------------------------------------------
export const KART_TURLERI: KartTuru[] = ['kupa', 'karo', 'maca', 'sinek'];

export const KART_TURU_ADI: Record<KartTuru, string> = { kupa: 'Kupa', karo: 'Karo', maca: 'Maça', sinek: 'Sinek' };
export const KART_TURU_SEMBOLU: Record<KartTuru, string> = { kupa: '♥', karo: '♦', maca: '♠', sinek: '♣' };

export function kartRengi(tur: KartTuru): KartRengi {
  return tur === 'kupa' || tur === 'karo' ? 'kirmizi' : 'siyah';
}

/** Çark/torba için hazır renkler (ada paleti). */
export const RENK_SECENEKLERI: { ad: string; renk: string }[] = [
  { ad: 'Kırmızı', renk: '#c9463d' },
  { ad: 'Mavi', renk: '#216a78' },
  { ad: 'Sarı', renk: '#e0b64a' },
  { ad: 'Yeşil', renk: '#3f9a6a' },
  { ad: 'Turuncu', renk: '#d9805f' },
  { ad: 'Mor', renk: '#7f88c4' },
  { ad: 'Turkuaz', renk: '#2a9d94' },
  { ad: 'Pembe', renk: '#d97aa0' },
];

export const CARK_EN_AZ_DILIM = 2;
export const CARK_EN_COK_DILIM = 8;
export const CARK_EN_COK_GENISLIK = 10;
export const TORBA_EN_COK_ADET = 20;
export const GALTON_EN_AZ_SATIR = 2;
export const GALTON_EN_COK_SATIR = 10;
export const GALTON_VARSAYILAN_SATIR = 6;

export function varsayilanSablon(tur: SablonTuru): Sablon {
  switch (tur) {
    case 'para':
      return { tur: 'para', istenen: 'tura' };
    case 'zar':
      return { tur: 'zar', ikiZar: false, istenen: { tip: 'sayi', deger: 6 } };
    case 'cark':
      return {
        tur: 'cark',
        dilimler: RENK_SECENEKLERI.slice(0, 4).map((r) => ({ ...r, genislik: 1 })),
        istenenRenk: RENK_SECENEKLERI[0].ad,
      };
    case 'torba':
      return {
        tur: 'torba',
        bilyeler: [
          { ...RENK_SECENEKLERI[0], adet: 3 },
          { ...RENK_SECENEKLERI[1], adet: 5 },
          { ...RENK_SECENEKLERI[2], adet: 2 },
        ],
        iadeli: true,
        istenenRenk: RENK_SECENEKLERI[0].ad,
      };
    case 'kart':
      return { tur: 'kart', istenen: { tip: 'tur', deger: 'kupa' } };
    case 'galton':
      return { tur: 'galton', satir: GALTON_VARSAYILAN_SATIR, istenen: { tip: 'orta' } };
  }
}

// ---------------------------------------------------------------------------
// Binom katsayıları (Galton tahtası)
// ---------------------------------------------------------------------------
/** C(n, k): n satırlık tahtada k kez sağa sapan yol sayısı. Aralık dışı → 0. */
export function binom(n: number, k: number): number {
  n = Math.trunc(n);
  k = Math.trunc(k);
  if (!(n >= 0) || k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return Math.round(c);
}

/** Pascal üçgeninin n. satırı: C(n,0) … C(n,n). */
export function pascalSatiri(n: number): number[] {
  const m = Math.max(0, Math.trunc(n));
  return Array.from({ length: m + 1 }, (_, k) => binom(m, k));
}

/** Her kutunun teorik olasılığı C(n,k) / 2^n (soldan sağa). */
export function galtonTeorikOranlar(n: number): number[] {
  const tum = 2 ** Math.max(0, Math.trunc(n));
  return pascalSatiri(n).map((c) => c / tum);
}

/** Kutu (0..n) Galton koşulunu sağlıyor mu? */
export function galtonKosuluSaglar(kosul: GaltonKosulu, n: number, kutu: number): boolean {
  switch (kosul.tip) {
    case 'orta':
      return n % 2 === 0 ? kutu === n / 2 : kutu === (n - 1) / 2 || kutu === (n + 1) / 2;
    case 'kutu':
      return kutu === kosul.kutu;
    case 'enAz':
      return kutu >= kosul.kutu;
    case 'enFazla':
      return kutu <= kosul.kutu;
  }
}

/** Sayım sözlüğünden kutu başına sayım dizisi (uzunluk n+1, soldan sağa). */
export function galtonKutuSayimlari(n: number, sayimlar: Record<string, number>): number[] {
  return Array.from({ length: Math.max(0, Math.trunc(n)) + 1 }, (_, k) => Math.max(0, sayimlar[`g:${k}`] ?? 0));
}

// ---------------------------------------------------------------------------
// Kesir ve biçimleme
// ---------------------------------------------------------------------------
export function ebob(a: number, b: number): number {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Kesri sadeleştirir; 0/n → 0/1, payda 0 → 0/1 (hatalı giriş çökertmez). */
export function kesirSadelestir(pay: number, payda: number): Kesir {
  if (!Number.isFinite(pay) || !Number.isFinite(payda) || payda === 0) return { pay: 0, payda: 1 };
  if (pay === 0) return { pay: 0, payda: 1 };
  const b = ebob(pay, payda);
  return { pay: pay / b, payda: payda / b };
}

export function kesirMetni(k: Kesir): string {
  return `${k.pay}/${k.payda}`;
}

/** Türkçe ondalık: 0,3333 → "%33,3". */
export function yuzdeMetni(deger: number, basamak = 1): string {
  if (!Number.isFinite(deger)) return '—';
  const s = (deger * 100).toFixed(basamak).replace('.', ',');
  return `%${s}`;
}

// ---------------------------------------------------------------------------
// Örnek uzay
// ---------------------------------------------------------------------------
export function ornekUzay(sablon: Sablon): OrnekUzay {
  const durumlar: TemelDurum[] = [];
  switch (sablon.tur) {
    case 'para':
      durumlar.push({ etiket: 'Tura', agirlik: 1, sonuc: { tur: 'para', yuz: 'tura' } });
      durumlar.push({ etiket: 'Yazı', agirlik: 1, sonuc: { tur: 'para', yuz: 'yazi' } });
      break;
    case 'zar':
      if (sablon.ikiZar) {
        for (let a = 1; a <= 6; a++)
          for (let b = 1; b <= 6; b++)
            durumlar.push({ etiket: `(${a}, ${b})`, agirlik: 1, sonuc: { tur: 'zar', zarlar: [a, b] } });
      } else {
        for (let a = 1; a <= 6; a++) durumlar.push({ etiket: String(a), agirlik: 1, sonuc: { tur: 'zar', zarlar: [a] } });
      }
      break;
    case 'cark':
      sablon.dilimler.forEach((d, i) => {
        const g = Math.max(0, Math.trunc(d.genislik));
        if (g > 0) durumlar.push({ etiket: d.ad, agirlik: g, sonuc: { tur: 'cark', dilim: i } });
      });
      break;
    case 'torba':
      for (const b of sablon.bilyeler) {
        const n = Math.max(0, Math.trunc(b.adet));
        if (n > 0) durumlar.push({ etiket: b.ad, agirlik: n, sonuc: { tur: 'torba', renk: b.ad } });
      }
      break;
    case 'kart':
      for (const tur of KART_TURLERI)
        for (const deger of KART_DEGERLERI)
          durumlar.push({ etiket: `${deger}${KART_TURU_SEMBOLU[tur]}`, agirlik: 1, sonuc: { tur: 'kart', kart: { tur, deger } } });
      break;
    case 'galton': {
      // Tüm 2^n yol eşit olasılıklı; k. kutuya C(n,k) yol iner (temsilci yol: önce k kez sağ)
      const n = Math.trunc(sablon.satir);
      if (n >= 1)
        for (let k = 0; k <= n; k++)
          durumlar.push({ etiket: `${k + 1}. kutu`, agirlik: binom(n, k), sonuc: { tur: 'galton', yol: Array.from({ length: n }, (_, i) => (i < k ? 1 : 0)), kutu: k } });
      break;
    }
  }
  const toplam = durumlar.reduce((t, d) => t + d.agirlik, 0);
  return { durumlar, toplam };
}

// ---------------------------------------------------------------------------
// İstenen durum
// ---------------------------------------------------------------------------
export function zarToplami(zarlar: number[]): number {
  return zarlar.reduce((t, z) => t + z, 0);
}

export function zarKosuluSaglar(kosul: ZarKosulu, toplam: number): boolean {
  switch (kosul.tip) {
    case 'sayi':
      return toplam === kosul.deger;
    case 'cift':
      return toplam % 2 === 0;
    case 'tek':
      return toplam % 2 === 1;
    case 'enAz':
      return toplam >= kosul.deger;
    case 'enFazla':
      return toplam <= kosul.deger;
  }
}

export function kartKosuluSaglar(kosul: KartKosulu, kart: Kart): boolean {
  switch (kosul.tip) {
    case 'renk':
      return kartRengi(kart.tur) === kosul.deger;
    case 'tur':
      return kart.tur === kosul.deger;
    case 'deger':
      return kart.deger === kosul.deger;
  }
}

/** Sonuç, şablonun istenen durumunu sağlıyor mu? Şablon/sonuç türü uyuşmazsa false. */
export function istenenMi(sablon: Sablon, sonuc: Sonuc): boolean {
  if (sablon.tur !== sonuc.tur) return false;
  switch (sablon.tur) {
    case 'para':
      return sonuc.tur === 'para' && sonuc.yuz === sablon.istenen;
    case 'zar':
      return sonuc.tur === 'zar' && zarKosuluSaglar(sablon.istenen, zarToplami(sonuc.zarlar));
    case 'cark':
      return sonuc.tur === 'cark' && sablon.dilimler[sonuc.dilim]?.ad === sablon.istenenRenk;
    case 'torba':
      return sonuc.tur === 'torba' && sonuc.renk === sablon.istenenRenk;
    case 'kart':
      return sonuc.tur === 'kart' && kartKosuluSaglar(sablon.istenen, sonuc.kart);
    case 'galton':
      return sonuc.tur === 'galton' && galtonKosuluSaglar(sablon.istenen, sablon.satir, sonuc.kutu);
  }
}

// ---------------------------------------------------------------------------
// Teorik olasılık
// ---------------------------------------------------------------------------
export function teorikOlasilik(sablon: Sablon): TeorikOlasilik {
  const uzay = ornekUzay(sablon);
  const istenen = uzay.durumlar.filter((d) => istenenMi(sablon, d.sonuc)).reduce((t, d) => t + d.agirlik, 0);
  const tum = uzay.toplam;
  const kesir = kesirSadelestir(istenen, tum);
  const deger = tum > 0 ? istenen / tum : 0;
  // Sadeleşmiş kesir yalnız farklıysa yazılır; payda 1'e inerse tam sayı ("= 1"), "1/1" değil
  const sade = kesir.pay === istenen && kesir.payda === tum ? '' : kesir.payda === 1 ? ` = ${kesir.pay}` : ` = ${kesirMetni(kesir)}`;
  if (sablon.tur === 'galton') return { istenen, tum, kesir, deger, formul: galtonFormulu(sablon, istenen, tum, sade, deger) };
  const formul = `İstenen / Tüm durumlar = ${istenen} / ${tum}${sade} ≈ ${yuzdeMetni(deger)}`;
  return { istenen, tum, kesir, deger, formul };
}

const UST_RAKAMLAR = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

/** Üslü yazım: ussuMetni(2, 10) → "2¹⁰" (formülde "2^10" yerine üst simge rakamlar). */
export function ussuMetni(taban: number, us: number): string {
  return `${taban}${String(Math.max(0, Math.trunc(us)))
    .split('')
    .map((r) => UST_RAKAMLAR[Number(r)] ?? r)
    .join('')}`;
}

/**
 * "İstenen yollar / Tüm yollar = C(6,3) / 2⁶ = 20 / 64 = 5/16 ≈ %31,3"; çok kutuda C terimlerinin
 * toplamı. Sayı toplamında tüm terimler yazılır (n ≤ 10'da en çok 11 terim); yalnız C terimleri
 * beşten çoksa "C(6,0)+…+C(6,6)" diye kısaltılır.
 */
function galtonFormulu(sablon: Extract<Sablon, { tur: 'galton' }>, istenen: number, tum: number, sade: string, deger: number): string {
  const n = Math.trunc(sablon.satir);
  const kutular: number[] = [];
  for (let k = 0; k <= n; k++) if (galtonKosuluSaglar(sablon.istenen, n, k)) kutular.push(k);
  const bas = 'İstenen yollar / Tüm yollar = ';
  const iki = ussuMetni(2, n);
  if (!kutular.length) return `${bas}0 / ${iki} = 0 / ${tum} ≈ ${yuzdeMetni(0)}`;
  if (kutular.length === 1) return `${bas}C(${n},${kutular[0]}) / ${iki} = ${istenen} / ${tum}${sade} ≈ ${yuzdeMetni(deger)}`;
  const cTerim =
    kutular.length <= 4 ? kutular.map((k) => `C(${n},${k})`).join('+') : `C(${n},${kutular[0]})+…+C(${n},${kutular[kutular.length - 1]})`;
  const sayiTerim = kutular.map((k) => binom(n, k)).join('+');
  return `${bas}(${cTerim}) / ${iki} = (${sayiTerim}) / ${tum} = ${istenen} / ${tum}${sade} ≈ ${yuzdeMetni(deger)}`;
}

// ---------------------------------------------------------------------------
// Etiketler
// ---------------------------------------------------------------------------
export function paraYuzuAdi(yuz: ParaYuzu): string {
  return yuz === 'tura' ? 'Tura' : 'Yazı';
}

export function zarKosuluAdi(kosul: ZarKosulu): string {
  switch (kosul.tip) {
    case 'sayi':
      return String(kosul.deger);
    case 'cift':
      return 'Çift sayı';
    case 'tek':
      return 'Tek sayı';
    case 'enAz':
      return `≥ ${kosul.deger}`;
    case 'enFazla':
      return `≤ ${kosul.deger}`;
  }
}

export function kartKosuluAdi(kosul: KartKosulu): string {
  switch (kosul.tip) {
    case 'renk':
      return kosul.deger === 'kirmizi' ? 'Kırmızı kart' : 'Siyah kart';
    case 'tur':
      return `${KART_TURU_ADI[kosul.deger]} ${KART_TURU_SEMBOLU[kosul.deger]}`;
    case 'deger':
      return kosul.deger === 'A' ? 'As' : kosul.deger;
  }
}

export function kartAdi(kart: Kart): string {
  return `${kart.deger}${KART_TURU_SEMBOLU[kart.tur]}`;
}

/** Şablonun "istenen durum" metni (ör. "Tura", "≥ 4", "Kırmızı", "Kupa ♥"). */
export function istenenAdi(sablon: Sablon): string {
  switch (sablon.tur) {
    case 'para':
      return paraYuzuAdi(sablon.istenen);
    case 'zar':
      return zarKosuluAdi(sablon.istenen);
    case 'cark':
    case 'torba':
      return sablon.istenenRenk;
    case 'kart':
      return kartKosuluAdi(sablon.istenen);
    case 'galton':
      return galtonKosuluAdi(sablon.istenen, sablon.satir);
  }
}

/** Galton koşulu metni: "Ortadaki kutu (4. kutu)", "3. kutu", "≥ 5. kutu", "≤ 2. kutu". */
export function galtonKosuluAdi(kosul: GaltonKosulu, n: number): string {
  switch (kosul.tip) {
    case 'orta':
      return n % 2 === 0 ? `Ortadaki kutu (${n / 2 + 1}. kutu)` : `Ortadaki kutular (${(n - 1) / 2 + 1}. ve ${(n + 1) / 2 + 1}. kutu)`;
    case 'kutu':
      return `${kosul.kutu + 1}. kutu`;
    case 'enAz':
      return `≥ ${kosul.kutu + 1}. kutu`;
    case 'enFazla':
      return `≤ ${kosul.kutu + 1}. kutu`;
  }
}

/** Tek sonucun kısa etiketi (listede ve frekans tablosunda görünen). */
export function sonucEtiketi(sablon: Sablon, sonuc: Sonuc): string {
  switch (sonuc.tur) {
    case 'para':
      return paraYuzuAdi(sonuc.yuz);
    case 'zar':
      return sonuc.zarlar.length > 1 ? `${sonuc.zarlar.join(' + ')} = ${zarToplami(sonuc.zarlar)}` : String(sonuc.zarlar[0]);
    case 'cark':
      return sablon.tur === 'cark' ? (sablon.dilimler[sonuc.dilim]?.ad ?? '?') : String(sonuc.dilim);
    case 'torba':
      return sonuc.renk;
    case 'kart':
      return kartAdi(sonuc.kart);
    case 'galton':
      return `${sonuc.kutu + 1}. kutu`;
  }
}

/** Son 20 listesindeki kısa etiket (Galton'da "K4"; diğerlerinde sonucEtiketi). */
export function sonucKisaEtiketi(sablon: Sablon, sonuc: Sonuc): string {
  return sonuc.tur === 'galton' ? `K${sonuc.kutu + 1}` : sonucEtiketi(sablon, sonuc);
}

/** Frekans tablosunda gruplanacak anahtar (iki zarda toplam, kartta tek tek kart). */
export function sonucAnahtari(sablon: Sablon, sonuc: Sonuc): string {
  switch (sonuc.tur) {
    case 'para':
      return sonuc.yuz;
    case 'zar':
      return sonuc.zarlar.length > 1 ? `t${zarToplami(sonuc.zarlar)}` : `z${sonuc.zarlar[0]}`;
    case 'cark':
      return sablon.tur === 'cark' ? `r:${sablon.dilimler[sonuc.dilim]?.ad ?? sonuc.dilim}` : `d${sonuc.dilim}`;
    case 'torba':
      return `r:${sonuc.renk}`;
    case 'kart':
      return `k:${sonuc.kart.deger}${sonuc.kart.tur}`;
    case 'galton':
      return `g:${sonuc.kutu}`;
  }
}

/** Frekans tablosunun satır başlıkları (sıralı; örnek uzayla aynı düzen). Kart için tür bazında. */
export function frekansSatirlari(sablon: Sablon): { anahtar: string; etiket: string; renk?: string; istenen: boolean }[] {
  switch (sablon.tur) {
    case 'galton': {
      const n = Math.max(0, Math.trunc(sablon.satir));
      return Array.from({ length: n + 1 }, (_, k) => ({ anahtar: `g:${k}`, etiket: `${k + 1}. kutu`, istenen: galtonKosuluSaglar(sablon.istenen, n, k) }));
    }
    case 'para':
      return [
        { anahtar: 'tura', etiket: 'Tura', istenen: sablon.istenen === 'tura' },
        { anahtar: 'yazi', etiket: 'Yazı', istenen: sablon.istenen === 'yazi' },
      ];
    case 'zar': {
      const satirlar: { anahtar: string; etiket: string; istenen: boolean }[] = [];
      if (sablon.ikiZar) {
        for (let t = 2; t <= 12; t++) satirlar.push({ anahtar: `t${t}`, etiket: String(t), istenen: zarKosuluSaglar(sablon.istenen, t) });
      } else {
        for (let z = 1; z <= 6; z++) satirlar.push({ anahtar: `z${z}`, etiket: String(z), istenen: zarKosuluSaglar(sablon.istenen, z) });
      }
      return satirlar;
    }
    case 'cark': {
      const gorulen = new Set<string>();
      const satirlar: { anahtar: string; etiket: string; renk: string; istenen: boolean }[] = [];
      for (const d of sablon.dilimler) {
        if (gorulen.has(d.ad)) continue;
        gorulen.add(d.ad);
        satirlar.push({ anahtar: `r:${d.ad}`, etiket: d.ad, renk: d.renk, istenen: d.ad === sablon.istenenRenk });
      }
      return satirlar;
    }
    case 'torba':
      return sablon.bilyeler.map((b) => ({ anahtar: `r:${b.ad}`, etiket: b.ad, renk: b.renk, istenen: b.ad === sablon.istenenRenk }));
    case 'kart':
      if (sablon.istenen.tip === 'deger') {
        const istenenDeger = sablon.istenen.deger;
        return KART_DEGERLERI.map((dg) => ({ anahtar: `kd:${dg}`, etiket: dg === 'A' ? 'As' : dg, istenen: dg === istenenDeger }));
      }
      return KART_TURLERI.map((t) => ({
        anahtar: `kt:${t}`,
        etiket: `${KART_TURU_ADI[t]} ${KART_TURU_SEMBOLU[t]}`,
        renk: kartRengi(t) === 'kirmizi' ? '#c9463d' : 'hsl(var(--foreground))',
        istenen: sablon.istenen.tip === 'tur' ? sablon.istenen.deger === t : sablon.istenen.tip === 'renk' ? kartRengi(t) === sablon.istenen.deger : false,
      }));
  }
}

/** Frekans tablosu satır anahtarı: kart için tür (değer koşulunda değer) bazında gruplar, diğerleri sonucAnahtari ile aynı. */
export function frekansAnahtari(sablon: Sablon, sonuc: Sonuc): string {
  if (sonuc.tur === 'kart') return sablon.tur === 'kart' && sablon.istenen.tip === 'deger' ? `kd:${sonuc.kart.deger}` : `kt:${sonuc.kart.tur}`;
  return sonucAnahtari(sablon, sonuc);
}

// ---------------------------------------------------------------------------
// Şablon doğrulama (hatalı giriş çökertmesin)
// ---------------------------------------------------------------------------
export interface SablonUyarisi {
  mesaj: string;
}

/** Şablonun anlamlı olup olmadığını denetler; boş çark/torba ya da olanaksız koşullar uyarı verir. */
export function sablonUyarilari(sablon: Sablon): SablonUyarisi[] {
  const uyarilar: SablonUyarisi[] = [];
  switch (sablon.tur) {
    case 'cark': {
      if (sablon.dilimler.length < CARK_EN_AZ_DILIM) uyarilar.push({ mesaj: 'Çarkta en az 2 dilim olmalı.' });
      if (sablon.dilimler.some((d) => !(d.genislik >= 1))) uyarilar.push({ mesaj: 'Her dilimin genişliği en az 1 olmalı.' });
      if (!sablon.dilimler.some((d) => d.ad === sablon.istenenRenk)) uyarilar.push({ mesaj: 'İstenen renk çarkta yok; olasılık 0.' });
      break;
    }
    case 'torba': {
      const toplam = sablon.bilyeler.reduce((t, b) => t + Math.max(0, b.adet), 0);
      if (toplam === 0) uyarilar.push({ mesaj: 'Torba boş; bilye ekleyin.' });
      const istenenAdet = sablon.bilyeler.find((b) => b.ad === sablon.istenenRenk)?.adet ?? 0;
      if (toplam > 0 && istenenAdet <= 0) uyarilar.push({ mesaj: 'İstenen renkten torbada bilye yok; olasılık 0.' });
      break;
    }
    case 'zar': {
      const p = teorikOlasilik(sablon);
      if (p.istenen === 0) uyarilar.push({ mesaj: 'Bu koşul hiç gerçekleşemez (olasılık 0).' });
      break;
    }
    case 'galton': {
      const n = sablon.satir;
      if (!Number.isInteger(n) || n < GALTON_EN_AZ_SATIR || n > GALTON_EN_COK_SATIR)
        uyarilar.push({ mesaj: `Çivi satırı ${GALTON_EN_AZ_SATIR} ile ${GALTON_EN_COK_SATIR} arasında olmalı.` });
      const k = sablon.istenen;
      if (k.tip !== 'orta' && (!Number.isInteger(k.kutu) || k.kutu < 0 || k.kutu > n)) uyarilar.push({ mesaj: 'Seçilen kutu bu tahtada yok; olasılık 0.' });
      break;
    }
    default:
      break;
  }
  return uyarilar;
}

/** Şablonun deney yapılabilir olup olmadığı (örnek uzay boş değil). */
export function sablonGecerli(sablon: Sablon): boolean {
  return ornekUzay(sablon).toplam > 0;
}
