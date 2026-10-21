'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { validateMathExpression } from '@/math/parser';
import {
  calledNames, functionDefinitionCycle, functionNameOf, functionNameOwner, nextFunctionName, undefinedFunctionCalls,
} from '@/math/functionNames';
import { fonksiyonAdiYazimi } from '@/math/fonksiyonYazimi';
import { useKademeDuzeyi } from '@/hooks/useKademeDuzeyi';
import type { FunctionObject, MathObject } from '@/types/math';
import { Modal } from '@/components/ui/Modal';
import { TrendingUp, X, Check, AlertCircle, Keyboard } from 'lucide-react';
import { fonksiyonSablonlari, trigonometriIpucuGosterilir } from './fonksiyonSablonlari';
import { FunctionExpressionEditor } from './FunctionExpressionEditor';
import { ifadeyeSablonEkle, ifadeyeMetinEkle, ifadedenGeriSil, type IfadeDuzenleme } from './fonksiyonEditoru';

interface FunctionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Düzenlenecek fonksiyonun kimliği (Bağlamlar > "Fonksiyon Formülünü Düzenle"): pencere bu fonksiyonun formülü
   * ve adıyla dolu açılır, "Güncelle" AYNI nesneyi değiştirir (alan uzmanı, 4. tur, satır 162). Yoksa yeni fonksiyon.
   */
  duzenlenecekId?: string | null;
}

const DEFAULT_EXPRESSION = '2*x + 1';

/** Düzenlenen fonksiyonun ad kutusundaki adı: "f(x)"; "y = …" etiketlide "y"; adsızda sıradaki boş ad. */
export function duzenlemeAdi(fn: FunctionObject, objects: readonly MathObject[]): string {
  const ad = fonksiyonAdiYazimi(fn);
  if (ad) return ad;
  if (/^\s*y\s*=/i.test(fn.label ?? '')) return 'y';
  return `${nextFunctionName(objects.filter((o) => o.id !== fn.id))}(x)`;
}

/**
 * Ad ve formülün öteki fonksiyonlarla bağı (denetim, 4. tur): döngü ("f(x) = g(x) − 1" iken g(x) = f(x) + 1) ve
 * düzenlenen fonksiyonun adı değişirken onu çağıran fonksiyonlar ("g(x) = f(x) + 1" varken f → p) grafikleri
 * uyarısız siliyordu; ikisi de Cebir girişindeki gibi engellenir. `ad`: yazılan çağrılabilir ad (küçük harf).
 */
export function bagimlilikEngelleri(
  objects: readonly MathObject[],
  ad: string | undefined,
  ifade: string,
  duzenlenen?: FunctionObject
): { dongu: string[] | null; eskiAd: string | undefined; cagiranlar: FunctionObject[] } {
  const dongu = ad ? functionDefinitionCycle(objects, ad, ifade) : null;
  const eskiAd = duzenlenen ? functionNameOf(duzenlenen) : undefined;
  const cagiranlar =
    duzenlenen && eskiAd && eskiAd !== ad
      ? (objects.filter(
          (o) => o.type === 'function' && o.id !== duzenlenen.id && calledNames((o as FunctionObject).expression).includes(eskiAd)
        ) as FunctionObject[])
      : [];
  return { dongu, eskiAd, cagiranlar };
}

/** Yalnız harf yazılan ad ("g") çağrılabilir biçime getirilir: "g(x)". */
const callableName = (typed: string) => (/^[a-zçğıöşü][a-zçğıöşü0-9]?$/i.test(typed) ? `${typed}(x)` : typed);

