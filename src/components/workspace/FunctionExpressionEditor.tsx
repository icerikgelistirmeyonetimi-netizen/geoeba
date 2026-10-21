'use client';

import React, { useState } from 'react';
import { Delete } from 'lucide-react';
import type { IfadeDuzenleme } from './fonksiyonEditoru';

interface FunctionExpressionEditorProps {
  id?: string;
  onInsert: (eylem: IfadeDuzenleme) => void;
  onText: (metin: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  ileriIslevler: boolean;
}

interface EditorTusu {
  simge: React.ReactNode;
  ad: string;
  eylem?: IfadeDuzenleme;
  metin?: string;
  komut?: 'sil' | 'temizle';
}

const rakam = (sayi: string): EditorTusu => ({ simge: sayi, ad: sayi, metin: sayi });
const dereceKoku: EditorTusu = { eylem: 'kok', simge: <><sup>n</sup>√</>, ad: 'İstenilen dereceden kök' };
const eSabiti: EditorTusu = { eylem: 'e', simge: <i>e</i>, ad: 'e sayısı (Euler sayısı)' };
const piSabiti: EditorTusu = { eylem: 'pi', simge: 'π', ad: 'Pi sayısı' };

// Sayılar, hesap makinelerindeki üç sütunlu yerleşimi izler.
const TUSLAR: EditorTusu[] = [
  rakam('7'), rakam('8'), rakam('9'),
  { eylem: 'bolu', simge: '÷', ad: 'Bölme' },
  { eylem: 'karekok', simge: '√', ad: 'Karekök' },
  { eylem: 'kupkok', simge: '∛', ad: 'Küpkök' },
  { komut: 'sil', simge: <Delete className="h-4 w-4" />, ad: 'Geri sil' },
  rakam('4'), rakam('5'), rakam('6'),
  { eylem: 'carpi', simge: '×', ad: 'Çarpma' },
  dereceKoku,
  { eylem: 'kare', simge: <>x<sup>2</sup></>, ad: 'Kare' },
  { komut: 'temizle', simge: 'C', ad: 'İfadeyi temizle' },
  rakam('1'), rakam('2'), rakam('3'),
  { eylem: 'eksi', simge: '−', ad: 'Çıkarma' },
  { eylem: 'us', simge: <>x<sup>n</sup></>, ad: 'Üs' },
  { eylem: 'kesir', simge: '□/□', ad: 'Kesir' },
  { eylem: 'mutlak', simge: '|x|', ad: 'Mutlak değer' },
  rakam('0'), { simge: '.', ad: 'Ondalık ayırıcı', metin: '.' },
  { eylem: 'x', simge: 'x', ad: 'Değişken x' },
  { eylem: 'arti', simge: '+', ad: 'Toplama' },
  { eylem: 'parantez', simge: '( )', ad: 'Parantez' },
  piSabiti, eSabiti,
];

const ISLEVLER: EditorTusu[] = [
  { eylem: 'sin', simge: 'sin', ad: 'Sinüs (radyan)' },
  { eylem: 'cos', simge: 'cos', ad: 'Kosinüs (radyan)' },
  { eylem: 'tan', simge: 'tan', ad: 'Tanjant (radyan)' },
  { eylem: 'cot', simge: 'cot', ad: 'Kotanjant (radyan)' },
  { eylem: 'sind', simge: 'sin°', ad: 'Sinüs (derece)' },
  { eylem: 'cosd', simge: 'cos°', ad: 'Kosinüs (derece)' },
  { eylem: 'tand', simge: 'tan°', ad: 'Tanjant (derece)' },
  { eylem: 'cotd', simge: 'cot°', ad: 'Kotanjant (derece)' },
  { eylem: 'asin', simge: 'asin', ad: 'Ters sinüs (sonuç radyan)' },
  { eylem: 'acos', simge: 'acos', ad: 'Ters kosinüs (sonuç radyan)' },
  { eylem: 'atan', simge: 'atan', ad: 'Ters tanjant (sonuç radyan)' },
  { eylem: 'ln', simge: 'ln', ad: 'Doğal logaritma' },
  { eylem: 'log', simge: 'log', ad: '10 tabanında logaritma' },
  dereceKoku, piSabiti, eSabiti,
];

/** Kompakt tuş takımı, şablonu metin kutusundaki seçime uygular. */
export function FunctionExpressionEditor({ id = 'function-expression-editor', onInsert, onText, onBackspace, onClear, ileriIslevler }: FunctionExpressionEditorProps) {
  const [islevlerAcik, setIslevlerAcik] = useState(false);
  const [kokIpucu, setKokIpucu] = useState(false);
  const islevler = ileriIslevler && islevlerAcik;

  const tusaBas = (tus: EditorTusu) => {
    setKokIpucu(tus.eylem === 'kok');
    if (tus.eylem) onInsert(tus.eylem);
    else if (tus.metin !== undefined) onText(tus.metin);
    else if (tus.komut === 'sil') onBackspace();
    else if (tus.komut === 'temizle') onClear();
  };

  return (
    <section id={id} aria-label="Matematik editörü" className="rounded-xl border border-primary/20 bg-primary/5 p-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground">Matematik editörü</span>
        {ileriIslevler && (
          <div className="inline-flex gap-0.5 rounded-md bg-muted p-0.5" aria-label="Tuş takımı seçenekleri">
            {[false, true].map((acik) => (
              <button key={String(acik)} type="button" aria-pressed={islevler === acik}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => { setIslevlerAcik(acik); setKokIpucu(false); }}
                className={`rounded px-2 py-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${islevler === acik ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {acik ? 'İşlevler' : 'Tuşlar'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={`grid gap-1 ${islevler ? 'grid-cols-4' : 'grid-cols-7'}`}>
        {(islevler ? ISLEVLER : TUSLAR).map((tus) => (
          <button key={tus.ad} type="button" aria-label={tus.ad} title={tus.ad}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => tusaBas(tus)}
            className={`flex h-9 min-w-0 items-center justify-center rounded-md border border-border font-mono text-sm transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tus.metin !== undefined ? 'bg-card font-semibold text-foreground' : 'bg-primary/5 text-primary'}`}>
            <span aria-hidden="true">{tus.simge}</span>
          </button>
        ))}
      </div>
      <p className="min-h-7 text-[10px] leading-snug text-muted-foreground" aria-live="polite">
        {kokIpucu
          ? 'Kök derecesi için seçili 2’nin yerine pozitif bir tam sayı yazalım.'
          : islevler
          ? 'sin, cos, tan, cot: radyan; °: derece. asin, acos, atan sonuçları radyan cinsindendir.'
          : 'Bir bölümü seçip kök ya da kesir içine alabiliriz. e ≈ 2,71828.'}
      </p>
    </section>
  );
}
