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

/** Başlıklar + satır dizilerinden tablo kurar; ilk sütun etiket, diğerleri sayısal */
export function tabloOlustur(basliklar: string[], satirlar: (string | number)[][]): VeriTablosu {
  const sutunlar: Sutun[] = basliklar.map((ad, i) => ({
    id: kimlikUret('s'),
    ad,
    tur: i === 0 ? 'etiket' : 'sayi',
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
  const govde = baslikVar ? izgara.slice(1) : izgara;
  return tabloOlustur(basliklar, govde.map((r) => Array.from({ length: genislik }, (_, i) => r[i] ?? '')));
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

/** Uygulamadaki grafik türleri (durum.ts'teki sekmeler bununla aynıdır) */
export type GrafikTuru = 'nokta' | 'sutun' | 'cizgi' | 'daire' | 'sacilim' | 'istatistik';

export interface OrnekVeri {
  id: string;
  ad: string;
  olustur: () => VeriTablosu;
  /** Örnek belirli bir grafik için hazırlandıysa yüklenince o grafik açılır */
  onerilenGrafik?: GrafikTuru;
}

export const ORNEK_VERILER: OrnekVeri[] = [
  {
    id: 'boy',
    ad: 'Öğrencilerin boy uzunlukları (cm)',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Boy (cm)'],
        [
          ['Ayşe', 152],
          ['Mehmet', 158],
          ['Zeynep', 149],
          ['Ali', 161],
          ['Elif', 155],
          ['Can', 158],
          ['Defne', 152],
          ['Emre', 164],
          ['Selin', 150],
          ['Kerem', 158],
          ['Nehir', 146],
          ['Yusuf', 155],
        ],
      ),
  },
  {
    id: 'mac',
    ad: 'Maçta atılan sayılar (Selma / Yasemin)',
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
  {
    id: 'sicaklik',
    ad: 'Aylık sıcaklık (°C)',
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
    id: 'kitap',
    ad: 'Okunan kitap sayısı (aylık)',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Kitap'],
        [
          ['Ada', 3],
          ['Bora', 5],
          ['Ceren', 2],
          ['Deniz', 4],
          ['Ege', 3],
          ['Fatma', 6],
          ['Gökçe', 3],
          ['Hakan', 1],
        ],
      ),
  },
  {
    // Saçılım için eşleştirilmiş veri: her satır aynı ünite sınavı, iki sayı o sınavda iki sınıfın ortalaması.
    // (İki sınıfın öğrencileri satır satır eşleşmez; eşleştiren şey ortak sınavdır.) Zor ünitelerde iki sınıf
    // birlikte düşer: noktalar sol alttan sağ üste uzanır (pozitif ilişki).
    id: 'sinif',
    ad: 'A ve B sınıfı matematik sınav ortalamaları (saçılım için)',
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
    // Saçılım + kategoriye göre renk: her satır bir öğrenci. İlk sütun (Sınıf) tekrar ettiği için kategoriktir;
    // saçılımda A ve B sınıfı aynı grafikte iki renkle görünür. Çalışma arttıkça puan artar, A sınıfı biraz önde.
    id: 'calisma',
    ad: 'A ve B sınıfı: çalışma süresi ve matematik puanı (saçılım, renkli)',
    onerilenGrafik: 'sacilim',
    olustur: () =>
      tabloOlustur(
        ['Sınıf', 'Haftalık çalışma (saat)', 'Matematik puanı'],
        [
          ['A', 2, 55],
          ['A', 3, 61],
          ['A', 4, 62],
          ['A', 5, 69],
          ['A', 6, 70],
          ['A', 6, 75],
          ['A', 7, 78],
          ['A', 8, 81],
          ['A', 9, 86],
          ['A', 10, 90],
          ['B', 1, 47],
          ['B', 2, 51],
          ['B', 3, 58],
          ['B', 4, 56],
          ['B', 5, 63],
          ['B', 6, 64],
          ['B', 7, 70],
          ['B', 8, 72],
          ['B', 9, 76],
          ['B', 10, 82],
        ],
      ),
  },
  {
    // Daire grafiği için bir bütünün parçaları: toplam 24 saat = 360°, 1 saat = 15°
    id: 'gun',
    ad: 'Bir günün saatleri (daire grafiği için)',
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
    // Kategorik veri: her satır bir öğrencinin cevabı (sıklık tablosu, sütun ve daire grafiği)
    id: 'meyve',
    ad: 'En sevilen meyve (kategorik veri)',
    olustur: () =>
      tabloOlustur(
        ['Meyve'],
        ['Elma', 'Muz', 'Çilek', 'Elma', 'Portakal', 'Çilek', 'Elma', 'Muz', 'Karpuz', 'Çilek', 'Elma', 'Portakal', 'Muz', 'Çilek', 'Elma', 'Karpuz', 'Portakal', 'Elma', 'Muz', 'Çilek', 'Portakal', 'Elma', 'Muz', 'Çilek'].map((m) => [m]),
      ),
  },
];

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
