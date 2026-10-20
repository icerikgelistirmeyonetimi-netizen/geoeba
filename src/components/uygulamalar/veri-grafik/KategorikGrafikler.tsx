'use client';

/**
 * Kategorik (etiket türündeki) değişkenler için sütun grafiği ve istatistik paneli:
 * her kategori bir sıklık sütunu (sıklık ve %), sıklık tablosu (sıklık, göreli sıklık, merkez açı, tepe değer).
 * Daire grafiği için sıklıklardan türetilmiş tablo da buradan üretilir.
 * Renk anahtarı başka bir kategorik değişkense karşılaştırmalı sütun grafiği çizilir: her kategoride anahtarın
 * kategorileri yan yana birer sütun (üst üste yığılmaz); istatistikte anahtara göre sıklık tablosu (iki yönlü tablo).
 * Yüzdeler ve merkez açıları en büyük kalan yöntemiyle yuvarlanır: toplamları her zaman %100 ve 360°.
 * Sütun tepesinde sıklık ve yüzde nokta grafiğindeki gibi tek satırda ("9 · %45"); dar sütunda iki satır. Yan yana
 * sütunlarda ve `yuzdeGoster` kapalıyken (5. sınıf) yalnız sıklık yazılır. Eksenlerin ucunda ok vardır.
 * Sınıf düzeyi (sinifKurallari.ts) istatistikte tepe değeri, göreli sıklık ve merkez açı sütunlarını ve iki yönlü tablo
 * varken tek yönlü tabloyu kapatabilir. İlkokulda (`cetele`) sıklık tablosu çeteleyle birlikte çizilir: tek yönlü tabloda
 * çubuk yerine "Çetele" sütunu (sıklıktan önce), anahtara göre tabloda her hücrede çetele ve sayı.
 * Yazı ailesi uygulamanın geri kalanıyla aynı (Manrope); sayılar `sayiMetni` biçiminde.
 */
import React, { useMemo, useState } from 'react';
import {
  BOS_KATEGORI_RENGI,
  TEPE_DEGER_YOK,
  caprazSayim,
  frekanslar,
  kategoriRengi,
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
import { EksenOklari } from './EksenOklari';
import { Cetele } from './toplama/Cetele';

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
  /** Sütun tepesinde yüzde yazılsın mı (5. sınıfta yalnız sıklık; verilmezse yazılır) */
  yuzdeGoster?: boolean;
  /**
   * Koşullu göreli sıklık (lise 10. sınıf ve üstü, MAT.10.2.1): renk anahtarı varken sütunların boyu sayı değil, anahtarın
   * her grubunun içindeki yüzdedir (her grubun sütunları toplamı %100); dikey eksen 0–100.
   */
  kosulluYuzde?: boolean;
}

/** İki yönlü sayımda anahtarın her grubunun (sütununun) toplamı: koşullu göreli sıklığın paydası */
export function grupToplamlari(capraz: readonly { sayilar: number[]; bos: number }[]): { sayilar: number[]; bos: number } {
  const sayilar: number[] = [];
  let bos = 0;
  for (const c of capraz) {
    c.sayilar.forEach((x, j) => (sayilar[j] = (sayilar[j] ?? 0) + x));
    bos += c.bos;
  }
  return { sayilar, bos };
}

/** Yüzde ekseni (koşullu göreli sıklık): 0–100, 20'şer */
const YUZDE_EKSENI = { min: 0, max: 100, adim: 20, isaretler: [0, 20, 40, 60, 80, 100] };

const SOL = 56;
const SAG = 16;
const UST = 30;
const ALT = 56;

