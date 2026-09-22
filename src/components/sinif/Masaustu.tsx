'use client';

/**
 * Akıllı tahtanın masaüstü: EBA logolu duvar kâğıdı, "açılışın devamı" (zemin açılış ekranının deniz
 * gradyanının aynısı; gözden dışa yayılan ince eş merkezli halkalar: public/sinif/duvar-eba/goz-halkalari.svg;
 * yumuşak ışık, altta soluk dalga silueti, vinyet ve hafif gren; EBA karakteri + beyaz EBA yazısı açılıştaki
 * ile aynı ölçü ve konumda, geçişte zıplamaz — dekoratif, aria-hidden; halkalar yüklenmezse yalnız onlar
 * kaybolur, gradyan ve logo yine görünür; logo kaynak zinciri ve açılışta önceden yükleme: duvarVarliklari.ts),
 * sol üstte dikey sırayla uygulama kısayolları (kayıt defteri: uygulamalar.tsx), altta görev çubuğu (Başlat,
 * sabitlenmiş uygulamalar, Etkinlikler, sistem tepsisi: ağ, ses, canlı saat ve tarih) ve Başlat
 * menüsü (EBA logosu, Öğretmen satırı, uygulama listesi, "Adalara dön"). Pencereler `children`
 * olarak görev çubuğunun üstündeki alana yerleşir; çalışan uygulamanın görev çubuğu düğmesinde
 * gösterge, öndeki (odaklı) pencerede uzun gösterge vardır. Klavye: pencere küçültülünce odak görev
 * çubuğu düğmesine, kapatılınca kısayola taşınır (odakIstegi); Başlat menüsünde odak Tab ile döner
 * (tuzak), Esc kapatır.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { PencereDurumu } from './akis';
import { saatMetni, sonrakiDakikayaKalan, tarihMetni } from './saat';
import type { UygulamaManifesti } from './uygulamalar';
import { useTheme } from '@/state/ThemeContext';
import { DUVAR_HALKALARI, DUVAR_LOGOSU, sonrakiKaynakSirasi } from './duvarVarliklari';
import s from './sinif.module.css';

const VARLIK_ONEKI = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '';

/** Yedek kaynaklı dekoratif görsel: kaynak yüklenmezse zincirdeki sıradakine geçer (sonuncusu satır içi
 *  data: URI kopyası, ağ gerektirmez); zincir yine de biterse gizlenir, sayfa çökmez */
export function YedekliGorsel({ kaynaklar, genislik, yukseklik }: { kaynaklar: readonly string[]; genislik: number; yukseklik: number }) {
  const [sira, setSira] = useState<number | null>(0);
  if (sira === null || sira >= kaynaklar.length) return null;
  return (
    <img
      src={kaynaklar[sira]}
      alt=""
      aria-hidden="true"
      width={genislik}
      height={yukseklik}
      decoding="sync"
      draggable={false}
      onError={() => setSira((n) => (n === null ? null : sonrakiKaynakSirasi(n, kaynaklar.length)))}
    />
  );
}

const ikon = {
  ag: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 9.2a14 14 0 0 1 19 0M5.6 12.6a9.5 9.5 0 0 1 12.8 0M8.7 16a5 5 0 0 1 6.6 0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="12" cy="19.4" r="1.5" fill="currentColor" />
    </svg>
  ),
  ses: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.3 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  ),
  /** Koyu temaya geç: hilal */
  ay: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  ),
  /** Açık temaya geç: güneş */
  gunes: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  ),
  geri: (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M16 10H5m4.5-4.5L5 10l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  /** Etkinlikler: dört kutucuk (ana girişteki adalar / etkinlik kartları) */
  etkinlikler: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M17 13.6v6.8M13.6 17h6.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  ),
};

/** Başlat düğmesinin kimliği: pencere içindeki "Görev çubuğuna geç" atlama düğmesi buna odaklanır */
export const BASLAT_KIMLIGI = 'sinif-baslat';

/** Uygulama simgesinin rengi (manifest.renk) CSS değişkeniyle .uygulama-simge gradyanına girer */
export function simgeStili(renk: string): React.CSSProperties {
  return { '--simge-renk': renk } as React.CSSProperties;
}

