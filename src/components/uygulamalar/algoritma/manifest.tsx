'use client';

/**
 * "Algoritma Laboratuvarı" uygulama manifesti — kabuk (src/components/sinif/uygulamalar.tsx) yalnız bu
 * dosyayı statik içe aktarır; uygulama gövdesi (index.tsx) next/dynamic ile tembel yüklenir.
 */
import React from 'react';

export const manifest = {
  id: 'algoritma',
  ad: 'Algoritma Laboratuvarı',
  kisaAd: 'Algoritma',
  aciklama: 'Robotu programla: bak, karar ver, her dünyada çalışan algoritmayı kur.',
  renk: '#7f88c4',
  simge: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Robot başı (uygulamanın kahramanı): önceki akış şeması 16 px görev çubuğunda zincir halkasına benziyordu */}
      <circle cx="12" cy="4.2" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 5.7v2.6" />
      <rect x="4.5" y="8.3" width="15" height="12" rx="3.6" />
      <circle cx="9.3" cy="13.6" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="13.6" r="1.7" fill="currentColor" stroke="none" />
      <path d="M10.2 17.1q1.8 1.2 3.6 0" />
      <path d="M2.4 12.6v3.6M21.6 12.6v3.6" />
    </svg>
  ),
};
