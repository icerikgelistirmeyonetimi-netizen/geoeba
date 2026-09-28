'use client';

/**
 * Veri ve Grafik — başlangıç penceresi ("Nasıl başlayalım?"): uygulamanın her açılışında ve araç çubuğundaki "Örnek
 * veri" / "Veri topla" düğmelerinde açılan kipli diyalog; Veri topla panelinin kendi "Ne araştıralım?" görünümünün
 * yerini alır (paneldeki ‹ de buraya gelir). Dört adımı vardır:
 * - 'secim': üç büyük kart — Örnek veri (hazır tablolar), Veri topla (anket · ölçüm · deney), Boş tablo (kendi verinizi
 *   yazın); altta şimdiki tablonun adı ve "Bu tabloyla devam et" (pencereyi kapatır; tablo olduğu gibi kalır).
 * - 'hazir': örnek galerisi (OrnekGalerisi; en üstte varsa "Önceki tabloya dön"). Bir örneğe dokunmak onu Tablom'a yükler
 *   ve pencereyi kapatır (C: `onOrnekYukle`). Galeri bir menüdür: ok tuşları öğeler arasında dolaşır.
 * - 'topla': "Ne araştıralım?" (SoruAdimi: 18 hazır soru, bağlı / son araştırma kartı, "Kendi sorunu yaz"). Hazır kart
 *   planı varsayılanlarla uygular; C paneli Topla görünümünde açar ve pencereyi kapatır (`onPlaniUygula`). Plan isteyen
 *   kart ("Oylama": aday adları) 'plan' adımına geçer. Bağlı araştırmanın kendi kartı yeni tablo açmaz, toplamaya döner.
 * - 'plan': "Kendi sorunu yaz" formu (PlanAdimi; taslak pencerenin yerel durumudur). [Toplamaya başla] planı uygular.
 * Escape, × ve örtüye dokunma pencereyi kapatır (tablo ve grafik değişmez). Odak her adımda adımın ilk öğesine gider,
 * Tab pencerenin içinde döner, pencere kapanınca açan düğmeye döner. Pencere uygulama kökünün içinde durur (masaüstünün
 * öteki pencereleri ve görev çubuğu kullanılabilir kalır); en çok 860 × 660 px, kökten 16 px içeride. Seçim adımı
 * içeriği kadar yüksektir; öteki adımlar (kayan listeler) tam boydur.
 */
import React, { useEffect, useRef, useState } from 'react';
import { HAZIR_SORULAR, hazirSoruBul, hazirSoruUygula, planSorunu, toplananMetni, varsayilanArastirma, type Arastirma } from './arastirma';
import { OrnekGalerisi } from './OrnekGalerisi';
import { DUGME } from './ortak';
import { PlanAdimi } from './toplama/PlanAdimi';
import { SoruAdimi } from './toplama/SoruAdimi';
import { KapatSimgesi, SolOkSimgesi, VeriToplaSimgesi } from './toplama/simgeler';
import { ORNEK_VERILER, type VeriTablosu } from './veri';
import { sekmeOkTusu } from '../sekmeler';

export type BaslangicAdimi = 'secim' | 'hazir' | 'topla' | 'plan';

/** Seçim adımındaki üç yol */
export type BaslangicYolu = 'hazir' | 'topla' | 'bos';

export interface BaslangicSecenegi {
  id: BaslangicYolu;
  ad: string;
  aciklama: string;
  /** kartın altındaki küçük not ("16 hazır tablo") */
  not: string;
}

export const BASLANGIC_SECENEKLERI: readonly BaslangicSecenegi[] = [
  {
    id: 'hazir',
    ad: 'Örnek veri',
    aciklama: 'Sınıf düzeyine göre hazır tablolardan birini seçin; grafiği ve Keşif kartı hazır gelir.',
    not: `${ORNEK_VERILER.length} hazır tablo`,
  },
  {
    id: 'topla',
    ad: 'Veri topla',
    aciklama: 'Anket, ölçüm ya da deneyle kendi verinizi toplayın; grafik toplarken çizilir.',
    not: `${HAZIR_SORULAR.length} hazır soru · kendi sorunuz`,
  },
  {
    id: 'bos',
    ad: 'Boş tablo',
    aciklama: 'Boş bir tabloya kendi verinizi yazın; sütunları siz adlandırın.',
    not: 'Etiket · Değer',
  },
];

/** Pencerenin en büyük ölçüleri (px); uygulama kökünden 16'şar px içeride durur */
export const BASLANGIC_EN_GENIS = 860;
export const BASLANGIC_EN_YUKSEK = 660;
/** Seçim kartları bu iç genişlikten itibaren yan yana (üç sütun), altında alt alta */
export const SECIM_YAN_YANA = 640;