/** Dakika sınırına hizalı canlı saat. */
function useSaat(): { saat: string; tarih: string } {
  const [simdi, setSimdi] = useState<Date | null>(null);
  useEffect(() => {
    let zamanlayici = 0;
    const guncelle = () => {
      const t = new Date();
      setSimdi(t);
      zamanlayici = window.setTimeout(guncelle, sonrakiDakikayaKalan(t) + 20);
    };
    guncelle();
    return () => window.clearTimeout(zamanlayici);
  }, []);
  // Sunucu/ilk çizimde boş: saat yalnız tarayıcıda yazılır (hidrasyon uyuşmazlığı olmasın)
  return simdi ? { saat: saatMetni(simdi), tarih: tarihMetni(simdi) } : { saat: '', tarih: '' };
}

export interface OdakIstegi {
  /** 'gorev': görev çubuğundaki uygulama düğmesi (küçültme sonrası); 'kisayol': masaüstü kısayolu (kapatma sonrası) */
  hedef: 'gorev' | 'kisayol';
  /** Hangi uygulamanın düğmesi/kısayolu */
  id: string;
  /** Her istekte artar; aynı hedefe art arda istek de odaklar */
  sayac: number;
}

export interface PencereOzeti {
  id: string;
  durum: PencereDurumu;
}

export interface MasaustuProps {
  /** Kayıt defteri sırası: kısayollar, görev çubuğu ve Başlat menüsü bu sırayı izler */
  uygulamalar: readonly UygulamaManifesti[];
  /** Açık/küçük pencereler (kayıt yoksa uygulama kapalıdır) */
  pencereler: readonly PencereOzeti[];
  /** Öndeki (odaklı) pencerenin uygulama kimliği */
  ondeki: string | null;
  baslatMenusu: boolean;
  onBaslatMenusu: (acik: boolean) => void;
  /** Kısayol / görev çubuğu / Başlat menüsü: pencereyi açar, geri getirir ya da öne alır */
  onUygulamaAc: (id: string) => void;
  onAdalaraDon: () => void;
  /** Pencere küçültülünce/kapatılınca klavye odağının taşınacağı yer (odak body'ye düşmesin) */
  odakIstegi?: OdakIstegi | null;
  children?: React.ReactNode;
}

