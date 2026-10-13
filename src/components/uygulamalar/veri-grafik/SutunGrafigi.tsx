'use client';

/**
 * Değer sütunları: her satır bir sütun (etiket + değer). Sütunun tepesinden sürükleyince tablo anında
 * güncellenir (yuvarlama adımı 1 / 0,5 / 0,1). Y ekseni otomatik "güzel" aralıklarla (tam sayılı veride yarım
 * çentik yok); sürükleme sırasında eksen dondurulur ki sütun işaretçinin altında kaymasın. Aynı değişkende eksen
 * penceresi yalnız genişler: Feyza'nın sütunu 60'tan 20'ye indirilince eksen daralıp öteki sütunları büyütmez.
 * Klavye: grafik tek Tab durağıdır; ← → sütunlar arasında gezer, ↑ ↓ değeri bir adım değiştirir, Enter seçer.
 * Seçim çerçevesi, tutamaçlar ve odak halkası yalnız ekrandadır (`data-yalniz-ekran`; PNG'ye çıkmaz).
 * Sayılar öteki grafiklerle aynı biçimde yazılır (`sayiMetni`: bölük boşluğu, gerçek eksi "−9,1"). Eksi değerli
 * sütunun altında değer yazısına yer kalır: yazı kategori adının üstüne binmez. Eksenlerin ucunda ok vardır.
 *
 * İkili gruplar (`ikili`, 5–8. sınıf örneklerinde karşılaştırma): iki veri grubu aynı grafikte, yan yana sütun
 * çiftleri hâlinde (1. maç: Selma, Yasemin · 2. maç …; ya da 7A-01 ile 7B-01 …); "önce birinci grup, sonra ikinci
 * grup" sırası kullanılmaz. Seriler başlık satırındaki lejantta; her sütun kendi hücresini sürükler.
 */
import React, { useMemo, useRef, useState } from 'react';
import { guzelEksen, sayiMetni, type Eksen } from './istatistik';
import { adimOndalik, dogrusalOlcek, gosterimOndaligi, pencereyiGuncelle, surukleDegeri, tamSayiliMi, type EksenPenceresi } from './grafik';
import { gecerliDegerler, satirEtiketi, type VeriTablosu } from './veri';
import { GECIS, RENK, svgKonumu } from './grafikOrtak';
import { kenarGerekir, satirRengi, type RenkEslemesi } from './kategorik';
import { RenkLejanti } from './RenkLejanti';
import { EksenOklari } from './EksenOklari';
import type { SutunCiftleri } from './ikiliGruplar';

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
  /** İkili gruplar: iki veri grubu yan yana sütun çiftleri (ikiliGruplar.ts: sutunCiftleri) */
  ikili?: SutunCiftleri | null;
}

const SOL = 56;
const SAG = 16;
const UST = 24;
const ALT = 56;
/** Bu genişlikten dar çubuklarda değer etiketi ve tutamaç çizilmez (1000 satırda okunmaz ve yavaşlatır) */
const DAR_SUTUN = 14;
/** Eğik kategori etiketleri arasında en az bu kadar yatay yer kalır; sıkışınca etiketler seyreltilir */
const EGIK_ETIKET_ARALIGI = 16;
/** Yan yana iki sütun arasındaki boşluk (px) */
const CIFT_ARASI = 2;
/** 13 px kalın yazıda harf başına yaklaşık genişlik */
const HARF = 7.4;

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

