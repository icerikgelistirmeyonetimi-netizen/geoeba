'use client';

/**
 * Değer sütunları: her satır bir sütun (etiket + değer). Sütunun tepesinden sürükleyince tablo anında
 * güncellenir (yuvarlama adımı 1 / 0,5 / 0,1). Y ekseni otomatik "güzel" aralıklarla (tam sayılı veride yarım
 * çentik yok); sürükleme sırasında eksen dondurulur ki sütun işaretçinin altında kaymasın. Aynı değişkende eksen
 * penceresi yalnız genişler: Feyza'nın sütunu 60'tan 20'ye indirilince eksen daralıp öteki sütunları büyütmez.
 * Klavye: grafik tek Tab durağıdır; ← → sütunlar arasında gezer, ↑ ↓ değeri bir adım değiştirir, Enter seçer.
 * Seçim çerçevesi, tutamaçlar ve odak halkası yalnız ekrandadır (`data-yalniz-ekran`; PNG'ye çıkmaz).
 * Sayılar öteki grafiklerle aynı biçimde yazılır (`sayiMetni`: bölük boşluğu, gerçek eksi "−9,1"). Eksi değerli
 * sütunun altında değer yazısına yer kalır: yazı kategori adının üstüne binmez.
 */
import React, { useMemo, useRef, useState } from 'react';
import { guzelEksen, sayiMetni, type Eksen } from './istatistik';
import { adimOndalik, dogrusalOlcek, gosterimOndaligi, pencereyiGuncelle, surukleDegeri, tamSayiliMi, type EksenPenceresi } from './grafik';
import { gecerliDegerler, satirEtiketi, type VeriTablosu } from './veri';
import { GECIS, RENK, svgKonumu } from './grafikOrtak';
import { kategoriSayilari, kenarGerekir, satirRengi, type RenkEslemesi } from './kategorik';
import { RenkLejanti } from './RenkLejanti';

export interface SutunGrafigiProps {
  tablo: VeriTablosu;
  sutun: number;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  onDegerDegis: (satir: number, sutun: number, deger: number, ondalik: number) => void;
  yuvarlamaAdimi: number;
  genislik: number;
  yukseklik: number;
  azaltilmisHareket: boolean;
  /** Renk anahtarı: her sütun satırının kategorisine göre renklenir, lejant başlık satırında */
  renkEslemi?: RenkEslemesi | null;
}

const SOL = 56;
const SAG = 16;
const UST = 24;
const ALT = 56;
/** Bu genişlikten dar çubuklarda değer etiketi ve tutamaç çizilmez (1000 satırda okunmaz ve yavaşlatır) */
const DAR_SUTUN = 14;
/** Eğik kategori etiketleri arasında en az bu kadar yatay yer kalır; sıkışınca etiketler seyreltilir */
const EGIK_ETIKET_ARALIGI = 16;

/** Odak halkası yalnız klavyeyle odaklanınca görünür (fareyle tıklamada görünmez) */
const ODAK_STILI = '.vg-odak{display:none}.vg-odaklanir:focus-visible .vg-odak{display:inline}';

/**
 * Eksen üst sınırında sürükleme payı bırakır (en büyük değer tepeye yapışmasın). Eksi değer varsa alt sınırda da
 * aynı pay kalır: −9,1'in altındaki değer yazısı eksenin dışına, kategori adlarının üstüne taşmaz (−10 yerine −15).
 * `tamSayi` verilirse ve veri tam sayılıysa işaretler tam sayıdır: eksen 1,5 / 2,5 gibi yarım çentik yazmaz.
 */
export function payliEksen(min: number, max: number, hedef: number, tamSayi = false): Eksen {
  const alt = Math.min(0, min);
  const ust = Math.max(max, alt + Number.EPSILON);
  let e = guzelEksen(alt, ust, hedef);
  if (e.max - max < 0.12 * (e.max - e.min)) e = guzelEksen(alt, e.max + e.adim, hedef);
  if (min < 0 && min - e.min < 0.12 * (e.max - e.min)) e = guzelEksen(e.min - e.adim, e.max, hedef);
  if (!tamSayi || e.adim >= 1) return e;
  const a = Math.floor(e.min + 1e-9);
  const b = Math.max(a + 1, Math.ceil(e.max - 1e-9));
  return { min: a, max: b, adim: 1, isaretler: Array.from({ length: b - a + 1 }, (_, i) => a + i) };
}

