/**
 * Olasılık Laboratuvarı — uygulama durumu (saf).
 *
 * Şablon seçimi, öznel tahmin, sonuç sayaçları, son 20 deneme ve yakınsama noktaları tek bir
 * nesnede tutulur; localStorage'a 'geoeba_olasilik_v1' anahtarıyla yazılır. Bileşenler ince
 * kalsın diye tüm geçişler burada saf işlevlerdir ve vitest ile sınanır.
 */
import {
  GALTON_EN_AZ_SATIR,
  GALTON_EN_COK_SATIR,
  KART_DEGERLERI,
  KART_TURLERI,
  frekansAnahtari,
  frekansSatirlari,
  istenenMi,
  varsayilanSablon,
  type KartDegeri,
  type KartTuru,
  type Sablon,
  type SablonTuru,
  type Sonuc,
} from './olasilik';
import { YakinsamaBirikeci, mulberry32, topluDeneme, yeniDeneyDurumu, type DeneyDurumu, type YakinsamaNoktasi } from './simulasyon';

export const DEPO_ANAHTARI = 'geoeba_olasilik_v1';
export const SON_LISTE_BOYU = 20;
export const SABLON_TURLERI: SablonTuru[] = ['para', 'zar', 'cark', 'torba', 'galton', 'kart'];
/** Sekmelerde görünen şablonlar. Kart destesi şimdilik gizli (kayıt ve doğrulama için SABLON_TURLERI'nde kalır). */
export const GORUNEN_SABLON_TURLERI: SablonTuru[] = ['para', 'zar', 'cark', 'torba', 'galton'];

export const SABLON_ADLARI: Record<SablonTuru, string> = {
  para: 'Madeni Para',
  zar: 'Zar',
  cark: 'Renkli Çark',
  torba: 'Torba',
  kart: 'Kart Destesi',
  galton: 'Galton Tahtası',
};

export interface LabDurumu {
  sablonTuru: SablonTuru;
  /** Her şablonun kendi ayarı saklanır; sekme değişince kaybolmaz */
  sablonlar: Record<SablonTuru, Sablon>;
  /** Öznel tahmin, yüzde 0–100 */
  oznel: number;
  oznelKilitli: boolean;
  deneme: number;
  gerceklesen: number;
  sayimlar: Record<string, number>;
  /** En yeni başta */
  son: Sonuc[];
  yakinsama: YakinsamaNoktasi[];
  /** İadesiz torba gibi taşınan deney durumu */
  deneyDurumu: DeneyDurumu;
  logOlcek: boolean;
}

export function bosDurum(tur: SablonTuru = 'para'): LabDurumu {
  const sablonlar = Object.fromEntries(SABLON_TURLERI.map((t) => [t, varsayilanSablon(t)])) as Record<SablonTuru, Sablon>;
  return {
    sablonTuru: tur,
    sablonlar,
    oznel: 50,
    oznelKilitli: false,
    deneme: 0,
    gerceklesen: 0,
    sayimlar: {},
    son: [],
    yakinsama: [],
    deneyDurumu: yeniDeneyDurumu(sablonlar[tur]),
    logOlcek: false,
  };
}

/** İlk açılış: madeni para şablonunda 24 deterministik atış (grafikler boş gelmesin). */
export function ornekDurum(): LabDurumu {
  const d = bosDurum('para');
  const sonuclar = topluDeneme(d.sablonlar.para, 24, mulberry32(7));
  return { ...sonuclariEkle(d, sonuclar), oznel: 50, oznelKilitli: false };
}

export function aktifSablon(d: LabDurumu): Sablon {
  return d.sablonlar[d.sablonTuru];
}

/** Sonuçları sayaçlara, son listesine ve yakınsama serisine işler. */
export function sonuclariEkle(d: LabDurumu, sonuclar: Sonuc[]): LabDurumu {
  if (!sonuclar.length) return d;
  const sablon = aktifSablon(d);
  const sayimlar = { ...d.sayimlar };
  const birikec = new YakinsamaBirikeci({ n: d.deneme, basari: d.gerceklesen, noktalar: d.yakinsama });
  for (const s of sonuclar) {
    const a = frekansAnahtari(sablon, s);
    sayimlar[a] = (sayimlar[a] ?? 0) + 1;
    birikec.ekle(istenenMi(sablon, s));
  }
  const son = sonuclar.slice(-SON_LISTE_BOYU).reverse().concat(d.son).slice(0, SON_LISTE_BOYU);
  return {
    ...d,
    sayimlar,
    deneme: birikec.deneme,
    gerceklesen: birikec.gerceklesen,
    son,
    yakinsama: birikec.hamNoktalar(),
    oznelKilitli: true,
  };
}

