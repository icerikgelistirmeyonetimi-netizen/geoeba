/**
 * Veri ve Grafik — çekiliş çekirdeği (TinkerPlots "Sampler" karşılığı), saf model (React'siz).
 *
 * "Veri topla" deneylerinin rastgele düzeneği (`deney.ts`: `nesneDuzenegi`) buradaki aygıtlarla kurulur; her atış
 * `tekCekilis` ile yapılır (`toplama/deneyMotoru.ts`). Bir düzenek 1–3 aygıttan oluşur; aygıtlar sırayla bağlıdır ve
 * her çekilişte her aygıt bir değer üretir (her aygıt bir değişken / sütun):
 *  - Karıştırıcı (para, torba): etiketli toplar (etiket + adet), geri atılan ya da atılmayan. Geri atılmayanda bir
 *    çalıştırma boyunca çıkan top torbaya dönmez; torba boşalınca çalıştırma durur.
 *  - Çark: dilimler (etiket + yüzde); yüzdeler toplamı 100 değilse oranlar korunarak ölçeklenir.
 *  - Sayı aralığı: a..b tam sayıları eşit olasılıklı (sayı küpü = 1..6).
 * İsteğe bağlı "Toplam" sütunu (tüm aygıtlar sayısalsa; iki sayı küpü).
 */
import { agirlikliSec, tamSayi, type Uretec } from './rastgele';
import { temizle } from './istatistik';
import { kimlikUret, sayiOku, sayiYaz } from './veri';

export type AygitTuru = 'karistirici' | 'cark' | 'aralik';

export interface KaristiriciOgesi {
  etiket: string;
  adet: number;
}

export interface CarkDilimi {
  etiket: string;
  yuzde: number;
}

interface AygitTemeli {
  id: string;
  /** Aygıtın ürettiği değişkenin (sütunun) adı */
  degisken: string;
}

export interface Karistirici extends AygitTemeli {
  tur: 'karistirici';
  ogeler: KaristiriciOgesi[];
  iadeli: boolean;
}

export interface Cark extends AygitTemeli {
  tur: 'cark';
  dilimler: CarkDilimi[];
}

export interface SayiAraligi extends AygitTemeli {
  tur: 'aralik';
  min: number;
  max: number;
}

export type Aygit = Karistirici | Cark | SayiAraligi;

/** 0 = Yavaş, 1 = Orta, 2 = Hızlı, 3 = Anında (süreler ve adlar: canlandirma.ts) */
export type Hiz = 0 | 1 | 2 | 3;

export interface OrnekleyiciAyari {
  aygitlar: Aygit[];
  toplamSutunu: boolean;
  cekilisSayisi: number;
  hiz: Hiz;
}

/** Bir çalıştırmadaki en çok çekiliş (Veri topla'da en çok 2000 atış; deney.ts EN_COK_ATIS) */
export const EN_COK_CEKILIS = 2000;
export const EN_COK_TOP = 60;
export const EN_COK_ETIKET = 12;
export const EN_COK_ARALIK = 1000;

// ── Aygıt kurucuları ──────────────────────────────────────────────────────────

export function karistirici(degisken: string, ogeler: [string, number][], iadeli = true): Karistirici {
  return { id: kimlikUret('ay'), tur: 'karistirici', degisken, ogeler: ogeler.map(([etiket, adet]) => ({ etiket, adet })), iadeli };
}

export function cark(degisken: string, dilimler: [string, number][]): Cark {
  return { id: kimlikUret('ay'), tur: 'cark', degisken, dilimler: dilimler.map(([etiket, yuzde]) => ({ etiket, yuzde })) };
}

export function sayiAraligi(degisken: string, min: number, max: number): SayiAraligi {
  return { id: kimlikUret('ay'), tur: 'aralik', degisken, min, max };
}

// ── Aygıt özellikleri ─────────────────────────────────────────────────────────

