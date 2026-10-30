import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Adres çubuğu çizimle eşit (AdresEsitleyici): Çizim Stüdyosu öndeyken çizim değiştikçe, beklemeden sonra adres paylaşım
 * bağlantısının biçimine getirilir (replaceState, geçmiş şişmez); sökülünce '#/studyo'ya döner; çok uzun / sığmayan çizimde
 * bağlantıdaki sınır ve uyarılar geçerlidir. Gerçek kancalarla, çalışma alanı bağlamı sahte değerlerle çalıştırılır.
 */

vi.mock('react', async (gercekModul) => {
  const gercek = await gercekModul<typeof import('react')>();
  const { kancalar } = await import('@/components/workspace/__tests__/kancaKosumu');
  return { ...gercek, ...kancalar, default: { ...gercek, ...kancalar } };
});

const durum = vi.hoisted(() => ({ calisma: {} as Record<string, unknown> }));
vi.mock('@/state/WorkspaceContext', () => ({
  useWorkspace: () => durum.calisma,
  DEFAULT_ZOOM: 44,
  VARSAYILAN_GORUNUM_AYARLARI: { showGrid: true, showAxes: true, gridStyle: 'kareli', backgroundColor: '#ffffff' },
}));

import type { ProjectFile } from '@/math/projectFile';
import { paylasimAdresiniCoz, paylasimVerisiniCoz } from '@/math/cizimPaylasimi';
import { bilesen, durula, tarayiciOrtamiKur } from '@/components/workspace/__tests__/kancaKosumu';
import { ADRES_GECIKMESI, AdresEsitleyici, adresiSadelestir } from '../AdresEsitleyici';

const nokta = (id: string, x: number, y: number) =>
  ({ id, type: 'point', label: id, x, y, isIndependent: true, color: '#2563eb', visible: true, showLabel: true, createdAt: 0 });

/** Sıkıştırılamayan veri (gerçekte büyük bir görsel) */
function rastgeleMetin(uzunluk: number): string {
  const harfler = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bayt = new Uint8Array(uzunluk);
  for (let i = 0; i < uzunluk; i += 65536) crypto.getRandomValues(bayt.subarray(i, i + 65536));
  let s = '';
  for (let i = 0; i < uzunluk; i++) s += harfler[bayt[i] & 63];
  return s;
}

let proje: ProjectFile;
let adres: { hash: string };
let replaceState: ReturnType<typeof vi.fn>;
let setHintMessage: ReturnType<typeof vi.fn>;
let ortamiGeriAl: () => void;
const gecmisDurumu = { __NA: true, screen: 'workspace', isFreeSandbox: true };

/** Çizim değişti: bağlamdaki nesne dizisi yenilenir (WorkspaceProvider'daki gibi) */
function cizimiDegistir(objects: unknown[]) {
  proje = { ...proje, objects: objects as ProjectFile['objects'] };
  durum.calisma = { ...durum.calisma, kaynakNesneler: proje.objects };
}

beforeEach(() => {
  ortamiGeriAl = tarayiciOrtamiKur();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  adres = { hash: '#/studyo' };
  replaceState = vi.fn((_d: unknown, _b: string, url: string) => { adres.hash = url; });
  vi.stubGlobal('location', adres);
  vi.stubGlobal('history', { state: gecmisDurumu, replaceState, length: 2 });
  setHintMessage = vi.fn();
  proje = { version: '2.0', objects: [nokta('A', 1, 2), nokta('B', 4, -1)] as unknown as ProjectFile['objects'], solids: [], viewport: { zoom: 44, panX: 0, panY: 0 }, layoutMode: '2d_only' };
  durum.calisma = {
    getProject: () => proje,
    kaynakNesneler: proje.objects,
    sceneBridge: { solids: [], camera: {} },
    viewport: {}, styleSettings: {}, layoutMode: '2d_only', studioDimension: '2D',
    setHintMessage,
  };
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  ortamiGeriAl();
});

function kur(kademe: 'ilkokul' | 'ortaokul' | 'lise' = 'ortaokul') {
  const b = bilesen('AdresEsitleyici', AdresEsitleyici, { kademe });
  durula([b]);
  return b;
}

/** Gerçek süre bekler (setTimeout sahte; setImmediate ve Date gerçek) */
const gercekBekle = (ms: number) => new Promise<void>((r) => { const t0 = Date.now(); const f = () => (Date.now() - t0 >= ms ? r() : setImmediate(f)); f(); });

/** Bekleme dolar, sıkıştırma (gerçek akış) biter */
async function guncellensin(onceki = replaceState.mock.calls.length) {
  vi.advanceTimersByTime(ADRES_GECIKMESI);
  await vi.waitUntil(() => replaceState.mock.calls.length > onceki || setHintMessage.mock.calls.length > 0, { timeout: 3000, interval: 1 });
}

