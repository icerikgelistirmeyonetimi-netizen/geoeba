'use client';

/**
 * Daire grafiği: değerler oransal dilimler; her dilimde merkez açı (°) ve yüzde (%) eş zamanlı.
 * Dilim sınırını (tutamacı) sürükleyince o dilim büyür/küçülür, diğerleri toplam sabit kalacak biçimde
 * orantılı ölçeklenir ve tablo güncellenir. Lejant sağda (dar pencerede altta).
 * Renk anahtarı: satır dilimleri satırın kategori rengini alır, üstteki lejantta her kategorinin toplamdaki payı
 * yazar. Kategorik dilimlerde (frekans) anahtar başka bir değişkense dışta ince bir halka dilimi ona göre böler.
 */
import React, { useMemo, useRef, useState } from 'react';
import { daireDilimleri, dilimYolu, halkaYolu, isaretciAcisi, kutupNoktasi, seriRengi, sinirSurukle } from './grafik';
import { BOS_KATEGORI_RENGI, satirRengi, type RenkEslemesi } from './kategorik';
import { RenkLejanti, renkLejantiGenisligi } from './RenkLejanti';
import { gecerliDegerler, satirEtiketi, sayiYaz, type VeriTablosu } from './veri';
import { GECIS, RENK, svgKonumu } from './ortak';

export interface DaireGrafigiProps {
  tablo: VeriTablosu;
  sutun: number;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  /** Sürükleme sonucu tüm dilimlerin yeni değerleri (satır indeksi → değer) */
  onDegerlerDegis: (sutun: number, degerler: { satir: number; deger: number }[]) => void;
  genislik: number;
  yukseklik: number;
  azaltilmisHareket: boolean;
  /** Kategorik frekans dilimleri: sınır sürükleme kapalı, açıklama gösterilir */
  surukleKapali?: boolean;
  aciklama?: string;
  /** Dilim renkleri (verilmezse seri renkleri) */
  renkler?: string[];
  /** Renk anahtarı (satır dilimleri): her dilim satırının kategori renginde */
  renkEslemi?: RenkEslemesi | null;
  /** Kategorik dilimlerde dış halka: dilim satırı → anahtar kategorilerine göre sayılar (eslem sırasıyla, sonda anahtarı boş olanlar) */
  halka?: { eslem: RenkEslemesi; sayilar: Map<number, number[]> } | null;
}

