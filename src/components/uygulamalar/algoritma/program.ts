/**
 * Algoritma Laboratuvarı — program modeli.
 *
 * Bütün gösterimler (ok kartı, blok, akış şeması, sözde kod) aynı ağaçtan üretilir. Bir program
 * blok dizisidir; döngü, karar ve komut tanımı blokları kendi gövdelerini (iç içe blok dizisi)
 * taşır; "eğer" bloğunun isteğe bağlı bir "değilse" kolu vardır. Ağaç değişmezdir: düzenleme
 * işlevleri yeni bir program döndürür, kimlikler (id) korunur; böylece yorumlayıcının blok başına
 * sayımları ve düzenleyicinin vurguları kimliğe bağlanır.
 *
 * Konum: bir bloğun yeri { ebeveyn, indeks } ile verilir. ebeveyn null ise kök; bir kabın kimliği
 * ise o kabın gövdesi; `kimlik + DEGILSE` ise "eğer" bloğunun "değilse" kolu.
 *
 * Değişkenler (5. sınıftan): `ata` bloğu bir değişkene ifade değerini verir (sayaç ← sayaç + 1).
 * İfade: sayı · değişken · ölçüm (buradaki domatesin kütlesi, depo, x, y) · iki ifade arasında işlem.
 */

export type EylemTuru =
  | 'ileri'
  | 'sagaDon'
  | 'solaDon'
  | 'sula'
  | 'topla'
  | 'gubreVer'
  | 'boya'
  | 'ek'
  | 'koy'
  | 'isaretle'
  | 'kalemKaldir'
  | 'kalemIndir';
export type KosulTuru = 'cikistayim' | 'toprakKuru' | 'domatesKirmizi' | 'yaprakSari';

export type IslemOp = '+' | '-' | '×' | '÷' | 'mod';
/** kütle: robotun bulunduğu yerdeki domatesin kütlesi (g) · depo: depodaki su (L) · x, y: koordinat */
export type OlcumTuru = 'kutle' | 'depo' | 'x' | 'y';
export type Ifade =
  | { tur: 'sayi'; deger: number }
  | { tur: 'degisken'; ad: string }
  | { tur: 'olcum'; olcum: OlcumTuru }
  | { tur: 'islem'; op: IslemOp; sol: Ifade; sag: Ifade };
export type KarsilastirmaOp = '<' | '>' | '=' | '≠' | '≤' | '≥';
export interface Karsilastirma {
  tur: 'karsilastir';
  sol: Ifade;
  op: KarsilastirmaOp;
  sag: Ifade;
}
/** Duyu koşulu (robot bakar) ya da iki ifadenin karşılaştırılması */
export type Kosul = KosulTuru | Karsilastirma;

export interface EylemBlogu {
  id: string;
  tur: 'eylem';
  eylem: EylemTuru;
}
export interface KezBlogu {
  id: string;
  tur: 'tekrarlaKez';
  kez: number;
  /** Verilirse tekrar sayısı döngü başlarken bu ifadeden hesaplanır (n kez tekrarla) */
  kezIfade?: Ifade;
  govde: Blok[];
}
export interface KadarBlogu {
  id: string;
  tur: 'tekrarlaKadar';
  kosul: Kosul;
  govde: Blok[];
}
export interface EgerBlogu {
  id: string;
  tur: 'eger';
  kosul: Kosul;
  govde: Blok[];
  /** Tanımlıysa (boş dizi bile) "değilse" kolu vardır */
  degilse?: Blok[];
}
export interface AtaBlogu {
  id: string;
  tur: 'ata';
  degisken: string;
  ifade: Ifade;
}
export interface TanimBlogu {
  id: string;
  tur: 'tanim';
  ad: string;
  govde: Blok[];
}
export interface CagirBlogu {
  id: string;
  tur: 'cagir';
  ad: string;
}
export type GovdeliBlok = KezBlogu | KadarBlogu | EgerBlogu | TanimBlogu;
export type YalinBlok = EylemBlogu | AtaBlogu | CagirBlogu;
export type Blok = YalinBlok | GovdeliBlok;
export type Program = Blok[];

/** Araç kutusundaki bir blok şablonu (sürüklenince yeni kimlikle programa girer). */
export type BlokSablonu =
  | { tur: 'eylem'; eylem: EylemTuru }
  | { tur: 'tekrarlaKez'; kez: number; kezIfade?: Ifade }
  | { tur: 'tekrarlaKadar'; kosul: Kosul }
  | { tur: 'eger'; kosul: Kosul; degilse?: boolean }
  | { tur: 'ata'; degisken: string; ifade: Ifade }
  | { tur: 'tanim'; ad: string }
  | { tur: 'cagir'; ad: string };

