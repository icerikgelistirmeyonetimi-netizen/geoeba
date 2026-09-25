'use client';

/**
 * Veri tablosu: satırlar gözlem, sütunlar değişken. Hücreler tıkla/yaz ile düzenlenir;
 * Enter aşağı, Tab sağa gider. Excel/Sheets'ten yapıştırma (sekme/virgül) hücre konumundan itibaren yayılır.
 * Altta her zaman boş bir satır durur: bir hücresine yazılınca gerçek satır eklenir ve imleç o hücrede kalır
 * (ayrı "satır ekle" düğmesi yoktur). Seçili satır vurgusu grafiklerle iki yönlüdür (satır numarasına tıklayınca seçilir;
 * grafikte seçilen satır görünür alana kayar).
 *
 * Sütun genişliği içerikten hesaplanır (başlık en çok iki satır + en uzun değer). Başlıktaki tür ve silme işlemleri
 * tek bir 44 px'lik sütun menüsündedir (tür çipi + ⋮); # ve ilk etiket sütunu yatay kaydırmada yapışkan kalır.
 * İlk sütunun menüsü yoktur (türü değişmez, silinmez); araştırma tablosunda sayısalsa (ölçüm değeri, sayı küpü)
 * başlıkta aynı yerde durağan bir "123" çipi durur ve hücreler sayı gibi sağa yaslanır.
 * Sütun ve satır silme `onTablo(yeni, { geriAlMetni })` ile bildirilir (kabuk Geri al tostu gösterir).
 *
 * Veri toplama sırasında (isteğe bağlı özellikler; verilmezse bugünkü davranış): `toplamaGorunumu` başlık menüsünü ve
 * satır silme sütununu kaldırır (seçili satırın # hücresi × olur), `yeniSatirKimligi` yeni satırı 600 ms parlatır,
 * `kilitli` akış sürerken düzenlemeyi kapatır, `bantModu` tabloyu grafiğin altında 3 satırlık banda indirir,
 * `saltOkunur` (Deney özeti) hayalet satırı, + Sütun ve Temizle'yi gizler.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  baslikSatiriMi,
  hataliHucreler,
  hucreYaz,
  metinSutunlari,
  satirEkle,
  satirSil,
  sayiOku,
  sayiYaz,
  sonrakiHucre,
  sutunAdiDegistir,
  sutunEkle,
  sutunSil,
  sutunTuruDegistir,
  yapistir,
  yapistirmayiAyristir,
  type GezintiYonu,
  type SutunTuru,
  type VeriTablosu as VeriTablosuModeli,
} from './veri';
import { DUGME, TurIsareti, useAzaltilmisHareket } from './ortak';
import { SIRA_SUTUNLARI, arastirmaSutunRolu, degiskenSutunlari } from './kategorik';

export interface VeriTablosuBilgisi {
  /** Kabuğun tostunda görünen metin ("Sütun silindi: Boy (cm)"); tostta [Geri al] düğmesi olur */
  geriAlMetni: string;
}

export interface VeriTablosuProps {
  tablo: VeriTablosuModeli;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  /** Tablo değişti. `bilgi` yalnız geri alınmaya değer işlemlerde (silme, yapıştırma) gelir */
  onTablo: (yeni: VeriTablosuModeli, bilgi?: VeriTablosuBilgisi) => void;
  /** Vurgulanan (grafikte seçili) sütun kimliği */
  vurguluSutun?: string | null;
  /** Satır eklenince tablo sona kayar (deney sonuçları canlı dolarken) */
  sonaKaydir?: boolean;
  /** Verilirse alt şeritte "Temizle" (tüm satırları sil, onaylı) görünür */
  onTemizle?: () => void;
  /** Renk anahtarı: satırın kategori rengi (satır numarasının solunda şerit); yoksa undefined */
  satirRengi?: (satir: number) => string | undefined;
  /**
   * Toplama görünümü (veri toplama paneli açık ve araştırma bağlı): başlıkta sütun menüsü (tür + sil) ve satır silme
   * sütunu yoktur; seçili satırın # hücresi 44 px'lik × (satırı sil) olur. Alt şerit (hayalet satır, + Sütun, Temizle)
   * aynen kalır. Sütun genişlikleri `tabloDogalGenisligi(tablo, { toplama: true })` ile aynı hesaplanır.
   */
  toplamaGorunumu?: boolean;
  /**
   * Yeni eklenen satırın kimliği: o satır 600 ms mercan tonunda parlar. Azaltılmış harekette parlamaz;
   * anında akışta kabuk `null` verir.
   */
  yeniSatirKimligi?: string | null;
  /** Satır yokken tabloda görünen ileti (ör. "Henüz cevap yok. …"); verilmezse genel "Tablo boş" iletisi */
  bosIleti?: string;
  /**
   * Salt okunur görünüm (Deney özeti): hücre ve başlık düzenlenmez; hayalet satır, + Sütun, Temizle, sütun menüsü
   * ve satır silme yoktur. Alt şeritte `saltOkunurNotu` durur.
   */
  saltOkunur?: boolean;
  saltOkunurNotu?: string;
  /**
   * Tablo bandı (grafiğin altında): 40 px başlık + 3 satır + 44 px alt şerit. Kök yüksekliğini kendisi belirler
   * (açıkken ≈ 221 px, kapalıyken 44 px); satır eklenince sona kayar. Alt şeritte + Sütun, Temizle, "84 satır" ve
   * [Tabloyu gizle] durur; kapalıyken "Tablo · 84 satır · son: Tura" [Tabloyu göster].
   */
  bantModu?: boolean;
  /** Bant açık mı (denetimli). Verilmezse bileşen kendisi tutar ve açık başlar */
  bantAcik?: boolean;
  onBantAcik?: (acik: boolean) => void;
  /**
   * Satırlar yazılırken (deney akışı): hücre, başlık ve yapı düzenlemesi kapalıdır. Hayalet satır, + Sütun ve Temizle
   * görünür kalır ama pasiftir; satır seçimi ve kaydırma çalışır.
   */
  kilitli?: boolean;
}

/** Bu kadar satırdan sonra yalnız bir pencere çizilir (akıllı tahtada akıcılık) */
const GORUNUR_SINIR = 300;

// ── Genişlik ölçüsü ────────────────────────────────────────────────────────────

/**
 * # sütunu (44 px düğme + 1 px sağ kenarlık; yapışkan etiket sütunu `left-[45px]`), satır işlemleri sütunu ve
 * başlıktaki sütun menüsü düğmesi (dokunma hedefi 44 px)
 */
const SIRA_GENISLIGI = 45;
const SATIR_ISLEM_GENISLIGI = 44;
const MENU_DUGMESI = 44;
/** Başlık yazısının iki yanındaki boşluk (px-2) + sağ kenarlık + pay */
const BASLIK_DOLGU = 18;
/** Hücre yazısının iki yanındaki boşluk (px-2) + nefes payı */
const HUCRE_DOLGU = 24;
/** Dikey kaydırma çubuğu (8 px) + kenarlık */
const KAYDIRMA_PAYI = 10;
const EN_AZ_GENISLIK = 64;
const SAYI_EN_COK = 120;
const ETIKET_EN_COK = 200;
const TOPLAMA_ETIKET_EN_COK = 160;
/** Hücre genişliği bu kadar satırdan ölçülür */
const OLCULEN_SATIR = 200;
const YER_TUTUCU = 'Yeni satır…';
/** Hayalet satırın yer tutucusu (12 px Manrope'ta 59 px) + iki yan boşluk + kenarlık: ilk görünen sütun en az bu kadar */
const YER_TUTUCU_SUTUNU = 59 + 17;

const KALIN_YAZI = '700 13px Manrope, "Instrument Sans", sans-serif';
const HUCRE_YAZISI = '500 13px Manrope, "Instrument Sans", sans-serif';

let olcumBaglami: CanvasRenderingContext2D | null | undefined;
let yaziYuklendi = false;
const yaziOnbellegi = new Map<string, number>();
const genislikOnbellegi = new WeakMap<VeriTablosuModeli, { normal?: number[]; toplama?: number[] }>();

/** Yazı tipi (Manrope) yüklendi mi? Yüklenmeden ölçülen genişlikler önbelleğe alınmaz. Sunucuda ölçü sabittir. */
function yaziHazir(): boolean {
  if (yaziYuklendi) return true;
  if (typeof document === 'undefined' || !document.fonts) return (yaziYuklendi = true);
  try {
    yaziYuklendi = document.fonts.check('700 13px Manrope') && document.fonts.check('500 13px Manrope');
  } catch {
    yaziYuklendi = true;
  }
  return yaziYuklendi;
}

/**
 * Yazı genişliği (13 px Manrope; başlık kalın 700, hücre 500). Tarayıcıda tuvalle ölçülür; sunucuda (testler)
 * Manrope ortalamasıyla harf başına kalın 6,6 px, normal 6,8 px.
 */
function yaziGenisligi(metin: string, kalin: boolean): number {
  if (!metin) return 0;
  const anahtar = (kalin ? 'k|' : 'n|') + metin;
  const onceki = yaziOnbellegi.get(anahtar);
  if (onceki !== undefined) return onceki;
  if (olcumBaglami === undefined) {
    olcumBaglami = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  }
  let genislik: number;
  if (olcumBaglami) {
    olcumBaglami.font = kalin ? KALIN_YAZI : HUCRE_YAZISI;
    genislik = olcumBaglami.measureText(metin).width;
  } else {
    genislik = metin.length * (kalin ? 6.6 : 6.8);
  }
  if (yaziHazir()) {
    if (yaziOnbellegi.size > 5000) yaziOnbellegi.clear();
    yaziOnbellegi.set(anahtar, genislik);
  }
  return genislik;
}

