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
  simge: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
};
