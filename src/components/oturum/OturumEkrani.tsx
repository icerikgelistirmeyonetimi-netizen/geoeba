'use client';

/**
 * Oturum açma — akıllı tahtanın EBA açılış ekranının üzerinde, gerçek bir bilgisayar oturum ekranı gibi:
 * logonun altında kademe HESAPLARI (yuvarlak avatar, ad, sınıf aralığı; kullanıcı: "gerçek bilgisayar oturum
 * hissi", 16 Ekim 2026). Hesap tıklanınca avatarın çevresinde halka döner ve "Oturum açılıyor…" yazar, diğer
 * hesaplar söner (kapaniyor + secilen); altta kilit ekranı gibi saat/tarih ve "Adalara dön". Renkler ve sıra
 * adalardaki kademe kartlarıyla aynı kaynaktan (adaEslemeleri); tokenlar sınıf kabuğundan (sinif.module.css).
 */
import React from 'react';
import { Backpack, BookOpen, GraduationCap, LogOut, type LucideIcon } from 'lucide-react';
import type { LevelId } from '@/types/curriculum';
import { KADEME_ADALARI } from '@/components/adalar/adaEslemeleri';
import { useSaat } from '@/components/sinif/useSaat';
import s from './oturum.module.css';

const SIMGELER: Record<LevelId, LucideIcon> = {
  ilkokul: Backpack,
  ortaokul: BookOpen,
  lise: GraduationCap,
};

/** Hesaplar adalarla aynı sıra, ad, sınıf aralığı ve renkte (adaEslemeleri tek kaynak). */
const HESAPLAR = KADEME_ADALARI.map((k) => ({ id: k.id, ad: k.ad, siniflar: k.aralik, renk: k.renk, Simge: SIMGELER[k.id] }));

export interface OturumEkraniProps {
  onOturumAc: (kademe: LevelId) => void;
  onAdalaraDon?: () => void;
  /**
   * Hesap seçildi: seçilen avatarda dönen halka ve "Oturum açılıyor…", diğerleri söner, hiçbiri tıklanamaz;
   * SinifEkrani SURELER.OTURUM_KAPANIS sonra masaüstüne geçer (hesaplar iner, logo açılıştaki yerine döner).
   */
  kapaniyor?: boolean;
  /** Seçilen hesap (kapaniyor ile). */
  secilen?: LevelId | null;
}

export function OturumEkrani({ onOturumAc, onAdalaraDon, kapaniyor, secilen }: OturumEkraniProps) {
  const { saat, tarih } = useSaat();
  return (
    <section
      className={[s.ekran, kapaniyor ? s['ekran--kapaniyor'] : ''].join(' ')}
      data-oturum-ekrani
      data-kapaniyor={kapaniyor || undefined}
      aria-label="Oturum aç"
    >
      <div className={s.govde}>
        <p className={s.ipucu}>Oturum açmak için hesabını seç</p>
        <div className={s.hesaplar} role="group" aria-label="Kademe hesapları">
          {HESAPLAR.map(({ id, ad, siniflar, renk, Simge }, sira) => {
            const aciliyor = !!kapaniyor && secilen === id;
            return (
              <button
                key={id}
                type="button"
                className={[s.hesap, aciliyor ? s['hesap--aciliyor'] : '', kapaniyor && !aciliyor ? s['hesap--soluk'] : ''].join(' ')}
                style={{ '--hesap-renk': renk, '--sira': sira } as React.CSSProperties}
                onClick={() => onOturumAc(id)}
                disabled={!!kapaniyor}
                aria-label={`${ad} oturumu aç`}
                aria-busy={aciliyor || undefined}
                data-oturum-sec={id}
              >
                <span className={s.avatar} aria-hidden="true">
                  <Simge size={30} strokeWidth={1.7} aria-hidden />
                </span>
                <span className={s.ad}>{ad}</span>
                <span className={s.aciklama}>{aciliyor ? 'Oturum açılıyor…' : siniflar}</span>
              </button>
            );
          })}
        </div>
      </div>
      <footer className={s.alt}>
        <div className={s.saat} aria-live="off">
          <span className={s['saat-zaman']} data-saat>
            {saat}
          </span>
          <span className={s['saat-tarih']}>{tarih}</span>
        </div>
        {onAdalaraDon && (
          <button className={s.geri} type="button" onClick={onAdalaraDon} disabled={!!kapaniyor}>
            <LogOut size={16} aria-hidden />
            Adalara dön
          </button>
        )}
      </footer>
    </section>
  );
}
