'use client';

/**
 * "Kendi sorunu yaz" formu (§0: eski Soru + Plan adımları tek formda; VT §6.3–6.4, §12.4, §12.6).
 * - ARAŞTIRMA SORUMUZ (en çok 140 karakter; sayaç 120'den sonra), VERİYİ NASIL TOPLAYACAĞIZ? (Anket · Ölçüm · Deney).
 * - Anket: değişken adı, kime sorulduğu, 2–12 seçenek (+ Seçenek, + “Diğer”), gruplar.
 * - Ölçüm: neyin ölçüldüğü, birim, ölçme duyarlığı, kimlerin ölçüldüğü, kaç kişi, "Adları da yaz", gruplar.
 * - Deney: nesne kartları (Madenî para · Sayı küpü · İki sayı küpü · Çark · Torba), çark / torba düzenleyici, neyin
 *   sayılacağı ve teorik olasılık.
 * - Tablonun önizlemesi ("# | Meyve"), plan yeni tablo açacaksa uyarı ve yapışkan [Toplamaya başla ›].
 * Bağlı araştırmanın planı değişirken ("Planı değiştir") içinde cevap olan seçenek kaldırılamaz; adı değişirse aynı
 * hücreler de değişir (`onYenidenAdlandir`).
 */
import React, { useId, useRef } from 'react';
import {
  EN_COK_SECENEK,
  METIN_SINIRI,
  OLCME_DUYARLIKLARI,
  TOPLAMA_YONTEMLERI,
  YONTEM_BILGISI,
  anketSayisalMi,
  planSorunu,
  planSutunTuru,
  secenekSayilari,
  varsayilanGrup,
  veriRolleri,
  type Arastirma,
  type DeneyNesnesi,
  type OlcmeDuyarligi,
  type ToplamaYontemi,
} from '../arastirma';
import { DENEY_NESNELERI, NESNE_ADLARI, etkinIzlenen, sonucDegerleri, teorikMetni } from '../deney';
import { DUGME_BIRINCIL, ONAY_KUTUSU, TurIsareti, radyoTusu } from '../ortak';
import { sayiOku, type VeriTablosu } from '../veri';
import { GrupDuzenleyici } from './GrupSecici';
import { CarkDuzenleyici, TorbaDuzenleyici } from './NesneDuzenleyici';
import { SecimCipleri } from './SecimCipleri';
import { etiketRenkleri, onizlemeSutunlari, SAYISAL_RENK } from './panelYardimcilari';
import { ArtiSimgesi, KapatSimgesi, NesneSimgesi, SagOkSimgesi, SolOkSimgesi, YontemSimgesi } from './simgeler';
import { RenkNoktasiKucuk } from './nesneler';

const BASLIK = 'text-[12px] font-extrabold tracking-[0.05em] text-muted-foreground';
const GIRDI =
  'h-11 w-full min-w-0 rounded-[calc(var(--radius)-8px)] border border-border bg-card px-3 text-[14px] font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60';
const SADE_DUGME =
  'inline-flex h-11 items-center gap-1.5 rounded-[calc(var(--radius)-8px)] border border-dashed border-border px-3 text-[13px] font-bold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45';

export interface PlanAdimiProps {
  /** Düzenlenen taslak (panelin yerel durumu; tabloya dokunmaz) */
  taslak: Arastirma;
  onTaslak: (a: Arastirma) => void;
  /** ‹: "Ne araştıralım?"a dön (taslak bırakılır) */
  onGeri: () => void;
  /** Toplamaya başla / devam et */
  onUygula: () => void;
  /** Bağlı araştırmanın planı değişiyor (tablo korunur): düğme "Toplamaya devam et" */
  devam: boolean;
  /** Yeni tablo açılacaksa uyarı (C'nin `planUyarisi`; yoksa yedek) */
  uyari: string | null;
  /** Bağlı tablo (devamda cevap sayıları ve yeniden adlandırma için) */
  tablo: VeriTablosu;
  /** Devamda: bağlı araştırma (eski seçenek adları) */
  bagliArastirma: Arastirma | null;
  /** Devamda cevabı olan seçeneğin adı değişti: aynı hücreler de değişir */
  onYenidenAdlandir?: (eski: string, yeni: string) => void;
  genislik: number;
  className?: string;
}

