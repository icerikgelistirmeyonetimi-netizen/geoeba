'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';

export interface ValuePromptRequest {
  /** Pencere başlığı, örn. "Uzunluğu Verilen Doğru Parçası" */
  title: string;
  /** Alan etiketi, örn. "Uzunluk" */
  label: string;
  /** Alanın sağında gösterilen birim, örn. "br" (boş bırakılabilir) */
  unit?: string;
  /** Açılışta kutuda yazan değer */
  initial?: string;
  placeholder?: string;
  /** Kısa açıklama satırı */
  hint?: string;
  /**
   * Değeri uygular. Hata varsa HATA METNİ döndürür, başarılıysa null.
   * Doğrulama burada yapılır; böylece her araç kendi kuralını yazar.
   */
  onSubmit: (raw: string) => string | null;
}

interface Props {
  request: ValuePromptRequest | null;
  onClose: () => void;
}

/**
 * Araçların sayı veya oran sorması için ortak pencere.
 *
 * "Uzunluğu verilen doğru parçası" ve "oranda böl" gibi araçlar tıklamadan sonra
 * bir değer ister. Her biri için ayrı pencere yazmak yerine doğrulamayı çağırana
 * bırakan tek bir pencere kullanılır.
 */
export function ValuePromptDialog({ request, onClose }: Props) {
  const [deger, setDeger] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!request) return;
    setDeger(request.initial ?? '');
    setHata(null);
    // Modal açıldıktan sonra odak ve tüm metni seçili getir
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
    return () => window.clearTimeout(t);
  }, [request]);

  if (!request) return null;

  const gonder = (e: React.FormEvent) => {
    e.preventDefault();
    const sonuc = request.onSubmit(deger);
    if (sonuc) {
      setHata(sonuc);
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      overlayClassName="bg-ada-murekkep/60 backdrop-blur-sm select-none"
      className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150"
    >
      <form onSubmit={gonder} className="p-5 space-y-4">
        <h2 className="text-sm font-black text-foreground">{request.title}</h2>

        <div className="space-y-1.5">
          <label htmlFor="deger-girisi" className="block text-[11px] font-bold text-muted-foreground">
            {request.label}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="deger-girisi"
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={deger}
              placeholder={request.placeholder}
              onChange={(e) => {
                setDeger(e.target.value);
                if (hata) setHata(null);
              }}
              aria-invalid={hata !== null}
              className={`flex-1 px-3 py-2 rounded-xl bg-background border text-sm font-mono outline-none focus:border-primary ${
                hata ? 'border-destructive' : 'border-border'
              }`}
            />
            {request.unit && (
              <span className="text-xs font-bold text-muted-foreground shrink-0">{request.unit}</span>
            )}
          </div>
          {request.hint && !hata && (
            <p className="text-[11px] text-muted-foreground leading-snug">{request.hint}</p>
          )}
          {hata && (
            <p role="alert" className="text-[11px] text-destructive font-semibold">
              {hata}
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary-hover shadow-sm transition-colors cursor-pointer"
          >
            Uygula
          </button>
        </div>
      </form>
    </Modal>
  );
}
