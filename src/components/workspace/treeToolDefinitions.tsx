import React from 'react';
import { ToolMode } from '@/types/workspace';
import { ARAC_GRUPLARI, ARAC_KATEGORI_RENKLERI } from './toolDefinitions';

export interface TreeToolItem {
  id: ToolMode | 'add_object';
  name: string;
  description: string;
  icon: React.ReactNode;
  /** Kategori simge rengi (ARAC_KATEGORI_RENKLERI) — 2D araç listesiyle aynı. */
  iconColor: string;
}

export interface TreeToolGroup {
  id: string;
  name: string;
  defaultExpanded?: boolean;
  tools: TreeToolItem[];
}

/** Ağaç liste: toolDefinitions.ARAC_GRUPLARI'dan (panel listesiyle aynı kayıt); ağaçta simge zemini kullanılmaz. */
export const TREE_TOOL_GROUPS: TreeToolGroup[] = ARAC_GRUPLARI.map((grup) => ({
  id: grup.agacKimligi,
  name: grup.groupName,
  defaultExpanded: grup.acik,
  tools: grup.tools.map(({ id, name, description, agacAciklamasi, icon, kategori }) => ({
    id,
    name,
    description: agacAciklamasi ?? description,
    icon,
    iconColor: ARAC_KATEGORI_RENKLERI[kategori],
  })),
}));
