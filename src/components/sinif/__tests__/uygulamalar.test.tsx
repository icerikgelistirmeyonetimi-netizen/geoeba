// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CIZIM_KIMLIGI, ILKOKULDA_GIZLI_UYGULAMALAR, UYGULAMALAR, UygulamaHazirlaniyor, kademeninUygulamalari, uygulamaBul } from '../uygulamalar';
import { manifest as veriGrafikManifesti } from '@/components/uygulamalar/veri-grafik/manifest';
import { ilkokulManifesti as olasilikIlkokulManifesti, manifest as olasilikManifesti } from '@/components/uygulamalar/olasilik/manifest';
import { manifest as veriGrafikIndex } from '@/components/uygulamalar/veri-grafik';
import { manifest as olasilikIndex } from '@/components/uygulamalar/olasilik';
import { manifest as algoritmaManifesti } from '@/components/uygulamalar/algoritma/manifest';
import { manifest as algoritmaIndex } from '@/components/uygulamalar/algoritma';
import { useIlkokulKipi } from '@/hooks/useKademeDuzeyi';

vi.mock('@/hooks/useKademeDuzeyi', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/hooks/useKademeDuzeyi')>(),
  useIlkokulKipi: vi.fn(() => false),
}));

const HEX = /^#[0-9a-f]{6}$/i;

describe('uygulama kayıt defteri', () => {
  it('dört uygulama, sabit sırada: Çizim Stüdyosu, Veri ve Grafik, Olasılık, Algoritma', () => {
    expect(UYGULAMALAR.map((u) => u.id)).toEqual([CIZIM_KIMLIGI, 'veri-grafik', 'olasilik', 'algoritma']);
    expect(UYGULAMALAR.map((u) => u.kisaAd)).toEqual(['Çizim Stüdyosu', 'Veri ve Grafik', 'Olasılık', 'Algoritma']);
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
    expect(uygulamaBul('algoritma')?.ad).toBe(algoritmaManifesti.ad);
    expect(algoritmaIndex).toBe(algoritmaManifesti);
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

describe('ilkokul kademesi (alan uzmanları, 2. ve 4. tur)', () => {
  it('Olasılık Laboratuvarı ilkokulda da masaüstünde (4. tur, satır 183: «olay kartları» kipi, MAT.4.4.1); sıra korunur', () => {
    expect(ILKOKULDA_GIZLI_UYGULAMALAR).toEqual([]);
    expect(kademeninUygulamalari('ilkokul').map((u) => u.id)).toEqual([CIZIM_KIMLIGI, 'veri-grafik', 'olasilik', 'algoritma']);
  });

  it('ilkokulda Olasılık kısayolunun açıklaması ve simgesi olay kartlarını anlatır: sayı, yüzde, sayı küpü yok', () => {
    const o = kademeninUygulamalari('ilkokul').find((u) => u.id === 'olasilik');
    expect(o?.aciklama).toBe(olasilikIlkokulManifesti.aciklama);
    expect(o?.aciklama).toMatch(/imkânsız, olabilir ya da kesin/);
    expect(o?.aciklama).not.toMatch(/[0-9%]|teorik|deneysel|öznel|sayı küpü|zar/i);
    expect(o?.simge).toBe(olasilikIlkokulManifesti.simge);
    const html = renderToStaticMarkup(<>{o?.simge}</>);
    expect(html).not.toContain('<text');
    // Ad, renk ve gövde aynı: kademe değişince pencere yeniden kurulmaz, uygulama içi kip değişir
    const genel = uygulamaBul('olasilik');
    expect(o?.ad).toBe(genel?.ad);
    expect(o?.renk).toBe(genel?.renk);
    expect(o?.Bilesen).toBe(genel?.Bilesen);
    // Açıklamalar uyarlanırken gövde bileşenleri korunur.
    for (const u of kademeninUygulamalari('ilkokul')) expect(u.Bilesen).toBe(uygulamaBul(u.id)?.Bilesen);
    expect(kademeninUygulamalari('ilkokul').find((u) => u.id === 'algoritma')?.ad).toBe('Algoritma');
  });

  it('ilkokul açıklamaları çizim ve veri araçlarının bu oturumdaki kapsamını anlatır', () => {
    const liste = kademeninUygulamalari('ilkokul');
    expect(liste.find((u) => u.id === CIZIM_KIMLIGI)?.aciklama).toBe('Şekilleri çiz, ölç ve geometrik cisimleri keşfet.');
    expect(liste.find((u) => u.id === veriGrafikManifesti.id)?.aciklama).toBe('Nesne ve şekil grafikleri oluştur; çetele ve sıklık tablolarını incele.');
  });

  it('algoritma yükleyicisi etkin oturumun adını kullanır', () => {
    const Bilesen = uygulamaBul('algoritma')!.Bilesen;
    try {
      vi.mocked(useIlkokulKipi).mockReturnValue(true);
      expect(renderToStaticMarkup(<Bilesen />)).toContain('Algoritma hazırlanıyor…');
      vi.mocked(useIlkokulKipi).mockReturnValue(false);
      expect(renderToStaticMarkup(<Bilesen />)).toContain('Algoritma hazırlanıyor…');
    } finally {
      vi.mocked(useIlkokulKipi).mockReturnValue(false);
    }
  });

  it('ortaokulda tüm uygulamalar, lisede Algoritma dışındaki uygulamalar gösterilir', () => {
    expect(kademeninUygulamalari('ortaokul')).toBe(UYGULAMALAR);
    expect(kademeninUygulamalari('lise').map((u) => u.id)).toEqual([CIZIM_KIMLIGI, 'veri-grafik', 'olasilik']);
    expect(uygulamaBul('olasilik')?.aciklama).toBe('Sınıfını seç; olasılığı o sınıfın yaklaşımıyla (öznel, deneysel, teorik) 3B deneylerle incele.');
  });

  it('Olasılık simgesi sayı küpü: yüzünde nokta değil rakam (kullanıcı isteği 13.10)', () => {
    const html = renderToStaticMarkup(<>{olasilikManifesti.simge}</>);
    expect(html).toMatch(/<text[^>]*>3<\/text>/);
    expect(html).not.toContain('<circle');
  });
});