export const KEZ_EN_AZ = 1;
export const KEZ_EN_COK = 20;
/** İfadeyle verilen tekrar sayısının üst sınırı */
export const KEZ_IFADE_EN_COK = 60;
export const DEGILSE = ':degilse';

export function govdeliMi(b: Blok): b is GovdeliBlok {
  return b.tur === 'tekrarlaKez' || b.tur === 'tekrarlaKadar' || b.tur === 'eger' || b.tur === 'tanim';
}

/** Bloğun iç listeleri: gövde ve (varsa) değilse kolu, konum anahtarlarıyla */
export function altListeler(b: Blok): { anahtar: string; liste: Blok[] }[] {
  if (!govdeliMi(b)) return [];
  const l = [{ anahtar: b.id, liste: b.govde }];
  if (b.tur === 'eger' && b.degilse) l.push({ anahtar: b.id + DEGILSE, liste: b.degilse });
  return l;
}

/** Konum anahtarından blok kimliği ("p3:degilse" → "p3") */
export function kapKimligi(anahtar: string): string {
  return anahtar.endsWith(DEGILSE) ? anahtar.slice(0, -DEGILSE.length) : anahtar;
}

export function karsilastirmaMi(k: Kosul): k is Karsilastirma {
  return typeof k === 'object' && k !== null && k.tur === 'karsilastir';
}

// ---------------------------------------------------------------------------
// Kimlik
// ---------------------------------------------------------------------------
let sayac = 0;
/** Oturum içinde benzersiz kimlik (kalıcı kayıtta da çakışmasın diye zaman damgası eklenir). */
export function yeniKimlik(): string {
  sayac += 1;
  return `b${Date.now().toString(36)}${sayac.toString(36)}`;
}

const ifadeKopya = (i: Ifade): Ifade => (i.tur === 'islem' ? { ...i, sol: ifadeKopya(i.sol), sag: ifadeKopya(i.sag) } : { ...i });
const kosulKopya = (k: Kosul): Kosul => (karsilastirmaMi(k) ? { ...k, sol: ifadeKopya(k.sol), sag: ifadeKopya(k.sag) } : k);

/** Şablondan yeni blok (boş gövdeyle). */
export function sablondanBlok(s: BlokSablonu, kimlik: () => string = yeniKimlik): Blok {
  const id = kimlik();
  switch (s.tur) {
    case 'eylem':
      return { id, tur: 'eylem', eylem: s.eylem };
    case 'tekrarlaKez':
      return s.kezIfade ? { id, tur: 'tekrarlaKez', kez: s.kez, kezIfade: ifadeKopya(s.kezIfade), govde: [] } : { id, tur: 'tekrarlaKez', kez: s.kez, govde: [] };
    case 'tekrarlaKadar':
      return { id, tur: 'tekrarlaKadar', kosul: kosulKopya(s.kosul), govde: [] };
    case 'eger':
      return s.degilse ? { id, tur: 'eger', kosul: kosulKopya(s.kosul), govde: [], degilse: [] } : { id, tur: 'eger', kosul: kosulKopya(s.kosul), govde: [] };
    case 'ata':
      return { id, tur: 'ata', degisken: s.degisken, ifade: ifadeKopya(s.ifade) };
    case 'tanim':
      return { id, tur: 'tanim', ad: s.ad, govde: [] };
    case 'cagir':
      return { id, tur: 'cagir', ad: s.ad };
  }
}

// ---------------------------------------------------------------------------
// Kısa yazım (görev verisi ve testler için)
// ---------------------------------------------------------------------------

/** İfade: sayı · "sayaç" (değişken) · "@kutle" (ölçüm) · [sol, işlem, sağ] */
export type IfadeKisa = number | string | [IfadeKisa, IslemOp, IfadeKisa];
/** Koşul: duyu koşulu ya da [sol, karşılaştırma, sağ] */
export type KosulKisa = KosulTuru | [IfadeKisa, KarsilastirmaOp, IfadeKisa];

/**
 * Kısa yazımla program kurma:
 * `['ileri', ['kadar', 'cikistayim', [...]], ['eger', 'toprakKuru', ['sula'], ['ileri']], ['kez', 3, [...]],
 *   ['kez', 'n', [...]], ['ata', 'sayaç', ['sayaç', '+', 1]], ['eger', [['sıra', 'mod', 3], '=', 0], [...]],
 *   ['tanim', 'KARE', [...]], ['cagir', 'KARE']]`.
 * Kimlikler öneke göre sırayla verilir (p1, p2 …), böylece görev verisindeki programlar kararlıdır.
 */
