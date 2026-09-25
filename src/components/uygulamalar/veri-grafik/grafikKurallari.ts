/**
 * Veri ve Grafik — grafiklerin bağlanma kuralları (saf, React'siz; index.tsx'ten ayrılmış kabuk mantığı).
 * - Karşılaştır: sayısal değişkenler yalnız aynı birimle; kategorik değişkenler "(gruplara ayır)" (en çok 4 grup).
 * - Gruplara ayırma: her kategori için bir nokta grafiği paneli (satır alt kümesi ve "7-A (15 veri)" başlığı).
 * - Daire: sayısal değişkende her satır bir dilim, değerlerin sıklığı ya da "uygun değil" bilgi kutusu.
 * - Sütun: çok veride (n > 40, en çok 30 farklı değer) değerlerin sıklığı çizilir.
 * - Çizgi: satırlar bir sıra (ay, hafta, tarih, sayı …) gibi görünmüyorsa uyarı notu.
 * - PNG başlık bandı.
 */
import { sutunBirimi, type DaireModu, type Sekme } from './durum';
import { degiskenSutunlari, kategoriler, sutunMetinleri } from './kategorik';
import { gecerliDegerler, sayiOku, sayiYaz, type VeriTablosu } from './veri';

// ── Karşılaştırma ────────────────────────────────────────────────────────────

/** Kategorik değişkene göre gruplara ayırmada en çok bu kadar panel (grup) çizilir */
export const GRUP_EN_COK = 4;

/** Karşılaştırma türü: iki sayısal değişken (iki panel / iki seri) ya da kategorik değişkene göre gruplar */
export type KarsilastirmaTuru = 'sayi' | 'grup';

export interface KarsilastirmaAdayi {
  id: string;
  ad: string;
  tur: KarsilastirmaTuru;
  /** seçim listesinde görünen ad: "Yasemin" ya da "Sınıf (gruplara ayır)" */
  etiket: string;
  /** seçilemiyorsa nedeni (seçenekte pasif ve title); seçilebiliyorsa null */
  neden: string | null;
}

/** Birim karşılaştırması büyük / küçük harf ve boşluk duyarsız ("(cm)" ile "( CM )" aynı birim) */
function birimAnahtari(ad: string): string | null {
  const b = sutunBirimi(ad);
  return b === null ? null : b.toLocaleLowerCase('tr').replace(/\s+/g, '');
}

/** İki sayısal sütun aynı ölçekte mi: birimleri aynı ya da ikisi de birimsiz ("Selma" ile "Yasemin") */
export function birimUyumlu(ad1: string, ad2: string): boolean {
  return birimAnahtari(ad1) === birimAnahtari(ad2);
}

/** Kategorik sütundaki farklı (boş olmayan) değer sayısı */
function kategoriSayisi(tablo: VeriTablosu, sutun: number): number {
  return new Set(sutunMetinleri(tablo, sutun).map((m) => m.deger)).size;
}

/**
 * "Karşılaştır" listesinin seçenekleri (grafik türüne ve ana değişkene göre):
 * - Nokta, sayısal ana değişken: aynı birimli sayısal değişkenler (ikinci panel) ve kategorik değişkenler (gruplar);
 * - Nokta, kategorik ana değişken: öteki kategorik değişkenler (gruplar);
 * - Çizgi ve İstatistik, sayısal ana değişken: aynı birimli sayısal değişkenler.
 * Başka birimdeki sayısal değişken listede yoktur (ortak eksen yanıltır). 4'ten çok kategorili (ya da boş) kategorik
 * değişken listede pasiftir; nedeni `neden`de.
 */
export function karsilastirmaAdaylari(tablo: VeriTablosu, anaId: string | null, sekme: Sekme): KarsilastirmaAdayi[] {
  if (sekme !== 'nokta' && sekme !== 'cizgi' && sekme !== 'istatistik') return [];
  const degiskenler = degiskenSutunlari(tablo);
  const ana = degiskenler.find((s) => s.id === anaId);
  if (!ana) return [];
  const sonuc: KarsilastirmaAdayi[] = [];
  for (const s of degiskenler) {
    if (s.id === ana.id) continue;
    if (s.tur === 'sayi') {
      if (ana.tur !== 'sayi' || !birimUyumlu(ana.ad, s.ad)) continue;
      sonuc.push({ id: s.id, ad: s.ad, tur: 'sayi', etiket: s.ad, neden: null });
    } else if (sekme === 'nokta') {
      const sayi = kategoriSayisi(tablo, tablo.sutunlar.indexOf(s));
      const neden =
        sayi === 0
          ? `${s.ad} sütununda henüz değer yok.`
          : sayi > GRUP_EN_COK
            ? `En çok ${GRUP_EN_COK} gruba ayrılabilir; ${s.ad} sütununda ${sayi} farklı değer var.`
            : null;
      sonuc.push({ id: s.id, ad: s.ad, tur: 'grup', etiket: `${s.ad} (gruplara ayır)`, neden });
    }
  }
  return sonuc;
}

