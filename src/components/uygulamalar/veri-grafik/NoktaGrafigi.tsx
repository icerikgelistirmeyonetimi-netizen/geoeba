'use client';

/**
 * Nokta grafiği (TinkerPlots mantığı): her satır bir nokta, aynı değerdekiler dikeyde yığılır. Eksen
 * uygulamada hep bir değişkene atanmış gelir; başka değişken seçilince (sekme ya da sürükle-bırak) noktalar
 * 600 ms'de yeni yerlerine süzülür. Tabloda değişken yoksa noktalar dağınık durur.
 * - Kategorik değişkende her kategori bir kutudur; noktalar kutuda tek sütunda yığılır (sığmazsa küçülür).
 * - "Sütunlara dönüştür": noktalar sütundaki yerlerine kayıp söner, sütun alttan büyür. Sütun yüksekliği
 *   sıklıkla doğru orantılıdır; solda tam sayı çentikli "Sıklık" ekseni belirir. Renk anahtarı varsa noktalar
 *   anahtar sırasıyla dizilir ve sütunlar anahtar kategorilerine göre yığılır.
 * - Ortalama (mercan çizgi), ortanca (lavanta kesikli çizgi), ortalama mutlak sapma (altın bant, ayraç ve
 *   n ≤ 40 iken eksenin altında uzaklık şeridi) ve standart sapma (zeytin bant: ortalama ± s, kenar değerleri; lise
 *   ölçüsü, altın bantla birlikte de açılabilir) seçeneklidir; sayılar `gosterimOndaligi` ile, İstatistik'teki gibi
 *   `sayiMetni` biçiminde (bölük boşluğu, gerçek eksi) yazılır; yuvarlanmış ölçü "Ortalama ≈ 3,43" olur.
 * - Ölçü satırlarının yeri baştan ayrılır: düğmeye basınca noktalar küçülmez, yerinden oynamaz (TinkerPlots nesne
 *   sürekliliği). Uzaklık şeridi yalnız yığınların üstünde boş yer varsa çizilir.
 * - Eksen penceresi aynı değişkende yalnız genişler: hücre düzenlemesi, rehber eylemi ya da satır silme ekseni
 *   daraltmaz; ortalama ve ortanca çizgisi eksen değil kendi değeri değiştiği için kayar.
 * - Seçim halkası, değer balonu, odak halkası ve yeni nokta halkası yalnız ekrandadır (`data-yalniz-ekran`).
 * - Ölçüler gerçek pikseldir (viewBox = kabın ölçüsü): yazılar 13 px kalır, alçak panelde yalnız noktalar küçülür.
 * - Yan yana (`yanYana`, 5–8. sınıf örneklerinde karşılaştırma): renk anahtarının grupları aynı grafikte, ikili gruplar
 *   hâlinde: her değerde (kategorik kutuda) grupların yığınları yan yana durur ("önce birinci grup, sonra ikinci grup"
 *   değil). Ölçüler her grup için ayrı, grubun renginde çizilir; değerleri başlığın altındaki grup satırlarında yazar.
 *   Sütun modunda her grubun sıklık sütunu yan yanadır. Uzaklık şeridi bu görünümde çizilmez.
 * - Kategorinin ve grubun yanında veri sayısı yazılmaz (eksen adı, lejant, panel başlığı).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { kartGosterimi, medyan, ortalama, ortalamaMutlakSapma, sayiMetni, standartSapma, temizle, type Eksen } from './istatistik';
import {
  dagitikKonum,
  dogrusalOlcek,
  enBuyukKalanlaYuvarla,
  enYuksekYigin,
  gosterimOndaligi,
  gruplamaVar,
  payliGuzelEksen,
  pencereyiGuncelle,
  seriRengi,
  siklikEkseni,
  yiginla,
  type DogrusalOlcek,
  type EksenPenceresi,
} from './grafik';
import { gecerliDegerler, satirEtiketi, type DegerNoktasi, type VeriTablosu } from './veri';
import { GECIS, RENK } from './grafikOrtak';
import {
  BOS_KATEGORI_RENGI,
  kategoriRengi,
  kategoriler,
  kenarGerekir,
  kutuYerlesimi,
  satirRengi,
  sutunMetinleri,
  type RenkEslemesi,
} from './kategorik';
import { RenkLejanti, renkLejantiGenisligi } from './RenkLejanti';
import { NesneGrafigi } from './NesneGrafigi';
import { EksenOklari, YatayCiftOk } from './EksenOklari';
import type { NoktaSekli, OlcuKumesi } from './sinifKurallari';
import { KareIsareti } from './nesneSimgeleri';

/** Sınıfsız tabloda bütün ölçüler */
const TUM_OLCULER: OlcuKumesi = { merkezi: true, aciklik: true, oms: true, standartSapma: true };

export interface NoktaSecenekleri {
  ortalama: boolean;
  oms: boolean;
  etiketler: boolean;
  /** Ortanca çizgisi ve etiketi (yalnız sayısal değişkende) */
  ortanca?: boolean;
  /** Standart sapma bandı: ortalama ± s (lise ölçüsü; örneklem, veri sayısı − 1); yalnız açıkken yazılır */
  standartSapma?: boolean;
}

export interface NoktaGrafigiProps {
  tablo: VeriTablosu;
  /** sütun indeksi; -1 = değişken atanmamış (dağınık) */
  sutun: number;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  /** Bir değişken adı eksene bırakıldı (dataTransfer'daki sütun kimliği) */
  onDegiskenBirak: (sutunId: string) => void;
  aralik: number;
  secenekler: NoktaSecenekleri;
  sutunModu: boolean;
  genislik: number;
  yukseklik: number;
  azaltilmisHareket: boolean;
  /** Bir değişken çipi sürükleniyor: bırakma alanı vurgulanır */
  surukleniyor: boolean;
  /** Karşılaştırma görünümünde panel başlığı (varken eksen adı yinelenmez) */
  baslik?: string;
  /** Eksenin en az kapsayacağı değer aralığı (karşılaştırmada ortak eksen; toplamada beklenen değerler). Veri dışarı taşarsa eksen genişler. */
  eksenAlani?: { min: number; max: number };
  /** Kategorik değişkende kutucuk sırası (plan ya da örnek sırası); verilmezse alfabetik */
  kategoriSirasi?: string[];
  /** Veri hızla akıyor (ölçüm toplama, Anında çalıştırma): geçişler kapalı, noktalar doğrudan yerine çizilir */
  akis?: boolean;
  /** Renk anahtarı: noktalar başka bir kategorik değişkene göre renklenir (TinkerPlots "renk"), lejantla */
  renkEslemi?: RenkEslemesi | null;
  /** Panelin alt kümesi: yalnız bu satırlar çizilir (seciliSatir ve vurguSatir tablonun geneline göre indekstir) */
  satirlar?: number[];
  /**
   * Seri rengi (`SERI_RENKLERI` sırasıyla): 0 deniz, 1 mercan … (karşılaştırmanın ikinci paneli; gruplara ayırmada grubun
   * renk anahtarındaki sırası: panel rengi tablo şeridi ve lejantla aynı). Verilmezse birincil renk.
   */
  seriIndeksi?: number;
  /** Panelin tek rengi (ör. grubun renk anahtarındaki rengi); verilirse `seriIndeksi`nin önüne geçer */
  renk?: string;
  /**
   * Alt alta panellerin ortak yığın ölçeği: panellerin en yüksek yığını (`yiginYuksekligi` ile her panel için hesaplanır,
   * en büyüğü verilir). Verilirse yarıçap ve sıklık ekseni en az bu yüksekliğe göre kurulur: bütün paneller aynı
   * büyüklükte nokta çizer, 5 noktalık yığın her panelde aynı boydadır (kıyaslama yanıltmaz).
   */
  ortakYigin?: number;
  /** Yeni eklenen satır: noktasının çevresinde 700 ms'lik genişleyen mercan halka (azaltılmış harekette 1 sn durağan) */
  vurguSatir?: number | null;
  /** Veri yokken eksen çizilir ve ortasında bu ipucu yazar ("İlk atışla noktalar burada belirir.") */
  bosIpucu?: string;
  /**
   * Yan yana karşılaştırma: renk anahtarının (`renkEslemi`) her grubu her değerde kendi yığınında, yığınlar yan yana;
   * ölçüler grup grup. Anahtarı boş satırlar çizilmez.
   */
  yanYana?: boolean;
  /**
   * Sınıf düzeyinin ölçüleri (sinifKurallari.ts; verilmezse hepsi): sınıfta olmayan ölçünün satırına baştan yer
   * ayrılmaz (5. sınıfta ölçü satırı yok, noktalar o kadar büyük); yan yana görünümde grup satırları yalnız merkezi
   * eğilim ölçüsü varken ayrılır.
   */
  olcuKumesi?: OlcuKumesi;
  /**
   * Türetilmiş tabloda (iki sayısal değişken tek grafikte, ikiliGruplar.ts: ikiSeriTablosu) satır → asıl tablodaki satır:
   * seçim ve yeni satır halkası asıl tablonun satırıyla eşleşir.
   */
  satirKarsiligi?: number[];
  /** Kategorik "Sayılar"da yüzde yazılmaz (5. sınıf) */
  yuzdesiz?: boolean;
  /**
   * Sütun modunda renk anahtarının parçaları üst üste değil yan yana (5–8. sınıf örnekleri: karşılaştırmalı sütunlar
   * yığılmaz); nokta görünümü değişmez. Verilmezse parçalar yığılır (bugünkü davranış).
   */
  yanYanaParcalar?: boolean;
  /**
   * Kategorik değişkende her verinin işareti (ilkokul, sinifKurallari.ts: noktaSekli): nokta (daire), şekil (kare; şekil
   * grafiği) ya da nesne (kategorinin resmi; nesne grafiği). Sayısal değişkende ve dağınık noktalarda hep nokta.
   */
  sekil?: NoktaSekli;
  /** Nesne / şekil grafiğinin anahtarı ("Her resim 1 öğrenciyi gösterir."): üst satırda; yalnız şekil ya da nesneyle */
  sekilAnahtari?: string;
  /**
   * Sayısal yatay eksen sayı doğrusu gibi iki ucu oklu çizilir (TEGM, ortaokul ve lise, 21.10.2026); düşey eksen
   * yoktur. Verilmezse eksen düz çizgidir (ilkokul).
   */
  eksenOklari?: boolean;
}

/** Bu kadar noktadan sonra geçiş animasyonları kapanır (akıllı tahtada akıcılık) */
const COK_NOKTA = 400;

/**
 * Nokta yarıçapı basamakları: canlı toplamada her yeni satırda bütün noktalar yeniden ölçeklenip
 * kaymasın diye yarıçap yalnız bu eşiklerde değişir. Üst sınır 18: komşu yığınlar çakışmaz. 9 basamağı okunurluk
 * sınırıdır (akıllı tahtada 18 px çaplı nokta): 9,9 px sığan yerde nokta 8'e inmez.
 */
const YARICAP_BASAMAKLARI = [18, 15, 12, 10, 9, 8, 6];
/** Komşu yığınlar sıkışıkken bile noktaların inebileceği okunur yarıçap (hafif örtüşmeye izin verilir) */
const OKUNUR_YARICAP = 9;
/** İki ucu oklu eksende çizginin ölçeğin dışına taşan kısmı (ok başı için; SOL ve SAG en az 20 px) */
const EKSEN_UC_PAYI = 12;
/**
 * Yan yana görünümde (gruplar her değerde kendi sütununda) noktanın en küçük yarıçapı: sık veride (ör. 1'er birim
 * aralıklı 40 değer) noktalar okunmaz kadar küçülmez; bu sınırda komşu değerlerin sütunları birbirine değebilir.
 */
const YAN_EN_AZ_YARICAP = 4.5;
const basamakla = (r: number) => YARICAP_BASAMAKLARI.find((b) => b <= r) ?? r;

/** Yoğun yığın (yan yana sıralar ya da küçücük noktalar): tek tek etiket yerine yığın başına sayı yazılır */
const YOGUN_YARICAP = 5;
/** Yan yana düzende yarıçap bunun altına inerse (dağınık değerler) gruplar ortak eksenin üstünde ayrı satırlara geçer */
const SATIRLI_ESIK = 6;
/** Satırlı düzende her satırın üstünde grubun adına ayrılan yer */
const SATIR_ADI_PAYI = 18;
/**
 * Gruplamasız sayısal eksende noktalar yalnız bundan yüksek yığında yan yana sıralara dizilir (ör. 600 ölçüm).
 * Daha alçak yığında nokta küçülür ama tam değerinin üstünde tek sütunda kalır: 3 tane 80 puan 79 ile 81'e dağılmaz.
 */
const YAN_YANA_ESIGI = 25;
/**
 * Kategorik kutuda tek sütunlu yığının yarıçapı bundan küçük kalacaksa noktalar k'lık sıralara dizilir (k bütün
 * kutularda aynı; yükseklikler karşılaştırılabilir): 40 cevaplık kutu ince bir iplik olmaz.
 */
const KATEGORIK_BLOK_YARICAP = 8;
/** Uzaklık şeridi en çok bu kadar veride çizilir */
const SERIT_EN_COK = 40;

export { pencereyiGuncelle, type EksenPenceresi } from './grafik';

export const DEGISKEN_VERI_TURU = 'application/x-geoeba-degisken';

const SOL_TEMEL = 20;
/** Sütun modunda solda sıklık ekseni ve "Sıklık" adı için yer */
const SOL_SIKLIK = 56;
const SAG = 20;
/** 13 px kalın yazıda harf başına yaklaşık genişlik (SVG'de ölçüm yapılmaz) */
const HARF = 7.4;
/** Renkli etiket kutularının yazısı (sabit zemin üstünde; iki temada da okunur) */
const KUTU_YAZISI = '#15302d';
/** Ortanca etiketinin kutusu: lavantanın açık tonu (mürekkep yazıyla 5,6:1; lavanta çizgiyle aynı renk ailesi) */
const ORTANCA_KUTUSU = '#98a0d2';
/**
 * Ortalama mutlak sapma: bant ve ayraç altın; uzaklık şeridinde ortalamanın solu altın, sağı zeytin. İki ton da
 * açık (fildişi) ve koyu (mürekkep) kart zemininde en az 3:1 karşıtlık verir ve nokta renklerinden ayrıdır.
 */
