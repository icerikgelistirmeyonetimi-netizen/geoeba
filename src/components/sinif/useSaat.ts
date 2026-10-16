'use client';

import { useEffect, useState } from 'react';
import { saatMetni, sonrakiDakikayaKalan, tarihMetni } from './saat';

/**
 * Dakika sınırına hizalı canlı saat (görev çubuğu ve oturum açma ekranı). Sunucu/ilk çizimde boş: saat
 * yalnız tarayıcıda yazılır (hidrasyon uyuşmazlığı olmasın).
 */
export function useSaat(): { saat: string; tarih: string } {
  const [simdi, setSimdi] = useState<Date | null>(null);
  useEffect(() => {
    let zamanlayici = 0;
    const guncelle = () => {
      const t = new Date();
      setSimdi(t);
      zamanlayici = window.setTimeout(guncelle, sonrakiDakikayaKalan(t) + 20);
    };
    guncelle();
    return () => window.clearTimeout(zamanlayici);
  }, []);
  return simdi ? { saat: saatMetni(simdi), tarih: tarihMetni(simdi) } : { saat: '', tarih: '' };
}
