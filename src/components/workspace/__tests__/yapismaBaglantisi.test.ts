import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * YAP3B bağlantısı (kaynak okuyarak, araclar3bTutarlilik kalıbı): Mıknatıs yalnız cisim taşıma sürüklemesine bağlı,
 * Alt ile geçici kapanır; 2B nesne taşıma (moveMath), etiket kodu ve Interaction türü değişmez.
 */
const KOK = path.resolve(__dirname, '..');
const kaynak = readFileSync(path.join(KOK, 'Canvas3D.tsx'), 'utf8');

/** `baslangic` satırından sonraki ilk dengeli { ... } bloğu */
function blok(baslangic: string): string {
  const i = kaynak.indexOf(baslangic);
  if (i < 0) throw new Error(`bulunamadı: ${baslangic}`);
  const j = kaynak.indexOf('{', i + baslangic.length - 1);
  let derinlik = 0;
  for (let k = j; k < kaynak.length; k++) {
    if (kaynak[k] === '{') derinlik++;
    else if (kaynak[k] === '}' && --derinlik === 0) return kaynak.slice(i, k + 1);
  }
  throw new Error('blok kapanmadı');
}

describe('Canvas3D Mıknatıs bağlantısı', () => {
  it('yapistir( yalnız cisim taşıma (move) dalında ve Alt ile çağrılır; moveMath dalında yok', () => {
    expect(kaynak.match(/yapistir\(/g)).toHaveLength(1);
    const move = blok("if (it.type === 'move') {");
    expect(move).toContain('yapistir(');
    expect(move).toMatch(/geciciKapali: e\.altKey/);
    const moveMath = blok("if (it.type === 'moveMath') {");
    expect(moveMath).not.toMatch(/yapis/);
  });

  it('köşe düğmesi (aria-label="Mıknatıs", aria-pressed) var', () => {
    expect(kaynak).toContain('aria-label="Mıknatıs"');
    expect(kaynak).toMatch(/aria-pressed=\{yapisma3B\.acik\}/);
  });

  it('etiket kodu (getTextTexture, makeLabelSprite) ve Interaction birliği yapışmaya dokunmaz', () => {
    expect(blok('function getTextTexture(')).not.toMatch(/yapis|kilavuz/i);
    expect(blok('function makeLabelSprite(')).not.toMatch(/yapis|kilavuz/i);
    const birlik = kaynak.slice(kaynak.indexOf('type Interaction ='), kaynak.indexOf('function SayiGirisi('));
    expect(birlik.length).toBeGreaterThan(500);
    expect(birlik).not.toMatch(/yapis/i);
  });

  it('kılavuz taşıma bitince (interaction move değilse) temizlenir', () => {
    expect(kaynak).toMatch(/if \(interaction\?\.type === 'move'\) return;[\s\S]{0,300}kilavuzuTemizle\(kilavuzRef\.current\)/);
  });
});
