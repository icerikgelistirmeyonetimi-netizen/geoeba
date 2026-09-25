'use client';

/**
 * Deney iş yüzeyi (Topla · Deney; §0, VT §6.5, §11, §12.7).
 * - [Elle kaydet | Bilgisayar atsın] iki seçenekli anahtar.
 * - Bilgisayar atsın: sahne kartı (nesne düğmesi = tek atış; "Son atış (12.)" yuvası; canlı sayaç; durum satırı),
 *   "KAÇ ATIŞ?" çipleri, [▶ 20 kez at] + [Hız ▾] ve tek ikincil düğme "Atış sayısı artınca ne olur?" (seri 20 → 2000,
 *   bitince Deney özeti Çizgi grafiğinde; MAT.7.7.1 · 8.7.1).
 * - Elle kaydet: "GERÇEK ATIŞLAR · N" başlığı (kutucuklar yalnız elle kaydedilen atışları sayar; bilgisayar atışları
 *   varsa sağda "bilgisayar: 20"), sonuç kutucukları (para yüzü, zar yüzü, renk topu; iki küpte iki sıra) ve teorik
 *   olasılık satırı. İki küpte alçak alanda (< 440 px) tuşlar 48 px'e kadar küçülür, ipucu satırı düşer, dağılım kartı
 *   en az 72 px'tir: 1147 × 598'de de kaydırmasız sığar.
 * Sahne, sayaç, kutucuk, tablo şeridi ve grafik aynı kategori rengini taşır.
 */
import React, { useState } from 'react';
import type { Arastirma, KayitKipi } from '../arastirma';
import {
  atisSecenekleri,
  atisSiniriMetni,
  eylemMetni,
  etkinIzlenen,
  fiil,
  gercekEtiketi,
  izlenenTeorik,
  kacAtisBasligi,
  kalanMetni,
  kesirMetni,
  sahneEtiketi,
  sonAtisBasligi,
  sonucDegerleri,
  tekDeneyAtisi,
  teorikGosterilir,
  teorikMetni,
  torbadaKalan,
} from '../deney';
import { HIZ_MENUSU, hizAdi, hizKilidiMetni } from '../canlandirma';
import { DUGME_BIRINCIL, radyoTusu, useAcilirMenu } from '../ortak';
import type { VeriTablosu } from '../veri';
import { CanliSayac, sayacBicimi } from './CanliSayac';
import { IkiZarKutucuklari, SecenekKutucuklari } from './SecenekKutucuklari';
import { SahneKarti } from './sahneler/SahneKarti';
import { ParaSahnesi, type ParaYuzu } from './sahneler/ParaSahnesi';
import { ZarSahnesi } from './sahneler/ZarSahnesi';
import { CarkSahnesi, ibreDurmaAcisi } from './sahneler/CarkSahnesi';
import { CikanlarTepsisi, TorbaSahnesi } from './sahneler/TorbaSahnesi';
import { carkDilimleri, seriKullanilabilir } from './deneyMotoru';
import type { DeneyCalistirici } from './useDeneyCalistirici';
import {
  deneyKutucuklari,
  etiketRenkleri,
  izlenenDegeri,
  kutucukBicimi,
  sayacCalismasi,
  sayacSonuclari,
  sonAtisBilgisi,
  sonDeneyEtiketi,
  sonucMetni,
  sonucRenkleri,
} from './panelYardimcilari';
import {
  AsagiOkSimgesi,
  BaslatSimgesi,
  BilgisayarSimgesi,
  CeteleSimgesi,
  DurdurSimgesi,
  HizSimgesi,
  OnaySimgesi,
  SeriSimgesi,
} from './simgeler';

export interface DeneyToplamaProps {
  arastirma: Arastirma;
  tablo: VeriTablosu;
  calistirici: DeneyCalistirici;
  azaltilmisHareket: boolean;
  /** İş yüzeyinin ölçüsü (px): çip sütunları, sahne yönü ve kompakt karar */
  alanGenisligi: number;
  alanYuksekligi: number;
  onArastirma: (a: Arastirma) => void;
  /** Elle kaydet: bir gerçek atış (hücreler sonuç sütunları sırasıyla) */
  onElle: (hucreler: string[]) => void;
}

