'use client';

/**
 * Kategorik (etiket türündeki) değişkenler için sütun grafiği ve istatistik paneli:
 * her kategori bir sıklık sütunu (sıklık ve %), sıklık tablosu (sıklık, göreli sıklık, merkez açı, tepe değer).
 * Daire grafiği için sıklıklardan türetilmiş tablo da buradan üretilir.
 * Renk anahtarı başka bir kategorik değişkense sütunlar onun kategorilerine göre yığılır ve istatistikte
 * anahtara göre sıklık tablosu (iki yönlü tablo) gösterilir.
 * Yüzdeler ve merkez açıları en büyük kalan yöntemiyle yuvarlanır: toplamları her zaman %100 ve 360°.
 * Sütun tepesinde sıklık ve yüzde nokta grafiğindeki gibi tek satırda ("9 · %45"); dar sütunda iki satır.
 * Yazı ailesi uygulamanın geri kalanıyla aynı (Manrope); sayılar `sayiMetni` biçiminde.
 */
import React, { useMemo } from 'react';
import {
  BOS_KATEGORI_RENGI,
  TEPE_DEGER_YOK,
  caprazSayim,
  frekanslar,
  kategoriRengi,
  kategoriSayilari,
  kenarGerekir,
  mod,
  sutunMetinleri,
  yonelmeEkli,
  type Frekans,
  type RenkEslemesi,
} from './kategorik';
import { dogrusalOlcek, enBuyukKalanlaYuvarla, siklikEkseni } from './grafik';
import { sayiMetni } from './istatistik';
import type { VeriTablosu } from './veri';
import { GECIS, RENK, RenkNoktasi } from './grafikOrtak';
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

/** Daire grafiği için: kategori → sıklık tablosu */
export function frekansTablosu(f: Frekans[], ad: string): VeriTablosu {
  return {
    sutunlar: [
      { id: 'kat', ad: 'Kategori', tur: 'etiket' },
      { id: 'frekans', ad, tur: 'sayi' },
    ],
    satirlar: f.map((x) => ({ id: `kat-${x.kategori}`, hucreler: [x.kategori, String(x.sayi)] })),
  };
}

/** Sıklıklardan yüzdeler (0,1 adım) ve merkez açıları (1° adım): toplamları %100 ve 360° */
export function yuzdeVeAcilar(sayilar: readonly number[]): { yuzdeler: number[]; acilar: number[] } {
  const toplam = sayilar.reduce((t, s) => t + s, 0);
  if (toplam <= 0) return { yuzdeler: sayilar.map(() => 0), acilar: sayilar.map(() => 0) };
  return { yuzdeler: enBuyukKalanlaYuvarla(sayilar, 0.1, 100), acilar: enBuyukKalanlaYuvarla(sayilar, 1, 360) };
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
  /** Sıklık ekseninin üst sınırı en az bu kadar (toplama sürerken yalnız büyür; sütunlar sabit çerçevede uzar) */
  yEnAz?: number;
  /** Veri yokken eksen çizilir ve ortasında bu ipucu yazar ("İlk cevapla …") */
  bosIpucu?: string;
}

const SOL = 56;
const SAG = 16;
const UST = 30;
const ALT = 56;