/** Çizilen bir sütun: hangi hücre, değeri, yatay yeri ve rengi */
interface Cubuk {
  satir: number;
  sutun: number;
  deger: number;
  /** sütunun ortası (px) */
  cx: number;
  etiket: string;
  /** ikili grupta serinin rengi */
  renk?: string;
  /** ikili grupta serinin adı */
  seriAdi?: string;
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
  ikili = null,
}: SutunGrafigiProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [surukle, setSurukle] = useState<{ anahtar: string; eksen: Eksen } | null>(null);
  const [ustunde, setUstunde] = useState<string | null>(null);
  /** Klavye gezinmesinin durduğu sütun (tek Tab durağı); anahtar "satır:sütun" */
  const [odak, setOdak] = useState<string | null>(null);

  // Gerçek piksel: viewBox kabın ölçüsüdür, küçültme yok (yazılar 13 px kalır)
  const W = Math.max(0, genislik);
  const H = Math.max(0, yukseklik);
  const alanG = Math.max(0, W - SOL - SAG);
  const ciftli = !!ikili && ikili.gruplar.length > 0 && ikili.seriler.length > 1;

  const noktalar = useMemo(() => gecerliDegerler(tablo, sutun), [tablo, sutun]);
  const degerler = useMemo(
    () => (ciftli ? ikili!.gruplar.flatMap((g) => g.cubuklar.filter((c) => c !== null).map((c) => c!.deger)) : noktalar.map((n) => n.deger)),
    [ciftli, ikili, noktalar],
  );
  /** Yatay yerleşim birimi: tek seride her satır, ikili gruplarda her grup bir hücre */
  const hucreSayisi = Math.max(ciftli ? ikili!.gruplar.length : noktalar.length, 1);
  const hucreG = alanG / hucreSayisi;
  const seriSayisi = ciftli ? ikili!.seriler.length : 1;
  /** Alt etiketler sütunların kendi adları mı (tek seri, gruplu çiftler) yoksa grupların adı mı (iki sayısal değişken) */
  const cubukEtiketli = !ciftli || ikili!.cubukEtiketli;
  // Etiketler hücreye sığmıyorsa (13 px yazıda harf başına ~7,4 px) eğik yazılır ve 12 harfte kısaltılır;
  // eğik etiket daha çok dikey yer ister: alt boşluk etiket uzunluğuna göre büyür (en çok 96 px)
  const altEtiketler = !ciftli
    ? noktalar.map((n) => satirEtiketi(tablo, n.satir))
    : cubukEtiketli
      ? ikili!.gruplar.flatMap((g) => g.cubuklar.filter((c) => c !== null).map((c) => c!.etiket))
      : ikili!.gruplar.map((g) => g.etiket);
  const etiketHucresi = ciftli && cubukEtiketli ? hucreG / seriSayisi : hucreG;
  const enUzunEtiket = altEtiketler.reduce((m, e) => Math.max(m, e.length), 0);
  const etiketEgik = etiketHucresi < 64 || Math.min(enUzunEtiket, 12) * HARF + 10 > etiketHucresi;
  const altBosluk = etiketEgik ? Math.min(96, Math.max(ALT, 24 + Math.min(enUzunEtiket, 12) * HARF * 0.58 + 10)) : ALT;
  const taban = Math.max(UST + 1, H - altBosluk);
  const tamSayi = tamSayiliMi(degerler);
  /** Eksen penceresi (değer uzayında): aynı sütunda yalnız genişler; sütun değişince, veri boşalınca ya da çok daralınca sıfırlanır */
  const pencereRef = useRef<EksenPenceresi | null>(null);
  const sutunKimligi = `${tablo.sutunlar[sutun]?.id ?? String(sutun)}${ciftli ? `|ikili:${ikili!.seriler.map((s) => s.ad).join(',')}` : ''}`;
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

  const sutunG = ciftli
    ? Math.max(1, Math.min((hucreG * 0.84 - (seriSayisi - 1) * CIFT_ARASI) / seriSayisi, 48))
    : Math.max(1, Math.min(hucreG * 0.66, 72));
  const dar = sutunG < DAR_SUTUN;
  /**
   * Değer yazıları: ikili gruplarda yan yana iki sütunun yazıları birbirine binmesin diye en uzun yazı sütun genişliğine
   * (ve aradaki boşluğa) sığmıyorsa yazılmaz (değer tutamacın erişilebilir adında ve tabloda kalır)
   */
  const enUzunDeger = degerler.reduce((m, d) => Math.max(m, sayiMetni(d, degerOndaligi).length), 0);
  const degerYazili = !dar && (!ciftli || enUzunDeger * 7 <= sutunG + CIFT_ARASI + 6);
  const gecis = azaltilmisHareket || surukle || degerler.length > 200 ? 'none' : `transform 300ms ${GECIS}`;
  const anahtar = !ciftli && renkEslemi && renkEslemi.sutun !== sutun ? renkEslemi : null;
  // Yatay eksenin adı: etiketler tablonun ilk sütunundan gelir ("Etkinlik", "Ay" …)
  const yatayAd = !etiketEgik && (ciftli || sutun !== 0) ? tablo.sutunlar[0]?.ad ?? '' : '';

  /** Çizilecek sütunlar soldan sağa (ikili gruplarda grup grup, seri sırasıyla) */
  const cubuklar: Cubuk[] = useMemo(() => {
    if (!ciftli) return noktalar.map((n, i) => ({ satir: n.satir, sutun, deger: n.deger, cx: SOL + hucreG * (i + 0.5), etiket: satirEtiketi(tablo, n.satir) }));
    const sonuc: Cubuk[] = [];
    const grupG = seriSayisi * sutunG + (seriSayisi - 1) * CIFT_ARASI;
    ikili!.gruplar.forEach((g, gi) => {
      const orta = SOL + hucreG * (gi + 0.5);
      g.cubuklar.forEach((c, s) => {
        if (!c) return;
        sonuc.push({
          satir: c.satir,
          sutun: c.sutun,
          deger: c.deger,
          cx: orta - grupG / 2 + s * (sutunG + CIFT_ARASI) + sutunG / 2,
          etiket: c.etiket,
          renk: ikili!.seriler[s]?.renk,
          seriAdi: ikili!.seriler[s]?.ad,
        });
      });
    });
    return sonuc;
  }, [ciftli, ikili, noktalar, sutun, hucreG, seriSayisi, sutunG, tablo]);
  const anahtarOf = (c: Pick<Cubuk, 'satir' | 'sutun'>) => `${c.satir}:${c.sutun}`;
  const etiketAdimi = etiketEgik ? Math.max(1, Math.ceil(EGIK_ETIKET_ARALIGI / Math.max(cubukEtiketli ? etiketHucresi : hucreG, 0.01))) : 1;

  const anahtarlar = cubuklar.map(anahtarOf);
  const seciliCubuk = seciliSatir !== null ? cubuklar.find((c) => c.satir === seciliSatir) : undefined;
  const sekmeDuragi = odak !== null && anahtarlar.includes(odak) ? odak : seciliCubuk ? anahtarOf(seciliCubuk) : anahtarlar[0] ?? null;

  const odakla = (a: string) => {
    setOdak(a);
    svgRef.current?.querySelector<SVGGElement>(`[data-tutamak="${a}"]`)?.focus();
  };

  const isaretciHareket = (e: React.PointerEvent<SVGElement>) => {
    if (!surukle || !svgRef.current) return;
    const c = cubuklar.find((x) => anahtarOf(x) === surukle.anahtar);
    if (!c) return;
    const { y } = svgKonumu(svgRef.current, e.clientX, e.clientY);
    const o = dogrusalOlcek(surukle.eksen.min, surukle.eksen.max, taban, UST);
    const deger = surukleDegeri(y, o, yuvarlamaAdimi, surukle.eksen.min, surukle.eksen.max);
    onDegerDegis(c.satir, c.sutun, deger, ondalik);
  };

  const surukleBaslat = (e: React.PointerEvent<SVGElement>, c: Cubuk) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setSurukle({ anahtar: anahtarOf(c), eksen: canliEksen });
    setOdak(anahtarOf(c));
    onSatirSec(c.satir);
  };

  const surukleBitir = (e: React.PointerEvent<SVGElement>) => {
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    setSurukle(null);
  };

  const klavye = (e: React.KeyboardEvent, i: number, c: Cubuk) => {
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
        if (hedef >= 0 && hedef < cubuklar.length) odakla(anahtarOf(cubuklar[hedef]));
        return;
      }
      case 'Home':
      case 'End':
        e.preventDefault();
        if (cubuklar.length > 0) odakla(anahtarOf(cubuklar[e.key === 'Home' ? 0 : cubuklar.length - 1]));
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSatirSec(seciliSatir === c.satir ? null : c.satir);
        return;
      default:
        return;
    }
    e.preventDefault();
    onDegerDegis(c.satir, c.sutun, c.deger + fark, ondalik);
  };

  /** İkili gruplarda başlık satırı: (gruplu ise) değişkenin adı ve serilerin renkleri */
  const seriBaslik = ciftli && cubukEtiketli ? sutunAdi : '';
  const seriOgeleri = ciftli
    ? ikili!.seriler.reduce<{ ad: string; renk: string; x: number }[]>((liste, s) => {
        const onceki = liste[liste.length - 1];
        const x = onceki ? onceki.x + onceki.ad.length * HARF + 34 : SOL + (seriBaslik ? seriBaslik.length * HARF + 24 : 0);
        return [...liste, { ad: s.ad, renk: s.renk, x }];
      }, [])
    : [];

  return (
    <svg
      ref={svgRef}
      data-grafik="sutun"
      data-ikili={ciftli ? '' : undefined}
      role="img"
      aria-label={ciftli ? `${ikili!.seriler.map((s) => s.ad).join(' ve ')}: yan yana sütunlar` : `${sutunAdi} değer sütunları`}
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
      <EksenOklari x={SOL} ustY={UST} y={olcek.ileri(0)} sagX={W - SAG} />
      {ciftli ? (
        <g data-seri-lejanti>
          {seriBaslik && (
            <text x={SOL} y={14} fontSize={13} fontWeight={700} fill={RENK.metin}>
              {seriBaslik}
            </text>
          )}
          {seriOgeleri.map((s) => (
            <g key={s.ad} transform={`translate(${s.x}, 9.5)`} data-seri={s.ad}>
              <rect x={0} y={-6} width={12} height={12} rx={3} fill={s.renk} stroke={kenarGerekir(s.renk) ? RENK.metin : undefined} strokeWidth={kenarGerekir(s.renk) ? 1.5 : undefined} />
              <text x={17} y={4.5} fontSize={13} fontWeight={700} fill={RENK.metin}>
                {s.ad}
              </text>
            </g>
          ))}
        </g>
      ) : (
        <text x={SOL} y={14} fontSize={13} fontWeight={700} fill={RENK.metin}>
          {sutunAdi}
        </text>
      )}
      {yatayAd && (
        <text x={W - SAG} y={taban + 40} fontSize={13} fontWeight={700} textAnchor="end" fill={RENK.metin} data-eksen-adi="yatay">
          {yatayAd}
        </text>
      )}
      {anahtar && <RenkLejanti eslem={anahtar} x={SOL + sutunAdi.length * HARF + 24} y={14} sagSinir={W - SAG} />}

      {cubuklar.length === 0 && (
        <text x={SOL + alanG / 2} y={(UST + taban) / 2} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Bu değişkende sayısal değer yok
        </text>
      )}

      {/* İkili gruplarda grubun adı (iki sayısal değişkende satırın etiketi: "1. maç", "Ocak") grubun ortasında */}
      {!cubukEtiketli &&
        ikili!.gruplar.map((g, gi) => {
          if (gi % etiketAdimi !== 0) return null;
          const cx = SOL + hucreG * (gi + 0.5);
          return (
            <text
              key={`grup-${gi}`}
              x={cx}
              y={taban + 18}
              fontSize={13}
              fontWeight={500}
              textAnchor={etiketEgik ? 'end' : 'middle'}
              transform={etiketEgik ? `rotate(-35 ${cx} ${taban + 18})` : undefined}
              fill={RENK.metin}
              data-grup-etiketi
            >
              {g.etiket.length > 12 && etiketEgik ? `${g.etiket.slice(0, 11)}…` : g.etiket}
            </text>
          );
        })}

      {cubuklar.map((c, i) => {
        const cx = c.cx;
        const x = cx - sutunG / 2;
        const sifir = olcek.ileri(0);
        const tepe = olcek.ileri(c.deger);
        const yuk = Math.abs(sifir - tepe);
        const a = anahtarOf(c);
        const secili = seciliSatir === c.satir;
        const aktif = secili || ustunde === a || surukle?.anahtar === a;
        const anahtarRengi = anahtar ? satirRengi(anahtar, c.satir) : undefined;
        const etiket = c.seriAdi ? `${c.etiket} · ${c.seriAdi}` : c.etiket;
        const surukleniyor = surukle?.anahtar === a;
        const etiketGoster = cubukEtiketli && (secili || i % etiketAdimi === 0);
        const dolgu = c.renk ?? anahtarRengi ?? RENK.birincil;
        const renkli = !!c.renk || !!anahtarRengi;
        /**
         * Değer yazısının yeri: artıda sütunun üstünde; eksi değerde sütunun altında. Altında kategori adına binecekse
         * (alçak grafik) sütunun içinde ucunda, sütun kısaysa sıfır çizgisinin üstünde.
         */
        const yaziYeri: 'ust' | 'alt' | 'ic' | 'sifir' = c.deger >= 0 ? 'ust' : tepe + 18 <= taban + 3 ? 'alt' : yuk >= 22 ? 'ic' : 'sifir';
        const yaziY = yaziYeri === 'ust' ? tepe - 9 : yaziYeri === 'alt' ? tepe + 18 : yaziYeri === 'ic' ? tepe - 6 : sifir - 6;
        return (
          <g key={`${tablo.satirlar[c.satir]?.id ?? c.satir}-${c.sutun}`} data-cubuk={c.seriAdi}>
            <g
              style={{
                transform: `translate(${x}px, ${sifir}px) scaleY(${c.deger >= 0 ? -Math.max(yuk, 0.001) : Math.max(yuk, 0.001)})`,
                transition: gecis,
                cursor: 'pointer',
              }}
              onClick={() => onSatirSec(secili ? null : c.satir)}
              onPointerEnter={() => setUstunde(a)}
              onPointerLeave={() => setUstunde((u) => (u === a ? null : u))}
            >
              {/* Renk anahtarı varken sütun kategorisinin renginde; bir satır seçiliyken diğerleri soluk (renk kategoriyi anlatır) */}
              <rect
                x={0}
                y={0}
                width={sutunG}
                height={1}
                fill={dolgu}
                fillOpacity={renkli && seciliSatir !== null ? (aktif ? 1 : 0.45) : aktif ? 1 : 0.85}
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
            {degerYazili && (
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
                {sayiMetni(c.deger, degerOndaligi)}
              </text>
            )}
            {/* Tepe tutamacı: sürükleme ve klavye (tek Tab durağı) */}
            <g
              role="slider"
              tabIndex={sekmeDuragi === a ? 0 : -1}
              data-tutamak-satir={c.satir}
              data-tutamak={a}
              className="vg-odaklanir"
              aria-label={`${etiket}: ${sayiMetni(c.deger, degerOndaligi)}. Sürükleyerek ya da ok tuşlarıyla değiştirin`}
              aria-valuenow={c.deger}
              aria-valuemin={eksen.min}
              aria-valuemax={eksen.max}
              style={{ cursor: 'ns-resize', outline: 'none' }}
              onPointerDown={(e) => surukleBaslat(e, c)}
              onPointerMove={isaretciHareket}
              onPointerUp={surukleBitir}
              onPointerCancel={surukleBitir}
              onKeyDown={(e) => klavye(e, i, c)}
              onFocus={() => {
                setOdak(a);
                setUstunde(a);
              }}
              onBlur={() => setUstunde((u) => (u === a ? null : u))}
              onPointerEnter={() => setUstunde(a)}
              onPointerLeave={() => setUstunde((u) => (u === a ? null : u))}
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
                  stroke={secili ? RENK.mercan : c.renk ?? RENK.birincil}
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
                onClick={() => onSatirSec(secili ? null : c.satir)}
              >
                {c.etiket.length > 12 && etiketEgik ? `${c.etiket.slice(0, 11)}…` : c.etiket}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
