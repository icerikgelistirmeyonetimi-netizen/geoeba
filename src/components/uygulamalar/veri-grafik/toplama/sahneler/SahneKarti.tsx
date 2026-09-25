'use client';

/**
 * Sahne kartı (VT §11.2, §6.5): nesne + "Son atış (12.)" yuvası + canlı sayaç.
 * - Yatay düzen: nesne solda (kare), sağ sütunda sabit yükseklikli (44 px) son atış yuvası, isteğe bağlı üst
 *   yuva (torbanın Çıkanlar tepsisi) ve sayaç. Dikey düzen: nesne üstte ortalı, sayaç altta tam genişlikte.
 * - Nesne boyu = min(alan yüksekliği, 300, genişliğin payı); ölçüm yalnız useBoyut (offsetWidth / offsetHeight).
 * - Bütün kart değil, yalnız nesne bir düğmedir (odak halkası, aria-label: "Parayı bir kez at").
 */
import React, { useRef } from 'react';
import { useBoyut } from '../../ortak';

export interface SonAtisYuvasi {
  /** "Son atış (12.)" · "Son çevirme (12.)" · "Son çekiş (12.)" */
  baslik: string;
  /** Sonuç metni ("Tura", "7", "Kırmızı"); null → henüz atış yok */
  sonuc: string | null;
  /** Sonucun kategori rengi (metin rengi) */
  renk?: string;
}

export interface SahneKartiProps {
  /** data-sahne değeri: para · zar · iki-zar · cark · torba */
  sahne: string;
  yon?: 'yatay' | 'dikey';
  /** Nesne çizimi; boyut (px) ölçülen alana göre verilir */
  nesne: (boyut: number) => React.ReactNode;
  /** Nesne düğmesinin adı: "Parayı bir kez at" */
  nesneEtiketi: string;
  onNesne?: () => void;
  nesnePasif?: boolean;
  yuva: SonAtisYuvasi;
  sayac?: React.ReactNode;
  /** Yatayda sayaç sütununun üstü (Çıkanlar tepsisi) */
  ust?: React.ReactNode;
  /** Alt satır (12 px): "2. deney · 27 / 50" · "İlk 10 atış görünür, kalanı hızlı" */
  durum?: string | null;
  enBuyukNesne?: number;
  /** Nesne en az bu boyda (px) */
  enKucukNesne?: number;
  className?: string;
}

/** Yatay düzende nesnenin alabileceği boy: alan yüksekliği, genişliğin %46'sı ve üst sınır */
export function nesneBoyu(alanG: number, alanY: number, yon: 'yatay' | 'dikey', enBuyuk = 300, enKucuk = 72): number {
  const aday = yon === 'yatay' ? Math.min(alanY, alanG * 0.46) : Math.min(alanY, alanG);
  return Math.round(Math.max(enKucuk, Math.min(enBuyuk, aday)));
}

export function SahneKarti({
  sahne,
  yon = 'yatay',
  nesne,
  nesneEtiketi,
  onNesne,
  nesnePasif = false,
  yuva,
  sayac,
  ust,
  durum,
  enBuyukNesne = 300,
  enKucukNesne = 72,
  className = '',
}: SahneKartiProps) {
  const alanRef = useRef<HTMLDivElement>(null);
  const alan = useBoyut(alanRef, { genislik: 360, yukseklik: 176 });
  const boyut = nesneBoyu(alan.genislik, alan.yukseklik, yon, enBuyukNesne, enKucukNesne);

  const nesneDugmesi = (
    <button
      type="button"
      aria-label={nesneEtiketi}
      disabled={nesnePasif}
      onClick={onNesne}
      data-sahne={sahne}
      className="relative grid shrink-0 place-items-center rounded-[calc(var(--radius)-6px)] transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:hover:bg-transparent"
      style={{ width: boyut, height: boyut, touchAction: 'manipulation' }}
    >
      {nesne(boyut)}
    </button>
  );

  const yuvaOgesi = (
    <div className="h-11 min-w-0 shrink-0" data-son-atis="">
      <div className="truncate text-[12.5px] font-semibold leading-4 text-muted-foreground">{yuva.baslik}</div>
      <div
        className="truncate text-[20px] font-extrabold leading-7"
        style={{ color: yuva.sonuc !== null ? yuva.renk : undefined }}
        data-son-sonuc={yuva.sonuc ?? ''}
      >
        {yuva.sonuc ?? <span className="text-muted-foreground/70">—</span>}
      </div>
    </div>
  );

  // Durum satırı sayaç sütununda durur (nesnenin boyunu kısaltmaz)
  const durumOgesi = durum ? (
    <p className="shrink-0 truncate text-[12px] font-semibold leading-4 text-muted-foreground" data-sahne-durumu="" title={durum}>
      {durum}
    </p>
  ) : null;

  return (
    <div
      className={`flex min-h-0 min-w-0 flex-col rounded-[var(--radius)] border border-border bg-card p-2 ${className}`}
      data-sahne-karti={yon}
    >
      {yon === 'yatay' ? (
        <div ref={alanRef} className="flex min-h-0 flex-1 gap-3">
          <div className="flex min-h-0 shrink-0 items-center justify-center" style={{ width: boyut }}>
            {nesneDugmesi}
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 py-0.5">
            {yuvaOgesi}
            {ust}
            <div className="min-h-0 flex-1 overflow-hidden pt-0.5">{sayac}</div>
            {durumOgesi}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col items-center gap-2">
            <div className="self-stretch">{yuvaOgesi}</div>
            <div ref={alanRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
              {nesneDugmesi}
            </div>
            {ust && <div className="self-stretch">{ust}</div>}
          </div>
          {sayac && <div className="shrink-0">{sayac}</div>}
          {durumOgesi}
        </div>
      )}
    </div>
  );
}
