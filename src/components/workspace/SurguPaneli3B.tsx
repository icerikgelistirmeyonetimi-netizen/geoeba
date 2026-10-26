'use client';

import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Link2, Link2Off, Pause, Play, Plus, Settings, Sliders } from 'lucide-react';
import type { PointObject, SliderObject } from '@/types/math';
import { createId, useWorkspace } from '@/state/WorkspaceContext';
import { useSliderPlayback } from '@/hooks/useSliderPlayback';
import { snapSliderValue } from '@/math/sliderBindings';
import { sliderDisplay } from '@/math/sliderDisplay';
import { duzMetin, metniSeslendir, yazimAyari } from '@/math/matematikYazimi';
import { etiketYaziBoyu } from '@/math/etiketStandardi';
import { formatTurkishNumber } from '@/math/coordinates';
import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import { useKademeDuzeyi } from '@/hooks/useKademeDuzeyi';
import { aracGorunurMu } from './kademeDuzeyleri';
import { MatematikMetni } from './MatematikMetni';
import { surguBagi, surguBaginiDegistir } from './surguBagi';

/*
 * 3B GÖRÜNÜMÜN SÜRGÜ PANELİ (surgu-baglama-onerisi.md). 3B tek başına açıkken 2B tuval çizilmediği için sürgüler burada,
 * tuvalin sol üstünde ekrana sabit bir panelde görünür (kamera dönünce yerinde kalır). 2B'deki sürgüyle aynı öğeler:
 * başlık ("a = 3 br"), çizgi ve tutamak, uç değerleri, altında bağ zinciri ve bağlı ölçü; üzerine gelince ayar ve oynat
 * düğmeleri. 2B ile aynı kaydırıcı nesnelerini gösterir; oynatma da burada çalışır (2B tuval yokken).
 */

/** Çubuğun uzunluğu ve sol boşluğu (piksel) */
const CUBUK = 150;
const SOL = 14;
const CIZGI_Y = 12;
const SVG_GENISLIK = SOL + CUBUK + 14;
const SVG_YUKSEKLIK = 34;

