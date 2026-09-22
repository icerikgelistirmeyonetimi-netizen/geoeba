/**
 * Veri ve Grafik — Örnekleyici (TinkerPlots "Sampler" karşılığı), saf model (React'siz).
 *
 * Bir örnekleyici 1–3 aygıttan oluşur; aygıtlar sırayla bağlıdır ve her çekilişte her aygıt bir değer
 * üretir (her aygıt bir değişken / sütun):
 *  - Karıştırıcı: etiketli toplar (etiket + adet), iadeli ya da iadesiz. İadesizde bir çalıştırma
 *    boyunca çıkan top kutuya dönmez; kutu boşalınca çalıştırma durur.
 *  - Çark: dilimler (etiket + yüzde); yüzdeler toplamı 100 değilse oranlar korunarak ölçeklenir.
 *  - Sayı aralığı: a..b tam sayıları eşit olasılıklı (zar = 1..6).
 * İsteğe bağlı "Toplam" sütunu (tüm aygıtlar sayısalsa). "Ölçüm topla" örnekleyiciyi tekrar tekrar
 * çalıştırıp her çalıştırmanın ölçüsünü (sayı, oran, ortalama …) toplar.
 */
import { agirlikliSec, tamSayi, type Uretec } from './rastgele';
import { aciklik, enBuyuk, enKucuk, medyan, ortalama, temizle, toplam } from './istatistik';
import { kimlikUret, sayiOku, sayiYaz, type Satir, type Sutun, type VeriTablosu } from './veri';

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

export type OlcuTuru = 'sayisi' | 'orani' | 'ortalama' | 'toplam' | 'medyan' | 'enBuyuk' | 'enKucuk' | 'aciklik';

export interface OlcumAyari {
  /** aygıt kimliği ya da 'toplam' */
  kaynak: string;
  olcu: OlcuTuru;
  /** sayısı / oranı ölçülerinde aranan değer */
  hedef: string;
}

/** 0 = Yavaş, 1 = Orta, 2 = Hızlı, 3 = Anında */
export type Hiz = 0 | 1 | 2 | 3;

export interface OrnekleyiciAyari {
  aygitlar: Aygit[];
  toplamSutunu: boolean;
  cekilisSayisi: number;
  hiz: Hiz;
  olcum: OlcumAyari;
}

export const EN_COK_AYGIT = 3;
export const EN_COK_CEKILIS = 200;
export const EN_COK_TOP = 60;
export const EN_COK_ETIKET = 12;
export const EN_COK_ARALIK = 1000;
/** Deney sonuçları tablosu bu kadar satırı geçmez (arayüz akıcı kalsın) */
export const EN_COK_DENEY_SATIRI = 2000;
export const TOPLAM_KAYNAK = 'toplam';

export const HIZ_ADLARI = ['Yavaş', 'Orta', 'Hızlı', 'Anında'] as const;
/** Bir çekilişin canlandırma süresi (ms); Anında = 0 */
export const HIZ_SURELERI = [1500, 780, 300, 0] as const;

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

export function yeniAygit(tur: AygitTuru, degisken: string): Aygit {
  if (tur === 'cark') return cark(degisken, [['A', 50], ['B', 50]]);
  if (tur === 'aralik') return sayiAraligi(degisken, 1, 6);
  return karistirici(degisken, [['A', 1], ['B', 1]]);
}

