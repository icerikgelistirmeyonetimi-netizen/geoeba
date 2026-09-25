'use client';

/**
 * "Ne araştıralım?" — panelin başlangıç görünümü (§0; VT §6.3, §12.4–12.5).
 * - Başlık satırı: simge + "Ne araştıralım?" + [×] (paneli kapatır).
 * - Bağlı bir araştırma varsa en üstte "Şu anki araştırmamız" kartı ve [Toplamaya dön]; bağsız eski araştırma varsa
 *   "Son araştırma" kartı ve [Bu planla yeniden başla]. Son araştırma değiştirilmemiş bir hazır soruysa ayrı kart
 *   yinelenmez: o hazır kart "Son" işaretini taşır.
 * - 18 hazır soru, yönteme göre üç küçük grup başlığıyla (Anket · Ölçüm · Deney). Kartlar sıkıdır (simge + ad + sınıf;
 *   soru title'da) ve 300 px'ten geniş panelde iki sütundadır: 1366'da üç grubun çoğu kaydırmadan görünür. Grup
 *   başlıkları kayarken yapışkandır (hangi grupta olunduğu hep görünür); listenin altı daha kart varken hafifçe gölgelenir.
 *   Karta dokunmak planı varsayılanlarla uygular ve doğrudan Topla görünümüne geçer (3 dokunuş kuralı).
 * - En altta yapışkan tek satır: "Kendi sorunu yaz" (soru + yöntem + plan tek formda).
 * Yalnız kart listesi kayar; başlık ve alt satır hep görünür.
 */
import React from 'react';
import { HAZIR_SORULAR, TOPLAMA_YONTEMLERI, YONTEM_BILGISI, type Arastirma } from '../arastirma';
import { DUGME_BIRINCIL } from '../ortak';
import { HazirSoruKarti } from './HazirSoruKarti';
import { KalemSimgesi, KapatSimgesi, SagOkSimgesi, VeriToplaSimgesi, YontemSimgesi } from './simgeler';
import { gorevMetni, hazirPlaniDegismedi } from './panelYardimcilari';

export interface SoruAdimiProps {
  arastirma: Arastirma | null;
  bagli: boolean;
  /** Bağlı araştırmada toplanan veri: "24 cevap" */
  toplananMetni: string | null;
  onHazirSoru: (id: string) => void;
  /** Bağlı araştırmaya dön (Topla) */
  onDevam: () => void;
  /** Bağsız son araştırmayı aynı planla yeniden başlat */
  onYenidenBaslat: () => void;
  onKendiSorun: () => void;
  onKapat: () => void;
  genislik: number;
  className?: string;
}

