/** Seçim çubuğu başlığı: "2 nesne seçildi", "1 cisim seçildi", "2 nesne, 1 cisim seçildi". */
export function secimBasligi(nesne: number, cisim: number): string {
  const parcalar = [nesne > 0 ? `${nesne} nesne` : '', cisim > 0 ? `${cisim} cisim` : ''].filter(Boolean);
  return `${parcalar.join(', ')} seçildi`;
}
