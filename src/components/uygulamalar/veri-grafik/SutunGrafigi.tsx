'use client';

/**
 * Değer sütunları: her satır bir sütun (etiket + değer). Sütunun tepesinden sürükleyince tablo anında
 * güncellenir (yuvarlama adımı 1 / 0,5 / 0,1). Y ekseni otomatik "güzel" aralıklarla; sürükleme
 * sırasında eksen dondurulur ki sütun işaretçinin altında kaymasın.
 */
import React, { useMemo, useRef, useState } from 'react';
import { guzelEksen, type Eksen } from './istatistik';
import { adimOndalik, dogrusalOlcek, surukleDegeri } from './grafik';
import { gecerliDegerler, satirEtiketi, sayiYaz, type VeriTablosu } from './veri';
import { GECIS, RENK, svgKonumu } from './ortak';
import { kategoriSayilari, satirRengi, type RenkEslemesi } from './kategorik';
import { RenkLejanti } from './RenkLejanti';

export interface SutunGrafigiProps {
  tablo: VeriTablosu;
  sutun: number;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  onDegerDegis: (satir: number, sutun: number, deger: number, ondalik: number) => void;
  yuvarlamaAdimi: number;
  genislik: number;
  yukseklik: number;
  azaltilmisHareket: boolean;
  /** Renk anahtarı: her sütun satırının kategorisine göre renklenir, lejant başlık satırında */
  renkEslemi?: RenkEslemesi | null;
}

const SOL = 56;
const SAG = 16;
const UST = 24;
const ALT = 56;

/** Eksen üst sınırında sürükleme payı bırakır (en büyük değer tepeye yapışmasın) */
export function payliEksen(min: number, max: number, hedef: number): Eksen {
  const alt = Math.min(0, min);
  const ust = Math.max(max, alt + Number.EPSILON);
  let e = guzelEksen(alt, ust, hedef);
  if (e.max - max < 0.12 * (e.max - e.min)) e = guzelEksen(alt, e.max + e.adim, hedef);
  return e;
}