/** Türü değiştirir; kimlik ve değişken adı korunur, içerik mümkünse taşınır */
export function aygitTuruDegistir(a: Aygit, tur: AygitTuru): Aygit {
  if (a.tur === tur) return a;
  const kategori = aygitKategorileri(a).slice(0, EN_COK_ETIKET);
  if (tur === 'aralik') {
    const sayilar = kategori.map((k) => sayiOku(k)).filter((s): s is number => s !== null && Number.isInteger(s));
    const min = sayilar.length > 0 ? Math.min(...sayilar) : 1;
    const max = sayilar.length > 0 ? Math.max(...sayilar) : 6;
    return { id: a.id, degisken: a.degisken, tur: 'aralik', min, max: max - min > EN_COK_ARALIK ? min + 5 : max };
  }
  const etiketler = kategori.length > 0 && kategori.length <= EN_COK_ETIKET ? kategori : ['A', 'B'];
  if (tur === 'cark') {
    const oranlar = aygitOlasiliklari(a);
    const dilimler =
      oranlar.length === etiketler.length
        ? oranlar.map((o) => ({ etiket: o.etiket, yuzde: temizle(Math.round(o.olasilik * 1000) / 10) }))
        : etiketler.map((etiket) => ({ etiket, yuzde: temizle(Math.round(1000 / etiketler.length) / 10) }));
    return { id: a.id, degisken: a.degisken, tur: 'cark', dilimler };
  }
  return { id: a.id, degisken: a.degisken, tur: 'karistirici', iadeli: true, ogeler: etiketler.map((etiket) => ({ etiket, adet: 1 })) };
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
    if (n === 0) return 'Kutuda hiç top yok';
    if (n > EN_COK_TOP) return `Kutuda en çok ${EN_COK_TOP} top olabilir`;
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
      return `İadesiz çekilişte kutuda ${n} top var: ${cekilisSayisi} çekilişin yalnız ilk ${n} tanesi yapılabilir, kutu boşalınca çalıştırma durur.`;
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
    if (s) return `${a.degisken || 'Aygıt'}: ${s}`;
  }
  return ayar.aygitlar.length === 0 ? 'Örnekleyicide aygıt yok' : null;
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

// ── Sonuç tablosu ("Deney sonuçları" veri kümesi) ─────────────────────────────

export const CEKILIS_SUTUNU = 'vg-cekilis';
export const TOPLAM_SUTUNU = 'vg-toplam';
export const aygitSutunKimligi = (aygitId: string) => `vg-${aygitId}`;

export function sonucSutunlari(ayar: OrnekleyiciAyari): Sutun[] {
  const adlar = degiskenAdlari(ayar);
  const sutunlar: Sutun[] = [
    { id: CEKILIS_SUTUNU, ad: 'Çekiliş', tur: 'etiket' },
    ...ayar.aygitlar.map((a, i) => ({ id: aygitSutunKimligi(a.id), ad: adlar[i], tur: aygitSayisalMi(a) ? ('sayi' as const) : ('etiket' as const) })),
  ];
  if (toplamEtkin(ayar)) sutunlar.push({ id: TOPLAM_SUTUNU, ad: 'Toplam', tur: 'sayi' });
  return sutunlar;
}

/**
 * Tablo bu örnekleyicinin sütun yapısında mı? Beklenen her sütun (Çekiliş, aygıt değişkenleri [, Toplam])
 * aynı kimlik ve türle bulunmalı; kullanıcının elle eklediği ek sütunlar uyumu bozmaz.
 */
export function sonucTablosuUyumlu(tablo: VeriTablosu | null | undefined, ayar: OrnekleyiciAyari): tablo is VeriTablosu {
  if (!tablo) return false;
  const beklenen = sonucSutunlari(ayar);
  return beklenen.every((s) => tablo.sutunlar.some((t) => t.id === s.id && t.tur === s.tur));
}

/** Aygıtlar değiştiği için bir sonraki çalıştırmada silinecek deney satırı sayısı (uyumluysa 0) */
export function silinecekSonucSayisi(tablo: VeriTablosu | null | undefined, ayar: OrnekleyiciAyari): number {
  const n = tablo?.satirlar.length ?? 0;
  if (n === 0) return 0;
  return sonucTablosuUyumlu(tablo, ayar) ? 0 : n;
}

/**
 * Son çekiliş numarası: uyumlu tablodaki en büyük "Çekiliş" değeri (satır silinse de numara yinelenmez);
 * uyumsuz ya da boş tabloda 0.
 */
export function cekilisBaslangici(tablo: VeriTablosu | null | undefined, ayar: OrnekleyiciAyari): number {
  if (!sonucTablosuUyumlu(tablo, ayar)) return 0;
  const j = tablo.sutunlar.findIndex((s) => s.id === CEKILIS_SUTUNU);
  let enBuyukNo = 0;
  for (const r of tablo.satirlar) {
    const n = sayiOku(r.hucreler[j] ?? '');
    if (n !== null && Number.isFinite(n) && n > enBuyukNo) enBuyukNo = Math.floor(n);
  }
  return enBuyukNo;
}

