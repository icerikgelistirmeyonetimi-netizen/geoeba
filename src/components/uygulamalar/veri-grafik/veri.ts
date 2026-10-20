/**
 * Veri ve Grafik — tablo modeli (saf, React'siz).
 * Satırlar gözlem, sütunlar değişken; ilk sütun etiket (metin), diğerleri sayısal. İstisna: veri toplama (araştırma)
 * tablolarında ilk sütun sayısal olabilir (ölçüm değeri, sayı küpü); türü değiştirilemez ve kayıttan öyle okunur.
 * Hücreler ham metin olarak tutulur (ondalık virgül kabul); sayısal okuma sayiOku ile yapılır,
 * okunamayan hücre "hatalı" sayılır ve grafiklerde atlanır (uygulama çökmez, uyarı gösterir).
 * Dosyanın sonunda örnek veriler durur: her örneğin hikâyesi, kaynağı, sınıf düzeyi, kazanımı ve 4 adımlı rehberi.
 */
// kategorik.ts veri'den yalnız tür alır: çalışma anında içe aktarma döngüsü yok
import { arastirmaSutunRolu } from './kategorik';
import type { KademeDuzeyi } from '@/components/workspace/kademeDuzeyleri';

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

/**
 * "3,5" / "3.5" / "1.234,5" / " 12 " / "%50" / "45%" / "−3,5" → sayı; boş ya da okunamayan → null.
 * Yüzde işareti başta (Türkçe yazım: %50) ya da sonda olabilir; Unicode eksi (−, U+2212) tire gibi okunur.
 */
