/**
 * Veri topla — elle çizilmiş satır içi SVG simgeler (VT §11.9). Emoji ve bitmap yok.
 * - 20 px arayüz simgeleri: viewBox 20, çizgi 1,8, uçlar yuvarlak, renk currentColor.
 * - 40 px hazır soru simgeleri: viewBox 40, çizgi 2, tek vurgu dolgusu kategori renginde (%20).
 * Hepsi aria-hidden; anlamı yanındaki metin taşır.
 */
import React from 'react';

export interface SimgeProps {
  className?: string;
}

const CIZGI = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function Simge20({ className = 'h-5 w-5', children }: SimgeProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** Pano + çetele: araç çubuğundaki "Veri topla" düğmesi ve panel başlığı (18 px) */
export function VeriToplaSimgesi({ className = 'h-[18px] w-[18px]' }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <rect x="3.6" y="3.4" width="12.8" height="14.4" rx="2.2" {...CIZGI} />
      <path d="M7.3 4.6V3a.9.9 0 0 1 .9-.9h3.6a.9.9 0 0 1 .9.9v1.6z" {...CIZGI} strokeWidth={1.5} />
      <path d="M6.9 8.4v5.4M9 8.4v5.4M11.1 8.4v5.4M13.2 8.4v5.4" {...CIZGI} strokeWidth={1.5} />
      <path d="M5.9 13.1l8.3-4.1" {...CIZGI} strokeWidth={1.6} />
    </Simge20>
  );
}

/** Anket: pano + iki onay */
export function AnketSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <rect x="3.6" y="3.4" width="12.8" height="14.4" rx="2.2" {...CIZGI} />
      <path d="M7.3 4.6V3a.9.9 0 0 1 .9-.9h3.6a.9.9 0 0 1 .9.9v1.6z" {...CIZGI} strokeWidth={1.5} />
      <path d="M6.3 9.1l1.2 1.2 2-2.4M11.2 9.4h2.6M6.3 13.5l1.2 1.2 2-2.4M11.2 13.8h2.6" {...CIZGI} strokeWidth={1.6} />
    </Simge20>
  );
}

/** Ölçüm: çentikli cetvel */
export function OlcumSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <rect x="1.9" y="6.3" width="16.2" height="7.4" rx="1.5" {...CIZGI} />
      <path d="M5 6.3v2.6M8 6.3v3.8M11 6.3v2.6M14 6.3v3.8" {...CIZGI} strokeWidth={1.5} />
    </Simge20>
  );
}

/** Deney: üç benekli sayı küpü */
export function DeneySimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <rect x="3.2" y="3.2" width="13.6" height="13.6" rx="3" {...CIZGI} />
      <circle cx="7" cy="7" r="1.35" fill="currentColor" />
      <circle cx="10" cy="10" r="1.35" fill="currentColor" />
      <circle cx="13" cy="13" r="1.35" fill="currentColor" />
    </Simge20>
  );
}

/** Madenî para: iç halkalı daire */
export function ParaSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <circle cx="10" cy="10" r="7.4" {...CIZGI} />
      <circle cx="10" cy="10" r="4.5" {...CIZGI} strokeWidth={1.3} strokeDasharray="1.6 1.6" />
    </Simge20>
  );
}

/** Sayı küpü: beş benek */
export function ZarSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <rect x="3.2" y="3.2" width="13.6" height="13.6" rx="3" {...CIZGI} />
      {[
        [6.9, 6.9],
        [13.1, 6.9],
        [10, 10],
        [6.9, 13.1],
        [13.1, 13.1],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill="currentColor" />
      ))}
    </Simge20>
  );
}

