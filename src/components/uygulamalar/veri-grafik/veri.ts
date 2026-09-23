/**
 * Veri ve Grafik — tablo modeli (saf, React'siz).
 * Satırlar gözlem, sütunlar değişken; ilk sütun etiket (metin), diğerleri sayısal.
 * Hücreler ham metin olarak tutulur (ondalık virgül kabul); sayısal okuma sayiOku ile yapılır,
 * okunamayan hücre "hatalı" sayılır ve grafiklerde atlanır (uygulama çökmez, uyarı gösterir).
 */
import { formatTurkishNumber } from '@/math/coordinates';

export type SutunTuru = 'etiket' | 'sayi';

export interface Sutun {
  id: string;
  ad: string;
  tur: SutunTuru;
}

export interface Satir {
  id: string;
  /** sutunlar ile aynı uzunlukta ham metinler */
  hucreler: string[];
}

export interface VeriTablosu {
  sutunlar: Sutun[];
  satirlar: Satir[];
}

let sayac = 0;
export function kimlikUret(onEk: string): string {
  sayac += 1;
  return `${onEk}${sayac}-${Math.random().toString(36).slice(2, 6)}`;
}

/** "3,5" / "3.5" / "1.234,5" / " 12 " → sayı; boş ya da okunamayan → null */
export function sayiOku(metin: string | number | null | undefined): number | null {
  if (typeof metin === 'number') return Number.isFinite(metin) ? metin : null;
  if (metin === null || metin === undefined) return null;
  let m = metin.trim().replace(/\s+/g, '');
  if (m === '') return null;
  m = m.replace(/%$/, '');
  const virgul = m.lastIndexOf(',');
  const nokta = m.lastIndexOf('.');
  if (virgul >= 0 && nokta >= 0) {
    // Son ayırıcı ondalık, diğeri binlik: 1.234,5 → 1234.5 ; 1,234.5 → 1234.5
    if (virgul > nokta) m = m.replace(/\./g, '').replace(',', '.');
    else m = m.replace(/,/g, '');
  } else if (virgul >= 0) {
    if (m.indexOf(',') !== virgul) return null; // birden çok virgül
    m = m.replace(',', '.');
  } else if (nokta >= 0 && m.indexOf('.') !== nokta) {
    return null;
  }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(m)) return null;
  const sayi = Number(m);
  return Number.isFinite(sayi) ? sayi : null;
}

/** Sayı → Türkçe metin (ondalık virgül); -0 düzeltilir */
export function sayiYaz(sayi: number, maxOndalik = 2): string {
  if (!Number.isFinite(sayi)) return '';
  const yuvarlanmis = Number(sayi.toFixed(maxOndalik));
  return formatTurkishNumber(yuvarlanmis === 0 ? 0 : yuvarlanmis, maxOndalik);
}

export function bosTablo(): VeriTablosu {
  return {
    sutunlar: [
      { id: kimlikUret('s'), ad: 'Etiket', tur: 'etiket' },
      { id: kimlikUret('s'), ad: 'Değer', tur: 'sayi' },
    ],
    satirlar: [],
  };
}

/**
 * Başlıklar + satır dizilerinden tablo kurar; ilk sütun etiket, diğerleri sayısal. `turler` ile ilk sütun dışındaki
 * sütunlar kategorik (etiket) yapılabilir (ör. her satır bir öğrenci, "Sınıf" sütunu A / B).
 */
export function tabloOlustur(basliklar: string[], satirlar: (string | number)[][], turler?: (SutunTuru | undefined)[]): VeriTablosu {
  const sutunlar: Sutun[] = basliklar.map((ad, i) => ({
    id: kimlikUret('s'),
    ad,
    tur: i === 0 ? 'etiket' : turler?.[i] ?? 'sayi',
  }));
  return {
    sutunlar,
    satirlar: satirlar.map((h) => ({
      id: kimlikUret('r'),
      hucreler: sutunlar.map((_, i) => hucreMetni(h[i])),
    })),
  };
}

function hucreMetni(deger: string | number | undefined): string {
  if (deger === undefined || deger === null) return '';
  return typeof deger === 'number' ? sayiYaz(deger, 6) : String(deger);
}

export function satirEkle(tablo: VeriTablosu, konum?: number): VeriTablosu {
  const yeni: Satir = { id: kimlikUret('r'), hucreler: tablo.sutunlar.map(() => '') };
  const satirlar = [...tablo.satirlar];
  satirlar.splice(konum === undefined ? satirlar.length : konum, 0, yeni);
  return { ...tablo, satirlar };
}

