'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Sigma } from 'lucide-react';
import { type Dugum, type YazimAyari, duzMetin, latex, metniCozumle } from '@/math/matematikYazimi';

/**
 * Bir ölçü yazımını panoya alan iki küçük düğme: "Metni kopyala" (düz MEB yazımı) ve
 * "LaTeX olarak kopyala" (aynı yazımın LaTeX karşılığı, ödev/soru hazırlarken yapıştırılsın diye).
 *
 * Seçip Ctrl+C ile kopyalamak da doğru düz metni verir (MatematikMetni gizli kopya harfleri koyar);
 * bu düğmeler tek tıkla aynı sonucu ve ek olarak LaTeX'i sunar.
 *
 * navigator.clipboard olmayan / izin vermeyen ortamda (eski tarayıcı, güvensiz köken) yazı seçilip
 * kopyalanabilsin diye kullanıcıya ipucu gösterilir; hiçbir durumda hata fırlatılmaz.
 */

export interface YazimKopyalaProps {
  /** Düz metin (komut yanıtı). dugumler verilmezse bundan çözümlenir. */
  metin?: string;
  /** Hazır gösterim ağacı (canlı satır) */
  dugumler?: Dugum[];
  /** Birden çok satır (seçili nesnenin bütün ölçüleri): metinde satır sonu, LaTeX'te \\ ile ayrılır. */
  satirlar?: Dugum[][];
  ayar?: YazimAyari;
  className?: string;
  /** Düğmelerin küçük (panel içi) ya da normal boyutu */
  boyut?: 'kucuk' | 'normal';
}

type Durum = { tur: 'bos' } | { tur: 'oldu'; hangi: 'metin' | 'latex' } | { tur: 'olmadi' };

export async function panoyaYaz(deger: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(deger);
    return true;
  } catch {
    return false;
  }
}

export function YazimKopyala({ metin, dugumler, satirlar, ayar, className = '', boyut = 'kucuk' }: YazimKopyalaProps) {
  const [durum, setDurum] = useState<Durum>({ tur: 'bos' });
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (zamanlayici.current) clearTimeout(zamanlayici.current); }, []);
  useEffect(() => { setDurum({ tur: 'bos' }); }, [metin, dugumler, satirlar]);

  const agaclar = (): Dugum[][] => satirlar ?? [dugumler ?? metniCozumle(metin ?? '', ayar)];
  const duz = () => (satirlar || dugumler ? agaclar().map(duzMetin).join('\n') : metin ?? '');

  const kopyala = async (hangi: 'metin' | 'latex') => {
    const deger = hangi === 'metin' ? duz() : agaclar().map((d) => latex(d)).join(' \\\\ ');
    const oldu = await panoyaYaz(deger);
    setDurum(oldu ? { tur: 'oldu', hangi } : { tur: 'olmadi' });
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    zamanlayici.current = setTimeout(() => setDurum({ tur: 'bos' }), 2500);
  };

  const simge = boyut === 'kucuk' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const dugme = `flex shrink-0 items-center gap-1 rounded-lg border border-border/70 px-1.5 py-1 ${
    boyut === 'kucuk' ? 'text-[10px]' : 'text-[11px]'
  } font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`} data-yazim-kopyala="1">
      <button type="button" onClick={() => void kopyala('metin')} className={dugme} title="Metni kopyala" aria-label="Metni kopyala">
        {durum.tur === 'oldu' && durum.hangi === 'metin' ? <Check className={simge} aria-hidden="true" /> : <Copy className={simge} aria-hidden="true" />}
        <span>Metin</span>
      </button>
      <button type="button" onClick={() => void kopyala('latex')} className={dugme} title="LaTeX olarak kopyala" aria-label="LaTeX olarak kopyala">
        {durum.tur === 'oldu' && durum.hangi === 'latex' ? <Check className={simge} aria-hidden="true" /> : <Sigma className={simge} aria-hidden="true" />}
        <span>LaTeX</span>
      </button>
      <span role="status" aria-live="polite" className="text-[10px] text-muted-foreground">
        {durum.tur === 'oldu' ? 'Kopyalandı.' : durum.tur === 'olmadi' ? 'Kopyalanamadı; yazıyı seçip Ctrl+C ile kopyalayın.' : ''}
      </span>
    </span>
  );
}
