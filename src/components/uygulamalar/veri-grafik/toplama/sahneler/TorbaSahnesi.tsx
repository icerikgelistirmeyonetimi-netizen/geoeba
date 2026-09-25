'use client';

/**
 * Torba sahnesi (VT §11.6). viewBox 200 × 200.
 * - Çuval: yuvarlak dipli gövde, büzgülü boyun ve bağcık, üstte açık ağız; dolgu kum (#efe5d0; koyu temada
 *   kumun saydam tonu), kenar mürekkep 2,2. Toplar r ≤ 11 (60 topta en az 5), kategori renginde, koyu kenarlı, yazısız;
 *   topDizilimi ile gövdenin içine dizilir. Geri atılmayan çekişte çıkan topun yeri kesikli iz olarak kalır.
 * - Çekiş (T): %0–45 seçilen top ağızdan yükselir; %45–85 geri atılıyorsa torbaya düşer ve "geri atıldı"
 *   yazısı görünür, atılmıyorsa kesikli bir yayla sağa, Çıkanlar tepsisine doğru uçar. Satır %85'te yazılır.
 * - CikanlarTepsisi: kesikli kenarlı tepsi; en çok 8 top (sıra numarasıyla), fazlası "+k".
 */
import React, { useId, useMemo, useRef } from 'react';
import { useCizimEtkisi } from '../kancalar';
import { rengeGoreMetin } from '../../kategorik';
import { topDizilimi } from '../../grafik';
import { kararliRastgele, koyulastir, svgYaziBoyu } from '../bicim';

export interface TorbaTopu {
  etiket: string;
  renk: string;
  adet: number;
}

export interface TorbaCekisi {
  anahtar: number;
  sure: number;
  /** Çekilen topun etiketi */
  etiket: string;
}

export interface TorbaSahnesiProps {
  boyut: number;
  /** Torbanın başlangıç içeriği */
  toplar: TorbaTopu[];
  /** Geri atılmayan çekişte bu deneyde çıkan toplar (sırayla); geri atılıyorsa boş */
  cekilenler: string[];
  geriAt: boolean;
  atis?: TorbaCekisi | null;
  azaltilmisHareket?: boolean;
}

export const TORBA_SONUC_ORANI = 0.85;
/** Top yarıçapı (viewBox birimi): en çok 11, 60 topta en az 5 */
export const TOP_R_EN_COK = 11;
const AGIZ = { x: 100, y: 48 };
const ALAN = { x: 46, y: 104, g: 108, y2: 72 };

interface DiziliTop {
  etiket: string;
  renk: string;
  x: number;
  y: number;
}

/** Topları karışık ama kararlı dizer (aynı torba her çizimde aynı görünür) */
export function torbaDizilimi(toplar: TorbaTopu[]): { r: number; toplar: DiziliTop[] } {
  const liste: { etiket: string; renk: string }[] = [];
  toplar.forEach((t) => {
    for (let i = 0; i < Math.max(0, Math.floor(t.adet)); i++) liste.push({ etiket: t.etiket, renk: t.renk });
  });
  const d = topDizilimi(liste.length, ALAN.g, ALAN.y2, TOP_R_EN_COK, 1.4);
  const rnd = kararliRastgele(liste.length * 31 + toplar.length);
  const sira = liste.map((_, i) => ({ i, k: rnd() })).sort((a, b) => a.k - b.k);
  return {
    r: Math.max(5, d.r),
    toplar: sira.map((s, j) => ({ ...liste[s.i], x: ALAN.x + d.konumlar[j].x, y: ALAN.y + d.konumlar[j].y })),
  };
}

/** Çekilen topların torbadaki yerleri (her etiket için sırayla ilk uygun top) */
export function cikanIndeksleri(dizili: DiziliTop[], cekilenler: string[]): Set<number> {
  const cikan = new Set<number>();
  cekilenler.forEach((e) => {
    const i = dizili.findIndex((t, j) => t.etiket === e && !cikan.has(j));
    if (i >= 0) cikan.add(i);
  });
  return cikan;
}

/** "Torbada kalan: 2 kırmızı, 1 mavi" (geri atılmayan çekiş) */
export function torbadaKalanMetni(toplar: TorbaTopu[], cekilenler: string[]): string {
  const parcalar = toplar
    .map((t) => {
      const kalan = Math.max(0, t.adet - cekilenler.filter((c) => c === t.etiket).length);
      return kalan > 0 ? `${kalan} ${t.etiket.toLocaleLowerCase('tr')}` : null;
    })
    .filter(Boolean);
  return parcalar.length ? `Torbada kalan: ${parcalar.join(', ')}` : 'Torba boşaldı';
}