export function SoruAdimi({
  arastirma,
  bagli,
  toplananMetni,
  onHazirSoru,
  onDevam,
  onYenidenBaslat,
  onKendiSorun,
  onKapat,
  genislik,
  className = '',
}: SoruAdimiProps) {
  const tekSutun = genislik > 0 && genislik < 300;
  const dar = genislik > 0 && genislik < 380;
  // Bağsız son araştırma değiştirilmemiş bir hazır soruysa: ayrı kart yok, hazır kart "Son" işaretli
  const sonHazir = !bagli && arastirma !== null && arastirma.sutunlar !== null && hazirPlaniDegismedi(arastirma) ? arastirma.hazirId : null;
  const oncekiVar = arastirma !== null && arastirma.yontem !== null && (bagli || arastirma.sutunlar !== null) && sonHazir === null;
  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`} data-adim="soru">
      <header className="flex min-h-[52px] shrink-0 items-center gap-2 border-b border-border bg-card pl-3 pr-1">
        <VeriToplaSimgesi className="h-5 w-5 shrink-0 text-primary" />
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-extrabold">Ne araştıralım?</h2>
        <button
          type="button"
          onClick={onKapat}
          aria-label="Veri toplama panelini kapat"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[calc(var(--radius)-6px)] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <KapatSimgesi className="h-5 w-5" />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3" data-hazir-sorular="">
        {oncekiVar && arastirma && (
          <section
            className="mt-3 flex flex-col gap-2 rounded-[var(--radius)] border border-primary/30 bg-accent px-3 py-2.5 text-accent-foreground"
            data-son-arastirma={bagli ? 'bagli' : 'bagsiz'}
          >
            <span className="flex items-center gap-2">
              {arastirma.yontem && <YontemSimgesi yontem={arastirma.yontem} className="h-5 w-5 shrink-0 text-primary" />}
              <span className="text-[12px] font-extrabold tracking-[0.05em] text-muted-foreground">{bagli ? 'ŞU ANKİ ARAŞTIRMAMIZ' : 'SON ARAŞTIRMA'}</span>
              {bagli && toplananMetni && <span className="ml-auto text-[12px] font-bold tabular-nums text-muted-foreground">{toplananMetni}</span>}
            </span>
            <p className="line-clamp-2 text-[14px] font-bold leading-[19px] text-foreground">{gorevMetni(arastirma)}</p>
            <button
              type="button"
              onClick={bagli ? onDevam : onYenidenBaslat}
              className={`${DUGME_BIRINCIL} self-start px-4 text-[13.5px] font-bold`}
              data-devam={bagli ? '' : undefined}
            >
              {bagli ? 'Toplamaya dön' : 'Bu planla yeniden başla'}
              <SagOkSimgesi className="h-4 w-4" />
            </button>
          </section>
        )}
        {TOPLAMA_YONTEMLERI.map((y) => (
          <section key={y} className="flex flex-col gap-1.5" aria-label={`${YONTEM_BILGISI[y].ad} soruları`} data-hazir-grubu={y}>
            {/* Yapışkan grup başlığı: kayarken hangi grupta olunduğu görünür (opak zemin) */}
            <h3 className="sticky top-0 z-[1] -mx-3 flex h-9 items-center gap-2 bg-background px-3 pt-1">
              <YontemSimgesi yontem={y} className="h-5 w-5 shrink-0 text-foreground/75" />
              <span className="text-[13.5px] font-extrabold">{YONTEM_BILGISI[y].ad}</span>
              <span className="text-[12.5px] font-semibold text-muted-foreground">{YONTEM_BILGISI[y].altSatir}</span>
              <span className="ml-auto text-[12px] font-semibold tabular-nums text-muted-foreground">{HAZIR_SORULAR.filter((h) => h.yontem === y).length} soru</span>
            </h3>
            <div className={`grid gap-1.5 ${tekSutun ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {HAZIR_SORULAR.filter((h) => h.yontem === y).map((h) => (
                <HazirSoruKarti
                  key={h.id}
                  id={h.id}
                  ad={h.ad}
                  soru={h.soru}
                  rozet={h.rozet}
                  simge={h.simge}
                  secili={bagli && arastirma?.hazirId === h.id}
                  son={sonHazir === h.id}
                  dar={dar}
                  onSec={onHazirSoru}
                />
              ))}
            </div>
          </section>
        ))}
        {/* Altta daha kart varken yumuşak solma (yapışkan; listenin sonunda kendi boşluğunda kalır, kartı örtmez) */}
        <div
          aria-hidden="true"
          className="pointer-events-none sticky bottom-0 -mx-3 -mt-1 h-6 shrink-0"
          style={{ background: 'linear-gradient(hsl(var(--background) / 0), hsl(var(--background)))' }}
        />
      </div>
      <footer className="flex min-h-[64px] shrink-0 items-center border-t border-border bg-card px-3 py-1.5">
        <button
          type="button"
          onClick={onKendiSorun}
          className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[calc(var(--radius)-6px)] border-2 border-dashed border-primary/45 bg-background text-[14px] font-extrabold text-foreground transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-kendi-sorun=""
        >
          <KalemSimgesi className="h-5 w-5 text-primary" />
          Kendi sorunu yaz
        </button>
      </footer>
    </div>
  );
}
