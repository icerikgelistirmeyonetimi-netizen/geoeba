'use client';

import React, { useState } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { Point2D, PointObject, PolygonObject } from '@/types/math';
import { formatTurkishNumber } from '@/math/coordinates';
import { generateNextPointLabels } from '@/math/geometry';
import { regularPolygonVertices } from '@/math/regularPolygon';
import { createId } from '@/state/ids';
import { Modal } from '@/components/ui/Modal';
import { Hexagon, X, Check, Sparkles } from 'lucide-react';

interface RegularPolygonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetPos?: Point2D;
}

const MIN_SIDES = 3;
const MAX_SIDES = 30;
const MIN_RADIUS = 0.5;
const MAX_RADIUS = 10;

const PRESET_EDGES = [
  { count: 3, name: 'Eşkenar Üçgen' },
  { count: 4, name: 'Kare' },
  { count: 5, name: 'Düzgün Beşgen' },
  { count: 6, name: 'Düzgün Altıgen (Petek)' },
  { count: 8, name: 'Düzgün Sekizgen' },
  { count: 10, name: 'Düzgün Ongen' },
  { count: 12, name: 'Düzgün Onikigen' },
];

/**
 * Şablon çipi simgesinin köşeleri (24'lük görünüm kutusu, ekran koordinatı): tabanı yatay duran
 * düzgün n-gen. Her şablon aynı büyüklükte görünsün diye çokgen en çok 20 × 18 birimlik alana
 * sığdırılıp ortalanır; kare bu alanı tümüyle doldurup iri durduğu için biraz küçültülür.
 */
function cokgenSimgesiNoktalari(kenar: number): string {
  const koseler = Array.from({ length: kenar }, (_, i) => {
    const aci = Math.PI / 2 + Math.PI / kenar + (i * 2 * Math.PI) / kenar;
    return { x: Math.cos(aci), y: Math.sin(aci) };
  });
  const xs = koseler.map((k) => k.x);
  const ys = koseler.map((k) => k.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const olcek = Math.min(20 / (x1 - x0), 18 / (y1 - y0)) * (kenar === 4 ? 0.92 : 1);
  return koseler
    .map((k) => `${(12 + (k.x - (x0 + x1) / 2) * olcek).toFixed(2)},${(12 + (k.y - (y0 + y1) / 2) * olcek).toFixed(2)}`)
    .join(' ');
}

/** Çizgi simgesi olarak düzgün çokgen (lucide simgeleriyle aynı çizgi kalınlığı, currentColor) */
function CokgenSimgesi({ kenar }: { kenar: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points={cokgenSimgesiNoktalari(kenar)} />
    </svg>
  );
}

function getPolygonName(n: number): string {
  if (n === 3) return 'Eşkenar Üçgen';
  if (n === 4) return 'Kare (Düzgün Dörtgen)';
  if (n === 5) return 'Düzgün Beşgen';
  if (n === 6) return 'Düzgün Altıgen (Petek)';
  if (n === 7) return 'Düzgün Yedigen';
  if (n === 8) return 'Düzgün Sekizgen';
  if (n === 9) return 'Düzgün Dokuzgen';
  if (n === 10) return 'Düzgün Ongen';
  if (n === 12) return 'Düzgün Onikigen';
  return `Düzgün ${n}-gen`;
}

const clampSides = (n: number) => Math.max(MIN_SIDES, Math.min(MAX_SIDES, Math.round(n)));
const clampRadius = (r: number) => Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, r));