export function sayiOku(metin: string | number | null | undefined): number | null {
  if (typeof metin === 'number') return Number.isFinite(metin) ? metin : null;
  if (metin === null || metin === undefined) return null;
  let m = metin.trim().replace(/\s+/g, '').replace(/−/g, '-');
  if (m.startsWith('%')) m = m.slice(1);
  else if (m.endsWith('%')) m = m.slice(0, -1);
  if (m === '') return null;
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

/**
 * Sayı → Türkçe metin: ondalık virgül, en çok `maxOndalik` basamak, sondaki sıfırlar atılır; -0 → "0".
 * Yarımlar sıfırdan uzağa yuvarlanır (2,275 → "2,28"; 1,005 → "1,01"; −2,275 → "-2,28"). Bilgisayarda
 * 2,275 × 100 = 227,4999… çıktığı için ölçekli değer önce 12 anlamlı basamağa temizlenir, sonra yuvarlanır;
 * toFixed doğrudan kullanılsaydı 2,27 yazardı.
 */
export function sayiYaz(sayi: number, maxOndalik = 2): string {
  if (!Number.isFinite(sayi)) return '';
  const d = Math.min(12, Math.max(0, Math.round(maxOndalik)));
  const olcekli = Math.abs(sayi) * 10 ** d;
  // Tam kısmı 11 basamaktan uzun değerlerde 12 anlamlı basamak tam kısmı keserdi; onlar olduğu gibi yuvarlanır
  const temiz = olcekli < 1e11 ? Number(olcekli.toPrecision(12)) : olcekli;
  const tam = Math.round(temiz);
  if (tam === 0) return '0';
  if (!Number.isSafeInteger(tam)) return String(Math.round(sayi)); // çok büyük değer: ondalık anlamsız
  const rakamlar = String(tam).padStart(d + 1, '0');
  const tamKisim = rakamlar.slice(0, rakamlar.length - d);
  const ondalik = rakamlar.slice(rakamlar.length - d).replace(/0+$/, '');
  return `${sayi < 0 ? '-' : ''}${tamKisim}${ondalik ? `,${ondalik}` : ''}`;
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
  const satirlar = metin.split('\n');
  while (satirlar.length > 0 && satirlar[satirlar.length - 1].trim() === '') satirlar.pop();
  return satirlar;
}

const ALAN_AYIRICILARI: ReadonlySet<string> = new Set(['\t', ';', ',']);

/** `acilis`taki tırnağı kapatan tırnağın konumu ("" kaçışı atlanır); kapanmıyorsa -1 */
function tirnakSonu(metin: string, acilis: number): number {
  for (let i = acilis + 1; i < metin.length; i += 1) {
    if (metin[i] !== '"') continue;
    if (metin[i + 1] === '"') i += 1;
    else return i;
  }
  return -1;
}

/**
 * Ayırıcı sezgisi için tırnaklı alanların içi tek bir 'x' olur: "Kaya, Ali" içindeki virgül, noktalı virgül,
 * sekme ya da satır sonu sütun ya da satır sayılmaz. Alan başı: satır başı ya da bir ayırıcıdan sonra (boşluklar atlanır).
 */
function tirnaklariMaskele(metin: string): string {
  let sonuc = '';
  let alanBasi = true;
  let i = 0;
  while (i < metin.length) {
    const c = metin[i];
    if (c === '"' && alanBasi) {
      const son = tirnakSonu(metin, i);
      if (son >= 0) {
        sonuc += 'x';
        alanBasi = false;
        i = son + 1;
        continue;
      }
    }
    sonuc += c;
    if (c === '\n' || ALAN_AYIRICILARI.has(c)) alanBasi = true;
    else if (c !== ' ') alanBasi = false;
    i += 1;
  }
  return sonuc;
}

/**
 * Metni verilen ayırıcıyla alanlara böler; CSV tırnaklarını çözer: alan başındaki "…" bir bütündür, içindeki
 * ayırıcı ve satır sonu bölmez, "" tek tırnak olur ("Kaya, Ali";155 → Kaya, Ali | 155). Kapanmayan tırnak düz metindir.
 */
function alanlaraAyir(metin: string, ayirici: string | null): string[][] {
  const kayitlar: string[][] = [];
  let kayit: string[] = [];
  let alan = '';
  let alanBasi = true;
  const alaniBitir = () => {
    kayit.push(alan.trim());
    alan = '';
    alanBasi = true;
  };
  let i = 0;
  while (i < metin.length) {
    const c = metin[i];
    if (alanBasi && c === '"') {
      const son = tirnakSonu(metin, i);
      if (son >= 0) {
        // Tırnak içindeki satır sonu tablo hücresinde boşluk olur (hücreler tek satırdır)
        alan = metin.slice(i + 1, son).replace(/""/g, '"').replace(/\s*\n\s*/g, ' ');
        alanBasi = false;
        i = son + 1;
        continue;
      }
    }
    if (ayirici !== null && c === ayirici) alaniBitir();
    else if (c === '\n') {
      alaniBitir();
      kayitlar.push(kayit);
      kayit = [];
    } else {
      alan += c;
      if (c !== ' ') alanBasi = false;
    }
    i += 1;
  }
  alaniBitir();
  kayitlar.push(kayit);
  while (kayitlar.length > 0 && kayitlar[kayitlar.length - 1].every((h) => h === '')) kayitlar.pop();
  return kayitlar;
}

/**
 * Excel / Sheets'ten yapıştırılan metni hücre ızgarasına ayırır.
 * Ayırıcı önceliği: sekme > noktalı virgül > virgül. Virgül yalnız gerçekten sütun ayırıcıysa
 * kullanılır: her satırda ≥ 2 virgül varsa, ya da tek virgüllü satırlarda parçalardan biri
 * metinse ya da nokta ondalıklıysa. "3,5" tek başına ondalık sayı kalır.
 * CSV tırnakları çözülür: tırnak içindeki ayırıcılar sezgide sayılmaz ve alanı bölmez.
 */
export function yapistirmayiAyristir(metin: string): string[][] {
  const duz = metin.replace(/\r\n?/g, '\n');
  const satirlar = satirlaraBol(tirnaklariMaskele(duz));
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
  return alanlaraAyir(duz, ayirici);
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
// Her örnek bir ortaokul veri konusunu öğretmek için tasarlandı (sınıf düzeyi ve kazanım koduyla). Her birinin
// araştırma sorusu, kim / ne zaman / nasıl toplandığı ve kaynağı var; gerçek veriler (MGM sıcaklıkları) bağlantılı,
// ötekiler açıkça kurgusal ama gerçekçi aralıkta. Sayılar elde hesaplanabilir (tam ortalama, tam ortanca, tam
// sayı merkez açılar), grafikte anlatılmak istenen biçim açıkça görünür. Öğrenci metinleri ders kitabı terimlerini
// kullanır (ortanca, sıklık, tepe değer, aritmetik ortalama, ortalama mutlak sapma, açıklık); formül simgesi yok.
// Rehber cevaplarındaki ve açıklamalardaki sayısal iddialar __tests__/veri.test.ts ve rehber.test.ts'te sınanır.

/**
 * Uygulamadaki grafik türleri (durum.ts'teki sekmeler bununla aynıdır). Kök-yaprak gösterimi yalnız 6. sınıf
 * örneklerinde görünür (sinifKurallari.ts).
 */
export type GrafikTuru = 'nokta' | 'sutun' | 'cizgi' | 'kokYaprak' | 'daire' | 'sacilim' | 'istatistik';

/**
 * Örneğin sınıf düzeyi: 1–4 ilkokul (yalnız İlkokul ve Tüm araçlar kademesinde görünür), 5–8 ortaokul, 'H' (hazırlık)
 * ve 9–12 lise (yalnız Lise ve Tüm araçlar kademesinde görünür)
 */
export type SinifDuzeyi = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'H' | 9 | 10 | 11 | 12;

/** İlkokul sınıf düzeyi mi (1–4) */
export function ilkokulSinifi(sinif: SinifDuzeyi | null | undefined): boolean {
  return sinif === 1 || sinif === 2 || sinif === 3 || sinif === 4;
}

/** Ortaokul sınıf düzeyi mi (5–8) */
export function ortaokulSinifi(sinif: SinifDuzeyi | null | undefined): boolean {
  return sinif === 5 || sinif === 6 || sinif === 7 || sinif === 8;
}

/** Lise sınıf düzeyi mi (hazırlık ve 9–12) */
export function liseSinifi(sinif: SinifDuzeyi | null | undefined): boolean {
  return sinif === 'H' || sinif === 9 || sinif === 10 || sinif === 11 || sinif === 12;
}

/** Sınıf düzeyinin adı (rozet ve galeri): "7. sınıf", hazırlıkta "Hazırlık" */
export function sinifAdi(sinif: SinifDuzeyi): string {
  return sinif === 'H' ? 'Hazırlık' : `${sinif}. sınıf`;
}

/**
 * Uygulamaya aşama aşama gelen özellikler. Bir rehber eylemi ya da metin henüz olmayan bir özelliğe dayanıyorsa
 * `gerektirir` ile işaretlidir; özellik kümesinde (C'nin OZELLIKLER'i) yoksa yedek eylem / bugünkü metin kullanılır.
 * - ortanca: nokta grafiğinde "Ortanca" düğmesi
 * - grupla: kategorik değişkene göre alt alta paneller (ortak eksen)
 * - yuzdeDegisim: çizgi değişim etiketinde yüzde, sütuna göre açılıp kapanır (°C'de yüzde yok)
 * - daireSiklik: sayısal değişkende "değerlerin sıklığı" dairesi ve "uygun değil" bilgi kutusu
 * - daireYuvarlama: daire sürüklemesinde yuvarlama adımı
 * - acilisAralik: örnek açılışında nokta grafiği grup genişliği
 * - kategoriSirasi: kategorilerin örnekte verilen sırası (alfabetik yerine)
 * - terimler: ekrandaki terimler ders kitabıyla aynı (Ortanca, Tepe değer, Sıklık …)
 * - dengele: toplamı koruyan sütun sürükleme (ertelendi)
 */
export type Ozellik =
  | 'ortanca'
  | 'grupla'
  | 'yuzdeDegisim'
  | 'daireSiklik'
  | 'daireYuvarlama'
  | 'acilisAralik'
  | 'kategoriSirasi'
  | 'terimler'
  | 'dengele';

/** Bütün özellikler (testler ve özellik kümesi için) */
export const TUM_OZELLIKLER: readonly Ozellik[] = [
  'ortanca',
  'grupla',
  'yuzdeDegisim',
  'daireSiklik',
  'daireYuvarlama',
  'acilisAralik',
  'kategoriSirasi',
  'terimler',
  'dengele',
];

/** Verinin hikâyesi: araştırma sorusu ve kim / ne zaman / nasıl topladı (Keşif kartının başı ve künyesi) */
export interface OrnekHikaye {
  arastirmaSorusu: string;
  /** 7-8. sınıfta evren / örneklem burada */
  kim: string;
  neZaman: string;
  /** Ölçme aracı, yuvarlama, anonimlik */
  nasil: string;
  n: number;
  /** Künye satırı: tek cümle */
  cumle: string;
}

export interface OrnekKaynak {
  tur: 'gercek' | 'kurgusal';
  ad: string;
  url?: string;
  url2?: string;
  /** Bağlantıların kısa adları ("Erzurum", "Adana"; "erkek", "kız"); yoksa alan adı yazılır */
  urlAd?: string;
  url2Ad?: string;
  /** Gerçek veride erişim tarihi ("24 Eylül 2026") */
  erisim?: string;
  not?: string;
}

/**
 * Rehber adımının arayüz eylemi. `satir` ilk sütundaki etiket, `sutun` sütun adıdır (kimlik değil: tablo her
 * yüklemede yeni kimlik alır). `surukle` ve `yok` düğme değildir: öğrenci kendisi yapar, etiket yol gösterir.
 */
export type RehberEylemi = (
  | { tur: 'secenek'; ac: ('ortalama' | 'ortanca' | 'oms' | 'standartSapma' | 'etiketler' | 'sutunModu')[]; etiket: string }
  | { tur: 'sekme'; sekme: GrafikTuru; etiket: string }
  | { tur: 'hucre'; satir: string; sutun: string; deger: number; etiket: string }
  | { tur: 'satirEkle'; hucreler: (string | number)[]; etiket: string }
  | { tur: 'satirVurgula'; satir: string; etiket: string }
  | { tur: 'aralik'; aralik: number; etiket: string }
  | { tur: 'surukle' | 'yok'; etiket: string }
) & { gerektirir?: Ozellik };

/** Rehberli keşfin bir adımı: Tahmin et → Grafikte bul → Aç ve ölç → Yorumla */
export interface RehberAdimi {
  tur: 'tahmin' | 'bak' | 'olc' | 'yorumla';
  baslik: string;
  soru: string;
  /** "Cevabı göster" ile açılır; puanlama yok */
  cevap: string;
  eylem: RehberEylemi | null;
  /** `eylem.gerektirir`deki özellik yokken gösterilen eylem (kendisi özelliğe bağlı olamaz) */
  yedekEylem?: RehberEylemi;
}

/** Özellik gelince bugünkü metnin yerine geçen metin */
export interface OzellikliMetin {
  metin: string;
  gerektirir: Ozellik;
}

export interface OrnekVeri {
  id: string;
  ad: string;
  konu: OrnekKonusu;
  /**
   * Kısa yönlendirme (≤ 120 karakter): menüde adın altında, önerilen sekmede Keşif şeridinde. Soru ya da yol
   * gösterir; rehber adımlarının cevabını (tahmin edilecek sonucu) baştan söylemez.
   */
  aciklama: string;
  olustur: () => VeriTablosu;
  /** Yüklenince açılan grafik */
  onerilenGrafik?: GrafikTuru;
  /** Yüklenince eksene gelecek değişken (sütun adı; verilmezse ilk sayısal, yoksa ilk kategorik) */
  varsayilanDegisken?: string;
  /** Yüklenince karşılaştırma paneline gelecek ikinci değişken (sütun adı) */
  karsilastir?: string;
  /** Yüklenince renk anahtarı olacak kategorik değişken (sütun adı; verilmezse ilk kategorik) */
  renkDegisken?: string;
  /** Sınıf düzeyi (zenginleştirme örneklerinde bağlamın sınıfı; programda yoksa kazanım boştur) */
  sinif: SinifDuzeyi | null;
  /** Kazanım kodları; boşsa "Programda yok · zenginleştirme" */
  kazanim: string[];
  hikaye: OrnekHikaye;
  kaynak: OrnekKaynak;
  /** 4 adımlı rehberli keşif */
  rehber: RehberAdimi[];
  /**
   * Önerilen sekme dışındaki sekmelerde Keşif şeridinin metni: o sekmeye uygun kısa yönlendirme (önerilen sekmenin
   * talimatı yinelenmez). Boş metin: şerit yalnız araştırma sorusunu gösterir (ör. Çizgi'de satırlar bir sıra
   * değilken; orada grafiğin altındaki sıra notu zaten yol gösterir). Etkin her sekme için yazılır (veri.test.ts).
   */
  sekmeIpucu?: Partial<Record<GrafikTuru, string>>;
  /** Özellik gelince sekmeIpucu yerine */
  sekmeIpucuOzellikli?: Partial<Record<GrafikTuru, OzellikliMetin>>;
  /** Özellik gelince aciklama yerine (≤ 120 karakter) */
  aciklamaOzellikli?: OzellikliMetin;
  /**
   * Keşif kartının öğretmen bölümündeki not: yalnız sınıfta işe yarayan bilgi (yanılgılar, hesaplar, tartışma
   * soruları). Uygulamanın geliştirme durumu ve kod alan adları yazılmaz (veri.test.ts tarar).
   */
  ogretmenNotu?: string;
  /** Açılış görünümü: ölçüler kapalı başlar, öğrenci önce tahmin eder */
  acilis?: {
    sekme?: GrafikTuru;
    secenekler?: Partial<{ ortalama: boolean; oms: boolean; etiketler: boolean; ortanca: boolean; standartSapma: boolean }>;
    sutunModu?: boolean;
    /** Nokta grafiği grup genişliği; verinin çözünürlüğüne eşitse "Gruplama yok" */
    aralik?: number;
  };
  /** Kategorik sütun adı: nokta grafiği her kategori için alt alta panel çizer (ortak eksen) */
  grupla?: string;
  /** Sütun adı → kategori sırası (varsayılan alfabetik yerine) */
  kategoriSirasi?: Record<string, string[]>;
  /** Sayısal değişkende Daire sekmesinin davranışı */
  daire: 'satir' | 'siklik' | 'uygunDegil';
  /** Sütun adı → çizgi değişim etiketinde yüzde gösterilsin mi (°C: hayır); kayıtta olmayan sütun bugünkü gibi */
  yuzdeDegisim?: Record<string, boolean> | null;
  /** Kişisel ölçüm: adlar yerine kod */
  hassas?: boolean;
  /** Uygulamanın ilk açılış verisi (baslangicDurumu) */
  varsayilanAcilis?: boolean;
  /**
   * İlkokul nesne / şekil grafiğinin anahtarı (grafiğin üst satırında): "Her resim 1 öğrenciyi gösterir." Yalnız sınıf
   * kuralı nesne ya da şekil grafiği çizerken yazılır (sinifKurallari.ts: noktaSekli).
   */
  sekilAnahtari?: string;
}

/**
 * Örnek verilerin konu başlıkları: menüde bu sırayla kümelenir (sınıf düzeyine göre; öğretim programı sırası).
 * `kademe`: konunun görüneceği kademe (ornekKonulari): ilkokul konuları yalnız İlkokul ve Tüm araçlar kademesinde,
 * ortaokul konuları Ortaokul ve Tüm araçlar kademesinde (zenginleştirme yalnız Tüm araçlar'da), lise konuları
 * (hazırlık ve 9–12. sınıf; lise istatistik kazanımları) yalnız Lise ve Tüm araçlar kademesinde. Kademeler birikimli
 * değildir: Lise galerisi 5–8. sınıf örneklerini göstermez (her kademe kendi programının örneklerini listeler).
 */
export const ORNEK_KONULARI = [
  { id: 'sinif1', ad: '1. sınıf · Nesne grafiği, çetele ve sıklık tablosu', kisaAd: '1. sınıf', kademe: 'ilkokul' },
  { id: 'sinif2', ad: '2. sınıf · Şekil grafiği, çetele ve sıklık tablosu', kisaAd: '2. sınıf', kademe: 'ilkokul' },
  { id: 'sinif3', ad: '3. sınıf · Nokta grafiği, çetele ve sıklık tablosu', kisaAd: '3. sınıf', kademe: 'ilkokul' },
  { id: 'sinif4', ad: '4. sınıf · Nokta ve sütun grafiği, çetele ve sıklık tablosu', kisaAd: '4. sınıf', kademe: 'ilkokul' },
  { id: 'sinif5', ad: '5. sınıf · Kategorik veri: sıklık, sütun ve daire grafiği', kisaAd: '5. sınıf', kademe: 'ortaokul' },
  { id: 'sinif6', ad: '6. sınıf · Aritmetik ortalama, ortanca, tepe değer, açıklık', kisaAd: '6. sınıf', kademe: 'ortaokul' },
  { id: 'sinif7', ad: '7. sınıf · Açıklık, ortalama mutlak sapma, çizgi grafiği', kisaAd: '7. sınıf', kademe: 'ortaokul' },
  { id: 'sinif8', ad: '8. sınıf · Gerçek veri, evren ve örneklem', kisaAd: '8. sınıf', kademe: 'ortaokul' },
  { id: 'zenginlestirme', ad: 'Zenginleştirme (programda yok) · İki değişkenin ilişkisi', kisaAd: 'Zenginleştirme', kademe: 'ortaokul' },
  { id: 'sinifH', ad: 'Hazırlık · İstatistiksel sonuç ve yorumları tartışma', kisaAd: 'Hazırlık', kademe: 'lise' },
  { id: 'sinif9', ad: '9. sınıf · Tek nicel değişken: dağılım, merkezî eğilim ve yayılım', kisaAd: '9. sınıf', kademe: 'lise' },
  { id: 'sinif10', ad: '10. sınıf · İki kategorik değişken: göreli sıklık ve ilişkililik', kisaAd: '10. sınıf', kademe: 'lise' },
  { id: 'sinif11', ad: '11. sınıf · İki nicel değişken: birlikte değişme ve ilişkililik', kisaAd: '11. sınıf', kademe: 'lise' },
  { id: 'sinif12', ad: '12. sınıf · Hazır verilerle çalışma ve karar verme', kisaAd: '12. sınıf', kademe: 'lise' },
] as const;

export const ORNEK_VERILER: OrnekVeri[] = [
  // ── 5. sınıf · Kategorik veri: sıklık, sütun ve daire grafiği ───────────────────────────────────────────
  {
    id: 'baskan',
    ad: '5-A sınıf başkanlığı seçimi',
    konu: 'sinif5',
    sinif: 5,
    kazanim: ['MAT.5.5.1'],
    aciklama: 'Her satır bir oy: Noktaları sütunlara dönüştürün, sonra dairede kazananın oyların yarısını alıp almadığına bakın.',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Aday',
    kategoriSirasi: { Aday: ['Elif', 'Kaan', 'Zeynep', 'Mert'] },
    daire: 'siklik',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false }, sutunModu: false },
    hikaye: {
      arastirmaSorusu: '5-A sınıfındaki sınıf başkanı adaylarının Ekim 2025 seçiminde aldıkları oyların dağılımı nasıldır?',
      kim: '5-A sınıfındaki 20 öğrenci; 4 aday',
      neZaman: 'Ekim 2025, seçim günü',
      nasil: 'Gizli oy; pusulalar tek tek okunurken tahtaya çetele tutuldu. Her satır bir oy pusulası.',
      n: 20,
      cumle: "5-A'daki 20 öğrenci Ekim 2025'te gizli oyla başkan seçti; pusulalar okunurken tahtaya çetele tutuldu, her satır bir oy.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi', not: 'Bağlam programın 5. sınıf uygulama notundan (s.61).' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Oyları saymadan tahmin et: Kazanan aday oyların yarısından fazlasını almış olabilir mi?',
        cevap: 'Yarısından fazlası için en az 11 oy gerekir: 20 oyun yarısı 10. Kazananın kaç oy aldığını grafikte bul.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Nokta grafiğinde en yüksek yığın hangi adayda? Kaç nokta var?',
        cevap: 'Elif: 9 nokta, yani 9 oy. Kaan 6, Zeynep 3, Mert 2 oy aldı.',
        eylem: { tur: 'secenek', ac: ['etiketler'], etiket: 'Sayıları göster' },
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: '"Sütunlara dönüştür" düğmesine bas. Her sütunun yüksekliği, ilgili adayın nokta sayısıyla nasıl ilişkilidir?',
        cevap: 'Her adayın noktaları üst üste bir sütun oldu. Sütunun boyu o adayın oy sayısıdır (sıklık).',
        eylem: { tur: 'secenek', ac: ['sutunModu'], etiket: 'Sütunlara dönüştür' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: "Daire grafiğine geç. Elif'in dilimi yarım daireden büyük mü? Elif'e oy verenler mi çok, vermeyenler mi?",
        cevap: "Elif'in dilimi yarım daireden biraz küçük (20 oyun 9'u). Elif'e oy vermeyen 11 kişi var: Elif en çok oyu aldı ama oyların yarısını alamadı.",
        eylem: { tur: 'sekme', sekme: 'daire', etiket: 'Daireye geç' },
      },
    ],
    sekmeIpucu: {
      sutun: 'Her aday bir sütun, sütunun boyu aldığı oy sayısı (sıklık). En uzun sütun kimin?',
      daire: "Bütün daire 20 oy. Elif'in dilimi yarım daireden küçük mü, büyük mü?",
      istatistik: 'Sıklık tablosu: her adayın oy sayısı. Oyların toplamı 20.',
    },
    ogretmenNotu: "5. sınıfta dilim açısı hesaplanmaz; \"yarım daire, çeyrek daire\" gibi parça-bütün diliyle konuşun. Yaygın yanılgı: \"En çok oyu alan, oyların çoğunu almıştır.\" Sayım sırası da ilginç: 10. pusulada Kaan ile Elif 4'er oyla eşitti. Genişletme: Kendi sınıfınızın seçimini çeteleyle tabloya girin.",
    olustur: () =>
      tabloOlustur(
        ['Oy pusulası', 'Aday'],
        [
          ['1. pusula', 'Kaan'], ['2. pusula', 'Elif'], ['3. pusula', 'Kaan'], ['4. pusula', 'Zeynep'], ['5. pusula', 'Kaan'],
          ['6. pusula', 'Elif'], ['7. pusula', 'Mert'], ['8. pusula', 'Kaan'], ['9. pusula', 'Elif'], ['10. pusula', 'Elif'],
          ['11. pusula', 'Zeynep'], ['12. pusula', 'Elif'], ['13. pusula', 'Kaan'], ['14. pusula', 'Elif'],
          ['15. pusula', 'Mert'], ['16. pusula', 'Elif'], ['17. pusula', 'Kaan'], ['18. pusula', 'Elif'],
          ['19. pusula', 'Zeynep'], ['20. pusula', 'Elif'],
        ],
        ['etiket', 'etiket'],
      ),
  },
  {
    id: 'atik',
    ad: 'Evden en çok çıkan atık (5-A ve 5-B)',
    konu: 'sinif5',
    sinif: 5,
    kazanim: ['MAT.5.5.1'],
    aciklama: 'Her atıkta iki sınıfın sütunları yan yana: En çok çıkan atığı ve sınıfların en çok ayrıştığı atığı bulun.',
    onerilenGrafik: 'sutun',
    varsayilanDegisken: 'En çok çıkan atık',
    renkDegisken: 'Sınıf',
    kategoriSirasi: { 'En çok çıkan atık': ['Yemek artığı', 'Plastik', 'Kâğıt ve karton', 'Cam', 'Metal'] },
    daire: 'siklik',
    acilis: { sekme: 'sutun' },
    hikaye: {
      arastirmaSorusu: '5-A ve 5-B öğrencilerinin Kasım 2025’te evlerinde en çok gözlemledikleri atık türlerinin dağılımı nasıldır?',
      kim: "5-A ve 5-B'den 12'şer öğrenci (24 kişi)",
      neZaman: 'Kasım 2025',
      nasil: 'Öğrenciler bir hafta boyunca evdeki çöpü gözledi, sonra "En çok hangi atık çıkıyor?" anketinde tek seçenek işaretledi.',
      n: 24,
      cumle: "5-A ve 5-B'den 24 öğrenci Kasım 2025'te bir hafta evdeki çöpü gözledi ve en çok çıkan atığı ankette işaretledi.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi', not: 'Anket, atığın ağırlığını değil öğrencinin gözlemini ölçer.' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Sence evlerden en çok hangi atık çıkıyor? Tahminini yaz.',
        cevap: 'Çoğu evde yemek artığı ya da plastik; kâğıt ve karton da sık. Hangisinin en çok seçildiğini grafikte bul.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Yan yana sütunlara bak: İki sınıf birlikte en çok hangi atığı seçmiş?',
        cevap: "Yemek artığı: 8 öğrenci (5-A'dan 3, 5-B'den 5).",
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: "İstatistik'te Sınıf'a göre sıklık tablosuna bak. 5-A ile 5-B arasında en büyük fark hangi atıkta?",
        cevap: "Plastik: 5-A'da 6, 5-B'de 1 öğrenci; fark 5. 5-A'nın yarısı \"plastik\" dedi.",
        eylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'Sıklık tablosunu aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: '5-A plastik atığı azaltmak için ne önerebilir? Bu sonuç bütün okul için de geçerli olur mu?',
        cevap: 'Örneğin pet şişe yerine matara kullanmak. 24 öğrencinin cevabı bütün okulu anlatmaz; başka sınıflara da sormak gerekir.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Her nokta bir öğrencinin cevabı; renkler sınıfı gösterir.',
      daire: 'İç daire atık türleri; dış halka her dilimin 5-A ve 5-B payı.',
      istatistik: "Sınıf'a göre sıklık tablosu: satırlarda atık türleri, sütunlarda sınıflar. Metal satırında 5-B sütunu 0.",
    },
    ogretmenNotu: "İki kategorik değişken; renk anahtarı \"Sınıf\". İki sınıfta da 12 öğrenci var, bu yüzden sayılar doğrudan karşılaştırılabilir (mevcutlar farklı olsaydı yüzdeyle karşılaştırmak gerekirdi; iyi bir genişletme sorusu). İstatistik'teki \"Sınıf'a göre sıklık tablosu\"nun matematikteki adı iki yönlü tablodur; bu ad 5. sınıf programında geçmez (programda çetele ve sıklık tablosu var, s.60-61), öğrencilere ekrandaki adıyla söyleyin. \"En çok çıkan\" sorusu ağırlığı değil gözlemi ölçer: MAT.5.5.2 kapsamında \"Bu anket neyi ölçemez?\" diye tartışılabilir.",
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Sınıf', 'En çok çıkan atık'],
        [
          ['Kerem', '5-A', 'Plastik'], ['Nehir', '5-A', 'Yemek artığı'], ['Aras', '5-A', 'Plastik'],
          ['Lina', '5-A', 'Kâğıt ve karton'], ['Poyraz', '5-A', 'Plastik'], ['Hira', '5-A', 'Yemek artığı'],
          ['Çınar', '5-A', 'Metal'], ['İlayda', '5-A', 'Plastik'], ['Beren', '5-A', 'Cam'], ['Emir', '5-A', 'Plastik'],
          ['Duru', '5-A', 'Yemek artığı'], ['Miraç', '5-A', 'Plastik'], ['Irmak', '5-B', 'Yemek artığı'],
          ['Batuhan', '5-B', 'Kâğıt ve karton'], ['Zümra', '5-B', 'Yemek artığı'], ['Doruk', '5-B', 'Kâğıt ve karton'],
          ['Asel', '5-B', 'Cam'], ['Furkan', '5-B', 'Yemek artığı'], ['Melike', '5-B', 'Kâğıt ve karton'],
          ['Ömer', '5-B', 'Plastik'], ['Hüma', '5-B', 'Yemek artığı'], ['Kayra', '5-B', 'Kâğıt ve karton'],
          ['Cemre', '5-B', 'Cam'], ['Eslem', '5-B', 'Yemek artığı'],
        ],
        ['etiket', 'etiket', 'etiket'],
      ),
  },
  {
    id: 'gun',
    ad: "Beril'in hafta içi bir günü",
    konu: 'sinif5',
    sinif: 5,
    kazanim: ['MAT.5.5.1'],
    aciklama: 'Bütün daire 24 saat: Uyku yarım daireden az mı? Bir sınırı sürükleyin; toplam yine 24 saat kalır.',
    onerilenGrafik: 'daire',
    varsayilanDegisken: 'Süre (saat)',
    daire: 'satir',
    acilis: { sekme: 'daire' },
    hikaye: {
      arastirmaSorusu: 'Beril’in Ekim 2025’te gözlemlediği okul gününde etkinliklere ayırdığı sürelerin dağılımı nasıldır?',
      kim: '5. sınıf öğrencisi Beril',
      neZaman: 'Ekim 2025, bir salı günü',
      nasil: 'Beril gün boyunca yarım saatlik bir çizelgeye ne yaptığını yazdı; süreler tam saate yuvarlandı.',
      n: 7,
      cumle: "5. sınıf öğrencisi Beril, Ekim 2025'te bir salı günü neye kaç saat ayırdığını çizelgeye yazdı; süreler tam saate yuvarlandı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal öğrenci verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Beril günün yarısından fazlasını uyuyarak mı geçiriyor? Tahmin et.',
        cevap: 'Hayır: 9 saat uyuyor, yarım gün ise 12 saat.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Uyku dilimini bul. Yarım daireden küçük mü? Çeyrek daireden büyük mü?',
        cevap: 'Yarım daireden küçük, çeyrek daireden (6 saat) büyük.',
        eylem: { tur: 'satirVurgula', satir: 'Uyku', etiket: 'Uyku dilimini göster' },
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Uyku ile okul dilimleri birlikte günün ne kadarı?',
        cevap: '9 + 7 = 16 saat: günün üçte ikisi. Geriye 8 saat, yani üçte bir kalıyor.',
        eylem: null,
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Beril uyku süresini 9 saatten 11 saate çıkarıp “Diğer” etkinliklere ayırdığı 2 saati uykuya ayırsın. Diğer süreler aynı kalsın. Tabloda iki değeri değiştir: Uyku dilimi nasıl değişir ve toplam süre kaç saat olur?',
        cevap: "Uyku 11 saat, Diğer 0 saat olur; kalan süreler değişmez. Uyku dilimi büyür ve toplam 24 saat olarak kalır.",
        eylem: { tur: 'yok', etiket: 'Uyku: 11, Diğer: 0 yaz' },
      },
    ],
    sekmeIpucu: {
      sutun: 'Aynı veri sütunlarla: En uzun sütun hangi etkinlik? "Günün ne kadarı?" sorusunu daire mi, sütun mu daha kolay yanıtlıyor?',
      nokta: 'Her nokta bir etkinliğin süresi; parça-bütün için daire grafiği daha uygun.',
      cizgi: '',
      istatistik: 'Sürelerin toplamı hep 24 saat: bütün, günün kendisi.',
    },
    ogretmenNotu: '5. sınıfta açı ve yüzde hesaplanmaz. Yarım daire ve çeyrek daire gibi parça-bütün diliyle ve renklerle konuşun: 6 saat çeyrek, 12 saat yarım dairedir. Yorumla adımında öğrenciler tabloda Uyku değerini 11, Diğer değerini 0 yapar; kalan etkinliklerin süreleri değişmez ve toplam 24 saat olur. Sınır sürükleme ayrı bir keşiftir: toplamı sabit tutarken öteki süreleri orantılı değiştirir; bu işlem yorumla adımının yönergesiyle aynı değildir.',
    olustur: () =>
      tabloOlustur(
        ['Etkinlik', 'Süre (saat)'],
        [
          ['Uyku', 9], ['Yol', 1], ['Okul', 7], ['Yemek', 1], ['Ödev', 2], ['Oyun ve spor', 2], ['Diğer', 2],
        ],
      ),
  },
  {
    id: 'harcama',
    ad: 'Bir ailenin aylık bütçesi',
    konu: 'sinif5',
    sinif: 5,
    kazanim: ['MAT.5.5.1'],
    aciklama: 'Bütün daire 100 000 TL. Kira dairenin ne kadarı? Birikimi büyütünce hangi kalemler küçülüyor?',
    onerilenGrafik: 'daire',
    varsayilanDegisken: 'Tutar (TL)',
    daire: 'satir',
    acilis: { sekme: 'daire' },
    hikaye: {
      arastirmaSorusu: 'Örnekteki dört kişilik ailenin Mart 2026 gelirinin harcama ve birikim kalemlerine dağılımı nasıldır?',
      kim: 'Dört kişilik bir aile',
      neZaman: 'Mart 2026',
      nasil: "100 000 TL aylık gelirin harcandığı yerler ve birikim kalem kalem yazıldı; tutarlar bin TL'ye yuvarlandı.",
      n: 7,
      cumle: "Dört kişilik bir aile Mart 2026'da 100 000 TL'lik aylık gelirini nereye harcadığını ve ne kadar biriktirdiğini kalem kalem yazdı.",
    },
    kaynak: {
      tur: 'kurgusal',
      ad: 'Kurgusal aile bütçesi',
      not: 'Kalemler ve tutarlar kurgusaldır; hesap kolay olsun diye yuvarlak seçildi. Gerçek harcama dağılımı için TÜİK Hanehalkı Tüketim Harcaması bülteni kullanılabilir (öğretmen, sınıfa uyarlayarak).',
    },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Sence aile gelirinin en büyük kısmını neye harcıyor?',
        cevap: 'Mutfağa: 35 000 TL. Kira 25 000 TL ile ikinci.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Kira dilimine bak. Dairenin ne kadarını kaplıyor?',
        cevap: "Tam çeyrek daire: 100 000 TL'nin dörtte biri 25 000 TL.",
        eylem: { tur: 'satirVurgula', satir: 'Kira', etiket: 'Kira dilimini göster' },
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Kira ile mutfak birlikte bütçenin yarısından fazla mı?',
        cevap: "60 000 TL: Yarısı olan 50 000 TL'den fazla, yani yarım daireden büyük.",
        eylem: null,
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Aile birikimi artırmak istiyor. Birikim diliminin sınırını sürükleyip büyüt: Hangi kalemler küçüldü? Gerçek hayatta hangisinden kısmak daha kolay?',
        cevap: "Toplam yine 100 000 TL. Birikime eklenen para öteki kalemlerden, büyüklükleriyle yaklaşık orantılı alınır ve bin TL'ye yuvarlanır: Birikim 20 000 TL olunca kira 22 000, mutfak 31 000 TL olur. Gerçekte kira ve faturalar pek değişmez; aile daha çok giyimden ya da mutfaktan kısabilir.",
        eylem: { tur: 'surukle', etiket: 'Birikimi büyüt' },
      },
    ],
    sekmeIpucu: {
      sutun: 'Sütunlarla en büyük kalem kolay görünür; "bütçenin yarısı" gibi parça-bütün soruları için daire daha uygun.',
      nokta: 'Her nokta bir kalemin tutarı. "Bütçenin ne kadarı?" sorusunu Daire grafiği daha kolay yanıtlar.',
      cizgi: '',
      istatistik: 'Verilerin toplamı 100 000 TL: bütün, ailenin aylık geliri. Her kalemin bütündeki yerini Daire grafiğinde gör.',
    },
    ogretmenNotu: "Tutarlar kurgusal ve yuvarlaktır (toplam 100 000 TL). 5. sınıfta açı ve yüzde hesaplanmaz: Kira 25 000 TL'nin dilimi \"tam çeyrek daire\" gibi parça-bütün diliyle konuşun. Faturalar, ulaşım ve birikim eşit (üç eşit dilim). Sürükleme toplamı 100 000 TL'de tutar ve tutarları bin TL'ye yuvarlar: Birikim 20 000 TL'ye çıkınca kira 22 000, mutfak 31 000, faturalar ve ulaşım 9 000'er, giyim 4 000 TL olur; okul ve kırtasiye 5 000 TL'de kalır. \"Gelir sabitse bir kalem artınca ötekiler azalır\" fikri tasarruf değerine (D17.2) bağlanır. Genişletme için öğrencilerin gerçek aile gelirini sormayın; kurgusal bir haftalık harçlık (ör. 500 TL) planlatın.",
    olustur: () =>
      tabloOlustur(
        ['Kalem', 'Tutar (TL)'],
        [
          ['Kira', 25000], ['Mutfak', 35000], ['Faturalar', 10000], ['Ulaşım', 10000], ['Okul ve kırtasiye', 5000],
          ['Giyim', 5000], ['Birikim', 10000],
        ],
      ),
  },
  // ── 6. sınıf · Aritmetik ortalama, ortanca, tepe değer, açıklık ─────────────────────────────────────────
  {
    id: 'kitap',
    ad: "6-B'de kasım ayında okunan kitap sayısı",
    konu: 'sinif6',
    sinif: 6,
    kazanim: ['MAT.6.5.1'],
    aciklama: 'Tepe değer, ortanca ve aritmetik ortalama: Üçünü bulup karşılaştırın. Aritmetik ortalama verilerden biri olmalı mı?',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Kitap sayısı',
    daire: 'siklik',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false } },
    hikaye: {
      arastirmaSorusu: '6-B sınıfındaki öğrencilerin Kasım 2025’te okudukları kitap sayılarının dağılımı nasıldır?',
      kim: "6-B'deki 20 öğrenci",
      neZaman: 'Kasım 2025',
      nasil: 'Öğrenciler ay boyunca okuma günlüğü tuttu; ay sonunda bitirdikleri kitapları saydı.',
      n: 20,
      cumle: "6-B'deki 20 öğrenci Kasım 2025 boyunca okuma günlüğü tuttu ve ay sonunda bitirdiği kitapları saydı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Bu sınıfta bir öğrenci kasım ayında genellikle kaç kitap okumuş olabilir?',
        cevap: 'Noktaların çoğu 2 ile 3 kitapta toplanıyor.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'En yüksek nokta yığını hangi değerde? Bu değere ne ad verilir?',
        cevap: '3 kitap (6 öğrenci). En sık görülen değer: tepe değer.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Ortanca ve Aritmetik ortalama düğmelerini aç. Ortanca kaç, aritmetik ortalama kaç?',
        cevap: 'Ortanca 3: 10. ve 11. verilerin toplamının yarısı, (3 + 3) ÷ 2 = 3. Aritmetik ortalama 2,7: 54 kitap ÷ 20 öğrenci.',
        eylem: { tur: 'secenek', ac: ['ortanca', 'ortalama'], etiket: 'Ortanca ve aritmetik ortalamayı aç', gerektirir: 'ortanca' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Hiçbir öğrenci 2,7 kitap okumadı. Öyleyse 2,7 ne anlatıyor?',
        cevap: '54 kitap 20 öğrenciye eşit paylaştırılsaydı her birine 2,7 kitap düşerdi. Aritmetik ortalama verilerden biri olmak zorunda değildir.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      sutun: 'Her sütun bir öğrenci. Aritmetik ortalamayı görmek için Nokta grafiğine dönüp Aritmetik ortalama düğmesini aç: Kitaplar eşit paylaşılsaydı herkese 2,7 düşerdi.',
      daire: "Şimdilik her dilim bir öğrenci; Leyla'nın 0 kitabı dilim olmaz. Kaç öğrencinin kaç kitap okuduğunu Nokta grafiği gösterir.",
      cizgi: '',
      istatistik: 'Tepe değer 3, ortanca 3, aritmetik ortalama 2,7. Hesaplama adımlarında ortancanın 10. ve 11. verilerin toplamının yarısı olduğunu izle.',
      kokYaprak: 'Kitap sayıları tek basamaklı: Hepsi 0 kökünde, yapraklar küçükten büyüğe. En çok tekrar eden yaprak hangisi?',
    },
    sekmeIpucuOzellikli: {
      sutun: {
        metin: 'Bir sütundan aldığını ötekine ver, toplam 54 kalsın: Hepsi eşit olunca her sütun 2,7 olur. Eşit paylaşım aritmetik ortalamadır.',
        gerektirir: 'dengele',
      },
      daire: {
        metin: 'Kitap sayıları paylaşılan bir bütün değil; daire "kaç öğrenci kaç kitap okudu" sıklığını gösterir: En büyük dilim 3 kitap (6 öğrenci).',
        gerektirir: 'daireSiklik',
      },
    },
    ogretmenNotu: "Veri sayısı çift (20): Ortanca 10. ve 11. verilerin toplamının yarısıdır: (3 + 3) ÷ 2 = 3. Yanılgı: \"Aritmetik ortalama verilerden biri olmalı.\" Leyla'nın 0 kitabı da bir veridir: \"0 veri midir?\" tartışması değerli. Leyla'nın hücresini boşaltıp ortalama çizgisinin sağa kaydığını, ortancanın yerinde kaldığını izletin; yeni ortalamayı hesaplatmayın (program s.154: Veri çıkarılınca değişim hesaplanmaz, yazılımda dinamik izlenir). Ortalamanın eşit paylaşım anlamını tahtada tartışın: Çok okuyanlardan az okuyanlara kitap \"aktarılsa\" toplam 54 kalır ve herkese 2,7 düşer; Nokta grafiğindeki aritmetik ortalama çizgisi bu dengenin yerini gösterir.",
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Kitap sayısı'],
        [
          ['Kuzey', 3], ['Ceren', 2], ['Fatma', 6], ['Oğuz', 1], ['Yağmur', 2], ['Ada', 3], ['Sude', 4], ['Leyla', 0],
          ['Bora', 5], ['Işıl', 2], ['Pelin', 3], ['Tuna', 1], ['Gökçe', 3], ['Naz', 4], ['Rüzgâr', 2], ['Hakan', 1], ['Umut', 3],
          ['Mina', 2], ['Ege', 3], ['Deniz', 4],
        ],
      ),
  },
  {
    id: 'kardes',
    ad: "6-A'daki öğrencilerin kardeş sayısı",
    konu: 'sinif6',
    sinif: 6,
    kazanim: ['MAT.6.5.1'],
    aciklama: 'En yüksek yığını bulun: Bu veride kaç tepe değer var? Yeni bir öğrenci eklenince tepe değer ne olur?',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Kardeş sayısı',
    daire: 'siklik',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false } },
    hikaye: {
      arastirmaSorusu: '6-A sınıfındaki öğrencilerin Eylül 2025’te kardeş sayılarının dağılımı nasıldır?',
      kim: "6-A'daki 20 öğrenci",
      neZaman: 'Eylül 2025, tanışma etkinliği',
      nasil: 'Her öğrenci kendisi hariç kaç kardeşi olduğunu söyledi; tahtada çetele tutuldu.',
      n: 20,
      cumle: "6-A'daki 20 öğrenci Eylül 2025'teki tanışma etkinliğinde kendisi hariç kaç kardeşi olduğunu söyledi.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Sence bu sınıfta en çok görülen kardeş sayısı kaç?',
        cevap: 'Çoğu öğrencinin 1 ya da 2 kardeşi var; 0 ve 4 kardeşli öğrenci az. Hangisinin daha sık olduğunu grafikte bul.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Nokta grafiğinde en yüksek yığın hangisi?',
        cevap: "1 ve 2 kardeşteki yığınlar eşit: 7'şer öğrenci. Bu veride iki tepe değer var: 1 ve 2.",
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Aritmetik ortalama ve Ortanca düğmelerini aç. İkisi kaç?',
        cevap: 'Aritmetik ortalama 1,7 (34 ÷ 20), ortanca 2. Kimsenin 1,7 kardeşi olamaz: bu, kardeşler eşit paylaşılsaydı herkese düşecek paydır.',
        eylem: { tur: 'secenek', ac: ['ortalama', 'ortanca'], etiket: 'Aritmetik ortalama ve ortancayı aç', gerektirir: 'ortanca' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Sınıfa kardeşi 1 olan yeni bir öğrenci geldi. Tablonun son boş satırına ekle: Tepe değer değişti mi? Ya kardeşi 0 olan gelseydi?',
        cevap: 'Kardeşi 1 olan gelince tek tepe değer kalır: 1 (8 öğrenci). Kardeşi 0 olan gelseydi yine iki tepe değer (1 ve 2) olurdu.',
        eylem: { tur: 'satirEkle', hucreler: ['Yeni öğrenci', 1], etiket: 'Yeni öğrenciyi ekle' },
      },
    ],
    sekmeIpucu: {
      istatistik: "Tepe değer kartında iki değer var: 1 ve 2 (7'şer kez).",
      kokYaprak: 'Kardeş sayıları tek basamaklı: Hepsi 0 kökünde. Hangi yapraklar en çok tekrar ediyor?',
      sutun: 'Her sütun bir öğrenci; kaç öğrencinin kaç kardeşi olduğunu görmek için Nokta grafiğine dön.',
      daire: 'Şimdilik her dilim bir öğrenci; kardeşi olmayanların dilimi yok. Kaç öğrencinin kaç kardeşi olduğunu Nokta grafiği gösterir.',
      cizgi: '',
    },
    sekmeIpucuOzellikli: {
      daire: {
        metin: 'Daire değerlerin sıklığını gösterir: 0, 1, 2, 3, 4 kardeşli öğrenci sayıları. 1 ve 2 kardeşin dilimleri eşit.',
        gerektirir: 'daireSiklik',
      },
    },
    ogretmenNotu: 'Tepe değer senaryoları: iki tepe değer (bu veri), tek tepe değer (yeni öğrenci eklenince) ve "tüm verilerin birer kez bulunması" (tabloyu 0, 1, 2, 3, 4 değerli 5 satıra indirip gösterin: Tepe değer yoktur). Kesikli veri: Ortalama 1,7 kişi anlamsız görünür, ortanca ya da tepe değer bu veriyi daha iyi anlatır.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Kardeş sayısı'],
        [
          ['Onur', 3], ['Gülce', 1], ['Rabia', 2], ['Defne', 0], ['Taylan', 1], ['Koray', 2], ['İpek', 1], ['Lara', 4],
          ['Hamza', 2], ['Zehra', 2], ['Elvin', 1], ['Yusuf', 3], ['Nisa', 2], ['Berkay', 1], ['Selin', 0], ['Ahsen', 2],
          ['Mehmet', 1], ['Ferhat', 3], ['Öykü', 1], ['Egemen', 2],
        ],
      ),
  },
  {
    id: 'ulasim',
    ad: "6-C'de okula ulaşım süresi",
    konu: 'sinif6',
    sinif: 6,
    kazanim: ['MAT.6.5.1'],
    aciklama: "Bir öğrenci ötekilerden çok uzakta. Bu değer ortalamayı nasıl etkiler? Ortalamayı açın; ortancayı İstatistik'te bulun.",
    aciklamaOzellikli: {
      metin: 'Bir öğrenci ötekilerden çok uzakta. Bu değer ortalamayı ve ortancayı nasıl etkiler? İkisini açıp karşılaştırın.',
      gerektirir: 'ortanca',
    },
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Süre (dakika)',
    daire: 'uygunDegil',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false } },
    hikaye: {
      arastirmaSorusu: '6-C sınıfındaki öğrencilerin Ekim 2025’te ölçüm yapılan sabah okula ulaşım sürelerinin dağılımı nasıldır?',
      kim: "6-C'deki 15 öğrenci",
      neZaman: 'Ekim 2025, bir sabah',
      nasil: 'Öğrenciler evden çıkış ve okula varış saatlerini yazıp aradaki süreyi dakika olarak hesapladı.',
      n: 15,
      cumle: "6-C'deki 15 öğrenci Ekim 2025'te bir sabah evden çıkış ve okula varış saatlerini yazıp süreyi dakika olarak hesapladı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi', not: 'Feyza köyden taşımalı servisle geliyor.' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Bu sınıfta okula gelmek genellikle kaç dakika sürüyor? Tahmin et.',
        cevap: 'Noktaların çoğu 5 ile 25 dakika arasında.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Hangi nokta ötekilerden çok uzakta? Kimin?',
        cevap: 'Feyza: 60 dakika (köyden taşımalı servisle geliyor). Ötekilerden çok uzaktaki böyle bir değere uç nokta denir.',
        eylem: { tur: 'satirVurgula', satir: 'Feyza', etiket: 'Uzaktaki noktayı göster' },
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Aritmetik ortalama ve Ortanca düğmelerini aç. Bu değerlerden hangisi nokta grafiğinde daha fazla veri noktasının bulunduğu bölgede yer almaktadır?',
        cevap: "Ortanca 12 dakika, verilerin daha yoğun bulunduğu bölgededir. Aritmetik ortalama 16 dakika: 15 öğrenciden 11'inin süresi bundan kısa.",
        eylem: { tur: 'secenek', ac: ['ortalama', 'ortanca'], etiket: 'Aritmetik ortalama ve ortancayı aç', gerektirir: 'ortanca' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: "Tabloda Feyza'nın süresini 60'tan 20'ye değiştir. Aritmetik ortalama ve ortanca ne oldu? Sınıfı tek sayıyla anlatmak için hangisini seçerdin?",
        cevap: "Aritmetik ortalama 16'dan yaklaşık 13,3'e iner, ortanca 12'de kalır. Uç nokta ortalamayı çeker, ortancayı pek etkilemez; bu veride ortanca daha iyi temsil eder.",
        eylem: { tur: 'hucre', satir: 'Feyza', sutun: 'Süre (dakika)', deger: 20, etiket: "Feyza'yı 20 dakika yap" },
      },
    ],
    sekmeIpucu: {
      sutun: 'En uzun sütunu aşağı sürükle, sonra Nokta sekmesinde ortalama çizgisinin nereye kaydığına bak.',
      cizgi: '',
      istatistik: 'Aritmetik ortalama 16, ortanca 12, tepe değer 10. Hangisi sınıfı daha iyi anlatıyor?',
      kokYaprak: "Kökler onlar basamağı: 0, 1, 2 … 6. Feyza'nın 60 dakikası 6 kökünde tek başına; 3, 4 ve 5 kökleri boş.",
      daire: 'Süreler toplanıp paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: 'Ötekilerden çok uzak değer (programdaki adıyla uç nokta, s.99; "uç değer" terimi programda geçmez) bir hata değildir: Feyza gerçekten uzakta oturuyor, veriden atılmaz. Program satırı silip farkı hesaplatmayı değil, değeri yazılımda değiştirip çizgilerin kayışını izlemeyi önerir (7. sınıf notu, s.154). 60 yerine 20: Ortalama 200 ÷ 15 yaklaşık 13,3; ortanca 12 aynı kalır. Veri türü: Süre ölçülen (sürekli) bir büyüklüktür, sürekli veri programda 7. sınıfta başlar (s.19); burada süreler tam dakikaya yuvarlandığı için 6. sınıfın nicel (kesikli) veri çerçevesinde sayılabilir tam değerler gibi ele alınır. İsterseniz öğrencilere "süre neden tam dakika yazıldı?" diye sorun.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Süre (dakika)'],
        [
          ['Hande', 12], ['Ozan', 15], ['Merve', 5], ['Feyza', 60], ['Efe', 10], ['Dilara', 20], ['Pınar', 10], ['Levent', 25],
          ['Cem', 5], ['Kübra', 10], ['Giray', 8], ['Buse', 15], ['Nazlı', 20], ['Ahmet', 10], ['İlker', 15],
        ],
      ),
  },
  {
    id: 'mac',
    ad: "Basketbol: Selma ile Yasemin'in son 5 maçı",
    konu: 'sinif6',
    sinif: 6,
    kazanim: ['MAT.6.5.1'],
    aciklama: 'İki oyuncunun noktaları ne kadar yayılmış? Açıklığı ve ortalamayı karşılaştırıp istikrarlı olanı bulun.',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Selma',
    karsilastir: 'Yasemin',
    daire: 'uygunDegil',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false } },
    hikaye: {
      arastirmaSorusu: 'Selma ve Yasemin’in 2025–2026 okul liginin son beş maçında attıkları sayıların dağılımları nasıldır?',
      kim: 'Okul basketbol takımından iki oyuncu: Selma ve Yasemin',
      neZaman: '2025-2026 okul liginin son 5 maçı',
      nasil: 'Sayılar maç kâğıtlarından alındı.',
      n: 5,
      cumle: "Okul takımının iki oyuncusu Selma ve Yasemin'in okul liginin son 5 maçında attığı sayılar maç kâğıtlarından alındı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal takım verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Grafikte iki oyuncunun noktaları birlikte. Sence maç başına kim daha çok sayı atıyor?',
        cevap: "Şaşırtıcı ama ikisi de maç başına ortalama 17 sayı atıyor. Selma'nın 32 sayılık maçı göze çarpıyor; 5 sayı attığı bir maç da var.",
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Noktalar ne kadar yayılmış? İki oyuncunun açıklığı kaç?',
        cevap: 'Selma 5 ile 32 arasında: Açıklık 27. Yasemin 15 ile 19 arasında: Açıklık 4.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Aritmetik ortalama düğmesini aç. İki oyuncunun aritmetik ortalaması kaç? Noktalar ortalamanın çevresine nasıl dağılmış?',
        cevap: "İkisi de 17 (85 ÷ 5). Ortalamalar eşit ama Selma'nın noktaları ortalamadan çok uzağa dağılmış, Yasemin'inkiler hemen yanında.",
        eylem: { tur: 'secenek', ac: ['ortalama'], etiket: 'Aritmetik ortalamayı aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Her maç güvenilir sayı atacak bir oyuncu seçeceksen kimi seçersin, neden?',
        cevap: 'Yasemin: Her maç ortalamasına çok yakın oynuyor (açıklık 4), daha istikrarlı. Selma bazen çok (32), bazen çok az (5) atıyor (açıklık 27).',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      cizgi: "Maç sırasına göre iki oyuncu: Selma'nın çizgisi iniş çıkışlı, Yasemin'inki neredeyse düz.",
      sutun: 'Her maçta iki sütun yan yana: Selma ve Yasemin. Hangi oyuncunun sütunları maçtan maça daha çok değişiyor?',
      kokYaprak: "Sırt sırta: Selma'nın yaprakları solda, Yasemin'inkiler sağda. Yasemin'in bütün sayıları 1 kökünde.",
      sacilim: 'Burada her nokta bir maç: yatayda bir oyuncunun, dikeyde ötekinin sayısı. İstikrarı karşılaştırmak için Nokta grafiği daha uygun.',
      istatistik: 'Aritmetik ortalamalar eşit (17); açıklıklar 27 ve 4. Hesaplama adımlarını defterdeki hesabınla karşılaştır.',
      daire: 'Maç sayıları paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: "5 veri elle hesap için idealdir: Önce defterde hesaplatın, sonra İstatistik → Hesaplama adımları ile karşılaştırın. 6. sınıfta yayılım açıklıkla konuşulur (27 ve 4). 7. sınıfta genişletme (MAT.7.6.1): ortalama mutlak sapma; Selma'nın ortalamaya uzaklıkları 1, 12, 15, 0, 4 → 32 ÷ 5 = 6,4, Yasemin'inkiler 0, 2, 2, 1, 1 → 6 ÷ 5 = 1,2. Yanılgı: \"Ortalamaları eşit olan iki veri seti aynıdır.\"",
    olustur: () =>
      tabloOlustur(
        ['Maç', 'Selma', 'Yasemin'],
        [
          ['1. maç', 18, 17], ['2. maç', 5, 15], ['3. maç', 32, 19], ['4. maç', 17, 16], ['5. maç', 13, 18],
        ],
      ),
  },
  // ── 7. sınıf · Açıklık, ortalama mutlak sapma, çizgi grafiği ────────────────────────────────────────────
  {
    id: 'sinav',
    ad: '7-A ve 7-B matematik sınavı puanları',
    konu: 'sinif7',
    sinif: 7,
    kazanim: ['MAT.7.6.1'],
    aciklama: "İki sınıfın ortalaması aynı; puanlar nasıl yayılmış? Renklere ve İstatistik'teki Gruplara göre (Sınıf) tabloya bakın.",
    aciklamaOzellikli: {
      metin: 'İki sınıfın ortalaması aynı. Puanlar ortalamanın çevresine nasıl yayılmış? Tek grafikte iki sınıfı karşılaştırın.',
      gerektirir: 'grupla',
    },
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Puan',
    renkDegisken: 'Sınıf',
    grupla: 'Sınıf',
    daire: 'uygunDegil',
    hassas: true,
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false } },
    hikaye: {
      arastirmaSorusu: '7-A ve 7-B sınıflarındaki öğrencilerin Kasım 2025 ortak matematik sınavı puanlarının dağılımları nasıldır?',
      kim: "7-A ve 7-B'den 15'er öğrenci (30 kişi)",
      neZaman: 'Kasım 2025, ortak yazılı sınav',
      nasil: 'Aynı 20 soruluk sınav; her soru 5 puan. Adlar yerine sınıf-sıra kodu kullanıldı.',
      n: 30,
      cumle: "7-A ve 7-B'deki 15'er öğrenci Kasım 2025'te aynı 20 soruluk sınava girdi (her soru 5 puan); adlar yerine kod kullanıldı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'İki sınıfın puanlarına bak. Sence hangi sınıf daha başarılı?',
        cevap: 'İkisinin de aritmetik ortalaması 70. "Daha başarılı" demek için yalnız ortalamaya değil, puanların nasıl yayıldığına da bakmak gerekir.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Hangi sınıfın puanları daha geniş bir alana yayılmış? En düşük ve en yüksek puanlara bak.',
        cevap: "7-A: 40 ile 100 arası (açıklık 60). 7-B: 55 ile 80 arası (açıklık 25). 7-A'nın puanları çok daha dağınık.",
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'İki sınıfın aritmetik ortalamasını ve ortalama mutlak sapmasını karşılaştır.',
        cevap: "Aritmetik ortalamalar eşit: İkisi de 70 (1050 ÷ 15). Ortalama mutlak sapma 7-A'da 16, 7-B'de 6: 7-B'nin puanları ortalamaya çok daha yakın.",
        eylem: { tur: 'secenek', ac: ['ortalama', 'oms'], etiket: 'Aritmetik ortalama ve sapmayı aç', gerektirir: 'grupla' },
        yedekEylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'Gruplara göre tabloyu aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Öğretmen hangi sınıfta ek çalışmaya daha çok öğrencinin ihtiyacı olduğunu merak ediyor. Verilere göre ne dersin?',
        cevap: "7-A: 60'ın altında 5 öğrenci var, 7-B'de 1. Aritmetik ortalama aynı olsa da 7-A'da desteğe ihtiyaç duyan öğrenci daha çok; 7-A'da 90 ve üstü alan 3 öğrenci de var.",
        eylem: null,
      },
    ],
    sekmeIpucu: {
      istatistik: 'Gruplara göre (Sınıf) tabloda: İki sınıfın ortalaması aynı (70), ortalama mutlak sapmaları farklı (16 ve 6), ortancaları da farklı (75 ve 70).',
      sutun: 'Sütunlar ikişer ikişer: her çiftte bir 7-A, bir 7-B öğrencisi. Dağılımı karşılaştırmak için Nokta grafiği daha uygun.',
      cizgi: '',
      daire: 'Puanlar paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: "Ortancalar da farklı (75 ve 70): 7-A'nın çoğu 75 ve üstü aldı ama birkaç düşük puan ortalamayı aşağı çekiyor. Nokta grafiği iki sınıfı tek grafikte, her puanda yan yana yığınlarla gösterir; İstatistik'teki Gruplara göre (Sınıf) tablo ortalama, ortanca ve ortalama mutlak sapmayı yan yana verir. Puanlar hassas veridir: Adlar yerine kod var (D8 Mahremiyet); kendi sınıfınızın puanlarını adlarla yansıtmayın.",
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Sınıf', 'Puan'],
        [
          ['7A-01', '7-A', 75], ['7A-02', '7-A', 40], ['7A-03', '7-A', 90], ['7A-04', '7-A', 80], ['7A-05', '7-A', 55],
          ['7A-06', '7-A', 100], ['7A-07', '7-A', 65], ['7A-08', '7-A', 80], ['7A-09', '7-A', 45], ['7A-10', '7-A', 85],
          ['7A-11', '7-A', 60], ['7A-12', '7-A', 90], ['7A-13', '7-A', 50], ['7A-14', '7-A', 80], ['7A-15', '7-A', 55],
          ['7B-01', '7-B', 70], ['7B-02', '7-B', 65], ['7B-03', '7-B', 75], ['7B-04', '7-B', 80], ['7B-05', '7-B', 60],
          ['7B-06', '7-B', 70], ['7B-07', '7-B', 75], ['7B-08', '7-B', 55], ['7B-09', '7-B', 80], ['7B-10', '7-B', 70],
          ['7B-11', '7-B', 65], ['7B-12', '7-B', 75], ['7B-13', '7-B', 70], ['7B-14', '7-B', 80], ['7B-15', '7-B', 60],
        ],
        ['etiket', 'etiket', 'sayi'],
      ),
  },
  {
    id: 'boy',
    ad: '7-C öğrencilerinin boy uzunlukları',
    konu: 'sinif7',
    sinif: 7,
    kazanim: ['MAT.7.6.1'],
    aciklama: 'Önce en kısa ile en uzun arasındaki farkı (açıklık) bulun, sonra ortalama mutlak sapmayla ortalamaya uzaklığa bakın.',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Boy (cm)',
    daire: 'uygunDegil',
    hassas: true,
    varsayilanAcilis: true,
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false } },
    hikaye: {
      arastirmaSorusu: '7-C sınıfındaki öğrencilerin Eylül 2025’te ölçülen boy uzunluklarının dağılımı nasıldır?',
      kim: "7-C'deki 24 öğrenci",
      neZaman: 'Eylül 2025, beden eğitimi dersi',
      nasil: 'Duvar boy ölçerle, ayakkabısız ölçüldü; en yakın santimetreye yuvarlandı. Adlar yerine kod kullanıldı.',
      n: 24,
      cumle: "7-C'deki 24 öğrencinin boyu Eylül 2025'te duvar boy ölçerle, ayakkabısız ölçüldü ve santimetreye yuvarlandı; adlar yerine kod var.",
    },
    kaynak: {
      tur: 'kurgusal',
      ad: 'Kurgusal sınıf verisi; yayılım WHO büyüme referansına göre',
      url: 'https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/height-for-age-(5-19-years)/sft-hfa-boys-z-5-19years.pdf',
      url2: 'https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/height-for-age-(5-19-years)/sft-hfa-girls-z-5-19years.pdf',
      urlAd: 'WHO: erkek',
      url2Ad: 'kız',
      not: 'WHO 2007 referansı: 12 yaşında ortanca boy erkeklerde 149,1 cm, kızlarda 151,2 cm; 1 standart sapma yaklaşık 7 cm.',
    },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Sınıfın boyları en çok hangi aralıkta toplanıyor? Tahmin et.',
        cevap: 'Çoğu 145 ile 162 cm arasında; en kısa 140, en uzun 170 cm.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'En kısa ile en uzun öğrenci arasında kaç cm fark var? Bu farka ne denir?',
        cevap: '170 − 140 = 30 cm: açıklık.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Aritmetik ortalama ve Ortalama mutlak sapma düğmelerini aç. Öğrenciler ortalamadan ortalama kaç cm uzakta?',
        cevap: "Aritmetik ortalama 153 cm, ortalama mutlak sapma 5 cm. 24 öğrenciden 16'sı 148 ile 158 cm arasındaki bantta.",
        eylem: { tur: 'secenek', ac: ['ortalama', 'oms'], etiket: 'Aritmetik ortalama ve sapmayı aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Açıklık 30 cm ama ortalama mutlak sapma yalnız 5 cm. Neden bu kadar farklı?',
        cevap: 'Açıklık yalnız en uçtaki iki öğrenciye bakar (140 ve 170). Ortalama mutlak sapma herkesin ortalamaya uzaklığını hesaba katar; çoğu öğrenci ortalamaya yakın olduğu için küçük kalır.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      istatistik: 'Hesaplama adımlarında her öğrencinin ortalamaya uzaklığını gör: Bu uzaklıkların ortalaması 5 cm.',
      sutun: 'Her sütun bir öğrenci; dağılımı görmek için Nokta grafiği daha uygun.',
      cizgi: '',
      daire: 'Boylar toplanıp paylaşılmaz; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: "Ortalama (153) ile ortanca (152) yakın; 170 cm'lik öğrenci dağılımı hafifçe sağa çeker. Boy hassas bir ölçümdür: Adlar yerine kod var; kendi sınıfınızda ölçmeden önce izin alın. Noktalar seyrek görünürse Grafik ayarlarından 5 cm'lik grup genişliği seçilebilir.",
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Boy (cm)'],
        [
          ['7C-01', 152], ['7C-02', 145], ['7C-03', 161], ['7C-04', 148], ['7C-05', 155], ['7C-06', 140], ['7C-07', 153],
          ['7C-08', 157], ['7C-09', 151], ['7C-10', 162], ['7C-11', 146], ['7C-12', 152], ['7C-13', 149], ['7C-14', 170],
          ['7C-15', 155], ['7C-16', 150], ['7C-17', 158], ['7C-18', 145], ['7C-19', 154], ['7C-20', 151], ['7C-21', 162],
          ['7C-22', 148], ['7C-23', 156], ['7C-24', 152],
        ],
      ),
  },
  {
    id: 'fide',
    ad: 'Fasulye fidesinin haftalık boyu',
    konu: 'sinif7',
    sinif: 7,
    kazanim: ['MAT.7.6.1'],
    aciklama: 'Çizgi her hafta aynı eğimle mi yükseliyor? Bir noktaya dokunup haftalık artışları okuyun.',
    onerilenGrafik: 'cizgi',
    varsayilanDegisken: 'Boy (cm)',
    daire: 'uygunDegil',
    yuzdeDegisim: { 'Boy (cm)': true },
    acilis: { sekme: 'cizgi' },
    hikaye: {
      arastirmaSorusu: '7-B sınıfında yetiştirilen fasulye fidesinin 15 Eylül–3 Kasım 2025 arasında haftalık boy uzunlukları nasıl değişmiştir?',
      kim: "7-B'nin fen bilimleri dersindeki fasulye saksısı",
      neZaman: 'Eylül-Kasım 2025, 8 hafta',
      nasil: 'Filiz çıktıktan sonra 8 hafta boyunca her pazartesi (15 Eylül – 3 Kasım 2025) cetvelle 0,1 cm duyarlıkla ölçüldü.',
      n: 8,
      cumle: "7-B fen bilimleri dersinde Eylül 2025'te ekilen fasulyenin boyu, filiz çıktıktan sonra 8 hafta her pazartesi cetvelle ölçüldü.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf deneyi verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Fide her hafta aynı miktarda mı uzar? Çizginin nasıl görüneceğini tahmin et.',
        cevap: 'Hayır: Çizgi önce dikleşiyor, sonra yataylaşıyor.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Çizginin en dik olduğu iki hafta hangisi?',
        cevap: "3. hafta ile 4. hafta arası: 9,5 cm’den 14,5 cm’ye, 5 cm artış.",
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Noktalara sırayla dokun ve haftalık artışları oku.',
        cevap: '3, 4, 5, 4, 3, 2, 1 cm: Önce hızlanıyor, sonra yavaşlıyor.',
        eylem: { tur: 'yok', etiket: 'Noktalara dokun' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: '9. haftada fidenin boyu kaç cm olabilir? Neden?',
        cevap: 'Yaklaşık 25–26 cm: Artışlar her hafta azalıyor, son hafta yalnız 1 cm uzadı.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Nokta grafiği haftaların sırasını göstermez; zamanla değişim için Çizgi grafiği.',
      sutun: 'Sütunların tepelerini sırayla birleştirirsen çizgi grafiğini elde edersin.',
      daire: 'Haftalık boylar paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
      istatistik: 'Hesaplama adımları boyların ortalamasını verir; fidenin haftadan haftaya nasıl uzadığını Çizgi grafiği gösterir.',
    },
    ogretmenNotu: 'Boy oran ölçeğidir (0 cm gerçek bir sıfır): Yüzde artış anlamlıdır (1. → 2. hafta %120, 7. → 8. hafta yaklaşık %4,3). Bir noktaya dokununca değişim etiketi farkı ve yüzdeyi birlikte yazar: "3 cm artış (%120)". Sıcaklık örneğiyle karşılaştırın: Orada etiket yalnız farkı yazar, çünkü °C\'de yüzde anlamsızdır.',
    olustur: () =>
      tabloOlustur(
        ['Hafta', 'Boy (cm)'],
        [
          ['1. hafta', 2.5], ['2. hafta', 5.5], ['3. hafta', 9.5], ['4. hafta', 14.5], ['5. hafta', 18.5], ['6. hafta', 21.5],
          ['7. hafta', 23.5], ['8. hafta', 24.5],
        ],
      ),
  },
  {
    id: 'sicaklik',
    ad: "Ankara'nın aylık ortalama sıcaklığı",
    konu: 'sinif7',
    sinif: 7,
    kazanim: ['MAT.7.6.1', 'MAT.7.6.2'],
    aciklama: 'Gerçek MGM verisi: Çizginin en dik yükseldiği ve en hızlı düştüğü ayları bulun; değişimi °C olarak okuyun.',
    onerilenGrafik: 'cizgi',
    varsayilanDegisken: 'Sıcaklık (°C)',
    daire: 'uygunDegil',
    yuzdeDegisim: { 'Sıcaklık (°C)': false },
    acilis: { sekme: 'cizgi' },
    hikaye: {
      arastirmaSorusu: "MGM’nin 1927–2025 ölçümlerine göre Ankara’da aylık ortalama sıcaklıklar yıl boyunca nasıl değişmektedir?",
      kim: 'Meteoroloji Genel Müdürlüğü (MGM) Ankara istasyonu',
      neZaman: '1927–2025 ölçüm periyodu',
      nasil: 'Her ayın uzun yıllar ortalama sıcaklığı (°C).',
      n: 12,
      cumle: "MGM'nin Ankara istasyonunda 1927–2025 arasında ölçülen sıcaklıklardan her ayın uzun yıllar ortalaması.",
    },
    kaynak: {
      tur: 'gercek',
      ad: 'MGM, İllerimize Ait Genel İstatistik Veriler: Ankara (ölçüm periyodu 1927-2025), "Ortalama Sıcaklık (°C)" satırı',
      url: 'https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?k=A&m=ANKARA',
      urlAd: 'MGM: Ankara',
      erisim: '24 Eylül 2026',
    },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: "Ankara’da yılın en sıcak ayı hangisi olabilir?",
        cevap: 'Çoğu kişi temmuz der. Uzun yıllar ortalamasında ağustos (23,6 °C), temmuzu (23,5 °C) çok az geçiyor.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Çizgi grafiğinde hangi iki ay arasındaki sıcaklık artışı en fazladır?',
        cevap: "Marttan nisana: 5,8 °C'den 11,3 °C'ye, 5,5 °C artış.",
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Ekim ayı sıcaklık değerine dokun: Eylül–Ekim ve Ekim–Kasım ayları arasında sıcaklık kaç derece azalmıştır?',
        cevap: 'İkisinde de 5,8 °C azalış: Sonbaharda sıcaklık, ilkbaharda yükseldiğinden biraz daha hızlı düşüyor.',
        eylem: { tur: 'yok', etiket: 'Ekim noktasına dokun', gerektirir: 'yuzdeDegisim' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: '"Temmuz ayı ocak ayından yaklaşık 59 kat sıcaktır." ifadesi doğru mudur?',
        cevap: 'Hayır. 0 °C "hiç sıcaklık yok" demek değildir; sıcaklıklar kat ya da yüzdeyle karşılaştırılmaz. Doğrusu: Temmuz, ocaktan 23,1 °C daha sıcak.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      sutun: 'Sütunlar da ayları karşılaştırır; iniş çıkışın hızını çizgi daha iyi gösterir.',
      nokta: 'Nokta grafiği sıcaklıkların dağılımını gösterir ama hangi ay olduğunu kaybeder.',
      daire: 'Aylık ortalamaları toplamak anlamsız; daire grafiği bu veri için uygun değil.',
      istatistik: 'Yıllık ortalama yaklaşık 12,1 °C, açıklık 23,2 °C. Hangi ayda ne kadar değiştiğini Çizgi grafiği gösterir.',
    },
    ogretmenNotu: 'Gerçek MGM verisi (1927–2025 ortalaması). Değişim etiketleri yalnız farkı yazar ("5,5 °C artış"): °C oran ölçeği olmadığı için yüzde anlamsızdır. Yıllık ortalama yaklaşık 12,1 °C, açıklık 23,2 °C. Ağustosun temmuzu geçmesi "gerçek veri beklentiyi her zaman doğrulamaz" tartışmasına iyi bir başlangıç. 4. adımdaki "59 kat" sorusu, oranın yalnız gerçek sıfırı olan ölçeklerde (boy, uzunluk) anlamlı olduğunu konuşmak için; fide örneğiyle karşılaştırın.',
    olustur: () =>
      tabloOlustur(
        ['Ay', 'Sıcaklık (°C)'],
        [
          ['Ocak', 0.4], ['Şubat', 1.8], ['Mart', 5.8], ['Nisan', 11.3], ['Mayıs', 16.1], ['Haziran', 20.1], ['Temmuz', 23.5],
          ['Ağustos', 23.6], ['Eylül', 19], ['Ekim', 13.2], ['Kasım', 7.4], ['Aralık', 2.6],
        ],
      ),
  },
  // ── 8. sınıf · Gerçek veri, evren ve örneklem ───────────────────────────────────────────────────────────
  {
    id: 'iklim',
    ad: 'Erzurum ve Adana: aylık ortalama sıcaklık',
    konu: 'sinif8',
    sinif: 8,
    kazanim: ['MAT.8.6.1', 'MAT.8.6.2'],
    aciklama: 'Gerçek MGM verisi: Sıfırın altındaki aylarda sütunlar aşağı iner. İki şehrin açıklığını ve ortalamasını karşılaştırın.',
    onerilenGrafik: 'sutun',
    varsayilanDegisken: 'Erzurum (°C)',
    karsilastir: 'Adana (°C)',
    daire: 'uygunDegil',
    yuzdeDegisim: { 'Erzurum (°C)': false, 'Adana (°C)': false },
    acilis: { sekme: 'sutun' },
    hikaye: {
      arastirmaSorusu: "MGM’nin aynı dönemdeki (1929–2025) ölçümlerine göre Erzurum ve Adana’nın aylık ortalama sıcaklıkları nasıl farklılaşmaktadır?",
      kim: 'MGM Erzurum ve Adana istasyonları',
      neZaman: 'İki istasyonda da aynı ölçüm periyodu: 1929–2025',
      nasil: 'Her ayın uzun yıllar ortalama sıcaklığı (°C).',
      n: 12,
      cumle: "MGM'nin Erzurum ve Adana istasyonlarında aynı dönemde (1929–2025) ölçülen sıcaklıklardan her ayın uzun yıllar ortalaması.",
    },
    kaynak: {
      tur: 'gercek',
      ad: 'MGM, İllerimize Ait Genel İstatistik Veriler: Erzurum ve Adana, "Ortalama Sıcaklık (°C)" satırı',
      url: 'https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?k=A&m=ERZURUM',
      url2: 'https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?k=A&m=ADANA',
      urlAd: 'MGM: Erzurum',
      url2Ad: 'Adana',
      erisim: '20 Ekim 2026',
    },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: "Erzurum'da kaç ayın ortalaması sıfırın altında olabilir?",
        cevap: '4 ay: ocak, şubat, mart ve aralık.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Sütun grafiğinde sıfırın altına inen sütunları bul. En soğuk ay hangisi?',
        cevap: 'Ocak: −9,1 °C. Negatif değerler sıfır çizgisinden aşağı doğru çizilir.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Çizgi grafiğine geç: iki şehir birlikte. İki şehrin açıklığı kaç?',
        cevap: 'Erzurum: 19,6 − (−9,1) = 28,7 °C. Adana: 28,8 − 9,6 = 19,2 °C.',
        eylem: { tur: 'sekme', sekme: 'cizgi', etiket: 'Çizgiye geç', gerektirir: 'yuzdeDegisim' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Yıllık ortalamalar yaklaşık 5,8 °C ve 19,3 °C. Yalnız bu iki sayı iki şehrin iklimini anlatmaya yeter mi?',
        cevap: "Yetmez: Erzurum'un sıcaklıkları çok daha geniş bir aralığa yayılıyor (kış çok soğuk, yaz ılık). Ortalamanın yanında açıklık ya da ortalama mutlak sapma da verilmeli.",
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: "Tek grafikte iki şehir: Erzurum'un noktaları çok daha geniş bir aralığa yayılmış.",
      cizgi: 'Yazın iki çizgi birbirine yaklaşıyor, kışın aralarındaki fark büyüyor.',
      istatistik: 'Ortalama mutlak sapmalar: Erzurum yaklaşık 8,8, Adana yaklaşık 6,2 °C.',
      daire: 'Sıcaklıklar toplanıp paylaşılmaz; daire grafiği bu veri için uygun değil.',
      sacilim: 'Her nokta bir ay: İki şehir birlikte ısınıp soğuyor, noktalar sol alttan sağ üste diziliyor.',
    },
    ogretmenNotu: "Açıklık hesabında negatif sayıyla çıkarma: 19,6 − (−9,1) = 28,7. Sütun grafiği iki şehri ay ay yan yana çizer; Çizgi grafiği de iki seriyi birlikte gösterir. İki şehrin ölçüm periyodu aynıdır (1929–2025), bu yüzden ortalamalar doğrudan karşılaştırılabilir. İki şehir arasındaki fark ocakta 18,7 °C, temmuzda 9,1 °C. Değişim etiketleri yalnız farkı yazar: °C'de yüzde anlamsızdır; kasım → aralık gibi sıfırın iki yanındaki aylarda yüzde hesaplamanın neden saçma sonuç verdiğini sorabilirsiniz.",
    olustur: () =>
      tabloOlustur(
        ['Ay', 'Erzurum (°C)', 'Adana (°C)'],
        [
          ['Ocak', -9.1, 9.6], ['Şubat', -7.6, 10.6], ['Mart', -2.3, 13.5], ['Nisan', 5.4, 17.6], ['Mayıs', 10.7, 21.9],
          ['Haziran', 14.9, 25.7], ['Temmuz', 19.2, 28.3], ['Ağustos', 19.6, 28.8], ['Eylül', 14.8, 26.2], ['Ekim', 8.2, 21.8],
          ['Kasım', 1.2, 16], ['Aralık', -5.7, 11.3],
        ],
      ),
  },
  {
    id: 'ekran',
    ad: '8. sınıflarda günlük ekran süresi (örneklem)',
    konu: 'sinif8',
    sinif: 8,
    kazanim: ['MAT.8.6.1', 'MAT.8.6.2'],
    aciklama: 'Kurayla seçilen 40 öğrenci: Ortalama ve ortancayı karşılaştırın, örneklemin okulu temsil edip etmediğini tartışın.',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Süre (dakika)',
    karsilastir: 'Şube',
    renkDegisken: 'Şube',
    daire: 'uygunDegil',
    hassas: true,
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false }, aralik: 5 },
    hikaye: {
      arastirmaSorusu: 'Okulumuzdaki 8. sınıf öğrencilerinin Mart 2026’da ölçüm yapılan hafta içi gününde okul dışındaki ekran sürelerinin dağılımı nasıldır?',
      kim: 'Evren: okuldaki 112 sekizinci sınıf öğrencisi. Örneklem: her şubeden kurayla 10 öğrenci (40 kişi)',
      neZaman: 'Mart 2026, bir hafta içi günü',
      nasil: 'Anonim anket; telefon, tablet, bilgisayar ve televizyon başında geçen süre dakika olarak yazıldı.',
      n: 40,
      cumle: "Okuldaki 112 sekizinci sınıf öğrencisinden her şubeden 10'ar kişi kurayla seçildi; Mart 2026'da bir hafta içi günkü ekran sürelerini anonim ankete yazdılar.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal okul verisi (öz bildirim anketi)' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Bir 8. sınıf öğrencisi hafta içi okul dışında günde kaç saat ekran başında? Tahmin et.',
        cevap: 'Bu örneklemde ortanca 120 dakika, yani 2 saat: Öğrencilerin yarısı günde 2 saat ya da daha az ekran başında.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Noktalar neden hep 60, 90, 120, 180 gibi değerlerde yığılıyor?',
        cevap: 'Öğrenciler süreyi ölçmedi, tahmin edip yuvarladı ("2 saat" gibi). Ankette öz bildirimle toplanan veride bu sık görülür.',
        eylem: { tur: 'aralik', aralik: 5, etiket: 'Gruplamayı kaldır' },
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Aritmetik ortalama ve Ortanca düğmelerini aç. Hangisi daha büyük, neden?',
        cevap: 'Aritmetik ortalama 150, ortanca 120 dakika. Günde 5–7 saat ekran başında olan birkaç öğrenci ortalamayı yukarı çekiyor.',
        eylem: { tur: 'secenek', ac: ['ortalama', 'ortanca'], etiket: 'Aritmetik ortalama ve ortancayı aç', gerektirir: 'ortanca' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: "Bu 40 kişilik örneklem okuldaki 112 sekizinci sınıfı temsil eder mi? Ya Türkiye'deki bütün 8. sınıfları?",
        cevap: "Her şubeden kurayla seçildiği için okulu temsil etmeye yakın. Türkiye'yi temsil etmez: Tek bir okul farklı illeri, köyleri ve okul türlerini kapsamaz.",
        eylem: null,
      },
    ],
    sekmeIpucu: {
      istatistik: 'Gruplara göre (Şube) tabloda dört şubenin ortalamaları birbirine yakın (138–155 dakika). Örneklem her şubeden eşit alındı.',
      sutun: 'Her grupta dört şubeden birer öğrenci yan yana gösterilir. Renk anahtarından şubeleri izleyin.',
      cizgi: '',
      daire: 'Süreler paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: "Veri sayısı çok (40) ve açıklığı büyük (390 dakika) bir veri seti. Örnek \"Gruplama yok\" ile açılır: Öz bildirimdeki yuvarlama yığılmaları (60, 90, 120, 180, 240) yalnız bu görünümde tam değerlerinde görünür. Grafik ayarlarından daha geniş bir gruba geçilirse yakın değerler aynı yığına düşer ve yığılmalar kaybolur; 2. adımdaki düğme tam değerlere geri döndürür. Yığılmaları konuştuktan sonra okunurluk için grup genişliği 20 ya da 50 seçilebilir. Yuvarlama yığılmaları MAT.8.6.2 kapsamında \"bu veri neyi abartıyor ya da saklıyor?\" diye tartışılabilir. Anket anonim: Tabloda kod var.",
    olustur: () =>
      tabloOlustur(
        ['Katılımcı', 'Şube', 'Süre (dakika)'],
        [
          ['K01', '8-A', 120], ['K02', '8-A', 90], ['K03', '8-A', 180], ['K04', '8-A', 60], ['K05', '8-A', 240],
          ['K06', '8-A', 120], ['K07', '8-A', 30], ['K08', '8-A', 150], ['K09', '8-A', 90], ['K10', '8-A', 300],
          ['K11', '8-B', 60], ['K12', '8-B', 120], ['K13', '8-B', 180], ['K14', '8-B', 45], ['K15', '8-B', 120],
          ['K16', '8-B', 420], ['K17', '8-B', 90], ['K18', '8-B', 180], ['K19', '8-B', 240], ['K20', '8-B', 75],
          ['K21', '8-C', 180], ['K22', '8-C', 120], ['K23', '8-C', 60], ['K24', '8-C', 90], ['K25', '8-C', 360],
          ['K26', '8-C', 120], ['K27', '8-C', 30], ['K28', '8-C', 200], ['K29', '8-C', 150], ['K30', '8-C', 240],
          ['K31', '8-D', 100], ['K32', '8-D', 120], ['K33', '8-D', 180], ['K34', '8-D', 60], ['K35', '8-D', 90],
          ['K36', '8-D', 150], ['K37', '8-D', 240], ['K38', '8-D', 120], ['K39', '8-D', 180], ['K40', '8-D', 300],
        ],
        ['etiket', 'etiket', 'sayi'],
      ),
  },
  // ── Zenginleştirme (programda yok) · İki değişkenin ilişkisi ────────────────────────────────────────────
  {
    id: 'calisma',
    ad: 'Haftalık çalışma süresi ve matematik puanı',
    konu: 'zenginlestirme',
    sinif: null,
    kazanim: [],
    aciklama: 'Zenginleştirme: Noktalar nasıl diziliyor? Ötekilerden ayrılan noktayı bulun; birlikte değişmek neden-sonuç mu?',
    onerilenGrafik: 'sacilim',
    varsayilanDegisken: 'Haftalık çalışma (saat)',
    renkDegisken: 'Sınıf',
    daire: 'uygunDegil',
    hassas: true,
    acilis: { sekme: 'sacilim' },
    hikaye: {
      arastirmaSorusu: 'Örneklemdeki öğrencilerin Şubat 2026 sınavından önceki haftada çalışma süreleri ile sınav puanları nasıl ilişkilidir?',
      kim: "8-A ve 8-B'den 10'ar öğrenci (20 kişi)",
      neZaman: 'Şubat 2026, deneme sınavından önceki hafta',
      nasil: 'Öğrenciler evde kaç saat matematik çalıştığını anonim olarak yazdı; puanlar aynı deneme sınavından. Adlar yerine kod var.',
      n: 20,
      cumle: "8-A ve 8-B'den 20 öğrenci deneme sınavından önceki hafta evde kaç saat matematik çalıştığını anonim yazdı; puanlar o sınavdan.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Daha çok çalışanın puanı hep daha mı yüksektir? Tahmin et.',
        cevap: 'Hep değil. Çalışma süresi arttıkça puan genellikle artıyor ama az çalışıp yüksek puan alan da var.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Noktalar genel olarak nasıl diziliyor?',
        cevap: 'Sol alttan sağ üste: Çalışma süresi arttıkça puan genellikle artıyor. Ama noktalar bir doğru üzerinde değil, dağınık.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'İki sınıfın haftalık çalışma sürelerini karşılaştır. Hangi sınıfta değerler daha geniş bir aralığa yayılmıştır?',
        cevap: '8-A sınıfında çalışma süreleri 1 ile 10 saat arasındadır; açıklık 9 saattir. 8-B sınıfında 2 ile 10 saat arasındadır; açıklık 8 saattir. 8-A sınıfındaki değerler daha geniş bir aralığa yayılır.',
        eylem: { tur: 'yok', etiket: 'En küçük ve en büyük süreleri karşılaştır' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: '"Çalışma süresi puanı artırır" diyebilir miyiz?',
        cevap: 'Veri yalnız ikisinin birlikte değiştiğini gösteriyor. Puanı başka şeyler de etkiler (önceki bilgi, uyku, sınav günü). İlişki, neden-sonuç demek değildir.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      istatistik: 'Matematik puanı sekmesine geç: Gruplara göre (Sınıf) tabloda iki sınıfın puan ortalaması yakın (71,2 ve 72,8).',
      nokta: 'Nokta grafiği tek değişkene bakar; iki değişkenin ilişkisi için Saçılım.',
      sutun: 'Her sütun bir öğrencinin çalışma süresi; çalışma ile puanın ilişkisini Saçılım grafiği gösterir.',
      cizgi: '',
      daire: 'Çalışma saatleri paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: 'Programda yok (zenginleştirme). İlişki belirgin ama kusursuz değil (korelasyon yaklaşık 0,70). İki sınıfta da aynı eğilim var. İstisna nokta (8B-03) "neden-sonuç" yanılgısını tartışmak için konuldu. Puan hassas veridir: Adlar yerine kod var.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Sınıf', 'Haftalık çalışma (saat)', 'Matematik puanı'],
        [
          ['8A-01', '8-A', 5, 61], ['8A-02', '8-A', 2, 63], ['8A-03', '8-A', 8, 90], ['8A-04', '8-A', 1, 52],
          ['8A-05', '8-A', 6, 77], ['8A-06', '8-A', 10, 76], ['8A-07', '8-A', 3, 70], ['8A-08', '8-A', 7, 85],
          ['8A-09', '8-A', 4, 58], ['8A-10', '8-A', 5, 80], ['8B-01', '8-B', 6, 66], ['8B-02', '8-B', 9, 83],
          ['8B-03', '8-B', 3, 88], ['8B-04', '8-B', 2, 48], ['8B-05', '8-B', 10, 94], ['8B-06', '8-B', 4, 74],
          ['8B-07', '8-B', 7, 72], ['8B-08', '8-B', 3, 55], ['8B-09', '8-B', 8, 79], ['8B-10', '8-B', 5, 69],
        ],
        ['etiket', 'etiket', 'sayi', 'sayi'],
      ),
  },
  {
    id: 'cikolata',
    ad: 'Hava sıcaklığı ve kantinde sıcak çikolata satışı',
    konu: 'zenginlestirme',
    sinif: null,
    kazanim: [],
    aciklama: 'Zenginleştirme: Sıcaklık artınca satış ne oluyor? Noktaların yönüne bakın; tarih sırası için Çizgi grafiğine geçin.',
    onerilenGrafik: 'sacilim',
    varsayilanDegisken: 'Sıcaklık (°C)',
    daire: 'uygunDegil',
    yuzdeDegisim: { 'Sıcaklık (°C)': false, 'Satış (bardak)': true },
    acilis: { sekme: 'sacilim' },
    hikaye: {
      arastirmaSorusu: 'Örnekteki okul kantininde günlük hava sıcaklığı ile satılan sıcak çikolata sayısı nasıl ilişkilidir?',
      kim: 'Bir ortaokulun kantini',
      neZaman: 'Kasım 2025 – Mayıs 2026 arasında 12 pazartesi',
      nasil: 'Kantin görevlisi satılan sıcak çikolata bardağını ve öğle saatindeki hava sıcaklığını not etti.',
      n: 12,
      cumle: 'Bir ortaokulun kantini Kasım 2025–Mayıs 2026 arasında 12 pazartesi satılan sıcak çikolatayı ve öğle sıcaklığını not etti.',
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal kantin verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Hava ısındıkça sıcak çikolata satışı ne olur? Tahmin et.',
        cevap: 'Azalır: Sıcak günlerde daha az sıcak çikolata satılıyor. Bu ilişkinin ne kadar düzenli olduğunu grafikte gör.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Saçılım grafiğinde noktalar nasıl diziliyor?',
        cevap: 'Sol üstten sağ alta: Sıcaklık arttıkça satış azalıyor (negatif ilişki).',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Sıcaklıkları yakın iki güne bak: 8 Aralık (4 °C) ve 5 Ocak (5 °C). Satışlar aynı mı?',
        cevap: 'Hayır: 44 ve 55 bardak. Satışı sıcaklıktan başka şeyler de etkiliyor (ör. o gün kar yağdı ya da okulda etkinlik vardı).',
        eylem: { tur: 'satirVurgula', satir: '5 Ocak', etiket: "5 Ocak'ı göster" },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: "Kantin 15 °C'lik bir gün için kaç bardak hazırlamalı?",
        cevap: "13–17 °C'lik günlerde satış 24 ile 34 bardak arasında; yaklaşık 30 bardak makul.",
        eylem: null,
      },
    ],
    sekmeIpucu: {
      cizgi: 'Tarih sırasıyla sıcaklık kıştan bahara yükseliyor. Grafiğin üstündeki Satış (bardak) sekmesine geç: Satış ne yapıyor?',
      nokta: 'Nokta grafiği yalnız sıcaklıkların dağılımını gösterir; sıcaklık ile satışın ilişkisi için Saçılım.',
      sutun: 'Sütunlar tarih sırasıyla sıcaklıklar. Grafiğin üstündeki Satış (bardak) sekmesine geçip iki sütun dizisini karşılaştır.',
      istatistik: 'İstatistik tek değişkeni özetler; sıcaklık ile satışın birlikte nasıl değiştiğini Saçılım grafiği gösterir.',
      daire: 'Satışlar ve sıcaklıklar paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: 'Programda yok (zenginleştirme). İlişki güçlü (korelasyon yaklaşık −0,9) ama kusursuz değil. Satırlar tarih sırasında: Çizgi grafiğinde Sıcaklık ve Satış (bardak) sekmeleri arasında geçilince iki değişkenin zamanla ters yönde değiştiği görülür (birimleri farklı olduğu için ortak eksende çizilmezler). Dikkat: Ölçüm günleri arasında 1 ile 5 hafta var, aralıklar eşit değil; çizgi grafiği ise noktaları eşit aralıkla dizer. "Çizgideki eğim neden yanıltıcı olabilir?" diye sorun.',
    olustur: () =>
      tabloOlustur(
        ['Tarih', 'Sıcaklık (°C)', 'Satış (bardak)'],
        [
          ['3 Kasım', 13, 34], ['24 Kasım', 9, 47], ['8 Aralık', 4, 44], ['5 Ocak', 5, 55], ['12 Ocak', 2, 50],
          ['16 Şubat', 7, 38], ['2 Mart', 11, 43], ['9 Mart', 15, 24], ['6 Nisan', 17, 29], ['13 Nisan', 19, 33],
          ['27 Nisan', 21, 20], ['4 Mayıs', 24, 18],
        ],
      ),
  },
  // ── İlkokul (1–4. sınıf): yalnız İlkokul ve Tüm araçlar kademesinde galeride (ornekKonulari) ─────────────────
  // Kategorik veri, en çok iki veri grubu; temsiller programın öngördüğü gibi: 1. sınıf nesne grafiği, 2. sınıf şekil
  // grafiği, 3. sınıf nokta grafiği, 4. sınıf nokta ve sütun grafiği; hepsinde çetele ve sıklık tablosu (sinifKurallari.ts).
  {
    id: 'oyuncak',
    ad: "1-A'nın en sevdiği oyuncak",
    konu: 'sinif1',
    sinif: 1,
    kazanim: ['MAT.1.4.1'],
    aciklama: 'Her resim bir öğrencinin seçtiği oyuncak: Resimleri sayın, sonra sıklık tablosundaki çeteleyle karşılaştırın.',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Oyuncak',
    kategoriSirasi: { Oyuncak: ['Top', 'Uçurtma', 'Araba', 'Ayıcık'] },
    daire: 'siklik',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false }, sutunModu: false },
    sekilAnahtari: 'Her resim 1 öğrenciyi gösterir.',
    hikaye: {
      arastirmaSorusu: '1-A sınıfındaki öğrencilerin en sevdikleri oyuncakların dağılımı nasıldır?',
      kim: '1-A sınıfındaki 15 öğrenci',
      neZaman: 'Ekim 2025, oyun saati',
      nasil: 'Her öğrenci en sevdiği oyuncağın kartını panoya astı; kartlar sayılırken tahtaya çetele tutuldu. Her satır bir öğrenci.',
      n: 15,
      cumle: "1-A'daki 15 öğrenci Ekim 2025'te en sevdiği oyuncağın kartını panoya astı; kartlar sayılırken çetele tutuldu, her satır bir öğrenci.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi', not: 'Sınıfın oyuncak köşesine alınacak yeni oyuncak için kurgulandı.' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Saymadan önce tahmin et: Sınıfta en çok hangi oyuncak seviliyor olabilir?',
        cevap: 'Herkesin tahmini farklı olabilir. Doğru cevabı bulmak için her oyuncağın resimlerini tek tek sayacağız: En uzun resim sırası en çok sevilen oyuncaktır.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Nesne grafiğinde en uzun resim sırası hangi oyuncakta? Kaç resim var?',
        cevap: 'Top: 6 resim, yani 6 öğrenci topu seçti. Ayıcığı 4, uçurtmayı 3, arabayı 2 öğrenci seçti.',
        eylem: { tur: 'secenek', ac: ['etiketler'], etiket: 'Sayıları göster' },
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Sıklık tablosunu aç. Topun çetelesindeki çizgileri say: Resimlerle aynı sayı mı?',
        cevap: 'Aynı: Topun çetelesinde bir beşli demet ve 1 çizgi var, 5 ve 1 daha 6 eder. Bütün çizgiler 15: Sınıfta 15 öğrenci var.',
        eylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'Sıklık tablosunu aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Sınıfın oyuncak köşesine bir oyuncak daha alınacak. Hangisini alalım? Neden?',
        cevap: 'Top alalım: En çok öğrenci (6) topu seçti. En az seçilen araba oldu (2 öğrenci).',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      istatistik: 'Çetele ve sıklık tablosu: Her çizgi bir öğrenci, beşinci çizgi dört çizginin üstünden geçer.',
    },
    ogretmenNotu: '1. sınıfta veri nesne grafiği, çetele ve sıklık tablosuyla gösterilir. Grafiği önce sınıfta gerçek oyuncaklarla ya da oyuncak kartlarıyla sıra sıra dizin, sonra ekrandakiyle karşılaştırın; resimler aynı boyda ve eşit aralıkla dizildiği için sıraların boyu karşılaştırılabilir. Çetelede beşinci çizginin dört çizginin üstünden geçtiğini gösterin. Tartışma: "En az seçilen oyuncağı hiç almazsak ne olur?"',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Oyuncak'],
        [
          ['Ada', 'Top'], ['Eymen', 'Araba'], ['Zehra', 'Ayıcık'], ['Yusuf', 'Top'], ['Asya', 'Uçurtma'],
          ['Kerem', 'Top'], ['Nil', 'Ayıcık'], ['Alparslan', 'Top'], ['Ela', 'Uçurtma'], ['Göktuğ', 'Araba'],
          ['Masal', 'Ayıcık'], ['Ömer Asaf', 'Top'], ['Selin', 'Ayıcık'], ['Toprak', 'Top'], ['Yağmur', 'Uçurtma'],
        ],
        ['etiket', 'etiket'],
      ),
  },
  {
    id: 'oyun',
    ad: "2-A ve 2-B'nin en sevdiği oyun",
    konu: 'sinif2',
    sinif: 2,
    kazanim: ['MAT.2.4.1'],
    aciklama: 'Her şekil bir öğrenci; iki sınıfın şekilleri yan yana. Her sınıfın en sevdiği oyunu bulun, sonra karşılaştırın.',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Oyun',
    renkDegisken: 'Sınıf',
    grupla: 'Sınıf',
    kategoriSirasi: { Oyun: ['Saklambaç', 'Körebe', 'İp atlama', 'Seksek'] },
    daire: 'siklik',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false }, sutunModu: false },
    sekilAnahtari: 'Her kare 1 öğrenciyi gösterir.',
    hikaye: {
      arastirmaSorusu: '2-A ve 2-B öğrencilerinin en sevdikleri teneffüs oyunlarının dağılımı nasıldır?',
      kim: "2-A ve 2-B'den 10'ar öğrenci (20 kişi)",
      neZaman: 'Kasım 2025, teneffüs',
      nasil: 'Her öğrenci en sevdiği oyunu söyledi; sınıf başkanları tahtaya çetele tuttu. Her satır bir öğrenci.',
      n: 20,
      cumle: "2-A ve 2-B'den 20 öğrenci Kasım 2025'te en sevdiği teneffüs oyununu söyledi; sınıf başkanları çetele tuttu, her satır bir öğrenci.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi', not: 'İki sınıfta da 10 öğrenci var; sayılar doğrudan karşılaştırılabilir.' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'İki sınıfın en sevdiği oyun aynı mı olur, farklı mı? Tahmin et.',
        cevap: 'Farklı olabilir: Her sınıfın kendi oyun alışkanlığı var. Bunu anlamak için iki sınıfın şekillerini ayrı ayrı sayıp yan yana koymak gerekir.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: "Şekil grafiğinde 2-A'nın en uzun şekil sırası hangi oyunda? 2-B'ninki hangisinde?",
        cevap: "2-A'da saklambaç (5 şekil), 2-B'de ip atlama (5 şekil): İki sınıfın en sevdiği oyun farklı.",
        eylem: { tur: 'secenek', ac: ['etiketler'], etiket: 'Sayıları göster' },
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Sıklık tablosunu aç. İki sınıf birlikte en çok hangi oyunu seçmiş? Kaç öğrenci?',
        cevap: "Saklambaç: 2-A'dan 5, 2-B'den 2, toplam 7 öğrenci. İp atlamayı 6, sekseği 5, körebeyi 2 öğrenci seçti.",
        eylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'Sıklık tablosunu aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Teneffüste iki sınıf birlikte tek bir oyun oynayacak. Hangi oyunu seçmeliler? Neden?',
        cevap: "Saklambaç: İki sınıfta toplam en çok öğrenci (7) onu seçti. Ama 2-B'de en çok ip atlama seçildi; ertesi gün ip atlama oynanabilir.",
        eylem: null,
      },
    ],
    sekmeIpucu: {
      istatistik: "Sınıf'a göre sıklık tablosu: satırlarda oyunlar, sütunlarda sınıflar; her çizgi bir öğrenci.",
    },
    ogretmenNotu: '2. sınıfta kategorik veriyle en çok iki veri grubu üzerinde çalışılır; veri şekil grafiği, çetele ve sıklık tablosuyla gösterilir. Şekil grafiğinde her kare bir öğrencidir: Anahtarı birlikte okuyun. İki sınıfta da 10 öğrenci olduğu için sayılar doğrudan karşılaştırılabilir. Tartışma: "Toplamda en çok seçilen oyun, her sınıfın en sevdiği oyun mudur?"',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Sınıf', 'Oyun'],
        [
          ['Arda', '2-A', 'Saklambaç'], ['Beyza', '2-A', 'Seksek'], ['Can', '2-A', 'Saklambaç'], ['Duru', '2-A', 'İp atlama'],
          ['Efe', '2-A', 'Saklambaç'], ['Fulya', '2-A', 'Seksek'], ['Hamza', '2-A', 'Körebe'], ['İpek', '2-A', 'Saklambaç'],
          ['Kaan', '2-A', 'Seksek'], ['Lara', '2-A', 'Saklambaç'], ['Mina', '2-B', 'İp atlama'], ['Onur', '2-B', 'Saklambaç'],
          ['Pelin', '2-B', 'İp atlama'], ['Rüzgar', '2-B', 'Seksek'], ['Sude', '2-B', 'İp atlama'], ['Taha', '2-B', 'Körebe'],
          ['Umut', '2-B', 'Saklambaç'], ['Vera', '2-B', 'İp atlama'], ['Yiğit', '2-B', 'Seksek'], ['Zeynep', '2-B', 'İp atlama'],
        ],
        ['etiket', 'etiket', 'etiket'],
      ),
  },
  {
    id: 'gelis',
    ad: "3-B'nin okula geliş biçimi",
    konu: 'sinif3',
    sinif: 3,
    kazanim: ['MAT.3.4.1'],
    aciklama: 'Her nokta bir öğrenci: En yüksek nokta sırasını bulun, sonra çetele ve sıklık tablosunda sayıları karşılaştırın.',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Geliş biçimi',
    kategoriSirasi: { 'Geliş biçimi': ['Yürüyerek', 'Servisle', 'Arabayla', 'Bisikletle'] },
    daire: 'siklik',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false }, sutunModu: false },
    hikaye: {
      arastirmaSorusu: '3-B sınıfındaki öğrencilerin okula geliş biçimlerinin dağılımı nasıldır?',
      kim: '3-B sınıfındaki 18 öğrenci',
      neZaman: 'Şubat 2026, bir sabah',
      nasil: 'Sabah yoklamasında her öğrenci okula nasıl geldiğini söyledi; nöbetçi öğrenci çetele tuttu. Her satır bir öğrenci.',
      n: 18,
      cumle: "3-B'deki 18 öğrenci Şubat 2026'da bir sabah okula nasıl geldiğini söyledi; nöbetçi öğrenci çetele tuttu, her satır bir öğrenci.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi', not: 'Okul önündeki düzenleme için kurgulandı.' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Tahmin et: Sınıfımızda okula en çok hangi yolla geliniyor olabilir?',
        cevap: 'Okula yakın oturanlar yürür, uzakta oturanlar servisle ya da arabayla gelir. Hangisinin en çok olduğunu nokta grafiğinde noktaları sayarak bulacağız.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Nokta grafiğinde en yüksek nokta sırası hangi geliş biçiminde? Kaç nokta var?',
        cevap: 'Yürüyerek: 8 nokta, yani 8 öğrenci yürüyerek geliyor. Servisle 5, arabayla 3, bisikletle 2 öğrenci geliyor.',
        eylem: { tur: 'secenek', ac: ['etiketler'], etiket: 'Sayıları göster' },
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Sıklık tablosunu aç. Yürüyerek gelenler servisle gelenlerden kaç kişi fazla?',
        cevap: '8 − 5 = 3: Yürüyerek gelenler 3 kişi fazla. Sıklıkların toplamı 18: sınıftaki bütün öğrenciler.',
        eylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'Sıklık tablosunu aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Okul önüne yaya geçidi mi, bisiklet park yeri mi yapılmalı? Veriye göre karar ver.',
        cevap: 'Yaya geçidi: En çok öğrenci (8) yürüyerek geliyor. Bisikletle yalnız 2 öğrenci geliyor; park yeri olursa bisikletle gelenler artabilir, bu da yeni bir araştırma sorusu.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      istatistik: 'Çetele ve sıklık tablosu: Çetele çizgileri beşer beşer demetlenir; sıklıkların toplamı veri sayısıdır.',
    },
    ogretmenNotu: '3. sınıfta kategorik ve sayarak elde edilen veriyle tek veri grubu üzerinde çalışılır; veri çetele, sıklık tablosu ve nokta grafiğiyle gösterilir. Nokta grafiğinde her nokta bir öğrencidir; noktalar eşit aralıkla dizildiği için sıraların boyu karşılaştırılabilir. Tartışma: "Bu veriyle yağmurlu bir günde kaç öğrencinin yürüyeceğini bilebilir miyiz?"',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Geliş biçimi'],
        [
          ['Aybüke', 'Yürüyerek'], ['Batu', 'Servisle'], ['Cansu', 'Yürüyerek'], ['Deniz', 'Arabayla'], ['Ecrin', 'Yürüyerek'],
          ['Ferhat', 'Servisle'], ['Gizem', 'Yürüyerek'], ['Halil', 'Bisikletle'], ['Işıl', 'Yürüyerek'], ['Kuzey', 'Servisle'],
          ['Leyla', 'Yürüyerek'], ['Mert', 'Arabayla'], ['Nisa', 'Yürüyerek'], ['Oğuz', 'Servisle'], ['Pınar', 'Yürüyerek'],
          ['Rıza', 'Bisikletle'], ['Serra', 'Servisle'], ['Tuna', 'Arabayla'],
        ],
        ['etiket', 'etiket'],
      ),
  },
  {
    id: 'gezi',
    ad: "4-A ve 4-B'nin gezi tercihi",
    konu: 'sinif4',
    sinif: 4,
    kazanim: ['MAT.4.4.2'],
    aciklama: 'Her gezi yerinde iki sınıfın sütunları yan yana: Her sınıfın en çok istediği yeri ve iki sınıfın toplamını bulun.',
    onerilenGrafik: 'sutun',
    varsayilanDegisken: 'Gezi yeri',
    renkDegisken: 'Sınıf',
    grupla: 'Sınıf',
    kategoriSirasi: { 'Gezi yeri': ['Müze', 'Hayvanat bahçesi', 'Bilim merkezi', 'Orman'] },
    daire: 'siklik',
    acilis: { sekme: 'sutun' },
    hikaye: {
      arastirmaSorusu: '4-A ve 4-B öğrencilerinin sınıf gezisi için tercih ettikleri yerlerin dağılımı nasıldır?',
      kim: "4-A ve 4-B'den 12'şer öğrenci (24 kişi)",
      neZaman: 'Mart 2026',
      nasil: 'Her öğrenci dört gezi yerinden birini oy pusulasına yazdı; pusulalar sayılırken çetele tutuldu. Her satır bir öğrenci.',
      n: 24,
      cumle: "4-A ve 4-B'den 24 öğrenci Mart 2026'da dört gezi yerinden birini seçti; pusulalar sayılırken çetele tutuldu, her satır bir öğrenci.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi', not: 'İki sınıfta da 12 öğrenci var; sayılar doğrudan karşılaştırılabilir.' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'İki sınıf birlikte geziye gidecek. Sence en çok hangi yer seçilmiştir? Tahmin et.',
        cevap: 'Hayvanat bahçesi ya da bilim merkezi çok seçilmiş olabilir; iki sınıfın seçimleri de farklı olabilir. Bunu sütun grafiğinde iki sınıfın sütunlarını yan yana göreceğiz.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: "Sütun grafiğinde 4-A'nın en uzun sütunu hangi yerde? 4-B'ninki hangisinde?",
        cevap: "4-A'da hayvanat bahçesi (5 öğrenci), 4-B'de bilim merkezi (6 öğrenci). İki sınıfın en çok istediği yer farklı.",
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Sıklık tablosunu aç. İki sınıfın toplamında en çok hangi yer seçilmiş? Kaç öğrenci?',
        cevap: "Bilim merkezi: 4-A'dan 3, 4-B'den 6, toplam 9 öğrenci. Hayvanat bahçesini 7, müzeyi 5, ormanı 3 öğrenci seçti.",
        eylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'Sıklık tablosunu aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Gezi için tek bir yer seçilecek. Hangi yer seçilmeli? 4-A bu karara neden itiraz edebilir?',
        cevap: "Bilim merkezi: İki sınıfta toplam en çok öğrenci (9) onu seçti. 4-A'da ise en çok hayvanat bahçesi seçildi (5); 4-A'dan yalnız 3 öğrenci bilim merkezini istedi.",
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Her nokta bir öğrenci; her gezi yerinde iki sınıfın noktaları yan yana. Sütunlara dönüştürüp sütun grafiğiyle karşılaştırın.',
      istatistik: "Sınıf'a göre sıklık tablosu: satırlarda gezi yerleri, sütunlarda sınıflar; her çizgi bir öğrenci.",
    },
    ogretmenNotu: '4. sınıfta kategorik ve sayarak elde edilen veriyle en çok iki veri grubu üzerinde çalışılır. Sütun grafiğinde iki sınıfın sütunları her gezi yerinde yan yana durur; sütunun boyu o yeri seçen öğrenci sayısıdır. Nokta grafiğinde "Sütunlara dönüştür" ile noktaların sütuna nasıl dönüştüğünü gösterin. Tartışma: "Toplamda en çok seçilen yer, iki sınıfın da en çok istediği yer midir?"',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Sınıf', 'Gezi yeri'],
        [
          ['Akın', '4-A', 'Hayvanat bahçesi'], ['Berra', '4-A', 'Bilim merkezi'], ['Cem', '4-A', 'Müze'], ['Dila', '4-A', 'Hayvanat bahçesi'],
          ['Emre', '4-A', 'Bilim merkezi'], ['Gülce', '4-A', 'Orman'], ['Hakan', '4-A', 'Hayvanat bahçesi'], ['İnci', '4-A', 'Müze'],
          ['Kemal', '4-A', 'Bilim merkezi'], ['Lal', '4-A', 'Hayvanat bahçesi'], ['Murat', '4-A', 'Orman'], ['Naz', '4-A', 'Hayvanat bahçesi'],
          ['Alya', '4-B', 'Bilim merkezi'], ['Barış', '4-B', 'Müze'], ['Ceren', '4-B', 'Bilim merkezi'], ['Doğa', '4-B', 'Bilim merkezi'],
          ['Erdem', '4-B', 'Hayvanat bahçesi'], ['Gökçe', '4-B', 'Bilim merkezi'], ['Harun', '4-B', 'Müze'], ['Işın', '4-B', 'Bilim merkezi'],
          ['Koray', '4-B', 'Orman'], ['Lina', '4-B', 'Müze'], ['Melis', '4-B', 'Hayvanat bahçesi'], ['Nazlı', '4-B', 'Bilim merkezi'],
        ],
        ['etiket', 'etiket', 'etiket'],
      ),
  },
  // ── Lise (hazırlık, 9–12. sınıf): yalnız Lise ve Tüm araçlar kademesinde galeride (ornekKonulari) ──────────────
  // Lise istatistik kazanımları (güncel kodlar, içerik paketlerinin kazanım kodları: public/kazanim-icerikleri/liste.json):
  // MAT.H.5.1, MAT.9.6.1–9.6.2, MAT.10.2.1–10.2.2, MAT.11.1.1–11.1.2, MAT.12.5.1. Saçılım yalnız 11. ve 12. sınıfta açıktır;
  // 9–12. sınıfta histogram ve kutu grafiği, 10–12. sınıfta koşullu göreli sıklıklar (sinifKurallari.ts).
  // ── Hazırlık · İstatistiksel sonuç ve yorumları tartışma ───────────────────────────────────────────────────
  {
    id: 'kahvalti',
    ad: 'Okul gazetesinin kahvaltı haberi',
    konu: 'sinifH',
    sinif: 'H',
    kazanim: ['MAT.H.5.1'],
    aciklama: 'Gazetenin başlığı: "Öğrencilerin çoğu kahvaltı yapmadan okula geliyor." Veri bu başlığı destekliyor mu?',
    onerilenGrafik: 'sutun',
    varsayilanDegisken: 'Kahvaltı',
    renkDegisken: 'Sınıf',
    kategoriSirasi: { Kahvaltı: ['Her gün', 'Haftada birkaç gün', 'Hiç'] },
    daire: 'siklik',
    hassas: true,
    acilis: { sekme: 'sutun' },
    hikaye: {
      arastirmaSorusu: 'Hazırlık sınıfı öğrencilerinin okul günlerinde kahvaltı yapma sıklığı nasıl dağılmaktadır?',
      kim: "Hazırlık-A ve Hazırlık-B'den 20'şer öğrenci (40 kişi)",
      neZaman: 'Ekim 2025, okul gazetesi anketi',
      nasil: 'Gazete kulübü "Okul günlerinde kahvaltı yapar mısın?" sorusunu üç seçenekle sordu; anket anonimdi.',
      n: 40,
      cumle: "Okul gazetesi kulübü Ekim 2025'te iki hazırlık sınıfından 40 öğrenciye okul günlerinde kahvaltı yapıp yapmadığını anonim olarak sordu.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal okul verisi (gazete kulübü anketi)', not: 'Haber başlığı ile anket sorusu aynı şeyi ölçmüyor; tartışmanın konusu budur.' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Başlığa göre öğrencilerin çoğu kahvaltı yapmıyor. Sence 40 öğrenciden kaçı hiç kahvaltı yapmıyor? Tahmin et.',
        cevap: 'Başlığa bakınca 20’den fazla denebilir. Ankette yalnız 9 öğrenci "Hiç" dedi; 18 öğrenci her gün, 13 öğrenci haftada birkaç gün kahvaltı yapıyor.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Sütun grafiğinde en uzun sütunlar hangi seçenekte? İki sınıfın cevapları birbirine benziyor mu?',
        cevap: '"Her gün": Hazırlık-A’dan 8, Hazırlık-B’den 10 öğrenci. İki sınıfın dağılımı benziyor; "Hiç" diyenler 5 ve 4 öğrenci.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: "İstatistik'teki sıklık tablosunda göreli sıklıklara bak. Hiç kahvaltı yapmayanlar ve her gün kahvaltı yapmayanlar yüzde kaç?",
        cevap: 'Hiç yapmayanlar 9/40 = %22,5. "Haftada birkaç gün" ve "Hiç" birlikte 22/40 = %55: Öğrencilerin %55’i her gün kahvaltı yapmıyor.',
        eylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'Sıklık tablosunu aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Başlık veriye uyuyor mu? Veriye uyan bir başlık yaz.',
        cevap: '"Kahvaltı yapmadan geliyor" demek için "Hiç" diyenlere bakmak gerekir; onlar yalnız %22,5. Veriye uyan bir başlık: "Öğrencilerin yarısından fazlası her gün kahvaltı yapmıyor." İki sınıftan 40 öğrenci de bütün okulu temsil etmeyebilir.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Her nokta bir öğrencinin cevabı; renkler sınıfı gösterir. Sayıları sütun grafiğinde karşılaştırın.',
      daire: 'İç daire kahvaltı cevapları, dış halka her dilimde Hazırlık-A ve Hazırlık-B payı.',
      istatistik: "Göreli sıklık sütunu her cevabın yüzdesini verir; Sınıf'a göre tabloda iki sınıfı karşılaştırın.",
    },
    ogretmenNotu: 'Başkasının vardığı sonucu veriyle sınama: Başlıktaki "çoğu" ve "kahvaltı yapmadan" sözcükleri anket sorusuyla aynı şeyi söylemiyor. "Hiç" diyenler %22,5, "her gün değil" diyenler %55. Tartışma: Haftada birkaç gün kahvaltı yapan biri anket günü kahvaltı yapmış olabilir mi? İki sınıftan 40 kişi bütün okulu temsil eder mi? Başlığı yazan kişi hangi iki seçeneği birleştirmiş olabilir?',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Sınıf', 'Kahvaltı'],
        [
          ['H01', 'Hazırlık-A', 'Hiç'], ['H02', 'Hazırlık-A', 'Hiç'], ['H03', 'Hazırlık-A', 'Haftada birkaç gün'], ['H04', 'Hazırlık-A', 'Hiç'],
          ['H05', 'Hazırlık-A', 'Her gün'], ['H06', 'Hazırlık-A', 'Her gün'], ['H07', 'Hazırlık-A', 'Hiç'], ['H08', 'Hazırlık-A', 'Her gün'],
          ['H09', 'Hazırlık-A', 'Haftada birkaç gün'], ['H10', 'Hazırlık-A', 'Her gün'], ['H11', 'Hazırlık-A', 'Haftada birkaç gün'], ['H12', 'Hazırlık-A', 'Her gün'],
          ['H13', 'Hazırlık-A', 'Hiç'], ['H14', 'Hazırlık-A', 'Haftada birkaç gün'], ['H15', 'Hazırlık-A', 'Haftada birkaç gün'], ['H16', 'Hazırlık-A', 'Her gün'],
          ['H17', 'Hazırlık-A', 'Her gün'], ['H18', 'Hazırlık-A', 'Haftada birkaç gün'], ['H19', 'Hazırlık-A', 'Her gün'], ['H20', 'Hazırlık-A', 'Haftada birkaç gün'],
          ['H21', 'Hazırlık-B', 'Her gün'], ['H22', 'Hazırlık-B', 'Hiç'], ['H23', 'Hazırlık-B', 'Haftada birkaç gün'], ['H24', 'Hazırlık-B', 'Her gün'],
          ['H25', 'Hazırlık-B', 'Her gün'], ['H26', 'Hazırlık-B', 'Her gün'], ['H27', 'Hazırlık-B', 'Hiç'], ['H28', 'Hazırlık-B', 'Haftada birkaç gün'],
          ['H29', 'Hazırlık-B', 'Her gün'], ['H30', 'Hazırlık-B', 'Haftada birkaç gün'], ['H31', 'Hazırlık-B', 'Her gün'], ['H32', 'Hazırlık-B', 'Her gün'],
          ['H33', 'Hazırlık-B', 'Hiç'], ['H34', 'Hazırlık-B', 'Haftada birkaç gün'], ['H35', 'Hazırlık-B', 'Haftada birkaç gün'], ['H36', 'Hazırlık-B', 'Her gün'],
          ['H37', 'Hazırlık-B', 'Her gün'], ['H38', 'Hazırlık-B', 'Haftada birkaç gün'], ['H39', 'Hazırlık-B', 'Hiç'], ['H40', 'Hazırlık-B', 'Her gün'],
        ],
        ['etiket', 'etiket', 'etiket'],
      ),
  },
  {
    id: 'harclik',
    ad: 'Kantin harcaması: Ortalama neyi anlatıyor?',
    konu: 'sinifH',
    sinif: 'H',
    kazanim: ['MAT.H.5.1'],
    aciklama: 'Haberde "Öğrenciler kantinde günde ortalama 130 TL harcıyor" yazıyor. Noktalara bakın: Tipik öğrenci bu mu?',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Harcama (TL)',
    daire: 'uygunDegil',
    hassas: true,
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false } },
    hikaye: {
      arastirmaSorusu: 'Hazırlık sınıfı öğrencilerinin bir okul gününde kantinde yaptıkları harcamaların dağılımı nasıldır?',
      kim: 'Hazırlık sınıflarından kurayla seçilen 20 öğrenci',
      neZaman: 'Kasım 2025, bir salı günü',
      nasil: 'Öğrenciler o gün kantinde harcadıkları tutarı anonim olarak yazdı; tutarlar 10 TL’ye yuvarlandı.',
      n: 20,
      cumle: "Hazırlık sınıflarından kurayla seçilen 20 öğrenci Kasım 2025'te bir salı günü kantinde harcadığı tutarı anonim yazdı; tutarlar 10 TL'ye yuvarlandı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal okul verisi (öz bildirim)', not: 'Haber, bu tablonun aritmetik ortalamasını yazmış.' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Haber "günde ortalama 130 TL" diyor. Sence öğrencilerin çoğu 130 TL’ye yakın mı harcıyor? Tahmin et.',
        cevap: 'Hayır: 20 öğrenciden 18’i 130 TL ya da daha az harcadı; 16’sı 50 ile 120 TL arasında. İki öğrencinin 450 ve 650 TL’lik harcaması ortalamayı yukarı çekiyor.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Noktalardan hangileri ötekilerden çok ayrılıyor?',
        cevap: '450 ve 650 TL: Öteki 18 öğrencinin hepsi 40 ile 130 TL arasında.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Aritmetik ortalama ve Ortanca düğmelerini aç. İkisi arasında ne kadar fark var?',
        cevap: 'Aritmetik ortalama 130 TL, ortanca 85 TL: Fark 45 TL. Öğrencilerin yarısı 85 TL’den az harcadı.',
        eylem: { tur: 'secenek', ac: ['ortalama', 'ortanca'], etiket: 'Aritmetik ortalama ve ortancayı aç', gerektirir: 'ortanca' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: '"Öğrenciler günde ortalama 130 TL harcıyor" cümlesi yanlış mı? Haber hangi ölçüyü de vermeliydi?',
        cevap: 'Hesap doğru ama yanıltıcı: 20 öğrenciden 18’i 130 TL ya da daha az harcadı. Tipik öğrenciyi ortanca (85 TL) daha iyi anlatır; haber ortancayı ve iki büyük harcamanın etkisini de yazmalıydı.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      sutun: 'Her sütun bir öğrenci: 450 ve 650 TL’lik iki sütun ötekilerin yanında çok uzun.',
      cizgi: '',
      daire: 'Harcamalar paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
      istatistik: 'Hesaplama adımlarında 450 ve 650 TL’nin toplamı nasıl büyüttüğüne bakın; standart sapma da bu yüzden büyük.',
    },
    ogretmenNotu: 'İki büyük harcama çıkarılınca aritmetik ortalama 130 TL’den yaklaşık 83 TL’ye, ortanca 85 TL’den 80 TL’ye iner: Ortanca bu iki değerden çok az etkilenir. Standart sapma yaklaşık 149 TL; iki değer çıkınca yaklaşık 26 TL. Tartışma: Haberi yazan kişi hangi ölçüyü seçerek neyi vurgulamış? İki büyük harcamanın nedeni (arkadaşlara ikram) sorulmadan değer silinmeli mi? Harcama hassas bir bilgidir: Tabloda kod var.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Harcama (TL)'],
        [
          ['H01', 80], ['H02', 60], ['H03', 120], ['H04', 40], ['H05', 90], ['H06', 450], ['H07', 70], ['H08', 50], ['H09', 100], ['H10', 80],
          ['H11', 130], ['H12', 60], ['H13', 110], ['H14', 50], ['H15', 650], ['H16', 90], ['H17', 70], ['H18', 120], ['H19', 80], ['H20', 100],
        ],
      ),
  },
  // ── 9. sınıf · Tek nicel değişken: dağılım, merkezî eğilim ve yayılım ───────────────────────────────────────
  {
    id: 'uyku',
    ad: '9-A öğrencilerinin okul gecesi uyku süresi',
    konu: 'sinif9',
    sinif: 9,
    kazanim: ['MAT.9.6.1'],
    aciklama: 'Rehberlik servisi okul gecelerinde en az 8 saat uyku öneriyor. Sınıfın uyku süreleri nasıl dağılmış?',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Uyku (saat)',
    daire: 'uygunDegil',
    hassas: true,
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false, standartSapma: false }, aralik: 0.5 },
    hikaye: {
      arastirmaSorusu: '9-A sınıfı öğrencilerinin okul gecelerinde uyudukları sürelerin dağılımı nasıldır?',
      kim: "9-A'daki 30 öğrenci",
      neZaman: 'Aralık 2025, bir okul haftası',
      nasil: 'Her öğrenci beş okul gecesinde yattığı ve kalktığı saati uyku günlüğüne yazdı; beş gecenin ortalaması yarım saate yuvarlandı.',
      n: 30,
      cumle: "9-A'daki 30 öğrenci Aralık 2025'te beş okul gecesi boyunca yatma ve kalkma saatlerini yazdı; her öğrencinin ortalama uyku süresi yarım saate yuvarlandı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi (uyku günlüğü)' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Sınıfta okul gecelerinde en az 8 saat uyuyan kaç öğrenci vardır? Tahmin et.',
        cevap: '30 öğrenciden yalnız 6’sı 8 saat ya da daha fazla uyuyor: Sınıfın beşte biri. Öğrencilerin çoğu 6 ile 7,5 saat arasında uyuyor.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Noktalar en çok hangi değerde yığılmış? En kısa ve en uzun uyku kaç saat?',
        cevap: '7 saatte (8 öğrenci). En kısa uyku 5, en uzun 9 saat; açıklık 4 saat.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Aritmetik ortalama, Ortanca ve Standart sapma düğmelerini aç. Uyku süreleri ortalamanın çevresinde ne kadar yayılmış?',
        cevap: 'Aritmetik ortalama da ortanca da 7 saat; standart sapma yaklaşık 0,9 saat. 30 öğrenciden 26’sı ortalamaya en çok 1 saat uzaklıkta, 6 ile 8 saat arasında.',
        eylem: { tur: 'secenek', ac: ['ortalama', 'ortanca', 'standartSapma'], etiket: 'Ortalama, ortanca ve standart sapmayı aç', gerektirir: 'ortanca' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Bir öğretmen "Sınıfın ortalaması 7 saat, uyku sorunu yok" diyor. Bu karara katılır mısın?',
        cevap: 'Katılmam: Öneri en az 8 saat ve 30 öğrenciden 24’ü bunun altında uyuyor. Ortalama tek başına kaç öğrencinin öneriyi karşılamadığını göstermez; dağılıma bakmak gerekir.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      sutun: 'Histogram düğmesine basın: Uyku süreleri eşit genişlikli sınıflarda. En çok veri hangi sınıfta?',
      cizgi: '',
      daire: 'Uyku süreleri paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
      istatistik: 'Çeyrekler açıklığı ve standart sapma yayılımı iki farklı yoldan ölçer; hesaplama adımlarında standart sapmanın bulunuşunu izleyin.',
    },
    ogretmenNotu: 'Aritmetik ortalama, ortanca ve tepe değer 7 saat: Dağılım simetriğe yakın. Standart sapma (örneklem, veri sayısı − 1) yaklaşık 0,89 saat; ortalama mutlak sapma yaklaşık 0,67 saat. Karar sorusu: "Ortalama 7 saat" bilgisi, en az 8 saat uyuyanların oranını (%20) söylemez. Uyku süresi öz bildirimdir; öğrenciler yatma saatini olduğundan erken yazabilir. Uyku hassas bir bilgidir: Tabloda kod var.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Uyku (saat)'],
        [
          ['9A-01', 6], ['9A-02', 7], ['9A-03', 7.5], ['9A-04', 6.5], ['9A-05', 8], ['9A-06', 5.5], ['9A-07', 7], ['9A-08', 7], ['9A-09', 6.5], ['9A-10', 8.5],
          ['9A-11', 7], ['9A-12', 6], ['9A-13', 7.5], ['9A-14', 9], ['9A-15', 6.5], ['9A-16', 7], ['9A-17', 5], ['9A-18', 7.5], ['9A-19', 8], ['9A-20', 6.5],
          ['9A-21', 7], ['9A-22', 6], ['9A-23', 7.5], ['9A-24', 8], ['9A-25', 6.5], ['9A-26', 7], ['9A-27', 8], ['9A-28', 6], ['9A-29', 7], ['9A-30', 7.5],
        ],
      ),
  },
  {
    id: 'sarkac',
    ad: 'Fizik laboratuvarı: Sarkacın 10 salınım süresi',
    konu: 'sinif9',
    sinif: 9,
    kazanim: ['MAT.9.6.1', 'MAT.9.6.2'],
    aciklama: 'Aynı sarkacın 10 salınımı 20 kez ölçüldü. Ölçümlerden biri ötekilerden çok ayrılıyor: Hangi değer raporlanmalı?',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Süre (s)',
    daire: 'uygunDegil',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false }, aralik: 0.1 },
    hikaye: {
      arastirmaSorusu: 'Aynı sarkacın 10 salınımı için ölçülen sürelerin dağılımı nasıldır ve sarkacın periyodu için hangi değer raporlanmalıdır?',
      kim: "9-B'deki beş laboratuvar grubu (20 ölçüm)",
      neZaman: 'Şubat 2026, fizik laboratuvarı',
      nasil: 'Her grup sarkacı aynı açıdan bıraktı ve 10 tam salınımın süresini kronometreyle dört kez ölçtü; süreler saniyenin onda birine yuvarlandı.',
      n: 20,
      cumle: "9-B'deki beş grup Şubat 2026'da aynı sarkacın 10 salınımının süresini kronometreyle dörder kez ölçtü; süreler saniyenin onda birine yuvarlandı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal laboratuvar verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Aynı sarkaç, aynı ölçme: Bütün ölçümler aynı mı çıkar? Ölçümler ne kadar farklı olabilir? Tahmin et.',
        cevap: 'Aynı çıkmaz: Kronometreye basma anı her seferinde biraz değişir. Ölçümlerin 19’u 14,1 ile 14,6 saniye arasında; biri 15,7 saniye.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Ötekilerden çok ayrılan ölçüm hangisi? Ne olmuş olabilir?',
        cevap: '10. ölçüm: 15,7 s. Öteki ölçümlerden yaklaşık 1,4 s fazla; bu da yaklaşık bir salınımın süresi. Grup büyük olasılıkla 11 salınım saydı.',
        eylem: { tur: 'satirVurgula', satir: '10. ölçüm', etiket: '10. ölçümü göster' },
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Aritmetik ortalama ve Ortanca düğmelerini aç. 10. ölçüm olmasaydı hangisi değişirdi?',
        cevap: 'Bütün ölçümlerle aritmetik ortalama 14,37 s, ortanca 14,3 s. 10. ölçüm çıkarılınca ortalama 14,3 s’ye iner, ortanca 14,3 s kalır: Ortanca bu ölçümden etkilenmez.',
        eylem: { tur: 'secenek', ac: ['ortalama', 'ortanca'], etiket: 'Aritmetik ortalama ve ortancayı aç', gerektirir: 'ortanca' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Bir grup "Sarkacın periyodu 1,437 s" yazdı. Bu sonuca katılır mısın? Sen hangi değeri raporlardın?',
        cevap: '1,437 s, hatalı ölçümü de içeren ortalamanın onda biri. Hatalı ölçüm çıkarılınca 10 salınım 14,3 s, yani periyot yaklaşık 1,43 s. Ölçümler saniyenin onda birine yuvarlandığı için üç ondalık basamak yazmak da yanıltıcı bir kesinlik verir.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      sutun: 'Her sütun bir ölçüm; 10. ölçümün sütunu ötekilerden belirgin biçimde uzun.',
      cizgi: 'Ölçüm sırasıyla süreler: Çizgi 10. ölçümde sıçrıyor, sonra eski düzeyine dönüyor.',
      daire: 'Süreler paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
      istatistik: 'Standart sapma bütün ölçümlerle yaklaşık 0,33 s; 10. ölçüm silinince yaklaşık 0,12 s olur.',
    },
    ogretmenNotu: 'Başka bir grubun sonucu ("1,437 s") veriyle tartışılır (MAT.9.6.2). 10 salınım ölçmek, tek salınımdaki tepki süresi hatasını 10’a böler. Bir ölçümü atmak için gerekçe gerekir (burada sayım hatası); "işimize gelmeyen değeri silmek" ile karıştırılmamalı. 10. ölçüm silinince standart sapma yaklaşık 0,33 s’den 0,12 s’ye, açıklık 1,6 s’den 0,5 s’ye iner.',
    olustur: () =>
      tabloOlustur(
        ['Ölçüm', 'Süre (s)'],
        [
          ['1. ölçüm', 14.2], ['2. ölçüm', 14.4], ['3. ölçüm', 14.3], ['4. ölçüm', 14.3], ['5. ölçüm', 14.2], ['6. ölçüm', 14.5], ['7. ölçüm', 14.2],
          ['8. ölçüm', 14.3], ['9. ölçüm', 14.2], ['10. ölçüm', 15.7], ['11. ölçüm', 14.4], ['12. ölçüm', 14.3], ['13. ölçüm', 14.3], ['14. ölçüm', 14.2],
          ['15. ölçüm', 14.6], ['16. ölçüm', 14.3], ['17. ölçüm', 14.1], ['18. ölçüm', 14.2], ['19. ölçüm', 14.4], ['20. ölçüm', 14.3],
        ],
      ),
  },
  {
    id: 'mekik',
    ad: '9-A ve 9-B: 20 metre mekik koşusu',
    konu: 'sinif9',
    sinif: 9,
    kazanim: ['MAT.9.6.1', 'MAT.9.6.2'],
    aciklama: 'İki sınıfın tur sayılarını tek grafikte karşılaştırın: Hangi sınıfın sonuçları birbirine daha yakın?',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Tur sayısı',
    renkDegisken: 'Sınıf',
    grupla: 'Sınıf',
    daire: 'uygunDegil',
    hassas: true,
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false } },
    hikaye: {
      arastirmaSorusu: '9-A ve 9-B öğrencilerinin 20 metre mekik koşusunda tamamladıkları tur sayılarının dağılımları nasıldır?',
      kim: "9-A ve 9-B'den 15'er öğrenci (30 kişi)",
      neZaman: 'Ekim 2025, beden eğitimi dersi',
      nasil: 'Öğrenciler sinyal sesleri arasında 20 metrelik yolu koştu, sese yetişemeyince bıraktı; tamamlanan tur sayısı yazıldı.',
      n: 30,
      cumle: "9-A ve 9-B'den 30 öğrenci Ekim 2025'te beden eğitimi dersinde 20 metre mekik koşusu yaptı; her öğrencinin tamamladığı tur sayısı yazıldı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Hangi sınıfın ortalaması daha yüksektir? Hangi sınıfın sonuçları daha çok yayılmıştır? Tahmin et.',
        cevap: '9-B’nin ortalaması biraz daha yüksek: 44’e karşı 42 tur. Asıl fark yayılımda; 9-A’da 22 tur koşan da 64 tur koşan da var.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Tek grafikte iki sınıfın noktalarına bak: Hangi sınıfın noktaları daha geniş bir aralığa yayılmış?',
        cevap: '9-A: 22 ile 64 tur arası, açıklık 42. 9-B: 37 ile 52 tur arası, açıklık 15.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: "Nokta grafiğinde Kutu grafiği düğmesine bas, sonra İstatistik'te Gruplara göre (Sınıf) tabloya bak. İki sınıfın yayılımı nasıl?",
        cevap: '9-A’nın kutusu 33 ile 52 tur arasında (çeyrekler açıklığı 19), 9-B’ninki 41 ile 47 tur arasında (6). Standart sapmalar yaklaşık 12 ve 4,1 tur: 9-B’nin sonuçları ortalamaya çok daha yakın.',
        eylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'Gruplara göre tabloyu aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Bir öğrenci "9-A daha iyi koşuyor, en yüksek tur onlarda" diyor. Bu yoruma katılır mısın?',
        cevap: 'Katılmam: Tek bir öğrencinin 64 turu sınıfı anlatmaz. 9-A’da hem çok iyi koşan hem çok zorlanan öğrenciler var; 9-B daha dengeli ve ortalaması daha yüksek. 45 tur ve üzerini iki sınıfta da 6’şar öğrenci koştu.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      sutun: 'Histogram düğmesine basın: İki sınıfın sütunları her sınıf aralığında yan yana. 9-A’nın sonuçları daha çok aralığa dağılmış.',
      cizgi: '',
      daire: 'Tur sayıları paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
      istatistik: 'Gruplara göre (Sınıf) tabloda iki sınıfın ortalaması, açıklığı ve standart sapması yan yana.',
    },
    ogretmenNotu: 'Ortalamalar yakın (42 ve 44 tur), yayılımlar çok farklı: Standart sapma yaklaşık 12 ve 4,1 tur, açıklık 42 ve 15 tur. Ortancalar 40 ve 44 tur. Tartışma: "En yüksek değer kimde?" sorusu bir dağılımı anlatmaya yetmez (MAT.9.6.2). Okul takımı için bireyler mi seçilecek, bütün grup mu değerlendirilecek? Karar sorusu ölçünün seçimini değiştirir.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Sınıf', 'Tur sayısı'],
        [
          ['9A-01', '9-A', 28], ['9A-02', '9-A', 52], ['9A-03', '9-A', 35], ['9A-04', '9-A', 64], ['9A-05', '9-A', 40],
          ['9A-06', '9-A', 33], ['9A-07', '9-A', 47], ['9A-08', '9-A', 22], ['9A-09', '9-A', 55], ['9A-10', '9-A', 38],
          ['9A-11', '9-A', 44], ['9A-12', '9-A', 30], ['9A-13', '9-A', 58], ['9A-14', '9-A', 36], ['9A-15', '9-A', 48],
          ['9B-01', '9-B', 42], ['9B-02', '9-B', 46], ['9B-03', '9-B', 39], ['9B-04', '9-B', 48], ['9B-05', '9-B', 44],
          ['9B-06', '9-B', 41], ['9B-07', '9-B', 50], ['9B-08', '9-B', 43], ['9B-09', '9-B', 37], ['9B-10', '9-B', 45],
          ['9B-11', '9-B', 47], ['9B-12', '9-B', 40], ['9B-13', '9-B', 52], ['9B-14', '9-B', 44], ['9B-15', '9-B', 42],
        ],
        ['etiket', 'etiket', 'sayi'],
      ),
  },
  // ── 10. sınıf · İki kategorik değişken: göreli sıklık ve ilişkililik ──────────────────────────────────────
  {
    id: 'okulyolu',
    ad: 'Ev-okul uzaklığı ve okula geliş biçimi',
    konu: 'sinif10',
    sinif: 10,
    kazanim: ['MAT.10.2.1'],
    aciklama: 'İki kategorik değişken: Okula yakın oturanlar ile uzak oturanlar okula aynı biçimde mi geliyor?',
    onerilenGrafik: 'sutun',
    varsayilanDegisken: 'Geliş biçimi',
    renkDegisken: 'Uzaklık',
    kategoriSirasi: { 'Geliş biçimi': ['Yürüyerek', 'Toplu taşımayla', 'Servisle'], Uzaklık: ["2 km'ye kadar", "2 km'den fazla"] },
    daire: 'siklik',
    hassas: true,
    acilis: { sekme: 'sutun' },
    hikaye: {
      arastirmaSorusu: '10-A ve 10-B öğrencilerinin evlerinin okula uzaklığı ile okula geliş biçimleri arasında bir ilişki var mıdır?',
      kim: "10-A ve 10-B'den 20'şer öğrenci (40 kişi)",
      neZaman: 'Eylül 2025',
      nasil: 'Öğrenciler evlerinin okula uzaklığını harita uygulamasıyla ölçüp iki gruptan birini, okula en sık geliş biçimini de üç seçenekten birini işaretledi.',
      n: 40,
      cumle: "10-A ve 10-B'den 40 öğrenci Eylül 2025'te evlerinin okula uzaklığını ve okula en sık nasıl geldiklerini ankette işaretledi.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal okul verisi', not: 'İki uzaklık grubu farklı büyüklükte (16 ve 24 öğrenci); karşılaştırma oranlarla yapılır.' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Okula 2 km’den uzak oturanlar ile yakın oturanlar okula aynı biçimde mi gelir? Tahmin et.',
        cevap: 'Hayır: Yakın oturan 16 öğrenciden 11’i yürüyor, uzak oturan 24 öğrenciden 22’si toplu taşımayla ya da servisle geliyor.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Sütun grafiğinde her geliş biçiminde iki uzaklık grubunun sütunları yan yana. Yürüyerek gelenlerde hangi grup çoğunlukta?',
        cevap: 'Yürüyerek gelen 13 öğrencinin 11’i 2 km’ye kadar uzaklıkta oturuyor. Toplu taşımayla ve servisle gelenlerin çoğu uzak oturuyor.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: "İstatistik'te Koşullu göreli sıklıklar tablosuna bak (her Uzaklık grubunda). Her grupta yürüyerek gelenlerin yüzdesi kaç?",
        cevap: 'Yakın oturanlarda 11/16, yani %68,8; uzak oturanlarda 2/24, yani %8,3. Gruplar farklı büyüklükte (16 ve 24) olduğu için sayıları değil grup içindeki yüzdeleri karşılaştırmak gerekir.',
        eylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'Sıklık tablosunu aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Uzaklık ile geliş biçimi arasında ilişki var mı? Okul servisi için bir öneri yaz.',
        cevap: 'Var: Uzaklık grubu değişince geliş biçimlerinin koşullu göreli sıklıkları çok değişiyor (yürüyenler %68,8’den %8,3’e düşüyor). Uzak oturanların yaklaşık %91,7’si toplu taşıma ya da servis kullanıyor; servis güzergâhı uzak mahallelere göre planlanabilir. Yine de 40 öğrenci yalnız iki şubeyi anlatır.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Her nokta bir öğrencinin cevabı; renkler uzaklık grubunu gösterir.',
      daire: 'İç daire geliş biçimleri, dış halka her dilimdeki uzaklık gruplarının payı.',
      istatistik: 'Koşullu göreli sıklıklar tablosunda her uzaklık grubunun sütunu %100: Geliş biçimlerini grup içindeki yüzdelerle karşılaştırın.',

    },
    ogretmenNotu: 'İki kategorik değişkenin ilişkisi göreli sıklıklarla incelenir (MAT.10.2.1). Gruplar farklı büyüklükte olduğu için sayılar yanıltabilir: Toplu taşımayla gelenler uzak oturanlarda 12, yakın oturanlarda 3 kişi; oranlar %50 ve %18,75. Tabloyu yüzdeye çevirmeyi tahtada birlikte yapın. Tartışma: Uzaklık geliş biçimini etkiler mi, yoksa başka bir değişken (ailenin aracı, otobüs güzergâhı) da rol oynar mı?',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Uzaklık', 'Geliş biçimi'],
        [
          ['10A-01', "2 km'ye kadar", 'Toplu taşımayla'], ['10A-02', "2 km'ye kadar", 'Yürüyerek'], ['10A-03', "2 km'den fazla", 'Toplu taşımayla'], ['10A-04', "2 km'ye kadar", 'Toplu taşımayla'],
          ['10A-05', "2 km'ye kadar", 'Yürüyerek'], ['10A-06', "2 km'ye kadar", 'Yürüyerek'], ['10A-07', "2 km'den fazla", 'Servisle'], ['10A-08', "2 km'ye kadar", 'Yürüyerek'],
          ['10A-09', "2 km'den fazla", 'Toplu taşımayla'], ['10A-10', "2 km'ye kadar", 'Yürüyerek'], ['10A-11', "2 km'ye kadar", 'Yürüyerek'], ['10A-12', "2 km'den fazla", 'Toplu taşımayla'],
          ['10A-13', "2 km'den fazla", 'Toplu taşımayla'], ['10A-14', "2 km'den fazla", 'Servisle'], ['10A-15', "2 km'ye kadar", 'Toplu taşımayla'], ['10A-16', "2 km'den fazla", 'Toplu taşımayla'],
          ['10A-17', "2 km'den fazla", 'Toplu taşımayla'], ['10A-18', "2 km'ye kadar", 'Yürüyerek'], ['10A-19', "2 km'den fazla", 'Yürüyerek'], ['10A-20', "2 km'ye kadar", 'Yürüyerek'],
          ['10B-01', "2 km'den fazla", 'Servisle'], ['10B-02', "2 km'ye kadar", 'Servisle'], ['10B-03', "2 km'den fazla", 'Servisle'], ['10B-04', "2 km'den fazla", 'Toplu taşımayla'],
          ['10B-05', "2 km'den fazla", 'Servisle'], ['10B-06', "2 km'den fazla", 'Toplu taşımayla'], ['10B-07', "2 km'den fazla", 'Yürüyerek'], ['10B-08', "2 km'den fazla", 'Servisle'],
          ['10B-09', "2 km'den fazla", 'Servisle'], ['10B-10', "2 km'den fazla", 'Toplu taşımayla'], ['10B-11', "2 km'den fazla", 'Toplu taşımayla'], ['10B-12', "2 km'ye kadar", 'Yürüyerek'],
          ['10B-13', "2 km'den fazla", 'Servisle'], ['10B-14', "2 km'den fazla", 'Toplu taşımayla'], ['10B-15', "2 km'ye kadar", 'Yürüyerek'], ['10B-16', "2 km'den fazla", 'Toplu taşımayla'],
          ['10B-17', "2 km'ye kadar", 'Servisle'], ['10B-18', "2 km'den fazla", 'Servisle'], ['10B-19', "2 km'den fazla", 'Servisle'], ['10B-20', "2 km'ye kadar", 'Yürüyerek'],
        ],
        ['etiket', 'etiket', 'etiket'],
      ),
  },
  {
    id: 'telefon',
    ad: 'Ders çalışırken telefon ve ödevi zamanında bitirme',
    konu: 'sinif10',
    sinif: 10,
    kazanim: ['MAT.10.2.1', 'MAT.10.2.2'],
    aciklama: 'Telefonu başka odada bırakanlar ödevini daha mı sık zamanında bitiriyor? Grupların büyüklüğüne dikkat edin.',
    onerilenGrafik: 'sutun',
    varsayilanDegisken: 'Ödev zamanında bitti',
    renkDegisken: 'Telefonun yeri',
    kategoriSirasi: { 'Ödev zamanında bitti': ['Evet', 'Hayır'], 'Telefonun yeri': ['Masada', 'Başka odada'] },
    daire: 'siklik',
    hassas: true,
    acilis: { sekme: 'sutun' },
    hikaye: {
      arastirmaSorusu: '10. sınıf öğrencilerinin ders çalışırken telefonlarını nerede tuttukları ile ödevlerini zamanında bitirmeleri arasında bir ilişki var mıdır?',
      kim: 'Dört 10. sınıf şubesinden gönüllü 50 öğrenci',
      neZaman: 'Mart 2026, bir okul haftası',
      nasil: 'Öğrenciler hafta boyunca ödev yaparken telefonun çoğunlukla nerede durduğunu ve haftanın ödevini zamanında bitirip bitirmediğini anonim ankete yazdı.',
      n: 50,
      cumle: "Dört 10. sınıf şubesinden 50 gönüllü öğrenci Mart 2026'da bir hafta boyunca ödev yaparken telefonun nerede durduğunu ve ödevi zamanında bitirip bitirmediğini anonim ankete yazdı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal okul verisi (öz bildirim anketi)', not: 'Katılım gönüllü: Ankete katılanlar bütün öğrencileri temsil etmeyebilir.' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Ödevini zamanında bitirenlerin çoğunun telefonu masada mı, başka odada mı? Tahmin et.',
        cevap: 'Zamanında bitiren 31 öğrencinin 15’inin telefonu masada, 16’sınınki başka odada: Sayılar neredeyse eşit. Ama telefonu masada olanlar daha kalabalık bir grup (30’a karşı 20).',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Sütun grafiğinde "Evet" ve "Hayır" için iki grubun sütunlarına bak. Ödevini bitiremeyenler en çok hangi grupta?',
        cevap: 'Telefonu masada olanlarda: 15 öğrenci bitiremedi. Telefonu başka odada olanlarda yalnız 4 öğrenci bitiremedi. Grup içinde yüzde düğmesi gruplar farklı büyüklükteyken karşılaştırmayı adil yapar.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: "İstatistik'te Koşullu göreli sıklıklar tablosuna bak (her telefon yeri grubunda). Ödevini zamanında bitirenler yüzde kaç?",
        cevap: 'Telefonu masada olanlarda 15/30, yani %50; başka odada olanlarda 16/20, yani %80. Koşullu göreli sıklıklar arasında 30 puanlık fark var: İki değişken ilişkili görünüyor.',
        eylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'Koşullu göreli sıklıkları aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Okul gazetesi "Telefon ödevi bitirmeyi engelliyor" diye yazdı. Bu veri bu sonucu kanıtlar mı?',
        cevap: 'Kanıtlamaz: Veri iki değişkenin ilişkili olduğunu gösteriyor, neden-sonuç ilişkisini değil. Düzenli çalışan öğrenciler telefonu zaten başka odaya koyuyor olabilir. Cevaplar öz bildirim ve katılımcılar gönüllü; neden-sonuç için deney gerekir.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Her nokta bir öğrencinin cevabı; renkler telefonun nerede durduğunu gösterir.',
      daire: 'İç daire "Evet" ve "Hayır", dış halka her dilimde telefonun yerine göre paylar.',
      istatistik: 'Koşullu göreli sıklıklar tablosunda her telefon yeri grubunun sütunu %100; gruplar 30 ve 20 öğrenci.',
    },
    ogretmenNotu: 'Başkasının vardığı sonucu ("telefon engelliyor") veriyle tartışma (MAT.10.2.2). Sayılar (15 ve 16) neredeyse eşitken oranlar (%50 ve %80) çok farklı: Grup büyüklükleri farklıyken göreli sıklık gerekir. Tartışma: Üçüncü bir değişken (çalışma alışkanlığı) iki değişkeni birlikte etkiliyor olabilir mi? Bunu sınamak için nasıl bir deney tasarlanır?',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Telefonun yeri', 'Ödev zamanında bitti'],
        [
          ['T01', 'Başka odada', 'Evet'], ['T02', 'Masada', 'Evet'], ['T03', 'Masada', 'Evet'], ['T04', 'Masada', 'Evet'],
          ['T05', 'Başka odada', 'Evet'], ['T06', 'Masada', 'Evet'], ['T07', 'Masada', 'Evet'], ['T08', 'Masada', 'Hayır'],
          ['T09', 'Masada', 'Evet'], ['T10', 'Başka odada', 'Hayır'], ['T11', 'Başka odada', 'Evet'], ['T12', 'Başka odada', 'Evet'],
          ['T13', 'Masada', 'Hayır'], ['T14', 'Masada', 'Evet'], ['T15', 'Masada', 'Hayır'], ['T16', 'Masada', 'Hayır'],
          ['T17', 'Başka odada', 'Evet'], ['T18', 'Başka odada', 'Evet'], ['T19', 'Başka odada', 'Evet'], ['T20', 'Masada', 'Evet'],
          ['T21', 'Masada', 'Hayır'], ['T22', 'Başka odada', 'Hayır'], ['T23', 'Masada', 'Hayır'], ['T24', 'Başka odada', 'Evet'],
          ['T25', 'Masada', 'Hayır'], ['T26', 'Başka odada', 'Evet'], ['T27', 'Masada', 'Hayır'], ['T28', 'Masada', 'Hayır'],
          ['T29', 'Başka odada', 'Evet'], ['T30', 'Masada', 'Evet'], ['T31', 'Masada', 'Evet'], ['T32', 'Masada', 'Evet'],
          ['T33', 'Masada', 'Hayır'], ['T34', 'Masada', 'Hayır'], ['T35', 'Masada', 'Evet'], ['T36', 'Masada', 'Hayır'],
          ['T37', 'Masada', 'Evet'], ['T38', 'Masada', 'Evet'], ['T39', 'Masada', 'Hayır'], ['T40', 'Başka odada', 'Evet'],
          ['T41', 'Başka odada', 'Hayır'], ['T42', 'Başka odada', 'Evet'], ['T43', 'Masada', 'Hayır'], ['T44', 'Başka odada', 'Evet'],
          ['T45', 'Başka odada', 'Hayır'], ['T46', 'Başka odada', 'Evet'], ['T47', 'Masada', 'Hayır'], ['T48', 'Başka odada', 'Evet'],
          ['T49', 'Başka odada', 'Evet'], ['T50', 'Masada', 'Evet'],
        ],
        ['etiket', 'etiket', 'etiket'],
      ),
  },
  // ── 11. sınıf · İki nicel değişken: birlikte değişme ve ilişkililik ───────────────────────────────────────
  // Saçılım grafiği 11. ve 12. sınıfta açık (MAT.11.1.1 süreç bileşeni: tablo, saçılım grafiği, bölgelere göre sayım
  // oranı, korelasyon katsayısı). Açılış sekmesi Saçılım; Ortalama çizgileri düğmesi dört bölgeyi sayar.
  {
    id: 'kulac',
    ad: 'Boy ve kulaç uzunluğu',
    konu: 'sinif11',
    sinif: 11,
    kazanim: ['MAT.11.1.1'],
    aciklama: 'Boyu uzun olanın kulacı da mı uzun? Her nokta bir öğrenci: Noktaların nasıl dizildiğine bakın.',
    onerilenGrafik: 'sacilim',
    varsayilanDegisken: 'Boy (cm)',
    daire: 'uygunDegil',
    hassas: true,
    acilis: { sekme: 'sacilim' },
    hikaye: {
      arastirmaSorusu: '11-A öğrencilerinin boy uzunlukları ile kulaç uzunlukları arasında nasıl bir ilişki vardır?',
      kim: "11-A'daki 20 öğrenci",
      neZaman: 'Ocak 2026, beden eğitimi dersi',
      nasil: 'Boy duvar boy ölçerle, kulaç kollar yana açıkken iki orta parmak ucu arasından şerit metreyle ölçüldü; santimetreye yuvarlandı. Tablo boya göre sıralı.',
      n: 20,
      cumle: "11-A'daki 20 öğrencinin boyu ve kulacı Ocak 2026'da beden eğitimi dersinde ölçüldü ve santimetreye yuvarlandı; tablo boya göre sıralı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Kulaç uzunluğu boydan uzun mu, kısa mı, yoksa yaklaşık eşit mi? Tahmin et.',
        cevap: 'Yaklaşık eşit: 20 öğrencinin hepsinde fark en çok 4 cm. 12 öğrencinin kulacı boyundan biraz uzun, 6’sınınki biraz kısa, 2’sinde ikisi eşit.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Saçılım grafiğinde noktalar nasıl diziliyor?',
        cevap: 'Sol alttan sağ üste, neredeyse bir doğru boyunca: Boy uzadıkça kulaç da uzuyor. Noktalar bu doğruya çok yakın olduğu için ilişki çok güçlü.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Ortalama çizgileri düğmesine bas. Dört bölgede kaçar nokta var? Korelasyon katsayısı kaç?',
        cevap: 'Sağ üstte 9, sol altta 10 nokta; öteki iki bölge boş, bir nokta çizginin üstünde. Korelasyon katsayısı r = 0,98: Güçlü, pozitif bir ilişki.',
        eylem: { tur: 'yok', etiket: 'Ortalama çizgilerini aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Bir öğrencinin kulacı 172 cm. Boyunu tahmin edebilir misin? Tahminin ne kadar güvenilir?',
        cevap: 'Kulaç ile boy çok sıkı ilişkili: Tahmin 172 cm civarı olur. Bu sınıfta kulaç ile boy arasındaki fark en çok 4 cm olduğu için tahmin birkaç santimetre şaşabilir; başka yaş gruplarında ilişki farklı olabilir.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Nokta grafiği tek değişkene bakar; boy ile kulacın ilişkisi için Saçılım grafiğine dönün.',
      sutun: 'Her sütun bir öğrencinin boyu; öğrenciler boya göre sıralı. Karşılaştır ile kulacı yan yana ekleyin.',
      cizgi: '',
      daire: 'Boy ve kulaç paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
      istatistik: 'Boy ve Kulaç sekmelerinde ölçüleri karşılaştırın: Aritmetik ortalamalar 173 ve yaklaşık 174 cm.',
    },
    ogretmenNotu: 'Saçılım grafiği, bölgelere göre sayım ve korelasyon katsayısı birlikte kullanılır (MAT.11.1.1). Ortalama çizgileriyle dört bölge: Sağ üst 9, sol alt 10, öteki ikisi boş; boyu ortalamaya eşit bir öğrenci (173 cm) çizginin üstünde. r yaklaşık 0,98. Standart sapmalar yaklaşık 8,8 ve 9,7 cm. Ölçümü kendi sınıfınızda yapacaksanız izin alın: Tabloda kod var.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Boy (cm)', 'Kulaç (cm)'],
        [
          ['11A-01', 158, 156], ['11A-02', 160, 162], ['11A-03', 163, 160], ['11A-04', 164, 167], ['11A-05', 165, 165],
          ['11A-06', 167, 171], ['11A-07', 168, 167], ['11A-08', 170, 171], ['11A-09', 171, 173], ['11A-10', 172, 170],
          ['11A-11', 173, 176], ['11A-12', 175, 176], ['11A-13', 176, 175], ['11A-14', 177, 181], ['11A-15', 179, 179],
          ['11A-16', 180, 182], ['11A-17', 182, 180], ['11A-18', 184, 187], ['11A-19', 186, 187], ['11A-20', 190, 194],
        ],
      ),
  },
  {
    id: 'yazili',
    ad: '1. ve 2. yazılı puanları',
    konu: 'sinif11',
    sinif: 11,
    kazanim: ['MAT.11.1.1', 'MAT.11.1.2'],
    aciklama: '1. yazılıda yüksek puan alan 2. yazılıda da yüksek mi alıyor? Noktalara ve ötekilerden ayrılan noktaya bakın.',
    onerilenGrafik: 'sacilim',
    varsayilanDegisken: '1. yazılı',
    daire: 'uygunDegil',
    hassas: true,
    acilis: { sekme: 'sacilim' },
    hikaye: {
      arastirmaSorusu: '11-B öğrencilerinin matematik dersi 1. yazılı puanları ile 2. yazılı puanları arasında nasıl bir ilişki vardır?',
      kim: "11-B'deki 24 öğrenci",
      neZaman: '2025-2026 öğretim yılı 1. dönem',
      nasil: 'Puanlar matematik öğretmeninin not çizelgesinden alındı. Tablo 1. yazılı puanına göre sıralı.',
      n: 24,
      cumle: "11-B'deki 24 öğrencinin 1. dönem matematik 1. ve 2. yazılı puanları öğretmenin not çizelgesinden alındı; tablo 1. yazılıya göre sıralı.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: '1. yazılıda yüksek puan alanlar 2. yazılıda da yüksek mi alır? Tahmin et.',
        cevap: 'Genellikle evet: 1. yazılı puanı arttıkça 2. yazılı puanı da genel olarak artıyor. Ama herkes için değil; bazı öğrencilerin puanı epey düşmüş ya da yükselmiş.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Saçılım grafiğinde ötekilerin dizilişinden en çok ayrılan noktayı bul.',
        cevap: '11B-19: 1. yazılıda 80, 2. yazılıda 62 aldı; 18 puan düşüş. Bu nokta, sol alttan sağ üste uzanan dizilişin belirgin biçimde altında.',
        eylem: { tur: 'satirVurgula', satir: '11B-19', etiket: '11B-19’u göster' },
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Ortalama çizgileri düğmesine bas. Dört bölgede kaçar nokta var? Korelasyon katsayısı kaç?',
        cevap: 'Sağ üstte 10, sol altta 10, sol üstte 2, sağ altta 2 nokta: 24 noktadan 20’si artan yöndeki iki bölgede. Korelasyon katsayısı r = 0,92: Güçlü, pozitif bir ilişki.',
        eylem: { tur: 'yok', etiket: 'Ortalama çizgilerini aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Bir öğrenci "1. yazılıda 50’nin altında alan 2. yazılıda da 50’nin altında kalır" diyor. Veri bu yorumu destekliyor mu?',
        cevap: 'Tam desteklemiyor: 1. yazılıda 50’nin altında 4 öğrenci var (35, 42, 45, 48). 2. yazılıda bunlardan ikisi 50’nin altında kaldı (45 ve 40), ikisi 55 ve 52 aldı. İki yazılı ilişkili ama bir öğrencinin puanı kesin olarak tahmin edilemez.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Nokta grafiği tek değişkene bakar; iki yazılının ilişkisi için Saçılım grafiğine dönün.',
      sutun: 'Her sütun bir öğrencinin 1. yazılı puanı; Karşılaştır ile 2. yazılıyı yan yana ekleyin.',
      cizgi: '',
      daire: 'Puanlar paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
      istatistik: 'İki yazılının ölçülerini sekmeler arasında karşılaştırın: Açıklıklar 60 ve 54 puan.',
    },
    ogretmenNotu: 'Bir öğrencinin genellemesi ("50’nin altında kalır") veriyle sınanır (MAT.11.1.2). İlişki güçlü ama kusursuz değil: r yaklaşık 0,92; bölgelere göre sayım 24 noktadan 20’si (%83) sağ üst ve sol altta. 11B-19 noktası korelasyonu düşürür; onu silip r’nin nasıl değiştiğine bakın. Puan hassas bir bilgidir: Tabloda kod var.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', '1. yazılı', '2. yazılı'],
        [
          ['11B-01', 35, 45], ['11B-02', 42, 40], ['11B-03', 45, 55], ['11B-04', 48, 52], ['11B-05', 50, 58], ['11B-06', 52, 50],
          ['11B-07', 55, 62], ['11B-08', 58, 48], ['11B-09', 60, 65], ['11B-10', 62, 60], ['11B-11', 64, 70], ['11B-12', 65, 68],
          ['11B-13', 68, 66], ['11B-14', 70, 75], ['11B-15', 72, 70], ['11B-16', 74, 78], ['11B-17', 75, 72], ['11B-18', 78, 85],
          ['11B-19', 80, 62], ['11B-20', 82, 88], ['11B-21', 85, 84], ['11B-22', 88, 90], ['11B-23', 90, 92], ['11B-24', 95, 94],
        ],
      ),
  },
  {
    id: 'ekranuyku',
    ad: 'Yatmadan önce ekran süresi ve uyku süresi',
    konu: 'sinif11',
    sinif: 11,
    kazanim: ['MAT.11.1.1', 'MAT.11.1.2'],
    aciklama: 'Farklı birimli iki değişken: Yatmadan önce ekrana bakılan süre uzadıkça uyku süresi nasıl değişiyor?',
    onerilenGrafik: 'sacilim',
    varsayilanDegisken: 'Ekran süresi (dakika)',
    daire: 'uygunDegil',
    hassas: true,
    acilis: { sekme: 'sacilim' },
    hikaye: {
      arastirmaSorusu: '11-C öğrencilerinin yatmadan önceki ekran süreleri ile uyku süreleri arasında nasıl bir ilişki vardır?',
      kim: "11-C'deki 24 öğrenci",
      neZaman: 'Kasım 2025, bir okul haftası',
      nasil: 'Öğrenciler beş okul gecesinde yatmadan önceki iki saatte ekrana baktıkları süreyi ve uyku sürelerini günlüğe yazdı; beş gecenin ortalaması alındı.',
      n: 24,
      cumle: "11-C'deki 24 öğrenci Kasım 2025'te beş okul gecesi boyunca yatmadan önceki ekran sürelerini ve uyku sürelerini günlüğe yazdı; tabloda beş gecenin ortalaması var.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf verisi (uyku günlüğü)' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Yatmadan önce ekrana daha uzun bakanlar daha mı az uyur? Tahmin et.',
        cevap: 'Bu sınıfta genellikle evet: Ekran süresi 180 dakika ve üzeri olan 6 öğrencinin 5’i 6,5 saat ya da daha az uyuyor. Ama 200 dakika ekrana bakıp 7 saat uyuyan da var.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Saçılım grafiğinde noktalar nasıl diziliyor? Eksenlerin birimleri ne?',
        cevap: 'Sol üstten sağ alta: Ekran süresi arttıkça uyku süresi genel olarak azalıyor. Yatay eksen dakika, dikey eksen saat; iki değişkenin birimi farklı.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Ortalama çizgileri düğmesine bas. Dört bölgede kaçar nokta var? Korelasyon katsayısı kaç?',
        cevap: 'Sol üstte 10, sağ altta 8, sağ üstte 5, sol altta 1 nokta: 24 noktadan 18’i (%75) azalan yöndeki iki bölgede. Korelasyon katsayısı r = −0,75: Orta güçte, negatif bir ilişki.',
        eylem: { tur: 'yok', etiket: 'Ortalama çizgilerini aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Okul gazetesi "Ekran uykuyu azaltıyor" diye yazdı. Bu veri bu sonucu kanıtlar mı?',
        cevap: 'Kanıtlamaz: Veri iki değişkenin birlikte değiştiğini gösteriyor, neden-sonuç ilişkisini değil. Geç yatan öğrenci hem ekrana daha uzun bakıyor hem daha az uyuyor olabilir. Neden-sonuç için deney gerekir; öz bildirim de yanılabilir.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Nokta grafiği tek değişkene bakar; ekran süresi ile uykunun ilişkisi için Saçılım grafiğine dönün.',
      sutun: 'Her sütun bir öğrencinin ekran süresi; iki değişkenin birimi farklı olduğu için yan yana çizilemez.',
      cizgi: '',
      daire: 'Süreler paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
      istatistik: 'Ekran süresi ve Uyku sekmelerinde ölçülere bakın: Aritmetik ortalamalar yaklaşık 118 dakika ve 7 saat.',
    },
    ogretmenNotu: 'Farklı birimli iki nicel değişken (dakika ve saat) saçılım grafiğinde birlikte çizilir; tek grafikte karşılaştırma ancak böyle olur (MAT.11.1.1). r yaklaşık −0,75; bölgelere göre sayım 24 noktadan 18’i sol üst ve sağ altta. Tartışma (MAT.11.1.2): Üçüncü bir değişken (yatma saati) iki değişkeni birlikte etkiliyor olabilir mi? Uyku hassas bir bilgidir: Tabloda kod var.',
    olustur: () =>
      tabloOlustur(
        ['Öğrenci', 'Ekran süresi (dakika)', 'Uyku (saat)'],
        [
          ['11C-01', 15, 8.5], ['11C-02', 30, 8], ['11C-03', 45, 8], ['11C-04', 60, 7.5], ['11C-05', 60, 8], ['11C-06', 75, 7.5],
          ['11C-07', 90, 7], ['11C-08', 90, 8], ['11C-09', 105, 7], ['11C-10', 120, 7], ['11C-11', 120, 6.5], ['11C-12', 135, 7],
          ['11C-13', 150, 6.5], ['11C-14', 150, 7], ['11C-15', 165, 6], ['11C-16', 180, 6.5], ['11C-17', 180, 6], ['11C-18', 195, 6],
          ['11C-19', 210, 5.5], ['11C-20', 240, 5.5], ['11C-21', 30, 7], ['11C-22', 120, 8], ['11C-23', 60, 6], ['11C-24', 200, 7],
        ],
      ),
  },
  // ── 12. sınıf · Hazır verilerle çalışma ve karar verme ──────────────────────────────────────────────────────
  {
    id: 'isinma',
    ad: 'Ankara ve Trabzon: Isınma ihtiyacı',
    konu: 'sinif12',
    sinif: 12,
    kazanim: ['MAT.12.5.1'],
    aciklama: 'Gerçek MGM verisi: Aylık ortalaması 15 °C’nin altındaki aylar ısıtma ayı sayılırsa iki şehir nasıl ayrışır?',
    onerilenGrafik: 'cizgi',
    varsayilanDegisken: 'Ankara (°C)',
    karsilastir: 'Trabzon (°C)',
    daire: 'uygunDegil',
    yuzdeDegisim: { 'Ankara (°C)': false, 'Trabzon (°C)': false },
    acilis: { sekme: 'cizgi' },
    hikaye: {
      arastirmaSorusu: "MGM'nin aynı dönemdeki (1927–2025) ölçümlerine göre Ankara ve Trabzon'da evleri ısıtma ihtiyacı yıl içinde nasıl farklılaşmaktadır?",
      kim: 'MGM Ankara ve Trabzon istasyonları',
      neZaman: 'İki istasyonda da aynı ölçüm periyodu: 1927–2025',
      nasil: 'Her ayın uzun yıllar ortalama sıcaklığı (°C); hazır veri MGM’nin il istatistikleri sayfasından alındı.',
      n: 12,
      cumle: "MGM'nin Ankara ve Trabzon istasyonlarında aynı dönemde (1927–2025) ölçülen sıcaklıklardan her ayın uzun yıllar ortalaması.",
    },
    kaynak: {
      tur: 'gercek',
      ad: 'MGM, İllerimize Ait Genel İstatistik Veriler: Ankara ve Trabzon, "Ortalama Sıcaklık (°C)" satırı',
      url: 'https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?k=A&m=ANKARA',
      url2: 'https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?k=A&m=TRABZON',
      urlAd: 'MGM: Ankara',
      url2Ad: 'Trabzon',
      erisim: '20 Ekim 2026',
    },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Aylık ortalaması 15 °C’nin altındaki aylar "ısıtma ayı" sayılsın. Ankara’da ve Trabzon’da kaçar ısıtma ayı vardır? Tahmin et.',
        cevap: 'Ankara’da 7 ay (ocak, şubat, mart, nisan, ekim, kasım, aralık), Trabzon’da 6 ay (ocak, şubat, mart, nisan, kasım, aralık).',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Çizgi grafiğinde iki şehir arasındaki fark hangi ayda en büyük, hangi ayda en küçük?',
        cevap: 'En büyük fark ocakta: 7,6 − 0,4 = 7,2 °C. En küçük fark ağustosta: 23,6 − 23,5 = 0,1 °C. Mayıs, temmuz ve ağustosta Ankara, Trabzon’dan biraz daha sıcaktır.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Her ısıtma ayının 15 °C’den ne kadar aşağıda olduğunu bul ve topla. İki şehrin toplamlarını karşılaştır.',
        cevap: 'Ankara: 14,6 + 13,2 + 9,2 + 3,7 + 1,8 + 7,6 + 12,4 = 62,5. Trabzon: 7,4 + 7,7 + 6,5 + 3,2 + 1,9 + 5,4 = 32,1. Ankara’nın toplamı Trabzon’unkinin yaklaşık 2 katı.',
        eylem: { tur: 'yok', etiket: 'Isıtma aylarının farklarını topla' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Bir yakıt firması "Ankara’da bir ev, Trabzon’dakinin 2 katı yakıt harcar" diyor. Bu hazır veriyle bu sonuca ne kadar güvenebilirsin?',
        cevap: 'Veri kaba bir karşılaştırma için uygun: Ankara’nın ısıtma ihtiyacı belirgin biçimde daha büyük. Ama yakıt tüketimi evin yalıtımına, ısıtma türüne ve günlük sıcaklıklara da bağlı; aylık ortalamalar soğuk günleri ve geceleri gizler.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Tek grafikte iki şehir: Ankara’nın noktaları daha geniş bir aralığa yayılmış.',
      sutun: 'İki şehir ay ay yan yana: 15 °C düzeyinin altında kalan sütunları sayın.',
      daire: 'Sıcaklıklar toplanıp paylaşılmaz; daire grafiği bu veri için uygun değil.',
      istatistik: 'Yıllık ortalamalar yaklaşık 12,1 °C ve 14,8 °C; standart sapmalar yaklaşık 8,5 ve 6,0 °C.',
      sacilim: 'Her nokta bir ay: İki şehir birlikte ısınıp soğuyor, noktalar bir doğrunun çevresinde; korelasyon katsayısı 1’e yakın (yaklaşık 0,97).',
    },
    ogretmenNotu: 'Gerçek MGM verisiyle karar verme (MAT.12.5.1). "15 °C altı ısıtma ayı" ölçütü bu etkinlik için seçilmiş basit bir kuraldır; mühendislikteki derece-gün hesabının aylık ve kaba bir benzeridir. Tartışma: Ölçüt 18 °C olunca ay sayıları ve oran nasıl değişir? Uzun yıllar ortalaması tek bir yılın gerçek kışını göstermez. İki istasyonun ölçüm periyodu aynıdır (1927–2025). Açıklıklar 23,2 ve 16,2 °C.',
    olustur: () =>
      tabloOlustur(
        ['Ay', 'Ankara (°C)', 'Trabzon (°C)'],
        [
          ['Ocak', 0.4, 7.6], ['Şubat', 1.8, 7.3], ['Mart', 5.8, 8.5], ['Nisan', 11.3, 11.8], ['Mayıs', 16.1, 15.9],
          ['Haziran', 20.1, 20.3], ['Temmuz', 23.5, 23.1], ['Ağustos', 23.6, 23.5], ['Eylül', 19, 20.5], ['Ekim', 13.2, 16.7],
          ['Kasım', 7.4, 13.1], ['Aralık', 2.6, 9.6],
        ],
      ),
  },
  {
    id: 'elektrik',
    ad: 'Okulun elektrik tüketimi ve güneş paneli',
    konu: 'sinif12',
    sinif: 12,
    kazanim: ['MAT.12.5.1'],
    aciklama: 'Okul idaresinin hazır tablosu: Çatıya kurulacak güneş paneli hangi aylarda okulun tüketimini karşılar?',
    onerilenGrafik: 'cizgi',
    varsayilanDegisken: 'Tüketim (kWh)',
    karsilastir: 'Panel üretimi (kWh)',
    daire: 'uygunDegil',
    acilis: { sekme: 'cizgi' },
    hikaye: {
      arastirmaSorusu: 'Okulumuzun aylık elektrik tüketimi ile çatıya kurulması düşünülen güneş panelinin tahmini üretimi yıl içinde nasıl değişmektedir?',
      kim: 'Okul idaresi: 2025 elektrik faturaları ve panel firmasının üretim tahmini',
      neZaman: '2025 yılı, aylık',
      nasil: 'Tüketim faturalardan, panel üretimi firmanın aylık tahmininden alındı; değerler 100 kWh’e yuvarlandı.',
      n: 12,
      cumle: 'Okul idaresinin hazırladığı tablo: 2025 faturalarındaki aylık elektrik tüketimi ve çatıya kurulması düşünülen güneş panelinin firma tahminine göre aylık üretimi.',
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal okul verisi (fatura ve üretim tahmini biçiminde)', not: 'Sayılar gerçek bir okula ait değildir; büyüklükleri gerçekçi aralıkta seçildi.' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Güneş paneli en çok hangi aylarda üretir? Okul en çok hangi aylarda tüketir? Tahmin et.',
        cevap: 'Panel yazın en çok üretir (temmuzda 7600 kWh). Okul ise kışın en çok tüketir (ocakta 9200 kWh): Isıtma ve aydınlatma artar, yazın okul kapalıdır.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Çizgi grafiğinde panel çizgisi hangi aylarda tüketim çizgisinin üstünde?',
        cevap: 'Haziran, temmuz ve ağustos: Bu üç ayda panelin üretimi tüketimden fazla. Öteki dokuz ayda tüketim daha büyük.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: "İstatistik'te iki değişkenin aritmetik ortalamalarını karşılaştır. Panel yıllık tüketimin yaklaşık ne kadarını karşılar?",
        cevap: 'Aylık ortalamalar yaklaşık 6692 ve 5075 kWh; yıllık toplamlar 80300 ve 60900 kWh. Panel yıllık tüketimin yaklaşık %76’sını karşılar.',
        eylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'İstatistiği aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Firma "Panel elektrik ihtiyacınızın dörtte üçünü karşılar" diyor. Okul idaresi bu hazır veriye dayanarak nasıl bir karar vermeli?',
        cevap: 'Yıllık toplamda iddia doğru (%76). Ama üretimin büyük kısmı okulun kapalı olduğu yaz aylarında: Temmuz ve ağustosta üretim tüketimin 3 katından fazla, ocakta tüketimin yalnız yaklaşık %28’i. Fazla elektrik şebekeye verilemiyorsa karar için aylık değerlere bakmak gerekir.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Tek grafikte iki değişken: Tüketim değerleri daha geniş bir aralığa yayılmış.',
      sutun: 'Her ayda tüketim ve üretim yan yana: Hangi aylarda üretim sütunu daha uzun?',
      daire: 'Aylık değerleri karşılaştırmak için Çizgi ya da Sütun grafiği daha uygun; daire iki değişkeni birlikte göstermez.',
      istatistik: 'İki değişkenin ölçüleri yan yana: Tüketimin açıklığı 7200 kWh, üretiminki 5200 kWh.',
      sacilim: 'Her nokta bir ay: Üretimin yüksek olduğu aylarda tüketim düşük; noktalar sol üstten sağ alta iniyor (r yaklaşık −0,86).',
    },
    ogretmenNotu: 'Kurgusal ama gerçekçi hazır veri: Kurumların hazırladığı tabloları okuma ve karar verme (MAT.12.5.1). Tartışma soruları: Fazla üretimin şebekeye verilmesi kararı nasıl değiştirir? Okul yaz kursu açarsa tablo nasıl değişir? Üretim tahmini satıcı firmanın hazırladığı bir veridir; neden temkinli okunmalı?',
    olustur: () =>
      tabloOlustur(
        ['Ay', 'Tüketim (kWh)', 'Panel üretimi (kWh)'],
        [
          ['Ocak', 9200, 2600], ['Şubat', 8800, 3300], ['Mart', 8100, 4800], ['Nisan', 7200, 5600], ['Mayıs', 6900, 6600],
          ['Haziran', 5200, 7200], ['Temmuz', 2100, 7600], ['Ağustos', 2000, 7100], ['Eylül', 6400, 6000], ['Ekim', 7300, 4600],
          ['Kasım', 8200, 3100], ['Aralık', 8900, 2400],
        ],
      ),
  },
];

