'use client';

/**
 * Ölçüm iş yüzeyi (Topla · Ölçüm; VT §6.5, §12.7).
 * - "Adları da yaz" açıksa "Ad (isteğe bağlı)" alanı; gruplu ölçümde "ÖLÇÜLEN: [6-A] [6-B]".
 * - Değer ekranı gerçek bir `input`tur (56 px, 28 px, sağa yaslı; birim değerle aynı taban çizgisinde; Enter = Ekle).
 *   Okunamayan girişte kırmızı kenar ve "Sayı okunamadı: “15,,2”"; beklenen aralığın çok dışındaki değer eklenir,
 *   uyarı çıkar. Değer ölçme duyarlığına yuvarlanırsa bu söylenir ("7,3 yuvarlandı: 7,5 (ölçme duyarlığı 0,5)").
 * - 4 × 4 tuş takımı; tuş boyu kalan yüksekliğe göre 44–72 px (boş alan kalmaz).
 * - "Eklendi: 84 atım/dk (12. ölçüm)" (dar panelde iki satıra sarılır) ve "Listeden ekle" (tuş takımının ve tek değer
 *   kutusunun yerine yazı alanı, canlı önizleme).
 * - Alçak iş yüzeyinde (< 360 px; 760 px genişlikte alt alta düzen) kompakt: değer kutusu 48 px, uyarı ayrı satır
 *   yerine "Eklendi" satırında; tuşlar 44 px'in altına inmez, "Listeden ekle" alt çubuğun altında kalmaz.
 * - Kaç kişi ölçüleceği girildiyse ilerleme çubuğu; büyük ekranda "Son eklenenler".
 * Tuş takımına dokunmak girdiye odaklanmaz (dokunmatik tahtada ekran klavyesi açılmasın).
 */
import React, { useEffect, useId, useRef, useState, type MutableRefObject } from 'react';
import {
  arastirmaSutunu,
  beklenenUyarisi,
  hizliListeAyristir,
  listeOnizlemeMetni,
  olcumDegeri,
  olcumHucresi,
  olcumMetni,
  toplananSayisi,
  yuvarlamaNotu,
  type Arastirma,
} from '../arastirma';
import { DUGME, DUGME_BIRINCIL } from '../ortak';
import { sayiOku, type VeriTablosu } from '../veri';
import { GrupSecici } from './GrupSecici';
import { SayiTusTakimi, tusUygula, type SayiTusu } from './SayiTusTakimi';
import { AsagiOkSimgesi, OnaySimgesi, YukariOkSimgesi } from './simgeler';

export interface OlcumGirisiProps {
  arastirma: Arastirma;
  tablo: VeriTablosu;
  /** Değerleri ekler (panel duyarlığa yuvarlar ve satırları yazar) */
  onEkle: (degerler: number[], ad: string) => void;
  onGrupSec: (indeks: number) => void;
  /** İş yüzeyinin yüksekliği (px): tuş boyu buna göre */
  alanYuksekligi: number;
  kilitli?: boolean;
  /** Panel kısayolları buraya yönlendirilir ('0'–'9', ',', '.', '-', 'Backspace', 'Enter') */
  tusYonlendirici?: MutableRefObject<((tus: string) => void) | null>;
}

const EN_UZUN = 12;

/** Kısayol tuşunun tuş takımındaki karşılığı */
function tusKarsiligi(k: string): SayiTusu | null {
  if (/^[0-9]$/.test(k)) return k as SayiTusu;
  if (k === ',' || k === '.') return 'virgul';
  if (k === '-') return 'eksi';
  if (k === 'Backspace') return 'sil';
  return null;
}

/** Tuş boyu: sabit öğeler çıkınca kalan yükseklik dört sıraya bölünür (44–72 px; büyük ekranda 108'e kadar) */
export function olcumTusBoyu(alan: number, sabit: number): number {
  const pay = (alan - sabit - 3 * 6) / 4;
  const enCok = alan >= 740 ? 108 : alan >= 660 ? 96 : 72;
  return Math.round(Math.max(44, Math.min(enCok, Number.isFinite(pay) ? pay : 52)));
}

