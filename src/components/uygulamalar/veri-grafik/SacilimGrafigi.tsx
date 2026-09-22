'use client';

/**
 * Saçılım grafiği: iki sayısal değişken arasındaki ilişki. Her satır bir nokta (x; y); noktaya tıklayınca
 * tablodaki satır seçilir (iki yönlü). İki değerden biri eksik satırlar çizilmez, sayısı köşeye not düşülür.
 * Eksenler veriye göre güzel adımlarla ve kenar payıyla kurulur (0'dan başlamak zorunda değildir).
 */
import React, { useMemo, useState } from 'react';
import { guzelEksen, type Eksen } from './istatistik';
import { dogrusalOlcek } from './grafik';
import { satirEtiketi, sayiOku, sayiYaz, type VeriTablosu } from './veri';
import { GECIS, RENK } from './ortak';
import { kategoriSayilari, satirRengi, type RenkEslemesi } from './kategorik';
import { RenkLejanti } from './RenkLejanti';

export interface SacilimGrafigiProps {
  tablo: VeriTablosu;
  /** yatay eksendeki sayısal sütunun indeksi */
  xSutun: number;
  /** dikey eksendeki sayısal sütunun indeksi */
  ySutun: number;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  genislik: number;
  yukseklik: number;
  azaltilmisHareket: boolean;
  /** Renk anahtarı: noktalar kategorik bir değişkene göre renklenir (yoksa tek renk); gruplar tek grafikte, lejantla */
  renkEslemi?: RenkEslemesi | null;
}

const SOL = 64;
const SAG = 28;
const ALT = 58;
/** Lejant satırı (renklendirmede grafiğin en üstünde) */
const LEJANT_Y = 18;
/** Bu kadar noktadan sonra geçişler kapanır (akıllı tahtada akıcılık) */
const COK_NOKTA = 400;

interface SacilimNoktasi {
  satir: number;
  x: number;
  y: number;
}

/**
 * Değerlerin iki yanına küçük pay bırakan güzel eksen (uçtaki nokta eksen çizgisine yapışmasın). Değerler tam
 * sayıysa adım 1'den küçük olmaz: maç sayılarında eksen 14,5 / 15,5 gibi ara değerler yazmaz.
 */
export function payliGuzelEksen(degerler: number[], hedef: number): Eksen {
  const min = Math.min(...degerler);
  const max = Math.max(...degerler);
  const pay = (max - min || Math.abs(max) || 1) * 0.06;
  const e = guzelEksen(min - pay, max + pay, hedef);
  if (e.adim >= 1 || !degerler.every((d) => Number.isInteger(d))) return e;
  const alt = Math.floor(min - pay);
  const ust = Math.ceil(max + pay);
  return { min: alt, max: ust, adim: 1, isaretler: Array.from({ length: ust - alt + 1 }, (_, i) => alt + i) };
}

