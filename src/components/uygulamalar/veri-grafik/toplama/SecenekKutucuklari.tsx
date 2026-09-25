'use client';

/**
 * Seçenek kutucukları (VT §6.5, §11.7): anket cevapları ve Deney · Elle kaydet sonuçları.
 * - Kutucuk: solda 7 px kategori şeridi; ad (16 px, 800) ve sağda sayı (22–52 px, 800); altında yüzde (grafikle aynı
 *   kural: en çok 1 ondalık, %37,5; hiç cevap yokken yazılmaz); altta çetele.
 * - Dokununca 150 ms basılı görünür ve "+1" yukarı süzülür (azaltılmış harekette yok); touch-action: manipulation.
 * - Izgara: ≤ 6 kutucuk 2 sütun, 7–13 kutucuk 3 sütun (anket). Yükseklik kalan alana göre
 *   clamp(64, (kalan − (satır − 1) × 8) / satır, kalan ≥ 700 ? 240 : 160) — useBoyut (offsetHeight) ile ölçülür
 *   (büyük ekranda panelde boş alan kalmasın). Sayı ve çetele kutucuk yüksekliğiyle büyür (146 px'te 44 ve 34 px); dar kutucukta (3 sütun) ad
 *   üst satırın tamamını alır, sayı ve yüzde altında durur (uzun adlar kesilmez).
 * - Deney · Elle kaydet (para, zar, torba rengi, çark dilimi): kutucuklar alanı doldurur (en çok 360 px) ve nesne büyük çizilir — geniş
 *   kutucukta nesne solda, ad · sayı · yüzde · çetele sağda (para ve ≤ 3 renk tek sütun); dar ve uzun kutucukta
 *   (zar, 3 sütun) nesne üstte ortada, sayı ve çetele altında. Para kutucuğu sahnedeki paranın aynısıdır (YAZI / TURA).
 * - Anket: son kutucuk kesikli "+ Seçenek ekle"; yerinde yazı alanına dönüşür (Enter ekler, Escape vazgeçer).
 */
import React, { useEffect, useRef, useState } from 'react';
import { radyoTusu, useBoyut } from '../ortak';
import { Cetele } from './Cetele';
import { saydam, yuzdeMetni } from './bicim';
import { ArtiSimgesi } from './simgeler';
import { DilimResmi, MiniPara, RenkTopu, ZarYuzu } from './nesneler';
import { ParaResmi } from './sahneler/ParaSahnesi';

export type KutucukBicimi = 'metin' | 'para' | 'zar' | 'renk' | 'dilim';

export interface Kutucuk {
  etiket: string;
  sayi: number;
  renk: string;
  /** Gruplu ankette sağ altta "6-A 4 · 6-B 3" */
  grupMetni?: string | null;
  /** Deney: sonucun teorik olasılığı (0–1); çark kutucuğunda dilimin büyüklüğü */
  oran?: number | null;
}

export interface SecenekKutucuklariProps {
  kutucuklar: Kutucuk[];
  /** Yüzde paydası; verilmezse sayıların toplamı */
  toplam?: number;
  bicim?: KutucukBicimi;
  /** aria-label birimi: "cevap" · "atış" · "çevirme" · "çekiş" */
  birim?: string;
  onSec: (indeks: number) => void;
  /** Verilirse (anket) son kutucuk "+ Seçenek ekle" olur; false dönerse ad reddedilmiştir */
  onSecenekEkle?: (ad: string) => boolean | void;
  enCokSecenek?: number;
  azaltilmisHareket?: boolean;
  /** Akış sürerken dokunuş kapalı */
  kilitli?: boolean;
  className?: string;
}

export const KUTUCUK_BOSLUGU = 8;
export const EN_COK_SECENEK = 12;

/**
 * Izgara sütun ve satır sayısı (adet: kutucuklar + varsa "Seçenek ekle"). Deney nesneleri: para ve ≤ 3 renk tek
 * sütunda (geniş kutucuk: nesne solda, sayı sağda), 4–6 renk 2, zar 3 sütun (uzun alanda 2).
 */
