/**
 * Olasılık Laboratuvarı — simülasyon.
 *
 * Tohumlanabilir rastgele üreteç (mulberry32), tek/toplu deneme, frekans sayımı ve
 * yakınsama serisi (seyrek örnekleme ile ≤ 400 nokta). Saf modül; vitest ile sınanır.
 */
import {
  frekansAnahtari,
  frekansSatirlari,
  istenenMi,
  kesirSadelestir,
  ornekUzay,
  type Kesir,
  type Sablon,
  type Sonuc,
  type TemelDurum,
} from './olasilik';

// ---------------------------------------------------------------------------
// Rastgele üreteç
// ---------------------------------------------------------------------------
export interface RastgeleUretec {
  /** [0, 1) aralığında sayı */
  sonraki(): number;
}

/** mulberry32: 32 bit tohumdan deterministik dizi. */
export function mulberry32(tohum: number): RastgeleUretec {
  let a = tohum >>> 0;
  return {
    sonraki() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Arayüz tohumu: crypto.getRandomValues varsa ondan, yoksa saat + Math.random. */
export function rastgeleTohum(): number {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === 'function') {
    const dizi = new Uint32Array(1);
    c.getRandomValues(dizi);
    return dizi[0];
  }
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

/** [0, n) tam sayı */
export function tamSayi(uretec: RastgeleUretec, n: number): number {
  return Math.min(n - 1, Math.floor(uretec.sonraki() * n));
}

/** Ağırlıklı seçim: ağırlıklar toplamına göre indeks döner; toplam 0 ise -1. */
export function agirlikliSec(uretec: RastgeleUretec, agirliklar: number[]): number {
  const toplam = agirliklar.reduce((t, a) => t + Math.max(0, a), 0);
  if (toplam <= 0) return -1;
  let r = uretec.sonraki() * toplam;
  for (let i = 0; i < agirliklar.length; i++) {
    const a = Math.max(0, agirliklar[i]);
    if (r < a) return i;
    r -= a;
  }
  return agirliklar.length - 1;
}

// ---------------------------------------------------------------------------
// Deneme
// ---------------------------------------------------------------------------
/** İadesiz torba gibi denemeler arası taşınan durum. */
export interface DeneyDurumu {
  /** İadesiz torbada kalan bilye adetleri (bilyeler dizisiyle aynı sıra); boşalınca torba yenilenir. */
  torbaKalan?: number[];
}

export function yeniDeneyDurumu(sablon: Sablon): DeneyDurumu {
  if (sablon.tur === 'torba' && !sablon.iadeli) return { torbaKalan: sablon.bilyeler.map((b) => Math.max(0, Math.trunc(b.adet))) };
  return {};
}

/** Tek deneme; sonuç yoksa (boş örnek uzay) null. Durum nesnesi yerinde güncellenir. */
export function tekDeneme(sablon: Sablon, uretec: RastgeleUretec, durum: DeneyDurumu = {}): Sonuc | null {
  switch (sablon.tur) {
    case 'para':
      return { tur: 'para', yuz: uretec.sonraki() < 0.5 ? 'tura' : 'yazi' };
    case 'zar': {
      const zarlar = [1 + tamSayi(uretec, 6)];
      if (sablon.ikiZar) zarlar.push(1 + tamSayi(uretec, 6));
      return { tur: 'zar', zarlar };
    }
    case 'cark': {
      const i = agirlikliSec(
        uretec,
        sablon.dilimler.map((d) => Math.max(0, Math.trunc(d.genislik)))
      );
      return i < 0 ? null : { tur: 'cark', dilim: i };
    }
    case 'torba': {
      const adetler = sablon.bilyeler.map((b) => Math.max(0, Math.trunc(b.adet)));
      if (sablon.iadeli) {
        const i = agirlikliSec(uretec, adetler);
        return i < 0 ? null : { tur: 'torba', renk: sablon.bilyeler[i].ad };
      }
      let kalan = durum.torbaKalan;
      if (!kalan || kalan.length !== adetler.length || kalan.every((k) => k <= 0)) {
        kalan = adetler.slice();
        durum.torbaKalan = kalan;
      }
      const i = agirlikliSec(uretec, kalan);
      if (i < 0) return null;
      kalan[i] -= 1;
      return { tur: 'torba', renk: sablon.bilyeler[i].ad };
    }
    case 'kart': {
      const uzay = ornekUzay(sablon);
      const d: TemelDurum | undefined = uzay.durumlar[tamSayi(uretec, uzay.durumlar.length)];
      return d ? d.sonuc : null;
    }
    case 'galton': {
      // Her çivi satırında bir üreteç biti: < 0,5 → sol (0), değilse sağ (1); kutu = sağa sapma sayısı
      const n = Math.trunc(sablon.satir);
      if (!(n >= 1)) return null;
      const yol: number[] = [];
      let kutu = 0;
      for (let i = 0; i < n; i++) {
        const b = uretec.sonraki() < 0.5 ? 0 : 1;
        yol.push(b);
        kutu += b;
      }
      return { tur: 'galton', yol, kutu };
    }
  }
}

/** n deneme; boş örnek uzayda boş dizi. */
export function topluDeneme(sablon: Sablon, n: number, uretec: RastgeleUretec, durum: DeneyDurumu = {}): Sonuc[] {
  const sonuclar: Sonuc[] = [];
  for (let i = 0; i < n; i++) {
    const s = tekDeneme(sablon, uretec, durum);
    if (!s) break;
    sonuclar.push(s);
  }
  return sonuclar;
}

// ---------------------------------------------------------------------------
// Frekans
// ---------------------------------------------------------------------------
export interface FrekansSatiri {
  anahtar: string;
  etiket: string;
  renk?: string;
  istenen: boolean;
  sayi: number;
  kesir: Kesir;
  oran: number;
}

/** Sayım sözlüğünü şablonun satır düzenine göre tabloya çevirir. */
export function frekansTablosu(sablon: Sablon, sayimlar: Record<string, number>, toplam: number): FrekansSatiri[] {
  return frekansSatirlari(sablon).map((s) => {
    const sayi = sayimlar[s.anahtar] ?? 0;
    return { ...s, sayi, kesir: kesirSadelestir(sayi, toplam), oran: toplam > 0 ? sayi / toplam : 0 };
  });
}

/** Sonuç listesinden sayım sözlüğü üretir (testler ve toplu işlemler için). */
export function sayimlariBirlestir(sablon: Sablon, sonuclar: Sonuc[], sayimlar: Record<string, number> = {}): Record<string, number> {
  for (const s of sonuclar) {
    const a = frekansAnahtari(sablon, s);
    sayimlar[a] = (sayimlar[a] ?? 0) + 1;
  }
  return sayimlar;
}

// ---------------------------------------------------------------------------
// Yakınsama serisi
// ---------------------------------------------------------------------------
export interface YakinsamaNoktasi {
  /** Deneme sayısı */
  n: number;
  /** O ana kadar gerçekleşen istenen durum sayısı */
  basari: number;
  /** basari / n */
  p: number;
}

export const YAKINSAMA_EN_COK_NOKTA = 400;

/** İlk 100 denemede her deneme, sonra logaritmik aralıklı (≈ %2,5 artış) kontrol noktaları. */
const YOGUN_SINIR = 100;
const LOG_ORAN = 1.025;

/**
 * Denemeleri tek tek alır, seyrek kontrol noktalarında (n, başarı) kaydeder.
 * seri() her zaman en güncel noktayı da içerir ve ≤ maksNokta ile sınırlıdır.
 */
export class YakinsamaBirikeci {
  private n = 0;
  private basari = 0;
  private sonrakiKontrol = 1;
  private readonly noktalar: YakinsamaNoktasi[] = [];

  constructor(baslangic?: { n: number; basari: number; noktalar: YakinsamaNoktasi[] }) {
    if (baslangic) {
      this.n = baslangic.n;
      this.basari = baslangic.basari;
      this.noktalar = baslangic.noktalar.slice();
      this.sonrakiKontrol = this.n < YOGUN_SINIR ? this.n + 1 : Math.max(this.n + 1, Math.ceil(this.n * LOG_ORAN));
    }
  }

  get deneme(): number {
    return this.n;
  }

  get gerceklesen(): number {
    return this.basari;
  }

  get oran(): number {
    return this.n > 0 ? this.basari / this.n : 0;
  }

  ekle(istenen: boolean): void {
    this.n += 1;
    if (istenen) this.basari += 1;
    if (this.n >= this.sonrakiKontrol) {
      this.noktalar.push({ n: this.n, basari: this.basari, p: this.basari / this.n });
      this.sonrakiKontrol = this.n < YOGUN_SINIR ? this.n + 1 : Math.max(this.n + 1, Math.ceil(this.n * LOG_ORAN));
    }
  }

  /** Kayıtlı noktalar (güncel nokta dahil), en çok maksNokta öğe. */
  seri(maksNokta = YAKINSAMA_EN_COK_NOKTA): YakinsamaNoktasi[] {
    const liste = this.noktalar.slice();
    const son = liste[liste.length - 1];
    if (this.n > 0 && (!son || son.n !== this.n)) liste.push({ n: this.n, basari: this.basari, p: this.basari / this.n });
    return seyrekle(liste, maksNokta);
  }

  /** Kalıcı depolama için ham noktalar. */
  hamNoktalar(): YakinsamaNoktasi[] {
    return this.noktalar.slice();
  }
}

/** Diziyi eşit aralıklı indekslerle en çok maks öğeye indirir; ilk ve son nokta korunur. */
export function seyrekle<T>(liste: T[], maks: number): T[] {
  if (maks < 2) return liste.slice(0, Math.max(0, maks));
  if (liste.length <= maks) return liste;
  const sonuc: T[] = [];
  const adim = (liste.length - 1) / (maks - 1);
  for (let i = 0; i < maks; i++) sonuc.push(liste[Math.round(i * adim)]);
  return sonuc;
}

/** Başarı dizisinden (0/1 ya da boolean) yakınsama serisi üretir (testler için kısayol). */
export function yakinsamaSerisi(basarilar: ArrayLike<boolean | number>, maksNokta = YAKINSAMA_EN_COK_NOKTA): YakinsamaNoktasi[] {
  const b = new YakinsamaBirikeci();
  for (let i = 0; i < basarilar.length; i++) b.ekle(Boolean(basarilar[i]));
  return b.seri(maksNokta);
}

// ---------------------------------------------------------------------------
// Toplu deney özeti (arayüz ve testler)
// ---------------------------------------------------------------------------
export interface DeneyOzeti {
  toplam: number;
  gerceklesen: number;
  oran: number;
  kesir: Kesir;
}

export function deneyOzeti(sablon: Sablon, sonuclar: Sonuc[]): DeneyOzeti {
  const gerceklesen = sonuclar.filter((s) => istenenMi(sablon, s)).length;
  return { toplam: sonuclar.length, gerceklesen, oran: sonuclar.length ? gerceklesen / sonuclar.length : 0, kesir: kesirSadelestir(gerceklesen, sonuclar.length) };
}