/** Seçili ikinci değişken bu grafikte geçerli bir karşılaştırma mı; geçerliyse türü (değilse null: karşılaştırma yok) */
export function karsilastirmaTuru(tablo: VeriTablosu, anaId: string | null, ikinciId: string | null, sekme: Sekme): KarsilastirmaTuru | null {
  if (!ikinciId || ikinciId === anaId) return null;
  const aday = karsilastirmaAdaylari(tablo, anaId, sekme).find((a) => a.id === ikinciId);
  return aday && aday.neden === null ? aday.tur : null;
}

export interface GrupPaneli {
  kategori: string;
  /** grubun satırları (tablonun geneline göre indeks) */
  satirlar: number[];
  /** gruptaki geçerli veri sayısı (ana değişkende değeri olan satırlar) */
  veriSayisi: number;
  /** panel başlığı: "7-A (15 veri)" */
  baslik: string;
}

/**
 * Kategorik değişkene göre gruplar: her kategori için ana değişkenin panelinde çizilecek satırlar. Grup hücresi boş
 * satırlar hiçbir panele girmez. Sıra verilirse (örnek ya da araştırma sırası) o, yoksa alfabetik / sayısal.
 */
export function grupPanelleri(tablo: VeriTablosu, anaSutun: number, grupSutun: number, sira?: string[]): GrupPaneli[] {
  if (grupSutun < 0 || grupSutun >= tablo.sutunlar.length) return [];
  const metinler = sutunMetinleri(tablo, grupSutun);
  const anaSayisal = tablo.sutunlar[anaSutun]?.tur === 'sayi';
  const degerVar = (satir: number) => {
    const h = tablo.satirlar[satir]?.hucreler[anaSutun] ?? '';
    return anaSayisal ? sayiOku(h) !== null : h.trim() !== '';
  };
  return kategoriler(
    metinler.map((m) => m.deger),
    sira,
  )
    .map((kategori) => {
      const satirlar = metinler.filter((m) => m.deger === kategori).map((m) => m.satir);
      const veriSayisi = satirlar.filter(degerVar).length;
      return { kategori, satirlar, veriSayisi, baslik: `${kategori} (${veriSayisi} veri)` };
    })
    .filter((g) => g.satirlar.length > 0);
}

// ── Değerlerin sıklığı (Daire ve çok veride Sütun) ───────────────────────────

/** Daire grafiğinin sayısal değişkendeki görünümü ('uygunDegil' yalnız örnekten gelir: grafik yerine bilgi kutusu) */
export type DaireGorunumu = DaireModu | 'uygunDegil';

/** Daire sekmesinde varsayılan: en az 8 veri varsa ve değerler tekrarlıyorsa değerlerin sıklığı, değilse her satır bir dilim */
export function varsayilanDaireModu(degerler: readonly number[]): DaireModu {
  return degerler.length >= 8 && new Set(degerler).size < degerler.length ? 'siklik' : 'satir';
}

/** Daire görünümü: önce kullanıcı seçimi, yoksa bağlı örneğin `daire` alanı, yoksa verinin varsayılanı */
export function daireGorunumu(secim: DaireModu | null, ornekDaire: DaireGorunumu | null | undefined, degerler: readonly number[]): DaireGorunumu {
  return secim ?? ornekDaire ?? varsayilanDaireModu(degerler);
}

/** Sütun sekmesi bu kadar veriden sonra (en çok 30 farklı değerde) her satır yerine değerlerin sıklığını çizer */
export const SIKLIK_VERI_ESIGI = 40;
export const SIKLIK_FARKLI_EN_COK = 30;

/** Sütun sekmesi değerlerin sıklığını mı çizsin: 40'tan çok veri ve en çok 30 farklı değer (her satır bir sütun okunmaz) */
export function sutundaSiklikGerekli(degerler: readonly number[]): boolean {
  return degerler.length > SIKLIK_VERI_ESIGI && new Set(degerler).size <= SIKLIK_FARKLI_EN_COK;
}

/**
 * Değerlerin sıklığı için türetilmiş tablo: sayısal sütun kategorik sütuna çevrilir (hücreler "3", "2,5" biçiminde
 * yeniden yazılır; sayı olmayan hücre boş). Öteki sütunlar ve satır sırası aynı kalır (renk anahtarı ve satır
 * indeksleri geçerli). `sira` kategorilerin küçükten büyüğe sırasıdır.
 */
export function degerSikligiTablosu(tablo: VeriTablosu, sutun: number): { tablo: VeriTablosu; sira: string[] } {
  if (sutun <= 0 || sutun >= tablo.sutunlar.length) return { tablo, sira: [] };
  const degerler = gecerliDegerler(tablo, sutun).map((n) => n.deger);
  const sira = [...new Set(degerler)].sort((a, b) => a - b).map((v) => sayiYaz(v, 6));
  return {
    tablo: {
      sutunlar: tablo.sutunlar.map((s, i) => (i === sutun ? { ...s, tur: 'etiket' as const } : s)),
      satirlar: tablo.satirlar.map((r) => {
        const v = sayiOku(r.hucreler[sutun]);
        return { ...r, hucreler: r.hucreler.map((h, j) => (j === sutun ? (v === null ? '' : sayiYaz(v, 6)) : h)) };
      }),
    },
    sira,
  };
}

