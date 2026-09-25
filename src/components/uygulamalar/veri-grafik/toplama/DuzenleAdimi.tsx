'use client';

/**
 * Veriyi düzenle (öğretmen kartının "Düzenle" bölümü; §0, VT §6.6, §12.8).
 * - Anket: sıklık tablosu (Seçenek · Çetele · Sıklık · Yüzde · Toplam); gruplu ankette [Tümü | Gruplara göre]
 *   (iki yönlü görünüm); seçenek dışı yazımlar [Elma ile birleştir] / [Seçenek olarak ekle].
 * - Ölçüm: sıralı değerler, en küçük / en büyük / açıklık, boş hücreler ve ötekilerden çok uzak değerler
 *   [Tabloda göster].
 * - Deney: deney seçici, sıklık tablosu (Sonuç · Çetele · Sıklık · Göreli sıklık · Teorik) ve "ATIŞ SAYISI ARTINCA NE
 *   OLUR?" (sayılan sonuç, Deney özeti listesi, [Özeti Çizgi grafiğinde göster]); rozet "MAT.7.7.1 · 8.7.1".
 */
import React, { useId, useState } from 'react';
import {
  adimNotu,
  anketSayisalMi,
  arastirmaSutunu,
  olcumDuzenBilgisi,
  olcumMetni,
  secenekDisiYazimlar,
  secenekEkle,
  secenekSayilari,
  yazimBirlestir,
  type Arastirma,
} from '../arastirma';
import {
  calismaSayilari,
  deneySikliklari,
  etkinIzlenen,
  fiil,
  izlenenTeorik,
  kesirMetni,
  siraliCalismalar,
  sonucDegerleri,
  sonucSayisi,
  teorikGosterilir,
} from '../deney';
import { DUGME, radyoTusu } from '../ortak';
import { SecimCipleri } from './SecimCipleri';
import type { VeriTablosu } from '../veri';
import { Cetele } from './Cetele';
import { DeneyOzeti, type OzetSatiri } from './DeneyOzeti';
import { yuzdeMetni } from './bicim';
import { RenkNoktasiKucuk } from './nesneler';
import { SAYISAL_RENK, anketKutucuklari, sonucRenkleri } from './panelYardimcilari';

export interface DuzenleAdimiProps {
  arastirma: Arastirma;
  tablo: VeriTablosu;
  onArastirma: (a: Arastirma) => void;
  /** Tablo işlemi (birleştir): C tost + [Geri al] gösterir */
  onTabloIslemi: (yeni: VeriTablosu, tost: string, arastirma?: Arastirma) => void;
  onSatirGoster: (satir: number) => void;
  onOzeteGec: () => void;
}

const BASLIK = 'text-[12px] font-extrabold tracking-[0.05em] text-muted-foreground';
const HUCRE = 'px-2 text-[13px] leading-4';

