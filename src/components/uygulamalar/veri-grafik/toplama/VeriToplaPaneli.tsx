'use client';

/**
 * Veri topla paneli (§0 sadeleştirme kararı; VT §6, §10.2, plan §5.2). İki görünüm:
 * - "Ne araştıralım?": hazır soru kartları (Anket · Ölçüm · Deney) ve "Kendi sorunu yaz" formu. Hazır karta dokunmak
 *   planı varsayılanlarla uygular ve doğrudan Topla'ya geçer (Veri topla → kart → ilk cevap: 3 dokunuş).
 * - "Topla": üstte görev metni (araştırma sorusu; solunda ‹ = başlangıca dön, sağında [i] = öğretmen kartı); altında
 *   yalnız yönteme özgü iş yüzeyi (anket kutucukları · ölçüm tuş takımı · deney sahnesi); yapışkan alt çubuk
 *   [↶ Geri al] · sayım · [Bitti].
 * Düzenle / Yorumla içerikleri, kazanım rozetleri, tahmin ve öğretmen notu yalnız [i] kartındadır (varsayılan kapalı).
 *
 * Panel Tablom'a yalnız C'nin geri çağrılarıyla dokunur: `onPlaniUygula` (toplamaDurumu.planiUygula), `onVeri`
 * (toplamaVerisiYaz; hücreler veri rolleri sırasıyla), `onTabloIslemi` (birleştir / yeniden adlandır + tost), `onArastirma`
 * (metin ve plan; tabloya dokunmaz). Kendisine verilen kabı %100 doldurur; kompakt kararlarını `useBoyut` ile verir.
 * Kısayollar yalnız odak paneldeyken çalışır; aria-live duyuruları 250 ms'de bir toplanır.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  anketSatiri,
  hazirSoruBul,
  hazirSoruUygula,
  olcumDegeri,
  olcumMetni,
  olcumSatirlari,
  planSorunu,
  secenekEkle,
  secenekSayilari,
  secenekYenidenAdlandir,
  tablodakiAtis,
  toplananMetni,
  toplananSayisi,
  varsayilanArastirma,
  type Arastirma,
} from '../arastirma';
import { calismaSilindiMetni, fiil } from '../deney';
import type { Sekme } from '../durum';
import { DUGME_BIRINCIL, useBoyut } from '../ortak';
import { kimlikUret, type VeriTablosu } from '../veri';
import type { ToplamaVerisi } from '../toplamaDurumu';
import { AnketToplama } from './AnketToplama';
import { DeneyToplama } from './DeneyToplama';
import { OgretmenKarti, type OgretmenBolumu } from './OgretmenKarti';
import { OlcumGirisi } from './OlcumGirisi';
import { PlanAdimi } from './PlanAdimi';
import { SoruAdimi } from './SoruAdimi';
import { useDeneyCalistirici } from './useDeneyCalistirici';
import {
  geriAlBasligi,
  geriAlGecerli,
  gorevMetni,
  kayitliTaslak,
  kisayol,
  panelGorunumu,
  sonucMetni,
  taslakDevamMi,
  yedekGeriAl,
  yedekPlanUyarisi,
  type GeriAlKaydi,
} from './panelYardimcilari';
import { BilgiSimgesi, GeriAlSimgesi, OnaySimgesi, SolOkSimgesi } from './simgeler';

export { VeriToplaSimgesi } from './simgeler';

export interface VeriToplaPaneliProps {
  arastirma: Arastirma | null;
  tablo: VeriTablosu;
  bagli: boolean;
  azaltilmisHareket: boolean;
  /** Metin ve plan alanları (tabloya dokunmaz; C: arastirmaYaz) */
  onArastirma: (a: Arastirma) => void;
  /** C: planiUygula + tost [Geri al] */
  onPlaniUygula: (a: Arastirma) => void;
  /** C: setDurum(d => toplamaVerisiYaz(d, v)) */
  onVeri: (v: ToplamaVerisi) => void;
  /**
   * Birleştir / yeniden adlandır; C: tost [Geri al]. `arastirma` verilirse aynı güncellemede yazılır (seçenek adı
   * değişince plan da değişir).
   */
  onTabloIslemi: (yeni: VeriTablosu, tost: string, arastirma?: Arastirma) => void;
  onSekme: (s: Sekme) => void;
  onOzeteGec: () => void;
  /** C: seciliSatir (T kaydırır) */
  onSatirGoster: (satir: number) => void;
  /** C: T.yeniSatirKimligi + D1.vurguSatir */
  onYeniSatir: (kimlik: string | null) => void;
  onAkis: (akis: boolean) => void;
  onBildirim: (metin: string) => void;
  onKapat: () => void;
  /** İsteğe bağlı: ana grafiğin sekmesi (Yorumla önerilerinde etkin olan vurgulanır) */
  sekme?: Sekme | null;
  /** İsteğe bağlı: plan yeni tablo açacaksa uyarı (C: `a => planUyarisi(durum, a)`); yoksa yedek metin */
  planUyarisi?: (a: Arastirma) => string | null;
  className?: string;
}

