import { formatTurkishNumber } from '@/math/coordinates';

/**
 * MATEMATİK YAZIMI — ölçülerin MEB kurallarına uygun gösterimi (saf modül, DOM yok, vitest ile sınanır).
 *
 * Bir ölçü (Olcu) ANLAMSAL olarak tutulur: türü, nokta adları ve değeri. Görüntü ağacı (Dugum[]),
 * düz metin, LaTeX ve sesli okunuş aynı kayıttan üretilir; tuval etiketi, panel, komut yanıtı ve
 * ekran okuyucu hep aynı şeyi söyler.
 *
 *   |AB| = 10,39 br        m(ABC^) = 60°         m(A͡B) = 80°          |A͡B| ≈ 7,12 br
 *   A(ABC) = 12 br²        Ç(ABC) = 24 br        A(AOB dilimi) ≈ 4,71 br²
 *   r = |OA| = 3 br        kiriş |AB| = 4 br     çap |AB| = 2r = 6 br
 *   Ç(O, r)  ·  Alan = πr² ≈ 28,27 br²  ·  Çevre = 2πr ≈ 18,85 br
 *
 * Kurallar
 *  - Ad YALNIZCA görünen nokta adlarından kurulur (nesnenin .label'ı değil: 'Çokgen', 'BC Yayı' güvenilmez).
 *    Bir ad eksik ya da gizliyse yazım sözcüğe düşer: 'Alan ≈ 12,57 br²'.
 *  - Yuvarlanmış değer '≈' ile yazılır; '= ≈' asla yazılmaz. Yalnızca değer yazan biçimler de '≈ 6,83 br' yazar.
 *  - Kısa yazım (ayar): yalnızca değer, gerektiğinde tek sözcük ('≈ 10,39 br', '60°', 'Alan = 12 br²').
 *  - Nesnelerin SAKLANAN adları ('∠ABC', '|AB|', '[AB]') değişmez; komutlar ve yeniden adlandırma onlara bağlı.
 *  - Sesli okunuşta hiçbir sembol geçmez ('dikey çizgi', 'yaklaşık eşittir', 'br kare' yok).
 */

// ------------------------------------------------------------------------------------------------ ayar

export type OlcuYazimi = 'tam' | 'kisa';
export type AciYazimi = 'sapka' | 'isaret';
export interface YazimAyari {
  olcuYazimi: OlcuYazimi;
  aciYazimi: AciYazimi;
}
export const VARSAYILAN_YAZIM: YazimAyari = { olcuYazimi: 'tam', aciYazimi: 'sapka' };
export const OLCU_YAZIMLARI: readonly OlcuYazimi[] = ['tam', 'kisa'];
export const ACI_YAZIMLARI: readonly AciYazimi[] = ['sapka', 'isaret'];

/** StyleSettings'ten (eski kayıtlarda alanlar eksik olabilir) güvenli ayar. */
export function yazimAyari(s?: { olcuYazimi?: unknown; aciYazimi?: unknown } | null): YazimAyari {
  const olcu = s?.olcuYazimi;
  const aci = s?.aciYazimi;
  return {
    olcuYazimi: OLCU_YAZIMLARI.includes(olcu as OlcuYazimi) ? (olcu as OlcuYazimi) : 'tam',
    aciYazimi: ACI_YAZIMLARI.includes(aci as AciYazimi) ? (aci as AciYazimi) : 'sapka',
  };
}

// ------------------------------------------------------------------------------------------------ türler

export type Susleme = 'sapka' | 'yay' | 'ucgen';
export type Birim = 'br' | 'br²' | 'br³' | 'cm' | 'cm²' | '°';

/** Görüntü ağacı. Boşluklar açıkça yazılır (sembol ' = ' gibi); birimden önceki boşluğu düzen ekler. */
export type Dugum =
  | { t: 'sembol'; s: string }
  | { t: 'kelime'; s: string; soluk?: boolean }
  | { t: 'sayi'; s: string }
  | { t: 'birim'; s: Birim }
  | { t: 'ad'; s: string }
  | { t: 'sus'; tur: Susleme; ic: Dugum[] }
  | { t: 'mutlak'; ic: Dugum[] }
  | { t: 'kesir'; pay: Dugum[]; payda: Dugum[] };

export type OlcuTuru =
  | 'uzunluk' | 'aci' | 'merkezAci' | 'yayOlcusu' | 'yayUzunlugu'
  | 'alan' | 'cevre' | 'dilimAlani' | 'dilimCevresi'
  | 'yaricap' | 'kiris' | 'cap'
  | 'daireAlani' | 'cemberCevresi' | 'elipsAlani' | 'elipsCevresi'
  | 'egim' | 'koordinat' | 'trig';

export type TrigFn = 'sin' | 'cos' | 'tan';

export interface Olcu {
  tur: OlcuTuru;
  /** Sırası türe göre anlamlıdır (açıda kol-köşe-kol, yayda baş-[ara]-son). null: ad kurulamadı. */
  adlar: string[] | null;
  /** null: tanımsız (dikey doğrunun eğimi, tan 90°) */
  deger: number | null;
  /** koordinatta ikinci bileşen */
  deger2?: number;
  basamak: number;
  /** Uzunluk birimi ailesi; alan için kare, açı için derece türden gelir. */
  birim: 'br' | 'cm';
  /** Yay 180°'den büyük ve üzerinde adlı ara nokta yok */
  buyukYay?: boolean;
  /** Yay tam 180° ve üzerinde adlı ara nokta yok */
  yarimCember?: boolean;
  /** Açı 180°'den büyük (reflex): ' (dış açı)' niteleyicisi eklenir */
  disAci?: boolean;
  /** Değer formülle yaklaşık hesaplandı (elips çevresi): her zaman '≈' */
  yaklasik?: boolean;
  /** trig: fonksiyon ve oranı kuran kenarlar */
  trig?: { fn: TrigFn; pay: string[] | null; payda: string[] | null; payDeger: number; paydaDeger: number };
}

// ------------------------------------------------------------------------------------------------ sayılar

/** Kayan nokta artığını temizler: 5,999999999 → 6. */
export function duzelt(n: number): number {
  const r = Math.round(n);
  return Math.abs(n - r) < 1e-9 ? r : Number(n.toFixed(9));
}

/** Türkçe sayı yazımı — uygulamanın tek kaynağı formatTurkishNumber. */
export function sayiMetni(val: number, basamak = 2): string {
  return formatTurkishNumber(duzelt(val), basamak);
}

/** Gösterilen değer gerçek değerden farklı mı (yuvarlandı mı)? */
export function yuvarlandiMi(val: number, basamak: number): boolean {
  const v = duzelt(val);
  return Math.abs(v - Number(v.toFixed(basamak))) > 1e-9;
}

// ------------------------------------------------------------------------------------------------ adlar

export interface Adli {
  label?: string;
  showLabel?: boolean;
  visible?: boolean;
}
type AdGirdisi = Adli | null | undefined;

