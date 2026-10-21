/** Çizim nesnelerinin ortak renkleri. Kaydedilmiş özel renkler bu palete dönüştürülmez. */
export const NESNE_RENGI = {
  mavi: '#5b8db8',
  mor: '#8c7bb6',
  pembe: '#c87993',
  zumrut: '#4f9d8a',
  kehribar: '#c29a52',
  camgobegi: '#4c9ba6',
  indigo: '#737faf',
  kirmizi: '#c66e67',
  koyu: '#526779',
} as const;

export const NESNE_RENKLERI: readonly { hex: string; name: string }[] = [
  { hex: NESNE_RENGI.mavi, name: 'Mavi' },
  { hex: NESNE_RENGI.mor, name: 'Mor' },
  { hex: NESNE_RENGI.pembe, name: 'Pembe' },
  { hex: NESNE_RENGI.zumrut, name: 'Zümrüt' },
  { hex: NESNE_RENGI.kehribar, name: 'Kehribar' },
  { hex: NESNE_RENGI.camgobegi, name: 'Camgöbeği' },
  { hex: NESNE_RENGI.indigo, name: 'İndigo' },
  { hex: NESNE_RENGI.kirmizi, name: 'Kırmızı' },
  { hex: NESNE_RENGI.koyu, name: 'Arduvaz' },
];

export const NESNE_SECIM_RENGI = '#087f8c';
export const NESNE_SECIM_RENGI_KOYU_TEMA = '#64d1c4';