/**
 * Satırları sonuç tablosuna ekler. Tablo uyumluysa birikir (Çekiliş numarası en büyük numaradan sürer,
 * sütun adları güncellenir, elle eklenmiş sütunlar korunur ve yeni satırda boş kalır); aygıtlar
 * değiştiyse yeni tablo kurulur (arayüz bunu önceden sorar: silinecekSonucSayisi).
 */
export function sonucEkle(tablo: VeriTablosu | null | undefined, ayar: OrnekleyiciAyari, satirlar: string[][]): VeriTablosu {
  const beklenen = sonucSutunlari(ayar);
  const uyumlu = sonucTablosuUyumlu(tablo, ayar);
  const baslangic = cekilisBaslangici(tablo, ayar);
  const adlar = new Map(beklenen.map((s) => [s.id, s.ad]));
  const sutunlar: Sutun[] = uyumlu ? tablo.sutunlar.map((s) => (adlar.has(s.id) ? { ...s, ad: adlar.get(s.id)! } : s)) : beklenen;
  const eski = uyumlu ? tablo.satirlar : [];
  // Beklenen sütunun (Çekiliş hariç) değer sırası → tablodaki konum
  const deger = new Map(beklenen.slice(1).map((s, j) => [s.id, j]));
  const yeni: Satir[] = satirlar.map((degerler, i) => ({
    id: kimlikUret('r'),
    hucreler: sutunlar.map((s) => (s.id === CEKILIS_SUTUNU ? String(baslangic + i + 1) : deger.has(s.id) ? degerler[deger.get(s.id)!] ?? '' : '')),
  }));
  return { sutunlar, satirlar: [...eski, ...yeni] };
}

// ── Ölçüler ve "Ölçüm topla" ──────────────────────────────────────────────────

export interface OlcuTanimi {
  id: OlcuTuru;
  ad: string;
  /** kategorik değişkende kullanılabilir mi */
  kategorik: boolean;
  /** hedef değer ister mi (sayısı / oranı) */
  hedefli: boolean;
}

export const OLCULER: OlcuTanimi[] = [
  { id: 'sayisi', ad: 'sayısı', kategorik: true, hedefli: true },
  { id: 'orani', ad: 'oranı (%)', kategorik: true, hedefli: true },
  { id: 'ortalama', ad: 'Ortalama', kategorik: false, hedefli: false },
  { id: 'toplam', ad: 'Toplam', kategorik: false, hedefli: false },
  { id: 'medyan', ad: 'Medyan', kategorik: false, hedefli: false },
  { id: 'enBuyuk', ad: 'En büyük', kategorik: false, hedefli: false },
  { id: 'enKucuk', ad: 'En küçük', kategorik: false, hedefli: false },
  { id: 'aciklik', ad: 'Açıklık', kategorik: false, hedefli: false },
];

export function olcuTanimi(olcu: OlcuTuru): OlcuTanimi {
  return OLCULER.find((o) => o.id === olcu) ?? OLCULER[0];
}

function ayniDeger(a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  if (x === y) return true;
  const sx = sayiOku(x);
  const sy = sayiOku(y);
  return sx !== null && sy !== null && sx === sy;
}

/** Bir çalıştırmanın değerlerinden ölçü (veri yoksa ya da sayısal ölçü okunamazsa null) */
export function olcuHesapla(olcu: OlcuTuru, degerler: string[], hedef = ''): number | null {
  const dolu = degerler.filter((d) => d.trim() !== '');
  if (olcu === 'sayisi' || olcu === 'orani') {
    if (dolu.length === 0) return olcu === 'sayisi' ? 0 : null;
    const adet = dolu.filter((d) => ayniDeger(d, hedef)).length;
    return olcu === 'sayisi' ? adet : temizle((adet / dolu.length) * 100);
  }
  const sayilar = dolu.map((d) => sayiOku(d)).filter((s): s is number => s !== null);
  if (sayilar.length === 0) return null;
  const sonuc =
    olcu === 'ortalama'
      ? ortalama(sayilar)
      : olcu === 'toplam'
        ? toplam(sayilar)
        : olcu === 'medyan'
          ? medyan(sayilar)
          : olcu === 'enBuyuk'
            ? enBuyuk(sayilar)
            : olcu === 'enKucuk'
              ? enKucuk(sayilar)
              : aciklik(sayilar);
  return sonuc === null ? null : temizle(sonuc);
}