export function kutucukIzgarasi(
  adet: number,
  bicim: KutucukBicimi = 'metin',
  alan?: { genislik: number; yukseklik: number },
): { sutun: number; satir: number } {
  // Uzun alanda (1920'de dikey panel) zar yüzleri 2 sütunda büyür; öbür durumlarda 3 sütun
  const uzunAlan = !!alan && alan.genislik > 0 && alan.yukseklik > alan.genislik * 1.4;
  const sutun =
    bicim === 'para'
      ? 1
      : bicim === 'zar'
        ? uzunAlan
          ? 2
          : 3
        : bicim === 'renk' || bicim === 'dilim'
          ? adet <= 3
            ? 1
            : adet <= 6
              ? 2
              : 3
          : adet <= 6
            ? 2
            : 3;
  return { sutun, satir: Math.max(1, Math.ceil(adet / sutun)) };
}

/**
 * Kutucuk yüksekliği: kalan alanı eşit böler; 64 ile 160 (kalan ≥ 700 ise 240) arasında. Deney nesnelerinde
 * (`doldur`) üst sınır 360: az kutucuk alanı doldurur, panelde boş alan kalmaz.
 */
export function kutucukYuksekligi(kalan: number, satir: number, doldur = false): number {
  const enCok = doldur ? 360 : kalan >= 700 ? 240 : 160;
  const pay = (kalan - (satir - 1) * KUTUCUK_BOSLUGU) / Math.max(1, satir);
  return Math.round(Math.max(64, Math.min(enCok, Number.isFinite(pay) ? pay : 64)));
}

/** Deney nesnesi kutucuğunun yerleşimi: geniş (nesne solda), uzun (nesne üstte) ya da sıkışık (nesne adın yanında) */
export function nesneYerlesimi(bicim: KutucukBicimi, genislik: number, yukseklik: number): 'genis' | 'uzun' | 'sikisik' {
  if (bicim === 'metin') return 'sikisik';
  if (yukseklik >= 96 && genislik >= yukseklik * 1.35 && genislik >= 200) return 'genis';
  if (yukseklik >= 140 && genislik >= 84) return 'uzun';
  return 'sikisik';
}

export function kutucukEtiketi(k: Kutucuk, birim: string): string {
  return `${k.etiket}: ${k.sayi} ${birim}. Bir ${birim} ekle`;
}

/** Süzülen "+1" (Web Animations; bitince kendini siler) */
function ArtiBir({ renk, onBitti }: { renk: string; onBitti: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  const bittiRef = useRef(onBitti);
  bittiRef.current = onBitti;
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function') {
      bittiRef.current();
      return;
    }
    const a = el.animate(
      [
        { transform: 'translateY(2px)', opacity: 0 },
        { transform: 'translateY(-4px)', opacity: 1, offset: 0.18 },
        { transform: 'translateY(-24px)', opacity: 0 },
      ],
      { duration: 700, easing: 'ease-out', fill: 'forwards' },
    );
    a.onfinish = () => bittiRef.current();
    return () => a.cancel();
  }, []);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-0.5 text-[16px] font-extrabold tabular-nums"
      style={{ color: renk, opacity: 0 }}
    >
      +1
    </span>
  );
}

interface Arti {
  no: number;
  indeks: number;
}

