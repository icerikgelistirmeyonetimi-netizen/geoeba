'use client';

/**
 * İstatistik paneli: seçili sayısal değişkenin ölçüleri iki başlık altında:
 * - Merkezi eğilim ölçüleri: aritmetik ortalama, ortanca, tepe değer;
 * - Yayılım ölçüleri: açıklık (en büyük değer − en küçük değer), ortalama mutlak sapma, standart sapma (lise ölçüsü; örneklem:
 *   veri sayısı − 1; ortalama mutlak sapmanın yanında durur, onun yerini almaz).
 * "Hesaplama adımlarını göster" ders kitabı düzeninde adımları açar: toplam ve bölme, sıralama ve ortanca konumu,
 * sıklık sayımı, açıklık, fark / ortalamaya uzaklık tablosu, kare uzaklık tablosu ve karekök. Gösterilen her terim
 * gösterilen toplamı tutar;
 * yuvarlanan her sonuçta "≈" yazılır. 30'dan çok veride adımlar sıklık tablosu biçimindedir.
 * `ikinciSutun` verilirse iki değişken yan yana karşılaştırılır (Ölçü | A | B) ve bir yorum satırı yazılır.
 * Renk anahtarı seçiliyse aynı ölçüler anahtarın her grubu için ayrıca ("Gruplara göre") karşılaştırılır.
 * `olculer` sınıf düzeyine göre ölçüleri süzer (sinifKurallari.ts): 6. sınıfta ortalama mutlak sapma ve standart
 * sapma, 7–8. sınıfta standart sapma yoktur (kart, karşılaştırma satırı, grup sütunu ve hesaplama adımı birlikte);
 * hiçbir ölçü yoksa (5. sınıf) panel yalnız veri sayısını ve verilerin toplamını (parça-bütün) gösterir.
 */
import React, { useMemo } from 'react';
import {
  adimGosterimi,
  ceyrekler,
  gosterimMetni,
  hesaplamaAdimlari,
  kartGosterimi,
  listeMetni,
  ozetHesapla,
  sayiMetni,
  terimMetni,
  type Gosterim,
  type HesaplamaAdimlari,
  type Ozet,
} from './istatistik';
import { gosterimOndaligi } from './grafik';
import { gecerliDegerler, type DegerNoktasi, type VeriTablosu } from './veri';
import { ONAY_KUTUSU, RenkNoktasi } from './ortak';
import { renkGruplari, satirRengi, type RenkEslemesi } from './kategorik';
import type { OlcuKumesi } from './sinifKurallari';

/** Sınıfsız tabloda bütün ölçüler */
const TUM_OLCULER: OlcuKumesi = { merkezi: true, aciklik: true, oms: true, standartSapma: true };

export interface IstatistikProps {
  tablo: VeriTablosu;
  sutun: number;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  adimlariGoster: boolean;
  onAdimlariGoster: (deger: boolean) => void;
  /** Renk anahtarı: kategorik değişkenin grupları için ayrı özet tablosu */
  renkEslemi?: RenkEslemesi | null;
  /** Karşılaştırma: ikinci sayısal sütunun indeksi; verilirse iki sütunlu ölçü tablosu ve yorum satırı */
  ikinciSutun?: number | null;
  /** Sınıf düzeyinin ölçüleri (verilmezse hepsi) */
  olculer?: OlcuKumesi;
  /** Lise 9–12 (MAT.9.6.1): yayılım ölçülerinde çeyrekler ve çeyrekler açıklığı; verilmezse yok */
  ceyrekler?: boolean;
}

/** Karşılaştırmada iki değişkenin rengi (nokta grafiğindeki panellerle aynı: birincil, mercan) */
const SERI_SINIFI = ['bg-primary', 'bg-[#d9805f]'] as const;
/** Sıklık tablosunda en çok bu kadar satır yazılır (kalanlar tek satırda özetlenir) */
const SIKLIK_SATIR_SINIRI = 40;
/** Tepe değer adımında en çok bu kadar farklı değerin sıklığı tek tek yazılır */
const SAYIM_SINIRI = 24;
/** Uzun toplamlar bu kadar terimden sonra kısaltılır */
const TERIM_SINIRI = 30;

// ── Küçük yazım yardımcıları ────────────────────────────────────────────────

/** Gösterimi yazar: yaklaşıksa soluk "≈ " öneki; sayı kendi span'ında */
function Sayi({ g, className }: { g: Gosterim; className?: string }) {
  return (
    <>
      {g.yaklasik && <span className="text-muted-foreground">≈ </span>}
      <span className={className}>{sayiMetni(g.deger, g.ondalik)}</span>
    </>
  );
}

/** Mutlak değer: iki yanında dik çizgi (kenarlık; yazıyla "|" kullanılmaz) */
function Mutlak({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center border-x-[1.5px] border-current px-1 leading-5">
      <span className="sr-only">mutlak değer </span>
      {children}
    </span>
  );
}

/** Fark: + / − işaretli ve renkli hap (yazı rengi ön plan; zemin turkuaz ya da mercan tonu) */
function Fark({ deger, ondalik, yaklasik }: { deger: number; ondalik: number; yaklasik?: boolean }) {
  const metin = sayiMetni(deger, ondalik);
  const isaretli = deger > 0 ? `+${metin}` : metin;
  const ton = deger > 0 ? 'bg-[#2a9d94]/15 dark:bg-[#2a9d94]/25' : deger < 0 ? 'bg-[#d9805f]/20 dark:bg-[#d9805f]/30' : 'bg-muted';
  return (
    <span className={`inline-block rounded-md px-1.5 font-semibold tabular-nums text-foreground ${ton}`}>{`${yaklasik ? '≈ ' : ''}${isaretli}`}</span>
  );
}

/** Terimler toplamı: "18 + 5 + 32"; uzunsa ilk üç terim ve "… (40 veri)" */
function toplamIfadesi(terimler: readonly string[], sayac: string): string {
  if (terimler.length <= TERIM_SINIRI) return terimler.join(' + ');
  return `${terimler.slice(0, 3).join(' + ')} + … (${terimler.length} ${sayac})`;
}

/** Kısaltılmış ondalık açılım: 17,98333… (bölüm tam çıkmadığında) */
function uzunOndalik(sayi: number): string {
  return `${sayiMetni(Math.trunc(sayi * 1e5) / 1e5, 5)}…`;
}

function ozetGosterim(deger: number | null, ondalik: number): Gosterim | null {
  return deger === null ? null : kartGosterimi(deger, ondalik);
}

/** Tepe değer metni: "6", "1 ve 2" ya da "yok" */
function tepeMetni(ozet: Ozet, ondalik: number): string {
  return ozet.tepe.length > 0 ? listeMetni(ozet.tepe.map((v) => gosterimMetni(kartGosterimi(v, ondalik)))) : 'yok';
}

function tepeAciklamasi(ozet: Ozet): string {
  if (ozet.n === 0) return '';
  if (ozet.tepe.length === 0) return `bütün değerler eşit sıklıkta (her biri ${ozet.tepeSayisi} kez)`;
  return ozet.tepe.length === 1 ? `en sık görülen değer (${ozet.tepeSayisi} kez)` : `en sık görülen değerler (her biri ${ozet.tepeSayisi} kez)`;
}

