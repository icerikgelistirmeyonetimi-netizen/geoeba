'use client';

/**
 * Olasılık Laboratuvarı — masaüstü uygulaması (Üretim / olasilik).
 *
 * Rastgele olay şablonları (para, sayı küpü, çark, torba, kart), olasılık kartları (öznel / teorik / deneysel), 3B deney
 * alanı, sonuç tablosu, karşılaştırma ve yakınsama grafikleri. Durum localStorage'da ('geoeba_olasilik_v1'); mantık
 * durum.ts / olasilik.ts / simulasyon.ts / sinifAyarlari.ts'te.
 *
 * İlkokul kademesinde (Kademe menüsü: İlkokul) laboratuvar yerine «olay kartları» görünümü açılır
 * (OlayKartlariGorunumu.tsx: imkânsız / olabilir / kesin, torba ve çark deneyiyle; TYMM MAT.4.4.1).
 *
 * Ortaokul, lise ve "Tüm araçlar" (TEGM Ortaokul Komisyonu, 20.10.2026): laboratuvar sınıf seçilmeden açılmaz
 * (SinifSecici). 5. sınıf «olasılık spektrumu» (SpektrumGorunumu; öznel olasılık), 6. sınıf deneysel, 7. sınıf teorik,
 * 8. sınıf üç yaklaşım birlikte; Galton tahtası yalnız lisede (10. sınıf). Sınıfın kuralları sinifAyarlari.ts'tedir.
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
import { SinifRozeti, SinifSecici } from './SinifSecici';
import { SonucTablosu } from './SonucTablosu';
import { SpektrumGorunumu } from './SpektrumGorunumu';
import { YakinsamaGrafigi } from './YakinsamaGrafigi';
import {
  DEPO_ANAHTARI,
  SABLON_ADLARI,
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
  sinifSec,
  sonuclariEkle,
  type LabDurumu,
} from './durum';
import { sablonGecerli, teorikOlasilik, type Sablon, type SablonTuru, type Sonuc } from './olasilik';
import { YakinsamaBirikeci, mulberry32, rastgeleTohum, tekDeneme, topluDeneme, type DeneyDurumu, type RastgeleUretec } from './simulasyon';
import { gorevMetni, kademeninSiniflari, sablonuSinifaUydur, sinifAyari, topluYapilabilir, type SinifAyari } from './sinifAyarlari';
import { useKapGenisligi } from './useKapGenisligi';

export { manifest } from './manifest';

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

/** Kademe menüsü İlkokul ise «olay kartları», değilse sınıf seçimiyle laboratuvar (ortaokul, lise, Tüm araçlar). */
export default function OlasilikUygulamasi(props: { pencereGenisligi?: number; pencereYuksekligi?: number }) {
  const ilkokul = useIlkokulKipi();
  const { kademe } = useOturum();
  return ilkokul ? <OlayKartlariGorunumu key={kademe ?? 'oturumsuz'} {...props} /> : <OlasilikLaboratuvari key={kademe ?? 'oturumsuz'} {...props} />;
}

/** Sınıf seçimi (seçilmemişse ya da kademeye uymuyorsa), 5. sınıf spektrumu ya da sınıfın laboratuvarı */
function OlasilikLaboratuvari(_props: { pencereGenisligi?: number; pencereYuksekligi?: number }) {
  const [kademe] = useKademeDuzeyi();
  const { kademe: oturumKademesi } = useOturum();
  const [durum, setDurum] = useState<LabDurumu>(() => ilkDurum(oturumKademesi));

  // Kalıcılık
  useEffect(() => {
    try {
      oturumKaydiniYaz(DEPO_ANAHTARI, oturumKademesi, durumuSerilestir(durum));
    } catch {
      /* depolama kapalı olabilir */
    }
  }, [durum, oturumKademesi]);

  const sinifDegistir = useCallback(() => setDurum((d) => sinifSec(d, null)), []);
  const siniflar = kademeninSiniflari(kademe === 'tum' ? null : kademe);
  const sinif = durum.sinif !== null && siniflar.includes(durum.sinif) ? durum.sinif : null;

  if (sinif === null) return <SinifSecici siniflar={siniflar} onSec={(s) => setDurum((d) => sinifSec(d, s))} />;
  const ayar = sinifAyari(sinif);
  if (ayar.gorunum === 'spektrum') return <SpektrumGorunumu onSinifDegistir={sinifDegistir} />;
  return <Laboratuvar key={sinif} durum={durum} setDurum={setDurum} ayar={ayar} kademe={kademe} onSinifDegistir={sinifDegistir} />;
}

export interface LaboratuvarProps {
  durum: LabDurumu;
  setDurum: React.Dispatch<React.SetStateAction<LabDurumu>>;
  ayar: SinifAyari;
  kademe: string;
  onSinifDegistir: () => void;
}

