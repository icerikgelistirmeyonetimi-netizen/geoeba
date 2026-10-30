import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Dosya > Bağlantıyla paylaş penceresi: bağlantı bulunduğu sayfanın adresinden kurulur, panoya kopyalanır ve
 * kullanıcıya bildirilir; pano izin vermezse Kopyala yeniden dener; uzun bağlantıda uyarı, sınırı aşanda dosya önerilir.
 */

vi.mock('react', async (gercekModul) => {
  const gercek = await gercekModul<typeof import('react')>();
  const { kancalar } = await import('./kancaKosumu');
  return { ...gercek, ...kancalar, default: { ...gercek, ...kancalar } };
});

import type { ProjectFile } from '@/math/projectFile';
import { paylasimVerisiniCoz } from '@/math/cizimPaylasimi';
import { bilesen, durula, ogeBul, tarayiciOrtamiKur, type AgacOgesi } from './kancaKosumu';
import { PaylasimModal, type PaylasimIstegi } from '../PaylasimModal';

const proje = (ek: Partial<ProjectFile> = {}): ProjectFile => ({
  version: '2.0',
  objects: [
    { id: 'A', type: 'point', label: 'A', x: 1, y: 2, isIndependent: true, color: '#2563eb', visible: true, showLabel: true, createdAt: 0 },
  ] as unknown as ProjectFile['objects'],
  solids: [],
  ...ek,
});

/** Sıkıştırılamayan veri (gerçekte büyük bir görsel) */
function rastgeleMetin(uzunluk: number): string {
  const harfler = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bayt = new Uint8Array(uzunluk);
  for (let i = 0; i < uzunluk; i += 65536) crypto.getRandomValues(bayt.subarray(i, i + 65536));
  let s = '';
  for (let i = 0; i < uzunluk; i++) s += harfler[bayt[i] & 63];
  return s;
}
const gorselli = (uzunluk: number) => proje({
  objects: [{ id: 'g', type: 'image', label: 'g', src: `data:image/png;base64,${rastgeleMetin(uzunluk)}`, x: 0, y: 0, width: 4, height: 3,
    color: '#2563eb', visible: true, showLabel: false, createdAt: 0 }] as unknown as ProjectFile['objects'],
});

/** Öğe ağacındaki görünen yazılar */
function metin(agac: unknown): string {
  if (typeof agac === 'string' || typeof agac === 'number') return String(agac);
  if (Array.isArray(agac)) return agac.map(metin).join('');
  if (agac && typeof agac === 'object' && 'props' in agac) {
    const props = (agac as AgacOgesi).props;
    return `${typeof props.value === 'string' ? props.value : ''}${metin(props.children)}`;
  }
  return '';
}

let ortamiGeriAl: () => void;
let writeText: ReturnType<typeof vi.fn>;
beforeEach(() => {
  ortamiGeriAl = tarayiciOrtamiKur();
  writeText = vi.fn(async () => {});
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  vi.stubGlobal('location', { origin: 'https://cdn.eba.gov.tr', pathname: '/icerik/eba-matematik/' });
});
afterEach(() => {
  vi.unstubAllGlobals();
  ortamiGeriAl();
});

async function ac(istek: PaylasimIstegi) {
  const b = bilesen('PaylasimModal', PaylasimModal, { istek, onKapat: vi.fn() });
  durula([b]);
  // Hazırlanma (sıkıştırma) ve pano yazımı bitene kadar
  await vi.waitUntil(async () => {
    await new Promise((r) => setTimeout(r, 1));
    durula([b]);
    return !metin(b.sonuc).includes('hazırlanıyor');
  }, { timeout: 5000, interval: 1 });
  await new Promise((r) => setTimeout(r, 1));
  durula([b]);
  return b;
}

describe('Bağlantıyla paylaş penceresi', () => {
  it('bağlantı bulunduğu adresten kurulur, panoya kopyalanır ve bildirilir; bağlantı çizimi geri verir', async () => {
    const b = await ac({ proje: proje({ layoutMode: '3d_only' }), boyut: '3D', kademe: 'ortaokul' });
    const yazi = metin(b.sonuc);
    expect(yazi).toContain('Ortaokul');
    expect(yazi).toContain('3B');
    expect(yazi).toContain('Bağlantı panoya kopyalandı');
    expect(yazi).not.toContain('çok uzun');
    expect(writeText).toHaveBeenCalledTimes(1);
    const baglanti = writeText.mock.calls[0][0] as string;
    expect(baglanti).toMatch(/^https:\/\/cdn\.eba\.gov\.tr\/icerik\/eba-matematik\/#\/studyo\/paylas\/ortaokul\/z[A-Za-z0-9_-]+$/);
    const alan = ogeBul(b.sonuc, (o) => 'data-paylasim-baglantisi' in o.props);
    expect(alan?.props.value).toBe(baglanti);
    const acilan = await paylasimVerisiniCoz(baglanti.split('/').pop()!);
    expect(acilan).toMatchObject({ boyut: '3D', proje: { layoutMode: '3d_only', objects: [{ label: 'A', x: 1, y: 2 }] } });
  });

  it('pano izin vermezse bildirilir; Kopyala düğmesi yeniden dener', async () => {
    writeText.mockRejectedValueOnce(new Error('NotAllowedError'));
    const b = await ac({ proje: proje(), boyut: '2D', kademe: 'lise' });
    expect(metin(b.sonuc)).toContain('panoya kopyalanamadı');
    const dugme = ogeBul(b.sonuc, (o) => o.type === 'button' && metin(o).includes('Kopyala'));
    await (dugme!.props.onClick as () => Promise<void>)();
    durula([b]);
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(metin(b.sonuc)).toContain('Bağlantı panoya kopyalandı');
    expect(metin(b.sonuc)).toContain('Kopyalandı');
  });

  it('uzun bağlantıda uyarılır, bağlantı yine verilir', async () => {
    const b = await ac({ proje: gorselli(12_000), boyut: '2D', kademe: 'ilkokul' });
    const yazi = metin(b.sonuc);
    expect(yazi).toContain('Bağlantı çok uzun');
    expect(yazi).toContain('Dosya > Kaydet');
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it('tarayıcı sınırını aşan çizimde bağlantı verilmez, dosya önerilir', async () => {
    const b = await ac({ proje: gorselli(1_100_000), boyut: '2D', kademe: 'ortaokul' });
    expect(metin(b.sonuc)).toContain('bağlantıya sığmayacak kadar büyük');
    expect(writeText).not.toHaveBeenCalled();
    expect(ogeBul(b.sonuc, (o) => 'data-paylasim-baglantisi' in o.props)).toBeUndefined();
  });
});
