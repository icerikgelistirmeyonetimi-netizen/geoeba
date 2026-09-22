"use client";

/**
 * 3B Sınıf — Serbest Çizim Stüdyosu'nun (#/studyo) açılış deneyimi.
 *
 * Akış (akis.ts): sınıf modeli inerken ada yükleyicisi ('yukleniyor'); kamera arka sıradan
 * akıllı tahtanın karşısına yürür, tahtadaki ekran DOM olarak çizilip her karede homografiyle
 * 3B dörtgene oturtulur ('yaklasma'); kamera varınca ekran izdüşüm dikdörtgeninden tüm görünüm
 * alanına büyür, 3B katman solar ve sahne söker ('devir'); "EBA yükleniyor" açılışı biter
 * ('acilis'); masaüstü belirir ('masaustu') ve Çizim Stüdyosu bir pencerede kendiliğinden
 * açılır ('uygulama'). Masaüstünde kayıt defterindeki (uygulamalar.tsx) uygulamalar birden çok
 * pencerede yan yana çalışır; pencere durumu/z sırası akis.ts'te, gövdeler tembel yüklenir.
 *
 * Motor (sinifSahnesi.ts) yalnız tarayıcıda, dinamik içe aktarmayla yüklenir; modül ya da model
 * varlıkları yoksa, WebGL2 yoksa ya da motor hata verirse 3B atlanır: açılış tam ekranda başlar.
 * Kullanıcı stüdyoya her durumda ulaşır.
 */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { AcilisEkrani } from "./AcilisEkrani";
import { Masaustu, type OdakIstegi } from "./Masaustu";
import { UygulamaPenceresi } from "./UygulamaPenceresi";
import {
  BASLANGIC_DURUMU,
  SURELER,
  akisIndirgeyici,
  atlanabilir,
  masaustunde,
  ondekiPencere,
  pencereKatmani,
  type PencereKonumu,
} from "./akis";
import { CIZIM_KIMLIGI, UYGULAMALAR, uygulamaBul } from "./uygulamalar";
import { homografi, type Kose } from "./homografi";
import s from "./sinif.module.css";

const VARLIK_ONEKI = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "";
/** Ekran katmanının mantıksal boyutu (sinif.module.css --ekran-w/--ekran-h ile aynı) */
const EKRAN_W = 1920;
const EKRAN_H = 1080;

/**
 * Motor arayüzü — sinifSahnesi.ts başka bir ajan tarafından yazılır; kabuk yalnız bu
 * arayüze göre kodlanır (tip bağımlılığı yok: dosya henüz yokken de derlenir).
 */
interface SinifSahnesiArayuzu {
  yukle(
    ilerleme?: (oran: number) => void,
    sinyal?: AbortSignal,
  ): Promise<unknown>;
  giris(): Promise<void>;
  yaklas(o?: { sure?: number }): Promise<boolean>;
  atla(): void;
  ekranDikdortgeni(): { x: number; y: number; w: number; h: number } | null;
  ekranParlakligi(oran: number): void;
  dinle(ad: "hata", fn: (d: { mesaj: string }) => void): () => void;
  dispose(): void;
}

interface SinifSahnesiSecenekleri {
  varliklar: string;
  dracoYolu: string;
  onEkran?: (koseler: [number, number][] | null) => void;
}

type SinifSahnesiKurucu = new (
  kap: HTMLElement,
  secenek: SinifSahnesiSecenekleri,
) => SinifSahnesiArayuzu;

/**
 * Motor modülünü dinamik olarak yükler. Yol şablon dizesiyle verilir: webpack bu dizin için
 * yalnız sinifSahnesi dosyasını içeren bir bağlam üretir; dosya yoksa derleme kırılmaz,
 * içe aktarma çalışma anında reddedilir ve 3B'siz yola düşülür.
 */