export type OrnekKonusu = (typeof ORNEK_KONULARI)[number]['id'];

/**
 * Konu bu kademede görünür mü: Tüm araçlar'da bütün konular; İlkokul'da yalnız 1–4. sınıf, Ortaokul'da 5–8. sınıf
 * (zenginleştirme yok), Lise'de yalnız lise konuları (hazırlık ve 9–12. sınıf).
 */
function konuKademede(k: (typeof ORNEK_KONULARI)[number], kademe: KademeDuzeyi): boolean {
  if (kademe === 'tum') return true;
  if (kademe === 'ortaokul' && k.id === 'zenginlestirme') return false;
  return k.kademe === kademe;
}

/** Örnekler konu başlıklarına göre (menü sırası); `kademe` verilirse yalnız o kademenin konuları (varsayılan: hepsi) */
export function ornekKonulari(kademe: KademeDuzeyi = 'tum'): { id: OrnekKonusu; ad: string; kisaAd: string; ornekler: OrnekVeri[] }[] {
  return ORNEK_KONULARI.filter((k) => konuKademede(k, kademe)).map((k) => ({
    id: k.id,
    ad: k.ad,
    kisaAd: k.kisaAd,
    ornekler: ORNEK_VERILER.filter((o) => o.konu === k.id),
  }));
}