/** Cümle içinde değişken adı: sondaki birim ayracı atılır ("İzmir (°C)" → "İzmir") */
function cumleAdi(ad: string): string {
  return ad.replace(/\s*\([^()]*\)\s*$/, '').trim() || ad;
}

/**
 * Karşılaştırma yorumu (nötr dil; her veriye uyar: puan, sıcaklık, süre): aritmetik ortalamalar (eşit ya da hangisi
 * büyük) ve ortalama mutlak sapması küçük olanın değerlerinin ortalamaya daha yakın olduğu; `yayilim` 'aciklik' ise
 * (6. sınıf) açıklığı küçük olanın değerlerinin daha dar bir aralıkta olduğu. Değerler kartlardaki gibi
 * yuvarlanarak karşılaştırılır; yuvarlanan varsa "≈" karşılaştırmanın başına bir kez yazılır: "(≈ 6,13 < 8,79)".
 * Adların sonundaki birim ayracı cümlede yazılmaz. "İstikrarlı" gibi yoruma dayalı sözcükler örnek metinlerinde
 * kalır. Veri yoksa null.
 */
export function karsilastirmaYorumu(
  a: { ad: string; ozet: Ozet },
  b: { ad: string; ozet: Ozet },
  ondalik: number,
  yayilim: 'oms' | 'aciklik' = 'oms',
): string | null {
  if (a.ozet.ortalama === null || b.ozet.ortalama === null) return null;
  const ya = yayilim === 'oms' ? a.ozet.oms : a.ozet.aciklik;
  const yb = yayilim === 'oms' ? b.ozet.oms : b.ozet.aciklik;
  if (ya === null || yb === null) return null;
  const ma = kartGosterimi(a.ozet.ortalama, ondalik);
  const mb = kartGosterimi(b.ozet.ortalama, ondalik);
  const oa = kartGosterimi(ya, ondalik);
  const ob = kartGosterimi(yb, ondalik);
  const m = (g: Gosterim) => gosterimMetni(g);
  /** "(≈ 17,98 > 5,78)": yuvarlanan sayı varsa ≈ başta bir kez */
  const kars = (p: Gosterim, isaret: string, q: Gosterim) =>
    `(${p.yaklasik || q.yaklasik ? '≈ ' : ''}${gosterimMetni(p, false)} ${isaret} ${gosterimMetni(q, false)})`;
  const adA = cumleAdi(a.ad);
  const adB = cumleAdi(b.ad);
  const ortalamaCumlesi =
    ma.deger === mb.deger
      ? `Aritmetik ortalamalar eşit (${m(ma)})`
      : ma.deger > mb.deger
        ? `Aritmetik ortalaması büyük olan ${adA} ${kars(ma, '>', mb)}`
        : `Aritmetik ortalaması büyük olan ${adB} ${kars(mb, '>', ma)}`;
  if (yayilim === 'aciklik') {
    // 6. sınıf: yayılım açıklıkla konuşulur (ortalama mutlak sapma 7. sınıfta)
    if (oa.deger === ob.deger) return `${ortalamaCumlesi}; açıklıklar da eşit (${m(oa)}): İki değişkenin verileri aynı genişlikte bir aralığa yayılıyor.`;
    const [kk, bb, aa] = oa.deger < ob.deger ? [oa, ob, adA] : [ob, oa, adB];
    return `${ortalamaCumlesi}; açıklığı küçük olan ${aa}: Değerleri daha dar bir aralıkta ${kars(kk, '<', bb)}.`;
  }
  if (oa.deger === ob.deger) return `${ortalamaCumlesi}; ortalama mutlak sapmalar da eşit (${m(oa)}): İki değişkenin verileri ortalama çevresinde aynı ölçüde dağılıyor.`;
  const [kucuk, buyuk, ad] = oa.deger < ob.deger ? [oa, ob, adA] : [ob, oa, adB];
  return `${ortalamaCumlesi}; ortalama mutlak sapması küçük olan ${ad}: Değerleri ortalamaya daha yakın ${kars(kucuk, '<', buyuk)}.`;
}

// ── Kartlar ─────────────────────────────────────────────────────────────────

function Kart({ baslik, aciklama, veri, children }: { baslik: string; aciklama?: string; veri: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-[calc(var(--radius)-6px)] border border-border bg-card px-3 py-2" data-istatistik-karti={veri}>
      <div className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">{baslik}</div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1 text-[22px] font-extrabold leading-tight tabular-nums text-foreground">{children}</div>
      {aciklama && <div className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{aciklama}</div>}
    </div>
  );
}

function OlcuGrubu({ baslik, soru, children, sinif }: { baslik: string; soru: string; children: React.ReactNode; sinif: string }) {
  return (
    <section aria-label={baslik} className={`min-w-0 ${sinif}`}>
      <h3 className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-[13px] font-bold text-foreground">
        {baslik}
        <span className="text-[12px] font-semibold text-muted-foreground">{soru}</span>
      </h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">{children}</div>
    </section>
  );
}

/** Açıklık ifadesi: "32 − 5 = 27" (negatif en küçük parantezli) */
function AciklikIfadesi({ ozet, ondalik, kucukYazi }: { ozet: Ozet; ondalik: number; kucukYazi?: boolean }) {
  if (ozet.enBuyuk === null || ozet.enKucuk === null || ozet.aciklik === null) return <span>—</span>;
  const buyuk = kartGosterimi(ozet.enBuyuk, ondalik);
  const kucuk = kartGosterimi(ozet.enKucuk, ondalik);
  return (
    <>
      <span className={`${kucukYazi ? '' : 'text-[15px]'} font-normal text-muted-foreground`}>
        {`${gosterimMetni(buyuk)} − ${kucuk.deger < 0 ? `(${gosterimMetni(kucuk)})` : gosterimMetni(kucuk)} =`}
      </span>
      <Sayi g={kartGosterimi(ozet.aciklik, ondalik)} />
    </>
  );
}