export function satirSil(tablo: VeriTablosu, indeks: number): VeriTablosu {
  if (indeks < 0 || indeks >= tablo.satirlar.length) return tablo;
  return { ...tablo, satirlar: tablo.satirlar.filter((_, i) => i !== indeks) };
}

export function sutunEkle(tablo: VeriTablosu, ad?: string): VeriTablosu {
  const sayiSutunSayisi = tablo.sutunlar.filter((s) => s.tur === 'sayi').length;
  const yeni: Sutun = { id: kimlikUret('s'), ad: ad ?? `Değişken ${sayiSutunSayisi + 1}`, tur: 'sayi' };
  return {
    sutunlar: [...tablo.sutunlar, yeni],
    satirlar: tablo.satirlar.map((r) => ({ ...r, hucreler: [...r.hucreler, ''] })),
  };
}

/** Etiket sütunu (0) silinemez */
export function sutunSil(tablo: VeriTablosu, indeks: number): VeriTablosu {
  if (indeks <= 0 || indeks >= tablo.sutunlar.length) return tablo;
  return {
    sutunlar: tablo.sutunlar.filter((_, i) => i !== indeks),
    satirlar: tablo.satirlar.map((r) => ({ ...r, hucreler: r.hucreler.filter((_, i) => i !== indeks) })),
  };
}

export function sutunAdiDegistir(tablo: VeriTablosu, indeks: number, ad: string): VeriTablosu {
  return { ...tablo, sutunlar: tablo.sutunlar.map((s, i) => (i === indeks ? { ...s, ad } : s)) };
}

/** Sütunun türünü değiştirir (sayısal ↔ kategorik); ilk sütun hep etiket kalır, hücre metinleri korunur */
export function sutunTuruDegistir(tablo: VeriTablosu, indeks: number, tur: SutunTuru): VeriTablosu {
  if (indeks <= 0 || indeks >= tablo.sutunlar.length || tablo.sutunlar[indeks].tur === tur) return tablo;
  return { ...tablo, sutunlar: tablo.sutunlar.map((s, i) => (i === indeks ? { ...s, tur } : s)) };
}

export function hucreYaz(tablo: VeriTablosu, satir: number, sutun: number, metin: string): VeriTablosu {
  if (satir < 0 || satir >= tablo.satirlar.length || sutun < 0 || sutun >= tablo.sutunlar.length) return tablo;
  if (tablo.satirlar[satir].hucreler[sutun] === metin) return tablo;
  return {
    ...tablo,
    satirlar: tablo.satirlar.map((r, i) =>
      i === satir ? { ...r, hucreler: r.hucreler.map((h, j) => (j === sutun ? metin : h)) } : r,
    ),
  };
}

/** Sayısal hücreye sayı yazar (grafikten sürükleme) */
export function sayiHucreYaz(tablo: VeriTablosu, satir: number, sutun: number, deger: number, maxOndalik = 2): VeriTablosu {
  return hucreYaz(tablo, satir, sutun, sayiYaz(deger, maxOndalik));
}

export function tumunuTemizle(tablo: VeriTablosu): VeriTablosu {
  return { ...tablo, satirlar: [] };
}

export function sutunIndeksi(tablo: VeriTablosu, sutunId: string | null | undefined): number {
  if (!sutunId) return -1;
  return tablo.sutunlar.findIndex((s) => s.id === sutunId);
}

export function sayisalSutunlar(tablo: VeriTablosu): Sutun[] {
  return tablo.sutunlar.filter((s) => s.tur === 'sayi');
}

export interface DegerNoktasi {
  /** satır indeksi */
  satir: number;
  deger: number;
}

/** Sütundaki geçerli sayısal değerler (satır indeksiyle) */
export function gecerliDegerler(tablo: VeriTablosu, sutun: number): DegerNoktasi[] {
  if (sutun < 0 || sutun >= tablo.sutunlar.length) return [];
  const sonuc: DegerNoktasi[] = [];
  tablo.satirlar.forEach((r, i) => {
    const d = sayiOku(r.hucreler[sutun]);
    if (d !== null) sonuc.push({ satir: i, deger: d });
  });
  return sonuc;
}

export function satirEtiketi(tablo: VeriTablosu, satir: number): string {
  const metin = tablo.satirlar[satir]?.hucreler[0]?.trim();
  return metin ? metin : `Satır ${satir + 1}`;
}

