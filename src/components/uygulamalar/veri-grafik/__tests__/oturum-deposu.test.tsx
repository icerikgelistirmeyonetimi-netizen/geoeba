import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LevelId } from '@/types/curriculum';

const oturum = vi.hoisted(() => ({ kademe: null as LevelId | null }));
vi.mock('@/state/OturumContext', () => ({ useOturum: () => ({ kademe: oturum.kademe, oturumuKapat: () => {} }) }));
vi.mock('@/hooks/useKademeDuzeyi', () => ({ useKademeDuzeyi: () => [oturum.kademe ?? 'ortaokul', () => {}] }));

import VeriGrafikUygulamasi, { DEPO_ANAHTARI } from '../index';
import { baslangicDurumu } from '../durum';
import { tabloOlustur } from '../veri';
import { oturumKayitAnahtari } from '@/state/oturumDeposu';

function kayit(etiket: string): string {
  return JSON.stringify({ ...baslangicDurumu(), ornekId: null, tablo: tabloOlustur(['Etiket', 'Değer'], [[etiket, 12]]) });
}
function pencere(kayitlar: Record<string, string>) {
  const getItem = vi.fn((key: string) => kayitlar[key] ?? null);
  const setItem = vi.fn();
  const removeItem = vi.fn();
  vi.stubGlobal('window', { localStorage: { getItem, setItem, removeItem } });
  return { getItem, setItem, removeItem };
}
const ciz = () => renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1366} />);
afterEach(() => { vi.unstubAllGlobals(); oturum.kademe = null; });

describe('Veri ve Grafik oturum kaydı', () => {
  it.each(['ilkokul', 'ortaokul', 'lise'] as const)('%s oturumu yalnız kendi kaydını açar', kademe => {
    oturum.kademe = kademe;
    const depo = pencere({
      [DEPO_ANAHTARI]: kayit('ORTAK_KAYIT'),
      [oturumKayitAnahtari(DEPO_ANAHTARI, 'ilkokul')]: kayit('ILKOKUL_KAYDI'),
      [oturumKayitAnahtari(DEPO_ANAHTARI, 'ortaokul')]: kayit('ORTAOKUL_KAYDI'),
      [oturumKayitAnahtari(DEPO_ANAHTARI, 'lise')]: kayit('LISE_KAYDI'),
    });
    const html = ciz();
    const etiketler = { ilkokul: 'ILKOKUL_KAYDI', ortaokul: 'ORTAOKUL_KAYDI', lise: 'LISE_KAYDI' };
    expect(html).toContain(etiketler[kademe]);
    expect(html).not.toContain('ORTAK_KAYIT');
    for (const diger of ['ilkokul', 'ortaokul', 'lise'] as const) if (diger !== kademe) expect(html).not.toContain(etiketler[diger]);
    expect(depo.getItem).toHaveBeenCalledWith(oturumKayitAnahtari(DEPO_ANAHTARI, kademe));
    expect(depo.getItem).not.toHaveBeenCalledWith(DEPO_ANAHTARI);
    expect(depo.removeItem).not.toHaveBeenCalled();
  });

  it('aktif oturumda kendi kaydı yoksa eski ortak kaydı taşımadan açılır', () => {
    oturum.kademe = 'ilkokul';
    const depo = pencere({ [DEPO_ANAHTARI]: kayit('ORTAK_KAYIT') });
    expect(ciz()).not.toContain('ORTAK_KAYIT');
    expect(depo.getItem).not.toHaveBeenCalledWith(DEPO_ANAHTARI);
    expect(depo.setItem).not.toHaveBeenCalled();
    expect(depo.removeItem).not.toHaveBeenCalled();
  });

  it('null oturum eski ortak anahtarı okumaya devam eder', () => {
    const depo = pencere({ [DEPO_ANAHTARI]: kayit('ORTAK_KAYIT') });
    expect(ciz()).toContain('ORTAK_KAYIT');
    expect(depo.getItem).toHaveBeenCalledWith(DEPO_ANAHTARI);
    expect(depo.removeItem).not.toHaveBeenCalled();
  });
});
