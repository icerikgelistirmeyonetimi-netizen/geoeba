import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Paylaşım bağlantısıyla açılış (PaylasimAcilisi): bağlantının kademesi sınıf ekranıyla birlikte açılır (oturum ekranı
 * atlanır), çizim Çizim Stüdyosu açılınca bir kez yüklenir, bozuk bağlantı uygulamayı çökertmeden iletiyle bildirilir.
 * Bileşen gerçek kancalarla, oturum ve çalışma alanı bağlamları sahte değerlerle çalıştırılır (kancaKosumu).
 */

vi.mock('react', async (gercekModul) => {
  const gercek = await gercekModul<typeof import('react')>();
  const { kancalar } = await import('@/components/workspace/__tests__/kancaKosumu');
  return { ...gercek, ...kancalar, default: { ...gercek, ...kancalar } };
});

const durum = vi.hoisted(() => ({
  oturum: { kademe: null as string | null, oturumAc: (() => {}) as (k: string) => void, oturumuKapat: () => {} },
  calisma: {
    sceneBridge: null as object | null,
    loadProject: (() => {}) as (p: unknown) => void,
    setStudioDimension: (() => {}) as (b: string) => void,
    setHintMessage: (() => {}) as (m: string | null) => void,
  },
}));
vi.mock('@/state/OturumContext', () => ({ useOturum: () => durum.oturum, OTURUM_ADLARI: { ilkokul: 'İlkokul', ortaokul: 'Ortaokul', lise: 'Lise' } }));
vi.mock('@/state/WorkspaceContext', () => ({ useWorkspace: () => durum.calisma }));

import type { LevelId } from '@/types/curriculum';
import type { ProjectFile } from '@/math/projectFile';
import { paylasimVerisiOlustur, type PaylasimAdresi } from '@/math/cizimPaylasimi';
import { bilesen, durula, tarayiciOrtamiKur } from '@/components/workspace/__tests__/kancaKosumu';
import { PaylasimAcilisi, basliksiz } from '../PaylasimAcilisi';

const proje: ProjectFile = {
  version: '2.0',
  objects: [
    { id: 'A', type: 'point', label: 'A', x: 1, y: 2, isIndependent: true, color: '#2563eb', visible: true, showLabel: true, createdAt: 0 },
    { id: 'B', type: 'point', label: 'B', x: 4, y: -1, isIndependent: true, color: '#2563eb', visible: true, showLabel: true, createdAt: 1 },
    { id: 'ab', type: 'segment', label: 'AB', startPointId: 'A', endPointId: 'B', color: '#0891b2', visible: true, showLabel: true, createdAt: 2 },
  ] as unknown as ProjectFile['objects'],
  solids: [
    { id: 'kup', name: 'Küp', type: 'cube', position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, dimensions: { width: 2, height: 2, depth: 2 },
      color: '#f59e0b', opacity: 0.85, unfoldProgress: 0, showWireframe: true, showVertices: true, showFaces: true },
  ] as unknown as ProjectFile['solids'],
  layoutMode: '3d_only',
};

let oturumAc: ReturnType<typeof vi.fn>;
let loadProject: ReturnType<typeof vi.fn>;
let setStudioDimension: ReturnType<typeof vi.fn>;
let setHintMessage: ReturnType<typeof vi.fn>;
let onBitti: ReturnType<typeof vi.fn>;
let ortamiGeriAl: () => void;

beforeEach(() => {
  oturumAc = vi.fn((k: LevelId) => { durum.oturum.kademe = k; });
  loadProject = vi.fn();
  setStudioDimension = vi.fn();
  setHintMessage = vi.fn();
  onBitti = vi.fn();
  durum.oturum = { kademe: null, oturumAc, oturumuKapat: () => {} };
  durum.calisma = { sceneBridge: null, loadProject, setStudioDimension, setHintMessage };
  ortamiGeriAl = tarayiciOrtamiKur();
  // Yalnız uygulama zamanlayıcısı sahte: veri çözme (akışlar) gerçek görevlerle ilerler
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
  ortamiGeriAl();
});

function kur(adres: PaylasimAdresi) {
  const b = bilesen('PaylasimAcilisi', PaylasimAcilisi, { adres, iletiGosterilebilir: false, onBitti });
  durula([b]);
  return {
    b,
    /** Veri çözülene (bileşen yeniden çizilmek isteyene) kadar bekler, sonra durular */
    async cozulsun() {
      await vi.waitUntil(() => b.kirliMi(), { timeout: 2000, interval: 1 });
      durula([b]);
    },
    ciz: () => { b.ciz(); durula([b]); },
    iletiAcik: () => (b.sonuc as { props: { isOpen: boolean } }).props.isOpen,
  };
}