/** Sayaçları sıfırlar; şablon ve öznel tahmin korunur, kilit açılır. */
export function sifirla(d: LabDurumu): LabDurumu {
  return { ...d, deneme: 0, gerceklesen: 0, sayimlar: {}, son: [], yakinsama: [], deneyDurumu: yeniDeneyDurumu(aktifSablon(d)), oznelKilitli: false };
}

/** Sekme değişimi: o şablonun kayıtlı ayarı açılır, sonuçlar sıfırlanır. */
export function sablonTuruSec(d: LabDurumu, tur: SablonTuru): LabDurumu {
  if (tur === d.sablonTuru) return d;
  return sifirla({ ...d, sablonTuru: tur });
}

/** Aktif şablonun ayarını değiştirir (istenen durum, dilimler, adetler…); sonuçlar sıfırlanır. */
export function sablonuGuncelle(d: LabDurumu, sablon: Sablon): LabDurumu {
  const yeni = { ...d, sablonlar: { ...d.sablonlar, [sablon.tur]: sablon }, sablonTuru: sablon.tur };
  return sifirla(yeni);
}

export function oznelAyarla(d: LabDurumu, yuzde: number): LabDurumu {
  const v = Math.round(Math.min(100, Math.max(0, Number.isFinite(yuzde) ? yuzde : 0)));
  return { ...d, oznel: v };
}

export function oznelKilidiDegistir(d: LabDurumu): LabDurumu {
  return { ...d, oznelKilitli: !d.oznelKilitli };
}

export function logOlcekDegistir(d: LabDurumu): LabDurumu {
  return { ...d, logOlcek: !d.logOlcek };
}

export function deneyselOran(d: LabDurumu): number {
  return d.deneme > 0 ? d.gerceklesen / d.deneme : 0;
}

