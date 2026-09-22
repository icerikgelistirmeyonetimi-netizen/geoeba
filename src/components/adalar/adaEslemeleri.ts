/**
 * 3B ada ekranı ile uygulamanın müfredat verisi arasındaki eşlemeler.
 * Blender'dan üretilen sahne verisinde Hazırlık sınıfı 'hazirlik' kimliğiyle,
 * müfredatta ise gradeNumber 0 ile tutulur.
 */
import type { GradeId, LevelId } from '@/types/curriculum';

export type AdaSayfasiKimligi = 'ana-sayfa' | LevelId;

export interface KademeAdasi {
  id: LevelId;
  ad: string;
  baslik: string;
  aralik: string;
  renk: string;
}

export const KADEME_ADALARI: readonly KademeAdasi[] = [
  { id: 'ilkokul', ad: 'İlkokul', baslik: 'İlkokul Adası', aralik: '1–4. sınıf', renk: '#d9805f' },
  { id: 'ortaokul', ad: 'Ortaokul', baslik: 'Ortaokul Adası', aralik: '5–8. sınıf', renk: '#2a9d94' },
  { id: 'lise', ad: 'Lise', baslik: 'Lise Adası', aralik: 'Hazırlık – 12. sınıf', renk: '#7f88c4' },
];

/**
 * Ana sayfadaki Matematik Atölyesi adası: uygulamaların açıldığı 3B sınıfı (Serbest Çizim
 * Stüdyosu) açar. `tabela`, atölyenin önündeki 3B tabelanın yazısıdır; sahneyi üreten
 * scripts/adalar/web_aktar.py aynı yazıyı modele işler ve ana-sayfa.json'a yazar
 * (adaVerisi.test.ts ikisini karşılaştırır).
 */
export const ATOLYE = { id: 'atolye', ad: 'Matematik Atölyesi', renk: '#c99a52', tabela: 'ATÖLYE' } as const;

/** Kademe adasındaki sınıf binalarının rıhtımdaki sırası. */
export const ADA_SINIFLARI: Record<LevelId, readonly GradeId[]> = {
  ilkokul: [1, 2, 3, 4],
  ortaokul: [5, 6, 7, 8],
  lise: [0, 9, 10, 11, 12],
};

export function kademeAdasi(id: string | null | undefined): KademeAdasi | null {
  return KADEME_ADALARI.find((k) => k.id === id) ?? null;
}

/** Sahne verisindeki sınıf kimliğini ('hazirlik', 5, '5') müfredattaki GradeId'ye çevirir. */
export function sinifNumarasi(sahneKimligi: string | number): GradeId | null {
  if (sahneKimligi === 'hazirlik') return 0;
  const n = typeof sahneKimligi === 'number' ? sahneKimligi : Number(sahneKimligi);
  return Number.isInteger(n) && n >= 0 && n <= 12 ? (n as GradeId) : null;
}

/** Müfredattaki GradeId'yi sahne verisindeki kimliğe çevirir (0 → 'hazirlik'). */
export function sahneSinifKimligi(sinif: GradeId): string | number {
  return sinif === 0 ? 'hazirlik' : sinif;
}

export function sinifAdi(sinif: GradeId): string {
  return sinif === 0 ? 'Hazırlık' : `${sinif}. Sınıf`;
}

const KUCUK_KALAN_BAGLACLAR = new Set(['ve', 'ile', 'veya', 'ya', 'da', 'de']);

/**
 * Müfredatta büyük harfle yazılmış ünite adlarını ("SAYILAR VE NİCELİKLER (1)") Türkçe
 * başlık düzenine çevirir ("Sayılar ve Nicelikler (1)"). Başındaki "MAT.x.y" kodu atılır.
 */
export function uniteAdi(hamAd: string): string {
  const temiz = hamAd.replace(/^MAT\.[\d.]+\s*[-–:]?\s*/i, '').trim();
  return temiz
    .toLocaleLowerCase('tr')
    .split(/(\s+)/)
    .map((parca, i) => {
      if (/^\s+$/.test(parca) || (i > 0 && KUCUK_KALAN_BAGLACLAR.has(parca))) return parca;
      const ilkHarf = parca.search(/\p{L}/u);
      if (ilkHarf < 0) return parca;
      return parca.slice(0, ilkHarf) + parca.charAt(ilkHarf).toLocaleUpperCase('tr') + parca.slice(ilkHarf + 1);
    })
    .join('');
}
