'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckboxObject, ButtonObject, InputBoxObject, Point2D } from '@/types/math';
import { formatTurkishNumber } from '@/math/coordinates';

interface OrtakProps {
  /** Nesnenin dünya konumunun EKRAN karşılığı */
  ekran: Point2D;
  secili: boolean;
  /** Aracın seçme/taşıma davranışı için: bileşene basıldığında çağrılır */
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

/**
 * İŞARET KUTUSU — tuval üzerinde bir onay kutusu.
 *
 * Etkinlik hazırlarken bir çizimi tamamen silmek yerine kapatabilmek için var.
 * Kutunun kendisi SVG içinde çizilir; böylece yakınlaştırma ve dışa aktarımda
 * diğer nesnelerle birlikte davranır.
 */
export function CanvasCheckbox({
  obj,
  ekran,
  secili,
  onToggle,
  onMouseDown,
  onContextMenu,
}: OrtakProps & { obj: CheckboxObject; onToggle: () => void }) {
  const genislik = Math.max(96, (obj.label?.length || 6) * 7 + 34);
  return (
    <g
      transform={`translate(${ekran.x}, ${ekran.y})`}
      onPointerDown={onMouseDown}
      data-object-id={obj.id} onContextMenu={onContextMenu}
      className="select-none cursor-pointer"
    >
      <rect
        x={0}
        y={-14}
        width={genislik}
        height={28}
        rx={8}
        className="fill-background/95 stroke-border"
        strokeWidth={secili ? 2 : 1}
        stroke={secili ? '#ec4899' : undefined}
      />
      {/* Kutu */}
      <rect
        x={8}
        y={-8}
        width={16}
        height={16}
        rx={4}
        fill={obj.checked ? obj.color || '#2563eb' : 'transparent'}
        stroke={obj.color || '#2563eb'}
        strokeWidth={1.6}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      />
      {obj.checked && (
        <path
          d="M 11 0 L 15 4 L 21 -5"
          fill="none"
          stroke="#ffffff"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />
      )}
      <text
        x={32}
        y={4}
        className="fill-foreground font-bold"
        fontSize={11}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        {obj.label || 'Göster'}
      </text>
    </g>
  );
}

/** DÜĞME — tıklanınca bağlı eylemi çalıştırır. */
export function CanvasButton({
  obj,
  ekran,
  secili,
  onRun,
  onMouseDown,
  onContextMenu,
}: OrtakProps & { obj: ButtonObject; onRun: () => void }) {
  const genislik = Math.max(84, (obj.label?.length || 6) * 7 + 24);
  return (
    <g
      transform={`translate(${ekran.x}, ${ekran.y})`}
      onPointerDown={onMouseDown}
      data-object-id={obj.id} onContextMenu={onContextMenu}
      className="select-none cursor-pointer group/dugme"
    >
      <rect
        x={0}
        y={-14}
        width={genislik}
        height={28}
        rx={9}
        fill={obj.color || '#4f46e5'}
        stroke={secili ? '#ec4899' : '#ffffff'}
        strokeWidth={secili ? 2.5 : 1.5}
        className="shadow-md group-hover/dugme:brightness-110 transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onRun();
        }}
      />
      <text
        x={genislik / 2}
        y={4}
        textAnchor="middle"
        fill="#ffffff"
        className="font-black pointer-events-none"
        fontSize={11}
      >
        {obj.label || 'Düğme'}
      </text>
    </g>
  );
}

/**
 * GİRDİ KUTUSU — bağlı kaydırıcının değerini veya fonksiyonun ifadesini yazdırır.
 *
 * SVG içinde `foreignObject` ile gerçek bir `<input>` gösterilir; böylece klavye,
 * imleç ve seçim davranışı tarayıcının kendi girdi kutusuyla aynı olur.
 */
export function CanvasInputBox({
  obj,
  ekran,
  secili,
  deger,
  onCommit,
  onMouseDown,
  onContextMenu,
}: OrtakProps & {
  obj: InputBoxObject;
  /** Kutuda görünmesi gereken güncel değer */
  deger: string;
  /** Enter veya odak kaybında çağrılır; hata varsa mesaj döndürür */
  onCommit: (raw: string) => string | null;
}) {
  const [taslak, setTaslak] = useState(deger);
  const [hata, setHata] = useState<string | null>(null);
  const duzenleniyorRef = useRef(false);

  // Dışarıdan değer değiştiyse (kaydırıcı sürüklendi vb.) kutuyu güncelle —
  // ama kullanıcı o sırada yazıyorsa yazdığını ezme.
  useEffect(() => {
    if (!duzenleniyorRef.current) setTaslak(deger);
  }, [deger]);

  const genislik = obj.width ?? 120;
  const etiket = obj.label || '';
  const etiketGenislik = etiket ? etiket.length * 6.5 + 8 : 0;

  const uygula = () => {
    duzenleniyorRef.current = false;
    const sonuc = onCommit(taslak);
    setHata(sonuc);
    if (sonuc) setTaslak(deger);
  };

  return (
    <g
      transform={`translate(${ekran.x}, ${ekran.y})`}
      onPointerDown={onMouseDown}
      data-object-id={obj.id} onContextMenu={onContextMenu}
      className="select-none"
    >
      {etiket && (
        <text x={0} y={4} className="fill-foreground font-bold" fontSize={11}>
          {etiket}
        </text>
      )}
      <foreignObject x={etiketGenislik} y={-14} width={genislik} height={28}>
        <input
          type="text"
          value={taslak}
          aria-label={etiket || 'Girdi kutusu'}
          aria-invalid={hata !== null}
          onFocus={() => {
            duzenleniyorRef.current = true;
          }}
          onChange={(e) => {
            setTaslak(e.target.value);
            if (hata) setHata(null);
          }}
          onBlur={uygula}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === 'Escape') {
              duzenleniyorRef.current = false;
              setTaslak(deger);
              setHata(null);
              (e.target as HTMLInputElement).blur();
            }
          }}
          /* el-araci-izinli: El aracı etkinken kök SVG koruması (gorunumKaydirma.ts) basışı
             zaten yakalama aşamasında alır; buraya yalnız olağan araçlarda ulaşılır. */
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            height: '26px',
            boxSizing: 'border-box',
            padding: '2px 8px',
            borderRadius: '8px',
            border: `1.5px solid ${hata ? '#dc2626' : secili ? '#ec4899' : '#cbd5e1'}`,
            background: '#ffffff',
            color: '#0f172a',
            font: '600 11px ui-monospace, monospace',
            outline: 'none',
          }}
        />
      </foreignObject>
      {hata && (
        <text x={etiketGenislik} y={26} className="fill-destructive font-semibold" fontSize={9}>
          {hata}
        </text>
      )}
    </g>
  );
}

/** Kaydırıcı değerini kutuda gösterilecek metne çevirir. */
export function sliderDegerMetni(v: number): string {
  return formatTurkishNumber(v, 4);
}
