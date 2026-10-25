import React from 'react';
import type { TopViewData } from '@/math/solidProjection2D';
import { cisimEtiketYazimi } from '@/math/cisimEtiketleri2B';
import { MatematikEtiketi } from '../MatematikEtiketi';

/*
 * 3B CİSİMLERİN 2B TUVALDEKİ ÜSTTEN GÖRÜNÜMÜ: küp kare, prizma dikdörtgen ya da üçgen, silindir ve küre daire, koni
 * tepesi artı işaretli daire, piramit tepeye kesikli ayrıtlarla bağlanan taban. Çizim işlevidir (tuvalCizimKaydi.test.ts).
 */

/** Gövdenin dolgusu ve çevresi: seçili cisim daha koyu dolgulu, kalın ve seçim renginde çizilir */
const govde = (dolgu: string, cizgi: string, secili: boolean) => ({
  fill: dolgu,
  fillOpacity: secili ? 0.35 : 0.2,
  stroke: cizgi,
  strokeWidth: secili ? 2.6 : 1.8,
});

/** Köşe işaretleri (çokgen tabanlı cisimler ve piramit) */
const koseler = (ust: TopViewData, cizgi: string, secili: boolean) =>
  ust.points?.map((k, i) => <circle key={i} cx={k.x} cy={k.y} r={secili ? 4 : 3} fill={cizgi} />);

/**
 * Cismin üstten görünüş şekli. `dolgu` cismin rengi, `cizgi` çevre ve işaretlerin rengi (seçiliyken seçim rengi).
 * Görünüşün gerektirdiği veri yoksa (çokgende köşe yazısı, dairede yarıçap) hiçbir şey çizilmez.
 */
export function cisimUstGorunumu(ust: TopViewData, dolgu: string, cizgi: string, secili: boolean) {
  const m = ust.centerScreen;
  switch (ust.kind) {
    case 'polygon':
      if (!ust.pointsAttr) return null;
      return (
        <g>
          <polygon points={ust.pointsAttr} {...govde(dolgu, cizgi, secili)} strokeLinejoin="round" />
          {koseler(ust, cizgi, secili)}
        </g>
      );
    case 'circle':
      if (!ust.radius) return null;
      return (
        <g>
          <circle cx={m.x} cy={m.y} r={ust.radius} {...govde(dolgu, cizgi, secili)} />
          <circle cx={m.x} cy={m.y} r={3} fill={cizgi} />
        </g>
      );
    case 'cone':
      // Tepe, tabanın merkezine artı işaretiyle düşer
      if (!ust.radius) return null;
      return (
        <g>
          <circle cx={m.x} cy={m.y} r={ust.radius} {...govde(dolgu, cizgi, secili)} />
          <line x1={m.x - 6} y1={m.y} x2={m.x + 6} y2={m.y} stroke={cizgi} strokeWidth={1.5} />
          <line x1={m.x} y1={m.y - 6} x2={m.x} y2={m.y + 6} stroke={cizgi} strokeWidth={1.5} />
          <circle cx={m.x} cy={m.y} r={3} fill={cizgi} />
        </g>
      );
    case 'pyramid':
      if (!ust.pointsAttr) return null;
      return (
        <g>
          <polygon points={ust.pointsAttr} {...govde(dolgu, cizgi, secili)} strokeLinejoin="round" />
          {ust.diagEdges?.map((a, i) => (
            <line key={i} x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y} stroke={cizgi} strokeWidth={1.6} strokeDasharray="4 3" />
          ))}
          <circle cx={m.x} cy={m.y} r={3.5} fill={cizgi} />
          {koseler(ust, cizgi, secili)}
        </g>
      );
    default:
      return null;
  }
}

/** Kenar ve yarıçap ölçüleri ("a = 3 br"): ölçü rozetleriyle aynı kutu ve yazı ölçeği */
export function cisimOlcuEtiketleri(ust: TopViewData, yaziBoyu: number, yaziOlcegi: number, kutuGizli: boolean) {
  return ust.dimensionLabels.map((olcu, i) => (
    <g key={i} data-canvas-label="" className="select-none pointer-events-none">
      <MatematikEtiketi
        {...cisimEtiketYazimi(olcu.text, yaziBoyu)}
        x={olcu.x}
        y={olcu.y}
        px={yaziBoyu}
        olcek={yaziOlcegi}
        renk="on"
        kutu={{ sinif: 'fill-background/95 stroke-border', rx: 7 }}
        kutuGizli={kutuGizli}
      />
    </g>
  ));
}