export type KisaBlok =
  | EylemTuru
  | ['kez', IfadeKisa, KisaBlok[]]
  | ['kadar', KosulKisa, KisaBlok[]]
  | ['eger', KosulKisa, KisaBlok[]]
  | ['eger', KosulKisa, KisaBlok[], KisaBlok[]]
  | ['ata', string, IfadeKisa]
  | ['tanim', string, KisaBlok[]]
  | ['cagir', string];

const OLCUMLER: readonly OlcumTuru[] = ['kutle', 'depo', 'x', 'y'];
const ISLEMLER: readonly IslemOp[] = ['+', '-', '×', '÷', 'mod'];
export const KARSILASTIRMALAR: readonly KarsilastirmaOp[] = ['<', '>', '=', '≠', '≤', '≥'];

export function ifadeKur(k: IfadeKisa): Ifade {
  if (typeof k === 'number') return { tur: 'sayi', deger: k };
  if (typeof k === 'string') {
    if (k.startsWith('@')) {
      const o = k.slice(1) as OlcumTuru;
      if (!OLCUMLER.includes(o)) throw new Error(`Bilinmeyen ölçüm: ${k}`);
      return { tur: 'olcum', olcum: o };
    }
    return { tur: 'degisken', ad: k };
  }
  return { tur: 'islem', op: k[1], sol: ifadeKur(k[0]), sag: ifadeKur(k[2]) };
}

export function kosulKur(k: KosulKisa): Kosul {
  if (typeof k === 'string') return k;
  return { tur: 'karsilastir', sol: ifadeKur(k[0]), op: k[1], sag: ifadeKur(k[2]) };
}

export function programKur(kisa: readonly KisaBlok[], onek = 'p'): Program {
  let i = 0;
  const kimlik = () => `${onek}${++i}`;
  const kur = (liste: readonly KisaBlok[]): Blok[] =>
    liste.map((k): Blok => {
      if (typeof k === 'string') {
        // Görev verisindeki yazım hatalarını erken yakala (ör. gövde listesi yerine tek blok verilmesi)
        if (!EYLEMLER.includes(k)) throw new Error(`Bilinmeyen eylem: ${k}`);
        return { id: kimlik(), tur: 'eylem', eylem: k };
      }
      const id = kimlik();
      switch (k[0]) {
        case 'kez':
          return typeof k[1] === 'number' ? { id, tur: 'tekrarlaKez', kez: k[1], govde: kur(k[2]) } : { id, tur: 'tekrarlaKez', kez: 1, kezIfade: ifadeKur(k[1]), govde: kur(k[2]) };
        case 'kadar':
          return { id, tur: 'tekrarlaKadar', kosul: kosulKur(k[1]), govde: kur(k[2]) };
        case 'eger': {
          const govde = kur(k[2]);
          return k.length === 4 ? { id, tur: 'eger', kosul: kosulKur(k[1]), govde, degilse: kur(k[3]) } : { id, tur: 'eger', kosul: kosulKur(k[1]), govde };
        }
        case 'ata':
          return { id, tur: 'ata', degisken: k[1], ifade: ifadeKur(k[2]) };
        case 'tanim':
          return { id, tur: 'tanim', ad: k[1], govde: kur(k[2]) };
        case 'cagir':
          return { id, tur: 'cagir', ad: k[1] };
      }
    });
  return kur(kisa);
}

// ---------------------------------------------------------------------------
// Sorgular
// ---------------------------------------------------------------------------

/** Blok sayısı: her blok 1 (koşul ve ifade, bağlı olduğu bloğun parçasıdır). */
export function blokSayisi(p: Program): number {
  let n = 0;
  for (const b of p) {
    n += 1;
    for (const a of altListeler(b)) n += blokSayisi(a.liste);
  }
  return n;
}

/** Bütün blokları derinlik öncelikli sırayla dolaşır (gövde, sonra değilse kolu). */
export function* bloklar(p: Program): Generator<Blok> {
  for (const b of p) {
    yield b;
    for (const a of altListeler(b)) yield* bloklar(a.liste);
  }
}

export function blokBul(p: Program, id: string): Blok | null {
  for (const b of bloklar(p)) if (b.id === id) return b;
  return null;
}

/** Bloğun bulunduğu yer: ebeveyn (null = kök; "id:degilse" = değilse kolu) ve sıra. */
export interface Konum {
  ebeveyn: string | null;
  indeks: number;
}

export function konumBul(p: Program, id: string, ebeveyn: string | null = null): Konum | null {
  for (let i = 0; i < p.length; i++) {
    const b = p[i];
    if (b.id === id) return { ebeveyn, indeks: i };
    for (const a of altListeler(b)) {
      const k = konumBul(a.liste, id, a.anahtar);
      if (k) return k;
    }
  }
  return null;
}

