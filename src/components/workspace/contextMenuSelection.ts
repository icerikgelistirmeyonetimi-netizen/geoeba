/**
 * Sağ tık / uzun basma ile nesne menüsü açılırken seçimin ne olacağı.
 * Tıklanan nesne zaten ÇOKLU seçimin parçasıysa seçim olduğu gibi (aynı dizi, aynı sıra) korunur:
 * "Seçili N noktayı birleştir" ve "Kopyala" bu seçime bakar, birleştirme sırası da seçim sırasıdır.
 * Aksi hâlde seçim tıklanan nesneye indirilir.
 */
export function contextMenuSelection(selectedIds: string[], clickedId: string): string[] {
  return selectedIds.length > 1 && selectedIds.includes(clickedId) ? selectedIds : [clickedId];
}

/**
 * Seç ve Taşı aracıyla nesneye sol tıklayınca seçim. Shift/Ctrl ile nesne seçime eklenir ya da seçimden çıkarılır
 * (her zaman yeni dizi). Tıklanan zaten seçiliyse seçim AYNI dizi olarak korunur (seçimin tamamı sürüklenir); değilse
 * yalnız tıklanan seçilir.
 */
export function clickSelection(selectedIds: string[], clickedId: string, additive: boolean): string[] {
  const secili = selectedIds.includes(clickedId);
  if (additive) return secili ? selectedIds.filter((id) => id !== clickedId) : [...selectedIds, clickedId];
  return secili ? selectedIds : [clickedId];
}