/** Karıştırıcıdaki topların kategori indeksleri (her top bir öğe; adet ≤ 0 olan etiket topsuzdur) */
export function topListesi(k: Karistirici): number[] {
  const toplar: number[] = [];
  k.ogeler.forEach((o, i) => {
    const adet = Math.max(0, Math.floor(o.adet));
    for (let j = 0; j < adet; j++) toplar.push(i);
  });
  return toplar;
}

export function carkOranlari(c: Cark): { oranlar: number[]; toplamYuzde: number; duzeltildi: boolean } {
  const temiz = c.dilimler.map((d) => (Number.isFinite(d.yuzde) && d.yuzde > 0 ? d.yuzde : 0));
  const t = temiz.reduce((a, b) => a + b, 0);
  return {
    oranlar: temiz.map((y) => (t > 0 ? y / t : 0)),
    toplamYuzde: temizle(t),
    duzeltildi: t > 0 && Math.abs(t - 100) > 1e-9,
  };
}

/** Çark dilimlerinin açıları (derece, 0 = tepe, saat yönü) */
export function carkAcilari(c: Cark): { baslangic: number; bitis: number }[] {
  const { oranlar } = carkOranlari(c);
  let aci = 0;
  return oranlar.map((o) => {
    const b = aci;
    aci += o * 360;
    return { baslangic: b, bitis: aci };
  });
}

/** Aygıtın üretebileceği değerler, aygıttaki sırayla (yinelenen etiketler bir kez) */
export function aygitKategorileri(a: Aygit): string[] {
  if (a.tur === 'aralik') {
    const { min, max } = aralikSinirlari(a);
    if (max - min > EN_COK_ARALIK) return [];
    return Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
  }
  const etiketler = a.tur === 'karistirici' ? a.ogeler.map((o) => o.etiket) : a.dilimler.map((d) => d.etiket);
  const sonuc: string[] = [];
  for (const e of etiketler) {
    const t = e.trim();
    if (t !== '' && !sonuc.includes(t)) sonuc.push(t);
  }
  return sonuc;
}

export function aralikSinirlari(a: SayiAraligi): { min: number; max: number } {
  const x = Math.round(Number.isFinite(a.min) ? a.min : 1);
  const y = Math.round(Number.isFinite(a.max) ? a.max : 6);
  return { min: Math.min(x, y), max: Math.max(x, y) };
}

/** Sayı aralığı her zaman; karıştırıcı / çark tüm etiketleri sayıysa sayısal değişken üretir */
export function aygitSayisalMi(a: Aygit): boolean {
  if (a.tur === 'aralik') return true;
  const k = aygitKategorileri(a);
  return k.length > 0 && k.every((e) => sayiOku(e) !== null);
}

/** Kuramsal olasılıklar (iadeli ilk çekiliş); aynı etiketler birleşir */
export function aygitOlasiliklari(a: Aygit): { etiket: string; olasilik: number }[] {
  if (a.tur === 'aralik') {
    const k = aygitKategorileri(a);
    return k.map((etiket) => ({ etiket, olasilik: 1 / k.length }));
  }
  const agirliklar =
    a.tur === 'karistirici'
      ? a.ogeler.map((o) => ({ etiket: o.etiket.trim(), a: Math.max(0, Math.floor(o.adet)) }))
      : a.dilimler.map((d, i) => ({ etiket: d.etiket.trim(), a: carkOranlari(a).oranlar[i] }));
  const t = agirliklar.reduce((s, x) => s + (x.etiket !== '' ? x.a : 0), 0);
  return aygitKategorileri(a).map((etiket) => ({
    etiket,
    olasilik: t > 0 ? agirliklar.filter((x) => x.etiket === etiket).reduce((s, x) => s + x.a, 0) / t : 0,
  }));
}

