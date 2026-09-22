'use client';

import React, { useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Trash2, AlertTriangle, X, Shapes, Box } from 'lucide-react';

interface ConfirmClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetDimension: '2D' | '3D';
  objectCount: number;
}

export function ConfirmClearModal({
  isOpen,
  onClose,
  onConfirm,
  targetDimension,
  objectCount,
}: ConfirmClearModalProps) {
  // Yıkıcı olmayan seçenek ("Vazgeç") açılışta odaklanır; Enter yalnızca odaklı düğmeyi tetikler.
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const is2D = targetDimension === '2D';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="confirm-clear-title"
      initialFocusRef={cancelButtonRef}
      overlayClassName="bg-ada-murekkep/60 backdrop-blur-sm animate-in fade-in duration-200"
      className="bg-card text-card-foreground border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden"
    >
      {/* Arka Plan Dekoratif Işıma */}
      <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-destructive/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-ada-altin/10 blur-2xl pointer-events-none" />

      {/* Kapat Butonu */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        title="Kapat (Esc)"
        aria-label="Kapat"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Üst İkon & Başlık */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg shadow-destructive/25">
            <Trash2 className="w-6 h-6" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-ada-altin text-ada-murekkep flex items-center justify-center ring-2 ring-card shadow-sm">
            <AlertTriangle className="w-3 h-3" />
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-1">
              {is2D ? <Shapes className="w-3 h-3" /> : <Box className="w-3 h-3" />}
              {is2D ? '2D Çizim Alanı' : '3D Katı Cisim Alanı'}
            </span>
          </div>
          <h2 id="confirm-clear-title" className="text-lg font-black text-foreground tracking-tight">
            Tüm Ekranı Temizle
          </h2>
        </div>
      </div>

      {/* Açıklama Metni */}
      <div className="text-sm text-muted-foreground leading-relaxed">
        {is2D ? (
          <p>
            Çalışma alanındaki <span className="font-bold text-foreground">tüm 2D şekiller, noktalar ve çizimler</span> silinecektir. Ekrandaki tüm nesneleri temizlemek istediğinize emin misiniz?
          </p>
        ) : (
          <p>
            3D stüdyodaki <span className="font-bold text-foreground">tüm 3 boyutlu katı cisimler ve modeller</span> silinecektir. Ekrandaki tüm cisimleri temizlemek istediğinize emin misiniz?
          </p>
        )}
      </div>

      {/* Nesne Sayısı Durum Rozeti */}
      <div className="p-3.5 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-between text-xs font-semibold">
        <span className="text-muted-foreground flex items-center gap-2">
          <span>Silinecek Öğe:</span>
        </span>
        <span className="font-bold px-2.5 py-1 rounded-xl bg-card border border-border text-foreground">
          {objectCount > 0 ? (
            <span className="text-destructive font-black">
              {objectCount} {is2D ? 'nesne / şekil' : 'katı cisim'}
            </span>
          ) : (
            <span className="text-muted-foreground">Ekran şu anda boş</span>
          )}
        </span>
      </div>

      {/* Butonlar */}
      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
        <button
          ref={cancelButtonRef}
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-2xl text-xs font-bold text-foreground bg-muted hover:bg-muted/80 border border-border/60 transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-primary outline-none"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-black shadow-lg shadow-destructive/30 transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-ring outline-none"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Evet, Tümünü Sil</span>
        </button>
      </div>
    </Modal>
  );
}