/** Başlığın en çok iki satıra sığdığı en küçük yazı genişliği (sözcükler bölünmez; tek sözcükte sözcüğün kendisi) */
function ikiSatirGenisligi(ad: string): number {
  const sozcukler = ad.trim().split(/\s+/).filter(Boolean);
  if (sozcukler.length === 0) return 0;
  if (sozcukler.length === 1) return yaziGenisligi(sozcukler[0], true);
  let enIyi = Infinity;
  for (let k = 1; k < sozcukler.length; k++) {
    const g = Math.max(yaziGenisligi(sozcukler.slice(0, k).join(' '), true), yaziGenisligi(sozcukler.slice(k).join(' '), true));
    if (g < enIyi) enIyi = g;
  }
  return enIyi;
}

function genislikHesapla(ad: string, dugmeler: boolean, hucreYazisi: number, tur: SutunTuru, toplama: boolean): number {
  const menu = dugmeler ? MENU_DUGMESI : 0;
  const baslik = ikiSatirGenisligi(ad) + BASLIK_DOLGU + menu;
  const hucre = hucreYazisi > 0 ? hucreYazisi + HUCRE_DOLGU : 0;
  const enCok = (tur === 'sayi' ? SAYI_EN_COK : toplama ? TOPLAMA_ETIKET_EN_COK : ETIKET_EN_COK) + menu;
  return Math.round(Math.min(enCok, Math.max(EN_AZ_GENISLIK, baslik, hucre)));
}

/**
 * Sütunun en küçük genişliği (px) = en büyük(başlığın iki satırlık genişliği + dolgu [+ 44 px sütun menüsü],
 * en uzun hücre + 24 px). Sayı sütunlarında 64–120 px, etiket sütunlarında 64–200 px (toplama görünümünde 160);
 * menü düğmesi bu sınırlara eklenir. Daha uzun değerler kısaltılır (hücrede `title` durur).
 */
export function sutunEnKucukGenisligi(
  ad: string,
  dugmeler: boolean,
  enUzunHucre = '',
  secenek: { tur?: SutunTuru; toplama?: boolean } = {},
): number {
  return genislikHesapla(ad, dugmeler, yaziGenisligi(enUzunHucre.trim(), false), secenek.tur ?? 'etiket', secenek.toplama === true);
}

/** Her sütunun genişliği (tablodaki indeksle; gizli sıra sütunları 0). Tablo nesnesine göre önbelleklenir. */
function sutunGenislikleri(tablo: VeriTablosuModeli, toplama: boolean): number[] {
  const kayit = genislikOnbellegi.get(tablo);
  const onceki = toplama ? kayit?.toplama : kayit?.normal;
  if (onceki) return onceki;
  const ilkGorunen = tablo.sutunlar.findIndex((s) => !SIRA_SUTUNLARI.has(s.id));
  const olculen = Math.min(tablo.satirlar.length, OLCULEN_SATIR);
  const sonuc = tablo.sutunlar.map((s, j) => {
    if (SIRA_SUTUNLARI.has(s.id)) return 0;
    let enUzun = 0;
    for (let r = 0; r < olculen; r++) {
      const m = tablo.satirlar[r].hucreler[j];
      if (m) enUzun = Math.max(enUzun, yaziGenisligi(m.trim(), false));
    }
    // Menü düğmesi (j > 0) ya da sayısal ilk sütunun durağan tür çipi aynı 44 px'i kaplar
    const g = genislikHesapla(s.ad, !toplama && (j > 0 || s.tur === 'sayi'), enUzun, s.tur, toplama);
    // Hayalet satırın "Yeni satır…" yer tutucusu ilk görünen sütunda kesilmesin
    return j === ilkGorunen ? Math.max(g, YER_TUTUCU_SUTUNU) : g;
  });
  if (yaziHazir()) genislikOnbellegi.set(tablo, { ...kayit, [toplama ? 'toplama' : 'normal']: sonuc });
  return sonuc;
}

/**
 * Tablonun kaydırmadan sığacağı genişlik (px): # (45) + görünen sütunlar + satır işlemleri (44) + kaydırma payı (10).
 * `{ toplama: true }`: toplama görünümü ve salt okunur tablo (VT §5.2) — başlık menüsü ve satır işlemleri sütunu
 * yoktur, etiket sütunu en uzun değere göre en çok 160 px. Bileşen aynı ölçüyü çizer (th min-width).
 */
export function tabloDogalGenisligi(tablo: VeriTablosuModeli, secenek: { toplama?: boolean } = {}): number {
  const toplama = secenek.toplama === true;
  const sutunlar = sutunGenislikleri(tablo, toplama).reduce((t, g) => t + g, 0);
  return SIRA_GENISLIGI + sutunlar + (toplama ? 0 : SATIR_ISLEM_GENISLIGI) + KAYDIRMA_PAYI;
}

// ── Saf yardımcılar (sayı biçimi, sütun adı, yapıştırma) ──────────────────────────

/**
 * Odak çıkınca sayısal hücre metni: okunabiliyorsa Türkçe biçime getirilir ("3.5" → "3,5", "1.234,5" → "1234,5",
 * " 12 " → "12"). Zaten "123" ya da "3,50" biçimindeyse (kullanıcının yazdığı sondaki sıfır) dokunulmaz.
 * Okunamayan metin olduğu gibi kalır (hatalı hücre olarak işaretlenir).
 */
export function sayiMetniDuzelt(metin: string): string {
  const d = sayiOku(metin);
  if (d === null) return metin;
  const t = metin.trim();
  if (/^-?\d+(,\d+)?$/.test(t)) return t;
  return sayiYaz(d, 6);
}

const kucuk = (ad: string) => ad.trim().toLocaleLowerCase('tr');

/** Diğer sütun adlarıyla çakışmayan ad: "Boy" → "Boy (2)" → "Boy (3)" … (büyük/küçük harf ayrımı yok) */
export function benzersizSutunAdi(ad: string, digerleri: string[]): string {
  const kume = new Set(digerleri.map(kucuk));
  const temiz = ad.trim();
  if (!kume.has(kucuk(temiz))) return temiz;
  let n = 2;
  while (kume.has(kucuk(`${temiz} (${n})`))) n += 1;
  return `${temiz} (${n})`;
}

/**
 * Başlık düzenlemesi bitince: boş ad önceki ada döner, yinelenen ada " (2)" eklenir, baştaki/sondaki boşluk atılır.
 * Değişiklik yoksa aynı tablo döner.
 */
export function sutunAdiDuzelt(tablo: VeriTablosuModeli, indeks: number, oncekiAd: string): VeriTablosuModeli {
  const sutun = tablo.sutunlar[indeks];
  if (!sutun) return tablo;
  const digerleri = tablo.sutunlar.filter((_, k) => k !== indeks).map((s) => s.ad);
  const hedef = sutun.ad.trim() || oncekiAd.trim() || (indeks === 0 ? 'Etiket' : `Değişken ${indeks}`);
  const ad = benzersizSutunAdi(hedef, digerleri);
  return ad === sutun.ad ? tablo : sutunAdiDegistir(tablo, indeks, ad);
}

export interface YapistirmaSonucu {
  tablo: VeriTablosuModeli;
  /** İlk satır başlık sayılıp sütun adı yapıldı */
  baslikAlindi: boolean;
  satirSayisi: number;
  hucreSayisi: number;
}

/**
 * Yapıştırılan ızgarayı (satir, sutun) konumundan yazar.
 * - Boş tabloya ya da (0,0) hücresine yapıştırmada ilk satır başlıksa (`baslikSatiriMi`) sütun adı olur.
 * - Eklenen ya da boş sütunların türü yapıştırılan değerlerden belirlenir (`metinSutunlari`: metin → kategorik, yoksa sayısal).
 * - Sayısal sütuna giden okunabilir değerler Türkçe biçime getirilir (`sayiYaz(sayiOku(x), 6)`: "151.5" → "151,5").
 */
export function yapistirmaUygula(tablo: VeriTablosuModeli, satir: number, sutun: number, izgara: string[][]): YapistirmaSonucu {
  const basta = tablo.satirlar.length === 0 || (satir === 0 && sutun === 0);
  const baslikAlindi = basta && baslikSatiriMi(izgara);
  const baslik = baslikAlindi ? izgara[0] : null;
  const veri = baslikAlindi ? izgara.slice(1) : izgara;
  const genislik = Math.max(0, ...izgara.map((r) => r.length));
  // metinSutunlari ilk sütunu (etiket) hep atlar: ızgaranın her sütunu ölçülsün diye başa boş bir sütun eklenir
  const bulunan = metinSutunlari(veri.map((r) => ['', ...r]));
  const turler: SutunTuru[] = [];
  for (let k = 0; k < genislik; k++) {
    const j = sutun + k;
    const mevcut = tablo.sutunlar[j];
    const bos = !mevcut || tablo.satirlar.every((r) => (r.hucreler[j] ?? '').trim() === '');
    // İlk sütunun türü değişmez: etiket ya da araştırma tablosunun sayısal ilk sütunu (ölçüm değeri) olduğu gibi kalır
    if (j === 0) turler.push(mevcut?.tur ?? 'etiket');
    else if (bos) turler.push(bulunan[k + 1] === 'etiket' ? 'etiket' : 'sayi');
    else turler.push(mevcut.tur);
  }
  const normal = veri.map((r) =>
    r.map((h, k) => {
      if (turler[k] !== 'sayi') return h;
      const d = sayiOku(h);
      return d === null ? h : sayiYaz(d, 6);
    }),
  );
  let sonuc = yapistir(tablo, satir, sutun, normal);
  while (sonuc.sutunlar.length < sutun + genislik) sonuc = sutunEkle(sonuc);
  turler.forEach((tur, k) => {
    sonuc = sutunTuruDegistir(sonuc, sutun + k, tur);
  });
  if (baslik) {
    baslik.forEach((ham, k) => {
      const ad = ham.trim();
      if (!ad) return;
      const j = sutun + k;
      const digerleri = sonuc.sutunlar.filter((_, i) => i !== j).map((s) => s.ad);
      sonuc = sutunAdiDegistir(sonuc, j, benzersizSutunAdi(ad, digerleri));
    });
  }
  return { tablo: sonuc, baslikAlindi, satirSayisi: veri.length, hucreSayisi: veri.reduce((t, r) => t + r.length, 0) };
}

