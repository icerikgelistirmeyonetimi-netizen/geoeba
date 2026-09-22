'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { evaluateNumericInput } from '@/math/parser';
import { Check, ChevronRight, X } from 'lucide-react';

/** Menüden seçilebilecek bir madde. */
export interface ContextMenuItem {
  id: string;
  label: string;
  /** Kırmızı (yıkıcı) görünüm — "Sil" gibi. */
  danger?: boolean;
  /** Maddenin üstünde ayırıcı çizgi gösterilsin mi? */
  separatorBefore?: boolean;
  /**
   * Şu an uygulanamayan madde: soluk görünür, tıklanmaz ama GÖRÜNÜR kalır.
   * Maddeyi tümden gizlemek, kullanıcıya özelliğin var olduğunu ve neyin
   * eksik olduğunu (ör. "ikinci bir nokta koyun") anlatma şansını yok ediyor.
   */
  disabled?: boolean;
  /** Etiketin solunda gösterilen küçük simge (16 px). */
  icon?: React.ReactNode;
  /**
   * Aç/kapat maddesi: `true` iken sağda onay işareti görünür (menuitemcheckbox).
   * `radio` ile birlikte verilirse bir seçenek grubunun üyesidir (menuitemradio).
   */
  checked?: boolean;
  radio?: boolean;
  /** Verilirse madde bir alt menü açar (sağda ok görünür); `onSelect` yok sayılır. */
  submenu?: ContextMenuItem[];
  /** Doğrudan çalışan işlem. `prompt` verilmişse yok sayılır. */
  onSelect?: () => void;
  /**
   * Verilirse madde menüyü kapatmaz; menü satır içi bir DEĞER GİRİŞİ formuna dönüşür.
   * ("Uzunluğu ayarla…", "Açıyı ayarla…", "Yarıçapı ayarla…")
   */
  prompt?: {
    /** Form başlığı, ör. "Uzunluk" */
    label: string;
    /** Kutunun sağında gösterilecek birim, ör. "br" veya "°" */
    unit?: string;
    /** Kutuya önceden yazılacak değer (Türkçe biçimde) */
    initial?: string;
    /** Yer tutucu metin */
    placeholder?: string;
    onSubmit?: (value: number) => void;
    onSubmitText?: (text: string) => void;
    /** "a", "2*a" gibi girişler için kaydırıcı değerleri */
    scope?: Record<string, number>;
  };
}

interface ContextMenuProps {
  open: boolean;
  /** Menünün açılacağı ekran (client) koordinatları */
  x: number;
  y: number;
  /** Başlıkta gösterilen nesne adı, ör. "AB". Boşsa başlık satırı çizilmez. */
  title: string;
  /** Başlık yokken ekran okuyucuya söylenecek menü adı */
  ariaLabel?: string;
  items: ContextMenuItem[];
  onClose: () => void;
}

const KENAR_BOSLUGU = 8;

/** Klavyeyle gezilebilen maddeler; `data-menu-level` alt menüleri ana menüden ayırır. */
const MADDE_SECICI = '[data-menu-item]:not(:disabled)';

function maddeRolu(item: ContextMenuItem): 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' {
  if (item.submenu || item.checked === undefined) return 'menuitem';
  return item.radio ? 'menuitemradio' : 'menuitemcheckbox';
}

/**
 * Tuvaldeki nesnelere (ve boş alana) sağ tıklandığında açılan bağlam menüsü.
 *
 * - Ekran dışına taşmayı önlemek için konumunu kendi ölçüsüne göre kıstırır.
 * - Klavye: açılınca odak ilk maddeye gider, Yukarı/Aşağı sararak dolaşır, Escape kapatır.
 *   Alt menü: Sağ ok / Enter açar, Sol ok / Escape kapatıp odağı üst maddeye döndürür.
 * - Dışarı tıklama ve sağ tıklama menüyü kapatır; o tıklama tuvale GEÇMEZ
 *   (yanlışlıkla yeni nokta çizilmesin diye tam ekran bir örtü kullanılır).
 */