export function FunctionDialog({ isOpen, onClose, duzenlenecekId = null }: FunctionDialogProps) {
  const { addFunction, updateFunction, objects } = useWorkspace();
  const [expression, setExpression] = useState(DEFAULT_EXPRESSION);
  const [label, setLabel] = useState('f(x)');
  const [editorAcik, setEditorAcik] = useState(false);
  const expressionInputRef = useRef<HTMLInputElement>(null);
  const expressionSelectionRef = useRef({ bas: 0, son: 0 });
  // Hızlı şablonlar kademeye göre: ortaokulda yalnız doğrusal fonksiyon (fonksiyonSablonlari.ts).
  const [kademe] = useKademeDuzeyi();
  const sablonlar = fonksiyonSablonlari(kademe);
  const duzenlenen = duzenlenecekId
    ? (objects.find((o) => o.id === duzenlenecekId && o.type === 'function') as FunctionObject | undefined)
    : undefined;

  const validation = validateMathExpression(expression);
  // Aynı adla ikinci fonksiyon eklenmez; tanımsız çağrı ("h(x)" yokken) kaydırıcıya dönüşmesin.
  // Düzenlenen fonksiyonun kendi adı "kullanılıyor" sayılmaz.
  const typedName = functionNameOf({ label: `${callableName(label.trim())} = 0` });
  const nameOwner = typedName ? functionNameOwner(objects, typedName, duzenlenen?.id) : undefined;
  const missingCalls = validation.ok ? undefinedFunctionCalls(objects, expression, typedName) : [];
  const { dongu, eskiAd, cagiranlar } = validation.ok
    ? bagimlilikEngelleri(objects, typedName, expression, duzenlenen)
    : { dongu: null, eskiAd: undefined, cagiranlar: [] };
  const isValid = validation.ok && !nameOwner && missingCalls.length === 0 && !dongu && cagiranlar.length === 0;

  // Diyalog kalıcı olarak mount edilir; her açılışta ifadeyi ve adı sıfırla.
  // Ad, mevcut fonksiyon etiketleriyle çakışmayan sıradaki addır.
  const objectsRef = useRef(objects);
  objectsRef.current = objects;

  useEffect(() => {
    if (!isOpen) return;
    setEditorAcik(false);
    // Düzenlemede seçili fonksiyonun formülü ve adı yüklenir (eskiden varsayılan 2*x + 1 geliyordu)
    const fn = duzenlenecekId
      ? (objectsRef.current.find((o) => o.id === duzenlenecekId && o.type === 'function') as FunctionObject | undefined)
      : undefined;
    if (fn) {
      setExpression(fn.expression);
      expressionSelectionRef.current = { bas: fn.expression.length, son: fn.expression.length };
      setLabel(duzenlemeAdi(fn, objectsRef.current));
      return;
    }
    setExpression(DEFAULT_EXPRESSION);
    expressionSelectionRef.current = { bas: DEFAULT_EXPRESSION.length, son: DEFAULT_EXPRESSION.length };
    setLabel(`${nextFunctionName(objectsRef.current)}(x)`);
  }, [isOpen, duzenlenecekId]);

  const secimiKaydet = () => {
    const input = expressionInputRef.current;
    if (input) expressionSelectionRef.current = { bas: input.selectionStart ?? expression.length, son: input.selectionEnd ?? expression.length };
  };

  const editorDegisikliginiUygula = (yeni: { ifade: string; bas: number; son: number }) => {
    setExpression(yeni.ifade);
    expressionSelectionRef.current = { bas: yeni.bas, son: yeni.son };
    requestAnimationFrame(() => {
      expressionInputRef.current?.focus();
      expressionInputRef.current?.setSelectionRange(yeni.bas, yeni.son);
    });
  };

  const editorSablonuEkle = (eylem: IfadeDuzenleme) => {
    const { bas, son } = expressionSelectionRef.current;
    editorDegisikliginiUygula(ifadeyeSablonEkle(expression, bas, son, eylem));
  };

  const editorMetniEkle = (metin: string) => {
    const { bas, son } = expressionSelectionRef.current;
    editorDegisikliginiUygula(ifadeyeMetinEkle(expression, bas, son, metin));
  };

  const editorGeriSil = () => {
    const { bas, son } = expressionSelectionRef.current;
    editorDegisikliginiUygula(ifadedenGeriSil(expression, bas, son));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expr = expression.trim();
    if (!isValid || !expr) return;

    // Ad boş bırakılırsa " = 2*x + 1" gibi bozuk bir etiket oluşmasın.
    const digerleri = duzenlenen ? objects.filter((o) => o.id !== duzenlenen.id) : objects;
    const yazilan = label.trim();
    const name = duzenlenen && yazilan.toLowerCase() === 'y' ? 'y' : callableName(yazilan) || `${nextFunctionName(digerleri)}(x)`;
    if (duzenlenen) updateFunction(duzenlenen.id, expr, `${name} = ${expr}`);
    else addFunction(expr, `${name} = ${expr}`);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="function-dialog-title"
      overlayClassName="bg-ada-murekkep/60 backdrop-blur-sm"
      className="bg-card border border-border w-full max-w-lg max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 id="function-dialog-title" className="text-base font-bold text-foreground">
            {duzenlenen ? 'Fonksiyonu Düzenle' : 'Fonksiyon Grafiği Ekle'}
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
              className="w-16 shrink-0 px-2 py-2 rounded-xl bg-input border border-border text-foreground font-mono text-xs font-bold focus:ring-2 focus:ring-primary outline-none text-center"
              aria-label="Fonksiyon adı"
            />
            <span className="font-mono text-xs font-bold text-muted-foreground">=</span>
            <input
              id="function-expression-input"
              ref={expressionInputRef}
              type="text"
              value={expression}
              onChange={(e) => { setExpression(e.target.value); secimiKaydet(); }}
              onSelect={secimiKaydet}
              onBlur={secimiKaydet}
              placeholder="Örn: 2*x + 1 veya x^2 - 4"
              className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-input border border-border text-foreground font-mono text-sm focus:ring-2 focus:ring-primary outline-none"
              autoFocus
              aria-invalid={!validation.ok && expression.trim() !== ''}
            />
            <button
              type="button"
              aria-label={editorAcik ? 'Matematik editörünü kapat' : 'Matematik editörünü aç'}
              title={editorAcik ? 'Matematik editörünü kapat' : 'Matematik editörünü aç'}
              aria-expanded={editorAcik}
              aria-controls="function-expression-editor"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setEditorAcik((acik) => !acik)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${editorAcik ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-primary hover:bg-muted'}`}
            >
              <Keyboard className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Editör</span>
            </button>
          </div>
          {editorAcik && <FunctionExpressionEditor
            onInsert={editorSablonuEkle}
            onText={editorMetniEkle}
            onBackspace={editorGeriSil}
            onClear={() => editorDegisikliginiUygula({ ifade: '', bas: 0, son: 0 })}
            ileriIslevler={trigonometriIpucuGosterilir(kademe)}
          />}
          {!validation.ok && expression.trim() !== '' && (
            <div className="flex items-start gap-1 text-[11px] text-destructive pt-1" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{validation.error}</span>
            </div>
          )}
          {(nameOwner || missingCalls.length > 0 || dongu || cagiranlar.length > 0) && (
            <div className="flex items-start gap-1 text-[11px] text-destructive pt-1" role="alert">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                {nameOwner
                  ? `“${typedName}” adı zaten kullanılıyor. Başka bir ad yazın (örn. ${nextFunctionName(objects)}(x)).`
                  : missingCalls.length > 0
                  ? `${missingCalls[0]}(x) tanımlı değil. Önce onu tanımlayın; çarpma için ${missingCalls[0]}*(…) yazın.`
                  : dongu
                  ? `${typedName}(x) kendisine bağlı olamaz: ${dongu.map((n) => `${n}(x)`).join(' → ')}.`
                  : `${eskiAd}(x) adı ${cagiranlar.map((o) => fonksiyonAdiYazimi(o) ?? 'y').join(', ')} içinde kullanılıyor; adını değiştirmeden güncelleyin.`}
              </span>
            </div>
          )}
          {!editorAcik && <p className="text-[11px] text-muted-foreground leading-snug pt-0.5">
            {trigonometriIpucuGosterilir(kademe) ? (
              <>
                İpuçları: <code className="font-mono">2x</code>, <code className="font-mono">x sin(x)</code> ve{' '}
                <code className="font-mono">x²</code> yazımı desteklenir. Trigonometri:{' '}
                <code className="font-mono">sin(x)</code> radyan, <code className="font-mono">sind(x)</code> derece.{' '}
              </>
            ) : (
              <>
                İpuçları: <code className="font-mono">2x</code> ve <code className="font-mono">x²</code> yazımı desteklenir.
                Karekök: <code className="font-mono">sqrt(x)</code> ya da <code className="font-mono">√x</code>.{' '}
              </>
            )}
            Mutlak değer: <code className="font-mono">|x-2|</code> veya <code className="font-mono">abs(x-2)</code>.
            Ondalık için <code className="font-mono">0,5</code> veya <code className="font-mono">0.5</code>.
          </p>}
        </div>

        {/* Hızlı Şablonlar */}
        <details open={!editorAcik} className="space-y-1.5">
          <summary className="cursor-pointer text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Hızlı Şablonlar
          </summary>
          <div className="grid grid-cols-2 gap-2">
            {sablonlar.map((t) => (
              <button
                type="button"
                key={t.expr}
                onClick={() => {
                  setExpression(t.expr);
                  expressionSelectionRef.current = { bas: t.expr.length, son: t.expr.length };
                  requestAnimationFrame(() => {
                    expressionInputRef.current?.focus();
                    expressionInputRef.current?.setSelectionRange(t.expr.length, t.expr.length);
                  });
                }}
                className="px-2.5 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium text-foreground text-left truncate transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </details>

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
            <span>{duzenlenen ? 'Güncelle' : 'Grafiği Çiz'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
