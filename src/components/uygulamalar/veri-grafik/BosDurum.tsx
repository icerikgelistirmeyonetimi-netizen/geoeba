'use client';

/**
 * Veri ve Grafik — grafik alanının ortasındaki yol gösteren kutular (kabuk):
 * - `BosDurum`: grafik için veri yokken (ör. Temizle sonrası) "Tabloya yaz" ve "Örnek veri seç".
 * - `DaireBilgisi`: sayısal değer bir bütünün parçası değilken (örnekte "uygun değil") Daire yerine açıklama ve
 *   iki seçim (değerlerin sıklığı ya da her satır bir dilim).
 */
import React from 'react';
import { DOLU_ZEMIN } from './ortak';

/** Ana eylem düğmeleri: en az 52 px (akıllı tahtada ana hedef) */
const ANA_DUGME =
  'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[calc(var(--radius)-6px)] px-4 text-[14px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors';
const BIRINCIL = `${ANA_DUGME} ${DOLU_ZEMIN} hover:opacity-90`;
const IKINCIL = `${ANA_DUGME} border border-border bg-card text-foreground hover:bg-accent`;

export interface BosDurumProps {
  /** hayalet satıra (yeni satır) odaklanır */
  onTabloyaYaz: () => void;
  /** Örnek veri menüsünü açar */
  onOrnekSec: () => void;
}

/** Grafik için veri yok: 48 px çizim, başlık, açıklama ve iki yol */
export function BosDurum({ onTabloyaYaz, onOrnekSec }: BosDurumProps) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto p-6" data-bos-durum>
      <div className="flex max-w-[26rem] flex-col items-center text-center">
        {/* Boş eksen: yerini bekleyen (kesikli) noktalar ve ekleme işareti, açık zemin dairesi içinde */}
        <svg viewBox="0 0 48 48" className="h-12 w-12 text-muted-foreground" aria-hidden="true">
          <circle cx="24" cy="24" r="23.5" fill="currentColor" fillOpacity="0.1" />
          <path d="M9 34.5h30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M14 34.5v2.5M24 34.5v2.5M34 34.5v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="19" cy="28.5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.3 1.9" />
          <circle cx="29" cy="28.5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.3 1.9" />
          <circle cx="29" cy="19" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.3 1.9" />
          <path d="M16 12.5v7M12.5 16h7" stroke="#216a78" strokeWidth="2.3" strokeLinecap="round" className="dark:stroke-[#9fe0d9]" />
        </svg>
        <p className="mt-3 text-[16px] font-bold leading-6 text-foreground">Grafik için veri yok</p>
        <p className="mt-1 text-[13px] leading-5 text-muted-foreground">Tabloya değer yazın ya da örnek veri seçin.</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button type="button" className={BIRINCIL} onClick={onTabloyaYaz} data-bos-durum-tablo>
            <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 16.5h4l9-9-4-4-9 9z" />
              <path d="M11 5l4 4" />
            </svg>
            Tabloya yaz
          </button>
          <button type="button" className={IKINCIL} onClick={onOrnekSec} data-bos-durum-ornek>
            <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3.5" width="14" height="13" rx="2" />
              <path d="M3 7.5h14M3 11.5h14M8.5 7.5v9" />
            </svg>
            Örnek veri seç
          </button>
        </div>
      </div>
    </div>
  );
}

export interface DaireBilgisiProps {
  /** değişkenin birimsiz adı ("Boy") */
  degiskenAdi: string;
  onSiklik: () => void;
  onSatir: () => void;
}

/**
 * Daire uygun değil: değerler toplanınca bir bütün oluşturmuyor (boy, süre, puan …). Grafik yerine açıklama; öğrenci
 * isterse değerlerin sıklığını (kaç öğrenci kaç kitap) ya da yine de her satırı dilim olarak görebilir.
 */
export function DaireBilgisi({ degiskenAdi, onSiklik, onSatir }: DaireBilgisiProps) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto p-6" data-daire-bilgi>
      <div role="note" className="flex max-w-[30rem] flex-col items-center rounded-[calc(var(--radius)-2px)] border border-border bg-background px-6 py-5 text-center">
        {/* Kesikli dilimli daire: parçalar bir bütün oluşturmuyor */}
        <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
          <circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" className="text-muted-foreground" />
          <path d="M24 24V7a17 17 0 0 1 14.7 8.5z" fill="#d9805f" fillOpacity="0.85" />
          <path d="M24 24l14.7-8.5A17 17 0 0 1 41 24z" fill="#7f88c4" fillOpacity="0.85" />
        </svg>
        <p className="mt-3 text-[15px] font-bold leading-6 text-foreground">Bu veri için daire grafiği uygun değil</p>
        <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
          Daire grafiği bir bütünün parçalarını gösterir; {degiskenAdi} değerleri toplanınca bir bütün oluşturmaz.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button type="button" className={BIRINCIL} onClick={onSiklik} data-daire-bilgi-siklik>
            Değerlerin sıklığını göster
          </button>
          <button type="button" className={IKINCIL} onClick={onSatir} data-daire-bilgi-satir>
            Her satırı dilim yap
          </button>
        </div>
      </div>
    </div>
  );
}
