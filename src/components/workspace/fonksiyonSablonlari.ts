import type { KademeDuzeyi } from './kademeDuzeyleri';

/**
 * FONKSİYON PENCERESİNİN HIZLI ŞABLONLARI: TEGM ortaokul raporu doğrultusunda ortaokulda yalnız doğrusal
 * fonksiyon örneği sunulur. Diğer fonksiyon aileleri lise ve serbest araçlar görünümündedir.
 *
 * Süzgeç YALNIZ ortaokulda uygulanır; lise, ilkokul ve "Tüm araçlar" bütün şablonları görür (kademe kuralı).
 * Elle yazılan ifade süzülmez: ortaokulda da sin(x) yazılabilir, yalnız hazır düğmesi sunulmaz.
 */
export interface FonksiyonSablonu {
  kimlik: 'dogrusal' | 'parabol' | 'sinus' | 'kosinus' | 'mutlak' | 'parametreli' | 'karekok' | 'derece';
  label: string;
  expr: string;
}

export const FONKSIYON_SABLONLARI: readonly FonksiyonSablonu[] = [
  { kimlik: 'dogrusal', label: 'Doğrusal: 2x + 1', expr: '2*x + 1' },
  { kimlik: 'parabol', label: 'Parabol: x² − 4', expr: 'x^2 - 4' },
  { kimlik: 'sinus', label: 'Sinüs: sin(x)', expr: 'sin(x)' },
  { kimlik: 'kosinus', label: 'Kosinüs: cos(x)', expr: 'cos(x)' },
  { kimlik: 'mutlak', label: 'Mutlak Değer: |x − 2|', expr: '|x-2|' },
  { kimlik: 'parametreli', label: 'Parametreli: ax² + b', expr: 'a*x^2 + b' },
  { kimlik: 'karekok', label: 'Karekök: √x', expr: 'sqrt(x)' },
  { kimlik: 'derece', label: 'Derece: sind(x)', expr: 'sind(x)' },
];

/** Ortaokulda sunulan şablonlar (uzmanın listesi). */
export const ORTAOKUL_SABLONLARI: readonly FonksiyonSablonu['kimlik'][] = ['dogrusal'];

export function fonksiyonSablonlari(duzey: KademeDuzeyi): readonly FonksiyonSablonu[] {
  if (duzey !== 'ortaokul') return FONKSIYON_SABLONLARI;
  return FONKSIYON_SABLONLARI.filter((s) => ORTAOKUL_SABLONLARI.includes(s.kimlik));
}

/** Pencerenin ipucu satırında trigonometri (sin radyan, sind derece) anlatılsın mı? Ortaokulda hayır. */
export const trigonometriIpucuGosterilir = (duzey: KademeDuzeyi): boolean => duzey !== 'ortaokul';