export interface OlcumKaynagi {
  id: string;
  ad: string;
  sayisal: boolean;
  kategoriler: string[];
}

export function olcumKaynaklari(ayar: OrnekleyiciAyari): OlcumKaynagi[] {
  const adlar = degiskenAdlari(ayar);
  const k: OlcumKaynagi[] = ayar.aygitlar.map((a, i) => ({
    id: a.id,
    ad: adlar[i],
    sayisal: aygitSayisalMi(a),
    kategoriler: aygitKategorileri(a),
  }));
  if (toplamEtkin(ayar)) k.push({ id: TOPLAM_KAYNAK, ad: 'Toplam', sayisal: true, kategoriler: [] });
  return k;
}

/** Ölçüm ayarını geçerli kılar: kaynak var, ölçü türe uygun, hedef kategorilerden biri */
export function olcumAyariDuzelt(ayar: OrnekleyiciAyari, olcum: OlcumAyari = ayar.olcum): OlcumAyari {
  const kaynaklar = olcumKaynaklari(ayar);
  const kaynak = kaynaklar.find((k) => k.id === olcum.kaynak) ?? kaynaklar[0];
  if (!kaynak) return { kaynak: '', olcu: 'sayisi', hedef: '' };
  let olcu = OLCULER.some((o) => o.id === olcum.olcu) ? olcum.olcu : 'sayisi';
  if (!kaynak.sayisal && !olcuTanimi(olcu).kategorik) olcu = 'sayisi';
  let hedef = typeof olcum.hedef === 'string' ? olcum.hedef : '';
  if (olcuTanimi(olcu).hedefli) {
    if (kaynak.kategoriler.length > 0 && !kaynak.kategoriler.includes(hedef.trim())) hedef = kaynak.kategoriler[kaynak.kategoriler.length > 1 ? 1 : 0];
    if (kaynak.kategoriler.length === 0 && sayiOku(hedef) === null) hedef = '7';
  }
  return { kaynak: kaynak.id, olcu, hedef };
}

/**
 * Ölçüm sütununun adı, örneklem büyüklüğüyle: "Tura sayısı (10 çekiliş)", "Evet oranı (%) (20 çekiliş)",
 * "Ortalama (Toplam, 100 çekiliş)". Çekiliş sayısı ada girdiği için farklı örneklem büyüklüklerinin
 * ölçümleri ayrı sütunlara (ayrı dağılımlara) düşer.
 */
export function olcuAdi(ayar: OrnekleyiciAyari, olcum: OlcumAyari = ayar.olcum): string {
  const o = olcumAyariDuzelt(ayar, olcum);
  const kaynak = olcumKaynaklari(ayar).find((k) => k.id === o.kaynak);
  const tanim = olcuTanimi(o.olcu);
  const n = `${ayar.cekilisSayisi} çekiliş`;
  if (tanim.hedefli) return `${o.hedef.trim() || '?'} ${tanim.ad} (${n})`;
  return `${tanim.ad} (${kaynak?.ad ?? '?'}, ${n})`;
}

/** Bir çalıştırmanın ölçülen değişken değerleri */
export function kaynakDegerleri(ayar: OrnekleyiciAyari, cekilisListesi: Cekilis[], kaynak: string): string[] {
  if (kaynak === TOPLAM_KAYNAK) return cekilisListesi.map((c) => (c.toplam === null ? '' : sayiYaz(c.toplam, 6)));
  const i = ayar.aygitlar.findIndex((a) => a.id === kaynak);
  return i < 0 ? [] : cekilisListesi.map((c) => c.degerler[i] ?? '');
}