function parseNumberInput(raw: string): number | null {
  const n = parseFloat(raw.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function RegularPolygonDialog({
  isOpen,
  onClose,
  targetPos = { x: 0, y: 0 },
}: RegularPolygonDialogProps) {
  const { addObjects, objects } = useWorkspace();
  // Ham metin: kullanıcı "1" -> "12" yazarken ara değerler bozulmasın.
  const [sidesRaw, setSidesRaw] = useState('6');
  const [radiusRaw, setRadiusRaw] = useState('3');

  // Görüntüleme/hesaplama için geçerli (sınırlandırılmış) değerler
  const sides = clampSides(parseNumberInput(sidesRaw) ?? 6);
  const radius = clampRadius(parseNumberInput(radiusRaw) ?? 3);

  const setSides = (n: number) => setSidesRaw(String(clampSides(n)));
  const setRadius = (r: number) => setRadiusRaw(formatTurkishNumber(clampRadius(r), 2));

  const interiorAngle = ((sides - 2) * 180) / sides;
  const exteriorAngle = 360 / sides;
  const diagonalCount = (sides * (sides - 3)) / 2;
  const interiorSum = (sides - 2) * 180;
  const polyName = getPolygonName(sides);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Gönderimde alanları normalize et
    setSides(sides);
    setRadius(radius);

    const base = Date.now();
    // Etiketler mevcut noktalarla çakışmasın (A, B, C ... Z, A_1 ...)
    const labels = generateNextPointLabels(
      objects.filter((o) => o.type === 'point').map((o) => o.label),
      sides
    );

    // Ders kitabı düzeni: yatay tabana oturur, A sol alt köşede, köşeler saat yönünün tersine
    const corners = regularPolygonVertices(sides, radius, targetPos);
    const pts: PointObject[] = [];
    for (let i = 0; i < sides; i++) {
      const px = Number(corners[i].x.toFixed(2));
      const py = Number(corners[i].y.toFixed(2));
      pts.push({
        id: createId('pt'),
        type: 'point',
        label: labels[i],
        showLabel: true,
        x: px,
        y: py,
        color: '#10b981',
        visible: true,
        isIndependent: true,
        createdAt: base + i,
      });
    }

    const poly: PolygonObject = {
      id: createId('poly'),
      type: 'polygon',
      label: polyName,
      showLabel: true,
      pointIds: pts.map((p) => p.id),
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 0.2,
      visible: true,
      showArea: true,
      showPerimeter: true,
      createdAt: base + sides,
    };

    // Köşeler ve çokgen tek geçmiş adımı olarak eklenir: tek Ctrl+Z hepsini geri alır.
    addObjects([...pts, poly], `${polyName} oluşturuldu (${sides} kenar)`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="regular-polygon-dialog-title"
      overlayClassName="bg-ada-murekkep/60 backdrop-blur-sm select-none"
      className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Başlık */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-ada-altin/15 flex items-center justify-center text-ada-altin">
            <Hexagon className="w-5 h-5" />
          </div>
          <div>
            <h2 id="regular-polygon-dialog-title" className="text-base font-bold text-foreground">
              Düzgün Çokgen Çiz
            </h2>
            <p className="text-[11px] text-muted-foreground font-medium">
              Kenar sayısını belirleyerek eşit kenarlı çokgen oluşturun
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Kapat (Esc)"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Kenar Sayısı Girişi ve Stepper */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground flex items-center justify-between" htmlFor="regular-polygon-sides-input">
            <span>Kenar Sayısı (N)</span>
            <span className="font-mono text-xs font-bold text-ada-altin">
              {polyName}
            </span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSides(sides - 1)}
              className="w-10 h-10 rounded-xl bg-muted border border-border text-foreground font-black text-lg hover:bg-muted/80 transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Kenar sayısını azalt"
            >
              -
            </button>
            <input
              id="regular-polygon-sides-input"
              type="text"
              inputMode="numeric"
              value={sidesRaw}
              onChange={(e) => setSidesRaw(e.target.value)}
              onBlur={() => setSides(sides)}
              className="flex-1 text-center py-2 px-3 rounded-xl bg-input border border-border text-foreground font-mono text-lg font-bold focus:ring-2 focus:ring-primary outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setSides(sides + 1)}
              className="w-10 h-10 rounded-xl bg-primary hover:bg-ada-deniz-koyu dark:hover:bg-ada-deniz text-primary-foreground font-black text-lg transition-colors flex items-center justify-center cursor-pointer shadow-sm"
              aria-label="Kenar sayısını artır"
            >
              +
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {MIN_SIDES} ile {MAX_SIDES} arasında bir tam sayı girin.
          </p>
        </div>

        {/* Hızlı Şablon Çipleri */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-muted-foreground">
            Sık Kullanılan Çokgenler
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_EDGES.map((p) => (
              <button
                key={p.count}
                type="button"
                onClick={() => setSides(p.count)}
                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                  sides === p.count
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                    : 'bg-muted/60 hover:bg-muted text-foreground border-border/80'
                }`}
                title={p.name}
              >
                <CokgenSimgesi kenar={p.count} />
                <span>{p.count} Gen</span>
              </button>
            ))}
          </div>
        </div>

        {/* Yarıçap / Boyut Ayarı */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold text-foreground" htmlFor="regular-polygon-radius-input">
              Büyüklük (Yarıçap)
            </label>
            <div className="flex items-center gap-1">
              <input
                id="regular-polygon-radius-input"
                type="text"
                inputMode="decimal"
                value={radiusRaw}
                onChange={(e) => setRadiusRaw(e.target.value)}
                onBlur={() => setRadius(radius)}
                className="w-16 text-center py-1 px-2 rounded-lg bg-input border border-border text-foreground font-mono text-xs font-bold focus:ring-2 focus:ring-primary outline-none"
              />
              <span className="font-mono text-muted-foreground font-bold">br</span>
            </div>
          </div>
          <input
            type="range"
            min={MIN_RADIUS}
            max={MAX_RADIUS}
            step={0.5}
            value={radius}
            onChange={(e) => setRadius(parseFloat(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            aria-label="Yarıçap"
          />
        </div>

        {/* MEB Eğitsel Matematik Özellikleri Kartı */}
        <div className="bg-ada-altin/10 border border-ada-altin/25 rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Matematiksel Özellikler:</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <div>
              • Bir İç Açı: <span className="font-bold text-foreground">{formatTurkishNumber(interiorAngle, 1)}°</span>
            </div>
            <div>
              • Bir Dış Açı: <span className="font-bold text-foreground">{formatTurkishNumber(exteriorAngle, 1)}°</span>
            </div>
            <div>
              • İç Açılar Toplamı: <span className="font-bold text-foreground">{interiorSum}°</span>
            </div>
            <div>
              • Köşegen Sayısı: <span className="font-bold text-foreground">{diagonalCount}</span>
            </div>
          </div>
        </div>

        {/* Düğmeler */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            İptal
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-ada-deniz-koyu dark:hover:bg-ada-deniz text-primary-foreground transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Çokgeni Çiz</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
