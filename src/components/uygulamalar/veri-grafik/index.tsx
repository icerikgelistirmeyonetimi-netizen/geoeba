'use client';

/**
 * "Veri ve Grafik" masaüstü uygulaması (TinkerPlots mantığı): veri tablosu + nokta / sütun / çizgi / daire /
 * saçılım grafikleri + istatistik paneli. Grafik türü sekmeleri veri türüne göre etkindir (çizgi bir, saçılım
 * iki sayısal değişken ister); gösterilen değişken grafiğin üstündeki sekmelerden seçilir. Tablo ile grafikler
 * iki yönlü bağlıdır (seçili satır, sürükleyerek değer değiştirme). "Deneyle topla" örnekleyiciyi (karıştırıcı / çark / sayı aralığı) açar: çekilişler canlı
 * olarak "Deney sonuçları" veri kümesine, "Ölçüm topla" ölçüleri "Ölçümler" kümesine yazılır.
 * Durum localStorage'da kalıcıdır ('geoeba_veri-grafik_v1'); ilk açılışta örnek veriyle gelir.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VeriTablosu as VeriTablosuBileseni, tabloDogalGenisligi } from './VeriTablosu';
import { NoktaGrafigi, type NoktaSecenekleri } from './NoktaGrafigi';
import { SutunGrafigi } from './SutunGrafigi';
import { CizgiGrafigi } from './CizgiGrafigi';
import { SacilimGrafigi } from './SacilimGrafigi';
import { DaireGrafigi } from './DaireGrafigi';
import { IstatistikPaneli } from './IstatistikPaneli';
import { KategorikIstatistik, KategorikSutunGrafigi, frekansTablosu, kategorikFrekanslar } from './KategorikGrafikler';
import { KaristiriciSimgesi, Ornekleyici } from './OrnekleyiciPaneli';
import { aralikSecenekleri, gruplamaVar, seriRengi, varsayilanAralik } from './grafik';
import { caprazSayim, degiskenSutunlari, kategoriRengi, renkEslemesi, satirRengi } from './kategorik';
import {
  ORNEK_VERILER,
  csvUret,
  gecerliDegerler,
  ornekVeriOlustur,
  sayiHucreYaz,
  sayiYaz,
  sutunIndeksi,
  tumunuTemizle,
  type Sutun,
  type VeriTablosu,
} from './veri';
import {
  KUMELER,
  SEKMELER,
  baslangicDurumu,
  durumMetindenCoz,
  etkinTablo,
  eksenDuzelt,
  etkinTabloYaz,
  gorunenKumeler,
  kumeDegistir,
  ornekleyiciDegistir,
  RENKSIZ,
  renkAnahtari,
  sacilimEksenleri,
  sekmeKullanilabilir,
  type Durum,
  type KumeId,
  type Sekme,
} from './durum';
import {
  aygitKategorileri,
  aygitSutunKimligi,
  olcumlerEkle,
  sonucEkle,
  sonucSutunlari,
  type OrnekleyiciAyari,
} from './ornekleyici';
import {
  DUGME,
  DUGME_BIRINCIL,
  SECIM,
  dosyaAdiTemizle,
  dosyaIndir,
  radyoTusu,
  svgPngIndir,
  useAcilirMenu,
  useAzaltilmisHareket,
  useBoyut,
} from './ortak';
import { sekmeKimlikleri, sekmeOkTusu } from '../sekmeler';

export { manifest } from './manifest';

export const DEPO_ANAHTARI = 'geoeba_veri-grafik_v1';

function durumYukle(): Durum | null {
  try {
    const y = durumMetindenCoz(window.localStorage.getItem(DEPO_ANAHTARI));
    // Görünen küme örnekleyici durumuyla tutarlı olsun (eski kayıtlarda ayrışmış olabilir)
    return y ? ornekleyiciDegistir(y, y.ornekleyiciAcik) : null;
  } catch {
    return null;
  }
}

function TurIsareti({ tur }: { tur: Sutun['tur'] }) {
  // Sayısal: cetvel; kategorik: etiket
  return tur === 'sayi' ? (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 opacity-80" aria-hidden="true">
      <path d="M2 11.5h12M4 11.5V9M7 11.5V8M10 11.5V9M13 11.5V7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 opacity-80" aria-hidden="true">
      <path d="M2.5 3h5.2l5.8 5.8-4.7 4.7L3 7.7V3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="5.5" cy="5.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

/**
 * Örnekleyici açıkken üç sütun (örnekleyici | tablo | grafik) en az bu genişliği ister; daha dar pencerede
 * bölümler alt alta dizilir ve gövde dikey kayar.
 */
export const UC_SUTUN_ESIGI = 1024;
/** Karşılaştırma panelleri bundan dar grafikte yan yana değil alt alta çizilir */
const YAN_YANA_ESIGI = 640;

/** Veri türü uymadığı için pasif grafik sekmelerinin nedeni (ipucu ve panel iletisi) */
const sekmeGerekceleri: Partial<Record<Sekme, string>> = {
  cizgi: 'Çizgi grafiği için tabloda en az bir sayısal değişken olmalı.',
  sacilim: 'Saçılım grafiği iki sayısal değişken arasındaki ilişkiyi gösterir: tabloda en az iki sayısal sütun olmalı.',
};

/** Göster / gizle seçeneği (basılı düğme; sekme düğmeleriyle aynı dil) */
const SECENEK_DUGMESI = (aktif: boolean) =>
  `h-11 rounded-[calc(var(--radius)-8px)] px-3 text-[13px] font-bold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 ${
    aktif ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
  }`;

export type YerlesimModu = 'iki-sutun' | 'uc-sutun' | 'dikey' | 'dikey-kaydir';

/**
 * Gövde yerleşimi: örnekleyici kapalıyken tablo | grafik (darda alt alta); açıkken geniş pencerede
 * örnekleyici | tablo | grafik, dar pencerede üstte örnekleyici şeridi ve altında tablo + grafik (gövde kayar).
 */
export function yerlesimModu(genislik: number, ornekleyiciAcik: boolean): YerlesimModu {
  if (ornekleyiciAcik) return genislik < UC_SUTUN_ESIGI ? 'dikey-kaydir' : 'uc-sutun';
  return genislik < 720 ? 'dikey' : 'iki-sutun';
}

export interface VeriGrafikUygulamasiProps {
  pencereGenisligi?: number;
  pencereYuksekligi?: number;
}

