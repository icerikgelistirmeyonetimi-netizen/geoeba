'use client';

/**
 * Dosya > Bağlantıyla paylaş: çizimin tamamı (2B nesneler, 3B cisimler, açık boyut, görünüm) ve oturum kademesi
 * bağlantının içinde taşınır (math/cizimPaylasimi.ts). Bağlantı hazırlanınca panoya kopyalanır; pano izin vermezse
 * (iframe, eski tarayıcı, kullanıcı hareketi düştü) Kopyala düğmesi yeni bir hareketle yeniden dener, alan da seçilip
 * elle kopyalanabilir. Uzun bağlantıda (çoğunlukla eklenen görseller) uyarılır, tarayıcı sınırını aşanda dosya önerilir.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Share2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { ProjectFile } from '@/math/projectFile';
import {
  PAYLASIM_EN_UZUN,
  PAYLASIM_UYARI_UZUNLUGU,
  paylasimBaglantisi,
  paylasimVerisiOlustur,
  type CizimBoyutu,
  type PaylasimVarsayilanlari,
} from '@/math/cizimPaylasimi';
import { OTURUM_ADLARI } from '@/state/OturumContext';
import type { LevelId } from '@/types/curriculum';

export interface PaylasimIstegi {
  proje: ProjectFile;
  boyut: CizimBoyutu;
  kademe: LevelId;
  /** Alıcıdaki görünüm / kamera varsayılanları: bunlara eşit alanlar bağlantıya yazılmaz */
  varsayilanlar?: PaylasimVarsayilanlari;
}

interface PaylasimModalProps {
  /** null: kapalı. Her yeni istek bağlantıyı baştan hazırlar. */
  istek: PaylasimIstegi | null;
  onKapat: () => void;
}

type Durum =
  | { tur: 'hazirlaniyor' }
  | { tur: 'hazir'; baglanti: string; kopyalandi: boolean | null }
  | { tur: 'hata'; ileti: string };

/** Panoya yazar: önce Clipboard API, olmazsa seçili alanla execCommand (iframe'de izin yoksa da çalışır). */
async function panoyaKopyala(metin: string, alan: HTMLInputElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(metin);
      return true;
    }
  } catch {
    /* izin yok: eski yola düşülür */
  }
  try {
    if (!alan) return false;
    alan.focus();
    alan.select();
    return document.execCommand('copy');
  } catch {
    return false;
  }
}

export function PaylasimModal({ istek, onKapat }: PaylasimModalProps) {
  const [durum, setDurum] = useState<Durum>({ tur: 'hazirlaniyor' });
  const alanRef = useRef<HTMLInputElement>(null);
  const kopyalaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!istek) return;
    let etkin = true;
    setDurum({ tur: 'hazirlaniyor' });
    (async () => {
      try {
        const baglanti = paylasimBaglantisi(istek.kademe, await paylasimVerisiOlustur(istek));
        if (!etkin) return;
        if (baglanti.length > PAYLASIM_EN_UZUN) {
          setDurum({
            tur: 'hata',
            ileti: 'Çizim bağlantıya sığmayacak kadar büyük (çoğunlukla eklenen görseller yüzünden). Dosya > Kaydet ile .geoeba dosyası olarak paylaşabilirsiniz.',
          });
          return;
        }
        setDurum({ tur: 'hazir', baglanti, kopyalandi: null });
        const kopyalandi = await panoyaKopyala(baglanti, alanRef.current);
        if (etkin) setDurum({ tur: 'hazir', baglanti, kopyalandi });
      } catch {
        if (etkin) setDurum({ tur: 'hata', ileti: 'Bağlantı hazırlanamadı. Lütfen yeniden deneyin ya da çizimi Dosya > Kaydet ile paylaşın.' });
      }
    })();
    return () => {
      etkin = false;
    };
  }, [istek]);

  const kopyala = async () => {
    if (durum.tur !== 'hazir') return;
    const kopyalandi = await panoyaKopyala(durum.baglanti, alanRef.current);
    setDurum({ ...durum, kopyalandi });
  };

  const uzun = durum.tur === 'hazir' && durum.baglanti.length > PAYLASIM_UYARI_UZUNLUGU;
  const kademeAdi = istek ? OTURUM_ADLARI[istek.kademe] : '';
  const boyutAdi = istek?.boyut === '3D' ? '3B' : '2B';

  return (
    <Modal
      isOpen={!!istek}
      onClose={onKapat}
      labelledBy="paylasim-baslik"
      initialFocusRef={kopyalaRef}
      overlayClassName="bg-ada-murekkep/60 backdrop-blur-sm animate-in fade-in duration-200"
      className="bg-card text-card-foreground border border-border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25">
          <Share2 className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="space-y-1 min-w-0">
          <h2 id="paylasim-baslik" className="text-lg font-black text-foreground tracking-tight">
            Bağlantıyla paylaş
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bağlantıyı açan kişi Çizim Stüdyosu&apos;nu <span className="font-bold text-foreground">{kademeAdi}</span> oturumunda,
            bu çizimle <span className="font-bold text-foreground">{boyutAdi}</span> görünümde görür.
          </p>
        </div>
      </div>

      {durum.tur === 'hata' ? (
        <p role="alert" className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground leading-relaxed">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
          <span>{durum.ileti}</span>
        </p>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-muted-foreground">Paylaşım bağlantısı</span>
            <input
              ref={alanRef}
              readOnly
              data-paylasim-baglantisi
              value={durum.tur === 'hazir' ? durum.baglanti : 'Bağlantı hazırlanıyor…'}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full min-h-[44px] rounded-2xl border border-border bg-muted/50 px-3 text-xs font-mono text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          <p role="status" aria-live="polite" className="text-sm leading-relaxed text-foreground">
            {durum.tur === 'hazirlaniyor' && 'Bağlantı hazırlanıyor…'}
            {durum.tur === 'hazir' && durum.kopyalandi === true && 'Bağlantı panoya kopyalandı. Bir iletiye ya da e-postaya yapıştırıp paylaşabilirsiniz.'}
            {durum.tur === 'hazir' && durum.kopyalandi === false && 'Bağlantı panoya kopyalanamadı. Kopyala düğmesine basın ya da bağlantıyı seçip kopyalayın.'}
          </p>
          {uzun && durum.tur === 'hazir' && (
            <p role="alert" className="flex items-start gap-2 rounded-2xl border border-ada-altin/50 bg-ada-altin/10 p-3 text-xs text-foreground leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 text-ada-altin" aria-hidden="true" />
              <span>
                Bağlantı çok uzun ({durum.baglanti.length.toLocaleString('tr-TR')} karakter). Bazı ileti uygulamaları uzun
                bağlantıları kesebilir; kesilirse çizim açılmaz. Böyle bir durumda çizimi Dosya &gt; Kaydet ile dosya olarak paylaşın.
              </span>
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-border">
        <button
          type="button"
          onClick={onKapat}
          className="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-bold text-foreground bg-muted hover:bg-muted/80 border border-border/60 transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-primary outline-none"
        >
          Kapat
        </button>
        {durum.tur !== 'hata' && (
          <button
            ref={kopyalaRef}
            type="button"
            onClick={kopyala}
            disabled={durum.tur !== 'hazir'}
            className="inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black shadow-lg shadow-primary/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-wait focus-visible:ring-2 focus-visible:ring-ring outline-none"
          >
            {durum.tur === 'hazir' && durum.kopyalandi ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>{durum.tur === 'hazir' && durum.kopyalandi ? 'Kopyalandı' : 'Kopyala'}</span>
          </button>
        )}
      </div>
    </Modal>
  );
}
