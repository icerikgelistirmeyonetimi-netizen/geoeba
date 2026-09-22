'use client';

/**
 * Kategorik (etiket türündeki) değişkenler için sütun grafiği ve istatistik paneli:
 * her kategori bir frekans sütunu (sayı ve %), frekans tablosu (sayı, göreli sıklık, mod).
 * Daire grafiği için frekanslardan türetilmiş tablo da buradan üretilir.
 * Renk anahtarı başka bir kategorik değişkense sütunlar onun kategorilerine göre yığılır ve istatistikte
 * iki yönlü tablo gösterilir.
 */
import React, { useMemo } from 'react';
import {
  BOS_KATEGORI_RENGI,
  caprazSayim,
  frekanslar,
  kategoriRengi,
  kategoriSayilari,
  mod,
  sutunMetinleri,
  type Frekans,
  type RenkEslemesi,
} from './kategorik';
import { dogrusalOlcek } from './grafik';
import { guzelEksen } from './istatistik';
import { sayiYaz, type VeriTablosu } from './veri';
import { GECIS, RENK, RenkNoktasi } from './ortak';
import { RenkLejanti } from './RenkLejanti';

/** Renk anahtarı gösterilen değişkenden farklı bir kategorik sütunsa onu döndürür (aynıysa renkler zaten kategorilerin) */
function farkliAnahtar(renkEslemi: RenkEslemesi | null | undefined, tablo: VeriTablosu, sutun: number): RenkEslemesi | null {
  return renkEslemi && renkEslemi.sutun !== sutun && renkEslemi.sutun >= 0 && renkEslemi.sutun < tablo.sutunlar.length ? renkEslemi : null;
}

export function kategorikFrekanslar(tablo: VeriTablosu, sutun: number, sira?: string[]): Frekans[] {
  return frekanslar(
    sutunMetinleri(tablo, sutun).map((m) => m.deger),
    sira,
  );
}

/** Daire grafiği için: kategori → sayı tablosu */
export function frekansTablosu(f: Frekans[], ad: string): VeriTablosu {
  return {
    sutunlar: [
      { id: 'kat', ad: 'Kategori', tur: 'etiket' },
      { id: 'frekans', ad, tur: 'sayi' },
    ],
    satirlar: f.map((x) => ({ id: `kat-${x.kategori}`, hucreler: [x.kategori, String(x.sayi)] })),
  };
}

export interface KategorikSutunProps {
  tablo: VeriTablosu;
  sutun: number;
  sira?: string[];
  genislik: number;
  yukseklik: number;
  azaltilmisHareket: boolean;
  /** Renk anahtarı: başka bir kategorik değişkense her sütun onun kategorilerine göre yığılır */
  renkEslemi?: RenkEslemesi | null;
}

const SOL = 56;
const SAG = 16;
const UST = 30;
const ALT = 56;

