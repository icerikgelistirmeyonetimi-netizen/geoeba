'use client';

import React, { useEffect, useRef } from 'react';
import { registerModalClose, registerModalOpen } from './modalState';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Diyalog başlığının id'si (aria-labelledby) */
  labelledBy?: string;
  /** Diyalog paneline uygulanacak sınıflar (görünüm her diyalogda korunur) */
  className?: string;
  /** Arka plan katmanına uygulanacak sınıflar */
  overlayClassName?: string;
  /** Açılışta odaklanacak eleman; verilmezse panel içindeki ilk odaklanabilir eleman */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Arka plana tıklayınca kapansın mı (varsayılan: evet) */
  closeOnBackdrop?: boolean;
  /**
   * closeOnBackdrop kapalıyken arka plana basılınca çağrılır (ör. "önce Uygula ya da Vazgeç" uyarısı). Basış hiçbir
   * durumda arkadaki tuvale ulaşmaz: karartma katmanı onu yutar.
   */
  onBackdropPress?: () => void;
}

/**
 * Karartmaya (arka plana) basılınca ne olur: pencere kapanır, uyarılır ya da hiçbir şey olmaz. Basış pencerenin
 * içindeyse (hedef karartmanın kendisi değilse) yok sayılır. Arkadaki tuvale hiçbir durumda ulaşmaz.
 */
export function arkaPlanEylemi(karartmaninKendisi: boolean, closeOnBackdrop: boolean): 'kapat' | 'uyar' | 'yok' {
  if (!karartmaninKendisi) return 'yok';
  return closeOnBackdrop ? 'kapat' : 'uyar';
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Erişilebilir, paylaşılan diyalog kabuğu:
 * role="dialog" + aria-modal, Escape ile kapanır, arka plana tıklayınca kapanır,
 * açılışta odak diyaloğa taşınır ve kapanışta geri döner, gövde kaydırması kilitlenir.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  labelledBy,
  className = '',
  overlayClassName = '',
  initialFocusRef,
  closeOnBackdrop = true,
  onBackdropPress,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Klavye yönetimi: Escape ile kapatma, Tab ile odak tuzağı ve arka plan
  // kısayollarının (Delete, Ctrl+Z ...) yalıtımı.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      // Odak tuzağı: Tab diyaloğun içinde döner, arka plana kaçmaz.
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (panel) {
          const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
            (el) => el.offsetParent !== null || el === document.activeElement
          );
          const active = document.activeElement as HTMLElement | null;

          if (focusables.length === 0) {
            e.preventDefault();
            panel.focus({ preventScroll: true });
          } else {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (!active || !panel.contains(active)) {
              e.preventDefault();
              (e.shiftKey ? last : first).focus({ preventScroll: true });
            } else if (e.shiftKey && active === first) {
              e.preventDefault();
              last.focus({ preventScroll: true });
            } else if (!e.shiftKey && active === last) {
              e.preventDefault();
              first.focus({ preventScroll: true });
            }
          }
        }
      }

      // Diyalog açıkken pencere düzeyindeki tuval kısayolları (Delete, Ctrl+Z ...)
      // tetiklenmemeli. window dinleyicileri document'ten SONRA çalıştığı için
      // burada yayılımı durdurmak arka planı güvenli biçimde yalıtır.
      e.stopPropagation();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Açık modal sayacı: tuvallerin klavye kısayolları arka planda tetiklenmesin
  useEffect(() => {
    if (!isOpen) return;
    registerModalOpen();
    return () => registerModalClose();
  }, [isOpen]);

  // Gövde kaydırma kilidi + odak yönetimi (açılışta içeri, kapanışta geri)
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    if (panel) {
      const alreadyInside = panel.contains(document.activeElement);
      if (!alreadyInside) {
        const target =
          initialFocusRef?.current ??
          (panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) || panel);
        target.focus({ preventScroll: true });
      }
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
    // initialFocusRef bir ref nesnesidir; yalnızca açılışta okunur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${overlayClassName}`}
      onMouseDown={(e) => {
        const eylem = arkaPlanEylemi(e.target === e.currentTarget, closeOnBackdrop);
        if (eylem === 'kapat') onClose();
        else if (eylem === 'uyar') {
          // Basışın varsayılan odak değişimi engellenir: yoksa odak arkadaki pencereye (section) kaçıyor,
          // onBackdropPress'in kutuya verdiği odak geri alınıyor ve öğrencinin yazdığı sayı hiçbir yere gitmiyordu
          e.preventDefault();
          onBackdropPress?.();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`outline-none ${className}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