export function SutunGrafigi({
  tablo,
  sutun,
  seciliSatir,
  onSatirSec,
  onDegerDegis,
  yuvarlamaAdimi,
  genislik,
  yukseklik,
  azaltilmisHareket,
  renkEslemi = null,
}: SutunGrafigiProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [surukle, setSurukle] = useState<{ satir: number; eksen: Eksen } | null>(null);
  const [ustunde, setUstunde] = useState<number | null>(null);

  const W = Math.max(genislik, 240);
  const H = Math.max(yukseklik, 180);
  const taban = H - ALT;
  const alanG = W - SOL - SAG;

  const noktalar = useMemo(() => gecerliDegerler(tablo, sutun), [tablo, sutun]);
  const canliEksen = useMemo(() => {
    if (noktalar.length === 0) return payliEksen(0, 10, 5);
    const d = noktalar.map((n) => n.deger);
    return payliEksen(Math.min(...d), Math.max(...d), Math.max(3, Math.floor((taban - UST) / 44)));
  }, [noktalar, taban]);
  const eksen = surukle ? surukle.eksen : canliEksen;
  const olcek = dogrusalOlcek(eksen.min, eksen.max, taban, UST);
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '';
  const ondalik = adimOndalik(yuvarlamaAdimi);

  const adet = Math.max(noktalar.length, 1);
  const hucreG = alanG / adet;
  const sutunG = Math.max(6, Math.min(hucreG * 0.66, 72));
  const gecis = azaltilmisHareket || surukle ? 'none' : `transform 300ms ${GECIS}`;

  const isaretciHareket = (e: React.PointerEvent<SVGElement>) => {
    if (!surukle || !svgRef.current) return;
    const { y } = svgKonumu(svgRef.current, e.clientX, e.clientY);
    const o = dogrusalOlcek(surukle.eksen.min, surukle.eksen.max, taban, UST);
    const deger = surukleDegeri(y, o, yuvarlamaAdimi, surukle.eksen.min, surukle.eksen.max);
    onDegerDegis(surukle.satir, sutun, deger, ondalik);
  };

  const surukleBaslat = (e: React.PointerEvent<SVGElement>, satir: number) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setSurukle({ satir, eksen: canliEksen });
    onSatirSec(satir);
  };

  const surukleBitir = (e: React.PointerEvent<SVGElement>) => {
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    setSurukle(null);
  };

  const klavyeDegistir = (e: React.KeyboardEvent, satir: number, deger: number) => {
    let fark = 0;
    if (e.key === 'ArrowUp') fark = yuvarlamaAdimi;
    else if (e.key === 'ArrowDown') fark = -yuvarlamaAdimi;
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSatirSec(seciliSatir === satir ? null : satir);
      return;
    } else return;
    e.preventDefault();
    onDegerDegis(satir, sutun, deger + fark, ondalik);
  };

  const etiketEgik = hucreG < 64;

  return (
    <svg
      ref={svgRef}
      data-grafik="sutun"
      role="img"
      aria-label={`${sutunAdi} değer sütunları`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif', touchAction: 'none' }}
    >
      {/* Izgara ve Y ekseni */}
      {eksen.isaretler.map((v) => (
        <g key={v}>
          <line x1={SOL} x2={W - SAG} y1={olcek.ileri(v)} y2={olcek.ileri(v)} stroke={RENK.izgara} strokeWidth={1} />
          <text x={SOL - 8} y={olcek.ileri(v) + 4} fontSize={13} textAnchor="end" fill={RENK.metin}>
            {sayiYaz(v)}
          </text>
        </g>
      ))}
      <line x1={SOL} x2={SOL} y1={UST} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      <line x1={SOL} x2={W - SAG} y1={olcek.ileri(0)} y2={olcek.ileri(0)} stroke={RENK.metin} strokeWidth={1.5} />
      <text x={SOL} y={14} fontSize={13} fontWeight={700} fill={RENK.metin}>
        {sutunAdi}
      </text>
      {renkEslemi && renkEslemi.sutun !== sutun && (
        <RenkLejanti
          eslem={renkEslemi}
          x={SOL + sutunAdi.length * 7.4 + 24}
          y={14}
          sagSinir={W - SAG}
          sayilar={kategoriSayilari(renkEslemi, noktalar.map((n) => n.satir))}
        />
      )}

      {noktalar.length === 0 && (
        <text x={SOL + alanG / 2} y={(UST + taban) / 2} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Bu değişkende sayısal değer yok
        </text>
      )}

      {noktalar.map((n, i) => {
        const cx = SOL + hucreG * (i + 0.5);
        const x = cx - sutunG / 2;
        const sifir = olcek.ileri(0);
        const tepe = olcek.ileri(n.deger);
        const yuk = Math.abs(sifir - tepe);
        const secili = seciliSatir === n.satir;
        const aktif = secili || ustunde === n.satir || surukle?.satir === n.satir;
        const anahtarRengi = renkEslemi && renkEslemi.sutun !== sutun ? satirRengi(renkEslemi, n.satir) : undefined;
        const etiket = satirEtiketi(tablo, n.satir);
        const surukleniyor = surukle?.satir === n.satir;
        return (
          <g key={tablo.satirlar[n.satir]?.id ?? n.satir}>
            <g
              style={{
                transform: `translate(${x}px, ${sifir}px) scaleY(${n.deger >= 0 ? -Math.max(yuk, 0.001) : Math.max(yuk, 0.001)})`,
                transition: gecis,
                cursor: 'pointer',
              }}
              onClick={() => onSatirSec(secili ? null : n.satir)}
              onPointerEnter={() => setUstunde(n.satir)}
              onPointerLeave={() => setUstunde((u) => (u === n.satir ? null : u))}
            >
              {/* Renk anahtarı varken sütun kategorisinin renginde; seçili sütun tam, diğerleri soluk (renk kategoriyi anlatır) */}
              <rect
                x={0}
                y={0}
                width={sutunG}
                height={1}
                fill={anahtarRengi ?? (secili ? RENK.mercan : RENK.birincil)}
                fillOpacity={anahtarRengi && seciliSatir !== null ? (aktif ? 1 : 0.45) : aktif ? 1 : 0.85}
              />
            </g>
            {/* Tepe tutamacı */}
            <g
              role="slider"
              tabIndex={0}
              aria-label={`${etiket}: ${sayiYaz(n.deger)}. Sürükleyerek ya da ok tuşlarıyla değiştirin`}
              aria-valuenow={n.deger}
              aria-valuemin={eksen.min}
              aria-valuemax={eksen.max}
              style={{ cursor: 'ns-resize', outline: 'none' }}
              onPointerDown={(e) => surukleBaslat(e, n.satir)}
              onPointerMove={isaretciHareket}
              onPointerUp={surukleBitir}
              onPointerCancel={surukleBitir}
              onKeyDown={(e) => klavyeDegistir(e, n.satir, n.deger)}
              onFocus={() => setUstunde(n.satir)}
              onBlur={() => setUstunde((u) => (u === n.satir ? null : u))}
              onPointerEnter={() => setUstunde(n.satir)}
              onPointerLeave={() => setUstunde((u) => (u === n.satir ? null : u))}
            >
              <rect x={x - 6} y={tepe - 22} width={sutunG + 12} height={44} fill="transparent" />
              <rect
                x={x}
                y={tepe - 3}
                width={sutunG}
                height={6}
                rx={3}
                fill={aktif ? RENK.metin : RENK.kart}
                stroke={secili ? RENK.mercan : RENK.birincil}
                strokeWidth={2}
                style={{ transition: gecis === 'none' ? 'none' : `y 300ms ${GECIS}` }}
              />
              {/* Değer etiketi */}
              <text
                x={cx}
                y={n.deger >= 0 ? tepe - 9 : tepe + 18}
                fontSize={13}
                fontWeight={700}
                textAnchor="middle"
                fill={surukleniyor ? RENK.mercan : RENK.metin}
                style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}
              >
                {sayiYaz(n.deger)}
              </text>
            </g>
            {/* Kategori etiketi */}
            <text
              x={cx}
              y={taban + 18}
              fontSize={13}
              fontWeight={secili ? 800 : 500}
              textAnchor={etiketEgik ? 'end' : 'middle'}
              transform={etiketEgik ? `rotate(-35 ${cx} ${taban + 18})` : undefined}
              fill={secili ? RENK.mercan : RENK.metin}
              style={{ cursor: 'pointer' }}
              onClick={() => onSatirSec(secili ? null : n.satir)}
            >
              {etiket.length > 12 && etiketEgik ? `${etiket.slice(0, 11)}…` : etiket}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