describe('paylaşım bağlantısıyla açılış', () => {
  for (const kademe of ['ilkokul', 'ortaokul', 'lise'] as const) {
    it(`${kademe}: oturum hemen açılır; çizim Stüdyo açılınca bir kez, paylaşılan boyutla yüklenir`, async () => {
      const t = kur({ kademe, veri: await paylasimVerisiOlustur({ boyut: '3D', proje }) });
      expect(oturumAc).toHaveBeenCalledWith(kademe);
      await t.cozulsun();
      // Stüdyo henüz açık değil (sahne köprüsü yok): yüklenmez
      vi.runAllTimers();
      expect(loadProject).not.toHaveBeenCalled();
      // Köprü yayınlandı, sahne kendi kaydını geri yükleyip köprüyü yeniden yayınladı: yalnız son köprüde yüklenir
      durum.calisma = { ...durum.calisma, sceneBridge: { ad: 'ilk' } };
      t.ciz();
      durum.calisma = { ...durum.calisma, sceneBridge: { ad: 'geri yüklenmiş' } };
      t.ciz();
      vi.runAllTimers();
      expect(loadProject).toHaveBeenCalledTimes(1);
      expect(loadProject.mock.calls[0][0]).toMatchObject({ objects: [{ label: 'A' }, { label: 'B' }, { label: 'AB' }], solids: [{ name: 'Küp' }], layoutMode: '3d_only' });
      expect(setStudioDimension).toHaveBeenCalledWith('3D');
      expect(setHintMessage).toHaveBeenCalledWith(expect.stringContaining('Paylaşılan çizim açıldı'));
      expect(onBitti).toHaveBeenCalledTimes(1);
      // Sonraki köprü değişimleri (yüklenen çizim sahneyi değiştirdi) yeniden yüklemez
      durum.calisma = { ...durum.calisma, sceneBridge: { ad: 'paylaşılan' } };
      t.ciz();
      vi.runAllTimers();
      expect(loadProject).toHaveBeenCalledTimes(1);
      expect(t.iletiAcik()).toBe(false);
    });
  }

  it('2B paylaşım 2B açılır', async () => {
    const t = kur({ kademe: 'ortaokul', veri: await paylasimVerisiOlustur({ boyut: '2D', proje: { ...proje, layoutMode: '2d_only' } }) });
    await t.cozulsun();
    durum.calisma = { ...durum.calisma, sceneBridge: {} };
    t.ciz();
    vi.runAllTimers();
    expect(setStudioDimension).toHaveBeenCalledWith('2D');
  });

  it('oturum bu sırada başka kademeye geçtiyse çizim o kademeye yüklenmez', async () => {
    const t = kur({ kademe: 'lise', veri: await paylasimVerisiOlustur({ boyut: '2D', proje }) });
    await t.cozulsun();
    durum.oturum.kademe = 'ilkokul';
    durum.calisma = { ...durum.calisma, sceneBridge: {} };
    t.ciz();
    vi.runAllTimers();
    expect(loadProject).not.toHaveBeenCalled();
  });

  it('bozuk veride oturum yine açılır; ileti açılış bitince gösterilir, Tamam paylaşımı bitirir; çizim yüklenmez', async () => {
    const t = kur({ kademe: 'ortaokul', veri: 'zbozukveri' });
    expect(oturumAc).toHaveBeenCalledWith('ortaokul');
    await t.cozulsun();
    durum.calisma = { ...durum.calisma, sceneBridge: {} };
    t.ciz();
    vi.runAllTimers();
    expect(loadProject).not.toHaveBeenCalled();
    // Sınıf açılışı sürerken ileti çıkmaz
    expect(t.iletiAcik()).toBe(false);
    t.b.props = { ...t.b.props, iletiGosterilebilir: true };
    t.ciz();
    expect(t.iletiAcik()).toBe(true);
    expect(JSON.stringify(t.b.sonuc, (_, v) => (typeof v === 'function' || typeof v === 'symbol' ? undefined : v))).toContain('eksik ya da bozuk');
    (t.b.sonuc as { props: { onClose: () => void } }).props.onClose();
    expect(onBitti).toHaveBeenCalledTimes(1);
  });

  it('kademesi tanınmayan bağlantıda oturum açılmaz (oturum ekranı olağan gelir), ileti gösterilir', () => {
    const t = kur({ kademe: null, veri: 'zAAAA' });
    expect(oturumAc).not.toHaveBeenCalled();
    t.b.props = { ...t.b.props, iletiGosterilebilir: true };
    t.ciz();
    expect(t.iletiAcik()).toBe(true);
  });

  it('yükleme sırasında hata olursa uygulama çökmez, ileti gösterilir', async () => {
    loadProject.mockImplementation(() => { throw new Error('geometrik ilişki geçersiz'); });
    const t = kur({ kademe: 'lise', veri: await paylasimVerisiOlustur({ boyut: '2D', proje }) });
    await t.cozulsun();
    durum.calisma = { ...durum.calisma, sceneBridge: {} };
    t.ciz();
    vi.runAllTimers();
    t.b.props = { ...t.b.props, iletiGosterilebilir: true };
    t.ciz();
    expect(t.iletiAcik()).toBe(true);
    expect(onBitti).not.toHaveBeenCalled();
  });

  it('ileti gövdesi başlığı yinelemez', () => {
    expect(basliksiz('Paylaşılan çizim açılamadı: bağlantı eksik ya da bozuk.')).toBe('Bağlantı eksik ya da bozuk.');
    expect(basliksiz('Paylaşılan çizim açılamadı: işaret geçersiz.')).toBe('İşaret geçersiz.');
    expect(basliksiz('Paylaşılan çizim açılamadı. Kendi çiziminiz korundu.')).toBe('Kendi çiziminiz korundu.');
    expect(basliksiz('Paylaşılan çizim bu tarayıcıda açılamıyor: güncelleyin.')).toBe('Paylaşılan çizim bu tarayıcıda açılamıyor: güncelleyin.');
  });
});
