'use client';

/**
 * Yorumla (öğretmen kartının "Yorumla" bölümü; §0, VT §6.7, §12.9).
 * - "HANGİ GRAFİK BU VERİYİ EN İYİ ANLATIR?": uygun grafikler gerekçesiyle (dokununca ana grafik sekmesi değişir;
 *   Deney özeti önerisi özeti Çizgi grafiğinde gösterir), uygun olmayanlar soluk ve nedenleriyle.
 * - "TARTIŞALIM": yönteme göre 3 soru.
 * - "VERİLER NE SÖYLÜYOR?": kalıp cümleler kapalı başlar; [Cümleleri göster]e basılmadan DOM'da yoktur. Açık / kapalı
 *   durumu kalıcı değildir.
 * - "SONUCUMUZ": 3 satırlık yazı alanı (en çok 400 karakter; `arastirma.sonuc`).
 */
import React, { useId, useState } from 'react';
import { METIN_SINIRI, adimNotu, grafikOnerileri, tartismaSorulari, yorumCumleleri, type Arastirma } from '../arastirma';
import type { Sekme } from '../durum';
import { ozetTablosu } from '../deney';
import { DUGME } from '../ortak';
import type { VeriTablosu } from '../veri';
import { OnaySimgesi } from './simgeler';

export interface YorumAdimiProps {
  arastirma: Arastirma;
  tablo: VeriTablosu;
  /** Ana grafiğin şimdiki sekmesi (önerilerde etkin olan vurgulanır) */
  sekme?: Sekme | null;
  onSekme: (s: Sekme) => void;
  onOzeteGec: () => void;
  onArastirma: (a: Arastirma) => void;
}

const BASLIK = 'text-[12px] font-extrabold tracking-[0.05em] text-muted-foreground';

export const GRAFIK_ADLARI: Record<Sekme, string> = {
  nokta: 'Nokta grafiği',
  sutun: 'Sütun grafiği',
  cizgi: 'Çizgi grafiği',
  daire: 'Daire grafiği',
  sacilim: 'Saçılım grafiği',
  istatistik: 'İstatistik',
};

export function YorumAdimi({ arastirma: a, tablo, sekme = null, onSekme, onOzeteGec, onArastirma }: YorumAdimiProps) {
  const [cumlelerAcik, setCumlelerAcik] = useState(false);
  const sonucId = useId();
  const ozetSatiri = a.yontem === 'deney' ? ozetTablosu(tablo, a).satirlar.length : 0;
  const oneriler = grafikOnerileri(a, { ozetSatiri });
  const not = adimNotu(a, 'yorum');
  const cumleler = cumlelerAcik ? yorumCumleleri(tablo, a) : [];
  return (
    <div className="flex flex-col gap-3" data-ogretmen-bolumu="yorum">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[13px] leading-[18px] text-muted-foreground">{not.metin}</p>
        <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-card px-2 text-[12px] font-semibold leading-none" data-kazanim={not.rozet}>
          {not.rozet}
        </span>
      </div>
      <section className="flex flex-col gap-1.5" aria-label="Hangi grafik bu veriyi en iyi anlatır?">
        <span className={BASLIK}>HANGİ GRAFİK BU VERİYİ EN İYİ ANLATIR?</span>
        {oneriler.map((o) => {
          const etkin = !o.ozet && o.uygun && sekme === o.sekme;
          const ad = o.ozet ? `${GRAFIK_ADLARI[o.sekme]} · Deney özeti` : GRAFIK_ADLARI[o.sekme];
          if (!o.uygun) {
            return (
              <div
                key={`${o.sekme}-soluk`}
                className="flex min-h-[44px] items-center gap-3 rounded-[calc(var(--radius)-6px)] border border-dashed border-border px-3 py-1.5 text-muted-foreground"
                data-grafik-onerisi={o.sekme}
                data-uygun="false"
              >
                <span className="w-[104px] shrink-0 text-[13px] font-extrabold opacity-80">{ad}</span>
                <span className="text-[12.5px] leading-4">{o.gerekce}</span>
              </div>
            );
          }
          return (
            <button
              key={`${o.sekme}-${o.ozet ? 'ozet' : 'uygun'}`}
              type="button"
              aria-pressed={etkin}
              onClick={() => (o.ozet ? onOzeteGec() : onSekme(o.sekme))}
              className={`flex min-h-[48px] items-center gap-3 rounded-[calc(var(--radius)-6px)] border px-3 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                etkin ? 'border-primary bg-accent shadow-[inset_0_0_0_1px_hsl(var(--primary))]' : 'border-border bg-card hover:bg-accent'
              }`}
              data-grafik-onerisi={o.sekme}
              data-uygun="true"
            >
              <span className="w-[104px] shrink-0 text-[13px] font-extrabold">{ad}</span>
              <span className="min-w-0 flex-1 text-[12.5px] leading-4 text-muted-foreground">{o.gerekce}</span>
              {etkin && <OnaySimgesi className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </section>
      <section className="flex flex-col gap-1.5" aria-label="Tartışalım">
        <span className={BASLIK}>TARTIŞALIM</span>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[13.5px] leading-[19px]">
          {tartismaSorulari(a, tablo).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-1.5" aria-label="Veriler ne söylüyor?">
        <div className="flex items-center gap-2">
          <span className={BASLIK}>VERİLER NE SÖYLÜYOR?</span>
          <button type="button" className={`${DUGME} ml-auto`} aria-expanded={cumlelerAcik} onClick={() => setCumlelerAcik((x) => !x)} data-cumleleri-goster="">
            {cumlelerAcik ? 'Cümleleri gizle' : 'Cümleleri göster'}
          </button>
        </div>
        {!cumlelerAcik && <p className="text-[12px] leading-4 text-muted-foreground">Önce sınıfça tartışın, sonra karşılaştırın.</p>}
        {cumlelerAcik && (
          <ul className="flex flex-col gap-1.5 rounded-[calc(var(--radius)-6px)] bg-muted px-3 py-2 text-[13.5px] leading-[19px]" data-yorum-cumleleri="">
            {cumleler.length === 0 ? (
              <li className="text-muted-foreground">Cümleler için önce veri toplayın.</li>
            ) : (
              cumleler.map((c) => (
                <li key={c} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{c}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </section>
      <label className="flex flex-col gap-1" htmlFor={sonucId}>
        <span className={BASLIK}>SONUCUMUZ</span>
        <textarea
          id={sonucId}
          rows={3}
          value={a.sonuc}
          maxLength={METIN_SINIRI.sonuc}
          placeholder="Sorumuzun cevabı: …"
          onChange={(e) => onArastirma({ ...a, sonuc: e.target.value })}
          className="w-full resize-none rounded-[calc(var(--radius)-6px)] border border-border bg-card px-3 py-2 text-[14px] leading-5 text-foreground placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
    </div>
  );
}
