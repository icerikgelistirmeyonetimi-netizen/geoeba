'use client';

/**
 * Deney alanı: 3B sahne (deneySahnesi.ts) kartı. WebGL yoksa aynı animasyonların sade SVG
 * sürümü. Dıştan ref ile oynat(sonuc, hizli) çağrılır; animasyon bitince onBitti(sonuc).
 * Tıklama süren animasyonu hızlandırır (atla). Görünmezken render döngüsü durur.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { DeneySahnesi, GALTON_YIGIN_KAPASITE, temsilMetni, webglDestekli, yiginOlcegi } from './deneySahnesi';
import { KART_TURU_SEMBOLU, galtonKosuluSaglar, galtonKutuSayimlari, kartRengi, sonucEtiketi, type Sablon, type Sonuc } from './olasilik';

export interface DeneyAlaniTutamaci {
  oynat: (sonuc: Sonuc, hizli?: boolean) => void;
  hizlandir: () => void;
  /** Galton: toplu denemede süs bilyeleri yağsın (salt görsel) */
  yagmur: (aktif: boolean) => void;
}

export interface DeneyAlaniProps {
  sablon: Sablon;
  koyu: boolean;
  azHareket: boolean;
  /** Pencere küçültülmüşse / gizliyse true: döngü durur */
  gizli?: boolean;
  onBitti: (sonuc: Sonuc) => void;
  /** Ekranda gösterilen son sonuç etiketi (SVG sürümü ve altyazı için) */
  sonSonuc: Sonuc | null;
  animasyonda: boolean;
  /** Toplu deneme sürüyor: atlanacak tek bir animasyon yok, "Atlamak için" ipucu gösterilmez */
  toplu?: boolean;
  /** Sonuç sayaçları (Galton kutularındaki birikim için) */
  sayimlar?: Record<string, number>;
}

/** Şablon nesnelerini yeniden kurmayı gerektiren alanlar (istenen durum değişimi kurmaz). */
function kurulumAnahtari(s: Sablon): string {
  switch (s.tur) {
    case 'zar':
      return `zar:${s.ikiZar ? 2 : 1}`;
    case 'cark':
      return `cark:${s.dilimler.map((d) => `${d.renk}/${d.genislik}`).join(',')}`;
    case 'torba':
      return `torba:${s.bilyeler.map((b) => `${b.renk}/${b.adet}`).join(',')}`;
    case 'galton':
      // Yalnız satır sayısı tahtayı yeniden kurar; istenen koşul (numara şeridi, altın kutu
      // zeminleri) sahne.galtonVurgula ile yerinde güncellenir
      return `galton:${s.satir}`;
    default:
      return s.tur;
  }
}

