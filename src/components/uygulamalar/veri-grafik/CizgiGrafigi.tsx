'use client';

/**
 * Çizgi grafiği: satır sırası = zaman; seçili değişken (ve istenirse karşılaştırılan ikinci değişken) birer seri.
 * Her satır eşit genişlikte bir dilime oturur (ilk / son nokta eksene yapışmaz, etiketler kesilmez).
 * Nokta sürüklenince tablo güncellenir; komşu noktalarla arasındaki değişim (Δ ve %) dinamik etiketle gösterilir.
 * Renk anahtarı seçiliyse her kategori kendi renginde ayrı çizgidir (aynı kategorinin satırları sırayla birleşir);
 * iki seri varsa seriler çizgi biçimiyle ayrılır: ilki düz ve dolu noktalı, ikincisi kesikli ve içi boş noktalı.
 */
import React, { useMemo, useRef, useState } from 'react';
import { type Eksen } from './istatistik';
import { adimOndalik, degisim, dogrusalOlcek, seriRengi, surukleDegeri } from './grafik';
import { satirEtiketi, sayiOku, sayiYaz, sayisalSutunlar, type VeriTablosu } from './veri';
import { GECIS, RENK, svgKonumu } from './ortak';
import { payliEksen } from './SutunGrafigi';
import { kategoriSayilari, rengeGoreMetin, renkGruplari, satirRengi, type RenkEslemesi } from './kategorik';
import { RenkLejanti, renkLejantiGenisligi } from './RenkLejanti';

export interface CizgiGrafigiProps {
  tablo: VeriTablosu;
  /** Çizilecek sayısal sütunların indeksleri (seri sırası); verilmezse bütün sayısal sütunlar */
  sutunlar?: number[];
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  onDegerDegis: (satir: number, sutun: number, deger: number, ondalik: number) => void;
  yuvarlamaAdimi: number;
  genislik: number;
  yukseklik: number;
  azaltilmisHareket: boolean;
  /** Renk anahtarı: noktalar ve çizgiler kategorik bir değişkenin renklerini alır, lejantla */
  renkEslemi?: RenkEslemesi | null;
}

const SOL = 56;
const SAG = 20;
const UST_TEMEL = 46;
/** Lejant yazılarının taban çizgisi ve seri lejantında bir öğenin genişliği */
const LEJANT_Y = 26;
const SERI_ARALIGI = 150;
/** Renk anahtarında ikinci serinin çizgi deseni */
const KESIK = '7 5';
const ALT = 56;

interface SeriNoktasi {
  satir: number;
  deger: number;
  x: number;
  y: number;
}

export function degisimEtiketi(onceki: number, sonraki: number): string {
  const d = degisim(onceki, sonraki);
  const isaret = d.fark > 0 ? '+' : d.fark < 0 ? '−' : '';
  const fark = `${isaret}${sayiYaz(Math.abs(d.fark))}`;
  if (d.yuzde === null) return `Δ ${fark}`;
  const yuzdeIsaret = d.yuzde > 0 ? '+' : d.yuzde < 0 ? '−' : '';
  return `Δ ${fark} (${yuzdeIsaret}${sayiYaz(Math.abs(d.yuzde), 1)} %)`;
}

