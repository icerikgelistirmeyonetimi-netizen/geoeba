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

/** Uygulamadaki grafik türleri (durum.ts'teki sekmeler bununla aynıdır) */
export type GrafikTuru = 'nokta' | 'sutun' | 'cizgi' | 'daire' | 'sacilim' | 'istatistik';

export type SinifDuzeyi = 5 | 6 | 7 | 8;

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
  /** Bağlantıların kısa adları ("Erzurum", "İzmir"; "erkek", "kız"); yoksa alan adı yazılır */
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
  | { tur: 'secenek'; ac: ('ortalama' | 'ortanca' | 'oms' | 'etiketler' | 'sutunModu')[]; etiket: string }
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
    secenekler?: Partial<{ ortalama: boolean; oms: boolean; etiketler: boolean; ortanca: boolean }>;
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
}

/** Örnek verilerin konu başlıkları: menüde bu sırayla kümelenir (sınıf düzeyine göre; öğretim programı sırası) */
export const ORNEK_KONULARI = [
  { id: 'sinif5', ad: '5. sınıf · Kategorik veri: sıklık, sütun ve daire grafiği', kisaAd: '5. sınıf' },
  { id: 'sinif6', ad: '6. sınıf · Aritmetik ortalama, ortanca, tepe değer, açıklık', kisaAd: '6. sınıf' },
  { id: 'sinif7', ad: '7. sınıf · Açıklık, ortalama mutlak sapma, çizgi grafiği', kisaAd: '7. sınıf' },
  { id: 'sinif8', ad: '8. sınıf · Gerçek veri, evren ve örneklem', kisaAd: '8. sınıf' },
  { id: 'zenginlestirme', ad: 'Zenginleştirme (programda yok) · İki değişkenin ilişkisi', kisaAd: 'Zenginleştirme' },
] as const;

