'use client';

/**
 * Masaüstü uygulama kayıt defteri: görev çubuğuna sabitlenmiş, masaüstü kısayolu ve Başlat menüsü
 * girişi olan uygulamalar (sırası burada belirlenir). Her uygulama bir pencerede açılır
 * (UygulamaPenceresi); gövdeler tembel yüklenir (yalnız tarayıcıda; aşağıda tembel()) ve yüklenirken
 * pencere içinde ada yükleyicisi tarzı küçük bir "hazırlanıyor" gösterilir.
 *
 * Tembel yükleme next/dynamic ile değil tembelYukleme.ts ile: next/dynamic (React.lazy) bir kez reddedilen parçayı
 * kalıcı tutuyordu; yayın sonrası eski parça 404'ünde ya da ağ kopmasında pencere sayfa yenilenene kadar açılmıyordu.
 *
 * Uygulama sözleşmesi: src/components/uygulamalar/<klasör>/index.tsx → `manifest` + varsayılan
 * bileşen ({ pencereGenisligi?, pencereYuksekligi? }) ve manifest.tsx (yalnız manifest; kabuk
 * statik olarak bunu okur, gövdeyi yüklemez). Çizim Stüdyosu mevcut çalışma alanıdır
 * (WorkspaceView + başlık çubuğunda WorkspaceMenuBar).
 */
import React, { Suspense, lazy, useState, type ComponentType } from 'react';
import { WorkspaceMenuBar } from '@/components/workspace/WorkspaceMenuBar';
import { manifest as veriGrafikManifesti } from '@/components/uygulamalar/veri-grafik/manifest';
import { ilkokulManifesti as olasilikIlkokulManifesti, manifest as olasilikManifesti } from '@/components/uygulamalar/olasilik/manifest';
import { manifest as algoritmaManifesti } from '@/components/uygulamalar/algoritma/manifest';
import { useIlkokulKipi } from '@/hooks/useKademeDuzeyi';
import { onbellekliYukleyici } from './tembelYukleme';
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

/**
 * Tembel uygulama gövdesi (yalnız tarayıcıda): parça yüklenirken pencere içinde "hazırlanıyor", geçici ağ hatasında
 * birkaç kez yeniden denenir (tembelYukleme.ts), başarılı modül saklanır (bir kez indirilir). Başarısızlık SAKLANMAZ:
 * her bağlanış (pencere açılışı, hata sınırının «Yeniden dene»si) kendi lazy örneğini kurar ve parçayı yeniden ister.
 * Parça yine gelmezse hata pencerenin hata sınırına (PencereHataSiniri) gider: «Yeniden dene» / «Sayfayı yenile».
 */
function tembel<P extends object>(yukle: () => Promise<{ default: ComponentType<P> }>, ad: string, kimlik?: string): ComponentType<P> {
  const yukleyici = onbellekliYukleyici(yukle);
  function TembelUygulama(props: P) {
    const ilkokul = useIlkokulKipi();
    const yuklemeAdi = ilkokul && kimlik ? ILKOKUL_UYARLAMALARI[kimlik]?.kisaAd ?? ad : ad;
    // Bağlanışta bir kez seçilir: ağaç yapısı bağlı kaldıkça değişmemeli (değişirse uygulama sökülüp yeniden kurulur)
    const [hazir] = useState<ComponentType<P> | null>(() => yukleyici.hazir()?.default ?? null);
    const [Gecikmeli] = useState(() => (hazir ? null : lazy(yukleyici.yukle)));
    if (hazir) {
      const Hazir = hazir;
      return <Hazir {...props} />;
    }
    if (!Gecikmeli || typeof window === 'undefined') return <UygulamaHazirlaniyor ad={yuklemeAdi} />;
    // lazy() türü ref özelliklerini de taşır; gövdeler ref almaz
    const Govde = Gecikmeli as unknown as ComponentType<P>;
    return (
      <Suspense fallback={<UygulamaHazirlaniyor ad={yuklemeAdi} />}>
        <Govde {...props} />
      </Suspense>
    );
  }
  TembelUygulama.displayName = `Tembel(${ad})`;
  return TembelUygulama;
}

