import type { AppAction } from '../../types';
import { fail } from '../../scene';
import type { Clause } from '../../text';
import { NOUNS, type NounKind } from '../../text';
import type { CommandHandler } from '../../types';
import { actOnce, plainOf } from './shared';
import { type ToolInfo, TOOLS, findTool } from './tools';

/** "… aracını seç / aç / getir / kullan", "… aracına geç" */
const TOOL_WORD = /\barac(?:i|ini|ina|imi|lari|larini|tan|indan)?\b/;
const TOOL_WITH = /\barac(?:iyla|i ile|la|imla)\b/;
const OPEN_VERB = /\b(?:sec|ac|getir|kullan|gec|al|ver|etkinlestir|cikar|goster|istiyorum|lazim|gerek)\w*/;
const CREATE_VERB = /\b(?:ciz|olustur|yap|ekle)\w*/;
/** "fonksiyon yazma ekranı": "ekran" yalnızca pencere adıyla birlikte pencere demektir ("ekranı temizle" değil). */
const DIALOG_WORD = /\b(?:pencere|diyalog|dialog)\w*|\b(?:fonksiyon|grafik|kaydirici|surgu|duzgun cokgen|yaricap)\w*(?: [a-z]+)? ekran\w*/;
/** "kalem aracını kapat", "pergeli bırak", "araçtan çık": etkin araç bırakılır, Seç ve Taşı aracına dönülür. */
const CLOSE_VERB = /\b(?:kapat\w*|birak\w*|cik(?!ar)\w*|vazgec\w*)/;

interface ToolHit { tool?: ToolInfo; score: number; close?: boolean; removed?: boolean }

const SELECT_TOOL = () => TOOLS.find(t => t.id === 'select')!;

/**
 * Ölçme araçları çizim nesnesi değildir: "cetveli sil", "iletkiyi kaldır", "alan modelini gizle" aracı tuvalden
 * kaldırır (Seç ve Taşı'ya dönülür); seçili çizim SİLİNMEZ. Silme ailesinin (90) önüne geçsin diye 94.
 */
const INSTRUMENTS: [RegExp, string][] = [
  [/\bcetvel\w*/g, 'ruler'],
  [/\bgonye\w*/g, 'setsquare'],
  [/\baci ?olcer\w*|\biletki\w*|\bminkale\w*/g, 'measure_angle'],
  [/\balani? model\w*/g, 'area_model'],
];
const REMOVE_VERB = /\b(?:sil(?!gi)\w*|kaldir\w*|gizle\w*|kapat\w*|yok et\w*)/;
const OTHER_NOUNS: NounKind[] = ['point', 'segment', 'line', 'ray', 'circle', 'arc', 'sector', 'angle', 'triangle', 'square', 'rectangle', 'polygon', 'text'];

function instrumentRemoval(c: Clause, text: string): ToolHit | null {
  if (c.labels.length || !REMOVE_VERB.test(text)) return null;
  const hit = INSTRUMENTS.find(([re]) => text.search(re) >= 0);
  if (!hit) return null;
  // "cetvelden eklenen parçayı sil": başka bir nesne adı varsa silme ailesinindir
  const rest = INSTRUMENTS.reduce((t, [re]) => t.replace(re, ' '), text);
  if (OTHER_NOUNS.some(k => NOUNS[k].test(rest))) return null;
  const tool = TOOLS.find(t => t.id === hit[1]);
  return tool ? { tool, score: 94, close: true, removed: true } : null;
}

function detect(c: Clause): ToolHit {
  const text = plainOf(c);
  if (DIALOG_WORD.test(text)) return { score: 0 };
  if (TOOL_WITH.test(text)) return { score: 0 };
  const removal = instrumentRemoval(c, text);
  if (removal) return removal;
  const explicit = text.match(TOOL_WORD);
  if (explicit) {
    const before = text.slice(0, explicit.index).trim();
    const tool = findTool(before) ?? findTool(text.slice(explicit.index! + explicit[0].length));
    if (CLOSE_VERB.test(text) && !OPEN_VERB.test(text)) return { tool: tool ?? SELECT_TOOL(), score: 92, close: true };
    if (tool) return { tool, score: 92 };
    return OPEN_VERB.test(text) || text === explicit[0] ? { score: 86 } : { score: 0 };
  }
  // Tek sözcük "Seç": "Seç ve Taşı aracını seç" iki cümleye bölünür.
  if (text === 'sec' || text === 'sec ve tasi') return { tool: TOOLS.find(t => t.id === 'select'), score: 93 };
  if (c.labels.length) return { score: 0 };
  const bare = findTool(text, true);
  if (bare) {
    const others = c.hasNoun('circle', 'arc', 'sector', 'segment', 'line', 'triangle', 'polygon', 'square', 'rectangle', 'angle', 'text');
    if (CREATE_VERB.test(text) && others) return { score: 0 };
    if (CLOSE_VERB.test(text) && !OPEN_VERB.test(text)) return { tool: bare, score: 88, close: true };
    if (OPEN_VERB.test(text)) return { tool: bare, score: 88 };
    // "kalemle serbest çizim yap": kalem/görsel oluşturma cebir ailesinindir (yedek bant); biz daha düşük kalırız.
    if (CREATE_VERB.test(text)) return { tool: bare, score: 11 };
    return { tool: bare, score: 12 };
  }
  // "Trig. Oranlar aracını seç" noktadan bölünür: ilk parça "Trig" tek başına kalır.
  if (/^trig(?:onometrik)?(?: oran\w*)?$/.test(text)) return { tool: TOOLS.find(t => t.id === 'trig_ratios'), score: 12 };
  // "trig oranlar", "trigonometrik oranları aç": nesne adı yoksa ölçüm değil araç açma
  if (/\btrig\w*/.test(text) && /\b(?:sec|ac|getir|kullan)\w*/.test(text) && !/\bgoster|\bhesapla|\bolc|\byaz/.test(text)) {
    return { tool: TOOLS.find(t => t.id === 'trig_ratios'), score: 88 };
  }
  return { score: 0 };
}