/** Dolu ama okunamayan sayısal hücreler */
export function hataliHucreler(tablo: VeriTablosu): { satir: number; sutun: number }[] {
  const sonuc: { satir: number; sutun: number }[] = [];
  tablo.satirlar.forEach((r, i) => {
    tablo.sutunlar.forEach((s, j) => {
      if (s.tur !== 'sayi') return;
      const metin = r.hucreler[j] ?? '';
      if (metin.trim() !== '' && sayiOku(metin) === null) sonuc.push({ satir: i, sutun: j });
    });
  });
  return sonuc;
}

// ── Yapıştırma ────────────────────────────────────────────────────────────────

function satirlaraBol(metin: string): string[] {
  const satirlar = metin.replace(/\r\n?/g, '\n').split('\n');
  while (satirlar.length > 0 && satirlar[satirlar.length - 1].trim() === '') satirlar.pop();
  return satirlar;
}

/**
 * Excel / Sheets'ten yapıştırılan metni hücre ızgarasına ayırır.
 * Ayırıcı önceliği: sekme > noktalı virgül > virgül. Virgül yalnız gerçekten sütun ayırıcıysa
 * kullanılır: her satırda ≥ 2 virgül varsa, ya da tek virgüllü satırlarda parçalardan biri
 * metinse ya da nokta ondalıklıysa. "3,5" tek başına ondalık sayı kalır.
 */
export function yapistirmayiAyristir(metin: string): string[][] {
  const satirlar = satirlaraBol(metin);
  if (satirlar.length === 0) return [];
  let ayirici: string | null = null;
  if (satirlar.some((s) => s.includes('\t'))) ayirici = '\t';
  else if (satirlar.some((s) => s.includes(';'))) ayirici = ';';
  else if (satirlar.some((s) => s.includes(','))) {
    const virgulSayilari = satirlar.map((s) => (s.match(/,/g) ?? []).length);
    const hepsiCok = virgulSayilari.every((n) => n >= 2);
    const metinselParca = satirlar.some((s) => s.split(',').some((p) => p.trim() !== '' && sayiOku(p) === null));
    const noktaOndalik = satirlar.some((s) => /\d\.\d/.test(s));
    if (hepsiCok || metinselParca || noktaOndalik) ayirici = ',';
  }
  return satirlar.map((s) => (ayirici ? s.split(ayirici) : [s]).map((p) => p.trim()));
}

/** Izgarayı (satir, sutun) konumundan başlayarak yazar; gerekirse satır/sütun ekler */
export function yapistir(tablo: VeriTablosu, satir: number, sutun: number, izgara: string[][]): VeriTablosu {
  let sonuc = tablo;
  const gerekenSutun = sutun + Math.max(0, ...izgara.map((r) => r.length));
  while (sonuc.sutunlar.length < gerekenSutun) sonuc = sutunEkle(sonuc);
  const gerekenSatir = satir + izgara.length;
  while (sonuc.satirlar.length < gerekenSatir) sonuc = satirEkle(sonuc);
  izgara.forEach((r, i) => {
    r.forEach((h, j) => {
      sonuc = hucreYaz(sonuc, satir + i, sutun + j, h);
    });
  });
  return sonuc;
}

/** İlk satır başlık mı? Etiket dışındaki hücrelerden en az biri sayı değilse başlıktır */
export function baslikSatiriMi(izgara: string[][]): boolean {
  if (izgara.length < 2) return false;
  const ilk = izgara[0];
  if (ilk.length < 2) return false;
  return ilk.slice(1).some((h) => h.trim() !== '' && sayiOku(h) === null);
}

/** Tüm tabloyu yapıştırılan ızgaradan kurar (başlık algılanırsa sütun adı olur) */
export function izgaradanTablo(izgara: string[][]): VeriTablosu {
  if (izgara.length === 0) return bosTablo();
  const genislik = Math.max(...izgara.map((r) => r.length), 1);
  const baslikVar = baslikSatiriMi(izgara);
  const basliklar = Array.from({ length: genislik }, (_, i) => {
    const ham = baslikVar ? izgara[0][i]?.trim() : '';
    if (ham) return ham;
    return i === 0 ? 'Etiket' : `Değişken ${i}`;
  });
  const govde = (baslikVar ? izgara.slice(1) : izgara).map((r) => Array.from({ length: genislik }, (_, i) => r[i] ?? ''));
  return tabloOlustur(basliklar, govde, metinSutunlari(govde));
}