export function ContextMenu({ open, x, y, title, ariaLabel, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const altMenuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: x, top: y });
  const [promptItem, setPromptItem] = useState<ContextMenuItem | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Açık alt menünün sahibi olan maddenin kimliği */
  const [altMenuId, setAltMenuId] = useState<string | null>(null);
  /** Alt menü sağa sığmıyorsa sola açılır */
  const [altMenuSola, setAltMenuSola] = useState(false);
  /** Alt menü pencerenin altından taşıyorsa ne kadar yukarı kaydırıldığı (px) */
  const [altMenuYukari, setAltMenuYukari] = useState(0);
  /** Alt menü klavyeyle açıldıysa ilk maddesine odaklanılır (fareyle açılınca odak yerinde kalır) */
  const altMenuOdakRef = useRef(false);
  /**
   * Fare alt menüye çapraz giderken ana menünün başka maddelerinin üstünden geçer. Alt menü bu anda
   * kapanırsa seçenekleri tıklamak imkânsızlaşır; bu yüzden kapanma kısa bir gecikmeyle yapılır ve imleç
   * alt menüye (ya da sahibine) girerse iptal edilir.
   */
  const kapanmaZamanlayici = useRef<number | null>(null);
  const kapanmayiIptalEt = () => {
    if (kapanmaZamanlayici.current !== null) {
      window.clearTimeout(kapanmaZamanlayici.current);
      kapanmaZamanlayici.current = null;
    }
  };
  useEffect(() => () => kapanmayiIptalEt(), []);

  // Menü her açıldığında/hedef değiştiğinde form ve alt menü kipinden çık
  useEffect(() => {
    if (!open) {
      setPromptItem(null);
      setError(null);
      setAltMenuId(null);
    }
  }, [open]);

  useEffect(() => {
    setPromptItem(null);
    setError(null);
    setAltMenuId(null);
  }, [x, y, title]);

  /** Menüyü görünür alanın içine çeker (boyanmadan önce, titreme olmasın diye). */
  const kistir = useCallback(() => {
    const el = menuRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const maxLeft = window.innerWidth - w - KENAR_BOSLUGU;
    const maxTop = window.innerHeight - h - KENAR_BOSLUGU;
    setPos({
      left: Math.max(KENAR_BOSLUGU, Math.min(x, Math.max(KENAR_BOSLUGU, maxLeft))),
      top: Math.max(KENAR_BOSLUGU, Math.min(y, Math.max(KENAR_BOSLUGU, maxTop))),
    });
  }, [x, y]);

  useLayoutEffect(() => {
    if (!open) return;
    kistir();
  }, [open, kistir, promptItem, items.length]);

  // Alt menü açılınca sağa sığıp sığmadığına bak; klavyeyle açıldıysa ilk maddesine odaklan
  useLayoutEffect(() => {
    if (!altMenuId) return;
    const alt = altMenuRef.current;
    const ana = menuRef.current;
    if (!alt || !ana) return;
    const anaKutu = ana.getBoundingClientRect();
    setAltMenuSola(anaKutu.right + alt.offsetWidth + KENAR_BOSLUGU > window.innerWidth);
    // Menünün altındaki bir maddenin alt menüsü (ör. "Eşitlik işareti") pencerenin altından taşmasın: yukarı kaydır
    const sahipUstu = alt.parentElement?.getBoundingClientRect().top ?? 0;
    const tasma = sahipUstu + alt.offsetHeight - (window.innerHeight - KENAR_BOSLUGU);
    setAltMenuYukari(tasma > 0 ? Math.max(0, Math.min(tasma, sahipUstu - KENAR_BOSLUGU)) : 0);
    if (altMenuOdakRef.current) {
      altMenuOdakRef.current = false;
      alt.querySelector<HTMLElement>(MADDE_SECICI)?.focus();
    }
  }, [altMenuId]);

  // Açılışta odağı ilk maddeye taşı (form kipinde kutuya)
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      if (promptItem) inputRef.current?.select();
      else menuRef.current?.querySelector<HTMLElement>(`[data-menu-level="0"]${MADDE_SECICI}`)?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, promptItem]);

  // Pencere yeniden boyutlanır veya kaydırılırsa menüyü kapat (yanlış yerde asılı kalmasın)
  useEffect(() => {
    if (!open) return;
    const kapat = () => onClose();
    window.addEventListener('resize', kapat);
    window.addEventListener('wheel', kapat, { passive: true });
    return () => {
      window.removeEventListener('resize', kapat);
      window.removeEventListener('wheel', kapat);
    };
  }, [open, onClose]);

  if (!open) return null;

  /** Odaklı maddeyle aynı düzeydeki (ana menü ya da alt menü) seçilebilir maddeler */
  const ayniDuzey = (seviye: string) =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>(`[data-menu-level="${seviye}"]${MADDE_SECICI}`) ?? []);

  const altMenuAc = (item: ContextMenuItem, klavyeyle: boolean) => {
    if (!item.submenu || item.disabled) return;
    altMenuOdakRef.current = klavyeyle;
    if (altMenuId === item.id) {
      if (klavyeyle) altMenuRef.current?.querySelector<HTMLElement>(MADDE_SECICI)?.focus();
      return;
    }
    setAltMenuId(item.id);
  };

  const altMenuKapat = () => {
    const sahip = altMenuId;
    setAltMenuId(null);
    if (sahip) menuRef.current?.querySelector<HTMLElement>(`[data-menu-owner="${sahip}"]`)?.focus();
  };

  const klavye = (e: React.KeyboardEvent) => {
    const aktif = document.activeElement as HTMLElement | null;
    const seviye = aktif?.getAttribute('data-menu-level') ?? '0';
    if (e.key === 'Escape') {
      e.preventDefault();
      // Escape yalnızca menüyü kapatır; arkadaki seçim ve yarım kalan araç bozulmasın
      e.stopPropagation();
      if (promptItem) {
        setPromptItem(null);
        setError(null);
      } else if (altMenuId) {
        altMenuKapat();
      } else {
        onClose();
      }
      return;
    }
    if (promptItem) return; // Form kipinde ok tuşları imlecin
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      e.stopPropagation();
      const list = ayniDuzey(seviye);
      if (list.length === 0) return;
      const i = list.indexOf(aktif as HTMLElement);
      const next =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
          ? list.length - 1
          : e.key === 'ArrowDown'
          ? (i + 1) % list.length
          : (i - 1 + list.length) % list.length;
      list[next]?.focus();
      return;
    }
    if (e.key === 'ArrowRight' && seviye === '0') {
      const sahip = aktif?.getAttribute('data-menu-owner');
      const item = items.find((m) => m.id === sahip);
      if (item?.submenu) {
        e.preventDefault();
        e.stopPropagation();
        altMenuAc(item, true);
      }
      return;
    }
    if (e.key === 'ArrowLeft' && seviye === '1') {
      e.preventDefault();
      e.stopPropagation();
      altMenuKapat();
    }
  };

  const maddeSec = (item: ContextMenuItem, klavyeyle = false) => {
    if (item.disabled) return;
    if (item.submenu) {
      altMenuAc(item, klavyeyle);
      return;
    }
    if (item.prompt) {
      setValue(item.prompt.initial ?? '');
      setError(null);
      setPromptItem(item);
      return;
    }
    item.onSelect?.();
    onClose();
  };

  const formGonder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptItem?.prompt) return;
    if (promptItem.prompt.onSubmitText) {
      const clean = value.trim();
      if (!clean) {
        setError('Lütfen bir ad girin.');
        return;
      }
      promptItem.prompt.onSubmitText(clean);
      onClose();
      return;
    }
    // Alan düz sayı da kabul eder, kaydırıcı adı veya ifade de ("a", "2*a", "pi/2")
    const sonuc = evaluateNumericInput(value, promptItem.prompt.scope ?? {});
    if (!sonuc.ok) {
      setError(sonuc.error);
      return;
    }
    if (!(sonuc.value > 0)) {
      setError('Değer sıfırdan büyük olmalı.');
      return;
    }
    promptItem.prompt.onSubmit?.(sonuc.value);
    onClose();
  };

  // Simgeli menülerde (ör. boş alan menüsü) satırlar biraz daha ferah ve normal ağırlıkta yazılır
  const simgeli = items.some((m) => m.icon);

  const maddeDugmesi = (item: ContextMenuItem, seviye: 0 | 1, ikonSutunu: boolean) => {
    const rol = maddeRolu(item);
    const altAcik = item.submenu && altMenuId === item.id;
    return (
      <button
        type="button"
        role={rol}
        tabIndex={-1}
        disabled={item.disabled}
        data-menu-item=""
        data-menu-level={seviye}
        data-menu-owner={item.submenu ? item.id : undefined}
        aria-checked={rol === 'menuitem' ? undefined : !!item.checked}
        aria-haspopup={item.submenu ? 'menu' : undefined}
        aria-expanded={item.submenu ? !!altAcik : undefined}
        onClick={() => maddeSec(item)}
        onKeyDown={(e) => {
          // Enter/Boşluk alt menüyü klavyeyle açar (tıklama olayı odak taşımaz)
          if (item.submenu && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            e.stopPropagation();
            maddeSec(item, true);
          }
        }}
        onMouseEnter={() => {
          if (seviye !== 0) return;
          kapanmayiIptalEt();
          if (item.submenu) altMenuAc(item, false);
          else if (altMenuId) {
            kapanmaZamanlayici.current = window.setTimeout(() => {
              kapanmaZamanlayici.current = null;
              setAltMenuId(null);
            }, 350);
          }
        }}
        className={`w-full text-left flex items-center justify-between gap-3 transition-colors outline-none ${
          simgeli ? 'px-3 py-2 text-[13px] font-medium' : 'px-3 py-1.5 text-xs font-bold'
        } ${
          item.disabled
            ? 'cursor-default text-muted-foreground/70'
            : `cursor-pointer focus-visible:bg-muted hover:bg-muted ${altAcik ? 'bg-muted' : ''} ${
                item.danger ? 'text-destructive' : 'text-foreground'
              }`
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {ikonSutunu && (
            <span
              className={`grid w-5 h-5 shrink-0 place-items-center ${
                item.disabled ? 'text-muted-foreground/50' : 'text-muted-foreground'
              }`}
              aria-hidden="true"
            >
              {item.icon}
            </span>
          )}
          <span className="truncate">{item.label}</span>
        </span>
        {item.submenu ? (
          <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : item.checked ? (
          <Check className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
        ) : null}
      </button>
    );
  };

  return (
    <>
      {/* Tam ekran örtü: dışarı tıklama ve sağ tıklama menüyü kapatır, tıklama tuvale geçmez */}
      <div
        className="fixed inset-0 z-40"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />

      <div
        ref={menuRef}
        role="menu"
        aria-label={title ? `${title} için işlemler` : ariaLabel ?? 'İşlemler'}
        onKeyDown={klavye}
        onMouseDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        style={{ left: pos.left, top: pos.top }}
        className={`fixed z-50 ${
          simgeli ? 'min-w-[15rem]' : 'min-w-[13rem]'
        } max-w-[17rem] rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl py-1.5 select-none animate-in fade-in zoom-in-95 duration-100`}
      >
        {/* Başlık: menünün hangi nesneyi konuştuğunu gösterir (boş alan menüsünde yok) */}
        {title && (
          <div className="px-3 py-1.5 border-b border-border/70 mb-1">
            <span className="block text-[11px] font-black text-foreground truncate">{title}</span>
          </div>
        )}

        {promptItem?.prompt ? (
          <form onSubmit={formGonder} className="px-3 py-2 space-y-2">
            <label
              htmlFor="baglam-deger-girisi"
              className="block text-[11px] font-bold text-muted-foreground"
            >
              {promptItem.prompt.label}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="baglam-deger-girisi"
                ref={inputRef}
                type="text"
                inputMode={promptItem.prompt.onSubmitText ? 'text' : 'decimal'}
                placeholder={promptItem.prompt.placeholder}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={error !== null}
                className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-background border text-xs font-mono text-foreground outline-none focus:border-primary ${
                  error ? 'border-destructive' : 'border-border'
                }`}
              />
              {promptItem.prompt.unit && (
                <span className="text-[11px] font-bold text-muted-foreground shrink-0">
                  {promptItem.prompt.unit}
                </span>
              )}
            </div>
            {error && (
              <p role="alert" className="text-[11px] text-destructive font-semibold">
                {error}
              </p>
            )}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-black hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Uygula</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPromptItem(null);
                  setError(null);
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-muted text-foreground text-[11px] font-bold hover:bg-muted/70 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Vazgeç</span>
              </button>
            </div>
          </form>
        ) : (
          items.map((item) => (
            <React.Fragment key={item.id}>
              {item.separatorBefore && <div className="my-1 border-t border-border/70" role="separator" />}
              {item.submenu ? (
                <div className="relative">
                  {maddeDugmesi(item, 0, simgeli)}
                  {altMenuId === item.id && (
                    <div
                      ref={altMenuRef}
                      role="menu"
                      aria-label={item.label}
                      onMouseEnter={kapanmayiIptalEt}
                      style={altMenuYukari ? { top: -altMenuYukari } : undefined}
                      className={`absolute top-0 ${
                        altMenuSola ? 'right-full mr-1' : 'left-full ml-1'
                      } min-w-[12rem] rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-100`}
                    >
                      {item.submenu.map((alt) => (
                        <React.Fragment key={alt.id}>
                          {alt.separatorBefore && <div className="my-1 border-t border-border/70" role="separator" />}
                          {maddeDugmesi(alt, 1, item.submenu!.some((m) => m.icon))}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                maddeDugmesi(item, 0, simgeli)
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </>
  );
}