const DUGME_SADE =
  'inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-[calc(var(--radius)-6px)] px-2.5 text-[13px] font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';
const SIMGE_DUGMESI =
  'grid h-11 w-11 shrink-0 place-items-center rounded-[calc(var(--radius)-6px)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';

export function VeriToplaPaneli({
  arastirma,
  tablo,
  bagli,
  azaltilmisHareket,
  onArastirma,
  onPlaniUygula,
  onVeri,
  onTabloIslemi,
  onSekme,
  onOzeteGec,
  onSatirGoster,
  onYeniSatir,
  onAkis,
  onBildirim,
  onKapat,
  sekme = null,
  planUyarisi,
  className = '',
}: VeriToplaPaneliProps) {
  const kokRef = useRef<HTMLElement>(null);
  const baslikRef = useRef<HTMLHeadingElement>(null);
  const panel = useBoyut(kokRef, { genislik: 410, yukseklik: 601 });
  const [taslak, setTaslak] = useState<Arastirma | null>(() => kayitliTaslak(arastirma, bagli));
  const [ogretmenAcik, setOgretmenAcik] = useState(false);
  const [bolum, setBolum] = useState<OgretmenBolumu>('etkinlik');
  const [duyuru, setDuyuru] = useState('');
  const yiginRef = useRef<GeriAlKaydi[]>([]);
  const [, yiginDegisti] = useState(0);
  const tusYonlendirici = useRef<((tus: string) => void) | null>(null);
  const kartId = `${useId()}-ogretmen`;

  // ── aria-live: 250 ms'de bir toplanır (son duyuru okunur) ──
  const kuyrukRef = useRef<string | null>(null);
  const duyuruZamaniRef = useRef<number | null>(null);
  const duyur = useCallback((m: string) => {
    kuyrukRef.current = m;
    if (duyuruZamaniRef.current !== null) return;
    duyuruZamaniRef.current = window.setTimeout(() => {
      duyuruZamaniRef.current = null;
      if (kuyrukRef.current !== null) setDuyuru(kuyrukRef.current);
      kuyrukRef.current = null;
    }, 250);
  }, []);
  useEffect(
    () => () => {
      if (duyuruZamaniRef.current !== null) window.clearTimeout(duyuruZamaniRef.current);
    },
    [],
  );

  const calistirici = useDeneyCalistirici({
    arastirma,
    tabloSatiri: tablo.satirlar.length,
    azaltilmisHareket,
    onVeri,
    onYeniSatir,
    onAkis,
    onBildirim,
    onOzeteGec,
    duyur,
  });
  const calisiyor = calistirici.calisiyor;

  const gorunum = panelGorunumu(arastirma, bagli, taslak !== null);

  // Araştırma değişince geri alma yığını boşalır; görünüm değişince öğretmen kartı kapanır ve odak başlığa gider
  const kimlik = arastirma?.kimlik ?? null;
  useEffect(() => {
    yiginRef.current = [];
    yiginDegisti((x) => x + 1);
  }, [kimlik]);
  const oncekiGorunum = useRef(gorunum);
  useEffect(() => {
    if (oncekiGorunum.current === gorunum) return;
    oncekiGorunum.current = gorunum;
    setOgretmenAcik(false);
    // Odak kaybolmasın (dokunulan kart söküldü): yeni görünümün başlığına
    if (kokRef.current?.contains(document.activeElement) || document.activeElement === document.body) baslikRef.current?.focus({ preventScroll: true });
  }, [gorunum]);

  const yigindanEkle = (k: GeriAlKaydi) => {
    yiginRef.current = [...yiginRef.current.slice(-199), k];
    yiginDegisti((x) => x + 1);
  };

  // ── Başlangıç ve form ──
  const hazirSec = (id: string) => {
    const h = hazirSoruBul(id);
    if (!h) return;
    if (arastirma && bagli && arastirma.hazirId === id) {
      onArastirma({ ...arastirma, adim: 'topla' });
      return;
    }
    const a = hazirSoruUygula(id);
    if (!a) return;
    if (h.acilis === 'plan') {
      setTaslak(a);
      return;
    }
    onPlaniUygula(a);
  };
  const taslakUygula = () => {
    if (!taslak || planSorunu(taslak)) return;
    onPlaniUygula({ ...taslak });
    setTaslak(null);
  };
  const baslangicaDon = () => {
    if (arastirma && calisiyor) calistirici.durdur();
    if (arastirma) onArastirma({ ...arastirma, adim: 'soru' });
  };
  const devam = taslak ? taslakDevamMi(taslak, arastirma, bagli) : false;
  const uyari = taslak ? (planUyarisi ? planUyarisi(taslak) : yedekPlanUyarisi(tablo, devam)) : null;
  const yenidenAdlandir = (eski: string, yeni: string) => {
    if (!arastirma) return;
    const r = secenekYenidenAdlandir(tablo, arastirma, eski, yeni);
    if (r.degisen > 0) onTabloIslemi(r.tablo, `${r.degisen} satır güncellendi.`, r.arastirma);
  };

  // ── Topla: veri yazma ──
  const a = arastirma;
  const cevapEkle = (secenek: string) => {
    if (!a) return;
    const k = kimlikUret('r');
    const once = secenekSayilari(tablo, a).satirlar.find((s) => s.secenek === secenek)?.sayi ?? 0;
    onVeri({ ekle: [{ kimlik: k, hucreler: anketSatiri(a, secenek) }] });
    onYeniSatir(k);
    yigindanEkle({ tur: 'satirlar', kimlikler: [k] });
    duyur(`${secenek}: ${once + 1}`);
  };
  const olcumEkle = (degerler: number[], ad: string) => {
    if (!a || degerler.length === 0) return;
    const satirlar = olcumSatirlari(a, degerler, ad);
    const kimlikler = satirlar.map(() => kimlikUret('r'));
    const n = toplananSayisi(tablo, a);
    onVeri({ ekle: satirlar.map((h, i) => ({ kimlik: kimlikler[i], hucreler: h })) });
    onYeniSatir(kimlikler[kimlikler.length - 1] ?? null);
    yigindanEkle({ tur: 'satirlar', kimlikler });
    duyur(degerler.length === 1 ? `${olcumMetni(a, olcumDegeri(degerler[0], a.olcum.duyarlik))} eklendi, ${n + 1}. ölçüm` : `${degerler.length} değer eklendi`);
  };
  const elleEkle = (hucreler: string[]) => {
    if (!a) return;
    const k = kimlikUret('r');
    const n = toplananSayisi(tablo, a);
    onVeri({ calismaBaslat: { no: 0, kayit: 'gercek', hedef: 1 }, ekle: [{ kimlik: k, hucreler, calisma: 0 }] });
    onYeniSatir(k);
    yigindanEkle({ tur: 'satirlar', kimlikler: [k] });
    const f = fiil(a.deney.nesne);
    duyur(`${f.charAt(0).toLocaleUpperCase('tr')}${f.slice(1)} ${n + 1}: ${sonucMetni(a.deney, hucreler)}`);
  };
  const grupSec = (i: number) => {
    if (!a) return;
    if (a.yontem === 'anket' && a.anket.grup) onArastirma({ ...a, anket: { ...a.anket, grup: { ...a.anket.grup, etkin: i } } });
    if (a.yontem === 'olcum' && a.olcum.grup) onArastirma({ ...a, olcum: { ...a.olcum, grup: { ...a.olcum.grup, etkin: i } } });
  };

  const geriAlKaydi = (): GeriAlKaydi | null => {
    if (!a) return null;
    if (a.yontem === 'deney' && a.deney.kayit === 'simulasyon') return yedekGeriAl(tablo, a);
    const gecerli = [...yiginRef.current].reverse().find((k) => geriAlGecerli(k, tablo, a));
    return gecerli ?? yedekGeriAl(tablo, a);
  };
  const geriAl = () => {
    if (!a || calisiyor) return;
    const k = geriAlKaydi();
    if (!k) return;
    const i = yiginRef.current.lastIndexOf(k);
    if (i >= 0) {
      yiginRef.current = yiginRef.current.slice(0, i);
      yiginDegisti((x) => x + 1);
    }
    if (k.tur === 'calisma') {
      const c = a.deney.calismalar.find((x) => !x.gercek && x.no === k.no);
      onVeri({ calismaSil: k.no });
      if (c) {
        const metin = calismaSilindiMetni(a.deney.nesne, c);
        onBildirim(metin);
        duyur(metin);
      }
    } else {
      onVeri({ sil: k.kimlikler });
      onYeniSatir(null);
      duyur(k.kimlikler.length > 1 ? `${k.kimlikler.length} satır geri alındı` : 'Son satır geri alındı');
    }
  };
  const geriAlVar = !!a && !calisiyor && geriAlKaydi() !== null;

  // ── Kısayollar (yalnız odak paneldeyken) ──
  const ogretmenDugmesiRef = useRef<HTMLButtonElement>(null);
  const tusBasildi = (e: React.KeyboardEvent<HTMLElement>) => {
    // Öğretmen kartı açıkken Escape kartı kapatır (odak nerede olursa olsun) ve odağı [i] düğmesine döndürür
    if (ogretmenAcik && e.key === 'Escape') {
      e.preventDefault();
      setOgretmenAcik(false);
      ogretmenDugmesiRef.current?.focus();
      return;
    }
    if (gorunum !== 'topla' || ogretmenAcik || !a || e.defaultPrevented) return;
    const hedef = e.target as HTMLElement;
    const etiket = hedef.tagName;
    const yazi = etiket === 'INPUT' || etiket === 'TEXTAREA' || etiket === 'SELECT' || hedef.isContentEditable;
    const rol = hedef.getAttribute('role');
    const dugme = etiket === 'BUTTON' || rol === 'radio' || rol === 'tab' || rol === 'menuitem' || rol === 'menuitemradio';
    const ey = kisayol(e, { etiket, yazi, dugme }, a.yontem, a.deney.kayit, calisiyor);
    if (!ey) return;
    e.preventDefault();
    switch (ey.tur) {
      case 'geriAl':
        geriAl();
        break;
      case 'secenek': {
        const s = secenekSayilari(tablo, a).satirlar[ey.indeks];
        if (s) cevapEkle(s.secenek);
        break;
      }
      case 'tus':
        tusYonlendirici.current?.(ey.tus);
        break;
      case 'ekle':
        tusYonlendirici.current?.('Enter');
        break;
      case 'tekAtis':
        calistirici.tekAtis();
        break;
      case 'kos':
        calistirici.kos();
        break;
      case 'durdur':
        calistirici.durdur();
        break;
    }
  };

  // ── Çizim (tek kök: ölçüm ve kısayollar görünüm değişince de sürer) ──
  let icerik: React.ReactNode;
  if (gorunum === 'form' && taslak) {
    icerik = (
      <>
        <h2 ref={baslikRef} tabIndex={-1} className="sr-only">
          Veri topla: plan
        </h2>
        <PlanAdimi
          taslak={taslak}
          onTaslak={setTaslak}
          onGeri={() => setTaslak(null)}
          onUygula={taslakUygula}
          devam={devam}
          uyari={uyari}
          tablo={tablo}
          bagliArastirma={bagli ? arastirma : null}
          onYenidenAdlandir={yenidenAdlandir}
          genislik={panel.genislik}
        />
      </>
    );
  } else if (gorunum === 'baslangic' || !a) {
    icerik = (
      <>
        <h2 ref={baslikRef} tabIndex={-1} className="sr-only">
          Veri topla: ne araştıralım?
        </h2>
        <SoruAdimi
          arastirma={arastirma}
          bagli={bagli}
          toplananMetni={arastirma && bagli ? toplananMetni(tablo, arastirma) : null}
          onHazirSoru={hazirSec}
          onDevam={() => arastirma && onArastirma({ ...arastirma, adim: 'topla' })}
          onYenidenBaslat={() => arastirma && onPlaniUygula({ ...arastirma })}
          onKendiSorun={() => setTaslak({ ...varsayilanArastirma(), adim: 'plan' })}
          onKapat={onKapat}
          genislik={panel.genislik}
        />
      </>
    );
  } else {
    icerik = (
      <div className="flex h-full min-h-0 flex-col" data-adim="topla" data-yontem={a.yontem ?? ''}>
        <header className="flex min-h-[60px] shrink-0 items-center gap-1 border-b border-border bg-card px-1.5 py-1.5">
          <button
            type="button"
            className={`${SIMGE_DUGMESI} text-foreground hover:bg-accent`}
            onClick={baslangicaDon}
            aria-label="Başlangıca dön: Ne araştıralım?"
            title="Ne araştıralım?"
            data-baslangica-don=""
          >
            <SolOkSimgesi className="h-5 w-5" />
          </button>
          <h2
            ref={baslikRef}
            tabIndex={-1}
            className={`line-clamp-2 min-w-0 flex-1 px-0.5 font-bold text-foreground focus:outline-none ${panel.genislik > 0 && panel.genislik < 360 ? 'text-[14px] leading-[18px]' : 'text-[15.5px] leading-[20px]'}`}
            title={gorevMetni(a)}
            data-gorev-metni=""
          >
            {gorevMetni(a)}
          </h2>
          <button
            ref={ogretmenDugmesiRef}
            type="button"
            className={`${SIMGE_DUGMESI} ${ogretmenAcik ? 'bg-primary text-primary-foreground dark:bg-[hsl(175_58%_30%)] dark:text-white' : 'text-primary hover:bg-accent'}`}
            onClick={() => setOgretmenAcik((x) => !x)}
            aria-label="Öğretmen kartı"
            aria-expanded={ogretmenAcik}
            aria-controls={ogretmenAcik ? kartId : undefined}
            title="Öğretmen kartı: kazanımlar, tahmin, veriyi düzenle ve yorumla"
            data-ogretmen-dugmesi=""
          >
            <BilgiSimgesi className="h-[22px] w-[22px]" />
          </button>
        </header>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <IsYuzeyi>
            {(alanG, alanY) => (
              <>
                {a.yontem === 'anket' && (
                  <AnketToplama
                    arastirma={a}
                    tablo={tablo}
                    onCevap={cevapEkle}
                    onSecenekEkle={(ad) => {
                      const y = secenekEkle(a, ad);
                      if (y === a) return false;
                      onArastirma(y);
                      duyur(`Yeni seçenek: ${ad.trim()}`);
                      return true;
                    }}
                    onGrupSec={grupSec}
                    azaltilmisHareket={azaltilmisHareket}
                  />
                )}
                {a.yontem === 'olcum' && (
                  <OlcumGirisi arastirma={a} tablo={tablo} onEkle={olcumEkle} onGrupSec={grupSec} alanYuksekligi={alanY} tusYonlendirici={tusYonlendirici} />
                )}
                {a.yontem === 'deney' && (
                  <DeneyToplama
                    arastirma={a}
                    tablo={tablo}
                    calistirici={calistirici}
                    azaltilmisHareket={azaltilmisHareket}
                    alanGenisligi={alanG}
                    alanYuksekligi={alanY}
                    onArastirma={onArastirma}
                    onElle={elleEkle}
                  />
                )}
              </>
            )}
          </IsYuzeyi>
          <footer className="flex h-14 shrink-0 items-center gap-1 border-t border-border bg-card px-2" data-alt-cubuk="">
            <button type="button" className={DUGME_SADE} onClick={geriAl} disabled={!geriAlVar} title={geriAlBasligi(a)} aria-label={geriAlBasligi(a)} data-geri-al="">
              <GeriAlSimgesi className="h-[18px] w-[18px]" />
              Geri al
            </button>
            {(() => {
              // Seri deneylerinin 500 ve üstü atışı yalnız Deney özetine yazılır: sayım ikisini birden söyler
              const tabloda = tablodakiAtis(tablo, a);
              return (
                <span className="mx-auto flex min-w-0 flex-col items-center px-1 leading-none">
                  <span className="whitespace-nowrap text-[15px] font-extrabold tabular-nums" data-sayim="">
                    {toplananMetni(tablo, a)}
                  </span>
                  {tabloda !== null && (
                    <span className="mt-1 whitespace-nowrap text-[12px] font-semibold tabular-nums text-muted-foreground" title="Büyük deneyler (500 ve üstü) yalnız Deney özetine yazılır." data-tablodaki="">
                      {tabloda} tabloda
                    </span>
                  )}
                </span>
              );
            })()}
            <button type="button" className={`${DUGME_BIRINCIL} px-4 text-[14px] font-bold`} onClick={onKapat} title="Paneli kapat; veri tabloda kalır" data-bitti="">
              <OnaySimgesi className="h-4 w-4" />
              Bitti
            </button>
          </footer>
          {ogretmenAcik && (
            // Kart iş yüzeyinin ve alt çubuğun üstünde durur; arkası hafifçe karartılır, boşluğa dokunmak kartı kapatır
            <div
              className="absolute inset-0 z-30 flex bg-[#15302d]/[0.18] p-2 dark:bg-black/45"
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) setOgretmenAcik(false);
              }}
              data-ogretmen-ortusu=""
            >
              <OgretmenKarti
                className="flex-1"
                kimlik={kartId}
                arastirma={a}
                tablo={tablo}
                sekme={sekme}
                bolum={bolum}
                onBolum={setBolum}
                onKapat={() => {
                  setOgretmenAcik(false);
                  ogretmenDugmesiRef.current?.focus();
                }}
                onArastirma={onArastirma}
                onTabloIslemi={onTabloIslemi}
                onSatirGoster={onSatirGoster}
                onSekme={onSekme}
                onOzeteGec={onOzeteGec}
                onPlaniDegistir={() => {
                  setOgretmenAcik(false);
                  setTaslak({ ...a, adim: 'plan' });
                }}
                onYeniArastirma={() => {
                  setOgretmenAcik(false);
                  baslangicaDon();
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section
      ref={kokRef}
      className={`relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background text-foreground ${className}`}
      data-veri-topla-paneli=""
      data-gorunum={gorunum}
      aria-label="Veri topla"
      onKeyDown={tusBasildi}
    >
      {icerik}
      <div className="sr-only" role="status" aria-live="polite" data-panel-duyurusu="">
        {duyuru}
      </div>
    </section>
  );
}

/** Topla'nın iş yüzeyi: kendi ölçüsünü (useBoyut; iç dolgu 12 px düşülür) çocuklarına verir */
function IsYuzeyi({ children }: { children: (genislik: number, yukseklik: number) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const b = useBoyut(ref, { genislik: 410, yukseklik: 485 });
  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col p-3" data-is-yuzeyi="">
      {children(Math.max(0, b.genislik - 24), Math.max(0, b.yukseklik - 24))}
    </div>
  );
}
