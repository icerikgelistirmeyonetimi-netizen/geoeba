'use client';

/**
 * "EBA yükleniyor" açılış ekranı — akıllı tahtanın ekranında (3B'de homografiyle) ya da
 * tam ekranda gösterilir. Koyu turkuaz-mürekkep zemin, ortada animasyonlu EBA göz karakteri,
 * altında EBA yazı markası, ince ilerleme çubuğu ve durum yazısı.
 *
 * Boyutlar kap genişliğine (cqw; devirde --acilis-birim ile varıştaki genişliğe kilitlenir) bağlıdır.
 * Ekran okuyucu için tek duyuru kaynağı SinifEkrani'nin canlı bölgesidir; bu katman aria-hidden'dır
 * (aynı metin üç kez duyurulmasın). Ölçü birimi min(1cqw, 2cqh): masaüstü duvar logosuyla (sinif.module.css
 * .duvar --l) her en-boy oranında aynı ölçü ve konum.
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
}

export function AcilisEkrani({ logoGorunur, ilerleme, sure, durum }: AcilisEkraniProps) {
  // Masaüstü duvar kâğıdının logosu/halkaları açılış sürerken indirilip çözülür: geçişte logo sönmez
  useEffect(() => {
    duvarVarliklariniOnYukle();
  }, []);
  return (
    <div
      className={[s.acilis, s.kabuk, logoGorunur ? s['acilis--logo'] : s['acilis--karanlik']].join(' ')}
      aria-hidden="true"
    >
      <div className={s['acilis-ic']}>
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
    </div>
  );
}
