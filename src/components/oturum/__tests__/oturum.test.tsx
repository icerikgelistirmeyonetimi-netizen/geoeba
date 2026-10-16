import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OturumProvider } from '@/state/OturumContext';
import { OturumEkrani } from '../OturumEkrani';
import { CurriculumProvider } from '@/state/CurriculumContext';
import HomePage from '@/app/page';
import { SinifEkrani } from '@/components/sinif/SinifEkrani';

afterEach(() => vi.unstubAllGlobals());

describe('kademe oturumu', () => {
  it('ilk açılışta adalar görünür; oturum sağlayıcısı ana sayfayı kapatmaz', () => {
    const html = renderToStaticMarkup(<OturumProvider><CurriculumProvider><HomePage /></CurriculumProvider></OturumProvider>);
    expect(html).toContain('Matematik Takımadaları');
    expect(html).not.toContain('data-oturum-ekrani');
    expect(html).not.toContain('data-sinif-ekrani');
  });

  it('sınıf yüklenirken oturum seçimi veya masaüstü erkenden açılmaz', () => {
    const html = renderToStaticMarkup(<OturumProvider><SinifEkrani onAnaSayfa={() => {}} /></OturumProvider>);
    expect(html).toContain('data-ekran-katmani');
    expect(html).toContain('data-faz="yukleniyor"');
    expect(html).not.toContain('data-oturum-ekrani');
    expect(html).not.toContain('Masaüstü kısayolları');
  });

  it('tahta ekranında üç oturum ve adalara dönüş sunulur', () => {
    const html = renderToStaticMarkup(<OturumEkrani onOturumAc={() => {}} onAdalaraDon={() => {}} />);
    for (const kademe of ['İlkokul', 'Ortaokul', 'Lise']) expect(html).toContain(`${kademe} oturumu aç`);
    expect(html.match(/data-oturum-sec=/g)).toHaveLength(3);
    expect(html).toContain('Adalara dön');
    expect(html).not.toContain('data-kapaniyor');
  });

  it('hesap seçilince hesaplar kapanış durumunda kalır; seçilen "Oturum açılıyor…" der, hiçbiri tıklanamaz', () => {
    const html = renderToStaticMarkup(<OturumEkrani onOturumAc={() => {}} kapaniyor secilen="lise" />);
    expect(html).toContain('data-kapaniyor="true"');
    expect(html.match(/data-oturum-sec=/g)).toHaveLength(3);
    expect(html.match(/Oturum açılıyor…/g)).toHaveLength(1);
    expect(html).toContain('aria-busy="true"');
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });

  it('aktif oturumu yerel tercih ya da diğer sekme değiştiremez; çıkıştan sonra yeni kademe seçilebilir', async () => {
    vi.resetModules();
    const dinleyiciler: ((e: { key: string; newValue: string }) => void)[] = [];
    vi.stubGlobal('window', { localStorage: { setItem: vi.fn(), getItem: () => 'lise' }, addEventListener: (_: string, cb: typeof dinleyiciler[number]) => dinleyiciler.push(cb), removeEventListener: vi.fn() });
    const d = await import('@/hooks/useKademeDuzeyi');
    d.oturumKademesiniAyarla('ilkokul');
    d.kademeDuzeyineAbone(() => {});
    d.kademeDuzeyiniAyarla('tum');
    dinleyiciler[0]({ key: 'geoeba_kademe_duzeyi_v1', newValue: 'lise' });
    expect(d.kademeDuzeyiniOku()).toBe('ilkokul');
    d.oturumKademesiniAyarla(null);
    d.oturumKademesiniAyarla('ortaokul');
    expect(d.kademeDuzeyiniOku()).toBe('ortaokul');
    d.oturumKademesiniAyarla(null);
  });

});
