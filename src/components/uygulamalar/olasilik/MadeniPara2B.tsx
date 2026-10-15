'use client';

/**
 * 2B madeni para (WebGL yoksa deney alanındaki SVG): 3B dokuyla aynı 1 TL görünümü (madeniPara.ts). Bir <svg> içinde,
 * (0, 0) merkezli <g> olarak çizilir. Yazı yüzü «1 LİRA»; tura yüzü TCMB kaynaklı ortak Atatürk rölyefi görselidir.
 */
import React, { useId } from 'react';
import type { ParaYuzu } from './olasilik';
import { TURA_GORSELI } from './turaGorseli';
import { PARA_GOBEK_ORANI, PARA_HALKA_YAZI_ORANI, PARA_RENKLERI, PARA_TIRTIK_SAYISI, PARA_YAZILARI } from './madeniPara';

const H = PARA_RENKLERI.halka;
const G = PARA_RENKLERI.gobek;
const YAZI_TIPI = 'Manrope, system-ui, sans-serif';

export function MadeniParaSvg({ yuz, r }: { yuz: ParaYuzu; r: number }) {
  const kimlik = `para-${useId().replace(/:/g, '')}`;
  const rg = r * PARA_GOBEK_ORANI;
  const ry = r * PARA_HALKA_YAZI_ORANI;
  if (yuz === 'tura') {
    return (
      <g data-madeni-para="tura">
        <title>Atatürk rölyefli 1 Türk lirası — tura yüzü</title>
        <ellipse cx={r * 0.06} cy={r * 0.1} rx={r * 1.02} ry={r * 1.02} fill="rgba(60,40,10,0.18)" />
        <image href={TURA_GORSELI} x={-r} y={-r} width={2 * r} height={2 * r} preserveAspectRatio="none" />
      </g>
    );
  }
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
    </g>
  );
}
