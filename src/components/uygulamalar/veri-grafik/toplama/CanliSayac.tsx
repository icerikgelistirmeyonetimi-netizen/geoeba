'use client';

/**
 * Canlı sayaç (VT §11.8): sahne kartında son atış yuvasının altında durur.
 * - Yüzdeler grafikle aynı kuralla yazılır (en çok 1 ondalık: %37,5 · %25): kutucuk, sayaç ve grafik aynı sayıyı
 *   gösterir. Hiç atış yokken yüzde yazılmaz ("0 · %0" değil, yalnız "0").
 * - ≤ 3 sonuç (para, iki renkli torba, iki dilimli çark): her sonuç 22 px'lik satır — renk noktası + ad +
 *   çetele (n ≤ 30; üstünde ince renkli çubuk) + sağda "12 · %60"; altta 10 px yığılmış oran çubuğu ve
 *   teorik değerlerde 2 px kesikli çentik; yanında "teorik %50". Çetele yalnız okunur boyda (14 px) 30 işarete
 *   yer varsa çizilir (dikey kart, 1920); daha dar sütunda aynı yerde ince çubuk, çok dar sütunda (yatay kart,
 *   1366) yalnız sayı ve yüzde durur — seçim bir deney boyunca değişmez, çetele okunmaz derecede küçülmez.
 * - 4–6 sonuç (sayı küpü): geniş sütunda 3 × 2, dar sütunda 2 × 3 ızgara (`izgaraSutunu`); her hücrede zar yüzü
 *   (20 px; beşli ile altılı ayırt edilir) ya da renk noktası, sayı ve yüzde; en sık olan kalın yazılır. Teorik
 *   değer düz metindir ("her yüz için teorik %16,7"; işaret ettiği çubuk olmadığından çentik simgesi yok).
 * - 7–12 sonuç / iki küp toplamı: tek satır özet (eşitlikte "en sık toplamlar: 6 ve 7 (her biri %19)") ve altında ince
 *   sütunlar (28 px; sütun 170 px'ten darsa çizilmez: etiketsiz küçük çubuklar okunmaz, dağılım grafikte); `doldur` ile
 *   kabın yüksekliğini alan sütunlar ve her sütunun altında sonuç (Elle kaydet · iki küp: gerçek atışların dağılımı).
 * - Geri atmadan çekiş: teorik çentik yoktur; yerine "Torbada kalan" satırı gelir.
 */
import React, { useRef } from 'react';
import { useBoyut } from '../ortak';
import { Cetele, ceteleGenisligi } from './Cetele';
import { oranMetni, yuzdeMetni } from './bicim';
import { RenkNoktasiKucuk, ZarYuzu } from './nesneler';

export interface SayacSonucu {
  etiket: string;
  sayi: number;
  renk: string;
  /** Teorik olasılık (0–1); yoksa null */
  teorik?: number | null;
}

export type SayacBicimi = 'satir' | 'izgara' | 'dagilim';

export interface CanliSayacProps {
  sonuclar: SayacSonucu[];
  /** Yüzde paydası; verilmezse sayıların toplamı */
  toplam?: number;
  bicim?: SayacBicimi;
  /** Izgarada zar yüzü çizilsin (sayı küpü) */
  zarYuzu?: boolean;
  teorikGoster?: boolean;
  /** İzlenen (sayılan) sonuç: teorik yazısı onunla kurulur */
  izlenen?: string | null;
  /** Geri atılmayan çekiş: "Torbada kalan: 2 kırmızı, 1 mavi" (teorik çentik yerine) */
  kalanMetni?: string | null;
  /** Dağılım biçiminde ek metin: "teorik 6/36 = %16,7" */
  teorikMetni?: string | null;
  /** Atış birimi (dağılım satırı): "atış" · "çevirme" · "çekiş" */
  birim?: string;
  /** Dağılımda "en sık toplam" yerine "en sık" + ad (tek küp dışı) */
  enSikAdi?: string;
  /** Eşitlikte kullanılan çoğul; verilmezse "en sık toplam" → "en sık toplamlar", öbürü aynen */
  enSikCogulAdi?: string;
  /** Izgarada eşit teorik değerin öznesi: "her yüz için teorik %16,7" (sayı küpü) */
  teorikOzne?: string;
  /**
   * Dağılım kabını doldursun (Elle kaydet · iki küp): sütunlar kalan yüksekliği alır ve her sütunun altında sonucu
   * yazar (2 … 12); verilmezse 28 px'lik ince sütunlar ve yalnız uç etiketler
   */
  doldur?: boolean;
  className?: string;
}

/** Sayaçta çetele en çok bu sayıya kadar çizilir (üstünde ince çubuk) */
export const CETELE_SINIRI = 30;
/** Sayaç çetelesinin satır yüksekliği (px): bundan küçüğü uzaktan okunmaz */
const CETELE_BOYU = 14;

