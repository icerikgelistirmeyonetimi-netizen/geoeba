'use client';

/**
 * Sayı küpü ve iki sayı küpü sahnesi (VT §11.4). viewBox 200 × 200.
 * - Küp: yuvarlak kare (rx 18), dolgu kart, kenar mürekkep 3,5; benekler r = 8,5 (%26 / %50 / %74);
 *   sağ altta 4 birim kaydırılmış gölge. Sayısal nesne tek renklidir ("renk = kategori" kuralı bozulmaz).
 * - Atış (T): %0–70 dönme −15° → 12° → −6° → 0°, ±10 birim sıçrama; yüz 90 ms'de bir değişir
 *   (verilmezse kararlı sözde rastgele dizi); %70'te sonuç yüzünde durur.
 * - İki küp: yan yana (her biri alanın %40'ı, aralık 24), aralarında soluk "+"; altta "= 7" balonu
 *   (bg-primary); balon sonuç yazılınca 150 ms büyüyüp yerine oturur.
 * - Benekler yedi sabit konumdadır; yüz değişimi beneklerin opaklığıyla (adımlı Web Animations) yapılır.
 */
import React, { useRef } from 'react';
import { useCizimEtkisi } from '../kancalar';
import { BENEK_ADLARI, BENEK_KONUMLARI, benekGorunur } from '../nesneler';
import { kararliRastgele, svgYaziBoyu } from '../bicim';

export interface ZarAtisi {
  anahtar: number;
  sure: number;
  /** Küp başına ara yüzler (90 ms'de bir); verilmezse anahtardan üretilir */
  yuzDizisi?: number[][];
}

export interface ZarSahnesiProps {
  boyut: number;
  kupSayisi: 1 | 2;
  /** Son sonuç ([4] ya da [3, 4]); null → henüz atış yok */
  degerler: number[] | null;
  atis?: ZarAtisi | null;
  azaltilmisHareket?: boolean;
}

export const ZAR_SONUC_ORANI = 0.7;
const ARA_YUZ_MS = 90;
const BOS_YUZLER = [5, 2];

interface KupYeri {
  x: number;
  y: number;
  d: number;
}

function kupYerleri(kupSayisi: 1 | 2): KupYeri[] {
  // Tek küp sahneyi paranın diski kadar doldurur (sahnede küçük kalmasın); gölge altta
  if (kupSayisi === 1) return [{ x: 34, y: 24, d: 132 }];
  return [
    { x: 8, y: 32, d: 80 },
    { x: 112, y: 32, d: 80 },
  ];
}

/** Ara yüz dizisi: ardışık iki yüz aynı olmaz; son eleman sonuç değildir (sonuç ayrıca gösterilir) */
export function araYuzler(anahtar: number, kup: number, adet: number, sonuc: number): number[] {
  const rnd = kararliRastgele(anahtar * 7 + kup * 131 + 1);
  const dizi: number[] = [];
  let onceki = 0;
  for (let i = 0; i < adet; i++) {
    let y = 1 + Math.floor(rnd() * 6);
    if (y === onceki || (i === adet - 1 && y === sonuc)) y = (y % 6) + 1;
    if (y === onceki) y = (y % 6) + 1;
    dizi.push(y);
    onceki = y;
  }
  return dizi;
}

