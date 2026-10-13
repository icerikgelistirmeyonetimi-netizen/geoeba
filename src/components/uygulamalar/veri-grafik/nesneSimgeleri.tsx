'use client';

/**
 * İlkokul nesne ve şekil grafiğinin veri işaretleri (alan uzmanı, 4. tur, satır 181; TYMM 1. sınıf: nesne grafiği,
 * 2. sınıf: şekil grafiği). Nokta grafiği her veriyi yarıçapı `r` olan bir dairenin yerine bunlarla çizer:
 * - şekil: kare (her kare bir veri; köşeleri hafif yuvarlak),
 * - nesne: kategorinin resmi (top, uçurtma, araba, ayıcık …); resmi olmayan kategoride kare.
 * Resimler kategori renginde doldurulur (renk = kategori kuralı: lejant, tablo ve sıklık tablosuyla aynı renk), ayrıntılar
 * kart renginde. Hepsi `r` yarıçaplı dairenin içine sığar (yığın aralığı değişmez). Emoji ve bitmap yok.
 */
import React from 'react';
import { RENK } from './grafikOrtak';

export type NesneAdi = 'top' | 'ucurtma' | 'araba' | 'ayicik';

/** Kategori adı → nesne resmi (Türkçe küçük harfle; tanınmayan ad null) */
export function nesneBul(kategori: string | undefined): NesneAdi | null {
  if (!kategori) return null;
  const k = kategori.trim().toLocaleLowerCase('tr');
  if (k === 'top' || k === 'top oyunu') return 'top';
  if (k === 'uçurtma') return 'ucurtma';
  if (k === 'araba' || k === 'oyuncak araba') return 'araba';
  if (k === 'ayıcık' || k === 'oyuncak ayı' || k === 'ayı') return 'ayicik';
  return null;
}

interface IsaretProps {
  r: number;
  dolgu: string;
  kenar: string;
  kenarKalinligi: number;
}

/** Şekil grafiğinin karesi: `r` yarıçaplı dairenin içine (köşegeni 2r'den biraz kısa) */
export function KareIsareti({ r, dolgu, kenar, kenarKalinligi }: IsaretProps) {
  const a = r * 0.86;
  return <rect x={-a} y={-a} width={2 * a} height={2 * a} rx={Math.max(1, r * 0.16)} fill={dolgu} stroke={kenar} strokeWidth={kenarKalinligi} data-sekil="kare" />;
}

/** Nesnenin resmi: 20 × 20 birimlik çizim `r / 10` ölçeğiyle; kategori renginde, ayrıntılar kart renginde */
export function NesneIsareti({ nesne, r, dolgu, kenar, kenarKalinligi }: IsaretProps & { nesne: NesneAdi }) {
  const s = r / 10;
  const ayrinti = RENK.kart;
  const ince = { fill: 'none', stroke: ayrinti, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  // Kenar ölçekten bağımsız kalsın (ince noktada kalın kenar olmasın)
  const k = { stroke: kenar, strokeWidth: kenarKalinligi / Math.max(0.2, s), strokeLinejoin: 'round' as const };
  let cizim: React.ReactNode;
  if (nesne === 'top') {
    cizim = (
      <>
        <circle r={9.4} fill={dolgu} {...k} />
        <path d="M-6.4 -6.9C-2.2 -3 -2.2 3 -6.4 6.9M6.4 -6.9C2.2 -3 2.2 3 6.4 6.9" {...ince} strokeWidth={1.8} />
        <path d="M-3.2 -6.6A7.2 7.2 0 0 1 2 -7.3" fill="none" stroke={ayrinti} strokeOpacity={0.7} strokeWidth={1.4} strokeLinecap="round" />
      </>
    );
  } else if (nesne === 'ucurtma') {
    cizim = (
      <>
        <path d="M0 -9.8L8 -2.6L0 6L-8 -2.6Z" fill={dolgu} {...k} />
        <path d="M0 -9.8V6M-8 -2.6H8" {...ince} strokeWidth={1.4} />
        <path d="M0 6C2.6 7 -2.6 8.2 0.4 9.8" fill="none" stroke={dolgu} strokeWidth={1.6} strokeLinecap="round" />
        <path d="M-2.2 7.9L0 7L2.2 7.9" fill="none" stroke={dolgu} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  } else if (nesne === 'araba') {
    cizim = (
      <>
        <path d="M-9.6 2V-0.6C-9.6 -1.8 -8.8 -2.6 -7.6 -2.6H-5.4L-2.8 -6.6H3.8L6.4 -2.6H8C9 -2.6 9.6 -1.9 9.6 -0.9V2C9.6 3 9 3.6 8 3.6H-8C-9 3.6 -9.6 3 -9.6 2Z" fill={dolgu} {...k} />
        <path d="M-2 -5.3H0.2V-2.7H-3.8ZM1.5 -5.3H3.2L4.8 -2.7H1.5Z" fill={ayrinti} />
        <circle cx={-5.2} cy={4.2} r={2.9} fill={RENK.metin} stroke={ayrinti} strokeWidth={0.8} />
        <circle cx={5.2} cy={4.2} r={2.9} fill={RENK.metin} stroke={ayrinti} strokeWidth={0.8} />
        <circle cx={-5.2} cy={4.2} r={1} fill={ayrinti} />
        <circle cx={5.2} cy={4.2} r={1} fill={ayrinti} />
      </>
    );
  } else {
    cizim = (
      <>
        <circle cx={-6} cy={-5.8} r={3.4} fill={dolgu} {...k} />
        <circle cx={6} cy={-5.8} r={3.4} fill={dolgu} {...k} />
        <circle cy={0.8} r={8.2} fill={dolgu} {...k} />
        <circle cx={-6} cy={-5.8} r={1.5} fill={ayrinti} />
        <circle cx={6} cy={-5.8} r={1.5} fill={ayrinti} />
        <ellipse cy={3.6} rx={3.7} ry={2.9} fill={ayrinti} />
        <ellipse cy={2.5} rx={1.4} ry={1} fill={RENK.metin} />
        <circle cx={-3} cy={-1.2} r={1.1} fill={RENK.metin} />
        <circle cx={3} cy={-1.2} r={1.1} fill={RENK.metin} />
      </>
    );
  }
  return (
    <g transform={`scale(${Math.round(s * 1000) / 1000})`} data-nesne={nesne}>
      {cizim}
    </g>
  );
}
