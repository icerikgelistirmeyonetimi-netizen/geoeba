'use client';

/**
 * Masaüstündeki uygulama penceresi kabuğu: başlık çubuğu (simge, ad, aynı satırda uygulama
 * menüleri, küçült / büyüt-geri al / kapat) ve içerik alanı. Büyütülmüş pencere görev çubuğunun
 * üstündeki alanı doldurur; geri alınmış pencere çalışma alanının %84'ü kadardır, açılış sırasına
 * göre 32 px kaydırılır (akis.ts geriDikdortgeni) ve başlık çubuğundan sürüklenir (pointer olayları;
 * alanın içinde kalır). Tıklayınca/odaklanınca öne gelir (onOdak); küçültülmüş pencere gizlenir ama
 * bağlı kalır (içerik korunur).
 *
 * Hareketler (pencereAnimasyonu.ts, Web Animations): pencere görev çubuğundaki uygulama düğmesinden
 * (yuvasından) huni gibi genişleyerek yukarı çıkar; "Küçült" pencereyi daralarak aynı yuvaya çeker ve
 * hareket bitince durum makinesine bildirir (pencere o zaman gizlenir); "Kapat" hafif çekilip söner,
 * sonra bildirir; büyüt / geri al eski dikdörtgenden yenisine kayar. Geometri her seferinde ölçülür
 * (getBoundingClientRect), süreler SURELER'de; az hareket tercihinde hepsi atlanır.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dikdortgen, PencereDurumu, PencereKonumu } from './akis';
import { SURELER, geriDikdortgeni, pencereSinirla } from './akis';
import { BASLAT_KIMLIGI, simgeStili } from './Masaustu';
import { PencereHataSiniri } from './PencereHataSiniri';
import { HUNI_EGRISI, KAPANIS_KARELERI, boyutKareleri, dikdortgen, hedefeDonusum, oynat, yedekYuva, yuvaKareleri } from './pencereAnimasyonu';
import s from './sinif.module.css';

export interface UygulamaPenceresiProps {
  id: string;
  baslik: string;
  simge: React.ReactNode;
  /** manifest.renk: başlık çubuğundaki simge gradyanı */
  renk?: string;
  /** 'acik' görünür, 'kucuk' gizli (bağlı kalır) */
  durum: Exclude<PencereDurumu, 'kapali'>;
  buyuk: boolean;
  /** Öndeki (odaklı) pencere mi */
  onde: boolean;
  /** Yığın sırası (1'den; büyük olan öndedir) */
  katman: number;
  /** Açılış sırası: geri alınmış varsayılan yerleşimin kaydırması */
  sira: number;
  /** Sürüklenmiş konum (çalışma alanına göre px); null: varsayılan yerleşim */
  konum: PencereKonumu | null;
  /** Her artışta pencere yeniden odaklanır (zaten açıkken kısayol/menüden yeniden "açılınca") */
  odakSayaci?: number;
  onOdak: () => void;
  /** Küçültme hareketi bitince çağrılır (durum makinesi pencereyi o zaman 'kucuk' yapar) */
  onKucult: () => void;
  onBuyutDegistir: () => void;
  /** Kapanış hareketi bitince çağrılır */
  onKapat: () => void;
  onTasi: (konum: PencereKonumu) => void;
  /** Başlık çubuğunda adın sağında yer alan menüler (ör. WorkspaceMenuBar) */
  menuCubugu?: React.ReactNode;
  children: React.ReactNode;
}

