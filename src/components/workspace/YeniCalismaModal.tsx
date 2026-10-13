'use client';

/**
 * Dosya > Yeni (Ctrl+N) onayı: kaydedilmemiş değişiklik varsa "Kaydet / Kaydetmeden Yeni / Vazgeç" sorulur
 * (alan uzmanı, atölye inceleme 4. tur: "Yeni" eskiden "Tümünü Sil" ile aynı "Tüm Ekranı Temizle" uyarısını açıyordu).
 * Değişiklik yoksa (boş ya da az önce kaydedilmiş çalışma) pencere açılmadan yeni çalışmaya geçilir (WorkspaceMenuBar).
 */
import React, { useRef } from 'react';
import { FileText, Save, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface YeniCalismaModalProps {
  isOpen: boolean;
  /** 2B nesne sayısı */
  nesneSayisi: number;
  /** 3B cisim sayısı */
  cisimSayisi: number;
  onKaydet: () => void;
  onKaydetmeden: () => void;
  onVazgec: () => void;
}

/** Kaydedilmemiş çalışmanın imzası: 2B nesneler ve 3B cisimler (görünüm ve ayarlar sayılmaz). */
export function calismaImzasi(nesneler: readonly unknown[], cisimler: readonly unknown[]): string {
  return JSON.stringify([nesneler, cisimler]);
}

/** Yeni çalışmaya geçmeden önce sorulmalı mı? Boş çalışma ya da son kayıttan beri değişmemiş çalışma sorulmaz. */
export function yeniIcinSorulmaliMi(nesneler: readonly unknown[], cisimler: readonly unknown[], kayitliImza: string | null): boolean {
  if (nesneler.length === 0 && cisimler.length === 0) return false;
  return calismaImzasi(nesneler, cisimler) !== kayitliImza;
}

export function YeniCalismaModal({ isOpen, nesneSayisi, cisimSayisi, onKaydet, onKaydetmeden, onVazgec }: YeniCalismaModalProps) {
  const kaydetRef = useRef<HTMLButtonElement>(null);
  const icerik = [nesneSayisi > 0 ? `${nesneSayisi} nesne` : null, cisimSayisi > 0 ? `${cisimSayisi} katı cisim` : null]
    .filter(Boolean)
    .join(' ve ');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onVazgec}
      labelledBy="yeni-calisma-baslik"
      initialFocusRef={kaydetRef}
      overlayClassName="bg-ada-murekkep/60 backdrop-blur-sm animate-in fade-in duration-200"
      className="bg-card text-card-foreground border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25">
            <FileText className="w-6 h-6" aria-hidden="true" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-ada-altin text-ada-murekkep flex items-center justify-center ring-2 ring-card shadow-sm">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          </span>
        </div>
        <div className="space-y-1">
          <h2 id="yeni-calisma-baslik" className="text-lg font-black text-foreground tracking-tight">
            Kaydedilmemiş değişiklikler var
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Yeni çalışma açılınca {icerik ? <span className="font-bold text-foreground">{icerik}</span> : 'çizim'} silinir.
            Önce kaydetmek ister misiniz?
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-bold text-foreground">Kaydet:</span> çalışma .geoeba dosyası olarak indirilir, sonra yeni çalışma
        açılır. Ayarlarınız (zemin, ızgara, yazı boyutu) korunur.
      </p>

      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-border">
        <button
          type="button"
          onClick={onVazgec}
          className="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-bold text-foreground bg-muted hover:bg-muted/80 border border-border/60 transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-primary outline-none"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onKaydetmeden}
          className="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-bold text-destructive bg-card hover:bg-destructive/10 border border-destructive/40 transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-destructive outline-none"
        >
          Kaydetmeden Yeni
        </button>
        <button
          ref={kaydetRef}
          type="button"
          onClick={onKaydet}
          className="inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black shadow-lg shadow-primary/30 transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-ring outline-none"
        >
          <Save className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Kaydet</span>
        </button>
      </div>
    </Modal>
  );
}