function Alan({ etiket, children, dar }: { etiket: string; children: React.ReactNode; dar: boolean }) {
  return (
    <label className={dar ? 'flex flex-col gap-1' : 'grid grid-cols-[128px_minmax(0,1fr)] items-center gap-2'}>
      <span className={BASLIK}>{etiket}</span>
      {children}
    </label>
  );
}

function YontemKartlari({ yontem, onYontem }: { yontem: ToplamaYontemi | null; onYontem: (y: ToplamaYontemi) => void }) {
  return (
    <div role="radiogroup" aria-label="Veriyi nasıl toplayacağız?" className="grid grid-cols-3 gap-2">
      {TOPLAMA_YONTEMLERI.map((y, i) => {
        const secili = y === yontem;
        return (
          <button
            key={y}
            type="button"
            role="radio"
            aria-checked={secili}
            tabIndex={secili || (yontem === null && i === 0) ? 0 : -1}
            data-yontem={y}
            onClick={() => onYontem(y)}
            onKeyDown={(e) => radyoTusu(e, i, TOPLAMA_YONTEMLERI.length, (j) => onYontem(TOPLAMA_YONTEMLERI[j]))}
            className={`flex min-h-[64px] min-w-0 flex-col items-start justify-center gap-0.5 rounded-[calc(var(--radius)-4px)] border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              secili ? 'border-primary bg-accent shadow-[inset_0_0_0_1px_hsl(var(--primary))]' : 'border-border bg-card hover:bg-accent'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <YontemSimgesi yontem={y} className={`h-6 w-6 shrink-0 ${secili ? 'text-primary' : 'text-foreground/80'}`} />
              <span className="text-[14px] font-extrabold leading-[18px]">{YONTEM_BILGISI[y].ad}</span>
            </span>
            <span className="text-[12px] leading-4 text-muted-foreground">{YONTEM_BILGISI[y].altSatir}</span>
          </button>
        );
      })}
    </div>
  );
}

function NesneKartlari({ nesne, onNesne, dar }: { nesne: DeneyNesnesi; onNesne: (n: DeneyNesnesi) => void; dar: boolean }) {
  return (
    <div role="radiogroup" aria-label="Hangi nesneyle?" className={`grid gap-1.5 ${dar ? 'grid-cols-3' : 'grid-cols-5'}`}>
      {DENEY_NESNELERI.map((n, i) => {
        const secili = n === nesne;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={secili}
            tabIndex={secili ? 0 : -1}
            data-nesne={n}
            onClick={() => onNesne(n)}
            onKeyDown={(e) => radyoTusu(e, i, DENEY_NESNELERI.length, (j) => onNesne(DENEY_NESNELERI[j]))}
            className={`flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1 rounded-[calc(var(--radius)-4px)] border px-1 py-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              secili ? 'border-primary bg-accent shadow-[inset_0_0_0_1px_hsl(var(--primary))]' : 'border-border bg-card hover:bg-accent'
            }`}
          >
            <NesneSimgesi nesne={n} className={`h-7 w-7 ${secili ? 'text-primary' : 'text-foreground/80'}`} />
            <span className="text-[12px] font-bold leading-[14px]">{NESNE_ADLARI[n]}</span>
          </button>
        );
      })}
    </div>
  );
}

function AnketPlani({
  a,
  onA,
  dar,
  cevaplar,
  onYenidenAdlandir,
}: {
  a: Arastirma;
  onA: (a: Arastirma) => void;
  dar: boolean;
  /** devamda seçeneğin (eski adıyla) cevap sayısı */
  cevaplar: Map<string, number>;
  onYenidenAdlandir?: (eski: string, yeni: string) => void;
}) {
  const odakDegeri = useRef<Map<number, string>>(new Map());
  const secenekler = a.anket.secenekler;
  const renkler = anketSayisalMi(a) ? secenekler.map(() => SAYISAL_RENK) : etiketRenkleri(secenekler);
  const yaz = (s: string[]) => onA({ ...a, anket: { ...a.anket, secenekler: s } });
  const digerVar = secenekler.some((s) => s.trim().toLocaleLowerCase('tr') === 'diğer');
  const doluSayisi = secenekler.filter((s) => s.trim() !== '').length;
  return (
    <div className="flex flex-col gap-2.5">
      <Alan etiket="DEĞİŞKENİN ADI" dar={dar}>
        <input
          className={GIRDI}
          value={a.anket.degiskenAdi}
          maxLength={METIN_SINIRI.ad}
          placeholder="Ör. Meyve"
          onChange={(e) => onA({ ...a, anket: { ...a.anket, degiskenAdi: e.target.value } })}
        />
      </Alan>
      <Alan etiket="KİME SORUYORUZ?" dar={dar}>
        <input className={GIRDI} value={a.kimden} maxLength={METIN_SINIRI.kimden} placeholder="Ör. 6-A sınıfı" onChange={(e) => onA({ ...a, kimden: e.target.value })} />
      </Alan>
      <div className="flex flex-col gap-1.5">
        <span className={BASLIK}>SEÇENEKLER (2–12)</span>
        <div className={`grid gap-1.5 ${dar ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {secenekler.map((s, i) => {
            const cevap = cevaplar.get(odakDegeri.current.get(i) ?? s.trim()) ?? cevaplar.get(s.trim()) ?? 0;
            const gerekce = cevap > 0 ? `Bu seçenekte ${cevap} cevap var; önce tablodan silin.` : secenekler.length <= 2 ? 'En az iki seçenek gerekir.' : null;
            return (
              <div key={i} className="flex min-w-0 items-center gap-1.5" data-plan-secenegi={s}>
                <RenkNoktasiKucuk renk={renkler[i]} boyut={12} />
                <input
                  className={`${GIRDI} flex-1 px-2.5`}
                  value={s}
                  maxLength={METIN_SINIRI.ad}
                  placeholder={`${i + 1}. seçenek`}
                  aria-label={`${i + 1}. seçenek`}
                  onFocus={() => odakDegeri.current.set(i, s.trim())}
                  onBlur={(e) => {
                    const eski = odakDegeri.current.get(i);
                    odakDegeri.current.delete(i);
                    const yeni = e.target.value.trim();
                    if (eski && yeni && eski !== yeni && (cevaplar.get(eski) ?? 0) > 0) onYenidenAdlandir?.(eski, yeni);
                  }}
                  onChange={(e) => yaz(secenekler.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <button
                  type="button"
                  aria-label={`${s.trim() || `${i + 1}. seçenek`} seçeneğini kaldır`}
                  title={gerekce ?? undefined}
                  disabled={gerekce !== null}
                  onClick={() => yaz(secenekler.filter((_, j) => j !== i))}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-[calc(var(--radius)-8px)] text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35"
                >
                  <KapatSimgesi className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={SADE_DUGME} disabled={secenekler.length >= EN_COK_SECENEK} onClick={() => yaz([...secenekler, ''])}>
            <ArtiSimgesi className="h-4 w-4" />
            Seçenek
          </button>
          {!digerVar && (
            <button type="button" className={SADE_DUGME} disabled={doluSayisi >= EN_COK_SECENEK} onClick={() => {
              const bos = secenekler.findIndex((x) => x.trim() === '');
              yaz(bos >= 0 ? secenekler.map((x, j) => (j === bos ? 'Diğer' : x)) : [...secenekler, 'Diğer']);
            }}>
              <ArtiSimgesi className="h-4 w-4" />
              “Diğer”
            </button>
          )}
        </div>
        <p className="text-[12px] leading-4 text-muted-foreground">Seçeneklerin hepsi sayıysa (0, 1, 2 …) ortalama da hesaplanabilir.</p>
      </div>
      <GrupDuzenleyici grup={a.anket.grup} onGrup={(g) => onA({ ...a, anket: { ...a.anket, grup: g } })} varsayilan={varsayilanGrup()} />
    </div>
  );
}

function OlcumPlani({ a, onA, dar }: { a: Arastirma; onA: (a: Arastirma) => void; dar: boolean }) {
  const o = a.olcum;
  const yaz = (p: Partial<Arastirma['olcum']>) => onA({ ...a, olcum: { ...o, ...p } });
  const duyarlikAdi = (x: OlcmeDuyarligi) => (x === 1 ? 'Tam sayı' : x === 0.5 ? '0,5' : '0,1');
  return (
    <div className="flex flex-col gap-2.5">
      <Alan etiket="NEYİ ÖLÇÜYORUZ?" dar={dar}>
        <input className={GIRDI} value={o.degiskenAdi} maxLength={METIN_SINIRI.ad} placeholder="Ör. Boy" onChange={(e) => yaz({ degiskenAdi: e.target.value })} />
      </Alan>
      <Alan etiket="BİRİM" dar={dar}>
        <input className={GIRDI} value={o.birim} maxLength={METIN_SINIRI.ad} placeholder="Ör. cm" onChange={(e) => yaz({ birim: e.target.value })} />
      </Alan>
      <div className={dar ? 'flex flex-col gap-1' : 'grid grid-cols-[128px_minmax(0,1fr)] items-center gap-2'}>
        <span className={BASLIK} id="plan-duyarlik">
          ÖLÇME DUYARLIĞI
        </span>
        <div role="radiogroup" aria-labelledby="plan-duyarlik" className="grid grid-cols-3 gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-1">
          {OLCME_DUYARLIKLARI.map((x, i) => {
            const secili = o.duyarlik === x;
            return (
              <button
                key={x}
                type="button"
                role="radio"
                aria-checked={secili}
                tabIndex={secili ? 0 : -1}
                onClick={() => yaz({ duyarlik: x })}
                onKeyDown={(e) => radyoTusu(e, i, OLCME_DUYARLIKLARI.length, (j) => yaz({ duyarlik: OLCME_DUYARLIKLARI[j] }))}
                className={`h-11 rounded-[calc(var(--radius)-8px)] text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  secili ? 'bg-card text-foreground shadow-[inset_0_0_0_2px_hsl(var(--primary))]' : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {duyarlikAdi(x)}
              </button>
            );
          })}
        </div>
      </div>
      <Alan etiket="KİMLERİ ÖLÇÜYORUZ?" dar={dar}>
        <input className={GIRDI} value={a.kimden} maxLength={METIN_SINIRI.kimden} placeholder="Ör. 7-B sınıfı" onChange={(e) => onA({ ...a, kimden: e.target.value })} />
      </Alan>
      <Alan etiket="KAÇ KİŞİ? (İSTEĞE BAĞLI)" dar={dar}>
        <input
          className={`${GIRDI} tabular-nums`}
          inputMode="numeric"
          value={o.hedefSayi === null ? '' : String(o.hedefSayi)}
          placeholder="Ör. 24"
          onChange={(e) => {
            const s = sayiOku(e.target.value);
            yaz({ hedefSayi: s === null || s <= 0 ? null : Math.min(2000, Math.round(s)) });
          }}
        />
      </Alan>
      <div className="flex flex-col">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold">
          <input type="checkbox" className={ONAY_KUTUSU} checked={o.adYaz} onChange={(e) => yaz({ adYaz: e.target.checked })} />
          Adları da yaz
        </label>
        <p className="-mt-1 pl-[34px] text-[12px] leading-4 text-muted-foreground">Kişisel bilgileri gerekmedikçe yazmayız; sıra numarası yeterli.</p>
      </div>
      <GrupDuzenleyici grup={o.grup} onGrup={(g) => yaz({ grup: g })} onayMetni="Ölçümleri gruba ayır" varsayilan={varsayilanGrup()} />
    </div>
  );
}

function DeneyPlaniFormu({ a, onA, dar }: { a: Arastirma; onA: (a: Arastirma) => void; dar: boolean }) {
  const d = a.deney;
  const yaz = (p: Partial<Arastirma['deney']>) => onA({ ...a, deney: { ...d, ...p } });
  const sonuclar = sonucDegerleri(d);
  const izlenen = etkinIzlenen(d);
  const secimId = useId();
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1.5">
        <span className={BASLIK}>HANGİ NESNEYLE?</span>
        <NesneKartlari nesne={d.nesne} onNesne={(n) => yaz({ nesne: n, izlenen: null })} dar={dar} />
      </div>
      {d.nesne === 'torba' && <TorbaDuzenleyici torba={d.torba} onTorba={(t) => yaz({ torba: t })} />}
      {d.nesne === 'cark' && <CarkDuzenleyici cark={d.cark} onCark={(c) => yaz({ cark: c })} />}
      <div className="flex flex-col gap-1.5">
        <span className={BASLIK} id={secimId}>
          {d.nesne === 'iki-zar' ? 'NEYİ SAYACAĞIZ? (İKİ KÜPÜN TOPLAMI)' : 'NEYİ SAYACAĞIZ?'}
        </span>
        <SecimCipleri etiket="Neyi sayacağız?" etiketId={secimId} secenekler={sonuclar.map((v) => ({ id: v, ad: v }))} secili={izlenen} onSec={(v) => yaz({ izlenen: v })} />
      </div>
      <div className="flex flex-col">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold">
          <input type="checkbox" className={ONAY_KUTUSU} checked={d.teorikGoster} onChange={(e) => yaz({ teorikGoster: e.target.checked })} />
          Teorik olasılığı göster
        </label>
        {d.teorikGoster && sonuclar.length > 0 && (
          <p className="-mt-1 pl-[34px] text-[12.5px] font-semibold leading-[18px] text-muted-foreground" data-teorik-metni="">
            {teorikMetni(d)}
          </p>
        )}
      </div>
    </div>
  );
}

/** Tablo önizlemesi: "# | Meyve | Sınıf" (tür çipiyle) */
function Onizleme({ a }: { a: Arastirma }) {
  const adlar = onizlemeSutunlari(a);
  const roller = veriRolleri(a);
  if (adlar.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5" data-plan-onizleme="">
      <span className={BASLIK}>TABLO ŞÖYLE OLACAK</span>
      <div className="flex min-w-0 items-stretch overflow-hidden rounded-[calc(var(--radius)-8px)] border border-border bg-muted text-[13px] font-bold">
        <span className="grid w-10 shrink-0 place-items-center border-r border-border text-muted-foreground">#</span>
        {adlar.map((ad, i) => (
          <span key={`${ad}-${i}`} className="flex min-h-[40px] min-w-0 flex-1 items-center gap-1.5 border-r border-border px-2.5 last:border-r-0">
            <span className="truncate">{ad}</span>
            {roller[i] && <TurIsareti tur={planSutunTuru(a, roller[i])} />}
          </span>
        ))}
      </div>
      {a.yontem === 'deney' && <p className="text-[12px] leading-4 text-muted-foreground">Deney sütunu ikinci deneyde eklenir.</p>}
    </div>
  );
}

export function PlanAdimi({
  taslak,
  onTaslak,
  onGeri,
  onUygula,
  devam,
  uyari,
  tablo,
  bagliArastirma,
  onYenidenAdlandir,
  genislik,
  className = '',
}: PlanAdimiProps) {
  const dar = genislik < 360;
  const sorun = planSorunu(taslak);
  const soruId = useId();
  const kalan = METIN_SINIRI.soru - taslak.soru.length;
  // Devamda cevap sayıları (eski seçenek adlarıyla)
  const cevaplar = new Map<string, number>();
  if (devam && bagliArastirma && bagliArastirma.yontem === 'anket') {
    for (const s of secenekSayilari(tablo, bagliArastirma).satirlar) cevaplar.set(s.secenek, s.sayi);
  }
  const baslik = devam ? 'Planı değiştir' : taslak.hazirId ? 'Planı tamamla' : 'Kendi sorumuz';
  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`} data-adim="plan" data-yontem={taslak.yontem ?? ''}>
      <header className="flex min-h-[52px] shrink-0 items-center gap-1 border-b border-border bg-card px-1.5">
        <button
          type="button"
          onClick={onGeri}
          aria-label="Geri: Ne araştıralım?"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[calc(var(--radius)-6px)] text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SolOkSimgesi className="h-5 w-5" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-extrabold">{baslik}</h2>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3" data-plan-formu="">
        {taslak.hazirId === 'oylama' && (
          <p className="rounded-[calc(var(--radius)-6px)] bg-accent px-3 py-2 text-[13px] font-semibold leading-[18px] text-accent-foreground">
            Aday adlarını yazın; sonra toplamaya başlayın.
          </p>
        )}
        <label className="flex flex-col gap-1" htmlFor={soruId}>
          <span className="flex items-baseline justify-between">
            <span className={BASLIK}>ARAŞTIRMA SORUMUZ</span>
            {kalan < 20 && <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">{taslak.soru.length} / {METIN_SINIRI.soru}</span>}
          </span>
          <textarea
            id={soruId}
            rows={2}
            value={taslak.soru}
            maxLength={METIN_SINIRI.soru}
            placeholder="Ör. Sınıfımızda en çok sevilen meyve hangisi?"
            onChange={(e) => onTaslak({ ...taslak, soru: e.target.value })}
            className="w-full resize-none rounded-[calc(var(--radius)-6px)] border border-border bg-card px-3 py-2 text-[15px] leading-[21px] text-foreground placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className={BASLIK}>VERİYİ NASIL TOPLAYACAĞIZ?</span>
          <YontemKartlari yontem={taslak.yontem} onYontem={(y) => onTaslak({ ...taslak, yontem: y })} />
        </div>
        {taslak.yontem === 'anket' && (
          <AnketPlani a={taslak} onA={onTaslak} dar={dar} cevaplar={cevaplar} onYenidenAdlandir={devam ? onYenidenAdlandir : undefined} />
        )}
        {taslak.yontem === 'olcum' && <OlcumPlani a={taslak} onA={onTaslak} dar={dar} />}
        {taslak.yontem === 'deney' && <DeneyPlaniFormu a={taslak} onA={onTaslak} dar={dar} />}
        {taslak.yontem && <Onizleme a={taslak} />}
        {uyari && (
          <p className="rounded-[calc(var(--radius)-6px)] border border-border bg-muted px-3 py-2 text-[12.5px] font-semibold leading-[18px] text-foreground" data-plan-uyarisi="">
            {uyari}
          </p>
        )}
      </div>
      <footer className="flex min-h-[64px] shrink-0 flex-col justify-center gap-1 border-t border-border bg-card px-3 py-1.5">
        {sorun && taslak.yontem !== null && (
          <p className="text-[12px] font-semibold leading-4 text-[#b25a3c] dark:text-[#e6a184]" role="status" data-plan-sorunu="">
            {sorun}
          </p>
        )}
        <button
          type="button"
          onClick={onUygula}
          disabled={sorun !== null}
          title={sorun ?? undefined}
          className={`${DUGME_BIRINCIL} h-[52px] w-full text-[15px] font-extrabold disabled:pointer-events-none disabled:opacity-45`}
          data-toplamaya-basla=""
        >
          {devam ? 'Toplamaya devam et' : 'Toplamaya başla'}
          <SagOkSimgesi className="h-5 w-5" />
        </button>
      </footer>
    </div>
  );
}
