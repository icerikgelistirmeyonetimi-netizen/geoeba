'use client';

/**
 * "Veri ve Grafik" masaüstü uygulaması (TinkerPlots mantığı): veri tablosu + nokta / sütun / çizgi / daire /
 * saçılım grafikleri + istatistik paneli. Grafik türü sekmeleri veri türüne göre etkindir (çizgi bir, saçılım
 * iki sayısal değişken ister); gösterilen değişken grafiğin üstündeki sekmelerden seçilir. Tablo ile grafikler
 * iki yönlü bağlıdır (seçili satır, sürükleyerek değer değiştirme).
 *
 * Veri toplama: araç çubuğunda "Veri topla" (Örnek veri ile İndir arasında) paneli (toplama/VeriToplaPaneli) açar.
 * Panel açıkken gövde iki sütundur: panel | grafik sütunu; tablo grafik sütununun altında katlanabilir bant
 * (varsayılan kapalı, kalıcı). Panel Tablom'a toplamaDurumu.ts işlevleriyle yazar (planiUygula, toplamaVerisiYaz,
 * toplamaKapat …); grafik ve tablo toplama bilgilerini (eksen alanı, boş ipuçları, kategori sırası, yeni satır
 * parlaması / halkası) toplamaGorunumBilgisi'nden alır. Panel kapanınca grafik sütununda soru şeridi görünür. Deney
 * araştırmasında özet en az 2 satırken "Atışlar | Deney özeti" küme seçicisi çıkar. Eski örnekleyicinin kaydı
 * açılışta taşınır (durum.ts: durumCoz göçü; eski deney sonuçları "Önceki tabloya dön"de).
 * Durum localStorage'da kalıcıdır ('geoeba_veri-grafik_v1'; 300 ms ertelenerek, sayfa kapanırken hemen yazılır) ve ilk çizimden
 * önce okunur; ilk açılışta örnek veriyle gelir. Tabloyu değiştiren işlemler (örnek yükleme, Temizle, sütun / satır
 * silme, rehber eylemi) [Geri al]'lı kısa bildirimle (Tost; tablo alanının altında) duyurulur; örnek yükleme korunmaya
 * değer eski tabloyu "Önceki tabloya dön" için saklar (durum.ts: ornegiYukle / tabloDegistir / oncekiTabloyaDon).
 *
 * Örnekler: "Örnek veri" menüsü sınıf düzeyine göre galeridir (OrnekGalerisi). Yüklenen örnek Tablom'a bağlanır:
 * açılış görünümü (rehber.ts: acilisYamasi), grafik sütununun ipucu yuvasında Keşif şeridi / kartı (KesifKarti:
 * araştırma sorusu, künye, dört adımlı rehber; adımın düğmesi durum.ts: rehberEylemiUygula), örneğin kategori sırası
 * ve çizgide yüzde ayarı. Tablonun başlık satırında örneğin adı ve kartı açıp kapatan "i" düğmesi durur. Sütun
 * eklenir / silinir / türü değişir, yapıştırma tabloyu yeniden kurar ya da Temizle yapılırsa bağ kopar.
 *
 * Grafiklerin bağlanması (kurallar grafikKurallari.ts'te): seçenek şeridinde Ortalama, Ortanca, Ortalama mutlak sapma;
 * "Karşılaştır" aynı birimli ikinci sayısal değişkeni (alt alta iki panel, ikincisi mercan; çizgide ikinci seri;
 * İstatistik'te iki sütun) ya da kategorik değişkene göre grupları (her grup bir panel, ortak eksen) getirir. Daire'de
 * sayısal değişken her satır bir dilim, değerlerin sıklığı ya da (örnek "uygun değil" diyorsa) bilgi kutusudur; Sütun
 * çok veride değerlerin sıklığını çizer; Çizgi'de satırlar bir sıra değilse not çıkar. Grafikte veri yokken grafik
 * yerine BosDurum durur. PNG, grafik alanındaki bütün grafikleri başlık bandıyla birleştirir.
 */