export function KategorikSutunGrafigi({ tablo, sutun, sira, genislik, yukseklik, azaltilmisHareket, renkEslemi = null, yEnAz, bosIpucu, yuzdeGoster = true, kosulluYuzde = false }: KategorikSutunProps) {
  // Gerçek piksel: viewBox kabın ölçüsüdür, küçültme yok
  const W = Math.max(0, genislik);
  const H = Math.max(0, yukseklik);
  const alanG = Math.max(0, W - SOL - SAG);
  const f = useMemo(() => kategorikFrekanslar(tablo, sutun, sira), [tablo, sutun, sira]);
  const n = f.reduce((t, x) => t + x.sayi, 0);
  const anahtar = farkliAnahtar(renkEslemi, tablo, sutun);
  const capraz = useMemo(() => (anahtar ? caprazSayim(tablo, sutun, anahtar, sira) : null), [anahtar, tablo, sutun, sira]);
  /** Yan yana sütunların sayısı: anahtarın kategorileri (+ anahtarı boş satırlar varsa bir "(boş)" sütunu) */
  const bosVar = capraz?.some((c) => c.bos > 0) ?? false;
  const yanSayisi = anahtar ? anahtar.kategoriler.length + (bosVar ? 1 : 0) : 1;
  // Ölçek: yan yana sütunlarda en uzun parça, tek sütunda en çok sıklık
  const enCok = capraz ? capraz.reduce((m, c) => Math.max(m, ...c.sayilar, c.bos), 0) : f.reduce((m, x) => Math.max(m, x.sayi), 0);
  const hucreG = alanG / Math.max(f.length, 1);
  const sutunG = Math.max(8, Math.min(hucreG * 0.66, 96));
  /** Yan yana sütunlardan her birinin genişliği (aralarında 2 px) */
  const yanG = Math.max(4, Math.min((hucreG * 0.8 - (yanSayisi - 1) * 2) / yanSayisi, 64));
  const gecis = azaltilmisHareket ? 'none' : `transform 300ms ${GECIS}`;
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '';
  // Kategori adları hücreye sığmıyorsa eğik yazılır; eğik etiket için alt boşluk büyür (en çok 96 px)
  const enUzunKategori = f.reduce((m, x) => Math.max(m, x.kategori.length), 0);
  const egik = hucreG < 64 || Math.min(enUzunKategori, 12) * 7.4 + 10 > hucreG;
  const altBosluk = egik ? Math.min(96, Math.max(ALT, 24 + Math.min(enUzunKategori, 12) * 7.4 * 0.58 + 10)) : ALT;
  const taban = Math.max(UST + 1, H - altBosluk);
  // Tam sayı çentikli sıklık ekseni; en yüksek sütunun üstünde sıklık ve yüzde etiketi için pay kalır
  /** Koşullu göreli sıklık: anahtarın her grubunda yüzde (grubun toplamı payda); grup boşsa 0 */
  const kosullu = kosulluYuzde && !!capraz;
  const toplamlar = useMemo(() => (capraz ? grupToplamlari(capraz) : null), [capraz]);
  const grupYuzdesi = (sayi: number, j: number, bosMu: boolean) => {
    const payda = bosMu ? toplamlar?.bos ?? 0 : toplamlar?.sayilar[j] ?? 0;
    return payda > 0 ? (sayi / payda) * 100 : 0;
  };
  const eksen = kosullu
    ? YUZDE_EKSENI
    : siklikEkseni(enCok > 0 ? Math.ceil(enCok * 1.15) : 0, Math.max(3, Math.floor((taban - UST) / 44)), yEnAz ?? 0);
  const olcek = dogrusalOlcek(0, kosullu ? 112 : eksen.max, taban, UST);
  const { yuzdeler } = yuzdeVeAcilar(f.map((x) => x.sayi));
  // Eksen adının yanında veri sayısı yazılmaz (uzman incelemesi, 4. tur: eskiden "Aday · sıklık (20 veri)")
  const baslik = kosullu ? `Grup içinde yüzde` : `Sıklık`;
  const yuzdeSigar = hucreG >= 44;
  const yuzdeli = yuzdeGoster && !anahtar;

  return (
    <svg
      data-grafik="sutun"
      role="img"
      aria-label={kosullu ? `${sutunAdi}: ${anahtar?.ad ?? ''} gruplarında koşullu göreli sıklıklar` : `${sutunAdi} kategori sıklıkları`}
      data-kosullu-yuzde={kosullu ? '' : undefined}
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
            {kosullu ? `%${sayiMetni(v)}` : sayiMetni(v)}
          </text>
        </g>
      ))}
      <line x1={SOL} x2={SOL} y1={UST} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      <EksenOklari x={SOL} ustY={UST} y={taban} sagX={W - SAG} />
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
        {kosullu ? 'Yüzde' : 'Sıklık'}
      </text>
      <text x={SOL} y={16} fontSize={13} fontWeight={700} fill={RENK.metin}>
        {baslik}
      </text>
      <text x={W - SAG} y={H - 6} textAnchor="end" fontSize={13} fontWeight={700} fill={RENK.metin} data-eksen-adi="yatay">{sutunAdi}</text>
      {anahtar && (
        <RenkLejanti
          eslem={anahtar}
          x={SOL + baslik.length * 7.4 + 24}
          y={16}
          sagSinir={W - SAG}
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
        // Karşılaştırma: anahtarın kategorileri yan yana birer sütun (anahtar sırasıyla; anahtarı boş satırlar en sağda gri)
        const satir = capraz?.find((c) => c.kategori === x.kategori);
        const parcalar: { ad: string; sayi: number; renk: string; j: number; deger: number }[] = [];
        if (anahtar && satir) {
          satir.sayilar.forEach((c, j) => {
            const ad = anahtar.kategoriler[j];
            parcalar.push({ ad, sayi: c, renk: anahtar.renkler.get(ad) ?? BOS_KATEGORI_RENGI, j, deger: kosullu ? grupYuzdesi(c, j, false) : c });
          });
          if (bosVar)
            parcalar.push({ ad: '(boş)', sayi: satir.bos, renk: BOS_KATEGORI_RENGI, j: anahtar.kategoriler.length, deger: kosullu ? grupYuzdesi(satir.bos, 0, true) : satir.bos });
        }
        const dokum = parcalar.length > 0 ? ` · ${parcalar.map((p) => `${p.ad} ${p.sayi}`).join(', ')}` : '';
        const yuzde = yuzdeler[i] ?? 0;
        const tekSatir = yuzdeli ? `${x.sayi} · %${sayiMetni(yuzde, 1)}` : String(x.sayi);
        /** Sıklık ve yüzde: sığarsa tek satırda "9 · %45" (nokta grafiğindeki gibi), sığmazsa iki satır, çok darsa yalnız sıklık */
        const etiketDuzeni: 'tek' | 'iki' | 'sayi' = !yuzdeli ? 'sayi' : tekSatir.length * 7.4 <= hucreG - 6 ? 'tek' : yuzdeSigar ? 'iki' : 'sayi';
        /** Yan yana sütunların ilkinin sol kenarı (grup kategorinin ortasına hizalı) */
        const yanBas = cx - (yanSayisi * yanG + (yanSayisi - 1) * 2) / 2;
        return (
          <g key={x.kategori} data-siklik-sutunu={x.kategori} data-yukseklik={yuk.toFixed(2)}>
            <title>{`${x.kategori}: ${x.sayi}${yuzdeli ? ` (%${sayiMetni(yuzde, 1)})` : ''}${dokum}`}</title>
            {anahtar ? (
              parcalar.map((p) => {
                const px = yanBas + p.j * (yanG + 2);
                const boy = Math.max(0.001, taban - olcek.ileri(p.deger));
                const yazi = kosullu ? `%${sayiMetni(p.deger, 1)}` : String(p.sayi);
                return (
                  <g key={p.ad} data-yan-sutun={p.ad} data-sayi={p.sayi} data-yuzde={kosullu ? sayiMetni(p.deger, 1) : undefined}>
                    <title>{`${x.kategori} · ${anahtar.ad} ${p.ad}: ${p.sayi}${kosullu ? ` (${p.ad} grubunun %${sayiMetni(p.deger, 1)}’i)` : ''}`}</title>
                    <g style={{ transform: `translate(${px}px, ${taban}px) scaleY(${-boy})`, transition: gecis }}>
                      <rect
                        x={0}
                        y={0}
                        width={yanG}
                        height={1}
                        fill={p.renk}
                        stroke={kenarGerekir(p.renk) ? RENK.metin : undefined}
                        strokeWidth={kenarGerekir(p.renk) ? 1.5 : undefined}
                        vectorEffect={kenarGerekir(p.renk) ? 'non-scaling-stroke' : undefined}
                      />
                    </g>
                    {n > 0 && p.sayi > 0 && yanG >= (kosullu ? 30 : 12) && (
                      <text
                        x={px + yanG / 2}
                        y={taban - boy - 6}
                        fontSize={13}
                        fontWeight={800}
                        textAnchor="middle"
                        fill={RENK.metin}
                        style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}
                        data-yan-sutun-sayisi
                      >
                        {yazi}
                      </text>
                    )}
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
            {n > 0 && !anahtar && (
              <g style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}>
                {etiketDuzeni === 'tek' ? (
                  <text x={cx} y={taban - yuk - 7} fontSize={13} fontWeight={800} textAnchor="middle" fill={RENK.metin} data-siklik-yazisi={tekSatir}>
                    {x.sayi}
                    <tspan fontWeight={600} fill={RENK.solukMetin}>{` · %${sayiMetni(yuzde, 1)}`}</tspan>
                  </text>
                ) : etiketDuzeni === 'sayi' ? (
                  <text x={cx} y={taban - yuk - 7} fontSize={13} fontWeight={800} textAnchor="middle" fill={RENK.metin} data-siklik-yazisi={tekSatir}>
                    {x.sayi}
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
  /** Tepe değer kartı (5. sınıfta merkezi eğilim ölçüsü yok); verilmezse var */
  tepeDeger?: boolean;
  /** Göreli sıklık ve merkez açı sütunları ile yüzde notu (5. sınıfta yok); verilmezse var */
  oranlar?: boolean;
  /** İki yönlü tablo varken tek yönlü sıklık tablosu da gösterilsin mi (5. sınıfta yalnız iki yönlü); verilmezse evet */
  tekYonluIleBirlikte?: boolean;
  /** Çetele ve sıklık tablosu birlikte (ilkokul): tek yönlü tabloda çubuk yerine çetele, iki yönlüde hücrelerde çetele */
  cetele?: boolean;
  /** Başlıktaki değişken türü (sayısal değişkenin değerlerinin sıklığında "sayısal değişken"); verilmezse kategorik */
  turAdi?: string;
  /**
   * Koşullu göreli sıklıklar (lise 10. sınıf ve üstü, MAT.10.2.1): iki yönlü tablonun altında yüzdeli tablo; her sütunun
   * (anahtarın grubunun) ya da her satırın toplamı %100. Hangi toplamın payda olacağı tablonun üstünden seçilir.
   */
  kosullu?: boolean;
  /** Koşullu tablonun açılıştaki paydası: sütun toplamları (varsayılan) ya da satır toplamları */
  kosulluPayda?: KosulluPayda;
}

/** Koşullu göreli sıklığın paydası: anahtarın grubu (sütun) ya da gösterilen değişkenin kategorisi (satır) */
export type KosulluPayda = 'sutun' | 'satir';

/** "%68,8" (payda 0 ise "—") */
function kosulluMetin(sayi: number, payda: number): string {
  return payda > 0 ? `%${sayiMetni((sayi / payda) * 100, 1)}` : '—';
}

/** Sıklık tablosundaki çetelenin satır yüksekliği (px) */
const CETELE_BOYU = 22;

const KART = 'rounded-[calc(var(--radius)-4px)] border border-border bg-card px-4 py-3 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]';
const KART_BASLIGI = 'text-[13px] font-bold uppercase tracking-wide text-muted-foreground';

/** "7/24 ≈ 0,29 (%29,2)" — iki ondalıkta tam yazılabiliyorsa "=" */
function goreliSiklikMetni(sayi: number, n: number, yuzde: number): string {
  const oran = n > 0 ? sayi / n : 0;
  const tam = Math.abs(oran * 100 - Math.round(oran * 100)) < 1e-9;
  return `${sayi}/${n} ${tam ? '=' : 'yaklaşık'} ${sayiMetni(oran, 2)} (%${sayiMetni(yuzde, 1)})`;
}

export function KategorikIstatistik({
  tablo,
  sutun,
  sira,
  renkEslemi = null,
  deneyVerisi = false,
  tepeDeger = true,
  oranlar = true,
  tekYonluIleBirlikte = true,
  cetele = false,
  turAdi = 'kategorik değişken',
  kosullu = false,
  kosulluPayda = 'sutun',
}: KategorikIstatistikProps) {
  const [payda, setPayda] = useState<KosulluPayda>(kosulluPayda);
  const metinler = useMemo(() => sutunMetinleri(tablo, sutun).map((m) => m.deger), [tablo, sutun]);
  const f = useMemo(() => frekanslar(metinler, sira), [metinler, sira]);
  const tepe = useMemo(() => mod(metinler, sira), [metinler, sira]);
  const { yuzdeler } = useMemo(() => yuzdeVeAcilar(f.map((x) => x.sayi)), [f]);
  const n = metinler.length;
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '—';
  const enCok = f.reduce((m, x) => Math.max(m, x.sayi), 0);
  const anahtar = farkliAnahtar(renkEslemi, tablo, sutun);
  const capraz = useMemo(() => (anahtar ? caprazSayim(tablo, sutun, anahtar, sira) : null), [anahtar, tablo, sutun, sira]);
  const bosVar = capraz?.some((c) => c.bos > 0) ?? false;
  /** Tek yönlü sıklık tablosu: iki yönlü tablo varken sınıf düzeyi istemiyorsa (5. sınıf) çizilmez */
  const tekYonlu = !(anahtar && capraz) || tekYonluIleBirlikte;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-background p-4" data-kategorik-istatistik>
      <h2 className="mb-3 text-lg font-bold text-foreground">
        {sutunAdi} <span className="text-muted-foreground">{`· ${turAdi} · Veri sayısı: ${n}`}</span>
      </h2>
      {n === 0 ? (
        <p className="rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4 text-[13px] text-muted-foreground">Bu değişkende değer yok.</p>
      ) : (
        <>
          <div className={`mb-3 grid grid-cols-2 gap-3 ${tepeDeger ? 'md:grid-cols-3' : ''}`}>
            {tepeDeger && (
              <div className={KART} data-tepe-deger>
                <div className={KART_BASLIGI}>Tepe değer</div>
                <div className="mt-1 text-2xl font-extrabold text-foreground">{tepe.length > 0 ? tepe.join(' ve ') : 'yok'}</div>
                <div className="mt-0.5 text-[13px] text-muted-foreground">{tepe.length > 0 ? `en sık görülen (${enCok} kez)` : TEPE_DEGER_YOK}</div>
              </div>
            )}
            <div className={KART}>
              <div className={KART_BASLIGI}>Kategori sayısı</div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{f.filter((x) => x.sayi > 0).length}</div>
            </div>
            <div className={KART}>
              <div className={KART_BASLIGI}>Veri sayısı</div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{n}</div>
            </div>
          </div>
          {cetele && (
            <div className="grid gap-4 xl:grid-cols-2" data-ilkokul-tablolari data-capraz-tablo={anahtar ? "" : undefined}>
              {(['Çetele tablosu', 'Sıklık tablosu'] as const).map((baslik, tur) => (
                <section key={baslik} className="overflow-x-auto rounded-lg border border-border bg-card p-4" data-cetele-tablosu={tur === 0 ? '' : undefined} data-siklik-tablosu={tur === 1 ? '' : undefined}>
                  <h3 className="mb-2 text-base font-bold">{baslik}</h3>
                  <table className="w-full border-collapse text-sm tabular-nums">
                    <thead><tr><th className="border border-border px-3 py-2 text-left">{sutunAdi}</th>{(anahtar ? anahtar.kategoriler : ['Öğrenci']).map(k => <th key={k} className="border border-border px-3 py-2">{k}</th>)}</tr></thead>
                    <tbody>{f.map((x, i) => <tr key={x.kategori}><th className="border border-border px-3 py-2 text-left">{x.kategori}</th>{(anahtar && capraz ? capraz.find(c => c.kategori === x.kategori)?.sayilar ?? [] : [x.sayi]).map((sayi, j) => <td key={j} className="border border-border px-3 py-2 text-center">{tur === 0 ? <span data-cetele-hucresi><Cetele sayi={sayi} renk={kategoriRengi(x.kategori, i)} yukseklik={CETELE_BOYU} /></span> : sayi}</td>)}</tr>)}</tbody>
                  </table>
                </section>
              ))}
            </div>
          )}
          {!cetele && tekYonlu && (
          <section className="rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4" data-siklik-tablosu>
            <h3 className="mb-2 text-base font-bold text-foreground">{cetele ? 'Çetele ve sıklık tablosu' : 'Sıklık tablosu'}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] max-w-[720px] text-[13px] tabular-nums text-foreground">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="h-9 pr-4 font-bold">{sutunAdi}</th>
                    {cetele && <th className="pr-4 font-bold">Çetele</th>}
                    <th className="pr-4 text-right font-bold">Sıklık</th>
                    {oranlar && <th className="pr-4 text-right font-bold">Göreli sıklık</th>}

                    {!cetele && <th className="w-[28%] font-bold" aria-label={oranlar ? 'Yüzde çubuğu' : 'Sıklık çubuğu'} />}
                  </tr>
                </thead>
                <tbody>
                  {f.map((x, i) => (
                    <tr key={x.kategori} className={tepeDeger && tepe.includes(x.kategori) ? 'bg-accent' : ''} data-tepe-satiri={tepeDeger && tepe.includes(x.kategori) ? '' : undefined}>
                      <td className="h-9 pr-4">
                        <span className="inline-flex items-center gap-2 font-semibold">
                          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                            <circle cx="6" cy="6" r="5.5" fill={kategoriRengi(x.kategori, i)} />
                          </svg>
                          {x.kategori}
                        </span>
                      </td>
                      {cetele && (
                        <td className="pr-4 py-1" data-cetele-hucresi>
                          <Cetele sayi={x.sayi} renk={kategoriRengi(x.kategori, i)} yukseklik={CETELE_BOYU} />
                        </td>
                      )}
                      <td className="pr-4 text-right">{x.sayi}</td>
                      {oranlar && <td className="whitespace-nowrap pr-4 text-right">{goreliSiklikMetni(x.sayi, n, yuzdeler[i] ?? 0)}</td>}

                      {!cetele && (
                        <td>
                          <div className="h-3 rounded-full bg-muted">
                            <div className="h-3 rounded-full" style={{ width: `${x.oran * 100}%`, background: kategoriRengi(x.kategori, i) }} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="border-t border-border font-bold">
                    <td className="h-9 pr-4">Toplam</td>
                    {cetele && <td />}
                    <td className="pr-4 text-right">{n}</td>
                    {oranlar && <td className="whitespace-nowrap pr-4 text-right">{`${n}/${n} = 1 (%100)`}</td>}

                    {!cetele && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
            {oranlar && (
              <p className="mt-3 text-[13px] text-muted-foreground" data-siklik-notu>
                Göreli sıklık, bir sonucun görülme sayısının toplam deneme sayısına oranıdır.
                {deneyVerisi && ' Atış sayısı arttıkça göreli sıklıklar teorik olasılığa yaklaşır.'}
              </p>
            )}
          </section>
          )}
          {!cetele && anahtar && capraz && (
            <section className={`${tekYonlu ? 'mt-4 ' : ''}rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4`} data-capraz-tablo>
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
                            {cetele ? (
                              // İlkokul: hücrede çetele ve sayı (sayı sağda hizalı kalır)
                              <span className="inline-flex items-center justify-end gap-2 py-1" data-cetele-hucresi>
                                <Cetele sayi={s} renk={anahtar.renkler.get(anahtar.kategoriler[j])} yukseklik={CETELE_BOYU} />
                                <span className="min-w-[1.5em]">{s}</span>
                              </span>
                            ) : (
                              s
                            )}
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
          {!cetele && kosullu && anahtar && capraz && (() => {
            const gt = grupToplamlari(capraz);
            const sutunlar = [
              ...anahtar.kategoriler.map((k, j) => ({ ad: k, renk: anahtar.renkler.get(k), deger: (c: (typeof capraz)[number]) => c.sayilar[j], toplam: gt.sayilar[j] ?? 0 })),
              ...(bosVar ? [{ ad: '(boş)', renk: BOS_KATEGORI_RENGI, deger: (c: (typeof capraz)[number]) => c.bos, toplam: gt.bos }] : []),
            ];
            return (
              <section className="mt-4 rounded-[calc(var(--radius)-4px)] border border-border bg-card p-4" data-kosullu-tablo={payda}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-foreground">Koşullu göreli sıklıklar</h3>
                  <div role="radiogroup" aria-label="Yüzdenin paydası" className="inline-flex gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-0.5">
                    {([['sutun', `Her ${anahtar.ad} grubunda`], ['satir', `Her ${sutunAdi} kategorisinde`]] as const).map(([d, ad]) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={payda === d}
                        className={`h-11 rounded-[calc(var(--radius)-8px)] px-3 text-[13px] font-bold ${payda === d ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        onClick={() => setPayda(d)}
                        data-kosullu-payda={d}
                      >
                        {ad}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[360px] text-[13px] tabular-nums text-foreground">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="h-9 pr-4 font-bold">{sutunAdi}</th>
                        {sutunlar.map((k) => (
                          <th key={k.ad} className="pr-4 text-right font-bold">
                            <span className="inline-flex items-center gap-1.5">
                              <RenkNoktasi renk={k.renk} />
                              {k.ad}
                            </span>
                          </th>
                        ))}
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
                          {sutunlar.map((k) => (
                            <td key={k.ad} className="pr-4 text-right" data-kosullu-hucre={`${c.kategori}|${k.ad}`}>
                              {kosulluMetin(k.deger(c), payda === 'sutun' ? k.toplam : c.toplam)}
                            </td>
                          ))}
                          <td className="text-right font-bold">{kosulluMetin(c.toplam, payda === 'sutun' ? n : c.toplam)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-border font-bold">
                        <td className="h-9 pr-4">Toplam</td>
                        {sutunlar.map((k) => (
                          <td key={k.ad} className="pr-4 text-right">
                            {kosulluMetin(k.toplam, payda === 'sutun' ? k.toplam : n)}
                          </td>
                        ))}
                        <td className="text-right">%100</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[13px] text-muted-foreground" data-kosullu-notu>
                  {payda === 'sutun'
                    ? `Her sütunun toplamı %100: Bir ${anahtar.ad} grubundaki verilerin yüzde kaçının o ${sutunAdi} kategorisinde olduğu. Gruplar farklı büyüklükteyse karşılaştırma bu yüzdelerle yapılır.`
                    : `Her satırın toplamı %100: Bir ${sutunAdi} kategorisindeki verilerin yüzde kaçının o ${anahtar.ad} grubunda olduğu.`}
                </p>
              </section>
            );
          })()}
        </>
      )}
    </div>
  );
}
