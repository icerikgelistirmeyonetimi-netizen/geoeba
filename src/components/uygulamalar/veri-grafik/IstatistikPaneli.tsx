'use client';

/**
 * İstatistik paneli: seçili değişken için aritmetik ortalama, ortalama mutlak sapma, medyan,
 * en küçük/en büyük, açıklık. "Hesaplama adımlarını göster" adım adım ara sonuçları açar.
 * Renk anahtarı seçiliyse aynı ölçüler anahtarın her grubu için ayrı ayrı ("Gruplara göre") karşılaştırılır.
 */
import React, { useMemo } from 'react';
import { hesaplamaAdimlari, ozetHesapla } from './istatistik';
import { gecerliDegerler, satirEtiketi, sayiYaz, type VeriTablosu } from './veri';
import { ONAY_KUTUSU, RenkNoktasi } from './ortak';
import { renkGruplari, satirRengi, type RenkEslemesi } from './kategorik';

export interface IstatistikProps {
  tablo: VeriTablosu;
  sutun: number;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  adimlariGoster: boolean;
  onAdimlariGoster: (deger: boolean) => void;
  /** Renk anahtarı: kategorik değişkenin grupları için ayrı özet tablosu */
  renkEslemi?: RenkEslemesi | null;
}

function Kart({ baslik, deger, aciklama }: { baslik: string; deger: string; aciklama?: string }) {
  return (
    <div className="rounded-[calc(var(--radius)-4px)] border border-border bg-card px-4 py-3 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]">
      <div className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">{baslik}</div>
      <div className="font-baslik mt-1 text-2xl font-semibold tabular-nums text-foreground">{deger}</div>
      {aciklama && <div className="mt-0.5 text-[13px] text-muted-foreground">{aciklama}</div>}
    </div>
  );
}

const yaz = (v: number | null) => (v === null ? '—' : sayiYaz(v));

