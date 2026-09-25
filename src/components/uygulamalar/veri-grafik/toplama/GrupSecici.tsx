'use client';

/**
 * Gruplar (VT §6.4, §6.5, K16): anket ve ölçümde 6-A / 6-B gibi gruplar.
 * - GrupSecici (Topla): "CEVAP VEREN: [6-A] [6-B]" segmenti (h-11, radiogroup); dokunuşlar seçili gruba yazılır.
 * - GrupDuzenleyici (Plan): "Cevapları gruba ayır" onay kutusu, GRUP ADI alanı ve grup çipleri (2–6) + "+ Grup".
 */
import React from 'react';
import { ONAY_KUTUSU, radyoTusu } from '../ortak';
import { ArtiSimgesi, KapatSimgesi } from './simgeler';

export interface Grup {
  ad: string;
  secenekler: string[];
  etkin: number;
}

export const GRUP_EN_AZ = 2;
export const GRUP_EN_COK = 6;

export interface GrupSeciciProps {
  grup: Grup;
  onSec: (indeks: number) => void;
  /** Segmentin başlığı: "Cevap veren" (anket) · "Ölçülen" (ölçüm) */
  baslik?: string;
  /** Her grubun şimdiki sayısı (düğmede küçük rakam) */
  sayilar?: number[];
  className?: string;
}

export function GrupSecici({ grup, onSec, baslik = 'Cevap veren', sayilar, className = '' }: GrupSeciciProps) {
  const etkin = Math.min(Math.max(0, grup.etkin), grup.secenekler.length - 1);
  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`} data-grup-secici="">
      <span className="shrink-0 text-[12px] font-extrabold tracking-wide text-muted-foreground">{baslik.toLocaleUpperCase('tr')}:</span>
      <div
        role="radiogroup"
        aria-label={`${baslik}: ${grup.ad}`}
        className="flex min-w-0 flex-wrap gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-1"
      >
        {grup.secenekler.map((g, i) => {
          const secili = i === etkin;
          return (
            <button
              key={`${g}-${i}`}
              type="button"
              role="radio"
              aria-checked={secili}
              tabIndex={secili ? 0 : -1}
              data-grup={g}
              onClick={() => onSec(i)}
              onKeyDown={(e) => radyoTusu(e, i, grup.secenekler.length, onSec)}
              className={`inline-flex h-11 min-w-[52px] items-center justify-center gap-1.5 rounded-[calc(var(--radius)-8px)] px-3 text-[14px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                secili ? 'bg-primary text-primary-foreground shadow-[0_6px_14px_-8px_rgba(6,40,45,.6)]' : 'text-foreground hover:bg-accent'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              {g}
              {sayilar && sayilar[i] !== undefined && (
                <span className={`text-[12px] font-semibold tabular-nums ${secili ? 'opacity-85' : 'text-muted-foreground'}`}>{sayilar[i]}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface GrupDuzenleyiciProps {
  grup: Grup | null;
  onGrup: (grup: Grup | null) => void;
  /** Onay kutusu metni: "Cevapları gruba ayır (ör. 6-A / 6-B)" · "Ölçümleri gruba ayır" */
  onayMetni?: string;
  /** Açılınca kurulacak grup */
  varsayilan?: Grup;
  /** İçinde veri olan grup silinemez (i → gerekçe) */
  silinemez?: (indeks: number) => string | null;
  className?: string;
}

const VARSAYILAN_GRUP: Grup = { ad: 'Sınıf', secenekler: ['6-A', '6-B'], etkin: 0 };

const GIRDI =
  'h-11 min-w-0 rounded-[calc(var(--radius)-8px)] border border-border bg-background px-2 text-[14px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function GrupDuzenleyici({
  grup,
  onGrup,
  onayMetni = 'Cevapları gruba ayır (ör. 6-A / 6-B)',
  varsayilan = VARSAYILAN_GRUP,
  silinemez,
  className = '',
}: GrupDuzenleyiciProps) {
  const acik = grup !== null;
  const guncelle = (g: Partial<Grup>) => {
    if (grup) onGrup({ ...grup, ...g });
  };
  return (
    <div className={`flex flex-col gap-2 ${className}`} data-grup-duzenleyici="">
      <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold">
        <input type="checkbox" className={ONAY_KUTUSU} checked={acik} onChange={(e) => onGrup(e.target.checked ? { ...varsayilan } : null)} />
        {onayMetni}
      </label>
      {grup && (
        <div className="flex flex-col gap-2 border-l-2 border-border pl-3">
          <label className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2">
            <span className="text-[12px] font-extrabold tracking-wide text-muted-foreground">GRUP ADI</span>
            <input className={GIRDI} value={grup.ad} maxLength={24} placeholder="Ör. Sınıf" onChange={(e) => guncelle({ ad: e.target.value })} />
          </label>
          <div className="flex flex-wrap gap-2">
            {grup.secenekler.map((g, i) => {
              const gerekce = silinemez?.(i) ?? null;
              const silinebilir = grup.secenekler.length > GRUP_EN_AZ && !gerekce;
              return (
                <span key={i} className="inline-flex items-stretch rounded-[calc(var(--radius)-8px)] border border-border bg-background">
                  <input
                    className="h-11 w-[76px] min-w-0 rounded-l-[calc(var(--radius)-8px)] bg-transparent px-2 text-[14px] font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    value={g}
                    maxLength={24}
                    aria-label={`${i + 1}. grup`}
                    onChange={(e) => {
                      const s = [...grup.secenekler];
                      s[i] = e.target.value;
                      guncelle({ secenekler: s });
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`${g || `${i + 1}. grup`} grubunu kaldır`}
                    title={gerekce ?? (grup.secenekler.length <= GRUP_EN_AZ ? 'En az iki grup gerekir.' : undefined)}
                    disabled={!silinebilir}
                    onClick={() => {
                      const s = grup.secenekler.filter((_, j) => j !== i);
                      guncelle({ secenekler: s, etkin: Math.min(grup.etkin, s.length - 1) });
                    }}
                    className="grid h-11 w-11 place-items-center rounded-r-[calc(var(--radius)-8px)] border-l border-border text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-40"
                  >
                    <KapatSimgesi className="h-4 w-4" />
                  </button>
                </span>
              );
            })}
            {grup.secenekler.length < GRUP_EN_COK && (
              <button
                type="button"
                onClick={() => guncelle({ secenekler: [...grup.secenekler, yeniGrupAdi(grup.secenekler)] })}
                className="inline-flex h-11 items-center gap-1.5 rounded-[calc(var(--radius)-8px)] border border-dashed border-border px-3 text-[13px] font-bold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArtiSimgesi className="h-4 w-4" />
                Grup
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** "6-A, 6-B" → "6-C"; kalıp yoksa "3. grup" */
export function yeniGrupAdi(mevcut: string[]): string {
  const son = mevcut[mevcut.length - 1] ?? '';
  const m = /^(.*?)([A-ZÇĞİÖŞÜ])$/u.exec(son.trim());
  const harfler = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
  if (m) {
    const i = harfler.indexOf(m[2]);
    if (i >= 0 && i < harfler.length - 1) {
      const aday = `${m[1]}${harfler[i + 1]}`;
      if (!mevcut.includes(aday)) return aday;
    }
  }
  return `${mevcut.length + 1}. grup`;
}