async function motoruYukle(): Promise<SinifSahnesiKurucu | null> {
  const ad = ["sinif", "Sahnesi"].join("");
  try {
    const modul: { SinifSahnesi?: unknown } = await import(
      /* webpackInclude: /sinifSahnesi\.tsx?$/ */
      /* webpackChunkName: "sinif-sahnesi" */
      `./${ad}`
    );
    return typeof modul?.SinifSahnesi === "function"
      ? (modul.SinifSahnesi as SinifSahnesiKurucu)
      : null;
  } catch (hata) {
    console.warn("Sınıf sahnesi motoru yüklenemedi; 3B atlanıyor.", hata);
    return null;
  }
}

/**
 * WebGL2 sondası: sonuç modül düzeyinde önbelleğe alınır (sayfa başına tek sonda) ve sonda
 * bağlamı hemen bırakılır. Aksi halde StrictMode'da her bağlanış iki sızan bağlam bırakıyor,
 * #/home ↔ #/studyo gidiş gelişlerinde Chrome'un 16 bağlam sınırına ulaşılıyordu.
 */
let webgl2Sonucu: boolean | null = null;
function webgl2Var(): boolean {
  if (webgl2Sonucu !== null) return webgl2Sonucu;
  try {
    const kanvas = document.createElement("canvas");
    kanvas.width = 1;
    kanvas.height = 1;
    const gl = kanvas.getContext("webgl2");
    webgl2Sonucu = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2Sonucu = false;
  }
  return webgl2Sonucu;
}

// Statik dışa aktarımda bileşen sunucuda da çizilir; layout effect yalnız tarayıcıda kullanılır
const useTarayiciLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const ikon = {
  atla: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 5l6 5-6 5zM12 5h2v10h-2z" fill="currentColor" />
    </svg>
  ),
  markaCanli: (
    <img
      src={`${VARLIK_ONEKI}/images/eba/eba-karakter-animasyon.svg`}
      alt=""
      width={220}
      height={220}
      draggable={false}
    />
  ),
};

/**
 * Pencere kabuğu (başlık çubuğu + boş içerik) hemen çizilir; ağır uygulama gövdesi bir sonraki
 * karede bağlanır (tıklamanın anında karşılığı olsun). Kapanınca sökülür (uygulama durumu
 * localStorage'da / WorkspaceContext'te kalır).
 */
function SonrakiKarede({ children }: { children: React.ReactNode }) {
  const [hazir, setHazir] = useState(false);
  useEffect(() => {
    const kare = requestAnimationFrame(() => setHazir(true));
    return () => cancelAnimationFrame(kare);
  }, []);
  return hazir ? <>{children}</> : null;
}

export interface SinifEkraniProps {
  /** "Adalara dön": sınıftan çıkılır (perde solduktan sonra çağrılır) */
  onAnaSayfa: () => void;
}

