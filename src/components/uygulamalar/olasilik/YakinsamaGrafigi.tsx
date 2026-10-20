'use client';

/**
 * Yakınsama grafiği: x = deneme sayısı (doğrusal ya da log), y = deneysel olasılık.
 * Teorik değer yatay çizgi (turkuaz), öznel tahmin kesikli yatay çizgi (altın); eğri deniz.
 * "Büyük Sayılar Kanunu" açıklama kutusu. Saf SVG, kap genişliğine uyar.
 *
 * Ortaokul (7. ve 8. sınıf; TEGM 20.10.2026: 6. sınıfta yok): başlık "Deneme sayısı arttıkça …", log ölçek ve "Büyük
 * Sayılar Kanunu" adı yok (lise kavramları). 7. sınıfta eğrinin adı "göreli sıklık"tır ve öznel çizgi yoktur (`oznel` null).
 */
import React from 'react';
import { yuzdeMetni } from './olasilik';
import { seyrekle, type YakinsamaNoktasi } from './simulasyon';
import { useKapGenisligi, useKapYuksekligi } from './useKapGenisligi';

export interface YakinsamaGrafigiProps {
  seri: YakinsamaNoktasi[];
  teorik: number;
  /** Öznel tahmin (0–1); null: öznel çizgi çizilmez */
  oznel: number | null;
  logOlcek: boolean;
  onLogOlcek: () => void;
  /** Geniş yerleşimde sütunun kalan yüksekliğini doldurur (çizim alanı uzar) */
  doldur?: boolean;
  /** Ortaokul dili: log ölçek ve "Büyük Sayılar Kanunu" yok */
  ortaokul?: boolean;
  /** Eğrinin adı: "Deneysel olasılık" (varsayılan) ya da "Göreli sıklık" (7. sınıf) */
  egriAdi?: string;
}

/** Çizim alanının olağan (ve dolduran yerleşimde en az) yüksekliği */
const GRAFIK_YUKSEKLIGI = 240;

/** Doğrusal eksen için "güzel" adım: 1, 2, 5 × 10^k, en çok ~5 etiket. */
export function guzelAdim(enCok: number, hedefSayi = 5): number {
  if (enCok <= 0) return 1;
  const kaba = enCok / hedefSayi;
  const us = Math.pow(10, Math.floor(Math.log10(kaba)));
  const kat = kaba / us;
  const secili = kat < 1.5 ? 1 : kat < 3.5 ? 2 : kat < 7.5 ? 5 : 10;
  return secili * us;
}

