'use client';

/**
 * Masaüstü uygulama kayıt defteri: görev çubuğuna sabitlenmiş, masaüstü kısayolu ve Başlat menüsü
 * girişi olan uygulamalar (sırası burada belirlenir). Her uygulama bir pencerede açılır
 * (UygulamaPenceresi); gövdeler next/dynamic ile tembel yüklenir (ssr: false) ve yüklenirken
 * pencere içinde ada yükleyicisi tarzı küçük bir "hazırlanıyor" gösterilir.
 *
 * Uygulama sözleşmesi: src/components/uygulamalar/<klasör>/index.tsx → `manifest` + varsayılan
 * bileşen ({ pencereGenisligi?, pencereYuksekligi? }) ve manifest.tsx (yalnız manifest; kabuk
 * statik olarak bunu okur, gövdeyi yüklemez). Çizim Stüdyosu mevcut çalışma alanıdır
 * (WorkspaceView + başlık çubuğunda WorkspaceMenuBar).
 */
import React, { type ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { manifest as veriGrafikManifesti } from '@/components/uygulamalar/veri-grafik/manifest';
import { manifest as olasilikManifesti } from '@/components/uygulamalar/olasilik/manifest';
import { manifest as algoritmaManifesti } from '@/components/uygulamalar/algoritma/manifest';
import s from './sinif.module.css';

const VARLIK_ONEKI = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '';

export interface UygulamaProps {
  pencereGenisligi?: number;
  pencereYuksekligi?: number;
}

export interface UygulamaManifesti {
  id: string;
  /** Pencere başlığı */
  ad: string;
  /** Görev çubuğu / kısayol adı */
  kisaAd: string;
  aciklama: string;
  /** Ada paletinden simge rengi (hex) */
  renk: string;
  /** 24×24 satır içi SVG, currentColor */
  simge: React.ReactNode;
}

export interface UygulamaTanimi extends UygulamaManifesti {
  Bilesen: ComponentType<UygulamaProps>;
  /** Başlık çubuğunda adın sağında çizilen menü çubuğu (yalnız Çizim Stüdyosu) */
  MenuCubugu?: ComponentType;
}

export const CIZIM_KIMLIGI = 'cizim';

/** Pergel + cetvel glifi: Çizim Stüdyosu simgesi (adalar ikon nesnesi gibi satır içi SVG). */
export const cizimStudyosuSimgesi = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.5v2.2M12 5.7l-5.2 12.1M12 5.7l5.2 12.1" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="4" r="1.6" fill="currentColor" />
    <path d="M7.6 14.6a5.4 5.4 0 0 0 8.8 0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M3.5 20.5h17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    <path d="M6.5 20.5v-1.6M10 20.5v-2.4M13.5 20.5v-1.6M17 20.5v-2.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** Pencere içinde gövde yüklenirken gösterilen küçük yükleyici (ada yükleyicisiyle aynı dil). */
export function UygulamaHazirlaniyor({ ad }: { ad?: string }) {
  return (
    <div className={`${s.hazirlaniyor} ${s.kabuk}`} role="status" data-uygulama-hazirlaniyor>
      <span className={s['hazirlaniyor-ikon']} aria-hidden="true">
        <img src={`${VARLIK_ONEKI}/images/eba/eba-karakter-animasyon.svg`} alt="" width={220} height={220} draggable={false} />
      </span>
      <p className={s['hazirlaniyor-yazi']}>{ad ? `${ad} hazırlanıyor…` : 'Hazırlanıyor…'}</p>
      <span className={s['hazirlaniyor-cubuk']} aria-hidden="true">
        <span className={s['hazirlaniyor-dolgu']} />
      </span>
    </div>
  );
}

function tembel<P extends object>(yukle: () => Promise<{ default: ComponentType<P> }>, ad: string): ComponentType<P> {
  return dynamic(yukle, {
    ssr: false,
    loading: () => <UygulamaHazirlaniyor ad={ad} />,
  });
}

const CizimStudyosu = tembel<UygulamaProps>(
  () => import('@/components/workspace/WorkspaceView').then((m) => ({ default: m.WorkspaceView })),
  'Çizim Stüdyosu'
);
const CizimMenuCubugu: ComponentType = dynamic(
  () => import('@/components/workspace/WorkspaceMenuBar').then((m) => ({ default: () => <m.WorkspaceMenuBar /> })),
  {
    ssr: false,
    // Menü çubuğu yüklenirken başlık çubuğunda boşluk kalır (küçük bir yükleyici gereksiz)
    loading: () => null,
  }
);
const VeriGrafik = tembel<UygulamaProps>(() => import('@/components/uygulamalar/veri-grafik'), veriGrafikManifesti.kisaAd);
const Olasilik = tembel<UygulamaProps>(() => import('@/components/uygulamalar/olasilik'), olasilikManifesti.kisaAd);
const Algoritma = tembel<UygulamaProps>(() => import('@/components/uygulamalar/algoritma'), algoritmaManifesti.kisaAd);

/** Kayıt defteri: görev çubuğu, kısayollar ve Başlat menüsü bu sırayı kullanır. */
export const UYGULAMALAR: readonly UygulamaTanimi[] = [
  {
    id: CIZIM_KIMLIGI,
    ad: 'Serbest Çizim Stüdyosu',
    kisaAd: 'Çizim Stüdyosu',
    aciklama: 'Geometri, cebir ve 3B çizim',
    renk: '#2a9d94',
    simge: cizimStudyosuSimgesi,
    Bilesen: CizimStudyosu,
    MenuCubugu: CizimMenuCubugu,
  },
  { ...veriGrafikManifesti, Bilesen: VeriGrafik },
  { ...olasilikManifesti, Bilesen: Olasilik },
  { ...algoritmaManifesti, Bilesen: Algoritma },
];

export function uygulamaBul(id: string): UygulamaTanimi | undefined {
  return UYGULAMALAR.find((u) => u.id === id);
}