export const DeneyAlani = forwardRef<DeneyAlaniTutamaci, DeneyAlaniProps>(function DeneyAlani(
  { sablon, koyu, azHareket, gizli = false, onBitti, sonSonuc, animasyonda, toplu = false, sayimlar = BOS_SAYIM },
  ref
) {
  const kapRef = useRef<HTMLDivElement>(null);
  const sahneRef = useRef<DeneySahnesi | null>(null);
  const onBittiRef = useRef(onBitti);
  onBittiRef.current = onBitti;
  const sonSonucRef = useRef(sonSonuc);
  sonSonucRef.current = sonSonuc;
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [svgSonuc, setSvgSonuc] = useState<Sonuc | null>(null);
  const svgZamanlayici = useRef<number | null>(null);
  const anahtar = kurulumAnahtari(sablon);
  const vurguAnahtari = sablon.tur === 'galton' ? JSON.stringify(sablon.istenen) : '';
  const sablonRef = useRef(sablon);
  sablonRef.current = sablon;
  const birikim = sablon.tur === 'galton' ? galtonKutuSayimlari(sablon.satir, sayimlar) : null;
  const birikimAnahtari = birikim ? birikim.join(',') : '';
  const birikimRef = useRef(birikim);
  birikimRef.current = birikim;
  const [teorikEgri, setTeorikEgri] = useState(true);
  const teorikEgriRef = useRef(teorikEgri);
  teorikEgriRef.current = teorikEgri;

  useLayoutEffect(() => {
    setWebgl(webglDestekli());
  }, []);

  // Sahne kurulumu: WebGL varsa ve tema değişince yeniden
  useEffect(() => {
    const kap = kapRef.current;
    if (!webgl || !kap) return;
    let sahne: DeneySahnesi | null = null;
    try {
      sahne = new DeneySahnesi(kap, {
        azHareket,
        koyu,
        rastgele: Math.random,
      });
    } catch {
      setWebgl(false);
      return;
    }
    const dinleyici = (e: Event) => {
      const detay = (e as CustomEvent<{ sonuc: Sonuc }>).detail;
      onBittiRef.current(detay.sonuc);
    };
    sahne.addEventListener('bitti', dinleyici);
    sahneRef.current = sahne;
    return () => {
      // Önce dispose: süren animasyonun 'bitti' olayı dinleyiciye ulaşsın, sonra dinleyici sökülür
      sahne?.dispose();
      sahne?.removeEventListener('bitti', dinleyici);
      sahneRef.current = null;
    };
  }, [webgl, koyu, azHareket]);

  // Klavye: animasyon sürerken Enter / Boşluk / Escape atlar (odak nerede olursa olsun; giriş alanları hariç)
  useEffect(() => {
    if (!animasyonda) return;
    const tus = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Escape') return;
      const hedef = e.target as HTMLElement | null;
      if (hedef && hedef.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      sahneRef.current?.hizlandir();
    };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, [animasyonda]);

  // Şablon nesneleri
  useEffect(() => {
    const sahne = sahneRef.current;
    if (!sahne) return;
    sahne.kur(sablon);
    if (birikimRef.current) {
      sahne.teorikEgri(teorikEgriRef.current);
      sahne.birikimGoster(birikimRef.current);
    }
    // Yeniden açılışta / tema değişiminde son sonuç animasyonsuz gösterilir
    const son = sonSonucRef.current;
    if (son && son.tur === sablon.tur && !sahne.animasyonda) sahne.yerlestir(son);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar, webgl, koyu, azHareket]);

  // Galton koşulu değişti: tahta yeniden kurulmaz, yalnız istenen kutuların vurgusu yenilenir
  useEffect(() => {
    const s = sablonRef.current;
    if (s.tur === 'galton') sahneRef.current?.galtonVurgula(s);
  }, [vurguAnahtari]);

  // Galton kutularındaki birikim (yığınlar) ve teorik eğri
  useEffect(() => {
    const b = birikimRef.current;
    if (b) sahneRef.current?.birikimGoster(b);
  }, [birikimAnahtari, webgl, koyu, azHareket]);

  useEffect(() => {
    sahneRef.current?.teorikEgri(teorikEgri);
  }, [teorikEgri]);

  // Görünürlük: pencere küçükken ya da kart ekran dışındayken döngü durur
  useEffect(() => {
    const sahne = sahneRef.current;
    const kap = kapRef.current;
    if (!sahne || !kap) return;
    if (gizli) {
      sahne.duraklat();
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      sahne.surdur();
      return;
    }
    const io = new IntersectionObserver(
      (girisler) => {
        const gorunur = girisler.some((g) => g.isIntersecting);
        if (gorunur) sahne.surdur();
        else sahne.duraklat();
      },
      { threshold: 0.05 }
    );
    io.observe(kap);
    return () => io.disconnect();
  }, [gizli, webgl, koyu, azHareket]);

  const svgOynat = useCallback(
    (sonuc: Sonuc) => {
      setSvgSonuc(sonuc);
      if (svgZamanlayici.current) window.clearTimeout(svgZamanlayici.current);
      svgZamanlayici.current = window.setTimeout(() => onBittiRef.current(sonuc), azHareket ? 250 : 700);
    },
    [azHareket]
  );

  useEffect(() => () => {
    if (svgZamanlayici.current) window.clearTimeout(svgZamanlayici.current);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      oynat: (sonuc, hizli = false) => {
        const sahne = sahneRef.current;
        if (sahne && webgl) sahne.oynat(sonuc, hizli);
        else svgOynat(sonuc);
      },
      yagmur: (aktif) => {
        if (webgl) sahneRef.current?.yagmur(aktif);
      },
      hizlandir: () => {
        sahneRef.current?.hizlandir();
        if (svgZamanlayici.current && svgSonuc) {
          window.clearTimeout(svgZamanlayici.current);
          svgZamanlayici.current = null;
          onBittiRef.current(svgSonuc);
        }
      },
    }),
    [webgl, svgOynat, svgSonuc]
  );

  const gosterilen = webgl ? sonSonuc : svgSonuc ?? sonSonuc;
  const olcek = birikim ? yiginOlcegi(birikim, GALTON_YIGIN_KAPASITE) : null;

  const kart = (
    <div
      className="relative w-full overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-[0_18px_40px_-18px_rgba(6,40,45,.55)]"
      // Galton dik bir tahta: kart biraz daha uzun, tahta ve çiviler büyük görünür
      style={{ height: sablon.tur === 'galton' ? 'min(540px, 54vh)' : 'min(420px, 42vh)', minHeight: 240 }}
      onClick={() => sahneRef.current?.hizlandir()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          sahneRef.current?.hizlandir();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={
        // Animasyon sürerken sonuç söylenmez (görsel rozet "Deneniyor…" iken); sonuç bitince canlı bölgeden duyurulur
        animasyonda
          ? `Deney alanı, deneniyor${toplu ? '' : '. Atlamak için Enter'}`
          : gosterilen
            ? `Deney alanı, son sonuç: ${sonucEtiketi(sablon, gosterilen)}`
            : 'Deney alanı'
      }
      data-deney-alani
    >
      {webgl === false ? (
        <SvgDeney sablon={sablon} sonuc={gosterilen} azHareket={azHareket} birikim={birikim} />
      ) : (
        <div ref={kapRef} className="absolute inset-0" />
      )}
      {/* Hafif vinyet */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(6,40,45,0.22) 100%)' }}
        aria-hidden="true"
      />
      {gosterilen && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-sm font-semibold text-foreground shadow-sm">
          {animasyonda ? 'Deneniyor…' : `Sonuç: ${sonucEtiketi(sablon, gosterilen)}`}
        </div>
      )}
      {animasyonda && !toplu && (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-card/80 px-3 py-1 text-[13px] text-muted-foreground">
          Atlamak için tıkla ya da Enter
        </div>
      )}
    </div>
  );

  // Ekran okuyucu: sonuç animasyon bitince (tablo güncellenince) duyurulur
  const canli = (
    <div className="sr-only" role="status" aria-live="polite" data-deney-canli>
      {!animasyonda && gosterilen ? `Sonuç: ${sonucEtiketi(sablon, gosterilen)}` : ''}
    </div>
  );

  if (!birikim)
    return (
      <>
        {kart}
        {canli}
      </>
    );
  // Galton: sahnenin altında küçük anahtar (renkler, ölçek, teorik eğri anahtarı)
  return (
    <div className="flex flex-col gap-1.5">
      {kart}
      {canli}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[13px] text-muted-foreground" data-galton-anahtar>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#d9805f' }} aria-hidden="true" />
          Son bilye
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: '#2a9d94' }} aria-hidden="true" />
          {olcek?.oranli ? `Birikim (1 bilye ≈ ${temsilMetni(olcek.temsil)} deneme)` : 'Birikim (1 bilye = 1 deneme)'}
        </span>
        <label className="ml-auto inline-flex min-h-[44px] cursor-pointer items-center gap-2 font-semibold text-foreground">
          <input type="checkbox" className="h-5 w-5 accent-[#b9884a]" checked={teorikEgri} onChange={(e) => setTeorikEgri(e.target.checked)} data-teorik-egri />
          <span className="inline-block w-5 border-t-2 border-dashed border-[#b9884a]" aria-hidden="true" />
          Teorik eğri
        </label>
      </div>
    </div>
  );
});

