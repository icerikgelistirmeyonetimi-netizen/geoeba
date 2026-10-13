'use client';

/**
 * Olasılık Laboratuvarı — ilkokul kademesi «olay kartları» görünümü (TYMM MAT.4.4.1).
 *
 * Kademe menüsünde İlkokul seçiliyken laboratuvar bu görünümle açılır: her kartta bir olay (torba ya da çark
 * deneyi), öğrenci önce "İmkânsız / Olabilir / Kesin" der, sonra laboratuvarın 3B deney alanında (DeneyAlani)
 * bilye çekerek ya da çarkı çevirerek kararını sınar; birkaç denemeden sonra nitel dönüt gelir. Sayı, kesir,
 * yüzde, öznel/teorik/deneysel paneller, frekans tablosu ve sayı küpü yoktur. Mantık: olayKartlari.ts.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeneyAlani, type DeneyAlaniTutamaci } from './DeneyAlani';
import { SablonSimgesi } from './SablonSimgesi';
import { sekmeKimlikleri, sekmeOkTusu } from '../sekmeler';
import { useKapGenisligi } from './useKapGenisligi';
import { useAzHareket, useKoyuTema } from './kancalar';
import { mulberry32, rastgeleTohum, tekDeneme, topluDeneme, type RastgeleUretec } from './simulasyon';
import type { Sonuc } from './olasilik';
import {
  BOS_KART_DURUMU,
  COK_KEZ,
  OLAY_KARTLARI,
  OLAY_SINIFI_ADLARI,
  OLAY_SINIFI_IPUCLARI,
  OLAY_SINIFLARI,
  deneyAcikMi,
  donut,
  sonuclariIsle,
  tahminEt,
  yonlendirme,
  type KartDurumu,
  type KartSablonu,
  type OlaySinifi,
} from './olayKartlari';

const dugmeSinifi =
  'min-h-[44px] min-w-[44px] rounded-[calc(var(--radius)-4px)] px-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Yönerge adımları (deney alanının altında) */
const ADIMLAR = ['Olayı oku, karar ver', 'Deneyle sına', 'Sonuca bak'] as const;

