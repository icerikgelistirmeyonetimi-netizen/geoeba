'use client';

/**
 * Nokta grafiği (TinkerPlots mantığı): her satır bir nokta, aynı değerdekiler dikeyde yığılır. Eksen
 * uygulamada hep bir değişkene atanmış gelir; başka değişken seçilince (çip ya da sürükle-bırak) noktalar
 * 600 ms'de yeni yerlerine süzülür. Tabloda değişken yoksa noktalar dağınık durur. "Sütunlara dönüştür" yığınları 500 ms'de
 * frekans sütunlarına çevirir. Ortalama çizgisi, ortalama mutlak sapma bandı ve ölçüm etiketleri seçeneklidir.
 */
import React, { useMemo, useState } from 'react';
import { guzelEksen, ortalama, ortalamaMutlakSapma, temizle, type Eksen } from './istatistik';
import { dagitikKonum, dogrusalOlcek, enYuksekYigin, gruplamaVar, noktaYaricapi, yiginla } from './grafik';
import { gecerliDegerler, satirEtiketi, sayiYaz, type VeriTablosu } from './veri';
import { GECIS, RENK } from './ortak';
import { kategoriRengi, kategoriler, kategoriSayilari, kutuYerlesimi, satirRengi, sutunMetinleri, type RenkEslemesi } from './kategorik';
import { RenkLejanti } from './RenkLejanti';

export interface NoktaSecenekleri {
  ortalama: boolean;
  oms: boolean;
  etiketler: boolean;
}

export interface NoktaGrafigiProps {
  tablo: VeriTablosu;
  /** sütun indeksi; -1 = değişken atanmamış (dağınık) */
  sutun: number;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  /** Bir değişken adı eksene bırakıldı (dataTransfer'daki sütun kimliği) */
  onDegiskenBirak: (sutunId: string) => void;
  aralik: number;
  secenekler: NoktaSecenekleri;
  sutunModu: boolean;
  genislik: number;
  yukseklik: number;
  azaltilmisHareket: boolean;
  /** Bir değişken çipi sürükleniyor: bırakma alanı vurgulanır */
  surukleniyor: boolean;
  /** Karşılaştırma görünümünde panel başlığı */
  baslik?: string;
  /** Karşılaştırma için ortak eksen aralığı (iki panel aynı ölçekte) */
  eksenAlani?: { min: number; max: number };
  /** Kategorik değişkende kutucuk sırası (aygıt sırası); verilmezse alfabetik */
  kategoriSirasi?: string[];
  /** Veri hızla akıyor (ölçüm toplama, Anında çalıştırma): geçişler kapalı, noktalar doğrudan yerine çizilir */
  akis?: boolean;
  /** Renk anahtarı: noktalar başka bir kategorik değişkene göre renklenir (TinkerPlots "renk"), lejantla */
  renkEslemi?: RenkEslemesi | null;
}

/** Bu kadar noktadan sonra geçiş animasyonları kapanır (akıllı tahtada akıcılık) */
const COK_NOKTA = 400;

/**
 * Nokta yarıçapı basamakları: canlı çekilişte her yeni satırda bütün noktalar yeniden ölçeklenip
 * kaymasın diye yarıçap yalnız bu eşiklerde değişir (en küçüğü noktaYaricapi'nin alt sınırı).
 */
const YARICAP_BASAMAKLARI = [22, 18, 15, 12, 10, 8, 6];
const basamakla = (r: number) => YARICAP_BASAMAKLARI.find((b) => b <= r) ?? r;

/** Yoğun yığın (yan yana sıralar ya da küçücük noktalar): tek tek etiket yerine yığın başına sayı yazılır */
const YOGUN_YARICAP = 5;

interface KategoriKutusu {
  kategori: string;
  x0: number;
  x1: number;
  merkez: number;
  sayi: number;
  renk: string;
  /** sütun modunda çubuk yüksekliği (px) */
  yukseklik: number;
}

export const DEGISKEN_VERI_TURU = 'application/x-geoeba-degisken';

const SOL = 20;
const SAG = 20;
/** Üst boşluk (renk lejantı varken lejant satırı kadar artar) */
const UST_TEMEL = 30;
const ALT = 50;