/**
 * Yapıştırılan ızgarada kategorik sütunlar: ilk sütun dışında, dolu hücrelerinin hiçbiri sayı okunmayan
 * (en az iki dolu hücreli) sütun etiket türünde açılır — "Sınıf: A / B" gibi sütunlar kırmızı "hatalı" hücre olmaz.
 */
export function metinSutunlari(hucreler: string[][]): (SutunTuru | undefined)[] {
  const genislik = Math.max(0, ...hucreler.map((r) => r.length));
  return Array.from({ length: genislik }, (_, i) => {
    if (i === 0) return undefined;
    const dolu = hucreler.map((r) => (r[i] ?? '').trim()).filter((h) => h !== '');
    return dolu.length >= 2 && dolu.every((h) => sayiOku(h) === null) ? 'etiket' : undefined;
  });
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function csvHucre(metin: string, ayirici: string): string {
  if (metin.includes('"') || metin.includes(ayirici) || /[\r\n]/.test(metin)) {
    return `"${metin.replace(/"/g, '""')}"`;
  }
  return metin;
}

/** Noktalı virgül ayrılmış CSV (Türkçe Excel varsayılanı; ondalık virgül korunur) */
export function csvUret(tablo: VeriTablosu, ayirici = ';'): string {
  const satirlar = [tablo.sutunlar.map((s) => csvHucre(s.ad, ayirici)).join(ayirici)];
  for (const r of tablo.satirlar) {
    satirlar.push(r.hucreler.map((h) => csvHucre(h, ayirici)).join(ayirici));
  }
  return satirlar.join('\r\n');
}

// ── Hücre gezinti ─────────────────────────────────────────────────────────────

export type GezintiYonu = 'enter' | 'tab' | 'shift-tab' | 'yukari' | 'asagi';

export interface HucreKonumu {
  satir: number;
  sutun: number;
}

/** Enter: aynı sütunda bir alt satır; Tab: sağ (satır sonunda bir alt satırın başı) */
export function sonrakiHucre(konum: HucreKonumu, yon: GezintiYonu, satirSayisi: number, sutunSayisi: number): HucreKonumu | null {
  const { satir, sutun } = konum;
  switch (yon) {
    case 'enter':
    case 'asagi':
      return satir + 1 < satirSayisi ? { satir: satir + 1, sutun } : null;
    case 'yukari':
      return satir > 0 ? { satir: satir - 1, sutun } : null;
    case 'tab':
      if (sutun + 1 < sutunSayisi) return { satir, sutun: sutun + 1 };
      return satir + 1 < satirSayisi ? { satir: satir + 1, sutun: 0 } : null;
    case 'shift-tab':
      if (sutun > 0) return { satir, sutun: sutun - 1 };
      return satir > 0 ? { satir: satir - 1, sutun: sutunSayisi - 1 } : null;
    default:
      return null;
  }
}

// ── Örnek veriler ─────────────────────────────────────────────────────────────
// Her örnek bir ortaokul veri konusunu öğretmek için tasarlandı: sayılar elde hesaplanabilir (tam ortalama,
// tam medyan, "güzel" merkez açılar) ve grafikte anlatılmak istenen biçim (çan eğrisi, sağa çarpıklık,
// uç değer, pozitif / negatif ilişki) açıkça görünür.

/** Uygulamadaki grafik türleri (durum.ts'teki sekmeler bununla aynıdır) */
export type GrafikTuru = 'nokta' | 'sutun' | 'cizgi' | 'daire' | 'sacilim' | 'istatistik';

/** Örnek verilerin konu başlıkları: menüde bu sırayla kümelenir (ortaokul veri konularının sırası) */
export const ORNEK_KONULARI = [
  { id: 'kategorik', ad: 'Sıklık tablosu, sütun ve daire grafiği' },
  { id: 'dagilim', ad: 'Nokta grafiği, ortalama ve sapma' },
  { id: 'zaman', ad: 'Çizgi grafiği: zaman içinde değişim' },
  { id: 'iliski', ad: 'Saçılım grafiği: iki değişkenin ilişkisi' },
] as const;

export type OrnekKonusu = (typeof ORNEK_KONULARI)[number]['id'];

export interface OrnekVeri {
  id: string;
  ad: string;
  konu: OrnekKonusu;
  /** Verinin neyi öğrettiği (menüde adın altında; yüklenince kısa bildirim olarak) */
  aciklama: string;
  olustur: () => VeriTablosu;
  /** Örnek belirli bir grafik için hazırlandıysa yüklenince o grafik açılır */
  onerilenGrafik?: GrafikTuru;
  /** Yüklenince eksene gelecek değişken (sütun adı; verilmezse ilk sayısal, yoksa ilk kategorik) */
  varsayilanDegisken?: string;
  /** Yüklenince karşılaştırma paneline gelecek ikinci değişken (sütun adı) */
  karsilastir?: string;
  /** Yüklenince renk anahtarı olacak kategorik değişken (sütun adı; verilmezse ilk kategorik) */
  renkDegisken?: string;
}

export const ORNEK_VERILER: OrnekVeri[] = [
  // ── Kategorik veri: sıklık tablosu, sütun ve daire grafiği ────────────────────
  {
    // Her satır bir öğrencinin cevabı; 24 cevapta her sayı 15°'nin katı olur (Elma 7 → 105°, Karpuz 2 → 30°)
    id: 'meyve',
    ad: 'En sevilen meyve',
    konu: 'kategorik',
    onerilenGrafik: 'sutun',
    aciklama: '24 öğrencinin cevabı: sıklık tablosu, sütun ve daire grafiği; en çok seçilen tepe değerdir.',
    olustur: () =>
      tabloOlustur(
        ['Meyve'],
        ['Elma', 'Muz', 'Çilek', 'Elma', 'Portakal', 'Çilek', 'Elma', 'Muz', 'Karpuz', 'Çilek', 'Elma', 'Portakal', 'Muz', 'Çilek', 'Elma', 'Karpuz', 'Portakal', 'Elma', 'Muz', 'Çilek', 'Portakal', 'Elma', 'Muz', 'Çilek'].map((m) => [m]),
      ),
  },
  {
    // Bir bütünün parçaları: 24 saat = 360°, her saat 15° (Uyku 9 saat → 135°, Yemek 1,5 saat → 22,5°)
    id: 'gun',
    ad: 'Bir günün saatleri',
    konu: 'kategorik',
    aciklama: '24 saat = 360°, her saat 15°: dilimlerin merkez açılarını ve yüzdelerini karşılaştırın; sınırı sürükleyin.',
    onerilenGrafik: 'daire',
    olustur: () =>
      tabloOlustur(
        ['Etkinlik', 'Süre (saat)'],
        [
          ['Uyku', 9],
          ['Okul', 7],
          ['Ders çalışma', 2],
          ['Oyun', 2.5],
          ['Yemek', 1.5],
          ['Diğer', 2],
        ],
      ),
  },
  {
    // İki kategorik değişken (Sınıf × En sevdiği ders): 5-A ve 5-B'de 12'şer öğrenci; toplamlar 15°'nin katı
    // (Beden Eğitimi 7 → 105°, Sosyal Bilgiler 2 → 30°). Renk anahtarı Sınıf: yığılmış sütun, halkalı daire, iki yönlü tablo.
    id: 'ders',
    ad: 'En sevilen ders (5-A ve 5-B)',
    konu: 'kategorik',
    onerilenGrafik: 'sutun',
    aciklama: 'İki kategorik değişken: sınıfa göre yığılmış sütunlar ve İstatistik sekmesinde iki yönlü tablo.',
    varsayilanDegisken: 'En sevdiği ders',
    renkDegisken: 'Sınıf',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Sınıf', 'En sevdiği ders'],
        [
          ['Ali', '5-A', 'Matematik'],
          ['Ayşe', '5-A', 'Fen Bilimleri'],
          ['Barış', '5-A', 'Beden Eğitimi'],
          ['Ceyda', '5-A', 'Matematik'],
          ['Çağla', '5-A', 'Türkçe'],
          ['Damla', '5-B', 'Matematik'],
          ['Emir', '5-B', 'Fen Bilimleri'],
          ['Eylül', '5-B', 'Beden Eğitimi'],
          ['Fırat', '5-A', 'Matematik'],
          ['Gül', '5-B', 'Türkçe'],
          ['Halil', '5-A', 'Fen Bilimleri'],
          ['Hazal', '5-B', 'Türkçe'],
          ['İsmail', '5-A', 'Beden Eğitimi'],
          ['Kerem', '5-B', 'Beden Eğitimi'],
          ['Lina', '5-B', 'Sosyal Bilgiler'],
          ['Metin', '5-B', 'Beden Eğitimi'],
          ['Nisa', '5-A', 'Matematik'],
          ['Okan', '5-B', 'Matematik'],
          ['Öykü', '5-B', 'Türkçe'],
          ['Rüya', '5-A', 'Fen Bilimleri'],
          ['Selim', '5-A', 'Sosyal Bilgiler'],
          ['Şevval', '5-B', 'Fen Bilimleri'],
          ['Taha', '5-A', 'Beden Eğitimi'],
          ['Zehra', '5-B', 'Beden Eğitimi'],
        ],
        [undefined, 'etiket', 'etiket'],
      ),
  },

  // ── Nokta grafiği, ortalama ve sapma ──────────────────────────────────────────
  {
    // 20 öğrenci, 0–6 kitap: 3 kitap en sık (tepe değer 3), medyan 3, ortalama 2,7 (toplam 54)
    id: 'kitap',
    ad: 'Bir ayda okunan kitap sayısı',
    konu: 'dagilim',
    onerilenGrafik: 'nokta',
    aciklama: 'Noktalar aynı değerde yığılır: tepe değeri, medyanı ve ortalamayı bulup karşılaştırın.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Kitap sayısı'],
        [
          ['Ada', 3],
          ['Bora', 5],
          ['Ceren', 2],
          ['Deniz', 4],
          ['Ege', 3],
          ['Fatma', 6],
          ['Gökçe', 3],
          ['Hakan', 1],
          ['Işıl', 2],
          ['Kuzey', 3],
          ['Leyla', 0],
          ['Mina', 2],
          ['Naz', 4],
          ['Oğuz', 1],
          ['Pelin', 3],
          ['Rüzgar', 2],
          ['Sude', 4],
          ['Tuna', 1],
          ['Umut', 3],
          ['Yağmur', 2],
        ],
      ),
  },
  {
    // 24 öğrenci, 152 cm çevresinde simetrik (çan biçimli) dağılım: ortalama = medyan = tepe değer = 152,
    // ortalama mutlak sapma tam 2,5 cm, açıklık 14 cm
    id: 'boy',
    ad: 'Sınıfın boy uzunlukları (cm)',
    konu: 'dagilim',
    onerilenGrafik: 'nokta',
    aciklama: 'Çan biçimli dağılım: Ortalama ve Ortalama mutlak sapma düğmelerini açın, sapma çizgilerini izleyin.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Boy (cm)'],
        [
          ['Ayşe', 152],
          ['Mehmet', 158],
          ['Zeynep', 149],
          ['Ali', 151],
          ['Elif', 155],
          ['Can', 146],
          ['Defne', 152],
          ['Emre', 159],
          ['Selin', 150],
          ['Kerem', 153],
          ['Nehir', 148],
          ['Yusuf', 154],
          ['Ece', 152],
          ['Burak', 145],
          ['Lale', 151],
          ['Mert', 156],
          ['Derya', 153],
          ['Onur', 150],
          ['İrem', 155],
          ['Tolga', 149],
          ['Melis', 154],
          ['Arda', 152],
          ['Duru', 153],
          ['Kaan', 151],
        ],
      ),
  },
  {
    // Sağa çarpık dağılım ve uç değer: 15 öğrenci, biri (Feyza) uzaktan servisle 60 dakika.
    // Ortalama 16 > medyan 12 > tepe değer 10; uç değer çıkarılınca ortalama 12,9'a iner, medyan 11 olur.
    id: 'ulasim',
    ad: 'Okula ulaşım süresi (dakika)',
    konu: 'dagilim',
    onerilenGrafik: 'nokta',
    aciklama: 'Uç değer (60 dk) ortalamayı çeker, medyanı pek etkilemez: o satırı silip ölçülere yeniden bakın.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Süre (dk)'],
        [
          ['Ahmet', 10],
          ['Buse', 15],
          ['Cem', 5],
          ['Dilara', 20],
          ['Efe', 10],
          ['Feyza', 60],
          ['Giray', 8],
          ['Hande', 12],
          ['İlker', 15],
          ['Kübra', 10],
          ['Levent', 25],
          ['Merve', 5],
          ['Nazlı', 20],
          ['Ozan', 15],
          ['Pınar', 10],
        ],
      ),
  },
  {
    // Ders kitabındaki örnek: iki oyuncunun ortalaması aynı (17), ortalama mutlak sapmaları farklı (6,4 ve 1,2)
    id: 'mac',
    ad: 'Basketbol: Selma ve Yasemin',
    konu: 'dagilim',
    onerilenGrafik: 'nokta',
    aciklama: 'Aynı ortalama (17), farklı sapma: karşılaştırma panellerinde kimin daha istikrarlı olduğunu görün.',
    karsilastir: 'Yasemin',
    olustur: () =>
      tabloOlustur(
        ['Maç', 'Selma', 'Yasemin'],
        [
          ['1. maç', 18, 17],
          ['2. maç', 5, 15],
          ['3. maç', 32, 19],
          ['4. maç', 17, 16],
          ['5. maç', 13, 18],
        ],
      ),
  },

  // ── Çizgi grafiği: zaman içinde değişim ───────────────────────────────────────
  {
    // Zaman serisi: mevsimlere göre yükselip alçalan sıcaklık (tepe Temmuz)
    id: 'sicaklik',
    ad: 'Bir ilin aylık ortalama sıcaklığı (°C)',
    konu: 'zaman',
    aciklama: 'Aylara göre iniş çıkış: bir noktayı sürükleyin, komşu aylara göre değişim (Δ ve %) etikette yazar.',
    onerilenGrafik: 'cizgi',
    olustur: () =>
      tabloOlustur(
        ['Ay', 'Sıcaklık (°C)'],
        [
          ['Ocak', 4.5],
          ['Şubat', 5.5],
          ['Mart', 8.5],
          ['Nisan', 13],
          ['Mayıs', 18],
          ['Haziran', 23],
          ['Temmuz', 26.5],
          ['Ağustos', 26],
          ['Eylül', 22],
          ['Ekim', 16],
          ['Kasım', 10.5],
          ['Aralık', 6],
        ],
      ),
  },
  {
    // Büyüme eğrisi: haftalık artış 3, 4, 5, 4, 3, 2, 1 cm — önce hızlanır sonra yavaşlar
    id: 'fide',
    ad: 'Fasulye fidesinin boyu (cm)',
    konu: 'zaman',
    aciklama: '8 haftalık büyüme: artış önce hızlanır, sonra yavaşlar; Δ ve yüzde değişimi okuyun.',
    onerilenGrafik: 'cizgi',
    olustur: () =>
      tabloOlustur(
        ['Hafta', 'Boy (cm)'],
        [
          ['1. hafta', 2],
          ['2. hafta', 5],
          ['3. hafta', 9],
          ['4. hafta', 14],
          ['5. hafta', 18],
          ['6. hafta', 21],
          ['7. hafta', 23],
          ['8. hafta', 24],
        ],
      ),
  },

  // ── Saçılım grafiği: iki değişkenin ilişkisi ──────────────────────────────────
  {
    // Saçılım için eşleştirilmiş veri: her satır aynı ünite sınavı, iki sayı o sınavda iki sınıfın ortalaması.
    // (İki sınıfın öğrencileri satır satır eşleşmez; eşleştiren şey ortak sınavdır.) Zor ünitelerde iki sınıf
    // birlikte düşer: noktalar sol alttan sağ üste uzanır (pozitif ilişki).
    id: 'sinif',
    ad: 'A ve B sınıfının ünite sınavı ortalamaları',
    konu: 'iliski',
    aciklama: 'Her nokta bir ünite sınavı: iki sınıf birlikte yükselip düşer, noktalar sol alttan sağ üste dizilir.',
    onerilenGrafik: 'sacilim',
    olustur: () =>
      tabloOlustur(
        ['Ünite sınavı', 'A sınıfı ortalaması', 'B sınıfı ortalaması'],
        [
          ['Tam sayılar', 78, 74],
          ['Rasyonel sayılar', 64, 61],
          ['Cebirsel ifadeler', 58, 52],
          ['Eşitlik ve denklem', 55, 57],
          ['Oran ve orantı', 72, 66],
          ['Yüzdeler', 81, 76],
          ['Doğrular ve açılar', 69, 71],
          ['Çokgenler', 74, 68],
          ['Çember ve daire', 62, 59],
          ['Veri analizi', 86, 80],
        ],
      ),
  },
  {
    // Her satır bir öğrenci; Sınıf kategorik sütunu renk anahtarıdır: A ve B sınıfı aynı saçılımda iki renkle.
    // Çalışma arttıkça puan artar (pozitif ilişki), A sınıfı biraz önde.
    id: 'calisma',
    ad: 'Haftalık çalışma süresi ve matematik puanı',
    konu: 'iliski',
    aciklama: 'Çalışma arttıkça puan artar; A ve B sınıfı aynı grafikte renklerle, İstatistik sekmesinde gruplara göre.',
    onerilenGrafik: 'sacilim',
    renkDegisken: 'Sınıf',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Sınıf', 'Haftalık çalışma (saat)', 'Matematik puanı'],
        [
          ['Aylin', 'A', 2, 55],
          ['Berk', 'A', 3, 61],
          ['Cansu', 'A', 4, 62],
          ['Doruk', 'A', 5, 69],
          ['Esra', 'A', 6, 70],
          ['Furkan', 'A', 6, 75],
          ['Gizem', 'A', 7, 78],
          ['Hasan', 'A', 8, 81],
          ['İpek', 'A', 9, 86],
          ['Kağan', 'A', 10, 90],
          ['Lara', 'B', 1, 47],
          ['Mustafa', 'B', 2, 51],
          ['Nil', 'B', 3, 58],
          ['Orhan', 'B', 4, 56],
          ['Pamir', 'B', 5, 63],
          ['Rana', 'B', 6, 64],
          ['Serkan', 'B', 7, 70],
          ['Tuğçe', 'B', 8, 72],
          ['Ufuk', 'B', 9, 76],
          ['Yeliz', 'B', 10, 82],
        ],
        [undefined, 'etiket'],
      ),
  },
  {
    // Negatif ilişki: hava ısındıkça sıcak çikolata satışı düşer (günler karışık sırada, ilişki saçılımda ortaya çıkar)
    id: 'cikolata',
    ad: 'Hava sıcaklığı ve sıcak çikolata satışı',
    konu: 'iliski',
    aciklama: 'Sıcaklık arttıkça satış azalır: noktalar sol üstten sağ alta iner (negatif ilişki).',
    onerilenGrafik: 'sacilim',
    olustur: () =>
      tabloOlustur(
        ['Gün', 'Sıcaklık (°C)', 'Satış (bardak)'],
        [
          ['1. gün', 4, 52],
          ['2. gün', 9, 43],
          ['3. gün', 2, 58],
          ['4. gün', 13, 31],
          ['5. gün', 7, 44],
          ['6. gün', 17, 24],
          ['7. gün', 11, 36],
          ['8. gün', 21, 17],
          ['9. gün', 5, 50],
          ['10. gün', 15, 30],
          ['11. gün', 24, 12],
          ['12. gün', 19, 20],
        ],
      ),
  },
];

