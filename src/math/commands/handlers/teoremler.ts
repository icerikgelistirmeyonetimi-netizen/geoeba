import type { CommandHandler } from '../types';
import { handlers as oklid } from './teoremler/oklid';
import { handlers as tales } from './teoremler/tales';
import { handlers as ucgenBagintilari } from './teoremler/ucgenBagintilari';
import { handlers as ucgenCemberleri } from './teoremler/ucgenCemberleri';
import { handlers as cemberTeoremleri } from './teoremler/cemberTeoremleri';

export const family = { id: 'teoremler', title: 'Teoremler ve klasik şekiller' };

/**
 * Teoremler ve klasik şekiller: geometri literatüründeki adlı şekiller ve bağıntılar.
 *  - oklid:            Öklid üçgeni ve Öklid bağıntıları, Pisagor şekli ve bağıntısı
 *  - tales:            Tales teoremi (kesen–paralel şekilleri), Tales çemberi, orta taban (üçgen ve yamuk)
 *  - ucgenBagintilari: açıortay, kenarortay, Stewart, Ceva, Menelaus, sinüs / kosinüs teoremi, Heron, üçgen eşitsizliği
 *  - ucgenCemberleri:  dış teğet çember, Euler doğrusu, dokuz nokta çemberi
 *  - cemberTeoremleri: kiriş, çap, kesen, çevre açı, teğet-kiriş açısı, merkez açı–çevre açı, kuvvet, ortak teğetler
 * Puanlar ve ortak yardımcılar: teoremler/ortak.ts.
 */
export const handlers: CommandHandler[] = [
  ...oklid,
  ...tales,
  ...ucgenBagintilari,
  ...ucgenCemberleri,
  ...cemberTeoremleri,
];
