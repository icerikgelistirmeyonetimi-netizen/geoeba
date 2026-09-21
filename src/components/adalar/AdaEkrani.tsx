'use client';

/**
 * Matematik Takımadaları — uygulamanın giriş ekranı.
 *
 * `ana-sayfa`: üç kademe adası ve Matematik Feneri. Adaya tıklamak o kademenin adasını,
 * fener Serbest Çizim Stüdyosu'nu açar. Kademe adasında sınıf binasına ya da alttaki
 * sınıf düğmesine tıklamak sağda o sınıfın ünitelerini listeleyen paneli açar; ünitenin
 * konusu seçilince panel sola doğru genişler ve konunun içeriği panelin içinde açılır
 * (sol üstteki başlık yazıları ve alttaki düğmeler bu sürede çekilir).
 *
 * Sahne motoru (adaSahnesi.ts) yalnız tarayıcıda, effect içinde dinamik olarak yüklenir.
 * WebGL2 yoksa ya da sahne yüklenemezse `onHata` çağrılır; sayfa 2B ekranlara döner.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GradeId, LevelId, Topic } from '@/types/curriculum';
import { curriculumData } from '@/curriculum/curriculumData';
import type { AdaSahnesi } from './adaSahnesi';
import {
  ADA_SINIFLARI,
  FENER,
  KADEME_ADALARI,
  kademeAdasi,
  sahneSinifKimligi,
  sinifAdi,
  sinifNumarasi,
  uniteAdi,
  type AdaSayfasiKimligi,
} from './adaEslemeleri';
import s from './adalar.module.css';
import { ilkAcilisAnimasyonuAl } from '@/components/layout/logoAnimasyonu';

const VARLIK_ONEKI = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '';
const RENKLER: Record<string, string> = {
  ...Object.fromEntries(KADEME_ADALARI.map((k) => [k.id, k.renk])),
  [FENER.id]: FENER.renk,
};

interface AdaEkraniProps {
  sayfa: AdaSayfasiKimligi;
  onKademeSec: (kademe: LevelId) => void;
  onFener: () => void;
  onAnaSayfa: () => void;
  /** WebGL2 yok ya da sahne yüklenemedi: 2B ekranlara dönülmeli. */
  onHata: () => void;
}

const ikon = {
  ok: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11m-4.5-4.5L15 10l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  geri: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M16 10H5m4.5-4.5L5 10l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  sifirla: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  kapat: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  disari: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M11 4h5v5m0-5l-6.5 6.5M14 12v3.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  /** EBA taşıyıcı tipi (göz karakteri), animasyonlu: yükleyicide kullanılır. Kaynak: EBA Görsel Kimlik Kılavuzu s. 22. */
  markaCanli: (
    <img src={`${VARLIK_ONEKI}/images/eba/eba-karakter-animasyon.svg`} alt="" width={220} height={220} draggable={false} />
  ),
};

/**
 * Kazanım içerikleri: `scripts/kazanim-icerik-aktar.mjs` üretim panelinin sayfalarını
 * `public/kazanim-icerikleri/` altına kopyalar ve konu kodu → içerikler eşlemesini `liste.json`e yazar.
 * Üretilen her sayfa bir konuya atanır; bir konu birden çok sayfa taşıyabilir (`icerikler`).
 * Liste bir kez, ilk kademe adası açıldığında indirilir; dosya yoksa panel eski boş iletisini gösterir.
 */
interface IcerikSayfasi {
  /** public/kazanim-icerikleri/ altındaki sayfa */
  dosya: string;
  /** Sayfanın anlattığı MEB kazanımı (proje kodlaması MEB'den farklı sıralandığı için ayrı tutulur) */
  kazanimKodu: string;
  kazanimMetni: string;
  unite: string;
  skor: number;
}

interface KazanimIcerigi extends IcerikSayfasi {
  /** Konunun bütün içerikleri; eski tek içerikli listelerde yoktur (kaydın kendisi tek içeriktir) */
  icerikler?: IcerikSayfasi[];
}

/** Konunun içerik sayfaları (eski biçimde tek kayıt da bir öğeli liste olur). */
function konuSayfalari(kayit: KazanimIcerigi | undefined): IcerikSayfasi[] {
  if (!kayit) return [];
  return kayit.icerikler?.length ? kayit.icerikler : [kayit];
}

const KAZANIM_KLASORU = `${VARLIK_ONEKI}/kazanim-icerikleri`;
let kazanimListesiSozu: Promise<Record<string, KazanimIcerigi>> | null = null;

function kazanimListesi(): Promise<Record<string, KazanimIcerigi>> {
  kazanimListesiSozu ??= fetch(`${KAZANIM_KLASORU}/liste.json`)
    .then((yanit) => (yanit.ok ? yanit.json() : null))
    .then((veri) => (veri?.kazanimlar as Record<string, KazanimIcerigi> | undefined) ?? {})
    .catch(() => ({}));
  return kazanimListesiSozu;
}

