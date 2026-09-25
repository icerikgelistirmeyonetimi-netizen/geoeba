/**
 * Hazır soru kartı (VT §6.3, §12.5): sıkı tek satır — solda 40 px simge (kategori renginde yumuşak zeminli kutucukta),
 * sağında kart adı (en çok 2 satır) ve altında sınıf ("5. sınıf"). Kartlar sıkı olduğu için "Ne araştıralım?" listesinde
 * üç grubun çoğu kaydırmadan görünür. Sorunun kendisi title'dadır ve ekran okuyucuya söylenir; karta dokununca plan
 * varsayılanlarla uygulanır (üst bileşen) ve soru Topla görünümünün görev metni olur. Kazanım kodları (MAT…) kartta
 * yazmaz — §0: kazanım rozeti yalnız [i] öğretmen kartında —; rozetin tamamı title'dadır. "Simülasyon" ve
 * "Zenginleştirme" etiketleri rozetten ayrılıp küçük bir işaret olarak gösterilir. `son`: veri toplanmadan kapatılan son
 * araştırma bu karttı ("Son" işareti; ayrı bir "Son araştırma" kartı yinelenmez).
 */
import React, { useId } from 'react';
import { HAZIR_SIMGE_RENKLERI, HazirSoruSimgesi, type HazirSimgeAdi } from './simgeler';
import { saydam } from './bicim';

export interface HazirSoruKartiProps {
  id: string;
  ad: string;
  soru: string;
  /** "5. sınıf · MAT.5.5.1" · "8. sınıf · MAT.8.6.1 · Simülasyon" */
  rozet: string;
  simge: HazirSimgeAdi;
  /** Simge vurgu rengi; verilmezse simgenin varsayılanı */
  renk?: string;
  onSec: (id: string) => void;
  /** Bu kartın araştırması şu an açık */
  secili?: boolean;
  /** Son araştırma bu kartın planıyla yapıldı (veri toplanmadan kapatıldı) */
  son?: boolean;
  /** Dar sütun (kart ≈ 150 px): simge 32 px */
  dar?: boolean;
  className?: string;
}

const ISARETLER = ['Simülasyon', 'Zenginleştirme'];

/** Rozeti ana metin ve işaretlere ayırır: "8. sınıf · MAT.8.6.1 · Simülasyon" → ["8. sınıf · MAT.8.6.1", ["Simülasyon"]] */
export function rozetParcalari(rozet: string): { ana: string; isaretler: string[] } {
  const parcalar = rozet
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean);
  const isaretler = parcalar.filter((p) => ISARETLER.includes(p));
  const ana = parcalar.filter((p) => !ISARETLER.includes(p)).join(' · ');
  return { ana, isaretler };
}

export function HazirSoruKarti({ id, ad, soru, rozet, simge, renk, onSec, secili = false, son = false, dar = false, className = '' }: HazirSoruKartiProps) {
  const vurgu = renk ?? HAZIR_SIMGE_RENKLERI[simge];
  const { ana, isaretler } = rozetParcalari(rozet);
  const sinif = ana
    .split('·')
    .map((p) => p.trim())
    .find((p) => /sınıf/.test(p));
  const aciklamaId = `${useId()}-soru`;
  return (
    <button
      type="button"
      data-hazir-soru={id}
      data-son={son ? '' : undefined}
      aria-pressed={secili || undefined}
      aria-describedby={aciklamaId}
      title={`${soru} · ${rozet}`}
      onClick={() => onSec(id)}
      className={`group flex min-h-[60px] w-full min-w-0 items-center gap-2.5 rounded-[calc(var(--radius)-4px)] border bg-card py-2 pl-2 pr-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
        secili || son ? 'border-primary shadow-[inset_0_0_0_1px_hsl(var(--primary))]' : 'border-border hover:border-primary/60 hover:bg-accent'
      } ${className}`}
      style={{ touchAction: 'manipulation' }}
    >
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-[calc(var(--radius)-6px)] text-foreground ${dar ? 'h-9 w-9' : 'h-11 w-11'}`}
        style={{ background: saydam(vurgu, 0.13) }}
      >
        <HazirSoruSimgesi ad={simge} renk={vurgu} className={dar ? 'h-7 w-7' : 'h-9 w-9'} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 text-[13.5px] font-bold leading-[17px] text-foreground">{ad}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {sinif && <span className="whitespace-nowrap text-[12px] font-semibold leading-4 text-primary">{sinif}</span>}
          {isaretler.map((i) => (
            <span key={i} className="whitespace-nowrap rounded-[6px] bg-muted px-1.5 text-[12px] font-semibold leading-[18px] text-muted-foreground">
              {i}
            </span>
          ))}
          {son && (
            <span className="whitespace-nowrap rounded-[6px] bg-primary px-1.5 text-[12px] font-bold leading-[18px] text-primary-foreground dark:bg-[hsl(175_58%_30%)] dark:text-white">
              Son
            </span>
          )}
        </span>
      </span>
      <span id={aciklamaId} className="sr-only">
        {soru}
      </span>
    </button>
  );
}
