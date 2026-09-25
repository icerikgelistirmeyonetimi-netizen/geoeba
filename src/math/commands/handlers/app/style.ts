import { DEFAULT_STYLE_SETTINGS, type StyleSettings } from '@/types/workspace';
import { type CommandScene, fail, skip, tidy, trNum } from '../../scene';
import type { Clause } from '../../text';
import type { CommandHandler } from '../../types';
import { OFF, ON, clamp, plainOf, refersToObjects, styleOf } from './shared';

type NumKey = 'fontScale' | 'pointRadius' | 'strokeScale' | 'pointLabelScale' | 'measurementScale' | 'axisScale';

/** Stil panelindeki kaydırıcıların sınırları ve adımları (StylePanel.tsx). */
const NUMERIC: { key: NumKey; re: RegExp; name: string; min: number; max: number; step: number; unit: string; example: string }[] = [
  { key: 'pointLabelScale', re: /\bnokta (?:ad|isim|etiket|yazi)\w*|\bkoordinat yazi\w*|(?<!olcum )\betiket(?:ler|leri|lerini|lerin)\b/, name: 'Nokta adı ve koordinat yazılarının ölçeği', min: 0.6, max: 2, step: 0.05, unit: '', example: 'nokta adlarını 1,5 kat büyüt' },
  { key: 'measurementScale', re: /\bolcum (?:kutu|yazi|etiket)\w*/, name: 'Ölçüm kutularının ölçeği', min: 0.6, max: 2, step: 0.05, unit: '', example: 'ölçüm yazılarını büyüt' },
  { key: 'axisScale', re: /\beksen (?:sayi|yazi|rakam|numara)\w*/, name: 'Eksen yazılarının ölçeği', min: 0.6, max: 2, step: 0.05, unit: '', example: 'eksen sayılarını büyüt' },
  { key: 'fontScale', re: /\b(?:tum |butun )?yazi(?:lar|lari|larin|larini)\b|\byazi (?:boyut|olce[kg]|buyuklug|tipi)\w*|\b(?:tum|butun) yazi\w*|\bharfler\w*|\bfont\w*/, name: 'Tüm yazıların ölçeği', min: 0.6, max: 2, step: 0.05, unit: '', example: 'yazı boyutunu 1,5 yap' },
  { key: 'pointRadius', re: /\bnokta(?:lar|lari|larin|larini)\b|\bnokta (?:boyut|buyuklug|yaricap|olcu)\w*|\bpivot\w*/, name: 'Nokta yarıçapı', min: 3, max: 14, step: 0.5, unit: ' piksel', example: 'nokta boyutunu 8 piksel yap' },
  { key: 'strokeScale', re: /\bcizgi(?:ler|leri|lerin|lerini|nin)?\b|\bcizgi kalinli[kg]\w*|\bkenar cizgi\w*|\bkalinli[kg]\w*/, name: 'Çizgi kalınlığı çarpanı', min: 0.5, max: 3, step: 0.1, unit: '', example: 'çizgi kalınlığını 2 yap' },
];

/** Yazı ölçekleri: 2'den büyük bir sayı piksel cinsinden yazı nesnesi boyutu demektir. */
const TEXT_SCALES: NumKey[] = ['fontScale', 'pointLabelScale', 'measurementScale', 'axisScale'];

const GROW = /\b(?:buyut\w*|buyuk\b|buyusun|art(?:t)?ir\w*|kalinlastir\w*|kalin\b|genislet\w*)/;
const SHRINK = /\b(?:kucult\w*|kucuk\b|azalt\w*|incelt\w*|ince\b|daralt\w*)/;
/** "yazılar çok küçük, büyüt": hem büyüt hem küçük geçiyorsa son sözcük (emir) belirler. */
const lastIndex = (text: string, re: RegExp) => Math.max(-1, ...[...text.matchAll(new RegExp(re.source, 'g'))].map(m => m.index!));
function direction(text: string): 'grow' | 'shrink' | undefined {
  const g = lastIndex(text, GROW), s = lastIndex(text, SHRINK);
  return g < 0 && s < 0 ? undefined : g > s ? 'grow' : 'shrink';
}
/** "çok büyüt", "çok daha küçük": "çok" yalnızca SON büyüt/küçült sözcüğünün hemen önündeyse güçlendirir ("yazılar çok küçük, büyüt" değil). */
const STRONG = {
  test(text: string): boolean {
    const i = Math.max(lastIndex(text, GROW), lastIndex(text, SHRINK));
    return i > 0 && /\bcok (?:daha )?$/.test(text.slice(0, i));
  },
};
const SET = /\b(?:yap|olsun|ayarla|getir|degistir)\w*|=/;
const RESET = /\b(?:normal|varsayilan|eski haline|sifirla)\w*/;