export const ORNEK_VERILER: OrnekVeri[] = [
  // ── 5. sınıf · Kategorik veri: sıklık, sütun ve daire grafiği ───────────────────────────────────────────
  {
    id: 'baskan',
    ad: '5-A sınıf başkanlığı seçimi',
    konu: 'sinif5',
    sinif: 5,
    kazanim: ['MAT.5.5.1'],
    aciklama: 'Her satır bir oy: noktaları sütunlara dönüştürün, sonra dairede kazananın oyların yarısını alıp almadığına bakın.',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Aday',
    kategoriSirasi: { Aday: ['Elif', 'Kaan', 'Zeynep', 'Mert'] },
    daire: 'siklik',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false }, sutunModu: false },
    hikaye: {
      arastirmaSorusu: 'Sınıf başkanlığı seçiminde oylar adaylara nasıl dağıldı?',
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
        soru: 'Oyları saymadan tahmin et: kazanan aday oyların yarısından fazlasını almış olabilir mi?',
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
        soru: '"Sütunlara dönüştür" düğmesine bas. Noktalar nereye gitti? Sütunun boyu neyi gösteriyor?',
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
      istatistik: 'Sıklık tablosu: her adayın oy sayısı ve bütün oylar içindeki payı.',
    },
    ogretmenNotu: "5. sınıfta dilim açısı hesaplanmaz; \"yarım daire, çeyrek daire\" gibi parça-bütün diliyle konuşun. Yaygın yanılgı: \"En çok oyu alan, oyların çoğunu almıştır.\" Sayım sırası da ilginç: 10. pusulada Kaan ile Elif 4'er oyla eşitti. Genişletme: kendi sınıfınızın seçimini çeteleyle tabloya girin.",
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
    aciklama: 'Her sütun iki sınıfın renkli parçalarından oluşur: en çok çıkan atığı ve sınıfların en çok ayrıştığı atığı bulun.',
    onerilenGrafik: 'sutun',
    varsayilanDegisken: 'En çok çıkan atık',
    renkDegisken: 'Sınıf',
    kategoriSirasi: { 'En çok çıkan atık': ['Yemek artığı', 'Plastik', 'Kâğıt ve karton', 'Cam', 'Metal'] },
    daire: 'siklik',
    acilis: { sekme: 'sutun' },
    hikaye: {
      arastirmaSorusu: 'Evlerimizden en çok hangi tür atık çıkıyor; iki sınıfın cevapları farklı mı?',
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
        soru: 'Yığılmış sütunlara bak: iki sınıf birlikte en çok hangi atığı seçmiş?',
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
    aciklama: 'Bütün daire 24 saat: uyku yarım daireden az mı? Bir sınırı sürükleyin; toplam yine 24 saat kalır.',
    onerilenGrafik: 'daire',
    varsayilanDegisken: 'Süre (saat)',
    daire: 'satir',
    acilis: { sekme: 'daire' },
    hikaye: {
      arastirmaSorusu: 'Bir okul gününün 24 saati nelere ayrılıyor?',
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
        soru: 'Beril bir hafta içi günü 11 saat uyusaydı? Uyku diliminin sınırını sürükleyip yaklaşık 11 saate getir. Hangi dilimler küçüldü, toplam kaç saat?',
        cevap: "Toplam yine 24 saat: uykuya eklenen 2 saat öteki dilimlerden, büyüklükleriyle orantılı alındı ve tam saate yuvarlandı. Okul 7'den 6 saate, diğer 2'den 1 saate indi. Gerçekte okul süresi değişmez; Beril oyundan ya da diğer işlerden kısar. Bir işe daha çok zaman ayırınca ötekilerden eksilir.",
        eylem: { tur: 'surukle', etiket: 'Uyku sınırını sürükle' },
      },
    ],
    sekmeIpucu: {
      sutun: 'Aynı veri sütunlarla: en uzun sütun hangi etkinlik? "Günün ne kadarı?" sorusunu daire mi, sütun mu daha kolay yanıtlıyor?',
      nokta: 'Her nokta bir etkinliğin süresi; parça-bütün için daire grafiği daha uygun.',
      cizgi: '',
      istatistik: 'Sürelerin toplamı hep 24 saat: bütün, günün kendisi.',
    },
    ogretmenNotu: "5. sınıfta açı hesaplanmaz. İsterseniz 6. ve 7. sınıfta köprü: her saat 15°, uyku 9 saat → 135°. Süreler tam saat seçildi, bütün açılar 15°'nin katı. Yanılgı: \"Daire grafiğinde bütün veriye göre değişir\"; burada bütün hep 24 saattir. Sınır sürüklenince toplam 24 saatte kalır ve süreler Grafik ayarları → Sürüklerken yuvarla adımına (ilk ayar 1 saat) yuvarlanır. Uyku 11 saate getirilince öteki dilimler kalan 13 saati büyüklükleriyle orantılı paylaşır (tam oranla okul 6,07 saat olurdu); tam saate yuvarlanınca okul 6, diğer 1 saat olur, öteki dilimler değişmez. \"Neden yalnız iki dilim küçüldü?\" sorusu yuvarlamayı konuşmak için iyi bir fırsat.",
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
      arastirmaSorusu: 'Ailenin aylık geliri hangi kalemlere ayrılıyor, ne kadarı birikime kalıyor?',
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
        cevap: "60 000 TL: yarısı olan 50 000 TL'den fazla, yani yarım daireden büyük.",
        eylem: null,
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Aile birikimi artırmak istiyor. Birikim diliminin sınırını sürükleyip büyüt: hangi kalemler küçüldü? Gerçek hayatta hangisinden kısmak daha kolay?',
        cevap: "Toplam yine 100 000 TL. Birikime eklenen para öteki kalemlerden, büyüklükleriyle yaklaşık orantılı alınır ve bin TL'ye yuvarlanır: birikim 20 000 TL olunca kira 22 000, mutfak 31 000 TL olur. Gerçekte kira ve faturalar pek değişmez; aile daha çok giyimden ya da mutfaktan kısabilir.",
        eylem: { tur: 'surukle', etiket: 'Birikimi büyüt' },
      },
    ],
    sekmeIpucu: {
      sutun: 'Sütunlarla en büyük kalem kolay görünür; "bütçenin yarısı" gibi parça-bütün soruları için daire daha uygun.',
      nokta: 'Her nokta bir kalemin tutarı. "Bütçenin ne kadarı?" sorusunu Daire grafiği daha kolay yanıtlar.',
      cizgi: '',
      istatistik: 'Hesaplama adımlarında toplam 100 000 TL görünür; her kalemin payını Daire grafiği yazar.',
    },
    ogretmenNotu: "Tutarlar kurgusal ve yuvarlaktır: toplam 100 000 TL olduğu için her 1 000 TL bütçenin %1'i; her 10 000 TL dairede 36°, bütün yüzdeler ve açılar tam sayı. Faturalar, ulaşım ve birikim eşit (üç eşit dilim). Sürükleme toplamı 100 000 TL'de tutar ve tutarları bin TL'ye yuvarlar: birikim 20 000 TL'ye çıkınca kira 22 000, mutfak 31 000, faturalar ve ulaşım 9 000'er, giyim 4 000 TL olur; okul ve kırtasiye 5 000 TL'de kalır. \"Gelir sabitse bir kalem artınca ötekiler azalır\" fikri tasarruf değerine (D17.2) bağlanır. Genişletme için öğrencilerin gerçek aile gelirini sormayın; kurgusal bir haftalık harçlık (ör. 500 TL) planlatın.",
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
    aciklama: 'Tepe değer, ortanca ve aritmetik ortalama: üçünü bulup karşılaştırın. Ortalama verilerden biri olmak zorunda mı?',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Kitap sayısı',
    daire: 'siklik',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false } },
    hikaye: {
      arastirmaSorusu: 'Sınıfımızda bir öğrenci bir ayda genellikle kaç kitap okuyor?',
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
        soru: 'Ortanca ve Ortalama düğmelerini aç. Ortanca kaç, aritmetik ortalama kaç?',
        cevap: 'Ortanca 3 (10. ve 11. veri). Aritmetik ortalama 2,7: 54 kitap ÷ 20 öğrenci.',
        eylem: { tur: 'secenek', ac: ['ortanca', 'ortalama'], etiket: 'Ortanca ve ortalamayı aç', gerektirir: 'ortanca' },
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
      sutun: 'Her sütun bir öğrenci. Aritmetik ortalamayı görmek için Nokta grafiğine dönüp Ortalama düğmesini aç: kitaplar eşit paylaşılsaydı herkese 2,7 düşerdi.',
      daire: "Şimdilik her dilim bir öğrenci; Leyla'nın 0 kitabı dilim olmaz. Kaç öğrencinin kaç kitap okuduğunu Nokta grafiği gösterir.",
      cizgi: '',
      istatistik: 'Tepe değer 3, ortanca 3, aritmetik ortalama 2,7. Hesaplama adımlarında ortancanın 10. ve 11. veriden nasıl bulunduğunu izle.',
    },
    sekmeIpucuOzellikli: {
      sutun: {
        metin: 'Bir sütundan aldığını ötekine ver, toplam 54 kalsın: hepsi eşit olunca her sütun 2,7 olur. Eşit paylaşım aritmetik ortalamadır.',
        gerektirir: 'dengele',
      },
      daire: {
        metin: 'Kitap sayıları paylaşılan bir bütün değil; daire "kaç öğrenci kaç kitap okudu" sıklığını gösterir: en büyük dilim 3 kitap (6 öğrenci).',
        gerektirir: 'daireSiklik',
      },
    },
    ogretmenNotu: "Veri sayısı çift (20): ortanca 10. ve 11. verinin ortalamasıdır (ikisi de 3). Yanılgı: \"Aritmetik ortalama verilerden biri olmalı.\" Leyla'nın 0 kitabı da bir veridir: \"0 veri midir?\" tartışması değerli. Leyla'nın hücresini boşaltıp ortalama çizgisinin sağa kaydığını, ortancanın yerinde kaldığını izletin; yeni ortalamayı hesaplatmayın (program s.154: veri çıkarılınca değişim hesaplanmaz, yazılımda dinamik izlenir). Ortalamanın eşit paylaşım anlamını tahtada tartışın: çok okuyanlardan az okuyanlara kitap \"aktarılsa\" toplam 54 kalır ve herkese 2,7 düşer; Nokta grafiğindeki Ortalama çizgisi bu dengenin yerini gösterir.",
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
    aciklama: 'En yüksek yığını bulun: bu veride kaç tepe değer var? Yeni bir öğrenci eklenince tepe değer ne olur?',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Kardeş sayısı',
    daire: 'siklik',
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false } },
    hikaye: {
      arastirmaSorusu: 'Sınıfımızdaki öğrencilerin çoğunun kaç kardeşi var?',
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
        soru: 'Ortalama ve Ortanca düğmelerini aç. İkisi kaç?',
        cevap: 'Aritmetik ortalama 1,7 (34 ÷ 20), ortanca 2. Kimsenin 1,7 kardeşi olamaz: bu, kardeşler eşit paylaşılsaydı herkese düşecek paydır.',
        eylem: { tur: 'secenek', ac: ['ortalama', 'ortanca'], etiket: 'Ortalama ve ortancayı aç', gerektirir: 'ortanca' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Sınıfa kardeşi 1 olan yeni bir öğrenci geldi. Tablonun son boş satırına ekle: tepe değer değişti mi? Ya kardeşi 0 olan gelseydi?',
        cevap: 'Kardeşi 1 olan gelince tek tepe değer kalır: 1 (8 öğrenci). Kardeşi 0 olan gelseydi yine iki tepe değer (1 ve 2) olurdu.',
        eylem: { tur: 'satirEkle', hucreler: ['Yeni öğrenci', 1], etiket: 'Yeni öğrenciyi ekle' },
      },
    ],
    sekmeIpucu: {
      istatistik: "Tepe değer kartında iki değer var: 1 ve 2 (7'şer kez).",
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
    ogretmenNotu: 'Tepe değer senaryoları: iki tepe değer (bu veri), tek tepe değer (yeni öğrenci eklenince) ve "tüm verilerin birer kez bulunması" (tabloyu 0, 1, 2, 3, 4 değerli 5 satıra indirip gösterin: tepe değer yoktur). Kesikli veri: ortalama 1,7 kişi anlamsız görünür, ortanca ya da tepe değer bu veriyi daha iyi anlatır.',
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
      arastirmaSorusu: 'Sınıfımızda okula gelmek genellikle kaç dakika sürüyor?',
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
        soru: 'Ortalama ve Ortanca düğmelerini aç. Hangisi nokta yığınının içinde kaldı?',
        cevap: "Ortanca 12 dakika, yığının içinde. Aritmetik ortalama 16 dakika: 15 öğrenciden 11'inin süresi bundan kısa.",
        eylem: { tur: 'secenek', ac: ['ortalama', 'ortanca'], etiket: 'Ortalama ve ortancayı aç', gerektirir: 'ortanca' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: "Tabloda Feyza'nın süresini 60'tan 20'ye değiştir. Ortalama ve ortanca ne oldu? Sınıfı tek sayıyla anlatmak için hangisini seçerdin?",
        cevap: "Aritmetik ortalama 16'dan yaklaşık 13,3'e iner, ortanca 12'de kalır. Uç nokta ortalamayı çeker, ortancayı pek etkilemez; bu veride ortanca daha iyi temsil eder.",
        eylem: { tur: 'hucre', satir: 'Feyza', sutun: 'Süre (dakika)', deger: 20, etiket: "Feyza'yı 20 dakika yap" },
      },
    ],
    sekmeIpucu: {
      sutun: 'En uzun sütunu aşağı sürükle, sonra Nokta sekmesinde ortalama çizgisinin nereye kaydığına bak.',
      cizgi: '',
      istatistik: 'Aritmetik ortalama 16, ortanca 12, tepe değer 10. Hangisi sınıfı daha iyi anlatıyor?',
      daire: 'Süreler toplanıp paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: 'Ötekilerden çok uzak değer (programdaki adıyla uç nokta, s.99; "uç değer" terimi programda geçmez) bir hata değildir: Feyza gerçekten uzakta oturuyor, veriden atılmaz. Program satırı silip farkı hesaplatmayı değil, değeri yazılımda değiştirip çizgilerin kayışını izlemeyi önerir (7. sınıf notu, s.154). 60 yerine 20: ortalama 200 ÷ 15 ≈ 13,3; ortanca 12 aynı kalır. Veri türü: süre ölçülen (sürekli) bir büyüklüktür, sürekli veri programda 7. sınıfta başlar (s.19); burada süreler tam dakikaya yuvarlandığı için 6. sınıfın nicel (kesikli) veri çerçevesinde sayılabilir tam değerler gibi ele alınır. İsterseniz öğrencilere "süre neden tam dakika yazıldı?" diye sorun.',
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
      arastirmaSorusu: 'İki oyuncudan hangisi maçtan maça daha istikrarlı sayı atıyor?',
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
        soru: 'İki panele bak. Sence maç başına kim daha çok sayı atıyor?',
        cevap: "Şaşırtıcı ama ikisi de maç başına ortalama 17 sayı atıyor. Selma'nın 32 sayılık maçı göze çarpıyor; 5 sayı attığı bir maç da var.",
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Noktalar ne kadar yayılmış? İki oyuncunun açıklığı kaç?',
        cevap: 'Selma 5 ile 32 arasında: açıklık 27. Yasemin 15 ile 19 arasında: açıklık 4.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Ortalama düğmesini aç. İki oyuncunun aritmetik ortalaması kaç? Noktalar ortalamanın çevresine nasıl dağılmış?',
        cevap: "İkisi de 17 (85 ÷ 5). Ortalamalar eşit ama Selma'nın noktaları ortalamadan çok uzağa dağılmış, Yasemin'inkiler hemen yanında.",
        eylem: { tur: 'secenek', ac: ['ortalama'], etiket: 'Ortalamayı aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Her maç güvenilir sayı atacak bir oyuncu seçeceksen kimi seçersin, neden?',
        cevap: 'Yasemin: her maç ortalamasına çok yakın oynuyor (açıklık 4), daha istikrarlı. Selma bazen çok (32), bazen çok az (5) atıyor (açıklık 27).',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      cizgi: "Maç sırasına göre iki oyuncu: Selma'nın çizgisi iniş çıkışlı, Yasemin'inki neredeyse düz.",
      sutun: "Sütunlar Selma'nın maç maç sayıları. Grafiğin üstündeki Yasemin sekmesine geçip iki oyuncunun sütunlarını karşılaştır.",
      sacilim: 'Burada her nokta bir maç: yatayda bir oyuncunun, dikeyde ötekinin sayısı. İstikrarı karşılaştırmak için Nokta grafiği daha uygun.',
      istatistik: 'Aritmetik ortalamalar eşit (17); açıklıklar 27 ve 4. Hesaplama adımlarını defterdeki hesabınla karşılaştır.',
      daire: 'Maç sayıları paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: "5 veri elle hesap için idealdir: önce defterde hesaplatın, sonra İstatistik → Hesaplama adımları ile karşılaştırın. 6. sınıfta yayılım açıklıkla konuşulur (27 ve 4). 7. sınıfta genişletme (MAT.7.6.1): Ortalama mutlak sapma düğmesi; Selma'nın ortalamaya uzaklıkları 1, 12, 15, 0, 4 → 32 ÷ 5 = 6,4, Yasemin'inkiler 0, 2, 2, 1, 1 → 6 ÷ 5 = 1,2. Yanılgı: \"Ortalamaları eşit olan iki veri seti aynıdır.\"",
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
      metin: 'İki sınıfın ortalaması aynı. Puanlar ortalamanın çevresine nasıl yayılmış? Alt alta iki paneli karşılaştırın.',
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
      arastirmaSorusu: 'Ortalamaları aynı olan iki sınıfın başarısı da aynı mı?',
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
        cevap: "Aritmetik ortalamalar eşit: ikisi de 70 (1050 ÷ 15). Ortalama mutlak sapma 7-A'da 16, 7-B'de 6: 7-B'nin puanları ortalamaya çok daha yakın.",
        eylem: { tur: 'secenek', ac: ['ortalama', 'oms'], etiket: 'Ortalama ve sapmayı aç', gerektirir: 'grupla' },
        yedekEylem: { tur: 'sekme', sekme: 'istatistik', etiket: 'Gruplara göre tabloyu aç' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Öğretmen hangi sınıfta ek çalışmaya daha çok öğrencinin ihtiyacı olduğunu merak ediyor. Verilere göre ne dersin?',
        cevap: "7-A: 60'ın altında 5 öğrenci var, 7-B'de 1. Ortalama aynı olsa da 7-A'da desteğe ihtiyaç duyan öğrenci daha çok; 7-A'da 90 ve üstü alan 3 öğrenci de var.",
        eylem: null,
      },
    ],
    sekmeIpucu: {
      istatistik: 'Gruplara göre (Sınıf) tabloda: iki sınıfın ortalaması aynı (70), ortalama mutlak sapmaları farklı (16 ve 6), ortancaları da farklı (75 ve 70).',
      sutun: 'Her sütun bir öğrenci, renkler sınıfı gösterir. Dağılımı karşılaştırmak için Nokta grafiği daha uygun.',
      cizgi: '',
      daire: 'Puanlar paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: "Ortancalar da farklı (75 ve 70): 7-A'nın çoğu 75 ve üstü aldı ama birkaç düşük puan ortalamayı aşağı çekiyor. Nokta grafiği iki sınıfı alt alta, ortak eksende gösterir; İstatistik'teki Gruplara göre (Sınıf) tablo ortalama, ortanca ve ortalama mutlak sapmayı yan yana verir. Puanlar hassas veridir: adlar yerine kod var (D8 Mahremiyet); kendi sınıfınızın puanlarını adlarla yansıtmayın.",
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
      arastirmaSorusu: 'Sınıfımızdaki öğrencilerin boyları hangi aralıkta toplanıyor, ne kadar farklılık gösteriyor?',
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
        soru: 'Ortalama ve Ortalama mutlak sapma düğmelerini aç. Öğrenciler ortalamadan ortalama kaç cm uzakta?',
        cevap: "Aritmetik ortalama 153 cm, ortalama mutlak sapma 5 cm. 24 öğrenciden 16'sı 148 ile 158 cm arasındaki bantta.",
        eylem: { tur: 'secenek', ac: ['ortalama', 'oms'], etiket: 'Ortalama ve sapmayı aç' },
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
      istatistik: 'Hesaplama adımlarında her öğrencinin ortalamaya uzaklığını gör: bu uzaklıkların ortalaması 5 cm.',
      sutun: 'Her sütun bir öğrenci; dağılımı görmek için Nokta grafiği daha uygun.',
      cizgi: '',
      daire: 'Boylar toplanıp paylaşılmaz; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: "Ortalama (153) ile ortanca (152) yakın; 170 cm'lik öğrenci dağılımı hafifçe sağa çeker. Boy hassas bir ölçümdür: adlar yerine kod var; kendi sınıfınızda ölçmeden önce izin alın. Noktalar seyrek görünürse Grafik ayarlarından 5 cm'lik grup genişliği seçilebilir.",
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
      arastirmaSorusu: 'Fasulye fidesi her hafta aynı miktarda mı uzuyor?',
      kim: "7-B'nin fen bilimleri dersindeki fasulye saksısı",
      neZaman: 'Eylül-Kasım 2025, 8 hafta',
      nasil: 'Filiz çıktıktan sonra 8 hafta boyunca her pazartesi (15 Eylül – 3 Kasım 2025) cetvelle ölçüldü.',
      n: 8,
      cumle: "7-B fen bilimleri dersinde Eylül 2025'te ekilen fasulyenin boyu, filiz çıktıktan sonra 8 hafta her pazartesi cetvelle ölçüldü.",
    },
    kaynak: { tur: 'kurgusal', ad: 'Kurgusal sınıf deneyi verisi' },
    rehber: [
      {
        tur: 'tahmin',
        baslik: 'Tahmin et',
        soru: 'Fide her hafta aynı miktarda mı uzar? Çizginin nasıl görüneceğini tahmin et.',
        cevap: 'Hayır: çizgi önce dikleşiyor, sonra yataylaşıyor.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Çizginin en dik olduğu iki hafta hangisi?',
        cevap: "3. hafta ile 4. hafta arası: 9 cm'den 14 cm'ye, 5 cm artış.",
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Noktalara sırayla dokun ve haftalık artışları oku.',
        cevap: '3, 4, 5, 4, 3, 2, 1 cm: önce hızlanıyor, sonra yavaşlıyor.',
        eylem: { tur: 'yok', etiket: 'Noktalara dokun' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: '9. haftada fidenin boyu kaç cm olabilir? Neden?',
        cevap: 'Yaklaşık 24–25 cm: artışlar her hafta azalıyor, son hafta yalnız 1 cm uzadı.',
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: 'Nokta grafiği haftaların sırasını göstermez; zamanla değişim için Çizgi grafiği.',
      sutun: 'Sütunların tepelerini sırayla birleştirirsen çizgi grafiğini elde edersin.',
      daire: 'Haftalık boylar paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
      istatistik: 'Hesaplama adımları boyların ortalamasını verir; fidenin haftadan haftaya nasıl uzadığını Çizgi grafiği gösterir.',
    },
    ogretmenNotu: 'Boy oran ölçeğidir (0 cm gerçek bir sıfır): yüzde artış anlamlıdır (1. → 2. hafta %150, 7. → 8. hafta yaklaşık %4,3). Bir noktaya dokununca değişim etiketi farkı ve yüzdeyi birlikte yazar: "3 cm artış (%150)". Sıcaklık örneğiyle karşılaştırın: orada etiket yalnız farkı yazar, çünkü °C\'de yüzde anlamsızdır.',
    olustur: () =>
      tabloOlustur(
        ['Hafta', 'Boy (cm)'],
        [
          ['1. hafta', 2], ['2. hafta', 5], ['3. hafta', 9], ['4. hafta', 14], ['5. hafta', 18], ['6. hafta', 21],
          ['7. hafta', 23], ['8. hafta', 24],
        ],
      ),
  },
  {
    id: 'sicaklik',
    ad: "Ankara'nın aylık ortalama sıcaklığı",
    konu: 'sinif7',
    sinif: 7,
    kazanim: ['MAT.7.6.1', 'MAT.7.6.2'],
    aciklama: 'Gerçek MGM verisi: çizginin en dik yükseldiği ve en hızlı düştüğü ayları bulun; değişimi °C olarak okuyun.',
    onerilenGrafik: 'cizgi',
    varsayilanDegisken: 'Sıcaklık (°C)',
    daire: 'uygunDegil',
    yuzdeDegisim: { 'Sıcaklık (°C)': false },
    acilis: { sekme: 'cizgi' },
    hikaye: {
      arastirmaSorusu: "Ankara'da sıcaklık yıl boyunca nasıl değişiyor; en hızlı ısınma ve soğuma hangi aylarda?",
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
        soru: "Ankara'nın en sıcak ayı sence hangisi?",
        cevap: 'Çoğu kişi temmuz der. Uzun yıllar ortalamasında ağustos (23,6 °C), temmuzu (23,5 °C) çok az geçiyor.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Çizgi hangi iki ay arasında en dik yükseliyor?',
        cevap: "Marttan nisana: 5,8 °C'den 11,3 °C'ye, 5,5 °C artış.",
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Ekim noktasına dokun: Eylül → Ekim ve Ekim → Kasım arasında kaç derece azalış var?',
        cevap: 'İkisinde de 5,8 °C azalış: sonbaharda sıcaklık, ilkbaharda yükseldiğinden biraz daha hızlı düşüyor.',
        eylem: { tur: 'yok', etiket: 'Ekim noktasına dokun', gerektirir: 'yuzdeDegisim' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Ocakta 0,4 °C, temmuzda 23,5 °C. "Temmuz, ocaktan yaklaşık 59 kat sıcak" demek doğru mu?',
        cevap: 'Hayır. 0 °C "hiç sıcaklık yok" demek değildir; sıcaklıklar kat ya da yüzdeyle karşılaştırılmaz. Doğrusu: temmuz, ocaktan 23,1 °C daha sıcak.',
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
    ad: 'Erzurum ve İzmir: aylık ortalama sıcaklık',
    konu: 'sinif8',
    sinif: 8,
    kazanim: ['MAT.8.6.1', 'MAT.8.6.2'],
    aciklama: 'Gerçek MGM verisi: sıfırın altındaki aylarda sütunlar aşağı iner. İki şehrin açıklığını ve ortalamasını karşılaştırın.',
    onerilenGrafik: 'sutun',
    varsayilanDegisken: 'Erzurum (°C)',
    karsilastir: 'İzmir (°C)',
    daire: 'uygunDegil',
    yuzdeDegisim: { 'Erzurum (°C)': false, 'İzmir (°C)': false },
    acilis: { sekme: 'sutun' },
    hikaye: {
      arastirmaSorusu: "Doğu Anadolu'daki Erzurum ile Ege kıyısındaki İzmir'in sıcaklıkları yıl boyunca nasıl farklılaşıyor?",
      kim: 'MGM Erzurum ve İzmir istasyonları',
      neZaman: 'Erzurum 1929–2025, İzmir 1938–2025 ölçüm periyotları',
      nasil: 'Her ayın uzun yıllar ortalama sıcaklığı (°C).',
      n: 12,
      cumle: "MGM'nin Erzurum (1929–2025) ve İzmir (1938–2025) istasyonlarında ölçülen sıcaklıklardan her ayın uzun yıllar ortalaması.",
    },
    kaynak: {
      tur: 'gercek',
      ad: 'MGM, İllerimize Ait Genel İstatistik Veriler: Erzurum ve İzmir, "Ortalama Sıcaklık (°C)" satırı',
      url: 'https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?k=A&m=ERZURUM',
      url2: 'https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?k=A&m=IZMIR',
      urlAd: 'MGM: Erzurum',
      url2Ad: 'İzmir',
      erisim: '24 Eylül 2026',
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
        cevap: 'Erzurum: 19,6 − (−9,1) = 28,7 °C. İzmir: 28,0 − 8,9 = 19,1 °C.',
        eylem: { tur: 'sekme', sekme: 'cizgi', etiket: 'Çizgiye geç', gerektirir: 'yuzdeDegisim' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: 'Yıllık ortalamalar yaklaşık 5,8 °C ve 18,0 °C. Yalnız bu iki sayı iki şehrin iklimini anlatmaya yeter mi?',
        cevap: "Yetmez: Erzurum'un sıcaklıkları çok daha geniş bir aralığa yayılıyor (kış çok soğuk, yaz ılık). Ortalamanın yanında açıklık ya da ortalama mutlak sapma da verilmeli.",
        eylem: null,
      },
    ],
    sekmeIpucu: {
      nokta: "Alt alta iki panel, ortak eksen: Erzurum'un noktaları çok daha geniş bir aralığa yayılmış.",
      cizgi: 'Yazın iki çizgi birbirine yaklaşıyor, kışın aralarındaki fark büyüyor.',
      istatistik: 'Ortalama mutlak sapmalar: Erzurum yaklaşık 8,8, İzmir yaklaşık 6,1 °C.',
      daire: 'Sıcaklıklar toplanıp paylaşılmaz; daire grafiği bu veri için uygun değil.',
      sacilim: 'Her nokta bir ay: iki şehir birlikte ısınıp soğuyor, noktalar sol alttan sağ üste diziliyor.',
    },
    ogretmenNotu: "Açıklık hesabında negatif sayıyla çıkarma: 19,6 − (−9,1) = 28,7. Sütun grafiği tek seri çizer; İzmir için grafiğin üstündeki İzmir sekmesine geçin ya da Çizgi grafiğinde iki seriyi birlikte gösterin. İki şehir arasındaki fark ocakta 18,0 °C, ağustosta 8,1 °C. Değişim etiketleri yalnız farkı yazar: °C'de yüzde anlamsızdır; kasım → aralık gibi sıfırın iki yanındaki aylarda yüzde hesaplamanın neden saçma sonuç verdiğini sorabilirsiniz.",
    olustur: () =>
      tabloOlustur(
        ['Ay', 'Erzurum (°C)', 'İzmir (°C)'],
        [
          ['Ocak', -9.1, 8.9], ['Şubat', -7.6, 9.6], ['Mart', -2.3, 11.7], ['Nisan', 5.4, 15.9], ['Mayıs', 10.7, 20.8],
          ['Haziran', 14.9, 25.4], ['Temmuz', 19.2, 28], ['Ağustos', 19.6, 27.7], ['Eylül', 14.8, 23.8], ['Ekim', 8.2, 19],
          ['Kasım', 1.2, 14.4], ['Aralık', -5.7, 10.6],
        ],
      ),
  },
  {
    id: 'ekran',
    ad: '8. sınıflarda günlük ekran süresi (örneklem)',
    konu: 'sinif8',
    sinif: 8,
    kazanim: ['MAT.8.6.1', 'MAT.8.6.2'],
    aciklama: 'Kurayla seçilen 40 öğrenci: ortalama ve ortancayı karşılaştırın, örneklemin okulu temsil edip etmediğini tartışın.',
    onerilenGrafik: 'nokta',
    varsayilanDegisken: 'Süre (dakika)',
    renkDegisken: 'Şube',
    daire: 'uygunDegil',
    hassas: true,
    acilis: { sekme: 'nokta', secenekler: { ortalama: false, ortanca: false, oms: false, etiketler: false }, aralik: 5 },
    hikaye: {
      arastirmaSorusu: 'Okulumuzdaki 8. sınıf öğrencileri hafta içi okul dışında günde ne kadar süre ekran başında geçiriyor?',
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
        cevap: 'Bu örneklemde ortanca 120 dakika, yani 2 saat: öğrencilerin yarısı günde 2 saat ya da daha az ekran başında.',
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
        soru: 'Ortalama ve Ortanca düğmelerini aç. Hangisi daha büyük, neden?',
        cevap: 'Aritmetik ortalama 150, ortanca 120 dakika. Günde 5–7 saat ekran başında olan birkaç öğrenci ortalamayı yukarı çekiyor.',
        eylem: { tur: 'secenek', ac: ['ortalama', 'ortanca'], etiket: 'Ortalama ve ortancayı aç', gerektirir: 'ortanca' },
      },
      {
        tur: 'yorumla',
        baslik: 'Yorumla',
        soru: "Bu 40 kişilik örneklem okuldaki 112 sekizinci sınıfı temsil eder mi? Ya Türkiye'deki bütün 8. sınıfları?",
        cevap: "Her şubeden kurayla seçildiği için okulu temsil etmeye yakın. Türkiye'yi temsil etmez: tek bir okul farklı illeri, köyleri ve okul türlerini kapsamaz.",
        eylem: null,
      },
    ],
    sekmeIpucu: {
      istatistik: 'Gruplara göre (Şube) tabloda dört şubenin ortalamaları birbirine yakın (138–155 dakika). Örneklem her şubeden eşit alındı.',
      sutun: '40 sütun bir arada okunmaz; bu kadar çok veride Nokta grafiği daha uygun.',
      cizgi: '',
      daire: 'Süreler paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: "Veri sayısı çok (40) ve açıklığı büyük (390 dakika) bir veri seti. Örnek \"Gruplama yok\" ile açılır: öz bildirimdeki yuvarlama yığılmaları (60, 90, 120, 180, 240) yalnız bu görünümde tam değerlerinde görünür. Grafik ayarlarından daha geniş bir gruba geçilirse yakın değerler aynı yığına düşer ve yığılmalar kaybolur; 2. adımdaki düğme tam değerlere geri döndürür. Yığılmaları konuştuktan sonra okunurluk için grup genişliği 20 ya da 50 seçilebilir. Yuvarlama yığılmaları MAT.8.6.2 kapsamında \"bu veri neyi abartıyor ya da saklıyor?\" diye tartışılabilir. Anket anonim: tabloda kod var.",
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
    sinif: 8,
    kazanim: [],
    aciklama: 'Zenginleştirme: noktalar nasıl diziliyor? Ötekilerden ayrılan noktayı bulun; birlikte değişmek neden-sonuç mu?',
    onerilenGrafik: 'sacilim',
    varsayilanDegisken: 'Haftalık çalışma (saat)',
    renkDegisken: 'Sınıf',
    daire: 'uygunDegil',
    hassas: true,
    acilis: { sekme: 'sacilim' },
    hikaye: {
      arastirmaSorusu: 'Daha çok çalışan öğrencilerin puanı genellikle daha mı yüksek?',
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
        cevap: 'Sol alttan sağ üste: çalışma süresi arttıkça puan genellikle artıyor. Ama noktalar bir doğru üzerinde değil, dağınık.',
        eylem: null,
      },
      {
        tur: 'olc',
        baslik: 'Aç ve ölç',
        soru: 'Ötekilerden ayrılan bir nokta bul. Kimin, değerleri ne?',
        cevap: '8B-03: haftada 3 saat çalışmış ama 88 almış.',
        eylem: { tur: 'satirVurgula', satir: '8B-03', etiket: 'İstisnayı göster' },
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
    ogretmenNotu: 'Programda yok (zenginleştirme). İlişki belirgin ama kusursuz değil (korelasyon yaklaşık 0,70). İki sınıfta da aynı eğilim var. İstisna nokta (8B-03) "neden-sonuç" yanılgısını tartışmak için konuldu. Puan hassas veridir: adlar yerine kod var.',
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
    sinif: 8,
    kazanim: [],
    aciklama: 'Zenginleştirme: sıcaklık artınca satış ne oluyor? Noktaların yönüne bakın; tarih sırası için Çizgi grafiğine geçin.',
    onerilenGrafik: 'sacilim',
    varsayilanDegisken: 'Sıcaklık (°C)',
    daire: 'uygunDegil',
    yuzdeDegisim: { 'Sıcaklık (°C)': false, 'Satış (bardak)': true },
    acilis: { sekme: 'sacilim' },
    hikaye: {
      arastirmaSorusu: 'Hava ısındıkça kantinde sıcak çikolata satışı nasıl değişiyor?',
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
        cevap: 'Azalır: sıcak günlerde daha az sıcak çikolata satılıyor. Bu ilişkinin ne kadar düzenli olduğunu grafikte gör.',
        eylem: null,
      },
      {
        tur: 'bak',
        baslik: 'Grafikte bul',
        soru: 'Saçılım grafiğinde noktalar nasıl diziliyor?',
        cevap: 'Sol üstten sağ alta: sıcaklık arttıkça satış azalıyor (negatif ilişki).',
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
      cizgi: 'Tarih sırasıyla sıcaklık kıştan bahara yükseliyor. Grafiğin üstündeki Satış (bardak) sekmesine geç: satış ne yapıyor?',
      nokta: 'Nokta grafiği yalnız sıcaklıkların dağılımını gösterir; sıcaklık ile satışın ilişkisi için Saçılım.',
      sutun: 'Sütunlar tarih sırasıyla sıcaklıklar. Grafiğin üstündeki Satış (bardak) sekmesine geçip iki sütun dizisini karşılaştır.',
      istatistik: 'İstatistik tek değişkeni özetler; sıcaklık ile satışın birlikte nasıl değiştiğini Saçılım grafiği gösterir.',
      daire: 'Satışlar ve sıcaklıklar paylaşılan bir bütün değil; daire grafiği bu veri için uygun değil.',
    },
    ogretmenNotu: 'Programda yok (zenginleştirme). İlişki güçlü (korelasyon yaklaşık −0,9) ama kusursuz değil. Satırlar tarih sırasında: Çizgi grafiğinde Sıcaklık ve Satış (bardak) sekmeleri arasında geçilince iki değişkenin zamanla ters yönde değiştiği görülür (birimleri farklı olduğu için ortak eksende çizilmezler). Dikkat: ölçüm günleri arasında 1 ile 5 hafta var, aralıklar eşit değil; çizgi grafiği ise noktaları eşit aralıkla dizer. "Çizgideki eğim neden yanıltıcı olabilir?" diye sorun.',
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
];

export type OrnekKonusu = (typeof ORNEK_KONULARI)[number]['id'];

/** Örnekler konu başlıklarına göre (menü sırası) */
export function ornekKonulari(): { id: OrnekKonusu; ad: string; kisaAd: string; ornekler: OrnekVeri[] }[] {
  return ORNEK_KONULARI.map((k) => ({ id: k.id, ad: k.ad, kisaAd: k.kisaAd, ornekler: ORNEK_VERILER.filter((o) => o.konu === k.id) }));
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