/** Örnekleyiciyi bir kez (ayarlı çekiliş sayısıyla) çalıştırıp ölçüyü döndürür */
export function tekrarOlcusu(ayar: OrnekleyiciAyari, rnd: Uretec): number | null {
  const o = olcumAyariDuzelt(ayar);
  const { cekilisler: liste } = cekilisler(ayar, ayar.cekilisSayisi, rnd);
  return olcuHesapla(o.olcu, kaynakDegerleri(ayar, liste, o.kaynak), o.hedef);
}

export function olcumTopla(ayar: OrnekleyiciAyari, tekrar: number, rnd: Uretec): (number | null)[] {
  const sonuc: (number | null)[] = [];
  for (let i = 0; i < tekrar; i++) sonuc.push(tekrarOlcusu(ayar, rnd));
  return sonuc;
}

export const TEKRAR_SUTUNU = 'vg-tekrar';
const OLCU_ONEKI = 'vg-olcu-';

/** Kısa, kararlı metin özeti (FNV-1a, 32 bit → 36 tabanı): sütun kimliğine sığacak aygıt imzası */
function metinOzeti(metin: string): string {
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

/**
 * Ölçüm sütunlarının aygıt imzası: aygıt kimlikleri sırayla. Ölçü sütunları bu imzayı kimliklerinde
 * taşır ("vg-olcu-<imza>-<n>"); aygıtlar (ön ayar) değişince eski ölçümler bu örnekleyiciye ait sayılmaz.
 * Etiket / adet / yüzde düzenlemeleri kimlikleri değiştirmez, ölçümler korunur.
 */
export function olcumImzasi(ayar: OrnekleyiciAyari): string {
  return metinOzeti(ayar.aygitlar.map((a) => a.id).join('+'));
}

const olcuSutunuMu = (s: Sutun) => s.id.startsWith(OLCU_ONEKI);

/**
 * "Ölçümler" tablosu bu örnekleyicinin aygıtlarına mı ait? İlk sütun "Tekrar" olmalı ve her ölçü sütunu
 * güncel aygıt imzasını taşımalı; kullanıcının elle eklediği sütunlar uyumu bozmaz. Eski kayıtların
 * imzasız ölçü sütunları uyumsuz sayılır (bir sonraki toplamada yeni tablo kurulur).
 */
export function olcumTablosuUyumlu(tablo: VeriTablosu | null | undefined, ayar: OrnekleyiciAyari): tablo is VeriTablosu {
  if (!tablo || tablo.sutunlar[0]?.id !== TEKRAR_SUTUNU) return false;
  const onek = `${OLCU_ONEKI}${olcumImzasi(ayar)}-`;
  return tablo.sutunlar.filter(olcuSutunuMu).every((s) => s.id.startsWith(onek));
}

/** Aygıtlar değiştiği için bir sonraki ölçüm toplamada silinecek ölçüm satırı sayısı (uyumluysa 0) */
export function silinecekOlcumSayisi(tablo: VeriTablosu | null | undefined, ayar: OrnekleyiciAyari): number {
  const n = tablo?.satirlar.length ?? 0;
  if (n === 0) return 0;
  return olcumTablosuUyumlu(tablo, ayar) ? 0 : n;
}

/**
 * Ölçümleri "Ölçümler" tablosuna ekler (birikir). Aynı adlı ölçü sütunu varsa ona, yoksa yeni sütuna
 * yazılır; "Tekrar" numarası sürer. Tablo bu aygıtlara ait değilse (ön ayar değişti, eski kayıt) ya da
 * boşaltılmışsa yeni tablo kurulur: başka deneyin ölçü sütunları ekranda kalmaz.
 */
export function olcumlerEkle(
  tablo: VeriTablosu | null | undefined,
  ayar: OrnekleyiciAyari,
  ad: string,
  degerler: (number | null)[],
): { tablo: VeriTablosu; sutunId: string } {
  const imza = olcumImzasi(ayar);
  let temel: VeriTablosu =
    olcumTablosuUyumlu(tablo, ayar) && tablo.satirlar.length > 0 ? tablo : { sutunlar: [{ id: TEKRAR_SUTUNU, ad: 'Tekrar', tur: 'etiket' }], satirlar: [] };
  let j = temel.sutunlar.findIndex((s, i) => i > 0 && s.ad === ad);
  if (j < 0) {
    const kullanilan = new Set(temel.sutunlar.map((s) => s.id));
    let n = temel.sutunlar.length;
    while (kullanilan.has(`${OLCU_ONEKI}${imza}-${n}`)) n++;
    temel = {
      sutunlar: [...temel.sutunlar, { id: `${OLCU_ONEKI}${imza}-${n}`, ad, tur: 'sayi' }],
      satirlar: temel.satirlar.map((r) => ({ ...r, hucreler: [...r.hucreler, ''] })),
    };
    j = temel.sutunlar.length - 1;
  }
  const genislik = temel.sutunlar.length;
  const baslangic = temel.satirlar.length;
  const yeni: Satir[] = degerler.map((d, i) => ({
    id: kimlikUret('r'),
    hucreler: Array.from({ length: genislik }, (_, k) => (k === 0 ? String(baslangic + i + 1) : k === j && d !== null ? sayiYaz(d, 4) : '')),
  }));
  return { tablo: { ...temel, satirlar: [...temel.satirlar, ...yeni] }, sutunId: temel.sutunlar[j].id };
}

// ── Ön ayarlar ────────────────────────────────────────────────────────────────

export interface OnAyar {
  id: string;
  ad: string;
  olustur: () => OrnekleyiciAyari;
}

function ayarKur(aygitlar: Aygit[], cekilisSayisi: number, olcum: Partial<OlcumAyari>, toplamSutunu = false): OrnekleyiciAyari {
  const ayar: OrnekleyiciAyari = {
    aygitlar,
    toplamSutunu,
    cekilisSayisi,
    hiz: 1,
    olcum: { kaynak: olcum.kaynak ?? aygitlar[0].id, olcu: olcum.olcu ?? 'sayisi', hedef: olcum.hedef ?? '' },
  };
  return { ...ayar, olcum: olcumAyariDuzelt(ayar) };
}

export const ON_AYARLAR: OnAyar[] = [
  {
    id: 'para',
    ad: 'Madeni para (Yazı / Tura)',
    olustur: () => ayarKur([karistirici('Sonuç', [['Yazı', 1], ['Tura', 1]])], 10, { olcu: 'sayisi', hedef: 'Tura' }),
  },
  {
    id: 'zar',
    ad: 'Zar (1–6)',
    olustur: () => ayarKur([sayiAraligi('Zar', 1, 6)], 30, { olcu: 'ortalama' }),
  },
  {
    id: 'iki-zar',
    ad: 'İki zar (+ Toplam)',
    olustur: () => {
      const a = sayiAraligi('Zar 1', 1, 6);
      const b = sayiAraligi('Zar 2', 1, 6);
      return ayarKur([a, b], 100, { kaynak: TOPLAM_KAYNAK, olcu: 'sayisi', hedef: '7' }, true);
    },
  },
  {
    id: 'torba',
    ad: 'Torba: 3 kırmızı, 2 mavi (iadesiz)',
    olustur: () => ayarKur([karistirici('Renk', [['Kırmızı', 3], ['Mavi', 2]], false)], 3, { olcu: 'sayisi', hedef: 'Kırmızı' }),
  },
  {
    id: 'dogum-ayi',
    ad: 'Doğum ayı (12 ay)',
    olustur: () =>
      ayarKur(
        [
          karistirici(
            'Doğum ayı',
            ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'].map((ay) => [ay, 1] as [string, number]),
          ),
        ],
        30,
        { olcu: 'sayisi', hedef: 'Ocak' },
      ),
  },
  {
    id: 'anket',
    ad: 'Evet / Hayır anketi (%60 / %40)',
    olustur: () => ayarKur([cark('Cevap', [['Evet', 60], ['Hayır', 40]])], 20, { olcu: 'orani', hedef: 'Evet' }),
  },
];

export function varsayilanOrnekleyici(): OrnekleyiciAyari {
  const a = ON_AYARLAR[0].olustur();
  return { ...a, cekilisSayisi: 20 };
}

// ── Kalıcılık doğrulaması ─────────────────────────────────────────────────────

function metin(x: unknown, varsayilan = ''): string {
  return typeof x === 'string' ? x.slice(0, 40) : typeof x === 'number' && Number.isFinite(x) ? String(x) : varsayilan;
}

function sayi(x: unknown): number | null {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x === 'string') return sayiOku(x);
  return null;
}

