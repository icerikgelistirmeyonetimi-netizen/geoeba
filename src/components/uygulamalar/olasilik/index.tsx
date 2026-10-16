'use client';

/**
 * Olasılık Laboratuvarı — masaüstü uygulaması (Üretim / olasilik).
 *
 * Rastgele olay şablonları (para, sayı küpü, çark, torba, kart), üç olasılık paneli (öznel / teorik /
 * deneysel), 3B deney alanı, sonuç tablosu, karşılaştırma ve yakınsama grafikleri. Durum
 * localStorage'da ('geoeba_olasilik_v1'); mantık durum.ts / olasilik.ts / simulasyon.ts'te.
 *
 * İlkokul kademesinde (Kademe menüsü: İlkokul) laboratuvar yerine «olay kartları» görünümü açılır
 * (OlayKartlariGorunumu.tsx: imkânsız / olabilir / kesin, torba ve çark deneyiyle; TYMM MAT.4.4.1). Ortaokul,
 * lise ve "Tüm araçlar"da laboratuvar değişmeden açılır.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIlkokulKipi, useKademeDuzeyi } from '@/hooks/useKademeDuzeyi';
import { useOturum } from '@/state/OturumContext';
import { oturumKaydiniOku, oturumKaydiniYaz } from '@/state/oturumDeposu';
import type { LevelId } from '@/types/curriculum';
import { DeneyAlani, type DeneyAlaniTutamaci } from './DeneyAlani';
import { OlayKartlariGorunumu } from './OlayKartlariGorunumu';
import { useAzHareket, useKoyuTema } from './kancalar';
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

function ilkDurum(kademe: LevelId | null): LabDurumu {
  if (typeof window === 'undefined') return ornekDurum();
  try {
    return durumuCoz(oturumKaydiniOku(DEPO_ANAHTARI, kademe)) ?? ornekDurum();
  } catch {
    return ornekDurum();
  }
}

interface Is {
  kalan: number;
  dd: DeneyDurumu;
  son: Sonuc | null;
}

/** Kademe menüsü İlkokul ise «olay kartları», değilse laboratuvar (ortaokul, lise, Tüm araçlar). */
export default function OlasilikUygulamasi(props: { pencereGenisligi?: number; pencereYuksekligi?: number }) {
  const ilkokul = useIlkokulKipi();
  const { kademe } = useOturum();
  return ilkokul ? <OlayKartlariGorunumu key={kademe ?? 'oturumsuz'} {...props} /> : <OlasilikLaboratuvari key={kademe ?? 'oturumsuz'} {...props} />;
}

function OlasilikLaboratuvari(_props: { pencereGenisligi?: number; pencereYuksekligi?: number }) {
  const [kademe] = useKademeDuzeyi();
  const { kademe: oturumKademesi } = useOturum();
  const [durum, setDurum] = useState<LabDurumu>(() => ilkDurum(oturumKademesi));
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
      oturumKaydiniYaz(DEPO_ANAHTARI, oturumKademesi, durumuSerilestir(durum));
    } catch {
      /* depolama kapalı olabilir */
    }
  }, [durum, oturumKademesi]);

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
  const yakinsama = kademe !== 'ortaokul';
  // Geniş yerleşimde ızgara gövdenin yüksekliğine sabittir. Küçük kartlar (olay ayarları, olasılık kartları, sonuçlar)
  // doğal boyunda kalır; artan yeri her sütunun büyüyünce kazanan öğesi alır: solda karşılaştırma, ortada sahne, sağda
  // yakınsama grafiği. Olasılık kartları sahnenin altında yan yana durur (sol sütun uzun ayarlarla taşmasın). Bir sütun
  // yine sığmazsa (çok satırlı tablo) yalnız o sütun kendi içinde kayar: sahne hep görünür kalır.
  // Ortaokulda yakınsama yok: sağ sütun açılmaz, sonuçlar orta sütunda kartların altına iner.
  const sagSutun = genis && yakinsama;
  const sutunSinifi = genis ? 'flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto scrollbar-thin' : 'flex min-w-0 flex-col gap-3';
  const olayPaneli = (bolum: 'hepsi' | 'ayarlar' | 'kartlar') => (
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
      bolum={bolum}
    />
  );
  const tablo = <SonucTablosu sablon={sablon} son={durum.son} sayimlar={durum.sayimlar} deneme={durum.deneme} />;
  const karsilastirma = <KarsilastirmaGrafigi oznel={durum.oznel / 100} deneysel={deneyselOran(durum)} teorik={teorik.deger} deneme={durum.deneme} doldur={genis} />;
  const yakinsamaGrafigi = yakinsama && <YakinsamaGrafigi seri={seri} teorik={teorik.deger} oznel={durum.oznel / 100} logOlcek={durum.logOlcek} onLogOlcek={() => setDurum((d) => logOlcekDegistir(d))} doldur={genis} />;
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

      {/* Gövde: geniş → 3 sütun (ayarlar+karşılaştırma | sahne+olasılık kartları | sonuçlar+yakınsama; ortaokulda 2 sütun);
          orta → 2 sütun (panel | sahne+tablo+grafikler); dar → tek sütun (sahne, panel, tablo, grafikler) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-3" role="tabpanel" id={sekmeKimlikleri('olasilik', durum.sablonTuru).panel} aria-labelledby={sekmeKimlikleri('olasilik', durum.sablonTuru).sekme}>
        <div
          className={genis ? 'grid min-h-0 flex-1 gap-3' : 'grid gap-3'}
          style={{
            gridTemplateRows: genis ? 'minmax(0, 1fr)' : undefined,
            // Geniş: ayarlar sütunu genişliğin ~%24'ü, 300–400 px (içeriği dar); artan genişliğin çoğunu deney alanı alır
            gridTemplateColumns: sagSutun
              ? 'clamp(300px, 24%, 400px) minmax(360px, 1.5fr) minmax(380px, 1fr)'
              : genis
                ? 'clamp(300px, 24%, 400px) minmax(0, 1fr)'
                : orta
                  ? 'minmax(300px, 1fr) minmax(0, 1fr)'
                  : 'minmax(0, 1fr)',
          }}
        >
          <div className={sutunSinifi} style={{ order: orta ? 0 : 1 }}>
            {olayPaneli(genis ? 'ayarlar' : 'hepsi')}
            {genis && karsilastirma}
          </div>
          <div className={sutunSinifi} style={{ order: orta ? 1 : 0 }}>
            <DeneyAlani ref={deneyAlani} sablon={sablon} koyu={koyu} azHareket={azHareket} gizli={gizli} onBitti={animasyonBitti} sonSonuc={sonSonuc} animasyonda={animasyonda} toplu={toplu} sayimlar={durum.sayimlar} torbaKalan={durum.deneyDurumu.torbaKalan} doldur={genis} />
            {genis && olayPaneli('kartlar')}
            {orta && !sagSutun && tablo}
            {orta && !genis && karsilastirma}
            {orta && !genis && yakinsamaGrafigi}
          </div>
          {!orta && (
            <div className="min-w-0" style={{ order: 2 }}>
              {tablo}
            </div>
          )}
          {!orta && (
            <div className="flex min-w-0 flex-col gap-3" style={{ order: 3 }}>
              {karsilastirma}
              {yakinsamaGrafigi}
            </div>
          )}
          {sagSutun && (
            <div className={sutunSinifi} style={{ order: 2 }}>
              {tablo}
              {yakinsamaGrafigi}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