/** WorkspaceView.activateTool ile aynı: fonksiyon ve kaydırıcı yalnız pencere açar, düzgün çokgen araç + pencere. */
export function toolActions(tool: ToolInfo): AppAction[] {
  if (tool.id === 'function') return [{ kind: 'openDialog', dialog: 'function' }];
  if (tool.id === 'slider') return [{ kind: 'openDialog', dialog: 'slider' }];
  if (tool.id === 'regular_polygon') return [{ kind: 'selectTool', tool: 'regular_polygon' }, { kind: 'openDialog', dialog: 'regularPolygon' }];
  return [{ kind: 'selectTool', tool: tool.id }];
}

export const toolSelect: CommandHandler = {
  id: 'app.tool',
  examples: ['Elips aracını seç', 'Uzunluk Ölç (cm) aracını seç', 'trig oranlar aracını aç', 'açıölçer aracını seç', 'açı ölçeri aç', 'pergeli aç', 'kalemi aç',
    'cetveli getir', 'gönyeyi getir', 'cetveli kaldır', 'silgiyi seç', 'Seç ve Taşı aracını seç', 'Düzgün Çokgen aracını seç', 'Fonksiyon aracını seç', 'orta dikme aracına geç'],
  match(c) { return detect(c).score; },
  run(c, scene) {
    const { tool, close, removed } = detect(c);
    if (!tool) {
      const names = TOOLS.slice(0, 8).map(t => t.name).join(', ');
      fail(`Bu adda bir araç bulamadım. Araç adını yazın; örneğin “Elips aracını seç” ya da “Pergel aracını aç” (araçlar: ${names}…).`);
    }
    if (close) {
      actOnce(scene, { kind: 'selectTool', tool: 'select' });
      scene.say(
        tool.id === 'select'
          ? 'Seç ve Taşı aracına geçildi.'
          : removed
          ? `${tool.name} tuvalden kaldırıldı; Seç ve Taşı aracına geçildi.`
          : `${tool.name} aracı bırakıldı; Seç ve Taşı aracına geçildi.`
      );
      return;
    }
    const added = toolActions(tool).map(a => actOnce(scene, a)).some(Boolean);
    if (!added) return;
    if (tool.id === 'function' || tool.id === 'slider') scene.say(`${tool.name} penceresi açıldı. ${tool.description}`);
    else scene.say(`${tool.name} aracı açıldı. ${tool.description}`);
  },
};

const DIALOGS: { re: RegExp; action: AppAction; name: string }[] = [
  { re: /\b(?:duzgun cokgen)\w*/, action: { kind: 'openDialog', dialog: 'regularPolygon' }, name: 'Düzgün çokgen' },
  { re: /\byaricap\w*/, action: { kind: 'openDialog', dialog: 'circleRadius' }, name: 'Yarıçapla çember' },
  { re: /\b(?:fonksiyon|grafik)\w*/, action: { kind: 'openDialog', dialog: 'function' }, name: 'Fonksiyon' },
  { re: /\b(?:kaydirici|surgu|parametre)\w*/, action: { kind: 'openDialog', dialog: 'slider' }, name: 'Kaydırıcı' },
];

export const dialog: CommandHandler = {
  id: 'app.dialog',
  examples: ['Fonksiyon penceresini aç', 'Kaydırıcı penceresini aç', 'Düzgün çokgen penceresini aç', 'Yarıçapla çember penceresini aç', 'grafik penceresini aç', 'kaydırıcı penceresini göster'],
  match(c) {
    const text = plainOf(c);
    if (!DIALOG_WORD.test(text) || c.labels.length) return 0;
    if (CLOSE_VERB.test(text)) return 92;
    return DIALOGS.some(d => d.re.test(text)) ? 92 : /\b(?:ac|getir|goster)\w*/.test(text) ? 86 : 0;
  },
  run(c, scene) {
    const text = plainOf(c);
    if (CLOSE_VERB.test(text)) fail('Açık pencereyi yazılı komutla kapatamıyorum. Pencerenin köşesindeki × (Kapat) ya da İptal düğmesini kullanın.');
    const found = DIALOGS.find(d => d.re.test(text));
    if (!found) fail('Hangi pencereyi açayım? Fonksiyon, kaydırıcı, düzgün çokgen ya da yarıçapla çember penceresi açılabilir (ör. “Fonksiyon penceresini aç”).');
    if (found.action.kind === 'openDialog' && found.action.dialog === 'regularPolygon') actOnce(scene, { kind: 'selectTool', tool: 'regular_polygon' });
    actOnce(scene, found.action);
    scene.say(`${found.name} penceresi açıldı.`);
  },
};