/**
 * Kapalı tablo bandının "son: …" metni. Salt okunur özet tablosunda (Deney özeti) son satırın adı ("7. deney (2000)"):
 * birimsiz bir göreli sıklık değeri tek başına bir şey anlatmaz. Öteki tablolarda önce grafikteki değişkenin hücresi;
 * sayısal ve adında birim varsa birimiyle ("72 atım/dk", "%50,4"). O hücre boşsa satırın ilk üç dolu hücresi (deney
 * sonuç sütunları hariç).
 */
export function bantSonMetni(
  tablo: VeriTablosuModeli,
  vurguluSutun: string | null,
  gorunenSutunlar: { sutun: VeriTablosuModeli['sutunlar'][number]; j: number }[],
  saltOkunur: boolean,
): string {
  const son = tablo.satirlar[tablo.satirlar.length - 1];
  if (!son) return '';
  const hucre = (j: number) => (son.hucreler[j] ?? '').trim();
  if (saltOkunur && gorunenSutunlar[0]) {
    const ad = hucre(gorunenSutunlar[0].j);
    if (ad) return ad;
  }
  const v = vurguluSutun ? gorunenSutunlar.find(({ sutun }) => sutun.id === vurguluSutun) : undefined;
  const deger = v ? hucre(v.j) : '';
  if (v && deger) {
    const birim = /\(([^()]*)\)\s*$/.exec(v.sutun.ad)?.[1].trim() ?? '';
    if (v.sutun.tur !== 'sayi' || !birim || sayiOku(deger) === null) return deger;
    return birim === '%' ? `%${deger}` : `${deger} ${birim}`;
  }
  return gorunenSutunlar
    .filter(({ sutun }) => arastirmaSutunRolu(sutun.id) !== 'deney')
    .map(({ j }) => hucre(j))
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
}

/** Öğenin `kok`e göre görünen konumu (offset zinciri; aradaki kaydırmalar düşülür, dönüşüm ölçeğinden etkilenmez) */
function kokaGoreKonum(el: HTMLElement, kok: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let e: HTMLElement | null = el;
  while (e && e !== kok) {
    x += e.offsetLeft;
    y += e.offsetTop;
    const ust = e.offsetParent as HTMLElement | null;
    for (let a: HTMLElement | null = e.parentElement; a && a !== ust; a = a.parentElement) {
      x -= a.scrollLeft;
      y -= a.scrollTop;
    }
    if (ust && ust !== kok) {
      x -= ust.scrollLeft;
      y -= ust.scrollTop;
    }
    e = ust;
  }
  return { x, y };
}

// ── Görünüm ────────────────────────────────────────────────────────────────────

const HUCRE =
  'h-11 w-full min-w-0 bg-transparent px-2 text-[13px] text-foreground outline-none scroll-mt-12 focus:bg-accent/60 focus:ring-2 focus:ring-inset focus:ring-ring';

/** Zebra şeritleri (opak: yapışkan sütunlar satır rengini devralır) */
const ZEBRA = 'odd:bg-card even:bg-[color-mix(in_srgb,hsl(var(--muted))_40%,hsl(var(--card)))]';
/** Seçili satır: mercan tonu (koyu temada daha güçlü), kalın yazı */
const SECILI_SATIR =
  'bg-[color-mix(in_srgb,#d9805f_15%,hsl(var(--card)))] dark:bg-[color-mix(in_srgb,#d9805f_25%,hsl(var(--card)))] font-semibold';
/** Yapışkan etiket sütununda grafik vurgusu (opak karşılığı bg-accent/40) */
const VURGU_OPAK = 'bg-[color-mix(in_srgb,hsl(var(--accent))_40%,hsl(var(--card)))]';
/** Yatay kaydırılınca yapışkan sütunun sağında gölge */
const YAPISKAN_GOLGE = 'shadow-[4px_0_6px_-3px_rgb(21_48_45/0.22)] dark:shadow-[4px_0_6px_-3px_rgb(0_0_0/0.6)]';
const MENU_OGESI =
  'flex min-h-11 w-full items-center gap-2.5 rounded-[calc(var(--radius)-8px)] px-3 py-1.5 text-left text-[13px] font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none';
const MENU_GENISLIGI = 256;

function UcNokta() {
  // Dikey üç nokta (⋮): tür çipinin yanında "başka seçenekler"
  return (
    <svg viewBox="0 0 4 16" className="h-4 w-1 shrink-0" aria-hidden="true">
      <circle cx="2" cy="3" r="1.6" fill="currentColor" />
      <circle cx="2" cy="8" r="1.6" fill="currentColor" />
      <circle cx="2" cy="13" r="1.6" fill="currentColor" />
    </svg>
  );
}

function KalemSimgesi() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        d="M3 13l.7-2.8 7-7a1.4 1.4 0 012 2l-7 7zM9.6 4.3l2.1 2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopSimgesi() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        d="M2.8 4.5h10.4M6.3 4.5V3h3.4v1.5M4.4 4.5l.6 8.5h6l.6-8.5M6.8 7v3.8M9.2 7v3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CarpiSimgesi({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

interface MenuDurumu {
  sutunId: string;
  sol: number;
  ust: number;
  genislik: number;
  onay: boolean;
}

export interface SutunMenusuProps {
  sutun: { id: string; ad: string; tur: SutunTuru };
  /** Sütundaki dolu hücre sayısı: 0'dan büyükse silme önce satır içi onay ister */
  doluSayisi: number;
  /** Kategorik sütunda sayı okunamayan değer sayısı (sayısala çevirince kırmızı görünecekler) */
  sayiOlmayanSayisi: number;
  /** Silme onayı gösteriliyor */
  onay: boolean;
  style?: React.CSSProperties;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onTurDegistir: (hedef: SutunTuru) => void;
  onAdlandir: () => void;
  /** "Sütunu sil": dolu sütunda onay ister (onay = true yapılmalı), boşta hemen siler */
  onSil: () => void;
  onSilOnayla: () => void;
  onVazgec: () => void;
}

/**
 * Sütun menüsü (başlıktaki tür çipi + ⋮ düğmesiyle açılır): türün açıklaması, "Kategorik yap" / "Sayısal yap",
 * "Yeniden adlandır" ve "Sütunu sil" (dolu sütunda satır içi onay). Opak `bg-popover`; öğeler 44 px.
 */
export const SutunMenusu = React.forwardRef<HTMLDivElement, SutunMenusuProps>(function SutunMenusu(
  { sutun, doluSayisi, sayiOlmayanSayisi, onay, style, onKeyDown, onTurDegistir, onAdlandir, onSil, onSilOnayla, onVazgec },
  ref,
) {
  const sayi = sutun.tur === 'sayi';
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`${sutun.ad} sütunu`}
      data-sutun-menu={sutun.id}
      onKeyDown={onKeyDown}
      className="absolute z-30 rounded-[calc(var(--radius)-4px)] border border-border bg-popover p-1 text-popover-foreground shadow-[0_18px_40px_-18px_rgba(6,40,45,.55)]"
      style={style}
    >
      <div className="flex items-start gap-2.5 px-3 pb-2 pt-2" role="presentation">
        <span className="flex w-9 shrink-0 justify-center">
          <TurIsareti tur={sutun.tur} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold leading-tight">{sayi ? 'Sayısal değişken' : 'Kategorik değişken'}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            {sayi ? 'Değerler sayıdır; ortalaması hesaplanabilir.' : 'Değerler grup adıdır (ör. A, B); gruplar sayılır.'}
          </p>
        </div>
      </div>
      <div className="my-0.5 h-px bg-border" role="separator" />
      <button type="button" role="menuitem" tabIndex={-1} data-tur-degistir className={MENU_OGESI} onClick={() => onTurDegistir(sayi ? 'etiket' : 'sayi')}>
        <span className="flex w-9 shrink-0 justify-center">
          <TurIsareti tur={sayi ? 'etiket' : 'sayi'} />
        </span>
        <span className="min-w-0">
          <span className="block">{sayi ? 'Kategorik yap' : 'Sayısal yap'}</span>
          {!sayi && sayiOlmayanSayisi > 0 && (
            <span className="block text-[12px] font-normal leading-snug text-muted-foreground">
              {sayiOlmayanSayisi} değer sayı değil; kırmızı görünecek
            </span>
          )}
        </span>
      </button>
      <button type="button" role="menuitem" tabIndex={-1} data-adlandir className={MENU_OGESI} onClick={onAdlandir}>
        <span className="flex w-9 shrink-0 justify-center">
          <KalemSimgesi />
        </span>
        Yeniden adlandır
      </button>
      <div className="my-0.5 h-px bg-border" role="separator" />
      {onay ? (
        <div className="m-1 rounded-[calc(var(--radius)-8px)] border border-destructive/50 bg-destructive/10 p-2" data-sutun-sil-onayi>
          <p className="px-1 pb-2 text-[13px] font-semibold leading-snug">
            {sutun.ad} sütunundaki {doluSayisi} değer silinsin mi?
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="h-11 flex-1 rounded-md bg-destructive px-4 text-[13px] font-semibold text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              onClick={onSilOnayla}
            >
              Evet, sil
            </button>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              data-vazgec
              className="h-11 flex-1 rounded-md px-4 text-[13px] font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onVazgec}
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <button type="button" role="menuitem" tabIndex={-1} data-sutun-sil className={`${MENU_OGESI} text-destructive`} onClick={onSil}>
          <span className="flex w-9 shrink-0 justify-center">
            <CopSimgesi />
          </span>
          Sütunu sil
        </button>
      )}
    </div>
  );
});