/** Pencerenin iç genişliği: kök genişliğinden 32 px pay, en çok 860, en az 240 */
export function baslangicGenisligi(kokGenislik: number): number {
  return Math.max(240, Math.min(BASLANGIC_EN_GENIS, kokGenislik - 32));
}

/** Diyaloğun erişilebilir adı (adıma göre) */
const DIYALOG_ADLARI: Record<BaslangicAdimi, string> = {
  secim: 'Nasıl başlayalım?',
  hazir: 'Örnek veri',
  topla: 'Veri topla: ne araştıralım?',
  plan: 'Veri topla: kendi sorunuz',
};

export const KAPAT_ETIKETI = 'Başlangıç penceresini kapat';

const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SIMGE_DUGMESI =
  'grid h-11 w-11 shrink-0 place-items-center rounded-[calc(var(--radius)-6px)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Seçim kartı: 48 px simge, ad, açıklama ve altta not; akıllı tahtada geniş dokunma hedefi */
const KART =
  'flex min-h-[148px] min-w-0 flex-col items-start gap-3 rounded-[calc(var(--radius)-2px)] border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export interface BaslangicModaliProps {
  /** Açılış adımı (pencere her açılışta yeniden kurulur) */
  baslangic: BaslangicAdimi;
  onKapat: () => void;
  /** Uygulama kökünün genişliği: pencerenin iç genişliği, kartların dizilişi ve galerinin sütun sayısı */
  genislik: number;
  /** Şimdiki tablo: seçim adımının alt satırı ("Şimdiki tablo: Boy (cm) · 24 satır") */
  simdiki: { ad: string; satirSayisi: number };
  // ── Örnek veri ──
  yukluOrnekId: string | null;
  onceki: { ad: string; satirSayisi: number } | null;
  /** C: ornekYukle (pencereyi de kapatır) */
  onOrnekYukle: (id: string) => void;
  onOncekiTabloyaDon: () => void;
  // ── Veri topla ──
  arastirma: Arastirma | null;
  bagli: boolean;
  tablo: VeriTablosu;
  /** C: planı uygular, paneli Topla'da açar, pencereyi kapatır (plan sorunluysa tost; pencere açık kalır) */
  onPlaniUygula: (a: Arastirma) => void;
  /** C: bağlı araştırmaya dönüş (adım Topla, panel açılır, pencere kapanır) */
  onDevam: () => void;
  /** Plan yeni tablo açacaksa uyarı (C: `a => planUyarisi(durum, a)`) */
  planUyarisi: (a: Arastirma) => string | null;
  // ── Boş tablo ──
  /** C: bosTabloAc (pencereyi de kapatır) */
  onBosTablo: () => void;
}

