'use client';

import React, { useState } from 'react';
import { formatTurkishNumber } from '@/math/coordinates';
import { ILKOKUL_DONUSLERI, ilkokulDonusAcisi, ilkokulDonusAdi, type DonusYonu } from './ilkokulKipi';

interface RotateGizmoProps {
  /** Döndürme merkezinin EKRAN koordinatı (piksel). */
  center: { x: number; y: number };
  /** Serbest sürükleme sırasında gösterilecek derece; sürükleme yoksa null. */
  feedbackDeg: number | null;
  /** Serbest döndürme koluna (iki oklu daire) basıldığında serbest döndürmeyi başlatır. */
  onFreeRotateStart: (e: React.MouseEvent) => void;
  /** Hazır derece düğmelerine tıklandığında çağrılır (saat yönü tersi pozitif). */
  onRotate: (deg: number) => void;
  /**
   * İlkokul (alan uzmanı, 4. tur [179]): derece yok — düğmeler çeyrek / yarım / tam dönüş ve yön (saat yönünde /
   * saat yönünün tersine); sürükleme okuması da dönüşün adını yazar (TYMM MAT.4.3.5: açı bir dönme miktarıdır).
   */
  ilkokul?: boolean;
}

const HAZIR_DERECELER = [30, 45, 60, 90, 120, 135, 180, 270];

/**
 * Döndürme paleti: merkez pivotu, serbest döndürme kolu ve hazır derece düğmeleri.
 *
 * Yalnızca SEÇİLİ şekil için çizilir. Daha önce her çokgen kendi paletini çiziyordu;
 * birkaç şekil varken paletler üst üste binip tuvali okunmaz hâle getiriyordu.
 *
 * Çokgen, yay ve daire dilimi katmanlarının hepsi bu bileşeni kullanır; böylece
 * palet her şekilde aynı görünür ve tek yerden değişir.
 */
