'use client';

/**
 * Saçılım grafiği: iki sayısal değişken arasındaki ilişki. Her satır bir nokta (x; y); noktaya tıklayınca
 * tablodaki satır seçilir (iki yönlü). İki değerden biri eksik satırlar çizilmez, sayısı köşeye not düşülür.
 * Eksenler veriye göre güzel adımlarla ve kenar payıyla kurulur (0'dan başlamak zorunda değildir).
 * Balon, noktanın adını ve iki değişkeni birimleriyle yazar: "Gizem · Haftalık çalışma: 7 saat · Matematik puanı: 78".
 */
import React, { useMemo, useState } from 'react';
import { dogrusalOlcek, gosterimOndaligi, payliGuzelEksen, yaziBoyu } from './grafik';
import { satirEtiketi, sayiOku, type VeriTablosu } from './veri';
import { sayiMetni } from './istatistik';
import { GECIS, RENK, adVeBirim, birimli, metinGenisligi, metniSigdir } from './grafikOrtak';
import { kategoriSayilari, kenarGerekir, satirRengi, type RenkEslemesi } from './kategorik';
import { RenkLejanti } from './RenkLejanti';

export interface SacilimGrafigiProps {
  tablo: VeriTablosu;
  /** yatay eksendeki sayısal sütunun indeksi */
  xSutun: number;
  /** dikey eksendeki sayısal sütunun indeksi */
  ySutun: number;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  genislik: number;
  yukseklik: number;
  azaltilmisHareket: boolean;
  /** Renk anahtarı: noktalar kategorik bir değişkene göre renklenir (yoksa tek renk); gruplar tek grafikte, lejantla */
  renkEslemi?: RenkEslemesi | null;
}

const SAG = 28;
/** Bu kadar noktadan sonra geçişler kapanır (akıllı tahtada akıcılık) */
const COK_NOKTA = 400;

interface SacilimNoktasi {
  satir: number;
  x: number;
  y: number;
}

/**
 * Saçılım balonunun satırları: tek satır "Ad · X: 7 saat · Y: 78"; sığmazsa ad üstte, değerler altta; o da sığmazsa
 * üç satır. Birimler sütun adının ayracından gelir ("Haftalık çalışma (saat)" → "Haftalık çalışma: 7 saat").
 */
export function sacilimBalonu(
  ad: string,
  x: { sutunAdi: string; deger: number; ondalik: number },
  y: { sutunAdi: string; deger: number; ondalik: number },
  sigarMi: (satir: string) => boolean = () => true,
): string[] {
  const parca = (p: { sutunAdi: string; deger: number; ondalik: number }) => {
    const { ad: yalin, birim } = adVeBirim(p.sutunAdi);
    return `${yalin}: ${birimli(sayiMetni(p.deger, p.ondalik), birim)}`;
  };
  const xp = parca(x);
  const yp = parca(y);
  const tek = `${ad} · ${xp} · ${yp}`;
  if (sigarMi(tek)) return [tek];
  const degerler = `${xp} · ${yp}`;
  if (sigarMi(degerler)) return [ad, degerler];
  return [ad, xp, yp];
}