/** Sınıfın laboratuvarı (testler için dışa açık) */
export function Laboratuvar({ durum, setDurum, ayar, kademe, onSinifDegistir }: LaboratuvarProps) {
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
  /** 6. sınıf: deney en çok 30 tekrar (programdaki "20, 30 kez gibi") */
  const birKezYapilabilir = topluYapilabilir(ayar, durum.deneme, 1);

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
    if (animasyonda || !gecerli || !birKezYapilabilir || !uretec.current) return;
    const dd = ddKopya();
    const sonuc = tekDeneme(sablon, uretec.current, dd);
    if (!sonuc) return;
    setAnimasyonda(true);
    setSonSonuc(sonuc);
    bekleyen.current = { ekle: true };
    is.current = { kalan: 0, dd, son: sonuc };
    deneyAlani.current?.oynat(sonuc, false);
  }, [animasyonda, gecerli, birKezYapilabilir, sablon, ddKopya]);

  const topluDene = useCallback(
    (n: number) => {
      if (animasyonda || !gecerli || !topluYapilabilir(ayar, durum.deneme, n) || !uretec.current) return;
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
    [animasyonda, gecerli, ayar, durum.deneme, sablon, ddKopya, setDurum]
  );

  const animasyonBitti = useCallback(
    (sonuc: Sonuc) => {
      const b = bekleyen.current;
      bekleyen.current = null;
      const i = is.current;
      if (b?.ekle) setDurum((d) => ({ ...sonuclariEkle(d, [sonuc]), deneyDurumu: i ? { torbaKalan: i.dd.torbaKalan?.slice() } : d.deneyDurumu }));
      is.current = null;
      setToplu(false);
      setAnimasyonda(false);
    },
    [setDurum]
  );

  const sifirlaTikla = useCallback(() => {
    if (animasyonda) return;
    setDurum((d) => sifirla(d));
    setSonSonuc(null);
  }, [animasyonda, setDurum]);

  const sablonSec = useCallback(
    (tur: SablonTuru) => {
      if (animasyonda) return;
      setDurum((d) => sablonTuruSec(d, tur));
      setSonSonuc(null);
    },
    [animasyonda, setDurum]
  );

  const sablonGuncelleTikla = useCallback(
    (s: Sablon) => {
      if (animasyonda) return;
      setDurum((d) => sablonuGuncelle(d, sablonuSinifaUydur(s, ayar)));
      setSonSonuc(null);
    },
    [animasyonda, ayar, setDurum]
  );

  const genis = genislik >= 1180;
  const orta = genislik >= 820;
  const { yakinsama, karsilastirma: karsilastirmaVar } = ayar;
  const ortaokul = ayar.kademe === 'ortaokul';
  const sablonlar = ayar.sablonlar;
  // Geniş yerleşimde ızgara gövdenin yüksekliğine sabittir. Küçük kartlar (olay ayarları, olasılık kartları, sonuçlar)
  // doğal boyunda kalır; artan yeri her sütunun büyüyünce kazanan öğesi alır: solda karşılaştırma, ortada sahne, sağda
  // yakınsama grafiği. Olasılık kartları sahnenin altında yan yana durur (sol sütun uzun ayarlarla taşmasın). Bir sütun
  // yine sığmazsa (çok satırlı tablo) yalnız o sütun kendi içinde kayar: sahne hep görünür kalır.
  // Karşılaştırma grafiği olmayan sınıflarda (6, 7) sonuç tablosu sol sütunda ayarların altına iner; yakınsama
  // grafiği olmayan sınıfta (6) sağ sütun açılmaz.
  const sagSutun = genis && yakinsama;
  const tabloSolda = genis && !karsilastirmaVar;
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
      ayar={ayar}
    />
  );
  const tablo = <SonucTablosu sablon={sablon} son={durum.son} sayimlar={durum.sayimlar} deneme={durum.deneme} />;
  const karsilastirma = karsilastirmaVar && (
    <KarsilastirmaGrafigi oznel={durum.oznel / 100} deneysel={deneyselOran(durum)} teorik={teorik.deger} deneme={durum.deneme} doldur={genis} goster={ayar.kartlar} />
  );
  const yakinsamaGrafigi = yakinsama && (
    <YakinsamaGrafigi
      seri={seri}
      teorik={teorik.deger}
      oznel={ayar.kartlar.oznel ? durum.oznel / 100 : null}
      logOlcek={durum.logOlcek}
      onLogOlcek={() => setDurum((d) => logOlcekDegistir(d))}
      doldur={genis}
      ortaokul={ortaokul}
      egriAdi={ayar.kartlar.deneysel ? 'Deneysel olasılık' : 'Göreli sıklık'}
    />
  );
  const dugmeSinifi =
    'min-h-[44px] basik:min-h-[36px] min-w-[44px] rounded-[calc(var(--radius)-4px)] px-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  return (
    <div ref={kokRef} className="flex h-full w-full flex-col bg-background text-foreground" data-uygulama="olasilik" data-olasilik-sinif={ayar.sinif} data-olasilik-kademe={kademe}>
      {/* Üst şerit: sınıf + şablon sekmeleri + deneme düğmeleri. Basık ekranda (yatay telefon) sekmeler yalnız simge,
          düğmeler 36 px: şerit tek satıra iner, sahneye yer kalır */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2 basik:py-1">
        <SinifRozeti sinif={ayar.sinif} onDegistir={onSinifDegistir} disabled={animasyonda} />
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Rastgele olay şablonu">
          {sablonlar.map((t, i) => (
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
                const hedef = sekmeOkTusu(e.key, i, sablonlar.length);
                if (hedef === null) return;
                e.preventDefault();
                sablonSec(sablonlar[hedef]);
                document.getElementById(sekmeKimlikleri('olasilik', sablonlar[hedef]).sekme)?.focus();
              }}
              className={`${dugmeSinifi} inline-flex items-center ${durum.sablonTuru === t ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground hover:bg-muted'}`}
              title={SABLON_ADLARI[t]}
            >
              <SablonSimgesi tur={t} className="mr-1.5 h-5 w-5 shrink-0 basik:mr-0" />
              <span className="basik:sr-only">{SABLON_ADLARI[t]}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1" role="group" aria-label="Deney">
          {/* Deney düğmeleri animasyon sürerken disabled değil aria-disabled: odak düğmede kalır
              (disabled odağı body'ye düşürüyordu), tıklama/Enter işleyicide yok sayılır */}
          {ayar.enCokDeneme !== null && (
            <span className="mr-1 whitespace-nowrap text-[13px] font-semibold tabular-nums text-muted-foreground" data-tekrar-sayaci>
              Tekrar: {durum.deneme} / {ayar.enCokDeneme}
            </span>
          )}
          <button type="button" onClick={birKezDene} disabled={!gecerli || !birKezYapilabilir} aria-disabled={animasyonda || undefined} className={`${dugmeSinifi} bg-ada-fener text-ada-murekkep hover:opacity-90`} data-bir-kez>
            1 Kez Dene
          </button>
          {ayar.topluSayilar.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => topluDene(n)}
              disabled={!gecerli || !topluYapilabilir(ayar, durum.deneme, n)}
              aria-disabled={animasyonda || undefined}
              className={`${dugmeSinifi} bg-secondary text-secondary-foreground hover:bg-muted`}
              aria-label={`${n} deneme yap`}
              data-toplu={n}
            >
              {n.toLocaleString('tr-TR')}
            </button>
          ))}
          <button type="button" onClick={sifirlaTikla} aria-disabled={animasyonda || undefined} className={`${dugmeSinifi} border border-border bg-card text-foreground hover:bg-muted`} data-sifirla>
            Sıfırla
          </button>
        </div>
      </div>
      {/* Görev: sınıfın yaklaşımıyla tek cümle (TEGM: her sınıf kendi olasılık türünü öğrenir) */}
      <p className="border-b border-border bg-card px-4 py-2 text-[15px] font-semibold leading-snug text-foreground basik:py-1 basik:text-[13px]" data-gorev>
        {gorevMetni(ayar, sablon)}
      </p>

      {/* Gövde: geniş → 3 sütun (ayarlar + karşılaştırma ya da tablo | sahne + olasılık kartları | sonuçlar + yakınsama);
          orta → 2 sütun (panel | sahne + tablo + grafikler); dar → tek sütun (sahne, panel, tablo, grafikler) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-3 basik:p-2" role="tabpanel" id={sekmeKimlikleri('olasilik', durum.sablonTuru).panel} aria-labelledby={sekmeKimlikleri('olasilik', durum.sablonTuru).sekme}>
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
            {tabloSolda && tablo}
          </div>
          <div className={sutunSinifi} style={{ order: orta ? 1 : 0 }}>
            <DeneyAlani ref={deneyAlani} sablon={sablon} koyu={koyu} azHareket={azHareket} gizli={gizli} onBitti={animasyonBitti} sonSonuc={sonSonuc} animasyonda={animasyonda} toplu={toplu} sayimlar={durum.sayimlar} torbaKalan={durum.deneyDurumu.torbaKalan} doldur={genis} />
            {genis && olayPaneli('kartlar')}
            {orta && !sagSutun && !tabloSolda && tablo}
            {orta && !genis && karsilastirma}
            {orta && !genis && yakinsamaGrafigi}
          </div>
          {!orta && (
            <div className="min-w-0" style={{ order: 2 }}>
              {tablo}
            </div>
          )}
          {!orta && (karsilastirma || yakinsamaGrafigi) && (
            <div className="flex min-w-0 flex-col gap-3" style={{ order: 3 }}>
              {karsilastirma}
              {yakinsamaGrafigi}
            </div>
          )}
          {sagSutun && (
            <div className={sutunSinifi} style={{ order: 2 }}>
              {!tabloSolda && tablo}
              {yakinsamaGrafigi}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