export function SacilimGrafigi({
  tablo,
  xSutun,
  ySutun,
  seciliSatir,
  onSatirSec,
  genislik,
  yukseklik,
  azaltilmisHareket,
  renkEslemi = null,
}: SacilimGrafigiProps) {
  const [ustunde, setUstunde] = useState<number | null>(null);
  const W = Math.max(genislik, 240);
  const H = Math.max(yukseklik, 200);
  const taban = H - ALT;
  const xAd = tablo.sutunlar[xSutun]?.ad ?? '';
  const yAd = tablo.sutunlar[ySutun]?.ad ?? '';

  const renklendirme = renkEslemi;
  const UST = renklendirme ? 64 : 40;
  const noktaRengi = (satir: number) => satirRengi(renklendirme, satir) ?? RENK.birincil;

  const noktalar = useMemo(() => {
    const sonuc: SacilimNoktasi[] = [];
    tablo.satirlar.forEach((r, i) => {
      const x = sayiOku(r.hucreler[xSutun] ?? '');
      const y = sayiOku(r.hucreler[ySutun] ?? '');
      if (x !== null && y !== null) sonuc.push({ satir: i, x, y });
    });
    return sonuc;
  }, [tablo, xSutun, ySutun]);
  const eksik = tablo.satirlar.length - noktalar.length;

  const xEksen = noktalar.length > 0 ? payliGuzelEksen(noktalar.map((n) => n.x), Math.max(3, Math.floor((W - SOL - SAG) / 80))) : null;
  const yEksen = noktalar.length > 0 ? payliGuzelEksen(noktalar.map((n) => n.y), Math.max(3, Math.floor((taban - UST) / 48))) : null;
  const xOlcek = xEksen ? dogrusalOlcek(xEksen.min, xEksen.max, SOL, W - SAG) : null;
  const yOlcek = yEksen ? dogrusalOlcek(yEksen.min, yEksen.max, taban, UST) : null;
  const xEtiketAdimi = xEksen ? Math.max(1, Math.ceil(xEksen.isaretler.length / Math.max(2, Math.floor((W - SOL - SAG) / 56)))) : 1;
  const hareketsiz = azaltilmisHareket || noktalar.length > COK_NOKTA;

  const etiketMetni = (n: SacilimNoktasi) => `${satirEtiketi(tablo, n.satir)}: (${sayiYaz(n.x)}; ${sayiYaz(n.y)})`;
  const vurgulu = noktalar.find((n) => n.satir === (ustunde ?? seciliSatir)) ?? null;
  const balon = vurgulu && xOlcek && yOlcek ? { metin: etiketMetni(vurgulu), x: xOlcek.ileri(vurgulu.x), y: yOlcek.ileri(vurgulu.y) } : null;
  const balonG = balon ? balon.metin.length * 7.2 + 18 : 0;

  return (
    <svg
      data-grafik="sacilim"
      role="img"
      aria-label={`Saçılım grafiği: yatay ${xAd}, dikey ${yAd}`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {xEksen && yEksen && xOlcek && yOlcek ? (
        <g>
          {/* Izgara ve eksen işaretleri */}
          {yEksen.isaretler.map((v) => (
            <g key={`y-${v}`}>
              <line x1={SOL} x2={W - SAG} y1={yOlcek.ileri(v)} y2={yOlcek.ileri(v)} stroke={RENK.izgara} />
              <text x={SOL - 8} y={yOlcek.ileri(v) + 4} fontSize={13} textAnchor="end" fill={RENK.metin}>
                {sayiYaz(v)}
              </text>
            </g>
          ))}
          {xEksen.isaretler.map((v, i) => (
            <g key={`x-${v}`}>
              <line x1={xOlcek.ileri(v)} x2={xOlcek.ileri(v)} y1={UST} y2={taban} stroke={RENK.izgara} />
              {i % xEtiketAdimi === 0 && (
                <text x={xOlcek.ileri(v)} y={taban + 20} fontSize={13} textAnchor="middle" fill={RENK.metin}>
                  {sayiYaz(v)}
                </text>
              )}
            </g>
          ))}
          <line x1={SOL} x2={SOL} y1={UST} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
          <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
          {/* Renk anahtarı lejantı: kategori, rengi ve çizilen nokta sayısı (gruplar tek grafikte ayırt edilsin) */}
          {renklendirme && (
            <RenkLejanti eslem={renklendirme} x={SOL} y={LEJANT_Y + 4} sagSinir={W - SAG} sayilar={kategoriSayilari(renklendirme, noktalar.map((n) => n.satir))} />
          )}

          {/* Eksen adları: hangisinin yatay, hangisinin dikey olduğu okunsun */}
          <text x={SOL} y={UST - 16} fontSize={13} fontWeight={700} fill={RENK.metin} data-eksen="y">
            ↑ {yAd}
          </text>
          <text x={W - SAG} y={taban + 40} fontSize={13} fontWeight={700} textAnchor="end" fill={RENK.metin} data-eksen="x">
            {xAd} →
          </text>

          {/* Noktalar */}
          {noktalar.map((n) => {
            const secili = seciliSatir === n.satir;
            return (
              <g
                key={tablo.satirlar[n.satir]?.id ?? n.satir}
                role="button"
                tabIndex={0}
                aria-label={`${satirEtiketi(tablo, n.satir)}: ${xAd} ${sayiYaz(n.x)}, ${yAd} ${sayiYaz(n.y)}${
                  renklendirme && renklendirme.sutun !== 0 ? `, ${renklendirme.ad} ${renklendirme.satirKategorisi.get(n.satir) ?? '(boş)'}` : ''
                }`}
                aria-pressed={secili}
                style={{
                  transform: `translate(${xOlcek.ileri(n.x)}px, ${yOlcek.ileri(n.y)}px)`,
                  transition: hareketsiz ? 'none' : `transform 300ms ${GECIS}`,
                  cursor: 'pointer',
                  outline: 'none',
                }}
                onClick={() => onSatirSec(secili ? null : n.satir)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSatirSec(secili ? null : n.satir);
                  }
                }}
                onPointerEnter={() => setUstunde(n.satir)}
                onPointerLeave={() => setUstunde((u) => (u === n.satir ? null : u))}
                onFocus={() => setUstunde(n.satir)}
                onBlur={() => setUstunde((u) => (u === n.satir ? null : u))}
              >
                {!hareketsiz && <circle r={16} fill="transparent" />}
                {/* Seçili nokta: kendi renginde, kalın koyu halkalı (renk kategoriyi anlatmaya devam eder) */}
                <circle r={secili ? 9 : 7} fill={noktaRengi(n.satir)} fillOpacity={secili ? 1 : 0.88} stroke={secili ? RENK.metin : RENK.kart} strokeWidth={secili ? 3 : 1.5} />
              </g>
            );
          })}

          {/* Değer balonu */}
          {balon && (
            <g style={{ pointerEvents: 'none' }} transform={`translate(${Math.min(Math.max(balon.x - balonG / 2, 4), W - balonG - 4)}, ${balon.y - 44 < 4 ? balon.y + 14 : balon.y - 40})`}>
              <rect width={balonG} height={26} rx={8} fill={RENK.metin} fillOpacity={0.92} />
              <text x={balonG / 2} y={17} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.zemin}>
                {balon.metin}
              </text>
            </g>
          )}
        </g>
      ) : (
        <text x={W / 2} y={H / 2} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Çizilecek nokta yok: aynı satırda iki değişkenin de değeri olmalı
        </text>
      )}

      {eksik > 0 && noktalar.length > 0 && (
        <text x={SOL} y={taban + 40} fontSize={13} fontWeight={600} fill={RENK.solukMetin} data-eksik-satir>
          {eksik} satırda değer eksik
        </text>
      )}
    </svg>
  );
}
