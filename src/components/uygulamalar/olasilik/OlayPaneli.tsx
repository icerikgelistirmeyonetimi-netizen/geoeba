'use client';

/**
 * Olay paneli: şablon ayarları (istenen durum, dilimler, bilyeler, kart koşulu) ve üç olasılık
 * kartı — ÖZNEL (kaydırıcı), TEORİK (formül), DENEYSEL (canlı sayaç).
 */
import React from 'react';
import { sekmeOkTusu } from '../sekmeler';
import { useKapGenisligi } from './useKapGenisligi';
import {
  CARK_EN_AZ_DILIM,
  CARK_EN_COK_DILIM,
  CARK_EN_COK_GENISLIK,
  GALTON_EN_AZ_SATIR,
  GALTON_EN_COK_SATIR,
  KART_DEGERLERI,
  KART_TURLERI,
  KART_TURU_ADI,
  KART_TURU_SEMBOLU,
  RENK_SECENEKLERI,
  TORBA_EN_COK_ADET,
  galtonKosuluSaglar,
  istenenAdi,
  pascalSatiri,
  ussuMetni,
  kesirMetni,
  kesirSadelestir,
  sablonUyarilari,
  teorikOlasilik,
  yuzdeMetni,
  type CarkDilimi,
  type GaltonKosulu,
  type KartKosulu,
  type Sablon,
  type TorbaBilyesi,
  type ZarKosulu,
} from './olasilik';

export interface OlayPaneliProps {
  sablon: Sablon;
  onSablon: (s: Sablon) => void;
  oznel: number;
  oznelKilitli: boolean;
  onOznel: (yuzde: number) => void;
  onKilit: () => void;
  deneme: number;
  gerceklesen: number;
  /** Deney sürerken düzenleme kapalı */
  kilitli: boolean;
}

const secimSinifi = (aktif: boolean) =>
  `min-h-[44px] rounded-[calc(var(--radius)-4px)] border px-3 py-2 text-sm font-semibold transition-colors ${
    aktif ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'
  } disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`;

const girisSinifi =
  'min-h-[44px] rounded-[calc(var(--radius)-4px)] border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

