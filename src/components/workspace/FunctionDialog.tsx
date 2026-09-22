'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { validateMathExpression } from '@/math/parser';
import { functionNameOf, functionNameOwner, nextFunctionName, undefinedFunctionCalls } from '@/math/functionNames';
import { Modal } from '@/components/ui/Modal';
import { TrendingUp, X, Check, AlertCircle } from 'lucide-react';

interface FunctionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TEMPLATES = [
  { label: 'Doğrusal: 2x + 1', expr: '2*x + 1' },
  { label: 'Parabol: x² - 4', expr: 'x^2 - 4' },
  { label: 'Sinüs: sin(x)', expr: 'sin(x)' },
  { label: 'Kosinüs: cos(x)', expr: 'cos(x)' },
  { label: 'Mutlak Değer: |x-2|', expr: '|x-2|' },
  { label: 'Parametreli: a*x^2 + b', expr: 'a*x^2 + b' },
  { label: 'Karekök: sqrt(x)', expr: 'sqrt(x)' },
  { label: 'Derece: sind(x)', expr: 'sind(x)' },
];

const DEFAULT_EXPRESSION = '2*x + 1';

/** Yalnız harf yazılan ad ("g") çağrılabilir biçime getirilir: "g(x)". */
const callableName = (typed: string) => (/^[a-zçğıöşü][a-zçğıöşü0-9]?$/i.test(typed) ? `${typed}(x)` : typed);

export function FunctionDialog({ isOpen, onClose }: FunctionDialogProps) {
  const { addFunction, objects } = useWorkspace();
  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [label, setLabel] = useState('f(x)');

  const validation = validateMathExpression(expression);
  // Aynı adla ikinci fonksiyon eklenmez; tanımsız çağrı ("h(x)" yokken) kaydırıcıya dönüşmesin.
  const typedName = functionNameOf({ label: `${callableName(label.trim())} = 0` });
  const nameOwner = typedName ? functionNameOwner(objects, typedName) : undefined;
  const missingCalls = validation.ok ? undefinedFunctionCalls(objects, expression, typedName) : [];
  const isValid = validation.ok && !nameOwner && missingCalls.length === 0;

  // Diyalog kalıcı olarak mount edilir; her açılışta ifadeyi ve adı sıfırla.
  // Ad, mevcut fonksiyon etiketleriyle çakışmayan sıradaki addır.
  const objectsRef = useRef(objects);
  objectsRef.current = objects;

  useEffect(() => {
    if (!isOpen) return;
    setExpression(DEFAULT_EXPRESSION);
    setLabel(`${nextFunctionName(objectsRef.current)}(x)`);
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expr = expression.trim();
    if (!isValid || !expr) return;

    // Ad boş bırakılırsa " = 2*x + 1" gibi bozuk bir etiket oluşmasın.
    const name = callableName(label.trim()) || `${nextFunctionName(objects)}(x)`;
    addFunction(expr, `${name} = ${expr}`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="function-dialog-title"
      overlayClassName="bg-ada-murekkep/60 backdrop-blur-sm"
      className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 id="function-dialog-title" className="text-base font-bold text-foreground">
            Fonksiyon Grafiği Ekle
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Kapat (Esc)"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground" htmlFor="function-expression-input">
            Fonksiyon İfadesi (x değişkenine bağlı)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-16 px-2 py-2 rounded-xl bg-input border border-border text-foreground font-mono text-xs font-bold focus:ring-2 focus:ring-primary outline-none text-center"
              aria-label="Fonksiyon adı"
            />
            <span className="font-mono text-xs font-bold text-muted-foreground">=</span>
            <input
              id="function-expression-input"
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="Örn: 2*x + 1 veya x^2 - 4"
              className="w-full px-3 py-2 rounded-xl bg-input border border-border text-foreground font-mono text-sm focus:ring-2 focus:ring-primary outline-none"
              autoFocus
              aria-invalid={!validation.ok && expression.trim() !== ''}
            />
          </div>
          {!validation.ok && expression.trim() !== '' && (
            <div className="flex items-start gap-1 text-[11px] text-destructive pt-1" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{validation.error}</span>
            </div>
          )}
          {(nameOwner || missingCalls.length > 0) && (
            <div className="flex items-start gap-1 text-[11px] text-destructive pt-1" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                {nameOwner
                  ? `“${typedName}” adı zaten kullanılıyor. Başka bir ad yazın (örn. ${nextFunctionName(objects)}(x)).`
                  : `${missingCalls[0]}(x) tanımlı değil. Önce onu tanımlayın; çarpma için ${missingCalls[0]}*(…) yazın.`}
              </span>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground leading-snug pt-0.5">
            İpuçları: <code className="font-mono">2x</code>, <code className="font-mono">x sin(x)</code> ve{' '}
            <code className="font-mono">x²</code> yazımı desteklenir. Trigonometri:{' '}
            <code className="font-mono">sin(x)</code> radyan, <code className="font-mono">sind(x)</code> derece. Mutlak değer: <code className="font-mono">|x-2|</code> veya <code className="font-mono">abs(x-2)</code>.
            Ondalık için <code className="font-mono">0,5</code> veya <code className="font-mono">0.5</code>.
          </p>
        </div>

        {/* Hızlı Şablonlar */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Hızlı Şablonlar
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                type="button"
                key={t.expr}
                onClick={() => setExpression(t.expr)}
                className="px-2.5 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium text-foreground text-left truncate transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={!isValid || !expression.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Grafiği Çiz</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
