'use client';

/**
 * 2B madeni para (WebGL yoksa deney alanındaki SVG): 3B dokuyla aynı 1 TL görünümü (madeniPara.ts). Bir <svg> içinde,
 * (0, 0) merkezli <g> olarak çizilir. Yazı yüzü «1 LİRA»; tura yüzü «TÜRKİYE CUMHURİYETİ», yıl ve profil silüeti.
 */
import React, { useId } from 'react';
import type { ParaYuzu } from './olasilik';
import { PARA_GOBEK_ORANI, PARA_HALKA_YAZI_ORANI, PARA_RENKLERI, PARA_TIRTIK_SAYISI, PARA_YAZILARI, profilSvgYolu } from './madeniPara';

const H = PARA_RENKLERI.halka;
const G = PARA_RENKLERI.gobek;
const YAZI_TIPI = 'Manrope, system-ui, sans-serif';

function yildizYolu(cx: number, cy: number, r: number): string {
  const n: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    n.push(`${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${n.join(' L')} Z`;
}

export function MadeniParaSvg({ yuz, r }: { yuz: ParaYuzu; r: number }) {
  const kimlik = `para-${useId().replace(/:/g, '')}`;
  const rg = r * PARA_GOBEK_ORANI;
  const ry = r * PARA_HALKA_YAZI_ORANI;
  const boyut = r * 0.13;
  // Üst yazı yolun üstünde (harfler dışa), alt yazı yolun altında (harfler içe): ikisi de halkanın ortasına oturur
  const ustR = ry - boyut * 0.36;
  const altR = ry + boyut * 0.36;
  const kabartma = { paintOrder: 'stroke' as const, stroke: 'rgba(255,246,214,0.55)', strokeWidth: r * 0.012 };
  return (
    <g data-madeni-para={yuz}>
      <defs>
        <radialGradient id={`${kimlik}-h`} cx="38%" cy="34%" r="70%">
          <stop offset="0" stopColor={H.acik} />
          <stop offset="0.55" stopColor={H.orta} />
          <stop offset="1" stopColor={H.koyu} />
        </radialGradient>
        <radialGradient id={`${kimlik}-g`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={G.acik} />
          <stop offset="0.6" stopColor={G.orta} />
          <stop offset="1" stopColor={G.koyu} />
        </radialGradient>
        <path id={`${kimlik}-ust`} d={`M${-ustR} 0 A${ustR} ${ustR} 0 0 1 ${ustR} 0`} />
        <path id={`${kimlik}-alt`} d={`M${-altR} 0 A${altR} ${altR} 0 0 0 ${altR} 0`} />
      </defs>
      {/* Gölge ve tırtıklı kenar */}
      <ellipse cx={r * 0.06} cy={r * 0.1} rx={r * 1.02} ry={r * 1.02} fill="rgba(60,40,10,0.18)" />
      <circle r={r * 1.015} fill={H.koyu} />
      <circle r={r * 1.0} fill="none" stroke={H.acik} strokeWidth={r * 0.03} strokeDasharray={`${((2 * Math.PI * r) / PARA_TIRTIK_SAYISI / 2).toFixed(2)}`} opacity={0.8} />
      {/* Halka (altın sarısı) ve pervaz */}
      <circle r={r * 0.975} fill={`url(#${kimlik}-h)`} />
      <circle r={r * 0.94} fill="none" stroke="rgba(255,244,205,0.45)" strokeWidth={r * 0.05} />
      <circle r={r * 0.905} fill="none" stroke="rgba(92,64,14,0.55)" strokeWidth={r * 0.012} />
      {/* Göbek (gümüş gri) */}
      <circle r={rg} fill={`url(#${kimlik}-g)`} stroke="rgba(58,44,18,0.65)" strokeWidth={r * 0.016} />
      <circle r={rg * 0.965} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={r * 0.008} />
      {yuz === 'tura' ? (
        <>
          <text fontFamily={YAZI_TIPI} fontWeight={800} fontSize={boyut} fill={H.murekkep} {...kabartma}>
            <textPath href={`#${kimlik}-ust`} startOffset="50%" textAnchor="middle">
              {PARA_YAZILARI.ulke}
            </textPath>
          </text>
          <text fontFamily={YAZI_TIPI} fontWeight={800} fontSize={boyut} fill={H.murekkep} dominantBaseline="hanging" {...kabartma}>
            <textPath href={`#${kimlik}-alt`} startOffset="50%" textAnchor="middle">
              {PARA_YAZILARI.yil}
            </textPath>
          </text>
          <path d={`${yildizYolu(-ry, 0, r * 0.05)} ${yildizYolu(ry, 0, r * 0.05)}`} fill={H.murekkep} />
          {/* Kabartma profil silüeti: gölge + ışık + gövde */}
          <path d={profilSvgYolu(rg, rg * 0.04 + r * 0.02, rg * 0.02 + r * 0.025)} fill="rgba(30,34,40,0.45)" />
          <path d={profilSvgYolu(rg, rg * 0.04 - r * 0.01, rg * 0.02 - r * 0.012)} fill="rgba(255,255,255,0.85)" />
          <path d={profilSvgYolu(rg, rg * 0.04, rg * 0.02)} fill="#8f969d" />
        </>
      ) : (
        <>
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i / 36) * Math.PI * 2;
            return <circle key={i} cx={Math.cos(a) * ry} cy={Math.sin(a) * ry} r={r * 0.022} fill={H.murekkep} opacity={0.75} />;
          })}
          <text y={-rg * 0.12} textAnchor="middle" dominantBaseline="central" fontFamily={YAZI_TIPI} fontWeight={800} fontSize={rg * 1.02} fill="#7a8189" stroke="rgba(255,255,255,0.8)" strokeWidth={r * 0.012} paintOrder="stroke">
            {PARA_YAZILARI.deger}
          </text>
          <text y={rg * 0.62} textAnchor="middle" dominantBaseline="central" fontFamily={YAZI_TIPI} fontWeight={800} fontSize={rg * 0.27} fill="#7a8189" stroke="rgba(255,255,255,0.8)" strokeWidth={r * 0.008} paintOrder="stroke">
            {PARA_YAZILARI.birim}
          </text>
        </>
      )}
    </g>
  );
}