export function SutunGrafigi({
  tablo,
  sutun,
  seciliSatir,
  onSatirSec,
  onDegerDegis,
  yuvarlamaAdimi,
  genislik,
  yukseklik,
  azaltilmisHareket,
  renkEslemi = null,
}: SutunGrafigiProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [surukle, setSurukle] = useState<{ satir: number; eksen: Eksen } | null>(null);
  const [ustunde, setUstunde] = useState<number | null>(null);
  /** Klavye gezinmesinin durduğu satır (tek Tab durağı) */
  const [odak, setOdak] = useState<number | null>(null);

  // Gerçek piksel: viewBox kabın ölçüsüdür, küçültme yok (yazılar 13 px kalır)
  const W = Math.max(0, genislik);
  const H = Math.max(0, yukseklik);
  const alanG = Math.max(0, W - SOL - SAG);

  const noktalar = useMemo(() => gecerliDegerler(tablo, sutun), [tablo, sutun]);
  const degerler = useMemo(() => noktalar.map((n) => n.deger), [noktalar]);
  const adet = Math.max(noktalar.length, 1);
  const hucreG = alanG / adet;
  // Etiketler hücreye sığmıyorsa (13 px yazıda harf başına ~7,4 px) eğik yazılır ve 12 harfte kısaltılır;
  // eğik etiket daha çok dikey yer ister: alt boşluk etiket uzunluğuna göre büyür (en çok 96 px)
  const enUzunEtiket = noktalar.reduce((m, n) => Math.max(m, satirEtiketi(tablo, n.satir).length), 0);
  const etiketEgik = hucreG < 64 || Math.min(enUzunEtiket, 12) * 7.4 + 10 > hucreG;
  const altBosluk = etiketEgik ? Math.min(96, Math.max(ALT, 24 + Math.min(enUzunEtiket, 12) * 7.4 * 0.58 + 10)) : ALT;
  const taban = Math.max(UST + 1, H - altBosluk);
  const tamSayi = tamSayiliMi(degerler);
  /** Eksen penceresi (değer uzayında): aynı sütunda yalnız genişler; sütun değişince, veri boşalınca ya da çok daralınca sıfırlanır */
  const pencereRef = useRef<EksenPenceresi | null>(null);
  const sutunKimligi = tablo.sutunlar[sutun]?.id ?? String(sutun);
  const canliEksen = useMemo(() => {
    if (degerler.length === 0) {
      pencereRef.current = null;
      return payliEksen(0, 10, 5, true);
    }
    let en = -Infinity;
    let ek = Infinity;
    for (const d of degerler) {
      if (d > en) en = d;
      if (d < ek) ek = d;
    }
    const pencere = pencereyiGuncelle(pencereRef.current, sutunKimligi, ek, en);
    pencereRef.current = pencere;
    return payliEksen(pencere.min, pencere.max, Math.max(3, Math.floor((taban - UST) / 44)), tamSayi);
  }, [degerler, taban, tamSayi, sutunKimligi]);
  const eksen = surukle ? surukle.eksen : canliEksen;
  const olcek = dogrusalOlcek(eksen.min, eksen.max, taban, UST);
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '';
  const ondalik = adimOndalik(yuvarlamaAdimi);
  const degerOndaligi = gosterimOndaligi(degerler);
  const isaretOndaligi = gosterimOndaligi(eksen.isaretler);

  const sutunG = Math.max(1, Math.min(hucreG * 0.66, 72));
  const dar = sutunG < DAR_SUTUN;
  const etiketAdimi = etiketEgik ? Math.max(1, Math.ceil(EGIK_ETIKET_ARALIGI / Math.max(hucreG, 0.01))) : 1;
  const gecis = azaltilmisHareket || surukle || noktalar.length > 200 ? 'none' : `transform 300ms ${GECIS}`;
  const anahtar = renkEslemi && renkEslemi.sutun !== sutun ? renkEslemi : null;
  // Yatay eksenin adı: etiketler tablonun ilk sütunundan gelir ("Etkinlik", "Ay" …)
  const yatayAd = sutun !== 0 && !etiketEgik ? tablo.sutunlar[0]?.ad ?? '' : '';

  const satirlar = noktalar.map((n) => n.satir);
  const sekmeDuragi =
    odak !== null && satirlar.includes(odak) ? odak : seciliSatir !== null && satirlar.includes(seciliSatir) ? seciliSatir : satirlar[0] ?? null;

  const odakla = (satir: number) => {
    setOdak(satir);
    svgRef.current?.querySelector<SVGGElement>(`[data-tutamak-satir="${satir}"]`)?.focus();
  };

  const isaretciHareket = (e: React.PointerEvent<SVGElement>) => {
    if (!surukle || !svgRef.current) return;
    const { y } = svgKonumu(svgRef.current, e.clientX, e.clientY);
    const o = dogrusalOlcek(surukle.eksen.min, surukle.eksen.max, taban, UST);
    const deger = surukleDegeri(y, o, yuvarlamaAdimi, surukle.eksen.min, surukle.eksen.max);
    onDegerDegis(surukle.satir, sutun, deger, ondalik);
  };

  const surukleBaslat = (e: React.PointerEvent<SVGElement>, satir: number) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setSurukle({ satir, eksen: canliEksen });
    setOdak(satir);
    onSatirSec(satir);
  };

  const surukleBitir = (e: React.PointerEvent<SVGElement>) => {
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    setSurukle(null);
  };

  const klavye = (e: React.KeyboardEvent, i: number, satir: number, deger: number) => {
    let fark = 0;
    switch (e.key) {
      case 'ArrowUp':
        fark = yuvarlamaAdimi;
        break;
      case 'ArrowDown':
        fark = -yuvarlamaAdimi;
        break;
      case 'ArrowRight':
      case 'ArrowLeft': {
        e.preventDefault();
        const hedef = i + (e.key === 'ArrowRight' ? 1 : -1);
        if (hedef >= 0 && hedef < noktalar.length) odakla(noktalar[hedef].satir);
        return;
      }
      case 'Home':
      case 'End':
        e.preventDefault();
        if (noktalar.length > 0) odakla(noktalar[e.key === 'Home' ? 0 : noktalar.length - 1].satir);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSatirSec(seciliSatir === satir ? null : satir);
        return;
      default:
        return;
    }
    e.preventDefault();
    onDegerDegis(satir, sutun, deger + fark, ondalik);
  };

  return (
    <svg
      ref={svgRef}
      data-grafik="sutun"
      role="img"
      aria-label={`${sutunAdi} değer sütunları`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif', touchAction: 'none' }}
    >
      <style>{ODAK_STILI}</style>
      {/* Izgara ve Y ekseni */}
      {eksen.isaretler.map((v) => (
        <g key={v}>
          <line x1={SOL} x2={W - SAG} y1={olcek.ileri(v)} y2={olcek.ileri(v)} stroke={RENK.izgara} strokeWidth={1} />
          <text x={SOL - 8} y={olcek.ileri(v) + 4} fontSize={13} textAnchor="end" fill={RENK.metin}>
            {sayiMetni(v, isaretOndaligi)}
          </text>
        </g>
      ))}
      <line x1={SOL} x2={SOL} y1={UST} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      <line x1={SOL} x2={W - SAG} y1={olcek.ileri(0)} y2={olcek.ileri(0)} stroke={RENK.metin} strokeWidth={1.5} />
      <text x={SOL} y={14} fontSize={13} fontWeight={700} fill={RENK.metin}>
        {sutunAdi}
      </text>
      {yatayAd && (
        <text x={W - SAG} y={taban + 40} fontSize={13} fontWeight={700} textAnchor="end" fill={RENK.metin} data-eksen-adi="yatay">
          {yatayAd}
        </text>
      )}
      {anahtar && (
        <RenkLejanti
          eslem={anahtar}
          x={SOL + sutunAdi.length * 7.4 + 24}
          y={14}
          sagSinir={W - SAG}
          sayilar={kategoriSayilari(anahtar, satirlar)}
        />
      )}

      {noktalar.length === 0 && (
        <text x={SOL + alanG / 2} y={(UST + taban) / 2} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Bu değişkende sayısal değer yok
        </text>
      )}

      {noktalar.map((n, i) => {
        const cx = SOL + hucreG * (i + 0.5);
        const x = cx - sutunG / 2;
        const sifir = olcek.ileri(0);
        const tepe = olcek.ileri(n.deger);
        const yuk = Math.abs(sifir - tepe);
        const secili = seciliSatir === n.satir;
        const aktif = secili || ustunde === n.satir || surukle?.satir === n.satir;
        const anahtarRengi = anahtar ? satirRengi(anahtar, n.satir) : undefined;
        const etiket = satirEtiketi(tablo, n.satir);
        const surukleniyor = surukle?.satir === n.satir;
        const etiketGoster = secili || i % etiketAdimi === 0;
        const dolgu = anahtarRengi ?? RENK.birincil;
        /**
         * Değer yazısının yeri: artıda sütunun üstünde; eksi değerde sütunun altında. Altında kategori adına binecekse
         * (alçak grafik) sütunun içinde ucunda, sütun kısaysa sıfır çizgisinin üstünde.
         */
        const yaziYeri: 'ust' | 'alt' | 'ic' | 'sifir' = n.deger >= 0 ? 'ust' : tepe + 18 <= taban + 3 ? 'alt' : yuk >= 22 ? 'ic' : 'sifir';
        const yaziY = yaziYeri === 'ust' ? tepe - 9 : yaziYeri === 'alt' ? tepe + 18 : yaziYeri === 'ic' ? tepe - 6 : sifir - 6;
        return (
          <g key={tablo.satirlar[n.satir]?.id ?? n.satir}>
            <g
              style={{
                transform: `translate(${x}px, ${sifir}px) scaleY(${n.deger >= 0 ? -Math.max(yuk, 0.001) : Math.max(yuk, 0.001)})`,
                transition: gecis,
                cursor: 'pointer',
              }}
              onClick={() => onSatirSec(secili ? null : n.satir)}
              onPointerEnter={() => setUstunde(n.satir)}
              onPointerLeave={() => setUstunde((u) => (u === n.satir ? null : u))}
            >
              {/* Renk anahtarı varken sütun kategorisinin renginde; bir satır seçiliyken diğerleri soluk (renk kategoriyi anlatır) */}
              <rect
                x={0}
                y={0}
                width={sutunG}
                height={1}
                fill={dolgu}
                fillOpacity={anahtarRengi && seciliSatir !== null ? (aktif ? 1 : 0.45) : aktif ? 1 : 0.85}
                stroke={kenarGerekir(dolgu) ? RENK.metin : undefined}
                strokeWidth={kenarGerekir(dolgu) ? 1.5 : undefined}
                vectorEffect={kenarGerekir(dolgu) ? 'non-scaling-stroke' : undefined}
              />
            </g>
            {/* Seçim çerçevesi (yalnız ekranda) */}
            {secili && (
              <rect
                data-yalniz-ekran
                data-secim-cercevesi
                x={x - 2.5}
                y={Math.min(tepe, sifir) - 2.5}
                width={sutunG + 5}
                height={yuk + 5}
                rx={4}
                fill="none"
                stroke={RENK.mercan}
                strokeWidth={3}
                pointerEvents="none"
              />
            )}
            {/* Değer etiketi (PNG'de kalır; tutamaçtan ayrı) */}
            {!dar && (
              <text
                x={cx}
                y={yaziY}
                fontSize={13}
                fontWeight={700}
                textAnchor="middle"
                fill={yaziYeri === 'ic' ? RENK.kart : surukleniyor ? RENK.mercan : RENK.metin}
                pointerEvents="none"
                style={yaziYeri === 'ic' ? undefined : { paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}
                data-deger-yazisi={yaziYeri}
              >
                {sayiMetni(n.deger, degerOndaligi)}
              </text>
            )}
            {/* Tepe tutamacı: sürükleme ve klavye (tek Tab durağı) */}
            <g
              role="slider"
              tabIndex={sekmeDuragi === n.satir ? 0 : -1}
              data-tutamak-satir={n.satir}
              className="vg-odaklanir"
              aria-label={`${etiket}: ${sayiMetni(n.deger, degerOndaligi)}. Sürükleyerek ya da ok tuşlarıyla değiştirin`}
              aria-valuenow={n.deger}
              aria-valuemin={eksen.min}
              aria-valuemax={eksen.max}
              style={{ cursor: 'ns-resize', outline: 'none' }}
              onPointerDown={(e) => surukleBaslat(e, n.satir)}
              onPointerMove={isaretciHareket}
              onPointerUp={surukleBitir}
              onPointerCancel={surukleBitir}
              onKeyDown={(e) => klavye(e, i, n.satir, n.deger)}
              onFocus={() => {
                setOdak(n.satir);
                setUstunde(n.satir);
              }}
              onBlur={() => setUstunde((u) => (u === n.satir ? null : u))}
              onPointerEnter={() => setUstunde(n.satir)}
              onPointerLeave={() => setUstunde((u) => (u === n.satir ? null : u))}
            >
              <rect x={x - 6} y={tepe - 22} width={sutunG + 12} height={44} fill="transparent" />
              {!dar && (
                <rect
                  data-yalniz-ekran
                  x={x}
                  y={tepe - 3}
                  width={sutunG}
                  height={6}
                  rx={3}
                  fill={aktif ? RENK.metin : RENK.kart}
                  stroke={secili ? RENK.mercan : RENK.birincil}
                  strokeWidth={2}
                  style={{ transition: gecis === 'none' ? 'none' : `y 300ms ${GECIS}` }}
                />
              )}
              <rect
                className="vg-odak"
                data-yalniz-ekran
                x={x - 6}
                y={tepe - 9}
                width={sutunG + 12}
                height={18}
                rx={7}
                fill="none"
                stroke={RENK.vurgu}
                strokeWidth={3}
                pointerEvents="none"
              />
            </g>
            {/* Kategori etiketi (sıkışınca seyreltilir; seçili olan hep yazılır) */}
            {etiketGoster && (
              <text
                x={cx}
                y={taban + 18}
                fontSize={13}
                fontWeight={secili ? 800 : 500}
                textAnchor={etiketEgik ? 'end' : 'middle'}
                transform={etiketEgik ? `rotate(-35 ${cx} ${taban + 18})` : undefined}
                fill={secili ? RENK.mercan : RENK.metin}
                style={{ cursor: 'pointer' }}
                onClick={() => onSatirSec(secili ? null : n.satir)}
              >
                {etiket.length > 12 && etiketEgik ? `${etiket.slice(0, 11)}…` : etiket}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
