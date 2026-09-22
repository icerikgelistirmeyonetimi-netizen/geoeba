/**
 * Veri ve Grafik — küçük tohumlu rastgele üreteç (saf, React'siz).
 * mulberry32: 32 bit durumlu, hızlı ve tekrar üretilebilir; testler sabit tohumla çalışır,
 * arayüz her çalıştırmada yeni tohum alır.
 */

export type Uretec = () => number;

/** [0, 1) aralığında sayı üreten tohumlu üreteç */
export function mulberry32(tohum: number): Uretec {
  let t = tohum >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Arayüz için yeni tohum (crypto varsa ondan) */
export function rastgeleTohum(): number {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const d = new Uint32Array(1);
      crypto.getRandomValues(d);
      return d[0];
    }
  } catch {
    /* yedek aşağıda */
  }
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

/** a..b (dahil) tam sayılarından eşit olasılıkla biri */
export function tamSayi(rnd: Uretec, a: number, b: number): number {
  const alt = Math.ceil(Math.min(a, b));
  const ust = Math.floor(Math.max(a, b));
  return alt + Math.min(ust - alt, Math.floor(rnd() * (ust - alt + 1)));
}

/** Ağırlıklara orantılı indeks seçer (negatif / geçersiz ağırlık 0 sayılır); toplam 0 ise -1 */
export function agirlikliSec(rnd: Uretec, agirliklar: number[]): number {
  let toplam = 0;
  for (const a of agirliklar) if (a > 0 && Number.isFinite(a)) toplam += a;
  if (toplam <= 0) return -1;
  let hedef = rnd() * toplam;
  let son = -1;
  for (let i = 0; i < agirliklar.length; i++) {
    const a = agirliklar[i];
    if (!(a > 0) || !Number.isFinite(a)) continue;
    son = i;
    if (hedef < a) return i;
    hedef -= a;
  }
  return son;
}
