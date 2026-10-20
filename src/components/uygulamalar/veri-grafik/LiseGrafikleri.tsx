'use client';

/**
 * Lise grafikleri (MAT.9.6.1 süreç bileşeni: "nokta grafiği, histogram, kutu grafiği"):
 * - Histogram: eşit genişlikli sınıflar (istatistik.ts: histogramSiniflari), bitişik sütunlar; sütunun boyu sınıftaki veri
 *   sayısı. Karşılaştırmada grupların sütunları her sınıfta yan yana, tek grafikte (alan uzmanı 7. tur kuralı).
 * - Kutu grafiği: en küçük değer, 1. çeyrek, ortanca, 3. çeyrek, en büyük değer (istatistik.ts: ceyrekler); gruplar ortak
 *   yatay eksende alt alta kutular (tek grafik, aynı ölçek).
 * Eksenlerin adları ve uçlarında ok vardır (eksen standardı); yazılar 13 px, sayılar `sayiMetni` biçiminde.
 */
import React from 'react';
import { ceyrekler, guzelEksen, histogramSiniflari, medyan, sayiMetni } from './istatistik';
import { dogrusalOlcek, gosterimOndaligi, siklikEkseni } from './grafik';
import { RENK, metinGenisligi, metniSigdir } from './grafikOrtak';
import { EksenOklari } from './EksenOklari';

export interface LiseGrafikGrubu {
  ad: string;
  renk: string;
  degerler: number[];
}

interface OrtakProps {
  /** Tek grupta bir grup; karşılaştırmada her grup (sınıf, değişken) bir grup */
  gruplar: LiseGrafikGrubu[];
  /** Yatay eksenin adı (değişkenin adı: "Tur sayısı") */
  degiskenAdi: string;
  genislik: number;
  yukseklik: number;
}

const YAZI = 13;
const SOL = 56;
const SAG = 24;

