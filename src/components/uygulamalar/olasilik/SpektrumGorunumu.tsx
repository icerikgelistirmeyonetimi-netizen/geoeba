'use client';

/**
 * Olasılık Laboratuvarı — 5. sınıf «olasılık spektrumu» görünümü (öznel olasılık; TYMM MAT.5.6.1, 5.6.2).
 *
 * TEGM Ortaokul Komisyonu (20.10.2026): 5. sınıfta yalnız öznel olasılık vardır; spektrum üzerinden işaretleme ve öznel
 * olasılık soruları sorulur. Solda olay kartı (olay cümlesi, varsa torbanın içi / çarkın dilimleri / nesnenin simgesi),
 * sağda tek çalışma yüzeyi: spektrum. Öğrenci olayı beş duraktan birine (imkânsız, az olasılıklı, eşit olasılıklı, çok
 * olasılıklı, kesin) yerleştirir ve kontrol eder; doğru yerleşen olaylar spektrumda durağın üstünde birikir. Deney,
 * sayaç, sıklık tablosu ve teorik hesap yoktur. Mantık: spektrum.ts.
 */
import React, { useCallback, useState } from 'react';
import { sekmeKimlikleri, sekmeOkTusu } from '../sekmeler';
import { SablonSimgesi } from './SablonSimgesi';
import { SinifRozeti } from './SinifSecici';
import { useKapGenisligi } from './useKapGenisligi';
import {
  BOS_SPEKTRUM_DURUMU,
  DURAK_ADLARI,
  DURAK_DEGERLERI,
  SPEKTRUM_DURAKLARI,
  SPEKTRUM_KARTLARI,
  donut,
  durakSec,
  kontrolEt,
  siradakiKart,
  yerlesti,
  type SpektrumDuragi,
  type SpektrumGorseli,
  type SpektrumKartDurumu,
} from './spektrum';

const dugmeSinifi =
  'min-h-[44px] min-w-[44px] rounded-[calc(var(--radius)-4px)] px-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Spektrum çizgisinin rengi: imkânsızdan (kum) kesine (deniz) */
const SPEKTRUM_DEGRADESI = 'linear-gradient(90deg, #d8cbb2 0%, #c99a52 50%, #216a78 100%)';