/** Kayıttan aygıt (bozuk → null; geçersiz yüzde / adet 0 sayılır) */
export function aygitDogrula(ham: unknown): Aygit | null {
  if (!ham || typeof ham !== 'object') return null;
  const h = ham as Record<string, unknown>;
  const id = typeof h.id === 'string' && h.id !== '' ? h.id : kimlikUret('ay');
  const degisken = metin(h.degisken, 'Sonuç');
  if (h.tur === 'karistirici') {
    if (!Array.isArray(h.ogeler)) return null;
    const ogeler = h.ogeler
      .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
      .slice(0, EN_COK_ETIKET)
      .map((o) => {
        const adet = sayi(o.adet);
        return { etiket: metin(o.etiket), adet: adet !== null && adet > 0 ? Math.min(EN_COK_TOP, Math.floor(adet)) : 0 };
      });
    if (ogeler.length === 0) return null;
    return { id, degisken, tur: 'karistirici', ogeler, iadeli: h.iadeli !== false };
  }
  if (h.tur === 'cark') {
    if (!Array.isArray(h.dilimler)) return null;
    const dilimler = h.dilimler
      .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
      .slice(0, EN_COK_ETIKET)
      .map((d) => {
        const y = sayi(d.yuzde);
        return { etiket: metin(d.etiket), yuzde: y !== null && y > 0 ? Math.min(100000, y) : 0 };
      });
    if (dilimler.length === 0) return null;
    return { id, degisken, tur: 'cark', dilimler };
  }
  if (h.tur === 'aralik') {
    const min = sayi(h.min);
    const max = sayi(h.max);
    if (min === null || max === null) return null;
    return { id, degisken, tur: 'aralik', min: Math.round(min), max: Math.round(max) };
  }
  return null;
}