interface NoktaKonumu {
  satir: number;
  x: number;
  y: number;
  r: number;
  deger: number | null;
  /** dağınık (değeri olmayan) nokta */
  dagitik: boolean;
  opaklik: number;
  /** yığın sırası (etiketleri şaşırtmak için) */
  yiginIndeksi: number;
  /** kategorik değer (ayrık kutucuklar) */
  kategori?: string;
  renk?: string;
}

export function NoktaGrafigi({
  tablo,
  sutun,
  seciliSatir,
  onSatirSec,
  onDegiskenBirak,
  aralik,
  secenekler,
  sutunModu,
  genislik,
  yukseklik,
  azaltilmisHareket,
  surukleniyor,
  baslik,
  eksenAlani,
  kategoriSirasi,
  akis = false,
  renkEslemi = null,
}: NoktaGrafigiProps) {
  const [ustunde, setUstunde] = useState<number | null>(null);
  const [birakmaUzerinde, setBirakmaUzerinde] = useState(false);

  const W = Math.max(genislik, 200);
  const H = Math.max(yukseklik, 160);
  /** Renk anahtarı bu grafiğin değişkeninden farklıysa noktalar onun renklerini alır ve lejant çizilir */
  const anahtar = renkEslemi && renkEslemi.sutun !== sutun && sutun >= 0 && sutun < tablo.sutunlar.length ? renkEslemi : null;
  // Başlıklı karşılaştırma panelinde lejant başlık satırında durur; tek panelde kendi satırı için üst boşluk açılır
  const UST = anahtar && !baslik ? UST_TEMEL + 24 : UST_TEMEL;
  const taban = H - ALT;
  const alanG = W - SOL - SAG;
  const alanY = taban - UST;

  const sutunAdi = sutun >= 0 ? tablo.sutunlar[sutun]?.ad ?? '' : '';
  const atanmis = sutun >= 0 && sutun < tablo.sutunlar.length;
  const kategorik = atanmis && tablo.sutunlar[sutun].tur === 'etiket';

  const kategorikHesap = useMemo(() => {
    if (!kategorik) return null;
    const metinler = sutunMetinleri(tablo, sutun);
    const kats = kategoriler(
      metinler.map((m) => m.deger),
      kategoriSirasi,
    );
    const sayac = new Map<string, number>();
    for (const m of metinler) sayac.set(m.deger, (sayac.get(m.deger) ?? 0) + 1);
    const enCok = Math.max(0, ...sayac.values());
    const kutuG = kats.length > 0 ? alanG / kats.length : alanG;
    const yer = kutuYerlesimi(enCok, kutuG * 0.9, alanY - 14, 22, 1.5);
    const satirSayisi = Math.ceil(enCok / yer.sutunSayisi);
    /** noktaların dikey adımı: sığmıyorsa alan / satır sayısı */
    const adimY = yer.sigdi || satirSayisi === 0 ? yer.birim : (alanY - 14) / satirSayisi;
    const kutular: KategoriKutusu[] = kats.map((k, i) => {
      const sayi = sayac.get(k) ?? 0;
      return {
        kategori: k,
        x0: SOL + i * kutuG,
        x1: SOL + (i + 1) * kutuG,
        merkez: SOL + (i + 0.5) * kutuG,
        sayi,
        renk: kategoriRengi(k, i),
        yukseklik: Math.ceil(sayi / yer.sutunSayisi) * adimY,
      };
    });
    const indeks = new Map(kats.map((k, i) => [k, i]));
    const sira = new Map<string, number>();
    const konumlar: NoktaKonumu[] = [];
    const yerlesen = new Set<number>();
    for (const m of metinler) {
      const i = indeks.get(m.deger);
      if (i === undefined) continue;
      const kutu = kutular[i];
      const k = sira.get(m.deger) ?? 0;
      sira.set(m.deger, k + 1);
      const kullanilanSutun = Math.min(yer.sutunSayisi, kutu.sayi);
      const sutunNo = k % yer.sutunSayisi;
      const satirNo = Math.floor(k / yer.sutunSayisi);
      const x = kutu.merkez + (sutunNo - (kullanilanSutun - 1) / 2) * yer.birim;
      const y = sutunModu ? taban - 4 - kutu.yukseklik / 2 : taban - 4 - Math.min(yer.r, adimY / 2) - satirNo * adimY;
      yerlesen.add(m.satir);
      konumlar.push({
        satir: m.satir,
        x,
        y,
        r: yer.sigdi ? yer.r : Math.max(0.8, Math.min(yer.r, adimY / 2 - 0.2)),
        deger: null,
        dagitik: false,
        opaklik: sutunModu ? 0 : 1,
        yiginIndeksi: 0,
        kategori: m.deger,
        renk: kutu.renk,
      });
    }
    // Değeri olmayan satırlar çizilmez (dağınık hayalet noktalar kalabalık tabloda grafiği boğuyordu); sayısı not düşülür
    konumlar.sort((a, b) => a.satir - b.satir);
    return { kutular, konumlar, n: metinler.length, eksik: tablo.satirlar.length - yerlesen.size };
  }, [kategorik, tablo, sutun, kategoriSirasi, alanG, alanY, taban, sutunModu]);

  const hesap = useMemo(() => {
    const noktalar = atanmis && !kategorik ? gecerliDegerler(tablo, sutun) : [];
    const degerler = noktalar.map((n) => n.deger);
    // Gruplama yoksa her nokta tam değerinde durur; gruplamada grup kenarları aralığın katlarıdır
    const gruplu = degerler.length > 0 && gruplamaVar(degerler, aralik);
    const yiginlar = yiginla(noktalar, aralik, gruplu);
    const enYuksek = enYuksekYigin(yiginlar);
    const hedefIsaret = Math.max(3, Math.floor(alanG / 70));
    let eksen: Eksen | null = null;
    if (yiginlar.length > 0 && gruplu) {
      // Eksen işaretleri grup kenarlarında: 13 değeri 12–14 grubunda görünür, 14'ün üstünde değil
      const kenar = (v: number) => Math.floor(temizle(v / aralik) + 1e-9);
      const ilk = Math.min(kenar(yiginlar[0].baslangic), eksenAlani ? kenar(eksenAlani.min) : Infinity);
      const son = Math.max(kenar(yiginlar[yiginlar.length - 1].baslangic), eksenAlani ? kenar(eksenAlani.max) : -Infinity) + 1;
      const isaretler = Array.from({ length: son - ilk + 1 }, (_, i) => temizle((ilk + i) * aralik));
      eksen = { min: isaretler[0], max: isaretler[isaretler.length - 1], adim: aralik, isaretler };
    } else if (yiginlar.length > 0) {
      eksen = guzelEksen(
        Math.min(yiginlar[0].baslangic, eksenAlani ? eksenAlani.min - aralik / 2 : Infinity),
        Math.max(yiginlar[yiginlar.length - 1].bitis, eksenAlani ? eksenAlani.max + aralik / 2 : -Infinity),
        hedefIsaret,
      );
    }
    const olcek = eksen ? dogrusalOlcek(eksen.min, eksen.max, SOL, W - SAG) : null;
    const yiginPiksel = olcek ? olcek.ileri(aralik) - olcek.ileri(0) : 0;
    // Akıllı tahta: noktalar kap yüksekliğine ve en büyük yığına göre büyür (en çok 22 px yarıçap);
    // basamaklı yarıçap sayesinde canlı çekilişte her yeni nokta bütün grafiği yeniden ölçeklemez
    // Yarıçap için etkin genişlik: dolu yığınlar arasındaki en küçük uzaklık (5, 8, 10, 15 … gibi seyrek değerlerde
    // noktalar çözünürlük kadar değil komşu yığına kadar büyür; tek yığında yalnız dikey alan sınırlar)
    const enKucukUzaklik = yiginlar.slice(1).reduce((m, y, i) => Math.min(m, y.merkez - yiginlar[i].merkez), Infinity);
    const yaricapPiksel = !olcek ? yiginPiksel : yiginlar.length <= 1 ? alanG : Math.max(yiginPiksel, olcek.ileri(enKucukUzaklik) - olcek.ileri(0));
    let r = olcek ? basamakla(noktaYaricapi(yaricapPiksel, alanY - 12, enYuksek, 22, 6)) : 8;
    /** sütun modunda bir gözlemin sütun yüksekliği (px) */
    let birim = 2 * r + 1;
    /** noktaların dikey adımı ve bir yığındaki nokta sütunu sayısı */
    let noktaBirim = birim;
    let yiginSutunu = 1;
    // Çok yüksek yığın (ör. 1000 ölçüm): aralık genişse noktalar yığın içinde yan yana sıralara dizilir
    // (TinkerPlots gibi) — yalnız o yerleşim dikey alana gerçekten sığıyorsa; değilse tek sütunda küçülüp
    // sıkışır. Böylece hiçbir durumda kabın dışına taşmaz.
    if (olcek && enYuksek > 0 && enYuksek * birim > alanY - 12) {
      birim = (alanY - 12) / enYuksek;
      const yer = kutuYerlesimi(enYuksek, yiginPiksel * 0.94, alanY - 12, 6, 1.5);
      if (yer.sigdi && yer.sutunSayisi > 1 && yer.r > birim / 2) {
        r = yer.r;
        noktaBirim = yer.birim;
        yiginSutunu = yer.sutunSayisi;
      } else {
        noktaBirim = birim;
        r = Math.max(0.8, birim / 2 - (birim > 6 ? 0.5 : 0));
      }
    }
    const konumlar: NoktaKonumu[] = [];
    const yerlesen = new Set<number>();
    yiginlar.forEach((y, yiginIndeksi) => {
      const x = olcek!.ileri(y.merkez);
      const adet = y.ogeler.length;
      for (const o of y.ogeler) {
        yerlesen.add(o.satir);
        const satirNo = Math.floor(o.sira / yiginSutunu);
        const sutunNo = o.sira % yiginSutunu;
        const buSatirda = Math.min(yiginSutunu, adet - satirNo * yiginSutunu);
        const xNokta = x + (sutunNo - (buSatirda - 1) / 2) * noktaBirim;
        const yNokta = sutunModu ? taban - 4 - (adet * birim) / 2 : taban - 4 - r - satirNo * noktaBirim;
        konumlar.push({ satir: o.satir, x: xNokta, y: yNokta, r, deger: o.deger, dagitik: false, opaklik: sutunModu ? 0 : 1, yiginIndeksi });
      }
    });
    // Değişken atanmadan önce bütün satırlar alanda dağınık durur; atanınca değeri olmayan satırlar çizilmez
    // (hayalet noktalar kalabalık tabloda grafiği boğuyordu), sayısı köşeye not düşülür
    if (!atanmis) {
      tablo.satirlar.forEach((s, i) => {
        const k = dagitikKonum(s.id);
        konumlar.push({ satir: i, x: SOL + k.x * alanG, y: UST + k.y * alanY, r: 8, deger: null, dagitik: true, opaklik: 1, yiginIndeksi: 0 });
      });
    }
    konumlar.sort((a, b) => a.satir - b.satir);
    /** yoğun yığın: yan yana sıralar ya da küçücük noktalar (etiketler yığın başına sayıya döner) */
    const yogun = yiginSutunu > 1 || r < YOGUN_YARICAP;
    /** yığın başına etiket yeri (yığının tepesi) */
    const yiginTepeleri = olcek
      ? yiginlar.map((y) => ({
          x: olcek.ileri(y.merkez),
          y: taban - 4 - r - (Math.ceil(y.ogeler.length / yiginSutunu) - 1) * noktaBirim - r - 6,
          adet: y.ogeler.length,
        }))
      : [];
    const ort = ortalama(degerler);
    const oms = ortalamaMutlakSapma(degerler);
    return { noktalar, yiginlar, gruplu, enYuksek, eksen, olcek, yiginPiksel, r, birim, konumlar, ort, oms, yogun, yiginTepeleri, eksik: atanmis ? tablo.satirlar.length - yerlesen.size : 0 };
  }, [tablo, sutun, aralik, atanmis, kategorik, alanG, alanY, W, taban, sutunModu, eksenAlani]);

  const { yiginlar, yiginPiksel, r, birim, oms, yogun, yiginTepeleri } = hesap;
  const gruplu = !kategorik && hesap.gruplu;
  const eksen = kategorik ? null : hesap.eksen;
  const olcek = kategorik ? null : hesap.olcek;
  const ort = kategorik ? null : hesap.ort;
  const konumlar = kategorikHesap ? kategorikHesap.konumlar : hesap.konumlar;
  const eksik = kategorikHesap ? kategorikHesap.eksik : hesap.eksik;
  const kutular = kategorikHesap?.kutular ?? [];
  const cokNokta = konumlar.length > COK_NOKTA;
  const hareketsiz = azaltilmisHareket || cokNokta || akis;
  const gecis = hareketsiz ? 'none' : `transform 600ms ${GECIS}, opacity 500ms ${GECIS}`;
  const sutunGecis = hareketsiz ? 'none' : `transform 500ms ${GECIS}, opacity 400ms ${GECIS}`;

  /** Tüm değerler ≥ 0 ise (sayım, oran) eksende 0'ın altındaki işaretler çizilmez */
  const negatifYok = hesap.noktalar.length > 0 && hesap.noktalar.every((n) => n.deger >= 0) && !(eksenAlani && eksenAlani.min < 0);
  const isaretler = eksen ? (negatifYok ? eksen.isaretler.filter((v) => v >= 0) : eksen.isaretler) : [];
  const etiketAdimi = eksen ? Math.max(1, Math.ceil(eksen.isaretler.length / Math.max(2, Math.floor(alanG / 56)))) : 1;

  const surukleyiKabulEt = (e: React.DragEvent) => {
    const turler = Array.from(e.dataTransfer.types);
    if (turler.includes(DEGISKEN_VERI_TURU) || turler.includes('text/plain')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'link';
      if (!birakmaUzerinde) setBirakmaUzerinde(true);
    }
  };

  const birak = (e: React.DragEvent) => {
    e.preventDefault();
    setBirakmaUzerinde(false);
    const id = e.dataTransfer.getData(DEGISKEN_VERI_TURU) || e.dataTransfer.getData('text/plain');
    if (id && tablo.sutunlar.some((s) => s.id === id)) onDegiskenBirak(id);
  };

  const ustundeki = ustunde !== null ? konumlar.find((k) => k.satir === ustunde) : undefined;
  const balonMetni = ustundeki
    ? `${satirEtiketi(tablo, ustundeki.satir)}${
        ustundeki.kategori !== undefined ? `: ${ustundeki.kategori}` : ustundeki.deger !== null ? `: ${sayiYaz(ustundeki.deger)}` : ' (değer yok)'
      }`
    : '';
  const balonGenislik = balonMetni.length * 7.2 + 18;

  return (
    <svg
      data-grafik="nokta"
      role="img"
      aria-label={atanmis ? `${sutunAdi} nokta grafiği${kategorik ? ' (kategorik)' : ''}` : 'Nokta grafiği: değişken atanmadı'}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif' }}
      onDragOver={surukleyiKabulEt}
      onDragEnter={surukleyiKabulEt}
      onDragLeave={() => setBirakmaUzerinde(false)}
      onDrop={birak}
    >
      {!hareketsiz && <style>{`@keyframes vg-nokta-gir{from{transform:translateY(-16px);opacity:0}to{transform:none;opacity:1}}`}</style>}
      {baslik && (
        <text x={SOL} y={18} fontSize={13} fontWeight={700} fill={RENK.metin}>
          {baslik}
        </text>
      )}
      {anahtar && (
        <RenkLejanti
          eslem={anahtar}
          x={baslik ? SOL + baslik.length * 7.4 + 24 : SOL}
          y={18}
          sagSinir={W - SAG}
          sayilar={kategoriSayilari(anahtar, konumlar.filter((k) => !k.dagitik).map((k) => k.satir))}
        />
      )}

      {/* Bırakma alanı (eksen bandı) */}
      <rect
        x={SOL - 8}
        y={taban - 2}
        width={alanG + 16}
        height={ALT - 6}
        rx={10}
        fill={birakmaUzerinde ? RENK.vurgu : surukleniyor ? RENK.vurgu : 'transparent'}
        fillOpacity={birakmaUzerinde ? 0.22 : surukleniyor ? 0.1 : 0}
        stroke={surukleniyor || birakmaUzerinde ? RENK.vurgu : atanmis ? 'transparent' : RENK.kenar}
        strokeWidth={2}
        strokeDasharray={atanmis && !surukleniyor ? undefined : '6 5'}
        style={{ transition: 'fill-opacity 200ms' }}
      />

      {/* Gruplama kuşakları: her grup [kenar, kenar + aralık) açık / koyu sırayla (TinkerPlots "bins") */}
      {gruplu && eksen && olcek && (
        <g data-gruplar>
          {eksen.isaretler.slice(0, -1).map((v, i) => (
            <rect
              key={`grup-${v}`}
              x={olcek.ileri(v) + 1}
              y={UST - 8}
              width={Math.max(0, olcek.ileri(eksen.isaretler[i + 1]) - olcek.ileri(v) - 2)}
              height={taban - UST + 8}
              rx={4}
              fill={RENK.izgara}
              fillOpacity={i % 2 === 0 ? 0.35 : 0.12}
            />
          ))}
        </g>
      )}

      {/* OMS bandı */}
      {secenekler.oms && ort !== null && oms !== null && olcek && (
        <g>
          <rect
            x={olcek.ileri(ort - oms)}
            y={UST - 6}
            width={Math.max(0, olcek.ileri(ort + oms) - olcek.ileri(ort - oms))}
            height={alanY + 6}
            fill={RENK.vurgu}
            fillOpacity={0.13}
            rx={4}
          />
          <line x1={olcek.ileri(ort - oms)} x2={olcek.ileri(ort - oms)} y1={UST - 6} y2={taban} stroke={RENK.vurgu} strokeDasharray="4 4" />
          <line x1={olcek.ileri(ort + oms)} x2={olcek.ileri(ort + oms)} y1={UST - 6} y2={taban} stroke={RENK.vurgu} strokeDasharray="4 4" />
          <text x={olcek.ileri(ort + oms) + 4} y={UST + 4} fontSize={13} fontWeight={700} fill={RENK.vurgu}>
            OMS = {sayiYaz(oms)}
          </text>
          {/* Nokta başına sapma çizgileri yalnız seyrek, tek sütunlu yığınlarda okunur; yoğun grafikte yalnız bant kalır */}
          {!sutunModu &&
            !yogun &&
            konumlar.length <= COK_NOKTA &&
            konumlar
              .filter((k) => !k.dagitik)
              .map((k) => (
                <line
                  key={`sapma-${k.satir}`}
                  x1={k.x}
                  x2={olcek.ileri(ort)}
                  y1={k.y}
                  y2={k.y}
                  stroke={RENK.mercan}
                  strokeWidth={1.5}
                  strokeOpacity={0.75}
                />
              ))}
        </g>
      )}

      {/* Kategorik ayrık kutucuklar (TinkerPlots "bins") */}
      {kategorik && kutular.length > 0 && (
        <g>
          {kutular.map((k, i) => {
            const kutuG = k.x1 - k.x0;
            const sigan = Math.max(2, Math.floor(kutuG / 8));
            return (
              <g key={`kutu-${k.kategori}`}>
                <rect x={k.x0 + 3} y={UST - 8} width={Math.max(0, kutuG - 6)} height={taban - UST + 8} rx={8} fill={i % 2 === 0 ? RENK.izgara : 'transparent'} fillOpacity={0.35} />
                {sutunModu && (
                  <rect
                    x={k.merkez - Math.min(kutuG * 0.35, 48)}
                    y={taban - 6 - k.yukseklik}
                    width={Math.min(kutuG * 0.7, 96)}
                    height={k.yukseklik + 4}
                    fill={k.renk}
                    fillOpacity={0.9}
                    rx={3}
                  />
                )}
                {(sutunModu || secenekler.etiketler) && (
                  <text x={k.merkez} y={Math.max(UST + 4, taban - 14 - k.yukseklik)} fontSize={13} fontWeight={800} textAnchor="middle" fill={RENK.metin}>
                    {k.sayi}
                  </text>
                )}
                <line x1={k.x1} x2={k.x1} y1={taban} y2={taban + 8} stroke={RENK.metin} strokeWidth={1.2} />
                <text x={k.merkez} y={taban + 20} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.metin}>
                  {k.kategori.length > sigan ? `${k.kategori.slice(0, sigan - 1)}…` : k.kategori}
                </text>
              </g>
            );
          })}
          <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
          <line x1={SOL} x2={SOL} y1={taban} y2={taban + 8} stroke={RENK.metin} strokeWidth={1.2} />
          <text x={W - SAG} y={taban + 38} fontSize={13} fontWeight={700} textAnchor="end" fill={RENK.metin}>
            {sutunAdi} · n = {kategorikHesap?.n ?? 0}
          </text>
        </g>
      )}

      {/* Eksen */}
      {kategorik && kutular.length > 0 ? null : eksen && olcek ? (
        <g>
          <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
          {isaretler.map((v, i) => (
            <g key={v}>
              <line x1={olcek.ileri(v)} x2={olcek.ileri(v)} y1={taban} y2={taban + 6} stroke={RENK.metin} strokeWidth={1.2} />
              {i % etiketAdimi === 0 && (
                <text x={olcek.ileri(v)} y={taban + 20} fontSize={13} textAnchor="middle" fill={RENK.metin}>
                  {sayiYaz(v)}
                </text>
              )}
            </g>
          ))}
          <text x={W - SAG} y={taban + 38} fontSize={13} fontWeight={700} textAnchor="end" fill={RENK.metin}>
            {sutunAdi}
            {gruplu ? `  (grup genişliği ${sayiYaz(aralik)})` : ''}
          </text>
        </g>
      ) : (
        <g>
          <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.kenar} strokeWidth={1.5} strokeDasharray="6 5" />
          <text x={W / 2} y={taban + 26} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
            {atanmis ? `${sutunAdi}: ${kategorik ? 'değer yok' : 'sayısal değer yok'}` : 'Tabloda değişken yok: “+ Sütun” ile bir sayı sütunu ekleyin'}
          </text>
        </g>
      )}

      {/* Frekans sütunları (sütun modu) */}
      {olcek &&
        yiginlar.map((y) => {
          const x = olcek.ileri(y.merkez);
          const genislikSutun = Math.max(8, Math.min(yiginPiksel * 0.82, 64));
          const yukseklikSutun = y.ogeler.length * birim + 4;
          return (
            <g key={`sutun-${y.merkez}`}>
              <g
                style={{
                  transform: `translate(${x - genislikSutun / 2}px, ${taban - 2}px) scaleY(${sutunModu ? yukseklikSutun : 0.001})`,
                  transition: sutunGecis,
                  opacity: sutunModu ? 1 : 0,
                }}
              >
                <rect x={0} y={-1} width={genislikSutun} height={1} fill={RENK.birincil} fillOpacity={0.9} rx={0} />
              </g>
              <text
                x={x}
                y={taban - 2 - yukseklikSutun - 6}
                fontSize={13}
                fontWeight={700}
                textAnchor="middle"
                fill={RENK.metin}
                style={{ opacity: sutunModu ? 1 : 0, transition: sutunGecis }}
              >
                {y.ogeler.length}
              </text>
            </g>
          );
        })}

      {/* Yoğun yığınlarda etiket: nokta başına değer yerine yığın başına sayı (kategorik "Sayıları göster" gibi) */}
      {secenekler.etiketler &&
        !kategorik &&
        yogun &&
        !sutunModu &&
        yiginTepeleri.map((t, i) => (
          <text key={`yigin-sayi-${i}`} x={t.x} y={Math.max(UST + 4, t.y)} fontSize={13} fontWeight={800} textAnchor="middle" fill={RENK.metin} data-yigin-sayisi>
            {t.adet}
          </text>
        ))}

      {/* Değeri olmayan satırlar (değişken atanmışken çizilmez) */}
      {eksik > 0 && konumlar.length > 0 && (
        <text x={SOL} y={taban + 38} fontSize={13} fontWeight={600} fill={RENK.solukMetin} data-eksik-satir>
          {eksik} satırda değer yok
        </text>
      )}

      {/* Ortalama çizgisi */}
      {secenekler.ortalama && ort !== null && olcek && (
        <g>
          <line x1={olcek.ileri(ort)} x2={olcek.ileri(ort)} y1={UST - 10} y2={taban} stroke={RENK.mercan} strokeWidth={2.5} />
          <rect x={olcek.ileri(ort) - 42} y={UST - 26} width={84} height={20} rx={6} fill={RENK.mercan} />
          <text x={olcek.ileri(ort)} y={UST - 12} fontSize={13} fontWeight={700} textAnchor="middle" fill="#ffffff">
            x̄ = {sayiYaz(ort)}
          </text>
        </g>
      )}

      {/* Noktalar */}
      {konumlar.map((k) => {
        const secili = seciliSatir === k.satir;
        const anahtarRengi = anahtar && !k.dagitik ? satirRengi(anahtar, k.satir) : undefined;
        const etiket = satirEtiketi(tablo, k.satir);
        return (
          <g
            key={tablo.satirlar[k.satir]?.id ?? k.satir}
            role="button"
            tabIndex={0}
            aria-label={`${etiket}${k.kategori !== undefined ? `: ${k.kategori}` : k.deger !== null ? `: ${sayiYaz(k.deger)}` : ''}`}
            aria-pressed={secili}
            style={{
              transform: `translate(${k.x}px, ${k.y}px)`,
              transition: gecis,
              opacity: k.opaklik,
              cursor: 'pointer',
              outline: 'none',
              pointerEvents: k.opaklik === 0 ? 'none' : 'auto',
            }}
            onClick={() => onSatirSec(secili ? null : k.satir)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSatirSec(secili ? null : k.satir);
              }
            }}
            onPointerEnter={() => setUstunde(k.satir)}
            onPointerLeave={() => setUstunde((u) => (u === k.satir ? null : u))}
            onFocus={() => setUstunde(k.satir)}
            onBlur={() => setUstunde((u) => (u === k.satir ? null : u))}
          >
            {/* Dokunmatik hedefi büyüt */}
            {!cokNokta && <circle r={Math.max(k.r, 22)} fill="transparent" />}
            <circle
              r={secili ? k.r + 2 : k.r}
              // Renk anahtarı varken seçili nokta kendi renginde kalın koyu halka alır (renk kategoriyi anlatmaya devam eder)
              fill={anahtarRengi ? anahtarRengi : secili ? (k.renk ? RENK.metin : RENK.mercan) : k.dagitik ? RENK.kart : (k.renk ?? RENK.birincil)}
              stroke={secili ? (anahtarRengi ? RENK.metin : k.renk ? RENK.mercan : RENK.metin) : k.dagitik ? RENK.birincil : RENK.kart}
              strokeWidth={secili ? (anahtarRengi ? 3 : 2.5) : k.dagitik ? 2 : k.r < 3 ? 0 : 1}
              style={{
                transition: hareketsiz ? 'none' : 'r 200ms, fill 200ms',
                animation: hareketsiz || k.dagitik ? undefined : `vg-nokta-gir 320ms ${GECIS}`,
              }}
            />
            {secenekler.etiketler && k.deger !== null && !yogun && (
              <text
                y={-k.r - 4 - (yiginPiksel < 30 && k.yiginIndeksi % 2 === 1 ? 12 : 0)}
                fontSize={13}
                fontWeight={600}
                textAnchor="middle"
                fill={RENK.metin}
                style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round' }}
              >
                {sayiYaz(k.deger)}
              </text>
            )}
          </g>
        );
      })}

      {/* Değer balonu */}
      {ustundeki && (
        <g
          style={{ pointerEvents: 'none' }}
          transform={`translate(${Math.min(Math.max(ustundeki.x - balonGenislik / 2, 4), W - balonGenislik - 4)}, ${
            ustundeki.y - ustundeki.r - 34 < 4 ? ustundeki.y + ustundeki.r + 8 : ustundeki.y - ustundeki.r - 34
          })`}
        >
          <rect width={balonGenislik} height={26} rx={8} fill={RENK.metin} fillOpacity={0.92} />
          <text x={balonGenislik / 2} y={17} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.zemin}>
            {balonMetni}
          </text>
        </g>
      )}
    </svg>
  );
}
