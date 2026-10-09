import type { MathObject } from '@/types/math';
import { runCommand } from './commands/engine';
import type { CommandResult, EngineOptions } from './commands/types';

export { normalizeCommand } from './commands/text';
export type { CommandResult, AppAction, EngineOptions } from './commands/types';
export { COMMAND_CATALOG } from './commands/handlers';

/** Arama önerileri ve anlam katmanı için temel örnekler. Tam liste için COMMAND_CATALOG. */
export const COMMAND_EXAMPLES = [
  'Üçgen çiz', '3 4 5 üçgeni olsun', 'A noktasının açısını yaz',
  'B noktasından dik indir', 'Yarıçapı 2 olan çember çiz',
  'B noktasından çembere teğet doğru çiz', 'Üçgen uzunluklarını kaydırıcıya bağla',
  'Üçgenin tüm kenarlarını ölç', 'Üçgenin alanını yaz',
  'A (2; 3) noktası oluştur', 'AB doğru parçası çiz', 'AB orta noktasını oluştur',
  'Kenar uzunluğu 4 olan kare çiz', '3 5 dikdörtgen çiz', '6 kenarlı düzgün çokgen çiz',
  'f(x) = x^2', 'ab = 4', 'Geri al',
  'Öklid üçgeni çiz', 'Pisagor şekli çiz', 'Tales teoremi şekli çiz', 'Tales çemberi çiz',
];

/** Türkçe çizim komutunu çevrimdışı çalıştırır; sahneyi değiştirmez, yeni sahneyi döndürür. */
export function executeTurkishCommand(raw: string, scene: MathObject[], selection: string[] = [], options: EngineOptions = {}): CommandResult {
  return runCommand(raw, scene, selection, options);
}
