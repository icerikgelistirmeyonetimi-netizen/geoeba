'use client';

/**
 * Paylaşım bağlantısıyla açılış (#/studyo/paylas/<kademe>/<veri>; math/cizimPaylasimi.ts).
 *
 * Sınıf ekranıyla birlikte bağlanır: bağlantıdaki kademenin oturumu HEMEN açılır, böylece sınıf açılışı olağan
 * oynar ama oturum fazına gelindiğinde kademe hazırdır ve oturum ekranı hiç çizilmez (SinifEkrani: depodan gelen
 * oturum gibi masaüstü hemen gelir). Veri bu sırada çözülür. Masaüstünde Çizim Stüdyosu kendiliğinden açılınca
 * (WorkspaceView sahne köprüsünü yayınlar) çizim Dosya > Aç ile aynı yoldan (loadProject) bir kez yüklenir ve
 * paylaşılan boyut (2B / 3B) seçilir. Geri Al alıcının kendi çizimine döner.
 *
 * Bozuk / eski biçimli bağlantı uygulamayı çökertmez: açılış sürer, ileti oturum ya da masaüstü görününce gösterilir.
 * Kademesi tanınmayan bağlantıda oturum ekranı olağan şekilde gelir.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useOturum } from '@/state/OturumContext';
import { useWorkspace } from '@/state/WorkspaceContext';
import { PaylasimHatasi, ayniCizimMi, paylasimVerisiniCoz, type PaylasilanCizim, type PaylasimAdresi } from '@/math/cizimPaylasimi';

const KADEMESIZ = 'Paylaşılan çizim açılamadı: bağlantıdaki oturum (ilkokul, ortaokul ya da lise) tanınmadı. Bağlantının tamamını kopyaladığınızdan emin olun; oturumunuzu seçip devam edebilirsiniz.';
const YUKLENEMEDI = 'Paylaşılan çizim açılamadı. Kendi çiziminiz korundu.';

/** İleti başlıkla ("Paylaşılan çizim açılamadı") başlıyorsa gövdede yinelenmez: "…: bağlantı bozuk" → "Bağlantı bozuk" */
export function basliksiz(ileti: string): string {
  const govde = ileti.replace(/^Paylaşılan çizim açılamadı[:.]?\s*/, '');
  return govde ? govde.charAt(0).toLocaleUpperCase('tr-TR') + govde.slice(1) : ileti;
}

interface PaylasimAcilisiProps {
  adres: PaylasimAdresi;
  /** İleti gösterilebilir mi (açılış bitti: oturum ya da masaüstü görünüyor) */
  iletiGosterilebilir: boolean;
  /** Çizim yüklendi ya da hata iletisi kapatıldı: paylaşım bitti */
  onBitti: () => void;
}

export function PaylasimAcilisi({ adres, iletiGosterilebilir, onBitti }: PaylasimAcilisiProps) {
  const { kademe, oturumAc } = useOturum();
  const { sceneBridge, getProject, loadProject, setStudioDimension, setHintMessage } = useWorkspace();
  const [cizim, setCizim] = useState<Omit<PaylasilanCizim, 'kademe'> | null>(null);
  const [hata, setHata] = useState<string | null>(adres.kademe ? null : KADEMESIZ);
  const uygulandi = useRef(false);
  const onBittiRef = useRef(onBitti);
  onBittiRef.current = onBitti;
  const tamamRef = useRef<HTMLButtonElement>(null);

  // Oturum açılışla birlikte açılır (oturum ekranı atlanır); veri arka planda çözülür
  useEffect(() => {
    if (!adres.kademe) return;
    oturumAc(adres.kademe);
    let etkin = true;
    paylasimVerisiniCoz(adres.veri).then(
      (c) => { if (etkin) setCizim(c); },
      (e) => { if (etkin) setHata(e instanceof PaylasimHatasi ? e.message : YUKLENEMEDI); },
    );
    return () => {
      etkin = false;
    };
  }, [adres, oturumAc]);

  // Stüdyo açılınca bir kez yüklenir. Sahne kendi kaydını geri yükleyip köprüyü yeniden yayınlarken beklenir (köprü bir
  // görev boyunca değişmeyince yüklenir): yoksa geri alma anlık görüntüsü eski köprünün boş sahnesini alıyordu.
  useEffect(() => {
    if (!cizim || !sceneBridge || uygulandi.current || kademe !== adres.kademe) return;
    const t = window.setTimeout(() => {
      uygulandi.current = true;
      try {
        // Sayfa kendi adresiyle yenilendiyse (AdresEsitleyici) çizim kayıtlı çizimle aynıdır: yalnız görünüm geri gelir, ipucu yok
        const ayni = ayniCizimMi(getProject(), cizim.proje);
        loadProject(cizim.proje);
        setStudioDimension(cizim.boyut);
        if (!ayni) setHintMessage('Paylaşılan çizim açıldı. Kendi çiziminize Geri Al ile dönebilirsiniz.');
        onBittiRef.current();
      } catch (e) {
        setHata(e instanceof Error && e.message ? `${YUKLENEMEDI} (${e.message})` : YUKLENEMEDI);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [cizim, sceneBridge, kademe, adres.kademe, getProject, loadProject, setStudioDimension, setHintMessage]);

  return (
    <Modal
      isOpen={!!hata && iletiGosterilebilir}
      onClose={() => onBittiRef.current()}
      labelledBy="paylasim-hata-baslik"
      initialFocusRef={tamamRef}
      overlayClassName="bg-ada-murekkep/60 backdrop-blur-sm animate-in fade-in duration-200"
      className="bg-card text-card-foreground border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
    >
      <div className="flex items-start gap-4" data-paylasim-hatasi>
        <div className="w-12 h-12 shrink-0 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 id="paylasim-hata-baslik" className="text-lg font-black text-foreground tracking-tight">
            Paylaşılan çizim açılamadı
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{hata && basliksiz(hata)}</p>
        </div>
      </div>
      <div className="flex justify-end pt-2 border-t border-border">
        <button
          ref={tamamRef}
          type="button"
          onClick={() => onBittiRef.current()}
          className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black shadow-lg shadow-primary/30 transition-all cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-ring outline-none"
        >
          Tamam
        </button>
      </div>
    </Modal>
  );
}