/** İki sayı küpü: üst üste iki kare */
export function IkiZarSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M8.6 7.6H4.3a2.2 2.2 0 0 0-2.2 2.2v4.5a2.2 2.2 0 0 0 2.2 2.2h4.5a2.2 2.2 0 0 0 2.2-2.2v-1.8" {...CIZGI} />
      <rect x="8.6" y="3.2" width="9.3" height="9.3" rx="2.2" {...CIZGI} />
      <circle cx="6.5" cy="12.1" r="1.15" fill="currentColor" />
      <circle cx="11.6" cy="6.2" r="1.1" fill="currentColor" />
      <circle cx="14.9" cy="9.5" r="1.1" fill="currentColor" />
    </Simge20>
  );
}

/** Çark: üç dilim + tepede üçgen ibre */
export function CarkSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <circle cx="10" cy="11.4" r="6.6" {...CIZGI} />
      <path d="M10 11.4V4.8M10 11.4l5.7 3.3M10 11.4l-5.7 3.3" {...CIZGI} strokeWidth={1.4} />
      <path d="M8.1 1.2h3.8L10 4.1z" fill="currentColor" stroke="currentColor" strokeWidth={0.8} strokeLinejoin="round" />
    </Simge20>
  );
}

/** Torba: bağcıklı çuval */
export function TorbaSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M7.3 7.8C4.8 9.4 3.4 12 3.4 14c0 2.4 2.7 3.8 6.6 3.8s6.6-1.4 6.6-3.8c0-2-1.4-4.6-3.9-6.2" {...CIZGI} />
      <path d="M7.3 7.8L5.9 3.6c1.4.5 2.7.7 4.1.7s2.7-.2 4.1-.7l-1.4 4.2" {...CIZGI} />
      <path d="M7 7.8h6" {...CIZGI} strokeWidth={2.2} />
    </Simge20>
  );
}

/** Çetele (Elle kaydet) */
export function CeteleSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M5 4.5v11M8 4.5v11M11 4.5v11M14 4.5v11" {...CIZGI} />
      <path d="M3.2 13.2l13.6-6.4" {...CIZGI} />
    </Simge20>
  );
}

/** Ekran (Bilgisayar atsın) */
export function BilgisayarSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <rect x="2.4" y="3.4" width="15.2" height="10.2" rx="1.6" {...CIZGI} />
      <path d="M7 17h6M10 13.6V17" {...CIZGI} />
    </Simge20>
  );
}

export function OnaySimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M4.5 10.4l3.6 3.6 7.4-8" {...CIZGI} strokeWidth={2} />
    </Simge20>
  );
}

/** Geri al: sola kıvrık ok */
export function GeriAlSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M7.6 5.2L4 8.8l3.6 3.6" {...CIZGI} />
      <path d="M4.4 8.8h7.4a4.3 4.3 0 0 1 0 8.6H9" {...CIZGI} />
    </Simge20>
  );
}

/** Başlat: dolu üçgen */
export function BaslatSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M6.4 4.5v11a.8.8 0 0 0 1.2.7l8.7-5.5a.8.8 0 0 0 0-1.4L7.6 3.8a.8.8 0 0 0-1.2.7z" fill="currentColor" />
    </Simge20>
  );
}

/** Durdur: dolu kare */
export function DurdurSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <rect x="5" y="5" width="10" height="10" rx="1.8" fill="currentColor" />
    </Simge20>
  );
}

/** Sil: içinde çarpı olan beşgen (silme tuşu) */
export function SilSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M7.1 4.6h8.4a1.6 1.6 0 0 1 1.6 1.6v7.6a1.6 1.6 0 0 1-1.6 1.6H7.1L2.6 10z" {...CIZGI} />
      <path d="M9.6 7.8l4.4 4.4M14 7.8l-4.4 4.4" {...CIZGI} />
    </Simge20>
  );
}

/** Bilgi: daire içinde i */
export function BilgiSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <circle cx="10" cy="10" r="7.6" {...CIZGI} />
      <path d="M10 9.1v4.8" {...CIZGI} strokeWidth={2} />
      <circle cx="10" cy="6.4" r="1.1" fill="currentColor" />
    </Simge20>
  );
}

export function ArtiSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M10 4.2v11.6M4.2 10h11.6" {...CIZGI} strokeWidth={2} />
    </Simge20>
  );
}