const OMS_RENGI = RENK.altin;
const SERIT_SOL = '#b9884a';
const SERIT_SAG = '#6b8e3a';
/** Standart sapma bandı: zeytin (uzaklık şeridinin sağ tonuyla aynı aile; altın banttan ve nokta renklerinden ayrı) */
const SS_RENGI = '#6b8e3a';

/** Odak halkası yalnız klavyeyle odaklanınca görünür; yeni nokta halkası genişleyip söner */
const TEMEL_STIL =
  '.vg-odak{display:none}.vg-odaklanir:focus-visible .vg-odak{display:inline}' +
  '@keyframes vg-halka{from{transform:scale(1);opacity:1}to{transform:scale(var(--vg-halka-olcek,1.4));opacity:0}}';
const GIRIS_STILI = '@keyframes vg-nokta-gir{from{transform:translateY(-16px);opacity:0}to{transform:none;opacity:1}}';

interface NoktaKonumu {
  satir: number;
  x: number;
  y: number;
  r: number;
  deger: number | null;
  /** dağınık (değişken atanmamış) nokta */
  dagitik: boolean;
  opaklik: number;
  /** yığın sırası (etiketleri şaşırtmak için) */
  yiginIndeksi: number;
  /** kategorik değer (ayrık kutucuklar) */
  kategori?: string;
  renk?: string;
  /**
   * "Etiketler" açıkken değer yazısının yeri: 'ust' yığının en üstündeki noktada (yığındakilerin hepsi aynı
   * değerde), 'sag' gruplamada noktanın sağında (grup içindeki değerler farklı). Yoksa nokta etiket almaz.
   */
  etiket?: 'ust' | 'sag';
}

/** Sıklık sütunu parçası (renk anahtarına göre yığın); `alt` ve `sayi` sıklık birimindedir */
interface SutunParcasi {
  ad: string;
  sayi: number;
  renk: string;
  alt: number;
}

interface SiklikSutunu {
  anahtar: string;
  x: number;
  genislik: number;
  sayi: number;
  parcalar: SutunParcasi[];
  /** nokta yığınının tepesi (etiketin taban çizgisi) */
  noktaTepe: number;
  /** sütunun tepesi (etiketin taban çizgisi) */
  sutunTepe: number;
  /** kategorik "Sayılar" metni ("12 · %60" ya da dar kutuda "12") */
  metin: string;
  /** sütun modunda parçalar yan yana (`yanYanaParcalar`): her parça kendi sütunu, sayısı üstünde */
  yan?: boolean;
}

interface KategoriKutusu {
  kategori: string;
  x0: number;
  x1: number;
  merkez: number;
}

/**
 * Uçları işaret adımına oturan eksen alanı (toplamada ölçüm penceresi 60–100, sayı küpü 1–6): eksen tam o uçlarda,
 * yalnız yarım aralık payla biter. Payli güzel eksen buna bir işaret adımı daha eklerdi (55–105) ve noktalar
 * gereksizce küçülürdü. Alan geçersizse, verilen değerleri kapsamıyorsa ya da uçlar adıma oturmuyorsa null.
 */
function pencereEkseni(alan: { min: number; max: number } | undefined, degerler: number[], aralik: number, hedef: number): Eksen | null {
  if (!alan || !Number.isFinite(alan.min) || !Number.isFinite(alan.max) || !(alan.max > alan.min)) return null;
  if (degerler.some((v) => v < alan.min - 1e-9 || v > alan.max + 1e-9)) return null;
  const e = payliGuzelEksen([alan.min, alan.max], hedef);
  const oturur = (v: number) => Math.abs(temizle(v / e.adim) - Math.round(temizle(v / e.adim))) < 1e-9;
  if (!(e.adim >= aralik - 1e-9) || !oturur(alan.min) || !oturur(alan.max)) return null;
  const pay = Math.max(aralik, 1e-9) / 2;
  const sayi = Math.round(temizle((alan.max - alan.min) / e.adim));
  return {
    min: temizle(alan.min - pay),
    max: temizle(alan.max + pay),
    adim: e.adim,
    isaretler: Array.from({ length: sayi + 1 }, (_, i) => temizle(alan.min + i * e.adim)),
  };
}

/**
 * Nokta ekseni: payli güzel eksen (tam sayılı veride adım ≥ 1); uçtaki yığınlara en az yarım aralık pay.
 * `kapsam`: eksenin kapsayacağı yığın merkezleri (verinin uçları; eksen penceresi genişlemişse onun uçları).
 */
function noktaEkseni(kapsam: { min: number; max: number }, aralik: number, hedef: number, eksenAlani?: { min: number; max: number }): Eksen {
  const uclar = [kapsam.min, kapsam.max];
  const pencere = pencereEkseni(eksenAlani, uclar, aralik, hedef);
  if (pencere) return pencere;
  if (eksenAlani && Number.isFinite(eksenAlani.min) && Number.isFinite(eksenAlani.max)) uclar.push(eksenAlani.min, eksenAlani.max);
  const e = payliGuzelEksen(uclar, hedef);
  const alt = Math.min(...uclar) - aralik / 2;
  const ust = Math.max(...uclar) + aralik / 2;
  if (e.min <= alt + 1e-9 && e.max >= ust - 1e-9) return e;
  const min = temizle(Math.floor(temizle(Math.min(alt, e.min) / e.adim)) * e.adim);
  const max = temizle(Math.ceil(temizle(Math.max(ust, e.max) / e.adim)) * e.adim);
  const sayi = Math.round((max - min) / e.adim);
  return { min, max, adim: e.adim, isaretler: Array.from({ length: sayi + 1 }, (_, i) => temizle(min + i * e.adim)) };
}

/** Renk anahtarına göre sıklık parçaları (anahtar sırasıyla alttan üste, anahtarı boş satırlar en üstte gri) */
function parcalar(satirlar: number[], anahtar: RenkEslemesi | null, tekRenk: string): SutunParcasi[] {
  if (!anahtar) return [{ ad: '', sayi: satirlar.length, renk: tekRenk, alt: 0 }];
  const sayilar = new Map<string | null, number>();
  for (const s of satirlar) {
    const k = anahtar.satirKategorisi.get(s) ?? null;
    sayilar.set(k, (sayilar.get(k) ?? 0) + 1);
  }
  const sonuc: SutunParcasi[] = [];
  let alt = 0;
  for (const k of anahtar.kategoriler) {
    const sayi = sayilar.get(k) ?? 0;
    if (sayi <= 0) continue;
    sonuc.push({ ad: k, sayi, renk: anahtar.renkler.get(k) ?? BOS_KATEGORI_RENGI, alt });
    alt += sayi;
  }
  const bos = sayilar.get(null) ?? 0;
  if (bos > 0) sonuc.push({ ad: '(boş)', sayi: bos, renk: BOS_KATEGORI_RENGI, alt });
  return sonuc;
}

/** Satırları renk anahtarı sırasına göre dizer (aynı kategoride satır sırası korunur) */
function anahtarSirasi(anahtar: RenkEslemesi | null): (a: number, b: number) => number {
  if (!anahtar) return (a, b) => a - b;
  const sira = new Map(anahtar.kategoriler.map((k, i) => [k, i]));
  const yer = (s: number) => {
    const k = anahtar.satirKategorisi.get(s);
    return k === undefined ? anahtar.kategoriler.length : sira.get(k) ?? anahtar.kategoriler.length;
  };
  return (a, b) => yer(a) - yer(b) || a - b;
}

const sinirla = (v: number, alt: number, ust: number) => Math.min(Math.max(v, alt), Math.max(alt, ust));

/** Ölçü etiketi: "Ortalama = 17"; yuvarlanmışsa "Ortalama ≈ 3,43" (İstatistik kartlarıyla aynı gösterim) */
function olcuMetni(ad: string, deger: number, ondalik: number): string {
  const g = kartGosterimi(deger, ondalik);
  return `${ad} ${g.yaklasik ? '≈' : '='} ${sayiMetni(g.deger, g.ondalik)}`;
}

/** Yuvarlanmışsa başında "≈ " olan sayı ("Solda toplam ≈ 9,14") */
function yaklasikMetin(deger: number, ondalik: number): string {
  const g = kartGosterimi(deger, ondalik);
  return `${g.yaklasik ? '≈ ' : ''}${sayiMetni(g.deger, g.ondalik)}`;
}

/**
 * Kategorik kutuda sıralı yığın: tek sütunda nokta `KATEGORIK_BLOK_YARICAP`tan küçük kalacaksa, noktaların en az o
 * büyüklükte kaldığı en dar sıra genişliği k (2, 3 …). Bulunamazsa null (çağıran eski yerleşimi kullanır).
 */
function kategorikBlok(enCok: number, kutuG: number, dikeyAlan: number): { k: number; r: number; adim: number } | null {
  for (let k = 2; k <= 40 && k < enCok; k++) {
    const rG = (kutuG * 0.9) / k / 2 - 0.5;
    if (rG < KATEGORIK_BLOK_YARICAP) break;
    const rD = dikeyAlan / Math.ceil(enCok / k) / 2 - 0.5;
    const r = basamakla(Math.min(18, rG, rD));
    if (r >= KATEGORIK_BLOK_YARICAP) return { k, r, adim: 2 * r + 1 };
  }
  return null;
}

/** Etiketlerin 1, 2, 5 × 10ⁿ adımları (küçükten büyüğe), `alt`tan başlayarak */
function guzelAdimlar(alt: number): number[] {
  const us = Math.floor(Math.log10(alt) + 1e-9);
  const sonuc: number[] = [];
  for (let u = us; u <= us + 3; u++) for (const g of [1, 2, 5]) sonuc.push(temizle(g * 10 ** u));
  return sonuc.filter((a) => a >= alt - 1e-9);
}

/**
 * Sayısal eksenin çizilecek işaretleri ve hangilerinin yazılacağı (en çok `sigan` etiket). Hepsi sığıyorsa aynen.
 * Sığmıyorsa her k'ıncı işaret yazılmaz (64, 68 gibi garip değerler çıkar):
 * - `seyreltilebilir` (gruplamasız eksen): işaretler güzel bir adıma seyreltilir ve hepsi yazılır: 2'lik 60–100 → 60, 65 … 100;
 * - gruplu eksende (işaretler grup kenarıdır, yerinde kalır) yalnız güzel adımın katı olanlar yazılır: 60, 70, 80.
 * Böyle en az iki etiket bulunmazsa eski kural (her k'ıncı).
 */
export function eksenIsaretleri(
  isaretler: readonly number[],
  sigan: number,
  seyreltilebilir: boolean,
): { isaretler: number[]; etiketli: (i: number) => boolean } {
  const liste = [...isaretler];
  const enCok = Math.max(2, sigan);
  const k = Math.max(1, Math.ceil(liste.length / enCok));
  if (k === 1 || liste.length < 2) return { isaretler: liste, etiketli: () => true };
  const adim = Math.abs(liste[1] - liste[0]);
  if (adim > 0) {
    const bas = Math.min(liste[0], liste[liste.length - 1]);
    const son = Math.max(liste[0], liste[liste.length - 1]);
    for (const etiketAdimi of guzelAdimlar(adim * k)) {
      if (seyreltilebilir) {
        const ilk = Math.ceil(temizle(bas / etiketAdimi) - 1e-9);
        const sonNo = Math.floor(temizle(son / etiketAdimi) + 1e-9);
        const sayi = sonNo - ilk + 1;
        if (sayi >= 2 && sayi <= enCok) {
          return { isaretler: Array.from({ length: sayi }, (_, i) => temizle((ilk + i) * etiketAdimi)), etiketli: () => true };
        }
      } else {
        const secili = liste.map((v) => Math.abs(temizle(v / etiketAdimi) - Math.round(temizle(v / etiketAdimi))) < 1e-6);
        const n = secili.filter(Boolean).length;
        if (n >= 2 && n <= enCok) return { isaretler: liste, etiketli: (i) => secili[i] === true };
      }
    }
  }
  return { isaretler: liste, etiketli: (i) => i % k === 0 };
}

/**
 * Bir panelin en yüksek yığını (nokta sayısı): sayısal değişkende aynı değerdeki (gruplamada aynı gruptaki) noktalar,
 * kategorik değişkende en kalabalık kategori. Alt alta panellerde en büyüğü `ortakYigin` olarak verilir.
 */
export function yiginYuksekligi(tablo: VeriTablosu, sutun: number, aralik: number, satirlar?: readonly number[]): number {
  const s = tablo.sutunlar[sutun];
  if (!s) return 0;
  const kume = satirlar ? new Set(satirlar) : null;
  const icinde = (i: number) => kume === null || kume.has(i);
  if (s.tur === 'etiket') {
    const sayilar = new Map<string, number>();
    for (const m of sutunMetinleri(tablo, sutun)) if (icinde(m.satir)) sayilar.set(m.deger, (sayilar.get(m.deger) ?? 0) + 1);
    return Math.max(0, ...sayilar.values());
  }
  const noktalar = gecerliDegerler(tablo, sutun).filter((n) => icinde(n.satir));
  if (noktalar.length === 0) return 0;
  const gruplu = gruplamaVar(noktalar.map((n) => n.deger), aralik);
  return enYuksekYigin(yiginla(noktalar, aralik, gruplu));
}

