/**
 * Düz bir çizgiyi ölçen etiketler (doğru parçası uzunluğu, çokgen kenarı, iki nokta arası mesafe,
 * doğru/ışın üzerindeki |AB|) ölçtükleri çizgiye PARALEL yazılır; teknik resimdeki ölçü yazıları gibi.
 *
 * Kural: yazı hiçbir zaman baş aşağı okunmaz. Açı [-90°, 90°) aralığına katlanır; tam dikey çizgide
 * yazı aşağıdan yukarıya (sayfanın sağından okunur gibi) durur. Girdi EKRAN koordinatıdır (y aşağı).
 * Değer çizimin her karesinde uç noktalardan yeniden hesaplandığı için çizgi döndürüldüğünde ya da bir
 * ucu taşındığında etiket yeni doğrultuya kendiliğinden uyar.
 */
export function etiketAcisi(dx: number, dy: number): number {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return 0;
  let aci = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (aci >= 90) aci -= 180;
  else if (aci < -90) aci += 180;
  return Object.is(aci, -0) ? 0 : aci;
}

/** SVG `transform` değeri: etiketi kendi merkezi (cx, cy) çevresinde çizgiye paralel döndürür. */
export function etiketDondurme(dx: number, dy: number, cx: number, cy: number): string {
  const aci = etiketAcisi(dx, dy);
  if (aci === 0) return '';
  return `rotate(${Number(aci.toFixed(2))} ${cx} ${cy})`;
}
