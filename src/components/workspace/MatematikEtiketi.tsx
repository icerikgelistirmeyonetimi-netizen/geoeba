import React from 'react';
import { type Dugum, duzMetin, yazimImzasi } from '@/math/matematikYazimi';
import { kutuOlcusu, susYolu, type Cubuk, type KutuOlcusu } from '@/math/yazimDuzeni';

/**
 * Tuval ölçü etiketi (SVG). Dışa aktarım güvenli: yalnızca <rect>, <text>, <path>; foreignObject,
 * sınıfa bağlı yerleşim ve CSS geçişi YOK. Renkler ya açık değer (fill/stroke özniteliği) ya da tema sınıfıdır
 * (hesaplanan değer dışa aktarımda satır içi stile kopyalanır: exportCanvas.ts). Geometri tamamen öznitelik.
 *
 * Yerleşim: bütün çocuklar kutunun MERKEZİNE (0, 0) göre çizilir, etiket tek bir transform ile taşınır;
 * kaydırma ya da sürükleme etiket başına tek öznitelik yazar, düzen yeniden hesaplanmaz.
 *
 * Erişilebilirlik: <g role="img"> yalnızca aria-label ile okunur; fare ipucu kutu <rect>'inin içindeki
 * <title>'dır (role="img" altındaki sunumsal bir düğüm olduğu için ekran okuyucuya iki kez okunmaz).
 *
 * Sürükleme/tıklama sarmalayıcısı (olcumEtiketi) DIŞARIDA kalır:
 *   <g {...olcumEtiketi(seg.id, 'length')}><MatematikEtiketi … /></g>
 *
 * Tam / kısa yazım kararını ÇAĞIRAN verir (sigarMi, aciRozetiYerlesimi); bileşen yalnızca çizer.
 */

/** Tema sınıfları LİTERAL yazılır (Tailwind yalnızca kaynakta gördüğü sınıfları üretir). */
export const ETIKET_RENGI = {
  on: { yazi: 'fill-foreground', cizgi: 'stroke-foreground' },
  soluk: { yazi: 'fill-muted-foreground', cizgi: 'stroke-muted-foreground' },
  alan: { yazi: 'fill-ada-deniz-koyu dark:fill-ada-vurgu', cizgi: 'stroke-ada-deniz-koyu dark:stroke-ada-vurgu' },
  cevre: { yazi: 'fill-ada-murekkep-2 dark:fill-ada-kum', cizgi: 'stroke-ada-murekkep-2 dark:stroke-ada-kum' },
  cember: { yazi: 'fill-ada-deniz dark:fill-ada-lavanta', cizgi: 'stroke-ada-deniz dark:stroke-ada-lavanta' },
  yay: { yazi: 'fill-lime-700 dark:fill-lime-300', cizgi: 'stroke-lime-700 dark:stroke-lime-300' },
  uyari: { yazi: 'fill-red-600 dark:fill-red-400', cizgi: 'stroke-red-600 dark:stroke-red-400' },
} as const;
export type EtiketRengi = keyof typeof ETIKET_RENGI | { hex: string };

export interface KutuStili {
  /** Tema sınıfı (ör. 'fill-background/90 stroke-border') ya da açık renkler */
  sinif?: string;
  dolgu?: string;
  dolguOpakligi?: number;
  cizgi?: string;
  cizgiKalinligi?: number;
  rx?: number;
}