const FILLS = /\bdolgular\w*|\b(?:tum|butun)\b.*\bdolgu\w*|\bsekiller\w* (?:dolgu|ic)\w*|\bic(?:leri|lerini) (?:bos|doldur)\w*/;
const LABEL_BOXES = /\betiket kutu\w*|\bolcum kutu\w*|\byazi kutu\w*|\betiket(?:lerin)? arka plan\w*/;
const STYLE_RESET = /\bstil\w* (?:sifirla|varsayilan)\w*|\bvarsayilan stil\w*|\bstil ayar\w* sifirla\w*/;

type Plan =
  | { kind: 'reset' }
  | { kind: 'bool'; key: 'hideFills' | 'showLabelBoxes'; value: boolean }
  | { kind: 'numeric'; keys: NumKey[]; global: boolean };

/**
 * Çoğul ya da "tüm" ile yazılmışsa ayar kesin olarak geneldir ("yazıların boyutu", "tüm noktalar").
 * "yazı boyutunu 1,5 yap" gibi tekil yazımda tek bir yazı nesnesi de kastedilmiş olabilir; düzenleme ailesi önce gelir.
 */
// k→ğ yumuşaması: "kalınlık/kalınlığı", "ölçek/ölçeği"
const GLOBAL = /\b(?:tum|butun|stil\w*|olce[kg]\w*|pivot\w*|kalinli[kg]\w*)\b|\b(?:yazi|nokta|cizgi|harf|olcum|eksen|etiket|ad|isim)(?:ler|lar)\w*/;

function plan(c: Clause): Plan | null {
  if (refersToObjects(c) || c.quotes.length) return null;
  const text = plainOf(c);
  if (STYLE_RESET.test(text)) return { kind: 'reset' };
  const sized = GROW.test(text) || SHRINK.test(text) || (c.numbers.length > 0 && SET.test(text)) || /#\d+\s*kat/.test(c.text);
  if (LABEL_BOXES.test(text) && !sized) {
    if (OFF.test(text)) return { kind: 'bool', key: 'showLabelBoxes', value: false };
    if (ON.test(text)) return { kind: 'bool', key: 'showLabelBoxes', value: true };
  }
  if (FILLS.test(text)) {
    if (/\bbos\b/.test(text) || OFF.test(text)) return { kind: 'bool', key: 'hideFills', value: true };
    if (/\bdoldur\w*/.test(text) || ON.test(text)) return { kind: 'bool', key: 'hideFills', value: false };
  }
  // "kalınlığı normale döndür", "yazıları normale döndür", "çizgileri eski haline getir" (konum/koordinat sıfırlama değil)
  const reset = RESET.test(text) && (/\b(?:boyut|olce[kg]|kalinli[kg])\w*/.test(text) || GLOBAL.test(text)) && !/\b(?:koordinat|konum|yer)\w*/.test(text);
  if (!sized && !reset) return null;
  let rest = text;
  const keys: NumKey[] = [];
  for (const item of NUMERIC) {
    if (item.re.test(rest)) { keys.push(item.key); rest = rest.replace(new RegExp(item.re.source, 'g'), ' '); }
  }
  return keys.length ? { kind: 'numeric', keys, global: GLOBAL.test(text) } : null;
}