export function DaireGrafigi({
  tablo,
  sutun,
  seciliSatir,
  onSatirSec,
  onDegerlerDegis,
  genislik,
  yukseklik,
  azaltilmisHareket,
  surukleKapali = false,
  aciklama,
  renkler,
  renkEslemi = null,
  halka = null,
}: DaireGrafigiProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [surukle, setSurukle] = useState<number | null>(null);
  const [odak, setOdak] = useState<number | null>(null);
  const [ustunde, setUstunde] = useState<number | null>(null);

  const W = Math.max(genislik, 240);
  const H = Math.max(yukseklik, 220);
  const noktalar = useMemo(() => gecerliDegerler(tablo, sutun), [tablo, sutun]);
  const dilimler = useMemo(() => daireDilimleri(noktalar), [noktalar]);
  const toplam = noktalar.reduce((t, n) => t + (n.deger > 0 ? n.deger : 0), 0);
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '';
  /** Negatif değer bir bütünün parçası olamaz: sessizce 0 saymak yerine grafik çizilmez ve nedeni yazılır */
  const negatif = noktalar.find((n) => n.deger < 0);

  if (negatif) {
    return (
      <svg data-grafik="daire" role="img" aria-label={`${sutunAdi} daire grafiği çizilemedi`} width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block select-none bg-card" style={{ fontFamily: 'Manrope, sans-serif' }}>
        <text x={16} y={18} fontSize={13} fontWeight={700} fill={RENK.metin}>
          {sutunAdi}
        </text>
        <text x={W / 2} y={H / 2 - 10} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.metin} data-daire-negatif>
          Daire grafiği negatif değer gösteremez
        </text>
        <text x={W / 2} y={H / 2 + 12} fontSize={13} textAnchor="middle" fill={RENK.solukMetin}>
          {satirEtiketi(tablo, negatif.satir)}: {sayiYaz(negatif.deger)} · Her dilim bir bütünün parçası olmalı; sütun ya da çizgi grafiğini deneyin.
        </text>
      </svg>
    );
  }

  const lejantSagda = W >= 520;
  const lejantG = lejantSagda ? Math.min(220, W * 0.36) : 0;
  const lejantY = lejantSagda ? 0 : Math.min(H * 0.32, 24 * dilimler.length + 8);

  // Renk anahtarı: satır dilimlerinde kategori rengi, kategorik dilimlerde dış halka; lejant başlığın yanında
  // (sığmazsa açıklamanın altında, daire o kadar aşağı iner)
  const anahtar = renkEslemi && renkEslemi.sutun !== sutun && renkEslemi.sutun >= 0 && renkEslemi.sutun < tablo.sutunlar.length ? renkEslemi : null;
  const lejantEslemi = halka?.eslem ?? anahtar;
  const dilimRengi = (satir: number, i: number) => (anahtar ? satirRengi(anahtar, satir) ?? BOS_KATEGORI_RENGI : renkler?.[i] ?? seriRengi(i));
  let paylar: Map<string, string> | undefined;
  if (anahtar && toplam > 0) {
    const kategoriToplami = new Map<string, number>();
    for (const n of noktalar) {
      const k = anahtar.satirKategorisi.get(n.satir);
      if (k !== undefined && n.deger > 0) kategoriToplami.set(k, (kategoriToplami.get(k) ?? 0) + n.deger);
    }
    paylar = new Map(anahtar.kategoriler.map((k) => [k, `%${sayiYaz(((kategoriToplami.get(k) ?? 0) / toplam) * 100, 1)}`]));
  }
  const halkaSayilari = halka
    ? new Map(halka.eslem.kategoriler.map((k, j) => [k, [...halka.sayilar.values()].reduce((t, s) => t + (s[j] ?? 0), 0)]))
    : undefined;
  const baslikMetni = `${sutunAdi}${toplam > 0 ? `  · toplam ${sayiYaz(toplam)}` : ''}`;
  const lejantBaslikta =
    lejantEslemi !== null && 16 + baslikMetni.length * 7.4 + 20 + renkLejantiGenisligi(lejantEslemi, halkaSayilari, paylar) <= W - 16;
  const anahtarLejantY = lejantBaslikta ? 18 : aciklama ? 58 : 38;
  const ustEk = lejantEslemi && !lejantBaslikta && aciklama ? 22 : 0;
  const halkaPayi = halka ? 20 : 0;

  const cx = (W - lejantG) / 2;
  const cy = 24 + ustEk + (H - lejantY - 24 - ustEk) / 2;
  const r = Math.max(40, Math.min((W - lejantG) / 2 - 36, (H - lejantY - 24 - ustEk) / 2 - 28) - halkaPayi);
  const gecis = azaltilmisHareket || surukle !== null ? 'none' : `d 300ms ${GECIS}`;

  const isaretciHareket = (e: React.PointerEvent<SVGElement>) => {
    if (surukle === null || !svgRef.current) return;
    const { x, y } = svgKonumu(svgRef.current, e.clientX, e.clientY);
    const aci = isaretciAcisi(cx, cy, x, y);
    const yeni = sinirSurukle(
      noktalar.map((n) => n.deger),
      surukle,
      aci,
    );
    onDegerlerDegis(
      sutun,
      yeni.map((deger, i) => ({ satir: noktalar[i].satir, deger })),
    );
  };

  const surukleBaslat = (e: React.PointerEvent<SVGElement>, i: number) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setSurukle(i);
    onSatirSec(noktalar[i].satir);
  };

  const surukleBitir = (e: React.PointerEvent<SVGElement>) => {
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    setSurukle(null);
  };

  const lejantOgeleri = dilimler.map((d, i) => ({
    d,
    i,
    renk: dilimRengi(d.satir, i),
    etiket: satirEtiketi(tablo, d.satir),
    secili: seciliSatir === d.satir,
  }));
  // Lejant kaba sığmalı: çok dilimde satır aralığı 17 px'e iner, yine sığmazsa kalanlar "… ve k dilim daha" olur
  const lejantAlan = lejantSagda ? H - 36 - ustEk - 6 : lejantY - 4;
  const lejantSatirSayisi = Math.max(1, lejantSagda ? lejantOgeleri.length : Math.ceil(lejantOgeleri.length / 2));
  const lejantSatirYuk = Math.min(24, Math.max(17, Math.floor(lejantAlan / lejantSatirSayisi)));
  const sigacakOge = Math.max(1, Math.floor(lejantAlan / lejantSatirYuk)) * (lejantSagda ? 1 : 2);
  const lejantKirpildi = lejantOgeleri.length > sigacakOge;
  const gosterilenLejant = lejantKirpildi ? lejantOgeleri.slice(0, Math.max(1, sigacakOge - (lejantSagda ? 1 : 2))) : lejantOgeleri;

  return (
    <svg
      ref={svgRef}
      data-grafik="daire"
      role="img"
      aria-label={`${sutunAdi} daire grafiği`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif', touchAction: 'none' }}
    >
      <text x={16} y={18} fontSize={13} fontWeight={700} fill={RENK.metin}>
        {baslikMetni}
      </text>
      {lejantEslemi && (
        <RenkLejanti
          eslem={lejantEslemi}
          x={lejantBaslikta ? 16 + baslikMetni.length * 7.4 + 20 : 16}
          y={anahtarLejantY}
          sagSinir={lejantBaslikta || !lejantSagda ? W - 16 : W - lejantG - 8}
          sayilar={halkaSayilari}
          ekler={paylar}
        />
      )}
      {aciklama && (
        <text x={16} y={38} fontSize={13} fill={RENK.solukMetin}>
          {aciklama}
        </text>
      )}

      {toplam <= 0 && (
        <text x={cx} y={cy} fontSize={13} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Daire için pozitif değerler gerekir
        </text>
      )}

      {/* Dilimler */}
      {dilimler.map((d, i) => {
        const secili = seciliSatir === d.satir;
        const aktif = secili || ustunde === i || surukle === i;
        // Dış halka varken dilim büyümez (halkaya binmesin); vurgu opaklıkla kalır
        const yol = dilimYolu(cx, cy, r + (aktif && !halka ? 6 : 0), d.baslangicAci, d.bitisAci);
        if (!yol) return null;
        return (
          <path
            key={tablo.satirlar[d.satir]?.id ?? d.satir}
            d={yol}
            fill={dilimRengi(d.satir, i)}
            fillOpacity={aktif ? 1 : 0.88}
            stroke={RENK.kart}
            strokeWidth={2}
            style={{ cursor: 'pointer', transition: gecis }}
            onClick={() => onSatirSec(secili ? null : d.satir)}
            onPointerEnter={() => setUstunde(i)}
            onPointerLeave={() => setUstunde((u) => (u === i ? null : u))}
          />
        );
      })}

      {/* Dış halka: her kategorik dilim, renk anahtarının kategorilerine oranla bölünür */}
      {halka && toplam > 0 && (
        <g data-halka>
          {dilimler.map((d) => {
            const sayilar = halka.sayilar.get(d.satir);
            const t = sayilar ? sayilar.reduce((a, b) => a + b, 0) : 0;
            if (!sayilar || t <= 0 || d.aci <= 0) return null;
            let a0 = d.baslangicAci;
            return sayilar.map((c, j) => {
              if (c <= 0) return null;
              const a1 = a0 + (d.aci * c) / t;
              const yol = halkaYolu(cx, cy, r + 5, r + 17, a0, a1);
              a0 = a1;
              const ad = j < halka.eslem.kategoriler.length ? halka.eslem.kategoriler[j] : null;
              const renk = ad === null ? BOS_KATEGORI_RENGI : halka.eslem.renkler.get(ad) ?? BOS_KATEGORI_RENGI;
              return (
                <path key={`${d.satir}-${j}`} d={yol} fill={renk} fillRule="evenodd" stroke={RENK.kart} strokeWidth={1.5} data-halka-parcasi>
                  <title>{`${satirEtiketi(tablo, d.satir)} · ${halka.eslem.ad} ${ad ?? '(boş)'}: ${c}`}</title>
                </path>
              );
            });
          })}
        </g>
      )}

      {/* Dilim içi etiketler: açı ve yüzde */}
      {dilimler.map((d, i) => {
        if (d.aci < 18) return null;
        const orta = (d.baslangicAci + d.bitisAci) / 2;
        const p = kutupNoktasi(cx, cy, r * (d.aci < 40 ? 0.78 : 0.62), orta);
        const kucuk = d.aci < 30;
        // Açısı yeterli her dilimde ad yazılır (küçük dilimlerin adı lejantta)
        const adYaz = d.aci >= 60;
        return (
          <g key={`etiket-${tablo.satirlar[d.satir]?.id ?? d.satir}`} style={{ pointerEvents: 'none' }}>
            <text x={p.x} y={p.y - (kucuk ? 0 : 4)} fontSize={13} fontWeight={800} textAnchor="middle" fill="#ffffff">
              {sayiYaz(d.aci, 1)}°
            </text>
            {!kucuk && (
              <text x={p.x} y={p.y + 13} fontSize={13} fontWeight={700} textAnchor="middle" fill="#ffffff" fillOpacity={0.95}>
                %{sayiYaz(d.yuzde, 1)}
              </text>
            )}
            {adYaz && (
              <text x={p.x} y={p.y + 28} fontSize={13} textAnchor="middle" fill="#ffffff" fillOpacity={0.9}>
                {satirEtiketi(tablo, d.satir).length > 14 ? `${satirEtiketi(tablo, d.satir).slice(0, 13)}…` : satirEtiketi(tablo, d.satir)}
              </text>
            )}
          </g>
        );
      })}

      {/* Sınır çizgileri (dekoratif) */}
      {toplam > 0 &&
        dilimler.length >= 2 &&
        dilimler.map((d, i) => {
          const p = kutupNoktasi(cx, cy, r, d.bitisAci);
          return <line key={`cizgi-${tablo.satirlar[d.satir]?.id ?? d.satir}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={RENK.kart} strokeWidth={surukle === i ? 3 : 2} style={{ pointerEvents: 'none' }} />;
        })}

      {/* Sınır tutamaçları */}
      {toplam > 0 &&
        !surukleKapali &&
        dilimler.map((d, i) => {
          if (dilimler.length < 2) return null;
          const p = kutupNoktasi(cx, cy, r, d.bitisAci);
          const odakli = odak === i;
          const aktif = surukle === i || odakli;
          return (
            <g
              key={`sinir-${tablo.satirlar[d.satir]?.id ?? d.satir}`}
              role="slider"
              onFocus={() => setOdak(i)}
              onBlur={() => setOdak((o) => (o === i ? null : o))}
              tabIndex={0}
              aria-label={`${satirEtiketi(tablo, d.satir)} dilim sınırı: ${sayiYaz(d.aci, 1)}°, %${sayiYaz(d.yuzde, 1)}. Sürükleyerek ya da ok tuşlarıyla değiştirin`}
              aria-valuenow={Math.round(d.aci)}
              aria-valuemin={0}
              aria-valuemax={360}
              style={{ cursor: 'grab', outline: 'none' }}
              onPointerDown={(e) => surukleBaslat(e, i)}
              onPointerMove={isaretciHareket}
              onPointerUp={surukleBitir}
              onPointerCancel={surukleBitir}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                e.preventDefault();
                const yon = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : -1;
                const hedefAci = i === dilimler.length - 1 ? 360 - (d.aci + yon * 2) : d.bitisAci + yon * 2;
                const yeni = sinirSurukle(
                  noktalar.map((n) => n.deger),
                  i,
                  hedefAci,
                );
                onDegerlerDegis(
                  sutun,
                  yeni.map((deger, k) => ({ satir: noktalar[k].satir, deger })),
                );
              }}
            >
              <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
              {/* Klavye odağı: belirgin halka (WCAG 2.4.7) */}
              {odakli && <circle cx={p.x} cy={p.y} r={16} fill="none" stroke={RENK.vurgu} strokeWidth={3} data-odak-halkasi />}
              <circle cx={p.x} cy={p.y} r={aktif ? 11 : 9} fill={RENK.kart} stroke={RENK.metin} strokeWidth={2.5} />
              <circle cx={p.x} cy={p.y} r={3.5} fill={RENK.metin} />
            </g>
          );
        })}

      {/* Lejant */}
      <g transform={lejantSagda ? `translate(${W - lejantG + 8}, ${36 + ustEk})` : `translate(16, ${H - lejantY + 4})`}>
        {gosterilenLejant.map((o, k) => {
          const satirYuk = lejantSatirYuk;
          const x = lejantSagda ? 0 : (k % 2) * ((W - 32) / 2);
          const y = lejantSagda ? k * satirYuk : Math.floor(k / 2) * satirYuk;
          const metin = `${o.etiket}: ${sayiYaz(o.d.deger)} (${sayiYaz(o.d.aci, 1)}°, %${sayiYaz(o.d.yuzde, 1)})`;
          return (
            <g
              key={tablo.satirlar[o.d.satir]?.id ?? o.i}
              transform={`translate(${x}, ${y})`}
              style={{ cursor: 'pointer' }}
              onClick={() => onSatirSec(o.secili ? null : o.d.satir)}
              onPointerEnter={() => setUstunde(o.i)}
              onPointerLeave={() => setUstunde((u) => (u === o.i ? null : u))}
            >
              <rect x={-6} y={-4} width={lejantSagda ? lejantG - 8 : (W - 32) / 2 - 4} height={satirYuk - 2} rx={6} fill={o.secili ? RENK.vurgu : 'transparent'} fillOpacity={0.18} />
              <rect width={14} height={14} rx={4} fill={o.renk} />
              <text x={20} y={12} fontSize={13} fontWeight={o.secili ? 800 : 600} fill={RENK.metin}>
                {metin.length > 30 && lejantSagda ? `${metin.slice(0, 29)}…` : metin}
              </text>
            </g>
          );
        })}
        {lejantKirpildi && (
          <text
            x={0}
            y={(lejantSagda ? gosterilenLejant.length : Math.ceil(gosterilenLejant.length / 2)) * lejantSatirYuk + 12}
            fontSize={13}
            fontWeight={600}
            fill={RENK.solukMetin}
            data-lejant-kirpildi
          >
            … ve {lejantOgeleri.length - gosterilenLejant.length} dilim daha
          </text>
        )}
      </g>
    </svg>
  );
}
