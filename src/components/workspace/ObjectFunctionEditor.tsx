'use client';

import React, { useId, useRef } from 'react';
import { Check } from 'lucide-react';
import { FunctionExpressionEditor } from './FunctionExpressionEditor';
import { ifadedenGeriSil, ifadeyeMetinEkle, ifadeyeSablonEkle } from './fonksiyonEditoru';

interface ObjectFunctionEditorProps {
  expression: string;
  onChange: (expression: string) => void;
  onSave: () => void;
  onCancel: () => void;
  error: string | null;
  ileriIslevler: boolean;
}

/** Nesne kartında düzenlerken sahne, Kaydet'e basılana kadar değişmez. */
export function ObjectFunctionEditor({ expression, onChange, onSave, onCancel, error, ileriIslevler }: ObjectFunctionEditorProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef({ bas: expression.length, son: expression.length });

  const secimiKaydet = () => {
    const input = inputRef.current;
    if (input) selectionRef.current = { bas: input.selectionStart ?? expression.length, son: input.selectionEnd ?? expression.length };
  };

  const uygula = (yeni: { ifade: string; bas: number; son: number }) => {
    onChange(yeni.ifade);
    selectionRef.current = { bas: yeni.bas, son: yeni.son };
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(yeni.bas, yeni.son);
    });
  };

  return (
    <form className="mt-2.5 space-y-2 border-t border-primary/15 pt-2.5 cursor-default select-text"
      aria-label="Nesne fonksiyonunu düzenle"
      onClick={(event) => event.stopPropagation()}
      onSubmit={(event) => { event.preventDefault(); onSave(); }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
      }}>
      <label htmlFor={`${id}-expression`} className="block text-[11px] font-semibold text-muted-foreground">Fonksiyon ifadesi</label>
      <input id={`${id}-expression`} ref={inputRef} type="text" autoFocus value={expression}
        onChange={(event) => { onChange(event.target.value); secimiKaydet(); }}
        onSelect={secimiKaydet} onBlur={secimiKaydet}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
        autoComplete="off" spellCheck={false}
        className="w-full min-w-0 rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      <FunctionExpressionEditor id={`${id}-keypad`}
        onInsert={(eylem) => uygula(ifadeyeSablonEkle(expression, selectionRef.current.bas, selectionRef.current.son, eylem))}
        onText={(metin) => uygula(ifadeyeMetinEkle(expression, selectionRef.current.bas, selectionRef.current.son, metin))}
        onBackspace={() => uygula(ifadedenGeriSil(expression, selectionRef.current.bas, selectionRef.current.son))}
        onClear={() => uygula({ ifade: '', bas: 0, son: 0 })}
        ileriIslevler={ileriIslevler} />
      {error && <p id={`${id}-error`} role="alert" className="text-[11px] leading-snug text-destructive">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary">İptal</button>
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />Kaydet
        </button>
      </div>
    </form>
  );
}