// Sunucuda (statik çizim, testler) layout effect uyarısı çıkmasın
const useTarayiciLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Yeni satırın mercan parlaması (ms) */
export const PARLAMA_SURESI = 600;
/** Satır seçildikten sonra bu süre içindeki silme dokunuşu yok sayılır (çift dokunuş satırı yanlışlıkla silmesin) */
const CIFT_DOKUNUS_MS = 400;
/**
 * Tablo bandında görünen satır sayısı; başlık ve satır yüksekliği çizimden ölçülür (ilk tahmin: 36 + 1, 44 + 1 kenarlık).
 * Açık bant: başlık 37 + 3 × 45 + alt şerit 44 = 216 px (§0); son iki veri satırı ve yazmaya hazır satır görünür.
 */
const BANT_SATIRI = 3;
const BANT_ILK_OLCU = { baslik: 37, satir: 45 };
const VARSAYILAN_BOS_ILETI = 'Tablo boş: alttaki satıra yazın, Excel’den yapıştırın ya da “Örnek veri” seçin.';
const SALT_OKUNUR_BOS_ILETI = 'Tablo boş.';
const VARSAYILAN_SALT_OKUNUR_NOTU = 'Bu tablo kendiliğinden hesaplanır; düzenlenemez.';
const KILIT_NOTU = 'Satırlar yazılırken tablo düzenlenemez.';
/** Yeni satır parlaması (opak: yapışkan sütunlar satır rengini devralır) */
const PARLAMA =
  'bg-[color-mix(in_srgb,#d9805f_20%,hsl(var(--card)))] dark:bg-[color-mix(in_srgb,#d9805f_30%,hsl(var(--card)))]';