export function EksiSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M4.2 10h11.6" {...CIZGI} strokeWidth={2} />
    </Simge20>
  );
}

export function KapatSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M5.4 5.4l9.2 9.2M14.6 5.4l-9.2 9.2" {...CIZGI} strokeWidth={2} />
    </Simge20>
  );
}

export function AsagiOkSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M5.2 7.6l4.8 4.8 4.8-4.8" {...CIZGI} strokeWidth={2} />
    </Simge20>
  );
}

export function YukariOkSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M5.2 12.4L10 7.6l4.8 4.8" {...CIZGI} strokeWidth={2} />
    </Simge20>
  );
}

export function SagOkSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M7.6 5.2l4.8 4.8-4.8 4.8" {...CIZGI} strokeWidth={2} />
    </Simge20>
  );
}

export function SolOkSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M12.4 5.2L7.6 10l4.8 4.8" {...CIZGI} strokeWidth={2} />
    </Simge20>
  );
}

/** Çift yönlü ok ("Önceki tabloya dön") */
export function CiftYonluOkSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M3.6 7h12M12.6 4l3 3-3 3M16.4 13h-12M7.4 10l-3 3 3 3" {...CIZGI} />
    </Simge20>
  );
}

/** Hız göstergesi ("Hız: Otomatik") */
export function HizSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M3.4 14.6a6.6 6.6 0 1 1 13.2 0" {...CIZGI} />
      <path d="M10 14.4l3.4-4.2" {...CIZGI} strokeWidth={2} />
      <circle cx="10" cy="14.4" r="1.3" fill="currentColor" />
    </Simge20>
  );
}

/** Kalem (seçenek adını düzenle) */
export function KalemSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M12.8 3.9l3.3 3.3-8.9 8.9-4 .7.7-4z" {...CIZGI} />
      <path d="M11 5.7l3.3 3.3" {...CIZGI} />
    </Simge20>
  );
}

/** Seri ("Atış sayısı artınca ne olur?"): yükselen, sonra düzleşen çizgi ve kesikli teorik çizgi */
export function SeriSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M2.6 10.2h14.8" {...CIZGI} strokeWidth={1.4} strokeDasharray="2 2.2" />
      <path d="M2.8 15.6l3.4-9.4 3.2 7.2 3-4.4 2.6 2 2.6-1" {...CIZGI} />
      <circle cx="6.2" cy="6.2" r="1.25" fill="currentColor" />
      <circle cx="17.6" cy="10" r="1.25" fill="currentColor" />
    </Simge20>
  );
}

/** Tahmin (düşünce balonu içinde soru işareti) */
export function TahminSimgesi({ className }: SimgeProps) {
  return (
    <Simge20 className={className}>
      <path d="M10 3.2c4.1 0 7.2 2.6 7.2 5.9s-3.1 5.9-7.2 5.9c-.8 0-1.6-.1-2.3-.3L4 16.6l.9-3.4C3.6 12.1 2.8 10.7 2.8 9.1c0-3.3 3.1-5.9 7.2-5.9z" {...CIZGI} />
      <path d="M8.3 7.5a1.8 1.8 0 1 1 2.6 1.6c-.6.3-.9.7-.9 1.3" {...CIZGI} strokeWidth={1.6} />
      <circle cx="10" cy="12.2" r="1" fill="currentColor" />
    </Simge20>
  );
}

// ── 40 px hazır soru simgeleri ───────────────────────────────────────────────

export const HAZIR_SIMGE_ADLARI = [
  'elma',
  'otobus',
  'gunes',
  'takvim',
  'oy-sandigi',
  'iki-kisi',
  'kitap',
  'boy-olcer',
  'kalp',
  'ay',
  'saat',
  'para',
  'zar',
  'torba',
  'cark',
  'kale',
  'seri',
  'iki-zar',
] as const;

export type HazirSimgeAdi = (typeof HAZIR_SIMGE_ADLARI)[number];