import React, { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { VeriTablosu as VeriTablosuBileseni, tabloDogalGenisligi } from './VeriTablosu';
import { NoktaGrafigi, yiginYuksekligi, type NoktaSecenekleri } from './NoktaGrafigi';
import { SutunGrafigi } from './SutunGrafigi';
import { CizgiGrafigi, yuzdeAnlamli } from './CizgiGrafigi';
import { KesifKarti } from './KesifKarti';
import { OrnekGalerisi } from './OrnekGalerisi';
import { acilisYamasi } from './rehber';
import { SacilimGrafigi } from './SacilimGrafigi';
import { DaireGrafigi } from './DaireGrafigi';
import { IstatistikPaneli } from './IstatistikPaneli';
import { KategorikIstatistik, KategorikSutunGrafigi, frekansTablosu, kategorikFrekanslar } from './KategorikGrafikler';
import { BosDurum, DaireBilgisi } from './BosDurum';
import {
  CIZGI_SIRA_NOTU,
  cizgiSiraNotuGerekli,
  daireGorunumu,
  degerSikligiTablosu,
  grupPanelleri,
  karsilastirmaAdaylari,
  pngBandi,
  sutundaSiklikGerekli,
  type KarsilastirmaAdayi,
} from './grafikKurallari';
import { adVeBirim } from './grafikOrtak';
import { OZET_SUTUNU, calismalariTablodanGuncelle } from './deney';
import {
  arastirmaYaz,
  ozeteGec,
  planUyarisi,
  planiUygula,
  toplamaAc,
  toplamaGorunumBilgisi,
  toplamaKapat,
  toplamaVerisiYaz,
  type ToplamaVerisi,
} from './toplamaDurumu';
import { arastirmaBagli, csvAdi, type Arastirma } from './arastirma';
import { VeriToplaPaneli, VeriToplaSimgesi } from './toplama/VeriToplaPaneli';
import { aralikSecenekleri, gruplamaVar, seriRengi, varsayilanAralik } from './grafik';
import { caprazSayim, degiskenSutunlari, kategoriRengi, renkEslemesi, satirRengi, sutunMetinleri } from './kategorik';
import {
  csvUret,
  gecerliDegerler,
  sayiHucreYaz,
  sayiYaz,
  sutunIndeksi,
  type RehberEylemi,
  type VeriTablosu,
} from './veri';
import {
  KUMELER,
  OZELLIKLER,
  SEKMELER,
  bagliOrnek,
  baslangicDurumu,
  ornegiYukle,
  rehberEylemiUygula,
  tabloyuTemizle,
  type IpucuDurumu,
  durumMetindenCoz,
  etkinTablo,
  eksenDuzelt,
  kumeDegistir,
  kumeEtiketi,
  kumeTablosu,
  oncekiTabloyaDon,
  toplamaKumeleri,
  RENKSIZ,
  renkAnahtari,
  sacilimEksenleri,
  sayisalDegiskenSayisi,
  sekmeDuzelt,
  sekmeKullanilabilir,
  tabloAdiBul,
  tabloDuzenle,
  type DaireModu,
  type Durum,
  type KumeId,
  type Sekme,
} from './durum';
import { Tost, type TostEylemi, type TostVerisi } from './Tost';
import {
  DOLU_ZEMIN,
  DUGME,
  DUGME_BIRINCIL,
  SECIM,
  dosyaAdiTemizle,
  dosyaIndir,
  radyoTusu,
  svgPngIndir,
  useAcilirMenu,
  useAzaltilmisHareket,
  useBoyut,
  TurIsareti,
} from './ortak';
import { sekmeKimlikleri, sekmeOkTusu } from '../sekmeler';

export { manifest } from './manifest';

export const DEPO_ANAHTARI = 'geoeba_veri-grafik_v1';

/** Kayıt bu kadar ms ertelenir (hızlı değişimlerde her tuşta yazılmaz); akış sürerken hiç yazılmaz */
export const KAYIT_GECIKMESI = 300;

/** İlk durum: kayıt varsa o (yalnız istemcide; sunucu çiziminde ve testlerde varsayılan), eksen ve sekme düzeltilmiş */
function ilkDurum(): Durum {
  return sekmeDuzelt(eksenDuzelt(durumYukle() ?? baslangicDurumu()));
}

/**
 * Kayıttaki durum (bozuk ya da yoksa null). Eski örnekleyicinin kaydı `durumCoz`'da taşınır (eski kümeler → Tablom,
 * açık eski panel → açık Veri topla paneli, eski deney sonuçları → önceki tablo; VT §9.4); panel kayıttaki gibi açık ya
 * da kapalı gelir.
 */
function durumYukle(): Durum | null {
  if (typeof window === 'undefined') return null;
  try {
    return durumMetindenCoz(window.localStorage.getItem(DEPO_ANAHTARI));
  } catch {
    return null;
  }
}

/** Veri türü uymadığı için pasif grafik sekmelerinin nedeni (ipucu ve panel iletisi) */
const sekmeGerekceleri: Partial<Record<Sekme, string>> = {
  cizgi: 'Çizgi grafiği için tabloda en az bir sayısal değişken olmalı.',
  sacilim: 'Saçılım grafiği iki sayısal değişken arasındaki ilişkiyi gösterir: tabloda en az iki sayısal sütun olmalı.',
};

/** Göster / gizle seçeneği (basılı düğme; sekme düğmeleriyle aynı dil) */
const SECENEK_DUGMESI = (aktif: boolean, dar = false) =>
  `inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[calc(var(--radius)-8px)] ${dar ? 'w-11' : 'px-2.5'} text-[12px] font-semibold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 ${
    aktif ? DOLU_ZEMIN : 'text-foreground hover:bg-accent'
  }`;

/** Seçenek şeridindeki göster / gizle düğmelerinin nokta grafiği seçenekleri */
type NoktaSecenegi = 'ortalama' | 'ortanca' | 'oms' | 'etiketler';

/** Düğme sınıfının yalnız simgeli (44 × 44) biçimi */
const simgeDugmesi = (sinif: string) => sinif.replace(' px-3 ', ' w-11 px-0 ');

/** Menüdeki radyo seçiminin işareti (dolu halka) */
function RadyoIsareti({ secili }: { secili: boolean }) {
  return (
    <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${secili ? 'border-primary' : 'border-muted-foreground/50'}`}>
      {secili && <span className="h-2 w-2 rounded-full bg-primary" />}
    </span>
  );
}

/** Araç çubuğunun sağındaki düğmeler bu kök genişliğinin altında yalnız simge (44 × 44) olur; çubuk tek satır kalır */
export const DAR_ARAC_CUBUGU = 1000;

/** Seçenek şeridinde düğme etiketleri bu genişliğin altında gizlenir (yalnız simge; ad title ve erişilebilir adda) */
export const DAR_SERIT = 640;

/** Alt alta karşılaştırma panellerinin en küçük yüksekliği; ikisi sığmazsa grafik alanı kayar */
export const PANEL_EN_AZ = 140;

/** Tost ile tablonun alt şeridi arasındaki boşluk (px) */
const TOST_ALT_PAYI = 10;

/** Sunucuda useEffect (uyarısız), tarayıcıda boyamadan önce çalışan useLayoutEffect */
const useIzomorfikYerlesimEtkisi = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Keşif kartının en büyük yüksekliği: grafik sütunu yüksekliğinin bu oranı (kart soruyu kesmeyecek kadar aşabilir) */
export const KESIF_KARTI_ORANI = 0.34;

/**
 * Seçenek şeridinin düzeyleri (tek satır; içerik sığdığı en geniş düzeyde çizilir):
 * - 'tam': etiketli düğmeler, "Karşılaştır:" yazısı;
 * - 'orta': etiketli düğmeler, Karşılaştır'ın yazısı yerine simge;
 * - 'kismi': asıl düğmeler (Ortalama, Ortanca, Ortalama mutlak sapma) etiketli, sondaki `ikincil` düğme (Etiketler,
 *   Sütunlara dönüştür) yalnız simge; Karşılaştır simgesi. Rehberin adıyla andığı ölçü düğmeleri yazılı kalır;
 * - 'dar': yalnız simgeli düğmeler (adları title ve erişilebilir adda), "Karşılaştır:" yazısı;
 * - 'en-dar': simgeli düğmeler, Karşılaştır simgesi ve dar (9rem) seçim kutusu.
 * Seçim kutusu en-dar dışında tam genişliktedir ("Sınıf (gruplara ayır)" kesilmez). 640 px altında düğmeler hep
 * simgeli, 480 px altında hep en-dar. Yazı genişlikleri `olc` ile (tarayıcıda tuvalle) ölçülür; ölçülemezse tahmin:
 * düğmede (12 px kalın) 6,3 px / harf, seçim kutusunda (13 px kalın) 6 px / harf (1366'da ölçülen değerler).
 */
export type SeritDuzeyi = 'tam' | 'orta' | 'kismi' | 'dar' | 'en-dar';

/** Yazı genişliği: seçenek düğmesi (12 px kalın), seçim kutusu (13 px kalın) ya da "Karşılaştır:" (13 px koyu); ölçülemezse null */
export type MetinOlcer = (metin: string, tur: 'dugme' | 'secim' | 'etiket') => number | null;

/** Etiketli seçenek düğmesinin yazı dışı payı: 2 × 10 px iç boşluk, 16 px simge, 6 px ara */
const SERIT_DUGME_PAYI = 42;
/** Seçim kutusunun yazı dışı payı: iç boşluklar, kenarlık ve açılır ok (1366'da ölçüldü: 162 px = 123 + 39) */
const SERIT_SECIM_PAYI = 39;
/** Tahminin yuvarlama payı: ölçülen içerik şeridi bu kadar px'le doldurmaz (son düğme kesilmesin) */
const SERIT_GUVENLIK = 4;

export function seritDuzeyiBul(genislik: number, dugmeler: string[], karsilastir: string | null, ikincil = 0, olc?: MetinOlcer): SeritDuzeyi {
  if (genislik <= 0) return 'tam';
  if (genislik < 480) return 'en-dar';
  const yazi = (m: string, tur: 'dugme' | 'secim' | 'etiket') => olc?.(m, tur) ?? m.length * (tur === 'dugme' ? 6.3 : tur === 'secim' ? 6 : 6.7);
  const sinir = genislik - SERIT_GUVENLIK;
  const bosluk = (dugmeler.length > 0 ? (dugmeler.length - 1) * 4 + 4 : 0) + 16;
  const etiketliDugme = (ad: string) => SERIT_DUGME_PAYI + yazi(ad, 'dugme');
  const etiketli = dugmeler.reduce((t, ad) => t + etiketliDugme(ad), 0);
  const ikincilSayisi = Math.max(0, Math.min(ikincil, dugmeler.length));
  const kismi = dugmeler.slice(0, dugmeler.length - ikincilSayisi).reduce((t, ad) => t + etiketliDugme(ad), 0) + ikincilSayisi * 44;
  const simgeli = dugmeler.length * 44;
  // Seçim kutusu + Karşılaştır bloğu ile düğme grubu arasındaki 12 px
  const secim = karsilastir === null ? 0 : SERIT_SECIM_PAYI + yazi(karsilastir, 'secim') + 12;
  const yaziBlogu = karsilastir === null ? 0 : yazi('Karşılaştır:', 'etiket') + 6;
  const simge = karsilastir === null ? 0 : 20 + 6;
  if (genislik >= DAR_SERIT) {
    if (etiketli + yaziBlogu + secim + bosluk <= sinir) return 'tam';
    if (etiketli + simge + secim + bosluk <= sinir) return 'orta';
    if (ikincilSayisi > 0 && kismi + simge + secim + bosluk <= sinir) return 'kismi';
  }
  return simgeli + yaziBlogu + secim + bosluk <= sinir ? 'dar' : 'en-dar';
}

/** Tuvalle yazı ölçümü (seçenek şeridi ve araç çubuğu düzeyleri); tuval yoksa (sunucu, testler) null */
let olcumTuvali: CanvasRenderingContext2D | null | undefined;
function yaziGenisligi(metin: string, font: string): number | null {
  if (typeof document === 'undefined') return null;
  if (olcumTuvali === undefined) {
    try {
      olcumTuvali = document.createElement('canvas').getContext('2d');
    } catch {
      olcumTuvali = null;
    }
  }
  if (!olcumTuvali) return null;
  olcumTuvali.font = font;
  return olcumTuvali.measureText(metin).width;
}

/**
 * Araç çubuğunun sağındaki dört düğmenin yazılı genişlikleri (13 px yarı kalın, 1366'da ölçüldü; simgeli 44 px) ve
 * kademeli daraltma: yer azaldıkça önce "Grafik ayarları", sonra "İndir", en son "Örnek veri" ile "Veri topla" simgeye
 * iner. Sonuç: yalnız simge olan düğme sayısı (0 – 4; sağdan sola).
 */
export const ARAC_DUGME_GENISLIKLERI = { ornek: 109, topla: 108, indir: 74, ayar: 133 } as const;

export function aracDuzeyiBul(kokGenislik: number, sekmelerGenislik: number): 0 | 1 | 2 | 4 {
  // Sekmeler ölçülmeden (sunucu çizimi, ilk kare) eski kural: 1000 px altında dört düğme de simge
  if (sekmelerGenislik <= 0) return kokGenislik < DAR_ARAC_CUBUGU ? 4 : 0;
  const { ornek, topla, indir, ayar } = ARAC_DUGME_GENISLIKLERI;
  // Çubuğun iç boşluğu (2 × 8) + sekmeler ile düğmeler arası (8) + düğmeler arası (3 × 8) + yuvarlama payı (4)
  const yer = kokGenislik - 16 - 8 - sekmelerGenislik - 24 - 4;
  if (ornek + topla + indir + ayar <= yer) return 0;
  if (ornek + topla + indir + 44 <= yer) return 1;
  if (ornek + topla + 44 + 44 <= yer) return 2;
  return 4;
}

type SecenekSimgesiAdi = 'ortalama' | 'ortanca' | 'oms' | 'etiketler' | 'sutunlar' | 'degerler' | 'dilimSatir' | 'dilimSiklik';

/**
 * Seçenek şeridi simgeleri: ortalama çizgisi, ortanca (ortadaki veri), sapma bandı, değer etiketi, sıklık sütunları,
 * çizgide değer etiketleri, dairede her satır bir dilim / değerlerin sıklığı
 */
function SecenekSimgesi({ ad }: { ad: SecenekSimgesiAdi }) {
  const ortak = { className: 'h-4 w-4 shrink-0', viewBox: '0 0 16 16', 'aria-hidden': true as const };
  switch (ad) {
    case 'ortanca':
      // Sıralı beş veri; ortadaki (üçüncü) veriden geçen kesikli çizgi
      return (
        <svg {...ortak}>
          <path d="M8 2v11.5" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.2 1.6" strokeLinecap="round" />
          <circle cx="2.6" cy="12" r="1.35" fill="currentColor" />
          <circle cx="5.3" cy="12" r="1.35" fill="currentColor" />
          <circle cx="8" cy="12" r="2" fill="currentColor" />
          <circle cx="10.7" cy="12" r="1.35" fill="currentColor" />
          <circle cx="13.4" cy="12" r="1.35" fill="currentColor" />
        </svg>
      );
    case 'degerler':
      return (
        <svg {...ortak}>
          <path d="M1.8 13 6 9.2l3.4 1.8L14.2 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="9.2" r="1.5" fill="currentColor" />
          <circle cx="14.2" cy="5" r="1.5" fill="currentColor" />
          <rect x="1.5" y="1.8" width="7.5" height="4.6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'dilimSatir':
      // Birçok dilim: her satır bir dilim
      return (
        <svg {...ortak}>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 8V1.8M8 8l5.4 3.1M8 8l-5.4 3.1M8 8l4-4.7M8 8 2.2 5.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'dilimSiklik':
      // Az ve büyük dilim: değerler gruplandı
      return (
        <svg {...ortak}>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 8V1.8A6.2 6.2 0 0 1 13.4 11.1z" fill="currentColor" />
          <path d="M8 8l5.4 3.1" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'ortalama':
      return (
        <svg {...ortak}>
          <path d="M2 13.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M8 2.5v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="4.2" cy="11" r="1.6" fill="currentColor" />
          <circle cx="11.8" cy="11" r="1.6" fill="currentColor" />
          <circle cx="5.6" cy="7.4" r="1.6" fill="currentColor" />
        </svg>
      );
    case 'oms':
      return (
        <svg {...ortak}>
          <rect x="3.5" y="2.5" width="9" height="11" rx="1.5" fill="currentColor" fillOpacity="0.28" />
          <path d="M3.5 2.5v11M12.5 2.5v11" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2 1.6" strokeLinecap="round" />
          <path d="M8 2.5v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'etiketler':
      return (
        <svg {...ortak}>
          <rect x="3" y="2" width="10" height="6" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6 5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M8 8v2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="12.5" r="1.9" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg {...ortak}>
          <rect x="2" y="8.5" width="3.2" height="5.5" rx="0.8" fill="currentColor" />
          <rect x="6.4" y="3" width="3.2" height="11" rx="0.8" fill="currentColor" />
          <rect x="10.8" y="6" width="3.2" height="8" rx="0.8" fill="currentColor" />
        </svg>
      );
  }
}

/** Araç çubuğu simgeleri (dar pencerede düğmeler yalnız simgeyle çizilir) */
function AracSimgesi({ ad, className = 'h-4 w-4' }: { ad: 'ornek' | 'indir' | 'ayar' | 'asagi'; className?: string }) {
  const ortak = { className: `${className} shrink-0`, viewBox: '0 0 20 20', 'aria-hidden': true as const, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (ad) {
    case 'ornek':
      // Hazır tablo: başlık satırı ve iki sütunlu satırlar
      return (
        <svg {...ortak}>
          <rect x="3" y="3.5" width="14" height="13" rx="2" />
          <path d="M3 7.5h14M3 11.5h14M8.5 7.5v9" />
        </svg>
      );
    case 'indir':
      return (
        <svg {...ortak}>
          <path d="M10 3.5v9M6.5 9 10 12.5 13.5 9M4 15.5h12" />
        </svg>
      );
    case 'ayar':
      return (
        <svg {...ortak} strokeWidth={1.5}>
          <path d="M10 6.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zm7.1 4.3l1.4 1.1-1.5 2.6-1.7-.6a6.6 6.6 0 0 1-1.6.9l-.3 1.8h-3l-.3-1.8a6.6 6.6 0 0 1-1.6-.9l-1.7.6-1.5-2.6 1.4-1.1a6.8 6.8 0 0 1 0-1.8l-1.4-1.1 1.5-2.6 1.7.6c.5-.4 1-.7 1.6-.9l.3-1.8h3l.3 1.8c.6.2 1.1.5 1.6.9l1.7-.6 1.5 2.6-1.4 1.1c.1.6.1 1.2 0 1.8z" strokeLinecap="butt" />
        </svg>
      );
    default:
      return (
        <svg {...ortak} viewBox="0 0 16 16" strokeWidth={1.8}>
          <path d="M4 6l4 4 4-4" />
        </svg>
      );
  }
}

export type YerlesimModu = 'iki-sutun' | 'dikey' | 'dikey-kaydir' | 'bantli';

/** Panel kapalıyken bu genişliğin altında tablo ve grafik alt alta dizilir */
export const DIKEY_ESIGI = 720;

/** Veri topla paneli açıkken bu genişliğin altında bölümler alt alta dizilir ve gövde kayar */
export const DIKEY_KAYDIR_ESIGI = 760;

/** Veri topla panelinin genişliği (1366'da ≈ 410 px, 1022'de 320 px, 1920'de 420 px) */
export const PANEL_GENISLIGI_CSS = 'clamp(320px, 30%, 420px)';

/**
 * Gövde yerleşimi (§0 sadeleştirme kararı): Veri topla paneli kapalıyken tablo | grafik (720 px altında alt alta).
 * Panel açıkken gövde İKİ sütundur: panel | grafik sütunu; tablo, grafik sütununun altında katlanabilir banttır
 * (`bantli`). 760 px altında panel, grafik ve tablo alt alta dizilir ve gövde kayar (`dikey-kaydir`).
 */
export function yerlesimModu(genislik: number, toplamaAcik: boolean): YerlesimModu {
  if (!toplamaAcik) return genislik < DIKEY_ESIGI ? 'dikey' : 'iki-sutun';
  return genislik < DIKEY_KAYDIR_ESIGI ? 'dikey-kaydir' : 'bantli';
}

/** Deney özeti tablosunun alt şerit notu (salt okunur küme) */
export const OZET_SALT_OKUNUR_NOTU = 'Deney özeti kendiliğinden hesaplanır; düzenlemek için Atışlar tablosunu kullanın.';

/** Tablo bandı gövde bu yükseklikten kısayken kayıtta açık olsa da kapalı başlar (grafik ezilmesin) */
export const BANT_ACIK_EN_AZ_GOVDE = 540;

/**
 * Alt alta karşılaştırma panelleri arasındaki 1 px'lik çizgi. Panelin kenarlığı değildir: kenarlık panelin içini 1 px
 * kısaltır, grafik küçük ölçekle çizilir ve ortak eksen panellerde kayar (korunan karar 7: ortak eksen piksel düzeyinde)
 */
function PanelAyraci() {
  return <div aria-hidden="true" className="h-px w-full shrink-0 bg-border" data-panel-ayraci="" />;
}

/**
 * Soru şeridi (grafik sütununun ipucu yuvasında; yalnız araştırma Tablom'a bağlı ve panel kapalıyken): "Araştırma
 * sorusu:" + soru (en çok 2 satır), sağda "6-A · 24 veri" ve gizleme düğmesi. Gizlenen şerit tablonun başlığındaki
 * düğmeyle yeniden açılır.
 */
function SoruSeridi({ soru, altBilgi, onKapat }: { soru: string; altBilgi: string; onKapat: () => void }) {
  return (
    <div
      role="note"
      aria-label="Araştırma sorusu"
      className="flex min-h-11 shrink-0 items-center gap-2 border-b border-border bg-accent/60 py-0.5 pl-3 pr-1 text-[13px] leading-5 text-foreground"
      data-soru-seridi=""
    >
      <VeriToplaSimgesi className="h-[18px] w-[18px] shrink-0 text-primary dark:text-[#9fe0d9]" />
      <p className="line-clamp-2 min-w-0 flex-1 py-1" title={soru}>
        <strong className="font-bold">Araştırma sorusu:</strong> {soru}
      </p>
      <span className="shrink-0 whitespace-nowrap text-[12px] font-semibold tabular-nums text-muted-foreground" data-soru-seridi-bilgi="">
        {altBilgi}
      </span>
      <button
        type="button"
        aria-label="Soru şeridini gizle"
        title="Soru şeridini gizle (tablonun başlığındaki düğmeyle yeniden açılır)"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onKapat}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Kullanıcının tablo düzenlemesi (`tabloDuzenle`). Tablom'a bağlı bir deney araştırmasında çalışmaların saklı sayıları
 * tablodan yeniden hesaplanır (toplama görünümünde satır silme, hücre düzeltme): sayaç, özet ve geri alma tutarlı kalır.
 */
export function arastirmaliDuzenle(d: Durum, yeni: VeriTablosu): Durum {
  const y = tabloDuzenle(d, yeni);
  const a = y.arastirma;
  if (!a || a.yontem !== 'deney' || y.tablo === d.tablo || !arastirmaBagli(y.tablo, a)) return y;
  const g = calismalariTablodanGuncelle(y.tablo, a);
  return g === a ? y : { ...y, arastirma: g };
}

/**
 * Panelin tablo işlemi (seçenek dışı yazımı birleştir, seçeneği yeniden adlandır): Tablom'a yazılır (Deney özeti açık
 * olsa da; özet Tablom'dan yeniden hesaplanır); `arastirma` verilirse plan da aynı güncellemede değişir.
 */
export function tabloIslemiUygula(d: Durum, yeni: VeriTablosu, arastirma?: Arastirma): Durum {
  const y = d.etkinKume === 'tablom' ? arastirmaliDuzenle(d, yeni) : { ...d, tablo: yeni, ornekTemiz: false };
  return arastirma ? arastirmaYaz(y, arastirma) : y;
}

export interface VeriGrafikUygulamasiProps {
  pencereGenisligi?: number;
  pencereYuksekligi?: number;
}

export default function VeriGrafikUygulamasi({ pencereGenisligi }: VeriGrafikUygulamasiProps) {
  // Uygulama yalnız istemcide (tembel) yüklenir: kayıt ilk çizimden önce okunur, varsayılan tablo bir kare bile görünmez
  const [durum, setDurumHam] = useState<Durum>(ilkDurum);
  /**
   * Bütün durum değişimleri buradan geçer: eksen her zaman geçerli bir değişkende kalır (eksenDuzelt) ve seçili
   * grafik sekmesi tablonun veri türleriyle çizilebilir kalır (sekmeDuzelt; ör. Saçılım → Nokta)
   */
  const setDurum = useCallback((yeni: React.SetStateAction<Durum>) => {
    setDurumHam((d) => sekmeDuzelt(eksenDuzelt(typeof yeni === 'function' ? yeni(d) : yeni)));
  }, []);
  /**
   * Son çizilen durum: panelin tek seferlik işlemleri (plan uygulama, kapatma, tablo işlemi, deney silme) işlemden
   * önceki durumu [Geri al] için saklar ve sonucu doğrudan yazar
   */
  const durumRef = useRef(durum);
  durumRef.current = durum;
  const [seciliSatir, setSeciliSatir] = useState<number | null>(null);
  const ornekMenu = useAcilirMenu();
  const indirMenu = useAcilirMenu();
  const ayarMenu = useAcilirMenu();
  // Örnek menüsü açılınca yüklü örnek odaklanır (galeride yeri görünür; oklarla komşularına geçilir); yoksa ilk öğe
  useEffect(() => {
    if (!ornekMenu.acik) return;
    ornekMenu.menuRef.current?.querySelector<HTMLElement>('[role="menuitem"][aria-current="true"]')?.focus();
  }, [ornekMenu.acik, ornekMenu.menuRef]);
  const [akis, setAkis] = useState(false);
  /** Kısa bildirim (tost); eylemlisi [Geri al] taşır */
  const [tost, setTost] = useState<TostVerisi | null>(null);
  const tostSayaci = useRef(0);
  /** Geri al tostunun ait olduğu tablo: tablo bundan sonra başka bir yoldan değişirse Geri al kalkar */
  const geriAlTablosu = useRef<VeriTablosu | null>(null);
  const grafikRef = useRef<HTMLDivElement>(null);
  const kokRef = useRef<HTMLDivElement>(null);
  const grafikBoyut = useBoyut(grafikRef);
  const kokBoyut = useBoyut(kokRef);
  /** Grafik sütunu: Keşif kartının en büyük yüksekliği bu sütunun yüksekliğinin %34'ü */
  const anaRef = useRef<HTMLElement>(null);
  const anaBoyut = useBoyut(anaRef);
  /** Grafik türü sekmeleri: araç çubuğundaki düğmelerin kaç tanesinin yazılı kalacağı kalan yere göre seçilir */
  const sekmelerRef = useRef<HTMLDivElement>(null);
  const sekmelerBoyut = useBoyut(sekmelerRef);
  const azaltilmisHareket = useAzaltilmisHareket();

  /**
   * Tost tablo alanının altında, tablonun alt şeridinin (+ Sütun, Temizle) hemen üstünde durur: grafiğin eksen
   * yazılarını, seçenek şeridini ve tablo düğmelerini örtmez. Şeridin yüksekliği (darda iki satır olabilir) ölçülür.
   */
  const tabloKapRef = useRef<HTMLDivElement>(null);
  const [tostAlti, setTostAlti] = useState(TOST_ALT_PAYI + 61);
  /** Kapalı tablo bandında tostun sağ payı: hap "Tabloyu göster" düğmesinin solunda, sağa yaslı durur (özet açıkta) */
  const [tostSag, setTostSag] = useState(0);
  // Yerleşim ölçümü boyamadan önce (hap yanlış yerde bir kare bile görünmez). Durum yalnız değer değişince yazılır:
  // her çizimde koşulsuz güncelleme, hızlı dokunuşlarda React'in iç içe güncelleme sayacını boşuna doldurur
  useIzomorfikYerlesimEtkisi(() => {
    const kap = tabloKapRef.current;
    let alt: number;
    let sag = 0;
    if (kap?.hasAttribute('data-tablo-bandi-kabi')) {
      const kapali = kap.querySelector<HTMLElement>('[data-tablo-bandi="kapali"]');
      if (kapali) {
        // Kapalı bant: hap özetin ("Tablo · 24 satır · son: Elma") sağındaki boşluğa sığıyorsa bandın içinde, "Tabloyu
        // göster"in solunda durur; sığmıyorsa (dar grafik sütunu, uzun bildirim) bandın hemen üstünde: özeti örtmez
        const dugme = kapali.querySelector<HTMLElement>('[data-bant-dugmesi]');
        const ozet = kapali.querySelector<HTMLElement>('[data-bant-ozeti]');
        const hap = kap.querySelector<HTMLElement>('[data-tost]');
        const dugmePayi = dugme ? dugme.offsetWidth + 8 : 0;
        const bosluk = kap.offsetWidth - dugmePayi - (ozet ? ozet.offsetWidth + 12 : 0) - 12;
        // Eylemli hap (44 px düğmeli, 52 px) bandı 8 px aşabilir; iki satıra kırılan hap sığmaz
        const sigar = !hap || (hap.offsetWidth <= bosluk && hap.offsetHeight <= kapali.offsetHeight + 12);
        alt = sigar ? Math.max(0, Math.round((kapali.offsetHeight - (hap?.offsetHeight ?? 44)) / 2)) : kap.offsetHeight + 8;
        sag = sigar ? dugmePayi : 0;
      } else {
        // Açık bant: tost bandın başlık satırının üstüne biner (48 px'lik hap)
        alt = Math.max(0, kap.offsetHeight - 48);
      }
    } else {
      const serit = kap?.querySelector<HTMLElement>('[data-tablo-alt-serit]');
      alt = (serit ? serit.offsetHeight : 0) + TOST_ALT_PAYI;
    }
    if (alt !== tostAlti) setTostAlti(alt);
    if (sag !== tostSag) setTostSag(sag);
  });

  // Kalıcılık: değişimden 300 ms sonra yazılır; akış (canlı deney) sürerken yazılmaz, bitince bir kez yazılır;
  // sayfa kapanırken / gizlenirken ve pencere kapanırken bekleyen kayıt hemen yazılır
  const bekleyenKayit = useRef<Durum | null>(null);
  const kaydet = useCallback(() => {
    const d = bekleyenKayit.current;
    if (!d) return;
    bekleyenKayit.current = null;
    try {
      window.localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(d));
    } catch {
      /* depolama kapalı ya da dolu olabilir */
    }
  }, []);
  useEffect(() => {
    bekleyenKayit.current = durum;
    if (akis) return;
    const t = window.setTimeout(kaydet, KAYIT_GECIKMESI);
    return () => window.clearTimeout(t);
  }, [durum, akis, kaydet]);
  useEffect(() => {
    const gizlenince = () => {
      if (document.visibilityState === 'hidden') kaydet();
    };
    window.addEventListener('pagehide', kaydet);
    document.addEventListener('visibilitychange', gizlenince);
    return () => {
      window.removeEventListener('pagehide', kaydet);
      document.removeEventListener('visibilitychange', gizlenince);
      kaydet();
    };
  }, [kaydet]);

  const tostGoster = useCallback((metin: string, eylem?: TostEylemi) => {
    tostSayaci.current += 1;
    if (!eylem) geriAlTablosu.current = null;
    setTost({ kimlik: tostSayaci.current, metin, eylem });
  }, []);
  const tostKapat = useCallback((kimlik: number) => setTost((t) => (t && t.kimlik === kimlik ? null : t)), []);

  const { sekme, secenekler, sutunModu, yuvarlamaAdimi, adimlariGoster, etkinKume } = durum;
  const tablo = etkinTablo(durum);

  /**
   * Tablom'un bağlı olduğu örnek (Tablom etkinken): Keşif kartı, örneğin kategori sırası ve çizgi grafiğinde yüzde
   * ayarı buradan gelir. Sütun eşlemeleri örneğin sütun adlarından Tablom'un bugünkü sütun kimliklerine çevrilir.
   */
  const ornek = etkinKume === 'tablom' ? bagliOrnek(durum) : undefined;
  const ornekAcilisi = useMemo(() => (ornek ? acilisYamasi(ornek, durum.tablo, OZELLIKLER) : null), [ornek, durum.tablo]);
  const ipucuDegistir = useCallback((ipucu: IpucuDurumu) => setDurum((d) => (d.ipucu === ipucu ? d : { ...d, ipucu })), [setDurum]);
  /** Her örnek yüklemesi Keşif kartını baştan açar (aynı örnek yeniden yüklense de 1. adım): kartın anahtarına girer */
  const [ornekYuklemeNo, setOrnekYuklemeNo] = useState(0);

  // Seçili satır kümeye aittir: etkin küme değişince (küme seçici, örnek yükleme, panel) seçim kalkar
  const [seciliKume, setSeciliKume] = useState(etkinKume);
  if (seciliKume !== etkinKume) {
    setSeciliKume(etkinKume);
    setSeciliSatir(null);
  }

  // Geri al yalnız hemen sonrası içindir: tablo başka bir yoldan değişince tosttaki Geri al kalkar
  useEffect(() => {
    if (tost?.eylem && geriAlTablosu.current && tablo !== geriAlTablosu.current) {
      geriAlTablosu.current = null;
      setTost(null);
    }
  }, [tablo, tost]);

  /**
   * Tabloyu değiştiren bir işlemden sonra [Geri al] tostu: Geri al işlemden önceki bütün durumu (örnek bağı ve
   * Keşif kartı dahil) geri getirir. `yeniTablo`, işlemden sonra etkin kümede görünecek tablodur. `ad` eylemin adıdır:
   * Veri topla paneli açıkken panelin alt çubuğunda kendi "Geri al"ı (son cevabı siler) durduğu için tost eylemi
   * işini söyler ("Önceki tabloya dön", "Deneyi geri getir"); aynı ekranda iki farklı "Geri al" olmaz.
   */
  const geriAlTostu = (metin: string, onceki: Durum, yeniTablo: VeriTablosu, ad = 'Geri al') => {
    tostGoster(metin, {
      ad,
      calistir: () => {
        geriAlTablosu.current = null;
        setDurum(onceki);
        setSeciliSatir(null);
        tostGoster('Geri alındı.');
      },
    });
    geriAlTablosu.current = yeniTablo;
  };

  /**
   * Veri toplamanın grafik ve tabloya etkisi (bağlı araştırma, eksen alanı, boş iletiler, kategori sıraları, soru
   * şeridi, deney verisi); bağ yoksa hepsi boş.
   */
  const toplama = useMemo(() => toplamaGorunumBilgisi(durum), [durum]);
  /** Veri topla paneli açık mı */
  const panelAcik = durum.toplamaAcik;
  /** Panelin son eklediği satırın kimliği: tabloda 600 ms parlar, nokta grafiğinde halka alır (Anında akışta null) */
  const [yeniSatir, setYeniSatir] = useState<string | null>(null);
  /**
   * Parlama ve halka ertelenmiş değerle çizilir: dokunuşun kendi (eşzamanlı) çiziminde yalnız tablo ve grafik değişir;
   * parlamayı / halkayı başlatan etkiler ayrı, ertelenmiş çizimde çalışır. Böylece çok hızlı dokunuşlarda (saniyede
   * 20'den çok, basılı tutulan tuş) her dokunuşun işlemesi sırasında durum yazan etki kalmaz ve React geliştirme
   * kipinde "Maximum update depth exceeded" vermez; art arda dokunuşta halka son satırda bir kez yanar.
   */
  const ertelenenYeniSatir = useDeferredValue(yeniSatir);

  const guncelle = useCallback(
    (kismi: Partial<Durum> | ((d: Durum) => Partial<Durum>)) => {
      setDurum((d) => ({ ...d, ...(typeof kismi === 'function' ? kismi(d) : kismi) }));
    },
    [setDurum],
  );
  /**
   * Tablodan gelen düzenleme. `bilgi` verilirse (sütun / satır silme gibi) işlem [Geri al]'lı tostla bildirilir.
   * Tablom değişince örnek artık "değiştirilmemiş" sayılmaz (sonraki örnek yüklemesinde önceki tablo olarak saklanır).
   */
  const tabloyuYaz = (yeni: VeriTablosu, bilgi?: { geriAlMetni: string }) => {
    const onceki = durum;
    setDurum((d) => arastirmaliDuzenle(d, yeni));
    if (bilgi) geriAlTostu(bilgi.geriAlMetni, onceki, yeni);
  };

  const kumeSec = useCallback(
    (kume: KumeId) => {
      // Deney özeti ilk kez seçilince özetin kendi görünümüyle açılır (Çizgi: göreli sıklık ve kesikli teorik
      // olasılık); sonra kullanıcının orada bıraktığı görünüm geri gelir
      setDurum((d) => (d.etkinKume === kume ? d : kume === 'ozet' && !d.gorunumler.ozet ? ozeteGec(d) : kumeDegistir(d, kume)));
      setSeciliSatir(null);
    },
    [setDurum],
  );

  // ── Değişkenler ──
  const degiskenler = useMemo(() => degiskenSutunlari(tablo), [tablo]);
  const noktaSutun = sutunIndeksi(tablo, durum.degisken);
  const ikinciSutun = sutunIndeksi(tablo, durum.ikinciDegisken);
  const degiskenGecerli = noktaSutun >= 0 && degiskenler.some((s) => s.id === durum.degisken);
  const kategorikSecili = degiskenGecerli && tablo.sutunlar[noktaSutun].tur === 'etiket';
  /** Bütün grafiklerin değişkeni: eksendeki değişken (eksenDuzelt sayesinde tabloda değişken varsa hep atanmış) */
  const etkinSutun = degiskenGecerli ? noktaSutun : -1;
  const etkinSutunId = etkinSutun >= 0 ? tablo.sutunlar[etkinSutun].id : null;
  const etkinKategorik = etkinSutun >= 0 && tablo.sutunlar[etkinSutun].tur === 'etiket';
  const sayisalDegiskenler = useMemo(() => degiskenler.filter((s) => s.tur === 'sayi'), [degiskenler]);
  /** Sekme kapısının sayımı: sekmeDuzelt ile aynı işlev */
  const sayisalSayisi = useMemo(() => sayisalDegiskenSayisi(tablo), [tablo]);
  const kategorikDegiskenler = useMemo(() => degiskenler.filter((s) => s.tur === 'etiket'), [degiskenler]);
  /** Çizgi ve saçılım yalnız sayısal değişkenle çizilir: sekmelerde yalnız sayısallar, seçili değişken kategorikse ilk sayısal */
  const yalnizSayisal = sekme === 'cizgi' || sekme === 'sacilim';
  const sekmeDegiskenleri = yalnizSayisal ? sayisalDegiskenler : degiskenler;
  const sacilim = useMemo(
    () => sacilimEksenleri({ degisken: durum.degisken, yDegisken: durum.yDegisken, renkDegisken: durum.renkDegisken }, tablo),
    [durum.degisken, durum.yDegisken, durum.renkDegisken, tablo],
  );
  /** Grafiğin gösterdiği (sekmesi seçili) değişken */
  const grafikSutunId =
    sekme === 'sacilim'
      ? sacilim?.x ?? null
      : yalnizSayisal
        ? sayisalDegiskenler.some((s) => s.id === etkinSutunId)
          ? etkinSutunId
          : sayisalDegiskenler[0]?.id ?? null
        : etkinSutunId;
  const grafikSutun = sutunIndeksi(tablo, grafikSutunId);
  /**
   * Karşılaştırma ("Karşılaştır" listesi): nokta grafiğinde aynı birimli ikinci sayısal değişken (alt alta iki panel) ya
   * da kategorik değişkene göre gruplar (her grup bir panel); çizgi ve istatistikte aynı birimli ikinci sayısal değişken.
   * Seçili ikinci değişken bu grafikte geçerli değilse (başka birim, 4'ten çok grup …) karşılaştırma yoktur.
   */
  const karsilastirmaAnasi = sekme === 'cizgi' ? grafikSutunId : etkinSutunId;
  const karsAdaylari = useMemo(() => karsilastirmaAdaylari(tablo, karsilastirmaAnasi, sekme), [tablo, karsilastirmaAnasi, sekme]);
  const karsTuru = karsAdaylari.find((a) => a.id === durum.ikinciDegisken && a.neden === null)?.tur ?? null;
  /** İkinci sayısal değişken karşılaştırılıyor (iki panel, iki seri, iki sütunlu istatistik) */
  const ikinciSayisal = karsTuru === 'sayi' && ikinciSutun >= 0;

  /**
   * Kategorik sütunda kutucuk sırası: Tablom bir araştırmaya bağlıysa araştırmanın sırası (anket seçenekleri, gruplar,
   * deney sonuçları); bir örneğe bağlıysa örneğin sırası (ör. adaylar oy pusulasındaki sırayla); değilse alfabetik.
   * Bütün grafikler, istatistik ve renk anahtarı bunu kullanır.
   */
  // Araştırmanın kategori sıraları her durum değişiminde yeniden kurulur; içerik değişmedikçe aynı nesne kullanılır
  // (grafiklerin sıraya bağlı hesapları her dokunuşta boşa dönmesin)
  const toplamaSiraAnahtari = useMemo(() => JSON.stringify([...toplama.kategoriSiralari]), [toplama.kategoriSiralari]);
  const toplamaSiralari = useMemo(() => new Map<string, string[]>(JSON.parse(toplamaSiraAnahtari) as [string, string[]][]), [toplamaSiraAnahtari]);
  const kategoriSiralari = useMemo(() => {
    const m = new Map<string, string[]>();
    if (toplamaSiralari.size > 0) {
      // Bağlı araştırma: anket seçenek sırası, grup sırası, deney sonuç sırası (boş kategoriler de eksende)
      for (const [id, sira] of toplamaSiralari) m.set(id, sira);
    } else if (ornekAcilisi) {
      for (const [id, sira] of Object.entries(ornekAcilisi.kategoriSiralari)) m.set(id, sira);
    }
    return m;
  }, [ornekAcilisi, toplamaSiralari]);
  const siraBul = (sutun: number) => (sutun >= 0 ? kategoriSiralari.get(tablo.sutunlar[sutun]?.id ?? '') : undefined);
  /** Renk anahtarı: noktaları, sütunları ve tablo satırlarını renklendiren kategorik değişkenin eşlemesi */
  const renkId = renkAnahtari({ renkDegisken: durum.renkDegisken }, tablo);
  const renkEslemi = useMemo(
    () => (renkId ? renkEslemesi(tablo, sutunIndeksi(tablo, renkId), kategoriSiralari.get(renkId)) : null),
    [renkId, tablo, kategoriSiralari],
  );

  const noktaDegerler = useMemo(
    () => (degiskenGecerli && !kategorikSecili ? gecerliDegerler(tablo, noktaSutun).map((n) => n.deger) : []),
    [tablo, noktaSutun, degiskenGecerli, kategorikSecili],
  );
  const ikinciDegerler = useMemo(
    () => (ikinciSayisal ? gecerliDegerler(tablo, ikinciSutun).map((n) => n.deger) : []),
    [tablo, ikinciSutun, ikinciSayisal],
  );
  const tumNoktaDegerler = useMemo(() => [...noktaDegerler, ...ikinciDegerler], [noktaDegerler, ikinciDegerler]);
  const otomatikAralik = useMemo(() => varsayilanAralik(tumNoktaDegerler), [tumNoktaDegerler]);
  const aralik = durum.aralik ?? otomatikAralik;
  const aralikSecenekler = useMemo(() => {
    const s = aralikSecenekleri(tumNoktaDegerler);
    return s.includes(aralik) ? s : [...s, aralik].sort((a, b) => a - b);
  }, [tumNoktaDegerler, aralik]);
  /** Değerler gruplanıyor mu (gruplama yoksa her nokta tam değerinde durur) */
  const gruplu = useMemo(() => tumNoktaDegerler.length > 0 && gruplamaVar(tumNoktaDegerler, aralik), [tumNoktaDegerler, aralik]);
  /** Grafik ayarları menüsündeki bölümler: gruplama (nokta, sayısal değişken), sürükleme yuvarlaması (sütun / çizgi) */
  const gruplamaAyari = sekme === 'nokta' && degiskenGecerli && !kategorikSecili && aralikSecenekler.length > 1;

  /**
   * Daire, sayısal değişken: her satır bir dilim, değerlerin sıklığı (türetilmiş kategorik tablo, sürükleme kapalı) ya da
   * bilgi kutusu ("uygun değil"; yalnız örnekten). Önce kullanıcı seçimi, yoksa bağlı örnek, yoksa veri karar verir.
   */
  const daireSayisal = sekme === 'daire' && etkinSutun >= 0 && !etkinKategorik;
  const daireModuEtkin = daireSayisal ? daireGorunumu(durum.daireModu, ornekAcilisi?.daireModu, noktaDegerler) : null;
  const daireSiklik = useMemo(
    () => (daireModuEtkin === 'siklik' ? degerSikligiTablosu(tablo, etkinSutun) : null),
    [daireModuEtkin, tablo, etkinSutun],
  );
  /** Sütun, sayısal değişken: 40'tan çok veri ve en çok 30 farklı değer → her satır yerine değerlerin sıklığı */
  const sutunSiklik = useMemo(
    () => (sekme === 'sutun' && etkinSutun >= 0 && !etkinKategorik && sutundaSiklikGerekli(noktaDegerler) ? degerSikligiTablosu(tablo, etkinSutun) : null),
    [sekme, etkinSutun, etkinKategorik, noktaDegerler, tablo],
  );
  /** Sürükleme yuvarlaması: sütun, çizgi ve dilimleri sürüklenebilen daire (her satır bir dilim) */
  const yuvarlamaAyari =
    (sekme === 'sutun' && degiskenGecerli && !etkinKategorik && sutunSiklik === null) ||
    (sekme === 'cizgi' && grafikSutun >= 0) ||
    (daireSayisal && daireModuEtkin === 'satir');

  const ornekYukle = (id: string) => {
    // Örnek veri kendi tablonuza yüklenir (ornegiYukle → tabloDegistir): korunmaya değer eski tablo "Önceki tabloya
    // dön" için saklanır; örneğin açılış görünümü uygulanır (sekme, eksen, karşılaştırma, renk anahtarı; ölçüler
    // kapalı: öğrenci önce tahmin eder) ve Keşif kartı rehberin ilk adımıyla açılır
    ornekMenu.kapat(true);
    const onceki = durum;
    // Veri topla paneli kapanır (bağ kopar, plan silinmez: başlangıçta "Son araştırma" olarak durur)
    const y = ornegiYukle({ ...durum, toplamaAcik: false }, id);
    if (!y) return;
    setYeniSatir(null);
    setDurum(y.durum);
    setSeciliSatir(null);
    setOrnekYuklemeNo((n) => n + 1);
    const saklandi = y.durum.oncekiTablo !== onceki.oncekiTablo;
    geriAlTostu(`Örnek yüklendi: ${y.durum.tabloAdi ?? id}.${saklandi ? ' Önceki tablo saklandı.' : ''}`, onceki, y.durum.tablo);
  };

  /**
   * "Önceki tabloya dön": Tablom ile önceki tablo yer değiştirir (görünümüyle); [Geri al] ile ya da yeniden seçilerek
   * geri gelir. Geri gelen tablo bir örneğe bağlıysa Keşif şeridi de gelir.
   */
  const oncekiyeDon = () => {
    const o = durum.oncekiTablo;
    ornekMenu.kapat(true);
    if (!o) return;
    const onceki = durum;
    const y = oncekiTabloyaDon({ ...durum, toplamaAcik: false });
    setYeniSatir(null);
    // Geri gelen tablo bir örneğe ya da araştırmaya bağlıysa ipucu yuvası (Keşif şeridi / soru şeridi) açılır
    setDurum((bagliOrnek(y) || arastirmaBagli(y.tablo, y.arastirma)) && y.ipucu === 'kapali' ? { ...y, ipucu: 'serit' } : y);
    setSeciliSatir(null);
    geriAlTostu(`Önceki tablo geri geldi: ${o.ad}.`, onceki, o.tablo);
  };

  /**
   * Temizle: satırları siler; sütunlar ve eksen seçimi kalır (yeni veri aynı eksene dizilir). Tablom'da örnekle bağ
   * kopar. [Geri al] ile hepsi geri gelir.
   */
  const temizle = () => {
    const onceki = durum;
    const eski = etkinTablo(durum);
    const yeni = tabloyuTemizle(durum);
    setDurum(yeni);
    setSeciliSatir(null);
    if (eski.satirlar.length > 0) geriAlTostu(`${eski.satirlar.length} satır silindi.`, onceki, etkinTablo(yeni));
  };

  /**
   * Keşif kartındaki rehber düğmesi: görünüm (sekme, seçenek, gruplama) ya da tablo değişir; aydınlatılacak satır
   * seçilir (tablo ona kayar). Tablo değiştiyse bildirim [Geri al]'lıdır; örnekle bağ ve "değiştirilmemiş" korunur.
   */
  const rehberEylemi = (eylem: RehberEylemi) => {
    const onceki = durum;
    const { durum: yeni, yama } = rehberEylemiUygula(durum, eylem);
    if (yeni !== onceki) setDurum(yeni);
    if (yama.vurguSatir !== undefined) setSeciliSatir(yama.vurguSatir);
    if (yama.tablo && yama.tost) geriAlTostu(yama.tost, onceki, etkinTablo(yeni));
    else if (yama.tost) tostGoster(yama.tost);
    // İstatistik'i açan adım (ör. "Sınıf'a göre sıklık tablosuna bak"): cevabın durduğu gruplara göre tablo görünür alana gelir
    if (eylem.tur === 'sekme' && eylem.sekme === 'istatistik') setIstatistikOdagi((n) => n + 1);
  };

  /**
   * Rehberin İstatistik adımı: renk anahtarına göre tablo (kategorikte "‹Anahtar›'a göre sıklık tablosu", sayısalda
   * "Gruplara göre") varsa grafik alanının kaydırma kabı onu başa getirecek kadar kayar ve bölüm kısa bir halkayla
   * belirir (azaltılmış harekette kaydırma anında, halka yok). Adımın sorusu bu tabloyu soruyor; kart açıkken tablo
   * ilk görünen alanın çok altında kalıyordu.
   */
  const [istatistikOdagi, setIstatistikOdagi] = useState(0);
  useEffect(() => {
    if (istatistikOdagi === 0) return;
    const alan = grafikRef.current;
    const hedef = alan?.querySelector<HTMLElement>('[data-capraz-tablo], [data-grup-istatistikleri]');
    if (!alan || !hedef) return;
    let kap: HTMLElement | null = hedef.parentElement;
    while (kap && kap !== alan) {
      const tasma = getComputedStyle(kap).overflowY;
      if ((tasma === 'auto' || tasma === 'scroll') && kap.scrollHeight > kap.clientHeight + 1) break;
      kap = kap.parentElement;
    }
    if (kap && kap.scrollHeight > kap.clientHeight + 1) {
      // Konum offset zinciriyle (pencere açılış animasyonunun ölçeğinden etkilenmez)
      const ust = (e: HTMLElement) => {
        let y = 0;
        for (let x: HTMLElement | null = e; x; x = x.offsetParent as HTMLElement | null) y += x.offsetTop;
        return y;
      };
      kap.scrollTo({ top: Math.max(0, ust(hedef) - ust(kap) - 8), behavior: azaltilmisHareket ? 'auto' : 'smooth' });
    }
    if (!azaltilmisHareket && typeof hedef.animate === 'function') {
      const renk = getComputedStyle(hedef).getPropertyValue('--primary').trim() || '175 58% 30%';
      hedef.animate([{ boxShadow: `0 0 0 3px hsl(${renk} / 0.6)` }, { boxShadow: `0 0 0 3px hsl(${renk} / 0)` }], { duration: 1600, easing: 'ease-out', delay: 250 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [istatistikOdagi]);

  // ── Veri topla paneli (VT §10.6, plan §5.2) ──
  /** Kapatılırken ya da tablo geri gelince soru şeridi / Keşif şeridi görünür (ipucu yuvası) */
  const ipucuAc = (y: Durum): Durum =>
    y.ipucu === 'kapali' && (arastirmaBagli(y.tablo, y.arastirma) || bagliOrnek(y)) ? { ...y, ipucu: 'serit' } : y;

  /** Paneli açar (Tablom ve grafik değişmez) */
  const toplamaPaneliAc = () => setDurum(toplamaAc);

  /**
   * Paneli kapatır (Bitti, ×, araç çubuğundaki basılı "Veri topla"): veri toplandıysa tablo ve soru şeridi kalır;
   * toplanmadıysa önceki tablo görünümüyle geri gelir ("Veri toplanmadı; önceki tablo geri geldi.")
   */
  const toplamaPaneliKapat = () => {
    const { durum: y, tost: metin } = toplamaKapat(durumRef.current);
    setDurum(ipucuAc(y));
    setYeniSatir(null);
    setAkis(false);
    if (metin) tostGoster(metin);
  };

  /** Hazır soru ya da "Toplamaya başla": yeni tablo [Geri al]'lı tostla; plan sorunu (tablo değişmedi) düz tostla */
  const planiUygulaVeBildir = (a: Arastirma) => {
    const d0 = durumRef.current;
    const r = planiUygula(d0, a);
    if (r.durum === d0) {
      if (r.tost) tostGoster(r.tost);
      return;
    }
    setDurum(r.durum);
    setSeciliSatir(null);
    setYeniSatir(null);
    // Panelin alt çubuğundaki "Geri al" son cevabı siler; tosttaki eylem yeni tablodan önceki tabloya döner
    if (r.tost) geriAlTostu(r.tost, r.onceki, etkinTablo(r.durum), r.durum.toplamaAcik ? 'Önceki tabloya dön' : 'Geri al');
  };

  /** "Son deneyi geri al": silmeden önceki durum, hemen ardından gelen bildirimin [Geri al]'ı içindir */
  const bekleyenDeneySilme = useRef<{ onceki: Durum; tablo: VeriTablosu } | null>(null);

  /**
   * Panelin verisi (dokunuş, ölçüm, atış parçası, geri alma). Akış hızlı olabileceği için işlevsel güncellemeyle yazılır;
   * yalnız deney silme (tek seferlik, akış dururken) önceki durumu saklayıp sonucu doğrudan yazar.
   */
  const toplamaVerisi = (v: ToplamaVerisi) => {
    if (v.calismaSil !== undefined) {
      const d0 = durumRef.current;
      const y = sekmeDuzelt(eksenDuzelt(toplamaVerisiYaz(d0, v)));
      bekleyenDeneySilme.current = y === d0 ? null : { onceki: d0, tablo: etkinTablo(y) };
      setDurum(y);
      return;
    }
    setDurum((d) => toplamaVerisiYaz(d, v));
  };

  /** Panel bildirimi: deney silmenin ardından gelirse [Geri al]'lı (VT §12.11), öteki bildirimler düz tost */
  const toplamaBildirimi = (metin: string) => {
    const s = bekleyenDeneySilme.current;
    bekleyenDeneySilme.current = null;
    // Silinen deney tostun eylemiyle geri gelir (paneldeki "Geri al" ile karışmasın)
    if (s) geriAlTostu(metin, s.onceki, s.tablo, 'Deneyi geri getir');
    else tostGoster(metin);
  };

  /** Birleştir / yeniden adlandır: tablo (ve plan) tek güncellemede, [Geri al] ikisini birden geri alır */
  const toplamaTabloIslemi = (yeni: VeriTablosu, metin: string, arastirma?: Arastirma) => {
    const d0 = durumRef.current;
    const y = sekmeDuzelt(eksenDuzelt(tabloIslemiUygula(d0, yeni, arastirma)));
    setDurum(y);
    // Panel açık: alt çubuğun "Geri al"ı son cevabı siler; tostun eylemi bu değişikliği geri alır
    geriAlTostu(metin, d0, etkinTablo(y), 'Değişikliği geri al');
  };

  /** Panelin grafik önerisi: çizilemeyen sekmede nedeni söylenir */
  const toplamaSekmesi = (s: Sekme) => {
    if (sekmeKullanilabilir(s, sayisalDegiskenSayisi(etkinTablo(durumRef.current)))) guncelle({ sekme: s });
    else tostGoster(sekmeGerekceleri[s] ?? 'Bu grafik tablodaki verilerle çizilemiyor.');
  };

  const kumeAdi = KUMELER.find((k) => k.id === etkinKume)?.ad ?? 'Tablom';
  /** İndirilen dosyaların ve PNG bandının tablo adı: Tablom'da örnek adı (kendi tablonuzda ilk değişken), özette küme adı */
  const tabloAdi = etkinKume === 'tablom' ? tabloAdiBul(durum) : kumeAdi;

  const csvIndir = () => {
    const metin = '﻿' + csvUret(tablo);
    // Bağlı araştırmanın Tablom'u sorudan adlanır ("veri-grafik-sinifimizda-en-cok-sevilen-meyve.csv")
    const ad = toplama.bagli && etkinKume === 'tablom' && durum.arastirma ? csvAdi(durum.arastirma) : `veri-grafik-${dosyaAdiTemizle(tabloAdi)}.csv`;
    dosyaIndir(new Blob([metin], { type: 'text/csv;charset=utf-8' }), ad);
    tostGoster('CSV indirildi');
  };

  /**
   * PNG: grafik alanındaki bütün grafikler (karşılaştırma ve grup panelleri alt alta) başlık bandıyla. Bant: araştırma
   * sorusu ya da bağlı örneğin sorusu (yoksa değişkenin adı) ve "‹tablo adı› · 24 veri".
   */
  const pngIndir = async () => {
    const svgler = Array.from(grafikRef.current?.querySelectorAll<SVGSVGElement>('svg[data-grafik]') ?? []);
    if (svgler.length === 0) {
      tostGoster('Bu sekmede indirilecek grafik yok');
      return;
    }
    try {
      const ad = `${svgler[0].dataset.grafik}-grafigi-${dosyaAdiTemizle(tabloAdi)}.png`;
      const bant = pngBandi({
        arastirmaSorusu: toplama.soruSeridi?.soru ?? null,
        kimden: durum.arastirma?.kimden ?? null,
        ornekSorusu: ornek?.hikaye.arastirmaSorusu ?? null,
        degiskenAdi: grafikSutun >= 0 ? tablo.sutunlar[grafikSutun].ad : null,
        tabloAdi,
        veriSayisi: grafikVeriSayisi,
      });
      await svgPngIndir(svgler, ad, bant);
      tostGoster('PNG indirildi');
    } catch {
      tostGoster('PNG üretilemedi');
    }
  };

  const degerDegis = useCallback((satir: number, sutun: number, deger: number, ondalik: number) => {
    setDurum((d) => tabloDuzenle(d, sayiHucreYaz(etkinTablo(d), satir, sutun, deger, ondalik)));
  }, [setDurum]);
  /** Daire sürüklemesinin son değerleri: toplam birebir korunmuştur, yeniden yuvarlanmaz (6 basamağa kadar yazılır) */
  const degerlerDegis = useCallback((sutun: number, degerler: { satir: number; deger: number }[]) => {
    setDurum((d) =>
      tabloDuzenle(
        d,
        degerler.reduce((t, { satir, deger }) => sayiHucreYaz(t, satir, sutun, deger, 6), etkinTablo(d)),
      ),
    );
  }, [setDurum]);

  const genislik = kokBoyut.genislik || pencereGenisligi || 900;
  /** Tablonun doğal genişliği (başlıklar ve değerler yatay kaydırmadan) */
  const tabloDogal = tabloDogalGenisligi(tablo);
  // Panel açıkken panel | grafik sütunu (tablo grafiğin altında bant); darda alt alta
  const modu = yerlesimModu(genislik, panelAcik);
  /** Panel | grafik sütunu; tablo grafik sütununun altında katlanabilir bant */
  const bantli = modu === 'bantli';
  const dikey = modu === 'dikey' || modu === 'dikey-kaydir';
  /** Dar pencerede panel açık: gövde dikey kayar, her bölüm kendi boyunda */
  const dikeyKaydir = modu === 'dikey-kaydir';
  /**
   * Panel açıkken tablo, grafik sütununun altında katlanabilir banttır (tablo sütunu yok): yan yana düzende de alt alta
   * düzende de grafik tablodan önce gelir (toplanan veri önce grafikte görülür)
   */
  const bantVar = panelAcik && (bantli || dikeyKaydir);
  const seciliGecerli = seciliSatir !== null && seciliSatir < tablo.satirlar.length ? seciliSatir : null;
  /**
   * Araç çubuğunun sağındaki düğmeler kademeli daralır (yer yetmedikçe önce Grafik ayarları, sonra İndir, en son Örnek
   * veri ile Veri topla yalnız simge, 44 × 44); erişilebilir adları aynı. Sekmelerin genişliği ölçülür.
   */
  const aracDuzeyi = aracDuzeyiBul(genislik, sekmelerBoyut.genislik);
  const ornekSimge = aracDuzeyi >= 4;
  const toplaSimge = aracDuzeyi >= 4;
  const indirSimge = aracDuzeyi >= 2;
  const ayarSimge = aracDuzeyi >= 1;

  // Örnek veri menüsü araç çubuğuna göre konumlanır: en çok 860 px, pencereden 8 px içeride; sağ kenarı düğmenin
  // sağ kenarıyla hizalı, sol kenarı en az 8 px; yüksekliği pencereye sığar
  const [ornekDugmeSag, setOrnekDugmeSag] = useState<number | null>(null);
  const ornekMenuAc = () => {
    const kap = ornekMenu.kapRef.current;
    if (kap) setOrnekDugmeSag(kap.offsetLeft + kap.offsetWidth);
  };
  const menuGenislik = Math.max(240, Math.min(860, genislik - 16));
  const menuSol = Math.max(8, Math.min((ornekDugmeSag ?? genislik - 8) - menuGenislik, genislik - 8 - menuGenislik));
  const menuYukseklik = kokBoyut.yukseklik > 0 ? Math.max(200, kokBoyut.yukseklik - 70) : undefined;

  const degiskenSecimi = (deger: string | null, alan: 'degisken' | 'ikinciDegisken') => {
    guncelle((d) => {
      const yeni: Partial<Durum> = { [alan]: deger, aralik: null };
      if (alan === 'degisken' && deger && d.ikinciDegisken === deger) yeni.ikinciDegisken = null;
      return yeni;
    });
  };

  /**
   * Değişken sekmesine tıklama: o değişken grafiğe gelir. Saçılımda dikey eksendeki değişkenin sekmesine
   * tıklanırsa eksenler yer değiştirir (x ↔ y).
   */
  const degiskenSec = (id: string) => {
    if (sekme === 'sacilim' && sacilim && id === sacilim.y) {
      guncelle({ degisken: id, yDegisken: sacilim.x, aralik: null });
      return;
    }
    // Karşılaştırılan (sayısal) değişkenin sekmesi: karşılaştırma silinmez, iki değişken yer değiştirir (paneller yer
    // değiştirir; ortak eksen ve gruplama aynı kalır). Gruplayan değişkenin sekmesi o değişkeni grafiğe getirir.
    if ((sekme === 'nokta' || sekme === 'cizgi' || sekme === 'istatistik') && ikinciSayisal && id === durum.ikinciDegisken && grafikSutunId && grafikSutunId !== id) {
      guncelle({ degisken: id, ikinciDegisken: grafikSutunId });
      return;
    }
    degiskenSecimi(id, 'degisken');
  };

  /**
   * "Karşılaştır" seçimi (nokta, çizgi, istatistik): aynı birimli sayısal değişkenler ve (noktada) "(gruplara ayır)"
   * ekli kategorik değişkenler; seçilemeyenler pasif ve nedeni title'da. Seçenek yoksa ya da grafikte veri yoksa çizilmez.
   * Dar şeritte "Karşılaştır:" yazısı yerine simge.
   */
  const karsilastirSecimi = (secenekler: KarsilastirmaAdayi[], deger: string) =>
    secenekler.length === 0 || bos ? null : (
      <label className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap" title={karsilastirKisa ? 'Karşılaştır' : undefined} data-karsilastir>
        {/* Dar şeritte yazı yerine simge: alt alta iki nokta dizisi (iki panel) */}
        {karsilastirKisa && (
          <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true">
            <path d="M2.5 8.5h15M2.5 17h15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="6" cy="5.5" r="1.8" fill="currentColor" />
            <circle cx="10" cy="5.5" r="1.8" fill="currentColor" />
            <circle cx="10" cy="14" r="1.8" fill="currentColor" />
            <circle cx="14" cy="14" r="1.8" fill="currentColor" />
          </svg>
        )}
        <span className={karsilastirKisa ? 'sr-only' : 'font-bold text-muted-foreground'}>Karşılaştır:</span>
        <select
          className={secimSinirli ? `${SECIM} max-w-[9rem]` : SECIM}
          value={deger}
          onChange={(e) => degiskenSecimi(e.target.value || null, 'ikinciDegisken')}
          aria-label="Karşılaştırma için ikinci değişken"
        >
          <option value="">yok</option>
          {secenekler.map((s) => (
            <option key={s.id} value={s.id} disabled={s.neden !== null} title={s.neden ?? undefined} data-karsilastirma-turu={s.tur}>
              {s.etiket}
            </option>
          ))}
        </select>
      </label>
    );

  const grafikGenislik = grafikBoyut.genislik;
  const grafikYukseklik = grafikBoyut.yukseklik;
  /** Nokta grafiğinde iki sayısal değişken: alt alta iki panel (ikincisi mercan), ortak eksen */
  const ikiPanel = sekme === 'nokta' && ikinciSayisal;
  /** Nokta grafiğinde kategorik değişkene göre gruplar: her grup alt alta bir panel ("7-A (15 veri)"), ortak eksen */
  const gruplar = useMemo(
    () =>
      sekme === 'nokta' && karsTuru === 'grup' && degiskenGecerli
        ? grupPanelleri(tablo, noktaSutun, ikinciSutun, kategoriSiralari.get(tablo.sutunlar[ikinciSutun]?.id ?? ''))
        : [],
    [sekme, karsTuru, degiskenGecerli, tablo, noktaSutun, ikinciSutun, kategoriSiralari],
  );
  /** Grup panelleri tek renkli mi: renk anahtarı yok ya da gruplayan değişkenin kendisi (lejant gereksiz) */
  const grupRenkli = !renkEslemi || renkEslemi.sutun === ikinciSutun;
  /**
   * Alt alta panellerin ortak yığın ölçeği (korunan karar 7'nin dikey eşi): her panel en yüksek yığına göre değil,
   * panellerin en yükseğine göre ölçeklenir; bütün panellerde nokta aynı büyüklükte, 5'lik yığın 7'likten uzun görünmez
   */
  const ortakYigin = useMemo(() => {
    if (sekme !== 'nokta') return undefined;
    if (gruplar.length > 1) return Math.max(0, ...gruplar.map((g) => yiginYuksekligi(tablo, noktaSutun, aralik, g.satirlar)));
    if (ikiPanel) return Math.max(yiginYuksekligi(tablo, noktaSutun, aralik), yiginYuksekligi(tablo, ikinciSutun, aralik));
    return undefined;
  }, [sekme, gruplar, ikiPanel, tablo, noktaSutun, ikinciSutun, aralik]);
  /** Alt alta panel sayısı (1 = karşılaştırma yok) */
  const panelSayisi = ikiPanel ? 2 : gruplar.length > 1 ? gruplar.length : 1;
  const cokPanel = panelSayisi > 1;
  /** Paneller en az 140'ar px sığmıyorsa bu boyda kalır ve grafik alanı dikey kayar (noktalar ezilmez) */
  const panelKayar = cokPanel && grafikYukseklik > 0 && grafikYukseklik < PANEL_EN_AZ * panelSayisi;
  /** Kayarken kaydırma çubuğu için pay */
  const panelGenislik = panelKayar ? Math.max(0, grafikGenislik - 14) : grafikGenislik;
  /** Panel boyu: aradaki 1 px'lik çizgiler düşülerek eşit bölünür */
  const panelYukseklik = cokPanel ? Math.max(PANEL_EN_AZ, Math.floor((grafikYukseklik - (panelSayisi - 1)) / panelSayisi)) : grafikYukseklik;

  /** Çizgi grafiğinin serileri: seçili değişken ve (varsa) karşılaştırılan aynı birimli sayısal değişken */
  const cizgiSutunlari = grafikSutun >= 0 ? [grafikSutun, ...(ikinciSayisal && ikinciSutun !== grafikSutun ? [ikinciSutun] : [])] : [];
  /** Deney özetinde teorik olasılık serisi kesikli çizgiyle (deneysel olasılıkla karışmasın) */
  const cizgiIkinciKesikli = etkinKume === 'ozet' && cizgiSutunlari.length > 1 && tablo.sutunlar[cizgiSutunlari[1]]?.id === OZET_SUTUNU.teorik;

  /**
   * Grafikteki veri sayısı: boş durum (0 veri) ve PNG bandı ("24 veri") için. Saçılımda iki değeri de olan satırlar,
   * karşılaştırmada iki değişkenin verileri, gruplarda gruplara giren veriler; kategorik değişkende dolu hücreler.
   */
  const anaVeriSayisi = useMemo(() => {
    if (sekme === 'sacilim') {
      if (!sacilim) return 0;
      const x = sutunIndeksi(tablo, sacilim.x);
      const y = sutunIndeksi(tablo, sacilim.y);
      const ys = new Set(gecerliDegerler(tablo, y).map((n) => n.satir));
      return gecerliDegerler(tablo, x).filter((n) => ys.has(n.satir)).length;
    }
    if (grafikSutun < 0) return 0;
    return tablo.sutunlar[grafikSutun].tur === 'sayi' ? gecerliDegerler(tablo, grafikSutun).length : sutunMetinleri(tablo, grafikSutun).length;
  }, [sekme, sacilim, tablo, grafikSutun]);
  const grafikVeriSayisi =
    gruplar.length > 1
      ? gruplar.reduce((t, g) => t + g.veriSayisi, 0)
      : anaVeriSayisi + ((sekme === 'nokta' || sekme === 'cizgi') && ikinciSayisal ? ikinciDegerler.length : 0);
  /**
   * Boş durum: kendi tablonuzda (toplama bağlı değilken) grafikte hiç veri yok → grafik yerine yol gösteren kutu;
   * şerit düğmeleri pasif, Karşılaştır gizli. Toplama bağlıyken grafiklerin kendi boş ipucu kullanılır.
   */
  const bos = etkinKume === 'tablom' && !toplama.bagli && anaVeriSayisi === 0;

  // Seçenek şeridi tek satırdır (≤ 52 px): sığdığı en geniş düzeyde (tam / orta / dar) çizilir
  const noktaSecenekDugmeleri: [NoktaSecenegi | 'sutunModu', string][] = [
    ...(kategorikSecili
      ? []
      : ([
          ['ortalama', 'Ortalama'],
          ['ortanca', 'Ortanca'],
          ['oms', 'Ortalama mutlak sapma'],
        ] as [NoktaSecenegi, string][])),
    ['etiketler', kategorikSecili ? 'Sayılar' : 'Etiketler'],
    ['sutunModu', 'Sütunlara dönüştür'],
  ];
  const DAIRE_SECIMLERI: [DaireModu, string][] = [
    ['satir', 'Her satır bir dilim'],
    ['siklik', 'Değerlerin sıklığı'],
  ];
  const seritDugmeAdlari =
    sekme === 'nokta'
      ? noktaSecenekDugmeleri.map(([, ad]) => ad)
      : sekme === 'cizgi'
        ? ['Değerleri göster']
        : sekme === 'daire'
          ? DAIRE_SECIMLERI.map(([, ad]) => ad)
          : sekme === 'sutun'
            ? ['Değerlerin sıklığı gösteriliyor']
            : [];
  /**
   * Seçenek şeridinin yazı ölçer: tarayıcıda uygulamanın yazı tipiyle tuvalde ölçülür (tahmin değil); grafik alanı
   * ölçülmeden (sunucu, testler) hiç çağrılmaz
   */
  const yaziAilesi = grafikGenislik > 0 && kokRef.current ? getComputedStyle(kokRef.current).fontFamily : null;
  const metinOlcer: MetinOlcer | undefined = yaziAilesi
    ? (m, tur) => yaziGenisligi(m, `${tur === 'etiket' ? 700 : 600} ${tur === 'dugme' ? 12 : 13}px ${yaziAilesi}`)
    : undefined;
  /** Karşılaştır listesinin en geniş seçeneği (seçim kutusu en geniş seçeneğin boyundadır) */
  const enUzunAday =
    karsAdaylari.length > 0 && !bos
      ? karsAdaylari.reduce((en, s) => {
          const g = (m: string) => metinOlcer?.(m, 'secim') ?? m.length;
          return g(s.etiket) > g(en) ? s.etiket : en;
        }, 'yok')
      : null;
  /** Nokta şeridinde önce simgeye inen düğmeler: Etiketler (Sayılar) ve Sütunlara dönüştür (sondaki iki düğme) */
  const seritIkincil = sekme === 'nokta' ? 2 : 0;
  const seritDuzeyi = seritDuzeyiBul(grafikGenislik, seritDugmeAdlari, enUzunAday, seritIkincil, metinOlcer);
  /** Düğmeler yalnız simge (adları title ve erişilebilir adda) */
  const seritDar = seritDuzeyi === 'dar' || seritDuzeyi === 'en-dar';
  /** Nokta şeridinin `i`. düğmesi yalnız simge mi ('kismi' düzeyde sondaki iki düğme) */
  const noktaDugmesiSimge = (i: number) => seritDar || (seritDuzeyi === 'kismi' && i >= noktaSecenekDugmeleri.length - seritIkincil);
  /** Çok dar grafik sütununda "Karşılaştır:" ve "Dikey eksen (y):" yazıları gizlenir (seçim kutusunun erişilebilir adı kalır) */
  const seritEtiketiGizli = grafikGenislik > 0 && grafikGenislik < 480;
  /** "Karşılaştır:" yazısı yerine simge */
  const karsilastirKisa = seritDuzeyi === 'orta' || seritDuzeyi === 'kismi' || seritDuzeyi === 'en-dar';
  /** Seçim kutusu 9rem'le sınırlı (yalnız en dar şeritte) */
  const secimSinirli = seritDuzeyi === 'en-dar';
  const ortakEksen = useMemo(() => {
    if (ikiPanel && noktaDegerler.length > 0 && ikinciDegerler.length > 0) return { min: Math.min(...tumNoktaDegerler), max: Math.max(...tumNoktaDegerler) };
    if (gruplar.length > 1 && noktaDegerler.length > 0) return { min: Math.min(...noktaDegerler), max: Math.max(...noktaDegerler) };
    return undefined;
  }, [ikiPanel, gruplar.length, tumNoktaDegerler, noktaDegerler, ikinciDegerler.length]);
  /**
   * Nokta grafiğinin "en az bu aralık" ekseni: karşılaştırmada ortak eksen; toplamada planın beklenen aralığı (ölçümde
   * 60–120, sayı küpünde 1–6: eksen ilk veriden önce hazır, yalnız genişler); ikisi birlikteyse birleşimi
   */
  const toplamaEkseniMin = toplama.eksenAlani?.min;
  const toplamaEkseniMax = toplama.eksenAlani?.max;
  const noktaEksenAlani = useMemo(() => {
    if (toplamaEkseniMin === undefined || toplamaEkseniMax === undefined) return ortakEksen;
    if (!ortakEksen) return { min: toplamaEkseniMin, max: toplamaEkseniMax };
    return { min: Math.min(toplamaEkseniMin, ortakEksen.min), max: Math.max(toplamaEkseniMax, ortakEksen.max) };
  }, [toplamaEkseniMin, toplamaEkseniMax, ortakEksen]);
  /** Panelin son eklediği satır (Tablom'da): nokta grafiğinde 700 ms'lik halka */
  const vurguSatir = useMemo(() => {
    if (ertelenenYeniSatir === null || etkinKume !== 'tablom') return null;
    const i = tablo.satirlar.findIndex((r) => r.id === ertelenenYeniSatir);
    return i >= 0 ? i : null;
  }, [ertelenenYeniSatir, etkinKume, tablo]);

  /** Seçenek şeridi yalnız o grafiğin seçeneği varsa çizilir */
  const seritVar =
    (sekme === 'nokta' && degiskenGecerli) ||
    (sekme === 'sutun' && sutunSiklik !== null && !bos) ||
    (sekme === 'cizgi' && grafikSutun >= 0) ||
    (sekme === 'daire' && daireSayisal && !bos) ||
    (sekme === 'sacilim' && sacilim !== null) ||
    (sekme === 'istatistik' && etkinSutun >= 0 && !etkinKategorik && karsAdaylari.length > 0 && !bos);

  /**
   * Çizgi, satırlar bir sıra değilken (öğrenci adları, kodlar): grafiğin üstünde kapatılabilir tek satırlık not. Kapatılan
   * not aynı tabloda yeniden çıkmaz (örnek yeniden yüklenince tablo yeni kimlik alır, not yeniden çıkar).
   */
  const [kapaliSiraNotu, setKapaliSiraNotu] = useState<string | null>(null);
  const siraNotuAnahtari = `${durum.ornekId ?? ''}|${tablo.sutunlar[0]?.id ?? ''}`;
  const cizgiNotuVar = useMemo(() => sekme === 'cizgi' && etkinKume === 'tablom' && cizgiSiraNotuGerekli(tablo), [sekme, etkinKume, tablo]);
  const siraNotuGorunur = cizgiNotuVar && grafikSutun >= 0 && !bos && kapaliSiraNotu !== siraNotuAnahtari && !panelAcik;

  /** Boş durumdaki "Tabloya yaz": tablonun yazmaya hazır boş satırına (grafikteki değişkenin hücresine) odaklanır */
  const tabloyaYaz = () => {
    const girdiler = Array.from(tabloKapRef.current?.querySelectorAll<HTMLInputElement>('[data-bos-satir] input') ?? []);
    const hedef = girdiler.find((g) => grafikSutun >= 0 && (g.dataset.hucre ?? '').endsWith(`-${grafikSutun}`)) ?? girdiler[0];
    hedef?.focus();
  };
  /**
   * Çizgide değişim etiketinin yüzdesi: bağlı örneğin sütun ayarı (ör. °C'de yüzde yok, boyda var); ayarı olmayan
   * seride grafiğin kendi kuralı (`yuzdeAnlamli`). Örneğe bağlı değilken grafik kendisi karar verir.
   */
  const cizgiYuzdeleri =
    sekme === 'cizgi' && ornekAcilisi && cizgiSutunlari.some((i) => tablo.sutunlar[i].id in ornekAcilisi.yuzdeDegisim)
      ? cizgiSutunlari.map(
          (i) =>
            ornekAcilisi.yuzdeDegisim[tablo.sutunlar[i].id] ??
            yuzdeAnlamli(
              tablo.sutunlar[i].ad,
              gecerliDegerler(tablo, i).map((n) => n.deger),
            ),
        )
      : undefined;

  /**
   * Sıklık dairesi: kategorik değişkende kategorilerin, sayısal değişkende (değerlerin sıklığı) değerlerin kaç kez
   * görüldüğü. Sürükleme kapalı; renk anahtarı başka bir kategorik değişkense dış halka.
   */
  const kategorikDaire = useMemo(() => {
    if (sekme !== 'daire' || etkinSutun < 0 || (!etkinKategorik && !daireSiklik)) return null;
    const kaynak = daireSiklik ?? { tablo, sira: kategoriSiralari.get(etkinSutunId ?? '') };
    const sira = kaynak.sira;
    const f = kategorikFrekanslar(kaynak.tablo, etkinSutun, sira).filter((x) => x.sayi > 0 || sira !== undefined);
    // Renk anahtarı başka bir kategorik değişkense dış halka her dilimi onun kategorilerine böler
    const capraz = renkEslemi && renkEslemi.sutun !== etkinSutun ? caprazSayim(kaynak.tablo, etkinSutun, renkEslemi, sira) : null;
    return {
      tablo: frekansTablosu(f, tablo.sutunlar[etkinSutun]?.ad ?? 'Sıklık'),
      renkler: f.map((x, i) => kategoriRengi(x.kategori, i)),
      halka:
        renkEslemi && capraz
          ? {
              eslem: renkEslemi,
              sayilar: new Map(
                f.map((x, i) => {
                  const c = capraz.find((k) => k.kategori === x.kategori);
                  return [i, c ? [...c.sayilar, c.bos] : []] as [number, number[]];
                }),
              ),
            }
          : null,
      aciklama: daireSiklik ? 'Her dilim, bir değerin kaç kez görüldüğünü gösterir' : 'Her dilim bir kategorinin kaç kez görüldüğünü gösterir',
    };
  }, [sekme, etkinKategorik, daireSiklik, kategoriSiralari, etkinSutunId, tablo, etkinSutun, renkEslemi]);

  /**
   * Tablo alanında seçilebilen kümeler: Tablom ("Atışlar") ve yalnız özet en az 2 satırken Deney özeti. Tek kümede
   * seçici çizilmez (korunan karar 5).
   */
  const kumeIdleri = toplamaKumeleri(durum);
  /** Küme seçicideki satır sayısı. Deney özeti türetilmiştir (etkinken tablo alanındaki tablo odur; değilse Tablom'dan hesaplanır, bellekte tutulur) */
  const kumeSayisi = (id: KumeId): number =>
    id === 'ozet' ? (etkinKume === 'ozet' ? tablo.satirlar.length : kumeTablosu(durum, 'ozet').satirlar.length) : durum.tablo.satirlar.length;
  const kumeler = kumeIdleri.map((id) => ({ id, ad: kumeEtiketi(durum, id), sayi: kumeSayisi(id) }));
  const kumeSecici = kumeler.length > 1;
  /** Tablo sütununun başlık satırındaki ad: Tablom'un adı (örnek adı); kendi tablonuzda (adsız) satır çizilmez */
  const tabloBasligi = etkinKume === 'tablom' ? durum.tabloAdi : null;
  /** Keşif şeridi ya da kartı açık mı (yalnız bağlı örnekte çizilir) */
  const ipucuAcik = durum.ipucu !== 'kapali';
  /** Panel açıkken grafik sütununda şerit, not ya da kart yoktur (§0: yalnız sekmeler, grafik, tost, bant, şerit) */
  const kesifGorunur = ornek !== undefined && ipucuAcik && !panelAcik;
  /**
   * Soru şeridi (ipucu yuvası): araştırma Tablom'a bağlıyken panel kapalıysa görünür; panel açıkken soru panelin
   * başında olduğundan gizlidir (§0 S2). Gizlenince tablonun başlığındaki düğmeyle yeniden açılır.
   */
  const soruSeridiVar = toplama.soruSeridi !== null;
  const soruSeridi = soruSeridiVar && !panelAcik && ipucuAcik ? toplama.soruSeridi : null;
  /** Keşif kartının en büyük yüksekliği: grafik sütununun %34'ü (ölçülmeden önce sınırsız) */
  const kesifSiniri = anaBoyut.yukseklik > 0 ? Math.round(anaBoyut.yukseklik * KESIF_KARTI_ORANI) : undefined;

  /**
   * Tablo bandı (panel açık, `bantli`): açık / kapalı kalıcıdır (varsayılan kapalı). Gövde 540 px'ten kısaysa kayıtta
   * açık olsa da kapalı başlar; oturumda açılıp kapanınca o seçim geçerlidir.
   */
  const [bantOturumda, setBantOturumda] = useState<boolean | null>(null);
  const bantAcik = bantOturumda ?? (durum.tabloBandiAcik && anaBoyut.yukseklik >= BANT_ACIK_EN_AZ_GOVDE);
  const bantAcikDegistir = (acik: boolean) => {
    setBantOturumda(acik);
    if (durumRef.current.tabloBandiAcik !== acik) guncelle({ tabloBandiAcik: acik });
  };
  /** Panelin "Tabloda göster"i: satır seçilir, tablo ona kayar; bant kapalıysa (yalnız bu oturum için) açılır */
  const satirGoster = (satir: number) => {
    setSeciliSatir(satir);
    if (bantVar && !bantAcik) setBantOturumda(true);
  };

  /** Toplama görünümü: panel açık ve araştırma Tablom'a bağlı (sütun menüsü ve satır silme sütunu yok, # hücresi ×) */
  const toplamaGorunumu = panelAcik && toplama.bagli && etkinKume === 'tablom';
  const ozetAcik = etkinKume === 'ozet';
  /** Veri tablosu: iki sütunlu düzende solda, panel açıkken grafik sütununun altında bant */
  const tabloOgesi = (
    <VeriTablosuBileseni
      key={etkinKume}
      tablo={tablo}
      seciliSatir={seciliGecerli}
      onSatirSec={setSeciliSatir}
      onTablo={tabloyuYaz}
      vurguluSutun={grafikSutunId}
      sonaKaydir={etkinKume !== 'tablom' || toplamaGorunumu}
      onTemizle={temizle}
      satirRengi={renkEslemi ? (i: number) => satirRengi(renkEslemi, i) : undefined}
      toplamaGorunumu={toplamaGorunumu || undefined}
      yeniSatirKimligi={etkinKume === 'tablom' ? ertelenenYeniSatir : undefined}
      bosIleti={toplama.bosIleti}
      saltOkunur={ozetAcik || undefined}
      saltOkunurNotu={ozetAcik ? OZET_SALT_OKUNUR_NOTU : undefined}
      bantModu={bantVar || undefined}
      bantAcik={bantVar ? bantAcik : undefined}
      onBantAcik={bantVar ? bantAcikDegistir : undefined}
      kilitli={akis || undefined}
    />
  );

  /** Veri kümesi seçici ("Atışlar (370)" · "Deney özeti (7)"); yalnız birden çok küme varken */
  const kumeSeciciOgesi = kumeSecici && (
    <div role="radiogroup" aria-label="Veri kümesi" className="inline-flex flex-wrap gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-1" data-kume-secici="">
      {kumeler.map((k, ki) => {
        const aktif = etkinKume === k.id;
        const sayi = k.sayi;
        return (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={aktif}
            tabIndex={aktif ? 0 : -1}
            onKeyDown={(e) => radyoTusu(e, ki, kumeler.length, (h) => kumeSec(kumeler[h].id))}
            data-kume={k.id}
            aria-label={`${k.ad} (${sayi})`}
            className={`h-11 whitespace-nowrap rounded-[calc(var(--radius)-8px)] px-2.5 text-[13px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              aktif ? DOLU_ZEMIN : 'text-foreground hover:bg-accent'
            }`}
            onClick={() => kumeSec(k.id)}
          >
            {k.ad}
            <span className={`ml-1 font-semibold ${aktif ? 'opacity-85' : 'text-muted-foreground'}`}>({sayi})</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={kokRef} className="flex h-full w-full flex-col bg-background text-foreground" data-uygulama="veri-grafik">
      {/* Üst şerit: grafik türü sekmeleri + örnek veri, deney, indirme ve grafik ayarları */}
      <div className="relative flex flex-wrap items-center gap-2 border-b border-border bg-card px-2 py-1.5" data-arac-cubugu>
        <div ref={sekmelerRef} role="tablist" aria-label="Grafik türü" className="flex flex-wrap gap-1 rounded-[calc(var(--radius)-4px)] bg-muted p-1">
          {SEKMELER.map((s, i) => {
            const aktif = sekme === s.id;
            const kimlik = sekmeKimlikleri('veri', s.id);
            // Veri türüne göre: çizgi bir, saçılım iki sayısal değişken ister; yoksa sekme pasif ve nedeni ipucunda
            const kullanilabilir = sekmeKullanilabilir(s.id, sayisalSayisi);
            return (
              <button
                key={s.id}
                id={kimlik.sekme}
                type="button"
                role="tab"
                aria-selected={aktif}
                aria-controls={kimlik.panel}
                aria-disabled={!kullanilabilir || undefined}
                tabIndex={aktif ? 0 : -1}
                title={kullanilabilir ? undefined : sekmeGerekceleri[s.id]}
                onKeyDown={(e) => {
                  // Ok tuşları kullanılabilir sekmeler arasında dolaşır (roving tabindex); Tab tek durak
                  let hedef = sekmeOkTusu(e.key, i, SEKMELER.length);
                  if (hedef === null) return;
                  e.preventDefault();
                  const adim = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'End' ? -1 : 1;
                  for (let k = 0; k < SEKMELER.length && !sekmeKullanilabilir(SEKMELER[hedef].id, sayisalSayisi); k++) {
                    hedef = (hedef + adim + SEKMELER.length) % SEKMELER.length;
                  }
                  guncelle({ sekme: SEKMELER[hedef].id });
                  document.getElementById(sekmeKimlikleri('veri', SEKMELER[hedef].id).sekme)?.focus();
                }}
                className={`h-11 min-w-[64px] rounded-[calc(var(--radius)-8px)] px-3 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  aktif
                    ? `${DOLU_ZEMIN} shadow-[0_8px_18px_-10px_rgba(6,40,45,.6)]`
                    : kullanilabilir
                      ? 'text-foreground hover:bg-accent'
                      : 'cursor-not-allowed text-muted-foreground/60'
                }`}
                onClick={() => {
                  // Pasif sekmeye dokunulunca nedeni kısa bildirimle söylenir (title dokunmatik ekranda görünmez)
                  if (kullanilabilir) guncelle({ sekme: s.id });
                  else tostGoster(sekmeGerekceleri[s.id] ?? 'Bu grafik tablodaki verilerle çizilemiyor.');
                }}
              >
                {s.ad}
              </button>
            );
          })}
        </div>

        {/* Sağdaki dört düğme: yer azaldıkça kademeli olarak yalnız simge (önce Grafik ayarları, sonra İndir, en son Örnek
            veri ve Veri topla); adları aria-label ve title'da (çubuk tek satır kalır) */}
        <div className="ml-auto flex items-center gap-2" data-arac-dugmeleri data-arac-duzeyi={aracDuzeyi}>
          {/* Örnek veri: menü araç çubuğuna göre konumlanır (sağ kenarı düğmeyle hizalı, pencereden taşmaz) */}
          <div ref={ornekMenu.kapRef}>
            <button
              ref={ornekMenu.dugmeRef}
              type="button"
              className={ornekSimge ? simgeDugmesi(DUGME) : DUGME}
              aria-haspopup="menu"
              aria-expanded={ornekMenu.acik}
              aria-label={ornekSimge ? 'Örnek veri' : undefined}
              title={ornekSimge ? 'Örnek veri' : undefined}
              onClick={() => {
                ornekMenuAc();
                ornekMenu.setAcik((a) => !a);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') ornekMenuAc();
                ornekMenu.dugmeTusu(e);
              }}
            >
              {ornekSimge ? (
                <AracSimgesi ad="ornek" className="h-5 w-5" />
              ) : (
                <>
                  Örnek veri
                  <AracSimgesi ad="asagi" className="h-3.5 w-3.5" />
                </>
              )}
            </button>
            {ornekMenu.acik && (
              <div
                ref={ornekMenu.menuRef}
                role="menu"
                aria-label="Örnek veri"
                onKeyDown={ornekMenu.menuTusu}
                className="absolute top-full z-30 mt-1 overflow-y-auto overscroll-contain rounded-[calc(var(--radius)-4px)] border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_18px_40px_-18px_rgba(6,40,45,.55)]"
                style={{ left: menuSol, width: menuGenislik, maxHeight: menuYukseklik }}
                data-ornek-menusu
              >
                {/* Galeri: en üstte kalıcı "Önceki tabloya dön" (örnek yükleme ya da yeni tablo eski tabloyu burada saklar),
                    altında sınıf düzeyine göre gruplanmış örnekler (küçük grafik, ad, açıklama, sınıf rozeti); genişse iki sütun */}
                <OrnekGalerisi
                  yukluOrnekId={durum.ornekId}
                  onceki={durum.oncekiTablo ? { ad: durum.oncekiTablo.ad, satirSayisi: durum.oncekiTablo.tablo.satirlar.length } : null}
                  onYukle={ornekYukle}
                  onOncekiTabloyaDon={oncekiyeDon}
                  genislik={menuGenislik - 12}
                />
              </div>
            )}
          </div>
          {/* Veri topla: basılıyken panel açık; yeniden basmak paneli kapatır (Bitti ile aynı) */}
          <button
            type="button"
            className={toplaSimge ? simgeDugmesi(panelAcik ? DUGME_BIRINCIL : DUGME) : panelAcik ? DUGME_BIRINCIL : DUGME}
            aria-pressed={panelAcik}
            aria-label={toplaSimge ? 'Veri topla' : undefined}
            title="Veri topla: anketle, ölçerek ya da deneyle kendi verinizi toplayın"
            onClick={() => (panelAcik ? toplamaPaneliKapat() : toplamaPaneliAc())}
            data-veri-topla-dugmesi=""
          >
            <VeriToplaSimgesi className={toplaSimge ? 'h-5 w-5' : 'h-[18px] w-[18px]'} />
            {!toplaSimge && 'Veri topla'}
          </button>
          {/* İndir menüsü: tablo (CSV) ve grafik (PNG) tek düğmede */}
          <div ref={indirMenu.kapRef} className="relative">
            <button
              ref={indirMenu.dugmeRef}
              type="button"
              className={indirSimge ? simgeDugmesi(DUGME) : DUGME}
              aria-haspopup="menu"
              aria-expanded={indirMenu.acik}
              aria-label={indirSimge ? 'İndir' : undefined}
              title={indirSimge ? 'İndir' : undefined}
              onClick={() => indirMenu.setAcik((a) => !a)}
              onKeyDown={indirMenu.dugmeTusu}
            >
              {indirSimge ? (
                <AracSimgesi ad="indir" className="h-5 w-5" />
              ) : (
                <>
                  İndir
                  <AracSimgesi ad="asagi" className="h-3.5 w-3.5" />
                </>
              )}
            </button>
            {indirMenu.acik && (
              <div
                ref={indirMenu.menuRef}
                role="menu"
                aria-label="İndir"
                onKeyDown={indirMenu.menuTusu}
                className="absolute right-0 z-30 mt-1 min-w-[220px] overflow-hidden rounded-[calc(var(--radius)-4px)] border border-border bg-popover p-1 text-popover-foreground shadow-[0_18px_40px_-18px_rgba(6,40,45,.55)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className="block h-11 w-full rounded-[calc(var(--radius)-8px)] px-3 text-left text-[13px] font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  onClick={() => {
                    indirMenu.kapat(true);
                    csvIndir();
                  }}
                >
                  Tabloyu CSV olarak indir
                </button>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  disabled={sekme === 'istatistik'}
                  className="block h-11 w-full rounded-[calc(var(--radius)-8px)] px-3 text-left text-[13px] font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-50"
                  onClick={() => {
                    indirMenu.kapat(true);
                    void pngIndir();
                  }}
                >
                  Grafiği PNG olarak indir
                </button>
              </div>
            )}
          </div>
          {/* Grafik ayarları: kategoriye göre renklendirme (bütün grafikler, istatistik ve tablo), gruplama, sürükleme yuvarlaması.
              Seçim menüyü kapatmaz (ayar hemen görünür, başka ayar da seçilebilir); Escape ve dışarı dokunma kapatır */}
          <div ref={ayarMenu.kapRef} className="relative">
            <button
              ref={ayarMenu.dugmeRef}
              type="button"
              className={ayarSimge ? simgeDugmesi(DUGME) : DUGME}
              aria-haspopup="menu"
              aria-expanded={ayarMenu.acik}
              aria-label={ayarSimge ? 'Grafik ayarları' : undefined}
              title="Grafik ayarları: renklendirme, gruplama, sürükleme yuvarlaması"
              onClick={() => ayarMenu.setAcik((a) => !a)}
              onKeyDown={ayarMenu.dugmeTusu}
              data-grafik-ayarlari-dugmesi
            >
              <AracSimgesi ad="ayar" className={ayarSimge ? 'h-5 w-5' : 'h-4 w-4'} />
              {!ayarSimge && 'Grafik ayarları'}
            </button>
            {ayarMenu.acik && (
              <div
                ref={ayarMenu.menuRef}
                role="menu"
                aria-label="Grafik ayarları"
                onKeyDown={ayarMenu.menuTusu}
                className="absolute right-0 top-full z-30 mt-1 w-[min(320px,80vw)] rounded-[calc(var(--radius)-4px)] border border-border bg-popover p-2 text-[13px] text-popover-foreground shadow-[0_18px_40px_-18px_rgba(6,40,45,.55)]"
                data-grafik-ayarlari
              >
                {kategorikDegiskenler.length === 0 ? (
                  <p className="px-2 py-1.5 text-muted-foreground" data-renk-notu>
                    Renklendirme için kategorik değişken yok.
                  </p>
                ) : (
                  <div role="group" aria-label="Kategoriye göre renklendir">
                    <p className="px-2 pt-1 font-bold">Kategoriye göre renklendir</p>
                    <p className="px-2 pb-2 text-muted-foreground">Bütün grafiklerde, istatistikte ve tablodaki satırlarda aynı renkler kullanılır.</p>
                    {[
                      { id: RENKSIZ, ad: 'Renklendirme yok', eslem: null },
                      ...kategorikDegiskenler.map((s) => ({ id: s.id, ad: s.ad, eslem: renkEslemesi(tablo, sutunIndeksi(tablo, s.id), kategoriSiralari.get(s.id)) })),
                    ].map((o) => {
                      const secili = o.id === RENKSIZ ? renkId === null : renkId === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={secili}
                          tabIndex={-1}
                          className="flex min-h-11 w-full items-center gap-2 rounded-[calc(var(--radius)-8px)] px-2 text-left font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                          onClick={() => guncelle({ renkDegisken: o.id })}
                        >
                          <RadyoIsareti secili={secili} />
                          <span className="min-w-0 flex-1 truncate">{o.ad}</span>
                          {o.eslem && (
                            <span aria-hidden="true" className="flex shrink-0 gap-0.5">
                              {o.eslem.kategoriler.slice(0, 5).map((k) => (
                                <span key={k} className="h-3 w-3 rounded-full" style={{ backgroundColor: o.eslem!.renkler.get(k) }} />
                              ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Gruplama (nokta grafiği): yakın değerleri gruplara toplar; en küçük seçenek gruplama yok (her nokta tam değerinde) */}
                {gruplamaAyari && (
                  <div role="group" aria-label="Gruplama" className="mt-2 border-t border-border pt-2" data-gruplama-ayari>
                    <p className="px-2 pt-1 font-bold">Gruplama</p>
                    <p className="px-2 pb-2 text-muted-foreground">Yakın değerleri gruplara toplar; “yok” iken her nokta tam değerinde durur.</p>
                    {aralikSecenekler.map((a) => {
                      const secili = Math.abs(a - aralik) < 1e-9;
                      const otomatik = Math.abs(a - otomatikAralik) < 1e-9;
                      const grupluMu = gruplamaVar(tumNoktaDegerler, a);
                      return (
                        <button
                          key={a}
                          type="button"
                          role="menuitemradio"
                          aria-checked={secili}
                          tabIndex={-1}
                          className="flex min-h-11 w-full items-center gap-2 rounded-[calc(var(--radius)-8px)] px-2 text-left font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                          onClick={() => guncelle({ aralik: otomatik ? null : a })}
                        >
                          <RadyoIsareti secili={secili} />
                          <span className="min-w-0 flex-1 truncate">{grupluMu ? `Grup genişliği ${sayiYaz(a)}` : 'Gruplama yok'}</span>
                          {otomatik && <span className="shrink-0 text-muted-foreground">otomatik</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Sürükleme yuvarlaması (sütun, çizgi, daire): tepe ya da dilim sınırı sürüklenince değer bu adıma yuvarlanır */}
                {yuvarlamaAyari && (
                  <div role="group" aria-label="Sürüklerken yuvarla" className="mt-2 border-t border-border pt-2" data-yuvarlama-ayari>
                    <p className="px-2 pt-1 font-bold">Sürüklerken yuvarla</p>
                    <p className="px-2 pb-2 text-muted-foreground">Sütun, nokta ya da dilim sürüklenince değer bu adıma yuvarlanır.</p>
                    {[1, 0.5, 0.1].map((v) => (
                      <button
                        key={v}
                        type="button"
                        role="menuitemradio"
                        aria-checked={yuvarlamaAdimi === v}
                        tabIndex={-1}
                        className="flex min-h-11 w-full items-center gap-2 rounded-[calc(var(--radius)-8px)] px-2 text-left font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                        onClick={() => guncelle({ yuvarlamaAdimi: v })}
                      >
                        <RadyoIsareti secili={yuvarlamaAdimi === v} />
                        <span>{sayiYaz(v)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gövde: tablo | grafik — dar pencerede alt alta ve gövde dikey kayar (grafik en az 240 px kalır). Veri topla
          paneli açıkken: panel | grafik sütunu (tablo grafik sütununun altında bant); darda alt alta */}
      <div className={`relative flex min-h-0 flex-1 ${dikey ? 'flex-col overflow-y-auto overflow-x-hidden' : 'flex-row'}`} data-yerlesim={modu}>
        {panelAcik && (
          // Veri topla paneli: geniş pencerede solda kendi sütununda (1366'da ≈ 410 px), darda üstte tam genişlik;
          // panel kabını %100 doldurur, kompakt kararlarını kendi ölçüsüyle verir
          <div
            className={bantli ? 'flex h-full min-h-0 shrink-0 border-r border-border' : 'flex h-[440px] w-full shrink-0 border-b border-border'}
            style={bantli ? { width: PANEL_GENISLIGI_CSS } : undefined}
            data-toplama-alani={modu}
          >
            <VeriToplaPaneli
              arastirma={durum.arastirma}
              tablo={durum.tablo}
              bagli={toplama.bagli}
              azaltilmisHareket={azaltilmisHareket}
              sekme={sekme}
              planUyarisi={(a) => planUyarisi(durumRef.current, a)}
              onArastirma={(a) => setDurum((d) => arastirmaYaz(d, a))}
              onPlaniUygula={planiUygulaVeBildir}
              onVeri={toplamaVerisi}
              onTabloIslemi={toplamaTabloIslemi}
              onSekme={toplamaSekmesi}
              onOzeteGec={() => {
                setDurum(ozeteGec);
                setSeciliSatir(null);
              }}
              onSatirGoster={satirGoster}
              onYeniSatir={setYeniSatir}
              onAkis={setAkis}
              onBildirim={toplamaBildirimi}
              onKapat={toplamaPaneliKapat}
            />
          </div>
        )}
        {!bantVar && (
        <aside
          className={`flex shrink-0 flex-col border-border bg-card ${dikeyKaydir ? '' : 'min-h-0'} ${
            dikey ? `${dikeyKaydir ? '' : 'h-[42%]'} min-h-[180px] border-b` : 'min-w-[260px] border-r'
          }`}
          // İki sütunlu düzende tablo alanı en az eskisi kadar (%38, en çok 520 px); sütunlar sığmıyorsa pencerenin
          // %48'ine kadar genişler (başlıklar ve değerler yatay kaydırmadan görünsün)
          style={!dikey ? { width: `clamp(260px, max(min(38%, 520px), ${tabloDogal}px), 48%)` } : undefined}
          aria-label="Veri"
        >
          {/* Tablonun başlık satırı (yalnız tablo sütununda; tam genişlik değil): tablonun adı (örnek adı), bağlı örnekte
              Keşif kartını, bağlı araştırmada soru şeridini açıp kapatan "i" düğmesi ve (varsa) veri kümesi seçici */}
          {(tabloBasligi || kumeSecici) && (
          <div className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-background py-1 pl-3 pr-1.5 text-[13px]" data-tablo-basligi>
            {tabloBasligi && (
              <h2 className="min-w-0 flex-1 truncate text-[14px] font-bold leading-5 text-foreground" title={tabloBasligi} data-tablo-adi>
                {tabloBasligi}
              </h2>
            )}
            {(ornek || (soruSeridiVar && !panelAcik)) && (
              <button
                type="button"
                aria-label={ornek ? 'Keşif kartı' : 'Soru şeridi'}
                aria-pressed={ipucuAcik}
                title={
                  ornek
                    ? ipucuAcik
                      ? 'Keşif kartını kapat'
                      : 'Keşif kartını aç: araştırma sorusu, verinin künyesi ve rehberli keşif'
                    : ipucuAcik
                      ? 'Soru şeridini gizle'
                      : 'Soru şeridini göster: araştırma sorusu ve toplanan veri sayısı'
                }
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  ipucuAcik ? 'bg-accent text-primary dark:text-[#9fe0d9]' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                onClick={() => ipucuDegistir(ipucuAcik ? 'kapali' : ornek ? 'kart' : 'serit')}
                data-ipucu-dugmesi
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                  <circle cx="10" cy="10" r="7.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M10 9v5M10 6.1v.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              </button>
            )}
            {kumeSeciciOgesi}
          </div>
          )}
          {/* Tablo alanı; kısa bildirim (tost) burada, tablonun alt şeridinin üstünde durur (grafiği örtmez) */}
          <div ref={tabloKapRef} className={`relative ${dikeyKaydir ? 'h-[280px] shrink-0' : 'min-h-0 flex-1'}`}>
            {tabloOgesi}
            <Tost tost={tost} onKapat={tostKapat} alt={tostAlti} />
          </div>
        </aside>
        )}
        <main
          ref={anaRef}
          // Alt alta düzende grafik sütunu içeriği kadar uzar (grafik alanı en az 240 px) ve gövde kayar
          className={`flex min-w-0 flex-col overflow-hidden bg-card ${dikeyKaydir ? (bantVar ? 'shrink-0' : 'h-[420px] shrink-0') : dikey ? 'min-h-fit flex-1' : 'min-h-0 flex-1'}`}
          role="tabpanel"
          id={sekmeKimlikleri('veri', sekme).panel}
          aria-labelledby={sekmeKimlikleri('veri', sekme).sekme}
        >
          {/* Değişken sekmeleri grafiğin üstünde (seçili sekme grafiğin gösterdiği değişken; renkli nokta ikinci değişken);
              tek değişkende satır çizilmez, adı zaten grafikte yazar */}
          {(sekmeDegiskenleri.length > 1 || (bantVar && kumeSecici)) && (
          <div className="flex shrink-0 items-end gap-2 border-b border-border bg-background px-2 pt-2">
            {sekmeDegiskenleri.length <= 1 ? (
              // Tek değişken: sekme çizilmez (korunan karar 2); satırda yalnız veri kümesi seçici durur
              <div className="min-w-0 flex-1" />
            ) : (
            <div role="tablist" aria-label="Grafikteki değişken" className="-mb-px flex min-w-0 flex-1 items-end gap-1 overflow-x-auto" data-degisken-sekmeleri>
              {sekmeDegiskenleri.map((s, i) => {
                const aktif = s.id === grafikSutunId;
                const ikinci =
                  (karsTuru !== null && s.id === durum.ikinciDegisken && s.id !== grafikSutunId) ||
                  (sekme === 'sacilim' && sacilim !== null && s.id === sacilim.y);
                const grupluyor = ikinci && karsTuru === 'grup' && sekme !== 'sacilim';
                const turAdi = s.tur === 'sayi' ? 'sayısal' : 'kategorik';
                return (
                  <button
                    key={s.id}
                    id={`vg-degisken-sekmesi-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={aktif}
                    aria-controls="vg-grafik-alani"
                    tabIndex={aktif ? 0 : -1}
                    data-degisken-turu={s.tur}
                    title={`${s.ad} (${turAdi})${ikinci ? (sekme === 'sacilim' ? ' · dikey eksende' : grupluyor ? ' · gruplara ayırıyor' : ' · karşılaştırılıyor') : ''}`}
                    onKeyDown={(e) => {
                      const hedef = sekmeOkTusu(e.key, i, sekmeDegiskenleri.length);
                      if (hedef === null) return;
                      e.preventDefault();
                      degiskenSec(sekmeDegiskenleri[hedef].id);
                      document.getElementById(`vg-degisken-sekmesi-${hedef}`)?.focus();
                    }}
                    onClick={() => {
                      if (!aktif) degiskenSec(s.id);
                    }}
                    className={`relative inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-[calc(var(--radius)-4px)] border px-3.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                      aktif
                        ? 'border-border border-b-card bg-card font-bold text-foreground shadow-[inset_0_3px_0_hsl(var(--primary))]'
                        : 'border-transparent font-semibold text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                    }`}
                  >
                    <TurIsareti tur={s.tur} />
                    {s.ad}
                    {ikinci &&
                      (grupluyor ? (
                        // Gruplayan değişken: alt alta iki küçük panel, her birinde nokta sırası (grafikteki grup
                        // panellerinin küçüğü; iki yatay çizgi eşittir işareti gibi okunuyordu)
                        <svg viewBox="0 0 16 16" className="ml-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" data-gruplama-isareti="">
                          <rect x="1.5" y="1.5" width="13" height="5.5" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
                          <rect x="1.5" y="9" width="13" height="5.5" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
                          <circle cx="5" cy="4.25" r="1.15" fill="currentColor" />
                          <circle cx="8" cy="4.25" r="1.15" fill="currentColor" />
                          <circle cx="8" cy="11.75" r="1.15" fill="currentColor" />
                          <circle cx="11" cy="11.75" r="1.15" fill="currentColor" />
                        </svg>
                      ) : (
                        <span aria-hidden="true" className="ml-0.5 h-2 w-2 rounded-full" style={{ backgroundColor: seriRengi(1) }} />
                      ))}
                  </button>
                );
              })}
            </div>
            )}
            {/* Panel açıkken tablo alanı yok: veri kümesi seçici ("Atışlar | Deney özeti") değişken sekmelerinin sağında */}
            {bantVar && kumeSeciciOgesi && <div className="mb-1 shrink-0">{kumeSeciciOgesi}</div>}
          </div>
          )}
          {/* Soru şeridi (ipucu yuvası): bağlı araştırmanın sorusu ve veri sayısı; panel açıkken gizli */}
          {soruSeridi && <SoruSeridi soru={soruSeridi.soru} altBilgi={soruSeridi.altBilgi} onKapat={() => ipucuDegistir('kapali')} />}
          {/* Keşif şeridi / kartı (ipucu yuvası; ikinci tam genişlik çubuk değil): bağlı örneğin araştırma sorusu,
              sekmeye duyarlı ipucu, künye ve rehberli keşif. Kapatılınca tablonun başlığındaki "i" ile yeniden açılır */}
          {kesifGorunur && ornek && (
            <KesifKarti
              key={`${ornek.id}-${ornekYuklemeNo}`}
              ornek={ornek}
              sekme={sekme}
              ozellikler={OZELLIKLER}
              gorunum={durum.ipucu === 'kart' ? 'kart' : 'serit'}
              onGorunum={ipucuDegistir}
              onKapat={() => ipucuDegistir('kapali')}
              onEylem={rehberEylemi}
              yukseklikSiniri={kesifSiniri}
            />
          )}
          {/* Çizgi, satırlar bir sıra değilken: kapatılabilir tek satırlık not (kapı değil; grafik yine çizilir) */}
          {siraNotuGorunur && (
            <div role="note" className="flex min-h-11 shrink-0 items-center gap-2 border-b border-border bg-muted/60 py-0.5 pl-3 pr-1 text-[13px] leading-5 text-foreground" data-cizgi-sira-notu>
              <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-[#b9884a]" aria-hidden="true">
                <circle cx="10" cy="10" r="7.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M10 9v5M10 6.1v.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
              <p className="min-w-0 flex-1">{CIZGI_SIRA_NOTU}</p>
              <button
                type="button"
                aria-label="Notu kapat"
                title="Notu kapat"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setKapaliSiraNotu(siraNotuAnahtari)}
              >
                <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
          {/* Grafik alanı: alt alta düzende en az 240 px. Grafikler mutlak konumlu iç katmanda çizilir (ölçülen boyuta
              uyar, içerik boyuna katılmaz); iki karşılaştırma paneli sığmazsa yalnız bu katman kayar */}
          <div ref={grafikRef} id="vg-grafik-alani" className={`relative overflow-hidden ${dikeyKaydir && bantVar ? 'h-[360px] shrink-0' : `flex-1 ${dikey && !dikeyKaydir ? 'min-h-[240px]' : 'min-h-0'}`}`}>
          {grafikGenislik > 0 && grafikYukseklik > 0 && (
            <div className={`absolute inset-0 ${panelKayar ? 'overflow-y-auto overflow-x-hidden overscroll-contain' : ''}`} data-grafik-katmani>
              {bos && (
                <BosDurum
                  onTabloyaYaz={tabloyaYaz}
                  onOrnekSec={() => {
                    ornekMenuAc();
                    ornekMenu.setAcik(true);
                  }}
                />
              )}
              {!bos && sekme === 'nokta' && gruplar.length > 1 && (
                // Gruplara ayırma: her kategori alt alta bir panel (ortak eksen, aynı gruplama); başlık "7-A (15 veri)".
                // Paneller arasındaki çizgi ayrı 1 px'lik öğedir: panelin kenarlığı olsaydı panel 1 px kısalır, grafiği
                // 0,994 ölçekle çizilir ve ortak eksenin tikleri üst panelle 2 px kayardı
                <div className={`flex w-full flex-col [&>*]:shrink-0 ${panelKayar ? '' : 'h-full'}`} data-karsilastirma-panelleri="" data-grup-panelleri={gruplar.length}>
                  {gruplar.map((g, gi) => (
                    <React.Fragment key={`${etkinKume}-g-${g.kategori}`}>
                    {gi > 0 && <PanelAyraci />}
                    <NoktaGrafigi
                      // Renk anahtarı gruplayan değişkense (ya da yoksa) her panel tek renk: grubun anahtar rengi
                      // (lejant panel başlığını yinelemez); başka bir kategorik değişkense noktalar ona göre renklenir
                      seriIndeksi={grupRenkli ? (renkEslemi ? Math.max(0, renkEslemi.kategoriler.indexOf(g.kategori)) : gi) : undefined}
                      // Grup adı bir renk adıysa ("Kırmızı") anahtarın rengi paletten farklıdır: panel birebir o rengi alır
                      renk={grupRenkli && renkEslemi ? renkEslemi.renkler.get(g.kategori) : undefined}
                      ortakYigin={ortakYigin}
                      akis={akis}
                      tablo={tablo}
                      sutun={noktaSutun}
                      satirlar={g.satirlar}
                      seciliSatir={seciliGecerli}
                      onSatirSec={setSeciliSatir}
                      onDegiskenBirak={(id) => {
                        if (degiskenler.some((s) => s.id === id)) degiskenSecimi(id, 'degisken');
                      }}
                      aralik={aralik}
                      secenekler={secenekler}
                      sutunModu={sutunModu}
                      genislik={panelGenislik}
                      yukseklik={panelYukseklik}
                      azaltilmisHareket={azaltilmisHareket}
                      surukleniyor={false}
                      baslik={g.baslik}
                      eksenAlani={noktaEksenAlani}
                      vurguSatir={vurguSatir}
                      kategoriSirasi={siraBul(noktaSutun)}
                      renkEslemi={grupRenkli ? null : renkEslemi}
                    />
                    </React.Fragment>
                  ))}
                </div>
              )}
              {!bos && sekme === 'nokta' && gruplar.length <= 1 && (
                <div
                  className={`flex w-full [&>*]:shrink-0 ${panelKayar ? '' : 'h-full'} ${ikiPanel ? 'flex-col' : ''}`}
                  data-karsilastirma-panelleri={ikiPanel ? '' : undefined}
                >
                  <NoktaGrafigi
                    key={`${etkinKume}-1`}
                    akis={akis}
                    tablo={tablo}
                    sutun={degiskenGecerli ? noktaSutun : -1}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    onDegiskenBirak={(id) => {
                      if (degiskenler.some((s) => s.id === id)) degiskenSecimi(id, 'degisken');
                    }}
                    aralik={aralik}
                    secenekler={secenekler}
                    sutunModu={sutunModu}
                    genislik={panelGenislik}
                    yukseklik={panelYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    surukleniyor={false}
                    baslik={ikiPanel ? tablo.sutunlar[noktaSutun]?.ad : undefined}
                    ortakYigin={ikiPanel ? ortakYigin : undefined}
                    eksenAlani={noktaEksenAlani}
                    vurguSatir={vurguSatir}
                    bosIpucu={toplama.bosIpucu}
                    kategoriSirasi={siraBul(noktaSutun)}
                    renkEslemi={renkEslemi}
                  />
                  {ikiPanel && <PanelAyraci />}
                  {ikiPanel && (
                    <NoktaGrafigi
                      key={`${etkinKume}-2`}
                      akis={akis}
                      tablo={tablo}
                      sutun={ikinciSutun}
                      seriIndeksi={1}
                      seciliSatir={seciliGecerli}
                      onSatirSec={setSeciliSatir}
                      onDegiskenBirak={(id) => {
                        if (degiskenler.some((s) => s.id === id)) degiskenSecimi(id, 'ikinciDegisken');
                      }}
                      aralik={aralik}
                      secenekler={secenekler}
                      sutunModu={sutunModu}
                      genislik={panelGenislik}
                      yukseklik={panelYukseklik}
                      azaltilmisHareket={azaltilmisHareket}
                      surukleniyor={false}
                      baslik={tablo.sutunlar[ikinciSutun]?.ad}
                      ortakYigin={ortakYigin}
                      eksenAlani={noktaEksenAlani}
                      vurguSatir={vurguSatir}
                      kategoriSirasi={siraBul(ikinciSutun)}
                      renkEslemi={renkEslemi}
                    />
                  )}
                </div>
              )}
              {!bos && sekme === 'sutun' &&
                (etkinKategorik || sutunSiklik ? (
                  // Kategorik değişken ya da çok veride değerlerin sıklığı (türetilmiş kategorik tablo)
                  <KategorikSutunGrafigi
                    tablo={sutunSiklik ? sutunSiklik.tablo : tablo}
                    sutun={etkinSutun}
                    sira={sutunSiklik ? sutunSiklik.sira : siraBul(etkinSutun)}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    renkEslemi={renkEslemi}
                    // Toplama sürerken sıklık ekseninin üst sınırı yalnız büyür; boşken ilk veriyi bekleyen ipucu
                    yEnAz={sutunSiklik ? undefined : toplama.yEnAz}
                    bosIpucu={toplama.bosIpucu}
                  />
                ) : (
                  <SutunGrafigi
                    tablo={tablo}
                    sutun={etkinSutun}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    onDegerDegis={degerDegis}
                    yuvarlamaAdimi={yuvarlamaAdimi}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    renkEslemi={renkEslemi}
                  />
                ))}
              {!bos && sekme === 'cizgi' &&
                (grafikSutun < 0 ? (
                  <div className="flex h-full items-center justify-center p-6" data-cizgi-kullanilamaz>
                    <p className="max-w-md rounded-[calc(var(--radius)-4px)] border border-border bg-background p-4 text-center text-[13px] text-muted-foreground">
                      <strong className="block text-foreground">Çizgi grafiği çizilemiyor.</strong>
                      {sekmeGerekceleri.cizgi} Kategorik veriler için Nokta, Sütun ya da Daire grafiğini deneyin.
                    </p>
                  </div>
                ) : (
                  <CizgiGrafigi
                    tablo={tablo}
                    sutunlar={cizgiSutunlari}
                    yuzdeGoster={cizgiYuzdeleri}
                    degerleriGoster={durum.degerleriGoster}
                    ikinciKesikli={cizgiIkinciKesikli || undefined}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    onDegerDegis={degerDegis}
                    yuvarlamaAdimi={yuvarlamaAdimi}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    renkEslemi={renkEslemi}
                  />
                ))}
              {!bos && sekme === 'daire' &&
                (daireModuEtkin === 'uygunDegil' ? (
                  <DaireBilgisi
                    degiskenAdi={adVeBirim(tablo.sutunlar[etkinSutun]?.ad ?? '').ad}
                    onSiklik={() => guncelle({ daireModu: 'siklik' })}
                    onSatir={() => guncelle({ daireModu: 'satir' })}
                  />
                ) : kategorikDaire ? (
                  <DaireGrafigi
                    tablo={kategorikDaire.tablo}
                    sutun={1}
                    seciliSatir={null}
                    onSatirSec={() => undefined}
                    onDegerlerDegis={() => undefined}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    surukleKapali
                    renkler={kategorikDaire.renkler}
                    halka={kategorikDaire.halka}
                    aciklama={kategorikDaire.aciklama}
                  />
                ) : (
                  <DaireGrafigi
                    tablo={tablo}
                    sutun={etkinSutun}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    onDegerlerDegis={degerlerDegis}
                    yuvarlamaAdimi={yuvarlamaAdimi}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    aciklama="Her dilim, değerin toplam içindeki payını gösterir"
                    renkEslemi={renkEslemi}
                  />
                ))}
              {!bos && sekme === 'sacilim' &&
                (sacilim ? (
                  <SacilimGrafigi
                    tablo={tablo}
                    xSutun={sutunIndeksi(tablo, sacilim.x)}
                    ySutun={sutunIndeksi(tablo, sacilim.y)}
                    renkEslemi={renkEslemi}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-6" data-sacilim-kullanilamaz>
                    <p className="max-w-md rounded-[calc(var(--radius)-4px)] border border-border bg-background p-4 text-center text-[13px] text-muted-foreground">
                      <strong className="block text-foreground">Saçılım grafiği çizilemiyor.</strong>
                      {sekmeGerekceleri.sacilim}
                    </p>
                  </div>
                ))}
              {!bos && sekme === 'istatistik' &&
                (etkinKategorik ? (
                  <KategorikIstatistik
                    tablo={tablo}
                    sutun={etkinSutun}
                    sira={siraBul(etkinSutun)}
                    renkEslemi={renkEslemi}
                    deneyVerisi={toplama.deneyVerisi}
                  />
                ) : (
                  <IstatistikPaneli
                    tablo={tablo}
                    sutun={etkinSutun}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    adimlariGoster={adimlariGoster}
                    onAdimlariGoster={(v) => guncelle({ adimlariGoster: v })}
                    renkEslemi={renkEslemi}
                    ikinciSutun={ikinciSayisal ? ikinciSutun : undefined}
                  />
                ))}
            </div>
          )}
          </div>
          {/* Tablo bandı (panel açık, `bantli`): grafiğin altında, seçenek şeridinin üstünde. Yüksekliğini tablo kendisi
              belirler (kapalı 44 px: "Tablo · 24 satır · son: Elma"; açık: son 3 satır + alt şerit). Tost bandın başlığının
              üstünde durur (grafiğin eksen yazılarını örtmez) */}
          {bantVar && (
            // Üst çizgi bindirmedir (kenarlık değil): kapalı bant tam 44 px, açık bant ≤ 216 px kalır
            <div
              ref={tabloKapRef}
              className="relative shrink-0 bg-card before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-[25] before:h-px before:bg-border"
              data-tablo-bandi-kabi=""
            >
              {tabloOgesi}
              <Tost tost={tost} onKapat={tostKapat} alt={tostAlti} sag={tostSag} />
            </div>
          )}
          {/* Seçenek şeridi: bu grafiğin seçenekleri grafiğin altında ince bir şerit (yalnız grafik sütununda; seçenek yoksa şerit yok) */}
      {seritVar && (
      // Tek satır, en çok 52 px (üst çizgi gölgeyle); sığmayan içerik yatay kayar (çubuk gizli), darda etiketler gizlenir
      <div
        className="flex shrink-0 flex-nowrap items-center gap-x-3 overflow-x-auto overflow-y-hidden bg-background px-2 py-0.5 text-[13px] shadow-[inset_0_1px_0_hsl(var(--border))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-secenek-seridi
        data-serit-duzeyi={seritDuzeyi}
        data-dar={seritDar ? '' : undefined}
      >
        {sekme === 'nokta' && (
          <div className="flex shrink-0 flex-nowrap items-center gap-x-3">
            {karsilastirSecimi(karsAdaylari, karsTuru !== null ? durum.ikinciDegisken ?? '' : '')}
            {/* Göster / gizle seçenekleri: basılı düğme grubu (onay kutusu yerine). Kategorik değişkende ortalama ve
                ortalama mutlak sapma hesaplanmaz: düğmeleri hiç gösterilmez */}
            <div role="group" aria-label="Grafik seçenekleri" className="inline-flex shrink-0 flex-nowrap gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-0.5">
              {noktaSecenekDugmeleri.map(([anahtar, ad], i) => {
                const acik = anahtar === 'sutunModu' ? sutunModu : secenekler[anahtar] === true;
                const simge = noktaDugmesiSimge(i);
                return (
                  <button
                    key={anahtar}
                    type="button"
                    aria-pressed={acik}
                    disabled={!degiskenGecerli || bos}
                    title={simge ? ad : undefined}
                    className={SECENEK_DUGMESI(acik, simge)}
                    onClick={() =>
                      anahtar === 'sutunModu' ? guncelle({ sutunModu: !sutunModu }) : guncelle({ secenekler: { ...secenekler, [anahtar]: !secenekler[anahtar] } })
                    }
                  >
                    <SecenekSimgesi ad={anahtar === 'sutunModu' ? 'sutunlar' : anahtar} />
                    <span className={simge ? 'sr-only' : undefined}>{ad}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Saçılım: yatay eksen üstteki sekmeden, dikey eksen buradan */}
        {sekme === 'sacilim' && sacilim && (
          <label className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
            <span className={seritEtiketiGizli ? 'sr-only' : 'font-bold text-muted-foreground'}>Dikey eksen (y):</span>
            <select
              className={SECIM}
              value={sacilim.y}
              onChange={(e) => guncelle({ yDegisken: e.target.value || null })}
              aria-label="Saçılım grafiğinin dikey ekseni"
            >
              {sayisalDegiskenler
                .filter((s) => s.id !== sacilim.x)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ad}
                  </option>
                ))}
            </select>
          </label>
        )}
        {/* Çizgi: seçili değişken + istenirse aynı birimli ikinci sayısal değişken; noktaların değerleri (yuvarlama adımı
            Grafik ayarları menüsünde) */}
        {sekme === 'cizgi' && grafikSutun >= 0 && (
          <div className="flex shrink-0 flex-nowrap items-center gap-x-3">
            {karsilastirSecimi(karsAdaylari, ikinciSayisal && durum.ikinciDegisken !== grafikSutunId ? durum.ikinciDegisken ?? '' : '')}
            <div role="group" aria-label="Grafik seçenekleri" className="inline-flex shrink-0 flex-nowrap gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-0.5">
              <button
                type="button"
                aria-pressed={durum.degerleriGoster}
                disabled={bos}
                title={seritDar ? 'Değerleri göster' : 'Her noktanın değerini yanına yaz'}
                className={SECENEK_DUGMESI(durum.degerleriGoster, seritDar)}
                onClick={() => guncelle({ degerleriGoster: !durum.degerleriGoster })}
                data-degerleri-goster
              >
                <SecenekSimgesi ad="degerler" />
                <span className={seritDar ? 'sr-only' : undefined}>Değerleri göster</span>
              </button>
            </div>
          </div>
        )}
        {/* Daire, sayısal değişken: her satır bir dilim ya da değerlerin sıklığı (bilgi kutusunda ikisi de seçili değil) */}
        {sekme === 'daire' && daireSayisal && (
          <div role="radiogroup" aria-label="Daire grafiğinin dilimleri" className="inline-flex shrink-0 flex-nowrap gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-0.5" data-daire-modu={daireModuEtkin ?? undefined}>
            {DAIRE_SECIMLERI.map(([mod, ad], i) => {
              const secili = daireModuEtkin === mod;
              const odaklanir = secili || (daireModuEtkin === 'uygunDegil' && i === 0);
              return (
                <button
                  key={mod}
                  type="button"
                  role="radio"
                  aria-checked={secili}
                  tabIndex={odaklanir ? 0 : -1}
                  disabled={bos}
                  title={seritDar ? ad : undefined}
                  className={SECENEK_DUGMESI(secili, seritDar)}
                  onKeyDown={(e) => radyoTusu(e, i, DAIRE_SECIMLERI.length, (h) => guncelle({ daireModu: DAIRE_SECIMLERI[h][0] }))}
                  onClick={() => guncelle({ daireModu: mod })}
                >
                  <SecenekSimgesi ad={mod === 'satir' ? 'dilimSatir' : 'dilimSiklik'} />
                  <span className={seritDar ? 'sr-only' : undefined}>{ad}</span>
                </button>
              );
            })}
          </div>
        )}
        {/* Sütun, çok veride: değerlerin sıklığı çiziliyor (her satır bir sütun okunmaz) */}
        {sekme === 'sutun' && sutunSiklik && (
          <span
            className="inline-flex h-11 shrink-0 items-center gap-1.5 px-1 text-[12px] font-semibold text-muted-foreground"
            title={`${noktaDegerler.length} veri var: her satır yerine her değerin kaç kez görüldüğü çizildi.`}
            data-siklik-notu
          >
            <SecenekSimgesi ad="sutunlar" />
            <span className={seritDar ? 'sr-only' : undefined}>Değerlerin sıklığı gösteriliyor</span>
          </span>
        )}
        {/* İstatistik, sayısal değişken: aynı birimli ikinci değişkenle iki sütunlu ölçü tablosu */}
        {sekme === 'istatistik' &&
          !etkinKategorik &&
          karsilastirSecimi(karsAdaylari, ikinciSayisal ? durum.ikinciDegisken ?? '' : '')}
      </div>
      )}
        </main>
      </div>
    </div>
  );
}
