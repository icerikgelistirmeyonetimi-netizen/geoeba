import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { LevelId } from '@/types/curriculum';
import { KademeAramaBosNotu, KademeSuzgeciSeridi } from '../KademeSuzgeci';

const oturum = vi.hoisted(() => ({ kademe: null as LevelId | null }));
vi.mock('@/state/OturumContext', () => ({ useOturum: () => oturum }));

describe('oturumda kademe süzgeci', () => {
  for (const kademe of ['ilkokul', 'ortaokul', 'lise'] as const) {
    it(`${kademe} oturumunda çalışmayacak tüm araçlar düğmesi sunulmaz`, () => {
      oturum.kademe = kademe;
      const serit = renderToStaticMarkup(<KademeSuzgeciSeridi duzey={kademe} onTumAraclar={() => {}} />);
      const arama = renderToStaticMarkup(<KademeAramaBosNotu arama="elips" duzey={kademe} suzgecGizledi onTumAraclar={() => {}} />);
      expect(serit).not.toContain('<button');
      expect(arama).not.toContain('<button');
      expect(serit).toContain('araçları');
      expect(arama).toContain('elips');
    });
  }
  it('oturum dışındaki eski serbest süzgeç davranışını korur', () => {
    oturum.kademe = null;
    expect(renderToStaticMarkup(<KademeSuzgeciSeridi duzey="ortaokul" onTumAraclar={() => {}} />)).toContain('Tüm araçlar');
    expect(renderToStaticMarkup(<KademeAramaBosNotu arama="elips" duzey="lise" suzgecGizledi onTumAraclar={() => {}} />)).toContain('Tüm araçları göster');
  });
});