export interface MatematikEtiketiProps {
  /** Satırlar (çoğunlukla bir satır). */
  satirlar: Dugum[][];
  /** Kutunun MERKEZİ (ekran pikseli) */
  x: number;
  y: number;
  /** Yazı boyu (fs(..., 'measure')) */
  px: number;
  /** Yerleşim merkezini değiştirmeden yazıyı, süsleri ve kutuyu birlikte ölçekler. */
  olcek?: number;
  agirlik?: 600 | 700;
  renk: EtiketRengi;
  /** Satır başına renk (alan satırı / çevre satırı) */
  satirRengi?: (EtiketRengi | undefined)[];
  /** Soluk sözcüklerin rengi ('kiriş', '(büyük yay)') */
  solukRenk?: EtiketRengi;
  kutu?: KutuStili | null;
  /** !styleSettings.showLabelBoxes (varsayılan): kutu gizlenir, yazı zemin rengi haleyle okunur kalır */
  kutuGizli?: boolean;
  /** Kutusuz etiket (doğru/ışın |AB|): hale her zaman */
  hale?: boolean;
  /** etiketAcisi(dx, dy) — derece; süsler yazıyla BİRLİKTE döner */
  donmeAcisi?: number;
  minGenislik?: number;
  minYukseklik?: number;
  /** Ekran okuyucu: sesli() */
  sesli: string;
  /** Fare ipucu: aciklama() — kısa yazımda tam adı gösterir */
  ipucu?: string;
  /** Önceden hesaplanmış ölçü (yerleşim için çağıran zaten ölçtüyse) */
  olcu?: KutuOlcusu;
}

const renkOzellikleri = (r: EtiketRengi, tur: 'yazi' | 'cizgi') =>
  typeof r === 'object' ? (tur === 'yazi' ? { fill: r.hex } : { stroke: r.hex }) : { className: ETIKET_RENGI[r][tur] };

/** Kutusuz yazının halesi tuvalin gerçek zemin rengidir (Canvas svg'si --etiket-hale verir); özel zemin yoksa tema zemini. */
const HALE = 'var(--etiket-hale, hsl(var(--background)))';
const f = (n: number) => Number(n.toFixed(2));
const cubukYolu = (c: Cubuk) => `M${f(c.x)},${f(c.y0)} L${f(c.x)},${f(c.y1)}`;

function Etiket(p: MatematikEtiketiProps) {
  const agirlik = p.agirlik ?? 700;
  const olcu = p.olcu ?? kutuOlcusu(p.satirlar, p.px, { agirlik, minGenislik: p.minGenislik, minYukseklik: p.minYukseklik });
  const kutuYok = !p.kutu || !!p.kutuGizli;
  const hale = !!(p.hale || kutuYok);
  const k = p.kutu;
  const solukRenk = p.solukRenk ?? 'soluk';
  const donme = p.donmeAcisi && Math.abs(p.donmeAcisi) > 0.01 ? ` rotate(${f(p.donmeAcisi)})` : '';
  const olcek = p.olcek ?? 1;
  const olcekleme = olcek === 1 ? '' : ` scale(${olcek})`;
  return (
    <g
      role="img"
      aria-label={p.sesli}
      data-yazim={p.satirlar.map(duzMetin).join('\n')}
      transform={`translate(${f(p.x)} ${f(p.y)})${donme}${olcekleme}`}
    >
      {/* Kutu gizliyken bile çizilir (display:none DEĞİL): ipucu ve fare alanı kalsın, dışa aktarımda görünmesin. */}
      <rect
        data-yazim-kutu=""
        x={f(-olcu.genislik / 2)}
        y={f(-olcu.yukseklik / 2)}
        width={f(olcu.genislik)}
        height={f(olcu.yukseklik)}
        rx={k?.rx ?? 6}
        className={kutuYok ? undefined : k?.sinif}
        fill={kutuYok ? 'transparent' : k?.dolgu}
        fillOpacity={kutuYok ? undefined : k?.dolguOpakligi}
        stroke={kutuYok ? 'none' : k?.cizgi}
        strokeWidth={kutuYok ? undefined : k?.cizgiKalinligi ?? 1}
      >
        <title>{p.ipucu ?? p.sesli}</title>
      </rect>
      {olcu.satirlar.map(({ duzen, taban }, si) => {
        const renk = p.satirRengi?.[si] ?? p.renk;
        const x0 = -duzen.genislik / 2;
        const y0 = taban;
        const yol = (d: string, key: string, alt: boolean) => (
          <path
            key={key}
            d={d}
            transform={`translate(${f(x0)} ${f(y0)})`}
            fill="none"
            strokeWidth={f(alt ? duzen.cizgi + p.px * 0.28 : duzen.cizgi)}
            strokeLinecap="round"
            strokeLinejoin="round"
            {...(alt ? { stroke: HALE } : renkOzellikleri(renk, 'cizgi'))}
          />
        );
        return (
          <g key={si}>
            {hale && duzen.susler.map((s, i) => yol(susYolu(s), `hs${i}`, true))}
            {hale && duzen.cubuklar.map((c, i) => yol(cubukYolu(c), `hc${i}`, true))}
            {duzen.parcalar.map((t, i) => (
              <text
                key={`t${i}`}
                x={f(x0 + t.x)}
                y={f(y0 + t.dy)}
                fontSize={f(t.px)}
                fontWeight={agirlik}
                textLength={f(t.w)}
                lengthAdjust="spacingAndGlyphs"
                // Parçaların baş/son boşlukları (' = ', 'kiriş ') korunmalı: SVG varsayılanı onları siler ve
                // textLength kalan tek glifi gererdi. Öznitelik ve satır içi stil dışa aktarımda da kalır.
                xmlSpace="preserve"
                style={{ whiteSpace: 'pre' }}
                {...renkOzellikleri(t.soluk ? solukRenk : renk, 'yazi')}
                {...(hale ? { stroke: HALE, strokeWidth: f(p.px * 0.32), paintOrder: 'stroke', strokeLinejoin: 'round' as const } : {})}
              >
                {t.s}
              </text>
            ))}
            {duzen.susler.map((s, i) => yol(susYolu(s), `s${i}`, false))}
            {duzen.cubuklar.map((c, i) => yol(cubukYolu(c), `c${i}`, false))}
          </g>
        );
      })}
    </g>
  );
}