function webgl2Var(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

// Statik dışa aktarımda bileşen sunucuda da çizilir; layout effect yalnız tarayıcıda kullanılır
const useTarayiciLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const bekle = (ms: number) => new Promise<void>((coz) => setTimeout(coz, ms));
/** En fazla `ms` kadar bekler; kamera odaklanması bitmese de gezinti ilerler. */
const enFazla = (soz: Promise<unknown>, ms: number) => Promise.race([soz, bekle(ms)]);

export function AdaEkrani({ sayfa, onKademeSec, onFener, onAnaSayfa, onHata }: AdaEkraniProps) {
  const ANA = sayfa === 'ana-sayfa';
  const kademe = ANA ? null : kademeAdasi(sayfa);

  const sahneKapRef = useRef<HTMLDivElement>(null);
  const ustRef = useRef<HTMLElement>(null);
  const rihtimRef = useRef<HTMLElement>(null);
  const kontrollerRef = useRef<HTMLDivElement>(null);
  const etiketler = useRef(new Map<string, HTMLDivElement>());
  const sahneRef = useRef<AdaSahnesi | null>(null);
  const gidiliyor = useRef(false);

  // Geri çağırmalar effect'i yeniden başlatmasın diye en güncel hâlleri ref'te tutulur
  const geriCagirmalar = useRef({ onKademeSec, onFener, onAnaSayfa, onHata });
  geriCagirmalar.current = { onKademeSec, onFener, onAnaSayfa, onHata };

  const [hazir, setHazir] = useState(false);
  const [ilerleme, setIlerleme] = useState(0.04);
  const [yukleyiciVar, setYukleyiciVar] = useState(true);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [kurulum, setKurulum] = useState(0);
  const [etkilesildi, setEtkilesildi] = useState(false);
  const [uzerinde, setUzerinde] = useState<string | null>(null);
  const [secili, setSecili] = useState<string | null>(null);
  const [perde, setPerde] = useState(false);
  const [canli, setCanli] = useState('');
  const [panelSinif, setPanelSinif] = useState<GradeId | null>(null);
  const [panelAcik, setPanelAcik] = useState(false);
  const [acikUnite, setAcikUnite] = useState<string | null>(null);
  // Paneldeki açık konu: panel sola genişler, konunun içeriği panelin içinde gösterilir
  const [icerik, setIcerik] = useState<{ uniteId: string; konu: Topic } | null>(null);
  // Kazanım kodu → aktarılmış içerik sayfası (aktarım yapılmadıysa boş kalır)
  const [kazanimlar, setKazanimlar] = useState<Record<string, KazanimIcerigi>>({});
  // Açık konunun birden çok içeriği varsa seçili olanın sırası
  const [icerikSirasi, setIcerikSirasi] = useState(0);
  // Ders sayfası birkaç MB; yüklenene kadar çerçevenin üstünde geometrik yükleme ekranı durur
  const [dersHazir, setDersHazir] = useState(false);
  // Adalar hazır olunca EBA logosunun açılış animasyonu bir kez oynar (uygulama başına tek sefer)
  const [logoCanli, setLogoCanli] = useState(false);
  useEffect(() => {
    if (hazir && ilkAcilisAnimasyonuAl()) setLogoCanli(true);
  }, [hazir]);
  const icerikBaslikRef = useRef<HTMLHeadingElement>(null);
  const icerikAcan = useRef<HTMLElement | null>(null);
  const icerikTemizle = useRef<number | undefined>(undefined);
  // Genişleme/daralma animasyonu için değişimden önceki panel kutusu
  const panelOlcusu = useRef<DOMRect | null>(null);
  const escRef = useRef<() => void>(() => {});
  const panelRef = useRef<HTMLElement>(null);
  const panelAcan = useRef<HTMLElement | null>(null);
  const odakDonusu = useRef<HTMLElement | null>(null);
  const azHareket = useRef(false);
  // Sahne olayları effect kapanışında kalır; güncel panel durumunu ref üzerinden okur
  const bosTiklamaRef = useRef<() => void>(() => {});
  const sinifaGitRef = useRef<(sinif: GradeId) => void>(() => {});

  useEffect(() => {
    azHareket.current = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Ada ekranı tam ekrandır; uygulama başlığı bu sürede gizlenir (globals.css). Layout effect,
  // özniteliğin ekran değişimiyle aynı karede eklenip kaldırılmasını sağlar.
  useTarayiciLayoutEffect(() => {
    document.body.dataset.adaEkrani = '1';
    return () => {
      delete document.body.dataset.adaEkrani;
    };
  }, []);

  // Bileşen söküldükten sonra bekleyen bir geçiş gezinti yapmasın (ör. tarayıcı Geri'si sonrası)
  const bagli = useRef(false);
  useEffect(() => {
    bagli.current = true;
    return () => {
      bagli.current = false;
    };
  }, []);

  // Sahne hazır olana kadar görünmeyen arayüz klavyeyle de erişilemesin (React 18'de inert özelliği yok)
  useEffect(() => {
    for (const oge of [ustRef.current, rihtimRef.current, kontrollerRef.current]) {
      if (oge) oge.inert = !hazir || hataMesaji != null;
    }
  }, [hazir, hataMesaji]);

  useEffect(() => {
    if (panelAcik) return;
    const hedef = odakDonusu.current;
    odakDonusu.current = null;
    if (hedef && document.contains(hedef)) hedef.focus({ preventScroll: true });
  }, [panelAcik]);

  // Aktarılmış kazanım içeriklerinin listesi (ana sayfada panel açılmaz, gerekmez)
  useEffect(() => {
    if (ANA) return;
    let gecerli = true;
    void kazanimListesi().then((liste) => {
      if (gecerli) setKazanimlar(liste);
    });
    return () => {
      gecerli = false;
    };
  }, [ANA]);

  // Başka bir ders (konu ya da konunun başka içeriği) açıldığında çerçeve yeniden yüklenir;
  // yükleme ekranı da baştan görünür
  useEffect(() => {
    setDersHazir(false);
  }, [icerik?.konu.id, icerikSirasi]);

  // Panel açılınca odak panele; Esc önce açık içeriği, sonra paneli kapatır
  useEffect(() => {
    if (!panelAcik) return;
    panelRef.current?.focus({ preventScroll: true });
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') escRef.current();
    };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, [panelAcik, panelSinif]);

  // İçerik açılınca odak içerik başlığına (konu değiştirilirken odak listede kalır)
  const icerikAcik = panelAcik && icerik != null;
  useEffect(() => {
    if (icerikAcik) icerikBaslikRef.current?.focus({ preventScroll: true });
  }, [icerikAcik]);

  // Panel genişleyip daralırken kutu eski boyutundan yenisine süzülür. Konumlama biçimi ve 'auto'
  // yükseklik değiştiği için CSS geçişi çalışmaz; değişimden önce ve sonra ölçülen kutular arasında
  // canlandırılır. Ölçüm yalnız panelGeometrisiDegisecek() çağrıldıktan sonraki ilk çizimde kullanılır.
  useTarayiciLayoutEffect(() => {
    const panel = panelRef.current;
    const once = panelOlcusu.current;
    if (!panel || !once) return;
    panelOlcusu.current = null;
    const sonra = panel.getBoundingClientRect();
    const kap = (panel.offsetParent ?? document.documentElement).getBoundingClientRect();
    const kutu = (r: DOMRect): Keyframe => ({
      top: `${r.top - kap.top}px`,
      left: `${r.left - kap.left}px`,
      right: 'auto',
      bottom: 'auto',
      width: `${r.width}px`,
      height: `${r.height}px`,
      maxHeight: 'none',
      transform: 'none',
    });
    const animasyon = panel.animate([kutu(once), kutu(sonra)], {
      duration: 560,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
    const bitti = () => {
      panel.style.transition = '';
    };
    animasyon.onfinish = bitti;
    animasyon.oncancel = bitti;
  });

  /** Kadraj: sahnenin üst başlık ve alt rıhtımın dışında kalan alana sığması için. */
  const bosluklar = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ust = ustRef.current?.getBoundingClientRect();
    const alt = rihtimRef.current?.getBoundingClientRect();
    // Geniş ekranda başlık sol üst köşede kalır; adalar ortada olduğundan üst boşluk küçük tutulur
    const genis = w >= 1100 && h >= 560;
    const ustBottom = ust?.bottom ?? 0;
    return {
      top: genis ? (ANA ? 24 : Math.min(ustBottom, 110) + 8) : ustBottom + 8,
      // Ana sayfada kademe kartları görünmez (yalnız klavye odağında belirir); alt boşluk gerekmez
      bottom: ANA || !alt ? 16 : Math.max(0, h - alt.top) + 10,
      left: 0,
      right: 0,
    };
  }, [ANA]);

  // ---------------------------------------------------------------------------
  // Sahne yaşam döngüsü
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const kap = sahneKapRef.current;
    if (!kap) return;
    if (!webgl2Var()) {
      geriCagirmalar.current.onHata();
      return;
    }
    let etkin = true;
    const iptal = new AbortController();
    let sahne: AdaSahnesi | null = null;
    const cozucular: Array<() => void> = [];

    setHazir(false);
    setYukleyiciVar(true);
    setHataMesaji(null);
    setIlerleme(0.04);

    (async () => {
      let Sahne: typeof import('./adaSahnesi').AdaSahnesi;
      try {
        ({ AdaSahnesi: Sahne } = await import('./adaSahnesi'));
      } catch (hata) {
        // Parça yüklenemedi (ağ kopması, yeni dağıtımda silinen eski dosya): 2B ekranlara dön
        if (etkin) {
          console.error('Ada sahnesi modülü yüklenemedi', hata);
          geriCagirmalar.current.onHata();
        }
        return;
      }
      if (!etkin) return;
      sahne = new Sahne(kap, {
        sayfa,
        varliklar: `${VARLIK_ONEKI}/adalar/`,
        dracoYolu: `${VARLIK_ONEKI}/adalar/draco/`,
        renkler: kademe ? { ...RENKLER, [sayfa]: kademe.renk } : RENKLER,
        bosluklar,
        etiketAktifSinifi: s['etiket--aktif'],
      });
      sahneRef.current = sahne;

      cozucular.push(
        sahne.dinle('uzerinde', ({ giris }) => setUzerinde(giris ? String(giris.id) : null)),
        sahne.dinle('etkilesim', () => setEtkilesildi(true)),
        sahne.dinle('bosluk', () => bosTiklamaRef.current()),
        sahne.dinle('sec', ({ giris }) => {
          if (giris.tur === 'landmark') void fenereGit();
          else if (giris.tur === 'stage') {
            const hedef = kademeAdasi(String(giris.id));
            if (hedef) void kademeyeGit(hedef.id);
          } else {
            const sinif = sinifNumarasi(giris.id);
            if (sinif != null) sinifaGitRef.current(sinif);
          }
        }),
        sahne.dinle('hata', ({ mesaj, yenile }) => {
          if (yenile) setKurulum((n) => n + 1);
          else setHataMesaji(mesaj);
        })
      );

      try {
        await sahne.yukle((oran) => setIlerleme(Math.max(0.04, oran)), iptal.signal);
      } catch (hata) {
        if (!etkin || (hata instanceof DOMException && hata.name === 'AbortError')) return;
        console.error('Ada sahnesi yüklenemedi', hata);
        geriCagirmalar.current.onHata();
        return;
      }
      if (!etkin) return;

      for (const [kimlik, oge] of etiketler.current) sahne.etiketBagla(kimlik, oge);
      setIlerleme(1);
      setHazir(true);
      setTimeout(() => etkin && setYukleyiciVar(false), 900);
      await sahne.giris();
      if (etkin) sahne.tanit();
    })();

    return () => {
      etkin = false;
      iptal.abort();
      cozucular.forEach((coz) => coz());
      sahne?.dispose();
      sahneRef.current = null;
    };
    // fenereGit/kademeyeGit/sinifaGit yalnız ref'lerdeki güncel geri çağırmaları kullanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sayfa, kurulum, bosluklar]);

  // ---------------------------------------------------------------------------
  // Gezinti
  // ---------------------------------------------------------------------------
  async function gecis(yap: () => void) {
    setPerde(true);
    await bekle(azHareket.current ? 0 : 380);
    if (!bagli.current) return;
    yap();
  }

  async function kademeyeGit(hedef: LevelId) {
    if (gidiliyor.current) return;
    gidiliyor.current = true;
    const ada = kademeAdasi(hedef);
    setCanli(`${ada?.baslik ?? hedef} açılıyor.`);
    const sahne = sahneRef.current;
    if (sahne && ANA) {
      sahne.kilitle(hedef);
      await enFazla(sahne.odaklan(hedef, { sure: 950 }), 1000);
    }
    await gecis(() => geriCagirmalar.current.onKademeSec(hedef));
  }

  /** Sınıf binası ya da düğmesi: sağda ünite panelini açar, kamera binaya yaklaşır. */
  function sinifaGit(sinif: GradeId) {
    if (gidiliyor.current) return;
    const kimlik = sahneSinifKimligi(sinif);
    if (!panelAcik && document.activeElement instanceof HTMLElement) panelAcan.current = document.activeElement;
    window.clearTimeout(icerikTemizle.current);
    if (icerik) {
      if (panelAcik) panelGeometrisiDegisecek();
      setIcerik(null);
      icerikAcan.current = null;
    }
    setSecili(String(kimlik));
    setPanelSinif(sinif);
    setAcikUnite(null);
    setPanelAcik(true);
    const uniteSayisi = sinifUniteleri(sinif).length;
    setCanli(`${sinifAdi(sinif)}: ${uniteSayisi} ünite listelendi.`);
    const sahne = sahneRef.current;
    if (sahne) {
      sahne.kilitle(kimlik);
      // Panel bir sonraki karede yerleşir; boyutu ölçülünce bina panelin açıkta bıraktığı alana alınır
      requestAnimationFrame(() => void sahne.odaklan(kimlik, { kaymaPx: panelKaymasi() }));
    }
  }

  function paneliKapat(odakDon = true) {
    if (!panelAcik) return;
    setPanelAcik(false);
    setSecili(null);
    setAcikUnite(null);
    // Genişlemiş panel olduğu yerde solar; içerik kapanış geçişi bitince kaldırılır
    if (icerik) {
      window.clearTimeout(icerikTemizle.current);
      icerikTemizle.current = window.setTimeout(() => {
        if (bagli.current) setIcerik(null);
      }, 420);
      icerikAcan.current = null;
    }
    const sahne = sahneRef.current;
    if (sahne) {
      sahne.kilitle(null);
      void sahne.sifirla();
    }
    // Odak, panel-acik sınıfı kalkıp rıhtım yeniden görünür olduktan sonra geri verilir (effect)
    odakDonusu.current = odakDon ? panelAcan.current : null;
    panelAcan.current = null;
  }

  /** Açık panelin kapattığı alanı hesaba katarak binanın görüneceği ekran kayması. */
  function panelKaymasi() {
    const r = panelRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    // Panel sağ kenardaysa (geniş ya da alçak ekran) bina sola, alttaysa yukarı kaydırılır
    if (r.left > window.innerWidth * 0.3) return { x: -(r.width + 24) / 2, y: 0 };
    return { x: 0, y: -Math.min(r.height, window.innerHeight * 0.6) / 2 };
  }

  function sinifUniteleri(sinif: GradeId) {
    if (!kademe) return [];
    const grade = curriculumData.levels[kademe.id]?.grades.find((g) => g.gradeNumber === sinif);
    return [...(grade?.themes ?? [])].sort((a, b) => a.orderNumber - b.orderNumber);
  }

  /** Panelin kutusu değişmeden hemen önce çağrılır: eski kutu ölçülür, animasyon sonraki çizimde başlar. */
  function panelGeometrisiDegisecek() {
    const panel = panelRef.current;
    if (!panel || azHareket.current) return;
    panelOlcusu.current = panel.getBoundingClientRect();
    // Sınıf değişimi CSS geçişi başlatmasın; animasyon bitince geri verilir
    panel.style.transition = 'none';
  }

  /** Konu seçildi: panel sola doğru genişler, konunun içeriği panelin içinde açılır. */
  function konuyuAc(uniteId: string, konu: Topic, acan: HTMLElement) {
    icerikAcan.current = acan;
    if (icerik?.konu.id === konu.id) {
      icerikBaslikRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!icerik) panelGeometrisiDegisecek();
    setIcerikSirasi(0);
    setIcerik({ uniteId, konu });
    setCanli(`${konu.title} açıldı.`);
  }

  /** İçeriği kapatır; panel ünite listesi boyutuna döner, odak seçilen konuya geri verilir. */
  function icerigiKapat() {
    if (!icerik) return;
    panelGeometrisiDegisecek();
    setIcerik(null);
    setCanli('İçerik kapatıldı.');
    const hedef = icerikAcan.current;
    icerikAcan.current = null;
    if (hedef) {
      requestAnimationFrame(() => {
        if (document.contains(hedef)) hedef.focus({ preventScroll: true });
      });
    }
  }

  async function fenereGit() {
    if (gidiliyor.current) return;
    gidiliyor.current = true;
    setCanli(`${FENER.ad}: Serbest Çizim Stüdyosu açılıyor.`);
    const sahne = sahneRef.current;
    if (sahne) {
      sahne.kilitle(FENER.id);
      await enFazla(sahne.odaklan(FENER.id, { sure: 1100 }), 1150);
    }
    await gecis(() => geriCagirmalar.current.onFener());
  }

  function anaSayfayaDon() {
    if (gidiliyor.current) return;
    gidiliyor.current = true;
    void gecis(() => geriCagirmalar.current.onAnaSayfa());
  }

  function gorunumuSifirla() {
    if (panelAcik) {
      paneliKapat(false);
      return;
    }
    const sahne = sahneRef.current;
    if (!sahne) return;
    setSecili(null);
    sahne.kilitle(null);
    void sahne.sifirla();
  }

  sinifaGitRef.current = sinifaGit;
  bosTiklamaRef.current = () => {
    if (panelAcik) paneliKapat(false);
  };
  escRef.current = () => {
    if (icerik) icerigiKapat();
    else paneliKapat();
  };

  const vurgula = (kimlik: string | number | null) => {
    if (hazir) sahneRef.current?.vurgula(kimlik);
  };

  const etiketRef = (kimlik: string) => (oge: HTMLDivElement | null) => {
    if (oge) etiketler.current.set(kimlik, oge);
    else etiketler.current.delete(kimlik);
  };

  // ---------------------------------------------------------------------------
  // Görünüm
  // ---------------------------------------------------------------------------
  const kokSiniflari = [
    s.kok,
    hazir && s.hazir,
    etkilesildi && s.etkilesildi,
    ANA && s['ana-sayfa'],
    panelAcik && s['panel-acik'],
    icerikAcik && s['icerik-acik'],
  ]
    .filter(Boolean)
    .join(' ');
  const paneldekiUniteler = panelSinif != null ? sinifUniteleri(panelSinif) : [];
  const icerikUnitesi = icerik ? paneldekiUniteler.find((u) => u.id === icerik.uniteId) : undefined;
  const acikSayfalar = icerik?.konu.code ? konuSayfalari(kazanimlar[icerik.konu.code]) : [];
  const acikKazanim: IcerikSayfasi | undefined = acikSayfalar[icerikSirasi] ?? acikSayfalar[0];
  const icerikAdresi = acikKazanim ? `${KAZANIM_KLASORU}/${encodeURIComponent(acikKazanim.dosya)}` : null;
  const kokStili = kademe ? ({ '--vurgu': kademe.renk } as React.CSSProperties) : undefined;
  const siniflar = kademe ? ADA_SINIFLARI[kademe.id] : [];

  return (
    <div className={kokSiniflari} style={kokStili}>
      <div ref={sahneKapRef} className={s.sahne} aria-hidden="true" />

      <div className={s.etiketler} aria-hidden="true">
        {siniflar.map((sinif) => {
          const kimlik = String(sahneSinifKimligi(sinif));
          return (
            <div key={kimlik} ref={etiketRef(kimlik)} className={`${s.etiket} ${s['etiket--sinif']}`}>
              <button type="button" tabIndex={-1} className={s['etiket-ic']} onClick={() => sinifaGit(sinif)}>
                <span className={s['etiket-ad']}>{sinifAdi(sinif)}</span>
                <span className={s['etiket-ok']}>{ikon.ok}</span>
              </button>
              <span className={s['etiket-sap']} />
            </div>
          );
        })}
      </div>

      <div className={s['ust-golge']} aria-hidden="true" />

      <header ref={ustRef} className={s.ust}>
        <div className={s['ust-sol']}>
          {ANA ? (
            <p className={s.marka}>
              <img
                className={s['marka-logo']}
                src={`${VARLIK_ONEKI}/images/eba/eba-logo-karakter-yatay-koyu-zemin${logoCanli ? '-animasyon-tek' : ''}.svg`}
                alt="EBA"
                width={820}
                height={220}
                draggable={false}
              />
            </p>
          ) : (
            <button type="button" className={s['geri-baglanti']} onClick={anaSayfayaDon}>
              <span>{ikon.geri}</span>
              <span>Tüm adalar</span>
            </button>
          )}
          <h1 className={s.baslik}>{ANA ? 'Matematik Takımadaları' : kademe?.baslik}</h1>
          <p className={s.aciklama}>
            {ANA ? 'Matematiğin yeni rotası' : `${kademe?.aralik} · Ünitelerini görmek için bir sınıf binası seç.`}
          </p>
        </div>
        {!ANA && (
          <nav className={s.sekmeler} aria-label="Kademeler">
            {KADEME_ADALARI.map((k) => (
              <button
                key={k.id}
                type="button"
                className={s.sekme}
                aria-current={k.id === sayfa ? 'page' : undefined}
                style={{ '--sekme-renk': k.renk } as React.CSSProperties}
                onClick={() => {
                  if (k.id === sayfa) {
                    gorunumuSifirla();
                    return;
                  }
                  if (gidiliyor.current) return;
                  gidiliyor.current = true;
                  void gecis(() => geriCagirmalar.current.onKademeSec(k.id));
                }}
              >
                <span className={s['sekme-nokta']} />
                <span>{k.ad}</span>
              </button>
            ))}
          </nav>
        )}
      </header>

      <section aria-labelledby="ada-ekrani-basligi">
        <p id="ada-ekrani-basligi" className={s.gorunmez}>
          {ANA
            ? 'Matematik Takımadaları: İlkokul, Ortaokul ve Lise adaları ile Matematik Feneri.'
            : `${kademe?.baslik}: sınıf binaları`}
        </p>

        {ANA ? (
          <nav ref={rihtimRef} className={`${s.rihtim} ${s['rihtim--kademe']}`} aria-label="Kademe adaları">
            {KADEME_ADALARI.map((k) => (
              <button
                key={k.id}
                type="button"
                className={`${s.kart} ${uzerinde === k.id ? s.aktif : ''}`}
                style={{ '--kart-renk': k.renk } as React.CSSProperties}
                onClick={() => void kademeyeGit(k.id)}
                onPointerEnter={() => vurgula(k.id)}
                onPointerLeave={() => vurgula(null)}
                onFocus={() => vurgula(k.id)}
                onBlur={() => vurgula(null)}
              >
                <span className={s['kart-serit']} aria-hidden="true" />
                <span className={s['kart-govde']}>
                  <span className={s['kart-baslik']}>{k.baslik}</span>
                  <span className={s['kart-aralik']}>{k.aralik}</span>
                </span>
                <span className={s['kart-ok']}>{ikon.ok}</span>
              </button>
            ))}
            <button
              type="button"
              className={s.kart}
              style={{ '--kart-renk': FENER.renk } as React.CSSProperties}
              onClick={() => void fenereGit()}
              onPointerEnter={() => vurgula(FENER.id)}
              onPointerLeave={() => vurgula(null)}
              onFocus={() => vurgula(FENER.id)}
              onBlur={() => vurgula(null)}
            >
              <span className={s['kart-serit']} aria-hidden="true" />
              <span className={s['kart-govde']}>
                <span className={s['kart-baslik']}>{FENER.ad}</span>
                <span className={s['kart-aralik']}>Serbest Çizim Stüdyosu</span>
              </span>
              <span className={s['kart-ok']}>{ikon.ok}</span>
            </button>
          </nav>
        ) : (
          <nav
            ref={rihtimRef}
            className={`${s.rihtim} ${s['rihtim--sinif']}`}
            aria-label={`${kademe?.baslik} sınıfları`}
           
          >
            <ul className={s['sinif-listesi']}>
              {siniflar.map((sinif) => {
                const kimlik = String(sahneSinifKimligi(sinif));
                return (
                  <li key={kimlik}>
                    <button
                      type="button"
                      className={`${s.sinif} ${uzerinde === kimlik ? s.aktif : ''}`}
                      aria-pressed={secili === kimlik}
                      onClick={() => sinifaGit(sinif)}
                      onPointerEnter={() => vurgula(kimlik)}
                      onPointerLeave={() => vurgula(null)}
                      onFocus={() => vurgula(kimlik)}
                      onBlur={() => vurgula(null)}
                    >
                      <span className={s.rozet} aria-hidden="true">
                        {sinif === 0 ? 'H' : sinif}
                      </span>
                      <span className={s['sinif-ad']}>{sinifAdi(sinif)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div ref={kontrollerRef} className={s.kontroller}>
          <button type="button" className={s['yuvarlak-dugme']} aria-label="Görünümü sıfırla" title="Görünümü sıfırla" onClick={gorunumuSifirla}>
            {ikon.sifirla}
          </button>
        </div>

        {!ANA && (
          <aside
            ref={panelRef}
            className={[s.panel, panelAcik && s['panel--acik'], icerik && s['panel--genis']].filter(Boolean).join(' ')}
            role="dialog"
            aria-modal="false"
            aria-labelledby="ada-panel-basligi"
            tabIndex={-1}
            aria-hidden={!panelAcik}
          >
            {panelSinif != null && (
              <>
            <button type="button" className={s['panel-kapat']} aria-label="Kapat" onClick={() => paneliKapat()}>
              {ikon.kapat}
            </button>
            <div className={s['panel-liste']}>
              <p className={s['panel-kademe']}>{kademe?.baslik}</p>
              <div className={s['panel-ust']}>
                <span className={`${s.rozet} ${s['panel-rozet']}`} aria-hidden="true">
                  {panelSinif === 0 ? 'H' : panelSinif}
                </span>
                <div>
                  <h2 id="ada-panel-basligi" className={s['panel-baslik']}>
                    {sinifAdi(panelSinif)}
                  </h2>
                  <p className={s['panel-sayi']}>{paneldekiUniteler.length} ünite</p>
                </div>
              </div>
              <ul className={s['unite-listesi']} aria-label={`${sinifAdi(panelSinif)} üniteleri`}>
                {paneldekiUniteler.map((unite) => {
                  const acik = acikUnite === unite.id;
                  return (
                    <li
                      key={unite.id}
                      className={`${s.unite} ${acik ? s['unite--acik'] : ''}`}
                      style={{ '--unite-renk': unite.colorTheme } as React.CSSProperties}
                    >
                      <button
                        type="button"
                        className={s['unite-dugme']}
                        aria-expanded={acik}
                        aria-controls={`${unite.id}-konular`}
                        onClick={() => setAcikUnite(acik ? null : unite.id)}
                      >
                        <span className={s['unite-no']} aria-hidden="true">
                          {unite.orderNumber}
                        </span>
                        <span className={s['unite-metin']}>
                          <span className={s['unite-ad']}>{uniteAdi(unite.themeName || unite.fullTitle)}</span>
                          <span className={s['unite-bilgi']}>
                            {unite.topics.length} konu · {unite.lessonHours} ders saati
                          </span>
                        </span>
                        <span className={s['unite-ok']}>{ikon.ok}</span>
                      </button>
                      {acik && (
                        <ul id={`${unite.id}-konular`} className={s['konu-listesi']}>
                          {unite.topics.map((konu) => {
                            const sayfaSayisi = konu.code ? konuSayfalari(kazanimlar[konu.code]).length : 0;
                            return (
                              <li key={konu.id}>
                                <button
                                  type="button"
                                  className={s.konu}
                                  aria-current={icerik?.konu.id === konu.id ? 'true' : undefined}
                                  onClick={(e) => konuyuAc(unite.id, konu, e.currentTarget)}
                                >
                                  <span>{konu.title}</span>
                                  {sayfaSayisi > 1 && (
                                    <span className={s['konu-sayi']} title={`${sayfaSayisi} içerik`}>
                                      {sayfaSayisi} içerik
                                    </span>
                                  )}
                                  <span className={s['konu-ok']}>{ikon.ok}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            {icerik && (
              <section key={icerik.konu.id} className={s.icerik} aria-labelledby="ada-icerik-basligi">
                <div className={s['icerik-ust']}>
                  <button
                    type="button"
                    className={s['icerik-geri']}
                    aria-label="İçeriği kapat"
                    title="Ünite listesine dön"
                    onClick={icerigiKapat}
                  >
                    {ikon.geri}
                  </button>
                  <div className={s['icerik-baslik-grubu']}>
                    <p className={s['icerik-yol']}>
                      {sinifAdi(panelSinif)}
                      {icerikUnitesi ? ` · ${uniteAdi(icerikUnitesi.themeName || icerikUnitesi.fullTitle)}` : ''}
                    </p>
                    <h3 id="ada-icerik-basligi" ref={icerikBaslikRef} tabIndex={-1} className={s['icerik-baslik']}>
                      {icerik.konu.title}
                    </h3>
                    {acikKazanim && (
                      <p className={s['icerik-kazanim']} title={acikKazanim.kazanimMetni}>
                        {acikKazanim.kazanimKodu} · {acikKazanim.kazanimMetni}
                      </p>
                    )}
                  </div>
                  {icerikAdresi && (
                    <a
                      className={s['icerik-disari']}
                      href={icerikAdresi}
                      target="_blank"
                      rel="noreferrer"
                      title="İçeriği yeni sekmede aç"
                    >
                      {ikon.disari}
                      <span>Yeni sekmede</span>
                    </a>
                  )}
                </div>
                {acikSayfalar.length > 1 && (
                  <div className={s['icerik-secici']} role="tablist" aria-label={`${icerik.konu.title} içerikleri`}>
                    {acikSayfalar.map((sayfa, sira) => (
                      <button
                        key={sayfa.dosya}
                        type="button"
                        role="tab"
                        aria-selected={sayfa === acikKazanim}
                        className={s['icerik-secici-dugme']}
                        title={sayfa.kazanimMetni}
                        onClick={() => {
                          if (sayfa === acikKazanim) return;
                          setIcerikSirasi(sira);
                          setCanli(`${sira + 1}. içerik açıldı: ${sayfa.kazanimKodu}.`);
                        }}
                      >
                        <span className={s['icerik-secici-no']}>{sira + 1}</span>
                        <span className={s['icerik-secici-kod']}>{sayfa.kazanimKodu}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Aktarılmış kazanım sayfası (konu kimliği: data-konu); yoksa boş ileti kalır */}
                <div
                  className={`${s['icerik-alani']} ${icerikAdresi ? s['icerik-alani--sayfa'] : ''}`}
                  data-konu={icerik.konu.id}
                  data-kazanim={icerik.konu.code}
                >
                  {icerikAdresi ? (
                    <>
                      <iframe
                        key={icerikAdresi}
                        className={`${s['icerik-cerceve']} ${dersHazir ? s['icerik-cerceve--hazir'] : ''}`}
                        src={icerikAdresi}
                        title={`${icerik.konu.title} içeriği`}
                        allow="fullscreen; autoplay; microphone"
                        onLoad={() => setDersHazir(true)}
                        onError={() => setDersHazir(true)}
                      />
                      {!dersHazir && (
                        <div className={s['ders-yukleniyor']} role="status">
                          <span className={s['ders-logo']}>{ikon.markaCanli}</span>
                          <p className={s['ders-yukleme-yazi']}>Etkinlik hazırlanıyor…</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className={s['icerik-bos']}>Bu kazanımın içeriği henüz eklenmedi.</p>
                  )}
                </div>
              </section>
            )}
              </>
            )}
          </aside>
        )}

        <p className={s.gorunmez} aria-live="polite">
          {canli}
        </p>
      </section>

      {(yukleyiciVar || hataMesaji) && (
        <div
          className={[s.yukleyici, hazir && !hataMesaji && s['yukleyici--kapan'], hataMesaji && s['yukleyici--hata']]
            .filter(Boolean)
            .join(' ')}
          role="status"
        >
          <div className={s['yukleyici-ic']}>
            <span className={s['yukleyici-ikon']}>{ikon.markaCanli}</span>
            <p className={s['yukleyici-baslik']}>{ANA ? 'Matematik Takımadaları' : kademe?.baslik}</p>
            <p className={s['yukleyici-durum']}>{hataMesaji ?? 'Adalar hazırlanıyor…'}</p>
            {hataMesaji ? (
              <button type="button" className={`${s.dugme} ${s['dugme--birincil']}`} onClick={() => setKurulum((n) => n + 1)}>
                Yeniden dene
              </button>
            ) : (
              <div className={s.ilerleme} aria-hidden="true">
                <span className={s['ilerleme-dolgu']} style={{ transform: `scaleX(${ilerleme.toFixed(3)})` }} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className={`${s.perde} ${perde ? s['perde--acik'] : ''}`} aria-hidden="true" />
    </div>
  );
}