export function KategorikSutunGrafigi({ tablo, sutun, sira, genislik, yukseklik, azaltilmisHareket, renkEslemi = null, yEnAz, bosIpucu }: KategorikSutunProps) {
  // Gerçek piksel: viewBox kabın ölçüsüdür, küçültme yok
  const W = Math.max(0, genislik);
  const H = Math.max(0, yukseklik);
  const alanG = Math.max(0, W - SOL - SAG);
  const f = useMemo(() => kategorikFrekanslar(tablo, sutun, sira), [tablo, sutun, sira]);
  const n = f.reduce((t, x) => t + x.sayi, 0);
  const enCok = f.reduce((m, x) => Math.max(m, x.sayi), 0);
  const hucreG = alanG / Math.max(f.length, 1);
  const sutunG = Math.max(8, Math.min(hucreG * 0.66, 96));
  const gecis = azaltilmisHareket ? 'none' : `transform 300ms ${GECIS}`;
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '';
  // Kategori adları hücreye sığmıyorsa eğik yazılır; eğik etiket için alt boşluk büyür (en çok 96 px)
  const enUzunKategori = f.reduce((m, x) => Math.max(m, x.kategori.length), 0);
  const egik = hucreG < 64 || Math.min(enUzunKategori, 12) * 7.4 + 10 > hucreG;
  const altBosluk = egik ? Math.min(96, Math.max(ALT, 24 + Math.min(enUzunKategori, 12) * 7.4 * 0.58 + 10)) : ALT;
  const taban = Math.max(UST + 1, H - altBosluk);
  // Tam sayı çentikli sıklık ekseni; en yüksek sütunun üstünde sıklık ve yüzde etiketi için pay kalır
  const eksen = siklikEkseni(enCok > 0 ? Math.ceil(enCok * 1.15) : 0, Math.max(3, Math.floor((taban - UST) / 44)), yEnAz ?? 0);
  const olcek = dogrusalOlcek(0, eksen.max, taban, UST);
  const anahtar = farkliAnahtar(renkEslemi, tablo, sutun);
  const capraz = useMemo(() => (anahtar ? caprazSayim(tablo, sutun, anahtar, sira) : null), [anahtar, tablo, sutun, sira]);
  const { yuzdeler } = yuzdeVeAcilar(f.map((x) => x.sayi));
  const baslik = `${sutunAdi} · sıklık (${n} veri)`;
  const yuzdeSigar = hucreG >= 44;

  return (
    <svg
      data-grafik="sutun"
      role="img"
      aria-label={`${sutunAdi} kategori sıklıkları`}
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
            {sayiMetni(v)}
          </text>
        </g>
      ))}
      <line x1={SOL} x2={SOL} y1={UST} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      {/* Dikey eksenin adı */}
      <text
        x={15}
        y={(UST + taban) / 2}
        fontSize={13}
        fontWeight={700}
        textAnchor="middle"
        fill={RENK.solukMetin}
        transform={`rotate(-90 15 ${(UST + taban) / 2})`}
        data-eksen-adi="dikey"
      >
        Sıklık
      </text>
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
      {n === 0 && (
        <text x={SOL + alanG / 2} y={(UST + taban) / 2} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin} data-bos-ipucu={bosIpucu ? '' : undefined}>
          {bosIpucu ?? 'Bu değişkende değer yok'}
        </text>
      )}
      {f.map((x, i) => {
        const cx = SOL + hucreG * (i + 0.5);
        const yuk = Math.max(0, taban - olcek.ileri(x.sayi));
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
        const yuzde = yuzdeler[i] ?? 0;
        const tekSatir = `${x.sayi} · %${sayiMetni(yuzde, 1)}`;
        /** Sıklık ve yüzde: sığarsa tek satırda "9 · %45" (nokta grafiğindeki gibi), sığmazsa iki satır, çok darsa yalnız sıklık */
        const etiketDuzeni: 'tek' | 'iki' | 'sayi' = tekSatir.length * 7.4 <= hucreG - 6 ? 'tek' : yuzdeSigar ? 'iki' : 'sayi';
        return (
          <g key={x.kategori} data-siklik-sutunu={x.kategori} data-yukseklik={yuk.toFixed(2)}>
            <title>{`${x.kategori}: ${x.sayi} (%${sayiMetni(yuzde, 1)})${dokum}`}</title>
            {anahtar ? (
              parcalar.map((p, k) => {
                const altY = olcek.ileri(p.alt);
                // Üstteki parçayla arasında ince kart rengi aralık kalır (parçalar ayırt edilsin)
                const boy = Math.max(0.001, altY - olcek.ileri(p.alt + p.sayi) - (k < parcalar.length - 1 ? 1.5 : 0));
                return (
                  <g key={p.ad} style={{ transform: `translate(${cx - sutunG / 2}px, ${altY}px) scaleY(${-boy})`, transition: gecis }} data-yigin-parcasi={p.ad}>
                    <rect
                      x={0}
                      y={0}
                      width={sutunG}
                      height={1}
                      fill={p.renk}
                      stroke={kenarGerekir(p.renk) ? RENK.metin : undefined}
                      strokeWidth={kenarGerekir(p.renk) ? 1.5 : undefined}
                      vectorEffect={kenarGerekir(p.renk) ? 'non-scaling-stroke' : undefined}
                    />
                  </g>
                );
              })
            ) : (
              <g style={{ transform: `translate(${cx - sutunG / 2}px, ${taban}px) scaleY(${-Math.max(yuk, 0.001)})`, transition: gecis }}>
                <rect
                  x={0}
                  y={0}
                  width={sutunG}
                  height={1}
                  fill={renk}
                  fillOpacity={0.9}
                  stroke={kenarGerekir(renk) ? RENK.metin : undefined}
                  strokeWidth={kenarGerekir(renk) ? 1.5 : undefined}
                  vectorEffect={kenarGerekir(renk) ? 'non-scaling-stroke' : undefined}
                />
              </g>
            )}
            {n > 0 && (
              <g style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}>
                {etiketDuzeni === 'tek' ? (
                  <text x={cx} y={taban - yuk - 7} fontSize={13} fontWeight={800} textAnchor="middle" fill={RENK.metin} data-siklik-yazisi={tekSatir}>
                    {x.sayi}
                    <tspan fontWeight={600} fill={RENK.solukMetin}>{` · %${sayiMetni(yuzde, 1)}`}</tspan>
                  </text>
                ) : (
                  <>
                    <text x={cx} y={taban - yuk - (etiketDuzeni === 'iki' ? 22 : 7)} fontSize={13} fontWeight={800} textAnchor="middle" fill={RENK.metin}>
                      {x.sayi}
                    </text>
                    {etiketDuzeni === 'iki' && (
                      <text x={cx} y={taban - yuk - 7} fontSize={13} fontWeight={600} textAnchor="middle" fill={RENK.solukMetin}>
                        %{sayiMetni(yuzde, 1)}
                      </text>
                    )}
                  </>
                )}
              </g>
            )}
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
  /** Renk anahtarı: başka bir kategorik değişkense anahtara göre sıklık tablosu (iki yönlü tablo) gösterilir */
  renkEslemi?: RenkEslemesi | null;
  /** Veri bir deneyden geliyor (atışlar, deney özeti): not teorik olasılık cümlesini de içerir */
  deneyVerisi?: boolean;
}

const KART = 'rounded-[calc(var(--radius)-4px)] border border-border bg-card px-4 py-3 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]';
const KART_BASLIGI = 'text-[13px] font-bold uppercase tracking-wide text-muted-foreground';

/** "7/24 ≈ 0,29 (%29,2)" — iki ondalıkta tam yazılabiliyorsa "=" */
function goreliSiklikMetni(sayi: number, n: number, yuzde: number): string {
  const oran = n > 0 ? sayi / n : 0;
  const tam = Math.abs(oran * 100 - Math.round(oran * 100)) < 1e-9;
  return `${sayi}/${n} ${tam ? '=' : '≈'} ${sayiMetni(oran, 2)} (%${sayiMetni(yuzde, 1)})`;
}

/** "105°"; tam derece değilse "≈ 51°" */
function merkezAciMetni(sayi: number, n: number, aci: number): string {
  const tam = n > 0 ? (sayi * 360) / n : 0;
  return `${Math.abs(tam - Math.round(tam)) < 1e-9 ? '' : '≈ '}${aci}°`;
}

export function KategorikIstatistik({ tablo, sutun, sira, renkEslemi = null, deneyVerisi = false }: KategorikIstatistikProps) {
  const metinler = useMemo(() => sutunMetinleri(tablo, sutun).map((m) => m.deger), [tablo, sutun]);
  const f = useMemo(() => frekanslar(metinler, sira), [metinler, sira]);
  const tepe = useMemo(() => mod(metinler, sira), [metinler, sira]);
  const { yuzdeler, acilar } = useMemo(() => yuzdeVeAcilar(f.map((x) => x.sayi)), [f]);
  const n = metinler.length;
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '—';
  const enCok = f.reduce((m, x) => Math.max(m, x.sayi), 0);
  const anahtar = farkliAnahtar(renkEslemi, tablo, sutun);
  const capraz = useMemo(() => (anahtar ? caprazSayim(tablo, sutun, anahtar, sira) : null), [anahtar, tablo, sutun, sira]);
  const bosVar = capraz?.some((c) => c.bos > 0) ?? false;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-background p-4" data-kategorik-istatistik>
      <h2 className="mb-3 text-lg font-bold text-foreground">
        {sutunAdi} <span className="text-muted-foreground">{`· kategorik değişken · Veri sayısı: ${n}`}</span>
      </h2>
      {n === 0 ? (
        <p className="rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4 text-[13px] text-muted-foreground">Bu değişkende değer yok.</p>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className={KART} data-tepe-deger>
              <div className={KART_BASLIGI}>Tepe değer</div>
              <div className="mt-1 text-2xl font-extrabold text-foreground">{tepe.length > 0 ? tepe.join(' ve ') : 'yok'}</div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">{tepe.length > 0 ? `en sık görülen (${enCok} kez)` : TEPE_DEGER_YOK}</div>
            </div>
            <div className={KART}>
              <div className={KART_BASLIGI}>Kategori sayısı</div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{f.filter((x) => x.sayi > 0).length}</div>
            </div>
            <div className={KART}>
              <div className={KART_BASLIGI}>Veri sayısı</div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{n}</div>
            </div>
          </div>
          <section className="rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4" data-siklik-tablosu>
            <h3 className="mb-2 text-base font-bold text-foreground">Sıklık tablosu</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] max-w-[720px] text-[13px] tabular-nums text-foreground">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="h-9 pr-4 font-bold">{sutunAdi}</th>
                    <th className="pr-4 text-right font-bold">Sıklık</th>
                    <th className="pr-4 text-right font-bold">Göreli sıklık</th>
                    <th className="pr-4 text-right font-bold">Merkez açı</th>
                    <th className="w-[28%] font-bold" aria-label="Yüzde çubuğu" />
                  </tr>
                </thead>
                <tbody>
                  {f.map((x, i) => (
                    <tr key={x.kategori} className={tepe.includes(x.kategori) ? 'bg-accent' : ''} data-tepe-satiri={tepe.includes(x.kategori) ? '' : undefined}>
                      <td className="h-9 pr-4">
                        <span className="inline-flex items-center gap-2 font-semibold">
                          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                            <circle cx="6" cy="6" r="5.5" fill={kategoriRengi(x.kategori, i)} />
                          </svg>
                          {x.kategori}
                        </span>
                      </td>
                      <td className="pr-4 text-right">{x.sayi}</td>
                      <td className="whitespace-nowrap pr-4 text-right">{goreliSiklikMetni(x.sayi, n, yuzdeler[i] ?? 0)}</td>
                      <td className="whitespace-nowrap pr-4 text-right">{merkezAciMetni(x.sayi, n, acilar[i] ?? 0)}</td>
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
                    <td className="whitespace-nowrap pr-4 text-right">{`${n}/${n} = 1 (%100)`}</td>
                    <td className="pr-4 text-right">360°</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[13px] text-muted-foreground" data-siklik-notu>
              Yüzde = sıklık ÷ toplam × 100. Tüm yüzdelerin toplamı %100.
              {deneyVerisi && ' Atış sayısı arttıkça göreli sıklıklar teorik olasılığa yaklaşır.'}
            </p>
          </section>
          {anahtar && capraz && (
            <section className="mt-4 rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4" data-capraz-tablo>
              <h3 className="mb-2 text-base font-bold text-foreground" title={`İki yönlü tablo: ${sutunAdi} × ${anahtar.ad}`}>
                {yonelmeEkli(anahtar.ad)} göre sıklık tablosu
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
                Her hücre, iki değişkende de o kategoride olan verilerin sayısıdır ({sutunAdi} ve {anahtar.ad}).
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