/** Segment (radiogroup): kısa etiketler; tam ad title'da. Sığmayan öğeler alt satıra sarılır (kenarda kesilmez) */
function Segment<T extends string | number>({
  etiket,
  ogeler,
  secili,
  onSec,
}: {
  etiket: string;
  ogeler: { id: T; ad: string; baslik?: string }[];
  secili: T;
  onSec: (id: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={etiket} className="flex min-w-0 shrink-0 flex-wrap gap-0.5 rounded-[calc(var(--radius)-6px)] bg-muted p-1">
      {ogeler.map((o, i) => {
        const s = o.id === secili;
        return (
          <button
            key={String(o.id)}
            type="button"
            role="radio"
            aria-checked={s}
            tabIndex={s ? 0 : -1}
            title={o.baslik ?? o.ad}
            onClick={() => onSec(o.id)}
            onKeyDown={(e) => radyoTusu(e, i, ogeler.length, (j) => onSec(ogeler[j].id))}
            className={`inline-flex h-11 min-w-[44px] shrink-0 items-center whitespace-nowrap rounded-[calc(var(--radius)-8px)] px-2.5 text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              s ? 'bg-card text-foreground shadow-[0_2px_8px_-3px_rgba(6,40,45,.35)]' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {o.ad}
          </button>
        );
      })}
    </div>
  );
}

/** Sıklık tablosu (rol="table"): Sonuç · Çetele · Sıklık · Yüzde [· Teorik] · Toplam */
function SiklikTablosu({
  satirlar,
  toplam,
  basliklar,
  teorik,
}: {
  satirlar: { ad: string; renk: string; sayi: number; teorik?: number | null }[];
  toplam: number;
  basliklar: [string, string];
  teorik: boolean;
}) {
  const sutunlar = teorik ? 'minmax(64px,1fr) minmax(0,1.35fr) 46px 58px 52px' : 'minmax(64px,1fr) minmax(0,1.5fr) 50px 62px';
  // Çetele küçük sıklıklar içindir; herhangi bir sıklık 30'u aşarsa bütün satırlarda oran çubuğu
  const ceteleVar = satirlar.every((s) => s.sayi <= 30);
  return (
    <div role="table" aria-label="Sıklık tablosu" className="overflow-hidden rounded-[calc(var(--radius)-6px)] border border-border bg-card" data-siklik-tablosu="">
      <div role="row" className="grid min-h-[32px] items-center bg-muted text-[12px] font-extrabold text-muted-foreground" style={{ gridTemplateColumns: sutunlar }}>
        <span role="columnheader" className="px-2">
          {basliklar[0]}
        </span>
        <span role="columnheader" className="px-2">
          {ceteleVar ? 'Çetele' : 'Oran'}
        </span>
        <span role="columnheader" className="px-2 text-right">
          Sıklık
        </span>
        <span role="columnheader" className="px-2 text-right">
          {basliklar[1]}
        </span>
        {teorik && (
          <span role="columnheader" className="px-2 text-right">
            Teorik
          </span>
        )}
      </div>
      {satirlar.map((s) => (
        <div key={s.ad} role="row" className="grid min-h-[36px] items-center border-t border-border font-semibold" style={{ gridTemplateColumns: sutunlar }}>
          <span role="cell" className={`${HUCRE} flex min-w-0 items-center gap-1.5`}>
            <RenkNoktasiKucuk renk={s.renk} />
            <span className="truncate" title={s.ad}>
              {s.ad}
            </span>
          </span>
          <span role="cell" className="flex min-w-0 items-center overflow-hidden px-2">
            {ceteleVar ? (
              <Cetele sayi={s.sayi} renk={s.renk} yukseklik={14} enCokSatir={1} />
            ) : (
              <span className="block h-2 w-full overflow-hidden rounded-full bg-muted" data-siklik-cubugu="">
                <span className="block h-full rounded-full" style={{ width: `${toplam > 0 ? (s.sayi / toplam) * 100 : 0}%`, background: s.renk }} />
              </span>
            )}
          </span>
          <span role="cell" className={`${HUCRE} text-right tabular-nums`}>
            {s.sayi}
          </span>
          <span role="cell" className={`${HUCRE} text-right tabular-nums`}>
            {yuzdeMetni(s.sayi, toplam, 1)}
          </span>
          {teorik && (
            <span role="cell" className={`${HUCRE} text-right tabular-nums text-muted-foreground`}>
              {typeof s.teorik === 'number' ? yuzdeMetni(s.teorik, 1, 1) : '–'}
            </span>
          )}
        </div>
      ))}
      <div role="row" className="grid min-h-[36px] items-center border-t-2 border-border font-extrabold" style={{ gridTemplateColumns: sutunlar }}>
        <span role="cell" className={HUCRE}>
          Toplam
        </span>
        <span role="cell" />
        <span role="cell" className={`${HUCRE} text-right tabular-nums`}>
          {toplam}
        </span>
        <span role="cell" className={`${HUCRE} text-right`}>
          {toplam > 0 ? '%100' : '%0'}
        </span>
        {teorik && (
          <span role="cell" className={`${HUCRE} text-right`}>
            %100
          </span>
        )}
      </div>
    </div>
  );
}

function Rozet({ rozet }: { rozet: string }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-card px-2 text-[12px] font-semibold leading-none text-foreground" data-kazanim={rozet}>
      {rozet}
    </span>
  );
}

function AnketDuzenle({ arastirma: a, tablo, onArastirma, onTabloIslemi }: DuzenleAdimiProps) {
  const [gorunum, setGorunum] = useState<'tumu' | 'gruplar'>('tumu');
  const sayim = secenekSayilari(tablo, a);
  const kutucuklar = anketKutucuklari(tablo, a);
  const cevapId = a.sutunlar?.cevap;
  const grupId = a.sutunlar?.grup;
  const disari = secenekDisiYazimlar(tablo, a, 'cevap');
  const grupDisari = sayim.gruplar.length > 0 ? secenekDisiYazimlar(tablo, a, 'grup') : [];
  const birlestir = (sutunId: string | undefined, eski: string, yeni: string) => {
    if (!sutunId) return;
    const r = yazimBirlestir(tablo, sutunId, eski, yeni);
    if (r.degisen > 0) onTabloIslemi(r.tablo, `${r.degisen} satır güncellendi.`);
  };
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className={BASLIK}>SIKLIK TABLOSU</span>
        {sayim.gruplar.length > 0 && (
          <Segment
            etiket="Sıklık tablosu görünümü"
            ogeler={[
              { id: 'tumu', ad: 'Tümü' },
              { id: 'gruplar', ad: 'Gruplara göre' },
            ]}
            secili={gorunum}
            onSec={setGorunum}
          />
        )}
      </div>
      {gorunum === 'gruplar' && sayim.gruplar.length > 0 ? (
        <div
          role="table"
          aria-label={`${a.anket.grup?.ad ?? 'Gruba'} göre sıklık tablosu`}
          title="İki yönlü tablo"
          className="overflow-x-auto rounded-[calc(var(--radius)-6px)] border border-border bg-card"
          data-iki-yonlu=""
        >
          <div role="row" className="flex min-h-[32px] items-center bg-muted text-[12px] font-extrabold text-muted-foreground">
            <span role="columnheader" className="w-[96px] shrink-0 px-2">
              Seçenek
            </span>
            {sayim.gruplar.map((g) => (
              <span key={g} role="columnheader" className="w-14 shrink-0 px-2 text-right">
                {g}
              </span>
            ))}
            <span role="columnheader" className="w-14 shrink-0 px-2 text-right">
              Toplam
            </span>
          </div>
          {sayim.satirlar.map((s, i) => (
            <div key={s.secenek} role="row" className="flex min-h-[36px] items-center border-t border-border text-[13px] font-semibold">
              <span role="cell" className="flex w-[96px] min-w-0 shrink-0 items-center gap-1.5 px-2">
                <RenkNoktasiKucuk renk={kutucuklar[i]?.renk ?? SAYISAL_RENK} />
                <span className="truncate">{s.secenek}</span>
              </span>
              {s.gruplar.map((x, k) => (
                <span key={k} role="cell" className="w-14 shrink-0 px-2 text-right tabular-nums">
                  {x}
                </span>
              ))}
              <span role="cell" className="w-14 shrink-0 px-2 text-right font-extrabold tabular-nums">
                {s.sayi}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <SiklikTablosu
          satirlar={kutucuklar.map((k) => ({ ad: k.etiket, renk: k.renk, sayi: k.sayi }))}
          toplam={sayim.satirlar.reduce((t, s) => t + s.sayi, 0)}
          basliklar={['Seçenek', 'Yüzde']}
          teorik={false}
        />
      )}
      {anketSayisalMi(a) && <p className="text-[12px] leading-4 text-muted-foreground">Cevaplar sayı olduğu için İstatistik sekmesinde ortalama da hesaplanır.</p>}
      {[...disari.map((x) => ({ ...x, rol: 'cevap' as const })), ...grupDisari.map((x) => ({ ...x, rol: 'grup' as const }))].map((x) => (
        <div
          key={`${x.rol}-${x.deger}`}
          className="flex flex-col gap-1.5 rounded-[calc(var(--radius)-6px)] border border-[#d9805f]/50 bg-[#d9805f]/10 px-3 py-2"
          data-secenek-disi={x.deger}
        >
          <p className="text-[13px] font-semibold leading-[18px]">
            Tabloda {x.rol === 'grup' ? 'grup dışı' : 'seçenek dışı'} yazım: “{x.deger}” ({x.satirlar.length} satır).
          </p>
          <div className="flex flex-wrap gap-2">
            {x.oneri ? (
              <button type="button" className={DUGME} onClick={() => birlestir(x.rol === 'grup' ? grupId : cevapId, x.deger, x.oneri as string)}>
                {x.oneri} ile birleştir
              </button>
            ) : (
              x.rol === 'cevap' && (
                <button type="button" className={DUGME} onClick={() => onArastirma(secenekEkle(a, x.deger))}>
                  Seçenek olarak ekle
                </button>
              )
            )}
          </div>
        </div>
      ))}
      {sayim.bos > 0 && <p className="text-[12.5px] leading-4 text-muted-foreground">{sayim.bos} satırda cevap boş.</p>}
    </div>
  );
}

function OlcumDuzenle({ arastirma: a, tablo, onSatirGoster }: DuzenleAdimiProps) {
  const b = olcumDuzenBilgisi(tablo, a);
  const yaz = (x: number) => olcumMetni(a, x);
  const gorunen = b.degerler.slice(0, 60);
  return (
    <div className="flex flex-col gap-2.5">
      <span className={BASLIK}>SIRALI DEĞERLER</span>
      {b.degerler.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Henüz ölçüm yok.</p>
      ) : (
        <div className="flex flex-wrap gap-1" data-sirali-degerler="">
          {gorunen.map((x, i) => {
            const uzak = b.uzaklar.some((u) => u.deger === x);
            return (
              <span
                key={i}
                className={`inline-flex h-7 items-center rounded-full px-2 text-[12.5px] font-bold tabular-nums ${uzak ? 'bg-[#d9805f]/20 text-[#9a4a2f] ring-1 ring-[#d9805f] dark:text-[#f0b49b]' : 'bg-muted text-foreground'}`}
              >
                {olcumMetni(a, x).replace(` ${a.olcum.birim.trim()}`, '')}
              </span>
            );
          })}
          {b.degerler.length > 60 && <span className="inline-flex h-7 items-center px-1 text-[12.5px] font-semibold text-muted-foreground">… {b.degerler.length - 60} değer daha</span>}
        </div>
      )}
      {b.enKucuk !== null && b.enBuyuk !== null && b.aciklik !== null && (
        <p className="text-[13px] font-semibold leading-[18px]" data-aciklik="">
          En küçük {yaz(b.enKucuk)} · En büyük {yaz(b.enBuyuk)} · Açıklık {yaz(b.aciklik)}
        </p>
      )}
      {b.bosSatirlar.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[calc(var(--radius)-6px)] border border-border bg-muted px-3 py-2">
          <p className="min-w-0 flex-1 text-[13px] font-semibold">{b.bosSatirlar.length} hücre boş ya da okunamıyor.</p>
          <button type="button" className={DUGME} onClick={() => onSatirGoster(b.bosSatirlar[0])}>
            Tabloda göster
          </button>
        </div>
      )}
      {b.uzaklar.map((u) => (
        <div key={`${u.satir}`} className="flex flex-col gap-1.5 rounded-[calc(var(--radius)-6px)] border border-[#d9805f]/50 bg-[#d9805f]/10 px-3 py-2" data-uzak-deger={u.deger}>
          <p className="text-[13px] font-semibold leading-[18px]">{yaz(u.deger)} ötekilerden çok uzak: yazım hatası mı, gerçek bir değer mi?</p>
          <button type="button" className={`${DUGME} self-start`} onClick={() => onSatirGoster(u.satir)}>
            Tabloda göster
          </button>
        </div>
      ))}
    </div>
  );
}

function DeneyDuzenle({ arastirma: a, tablo, onArastirma, onOzeteGec }: DuzenleAdimiProps) {
  const d = a.deney;
  const [secim, setSecim] = useState<number | 'tumu'>('tumu');
  const secimId = useId();
  const calismalar = siraliCalismalar(d.calismalar);
  const gecerliSecim = secim === 'tumu' || calismalar.some((c) => (secim === 0 ? c.gercek : !c.gercek && c.no === secim)) ? secim : 'tumu';
  const renkler = sonucRenkleri(d);
  const teorik = teorikGosterilir(d);
  const s = deneySikliklari(tablo, a, gecerliSecim);
  const izlenen = etkinIzlenen(d);
  const ozet: OzetSatiri[] = calismalar
    .map((c) => {
      const x = calismaSayilari(tablo, a, c);
      return { etiket: c.etiket, n: x.n, sayi: Math.min(x.n, sonucSayisi(x.sayilar, izlenen)), tabloda: c.tabloda };
    })
    .filter((x) => x.n > 0);
  const f = fiil(d.nesne);
  const birimAd = f === 'atış' ? 'Atış' : f === 'çevirme' ? 'Çevirme' : 'Çekiş';
  const baslik = `${birimAd.toLocaleUpperCase('tr')} SAYISI ARTINCA NE OLUR?`;
  const izlenenAdi = d.nesne === 'iki-zar' ? `Toplam ${izlenen}` : izlenen;
  // Deney seçicinin etiketleri: "20 atış" · "500 atış"; aynı atış sayısı yinelenirse "2. deney (20)"
  const nSayisi = new Map<number, number>();
  for (const c of calismalar) if (!c.gercek) nSayisi.set(c.n, (nSayisi.get(c.n) ?? 0) + 1);
  const secimAdi = (c: (typeof calismalar)[number]) => (c.gercek ? 'Gerçek' : (nSayisi.get(c.n) ?? 0) > 1 ? c.etiket : `${c.n} ${f}`);
  return (
    <div className="flex flex-col gap-2.5">
      {calismalar.length > 1 && (
        <Segment
          etiket="Deney"
          ogeler={[
            ...calismalar.map((c) => ({
              id: c.gercek ? 0 : c.no,
              ad: secimAdi(c),
              baslik: c.etiket,
            })),
            { id: 'tumu' as const, ad: 'Tümü' },
          ]}
          secili={gecerliSecim}
          onSec={setSecim}
        />
      )}
      <SiklikTablosu
        satirlar={s.satirlar.map((x) => ({ ad: x.deger, renk: renkler.get(x.deger) ?? SAYISAL_RENK, sayi: x.sayi, teorik: x.teorik }))}
        toplam={s.n}
        basliklar={['Sonuç', 'Göreli']}
        teorik={teorik}
      />
      <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3" data-atis-sayisi-artinca="">
        <div className="flex items-center justify-between gap-2">
          <span className={BASLIK}>{baslik}</span>
          <Rozet rozet="MAT.7.7.1 · 8.7.1" />
        </div>
        <div className="flex flex-col gap-1.5 text-[13px]">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold" id={secimId}>
              {d.nesne === 'iki-zar' ? 'Sayılan toplam:' : 'Sayılan:'}
            </span>
            {teorik && <span className="ml-auto text-[12.5px] font-semibold text-muted-foreground">teorik {kesirMetni(izlenenTeorik(d))}</span>}
          </div>
          <SecimCipleri
            etiket="Sayılan"
            etiketId={secimId}
            secenekler={sonucDegerleri(d).map((v) => ({ id: v, ad: v }))}
            secili={izlenen}
            onSec={(v) => onArastirma({ ...a, deney: { ...d, izlenen: v } })}
          />
        </div>
        <DeneyOzeti
          satirlar={ozet}
          sayilanAd={izlenenAdi}
          renk={renkler.get(izlenen) ?? SAYISAL_RENK}
          teorik={teorik ? izlenenTeorik(d).olasilik : null}
          birimAd={birimAd}
          enCokYukseklik={220}
        />
        <button
          type="button"
          className={`${DUGME} w-full`}
          disabled={ozet.length < 2}
          title={ozet.length < 2 ? 'En az iki deney gerekir.' : undefined}
          onClick={onOzeteGec}
          data-ozete-gec=""
        >
          Özeti Çizgi grafiğinde göster
        </button>
        <p className="text-[12px] leading-4 text-muted-foreground">500 ve üstü {f} yalnız özete yazılır.</p>
      </div>
    </div>
  );
}

export function DuzenleAdimi(props: DuzenleAdimiProps) {
  const { arastirma: a, tablo } = props;
  const not = adimNotu(a, 'duzenle');
  const cevapVar = a.yontem === 'anket' ? arastirmaSutunu(tablo, a, 'cevap') >= 0 : true;
  return (
    <div className="flex flex-col gap-3" data-ogretmen-bolumu="duzenle">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[13px] leading-[18px] text-muted-foreground">{not.metin}</p>
        {a.yontem !== 'deney' && <Rozet rozet={not.rozet} />}
      </div>
      {a.yontem === 'anket' && cevapVar && <AnketDuzenle {...props} />}
      {a.yontem === 'olcum' && <OlcumDuzenle {...props} />}
      {a.yontem === 'deney' && <DeneyDuzenle {...props} />}
    </div>
  );
}
