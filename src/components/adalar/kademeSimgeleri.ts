import { Backpack, BookOpen, GraduationCap, type LucideIcon } from 'lucide-react';
import type { LevelId } from '@/types/curriculum';

/**
 * Kademelerin simgeleri (oturum açma ekranındaki hesap avatarları, araç panelindeki kademe rozeti).
 * Renkler ve adlar adaEslemeleri KADEME_ADALARI'ndan gelir; simge de burada tek kaynaktır.
 */
export const KADEME_SIMGELERI: Record<LevelId, LucideIcon> = {
  ilkokul: Backpack,
  ortaokul: BookOpen,
  lise: GraduationCap,
};
