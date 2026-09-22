'use client';

/**
 * Tuvalin üstünde/altında beliren yüzen çubukların (seçim, araç yönergesi, çokgen, yansıtma, ipucu)
 * ortak, sade görünümü: opak kart zemini, ince kenarlık, solda küçük simge rozeti, kısa başlık +
 * soluk açıklama, düz (gölgesiz, içi boş) düğmeler. Emoji ya da yanıp sönen nokta yok.
 */
import React from 'react';

type Konum = 'alt' | 'alt-yuksek' | 'ust';

const KONUM_SINIFI: Record<Konum, string> = {
  // Araç yönergesi ve çokgen: alt kenarın biraz üstü
  alt: 'bottom-16 animate-in fade-in slide-in-from-bottom-2',
  // Seçim çubuğu: alttaki komut çekmecesinin (~100 px) üstünde kalır
  'alt-yuksek': 'bottom-[8.5rem] animate-in fade-in slide-in-from-bottom-2',
  // Yansıtma ekseni ve ipucu: üst araç satırının altı
  ust: 'top-16 animate-in fade-in slide-in-from-top-2',
};

export function KayanCubuk({
  konum = 'alt',
  children,
  className = '',
  etkilesimsiz = false,
  ...rest
}: {
  konum?: Konum;
  children: React.ReactNode;
  className?: string;
  /** İpucu gibi yalnız bilgi veren çubuklar tıklamaları tuvale geçirir */
  etkilesimsiz?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>) {
  return (
    <div
      {...rest}
      className={`absolute left-1/2 -translate-x-1/2 z-30 w-max max-w-[calc(100%-2rem)] flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg select-none duration-200 ${
        etkilesimsiz ? 'pointer-events-none' : ''
      } ${KONUM_SINIFI[konum]} ${className}`}
    >
      {children}
    </div>
  );
}

/** Solda simge rozeti + başlık + (isteğe bağlı) soluk açıklama */
export function CubukMetni({
  simge,
  baslik,
  aciklama,
  vurgu = 'deniz',
}: {
  simge: React.ReactNode;
  baslik: React.ReactNode;
  aciklama?: React.ReactNode;
  /** Rozet rengi: deniz (varsayılan), altın (ipucu), lavanta (yansıtma) */
  vurgu?: 'deniz' | 'altin' | 'lavanta';
}) {
  const rozet =
    vurgu === 'altin'
      ? 'bg-ada-altin/15 text-ada-altin'
      : vurgu === 'lavanta'
      ? 'bg-ada-lavanta/15 text-ada-lavanta'
      : 'bg-primary/10 text-primary';
  return (
    <div className="flex min-w-0 items-center gap-2.5 py-1 pl-1.5 pr-2">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${rozet}`} aria-hidden="true">
        {simge}
      </span>
      <p className="min-w-0 text-[13px] leading-snug max-w-[34rem]">
        <span className="font-bold text-foreground">{baslik}</span>
        {aciklama && <span className="text-muted-foreground"> · {aciklama}</span>}
      </p>
    </div>
  );
}

/** Metin ile düğmeleri ayıran ince dikey çizgi */
export function CubukAyirici() {
  return <span className="mx-0.5 h-7 w-px shrink-0 bg-border" aria-hidden="true" />;
}

/** Düz çubuk düğmesi (≥ 44 px dokunmatik hedef). `tur`: normal · birincil (dolu) · tehlike (kırmızı yazı) */
export function CubukDugmesi({
  simge,
  children,
  tur = 'normal',
  className = '',
  ...rest
}: {
  simge?: React.ReactNode;
  children: React.ReactNode;
  tur?: 'normal' | 'birincil' | 'tehlike';
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>) {
  const renk =
    tur === 'birincil'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : tur === 'tehlike'
      ? 'text-destructive hover:bg-destructive/10'
      : 'text-foreground hover:bg-muted';
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${renk} ${className}`}
    >
      {simge && (
        <span className="grid h-4 w-4 place-items-center" aria-hidden="true">
          {simge}
        </span>
      )}
      <span>{children}</span>
    </button>
  );
}