export function YakinsamaGrafigi({ seri, teorik, oznel, logOlcek: logIstegi, onLogOlcek, doldur = false, ortaokul = false, egriAdi = 'Deneysel olasılık' }: YakinsamaGrafigiProps) {
  // Ortaokulda logaritma yok: kayıtlı log tercihi yok sayılır
  const logOlcek = logIstegi && !ortaokul;
  const egriKisa = egriAdi.split(' ')[0];
  const [kapRef, genislik] = useKapGenisligi(360);
  const [cizimRef, yukseklik] = useKapYuksekligi<HTMLDivElement>(GRAFIK_YUKSEKLIGI);
  const W = Math.max(260, genislik);
  const H = Math.max(GRAFIK_YUKSEKLIGI, yukseklik);
  const ust = 16;
  const alt = 36;
  const sol = 40;
  const sag = 14;
  const icX = W - sol - sag;
  const icY = H - ust - alt;
  const noktalar = seyrekle(seri, 400);
  const sonN = noktalar.length ? noktalar[noktalar.length - 1].n : 0;
  const enCokN = Math.max(10, sonN);

  const xKonum = (n: number): number => {
    if (logOlcek) return sol + (Math.log10(Math.max(1, n)) / Math.log10(enCokN)) * icX;
    return sol + (n / enCokN) * icX;
  };
  const yKonum = (p: number): number => ust + icY * (1 - Math.max(0, Math.min(1, p)));

  const yol = noktalar.map((p, i) => `${i === 0 ? 'M' : 'L'}${xKonum(p.n).toFixed(1)} ${yKonum(p.p).toFixed(1)}`).join(' ');

  const xEtiketleri: number[] = [];
  if (logOlcek) {
    for (let k = 1; k <= enCokN; k *= 10) xEtiketleri.push(k);
    // Son değer, son 10 kuvvetinin en az iki katıysa ayrıca etiketlenir (çakışma olmasın)
    if (enCokN >= xEtiketleri[xEtiketleri.length - 1] * 2) xEtiketleri.push(enCokN);
  } else {
    const adim = guzelAdim(enCokN);
    for (let k = 0; k <= enCokN; k += adim) xEtiketleri.push(k);
  }

  const bicimN = (n: number) => (n >= 1000 ? `${(Math.round(n / 100) / 10).toString().replace('.', ',')}k` : String(n));

  return (
    <section ref={kapRef} className={`${doldur ? 'flex flex-1 flex-col ' : ''}rounded-[var(--radius)] border border-border bg-card p-4 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]`} aria-label="Yakınsama grafiği">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">{ortaokul ? `Deneme sayısı arttıkça ${egriAdi.toLocaleLowerCase('tr-TR')}` : 'Deneysel olasılığın yakınsaması'}</h3>
        {!ortaokul && (
          <label className="flex min-h-[44px] items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" className="h-6 w-6 accent-[#216a78]" checked={logOlcek} onChange={onLogOlcek} />
            Log ölçek
          </label>
        )}
      </div>
      {/* SVG mutlak konumlu: kap yüksekliği ölçülürken SVG'nin kendi yüksekliği geri beslenmez */}
      <div ref={cizimRef} className="relative mt-1 overflow-hidden" style={doldur ? { flex: '1 1 0%', minHeight: GRAFIK_YUKSEKLIGI } : { height: GRAFIK_YUKSEKLIGI }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="absolute inset-0 block" role="img" aria-label={`${egriAdi} ve deneme sayısı grafiği, ${sonN} deneme; teorik ${yuzdeMetni(teorik)}${oznel === null ? '' : `, öznel ${yuzdeMetni(oznel)}`}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((k) => (
            <g key={k}>
              <line x1={sol} x2={W - sag} y1={yKonum(k)} y2={yKonum(k)} stroke="hsl(var(--grid-color))" strokeWidth={1} />
              <text x={sol - 6} y={yKonum(k) + 4} textAnchor="end" fontSize={13} fill="hsl(var(--muted-foreground))">
                %{Math.round(k * 100)}
              </text>
            </g>
          ))}
          {xEtiketleri.map((n) => (
            <g key={n}>
              <line x1={xKonum(n)} x2={xKonum(n)} y1={ust} y2={ust + icY} stroke="hsl(var(--grid-color))" strokeWidth={1} />
              <text x={xKonum(n)} y={H - alt + 16} textAnchor="middle" fontSize={13} fill="hsl(var(--muted-foreground))">
                {bicimN(n)}
              </text>
            </g>
          ))}
          <text x={sol + icX / 2} y={H - 4} textAnchor="middle" fontSize={13} fill="hsl(var(--muted-foreground))">
            Deneme sayısı
          </text>
          {/* Teorik: düz çizgi; öznel: kesikli */}
          <line x1={sol} x2={W - sag} y1={yKonum(teorik)} y2={yKonum(teorik)} stroke="#2a9d94" strokeWidth={2} />
          {oznel !== null && <line x1={sol} x2={W - sag} y1={yKonum(oznel)} y2={yKonum(oznel)} stroke="#b9884a" strokeWidth={2} strokeDasharray="6 5" />}
          {yol && <path d={yol} fill="none" stroke="#216a78" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />}
          {noktalar.length > 0 && (
            <circle cx={xKonum(noktalar[noktalar.length - 1].n)} cy={yKonum(noktalar[noktalar.length - 1].p)} r={4.5} fill="#216a78" stroke="hsl(var(--card))" strokeWidth={2} />
          )}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-5 rounded" style={{ background: '#216a78' }} /> {ortaokul ? egriAdi : egriKisa}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-5 rounded" style={{ background: '#2a9d94' }} /> {ortaokul ? 'Teorik olasılık' : 'Teorik'}
        </span>
        {oznel !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-5 rounded" style={{ background: 'repeating-linear-gradient(90deg,#b9884a 0 5px,transparent 5px 8px)' }} /> {ortaokul ? 'Öznel olasılık' : 'Öznel'}
          </span>
        )}
      </div>
      {ortaokul ? (
        <aside className="mt-3 rounded-[calc(var(--radius)-4px)] bg-accent px-3 py-2 text-[13px] text-accent-foreground" aria-label="Gözlem" data-yakinsama-notu="ortaokul">
          Deneme sayısı arttıkça {egriAdi.toLocaleLowerCase('tr-TR')} teorik olasılığa yaklaşma eğilimindedir. Az denemede büyük dalgalanmalar görülebilir.
        </aside>
      ) : (
        <aside className="mt-3 rounded-[calc(var(--radius)-4px)] bg-accent px-3 py-2 text-[13px] text-accent-foreground" aria-label="Büyük Sayılar Kanunu">
          <strong>Büyük Sayılar Kanunu:</strong> Deneme sayısı arttıkça deneysel olasılık teorik olasılığa yaklaşma eğilimindedir. Az denemede büyük dalgalanmalar görülebilir; çok sayıda denemede deneysel oran genellikle teorik değerin yakınında seyreder.
        </aside>
      )}
    </section>
  );
}