/** `ata` bloğu (ya da bir kolu) `id` bloğunu (ya da kendisini) içeriyor mu? */
export function iceriyorMu(p: Program, ata: string, id: string): boolean {
  const a = blokBul(p, kapKimligi(ata));
  if (!a) return false;
  if (a.id === id) return true;
  return altListeler(a).some((l) => blokBul(l.liste, id) !== null);
}

/** Programda kullanılan eylem ve duyu koşulu türleri, değişkenler ve komutlar. */
export function kullanilanlar(p: Program): { eylemler: Set<EylemTuru>; kosullar: Set<KosulTuru>; turler: Set<Blok['tur']>; degiskenler: Set<string>; komutlar: Set<string> } {
  const eylemler = new Set<EylemTuru>();
  const kosullar = new Set<KosulTuru>();
  const turler = new Set<Blok['tur']>();
  const degiskenler = new Set<string>();
  const komutlar = new Set<string>();
  const ifade = (i: Ifade) => {
    if (i.tur === 'degisken') degiskenler.add(i.ad);
    else if (i.tur === 'islem') {
      ifade(i.sol);
      ifade(i.sag);
    }
  };
  const kosul = (k: Kosul) => {
    if (karsilastirmaMi(k)) {
      ifade(k.sol);
      ifade(k.sag);
    } else kosullar.add(k);
  };
  for (const b of bloklar(p)) {
    turler.add(b.tur);
    if (b.tur === 'eylem') eylemler.add(b.eylem);
    else if (b.tur === 'tekrarlaKadar' || b.tur === 'eger') kosul(b.kosul);
    else if (b.tur === 'tekrarlaKez' && b.kezIfade) ifade(b.kezIfade);
    else if (b.tur === 'ata') {
      degiskenler.add(b.degisken);
      ifade(b.ifade);
    } else if (b.tur === 'tanim' || b.tur === 'cagir') komutlar.add(b.ad);
  }
  return { eylemler, kosullar, turler, degiskenler, komutlar };
}

// ---------------------------------------------------------------------------
// Değişmez düzenleme
// ---------------------------------------------------------------------------

/** `anahtar` konumundaki listeyi f ile değiştirir (kök hariç). */
function listeyiDegistir(p: Program, anahtar: string, f: (liste: Blok[]) => Blok[]): Program {
  const hedefId = kapKimligi(anahtar);
  const degilse = anahtar.endsWith(DEGILSE);
  let degisti = false;
  const yeni = p.map((b) => {
    if (!govdeliMi(b)) return b;
    if (b.id === hedefId) {
      degisti = true;
      if (degilse && b.tur === 'eger') return { ...b, degilse: f(b.degilse ?? []) };
      return { ...b, govde: f(b.govde) };
    }
    let kopya: Blok = b;
    const g = listeyiDegistir(b.govde, anahtar, f);
    if (g !== b.govde) kopya = { ...b, govde: g };
    if (b.tur === 'eger' && b.degilse) {
      const d = listeyiDegistir(b.degilse, anahtar, f);
      if (d !== b.degilse) kopya = { ...(kopya as EgerBlogu), degilse: d };
    }
    if (kopya !== b) degisti = true;
    return kopya;
  });
  return degisti ? yeni : p;
}

/** Bloğu programdan çıkarır; [yeni program, çıkarılan blok]. */
export function cikar(p: Program, id: string): [Program, Blok | null] {
  let bulunan: Blok | null = null;
  const sil = (liste: Blok[]): Blok[] => {
    const i = liste.findIndex((b) => b.id === id);
    if (i >= 0) {
      bulunan = liste[i];
      return [...liste.slice(0, i), ...liste.slice(i + 1)];
    }
    let degisti = false;
    const yeni = liste.map((b) => {
      if (!govdeliMi(b) || bulunan) return b;
      let kopya: Blok = b;
      const g = sil(b.govde);
      if (g !== b.govde) kopya = { ...b, govde: g };
      if (!bulunan && b.tur === 'eger' && b.degilse) {
        const d = sil(b.degilse);
        if (d !== b.degilse) kopya = { ...(kopya as EgerBlogu), degilse: d };
      }
      if (kopya !== b) degisti = true;
      return kopya;
    });
    return degisti ? yeni : liste;
  };
  const sonuc = sil(p);
  return [sonuc, bulunan];
}

/** Bloğu verilen konuma ekler (indeks sınırlanır). Ebeveyn bulunamazsa köke, sona eklenir. */
export function ekle(p: Program, konum: Konum, blok: Blok): Program {
  const koy = (liste: Blok[]) => {
    const i = Math.max(0, Math.min(liste.length, konum.indeks));
    return [...liste.slice(0, i), blok, ...liste.slice(i)];
  };
  if (konum.ebeveyn === null) return koy(p);
  const e = blokBul(p, kapKimligi(konum.ebeveyn));
  if (!e || !govdeliMi(e)) return [...p, blok];
  if (konum.ebeveyn.endsWith(DEGILSE) && !(e.tur === 'eger' && e.degilse)) return [...p, blok];
  return listeyiDegistir(p, konum.ebeveyn, koy);
}