/** Çalıştırmayı engelleyen sorun (yoksa null) */
export function aygitSorunu(a: Aygit): string | null {
  if (a.tur === 'karistirici') {
    if (a.ogeler.some((o) => o.adet > 0 && o.etiket.trim() === '')) return 'Etiketi boş olan toplar var';
    const n = topListesi(a).length;
    if (n === 0) return 'Torbada hiç top yok';
    if (n > EN_COK_TOP) return `Torbada en çok ${EN_COK_TOP} top olabilir`;
    return null;
  }
  if (a.tur === 'cark') {
    if (a.dilimler.length === 0) return 'Çarkta dilim yok';
    if (a.dilimler.some((d) => d.yuzde > 0 && d.etiket.trim() === '')) return 'Etiketi boş olan dilimler var';
    if (carkOranlari(a).toplamYuzde <= 0) return 'Dilim yüzdelerinin toplamı 0 olamaz';
    return null;
  }
  const { min, max } = aralikSinirlari(a);
  if (max - min > EN_COK_ARALIK) return `Aralıkta en çok ${EN_COK_ARALIK + 1} sayı olabilir`;
  return null;
}

/** Çalıştırmayı engellemeyen açıklayıcı uyarı (yoksa null) */
export function aygitUyarisi(a: Aygit, cekilisSayisi: number): string | null {
  if (a.tur === 'karistirici' && !a.iadeli) {
    const n = topListesi(a).length;
    if (n > 0 && cekilisSayisi > n)
      return `Çekilen top torbaya geri atılmıyor: torbada ${n} top var, ${cekilisSayisi} çekişin yalnız ilk ${n} tanesi yapılabilir; torba boşalınca deney durur.`;
  }
  if (a.tur === 'cark') {
    const o = carkOranlari(a);
    if (o.duzeltildi) return `Yüzdelerin toplamı %${sayiYaz(o.toplamYuzde, 1)}; oranlar korunarak %100'e ölçeklendi.`;
  }
  const ay = a.tur === 'aralik' ? a : null;
  if (ay && (Math.round(ay.min) !== ay.min || Math.round(ay.max) !== ay.max)) return 'Aralık sınırları tam sayıya yuvarlandı.';
  return null;
}

export function ayarSorunu(ayar: OrnekleyiciAyari): string | null {
  for (const a of ayar.aygitlar) {
    const s = aygitSorunu(a);
    if (s) return `${a.degisken || 'Nesne'}: ${s}`;
  }
  return ayar.aygitlar.length === 0 ? 'Deneyde nesne yok' : null;
}

/** Sütun adları: boş ad "Sonuç n", yinelenen ad "Ad 2" olur */
export function degiskenAdlari(ayar: OrnekleyiciAyari): string[] {
  const kullanilan = new Set<string>(['Çekiliş']);
  if (toplamEtkin(ayar)) kullanilan.add('Toplam');
  return ayar.aygitlar.map((a, i) => {
    const temel = a.degisken.trim() || `Sonuç ${i + 1}`;
    let ad = temel;
    let k = 2;
    while (kullanilan.has(ad)) ad = `${temel} ${k++}`;
    kullanilan.add(ad);
    return ad;
  });
}

/** Toplam sütunu yalnız en az iki sayısal aygıtta anlamlıdır (tek aygıtta toplam, aygıtın kendi değeri olur) */
export function toplamKullanilabilir(ayar: OrnekleyiciAyari): boolean {
  return ayar.aygitlar.length >= 2 && ayar.aygitlar.every(aygitSayisalMi);
}

export function toplamEtkin(ayar: OrnekleyiciAyari): boolean {
  return ayar.toplamSutunu && toplamKullanilabilir(ayar);
}

// ── Çekiliş ───────────────────────────────────────────────────────────────────

export interface CalismaDurumu {
  /** İadesiz karıştırıcılar için çıkmış topların işaretleri (aygıt sırasıyla; diğerleri null) */
  cikan: (boolean[] | null)[];
}

