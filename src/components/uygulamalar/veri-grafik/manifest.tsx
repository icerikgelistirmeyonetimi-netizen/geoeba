'use client';

/**
 * "Veri ve Grafik" uygulama manifesti — kabuk (src/components/sinif/uygulamalar.tsx) yalnız bu dosyayı
 * statik içe aktarır; uygulama gövdesi (index.tsx) next/dynamic ile tembel yüklenir.
 */
import React from 'react';

export const manifest = {
  id: 'veri-grafik',
  ad: 'Veri ve Grafik',
  kisaAd: 'Veri ve Grafik',
  aciklama: 'Veri tablosu ile nokta, sütun, çizgi ve daire grafikleri; ortalama ve ortalama mutlak sapma.',
  renk: '#216a78',
  simge: (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M3 19.5h18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="6" cy="16" r="2" fill="currentColor" />
      <circle cx="12" cy="16" r="2" fill="currentColor" />
      <circle cx="12" cy="11.5" r="2" fill="currentColor" />
      <circle cx="12" cy="7" r="2" fill="currentColor" />
      <circle cx="18" cy="16" r="2" fill="currentColor" />
      <circle cx="18" cy="11.5" r="2" fill="currentColor" />
    </svg>
  ),
};