function OlcuKartlari({ ozet, ondalik, olculer, ceyrek = null }: { ozet: Ozet; ondalik: number; olculer: OlcuKumesi; ceyrek?: { q1: number; q3: number; aciklik: number } | null }) {
  const ort = ozetGosterim(ozet.ortalama, ondalik);
  const orn = ozetGosterim(ozet.medyan, ondalik);
  const oms = ozetGosterim(ozet.oms, ondalik);
  const ss = ozetGosterim(ozet.standartSapma, ondalik);
  const yayilimVar = olculer.aciklik || olculer.oms || olculer.standartSapma;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3" data-olcu-kartlari>
      {olculer.merkezi && (
      <OlcuGrubu baslik="Merkezi eğilim ölçüleri" soru="veriler nerede toplanıyor?" sinif="grow-[3] basis-[500px]">
        <Kart baslik="Aritmetik ortalama" aciklama="verilerin toplamı ÷ veri sayısı" veri="ortalama">
          {ort ? <Sayi g={ort} /> : '—'}
        </Kart>
        <Kart baslik="Ortanca" aciklama="sıralı verilerin ortasındaki değer" veri="ortanca">
          {orn ? <Sayi g={orn} /> : '—'}
        </Kart>
        <Kart baslik="Tepe değer" aciklama={tepeAciklamasi(ozet)} veri="tepe">
          <span>{tepeMetni(ozet, ondalik)}</span>
        </Kart>
      </OlcuGrubu>
      )}
      {yayilimVar && (
      <OlcuGrubu baslik="Yayılım ölçüleri" soru="veriler ne kadar dağınık?" sinif="grow-[3] basis-[480px]">
        {olculer.aciklik && (
          <Kart baslik="Açıklık" aciklama="en büyük değer − en küçük değer" veri="aciklik">
            <AciklikIfadesi ozet={ozet} ondalik={ondalik} />
          </Kart>
        )}
        {olculer.oms && (
          <Kart baslik="Ortalama mutlak sapma" aciklama="ortalamaya uzaklıkların toplamı ÷ veri sayısı" veri="oms">
            {oms ? <Sayi g={oms} /> : '—'}
          </Kart>
        )}
        {/* Lise ölçüsü (9. sınıf): ortaokulun ortalama mutlak sapmasının yanında; örneklem, veri sayısı − 1 */}
        {olculer.standartSapma && (
          <Kart
            baslik="Standart sapma"
            aciklama={ozet.n === 1 ? 'tek veriyle hesaplanmaz (veri sayısı − 1 = 0)' : 'kare uzaklıkların toplamı ÷ (veri sayısı − 1), karekökü'}
            veri="standartSapma"
          >
            {ss ? <Sayi g={ss} /> : '—'}
          </Kart>
        )}
        {/* Lise 9. sınıf: çeyrekler açıklığı (alt ve üst yarının ortancaları; kutu grafiğinin kutusu) */}
        {ceyrek && (
          <Kart
            baslik="Çeyrekler açıklığı"
            aciklama={`3. çeyrek − 1. çeyrek (1. çeyrek ${gosterimMetni(kartGosterimi(ceyrek.q1, ondalik))}, 3. çeyrek ${gosterimMetni(kartGosterimi(ceyrek.q3, ondalik))})`}
            veri="ceyreklerAcikligi"
          >
            <Sayi g={kartGosterimi(ceyrek.aciklik, ondalik)} />
          </Kart>
        )}
      </OlcuGrubu>
      )}
    </div>
  );
}

/**
 * Ölçüsüz sınıf düzeyi (5. sınıf): merkezi eğilim ve yayılım ölçüsü yok; verilerin toplamı (bütün: "24 saat",
 * "100 000 TL") parça-bütün ilişkisi için (veri sayısı başlık satırında).
 */
function OlcusuzOzet({ degerler, ondalik }: { degerler: number[]; ondalik: number }) {
  const toplam = degerler.reduce((t, d) => t + d, 0);
  return (
    <div className="space-y-3" data-olcusuz-ozet>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2">
        <Kart baslik="Verilerin toplamı" aciklama="bütün: parçaların hepsi" veri="toplam">
          <Sayi g={kartGosterimi(toplam, ondalik)} />
        </Kart>
      </div>
      <p className="rounded-[calc(var(--radius)-6px)] border border-border bg-card px-3 py-2 text-[13px] leading-snug text-muted-foreground" data-olcusuz-notu>
        Veriyi Nokta, Sütun ve Daire grafikleriyle inceleyin: en büyük parça hangisi, bir parça bütünün ne kadarı?
      </p>
    </div>
  );
}

// ── Karşılaştırma tablosu (ikinciSutun) ───────────────────────────────────