function OkSimgesi({ yukari }: { yukari: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        d={yukari ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KilitSimgesi() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5.3a2.5 2.5 0 015 0V7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function VeriTablosu({
  tablo,
  seciliSatir,
  onSatirSec,
  onTablo,
  vurguluSutun,
  sonaKaydir = false,
  onTemizle,
  satirRengi,
  toplamaGorunumu = false,
  yeniSatirKimligi = null,
  bosIleti,
  saltOkunur = false,
  saltOkunurNotu,
  bantModu = false,
  bantAcik,
  onBantAcik,
  kilitli = false,
}: VeriTablosuProps) {
  const kokRef = useRef<HTMLDivElement>(null);
  const kaydirmaRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const azaltilmisHareket = useAzaltilmisHareket();
  const [tumunuGoster, setTumunuGoster] = useState(false);
  const [temizleOnayi, setTemizleOnayi] = useState(false);
  const [menu, setMenu] = useState<MenuDurumu | null>(null);
  const [pencereBas, setPencereBas] = useState<number | null>(null);
  const [tasma, setTasma] = useState({ sag: false, sol: false, sagBosluk: 0, altBosluk: 0 });
  const [, setOlcumSurumu] = useState(0);
  const satirSayisi = tablo.satirlar.length;

  /** Hücre, başlık ve tablo yapısı düzenlenebilir mi (salt okunurda ve kilitliyken hayır) */
  const duzenlenebilir = !saltOkunur && !kilitli;
  /** Başlıkta sütun menüsü ve satır silme sütunu var mı (toplama görünümünde ve salt okunurda yok) */
  const tamDenetim = !toplamaGorunumu && !saltOkunur;
  /** Bantta menüsüz başlık 40 px (menü düğmesi 44 px olduğu için yalnız menüsüzken alçalır) */
  const alcakBaslik = bantModu && !tamDenetim;
  const [icBantAcik, setIcBantAcik] = useState(true);
  const bantAcikMi = bantAcik ?? icBantAcik;
  /** Tablo gövdesi çiziliyor mu (bant kapalıyken yalnız 44 px'lik özet şeridi) */
  const tabloGorunur = !bantModu || bantAcikMi;
  /** Satır eklenince sona kay (bant hep sona kayar) */
  const sonaKay = sonaKaydir || bantModu;

  // Web yazı tipi sonradan yüklenirse genişlikler yeniden ölçülür
  useEffect(() => {
    if (yaziHazir() || typeof document === 'undefined' || !document.fonts) return;
    let iptal = false;
    document.fonts.ready.then(() => {
      if (!iptal && yaziHazir()) setOlcumSurumu((s) => s + 1);
    });
    return () => {
      iptal = true;
    };
  }, []);

  // Tablo bandı: kaydırma kutusu başlık + 3 satır boyundadır; ölçüler çizimden alınır. Durum yalnız ölçü değişince
  // yazılır (her çizimde koşulsuz güncelleme hızlı veri girişinde React'in iç içe güncelleme sayacını doldurur)
  const [bantOlcu, setBantOlcu] = useState(BANT_ILK_OLCU);
  useTarayiciLayoutEffect(() => {
    if (!bantModu || !tabloGorunur) return;
    const k = kaydirmaRef.current;
    if (!k) return;
    const baslik = k.querySelector('thead')?.offsetHeight || BANT_ILK_OLCU.baslik;
    const satir = k.querySelector<HTMLElement>('tbody tr[data-satir]')?.offsetHeight || BANT_ILK_OLCU.satir;
    if (bantOlcu.baslik !== baslik || bantOlcu.satir !== satir) setBantOlcu({ baslik, satir });
  });

  /**
   * Kutuyu sona kaydırır. Bantta hayalet (yeni) satır varsa o alt kenara gelir: son iki veri satırı ve yazmaya hazır
   * satır kaydırmadan görünür (korunan karar 4); yoksa son veri satırı alt kenardadır.
   */
  const sonaIn = useCallback(() => {
    const el = kaydirmaRef.current;
    if (!el) return;
    const son = bantModu
      ? el.querySelector<HTMLElement>('tr[data-bos-satir]') ?? el.querySelector<HTMLElement>(`tr[data-satir="${satirSayisi - 1}"]`)
      : null;
    if (bantModu && satirSayisi === 0) el.scrollTop = 0;
    else if (son) el.scrollTop = Math.max(0, kokaGoreKonum(son, el).y + son.offsetHeight - el.clientHeight);
    else el.scrollTop = el.scrollHeight;
  }, [bantModu, satirSayisi]);

  const oncekiSatirSayisi = useRef(satirSayisi);
  useEffect(() => {
    if (sonaKay && satirSayisi > oncekiSatirSayisi.current) {
      if (pencereBas !== null) setPencereBas(null);
      sonaIn();
    }
    oncekiSatirSayisi.current = satirSayisi;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satirSayisi, sonaKay, sonaIn]);
  // Bant açılınca (ve ölçüsü değişince) son satırlar görünür
  useEffect(() => {
    if (bantModu && tabloGorunur) sonaIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bantModu, tabloGorunur, bantOlcu]);

  // Yeni satır parlaması: 600 ms; azaltılmış harekette yok
  const [parlayan, setParlayan] = useState<string | null>(yeniSatirKimligi);
  const parlayanRef = useRef(parlayan);
  parlayanRef.current = parlayan;
  useEffect(() => {
    // Değişmeyen değer yazılmaz (boş güncelleme de bir çizim ve iç içe güncelleme sayılır)
    if (!yeniSatirKimligi || azaltilmisHareket) {
      if (parlayanRef.current !== null) setParlayan(null);
      return;
    }
    if (parlayanRef.current !== yeniSatirKimligi) setParlayan(yeniSatirKimligi);
    const z = window.setTimeout(() => setParlayan((p) => (p === yeniSatirKimligi ? null : p)), PARLAMA_SURESI);
    return () => window.clearTimeout(z);
  }, [yeniSatirKimligi, azaltilmisHareket]);

  // Çift dokunuş koruması: satır yeni seçildiyse ya da az önce bir satır silindiyse hemen gelen silme dokunuşu yok
  // sayılır (seçmek için yapılan ikinci dokunuş ya da × üstünde çift tıklama iki satır silmesin)
  const secimAni = useRef(0);
  useEffect(() => {
    secimAni.current = Date.now();
  }, [seciliSatir]);
  const silmeHazir = () => Date.now() - secimAni.current >= CIFT_DOKUNUS_MS;

  // 300+ satırda yalnız bir pencere çizilir; seçili satır pencerenin dışındaysa pencere ona taşınır
  const pencereli = satirSayisi > GORUNUR_SINIR && !tumunuGoster;
  const enSonBas = Math.max(0, satirSayisi - GORUNUR_SINIR);
  const gorunenBaslangic = pencereli ? Math.min(enSonBas, Math.max(0, pencereBas ?? (sonaKay ? enSonBas : 0))) : 0;
  const gorunenBitis = pencereli ? gorunenBaslangic + GORUNUR_SINIR : satirSayisi;
  /** Hayalet (yeni) satır yalnız son satır görünürken çizilir; indeksi = satır sayısı. Salt okunurda yok */
  const bosSatirVar = gorunenBitis === satirSayisi && !saltOkunur;
  /** Hayalet satıra gezinilebilir mi (kilitliyken girdileri pasif) */
  const bosSatirGezilir = bosSatirVar && !kilitli;
  useEffect(() => {
    if (!pencereli || seciliSatir === null || seciliSatir >= satirSayisi) return;
    if (seciliSatir < gorunenBaslangic || seciliSatir >= gorunenBitis) {
      setPencereBas(Math.max(0, Math.min(enSonBas, seciliSatir - Math.floor(GORUNUR_SINIR / 2))));
    }
  }, [seciliSatir, pencereli, gorunenBaslangic, gorunenBitis, enSonBas, satirSayisi]);

  // Grafikte seçilen satır görünür alana kayar (odak tablodaysa tarayıcı zaten kaydırır; dokunulmaz)
  useEffect(() => {
    if (seciliSatir === null) return;
    const kap = kaydirmaRef.current;
    const kok = kokRef.current;
    if (!kap || !kok || kok.contains(document.activeElement)) return;
    const tr = kap.querySelector<HTMLElement>(`tr[data-satir="${seciliSatir}"]`);
    if (!tr) return;
    const baslik = kap.querySelector('thead')?.offsetHeight ?? 44;
    // Satırın kaydırma kutusunun içeriğindeki konumu (kutunun kendi kaydırması düşülmez)
    const ust = kokaGoreKonum(tr, kap).y;
    const alt = ust + tr.offsetHeight;
    let hedef: number | null = null;
    if (ust - baslik < kap.scrollTop) hedef = ust - baslik - 4;
    else if (alt > kap.scrollTop + kap.clientHeight) hedef = alt - kap.clientHeight + 4;
    if (hedef !== null) kap.scrollTo({ top: Math.max(0, hedef), behavior: azaltilmisHareket ? 'auto' : 'smooth' });
  }, [seciliSatir, gorunenBaslangic, azaltilmisHareket, tabloGorunur]);

  // Yatay taşma: sağ kenarda gradyan, yapışkan sütunda gölge. Durum yalnız değişince yazılır (her tablo değişiminde
  // boş güncelleme hızlı veri girişinde gereksiz çizim ve iç içe güncelleme olur)
  const tasmaRef = useRef(tasma);
  const tasmaOlc = useCallback(() => {
    const k = kaydirmaRef.current;
    if (!k) return;
    const sag = k.scrollLeft + k.clientWidth < k.scrollWidth - 1;
    const sol = k.scrollLeft > 0;
    const sagBosluk = k.offsetWidth - k.clientWidth;
    const altBosluk = k.offsetHeight - k.clientHeight;
    const o = tasmaRef.current;
    if (o.sag === sag && o.sol === sol && o.sagBosluk === sagBosluk && o.altBosluk === altBosluk) return;
    tasmaRef.current = { sag, sol, sagBosluk, altBosluk };
    setTasma(tasmaRef.current);
  }, []);
  useEffect(() => {
    tasmaOlc();
  }, [tablo, tumunuGoster, tasmaOlc, tabloGorunur, toplamaGorunumu, saltOkunur]);
  useEffect(() => {
    const k = kaydirmaRef.current;
    if (!k || typeof ResizeObserver === 'undefined') return;
    const gozlemci = new ResizeObserver(tasmaOlc);
    gozlemci.observe(k);
    const t = k.querySelector('table');
    if (t) gozlemci.observe(t);
    return () => gozlemci.disconnect();
  }, [tasmaOlc, tabloGorunur]);

  /** Bir sonraki çizimde odaklanacak öğe (seçici); 'tumu' yazıyı seçer, 'son' imleci sona koyar */
  const bekleyenOdak = useRef<{ secici: string; secim: 'tumu' | 'son' | 'yok' } | null>(null);
  useTarayiciLayoutEffect(() => {
    const b = bekleyenOdak.current;
    if (!b) return;
    bekleyenOdak.current = null;
    const el = kokRef.current?.querySelector<HTMLElement>(b.secici);
    if (!el) return;
    el.focus();
    if (el instanceof HTMLInputElement) {
      if (b.secim === 'tumu') el.select();
      else if (b.secim === 'son') {
        const son = el.value.length;
        try {
          el.setSelectionRange(son, son);
        } catch {
          /* bazı girdi türleri imleç konumunu desteklemez */
        }
      }
    }
  });

  const [yapistirmaBildirimi, setYapistirmaBildirimi] = useState<string | null>(null);
  // Bildirim zamanlayıcısı sökülünce temizlenir (söküldükten sonra setState olmasın)
  const bildirimZamanlayici = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(bildirimZamanlayici.current), []);
  const bildir = (metin: string) => {
    setYapistirmaBildirimi(metin);
    window.clearTimeout(bildirimZamanlayici.current);
    bildirimZamanlayici.current = window.setTimeout(() => setYapistirmaBildirimi(null), 4000);
  };

  // Kilit gelince (ya da salt okunur olunca) açık menü ve Temizle onayı kapanır
  useEffect(() => {
    if (duzenlenebilir) return;
    if (menu !== null) setMenu(null);
    if (temizleOnayi) setTemizleOnayi(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duzenlenebilir]);

  const hatalilar = hataliHucreler(tablo);
  /**
   * Tabloda gösterilen sütunlar: deneyin "Çekiliş" ve ölçümlerin "Tekrar" numarası satır numarasının (#) aynısı
   * olduğu için gizlenir (veride ve CSV'de durur). j = sütunun tablodaki gerçek indeksi.
   */
  const gorunenSutunlar = tablo.sutunlar.map((sutun, j) => ({ sutun, j })).filter(({ sutun }) => !SIRA_SUTUNLARI.has(sutun.id));
  const ilkGorunen = gorunenSutunlar[0];
  /** İlk görünen sütun etiketse yatay kaydırmada # ile birlikte yapışkan kalır */
  const yapiskanJ = ilkGorunen && ilkGorunen.sutun.tur === 'etiket' ? ilkGorunen.j : -1;
  // Menüsüz görünümde (toplama, salt okunur) sütunlar tabloDogalGenisligi(tablo, { toplama: true }) ile aynı ölçülür
  const genislikler = sutunGenislikleri(tablo, !tamDenetim);
  const yapiskanGenislik = SIRA_GENISLIGI + (yapiskanJ >= 0 ? genislikler[yapiskanJ] : 0);
  const hataliMi = (satir: number, sutun: number) => hatalilar.some((h) => h.satir === satir && h.sutun === sutun);
  /** Değerlerinin hiçbiri sayı olmayan sayısal sütun: alt şeritte "Kategorik yap" önerilir */
  const turOnerisi = gorunenSutunlar.find(({ sutun, j }) => {
    if (j === 0 || sutun.tur !== 'sayi') return false;
    const dolu = tablo.satirlar.map((r) => (r.hucreler[j] ?? '').trim()).filter((h) => h !== '');
    return dolu.length > 0 && dolu.every((h) => sayiOku(h) === null);
  });
  /** # + sütunlar (+ satır işlemleri) */
  const sutunSayisi = gorunenSutunlar.length + 1 + (tamDenetim ? 1 : 0);

  const odakla = useCallback((satir: number, sutun: number) => {
    const el = kokRef.current?.querySelector<HTMLInputElement>(`[data-hucre="${satir}-${sutun}"]`);
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  /**
   * Tabloda gezinme (alttaki boş satır da gezilebilir bir satırdır). Hedef hücre varsa oraya odaklanır ve
   * true döner. Hedef yoksa Enter yutulur; Tab/Shift+Tab ise false döner ve tarayıcının doğal odak sırası
   * işler — klavye kullanıcısı tablodan çıkabilsin (WCAG 2.1.2, klavye tuzağı olmasın).
   */
  const gez = (satir: number, sutun: number, yon: GezintiYonu): boolean => {
    // Gizli sıra sütunları (Çekiliş, Tekrar) atlanır
    let hedef: { satir: number; sutun: number } | null = { satir, sutun };
    do {
      hedef = sonrakiHucre(hedef, yon, satirSayisi + (bosSatirGezilir ? 1 : 0), tablo.sutunlar.length);
    } while (hedef && SIRA_SUTUNLARI.has(tablo.sutunlar[hedef.sutun]?.id ?? ''));
    if (hedef) {
      odakla(hedef.satir, hedef.sutun);
      onSatirSec(hedef.satir < satirSayisi ? hedef.satir : null);
      return true;
    }
    return yon === 'enter';
  };

  /** Boş satıra yazılan ilk karakter: satır eklenir, değer yazılır, odak yeni satırın aynı hücresine geçer */
  const bosSatiraYaz = (sutun: number, deger: string) => {
    if (deger === '' || !duzenlenebilir) return;
    bekleyenOdak.current = { secici: `[data-hucre="${satirSayisi}-${sutun}"]`, secim: 'son' };
    onTablo(hucreYaz(satirEkle(tablo), satirSayisi, sutun, deger));
  };

  const hucreKlavye = (e: React.KeyboardEvent<HTMLInputElement>, satir: number, sutun: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      gez(satir, sutun, 'enter');
    } else if (e.key === 'Tab') {
      // Yalnız tablo içinde hedef varsa yutulur; ilk/son hücrede odak tablodan çıkar
      if (gez(satir, sutun, e.shiftKey ? 'shift-tab' : 'tab')) e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      gez(satir, sutun, 'asagi');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      gez(satir, sutun, 'yukari');
    } else if (e.key === 'Escape') {
      // Odak gövdeye düşmesin: satırın # düğmesine (seç ya da toplama görünümünde sil) gider
      e.preventDefault();
      const dugme = kokRef.current?.querySelector<HTMLButtonElement>(`[data-satir-sec="${satir}"], th [data-satir-sil="${satir}"]`);
      if (dugme) dugme.focus();
    }
  };

  const hucreYapistir = (e: React.ClipboardEvent<HTMLInputElement>, satir: number, sutun: number) => {
    if (!duzenlenebilir) {
      e.preventDefault();
      return;
    }
    const metin = e.clipboardData.getData('text/plain');
    if (!/[\t\r\n;,]/.test(metin)) return; // tek hücre: tarayıcı yapıştırsın
    const izgara = yapistirmayiAyristir(metin);
    const cokHucre = izgara.length > 1 || (izgara[0]?.length ?? 0) > 1;
    if (!cokHucre) return;
    e.preventDefault();
    const sonuc = yapistirmaUygula(tablo, satir, sutun, izgara);
    const ozet = `${sonuc.satirSayisi} satır, ${sonuc.hucreSayisi} hücre yapıştırıldı.`;
    const bildirim = sonuc.baslikAlindi ? `Başlık satırı sütun adı yapıldı · ${ozet}` : ozet;
    onTablo(sonuc.tablo, { geriAlMetni: bildirim });
    bildir(bildirim);
  };

  // ── Sütun başlığı: ad düzenleme ve sütun menüsü ──
  /** Odaklanınca başlığın adı saklanır: boş bırakılırsa ona dönülür, Escape ile geri alınır */
  const baslikOdak = useRef<{ id: string; ad: string; vazgec: boolean } | null>(null);

  const sutunEkleVeAdlandir = () => {
    if (!duzenlenebilir) return;
    const yeni = sutunEkle(tablo);
    const son = yeni.sutunlar[yeni.sutunlar.length - 1];
    bekleyenOdak.current = { secici: `[data-sutun-adi="${son.id}"]`, secim: 'tumu' };
    onTablo(yeni);
  };

  const menuAc = (sutunId: string, dugme: HTMLElement) => {
    if (menu?.sutunId === sutunId) {
      setMenu(null);
      return;
    }
    const kok = kokRef.current;
    const kap = kaydirmaRef.current;
    const th = dugme.closest('th');
    if (!kok || !kap || !th) return;
    // Başlık hep kutunun tepesinde (yapışkan); yatayda yapışkan sütun # sütununun hemen sağındadır
    const kapKonum = kokaGoreKonum(kap, kok);
    const thX = th.hasAttribute('data-yapiskan') ? SIRA_GENISLIGI : kokaGoreKonum(th, kap).x - kap.scrollLeft;
    const genislik = Math.min(MENU_GENISLIGI, kok.offsetWidth - 8);
    const sag = kapKonum.x + thX + th.offsetWidth;
    const sol = Math.max(4, Math.min(sag - genislik, kok.offsetWidth - genislik - 4));
    const ust = kapKonum.y + (kap.querySelector('thead')?.offsetHeight ?? th.offsetHeight) + 2;
    setMenu({ sutunId, sol, ust, genislik, onay: false });
  };

  const menuKapat = useCallback((odakDugmeye: boolean) => {
    setMenu((m) => {
      if (m && odakDugmeye) bekleyenOdak.current = { secici: `[data-sutun-menusu="${m.sutunId}"]`, secim: 'yok' };
      return null;
    });
  }, []);

  // Menü açıkken: ilk öğeye odak; dışarı dokunuş kapatır
  const menuAcik = menu !== null;
  const menuOnay = menu?.onay ?? false;
  useEffect(() => {
    if (!menuAcik) return;
    const hedef = menuOnay
      ? menuRef.current?.querySelector<HTMLElement>('[data-vazgec]')
      : menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    hedef?.focus();
  }, [menuAcik, menuOnay, menu?.sutunId]);
  useEffect(() => {
    if (!menuAcik) return;
    const dokunus = (e: PointerEvent) => {
      const hedef = e.target as Element | null;
      if (!hedef || menuRef.current?.contains(hedef) || hedef.closest?.('[data-sutun-menusu]')) return;
      setMenu(null);
    };
    document.addEventListener('pointerdown', dokunus);
    return () => document.removeEventListener('pointerdown', dokunus);
  }, [menuAcik]);

  const menuTusu = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const ogeler = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
    const i = ogeler.indexOf(document.activeElement as HTMLElement);
    let hedef: number | null = null;
    if (e.key === 'ArrowDown') hedef = (i + 1) % ogeler.length;
    else if (e.key === 'ArrowUp') hedef = (i - 1 + ogeler.length) % ogeler.length;
    else if (e.key === 'Home') hedef = 0;
    else if (e.key === 'End') hedef = ogeler.length - 1;
    else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      menuKapat(true);
      return;
    } else if (e.key === 'Tab') {
      menuKapat(false);
      return;
    }
    if (hedef === null || ogeler.length === 0) return;
    e.preventDefault();
    ogeler[hedef]?.focus();
  };

  const sutunuSil = (j: number) => {
    if (!duzenlenebilir) return;
    const ad = tablo.sutunlar[j]?.ad ?? '';
    // Odak: soldaki sütunun menüsü, yoksa "+ Sütun"
    const sira = gorunenSutunlar.findIndex((g) => g.j === j);
    const onceki = sira > 0 ? gorunenSutunlar[sira - 1] : null;
    bekleyenOdak.current =
      onceki && onceki.j > 0
        ? { secici: `[data-sutun-menusu="${onceki.sutun.id}"]`, secim: 'yok' }
        : { secici: '[data-sutun-ekle]', secim: 'yok' };
    setMenu(null);
    onTablo(sutunSil(tablo, j), { geriAlMetni: `Sütun silindi: ${ad}.` });
  };

  const satiriSil = (i: number) => {
    if (!duzenlenebilir) return;
    secimAni.current = Date.now();
    const kalan = satirSayisi - 1;
    bekleyenOdak.current =
      kalan > 0 ? { secici: `[data-satir-sec="${Math.min(i, kalan - 1)}"]`, secim: 'yok' } : { secici: '[data-bos-satir] input', secim: 'yok' };
    onTablo(satirSil(tablo, i), { geriAlMetni: '1 satır silindi.' });
    if (seciliSatir === i) onSatirSec(null);
    else if (seciliSatir !== null && seciliSatir > i) onSatirSec(seciliSatir - 1);
  };

  const bantDegistir = (acik: boolean) => {
    bekleyenOdak.current = { secici: '[data-bant-dugmesi]', secim: 'yok' };
    if (bantAcik === undefined) setIcBantAcik(acik);
    onBantAcik?.(acik);
  };

  const menuSutunu = menu ? gorunenSutunlar.find((g) => g.sutun.id === menu.sutunId) ?? null : null;
  useEffect(() => {
    if (menuAcik && !menuSutunu) setMenu(null);
  }, [menuAcik, menuSutunu]);
  const menuDolu = menuSutunu ? tablo.satirlar.filter((r) => (r.hucreler[menuSutunu.j] ?? '').trim() !== '').length : 0;
  const menuSayiOlmayan =
    menuSutunu && menuSutunu.sutun.tur === 'etiket'
      ? tablo.satirlar.filter((r) => {
          const h = (r.hucreler[menuSutunu.j] ?? '').trim();
          return h !== '' && sayiOku(h) === null;
        }).length
      : 0;

  const kaydirildi = tasma.sol;
  const kisaDurum = bantModu || !tamDenetim;
  const durumMetni =
    yapistirmaBildirimi ??
    (hatalilar.length > 0
      ? turOnerisi
        ? `${turOnerisi.sutun.ad}: değerler sayı değil`
        : `${hatalilar.length} hücre sayı olarak okunamadı`
      : kisaDurum
        ? `${satirSayisi} satır`
        : `${satirSayisi} satır · ${degiskenSutunlari(tablo).length} değişken`);
  const bantDugmesi = (acik: boolean) => (
    <button
      type="button"
      className={DUGME}
      data-bant-dugmesi={acik ? 'gizle' : 'goster'}
      aria-expanded={acik}
      onClick={() => bantDegistir(!acik)}
    >
      {acik ? 'Tabloyu gizle' : 'Tabloyu göster'}
      <OkSimgesi yukari={!acik} />
    </button>
  );

  // Bant kapalı: 44 px'lik özet şeridi ("Tablo · 84 satır · son: Tura")
  if (!tabloGorunur) {
    const sonMetni = bantSonMetni(tablo, vurguluSutun ?? null, gorunenSutunlar, saltOkunur);
    const ozet = `Tablo · ${satirSayisi} satır${sonMetni ? ` · son: ${sonMetni}` : ''}`;
    return (
      <div ref={kokRef} className="relative flex h-11 min-w-0 items-center gap-2 bg-card pl-3 pr-1 text-[13px]" data-tablo-bandi="kapali">
        <span className="min-w-0 flex-1 truncate text-muted-foreground" title={ozet}>
          {/* İç yazı kendi genişliğinde: tost sağdaki boşluğa sığıyor mu diye ölçülür */}
          <span data-bant-ozeti="">
            <span className="font-bold text-foreground">Tablo</span> · {satirSayisi} satır
            {sonMetni ? ` · son: ${sonMetni}` : ''}
          </span>
        </span>
        {bantDugmesi(false)}
      </div>
    );
  }

  return (
    <div
      ref={kokRef}
      className={`relative flex flex-col ${bantModu ? '' : 'h-full min-h-0'}`}
      data-tablo-bandi={bantModu ? 'acik' : undefined}
      data-tablo-kilitli={kilitli || undefined}
      data-salt-okunur={saltOkunur || undefined}
    >
      <div className={`relative flex flex-col ${bantModu ? '' : 'min-h-0 flex-1'}`}>
        {/* relative: tablodaki mutlak konumlu öğeler (ekran okuyucu metinleri) kaydırma kutusunun içinde kalır, pencereyi uzatmaz */}
        <div
          ref={kaydirmaRef}
          className={`relative overflow-auto ${bantModu ? 'shrink-0' : 'min-h-0 flex-1'}`}
          // Bant: başlık + 3 satır (yatay kaydırma çubuğu varsa onun payı da)
          style={bantModu ? { height: bantOlcu.baslik + BANT_SATIRI * bantOlcu.satir + tasma.altBosluk } : undefined}
          onScroll={() => {
            tasmaOlc();
            if (menuAcik) setMenu(null);
          }}
        >
          <table className="w-full border-separate border-spacing-0 text-[13px]" aria-label="Veri tablosu" aria-readonly={saltOkunur || kilitli || undefined}>
            <thead className="sticky top-0 z-10 bg-card">
              <tr>
                <th
                  scope="col"
                  className={`sticky left-0 z-20 w-[45px] min-w-[45px] border-b border-r border-border bg-muted px-1 text-center text-[13px] font-bold text-muted-foreground ${
                    alcakBaslik ? 'h-9' : 'h-11'
                  }`}
                >
                  #
                </th>
                {gorunenSutunlar.map(({ sutun, j }) => {
                  const sayi = sutun.tur === 'sayi';
                  const menuVar = tamDenetim && j > 0;
                  /** Sayısal ilk sütun (araştırma tablosu): menüsü yok, türü durağan çiple gösterilir */
                  const duraganCip = tamDenetim && j === 0 && sayi;
                  const yapiskan = j === yapiskanJ;
                  const menuAcikBu = menu?.sutunId === sutun.id;
                  return (
                    <th
                      scope="col"
                      key={sutun.id}
                      data-sutun-id={sutun.id}
                      data-yapiskan={yapiskan || undefined}
                      style={{ minWidth: genislikler[j] }}
                      className={`${alcakBaslik ? 'h-9' : 'h-11'} border-b border-r border-border p-0 text-left align-middle font-bold ${
                        vurguluSutun === sutun.id ? 'bg-accent' : 'bg-muted'
                      } ${yapiskan ? `sticky left-[45px] z-20 ${kaydirildi ? YAPISKAN_GOLGE : ''}` : ''}`}
                    >
                      <div className={`flex items-stretch ${alcakBaslik ? 'min-h-9' : 'min-h-11'}`}>
                        {/* Ad iki satıra kırılır (bantta tek satır, tamamı title'da); üstündeki görünmez girdiye dokununca
                            düzenlenir (odakta görünür) */}
                        <div className={`relative min-w-0 flex-1 ${duzenlenebilir ? 'hover:bg-accent/50' : ''}`}>
                          <span aria-hidden="true" className={`flex h-full items-center px-2 ${alcakBaslik ? 'py-0.5' : 'py-1'} ${sayi ? 'justify-end' : ''}`}>
                            <span
                              className={`${alcakBaslik ? 'line-clamp-1' : 'line-clamp-2'} min-w-0 whitespace-normal break-words text-[13px] font-bold leading-tight text-foreground ${
                                sayi ? 'text-right' : ''
                              }`}
                            >
                              {sutun.ad || ' '}
                            </span>
                          </span>
                          <input
                            data-sutun-adi={sutun.id}
                            aria-label={`Sütun adı: ${sutun.ad}`}
                            title={sutun.ad}
                            size={1}
                            readOnly={!duzenlenebilir}
                            className={`absolute inset-0 h-full w-full min-w-0 bg-transparent px-2 text-[13px] font-bold text-foreground opacity-0 outline-none focus:bg-card focus:opacity-100 focus:ring-2 focus:ring-inset focus:ring-ring ${
                              sayi ? 'text-right' : ''
                            } ${duzenlenebilir ? '' : 'cursor-default'}`}
                            value={sutun.ad}
                            onFocus={() => {
                              baslikOdak.current = duzenlenebilir ? { id: sutun.id, ad: sutun.ad, vazgec: false } : null;
                            }}
                            onChange={(e) => {
                              if (duzenlenebilir) onTablo(sutunAdiDegistir(tablo, j, e.target.value));
                            }}
                            onBlur={() => {
                              const o = baslikOdak.current;
                              baslikOdak.current = null;
                              if (!o || o.id !== sutun.id) return;
                              if (o.vazgec) {
                                if (sutun.ad !== o.ad) onTablo(sutunAdiDegistir(tablo, j, o.ad));
                                return;
                              }
                              const duzelmis = sutunAdiDuzelt(tablo, j, o.ad);
                              if (duzelmis !== tablo) onTablo(duzelmis);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (satirSayisi > 0) odakla(0, j);
                                else if (bosSatirGezilir) odakla(satirSayisi, j);
                                else e.currentTarget.blur();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                if (baslikOdak.current) baslikOdak.current.vazgec = true;
                                e.currentTarget.blur();
                              }
                            }}
                          />
                        </div>
                        {duraganCip && (
                          <span
                            className="flex h-11 w-11 shrink-0 items-center justify-center self-center"
                            title="Sayısal sütun · ilk sütunun türü değişmez"
                            data-ilk-sutun-turu="sayi"
                          >
                            <TurIsareti tur="sayi" />
                          </span>
                        )}
                        {/* Sütun menüsü: tür çipi (123 / Abc) + ⋮ — tür, yeniden adlandırma ve silme burada */}
                        {menuVar && (
                          <button
                            type="button"
                            data-sutun-menusu={sutun.id}
                            data-sutun-turu={sutun.tur}
                            aria-haspopup="menu"
                            aria-expanded={menuAcikBu}
                            aria-label={`${sutun.ad} sütunu (${sayi ? 'sayısal' : 'kategorik'}): seçenekler`}
                            title={kilitli ? KILIT_NOTU : `${sayi ? 'Sayısal' : 'Kategorik'} sütun · tür, ad ve silme`}
                            disabled={kilitli}
                            className={`flex h-11 w-11 shrink-0 items-center justify-center gap-0.5 self-center text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${
                              menuAcikBu ? 'bg-accent text-foreground' : ''
                            }`}
                            onClick={(e) => menuAc(sutun.id, e.currentTarget)}
                          >
                            <TurIsareti tur={sutun.tur} />
                            <UcNokta />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
                {tamDenetim && (
                  <th scope="col" className="h-11 w-11 min-w-11 border-b border-border bg-muted" aria-label="Satır işlemleri" />
                )}
              </tr>
            </thead>
            <tbody>
              {pencereli && gorunenBaslangic > 0 && (
                <tr>
                  <td colSpan={sutunSayisi} className="border-b border-border px-3 py-1 text-[13px] text-muted-foreground">
                    Üstte {gorunenBaslangic} satır gizli ({GORUNUR_SINIR} satır gösteriliyor).{' '}
                    <button type="button" className="h-11 px-2 font-semibold text-primary hover:underline" onClick={() => setTumunuGoster(true)}>
                      Tümünü göster
                    </button>
                  </td>
                </tr>
              )}
              {tablo.satirlar.slice(gorunenBaslangic, gorunenBitis).map((satir, k) => {
                const i = gorunenBaslangic + k;
                const secili = seciliSatir === i;
                const renk = satirRengi?.(i);
                const yeni = satir.id === yeniSatirKimligi;
                const parliyor = !secili && parlayan === satir.id;
                // Toplama görünümünde seçili satırın # hücresi satırı siler
                const numaradaSil = toplamaGorunumu && secili && duzenlenebilir;
                return (
                  <tr
                    key={satir.id}
                    className={`group scroll-mt-12 ${yeni ? 'transition-colors duration-500 motion-reduce:transition-none' : ''} ${
                      secili ? SECILI_SATIR : parliyor ? PARLAMA : ZEBRA
                    }`}
                    data-satir={i}
                    data-secili={secili || undefined}
                    data-yeni-satir={parliyor || undefined}
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-[2] w-[45px] min-w-[45px] border-b border-r border-border p-0 ${
                        secili ? 'bg-[#d9805f] text-[#15302d]' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {numaradaSil ? (
                        <button
                          type="button"
                          aria-label={`${i + 1}. satırı sil`}
                          title="Satırı sil"
                          data-satir-sil={i}
                          style={renk ? { boxShadow: `inset 4px 0 0 ${renk}` } : undefined}
                          className="grid h-11 w-full place-items-center pl-1 hover:bg-[#c8704f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#15302d]"
                          onClick={() => {
                            if (silmeHazir()) satiriSil(i);
                          }}
                        >
                          <CarpiSimgesi className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-pressed={secili}
                          aria-label={`${i + 1}. satırı seç`}
                          data-satir-sec={i}
                          // Renk anahtarı: satırın kategorisi numaranın solunda renkli şerit olarak görünür
                          style={renk ? { boxShadow: `inset 4px 0 0 ${renk}` } : undefined}
                          className={`h-11 w-full pl-1 text-[13px] font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                            secili ? '' : 'hover:bg-accent hover:text-foreground'
                          }`}
                          onClick={() => onSatirSec(secili ? null : i)}
                        >
                          {i + 1}
                        </button>
                      )}
                    </th>
                    {gorunenSutunlar.map(({ sutun, j }) => {
                      const metin = satir.hucreler[j] ?? '';
                      const hatali = hataliMi(i, j);
                      const yapiskan = j === yapiskanJ;
                      const vurgulu = vurguluSutun === sutun.id && !secili;
                      const zemin = yapiskan
                        ? `sticky left-[45px] z-[1] ${vurgulu ? VURGU_OPAK : 'bg-inherit'} ${kaydirildi ? YAPISKAN_GOLGE : ''}`
                        : `${hatali ? 'bg-destructive/10' : ''} ${vurgulu ? 'bg-accent/40' : ''}`;
                      // Sütuna sığmayan değerin tamamı üstüne gelince görünür
                      const uzun = !hatali && metin !== '' && yaziGenisligi(metin.trim(), false) + 16 > genislikler[j];
                      return (
                        <td key={sutun.id} className={`border-b border-r border-border p-0 ${zemin}`}>
                          <input
                            data-hucre={`${i}-${j}`}
                            aria-label={`${i + 1}. satır, ${sutun.ad}`}
                            aria-invalid={hatali || undefined}
                            title={
                              hatali
                                ? 'Sayı okunamadı: ondalık için virgül kullanın (ör. 3,5). Metin yazacaksanız sütunu başlıktaki menüden kategorik yapın.'
                                : uzun
                                  ? metin
                                  : undefined
                            }
                            inputMode={sutun.tur === 'sayi' ? 'decimal' : 'text'}
                            size={1}
                            readOnly={!duzenlenebilir}
                            style={yapiskan ? undefined : { scrollMarginLeft: yapiskanGenislik }}
                            className={`${HUCRE} ${sutun.tur === 'sayi' ? 'text-right tabular-nums' : ''} ${hatali ? 'text-destructive' : ''} ${
                              duzenlenebilir ? '' : 'cursor-default'
                            }`}
                            value={metin}
                            onFocus={() => onSatirSec(i)}
                            onChange={(e) => {
                              if (duzenlenebilir) onTablo(hucreYaz(tablo, i, j, e.target.value));
                            }}
                            onKeyDown={(e) => hucreKlavye(e, i, j)}
                            onPaste={(e) => hucreYapistir(e, i, j)}
                            onBlur={(e) => {
                              // Sayısal hücre Türkçe biçime getirilir: "3.5" → "3,5", "1.234,5" → "1234,5"
                              if (sutun.tur !== 'sayi' || !duzenlenebilir) return;
                              const duzgun = sayiMetniDuzelt(e.target.value);
                              if (duzgun !== e.target.value) onTablo(hucreYaz(tablo, i, j, duzgun));
                            }}
                          />
                        </td>
                      );
                    })}
                    {/* Satır silme: yalnız seçili satırda (ya da üzerine gelince / odakta) görünür; gizliyken dokunuş satırı seçer */}
                    {tamDenetim && (
                      <td
                        className="border-b border-border p-0 text-center"
                        onClick={() => {
                          if (!secili) onSatirSec(i);
                        }}
                      >
                        {duzenlenebilir && (
                          <button
                            type="button"
                            aria-label={`${i + 1}. satırı sil`}
                            title="Satırı sil"
                            data-satir-sil={i}
                            tabIndex={secili ? 0 : -1}
                            className={`grid h-11 w-11 place-items-center text-muted-foreground transition-opacity hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none ${
                              secili
                                ? 'opacity-100'
                                : 'pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (silmeHazir()) satiriSil(i);
                            }}
                          >
                            <CarpiSimgesi />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {pencereli && gorunenBitis < satirSayisi && (
                <tr>
                  <td colSpan={sutunSayisi} className="px-3 py-1 text-[13px] text-muted-foreground">
                    {satirSayisi - gorunenBitis} satır daha var.{' '}
                    <button type="button" className="h-11 px-2 font-semibold text-primary hover:underline" onClick={() => setTumunuGoster(true)}>
                      Tümünü göster
                    </button>
                  </td>
                </tr>
              )}
              {tablo.satirlar.length === 0 && (
                <tr>
                  <td colSpan={sutunSayisi} className="px-3 py-4 text-center text-[13px] leading-snug text-muted-foreground" data-bos-ileti>
                    {bosIleti ?? (saltOkunur ? SALT_OKUNUR_BOS_ILETI : VARSAYILAN_BOS_ILETI)}
                  </td>
                </tr>
              )}
              {/* Her zaman boş duran yeni satır: yazılınca gerçek satır olur (grafiğe ve sayılara girmez); kilitliyken pasif */}
              {bosSatirVar && (
                <tr data-bos-satir className="bg-background">
                  <th
                    scope="row"
                    aria-label="Yeni satır"
                    className="sticky left-0 z-[2] w-[45px] min-w-[45px] border-b border-r border-border bg-muted p-0 text-center text-[13px] font-bold text-muted-foreground"
                  >
                    <span aria-hidden="true">+</span>
                  </th>
                  {gorunenSutunlar.map(({ sutun, j }) => {
                    const yapiskan = j === yapiskanJ;
                    return (
                      <td
                        key={sutun.id}
                        className={`border-b border-r border-border p-0 ${yapiskan ? `sticky left-[45px] z-[1] bg-inherit ${kaydirildi ? YAPISKAN_GOLGE : ''}` : ''}`}
                      >
                        <input
                          data-hucre={`${satirSayisi}-${j}`}
                          aria-label={`Yeni satır, ${sutun.ad}`}
                          placeholder={j === ilkGorunen?.j ? YER_TUTUCU : undefined}
                          inputMode={sutun.tur === 'sayi' ? 'decimal' : 'text'}
                          size={1}
                          disabled={kilitli}
                          title={kilitli ? KILIT_NOTU : undefined}
                          style={yapiskan ? undefined : { scrollMarginLeft: yapiskanGenislik }}
                          className={`${HUCRE} placeholder:text-[12px] placeholder:font-normal placeholder:italic placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 ${
                            sutun.tur === 'sayi' ? 'text-right tabular-nums' : ''
                          }`}
                          value=""
                          onFocus={() => onSatirSec(null)}
                          onChange={(e) => bosSatiraYaz(j, e.target.value)}
                          onKeyDown={(e) => hucreKlavye(e, satirSayisi, j)}
                          onPaste={(e) => hucreYapistir(e, satirSayisi, j)}
                        />
                      </td>
                    );
                  })}
                  {tamDenetim && <td className="border-b border-border" aria-hidden="true" />}
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Sağda görünmeyen sütun varsa kenarda gölge (kaydırma çubuğunun üstüne binmez) */}
        {tasma.sag && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 w-4 bg-gradient-to-l from-card"
            style={{ right: tasma.sagBosluk, bottom: tasma.altBosluk }}
            data-sag-golge
          />
        )}
      </div>
      <div
        // Bantta üst çizgi gölgedir (kenarlık 1 px daha yer kaplardı; açık bant ≤ 216 px): şerit tam 44 px
        className={`flex items-center gap-2 bg-card px-2 ${
          bantModu ? 'min-h-11 flex-nowrap shadow-[inset_0_1px_0_hsl(var(--border))]' : 'flex-wrap border-t border-border py-2'
        }`}
        data-tablo-alt-serit
      >
        {saltOkunur ? (
          <p className="min-w-0 flex-1 py-1 text-[12px] leading-snug text-muted-foreground" data-salt-okunur-notu>
            {saltOkunurNotu ?? VARSAYILAN_SALT_OKUNUR_NOTU}
          </p>
        ) : (
          <>
            <button
              type="button"
              className={DUGME}
              data-sutun-ekle
              disabled={kilitli}
              title={kilitli ? KILIT_NOTU : undefined}
              onClick={sutunEkleVeAdlandir}
            >
              <span aria-hidden="true">+</span> Sütun
            </button>
            {onTemizle &&
              (temizleOnayi ? (
                <span
                  className="inline-flex flex-wrap items-center gap-1.5 rounded-[calc(var(--radius)-6px)] border border-destructive/50 bg-destructive/10 py-0.5 pl-3 pr-0.5 text-[13px] font-semibold"
                  data-temizle-onayi
                >
                  {satirSayisi} satırın hepsi silinsin mi?
                  <button
                    type="button"
                    className="h-11 rounded-md bg-destructive px-4 text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setTemizleOnayi(false);
                      onTemizle();
                    }}
                  >
                    Evet
                  </button>
                  <button
                    type="button"
                    className="h-11 rounded-md px-4 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setTemizleOnayi(false)}
                  >
                    Vazgeç
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className={DUGME}
                  data-temizle
                  disabled={tablo.satirlar.length === 0 || kilitli}
                  title={kilitli ? KILIT_NOTU : 'Tablodaki tüm satırları sil'}
                  onClick={() => setTemizleOnayi(true)}
                >
                  Temizle
                </button>
              ))}
          </>
        )}
        <span className="ml-auto flex flex-wrap items-center justify-end gap-x-1.5 text-[13px] text-muted-foreground">
          {/* Toplama sırasında satır sayısı duyurulmaz: panel her cevabı kendi aria-live bölgesinde duyurur */}
          {kilitli ? (
            <span className="inline-flex items-center gap-1.5" title={KILIT_NOTU} data-kilit-notu>
              <KilitSimgesi />
              {satirSayisi} satır · yazılıyor…
              <span className="sr-only"> {KILIT_NOTU}</span>
            </span>
          ) : (
            <span aria-live={toplamaGorunumu ? undefined : 'polite'}>{durumMetni}</span>
          )}
          {!yapistirmaBildirimi && turOnerisi && duzenlenebilir && (
            <button
              type="button"
              className="h-11 rounded-md px-2 font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onTablo(sutunTuruDegistir(tablo, turOnerisi.j, 'etiket'))}
            >
              Kategorik yap
            </button>
          )}
        </span>
        {bantModu && bantDugmesi(true)}
      </div>

      {/* Sütun menüsü (kaydırma kutusunun dışında: kırpılmaz; tablo kayınca kapanır) */}
      {menu && menuSutunu && (
        <SutunMenusu
          ref={menuRef}
          sutun={menuSutunu.sutun}
          doluSayisi={menuDolu}
          sayiOlmayanSayisi={menuSayiOlmayan}
          onay={menu.onay}
          style={{ left: menu.sol, top: menu.ust, width: menu.genislik }}
          onKeyDown={menuTusu}
          onTurDegistir={(hedef) => {
            onTablo(sutunTuruDegistir(tablo, menuSutunu.j, hedef));
            menuKapat(true);
          }}
          onAdlandir={() => {
            setMenu(null);
            bekleyenOdak.current = { secici: `[data-sutun-adi="${menuSutunu.sutun.id}"]`, secim: 'tumu' };
          }}
          onSil={() => {
            if (menuDolu > 0) setMenu((m) => (m ? { ...m, onay: true } : m));
            else sutunuSil(menuSutunu.j);
          }}
          onSilOnayla={() => sutunuSil(menuSutunu.j)}
          onVazgec={() => setMenu((m) => (m ? { ...m, onay: false } : m))}
        />
      )}
    </div>
  );
}