export function OlcumGirisi({ arastirma: a, tablo, onEkle, onGrupSec, alanYuksekligi, kilitli = false, tusYonlendirici }: OlcumGirisiProps) {
  const o = a.olcum;
  const [metin, setMetin] = useState('');
  const [ad, setAd] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);
  const [eklendi, setEklendi] = useState<string | null>(null);
  const [listeAcik, setListeAcik] = useState(false);
  const [liste, setListe] = useState('');
  const girdiId = useId();
  const listeRef = useRef<HTMLTextAreaElement>(null);
  const n = toplananSayisi(tablo, a);
  const birim = o.birim.trim();
  const eksiVar = !(o.beklenen && o.beklenen[0] >= 0);
  const virgulVar = o.duyarlik !== 1;
  const genis = alanYuksekligi >= 660;
  const kompakt = alanYuksekligi > 0 && alanYuksekligi < 360;

  const ekle = () => {
    if (kilitli) return;
    const m = metin.trim();
    if (m === '') return;
    const x = sayiOku(m);
    if (x === null) {
      setHata(`Sayı okunamadı: “${m}”`);
      return;
    }
    const v = olcumDegeri(x, o.duyarlik);
    onEkle([x], ad);
    const notlar = [yuvarlamaNotu(x, o.duyarlik), beklenenUyarisi(a, v)].filter((m): m is string => m !== null);
    setUyari(notlar.length > 0 ? notlar.join(' · ') : null);
    setEklendi(`Eklendi: ${olcumMetni(a, v)} (${n + 1}. ölçüm)`);
    setMetin('');
    setAd('');
    setHata(null);
  };

  const tus = (t: SayiTusu) => {
    setMetin((m) => tusUygula(m, t, EN_UZUN));
    setHata(null);
  };

  // Panel kısayolları
  const ekleRef = useRef(ekle);
  ekleRef.current = ekle;
  useEffect(() => {
    if (!tusYonlendirici) return;
    tusYonlendirici.current = (k: string) => {
      if (k === 'Enter') ekleRef.current();
      else {
        const t = tusKarsiligi(k);
        if (t) tus(t);
      }
    };
    return () => {
      tusYonlendirici.current = null;
    };
  }, [tusYonlendirici]);

  useEffect(() => {
    if (listeAcik) listeRef.current?.focus();
  }, [listeAcik]);

  const ayrisim = hizliListeAyristir(liste);
  const onizleme = listeOnizlemeMetni(ayrisim, a);

  // Son eklenenler (büyük ekran): tablonun son 8 değeri
  const j = arastirmaSutunu(tablo, a, 'deger');
  const sonlar = j >= 0 ? tablo.satirlar.slice(-8).map((r) => (r.hucreler[j] ?? '').trim()).filter((h) => h !== '') : [];

  const hedef = o.hedefSayi;
  // Sabit öğeler: değer kutusu, (kompakt değilse) ileti satırı, "Eklendi" satırı, ilerleme, ad, grup, son eklenenler
  const sabit = kompakt
    ? 48 + 44 + (hedef ? 22 : 0) + (o.adYaz ? 52 : 0) + (o.grup ? 52 : 0) + 8 * 2
    : (genis ? 64 : 56) + 20 + 44 + (hedef ? 22 : 0) + (o.adYaz ? 52 : 0) + (o.grup ? 52 : 0) + (genis ? 60 : 0) + 8 * 4;
  const tusBoyu = olcumTusBoyu(alanYuksekligi, sabit);
  // Kompakt düzende uyarı ve hata "Eklendi" satırında gösterilir (öncelik: hata, uyarı, eklendi)
  const altIleti = kompakt ? (hata ? { tur: 'hata' as const, metin: hata } : uyari ? { tur: 'uyari' as const, metin: uyari } : eklendi ? { tur: 'eklendi' as const, metin: eklendi } : null) : eklendi ? { tur: 'eklendi' as const, metin: eklendi } : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-yuzey="olcum">
      {o.adYaz && (
        <input
          className="h-11 w-full shrink-0 rounded-[calc(var(--radius)-8px)] border border-border bg-card px-3 text-[14px] font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={ad}
          maxLength={24}
          placeholder="Ad (isteğe bağlı)"
          aria-label="Ad (isteğe bağlı)"
          onChange={(e) => setAd(e.target.value)}
        />
      )}
      {o.grup && <GrupSecici grup={o.grup} onSec={onGrupSec} baslik="Ölçülen" />}
      {!listeAcik && (
        // Değer kutusu: girdi ve birim aynı taban çizgisinde (flex items-baseline); kenar ve odak halkası kapta
        <div
          className={`flex shrink-0 items-baseline gap-2 rounded-[calc(var(--radius)-6px)] border-2 bg-card px-3 focus-within:ring-2 focus-within:ring-ring ${
            kompakt ? 'h-12' : genis ? 'h-16' : 'h-14'
          } ${hata ? 'border-destructive' : 'border-primary/70'}`}
          data-olcum-degeri=""
        >
          <label htmlFor={girdiId} className="sr-only">
            {`${o.degiskenAdi.trim() || 'Değer'}${birim ? ` (${birim})` : ''}`}
          </label>
          <input
            id={girdiId}
            value={metin}
            inputMode="decimal"
            autoComplete="off"
            placeholder="Değeri yazın"
            aria-invalid={hata ? true : undefined}
            aria-describedby={hata ? `${girdiId}-hata` : undefined}
            disabled={kilitli}
            onChange={(e) => {
              setMetin(e.target.value.slice(0, EN_UZUN + 1));
              setHata(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                ekle();
              }
            }}
            data-olcum-girdisi=""
            className={`${kompakt ? 'text-[24px]' : genis ? 'text-[32px]' : 'text-[28px]'} h-full min-w-0 flex-1 bg-transparent text-right font-extrabold tabular-nums text-foreground outline-none placeholder:font-semibold placeholder:text-muted-foreground/60`}
          />
          {birim && (
            <span aria-hidden="true" className="shrink-0 whitespace-nowrap text-[15px] font-semibold text-muted-foreground">
              {birim}
            </span>
          )}
        </div>
      )}
      {!kompakt && !listeAcik && (
        <p
          className={`-mt-1 h-5 shrink-0 truncate text-[12.5px] font-semibold leading-5 ${hata ? 'text-destructive' : 'text-[#b25a3c] dark:text-[#e6a184]'}`}
          id={`${girdiId}-hata`}
          role={hata ? 'alert' : undefined}
          title={hata ?? uyari ?? undefined}
          data-olcum-iletisi=""
        >
          {hata ?? uyari ?? ''}
        </p>
      )}
      {listeAcik ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5" data-listeden-ekle="">
          <label className="shrink-0 text-[12px] font-extrabold tracking-[0.05em] text-muted-foreground" htmlFor={`${girdiId}-liste`}>
            LİSTEDEN EKLE
          </label>
          <textarea
            id={`${girdiId}-liste`}
            ref={listeRef}
            rows={3}
            value={liste}
            onChange={(e) => setListe(e.target.value)}
            placeholder="Ör. 72 80 76 91"
            className="min-h-[76px] w-full flex-1 resize-none rounded-[calc(var(--radius)-6px)] border border-border bg-card px-3 py-2 text-[15px] leading-[21px] tabular-nums text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="shrink-0 text-[12px] leading-4 text-muted-foreground">Ondalık için virgül: 1,5. Değerleri boşluk, satır sonu ya da noktalı virgülle ayırın.</p>
          <p
            className={`min-h-[18px] shrink-0 text-[12.5px] font-semibold leading-[18px] ${ayrisim.hatalar.length > 0 ? 'text-destructive' : 'text-foreground'}`}
            aria-live="polite"
            data-liste-onizleme=""
          >
            {onizleme}
          </p>
          <button
            type="button"
            disabled={kilitli || ayrisim.degerler.length === 0}
            onClick={() => {
              onEkle(ayrisim.degerler, '');
              const son = ayrisim.degerler[ayrisim.degerler.length - 1];
              setEklendi(`Eklendi: ${ayrisim.degerler.length} değer (son: ${olcumHucresi(son, o.duyarlik)}${birim ? ` ${birim}` : ''})`);
              setUyari(null);
              setListe('');
              setListeAcik(false);
            }}
            className={`${DUGME_BIRINCIL} h-12 min-h-[48px] w-full shrink-0 text-[14px] font-bold disabled:pointer-events-none disabled:opacity-45`}
          >
            <OnaySimgesi className="h-4 w-4" />
            Listeyi ekle
          </button>
        </div>
      ) : (
        <SayiTusTakimi
          className="shrink-0"
          onTus={tus}
          onEkle={ekle}
          ekleEtkin={metin.trim() !== ''}
          tusBoyu={tusBoyu}
          eksiVar={eksiVar}
          virgulVar={virgulVar}
          kilitli={kilitli}
        />
      )}
      <div className="flex min-h-[44px] shrink-0 items-center gap-2">
        <span
          className={`flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px] font-semibold ${
            altIleti?.tur === 'hata' ? 'text-destructive' : altIleti?.tur === 'uyari' ? 'text-[#b25a3c] dark:text-[#e6a184]' : 'text-[#1f7a72] dark:text-[#5cc6bb]'
          }`}
          id={kompakt ? `${girdiId}-hata` : undefined}
          role={kompakt && hata ? 'alert' : undefined}
          data-eklendi=""
          data-olcum-iletisi={kompakt ? '' : undefined}
        >
          {altIleti?.tur === 'eklendi' && <OnaySimgesi className="h-4 w-4 shrink-0" />}
          <span className="line-clamp-2 leading-4" title={altIleti?.metin}>
            {altIleti?.metin ?? ''}
          </span>
        </span>
        <button type="button" className={DUGME} aria-expanded={listeAcik} onClick={() => setListeAcik((x) => !x)} data-liste-dugmesi="">
          {listeAcik ? 'Tuş takımı' : 'Listeden ekle'}
          {listeAcik ? <YukariOkSimgesi className="h-3.5 w-3.5" /> : <AsagiOkSimgesi className="h-3.5 w-3.5" />}
        </button>
      </div>
      {genis && !listeAcik && (
        <div className="flex h-[52px] shrink-0 flex-col gap-1 overflow-hidden" data-son-eklenenler="">
          <span className="text-[12px] font-extrabold tracking-[0.05em] text-muted-foreground">SON EKLENENLER</span>
          <span className="flex min-w-0 flex-wrap gap-1.5 overflow-hidden" style={{ height: 32 }}>
            {sonlar.length === 0 && <span className="text-[12.5px] leading-8 text-muted-foreground">Henüz ölçüm yok.</span>}
            {[...sonlar].reverse().map((s, i) => (
              <span
                key={i}
                className={`inline-flex h-8 items-center rounded-full px-3 text-[14px] font-bold tabular-nums ${i === 0 ? 'bg-primary text-primary-foreground dark:bg-[hsl(175_58%_30%)] dark:text-white' : 'bg-muted text-foreground'}`}
              >
                {s}
              </span>
            ))}
          </span>
        </div>
      )}
      {hedef !== null && hedef > 0 && (
        <div className="flex shrink-0 items-center gap-2" data-olcum-ilerlemesi="">
          <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${Math.min(100, (n / hedef) * 100)}%` }} />
          </span>
          <span className="shrink-0 text-[12px] font-semibold tabular-nums text-muted-foreground">
            {n} / {hedef} kişi ölçüldü
          </span>
        </div>
      )}
    </div>
  );
}