export default function VeriGrafikUygulamasi({ pencereGenisligi }: VeriGrafikUygulamasiProps) {
  const [durum, setDurumHam] = useState<Durum>(() => eksenDuzelt(baslangicDurumu()));
  /** Bütün durum değişimleri buradan geçer: eksen her zaman geçerli bir değişkende kalır (eksenDuzelt) */
  const setDurum = useCallback((yeni: React.SetStateAction<Durum>) => {
    setDurumHam((d) => eksenDuzelt(typeof yeni === 'function' ? yeni(d) : yeni));
  }, []);
  const [yuklendi, setYuklendi] = useState(false);
  const [seciliSatir, setSeciliSatir] = useState<number | null>(null);
  const ornekMenu = useAcilirMenu();
  const indirMenu = useAcilirMenu();
  const ayarMenu = useAcilirMenu();
  const [akis, setAkis] = useState(false);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const grafikRef = useRef<HTMLDivElement>(null);
  const kokRef = useRef<HTMLDivElement>(null);
  const grafikBoyut = useBoyut(grafikRef);
  const kokBoyut = useBoyut(kokRef);
  const azaltilmisHareket = useAzaltilmisHareket();

  // Kalıcı durum: yükle, sonra her değişimde kaydet
  useEffect(() => {
    const y = durumYukle();
    if (y) setDurum(y);
    setYuklendi(true);
  }, []);
  useEffect(() => {
    if (!yuklendi) return;
    try {
      window.localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(durum));
    } catch {
      /* depolama kapalı ya da dolu olabilir */
    }
  }, [durum, yuklendi]);

  useEffect(() => {
    if (!bildirim) return;
    const t = window.setTimeout(() => setBildirim(null), 2500);
    return () => window.clearTimeout(t);
  }, [bildirim]);

  const { sekme, secenekler, sutunModu, yuvarlamaAdimi, adimlariGoster, etkinKume } = durum;
  const tablo = etkinTablo(durum);
  const guncelle = useCallback(
    (kismi: Partial<Durum> | ((d: Durum) => Partial<Durum>)) => {
      setDurum((d) => ({ ...d, ...(typeof kismi === 'function' ? kismi(d) : kismi) }));
    },
    [setDurum],
  );
  const setTablo = useCallback((yeni: VeriTablosu) => setDurum((d) => etkinTabloYaz(d, yeni)), [setDurum]);

  const kumeSec = useCallback(
    (kume: KumeId) => {
      setDurum((d) => (d.etkinKume === kume ? d : kumeDegistir(d, kume)));
      setSeciliSatir(null);
    },
    [setDurum],
  );

  // ── Örnekleyici geri çağrıları ── (eksen, eksenDuzelt ile kendiliğinden deney değişkenine yerleşir)
  const deneySatirlari = useCallback(
    (satirlar: string[][], ayar: OrnekleyiciAyari, ilk: boolean) => {
      setDurum((d) => {
        const deneyTablosu = sonucEkle(d.deneyTablosu, ayar, satirlar);
        // Deney kümesine yalnız çalıştırmanın ilk parçasında geçilir; kullanıcı sonra başka kümeye geçerse orada kalır
        if (!ilk && d.etkinKume !== 'deney') return { ...d, deneyTablosu };
        return { ...(d.etkinKume === 'deney' ? d : kumeDegistir(d, 'deney')), deneyTablosu };
      });
    },
    [setDurum],
  );

  const deneyTemizle = useCallback(() => {
    setDurum((d) => ({ ...d, deneyTablosu: { sutunlar: sonucSutunlari(d.ornekleyici), satirlar: [] } }));
    setSeciliSatir(null);
  }, [setDurum]);

  const olcumler = useCallback((ayar: OrnekleyiciAyari, ad: string, degerler: (number | null)[], ilk: boolean) => {
    setDurum((d) => {
      const { tablo: olcumTablosu, sutunId } = olcumlerEkle(d.olcumTablosu, ayar, ad, degerler);
      // Küme / sekme / eksen yalnız ilk parçada ayarlanır; sonra kullanıcı başka sekmeye geçebilir
      if (!ilk) return { ...d, olcumTablosu };
      let y = d.etkinKume === 'olcum' ? d : kumeDegistir(d, 'olcum');
      const ayniDegisken = y.degisken === sutunId;
      y = { ...y, olcumTablosu, sekme: 'nokta', degisken: sutunId };
      if (!ayniDegisken) y = { ...y, aralik: null, sutunModu: false, ikinciDegisken: y.ikinciDegisken === sutunId ? null : y.ikinciDegisken };
      return y;
    });
  }, [setDurum]);

  const olcumTemizle = useCallback(() => {
    // Ölçümler kümesi kalkınca tablo alanı deney sonuçlarına döner
    setDurum((d) => ({ ...(d.etkinKume === 'olcum' ? kumeDegistir(d, 'deney') : d), olcumTablosu: null }));
    setSeciliSatir(null);
  }, [setDurum]);

  const ornekleyiciAyar = useCallback((ornekleyici: OrnekleyiciAyari) => guncelle({ ornekleyici }), [guncelle]);

  // ── Değişkenler ──
  const degiskenler = useMemo(() => degiskenSutunlari(tablo), [tablo]);
  const noktaSutun = sutunIndeksi(tablo, durum.degisken);
  const ikinciSutun = sutunIndeksi(tablo, durum.ikinciDegisken);
  const degiskenGecerli = noktaSutun >= 0 && degiskenler.some((s) => s.id === durum.degisken);
  const kategorikSecili = degiskenGecerli && tablo.sutunlar[noktaSutun].tur === 'etiket';
  const ikinciGecerli = ikinciSutun >= 0 && ikinciSutun !== noktaSutun && degiskenler.some((s) => s.id === durum.ikinciDegisken);
  const ikinciKategorik = ikinciGecerli && tablo.sutunlar[ikinciSutun].tur === 'etiket';
  /** Bütün grafiklerin değişkeni: eksendeki değişken (eksenDuzelt sayesinde tabloda değişken varsa hep atanmış) */
  const etkinSutun = degiskenGecerli ? noktaSutun : -1;
  const etkinSutunId = etkinSutun >= 0 ? tablo.sutunlar[etkinSutun].id : null;
  const etkinKategorik = etkinSutun >= 0 && tablo.sutunlar[etkinSutun].tur === 'etiket';
  const sayisalDegiskenler = useMemo(() => degiskenler.filter((s) => s.tur === 'sayi'), [degiskenler]);
  const kategorikDegiskenler = useMemo(() => degiskenler.filter((s) => s.tur === 'etiket'), [degiskenler]);
  /** Çizgi ve saçılım yalnız sayısal değişkenle çizilir: sekmelerde yalnız sayısallar, seçili değişken kategorikse ilk sayısal */
  const yalnizSayisal = sekme === 'cizgi' || sekme === 'sacilim';
  const sekmeDegiskenleri = yalnizSayisal ? sayisalDegiskenler : degiskenler;
  const sacilim = useMemo(
    () => sacilimEksenleri({ degisken: durum.degisken, yDegisken: durum.yDegisken, renkDegisken: durum.renkDegisken }, tablo),
    [durum.degisken, durum.yDegisken, durum.renkDegisken, tablo],
  );
  /** Grafiğin gösterdiği (sekmesi seçili) değişken */
  const grafikSutunId =
    sekme === 'sacilim'
      ? sacilim?.x ?? null
      : yalnizSayisal
        ? sayisalDegiskenler.some((s) => s.id === etkinSutunId)
          ? etkinSutunId
          : sayisalDegiskenler[0]?.id ?? null
        : etkinSutunId;
  const grafikSutun = sutunIndeksi(tablo, grafikSutunId);
  /** Seçenek şeridi yalnız o grafiğin seçeneği varsa çizilir */
  const seritVar =
    (sekme === 'nokta' && degiskenGecerli) ||
    (sekme === 'sutun' && degiskenGecerli && !etkinKategorik) ||
    (sekme === 'cizgi' && grafikSutun >= 0) ||
    (sekme === 'sacilim' && sacilim !== null);

  /** Kategorik sütunda kutucuk sırası: deney sütunuysa aygıttaki sıra, değilse alfabetik */
  const kategoriSiralari = useMemo(() => {
    const m = new Map<string, string[]>();
    if (etkinKume !== 'deney') return m;
    for (const a of durum.ornekleyici.aygitlar) m.set(aygitSutunKimligi(a.id), aygitKategorileri(a));
    return m;
  }, [etkinKume, durum.ornekleyici.aygitlar]);
  const siraBul = (sutun: number) => (sutun >= 0 ? kategoriSiralari.get(tablo.sutunlar[sutun]?.id ?? '') : undefined);
  /** Renk anahtarı: noktaları, sütunları ve tablo satırlarını renklendiren kategorik değişkenin eşlemesi */
  const renkId = renkAnahtari({ renkDegisken: durum.renkDegisken }, tablo);
  const renkEslemi = useMemo(
    () => (renkId ? renkEslemesi(tablo, sutunIndeksi(tablo, renkId), kategoriSiralari.get(renkId)) : null),
    [renkId, tablo, kategoriSiralari],
  );

  const noktaDegerler = useMemo(
    () => (degiskenGecerli && !kategorikSecili ? gecerliDegerler(tablo, noktaSutun).map((n) => n.deger) : []),
    [tablo, noktaSutun, degiskenGecerli, kategorikSecili],
  );
  const ikinciDegerler = useMemo(
    () => (ikinciGecerli && !ikinciKategorik ? gecerliDegerler(tablo, ikinciSutun).map((n) => n.deger) : []),
    [tablo, ikinciSutun, ikinciGecerli, ikinciKategorik],
  );
  const tumNoktaDegerler = useMemo(() => [...noktaDegerler, ...ikinciDegerler], [noktaDegerler, ikinciDegerler]);
  const otomatikAralik = useMemo(() => varsayilanAralik(tumNoktaDegerler), [tumNoktaDegerler]);
  const aralik = durum.aralik ?? otomatikAralik;
  const aralikSecenekler = useMemo(() => {
    const s = aralikSecenekleri(tumNoktaDegerler);
    return s.includes(aralik) ? s : [...s, aralik].sort((a, b) => a - b);
  }, [tumNoktaDegerler, aralik]);
  /** Değerler gruplanıyor mu (gruplama yoksa her nokta tam değerinde durur) */
  const gruplu = useMemo(() => tumNoktaDegerler.length > 0 && gruplamaVar(tumNoktaDegerler, aralik), [tumNoktaDegerler, aralik]);

  const ornekYukle = (id: string) => {
    // Örnek veri kendi tablonuza yüklenir: örnekleyici kapanır, tablo görünür, eksen varsayılan değişkene yerleşir;
    // belirli bir grafik için hazırlanmış örnek (saçılım, daire) o grafikte açılır
    const onerilen = ORNEK_VERILER.find((o) => o.id === id)?.onerilenGrafik;
    setDurum((d) => ({
      ...ornekleyiciDegistir(d, false),
      tablo: ornekVeriOlustur(id),
      degisken: null,
      ikinciDegisken: null,
      yDegisken: null,
      aralik: null,
      sutunModu: false,
      ...(onerilen ? { sekme: onerilen } : {}),
    }));
    setSeciliSatir(null);
    ornekMenu.kapat(true);
  };

  /** Satırları siler; sütunlar ve eksen seçimi kalır (yeni veri aynı eksene dizilir) */
  const temizle = () => {
    setDurum((d) => ({ ...etkinTabloYaz(d, tumunuTemizle(etkinTablo(d))), aralik: null, sutunModu: false }));
    setSeciliSatir(null);
  };

  const kumeAdi = KUMELER.find((k) => k.id === etkinKume)?.ad ?? 'Tablom';

  const csvIndir = () => {
    const metin = '﻿' + csvUret(tablo);
    dosyaIndir(new Blob([metin], { type: 'text/csv;charset=utf-8' }), `veri-grafik-${dosyaAdiTemizle(kumeAdi)}.csv`);
    setBildirim('CSV indirildi');
  };

  const pngIndir = async () => {
    const svg = grafikRef.current?.querySelector<SVGSVGElement>('svg[data-grafik]');
    if (!svg) {
      setBildirim('Bu sekmede indirilecek grafik yok');
      return;
    }
    try {
      const ad = `${svg.dataset.grafik}-grafigi-${dosyaAdiTemizle(tablo.sutunlar[etkinSutun]?.ad ?? 'veri')}.png`;
      await svgPngIndir(svg, ad);
      setBildirim('PNG indirildi');
    } catch {
      setBildirim('PNG üretilemedi');
    }
  };

  const degerDegis = useCallback((satir: number, sutun: number, deger: number, ondalik: number) => {
    setDurum((d) => etkinTabloYaz(d, sayiHucreYaz(etkinTablo(d), satir, sutun, deger, ondalik)));
  }, []);
  const degerlerDegis = useCallback((sutun: number, degerler: { satir: number; deger: number }[]) => {
    setDurum((d) =>
      etkinTabloYaz(
        d,
        degerler.reduce((t, { satir, deger }) => sayiHucreYaz(t, satir, sutun, deger, 2), etkinTablo(d)),
      ),
    );
  }, []);

  const genislik = kokBoyut.genislik || pencereGenisligi || 900;
  const ornekleyiciAcik = durum.ornekleyiciAcik;
  // Örnekleyici açıkken kendi sütununu alır (tabloyla yer paylaşmaz); dar pencerede bölümler alt alta dizilir
  const modu = yerlesimModu(genislik, ornekleyiciAcik);
  const dikey = modu === 'dikey' || modu === 'dikey-kaydir';
  /** Dar pencerede örnekleyici açık: gövde dikey kayar, her bölüm kendi boyunda */
  const dikeyKaydir = modu === 'dikey-kaydir';
  /** Geniş pencerede örnekleyici açık: örnekleyici | tablo | grafik */
  const ucSutun = modu === 'uc-sutun';
  const seciliGecerli = seciliSatir !== null && seciliSatir < tablo.satirlar.length ? seciliSatir : null;

  const degiskenSecimi = (deger: string | null, alan: 'degisken' | 'ikinciDegisken') => {
    guncelle((d) => {
      const yeni: Partial<Durum> = { [alan]: deger, aralik: null };
      if (alan === 'degisken' && deger && d.ikinciDegisken === deger) yeni.ikinciDegisken = null;
      return yeni;
    });
  };

  /**
   * Değişken sekmesine tıklama: o değişken grafiğe gelir. Saçılımda dikey eksendeki değişkenin sekmesine
   * tıklanırsa eksenler yer değiştirir (x ↔ y).
   */
  const degiskenSec = (id: string) => {
    if (sekme === 'sacilim' && sacilim && id === sacilim.y) {
      guncelle({ degisken: id, yDegisken: sacilim.x, aralik: null });
      return;
    }
    degiskenSecimi(id, 'degisken');
  };

  /** "Karşılaştır" seçimi (nokta ve çizgi grafiği): seçenek yoksa hiç gösterilmez */
  const karsilastirSecimi = (secenekler: Sutun[], deger: string) =>
    secenekler.length === 0 ? null : (
      <label className="inline-flex items-center gap-1.5">
        <span className="font-bold text-muted-foreground">Karşılaştır:</span>
        <select
          className={SECIM}
          value={deger}
          onChange={(e) => degiskenSecimi(e.target.value || null, 'ikinciDegisken')}
          aria-label="Karşılaştırma için ikinci değişken"
        >
          <option value="">yok</option>
          {secenekler.map((s) => (
            <option key={s.id} value={s.id}>
              {s.ad}
            </option>
          ))}
        </select>
      </label>
    );

  const grafikGenislik = grafikBoyut.genislik;
  const grafikYukseklik = grafikBoyut.yukseklik;
  const ikiPanel = sekme === 'nokta' && ikinciGecerli;
  /** Dar grafikte karşılaştırma panelleri alt alta (her biri yarım boy), genişte yan yana */
  const panelAltAlta = ikiPanel && grafikGenislik < YAN_YANA_ESIGI;
  const panelGenislik = ikiPanel && !panelAltAlta ? Math.floor(grafikGenislik / 2) : grafikGenislik;
  const panelYukseklik = panelAltAlta ? Math.floor(grafikYukseklik / 2) : grafikYukseklik;
  const ortakEksen = useMemo(
    () =>
      ikiPanel && noktaDegerler.length > 0 && ikinciDegerler.length > 0
        ? { min: Math.min(...tumNoktaDegerler), max: Math.max(...tumNoktaDegerler) }
        : undefined,
    [ikiPanel, tumNoktaDegerler, noktaDegerler.length, ikinciDegerler.length],
  );

  const kategorikDaire = useMemo(() => {
    if (sekme !== 'daire' || !etkinKategorik) return null;
    const sira = kategoriSiralari.get(etkinSutunId ?? '');
    const f = kategorikFrekanslar(tablo, etkinSutun, sira).filter((x) => x.sayi > 0 || sira !== undefined);
    // Renk anahtarı başka bir kategorik değişkense dış halka her dilimi onun kategorilerine böler
    const capraz = renkEslemi && renkEslemi.sutun !== etkinSutun ? caprazSayim(tablo, etkinSutun, renkEslemi, sira) : null;
    return {
      tablo: frekansTablosu(f, tablo.sutunlar[etkinSutun]?.ad ?? 'Frekans'),
      renkler: f.map((x, i) => kategoriRengi(x.kategori, i)),
      halka:
        renkEslemi && capraz
          ? {
              eslem: renkEslemi,
              sayilar: new Map(
                f.map((x, i) => {
                  const c = capraz.find((k) => k.kategori === x.kategori);
                  return [i, c ? [...c.sayilar, c.bos] : []] as [number, number[]];
                }),
              ),
            }
          : null,
    };
  }, [sekme, etkinKategorik, kategoriSiralari, etkinSutunId, tablo, etkinSutun, renkEslemi]);

  const kumeSayilari: Record<KumeId, number | null> = {
    tablom: durum.tablo.satirlar.length,
    deney: durum.deneyTablosu ? durum.deneyTablosu.satirlar.length : null,
    olcum: durum.olcumTablosu ? durum.olcumTablosu.satirlar.length : null,
  };
  /** Örnekleyici kapalı: yalnız kendi tablonuz; açık: deney (+ ölçüm toplandıysa Ölçümler). Tek kümede seçici çizilmez */
  const kumeler = gorunenKumeler(durum).map((id) => KUMELER.find((k) => k.id === id)!);
  const kumeSecici = kumeler.length > 1;

  return (
    <div ref={kokRef} className="flex h-full w-full flex-col bg-background text-foreground" data-uygulama="veri-grafik">
      {/* Üst şerit: sekmeler + dosya işlemleri */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-2 py-2">
        <div role="tablist" aria-label="Grafik türü" className="flex flex-wrap gap-1 rounded-[calc(var(--radius)-4px)] bg-muted p-1">
          {SEKMELER.map((s, i) => {
            const aktif = sekme === s.id;
            const kimlik = sekmeKimlikleri('veri', s.id);
            // Veri türüne göre: çizgi bir, saçılım iki sayısal değişken ister; yoksa sekme pasif ve nedeni ipucunda
            const kullanilabilir = sekmeKullanilabilir(s.id, sayisalDegiskenler.length);
            return (
              <button
                key={s.id}
                id={kimlik.sekme}
                type="button"
                role="tab"
                aria-selected={aktif}
                aria-controls={kimlik.panel}
                aria-disabled={!kullanilabilir || undefined}
                tabIndex={aktif ? 0 : -1}
                title={kullanilabilir ? undefined : sekmeGerekceleri[s.id]}
                onKeyDown={(e) => {
                  // Ok tuşları kullanılabilir sekmeler arasında dolaşır (roving tabindex); Tab tek durak
                  let hedef = sekmeOkTusu(e.key, i, SEKMELER.length);
                  if (hedef === null) return;
                  e.preventDefault();
                  const adim = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'End' ? -1 : 1;
                  for (let k = 0; k < SEKMELER.length && !sekmeKullanilabilir(SEKMELER[hedef].id, sayisalDegiskenler.length); k++) {
                    hedef = (hedef + adim + SEKMELER.length) % SEKMELER.length;
                  }
                  guncelle({ sekme: SEKMELER[hedef].id });
                  document.getElementById(sekmeKimlikleri('veri', SEKMELER[hedef].id).sekme)?.focus();
                }}
                className={`h-11 min-w-[64px] rounded-[calc(var(--radius)-8px)] px-3 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  aktif
                    ? 'bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_rgba(6,40,45,.6)]'
                    : kullanilabilir
                      ? 'text-foreground hover:bg-accent'
                      : 'cursor-not-allowed text-muted-foreground/60'
                }`}
                onClick={() => {
                  if (kullanilabilir) guncelle({ sekme: s.id });
                }}
              >
                {s.ad}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div ref={ornekMenu.kapRef} className="relative">
            <button
              ref={ornekMenu.dugmeRef}
              type="button"
              className={DUGME}
              aria-haspopup="menu"
              aria-expanded={ornekMenu.acik}
              onClick={() => ornekMenu.setAcik((a) => !a)}
              onKeyDown={ornekMenu.dugmeTusu}
            >
              Örnek veri
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {ornekMenu.acik && (
              <div
                ref={ornekMenu.menuRef}
                role="menu"
                aria-label="Örnek veri"
                onKeyDown={ornekMenu.menuTusu}
                className="absolute right-0 z-30 mt-1 min-w-[280px] overflow-hidden rounded-[calc(var(--radius)-4px)] border border-border bg-popover p-1 text-popover-foreground shadow-[0_18px_40px_-18px_rgba(6,40,45,.55)]"
              >
                {ORNEK_VERILER.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    className="block h-11 w-full rounded-[calc(var(--radius)-8px)] px-3 text-left text-[13px] font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    onClick={() => ornekYukle(o.id)}
                  >
                    {o.ad}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className={ornekleyiciAcik ? DUGME_BIRINCIL : DUGME}
            aria-pressed={ornekleyiciAcik}
            title="Örnekleyici: karıştırıcı, çark ya da sayı aralığıyla deney yapıp veri topla"
            onClick={() => guncelle((d) => ornekleyiciDegistir(d, !d.ornekleyiciAcik))}
          >
            <KaristiriciSimgesi className="h-4 w-4" />
            Deneyle topla
          </button>
          {/* İndir menüsü: tablo (CSV) ve grafik (PNG) tek düğmede */}
          <div ref={indirMenu.kapRef} className="relative">
            <button
              ref={indirMenu.dugmeRef}
              type="button"
              className={DUGME}
              aria-haspopup="menu"
              aria-expanded={indirMenu.acik}
              onClick={() => indirMenu.setAcik((a) => !a)}
              onKeyDown={indirMenu.dugmeTusu}
            >
              İndir
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {indirMenu.acik && (
              <div
                ref={indirMenu.menuRef}
                role="menu"
                aria-label="İndir"
                onKeyDown={indirMenu.menuTusu}
                className="absolute right-0 z-30 mt-1 min-w-[220px] overflow-hidden rounded-[calc(var(--radius)-4px)] border border-border bg-popover p-1 text-popover-foreground shadow-[0_18px_40px_-18px_rgba(6,40,45,.55)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className="block h-11 w-full rounded-[calc(var(--radius)-8px)] px-3 text-left text-[13px] font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  onClick={() => {
                    indirMenu.kapat(true);
                    csvIndir();
                  }}
                >
                  Tabloyu CSV olarak indir
                </button>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  disabled={sekme === 'istatistik'}
                  className="block h-11 w-full rounded-[calc(var(--radius)-8px)] px-3 text-left text-[13px] font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-50"
                  onClick={() => {
                    indirMenu.kapat(true);
                    void pngIndir();
                  }}
                >
                  Grafiği PNG olarak indir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seçenek şeridi: yalnız bu grafiğin seçenekleri (değişken sekmeleri grafiğin üstünde); seçenek yoksa şerit yok */}
      {seritVar && (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-background px-3 py-2 text-[13px]" data-secenek-seridi>
        {sekme === 'nokta' && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {karsilastirSecimi(
              degiskenler.filter((s) => s.id !== durum.degisken),
              ikinciGecerli ? durum.ikinciDegisken ?? '' : '',
            )}
            {degiskenGecerli && !kategorikSecili && aralikSecenekler.length > 1 && (
              <label className="inline-flex items-center gap-2" title="Yakın değerleri gruplara toplar; “yok” iken her nokta tam değerinde durur">
                <span className="font-bold text-muted-foreground">Gruplama:</span>
                <input
                  type="range"
                  min={0}
                  max={aralikSecenekler.length - 1}
                  step={1}
                  value={Math.max(0, aralikSecenekler.indexOf(aralik))}
                  onChange={(e) => guncelle({ aralik: aralikSecenekler[Number(e.target.value)] ?? null })}
                  className="h-11 w-24 accent-[hsl(var(--primary))]"
                  aria-label="Gruplama (grup genişliği)"
                  aria-valuetext={gruplu ? `${sayiYaz(aralik)} genişliğinde gruplar` : 'gruplama yok'}
                />
                <span className="min-w-[2.5rem] tabular-nums font-semibold">{gruplu ? sayiYaz(aralik) : 'yok'}</span>
                {durum.aralik !== null && (
                  <button type="button" className="h-9 px-2 text-[13px] font-semibold text-primary hover:underline" onClick={() => guncelle({ aralik: null })}>
                    otomatik
                  </button>
                )}
              </label>
            )}
            {/* Göster / gizle seçenekleri: basılı düğme grubu (onay kutusu yerine) */}
            <div role="group" aria-label="Grafik seçenekleri" className="inline-flex flex-wrap gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-1">
              {(
                // Kategorik değişkende ortalama ve ortalama mutlak sapma hesaplanmaz: düğmeler hiç gösterilmez
                (
                  [
                    ['ortalama', 'Ortalama'],
                    ['oms', 'Ortalama mutlak sapma'],
                    ['etiketler', kategorikSecili ? 'Sayılar' : 'Etiketler'],
                  ] as [keyof NoktaSecenekleri, string][]
                ).filter(([anahtar]) => !kategorikSecili || anahtar === 'etiketler')
              ).map(([anahtar, ad]) => (
                <button
                  key={anahtar}
                  type="button"
                  aria-pressed={secenekler[anahtar]}
                  disabled={!degiskenGecerli}
                  className={SECENEK_DUGMESI(secenekler[anahtar])}
                  onClick={() => guncelle({ secenekler: { ...secenekler, [anahtar]: !secenekler[anahtar] } })}
                >
                  {ad}
                </button>
              ))}
              <button type="button" aria-pressed={sutunModu} disabled={!degiskenGecerli} className={SECENEK_DUGMESI(sutunModu)} onClick={() => guncelle({ sutunModu: !sutunModu })}>
                Sütunlara dönüştür
              </button>
            </div>
          </div>
        )}

        {/* Saçılım: yatay eksen üstteki sekmeden, dikey eksen buradan */}
        {sekme === 'sacilim' && sacilim && (
          <label className="inline-flex items-center gap-1.5">
            <span className="font-bold text-muted-foreground">Dikey eksen (y):</span>
            <select
              className={SECIM}
              value={sacilim.y}
              onChange={(e) => guncelle({ yDegisken: e.target.value || null })}
              aria-label="Saçılım grafiğinin dikey ekseni"
            >
              {sayisalDegiskenler
                .filter((s) => s.id !== sacilim.x)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ad}
                  </option>
                ))}
            </select>
          </label>
        )}
        {/* Çizgi: seçili değişken + istenirse ikinci sayısal değişken; sütun ve çizgide sürükleme yuvarlaması */}
        {((sekme === 'sutun' && degiskenGecerli && !etkinKategorik) || (sekme === 'cizgi' && grafikSutun >= 0)) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {sekme === 'cizgi' &&
              karsilastirSecimi(
                sayisalDegiskenler.filter((s) => s.id !== grafikSutunId),
                ikinciGecerli && !ikinciKategorik && durum.ikinciDegisken !== grafikSutunId ? durum.ikinciDegisken ?? '' : '',
              )}
            <label className="inline-flex items-center gap-1.5">
              <span className="font-bold text-muted-foreground">Sürüklerken yuvarla:</span>
              <select
                className={SECIM}
                value={String(yuvarlamaAdimi)}
                onChange={(e) => guncelle({ yuvarlamaAdimi: Number(e.target.value) })}
                aria-label="Sürükleme yuvarlama adımı"
              >
                <option value="1">1</option>
                <option value="0.5">0,5</option>
                <option value="0.1">0,1</option>
              </select>
            </label>
          </div>
        )}
      </div>
      )}

      {/* Gövde: (örnekleyici |) tablo | grafik — dar pencerede alt alta */}
      <div className={`relative flex min-h-0 flex-1 ${dikey ? 'flex-col' : 'flex-row'} ${dikeyKaydir ? 'overflow-y-auto overflow-x-hidden' : ''}`}>
        {ornekleyiciAcik && (
          // Geniş pencerede kendi sütununda durur ve gerekirse yalnız o sütun kayar; dar pencerede üstte tam genişlik şerit
          <div
            className={
              ucSutun
                ? 'relative flex w-[clamp(352px,27%,420px)] shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-background'
                : 'relative shrink-0 bg-background'
            }
            style={{ overflowAnchor: 'none' }}
            data-ornekleyici-alani
          >
            <Ornekleyici
              ayar={durum.ornekleyici}
              onAyar={ornekleyiciAyar}
              deneyTablosu={durum.deneyTablosu}
              olcumTablosu={durum.olcumTablosu}
              onDeneySatirlari={deneySatirlari}
              onDeneyTemizle={deneyTemizle}
              onOlcumler={olcumler}
              onOlcumTemizle={olcumTemizle}
              onKapat={() => guncelle((d) => ornekleyiciDegistir(d, false))}
              onAkis={setAkis}
              azaltilmisHareket={azaltilmisHareket}
            />
          </div>
        )}
        <aside
          className={`flex shrink-0 flex-col border-border bg-card ${dikeyKaydir ? '' : 'min-h-0'} ${
            dikey
              ? `${dikeyKaydir ? '' : 'h-[42%]'} min-h-[180px] border-b`
              : `${ucSutun ? 'w-[30%] min-w-[300px] max-w-[480px]' : 'min-w-[260px]'} border-r`
          }`}
          // İki sütunlu düzende tablo alanı en az eskisi kadar (%38, en çok 520 px); sütunlar sığmıyorsa pencerenin
          // %48'ine kadar genişler (başlıklar ve değerler yatay kaydırmadan görünsün)
          style={!dikey && !ucSutun ? { width: `clamp(260px, max(min(38%, 520px), ${tabloDogalGenisligi(tablo)}px), 48%)` } : undefined}
          aria-label="Veri"
        >
          {/* Veri kümesi seçici (yalnız deney / ölçüm verisi varken) */}
          {kumeSecici && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-2 py-1.5 text-[13px]">
            <div role="radiogroup" aria-label="Veri kümesi" className="inline-flex flex-wrap gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-1">
              {kumeler.map((k, ki) => {
                const aktif = etkinKume === k.id;
                const sayi = kumeSayilari[k.id];
                return (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    tabIndex={aktif ? 0 : -1}
                    onKeyDown={(e) => radyoTusu(e, ki, kumeler.length, (h) => kumeSec(kumeler[h].id))}
                    data-kume={k.id}
                    aria-label={`${k.ad}${sayi !== null ? ` (${sayi})` : ''}`}
                    className={`h-11 rounded-[calc(var(--radius)-8px)] px-2.5 text-[13px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      aktif ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
                    }`}
                    onClick={() => kumeSec(k.id)}
                  >
                    {k.kisaAd}
                    {sayi !== null && <span className={`ml-1 font-semibold ${aktif ? 'opacity-85' : 'text-muted-foreground'}`}>({sayi})</span>}
                  </button>
                );
              })}
            </div>
          </div>
          )}
          <div className={dikeyKaydir ? 'h-[280px] shrink-0' : 'min-h-0 flex-1'}>
            <VeriTablosuBileseni
              key={etkinKume}
              tablo={tablo}
              seciliSatir={seciliGecerli}
              onSatirSec={setSeciliSatir}
              onTablo={setTablo}
              vurguluSutun={grafikSutunId}
              sonaKaydir={etkinKume !== 'tablom'}
              onTemizle={temizle}
              satirRengi={renkEslemi ? (i: number) => satirRengi(renkEslemi, i) : undefined}
            />
          </div>
        </aside>
        <main
          className={`flex min-w-0 flex-col overflow-hidden bg-card ${dikeyKaydir ? 'h-[420px] shrink-0' : 'min-h-0 flex-1'}`}
          role="tabpanel"
          id={sekmeKimlikleri('veri', sekme).panel}
          aria-labelledby={sekmeKimlikleri('veri', sekme).sekme}
        >
          {/* Değişken sekmeleri grafiğin üstünde (seçili sekme grafiğin gösterdiği değişken; renkli nokta ikinci değişken);
              sağda grafik ayarları: kategoriye göre renklendirme (bütün grafikler, istatistik ve tablo) */}
          <div className="flex shrink-0 items-end gap-2 border-b border-border bg-background px-2 pt-2">
            <div role="tablist" aria-label="Grafikteki değişken" className="-mb-px flex min-w-0 flex-1 items-end gap-1 overflow-x-auto" data-degisken-sekmeleri>
              {sekmeDegiskenleri.map((s, i) => {
                const aktif = s.id === grafikSutunId;
                const ikinci =
                  (sekme === 'nokta' && ikinciGecerli && s.id === durum.ikinciDegisken) ||
                  (sekme === 'cizgi' && ikinciGecerli && !ikinciKategorik && s.id === durum.ikinciDegisken && s.id !== grafikSutunId) ||
                  (sekme === 'sacilim' && sacilim !== null && s.id === sacilim.y);
                const turAdi = s.tur === 'sayi' ? 'sayısal' : 'kategorik';
                return (
                  <button
                    key={s.id}
                    id={`vg-degisken-sekmesi-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={aktif}
                    aria-controls="vg-grafik-alani"
                    tabIndex={aktif ? 0 : -1}
                    data-degisken-turu={s.tur}
                    title={`${s.ad} (${turAdi})${ikinci ? (sekme === 'sacilim' ? ' · dikey eksende' : ' · karşılaştırılıyor') : ''}`}
                    onKeyDown={(e) => {
                      const hedef = sekmeOkTusu(e.key, i, sekmeDegiskenleri.length);
                      if (hedef === null) return;
                      e.preventDefault();
                      degiskenSec(sekmeDegiskenleri[hedef].id);
                      document.getElementById(`vg-degisken-sekmesi-${hedef}`)?.focus();
                    }}
                    onClick={() => {
                      if (!aktif) degiskenSec(s.id);
                    }}
                    className={`relative inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-[calc(var(--radius)-4px)] border px-3.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                      aktif
                        ? 'border-border border-b-card bg-card font-bold text-foreground shadow-[inset_0_3px_0_hsl(var(--primary))]'
                        : 'border-transparent font-semibold text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                    }`}
                  >
                    <TurIsareti tur={s.tur} />
                    {s.ad}
                    {ikinci && <span aria-hidden="true" className="ml-0.5 h-2 w-2 rounded-full" style={{ backgroundColor: seriRengi(1) }} />}
                  </button>
                );
              })}
            </div>
            <div ref={ayarMenu.kapRef} className="relative mb-1.5 shrink-0">
              <button
                ref={ayarMenu.dugmeRef}
                type="button"
                className={DUGME}
                aria-haspopup="menu"
                aria-expanded={ayarMenu.acik}
                title="Grafik ayarları: kategoriye göre renklendirme"
                onClick={() => ayarMenu.setAcik((a) => !a)}
                onKeyDown={ayarMenu.dugmeTusu}
                data-grafik-ayarlari-dugmesi
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M10 6.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zm7.1 4.3l1.4 1.1-1.5 2.6-1.7-.6a6.6 6.6 0 0 1-1.6.9l-.3 1.8h-3l-.3-1.8a6.6 6.6 0 0 1-1.6-.9l-1.7.6-1.5-2.6 1.4-1.1a6.8 6.8 0 0 1 0-1.8l-1.4-1.1 1.5-2.6 1.7.6c.5-.4 1-.7 1.6-.9l.3-1.8h3l.3 1.8c.6.2 1.1.5 1.6.9l1.7-.6 1.5 2.6-1.4 1.1c.1.6.1 1.2 0 1.8z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                Grafik ayarları
              </button>
              {ayarMenu.acik && (
                <div
                  ref={ayarMenu.menuRef}
                  role="menu"
                  aria-label="Grafik ayarları"
                  onKeyDown={ayarMenu.menuTusu}
                  className="absolute right-0 top-full z-30 mt-1 w-[min(320px,80vw)] rounded-[calc(var(--radius)-4px)] border border-border bg-popover p-2 text-[13px] text-popover-foreground shadow-[0_18px_40px_-18px_rgba(6,40,45,.55)]"
                  data-grafik-ayarlari
                >
                  <p className="px-2 pt-1 font-bold">Kategoriye göre renklendir</p>
                  <p className="px-2 pb-2 text-muted-foreground">Bütün grafiklerde, istatistikte ve tablodaki satırlarda aynı renkler kullanılır.</p>
                  {[
                    { id: RENKSIZ, ad: 'Renklendirme yok', eslem: null },
                    ...kategorikDegiskenler.map((s) => ({ id: s.id, ad: s.ad, eslem: renkEslemesi(tablo, sutunIndeksi(tablo, s.id), kategoriSiralari.get(s.id)) })),
                  ].map((o) => {
                    const secili = o.id === RENKSIZ ? renkId === null : renkId === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={secili}
                        tabIndex={-1}
                        className="flex min-h-11 w-full items-center gap-2 rounded-[calc(var(--radius)-8px)] px-2 text-left font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                        onClick={() => {
                          guncelle({ renkDegisken: o.id });
                          ayarMenu.kapat(true);
                        }}
                      >
                        <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${secili ? 'border-primary' : 'border-muted-foreground/50'}`}>
                          {secili && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{o.ad}</span>
                        {o.eslem && (
                          <span aria-hidden="true" className="flex shrink-0 gap-0.5">
                            {o.eslem.kategoriler.slice(0, 5).map((k) => (
                              <span key={k} className="h-3 w-3 rounded-full" style={{ backgroundColor: o.eslem!.renkler.get(k) }} />
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {kategorikDegiskenler.length === 0 && (
                    <p className="px-2 pb-1 pt-2 text-muted-foreground">Tabloda kategorik değişken yok. Renklendirmek için ilk sütuna tekrar eden adlar yazın (ör. A, B).</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div ref={grafikRef} id="vg-grafik-alani" className="relative min-h-0 flex-1 overflow-hidden">
          {/* Kısa bildirim (CSV / PNG indirildi vb.): grafiğin altında geçici not */}
          <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center empty:hidden">
            {bildirim && <span className="rounded-full bg-foreground/90 px-3 py-1.5 text-[13px] font-semibold text-background shadow-sm">{bildirim}</span>}
          </div>
          {grafikGenislik > 0 && grafikYukseklik > 0 && (
            <>
              {sekme === 'nokta' && (
                <div className={`flex h-full w-full ${panelAltAlta ? 'flex-col divide-y divide-border' : ikiPanel ? 'divide-x divide-border' : ''}`}>
                  <NoktaGrafigi
                    key={`${etkinKume}-1`}
                    akis={akis}
                    tablo={tablo}
                    sutun={degiskenGecerli ? noktaSutun : -1}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    onDegiskenBirak={(id) => {
                      if (degiskenler.some((s) => s.id === id)) degiskenSecimi(id, 'degisken');
                    }}
                    aralik={aralik}
                    secenekler={secenekler}
                    sutunModu={sutunModu}
                    genislik={panelGenislik}
                    yukseklik={panelYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    surukleniyor={false}
                    baslik={ikiPanel ? tablo.sutunlar[noktaSutun]?.ad : undefined}
                    eksenAlani={ortakEksen}
                    kategoriSirasi={siraBul(noktaSutun)}
                    renkEslemi={renkEslemi}
                  />
                  {ikiPanel && (
                    <NoktaGrafigi
                      key={`${etkinKume}-2`}
                      akis={akis}
                      tablo={tablo}
                      sutun={ikinciSutun}
                      seciliSatir={seciliGecerli}
                      onSatirSec={setSeciliSatir}
                      onDegiskenBirak={(id) => {
                        if (degiskenler.some((s) => s.id === id)) degiskenSecimi(id, 'ikinciDegisken');
                      }}
                      aralik={aralik}
                      secenekler={secenekler}
                      sutunModu={sutunModu}
                      genislik={panelGenislik}
                      yukseklik={panelYukseklik}
                      azaltilmisHareket={azaltilmisHareket}
                      surukleniyor={false}
                      baslik={tablo.sutunlar[ikinciSutun]?.ad}
                      eksenAlani={ortakEksen}
                      kategoriSirasi={siraBul(ikinciSutun)}
                      renkEslemi={renkEslemi}
                    />
                  )}
                </div>
              )}
              {sekme === 'sutun' &&
                (etkinKategorik ? (
                  <KategorikSutunGrafigi
                    tablo={tablo}
                    sutun={etkinSutun}
                    sira={siraBul(etkinSutun)}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    renkEslemi={renkEslemi}
                  />
                ) : (
                  <SutunGrafigi
                    tablo={tablo}
                    sutun={etkinSutun}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    onDegerDegis={degerDegis}
                    yuvarlamaAdimi={yuvarlamaAdimi}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    renkEslemi={renkEslemi}
                  />
                ))}
              {sekme === 'cizgi' &&
                (grafikSutun < 0 ? (
                  <div className="flex h-full items-center justify-center p-6" data-cizgi-kullanilamaz>
                    <p className="max-w-md rounded-[calc(var(--radius)-4px)] border border-border bg-background p-4 text-center text-[13px] text-muted-foreground">
                      <strong className="block text-foreground">Çizgi grafiği çizilemiyor.</strong>
                      {sekmeGerekceleri.cizgi} Kategorik veriler için Nokta, Sütun ya da Daire grafiğini deneyin.
                    </p>
                  </div>
                ) : (
                  <CizgiGrafigi
                    tablo={tablo}
                    sutunlar={[grafikSutun, ...(ikinciGecerli && !ikinciKategorik && ikinciSutun !== grafikSutun ? [ikinciSutun] : [])]}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    onDegerDegis={degerDegis}
                    yuvarlamaAdimi={yuvarlamaAdimi}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    renkEslemi={renkEslemi}
                  />
                ))}
              {sekme === 'daire' &&
                (kategorikDaire ? (
                  <DaireGrafigi
                    tablo={kategorikDaire.tablo}
                    sutun={1}
                    seciliSatir={null}
                    onSatirSec={() => undefined}
                    onDegerlerDegis={() => undefined}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    surukleKapali
                    renkler={kategorikDaire.renkler}
                    halka={kategorikDaire.halka}
                    aciklama="Her dilim bir kategorinin kaç kez görüldüğünü gösterir"
                  />
                ) : (
                  <DaireGrafigi
                    tablo={tablo}
                    sutun={etkinSutun}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    onDegerlerDegis={degerlerDegis}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                    aciklama="Her dilim, değerin toplam içindeki payını gösterir"
                    renkEslemi={renkEslemi}
                  />
                ))}
              {sekme === 'sacilim' &&
                (sacilim ? (
                  <SacilimGrafigi
                    tablo={tablo}
                    xSutun={sutunIndeksi(tablo, sacilim.x)}
                    ySutun={sutunIndeksi(tablo, sacilim.y)}
                    renkEslemi={renkEslemi}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    genislik={grafikGenislik}
                    yukseklik={grafikYukseklik}
                    azaltilmisHareket={azaltilmisHareket}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-6" data-sacilim-kullanilamaz>
                    <p className="max-w-md rounded-[calc(var(--radius)-4px)] border border-border bg-background p-4 text-center text-[13px] text-muted-foreground">
                      <strong className="block text-foreground">Saçılım grafiği çizilemiyor.</strong>
                      {sekmeGerekceleri.sacilim}
                    </p>
                  </div>
                ))}
              {sekme === 'istatistik' &&
                (etkinKategorik ? (
                  <KategorikIstatistik tablo={tablo} sutun={etkinSutun} sira={siraBul(etkinSutun)} renkEslemi={renkEslemi} />
                ) : (
                  <IstatistikPaneli
                    tablo={tablo}
                    sutun={etkinSutun}
                    seciliSatir={seciliGecerli}
                    onSatirSec={setSeciliSatir}
                    adimlariGoster={adimlariGoster}
                    onAdimlariGoster={(v) => guncelle({ adimlariGoster: v })}
                    renkEslemi={renkEslemi}
                  />
                ))}
            </>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