export function SinifEkrani({ onAnaSayfa }: SinifEkraniProps) {
  const [d, gonder] = useReducer(akisIndirgeyici, BASLANGIC_DURUMU);
  const dRef = useRef(d);
  dRef.current = d;

  const kokRef = useRef<HTMLDivElement>(null);
  const sahneKapRef = useRef<HTMLDivElement>(null);
  const ekranRef = useRef<HTMLDivElement>(null);
  /** Devirde --acilis-birim'i büyüme animasyonuna bağlayan rAF döngüsü (sökülürken iptal) */
  const birimKaresi = useRef(0);
  useEffect(() => () => cancelAnimationFrame(birimKaresi.current), []);
  const sahneRef = useRef<SinifSahnesiArayuzu | null>(null);
  const iptalRef = useRef<AbortController | null>(null);
  // Homografi yalnız yaklaşma sırasında uygulanır; devirde ekran katmanı serbest bırakılır
  const homografiEtkin = useRef(false);
  const devirdenGeldi = useRef(false);
  const azHareket = useRef(false);
  const bagli = useRef(false);
  const onAnaSayfaRef = useRef(onAnaSayfa);
  onAnaSayfaRef.current = onAnaSayfa;

  const [ilerleme, setIlerleme] = useState(0.04);
  const [yukleyiciVar, setYukleyiciVar] = useState(true);
  const [sahneSoluk, setSahneSoluk] = useState(false);
  const [acilisIlerleme, setAcilisIlerleme] = useState({ hedef: 0, sure: 0 });
  const [acilisDurum, setAcilisDurum] = useState("EBA yükleniyor…");
  // Klavye odağı: küçült → görev çubuğu düğmesi, kapat → masaüstü kısayolu; yeniden aç → pencere
  const [odakIstegi, setOdakIstegi] = useState<OdakIstegi | null>(null);
  const [pencereOdak, setPencereOdak] = useState<{ id: string; sayac: number }>(
    { id: "", sayac: 0 },
  );
  const [perde, setPerde] = useState(false);
  const [canli, setCanli] = useState("Sınıf hazırlanıyor.");

  useEffect(() => {
    bagli.current = true;
    azHareket.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => {
      bagli.current = false;
    };
  }, []);

  // Sınıf ekranı tam ekrandır; uygulama başlığı bu sürede gizlenir (globals.css)
  useTarayiciLayoutEffect(() => {
    document.body.dataset.sinifEkrani = "1";
    return () => {
      delete document.body.dataset.sinifEkrani;
    };
  }, []);

  /** Motorun her karede verdiği EKRAN köşelerini ekran katmanına homografi olarak uygular. */
  const ekranaOturt = useCallback((koseler: [number, number][] | null) => {
    const ekran = ekranRef.current;
    if (!ekran || !homografiEtkin.current) return;
    if (!koseler || koseler.length !== 4) {
      ekran.style.visibility = "hidden";
      return;
    }
    const donusum = homografi(EKRAN_W, EKRAN_H, koseler as Kose[]);
    if (donusum === "none") {
      ekran.style.visibility = "hidden";
      return;
    }
    ekran.style.visibility = "visible";
    ekran.style.transform = donusum;
  }, []);

  const motoruSok = useCallback(() => {
    homografiEtkin.current = false;
    iptalRef.current?.abort();
    iptalRef.current = null;
    const sahne = sahneRef.current;
    sahneRef.current = null;
    try {
      sahne?.dispose();
    } catch (hata) {
      console.warn("Sınıf sahnesi sökülürken hata", hata);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Motor yaşam döngüsü: yükle → giriş → yaklaş → (varış) → devir
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const kap = sahneKapRef.current;
    if (!kap) return;
    let etkin = true;
    const iptal = new AbortController();
    iptalRef.current = iptal;
    const surer = () => etkin && bagli.current && dRef.current.ucBoyut;
    const ucBoyutsuz = () => {
      if (etkin) gonder({ tur: "UCBOYUT_YOK" });
    };

    if (!webgl2Var()) {
      ucBoyutsuz();
      return;
    }

    let hataCoz: (() => void) | undefined;
    (async () => {
      const Motor = await motoruYukle();
      if (!surer()) return;
      if (!Motor) {
        ucBoyutsuz();
        return;
      }
      let sahne: SinifSahnesiArayuzu;
      try {
        sahne = new Motor(kap, {
          varliklar: `${VARLIK_ONEKI}/sinif/`,
          dracoYolu: `${VARLIK_ONEKI}/adalar/draco/`,
          onEkran: ekranaOturt,
        });
      } catch (hata) {
        console.error("Sınıf sahnesi kurulamadı", hata);
        ucBoyutsuz();
        return;
      }
      sahneRef.current = sahne;
      hataCoz = sahne.dinle("hata", ({ mesaj }) => {
        console.error("Sınıf sahnesi hatası:", mesaj);
        // Masaüstüne geçilmediyse 3B'siz yola düşülür (devir sonrası sahne zaten sökülür)
        if (
          dRef.current.faz === "yukleniyor" ||
          dRef.current.faz === "yaklasma"
        )
          ucBoyutsuz();
      });

      try {
        await sahne.yukle((oran) => {
          if (surer()) setIlerleme(Math.max(0.04, Math.min(1, oran)));
        }, iptal.signal);
      } catch (hata) {
        if (
          !etkin ||
          (hata instanceof DOMException && hata.name === "AbortError")
        )
          return;
        console.error("Sınıf sahnesi yüklenemedi", hata);
        ucBoyutsuz();
        return;
      }
      if (!surer()) return;

      setIlerleme(1);
      homografiEtkin.current = true;
      gonder({ tur: "MODEL_YUKLENDI" });
      setCanli("Sınıf hazır. Akıllı tahtaya yaklaşılıyor.");
      sahne.ekranParlakligi(0.15);

      // Perde açılırken kamera 0,4 s durağan kalır
      await sahne.giris();
      if (!surer()) return;
      const vardi = await sahne.yaklas({
        sure: azHareket.current ? 0 : SURELER.YAKLASMA,
      });
      if (!surer() || !vardi) return;
      gonder({ tur: "KAMERA_VARDI" });
    })();

    return () => {
      etkin = false;
      iptal.abort();
      hataCoz?.();
      motoruSok();
    };
    // Motor yalnız bir kez kurulur; geri çağırmalar ref üzerinden okunur
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3B katman devre dışı kalınca (atla, hata, devir bitti) sahne sökülür ve GPU boşalır
  useEffect(() => {
    if (d.ucBoyut) return;
    motoruSok();
  }, [d.ucBoyut, motoruSok]);

  // Yükleyici: yukleniyor fazı bitince 0,45 s solup kaldırılır (sinif.module.css .yukleyici)
  useEffect(() => {
    if (d.faz === "yukleniyor") return;
    const t = window.setTimeout(() => setYukleyiciVar(false), 550);
    return () => window.clearTimeout(t);
  }, [d.faz]);

  // Yaklaşma: ekran koyu başlar, 0,6 s sonra açılış logosu belirir; ilerleme çubuğu yürüyüş
  // boyunca %80'e kadar dolar; herhangi bir tuş yaklaşmayı hızla bitirir
  useEffect(() => {
    if (d.faz !== "yaklasma") return;
    const sure = azHareket.current ? 0 : SURELER.YAKLASMA;
    const gecikme = azHareket.current ? 0 : SURELER.ACILIS_LOGO_GECIKME;
    setAcilisDurum("EBA yükleniyor…");
    const logo = window.setTimeout(() => {
      gonder({ tur: "ACILIS_LOGO" });
      setAcilisIlerleme({ hedef: 0.8, sure: Math.max(0, sure - gecikme) });
      sahneRef.current?.ekranParlakligi(0.6);
      setCanli("EBA yükleniyor.");
    }, gecikme);
    const tus = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.altKey || e.ctrlKey || e.metaKey) return;
      sahneRef.current?.atla();
    };
    document.addEventListener("keydown", tus);
    return () => {
      window.clearTimeout(logo);
      document.removeEventListener("keydown", tus);
    };
  }, [d.faz]);

  // Devir: ekran katmanı homografiden çıkar, izdüşüm dikdörtgeninden tüm görünüm alanına büyür;
  // 3B katman solar, süre dolunca sahne sökülür
  useEffect(() => {
    if (d.faz !== "devir") return;
    devirdenGeldi.current = true;
    homografiEtkin.current = false;
    const ekran = ekranRef.current;
    const kok = kokRef.current;
    const sahne = sahneRef.current;
    const sure = azHareket.current ? 0 : SURELER.DEVIR;
    sahne?.ekranParlakligi(1);
    if (ekran && kok) {
      const r = sahne?.ekranDikdortgeni() ?? {
        x: 0,
        y: 0,
        w: kok.clientWidth,
        h: kok.clientHeight,
      };
      // Açılış içeriğinin ölçeği izdüşüm genişliğinden (r.w/100) varıştaki birime — tam ekranın
      // min(1cqw, 2cqh)'si, masaüstü duvar logosunun birimi — ekranın büyüme animasyonunun GERÇEK
      // ilerlemesiyle taşınır, animasyon bitince kaldırılır: logo ne devirde sıçrar ne de açılıştan
      // masaüstüne geçişte (sinif.module.css --acilis-birim). Döngü fazdan bağımsızdır (devir biter,
      // animasyon ağır karelerde gecikebilir); kendini animasyon bitince sonlandırır.
      const baslangicBirimi = r.w / 100;
      const varisBirimi = Math.min(kok.clientWidth, 2 * kok.clientHeight) / 100;
      cancelAnimationFrame(birimKaresi.current);
      ekran.style.transform = "";
      ekran.style.visibility = "visible";
      ekran.style.left = "0px";
      ekran.style.top = "0px";
      ekran.style.width = "100%";
      ekran.style.height = "100%";
      ekran.style.pointerEvents = "auto";
      ekran.style.willChange = "auto";
      if (sure > 0 && typeof ekran.animate === "function") {
        ekran.style.setProperty("--acilis-birim", `${baslangicBirimi.toFixed(2)}px`);
        const buyume = ekran.animate(
          [
            {
              left: `${r.x}px`,
              top: `${r.y}px`,
              width: `${r.w}px`,
              height: `${r.h}px`,
            },
            { left: "0px", top: "0px", width: "100%", height: "100%" },
          ],
          { duration: sure, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        );
        const adim = () => {
          const ilerleme = buyume.effect?.getComputedTiming().progress;
          if (buyume.playState !== "running" || ilerleme == null) {
            ekran.style.removeProperty("--acilis-birim");
            return;
          }
          ekran.style.setProperty(
            "--acilis-birim",
            `${(baslangicBirimi + (varisBirimi - baslangicBirimi) * ilerleme).toFixed(2)}px`,
          );
          birimKaresi.current = requestAnimationFrame(adim);
        };
        birimKaresi.current = requestAnimationFrame(adim);
      } else {
        ekran.style.removeProperty("--acilis-birim");
      }
    }
    setSahneSoluk(true);
    setAcilisIlerleme({ hedef: 0.9, sure });
    const t = window.setTimeout(() => gonder({ tur: "DEVIR_BITTI" }), sure);
    return () => window.clearTimeout(t);
  }, [d.faz]);

  // Açılış: devirden geldiyse ~0,5 s daha sürer; 3B'siz yolda tam süre. Sonunda masaüstü
  useEffect(() => {
    if (d.faz !== "acilis") return;
    const tam = !devirdenGeldi.current;
    const sure = azHareket.current
      ? 200
      : tam
        ? SURELER.ACILIS_TAM_EKRAN
        : SURELER.ACILIS_DEVIR_SONRASI;
    setAcilisIlerleme({ hedef: 1, sure });
    const metin = window.setTimeout(
      () => {
        setAcilisDurum("Masaüstü hazırlanıyor…");
        setCanli("Masaüstü hazırlanıyor.");
      },
      tam ? sure * 0.55 : 0,
    );
    const bitis = window.setTimeout(
      () => gonder({ tur: "ACILIS_BITTI" }),
      sure,
    );
    return () => {
      window.clearTimeout(metin);
      window.clearTimeout(bitis);
    };
  }, [d.faz]);

  // Masaüstü belirdikten ~0,5 s sonra yalnız Çizim Stüdyosu kendiliğinden açılır (bir kez)
  useEffect(() => {
    if (d.faz !== "masaustu" || d.otomatikAcildi) return;
    setCanli("Masaüstü hazır.");
    const t = window.setTimeout(
      () => gonder({ tur: "PENCERE_AC", id: CIZIM_KIMLIGI }),
      azHareket.current ? 0 : SURELER.OTOMATIK_PENCERE,
    );
    return () => window.clearTimeout(t);
  }, [d.faz, d.otomatikAcildi]);

  // Öndeki pencere değişince ekran okuyucuya duyurulur
  const ondeki = ondekiPencere(d);
  const ondekiId = ondeki?.id ?? null;
  useEffect(() => {
    if (!ondekiId) return;
    const u = uygulamaBul(ondekiId);
    if (u) setCanli(`${u.ad} önde.`);
  }, [ondekiId]);

  // ---------------------------------------------------------------------------
  // Eylemler
  // ---------------------------------------------------------------------------
  const atla = useCallback(() => {
    setCanli("Giriş atlandı. Masaüstü hazır.");
    gonder({ tur: "ATLA" });
  }, []);

  const yaklasmayiHizlandir = useCallback(() => {
    sahneRef.current?.atla();
  }, []);

  const kisaAd = (id: string) => uygulamaBul(id)?.kisaAd ?? id;
  const uygulamaAc = useCallback((id: string) => {
    gonder({ tur: "PENCERE_AC", id });
    // Pencere zaten açıksa da odak pencereye döner (Başlat menüsünden seçildiğinde menü sökülür)
    setPencereOdak((o) => ({ id, sayac: o.sayac + 1 }));
  }, []);
  const pencereOdakla = useCallback(
    (id: string) => gonder({ tur: "PENCERE_ODAK", id }),
    [],
  );
  const pencereKucult = useCallback((id: string) => {
    gonder({ tur: "PENCERE_KUCULT", id });
    setOdakIstegi((o) => ({ hedef: "gorev", id, sayac: (o?.sayac ?? 0) + 1 }));
    setCanli(`${kisaAd(id)} küçültüldü.`);
  }, []);
  const pencereKapat = useCallback((id: string) => {
    gonder({ tur: "PENCERE_KAPAT", id });
    setOdakIstegi((o) => ({
      hedef: "kisayol",
      id,
      sayac: (o?.sayac ?? 0) + 1,
    }));
    setCanli(`${kisaAd(id)} kapatıldı.`);
  }, []);
  const pencereBuyut = useCallback(
    (id: string) => gonder({ tur: "PENCERE_BUYUT", id }),
    [],
  );
  const pencereTasi = useCallback(
    (id: string, konum: PencereKonumu) =>
      gonder({ tur: "PENCERE_TASI", id, konum }),
    [],
  );
  const baslatMenusu = useCallback(
    (acik: boolean) => gonder({ tur: "BASLAT_MENUSU", acik }),
    [],
  );

  const adalaraDon = useCallback(() => {
    if (perde) return;
    gonder({ tur: "BASLAT_MENUSU", acik: false });
    setPerde(true);
    setCanli("Adalara dönülüyor.");
    window.setTimeout(
      () => {
        if (bagli.current) onAnaSayfaRef.current();
      },
      azHareket.current ? 0 : SURELER.CIKIS_PERDESI,
    );
  }, [perde]);

  // ---------------------------------------------------------------------------
  // Görünüm
  // ---------------------------------------------------------------------------
  const ekranTam = !d.ucBoyut;
  const ekranSiniflari = [
    s.ekran,
    ekranTam && s["ekran--tam"],
    // 3B'de ilk köşeler gelene kadar gizli (ekranaOturt satır içi visibility ile açar); devirde serbest
    d.ucBoyut && d.faz !== "devir" && s["ekran--gizli"],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={kokRef} className={s.kok} data-sinif-ekrani data-faz={d.faz}>
      {d.ucBoyut && (
        <div
          ref={sahneKapRef}
          className={`${s.sahne} ${sahneSoluk ? s["sahne--soluk"] : ""}`}
          aria-hidden="true"
        />
      )}

      {d.ucBoyut && d.faz === "yaklasma" && (
        <div
          className={s.yakalayici}
          onPointerDown={yaklasmayiHizlandir}
          aria-hidden="true"
        />
      )}

      <div ref={ekranRef} className={ekranSiniflari} data-ekran-katmani>
        {d.ekran !== "masaustu" && (
          <AcilisEkrani
            logoGorunur={d.ekran === "acilis"}
            ilerleme={acilisIlerleme.hedef}
            sure={acilisIlerleme.sure}
            durum={acilisDurum}
          />
        )}
        {masaustunde(d.faz) && (
          <Masaustu
            uygulamalar={UYGULAMALAR}
            pencereler={d.pencereler}
            ondeki={ondekiId}
            baslatMenusu={d.baslatMenusu}
            onBaslatMenusu={baslatMenusu}
            onUygulamaAc={uygulamaAc}
            onAdalaraDon={adalaraDon}
            odakIstegi={odakIstegi}
          >
            {/* DOM sırası açılış sırasıdır (z sırası yalnız katman/z-index ile): odak/tıklama sırasında
                düğüm taşınırsa tarayıcı click olayını düşürür (mousedown-mouseup aynı düğümde kalmalı) */}
            {[...d.pencereler]
              .sort((a, b) => a.sira - b.sira)
              .map((p) => {
                const u = uygulamaBul(p.id);
                if (!u) return null;
                const { Bilesen, MenuCubugu } = u;
                return (
                  <UygulamaPenceresi
                    key={p.id}
                    id={p.id}
                    baslik={u.ad}
                    simge={u.simge}
                    renk={u.renk}
                    durum={p.durum}
                    buyuk={p.buyuk}
                    onde={ondekiId === p.id}
                    katman={pencereKatmani(d, p.id)}
                    sira={p.sira}
                    konum={p.konum}
                    odakSayaci={pencereOdak.id === p.id ? pencereOdak.sayac : 0}
                    onOdak={() => pencereOdakla(p.id)}
                    onKucult={() => pencereKucult(p.id)}
                    onBuyutDegistir={() => pencereBuyut(p.id)}
                    onKapat={() => pencereKapat(p.id)}
                    onTasi={(konum) => pencereTasi(p.id, konum)}
                    menuCubugu={
                      MenuCubugu ? (
                        <SonrakiKarede>
                          <MenuCubugu />
                        </SonrakiKarede>
                      ) : undefined
                    }
                  >
                    <SonrakiKarede>
                      <Bilesen />
                    </SonrakiKarede>
                  </UygulamaPenceresi>
                );
              })}
          </Masaustu>
        )}
      </div>

      {atlanabilir(d.faz) && (
        <button type="button" className={`${s.atla} ${s.kabuk}`} onClick={atla}>
          <span>Atla</span>
          {ikon.atla}
        </button>
      )}

      {yukleyiciVar && d.ucBoyut && (
        <div
          className={[
            s.yukleyici,
            s.kabuk,
            d.faz !== "yukleniyor" && s["yukleyici--kapan"],
          ]
            .filter(Boolean)
            .join(" ")}
          role="status"
        >
          <div className={s["yukleyici-ic"]}>
            <span className={s["yukleyici-ikon"]}>{ikon.markaCanli}</span>
            <p className={`${s["yukleyici-baslik"]} ${s["baslik-yazi"]}`}>
              Matematik Sınıfı
            </p>
            <p className={s["yukleyici-durum"]}>Sınıf hazırlanıyor…</p>
            <div className={s.ilerleme} aria-hidden="true">
              <span
                className={s["ilerleme-dolgu"]}
                style={{ transform: `scaleX(${ilerleme.toFixed(3)})` }}
              />
            </div>
          </div>
        </div>
      )}

      <p className={s.gorunmez} aria-live="polite">
        {canli}
      </p>

      <div
        className={`${s.perde} ${perde ? s["perde--acik"] : ""}`}
        aria-hidden="true"
      />
    </div>
  );
}