function Kup({
  yer,
  deger,
  kupRef,
  benekRef,
}: {
  yer: KupYeri;
  deger: number;
  kupRef: (el: SVGGElement | null) => void;
  benekRef: (i: number, el: SVGCircleElement | null) => void;
}) {
  const olcek = yer.d / 100;
  return (
    <g ref={kupRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      <g transform={`translate(${yer.x} ${yer.y}) scale(${olcek})`}>
        <rect x={4} y={5} width={100} height={100} rx={18} fill="hsl(var(--foreground))" opacity={0.15} />
        <rect x={0} y={0} width={100} height={100} rx={18} fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth={3.5} />
        {BENEK_ADLARI.map((b, i) => {
          const [x, y] = BENEK_KONUMLARI[b];
          return (
            <circle
              key={b}
              ref={(el) => benekRef(i, el)}
              cx={x}
              cy={y}
              r={8.5}
              fill="hsl(var(--foreground))"
              opacity={benekGorunur(deger, b) ? 1 : 0}
            />
          );
        })}
      </g>
    </g>
  );
}

export function ZarSahnesi({ boyut, kupSayisi, degerler, atis = null, azaltilmisHareket = false }: ZarSahnesiProps) {
  const yerler = kupYerleri(kupSayisi);
  const gorunen = yerler.map((_, i) => degerler?.[i] ?? BOS_YUZLER[i]);
  const bos = degerler === null;
  const kupRefleri = useRef<(SVGGElement | null)[]>([]);
  const benekRefleri = useRef<(SVGCircleElement | null)[][]>([[], []]);
  const balonRef = useRef<SVGGElement>(null);

  const anahtar = atis?.anahtar ?? null;
  const sure = atis?.sure ?? 0;

  useCizimEtkisi(() => {
    if (anahtar === null || azaltilmisHareket || sure <= 0) return;
    const animler: Animation[] = [];
    const sonuc = ZAR_SONUC_ORANI;
    yerler.forEach((_, k) => {
      const kup = kupRefleri.current[k];
      if (!kup || typeof kup.animate !== 'function') return;
      const yon = k === 0 ? 1 : -1;
      animler.push(
        kup.animate(
          [
            { offset: 0, transform: 'translateY(0px) rotate(0deg)', easing: 'ease-out' },
            { offset: 0.16, transform: `translateY(-10px) rotate(${-15 * yon}deg)`, easing: 'ease-in' },
            { offset: 0.36, transform: `translateY(0px) rotate(${12 * yon}deg)`, easing: 'ease-out' },
            { offset: 0.52, transform: `translateY(-5px) rotate(${-6 * yon}deg)`, easing: 'ease-in' },
            { offset: sonuc, transform: 'translateY(0px) rotate(0deg)' },
            { offset: 1, transform: 'translateY(0px) rotate(0deg)' },
          ],
          { duration: sure + k * 40 },
        ),
      );
      // Ara yüzler: 90 ms'de bir, %70'e kadar; sonra sonuç yüzü (durağan çizim)
      const adet = Math.max(1, Math.floor((sure * sonuc) / ARA_YUZ_MS));
      const dizi = atis?.yuzDizisi?.[k]?.slice(0, adet) ?? araYuzler(anahtar, k, adet, gorunen[k]);
      benekRefleri.current[k]?.forEach((benek, bi) => {
        if (!benek) return;
        const ad = BENEK_ADLARI[bi];
        const kareler: Keyframe[] = dizi.map((y, j) => ({
          offset: (j / dizi.length) * sonuc,
          opacity: benekGorunur(y, ad) ? 1 : 0,
          easing: 'steps(1, end)',
        }));
        kareler.push({ offset: sonuc, opacity: benekGorunur(gorunen[k], ad) ? 1 : 0 });
        kareler.push({ offset: 1, opacity: benekGorunur(gorunen[k], ad) ? 1 : 0 });
        animler.push(benek.animate(kareler, { duration: sure + k * 40 }));
      });
    });
    const balon = balonRef.current;
    if (balon && typeof balon.animate === 'function') {
      const b = sonuc + Math.min(0.2, 150 / sure);
      animler.push(
        balon.animate(
          [
            { offset: 0, opacity: 0, transform: 'scale(0.6)' },
            { offset: sonuc, opacity: 0, transform: 'scale(0.6)', easing: 'ease-out' },
            { offset: Math.min(0.97, sonuc + (b - sonuc) * 0.6), opacity: 1, transform: 'scale(1.15)', easing: 'ease-in-out' },
            { offset: Math.min(0.99, b), opacity: 1, transform: 'scale(1)' },
            { offset: 1, opacity: 1, transform: 'scale(1)' },
          ],
          { duration: sure },
        ),
      );
    }
    return () => animler.forEach((a) => a.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar]);

  const toplam = gorunen.reduce((t, d) => t + d, 0);
  const balonYazi = svgYaziBoyu(20, boyut, 200, 13);
  const balonG = Math.max(56, balonYazi * 2.9);
  const balonY = Math.max(36, balonYazi * 1.8);
  // Küçük sahnede balon yazısı sığmaz; toplam zaten son atış yuvasında yazar
  const balonVar = kupSayisi === 2 && boyut >= 140;

  return (
    <svg viewBox="0 0 200 200" width={boyut} height={boyut} overflow="visible" className="block" aria-hidden="true" focusable="false" data-zar-yuzleri={bos ? '' : gorunen.join(',')}>
      <g className="text-[#15302d] opacity-[.12] dark:text-black dark:opacity-40">
        {yerler.map((y, i) => (
          <ellipse key={i} cx={y.x + y.d / 2} cy={kupSayisi === 1 ? 178 : 130} rx={y.d * 0.46} ry={kupSayisi === 1 ? 6 : 5} fill="currentColor" />
        ))}
      </g>
      <g opacity={bos ? 0.55 : 1}>
        {yerler.map((y, k) => (
          <Kup
            key={k}
            yer={y}
            deger={gorunen[k]}
            kupRef={(el) => {
              kupRefleri.current[k] = el;
            }}
            benekRef={(i, el) => {
              if (!benekRefleri.current[k]) benekRefleri.current[k] = [];
              benekRefleri.current[k][i] = el;
            }}
          />
        ))}
      </g>
      {kupSayisi === 2 && (
        <text x={100} y={72 + svgYaziBoyu(18, boyut, 200, 12.5) * 0.36} textAnchor="middle" fontSize={svgYaziBoyu(18, boyut, 200, 12.5)} fontWeight={800} fill="hsl(var(--muted-foreground))">
          +
        </text>
      )}
      {balonVar && !bos && (
        <g ref={balonRef} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} data-toplam-balonu={toplam}>
          <rect x={100 - balonG / 2} y={172 - balonY} width={balonG} height={balonY} rx={balonY / 2} fill="hsl(var(--primary))" />
          <text x={100} y={172 - balonY / 2 + balonYazi * 0.36} textAnchor="middle" fontSize={balonYazi} fontWeight={800} fill="hsl(var(--primary-foreground))">
            = {toplam}
          </text>
        </g>
      )}
    </svg>
  );
}