const NOKTA_ADI = /^\p{Lu}(?:_?\d{1,3})?['′’]{0,3}$/u;

/** Görünen, nokta adı biçiminde bir etiket mi? Değilse null (gizli ad yazımda kullanılmaz). */
export function kullanilabilirAd(p: AdGirdisi): string | null {
  if (!p) return null;
  const isim = (p.label ?? '').trim();
  if (!isim || p.showLabel === false || p.visible === false || !NOKTA_ADI.test(isim)) return null;
  return isim.replace(/[’′]/g, "'");
}

function adlar(...ps: AdGirdisi[]): string[] | null {
  const a = ps.map(kullanilabilirAd);
  return a.every((x): x is string => x !== null) ? a : null;
}

/** Çokgen adı en fazla bu kadar köşe harfiyle yazılır; daha uzunsa sözcüğe düşer ('Alan = …'). */
export const EN_UZUN_COKGEN_ADI = 8;

// ------------------------------------------------------------------------------------------------ kurucular

export type Secenek = { basamak?: number; birim?: 'br' | 'cm' };
const olcu = (tur: OlcuTuru, ad: string[] | null, deger: number | null, s: Secenek = {}, ek: Partial<Olcu> = {}): Olcu =>
  ({ tur, adlar: ad, deger, basamak: s.basamak ?? 2, birim: s.birim ?? 'br', ...ek });

/** |AB| */
export const uzunluk = (a: AdGirdisi, b: AdGirdisi, deger: number, s?: Secenek) => olcu('uzunluk', adlar(a, b), deger, s);
/** m(ABC^) — kol, KÖŞE, kol. disAci: 180°'den büyük (dış) açı. */
export const aci = (p1: AdGirdisi, kose: AdGirdisi, p3: AdGirdisi, derece: number, s?: Secenek & { disAci?: boolean }) =>
  olcu('aci', adlar(p1, kose, p3), derece, s, s?.disAci ? { disAci: true } : {});
/** m(B^) — tek köşe harfi yeterliyse (dik üçgenin oranları) */
export const koseAcisi = (kose: AdGirdisi, derece: number, s?: Secenek) => olcu('aci', adlar(kose), derece, s);
/** m(AOB^) — baş, MERKEZ, son. Son nokta yalnızca YÖN verse de (yayın üzerinde olmasa da) açı doğru adlanır. */
export const merkezAci = (bas: AdGirdisi, merkez: AdGirdisi, son: AdGirdisi, derece: number, s?: Secenek) =>
  olcu('merkezAci', adlar(bas, merkez, son), derece, s);

export interface YayUclari {
  bas: AdGirdisi;
  /** YAYIN ÜZERİNDEKİ son nokta. Yalnızca yön veren (çemberin dışındaki) nokta verilmemeli: null geçin. */
  son: AdGirdisi;
  /** 180°'den büyük (ya da tam 180°) yayı adlandıran, yayın ÜZERİNDEKİ nokta */
  ara?: AdGirdisi;
  buyuk: boolean;
  /** Tam yarım çember (180°) */
  yarim?: boolean;
}
function yayAdlari(u: YayUclari): { ad: string[] | null; buyukYay: boolean; yarimCember: boolean } {
  const iki = adlar(u.bas, u.son);
  if (!iki) return { ad: null, buyukYay: false, yarimCember: false };
  const ara = u.buyuk || u.yarim ? kullanilabilirAd(u.ara) : null;
  if (ara) return { ad: [iki[0], ara, iki[1]], buyukYay: false, yarimCember: false };
  return { ad: iki, buyukYay: u.buyuk, yarimCember: !u.buyuk && !!u.yarim };
}
/** m(A͡B) */
export function yayOlcusu(u: YayUclari, derece: number, s?: Secenek): Olcu {
  const { ad, buyukYay, yarimCember } = yayAdlari(u);
  return olcu('yayOlcusu', ad, derece, s, { buyukYay, yarimCember });
}
/** |A͡B| */
export function yayUzunlugu(u: YayUclari, deger: number, s?: Secenek): Olcu {
  const { ad, buyukYay, yarimCember } = yayAdlari(u);
  return olcu('yayUzunlugu', ad, deger, s, { buyukYay, yarimCember });
}
const cokgenAdi = (koseler: AdGirdisi[]) =>
  koseler.length >= 3 && koseler.length <= EN_UZUN_COKGEN_ADI ? adlar(...koseler) : null;
/** A(ABC) — köşeler sırayla */
export const alan = (koseler: AdGirdisi[], deger: number, s?: Secenek) => olcu('alan', cokgenAdi(koseler), deger, s);
/** Ç(ABC) */
export const cevre = (koseler: AdGirdisi[], deger: number, s?: Secenek) => olcu('cevre', cokgenAdi(koseler), deger, s);
/** A(AOB dilimi) — baş, MERKEZ, son (son yön noktası olabilir) */
export const dilimAlani = (bas: AdGirdisi, merkez: AdGirdisi, son: AdGirdisi, deger: number, s?: Secenek) =>
  olcu('dilimAlani', adlar(bas, merkez, son), deger, s);
export const dilimCevresi = (bas: AdGirdisi, merkez: AdGirdisi, son: AdGirdisi, deger: number, s?: Secenek) =>
  olcu('dilimCevresi', adlar(bas, merkez, son), deger, s);
/** r = |OA| — yarıçap noktası yoksa (sabit yarıçap) yalnızca r */
export const yaricap = (merkez: AdGirdisi, nokta: AdGirdisi, deger: number, s?: Secenek) =>
  olcu('yaricap', nokta ? adlar(merkez, nokta) : [], deger, s);
/** kiriş |AB|; çap |AB| = 2r */
export const kiris = (a: AdGirdisi, b: AdGirdisi, deger: number, capMi: boolean, s?: Secenek) =>
  olcu(capMi ? 'cap' : 'kiris', adlar(a, b), deger, s);
export const daireAlani = (deger: number, s?: Secenek) => olcu('daireAlani', [], deger, s);
export const cemberCevresi = (deger: number, s?: Secenek) => olcu('cemberCevresi', [], deger, s);
export const elipsAlani = (deger: number, s?: Secenek) => olcu('elipsAlani', [], deger, s);
export const elipsCevresi = (deger: number, s?: Secenek) => olcu('elipsCevresi', [], deger, s, { yaklasik: true });
export const egim = (a: AdGirdisi, b: AdGirdisi, m: number | null) => olcu('egim', adlar(a, b), m, { basamak: 4 });
export const koordinat = (p: AdGirdisi, x: number, y: number, s?: Secenek) => olcu('koordinat', adlar(p), x, s, { deger2: y });
/**
 * sin B̂ = |AC| / |BC| = 3 / 5 = 0,6 — dik üçgende. pay/payda kenarları [uç, uç]; kenar adı kurulamazsa yalnızca sayılar.
 * deger null: tanımsız (tan 90°).
 */
export function trigOrani(
  fn: TrigFn, kose: AdGirdisi, pay: [AdGirdisi, AdGirdisi] | null, payda: [AdGirdisi, AdGirdisi] | null,
  payDeger: number, paydaDeger: number, deger: number | null,
): Olcu {
  return olcu('trig', adlar(kose), deger, { basamak: 4 }, {
    trig: { fn, pay: pay ? adlar(...pay) : null, payda: payda ? adlar(...payda) : null, payDeger, paydaDeger },
  });
}

/** sin B̂ = 0,6 — kenar uzunlukları anlamlı değilken (üçgen dik değil) yalnızca değer. */
export const trigDegeri = (fn: TrigFn, kose: AdGirdisi, deger: number | null): Olcu =>
  olcu('trig', adlar(kose), deger, { basamak: 4 }, {
    trig: { fn, pay: null, payda: null, payDeger: NaN, paydaDeger: NaN },
  });

/** Çember başlığı Ç(O, r). Merkez adsızsa (üç noktadan geçen çember) null. */
export interface Baslik { dugumler: Dugum[]; sesli: string; duz: string }
export function cemberBasligi(merkez: AdGirdisi): Baslik | null {
  const o = kullanilabilirAd(merkez);
  if (!o) return null;
  const dugumler = [sembol('Ç('), ad(o), sembol(', r)')];
  return { dugumler, duz: duzMetin(dugumler), sesli: `${adOku(o)} merkezli çember` };
}

// ------------------------------------------------------------------------------------------------ görüntü

export const sembol = (s: string): Dugum => ({ t: 'sembol', s });
export const kelime = (s: string, soluk = false): Dugum => ({ t: 'kelime', s, soluk });
export const ad = (s: string): Dugum => ({ t: 'ad', s });
export const sayi = (n: number, basamak = 2): Dugum => ({ t: 'sayi', s: sayiMetni(n, basamak) });
const adDizisi = (a: string[]) => a.map(ad);

function birimOf(o: Olcu): Birim | null {
  switch (o.tur) {
    case 'aci': case 'merkezAci': case 'yayOlcusu': return '°';
    case 'alan': case 'dilimAlani': case 'daireAlani': case 'elipsAlani': return o.birim === 'cm' ? 'cm²' : 'br²';
    case 'egim': case 'koordinat': case 'trig': return null;
    default: return o.birim;
  }
}

function yaklasikMi(o: Olcu): boolean {
  return !!o.yaklasik || (o.deger !== null && yuvarlandiMi(o.deger, o.basamak));
}

/** iliskisiz: biçimde '=' / '≈' bağlacı yok (yalnızca değer) — yuvarlanmışsa değerin önüne '≈ ' konur. */
function degerDugumleri(o: Olcu, iliskisiz = false): Dugum[] {
  if (o.deger === null) return [kelime('tanımsız')];
  const b = birimOf(o);
  const out: Dugum[] = [];
  if (iliskisiz && yaklasikMi(o)) out.push(sembol('≈ '));
  out.push(sayi(o.deger, o.basamak));
  if (b) out.push({ t: 'birim', s: b });
  return out;
}

const iliski = (o: Olcu): Dugum => sembol(o.deger === null ? ' ' : yaklasikMi(o) ? ' ≈ ' : ' = ');

/** Adsız TAM yazımın sözcüğü (null: yalnızca değer). */
const SOZCUK: Record<OlcuTuru, string | null> = {
  uzunluk: null, aci: null, merkezAci: null, yayOlcusu: null, koordinat: null, trig: null,
  yayUzunlugu: 'Yay uzunluğu', alan: 'Alan', cevre: 'Çevre', dilimAlani: 'Alan', dilimCevresi: 'Çevre',
  yaricap: 'r', kiris: 'Kiriş', cap: 'Çap', daireAlani: 'Alan', cemberCevresi: 'Çevre',
  elipsAlani: 'Alan', elipsCevresi: 'Çevre', egim: 'Eğim',
};
/** KISA yazımın sözcüğü: yay uzunluğu da yalnızca değere düşer ('≈ 7,12 br'). */
const KISA_SOZCUK: Record<OlcuTuru, string | null> = { ...SOZCUK, yayUzunlugu: null };

function aciAdi(harfler: string[], ayar: YazimAyari): Dugum[] {
  if (ayar.aciYazimi === 'isaret') return [sembol('m(∠'), ...adDizisi(harfler), sembol(')')];
  return [sembol('m('), { t: 'sus', tur: 'sapka', ic: adDizisi(harfler) }, sembol(')')];
}
const aciSembolu = (harfler: string[], ayar: YazimAyari): Dugum[] =>
  ayar.aciYazimi === 'isaret' ? [sembol('∠'), ...adDizisi(harfler)] : [{ t: 'sus', tur: 'sapka', ic: adDizisi(harfler) }];

const yayAdi = (harfler: string[]): Dugum => ({ t: 'sus', tur: 'yay', ic: adDizisi(harfler) });
const mutlak = (ic: Dugum[]): Dugum => ({ t: 'mutlak', ic });

export interface DugumSecenegi {
  /** Cümle içinde (komut yanıtı "Ç(A, r) için alan ≈ …"): baştaki sözcük küçük harfle başlar. */
  cumleIci?: boolean;
}

/** Ölçünün görüntü ağacı. */
export function olcuDugumleri(o: Olcu, ayar: YazimAyari = VARSAYILAN_YAZIM, sec: DugumSecenegi = {}): Dugum[] {
  const d = olcuDugumleriHam(o, ayar);
  const ilk = d[0];
  if (sec.cumleIci && ilk?.t === 'kelime') d[0] = { ...ilk, s: ilk.s.charAt(0).toLocaleLowerCase('tr') + ilk.s.slice(1) };
  return d;
}

/** Çember / elips kartı satırının formülü — ad başlıkta olduğu için sözcükle yazılır. */
const KART_FORMULU: Partial<Record<OlcuTuru, [string, string]>> = {
  daireAlani: ['Alan', ' = πr²'],
  cemberCevresi: ['Çevre', ' = 2πr'],
  elipsAlani: ['Alan', ' = πab'],
  elipsCevresi: ['Çevre', ''],
};

function olcuDugumleriHam(o: Olcu, ayar: YazimAyari): Dugum[] {
  const kisa = ayar.olcuYazimi === 'kisa';
  const a = o.adlar;
  if (o.tur === 'koordinat') {
    const xy: Dugum[] = [sembol('('), sayi(o.deger ?? 0, o.basamak), sembol('; '), sayi(o.deger2 ?? 0, o.basamak), sembol(')')];
    return a && a.length && !kisa ? [ad(a[0]), ...xy] : xy;
  }
  if (o.tur === 'trig' && o.trig) {
    const t = o.trig;
    const bas: Dugum[] = a && a.length && !kisa ? [sembol(`${t.fn} `), ...aciSembolu(a, ayar)] : [sembol(t.fn)];
    const kenarlar: Dugum[] = !kisa && t.pay && t.payda
      ? [sembol(' = '), { t: 'kesir', pay: [mutlak(adDizisi(t.pay))], payda: [mutlak(adDizisi(t.payda))] }]
      : [];
    // Kenar uzunlukları bilinmiyorsa (üçgen dik değil ya da dik açı ölçülen köşede) kesir yazılmaz:
    // 'sin B̂ = 0,6'. trigDegeri() bu durumda payDeger/paydaDeger'i NaN bırakır.
    const sayilar: Dugum[] = Number.isFinite(t.payDeger) && Number.isFinite(t.paydaDeger)
      ? [sembol(' = '), { t: 'kesir', pay: [sayi(t.payDeger, 4)], payda: [sayi(t.paydaDeger, 4)] }]
      : [];
    if (o.deger === null) return [...bas, ...kenarlar, sembol(' '), kelime('tanımsız')];
    return [...bas, ...kenarlar, ...sayilar, iliski(o), sayi(o.deger, o.basamak)];
  }
  const kart = KART_FORMULU[o.tur];
  if (!kisa && kart) return [kelime(kart[0]), ...(kart[1] ? [sembol(kart[1])] : []), iliski(o), ...degerDugumleri(o)];
  if (!kisa && o.tur === 'yaricap' && a && a.length === 0) return [sembol('r'), iliski(o), ...degerDugumleri(o)];
  if (kisa || !a || a.length === 0) {
    const s = (kisa ? KISA_SOZCUK : SOZCUK)[o.tur];
    const d = s
      ? [s === 'r' ? sembol('r') : kelime(s), iliski(o), ...degerDugumleri(o)]
      : degerDugumleri(o, true);
    if (o.disAci) d.push(kelime(' (dış açı)', true));
    return d;
  }
  let sol: Dugum[];
  switch (o.tur) {
    case 'uzunluk': sol = [mutlak(adDizisi(a))]; break;
    case 'aci': case 'merkezAci': sol = aciAdi(a, ayar); break;
    case 'yayOlcusu': sol = [sembol('m('), yayAdi(a), sembol(')')]; break;
    case 'yayUzunlugu': sol = [mutlak([yayAdi(a)])]; break;
    case 'alan': sol = [sembol('A('), ...adDizisi(a), sembol(')')]; break;
    case 'cevre': sol = [sembol('Ç('), ...adDizisi(a), sembol(')')]; break;
    case 'dilimAlani': sol = [sembol('A('), ...adDizisi(a), kelime(' dilimi'), sembol(')')]; break;
    case 'dilimCevresi': sol = [sembol('Ç('), ...adDizisi(a), kelime(' dilimi'), sembol(')')]; break;
    case 'yaricap': sol = [sembol('r = '), mutlak(adDizisi(a))]; break;
    case 'kiris': sol = [kelime('kiriş ', true), mutlak(adDizisi(a))]; break;
    case 'cap': sol = [kelime('çap ', true), mutlak(adDizisi(a)), sembol(' = 2r')]; break;
    case 'egim': sol = [...adDizisi(a), kelime(' eğimi')]; break;
    default: sol = [];
  }
  const son = [...sol, iliski(o), ...degerDugumleri(o)];
  if (o.buyukYay) son.push(kelime(' (büyük yay)', true));
  if (o.yarimCember) son.push(kelime(' (yarım çember)', true));
  if (o.disAci) son.push(kelime(' (dış açı)', true));
  return son;
}

// ------------------------------------------------------------------------------------------------ imza

const IMZA_AYIRAC = '';
function imzaSatiri(d: Dugum[]): string {
  return d.map((x) => {
    switch (x.t) {
      case 'sembol': case 'sayi': case 'ad': return `${x.t}:${x.s}`;
      case 'kelime': return `kelime${x.soluk ? '*' : ''}:${x.s}`;
      case 'birim': return `birim:${x.s}`;
      case 'mutlak': return `|${imzaSatiri(x.ic)}|`;
      case 'kesir': return `(${imzaSatiri(x.pay)}÷${imzaSatiri(x.payda)})`;
      case 'sus': return `${x.tur}{${imzaSatiri(x.ic)}}`;
    }
  }).join(IMZA_AYIRAC);
}

/**
 * Düğüm ağacının yapısal imzası — React.memo karşılaştırıcıları için. Aynı düz metni veren FARKLI ağaçlar
 * (sembol 'AB' ile ad 'A' + ad 'B') ayrı imza verir; yeniden oluşturulmuş ama içerikçe aynı ağaçlar aynı.
 */
export const yazimImzasi = (satirlar: Dugum[][]): string => satirlar.map(imzaSatiri).join('');

// ------------------------------------------------------------------------------------------------ düz metin

/** Birimden önce boşluk (derece hariç). */
const birimMetni = (b: Birim) => (b === '°' ? '°' : ` ${b}`);

/**
 * Düz Unicode metin: pano, komut yanıtı, testler, ipucu çubuğu. Nokta adları saklandığı gibi yazılır (A_1, B'):
 * kullanıcı yanıtı komut kutusuna geri yapıştırdığında ayrıştırıcı aynı adı bulur.
 *   şapka → m(∠ABC) (tek harfte B̂), yay → A͡B (U+0361), üçgen → △ABC, mutlak → |AB|
 * metniCozumle() bu biçimi geri okuyup süslü gösterime çevirir.
 */
export function duzMetin(d: Dugum[]): string {
  return d.map((x) => {
    switch (x.t) {
      case 'sembol': case 'kelime': case 'ad': case 'sayi': return x.s;
      case 'birim': return birimMetni(x.s);
      case 'mutlak': return `|${duzMetin(x.ic)}|`;
      case 'kesir': return `${duzMetin(x.pay)}/${duzMetin(x.payda)}`;
      case 'sus': {
        if (x.tur === 'yay') return x.ic.map((y) => duzMetin([y])).join('͡');
        const ic = duzMetin(x.ic);
        if (x.tur === 'ucgen') return `△${ic}`;
        return x.ic.length === 1 ? `${ic}̂` : `∠${ic}`;
      }
    }
  }).join('');
}

/** Ölçünün düz metni. */
export const olcuMetni = (o: Olcu, ayar: YazimAyari = VARSAYILAN_YAZIM, sec?: DugumSecenegi) =>
  duzMetin(olcuDugumleri(o, ayar, sec));

// ------------------------------------------------------------------------------------------------ LaTeX

export interface LatexSecenegi {
  /** Üç harfli yayda \overparen daha güzeldir ama KaTeX'te yoktur; varsayılan taşınabilir \overset{\frown}. */
  yayKomutu?: 'frown' | 'overparen';
}

function latexAdi(s: string): string {
  const m = s.match(/^(\p{Lu})(?:_?(\d+))?(['′]*)$/u);
  if (!m) return `\\mathrm{${s}}`;
  const [, harf, alt, us] = m;
  const h = /[A-Z]/.test(harf) ? harf : `\\text{${harf}}`;
  return `\\mathrm{${h}}${alt ? `_{${alt}}` : ''}${us.replace(/′/g, "'")}`;
}
const LATEX_SEMBOL: [RegExp, string][] = [
  [/(?<!\p{L})(sin|cos|tan|cot)(?!\p{L})/gu, '\\$1 '],
  // 'A(' ve 'Ç(' işlev adıdır, değişken değil: dik yazılır ('m' zaten diktir).
  [/(?<![\p{L}\\{])([A-Z])(?=\()/gu, '\\mathrm{$1}'],
  [/≈/g, '\\approx '], [/π/g, '\\pi '], [/α/g, '\\alpha '], [/β/g, '\\beta '], [/γ/g, '\\gamma '],
  [/θ/g, '\\theta '], [/λ/g, '\\lambda '], [/μ/g, '\\mu '],
  [/²/g, '^2'], [/³/g, '^3'], [/×/g, '\\times '], [/÷/g, '\\div '],
  [/Ç/g, '\\text{Ç}'], [/∠/g, '\\angle '], [/⊥/g, '\\perp '], [/∥/g, '\\parallel '], [/≅/g, '\\cong '],
  [/≠/g, '\\neq '], [/≤/g, '\\leq '], [/≥/g, '\\geq '], [/−/g, '-'], [/…/g, '\\dots '],
  [/;/g, ';\\ '], [/%/g, '\\%'], [/′/g, "'"],
  // Türkçe tırnaklar sözcüğe ait olmadıkları yerde de matematik kipinde kalmamalı.
  [/([“”„‘’«»])/g, '\\text{$1}'],
];
function latexSembol(s: string): string {
  let t = s;
  for (const [re, r] of LATEX_SEMBOL) t = t.replace(re, r);
  return t;
}
const metinKacis = (s: string) => s.replace(/\\/g, '\\textbackslash ').replace(/([&%$#_{}])/g, '\\$1');
const LATEX_BIRIM: Record<Birim, string> = {
  br: '\\ \\mathrm{br}', 'br²': '\\ \\mathrm{br}^2', 'br³': '\\ \\mathrm{br}^3',
  cm: '\\ \\mathrm{cm}', 'cm²': '\\ \\mathrm{cm}^2', '°': '^\\circ',
};

/**
 * "LaTeX olarak kopyala": KaTeX, MathJax ve Word denklem düzenleyicisiyle uyumlu.
 * Yay varsayılan olarak \overset{\frown} ile yazılır (her ortamda var); \overparen seçenek olarak verilir.
 */
export function latex(d: Dugum[], sec: LatexSecenegi = {}): string {
  const yay = sec.yayKomutu === 'overparen' ? 'overparen' : 'frown';
  const cevir = (liste: Dugum[]): string => liste.map((x) => {
    switch (x.t) {
      case 'sembol': return latexSembol(x.s);
      case 'kelime': return `\\text{${metinKacis(x.s)}}`;
      case 'sayi': return x.s.replace(',', '{,}').replace('−', '-');
      case 'birim': return LATEX_BIRIM[x.s];
      case 'ad': return latexAdi(x.s);
      case 'mutlak': return `|${cevir(x.ic)}|`;
      case 'kesir': return `\\frac{${cevir(x.pay)}}{${cevir(x.payda)}}`;
      case 'sus': {
        const ic = cevir(x.ic);
        if (x.tur === 'sapka') return `\\widehat{${ic}}`;
        if (x.tur === 'ucgen') return `\\overset{\\triangle}{${ic}}`;
        return yay === 'overparen' ? `\\overparen{${ic}}` : `\\overset{\\frown}{${ic}}`;
      }
    }
  }).join('');
  return cevir(d).replace(/ {2,}/g, ' ').trim();
}
export const olcuLatex = (o: Olcu, ayar: YazimAyari = VARSAYILAN_YAZIM, sec?: LatexSecenegi) =>
  latex(olcuDugumleri(o, ayar), sec);

/**
 * LaTeX denetimi (test ve geliştirme): matematik kipinde ASCII dışı karakter ya da çıplak virgül kalmamalı,
 * süslü parantezler dengeli olmalı. Boş liste = sorun yok.
 */
export function latexDenetle(s: string): string[] {
  const hata: string[] = [];
  let derinlik = 0;
  let metinDerinlik: number | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const metinBasi = s.startsWith('\\text{', i) ? 6 : s.startsWith('\\mathrm{', i) ? 8 : 0;
    if (metinBasi) {
      if (metinDerinlik === null) metinDerinlik = derinlik;
      derinlik++; i += metinBasi - 1; continue;
    }
    if (c === '{') { derinlik++; continue; }
    if (c === '}') { derinlik--; if (metinDerinlik !== null && derinlik <= metinDerinlik) metinDerinlik = null; continue; }
    if (c === '\\') { i++; continue; }
    if (metinDerinlik !== null) continue;
    if (/[^\x00-\x7F]/.test(c)) hata.push(`matematik kipinde ASCII dışı: ${JSON.stringify(c)}`);
    // Ondalık virgül {,} ile yazılmalı: 28{,}27. Tümce virgülü (br², Ç(…)) matematik kipinde sorun değil.
    if (c === ',' && /\d/.test(s[i - 1] ?? '') && /\d/.test(s[i + 1] ?? '')) hata.push('matematik kipinde çıplak ondalık virgül');
  }
  if (derinlik !== 0) hata.push('süslü parantezler dengesiz');
  return hata;
}

// ------------------------------------------------------------------------------------------------ sesli sayı

const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

function ucBasamak(n: number): string {
  const y = Math.floor(n / 100), o = Math.floor((n % 100) / 10), b = n % 10;
  return [y ? (y === 1 ? 'yüz' : `${BIRLER[y]} yüz`) : '', ONLAR[o], BIRLER[b]].filter(Boolean).join(' ');
}
function tamSayiOku(n: number): string {
  if (n === 0) return 'sıfır';
  const parcalar: string[] = [];
  const milyar = Math.floor(n / 1e9), milyon = Math.floor((n % 1e9) / 1e6), bin = Math.floor((n % 1e6) / 1000), kalan = n % 1000;
  if (milyar) parcalar.push(`${ucBasamak(milyar)} milyar`);
  if (milyon) parcalar.push(`${ucBasamak(milyon)} milyon`);
  if (bin) parcalar.push(bin === 1 ? 'bin' : `${ucBasamak(bin)} bin`);
  if (kalan) parcalar.push(ucBasamak(kalan));
  return parcalar.join(' ');
}
/** "10,39" → "on virgül otuz dokuz"; "2,05" → "iki virgül sıfır beş"; "-3" → "eksi üç". */
export function sayiOku(metin: string): string {
  const m = metin.trim().match(/^([-−])?(\d+)(?:,(\d+))?$/);
  if (!m) return metin;
  const [, eksi, tam, ondalik] = m;
  let s = tamSayiOku(Number(tam));
  if (ondalik) {
    const sifir = ondalik.match(/^0*/)![0].length;
    const kalan = ondalik.slice(sifir);
    s += ' virgül ' + [...Array(sifir).fill('sıfır'), kalan ? tamSayiOku(Number(kalan)) : ''].filter(Boolean).join(' ');
  }
  return (eksi ? 'eksi ' : '') + s;
}

const SIRA: Record<string, string> = {
  bir: 'birinci', iki: 'ikinci', üç: 'üçüncü', dört: 'dördüncü', beş: 'beşinci', altı: 'altıncı', yedi: 'yedinci',
  sekiz: 'sekizinci', dokuz: 'dokuzuncu', on: 'onuncu', yirmi: 'yirminci', otuz: 'otuzuncu', kırk: 'kırkıncı',
  elli: 'ellinci', altmış: 'altmışıncı', yetmiş: 'yetmişinci', seksen: 'sekseninci', doksan: 'doksanıncı',
  yüz: 'yüzüncü', bin: 'bininci',
};
function siraOku(n: string): string {
  const sozler = sayiOku(n).split(' ');
  const son = sozler[sozler.length - 1];
  sozler[sozler.length - 1] = SIRA[son] ?? `${son}ncı`;
  return sozler.join(' ');
}

/**
 * Harf adları. V 'vi' okunur ('ve' bağlaç sanılır), W 'dabılyu' (speechText.ts girdi tarafında da böyle).
 */
const HARF: Record<string, string> = {
  A: 'a', B: 'be', C: 'ce', Ç: 'çe', D: 'de', E: 'e', F: 'fe', G: 'ge', Ğ: 'yumuşak ge', H: 'he', I: 'ı', İ: 'i', J: 'je', K: 'ke',
  L: 'le', M: 'me', N: 'ne', O: 'o', Ö: 'ö', P: 'pe', Q: 'kü', R: 're', S: 'se', Ş: 'şe', T: 'te', U: 'u', Ü: 'ü', V: 'vi',
  W: 'dabılyu', X: 'iks', Y: 'ye', Z: 'ze',
};
/** Harf harf okunmayan kısaltmalar. */
const KISALTMALAR = new Set(['MEB', 'PDF', 'PNG', 'SVG', 'JPG', 'JPEG', 'GIF', 'USB', 'LGS', 'TYT', 'AYT', 'ÖSYM', 'HTML', 'CSV', 'GLB']);

/** Nokta adını harf harf okur: "A_1" → "a bir", "B'" → "be üssü". Ses motoru "AB"yi tek sözcük okumasın. */
export function adOku(s: string): string {
  const m = s.match(/^(\p{Lu})(?:_?(\d+))?(['′]*)$/u);
  if (!m) return [...s].map((c) => HARF[c] ?? c).join(' ');
  const [, harf, alt, us] = m;
  const parca = [HARF[harf] ?? harf.toLocaleLowerCase('tr')];
  if (alt) parca.push(tamSayiOku(Number(alt)));
  for (let i = 0; i < us.length; i++) parca.push('üssü');
  return parca.join(' ');
}
const adlariOku = (a: string[]) => a.map(adOku).join(' ');

const BIRIM_OKU: Record<Birim, string> = { br: 'birim', 'br²': 'birimkare', 'br³': 'birimküp', cm: 'santimetre', 'cm²': 'santimetrekare', '°': 'derece' };
const COKGEN_ADI = (n: number) => (n === 3 ? 'üçgeni' : n === 4 ? 'dörtgeni' : n === 5 ? 'beşgeni' : n === 6 ? 'altıgeni' : 'çokgeni');
const COKGEN_IYELIK = (n: number) => `${COKGEN_ADI(n)}nin`;
const FN_OKU: Record<TrigFn, string> = { sin: 'sinüsü', cos: 'kosinüsü', tan: 'tanjantı' };

/** Öznenin iki biçimi: sesli (harf adları) ve açıklama (ekrandaki adlar). */
function ozne(o: Olcu, oku: (a: string[]) => string): string {
  const a = o.adlar && o.adlar.length ? o.adlar : null;
  const n = a ? oku(a) + ' ' : '';
  const yayTuru = o.yarimCember ? 'yarım çemberinin' : `${o.buyukYay ? 'büyük ' : ''}yayının`;
  switch (o.tur) {
    case 'uzunluk': return a ? `${n}uzunluğu` : 'uzunluk';
    case 'aci': return a ? `${n}${o.disAci ? 'dış ' : ''}açısının ölçüsü` : 'açının ölçüsü';
    case 'merkezAci': return a ? `${n}merkez açısının ölçüsü` : 'merkez açının ölçüsü';
    case 'yayOlcusu': return a ? `${n}${yayTuru} ölçüsü` : 'yayın ölçüsü';
    case 'yayUzunlugu': return a ? `${n}${yayTuru} uzunluğu` : 'yay uzunluğu';
    case 'alan': return a ? `${n}${COKGEN_IYELIK(a.length)} alanı` : 'alan';
    case 'cevre': return a ? `${n}${COKGEN_IYELIK(a.length)} çevresi` : 'çevre';
    case 'dilimAlani': return a ? `${n}daire diliminin alanı` : 'daire diliminin alanı';
    case 'dilimCevresi': return a ? `${n}daire diliminin çevresi` : 'daire diliminin çevresi';
    case 'yaricap': return a ? `${n}yarıçapının uzunluğu` : 'yarıçap';
    case 'kiris': return a ? `${n}kirişinin uzunluğu` : 'kiriş uzunluğu';
    case 'cap': return a ? `${n}çapının uzunluğu` : 'çap uzunluğu';
    case 'daireAlani': return 'dairenin alanı';
    case 'cemberCevresi': return 'çemberin çevre uzunluğu';
    case 'elipsAlani': return 'elipsin alanı';
    case 'elipsCevresi': return 'elipsin çevre uzunluğu';
    case 'egim': return a ? `${n}doğrusunun eğimi` : 'eğim';
    case 'koordinat': return a ? `${n}noktasının koordinatları` : 'koordinatlar';
    case 'trig': {
      const fn = FN_OKU[o.trig?.fn ?? 'sin'];
      return a ? `${n}açısının ${fn}` : fn;
    }
  }
}

/**
 * Sesli okunuş: sembol, rakam ya da kısaltma İÇERMEZ ("m", "|", "°", "br²", "≈" okunmaz).
 * Ekran okuyucu (aria-label, canlı bölge) ve ileride eklenecek konuşma çıktısı bunu kullanır.
 */
export function sesli(o: Olcu): string {
  const bas = ozne(o, adlariOku);
  if (o.deger === null) return `${bas} tanımsız`;
  if (o.tur === 'koordinat') return `${bas} ${sayiOku(sayiMetni(o.deger, o.basamak))} ve ${sayiOku(sayiMetni(o.deger2 ?? 0, o.basamak))}`;
  const b = birimOf(o);
  return [bas, yaklasikMi(o) ? 'yaklaşık' : '', sayiOku(sayiMetni(o.deger, o.basamak)), b ? BIRIM_OKU[b] : '']
    .filter(Boolean).join(' ');
}

/** Açıklama: fare ipucu (<title>) ve kısa yazımda tam ad; adlar ve rakamlar ekrandaki gibi. */
export function aciklama(o: Olcu): string {
  const bas = ozne(o, (a) => a.join(''));
  const ilk = bas.charAt(0).toLocaleUpperCase('tr') + bas.slice(1);
  if (o.deger === null) return `${ilk} tanımsız`;
  if (o.tur === 'koordinat') return `${ilk}: (${sayiMetni(o.deger, o.basamak)}; ${sayiMetni(o.deger2 ?? 0, o.basamak)})`;
  const b = birimOf(o);
  return `${ilk}: ${yaklasikMi(o) ? '≈ ' : ''}${sayiMetni(o.deger, o.basamak)}${b ? birimMetni(b) : ''}`;
}

// ------------------------------------------------------------------------------------------------ düz metni okuma

/** Tek nokta adı: A, A_1, A1, B' (Türkçe ek kesme işaretini — "ABC'nin" — üs sanma). */
const AD = "\\p{Lu}(?:_?\\d{1,3})?(?:['′](?!\\p{Ll}))*";
const ADLAR = `(?:${AD})+`;
const YAY_ADI = `${AD}(?:\\u0361${AD})+`;
const adlariBol = (s: string): string[] => s.replace(/͡/g, '').match(new RegExp(AD, 'gu')) ?? [s];

const ALT_RAKAM: Record<string, string> = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
/** 'A₁' → 'A_1' (LaTeX ve sesli okunuş alt indis rakamını tanımaz). */
const altIndisleriDuzle = (s: string) => s.replace(/(\p{Lu})([₀-₉]+)/gu, (_, h: string, r: string) => `${h}_${[...r].map((c) => ALT_RAKAM[c]).join('')}`);

/**
 * metniCozumle'nin çözemediği düz metin parçasını simge / sayı / birim / ad / sözcük düğümlerine böler.
 * Amaç geçerli LaTeX: sözcükler \text{…} içine girer, nokta adları \mathrm{…} olur, 'r' ve 'x' matematik
 * kipinde eğik kalır, sayı ve birim kendi düğümüne ayrılır. duzMetin(metinDugumleri(s)) === s korunur.
 */
const PARCA = new RegExp(
  [
    '(?<sayi>(?<![\\p{L}\\d])[-−]?\\d+(?:,\\d+)?)',
    '(?<birim> (?:br²|br³|br|cm²|cm)(?![\\p{L}])|°)',
    '(?<islev>[A-ZÇ]|m)(?=\\()',
    '(?<fonk>(?<![\\p{L}\\d])(?:sin|cos|tan|cot)(?![\\p{L}\\d]))',
    `(?<ad>(?:${AD})+)(?![\\p{Ll}])`,
    // Tek başına duran küçük latin harfi (r, x, y, n) matematik kipinde eğik kalır; 'π' harften sayılmaz.
    '(?<tekharf>(?<![A-Za-zÇĞİÖŞÜçğıöşü])[a-z](?![A-Za-zÇĞİÖŞÜçğıöşü]))',
    '(?<yunan>[\\u0391-\\u03C9])',
    "(?<kelime>[\\p{L}][\\p{L}\\d’']*)",
    '(?<simge>[^\\p{L}\\d]+)',
    // Hiçbir kurala uymayan tek karakter (ör. 'c1' içindeki rakam) düşmesin: duzMetin geri dönebilmeli.
    '(?<kalan>[\\s\\S])',
  ].join('|'),
  'gu',
);

export function metinDugumleri(metin: string): Dugum[] {
  const s = altIndisleriDuzle(metin);
  const out: Dugum[] = [];
  const ekle = (d: Dugum) => {
    const o = out[out.length - 1];
    if (d.t === 'kelime' && o?.t === 'kelime' && !o.soluk && !d.soluk) out[out.length - 1] = { t: 'kelime', s: o.s + d.s };
    else if (d.t === 'sembol' && o?.t === 'sembol') out[out.length - 1] = { t: 'sembol', s: o.s + d.s };
    else out.push(d);
  };
  for (const m of s.matchAll(PARCA)) {
    const g = m.groups!;
    if (g.sayi) ekle({ t: 'sayi', s: g.sayi });
    else if (g.birim) ekle({ t: 'birim', s: g.birim.trim() as Birim });
    else if (g.islev) ekle(sembol(g.islev));
    else if (g.fonk) ekle(sembol(g.fonk));
    else if (g.ad) for (const a of g.ad.match(new RegExp(AD, 'gu')) ?? []) ekle(ad(a));
    else if (g.tekharf) ekle(sembol(g.tekharf));
    else if (g.yunan) ekle(sembol(g.yunan));
    else if (g.kelime) ekle(kelime(g.kelime));
    else if (g.simge) {
      // Sözcükler arası boşluk, noktalama ve tırnaklar sözcüğe aittir; matematik simgeleri ayrı kalır.
      const sozcukEki = /^[\s.,:;!?…“”‘’]+$/u.test(g.simge) && out[out.length - 1]?.t === 'kelime';
      ekle(sozcukEki ? kelime(g.simge) : sembol(g.simge));
    }
    else if (g.kalan !== undefined) ekle(sembol(g.kalan));
  }
  return out;
}

const ONBELLEK_SINIRI = 600;
function onbellekli<T>(m: Map<string, T>, anahtar: string, uret: () => T): T {
  const hazir = m.get(anahtar);
  if (hazir !== undefined) return hazir;
  const yeni = uret();
  if (m.size >= ONBELLEK_SINIRI) m.clear();
  m.set(anahtar, yeni);
  return yeni;
}
const COZUM_ONBELLEK = new Map<string, Dugum[]>();
const SESLI_ONBELLEK = new Map<string, string>();

function cozumleHam(metin: string, ayar: YazimAyari): Dugum[] {
  const re = new RegExp(
    [
      `m\\(∠(${ADLAR})\\)`, // 1 açı ölçüsü
      `m\\((${YAY_ADI})\\)`, // 2 yay ölçüsü
      `\\|(${YAY_ADI})\\|`, // 3 yay uzunluğu
      `\\|(${ADLAR})\\|`, // 4 uzunluk
      `∠(${ADLAR})`, // 5 açı adı
      `△(${ADLAR})`, // 6 üçgen adı
      `(${AD})\\u0302`, // 7 tek harfli şapka
      `(${YAY_ADI})`, // 8 yay adı
    ].join('|'),
    'gu',
  );
  const out: Dugum[] = [];
  let son = 0;
  const metinEkle = (s: string) => { if (s) out.push(sembol(s)); };
  for (const m of metin.matchAll(re)) {
    metinEkle(metin.slice(son, m.index));
    son = m.index + m[0].length;
    const [, aciOlc, yayOlc, yayUz, uz, aciAd, ucgen, tek, yay] = m;
    if (aciOlc) out.push(...aciAdi(adlariBol(aciOlc), ayar));
    else if (yayOlc) out.push(sembol('m('), yayAdi(adlariBol(yayOlc)), sembol(')'));
    else if (yayUz) out.push(mutlak([yayAdi(adlariBol(yayUz))]));
    else if (uz) out.push(mutlak(adDizisi(adlariBol(uz))));
    else if (aciAd) out.push(...aciSembolu(adlariBol(aciAd), ayar));
    else if (ucgen) out.push({ t: 'sus', tur: 'ucgen', ic: adDizisi(adlariBol(ucgen)) });
    else if (tek) out.push(...aciSembolu([tek], ayar));
    else if (yay) out.push(yayAdi(adlariBol(yay)));
  }
  metinEkle(metin.slice(son));
  // Kalan her düz metin parçası sayı / birim / ad / sözcük düğümlerine bölünür (geçerli LaTeX için),
  // sonra komşu simge ve sözcük parçaları birleştirilir (tuvalde her parça ayrı bir <text> olur).
  return out.flatMap((d) => (d.t === 'sembol' ? metinDugumleri(d.s) : [d])).reduce<Dugum[]>((acc, x) => {
    const o = acc[acc.length - 1];
    if (x.t === 'sembol' && o?.t === 'sembol') acc[acc.length - 1] = sembol(o.s + x.s);
    else if (x.t === 'kelime' && o?.t === 'kelime' && !o.soluk && !x.soluk) acc[acc.length - 1] = kelime(o.s + x.s);
    else acc.push(x);
    return acc;
  }, []);
}

/**
 * Düz metni (komut yanıtı, ipucu, panel satırı) süslü görüntü ağacına çevirir. Tanınan kalıplar:
 *   m(∠ABC)  m(A͡B)  |A͡B|  |AB|  ∠ABC  △ABC  B̂  A͡B
 * Geri kalanı sayı, birim, ad ve sözcük düğümlerine ayrılır; duzMetin ile aynı metne döner.
 */
export function metniCozumle(metin: string, ayar: YazimAyari = VARSAYILAN_YAZIM): Dugum[] {
  return onbellekli(COZUM_ONBELLEK, `${ayar.aciYazimi} ${metin}`, () => cozumleHam(metin, ayar));
}

/** "ABC" → "a be ce" (A_1, B' gibi adlar dahil). */
function adBol(a: string): string {
  return adlariBol(a).map(adOku).join(' ');
}

/** Ölçü öznesinin sonunu imler: tek '=' burada DÜŞER ("a be uzunluğu beş birim"). */
const IM = '';

function seslendirHam(metin: string): string {
  const A = (re: string) => new RegExp(re, 'gu');
  const cokgen = (s: string) => ({ ad: adBol(s), n: adlariBol(s).length });
  const FONK: Record<string, string> = { f: 'ef', g: 'ge', h: 'he' };
  return altIndisleriDuzle(metin)
    // ---- yapısal ölçü kalıpları: öznenin sonuna İM konur
    .replace(A(`m\\(∠?(${ADLAR})\\)`), (_, a: string) => ` ${adBol(a)} açısının ölçüsü${IM} `)
    .replace(A(`m\\((${YAY_ADI})\\)`), (_, a: string) => ` ${adBol(a)} yayının ölçüsü${IM} `)
    .replace(A(`\\|(${YAY_ADI})\\|`), (_, a: string) => ` ${adBol(a)} yayının uzunluğu${IM} `)
    .replace(A(`r = \\|(${ADLAR})\\|`), (_, a: string) => ` yarıçap, ${adBol(a)} uzunluğu${IM} `)
    .replace(A(`kiriş \\|(${ADLAR})\\|`), (_, a: string) => ` ${adBol(a)} kirişinin uzunluğu${IM} `)
    .replace(A(`çap \\|(${ADLAR})\\| = 2r`), (_, a: string) => ` ${adBol(a)} çapının uzunluğu, iki r${IM} `)
    .replace(A(`\\|(${ADLAR})\\|`), (_, a: string) => ` ${adBol(a)} uzunluğu${IM} `)
    .replace(A(`A\\((${ADLAR}) dilimi\\)`), (_, a: string) => ` ${adBol(a)} daire diliminin alanı${IM} `)
    .replace(A(`Ç\\((${ADLAR}) dilimi\\)`), (_, a: string) => ` ${adBol(a)} daire diliminin çevresi${IM} `)
    .replace(A(`Ç\\((${AD}), r\\)`), (_, a: string) => ` ${adBol(a)} merkezli çember `)
    .replace(A(`Ç\\((${AD}), (\\d+(?:,\\d+)?)\\)`), (_, a: string, r: string) => ` ${adBol(a)} merkezli, ${sayiOku(r)} birim yarıçaplı çember `)
    .replace(A(`A\\((${ADLAR})\\)`), (w: string, a: string) => { const c = cokgen(a); return c.n >= 3 ? ` ${c.ad} ${COKGEN_IYELIK(c.n)} alanı${IM} ` : w; })
    .replace(A(`Ç\\((${ADLAR})\\)`), (w: string, a: string) => { const c = cokgen(a); return c.n >= 3 ? ` ${c.ad} ${COKGEN_IYELIK(c.n)} çevresi${IM} ` : w; })
    .replace(A(`△(${ADLAR})`), (_, a: string) => ` ${adBol(a)} üçgeni `)
    // \b ASCII'dir: "sinüsü" içindeki "sin"i yeniden yakalamasın diye Unicode harf sınırı kullanılır.
    .replace(A(`(?<!\\p{L})(sin|cos|tan) ∠?(${AD})\\u0302?(?!\\p{L})`), (_, fn: TrigFn, a: string) => ` ${adBol(a)} açısının ${FN_OKU[fn]}${IM} `)
    .replace(A(`(?<!\\p{L})(sin|cos|tan) ∠?(${ADLAR})`), (_, fn: TrigFn, a: string) => ` ${adBol(a)} açısının ${FN_OKU[fn]}${IM} `)
    .replace(/(?<!\p{L})(sin|cos|tan)(?!\p{L})/gu, (fn: string) => ` ${FN_OKU[fn as TrigFn]}${IM} `)
    .replace(A(`∠(${ADLAR})(?: açısı)?`), (_, a: string) => ` ${adBol(a)} açısı `)
    .replace(A(`(${AD})\\u0302(?: açısı)?`), (_, a: string) => ` ${adBol(a)} açısı `)
    .replace(A(`\\[(${ADLAR})\\]`), (_, a: string) => ` ${adBol(a)} doğru parçası `)
    .replace(A(`(${YAY_ADI})`), (_, a: string) => ` ${adBol(a)} yayı `)
    // koordinat: "A(2; -3) noktası" → "a noktası, iki ve eksi üç" (tek 'noktası')
    .replace(A(`(?<![\\p{L}\\d])(${AD})\\((-?\\d+(?:,\\d+)?); (-?\\d+(?:,\\d+)?)\\)(\\s+noktası\\p{L}*)?`),
      (_, a: string, x: string, y: string, ek: string | undefined) =>
        ` ${adBol(a)} noktası${ek ? ek.replace(/^\s+noktası/u, '') : ''}, ${sayiOku(x)} ve ${sayiOku(y)}${ek ? ',' : ''} `)
    .replace(/\((-?\d+(?:,\d+)?); (-?\d+(?:,\d+)?)\)/g, (_, x: string, y: string) => ` ${sayiOku(x)} ve ${sayiOku(y)} `)
    // formüller — \b ASCII'dir ('çevre' önünde hiç eşleşmez): Unicode harf bakışı kullanılır
    .replace(/(?<!\p{L})(?:[Aa]lan|A) = πr²/gu, ` alan${IM} pi r kare `)
    .replace(/(?<!\p{L})(?:[Çç]evre|Ç) = 2πr/gu, ` çevre${IM} iki pi r `)
    .replace(/(?<!\p{L})(?:[Aa]lan|A) = πab/gu, ` alan${IM} pi a be `)
    .replace(/(^|[\s(:,])r = /g, `$1yarıçap${IM} `)
    .replace(/π/g, ' pi ')
    // fonksiyonlar ve üsler
    .replace(/(?<![\p{L}\d])([fgh])\(x\)/gu, (_, f: string) => ` ${FONK[f]} x `)
    .replace(/(?<![\p{L}\d])([fgh])\((-?\d+(?:,\d+)?)\)/gu, (_, f: string, n: string) => ` ${FONK[f]} ${sayiOku(n)} `)
    .replace(/\bbr²/g, ' birimkare ').replace(/\bbr³/g, ' birimküp ').replace(/\bbr\b/g, ' birim ')
    .replace(/\bcm²/g, ' santimetrekare ').replace(/\bcm\b/g, ' santimetre ')
    .replace(/²/g, ' kare ').replace(/³/g, ' küp ')
    .replace(/%\s*(\d)/g, 'yüzde $1').replace(/(\d)\s*%/g, '$1 yüzde')
    // sıra sayısı: "2. sınıf" → "ikinci sınıf" (cümle sonu noktası değil: ardından küçük harf gelmeli)
    .replace(/(?<![\d,])(\d{1,3})\.(?=\s+\p{Ll})/gu, (_, n: string) => siraOku(n))
    .replace(/(\d)(\p{Ll})/gu, '$1 $2')
    // büyük harf dizileri (kısaltmalar dışında) harf harf
    .replace(/(?<![\p{L}\d+])(\p{Lu}(?:_?\d{1,3})?(?:['′](?!\p{Ll}))*(?:\p{Lu}(?:_?\d{1,3})?(?:['′](?!\p{Ll}))*)*)(?!\p{Ll})/gu,
      (w: string) => (KISALTMALAR.has(w) ? w : ` ${adBol(w)} `))
    .replace(/≈/g, ' yaklaşık ')
    .replace(/(\d)\s*°/g, '$1 derece')
    .replace(/(^|[\s(=:])[-−](?=\d)/g, '$1eksi ')
    .replace(/\s[-−]\s/g, ' eksi ').replace(/\s\+\s/g, ' artı ')
    .replace(/\s*\/\s*/g, ' bölü ')
    .replace(/\d+(?:,\d+)?/g, (s) => sayiOku(s))
    // eşitlik: zincirde hep "eşittir"; tek eşitlikte İM'li özneden sonra DÜŞER, yoksa "eşittir"
    .replace(/[^.;:,]+/g, (cumle) => {
      const zincir = (cumle.match(/=/g)?.length ?? 0) >= 2;
      return cumle.replace(new RegExp(`(${IM})?\\s*=\\s*`, 'g'), (_, im: string | undefined) => (!zincir && im ? ' ' : ' eşittir '));
    })
    .replace(new RegExp(IM, 'g'), '')
    .replace(/[|∠⌢△̂͡]/g, '')
    .replace(/\s+([.,;:'’)\]])/g, '$1')
    .replace(/,\s*\./g, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Düz metni ekran okuyucu ve konuşma için sözcüklere çevirir; hiçbir sembol okunmaz
 * ("dikey çizgi A B dikey çizgi", "m sol parantez", "yaklaşık eşittir" yok).
 */
export function metniSeslendir(metin: string): string {
  return onbellekli(SESLI_ONBELLEK, metin, () => seslendirHam(metin));
}