describe('adres çizimle eşit', () => {
  it('bekleme dolunca adres çizimin paylaşım adresi olur; geçmiş durumu korunur (replaceState, yeni kayıt yok)', async () => {
    kur('lise');
    expect(replaceState).not.toHaveBeenCalled();
    await guncellensin();
    expect(replaceState).toHaveBeenCalledTimes(1);
    const [durumArg, , url] = replaceState.mock.calls[0];
    expect(durumArg).toBe(gecmisDurumu);
    expect(url).toMatch(/^#\/studyo\/paylas\/lise\/z[A-Za-z0-9_-]+$/);
    const acilan = await paylasimVerisiniCoz(paylasimAdresiniCoz(url)!.veri);
    expect(acilan.proje.objects.map((o) => o.label)).toEqual(['A', 'B']);
    expect(acilan.boyut).toBe('2D');
  });

  it('çizim değiştikçe bekleme yeniden başlar; yalnız son çizim yazılır; aynı adres yeniden yazılmaz', async () => {
    const b = kur();
    await guncellensin();
    const ilk = adres.hash;
    // Sürükleme sürerken art arda değişiklikler: bekleme dolmadan yazılmaz
    cizimiDegistir([nokta('A', 1, 2), nokta('B', 5, -1)]);
    b.ciz();
    durula([b]);
    vi.advanceTimersByTime(ADRES_GECIKMESI - 100);
    cizimiDegistir([nokta('A', 1, 2), nokta('B', 6, -1), nokta('C', 0, 3)]);
    b.ciz();
    durula([b]);
    await guncellensin(1);
    expect(replaceState).toHaveBeenCalledTimes(2);
    expect(adres.hash).not.toBe(ilk);
    const acilan = await paylasimVerisiniCoz(paylasimAdresiniCoz(adres.hash)!.veri);
    expect(acilan.proje.objects.map((o) => o.label)).toEqual(['A', 'B', 'C']);
    // Yalnız tuval boyutu değişti (görünüm nesnesi yenilendi): adres aynı, yeniden yazılmaz
    durum.calisma = { ...durum.calisma, viewport: { width: 900 } };
    b.ciz();
    durula([b]);
    vi.advanceTimersByTime(ADRES_GECIKMESI);
    await gercekBekle(50);
    expect(replaceState).toHaveBeenCalledTimes(2);
  });

  it('3B boyut ve cisimler adrese yazılır', async () => {
    proje = { ...proje, solids: [{ id: 'kup', name: 'Küp', type: 'cube', position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 },
      dimensions: { width: 2, height: 2, depth: 2 }, color: '#f59e0b', opacity: 0.85, unfoldProgress: 0.2, showWireframe: true, showVertices: true, showFaces: true }] as unknown as ProjectFile['solids'], layoutMode: '3d_only' };
    durum.calisma = { ...durum.calisma, studioDimension: '3D', sceneBridge: { solids: proje.solids, camera: {} } };
    kur('ilkokul');
    await guncellensin();
    const acilan = await paylasimVerisiniCoz(paylasimAdresiniCoz(adres.hash)!.veri);
    expect(paylasimAdresiniCoz(adres.hash)!.kademe).toBe('ilkokul');
    expect(acilan.boyut).toBe('3D');
    expect(acilan.proje.solids).toMatchObject([{ name: 'Küp', unfoldProgress: 0.2 }]);
  });

  it('sökülünce (masaüstü, küçültme, kapatma) adres #/studyo olur; sınıftan çıkışta eklenmiş yeni kayda dokunulmaz', async () => {
    kur();
    await guncellensin();
    expect(adres.hash.startsWith('#/studyo/paylas/')).toBe(true);
    // Söküm etkisi adresiSadelestir'i çağırır (kancaKosumu bileşen sökmez; işlev doğrudan sınanır)
    adresiSadelestir();
    expect(adres.hash).toBe('#/studyo');
    expect(replaceState).toHaveBeenLastCalledWith(gecmisDurumu, '', '#/studyo');
    // Sınıftan çıkıldı: '#/home' kaydı çoktan eklendi, sadeleştirme ona dokunmaz
    adres.hash = '#/home';
    const sayi = replaceState.mock.calls.length;
    adresiSadelestir();
    expect(replaceState).toHaveBeenCalledTimes(sayi);
    expect(adres.hash).toBe('#/home');
  });

  it('uzun adreste bir kez uyarılır, adres yine yazılır; sığmayan çizimde adres #/studyo kalır ve bir kez bildirilir', async () => {
    const gorsel = (n: number) => [{ id: 'g', type: 'image', label: 'g', src: `data:image/png;base64,${rastgeleMetin(n)}`, x: 0, y: 0, width: 4, height: 3,
      color: '#2563eb', visible: true, showLabel: false, createdAt: 0 }];
    cizimiDegistir(gorsel(12_000));
    const b = kur();
    await guncellensin();
    expect(adres.hash.startsWith('#/studyo/paylas/ortaokul/')).toBe(true);
    expect(setHintMessage).toHaveBeenCalledTimes(1);
    expect(setHintMessage.mock.calls[0][0]).toContain('Adres çok uzun');
    // Yine uzun: uyarı yinelenmez
    cizimiDegistir(gorsel(13_000));
    b.ciz();
    durula([b]);
    await guncellensin(1);
    expect(setHintMessage).toHaveBeenCalledTimes(1);
    // Tarayıcı sınırını aşan çizim: adres sadeleşir, bir kez bildirilir
    cizimiDegistir(gorsel(1_100_000));
    b.ciz();
    durula([b]);
    vi.advanceTimersByTime(ADRES_GECIKMESI);
    await vi.waitUntil(() => setHintMessage.mock.calls.length > 1, { timeout: 20_000, interval: 5 });
    expect(adres.hash).toBe('#/studyo');
    expect(setHintMessage.mock.calls[1][0]).toContain('sığmayacak kadar büyük');
  }, 30_000);
});