function KarsilastirmaTablosu({ adlar, ozetler, ondalik, olculer }: { adlar: [string, string]; ozetler: [Ozet, Ozet]; ondalik: number; olculer: OlcuKumesi }) {
  const omsler = ozetler.map((o) => (o.oms === null ? 0 : o.oms));
  const enBuyukOms = Math.max(...omsler, 0);
  const ssler = ozetler.map((o) => o.standartSapma ?? 0);
  const enBuyukSs = Math.max(...ssler, 0);
  const yorum =
    olculer.merkezi && (olculer.oms || olculer.aciklik)
      ? karsilastirmaYorumu({ ad: adlar[0], ozet: ozetler[0] }, { ad: adlar[1], ozet: ozetler[1] }, ondalik, olculer.oms ? 'oms' : 'aciklik')
      : null;
  const hucre = 'h-10 px-3 text-right align-middle';
  const satirBasi = 'h-10 pr-3 text-left align-middle font-semibold text-foreground';
  const grupSatiri = (baslik: string) => (
    <tr className="border-t border-border">
      <th colSpan={3} scope="colgroup" className="pb-1 pt-2.5 text-left text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
        {baslik}
      </th>
    </tr>
  );
  const sayiHucresi = (deger: number | null) => {
    const g = ozetGosterim(deger, ondalik);
    return g ? <Sayi g={g} /> : '—';
  };
  return (
    <section className="rounded-[calc(var(--radius)-6px)] border border-border bg-card p-3" data-karsilastirma-tablosu>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-[13px] tabular-nums text-foreground">
          <thead>
            <tr className="text-muted-foreground">
              <th scope="col" className="h-9 pr-3 text-left font-bold">
                Ölçü
              </th>
              {adlar.map((ad, i) => (
                <th key={i} scope="col" className="h-9 px-3 text-right font-bold text-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SERI_SINIFI[i]}`} aria-hidden="true" />
                    {ad}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <th scope="row" className={satirBasi}>
                Veri sayısı
              </th>
              {ozetler.map((o, i) => (
                <td key={i} className={hucre}>
                  {o.n}
                </td>
              ))}
            </tr>
            {olculer.merkezi && grupSatiri('Merkezi eğilim ölçüleri')}
            {olculer.merkezi && (
            <tr>
              <th scope="row" className={satirBasi}>
                Aritmetik ortalama
              </th>
              {ozetler.map((o, i) => (
                <td key={i} className={hucre}>
                  {sayiHucresi(o.ortalama)}
                </td>
              ))}
            </tr>
            )}
            {olculer.merkezi && (
            <tr>
              <th scope="row" className={satirBasi}>
                Ortanca
              </th>
              {ozetler.map((o, i) => (
                <td key={i} className={hucre}>
                  {sayiHucresi(o.medyan)}
                </td>
              ))}
            </tr>
            )}
            {olculer.merkezi && (
            <tr>
              <th scope="row" className={satirBasi}>
                Tepe değer
              </th>
              {ozetler.map((o, i) => (
                <td key={i} className={hucre}>
                  {o.n === 0 ? '—' : tepeMetni(o, ondalik)}
                </td>
              ))}
            </tr>
            )}
            {(olculer.aciklik || olculer.oms || olculer.standartSapma) && grupSatiri('Yayılım ölçüleri')}
            {olculer.aciklik && (
            <tr>
              <th scope="row" className={satirBasi}>
                Açıklık
                <span className="block text-xs font-normal text-muted-foreground">en büyük değer − en küçük değer</span>
              </th>
              {ozetler.map((o, i) => (
                <td key={i} className={hucre}>
                  <span className="inline-flex items-baseline justify-end gap-1">
                    <AciklikIfadesi ozet={o} ondalik={ondalik} kucukYazi />
                  </span>
                </td>
              ))}
            </tr>
            )}
            {olculer.oms && (
            <tr data-oms-satiri>
              <th scope="row" className={satirBasi}>
                Ortalama mutlak sapma
              </th>
              {ozetler.map((o, i) => (
                <td key={i} className={hucre}>
                  <span className="inline-flex items-center justify-end gap-2">
                    <span className="font-bold">{sayiHucresi(o.oms)}</span>
                    <span className="block h-2.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <span
                        className={`block h-full rounded-full ${SERI_SINIFI[i]}`}
                        style={{ width: `${enBuyukOms > 0 ? Math.max(2, (omsler[i] / enBuyukOms) * 100) : 0}%` }}
                        data-oms-cubugu
                      />
                    </span>
                  </span>
                </td>
              ))}
            </tr>
            )}
            {olculer.standartSapma && (
            <tr data-standart-sapma-satiri>
              <th scope="row" className={satirBasi}>
                Standart sapma
              </th>
              {ozetler.map((o, i) => (
                <td key={i} className={hucre}>
                  <span className="inline-flex items-center justify-end gap-2">
                    <span className="font-bold">{sayiHucresi(o.standartSapma)}</span>
                    <span className="block h-2.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <span
                        className={`block h-full rounded-full ${SERI_SINIFI[i]}`}
                        style={{ width: `${enBuyukSs > 0 ? Math.max(2, (ssler[i] / enBuyukSs) * 100) : 0}%` }}
                        data-standart-sapma-cubugu
                      />
                    </span>
                  </span>
                </td>
              ))}
            </tr>
            )}
          </tbody>
        </table>
      </div>
      {yorum && (
        <p className="mt-2 rounded-[calc(var(--radius)-8px)] bg-accent px-3 py-2 text-[13px] leading-snug text-accent-foreground" data-karsilastirma-yorumu>
          {yorum}
        </p>
      )}
    </section>
  );
}

// ── Hesaplama adımları ──────────────────────────────────────────────────────

function Adim({ no, baslik, veri, genis, children }: { no: number; baslik: string; veri: string; genis?: boolean; children: React.ReactNode }) {
  return (
    <section className={`min-w-0 rounded-[calc(var(--radius)-6px)] border border-border bg-card p-3 ${genis ? 'col-span-full' : ''}`} data-hesap-adimi={veri}>
      <h3 className="mb-1 flex items-center gap-2 text-[14px] font-bold text-foreground">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground" aria-hidden="true">
          {no}
        </span>
        {baslik}
      </h3>
      <div className="space-y-0.5 text-[13px] leading-7 text-foreground">{children}</div>
    </section>
  );
}

/** Eşitlik satırı: "Ad = ifade = sonuç"; sonuç kalın, yaklaşıksa "≈" ile */
function Esitlik({ ad, ifade, sonuc, not }: { ad?: string; ifade?: string; sonuc: Gosterim | string; not?: string }) {
  const sonucMetni = typeof sonuc === 'string' ? sonuc : sayiMetni(sonuc.deger, sonuc.ondalik);
  const yaklasik = typeof sonuc !== 'string' && sonuc.yaklasik;
  return (
    <p className="tabular-nums" data-esitlik>
      {ad && <span className="font-semibold">{ad} </span>}
      {ifade !== undefined && <span>{`${ad ? '= ' : ''}${ifade} `}</span>}
      <span>{yaklasik ? '≈ ' : '= '}</span>
      <strong data-sonuc>{sonucMetni}</strong>
      {not && <span className="ml-1.5 text-muted-foreground">{not}</span>}
    </p>
  );
}

function Cip({ secili, children, title }: { secili?: boolean; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-md px-2 leading-6 tabular-nums ${secili ? 'bg-primary font-bold text-primary-foreground' : 'bg-muted text-foreground'}`}>
      {children}
    </span>
  );
}

interface AdimlarProps {
  tablo: VeriTablosu;
  sutun: number;
  noktalar: DegerNoktasi[];
  adimlar: HesaplamaAdimlari;
  /** kartlardaki yuvarlama basamağı (kartla bağ kuran notlar için) */
  ondalik: number;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  anahtar: RenkEslemesi | null;
  /** karşılaştırmada her değişkenin adımlarının başlığı */
  baslik?: string;
  olculer: OlcuKumesi;
}

function HesaplamaAdimlariBolumu({ tablo, sutun, noktalar, adimlar: a, ondalik, seciliSatir, onSatirSec, anahtar, baslik, olculer }: AdimlarProps) {
  const d = a.ondalik;
  const yaz = (v: number) => gosterimMetni(adimGosterimi(v, d));
  const terim = (v: number) => {
    const g = adimGosterimi(v, d);
    return `${g.yaklasik ? '≈ ' : ''}${terimMetni(g.deger, g.ondalik)}`;
  };
  const m = a.ortalamaGosterim;
  const mMetni = gosterimMetni(m);
  const mSayi = sayiMetni(m.deger, m.ondalik);
  const kartOrt = kartGosterimi(a.ortalama, ondalik);
  const kartOms = kartGosterimi(a.oms, ondalik);
  const ortancaCift = a.n % 2 === 0;
  const etiketSutunu = sutun !== 0 && tablo.sutunlar[0]?.tur === 'etiket' ? 0 : -1;
  const etiket = (satir: number) => (etiketSutunu === 0 ? tablo.satirlar[satir]?.hucreler[0]?.trim() : '') || `${satir + 1}. satır`;
  const etiketBasligi = etiketSutunu === 0 ? tablo.sutunlar[0].ad : 'Satır';
  const tepeKumesi = new Set(a.tepe.degerler);

  // Ortanca için sıralı dizi: 30 veriye kadar tümü; fazlasında baş, orta ve son
  const siraliGosterim: (number | null)[] = (() => {
    if (a.n <= TERIM_SINIRI) return a.siraliDegerler.map((_, i) => i);
    const orta = a.ortaIndeksler;
    const bas = [0, 1, 2];
    const ortaBolum = [orta[0] - 1, ...orta, orta[orta.length - 1] + 1];
    const son = [a.n - 3, a.n - 2, a.n - 1];
    return [...bas, null, ...ortaBolum, null, ...son];
  })();

  const uzaklikTerimleri = a.siklikBicimi ? a.sikliklar.map((s) => terimMetni(s.uzaklikCarpim)) : a.satirlar.map((s) => terimMetni(s.uzaklik));
  const kareTerimleri = a.siklikBicimi ? a.sikliklar.map((s) => terimMetni(s.kareUzaklikCarpim)) : a.satirlar.map((s) => terimMetni(s.kareUzaklik));
  const kartSs = a.standartSapma === null ? null : kartGosterimi(a.standartSapma, ondalik);

  return (
    <div className="space-y-2" data-hesaplama-adimlari>
      {baslik && <h3 className="pt-1 text-base font-bold text-foreground">{baslik}</h3>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-2">
        {olculer.merkezi && (
        <Adim no={1} baslik="Aritmetik ortalama" veri="ortalama">
          <Esitlik ad="Verilerin toplamı" ifade={toplamIfadesi(a.satirlar.map((s) => terim(s.deger)), 'veri')} sonuc={a.toplamGosterim} />
          <p className="text-muted-foreground">Aritmetik ortalama = verilerin toplamı ÷ veri sayısı</p>
          <Esitlik
            ad="Aritmetik ortalama"
            ifade={`${yaz(a.toplamGosterim.deger)} ÷ ${a.n}`}
            sonuc={m}
            not={m.yaklasik ? `(bölüm tam çıkmıyor: ${uzunOndalik(a.ortalama)})` : m.deger !== kartOrt.deger ? `(kartta ${gosterimMetni(kartOrt)})` : undefined}
          />
        </Adim>
        )}

        {olculer.merkezi && (
        <Adim no={2} baslik="Ortanca" veri="ortanca">
          <p className="text-muted-foreground">Veriler küçükten büyüğe sıralanır:</p>
          <p className="flex flex-wrap items-center gap-1 py-0.5" data-sirali-veriler>
            {siraliGosterim.map((i, k) =>
              i === null ? (
                <span key={`b${k}`} className="px-0.5 text-muted-foreground">
                  …
                </span>
              ) : (
                <Cip key={i} secili={a.ortaIndeksler.includes(i)} title={`${i + 1}. veri`}>
                  {yaz(a.siraliDegerler[i])}
                </Cip>
              ),
            )}
          </p>
          <p>
            {ortancaCift
              ? `${a.n} veri var (çift): Ortanca, ${a.ortancaKonumlari[0]}. ve ${a.ortancaKonumlari[1]}. verilerin toplamının yarısıdır.`
              : `${a.n} veri var (tek): Ortadaki veri ${a.ortancaKonumlari[0]}. veri.`}
          </p>
          <Esitlik
            ad="Ortanca"
            ifade={
              ortancaCift
                ? `(${terim(a.siraliDegerler[a.ortaIndeksler[0]])} + ${terim(a.siraliDegerler[a.ortaIndeksler[1]])}) ÷ 2`
                : undefined
            }
            sonuc={a.ortancaGosterim}
          />
        </Adim>
        )}

        {olculer.merkezi && (
        <Adim no={3} baslik="Tepe değer" veri="tepe">
          {a.sikliklar.length <= SAYIM_SINIRI ? (
            <>
              <p className="text-muted-foreground">Her değerin kaç kez görüldüğünü sayalım:</p>
              <p className="flex flex-wrap items-center gap-1 py-0.5" data-siklik-sayimi>
                {a.sikliklar.map((s) => (
                  <Cip key={s.deger} secili={tepeKumesi.has(s.deger)}>
                    <span className="font-bold">{yaz(s.deger)}</span>
                    <span className={tepeKumesi.has(s.deger) ? '' : 'text-muted-foreground'}>{`· ${s.siklik} kez`}</span>
                  </Cip>
                ))}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">
              {olculer.oms ? `${a.sikliklar.length} farklı değer var; her birinin sıklığı 5. adımdaki tabloda.` : `${a.sikliklar.length} farklı değer var.`}
            </p>
          )}
          <p>
            {a.tepe.degerler.length === 0 ? (
              <>
                {`Bütün değerler aynı sıklıkta (her biri ${a.tepe.sayi} kez): Tepe değer `}
                <strong>yok</strong>.
              </>
            ) : (
              <>
                {a.tepe.degerler.length === 1
                  ? `En çok görülen değer ${yaz(a.tepe.degerler[0])} (${a.tepe.sayi} kez): Tepe değer `
                  : `En çok görülen değerler ${listeMetni(a.tepe.degerler.map(yaz))} (her biri ${a.tepe.sayi} kez): Tepe değer `}
                <strong>{listeMetni(a.tepe.degerler.map(yaz))}</strong>.
              </>
            )}
          </p>
        </Adim>
        )}

        {olculer.aciklik && (
        <Adim no={4} baslik="Açıklık" veri="aciklik">
          <p>
            En küçük veri <strong>{yaz(a.enKucuk)}</strong>, en büyük veri <strong>{yaz(a.enBuyuk)}</strong>.
          </p>
          <Esitlik ad="Açıklık" ifade={`en büyük değer − en küçük değer = ${yaz(a.enBuyuk)} − ${terim(a.enKucuk)}`} sonuc={a.aciklikGosterim} />
        </Adim>
        )}

        {olculer.oms && (
        <Adim no={5} baslik="Ortalama mutlak sapma" veri="oms" genis>
          <p>
            Her veri için <strong>fark = değer − ortalama</strong>. Farkın işaretini atınca <strong>ortalamaya uzaklık</strong> kalır (farkın mutlak değeri).
          </p>
          {m.yaklasik && (
            <p className="text-muted-foreground" data-yuvarlama-notu>
              {`Aritmetik ortalama tam çıkmadığı için farkları yuvarlanmış ortalamayla (${mMetni}) hesapladık.`}
            </p>
          )}
          <div className="overflow-x-auto py-1">
            {a.siklikBicimi ? (
              <SiklikTablosu adimlar={a} yaz={yaz} />
            ) : (
              <table className="min-w-[360px] text-[13px] tabular-nums" data-oms-tablosu>
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th scope="col" className="h-9 pr-4 font-bold">
                      {etiketBasligi}
                    </th>
                    <th scope="col" className="pr-4 text-right font-bold">
                      Değer
                    </th>
                    <th scope="col" className="pr-4 text-right font-bold">
                      Fark <span className="font-semibold">(değer − {mSayi})</span>
                    </th>
                    <th scope="col" className="text-right font-bold">
                      Ortalamaya uzaklık
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {a.satirlar.map((s, i) => {
                    const satir = noktalar[i]?.satir ?? i;
                    const secili = seciliSatir === satir;
                    const sec = () => onSatirSec(secili ? null : satir);
                    return (
                      <tr
                        key={tablo.satirlar[satir]?.id ?? i}
                        tabIndex={0}
                        data-satir={satir}
                        className={`cursor-pointer border-t border-border/60 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${secili ? 'bg-accent' : 'hover:bg-muted'}`}
                        onClick={sec}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            sec();
                          }
                        }}
                      >
                        <td className="h-9 pr-4">
                          <span className="inline-flex items-center gap-2">
                            {anahtar && <RenkNoktasi renk={satirRengi(anahtar, satir)} />}
                            {etiket(satir)}
                          </span>
                        </td>
                        <td className="pr-4 text-right">{yaz(s.deger)}</td>
                        <td className="pr-4 text-right">
                          <Fark deger={s.fark} ondalik={s.ondalik} yaklasik={s.yaklasik} />
                        </td>
                        <td className="text-right">
                          <span className="inline-flex items-center gap-1">
                            <Mutlak>{sayiMetni(s.fark, s.ondalik)}</Mutlak>
                            <span>=</span>
                            <strong>{sayiMetni(s.uzaklik, s.ondalik)}</strong>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-bold">
                    <th scope="row" className="h-9 pr-4 text-left">
                      Toplam
                    </th>
                    <td className="pr-4 text-right">{gosterimMetni(a.toplamGosterim)}</td>
                    <td className="pr-4 text-right" data-fark-toplami>
                      {sayiMetni(a.farkToplami, 4)}
                    </td>
                    <td className="text-right" data-uzaklik-toplami>
                      {sayiMetni(a.uzaklikToplami, 4)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
          <p className="text-muted-foreground" data-denge-cumlesi>
            {a.siklikBicimi
              ? // Sıklık tablosunda fark sütunu yok: dengeyi iki yanın uzaklık toplamlarıyla anlatır
                a.farkToplami === 0
                ? `Ortalamanın altındaki verilerin uzaklıkları toplamı ${sayiMetni(a.solUzaklikToplami, 4)}, üstündekilerinki ${sayiMetni(a.sagUzaklikToplami, 4)}: İki yan dengede (farkların toplamı 0).`
                : `Ortalamanın altındaki verilerin uzaklıkları toplamı ${sayiMetni(a.solUzaklikToplami, 4)}, üstündekilerinki ${sayiMetni(a.sagUzaklikToplami, 4)}: Ortalama yuvarlandığı için tam eşit çıkmadı.`
              : a.farkToplami === 0
                ? 'Farkların toplamı 0: Ortalamadan pozitif sapmaların toplamı, negatif sapmaların mutlak değerleri toplamına eşittir.'
                : `Farkların toplamı ${sayiMetni(a.farkToplami, 4)}: Ortalama yuvarlandığı için tam 0 çıkmadı.`}
          </p>
          <Esitlik ad="Uzaklıkların toplamı" ifade={toplamIfadesi(uzaklikTerimleri, a.siklikBicimi ? 'değer' : 'veri')} sonuc={sayiMetni(a.uzaklikToplami, 4)} />
          <p className="text-muted-foreground">Ortalama mutlak sapma = ortalamaya uzaklıkların toplamı ÷ veri sayısı</p>
          <Esitlik
            ad="Ortalama mutlak sapma"
            ifade={`${sayiMetni(a.uzaklikToplami, 4)} ÷ ${a.n}`}
            sonuc={a.omsGosterim}
            not={a.omsGosterim.deger !== kartOms.deger || a.omsGosterim.yaklasik !== kartOms.yaklasik ? `(kartta ${gosterimMetni(kartOms)})` : undefined}
          />
        </Adim>
        )}

        {/* Lise ölçüsü (9. sınıf): uzaklıkların karesi, toplamı ÷ (veri sayısı − 1), karekök; formül simgesi yerine sözle */}
        {olculer.standartSapma && (
        <Adim no={6} baslik="Standart sapma" veri="standartSapma" genis>
          <p>
            Lise ölçüsü: her uzaklığın karesi alınır (<strong>kare uzaklık = uzaklık × uzaklık</strong>); büyük uzaklıklar daha çok ağırlık kazanır.
          </p>
          {a.n < 2 || !a.kareBolumGosterim || !a.standartSapmaGosterim ? (
            <p className="text-muted-foreground" data-standart-sapma-yok>
              Tek veriyle standart sapma hesaplanmaz: veri sayısı − 1 = 0.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto py-1">
                {a.siklikBicimi ? (
                  <KareSiklikTablosu adimlar={a} yaz={yaz} />
                ) : (
                  <KareTablosu adimlar={a} yaz={yaz} etiket={etiket} etiketBasligi={etiketBasligi} noktalar={noktalar} anahtar={anahtar} />
                )}
              </div>
              <Esitlik ad="Kare uzaklıkların toplamı" ifade={toplamIfadesi(kareTerimleri, a.siklikBicimi ? 'değer' : 'veri')} sonuc={sayiMetni(a.kareUzaklikToplami, 4)} />
              <p className="text-muted-foreground">Standart sapma = kare uzaklıkların toplamı ÷ (veri sayısı − 1), sonra karekök</p>
              <Esitlik ad="Kare uzaklıkların toplamı ÷ (veri sayısı − 1)" ifade={`${sayiMetni(a.kareUzaklikToplami, 4)} ÷ ${a.n - 1}`} sonuc={a.kareBolumGosterim} />
              <Esitlik
                ad="Standart sapma"
                ifade={`√${gosterimMetni(a.kareBolumGosterim, false)}`}
                sonuc={a.standartSapmaGosterim}
                not={kartSs && (a.standartSapmaGosterim.deger !== kartSs.deger || a.standartSapmaGosterim.yaklasik !== kartSs.yaklasik) ? `(kartta ${gosterimMetni(kartSs)})` : undefined}
              />
            </>
          )}
        </Adim>
        )}
      </div>
    </div>
  );
}

/** Standart sapma adımı: Değer · Ortalamaya uzaklık · Kare uzaklık (uzaklık × uzaklık); toplam satırı */
function KareTablosu({
  adimlar: a,
  yaz,
  etiket,
  etiketBasligi,
  noktalar,
  anahtar,
}: {
  adimlar: HesaplamaAdimlari;
  yaz: (v: number) => string;
  etiket: (satir: number) => string;
  etiketBasligi: string;
  noktalar: DegerNoktasi[];
  anahtar: RenkEslemesi | null;
}) {
  return (
    <table className="min-w-[360px] text-[13px] tabular-nums" data-kare-tablosu>
      <thead>
        <tr className="text-left text-muted-foreground">
          <th scope="col" className="h-9 pr-4 font-bold">
            {etiketBasligi}
          </th>
          <th scope="col" className="pr-4 text-right font-bold">
            Değer
          </th>
          <th scope="col" className="pr-4 text-right font-bold">
            Ortalamaya uzaklık
          </th>
          <th scope="col" className="text-right font-bold">
            Kare uzaklık <span className="font-semibold">(uzaklık × uzaklık)</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {a.satirlar.map((s, i) => {
          const satir = noktalar[i]?.satir ?? i;
          return (
            <tr key={`${satir}-${i}`} className="border-t border-border/60">
              <td className="h-9 pr-4">
                <span className="inline-flex items-center gap-2">
                  {anahtar && <RenkNoktasi renk={satirRengi(anahtar, satir)} />}
                  {etiket(satir)}
                </span>
              </td>
              <td className="pr-4 text-right">{yaz(s.deger)}</td>
              <td className="pr-4 text-right">{sayiMetni(s.uzaklik, s.ondalik)}</td>
              <td className="text-right">
                <strong>{`${s.kareYaklasik ? '≈ ' : ''}${sayiMetni(s.kareUzaklik, 4)}`}</strong>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-border font-bold">
          <th scope="row" className="h-9 pr-4 text-left">
            Toplam
          </th>
          <td className="pr-4 text-right">{gosterimMetni(a.toplamGosterim)}</td>
          <td className="pr-4 text-right">{sayiMetni(a.uzaklikToplami, 4)}</td>
          <td className="text-right" data-kare-toplami>
            {sayiMetni(a.kareUzaklikToplami, 4)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/** Çok veride standart sapma: Değer · Sıklık · Kare uzaklık · Sıklık × kare uzaklık */
function KareSiklikTablosu({ adimlar: a, yaz }: { adimlar: HesaplamaAdimlari; yaz: (v: number) => string }) {
  const gorunen = a.sikliklar.slice(0, SIKLIK_SATIR_SINIRI);
  const kalan = a.sikliklar.length - gorunen.length;
  return (
    <table className="min-w-[420px] text-[13px] tabular-nums" data-kare-siklik-tablosu>
      <thead>
        <tr className="text-muted-foreground">
          <th scope="col" className="h-9 pr-4 text-right font-bold">
            Değer
          </th>
          <th scope="col" className="pr-4 text-right font-bold">
            Sıklık
          </th>
          <th scope="col" className="pr-4 text-right font-bold">
            Kare uzaklık
          </th>
          <th scope="col" className="text-right font-bold">
            Sıklık × kare uzaklık
          </th>
        </tr>
      </thead>
      <tbody>
        {gorunen.map((s) => (
          <tr key={s.deger} className="border-t border-border/60">
            <td className="h-8 pr-4 text-right font-semibold">{yaz(s.deger)}</td>
            <td className="pr-4 text-right">{s.siklik}</td>
            <td className="pr-4 text-right">{sayiMetni(s.kareUzaklik, 4)}</td>
            <td className="text-right">{sayiMetni(s.kareUzaklikCarpim, 4)}</td>
          </tr>
        ))}
        {kalan > 0 && (
          <tr className="border-t border-border/60 text-muted-foreground">
            <td colSpan={4} className="h-8 text-center">{`… ${kalan} değer daha`}</td>
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-border font-bold">
          <th scope="row" className="h-9 pr-4 text-right">
            Toplam
          </th>
          <td className="pr-4 text-right">{a.n}</td>
          <td className="pr-4 text-right text-muted-foreground">—</td>
          <td className="text-right" data-kare-toplami>
            {sayiMetni(a.kareUzaklikToplami, 4)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/** Çok veride ortalama mutlak sapma: Değer · Sıklık · Değer × sıklık · Ortalamaya uzaklık · Sıklık × uzaklık */
function SiklikTablosu({ adimlar: a, yaz }: { adimlar: HesaplamaAdimlari; yaz: (v: number) => string }) {
  const gorunen = a.sikliklar.slice(0, SIKLIK_SATIR_SINIRI);
  const kalan = a.sikliklar.length - gorunen.length;
  const tepe = new Set(a.tepe.degerler);
  return (
    <table className="min-w-[480px] text-[13px] tabular-nums" data-siklik-tablosu>
      <thead>
        <tr className="text-muted-foreground">
          <th scope="col" className="h-9 pr-4 text-right font-bold">
            Değer
          </th>
          <th scope="col" className="pr-4 text-right font-bold">
            Sıklık
          </th>
          <th scope="col" className="pr-4 text-right font-bold">
            Değer × sıklık
          </th>
          <th scope="col" className="pr-4 text-right font-bold">
            Ortalamaya uzaklık
          </th>
          <th scope="col" className="text-right font-bold">
            Sıklık × uzaklık
          </th>
        </tr>
      </thead>
      <tbody>
        {gorunen.map((s) => (
          <tr key={s.deger} className="border-t border-border/60">
            <td className="h-8 pr-4 text-right font-semibold">{yaz(s.deger)}</td>
            <td className={`pr-4 text-right ${tepe.has(s.deger) ? 'font-bold text-primary' : ''}`}>{s.siklik}</td>
            <td className="pr-4 text-right">{sayiMetni(s.carpim, 4)}</td>
            <td className="pr-4 text-right">{sayiMetni(s.uzaklik, 4)}</td>
            <td className="text-right">{sayiMetni(s.uzaklikCarpim, 4)}</td>
          </tr>
        ))}
        {kalan > 0 && (
          <tr className="border-t border-border/60 text-muted-foreground">
            <td colSpan={5} className="h-8 text-center">{`… ${kalan} değer daha`}</td>
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-border font-bold">
          <th scope="row" className="h-9 pr-4 text-right">
            Toplam
          </th>
          <td className="pr-4 text-right">{a.n}</td>
          <td className="pr-4 text-right">{gosterimMetni(a.toplamGosterim)}</td>
          <td className="pr-4 text-right text-muted-foreground">—</td>
          <td className="text-right" data-uzaklik-toplami>
            {sayiMetni(a.uzaklikToplami, 4)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

/**
 * İstatistik değerlerinin (kartlar, gruplar, adımlarda yuvarlanan sonuçlar) en çok ondalık basamağı, veri
 * değerlerinden: `gosterimOndaligi` (tam sayılı ve 1–2 ondalıklı veride 2). Veri 3 ya da daha çok ondalık
 * istiyorsa (0,001'lik ölçüm) bir basamak daha verilir, en çok 4: ortalama 0,0024 "≈ 0,002"ye ezilmez;
 * 0,125'lik veride ortalama 0,375 tam yazılır.
 */
export function istatistikOndaligi(degerler: readonly number[]): number {
  const d = gosterimOndaligi(degerler);
  return d >= 3 ? Math.min(4, d + 1) : d;
}

// ── Panel ───────────────────────────────────────────────────────────────────

export function IstatistikPaneli({
  tablo,
  sutun,
  seciliSatir,
  onSatirSec,
  adimlariGoster: adimlariGosterSecimi,
  onAdimlariGoster,
  renkEslemi = null,
  ikinciSutun = null,
  olculer = TUM_OLCULER,
  ceyrekler: ceyreklerVar = false,
}: IstatistikProps) {
  /** Hiçbir ölçü yok (5. sınıf): kart, adım ve grup tablosu yerine veri sayısı ve toplam */
  const olcusuz = !olculer.merkezi && !olculer.aciklik && !olculer.oms && !olculer.standartSapma;
  const adimlariGoster = adimlariGosterSecimi && !olcusuz;
  const noktalar = useMemo(() => gecerliDegerler(tablo, sutun), [tablo, sutun]);
  const degerler = useMemo(() => noktalar.map((n) => n.deger), [noktalar]);
  const ikinci =
    ikinciSutun !== null && ikinciSutun !== sutun && ikinciSutun >= 0 && ikinciSutun < tablo.sutunlar.length && tablo.sutunlar[ikinciSutun].tur === 'sayi' ? ikinciSutun : null;
  const ikinciNoktalar = useMemo(() => (ikinci === null ? [] : gecerliDegerler(tablo, ikinci)), [tablo, ikinci]);
  const ikinciDegerler = useMemo(() => ikinciNoktalar.map((n) => n.deger), [ikinciNoktalar]);
  // Yuvarlama basamağı verilerden gelir (ortalamadan değil): 0,001'lik veri 0 görünmez
  const ondalik = useMemo(() => istatistikOndaligi([...degerler, ...ikinciDegerler]), [degerler, ikinciDegerler]);
  const ozet = useMemo(() => ozetHesapla(degerler), [degerler]);
  const ikinciOzet = useMemo(() => (ikinci === null ? null : ozetHesapla(ikinciDegerler)), [ikinci, ikinciDegerler]);
  const adimlar = useMemo(() => (adimlariGoster ? hesaplamaAdimlari(degerler, ondalik) : null), [adimlariGoster, degerler, ondalik]);
  const ikinciAdimlar = useMemo(
    () => (adimlariGoster && ikinci !== null ? hesaplamaAdimlari(ikinciDegerler, ondalik) : null),
    [adimlariGoster, ikinci, ikinciDegerler, ondalik],
  );
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '—';
  const ikinciAdi = ikinci === null ? '' : tablo.sutunlar[ikinci]?.ad ?? '—';
  const anahtar = renkEslemi && renkEslemi.sutun !== sutun && renkEslemi.sutun >= 0 && renkEslemi.sutun < tablo.sutunlar.length ? renkEslemi : null;
  const gruplar = useMemo(() => {
    if (!anahtar) return [];
    const degerBul = new Map(noktalar.map((n) => [n.satir, n.deger]));
    return renkGruplari(
      anahtar,
      noktalar.map((n) => n.satir),
    ).map((g) => ({ ...g, ozet: ozetHesapla(g.satirlar.map((s) => degerBul.get(s) ?? 0)) }));
  }, [anahtar, noktalar]);

  const grupHucresi = (deger: number | null) => {
    const g = ozetGosterim(deger, ondalik);
    return g ? <Sayi g={g} /> : '—';
  };

  /** Grup tablosundaki yayılım sütunları */
  const yayilimSayisi = [olculer.aciklik, olculer.oms, olculer.standartSapma].filter(Boolean).length;
  // Gruplara göre tablo: adımlar açıkken adımların altına iner (1366'da adımlar ilk ekranda başlasın)
  const grupBolumu =
    anahtar && gruplar.length > 0 && !olcusuz ? (
      <section className="mt-3 rounded-[calc(var(--radius)-6px)] border border-border bg-card p-3" data-grup-istatistikleri>
        <h3 className="mb-1 text-base font-bold text-foreground">
          Gruplara göre <span className="text-muted-foreground">({anahtar.ad})</span>
        </h3>
        <div className="overflow-x-auto">
          <table className={`${yayilimSayisi === 3 && olculer.merkezi ? 'min-w-[700px]' : 'min-w-[520px]'} text-[13px] tabular-nums text-foreground`}>
            <thead>
              <tr className="text-[12px] text-muted-foreground">
                <th colSpan={2} />
                {olculer.merkezi && (
                  <th colSpan={3} scope="colgroup" className="border-b border-border pb-0.5 text-center font-bold">
                    Merkezi eğilim ölçüleri
                  </th>
                )}
                {olculer.merkezi && yayilimSayisi > 0 && <th className="w-3" />}
                {yayilimSayisi > 0 && (
                  <th colSpan={yayilimSayisi} scope="colgroup" className="border-b border-border pb-0.5 text-center font-bold">
                    Yayılım ölçüleri
                  </th>
                )}
              </tr>
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="h-9 pr-4 font-bold">
                  {anahtar.ad}
                </th>
                <th scope="col" className="pr-4 text-right font-bold">
                  Veri sayısı
                </th>
                {olculer.merkezi && (
                  <>
                    <th scope="col" className="pr-4 text-right font-bold">
                      Aritmetik ortalama
                    </th>
                    <th scope="col" className="pr-4 text-right font-bold">
                      Ortanca
                    </th>
                    <th scope="col" className="pr-4 text-right font-bold">
                      Tepe değer
                    </th>
                  </>
                )}
                {olculer.merkezi && yayilimSayisi > 0 && <th />}
                {olculer.aciklik && (
                  <th scope="col" className="pr-4 text-right font-bold">
                    Açıklık
                  </th>
                )}
                {olculer.oms && (
                  <th scope="col" className="pr-4 text-right font-bold">
                    Ort. mutlak sapma
                  </th>
                )}
                {olculer.standartSapma && (
                  <th scope="col" className="text-right font-bold">
                    Standart sapma
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {[
                ...gruplar.map((g) => ({ ad: g.kategori ?? '(boş)', renk: g.renk as string | undefined, ozet: g.ozet, tumu: false })),
                { ad: 'Tümü', renk: undefined, ozet, tumu: true },
              ].map((g) => (
                <tr key={g.tumu ? '__tumu__' : g.ad} className={`border-t border-border ${g.tumu ? 'font-bold' : ''}`} data-grup={g.tumu ? undefined : g.ad}>
                  <td className="h-9 pr-4">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      {g.renk && <RenkNoktasi renk={g.renk} />}
                      {g.ad}
                    </span>
                  </td>
                  <td className="pr-4 text-right">{g.ozet.n}</td>
                  {olculer.merkezi && (
                    <>
                      <td className="pr-4 text-right">{grupHucresi(g.ozet.ortalama)}</td>
                      <td className="pr-4 text-right">{grupHucresi(g.ozet.medyan)}</td>
                      <td className="pr-4 text-right">{g.ozet.n === 0 ? '—' : tepeMetni(g.ozet, ondalik)}</td>
                    </>
                  )}
                  {olculer.merkezi && yayilimSayisi > 0 && <td />}
                  {olculer.aciklik && <td className="pr-4 text-right">{grupHucresi(g.ozet.aciklik)}</td>}
                  {olculer.oms && <td className="pr-4 text-right">{grupHucresi(g.ozet.oms)}</td>}
                  {olculer.standartSapma && <td className="text-right">{grupHucresi(g.ozet.standartSapma)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    ) : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-background p-3 sm:p-4" data-istatistik-paneli>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-lg font-bold text-foreground">{ikinci === null ? sutunAdi : `${sutunAdi} ve ${ikinciAdi}`}</h2>
        {ikinci === null && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[12.5px] font-semibold tabular-nums text-muted-foreground" data-veri-sayisi>
            Veri sayısı: {ozet.n}
          </span>
        )}
        {!olcusuz && (
          <label className="ml-auto inline-flex h-11 cursor-pointer items-center gap-2 rounded-[calc(var(--radius)-6px)] border border-border bg-card px-3 text-[13px] font-semibold text-foreground">
            <input type="checkbox" className={ONAY_KUTUSU} checked={adimlariGoster} onChange={(e) => onAdimlariGoster(e.target.checked)} />
            Hesaplama adımlarını göster
          </label>
        )}
      </div>

      {ozet.n === 0 && (ikinciOzet === null || ikinciOzet.n === 0) ? (
        <p className="rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4 text-[13px] text-muted-foreground">
          Bu değişkende sayısal değer yok. Tabloya sayı girin ya da başka bir değişken seçin.
        </p>
      ) : olcusuz ? (
        <OlcusuzOzet degerler={degerler} ondalik={ondalik} />
      ) : ikinci !== null && ikinciOzet ? (
        <KarsilastirmaTablosu adlar={[sutunAdi, ikinciAdi]} ozetler={[ozet, ikinciOzet]} ondalik={ondalik} olculer={olculer} />
      ) : (
        <OlcuKartlari ozet={ozet} ondalik={ondalik} olculer={olculer} ceyrek={ceyreklerVar && olculer.aciklik ? ceyrekler(degerler) : null} />
      )}

      {!adimlar && grupBolumu}

      {adimlar && (
        <div className="mt-3 space-y-3">
          <HesaplamaAdimlariBolumu
            tablo={tablo}
            sutun={sutun}
            noktalar={noktalar}
            adimlar={adimlar}
            ondalik={ondalik}
            seciliSatir={seciliSatir}
            onSatirSec={onSatirSec}
            anahtar={anahtar}
            baslik={ikinci !== null ? `${sutunAdi}: hesaplama adımları` : undefined}
            olculer={olculer}
          />
          {ikinci !== null && ikinciAdimlar && (
            <HesaplamaAdimlariBolumu
              tablo={tablo}
              sutun={ikinci}
              noktalar={ikinciNoktalar}
              adimlar={ikinciAdimlar}
              ondalik={ondalik}
              seciliSatir={seciliSatir}
              onSatirSec={onSatirSec}
              anahtar={anahtar && anahtar.sutun !== ikinci ? anahtar : null}
              baslik={`${ikinciAdi}: hesaplama adımları`}
              olculer={olculer}
            />
          )}
        </div>
      )}

      {adimlar && grupBolumu}
    </div>
  );
}
