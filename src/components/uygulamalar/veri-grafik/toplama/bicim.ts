/**
 * Veri topla — görsel bileşenlerin paylaştığı küçük saf yardımcılar: yüzde metni, renk tonları,
 * SVG içinde ölçekten bağımsız okunur yazı boyu. Arayüz yoktur; testlerde doğrudan denenir.
 */

/**
 * "%29" · "%16,7": yarımlar yukarı yuvarlanır, ondalık ayırıcı virgül. Sıfır payda → "" (0/0'ın yüzdesi yoktur;
 * çağıran ayırıcıyı da gizler). Kutucuk, sayaç ve özet grafikle aynı kuralı (1 ondalık) kullanır.
 */
export function yuzdeMetni(pay: number, payda: number, ondalik = 0): string {
  if (!Number.isFinite(pay) || !Number.isFinite(payda) || payda <= 0) return '';
  const k = 10 ** ondalik;
  const y = Math.round((pay / payda) * 100 * k + 1e-9) / k;
  return `%${String(y).replace('.', ',')}`;
}

/** Oran (0–1) → "%50" · "%16,7" */
export function oranMetni(oran: number, ondalik = 1): string {
  return yuzdeMetni(oran, 1, ondalik);
}

function hexCoz(renk: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(renk.trim());
  if (!m) return null;
  const h = m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function hexYaz([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

/** Rengi mürekkebe (#15302d) doğru koyulaştırır (para kalınlığı, çizgi tonu); hex değilse aynen döner */
export function koyulastir(renk: string, oran = 0.28): string {
  const c = hexCoz(renk);
  if (!c) return renk;
  const hedef: [number, number, number] = [0x15, 0x30, 0x2d];
  return hexYaz([0, 1, 2].map((i) => c[i] + (hedef[i] - c[i]) * oran) as [number, number, number]);
}

/** Rengi beyaza doğru açar (parlama, iç halka) */
export function ac(renk: string, oran = 0.3): string {
  const c = hexCoz(renk);
  if (!c) return renk;
  return hexYaz([0, 1, 2].map((i) => c[i] + (255 - c[i]) * oran) as [number, number, number]);
}

/** Rengin saydam hâli: "#2f8394" + 0,12 → "rgba(47, 131, 148, 0.12)" */
export function saydam(renk: string, opaklik: number): string {
  const c = hexCoz(renk);
  if (!c) return renk;
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${opaklik})`;
}

/**
 * SVG yazı boyu (viewBox biriminde): ekranda en az `enAzPx` piksel görünsün. Sahneler 200 birimlik
 * viewBox'la `boyut` piksele ölçeklenir; 160 px'lik parada 13 birim 10,4 px olurdu.
 */
export function svgYaziBoyu(istenen: number, boyut: number, viewBox = 200, enAzPx = 12.5): number {
  if (!(boyut > 0)) return istenen;
  return Math.max(istenen, (enAzPx * viewBox) / boyut);
}

/** Küçük, kararlı sözde rastgele (canlandırma yüzleri ve karışık top dizilimi için; tohum = anahtar) */
export function kararliRastgele(tohum: number): () => number {
  let a = (tohum | 0) + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