function Baslik({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

/** Renk adlarının Türkçe dizilişi: "mavi", "kırmızı ve mavi" */
function renkListesi(adlar: readonly string[]): string {
  const k = Array.from(new Set(adlar)).map((a) => a.toLocaleLowerCase('tr-TR'));
  return k.length <= 1 ? (k[0] ?? '') : `${k.slice(0, -1).join(', ')} ve ${k[k.length - 1]}`;
}

/** Torbanın içi / çarkın dilimleri: sayı yazmadan, nesnelerle */
function Icerik({ sablon }: { sablon: KartSablonu }) {
  if (sablon.tur === 'torba') {
    const bilyeler = sablon.bilyeler.flatMap((b) => Array.from({ length: b.adet }, () => b));
    const tek = new Set(sablon.bilyeler.map((b) => b.ad)).size === 1;
    const etiket = `Torbada ${tek ? 'yalnız ' : ''}${renkListesi(sablon.bilyeler.map((b) => b.ad))} bilyeler var`;
    return (
      <div className="mt-3" data-olay-icerik="torba">
        <p className="text-[13px] font-semibold text-muted-foreground">Torbanın içi</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={etiket}>
          {bilyeler.map((b, i) => (
            <li key={i} className="inline-block h-7 w-7 rounded-full border-2 border-card shadow-[inset_-3px_-4px_6px_rgba(0,0,0,0.22)] ring-1 ring-border" style={{ background: b.renk }} title={b.ad}>
              <span className="sr-only">{b.ad}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const tek = new Set(sablon.dilimler.map((d) => d.ad)).size === 1;
  const etiket = `Çarkta ${tek ? 'yalnız ' : ''}${renkListesi(sablon.dilimler.map((d) => d.ad))} dilimler var`;
  return (
    <div className="mt-3" data-olay-icerik="cark">
      <p className="text-[13px] font-semibold text-muted-foreground">Çarkın dilimleri</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={etiket}>
        {sablon.dilimler.map((d, i) => (
          <li key={i} className="inline-block h-7 w-9 rounded-md ring-1 ring-border" style={{ background: d.renk }} title={d.ad}>
            <span className="sr-only">{d.ad}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function sonucRengi(sablon: KartSablonu, s: Sonuc): { ad: string; renk: string } | null {
  if (sablon.tur === 'torba' && s.tur === 'torba') return sablon.bilyeler.find((b) => b.ad === s.renk) ?? null;
  if (sablon.tur === 'cark' && s.tur === 'cark') return sablon.dilimler[s.dilim] ?? null;
  return null;
}

export interface OlayKartlariGorunumuProps {
  pencereGenisligi?: number;
  pencereYuksekligi?: number;
}

export function OlayKartlariGorunumu(_props: OlayKartlariGorunumuProps) {
  const [aktif, setAktif] = useState(0);
  const [durumlar, setDurumlar] = useState<KartDurumu[]>(() => OLAY_KARTLARI.map(() => BOS_KART_DURUMU));
  const [animasyonda, setAnimasyonda] = useState(false);
  const [toplu, setToplu] = useState(false);
  const [sonSonuc, setSonSonuc] = useState<Sonuc | null>(null);
  const [gizli, setGizli] = useState(false);
  const koyu = useKoyuTema();
  const azHareket = useAzHareket();
  const [kokRef, genislik] = useKapGenisligi<HTMLDivElement>(1000);
  const deneyAlani = useRef<DeneyAlaniTutamaci>(null);
  const uretec = useRef<RastgeleUretec | null>(null);
  const bekleyen = useRef<{ kart: number; sonuclar: Sonuc[] } | null>(null);
  if (!uretec.current) uretec.current = mulberry32(rastgeleTohum());

  const kart = OLAY_KARTLARI[aktif];
  const d = durumlar[aktif];
  const dn = donut(kart, d);
  const torba = kart.sablon.tur === 'torba';

  // Pencere küçültülünce kap 0 boyutlu olur: sahne döngüsü durur
  useEffect(() => {
    const el = kokRef.current;
    if (!el) return;
    const olc = () => setGizli(el.clientWidth === 0 || el.clientHeight === 0);
    olc();
    const ro = new ResizeObserver(olc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [kokRef]);

  const kartSec = useCallback(
    (i: number) => {
      if (animasyonda || i === aktif || i < 0 || i >= OLAY_KARTLARI.length) return;
      setAktif(i);
      // Sahnede yalnız o kartın son sonucu görünür (başka kartın bilyesi kalmasın)
      const son = durumlar[i].son;
      setSonSonuc(son[son.length - 1] ?? null);
    },
    [animasyonda, aktif, durumlar]
  );

  const sinifSec = useCallback(
    (s: OlaySinifi) => {
      if (animasyonda) return;
      setDurumlar((ds) => ds.map((x, i) => (i === aktif ? tahminEt(x, s) : x)));
    },
    [animasyonda, aktif]
  );

  const dene = useCallback(
    (kez: number) => {
      const u = uretec.current;
      if (animasyonda || !deneyAcikMi(d) || !u) return;
      const sonuclar = kez <= 1 ? [tekDeneme(kart.sablon, u)].filter((s): s is Sonuc => s !== null) : topluDeneme(kart.sablon, kez, u);
      if (!sonuclar.length) return;
      const son = sonuclar[sonuclar.length - 1];
      bekleyen.current = { kart: aktif, sonuclar };
      setAnimasyonda(true);
      setToplu(kez > 1);
      setSonSonuc(son);
      deneyAlani.current?.oynat(son, kez > 1);
    },
    [animasyonda, d, kart, aktif]
  );

  const animasyonBitti = useCallback(() => {
    const b = bekleyen.current;
    bekleyen.current = null;
    if (b) setDurumlar((ds) => ds.map((x, i) => (i === b.kart ? sonuclariIsle(x, OLAY_KARTLARI[i].sablon, b.sonuclar) : x)));
    setAnimasyonda(false);
    setToplu(false);
  }, []);

  const kartiSifirla = useCallback(() => {
    if (animasyonda) return;
    setDurumlar((ds) => ds.map((x, i) => (i === aktif ? BOS_KART_DURUMU : x)));
    setSonSonuc(null);
  }, [animasyonda, aktif]);

  const orta = genislik >= 820;
  const kilitli = d.deneme > 0;
  const tamamlandi = (i: number) => donut(OLAY_KARTLARI[i], durumlar[i]) !== null;
  // Dönütten sonra: sıradaki kart; son karttaysa bitmemiş ilk kart; hepsi bittiyse null
  const siradaki = aktif < OLAY_KARTLARI.length - 1 ? aktif + 1 : ((i) => (i < 0 ? null : i))(OLAY_KARTLARI.findIndex((_, i) => i !== aktif && !tamamlandi(i)));
  const adim = d.tahmin === null ? 0 : dn ? 2 : 1;

  const kartPaneli = (
    <section className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]" aria-label="Olay kartı" data-olay-karti={kart.id}>
      <Baslik>Olay</Baslik>
      <p className="mt-2 text-xl font-bold leading-snug text-foreground" data-olay-cumlesi>
        {kart.olay}
      </p>
      <Icerik sablon={kart.sablon} />

      <div className="mt-4">
        <Baslik>Bu olay sence nasıl?</Baslik>
        <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Olayın sınıfı">
          {OLAY_SINIFLARI.map((s, i) => {
            const secili = d.tahmin === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={secili}
                tabIndex={secili || (d.tahmin === null && i === 0) ? 0 : -1}
                disabled={kilitli && !secili}
                aria-disabled={animasyonda || (kilitli && secili) || undefined}
                onClick={() => sinifSec(s)}
                onKeyDown={(e) => {
                  const j = sekmeOkTusu(e.key, i, OLAY_SINIFLARI.length);
                  if (j === null || kilitli) return;
                  e.preventDefault();
                  sinifSec(OLAY_SINIFLARI[j]);
                  (e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]')[j])?.focus();
                }}
                className={`flex min-h-[64px] flex-col items-center justify-center rounded-[calc(var(--radius)-4px)] border-2 px-2 py-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45 ${
                  secili ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
                data-olay-sinifi={s}
              >
                <span className="text-base font-bold">{OLAY_SINIFI_ADLARI[s]}</span>
                <span className={`mt-0.5 text-[13px] leading-tight ${secili ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>{OLAY_SINIFI_IPUCLARI[s]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <Baslik>Deneyle sına</Baslik>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Deney">
          <button type="button" onClick={() => dene(1)} disabled={!deneyAcikMi(d)} aria-disabled={animasyonda || undefined} className={`${dugmeSinifi} bg-ada-fener text-ada-murekkep hover:opacity-90`} data-olay-dene="bir">
            {torba ? 'Bir bilye çek' : 'Çarkı çevir'}
          </button>
          <button type="button" onClick={() => dene(COK_KEZ)} disabled={!deneyAcikMi(d)} aria-disabled={animasyonda || undefined} className={`${dugmeSinifi} bg-secondary text-secondary-foreground hover:bg-muted`} data-olay-dene="cok">
            {torba ? 'Çok kez çek' : 'Çok kez çevir'}
          </button>
          {d.tahmin !== null && (
            <button type="button" onClick={kartiSifirla} aria-disabled={animasyonda || undefined} className={`${dugmeSinifi} border border-border bg-card text-foreground hover:bg-muted`} data-olay-sifirla>
              Baştan başla
            </button>
          )}
        </div>
        {torba && <p className="mt-1.5 text-[13px] text-muted-foreground">Her çekilişten sonra bilye torbaya geri konur.</p>}
        {d.son.length > 0 && (
          <div className="mt-3">
            <p className="text-[13px] font-semibold text-muted-foreground">{torba ? 'Çekilen bilyeler' : 'Okun durduğu renkler'}</p>
            <ol className="mt-1.5 flex flex-wrap gap-1" aria-label={torba ? 'Çekilen bilyeler, en yeni sonda' : 'Okun durduğu renkler, en yeni sonda'} data-olay-serit>
              {d.son.map((s, i) => {
                const r = sonucRengi(kart.sablon, s);
                return (
                  <li key={i} className={`inline-block h-5 w-5 ring-1 ring-border ${torba ? 'rounded-full' : 'rounded-[4px]'}`} style={{ background: r?.renk ?? '#999' }} title={r?.ad}>
                    <span className="sr-only">{r?.ad}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      <div className="mt-4" role="status" aria-live="polite" data-olay-donut={dn ? (dn.dogru ? 'dogru' : 'yanlis') : 'yok'}>
        {dn ? (
          <div className="rounded-[calc(var(--radius)-4px)] border-2 p-3" style={{ borderColor: dn.dogru ? '#2a9d94' : '#b9884a', background: dn.dogru ? 'rgba(42,157,148,0.10)' : 'rgba(185,136,74,0.12)' }}>
            <p className="text-sm text-foreground">
              <span className="font-semibold">Deneyde: </span>
              {dn.gozlem}
            </p>
            <p className="mt-1.5 text-base font-bold text-foreground">{dn.karar}</p>
            <p className="mt-1 text-sm text-foreground">{dn.gerekce}</p>
            {dn.ek && <p className="mt-1 text-sm text-muted-foreground">{dn.ek}</p>}
            {siradaki !== null ? (
              <button type="button" onClick={() => kartSec(siradaki)} aria-disabled={animasyonda || undefined} className={`${dugmeSinifi} mt-3 bg-primary text-primary-foreground hover:opacity-90`} data-olay-sonraki>
                {siradaki === aktif + 1 ? 'Sonraki karta geç' : 'Bitmemiş karta geç'}
              </button>
            ) : (
              <p className="mt-3 text-sm font-bold text-foreground" data-olay-bitti>
                Bütün olay kartlarını bitirdin!
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{yonlendirme(kart, d)}</p>
        )}
      </div>
    </section>
  );

  return (
    <div ref={kokRef} className="flex h-full w-full flex-col bg-background text-foreground" data-uygulama="olasilik" data-olasilik-kip="olay-kartlari">
      {/* Üst şerit: başlık + kart sekmeleri (simge: torba / çark; tamamlanan kartta işaret) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <h2 className="mr-2 text-base font-bold text-foreground">Olay kartları</h2>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Olay kartları">
          {OLAY_KARTLARI.map((k, i) => {
            const secili = i === aktif;
            const tamam = tamamlandi(i);
            return (
              <button
                key={k.id}
                id={sekmeKimlikleri('olay-karti', k.id).sekme}
                type="button"
                role="tab"
                aria-selected={secili}
                aria-controls={sekmeKimlikleri('olay-karti', k.id).panel}
                aria-label={`${k.olay}${tamam ? ', tamamlandı' : ''}`}
                tabIndex={secili ? 0 : -1}
                disabled={animasyonda}
                onClick={() => kartSec(i)}
                onKeyDown={(e) => {
                  const j = sekmeOkTusu(e.key, i, OLAY_KARTLARI.length);
                  if (j === null) return;
                  e.preventDefault();
                  kartSec(j);
                  document.getElementById(sekmeKimlikleri('olay-karti', OLAY_KARTLARI[j].id).sekme)?.focus();
                }}
                className={`${dugmeSinifi} relative inline-flex items-center justify-center px-2.5 ${secili ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-muted'}`}
                data-olay-sekme={k.id}
              >
                <SablonSimgesi tur={k.sablon.tur} className="h-6 w-6 shrink-0" />
                {tamam && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2a9d94] text-[11px] font-bold leading-none text-white" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={() => kartSec(aktif - 1)} disabled={aktif === 0 || animasyonda} className={`${dugmeSinifi} border border-border bg-card text-foreground hover:bg-muted`} data-olay-onceki>
            Önceki kart
          </button>
          <button type="button" onClick={() => kartSec(aktif + 1)} disabled={aktif === OLAY_KARTLARI.length - 1 || animasyonda} className={`${dugmeSinifi} border border-border bg-card text-foreground hover:bg-muted`}>
            Sonraki kart
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3" role="tabpanel" id={sekmeKimlikleri('olay-karti', kart.id).panel} aria-labelledby={sekmeKimlikleri('olay-karti', kart.id).sekme}>
        <div className="grid gap-3" style={{ gridTemplateColumns: orta ? 'minmax(300px, 400px) minmax(0, 1fr)' : 'minmax(0, 1fr)' }}>
          <div className="min-w-0">{kartPaneli}</div>
          <div className="min-w-0">
            <DeneyAlani
              ref={deneyAlani}
              sablon={kart.sablon}
              koyu={koyu}
              azHareket={azHareket}
              gizli={gizli}
              onBitti={animasyonBitti}
              sonSonuc={sonSonuc}
              animasyonda={animasyonda}
              toplu={toplu}
            />
            {/* Kısa yönerge: üç adım, bulunulan adım vurgulu */}
            <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm" aria-label="Adımlar" data-olay-adimlar>
              {ADIMLAR.map((a, i) => (
                <li key={a} className="inline-flex items-center gap-2" aria-current={i === adim ? 'step' : undefined}>
                  {i > 0 && (
                    <span className="text-muted-foreground" aria-hidden="true">
                      →
                    </span>
                  )}
                  <span className={`rounded-full px-3 py-1 font-semibold ${i === adim ? 'bg-primary text-primary-foreground' : i < adim ? 'bg-muted text-foreground' : 'border border-border text-muted-foreground'}`}>{a}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