export function KategorikSutunGrafigi({ tablo, sutun, sira, genislik, yukseklik, azaltilmisHareket, renkEslemi = null }: KategorikSutunProps) {
  const W = Math.max(genislik, 240);
  const H = Math.max(yukseklik, 180);
  const taban = H - ALT;
  const alanG = W - SOL - SAG;
  const f = useMemo(() => kategorikFrekanslar(tablo, sutun, sira), [tablo, sutun, sira]);
  const n = f.reduce((t, x) => t + x.sayi, 0);
  const enCok = f.reduce((m, x) => Math.max(m, x.sayi), 0);
  const eksen = guzelEksen(0, Math.max(enCok * 1.12, 1), Math.max(3, Math.floor((taban - UST) / 44)));
  const olcek = dogrusalOlcek(0, eksen.max, taban, UST);
  const hucreG = alanG / Math.max(f.length, 1);
  const sutunG = Math.max(8, Math.min(hucreG * 0.66, 96));
  const gecis = azaltilmisHareket ? 'none' : `transform 300ms ${GECIS}`;
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '';
  const egik = hucreG < 64;
  const anahtar = farkliAnahtar(renkEslemi, tablo, sutun);
  const capraz = useMemo(() => (anahtar ? caprazSayim(tablo, sutun, anahtar, sira) : null), [anahtar, tablo, sutun, sira]);
  const baslik = `${sutunAdi} · frekans (n = ${n})`;

  return (
    <svg
      data-grafik="sutun"
      role="img"
      aria-label={`${sutunAdi} kategori frekansları`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {eksen.isaretler.map((v) => (
        <g key={v}>
          <line x1={SOL} x2={W - SAG} y1={olcek.ileri(v)} y2={olcek.ileri(v)} stroke={RENK.izgara} strokeWidth={1} />
          <text x={SOL - 8} y={olcek.ileri(v) + 4} fontSize={13} textAnchor="end" fill={RENK.metin}>
            {sayiYaz(v)}
          </text>
        </g>
      ))}
      <line x1={SOL} x2={SOL} y1={UST} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      <text x={SOL} y={16} fontSize={13} fontWeight={700} fill={RENK.metin}>
        {baslik}
      </text>
      {anahtar && (
        <RenkLejanti
          eslem={anahtar}
          x={SOL + baslik.length * 7.4 + 24}
          y={16}
          sagSinir={W - SAG}
          sayilar={kategoriSayilari(
            anahtar,
            sutunMetinleri(tablo, sutun).map((m) => m.satir),
          )}
        />
      )}
      {f.length === 0 && (
        <text x={SOL + alanG / 2} y={(UST + taban) / 2} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Bu değişkende değer yok
        </text>
      )}
      {f.map((x, i) => {
        const cx = SOL + hucreG * (i + 0.5);
        const yuk = Math.max(0.001, taban - olcek.ileri(x.sayi));
        const renk = kategoriRengi(x.kategori, i);
        // Yığın: anahtarın kategorileri alttan üste anahtar sırasıyla, anahtarı boş satırlar en üstte gri
        const satir = capraz?.find((c) => c.kategori === x.kategori);
        const parcalar: { ad: string; sayi: number; renk: string; alt: number }[] = [];
        if (anahtar && satir) {
          let birikim = 0;
          satir.sayilar.forEach((c, j) => {
            if (c <= 0) return;
            const ad = anahtar.kategoriler[j];
            parcalar.push({ ad, sayi: c, renk: anahtar.renkler.get(ad) ?? BOS_KATEGORI_RENGI, alt: birikim });
            birikim += c;
          });
          if (satir.bos > 0) parcalar.push({ ad: '(boş)', sayi: satir.bos, renk: BOS_KATEGORI_RENGI, alt: birikim });
        }
        const dokum = parcalar.length > 0 ? ` · ${parcalar.map((p) => `${p.ad} ${p.sayi}`).join(', ')}` : '';
        return (
          <g key={x.kategori}>
            <title>{`${x.kategori}: ${x.sayi} (%${sayiYaz(x.oran * 100, 1)})${dokum}`}</title>
            {anahtar ? (
              parcalar.map((p, k) => {
                const altY = olcek.ileri(p.alt);
                // Üstteki parçayla arasında ince kart rengi aralık kalır (parçalar ayırt edilsin)
                const boy = Math.max(0.001, altY - olcek.ileri(p.alt + p.sayi) - (k < parcalar.length - 1 ? 1.5 : 0));
                return (
                  <g key={p.ad} style={{ transform: `translate(${cx - sutunG / 2}px, ${altY}px) scaleY(${-boy})`, transition: gecis }} data-yigin-parcasi={p.ad}>
                    <rect x={0} y={0} width={sutunG} height={1} fill={p.renk} />
                  </g>
                );
              })
            ) : (
              <g style={{ transform: `translate(${cx - sutunG / 2}px, ${taban}px) scaleY(${-yuk})`, transition: gecis }}>
                <rect x={0} y={0} width={sutunG} height={1} fill={renk} fillOpacity={0.9} />
              </g>
            )}
            <text x={cx} y={taban - yuk - 22} fontSize={13} fontWeight={800} textAnchor="middle" fill={RENK.metin}>
              {x.sayi}
            </text>
            <text x={cx} y={taban - yuk - 7} fontSize={13} fontWeight={600} textAnchor="middle" fill={RENK.solukMetin}>
              %{sayiYaz(x.oran * 100, 1)}
            </text>
            <text
              x={cx}
              y={taban + 18}
              fontSize={13}
              fontWeight={600}
              textAnchor={egik ? 'end' : 'middle'}
              transform={egik ? `rotate(-35 ${cx} ${taban + 18})` : undefined}
              fill={RENK.metin}
            >
              {x.kategori.length > 12 && egik ? `${x.kategori.slice(0, 11)}…` : x.kategori}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export interface KategorikIstatistikProps {
  tablo: VeriTablosu;
  sutun: number;
  sira?: string[];
  /** Renk anahtarı: başka bir kategorik değişkense iki yönlü tablo gösterilir */
  renkEslemi?: RenkEslemesi | null;
}

export function KategorikIstatistik({ tablo, sutun, sira, renkEslemi = null }: KategorikIstatistikProps) {
  const metinler = useMemo(() => sutunMetinleri(tablo, sutun).map((m) => m.deger), [tablo, sutun]);
  const f = useMemo(() => frekanslar(metinler, sira), [metinler, sira]);
  const modlar = mod(metinler, sira);
  const n = metinler.length;
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '—';
  const enCok = f.reduce((m, x) => Math.max(m, x.sayi), 0);
  const anahtar = farkliAnahtar(renkEslemi, tablo, sutun);
  const capraz = useMemo(() => (anahtar ? caprazSayim(tablo, sutun, anahtar, sira) : null), [anahtar, tablo, sutun, sira]);
  const bosVar = capraz?.some((c) => c.bos > 0) ?? false;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-background p-4">
      <h2 className="font-baslik mb-3 text-lg font-semibold text-foreground">
        {sutunAdi} <span className="text-muted-foreground">· kategorik · n = {n}</span>
      </h2>
      {n === 0 ? (
        <p className="rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4 text-[13px] text-muted-foreground">Bu değişkende değer yok.</p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-[calc(var(--radius)-4px)] border border-border bg-card px-4 py-3 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]">
              <div className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">Mod</div>
              <div className="font-baslik mt-1 text-2xl font-semibold text-foreground">{modlar.join(', ')}</div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">en sık görülen ({enCok} kez)</div>
            </div>
            <div className="rounded-[calc(var(--radius)-4px)] border border-border bg-card px-4 py-3 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]">
              <div className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">Kategori sayısı</div>
              <div className="font-baslik mt-1 text-2xl font-semibold tabular-nums text-foreground">{f.filter((x) => x.sayi > 0).length}</div>
            </div>
            <div className="rounded-[calc(var(--radius)-4px)] border border-border bg-card px-4 py-3 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]">
              <div className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">Gözlem</div>
              <div className="font-baslik mt-1 text-2xl font-semibold tabular-nums text-foreground">{n}</div>
            </div>
          </div>
          <section className="rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4">
            <h3 className="font-baslik mb-2 text-base font-semibold text-foreground">Frekans tablosu</h3>
            <table className="w-full max-w-[560px] text-[13px] tabular-nums text-foreground">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="h-9 pr-4 font-bold">Kategori</th>
                  <th className="pr-4 text-right font-bold">Sayı</th>
                  <th className="pr-4 text-right font-bold">Göreli sıklık</th>
                  <th className="w-[40%] font-bold" aria-label="Oran çubuğu" />
                </tr>
              </thead>
              <tbody>
                {f.map((x, i) => (
                  <tr key={x.kategori} className={modlar.includes(x.kategori) ? 'bg-accent' : ''}>
                    <td className="h-9 pr-4">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                          <circle cx="6" cy="6" r="5.5" fill={kategoriRengi(x.kategori, i)} />
                        </svg>
                        {x.kategori}
                      </span>
                    </td>
                    <td className="pr-4 text-right">{x.sayi}</td>
                    <td className="pr-4 text-right">
                      {sayiYaz(x.oran, 3)} (%{sayiYaz(x.oran * 100, 1)})
                    </td>
                    <td>
                      <div className="h-3 rounded-full bg-muted">
                        <div className="h-3 rounded-full" style={{ width: `${x.oran * 100}%`, background: kategoriRengi(x.kategori, i) }} />
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border font-bold">
                  <td className="h-9 pr-4">Toplam</td>
                  <td className="pr-4 text-right">{n}</td>
                  <td className="pr-4 text-right">1 (%100)</td>
                  <td />
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-[13px] text-muted-foreground">Göreli sıklık = kategori sayısı ÷ gözlem sayısı. Deney sayısı arttıkça göreli sıklıklar kuramsal olasılığa yaklaşır.</p>
          </section>
          {anahtar && capraz && (
            <section className="mt-4 rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4" data-capraz-tablo>
              <h3 className="font-baslik mb-2 text-base font-semibold text-foreground">
                İki yönlü tablo{' '}
                <span className="text-muted-foreground">
                  ({sutunAdi} × {anahtar.ad})
                </span>
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-[360px] text-[13px] tabular-nums text-foreground">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="h-9 pr-4 font-bold">{sutunAdi}</th>
                      {anahtar.kategoriler.map((k) => (
                        <th key={k} className="pr-4 text-right font-bold">
                          <span className="inline-flex items-center gap-1.5">
                            <RenkNoktasi renk={anahtar.renkler.get(k)} />
                            {k}
                          </span>
                        </th>
                      ))}
                      {bosVar && <th className="pr-4 text-right font-bold">(boş)</th>}
                      <th className="text-right font-bold">Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capraz.map((c, i) => (
                      <tr key={c.kategori} className="border-t border-border">
                        <td className="h-9 pr-4">
                          <span className="inline-flex items-center gap-2 font-semibold">
                            <RenkNoktasi renk={kategoriRengi(c.kategori, i)} />
                            {c.kategori}
                          </span>
                        </td>
                        {c.sayilar.map((s, j) => (
                          <td key={anahtar.kategoriler[j]} className="pr-4 text-right">
                            {s}
                          </td>
                        ))}
                        {bosVar && <td className="pr-4 text-right">{c.bos}</td>}
                        <td className="text-right font-bold">{c.toplam}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-border font-bold">
                      <td className="h-9 pr-4">Toplam</td>
                      {anahtar.kategoriler.map((k, j) => (
                        <td key={k} className="pr-4 text-right">
                          {capraz.reduce((t, c) => t + c.sayilar[j], 0)}
                        </td>
                      ))}
                      {bosVar && <td className="pr-4 text-right">{capraz.reduce((t, c) => t + c.bos, 0)}</td>}
                      <td className="text-right">{n}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[13px] text-muted-foreground">
                Her hücre, iki değişkende de o kategoride olan gözlemlerin sayısıdır.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