export function CizgiGrafigi({
  tablo,
  sutunlar,
  seciliSatir,
  onSatirSec,
  onDegerDegis,
  yuvarlamaAdimi,
  genislik,
  yukseklik,
  azaltilmisHareket,
  renkEslemi = null,
}: CizgiGrafigiProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [surukle, setSurukle] = useState<{ sutun: number; satir: number; eksen: Eksen } | null>(null);
  const [ustunde, setUstunde] = useState<{ sutun: number; satir: number } | null>(null);

  const W = Math.max(genislik, 240);
  const H = Math.max(yukseklik, 200);
  const taban = H - ALT;
  const alanG = W - SOL - SAG;
  const sutunAnahtari = sutunlar?.join(',') ?? '';
  const seriler = useMemo(
    () => {
      const hepsi = sayisalSutunlar(tablo).map((s) => ({ sutun: s, indeks: tablo.sutunlar.findIndex((k) => k.id === s.id) }));
      if (!sutunlar) return hepsi;
      return sutunlar.map((i) => hepsi.find((s) => s.indeks === i)).filter((s): s is (typeof hepsi)[number] => s !== undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tablo, sutunAnahtari],
  );
  /** Renk anahtarı: kategorik sütun (seriler sayısal olduğundan hiçbir seriyle çakışmaz) */
  const anahtar = renkEslemi && renkEslemi.sutun >= 0 && renkEslemi.sutun < tablo.sutunlar.length ? renkEslemi : null;
  const cizilenSatirlar = useMemo(() => {
    const k = new Set<number>();
    for (const s of seriler)
      tablo.satirlar.forEach((r, i) => {
        if (sayiOku(r.hucreler[s.indeks]) !== null) k.add(i);
      });
    return [...k].sort((a, b) => a - b);
  }, [seriler, tablo]);
  const lejantSayilari = anahtar ? kategoriSayilari(anahtar, cizilenSatirlar) : undefined;
  const seriLejantSonu = SOL + seriler.length * SERI_ARALIGI;
  /** Kategori lejantı seri lejantının yanına sığmazsa ikinci satıra iner; çizim alanı o kadar aşağıdan başlar */
  const lejantAltSatirda = anahtar !== null && seriLejantSonu + renkLejantiGenisligi(anahtar, lejantSayilari) > W - SAG;
  const UST = lejantAltSatirda ? UST_TEMEL + 22 : UST_TEMEL;
  const ondalik = adimOndalik(yuvarlamaAdimi);

  const tumDegerler = useMemo(() => {
    const d: number[] = [];
    for (const s of seriler) for (const r of tablo.satirlar) {
      const v = sayiOku(r.hucreler[s.indeks]);
      if (v !== null) d.push(v);
    }
    return d;
  }, [seriler, tablo]);

  const canliEksen = useMemo(() => {
    if (tumDegerler.length === 0) return payliEksen(0, 10, 5);
    return payliEksen(Math.min(...tumDegerler), Math.max(...tumDegerler), Math.max(3, Math.floor((taban - UST) / 44)));
  }, [tumDegerler, taban, UST]);
  const eksen = surukle ? surukle.eksen : canliEksen;
  const olcek = dogrusalOlcek(eksen.min, eksen.max, taban, UST);
  const n = Math.max(tablo.satirlar.length, 1);
  // Her satır eşit bir dilimin ortasında: ilk nokta Y eksenine, son nokta kenara yapışmaz
  const adimX = alanG / n;
  const xKonum = (i: number) => SOL + adimX * (i + 0.5);

  const seriNoktalari = useMemo(
    () =>
      seriler.map((s) => {
        const noktalar: SeriNoktasi[] = [];
        tablo.satirlar.forEach((r, i) => {
          const v = sayiOku(r.hucreler[s.indeks]);
          if (v !== null) noktalar.push({ satir: i, deger: v, x: xKonum(i), y: olcek.ileri(v) });
        });
        return { ...s, noktalar };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seriler, tablo, eksen, alanG, taban, UST],
  );

  const gecis = azaltilmisHareket || surukle ? 'none' : `all 300ms ${GECIS}`;
  const etiketAdimi = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(alanG / 64))));

  const isaretciHareket = (e: React.PointerEvent<SVGElement>) => {
    if (!surukle || !svgRef.current) return;
    const { y } = svgKonumu(svgRef.current, e.clientX, e.clientY);
    const o = dogrusalOlcek(surukle.eksen.min, surukle.eksen.max, taban, UST);
    onDegerDegis(surukle.satir, surukle.sutun, surukleDegeri(y, o, yuvarlamaAdimi, surukle.eksen.min, surukle.eksen.max), ondalik);
  };

  const vurgulu = surukle ?? ustunde ?? (seciliSatir !== null ? { satir: seciliSatir, sutun: -1 } : null);

  return (
    <svg
      ref={svgRef}
      data-grafik="cizgi"
      role="img"
      aria-label="Çizgi grafiği"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif', touchAction: 'none' }}
    >
      {/* Lejant: seriler (renk anahtarı varken renksiz çizgi örneğiyle: düz / kesikli), yanında kategori renkleri */}
      {seriNoktalari.map((s, si) => (
        <g key={s.sutun.id} transform={`translate(${SOL + si * SERI_ARALIGI}, 14)`}>
          {anahtar ? (
            <g data-seri-ornegi>
              <line x1={0} x2={22} y1={7} y2={7} stroke={RENK.solukMetin} strokeWidth={2.5} strokeDasharray={si > 0 ? KESIK : undefined} />
              <circle cx={11} cy={7} r={4.5} fill={si > 0 ? RENK.kart : RENK.solukMetin} stroke={si > 0 ? RENK.solukMetin : RENK.kart} strokeWidth={2} />
            </g>
          ) : (
            <rect width={14} height={14} rx={4} fill={seriRengi(si)} />
          )}
          <text x={anahtar ? 28 : 20} y={12} fontSize={13} fontWeight={700} fill={RENK.metin}>
            {s.sutun.ad.length > 16 ? `${s.sutun.ad.slice(0, 15)}…` : s.sutun.ad}
          </text>
        </g>
      ))}
      {anahtar && (
        <RenkLejanti
          eslem={anahtar}
          x={lejantAltSatirda ? SOL : seriLejantSonu}
          y={lejantAltSatirda ? LEJANT_Y + 22 : LEJANT_Y}
          sagSinir={W - SAG}
          sayilar={lejantSayilari}
        />
      )}

      {/* Izgara, Y ekseni */}
      {eksen.isaretler.map((v) => (
        <g key={v}>
          <line x1={SOL} x2={W - SAG} y1={olcek.ileri(v)} y2={olcek.ileri(v)} stroke={RENK.izgara} />
          <text x={SOL - 8} y={olcek.ileri(v) + 4} fontSize={13} textAnchor="end" fill={RENK.metin}>
            {sayiYaz(v)}
          </text>
        </g>
      ))}
      <line x1={SOL} x2={SOL} y1={UST} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />

      {/* X etiketleri (satır sırası) */}
      {tablo.satirlar.map((r, i) => {
        const secili = seciliSatir === i;
        if (i % etiketAdimi !== 0 && !secili) return null;
        const etiket = satirEtiketi(tablo, i);
        return (
          <text
            key={r.id}
            x={xKonum(i)}
            y={taban + 20}
            fontSize={13}
            fontWeight={secili ? 800 : 500}
            textAnchor="middle"
            fill={secili ? RENK.mercan : RENK.metin}
            style={{ cursor: 'pointer' }}
            onClick={() => onSatirSec(secili ? null : i)}
          >
            {etiket.length > 10 ? `${etiket.slice(0, 9)}…` : etiket}
          </text>
        );
      })}

      {seciliSatir !== null && seciliSatir < tablo.satirlar.length && (
        <line x1={xKonum(seciliSatir)} x2={xKonum(seciliSatir)} y1={UST} y2={taban} stroke={RENK.mercan} strokeDasharray="4 4" />
      )}

      {tumDegerler.length === 0 && (
        <text x={SOL + alanG / 2} y={(UST + taban) / 2} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Çizmek için sayısal değer girin
        </text>
      )}

      {/* Seriler: renk anahtarı varken her kategori ayrı çizgi (aynı kategorinin satırları sırayla birleşir) */}
      {seriNoktalari.map((s, si) => {
        const seriRenk = seriRengi(si);
        const kesik = anahtar && si > 0 ? KESIK : undefined;
        const noktaBul = new Map(s.noktalar.map((p) => [p.satir, p]));
        const gruplar = anahtar
          ? renkGruplari(
              anahtar,
              s.noktalar.map((p) => p.satir),
            ).map((g) => ({ ad: g.kategori ?? '', renk: g.renk, noktalar: g.satirlar.map((satir) => noktaBul.get(satir)!) }))
          : [{ ad: '', renk: seriRenk, noktalar: s.noktalar }];
        const vurguluSatir = vurgulu && (vurgulu.sutun === s.indeks || vurgulu.sutun === -1) ? vurgulu.satir : null;
        const vurguluGrup = vurguluSatir === null ? undefined : gruplar.find((g) => g.noktalar.some((p) => p.satir === vurguluSatir));
        const vurguluNokta = vurguluGrup ? vurguluGrup.noktalar.findIndex((p) => p.satir === vurguluSatir) : -1;
        return (
          <g key={s.sutun.id}>
            {gruplar.map((g) => (
              <path
                key={g.ad}
                d={g.noktalar.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none"
                stroke={g.renk}
                strokeWidth={2.5}
                strokeDasharray={kesik}
                strokeLinejoin="round"
                style={{ transition: gecis }}
                data-cizgi-grubu={anahtar ? g.ad : undefined}
              />
            ))}
            {/* Komşu değişim etiketleri: aynı çizgideki önceki ve sonraki nokta */}
            {vurguluGrup &&
              vurguluNokta >= 0 &&
              [vurguluNokta - 1, vurguluNokta].map((k) => {
                if (k < 0 || k + 1 >= vurguluGrup.noktalar.length) return null;
                const a = vurguluGrup.noktalar[k];
                const b = vurguluGrup.noktalar[k + 1];
                const metin = degisimEtiketi(a.deger, b.deger);
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;
                const g = metin.length * 6.6 + 14;
                return (
                  <g
                    key={k}
                    // Balon eksen işaretlerinin (x < SOL) ve lejantın (y < UST) üstüne binmez
                    transform={`translate(${Math.min(Math.max(mx - g / 2, SOL + 2), W - g - 2)}, ${Math.max(my - 30, UST - 4)})`}
                    style={{ pointerEvents: 'none' }}
                  >
                    <rect width={g} height={22} rx={7} fill={vurguluGrup.renk} />
                    <text x={g / 2} y={15} fontSize={11.5} fontWeight={700} textAnchor="middle" fill={rengeGoreMetin(vurguluGrup.renk)}>
                      {metin}
                    </text>
                  </g>
                );
              })}
            {s.noktalar.map((p) => {
              const secili = seciliSatir === p.satir;
              const aktif = vurgulu !== null && vurgulu.satir === p.satir && (vurgulu.sutun === s.indeks || vurgulu.sutun === -1);
              const etiket = satirEtiketi(tablo, p.satir);
              const kategori = anahtar?.satirKategorisi.get(p.satir);
              const renk = satirRengi(anahtar, p.satir) ?? seriRenk;
              // Renk anahtarında 1. seri dolu, 2. seri içi boş nokta; seçili nokta kendi renginde kalın koyu halka alır
              const dolgu = anahtar ? (si > 0 && !secili ? RENK.kart : renk) : secili ? RENK.mercan : renk;
              const kenar = anahtar ? (secili ? RENK.metin : si > 0 ? renk : RENK.kart) : RENK.kart;
              const kenarKalinligi = anahtar ? (secili ? 3 : si > 0 ? 2.5 : 2) : 2;
              const kategoriMetni = anahtar && kategori !== undefined && kategori !== etiket ? ` (${anahtar.ad}: ${kategori})` : '';
              return (
                <g
                  key={tablo.satirlar[p.satir]?.id ?? p.satir}
                  role="slider"
                  tabIndex={0}
                  aria-label={`${s.sutun.ad}, ${etiket}${kategoriMetni}: ${sayiYaz(p.deger)}. Sürükleyerek ya da ok tuşlarıyla değiştirin`}
                  aria-valuenow={p.deger}
                  aria-valuemin={eksen.min}
                  aria-valuemax={eksen.max}
                  style={{ cursor: 'ns-resize', outline: 'none' }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
                    setSurukle({ sutun: s.indeks, satir: p.satir, eksen: canliEksen });
                    onSatirSec(p.satir);
                  }}
                  onPointerMove={isaretciHareket}
                  onPointerUp={(e) => {
                    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
                    setSurukle(null);
                  }}
                  onPointerCancel={() => setSurukle(null)}
                  onPointerEnter={() => setUstunde({ sutun: s.indeks, satir: p.satir })}
                  onPointerLeave={() => setUstunde((u) => (u && u.satir === p.satir && u.sutun === s.indeks ? null : u))}
                  onFocus={() => setUstunde({ sutun: s.indeks, satir: p.satir })}
                  onBlur={() => setUstunde(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      onDegerDegis(p.satir, s.indeks, p.deger + (e.key === 'ArrowUp' ? yuvarlamaAdimi : -yuvarlamaAdimi), ondalik);
                    } else if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSatirSec(secili ? null : p.satir);
                    }
                  }}
                >
                  <circle cx={p.x} cy={p.y} r={16} fill="transparent" />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={aktif ? 8 : secili ? 7 : 5.5}
                    fill={dolgu}
                    stroke={kenar}
                    strokeWidth={kenarKalinligi}
                    style={{ transition: gecis }}
                  />
                  {aktif && (
                    <text
                      // Kenara yakın nokta: etiket içeri doğru (sağa/sola); tepedeki nokta: etiket altta
                      x={p.x <= SOL + 24 ? p.x + 12 : p.x >= W - SAG - 24 ? p.x - 12 : p.x}
                      y={p.x <= SOL + 24 || p.x >= W - SAG - 24 || p.y < UST + 24 ? p.y + 22 : p.y - 14}
                      fontSize={13}
                      fontWeight={800}
                      textAnchor={p.x <= SOL + 24 ? 'start' : p.x >= W - SAG - 24 ? 'end' : 'middle'}
                      fill={RENK.metin}
                      style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round', pointerEvents: 'none' }}
                    >
                      {sayiYaz(p.deger)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