/** Satır çubuğunun anlamlı olduğu en küçük genişlik (px) */
const CUBUK_EN_AZ = 56;

/** Satır biçiminde çeteleye kalan genişlik: nokta 10 + ad 56 + sayı 88 ("12 · %37,5") + üç boşluk 24 */
export function ceteleYeri(genislik: number): number {
  return genislik - 178;
}

/**
 * Izgara biçiminde sütun sayısı: her hücre en az ≈ 96 px ister (20 px yüz + "350" + "%16,7"; bir deneyde bir yüz en
 * çok birkaç yüz kez gelir)
 */
export function izgaraSutunu(genislik: number): 2 | 3 {
  return genislik >= 3 * 96 + 2 * 12 ? 3 : 2;
}

/** Dağılımın küçük sütunları bu genişlikten darsa çizilmez (11 etiketsiz çubuk okunmaz) */
export const DAGILIM_CUBUK_EN_AZ = 170;

/** Hiç atış yokken boş (yüzde ilk atışla gelir); ötekinde grafikle aynı: en çok 1 ondalık */
function yuzde(sayi: number, payda: number): string {
  return payda > 0 ? yuzdeMetni(sayi, payda, 1) : '';
}

/** "6" · "6 ve 7" · "5, 6 ve 7" */
export function veIleBirlestir(ogeler: readonly string[]): string {
  if (ogeler.length <= 1) return ogeler[0] ?? '';
  return `${ogeler.slice(0, -1).join(', ')} ve ${ogeler[ogeler.length - 1]}`;
}

/**
 * Dağılım özeti: "en sık toplam: 7 (%17)"; eşitlikte "en sık toplamlar: 6 ve 7 (her biri %19)"; hiç atış yokken
 * "Henüz atış yok".
 */
export function enSikMetni(sonuclar: readonly SayacSonucu[], payda: number, enSikAdi: string, cogulAdi: string, birim: string): string {
  const enCok = sonuclar.reduce((m, s) => Math.max(m, s.sayi), 0);
  const liderler = enCok > 0 ? sonuclar.filter((s) => s.sayi === enCok) : [];
  if (liderler.length === 0) return `Henüz ${birim} yok`;
  const y = yuzdeMetni(enCok, payda > 0 ? payda : enCok, 1);
  if (liderler.length === 1) return `${enSikAdi}: ${liderler[0].etiket} (${y})`;
  return `${cogulAdi}: ${veIleBirlestir(liderler.map((s) => s.etiket))} (her biri ${y})`;
}

/** Sonuç sayısına göre sayaç biçimi */
export function sayacBicimi(adet: number): SayacBicimi {
  if (adet <= 3) return 'satir';
  if (adet <= 6) return 'izgara';
  return 'dagilim';
}

/** Kesikli dikey çentik simgesi ("┆" yerine elle çizilmiş) */
function CentikSimgesi() {
  return (
    <svg viewBox="0 0 6 14" width={6} height={14} aria-hidden="true" focusable="false" className="shrink-0">
      <path d="M3 1v12" stroke="currentColor" strokeWidth={2} strokeDasharray="2.6 2" strokeLinecap="round" />
    </svg>
  );
}

function teorikYazisi(sonuclar: SayacSonucu[], izlenen: string | null | undefined): string | null {
  const t = sonuclar.filter((s) => typeof s.teorik === 'number') as (SayacSonucu & { teorik: number })[];
  if (t.length === 0) return null;
  const ilk = t[0].teorik;
  if (t.every((s) => Math.abs(s.teorik - ilk) < 1e-9)) return `teorik ${oranMetni(ilk, 1)}`;
  const iz = t.find((s) => s.etiket === izlenen);
  if (iz) return `teorik: ${iz.etiket} ${oranMetni(iz.teorik, 1)}`;
  return `teorik: ${t.map((s) => `${s.etiket} ${oranMetni(s.teorik, 1)}`).join(' · ')}`;
}

