'use client';

/**
 * Olasılık Laboratuvarı — masaüstü uygulaması (Üretim / olasilik).
 *
 * Rastgele olay şablonları (para, zar, çark, torba, kart), üç olasılık paneli (öznel / teorik /
 * deneysel), 3B deney alanı, sonuç tablosu, karşılaştırma ve yakınsama grafikleri. Durum
 * localStorage'da ('geoeba_olasilik_v1'); mantık durum.ts / olasilik.ts / simulasyon.ts'te.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeneyAlani, type DeneyAlaniTutamaci } from './DeneyAlani';
import { sekmeKimlikleri, sekmeOkTusu } from '../sekmeler';
import { KarsilastirmaGrafigi } from './KarsilastirmaGrafigi';
import { OlayPaneli } from './OlayPaneli';
import { SablonSimgesi } from './SablonSimgesi';
import { SonucTablosu } from './SonucTablosu';
import { YakinsamaGrafigi } from './YakinsamaGrafigi';
import {
  DEPO_ANAHTARI,
  SABLON_ADLARI,
  GORUNEN_SABLON_TURLERI,
  aktifSablon,
  deneyselOran,
  durumuCoz,
  durumuSerilestir,
  logOlcekDegistir,
  ornekDurum,
  oznelAyarla,
  oznelKilidiDegistir,
  sablonTuruSec,
  sablonuGuncelle,
  sifirla,
  sonuclariEkle,
  type LabDurumu,
} from './durum';
import { sablonGecerli, teorikOlasilik, type Sablon, type SablonTuru, type Sonuc } from './olasilik';
import { YakinsamaBirikeci, mulberry32, rastgeleTohum, tekDeneme, topluDeneme, type DeneyDurumu, type RastgeleUretec } from './simulasyon';
import { useKapGenisligi } from './useKapGenisligi';

export { manifest } from './manifest';

const TOPLU_SAYILAR = [10, 100, 1000, 10000] as const;
/** Bir karede işlenen deneme sayısı (10 000 → ~20 kare; arayüz donmaz) */
const PARCA_BOYU = 500;

function ilkDurum(): LabDurumu {
  if (typeof window === 'undefined') return ornekDurum();
  try {
    return durumuCoz(window.localStorage.getItem(DEPO_ANAHTARI)) ?? ornekDurum();
  } catch {
    return ornekDurum();
  }
}

function useKoyuTema(): boolean {
  const [koyu, setKoyu] = useState(false);
  useEffect(() => {
    const kok = document.documentElement;
    const guncelle = () => setKoyu(kok.classList.contains('dark'));
    guncelle();
    const mo = new MutationObserver(guncelle);
    mo.observe(kok, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);
  return koyu;
}

function useAzHareket(): boolean {
  const [az, setAz] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const guncelle = () => setAz(mq.matches);
    guncelle();
    mq.addEventListener('change', guncelle);
    return () => mq.removeEventListener('change', guncelle);
  }, []);
  return az;
}

interface Is {
  kalan: number;
  dd: DeneyDurumu;
  son: Sonuc | null;
}

