'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Type, Sparkles, Check, Trash2, X } from 'lucide-react';

interface TextNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string, color: string, fontSize: number) => void;
  onDelete?: () => void;
  initialText?: string;
  initialColor?: string;
  initialFontSize?: number;
}

const MATH_SYMBOLS = [
  'π', 'θ', 'α', 'β', '∠', '°', '√', '±', '≤', '≥', '≠', '×', '÷', '²', '³', '½', '¼', '∆', '∞', '∑', '∫', '≈'
];

// Not: Palet yalnızca yazı rengini belirler; tuvaldeki not arka planı ortak beyaz zemindir.
const COLOR_PALETTE = [
  { id: 'slate', name: 'Koyu', text: '#0f172a', border: '#cbd5e1' },
  { id: 'blue', name: 'Mavi', text: '#1d4ed8', border: '#93c5fd' },
  { id: 'emerald', name: 'Yeşil', text: '#047857', border: '#a7f3d0' },
  { id: 'amber', name: 'Sarı / Not', text: '#b45309', border: '#fde047' },
  { id: 'rose', name: 'Kırmızı', text: '#be123c', border: '#fecdd3' },
  { id: 'purple', name: 'Mor', text: '#6d28d9', border: '#d8b4fe' },
];

export function TextNoteDialog({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialText = '',
  initialColor = '#0f172a',
  initialFontSize = 14,
}: TextNoteDialogProps) {
  const [text, setText] = useState(initialText);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Açılışta başlangıç değerlerini yükle ve metni seç (odak Modal tarafından verilir)
  useEffect(() => {
    if (!isOpen) return;
    setText(initialText);
    setSelectedColor(initialColor || '#0f172a');
    setFontSize(initialFontSize || 14);
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [isOpen, initialText, initialColor, initialFontSize]);

  const handleInsertSymbol = (sym: string) => {
    const el = inputRef.current;
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd ?? start;
      const next = text.slice(0, start) + sym + text.slice(end);
      setText(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + sym.length, start + sym.length);
      });
    } else {
      setText((prev) => prev + sym);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter kaydeder; Shift+Enter yeni satır ekler (Escape Modal tarafından işlenir)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      e.preventDefault();
      if (text.trim()) {
        onSave(text.trim(), selectedColor, fontSize);
      }
    }
  };

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), selectedColor, fontSize);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="text-note-dialog-title"
      initialFocusRef={inputRef}
      overlayClassName="bg-ada-murekkep/45 backdrop-blur-sm animate-in fade-in duration-150"
      className="w-full max-w-md bg-card border border-border shadow-2xl rounded-3xl p-5 space-y-4 select-none animate-in zoom-in-95 duration-150"
    >
      {/* Başlık ve Kapat Butonu */}
      <div className="flex items-center justify-between pb-2 border-b border-border/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Type className="w-4 h-4" />
          </div>
          <div>
            <h3 id="text-note-dialog-title" className="text-sm font-black text-foreground">
              {initialText ? 'Yazı / Notu Düzenle' : 'Yeni Yazı / Matematik Notu Ekle'}
            </h3>
            <p className="text-[11px] text-muted-foreground font-medium">
              Formül, tanım, soru veya özel açıklamalarınızı yazın.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          title="Kapat (Esc)"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metin Giriş Alanı */}
      <div>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="Örnek: Pisagor Teoremi: a² + b² = c² veya Açıklama..."
          className="w-full p-3.5 rounded-2xl bg-muted/50 border border-border focus:border-primary focus:ring-2 focus:ring-ring/25 text-sm font-bold placeholder:text-muted-foreground/60 resize-none outline-none transition-all text-foreground"
          style={{ color: selectedColor, fontSize: `${fontSize}px` }}
          aria-label="Not metni"
        />
      </div>

      {/* Hızlı Matematik Sembolleri Çubuğu */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-ada-altin" />
          <span>Hızlı Matematik Sembolleri:</span>
        </div>

        <div className="flex flex-wrap gap-1 p-1.5 rounded-2xl bg-muted/40 border border-border/70 max-h-24 overflow-y-auto">
          {MATH_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => handleInsertSymbol(sym)}
              className="w-7 h-7 rounded-lg bg-card hover:bg-primary hover:text-primary-foreground border border-border/80 text-xs font-black transition-all cursor-pointer shadow-sm active:scale-90 flex items-center justify-center"
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Renk ve Boyut Seçimi */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Renk Paleti */}
        <div className="flex items-center gap-1.5">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedColor(c.text)}
              className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                selectedColor === c.text ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.text, borderColor: c.border }}
              title={c.name}
              aria-label={`Renk: ${c.name}`}
            />
          ))}
        </div>

        {/* Boyut Seçimi */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/70 text-xs font-bold">
          {[
            { size: 12, label: 'Küçük' },
            { size: 14, label: 'Orta' },
            { size: 18, label: 'Büyük' },
          ].map((opt) => (
            <button
              key={opt.size}
              type="button"
              onClick={() => setFontSize(opt.size)}
              className={`px-2 py-1 rounded-lg transition-all ${fontSize === opt.size ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alt Aksiyon Butonları */}
      <div className="flex items-center justify-between pt-2 border-t border-border/80">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold text-xs transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Sil</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition-all cursor-pointer"
          >
            İptal
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-ada-deniz to-ada-vurgu hover:from-ada-deniz-koyu hover:to-ada-deniz text-primary-foreground font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{initialText ? 'Kaydet' : 'Tuvale Ekle'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
