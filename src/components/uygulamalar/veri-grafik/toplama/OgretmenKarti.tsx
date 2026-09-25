'use client';

/**
 * Öğretmen kartı — Topla başlığındaki [i] ile açılan açılır kart (§0 madde 3). Varsayılan kapalıdır; öğrenciye dönük
 * iş yüzeyini kalabalıklaştıran her şey buradadır:
 * - Etkinlik: "bu etkinlik ne öğretir" notu, kazanım rozetleri (MAT… kodları; deneyde "MAT.7.7.1 · 8.7.1"), "Önce tahmin
 *   edin" ve öğretmen notu;
 * - Düzenle: sıklık tablosu, seçenek dışı yazımları birleştirme, sıralı değerler / açıklık / ötekilerden çok uzak
 *   değerler, deney seçici ve Deney özeti;
 * - Yorumla: gerekçeli grafik önerileri, "Tartışalım", kapalı başlayan "Cümleleri göster", "Sonucumuz".
 * Altta "Planı değiştir" ve "Yeni araştırma". Opak `bg-popover`, en çok panel genişliği, kendi içinde kayar.
 */
import React, { useEffect, useId, useRef } from 'react';
import { METIN_SINIRI, type Arastirma } from '../arastirma';
import type { Sekme } from '../durum';
import { DUGME, radyoTusu } from '../ortak';
import type { VeriTablosu } from '../veri';
import { DuzenleAdimi } from './DuzenleAdimi';
import { YorumAdimi } from './YorumAdimi';
import { etkinlikNotu, kazanimSatirlari, ogretmenNotu, tahminAlani } from './panelYardimcilari';
import { BilgiSimgesi, KalemSimgesi, KapatSimgesi, TahminSimgesi, VeriToplaSimgesi } from './simgeler';

export type OgretmenBolumu = 'etkinlik' | 'duzenle' | 'yorum';

export const OGRETMEN_BOLUMLERI: readonly { id: OgretmenBolumu; ad: string }[] = [
  { id: 'etkinlik', ad: 'Etkinlik' },
  { id: 'duzenle', ad: 'Düzenle' },
  { id: 'yorum', ad: 'Yorumla' },
];

export interface OgretmenKartiProps {
  arastirma: Arastirma;
  tablo: VeriTablosu;
  sekme?: Sekme | null;
  bolum: OgretmenBolumu;
  onBolum: (b: OgretmenBolumu) => void;
  onKapat: () => void;
  onArastirma: (a: Arastirma) => void;
  onTabloIslemi: (yeni: VeriTablosu, tost: string, arastirma?: Arastirma) => void;
  onSatirGoster: (satir: number) => void;
  onSekme: (s: Sekme) => void;
  onOzeteGec: () => void;
  onPlaniDegistir: () => void;
  onYeniArastirma: () => void;
  /** Kartın kimliği ([i] düğmesinin aria-controls'u) */
  kimlik?: string;
  className?: string;
}

const BASLIK = 'text-[12px] font-extrabold tracking-[0.05em] text-muted-foreground';