const ikon = {
  kucult: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 11.5h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  buyut: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  geriAl: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.5 5.5V3.6A.6.6 0 0 1 6.1 3h6.3a.6.6 0 0 1 .6.6v6.3a.6.6 0 0 1-.6.6h-1.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="3" y="5.5" width="7.5" height="7.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  kapat: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

interface Alan {
  w: number;
  h: number;
}

// Statik dışa aktarımda bileşen sunucuda da çizilir; layout effect yalnız tarayıcıda kullanılır
const useTarayiciLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Başlık çubuğunda sürüklemeyi başlatmayan öğeler (düğmeler, menüler, giriş alanları) */
const SURUKLEME_DISI = 'button, a, input, select, textarea, [role="menu"], [role="menubar"], [role="menuitem"], [contenteditable="true"]';

export function UygulamaPenceresi({
  id,
  baslik,
  simge,
  renk,
  durum,
  buyuk,
  onde,
  katman,
  sira,
  konum,
  odakSayaci = 0,
  onOdak,
  onKucult,
  onBuyutDegistir,
  onKapat,
  onTasi,
  menuCubugu,
  children,
}: UygulamaPenceresiProps) {
  const kokRef = useRef<HTMLElement>(null);
  // Çalışma alanının (offsetParent) ölçüsü: geri alınmış yerleşim ve sürükleme sınırı buna göre
  const [alan, setAlan] = useState<Alan | null>(null);
  const [surukleniyor, setSurukleniyor] = useState(false);
  const surukleme = useRef<{ isaretci: number; baslangicX: number; baslangicY: number; kokX: number; kokY: number; son: PencereKonumu } | null>(null);
  // Süren hareketin iptali (tek seferde tek hareket; yenisi eskisini keser)
  const hareket = useRef<(() => void) | null>(null);
  // Küçültme/kapanış hareketi sürerken ikinci tıklama yeni hareket başlatmaz
  const cikisSuruyor = useRef(false);
  // Büyüt / geri al öncesi ölçülen dikdörtgen (FLIP başlangıcı)
  const oncekiDik = useRef<Dikdortgen | null>(null);

  const hareketiKes = () => {
    hareket.current?.();
    hareket.current = null;
  };

  // Pencerenin yuvası: görev çubuğundaki uygulama düğmesi; yoksa çalışma alanının alt ortası
  const yuva = useCallback((): Dikdortgen => {
    const dugme = document.querySelector<HTMLElement>(`[data-gorev="${id}"]`);
    if (dugme) return dikdortgen(dugme.getBoundingClientRect());
    const kap = kokRef.current?.offsetParent as HTMLElement | null;
    return yedekYuva(kap ? dikdortgen(kap.getBoundingClientRect()) : { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight });
  }, [id]);

  // Açılış ve küçültmeden geri gelme: yuvadan huni gibi genişleyerek yerine (paint öncesi başlar,
  // pencere tam boyutta bir kare bile görünmez). 'kucuk' olunca tutulan küçültme karesi bırakılır.
  useTarayiciLayoutEffect(() => {
    const kok = kokRef.current;
    if (!kok) return;
    hareketiKes();
    if (durum !== 'acik') return;
    const kareler = yuvaKareleri(dikdortgen(kok.getBoundingClientRect()), yuva(), 'ac');
    hareket.current = oynat(kok, kareler, { sure: SURELER.PENCERE_ACILIS, egri: HUNI_EGRISI }, () => {
      hareket.current = null;
    });
    return hareketiKes;
  }, [durum, yuva]);

  // Büyüt / geri al: eski dikdörtgenden yenisine kayar (FLIP; yeni yerleşim zaten uygulanmıştır)
  useTarayiciLayoutEffect(() => {
    const kok = kokRef.current;
    const onceki = oncekiDik.current;
    oncekiDik.current = null;
    if (!kok || !onceki || durum !== 'acik') return;
    hareketiKes();
    const d = hedefeDonusum(dikdortgen(kok.getBoundingClientRect()), onceki);
    hareket.current = oynat(kok, boyutKareleri(d), { sure: SURELER.PENCERE_BOYUT }, () => {
      hareket.current = null;
    });
  }, [buyuk, durum]);

  // Pencere görünür olunca (ve zaten açıkken yeniden istenince) odak pencereye — yalnız öndeki pencere
  useEffect(() => {
    if (durum !== 'acik' || !onde) return;
    const kok = kokRef.current;
    if (!kok) return;
    if (!kok.contains(document.activeElement)) kok.focus({ preventScroll: true });
  }, [durum, odakSayaci, onde]);

  // Çalışma alanının ölçüsü (pencere boyutu değişince geri alınmış pencere de yeniden yerleşir)
  useTarayiciLayoutEffect(() => {
    const kok = kokRef.current;
    const kap = kok?.offsetParent as HTMLElement | null;
    if (!kap) return;
    const olc = () => setAlan({ w: kap.clientWidth, h: kap.clientHeight });
    olc();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(olc);
    ro.observe(kap);
    return () => ro.disconnect();
  }, []);

  // Pencere içinden görev çubuğuna kestirme: çalışma alanının onlarca odaklanabilir öğesini
  // geçmeden Başlat'a ulaşılır (yalnız odaklanınca görünen atlama düğmesi)
  const gorevCubuguna = () => document.getElementById(BASLAT_KIMLIGI)?.focus({ preventScroll: true });

  // Tıklama ya da odak pencereye gelince öne alınır (öndeki için indirgeyici aynı nesneyi döndürür)
  const oneAl = useCallback(() => {
    if (!onde) onOdak();
  }, [onde, onOdak]);

  // ---------------------------------------------------------------- pencere düğmeleri (hareketli)
  // Küçült: pencere daralarak yuvasına çekilir, hareket bitince durum makinesine gider (o zaman
  // gizlenir). Süren açılış hareketi önce kesilir ki ölçüm dönüşümsüz (doğal) dikdörtgeni versin.
  const kucult = () => {
    const kok = kokRef.current;
    if (!kok || cikisSuruyor.current) return;
    hareketiKes();
    cikisSuruyor.current = true;
    const kareler = yuvaKareleri(dikdortgen(kok.getBoundingClientRect()), yuva(), 'kucult');
    hareket.current = oynat(kok, kareler, { sure: SURELER.PENCERE_KUCULTME, doldur: 'forwards', egri: HUNI_EGRISI }, () => {
      cikisSuruyor.current = false;
      onKucult();
    });
  };

  // Kapat: hafif çekilip söner; bitince pencere sökülür (sökülürken hareket iptal edilir)
  const kapat = () => {
    const kok = kokRef.current;
    if (!kok || cikisSuruyor.current) return;
    hareketiKes();
    cikisSuruyor.current = true;
    hareket.current = oynat(kok, KAPANIS_KARELERI, { sure: SURELER.PENCERE_KAPANIS, doldur: 'forwards' }, onKapat);
  };

  // Büyüt / geri al: yeni yerleşim uygulanmadan önce eski dikdörtgen ölçülür (FLIP)
  const buyutDegistir = () => {
    const kok = kokRef.current;
    if (kok && !cikisSuruyor.current) {
      hareketiKes();
      oncekiDik.current = dikdortgen(kok.getBoundingClientRect());
    }
    onBuyutDegistir();
  };

  // Geri alınmış pencerenin dikdörtgeni (px): sürüklenmiş konum sınırlanır, yoksa varsayılan yerleşim
  const dikdortgenGeri = (() => {
    if (buyuk || !alan) return null;
    const varsayilan = geriDikdortgeni(sira, alan.w, alan.h);
    if (!konum) return varsayilan;
    const { x, y } = pencereSinirla(konum, varsayilan.w, varsayilan.h, alan.w, alan.h);
    return { x, y, w: varsayilan.w, h: varsayilan.h };
  })();

  // ---------------------------------------------------------------- sürükleme (başlık çubuğu)
  const surukleBasla = (e: React.PointerEvent<HTMLElement>) => {
    if (buyuk || !dikdortgenGeri || !alan) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as Element).closest(SURUKLEME_DISI)) return;
    const kok = kokRef.current;
    if (!kok) return;
    e.preventDefault();
    surukleme.current = {
      isaretci: e.pointerId,
      baslangicX: e.clientX,
      baslangicY: e.clientY,
      kokX: dikdortgenGeri.x,
      kokY: dikdortgenGeri.y,
      son: { x: dikdortgenGeri.x, y: dikdortgenGeri.y },
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* eski tarayıcı: yakalama olmadan da sürer */
    }
    setSurukleniyor(true);
  };

  const surukle = (e: React.PointerEvent<HTMLElement>) => {
    const d = surukleme.current;
    const kok = kokRef.current;
    if (!d || !kok || !alan || !dikdortgenGeri || e.pointerId !== d.isaretci) return;
    const yeni = pencereSinirla(
      { x: d.kokX + (e.clientX - d.baslangicX), y: d.kokY + (e.clientY - d.baslangicY) },
      dikdortgenGeri.w,
      dikdortgenGeri.h,
      alan.w,
      alan.h
    );
    d.son = yeni;
    // Sürükleme sırasında durum makinesine gidilmez: konum doğrudan stile yazılır, bırakınca kaydedilir
    kok.style.left = `${yeni.x}px`;
    kok.style.top = `${yeni.y}px`;
  };

  const surukleBitir = (e: React.PointerEvent<HTMLElement>) => {
    const d = surukleme.current;
    if (!d || e.pointerId !== d.isaretci) return;
    surukleme.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* yakalanmamış olabilir */
    }
    setSurukleniyor(false);
    if (d.son.x !== d.kokX || d.son.y !== d.kokY) onTasi(d.son);
  };

  const siniflar = [
    s.pencere,
    !buyuk && s['pencere--geri'],
    !buyuk && dikdortgenGeri && s['pencere--olculu'],
    durum === 'kucuk' && s['pencere--kucuk'],
    !onde && s['pencere--arka'],
    surukleniyor && s['pencere--surukleniyor'],
  ]
    .filter(Boolean)
    .join(' ');

  const stil: React.CSSProperties = { zIndex: katman };
  if (dikdortgenGeri) {
    stil.left = dikdortgenGeri.x;
    stil.top = dikdortgenGeri.y;
    stil.width = dikdortgenGeri.w;
    stil.height = dikdortgenGeri.h;
  }

  return (
    <section
      ref={kokRef}
      className={siniflar}
      style={stil}
      role="dialog"
      aria-label={baslik}
      aria-hidden={durum === 'kucuk'}
      tabIndex={-1}
      data-pencere={durum}
      data-pencere-id={id}
      data-pencere-buyuk={buyuk ? '1' : undefined}
      data-pencere-onde={onde ? '1' : undefined}
      onPointerDownCapture={oneAl}
      onFocus={oneAl}
    >
      <button type="button" className={`${s.atlama} ${s.kabuk}`} onClick={gorevCubuguna}>
        Görev çubuğuna geç
      </button>
      <header
        className={`${s['pencere-baslik']} ${s.kabuk}`}
        onDoubleClick={buyutDegistir}
        onPointerDown={surukleBasla}
        onPointerMove={surukle}
        onPointerUp={surukleBitir}
        onPointerCancel={surukleBitir}
        data-pencere-baslik
      >
        <span
          className={`${s['uygulama-simge']} ${s['uygulama-simge--kucuk']}`}
          style={renk ? simgeStili(renk) : undefined}
          aria-hidden="true"
        >
          {simge}
        </span>
        <h2 className={s['pencere-ad']}>{baslik}</h2>
        {/* Menü çubuğu başlıkla aynı satırda: ayrı bir satır dikey yer kaybettiriyordu */}
        {menuCubugu && <div className={s['pencere-menu']}>{menuCubugu}</div>}
        <div className={s['pencere-dugmeler']}>
          <button type="button" className={s['pencere-dugme']} onClick={kucult} aria-label="Küçült" title="Küçült">
            {ikon.kucult}
          </button>
          <button
            type="button"
            className={s['pencere-dugme']}
            onClick={buyutDegistir}
            aria-label={buyuk ? 'Geri al' : 'Büyüt'}
            title={buyuk ? 'Geri al' : 'Büyüt'}
          >
            {buyuk ? ikon.geriAl : ikon.buyut}
          </button>
          <button
            type="button"
            className={`${s['pencere-dugme']} ${s['pencere-dugme--kapat']}`}
            onClick={kapat}
            aria-label="Kapat"
            title="Kapat"
          >
            {ikon.kapat}
          </button>
        </div>
      </header>
      <div className={s['pencere-icerik']} data-pencere-icerigi>
        {/* Uygulama çökerse yalnız bu pencere "yeniden başlat" gösterir; kabuk ayakta kalır */}
        <PencereHataSiniri uygulamaId={id}>{children}</PencereHataSiniri>
      </div>
    </section>
  );
}