/**
 * Bloğu taşır. Hedef konum, blok çıkarılmadan önceki programa göre verilir (sürükle-bırak
 * göstergesi öyle hesaplar); aynı listede ileri taşımada indeks kaymasını burada düzeltiriz.
 * Blok kendi gövdesinin içine taşınamaz (değişiklik yapılmaz).
 */
export function tasi(p: Program, id: string, hedef: Konum): Program {
  if (hedef.ebeveyn !== null && iceriyorMu(p, id, kapKimligi(hedef.ebeveyn))) return p;
  const eski = konumBul(p, id);
  if (!eski) return p;
  let indeks = hedef.indeks;
  if (eski.ebeveyn === hedef.ebeveyn && eski.indeks < hedef.indeks) indeks -= 1;
  if (eski.ebeveyn === hedef.ebeveyn && eski.indeks === indeks) return p;
  const [cikmis, blok] = cikar(p, id);
  if (!blok) return p;
  return ekle(cikmis, { ebeveyn: hedef.ebeveyn, indeks }, blok);
}

export interface BlokDegisimi {
  kosul?: Kosul;
  kez?: number;
  kezIfade?: Ifade;
  ifade?: Ifade;
  degisken?: string;
}

/** Bloğun alanlarını günceller (koşul, tekrar sayısı / ifadesi, atamanın değişkeni ve ifadesi). */
export function guncelle(p: Program, id: string, degisim: BlokDegisimi): Program {
  const yap = (liste: Blok[]): Blok[] => {
    let degisti = false;
    const yeni = liste.map((b): Blok => {
      if (b.id === id) {
        degisti = true;
        switch (b.tur) {
          case 'tekrarlaKez': {
            let x: KezBlogu = b;
            if (degisim.kez !== undefined) x = { ...x, kez: Math.max(KEZ_EN_AZ, Math.min(KEZ_EN_COK, Math.round(degisim.kez))) };
            if (degisim.kezIfade) x = { ...x, kezIfade: degisim.kezIfade };
            return x;
          }
          case 'tekrarlaKadar':
          case 'eger':
            return degisim.kosul ? { ...b, kosul: degisim.kosul } : b;
          case 'ata':
            return { ...b, degisken: degisim.degisken ?? b.degisken, ifade: degisim.ifade ?? b.ifade };
          default:
            return b;
        }
      }
      if (!govdeliMi(b)) return b;
      let kopya: Blok = b;
      const g = yap(b.govde);
      if (g !== b.govde) kopya = { ...b, govde: g };
      if (b.tur === 'eger' && b.degilse) {
        const d = yap(b.degilse);
        if (d !== b.degilse) kopya = { ...(kopya as EgerBlogu), degilse: d };
      }
      if (kopya !== b) degisti = true;
      return kopya;
    });
    return degisti ? yeni : liste;
  };
  return yap(p);
}

export function ifadeAnahtari(i: Ifade): string {
  switch (i.tur) {
    case 'sayi':
      return String(i.deger);
    case 'degisken':
      return i.ad;
    case 'olcum':
      return `@${i.olcum}`;
    case 'islem':
      return `(${ifadeAnahtari(i.sol)}${i.op}${ifadeAnahtari(i.sag)})`;
  }
}

export function kosulAnahtari(k: Kosul): string {
  return karsilastirmaMi(k) ? `[${ifadeAnahtari(k.sol)}${k.op}${ifadeAnahtari(k.sag)}]` : k;
}

/** Kimliklerden bağımsız yapısal eşitlik (çözüm karşılaştırması, testler). */
export function yapiAnahtari(p: Program): string {
  return p
    .map((b) => {
      switch (b.tur) {
        case 'eylem':
          return b.eylem;
        case 'tekrarlaKez':
          return `kez(${b.kezIfade ? ifadeAnahtari(b.kezIfade) : b.kez})[${yapiAnahtari(b.govde)}]`;
        case 'tekrarlaKadar':
          return `kadar(${kosulAnahtari(b.kosul)})[${yapiAnahtari(b.govde)}]`;
        case 'eger':
          return `eger(${kosulAnahtari(b.kosul)})[${yapiAnahtari(b.govde)}]${b.degilse ? `degilse[${yapiAnahtari(b.degilse)}]` : ''}`;
        case 'ata':
          return `${b.degisken}=${ifadeAnahtari(b.ifade)}`;
        case 'tanim':
          return `tanim(${b.ad})[${yapiAnahtari(b.govde)}]`;
        case 'cagir':
          return `cagir(${b.ad})`;
      }
    })
    .join(',');
}

