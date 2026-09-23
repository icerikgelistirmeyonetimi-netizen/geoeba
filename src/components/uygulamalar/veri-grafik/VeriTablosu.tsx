'use client';

/**
 * Veri tablosu: satırlar gözlem, sütunlar değişken. Hücreler tıkla/yaz ile düzenlenir;
 * Enter aşağı, Tab sağa gider. Excel/Sheets'ten yapıştırma (sekme/virgül) hücre konumundan itibaren yayılır.
 * Altta her zaman boş bir satır durur: bir hücresine yazılınca gerçek satır eklenir ve imleç o hücrede kalır
 * (ayrı "satır ekle" düğmesi yoktur). Seçili satır vurgusu grafiklerle iki yönlüdür (satır numarasına tıklayınca seçilir).
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  hataliHucreler,
  hucreYaz,
  satirEkle,
  satirSil,
  sayiOku,
  sonrakiHucre,
  sutunAdiDegistir,
  sutunEkle,
  sutunSil,
  sutunTuruDegistir,
  yapistir,
  yapistirmayiAyristir,
  type GezintiYonu,
  type VeriTablosu as VeriTablosuModeli,
} from './veri';
import { DUGME, TurIsareti } from './ortak';
import { SIRA_SUTUNLARI, degiskenSutunlari } from './kategorik';

export interface VeriTablosuProps {
  tablo: VeriTablosuModeli;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  onTablo: (yeni: VeriTablosuModeli) => void;
  /** Vurgulanan (grafikte seçili) sütun kimliği */
  vurguluSutun?: string | null;
  /** Satır eklenince tablo sona kayar (deney sonuçları canlı dolarken) */
  sonaKaydir?: boolean;
  /** Verilirse alt şeritte "Temizle" (tüm satırları sil, onaylı) görünür */
  onTemizle?: () => void;
  /** Renk anahtarı: satırın kategori rengi (satır numarasının solunda şerit); yoksa undefined */
  satirRengi?: (satir: number) => string | undefined;
}

/** Bu kadar satırdan sonra yalnız bir pencere çizilir (akıllı tahtada akıcılık) */
const GORUNUR_SINIR = 300;

const HUCRE =
  'h-11 w-full min-w-0 bg-transparent px-2 text-[13px] text-foreground outline-none focus:bg-accent/60 focus:ring-2 focus:ring-inset focus:ring-ring';

let olcumBaglami: CanvasRenderingContext2D | null | undefined;

/** Başlık yazısının genişliği (13 px kalın Manrope; tarayıcıda tuvalle ölçülür, sunucuda harf başına ~7 px) */
function baslikYaziGenisligi(metin: string): number {
  if (olcumBaglami === undefined) {
    olcumBaglami = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    if (olcumBaglami) olcumBaglami.font = '700 13px Manrope, "Instrument Sans", sans-serif';
  }
  return olcumBaglami ? olcumBaglami.measureText(metin).width : metin.length * 7;
}

/**
 * Sütun başlığının en küçük genişliği (px): yazı + iç boşluk; ilk sütun dışındakilerde tür (36 px) ve sil (44 px)
 * düğmeleri. En az 88 px, en çok 260 px (daha uzun adlar kısaltılır).
 */
export function sutunEnKucukGenisligi(ad: string, dugmeler: boolean): number {
  return Math.round(Math.min(260, Math.max(88, baslikYaziGenisligi(ad.trim()) + 22 + (dugmeler ? 36 + 44 : 0))));
}

/** Tablonun kaydırmadan sığacağı genişlik (px): # + görünen sütunlar + satır sil + kaydırma çubuğu */
export function tabloDogalGenisligi(tablo: VeriTablosuModeli): number {
  return 44 + tablo.sutunlar.reduce((t, s, j) => (SIRA_SUTUNLARI.has(s.id) ? t : t + sutunEnKucukGenisligi(s.ad, j > 0)), 0) + 44 + 14;
}