function Tahmin({ a, onArastirma }: { a: Arastirma; onArastirma: (a: Arastirma) => void }) {
  const alan = tahminAlani(a);
  const girdiId = useId();
  if (alan.tur === 'secenek') {
    return (
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tahminimiz">
        {alan.secenekler.map((s) => {
          const secili = a.tahmin.trim() === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={secili}
              onClick={() => onArastirma({ ...a, tahmin: secili ? '' : s })}
              className={`inline-flex h-11 items-center rounded-full border px-3.5 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                secili ? 'border-primary bg-primary text-primary-foreground dark:bg-[hsl(175_58%_30%)] dark:text-white' : 'border-border bg-card hover:bg-accent'
              }`}
              data-tahmin={s}
            >
              {s}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <label className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold" htmlFor={girdiId}>
      <span>{alan.on}</span>
      <input
        id={girdiId}
        inputMode="decimal"
        value={a.tahmin}
        maxLength={METIN_SINIRI.tahmin}
        placeholder={alan.yerTutucu}
        onChange={(e) => onArastirma({ ...a, tahmin: e.target.value })}
        className="h-11 w-20 rounded-[calc(var(--radius)-8px)] border border-border bg-card px-2 text-center text-[15px] font-extrabold tabular-nums text-foreground placeholder:font-semibold placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-tahmin=""
      />
      {alan.son && <span>{alan.son}</span>}
    </label>
  );
}

function Etkinlik({ a, onArastirma }: { a: Arastirma; onArastirma: (a: Arastirma) => void }) {
  return (
    <div className="flex flex-col gap-3.5" data-ogretmen-bolumu="etkinlik">
      <section className="flex flex-col gap-1.5">
        <span className={BASLIK}>BU ETKİNLİKTE</span>
        <p className="text-[13.5px] leading-[19px]">{etkinlikNotu(a)}</p>
      </section>
      <section className="flex flex-col gap-1.5" aria-label="Kazanımlar">
        <span className={BASLIK}>KAZANIMLAR</span>
        <ul className="flex flex-col gap-1.5">
          {kazanimSatirlari(a).map((k) => (
            <li key={k.rozet} className="flex items-start gap-2.5 rounded-[calc(var(--radius)-6px)] border border-border bg-card px-2.5 py-2">
              <span
                className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full bg-primary px-2 text-[12px] font-bold leading-none text-primary-foreground dark:bg-[hsl(175_58%_30%)] dark:text-white"
                title={k.konu || undefined}
                data-kazanim={k.rozet}
              >
                {k.rozet}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold leading-[18px]">{k.konu || 'Kazanım'}</span>
                <span className="text-[12px] leading-4 text-muted-foreground">{k.yer}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-1.5" aria-label="Önce tahmin edin">
        <span className={`${BASLIK} flex items-center gap-1.5`}>
          <TahminSimgesi className="h-4 w-4" />
          ÖNCE TAHMİN EDİN
        </span>
        <Tahmin a={a} onArastirma={onArastirma} />
        <p className="text-[12px] leading-4 text-muted-foreground">Tahmin, Yorumla bölümündeki cümlelerde veriyle karşılaştırılır.</p>
      </section>
      <section className="flex flex-col gap-1.5">
        <span className={BASLIK}>ÖĞRETMEN NOTU</span>
        <p className="text-[13px] leading-[18px] text-muted-foreground">{ogretmenNotu(a)}</p>
      </section>
    </div>
  );
}

export function OgretmenKarti({
  arastirma: a,
  tablo,
  sekme = null,
  bolum,
  onBolum,
  onKapat,
  onArastirma,
  onTabloIslemi,
  onSatirGoster,
  onSekme,
  onOzeteGec,
  onPlaniDegistir,
  onYeniArastirma,
  kimlik,
  className = '',
}: OgretmenKartiProps) {
  const temel = useId();
  const kartId = kimlik ?? `${temel}-kart`;
  const govdeRef = useRef<HTMLDivElement>(null);
  const kartRef = useRef<HTMLDivElement>(null);
  // Açılınca odak seçili bölüm sekmesine geçer (klavye ve ekran okuyucu kartın içinden başlar)
  useEffect(() => {
    kartRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true });
  }, []);
  const bolumSec = (b: OgretmenBolumu) => {
    onBolum(b);
    if (govdeRef.current) govdeRef.current.scrollTop = 0;
  };
  return (
    <div
      ref={kartRef}
      id={kartId}
      role="dialog"
      aria-label="Öğretmen kartı"
      className={`flex min-h-0 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-popover text-popover-foreground shadow-[0_24px_60px_-24px_rgba(6,40,45,.6)] ${className}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onKapat();
        }
      }}
      data-ogretmen-karti=""
    >
      <header className="flex min-h-[48px] shrink-0 items-center gap-2 pl-3 pr-1">
        <BilgiSimgesi className="h-5 w-5 shrink-0 text-primary" />
        <h3 className="min-w-0 flex-1 truncate text-[15px] font-extrabold">Öğretmen kartı</h3>
        <button
          type="button"
          onClick={onKapat}
          aria-label="Öğretmen kartını kapat"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[calc(var(--radius)-6px)] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <KapatSimgesi className="h-5 w-5" />
        </button>
      </header>
      <div role="tablist" aria-label="Öğretmen kartı bölümleri" className="mx-3 grid shrink-0 grid-cols-3 gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-1">
        {OGRETMEN_BOLUMLERI.map((b, i) => {
          const secili = b.id === bolum;
          return (
            <button
              key={b.id}
              type="button"
              role="tab"
              id={`${kartId}-${b.id}`}
              aria-selected={secili}
              aria-controls={`${kartId}-govde`}
              tabIndex={secili ? 0 : -1}
              onClick={() => bolumSec(b.id)}
              onKeyDown={(e) => radyoTusu(e, i, OGRETMEN_BOLUMLERI.length, (j) => bolumSec(OGRETMEN_BOLUMLERI[j].id))}
              className={`h-11 rounded-[calc(var(--radius)-8px)] text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                secili ? 'bg-card text-foreground shadow-[0_2px_8px_-3px_rgba(6,40,45,.35)]' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              data-ogretmen-sekmesi={b.id}
            >
              {b.ad}
            </button>
          );
        })}
      </div>
      <div
        ref={govdeRef}
        id={`${kartId}-govde`}
        role="tabpanel"
        aria-labelledby={`${kartId}-${bolum}`}
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3"
      >
        {bolum === 'etkinlik' && <Etkinlik a={a} onArastirma={onArastirma} />}
        {bolum === 'duzenle' && (
          <DuzenleAdimi arastirma={a} tablo={tablo} onArastirma={onArastirma} onTabloIslemi={onTabloIslemi} onSatirGoster={onSatirGoster} onOzeteGec={onOzeteGec} />
        )}
        {bolum === 'yorum' && <YorumAdimi arastirma={a} tablo={tablo} sekme={sekme} onSekme={onSekme} onOzeteGec={onOzeteGec} onArastirma={onArastirma} />}
      </div>
      <footer className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2">
        <button type="button" className={DUGME} onClick={onPlaniDegistir} data-plani-degistir="">
          <KalemSimgesi className="h-4 w-4" />
          Planı değiştir
        </button>
        <button type="button" className={`${DUGME} ml-auto`} onClick={onYeniArastirma} data-yeni-arastirma="">
          <VeriToplaSimgesi className="h-4 w-4" />
          Yeni araştırma
        </button>
      </footer>
    </div>
  );
}