export function RotateGizmo({ center, feedbackDeg, onFreeRotateStart, onRotate, ilkokul = false }: RotateGizmoProps) {
  const [yon, setYon] = useState<DonusYonu>('saat');
  const ilkokulOkumasi = ilkokul && feedbackDeg !== null ? ilkokulDonusAdi(feedbackDeg) : '';
  return (
    <g className="rotate-gizmo-layer select-none">
      {/* A) Merkez Döndürme Noktası (Pivot) */}
      <circle
        cx={center.x}
        cy={center.y}
        r={6}
        strokeWidth={2}
        className="fill-ada-mercan stroke-ada-fildisi shadow-sm"
      />
      <circle cx={center.x} cy={center.y} r={2} className="fill-ada-fildisi" />

      {/* B) Bağlantı Kolu */}
      <line
        x1={center.x}
        y1={center.y}
        x2={center.x}
        y2={center.y - 48}
        strokeWidth={2}
        strokeDasharray="3,3"
        className="stroke-ada-mercan"
      />

      {/* C) Serbest Döndür İkonu (basılı tutup sürükleyin; Shift 15°'ye yuvarlar) */}
      <g
        transform={`translate(${center.x}, ${center.y - 48})`}
        onPointerDown={onFreeRotateStart}
        className="cursor-grab active:cursor-grabbing group/rot-btn"
      >
        <circle
          cx={0}
          cy={0}
          r={16}
          strokeWidth={2.5}
          className="fill-ada-mercan stroke-ada-fildisi drop-shadow-xl group-hover/rot-btn:scale-125 transition-transform"
        />
        <path
          d="M -7 -1 A 7.5 7.5 0 0 1 6 -4 L 6 -8 M 6 -4 L 2 -4"
          fill="none"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-ada-fildisi"
        />
        <path
          d="M 7 1 A 7.5 7.5 0 0 1 -6 4 L -6 8 M -6 4 L -2 4"
          fill="none"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-ada-fildisi"
        />
      </g>

      {/* D') İlkokul: sürüklerken dönüşün adı ("çeyrek dönüş saat yönünde"); derece yazılmaz */}
      {ilkokulOkumasi && (
        <g transform={`translate(${center.x}, ${center.y - 82})`} data-ilkokul-donus-okumasi>
          <rect
            x={-(12 + ilkokulOkumasi.length * 3.4)}
            y="-13"
            width={24 + ilkokulOkumasi.length * 6.8}
            height="26"
            rx="8"
            fillOpacity={0.96}
            strokeWidth="1.5"
            className="fill-ada-murekkep stroke-ada-mercan shadow-2xl"
          />
          <text x="0" y="5" textAnchor="middle" className="fill-ada-fildisi font-bold text-xs font-sans">
            {ilkokulOkumasi}
          </text>
        </g>
      )}

      {/* D) Canlı Sürükleme Derecesi */}
      {!ilkokul && feedbackDeg !== null && (
        <g transform={`translate(${center.x}, ${center.y - 82})`}>
          <rect
            x="-35"
            y="-13"
            width="70"
            height="26"
            rx="8"
            fillOpacity={0.96}
            strokeWidth="1.5"
            className="fill-ada-murekkep stroke-ada-mercan shadow-2xl"
          />
          <text x="0" y="5" textAnchor="middle" className="fill-ada-fildisi font-black text-xs font-mono">
            {formatTurkishNumber(feedbackDeg)}°
          </text>
        </g>
      )}

      {/* E') İlkokul: yön (saat yönünde / tersine) + çeyrek, yarım, tam dönüş */}
      {ilkokul && (
        <g transform={`translate(${center.x - 150}, ${center.y + 44})`} data-ilkokul-donus-dugmeleri>
          <rect width={300} height={66} rx={10} fillOpacity={0.96} strokeWidth={1.2} className="fill-ada-murekkep stroke-ada-mercan shadow-2xl" />
          {([
            { y: 'saat', ad: '↻ Saat yönünde' },
            { y: 'ters', ad: '↺ Saat yönünün tersine' },
          ] as const).map((d, i) => (
            <g
              key={d.y}
              transform={`translate(${8 + i * 144}, 6)`}
              className="cursor-pointer group/deg"
              role="button"
              aria-pressed={yon === d.y}
              data-donus-yonu={d.y}
              onClick={(e) => {
                e.stopPropagation();
                setYon(d.y);
              }}
            >
              <rect
                width={140}
                height={24}
                rx={6}
                strokeWidth={1}
                className={`${yon === d.y ? 'fill-ada-deniz stroke-ada-fildisi/70' : 'fill-ada-murekkep-2 stroke-ada-mercan/60'} group-hover/deg:fill-ada-vurgu transition-colors`}
              />
              <text x={70} y={16} textAnchor="middle" className="fill-ada-fildisi font-bold text-[10px] font-sans pointer-events-none">
                {d.ad}
              </text>
            </g>
          ))}
          {ILKOKUL_DONUSLERI.map((d, i) => (
            <g
              key={d.ceyrek}
              transform={`translate(${8 + i * 96}, 36)`}
              className="cursor-pointer group/deg"
              role="button"
              data-donus-ceyrek={d.ceyrek}
              onClick={(e) => {
                e.stopPropagation();
                onRotate(ilkokulDonusAcisi(d.ceyrek, yon));
              }}
            >
              <rect width={92} height={24} rx={6} strokeWidth={1} className="fill-ada-murekkep-2 stroke-ada-mercan/60 group-hover/deg:fill-ada-deniz transition-colors" />
              <text x={46} y={16} textAnchor="middle" className="fill-ada-fildisi font-bold text-[10px] font-sans pointer-events-none">
                {d.ad}
              </text>
            </g>
          ))}
        </g>
      )}

      {/* E) Hazır Derece Düğmeleri */}
      {!ilkokul && (
      <g transform={`translate(${center.x - 170}, ${center.y + 44})`}>
        <rect
          width={340}
          height={34}
          rx={10}
          fillOpacity={0.96}
          strokeWidth={1.2}
          className="fill-ada-murekkep stroke-ada-mercan shadow-2xl"
        />
        {HAZIR_DERECELER.map((deg, i) => (
          <g
            key={`rot-deg-${deg}`}
            transform={`translate(${8 + i * 35}, 6)`}
            className="cursor-pointer group/deg"
            onClick={(e) => {
              e.stopPropagation();
              onRotate(deg);
            }}
          >
            <rect
              width={31}
              height={22}
              rx={6}
              strokeWidth={1}
              className="fill-ada-murekkep-2 stroke-ada-mercan/60 group-hover/deg:fill-ada-deniz transition-colors shadow-sm"
            />
            <text
              x={15.5}
              y={15}
              textAnchor="middle"
              className="fill-ada-fildisi font-black text-[9px] font-sans pointer-events-none"
            >
              {deg}°
            </text>
          </g>
        ))}
        {/* ↷ Saat yönünde 90° */}
        <g
          transform="translate(290, 6)"
          className="cursor-pointer group/deg"
          onClick={(e) => {
            e.stopPropagation();
            onRotate(-90);
          }}
        >
          <rect
            width={42}
            height={22}
            rx={6}
            className="fill-ada-deniz group-hover/deg:fill-ada-vurgu transition-colors shadow-sm"
          />
          <text
            x={21}
            y={15}
            textAnchor="middle"
            className="fill-ada-fildisi font-black text-[9px] font-sans pointer-events-none"
          >
            ↷ 90°
          </text>
        </g>
      </g>
      )}
    </g>
  );
}
