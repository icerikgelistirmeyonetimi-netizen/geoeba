// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CIZIM_KIMLIGI, UYGULAMALAR, UygulamaHazirlaniyor, uygulamaBul } from '../uygulamalar';
import { manifest as veriGrafikManifesti } from '@/components/uygulamalar/veri-grafik/manifest';
import { manifest as olasilikManifesti } from '@/components/uygulamalar/olasilik/manifest';
import { manifest as veriGrafikIndex } from '@/components/uygulamalar/veri-grafik';
import { manifest as olasilikIndex } from '@/components/uygulamalar/olasilik';

const HEX = /^#[0-9a-f]{6}$/i;

describe('uygulama kayıt defteri', () => {
  it('üç uygulama, sabit sırada: Çizim Stüdyosu, Veri ve Grafik, Olasılık', () => {
    expect(UYGULAMALAR.map((u) => u.id)).toEqual([CIZIM_KIMLIGI, 'veri-grafik', 'olasilik']);
    expect(UYGULAMALAR.map((u) => u.kisaAd)).toEqual(['Çizim Stüdyosu', 'Veri ve Grafik', 'Olasılık']);
    expect(UYGULAMALAR[0].ad).toBe('Serbest Çizim Stüdyosu');
  });

  it('her kayıt sözleşmeye uyar (kimlik, adlar, açıklama, ada rengi, simge, bileşen)', () => {
    const kimlikler = new Set<string>();
    for (const u of UYGULAMALAR) {
      expect(u.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(kimlikler.has(u.id)).toBe(false);
      kimlikler.add(u.id);
      expect(u.ad.length).toBeGreaterThan(2);
      expect(u.kisaAd.length).toBeGreaterThan(2);
      expect(u.aciklama.length).toBeGreaterThan(5);
      expect(u.renk).toMatch(HEX);
      expect(React.isValidElement(u.simge)).toBe(true);
      expect(typeof u.Bilesen === 'function' || typeof u.Bilesen === 'object').toBe(true);
    }
    // Menü çubuğu yalnız Çizim Stüdyosu'nda (WorkspaceMenuBar başlık çubuğuna girer)
    expect(UYGULAMALAR.filter((u) => u.MenuCubugu).map((u) => u.id)).toEqual([CIZIM_KIMLIGI]);
  });

  it('simgeler 24×24 satır içi SVG, currentColor ile boyanır', () => {
    for (const u of UYGULAMALAR) {
      const html = renderToStaticMarkup(<>{u.simge}</>);
      expect(html.startsWith('<svg')).toBe(true);
      expect(html).toContain('viewBox="0 0 24 24"');
      expect(html).toContain('currentColor');
      expect(html).toContain('aria-hidden="true"');
    }
  });

  it('manifestler uygulama klasörlerinden gelir; index.tsx aynı manifesti yeniden dışa aktarır', () => {
    expect(uygulamaBul('veri-grafik')?.ad).toBe(veriGrafikManifesti.ad);
    expect(uygulamaBul('olasilik')?.ad).toBe(olasilikManifesti.ad);
    expect(veriGrafikIndex).toBe(veriGrafikManifesti);
    expect(olasilikIndex).toBe(olasilikManifesti);
    expect(uygulamaBul('yok')).toBeUndefined();
  });

  it('"hazırlanıyor" yükleyicisi uygulama adını yazar ve durum rolü taşır', () => {
    const html = renderToStaticMarkup(<UygulamaHazirlaniyor ad="Olasılık" />);
    expect(html).toContain('role="status"');
    expect(html).toContain('Olasılık hazırlanıyor…');
    expect(html).toContain('eba-karakter-animasyon.svg');
    expect(renderToStaticMarkup(<UygulamaHazirlaniyor />)).toContain('Hazırlanıyor…');
  });
});