// ---------------------------------------------------------------------------
// Kalıcı kayıt doğrulaması
// ---------------------------------------------------------------------------

export const EYLEMLER: readonly EylemTuru[] = ['ileri', 'sagaDon', 'solaDon', 'sula', 'topla', 'gubreVer', 'boya', 'ek', 'koy', 'isaretle', 'kalemKaldir', 'kalemIndir'];
export const KOSULLAR: readonly KosulTuru[] = ['cikistayim', 'toprakKuru', 'domatesKirmizi', 'yaprakSari'];

const adGecerli = (x: unknown) => typeof x === 'string' && x.length > 0 && x.length <= 24;

export function ifadeGecerli(x: unknown, derinlik = 0): x is Ifade {
  if (!x || typeof x !== 'object' || derinlik > 8) return false;
  const o = x as Record<string, unknown>;
  switch (o.tur) {
    case 'sayi':
      return typeof o.deger === 'number' && Number.isFinite(o.deger);
    case 'degisken':
      return adGecerli(o.ad);
    case 'olcum':
      return OLCUMLER.includes(o.olcum as OlcumTuru);
    case 'islem':
      return ISLEMLER.includes(o.op as IslemOp) && ifadeGecerli(o.sol, derinlik + 1) && ifadeGecerli(o.sag, derinlik + 1);
    default:
      return false;
  }
}

export function kosulGecerli(x: unknown): x is Kosul {
  if (typeof x === 'string') return KOSULLAR.includes(x as KosulTuru);
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return o.tur === 'karsilastir' && KARSILASTIRMALAR.includes(o.op as KarsilastirmaOp) && ifadeGecerli(o.sol) && ifadeGecerli(o.sag);
}

/** Kalıcı kayıttan okunan programı doğrular (bozuk kayıt → null). */
export function programGecerli(x: unknown, derinlik = 0): x is Program {
  if (!Array.isArray(x) || derinlik > 12) return false;
  return x.every((b) => {
    if (!b || typeof b !== 'object') return false;
    const o = b as Record<string, unknown>;
    if (typeof o.id !== 'string') return false;
    switch (o.tur) {
      case 'eylem':
        return typeof o.eylem === 'string' && EYLEMLER.includes(o.eylem as EylemTuru);
      case 'tekrarlaKez':
        return typeof o.kez === 'number' && (o.kezIfade === undefined || ifadeGecerli(o.kezIfade)) && programGecerli(o.govde, derinlik + 1);
      case 'tekrarlaKadar':
        return kosulGecerli(o.kosul) && programGecerli(o.govde, derinlik + 1);
      case 'eger':
        return kosulGecerli(o.kosul) && programGecerli(o.govde, derinlik + 1) && (o.degilse === undefined || programGecerli(o.degilse, derinlik + 1));
      case 'ata':
        return adGecerli(o.degisken) && ifadeGecerli(o.ifade);
      case 'tanim':
        return adGecerli(o.ad) && programGecerli(o.govde, derinlik + 1);
      case 'cagir':
        return adGecerli(o.ad);
      default:
        return false;
    }
  });
}

// ---------------------------------------------------------------------------
// Adlar ve yazımlar
// ---------------------------------------------------------------------------

export const EYLEM_ADI: Record<EylemTuru, string> = {
  ileri: 'ileri git',
  sagaDon: 'sağa dön',
  solaDon: 'sola dön',
  sula: 'sula',
  topla: 'topla',
  gubreVer: 'gübre ver',
  boya: 'boya',
  ek: 'tohum ek',
  koy: 'küp koy',
  isaretle: 'nokta koy',
  kalemKaldir: 'kalemi kaldır',
  kalemIndir: 'kalemi indir',
};

/** "eğer … ise" başlığındaki koşul yazımı. */
export const KOSUL_EGER: Record<KosulTuru, string> = {
  cikistayim: 'çıkıştaysam',
  toprakKuru: 'toprak kuruysa',
  domatesKirmizi: 'domates kırmızıysa',
  yaprakSari: 'yaprak sarıysa',
};

/** "… olana kadar tekrarla" başlığındaki koşul yazımı. */
export const KOSUL_KADAR: Record<KosulTuru, string> = {
  cikistayim: 'çıkışa varana kadar',
  toprakKuru: 'toprak kuru olana kadar',
  domatesKirmizi: 'domates kırmızı olana kadar',
  yaprakSari: 'yaprak sarı olana kadar',
};