/** Kayıttan örnekleyici ayarı; bozuk alanlar varsayılana döner (asla atmaz) */
export function ornekleyiciDogrula(ham: unknown): OrnekleyiciAyari {
  const temel = varsayilanOrnekleyici();
  if (!ham || typeof ham !== 'object') return temel;
  const h = ham as Record<string, unknown>;
  const aygitlar = Array.isArray(h.aygitlar) ? h.aygitlar.map(aygitDogrula).filter((a): a is Aygit => a !== null).slice(0, EN_COK_AYGIT) : [];
  // Kimlik çakışması olmasın
  const gorulen = new Set<string>();
  for (const a of aygitlar) {
    if (gorulen.has(a.id)) a.id = kimlikUret('ay');
    gorulen.add(a.id);
  }
  const cs = sayi(h.cekilisSayisi);
  const hiz = sayi(h.hiz);
  const ayar: OrnekleyiciAyari = {
    aygitlar: aygitlar.length > 0 ? aygitlar : temel.aygitlar,
    toplamSutunu: h.toplamSutunu === true,
    cekilisSayisi: cs !== null ? Math.min(EN_COK_CEKILIS, Math.max(1, Math.round(cs))) : temel.cekilisSayisi,
    hiz: hiz !== null && [0, 1, 2, 3].includes(hiz) ? (hiz as Hiz) : 1,
    olcum: temel.olcum,
  };
  const o = h.olcum && typeof h.olcum === 'object' ? (h.olcum as Record<string, unknown>) : {};
  return {
    ...ayar,
    olcum: olcumAyariDuzelt(ayar, {
      kaynak: typeof o.kaynak === 'string' ? o.kaynak : '',
      olcu: (typeof o.olcu === 'string' ? o.olcu : 'sayisi') as OlcuTuru,
      hedef: metin(o.hedef),
    }),
  };
}