/** Lejant: gruplar birden çoksa üst satırda renk kareleri ve adlar */
function Lejant({ gruplar, x, y }: { gruplar: LiseGrafikGrubu[]; x: number; y: number }) {
  let cx = x;
  return (
    <g data-lise-lejant>
      {gruplar.map((g) => {
        const bas = cx;
        cx += 18 + metinGenisligi(g.ad, YAZI, true) + 16;
        return (
          <g key={g.ad} transform={`translate(${bas}, ${y})`} data-seri={g.ad}>
            <rect x={0} y={-10} width={12} height={12} rx={3} fill={g.renk} />
            <text x={17} y={0} fontSize={YAZI} fontWeight={700} fill={RENK.metin}>
              {g.ad}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ── Histogram ────────────────────────────────────────────────────────────────

export function Histogram({ gruplar, degiskenAdi, genislik, yukseklik, sinifGenisligi }: OrtakProps & { sinifGenisligi?: number }) {
  const W = Math.max(genislik, 240);
  const H = Math.max(yukseklik, 200);
  const hepsi = gruplar.flatMap((g) => g.degerler);
  const { genislik: w, siniflar } = histogramSiniflari(hepsi, 6, sinifGenisligi);
  // Her grubun sınıf sayıları aynı sınıflarla (ortak sınıf sınırları)
  const bas = siniflar[0]?.alt ?? 0;
  const grupSayilari = gruplar.map((g) => {
    const c = siniflar.map(() => 0);
    for (const d of g.degerler) if (Number.isFinite(d) && c.length > 0) c[Math.min(c.length - 1, Math.max(0, Math.floor((d - bas) / w + 1e-9)))]++;
    return c;
  });
  const coklu = gruplar.length > 1;
  const UST = coklu ? 52 : 40;
  const ALT = 58;
  const taban = H - ALT;
  const enCok = Math.max(1, ...grupSayilari.flat());
  const eksen = siklikEkseni(Math.ceil(enCok * 1.15), Math.max(3, Math.floor((taban - UST) / 44)));
  const y = dogrusalOlcek(0, eksen.max, taban, UST);
  const alanG = W - SOL - SAG;
  const sinifG = alanG / Math.max(1, siniflar.length);
  const ondalik = gosterimOndaligi(siniflar.flatMap((s) => [s.alt, s.ust]), 0, 4);
  const etiketAdimi = Math.max(1, Math.ceil((metinGenisligi(sayiMetni(siniflar[siniflar.length - 1]?.ust ?? 0, ondalik), YAZI) + 10) / sinifG));
  return (
    <svg
      data-grafik="histogram"
      role="img"
      aria-label={`${degiskenAdi} histogramı: ${siniflar.length} sınıf, sınıf genişliği ${sayiMetni(w, ondalik)}`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif' }}
      data-sinif-genisligi={sayiMetni(w, ondalik)}
    >
      {eksen.isaretler.map((v) => (
        <g key={v}>
          <line x1={SOL} x2={W - SAG} y1={y.ileri(v)} y2={y.ileri(v)} stroke={RENK.izgara} />
          <text x={SOL - 8} y={y.ileri(v) + 4} fontSize={YAZI} textAnchor="end" fill={RENK.metin}>
            {sayiMetni(v)}
          </text>
        </g>
      ))}
      <text x={SOL} y={coklu ? 40 : 18} fontSize={YAZI} fontWeight={700} fill={RENK.metin} data-eksen-adi="dikey">
        Sıklık
      </text>
      {coklu && <Lejant gruplar={gruplar} x={SOL} y={18} />}
      {siniflar.map((s, i) => {
        const x0 = SOL + i * sinifG;
        const parcaG = sinifG / gruplar.length;
        return (
          <g key={s.alt} data-histogram-sinifi={`${sayiMetni(s.alt, ondalik)}–${sayiMetni(s.ust, ondalik)}`}>
            {gruplar.map((g, gi) => {
              const sayi = grupSayilari[gi][i];
              const tepe = y.ileri(sayi);
              return (
                <g key={g.ad} data-histogram-sutunu={g.ad} data-sayi={sayi}>
                  <title>{`${coklu ? `${g.ad} · ` : ''}${sayiMetni(s.alt, ondalik)} – ${sayiMetni(s.ust, ondalik)}: ${sayi}`}</title>
                  <rect x={x0 + gi * parcaG} y={tepe} width={parcaG} height={Math.max(0, taban - tepe)} fill={g.renk} fillOpacity={0.88} stroke={RENK.kart} strokeWidth={1} />
                  {sayi > 0 && parcaG >= 14 && (
                    <text x={x0 + (gi + 0.5) * parcaG} y={tepe - 6} fontSize={YAZI} fontWeight={800} textAnchor="middle" fill={RENK.metin}>
                      {sayi}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
      {/* Sınıf sınırları: sütunların kenarlarında */}
      {[...siniflar.map((s) => s.alt), siniflar[siniflar.length - 1]?.ust].map((v, i) =>
        v === undefined || i % etiketAdimi !== 0 ? null : (
          <text key={`s-${i}`} x={SOL + i * sinifG} y={taban + 18} fontSize={YAZI} textAnchor="middle" fill={RENK.metin} data-sinif-siniri>
            {sayiMetni(v, ondalik)}
          </text>
        ),
      )}
      <line x1={SOL} x2={SOL} y1={UST - 10} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      <EksenOklari x={SOL} ustY={UST - 10} y={taban} sagX={W - SAG} />
      <text x={W - SAG} y={taban + 42} fontSize={YAZI} fontWeight={700} textAnchor="end" fill={RENK.metin} data-eksen-adi="yatay">
        {metniSigdir(degiskenAdi, YAZI, alanG * 0.7, true)}
      </text>
      {hepsi.length === 0 && (
        <text x={SOL + alanG / 2} y={(UST + taban) / 2} fontSize={YAZI} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Bu değişkende sayısal değer yok
        </text>
      )}
    </svg>
  );
}

// ── Kutu grafiği ────────────────────────────────────────────────────────────

export interface BesSayi {
  enKucuk: number;
  q1: number;
  ortanca: number;
  q3: number;
  enBuyuk: number;
}

/** Kutu grafiğinin beş sayısı; ikiden az veride null */
export function besSayi(degerler: readonly number[]): BesSayi | null {
  const c = ceyrekler(degerler);
  if (!c) return null;
  return { enKucuk: Math.min(...degerler), q1: c.q1, ortanca: medyan(degerler) as number, q3: c.q3, enBuyuk: Math.max(...degerler) };
}

export function KutuGrafigi({ gruplar, degiskenAdi, genislik, yukseklik }: OrtakProps) {
  const W = Math.max(genislik, 240);
  const H = Math.max(yukseklik, 200);
  const hepsi = gruplar.flatMap((g) => g.degerler);
  const ozetler = gruplar.map((g) => besSayi(g.degerler));
  const coklu = gruplar.length > 1;
  const UST = coklu ? 40 : 20;
  const ALT = 58;
  const taban = H - ALT;
  const ondalik = gosterimOndaligi(hepsi, 0, 2);
  const etiketG = coklu ? Math.max(...gruplar.map((g) => metinGenisligi(g.ad, YAZI, true))) + 16 : 0;
  const sol = SOL + etiketG;
  const eksen = hepsi.length > 0 ? guzelEksen(Math.min(...hepsi), Math.max(...hepsi), Math.max(3, Math.floor((W - sol - SAG) / 80))) : guzelEksen(0, 10);
  const x = dogrusalOlcek(eksen.min, eksen.max, sol, W - SAG - 12);
  const satirH = (taban - UST) / Math.max(1, gruplar.length);
  const kutuH = Math.min(56, satirH * 0.42);
  const isaretOndaligi = gosterimOndaligi(eksen.isaretler, 0, 4);
  return (
    <svg
      data-grafik="kutu"
      role="img"
      aria-label={`${degiskenAdi} kutu grafiği`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {coklu && <Lejant gruplar={gruplar} x={sol} y={18} />}
      {eksen.isaretler.map((v) => (
        <g key={v}>
          <line x1={x.ileri(v)} x2={x.ileri(v)} y1={UST} y2={taban} stroke={RENK.izgara} />
          <text x={x.ileri(v)} y={taban + 18} fontSize={YAZI} textAnchor="middle" fill={RENK.metin}>
            {sayiMetni(v, isaretOndaligi)}
          </text>
        </g>
      ))}
      <line x1={sol} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      {/* Yatay eksen ölçektir; dikey eksen yok: yalnız sağ uçta ok */}
      <polyline points={`${W - SAG - 9} ${taban - 4.5} ${W - SAG} ${taban} ${W - SAG - 9} ${taban + 4.5}`} fill="none" stroke={RENK.metin} strokeWidth={1.5} data-eksen-oku="yatay" />
      <text x={W - SAG} y={taban + 42} fontSize={YAZI} fontWeight={700} textAnchor="end" fill={RENK.metin} data-eksen-adi="yatay">
        {metniSigdir(degiskenAdi, YAZI, (W - sol - SAG) * 0.7, true)}
      </text>
      {gruplar.map((g, gi) => {
        const o = ozetler[gi];
        const cy = UST + satirH * (gi + 0.5);
        if (!o) return null;
        const [a, b, m, c, d] = [o.enKucuk, o.q1, o.ortanca, o.q3, o.enBuyuk].map((v) => x.ileri(v));
        const ozet = `En küçük ${sayiMetni(o.enKucuk, ondalik)} · 1. çeyrek ${sayiMetni(o.q1, ondalik)} · Ortanca ${sayiMetni(o.ortanca, ondalik)} · 3. çeyrek ${sayiMetni(o.q3, ondalik)} · En büyük ${sayiMetni(o.enBuyuk, ondalik)}`;
        return (
          <g key={g.ad} data-kutu={g.ad} data-bes-sayi={[o.enKucuk, o.q1, o.ortanca, o.q3, o.enBuyuk].map((v) => sayiMetni(v, ondalik)).join(';')}>
            <title>{`${coklu ? `${g.ad}: ` : ''}${ozet}`}</title>
            {coklu && (
              <text x={sol - 10} y={cy + 4} fontSize={YAZI} fontWeight={700} textAnchor="end" fill={RENK.metin}>
                {g.ad}
              </text>
            )}
            <line x1={a} x2={b} y1={cy} y2={cy} stroke={RENK.metin} strokeWidth={1.5} />
            <line x1={c} x2={d} y1={cy} y2={cy} stroke={RENK.metin} strokeWidth={1.5} />
            <line x1={a} x2={a} y1={cy - kutuH / 4} y2={cy + kutuH / 4} stroke={RENK.metin} strokeWidth={1.5} />
            <line x1={d} x2={d} y1={cy - kutuH / 4} y2={cy + kutuH / 4} stroke={RENK.metin} strokeWidth={1.5} />
            <rect x={b} y={cy - kutuH / 2} width={Math.max(1, c - b)} height={kutuH} rx={3} fill={g.renk} fillOpacity={0.35} stroke={g.renk} strokeWidth={2} />
            <line x1={m} x2={m} y1={cy - kutuH / 2} y2={cy + kutuH / 2} stroke={RENK.metin} strokeWidth={3} data-kutu-ortanca />
            <text x={(sol + W - SAG) / 2} y={cy + kutuH / 2 + 18} fontSize={12} textAnchor="middle" fill={RENK.solukMetin} data-kutu-ozeti>
              {metniSigdir(ozet, 12, W - sol - SAG, false)}
            </text>
          </g>
        );
      })}
      {hepsi.length < 2 && (
        <text x={(sol + W - SAG) / 2} y={(UST + taban) / 2} fontSize={YAZI} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Kutu grafiği için en az iki sayısal değer gerekir
        </text>
      )}
    </svg>
  );
}