const BOS_SAYIM: Record<string, number> = {};

// ---------------------------------------------------------------------------
// WebGL yoksa: sade SVG sürümü
// ---------------------------------------------------------------------------
function SvgDeney({ sablon, sonuc, azHareket, birikim }: { sablon: Sablon; sonuc: Sonuc | null; azHareket: boolean; birikim: number[] | null }) {
  const sure = azHareket ? '0.25s' : '0.7s';
  const anim = { transition: `transform ${sure} cubic-bezier(0.2,0.8,0.2,1)` };
  const anahtar = sonuc ? JSON.stringify(sonuc) : 'yok';
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full" aria-hidden="true">
      <rect width="400" height="240" fill="#f3ead6" />
      <ellipse cx="200" cy="200" rx="150" ry="22" fill="#e6dcc4" />
      <g key={anahtar} style={anim}>
        {sablon.tur === 'para' && (
          <g transform="translate(200 120)">
            <circle r="60" fill="#d3a95a" stroke="#a87a35" strokeWidth="6" />
            <text textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight="800" fill="#6d4a17">
              {sonuc?.tur === 'para' ? (sonuc.yuz === 'tura' ? 'TURA' : 'YAZI') : '?'}
            </text>
          </g>
        )}
        {sablon.tur === 'zar' &&
          (sonuc?.tur === 'zar' ? sonuc.zarlar : [0]).map((z, i, dizi) => (
            <g key={i} transform={`translate(${200 + (i - (dizi.length - 1) / 2) * 110} 120)`}>
              <rect x="-45" y="-45" width="90" height="90" rx="14" fill="#fbf7ee" stroke="#d9cfb8" strokeWidth="3" />
              <text textAnchor="middle" dominantBaseline="middle" fontSize="40" fontWeight="800" fill="#15302d">
                {z || '?'}
              </text>
            </g>
          ))}
        {sablon.tur === 'cark' && (
          <g transform="translate(200 125)">
            {(() => {
              const toplam = sablon.dilimler.reduce((t, d) => t + Math.max(0, d.genislik), 0) || 1;
              let acik = -Math.PI / 2;
              return sablon.dilimler.map((d, i) => {
                const uz = (Math.max(0, d.genislik) / toplam) * Math.PI * 2;
                const a0 = acik;
                const a1 = acik + uz;
                acik = a1;
                const buyuk = uz > Math.PI ? 1 : 0;
                const yol = `M0 0 L${Math.cos(a0) * 85} ${Math.sin(a0) * 85} A85 85 0 ${buyuk} 1 ${Math.cos(a1) * 85} ${Math.sin(a1) * 85} Z`;
                const secili = sonuc?.tur === 'cark' && sonuc.dilim === i;
                return <path key={i} d={yol} fill={d.renk} stroke={secili ? '#15302d' : '#fbf7ee'} strokeWidth={secili ? 5 : 2} />;
              });
            })()}
            <circle r="10" fill="#c99a52" />
            <path d="M-10 -100 L10 -100 L0 -80 Z" fill="#15302d" />
          </g>
        )}
        {sablon.tur === 'torba' && (
          <g transform="translate(200 120)">
            <path d="M-50 60 Q-70 -10 -20 -40 L20 -40 Q70 -10 50 60 Z" fill="#b89467" />
            <ellipse cx="0" cy="-40" rx="22" ry="8" fill="#8a5a2a" />
            {sonuc?.tur === 'torba' && (
              <circle cx="90" cy="60" r="18" fill={sablon.bilyeler.find((b) => b.ad === sonuc.renk)?.renk ?? '#c9463d'} stroke="#fbf7ee" strokeWidth="3" />
            )}
          </g>
        )}
        {sablon.tur === 'galton' && <SvgGalton sablon={sablon} sonuc={sonuc?.tur === 'galton' ? sonuc : null} birikim={birikim} />}
        {sablon.tur === 'kart' && (
          <g transform="translate(200 120)">
            <rect x="-40" y="-58" width="80" height="116" rx="8" fill="#fdfbf5" stroke="#d9cfb8" strokeWidth="3" />
            {sonuc?.tur === 'kart' ? (
              <text textAnchor="middle" dominantBaseline="middle" fontSize="34" fontWeight="800" fill={kartRengi(sonuc.kart.tur) === 'kirmizi' ? '#c9463d' : '#15302d'}>
                {sonuc.kart.deger}
                {KART_TURU_SEMBOLU[sonuc.kart.tur]}
              </text>
            ) : (
              <rect x="-32" y="-50" width="64" height="100" rx="6" fill="#216a78" />
            )}
          </g>
        )}
      </g>
    </svg>
  );
}