const CizimStudyosu = tembel<UygulamaProps>(
  () => import('@/components/workspace/WorkspaceView').then((m) => ({ default: m.WorkspaceView })),
  'Çizim Stüdyosu'
);
// Dosya–Yardım menüleri pencere kabuğunun parçasıdır; uygulama gövdesi yüklenirken de görünür.
const CizimMenuCubugu: ComponentType = WorkspaceMenuBar;
const VeriGrafik = tembel<UygulamaProps>(() => import('@/components/uygulamalar/veri-grafik'), veriGrafikManifesti.kisaAd);
const Olasilik = tembel<UygulamaProps>(() => import('@/components/uygulamalar/olasilik'), olasilikManifesti.kisaAd);
const Algoritma = tembel<UygulamaProps>(() => import('@/components/uygulamalar/algoritma'), algoritmaManifesti.kisaAd, algoritmaManifesti.id);

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

/**
 * İlkokul kademesinde (Çizim Stüdyosu'nun Kademe menüsü: İlkokul) masaüstünde gösterilmeyen uygulamalar.
 * Şu an yok. Olasılık Laboratuvarı 2. turda burada gizleniyordu (3. sınıf: "zar kaldırılmalı"; 4. sınıf: TYMM
 * MAT.4.4.1 "olasılık tahminlerinde oran, kesir ve yüzde gibi sayı temsilleri kullanmaları beklenmez"; laboratuvar
 * baştan sona sayı küpü, kesir ve yüzde üzerine kurulu). 4. turda alan uzmanı (geoeba (3).xlsx satır 183): tamamen
 * kaldırmak MAT.4.4.1'in "günlük yaşamdaki olayların olasılığını imkânsız, olabilir, kesin olarak belirleme"
 * çıktısını karşılıksız bırakıyor. Bu yüzden laboratuvar ilkokulda da görünür ama «olay kartları» kipiyle açılır
 * (olasilik/OlayKartlariGorunumu.tsx): sayı, kesir, yüzde ve sayı küpü yok; öğrenci olayı önce sınıflandırır, sonra torba
 * ya da çark deneyiyle sınar. Ortaokul, lise ve "Tüm araçlar"da laboratuvar değişmez.
 */
export const ILKOKULDA_GIZLI_UYGULAMALAR: readonly string[] = [];

/** İlkokulda kısayol / Başlat menüsü / pencere başlığında açıklaması ve simgesi değişen uygulamalar */
const ILKOKUL_UYARLAMALARI: Readonly<Record<string, Partial<Pick<UygulamaManifesti, 'ad' | 'kisaAd' | 'aciklama' | 'simge'>>>> = {
  [CIZIM_KIMLIGI]: { aciklama: 'Şekilleri çiz, ölç ve geometrik cisimleri keşfet.' },
  [veriGrafikManifesti.id]: { aciklama: 'Nesne ve şekil grafikleri oluştur; çetele ve sıklık tablolarını incele.' },
  olasilik: olasilikIlkokulManifesti,
  algoritma: { ad: 'Algoritma', kisaAd: 'Algoritma', aciklama: 'Adımları sırala, örüntüleri keşfet ve robotu hedefine ulaştır.' },
};

/** Masaüstü, görev çubuğu ve Başlat menüsünün kademeye göre listesi (sıra korunur) */
export function kademeninUygulamalari(ilkokul: boolean, liste: readonly UygulamaTanimi[] = UYGULAMALAR): readonly UygulamaTanimi[] {
  if (!ilkokul) return liste;
  return liste.filter((u) => !ILKOKULDA_GIZLI_UYGULAMALAR.includes(u.id)).map((u) => (ILKOKUL_UYARLAMALARI[u.id] ? { ...u, ...ILKOKUL_UYARLAMALARI[u.id] } : u));
}