const BASLIK = 'text-[12px] font-extrabold tracking-[0.05em] text-muted-foreground';

function KayitAnahtari({ kayit, onKayit, kilitli, dar }: { kayit: KayitKipi; onKayit: (k: KayitKipi) => void; kilitli: boolean; dar: boolean }) {
  const ogeler: { id: KayitKipi; ad: string; simge: React.ReactNode; title: string }[] = [
    { id: 'gercek', ad: 'Elle kaydet', simge: <CeteleSimgesi className="h-[18px] w-[18px]" />, title: 'Sınıfta gerçek nesneyle deneyin, sonucu dokunarak yazın.' },
    {
      id: 'simulasyon',
      ad: dar ? 'Bilgisayar' : 'Bilgisayar atsın',
      simge: <BilgisayarSimgesi className="h-[18px] w-[18px]" />,
      title: 'Aynı deneyi bilgisayar yapsın.',
    },
  ];
  return (
    <div role="radiogroup" aria-label="Kayıt" className="grid shrink-0 grid-cols-2 gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-1" data-kayit={kayit}>
      {ogeler.map((o, i) => {
        const secili = o.id === kayit;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={secili}
            tabIndex={secili ? 0 : -1}
            title={o.title}
            disabled={kilitli && !secili}
            onClick={() => onKayit(o.id)}
            onKeyDown={(e) => radyoTusu(e, i, 2, (j) => onKayit(ogeler[j].id))}
            className={`inline-flex h-11 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-[calc(var(--radius)-8px)] text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45 ${
              secili ? 'bg-card text-foreground shadow-[0_2px_8px_-3px_rgba(6,40,45,.35),inset_0_0_0_2px_hsl(var(--primary))]' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {o.simge}
            {o.ad}
          </button>
        );
      })}
    </div>
  );
}

function HizMenusu({
  arastirma,
  onArastirma,
  kilit,
  calisiyor,
  gorunum,
}: {
  arastirma: Arastirma;
  onArastirma: (a: Arastirma) => void;
  kilit: string | null;
  calisiyor: boolean;
  /** 'uzun' "Hız: Otomatik" · 'kisa' "Otomatik" · 'simge' yalnız simge (kompakt) */
  gorunum: 'uzun' | 'kisa' | 'simge';
}) {
  const menu = useAcilirMenu();
  const hiz = arastirma.deney.hiz;
  const ad = kilit ? 'Anında' : hizAdi(hiz);
  return (
    <div ref={menu.kapRef} className="relative shrink-0">
      <button
        ref={menu.dugmeRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu.acik}
        aria-label={`Hız: ${ad}`}
        title={kilit ?? 'Canlandırma hızı'}
        disabled={kilit !== null}
        onClick={() => menu.setAcik((x) => !x)}
        onKeyDown={menu.dugmeTusu}
        className="inline-flex h-[52px] items-center gap-1.5 rounded-[calc(var(--radius)-6px)] border border-border bg-card px-2.5 text-[13px] font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-55"
        data-hiz={String(hiz)}
      >
        <HizSimgesi className="h-[18px] w-[18px] shrink-0" />
        {gorunum !== 'simge' && <span className="whitespace-nowrap">{gorunum === 'uzun' ? `Hız: ${ad}` : ad}</span>}
        <AsagiOkSimgesi className="h-3.5 w-3.5 shrink-0" />
      </button>
      {menu.acik && (
        <div
          ref={menu.menuRef}
          role="menu"
          aria-label="Hız"
          onKeyDown={menu.menuTusu}
          className="absolute bottom-full right-0 z-40 mb-1.5 flex w-[212px] flex-col rounded-[calc(var(--radius)-4px)] border border-border bg-popover p-1 text-popover-foreground shadow-[0_18px_40px_-16px_rgba(6,40,45,.55)]"
        >
          {HIZ_MENUSU.map((h) => {
            const secili = h.hiz === hiz;
            return (
              <button
                key={String(h.hiz)}
                type="button"
                role="menuitemradio"
                aria-checked={secili}
                onClick={() => {
                  onArastirma({ ...arastirma, deney: { ...arastirma.deney, hiz: h.hiz } });
                  menu.kapat(true);
                }}
                className="flex min-h-11 w-full items-center gap-2 rounded-[calc(var(--radius)-8px)] px-2.5 text-left text-[13.5px] font-semibold hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center text-primary">{secili && <OnaySimgesi className="h-4 w-4" />}</span>
                {h.ad}
              </button>
            );
          })}
          {calisiyor && <p className="px-2.5 pb-1 pt-0.5 text-[12px] leading-4 text-muted-foreground">Yeni hız sonraki atıştan başlar.</p>}
        </div>
      )}
    </div>
  );
}

/** Kompakt yükseklikte "KAÇ ATIŞ?" çiplerinin yerine açılır menü: [20 ▾] (menuitemradio; opak bg-popover) */
function AtisSayisiMenusu({
  secenekler,
  secili,
  onSec,
  baslik,
  kilitli,
  title,
}: {
  secenekler: number[];
  secili: number;
  onSec: (n: number) => void;
  baslik: string;
  kilitli: boolean;
  title?: string;
}) {
  const menu = useAcilirMenu();
  return (
    <div ref={menu.kapRef} className="relative shrink-0">
      <button
        ref={menu.dugmeRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu.acik}
        aria-label={`${baslik} ${secili}`}
        title={title}
        disabled={kilitli}
        onClick={() => menu.setAcik((x) => !x)}
        onKeyDown={menu.dugmeTusu}
        className="inline-flex h-[52px] min-w-[64px] items-center justify-center gap-1 rounded-[calc(var(--radius)-6px)] border border-border bg-card px-2.5 text-[15px] font-extrabold tabular-nums text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-55"
        data-atis-sayisi={secili}
      >
        {secili}
        <AsagiOkSimgesi className="h-3.5 w-3.5 shrink-0" />
      </button>
      {menu.acik && (
        <div
          ref={menu.menuRef}
          role="menu"
          aria-label={baslik}
          onKeyDown={menu.menuTusu}
          className="absolute bottom-full left-0 z-40 mb-1.5 grid w-[200px] grid-cols-2 gap-1 rounded-[calc(var(--radius)-4px)] border border-border bg-popover p-1 text-popover-foreground shadow-[0_18px_40px_-16px_rgba(6,40,45,.55)]"
        >
          {secenekler.map((c) => (
            <button
              key={c}
              type="button"
              role="menuitemradio"
              aria-checked={c === secili}
              onClick={() => {
                onSec(c);
                menu.kapat(true);
              }}
              className={`inline-flex h-11 items-center justify-center rounded-[calc(var(--radius)-8px)] text-[14px] font-extrabold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                c === secili ? 'bg-primary text-primary-foreground dark:bg-[hsl(175_58%_30%)] dark:text-white' : 'hover:bg-accent'
              }`}
              data-atis-cipi={c}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DeneyToplama({ arastirma: a, tablo, calistirici, azaltilmisHareket, alanGenisligi, alanYuksekligi, onArastirma, onElle }: DeneyToplamaProps) {
  const d = a.deney;
  const g = calistirici.gorunum;
  const calisiyor = calistirici.calisiyor;
  const kosuyor = calisiyor && g.tur !== 'dokunus';
  const [ikiZar, setIkiZar] = useState<[number | null, number | null]>([null, null]);
  const kompakt = alanYuksekligi > 0 && alanYuksekligi < 400;
  const dikey = alanYuksekligi >= 620;
  const dar = alanGenisligi > 0 && alanGenisligi < 330;
  const renkler = sonucRenkleri(d);
  const f = fiil(d.nesne);
  const kayitDegistir = (k: KayitKipi) => {
    if (k !== d.kayit) onArastirma({ ...a, deney: { ...d, kayit: k } });
  };

  // ── Elle kaydet ──
  if (d.kayit === 'gercek') {
    const kutucuklar = deneyKutucuklari(tablo, a);
    const gercekSayisi = kutucuklar.reduce((t, k) => t + k.sayi, 0);
    // Bilgisayar atışları kutucuklarda sayılmaz; başlık bunu söyler (grafik ve alt çubuk hepsini sayar)
    const bilgisayarSayisi = d.calismalar.filter((c) => !c.gercek).reduce((t, c) => t + c.n, 0);
    const teorikSatiri = d.teorikGoster && sonucDegerleri(d).length > 0;
    const alcak = alanYuksekligi > 0 && alanYuksekligi < 440;
    // İki küp: anahtar 52 + küp başlıkları 2 × 20 + aralık 8 + başlık 18 + dağılım + teorik satırı + boşluklar
    const dagilimEnAz = alcak ? 72 : 112;
    const teorikH = teorikSatiri ? (dar ? 54 : 36) : 0;
    const ipucuVar = !alcak;
    const ikiZarDugmesi = Math.max(
      48,
      Math.min(72, (alanYuksekligi - 52 - 8 - 48 - (ipucuVar ? 24 : 0) - 8 - dagilimEnAz - (teorikSatiri ? 8 + teorikH : 0)) / 2),
    );
    return (
      <div className={`flex min-h-0 flex-1 flex-col ${alcak ? 'gap-1.5' : 'gap-2'}`} data-yuzey="deney" data-kayit-kipi="gercek">
        <KayitAnahtari kayit={d.kayit} onKayit={kayitDegistir} kilitli={calisiyor} dar={dar} />
        {d.nesne !== 'iki-zar' && (
          <p className="flex shrink-0 items-baseline gap-2" data-gercek-basligi="">
            <span className={BASLIK}>
              {gercekEtiketi(d.nesne).toLocaleUpperCase('tr')} · <span className="tabular-nums text-foreground">{gercekSayisi}</span>
            </span>
            {bilgisayarSayisi > 0 && (
              <span className="ml-auto whitespace-nowrap text-[12px] font-semibold tabular-nums text-muted-foreground" title="Bilgisayarın atışları kutucuklarda sayılmaz; grafikte ve Deney özetinde görünür.">
                bilgisayar: {bilgisayarSayisi}
              </span>
            )}
          </p>
        )}
        {d.nesne === 'iki-zar' ? (
          <IkiZarKutucuklari
            className="shrink-0"
            dugmeBoyu={ikiZarDugmesi}
            ipucu={ipucuVar}
            secim={ikiZar}
            onSec={(kup, deger) => {
              const yeni: [number | null, number | null] = kup === 0 ? [deger, ikiZar[1]] : [ikiZar[0], deger];
              if (yeni[0] !== null && yeni[1] !== null) {
                onElle([String(yeni[0]), String(yeni[1]), String(yeni[0] + yeni[1])]);
                setIkiZar([null, null]);
              } else setIkiZar(yeni);
            }}
          />
        ) : (
          <SecenekKutucuklari
            className="min-h-0 flex-1"
            kutucuklar={kutucuklar}
            bicim={kutucukBicimi(d)}
            birim={f}
            onSec={(i) => {
              const k = kutucuklar[i];
              if (k) onElle([k.etiket]);
            }}
            azaltilmisHareket={azaltilmisHareket}
          />
        )}
        {d.nesne === 'iki-zar' && (
          // Gerçek atışların canlı dağılımı kalan yüksekliği doldurur (2 … 12 sütunları; boş alan kalmaz)
          <div
            className={`flex flex-1 flex-col rounded-[var(--radius)] border border-border bg-card ${alcak ? 'min-h-[72px] px-3 py-1.5' : 'min-h-[112px] p-3'}`}
            data-elle-sayac=""
          >
            <p className="mb-1 flex shrink-0 items-baseline gap-2">
              <span className={BASLIK}>
                {gercekEtiketi(d.nesne).toLocaleUpperCase('tr')} · <span className="tabular-nums text-foreground">{gercekSayisi}</span>
              </span>
              {bilgisayarSayisi > 0 && <span className="ml-auto whitespace-nowrap text-[12px] font-semibold tabular-nums text-muted-foreground">bilgisayar: {bilgisayarSayisi}</span>}
            </p>
            <CanliSayac
              className="flex-1"
              doldur
              sonuclar={sayacSonuclari(tablo, a, d.calismalar.some((c) => c.gercek) ? 0 : -1).sonuclar}
              bicim="dagilim"
              teorikGoster={false}
              birim={f}
              enSikAdi="en sık toplam"
            />
          </div>
        )}
        {teorikSatiri && (
          <p className="shrink-0 text-[12.5px] font-semibold leading-[18px] text-muted-foreground" data-teorik-metni="">
            {teorikMetni(d, 'her')}
          </p>
        )}
      </div>
    );
  }

  // ── Bilgisayar atsın ──
  const sayacNo = sayacCalismasi(a, calisiyor ? g.no : null);
  const { n, sonuclar } = sayacSonuclari(tablo, a, sayacNo);
  const tablodanSon = sayacNo >= 0 ? sonAtisBilgisi(tablo, a, sayacNo) : null;
  const son = g.son && (g.son.no === sayacNo || calisiyor) ? { degerler: g.son.degerler, sira: g.son.sira } : tablodanSon;
  // Sahnede görünen çekiliş: çalıştırıcının son çekilişi, yoksa tablodaki son atış
  const sahneDegerleri = g.degerler ?? son?.degerler ?? null;
  const atis = g.anahtar > 0 && g.sure > 0 ? { anahtar: g.anahtar, sure: g.sure } : null;
  const izlenen = etkinIzlenen(d);
  const bicim = sayacBicimi(sonuclar.length);
  const teorikVar = teorikGosterilir(d);
  const geriAtmadan = d.nesne === 'torba' && !d.torba.geriAt;
  const secenekler = atisSecenekleri(d);
  const sinirMetni = atisSiniriMetni(d);
  /** Tek deneyin atış sayısı (eski kayıttaki 500 / 2000 → 200: tek deney hep tabloya yazılır) */
  const atisSayisi = tekDeneyAtisi(d.atisSayisi);
  const kilit = hizKilidiMetni(atisSayisi, azaltilmisHareket, d.nesne);
  // Çipler sığıyorsa tek satırda (10 · 20 · 30 · 50 · 100 · 200: 1366'da ve 1022'de tek satır), sığmıyorsa iki satırda
  const cipSutun = alanGenisligi >= secenekler.length * 44 + (secenekler.length - 1) * 4 ? secenekler.length : Math.ceil(secenekler.length / 2);
  const seriVar = seriKullanilabilir(d);
  const seriOnerilir = a.hazirId === 'seri' && d.calismalar.length === 0;
  const yuvaRenk = son ? (d.nesne === 'zar' || d.nesne === 'iki-zar' ? undefined : renkler.get(izlenenDegeri(d, son.degerler))) : undefined;
  const torbaRenkleri = etiketRenkleri(d.torba.toplar.map((t) => t.etiket));
  const torbaToplari = d.torba.toplar.map((t, i) => ({ etiket: t.etiket.trim(), renk: torbaRenkleri[i], adet: Math.max(0, Math.floor(t.adet) || 0) }));
  const dilimRenkleri = etiketRenkleri(d.cark.dilimler.map((x) => x.etiket));
  const dilimler = carkDilimleri(d).map((x, i) => ({ ...x, renk: dilimRenkleri[i] }));
  const paraYuzleri: readonly [ParaYuzu, ParaYuzu] = [
    { etiket: 'Yazı', renk: renkler.get('Yazı') ?? '#2f8394' },
    { etiket: 'Tura', renk: renkler.get('Tura') ?? '#c8684a' },
  ];

  const nesneCiz = (boyut: number): React.ReactNode => {
    calistirici.sahneBoyuRef.current = boyut;
    if (d.nesne === 'para') return <ParaSahnesi boyut={boyut} yuzler={paraYuzleri} sonuc={sahneDegerleri?.[0] ?? null} atis={atis} azaltilmisHareket={azaltilmisHareket} />;
    if (d.nesne === 'zar' || d.nesne === 'iki-zar') {
      const kup = d.nesne === 'iki-zar' ? 2 : 1;
      const degerler = sahneDegerleri ? sahneDegerleri.slice(0, kup).map((v) => Number(v)) : null;
      return (
        <ZarSahnesi
          boyut={boyut}
          kupSayisi={kup}
          degerler={degerler && degerler.every((x) => Number.isFinite(x)) ? degerler : null}
          atis={atis ? { ...atis, yuzDizisi: g.zarYuzleri ?? undefined } : null}
          azaltilmisHareket={azaltilmisHareket}
        />
      );
    }
    if (d.nesne === 'cark') {
      const aci = g.anahtar > 0 ? g.ibreAcisi : ibreDurmaAcisi(dilimler, 0, 0.5, boyut);
      return <CarkSahnesi boyut={boyut} dilimler={dilimler} ibreAcisi={aci} sure={g.sure} secilen={g.carkSecilen} onDonmeBitti={calistirici.donmeBitti} />;
    }
    return (
      <TorbaSahnesi
        boyut={boyut}
        toplar={torbaToplari}
        cekilenler={geriAtmadan ? g.cekilenler : []}
        geriAt={d.torba.geriAt}
        atis={atis && sahneDegerleri ? { ...atis, etiket: sahneDegerleri[0] } : null}
        azaltilmisHareket={azaltilmisHareket}
      />
    );
  };

  const sayac = (
    <CanliSayac
      sonuclar={sonuclar}
      toplam={n}
      bicim={bicim}
      zarYuzu={d.nesne === 'zar'}
      teorikGoster={teorikVar}
      izlenen={izlenen}
      kalanMetni={geriAtmadan ? kalanMetni(torbadaKalan(d, g.cekilenler)) : null}
      teorikMetni={bicim === 'dagilim' && teorikVar ? `teorik ${kesirMetni(izlenenTeorik(d))}` : null}
      birim={f}
      enSikAdi={d.nesne === 'iki-zar' ? 'en sık toplam' : 'en sık'}
      teorikOzne={d.nesne === 'zar' ? 'her yüz' : d.nesne === 'cark' ? 'her dilim' : d.nesne === 'torba' ? 'her renk' : 'her sonuç'}
    />
  );

  const durum = kosuyor
    ? g.seri
      ? `Seri: ${g.seri.sira}. deney / ${g.seri.adet}`
      : g.butce ?? `${g.no}. deney · ${g.yapilan} / ${g.hedef}`
    : sonDeneyEtiketi(a);

  const calistirMetni = kosuyor
    ? g.seri
      ? `Durdur · ${g.seri.sira} / ${g.seri.adet} deney`
      : `Durdur · ${g.yapilan} / ${g.hedef}`
    : eylemMetni(d.nesne, atisSayisi);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-yuzey="deney" data-kayit-kipi="simulasyon">
      <KayitAnahtari kayit={d.kayit} onKayit={kayitDegistir} kilitli={calisiyor} dar={dar} />
      <SahneKarti
        className={`min-h-0 flex-1 ${kompakt ? 'min-h-[104px]' : 'min-h-[150px]'}`}
        sahne={d.nesne}
        yon={dikey ? 'dikey' : 'yatay'}
        nesne={nesneCiz}
        nesneEtiketi={sahneEtiketi(d.nesne)}
        onNesne={calistirici.tekAtis}
        nesnePasif={calisiyor}
        yuva={{ baslik: sonAtisBasligi(d.nesne, son?.sira ?? 0).replace(' (0.)', ''), sonuc: son ? sonucMetni(d, son.degerler) : null, renk: yuvaRenk }}
        sayac={sayac}
        ust={geriAtmadan ? <CikanlarTepsisi cikanlar={g.cekilenler.map((e) => ({ etiket: e, renk: renkler.get(e) ?? '#6f7c8c' }))} /> : undefined}
        durum={durum}
        enBuyukNesne={300}
        enKucukNesne={kompakt ? 80 : 96}
      />
      {!kompakt && (
      <div className="flex shrink-0 flex-col gap-1">
        <span className={BASLIK} id="vg-kac-atis">
          {kacAtisBasligi(d.nesne)}
        </span>
        <div
          role="radiogroup"
          aria-label={kacAtisBasligi(d.nesne)}
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, cipSutun)}, minmax(0, 1fr))` }}
          data-atis-sayisi={atisSayisi}
          title={sinirMetni ?? undefined}
        >
          {secenekler.map((c, i) => {
            const secili = c === atisSayisi;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={secili}
                tabIndex={secili || (!secenekler.includes(atisSayisi) && i === 0) ? 0 : -1}
                disabled={calisiyor}
                title={sinirMetni ?? undefined}
                onClick={() => onArastirma({ ...a, deney: { ...d, atisSayisi: c } })}
                onKeyDown={(e) => radyoTusu(e, i, secenekler.length, (j) => onArastirma({ ...a, deney: { ...d, atisSayisi: secenekler[j] } }))}
                className={`inline-flex h-11 min-w-[44px] items-center justify-center rounded-[calc(var(--radius)-8px)] border text-[13.5px] font-extrabold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed ${
                  secili ? 'border-primary bg-primary text-primary-foreground dark:bg-[hsl(175_58%_30%)] dark:text-white' : 'border-border bg-card text-foreground hover:bg-accent disabled:opacity-50'
                }`}
                data-atis-cipi={c}
              >
                {c}
              </button>
            );
          })}
        </div>
        {kilit && <p className="text-[12px] leading-4 text-muted-foreground">{kilit}</p>}
      </div>
      )}
      <div className="flex shrink-0 gap-2">
        {kompakt && (
          <AtisSayisiMenusu
            secenekler={secenekler}
            secili={atisSayisi}
            onSec={(c) => onArastirma({ ...a, deney: { ...d, atisSayisi: c } })}
            baslik={kacAtisBasligi(d.nesne)}
            kilitli={calisiyor}
            title={sinirMetni ?? kilit ?? undefined}
          />
        )}
        <button
          type="button"
          onClick={kosuyor ? calistirici.durdur : calistirici.kos}
          disabled={calisiyor && !kosuyor}
          className={`${DUGME_BIRINCIL} h-[52px] min-w-0 flex-1 text-[15px] font-extrabold disabled:opacity-60`}
          data-calistir={kosuyor ? 'durdur' : 'at'}
        >
          {kosuyor ? <DurdurSimgesi className="h-4 w-4 shrink-0" /> : <BaslatSimgesi className="h-4 w-4 shrink-0" />}
          <span className="truncate">{calistirMetni}</span>
        </button>
        <HizMenusu arastirma={a} onArastirma={onArastirma} kilit={kilit} calisiyor={kosuyor} gorunum={kompakt ? 'simge' : alanGenisligi >= 360 ? 'uzun' : 'kisa'} />
      </div>
      {seriVar && (
        <button
          type="button"
          onClick={calistirici.seri}
          disabled={calisiyor}
          title="Aynı deneyi 20, 50, 100, 200, 500, 1000 ve 2000 atışla yapar; Deney özetini Çizgi grafiğinde gösterir."
          className={`inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[calc(var(--radius)-6px)] border px-3 text-[13.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
            seriOnerilir ? 'border-primary bg-accent text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary))]' : 'border-border bg-card text-foreground hover:bg-accent'
          }`}
          data-seri=""
        >
          <SeriSimgesi className="h-5 w-5 shrink-0 text-primary" />
          <span className="truncate">{`${f === 'atış' ? 'Atış' : f === 'çevirme' ? 'Çevirme' : 'Çekiş'} sayısı artınca ne olur?`}</span>
        </button>
      )}
    </div>
  );
}