/** Fırfırlı ağız kenarı: elips üzerinde `dalga` kıvrım (kumaş büzgüsü); kararlı, saf */
export function firfirYolu(cx: number, cy: number, rx: number, ry: number, dalga = 11, genlik = 0.06): string {
  const n = dalga * 8;
  const noktalar: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const k = 1 + genlik * Math.cos(t * dalga);
    const x = cx + rx * k * Math.cos(t);
    const y = cy + ry * (1 + genlik * 2.2 * Math.cos(t * dalga)) * Math.sin(t);
    noktalar.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${noktalar.join(' ')} Z`;
}

const GOVDE = 'M76 72 C 50 86, 30 110, 30 138 C 30 170, 60 186, 100 186 C 140 186, 170 170, 170 138 C 170 110, 150 86, 124 72 Z';
/** Büzgülü boyun: bağcıktan ağza doğru açılan kumaş */
const BOYUN = 'M76 72 C 74 64, 68 56, 62 48 L 138 48 C 132 56, 126 64, 124 72 Z';

export function TorbaSahnesi({ boyut, toplar, cekilenler, geriAt, atis = null, azaltilmisHareket = false }: TorbaSahnesiProps) {
  const dizilim = useMemo(() => torbaDizilimi(toplar), [toplar]);
  const cikan = useMemo(() => cikanIndeksleri(dizilim.toplar, geriAt ? [] : cekilenler), [dizilim, cekilenler, geriAt]);
  const ucanRef = useRef<SVGGElement>(null);
  const yayRef = useRef<SVGPathElement>(null);
  const notRef = useRef<SVGTextElement>(null);
  const anahtar = atis?.anahtar ?? null;
  const sure = atis?.sure ?? 0;
  const ucanRenk = atis ? toplar.find((t) => t.etiket === atis.etiket)?.renk ?? '#6f7c8c' : '#6f7c8c';
  const ucanR = Math.max(10, Math.min(12, dizilim.r + 1));

  useCizimEtkisi(() => {
    if (anahtar === null || azaltilmisHareket || sure <= 0) return;
    const ucan = ucanRef.current;
    if (!ucan || typeof ucan.animate !== 'function') return;
    const animler: Animation[] = [];
    const secenek: KeyframeAnimationOptions = { duration: sure, fill: 'none' };
    if (geriAt) {
      animler.push(
        ucan.animate(
          [
            { offset: 0, transform: 'translate(0px, 18px)', opacity: 1, easing: 'ease-out' },
            { offset: 0.1, transform: 'translate(0px, 8px)', opacity: 1, easing: 'ease-out' },
            { offset: 0.45, transform: 'translate(0px, -34px)', opacity: 1, easing: 'ease-in' },
            { offset: 0.8, transform: 'translate(0px, 12px)', opacity: 1, easing: 'ease-in' },
            { offset: TORBA_SONUC_ORANI, transform: 'translate(0px, 22px)', opacity: 1 },
            { offset: 1, transform: 'translate(0px, 22px)', opacity: 0 },
          ],
          secenek,
        ),
      );
      const not = notRef.current;
      if (not) {
        animler.push(
          not.animate(
            [
              { offset: 0, opacity: 0 },
              { offset: 0.45, opacity: 0, easing: 'ease-out' },
              { offset: 0.52, opacity: 1 },
              { offset: 0.92, opacity: 1, easing: 'ease-in' },
              { offset: 1, opacity: 0 },
            ],
            secenek,
          ),
        );
      }
    } else {
      animler.push(
        ucan.animate(
          [
            { offset: 0, transform: 'translate(0px, 18px)', opacity: 1, easing: 'ease-out' },
            { offset: 0.1, transform: 'translate(0px, 8px)', opacity: 1, easing: 'ease-out' },
            { offset: 0.45, transform: 'translate(0px, -34px)', opacity: 1, easing: 'ease-in-out' },
            { offset: 0.65, transform: 'translate(40px, -46px)', opacity: 1, easing: 'ease-in-out' },
            { offset: TORBA_SONUC_ORANI, transform: 'translate(84px, -24px)', opacity: 1, easing: 'ease-in' },
            { offset: 0.95, transform: 'translate(92px, -18px)', opacity: 0 },
            { offset: 1, transform: 'translate(92px, -18px)', opacity: 0 },
          ],
          secenek,
        ),
      );
      const yay = yayRef.current;
      if (yay) {
        animler.push(
          yay.animate(
            [
              { offset: 0, opacity: 0 },
              { offset: 0.42, opacity: 0, easing: 'ease-out' },
              { offset: 0.55, opacity: 1 },
              { offset: 0.88, opacity: 1, easing: 'ease-in' },
              { offset: 1, opacity: 0 },
            ],
            secenek,
          ),
        );
      }
    }
    return () => animler.forEach((a) => a.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar]);

  const notBoyu = svgYaziBoyu(12, boyut, 200, 12);
  const kirpId = `vg-torba-agiz-${useId().replace(/:/g, '')}`;
  const topR = dizilim.r;

  return (
    <svg viewBox="0 0 200 200" width={boyut} height={boyut} overflow="visible" className="block" aria-hidden="true" focusable="false" data-torba-kalan={dizilim.toplar.length - cikan.size}>
      <defs>
        {/* Uçan top yalnız ağzın üstünde (ya da ağız deliğinde) görünür: torbanın içinden çıkıyormuş gibi */}
        <clipPath id={kirpId}>
          <rect x={-100} y={-120} width={400} height={120 + AGIZ.y} />
          <ellipse cx={AGIZ.x} cy={AGIZ.y + 1} rx={30} ry={5.6} />
        </clipPath>
      </defs>
      <g className="text-[#15302d] opacity-[.12] dark:text-black dark:opacity-40">
        <ellipse cx={100} cy={190} rx={62} ry={6} fill="currentColor" />
      </g>
      {/* Gövde, ışık ve gölge, kıvrımlar */}
      <path d={GOVDE} className="fill-[#efe5d0] dark:fill-[#efe5d0]/25" stroke="hsl(var(--foreground))" strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M50 118 C 44 134, 46 152, 56 166" fill="none" className="stroke-white/60 dark:stroke-white/10" strokeWidth={6} strokeLinecap="round" />
      <path d="M152 112 C 158 130, 158 152, 146 168" fill="none" stroke="hsl(var(--foreground))" strokeOpacity={0.09} strokeWidth={7} strokeLinecap="round" />
      <path d="M88 80 L 85 96 M100 82 L 100 98 M112 80 L 115 96" fill="none" stroke="hsl(var(--foreground))" strokeOpacity={0.2} strokeWidth={1.6} strokeLinecap="round" />
      {/* Toplar: yazısız, kategori renginde; çıkan topun yeri kesikli iz */}
      {dizilim.toplar.map((t, i) => {
        const disarida = cikan.has(i);
        return (
          <g key={i} data-top={t.etiket} data-cikti={disarida ? '' : undefined}>
            <circle
              cx={t.x}
              cy={t.y}
              r={topR}
              fill={t.renk}
              fillOpacity={disarida ? 0.3 : 1}
              stroke={disarida ? 'hsl(var(--foreground))' : koyulastir(t.renk, 0.45)}
              strokeOpacity={disarida ? 0.55 : 1}
              strokeWidth={1.5}
              strokeDasharray={disarida ? '2.4 2.2' : undefined}
            />
            {!disarida && topR >= 7 && (
              <ellipse cx={t.x - topR * 0.32} cy={t.y - topR * 0.38} rx={topR * 0.36} ry={topR * 0.22} transform={`rotate(-30 ${t.x - topR * 0.32} ${t.y - topR * 0.38})`} fill="#ffffff" fillOpacity={0.35} />
            )}
          </g>
        );
      })}
      {/* Boyun ve ağız deliği */}
      <path d={BOYUN} className="fill-[#efe5d0] dark:fill-[#efe5d0]/25" stroke="hsl(var(--foreground))" strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M70 52 C 74 60, 78 66, 80 72 M130 52 C 126 60, 122 66, 120 72" fill="none" stroke="hsl(var(--foreground))" strokeOpacity={0.18} strokeWidth={1.4} strokeLinecap="round" />
      {/* Ağız: kumaş kenarı ve içindeki koyu delik */}
      <path d={firfirYolu(AGIZ.x, AGIZ.y, 38, 9)} className="fill-[#e3d6ba] dark:fill-[#efe5d0]/35" stroke="hsl(var(--foreground))" strokeWidth={2.2} strokeLinejoin="round" />
      <ellipse cx={AGIZ.x} cy={AGIZ.y + 1} rx={30} ry={5.6} fill="#15302d" fillOpacity={0.78} />
      {/* Çekiş: kesikli yay (geri atılmıyorsa) ve ağızdan çıkan top */}
      {!geriAt && (
        <path ref={yayRef} d="M100 32 C 118 2, 170 4, 190 34" fill="none" stroke="hsl(var(--foreground))" strokeWidth={1.6} strokeDasharray="4 4" strokeLinecap="round" opacity={0} />
      )}
      {atis && (
        <g clipPath={`url(#${kirpId})`}>
          <g ref={ucanRef} opacity={0} data-ucan-top={atis.etiket}>
            <circle cx={AGIZ.x} cy={AGIZ.y - 4} r={ucanR} fill={ucanRenk} stroke={koyulastir(ucanRenk, 0.45)} strokeWidth={1.8} />
            <ellipse cx={AGIZ.x - ucanR * 0.32} cy={AGIZ.y - 4 - ucanR * 0.38} rx={ucanR * 0.36} ry={ucanR * 0.22} fill="#ffffff" fillOpacity={0.35} />
          </g>
        </g>
      )}
      {/* Ağzın ön dudağı (top içeri düşerken arkasında kalır) */}
      <path d={`M${AGIZ.x - 30} ${AGIZ.y + 1} A 30 5.6 0 0 0 ${AGIZ.x + 30} ${AGIZ.y + 1}`} fill="none" stroke="#15302d" strokeOpacity={0.5} strokeWidth={1.4} />
      {/* Bağcık ve fiyonk */}
      <path d="M74 72 C 88 80, 112 80, 126 72" fill="none" stroke="#b9884a" strokeWidth={5} strokeLinecap="round" />
      <path d="M121 76 C 128 66, 142 68, 136 78 C 132 84, 124 82, 121 76 Z" fill="#c99a52" stroke="#8d6533" strokeWidth={1.3} strokeLinejoin="round" />
      <path d="M121 76 C 124 84, 122 92, 117 97" fill="none" stroke="#b9884a" strokeWidth={3} strokeLinecap="round" />
      <circle cx={121} cy={76} r={3.4} fill="#b9884a" stroke="#8d6533" strokeWidth={1.2} />
      {geriAt && (
        <text ref={notRef} x={156} y={40} textAnchor="middle" fontSize={notBoyu} fontWeight={700} fill="hsl(var(--muted-foreground))" opacity={0}>
          geri atıldı
        </text>
      )}
    </svg>
  );
}