export function SurguSatiri({ s, oynuyor, canliDeger, oynatmayiDegistir }: { s: SliderObject; oynuyor: boolean; canliDeger: number; oynatmayiDegistir: () => void }) {
  const { objects, commit, handleSliderChange, recordHistory, selectedObjectIds, setSelectedObjectIds, setSliderSettingsId, setHintMessage, styleSettings } = useWorkspace();
  const svgRef = useRef<SVGSVGElement>(null);
  const suruklemeRef = useRef<number | null>(null);
  const yazim = yazimAyari(styleSettings);
  const gosterim = sliderDisplay(objects, s, yazim);
  const olcuAdi = gosterim.bagliOlcuNodes ? duzMetin(gosterim.bagliOlcuNodes) : '';
  const { durum, aciklama } = surguBagi(objects, s, olcuAdi);
  const yaziBoyu = etiketYaziBoyu(11, 'measure', styleSettings);
  const renk = s.color || NESNE_RENGI.mor;
  const aralik = s.max - s.min;
  const oran = aralik > 0 ? Math.min(1, Math.max(0, (canliDeger - s.min) / aralik)) : 0;
  const tutamakX = SOL + CUBUK * oran;
  const secili = selectedObjectIds.includes(s.id);
  const birim = gosterim.unit === '°' ? '°' : '';
  const ayarlariAc = () => {
    setSelectedObjectIds([s.id]);
    setSliderSettingsId(s.id);
  };
  /** Fare konumundaki değer (adıma oturur, aralıkta kalır) */
  const degerAl = (clientX: number) => {
    const kutu = svgRef.current?.getBoundingClientRect();
    if (!kutu) return s.value;
    const t = Math.max(0, Math.min(1, (clientX - kutu.left - SOL) / CUBUK));
    return snapSliderValue(s.min + t * aralik, s.min, s.max, s.step);
  };
  const degeriYaz = (deger: number) => {
    handleSliderChange(s.id, deger);
    recordHistory(`${s.variableName} = ${formatTurkishNumber(deger)}`);
  };
  // Ayar ve oynat düğmeleri üzerine gelince görünür; seçiliyken, klavye odağında ve oynarken (Durdur) de görünür
  const hoverIleGorunur = (gorunur: boolean) =>
    `transition-opacity ${gorunur ? 'opacity-100' : 'opacity-0 group-hover/surgu:opacity-100 group-focus-within/surgu:opacity-100'}`;

  return (
    <li className="group/surgu relative px-1 pt-1.5 pb-1" data-surgu-paneli-satiri={s.id}>
      <div className="flex items-center justify-between gap-2 pr-1">
        <MatematikMetni
          dugumler={gosterim.degiskenNodes}
          sesli={metniSeslendir(gosterim.bagliOlcuNodes ? `${duzMetin(gosterim.degiskenNodes)}, ${gosterim.text}` : duzMetin(gosterim.degiskenNodes))}
          className="font-bold text-foreground leading-none"
        />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={`${gosterim.name} kaydırıcısı ayarları`}
            title="Ayarlar"
            onClick={ayarlariAc}
            className={`p-1 rounded-md text-muted-foreground hover:text-primary ${hoverIleGorunur(secili)}`}
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={oynuyor ? 'Animasyonu Durdur' : 'Animasyonu Başlat'}
            aria-pressed={oynuyor}
            title={oynuyor ? 'Animasyonu Durdur' : 'Animasyonu Başlat'}
            onClick={oynatmayiDegistir}
            className={`p-1 rounded-md ${oynuyor ? 'text-primary' : 'text-muted-foreground hover:text-primary'} ${hoverIleGorunur(secili || oynuyor)}`}
          >
            {oynuyor ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
      <svg
        ref={svgRef}
        width={SVG_GENISLIK}
        height={SVG_YUKSEKLIK}
        className="block select-none touch-none"
        role="slider"
        tabIndex={0}
        aria-label={`${s.variableName} kaydırıcısı`}
        aria-valuemin={s.min}
        aria-valuemax={s.max}
        aria-valuenow={s.value}
        aria-valuetext={`${formatTurkishNumber(s.value)}${birim}`}
        onPointerDown={(e) => {
          if (e.button !== 0 || s.locked) return;
          e.preventDefault();
          suruklemeRef.current = e.pointerId;
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* yakalama yoksa da sürükleme sürer */ }
          setSelectedObjectIds([s.id]);
          handleSliderChange(s.id, degerAl(e.clientX));
        }}
        onPointerMove={(e) => {
          if (suruklemeRef.current !== e.pointerId) return;
          handleSliderChange(s.id, degerAl(e.clientX));
        }}
        onPointerUp={(e) => {
          if (suruklemeRef.current !== e.pointerId) return;
          suruklemeRef.current = null;
          // Sürükleme bitince TEK geçmiş adımı
          degeriYaz(degerAl(e.clientX));
        }}
        onKeyDown={(e) => {
          const adim = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
          if (!adim || s.locked) return;
          e.preventDefault();
          degeriYaz(snapSliderValue(s.value + adim * s.step, s.min, s.max, s.step));
        }}
      >
        <rect x={0} y={0} width={SVG_GENISLIK} height={CIZGI_Y + 10} fill="transparent" className="cursor-pointer" />
        <line x1={SOL} y1={CIZGI_Y} x2={SOL + CUBUK} y2={CIZGI_Y} stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" />
        <line x1={SOL} y1={CIZGI_Y} x2={tutamakX} y2={CIZGI_Y} stroke={renk} strokeWidth={3} strokeLinecap="round" />
        <line x1={SOL} y1={CIZGI_Y - 5} x2={SOL} y2={CIZGI_Y + 5} stroke="#94a3b8" strokeWidth={2} />
        <line x1={SOL + CUBUK} y1={CIZGI_Y - 5} x2={SOL + CUBUK} y2={CIZGI_Y + 5} stroke="#94a3b8" strokeWidth={2} />
        <text x={SOL} y={CIZGI_Y + 17} textAnchor="middle" fontSize={yaziBoyu} className="fill-foreground font-bold pointer-events-none">
          {formatTurkishNumber(s.min)}{birim}
        </text>
        <text x={SOL + CUBUK} y={CIZGI_Y + 17} textAnchor="middle" fontSize={yaziBoyu} className="fill-foreground font-bold pointer-events-none">
          {formatTurkishNumber(s.max)}{birim}
        </text>
        {secili && <circle cx={tutamakX} cy={CIZGI_Y} r={13} fill="none" stroke="currentColor" strokeWidth={2} className="text-primary pointer-events-none" />}
        <circle cx={tutamakX} cy={CIZGI_Y} r={9} fill={renk} stroke="#ffffff" strokeWidth={2.5} className="cursor-grab active:cursor-grabbing drop-shadow-md" />
      </svg>
      {/* Bağ satırı: zincir (bağı geçici kapatır / yeniden açar; bağsızsa ayarları açar) ve bağlı ölçünün adı */}
      <div className="flex items-center justify-center gap-1.5 -mt-1" style={{ width: SVG_GENISLIK }}>
        <button
          type="button"
          aria-label={`${s.variableName} kaydırıcısı: ${aciklama}`}
          title={aciklama}
          data-kaydirici-bagi={durum}
          onClick={() => surguBaginiDegistir(objects, s, { commit, ipucu: setHintMessage, ayarlariAc, noktaKimligi: () => createId('point') })}
          className={`p-0.5 rounded ${durum === 'bagli' ? 'text-primary' : durum === 'askida' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground opacity-70'}`}
        >
          {durum === 'bagli' ? <Link2 className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" /> : <Link2Off className="w-4 h-4" aria-hidden="true" />}
        </button>
        {gosterim.bagliOlcuNodes && (
          <MatematikMetni dugumler={gosterim.bagliOlcuNodes} className="text-[11px] text-muted-foreground leading-none" />
        )}
      </div>
    </li>
  );
}

/**
 * Panel: başlık (Sürgüler, sayı, ekle, küçült) ve sürgü satırları. Kaydırıcı aracı olmayan kademede (ilkokul) ve
 * sürgü yokken gizlidir; aracı olan kademede sürgü yokken yalnız başlık ve "Sürgü ekle" görünür.
 */
export function SurguPaneli3B() {
  const { objects, setSliderValues, setIsSliderDialogOpen } = useWorkspace();
  const [kademe] = useKademeDuzeyi();
  const [acik, setAcik] = useState(true);
  const sliders = useMemo(() => objects.filter((o): o is SliderObject => o.type === 'slider' && o.visible !== false), [objects]);
  const animatingPoints = useMemo(
    () => objects.filter((o): o is PointObject => o.type === 'point' && !!o.animating && o.visible && !!o.onObjectId),
    [objects]
  );
  const { isPlaying, toggle, canliKonumlar } = useSliderPlayback({ sliders, animatingPoints, allObjects: objects, onValues: setSliderValues });
  const ekleyebilir = aracGorunurMu(kademe, 'slider');
  if (!sliders.length && !ekleyebilir) return null;

  return (
    <section
      aria-label="Sürgüler"
      data-surgu-paneli-3b=""
      className="absolute top-[6.5rem] left-4 z-20 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-sm text-xs pointer-events-auto"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <header className="flex items-center gap-1 pl-2.5 pr-1 py-1">
        <Sliders className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="font-bold text-foreground">Sürgüler</span>
        {sliders.length > 0 && <span className="text-muted-foreground">({sliders.length})</span>}
        <span className="flex-1" />
        {ekleyebilir && (
          <button type="button" aria-label="Sürgü ekle" title="Sürgü ekle" onClick={() => setIsSliderDialogOpen(true)} className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted">
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        {sliders.length > 0 && (
          <button
            type="button"
            aria-label={acik ? 'Sürgüleri gizle' : 'Sürgüleri göster'}
            aria-expanded={acik}
            title={acik ? 'Küçült' : 'Aç'}
            onClick={() => setAcik((a) => !a)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {acik ? <ChevronUp className="w-4 h-4" aria-hidden="true" /> : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
          </button>
        )}
      </header>
      {acik && sliders.length > 0 && (
        <ul className="max-h-[50vh] overflow-y-auto border-t border-border px-1.5 pb-1 divide-y divide-border/60">
          {sliders.map((s) => (
            <SurguSatiri key={s.id} s={s} oynuyor={isPlaying} canliDeger={isPlaying ? (canliKonumlar[s.id] ?? s.value) : s.value} oynatmayiDegistir={toggle} />
          ))}
        </ul>
      )}
    </section>
  );
}
