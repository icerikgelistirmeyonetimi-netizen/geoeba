/**
 * Veri topla — küçük nesne çizimleri (VT §11.4, §11.7): zar yüzü, mini para, renk topu ve çark dilimi.
 * Elle kaydet kutucukları, canlı sayaç ve sahneler aynı çizimi kullanır; böylece para rengi,
 * zar benekleri ve top renkleri her yerde birebir aynıdır.
 */
import React from 'react';
import { ac, koyulastir } from './bicim';

/** Benek konumları (100 birimlik yüzde): standart 3 × 3 düzen (%26 / %50 / %74) */
export const BENEK_KONUMLARI = {
  solUst: [26, 26],
  sagUst: [74, 26],
  solOrta: [26, 50],
  orta: [50, 50],
  sagOrta: [74, 50],
  solAlt: [26, 74],
  sagAlt: [74, 74],
} as const;

export type BenekAdi = keyof typeof BENEK_KONUMLARI;

export const BENEK_ADLARI: BenekAdi[] = ['solUst', 'sagUst', 'solOrta', 'orta', 'sagOrta', 'solAlt', 'sagAlt'];

/** Yüz değeri → görünen benekler */
export const ZAR_BENEKLERI: Record<number, BenekAdi[]> = {
  1: ['orta'],
  2: ['sagUst', 'solAlt'],
  3: ['sagUst', 'orta', 'solAlt'],
  4: ['solUst', 'sagUst', 'solAlt', 'sagAlt'],
  5: ['solUst', 'sagUst', 'orta', 'solAlt', 'sagAlt'],
  6: ['solUst', 'sagUst', 'solOrta', 'sagOrta', 'solAlt', 'sagAlt'],
};

export function benekGorunur(deger: number, benek: BenekAdi): boolean {
  return (ZAR_BENEKLERI[deger] ?? []).includes(benek);
}

/** Tek renkli zar yüzü (kart zemini + mürekkep benek; "renk = kategori" kuralı bozulmaz) */
export function ZarYuzu({ deger, boyut = 28, className = '' }: { deger: number; boyut?: number; className?: string }) {
  const benekler = ZAR_BENEKLERI[deger] ?? [];
  // Küçük yüzde çerçeve ve benek görece kalın (16 px'te de okunur)
  const kalin = boyut <= 20 ? 9 : boyut <= 32 ? 7.5 : 6;
  const r = boyut <= 20 ? 11 : 9.5;
  return (
    <svg viewBox="0 0 100 100" width={boyut} height={boyut} className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <rect x={kalin / 2 + 1} y={kalin / 2 + 1} width={98 - kalin} height={98 - kalin} rx="20" fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth={kalin} />
      {benekler.map((b) => {
        const [x, y] = BENEK_KONUMLARI[b];
        return <circle key={b} cx={x} cy={y} r={r} fill="hsl(var(--foreground))" />;
      })}
    </svg>
  );
}

/** Mini para (Elle kaydet kutucuğu, 40 px): kategori renginde, yazısız (adı kutucukta yazar) */
export function MiniPara({ renk, boyut = 40, className = '' }: { renk: string; boyut?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={boyut} height={boyut} className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <circle cx="20" cy="21.6" r="16.6" fill={koyulastir(renk, 0.34)} />
      <circle cx="20" cy="19.4" r="16.6" fill={renk} stroke="rgba(21,48,45,0.35)" strokeWidth="1.2" />
      <circle cx="20" cy="19.4" r="15" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1" />
      <circle cx="20" cy="19.4" r="12.2" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.1" strokeDasharray="2.2 1.8" />
      <ellipse cx="14" cy="12.4" rx="7" ry="3.6" transform="rotate(-32 14 12.4)" fill="#ffffff" fillOpacity="0.2" />
    </svg>
  );
}

/**
 * Renk topu (torba kutucukları, sayaç lejantı). Kenar kalınlığı ekranda ≈ 1,4–2,5 px kalır (büyük kutucukta kalın
 * halka olmaz); büyük topta alt sağda hafif gölge hilali derinlik verir.
 */
export function RenkTopu({ renk, boyut = 20, className = '' }: { renk: string; boyut?: number; className?: string }) {
  const kenar = boyut <= 28 ? 1.4 : Math.round(Math.max(0.36, (2.5 * 20) / boyut) * 1000) / 1000;
  return (
    <svg viewBox="0 0 20 20" width={boyut} height={boyut} className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="8.6" fill={renk} stroke={koyulastir(renk, 0.45)} strokeWidth={kenar} />
      {boyut > 28 && <path d="M 17.2 7.4 A 8 8 0 0 1 6.6 17.4 A 9.4 9.4 0 0 0 17.2 7.4 Z" fill={koyulastir(renk, 0.35)} fillOpacity="0.35" />}
      <ellipse cx="7.4" cy="6.8" rx="3" ry="1.9" transform="rotate(-30 7.4 6.8)" fill={ac(renk, 0.55)} fillOpacity="0.55" />
    </svg>
  );
}

/**
 * Çark dilimi (Elle kaydet · çark kutucuğu): soluk çark diski üstünde dilimin payı kadar renkli dilim (tepeden saat
 * yönünde). Dilim ne kadar büyükse o sonuç o kadar olası: kutucuk teorik olasılığı görsel olarak da söyler.
 */
export function DilimResmi({ renk, oran, boyut = 40, className = '' }: { renk: string; oran: number; boyut?: number; className?: string }) {
  const r = 17.2;
  const o = Math.max(0, Math.min(1, Number.isFinite(oran) ? oran : 0));
  const aci = o * 2 * Math.PI;
  const x = 20 + r * Math.sin(aci);
  const y = 20 - r * Math.cos(aci);
  const kenar = boyut <= 40 ? 1.2 : Math.round(Math.max(0.4, (2 * 40) / boyut) * 1000) / 1000;
  return (
    <svg viewBox="0 0 40 40" width={boyut} height={boyut} className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r={r} fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeOpacity="0.55" strokeWidth={kenar} />
      {o >= 0.999 ? (
        <circle cx="20" cy="20" r={r} fill={renk} />
      ) : (
        o > 0.001 && <path d={`M 20 20 L 20 ${(20 - r).toFixed(1)} A ${r} ${r} 0 ${o > 0.5 ? 1 : 0} 1 ${x.toFixed(3)} ${y.toFixed(3)} Z`} fill={renk} stroke="hsl(var(--card))" strokeWidth={kenar} strokeLinejoin="round" />
      )}
      <circle cx="20" cy="20" r={r} fill="none" stroke="hsl(var(--foreground))" strokeOpacity="0.55" strokeWidth={kenar} />
      <circle cx="20" cy="20" r="2" fill="hsl(var(--foreground))" />
    </svg>
  );
}

/** Kategori noktası (sayaç satırı, tablo lejantı): 10 px */
export function RenkNoktasiKucuk({ renk, boyut = 10 }: { renk: string; boyut?: number }) {
  return (
    <svg viewBox="0 0 10 10" width={boyut} height={boyut} className="shrink-0" aria-hidden="true" focusable="false">
      <circle cx="5" cy="5" r="4.6" fill={renk} />
    </svg>
  );
}
