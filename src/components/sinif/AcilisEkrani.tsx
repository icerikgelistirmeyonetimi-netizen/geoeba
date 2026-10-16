'use client';

/**
 * "EBA yükleniyor" açılış ekranı — akıllı tahtanın ekranında (3B'de homografiyle) ya da
 * tam ekranda gösterilir. Koyu turkuaz-mürekkep zemin, ortada animasyonlu EBA göz karakteri,
 * altında EBA yazı markası, ince ilerleme çubuğu ve durum yazısı.
 *
 * Boyutlar açılış birimine (acilisBirimi.ts: kabı örten 16:9 kutunun 1cqw'si; devirde --acilis-birim ile
 * izdüşüm kutusunun birimine kilitlenir) bağlıdır. Ekran okuyucu için tek duyuru kaynağı SinifEkrani'nin
 * canlı bölgesidir; yükleme içeriği aria-hidden'dır (aynı metin üç kez duyurulmasın). Birim masaüstü duvar
 * logosuyla (sinif.module.css .duvar --l) her en-boy oranında aynı ölçü ve konumu verir.
 */
import React, { useEffect } from 'react';
import { duvarVarliklariniOnYukle } from './duvarVarliklari';
import s from './sinif.module.css';

const VARLIK_ONEKI = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '';

export interface AcilisEkraniProps {
  /** false: ekran koyu, logo henüz belirmedi (yaklaşmanın ilk 0,6 s'si) */
  logoGorunur: boolean;
  /** İlerleme çubuğunun hedef değeri 0–1; CSS geçişiyle `sure` ms'de o değere gider */
  ilerleme: number;
  /** Geçiş süresi (ms) */
  sure: number;
  durum: string;
  /** Yükleme tamamlanınca aynı ekranın üzerinde açılan oturum kutuları; gelirken logo yukarı kayar. */
  children?: React.ReactNode;
  /** Oturum kartı seçildi: kartlar iner, logo açılıştaki yerine (masaüstü duvar logosunun yeri) geri iner. */
  oturumKapaniyor?: boolean;
}

export function AcilisEkrani({ logoGorunur, ilerleme, sure, durum, children, oturumKapaniyor }: AcilisEkraniProps) {
  // Masaüstü duvar kâğıdının logosu/halkaları açılış sürerken indirilip çözülür: geçişte logo sönmez
  useEffect(() => {
    duvarVarliklariniOnYukle();
  }, []);
  return (
    <div
      className={[
        s.acilis,
        s.kabuk,
        logoGorunur ? s['acilis--logo'] : s['acilis--karanlik'],
        children ? s['acilis--oturum'] : '',
        oturumKapaniyor ? s['acilis--oturum-kapaniyor'] : '',
      ].join(' ')}
      data-acilis-ekrani
    >
      <div className={s['acilis-ic']} aria-hidden="true">
        <span className={s['acilis-karakter']} aria-hidden="true">
          <img
            src={`${VARLIK_ONEKI}/images/eba/eba-karakter-animasyon-koyu-zemin.svg`}
            alt=""
            width={220}
            height={220}
            draggable={false}
          />
        </span>
        <span className={s['acilis-yazi']} aria-hidden="true">
          <img src={`${VARLIK_ONEKI}/images/eba/eba-yazi-beyaz.svg`} alt="" width={200} height={80} draggable={false} />
        </span>
        <div className={s['acilis-ilerleme']} aria-hidden="true">
          <span
            className={s['acilis-ilerleme-dolgu']}
            style={{ transform: `scaleX(${Math.min(1, Math.max(0, ilerleme)).toFixed(3)})`, transitionDuration: `${sure}ms` }}
          />
        </div>
        <p className={s['acilis-durum']}>{durum}</p>
      </div>
      {children}
    </div>
  );
}