const renkEsit = (a: EtiketRengi | undefined, b: EtiketRengi | undefined): boolean => {
  if (a === b) return true;
  if (!a || !b || typeof a === 'string' || typeof b === 'string') return false;
  return a.hex === b.hex;
};
const kutuEsit = (a: KutuStili | null | undefined, b: KutuStili | null | undefined): boolean => {
  if (a === b) return true;
  if (!a || !b) return !a === !b;
  return a.sinif === b.sinif && a.dolgu === b.dolgu && a.dolguOpakligi === b.dolguOpakligi
    && a.cizgi === b.cizgi && a.cizgiKalinligi === b.cizgiKalinligi && a.rx === b.rx;
};

/**
 * Sürükleme sırasında saniyede yüzlerce kez çizilen etiketlerde yeniden çizimi düğüm ağacının YAPISAL
 * imzasına bağlar: her karede yeniden kurulan ama içerikçe aynı olan ağaçlar yeniden çizilmez.
 */
export function etiketEsit(a: MatematikEtiketiProps, b: MatematikEtiketiProps): boolean {
  if (a.x !== b.x || a.y !== b.y || a.px !== b.px || a.agirlik !== b.agirlik) return false;
  if ((a.olcek ?? 1) !== (b.olcek ?? 1)) return false;
  if (a.donmeAcisi !== b.donmeAcisi || !!a.kutuGizli !== !!b.kutuGizli || !!a.hale !== !!b.hale) return false;
  if (a.minGenislik !== b.minGenislik || a.minYukseklik !== b.minYukseklik) return false;
  if (a.sesli !== b.sesli || a.ipucu !== b.ipucu) return false;
  if (!renkEsit(a.renk, b.renk) || !renkEsit(a.solukRenk, b.solukRenk) || !kutuEsit(a.kutu, b.kutu)) return false;
  if (a.olcu?.genislik !== b.olcu?.genislik || a.olcu?.yukseklik !== b.olcu?.yukseklik) return false;
  const ra = a.satirRengi ?? [];
  const rb = b.satirRengi ?? [];
  if (ra.length !== rb.length || ra.some((r, i) => !renkEsit(r, rb[i]))) return false;
  if (a.satirlar !== b.satirlar && yazimImzasi(a.satirlar) !== yazimImzasi(b.satirlar)) return false;
  return true;
}

export const MatematikEtiketi = React.memo(Etiket, etiketEsit);
