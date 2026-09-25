'use client';

/**
 * İpucu kartı (kullanıcı kararı 2026-09-24): ipuçları üst barı büyütmez, kod panelinin üstüne de gelmez;
 * yalnız tuvalin üzerinde açılır. Kart, tuvalin altındaki ileti şeridinin yerini alır: kamera o bandı
 * zaten iletiye ayırdığı için robotu ve bahçeyi örtmez (sol üstte robotun başladığı köşeyi örtüyordu).
 * Tek ipucu görünür (en son açılan); öncekilere oklarla dönülür. "Bir ipucu daha" sıradakini açar,
 * × kartı kapatır; Çalıştır'a basınca kart kendiliğinden kapanır ve ileti şeridi geri gelir.
 */
import React, { useEffect, useState } from 'react';
import { SIMGE } from './simgeler';

export function IpucuKarti({ ipuclari, acilan, onDaha, onKapat }: { ipuclari: readonly string[]; acilan: number; onDaha?: () => void; onKapat: () => void }) {
  const [sira, setSira] = useState(Math.max(0, acilan - 1));
  useEffect(() => setSira(Math.max(0, acilan - 1)), [acilan]);
  if (acilan <= 0 || !ipuclari.length) return null;
  const toplam = ipuclari.length;
  const ok = 'flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div className="flex max-w-[720px] flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[16px] bg-card/95 py-2 pl-3.5 pr-2 shadow-sm ring-1 ring-ada-fener/50 backdrop-blur" role="note" aria-label={`İpucu ${sira + 1}/${toplam}`} data-ipucu-karti>
      <p className="flex min-w-[220px] flex-1 items-start gap-2 text-[16px] font-bold leading-snug text-foreground" data-ipucu-metni>
        <SIMGE.ipucu className="mt-0.5 h-5 w-5 shrink-0 text-ada-fener" />
        <span>{ipuclari[sira]}</span>
      </p>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {acilan > 1 ? (
          <span className="flex items-center">
            <button type="button" onClick={() => setSira((s) => Math.max(0, s - 1))} disabled={sira === 0} className={ok} aria-label="Önceki ipucu">
              <SIMGE.ok className="h-3.5 w-3.5 rotate-180" />
            </button>
            <span className="min-w-[30px] text-center text-[12px] font-extrabold tabular-nums text-muted-foreground">
              {sira + 1}/{toplam}
            </span>
            <button type="button" onClick={() => setSira((s) => Math.min(acilan - 1, s + 1))} disabled={sira >= acilan - 1} className={ok} aria-label="Sonraki ipucu">
              <SIMGE.ok className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          toplam > 1 && <span className="px-1 text-[12px] font-extrabold tabular-nums text-muted-foreground">1/{toplam}</span>
        )}
        {onDaha && acilan < toplam && (
          <button type="button" onClick={onDaha} className="inline-flex min-h-[34px] items-center rounded-full bg-ada-fener/15 px-3 text-[13px] font-bold text-foreground hover:bg-ada-fener/25" data-ipucu-daha>
            Bir ipucu daha
          </button>
        )}
        <button type="button" onClick={onKapat} className={ok} aria-label="İpucunu kapat" data-ipucu-kapat>
          <SIMGE.kapat className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
