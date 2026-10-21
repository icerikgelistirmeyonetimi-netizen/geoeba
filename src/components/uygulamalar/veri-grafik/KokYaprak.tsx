'use client';

/**
 * Kök-yaprak gösterimi (6. sınıf; sinifKurallari.ts'te Çizgi sekmesinin yerinde). Her değer kök (onlar ve üstü) ile
 * yaprağa (birler) ayrılır; yapraklar köklerin sağında küçükten büyüğe dizilir, aradaki boş kökler de yazılır.
 * - Yaprak birimi veriden seçilir: tam sayılarda 1; ondalıklı veride 0,1 ya da 0,01; çok geniş aralıkta (kök sayısı
 *   20'yi aşarsa) 10, 100 … (değerler yaprak birimine yuvarlanır, altta not yazar). Anahtar: "2 | 5 = 25".
 * - Karşılaştırma (ikinci sayısal değişken ya da iki gruplu kategorik değişken): sırt sırta gösterim; birinci grubun
 *   yaprakları kökün solunda (köke yakın olan küçük), ikincininki sağında.
 * - Negatif değerde gösterim kurulmaz, nedeni yazılır. Bir yaprağa dokununca tablodaki satırı seçilir.
 */
import React, { useMemo } from 'react';
import { sayiMetni } from './istatistik';
import { gecerliDegerler, satirEtiketi, type VeriTablosu } from './veri';
import { RENK } from './grafikOrtak';
import { seriRengi } from './grafik';

export interface KokYapragi {
  satir: number;
  deger: number;
  /** 0–9 */
  yaprak: number;
}

export interface KokSatiri {
  kok: number;
  /** her serinin yaprakları, küçükten büyüğe */
  yapraklar: KokYapragi[][];
}

export interface KokYaprakGosterimi {
  /** yaprak birimi (1, 0,1, 10 …): değer = (kök × 10 + yaprak) × birim */
  birim: number;
  satirlar: KokSatiri[];
  /** bir değer yaprak birimine yuvarlandı mı (ör. 152,5 → 15 | 3) */
  yuvarlandi: boolean;
  /** negatif değer var: gösterim kurulmadı */
  negatif: boolean;
  /** anahtar örneği: sıfırdan büyük ilk dolu kökün (yoksa ilk dolu kökün) ilk yaprağı */
  anahtar: { kok: number; yaprak: number; deger: number } | null;
}

/** Bir veri grubu: değerler satır indeksleriyle */
export type KokYaprakSerisi = { satir: number; deger: number }[];

const EN_COK_KOK = 20;

function ondalikBasamak(v: number): number {
  const m = String(v).split('e')[0];
  const i = m.indexOf('.');
  return i < 0 ? 0 : Math.min(2, m.length - i - 1);
}

/** Kök-yaprak gösterimi: bir ya da iki seri (sırt sırta) aynı köklerde */
export function kokYaprakGosterimi(seriler: readonly KokYaprakSerisi[]): KokYaprakGosterimi {
  const hepsi = seriler.flat();
  const bos: KokYaprakGosterimi = { birim: 1, satirlar: [], yuvarlandi: false, negatif: false, anahtar: null };
  if (hepsi.length === 0) return bos;
  if (hepsi.some((n) => n.deger < 0)) return { ...bos, negatif: true };
  // Yaprak birimi: verinin ondalık basamağından başlar, kök sayısı sınırı aşıyorsa büyür
  let us = -Math.max(...hepsi.map((n) => ondalikBasamak(n.deger)));
  const tamSayi = (v: number, u: number) => Math.round(v / u + 1e-9);
  const kokSayisi = (u: number) => {
    const ns = hepsi.map((n) => tamSayi(n.deger, u));
    return Math.floor(Math.max(...ns) / 10) - Math.floor(Math.min(...ns) / 10) + 1;
  };
  while (kokSayisi(10 ** us) > EN_COK_KOK && us < 12) us += 1;
  const birim = Number((10 ** us).toPrecision(12));
  let yuvarlandi = false;
  const parca = (n: { satir: number; deger: number }) => {
    const t = tamSayi(n.deger, birim);
    if (Math.abs(t * birim - n.deger) > 1e-9 * Math.max(1, Math.abs(n.deger))) yuvarlandi = true;
    return { kok: Math.floor(t / 10), yaprak: t % 10, satir: n.satir, deger: n.deger };
  };
  const parcali = seriler.map((s) => s.map(parca));
  const kokler = parcali.flat().map((p) => p.kok);
  const enKucuk = Math.min(...kokler);
  const enBuyuk = Math.max(...kokler);
  const satirlar: KokSatiri[] = [];
  for (let kok = enKucuk; kok <= enBuyuk; kok++) {
    satirlar.push({
      kok,
      yapraklar: parcali.map((s) =>
        s
          .filter((p) => p.kok === kok)
          .sort((a, b) => a.yaprak - b.yaprak || a.deger - b.deger || a.satir - b.satir)
          .map(({ satir, deger, yaprak }) => ({ satir, deger, yaprak })),
      ),
    });
  }
  // Anahtar örneği: sıfırdan büyük ilk dolu kök ("1 | 2 = 12"); yoksa ilk dolu kök
  const dolu = satirlar.filter((s) => s.yapraklar.some((y) => y.length > 0));
  const ilk = dolu.find((s) => s.kok > 0) ?? dolu[0];
  const ilkYaprak = ilk?.yapraklar.find((y) => y.length > 0)?.[0];
  return {
    birim,
    satirlar,
    yuvarlandi,
    negatif: false,
    anahtar: ilk && ilkYaprak ? { kok: ilk.kok, yaprak: ilkYaprak.yaprak, deger: Number(((ilk.kok * 10 + ilkYaprak.yaprak) * birim).toPrecision(12)) } : null,
  };
}

