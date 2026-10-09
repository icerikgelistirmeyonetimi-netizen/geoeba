import { describe, expect, it } from 'vitest';
import { searchableExamples, searchCommands } from '../commandSearch';
import { COMMAND_CATALOG, COMMAND_EXAMPLES, executeTurkishCommand, normalizeCommand } from '../turkishCommands';

describe('Turkish command suggestions', () => {
  it('matches Turkish characters and incomplete words', () => {
    expect(searchCommands('UCGEN')[0].text).toBe('Üçgen çiz');
    expect(searchCommands('kaydır').some(s => s.text.includes('kaydırıcıya'))).toBe(true);
  });
  it('corrects transposed letters while retaining dimensions and modification intent', () => {
    const found = searchCommands('3 4 5 üçgnei olsun')[0];
    expect(found.kind).toBe('correction');
    expect(found.text).toBe('3 4 5 üçgeni olsun');
    expect(executeTurkishCommand(found.text, []).ok).toBe(true);
  });
  it('offers common phrasing as an executable command', () => {
    expect(searchCommands('lütfen bir üçgen yap')[0].text).toBe('üçgen çiz');
  });
  it('does not replace entered measurements with example values', () => {
    expect(searchCommands('7 8 9 üçgen').every(s => !s.text.includes('3 4 5'))).toBe(true);
  });
  it('leaves coordinates, labels and formulas untouched', () => {
    expect(searchCommands('P (2,5; -3,2) noktası olşutur')[0].text).toBe('P (2,5; -3,2) noktası oluştur');
    expect(searchCommands('f(x) = sin(x)')).toEqual([]);
    expect(searchCommands('krae seç', { labels: ['krae'] }).some(s => s.kind === 'correction')).toBe(false);
  });
  it('does not suggest positive actions for negation or unrelated text', () => {
    expect(searchCommands('üçgen çizme')).toEqual([]);
    expect(searchCommands('üçgen istemiyorum')).toEqual([]);
    expect(searchCommands('hava durumu')).toEqual([]);
  });
  it('includes tool commands and history without duplicates', () => {
    const suggestions = searchCommands('elips', { examples: ['Elips aracını seç'], history: ['Elips aracını seç'] });
    expect(suggestions.filter(s => s.text === 'Elips aracını seç')).toEqual([{ text: 'Elips aracını seç', kind: 'history' }]);
  });
});

describe('Turkish command suggestions: protected words and stronger evidence', () => {
  const corrections = (raw: string, options?: Parameters<typeof searchCommands>[1]) => searchCommands(raw, options).filter(s => s.kind === 'correction');

  it.each([
    ['yay uzunluğunu ölç', /\byaz\b/],
    ['üçgenin alan ölç', /\bolan\b/],
    ['Pergel aracını seç', /alanını/],
    ['daire çiz', /çember/],
    ["ABC'nin alanını hesapla", /./],
    ['ab uzunluğu kaç', /./],
  ])('does not miscorrect “%s”', (raw, bad) => {
    expect(corrections(raw).filter(s => bad.test(s.text))).toEqual([]);
  });

  it('keeps the exact tool example first for “Pergel aracını seç”', () => {
    const found = searchCommands('Pergel aracını seç', { examples: ['Pergel aracını seç', 'Cetvel aracını seç'] });
    expect(found[0]).toEqual({ text: 'Pergel aracını seç', kind: 'example' });
  });

  it.each([
    ['dikdrotgen çiz', 'dikdörtgen çiz'],
    ['cemebr çiz', 'çember çiz'],
    ['Üçgnei çiz', 'Üçgeni çiz'],
    ['3 4 5 üçgnei olsun', '3 4 5 üçgeni olsun'],
  ])('still corrects a real typo: %s → %s', (raw, expected) => {
    expect(corrections(raw)[0]?.text).toBe(expected);
  });

  it('does not correct very short words or ambiguous near matches', () => {
    expect(corrections('kre çiz')).toEqual([]);
    expect(corrections('AB ışın çiz')).toEqual([]);
  });

  it('rewrites “yap” as “çiz” only after a shape noun', () => {
    expect(searchCommands('lütfen kare yap')[0]).toEqual({ text: 'kare çiz', kind: 'correction' });
    expect(corrections('lütfen ABC kırmızı yap').map(s => s.text)).toEqual(['ABC kırmızı yap']);
    expect(corrections("lütfen AB'nin uzunluğunu 5 yap").every(s => s.text.endsWith('5 yap'))).toBe(true);
  });

  it('keeps “bir” when it is a number and drops it when it is an article', () => {
    expect(corrections('lütfen yarıçapı bir olan çember çiz').map(s => s.text)).toEqual(['yarıçapı bir olan çember çiz']);
    expect(corrections('lütfen bir birim sağa kaydır').map(s => s.text)).toEqual(['bir birim sağa kaydır']);
    expect(corrections('bana bir kare çiz').map(s => s.text)).toEqual(['kare çiz']);
  });

  it('protects scene labels, uppercase labels and suffixes after an apostrophe', () => {
    expect(corrections("KRAE'nin alanını yaz")).toEqual([]);
    expect(corrections('krae alanını yaz', { labels: ['krae'] })).toEqual([]);
    expect(corrections("P'nın koordinatlarını göster")).toEqual([]);
  });

  it('suggests theorem commands and does not miscorrect theorem names', () => {
    expect(searchCommands('öklid üçg')[0].text).toBe('Öklid üçgeni çiz');
    expect(searchCommands('pisagor').some(s => s.text === 'Pisagor şekli çiz')).toBe(true);
    expect(searchCommands('tales çem').some(s => s.text === 'Tales çemberi çiz')).toBe(true);
    for (const raw of ['Öklid bağıntılarını göster', 'kesenler teoremini göster', 'Heron formülünü uygula', 'Stewart teoremini doğrula', 'Euler doğrusunu çiz', 'kuvvet teoremini göster', 'hipotenüsü 10 olan Öklid üçgeni çiz']) {
      expect(corrections(raw), raw).toEqual([]);
    }
  });

  it('treats words from history as known vocabulary', () => {
    expect(corrections('gönye aracını aç', { history: ['gönye aracını aç'] })).toEqual([]);
  });

  it('returns nothing for multi-line input, formulas and negations', () => {
    expect(searchCommands('üçgen çiz\nalanını göster')).toEqual([]);
    expect(searchCommands('a = 2')).toEqual([]);
    expect(searchCommands('üçgen çizmeyin')).toEqual([]);
    expect(searchCommands('çember olmasın')).toEqual([]);
  });

  it('never suggests a different number than the one typed', () => {
    for (const s of searchCommands('9 kenarlı düzgün çokgen çiz')) expect(s.text.match(/\d+/g) ?? ['9']).toContain('9');
  });

  it('builds its examples from COMMAND_EXAMPLES and the command catalog', () => {
    const examples = searchableExamples();
    expect(examples).toEqual(expect.arrayContaining(COMMAND_EXAMPLES));
    expect(examples).toEqual(expect.arrayContaining(COMMAND_CATALOG.flatMap(group => group.examples)));
  });

  it('finds every basic and catalog example when it is typed exactly', () => {
    const all = [...new Set([...COMMAND_EXAMPLES, ...COMMAND_CATALOG.flatMap(group => group.examples)])]
      .filter(example => !/[=\n]/.test(example) && normalizeCommand(example).length >= 2);
    const missing = all.filter(example => !searchCommands(example).some(s => normalizeCommand(s.text) === normalizeCommand(example)));
    expect(missing).toEqual([]);
  });
});