/** Kademenin örnek galerisindeki örnekler (konu sırasıyla) */
export function kademeOrnekleri(kademe: KademeDuzeyi): OrnekVeri[] {
  return ornekKonulari(kademe).flatMap((k) => k.ornekler);
}

/** Örnek bu kademenin galerisinde mi (konusunun kademesi: ilkokul örneği ortaokulda, 5–8. sınıf örneği lisede yok) */
export function ornekKademede(ornek: OrnekVeri, kademe: KademeDuzeyi): boolean {
  const konu = ORNEK_KONULARI.find((k) => k.id === ornek.konu);
  return konu !== undefined && konuKademede(konu, kademe);
}

/** Kimliğe göre örnek; bilinmeyen ya da boş kimlikte undefined */
export function ornekBul(id: string | null | undefined): OrnekVeri | undefined {
  if (!id) return undefined;
  return ORNEK_VERILER.find((o) => o.id === id);
}

/** Örneğin tablosu (her çağrıda yeni kimliklerle); bilinmeyen kimlikte ilk örnek */
export function ornekVeriOlustur(id: string): VeriTablosu {
  const ornek = ornekBul(id) ?? ORNEK_VERILER[0];
  return ornek.olustur();
}

/**
 * localStorage'dan gelen nesnenin tablo olup olmadığını denetler (bozuk veri → null). İlk sütun etikete çevrilir;
 * istisna veri toplama (araştırma) sütunudur (`arastirmaSutunRolu(id) !== null`): plan tablolarında ilk sütun sayısal
 * olabilir (ölçüm değeri, sayı küpü, sayısal anket cevabı), kayıttaki türü korunur.
 */
export function tabloDogrula(ham: unknown): VeriTablosu | null {
  if (!ham || typeof ham !== 'object') return null;
  const t = ham as Partial<VeriTablosu>;
  if (!Array.isArray(t.sutunlar) || !Array.isArray(t.satirlar) || t.sutunlar.length === 0) return null;
  const sutunlar: Sutun[] = [];
  for (const s of t.sutunlar) {
    if (!s || typeof s !== 'object' || typeof (s as Sutun).id !== 'string' || typeof (s as Sutun).ad !== 'string') return null;
    sutunlar.push({ id: (s as Sutun).id, ad: (s as Sutun).ad, tur: (s as Sutun).tur === 'etiket' ? 'etiket' : 'sayi' });
  }
  if (arastirmaSutunRolu(sutunlar[0].id) === null) sutunlar[0].tur = 'etiket';
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
