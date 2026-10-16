/**
 * Açılış ekranının ve masaüstü duvar logosunun ölçü birimi (px): kabı ÖRTEN 16:9 kutunun genişliğinin
 * yüzde biri. Kamera tahtaya örtme kadrajıyla varır (sinifSahnesi.bitisUzakligi): tahta izdüşümü kabı
 * örten 16:9 kutudur ve içeriğin birimi o kutunun 1cqw'sidir. Tam ekranın birimi de aynı kutudan
 * hesaplanınca devirde içerik ne küçülür ne büyür — 16:9 dışındaki kapta (4:3 bölme, 16:10 dizüstü)
 * eskiden logo devirde küçülüyordu (16 Ekim 2026).
 *
 * Çok basık kapta (2:1'den geniş) birim yüksekliğin %2'siyle sınırlıdır: açılış içeriği dikeyde taşmaz,
 * masaüstü logosu görev çubuğuna değmez (sinif.module.css .acilis --b ve .duvar --l ile aynı formül).
 */
export const EKRAN_EN_BOY = 16 / 9;

export function acilisBirimi(kapW: number, kapH: number): number {
  const w = Math.max(1, kapW);
  const h = Math.max(1, kapH);
  return Math.max(Math.min(w, 2 * h), h * EKRAN_EN_BOY) / 100;
}