/** Örnekler konu başlıklarına göre (menü sırası) */
export function ornekKonulari(): { id: OrnekKonusu; ad: string; ornekler: OrnekVeri[] }[] {
  return ORNEK_KONULARI.map((k) => ({ id: k.id, ad: k.ad, ornekler: ORNEK_VERILER.filter((o) => o.konu === k.id) }));
}

export function ornekVeriOlustur(id: string): VeriTablosu {
  const ornek = ORNEK_VERILER.find((o) => o.id === id) ?? ORNEK_VERILER[0];
  return ornek.olustur();
}

/** localStorage'dan gelen nesnenin tablo olup olmadığını denetler (bozuk veri → null) */
export function tabloDogrula(ham: unknown): VeriTablosu | null {
  if (!ham || typeof ham !== 'object') return null;
  const t = ham as Partial<VeriTablosu>;
  if (!Array.isArray(t.sutunlar) || !Array.isArray(t.satirlar) || t.sutunlar.length === 0) return null;
  const sutunlar: Sutun[] = [];
  for (const s of t.sutunlar) {
    if (!s || typeof s !== 'object' || typeof (s as Sutun).id !== 'string' || typeof (s as Sutun).ad !== 'string') return null;
    sutunlar.push({ id: (s as Sutun).id, ad: (s as Sutun).ad, tur: (s as Sutun).tur === 'etiket' ? 'etiket' : 'sayi' });
  }
  sutunlar[0].tur = 'etiket';
  const satirlar: Satir[] = [];
  for (const r of t.satirlar) {
    if (!r || typeof r !== 'object' || typeof (r as Satir).id !== 'string' || !Array.isArray((r as Satir).hucreler)) return null;
    const hucreler = sutunlar.map((_, i) => {
      const h = (r as Satir).hucreler[i];
      return typeof h === 'string' ? h : typeof h === 'number' ? sayiYaz(h, 6) : '';
    });
    satirlar.push({ id: (r as Satir).id, hucreler });
  }
  return { sutunlar, satirlar };
}