export function IstatistikPaneli({ tablo, sutun, seciliSatir, onSatirSec, adimlariGoster, onAdimlariGoster, renkEslemi = null }: IstatistikProps) {
  const noktalar = useMemo(() => gecerliDegerler(tablo, sutun), [tablo, sutun]);
  const degerler = noktalar.map((n) => n.deger);
  const ozet = ozetHesapla(degerler);
  const adimlar = adimlariGoster ? hesaplamaAdimlari(degerler) : null;
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '—';
  const anahtar = renkEslemi && renkEslemi.sutun !== sutun && renkEslemi.sutun >= 0 && renkEslemi.sutun < tablo.sutunlar.length ? renkEslemi : null;
  const gruplar = useMemo(() => {
    if (!anahtar) return [];
    const degerBul = new Map(noktalar.map((n) => [n.satir, n.deger]));
    return renkGruplari(
      anahtar,
      noktalar.map((n) => n.satir),
    ).map((g) => ({ ...g, ozet: ozetHesapla(g.satirlar.map((s) => degerBul.get(s) ?? 0)) }));
  }, [anahtar, noktalar]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-background p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="font-baslik text-lg font-semibold text-foreground">
          {sutunAdi} <span className="text-muted-foreground">· n = {ozet.n}</span>
        </h2>
        <label className="ml-auto inline-flex h-11 cursor-pointer items-center gap-2 rounded-[calc(var(--radius)-6px)] border border-border bg-card px-3 text-[13px] font-semibold text-foreground">
          <input type="checkbox" className={ONAY_KUTUSU} checked={adimlariGoster} onChange={(e) => onAdimlariGoster(e.target.checked)} />
          Hesaplama adımlarını göster
        </label>
      </div>

      {ozet.n === 0 ? (
        <p className="rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4 text-[13px] text-muted-foreground">
          Bu değişkende sayısal değer yok. Tabloya sayı girin ya da başka bir değişken seçin.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kart baslik="Aritmetik ortalama" deger={yaz(ozet.ortalama)} aciklama="x̄ = toplam ÷ n" />
          <Kart baslik="Ortalama mutlak sapma" deger={yaz(ozet.oms)} aciklama="Σ|x − x̄| ÷ n" />
          <Kart baslik="Medyan" deger={yaz(ozet.medyan)} aciklama="sıralı dizinin ortası" />
          <Kart baslik="En küçük" deger={yaz(ozet.enKucuk)} />
          <Kart baslik="En büyük" deger={yaz(ozet.enBuyuk)} />
          <Kart baslik="Açıklık" deger={yaz(ozet.aciklik)} aciklama="en büyük − en küçük" />
        </div>
      )}

      {anahtar && gruplar.length > 0 && (
        <section className="mt-4 rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4" data-grup-istatistikleri>
          <h3 className="font-baslik mb-2 text-base font-semibold text-foreground">
            Gruplara göre <span className="text-muted-foreground">({anahtar.ad})</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-[560px] text-[13px] tabular-nums text-foreground">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="h-9 pr-4 font-bold">{anahtar.ad}</th>
                  <th className="pr-4 text-right font-bold">n</th>
                  <th className="pr-4 text-right font-bold">Ortalama</th>
                  <th className="pr-4 text-right font-bold">Ort. mutlak sapma</th>
                  <th className="pr-4 text-right font-bold">Medyan</th>
                  <th className="pr-4 text-right font-bold">En küçük</th>
                  <th className="pr-4 text-right font-bold">En büyük</th>
                  <th className="text-right font-bold">Açıklık</th>
                </tr>
              </thead>
              <tbody>
                {[...gruplar.map((g) => ({ ad: g.kategori ?? '(boş)', renk: g.renk as string | undefined, ozet: g.ozet, tumu: false })), { ad: 'Tümü', renk: undefined, ozet, tumu: true }].map((g) => (
                  <tr key={g.tumu ? '__tumu__' : g.ad} className={`border-t border-border ${g.tumu ? 'font-bold' : ''}`} data-grup={g.tumu ? undefined : g.ad}>
                    <td className="h-9 pr-4">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        {g.renk && <RenkNoktasi renk={g.renk} />}
                        {g.ad}
                      </span>
                    </td>
                    <td className="pr-4 text-right">{g.ozet.n}</td>
                    <td className="pr-4 text-right">{yaz(g.ozet.ortalama)}</td>
                    <td className="pr-4 text-right">{yaz(g.ozet.oms)}</td>
                    <td className="pr-4 text-right">{yaz(g.ozet.medyan)}</td>
                    <td className="pr-4 text-right">{yaz(g.ozet.enKucuk)}</td>
                    <td className="pr-4 text-right">{yaz(g.ozet.enBuyuk)}</td>
                    <td className="text-right">{yaz(g.ozet.aciklik)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {adimlar && (
        <div className="mt-4 space-y-4 text-[13px] text-foreground">
          <section className="rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4">
            <h3 className="font-baslik mb-2 text-base font-semibold">1. Aritmetik ortalama</h3>
            <p className="tabular-nums leading-7">
              Toplam = {adimlar.sapmalar.map((s) => sayiYaz(s.deger)).join(' + ')} = <strong>{sayiYaz(adimlar.toplam)}</strong>
            </p>
            <p className="tabular-nums leading-7">
              x̄ = {sayiYaz(adimlar.toplam)} ÷ {adimlar.n} = <strong>{sayiYaz(adimlar.ortalama)}</strong>
            </p>
          </section>

          <section className="rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4">
            <h3 className="font-baslik mb-2 text-base font-semibold">2. Ortalama mutlak sapma</h3>
            <div className="overflow-x-auto">
              <table className="min-w-[280px] text-[13px] tabular-nums">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pr-4 font-bold">Gözlem</th>
                    <th className="pr-4 font-bold">x</th>
                    <th className="pr-4 font-bold">|x − x̄|</th>
                  </tr>
                </thead>
                <tbody>
                  {adimlar.sapmalar.map((s, i) => {
                    const satir = noktalar[i].satir;
                    const secili = seciliSatir === satir;
                    return (
                      <tr
                        key={tablo.satirlar[satir]?.id ?? i}
                        className={`cursor-pointer ${secili ? 'bg-accent' : 'hover:bg-muted'}`}
                        onClick={() => onSatirSec(secili ? null : satir)}
                      >
                        <td className="h-8 pr-4">
                          {anahtar ? (
                            <span className="inline-flex items-center gap-2">
                              <RenkNoktasi renk={satirRengi(anahtar, satir)} />
                              {satirEtiketi(tablo, satir)}
                            </span>
                          ) : (
                            satirEtiketi(tablo, satir)
                          )}
                        </td>
                        <td className="pr-4">{sayiYaz(s.deger)}</td>
                        <td className="pr-4">
                          |{sayiYaz(s.deger)} − {sayiYaz(adimlar.ortalama)}| = {sayiYaz(s.sapma)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 tabular-nums leading-7">
              Sapmaların toplamı = {adimlar.sapmalar.map((s) => sayiYaz(s.sapma)).join(' + ')} = <strong>{sayiYaz(adimlar.sapmaToplami)}</strong>
            </p>
            <p className="tabular-nums leading-7">
              OMS = {sayiYaz(adimlar.sapmaToplami)} ÷ {adimlar.n} = <strong>{sayiYaz(adimlar.oms)}</strong>
            </p>
          </section>

          <section className="rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4">
            <h3 className="font-baslik mb-2 text-base font-semibold">3. Medyan, en küçük, en büyük, açıklık</h3>
            <p className="flex flex-wrap items-center gap-1.5 leading-7">
              <span className="text-muted-foreground">Sıralı:</span>
              {adimlar.siraliDegerler.map((v, i) => (
                <span
                  key={i}
                  className={`rounded-md px-2 py-0.5 tabular-nums ${
                    adimlar.ortaIndeksler.includes(i) ? 'bg-primary font-bold text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  {sayiYaz(v)}
                </span>
              ))}
            </p>
            <p className="tabular-nums leading-7">
              Medyan ={' '}
              {adimlar.ortaIndeksler.length === 2
                ? `(${sayiYaz(adimlar.siraliDegerler[adimlar.ortaIndeksler[0]])} + ${sayiYaz(
                    adimlar.siraliDegerler[adimlar.ortaIndeksler[1]],
                  )}) ÷ 2 = `
                : ''}
              <strong>{sayiYaz(adimlar.medyan)}</strong>
            </p>
            <p className="tabular-nums leading-7">
              Açıklık = {yaz(ozet.enBuyuk)} − {yaz(ozet.enKucuk)} = <strong>{yaz(ozet.aciklik)}</strong>
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
