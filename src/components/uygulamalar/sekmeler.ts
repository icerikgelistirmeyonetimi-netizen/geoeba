/**
 * ARIA sekme deseni için saf yardımcılar (Veri ve Grafik, Olasılık Laboratuvarı).
 * Ok tuşları sekmeler arasında dolaşır (roving tabindex): Sol/Yukarı önceki, Sağ/Aşağı sonraki,
 * Home ilk, End son. Diğer tuşlar null döner (varsayılan davranış).
 */
export function sekmeOkTusu(tus: string, indeks: number, adet: number): number | null {
  if (adet <= 0) return null;
  switch (tus) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (indeks + 1) % adet;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (indeks - 1 + adet) % adet;
    case 'Home':
      return 0;
    case 'End':
      return adet - 1;
    default:
      return null;
  }
}

/** Sekme ve panel kimlikleri (aria-controls / aria-labelledby bağı). */
export function sekmeKimlikleri(onek: string, id: string): { sekme: string; panel: string } {
  return { sekme: `${onek}-sekme-${id}`, panel: `${onek}-panel-${id}` };
}
