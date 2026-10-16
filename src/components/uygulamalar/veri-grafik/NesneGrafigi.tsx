'use client';

import React from 'react';
import { frekanslar, kategoriRengi, sutunMetinleri } from './kategorik';
import { RENK, metniSigdir } from './grafikOrtak';
import { KareIsareti, NesneIsareti, nesneBul } from './nesneSimgeleri';
import type { VeriTablosu } from './veri';

/** Ders kitabındaki nesne grafiği: ad solda, eş büyüklükte resimler aynı başlangıçtan sağa dizilir. */
export function NesneGrafigi({ tablo, sutun, sira, genislik, yukseklik, seciliSatir = null, onSatirSec }: {
  tablo: VeriTablosu; sutun: number; sira?: string[]; genislik: number; yukseklik: number; seciliSatir?: number | null; onSatirSec: (satir: number | null) => void;
}) {
  const veriler = sutunMetinleri(tablo, sutun);
  const f = frekanslar(veriler.map(v => v.deger), sira);
  const w = Math.max(300, genislik), sol = Math.min(170, w * 0.28), ust = 58;
  const enCok = Math.max(1, ...f.map(x => x.sayi));
  const adim = Math.min(58, (w - sol - 36) / enCok);
  const satirY = Math.max(38, Math.min(72, (yukseklik - ust - 40) / Math.max(1, f.length + 1)));
  const r = Math.max(2, Math.min(22, (adim - 6) / 2, satirY / 2 - 8));
  const h = Math.max(yukseklik, ust + (f.length + 1) * satirY + 40);
  return <svg data-grafik="nokta" data-nesne-tablosu role="img" aria-label={`${tablo.sutunlar[sutun]?.ad} nesne grafiği`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block bg-card">
    <text x={16} y={26} fill={RENK.metin} fontWeight={700} fontSize={17}>Grafik adı: {tablo.sutunlar[sutun]?.ad} tercihleri</text>
    <rect x={12} y={ust} width={w - 24} height={satirY * (f.length + 1)} fill={RENK.kart} stroke={RENK.kenar}/>
    <rect x={12} y={ust} width={w - 24} height={satirY} fill={RENK.izgara}/>
    <line x1={sol} x2={sol} y1={ust} y2={ust + satirY * (f.length + 1)} stroke={RENK.kenar}/>
    <text x={22} y={ust + satirY / 2 + 5} fill={RENK.metin} fontSize={15} fontWeight={700}>{tablo.sutunlar[sutun]?.ad}</text>
    <text x={sol + 16} y={ust + satirY / 2 + 5} fill={RENK.metin} fontSize={15} fontWeight={700}>Öğrenci sayısı</text>
    {f.map((x, i) => <g key={x.kategori}>
      <line x1={12} x2={w - 12} y1={ust + (i + 1) * satirY} y2={ust + (i + 1) * satirY} stroke={RENK.kenar}/>
      <text x={22} y={ust + (i + 1.5) * satirY + 5} fill={RENK.metin} fontSize={15}>{metniSigdir(x.kategori, 15, sol - 36)}</text>
      {veriler.filter(v => v.deger === x.kategori).map((v, j) => {
        const nesne = nesneBul(x.kategori), p = {r, dolgu: kategoriRengi(x.kategori, i), kenar: RENK.kart, kenarKalinligi: 1};
        return <g key={v.satir} transform={`translate(${sol + 16 + adim * (j + 0.5)}, ${ust + (i + 1.5) * satirY})`} role="button" tabIndex={0} aria-pressed={seciliSatir === v.satir} data-satir={v.satir} aria-label={`${x.kategori}, ${j + 1}. öğrenci`} onClick={() => onSatirSec(v.satir)} onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); onSatirSec(v.satir);}}}>
          {seciliSatir === v.satir && <rect x={-r - 4} y={-r - 4} width={(r + 4) * 2} height={(r + 4) * 2} rx={5} fill="none" stroke={RENK.metin} strokeWidth={2} />}
          {nesne ? <NesneIsareti {...p} nesne={nesne}/> : <KareIsareti {...p}/>}
        </g>;
      })}
    </g>)}
    <text data-sekil-anahtari x={16} y={ust + (f.length + 1) * satirY + 28} fill={RENK.metin} fontSize={14}>Her resim 1 öğrenciyi gösterir.</text>
  </svg>;
}