// ---------------------------------------------------------------------------
// Kalıcılık
// ---------------------------------------------------------------------------
export function durumuSerilestir(d: LabDurumu): string {
  return JSON.stringify(d);
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

const ZAR_KOSUL_TIPLERI = ['sayi', 'cift', 'tek', 'enAz', 'enFazla'];
const KART_KOSUL_TIPLERI = ['renk', 'tur', 'deger'];

function sonluSayiMi(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function metinMi(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

/** Bir çark dilimi / torba bilyesi listesi alan bazında geçerli mi? */
function renkliListeGecerli(v: unknown, sayiAlani: 'genislik' | 'adet', enAz: number): boolean {
  if (!Array.isArray(v) || v.length < enAz) return false;
  return v.every((x) => nesneMi(x) && metinMi(x.ad) && metinMi(x.renk) && sonluSayiMi(x[sayiAlani]) && x[sayiAlani] > 0);
}

/**
 * Kayıttan gelen şablonu alan bazında doğrular. Eksik gövdeli (ör. yarım yazılmış ya da eski
 * şema) bir şablon ilk render'da TypeError fırlatıp tüm sayfayı düşürmesin diye yalnız tam
 * geçerli olanlar kabul edilir; diğerleri null döner ve çağıran varsayılana düşer.
 */
export function sablonuDogrula(v: unknown, t: SablonTuru): Sablon | null {
  if (!nesneMi(v) || v.tur !== t) return null;
  switch (t) {
    case 'para':
      return v.istenen === 'tura' || v.istenen === 'yazi' ? { tur: 'para', istenen: v.istenen } : null;
    case 'zar': {
      const k = v.istenen;
      if (!nesneMi(k) || !ZAR_KOSUL_TIPLERI.includes(k.tip as string)) return null;
      if ((k.tip === 'sayi' || k.tip === 'enAz' || k.tip === 'enFazla') && !sonluSayiMi(k.deger)) return null;
      return { tur: 'zar', ikiZar: v.ikiZar === true, istenen: k as Extract<Sablon, { tur: 'zar' }>['istenen'] };
    }
    case 'cark':
      if (!renkliListeGecerli(v.dilimler, 'genislik', 2) || !metinMi(v.istenenRenk)) return null;
      return { tur: 'cark', dilimler: v.dilimler as Extract<Sablon, { tur: 'cark' }>['dilimler'], istenenRenk: v.istenenRenk };
    case 'torba':
      if (!renkliListeGecerli(v.bilyeler, 'adet', 1) || !metinMi(v.istenenRenk)) return null;
      return { tur: 'torba', bilyeler: v.bilyeler as Extract<Sablon, { tur: 'torba' }>['bilyeler'], iadeli: v.iadeli !== false, istenenRenk: v.istenenRenk };
    case 'kart': {
      const k = v.istenen;
      if (!nesneMi(k) || !KART_KOSUL_TIPLERI.includes(k.tip as string)) return null;
      if (k.tip === 'renk' && k.deger !== 'kirmizi' && k.deger !== 'siyah') return null;
      if (k.tip === 'tur' && !KART_TURLERI.includes(k.deger as KartTuru)) return null;
      if (k.tip === 'deger' && !KART_DEGERLERI.includes(k.deger as KartDegeri)) return null;
      return { tur: 'kart', istenen: k as Extract<Sablon, { tur: 'kart' }>['istenen'] };
    }
    case 'galton': {
      const n = v.satir;
      if (!Number.isInteger(n) || (n as number) < GALTON_EN_AZ_SATIR || (n as number) > GALTON_EN_COK_SATIR) return null;
      const k = v.istenen;
      if (!nesneMi(k)) return null;
      if (k.tip === 'orta') return { tur: 'galton', satir: n as number, istenen: { tip: 'orta' } };
      if (k.tip !== 'kutu' && k.tip !== 'enAz' && k.tip !== 'enFazla') return null;
      if (!Number.isInteger(k.kutu) || (k.kutu as number) < 0 || (k.kutu as number) > (n as number)) return null;
      return { tur: 'galton', satir: n as number, istenen: { tip: k.tip, kutu: k.kutu as number } };
    }
    default:
      return null;
  }
}

/** Galton sonucu: yol 0/1 dizisi, kutu = yol toplamı; satır verilirse yol uzunluğu ona eşit olmalı. */
function galtonSonucuDogrula(v: Record<string, unknown>, satir?: number): Sonuc | null {
  const yol = v.yol;
  if (!Array.isArray(yol) || yol.length < 1 || !yol.every((b) => b === 0 || b === 1)) return null;
  if (satir !== undefined && yol.length !== satir) return null;
  const toplam = (yol as number[]).reduce((t, b) => t + b, 0);
  if (v.kutu !== toplam) return null;
  return { tur: 'galton', yol: (yol as number[]).slice(), kutu: toplam };
}

/** Kayıttan gelen tek sonucu türüne göre doğrular (zarlar dizisi, kart nesnesi, dilim sayısı, renk metni). */
export function sonucuDogrula(v: unknown, sablon?: Sablon): Sonuc | null {
  if (!nesneMi(v)) return null;
  switch (v.tur) {
    case 'galton':
      return galtonSonucuDogrula(v, sablon?.tur === 'galton' ? sablon.satir : undefined);
    case 'para':
      return v.yuz === 'tura' || v.yuz === 'yazi' ? { tur: 'para', yuz: v.yuz } : null;
    case 'zar':
      return Array.isArray(v.zarlar) && v.zarlar.length > 0 && v.zarlar.every((z) => sonluSayiMi(z)) ? { tur: 'zar', zarlar: v.zarlar as number[] } : null;
    case 'cark':
      return sonluSayiMi(v.dilim) && v.dilim >= 0 ? { tur: 'cark', dilim: v.dilim } : null;
    case 'torba':
      return metinMi(v.renk) ? { tur: 'torba', renk: v.renk } : null;
    case 'kart': {
      const k = v.kart;
      if (!nesneMi(k) || !KART_TURLERI.includes(k.tur as KartTuru) || !KART_DEGERLERI.includes(k.deger as KartDegeri)) return null;
      return { tur: 'kart', kart: { tur: k.tur as KartTuru, deger: k.deger as KartDegeri } };
    }
    default:
      return null;
  }
}

/** Kaydı okur; bozuk ya da eksik alanlar varsayılana düşer, hiç okunamazsa null. */
export function durumuCoz(metin: string | null | undefined): LabDurumu | null {
  if (!metin) return null;
  let ham: unknown;
  try {
    ham = JSON.parse(metin);
  } catch {
    return null;
  }
  if (!nesneMi(ham)) return null;
  const taban = bosDurum();
  // Gizli bir şablonla (ör. kart) kaydedilmiş oturum paraya döner; sayaçlar o şablona ait olduğundan sıfırlanır
  const kayitliTur = SABLON_TURLERI.includes(ham.sablonTuru as SablonTuru) ? (ham.sablonTuru as SablonTuru) : 'para';
  const gizliDen = !GORUNEN_SABLON_TURLERI.includes(kayitliTur);
  const tur: SablonTuru = gizliDen ? 'para' : kayitliTur;
  const sablonlar = { ...taban.sablonlar };
  // Aktif şablon kayıtta bozuksa varsayılana düşer; sayaçlar başka bir şablona ait olacağından sıfırlanır
  let aktifSablonBozuk = gizliDen;
  if (nesneMi(ham.sablonlar)) {
    for (const t of SABLON_TURLERI) {
      const s = sablonuDogrula(ham.sablonlar[t], t);
      if (s) sablonlar[t] = s;
      else if (t === tur && ham.sablonlar[t] !== undefined) aktifSablonBozuk = true;
    }
  }
  const sayi = (v: unknown, varsayilan: number) => (typeof v === 'number' && Number.isFinite(v) ? v : varsayilan);
  // Sayımlar yalnız aktif şablonun frekans satırlarındaki anahtarlarla ve negatif olmayan tam
  // sayılarla alınır. Kayıtta sayım sözlüğü varken toplamı deneme sayısını tutmuyorsa (elle bozulmuş
  // ya da yarım yazılmış kayıt) tablo %10000 gibi saçma oranlar göstermesin diye sayaçlar sıfırlanır.
  const sayimlar: Record<string, number> = {};
  let sayacTutarsiz = false;
  if (!aktifSablonBozuk && nesneMi(ham.sayimlar)) {
    const gecerliAnahtarlar = new Set(frekansSatirlari(sablonlar[tur]).map((r) => r.anahtar));
    let toplam = 0;
    for (const [k, v] of Object.entries(ham.sayimlar)) {
      if (!gecerliAnahtarlar.has(k) || typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
        sayacTutarsiz = true;
        continue;
      }
      sayimlar[k] = v;
      toplam += v;
    }
    if (toplam !== Math.max(0, Math.trunc(sayi(ham.deneme, 0)))) sayacTutarsiz = true;
    if (sayacTutarsiz) for (const k of Object.keys(sayimlar)) delete sayimlar[k];
  }
  const sayaclariAt = aktifSablonBozuk || sayacTutarsiz;
  const deneme = sayaclariAt ? 0 : Math.max(0, Math.trunc(sayi(ham.deneme, 0)));
  const gerceklesen = Math.min(deneme, Math.max(0, Math.trunc(sayi(ham.gerceklesen, 0))));
  const yakinsama =
    !sayaclariAt && Array.isArray(ham.yakinsama)
      ? (ham.yakinsama as unknown[]).filter((n): n is YakinsamaNoktasi => nesneMi(n) && typeof n.n === 'number' && typeof n.basari === 'number' && typeof n.p === 'number')
      : [];
  const son =
    !sayaclariAt && Array.isArray(ham.son)
      ? (ham.son as unknown[])
          .map((s) => sonucuDogrula(s, sablonlar[tur]))
          .filter((s): s is Sonuc => s !== null && s.tur === tur)
          .slice(0, SON_LISTE_BOYU)
      : [];
  const torbaKalanHam = nesneMi(ham.deneyDurumu) && Array.isArray(ham.deneyDurumu.torbaKalan) ? (ham.deneyDurumu.torbaKalan as unknown[]) : null;
  const aktif = sablonlar[tur];
  const deneyDurumu: DeneyDurumu =
    torbaKalanHam && aktif.tur === 'torba' && torbaKalanHam.length === aktif.bilyeler.length
      ? { torbaKalan: torbaKalanHam.map((x) => Math.max(0, Math.trunc(sayi(x, 0)))) }
      : yeniDeneyDurumu(aktif);
  return {
    sablonTuru: tur,
    sablonlar,
    oznel: Math.min(100, Math.max(0, Math.round(sayi(ham.oznel, 50)))),
    oznelKilitli: ham.oznelKilitli === true,
    deneme,
    gerceklesen,
    sayimlar,
    son,
    yakinsama,
    deneyDurumu,
    logOlcek: ham.logOlcek === true,
  };
}