export function NoktaGrafigi({
  tablo,
  sutun,
  seciliSatir,
  onSatirSec,
  onDegiskenBirak,
  aralik,
  secenekler,
  sutunModu,
  genislik,
  yukseklik,
  azaltilmisHareket,
  surukleniyor,
  baslik,
  eksenAlani,
  kategoriSirasi,
  akis = false,
  renkEslemi = null,
  satirlar,
  seriIndeksi,
  renk,
  ortakYigin,
  vurguSatir = null,
  bosIpucu,
  yanYana = false,
  olcuKumesi = TUM_OLCULER,
  satirKarsiligi,
  yuzdesiz = false,
  yanYanaParcalar = false,
  sekil = 'nokta',
  sekilAnahtari,
  eksenOklari = false,
}: NoktaGrafigiProps) {
  /** Türetilmiş satırın asıl tablodaki satırı (karşılık yoksa kendisi) */
  const asil = (s: number) => (satirKarsiligi ? satirKarsiligi[s] ?? s : s);
  const svgRef = useRef<SVGSVGElement>(null);
  const [ustunde, setUstunde] = useState<number | null>(null);
  const [birakmaUzerinde, setBirakmaUzerinde] = useState(false);
  /** Klavye gezinmesinin durduğu satır (tek Tab durağı) */
  const [odak, setOdak] = useState<number | null>(null);
  /** Yeni nokta halkası: satır ve yeniden başlatma sayacı */
  const [halka, setHalka] = useState<{ satir: number; no: number } | null>(() => (vurguSatir !== null && vurguSatir !== undefined ? { satir: vurguSatir, no: 0 } : null));

  useEffect(() => {
    if (vurguSatir === null || vurguSatir === undefined) return;
    setHalka((h) => ({ satir: vurguSatir, no: (h?.no ?? 0) + 1 }));
    const t = window.setTimeout(() => setHalka((h) => (h && h.satir === vurguSatir ? null : h)), azaltilmisHareket ? 1000 : 760);
    return () => window.clearTimeout(t);
  }, [vurguSatir, azaltilmisHareket]);

  // Gerçek piksel: viewBox kabın ölçüsüdür (küçültme yok)
  const W = Math.max(0, genislik);
  const H = Math.max(0, yukseklik);
  const atanmis = sutun >= 0 && sutun < tablo.sutunlar.length;
  const kategorik = atanmis && tablo.sutunlar[sutun].tur === 'etiket';
  const sayisal = atanmis && !kategorik;
  /** Veri işareti: şekil ve nesne yalnız kategorik değişkende (sayısal eksende hep nokta) */
  const isaret: NoktaSekli = kategorik ? sekil : 'nokta';
  /** Şekil / nesne grafiğinin anahtar yazısı (üst satır) */
  const anahtarYazisi = isaret === 'sekil' ? 'Her bir veri bir şekle karşılık gelmektedir.' : isaret === 'nesne' ? sekilAnahtari ?? 'Her bir resim bir veriyi gösterir.' : null;
  const sutunAdi = atanmis ? tablo.sutunlar[sutun].ad : '';
  /** Renk anahtarı bu grafiğin değişkeninden farklıysa noktalar onun renklerini alır ve lejant çizilir */
  const anahtar = renkEslemi && atanmis && renkEslemi.sutun !== sutun && renkEslemi.sutun >= 0 && renkEslemi.sutun < tablo.sutunlar.length ? renkEslemi : null;
  const tekRenk = renk ?? (seriIndeksi !== undefined ? seriRengi(seriIndeksi) : RENK.birincil);
  const satirAnahtari = satirlar ? satirlar.join(',') : null;
  const sutunlu = sutunModu && atanmis;
  /** Panelin tek rengi verildi (karşılaştırma ya da grup paneli): kategorik noktalar da kategori paleti yerine bu rengi alır */
  const panelRenkli = renk !== undefined || seriIndeksi !== undefined;
  /** Yan yana görünümün grupları (renk anahtarı); yoksa tek yığın */
  const yanAnahtar = yanYana && anahtar ? anahtar : null;
  /**
   * Eksen penceresi (değer uzayında yığın merkezleri; gruplamada grup başları): aynı değişken ve aynı grup genişliğinde
   * yalnız genişler. Değişken, grup genişliği ya da tablo (örnek yeniden yüklenince sütun kimliği) değişince, veri
   * boşalınca ya da veri pencerenin üçte birinden dar bir alana inince (yanlış yazılan 600 düzeltildi) sıfırlanır.
   * Sekme değişince bileşen yeniden kurulduğu için pencere de yeniden sığdırılır.
   */
  const pencereRef = useRef<EksenPenceresi | null>(null);

  const c = useMemo(() => {
    const altKume = satirAnahtari !== null ? new Set((satirlar ?? []).filter((s) => s >= 0 && s < tablo.satirlar.length)) : null;
    const icinde = (s: number) => (altKume === null || altKume.has(s)) && (!yanAnahtar || yanAnahtar.satirKategorisi.has(s));
    /** Yan yana görünümde satırın grubu (anahtar sırası) */
    const K = yanAnahtar ? Math.max(1, yanAnahtar.kategoriler.length) : 1;
    const grupNo = (s: number) => (yanAnahtar ? Math.max(0, yanAnahtar.kategoriler.indexOf(yanAnahtar.satirKategorisi.get(s) ?? '')) : 0);
    /** Bir yığının (ya da kutunun) satırlarını gruplara ayırır: her grubun kendi sırası */
    const grupla = (liste: number[]) => {
      const g: number[][] = Array.from({ length: K }, () => []);
      for (const s of liste) g[grupNo(s)].push(s);
      return g;
    };
    const satirSayisi = altKume ? altKume.size : tablo.satirlar.length;
    /** Sütun modunda renk anahtarının parçaları yan yana (yan yana görünümde gruplar zaten ayrı sütun) */
    const parcaYan = yanYanaParcalar && anahtar !== null && !yanAnahtar;
    const SOL = sutunlu ? SOL_SIKLIK : SOL_TEMEL;
    const alanG = Math.max(0, W - SOL - SAG);
    const siralama = anahtarSirasi(anahtar);

    // ── Veri ────────────────────────────────────────────────────────────────
    const noktalar: DegerNoktasi[] = sayisal ? gecerliDegerler(tablo, sutun).filter((n) => icinde(n.satir)) : [];
    const degerler = noktalar.map((n) => n.deger);
    const ondalik = gosterimOndaligi(degerler);
    const ort = ortalama(degerler);
    const oms = ortalamaMutlakSapma(degerler);
    const ss = standartSapma(degerler);
    const ortancaDeger = medyan(degerler);
    const gruplu = degerler.length > 0 && gruplamaVar(degerler, aralik);
    const yiginlar = yiginla(noktalar, aralik, gruplu);
    if (anahtar) {
      for (const y of yiginlar) {
        y.ogeler.sort((a, b) => siralama(a.satir, b.satir));
        y.ogeler.forEach((o, i) => (o.sira = i));
      }
    }
    const ortakYukseklik = ortakYigin !== undefined && Number.isFinite(ortakYigin) ? Math.max(0, Math.floor(ortakYigin)) : 0;
    // Yan yana: en yüksek yığın bir grubun yığınıdır (grupların toplamı değil)
    const yigindakiEnCok = (liste: number[]) => (yanAnahtar ? Math.max(0, ...grupla(liste).map((g) => g.length)) : liste.length);
    const enYuksek = Math.max(
      yanAnahtar ? Math.max(0, ...yiginlar.map((yg) => yigindakiEnCok(yg.ogeler.map((o) => o.satir)))) : enYuksekYigin(yiginlar),
      yiginlar.length > 0 ? ortakYukseklik : 0,
    );

    const metinler = kategorik ? sutunMetinleri(tablo, sutun).filter((m) => icinde(m.satir)) : [];
    const kats = kategorik ? kategoriler(metinler.map((m) => m.deger), kategoriSirasi) : [];
    const katSatirlari = new Map<string, number[]>(kats.map((k) => [k, []]));
    for (const m of metinler) katSatirlari.get(m.deger)?.push(m.satir);
    for (const liste of katSatirlari.values()) liste.sort(siralama);
    const enCokKat = Math.max(0, ...[...katSatirlari.values()].map((l) => yigindakiEnCok(l)), metinler.length > 0 ? ortakYukseklik : 0);

    const dolu = sayisal ? noktalar.length : metinler.length;
    const veriSayisi = dolu;
    const eksik = atanmis ? Math.max(0, satirSayisi - dolu) : 0;

    // ── Yatay eksen ─────────────────────────────────────────────────────────
    const hedefIsaret = Math.max(3, Math.floor(alanG / 70));
    const alanGecerli = !!eksenAlani && Number.isFinite(eksenAlani.min) && Number.isFinite(eksenAlani.max);
    // Eksen penceresi: verinin (ve eksenAlani'nin) uçları, aynı değişkende önceki pencereyle birleşir (yalnız genişler)
    let kapsam: { min: number; max: number } | null = null;
    if (yiginlar.length > 0) {
      const ilkY = yiginlar[0];
      const sonY = yiginlar[yiginlar.length - 1];
      let min = gruplu ? ilkY.baslangic : ilkY.merkez;
      let max = gruplu ? sonY.baslangic : sonY.merkez;
      if (alanGecerli) {
        min = Math.min(min, eksenAlani!.min);
        max = Math.max(max, eksenAlani!.max);
      }
      const pencere = pencereyiGuncelle(pencereRef.current, `${tablo.sutunlar[sutun]?.id ?? sutun}|${aralik}|${gruplu ? 'g' : 't'}`, min, max);
      kapsam = { min: pencere.min, max: pencere.max };
      pencereRef.current = pencere;
    } else if (sayisal) {
      pencereRef.current = null;
    }
    let eksen: Eksen | null = null;
    if (kapsam && gruplu) {
      // Eksen işaretleri grup kenarlarında: 13 değeri 12–14 grubunda görünür, 14'ün üstünde değil
      const kenar = (v: number) => Math.floor(temizle(v / aralik) + 1e-9);
      const ilk = kenar(kapsam.min);
      const son = kenar(kapsam.max) + 1;
      const isaretler = Array.from({ length: son - ilk + 1 }, (_, i) => temizle((ilk + i) * aralik));
      eksen = { min: isaretler[0], max: isaretler[isaretler.length - 1], adim: aralik, isaretler };
    } else if (kapsam) {
      eksen = noktaEkseni(kapsam, aralik, hedefIsaret, eksenAlani);
    } else if (sayisal && (bosIpucu || eksenAlani)) {
      eksen = pencereEkseni(eksenAlani, [], aralik, hedefIsaret) ?? payliGuzelEksen(eksenAlani ? [eksenAlani.min, eksenAlani.max] : [0, 10], hedefIsaret);
    }
    /** Bütün değerler ≥ 0 ise (sayım, süre, boy) eksen 0'ın solunda boş bir kuşak bırakmaz: en çok yarım aralık pay */
    const negatifYok = degerler.every((d) => d >= 0) && !(eksenAlani && eksenAlani.min < 0) && !(kapsam && kapsam.min < 0);
    if (eksen && negatifYok && eksen.min < 0) {
      const alt = Math.max(eksen.min, -Math.max(aralik, 1e-9) / 2);
      if (alt < eksen.max) eksen = { ...eksen, min: alt, isaretler: eksen.isaretler.filter((v) => v >= alt - 1e-9) };
    }
    const olcek: DogrusalOlcek | null = eksen ? dogrusalOlcek(eksen.min, eksen.max, SOL, W - SAG) : null;
    const aralikPx = olcek ? Math.abs(olcek.ileri(aralik) - olcek.ileri(0)) : 0;
    let enKucukUzaklik = Infinity;
    if (olcek) for (let i = 1; i < yiginlar.length; i++) enKucukUzaklik = Math.min(enKucukUzaklik, olcek.ileri(yiginlar[i].merkez) - olcek.ileri(yiginlar[i - 1].merkez));

    const tekOlcu = !yanAnahtar;
    const ortGoster = tekOlcu && sayisal && secenekler.ortalama && ort !== null && olcek !== null;
    const omsGoster = tekOlcu && sayisal && secenekler.oms && ort !== null && oms !== null && olcek !== null;
    const ssGoster = tekOlcu && sayisal && secenekler.standartSapma === true && ort !== null && ss !== null && olcek !== null;
    const ortancaGoster = tekOlcu && sayisal && !!secenekler.ortanca && ortancaDeger !== null && olcek !== null;
    /** Ölçü düğmeleri kapalıyken de açılabilir mi: satırlarının yeri baştan ayrılır (açılınca noktalar küçülmez, kaymaz) */
    const ortMumkun = tekOlcu && olcuKumesi.merkezi && sayisal && ort !== null && olcek !== null;
    const omsMumkun = tekOlcu && olcuKumesi.oms && sayisal && ort !== null && olcek !== null && oms !== null;
    const ssMumkun = tekOlcu && olcuKumesi.standartSapma && sayisal && ort !== null && olcek !== null && ss !== null;
    const ortancaMumkun = tekOlcu && olcuKumesi.merkezi && sayisal && ortancaDeger !== null && olcek !== null;
    const mx = ort !== null && olcek ? olcek.ileri(ort) : 0;
    /** Yan yana görünümde her grubun ölçüleri (grubun rengiyle; değerler başlığın altındaki grup satırında) */
    const grupOlculeri =
      yanAnahtar && sayisal
        ? yanAnahtar.kategoriler.map((k, gi) => {
            const d = noktalar.filter((n) => grupNo(n.satir) === gi).map((n) => n.deger);
            return { ad: k, renk: yanAnahtar.renkler.get(k) ?? BOS_KATEGORI_RENGI, ort: ortalama(d), oms: ortalamaMutlakSapma(d), ss: standartSapma(d), ortanca: medyan(d) };
          })
        : [];
    /** Grup satırlarının yeri (ölçü düğmeleri kapalıyken de ayrılır: açılınca noktalar küçülmez) */
    const grupSatirPayi = yanAnahtar && sayisal && olcuKumesi.merkezi ? grupOlculeri.length * 20 : 0;

    // ── Üst satırlar: başlık / lejant, ölçü etiketleri, ortalama mutlak sapma ayracı ─────────
    const baslikSatiri = !!baslik || !!anahtar || !!anahtarYazisi;
    const baslikSonu = anahtar
      ? Math.min(W - SAG, (baslik ? SOL + baslik.length * HARF + 24 : SOL) + renkLejantiGenisligi(anahtar))
      : SOL + (baslik ? baslik.length * HARF : 0);
    const ortMetni = ort !== null ? olcuMetni('Aritmetik ortalama', ort, ondalik) : '';
    const ortG = ortMetni.length * HARF + 18;
    const ortX = ortMumkun ? sinirla(mx - ortG / 2, 4, W - 4 - ortG) : 0;
    const omsMetni = oms !== null ? olcuMetni('Ort. mutlak sapma', oms, ondalik) : '';
    const omsG = omsMetni.length * HARF;
    const sagKenar = omsMumkun && olcek ? olcek.ileri((ort as number) + (oms as number)) : 0;
    const solKenar = omsMumkun && olcek ? olcek.ileri((ort as number) - (oms as number)) : 0;
    /** Standart sapma etiketi (renk kutucuğu + yazı) ve bandın kenarları (ortalama ± s) */
    const ssMetni = ss !== null ? olcuMetni('Standart sapma', ss, ondalik) : '';
    const ssG = ssMetni.length * HARF + 16;
    const ssSag = ssMumkun && olcek ? olcek.ileri((ort as number) + (ss as number)) : 0;
    const ssSol = ssMumkun && olcek ? olcek.ileri((ort as number) - (ss as number)) : 0;
    /** Üst satırların yerleşimi: hangi ölçüler açıksa (ya da yer ayırmak için "açık olsaydı") */
    const ustDuzeni = (ortAcik: boolean, omsAcik: boolean, ssAcik: boolean) => {
      // Ayracın etiketi ölçü satırında: ortalama kutusunun sağında, sığmazsa solunda, o da olmazsa kendi satırında
      let omsX: number | null = null;
      if (omsAcik) {
        if (!ortAcik) omsX = sinirla(mx - omsG / 2, SOL, W - SAG - omsG);
        else if (ortX + ortG + 10 + omsG <= W - SAG) omsX = ortX + ortG + 10;
        else if (ortX - 10 - omsG >= SOL) omsX = ortX - 10 - omsG;
      }
      // Standart sapma etiketi: satırdaki en sağdaki etiketin sağına, sığmazsa en soldakinin soluna, o da olmazsa
      // kendi satırına (aşağıda); ölçü satırı boşsa bandın ortasına
      let ssX: number | null = null;
      if (ssAcik) {
        const sagUc = Math.max(ortAcik ? ortX + ortG : -Infinity, omsAcik && omsX !== null ? omsX + omsG : -Infinity);
        const solUc = Math.min(ortAcik ? ortX : Infinity, omsAcik && omsX !== null ? omsX : Infinity);
        if (sagUc === -Infinity) ssX = sinirla(mx - ssG / 2, SOL, W - SAG - ssG);
        else if (sagUc + 10 + ssG <= W - SAG) ssX = sagUc + 10;
        else if (solUc - 10 - ssG >= SOL) ssX = solUc - 10 - ssG;
      }
      const olcuSatiri = ortAcik || (omsAcik && omsX !== null) || (ssAcik && ssX !== null);
      const olcuBasi = Math.min(ortAcik ? ortX : Infinity, omsX ?? Infinity, ssX ?? Infinity);
      const birlesik = baslikSatiri && olcuSatiri && olcuBasi > baslikSonu + 12;
      let ustY = 6;
      if (baslikSatiri) ustY += 22;
      const grupSatirY = ustY;
      ustY += grupSatirPayi;
      let olcuY = 0;
      if (olcuSatiri) {
        if (birlesik) olcuY = 6;
        else {
          olcuY = ustY;
          ustY += 26;
        }
      }
      let omsEtiketY: number | null = null;
      if (omsAcik && omsX === null) {
        omsX = sinirla(mx - omsG / 2, SOL, W - SAG - omsG);
        omsEtiketY = ustY + 13;
        ustY += 18;
      }
      let ssEtiketY: number | null = null;
      if (ssAcik && ssX === null) {
        ssX = sinirla(mx - ssG / 2, SOL, W - SAG - ssG);
        ssEtiketY = ustY + 13;
        ustY += 18;
      }
      const ayracY = omsAcik ? ustY + 10 : 0;
      if (omsAcik) ustY += 20;
      return { omsX, olcuY, omsEtiketY, ssX, ssEtiketY, ayracY, grupSatirY, UST: ustY + 8 };
    };
    const { omsX, olcuY, omsEtiketY, ssX, ssEtiketY, ayracY, grupSatirY, UST } = ustDuzeni(ortGoster, omsGoster, ssGoster);
    const baslikY = 20;

    // ── Alt satırlar: işaretler, eksen adı (+ ortanca), ortanca, uzaklık şeridi ─────────────
    const grupNotu = gruplu ? `grup genişliği ${sayiMetni(aralik, gosterimOndaligi([aralik]))}` : '';
    // Eksen adının yanında veri sayısı yazılmaz (uzman incelemesi, 4. tur); panel başlığı varken sayısal eksende yalnız grup notu
    const adMetni = kategorik ? sutunAdi : baslik ? grupNotu : `${sutunAdi}${grupNotu ? `  (${grupNotu})` : ''}`;
    const eksikMetni = eksik > 0 && dolu > 0 ? `${eksik} satırda değer yok` : '';
    const ortancaMetni = ortancaDeger !== null ? olcuMetni('Ortanca', ortancaDeger, ondalik) : '';
    const ortancaG = ortancaMetni.length * HARF + 18;
    const ortancaX = ortancaMumkun && olcek && ortancaDeger !== null ? sinirla(olcek.ileri(ortancaDeger) - ortancaG / 2, 4, W - 4 - ortancaG) : 0;
    const adBasi = W - SAG - adMetni.length * HARF;
    const eksikSonu = SOL + eksikMetni.length * HARF;
    /** Ortanca etiketi eksen adı satırına sığıyor mu (eksen adıyla ve eksik satır notuyla çakışmadan) */
    const ortancaSigar = (!adMetni || ortancaX + ortancaG + 10 < adBasi) && (!eksikMetni || ortancaX > eksikSonu + 10);
    const adY = 24;
    const altDuzeni = (ortancaAcik: boolean) => {
      const adSatirinda = ortancaAcik && ortancaSigar;
      let altY = 24;
      if (adMetni || eksikMetni || adSatirinda) altY += adSatirinda ? 26 : 20;
      let ortancaY = adY;
      if (ortancaAcik && !adSatirinda) {
        ortancaY = altY;
        altY += 26;
      }
      return { altY, ortancaY };
    };
    const { ortancaY } = altDuzeni(ortancaGoster);

    // ── Sayısal: yarıçap (ölçü düğmelerinden bağımsız), uzaklık şeridi, yerler ─────────────────────
    const konumlar: NoktaKonumu[] = [];
    const sutunlar: SiklikSutunu[] = [];
    let yogun = false;
    /** Gruplamada değerler noktaların sağına sığmıyorsa "Etiketler" yığın başına sayı yazar */
    let yiginSayisi = false;
    /** Komşu yığınların üst etiketleri çakışacaksa etiketler iki sıraya şaşırtılır */
    let etiketKaydir = false;
    let siklik: Eksen | null = null;
    let birimSutun = 0;
    const yiginTepeleri: { x: number; y: number; adet: number }[] = [];
    /** Satırlı yan yana düzende her grubun yatay bandı (yoksa null) */
    let grupBantlari: { ad: string; renk: string; ust: number; alt: number }[] | null = null;
    const sayisalYigin = sayisal && olcek !== null && yiginlar.length > 0;
    // Komşu yığınlar çakışmaz: yarıçap en yakın iki yığının arasının yarısını aşmaz; tek yığında yalnız dikey alan sınırlar.
    // Geniş eksende (ör. toplama sırasında sabit tutulan 60–120 ölçüm penceresi, 1 birim ≈ 15 px) bu kural noktaları
    // okunmaz kılar: o durumda yarıçap OKUNUR_YARICAP'a kadar büyür, komşu yığınlar en çok aralığın ~%24'ü kadar örtüşür.
    // Yan yana görünümde bu örtüşme payı yoktur: bir değerdeki grup yığınları komşu değerin yığınlarına binmez (dar
    // pencerede 75'in 7-B noktası 80'in 7-A noktasının üstüne düşmesin; ikili gruplar karışmasın).
    // Yan yana (TEGM, 21.10.2026: "sütun grafiği gibi"): bir değerde yalnız verisi olan grupların sütunları yan yana durur
    // ve ortaları değerin tam üstündedir (boş grubun yuvası ayrılmaz; tek grubun sütunu değerin üstündedir). Komşu iki
    // değerin sütunları birbirine binmez: yarıçap, iki değerdeki sütun sayılarının toplamına bölünen aradan bulunur.
    const yanDoluluk = yanAnahtar ? yiginlar.map((y) => grupla(y.ogeler.map((o) => o.satir)).filter((g) => g.length > 0).length) : [];
    let yanRYatay = Infinity;
    if (yanAnahtar && olcek) {
      for (let i = 1; i < yiginlar.length; i++) {
        const ara = olcek.ileri(yiginlar[i].merkez) - olcek.ileri(yiginlar[i - 1].merkez);
        // Komşu değerlerin sütunları birbirine binmez (uzman 7. tur: ikili gruplar karışmasın)
        yanRYatay = Math.min(yanRYatay, (ara - 2) / Math.max(1, yanDoluluk[i] + yanDoluluk[i - 1]) - 0.5);
      }
      if (yiginlar.length === 1) yanRYatay = alanG / 2 / Math.max(1, yanDoluluk[0]) - 0.5;
    }
    const yanUzaklik = enKucukUzaklik / K;
    const rYatay = yanAnahtar
      ? Math.max(YAN_EN_AZ_YARICAP, Number.isFinite(yanRYatay) ? yanRYatay : alanG / 2 / K)
      : yiginlar.length > 1
        ? Math.max(yanUzaklik / 2 - 0.5, Math.min(OKUNUR_YARICAP, yanUzaklik * 0.62))
        : alanG / 2 / K;
    /** Verilen dikey alanda sayısal yığınların yarıçapı, adımı ve sıra genişliği */
    const yaricapBul = (dikeyAlan: number): { r: number; adim: number; yiginSutunu: number } => {
      if (!sayisalYigin) return { r: 8, adim: 17, yiginSutunu: 1 };
      const rDikey = enYuksek > 0 ? dikeyAlan / enYuksek / 2 - 0.5 : 18;
      let r = Math.min(18, rYatay, rDikey);
      let adim = 2 * r + 1;
      let yiginSutunu = 1;
      if (r < YOGUN_YARICAP && !yanAnahtar && (gruplu || enYuksek > YAN_YANA_ESIGI)) {
        // Çok yüksek yığın (ör. 1000 ölçüm) ya da grup: noktalar yığın genişliğinde yan yana sıralara dizilir (TinkerPlots
        // gibi). Gruplamasız alçak yığında dizilmez: yandaki nokta başka bir değerde duruyormuş gibi okunur.
        const yer = kutuYerlesimi(enYuksek, Math.min(2 * Math.max(rYatay, aralikPx / 2), alanG) * 0.94, dikeyAlan, 6, 1.5);
        if (yer.sigdi && yer.sutunSayisi > 1 && yer.r > r) {
          r = yer.r;
          adim = yer.birim;
          yiginSutunu = yer.sutunSayisi;
        }
      }
      if (yiginSutunu === 1) {
        r = basamakla(Math.max(0.8, r));
        adim = 2 * r + (r >= 4 ? 1 : 0.4);
        if (enYuksek * adim > dikeyAlan && enYuksek > 0) {
          adim = dikeyAlan / enYuksek;
          r = Math.max(0.8, Math.min(r, adim / 2 - 0.2));
        }
      }
      return { r, adim, yiginSutunu };
    };
    /**
     * Ölçü satırlarının yeri baştan ayrılır (Ortalama, Ortalama mutlak sapma, Ortanca düğmesine basınca noktalar
     * küçülmez, eksen kaymaz). Alçak panelde bu pay noktaları okunmaz kılacaksa (ölçüsüz yarıçapın ya da 8 px'in
     * altına iterse) önce ortanca satırının, sonra üst satırların payından vazgeçilir.
     */
    const dikeyIcin = (ust: number, alt: number) => Math.max(0, Math.max(ust + 1, H - (alt + 4)) - ust - 16);
    const ustSade = ustDuzeni(false, false, false).UST;
    const altSade = altDuzeni(false).altY;
    const ustTam = ustDuzeni(ortMumkun, omsMumkun, ssMumkun).UST;
    const hedefR = Math.min(yaricapBul(dikeyIcin(ustSade, altSade)).r, 8);
    const paylar = [
      { ust: ustTam, alt: altDuzeni(ortancaMumkun).altY },
      { ust: ustTam, alt: altSade },
      { ust: ustSade, alt: altSade },
    ];
    const pay = paylar.find((p) => yaricapBul(dikeyIcin(Math.max(UST, p.ust), Math.max(altDuzeni(ortancaGoster).altY, p.alt))).r >= hedefR - 1e-9) ?? paylar[2];
    const USTr = Math.max(UST, pay.ust);
    const altY = Math.max(altDuzeni(ortancaGoster).altY, pay.alt);
    const tabanTemel = Math.max(USTr + 1, H - (altY + 4));
    /** Yarıçapın hesaplandığı dikey alan */
    const dikeyAlanR = Math.max(0, tabanTemel - USTr - 16);
    const yer = yaricapBul(dikeyAlanR);
    let r = yer.r;
    const adim = yer.adim;
    const yiginSutunu = yer.yiginSutunu;
    // Uzaklık şeridi yalnız yığınların üstündeki boş yere sığıyorsa çizilir (noktalar onun için küçülmez); çizilince
    // eksen ve noktalar birlikte yukarı kayar
    const seritAday = tekOlcu && omsGoster && !sutunModu && noktalar.length > 0 && noktalar.length <= SERIT_EN_COK;
    let seritYuksekligi = 0;
    if (seritAday && sayisalYigin) {
      const yiginPx = Math.ceil(enYuksek / yiginSutunu) * adim + 4;
      const bosluk = dikeyAlanR - yiginPx;
      const enAz = 22 + Math.max(12, noktalar.length * 2);
      if (bosluk >= enAz) seritYuksekligi = Math.floor(Math.min(22 + Math.min(42, noktalar.length * 7), bosluk));
    }
    const serit = seritYuksekligi > 0;
    const seritCubukAlani = serit ? seritYuksekligi - 22 : 0;
    const seritUst = altY + 4;
    const taban = Math.max(USTr + 1, tabanTemel - seritYuksekligi);
    const alanY = Math.max(0, taban - UST);
    const hedefY = Math.max(3, Math.floor(alanY / 44));

    if (sayisalYigin && olcek) {
      yogun = yiginSutunu > 1 || r < YOGUN_YARICAP;
      // Değer etiketleri: gruplamasız yığında değerler aynıdır, yalnız en üstteki nokta yazar; gruplamada her
      // nokta kendi değerini sağına yazar (sığmıyorsa yığın başına sayı)
      const etiketG = noktalar.reduce((m, n) => Math.max(m, sayiMetni(n.deger, ondalik).length), 0) * HARF;
      etiketKaydir = etiketG + 6 > enKucukUzaklik;
      const sagaSigar = !yanAnahtar && gruplu && !yogun && adim >= 14 && aralikPx / 2 - r - 4 >= etiketG;
      yiginSayisi = yogun || (gruplu && !sagaSigar);
      siklik = siklikEkseni(enYuksek, hedefY);
      birimSutun = Math.max(0, alanY - 18) / siklik.max;
      const sutunG = Math.max(3, Math.min(Math.max(aralikPx, Math.min(enKucukUzaklik, alanG)) * 0.82, 64));
      // Satırlı düzen (TEGM lise, 21.10.2026, 9-A / 9-B mekik): değerler çok dağınıkken yan yana sütunlar tek sıra küçük
      // noktaya iner, sınıflar yalnız renkle ayrılır. O zaman her grup ortak eksenin üstünde kendi yatay satırındadır:
      // nokta değerinin tam üstünde, aynı gruptaki aynı değerler üst üste (sıklık okunur), satırın başında grubun adı.
      const satirUst = USTr + 2;
      const bantH = K > 1 ? (taban - 4 - satirUst) / K : 0;
      const grupYigini = yanAnahtar
        ? Math.max(1, ...yiginlar.map((y) => Math.max(...grupla(y.ogeler.map((o) => o.satir)).map((g) => g.length))))
        : 1;
      const rSatir = basamakla(Math.max(0.8, Math.min(12, enKucukUzaklik / 2 - 0.5, (bantH - SATIR_ADI_PAYI - 4) / grupYigini / 2 - 0.5)));
      const satirli = !!yanAnahtar && !sutunModu && K > 1 && r < SATIRLI_ESIK && rSatir >= r + 1;
      if (yanAnahtar && satirli) {
        r = rSatir;
        const adimS = 2 * r + 1;
        yiginSayisi = false;
        const yanSutunG = Math.max(3, Math.min(Math.max(aralikPx, Math.min(enKucukUzaklik, alanG)) * 0.82 / K - 2, 40));
        grupBantlari = yanAnahtar.kategoriler.map((ad, gi) => ({
          ad,
          renk: yanAnahtar.renkler.get(ad) ?? BOS_KATEGORI_RENGI,
          ust: satirUst + gi * bantH,
          alt: satirUst + (gi + 1) * bantH,
        }));
        yiginlar.forEach((y, yiginIndeksi) => {
          const x = olcek.ileri(y.merkez);
          const gruplar = grupla(y.ogeler.map((o) => o.satir));
          const degerOf = new Map(y.ogeler.map((o) => [o.satir, o.deger]));
          let tepe = taban;
          gruplar.forEach((liste, gi) => {
            const zemin = satirUst + (gi + 1) * bantH - 4;
            liste.forEach((satir, sira) => {
              const etiket = sira === liste.length - 1 ? 'ust' : undefined;
              konumlar.push({ satir, x, y: zemin - r - sira * adimS, r, deger: degerOf.get(satir) ?? 0, dagitik: false, opaklik: 1, yiginIndeksi, etiket });
            });
            if (liste.length === 0) return;
            const noktaTepe = zemin - r - (liste.length - 1) * adimS - r - 6;
            tepe = Math.min(tepe, noktaTepe);
            const ad = yanAnahtar.kategoriler[gi];
            sutunlar.push({
              anahtar: `sutun-${y.merkez}-${gi}`,
              x: x + (gi - (K - 1) / 2) * (yanSutunG + 2),
              genislik: yanSutunG,
              sayi: liste.length,
              parcalar: [{ ad, sayi: liste.length, renk: yanAnahtar.renkler.get(ad) ?? BOS_KATEGORI_RENGI, alt: 0 }],
              noktaTepe,
              sutunTepe: taban - liste.length * birimSutun - 6,
              metin: String(liste.length),
            });
          });
          yiginTepeleri.push({ x, y: tepe, adet: y.ogeler.length });
        });
      } else if (yanAnahtar) {
        // Yan yana: her değerde grupların yığınları yan yana (grup sırasıyla, ortası değerin üstünde)
        const yanAdim = 2 * r + 1;
        const yanSutunG = Math.max(3, Math.min(Math.max(aralikPx, Math.min(enKucukUzaklik, alanG)) * 0.82 / K - 2, 40));
        yiginlar.forEach((y, yiginIndeksi) => {
          const x = olcek.ileri(y.merkez);
          const gruplar = grupla(y.ogeler.map((o) => o.satir));
          const enUzun = Math.max(...gruplar.map((g) => g.length));
          const ustGrup = gruplar.findIndex((g) => g.length === enUzun);
          const degerOf = new Map(y.ogeler.map((o) => [o.satir, o.deger]));
          // Verisi olan grupların sırası: noktalar yalnız bu gruplar arasında ortalanır (sütun modunda yuvalar sabit)
          const doluGruplar = gruplar.map((g, i) => (g.length > 0 ? i : -1)).filter((i) => i >= 0);
          gruplar.forEach((liste, gi) => {
            const j = doluGruplar.indexOf(gi);
            const gx = sutunModu ? x + (gi - (K - 1) / 2) * (yanSutunG + 2) : x + (j - (doluGruplar.length - 1) / 2) * yanAdim;
            liste.forEach((satir, sira) => {
              const etiket = yiginSayisi ? undefined : gi === ustGrup && sira === liste.length - 1 ? 'ust' : undefined;
              const deger = degerOf.get(satir) ?? 0;
              konumlar.push(
                sutunModu
                  ? { satir, x: gx, y: taban - (sira + 0.5) * birimSutun, r, deger, dagitik: false, opaklik: 0, yiginIndeksi, etiket }
                  : { satir, x: gx, y: taban - 4 - r - sira * adim, r, deger, dagitik: false, opaklik: 1, yiginIndeksi, etiket },
              );
            });
            // Boş grubun sütunu ve "0" yazısı çizilmez (yer yine ayrılır: çiftler hizalı)
            if (liste.length === 0) return;
            const ad = yanAnahtar.kategoriler[gi];
            const renk = yanAnahtar.renkler.get(ad) ?? BOS_KATEGORI_RENGI;
            sutunlar.push({
              anahtar: `sutun-${y.merkez}-${gi}`,
              x: gx,
              genislik: yanSutunG,
              sayi: liste.length,
              parcalar: [{ ad, sayi: liste.length, renk, alt: 0 }],
              noktaTepe: taban - 4 - r - (liste.length - 1) * adim - r - 6,
              sutunTepe: taban - liste.length * birimSutun - 6,
              metin: String(liste.length),
            });
          });
          const noktaTepe = taban - 4 - r - (enUzun - 1) * adim - r - 6;
          yiginTepeleri.push({ x, y: noktaTepe, adet: y.ogeler.length });
        });
      }
      // Tek yığın (yan yana görünüm yukarıda kuruldu)
      (yanAnahtar ? [] : yiginlar).forEach((y, yiginIndeksi) => {
        const x = olcek.ileri(y.merkez);
        const adet = y.ogeler.length;
        for (const o of y.ogeler) {
          const satirNo = Math.floor(o.sira / yiginSutunu);
          const sutunNo = o.sira % yiginSutunu;
          const buSatirda = Math.min(yiginSutunu, adet - satirNo * yiginSutunu);
          const etiket = yiginSayisi ? undefined : sagaSigar ? 'sag' : o.sira === adet - 1 ? 'ust' : undefined;
          konumlar.push(
            sutunModu
              ? { satir: o.satir, x, y: taban - (o.sira + 0.5) * birimSutun, r, deger: o.deger, dagitik: false, opaklik: 0, yiginIndeksi, etiket }
              : {
                  satir: o.satir,
                  x: x + (sutunNo - (buSatirda - 1) / 2) * adim,
                  y: taban - 4 - r - satirNo * adim,
                  r,
                  deger: o.deger,
                  dagitik: false,
                  opaklik: 1,
                  yiginIndeksi,
                  etiket,
                },
          );
        }
        const noktaTepe = taban - 4 - r - (Math.ceil(adet / yiginSutunu) - 1) * adim - r - 6;
        yiginTepeleri.push({ x, y: noktaTepe, adet });
        sutunlar.push({
          anahtar: `sutun-${y.merkez}`,
          x,
          genislik: sutunG,
          sayi: adet,
          parcalar: parcalar(
            y.ogeler.map((o) => o.satir),
            anahtar,
            tekRenk,
          ),
          noktaTepe,
          sutunTepe: taban - adet * birimSutun - 6,
          metin: String(adet),
          yan: parcaYan || undefined,
        });
      });
    }

    // ── Kategorik: kutular, yığın (tek sütun ya da kalabalıkta k'lık sıralar), sıklık sütunları ─────────────
    const kutular: KategoriKutusu[] = [];
    if (kategorik && kats.length > 0) {
      const kutuG = alanG / kats.length;
      const rYatayK = (kutuG * 0.42) / K;
      const rDikey = enCokKat > 0 ? dikeyAlanR / enCokKat / 2 - 0.5 : 18;
      r = Math.min(18, rYatayK, rDikey);
      let adimK: number;
      let kutuSutunu = 1;
      const blok = !yanAnahtar && basamakla(Math.max(0.8, r)) < KATEGORIK_BLOK_YARICAP ? kategorikBlok(enCokKat, kutuG, dikeyAlanR) : null;
      if (blok) {
        // Tek sütunda ince bir iplik olurdu (ör. 40 "Muz"): bütün kutularda aynı k'lık sıralar
        r = blok.r;
        adimK = blok.adim;
        kutuSutunu = blok.k;
      } else if (r >= 2.5 || yanAnahtar) {
        r = basamakla(Math.max(0.8, r));
        adimK = 2 * r + (r >= 4 ? 1 : 0.4);
        if (yanAnahtar && enCokKat * adimK > dikeyAlanR && enCokKat > 0) {
          adimK = dikeyAlanR / enCokKat;
          r = Math.max(0.8, Math.min(r, adimK / 2 - 0.2));
        }
      } else {
        // Çok kalabalık kutu (ör. 2000 atış): noktalar kutuda yan yana sıralara dizilir
        const yer = kutuYerlesimi(enCokKat, kutuG * 0.9, dikeyAlanR, 18, 1.5);
        r = yer.r;
        adimK = yer.birim;
        kutuSutunu = yer.sutunSayisi;
        const satirSayisiKutu = Math.ceil(enCokKat / kutuSutunu);
        if (!yer.sigdi && satirSayisiKutu > 0) {
          adimK = dikeyAlanR / satirSayisiKutu;
          r = Math.max(0.8, Math.min(r, adimK / 2 - 0.2));
        }
      }
      siklik = siklikEkseni(enCokKat, hedefY);
      birimSutun = Math.max(0, alanY - 18) / siklik.max;
      const toplamKat = [...katSatirlari.values()].reduce((t, l) => t + l.length, 0);
      const yuzdeler = toplamKat > 0 ? enBuyukKalanlaYuvarla(kats.map((k) => katSatirlari.get(k)?.length ?? 0), 0.1, 100) : kats.map(() => 0);
      kats.forEach((k, i) => {
        const x0 = SOL + i * kutuG;
        const merkez = x0 + kutuG / 2;
        kutular.push({ kategori: k, x0, x1: x0 + kutuG, merkez });
        // Karşılaştırma ya da grup panelinde panel rengi (5-A paneli teal, 5-B mercan); tek grafikte kategori rengi
        const kRengi = panelRenkli ? tekRenk : kategoriRengi(k, i);
        const liste = katSatirlari.get(k) ?? [];
        const adet = liste.length;
        const kullanilan = Math.min(kutuSutunu, Math.max(adet, 1));
        if (yanAnahtar) {
          // Yan yana: kutuda her grubun kendi yığını (grup sırasıyla), sütun modunda her grubun sütunu
          const yanAdimK = 2 * r + 1;
          const yanSutunG = Math.max(4, Math.min((kutuG * 0.8) / K - 2, 48));
          grupla(liste).forEach((gListe, gi) => {
            const gx = merkez + (gi - (K - 1) / 2) * (sutunModu ? yanSutunG + 2 : yanAdimK);
            const ad = yanAnahtar.kategoriler[gi];
            const gRenk = yanAnahtar.renkler.get(ad) ?? BOS_KATEGORI_RENGI;
            gListe.forEach((satir, sira) => {
              konumlar.push(
                sutunModu
                  ? { satir, x: gx, y: taban - (sira + 0.5) * birimSutun, r, deger: null, dagitik: false, opaklik: 0, yiginIndeksi: 0, kategori: k, renk: gRenk }
                  : { satir, x: gx, y: taban - 4 - r - sira * adimK, r, deger: null, dagitik: false, opaklik: 1, yiginIndeksi: 0, kategori: k, renk: gRenk },
              );
            });
            if (gListe.length === 0) return;
            sutunlar.push({
              anahtar: `kutu-${k}-${gi}`,
              x: gx,
              genislik: yanSutunG,
              sayi: gListe.length,
              parcalar: [{ ad, sayi: gListe.length, renk: gRenk, alt: 0 }],
              noktaTepe: taban - 4 - r - (gListe.length - 1) * adimK - r - 6,
              sutunTepe: taban - gListe.length * birimSutun - 6,
              metin: String(gListe.length),
            });
          });
          return;
        }
        liste.forEach((satir, sira) => {
          const satirNo = Math.floor(sira / kutuSutunu);
          const sutunNo = sira % kutuSutunu;
          const buSatirda = Math.min(kullanilan, adet - satirNo * kutuSutunu);
          konumlar.push(
            sutunModu
              ? { satir, x: merkez, y: taban - (sira + 0.5) * birimSutun, r, deger: null, dagitik: false, opaklik: 0, yiginIndeksi: 0, kategori: k, renk: kRengi }
              : {
                  satir,
                  x: merkez + (sutunNo - (buSatirda - 1) / 2) * adimK,
                  y: taban - 4 - r - satirNo * adimK,
                  r,
                  deger: null,
                  dagitik: false,
                  opaklik: 1,
                  yiginIndeksi: 0,
                  kategori: k,
                  renk: kRengi,
                },
          );
        });
        const yuzdeMetni = `${adet} · %${sayiMetni(yuzdeler[i] ?? 0, 1)}`;
        const sigar = kutuG >= 64 && yuzdeMetni.length * HARF <= kutuG - 6;
        sutunlar.push({
          anahtar: `kutu-${k}`,
          x: merkez,
          genislik: Math.min(kutuG * 0.7, 96),
          sayi: adet,
          parcalar: parcalar(liste, anahtar, kRengi),
          noktaTepe: adet > 0 ? taban - 4 - r - (Math.ceil(adet / kutuSutunu) - 1) * adimK - r - 6 : taban - 8,
          sutunTepe: taban - adet * birimSutun - 6,
          metin: sigar && !yuzdesiz ? yuzdeMetni : String(adet),
          yan: parcaYan || undefined,
        });
      });
    }

    // Değişken atanmadan önce bütün satırlar alanda dağınık durur
    if (!atanmis) {
      tablo.satirlar.forEach((s, i) => {
        if (!icinde(i)) return;
        const k = dagitikKonum(s.id);
        konumlar.push({ satir: i, x: SOL + k.x * alanG, y: UST + k.y * alanY, r: 8, deger: null, dagitik: true, opaklik: 1, yiginIndeksi: 0 });
      });
    }
    konumlar.sort((a, b) => a.satir - b.satir);

    // ── Uzaklık şeridi: her veri için değerinden ortalamaya uzanan çubuk, değere göre sıralı ──────────
    const seritCubuklari =
      serit && olcek && ort !== null
        ? [...noktalar].sort((a, b) => a.deger - b.deger || a.satir - b.satir).map((n) => ({ satir: n.satir, deger: n.deger, x: olcek.ileri(n.deger) }))
        : [];
    let solToplam = 0;
    let sagToplam = 0;
    if (ort !== null) {
      for (const n of seritCubuklari) {
        if (n.deger < ort) solToplam += ort - n.deger;
        else sagToplam += n.deger - ort;
      }
    }

    return {
      SOL,
      alanG,
      UST,
      taban,
      alanY,
      eksen,
      olcek,
      aralikPx,
      gruplu,
      noktalar,
      ondalik,
      ort,
      oms,
      ortancaDeger,
      mx,
      ortGoster,
      omsGoster,
      ortancaGoster,
      baslikY,
      olcuY,
      ortMetni,
      ortG,
      ortX,
      omsMetni,
      omsX,
      omsEtiketY,
      ayracY,
      solKenar,
      sagKenar,
      ss,
      ssGoster,
      ssMetni,
      ssX,
      ssEtiketY,
      ssSol,
      ssSag,
      adMetni,
      eksikMetni,
      adY,
      ortancaMetni,
      ortancaG,
      ortancaX,
      ortancaY,
      serit,
      seritUst,
      seritCubukAlani,
      seritCubuklari,
      solToplam,
      sagToplam,
      konumlar,
      sutunlar,
      kutular,
      yiginTepeleri,
      r,
      yiginSayisi,
      etiketKaydir,
      negatifYok,
      siklik,
      birimSutun,
      eksik,
      veriSayisi,
      grupOlculeri,
      grupSatirY,
      grupBantlari,
    };
  }, [
    satirAnahtari,
    tablo,
    sutun,
    sutunlu,
    W,
    H,
    anahtar,
    sayisal,
    kategorik,
    aralik,
    kategoriSirasi,
    eksenAlani,
    bosIpucu,
    ortakYigin,
    secenekler.ortalama,
    secenekler.oms,
    secenekler.standartSapma,
    secenekler.ortanca,
    baslik,
    sutunModu,
    atanmis,
    tekRenk,
    panelRenkli,
    yanAnahtar,
    olcuKumesi,
    yuzdesiz,
    yanYanaParcalar,
    anahtarYazisi,
  ]);

  const { SOL, UST, taban, alanG, alanY, eksen, olcek, konumlar, ondalik } = c;
  /**
   * Yan parçalı sütunda (`yanYanaParcalar`) parçanın yuvası: anahtar sırasıyla, anahtarı boş satırlar en sağda; yuvalar
   * bütün sütunlarda hizalıdır (parçası olmayan grubun yeri boş kalır)
   */
  const yanYuvaSayisi = Math.max(1, (anahtar?.kategoriler.length ?? 0) + (c.sutunlar.some((s) => s.yan && s.parcalar.some((p) => p.ad === '(boş)')) ? 1 : 0));
  const yanParcaYeri = (s: SiklikSutunu, p: SutunParcasi) => {
    const j = p.ad === '(boş)' ? yanYuvaSayisi - 1 : Math.max(0, anahtar?.kategoriler.indexOf(p.ad) ?? 0);
    const genislik = Math.max(2, (s.genislik - (yanYuvaSayisi - 1) * 2) / yanYuvaSayisi);
    return { x: s.x - s.genislik / 2 + j * (genislik + 2), genislik };
  };
  const cokNokta = konumlar.length > COK_NOKTA;
  const hareketsiz = azaltilmisHareket || cokNokta || akis;
  /**
   * Taban yerleşim yüzünden kaydıysa (uzaklık şeridi açıldı / kapandı, pencere boyu değişti) noktalar eksenle birlikte
   * tek parça kayar: bu çizimde geçiş yok (eksen anında yerindeyken noktalar 600 ms geriden gelmesin)
   */
  const oncekiTaban = useRef(taban);
  const tabanKaydi = Math.abs(oncekiTaban.current - taban) > 0.5;
  useEffect(() => {
    oncekiTaban.current = taban;
  }, [taban]);
  const gecis = hareketsiz || tabanKaydi ? 'none' : `transform 600ms ${GECIS}, opacity 500ms ${GECIS}`;
  const sutunGecis = hareketsiz ? 'none' : `transform 500ms ${GECIS}, opacity 400ms ${GECIS}`;

  /** Tüm değerler ≥ 0 ise (sayım, oran) eksende 0'ın altındaki işaretler çizilmez */
  const { isaretler, etiketli } = eksenIsaretleri(
    eksen ? (c.negatifYok ? eksen.isaretler.filter((v) => v >= 0) : eksen.isaretler) : [],
    Math.floor(alanG / 56),
    !c.gruplu,
  );
  const isaretOndaligi = gosterimOndaligi(isaretler);

  // Klavye gezinmesi: görünen noktalar soldan sağa, yığında alttan üste
  const gezinme = useMemo(
    () =>
      konumlar
        .filter((k) => k.opaklik > 0)
        .sort((a, b) => a.x - b.x || b.y - a.y)
        .map((k) => k.satir),
    [konumlar],
  );
  const gezinmeKumesi = useMemo(() => new Set(gezinme), [gezinme]);
  const sekmeDuragi =
    odak !== null && gezinmeKumesi.has(odak) ? odak : seciliSatir !== null && gezinmeKumesi.has(seciliSatir) ? seciliSatir : gezinme[0] ?? null;
  const odakla = (satir: number) => {
    setOdak(satir);
    svgRef.current?.querySelector<SVGGElement>(`[data-satir="${satir}"]`)?.focus();
  };
  const noktaTusu = (e: React.KeyboardEvent, satir: number, secili: boolean) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSatirSec(secili ? null : asil(satir));
      return;
    }
    const i = gezinme.indexOf(satir);
    let hedef: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') hedef = i + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') hedef = i - 1;
    else if (e.key === 'Home') hedef = 0;
    else if (e.key === 'End') hedef = gezinme.length - 1;
    if (hedef === null) return;
    e.preventDefault();
    if (hedef >= 0 && hedef < gezinme.length) odakla(gezinme[hedef]);
  };

  const surukleyiKabulEt = (e: React.DragEvent) => {
    const turler = Array.from(e.dataTransfer.types);
    if (turler.includes(DEGISKEN_VERI_TURU) || turler.includes('text/plain')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'link';
      if (!birakmaUzerinde) setBirakmaUzerinde(true);
    }
  };

  const birak = (e: React.DragEvent) => {
    e.preventDefault();
    setBirakmaUzerinde(false);
    const id = e.dataTransfer.getData(DEGISKEN_VERI_TURU) || e.dataTransfer.getData('text/plain');
    if (id && tablo.sutunlar.some((s) => s.id === id)) onDegiskenBirak(id);
  };

  const ustundeki = ustunde !== null ? konumlar.find((k) => k.satir === ustunde && k.opaklik > 0) : undefined;
  const balonMetni = ustundeki
    ? `${satirEtiketi(tablo, ustundeki.satir)}${
        ustundeki.kategori !== undefined ? `: ${ustundeki.kategori}` : ustundeki.deger !== null ? `: ${sayiMetni(ustundeki.deger, ondalik)}` : ' (değer yok)'
      }`
    : '';
  const balonGenislik = balonMetni.length * 7.2 + 18;
  const seciliVar = seciliSatir !== null && c.seritCubuklari.some((s) => s.satir === seciliSatir);
  const seciliCubuk = seciliVar ? c.seritCubuklari.find((s) => s.satir === seciliSatir) : undefined;
  const bosVeri = atanmis && c.veriSayisi === 0;
  const kategorikKutulu = kategorik && c.kutular.length > 0;

  if (isaret === 'nesne') return <NesneGrafigi tablo={tablo} sutun={sutun} sira={kategoriSirasi} genislik={W} yukseklik={H} seciliSatir={seciliSatir} onSatirSec={onSatirSec} />;
  return (
    <svg
      ref={svgRef}
      data-grafik="nokta"
      role="img"
      aria-label={atanmis ? `${sutunAdi} nokta grafiği${kategorik ? ' (kategorik)' : ''}${sutunModu ? ', sütunlar' : ''}` : 'Nokta grafiği: değişken atanmadı'}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif' }}
      onDragOver={surukleyiKabulEt}
      onDragEnter={surukleyiKabulEt}
      onDragLeave={() => setBirakmaUzerinde(false)}
      onDrop={birak}
    >
      <style>{hareketsiz ? TEMEL_STIL : TEMEL_STIL + GIRIS_STILI}</style>
      {baslik && (
        <text x={SOL} y={c.baslikY} fontSize={13} fontWeight={700} fill={RENK.metin} data-panel-basligi>
          {baslik}
        </text>
      )}
      {anahtar && <RenkLejanti eslem={anahtar} x={baslik ? SOL + baslik.length * HARF + 24 : SOL} y={c.baslikY} sagSinir={W - SAG} />}
      {anahtarYazisi && (() => {
        // Nesne / şekil grafiğinin anahtarı: başlık ve lejant yoksa solda, varsa sağa yaslı (sığmazsa yazılmaz)
        const solda = !baslik && !anahtar;
        const lejantSonu = anahtar
          ? (baslik ? SOL + baslik.length * HARF + 24 : SOL) + renkLejantiGenisligi(anahtar)
          : SOL + (baslik ? baslik.length * HARF : 0);
        if (!solda && lejantSonu + 16 + anahtarYazisi.length * HARF > W - SAG) return null;
        return (
          <text x={solda ? SOL : W - SAG} y={c.baslikY} fontSize={13} fontWeight={600} textAnchor={solda ? 'start' : 'end'} fill={RENK.solukMetin} data-sekil-anahtari>
            {anahtarYazisi}
          </text>
        );
      })()}

      {/* Yan yana görünüm: her grubun ölçüleri grubun renginde (bant, çizgiler; değerler grup satırlarında) */}
      {olcek &&
        c.grupOlculeri.map((g, gi) => {
          const ortX = g.ort !== null ? olcek.ileri(g.ort) : null;
          // Satırlı düzende her grubun ölçü çizgileri yalnız kendi satırında
          const bant = c.grupBantlari?.[gi];
          const y1 = bant ? bant.ust : UST - 6;
          const y2 = bant ? bant.alt - 2 : taban;
          const parcalarMetni = [
            secenekler.ortalama && g.ort !== null ? olcuMetni('Aritmetik ortalama', g.ort, ondalik) : null,
            secenekler.ortanca && g.ortanca !== null ? olcuMetni('Ortanca', g.ortanca, ondalik) : null,
            secenekler.oms && g.oms !== null ? olcuMetni('Ort. mutlak sapma', g.oms, ondalik) : null,
            secenekler.standartSapma && g.ss !== null ? olcuMetni('Standart sapma', g.ss, ondalik) : null,
          ].filter((m): m is string => m !== null);
          const satirY = c.grupSatirY + 14 + gi * 20;
          return (
            <g key={`grup-olcu-${g.ad}`} data-grup-olculeri={g.ad}>
              {secenekler.standartSapma && ortX !== null && g.ss !== null && (
                <g data-standart-sapma-bandi>
                  <rect x={olcek.ileri(g.ort! - g.ss)} y={y1} width={Math.max(0, olcek.ileri(g.ort! + g.ss) - olcek.ileri(g.ort! - g.ss))} height={Math.max(0, y2 - y1)} fill={g.renk} fillOpacity={0.07} />
                  <line x1={olcek.ileri(g.ort! - g.ss)} x2={olcek.ileri(g.ort! - g.ss)} y1={y1} y2={y2} stroke={g.renk} strokeWidth={1.5} strokeDasharray="2 3" />
                  <line x1={olcek.ileri(g.ort! + g.ss)} x2={olcek.ileri(g.ort! + g.ss)} y1={y1} y2={y2} stroke={g.renk} strokeWidth={1.5} strokeDasharray="2 3" />
                </g>
              )}
              {secenekler.oms && ortX !== null && g.oms !== null && (
                <g data-oms-bandi>
                  <rect x={olcek.ileri(g.ort! - g.oms)} y={y1} width={Math.max(0, olcek.ileri(g.ort! + g.oms) - olcek.ileri(g.ort! - g.oms))} height={Math.max(0, y2 - y1)} fill={OMS_RENGI} fillOpacity={0.12} rx={3} />
                  <line x1={olcek.ileri(g.ort! - g.oms)} x2={olcek.ileri(g.ort! - g.oms)} y1={y1} y2={y2} stroke={OMS_RENGI} strokeWidth={2} />
                  <line x1={olcek.ileri(g.ort! + g.oms)} x2={olcek.ileri(g.ort! + g.oms)} y1={y1} y2={y2} stroke={OMS_RENGI} strokeWidth={2} />
                </g>
              )}
              {secenekler.ortalama && ortX !== null && (
                <g data-ortalama-cizgisi>
                  <line x1={ortX} x2={ortX} y1={y1} y2={y2} stroke={RENK.kart} strokeWidth={5} strokeOpacity={0.9} />
                  <line x1={ortX} x2={ortX} y1={y1} y2={y2} stroke={g.renk} strokeWidth={2.5} />
                </g>
              )}
              {secenekler.ortanca && g.ortanca !== null && (
                <line data-ortanca-cizgisi x1={olcek.ileri(g.ortanca)} x2={olcek.ileri(g.ortanca)} y1={y1} y2={y2} stroke={g.renk} strokeWidth={2.5} strokeDasharray="7 5" />
              )}
              {parcalarMetni.length > 0 && (
                <g data-grup-olcu-satiri={g.ad} style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}>
                  <circle cx={SOL + 6} cy={satirY - 4.5} r={6} fill={g.renk} stroke="none" />
                  <text x={SOL + 18} y={satirY} fontSize={13} fontWeight={700} fill={RENK.metin}>
                    {`${g.ad}: ${parcalarMetni.join(' · ')}`}
                  </text>
                </g>
              )}
            </g>
          );
        })}

      {/* Bırakma alanı (eksen bandı) */}
      <rect
        data-yalniz-ekran
        x={SOL - 8}
        y={taban - 2}
        width={alanG + 16}
        height={Math.max(0, Math.min(44, H - taban - 2))}
        rx={10}
        fill={birakmaUzerinde || surukleniyor ? RENK.vurgu : 'transparent'}
        fillOpacity={birakmaUzerinde ? 0.22 : surukleniyor ? 0.1 : 0}
        stroke={surukleniyor || birakmaUzerinde ? RENK.vurgu : atanmis ? 'transparent' : RENK.kenar}
        strokeWidth={2}
        strokeDasharray={atanmis && !surukleniyor ? undefined : '6 5'}
        style={{ transition: 'fill-opacity 200ms' }}
      />

      {/* Gruplama kuşakları: her grup [kenar, kenar + aralık) açık / koyu sırayla (TinkerPlots "bins") */}
      {c.gruplu && eksen && olcek && (
        <g data-gruplar>
          {eksen.isaretler.slice(0, -1).map((v, i) => (
            <rect
              key={`grup-${v}`}
              x={olcek.ileri(v) + 1}
              y={UST - 8}
              width={Math.max(0, olcek.ileri(eksen.isaretler[i + 1]) - olcek.ileri(v) - 2)}
              height={taban - UST + 8}
              rx={4}
              fill={RENK.izgara}
              fillOpacity={i % 2 === 0 ? 0.35 : 0.12}
            />
          ))}
        </g>
      )}

      {/* Satırlı yan yana düzen: her grubun satırı (açık zemin, taban çizgisi, başında grubun adı) */}
      {c.grupBantlari && (
        <g data-grup-satirlari>
          {c.grupBantlari.map((b, gi) => (
            <g key={`grup-satiri-${b.ad}`} data-grup-satiri={b.ad}>
              {gi % 2 === 0 && <rect x={SOL - 8} y={b.ust} width={alanG + 16} height={Math.max(0, b.alt - b.ust)} rx={6} fill={RENK.izgara} fillOpacity={0.3} />}
              {gi < c.grupBantlari!.length - 1 && <line x1={SOL - 8} x2={SOL + alanG + 8} y1={b.alt - 3} y2={b.alt - 3} stroke={b.renk} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="4 4" />}
              <g style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}>
                <circle cx={SOL + 2} cy={b.ust + 9} r={5.5} fill={b.renk} stroke="none" />
                <text x={SOL + 12} y={b.ust + 14} fontSize={14} fontWeight={800} fill={RENK.metin}>
                  {b.ad}
                </text>
              </g>
            </g>
          ))}
        </g>
      )}

      {/* Kategorik kutucukların zemini */}
      {kategorikKutulu &&
        c.kutular.map((k, i) => (
          <rect key={`kutu-zemin-${k.kategori}`} x={k.x0 + 3} y={UST - 8} width={Math.max(0, k.x1 - k.x0 - 6)} height={taban - UST + 8} rx={8} fill={i % 2 === 0 ? RENK.izgara : 'transparent'} fillOpacity={0.35} />
        ))}

      {/* Ortalama mutlak sapma bandı (altın; nokta renginden ayrı). TEGM: bant kenarları (ortalama − OMS, ortalama + OMS)
          olduğu yerde eksene inen dikey çizgilerdir; ortalamadan tek yana uzanan yatay ayraç yoktur (7. sınıf ders kitabı) */}
      {c.omsGoster && (
        <g data-oms-bandi>
          <rect x={c.solKenar} y={c.ayracY} width={Math.max(0, c.sagKenar - c.solKenar)} height={Math.max(0, taban - c.ayracY)} fill={OMS_RENGI} fillOpacity={0.16} rx={3} />
          <line x1={c.solKenar} x2={c.solKenar} y1={c.ayracY} y2={taban} stroke={OMS_RENGI} strokeWidth={2} data-oms-kenar="sol" />
          <line x1={c.sagKenar} x2={c.sagKenar} y1={c.ayracY} y2={taban} stroke={OMS_RENGI} strokeWidth={2} data-oms-kenar="sag" />
        </g>
      )}

      {/* Standart sapma bandı (zeytin; ortalama ± s): lise ölçüsü, altın bantla birlikte de çizilebilir */}
      {c.ssGoster && (
        <g data-standart-sapma-bandi>
          <rect x={c.ssSol} y={UST - 6} width={Math.max(0, c.ssSag - c.ssSol)} height={Math.max(0, taban - UST + 6)} fill={SS_RENGI} fillOpacity={0.12} rx={3} />
          <line x1={c.ssSol} x2={c.ssSol} y1={UST - 6} y2={taban} stroke={SS_RENGI} strokeWidth={1.5} strokeDasharray="7 3" />
          <line x1={c.ssSag} x2={c.ssSag} y1={UST - 6} y2={taban} stroke={SS_RENGI} strokeWidth={1.5} strokeDasharray="7 3" />
        </g>
      )}

      {/* Sütun modunda sıklık ekseni (tam sayı çentikli) ve "Sıklık" adı */}
      {sutunlu && c.siklik && c.birimSutun > 0 && (
        <g data-siklik-ekseni>
          {c.siklik.isaretler.map((v) => (
            <g key={`siklik-${v}`}>
              <line x1={SOL} x2={W - SAG} y1={taban - v * c.birimSutun} y2={taban - v * c.birimSutun} stroke={RENK.izgara} strokeWidth={1} />
              <text x={SOL - 8} y={taban - v * c.birimSutun + 4} fontSize={13} textAnchor="end" fill={RENK.metin}>
                {v}
              </text>
            </g>
          ))}
          <line x1={SOL} x2={SOL} y1={taban - c.siklik.max * c.birimSutun} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
          <text
            x={14}
            y={(UST + taban) / 2}
            fontSize={13}
            fontWeight={700}
            textAnchor="middle"
            fill={RENK.solukMetin}
            transform={`rotate(-90 14 ${(UST + taban) / 2})`}
            data-eksen-adi="dikey"
          >
            Sıklık
          </text>
        </g>
      )}

      {/* Ortalama ve ortanca çizgileri (sütunların arkasında) */}
      {c.ortGoster && (
        <g data-ortalama-cizgisi>
          <line x1={c.mx} x2={c.mx} y1={c.olcuY + 22} y2={taban} stroke={RENK.kart} strokeWidth={5} strokeOpacity={0.9} />
          <line x1={c.mx} x2={c.mx} y1={c.olcuY + 22} y2={taban} stroke={RENK.mercan} strokeWidth={2.5} />
        </g>
      )}
      {c.ortancaGoster && olcek && c.ortancaDeger !== null && (
        <line
          data-ortanca-cizgisi
          x1={olcek.ileri(c.ortancaDeger)}
          x2={olcek.ileri(c.ortancaDeger)}
          y1={UST - 6}
          y2={taban}
          stroke={RENK.lavanta}
          strokeWidth={2.5}
          strokeDasharray="7 5"
        />
      )}

      {/* Sıklık sütunları (sütun modu): yükseklik = sıklık × birim; renk anahtarına göre yığılır (yan: parçalar yan yana) */}
      {atanmis &&
        c.sutunlar.map((s) => (
          <g key={s.anahtar} data-siklik-sutunu={s.anahtar} data-sayi={s.sayi} data-yukseklik={sutunModu ? (s.sayi * c.birimSutun).toFixed(2) : '0'}>
            {s.parcalar.map((p, k) => {
              const yer = s.yan ? yanParcaYeri(s, p) : null;
              const alt = yer ? taban : taban - p.alt * c.birimSutun;
              const boy = Math.max(0.001, p.sayi * c.birimSutun - (!yer && k < s.parcalar.length - 1 ? 1.5 : 0));
              return (
                <g
                  key={p.ad || 'tek'}
                  data-yigin-parcasi={yer ? undefined : p.ad || undefined}
                  data-yan-parca={yer ? p.ad : undefined}
                  style={{
                    transform: `translate(${yer ? yer.x : s.x - s.genislik / 2}px, ${alt}px) scaleY(${sutunModu ? -boy : -0.001})`,
                    transition: sutunGecis,
                    opacity: sutunModu ? 1 : 0,
                  }}
                >
                  <rect
                    x={0}
                    y={0}
                    width={yer ? yer.genislik : s.genislik}
                    height={1}
                    fill={p.renk}
                    fillOpacity={0.55}
                    stroke={kenarGerekir(p.renk) ? RENK.metin : undefined}
                    strokeWidth={kenarGerekir(p.renk) ? 1.5 : undefined}
                    vectorEffect={kenarGerekir(p.renk) ? 'non-scaling-stroke' : undefined}
                  />
                </g>
              );
            })}
          </g>
        ))}

      {/* Kategorik kutucukların eksen etiketleri */}
      {kategorikKutulu && (
        <g>
          {c.kutular.map((k) => {
            const sigan = Math.max(2, Math.floor((k.x1 - k.x0) / 8));
            return (
              <g key={`kutu-${k.kategori}`}>
                <line x1={k.x1} x2={k.x1} y1={taban} y2={taban + 8} stroke={RENK.metin} strokeWidth={1.2} />
                <text x={k.merkez} y={taban + 20} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.metin}>
                  {k.kategori.length > sigan ? `${k.kategori.slice(0, sigan - 1)}…` : k.kategori}
                </text>
              </g>
            );
          })}
          <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
          <line x1={SOL} x2={SOL} y1={taban} y2={taban + 8} stroke={RENK.metin} strokeWidth={1.2} />
        </g>
      )}

      {/* Sayısal eksen (ortaokul ve lisede sayı doğrusu gibi iki ucu oklu: uçlar ölçeğin dışına 12 px taşar) */}
      {!kategorikKutulu && eksen && olcek && (
        <g>
          <line x1={eksenOklari ? SOL - EKSEN_UC_PAYI : SOL} x2={eksenOklari ? W - SAG + EKSEN_UC_PAYI : W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
          {eksenOklari && <YatayCiftOk x0={SOL - EKSEN_UC_PAYI} x1={W - SAG + EKSEN_UC_PAYI} y={taban} />}
          {isaretler.map((v, i) => {
            const metin = sayiMetni(v, isaretOndaligi);
            // Uçtaki etiket ("40 000") grafiğin kenarından taşmaz: yarı genişliği kadar içeri kıstırılır
            const yari = (metin.length * HARF) / 2;
            return (
              <g key={v}>
                <line x1={olcek.ileri(v)} x2={olcek.ileri(v)} y1={taban} y2={taban + 6} stroke={RENK.metin} strokeWidth={1.2} />
                {etiketli(i) && (
                  <text x={sinirla(olcek.ileri(v), yari + 2, W - yari - 2)} y={taban + 20} fontSize={13} textAnchor="middle" fill={RENK.metin} data-eksen-isareti>
                    {metin}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}
      {!kategorikKutulu && !(eksen && olcek) && (
        <g>
          <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.kenar} strokeWidth={1.5} strokeDasharray="6 5" />
          <text x={W / 2} y={taban + 26} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin} data-bos-ipucu={atanmis && bosIpucu ? '' : undefined}>
            {atanmis
              ? bosIpucu ?? `${sutunAdi}: ${kategorik ? 'değer yok' : 'sayısal değer yok'}`
              : 'Tabloda değişken yok: “+ Sütun” ile bir sayı sütunu ekleyin'}
          </text>
        </g>
      )}

      {sutunlu && c.siklik && <EksenOklari x={SOL} ustY={taban - c.siklik.max * c.birimSutun} y={taban} sagX={W - SAG} />}
      {/* Eksen adı satırı: değişken adı + birim (panel başlığı varken yinelenmez), eksik satır notu */}
      {atanmis && c.adMetni && (eksen || kategorikKutulu) && (
        <text x={W - SAG} y={taban + c.adY + 14} fontSize={13} fontWeight={700} textAnchor="end" fill={RENK.metin} data-eksen-adi="yatay">
          {c.adMetni}
        </text>
      )}
      {c.eksikMetni && konumlar.length > 0 && (
        <text x={SOL} y={taban + c.adY + 14} fontSize={13} fontWeight={600} fill={RENK.solukMetin} data-eksik-satir>
          {c.eksikMetni}
        </text>
      )}

      {/* Boş grafik ipucu (toplama başında): eksen çizili, ortada ipucu */}
      {bosVeri && bosIpucu && (eksen || kategorikKutulu) && (
        <text x={SOL + alanG / 2} y={UST + alanY / 2} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin} data-bos-ipucu>
          {bosIpucu}
        </text>
      )}

      {/* Noktalar */}
      {konumlar.map((k) => {
        const secili = seciliSatir === asil(k.satir);
        const gorunur = k.opaklik > 0;
        const anahtarRengi = anahtar && !k.dagitik ? satirRengi(anahtar, k.satir) : undefined;
        const etiket = satirEtiketi(tablo, k.satir);
        const dolgu = k.dagitik ? RENK.kart : anahtarRengi ?? k.renk ?? tekRenk;
        const halkaBurada = halka !== null && halka.satir === asil(k.satir) && gorunur;
        return (
          <g
            key={tablo.satirlar[k.satir]?.id ?? k.satir}
            role="button"
            data-satir={k.satir}
            className="vg-odaklanir"
            tabIndex={gorunur && sekmeDuragi === k.satir ? 0 : -1}
            aria-label={`${etiket}${k.kategori !== undefined ? `: ${k.kategori}` : k.deger !== null ? `: ${sayiMetni(k.deger, ondalik)}` : ''}`}
            aria-pressed={secili}
            aria-hidden={gorunur ? undefined : true}
            style={{
              transform: `translate(${k.x}px, ${k.y}px)`,
              transition: gecis,
              opacity: k.opaklik,
              cursor: 'pointer',
              outline: 'none',
              pointerEvents: gorunur ? 'auto' : 'none',
            }}
            onClick={() => {
              setOdak(k.satir);
              onSatirSec(secili ? null : asil(k.satir));
            }}
            onKeyDown={(e) => noktaTusu(e, k.satir, secili)}
            onPointerEnter={() => setUstunde(k.satir)}
            onPointerLeave={() => setUstunde((u) => (u === k.satir ? null : u))}
            onFocus={() => {
              setOdak(k.satir);
              setUstunde(k.satir);
            }}
            onBlur={() => setUstunde((u) => (u === k.satir ? null : u))}
          >
            {/* Dokunmatik hedefi büyüt (en az 22 px yarıçap) */}
            {!cokNokta && <circle r={Math.max(k.r, 22)} fill="transparent" />}
            {isaret === 'nokta' || k.dagitik ? (
              <circle
                r={k.r}
                fill={dolgu}
                // "Beyaz" / "Siyah" gibi kart zemininde kaybolan dolguya metin renginde kenar
                stroke={k.dagitik ? RENK.birincil : kenarGerekir(dolgu) ? RENK.metin : RENK.kart}
                strokeWidth={k.dagitik ? 2 : kenarGerekir(dolgu) ? 1.5 : k.r < 3 ? 0 : 1}
                style={{
                  transition: hareketsiz ? 'none' : 'r 200ms, fill 200ms',
                  animation: hareketsiz || k.dagitik ? undefined : `vg-nokta-gir 320ms ${GECIS}`,
                }}
              />
            ) : (
              // İlkokul şekil grafiği (kare) ve nesne grafiği (kategorinin resmi; resmi yoksa kare)
              <g style={{ animation: hareketsiz ? undefined : `vg-nokta-gir 320ms ${GECIS}` }}>
                {(() => {
                  const kenar = kenarGerekir(dolgu) ? RENK.metin : RENK.kart;
                  const kalinlik = kenarGerekir(dolgu) ? 1.5 : k.r < 3 ? 0 : 1;
                  return (
                    <KareIsareti r={k.r} dolgu={dolgu} kenar={kenar} kenarKalinligi={kalinlik} />
                  );
                })()}
              </g>
            )}
            {secili && <circle data-yalniz-ekran data-secim-halkasi r={k.r + 3.5} fill="none" stroke={RENK.metin} strokeWidth={3} pointerEvents="none" />}
            <circle className="vg-odak" data-yalniz-ekran r={k.r + 7} fill="none" stroke={RENK.vurgu} strokeWidth={3} pointerEvents="none" />
            {halkaBurada && (
              <circle
                key={`halka-${halka.no}`}
                data-yalniz-ekran
                data-vurgu-halkasi
                r={k.r + 4}
                fill="none"
                stroke={RENK.mercan}
                strokeWidth={2.5}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  animation: azaltilmisHareket ? undefined : 'vg-halka 700ms ease-out forwards',
                  ...({ '--vg-halka-olcek': ((k.r + 8) / (k.r + 4)).toFixed(3) } as React.CSSProperties),
                }}
              />
            )}
            {secenekler.etiketler && k.deger !== null && k.etiket && (
              <text
                x={k.etiket === 'sag' ? k.r + 4 : undefined}
                y={k.etiket === 'sag' ? 4.5 : -k.r - 4 - (c.etiketKaydir && k.yiginIndeksi % 2 === 1 ? 14 : 0)}
                fontSize={13}
                fontWeight={600}
                textAnchor={k.etiket === 'sag' ? 'start' : 'middle'}
                data-deger-etiketi
                fill={RENK.metin}
                style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}
              >
                {sayiMetni(k.deger, ondalik)}
              </text>
            )}
          </g>
        );
      })}

      {/* Yoğun (ya da etiketleri sığmayan gruplu) sayısal yığınlarda: nokta başına değer yerine yığın başına sayı */}
      {secenekler.etiketler &&
        sayisal &&
        c.yiginSayisi &&
        !sutunModu &&
        c.yiginTepeleri.map((t, i) => (
          <text
            key={`yigin-sayi-${i}`}
            x={t.x}
            y={Math.max(UST + 4, t.y)}
            fontSize={13}
            fontWeight={800}
            textAnchor="middle"
            fill={RENK.metin}
            style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}
            data-yigin-sayisi
          >
            {t.adet}
          </text>
        ))}

      {/* Sıklık etiketleri: sütun modunda sütun tepesinde; kategorik "Sayılar" açıkken yığın tepesinde "12 · %60".
          Hiç veri yokken (boş plan tablosu) "0 · %0" yinelenmez: eksen ve boş ipucu yeter */}
      {atanmis &&
        c.sutunlar.map((s, _i, hepsi) => {
          const kategorikSayi = kategorik && secenekler.etiketler;
          const gorunur = (sutunModu || kategorikSayi) && hepsi.some((x) => x.sayi > 0);
          const metin = kategorik && secenekler.etiketler ? s.metin : String(s.sayi);
          const y = sutunModu ? s.sutunTepe : s.noktaTepe;
          if (s.yan && sutunModu)
            return (
              <g key={`sayi-${s.anahtar}`} style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}>
                {s.parcalar.map((p) => {
                  const yer = yanParcaYeri(s, p);
                  // Dar sütunun sayısı komşusununkine biner: yazılmaz (sıklık ekseninden okunur; KategorikSutunGrafigi gibi)
                  if (yer.genislik < 12) return null;
                  return (
                    <text
                      key={p.ad}
                      x={yer.x + yer.genislik / 2}
                      y={Math.max(UST + 2, taban - p.sayi * c.birimSutun - 6)}
                      fontSize={13}
                      fontWeight={800}
                      textAnchor="middle"
                      fill={RENK.metin}
                      data-siklik-etiketi={gorunur ? String(p.sayi) : undefined}
                      data-yan-parca-sayisi={p.ad}
                      style={{ opacity: gorunur ? 1 : 0 }}
                    >
                      {p.sayi}
                    </text>
                  );
                })}
              </g>
            );
          return (
            <text
              key={`sayi-${s.anahtar}`}
              x={s.x}
              y={Math.max(UST + 2, y)}
              fontSize={13}
              fontWeight={800}
              textAnchor="middle"
              fill={RENK.metin}
              data-siklik-etiketi={gorunur ? metin : undefined}
              style={{
                opacity: gorunur ? 1 : 0,
                transition: sutunGecis,
                paintOrder: 'stroke',
                stroke: RENK.kart,
                strokeWidth: 3,
                strokeLinejoin: 'round',
              }}
            >
              {metin}
            </text>
          );
        })}

      {/* Ortalama etiketi (üstte, çizginin başında) */}
      {c.ortGoster && (
        <g data-ortalama-etiketi>
          <rect x={c.ortX} y={c.olcuY + 2} width={c.ortG} height={20} rx={6} fill={RENK.mercan} />
          <text x={c.ortX + c.ortG / 2} y={c.olcuY + 16} fontSize={13} fontWeight={800} textAnchor="middle" fill={KUTU_YAZISI}>
            {c.ortMetni}
          </text>
        </g>
      )}

      {/* Ortalama mutlak sapma: etiket ve iki kenarın değerleri (kenar çizgileri bantta); yatay ayraç çizilmez */}
      {c.omsGoster && c.ort !== null && c.oms !== null && (
        <g data-oms-ayraci>
          {c.omsX !== null && (
            <text
              x={c.omsX}
              y={c.omsEtiketY ?? c.olcuY + 16}
              fontSize={13}
              fontWeight={800}
              fill={RENK.metin}
              style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}
            >
              {c.omsMetni}
            </text>
          )}
          <g style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }} data-oms-kenarlari>
            {(() => {
              const solMetin = sayiMetni(c.ort - c.oms, c.ondalik);
              const sagMetin = sayiMetni(c.ort + c.oms, c.ondalik);
              const solDisari = c.solKenar - 6 - solMetin.length * HARF >= 2;
              const sagDisari = c.sagKenar + 6 + sagMetin.length * HARF <= W - 2;
              return (
                <>
                  <text x={solDisari ? c.solKenar - 6 : c.solKenar + 6} y={c.ayracY + 4} fontSize={13} fontWeight={700} textAnchor={solDisari ? 'end' : 'start'} fill={RENK.metin}>
                    {solMetin}
                  </text>
                  <text x={sagDisari ? c.sagKenar + 6 : c.sagKenar - 6} y={c.ayracY + 4} fontSize={13} fontWeight={700} textAnchor={sagDisari ? 'start' : 'end'} fill={RENK.metin}>
                    {sagMetin}
                  </text>
                </>
              );
            })()}
          </g>
        </g>
      )}

      {/* Standart sapma etiketi (ölçü satırında ya da kendi satırında; zeytin renk kutucuğuyla) ve bandın kenar değerleri */}
      {c.ssGoster && c.ssX !== null && c.ort !== null && c.ss !== null && (
        <g data-standart-sapma-etiketi style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}>
          <rect x={c.ssX} y={(c.ssEtiketY ?? c.olcuY + 16) - 10} width={10} height={10} rx={2} fill={SS_RENGI} stroke="none" />
          <text x={c.ssX + 16} y={c.ssEtiketY ?? c.olcuY + 16} fontSize={13} fontWeight={800} fill={RENK.metin}>
            {c.ssMetni}
          </text>
          <g data-standart-sapma-kenarlari>
            {(() => {
              const solMetin = sayiMetni(c.ort - c.ss, c.ondalik);
              const sagMetin = sayiMetni(c.ort + c.ss, c.ondalik);
              const solDisari = c.ssSol - 6 - solMetin.length * HARF >= 2;
              const sagDisari = c.ssSag + 6 + sagMetin.length * HARF <= W - 2;
              const y = UST + 8;
              return (
                <>
                  <text x={solDisari ? c.ssSol - 6 : c.ssSol + 6} y={y} fontSize={12} fontWeight={700} textAnchor={solDisari ? 'end' : 'start'} fill={SS_RENGI}>
                    {solMetin}
                  </text>
                  <text x={sagDisari ? c.ssSag + 6 : c.ssSag - 6} y={y} fontSize={12} fontWeight={700} textAnchor={sagDisari ? 'start' : 'end'} fill={SS_RENGI}>
                    {sagMetin}
                  </text>
                </>
              );
            })()}
          </g>
        </g>
      )}

      {/* Ortanca etiketi (eksenin altında) */}
      {c.ortancaGoster && (
        <g data-ortanca-etiketi>
          <rect x={c.ortancaX} y={taban + c.ortancaY} width={c.ortancaG} height={20} rx={6} fill={ORTANCA_KUTUSU} />
          <text x={c.ortancaX + c.ortancaG / 2} y={taban + c.ortancaY + 14} fontSize={13} fontWeight={800} textAnchor="middle" fill={KUTU_YAZISI}>
            {c.ortancaMetni}
          </text>
        </g>
      )}

      {/* Uzaklık şeridi: her verinin ortalamaya uzaklığı; soldakilerin ve sağdakilerin toplamı eşittir */}
      {c.serit && olcek && c.ort !== null && (
        <g data-uzaklik-seridi>
          {(() => {
            const n = c.seritCubuklari.length;
            const adim = n > 0 ? c.seritCubukAlani / n : 0;
            const kalinlik = Math.max(1, Math.min(5, adim * 0.72));
            const ust = taban + c.seritUst;
            const yaziY = ust + c.seritCubukAlani + 16;
            const solMetni = `Solda toplam ${yaklasikMetin(c.solToplam, c.ondalik)}`;
            const sagMetni = `Sağda toplam ${yaklasikMetin(c.sagToplam, c.ondalik)}`;
            // Her toplamın önünde çubuklarının renginde küçük kare: hangi toplamın hangi çubuklar olduğu okunur
            const sagX = SOL + 14 + solMetni.length * HARF + 18;
            const toplamSonu = sagX + 14 + sagMetni.length * HARF;
            const seciliMetni = seciliCubuk
              ? `${sayiMetni(seciliCubuk.deger, c.ondalik)} ile ${yaklasikMetin(c.ort, c.ondalik)} arası: ${yaklasikMetin(Math.abs(seciliCubuk.deger - c.ort), c.ondalik)}`
              : '';
            const ikisiSigar = !seciliMetni || toplamSonu + 16 <= W - SAG - seciliMetni.length * HARF;
            return (
              <>
                <line x1={c.mx} x2={c.mx} y1={ust - 3} y2={ust + c.seritCubukAlani + 3} stroke={RENK.mercan} strokeWidth={2} />
                {c.seritCubuklari.map((s, i) => {
                  const sol = s.deger < c.ort!;
                  const secili = s.satir === seciliSatir;
                  return (
                    <rect
                      key={`uzaklik-${s.satir}`}
                      data-uzaklik-cubugu={sol ? 'sol' : 'sag'}
                      x={Math.min(s.x, c.mx) - (Math.abs(s.x - c.mx) < 1.5 ? 0.75 : 0)}
                      y={ust + i * adim + (adim - kalinlik) / 2}
                      width={Math.max(1.5, Math.abs(s.x - c.mx))}
                      height={kalinlik}
                      rx={Math.min(1.5, kalinlik / 2)}
                      fill={sol ? SERIT_SOL : SERIT_SAG}
                      fillOpacity={seciliVar && !secili ? 0.4 : 1}
                      stroke={secili ? RENK.metin : 'none'}
                      strokeWidth={secili ? 1.5 : 0}
                    />
                  );
                })}
                {ikisiSigar && (
                  <g data-uzaklik-toplami>
                    <rect x={SOL} y={yaziY - 10} width={10} height={10} rx={2} fill={SERIT_SOL} />
                    <rect x={sagX} y={yaziY - 10} width={10} height={10} rx={2} fill={SERIT_SAG} />
                    <text y={yaziY} fontSize={13} fontWeight={700} fill={RENK.metin}>
                      <tspan x={SOL + 14} data-toplam="sol">
                        {solMetni}
                      </tspan>
                      <tspan x={sagX + 14} data-toplam="sag">
                        {sagMetni}
                      </tspan>
                    </text>
                  </g>
                )}
                {seciliMetni && (
                  <text
                    x={ikisiSigar ? W - SAG : SOL}
                    y={yaziY}
                    fontSize={13}
                    fontWeight={800}
                    textAnchor={ikisiSigar ? 'end' : 'start'}
                    fill={RENK.metin}
                    data-yalniz-ekran
                    data-uzaklik-secili
                  >
                    {seciliMetni}
                  </text>
                )}
              </>
            );
          })()}
        </g>
      )}

      {/* Değer balonu */}
      {ustundeki && (
        <g
          data-yalniz-ekran
          style={{ pointerEvents: 'none' }}
          transform={`translate(${Math.min(Math.max(ustundeki.x - balonGenislik / 2, 4), W - balonGenislik - 4)}, ${
            ustundeki.y - ustundeki.r - 34 < 4 ? ustundeki.y + ustundeki.r + 8 : ustundeki.y - ustundeki.r - 34
          })`}
        >
          <rect width={balonGenislik} height={26} rx={8} fill={RENK.metin} fillOpacity={0.92} />
          <text x={balonGenislik / 2} y={17} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.zemin}>
            {balonMetni}
          </text>
        </g>
      )}
    </svg>
  );
}
