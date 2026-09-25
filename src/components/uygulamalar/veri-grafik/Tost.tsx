'use client';

/**
 * Veri ve Grafik — kısa bildirim (tost): tablo alanının altında (tablonun alt şeridinin üstünde) ortalanmış bir hap;
 * Veri topla paneli açıkken grafiğin altındaki tablo bandında (kapalı bantta özet satırının üstünde, "Tabloyu göster"
 * düğmesinin solunda). Grafiğin eksen yazılarını ve seçenek şeridini örtmez.
 * Eylemli tost (ör. [Geri al]) 8 sn, eylemsiz tost 3 sn görünür; üstüne gelinince ya da içindeki düğme
 * odaklanınca süre durur, ayrılınca kalan süre işler. Kap `role="status"` canlı bölgedir ve tıklamaları
 * geçirir (`pointer-events-none`); yalnız hapın kendisi tıklanır. Her yeni tost (aynı metin olsa da) süreyi baştan başlatır.
 */
import React, { useEffect, useRef, useState } from 'react';

export interface TostEylemi {
  ad: string;
  calistir: () => void;
}

export interface TostVerisi {
  /** her tostta farklı (yeni tost süreyi baştan başlatır) */
  kimlik: number;
  metin: string;
  eylem?: TostEylemi;
  /** ms; verilmezse eylemli 8000, eylemsiz 3000 */
  sure?: number;
}

export const TOST_SURESI = { eylemli: 8000, eylemsiz: 3000 } as const;

/** Tostun görünme süresi (ms) */
export function tostSuresi(t: Pick<TostVerisi, 'eylem' | 'sure'>): number {
  return t.sure ?? (t.eylem ? TOST_SURESI.eylemli : TOST_SURESI.eylemsiz);
}

export interface TostProps {
  tost: TostVerisi | null;
  /** süre dolunca ya da eylem çalışınca; kimlik, o arada gelen yeni tostun yanlışlıkla kapanmasını önler */
  onKapat: (kimlik: number) => void;
  /**
   * Kabın alt kenarından uzaklık (px). Verilmezse 12 px (`bottom-3`). Tablo alanında tablonun alt şeridinin
   * (+ Sütun, Temizle) yüksekliği kadar yukarıda durur: düğmeleri örtmez.
   */
  alt?: number;
  /**
   * Kabın sağ kenarından uzaklık (px; verilmezse 0). Kapalı tablo bandında hap, bandın sağındaki "Tabloyu göster"
   * düğmesinin hemen solunda durur (sağa yaslı): soldaki "Tablo · 24 satır · son: Elma" özetini örtmez.
   */
  sag?: number;
}

/** Konumlu (position: relative) bir kabın içine konur; alt kenarın üstünde ortalanır */
export function Tost({ tost, onKapat, alt, sag }: TostProps) {
  const konum: React.CSSProperties = {};
  if (alt !== undefined) konum.bottom = alt;
  if (sag) konum.right = sag;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute inset-x-0 z-20 flex ${sag ? 'justify-end pl-3' : 'justify-center px-3'}${alt === undefined ? ' bottom-3' : ''}`}
      style={alt === undefined && !sag ? undefined : konum}
      data-tost-alani
    >
      {tost && <TostHapi key={tost.kimlik} tost={tost} onKapat={onKapat} />}
    </div>
  );
}

function TostHapi({ tost, onKapat }: { tost: TostVerisi; onKapat: (kimlik: number) => void }) {
  const [ustunde, setUstunde] = useState(false);
  const [odakta, setOdakta] = useState(false);
  const kalan = useRef(tostSuresi(tost));
  const bekle = ustunde || odakta;
  const { kimlik } = tost;

  useEffect(() => {
    if (bekle) return;
    const basla = Date.now();
    const t = window.setTimeout(() => onKapat(kimlik), kalan.current);
    return () => {
      window.clearTimeout(t);
      // Durunca kalan süre saklanır; yeniden başlayınca en az 1 sn görünür kalır
      kalan.current = Math.max(1000, kalan.current - (Date.now() - basla));
    };
  }, [bekle, kimlik, onKapat]);

  const { eylem } = tost;
  return (
    <div
      // Metin kendi genişliğinde (esas boyut auto: kısa metinde düğmeler aynı satırda kalır; 11rem esas boyutu Chrome'un
      // çok satırlı esnek kutu ölçüsünde × düğmesini alt satıra itiyordu); dar kapta sığmazsa düğmeler alt satıra, sağa geçer
      className={`pointer-events-auto flex max-w-[min(600px,100%)] flex-wrap items-center gap-x-2 rounded-[22px] bg-foreground text-[13px] font-semibold leading-5 text-background shadow-[0_14px_32px_-14px_rgba(6,40,45,.7)] ${
        eylem ? 'py-1 pl-4 pr-1' : 'px-4 py-2.5'
      }`}
      data-tost
      onMouseEnter={() => setUstunde(true)}
      onMouseLeave={() => setUstunde(false)}
      onFocus={() => setOdakta(true)}
      onBlur={() => setOdakta(false)}
    >
      <span className={eylem ? 'min-w-0 flex-[1_1_auto] py-1' : 'min-w-0'}>{tost.metin}</span>
      {/* Eylem ve kapat düğmesi birlikte kalır: sığmazsa ikisi birden alt satıra, sağa geçer (× tek başına kopmaz) */}
      {eylem && (
        <span className="ml-auto flex shrink-0 items-center" data-tost-dugmeleri="">
        <button
          type="button"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-background/15 px-3.5 font-bold text-background hover:bg-background/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
          onClick={() => {
            eylem.calistir();
            onKapat(kimlik);
          }}
          data-tost-eylemi
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path d="M5.5 4.5 2.5 7.5l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 7.5h6.5a3.5 3.5 0 0 1 0 7H7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {eylem.ad}
        </button>
        {/* Eylemli tost 8 sn durur ve tablonun son satırlarını örter: beklemeden kapatılabilir */}
        <button
          type="button"
          aria-label="Bildirimi kapat"
          title="Bildirimi kapat"
          className="ml-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-background/80 hover:bg-background/15 hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
          onClick={() => onKapat(kimlik)}
          data-tost-kapat
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        </span>
      )}
    </div>
  );
}