function Baslik({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

/**
 * ARIA radyo grubu deseni: yalnız seçili radyo sekme durağıdır (roving tabindex); ←/→/↑/↓,
 * Home ve End seçimi ve odağı birlikte taşır.
 */
function radyoOzellikleri(i: number, adet: number, secili: boolean, sec: (j: number) => void) {
  return {
    role: 'radio' as const,
    'aria-checked': secili,
    tabIndex: secili ? 0 : -1,
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const j = sekmeOkTusu(e.key, i, adet);
      if (j === null) return;
      e.preventDefault();
      const grup = e.currentTarget.closest('[role="radiogroup"]');
      sec(j);
      (grup?.querySelectorAll<HTMLElement>('[role="radio"]')[j])?.focus();
    },
  };
}

export function OlayPaneli({ sablon, onSablon, oznel, oznelKilitli, onOznel, onKilit, deneme, gerceklesen, kilitli }: OlayPaneliProps) {
  const teorik = teorikOlasilik(sablon);
  const deneysel = kesirSadelestir(gerceklesen, deneme);
  const deneyselOran = deneme > 0 ? gerceklesen / deneme : 0;
  const uyarilar = sablonUyarilari(sablon);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]" aria-label="Olay ayarları">
        <Baslik>Rastgele olay</Baslik>
        <div className="mt-3 flex flex-col gap-3">
          {sablon.tur === 'para' && <ParaAyari sablon={sablon} onSablon={onSablon} kilitli={kilitli} />}
          {sablon.tur === 'zar' && <ZarAyari sablon={sablon} onSablon={onSablon} kilitli={kilitli} />}
          {sablon.tur === 'cark' && <CarkAyari sablon={sablon} onSablon={onSablon} kilitli={kilitli} />}
          {sablon.tur === 'torba' && <TorbaAyari sablon={sablon} onSablon={onSablon} kilitli={kilitli} />}
          {sablon.tur === 'kart' && <KartAyari sablon={sablon} onSablon={onSablon} kilitli={kilitli} />}
          {sablon.tur === 'galton' && <GaltonAyari sablon={sablon} onSablon={onSablon} kilitli={kilitli} />}
        </div>
        {uyarilar.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1" role="alert">
            {uyarilar.map((u) => (
              <li key={u.mesaj} className="rounded-md bg-destructive/10 px-3 py-2 text-[13px] font-medium text-destructive">
                {u.mesaj}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          İstenen durum: <strong className="text-foreground">{istenenAdi(sablon)}</strong>
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3" aria-label="Olasılık panelleri">
        {/* ÖZNEL */}
        <div className="rounded-[var(--radius)] border border-border bg-card p-4" style={{ borderTop: '4px solid #b9884a' }}>
          <div className="flex items-center justify-between gap-2">
            <Baslik>Öznel olasılık</Baslik>
            <button
              type="button"
              onClick={onKilit}
              className="min-h-[44px] rounded-full border border-border px-3 text-[13px] font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-pressed={oznelKilitli}
            >
              {oznelKilitli ? 'Kilidi aç' : 'Kilitle'}
            </button>
          </div>
          <p className="mt-2 text-lg font-bold text-foreground">
            Bence olasılık <span className="text-[#8f6a33] dark:text-[#d4a76a]">%{oznel}</span>
          </p>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={oznel}
            disabled={oznelKilitli}
            onChange={(e) => onOznel(Number(e.target.value))}
            aria-label="Öznel olasılık tahmini, yüzde"
            className="mt-2 h-11 w-full cursor-pointer accent-[#b9884a] disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-[13px] text-muted-foreground">
            {deneme === 0 && !oznelKilitli ? 'Deneye başlamadan önce tahminini seç.' : oznelKilitli ? 'Tahmin kilitli; deney sonuçlarıyla karşılaştır.' : 'Tahmini değiştirebilirsin.'}
          </p>
        </div>

        {/* TEORİK */}
        <div className="rounded-[var(--radius)] border border-border bg-card p-4" style={{ borderTop: '4px solid #2a9d94' }}>
          <Baslik>Teorik olasılık</Baslik>
          <p className="mt-2 text-lg font-bold text-foreground">
            <span className="text-[#1f7a72] dark:text-[#5cc4bb]">{yuzdeMetni(teorik.deger)}</span>{' '}
            <span className="text-sm font-semibold text-muted-foreground">({kesirMetni(teorik.kesir)})</span>
          </p>
          <p className="mt-1 break-words font-mono text-[13px] text-muted-foreground" data-teorik-formul>
            {teorik.formul}
          </p>
        </div>

        {/* DENEYSEL */}
        <div className="rounded-[var(--radius)] border border-border bg-card p-4" style={{ borderTop: '4px solid #216a78' }}>
          <Baslik>Deneysel olasılık</Baslik>
          <p className="mt-2 text-lg font-bold text-foreground" aria-live="polite" data-deneysel>
            <span className="text-ada-deniz dark:text-[#5cc4bb]">{deneme > 0 ? yuzdeMetni(deneyselOran) : '—'}</span>{' '}
            <span className="text-sm font-semibold text-muted-foreground">
              ({gerceklesen} / {deneme}
              {deneme > 0 ? ` = ${kesirMetni(deneysel)}` : ''})
            </span>
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">Gerçekleşen / toplam deneme</p>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Şablon ayarları
// ---------------------------------------------------------------------------
function ParaAyari({ sablon, onSablon, kilitli }: { sablon: Extract<Sablon, { tur: 'para' }>; onSablon: (s: Sablon) => void; kilitli: boolean }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="İstenen yüz">
      {(['tura', 'yazi'] as const).map((y, i, dizi) => (
        <button
          key={y}
          type="button"
          {...radyoOzellikleri(i, dizi.length, sablon.istenen === y, (j) => onSablon({ ...sablon, istenen: dizi[j] }))}
          disabled={kilitli}
          className={secimSinifi(sablon.istenen === y)}
          onClick={() => onSablon({ ...sablon, istenen: y })}
        >
          {y === 'tura' ? 'Tura' : 'Yazı'}
        </button>
      ))}
    </div>
  );
}

function ZarAyari({ sablon, onSablon, kilitli }: { sablon: Extract<Sablon, { tur: 'zar' }>; onSablon: (s: Sablon) => void; kilitli: boolean }) {
  const enAz = sablon.ikiZar ? 2 : 1;
  const enCok = sablon.ikiZar ? 12 : 6;
  const kosul = sablon.istenen;
  const ayarla = (istenen: ZarKosulu) => onSablon({ ...sablon, istenen });
  const degerli = kosul.tip === 'sayi' || kosul.tip === 'enAz' || kosul.tip === 'enFazla' ? kosul.deger : enCok;
  const zarTipiSec = (tip: ZarKosulu['tip']) => ayarla(tip === 'cift' || tip === 'tek' ? { tip } : { tip, deger: Math.min(enCok, Math.max(enAz, degerli)) });
  return (
    <>
      <label className="flex min-h-[44px] items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="h-6 w-6 accent-[#216a78]"
          checked={sablon.ikiZar}
          disabled={kilitli}
          onChange={(e) => {
            const ikiZar = e.target.checked;
            const yeniDeger = Math.min(ikiZar ? 12 : 6, Math.max(ikiZar ? 2 : 1, degerli));
            const yeniKosul: ZarKosulu = kosul.tip === 'cift' || kosul.tip === 'tek' ? kosul : { tip: kosul.tip, deger: yeniDeger };
            onSablon({ ...sablon, ikiZar, istenen: yeniKosul });
          }}
        />
        İki zar (toplam)
      </label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Koşul türü">
        {(
          [
            ['sayi', 'Belirli sayı'],
            ['cift', 'Çift'],
            ['tek', 'Tek'],
            ['enAz', '≥ (en az)'],
            ['enFazla', '≤ (en fazla)'],
          ] as const
        ).map(([tip, ad], i, dizi) => (
          <button
            key={tip}
            type="button"
            {...radyoOzellikleri(i, dizi.length, kosul.tip === tip, (j) => zarTipiSec(dizi[j][0]))}
            disabled={kilitli}
            className={secimSinifi(kosul.tip === tip)}
            onClick={() => zarTipiSec(tip)}
          >
            {ad}
          </button>
        ))}
      </div>
      {(kosul.tip === 'sayi' || kosul.tip === 'enAz' || kosul.tip === 'enFazla') && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          Sayı
          <select className={girisSinifi} value={kosul.deger} disabled={kilitli} onChange={(e) => ayarla({ tip: kosul.tip, deger: Number(e.target.value) })} aria-label="Sayı">
            {Array.from({ length: enCok - enAz + 1 }, (_, i) => enAz + i).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}

/** Çark ve torba satırlarının ızgaraları: dar panelde de tek satırda kalır (seçici esner, diğerleri sabit). */
const SATIR_IZGARASI_CARK = 'grid grid-cols-[1.5rem_minmax(0,1fr)_4.5rem] items-center gap-2';
const SATIR_IZGARASI_TORBA = 'grid grid-cols-[1.5rem_minmax(0,1fr)_4rem_2.75rem] items-center gap-2';
/** Sayaç satırı (çark dilim sayısı, Galton çivi satırı): etiket esner; − / sayı / + sabit genişlikte (kayma olmaz). */
const SATIR_IZGARASI_SAYAC = 'grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_2.75rem] items-center gap-2';
/** Kare 44 px sayaç düğmesi (− / +). */
const sayacDugmesi = `${secimSinifi(false)} w-11 px-0 text-lg leading-none`;

function RenkNoktasi({ renk }: { renk: string }) {
  return <span className="inline-block h-6 w-6 rounded-full border border-border" style={{ background: renk }} aria-hidden="true" />;
}

function RenkSecici({ deger, onChange, kilitli, etiket }: { deger: string; onChange: (r: { ad: string; renk: string }) => void; kilitli: boolean; etiket: string }) {
  return (
    <select className={`${girisSinifi} w-full min-w-0`} value={deger} disabled={kilitli} aria-label={etiket} onChange={(e) => onChange(RENK_SECENEKLERI.find((r) => r.ad === e.target.value) ?? RENK_SECENEKLERI[0])}>
      {RENK_SECENEKLERI.map((r) => (
        <option key={r.ad} value={r.ad}>
          {r.ad}
        </option>
      ))}
    </select>
  );
}

function CarkAyari({ sablon, onSablon, kilitli }: { sablon: Extract<Sablon, { tur: 'cark' }>; onSablon: (s: Sablon) => void; kilitli: boolean }) {
  const dilimGuncelle = (i: number, d: Partial<CarkDilimi>) => {
    const dilimler = sablon.dilimler.map((x, j) => (j === i ? { ...x, ...d } : x));
    onSablon({ ...sablon, dilimler });
  };
  const renkler = Array.from(new Set(sablon.dilimler.map((d) => d.ad)));
  return (
    <>
      {/* Sayaç satırı: etiket · − · sayı · + (sabit sütunlar; sayı değişince düğmeler kaymaz) */}
      <div className={SATIR_IZGARASI_SAYAC}>
        <span className="text-sm text-foreground" id="cark-dilim-etiketi">
          Dilim sayısı
        </span>
        <button
          type="button"
          className={sayacDugmesi}
          disabled={kilitli || sablon.dilimler.length <= CARK_EN_AZ_DILIM}
          onClick={() => onSablon({ ...sablon, dilimler: sablon.dilimler.slice(0, -1) })}
          aria-label="Dilim çıkar"
        >
          −
        </button>
        <output className="text-center text-lg font-bold tabular-nums text-foreground" aria-labelledby="cark-dilim-etiketi">
          {sablon.dilimler.length}
        </output>
        <button
          type="button"
          className={sayacDugmesi}
          disabled={kilitli || sablon.dilimler.length >= CARK_EN_COK_DILIM}
          onClick={() => onSablon({ ...sablon, dilimler: [...sablon.dilimler, { ...RENK_SECENEKLERI[sablon.dilimler.length % RENK_SECENEKLERI.length], genislik: 1 }] })}
          aria-label="Dilim ekle"
        >
          +
        </button>
      </div>
      {/* Satırlar tek sıra ızgara: renk noktası · renk seçici · genişlik; sütun başlıkları bir kez yazılır */}
      <div className={`${SATIR_IZGARASI_CARK} text-[13px] font-semibold text-muted-foreground`} aria-hidden="true">
        <span />
        <span>Renk</span>
        <span>Genişlik</span>
      </div>
      <ul className="flex flex-col gap-2">
        {sablon.dilimler.map((d, i) => (
          <li key={i} className={SATIR_IZGARASI_CARK}>
            <RenkNoktasi renk={d.renk} />
            <RenkSecici deger={d.ad} kilitli={kilitli} etiket={`${i + 1}. dilim rengi`} onChange={(r) => dilimGuncelle(i, r)} />
            <input
              type="number"
              min={1}
              max={CARK_EN_COK_GENISLIK}
              value={d.genislik}
              disabled={kilitli}
              className={`${girisSinifi} w-full px-2 text-center`}
              aria-label={`${i + 1}. dilim genişliği`}
              onChange={(e) => {
                const v = Math.trunc(Number(e.target.value));
                dilimGuncelle(i, { genislik: Number.isFinite(v) ? Math.min(CARK_EN_COK_GENISLIK, Math.max(1, v)) : 1 });
              }}
            />
          </li>
        ))}
      </ul>
      <label className="flex items-center gap-2 text-sm text-foreground">
        İstenen renk
        <select className={girisSinifi} value={sablon.istenenRenk} disabled={kilitli} onChange={(e) => onSablon({ ...sablon, istenenRenk: e.target.value })} aria-label="İstenen renk">
          {renkler.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function TorbaAyari({ sablon, onSablon, kilitli }: { sablon: Extract<Sablon, { tur: 'torba' }>; onSablon: (s: Sablon) => void; kilitli: boolean }) {
  const bilyeGuncelle = (i: number, b: Partial<TorbaBilyesi>) => onSablon({ ...sablon, bilyeler: sablon.bilyeler.map((x, j) => (j === i ? { ...x, ...b } : x)) });
  return (
    <>
      {/* Satırlar tek sıra ızgara: renk noktası · renk seçici · adet · çıkar; sütun başlıkları bir kez yazılır */}
      <div className={`${SATIR_IZGARASI_TORBA} text-[13px] font-semibold text-muted-foreground`} aria-hidden="true">
        <span />
        <span>Renk</span>
        <span>Adet</span>
        <span />
      </div>
      <ul className="flex flex-col gap-2">
        {sablon.bilyeler.map((b, i) => (
          <li key={i} className={SATIR_IZGARASI_TORBA}>
            <RenkNoktasi renk={b.renk} />
            <RenkSecici deger={b.ad} kilitli={kilitli} etiket={`${i + 1}. bilye rengi`} onChange={(r) => bilyeGuncelle(i, r)} />
            <input
              type="number"
              min={0}
              max={TORBA_EN_COK_ADET}
              value={b.adet}
              disabled={kilitli}
              className={`${girisSinifi} w-full px-2 text-center`}
              aria-label={`${b.ad} bilye adedi`}
              onChange={(e) => {
                const v = Math.trunc(Number(e.target.value));
                bilyeGuncelle(i, { adet: Number.isFinite(v) ? Math.min(TORBA_EN_COK_ADET, Math.max(0, v)) : 0 });
              }}
            />
            <button
              type="button"
              className={`${secimSinifi(false)} w-11 px-0`}
              disabled={kilitli || sablon.bilyeler.length <= 1}
              onClick={() => onSablon({ ...sablon, bilyeler: sablon.bilyeler.filter((_, j) => j !== i) })}
              aria-label={`${b.ad} bilyeyi çıkar`}
              title="Bu rengi çıkar"
            >
              −
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={secimSinifi(false)}
        disabled={kilitli || sablon.bilyeler.length >= RENK_SECENEKLERI.length}
        onClick={() => {
          const kullanilan = new Set(sablon.bilyeler.map((b) => b.ad));
          const yeni = RENK_SECENEKLERI.find((r) => !kullanilan.has(r.ad)) ?? RENK_SECENEKLERI[0];
          onSablon({ ...sablon, bilyeler: [...sablon.bilyeler, { ...yeni, adet: 1 }] });
        }}
      >
        + Renk ekle
      </button>
      <label className="flex min-h-[44px] items-center gap-2 text-sm text-foreground">
        <input type="checkbox" className="h-6 w-6 accent-[#216a78]" checked={!sablon.iadeli} disabled={kilitli} onChange={(e) => onSablon({ ...sablon, iadeli: !e.target.checked })} />
        İadesiz çekiliş (torba boşalınca yenilenir)
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground">
        İstenen renk
        <select className={girisSinifi} value={sablon.istenenRenk} disabled={kilitli} onChange={(e) => onSablon({ ...sablon, istenenRenk: e.target.value })} aria-label="İstenen renk">
          {sablon.bilyeler.map((b) => (
            <option key={b.ad} value={b.ad}>
              {b.ad}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function KartAyari({ sablon, onSablon, kilitli }: { sablon: Extract<Sablon, { tur: 'kart' }>; onSablon: (s: Sablon) => void; kilitli: boolean }) {
  const k = sablon.istenen;
  const ayarla = (istenen: KartKosulu) => onSablon({ ...sablon, istenen });
  return (
    <>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Koşul türü">
        <button type="button" role="radio" aria-checked={k.tip === 'renk'} disabled={kilitli} className={secimSinifi(k.tip === 'renk')} onClick={() => ayarla({ tip: 'renk', deger: 'kirmizi' })}>
          Renk
        </button>
        <button type="button" role="radio" aria-checked={k.tip === 'tur'} disabled={kilitli} className={secimSinifi(k.tip === 'tur')} onClick={() => ayarla({ tip: 'tur', deger: 'kupa' })}>
          Tür
        </button>
        <button type="button" role="radio" aria-checked={k.tip === 'deger'} disabled={kilitli} className={secimSinifi(k.tip === 'deger')} onClick={() => ayarla({ tip: 'deger', deger: 'A' })}>
          Sayı / As
        </button>
      </div>
      {k.tip === 'renk' && (
        <div className="flex gap-2">
          {(['kirmizi', 'siyah'] as const).map((r) => (
            <button key={r} type="button" disabled={kilitli} className={secimSinifi(k.deger === r)} onClick={() => ayarla({ tip: 'renk', deger: r })}>
              {r === 'kirmizi' ? 'Kırmızı' : 'Siyah'}
            </button>
          ))}
        </div>
      )}
      {k.tip === 'tur' && (
        <div className="flex flex-wrap gap-2">
          {KART_TURLERI.map((t) => (
            <button key={t} type="button" disabled={kilitli} className={secimSinifi(k.deger === t)} onClick={() => ayarla({ tip: 'tur', deger: t })}>
              {KART_TURU_ADI[t]} {KART_TURU_SEMBOLU[t]}
            </button>
          ))}
        </div>
      )}
      {k.tip === 'deger' && (
        <select className={girisSinifi} value={k.deger} disabled={kilitli} aria-label="Kart değeri" onChange={(e) => ayarla({ tip: 'deger', deger: e.target.value as (typeof KART_DEGERLERI)[number] })}>
          {KART_DEGERLERI.map((d) => (
            <option key={d} value={d}>
              {d === 'A' ? 'As' : d}
            </option>
          ))}
        </select>
      )}
    </>
  );
}

function GaltonAyari({ sablon, onSablon, kilitli }: { sablon: Extract<Sablon, { tur: 'galton' }>; onSablon: (s: Sablon) => void; kilitli: boolean }) {
  const n = sablon.satir;
  const k = sablon.istenen;
  const secilenKutu = k.tip === 'orta' ? Math.floor(n / 2) : k.kutu;
  const satirAyarla = (yeni: number) => {
    const m = Math.min(GALTON_EN_COK_SATIR, Math.max(GALTON_EN_AZ_SATIR, yeni));
    // Kutu seçimi yeni tahtada da geçerli kalsın
    const istenen: GaltonKosulu = k.tip === 'orta' ? k : { tip: k.tip, kutu: Math.min(k.kutu, m) };
    onSablon({ ...sablon, satir: m, istenen });
  };
  const kosulTipiSec = (tip: GaltonKosulu['tip']) => onSablon({ ...sablon, istenen: tip === 'orta' ? { tip } : { tip, kutu: Math.min(n, Math.max(0, secilenKutu)) } });
  const pascal = pascalSatiri(n);
  const [pascalRef, pascalGenislik] = useKapGenisligi<HTMLDivElement>(260);
  const sutun = pascalSutunSayisi(pascal, pascalGenislik);
  return (
    <>
      <div className={SATIR_IZGARASI_SAYAC}>
        <span className="text-sm text-foreground" id="galton-satir-etiketi">
          Çivi satırı
        </span>
        <button type="button" className={sayacDugmesi} disabled={kilitli || n <= GALTON_EN_AZ_SATIR} onClick={() => satirAyarla(n - 1)} aria-label="Çivi satırını azalt">
          −
        </button>
        <output className="text-center text-lg font-bold tabular-nums text-foreground" aria-labelledby="galton-satir-etiketi" aria-live="polite" data-galton-satir>
          {n}
        </output>
        <button type="button" className={sayacDugmesi} disabled={kilitli || n >= GALTON_EN_COK_SATIR} onClick={() => satirAyarla(n + 1)} aria-label="Çivi satırını artır">
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Koşul türü">
        {(
          [
            ['orta', 'Ortadaki kutu'],
            ['kutu', 'Belirli kutu'],
            ['enAz', 'En az'],
            ['enFazla', 'En fazla'],
          ] as const
        ).map(([tip, ad], i, dizi) => (
          <button
            key={tip}
            type="button"
            {...radyoOzellikleri(i, dizi.length, k.tip === tip, (j) => kosulTipiSec(dizi[j][0]))}
            disabled={kilitli}
            className={secimSinifi(k.tip === tip)}
            onClick={() => kosulTipiSec(tip)}
          >
            {ad}
          </button>
        ))}
      </div>
      {k.tip !== 'orta' && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          {k.tip === 'enAz' ? 'En az' : k.tip === 'enFazla' ? 'En fazla' : 'Kutu'}
          <select className={girisSinifi} value={k.kutu} disabled={kilitli} aria-label="Kutu numarası" onChange={(e) => onSablon({ ...sablon, istenen: { tip: k.tip, kutu: Number(e.target.value) } })}>
            {Array.from({ length: n + 1 }, (_, i) => (
              <option key={i} value={i}>
                {i + 1}. kutu
              </option>
            ))}
          </select>
        </label>
      )}
      {/* Pascal üçgeni satırı: her kutuya inen yol sayısı C(n,k), kutu sırasıyla. Sığdığı sürece tek sıra;
          sığmazsa (dar panel, çok kutu) değerler sırayı bozmadan iki satıra bölünür (1–6, 7–11). */}
      <div className="rounded-[calc(var(--radius)-4px)] border border-border bg-muted/40 px-1.5 py-2" data-pascal>
        <p className="px-0.5 text-[13px] font-semibold text-muted-foreground">Pascal üçgeni · kutuya inen yol sayısı</p>
        <div ref={pascalRef} className="mt-1.5 grid gap-x-[2px] gap-y-1.5" style={{ gridTemplateColumns: `repeat(${sutun}, minmax(0, 1fr))` }} data-pascal-sutun={sutun}>
          {pascal.map((c, i) => {
            const istenen = galtonKosuluSaglar(k, n, i);
            return (
              <div key={i} className="flex min-w-0 flex-col items-center" title={`${i + 1}. kutu: C(${n},${i}) = ${c} yol`}>
                <span className="text-[13px] leading-5 text-muted-foreground tabular-nums">{i + 1}</span>
                <span className={`w-full rounded-[4px] py-1 text-center text-[13px] font-bold leading-5 tabular-nums tracking-tight ${istenen ? 'bg-[#216a78] text-white' : 'bg-card text-foreground'}`}>
                  {c}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 px-0.5 text-[13px] text-muted-foreground">
          Toplam {ussuMetni(2, n)} = {2 ** n} yol · istenen kutular koyu
        </p>
      </div>
    </>
  );
}

/**
 * Pascal satırının sütun sayısı: her hücreye en uzun değerin rakam sayısına göre yer ayrılır
 * (13 px kalın tablo rakamı ≈ 8 px). Tek sıraya sığıyorsa n+1, sığmıyorsa iki sıraya sırayla bölünür.
 */
function pascalSutunSayisi(pascal: readonly number[], genislik: number): number {
  const adet = pascal.length;
  const basamak = Math.max(1, ...pascal.map((c) => String(c).length));
  const gerekli = basamak * 8 + 4;
  const hucre = (genislik - (adet - 1) * 2) / adet;
  return hucre >= gerekli ? adet : Math.ceil(adet / 2);
}