/** Her hazır soru simgesinin varsayılan vurgu rengi (ada paleti ve kategori paletinden) */
export const HAZIR_SIMGE_RENKLERI: Record<HazirSimgeAdi, string> = {
  elma: '#c75454',
  otobus: '#b9884a',
  gunes: '#b9884a',
  takvim: '#216a78',
  'oy-sandigi': '#7f88c4',
  'iki-kisi': '#2a9d94',
  kitap: '#7f88c4',
  'boy-olcer': '#216a78',
  kalp: '#d9805f',
  ay: '#7f88c4',
  saat: '#2a9d94',
  para: '#b9884a',
  zar: '#216a78',
  torba: '#c75454',
  cark: '#2a9d94',
  kale: '#6b8e3a',
  seri: '#d9805f',
  'iki-zar': '#7f88c4',
};

const C40 = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function hazirCizim(ad: HazirSimgeAdi, v: { fill: string; fillOpacity: number }): React.ReactNode {
  switch (ad) {
    case 'elma':
      return (
        <>
          <path
            d="M20 13.4c-2.2-1.6-5.3-2.3-7.9-1-3.6 1.8-4.7 6.3-3.7 10.2 1.2 4.7 4.7 9.5 8.4 9.7 1.3.1 2.2-.6 3.2-.6s1.9.7 3.2.6c3.7-.2 7.2-5 8.4-9.7 1-3.9-.1-8.4-3.7-10.2-2.6-1.3-5.7-.6-7.9 1z"
            {...v}
          />
          <path
            d="M20 13.4c-2.2-1.6-5.3-2.3-7.9-1-3.6 1.8-4.7 6.3-3.7 10.2 1.2 4.7 4.7 9.5 8.4 9.7 1.3.1 2.2-.6 3.2-.6s1.9.7 3.2.6c3.7-.2 7.2-5 8.4-9.7 1-3.9-.1-8.4-3.7-10.2-2.6-1.3-5.7-.6-7.9 1z"
            {...C40}
          />
          <path d="M20 13.4c-.1-2.6.5-4.8 2.1-6.6" {...C40} />
          <path d="M21.6 9.4c1.3-2.7 4.1-4 7-3.5-.5 3-3.5 4.8-7 3.5z" {...C40} strokeWidth={1.8} />
          <path d="M13 17.6c-1.2 1-1.8 2.6-1.7 4.3" {...C40} strokeWidth={1.6} opacity={0.55} />
        </>
      );
    case 'otobus':
      return (
        <>
          <rect x="8" y="6.5" width="24" height="23" rx="4.5" {...C40} />
          <rect x="11" y="10" width="18" height="8.5" rx="1.8" {...v} />
          <rect x="11" y="10" width="18" height="8.5" rx="1.8" {...C40} strokeWidth={1.7} />
          <path d="M8 22.5h24" {...C40} strokeWidth={1.6} />
          <circle cx="13.2" cy="25.8" r="1.5" fill="currentColor" />
          <circle cx="26.8" cy="25.8" r="1.5" fill="currentColor" />
          <path d="M12 29.5v3.6M28 29.5v3.6" {...C40} strokeWidth={2.8} />
          <path d="M16.5 8.5h7" {...C40} strokeWidth={1.6} />
        </>
      );
    case 'gunes':
      return (
        <>
          <circle cx="20" cy="20" r="7" {...v} />
          <circle cx="20" cy="20" r="7" {...C40} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const r = (a * Math.PI) / 180;
            const x1 = 20 + Math.cos(r) * 10.8;
            const y1 = 20 + Math.sin(r) * 10.8;
            const x2 = 20 + Math.cos(r) * 14.6;
            const y2 = 20 + Math.sin(r) * 14.6;
            return <path key={a} d={`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`} {...C40} />;
          })}
        </>
      );
    case 'takvim':
      return (
        <>
          <rect x="7" y="9" width="26" height="23.5" rx="3.2" {...C40} />
          <path d="M7 15.5h26" {...C40} />
          <path d="M13.5 6.2v5.2M26.5 6.2v5.2" {...C40} strokeWidth={2.4} />
          {[13, 18, 23, 28].flatMap((x) =>
            [20.5, 26.5].map((y) => (x === 23 && y === 26.5 ? null : <circle key={`${x}-${y}`} cx={x} cy={y} r="1.25" fill="currentColor" />)),
          )}
          <circle cx="23" cy="26.5" r="3.2" {...v} />
          <circle cx="23" cy="26.5" r="3.2" {...C40} strokeWidth={1.7} />
        </>
      );
    case 'oy-sandigi':
      return (
        <>
          <path d="M15.5 20.5V8.6a1.2 1.2 0 0 1 1.2-1.2h7.6a1.2 1.2 0 0 1 1.2 1.2v11.9" {...C40} />
          <path d="M17.8 13.4l1.8 1.8 3.4-3.8" {...C40} strokeWidth={1.8} />
          <path d="M8 20.5h24v11a2.2 2.2 0 0 1-2.2 2.2H10.2A2.2 2.2 0 0 1 8 31.5z" {...v} />
          <path d="M8 20.5h24v11a2.2 2.2 0 0 1-2.2 2.2H10.2A2.2 2.2 0 0 1 8 31.5z" {...C40} />
          <path d="M14 20.5h12" {...C40} strokeWidth={2.8} />
        </>
      );
    case 'iki-kisi':
      return (
        <>
          <circle cx="15" cy="13.5" r="4.8" {...v} />
          <circle cx="15" cy="13.5" r="4.8" {...C40} />
          <path d="M6.5 32c0-5 3.8-9 8.5-9s8.5 4 8.5 9" {...C40} />
          <circle cx="27.5" cy="17" r="3.6" {...C40} />
          <path d="M22.6 25.6c1.2-1.3 2.9-2 4.9-2 3.4 0 6 3 6 8.4" {...C40} />
        </>
      );
    case 'kitap':
      return (
        <>
          <path d="M20 12.2c-3-2-7.6-2.7-12-2.1v19.3c4.4-.6 9 .1 12 2.1z" {...v} />
          <path d="M20 12.2c-3-2-7.6-2.7-12-2.1v19.3c4.4-.6 9 .1 12 2.1 3-2 7.6-2.7 12-2.1V10.1c-4.4-.6-9 .1-12 2.1z" {...C40} />
          <path d="M20 12.2v19.3" {...C40} />
          <path d="M11.5 15.2c2 0 3.8.4 5.4 1.2M11.5 19.6c2 0 3.8.4 5.4 1.2M23.1 16.4c1.6-.8 3.4-1.2 5.4-1.2" {...C40} strokeWidth={1.5} opacity={0.6} />
        </>
      );
    case 'boy-olcer':
      return (
        <>
          <rect x="25" y="5" width="8" height="30" rx="1.6" {...v} />
          <rect x="25" y="5" width="8" height="30" rx="1.6" {...C40} />
          <path d="M25 10h3M25 15h4.5M25 20h3M25 25h4.5M25 30h3" {...C40} strokeWidth={1.5} />
          <path d="M11 7.5h14" {...C40} strokeWidth={1.8} />
          <circle cx="14.5" cy="12.5" r="3.4" {...C40} />
          <path d="M14.5 16.5v10.5M10.2 20.8h8.6M14.5 27l-3.2 7M14.5 27l3.2 7" {...C40} />
        </>
      );
    case 'kalp':
      return (
        <>
          <path d="M20 33s-12-7.4-12-15.6c0-3.7 2.8-6.6 6.4-6.6 2.4 0 4.4 1.3 5.6 3.3 1.2-2 3.2-3.3 5.6-3.3 3.6 0 6.4 2.9 6.4 6.6C32 25.6 20 33 20 33z" {...v} />
          <path d="M20 33s-12-7.4-12-15.6c0-3.7 2.8-6.6 6.4-6.6 2.4 0 4.4 1.3 5.6 3.3 1.2-2 3.2-3.3 5.6-3.3 3.6 0 6.4 2.9 6.4 6.6C32 25.6 20 33 20 33z" {...C40} />
          <path d="M5 21.5h7.2l2.4-4.6 3.6 9.2 3-6.6 1.8 2h12" {...C40} strokeWidth={1.9} />
        </>
      );
    case 'ay':
      return (
        <>
          <path d="M21.5 9.6a11.2 11.2 0 1 0 8.9 17.1A9 9 0 0 1 21.5 9.6z" {...v} />
          <path d="M21.5 9.6a11.2 11.2 0 1 0 8.9 17.1A9 9 0 0 1 21.5 9.6z" {...C40} />
          <path d="M26 6.5h4.4l-4.4 5h4.4" {...C40} strokeWidth={1.8} />
          <path d="M31.5 13.5h3l-3 3.4h3" {...C40} strokeWidth={1.6} />
        </>
      );
    case 'saat':
      return (
        <>
          <circle cx="20" cy="21" r="12.5" {...v} />
          <circle cx="20" cy="21" r="12.5" {...C40} />
          <path d="M20 13.5V21l5 3.2" {...C40} strokeWidth={2.2} />
          <path d="M20 9.9v1.6M31.1 21h-1.6M20 32.1v-1.6M8.9 21h1.6" {...C40} strokeWidth={1.6} />
          <path d="M15.5 5.5h9" {...C40} strokeWidth={2.4} />
        </>
      );
    case 'para':
      return (
        <>
          <circle cx="20" cy="21.5" r="13" fill="currentColor" opacity={0.14} />
          <circle cx="20" cy="19.5" r="13" {...v} />
          <circle cx="20" cy="19.5" r="13" {...C40} />
          <circle cx="20" cy="19.5" r="9" {...C40} strokeWidth={1.5} strokeDasharray="2.2 2.2" />
          <path d="M13.5 13.8c1.4-1.8 3.4-2.9 5.6-3.2" {...C40} strokeWidth={1.6} opacity={0.6} />
        </>
      );
    case 'zar':
      return (
        <>
          <rect x="9" y="9" width="22" height="22" rx="5" {...v} />
          <rect x="9" y="9" width="22" height="22" rx="5" {...C40} />
          {[
            [14.4, 14.4],
            [25.6, 14.4],
            [20, 20],
            [14.4, 25.6],
            [25.6, 25.6],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="currentColor" />
          ))}
        </>
      );
    case 'torba':
      return (
        <>
          <path d="M14.4 15.6C9.6 18.8 7.4 23.6 7.4 27.4c0 4.4 5 6.8 12.6 6.8s12.6-2.4 12.6-6.8c0-3.8-2.2-8.6-7-11.8z" {...v} />
          <path d="M14.4 15.6C9.6 18.8 7.4 23.6 7.4 27.4c0 4.4 5 6.8 12.6 6.8s12.6-2.4 12.6-6.8c0-3.8-2.2-8.6-7-11.8" {...C40} />
          <path d="M14.4 15.6l-2.6-7c2.6.9 5.3 1.3 8.2 1.3s5.6-.4 8.2-1.3l-2.6 7" {...C40} />
          <path d="M13.8 15.6h12.4" {...C40} strokeWidth={2.6} />
          <circle cx="16.5" cy="26.5" r="2.3" {...C40} strokeWidth={1.6} />
          <circle cx="23" cy="27.8" r="2.3" {...C40} strokeWidth={1.6} />
        </>
      );
    case 'cark':
      return (
        <>
          <path d="M20 22.5V9.5A13 13 0 0 1 31.26 29z" {...v} />
          <circle cx="20" cy="22.5" r="13" {...C40} />
          <path d="M20 22.5V9.5M20 22.5l11.26 6.5M20 22.5L8.74 29" {...C40} strokeWidth={1.7} />
          <path d="M16.6 3.2h6.8L20 8.6z" fill="currentColor" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" />
          <circle cx="20" cy="22.5" r="2.2" fill="currentColor" />
        </>
      );
    case 'kale':
      return (
        <>
          <path d="M5 31V10.5h30V31" {...C40} />
          <path d="M11 10.5V31M17 10.5V31M23 10.5V31M29 10.5V31M5 17.3h30M5 24.1h30" {...C40} strokeWidth={1} opacity={0.45} />
          <path d="M2.5 33.5h35" {...C40} />
          <circle cx="26.5" cy="27" r="5" fill="hsl(var(--card))" />
          <circle cx="26.5" cy="27" r="5" {...v} />
          <circle cx="26.5" cy="27" r="5" {...C40} />
          <path d="M26.5 24.6l2.2 1.6-.8 2.6h-2.8l-.8-2.6z" fill="currentColor" />
        </>
      );
    case 'seri':
      return (
        <>
          <path d="M7 6.5v26.5h27" {...C40} />
          <path d="M10.5 29l5.5-6.3 4.5 3 10.5-11.6" {...C40} strokeWidth={2.2} />
          <path d="M26.2 13.8h5.2V19" {...C40} strokeWidth={2.2} />
          <circle cx="15.2" cy="12" r="4.8" {...v} />
          <circle cx="15.2" cy="12" r="4.8" {...C40} strokeWidth={1.8} />
          <circle cx="15.2" cy="12" r="2.3" {...C40} strokeWidth={1.3} />
        </>
      );
    case 'iki-zar':
      return (
        <>
          <g transform="rotate(-10 13.5 21.5)">
            <rect x="5" y="13" width="17" height="17" rx="4" {...C40} />
            <circle cx="9.6" cy="17.6" r="1.6" fill="currentColor" />
            <circle cx="17.4" cy="25.4" r="1.6" fill="currentColor" />
          </g>
          <g transform="rotate(12 27 16)">
            <rect x="19" y="8" width="16" height="16" rx="4" fill="hsl(var(--card))" />
            <rect x="19" y="8" width="16" height="16" rx="4" {...v} />
            <rect x="19" y="8" width="16" height="16" rx="4" {...C40} />
            <circle cx="23.4" cy="12.4" r="1.5" fill="currentColor" />
            <circle cx="27" cy="16" r="1.5" fill="currentColor" />
            <circle cx="30.6" cy="19.6" r="1.5" fill="currentColor" />
          </g>
        </>
      );
    default:
      return null;
  }
}