export function Masaustu({
  uygulamalar,
  pencereler,
  ondeki,
  baslatMenusu,
  onBaslatMenusu,
  onUygulamaAc,
  onAdalaraDon,
  odakIstegi,
  children,
}: MasaustuProps) {
  const { saat, tarih } = useSaat();
  const { theme, setTheme } = useTheme();
  const [duvarYok, setDuvarYok] = useState(false);
  const baslatRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const gorevRef = useRef(new Map<string, HTMLButtonElement>());
  const kisayolRef = useRef(new Map<string, HTMLButtonElement>());

  const durumu = (id: string): PencereDurumu => pencereler.find((p) => p.id === id)?.durum ?? 'kapali';

  // Küçült/Kapat sonrası odak: gizlenen/sökülen düğmeden body'ye düşmek yerine çubuğa ya da kısayola
  useEffect(() => {
    if (!odakIstegi) return;
    const harita = odakIstegi.hedef === 'gorev' ? gorevRef.current : kisayolRef.current;
    harita.get(odakIstegi.id)?.focus({ preventScroll: true });
  }, [odakIstegi]);

  // Menü açıkken odak menüde döner (Tab son öğeden ilkine, Shift+Tab ilkinden sonuncuya): klavye
  // kullanıcısı menünün arkasındaki görev çubuğuna/pencereye "düşmez"; Esc kapatır, odak Başlat'a döner.
  const menuTusu = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const ogeler = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled])')];
    if (!ogeler.length) return;
    const ilk = ogeler[0];
    const son = ogeler[ogeler.length - 1];
    const etkin = document.activeElement;
    if (e.shiftKey && (etkin === ilk || etkin === e.currentTarget)) {
      e.preventDefault();
      son.focus({ preventScroll: true });
    } else if (!e.shiftKey && (etkin === son || etkin === e.currentTarget)) {
      e.preventDefault();
      ilk.focus({ preventScroll: true });
    }
  };
  // Odak menü dışına programatik/başka yoldan çıkarsa (ör. pencere içine tıklama) menü kapanır;
  // relatedTarget yoksa (Safari'de düğme tıklaması, örtüye tıklama) örtü/Başlat mantığı çözer.
  const menuOdakCikti = (e: React.FocusEvent<HTMLDivElement>) => {
    const hedef = e.relatedTarget as Node | null;
    if (!hedef) return;
    if (e.currentTarget.contains(hedef) || baslatRef.current?.contains(hedef)) return;
    onBaslatMenusu(false);
  };

  // Menü açılınca odak menüye; Esc kapatır ve odak Başlat düğmesine döner
  useEffect(() => {
    if (!baslatMenusu) return;
    menuRef.current?.focus({ preventScroll: true });
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onBaslatMenusu(false);
        baslatRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', tus, true);
    return () => document.removeEventListener('keydown', tus, true);
  }, [baslatMenusu, onBaslatMenusu]);

  const refKaydet = (harita: Map<string, HTMLButtonElement>, id: string) => (el: HTMLButtonElement | null) => {
    if (el) harita.set(id, el);
    else harita.delete(id);
  };

  return (
    <div className={s.masaustu} data-masaustu>
      {/* EBA logolu duvar kâğıdı: açılış gradyanı (.duvar) + ışık/dalga (::before/::after) + göz halkaları + logo */}
      <div className={s.duvar} aria-hidden="true">
        {!duvarYok && (
          <img className={s['duvar-halka']} src={DUVAR_HALKALARI} alt="" draggable={false} onError={() => setDuvarYok(true)} />
        )}
        <div className={s['duvar-logo']}>
          <span className={s['duvar-logo-karakter']}>
            <YedekliGorsel kaynaklar={DUVAR_LOGOSU.karakter} genislik={220} yukseklik={220} />
          </span>
          <span className={s['duvar-logo-yazi']}>
            <YedekliGorsel kaynaklar={DUVAR_LOGOSU.yazi} genislik={479} yukseklik={101} />
          </span>
        </div>
      </div>
      <div className={s.vinyet} aria-hidden="true" />

      <div className={s.calisma}>
        <ul className={s.kisayollar} aria-label="Masaüstü kısayolları">
          {uygulamalar.map((u) => (
            <li key={u.id}>
              <button
                ref={refKaydet(kisayolRef.current, u.id)}
                type="button"
                className={`${s.kisayol} ${s.kabuk}`}
                onClick={() => onUygulamaAc(u.id)}
                aria-label={`${u.kisaAd} uygulamasını aç`}
                title={u.aciklama}
                data-kisayol={u.id}
              >
                <span className={`${s['uygulama-simge']} ${s['uygulama-simge--buyuk']}`} style={simgeStili(u.renk)} aria-hidden="true">
                  {u.simge}
                </span>
                <span>{u.kisaAd}</span>
              </button>
            </li>
          ))}
        </ul>
        {children}
      </div>

      {baslatMenusu && (
        <>
          <div className={s['menu-ortu']} onPointerDown={() => onBaslatMenusu(false)} aria-hidden="true" />
          <div
            ref={menuRef}
            id="sinif-baslat-menusu"
            className={`${s['baslat-menu']} ${s.kabuk}`}
            role="dialog"
            aria-label="Başlat menüsü"
            tabIndex={-1}
            onBlur={menuOdakCikti}
            onKeyDown={menuTusu}
          >
            <div className={s['baslat-menu-ust']}>
              <img
                className={s['baslat-menu-logo']}
                src={`${VARLIK_ONEKI}/images/eba/eba-logo-karakter-yatay.svg`}
                alt="EBA"
                width={820}
                height={220}
                draggable={false}
              />
              <img
                className={`${s['baslat-menu-logo']} ${s['baslat-menu-logo--koyu']}`}
                src={`${VARLIK_ONEKI}/images/eba/eba-logo-karakter-yatay-koyu-zemin.svg`}
                alt=""
                width={820}
                height={220}
                draggable={false}
              />
              <span className={s.kullanici}>
                <span className={s['kullanici-rozet']} aria-hidden="true">
                  Ö
                </span>
                Öğretmen
              </span>
            </div>
            <p className={s['baslat-menu-baslik']}>Uygulamalar</p>
            <ul className={s['baslat-menu-liste']}>
              {uygulamalar.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className={s['baslat-menu-oge']}
                    onClick={() => onUygulamaAc(u.id)}
                    data-baslat-oge={u.id}
                    aria-label={u.ad}
                    aria-describedby={`sinif-baslat-aciklama-${u.id}`}
                  >
                    <span className={s['uygulama-simge']} style={simgeStili(u.renk)} aria-hidden="true">
                      {u.simge}
                    </span>
                    <span>
                      {u.ad}
                      <span className={s['baslat-menu-oge-alt']} id={`sinif-baslat-aciklama-${u.id}`}>
                        {u.aciklama}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className={s['baslat-menu-alt']}>
              <button type="button" className={s['adalara-don']} onClick={onAdalaraDon}>
                {ikon.geri}
                <span>Adalara dön</span>
              </button>
            </div>
          </div>
        </>
      )}

      <nav className={`${s['gorev-cubugu']} ${s.kabuk}`} aria-label="Görev çubuğu">
        <button
          ref={baslatRef}
          id={BASLAT_KIMLIGI}
          type="button"
          className={s.baslat}
          onClick={() => onBaslatMenusu(!baslatMenusu)}
          aria-label="Başlat"
          title="Başlat"
          aria-haspopup="dialog"
          aria-expanded={baslatMenusu}
          aria-controls={baslatMenusu ? 'sinif-baslat-menusu' : undefined}
        >
          <img src={`${VARLIK_ONEKI}/images/eba/eba-karakter.svg`} alt="" width={120} height={120} draggable={false} />
        </button>
        <span className={s['cubuk-ayrac']} aria-hidden="true" />
        {uygulamalar.map((u) => {
          const durum = durumu(u.id);
          const calisiyor = durum !== 'kapali';
          const etkin = durum === 'acik' && ondeki === u.id;
          return (
            <button
              key={u.id}
              ref={refKaydet(gorevRef.current, u.id)}
              type="button"
              className={[s['gorev-uygulama'], calisiyor && s['gorev-uygulama--calisiyor'], etkin && s['gorev-uygulama--etkin']]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onUygulamaAc(u.id)}
              aria-label={calisiyor ? `${u.kisaAd} (${durum === 'kucuk' ? 'küçültülmüş' : 'çalışıyor'})` : u.kisaAd}
              aria-pressed={etkin}
              title={u.kisaAd}
              data-gorev={u.id}
              data-gorev-durum={durum}
            >
              <span className={`${s['uygulama-simge']} ${s['uygulama-simge--kucuk']}`} style={simgeStili(u.renk)} aria-hidden="true">
                {u.simge}
              </span>
              <span>{u.kisaAd}</span>
            </button>
          );
        })}
        {/* Etkinlikler: kullanıcının isteğiyle görev çubuğunda (kalıcı); ana girişe (Matematik Takımadaları) döner */}
        <button
          type="button"
          className={s['gorev-uygulama']}
          onClick={onAdalaraDon}
          aria-label="Etkinlikler: ana girişe dön"
          title="Etkinlikler (ana giriş)"
          data-gorev="etkinlikler"
        >
          <span className={`${s['uygulama-simge']} ${s['uygulama-simge--kucuk']} ${s['uygulama-simge--altin']}`} aria-hidden="true">
            {ikon.etkinlikler}
          </span>
          <span>Etkinlikler</span>
        </button>

        <div className={s.tepsi}>
          <span className={s['tepsi-simge']} title="Ağ: bağlı" aria-label="Ağ: bağlı" role="img">
            {ikon.ag}
          </span>
          <span className={s['tepsi-simge']} title="Ses" aria-label="Ses" role="img">
            {ikon.ses}
          </span>
          <div className={s.saat} aria-live="off">
            <span className={s['saat-metin']} data-saat>
              {saat}
            </span>
            <span className={s['tarih-metin']} data-tarih>
              {tarih}
            </span>
          </div>
          {/* Açık / koyu tema: görev çubuğunun sağ köşesinde (kullanıcı isteği; stüdyo menü şeridinden taşındı) */}
          <button
            type="button"
            className={s['tema-dugmesi']}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
            data-tema-dugmesi
          >
            {theme === 'dark' ? ikon.gunes : ikon.ay}
          </button>
        </div>
      </nav>
    </div>
  );
}