function nextValue(c: Clause, scene: CommandScene, item: (typeof NUMERIC)[number]): number {
  const text = plainOf(c);
  const current = styleOf(scene)[item.key];
  const dir = direction(text);
  const grow = dir === 'grow', shrink = dir === 'shrink';
  const kat = c.text.match(/#(\d+)\s*kat\w*/);
  const numberRef = c.text.match(/#(\d+)/);
  const n = numberRef ? c.num(numberRef[0]) : undefined;
  const snap = (v: number) => tidy(clamp(Math.round(v / item.step) * item.step, item.min, item.max));
  if (RESET.test(text) && n === undefined) return DEFAULT_STYLE_SETTINGS[item.key];
  if (kat) {
    const k = c.num(`#${kat[1]}`);
    if (!(k > 0 && k <= 10)) fail(`Kat 0 ile 10 arasında olmalı (ör. “${item.example}”).`);
    return snap(shrink ? current / k : current * k);
  }
  if (n !== undefined && !grow && !shrink) {
    // "yazıların boyutunu 20 yap" gibi piksel değerleri yazı nesnesinin boyutudur; başka aileye bırak.
    if (TEXT_SCALES.includes(item.key) && n > item.max && n <= 200) {
      skip(`${item.name} ${trNum(item.min)} ile ${trNum(item.max)} arasında bir çarpandır (ör. “${item.example}”). Bir yazı nesnesinin boyutunu değiştirmek için yazının adını ya da tırnak içindeki metnini belirtin.`);
    }
    if (!(n >= item.min && n <= item.max)) fail(`${item.name} ${trNum(item.min)} ile ${trNum(item.max)} arasında olmalı (ör. “${item.example}”).`);
    return snap(n);
  }
  if (n !== undefined) {
    if (!(n > 0 && n <= 100)) fail(`Değişim miktarı 0’dan büyük olmalı (ör. “${item.example}”).`);
    if (item.key === 'pointRadius') return snap(current + (shrink ? -n : n));
    return snap(shrink ? current / n : current * n);
  }
  if (item.key === 'pointRadius') return snap(current + (shrink ? -2 : 2));
  const factor = item.key === 'strokeScale' ? 1.5 : STRONG.test(text) ? 1.5 : 1.25;
  return snap(shrink ? current / factor : current * factor);
}

export const style: CommandHandler = {
  id: 'app.style',
  examples: ['yazıları büyüt', 'tüm yazıları küçült', 'tüm yazıların boyutunu 1,5 yap', 'noktaları küçült', 'noktaların boyutunu 8 piksel yap', 'çizgileri kalınlaştır', 'çizgi kalınlığını 2 yap',
    'dolguları kaldır', 'dolguları geri getir', 'etiket kutularını göster', 'stili sıfırla', 'nokta adlarını büyüt'],
  match(c) {
    const p = plan(c);
    if (!p) return 0;
    if (p.kind !== 'numeric' || p.global) return 91;
    // Noktaların tek tek boyutu yoktur: "nokta boyutunu 10 yap" her zaman genel nokta yarıçapıdır (düzenleme ailesinin önüne geçer).
    if (p.keys.every(k => k === 'pointRadius')) return 91;
    // "yazı boyutunu 1,5 yap": 0–2 arası bir sayı bir yazı nesnesinin punto boyutu olamaz; genel yazı ölçeğidir (düzenleme ailesinin önüne geçer).
    const scaleOnly = p.keys.every(k => TEXT_SCALES.includes(k)) && c.numbers.length > 0 && c.numbers.every(n => n > 0 && n <= 2)
      && !/\b(?:piksel|punto|px)\b/.test(plainOf(c));
    return scaleOnly ? 90 : 88;
  },
  run(c, scene) {
    const p = plan(c);
    if (!p) fail('Stil ayarı bulunamadı.');
    if (p.kind === 'reset') {
      scene.act({ kind: 'styleSettings', patch: { ...DEFAULT_STYLE_SETTINGS } });
      scene.say('Stil ayarları varsayılana döndürüldü (yazı, nokta ve çizgi boyutları, dolgular, etiket kutuları).');
      return;
    }
    if (p.kind === 'bool') {
      scene.act({ kind: 'styleSettings', patch: { [p.key]: p.value } });
      if (p.key === 'hideFills') scene.say(p.value ? 'Şekillerin dolguları kaldırıldı; yalnızca kenar çizgileri görünüyor.' : 'Şekillerin dolguları geri getirildi.');
      else scene.say(p.value ? 'Ölçüm etiketleri kutu içinde gösteriliyor.' : 'Ölçüm etiketlerinin kutuları kaldırıldı; yazılar düz metin görünüyor.');
      return;
    }
    const patch: Partial<StyleSettings> = {};
    const sentences: string[] = [];
    const current = styleOf(scene);
    for (const key of p.keys) {
      const item = NUMERIC.find(i => i.key === key)!;
      const value = nextValue(c, scene, item);
      patch[key] = value;
      if (value === current[key] && (value === item.max || value === item.min)) {
        sentences.push(`${item.name} zaten ${value === item.max ? 'en büyük' : 'en küçük'} değerde (${trNum(value)}${item.unit}).`);
      } else {
        sentences.push(`${item.name} ${trNum(value)}${item.unit} olarak ayarlandı.`);
      }
    }
    scene.act({ kind: 'styleSettings', patch });
    scene.say(sentences.join(' '));
  },
};
