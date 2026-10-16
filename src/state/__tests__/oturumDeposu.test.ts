import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { oturumKaydiniOku, oturumKaydiniYaz } from '../oturumDeposu';

const anahtarlar = ['matematik_calisma_alani_v1', 'matematik_3d_sahne_v1', 'geoeba_olasilik_v1'];
const kademeler = ['ilkokul', 'ortaokul', 'lise'] as const;
let kayitlar: Map<string, string>;

beforeEach(() => {
  kayitlar = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (anahtar: string) => kayitlar.get(anahtar) ?? null,
    setItem: (anahtar: string, deger: string) => { kayitlar.set(anahtar, deger); },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe.each(anahtarlar)('%s oturum kayıtları', anahtar => {
  it('eski ortak kaydı aktif oturuma yüklemez veya taşımaz', () => {
    kayitlar.set(anahtar, 'eski ortak çalışma');
    for (const kademe of kademeler) expect(oturumKaydiniOku(anahtar, kademe)).toBeNull();
    expect([...kayitlar.entries()]).toEqual([[anahtar, 'eski ortak çalışma']]);
    expect(oturumKaydiniOku(anahtar, null)).toBe('eski ortak çalışma');
  });

  it('üç kademenin çalışmalarını ve eski ortak kaydı birbirinden bağımsız korur', () => {
    oturumKaydiniYaz(anahtar, null, 'eski ortak çalışma');
    for (const kademe of kademeler) oturumKaydiniYaz(anahtar, kademe, `${kademe} çalışması`);
    for (const kademe of kademeler) expect(oturumKaydiniOku(anahtar, kademe)).toBe(`${kademe} çalışması`);

    oturumKaydiniYaz(anahtar, 'ilkokul', 'boş çalışma');
    expect(oturumKaydiniOku(anahtar, 'ortaokul')).toBe('ortaokul çalışması');
    expect(oturumKaydiniOku(anahtar, 'lise')).toBe('lise çalışması');
    expect(oturumKaydiniOku(anahtar, null)).toBe('eski ortak çalışma');
    expect(kayitlar.size).toBe(4);
  });
});

it('aynı kademenin çizim ve 3B kayıtları birbirini ezmez', () => {
  oturumKaydiniYaz(anahtarlar[0], 'ilkokul', 'çizim');
  oturumKaydiniYaz(anahtarlar[1], 'ilkokul', '3B sahne');
  expect(oturumKaydiniOku(anahtarlar[0], 'ilkokul')).toBe('çizim');
  expect(oturumKaydiniOku(anahtarlar[1], 'ilkokul')).toBe('3B sahne');
});
