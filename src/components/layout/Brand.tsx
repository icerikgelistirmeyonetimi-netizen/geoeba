import React, { useEffect, useRef, useState } from 'react';
import { ilkAcilisAnimasyonuAl } from './logoAnimasyonu';

/** public/ altındaki dosyalar basePath ile otomatik öneklenmez (bkz. next.config.mjs). */
const VARLIK_ONEKI = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '';
const LOGO = `${VARLIK_ONEKI}/images/eba/eba-logo-karakter-yatay`;

/**
 * EBA logosu: yazı markası + taşıyıcı tip (göz motifli karakter).
 * Kaynak: EBA Görsel Kimlik Kullanım Kılavuzu s. 24–26. Açık temada kırmızı,
 * koyu temada kılavuzun beyaz sürümü gösterilir; dosyalar public/images/eba/ altında.
 * Uygulama ilk açıldığında göz animasyonu bir kez oynar, sonra nötr pozda durur.
 */
export function Brand() {
  const kok = useRef<HTMLSpanElement>(null);
  // Sunucu çıktısıyla uyum için duragan başlar; animasyon yalnız istemcide açılır.
  const [canli, setCanli] = useState(false);
  useEffect(() => {
    // Ada ekranı açıkken üst bar gizlidir (globals.css: body[data-ada-ekrani]); açılış
    // animasyonunu ekranda görünen logo alsın diye kısa bir bekleyişle görünürlük denetlenir.
    const id = window.setTimeout(() => {
      const el = kok.current;
      if (el && el.getClientRects().length > 0 && ilkAcilisAnimasyonuAl()) setCanli(true);
    }, 300);
    return () => window.clearTimeout(id);
  }, []);
  const ek = canli ? '-animasyon-tek' : '';

  return (
    <span ref={kok} className="flex items-center whitespace-nowrap">
      <img
        src={`${LOGO}${ek}.svg`}
        alt="EBA"
        width={820}
        height={220}
        className="h-9 w-auto sm:h-10 dark:hidden"
        draggable={false}
      />
      <img
        src={`${LOGO}-koyu-zemin${ek}.svg`}
        alt="EBA"
        width={820}
        height={220}
        className="hidden h-9 w-auto sm:h-10 dark:block"
        draggable={false}
      />
    </span>
  );
}