export interface CikanTop {
  etiket: string;
  renk: string;
}

/** Çıkanlar tepsisi: geri atılmayan çekişte çıkan toplar, sıra numarasıyla (en çok 8; fazlası "+k") */
export function CikanlarTepsisi({ cikanlar, enCok = 8, className = '' }: { cikanlar: CikanTop[]; enCok?: number; className?: string }) {
  const gorunen = cikanlar.slice(0, enCok);
  const fazla = cikanlar.length - gorunen.length;
  return (
    <div className={`rounded-[calc(var(--radius)-6px)] border-2 border-dashed border-border px-2 py-1.5 ${className}`} data-cikanlar={cikanlar.length}>
      <div className="text-[12px] font-extrabold leading-4 text-muted-foreground">Çıkanlar</div>
      <div className="mt-1 flex min-h-[24px] flex-wrap items-center gap-1">
        {gorunen.length === 0 && <span className="text-[12px] leading-6 text-muted-foreground/80">Henüz top çıkmadı</span>}
        {gorunen.map((t, i) => (
          <span
            key={i}
            className="grid h-6 w-6 place-items-center rounded-full text-[12px] font-extrabold leading-none tabular-nums"
            style={{ background: t.renk, color: rengeGoreMetin(t.renk), boxShadow: `inset 0 0 0 1.5px ${koyulastir(t.renk, 0.4)}` }}
            title={`${i + 1}. çekiş: ${t.etiket}`}
          >
            {i + 1}
          </span>
        ))}
        {fazla > 0 && <span className="text-[12px] font-extrabold text-muted-foreground">+{fazla}</span>}
      </div>
    </div>
  );
}
