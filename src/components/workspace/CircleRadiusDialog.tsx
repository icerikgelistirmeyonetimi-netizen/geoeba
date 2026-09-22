'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { Point2D, PointObject, CircleObject } from '@/types/math';
import { formatTurkishNumber } from '@/math/coordinates';
import { generateNextPointLabel } from '@/math/geometry';
import { createId } from '@/state/ids';
import { Modal } from '@/components/ui/Modal';
import { Circle as CircleIcon, X, Check } from 'lucide-react';

interface CircleRadiusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetPos?: Point2D;
}

const MIN_RADIUS = 0.25;
const MAX_RADIUS = 12;
const PRESETS = [1, 2, 3, 4, 5, 6];

const clampRadius = (r: number) => Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, r));

/** "3,5" ve "3.5" biçimlerini kabul eden Türkçe duyarlı sayı okuyucu. */
function parseNumberInput(raw: string): number | null {
  const n = parseFloat(raw.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Merkez + sayısal yarıçap ile çember kurma penceresi.
 * Tuvale tıklanan nokta merkez olur; kullanıcı yarıçapı sayı olarak girer.
 */
export function CircleRadiusDialog({ isOpen, onClose, targetPos = { x: 0, y: 0 } }: CircleRadiusDialogProps) {
  const { addObjects, objects } = useWorkspace();
  // Ham metin: kullanıcı "1" -> "12" yazarken ara değerler bozulmasın
  const [radiusText, setRadiusText] = useState('3');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRadiusText('3');
      setError(null);
    }
  }, [isOpen]);

  const radius = parseNumberInput(radiusText);
  const gecerli = radius !== null && radius >= MIN_RADIUS && radius <= MAX_RADIUS;

  const olustur = () => {
    if (radius === null) {
      setError('Geçerli bir sayı girin.');
      return;
    }
    if (radius < MIN_RADIUS || radius > MAX_RADIUS) {
      setError(`Yarıçap ${formatTurkishNumber(MIN_RADIUS)} ile ${formatTurkishNumber(MAX_RADIUS)} arasında olmalı.`);
      return;
    }
    const r = clampRadius(radius);
    const mevcutEtiketler = objects.filter((o) => o.type === 'point').map((o) => o.label);
    const merkezEtiketi = generateNextPointLabel(mevcutEtiketler);

    const merkez: PointObject = {
      id: createId('pt'),
      type: 'point',
      label: merkezEtiketi,
      showLabel: true,
      x: targetPos.x,
      y: targetPos.y,
      color: '#2563eb',
      visible: true,
      isIndependent: true,
      createdAt: Date.now(),
    };
    const cember: CircleObject = {
      id: createId('circ'),
      type: 'circle',
      label: `${merkezEtiketi} Çemberi (r = ${formatTurkishNumber(r)})`,
      showLabel: true,
      centerPointId: merkez.id,
      fixedRadius: r,
      color: '#8b5cf6',
      fillOpacity: 0,
      visible: true,
      createdAt: Date.now(),
    };
    addObjects([merkez, cember], `${merkezEtiketi} merkezli r = ${formatTurkishNumber(r)} çemberi oluşturuldu`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="cember-yaricap-basligi"
      overlayClassName="bg-ada-murekkep/60 backdrop-blur-sm select-none"
      className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-ada-lavanta/20 text-ada-deniz-koyu dark:text-ada-lavanta flex items-center justify-center shrink-0">
            <CircleIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 id="cember-yaricap-basligi" className="text-sm font-black text-foreground">
              Çember Çiz (merkez + yarıçap)
            </h2>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Merkez ({formatTurkishNumber(targetPos.x)}; {formatTurkishNumber(targetPos.y)}) noktasına
              yerleştirilecek. Yarıçapı yazın.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            olustur();
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <label htmlFor="cember-yaricap-girisi" className="block text-[11px] font-bold text-muted-foreground">
              Yarıçap (r)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="cember-yaricap-girisi"
                type="text"
                inputMode="decimal"
                autoFocus
                value={radiusText}
                onChange={(e) => {
                  setRadiusText(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={error !== null}
                className={`flex-1 min-w-0 px-3 py-2 rounded-xl bg-background border text-sm font-mono text-foreground outline-none focus:border-primary ${
                  error ? 'border-destructive' : 'border-border'
                }`}
              />
              <span className="text-xs font-bold text-muted-foreground shrink-0">br</span>
            </div>
            {error && (
              <p role="alert" className="text-[11px] text-destructive font-semibold">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setRadiusText(String(p));
                  setError(null);
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                  radius === p
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-muted'
                }`}
              >
                {p} br
              </button>
            ))}
          </div>

          {/* Canlı matematiksel bilgi */}
          {gecerli && radius !== null && (
            <div className="p-2.5 rounded-xl bg-ada-lavanta/15 border border-ada-lavanta/30 text-[11px] font-mono text-ada-deniz-koyu dark:text-ada-kum space-y-0.5">
              <div>Çevre = 2πr = {formatTurkishNumber(2 * Math.PI * radius)} br</div>
              <div>Alan = πr² = {formatTurkishNumber(Math.PI * radius * radius)} br²</div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={!gecerli}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-ada-deniz-koyu dark:hover:bg-ada-deniz disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Çemberi Çiz</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/70 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Vazgeç</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