export interface KokYaprakProps {
  tablo: VeriTablosu;
  sutun: number;
  /**
   * Seriler: iki seri sırt sırta (ikinci sayısal değişken ya da ikinci grup); tek seri o grubun ya da değişkenin
   * kendi gösterimi (gruplar ayrı gösterilirken; başlık serinin adı). Verilmezse sütunun bütün değerleri.
   */
  seriler?: { ad: string; satirlar?: number[]; sutun?: number }[];
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  genislik: number;
  yukseklik: number;
}

const HARF = 7.4;

export function KokYaprak({ tablo, sutun, seriler, seciliSatir, onSatirSec, genislik, yukseklik }: KokYaprakProps) {
  const W = Math.max(0, genislik);
  const H = Math.max(0, yukseklik);
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '';
  // Seriler: verilmezse tek seri (sütunun bütün değerleri); verilirse her biri bir sütun ya da satır alt kümesi
  const seriVerisi = useMemo(() => {
    const tanim = seriler && (seriler.length === 1 || seriler.length === 2) ? seriler : [{ ad: sutunAdi }];
    return tanim.map((s) => {
      const kume = s.satirlar ? new Set(s.satirlar) : null;
      return { ad: s.ad, veri: gecerliDegerler(tablo, s.sutun ?? sutun).filter((n) => kume === null || kume.has(n.satir)) };
    });
  }, [tablo, sutun, seriler, sutunAdi]);
  const g = useMemo(() => kokYaprakGosterimi(seriVerisi.map((s) => s.veri)), [seriVerisi]);
  const sirtSirta = seriVerisi.length === 2;
  const veriSayisi = seriVerisi.reduce((t, s) => t + s.veri.length, 0);

  const UST = 34;
  const ALT = 44;
  const satirSayisi = Math.max(1, g.satirlar.length);
  const satirY = Math.max(18, Math.min(34, (H - UST - ALT - 30) / satirSayisi));
  const fs = satirY >= 26 ? 16 : satirY >= 21 ? 14 : 12;
  const kokG = Math.max(...g.satirlar.map((s) => String(s.kok).length), 1) * fs * 0.62 + 18;
  const enCokYaprak = g.satirlar.reduce((m, s) => Math.max(m, ...s.yapraklar.map((y) => y.length)), 1);
  const yanAlan = sirtSirta ? (W - 32 - kokG) / 2 : W - 32 - kokG;
  const yaprakG = Math.max(fs * 0.62, Math.min(fs * 1.3, (yanAlan - 16) / enCokYaprak));
  // Gösterimin yatay yeri: tek seride sola yaslı (kök sütunu solda), sırt sırta ortada
  const icerikG = sirtSirta ? 2 * (16 + enCokYaprak * yaprakG) + kokG : kokG + 16 + enCokYaprak * yaprakG;
  const x0 = sirtSirta ? Math.max(16, (W - icerikG) / 2) : 24;
  const kokSol = sirtSirta ? x0 + 16 + enCokYaprak * yaprakG : x0;
  const kokSag = kokSol + kokG;
  const baslikY = UST + 12;
  const ilkSatirY = baslikY + satirY;
  const renk = (seri: number) => (sirtSirta ? seriRengi(seri) : RENK.metin);
  const birimMetni = sayiMetni(g.birim, 2);

  return (
    <svg
      data-grafik="kok-yaprak"
      role="img"
      aria-label={`${sutunAdi} kök-yaprak gösterimi${sirtSirta ? `: ${seriVerisi[0].ad} ve ${seriVerisi[1].ad} sırt sırta` : ''}`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      <text x={16} y={20} fontSize={13} fontWeight={700} fill={RENK.metin} data-kok-yaprak-basligi>
        {sirtSirta ? `${seriVerisi[0].ad} ve ${seriVerisi[1].ad}` : seriVerisi[0]?.ad ?? sutunAdi}
      </text>
      {veriSayisi === 0 ? (
        <text x={W / 2} y={H / 2} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Bu değişkende sayısal değer yok
        </text>
      ) : g.negatif ? (
        <text x={W / 2} y={H / 2} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin} data-kok-yaprak-negatif>
          Kök-yaprak gösterimi negatif değerlerle kurulmaz; Nokta ya da Sütun grafiğini deneyin.
        </text>
      ) : (
        <g>
          {/* Sütun başlıkları */}
          <g fontSize={13} fontWeight={700} fill={RENK.solukMetin}>
            {sirtSirta && (
              <text x={kokSol - 16} y={baslikY} textAnchor="end" fill={renk(0)} data-seri-basligi={seriVerisi[0].ad}>
                {`${seriVerisi[0].ad} · Yaprak`}
              </text>
            )}
            <text x={(kokSol + kokSag) / 2} y={baslikY} textAnchor="middle">
              Kök
            </text>
            <text x={kokSag + 16} y={baslikY} fill={sirtSirta ? renk(1) : RENK.solukMetin} data-seri-basligi={sirtSirta ? seriVerisi[1].ad : undefined}>
              {sirtSirta ? `Yaprak · ${seriVerisi[1].ad}` : 'Yaprak'}
            </text>
          </g>
          {/* Kök sütununun iki yanındaki dikey çizgiler */}
          {sirtSirta && <line x1={kokSol} x2={kokSol} y1={baslikY + 8} y2={ilkSatirY + (g.satirlar.length - 1) * satirY + 8} stroke={RENK.metin} strokeWidth={1.5} />}
          <line x1={kokSag} x2={kokSag} y1={baslikY + 8} y2={ilkSatirY + (g.satirlar.length - 1) * satirY + 8} stroke={RENK.metin} strokeWidth={1.5} />
          {g.satirlar.map((s, i) => {
            const y = ilkSatirY + i * satirY;
            return (
              <g key={s.kok} data-kok={s.kok}>
                <text x={(kokSol + kokSag) / 2} y={y} fontSize={fs} fontWeight={800} textAnchor="middle" fill={RENK.metin}>
                  {s.kok}
                </text>
                {s.yapraklar.map((liste, seri) =>
                  liste.map((yp, k) => {
                    // Sırt sırta: birinci seri solda, köke en yakın olan en küçük yaprak
                    const x = sirtSirta && seri === 0 ? kokSol - 16 - (k + 0.5) * yaprakG : kokSag + 16 + (k + 0.5) * yaprakG;
                    const secili = seciliSatir === yp.satir;
                    return (
                      <g key={`${seri}-${yp.satir}`} style={{ cursor: 'pointer' }} onClick={() => onSatirSec(secili ? null : yp.satir)} data-yaprak={yp.yaprak} data-seri={seri}>
                        <title>{`${satirEtiketi(tablo, yp.satir)}: ${sayiMetni(yp.deger, 2)}`}</title>
                        {secili && <rect data-yalniz-ekran x={x - yaprakG / 2} y={y - fs} width={yaprakG} height={fs + 6} rx={4} fill={RENK.vurgu} fillOpacity={0.25} />}
                        <text x={x} y={y} fontSize={fs} fontWeight={secili ? 800 : 600} textAnchor="middle" fill={renk(seri)}>
                          {yp.yaprak}
                        </text>
                      </g>
                    );
                  }),
                )}
              </g>
            );
          })}
          {/* Anahtar ve (gerekirse) yuvarlama notu */}
          {g.anahtar && (
            <text x={16} y={H - 16} fontSize={13} fontWeight={700} fill={RENK.metin} data-kok-yaprak-anahtari>
              {`Anahtar: ${g.anahtar.kok} | ${g.anahtar.yaprak} = ${sayiMetni(g.anahtar.deger, 2)}`}
              {g.birim !== 1 && <tspan fontWeight={600} fill={RENK.solukMetin}>{`  (yaprak birimi ${birimMetni}${g.yuvarlandi ? '; değerler yuvarlandı' : ''})`}</tspan>}
            </text>
          )}
          {sirtSirta && (
            <text x={W - 16} y={H - 16} fontSize={13} fontWeight={600} textAnchor="end" fill={RENK.solukMetin}>
              {metinKisalt(`Solda ${seriVerisi[0].ad}, sağda ${seriVerisi[1].ad}`, W / 2 - 24)}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}

function metinKisalt(m: string, g: number): string {
  const sigan = Math.max(4, Math.floor(g / HARF));
  return m.length > sigan ? `${m.slice(0, sigan - 1)}…` : m;
}
