'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Check, PencilLine, RotateCcw, X } from 'lucide-react';

interface EtiketMetniDiyaloguProps {
  acik: boolean;
  /** Ekrandaki (hesaplanan ya da elle yazılmış) metin */
  metin: string;
  /** Etiket şu an elle yazılmış bir metin mi gösteriyor? (Hesaplanan yazıya dön düğmesi) */
  elleYazilmis: boolean;
  onKapat: () => void;
  onKaydet: (metin: string) => void;
  onHesaplananaDon: () => void;
}

/**
 * Ölçü etiketinin metnini elle yazma penceresi (sağ tık > "Etiketi düzenle…").
 * Tek satır; Enter kaydeder, Esc kapatır (Modal). Boş metin kaydedilirse hesaplanan yazıya dönülür.
 */
export function EtiketMetniDiyalogu({ acik, metin, elleYazilmis, onKapat, onKaydet, onHesaplananaDon }: EtiketMetniDiyaloguProps) {
  const [deger, setDeger] = useState(metin);
  const girdiRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!acik) return;
    setDeger(metin);
    const zamanlayici = window.setTimeout(() => {
      girdiRef.current?.focus();
      girdiRef.current?.select();
    }, 50);
    return () => window.clearTimeout(zamanlayici);
  }, [acik, metin]);

  const kaydet = () => {
    const temiz = deger.trim();
    if (temiz) onKaydet(temiz);
    else onHesaplananaDon();
  };

  return (
    <Modal
      isOpen={acik}
      onClose={onKapat}
      labelledBy="etiket-metni-baslik"
      initialFocusRef={girdiRef}
      overlayClassName="bg-ada-murekkep/45 backdrop-blur-sm animate-in fade-in duration-150"
      className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-3xl p-5 space-y-4 select-none animate-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <PencilLine className="w-4 h-4" />
          </div>
          <div>
            <h3 id="etiket-metni-baslik" className="text-sm font-black text-foreground">Etiketi Düzenle</h3>
            <p className="text-[11px] text-muted-foreground font-medium">
              Hesaplanan yazının yerine kendi metninizi yazın (ör. Alan = ?).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onKapat}
          className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          title="Kapat (Esc)"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <input
        ref={girdiRef}
        type="text"
        value={deger}
        onChange={(e) => setDeger(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            kaydet();
          }
        }}
        placeholder="Etiket metni"
        aria-label="Etiket metni"
        className="w-full p-3 rounded-2xl bg-muted/50 border border-border focus:border-primary focus:ring-2 focus:ring-ring/25 text-sm font-bold placeholder:text-muted-foreground/60 outline-none transition-all text-foreground"
      />

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/80">
        <div>
          {elleYazilmis && (
            <button
              type="button"
              onClick={onHesaplananaDon}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition-all cursor-pointer"
              title="Elle yazılan metni kaldırır; etiket yeniden hesaplanan değeri gösterir"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hesaplanan yazıya dön</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onKapat}
            className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition-all cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={kaydet}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition-all cursor-pointer shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Kaydet</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
