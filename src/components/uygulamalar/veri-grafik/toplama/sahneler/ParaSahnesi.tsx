'use client';

/**
 * Madenî para sahnesi (VT §11.3, K8). viewBox 200 × 200, `boyut` piksele ölçeklenir.
 * - Çizim: disk, altında koyu tonlu kalınlık (para kalınlığı), 3 px kenar, beyaz eğim halkası, kesikli iç halka,
 *   sol üstte parlama, gömme gölgeli "YAZI" / "TURA" yazısı. Dolgu yüzün kategori rengidir (kategoriRengi):
 *   para, nokta, tablo şeridi ve kutucuk aynı rengi taşır. Hiç atış yokken altın gradyan ve "?".
 * - Atış (T): %0–55 yukarı 36 birimlik yay; bu sırada scaleY 1 → 0,08 → 1 üç kez, her incelmede yüz değişir;
 *   %55'te sonuç yüzü görünür; %55–80 düşer ve 6 birim sekerek durur. Satır %80'de yazılır (çalıştırıcı).
 * - Canlandırma Web Animations ile transform / opacity üzerinden yapılır; bitince (fill: none) durağan çizim
 *   (sonuç yüzü) kalır. Azaltılmış harekette canlandırma yoktur. pause / currentTime ile kare alınabilir.
 */
import React, { useId, useRef } from 'react';
import { useCizimEtkisi } from '../kancalar';
import { rengeGoreMetin } from '../../kategorik';
import { koyulastir, svgYaziBoyu } from '../bicim';

export interface ParaYuzu {
  etiket: string;
  renk: string;
}

export interface ParaAtisi {
  /** Her yeni atışta artan anahtar (canlandırmayı tetikler) */
  anahtar: number;
  /** Atış süresi (ms) */
  sure: number;
}

export interface ParaSahnesiProps {
  /** Çizim boyu (px) */
  boyut: number;
  yuzler: readonly [ParaYuzu, ParaYuzu];
  /** Görünen yüz (son sonuç); null → henüz atış yok (altın "?") */
  sonuc: string | null;
  atis?: ParaAtisi | null;
  azaltilmisHareket?: boolean;
}

/** Zaman çizelgesi (0–1): yüzün değiştiği üç incelme anı, dönüşün bitişi, sekme ve duruş */
export const PARA_ZAMANLARI = {
  incelmeler: [0.0917, 0.275, 0.4583] as const,
  donusBitis: 0.55,
  sekme: 0.66,
  durus: 0.8,
};

export const PARA_ALTIN = '#b9884a';
const CX = 100;
const CY = 100;
const R = 74;
const KALINLIK = 5.5;

function yuzIndeksi(yuzler: readonly [ParaYuzu, ParaYuzu], sonuc: string | null): 0 | 1 | 2 {
  if (sonuc === null) return 2;
  if (sonuc === yuzler[0].etiket) return 0;
  if (sonuc === yuzler[1].etiket) return 1;
  return 2;
}

function ParaYuzuCizimi({ renk, metin, dolgu, yaziBoyu }: { renk: string; metin: string; dolgu: string; yaziBoyu: number }) {
  const yaziRengi = rengeGoreMetin(renk);
  const gomme = koyulastir(renk, 0.55);
  const yaziY = CY + yaziBoyu * 0.36;
  return (
    <>
      {/* Kalınlık: alt kenarda koyu tonlu hilal (para havada incelirken kenarı görünür) */}
      <circle cx={CX} cy={CY + KALINLIK} r={R} fill={koyulastir(renk, 0.4)} />
      <circle cx={CX} cy={CY} r={R} fill={dolgu} stroke="rgba(21,48,45,0.35)" strokeWidth={3} />
      {/* Eğim halkası ve kesikli iç halka */}
      <circle cx={CX} cy={CY} r={R - 6} fill="none" stroke="#ffffff" strokeOpacity={0.24} strokeWidth={2.5} />
      <circle cx={CX} cy={CY} r={R - 13} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="4 3" />
      {/* İç halkanın altında hafif gölge: kabartma duygusu */}
      <path
        d={`M ${CX - (R - 15)} ${CY + 6} A ${R - 15} ${R - 15} 0 0 0 ${CX + (R - 15)} ${CY + 6}`}
        fill="none"
        stroke={gomme}
        strokeOpacity={0.22}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <ellipse cx={CX - 27} cy={CY - 36} rx={31} ry={14} transform={`rotate(-32 ${CX - 27} ${CY - 36})`} fill="#ffffff" fillOpacity={0.18} />
      <text
        x={CX}
        y={yaziY + 1.8}
        textAnchor="middle"
        fontSize={yaziBoyu}
        fontWeight={800}
        fill={gomme}
        fillOpacity={0.45}
        style={{ letterSpacing: '0.04em' }}
      >
        {metin}
      </text>
      <text x={CX} y={yaziY} textAnchor="middle" fontSize={yaziBoyu} fontWeight={800} fill={yaziRengi} style={{ letterSpacing: '0.04em' }}>
        {metin}
      </text>
    </>
  );
}