/** Koşulun kısa adı (seçim listesi, sensör göstergesi). */
export const KOSUL_ADI: Record<KosulTuru, string> = {
  cikistayim: 'çıkıştayım',
  toprakKuru: 'toprak kuru',
  domatesKirmizi: 'domates kırmızı',
  yaprakSari: 'yaprak sarı',
};

export const OLCUM_ADI: Record<OlcumTuru, string> = {
  kutle: 'kütle',
  depo: 'depo',
  x: 'x',
  y: 'y',
};

/** Ölçümün açıklaması (seçim listesi, öğretmen notu) */
export const OLCUM_ACIKLAMASI: Record<OlcumTuru, string> = {
  kutle: 'buradaki domatesin kütlesi (g)',
  depo: 'depodaki su (L)',
  x: 'robotun x koordinatı',
  y: 'robotun y koordinatı',
};

/** Türkçe sayı yazımı: ondalık virgül, eksi işareti "−" */
export function sayiMetni(n: number): string {
  const m = Number.isInteger(n) ? String(Math.abs(n)) : Math.abs(n).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  return n < 0 ? `−${m}` : m;
}

const ONCELIK: Record<IslemOp, number> = { '+': 1, '-': 1, '×': 2, '÷': 2, mod: 2 };
const OP_YAZI: Record<IslemOp, string> = { '+': '+', '-': '−', '×': '×', '÷': '÷', mod: 'mod' };

/** İfadenin okunur yazımı: "sayaç + 1", "2 × i − 1", "(a + b) × 2" */
export function ifadeMetni(i: Ifade, ust = 0, sagda = false): string {
  switch (i.tur) {
    case 'sayi':
      return sayiMetni(i.deger);
    case 'degisken':
      return i.ad;
    case 'olcum':
      return OLCUM_ADI[i.olcum];
    case 'islem': {
      const o = ONCELIK[i.op];
      const m = `${ifadeMetni(i.sol, o)} ${OP_YAZI[i.op]} ${ifadeMetni(i.sag, o, true)}`;
      return o < ust || (sagda && o === ust) ? `(${m})` : m;
    }
  }
}

export const KARSILASTIRMA_YAZI: Record<KarsilastirmaOp, string> = { '<': '<', '>': '>', '=': '=', '≠': '≠', '≤': '≤', '≥': '≥' };

export function karsilastirmaMetni(k: Karsilastirma): string {
  return `${ifadeMetni(k.sol)} ${KARSILASTIRMA_YAZI[k.op]} ${ifadeMetni(k.sag)}`;
}

/** Koşulun yazımı: "eğer" başlığında ("toprak kuruysa", "sıra mod 3 = 0 ise") ya da "kadar" başlığında */
export function kosulMetni(k: Kosul, bicim: 'eger' | 'kadar' | 'kisa'): string {
  if (karsilastirmaMi(k)) {
    const m = karsilastirmaMetni(k);
    return bicim === 'eger' ? `${m} ise` : bicim === 'kadar' ? `${m} olana kadar` : m;
  }
  return bicim === 'eger' ? KOSUL_EGER[k] : bicim === 'kadar' ? KOSUL_KADAR[k] : KOSUL_ADI[k];
}

export function kezMetni(b: { kez: number; kezIfade?: Ifade }): string {
  return b.kezIfade ? ifadeMetni(b.kezIfade) : String(b.kez);
}

export function atamaMetni(b: { degisken: string; ifade: Ifade }): string {
  return `${b.degisken} ← ${ifadeMetni(b.ifade)}`;
}

export function blokBasligi(b: Blok | BlokSablonu): string {
  switch (b.tur) {
    case 'eylem':
      return EYLEM_ADI[b.eylem];
    case 'tekrarlaKez':
      return `${kezMetni(b)} kez tekrarla`;
    case 'tekrarlaKadar':
      return `${kosulMetni(b.kosul, 'kadar')} tekrarla`;
    case 'eger':
      return `eğer ${kosulMetni(b.kosul, 'eger')}`;
    case 'ata':
      return atamaMetni(b);
    case 'tanim':
      return `${b.ad} komutu`;
    case 'cagir':
      return b.ad;
  }
}

/** Girintili düz metin (öğretmen notu, ekran okuyucu özeti). */
export function duzMetin(p: Program, girinti = 0): string {
  const bosluk = '    '.repeat(girinti);
  const satirlar: string[] = [];
  for (const b of p) {
    satirlar.push(bosluk + blokBasligi(b));
    if (govdeliMi(b) && b.govde.length) satirlar.push(duzMetin(b.govde, girinti + 1));
    if (b.tur === 'eger' && b.degilse) {
      satirlar.push(`${bosluk}değilse`);
      if (b.degilse.length) satirlar.push(duzMetin(b.degilse, girinti + 1));
    }
  }
  return satirlar.join('\n');
}