/** Hazır soru kartının 40 px simgesi; `renk` verilmezse simgenin varsayılan vurgu rengi */
export function HazirSoruSimgesi({ ad, renk, className = 'h-10 w-10' }: { ad: HazirSimgeAdi; renk?: string; className?: string }) {
  const v = { fill: renk ?? HAZIR_SIMGE_RENKLERI[ad] ?? 'currentColor', fillOpacity: 0.22 };
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false" data-hazir-simge={ad}>
      {hazirCizim(ad, v)}
    </svg>
  );
}

/** Yöntem simgesi (Soru adımındaki kartlar, 28 px) */
export function YontemSimgesi({ yontem, className = 'h-7 w-7' }: { yontem: 'anket' | 'olcum' | 'deney'; className?: string }) {
  if (yontem === 'anket') return <AnketSimgesi className={className} />;
  if (yontem === 'olcum') return <OlcumSimgesi className={className} />;
  return <DeneySimgesi className={className} />;
}

/** Nesne simgesi (Plan adımındaki nesne kartları, 32 px) */
export function NesneSimgesi({ nesne, className = 'h-8 w-8' }: { nesne: 'para' | 'zar' | 'iki-zar' | 'cark' | 'torba'; className?: string }) {
  switch (nesne) {
    case 'para':
      return <ParaSimgesi className={className} />;
    case 'zar':
      return <ZarSimgesi className={className} />;
    case 'iki-zar':
      return <IkiZarSimgesi className={className} />;
    case 'cark':
      return <CarkSimgesi className={className} />;
    default:
      return <TorbaSimgesi className={className} />;
  }
}