/** Seçim kartlarının simgeleri: dolu tablo, veri toplama, boş tablo (artı) */
function YolSimgesi({ yol }: { yol: BaslangicYolu }) {
  if (yol === 'topla') return <VeriToplaSimgesi className="h-7 w-7" />;
  const ortak = {
    className: 'h-7 w-7',
    viewBox: '0 0 24 24',
    'aria-hidden': true as const,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (yol === 'hazir') {
    // Dolu tablo: başlık satırı ve iki sütunlu satırlar
    return (
      <svg {...ortak}>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <path d="M3 9h18M3 14h18M10 9v11" />
      </svg>
    );
  }
  // Boş tablo: başlık satırı ve gövdede artı
  return (
    <svg {...ortak}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M12 12.25v5M9.5 14.75h5" />
    </svg>
  );
}

export function BaslangicModali({
  baslangic,
  onKapat,
  genislik,
  simdiki,
  yukluOrnekId,
  onceki,
  onOrnekYukle,
  onOncekiTabloyaDon,
  arastirma,
  bagli,
  tablo,
  onPlaniUygula,
  onDevam,
  planUyarisi,
  onBosTablo,
}: BaslangicModaliProps) {
  const [adim, setAdim] = useState<BaslangicAdimi>(baslangic);
  /** "Kendi sorunu yaz" ya da plan isteyen hazır sorunun taslağı (yalnız pencerede; tabloya dokunmaz) */
  const [taslak, setTaslak] = useState<Arastirma | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onKapatRef = useRef(onKapat);
  onKapatRef.current = onKapat;
  const icGenislik = baslangicGenisligi(genislik);
  // Plan adımı taslaksız çizilemez (olmaması gerekir): "Ne araştıralım?"a düşer
  const etkinAdim: BaslangicAdimi = adim === 'plan' && !taslak ? 'topla' : adim;

  // Açan öğe: pencere kapanınca odak ona döner (açılışta gövde odaklıysa dönmez)
  useEffect(() => {
    const acan = document.activeElement as HTMLElement | null;
    return () => {
      if (acan && acan !== document.body && acan.isConnected && typeof acan.focus === 'function') acan.focus({ preventScroll: true });
    };
  }, []);

  // Escape kapatır; Tab pencerenin içinde döner. Belge düzeyinde dinlenir: odak pencerenin dışına düşse de çalışır
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onKapatRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const p = panelRef.current;
      if (!p) return;
      const ogeler = Array.from(p.querySelectorAll<HTMLElement>(ODAKLANABILIR)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      const etkin = document.activeElement as HTMLElement | null;
      if (ogeler.length === 0) {
        e.preventDefault();
        p.focus({ preventScroll: true });
        return;
      }
      const ilk = ogeler[0];
      const son = ogeler[ogeler.length - 1];
      if (!etkin || !p.contains(etkin)) {
        e.preventDefault();
        (e.shiftKey ? son : ilk).focus({ preventScroll: true });
      } else if (e.shiftKey && etkin === ilk) {
        e.preventDefault();
        son.focus({ preventScroll: true });
      } else if (!e.shiftKey && etkin === son) {
        e.preventDefault();
        ilk.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, []);

  // Her adımda odak adımın ilk öğesine: kart, yüklü (yoksa ilk) örnek, "Toplamaya dön" (yoksa ilk hazır soru), soru alanı
  useEffect(() => {
    const p = panelRef.current;
    if (!p) return;
    const bul = (secici: string) => p.querySelector<HTMLElement>(secici);
    const hedef =
      etkinAdim === 'secim'
        ? bul('[data-baslangic-secenek]')
        : etkinAdim === 'hazir'
          ? bul('[role="menuitem"][aria-current="true"]') ?? bul('[role="menuitem"]')
          : etkinAdim === 'topla'
            ? bul('[data-devam]') ?? bul('[data-hazir-soru]')
            : bul('textarea');
    (hedef ?? bul(ODAKLANABILIR) ?? p).focus({ preventScroll: true });
  }, [etkinAdim]);

  /** Galeri menüsünde ok tuşları (Aşağı / Sağ sonraki, Yukarı / Sol önceki, Home, End); odak öğede değilse ilk öğe */
  const galeriTusu = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const ogeler = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const i = ogeler.indexOf(document.activeElement as HTMLElement);
    const yon = sekmeOkTusu(e.key, Math.max(0, i), ogeler.length);
    if (yon === null) return;
    e.preventDefault();
    ogeler[i < 0 ? 0 : yon]?.focus();
  };

  // ── Veri topla ──
  const hazirSec = (id: string) => {
    const h = hazirSoruBul(id);
    if (!h) return;
    // Bağlı araştırma zaten bu kartın planı: yeni tablo açılmaz, toplamaya dönülür
    if (arastirma && bagli && arastirma.hazirId === id) {
      onDevam();
      return;
    }
    const a = hazirSoruUygula(id);
    if (!a) return;
    if (h.acilis === 'plan') {
      setTaslak(a);
      setAdim('plan');
      return;
    }
    onPlaniUygula(a);
  };
  const kendiSorun = () => {
    setTaslak({ ...varsayilanArastirma(), adim: 'plan' });
    setAdim('plan');
  };
  const planaGeri = () => {
    setTaslak(null);
    setAdim('topla');
  };
  const planUygula = () => {
    if (taslak && !planSorunu(taslak)) onPlaniUygula({ ...taslak });
  };

  const kapatDugmesi = (
    <button
      type="button"
      onClick={onKapat}
      aria-label={KAPAT_ETIKETI}
      className={`${SIMGE_DUGMESI} text-muted-foreground hover:bg-accent hover:text-foreground`}
      data-baslangic-kapat=""
    >
      <KapatSimgesi className="h-5 w-5" />
    </button>
  );
  const geriDugmesi = (
    <button
      type="button"
      onClick={() => setAdim('secim')}
      aria-label="Geri: Nasıl başlayalım?"
      className={`${SIMGE_DUGMESI} text-foreground hover:bg-accent`}
      data-baslangic-geri=""
    >
      <SolOkSimgesi className="h-5 w-5" />
    </button>
  );

  let icerik: React.ReactNode;
  if (etkinAdim === 'secim') {
    const yanYana = icGenislik >= SECIM_YAN_YANA;
    icerik = (
      <>
        <header className="flex min-h-[52px] shrink-0 items-center gap-2 border-b border-border bg-card pl-4 pr-1">
          <h2 className="min-w-0 flex-1 truncate text-[16px] font-extrabold">Nasıl başlayalım?</h2>
          {kapatDugmesi}
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          <p className="mb-3 text-[13.5px] leading-5 text-muted-foreground">Veriyi nereden alacağız? Tablo ve grafik seçtiğiniz yola göre kurulur.</p>
          <div
            role="group"
            aria-label="Başlangıç yolu"
            className={`grid gap-3 ${yanYana ? 'grid-cols-3' : 'grid-cols-1'}`}
            data-baslangic-secenekler={yanYana ? 'yan-yana' : 'alt-alta'}
          >
            {BASLANGIC_SECENEKLERI.map((s) => (
              <button
                key={s.id}
                type="button"
                className={KART}
                onClick={() => (s.id === 'bos' ? onBosTablo() : setAdim(s.id))}
                data-baslangic-secenek={s.id}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[calc(var(--radius)-6px)] bg-accent text-primary dark:text-[#9fe0d9]">
                  <YolSimgesi yol={s.id} />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-[17px] font-extrabold leading-6 text-foreground">{s.ad}</span>
                  <span className="text-[13px] leading-[18px] text-muted-foreground">{s.aciklama}</span>
                </span>
                <span className="mt-auto inline-flex h-6 items-center rounded-full bg-muted px-2 text-[12px] font-semibold text-muted-foreground">{s.not}</span>
              </button>
            ))}
          </div>
        </div>
        <footer className="flex min-h-[64px] shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-3 py-1.5">
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-muted-foreground" title={`${simdiki.ad} · ${simdiki.satirSayisi} satır`} data-baslangic-simdiki="">
            Şimdiki tablo: {simdiki.ad} · {simdiki.satirSayisi} satır
          </span>
          <button type="button" className={`${DUGME} px-4 text-[13.5px] font-bold`} onClick={onKapat} data-baslangic-devam="">
            Bu tabloyla devam et
          </button>
        </footer>
      </>
    );
  } else if (etkinAdim === 'hazir') {
    icerik = (
      <>
        <header className="flex min-h-[52px] shrink-0 items-center gap-1 border-b border-border bg-card px-1.5">
          {geriDugmesi}
          <h2 className="min-w-0 flex-1 truncate px-0.5 text-[16px] font-extrabold">Örnek veri</h2>
          {kapatDugmesi}
        </header>
        {/* Galeri: en üstte kalıcı "Önceki tabloya dön" (örnek yükleme ya da yeni tablo eski tabloyu burada saklar), altında
            sınıf düzeyine göre gruplanmış örnekler (küçük grafik, ad, açıklama, sınıf rozeti); genişse iki sütun */}
        <div role="menu" aria-label="Örnek veri" onKeyDown={galeriTusu} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5" data-baslangic-galerisi="">
          <OrnekGalerisi yukluOrnekId={yukluOrnekId} onceki={onceki} onYukle={onOrnekYukle} onOncekiTabloyaDon={onOncekiTabloyaDon} genislik={icGenislik - 12} />
        </div>
      </>
    );
  } else if (etkinAdim === 'topla') {
    icerik = (
      <SoruAdimi
        arastirma={arastirma}
        bagli={bagli}
        toplananMetni={arastirma && bagli ? toplananMetni(tablo, arastirma) : null}
        onHazirSoru={hazirSec}
        onDevam={onDevam}
        onYenidenBaslat={() => arastirma && onPlaniUygula({ ...arastirma })}
        onKendiSorun={kendiSorun}
        onKapat={onKapat}
        onGeri={() => setAdim('secim')}
        kapatEtiketi={KAPAT_ETIKETI}
        genislik={icGenislik}
      />
    );
  } else {
    icerik = (
      <PlanAdimi
        taslak={taslak as Arastirma}
        onTaslak={setTaslak}
        onGeri={planaGeri}
        onUygula={planUygula}
        devam={false}
        uyari={planUyarisi(taslak as Arastirma)}
        tablo={tablo}
        bagliArastirma={null}
        genislik={icGenislik}
        onKapat={onKapat}
        kapatEtiketi={KAPAT_ETIKETI}
      />
    );
  }

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#15302d]/[0.32] p-4 dark:bg-black/55"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onKapat();
      }}
      data-baslangic-ortusu=""
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={DIYALOG_ADLARI[etkinAdim]}
        tabIndex={-1}
        // Seçim adımı içeriği kadar (kartlar uzamaz); galeri, sorular ve form kayan listeler olduğu için tam boy. En büyük
        // ölçü satır içi yazılır: yükseklik kökten 32 px içeride kalır (dar pencerede seçim adımı da taşmaz, içi kayar)
        className={`flex w-full flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-background text-foreground shadow-[0_28px_60px_-24px_rgba(6,40,45,.65)] outline-none ${etkinAdim === 'secim' ? '' : 'h-full'}`}
        style={{ maxWidth: BASLANGIC_EN_GENIS, maxHeight: `min(${BASLANGIC_EN_YUKSEK}px, 100%)` }}
        data-baslangic-modali={etkinAdim}
      >
        {icerik}
      </div>
    </div>
  );
}
