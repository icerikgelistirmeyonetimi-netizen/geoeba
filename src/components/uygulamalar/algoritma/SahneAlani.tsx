'use client';

/**
 * Sera sahnesinin React kabuğu: SeraSahnesi'ni kurar (tema değişince yeniden), dünyayı yükler,
 * dıştan ref ile oynat / goster / kes çağrılır. WebGL yoksa aynı durum düz şemayla çizilir.
 * Üstte dünya adı ve "Üstten bak", altta adım anlatımı ve göstergeler (çocuklar için büyük yazı).
 */
import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { SeraSahnesi, webglVar, type Donanim } from './seraSahnesi';
import { izgara, type DunyaDurumu, type DunyaTanimi, type Hata } from './dunya';
import type { Adim } from './yorumlayici';
import { DunyaSemasi, YapiGorunumleri } from './DunyaSemasi';
import { SIMGE } from './simgeler';

export interface SahneTutamaci {
  goster: (d: DunyaDurumu, hata?: Hata | null) => void;
  oynat: (a: Adim, onceki: DunyaDurumu, hiz: number) => Promise<void>;
  kes: () => void;
  vurgula: (bitkiler: number[] | null) => void;
  mutlu: () => void;
}

export interface SahneAlaniProps {
  dunya: DunyaTanimi;
  donanim: Donanim;
  koyu: boolean;
  azHareket: boolean;
  gizli: boolean;
  /** WebGL yoksa şemada gösterilecek durum */
  durum: DunyaDurumu | null;
  ustBilgi?: React.ReactNode;
  /** Açıkken tuvalin altındaki ileti şeridinin yerini alan ipucu kartı */
  ipucu?: React.ReactNode;
  altBilgi?: React.ReactNode;
  gostergeler?: React.ReactNode;
}

export const SahneAlani = forwardRef<SahneTutamaci, SahneAlaniProps>(function SahneAlani({ dunya, donanim, koyu, azHareket, gizli, durum, ustBilgi, ipucu, altBilgi, gostergeler }, ref) {
  const kapRef = useRef<HTMLDivElement>(null);
  const sahneRef = useRef<SeraSahnesi | null>(null);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [ustten, setUstten] = useState(false);
  const sonDurum = useRef<{ d: DunyaDurumu; hata: Hata | null } | null>(null);
  const dunyaRef = useRef(dunya);
  dunyaRef.current = dunya;
  const donanimRef = useRef(donanim);
  donanimRef.current = donanim;
  const usttenRef = useRef(ustten);
  usttenRef.current = ustten;

  useLayoutEffect(() => setWebgl(webglVar()), []);

  // Sahne: WebGL varsa; tema / hareket tercihi değişince yeniden kurulur
  useEffect(() => {
    const kap = kapRef.current;
    if (!webgl || !kap) return;
    let s: SeraSahnesi;
    try {
      s = new SeraSahnesi(kap, { koyu, azHareket });
    } catch {
      setWebgl(false);
      return;
    }
    sahneRef.current = s;
    s.kur(dunyaRef.current, donanimRef.current);
    s.usttenBak(usttenRef.current);
    if (sonDurum.current) {
      s.goster(sonDurum.current.d);
      if (sonDurum.current.hata) s.hataGoster(sonDurum.current.hata);
    }
    return () => {
      s.dispose();
      sahneRef.current = null;
    };
  }, [webgl, koyu, azHareket]);

  // Dünya / donanım değişti: sıra yeniden kurulur
  const dunyaAnahtari = `${dunya.id}|${dunya.bitkiler.length}|${donanim.tank}|${donanim.sepet}|${donanim.gubre}`;
  useEffect(() => {
    const s = sahneRef.current;
    if (!s) return;
    s.kur(dunya, donanim);
    sonDurum.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dunyaAnahtari]);

  useEffect(() => sahneRef.current?.usttenBak(ustten), [ustten]);
  useEffect(() => sahneRef.current?.gorunur(!gizli), [gizli]);

  useImperativeHandle(
    ref,
    () => ({
      goster: (d, hata = null) => {
        sonDurum.current = { d, hata };
        const s = sahneRef.current;
        if (!s) return;
        s.goster(d);
        if (hata) s.hataGoster(hata);
      },
      oynat: async (a, onceki, hiz) => {
        sonDurum.current = { d: a.durum, hata: a.hata ?? null };
        const s = sahneRef.current;
        if (!s) {
          // Şema modunda kısa bir bekleme: adım adım okunabilsin
          await new Promise((r) => setTimeout(r, azHareket ? 0 : 420 / Math.max(0.25, hiz)));
          return;
        }
        await s.oynat(a, onceki, hiz);
      },
      kes: () => sahneRef.current?.kes(),
      vurgula: (b) => sahneRef.current?.vurgula(b),
      mutlu: () => sahneRef.current?.ifadeAyarla('mutlu'),
    }),
    [azHareket]
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[calc(var(--radius)-2px)] bg-[#e4efe9] dark:bg-[#17323a]" data-sahne>
      {webgl === false ? (
        <div className="flex h-full w-full items-center justify-center overflow-auto p-4 text-foreground">
          <DunyaSemasi dunya={dunya} durum={durum} hucre={44} />
        </div>
      ) : (
        <div ref={kapRef} className="absolute inset-0" aria-hidden="true" />
      )}
      {/* Üst şerit: dünya bilgisi + görünüm düğmesi */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
        <div className="pointer-events-auto">{ustBilgi}</div>
        {webgl !== false && (
          <div className="pointer-events-auto flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => setUstten((u) => !u)}
            aria-pressed={ustten}
            className="pointer-events-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-card/95 px-3 text-[13px] font-bold text-foreground shadow-sm ring-1 ring-border backdrop-blur hover:bg-card focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-ustten
          >
            {ustten ? <SIMGE.yandan className="h-[18px] w-[18px]" /> : <SIMGE.ustten className="h-[18px] w-[18px]" />}
            {ustten ? 'Yandan bak' : 'Üstten bak'}
          </button>
          {izgara(dunya).tur === 'insaat' && dunya.hedefGizli && <YapiGorunumleri dunya={dunya} />}
          </div>
        )}
      </div>
      {/* Alt şerit: anlatım + göstergeler */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-2.5">
        <div className="pointer-events-auto min-w-0 max-w-full flex-1">{ipucu ?? altBilgi}</div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">{gostergeler}</div>
      </div>
    </div>
  );
});