const SOZDE_EYLEM: Record<EylemTuru, string> = {
  ileri: 'İLERİ GİT',
  sagaDon: 'SAĞA DÖN',
  solaDon: 'SOLA DÖN',
  sula: 'SULA',
  topla: 'TOPLA',
  gubreVer: 'GÜBRE VER',
  boya: 'BOYA',
  ek: 'TOHUM EK',
  koy: 'KÜP KOY',
  isaretle: 'NOKTA KOY',
  kalemKaldir: 'KALEMİ KALDIR',
  kalemIndir: 'KALEMİ İNDİR',
};
const SOZDE_KOSUL: Record<KosulTuru, string> = {
  cikistayim: 'çıkıştayım',
  toprakKuru: 'toprak kuru',
  domatesKirmizi: 'domates kırmızı',
  yaprakSari: 'yaprak sarı',
};

export interface SozdeSatir {
  metin: string;
  girinti: number;
  /** Satırı üreten blok (BAŞLA / BİTİR ve kapanış satırlarında kapanan blok ya da null) */
  blokId: string | null;
  /** Kapanış satırı mı (TEKRAR SONU gibi) */
  kapanis?: boolean;
}

function sozdeKosul(k: Kosul): string {
  return karsilastirmaMi(k) ? karsilastirmaMetni(k) : SOZDE_KOSUL[k];
}

/** Ders kitaplarındaki Türkçe sözde kod biçimi, satır satır (etkin satır vurgusu için blok kimliğiyle). */
export function sozdeSatirlar(p: Program, basBitir = true): SozdeSatir[] {
  const satirlar: SozdeSatir[] = [];
  const yaz = (liste: Blok[], g: number) => {
    for (const b of liste) {
      switch (b.tur) {
        case 'eylem':
          satirlar.push({ metin: SOZDE_EYLEM[b.eylem], girinti: g, blokId: b.id });
          break;
        case 'ata':
          satirlar.push({ metin: atamaMetni(b), girinti: g, blokId: b.id });
          break;
        case 'cagir':
          satirlar.push({ metin: b.ad, girinti: g, blokId: b.id });
          break;
        case 'tekrarlaKez':
          satirlar.push({ metin: `${kezMetni(b)} KEZ TEKRARLA`, girinti: g, blokId: b.id });
          yaz(b.govde, g + 1);
          satirlar.push({ metin: 'TEKRAR SONU', girinti: g, blokId: b.id, kapanis: true });
          break;
        case 'tekrarlaKadar':
          satirlar.push({
            metin: karsilastirmaMi(b.kosul) ? `${karsilastirmaMetni(b.kosul)} OLANA KADAR TEKRARLA` : `${KOSUL_KADAR[b.kosul].toLocaleUpperCase('tr-TR')} TEKRARLA`,
            girinti: g,
            blokId: b.id,
          });
          yaz(b.govde, g + 1);
          satirlar.push({ metin: 'TEKRAR SONU', girinti: g, blokId: b.id, kapanis: true });
          break;
        case 'eger':
          satirlar.push({ metin: `EĞER ${sozdeKosul(b.kosul)} İSE`, girinti: g, blokId: b.id });
          yaz(b.govde, g + 1);
          if (b.degilse) {
            satirlar.push({ metin: 'DEĞİLSE', girinti: g, blokId: b.id, kapanis: true });
            yaz(b.degilse, g + 1);
          }
          satirlar.push({ metin: 'EĞER SONU', girinti: g, blokId: b.id, kapanis: true });
          break;
        case 'tanim':
          satirlar.push({ metin: `TANIMLA ${b.ad}`, girinti: g, blokId: b.id });
          yaz(b.govde, g + 1);
          satirlar.push({ metin: 'TANIM SONU', girinti: g, blokId: b.id, kapanis: true });
          break;
      }
    }
  };
  if (!basBitir) {
    yaz(p, 0);
    return satirlar;
  }
  // Komut tanımları BAŞLA'dan önce yazılır (ders kitabı düzeni); ana program BAŞLA … BİTİR arasında
  const tanimlar = p.filter((b) => b.tur === 'tanim');
  const ana = p.filter((b) => b.tur !== 'tanim');
  yaz(tanimlar, 0);
  satirlar.push({ metin: 'BAŞLA', girinti: 0, blokId: null });
  yaz(ana, 1);
  satirlar.push({ metin: 'BİTİR', girinti: 0, blokId: null });
  return satirlar;
}

/** Sözde kod metni (öğretmen notu, 9. sınıf görünümü). */
export function sozdeKod(p: Program): string {
  return sozdeSatirlar(p)
    .map((s) => '    '.repeat(s.girinti) + s.metin)
    .join('\n');
}