/** WebGL yoksa sade 2B Galton: çiviler, son bilyenin yolu (çizgi), kutularda çubuklar. */
function SvgGalton({ sablon, sonuc, birikim }: { sablon: Extract<Sablon, { tur: 'galton' }>; sonuc: Extract<Sonuc, { tur: 'galton' }> | null; birikim: number[] | null }) {
  const n = sablon.satir;
  const aralik = Math.min(34, 330 / (n + 1));
  const dy = Math.min(16, 118 / n);
  const ustY = 22;
  const kutuUst = ustY + n * dy + 8;
  const kutuAlt = 222;
  const x = (k: number, satir: number) => 200 + (k - satir / 2) * aralik;
  const sayim = birikim ?? [];
  const enCok = Math.max(1, ...sayim);
  const yolNoktalari: string[] = [];
  if (sonuc && sonuc.yol.length === n) {
    let j = 0;
    yolNoktalari.push(`200,${ustY - 12}`);
    for (let i = 0; i < n; i++) {
      yolNoktalari.push(`${x(j, i)},${ustY + i * dy - 5}`);
      j += sonuc.yol[i];
    }
    yolNoktalari.push(`${x(j, n)},${kutuAlt - 8}`);
  }
  return (
    <g>
      {Array.from({ length: n }, (_, i) =>
        Array.from({ length: i + 1 }, (_, j) => <circle key={`${i}-${j}`} cx={x(j, i)} cy={ustY + i * dy} r={2.6} fill="#a88d5c" />)
      )}
      {Array.from({ length: n + 1 }, (_, k) => {
        const h = ((sayim[k] ?? 0) / enCok) * (kutuAlt - kutuUst - 4);
        const istenen = galtonKosuluSaglar(sablon.istenen, n, k);
        return (
          <g key={k}>
            <rect x={x(k, n) - aralik / 2 + 2} y={kutuAlt - h} width={aralik - 4} height={h} fill={istenen ? '#216a78' : '#2a9d94'} opacity={0.85} />
            <line x1={x(k, n) - aralik / 2} x2={x(k, n) - aralik / 2} y1={kutuUst} y2={kutuAlt} stroke="#a8733d" strokeWidth={1.5} />
            <text x={x(k, n)} y={236} textAnchor="middle" fontSize="11" fontWeight="700" fill="#15302d">
              {k + 1}
            </text>
          </g>
        );
      })}
      <line x1={x(n + 1, n) - aralik / 2} x2={x(n + 1, n) - aralik / 2} y1={kutuUst} y2={kutuAlt} stroke="#a8733d" strokeWidth={1.5} />
      {yolNoktalari.length > 0 && (
        <>
          <polyline points={yolNoktalari.join(' ')} fill="none" stroke="#d9805f" strokeWidth={2.5} strokeLinejoin="round" />
          <circle cx={Number(yolNoktalari[yolNoktalari.length - 1].split(',')[0])} cy={kutuAlt - 8} r={6} fill="#d9805f" />
        </>
      )}
    </g>
  );
}