// ── Çizgi: satırlar bir sıra mı ──────────────────────────────────────────────

const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
const AY_KISA = AYLAR.map((a) => a.slice(0, 3));
const GUNLER = ['pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar'];
/** "3. hafta", "Hafta 3", "1. maç" … gibi sıra bildiren sözcükler */
const SIRA_SOZCUKLERI = 'hafta|gün|gun|maç|mac|ölçüm|olcum|ay|yıl|yil|dönem|donem|saat|dakika|deneme|tur|atış|atis|ders|sınav|sinav|sezon|çeyrek|ceyrek';

/**
 * Satır adı bir zaman ya da sıra bildiriyor mu: ay ya da gün adı ("Ocak", "Oca", "Pazartesi"), "3. hafta" / "Hafta 3" /
 * "1. maç" / "2. ölçüm", tarih ("3 Kasım", "12.03.2025", "2025-03-12"), saat ("08:30") ya da yalnız sayı ("2024", "5").
 */
export function siraEtiketiMi(etiket: string): boolean {
  const m = etiket.trim().toLocaleLowerCase('tr');
  if (m === '') return false;
  if (/^[+-]?\d+([.,]\d+)?$/.test(m)) return true;
  const kelime = m.replace(/[.,]+$/, '');
  if (AYLAR.includes(kelime) || AY_KISA.includes(kelime) || GUNLER.includes(kelime)) return true;
  // Sözcükten sonra harf gelmez ("3. haftalık" değil); \b Türkçe harflerde (ç, ö …) çalışmaz
  if (new RegExp(`^\\d+\\s*\\.?\\s*(${SIRA_SOZCUKLERI})(?![a-zçğıöşü0-9])`).test(m)) return true;
  if (new RegExp(`^(${SIRA_SOZCUKLERI})\\s*\\d+$`).test(m)) return true;
  if (/^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/.test(m) || /^\d{4}[./-]\d{1,2}([./-]\d{1,2})?$/.test(m)) return true;
  if (/^\d{1,2}:\d{2}$/.test(m)) return true;
  const tarih = new RegExp(`^\\d{1,2}\\s+(${[...AYLAR, ...AY_KISA].join('|')})(\\s+\\d{2,4})?$`);
  const ayYil = new RegExp(`^(${[...AYLAR, ...AY_KISA].join('|')})\\s+\\d{2,4}$`);
  return tarih.test(m) || ayYil.test(m);
}

/**
 * Çizgi sekmesinde "satırlar bir sıra değil" notu gerekiyor mu: ilk sütundaki satır adlarının (en az iki dolu ad) %80'i
 * bir zaman ya da sıra bildirmiyorsa (öğrenci adları, kodlar, kategoriler). Adlar boşsa not çıkmaz (karar verilemez).
 */
export function cizgiSiraNotuGerekli(tablo: VeriTablosu): boolean {
  const adlar = sutunMetinleri(tablo, 0).map((m) => m.deger);
  if (adlar.length < 2) return false;
  const sirali = adlar.filter(siraEtiketiMi).length;
  return sirali < adlar.length * 0.8;
}

export const CIZGI_SIRA_NOTU = 'Çizgi grafiği zamanla değişimi gösterir; bu satırlar bir sıra değil. Sütun grafiğini deneyin.';

// ── PNG başlık bandı ─────────────────────────────────────────────────────────

/**
 * PNG başlık bandı: başlık araştırma sorusu (bağlı araştırma), yoksa bağlı örneğin araştırma sorusu, yoksa grafikteki
 * değişkenin adı; alt başlık "‹kimden ya da tablo adı› · 24 veri" (başlık tablo adıyla aynıysa yalnız "24 veri").
 */
export function pngBandi(o: {
  arastirmaSorusu?: string | null;
  kimden?: string | null;
  ornekSorusu?: string | null;
  degiskenAdi?: string | null;
  tabloAdi: string;
  veriSayisi: number;
}): { baslik: string; altBaslik: string } {
  const temiz = (m: string | null | undefined) => (m && m.trim() !== '' ? m.trim() : null);
  const baslik = temiz(o.arastirmaSorusu) ?? temiz(o.ornekSorusu) ?? temiz(o.degiskenAdi) ?? o.tabloAdi;
  const kaynak = (temiz(o.arastirmaSorusu) && temiz(o.kimden)) || o.tabloAdi;
  const sayim = `${o.veriSayisi} veri`;
  return { baslik, altBaslik: kaynak.trim() === '' || kaynak.trim() === baslik ? sayim : `${kaynak.trim()} · ${sayim}` };
}