function Baslik({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

/** Olayın nesnesi: torbanın bilyeleri, çarkın dilimleri ya da sayı küpü / madenî para simgesi (sayı yazmadan) */
function OlayGorseli({ gorsel }: { gorsel: SpektrumGorseli }) {
  if (gorsel.tur === 'gunluk') return null;
  if (gorsel.tur === 'zar' || gorsel.tur === 'para')
    return (
      <div className="mt-3 flex items-center gap-2" data-spektrum-gorsel={gorsel.tur}>
        <SablonSimgesi tur={gorsel.tur} className="h-12 w-12 shrink-0 text-foreground" />
      </div>
    );
  if (gorsel.tur === 'torba') {
    const bilyeler = gorsel.bilyeler.flatMap((b) => Array.from({ length: b.adet }, () => b));
    return (
      <div className="mt-3" data-spektrum-gorsel="torba">
        <p className="text-[13px] font-semibold text-muted-foreground">Torbanın içi</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={gorsel.bilyeler.map((b) => `${b.adet} ${b.ad.toLocaleLowerCase('tr-TR')}`).join(', ') + ' bilye'}>
          {bilyeler.map((b, i) => (
            <li key={i} className="inline-block h-7 w-7 rounded-full border-2 border-card shadow-[inset_-3px_-4px_6px_rgba(0,0,0,0.22)] ring-1 ring-border" style={{ background: b.renk }} title={b.ad}>
              <span className="sr-only">{b.ad}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const n = gorsel.dilimler.length;
  return (
    <div className="mt-3" data-spektrum-gorsel="cark">
      <p className="text-[13px] font-semibold text-muted-foreground">Çarkın dilimleri</p>
      <svg viewBox="-50 -58 100 108" className="mt-1.5 h-24 w-24" role="img" aria-label={`${n} eş dilimli çark: ${gorsel.dilimler.map((d) => d.ad.toLocaleLowerCase('tr-TR')).join(', ')}`}>
        {gorsel.dilimler.map((d, i) => {
          const a0 = -Math.PI / 2 + (i / n) * Math.PI * 2;
          const a1 = -Math.PI / 2 + ((i + 1) / n) * Math.PI * 2;
          const yol = `M0 0 L${(Math.cos(a0) * 44).toFixed(2)} ${(Math.sin(a0) * 44).toFixed(2)} A44 44 0 0 1 ${(Math.cos(a1) * 44).toFixed(2)} ${(Math.sin(a1) * 44).toFixed(2)} Z`;
          return <path key={i} d={yol} fill={d.renk} stroke="#fbf7ee" strokeWidth={2} />;
        })}
        <circle r={5} fill="#c99a52" />
        <path d="M-6 -56 L6 -56 L0 -44 Z" fill="currentColor" className="text-foreground" />
      </svg>
    </div>
  );
}

export interface SpektrumGorunumuProps {
  onSinifDegistir: () => void;
}

export function SpektrumGorunumu({ onSinifDegistir }: SpektrumGorunumuProps) {
  const [aktif, setAktif] = useState(0);
  const [durumlar, setDurumlar] = useState<SpektrumKartDurumu[]>(() => SPEKTRUM_KARTLARI.map(() => BOS_SPEKTRUM_DURUMU));
  const [kokRef, genislik] = useKapGenisligi<HTMLDivElement>(1000);

  const kart = SPEKTRUM_KARTLARI[aktif];
  const d = durumlar[aktif];
  const dn = donut(kart, d);
  const bitenler = SPEKTRUM_KARTLARI.map((k, i) => yerlesti(k, durumlar[i]));
  const bitenSayisi = bitenler.filter(Boolean).length;
  const siradaki = siradakiKart(aktif, bitenler);
  const kilitli = bitenler[aktif];

  const kartSec = useCallback((i: number) => {
    if (i < 0 || i >= SPEKTRUM_KARTLARI.length) return;
    setAktif(i);
  }, []);

  const durakSecTikla = useCallback(
    (durak: SpektrumDuragi) => {
      setDurumlar((ds) => ds.map((x, i) => (i === aktif ? durakSec(SPEKTRUM_KARTLARI[i], x, durak) : x)));
    },
    [aktif]
  );

  const kontrolTikla = useCallback(() => {
    setDurumlar((ds) => ds.map((x, i) => (i === aktif ? kontrolEt(x) : x)));
  }, [aktif]);

  const orta = genislik >= 820;

  const kartPaneli = (
    <section className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]" aria-label="Olay kartı" data-spektrum-karti={kart.id}>
      <Baslik>Olay</Baslik>
      <p className="mt-2 text-xl font-bold leading-snug text-foreground" data-olay-cumlesi>
        {kart.olay}
      </p>
      <OlayGorseli gorsel={kart.gorsel} />
      <p className="mt-4 text-sm text-foreground">
        {d.secim === null ? 'Bu olay spektrumun neresinde? Spektrumda bir durak seç.' : kilitli ? 'Bu olay spektruma yerleşti.' : <>Seçimin: <strong>{DURAK_ADLARI[d.secim]}</strong></>}
      </p>
      {!kilitli && (
        <button type="button" onClick={kontrolTikla} disabled={d.secim === null || d.kontrol !== null} className={`${dugmeSinifi} mt-3 bg-ada-fener text-ada-murekkep hover:opacity-90`} data-spektrum-kontrol>
          Kontrol et
        </button>
      )}
      <div className="mt-3" role="status" aria-live="polite" data-spektrum-donut={dn ? (dn.dogru ? 'dogru' : 'yanlis') : 'yok'}>
        {dn && (
          <div className="rounded-[calc(var(--radius)-4px)] border-2 p-3" style={{ borderColor: dn.dogru ? '#2a9d94' : '#b9884a', background: dn.dogru ? 'rgba(42,157,148,0.10)' : 'rgba(185,136,74,0.12)' }}>
            <p className="text-base font-bold text-foreground">{dn.karar}</p>
            <p className="mt-1 text-sm text-foreground">{dn.aciklama}</p>
            {dn.dogru &&
              (siradaki !== null ? (
                <button type="button" onClick={() => kartSec(siradaki)} className={`${dugmeSinifi} mt-3 bg-primary text-primary-foreground hover:opacity-90`} data-spektrum-sonraki>
                  {siradaki === aktif + 1 ? 'Sonraki olay' : 'Yerleşmemiş olaya geç'}
                </button>
              ) : (
                <p className="mt-3 text-sm font-bold text-foreground" data-spektrum-bitti>
                  Bütün olayları spektruma yerleştirdin!
                </p>
              ))}
          </div>
        )}
      </div>
    </section>
  );

  const spektrum = (
    <section className="flex h-full min-h-[360px] flex-col rounded-[var(--radius)] border border-border bg-card p-4 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]" aria-label="Olasılık spektrumu" data-spektrum>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Baslik>Olasılık spektrumu</Baslik>
        <span className="text-[13px] font-semibold tabular-nums text-muted-foreground" data-spektrum-sayac>
          {bitenSayisi} / {SPEKTRUM_KARTLARI.length} olay yerleşti
        </span>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">Bir olayın olasılığı 0 (imkânsız) ile 1 (kesin) arasındadır; 0 ve 1 de dâhildir.</p>
      {/* Beş eşit sütun: üstte yerleşen olaylar, ortada durak düğmesi (spektrum çizgisi sütun merkezlerinden geçer), altta ad ve değer */}
      {/* Ölçek kartın kalan yüksekliğinde dikey ortalıdır (tek çalışma yüzeyi) */}
      <div className="flex flex-1 flex-col justify-center py-4">
      <div className="relative" role="radiogroup" aria-label="Spektrumdaki durak">
        {/* Çizgi durak düğmelerinin ortasından geçer: işaret alanı 168 px + düğmenin yarısı 26 px − çizginin yarısı 7 px */}
        <div className="pointer-events-none absolute left-[10%] right-[10%] h-3.5 rounded-full" style={{ top: 187, background: SPEKTRUM_DEGRADESI }} aria-hidden="true" />
        <div className="grid grid-cols-5">
          {SPEKTRUM_DURAKLARI.map((durak, i) => {
            const yerlesenler = SPEKTRUM_KARTLARI.filter((k, j) => bitenler[j] && k.dogru === durak);
            const secili = d.secim === durak;
            const taslak = secili && !kilitli;
            return (
              <div key={durak} className="flex min-w-0 flex-col items-center" data-spektrum-duragi={durak}>
                <ul className="flex h-[168px] w-full flex-col-reverse items-center justify-start gap-1.5 overflow-hidden px-1 pb-3" aria-label={`${DURAK_ADLARI[durak]}: yerleşen olaylar`}>
                  {taslak && (
                    <li className="max-w-full truncate rounded-full border-2 border-dashed border-primary bg-card px-2.5 py-1 text-[13px] font-bold text-foreground" data-spektrum-taslak>
                      {kart.kisaAd}
                    </li>
                  )}
                  {yerlesenler.map((k) => (
                    <li key={k.id} className="max-w-full truncate rounded-full border border-border bg-muted px-2.5 py-1 text-[13px] font-semibold text-foreground" title={k.olay} data-spektrum-isaret={k.id}>
                      {k.kisaAd}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  role="radio"
                  aria-checked={secili}
                  aria-label={`${DURAK_ADLARI[durak]} (${DURAK_DEGERLERI[durak]})`}
                  tabIndex={secili || (d.secim === null && i === 0) ? 0 : -1}
                  disabled={kilitli}
                  onClick={() => durakSecTikla(durak)}
                  onKeyDown={(e) => {
                    const j = sekmeOkTusu(e.key, i, SPEKTRUM_DURAKLARI.length);
                    if (j === null || kilitli) return;
                    e.preventDefault();
                    durakSecTikla(SPEKTRUM_DURAKLARI[j]);
                    (e.currentTarget.closest('[role="radiogroup"]')?.querySelectorAll<HTMLElement>('[role="radio"]')[j])?.focus();
                  }}
                  className={`relative z-[1] flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default ${
                    secili ? 'border-primary bg-primary' : 'border-card bg-card hover:border-primary/60'
                  }`}
                  style={{ boxShadow: '0 0 0 2px hsl(var(--border))' }}
                  data-durak={durak}
                >
                  <span className={`block h-4 w-4 rounded-full ${secili ? 'bg-primary-foreground' : 'bg-foreground/70'}`} aria-hidden="true" />
                </button>
                <span className="mt-3 text-center text-[15px] font-bold leading-tight text-foreground">{DURAK_ADLARI[durak]}</span>
                <span className="mt-1 text-center text-[13px] font-semibold leading-tight tabular-nums text-muted-foreground">{DURAK_DEGERLERI[durak]}</span>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </section>
  );

  return (
    <div ref={kokRef} className="flex h-full w-full flex-col bg-background text-foreground" data-uygulama="olasilik" data-olasilik-kip="spektrum">
      {/* Üst şerit: sınıf + başlık + olay sekmeleri (numaralı; yerleşen olayda işaret) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <SinifRozeti sinif={5} onDegistir={onSinifDegistir} />
        <h2 className="mx-1 text-base font-bold text-foreground">Olasılık spektrumu</h2>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Olaylar">
          {SPEKTRUM_KARTLARI.map((k, i) => {
            const secili = i === aktif;
            return (
              <button
                key={k.id}
                id={sekmeKimlikleri('spektrum', k.id).sekme}
                type="button"
                role="tab"
                aria-selected={secili}
                aria-controls={sekmeKimlikleri('spektrum', k.id).panel}
                aria-label={`${i + 1}. olay: ${k.olay}${bitenler[i] ? ', yerleşti' : ''}`}
                tabIndex={secili ? 0 : -1}
                onClick={() => kartSec(i)}
                onKeyDown={(e) => {
                  const j = sekmeOkTusu(e.key, i, SPEKTRUM_KARTLARI.length);
                  if (j === null) return;
                  e.preventDefault();
                  kartSec(j);
                  document.getElementById(sekmeKimlikleri('spektrum', SPEKTRUM_KARTLARI[j].id).sekme)?.focus();
                }}
                className={`${dugmeSinifi} relative px-2 tabular-nums ${secili ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-muted'}`}
                data-spektrum-sekme={k.id}
              >
                {i + 1}
                {bitenler[i] && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2a9d94] text-[11px] font-bold leading-none text-white" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3" role="tabpanel" id={sekmeKimlikleri('spektrum', kart.id).panel} aria-labelledby={sekmeKimlikleri('spektrum', kart.id).sekme}>
        <div className={`grid gap-3 ${orta ? 'h-full' : ''}`} style={{ gridTemplateColumns: orta ? 'minmax(300px, 400px) minmax(0, 1fr)' : 'minmax(0, 1fr)', gridTemplateRows: orta ? 'minmax(0, 1fr)' : undefined }}>
          <div className="min-w-0">{kartPaneli}</div>
          <div className="min-h-0 min-w-0">{spektrum}</div>
        </div>
      </div>
    </div>
  );
}