export function SacilimGrafigi({
  tablo,
  xSutun,
  ySutun,
  seciliSatir,
  onSatirSec,
  genislik,
  yukseklik,
  azaltilmisHareket,
  renkEslemi = null,
}: SacilimGrafigiProps) {
  const [ustunde, setUstunde] = useState<number | null>(null);
  const W = Math.max(genislik, 240);
  const H = Math.max(yukseklik, 200);
  const fs = yaziBoyu(W);
  const xAd = tablo.sutunlar[xSutun]?.ad ?? '';
  const yAd = tablo.sutunlar[ySutun]?.ad ?? '';

  const renklendirme = renkEslemi;
  const lejantY = fs + 8;
  const UST = (renklendirme ? lejantY + 12 : 0) + fs + 30;
  const ALT = 2 * fs + 26;
  const taban = H - ALT;
  const noktaRengi = (satir: number) => satirRengi(renklendirme, satir) ?? RENK.birincil;

  const noktalar = useMemo(() => {
    const sonuc: SacilimNoktasi[] = [];
    tablo.satirlar.forEach((r, i) => {
      const x = sayiOku(r.hucreler[xSutun] ?? '');
      const y = sayiOku(r.hucreler[ySutun] ?? '');
      if (x !== null && y !== null) sonuc.push({ satir: i, x, y });
    });
    return sonuc;
  }, [tablo, xSutun, ySutun]);
  const eksik = tablo.satirlar.length - noktalar.length;
  const xOndalik = useMemo(() => gosterimOndaligi(noktalar.map((n) => n.x)), [noktalar]);
  const yOndalik = useMemo(() => gosterimOndaligi(noktalar.map((n) => n.y)), [noktalar]);

  const yEksen = noktalar.length > 0 ? payliGuzelEksen(noktalar.map((n) => n.y), Math.max(3, Math.floor((taban - UST) / 48))) : null;
  const yIsaretOndaligi = yEksen ? gosterimOndaligi(yEksen.isaretler, 0, 4) : 0;
  // Sol boşluk dikey eksenin en uzun işaret yazısına göre
  const SOL = yEksen ? Math.max(56, Math.ceil(Math.max(...yEksen.isaretler.map((v) => metinGenisligi(sayiMetni(v, yIsaretOndaligi), fs))) + 18)) : 56;
  const xEksen = noktalar.length > 0 ? payliGuzelEksen(noktalar.map((n) => n.x), Math.max(3, Math.floor((W - SOL - SAG) / 80))) : null;
  const xIsaretOndaligi = xEksen ? gosterimOndaligi(xEksen.isaretler, 0, 4) : 0;
  const xOlcek = xEksen ? dogrusalOlcek(xEksen.min, xEksen.max, SOL, W - SAG) : null;
  const yOlcek = yEksen ? dogrusalOlcek(yEksen.min, yEksen.max, taban, UST) : null;
  const enGenisX = xEksen ? Math.max(...xEksen.isaretler.map((v) => metinGenisligi(sayiMetni(v, xIsaretOndaligi), fs))) : 0;
  const xEtiketAdimi = xEksen
    ? Math.max(1, Math.ceil(xEksen.isaretler.length / Math.max(2, Math.floor((W - SOL - SAG) / Math.max(56, enGenisX + 16)))))
    : 1;
  const hareketsiz = azaltilmisHareket || noktalar.length > COK_NOKTA;

  const vurgulu = noktalar.find((n) => n.satir === (ustunde ?? seciliSatir)) ?? null;
  const balonYazi = 13;
  const balonAlan = W - 16;
  const balonSatirlari = vurgulu
    ? sacilimBalonu(
        satirEtiketi(tablo, vurgulu.satir),
        { sutunAdi: xAd, deger: vurgulu.x, ondalik: xOndalik },
        { sutunAdi: yAd, deger: vurgulu.y, ondalik: yOndalik },
        (satir) => metinGenisligi(satir, balonYazi, true) + 20 <= balonAlan,
      ).map((s) => metniSigdir(s, balonYazi, balonAlan - 20, true))
    : [];
  const balon =
    vurgulu && xOlcek && yOlcek
      ? (() => {
          const g = Math.max(...balonSatirlari.map((s) => metinGenisligi(s, balonYazi, true))) + 20;
          const h = balonSatirlari.length * (balonYazi + 4) + 10;
          const px = xOlcek.ileri(vurgulu.x);
          const py = yOlcek.ileri(vurgulu.y);
          // Aday yerler: üstte, altta, sağda, solda (nokta hiçbirinde kapanmaz); öteki noktaları en az örten ve
          // grafiğin dışına taşmayan seçilir (eşitlikte üst)
          const sinirla = (x: number) => Math.min(Math.max(x, 4), W - g - 4);
          const adaylar = [
            { x: sinirla(px - g / 2), y: py - 14 - h },
            { x: sinirla(px - g / 2), y: py + 14 },
            { x: px + 14, y: py - h / 2 },
            { x: px - 14 - g, y: py - h / 2 },
          ];
          const puan = (a: { x: number; y: number }) => {
            let t = 0;
            if (a.y < 4 || a.y + h > H - 4 || a.x < 4 || a.x + g > W - 4) t += 1000;
            // Eksen yazılarının (alttaki sayılar, soldaki sayılar) üstüne binmek bir noktayı örtmekten kötü
            if (a.y + h > taban + 2 || a.x < SOL - 2) t += 3;
            for (const q of noktalar) {
              if (q.satir === vurgulu.satir) continue;
              const qx = xOlcek.ileri(q.x);
              const qy = yOlcek.ileri(q.y);
              if (qx > a.x - 8 && qx < a.x + g + 8 && qy > a.y - 8 && qy < a.y + h + 8) t += 1;
            }
            return t;
          };
          const enIyi = adaylar.reduce((m, a) => (puan(a) < puan(m) ? a : m), adaylar[0]);
          return { g, h, x: enIyi.x, y: enIyi.y };
        })()
      : null;

  return (
    <svg
      data-grafik="sacilim"
      role="img"
      aria-label={`Saçılım grafiği: yatay ${xAd}, dikey ${yAd}`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {xEksen && yEksen && xOlcek && yOlcek ? (
        <g>
          {/* Izgara ve eksen işaretleri */}
          {yEksen.isaretler.map((v) => (
            <g key={`y-${v}`}>
              <line x1={SOL} x2={W - SAG} y1={yOlcek.ileri(v)} y2={yOlcek.ileri(v)} stroke={RENK.izgara} />
              <text x={SOL - 8} y={yOlcek.ileri(v) + fs * 0.35} fontSize={fs} textAnchor="end" fill={RENK.metin}>
                {sayiMetni(v, yIsaretOndaligi)}
              </text>
            </g>
          ))}
          {xEksen.isaretler.map((v, i) => (
            <g key={`x-${v}`}>
              <line x1={xOlcek.ileri(v)} x2={xOlcek.ileri(v)} y1={UST} y2={taban} stroke={RENK.izgara} />
              {i % xEtiketAdimi === 0 && (
                <text x={xOlcek.ileri(v)} y={taban + fs + 6} fontSize={fs} textAnchor="middle" fill={RENK.metin}>
                  {sayiMetni(v, xIsaretOndaligi)}
                </text>
              )}
            </g>
          ))}
          <line x1={SOL} x2={SOL} y1={UST} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
          <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
          {/* Renk anahtarı lejantı: kategori, rengi ve çizilen nokta sayısı (gruplar tek grafikte ayırt edilsin) */}
          {renklendirme && (
            <RenkLejanti eslem={renklendirme} x={SOL} y={lejantY} sagSinir={W - SAG} sayilar={kategoriSayilari(renklendirme, noktalar.map((n) => n.satir))} />
          )}

          {/* Eksen adları: hangisinin yatay, hangisinin dikey olduğu okunsun */}
          <text x={SOL} y={UST - 14} fontSize={fs} fontWeight={700} fill={RENK.metin} data-eksen="y">
            ↑ {metniSigdir(yAd, fs, W - SOL - SAG - 20, true)}
          </text>
          <text x={W - SAG} y={taban + 2 * fs + 14} fontSize={fs} fontWeight={700} textAnchor="end" fill={RENK.metin} data-eksen="x">
            {metniSigdir(xAd, fs, (W - SOL - SAG) * 0.6, true)} →
          </text>

          {/* Noktalar */}
          {noktalar.map((n) => {
            const secili = seciliSatir === n.satir;
            return (
              <g
                key={tablo.satirlar[n.satir]?.id ?? n.satir}
                role="button"
                tabIndex={0}
                aria-label={`${satirEtiketi(tablo, n.satir)}: ${xAd} ${sayiMetni(n.x, xOndalik)}, ${yAd} ${sayiMetni(n.y, yOndalik)}${
                  renklendirme && renklendirme.sutun !== 0 ? `, ${renklendirme.ad} ${renklendirme.satirKategorisi.get(n.satir) ?? '(boş)'}` : ''
                }`}
                aria-pressed={secili}
                style={{
                  transform: `translate(${xOlcek.ileri(n.x)}px, ${yOlcek.ileri(n.y)}px)`,
                  transition: hareketsiz ? 'none' : `transform 300ms ${GECIS}`,
                  cursor: 'pointer',
                  outline: 'none',
                }}
                onClick={() => onSatirSec(secili ? null : n.satir)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSatirSec(secili ? null : n.satir);
                  }
                }}
                onPointerEnter={() => setUstunde(n.satir)}
                onPointerLeave={() => setUstunde((u) => (u === n.satir ? null : u))}
                onFocus={() => setUstunde(n.satir)}
                onBlur={() => setUstunde((u) => (u === n.satir ? null : u))}
              >
                {!hareketsiz && <circle r={16} fill="transparent" />}
                {/* Seçili nokta: kendi renginde, kalın koyu halkalı (renk kategoriyi anlatmaya devam eder) */}
                <circle
                  r={secili ? 9 : 7}
                  fill={noktaRengi(n.satir)}
                  fillOpacity={secili ? 1 : 0.88}
                  stroke={secili || kenarGerekir(noktaRengi(n.satir)) ? RENK.metin : RENK.kart}
                  strokeWidth={secili ? 3 : 1.5}
                />
              </g>
            );
          })}

          {/* Değer balonu: ad ve iki değişken, birimleriyle */}
          {balon && (
            <g style={{ pointerEvents: 'none' }} transform={`translate(${balon.x}, ${balon.y})`} data-sacilim-balonu>
              <rect width={balon.g} height={balon.h} rx={8} fill={RENK.metin} fillOpacity={0.94} />
              {balonSatirlari.map((s, k) => (
                <text
                  key={k}
                  x={balon.g / 2}
                  y={5 + (k + 1) * (balonYazi + 4) - 3}
                  fontSize={balonYazi}
                  fontWeight={k === 0 && balonSatirlari.length > 1 ? 800 : 700}
                  textAnchor="middle"
                  fill={RENK.zemin}
                >
                  {s}
                </text>
              ))}
            </g>
          )}
        </g>
      ) : (
        <text x={W / 2} y={H / 2} fontSize={fs} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          {metniSigdir('Çizilecek nokta yok: aynı satırda iki değişkenin de değeri olmalı', fs, W - 32, true)}
        </text>
      )}

      {eksik > 0 && noktalar.length > 0 && (
        <text x={SOL} y={taban + 2 * fs + 14} fontSize={fs} fontWeight={600} fill={RENK.solukMetin} data-eksik-satir>
          {eksik} satırda değer eksik
        </text>
      )}
    </svg>
  );
}
