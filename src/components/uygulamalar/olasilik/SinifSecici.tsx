'use client';

/**
 * Olasılık Laboratuvarı — sınıf seçimi (TEGM Ortaokul Komisyonu, 20.10.2026: "sınıf şartı olmalıdır").
 *
 * Laboratuvar ortaokul ve lisede sınıf seçilmeden açılmaz: her sınıf kartı programdaki olasılık yaklaşımını ve öğrenme
 * çıktısı kodlarını gösterir (sinifAyarlari.ts). Seçilen sınıf oturum kaydında saklanır; araç çubuğunun başındaki
 * `SinifRozeti` («‹ 6. sınıf») bu ekrana döner.
 */
import React from 'react';
import { SINIF_AYARLARI, type OlasilikSinifi } from './sinifAyarlari';

/** Sınıf kartlarının yaklaşım rengi (ada paleti): öznel altın, deneysel deniz, teorik turkuaz, üç yaklaşım lavanta */
export const SINIF_RENKLERI: Record<OlasilikSinifi, string> = {
  5: '#b9884a',
  6: '#216a78',
  7: '#2a9d94',
  8: '#7f88c4',
  9: '#d9805f',
  10: '#3f9a6a',
};

const KADEME_ADLARI = { ortaokul: 'Ortaokul', lise: 'Lise' } as const;

export interface SinifSeciciProps {
  siniflar: readonly OlasilikSinifi[];
  onSec: (sinif: OlasilikSinifi) => void;
}

export function SinifSecici({ siniflar, onSec }: SinifSeciciProps) {
  const kademeler = (['ortaokul', 'lise'] as const).filter((k) => siniflar.some((s) => SINIF_AYARLARI[s].kademe === k));
  const basliklar = kademeler.length > 1;
  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-background text-foreground" data-uygulama="olasilik" data-olasilik-kip="sinif-secimi">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-4 py-6">
        <header>
          <h2 className="text-xl font-bold text-foreground">Sınıfını seç</h2>
          <p className="mt-1 text-sm text-muted-foreground">Laboratuvar, seçtiğin sınıfın öğretim programındaki olasılık yaklaşımıyla açılır.</p>
        </header>
        {kademeler.map((k) => (
          <section key={k} aria-label={`${KADEME_ADLARI[k]} sınıfları`} className="flex flex-col gap-2">
            {basliklar && <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">{KADEME_ADLARI[k]}</h3>}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
              {siniflar
                .filter((s) => SINIF_AYARLARI[s].kademe === k)
                .map((s) => {
                  const a = SINIF_AYARLARI[s];
                  const renk = SINIF_RENKLERI[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSec(s)}
                      className="flex min-h-[148px] flex-col items-start gap-2 rounded-[var(--radius)] border border-border bg-card p-4 text-left shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)] transition-colors hover:border-primary hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      style={{ borderTop: `4px solid ${renk}` }}
                      data-sinif-secenek={s}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-lg font-extrabold tabular-nums text-foreground"
                          style={{ borderColor: renk, background: `${renk}24` }}
                          aria-hidden="true"
                        >
                          {s}
                        </span>
                        <span className="flex flex-col">
                          <span className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">{s}. sınıf</span>
                          <span className="text-base font-bold leading-snug text-foreground">{a.baslik}</span>
                        </span>
                      </span>
                      <span className="text-sm leading-snug text-muted-foreground">{a.aciklama}</span>
                      <span className="mt-auto text-[12px] font-semibold tabular-nums text-muted-foreground">{a.kazanim.join(' · ')}</span>
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Araç çubuğunun başındaki sınıf düğmesi: «‹ 6. sınıf»; dokununca sınıf seçimine döner */
export function SinifRozeti({ sinif, onDegistir, disabled }: { sinif: OlasilikSinifi; onDegistir: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onDegistir}
      disabled={disabled}
      aria-label={`Sınıfı değiştir (şimdi ${sinif}. sınıf)`}
      title="Sınıfı değiştir"
      className="inline-flex min-h-[44px] basik:min-h-[36px] shrink-0 items-center gap-1.5 rounded-[calc(var(--radius)-4px)] border border-border bg-card pl-2 pr-3 text-sm font-bold text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      data-sinif-rozeti={sinif}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: SINIF_RENKLERI[sinif] }} aria-hidden="true" />
      {sinif}. sınıf
    </button>
  );
}