// Sunucuda (statik çizim, testler) layout effect uyarısı çıkmasın
const useTarayiciLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function VeriTablosu({ tablo, seciliSatir, onSatirSec, onTablo, vurguluSutun, sonaKaydir = false, onTemizle, satirRengi }: VeriTablosuProps) {
  const kokRef = useRef<HTMLDivElement>(null);
  const kaydirmaRef = useRef<HTMLDivElement>(null);
  const [tumunuGoster, setTumunuGoster] = useState(false);
  const [temizleOnayi, setTemizleOnayi] = useState(false);
  const satirSayisi = tablo.satirlar.length;
  const oncekiSatirSayisi = useRef(satirSayisi);
  useEffect(() => {
    const el = kaydirmaRef.current;
    if (sonaKaydir && el && satirSayisi > oncekiSatirSayisi.current) el.scrollTop = el.scrollHeight;
    oncekiSatirSayisi.current = satirSayisi;
  }, [satirSayisi, sonaKaydir]);
  const pencereli = satirSayisi > GORUNUR_SINIR && !tumunuGoster;
  const gorunenBaslangic = pencereli && sonaKaydir ? satirSayisi - GORUNUR_SINIR : 0;
  const gorunenBitis = pencereli && !sonaKaydir ? GORUNUR_SINIR : satirSayisi;
  /** Boş (yeni) satır yalnız son satır görünürken çizilir; indeksi = satır sayısı */
  const bosSatirVar = gorunenBitis === satirSayisi;
  /** Boş satıra yazılınca odak, eklenen gerçek satırın aynı hücresine taşınır (imleç yazının sonunda) */
  const bekleyenOdak = useRef<{ satir: number; sutun: number } | null>(null);
  useTarayiciLayoutEffect(() => {
    const b = bekleyenOdak.current;
    if (!b) return;
    bekleyenOdak.current = null;
    const el = kokRef.current?.querySelector<HTMLInputElement>(`[data-hucre="${b.satir}-${b.sutun}"]`);
    if (!el) return;
    el.focus();
    const son = el.value.length;
    try {
      el.setSelectionRange(son, son);
    } catch {
      /* bazı girdi türleri imleç konumunu desteklemez */
    }
  });
  const [yapistirmaBildirimi, setYapistirmaBildirimi] = useState<string | null>(null);
  // Bildirim zamanlayıcısı sökülünce temizlenir (söküldükten sonra setState olmasın)
  const bildirimZamanlayici = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(bildirimZamanlayici.current), []);
  const hatalilar = hataliHucreler(tablo);
  /**
   * Tabloda gösterilen sütunlar: deneyin "Çekiliş" ve ölçümlerin "Tekrar" numarası satır numarasının (#) aynısı
   * olduğu için gizlenir (veride ve CSV'de durur). j = sütunun tablodaki gerçek indeksi.
   */
  const gorunenSutunlar = tablo.sutunlar.map((sutun, j) => ({ sutun, j })).filter(({ sutun }) => !SIRA_SUTUNLARI.has(sutun.id));
  const hataliMi = (satir: number, sutun: number) => hatalilar.some((h) => h.satir === satir && h.sutun === sutun);

  const odakla = useCallback((satir: number, sutun: number) => {
    const el = kokRef.current?.querySelector<HTMLInputElement>(`[data-hucre="${satir}-${sutun}"]`);
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  /**
   * Tabloda gezinme (alttaki boş satır da gezilebilir bir satırdır). Hedef hücre varsa oraya odaklanır ve
   * true döner. Hedef yoksa Enter yutulur; Tab/Shift+Tab ise false döner ve tarayıcının doğal odak sırası
   * işler — klavye kullanıcısı tablodan çıkabilsin (WCAG 2.1.2, klavye tuzağı olmasın).
   */
  const gez = (satir: number, sutun: number, yon: GezintiYonu): boolean => {
    // Gizli sıra sütunları (Çekiliş, Tekrar) atlanır
    let hedef: { satir: number; sutun: number } | null = { satir, sutun };
    do {
      hedef = sonrakiHucre(hedef, yon, satirSayisi + (bosSatirVar ? 1 : 0), tablo.sutunlar.length);
    } while (hedef && SIRA_SUTUNLARI.has(tablo.sutunlar[hedef.sutun]?.id ?? ''));
    if (hedef) {
      odakla(hedef.satir, hedef.sutun);
      onSatirSec(hedef.satir < satirSayisi ? hedef.satir : null);
      return true;
    }
    return yon === 'enter';
  };

  /** Boş satıra yazılan ilk karakter: satır eklenir, değer yazılır, odak yeni satırın aynı hücresine geçer */
  const bosSatiraYaz = (sutun: number, deger: string) => {
    if (deger === '') return;
    bekleyenOdak.current = { satir: satirSayisi, sutun };
    onTablo(hucreYaz(satirEkle(tablo), satirSayisi, sutun, deger));
  };

  const hucreKlavye = (e: React.KeyboardEvent<HTMLInputElement>, satir: number, sutun: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      gez(satir, sutun, 'enter');
    } else if (e.key === 'Tab') {
      // Yalnız tablo içinde hedef varsa yutulur; ilk/son hücrede odak tablodan çıkar
      if (gez(satir, sutun, e.shiftKey ? 'shift-tab' : 'tab')) e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      gez(satir, sutun, 'asagi');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      gez(satir, sutun, 'yukari');
    } else if (e.key === 'Escape') {
      // Odak gövdeye düşmesin: satırın seç düğmesine gider (oradan Tab ile tablo dışına çıkılır)
      e.preventDefault();
      const dugme = kokRef.current?.querySelector<HTMLButtonElement>(`[data-satir-sec="${satir}"]`);
      if (dugme) dugme.focus();
    }
  };

  const hucreYapistir = (e: React.ClipboardEvent<HTMLInputElement>, satir: number, sutun: number) => {
    const metin = e.clipboardData.getData('text/plain');
    if (!/[\t\r\n;,]/.test(metin)) return; // tek hücre: tarayıcı yapıştırsın
    const izgara = yapistirmayiAyristir(metin);
    const cokHucre = izgara.length > 1 || (izgara[0]?.length ?? 0) > 1;
    if (!cokHucre) return;
    e.preventDefault();
    onTablo(yapistir(tablo, satir, sutun, izgara));
    const hucreSayisi = izgara.reduce((t, r) => t + r.length, 0);
    setYapistirmaBildirimi(`${izgara.length} satır, ${hucreSayisi} hücre yapıştırıldı`);
    window.clearTimeout(bildirimZamanlayici.current);
    bildirimZamanlayici.current = window.setTimeout(() => setYapistirmaBildirimi(null), 2500);
  };

  return (
    <div ref={kokRef} className="flex h-full min-h-0 flex-col">
      {/* relative: tablodaki mutlak konumlu öğeler (ekran okuyucu metinleri) kaydırma kutusunun içinde kalır, pencereyi uzatmaz */}
      <div ref={kaydirmaRef} className="relative min-h-0 flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-[13px]" aria-label="Veri tablosu">
          <thead className="sticky top-0 z-10 bg-card">
            <tr>
              <th scope="col" className="w-11 border-b border-r border-border bg-muted px-1 text-center text-[13px] font-bold text-muted-foreground">
                #
              </th>
              {gorunenSutunlar.map(({ sutun, j }) => (
                <th
                  scope="col"
                  key={sutun.id}
                  // Başlık adı kesilmesin: sütun en az adı (+ tür ve sil düğmeleri) kadar geniş; çok sütunda tablo yatay kayar
                  style={{ minWidth: sutunEnKucukGenisligi(sutun.ad, j > 0) }}
                  className={`border-b border-r border-border px-0 text-left font-bold ${
                    vurguluSutun === sutun.id ? 'bg-accent' : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      aria-label={`Sütun adı: ${sutun.ad}`}
                      className={`${HUCRE} font-bold`}
                      value={sutun.ad}
                      onChange={(e) => onTablo(sutunAdiDegistir(tablo, j, e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (tablo.satirlar.length > 0) odakla(0, j);
                        }
                      }}
                    />
                    {/* Tür düğmesi: sayısal ↔ kategorik (ilk sütun hep etiket). Kategorik sütunla iki yönlü tablo, yığılmış sütun ve renk anahtarı kurulur */}
                    {j > 0 && (
                      <button
                        type="button"
                        aria-label={`${sutun.ad} sütununun türü: ${sutun.tur === 'sayi' ? 'sayısal. Kategorik yap' : 'kategorik. Sayısal yap'}`}
                        title={sutun.tur === 'sayi' ? 'Sayısal sütun: kategorik (metin) yapmak için tıklayın' : 'Kategorik sütun: sayısal yapmak için tıklayın'}
                        className="grid h-11 w-9 shrink-0 place-items-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onTablo(sutunTuruDegistir(tablo, j, sutun.tur === 'sayi' ? 'etiket' : 'sayi'))}
                        data-sutun-turu={sutun.tur}
                      >
                        <TurIsareti tur={sutun.tur} />
                      </button>
                    )}
                    {j > 0 && (
                      <button
                        type="button"
                        aria-label={`${sutun.ad} sütununu sil`}
                        title="Sütunu sil"
                        className="grid h-11 w-11 shrink-0 place-items-center text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onTablo(sutunSil(tablo, j))}
                      >
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                          <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th scope="col" className="w-11 border-b border-border bg-muted" aria-label="Satır işlemleri" />
            </tr>
          </thead>
          <tbody>
            {pencereli && gorunenBaslangic > 0 && (
              <tr>
                <td colSpan={gorunenSutunlar.length + 2} className="border-b border-border px-3 py-1.5 text-[13px] text-muted-foreground">
                  İlk {gorunenBaslangic} satır gizli (son {GORUNUR_SINIR} satır gösteriliyor).{' '}
                  <button type="button" className="h-9 px-1 font-semibold text-primary hover:underline" onClick={() => setTumunuGoster(true)}>
                    Tümünü göster
                  </button>
                </td>
              </tr>
            )}
            {tablo.satirlar.slice(gorunenBaslangic, gorunenBitis).map((satir, k) => {
              const i = gorunenBaslangic + k;
              const secili = seciliSatir === i;
              return (
                <tr key={satir.id} className={secili ? 'bg-accent' : 'odd:bg-card even:bg-background'} data-satir={i}>
                  <th scope="row" className="border-b border-r border-border p-0">
                    <button
                      type="button"
                      aria-pressed={secili}
                      aria-label={`${i + 1}. satırı seç`}
                      data-satir-sec={i}
                      // Renk anahtarı: satırın kategorisi numaranın solunda renkli şerit olarak görünür
                      style={satirRengi?.(i) ? { boxShadow: `inset 5px 0 0 ${satirRengi(i)}` } : undefined}
                      className={`h-11 w-full text-[13px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                        secili ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                      onClick={() => onSatirSec(secili ? null : i)}
                    >
                      {i + 1}
                    </button>
                  </th>
                  {gorunenSutunlar.map(({ sutun, j }) => {
                    const metin = satir.hucreler[j] ?? '';
                    const hatali = hataliMi(i, j);
                    return (
                      <td
                        key={sutun.id}
                        className={`border-b border-r border-border p-0 ${hatali ? 'bg-destructive/10' : ''} ${
                          vurguluSutun === sutun.id && !secili ? 'bg-accent/40' : ''
                        }`}
                      >
                        <input
                          data-hucre={`${i}-${j}`}
                          aria-label={`${i + 1}. satır, ${sutun.ad}`}
                          aria-invalid={hatali || undefined}
                          title={hatali ? 'Sayı okunamadı: ondalık için virgül kullanın (ör. 3,5)' : undefined}
                          inputMode={sutun.tur === 'sayi' ? 'decimal' : 'text'}
                          className={`${HUCRE} ${sutun.tur === 'sayi' ? 'text-right tabular-nums' : ''} ${
                            hatali ? 'text-destructive' : ''
                          }`}
                          value={metin}
                          onFocus={() => onSatirSec(i)}
                          onChange={(e) => onTablo(hucreYaz(tablo, i, j, e.target.value))}
                          onKeyDown={(e) => hucreKlavye(e, i, j)}
                          onPaste={(e) => hucreYapistir(e, i, j)}
                          onBlur={(e) => {
                            // Sayısal hücrede "3.5" → "3,5" biçimine getir
                            if (sutun.tur !== 'sayi') return;
                            const d = sayiOku(e.target.value);
                            if (d !== null && e.target.value.includes('.')) {
                              onTablo(hucreYaz(tablo, i, j, e.target.value.trim().replace('.', ',')));
                            }
                          }}
                        />
                      </td>
                    );
                  })}
                  <td className="border-b border-border p-0 text-center">
                    <button
                      type="button"
                      aria-label={`${i + 1}. satırı sil`}
                      title="Satırı sil"
                      className="grid h-11 w-11 place-items-center text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      onClick={() => {
                        onTablo(satirSil(tablo, i));
                        if (seciliSatir === i) onSatirSec(null);
                        else if (seciliSatir !== null && seciliSatir > i) onSatirSec(seciliSatir - 1);
                      }}
                    >
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
            {pencereli && gorunenBitis < satirSayisi && (
              <tr>
                <td colSpan={gorunenSutunlar.length + 2} className="px-3 py-1.5 text-[13px] text-muted-foreground">
                  {satirSayisi - gorunenBitis} satır daha var.{' '}
                  <button type="button" className="h-9 px-1 font-semibold text-primary hover:underline" onClick={() => setTumunuGoster(true)}>
                    Tümünü göster
                  </button>
                </td>
              </tr>
            )}
            {tablo.satirlar.length === 0 && (
              <tr>
                <td colSpan={gorunenSutunlar.length + 2} className="px-3 py-4 text-center text-[13px] text-muted-foreground">
                  Tablo boş: alttaki satıra yazın, Excel&apos;den yapıştırın ya da &quot;Örnek veri&quot; seçin.
                </td>
              </tr>
            )}
            {/* Her zaman boş duran yeni satır: yazılınca gerçek satır olur (grafiğe ve sayılara girmez) */}
            {bosSatirVar && (
              <tr data-bos-satir className="bg-background">
                <th scope="row" aria-label="Yeni satır" className="border-b border-r border-border bg-muted/40 p-0 text-center text-[13px] font-bold text-muted-foreground/70">
                  <span aria-hidden="true">+</span>
                </th>
                {gorunenSutunlar.map(({ sutun, j }) => (
                  <td key={sutun.id} className="border-b border-r border-border p-0">
                    <input
                      data-hucre={`${satirSayisi}-${j}`}
                      aria-label={`Yeni satır, ${sutun.ad}`}
                      placeholder={j === gorunenSutunlar[0]?.j ? 'Yeni satır…' : undefined}
                      inputMode={sutun.tur === 'sayi' ? 'decimal' : 'text'}
                      className={`${HUCRE} placeholder:font-normal placeholder:text-muted-foreground/70 ${sutun.tur === 'sayi' ? 'text-right tabular-nums' : ''}`}
                      value=""
                      onFocus={() => onSatirSec(null)}
                      onChange={(e) => bosSatiraYaz(j, e.target.value)}
                      onKeyDown={(e) => hucreKlavye(e, satirSayisi, j)}
                      onPaste={(e) => hucreYapistir(e, satirSayisi, j)}
                    />
                  </td>
                ))}
                <td className="border-b border-border" aria-hidden="true" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card px-2 py-2">
        <button type="button" className={DUGME} onClick={() => onTablo(sutunEkle(tablo))}>
          <span aria-hidden="true">+</span> Sütun
        </button>
        {onTemizle &&
          (temizleOnayi ? (
            <span className="inline-flex flex-wrap items-center gap-1 rounded-[calc(var(--radius)-6px)] border border-destructive/50 bg-destructive/10 px-2 py-0.5 text-[13px] font-semibold" data-temizle-onayi>
              Tüm satırlar silinsin mi?
              <button
                type="button"
                className="h-9 rounded-md bg-destructive px-3 text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setTemizleOnayi(false);
                  onTemizle();
                }}
              >
                Evet
              </button>
              <button type="button" className="h-9 px-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setTemizleOnayi(false)}>
                Vazgeç
              </button>
            </span>
          ) : (
            <button type="button" className={DUGME} disabled={tablo.satirlar.length === 0} title="Tablodaki tüm satırları sil" onClick={() => setTemizleOnayi(true)}>
              Temizle
            </button>
          ))}
        <span className="ml-auto text-[13px] text-muted-foreground" aria-live="polite">
          {yapistirmaBildirimi ??
            (hatalilar.length > 0
              ? `${hatalilar.length} hücre sayı olarak okunamadı`
              : `${tablo.satirlar.length} satır · ${degiskenSutunlari(tablo).length} değişken`)}
        </span>
      </div>
    </div>
  );
}