export default function OlasilikUygulamasi(_props: { pencereGenisligi?: number; pencereYuksekligi?: number }) {
  const [durum, setDurum] = useState<LabDurumu>(ilkDurum);
  const [animasyonda, setAnimasyonda] = useState(false);
  /** Toplu deneme sürüyor (sayım akar; tıklama ile atlanacak bir animasyon yok) */
  const [toplu, setToplu] = useState(false);
  const [sonSonuc, setSonSonuc] = useState<Sonuc | null>(() => (durum.son[0] as Sonuc | undefined) ?? null);
  const koyu = useKoyuTema();
  const azHareket = useAzHareket();
  const [kokRef, genislik] = useKapGenisligi<HTMLDivElement>(1000);
  const deneyAlani = useRef<DeneyAlaniTutamaci>(null);
  const uretec = useRef<RastgeleUretec | null>(null);
  const bekleyen = useRef<{ ekle: boolean } | null>(null);
  const is = useRef<Is | null>(null);
  const kare = useRef<number | null>(null);
  const [gizli, setGizli] = useState(false);

  if (!uretec.current) uretec.current = mulberry32(rastgeleTohum());

  const sablon = aktifSablon(durum);
  const teorik = useMemo(() => teorikOlasilik(sablon), [sablon]);
  const gecerli = sablonGecerli(sablon) && teorik.tum > 0;
  const seri = useMemo(() => new YakinsamaBirikeci({ n: durum.deneme, basari: durum.gerceklesen, noktalar: durum.yakinsama }).seri(), [durum.deneme, durum.gerceklesen, durum.yakinsama]);

  // Kalıcılık
  useEffect(() => {
    try {
      window.localStorage.setItem(DEPO_ANAHTARI, durumuSerilestir(durum));
    } catch {
      /* depolama kapalı olabilir */
    }
  }, [durum]);

  // Pencere/kap görünürlüğü (küçültülünce kap 0 boyutlu ya da display:none olur)
  useEffect(() => {
    const el = kokRef.current;
    if (!el) return;
    const olc = () => setGizli(el.clientWidth === 0 || el.clientHeight === 0);
    olc();
    const ro = new ResizeObserver(olc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [kokRef]);

  useEffect(
    () => () => {
      if (kare.current) cancelAnimationFrame(kare.current);
    },
    []
  );

  const ddKopya = useCallback((): DeneyDurumu => ({ torbaKalan: durum.deneyDurumu.torbaKalan?.slice() }), [durum.deneyDurumu]);

  const birKezDene = useCallback(() => {
    if (animasyonda || !gecerli || !uretec.current) return;
    const dd = ddKopya();
    const sonuc = tekDeneme(sablon, uretec.current, dd);
    if (!sonuc) return;
    setAnimasyonda(true);
    setSonSonuc(sonuc);
    bekleyen.current = { ekle: true };
    is.current = { kalan: 0, dd, son: sonuc };
    deneyAlani.current?.oynat(sonuc, false);
  }, [animasyonda, gecerli, sablon, ddKopya]);

  const topluDene = useCallback(
    (n: number) => {
      if (animasyonda || !gecerli || !uretec.current) return;
      setAnimasyonda(true);
      setToplu(true);
      const dd = ddKopya();
      is.current = { kalan: n, dd, son: null };
      // Galton: sayım akarken sahnede birkaç süs bilyesi yağar (salt görsel)
      deneyAlani.current?.yagmur(true);
      const adim = () => {
        const i = is.current;
        const u = uretec.current;
        if (!i || !u) return;
        const parca = Math.min(PARCA_BOYU, i.kalan);
        const sonuclar = topluDeneme(sablon, parca, u, i.dd);
        if (sonuclar.length) {
          i.son = sonuclar[sonuclar.length - 1];
          setDurum((d) => ({ ...sonuclariEkle(d, sonuclar), deneyDurumu: { torbaKalan: i.dd.torbaKalan?.slice() } }));
        }
        i.kalan -= parca;
        if (i.kalan > 0 && sonuclar.length === parca) {
          kare.current = requestAnimationFrame(adim);
          return;
        }
        // Bitti: son sonuç kısa bir yerleşmeyle gösterilir
        deneyAlani.current?.yagmur(false);
        setToplu(false);
        if (i.son) {
          setSonSonuc(i.son);
          bekleyen.current = { ekle: false };
          deneyAlani.current?.oynat(i.son, true);
        } else {
          setAnimasyonda(false);
        }
      };
      kare.current = requestAnimationFrame(adim);
    },
    [animasyonda, gecerli, sablon, ddKopya]
  );

  const animasyonBitti = useCallback((sonuc: Sonuc) => {
    const b = bekleyen.current;
    bekleyen.current = null;
    const i = is.current;
    if (b?.ekle) setDurum((d) => ({ ...sonuclariEkle(d, [sonuc]), deneyDurumu: i ? { torbaKalan: i.dd.torbaKalan?.slice() } : d.deneyDurumu }));
    is.current = null;
    setToplu(false);
    setAnimasyonda(false);
  }, []);

  const sifirlaTikla = useCallback(() => {
    if (animasyonda) return;
    setDurum((d) => sifirla(d));
    setSonSonuc(null);
  }, [animasyonda]);

  const sablonSec = useCallback(
    (tur: SablonTuru) => {
      if (animasyonda) return;
      setDurum((d) => sablonTuruSec(d, tur));
      setSonSonuc(null);
    },
    [animasyonda]
  );

  const sablonGuncelleTikla = useCallback(
    (s: Sablon) => {
      if (animasyonda) return;
      setDurum((d) => sablonuGuncelle(d, s));
      setSonSonuc(null);
    },
    [animasyonda]
  );

  const genis = genislik >= 1180;
  const orta = genislik >= 820;
  const grafikler = (
    <>
      <KarsilastirmaGrafigi oznel={durum.oznel / 100} deneysel={deneyselOran(durum)} teorik={teorik.deger} deneme={durum.deneme} />
      <YakinsamaGrafigi seri={seri} teorik={teorik.deger} oznel={durum.oznel / 100} logOlcek={durum.logOlcek} onLogOlcek={() => setDurum((d) => logOlcekDegistir(d))} />
    </>
  );
  const dugmeSinifi =
    'min-h-[44px] min-w-[44px] rounded-[calc(var(--radius)-4px)] px-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  return (
    <div ref={kokRef} className="flex h-full w-full flex-col bg-background text-foreground" data-uygulama="olasilik">
      {/* Üst şerit: şablon sekmeleri + deneme düğmeleri */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Rastgele olay şablonu">
          {GORUNEN_SABLON_TURLERI.map((t, i) => (
            <button
              key={t}
              id={sekmeKimlikleri('olasilik', t).sekme}
              type="button"
              role="tab"
              aria-selected={durum.sablonTuru === t}
              aria-controls={sekmeKimlikleri('olasilik', t).panel}
              tabIndex={durum.sablonTuru === t ? 0 : -1}
              disabled={animasyonda}
              onClick={() => sablonSec(t)}
              onKeyDown={(e) => {
                // Ok tuşları şablon sekmeleri arasında dolaşır (roving tabindex)
                const hedef = sekmeOkTusu(e.key, i, GORUNEN_SABLON_TURLERI.length);
                if (hedef === null) return;
                e.preventDefault();
                sablonSec(GORUNEN_SABLON_TURLERI[hedef]);
                document.getElementById(sekmeKimlikleri('olasilik', GORUNEN_SABLON_TURLERI[hedef]).sekme)?.focus();
              }}
              className={`${dugmeSinifi} inline-flex items-center ${durum.sablonTuru === t ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-muted'}`}
            >
              <SablonSimgesi tur={t} className="mr-1.5 h-5 w-5 shrink-0" />
              {SABLON_ADLARI[t]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1" role="group" aria-label="Deney">
          {/* Deney düğmeleri animasyon sürerken disabled değil aria-disabled: odak düğmede kalır
              (disabled odağı body'ye düşürüyordu), tıklama/Enter işleyicide yok sayılır */}
          <button type="button" onClick={birKezDene} disabled={!gecerli} aria-disabled={animasyonda || undefined} className={`${dugmeSinifi} bg-ada-fener text-ada-murekkep hover:opacity-90`} data-bir-kez>
            1 Kez Dene
          </button>
          {TOPLU_SAYILAR.map((n) => (
            <button key={n} type="button" onClick={() => topluDene(n)} disabled={!gecerli} aria-disabled={animasyonda || undefined} className={`${dugmeSinifi} bg-secondary text-secondary-foreground hover:bg-muted`} aria-label={`${n} deneme yap`} data-toplu={n}>
              {n.toLocaleString('tr-TR')}
            </button>
          ))}
          <button type="button" onClick={sifirlaTikla} aria-disabled={animasyonda || undefined} className={`${dugmeSinifi} border border-border bg-card text-foreground hover:bg-muted`} data-sifirla>
            Sıfırla
          </button>
        </div>
      </div>

      {/* Gövde: geniş → 3 sütun (panel | sahne+tablo | grafikler); orta → 2 sütun; dar → tek sütun (sahne, panel, tablo, grafikler) */}
      <div className="flex-1 overflow-auto p-3" role="tabpanel" id={sekmeKimlikleri('olasilik', durum.sablonTuru).panel} aria-labelledby={sekmeKimlikleri('olasilik', durum.sablonTuru).sekme}>
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: genis ? 'minmax(280px, 320px) minmax(0, 1fr) minmax(300px, 360px)' : orta ? 'minmax(280px, 320px) minmax(0, 1fr)' : 'minmax(0, 1fr)',
          }}
        >
          <div className="min-w-0" style={{ order: orta ? 0 : 1 }}>
            <OlayPaneli
              sablon={sablon}
              onSablon={sablonGuncelleTikla}
              oznel={durum.oznel}
              oznelKilitli={durum.oznelKilitli}
              onOznel={(y) => setDurum((d) => oznelAyarla(d, y))}
              onKilit={() => setDurum((d) => oznelKilidiDegistir(d))}
              deneme={durum.deneme}
              gerceklesen={durum.gerceklesen}
              kilitli={animasyonda}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-3" style={{ order: orta ? 1 : 0 }}>
            <DeneyAlani ref={deneyAlani} sablon={sablon} koyu={koyu} azHareket={azHareket} gizli={gizli} onBitti={animasyonBitti} sonSonuc={sonSonuc} animasyonda={animasyonda} toplu={toplu} sayimlar={durum.sayimlar} />
            {orta && <SonucTablosu sablon={sablon} son={durum.son} sayimlar={durum.sayimlar} deneme={durum.deneme} />}
            {orta && !genis && grafikler}
          </div>
          {!orta && (
            <div className="min-w-0" style={{ order: 2 }}>
              <SonucTablosu sablon={sablon} son={durum.son} sayimlar={durum.sayimlar} deneme={durum.deneme} />
            </div>
          )}
          {(genis || !orta) && (
            <div className="flex min-w-0 flex-col gap-3" style={{ order: 3 }}>
              {grafikler}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
