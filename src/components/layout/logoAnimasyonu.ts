/**
 * EBA logosunun açılış animasyonu uygulama başına yalnız BİR kez oynar.
 * Sayfa ilk yüklendiğinde logoyu ilk gösteren bileşen (ada ekranı ya da üst bar)
 * bayrağı alır; sonraki ekran geçişlerinde logo duragan sürümüyle gelir.
 * Tam sayfa yenilemesi yeni bir açılış sayılır (bellek içi bayrak sıfırlanır).
 */
let oynatildi = false;

/** İlk çağrıda true döner ve bayrağı kapatır; sonraki çağrılar false döner. */
export function ilkAcilisAnimasyonuAl(): boolean {
  if (oynatildi) return false;
  oynatildi = true;
  return true;
}
