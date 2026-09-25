/**
 * Çetele (VT §6.5, §11.7): 5'li demetler (4 dik çizgi + çapraz), elle çizilmiş gibi hafif kararlı titreşimle.
 * 30'dan sonra ikinci satıra geçer; 60'tan sonra (iki satır dolunca) "60+" notu çıkar.
 * Doğal genişliğinde çizilir; dar kapta en boy oranını koruyarak küçülür (taşmaz).
 */
import React from 'react';

export interface CeteleProps {
  sayi: number;
  /** Çizgi rengi (kategori rengi); verilmezse currentColor */
  renk?: string;
  /** Bir satırın yüksekliği (px); varsayılan 22 */
  yukseklik?: number;
  /** En çok kaç satır (satır başına 30); varsayılan 2 → 60'tan sonra "60+" */
  enCokSatir?: 1 | 2;
  className?: string;
  /** Verilirse çetele role="img" ile bu adı taşır; verilmezse aria-hidden (sayı yanında yazılıdır) */
  etiket?: string;
}

export const CETELE_SATIR_KAPASITESI = 30;

/** Kararlı küçük titreşim (−1…1): aynı çizgi her çizimde aynı yerde durur */
function titresim(i: number, k: number): number {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export interface CeteleDuzeni {
  /** Çizilen işaret sayısı (sınıra kırpılmış) */
  cizilen: number;
  demet: number;
  tek: number;
  satir: number;
  /** "60+" notu (sınır aşıldıysa) */
  not: string | null;
}

/** Saf düzen hesabı (testlerde de kullanılır): 7 → 1 demet + 2 çizgi; 63 → 60 işaret + "60+" */
export function ceteleDuzeni(sayi: number, enCokSatir: 1 | 2 = 2): CeteleDuzeni {
  const n = Math.max(0, Math.floor(Number.isFinite(sayi) ? sayi : 0));
  const sinir = CETELE_SATIR_KAPASITESI * enCokSatir;
  const cizilen = Math.min(n, sinir);
  return {
    cizilen,
    demet: Math.floor(cizilen / 5),
    tek: cizilen % 5,
    satir: cizilen === 0 ? 0 : Math.ceil(cizilen / CETELE_SATIR_KAPASITESI),
    not: n > sinir ? `${sinir}+` : null,
  };
}

/** Çizim ölçüleri (yükseklikten türer; küçük boyda da çizgiler ayrışır) */
function ceteleOlculeri(h: number) {
  const s = Math.max(3.8, h * 0.19); // çizgi aralığı
  const kalinlik = Math.max(1.6, h * 0.095);
  const tasma = s * 0.5; // çaprazın demetten taşması
  return { s, kalinlik, tasma, demetG: 3 * s + 2 * tasma, bosluk: s * 1.15, satirBoslugu: Math.round(h * 0.2), pay: kalinlik };
}

/**
 * Çetelenin doğal genişliği (px). Genişlik yalnız kullanılan demetler kadardır (tek satırda küçük sayı dar
 * kalır; iki satırda tam satır). Sayaç, çeteleyi okunur boyda sığdıramıyorsa ince çubuğa geçer (CanliSayac).
 */
export function ceteleGenisligi(sayi: number, yukseklik = 22, enCokSatir: 1 | 2 = 2): number {
  const d = ceteleDuzeni(sayi, enCokSatir);
  if (d.cizilen === 0) return 0;
  const o = ceteleOlculeri(yukseklik);
  const satirSayisi = Math.max(1, d.satir);
  const demetSayisi = satirSayisi > 1 ? 6 : Math.max(1, Math.ceil(d.cizilen / 5));
  const sonDemetG = satirSayisi > 1 || d.cizilen % 5 === 0 ? o.demetG : (Math.max(1, d.cizilen % 5) - 1) * o.s + o.tasma;
  return Math.ceil(o.pay * 2 + (demetSayisi - 1) * (o.demetG + o.bosluk) + sonDemetG + o.tasma);
}

export function Cetele({ sayi, renk, yukseklik = 22, enCokSatir = 2, className = '', etiket }: CeteleProps) {
  const d = ceteleDuzeni(sayi, enCokSatir);
  const h = yukseklik;
  const { s, kalinlik, tasma, demetG, bosluk, satirBoslugu, pay } = ceteleOlculeri(h);
  const satirSayisi = Math.max(1, d.satir);
  const genislik = ceteleGenisligi(sayi, h, enCokSatir);
  const yukseklikToplam = Math.ceil(satirSayisi * h + (satirSayisi - 1) * satirBoslugu);
  const cizgiRengi = renk ?? 'currentColor';

  const ogeler: React.ReactNode[] = [];
  for (let satir = 0; satir < satirSayisi; satir++) {
    const bas = satir * CETELE_SATIR_KAPASITESI;
    const buSatir = Math.max(0, Math.min(CETELE_SATIR_KAPASITESI, d.cizilen - bas));
    const y0 = satir * (h + satirBoslugu);
    const demetler = Math.floor(buSatir / 5);
    const tekler = buSatir % 5;
    for (let b = 0; b <= demetler && b < 6; b++) {
      const adet = b < demetler ? 4 : tekler;
      if (adet === 0) continue;
      const x0 = pay + tasma + b * (demetG + bosluk);
      const cizgiler: React.ReactNode[] = [];
      for (let k = 0; k < adet; k++) {
        const no = bas + b * 5 + k;
        const x = x0 + k * s + titresim(no, 1) * 0.35;
        const ust = y0 + kalinlik / 2 + 0.6 + titresim(no, 2) * 0.7;
        const alt = y0 + h - kalinlik / 2 - 0.6 + titresim(no, 3) * 0.7;
        const egim = titresim(no, 4) * 0.45;
        cizgiler.push(
          <line
            key={k}
            x1={x + egim}
            y1={ust}
            x2={x - egim}
            y2={alt}
            data-tek={b < demetler ? undefined : ''}
          />,
        );
      }
      if (b < demetler) {
        const no = bas + b * 5 + 4;
        cizgiler.push(
          <line
            key="c"
            x1={x0 - tasma}
            y1={y0 + h * 0.8 + titresim(no, 5) * 0.6}
            x2={x0 + 3 * s + tasma}
            y2={y0 + h * 0.22 + titresim(no, 6) * 0.6}
            data-capraz=""
          />,
        );
        ogeler.push(
          <g key={`d${satir}-${b}`} data-demet="">
            {cizgiler}
          </g>,
        );
      } else {
        ogeler.push(<g key={`t${satir}`}>{cizgiler}</g>);
      }
    }
  }

  const erisim = etiket ? { role: 'img' as const, 'aria-label': etiket } : { 'aria-hidden': true as const };

  return (
    <span className={`inline-flex min-w-0 max-w-full items-end gap-1.5 ${className}`} data-cetele={Math.max(0, Math.floor(sayi || 0))} {...erisim}>
      {d.cizilen > 0 && (
        <svg
          width={genislik}
          height={yukseklikToplam}
          viewBox={`0 0 ${genislik} ${yukseklikToplam}`}
          className="block min-w-0 shrink"
          style={{ maxWidth: '100%', height: 'auto' }}
          focusable="false"
        >
          <g stroke={cizgiRengi} strokeWidth={kalinlik} strokeLinecap="round" fill="none">
            {ogeler}
          </g>
        </svg>
      )}
      {d.not && <span className="shrink-0 text-[12px] font-extrabold leading-4 tabular-nums text-muted-foreground">{d.not}</span>}
    </span>
  );
}