function EkleKutucugu({
  yukseklik,
  mevcut,
  onEkle,
  kilitli,
}: {
  yukseklik: number;
  mevcut: string[];
  onEkle: (ad: string) => boolean | void;
  kilitli?: boolean;
}) {
  const [yaziyor, setYaziyor] = useState(false);
  const [metin, setMetin] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const girdiRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (yaziyor) girdiRef.current?.focus();
  }, [yaziyor]);

  const vazgec = () => {
    setYaziyor(false);
    setMetin('');
    setHata(null);
  };
  const ekle = () => {
    const ad = metin.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!ad) {
      vazgec();
      return;
    }
    const kucuk = ad.toLocaleLowerCase('tr');
    if (mevcut.some((m) => m.trim().toLocaleLowerCase('tr') === kucuk)) {
      setHata('Bu seçenek zaten var.');
      return;
    }
    if (onEkle(ad) === false) return;
    vazgec();
  };

  return (
    <div
      className="flex min-w-0 flex-col justify-center rounded-[calc(var(--radius)-4px)] border-2 border-dashed border-border"
      style={{ height: yukseklik }}
      data-secenek-ekle=""
    >
      {yaziyor ? (
        <div className="flex flex-col gap-1 px-2">
          <input
            ref={girdiRef}
            value={metin}
            maxLength={24}
            placeholder="Yeni seçenek"
            aria-label="Yeni seçenek"
            aria-invalid={hata ? true : undefined}
            onChange={(e) => {
              setMetin(e.target.value);
              setHata(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                ekle();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                vazgec();
              }
            }}
            onBlur={() => {
              if (!metin.trim()) vazgec();
            }}
            className={`h-11 w-full min-w-0 rounded-[calc(var(--radius)-8px)] border bg-background px-2 text-[15px] font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              hata ? 'border-destructive' : 'border-border'
            }`}
          />
          {hata && <span className="text-[12px] font-semibold leading-4 text-destructive">{hata}</span>}
        </div>
      ) : (
        <button
          type="button"
          disabled={kilitli}
          onClick={() => setYaziyor(true)}
          className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-[calc(var(--radius)-6px)] text-[13px] font-bold text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <ArtiSimgesi className="h-5 w-5" />
          Seçenek ekle
        </button>
      )}
    </div>
  );
}

