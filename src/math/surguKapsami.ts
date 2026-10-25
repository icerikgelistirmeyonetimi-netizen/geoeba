import type { MathObject } from '@/types/math';

/**
 * Sürgülerin değişken adı → değer kapsamı: fonksiyon grafikleri ve ifadeler sürgü değişkenleriyle bununla
 * değerlendirilir. Aynı adlı iki sürgüde sırada sonraki geçerlidir.
 */
export function surguKapsami(nesneler: readonly MathObject[]): Record<string, number> {
  const kapsam: Record<string, number> = {};
  for (const n of nesneler) if (n.type === 'slider') kapsam[n.variableName] = n.value;
  return kapsam;
}
