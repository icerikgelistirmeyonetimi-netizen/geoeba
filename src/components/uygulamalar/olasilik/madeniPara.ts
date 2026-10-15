/**
 * Madeni paranın tırtıklı yan yüzü ve şablon simgesinin renkleri.
 * Kapaklar 2B ve 3B görünümde ortak turaGorseli / yaziGorseli kaynaklarını kullanır.
 */

/** Kenardaki tırtık sayısı. */
export const PARA_TIRTIK_SAYISI = 120;

export const PARA_RENKLERI = {
  halka: { acik: '#f6e2a0', orta: '#d8b45e', koyu: '#9b752a', murekkep: '#6a4c14' },
  gobek: { acik: '#f5f6f7', orta: '#c7cbcf', koyu: '#8d9399', murekkep: '#4f555c' },
} as const;


/** Kenar dokusunun kullandığı 2B bağlam alt kümesi (testte sahte bağlam). */
export type Cizim2B = Pick<CanvasRenderingContext2D, 'fillRect' | 'fillStyle'>;

/** Para kenarı (silindir yanı): altın sarısı zemin üzerinde dikey tırtıklar. Tuvalin yatayı kenarın çevresidir. */
export function paraKenariniCiz(ctx: Cizim2B, s: number, kip: 'renk' | 'yukseklik' = 'renk'): void {
  const H = PARA_RENKLERI.halka;
  const renk = kip === 'renk';
  ctx.fillStyle = renk ? H.orta : '#808080';
  ctx.fillRect(0, 0, s, s);
  const w = s / PARA_TIRTIK_SAYISI;
  for (let i = 0; i < PARA_TIRTIK_SAYISI; i++) {
    ctx.fillStyle = renk ? H.koyu : '#202020';
    ctx.fillRect(i * w, 0, w * 0.42, s);
    ctx.fillStyle = renk ? H.acik : '#f0f0f0';
    ctx.fillRect(i * w + w * 0.5, 0, w * 0.3, s);
  }
}