export function calismaBaslat(aygitlar: Aygit[]): CalismaDurumu {
  return {
    cikan: aygitlar.map((a) => (a.tur === 'karistirici' && !a.iadeli ? topListesi(a).map(() => false) : null)),
  };
}

export interface Cekilis {
  /** her aygıtın ürettiği değer (metin) */
  degerler: string[];
  /** karıştırıcı: top indeksi; çark: dilim indeksi; aralık: değer − min */
  secimler: number[];
  /** çark: okun dilim içindeki konumu (0–1); diğerleri 0,5 */
  konumlar: number[];
  /** Toplam sütunu etkinse aygıt değerlerinin toplamı */
  toplam: number | null;
}

/**
 * Tek çekiliş: her aygıttan bir değer. İadesiz karıştırıcı boşsa null (çalıştırma durur).
 * `durum` yerinde güncellenir (çıkan toplar işaretlenir).
 */
export function tekCekilis(ayar: OrnekleyiciAyari, durum: CalismaDurumu, rnd: Uretec): Cekilis | null {
  const degerler: string[] = [];
  const secimler: number[] = [];
  const konumlar: number[] = [];
  // Önce boşalma denetimi: bir aygıt boşsa hiçbirinden çekme
  for (let i = 0; i < ayar.aygitlar.length; i++) {
    const cikan = durum.cikan[i];
    if (cikan && !cikan.some((c) => !c)) return null;
  }
  for (let i = 0; i < ayar.aygitlar.length; i++) {
    const a = ayar.aygitlar[i];
    if (a.tur === 'karistirici') {
      const toplar = topListesi(a);
      const cikan = durum.cikan[i];
      let top: number;
      if (cikan) {
        const kalan: number[] = [];
        cikan.forEach((c, j) => {
          if (!c) kalan.push(j);
        });
        top = kalan[Math.min(kalan.length - 1, Math.floor(rnd() * kalan.length))];
        cikan[top] = true;
      } else {
        top = Math.min(toplar.length - 1, Math.floor(rnd() * toplar.length));
      }
      degerler.push(a.ogeler[toplar[top]].etiket.trim());
      secimler.push(top);
      konumlar.push(0.5);
    } else if (a.tur === 'cark') {
      const j = agirlikliSec(rnd, carkOranlari(a).oranlar);
      degerler.push(a.dilimler[j].etiket.trim());
      secimler.push(j);
      konumlar.push(0.15 + rnd() * 0.7);
    } else {
      const { min, max } = aralikSinirlari(a);
      const v = tamSayi(rnd, min, max);
      degerler.push(String(v));
      secimler.push(v - min);
      konumlar.push(0.5);
    }
  }
  let t: number | null = null;
  if (toplamEtkin(ayar)) {
    t = 0;
    for (const d of degerler) t += sayiOku(d) ?? 0;
    t = temizle(t);
  }
  return { degerler, secimler, konumlar, toplam: t };
}

/** N çekilişlik bir çalıştırma; iadesiz kutu boşalınca erken durur */
export function cekilisler(ayar: OrnekleyiciAyari, n: number, rnd: Uretec): { cekilisler: Cekilis[]; durdu: boolean } {
  const durum = calismaBaslat(ayar.aygitlar);
  const sonuc: Cekilis[] = [];
  for (let i = 0; i < n; i++) {
    const c = tekCekilis(ayar, durum, rnd);
    if (!c) return { cekilisler: sonuc, durdu: true };
    sonuc.push(c);
  }
  return { cekilisler: sonuc, durdu: false };
}

/** Tablo satırına girecek değerler (Çekiliş numarası hariç): aygıt değerleri [+ toplam] */
export function satirDegerleri(ayar: OrnekleyiciAyari, c: Cekilis): string[] {
  return toplamEtkin(ayar) && c.toplam !== null ? [...c.degerler, sayiYaz(c.toplam, 6)] : [...c.degerler];
}