export function CanliSayac({
  sonuclar,
  toplam,
  bicim,
  zarYuzu = false,
  teorikGoster = true,
  izlenen = null,
  kalanMetni = null,
  teorikMetni = null,
  birim = 'atış',
  enSikAdi = 'en sık',
  enSikCogulAdi,
  teorikOzne,
  doldur = false,
  className = '',
}: CanliSayacProps) {
  const payda = toplam ?? sonuclar.reduce((t, s) => t + s.sayi, 0);
  const tur = bicim ?? sayacBicimi(sonuclar.length);
  const enCok = sonuclar.reduce((m, s) => Math.max(m, s.sayi), 0);
  const kapRef = useRef<HTMLDivElement>(null);
  const { genislik } = useBoyut(kapRef, { genislik: 200, yukseklik: 0 });

  if (tur === 'satir') {
    const yer = ceteleYeri(genislik);
    const ceteleVar = payda <= CETELE_SINIRI && yer >= ceteleGenisligi(CETELE_SINIRI, CETELE_BOYU, 1);
    // Çok dar sütunda satır çubuğu da okunmaz: yalnız sayı ve yüzde kalır (oran altta yığılmış çubukta)
    const cubukVar = !ceteleVar && yer >= CUBUK_EN_AZ;
    // Teorik sınırlar: yığılmış çubuktaki kümülatif teorik değerler (son sınır hariç)
    const sinirlar: number[] = [];
    if (teorikGoster && !kalanMetni && sonuclar.every((s) => typeof s.teorik === 'number')) {
      let k = 0;
      sonuclar.slice(0, -1).forEach((s) => {
        k += s.teorik as number;
        sinirlar.push(k);
      });
    }
    const yazi = teorikGoster && !kalanMetni ? teorikYazisi(sonuclar, izlenen) : null;
    return (
      <div ref={kapRef} className={`flex min-w-0 flex-col gap-0.5 ${className}`} data-sayac="satir" data-sayac-cetele={ceteleVar ? '' : undefined}>
        {sonuclar.map((s) => (
          <div key={s.etiket} className="flex h-[22px] min-w-0 items-center gap-2" data-sayac-sonucu={s.etiket}>
            <RenkNoktasiKucuk renk={s.renk} />
            <span
              className={`truncate text-[13px] font-bold leading-4 ${ceteleVar || cubukVar ? 'w-14 shrink-0' : 'min-w-0 flex-1'}`}
              title={s.etiket}
            >
              {s.etiket}
            </span>
            <span className={`flex min-w-0 items-center overflow-hidden ${ceteleVar || cubukVar ? 'flex-1' : 'hidden'}`}>
              {ceteleVar ? (
                <Cetele sayi={s.sayi} renk={s.renk} yukseklik={CETELE_BOYU} enCokSatir={1} />
              ) : cubukVar ? (
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" data-sayac-cubugu="">
                  <span
                    className="block h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none"
                    style={{ width: `${payda > 0 ? (s.sayi / payda) * 100 : 0}%`, background: s.renk }}
                  />
                </span>
              ) : null}
            </span>
            <span className={`shrink-0 whitespace-nowrap text-right text-[13px] font-extrabold leading-4 tabular-nums ${ceteleVar || cubukVar ? 'min-w-[88px]' : ''}`}>
              {s.sayi}
              {payda > 0 && <span className="font-semibold text-muted-foreground"> · {yuzde(s.sayi, payda)}</span>}
            </span>
          </div>
        ))}
        {/* Yığılmış oran çubuğu ve teorik çentik; teorik yazısı aynı satırda sağda (dikey yer kazanır) */}
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <div className="relative h-2.5 min-w-0 flex-1" data-oran-cubugu="">
            <div className="flex h-full w-full overflow-hidden rounded-full bg-muted">
              {payda > 0 &&
                sonuclar.map((s) => (
                  <span key={s.etiket} className="block h-full" style={{ width: `${(s.sayi / payda) * 100}%`, background: s.renk }} />
                ))}
            </div>
            {sinirlar.map((x, i) => (
              <svg
                key={i}
                viewBox="0 0 4 18"
                width={4}
                height={18}
                className="absolute -top-1 -translate-x-1/2 text-foreground"
                style={{ left: `${x * 100}%` }}
                aria-hidden="true"
                focusable="false"
                data-teorik-centik={x}
              >
                <path d="M2 1v16" stroke="currentColor" strokeWidth={2} strokeDasharray="3 2" strokeLinecap="round" />
              </svg>
            ))}
          </div>
          {yazi && (
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[12px] font-semibold leading-4 text-muted-foreground">
              <CentikSimgesi />
              {yazi}
            </span>
          )}
        </div>
        {kalanMetni && <div className="mt-1 text-[12.5px] font-semibold leading-4 text-muted-foreground">{kalanMetni}</div>}
      </div>
    );
  }

  if (tur === 'izgara') {
    const hamYazi = teorikGoster ? teorikMetni ?? teorikYazisi(sonuclar, izlenen) : null;
    // Bütün sonuçlar eşit olasılıklıysa öznesiyle: "her yüz için teorik %16,7"
    const yazi = hamYazi && teorikOzne && hamYazi.startsWith('teorik %') ? `${teorikOzne} için ${hamYazi}` : hamYazi;
    return (
      <div ref={kapRef} className={`flex min-w-0 flex-col gap-1.5 ${className}`} data-sayac="izgara">
        {/* Hücre: yüz + sayı + yüzde (≈ 96 px; "350" ve "%16,7" sığar). Dar sütunda (sahne kartının sağı) 2 sütun × 3 satır */}
        <div className="grid gap-x-3 gap-y-1" style={{ gridTemplateColumns: `repeat(${izgaraSutunu(genislik)}, minmax(0, 1fr))` }}>
          {sonuclar.map((s) => {
            const lider = s.sayi > 0 && s.sayi === enCok;
            return (
              <div key={s.etiket} className="flex h-6 min-w-0 items-center gap-1.5" data-sayac-sonucu={s.etiket}>
                {zarYuzu ? <ZarYuzu deger={Number(s.etiket)} boyut={20} /> : <RenkNoktasiKucuk renk={s.renk} />}
                {!zarYuzu && <span className="min-w-0 truncate text-[12px] font-semibold">{s.etiket}</span>}
                <span className={`shrink-0 text-[13px] tabular-nums ${lider ? 'font-extrabold' : 'font-semibold'}`}>{s.sayi}</span>
                <span className="ml-auto shrink-0 text-[12px] tabular-nums text-muted-foreground">{yuzde(s.sayi, payda)}</span>
              </div>
            );
          })}
        </div>
        {yazi && (
          <div className="text-[12px] font-semibold leading-4 text-muted-foreground" data-sayac-teorik="">
            {yazi}
          </div>
        )}
        {kalanMetni && <div className="text-[12.5px] font-semibold leading-4 text-muted-foreground">{kalanMetni}</div>}
      </div>
    );
  }

  // Dağılım: en sık sonuç (kalın) + teorik (soluk) ve ince sütunlar; uç etiketler sütunların iki yanında
  // (alt satır yok: sahne kartının dar sağ sütununa sığar). Atış sayısı durum satırında ve alt çubukta yazar.
  const liderler = new Set(enCok > 0 ? sonuclar.filter((s) => s.sayi === enCok).map((s) => s.etiket) : []);
  const tepe = Math.max(1, enCok);
  const teorikVar = teorikGoster && !!teorikMetni;
  const cogul = enSikCogulAdi ?? (enSikAdi.endsWith('toplam') ? `${enSikAdi}lar` : enSikAdi);
  // Dar sütunda (1024'te sahne kartının sağı) etiketsiz küçük çubuklar okunmaz: yalnız özet satırı kalır
  const cubuklarVar = doldur || genislik >= DAGILIM_CUBUK_EN_AZ;
  return (
    <div
      ref={kapRef}
      className={`flex min-w-0 flex-col gap-1 ${doldur ? 'min-h-0' : ''} ${className}`}
      data-sayac="dagilim"
      data-sayac-birimi={birim}
      data-sayac-toplami={payda}
    >
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 leading-[18px]">
        <span className="text-[13px] font-extrabold tabular-nums" data-sayac-lider={[...liderler].join(' ')}>
          {enSikMetni(sonuclar, payda, enSikAdi, cogul, birim)}
        </span>
        {teorikVar && <span className="text-[12px] font-semibold text-muted-foreground">{teorikMetni}</span>}
      </p>
      {cubuklarVar && (
      <div className={`flex min-w-0 gap-1.5 ${doldur ? 'min-h-[28px] flex-1 items-stretch' : 'items-end'}`}>
        {!doldur && <span className="shrink-0 text-[12px] font-semibold leading-4 text-muted-foreground tabular-nums">{sonuclar[0]?.etiket}</span>}
        <div className={`flex min-w-0 flex-1 items-end gap-[3px] border-b-2 border-border ${doldur ? '' : 'h-7'}`} aria-hidden="true">
          {sonuclar.map((s) => {
            const vurgu = liderler.has(s.etiket);
            const teorikY = teorikGoster && typeof s.teorik === 'number' && payda > 0 ? Math.min(1, (s.teorik * payda) / tepe) : null;
            return (
              <span key={s.etiket} className="relative flex h-full min-w-0 flex-1 items-end">
                <span
                  className="block w-full rounded-t-[3px]"
                  style={{
                    height: `${(s.sayi / tepe) * 100}%`,
                    minHeight: s.sayi > 0 ? 2 : 0,
                    background: vurgu ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.45)',
                  }}
                />
                {teorikY !== null && (
                  <span className="absolute inset-x-0 border-t-2 border-dashed border-foreground/60" style={{ bottom: `${teorikY * 100}%` }} />
                )}
              </span>
            );
          })}
        </div>
        {!doldur && (
          <span className="shrink-0 text-[12px] font-semibold leading-4 text-muted-foreground tabular-nums">{sonuclar[sonuclar.length - 1]?.etiket}</span>
        )}
      </div>
      )}
      {doldur && (
        <div className="flex min-w-0 gap-[3px]" aria-hidden="true" data-sayac-etiketleri="">
          {sonuclar.map((s) => (
            <span key={s.etiket} className="min-w-0 flex-1 text-center text-[12px] font-semibold leading-4 tabular-nums text-muted-foreground">
              {s.etiket}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
