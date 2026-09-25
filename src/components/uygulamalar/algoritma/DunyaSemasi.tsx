'use client';

/**
 * Dünyanın düz şeması (SVG): öğretmen notunda küçük resim ve WebGL yoksa sahnenin yerine.
 * Sıra: başlangıç deniz mavisi, çıkış yeşil; saksıda toprak kuru (açık) / nemli (koyu), domates
 * kırmızı / yeşil, sarı yaprak küçük sarı işaretle. Bahçe: yollar açık taş, çalılar yeşil daire,
 * hedef sarı kare (çiçek), başlangıç deniz mavisi; robot yönünü gösteren üçgenle.
 */
import React from 'react';
import { cizgiUclari, hucreNo, izgara, type DunyaDurumu, type DunyaTanimi, type Izgara } from './dunya';

const BOYA = '#6f79c9';
const EKSEN = '#5d66a6';

/** Saha (çizim) şeması: nokta ağı, hazır / çizilecek / çizilen çizgiler, simetri doğrusu, koordinat eksenleri */
function SahaSemasi({ dunya, g, durum, hucre, robot, etiket }: { dunya: DunyaTanimi; g: Izgara; durum?: DunyaDurumu | null; hucre: number; robot: boolean; etiket?: string }) {
  const pay = hucre * 0.7;
  const w = (g.en - 1) * hucre + pay * 2;
  const h = (g.boy - 1) * hucre + pay * 2;
  const P = (i: number): [number, number] => [pay + (i % g.en) * hucre, pay + Math.floor(i / g.en) * hucre];
  const cizgi = (k: string, renk: string, kalin: number, kesikli = false) => {
    const [a, b] = cizgiUclari(k);
    const [x1, y1] = P(a);
    const [x2, y2] = P(b);
    return <line key={`${k}-${renk}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={renk} strokeWidth={kalin} strokeLinecap="round" strokeDasharray={kesikli ? `${hucre * 0.18} ${hucre * 0.14}` : undefined} />;
  };
  const cizilen = new Set(durum?.cizgiler ?? []);
  const rx = durum?.x ?? g.bas.x;
  const ry = durum?.y ?? g.bas.y;
  const yon = durum?.yon ?? g.bas.yon;
  const e = dunya.eksen;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={etiket ?? `${dunya.ad}: saha`} className="block shrink-0">
      <rect x={0} y={0} width={w} height={h} rx={hucre * 0.25} fill="#9fcb7a" opacity={0.55} />
      {dunya.koordinat && (
        <g stroke="#1d3b37" strokeWidth={1.4} fill="#1d3b37" fontSize={hucre * 0.34} fontWeight={700}>
          <line x1={pay} y1={pay + (g.boy - 1) * hucre} x2={w - pay * 0.3} y2={pay + (g.boy - 1) * hucre} />
          <line x1={pay} y1={pay + (g.boy - 1) * hucre} x2={pay} y2={pay * 0.3} />
          {Array.from({ length: g.en }, (_, x) => (
            <text key={`x${x}`} x={pay + x * hucre} y={pay + (g.boy - 1) * hucre + hucre * 0.48} textAnchor="middle" stroke="none">
              {x}
            </text>
          ))}
          {Array.from({ length: g.boy - 1 }, (_, y) => (
            <text key={`y${y}`} x={pay - hucre * 0.36} y={pay + (g.boy - 2 - y) * hucre + hucre * 0.12} textAnchor="middle" stroke="none">
              {y + 1}
            </text>
          ))}
        </g>
      )}
      {Array.from({ length: g.en * g.boy }, (_, i) => {
        const [x, y] = P(i);
        return <circle key={`n${i}`} cx={x} cy={y} r={hucre * 0.06} fill="#fbf7ee" />;
      })}
      {e && (
        <line
          x1={e.yon === 'dikey' ? pay + e.k * hucre : pay * 0.3}
          y1={e.yon === 'dikey' ? pay * 0.3 : pay + e.k * hucre}
          x2={e.yon === 'dikey' ? pay + e.k * hucre : w - pay * 0.3}
          y2={e.yon === 'dikey' ? h - pay * 0.3 : pay + e.k * hucre}
          stroke={EKSEN}
          strokeWidth={2}
          strokeDasharray={`${hucre * 0.16} ${hucre * 0.12}`}
        />
      )}
      {!durum && [...g.cizgiHedef].map((k) => cizgi(k, '#216a78', hucre * 0.08, true))}
      {[...g.cizgiVerilen].map((k) => cizgi(k, '#f3eee0', hucre * 0.12))}
      {[...g.cizgiVerilen].map((k) => cizgi(k, '#15302d', hucre * 0.04))}
      {[...cizilen].map((k) => cizgi(k, g.cizgiHedef.has(k) || g.cizgiVerilen.has(k) ? '#2a9d94' : '#d9534f', hucre * 0.1))}
      {g.noktaHedef.map((v, i) => {
        if (!v) return null;
        const [x, y] = P(i);
        const var_ = durum?.noktalar.includes(i);
        return <circle key={`h${i}`} cx={x} cy={y} r={hucre * 0.16} fill={var_ ? EKSEN : 'none'} stroke={EKSEN} strokeWidth={2} />;
      })}
      {(durum?.noktalar ?? [])
        .filter((i) => !g.noktaHedef[i])
        .map((i) => {
          const [x, y] = P(i);
          return <circle key={`y${i}`} cx={x} cy={y} r={hucre * 0.16} fill="#d9534f" />;
        })}
      {robot && (
        <g transform={`translate(${pay + rx * hucre} ${pay + ry * hucre}) rotate(${yon * 90})`}>
          <rect x={-hucre * 0.2} y={-hucre * 0.2} width={hucre * 0.4} height={hucre * 0.4} rx={hucre * 0.09} fill="#f4efe3" stroke="#15302d" strokeWidth={1.2} />
          <path d={`M${hucre * 0.26} 0 L${hucre * 0.07} ${-hucre * 0.12} L${hucre * 0.07} ${hucre * 0.12} Z`} fill="#2a9d94" />
        </g>
      )}
    </svg>
  );
}

/**
 * İnşaat hedefinin önden ve yandan görünümü (7.4.1): hedef gizliyken tuvalde yapının ne olduğunu gösterir.
 * Önden: sütunlar batıdan doğuya (x), yükseklik o sütundaki en yüksek kule. Yandan (sağdan): sütunlar
 * güneyden kuzeye (y), yükseklik o sıradaki en yüksek kule.
 */
export function YapiGorunumleri({ dunya, birim = 14 }: { dunya: DunyaTanimi; birim?: number }) {
  const g = izgara(dunya);
  const H = Math.max(1, ...g.yapiHedef);
  const onden = Array.from({ length: g.en }, (_, x) => Math.max(0, ...Array.from({ length: g.boy }, (_, y) => g.yapiHedef[hucreNo(g, x, y)])));
  const yandan = Array.from({ length: g.boy }, (_, k) => {
    const y = g.boy - 1 - k;
    return Math.max(0, ...Array.from({ length: g.en }, (_, x) => g.yapiHedef[hucreNo(g, x, y)]));
  });
  const kirp = (l: number[]) => {
    let a = 0;
    let b = l.length;
    while (a < b && !l[a]) a++;
    while (b > a && !l[b - 1]) b--;
    return l.slice(a, b);
  };
  const cizim = (ad: string, l: number[]) => {
    const kol = kirp(l);
    const w = kol.length * birim;
    const h = H * birim;
    return (
      <figure className="m-0 flex flex-col items-center gap-1">
        <svg viewBox={`-1 -1 ${w + 2} ${h + 2}`} width={w + 2} height={h + 2} role="img" aria-label={`${ad} görünüm`}>
          {kol.map((n, x) =>
            Array.from({ length: n }, (_, k) => <rect key={`${x}-${k}`} x={x * birim} y={h - (k + 1) * birim} width={birim} height={birim} fill="#e9b949" stroke="#8a6a2a" strokeWidth={1} />)
          )}
          <line x1={-1} y1={h} x2={w + 1} y2={h} stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.5} />
        </svg>
        <figcaption className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">{ad}</figcaption>
      </figure>
    );
  };
  return (
    <div className="flex items-end gap-3 rounded-[14px] bg-card/95 px-3 py-2 shadow-sm ring-1 ring-border backdrop-blur" data-yapi-gorunumleri>
      {cizim('Önden', onden)}
      {cizim('Yandan', yandan)}
    </div>
  );
}

function Bitki({ dunya, i, cx, cy, r, durum }: { dunya: DunyaTanimi; i: number; cx: number; cy: number; r: number; durum?: DunyaDurumu | null }) {
  const b = dunya.bitkiler[i];
  const d = durum?.bitkiler[i];
  const domates = b.tur === 'domates';
  const kirmizi = (d?.domates ?? b.domates) === 'kirmizi';
  const yok = d?.domates === 'yok';
  const kuru = (d?.toprak ?? b.toprak) === 'kuru';
  const sari = (d?.yaprak ?? b.yaprak) === 'sari';
  return (
    <g>
      {domates ? (
        yok ? (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeDasharray="2 2" />
        ) : (
          <circle cx={cx} cy={cy} r={r} fill={kirmizi ? '#d83b2b' : '#86b24a'} />
        )
      ) : (
        <>
          <path d={`M${cx - r} ${cy - r * 0.55}h${2 * r}l-${r * 0.28} ${r * 1.5}h-${r * 1.44}z`} fill="#c46a43" />
          <ellipse cx={cx} cy={cy - r * 0.55} rx={r} ry={r * 0.32} fill={kuru ? '#dcbd8c' : '#4a2f1f'} />
        </>
      )}
      {sari && <circle cx={cx + r * 0.95} cy={cy - r * 0.95} r={r * 0.36} fill="#d8b347" stroke="#fbf7ee" strokeWidth={1} />}
      {d?.zarar && <circle cx={cx} cy={cy} r={r * 1.25} fill="none" stroke="#d9534f" strokeWidth={1.5} />}
    </g>
  );
}

export function DunyaSemasi({ dunya, durum, hucre = 18, robot = true, etiket }: { dunya: DunyaTanimi; durum?: DunyaDurumu | null; hucre?: number; robot?: boolean; etiket?: string }) {
  const g = izgara(dunya);
  const r = hucre * 0.36;
  if (g.tur === 'cizim') return <SahaSemasi dunya={dunya} g={g} durum={durum} hucre={hucre} robot={robot} etiket={etiket} />;
  if (g.bahce) {
    const boyali = new Set(durum?.boyali ?? []);
    const tarla = dunya.boyaTuru === 'ek';
    const w = g.en * hucre;
    const h = g.boy * hucre;
    const rx = durum?.x ?? g.bas.x;
    const ry = durum?.y ?? g.bas.y;
    const yon = durum?.yon ?? g.bas.yon;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={etiket ?? `${dunya.ad}: bahçe`} className="block shrink-0">
        {Array.from({ length: g.boy }, (_, y) =>
          Array.from({ length: g.en }, (_, x) => {
            const no = hucreNo(g, x, y);
            const yol = g.yol[no];
            const hedef = g.hedef && g.hedef.x === x && g.hedef.y === y;
            const bas = g.bas.x === x && g.bas.y === y;
            const cx = x * hucre + hucre / 2;
            const cy = y * hucre + hucre / 2;
            const bi = g.hucreBitki[no];
            const hedefBoya = g.boyaHedef[no];
            const boyandi = g.boyaVerilen[no] || boyali.has(no);
            const kule = g.yapiHedef[no];
            const kup = durum?.kupler[no] ?? 0;
            const zemin = tarla && hedefBoya ? '#c9a57a' : g.tur === 'insaat' ? '#d9dcd8' : '#e3dccd';
            return (
              <g key={no}>
                {yol ? (
                  <rect x={x * hucre + 1} y={y * hucre + 1} width={hucre - 2} height={hucre - 2} rx={hucre * 0.16} fill={bas && !(tarla && hedefBoya) ? '#216a78' : hedef ? '#e9b949' : zemin} />
                ) : (
                  <circle cx={cx} cy={cy} r={hucre * 0.38} fill="#5e9d5a" opacity={0.85} />
                )}
                {boyandi && !tarla && <rect x={x * hucre + hucre * 0.12} y={y * hucre + hucre * 0.12} width={hucre * 0.76} height={hucre * 0.76} rx={hucre * 0.1} fill={hedefBoya || g.boyaVerilen[no] ? BOYA : '#d9534f'} />}
                {hedefBoya && !boyandi && !tarla && !dunya.hedefGizli && <rect x={x * hucre + hucre * 0.16} y={y * hucre + hucre * 0.16} width={hucre * 0.68} height={hucre * 0.68} rx={hucre * 0.08} fill="none" stroke={BOYA} strokeWidth={1.6} strokeDasharray="3 2" />}
                {tarla && boyandi && <circle cx={cx} cy={cy} r={hucre * 0.18} fill={hedefBoya ? '#6fae4f' : '#d9534f'} />}
                {kule > 0 && !dunya.hedefGizli && (
                  <text x={cx} y={cy + hucre * 0.14} textAnchor="middle" fontSize={hucre * 0.42} fontWeight={800} fill={kup >= kule ? '#1d766f' : '#8a6a2a'}>
                    {durum ? `${kup}/${kule}` : kule}
                  </text>
                )}
                {hedef && <circle cx={cx} cy={cy} r={hucre * 0.18} fill="#fbf7ee" stroke="#8a5a2b" strokeWidth={hucre * 0.07} />}
                {bi >= 0 && <Bitki dunya={dunya} i={bi} cx={cx} cy={cy} r={r * 0.9} durum={durum} />}
              </g>
            );
          })
        )}
        {dunya.eksen && (
          <line
            x1={dunya.eksen.yon === 'dikey' ? (dunya.eksen.k + 0.5) * hucre : 0}
            y1={dunya.eksen.yon === 'dikey' ? 0 : (dunya.eksen.k + 0.5) * hucre}
            x2={dunya.eksen.yon === 'dikey' ? (dunya.eksen.k + 0.5) * hucre : w}
            y2={dunya.eksen.yon === 'dikey' ? h : (dunya.eksen.k + 0.5) * hucre}
            stroke={EKSEN}
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        )}
        {robot && (
          <g transform={`translate(${rx * hucre + hucre / 2} ${ry * hucre + hucre / 2}) rotate(${yon * 90})`}>
            <rect x={-hucre * 0.24} y={-hucre * 0.24} width={hucre * 0.48} height={hucre * 0.48} rx={hucre * 0.1} fill="#f4efe3" stroke="#15302d" strokeWidth={1.2} />
            <path d={`M${hucre * 0.28} 0 L${hucre * 0.08} ${-hucre * 0.14} L${hucre * 0.08} ${hucre * 0.14} Z`} fill="#2a9d94" />
          </g>
        )}
      </svg>
    );
  }
  const n = dunya.bitkiler.length;
  const w = (n + 2) * hucre;
  const h = hucre * 1.25;
  const x0 = (i: number) => i * hucre + hucre / 2;
  const cy = h / 2;
  const robotX = durum?.x ?? 0;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={etiket ?? `${dunya.ad}: ${n} bitki`} className="block shrink-0">
      <rect x={1} y={cy - hucre * 0.44} width={hucre - 2} height={hucre * 0.88} rx={hucre * 0.18} fill="#216a78" />
      <rect x={(n + 1) * hucre + 1} y={cy - hucre * 0.44} width={hucre - 2} height={hucre * 0.88} rx={hucre * 0.18} fill="#5e9d5a" />
      <path d={`M${(n + 1.36) * hucre} ${cy + hucre * 0.24}V${cy - hucre * 0.26}l${hucre * 0.32} ${hucre * 0.12}-${hucre * 0.32} ${hucre * 0.12}`} fill="none" stroke="#fbf7ee" strokeWidth={hucre * 0.08} strokeLinecap="round" strokeLinejoin="round" />
      {dunya.bitkiler.map((_, i) => (
        <g key={i}>
          <rect x={i * hucre + hucre + 1.5} y={cy - hucre * 0.44} width={hucre - 3} height={hucre * 0.88} rx={hucre * 0.18} fill="currentColor" opacity={0.07} />
          <Bitki dunya={dunya} i={i} cx={x0(i + 1)} cy={cy} r={r} durum={durum} />
        </g>
      ))}
      {robot && (
        <g transform={`translate(${x0(robotX)} ${cy})`}>
          <rect x={-hucre * 0.22} y={-hucre * 0.22} width={hucre * 0.44} height={hucre * 0.44} rx={hucre * 0.1} fill="#f4efe3" stroke="#15302d" strokeWidth={1.2} />
          <circle cx={hucre * 0.08} cy={-hucre * 0.04} r={hucre * 0.05} fill="#2a9d94" />
        </g>
      )}
    </svg>
  );
}