/**
 * Durağan para (Elle kaydet kutucukları): sahnedeki paranın aynısı, yüz rengi ve "YAZI" / "TURA" yazısıyla; viewBox
 * yalnız diski ve kalınlığını kapsar (kutucukta boşluk kalmaz). Yazı en az 12 px okunur.
 */
export function ParaResmi({ boyut, renk, metin }: { boyut: number; renk: string; metin: string }) {
  const G = 156;
  const Y = 162;
  return (
    <svg viewBox={`${CX - G / 2} ${CY - R - 4} ${G} ${Y}`} width={boyut} height={(boyut * Y) / G} className="block shrink-0" aria-hidden="true" focusable="false">
      <ParaYuzuCizimi renk={renk} dolgu={renk} metin={metin.toLocaleUpperCase('tr')} yaziBoyu={svgYaziBoyu(30, boyut, G, 12)} />
    </svg>
  );
}

export function ParaSahnesi({ boyut, yuzler, sonuc, atis = null, azaltilmisHareket = false }: ParaSahnesiProps) {
  const kimlik = useId().replace(/:/g, '');
  const altinId = `vg-para-altin-${kimlik}`;
  const gorunen = yuzIndeksi(yuzler, sonuc);
  const atlaRef = useRef<SVGGElement>(null);
  const cevirRef = useRef<SVGGElement>(null);
  const golgeRef = useRef<SVGEllipseElement>(null);
  const yuzRefleri = useRef<(SVGGElement | null)[]>([null, null, null]);
  const oncekiRef = useRef<0 | 1 | 2>(gorunen);

  const anahtar = atis?.anahtar ?? null;
  const sure = atis?.sure ?? 0;

  useCizimEtkisi(() => {
    if (anahtar === null || azaltilmisHareket || sure <= 0) return;
    const atla = atlaRef.current;
    const cevir = cevirRef.current;
    if (!atla || !cevir || typeof atla.animate !== 'function') return;
    const bas = oncekiRef.current;
    const son = gorunen;
    const diger: 0 | 1 = son === 0 ? 1 : 0;
    // Yüz dizisi: [0, c1) önceki yüz · [c1, c2) sonuç · [c2, c3) öbür yüz · [c3, 1] sonuç
    const dizi = [bas, son === 2 ? 0 : son, diger, son];
    const [c1, c2, c3] = PARA_ZAMANLARI.incelmeler;
    const secenek: KeyframeAnimationOptions = { duration: sure, fill: 'none' };
    const animler: Animation[] = [];
    animler.push(
      atla.animate(
        [
          { offset: 0, transform: 'translateY(0px) rotate(0deg)', easing: 'cubic-bezier(.2,.7,.4,1)' },
          { offset: 0.275, transform: 'translateY(-36px) rotate(-8deg)', easing: 'cubic-bezier(.6,0,.85,.45)' },
          { offset: PARA_ZAMANLARI.donusBitis, transform: 'translateY(0px) rotate(3deg)', easing: 'cubic-bezier(.2,.7,.4,1)' },
          { offset: PARA_ZAMANLARI.sekme, transform: 'translateY(-6px) rotate(-1deg)', easing: 'cubic-bezier(.6,0,.85,.45)' },
          { offset: PARA_ZAMANLARI.durus, transform: 'translateY(0px) rotate(0deg)' },
          { offset: 1, transform: 'translateY(0px) rotate(0deg)' },
        ],
        secenek,
      ),
    );
    animler.push(
      cevir.animate(
        [
          { offset: 0, transform: 'scaleY(1)', easing: 'ease-in' },
          { offset: c1, transform: 'scaleY(0.08)', easing: 'ease-out' },
          { offset: 0.1833, transform: 'scaleY(1)', easing: 'ease-in' },
          { offset: c2, transform: 'scaleY(0.08)', easing: 'ease-out' },
          { offset: 0.3667, transform: 'scaleY(1)', easing: 'ease-in' },
          { offset: c3, transform: 'scaleY(0.08)', easing: 'ease-out' },
          { offset: PARA_ZAMANLARI.donusBitis, transform: 'scaleY(1)' },
          { offset: 1, transform: 'scaleY(1)' },
        ],
        secenek,
      ),
    );
    const golge = golgeRef.current;
    if (golge) {
      animler.push(
        golge.animate(
          [
            { offset: 0, transform: 'scale(1)', opacity: 1, easing: 'cubic-bezier(.2,.7,.4,1)' },
            { offset: 0.275, transform: 'scale(0.6)', opacity: 0.5, easing: 'cubic-bezier(.6,0,.85,.45)' },
            { offset: PARA_ZAMANLARI.donusBitis, transform: 'scale(1)', opacity: 1 },
            { offset: PARA_ZAMANLARI.sekme, transform: 'scale(0.9)', opacity: 0.85 },
            { offset: PARA_ZAMANLARI.durus, transform: 'scale(1)', opacity: 1 },
            { offset: 1, transform: 'scale(1)', opacity: 1 },
          ],
          secenek,
        ),
      );
    }
    yuzRefleri.current.forEach((el, f) => {
      if (!el) return;
      const o = (x: number) => (x === f ? 1 : 0);
      animler.push(
        el.animate(
          [
            { offset: 0, opacity: o(dizi[0]), easing: 'steps(1, end)' },
            { offset: c1, opacity: o(dizi[1]), easing: 'steps(1, end)' },
            { offset: c2, opacity: o(dizi[2]), easing: 'steps(1, end)' },
            { offset: c3, opacity: o(dizi[3]) },
            { offset: 1, opacity: o(dizi[3]) },
          ],
          secenek,
        ),
      );
    });
    return () => animler.forEach((a) => a.cancel());
    // Yalnız yeni atışta çalışır (anahtar); görünen yüz aynı çizimde gelir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar]);

  // Bir sonraki atışın başlangıç yüzü (canlandırma etkisinden sonra güncellenir)
  useCizimEtkisi(() => {
    oncekiRef.current = gorunen;
  }, [gorunen]);

  const yaziBoyu = svgYaziBoyu(30, boyut, 200, 13);
  const merkez: React.CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' };

  return (
    <svg
      viewBox="0 0 200 200"
      width={boyut}
      height={boyut}
      overflow="visible"
      className="block"
      aria-hidden="true"
      focusable="false"
      data-para-yuzu={gorunen === 2 ? '' : yuzler[gorunen].etiket}
    >
      <defs>
        <linearGradient id={altinId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d7ab66" />
          <stop offset="0.55" stopColor="#c99a52" />
          <stop offset="1" stopColor={PARA_ALTIN} />
        </linearGradient>
      </defs>
      <g className="text-[#15302d] opacity-[.13] dark:text-black dark:opacity-50">
        <ellipse ref={golgeRef} cx={CX} cy={188} rx={52} ry={7} fill="currentColor" style={merkez} />
      </g>
      <g ref={atlaRef} style={merkez}>
        <g ref={cevirRef} style={merkez}>
          {([0, 1, 2] as const).map((f) => {
            const altin = f === 2;
            const renk = altin ? PARA_ALTIN : yuzler[f].renk;
            return (
              <g
                key={f}
                ref={(el) => {
                  yuzRefleri.current[f] = el;
                }}
                opacity={gorunen === f ? 1 : 0}
                data-yuz={altin ? 'bos' : yuzler[f].etiket}
              >
                <ParaYuzuCizimi
                  renk={renk}
                  dolgu={altin ? `url(#${altinId})` : renk}
                  metin={altin ? '?' : yuzler[f].etiket.toLocaleUpperCase('tr')}
                  yaziBoyu={altin ? yaziBoyu * 1.5 : yaziBoyu}
                />
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