export function SecenekKutucuklari({
  kutucuklar,
  toplam,
  bicim = 'metin',
  birim = 'cevap',
  onSec,
  onSecenekEkle,
  enCokSecenek = EN_COK_SECENEK,
  azaltilmisHareket = false,
  kilitli = false,
  className = '',
}: SecenekKutucuklariProps) {
  const kapRef = useRef<HTMLDivElement>(null);
  const { genislik, yukseklik } = useBoyut(kapRef, { genislik: 386, yukseklik: 360 });
  const [basili, setBasili] = useState<number | null>(null);
  const [artilar, setArtilar] = useState<Arti[]>([]);
  const zamanRef = useRef<number | null>(null);
  const noRef = useRef(0);

  useEffect(
    () => () => {
      if (zamanRef.current !== null) window.clearTimeout(zamanRef.current);
    },
    [],
  );

  const ekleVar = !!onSecenekEkle && kutucuklar.length < enCokSecenek;
  const adet = kutucuklar.length + (ekleVar ? 1 : 0);
  const { sutun, satir } = kutucukIzgarasi(adet, bicim, { genislik, yukseklik });
  const h = kutucukYuksekligi(yukseklik, satir, bicim !== 'metin');
  const kutuG = (genislik - (sutun - 1) * KUTUCUK_BOSLUGU) / sutun;
  const payda = toplam ?? kutucuklar.reduce((t, k) => t + k.sayi, 0);

  // Kutucuk boyuna göre yazı ve çetele ölçüsü (akıllı tahtada uzaktan okunur; 64 px'te de sığar). Geniş kutucukta
  // sayı ve çetele kutucuğun yüksekliğiyle büyür: 1366'da (≈ 187 × 146) sayı 44 px, çetele 34 px; 1920'de (≈ 190 × 240)
  // 60 ve 54 px — kutucuğun ortası boş bir çerçeve gibi kalmaz. Çetele ikinci satıra yalnız yüksek kutucukta geçer.
  const buyuk = h >= 150 && kutuG >= 150;
  const dar = kutuG < 130;
  const sayiBoyu = dar ? (h >= 96 ? 28 : 22) : h >= 230 ? 60 : h >= 200 ? 52 : h >= 136 ? 44 : h >= 110 ? 36 : h >= 96 ? 28 : 22;
  const cetele = dar
    ? h >= 100 ? 22 : h >= 80 ? 18 : 14
    : h >= 230 ? 54 : h >= 200 ? 44 : h >= 136 ? 34 : h >= 110 ? 28 : h >= 100 ? 22 : h >= 80 ? 18 : 14;
  const ceteleSatiri: 1 | 2 = h >= 176 || (dar && h >= 128) ? 2 : 1;
  const adBoyu = buyuk ? 18 : dar ? 15 : 16;
  // Dar kutucukta (3 sütun) ad kendi satırında; sayı ve yüzde altında (zar yüzü ve para kendi düzeninde kalır)
  const altAlta = dar && (bicim === 'metin' || bicim === 'renk' || bicim === 'dilim');
  // Deney nesnesi büyük çizilir (geniş: solda; uzun: üstte)
  const yerlesim = nesneYerlesimi(bicim, kutuG, h);
  const nesneBoyu =
    yerlesim === 'genis'
      ? Math.round(Math.max(40, Math.min(h - 28, kutuG * 0.42, 200)))
      : yerlesim === 'uzun'
        ? Math.round(Math.max(36, Math.min(kutuG - 36, (h - 112) * 0.9, 150)))
        : 0;
  const nesneCiz = (k: Kutucuk, boy: number) =>
    bicim === 'para' ? (
      <ParaResmi boyut={boy} renk={k.renk} metin={k.etiket} />
    ) : bicim === 'zar' ? (
      <ZarYuzu deger={Number(k.etiket)} boyut={boy} />
    ) : bicim === 'dilim' ? (
      <DilimResmi renk={k.renk} oran={k.oran ?? 0} boyut={boy} />
    ) : (
      <RenkTopu renk={k.renk} boyut={boy} />
    );
  const buyukSayi = yerlesim === 'genis' ? (h >= 180 ? 44 : 36) : h >= 220 ? 36 : 30;

  const dokun = (i: number) => {
    if (kilitli) return;
    onSec(i);
    setBasili(i);
    if (zamanRef.current !== null) window.clearTimeout(zamanRef.current);
    zamanRef.current = window.setTimeout(() => setBasili(null), 150);
    if (!azaltilmisHareket) {
      noRef.current += 1;
      const no = noRef.current;
      setArtilar((a) => [...a.slice(-5), { no, indeks: i }]);
    }
  };

  return (
    <div ref={kapRef} className={`min-h-0 min-w-0 ${className}`} data-kutucuklar={bicim}>
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${sutun}, minmax(0, 1fr))`, gridAutoRows: `${h}px`, gap: KUTUCUK_BOSLUGU }}
      >
        {kutucuklar.map((k, i) => {
          const bas = basili === i;
          // Hiç cevap yokken "%0" yinelenmez (yüzde ilk cevapla gelir); grafikle aynı kural: en çok 1 ondalık (%37,5)
          const yuzde = payda > 0 ? yuzdeMetni(k.sayi, payda, 1) : '';
          return (
            <button
              key={`${k.etiket}-${i}`}
              type="button"
              data-secenek={k.etiket}
              aria-label={kutucukEtiketi(k, birim)}
              aria-disabled={kilitli || undefined}
              onClick={() => dokun(i)}
              className={`relative flex min-w-0 flex-col overflow-hidden rounded-[calc(var(--radius)-4px)] border bg-card py-2 pl-[17px] pr-2.5 text-left text-foreground transition-[transform,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                bas ? 'border-[#d9805f] shadow-[0_0_0_2px_rgba(217,128,95,0.35)]' : 'border-border hover:border-foreground/25'
              } ${bas && !azaltilmisHareket ? 'scale-[0.97]' : ''} ${kilitli ? 'cursor-not-allowed' : ''}`}
              style={{
                touchAction: 'manipulation',
                backgroundImage: `linear-gradient(135deg, ${saydam(k.renk, 0.1)}, ${saydam(k.renk, 0.02)} 70%)`,
              }}
            >
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[7px]" style={{ background: k.renk }} />
              {yerlesim === 'genis' ? (
                <span className="flex h-full min-w-0 items-center gap-4" data-nesne-kutucugu="genis">
                  {nesneCiz(k, nesneBoyu)}
                  <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                    {bicim !== 'zar' && (
                      <span className="truncate font-extrabold leading-6" style={{ fontSize: h >= 180 ? 22 : 18 }} title={k.etiket}>
                        {k.etiket}
                      </span>
                    )}
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="font-extrabold tabular-nums" style={{ fontSize: buyukSayi, lineHeight: `${buyukSayi}px` }} data-kutucuk-sayisi="">
                        {k.sayi}
                      </span>
                      <span className="text-[14px] font-semibold leading-4 text-muted-foreground tabular-nums">{yuzde}</span>
                    </span>
                    <Cetele sayi={k.sayi} renk={k.renk} yukseklik={h >= 180 ? 24 : 20} enCokSatir={h >= 150 ? 2 : 1} />
                  </span>
                </span>
              ) : yerlesim === 'uzun' ? (
                <span className="flex h-full min-w-0 flex-col items-center justify-center gap-1.5 pr-[7px]" data-nesne-kutucugu="uzun">
                  {nesneCiz(k, nesneBoyu)}
                  {bicim !== 'zar' && (
                    <span className="max-w-full truncate text-[16px] font-extrabold leading-5" title={k.etiket}>
                      {k.etiket}
                    </span>
                  )}
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-extrabold tabular-nums" style={{ fontSize: buyukSayi, lineHeight: `${buyukSayi}px` }} data-kutucuk-sayisi="">
                      {k.sayi}
                    </span>
                    <span className="text-[13px] font-semibold leading-4 text-muted-foreground tabular-nums">{yuzde}</span>
                  </span>
                  <span className="flex min-h-[18px] max-w-full justify-center overflow-hidden">
                    <Cetele sayi={k.sayi} renk={k.renk} yukseklik={18} enCokSatir={1} />
                  </span>
                </span>
              ) : altAlta ? (
                <>
                  <span className="flex min-w-0 items-center gap-1.5">
                    {bicim === 'renk' && <RenkTopu renk={k.renk} boyut={18} />}
                    {bicim === 'dilim' && <DilimResmi renk={k.renk} oran={k.oran ?? 0} boyut={20} />}
                    <span className="min-w-0 truncate font-extrabold leading-5" style={{ fontSize: adBoyu }} title={k.etiket}>
                      {k.etiket}
                    </span>
                  </span>
                  <span className="mt-1 flex min-w-0 items-baseline justify-between gap-1.5">
                    <span className="font-extrabold tabular-nums" style={{ fontSize: sayiBoyu, lineHeight: `${sayiBoyu}px` }} data-kutucuk-sayisi="">
                      {k.sayi}
                    </span>
                    <span className="text-[13px] font-semibold leading-4 text-muted-foreground tabular-nums">{yuzde}</span>
                  </span>
                </>
              ) : (
              <span className="flex min-w-0 items-start justify-between gap-1.5">
                <span className="flex min-w-0 items-center gap-2">
                  {bicim === 'para' && <MiniPara renk={k.renk} boyut={h >= 100 ? 40 : 30} />}
                  {bicim === 'zar' && <ZarYuzu deger={Number(k.etiket)} boyut={h >= 100 ? 40 : 28} />}
                  {bicim === 'renk' && <RenkTopu renk={k.renk} boyut={20} />}
                  {bicim === 'dilim' && <DilimResmi renk={k.renk} oran={k.oran ?? 0} boyut={24} />}
                  {bicim !== 'zar' && (
                    <span className="min-w-0 truncate font-extrabold leading-5" style={{ fontSize: adBoyu }} title={k.etiket}>
                      {k.etiket}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span
                    className="font-extrabold tabular-nums"
                    style={{ fontSize: sayiBoyu, lineHeight: `${sayiBoyu}px` }}
                    data-kutucuk-sayisi=""
                  >
                    {k.sayi}
                  </span>
                  <span className={`mt-0.5 font-semibold leading-4 text-muted-foreground tabular-nums ${sayiBoyu >= 44 ? 'text-[15px]' : 'text-[13px]'}`}>{yuzde}</span>
                </span>
              </span>
              )}
              {yerlesim === 'sikisik' && (
                <span className="mt-auto flex min-w-0 items-end justify-between gap-2">
                  <Cetele sayi={k.sayi} renk={k.renk} yukseklik={cetele} enCokSatir={ceteleSatiri} />
                  {k.grupMetni && (
                    <span className="shrink-0 whitespace-nowrap text-[12px] font-semibold leading-4 text-muted-foreground">{k.grupMetni}</span>
                  )}
                </span>
              )}
              {artilar
                .filter((a) => a.indeks === i)
                .map((a) => (
                  <ArtiBir key={a.no} renk={k.renk} onBitti={() => setArtilar((l) => l.filter((x) => x.no !== a.no))} />
                ))}
            </button>
          );
        })}
        {ekleVar && onSecenekEkle && (
          <EkleKutucugu yukseklik={h} mevcut={kutucuklar.map((k) => k.etiket)} onEkle={onSecenekEkle} kilitli={kilitli} />
        )}
      </div>
    </div>
  );
}

// ── İki sayı küpü · Elle kaydet ────────────────────────────────────────────────

export interface IkiZarKutucuklariProps {
  /** Seçilen yüzler; ikisi de seçilince üst bileşen satırı ekler ve seçimi boşaltır */
  secim: readonly [number | null, number | null];
  onSec: (kup: 0 | 1, deger: number) => void;
  kilitli?: boolean;
  /** Zar düğmesinin yüksekliği (px; 48–80): kalan alana göre */
  dugmeBoyu?: number;
  /** "İki küpü de seçince satır eklenir." satırı (alçak alanda düşer; aynı bilgi küp başlıklarının title'ında) */
  ipucu?: boolean;
  className?: string;
}

export function IkiZarKutucuklari({ secim, onSec, kilitli = false, dugmeBoyu = 48, ipucu = true, className = '' }: IkiZarKutucuklariProps) {
  const boy = Math.round(Math.max(48, Math.min(80, dugmeBoyu)));
  const yuz = Math.round(Math.min(48, boy * 0.62));
  return (
    <div className={`flex flex-col gap-2 ${className}`} data-kutucuklar="iki-zar">
      {([0, 1] as const).map((kup) => (
        <div key={kup} className="flex flex-col gap-1">
          <span className="text-[12px] font-extrabold tracking-wide text-muted-foreground" id={`iki-zar-${kup}`} title="İki küpü de seçince satır eklenir.">
            {kup + 1}. KÜP
          </span>
          <div role="radiogroup" aria-labelledby={`iki-zar-${kup}`} className="grid grid-cols-6 gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((d) => {
              const secili = secim[kup] === d;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={secili}
                  aria-label={`${kup + 1}. küp: ${d}`}
                  aria-disabled={kilitli || undefined}
                  tabIndex={secili || (secim[kup] === null && d === 1) ? 0 : -1}
                  data-secenek={`${kup + 1}-${d}`}
                  onClick={() => {
                    if (!kilitli) onSec(kup, d);
                  }}
                  onKeyDown={(e) => radyoTusu(e, d - 1, 6, (j) => {
                    if (!kilitli) onSec(kup, j + 1);
                  })}
                  className={`grid min-h-[44px] min-w-[44px] place-items-center rounded-[calc(var(--radius)-6px)] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    secili ? 'border-primary bg-accent shadow-[inset_0_0_0_1px_hsl(var(--primary))]' : 'border-border bg-card hover:bg-accent'
                  }`}
                  style={{ touchAction: 'manipulation', height: boy }}
                >
                  <ZarYuzu deger={d} boyut={yuz} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {ipucu && <p className="text-[12px] leading-4 text-muted-foreground">İki küpü de seçince satır eklenir.</p>}
    </div>
  );
}
