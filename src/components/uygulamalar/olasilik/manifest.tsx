'use client';

/**
 * "Olasılık Laboratuvarı" uygulama manifesti — kabuk (src/components/sinif/uygulamalar.tsx) yalnız bu dosyayı
 * statik içe aktarır; uygulama gövdesi (index.tsx) next/dynamic ile tembel yüklenir.
 */
import React from 'react';

export const manifest = {
  id: 'olasilik',
  ad: 'Olasılık Laboratuvarı',
  kisaAd: 'Olasılık',
  aciklama: 'Öznel, teorik ve deneysel olasılığı 3B deneylerle karşılaştır.',
  renk: '#c99a52',
  // Sayı küpü: yüzünde nokta değil rakam (MEB "sayı küpü"; laboratuvardaki 3B küp de rakamlıdır)
  simge: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <text x="12" y="16.4" textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="Manrope, system-ui, sans-serif" fill="currentColor" stroke="none">
        3
      </text>
    </svg>
  ),
};

/**
 * İlkokul kademesinde masaüstü kısayolu, Başlat menüsü ve pencere başlığı bu açıklama ve simgeyle görünür
 * (uygulamalar.tsx → kademeninUygulamalari): laboratuvar orada «olay kartları» kipiyle açılır, sayı küpü yoktur.
 */
export const ilkokulManifesti = {
  aciklama: 'Olayları imkânsız, olabilir ya da kesin diye ayır; torba ve çarkla dene.',
  // Renkli çark: dört dilim, göbek, üstte sabit ok
  simge: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 13V4.5a8.5 8.5 0 0 1 8.5 8.5z" fill="currentColor" fillOpacity="0.45" stroke="none" />
      <path d="M12 13v8.5A8.5 8.5 0 0 1 3.5 13z" fill="currentColor" fillOpacity="0.45" stroke="none" />
      <circle cx="12" cy="13" r="8.5" />
      <path d="M12 4.5v17M3.5 13h17" />
      <circle cx="12" cy="13" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 6.2L10.2 2.4h3.6z" fill="currentColor" stroke="none" />
    </svg>
  ),
};
