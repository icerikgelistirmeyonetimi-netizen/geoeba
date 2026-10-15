/**
 * Kullanıcının sağladığı para.eps dosyasından aktarılan 1 TL yazı yüzü.
 * SVG'de özgün çizgi, yazı ve metal dokuları korunur; beyaz zemin ve sunum gölgesi çıkarılmıştır.
 * 2B görünüm ve 3B kapak aynı dosyayı yükler. Pages alt dizini için ortak varlık öneki kullanılır.
 */
export const YAZI_GORSELI = `${process.env.NEXT_PUBLIC_ASSET_PREFIX ?? ''}/olasilik/para-yazi.svg`;
