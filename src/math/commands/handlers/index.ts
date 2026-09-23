import type { CommandHandler } from '../types';
import * as app from './app';
import * as edit from './edit';
import * as transforms from './transforms';
import * as constructions from './constructions';
import * as measure from './measure';
import * as polygons from './polygons';
import * as circles from './circles';
import * as basic from './basic';
import * as algebra from './algebra';
import * as conics from './conics';
import * as esitlik from './esitlik';
import * as birlestir from './birlestir';

const MODULES = [app, edit, birlestir, transforms, constructions, measure, polygons, conics, circles, basic, algebra, esitlik];

/** Tüm komut aileleri. Eşit puanda bu sıra geçerlidir. */
export const HANDLERS: CommandHandler[] = MODULES.flatMap(m => m.handlers);

/** Yardım paneli için başlıklı örnek listesi. */
export const COMMAND_CATALOG: { id: string; title: string; examples: string[] }[] = MODULES.map(m => ({
  id: m.family.id,
  title: m.family.title,
  examples: [...new Set(m.handlers.flatMap(h => h.examples))],
})).filter(group => group.examples.length > 0);
